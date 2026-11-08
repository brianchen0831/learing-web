import { watchEffect } from 'vue';
import UserAvatar from './UserAvatar.js';
import { user } from './auth.js';
import { t } from '../i18n.js';

// The user page, with the full-body avatar. Only reachable when logged in.
export default {
  name: 'AccountView',
  components: { UserAvatar },
  setup() {
    watchEffect(() => {
      document.title = `${t('auth.account')} – ${t('site.title')}`;
    });

    return { user, t };
  },
  template: `
    <main v-if="user" class="auth-page auth-wide">
      <h1>{{ t('auth.account') }}</h1>
      <section class="lesson account-card">
        <div class="avatar-preview"><UserAvatar :avatar="user.avatar" /></div>
        <div>
          <h2>{{ user.name }}</h2>
          <p class="coins">{{ t('shop.coins') }}: <strong>{{ user.coins }}</strong></p>
          <div class="account-actions">
            <RouterLink class="btn" to="/account/avatar">{{ t('avatar.customize') }}</RouterLink>
            <RouterLink class="btn" to="/account/shop">{{ t('shop.title') }}</RouterLink>
          </div>
        </div>
      </section>
    </main>
  `,
};
