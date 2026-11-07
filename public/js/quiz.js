// renderQuiz(container, questions, storageKey)
// questions: [{ q: "text", options: ["a", "b"], answer: 0 }]
window.renderQuiz = function (el, questions, storageKey) {
  const t = (k) => I18N.t(k);
  el.innerHTML = '';
  questions.forEach((item, i) => {
    const box = document.createElement('div');
    box.className = 'q';
    const title = document.createElement('p');
    title.textContent = `${i + 1}. ${item.q}`;
    box.appendChild(title);
    item.options.forEach((opt, j) => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'q' + i;
      input.value = j;
      label.append(input, ' ' + opt);
      box.appendChild(label);
    });
    el.appendChild(box);
  });
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = t('quiz.check');
  const result = document.createElement('p');
  result.setAttribute('aria-live', 'polite');
  btn.onclick = () => {
    let score = 0;
    questions.forEach((item, i) => {
      const picked = el.querySelector(`input[name=q${i}]:checked`);
      if (picked && +picked.value === item.answer) score++;
    });
    const ok = score === questions.length;
    result.className = ok ? 'right' : 'wrong';
    result.textContent = `${t('quiz.score')}: ${score}/${questions.length} ` + (ok ? t('quiz.perfect') : t('quiz.retry'));
    try { localStorage.setItem('score:' + storageKey, `${score}/${questions.length}`); } catch {}
  };
  el.append(btn, result);
};
