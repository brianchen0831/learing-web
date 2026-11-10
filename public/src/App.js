import AppHeader from './components/common/AppHeader.js';
import SiteNav from './components/common/SiteNav.js';
import { t } from './i18n.js';
import { navFolded } from './layout.js';

// Every page: the header, the site sidebar (links to all pages) and the page itself, which
// gets the rest of the width.
export default {
  name: 'App',
  components: { AppHeader, SiteNav },
  setup() {
    return { navFolded, t };
  },
  template: `
    <AppHeader />
    <div class="app-body" :class="{ 'nav-folded': navFolded }">
      <SiteNav />
      <div class="app-page"><RouterView /></div>
    </div>
    <footer>{{ t('footer.text') }}</footer>
  `,
};
