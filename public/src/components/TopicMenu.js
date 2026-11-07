import { onBeforeUnmount, onMounted, ref } from 'vue';
import { getTopics } from '../api.js';
import { pick, t } from '../i18n.js';

// "Topics" dropdown. Closes on outside click, Escape, or choosing a topic.
export default {
  name: 'TopicMenu',
  setup() {
    const open = ref(false);
    const topics = ref([]);
    const root = ref(null);
    const button = ref(null);

    const onClick = (e) => {
      if (root.value && !root.value.contains(e.target)) open.value = false;
    };
    const onKey = (e) => {
      if (e.key === 'Escape' && open.value) {
        open.value = false;
        button.value?.focus();
      }
    };

    onMounted(async () => {
      document.addEventListener('click', onClick);
      document.addEventListener('keydown', onKey);
      try { topics.value = await getTopics(); } catch {}
    });
    onBeforeUnmount(() => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    });

    return { open, topics, root, button, pick, t };
  },
  template: `
    <div class="menu" ref="root">
      <button ref="button" type="button" class="menu-button" aria-haspopup="true"
              :aria-expanded="String(open)" @click="open = !open">
        {{ t('menu.topics') }} <span aria-hidden="true">▾</span>
      </button>
      <div v-if="open" class="menu-panel">
        <RouterLink v-for="topic in topics" :key="topic.slug" :to="'/topics/' + topic.slug" @click="open = false">
          {{ pick(topic.title) }}
        </RouterLink>
      </div>
    </div>
  `,
};
