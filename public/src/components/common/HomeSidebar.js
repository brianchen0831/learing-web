import UserAvatar from '../../account/UserAvatar.js';
import { user } from '../../account/auth.js';
import { pick, t } from '../../i18n.js';
import { scores } from '../../store.js';

// Home page sidebar: the user's avatar, then topic links with last scores.
export default {
  name: 'HomeSidebar',
  components: { UserAvatar },
  props: { topics: { type: Array, required: true } },
  setup() {
    return { user, scores, pick, t };
  },
  template: `
    <aside class="sidebar">
      <div v-if="user" class="sidebar-avatar">
        <RouterLink to="/account" :title="t('auth.account')"><UserAvatar :avatar="user.avatar" /></RouterLink>
        <strong>{{ user.name }}</strong>
        <span class="side-score">{{ t('shop.coins') }}: {{ user.coins }}</span>
        <RouterLink class="btn" to="/account/shop">{{ t('shop.title') }}</RouterLink>
      </div>
      <p v-else class="sidebar-login">
        <RouterLink to="/login">{{ t('auth.login') }}</RouterLink> {{ t('sidebar.loginHint') }}
      </p>
      <strong>{{ t('menu.topics') }}</strong>
      <ul>
        <li v-for="topic in topics" :key="topic.slug">
          <RouterLink :to="'/topics/' + topic.slug">{{ pick(topic.title) }}</RouterLink>
          <span v-if="scores[topic.slug]" class="side-score">{{ scores[topic.slug] }}</span>
        </li>
      </ul>
    </aside>
  `,
};
