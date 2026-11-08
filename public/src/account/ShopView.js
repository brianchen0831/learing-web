import { computed, onMounted, ref, watch, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import UserAvatar from './UserAvatar.js';
import { buyItem, saveAvatar, user } from './auth.js';
import { defaultParts, doll, dollReady, findPart, hairColors, hairTables, isRequired, keepAdjust, partFile, partsFor } from './doll.js';
import { shopDraft } from './draft.js';
import { pick, t } from '../i18n.js';

// The shops: dressing room (clothes and shoes), hair salon (hair) and beauty salon (face).
// Each layer in parts.json names its shop. Anything can be tried on for free;
// only owned parts can be saved. A shop lists the parts with a price that fit the user's body.
export const SHOPS = [
  { id: 'clothes', path: '/account/shop', image: '/assets/images/shops/clothes.jpg' },
  { id: 'hair', path: '/account/hair', image: '/assets/images/shops/hair.jpg' },
  { id: 'beauty', path: '/account/beauty', image: '/assets/images/shops/beauty.jpg' },
];

export default {
  name: 'ShopView',
  components: { UserAvatar },
  props: { shop: { type: String, required: true } },
  setup(props) {
    const router = useRouter();
    const ready = ref(null); // null while loading, then true or false
    const layer = ref('');
    const worn = ref({ ...user.value.avatar.parts });
    // Hair color is free and chosen in the hair salon. An avatar saved without one uses the first.
    const savedColor = () => user.value.avatar.hair_color || hairColors()[0]?.id;
    const hairColor = ref(user.value.avatar.hair_color || '');
    // Placements (from the arrange page) of what is being worn here, saved or not
    const placed = ref({ ...(user.value.avatar.adjust || {}) });
    // Back from arranging the try-on look: pick up where we left off
    const back = shopDraft.value;
    if (back && back.done && back.back === SHOPS.find((s) => s.id === props.shop)?.path) {
      worn.value = { ...back.avatar.parts };
      hairColor.value = back.avatar.hair_color || '';
      placed.value = { ...(back.avatar.adjust || {}) };
    }
    shopDraft.value = null;
    const message = ref('');
    const error = ref('');
    const busy = ref(false);

    const info = computed(() => SHOPS.find((s) => s.id === props.shop) || SHOPS[0]);
    const others = computed(() => SHOPS.filter((s) => s.id !== info.value.id));
    const gender = computed(() => user.value.avatar.gender);
    // This shop's layers, and the tabs: those that have something for sale for this body
    const layers = computed(() => (ready.value ? doll.value.layers.filter((l) => l.shop === info.value.id) : []));
    const tabs = computed(() => layers.value.filter((l) => partsFor(gender.value, l.id).some((p) => p.price)));
    const items = computed(() => partsFor(gender.value, layer.value).filter((p) => p.price));

    onMounted(async () => {
      await dollReady;
      ready.value = !!doll.value;
      if (!hairColor.value) hairColor.value = savedColor();
      if (tabs.value.length) layer.value = tabs.value[0].id;
    });
    watch(tabs, (list) => {
      if (list.length && !list.some((l) => l.id === layer.value)) layer.value = list[0].id;
    });

    watchEffect(() => {
      document.title = `${t(`shop.${info.value.id}.title`)} – ${t('site.title')}`;
    });

    const owns = (id) => user.value.owned.includes(id);
    const isWorn = (id) => Object.values(worn.value).includes(id);
    // Placements stay with their part; a swapped-in part starts in place (see toggle).
    const adjust = computed(() => {
      const out = {};
      Object.entries(placed.value).forEach(([l, a]) => { if (worn.value[l]) out[l] = a; });
      return out;
    });
    const preview = computed(() => ({ ...user.value.avatar, hair_color: hairColor.value, parts: worn.value, adjust: adjust.value }));
    const toBuy = computed(() =>
      Object.values(worn.value).map(findPart).filter((p) => p && p.price && !owns(p.id)),
    );
    const unsaved = computed(() =>
      JSON.stringify(worn.value) !== JSON.stringify(user.value.avatar.parts) || (ready.value && hairColor.value !== savedColor())
      || JSON.stringify(adjust.value) !== JSON.stringify(user.value.avatar.adjust || {}),
    );
    const colors = computed(() => (ready.value && info.value.id === 'hair' ? hairColors() : []));
    const hairFilter = computed(() => hairTables(hairColor.value));
    const heroStyle = computed(() => ({ backgroundImage: `url("${info.value.image}")` }));

    // One part per layer. Taking a part off a required layer puts back the default.
    function toggle(part) {
      message.value = '';
      error.value = '';
      const next = { ...worn.value };
      if (next[part.layer] !== part.id) {
        next[part.layer] = part.id;
      } else if (isRequired(part.layer)) {
        next[part.layer] = defaultParts(gender.value)[part.layer];
      } else {
        delete next[part.layer];
      }
      worn.value = next;
      forget(part.layer);
    }
    // A layer whose part changed starts in place again; back to the saved part, back to its saved place
    function forget(l) {
      const saved = user.value.avatar;
      const p = { ...placed.value };
      if (worn.value[l] && worn.value[l] === saved.parts[l] && saved.adjust?.[l]) p[l] = saved.adjust[l];
      else delete p[l];
      placed.value = p;
    }
    // Arrange what is being tried on, before buying it
    function arrange() {
      shopDraft.value = { back: info.value.path, avatar: JSON.parse(JSON.stringify(preview.value)) };
      router.push({ path: '/account/arrange', query: { draft: '1', back: info.value.path } });
    }
    // Puts back the defaults for this shop's layers only.
    function reset() {
      message.value = '';
      const defaults = defaultParts(gender.value);
      const next = { ...worn.value };
      layers.value.forEach((l) => {
        if (defaults[l.id]) next[l.id] = defaults[l.id];
        else delete next[l.id];
      });
      worn.value = next;
      layers.value.forEach((l) => forget(l.id));
      if (info.value.id === 'hair') hairColor.value = hairColors()[0]?.id;
    }

    async function run(action, done) {
      busy.value = true;
      error.value = '';
      message.value = '';
      try {
        await action();
        message.value = done;
      } catch (e) {
        error.value = t('auth.error.' + e.message);
      }
      busy.value = false;
    }
    // Buying puts the item on, saved with the rest of the saved look. If it was already arranged
    // here, that placement is kept and we stay in the shop; otherwise the arrange page opens with
    // the item picked, and comes back here after. Other try-ons stay on but are not saved.
    async function buy(part) {
      busy.value = true;
      error.value = '';
      message.value = '';
      try {
        await buyItem(part.id);
        const saved = user.value.avatar;
        const parts = { ...saved.parts, [part.layer]: part.id };
        const adjust = keepAdjust({ parts, adjust: saved.adjust }, saved.parts);
        const arranged = placed.value[part.layer];
        if (arranged) adjust[part.layer] = arranged;
        await saveAvatar({ ...saved, hair_color: hairColor.value || saved.hair_color, parts, adjust });
        if (arranged) {
          message.value = t('shop.boughtWorn');
          busy.value = false;
          return;
        }
        const query = { layer: part.layer, back: info.value.path, bought: part.id };
        router.push({ path: '/account/arrange', query });
      } catch (e) {
        error.value = t('auth.error.' + e.message);
        busy.value = false;
      }
    }
    // Layers missing from `worn` are sent as null, so the server takes them off.
    function save() {
      const parts = { ...worn.value };
      Object.keys(user.value.avatar.parts).forEach((l) => {
        if (!(l in parts)) parts[l] = null;
      });
      return run(() => saveAvatar({ ...user.value.avatar, hair_color: hairColor.value, parts, adjust: adjust.value }), t('shop.saved'));
    }

    return {
      user, ready, info, others, layer, tabs, items, preview, toBuy, unsaved, message, error, busy, gender, heroStyle,
      colors, hairColor, hairFilter,
      owns, isWorn, toggle, reset, buy, save, arrange, partFile, pick, t,
    };
  },
  template: `
    <main class="dressing-room">
      <RouterLink class="back" to="/account">← {{ t('auth.account') }}</RouterLink>
      <div class="topic-hero shop-hero">
        <div class="topic-hero-bg" :style="heroStyle"></div>
        <div class="topic-hero-text">
          <h1>{{ t('shop.' + info.id + '.title') }}</h1>
          <p>{{ t('shop.' + info.id + '.intro') }}</p>
        </div>
      </div>
      <nav class="shop-links" :aria-label="t('shop.others')">
        <RouterLink v-for="s in others" :key="s.id" class="btn" :to="s.path">{{ t('shop.' + s.id + '.title') }}</RouterLink>
      </nav>
      <div v-if="ready" class="room-layout">
        <aside class="lesson room-doll">
          <p class="coins">{{ t('shop.coins') }}: <strong>{{ user.coins }}</strong></p>
          <div class="avatar-preview"><UserAvatar :avatar="preview" /></div>
          <ul v-if="toBuy.length" class="try-list">
            <li v-for="p in toBuy" :key="p.id">
              <span>{{ pick(p.label) }}</span>
              <button type="button" class="btn" :disabled="busy || user.coins < p.price" @click="buy(p)">
                {{ t('shop.buy') }} {{ p.price }}
              </button>
            </li>
          </ul>
          <p v-if="toBuy.some((p) => user.coins < p.price)" class="wrong">{{ t('auth.error.not_enough_coins') }}</p>
          <p v-if="toBuy.length" class="intro">{{ t('shop.buyFirst') }}</p>
          <p v-if="error" class="wrong" role="alert">{{ error }}</p>
          <p v-if="message" class="right" role="status">{{ message }}</p>
          <div class="room-actions">
            <button type="button" class="btn room-arrange" :disabled="busy" :title="t('shop.arrangeHint')" @click="arrange">✥ {{ t('shop.arrange') }}</button>
            <button type="button" class="btn" @click="reset">{{ t(info.id === 'clothes' ? 'shop.takeOff' : 'shop.reset') }}</button>
            <button type="button" class="btn btn-primary" :disabled="busy || !unsaved || toBuy.length > 0" @click="save">{{ t('shop.save') }}</button>
          </div>
        </aside>
        <section class="lesson">
          <svg v-if="hairFilter" width="0" height="0" class="svg-defs" aria-hidden="true">
            <filter id="shop-hair" color-interpolation-filters="sRGB">
              <feComponentTransfer>
                <feFuncR type="table" :tableValues="hairFilter.r"/>
                <feFuncG type="table" :tableValues="hairFilter.g"/>
                <feFuncB type="table" :tableValues="hairFilter.b"/>
              </feComponentTransfer>
            </filter>
          </svg>
          <fieldset v-if="colors.length" class="avatar-part hair-colors">
            <legend>{{ t('shop.hairColor') }} <span class="free">· {{ t('shop.free') }}</span></legend>
            <label v-for="c in colors" :key="c.id" class="avatar-option" :title="pick(c.label)">
              <input v-model="hairColor" type="radio" name="hair-color" :value="c.id" @change="message = ''">
              <span class="swatch" :style="{ background: 'linear-gradient(135deg, ' + c.stops[3] + ', ' + c.stops[2] + ' 45%, ' + c.stops[1] + ')' }" role="img" :aria-label="pick(c.label)"></span>
              <small>{{ pick(c.label) }}</small>
            </label>
          </fieldset>
          <p v-if="!tabs.length" class="intro">{{ t('shop.empty') }}</p>
          <template v-else>
            <div class="avatar-tabs" role="group" :aria-label="t('shop.' + info.id + '.title')">
              <button v-for="l in tabs" :key="l.id" type="button" :aria-pressed="String(l.id === layer)"
                      @click="layer = l.id">{{ pick(l.label) }}</button>
            </div>
            <div class="shop-grid">
              <button v-for="p in items" :key="p.id" type="button" class="shop-item" :aria-pressed="String(isWorn(p.id))" @click="toggle(p)">
                <svg :viewBox="p.view || '0 0 720 1272'" aria-hidden="true">
                  <image :href="partFile(p, gender)" width="720" height="1272" :filter="p.layer === 'hair' && hairFilter ? 'url(#shop-hair)' : null"/>
                </svg>
                <strong>{{ pick(p.label) }}</strong>
                <span>{{ owns(p.id) ? t('shop.owned') : p.price + ' ' + t('shop.coinUnit') }}</span>
              </button>
            </div>
          </template>
        </section>
      </div>
      <p v-else-if="ready === false">{{ t('shop.loadError') }}</p>
    </main>
  `,
};
