import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from './components/common/AppHeader.js';
import SiteNav from './components/common/SiteNav.js';
import { refreshUser } from './account/auth.js';
import { arrangeChannel } from './account/draft.js';
import { t } from './i18n.js';
import { navFolded } from './layout.js';

// The avatar was saved in another tab (the arrange workspace): show the new one here too.
arrangeChannel?.addEventListener('message', (e) => {
  if (e.data?.type === 'saved') refreshUser();
});

// Every page: the header, the site sidebar (links to all pages) and the page itself, which
// gets the rest of the width. A route with meta.bare (the arrange workspace) gets the whole
// window, without header, sidebar or footer.
export default {
  name: 'App',
  components: { AppHeader, SiteNav },
  setup() {
    const route = useRoute();
    const bare = computed(() => !!route.meta.bare);
    return { bare, navFolded, t };
  },
  template: `
    <RouterView v-if="bare" />
    <template v-else>
      <AppHeader />
      <div class="app-body" :class="{ 'nav-folded': navFolded }">
        <SiteNav />
        <div class="app-page"><RouterView /></div>
      </div>
      <footer>{{ t('footer.text') }}</footer>
    </template>
  `,
};
