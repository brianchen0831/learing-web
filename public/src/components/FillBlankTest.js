import { computed, nextTick, onMounted, ref } from 'vue';
import PictureHint from './PictureHint.js';
import { googleImagesUrl } from '../api.js';
import { t } from '../i18n.js';

const LETTER = /[\p{L}\p{N}]/u;

// Splits a word into characters, hiding every letter except the first and last.
// Spaces, hyphens and apostrophes stay visible.
export function maskWord(word) {
  const chars = [...word];
  const letters = chars.flatMap((c, i) => (LETTER.test(c) ? [i] : []));
  const first = letters[0];
  const last = letters[letters.length - 1];
  return chars.map((char, i) => ({ char, hidden: LETTER.test(char) && i !== first && i !== last }));
}

// A word needs at least one hidden letter to be a question.
export const canAsk = (word) => maskWord(word).some((c) => c.hidden);

// Test type "fill in the blank": emits finish with { score, answered }.
export default {
  name: 'FillBlankTest',
  components: { PictureHint },
  props: {
    words: { type: Array, required: true },
    pictures: { type: Boolean, default: true },
  },
  emits: ['finish'],
  setup(props, { emit }) {
    const index = ref(0);
    const typed = ref('');
    const checked = ref(false);
    const correct = ref(false);
    const score = ref(0);
    const answered = ref(0);
    const input = ref(null);

    const current = computed(() => props.words[index.value]);
    const parts = computed(() => maskWord(current.value.word));
    const missing = computed(() => parts.value.filter((p) => p.hidden).map((p) => p.char).join(''));
    const shown = computed(() => {
      const letters = [...typed.value];
      let next = 0;
      return parts.value.map((p) => {
        if (!p.hidden) return { char: p.char, blank: false };
        const char = letters[next++];
        return { char: char || '', blank: true };
      });
    });
    const chinese = computed(() => {
      const meanings = current.value.meanings;
      const texts = meanings.map((m) => m.chinese).filter(Boolean);
      return [...new Set(texts.length ? texts : meanings.map((m) => m.meaning).filter(Boolean))].join('；');
    });
    const googleUrl = computed(() => googleImagesUrl(current.value.word));

    onMounted(() => input.value.focus());

    function finish() {
      emit('finish', { score: score.value, answered: answered.value });
    }
    function submit() {
      if (checked.value) {
        if (index.value + 1 >= props.words.length) {
          finish();
          return;
        }
        index.value += 1;
        typed.value = '';
        checked.value = false;
        nextTick(() => input.value.focus());
      } else if (typed.value.trim()) {
        correct.value = typed.value.trim().toLowerCase() === missing.value.toLowerCase();
        if (correct.value) score.value += 1;
        answered.value += 1;
        checked.value = true;
      }
    }

    return { index, typed, checked, correct, score, answered, input, current, missing, shown, chinese, googleUrl, finish, submit, t };
  },
  template: `
    <form class="fill-blank" @submit.prevent="submit" novalidate>
      <p class="test-progress">
        {{ t('test.question') }} {{ index + 1 }} / {{ words.length }}
        <span>{{ t('quiz.score') }}: {{ score }}/{{ answered }}</span>
      </p>
      <p class="masked" :aria-label="t('test.maskedLabel')">
        <span v-for="(c, i) in shown" :key="i" :class="{ blank: c.blank, gap: c.char === ' ' }">{{ c.char }}</span>
      </p>
      <p class="test-chinese">{{ chinese }}</p>
      <label class="field">
        {{ t('test.typeLetters') }}
        <input ref="input" v-model="typed" type="text" :maxlength="missing.length" :readonly="checked"
               autocomplete="off" autocapitalize="off" spellcheck="false">
      </label>
      <p v-if="checked" :class="correct ? 'right' : 'wrong'" role="status">
        {{ correct ? t('test.correct') : t('test.incorrect') }} {{ current.word }}
      </p>
      <a v-if="checked" class="test-google" :href="googleUrl" target="_blank" rel="noopener">{{ t('test.google') }}</a>
      <div class="test-actions">
        <button type="button" class="btn" @click="finish">{{ t('test.end') }}</button>
        <button type="submit" class="btn btn-primary" :disabled="!checked && !typed.trim()">
          {{ checked ? t('test.next') : t('test.check') }}
        </button>
      </div>
      <PictureHint v-if="pictures" :word="current.word" />
    </form>
  `,
};
