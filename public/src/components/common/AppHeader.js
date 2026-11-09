import { useRouter } from 'vue-router';
import LangSwitch from './LangSwitch.js';
import TopicMenu from './TopicMenu.js';
import UserAvatar from '../../account/UserAvatar.js';
import { logout, user } from '../../account/auth.js';
import { t } from '../../i18n.js';

export default {
  name: 'AppHeader',
  components: { LangSwitch, TopicMenu, UserAvatar },
  setup() {
    const router = useRouter();

    async function signOut() {
      await logout();
      router.push('/');
    }

    return { user, signOut, t };
  },
  template: `
    <header>
      <div class="header-left">
        <RouterLink class="brand" to="/">{{ t('site.title') }}</RouterLink>
        <TopicMenu v-if="$route.name === 'home'" />
      </div>
      <div class="header-right">
        <LangSwitch />
        <template v-if="user">
          <RouterLink class="account-link" to="/account" :title="t('auth.account')">
            <span class="head-icon"><UserAvatar :avatar="user.avatar" head /></span>
            <span class="account-name">{{ user.name }}</span>
          </RouterLink>
          <button type="button" class="btn-link" @click="signOut">{{ t('auth.logout') }}</button>
        </template>
        <RouterLink v-else class="btn" to="/login">{{ t('auth.login') }}</RouterLink>
      </div>
    </header>
  `,
};
