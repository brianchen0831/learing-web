import { onMounted, reactive, ref } from 'vue';
import { t } from '../../../i18n.js';

const emptyMeaning = () => ({ meaning: '', chinese: '', example: '' });

// Pop-up window for adding or editing one word. Each meaning has its own
// English, Chinese and example fields; + adds another meaning.
export default {
  name: 'WordDialog',
  props: { word: { type: Object, default: null } },
  emits: ['save', 'close'],
  setup(props, { emit }) {
    const dialog = ref(null);
    const error = ref('');
    const draft = reactive({
      word: props.word ? props.word.word : '',
      meanings: props.word ? props.word.meanings.map((m) => ({ ...m })) : [emptyMeaning()],
    });

    onMounted(() => dialog.value.showModal());

    const addMeaning = () => draft.meanings.push(emptyMeaning());
    const removeMeaning = (i) => draft.meanings.splice(i, 1);

    function submit() {
      const word = draft.word.trim();
      const meanings = draft.meanings
        .map((m) => ({ meaning: m.meaning.trim(), chinese: m.chinese.trim(), example: m.example.trim() }))
        .filter((m) => m.meaning || m.chinese || m.example);
      if (!word) {
        error.value = t('dialog.needWord');
      } else if (!meanings.length) {
        error.value = t('dialog.needMeaning');
      } else {
        emit('save', { word, meanings });
      }
    }

    return { dialog, draft, error, addMeaning, removeMeaning, submit, emit, t };
  },
  template: `
    <dialog ref="dialog" class="word-dialog" @close="emit('close')">
      <form @submit.prevent="submit" novalidate>
        <h2>{{ word ? t('dialog.editTitle') : t('dialog.addTitle') }}</h2>
        <label class="field">
          {{ t('wordlist.word') }}
          <input v-model="draft.word" type="text" maxlength="100" autofocus>
        </label>
        <fieldset v-for="(m, i) in draft.meanings" :key="i" class="meaning-group">
          <legend>{{ t('wordlist.meaning') }} {{ i + 1 }}</legend>
          <button v-if="draft.meanings.length > 1" type="button" class="btn-link meaning-remove"
                  @click="removeMeaning(i)">{{ t('editor.remove') }}</button>
          <label class="field">
            {{ t('dialog.english') }}
            <input v-model="m.meaning" type="text" maxlength="500">
          </label>
          <label class="field">
            {{ t('wordlist.chinese') }}
            <input v-model="m.chinese" type="text" maxlength="500">
          </label>
          <label class="field">
            {{ t('wordlist.example') }}
            <input v-model="m.example" type="text" maxlength="500">
          </label>
        </fieldset>
        <button type="button" class="btn add-meaning" @click="addMeaning">+ {{ t('dialog.addMeaning') }}</button>
        <p v-if="error" class="wrong" role="alert">{{ error }}</p>
        <div class="dialog-actions">
          <button type="button" class="btn" @click="dialog.close()">{{ t('dialog.cancel') }}</button>
          <button type="submit" class="btn btn-primary">{{ t('dialog.done') }}</button>
        </div>
      </form>
    </dialog>
  `,
};
