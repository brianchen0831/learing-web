import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import FolderTree from '../../common/FolderTree.js';
import PaperQuestion from './PaperQuestion.js';
import { check, emptyResponse } from './paper.js';
import { getPaper, getPapers, paperFileUrl } from '../../../api.js';
import { pick, t } from '../../../i18n.js';
import { saveScore } from '../../../store.js';
import { buildTree } from '../../../wordlistTree.js';

// A quiz page for whole papers from the database (such as math/quiz): pick a paper in the
// folder tree (the same folders as in the database; the pick is kept in the URL as ?paper=),
// then answer it one question per page. Numbered page buttons jump to any question. Each answer
// is checked when the student presses Check; Finish shows the points for each section.
export default {
  name: 'PaperQuiz',
  components: { FolderTree, PaperQuestion },
  props: {
    slug: { type: String, required: true },   // this page, such as math/quiz
    source: { type: String, required: true }, // the database folder with the papers
  },
  setup(props) {
    const route = useRoute();
    const papers = ref(null);
    const failed = ref(false);
    const paper = ref(null);   // the paper being answered
    const paperId = ref('');
    const items = ref([]);     // one per question: { section, question, response, outcome }
    const index = ref(0);
    const finished = ref(false);

    onMounted(async () => {
      try { papers.value = await getPapers(props.source); } catch { failed.value = true; }
    });

    // The papers as a folder tree, and the one picked in it (?paper=<id>)
    const usable = computed(() => (papers.value || []).filter((p) => !p.invalid));
    const tree = computed(() => buildTree(papers.value || []));
    const chosen = computed(() => usable.value.find((p) => p.id === route.query.paper) || null);
    const label = (p) => (p.invalid ? `${p.id.split('/').pop()} (${t('wordlist.invalid')})` : pick(p.title) || p.id.split('/').pop());

    async function start(id) {
      failed.value = false;
      try {
        const data = await getPaper(props.source, id);
        items.value = data.sections.flatMap((section) => section.questions.map((question) => ({
          section, question, response: reactive(emptyResponse(question, section)), outcome: null,
        })));
        paper.value = data;
        paperId.value = id;
        index.value = 0;
        finished.value = false;
      } catch {
        failed.value = true;
      }
    }
    function leave() {
      paper.value = null;
      finished.value = false;
    }

    const current = computed(() => items.value[index.value]);
    const figureUrl = computed(() => {
      const q = current.value?.question;
      if (!q?.figure) return '';
      const folder = paperId.value.includes('/') ? paperId.value.slice(0, paperId.value.lastIndexOf('/') + 1) : '';
      return paperFileUrl(props.source, folder + q.figure);
    });
    const earned = computed(() => items.value.reduce((sum, it) => sum + (it.outcome?.points || 0), 0));
    const total = computed(() => items.value.reduce((sum, it) => sum + (it.section.points_each || 0), 0));
    const checkedCount = computed(() => items.value.filter((it) => it.outcome).length);
    const bySection = computed(() => (paper.value ? paper.value.sections.map((section) => {
      const own = items.value.filter((it) => it.section === section);
      return {
        section,
        earned: own.reduce((sum, it) => sum + (it.outcome?.points || 0), 0),
        total: own.length * (section.points_each || 0),
        right: own.filter((it) => it.outcome?.result === 'right').length,
        count: own.length,
      };
    }) : []));

    function checkCurrent() {
      const it = current.value;
      it.outcome = check(it.question, it.section, it.response);
    }
    const go = (i) => {
      index.value = Math.max(0, Math.min(items.value.length - 1, i));
      finished.value = false;
    };
    function finish() {
      finished.value = true;
      saveScore(props.slug, `${earned.value}/${total.value}`);
    }
    function retry() {
      start(paperId.value);
    }
    const status = (it) => (it.outcome ? it.outcome.result : '');

    return {
      papers, failed, paper, items, index, finished, usable, tree, chosen, label, current, figureUrl, earned, total, checkedCount, bySection,
      start, leave, checkCurrent, go, finish, retry, status, pick, t,
    };
  },
  template: `
    <section class="lesson paper-quiz">
      <p v-if="failed" class="wrong" role="alert">{{ t('paper.loadError') }}</p>

      <template v-if="!paper">
        <p v-if="papers && !usable.length" class="intro">{{ t('paper.none') }}</p>
        <div v-else-if="papers" class="paper-picker">
          <nav class="wordlist-nav paper-tree" :aria-label="t('paper.papers')">
            <strong>{{ t('paper.papers') }}</strong>
            <FolderTree :nodes="tree" :selected-id="chosen ? chosen.id : ''" :label="label" query-key="paper" />
          </nav>
          <div class="paper-chosen">
            <template v-if="chosen">
              <h2>{{ pick(chosen.title) || chosen.id }}</h2>
              <p class="intro">
                {{ t('paper.questionCount').replace('{n}', chosen.questions) }} · {{ chosen.points }} {{ t('paper.points') }}<template v-if="chosen.minutes"> · {{ t('paper.minutes').replace('{n}', chosen.minutes) }}</template>
              </p>
              <button type="button" class="btn btn-primary" @click="start(chosen.id)">{{ t('test.start') }}</button>
            </template>
            <p v-else class="intro">{{ t('paper.pickPaper') }}</p>
          </div>
        </div>
      </template>

      <template v-else-if="finished">
        <h2>{{ pick(paper.title) }}</h2>
        <p class="test-result" role="status">{{ t('test.result') }}: {{ earned }} / {{ total }} {{ t('paper.points') }}</p>
        <table class="paper-results">
          <thead><tr><th>{{ t('paper.section') }}</th><th>{{ t('paper.rightCount') }}</th><th>{{ t('paper.points') }}</th></tr></thead>
          <tbody>
            <tr v-for="s in bySection" :key="s.section.id">
              <td>{{ pick(s.section.title) }}</td><td>{{ s.right }} / {{ s.count }}</td><td>{{ s.earned }} / {{ s.total }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="checkedCount < items.length" class="intro">{{ t('paper.unanswered').replace('{n}', items.length - checkedCount) }}</p>
        <div class="test-actions">
          <button type="button" class="btn" @click="leave">{{ t('paper.otherPaper') }}</button>
          <button type="button" class="btn" @click="go(0)">{{ t('paper.review') }}</button>
          <button type="button" class="btn btn-primary" @click="retry">{{ t('paper.again') }}</button>
        </div>
      </template>

      <template v-else>
        <p class="test-progress">
          <span>{{ pick(current.section.title) }} · {{ t('test.question') }} {{ index + 1 }} / {{ items.length }}</span>
          <span>{{ t('quiz.score') }}: {{ earned }} / {{ total }}</span>
        </p>
        <nav class="pager paper-pages" :aria-label="t('paper.pages')">
          <button v-for="(it, i) in items" :key="i" type="button" class="btn pager-num" :class="status(it)"
                  :aria-current="i === index ? 'page' : null" :title="pick(it.section.title) + ' ' + it.question.number" @click="go(i)">{{ i + 1 }}</button>
        </nav>
        <PaperQuestion :key="index" :question="current.question" :section="current.section" :response="current.response"
                       :outcome="current.outcome" :figure-url="figureUrl" @check="checkCurrent" />
        <div class="test-actions">
          <button type="button" class="btn" :disabled="index === 0" @click="go(index - 1)">‹ {{ t('tasks.prev') }}</button>
          <button type="button" class="btn" @click="finish">{{ t('paper.finish') }}</button>
          <button type="button" class="btn btn-primary" :disabled="index === items.length - 1" @click="go(index + 1)">{{ t('tasks.next') }} ›</button>
        </div>
      </template>
    </section>
  `,
};
