import { computed } from 'vue';
import { hasAnswer } from './paper.js';
import { pick, t } from '../../../i18n.js';

// One question of a paper: its text and figure, the inputs for its kind of answer, and,
// once checked, only whether the answer is right and its points. The correct answer and
// the worked solution are on the Solutions page (math/solutions), not here.
// `response` is filled in place; `outcome` is null until checked.
export default {
  name: 'PaperQuestion',
  props: {
    question: { type: Object, required: true },
    section: { type: Object, required: true },
    response: { type: Object, required: true },
    outcome: { type: Object, default: null },
    figureUrl: { type: String, default: '' },
  },
  emits: ['check'],
  setup(props, { emit }) {
    const checked = computed(() => !!props.outcome);
    const ready = computed(() => hasAnswer(props.question, props.section, props.response));
    // The question text, with each ___ blank drawn as a gap
    const parts = computed(() => props.question.question.split('___'));
    function submit() {
      if (!checked.value && ready.value) emit('check');
    }
    return { checked, ready, parts, submit, pick, t };
  },
  template: `
    <form class="paper-question" novalidate @submit.prevent="submit">
      <p class="paper-text"><template v-for="(part, i) in parts" :key="i">{{ part }}<span v-if="i < parts.length - 1" class="paper-blank">＿＿＿</span></template></p>
      <img v-if="question.figure && figureUrl" class="paper-figure" :src="figureUrl" :alt="t('paper.figure')">

      <div v-if="section.type === 'choice'" class="paper-options" role="radiogroup" :aria-label="t('paper.yourAnswer')">
        <button v-for="(text, letter) in question.options" :key="letter" type="button" role="radio"
                :aria-checked="String(response.choice === letter)" :disabled="checked"
                :class="{ picked: response.choice === letter, right: checked && response.choice === letter && outcome.result === 'right', wrong: checked && response.choice === letter && outcome.result !== 'right' }"
                @click="response.choice = letter">
          <strong>({{ letter }})</strong> {{ text }}
        </button>
      </div>

      <fieldset v-else-if="response.sets" class="paper-sets">
        <legend>{{ t('paper.sets').replace('{n}', response.sets.length) }}</legend>
        <div v-for="(set, s) in response.sets" :key="s" class="paper-set">
          <span>{{ s + 1 }}.</span>
          <input v-for="(v, i) in set" :key="i" v-model="set[i]" type="text" inputmode="numeric" :readonly="checked"
                 :aria-label="t('paper.setNumber').replace('{s}', s + 1).replace('{i}', i + 1)" autocomplete="off">
        </div>
      </fieldset>

      <div v-else-if="response.fields" class="paper-fields">
        <div v-for="f in question.answer_fields" :key="f.key" class="field">
          <span>{{ pick(f.label) }}<span v-if="f.points" class="intro"> ({{ f.points }} {{ t('paper.points') }})</span></span>
          <span class="paper-answer-line">
            <template v-for="(_, i) in (Array.isArray(response.fields[f.key]) ? response.fields[f.key] : [0])" :key="i">
              <span v-if="i > 0" class="intro">{{ t('paper.and') }}</span>
              <select v-if="f.choices && Array.isArray(response.fields[f.key])" v-model="response.fields[f.key][i]" :disabled="checked" :aria-label="pick(f.label)">
                <option value="" disabled>{{ t('paper.choose') }}</option>
                <option v-for="c in f.choices" :key="c" :value="c">{{ c }}</option>
              </select>
              <select v-else-if="f.choices" v-model="response.fields[f.key]" :disabled="checked" :aria-label="pick(f.label)">
                <option value="" disabled>{{ t('paper.choose') }}</option>
                <option v-for="c in f.choices" :key="c" :value="c">{{ c }}</option>
              </select>
              <input v-else-if="Array.isArray(response.fields[f.key])" v-model="response.fields[f.key][i]" type="text" :readonly="checked" autocomplete="off" :aria-label="pick(f.label)">
              <input v-else v-model="response.fields[f.key]" type="text" :readonly="checked" autocomplete="off" :aria-label="pick(f.label)">
              <span v-if="f.unit">{{ f.unit }}</span>
            </template>
          </span>
        </div>
      </div>

      <label v-else class="field">
        {{ t('paper.yourAnswer') }}
        <span class="paper-answer-line">
          <input v-model="response.text" type="text" :readonly="checked" autocomplete="off">
          <span v-if="question.unit">{{ question.unit }}</span>
        </span>
      </label>

      <label v-if="section.show_working" class="field paper-working">
        {{ t('paper.working') }}
        <textarea v-model="response.working" rows="4" :readonly="checked"></textarea>
      </label>

      <div v-if="checked" class="paper-outcome">
        <p :class="outcome.result === 'right' ? 'right' : 'wrong'" role="status">
          {{ t('paper.' + outcome.result) }} {{ outcome.points }} / {{ outcome.max }} {{ t('paper.points') }}
        </p>
        <p v-if="section.show_working" class="intro">{{ t('paper.workingNote') }}</p>
      </div>
      <button v-else type="submit" class="btn btn-primary paper-check" :disabled="!ready">{{ t('test.check') }}</button>
    </form>
  `,
};
