import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import FolderTree from '../../common/FolderTree.js';
import { answerText } from '../quiz/paper.js';
import { getPaper, getPapers, paperFileUrl } from '../../../api.js';
import { pick, t } from '../../../i18n.js';
import { buildTree } from '../../../wordlistTree.js';

// Worked solutions (解析) of the quiz papers: a sidebar of the papers in their folders, as
// they are in the database (such as grade2 › imc › paper), and every question of the
// selected paper with its answer and solution. The paper is kept in the URL (?paper=<id>).
export default {
  name: 'PaperSolutions',
  components: { FolderTree },
  props: { source: { type: String, required: true } }, // database folder with the papers, such as math/quiz
  setup(props) {
    const route = useRoute();
    const papers = ref([]);
    const paper = ref(null);
    const loaded = ref(false);
    const failed = ref(false);

    const usable = computed(() => papers.value.filter((p) => !p.invalid));
    const tree = computed(() => buildTree(papers.value));
    const selectedId = computed(() => {
      const wanted = route.query.paper;
      if (usable.value.some((p) => p.id === wanted)) return wanted;
      return usable.value.length ? usable.value[0].id : '';
    });

    onMounted(async () => {
      try { papers.value = await getPapers(props.source); } catch { failed.value = true; }
      loaded.value = true;
    });
    watch(selectedId, async (id) => {
      paper.value = null;
      if (!id) return;
      try {
        const data = await getPaper(props.source, id);
        if (id === selectedId.value) paper.value = data;
      } catch {
        failed.value = true;
      }
    });

    const folder = computed(() => (selectedId.value.includes('/') ? selectedId.value.slice(0, selectedId.value.lastIndexOf('/') + 1) : ''));
    const figureUrl = (q) => paperFileUrl(props.source, folder.value + q.figure);
    const label = (p) => (p.invalid ? `${p.id.split('/').pop()} (${t('wordlist.invalid')})` : pick(p.title) || p.id.split('/').pop());
    const blanks = (text) => text.split('___');

    return { tree, usable, paper, loaded, failed, selectedId, figureUrl, label, blanks, answerText, pick, t };
  },
  template: `
    <p v-if="failed">{{ t('paper.loadError') }}</p>
    <div v-else-if="loaded" class="wordlist-layout paper-solutions">
      <nav class="toc wordlist-nav" :aria-label="t('paper.papers')">
        <div class="wordlist-nav-head"><strong>{{ t('paper.papers') }}</strong></div>
        <FolderTree :nodes="tree" :selected-id="selectedId" :label="label" query-key="paper" />
      </nav>
      <section class="lesson">
        <p v-if="!usable.length">{{ t('paper.none') }}</p>
        <template v-if="paper">
          <h2 class="paper-title">{{ pick(paper.title) }}</h2>
          <p class="intro">
            {{ paper.total_points }} {{ t('paper.points') }}<template v-if="paper.time_limit_minutes"> · {{ t('paper.minutes').replace('{n}', paper.time_limit_minutes) }}</template>
          </p>
          <div v-for="section in paper.sections" :key="section.id" class="solution-section">
            <h3>{{ pick(section.title) }} <span class="intro">· {{ t('paper.eachPoints').replace('{n}', section.points_each) }}</span></h3>
            <article v-for="q in section.questions" :key="q.id" :id="q.id" class="solution-item">
              <p class="paper-text"><strong>{{ q.number }}.</strong> <template v-for="(part, i) in blanks(q.question)" :key="i">{{ part }}<span v-if="i < blanks(q.question).length - 1" class="paper-blank">＿＿＿</span></template></p>
              <img v-if="q.figure" class="paper-figure" :src="figureUrl(q)" :alt="t('paper.figure')" loading="lazy">
              <ol v-if="q.options" class="solution-options">
                <li v-for="(text, letter) in q.options" :key="letter" :class="{ right: letter === q.answer }">({{ letter }}) {{ text }}</li>
              </ol>
              <p class="solution-answer"><strong>{{ t('paper.answer') }}</strong> {{ answerText(q, section) }}</p>
              <p v-if="q.note" class="solution-note">{{ q.note }}</p>
              <div class="paper-solution">
                <strong>{{ t('paper.solution') }}</strong>
                <p v-for="(line, i) in q.solution" :key="i">{{ line }}</p>
                <img v-if="q.solution_figure" class="paper-figure" :src="figureUrl({ figure: q.solution_figure })" :alt="t('paper.solutionFigure')" loading="lazy">
              </div>
            </article>
          </div>
        </template>
      </section>
    </div>
  `,
};
