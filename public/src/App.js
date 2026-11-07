import AppHeader from './components/AppHeader.js';
import { t } from './i18n.js';

export default {
  name: 'App',
  components: { AppHeader },
  setup() {
    return { t };
  },
  template: `
    <AppHeader />
    <RouterView />
    <footer>{{ t('footer.text') }}</footer>
  `,
};
