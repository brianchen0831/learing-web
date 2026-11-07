// Shared language support (English / 中文). Exposes window.I18N.
// Elements with data-i18n="key" are translated automatically.
// Pages re-render on the "langchange" event.
(function () {
  const UI = {
    en: {
      'site.title': 'Learning Web',
      'home.heading': 'Choose a topic',
      'home.sub': 'Pick a subject, read the lesson, then test yourself with the quiz.',
      'home.loadError': 'Could not load topics.',
      'home.lastScore': 'Last score',
      'nav.home': '← All topics',
      'quiz.heading': 'Quiz',
      'quiz.check': 'Check answers',
      'quiz.score': 'Score',
      'quiz.perfect': 'Perfect!',
      'quiz.retry': 'Try again!',
      'topic.loadError': 'Could not load this topic.',
      'toc.heading': 'In this lesson',
      'resources.heading': 'Resources',
    },
    zh: {
      'site.title': '學習網站',
      'home.heading': '選擇主題',
      'home.sub': '選一個科目，閱讀課程，再用小測驗檢查自己學會了沒。',
      'home.loadError': '無法載入主題。',
      'home.lastScore': '上次成績',
      'nav.home': '← 所有主題',
      'quiz.heading': '小測驗',
      'quiz.check': '檢查答案',
      'quiz.score': '得分',
      'quiz.perfect': '全對！',
      'quiz.retry': '再試一次！',
      'topic.loadError': '無法載入此主題。',
      'toc.heading': '本課內容',
      'resources.heading': '學習資源',
    },
  };
  const KEY = 'lang';

  function detect() {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && UI[saved]) return saved;
    } catch {}
    return (navigator.language || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  }

  let lang = detect();

  const I18N = {
    get lang() { return lang; },
    t(key) { return (UI[lang] && UI[lang][key]) || UI.en[key] || key; },
    // pick from a {en, zh} object
    pick(obj) { return obj ? (obj[lang] !== undefined ? obj[lang] : obj.en) : ''; },
    set(next) {
      if (!UI[next] || next === lang) return;
      lang = next;
      try { localStorage.setItem(KEY, lang); } catch {}
      apply();
      window.dispatchEvent(new Event('langchange'));
    },
  };
  window.I18N = I18N;

  function apply() {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = I18N.t(el.dataset.i18n);
    });
    document.querySelectorAll('.lang-switch button').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    });
  }

  function buildSwitch() {
    const header = document.querySelector('header');
    if (!header) return;
    const box = document.createElement('div');
    box.className = 'lang-switch';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Language');
    [['en', 'English'], ['zh', '中文']].forEach(([code, label]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.lang = code;
      b.textContent = label;
      b.onclick = () => I18N.set(code);
      box.appendChild(b);
    });
    header.appendChild(box);
  }

  buildSwitch();
  apply();
})();
