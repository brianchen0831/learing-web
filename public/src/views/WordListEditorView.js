import { computed, ref, watchEffect } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import WordDialog from '../components/WordDialog.js';
import { createWordList } from '../api.js';
import { t } from '../i18n.js';

// Page for creating a word list: a name, then words added through a pop-up.
export default {
  name: 'WordListEditorView',
  components: { WordDialog },
  props: {
    slug: { type: String, required: true },
    sub: { type: String, required: true },
  },
  setup(props) {
    const router = useRouter();
    const name = ref('');
    const words = ref([]);
    const dialogOpen = ref(false);
    const editIndex = ref(-1); // -1 means a new word
    const saving = ref(false);
    const saved = ref(false);
    const error = ref('');

    const topic = computed(() => `${props.slug}/${props.sub}`);
    const backTo = computed(() => `/topics/${topic.value}`);
    const canSave = computed(() => !!name.value.trim() && words.value.length > 0 && !saving.value);
    const editing = computed(() => (editIndex.value >= 0 ? words.value[editIndex.value] : null));

    watchEffect(() => {
      document.title = `${t('editor.heading')} – ${t('site.title')}`;
    });

    function openDialog(index) {
      editIndex.value = index;
      dialogOpen.value = true;
    }
    function saveWord(word) {
      if (editIndex.value >= 0) words.value[editIndex.value] = word;
      else words.value.push(word);
      dialogOpen.value = false;
    }
    const removeWord = (i) => words.value.splice(i, 1);

    async function save() {
      saving.value = true;
      error.value = '';
      try {
        const id = await createWordList(topic.value, { title: name.value.trim(), words: words.value });
        saved.value = true;
        router.push({ path: backTo.value, query: { list: id } });
      } catch (e) {
        error.value = `${t('editor.saveError')} (${e.message})`;
      }
      saving.value = false;
    }

    onBeforeRouteLeave(() => {
      const unsaved = !saved.value && (name.value.trim() || words.value.length);
      return !unsaved || window.confirm(t('editor.leave'));
    });

    return { name, words, dialogOpen, editing, saving, error, backTo, canSave, openDialog, saveWord, removeWord, save, t };
  },
  template: `
    <main class="editor">
      <RouterLink class="back" :to="backTo">← {{ t('wordlist.lists') }}</RouterLink>
      <h1>{{ t('editor.heading') }}</h1>
      <section class="lesson">
        <label class="field">
          {{ t('editor.name') }}
          <input v-model="name" type="text" maxlength="100">
        </label>
      </section>
      <section class="lesson">
        <p v-if="!words.length" class="intro">{{ t('editor.noWords') }}</p>
        <ul v-else class="draft-words">
          <li v-for="(w, i) in words" :key="i">
            <div>
              <strong>{{ w.word }}</strong>
              <p v-for="(m, j) in w.meanings" :key="j">{{ [m.meaning, m.chinese].filter(Boolean).join(' · ') }}</p>
            </div>
            <div class="draft-actions">
              <button type="button" class="btn-link" @click="openDialog(i)">{{ t('editor.edit') }}</button>
              <button type="button" class="btn-link" @click="removeWord(i)">{{ t('editor.remove') }}</button>
            </div>
          </li>
        </ul>
        <button type="button" class="btn add-word" @click="openDialog(-1)">+ {{ t('editor.addWord') }}</button>
      </section>
      <p v-if="error" class="wrong" role="alert">{{ error }}</p>
      <button type="button" class="btn btn-primary save-list" :disabled="!canSave" @click="save">
        {{ saving ? t('editor.saving') : t('editor.save') }}
      </button>
      <WordDialog v-if="dialogOpen" :word="editing" @save="saveWord" @close="dialogOpen = false" />
    </main>
  `,
};
