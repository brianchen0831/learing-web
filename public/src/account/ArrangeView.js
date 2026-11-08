import { computed, onMounted, reactive, ref, watch, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import UserAvatar, { FULL_VIEW } from './UserAvatar.js';
import { saveAvatar, user } from './auth.js';
import { doll, dollReady, findPart, layersOf, orderOf } from './doll.js';
import { shopDraft } from './draft.js';
import { pick, t } from '../i18n.js';

// Arrange page: move and resize each layer of the avatar on a canvas. Click a part to pick
// it (or pick it from the list), drag to move, and drag the round handle, use the slider or
// scroll to resize. A placement is saved in the avatar as adjust[layer] = { x, y, s, cx, cy }:
// moved by (x, y) and resized by s around (cx, cy), the middle of the part's drawing.
// The limits match ADJUST_LIMITS in account/store.py.
const W = 720;
const H = 1272;
const LIMITS = { x: [-720, 720], y: [-1272, 1272], s: [0.25, 4] };
const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));

// Each part image's alpha channel, for clicking on the drawing itself rather than its
// transparent box, and the box around what is drawn. Loaded once per image.
const masks = new Map();
function loadMask(url) {
  if (!masks.has(url)) {
    masks.set(url, new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const g = canvas.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0, W, H);
        const px = g.getImageData(0, 0, W, H).data;
        const alpha = new Uint8Array(W * H);
        let x0 = W, y0 = H, x1 = -1, y1 = -1;
        for (let i = 0; i < alpha.length; i++) {
          const a = px[i * 4 + 3];
          alpha[i] = a;
          if (a > 20) {
            const x = i % W;
            const y = (i - x) / W;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
        resolve({ alpha, box: x1 < 0 ? [0, 0, W, H] : [x0, y0, x1 + 1, y1 + 1] });
      };
      img.onerror = () => resolve(null);
      img.src = url;
    }));
  }
  return masks.get(url);
}

export default {
  name: 'ArrangeView',
  components: { UserAvatar },
  setup() {
    const router = useRouter();
    const route = useRoute();
    // Opened from a shop: after buying (?layer=&back=&bought=), or to arrange the look being
    // tried on before buying (?draft=1&back=). A try-on look is not saved here: Done hands it
    // back to the shop, where it can be bought.
    const SHOP_PATHS = ['/account/shop', '/account/hair', '/account/beauty'];
    const backTo = SHOP_PATHS.includes(route.query.back) ? route.query.back : '/account';
    const handed = route.query.draft && shopDraft.value?.back === backTo ? shopDraft.value.avatar : null;
    const tryOn = !!handed;
    const draft = reactive(JSON.parse(JSON.stringify(handed || user.value.avatar)));
    if (!draft.adjust) draft.adjust = {};
    const info = reactive({}); // layer -> { alpha, box }
    const bought = computed(() => (typeof route.query.bought === 'string' ? findPart(route.query.bought) : null));
    const selected = ref(typeof route.query.layer === 'string' && draft.parts[route.query.layer] ? route.query.layer : '');
    const stage = ref(null);
    const error = ref('');
    const busy = ref(false);
    let action = null; // the drag in progress

    watchEffect(() => {
      document.title = `${t('arrange.title')} – ${t('site.title')}`;
    });

    // Everything drawn, back to front (the body too), and the parts that can be moved
    const drawn = computed(() => layersOf(draft));
    const layers = computed(() => drawn.value.filter((l) => l.layer !== 'body'));
    const label = (layer) => {
      if (layer === 'body') return t('arrange.body');
      const part = findPart(draft.parts[layer]);
      return part ? pick(part.label) : pick(doll.value?.layers.find((l) => l.id === layer)?.label || {});
    };

    async function loadLayers() {
      await dollReady;
      for (const l of layers.value) {
        const m = await loadMask(l.url);
        if (m) info[l.layer] = m;
      }
    }
    onMounted(loadLayers);
    watch(layers, loadLayers);

    // The placement of a layer, or the identity placement around its drawing's middle
    function place(layer) {
      if (draft.adjust[layer]) return draft.adjust[layer];
      const b = info[layer]?.box || [0, 0, W, H];
      return { x: 0, y: 0, s: 1, cx: Math.round((b[0] + b[2]) / 2), cy: Math.round((b[1] + b[3]) / 2) };
    }
    function edit(layer) {
      if (!draft.adjust[layer]) draft.adjust[layer] = place(layer);
      return draft.adjust[layer];
    }
    const toCanvas = (a, px, py) => [(px - a.cx) * a.s + a.cx + a.x, (py - a.cy) * a.s + a.cy + a.y];
    const toLayer = (a, px, py) => [(px - a.cx - a.x) / a.s + a.cx, (py - a.cy - a.y) / a.s + a.cy];

    // The selected part's box on the canvas, with the resize handle at its lower right
    const frame = computed(() => {
      const layer = selected.value;
      if (!layer || !info[layer]) return null;
      const a = place(layer);
      const b = info[layer].box;
      const [x0, y0] = toCanvas(a, b[0], b[1]);
      const [x1, y1] = toCanvas(a, b[2], b[3]);
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, hx: x1, hy: y1 };
    });

    // The top-most part drawn under a canvas point
    function hit(x, y) {
      for (const l of [...layers.value].reverse()) {
        const m = info[l.layer];
        if (!m) continue;
        const [lx, ly] = toLayer(place(l.layer), x, y);
        const ix = Math.floor(lx);
        const iy = Math.floor(ly);
        if (ix >= 0 && iy >= 0 && ix < W && iy < H && m.alpha[iy * W + ix] > 40) return l.layer;
      }
      return '';
    }
    function point(e) {
      const svg = stage.value;
      const p = svg.createSVGPoint();
      p.x = e.clientX;
      p.y = e.clientY;
      const q = p.matrixTransform(svg.getScreenCTM().inverse());
      return [q.x, q.y];
    }

    function down(e) {
      const [x, y] = point(e);
      const f = frame.value;
      if (f && Math.hypot(x - f.hx, y - f.hy) < 26) {
        const a = edit(selected.value);
        const c = [a.cx + a.x, a.cy + a.y];
        action = { mode: 'size', a, s0: a.s, c, d0: Math.max(Math.hypot(x - c[0], y - c[1]), 1) };
      } else {
        const layer = hit(x, y);
        selected.value = layer;
        if (!layer) return;
        const a = edit(layer);
        action = { mode: 'move', a, x0: x, y0: y, ax: a.x, ay: a.y };
      }
      e.currentTarget.setPointerCapture(e.pointerId);
      stage.value.focus();
    }
    function move(e) {
      if (!action) return;
      const [x, y] = point(e);
      const a = action.a;
      if (action.mode === 'move') {
        a.x = clamp(action.ax + x - action.x0, LIMITS.x);
        a.y = clamp(action.ay + y - action.y0, LIMITS.y);
      } else {
        a.s = clamp(action.s0 * Math.hypot(x - action.c[0], y - action.c[1]) / action.d0, LIMITS.s);
      }
    }
    function up() {
      action = null;
    }
    function resize(factor) {
      if (!selected.value || selected.value === 'body') return;
      const a = edit(selected.value);
      a.s = clamp(a.s * factor, LIMITS.s);
    }
    function wheel(e) {
      if (selected.value) resize(e.deltaY < 0 ? 1.05 : 1 / 1.05);
    }
    function key(e) {
      if (!selected.value) return;
      if (e.key === 'PageUp' || e.key === 'PageDown') {
        shift(e.key === 'PageUp' ? 1 : -1);
        e.preventDefault();
        return;
      }
      if (selected.value === 'body') return;
      const step = e.shiftKey ? 10 : 2;
      const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (moves[e.key]) {
        const a = edit(selected.value);
        a.x = clamp(a.x + moves[e.key][0], LIMITS.x);
        a.y = clamp(a.y + moves[e.key][1], LIMITS.y);
      } else if (e.key === '+' || e.key === '=') {
        resize(1.05);
      } else if (e.key === '-' || e.key === '_') {
        resize(1 / 1.05);
      } else {
        return;
      }
      e.preventDefault();
    }

    const size = computed({
      get: () => Math.round((selected.value ? place(selected.value).s : 1) * 100),
      set: (v) => {
        if (selected.value) edit(selected.value).s = clamp(v / 100, LIMITS.s);
      },
    });
    const moved = (layer) => {
      const a = draft.adjust[layer];
      return !!a && (Math.round(a.x) !== 0 || Math.round(a.y) !== 0 || Math.round(a.s * 100) !== 100);
    };
    function resetLayer() {
      delete draft.adjust[selected.value];
    }
    function resetAll() {
      Object.keys(draft.adjust).forEach((k) => delete draft.adjust[k]);
      delete draft.order;
    }

    // Layer order: move the selected layer in front of (dir 1) or behind (dir -1) the next
    // drawn layer. Layers with nothing worn are skipped, as moving past them changes nothing.
    const place2 = computed(() => drawn.value.map((l) => l.layer).indexOf(selected.value));
    const canUp = computed(() => place2.value >= 0 && place2.value < drawn.value.length - 1);
    const canDown = computed(() => place2.value > 0);
    function shift(dir) {
      const visible = drawn.value.map((l) => l.layer);
      const i = visible.indexOf(selected.value);
      const other = visible[i + dir];
      if (i < 0 || !other) return;
      const order = orderOf(draft).filter((id) => id !== selected.value);
      order.splice(order.indexOf(other) + (dir > 0 ? 1 : 0), 0, selected.value);
      draft.order = order;
    }
    const reordered = computed(() => {
      const catalog = doll.value ? doll.value.layers.map((l) => l.id) : [];
      return JSON.stringify(orderOf(draft)) !== JSON.stringify(catalog);
    });

    async function save() {
      busy.value = true;
      error.value = '';
      const adjust = {};
      Object.entries(draft.adjust).forEach(([layer, a]) => {
        if (!moved(layer)) return;
        adjust[layer] = {
          x: Math.round(a.x * 10) / 10, y: Math.round(a.y * 10) / 10, s: Math.round(a.s * 1000) / 1000,
          cx: a.cx, cy: a.cy,
        };
      });
      if (reordered.value) draft.order = orderOf(draft);
      else delete draft.order;
      if (tryOn) {
        shopDraft.value = { back: backTo, avatar: { ...JSON.parse(JSON.stringify(draft)), adjust }, done: true };
        router.push(backTo);
        return;
      }
      try {
        await saveAvatar({ ...draft, adjust });
        router.push(backTo);
      } catch (e) {
        error.value = t('auth.error.' + e.message);
      }
      busy.value = false;
    }
    // Leave without changes; a try-on look goes back to the shop as it came
    function cancel() {
      if (tryOn) shopDraft.value = { back: backTo, avatar: handed, done: true };
      router.push(backTo);
    }

    return {
      drawn, canUp, canDown, shift, reordered,
      doll, draft, layers, selected, stage, frame, size, error, busy, viewBox: FULL_VIEW, backTo, bought, tryOn, pick,
      label, moved, down, move, up, wheel, key, resetLayer, resetAll, save, cancel, t,
    };
  },
  template: `
    <main class="arrange-page">
      <a class="back" :href="backTo" @click.prevent="cancel">← {{ backTo === '/account' ? t('auth.account') : t('arrange.backToShop') }}</a>
      <h1>{{ t('arrange.title') }}</h1>
      <p v-if="bought" class="right arrange-bought" role="status">{{ t('arrange.bought').replace('{item}', pick(bought.label)) }}</p>
      <p v-if="tryOn" class="arrange-bought" role="status">{{ t('arrange.tryOn') }}</p>
      <p class="intro">{{ t('arrange.intro') }}</p>
      <div v-if="doll" class="arrange-layout">
        <div class="lesson arrange-stage-box">
          <div class="arrange-stage">
            <UserAvatar :avatar="draft" />
            <svg ref="stage" class="arrange-overlay" :viewBox="viewBox" tabindex="0" role="application"
                 :aria-label="t('arrange.title')"
                 @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up"
                 @wheel.prevent="wheel" @keydown="key">
              <rect x="0" y="0" width="720" height="1272" fill="transparent"/>
              <g v-if="frame">
                <rect :x="frame.x" :y="frame.y" :width="frame.w" :height="frame.h" class="arrange-frame"/>
                <circle :cx="frame.hx" :cy="frame.hy" r="14" class="arrange-handle"/>
              </g>
            </svg>
          </div>
        </div>
        <section class="lesson arrange-panel">
          <h2>{{ t('arrange.layers') }}</h2>
          <p class="arrange-hint">{{ t('arrange.front') }}</p>
          <ol class="arrange-layers" :aria-label="t('arrange.layers')">
            <li v-for="l in [...drawn].reverse()" :key="l.layer">
              <button type="button" class="btn" :aria-pressed="String(selected === l.layer)" @click="selected = l.layer">
                {{ label(l.layer) }}<span v-if="moved(l.layer)" class="arrange-dot" :title="t('arrange.moved')"> •</span>
              </button>
            </li>
          </ol>
          <p class="arrange-hint">{{ t('arrange.back') }}</p>
          <div v-if="selected" class="arrange-order">
            <button type="button" class="btn" :disabled="!canUp" @click="shift(1)">▲ {{ t('arrange.up') }}</button>
            <button type="button" class="btn" :disabled="!canDown" @click="shift(-1)">▼ {{ t('arrange.down') }}</button>
          </div>
          <template v-if="selected && selected !== 'body'">
            <label class="arrange-size">
              {{ t('arrange.size') }} <strong>{{ size }}%</strong>
              <input v-model.number="size" type="range" min="25" max="400" step="1">
            </label>
            <button type="button" class="btn" @click="resetLayer">{{ t('arrange.resetLayer') }}</button>
          </template>
          <p v-else-if="!selected" class="intro">{{ t('arrange.pickHint') }}</p>
          <p v-else class="intro">{{ t('arrange.bodyHint') }}</p>
          <p class="intro arrange-keys">{{ t('arrange.keys') }}</p>
          <p v-if="error" class="wrong" role="alert">{{ error }}</p>
          <div class="dialog-actions">
            <button type="button" class="btn" @click="resetAll">{{ t('arrange.resetAll') }}</button>
            <button type="button" class="btn" @click="cancel">{{ t('dialog.cancel') }}</button>
            <button type="button" class="btn btn-primary" :disabled="busy" @click="save">{{ t(tryOn ? 'arrange.done' : 'arrange.save') }}</button>
          </div>
        </section>
      </div>
    </main>
  `,
};
