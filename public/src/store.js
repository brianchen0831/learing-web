// Last quiz score per topic, shared between pages and remembered in the browser.
import { reactive } from 'vue';

const PREFIX = 'score:';

function load() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(PREFIX)) out[key.slice(PREFIX.length)] = localStorage.getItem(key);
    }
  } catch {}
  return out;
}

export const scores = reactive(load());

export function saveScore(slug, value) {
  scores[slug] = value;
  try { localStorage.setItem(PREFIX + slug, value); } catch {}
}
