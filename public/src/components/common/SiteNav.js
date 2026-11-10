import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { user } from '../../account/auth.js';
import { getContent, getTopics } from '../../api.js';
import { pick, t } from '../../i18n.js';
import { navFolded, navOpen } from '../../layout.js';

// Sidebar on every page with links to every page of the site: Home, each topic with its
// subtopics and tasks, and the account pages (or Log in and Register). The page being shown
// is highlighted. Wide screens: a column that folds to a thin strip. Narrow screens: a drawer
// opened from the header's menu button, closed when a page is chosen.
export default {
  name: 'SiteNav',
  setup() {
    const route = useRoute();
    const topics = ref([]);

    onMounted(async () => {
      try {
        const list = await getTopics();
        topics.value = await Promise.all(list.map(async (topic) => {
          let subtopics = [];
          try { subtopics = (await getContent(topic.slug)).subtopics || []; } catch {}
          return { ...topic, subtopics };
        }));
      } catch {}
    });
    watch(() => route.fullPath, () => { navOpen.value = false; });

    const accountLinks = [
      { to: '/account', label: 'auth.account' },
      { to: '/account/avatar', label: 'avatar.customize' },
      { to: '/account/arrange', label: 'arrange.title' },
      { to: '/account/tasks', label: 'tasks.title' },
      { to: '/account/shop', label: 'shop.clothes.title' },
      { to: '/account/hair', label: 'shop.hair.title' },
      { to: '/account/beauty', label: 'shop.beauty.title' },
    ];
    // Exact match for highlighting, so /topics/math is not lit up on /topics/math/quiz
    const here = (to) => route.path === to;

    return { topics, user, accountLinks, here, navFolded, navOpen, pick, t };
  },
  template: `
    <div v-if="navOpen" class="sitenav-backdrop" @click="navOpen = false"></div>
    <nav id="sitenav" class="sitenav" :class="{ folded: navFolded, open: navOpen }" :aria-label="t('nav.site')">
      <button type="button" class="sitenav-fold" :aria-expanded="String(!navFolded)" aria-controls="sitenav-body"
              :title="navFolded ? t('nav.unfold') : t('nav.fold')" :aria-label="navFolded ? t('nav.unfold') : t('nav.fold')"
              @click="navFolded = !navFolded">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M15 6l-6 6 6 6"/>
        </svg>
      </button>
      <div id="sitenav-body" class="sitenav-body">
        <ul>
          <li><RouterLink to="/" :class="{ here: here('/') }">🏠 {{ t('nav.homePage') }}</RouterLink></li>
        </ul>
        <p class="sitenav-head">{{ t('menu.topics') }}</p>
        <ul>
          <li v-for="topic in topics" :key="topic.slug">
            <RouterLink :to="'/topics/' + topic.slug" :class="{ here: here('/topics/' + topic.slug) }">{{ topic.icon }} {{ pick(topic.title) }}</RouterLink>
            <ul>
              <li v-for="sub in topic.subtopics" :key="sub.slug">
                <RouterLink :to="'/topics/' + topic.slug + '/' + sub.slug" :class="{ here: here('/topics/' + topic.slug + '/' + sub.slug) }">{{ pick(sub.title) }}</RouterLink>
              </li>
              <li>
                <RouterLink :to="'/topics/' + topic.slug + '/tasks'" :class="{ here: here('/topics/' + topic.slug + '/tasks') }">{{ t('tasks.topicTitle') }}</RouterLink>
              </li>
            </ul>
          </li>
        </ul>
        <p class="sitenav-head">{{ t('nav.account') }}</p>
        <ul v-if="user">
          <li v-for="link in accountLinks" :key="link.to">
            <RouterLink :to="link.to" :class="{ here: here(link.to) }">{{ t(link.label) }}</RouterLink>
          </li>
        </ul>
        <ul v-else>
          <li><RouterLink to="/login" :class="{ here: here('/login') }">{{ t('auth.login') }}</RouterLink></li>
          <li><RouterLink to="/register" :class="{ here: here('/register') }">{{ t('auth.register') }}</RouterLink></li>
        </ul>
      </div>
    </nav>
  `,
};
