// Checking answers to quiz-paper questions (format: public/topics/math/DESIGN.md).

// Text as typed, made comparable: no spaces, full-width digits and letters as plain ones,
// and a trailing unit dropped ("207 元" is the same as "207").
export function normalize(text, unit = '') {
  let s = String(text ?? '')
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, '')
    .toLowerCase();
  if (unit && s.endsWith(unit.toLowerCase())) s = s.slice(0, -unit.length);
  return s;
}

const sameSet = (a, b) => a.length === b.length && [...a].sort().join(',') === [...b].sort().join(',');

// An answer field with `count` above 1 takes that many values, in any order.
const many = (f) => (f.count || 1) > 1;

// An empty response for a question, in the shape its inputs fill in.
export function emptyResponse(question, section) {
  if (section.type === 'choice') return { choice: '' };
  if (question.answer_sets) return { sets: question.answer_sets.map((s) => s.map(() => '')), working: '' };
  if (question.answer_fields) {
    return { fields: Object.fromEntries(question.answer_fields.map((f) => [f.key, many(f) ? Array(f.count).fill('') : ''])), working: '' };
  }
  return { text: '', working: '' };
}

const filled = (v) => [].concat(v).some((x) => String(x).trim());

// Whether something has been answered, so Check can be pressed.
export function hasAnswer(question, section, r) {
  if (section.type === 'choice') return !!r.choice;
  if (r.sets) return r.sets.some((set) => set.some((v) => String(v).trim()));
  if (r.fields) return Object.values(r.fields).every(filled);
  return !!String(r.text).trim();
}

// How one answer field went: { right, found } where found counts the expected values typed.
function checkField(f, expected, typed) {
  const want = [].concat(expected).map((v) => normalize(v, f.unit));
  const got = [...new Set([].concat(typed).map((v) => normalize(v, f.unit)).filter(Boolean))];
  const found = want.filter((w) => got.includes(w)).length;
  return { right: found === want.length && got.length === want.length, found };
}

// { points, max, result: 'right' | 'partial' | 'wrong' } for a response.
export function check(question, section, r) {
  const max = section.points_each || 0;
  let points = 0;
  if (section.type === 'choice') {
    // A question marked free (送分) scores for any answer
    points = r.choice && (question.free || r.choice === question.answer) ? max : 0;
  } else if (question.answer_sets) {
    // Each set is found when one of the typed groups holds the same numbers, in any order
    const typed = r.sets.map((set) => set.map((v) => normalize(v)).filter(Boolean));
    const found = question.answer_sets.filter((answer) => typed.some((group) => sameSet(group, answer.map((v) => normalize(v))))).length;
    const each = question.scoring?.find((s) => s.each)?.points || 0;
    points = found === question.answer_sets.length ? max : Math.min(max, found * each);
  } else if (question.answer_fields) {
    // All fields right: full points. Otherwise, when fields carry `points` (a question in
    // parts), each right field scores its points, and a field with `each` scores that
    // much per expected value found.
    let got = 0;
    let all = true;
    question.answer_fields.forEach((f) => {
      const { right, found } = checkField(f, question.answer[f.key], r.fields[f.key]);
      if (right) got += f.points || 0;
      else {
        all = false;
        got += (f.each || 0) * found;
      }
    });
    points = all ? max : Math.min(max, got);
  } else {
    points = normalize(r.text, question.unit) === normalize(question.answer, question.unit) ? max : 0;
  }
  return { points, max, result: points === max ? 'right' : points > 0 ? 'partial' : 'wrong' };
}

// The correct answer as text, for showing after checking.
export function answerText(question, section) {
  if (question.answer_text) return question.answer_text;
  if (section.type === 'choice') return `(${question.answer}) ${question.options?.[question.answer] ?? ''}`.trim();
  return `${question.answer}${question.unit ? ' ' + question.unit : ''}`;
}
