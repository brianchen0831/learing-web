import { computed, onMounted, watch } from 'vue';
import UserAvatar from './UserAvatar.js';
import { user } from './auth.js';
import { defaultAvatar, doll, dollReady, partFile, partsFor } from './doll.js';
import { pick, t } from '../i18n.js';

// Avatar customizer with a live full-body preview. The parent passes a reactive object,
// which is filled with the defaults when empty. Boy or girl comes first, because each
// body has its own parts.
export default {
  name: 'AvatarPicker',
  components: { UserAvatar },
  props: { avatar: { type: Object, required: true } },
  setup(props) {
    function reset(gender, skin) {
      Object.assign(props.avatar, defaultAvatar(gender, skin));
    }

    onMounted(async () => {
      await dollReady;
      if (!props.avatar.parts) reset(props.avatar.gender, props.avatar.skin);
    });

    // A new gender starts from that body's defaults, keeping the skin color.
    watch(() => props.avatar.gender, (gender, before) => {
      if (before && doll.value) reset(gender, props.avatar.skin);
    });

    const owned = computed(() => (user.value ? user.value.owned : []));
    // Layers with a choice to make: free parts plus parts the user owns.
    const choices = computed(() => {
      if (!doll.value || !props.avatar.gender) return [];
      return doll.value.layers
        .map((layer) => ({
          layer,
          parts: partsFor(props.avatar.gender, layer.id).filter((p) => !p.price || owned.value.includes(p.id)),
        }))
        .filter((c) => c.parts.length > 1);
    });

    return { doll, choices, partFile, pick, t };
  },
  template: `
    <div v-if="doll && avatar.parts" class="avatar-picker">
      <div class="avatar-preview"><UserAvatar :avatar="avatar" /></div>
      <div>
        <fieldset class="avatar-part">
          <legend>{{ t('avatar.gender') }}</legend>
          <label v-for="g in doll.genders" :key="g.id" class="avatar-option">
            <input v-model="avatar.gender" type="radio" name="avatar-gender" :value="g.id">
            <span>{{ pick(g.label) }}</span>
          </label>
        </fieldset>
        <fieldset class="avatar-part">
          <legend>{{ t('avatar.skin') }}</legend>
          <label v-for="s in doll.skins" :key="s.id" class="avatar-option" :title="s.id">
            <input v-model="avatar.skin" type="radio" name="avatar-skin" :value="s.id">
            <span class="swatch" :style="{ background: s.color }" role="img" :aria-label="s.id"></span>
          </label>
        </fieldset>
        <fieldset v-for="c in choices" :key="c.layer.id" class="avatar-part">
          <legend>{{ pick(c.layer.label) }}</legend>
          <label v-for="p in c.parts" :key="p.id" class="avatar-option" :title="pick(p.label)">
            <input v-model="avatar.parts[c.layer.id]" type="radio" :name="'avatar-' + c.layer.id" :value="p.id">
            <span>{{ pick(p.label) }}</span>
          </label>
        </fieldset>
        <p class="intro">{{ t('avatar.moreInShop') }}</p>
      </div>
    </div>
  `,
};
