import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { getWordList, getWordLists } from '../../../api.js';
import { pick, t } from '../../../i18n.js';
import { canSpeak, speak } from '../../../speech.js';
import { buildTree } from '../../../wordlistTree.js';
import WordListTree from './WordListTree.js';

const dictionaryUrl = (word) =>
  'https://dictionary.cambridge.org/dictionary/english/' +
  encodeURIComponent(word.trim().toLowerCase().replace(/\s+/g, '-'));

const FOLD_KEY = 'wordlist.folded';

function loadFolded() {
  try {
    return localStorage.getItem(FOLD_KEY) === '1';
  } catch {
    return false;
  }
}

// Foldable sidebar of word lists and a table of the selected one.
// The selected list is kept in the URL (?list=animals).
export default {
  name: 'WordList',
  components: { WordListTree },
  props: { topic: { type: String, required: true } },
  setup(props) {
    const route = useRoute();
    const lists = ref([]);
    const current = ref(null);
    const loaded = ref(false);
    const failed = ref(false);
    const folded = ref(loadFolded());

    function toggleFold() {
      folded.value = !folded.value;
      try {
        localStorage.setItem(FOLD_KEY, folded.value ? '1' : '0');
      } catch {}
    }

    const usable = computed(() => lists.value.filter((l) => !l.invalid));
    const tree = computed(() => buildTree(lists.value));
    const selectedId = computed(() => {
      const wanted = route.query.list;
      if (usable.value.some((l) => l.id === wanted)) return wanted;
      return usable.value.length ? usable.value[0].id : '';
    });

    onMounted(async () => {
      try {
        lists.value = await getWordLists(props.topic);
      } catch {
        failed.value = true;
      }
      loaded.value = true;
    });

    watch(selectedId, async (id) => {
      current.value = null;
      if (!id) return;
      try {
        const list = await getWordList(props.topic, id);
        if (id === selectedId.value) current.value = list;
      } catch {
        failed.value = true;
      }
    });

    const fileName = (l) => l.id.split('/').pop();
    const label = (l) =>
      l.invalid ? `${fileName(l)} (${t('wordlist.invalid')})` : `${pick(l.title) || fileName(l)} (${l.count})`;

    return { tree, usable, current, loaded, failed, folded, toggleFold, selectedId, label, dictionaryUrl, canSpeak, speak, t };
  },
  template: `
    <p v-if="failed">{{ t('wordlist.loadError') }}</p>
    <div v-else-if="loaded" class="wordlist-layout" :class="{ folded }">
      <nav class="toc wordlist-nav" :aria-label="t('wordlist.lists')">
        <div class="wordlist-nav-head">
          <strong>{{ t('wordlist.lists') }}</strong>
          <button type="button" class="fold" :aria-expanded="String(!folded)" aria-controls="wordlist-nav-body"
                  :aria-label="folded ? t('wordlist.unfold') : t('wordlist.fold')"
                  :title="folded ? t('wordlist.unfold') : t('wordlist.fold')" @click="toggleFold">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M15 6l-6 6 6 6"/>
            </svg>
          </button>
        </div>
        <div v-show="!folded" id="wordlist-nav-body">
          <WordListTree :nodes="tree" :selected-id="selectedId" :label="label" />
          <RouterLink class="btn" :to="'/topics/' + topic + '/new'">+ {{ t('wordlist.new') }}</RouterLink>
        </div>
      </nav>
      <section class="lesson">
        <p v-if="!usable.length">{{ t('wordlist.none') }}</p>
        <table v-if="current && current.words.length" class="word-table">
          <thead>
            <tr>
              <th scope="col">{{ t('wordlist.word') }}</th>
              <th scope="col">{{ t('wordlist.meaning') }}</th>
              <th scope="col">{{ t('wordlist.chinese') }}</th>
              <th scope="col">{{ t('wordlist.example') }}</th>
            </tr>
          </thead>
          <tbody v-for="(w, i) in current.words" :key="i">
            <tr v-for="(m, j) in w.meanings" :key="j">
              <td v-if="j === 0" :rowspan="w.meanings.length" :data-label="t('wordlist.word')">
                <div class="word-cell">
                  <button v-if="canSpeak" type="button" class="speak" :title="t('wordlist.speak')"
                          :aria-label="t('wordlist.speak') + ': ' + w.word" @click="speak(w.word)">
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                      <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3z"/>
                      <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/>
                    </svg>
                  </button>
                  <a :href="dictionaryUrl(w.word)" target="_blank" rel="noopener" :title="t('wordlist.lookup')">{{ w.word }}</a>
                </div>
              </td>
              <td :data-label="t('wordlist.meaning')">{{ m.meaning }}</td>
              <td :data-label="t('wordlist.chinese')">{{ m.chinese }}</td>
              <td :data-label="t('wordlist.example')">{{ m.example }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else-if="current">{{ t('wordlist.noWords') }}</p>
      </section>
    </div>
  `,
};
