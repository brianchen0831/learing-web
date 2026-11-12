import { computed, onMounted, reactive, ref, watch, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import UserAvatar, { FULL_VIEW } from './UserAvatar.js';
import { saveAvatar, user } from './auth.js';
import { doll, dollReady, findPart, layersOf, orderOf } from './doll.js';
import { arrangeChannel, shopDraft, takeHandedLook } from './draft.js';
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
// The work area: larger than the avatar's frame (FULL_VIEW, outlined), so parts moved
// beyond it can still be seen and picked up.
const STAGE_VIEW = '-230 -130 1180 1530';
const STAGE = STAGE_VIEW.split(' ').map(Number);
const ZOOMS = [1, 1.5, 2, 3, 4];

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
    // In its own tab (?tab=1), opened by openArranger: finishing closes the tab and tells the
    // page that opened it. Otherwise (the tab was blocked) it goes back in this tab.
    const inTab = route.query.tab === '1';
    const tabLook = inTab ? takeHandedLook(route.query.token) : null;
    const handed = tabLook && tabLook.back === backTo ? tabLook.avatar
      : (route.query.draft && shopDraft.value?.back === backTo ? shopDraft.value.avatar : null);
    const tryOn = !!handed;
    const draft = reactive(JSON.parse(JSON.stringify(handed || user.value.avatar)));
    if (!draft.adjust) draft.adjust = {};
    // A head layer once existed; its placement and order are no longer used
    delete draft.adjust.head;
    if (Array.isArray(draft.order)) draft.order = draft.order.filter((id) => id !== 'head');
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
    // Moving or resizing the body takes every other part along, unless switched off
    const follow = ref(true);

    // Zoom: the work area seen through a smaller window, centred on (look.x, look.y).
    // Dragging an empty spot pans when zoomed in.
    const zoom = ref(1);
    const look = reactive({ x: STAGE[0] + STAGE[2] / 2, y: STAGE[1] + STAGE[3] / 2 });
    const view = computed(() => {
      const w = STAGE[2] / zoom.value;
      const h = STAGE[3] / zoom.value;
      return [look.x - w / 2, look.y - h / 2, w, h];
    });
    const viewBox = computed(() => view.value.map((v) => Math.round(v * 10) / 10).join(' '));
    function keepInside() {
      const w = STAGE[2] / zoom.value;
      const h = STAGE[3] / zoom.value;
      look.x = clamp(look.x, [STAGE[0] + w / 2, STAGE[0] + STAGE[2] - w / 2]);
      look.y = clamp(look.y, [STAGE[1] + h / 2, STAGE[1] + STAGE[3] - h / 2]);
    }
    function setZoom(z) {
      zoom.value = z;
      if (z === 1) {
        look.x = STAGE[0] + STAGE[2] / 2;
        look.y = STAGE[1] + STAGE[3] / 2;
      } else if (selected.value && info[selected.value]) {
        [look.x, look.y] = center(selected.value);
      }
      keepInside();
    }
    const zoomIn = () => setZoom(ZOOMS.find((z) => z > zoom.value) || zoom.value);
    const zoomOut = () => setZoom([...ZOOMS].reverse().find((z) => z < zoom.value) || zoom.value);

    // Scroll bars along the bottom and right of the canvas, shown when zoomed in: the thumb is
    // the part of the work area in view. Drag a thumb, or click the track to jump there.
    const bars = computed(() => {
      const w = STAGE[2] / zoom.value;
      const h = STAGE[3] / zoom.value;
      return {
        x: { size: 100 / zoom.value, at: ((look.x - w / 2 - STAGE[0]) / STAGE[2]) * 100 },
        y: { size: 100 / zoom.value, at: ((look.y - h / 2 - STAGE[1]) / STAGE[3]) * 100 },
      };
    });
    let barDrag = null;
    function barDown(e, axis) {
      const track = e.currentTarget.getBoundingClientRect();
      const length = axis === 'x' ? track.width : track.height;
      const pos = axis === 'x' ? e.clientX - track.left : e.clientY - track.top;
      const span = axis === 'x' ? STAGE[2] : STAGE[3];
      const bar = bars.value[axis];
      const onThumb = pos >= (bar.at / 100) * length && pos <= ((bar.at + bar.size) / 100) * length;
      // Clicking the track (not the thumb) centres the view there first
      if (!onThumb) {
        look[axis] = (axis === 'x' ? STAGE[0] : STAGE[1]) + (pos / length) * span;
        keepInside();
      }
      barDrag = { axis, start: axis === 'x' ? e.clientX : e.clientY, look: look[axis], unitsPerPx: span / length };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    function barMove(e) {
      if (!barDrag) return;
      const now = barDrag.axis === 'x' ? e.clientX : e.clientY;
      look[barDrag.axis] = barDrag.look + (now - barDrag.start) * barDrag.unitsPerPx;
      keepInside();
    }
    function barUp() {
      barDrag = null;
    }
    const label = (layer) => {
      if (layer === 'body') return t('arrange.body');
      const part = findPart(draft.parts[layer]);
      return part ? pick(part.label) : pick(doll.value?.layers.find((l) => l.id === layer)?.label || {});
    };

    async function loadLayers() {
      await dollReady;
      for (const l of drawn.value) {
        const m = await loadMask(l.url);
        if (m) info[l.layer] = m;
      }
    }
    onMounted(loadLayers);
    watch(drawn, loadLayers);

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

    // Every change is a move by (x, y) and a resize by s around the canvas point (cx, cy),
    // applied on top of where the layers were when the change started (`start`).
    const center = (layer) => {
      const a = place(layer);
      return [a.cx + a.x, a.cy + a.y];
    };
    // The body takes every layer along (unless switched off)
    const group = (layer) => (layer === 'body' && follow.value ? drawn.value.map((l) => l.layer) : [layer]);
    function snapshot(layer) {
      const out = {};
      group(layer).forEach((l) => { out[l] = { ...place(l) }; });
      return out;
    }
    function apply(start, d) {
      Object.entries(start).forEach(([layer, a]) => {
        const s = clamp(a.s * d.s, LIMITS.s);
        const k = s / a.s;
        const e = edit(layer);
        e.s = s;
        e.x = clamp(k * (a.cx + a.x - d.cx) + d.cx + d.x - a.cx, LIMITS.x);
        e.y = clamp(k * (a.cy + a.y - d.cy) + d.cy + d.y - a.cy, LIMITS.y);
      });
    }
    const moveBy = (start, dx, dy) => apply(start, { x: dx, y: dy, s: 1, cx: 0, cy: 0 });
    const scaleBy = (start, k, c) => apply(start, { x: 0, y: 0, s: k, cx: c[0], cy: c[1] });

    function point(e) {
      const svg = stage.value;
      const p = svg.createSVGPoint();
      p.x = e.clientX;
      p.y = e.clientY;
      const q = p.matrixTransform(svg.getScreenCTM().inverse());
      return [q.x, q.y];
    }

    // Only the layer picked in the list on the right is edited, so a click on the drawing can
    // never pick up another layer: dragging anywhere moves the picked layer, and the round
    // handle resizes it. With nothing picked, or with Shift or the middle button, a drag pans
    // the view when zoomed in.
    // Resizing: the four corners and the four edges of the picked layer's dashed frame. The
    // opposite corner (or edge) stays put, and the layer keeps its shape. zone says which
    // part of the frame is under a canvas point: 'nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'.
    const unitsPerPixel = () => {
      const r = stage.value?.getBoundingClientRect();
      return r && r.width ? Math.max(view.value[2] / r.width, view.value[3] / r.height) : 1;
    };
    function zone(x, y) {
      const f = frame.value;
      if (!f || !selected.value) return '';
      const tol = 10 * unitsPerPixel();
      const x1 = f.x + f.w;
      const y1 = f.y + f.h;
      const nearX = Math.abs(x - f.x) < tol ? 'w' : Math.abs(x - x1) < tol ? 'e' : '';
      const nearY = Math.abs(y - f.y) < tol ? 'n' : Math.abs(y - y1) < tol ? 's' : '';
      const insideX = x > f.x - tol && x < x1 + tol;
      const insideY = y > f.y - tol && y < y1 + tol;
      if (nearX && nearY) return nearY + nearX;
      if (nearX && insideY) return nearX;
      if (nearY && insideX) return nearY;
      return '';
    }
    // The fixed point for a zone, and how far the pointer is from it along the zone's axes
    function pivotOf(z) {
      const f = frame.value;
      const px = z.includes('w') ? f.x + f.w : z.includes('e') ? f.x : f.x + f.w / 2;
      const py = z.includes('n') ? f.y + f.h : z.includes('s') ? f.y : f.y + f.h / 2;
      return [px, py];
    }
    const reach = (z, p, x, y) => {
      const dx = z.includes('w') || z.includes('e') ? x - p[0] : 0;
      const dy = z.includes('n') || z.includes('s') ? y - p[1] : 0;
      return Math.max(Math.hypot(dx, dy), 1);
    };
    const CURSORS = { n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize' };
    const cursor = ref('');
    function hover(e) {
      if (action) return;
      const [x, y] = point(e);
      cursor.value = CURSORS[zone(x, y)] || '';
    }

    function down(e) {
      const [x, y] = point(e);
      const panning = !selected.value || e.shiftKey || e.button === 1;
      const z = panning ? '' : zone(x, y);
      if (z) {
        const c = pivotOf(z);
        action = { mode: 'size', zone: z, start: snapshot(selected.value), c, d0: reach(z, c, x, y) };
      } else if (!panning) {
        action = { mode: 'move', start: snapshot(selected.value), x0: x, y0: y };
      } else {
        if (zoom.value === 1) return;
        const r = stage.value.getBoundingClientRect();
        action = { mode: 'pan', cx: e.clientX, cy: e.clientY, lx: look.x, ly: look.y, upp: Math.max(view.value[2] / r.width, view.value[3] / r.height) };
      }
      e.currentTarget.setPointerCapture(e.pointerId);
      stage.value.focus();
    }
    function move(e) {
      if (!action) {
        hover(e);
        return;
      }
      if (action.mode === 'pan') {
        look.x = action.lx - (e.clientX - action.cx) * action.upp;
        look.y = action.ly - (e.clientY - action.cy) * action.upp;
        keepInside();
        return;
      }
      const [x, y] = point(e);
      if (action.mode === 'move') moveBy(action.start, x - action.x0, y - action.y0);
      else scaleBy(action.start, reach(action.zone, action.c, x, y) / action.d0, action.c);
    }
    function up() {
      action = null;
    }
    function resize(factor) {
      if (!selected.value) return;
      scaleBy(snapshot(selected.value), factor, center(selected.value));
    }
    // With a layer picked, the wheel resizes it. With none picked and zoomed in, the wheel
    // scrolls the view (Shift + wheel scrolls sideways).
    function wheel(e) {
      if (selected.value) {
        resize(e.deltaY < 0 ? 1.05 : 1 / 1.05);
      } else if (zoom.value > 1) {
        const step = e.deltaY * unitsPerPixel();
        if (e.shiftKey) look.x += step;
        else look.y += step;
        look.x += e.deltaX * unitsPerPixel();
        keepInside();
      }
    }
    function key(e) {
      if (!selected.value) return;
      if (e.key === 'PageUp' || e.key === 'PageDown') {
        shift(e.key === 'PageUp' ? 1 : -1);
        e.preventDefault();
        return;
      }
      const step = e.shiftKey ? 10 : 2;
      const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (moves[e.key]) {
        moveBy(snapshot(selected.value), moves[e.key][0], moves[e.key][1]);
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
        if (selected.value) resize(clamp(v / 100, LIMITS.s) / place(selected.value).s);
      },
    });
    const moved = (layer) => {
      const a = draft.adjust[layer];
      return !!a && (Math.round(a.x) !== 0 || Math.round(a.y) !== 0 || Math.round(a.s * 100) !== 100);
    };
    // Putting the body back, with parts following it, puts every part back with it
    function resetLayer() {
      if (selected.value === 'body' && follow.value) Object.keys(draft.adjust).forEach((k) => delete draft.adjust[k]);
      else delete draft.adjust[selected.value];
    }
    function resetAll() {
      Object.keys(draft.adjust).forEach((k) => delete draft.adjust[k]);
      delete draft.order;
    }
    // Move the whole doll back to its default place, the middle of the frame: every layer
    // moves by the same amount, so the body is where it starts and the parts stay where they
    // are on it. Sizes and layer order are kept. The view goes back to 100%, centred.
    function centerDoll() {
      const body = draft.adjust.body;
      const dx = body ? -body.x : 0;
      const dy = body ? -body.y : 0;
      if (dx || dy) {
        const start = {};
        drawn.value.forEach((l) => { start[l.layer] = { ...place(l.layer) }; });
        moveBy(start, dx, dy);
      }
      setZoom(1);
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
    // Clicking the picked layer again unpicks it
    function pickLayer(layer) {
      selected.value = selected.value === layer ? '' : layer;
    }
    // Drag a layer in the list to change the order. The list runs front (top) to back, so
    // dropping above another layer puts it in front of that layer, below puts it behind.
    const dragging = ref('');
    const dropAt = ref(null); // { layer, above }
    function dragStart(e, layer) {
      dragging.value = layer;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', layer);
    }
    function dragOver(e, layer) {
      if (!dragging.value || dragging.value === layer) { dropAt.value = null; return; }
      e.preventDefault();
      const r = e.currentTarget.getBoundingClientRect();
      dropAt.value = { layer, above: e.clientY < r.top + r.height / 2 };
    }
    function drop(e) {
      e.preventDefault();
      const from = dragging.value;
      const at = dropAt.value;
      dragging.value = '';
      dropAt.value = null;
      if (!from || !at || at.layer === from) return;
      const order = orderOf(draft).filter((id) => id !== from);
      order.splice(order.indexOf(at.layer) + (at.above ? 1 : 0), 0, from);
      draft.order = order;
    }
    function dragEnd() {
      dragging.value = '';
      dropAt.value = null;
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
        const avatar = { ...JSON.parse(JSON.stringify(draft)), adjust };
        if (inTab) {
          arrangeChannel?.postMessage({ type: 'draft', back: backTo, avatar });
          finishTab();
        } else {
          shopDraft.value = { back: backTo, avatar, done: true };
          router.push(backTo);
        }
        return;
      }
      try {
        await saveAvatar({ ...draft, adjust });
        if (inTab) {
          arrangeChannel?.postMessage({ type: 'saved' });
          finishTab();
        } else {
          router.push(backTo);
        }
      } catch (e) {
        error.value = t('auth.error.' + e.message);
      }
      busy.value = false;
    }
    // Leave without changes; a try-on look goes back to the shop as it came
    function cancel() {
      if (inTab) {
        finishTab();
        return;
      }
      if (tryOn) shopDraft.value = { back: backTo, avatar: handed, done: true };
      router.push(backTo);
    }
    // Close this tab. A browser may refuse (a tab it did not open by script); then go back here.
    const closed = ref(false);
    function finishTab() {
      closed.value = true;
      window.close();
      setTimeout(() => { if (!window.closed) router.push(backTo); }, 300);
    }

    return {
      drawn, canUp, canDown, shift, reordered, pickLayer, dragging, dropAt, dragStart, dragOver, drop, dragEnd,
      follow, stageBox: STAGE_VIEW.split(' ').map(Number), shown: FULL_VIEW.split(' ').map(Number),
      zoom, zoomIn, zoomOut, setZoom, maxZoom: ZOOMS[ZOOMS.length - 1], bars, barDown, barMove, barUp,
      doll, draft, layers, selected, stage, frame, size, error, busy, viewBox, backTo, bought, tryOn, inTab, pick,
      cursor, label, moved, down, move, up, wheel, key, resetLayer, resetAll, centerDoll, save, cancel, t,
    };
  },
  template: `
    <div class="arrange-workspace">
      <div v-if="doll" class="arrange-layout">
        <div class="arrange-stage-box">
          <div class="arrange-stage">
            <UserAvatar :avatar="draft" :view="viewBox" />
            <svg ref="stage" class="arrange-overlay" :class="{ 'arrange-idle': !selected }" :style="cursor ? { cursor } : null" :viewBox="viewBox" tabindex="0" role="application"
                 :aria-label="t('arrange.title')"
                 @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up"
                 @wheel.prevent="wheel" @keydown="key">
              <rect :x="stageBox[0]" :y="stageBox[1]" :width="stageBox[2]" :height="stageBox[3]" fill="transparent"/>
              <rect :x="shown[0]" :y="shown[1]" :width="shown[2]" :height="shown[3]" class="arrange-shown"/>
              <text :x="shown[0] + 8 / zoom" :y="shown[1] - 10 / zoom" class="arrange-shown-label" :style="{ fontSize: 28 / zoom + 'px' }">{{ t('arrange.shown') }}</text>
              <g v-if="frame">
                <rect :x="frame.x" :y="frame.y" :width="frame.w" :height="frame.h" class="arrange-frame"/>
                <circle v-for="(c, i) in [[frame.x, frame.y], [frame.x + frame.w, frame.y], [frame.x, frame.y + frame.h], [frame.x + frame.w, frame.y + frame.h]]" :key="i"
                        :cx="c[0]" :cy="c[1]" :r="7 / zoom" class="arrange-handle"/>
              </g>
            </svg>
            <template v-if="zoom > 1">
              <div class="arrange-scroll arrange-scroll-x" :title="t('arrange.scroll')"
                   @pointerdown="barDown($event, 'x')" @pointermove="barMove" @pointerup="barUp" @pointercancel="barUp">
                <div class="arrange-thumb" :style="{ left: bars.x.at + '%', width: bars.x.size + '%' }"></div>
              </div>
              <div class="arrange-scroll arrange-scroll-y" :title="t('arrange.scroll')"
                   @pointerdown="barDown($event, 'y')" @pointermove="barMove" @pointerup="barUp" @pointercancel="barUp">
                <div class="arrange-thumb" :style="{ top: bars.y.at + '%', height: bars.y.size + '%' }"></div>
              </div>
            </template>
            <div class="arrange-zoom" role="group" :aria-label="t('arrange.zoom')">
              <button type="button" class="btn" :disabled="zoom <= 1" :title="t('arrange.zoomOut')" :aria-label="t('arrange.zoomOut')" @click="zoomOut">−</button>
              <button type="button" class="btn" :title="t('arrange.zoomReset')" @click="setZoom(1)">{{ Math.round(zoom * 100) }}%</button>
              <button type="button" class="btn" :disabled="zoom >= maxZoom" :title="t('arrange.zoomIn')" :aria-label="t('arrange.zoomIn')" @click="zoomIn">+</button>
              <button type="button" class="btn arrange-center" :title="t('arrange.centerHint')" @click="centerDoll">⌖ {{ t('arrange.center') }}</button>
            </div>
          </div>
        </div>
        <section class="arrange-panel">
          <a class="back" :href="backTo" @click.prevent="cancel">← {{ inTab ? t('arrange.close') : backTo === '/account' ? t('auth.account') : t('arrange.backToShop') }}</a>
          <h1>{{ t('arrange.title') }}</h1>
          <p v-if="bought" class="right arrange-bought" role="status">{{ t('arrange.bought').replace('{item}', pick(bought.label)) }}</p>
          <p v-if="tryOn" class="arrange-bought" role="status">{{ t('arrange.tryOn') }}</p>
          <p class="intro">{{ t('arrange.intro') }}</p>
          <h2>{{ t('arrange.layers') }}</h2>
          <p class="arrange-hint">{{ t('arrange.dragHint') }}</p>
          <p class="arrange-hint">{{ t('arrange.front') }}</p>
          <ol class="arrange-layers" :aria-label="t('arrange.layers')">
            <li v-for="l in [...drawn].reverse()" :key="l.layer" draggable="true"
                :class="{ dragging: dragging === l.layer, 'drop-above': dropAt && dropAt.layer === l.layer && dropAt.above, 'drop-below': dropAt && dropAt.layer === l.layer && !dropAt.above }"
                @dragstart="dragStart($event, l.layer)" @dragover="dragOver($event, l.layer)" @drop="drop" @dragend="dragEnd">
              <button type="button" class="btn" :aria-pressed="String(selected === l.layer)" :title="t('arrange.dragHint')" @click="pickLayer(l.layer)">
                <span class="arrange-grip" aria-hidden="true">⠿</span>
                {{ label(l.layer) }}<span v-if="moved(l.layer)" class="arrange-dot" :title="t('arrange.moved')"> •</span>
              </button>
            </li>
          </ol>
          <p class="arrange-hint">{{ t('arrange.back') }}</p>
          <div v-if="selected" class="arrange-order">
            <button type="button" class="btn" :disabled="!canUp" @click="shift(1)">▲ {{ t('arrange.up') }}</button>
            <button type="button" class="btn" :disabled="!canDown" @click="shift(-1)">▼ {{ t('arrange.down') }}</button>
          </div>
          <template v-if="selected">
            <label v-if="selected === 'body'" class="arrange-follow">
              <input v-model="follow" type="checkbox"> {{ t('arrange.follow') }}
            </label>
            <label class="arrange-size">
              {{ t('arrange.size') }} <strong>{{ size }}%</strong>
              <input v-model.number="size" type="range" min="25" max="400" step="1">
            </label>
            <button type="button" class="btn" @click="resetLayer">{{ t('arrange.resetLayer') }}</button>
          </template>
          <p v-else class="intro">{{ t('arrange.pickHint') }}</p>
          <p class="intro arrange-keys">{{ t('arrange.keys') }}</p>
          <p v-if="error" class="wrong" role="alert">{{ error }}</p>
          <div class="dialog-actions">
            <button type="button" class="btn" @click="resetAll">{{ t('arrange.resetAll') }}</button>
            <button type="button" class="btn" @click="cancel">{{ t('dialog.cancel') }}</button>
            <button type="button" class="btn btn-primary" :disabled="busy" @click="save">{{ t(tryOn ? 'arrange.done' : 'arrange.save') }}</button>
          </div>
        </section>
      </div>
    </div>
  `,
};
