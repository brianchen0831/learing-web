import { computed, onMounted, ref, watch, watchEffect } from 'vue';
import UserAvatar from './UserAvatar.js';
import { buyItem, saveAvatar, user } from './auth.js';
import { defaultParts, doll, dollReady, findPart, isRequired, partFile, partsFor } from './doll.js';
import { pick, t } from '../i18n.js';

// Dressing room and shop. Anything can be tried on for free; only owned parts can be saved.
// The shop lists the parts with a price that fit the user's body.
export default {
  name: 'DressingRoomView',
  components: { UserAvatar },
  setup() {
    const ready = ref(null); // null while loading, then true or false
    const layer = ref('');
    const worn = ref({ ...user.value.avatar.parts });
    const message = ref('');
    const error = ref('');
    const busy = ref(false);

    const gender = computed(() => user.value.avatar.gender);
    // Tabs: layers that have something for sale for this body
    const tabs = computed(() =>
      ready.value ? doll.value.layers.filter((l) => partsFor(gender.value, l.id).some((p) => p.price)) : [],
    );
    const items = computed(() => partsFor(gender.value, layer.value).filter((p) => p.price));

    onMounted(async () => {
      await dollReady;
      ready.value = !!doll.value;
      if (tabs.value.length) layer.value = tabs.value[0].id;
    });
    watch(tabs, (list) => {
      if (list.length && !list.some((l) => l.id === layer.value)) layer.value = list[0].id;
    });

    watchEffect(() => {
      document.title = `${t('shop.title')} – ${t('site.title')}`;
    });

    const owns = (id) => user.value.owned.includes(id);
    const isWorn = (id) => Object.values(worn.value).includes(id);
    const preview = computed(() => ({ ...user.value.avatar, parts: worn.value }));
    const toBuy = computed(() =>
      Object.values(worn.value).map(findPart).filter((p) => p && p.price && !owns(p.id)),
    );
    const unsaved = computed(() => JSON.stringify(worn.value) !== JSON.stringify(user.value.avatar.parts));

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
    }
    function takeOffAll() {
      message.value = '';
      worn.value = defaultParts(gender.value);
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
    const buy = (part) => run(() => buyItem(part.id), t('shop.bought'));
    // Layers missing from `worn` are sent as null, so the server takes them off.
    function save() {
      const parts = { ...worn.value };
      Object.keys(user.value.avatar.parts).forEach((l) => {
        if (!(l in parts)) parts[l] = null;
      });
      return run(() => saveAvatar({ ...user.value.avatar, parts }), t('shop.saved'));
    }

    return {
      user, ready, layer, tabs, items, preview, toBuy, unsaved, message, error, busy, gender,
      owns, isWorn, toggle, takeOffAll, buy, save, partFile, pick, t,
    };
  },
  template: `
    <main class="dressing-room">
      <RouterLink class="back" to="/account">← {{ t('auth.account') }}</RouterLink>
      <h1>{{ t('shop.title') }}</h1>
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
            <button type="button" class="btn" @click="takeOffAll">{{ t('shop.takeOff') }}</button>
            <button type="button" class="btn btn-primary" :disabled="busy || !unsaved || toBuy.length > 0" @click="save">{{ t('shop.save') }}</button>
          </div>
        </aside>
        <section class="lesson">
          <p v-if="!tabs.length" class="intro">{{ t('shop.empty') }}</p>
          <template v-else>
            <div class="avatar-tabs" role="group" :aria-label="t('shop.title')">
              <button v-for="l in tabs" :key="l.id" type="button" :aria-pressed="String(l.id === layer)"
                      @click="layer = l.id">{{ pick(l.label) }}</button>
            </div>
            <div class="shop-grid">
              <button v-for="p in items" :key="p.id" type="button" class="shop-item" :aria-pressed="String(isWorn(p.id))" @click="toggle(p)">
                <svg :viewBox="p.view || '0 0 720 1272'" aria-hidden="true">
                  <image :href="partFile(p, gender)" width="720" height="1272"/>
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
