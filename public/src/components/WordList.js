import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { getWordList, getWordLists } from '../api.js';
import { pick, t } from '../i18n.js';

const dictionaryUrl = (word) =>
  'https://dictionary.cambridge.org/dictionary/english/' +
  encodeURIComponent(word.trim().toLowerCase().replace(/\s+/g, '-'));

// Sidebar of word lists and a table of the selected one.
// The selected list is kept in the URL (?list=animals).
export default {
  name: 'WordList',
  props: { topic: { type: String, required: true } },
  setup(props) {
    const route = useRoute();
    const lists = ref([]);
    const current = ref(null);
    const loaded = ref(false);
    const failed = ref(false);

    const usable = computed(() => lists.value.filter((l) => !l.invalid));
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

    const label = (l) =>
      l.invalid ? `${l.id} (${t('wordlist.invalid')})` : `${pick(l.title) || l.id} (${l.count})`;

    return { lists, usable, current, loaded, failed, selectedId, label, dictionaryUrl, t };
  },
  template: `
    <p v-if="failed">{{ t('wordlist.loadError') }}</p>
    <div v-else-if="loaded" class="wordlist-layout">
      <nav class="toc wordlist-nav" :aria-label="t('wordlist.lists')">
        <strong>{{ t('wordlist.lists') }}</strong>
        <ul>
          <li v-for="l in lists" :key="l.id">
            <span v-if="l.invalid" class="list-invalid">{{ label(l) }}</span>
            <RouterLink v-else :to="{ query: { list: l.id } }" :class="{ selected: l.id === selectedId }"
                        :aria-current="l.id === selectedId ? 'true' : null">{{ label(l) }}</RouterLink>
          </li>
        </ul>
        <RouterLink class="btn" :to="'/topics/' + topic + '/new'">+ {{ t('wordlist.new') }}</RouterLink>
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
                <a :href="dictionaryUrl(w.word)" target="_blank" rel="noopener" :title="t('wordlist.lookup')">{{ w.word }}</a>
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
