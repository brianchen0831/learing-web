// Quiz engine: <div id="quiz" data-quiz='[{"q":"...","options":["a","b"],"answer":0}]'></div>
(function () {
  const el = document.getElementById('quiz');
  if (!el) return;
  const questions = JSON.parse(el.dataset.quiz);
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
      input.type = 'radio'; input.name = 'q' + i; input.value = j;
      label.append(input, ' ' + opt);
      box.appendChild(label);
    });
    el.appendChild(box);
  });
  const btn = document.createElement('button');
  btn.textContent = 'Check answers';
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
    result.textContent = `Score: ${score}/${questions.length}` + (ok ? ' 🎉 Perfect!' : ' – try again!');
    try { localStorage.setItem('score:' + location.pathname, `${score}/${questions.length}`); } catch {}
  };
  el.append(btn, result);
})();
