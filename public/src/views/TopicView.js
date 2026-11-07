import { computed, ref, watch, watchEffect } from 'vue';
import TopicSection from '../components/TopicSection.js';
import AssetTree from '../components/AssetTree.js';
import QuizBlock from '../components/QuizBlock.js';
import { assetUrl, getAssets, getContent } from '../api.js';
import { lang, t } from '../i18n.js';

export default {
  name: 'TopicView',
  components: { TopicSection, AssetTree, QuizBlock },
  props: { slug: { type: String, required: true } },
  setup(props) {
    const data = ref(null);
    const tree = ref([]);
    const status = ref('loading'); // loading | ready | error

    watch(
      () => props.slug,
      async (slug) => {
        status.value = 'loading';
        try {
          const [content, assets] = await Promise.all([getContent(slug), getAssets(slug)]);
          data.value = content;
          tree.value = assets;
          status.value = 'ready';
        } catch {
          status.value = 'error';
        }
      },
      { immediate: true },
    );

    // Content for the current language (falls back to English).
    const c = computed(() => (data.value ? data.value[lang.value] || data.value.en : null));

    watchEffect(() => {
      document.title = c.value ? `${c.value.title} – ${t('site.title')}` : t('site.title');
    });

    const heroStyle = computed(() => ({ backgroundImage: `url("${assetUrl(props.slug, 'images/hero.jpg')}")` }));
    const sections = computed(() => (c.value && c.value.sections) || []);
    const hasQuiz = computed(() => !!(c.value && c.value.quiz && c.value.quiz.length));

    function scrollTo(id) {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    return { status, c, tree, sections, hasQuiz, heroStyle, scrollTo, t };
  },
  template: `
    <main>
      <RouterLink class="back" to="/">{{ t('nav.home') }}</RouterLink>
      <p v-if="status === 'loading'">{{ t('topic.loading') }}</p>
      <p v-else-if="status === 'error'">{{ t('topic.loadError') }}</p>
      <template v-else>
        <div class="topic-hero">
          <div class="topic-hero-bg" :style="heroStyle"></div>
          <div class="topic-hero-text">
            <h1>{{ c.title }}</h1>
            <p v-if="c.intro">{{ c.intro }}</p>
          </div>
        </div>
        <section v-if="!sections.length && !hasQuiz" class="lesson todo">{{ t('topic.todo') }}</section>
        <div v-else class="layout">
          <nav class="toc">
            <strong>{{ t('toc.heading') }}</strong>
            <ol>
              <li v-for="(s, i) in sections" :key="i">
                <a :href="'#s' + i" @click.prevent="scrollTo('s' + i)">{{ s.heading }}</a>
              </li>
              <li v-if="tree.length"><a href="#resources" @click.prevent="scrollTo('resources')">{{ t('resources.heading') }}</a></li>
              <li v-if="hasQuiz"><a href="#quiz" @click.prevent="scrollTo('quiz')">{{ t('quiz.heading') }}</a></li>
            </ol>
          </nav>
          <div class="content">
            <div v-for="(s, i) in sections" :id="'s' + i" :key="i" class="anchor">
              <TopicSection :slug="slug" :section="s" />
            </div>
            <section v-if="tree.length" id="resources" class="lesson">
              <h2>{{ t('resources.heading') }}</h2>
              <AssetTree :slug="slug" :entries="tree" />
            </section>
            <section v-if="hasQuiz" id="quiz" class="lesson">
              <h2>{{ t('quiz.heading') }}</h2>
              <QuizBlock :slug="slug" :questions="c.quiz" />
            </section>
          </div>
        </div>
      </template>
    </main>
  `,
};
