import { computed, ref, watch, watchEffect } from 'vue';
import TopicCard from '../components/TopicCard.js';
import TopicSection from '../components/TopicSection.js';
import AssetTree from '../components/AssetTree.js';
import QuizBlock from '../components/QuizBlock.js';
import WordList from '../components/WordList.js';
import VocabularyTest from '../components/VocabularyTest.js';
import { assetUrl, getAssets, getContent } from '../api.js';
import { lang, t } from '../i18n.js';

// Shows a topic (/topics/english) or a subtopic (/topics/english/vocabulary).
export default {
  name: 'TopicView',
  components: { TopicCard, TopicSection, AssetTree, QuizBlock, WordList, VocabularyTest },
  props: {
    slug: { type: String, required: true },
    sub: { type: String, default: '' },
  },
  setup(props) {
    const data = ref(null);
    const parent = ref(null);
    const tree = ref([]);
    const status = ref('loading'); // loading | ready | error

    const path = computed(() => (props.sub ? `${props.slug}/${props.sub}` : props.slug));

    watch(
      path,
      async (current) => {
        status.value = 'loading';
        try {
          const [content, assets, parentContent] = await Promise.all([
            getContent(current),
            getAssets(current),
            props.sub ? getContent(props.slug) : null,
          ]);
          if (current !== path.value) return; // the user already moved on
          data.value = content;
          tree.value = assets;
          parent.value = parentContent;
          status.value = 'ready';
        } catch {
          if (current === path.value) status.value = 'error';
        }
      },
      { immediate: true },
    );

    // Content for the current language (falls back to English).
    const inLang = (d) => (d ? d[lang.value] || d.en : null);
    const c = computed(() => inLang(data.value));

    watchEffect(() => {
      document.title = c.value ? `${c.value.title} – ${t('site.title')}` : t('site.title');
    });

    // Subtopics use the banner photo of their parent topic.
    const heroStyle = computed(() => ({ backgroundImage: `url("${assetUrl(props.slug, 'images/hero.jpg')}")` }));
    const sections = computed(() => (c.value && c.value.sections) || []);
    const hasQuiz = computed(() => !!(c.value && c.value.quiz && c.value.quiz.length));
    const hasLesson = computed(() => sections.value.length > 0 || hasQuiz.value);
    const subtopics = computed(() =>
      ((data.value && data.value.subtopics) || []).map((s) => ({ ...s, slug: `${path.value}/${s.slug}` })),
    );

    const isWordList = computed(() => !!data.value && data.value.view === 'wordlist');
    const testSource = computed(() => (data.value && data.value.view === 'vocabulary-test' ? data.value.source : ''));

    const backTo = computed(() => (props.sub ? `/topics/${props.slug}` : '/'));
    const backLabel = computed(() => {
      const p = inLang(parent.value);
      return props.sub && p ? `← ${p.title}` : t('nav.home');
    });

    function scrollTo(id) {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    return { path, status, c, tree, sections, hasQuiz, hasLesson, subtopics, isWordList, testSource, heroStyle, backTo, backLabel, scrollTo, t };
  },
  template: `
    <main>
      <RouterLink class="back" :to="backTo">{{ backLabel }}</RouterLink>
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
        <div v-if="subtopics.length" class="grid subtopics">
          <TopicCard v-for="s in subtopics" :key="s.slug" :topic="s" />
        </div>
        <div v-if="isWordList" class="wordlist">
          <WordList :key="path" :topic="path" />
        </div>
        <div v-else-if="testSource" class="wordlist">
          <VocabularyTest :key="path" :slug="path" :source="testSource" />
        </div>
        <section v-else-if="!hasLesson && !subtopics.length" class="lesson todo">{{ t('topic.todo') }}</section>
        <div v-if="hasLesson" class="layout">
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
              <TopicSection :slug="path" :section="s" />
            </div>
            <section v-if="tree.length" id="resources" class="lesson">
              <h2>{{ t('resources.heading') }}</h2>
              <AssetTree :slug="path" :entries="tree" />
            </section>
            <section v-if="hasQuiz" id="quiz" class="lesson">
              <h2>{{ t('quiz.heading') }}</h2>
              <QuizBlock :key="path" :slug="path" :questions="c.quiz" />
            </section>
          </div>
        </div>
      </template>
    </main>
  `,
};
