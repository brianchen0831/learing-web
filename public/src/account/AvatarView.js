import { reactive, ref, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import AvatarPicker from './AvatarPicker.js';
import { saveAvatar, user } from './auth.js';
import { t } from '../i18n.js';

// Avatar customization page. Only reachable when logged in.
export default {
  name: 'AvatarView',
  components: { AvatarPicker },
  setup() {
    const router = useRouter();
    const draft = reactive(JSON.parse(JSON.stringify(user.value.avatar)));
    const error = ref('');
    const busy = ref(false);

    watchEffect(() => {
      document.title = `${t('avatar.customize')} – ${t('site.title')}`;
    });

    async function save() {
      busy.value = true;
      error.value = '';
      try {
        await saveAvatar(draft);
        router.push('/account');
      } catch (e) {
        error.value = t('auth.error.' + e.message);
      }
      busy.value = false;
    }

    return { draft, error, busy, save, t };
  },
  template: `
    <main class="auth-page auth-wide">
      <RouterLink class="back" to="/account">← {{ t('auth.account') }}</RouterLink>
      <h1>{{ t('avatar.customize') }}</h1>
      <section class="lesson">
        <AvatarPicker :avatar="draft" />
        <p v-if="error" class="wrong" role="alert">{{ error }}</p>
        <div class="dialog-actions">
          <RouterLink class="btn" to="/account">{{ t('dialog.cancel') }}</RouterLink>
          <button type="button" class="btn btn-primary" :disabled="busy" @click="save">{{ t('avatar.save') }}</button>
        </div>
      </section>
    </main>
  `,
};
