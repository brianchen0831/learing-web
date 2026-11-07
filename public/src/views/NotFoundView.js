import { t } from '../i18n.js';

export default {
  name: 'NotFoundView',
  setup() {
    return { t };
  },
  template: `
    <main>
      <h1>{{ t('notfound.heading') }}</h1>
      <p>{{ t('notfound.text') }}</p>
      <RouterLink to="/">{{ t('nav.home') }}</RouterLink>
    </main>
  `,
};
