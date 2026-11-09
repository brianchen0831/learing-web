import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import PictureHint from '../PictureHint.js';
import { googleImagesUrl } from '../../../../api.js';
import { t } from '../../../../i18n.js';
import { canSpeak, speak } from '../../../../speech.js';

// Answers are compared without capitals, extra spaces or curly apostrophes.
const normalize = (s) => s.trim().toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');

// A word needs a letter to be heard, and the browser must be able to speak.
export const canAsk = (word) => canSpeak && /\p{L}/u.test(word);

// Test type "listening": the word is read aloud, and the student types it.
// Nothing about the word is shown until the answer is checked. Emits finish with { score, answered }.
export default {
  name: 'ListeningTest',
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
    const chinese = computed(() => {
      const meanings = current.value.meanings;
      const texts = meanings.map((m) => m.chinese).filter(Boolean);
      return [...new Set(texts.length ? texts : meanings.map((m) => m.meaning).filter(Boolean))].join('；');
    });
    const googleUrl = computed(() => googleImagesUrl(current.value.word));
    // Example sentences: only read aloud before the answer (each press reads the next one),
    // and shown in full after it
    const examples = computed(() => [...new Set(current.value.meanings.map((m) => (m.example || '').trim()).filter(Boolean))]);
    const nextExample = ref(0);

    const play = () => speak(current.value.word);
    const playSlow = () => speak(current.value.word, 0.55);
    const playExample = (i) => speak(examples.value[i], 0.85);
    function hearExample() {
      if (!examples.value.length) return;
      playExample(nextExample.value % examples.value.length);
      nextExample.value += 1;
    }

    // Each new word is read once by itself; the buttons read it again.
    onMounted(() => {
      input.value.focus();
      play();
    });
    onBeforeUnmount(() => {
      if (canSpeak) window.speechSynthesis.cancel();
    });

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
        nextExample.value = 0;
        nextTick(() => {
          input.value.focus();
          play();
        });
      } else if (typed.value.trim()) {
        correct.value = normalize(typed.value) === normalize(current.value.word);
        if (correct.value) score.value += 1;
        answered.value += 1;
        checked.value = true;
      }
    }

    return {
      index, typed, checked, correct, score, answered, input, current, chinese, googleUrl,
      examples, play, playSlow, playExample, hearExample, finish, submit, t,
    };
  },
  template: `
    <form class="listening" @submit.prevent="submit" novalidate>
      <p class="test-progress">
        {{ t('test.question') }} {{ index + 1 }} / {{ words.length }}
        <span>{{ t('quiz.score') }}: {{ score }}/{{ answered }}</span>
      </p>
      <div class="listen-buttons">
        <button type="button" class="btn listen-play" @click="play">🔊 {{ t('test.listen') }}</button>
        <button type="button" class="btn" @click="playSlow">🐢 {{ t('test.listenSlow') }}</button>
        <button type="button" class="btn" :disabled="!examples.length"
                :title="examples.length ? '' : t('test.noExample')" @click="hearExample">
          💬 {{ t('test.hearExample') }}
        </button>
      </div>
      <label class="field">
        {{ t('test.typeWord') }}
        <input ref="input" v-model="typed" type="text" :readonly="checked" maxlength="100"
               autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">
      </label>
      <p v-if="checked" :class="correct ? 'right' : 'wrong'" role="status">
        {{ correct ? t('test.correct') : t('test.incorrect') }} <strong>{{ current.word }}</strong>
      </p>
      <p v-if="checked" class="test-chinese">{{ chinese }}</p>
      <div v-if="checked && examples.length" class="listen-example">
        <p v-for="(s, i) in examples" :key="i">
          <span>{{ s }}</span>
          <button type="button" class="speak" :title="t('test.readSentence')" :aria-label="t('test.readSentence')" @click="playExample(i)">🔊</button>
        </p>
      </div>
      <a v-if="checked" class="test-google" :href="googleUrl" target="_blank" rel="noopener">{{ t('test.google') }}</a>
      <div class="test-actions">
        <button type="button" class="btn" @click="finish">{{ t('test.end') }}</button>
        <button type="submit" class="btn btn-primary" :disabled="!checked && !typed.trim()">
          {{ checked ? t('test.next') : t('test.check') }}
        </button>
      </div>
      <PictureHint v-if="pictures && checked" :word="current.word" />
    </form>
  `,
};
