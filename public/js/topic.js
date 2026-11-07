// Generic topic page renderer.
// A topic folder contains:
//   index.html     <main id="app" data-topic="slug">
//   content.json   { "en": {...}, "zh": {...} }  (see docs in WEB_MAP.md)
//   assets/        any depth of subfolders; files are referenced from content.json
//                  (section.image.src is relative to assets/) and listed in the
//                  "Resources" tree from /api/assets/<slug>.
(async function () {
  const app = document.getElementById('app');
  const slug = app.dataset.topic;
  const base = `/topics/${slug}`;

  let data;
  try {
    const res = await fetch(`${base}/content.json`);
    if (!res.ok) throw new Error(res.status);
    data = await res.json();
  } catch {
    app.textContent = I18N.t('topic.loadError');
    return;
  }

  let tree = [];
  try {
    const res = await fetch(`/api/assets/${slug}`);
    if (res.ok) tree = await res.json();
  } catch {}

  const el = (tag, text, cls) => {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  };
  const assetUrl = (parts) => `${base}/assets/` + parts.map(encodeURIComponent).join('/');
  const IMAGE = /\.(png|jpe?g|gif|svg|webp)$/i;

  function renderTree(entries, parents) {
    const ul = el('ul', undefined, 'tree');
    entries.forEach((e) => {
      const li = el('li');
      if (e.type === 'dir') {
        const d = el('details');
        d.open = parents.length === 0;
        d.appendChild(el('summary', `📁 ${e.name}`));
        d.appendChild(renderTree(e.children, parents.concat(e.name)));
        li.appendChild(d);
      } else {
        const a = el('a', `${IMAGE.test(e.name) ? '🖼️' : '📄'} ${e.name}`);
        a.href = assetUrl(parents.concat(e.name));
        a.target = '_blank';
        a.rel = 'noopener';
        li.append(a, el('span', ` (${(e.size / 1024).toFixed(1)} KB)`, 'badge'));
      }
      ul.appendChild(li);
    });
    return ul;
  }

  function render() {
    const c = data[I18N.lang] || data.en;
    document.title = `${c.title} – ${I18N.t('site.title')}`;
    app.innerHTML = '';

    const back = el('a', I18N.t('nav.home'), 'back');
    back.href = '/';
    app.append(back, el('h1', `${c.icon || ''} ${c.title}`.trim()));
    if (c.intro) app.appendChild(el('p', c.intro, 'intro'));

    const sections = c.sections || [];
    const hasQuiz = c.quiz && c.quiz.length;

    // Table of contents
    const toc = el('nav', undefined, 'toc');
    toc.appendChild(el('strong', I18N.t('toc.heading')));
    const tocList = el('ol');
    const addToc = (label, id) => {
      const li = el('li');
      const a = el('a', label);
      a.href = '#' + id;
      li.appendChild(a);
      tocList.appendChild(li);
    };
    sections.forEach((s, i) => addToc(s.heading, `s${i}`));
    if (tree.length) addToc(I18N.t('resources.heading'), 'resources');
    if (hasQuiz) addToc(I18N.t('quiz.heading'), 'quiz');
    toc.appendChild(tocList);
    app.appendChild(toc);

    sections.forEach((s, i) => {
      const sec = el('section', undefined, 'lesson');
      sec.id = `s${i}`;
      sec.appendChild(el('h2', s.heading));
      (s.text || []).forEach((p) => sec.appendChild(el('p', p)));
      if (s.image) {
        const fig = el('figure');
        const img = el('img');
        img.src = assetUrl(s.image.src.split('/'));
        img.alt = s.image.alt || '';
        img.loading = 'lazy';
        fig.appendChild(img);
        if (s.image.caption) fig.appendChild(el('figcaption', s.image.caption));
        sec.appendChild(fig);
      }
      if (s.list) {
        const ul = el('ul');
        s.list.forEach((li) => ul.appendChild(el('li', li)));
        sec.appendChild(ul);
      }
      if (s.code) sec.appendChild(el('pre', s.code));
      app.appendChild(sec);
    });

    if (tree.length) {
      const sec = el('section', undefined, 'lesson');
      sec.id = 'resources';
      sec.appendChild(el('h2', I18N.t('resources.heading')));
      sec.appendChild(renderTree(tree, []));
      app.appendChild(sec);
    }

    if (hasQuiz) {
      const sec = el('section', undefined, 'lesson');
      sec.id = 'quiz';
      sec.appendChild(el('h2', I18N.t('quiz.heading')));
      const quiz = el('div', undefined, 'quiz');
      sec.appendChild(quiz);
      app.appendChild(sec);
      window.renderQuiz(quiz, c.quiz, slug);
    }
  }

  render();
  window.addEventListener('langchange', render);
})();
