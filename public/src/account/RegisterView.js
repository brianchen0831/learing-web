import { computed, reactive, ref, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import AvatarPicker from './AvatarPicker.js';
import { register } from './auth.js';
import { t } from '../i18n.js';

const MIN_PASSWORD = 6;

export default {
  name: 'RegisterView',
  components: { AvatarPicker },
  setup() {
    const router = useRouter();
    const name = ref('');
    const password = ref('');
    const confirm = ref('');
    const avatar = reactive({});
    const error = ref('');
    const busy = ref(false);

    const mismatch = computed(() => !!confirm.value && password.value !== confirm.value);
    const canSubmit = computed(
      () => !busy.value && !!name.value.trim() && password.value.length >= MIN_PASSWORD && password.value === confirm.value,
    );

    watchEffect(() => {
      document.title = `${t('auth.register')} – ${t('site.title')}`;
    });

    async function submit() {
      busy.value = true;
      error.value = '';
      try {
        await register(name.value, password.value, avatar);
        router.push('/account');
      } catch (e) {
        error.value = t('auth.error.' + e.message);
      }
      busy.value = false;
    }

    return { name, password, confirm, avatar, error, mismatch, canSubmit, submit, t };
  },
  template: `
    <main class="auth-page auth-wide">
      <h1>{{ t('auth.register') }}</h1>
      <form class="lesson" novalidate @submit.prevent="submit">
        <label class="field">
          {{ t('auth.name') }}
          <input v-model="name" type="text" maxlength="30" autocomplete="username" autofocus>
        </label>
        <label class="field">
          {{ t('auth.password') }} ({{ t('auth.passwordRule') }})
          <input v-model="password" type="password" maxlength="128" autocomplete="new-password">
        </label>
        <label class="field">
          {{ t('auth.confirm') }}
          <input v-model="confirm" type="password" maxlength="128" autocomplete="new-password">
        </label>
        <p v-if="mismatch" class="wrong" role="alert">{{ t('auth.mismatch') }}</p>
        <h2>{{ t('avatar.choose') }}</h2>
        <AvatarPicker :avatar="avatar" />
        <p v-if="error" class="wrong" role="alert">{{ error }}</p>
        <button type="submit" class="btn btn-primary" :disabled="!canSubmit">{{ t('auth.create') }}</button>
      </form>
      <p>{{ t('auth.haveAccount') }} <RouterLink to="/login">{{ t('auth.login') }}</RouterLink></p>
    </main>
  `,
};
