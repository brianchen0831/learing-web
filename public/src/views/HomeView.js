import { onMounted, ref } from 'vue';
import HomeSidebar from '../components/common/HomeSidebar.js';
import TopicCard from '../components/common/TopicCard.js';
import { getTopics } from '../api.js';
import { t } from '../i18n.js';

export default {
  name: 'HomeView',
  components: { HomeSidebar, TopicCard },
  setup() {
    const topics = ref([]);
    const failed = ref(false);
    onMounted(async () => {
      document.title = t('site.title');
      try { topics.value = await getTopics(); } catch { failed.value = true; }
    });
    return { topics, failed, t };
  },
  template: `
    <div class="home">
      <section class="hero">
        <div class="wrap">
          <h1>{{ t('home.heading') }}</h1>
          <p>{{ t('home.sub') }}</p>
        </div>
      </section>
      <main>
        <p v-if="failed" class="load-error">{{ t('home.loadError') }}</p>
        <div v-else class="home-layout">
          <HomeSidebar :topics="topics" />
          <div class="grid">
            <TopicCard v-for="topic in topics" :key="topic.slug" :topic="topic" />
          </div>
        </div>
      </main>
    </div>
  `,
};
