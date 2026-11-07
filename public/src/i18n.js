// Shared language state (English / 中文). `lang` is reactive: any component that calls
// t() / pick() in its template re-renders automatically when the language changes.
import { ref, watchEffect } from 'vue';

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
    'topic.loading': 'Loading…',
    'topic.todo': 'To be done',
    'footer.text': 'All photos are from Pexels. Details are in each assets/images/CREDITS.md.',
    'menu.topics': 'Topics',
    'toc.heading': 'In this lesson',
    'resources.heading': 'Resources',
    'notfound.heading': 'Page not found',
    'notfound.text': 'That page does not exist.',
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
    'topic.loading': '載入中…',
    'topic.todo': '待完成',
    'footer.text': '所有照片皆來自 Pexels，詳見各 assets/images/CREDITS.md。',
    'menu.topics': '主題',
    'toc.heading': '本課內容',
    'resources.heading': '學習資源',
    'notfound.heading': '找不到頁面',
    'notfound.text': '這個頁面不存在。',
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

export const lang = ref(detect());

export function setLang(next) {
  if (!UI[next]) return;
  lang.value = next;
  try { localStorage.setItem(KEY, next); } catch {}
}

export const t = (key) => UI[lang.value]?.[key] ?? UI.en[key] ?? key;

// Pick the current language from a { en, zh } object.
export const pick = (obj) => (obj ? (obj[lang.value] !== undefined ? obj[lang.value] : obj.en) : '');

watchEffect(() => {
  document.documentElement.lang = lang.value === 'zh' ? 'zh-Hant' : 'en';
});
