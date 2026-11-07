import { pick, t } from '../i18n.js';
import { scores } from '../store.js';

// Home page sidebar: topic links with last scores.
export default {
  name: 'HomeSidebar',
  props: { topics: { type: Array, required: true } },
  setup() {
    return { scores, pick, t };
  },
  template: `
    <aside class="sidebar">
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
