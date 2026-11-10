// Site-wide sidebar state, shared by the header (menu button on narrow screens) and the sidebar.
import { ref, watch } from 'vue';

const FOLD_KEY = 'sitenav.folded';

function loadFolded() {
  try {
    return localStorage.getItem(FOLD_KEY) === '1';
  } catch {
    return false;
  }
}

// Wide screens: the sidebar can be folded to a thin strip, remembered in the browser.
export const navFolded = ref(loadFolded());
watch(navFolded, (value) => {
  try { localStorage.setItem(FOLD_KEY, value ? '1' : '0'); } catch {}
});

// Narrow screens: the sidebar is a drawer, opened with the menu button in the header.
export const navOpen = ref(false);
