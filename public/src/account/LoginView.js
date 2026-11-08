import { ref, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import { login } from './auth.js';
import { t } from '../i18n.js';

export default {
  name: 'LoginView',
  setup() {
    const router = useRouter();
    const name = ref('');
    const password = ref('');
    const error = ref('');
    const busy = ref(false);

    watchEffect(() => {
      document.title = `${t('auth.login')} – ${t('site.title')}`;
    });

    async function submit() {
      busy.value = true;
      error.value = '';
      try {
        await login(name.value, password.value);
        router.push('/account');
      } catch (e) {
        error.value = t('auth.error.' + e.message);
      }
      busy.value = false;
    }

    return { name, password, error, busy, submit, t };
  },
  template: `
    <main class="auth-page">
      <h1>{{ t('auth.login') }}</h1>
      <form class="lesson" novalidate @submit.prevent="submit">
        <label class="field">
          {{ t('auth.name') }}
          <input v-model="name" type="text" maxlength="30" autocomplete="username" autofocus>
        </label>
        <label class="field">
          {{ t('auth.password') }}
          <input v-model="password" type="password" maxlength="128" autocomplete="current-password">
        </label>
        <p v-if="error" class="wrong" role="alert">{{ error }}</p>
        <button type="submit" class="btn btn-primary" :disabled="busy || !name.trim() || !password">{{ t('auth.login') }}</button>
      </form>
      <p>{{ t('auth.noAccount') }} <RouterLink to="/register">{{ t('auth.register') }}</RouterLink></p>
    </main>
  `,
};
