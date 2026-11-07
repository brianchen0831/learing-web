import LangSwitch from './LangSwitch.js';
import TopicMenu from './TopicMenu.js';
import { t } from '../i18n.js';

export default {
  name: 'AppHeader',
  components: { LangSwitch, TopicMenu },
  setup() {
    return { t };
  },
  template: `
    <header>
      <div class="header-left">
        <RouterLink class="brand" to="/">{{ t('site.title') }}</RouterLink>
        <TopicMenu v-if="$route.name === 'home'" />
      </div>
      <LangSwitch />
    </header>
  `,
};
