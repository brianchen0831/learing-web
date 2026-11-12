import { watchEffect } from 'vue';
import UserAvatar from './UserAvatar.js';
import ArrangeLink from './ArrangeLink.js';
import { SHOPS } from './ShopView.js';
import { user } from './auth.js';
import { t } from '../i18n.js';

// The user page, with the full-body avatar and the three shops. Only reachable when logged in.
export default {
  name: 'AccountView',
  components: { UserAvatar, ArrangeLink },
  setup() {
    watchEffect(() => {
      document.title = `${t('auth.account')} – ${t('site.title')}`;
    });

    return { user, shops: SHOPS, t };
  },
  template: `
    <main v-if="user" class="auth-page account-page">
      <h1>{{ t('auth.account') }}</h1>
      <section class="lesson account-card">
        <div class="avatar-preview"><UserAvatar :avatar="user.avatar" /></div>
        <div>
          <h2>{{ user.name }}</h2>
          <p class="coins">{{ t('shop.coins') }}: <strong>{{ user.coins }}</strong></p>
          <div class="account-actions">
            <RouterLink class="btn" to="/account/avatar">{{ t('avatar.customize') }}</RouterLink>
            <ArrangeLink class="btn">{{ t('arrange.title') }} ↗</ArrangeLink>
            <RouterLink class="btn" to="/account/tasks">{{ t('tasks.title') }}</RouterLink>
          </div>
        </div>
      </section>
      <h2 class="shops-heading">{{ t('shop.heading') }}</h2>
      <div class="grid shop-cards">
        <RouterLink v-for="s in shops" :key="s.id" class="card" :to="s.path">
          <div class="thumb"><img :src="s.image" alt="" loading="lazy"></div>
          <div class="body">
            <h2>{{ t('shop.' + s.id + '.title') }}</h2>
            <p>{{ t('shop.' + s.id + '.intro') }}</p>
          </div>
        </RouterLink>
      </div>
    </main>
  `,
};
