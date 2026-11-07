import { pick, t } from '../i18n.js';
import { scores } from '../store.js';

export default {
  name: 'TopicCard',
  props: { topic: { type: Object, required: true } },
  setup() {
    return { pick, t, scores };
  },
  template: `
    <RouterLink class="card" :to="'/topics/' + topic.slug">
      <div class="thumb">
        <img v-if="topic.image" :src="topic.image" alt="" loading="lazy">
      </div>
      <div class="body">
        <h2>{{ pick(topic.title) }}</h2>
        <p>{{ pick(topic.summary) }}</p>
        <span v-if="scores[topic.slug]" class="badge">{{ t('home.lastScore') }}: {{ scores[topic.slug] }}</span>
      </div>
    </RouterLink>
  `,
};
