import { reactive, ref } from 'vue';
import { t } from '../../i18n.js';
import { saveScore } from '../../store.js';

// questions: [{ q, options: [], answer: <index> }]
export default {
  name: 'QuizBlock',
  props: {
    slug: { type: String, required: true },
    questions: { type: Array, required: true },
  },
  setup(props) {
    const picked = reactive({}); // question index -> option index
    const checked = ref(false);
    const score = ref(0);

    function check() {
      score.value = props.questions.filter((item, i) => picked[i] === item.answer).length;
      checked.value = true;
      saveScore(props.slug, `${score.value}/${props.questions.length}`);
    }
    // Only options the student chose are marked, so a retry does not reveal the answers.
    function state(i, j) {
      if (!checked.value || picked[i] !== j) return '';
      return j === props.questions[i].answer ? 'correct' : 'incorrect';
    }
    return { picked, checked, score, check, state, t };
  },
  template: `
    <div class="quiz">
      <div class="q" v-for="(item, i) in questions" :key="i">
        <p>{{ i + 1 }}. {{ item.q }}</p>
        <label v-for="(opt, j) in item.options" :key="j" :class="state(i, j)">
          <input type="radio" :name="'q' + i" :value="j" v-model="picked[i]" @change="checked = false">
          {{ opt }}
        </label>
      </div>
      <button type="button" @click="check">{{ t('quiz.check') }}</button>
      <p v-if="checked" :class="score === questions.length ? 'right' : 'wrong'" aria-live="polite">
        {{ t('quiz.score') }}: {{ score }}/{{ questions.length }}
        {{ score === questions.length ? t('quiz.perfect') : t('quiz.retry') }}
      </p>
    </div>
  `,
};
