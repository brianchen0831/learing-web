import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import PictureHint from './PictureHint.js';
import { googleImagesUrl } from '../api.js';
import { t } from '../i18n.js';

const MAX_WRONG = 6;
const ALPHABET = [...'abcdefghijklmnopqrstuvwxyz'];
const isGuessable = (char) => ALPHABET.includes(char.toLowerCase());

// A word needs at least two letters A-Z to be a round.
export const canAsk = (word) => [...word].filter(isGuessable).length >= 2;

// Test type "hangman": guess the word letter by letter with no hints, and six
// wrong guesses allowed. The meaning and picture appear after the round.
// Emits finish with { score, answered }.
export default {
  name: 'HangmanTest',
  components: { PictureHint },
  props: { words: { type: Array, required: true } },
  emits: ['finish'],
  setup(props, { emit }) {
    const index = ref(0);
    const guessed = ref([]);
    const score = ref(0);
    const answered = ref(0);

    const current = computed(() => props.words[index.value]);
    const chars = computed(() => [...current.value.word]);
    const inWord = (letter) => chars.value.some((c) => c.toLowerCase() === letter);
    const wrong = computed(() => guessed.value.filter((letter) => !inWord(letter)).length);
    const won = computed(() =>
      chars.value.filter(isGuessable).every((c) => guessed.value.includes(c.toLowerCase())),
    );
    const lost = computed(() => wrong.value >= MAX_WRONG);
    const over = computed(() => won.value || lost.value);
    const shown = computed(() =>
      chars.value.map((char) => {
        const hidden = isGuessable(char) && !guessed.value.includes(char.toLowerCase()) && !lost.value;
        return { char: hidden ? '' : char, blank: isGuessable(char) };
      }),
    );
    const chinese = computed(() => {
      const meanings = current.value.meanings;
      const texts = meanings.map((m) => m.chinese).filter(Boolean);
      return [...new Set(texts.length ? texts : meanings.map((m) => m.meaning).filter(Boolean))].join('；');
    });
    const googleUrl = computed(() => googleImagesUrl(current.value.word));

    const letterState = (letter) => {
      if (!guessed.value.includes(letter)) return '';
      return inWord(letter) ? 'hit' : 'miss';
    };

    function guess(letter) {
      if (over.value || guessed.value.includes(letter)) return;
      guessed.value.push(letter);
      if (over.value) {
        answered.value += 1;
        if (won.value) score.value += 1;
      }
    }
    function finish() {
      emit('finish', { score: score.value, answered: answered.value });
    }
    function next() {
      if (index.value + 1 >= props.words.length) {
        finish();
        return;
      }
      index.value += 1;
      guessed.value = [];
    }
    function onKey(event) {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      const key = event.key.toLowerCase();
      if (ALPHABET.includes(key)) {
        guess(key);
      } else if (key === 'enter' && over.value && !['BUTTON', 'A'].includes(event.target.tagName)) {
        next();
      }
    }
    onMounted(() => window.addEventListener('keydown', onKey));
    onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

    return {
      alphabet: ALPHABET, maxWrong: MAX_WRONG, index, score, answered, current, wrong, won, lost, over,
      shown, chinese, googleUrl, letterState, guess, next, finish, t,
    };
  },
  template: `
    <div class="hangman">
      <p class="test-progress">
        {{ t('test.question') }} {{ index + 1 }} / {{ words.length }}
        <span>{{ t('quiz.score') }}: {{ score }}/{{ answered }}</span>
      </p>
      <svg class="hangman-figure" viewBox="0 0 120 130" role="img"
           :aria-label="t('test.wrongLeft') + ': ' + (maxWrong - wrong)">
        <g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
          <path d="M10 125h70M30 125V8h52v14"/>
          <circle v-if="wrong >= 1" cx="82" cy="33" r="11"/>
          <path v-if="wrong >= 2" d="M82 44v38"/>
          <path v-if="wrong >= 3" d="M82 54L66 70"/>
          <path v-if="wrong >= 4" d="M82 54l16 16"/>
          <path v-if="wrong >= 5" d="M82 82l-14 22"/>
          <path v-if="wrong >= 6" d="M82 82l14 22"/>
        </g>
      </svg>
      <p class="hangman-left">{{ t('test.wrongLeft') }}: {{ maxWrong - wrong }}</p>
      <p class="masked" :aria-label="t('test.maskedLabel')">
        <span v-for="(c, i) in shown" :key="i" :class="{ blank: c.blank, gap: c.char === ' ' }">{{ c.char }}</span>
      </p>
      <p v-if="over" class="test-chinese">{{ chinese }}</p>
      <div class="letters" role="group" :aria-label="t('test.letters')">
        <button v-for="letter in alphabet" :key="letter" type="button" :class="letterState(letter)"
                :disabled="over || !!letterState(letter)" @click="guess(letter)">{{ letter }}</button>
      </div>
      <p v-if="over" :class="won ? 'right' : 'wrong'" role="status">
        {{ won ? t('test.correct') + ' ' + current.word : t('test.incorrect') + ' ' + current.word }}
      </p>
      <a v-if="over" class="test-google" :href="googleUrl" target="_blank" rel="noopener">{{ t('test.google') }}</a>
      <div class="test-actions">
        <button type="button" class="btn" @click="finish">{{ t('test.end') }}</button>
        <button type="button" class="btn btn-primary" :disabled="!over" @click="next">{{ t('test.next') }}</button>
      </div>
      <PictureHint v-if="over" :word="current.word" />
    </div>
  `,
};
