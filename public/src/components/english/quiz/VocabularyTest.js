import { computed, onMounted, ref } from 'vue';
import FillBlankTest, { canAsk } from './fill-blank/FillBlankTest.js';
import HangmanTest, { canAsk as canPlayHangman } from './hangman/HangmanTest.js';
import WordListChecklist from './WordListChecklist.js';
import { getWordList, getWordLists } from '../../../api.js';
import { pick, t } from '../../../i18n.js';
import { saveScore } from '../../../store.js';
import { reportResult, user } from '../../../account/auth.js';
import { buildTree } from '../../../wordlistTree.js';

// Add new test types here. `canAsk` says whether a word can be used by that type,
// and `pictures` marks a type that can show a picture hint.
const TEST_TYPES = [
  { id: 'fill-blank', label: 'test.type.fillBlank', component: FillBlankTest, canAsk, pictures: true },
  { id: 'hangman', label: 'test.type.hangman', component: HangmanTest, canAsk: canPlayHangman },
];
const QUESTION_COUNTS = [10, 15, 20];

function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Vocabulary test: choose word lists and a test type, then run the test.
export default {
  name: 'VocabularyTest',
  components: { WordListChecklist },
  props: {
    slug: { type: String, required: true },
    source: { type: String, required: true }, // subtopic that holds the word lists
  },
  setup(props) {
    const lists = ref([]);
    const loaded = ref(false);
    const failed = ref(false);
    const selected = ref([]);
    const typeId = ref(TEST_TYPES[0].id);
    const pictures = ref(true);
    const count = ref('full'); // 'full', a number from QUESTION_COUNTS, or 'custom'
    const customCount = ref('');
    const words = ref(null);
    const noWords = ref(false);
    const result = ref(null);
    const completedTasks = ref([]);
    let run = null; // the lists and type of the test in progress, for the result report

    const usable = computed(() => lists.value.filter((l) => !l.invalid));
    const tree = computed(() => buildTree(usable.value));
    const activeType = computed(() => TEST_TYPES.find((type) => type.id === typeId.value));
    const questionLimit = computed(() => {
      if (count.value === 'full') return Infinity;
      return count.value === 'custom' ? Number(customCount.value) : count.value;
    });
    const canStart = computed(
      () => selected.value.length > 0 &&
        (questionLimit.value === Infinity || (Number.isInteger(questionLimit.value) && questionLimit.value >= 1)),
    );

    onMounted(async () => {
      try {
        lists.value = await getWordLists(props.source);
      } catch {
        failed.value = true;
      }
      loaded.value = true;
    });

    const selectAll = () => { selected.value = usable.value.map((l) => l.id); };
    const clearAll = () => { selected.value = []; };
    function toggle(ids, on) {
      const rest = selected.value.filter((id) => !ids.includes(id));
      selected.value = on ? [...rest, ...ids] : rest;
    }

    async function start() {
      noWords.value = false;
      result.value = null;
      try {
        const chosen = await Promise.all(selected.value.map((id) => getWordList(props.source, id)));
        const unique = new Map();
        chosen.flatMap((list) => list.words).forEach((w) => {
          const key = w.word.trim().toLowerCase();
          if (activeType.value.canAsk(w.word) && !unique.has(key)) unique.set(key, w);
        });
        if (unique.size) {
          words.value = shuffled([...unique.values()]).slice(0, questionLimit.value);
          run = { test: typeId.value, lists: [...selected.value], total: words.value.length };
          completedTasks.value = [];
        } else {
          noWords.value = true;
        }
      } catch {
        failed.value = true;
      }
    }

    async function finish(summary) {
      words.value = null;
      if (!summary.answered) return;
      result.value = summary;
      saveScore(props.slug, `${summary.score}/${summary.answered}`);
      // Logged-in users have the result saved in their account, which may complete tasks
      if (user.value && run) {
        try {
          completedTasks.value = await reportResult({
            topic: props.slug, ...run, answered: summary.answered, correct: summary.score,
          });
        } catch {}
      }
    }

    return {
      tree, usable, loaded, failed, selected, typeId, pictures, count, customCount, words, noWords, result, completedTasks, pick,
      activeType, canStart, types: TEST_TYPES, counts: QUESTION_COUNTS, selectAll, clearAll, toggle, start, finish, t,
    };
  },
  template: `
    <section class="lesson vocab-test">
      <p v-if="failed">{{ t('test.loadError') }}</p>
      <component v-else-if="words" :is="activeType.component" :words="words"
                 v-bind="activeType.pictures ? { pictures } : {}" @finish="finish" />
      <form v-else-if="loaded" novalidate @submit.prevent="start">
        <p v-if="result" class="test-result" role="status">{{ t('test.result') }}: {{ result.score }}/{{ result.answered }}</p>
        <div v-if="completedTasks.length" class="task-done" role="status">
          <p v-for="task in completedTasks" :key="task.id">
            🏆 {{ t('tasks.justDone') }} <strong>{{ pick(task.name) }}</strong>
            <span v-if="task.reward.coins">&nbsp;+{{ task.reward.coins }} {{ t('shop.coinUnit') }}</span>
          </p>
          <RouterLink to="/account/tasks">{{ t('tasks.see') }}</RouterLink>
        </div>
        <p v-if="!usable.length">{{ t('test.noLists') }}</p>
        <template v-else>
          <fieldset class="test-group">
            <legend>{{ t('test.lists') }}</legend>
            <div class="checklist-actions">
              <button type="button" class="btn-link" @click="selectAll">{{ t('test.selectAll') }}</button>
              <button type="button" class="btn-link" @click="clearAll">{{ t('test.clear') }}</button>
            </div>
            <WordListChecklist :nodes="tree" :selected="selected" @toggle="toggle" />
          </fieldset>
          <fieldset class="test-group">
            <legend>{{ t('test.type') }}</legend>
            <label v-for="type in types" :key="type.id" class="check">
              <input v-model="typeId" type="radio" name="test-type" :value="type.id">
              {{ t(type.label) }}
            </label>
          </fieldset>
          <fieldset class="test-group">
            <legend>{{ t('test.count') }}</legend>
            <div class="count-options">
              <label class="check">
                <input v-model="count" type="radio" name="test-count" value="full">
                {{ t('test.full') }}
              </label>
              <label v-for="n in counts" :key="n" class="check">
                <input v-model="count" type="radio" name="test-count" :value="n">
                {{ n }}
              </label>
              <label class="check">
                <input v-model="count" type="radio" name="test-count" value="custom">
                {{ t('test.custom') }}
              </label>
              <input v-model="customCount" class="count-custom" type="number" min="1" step="1"
                     :aria-label="t('test.customLabel')" @focus="count = 'custom'">
            </div>
          </fieldset>
          <label v-if="activeType.pictures" class="check">
            <input v-model="pictures" type="checkbox">
            {{ t('test.pictures') }}
          </label>
          <p v-if="noWords" class="wrong" role="alert">{{ t('test.noWords') }}</p>
          <button type="submit" class="btn btn-primary test-start" :disabled="!canStart">{{ t('test.start') }}</button>
        </template>
      </form>
    </section>
  `,
};
