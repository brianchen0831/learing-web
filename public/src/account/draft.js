import { ref } from 'vue';

// The arrange page opens in a new browser tab, as a full-window workspace. Pages talk to it
// through a BroadcastChannel:
//   - a look being tried on in a shop is handed over in localStorage under a one-time token,
//     and comes back as { type: 'draft', back, avatar } when the student presses Done;
//   - { type: 'saved' } says the avatar was saved, so every open tab reloads the user.
// If the browser blocks the new tab, the arrange page opens in this tab instead, and a
// try-on look is handed over in memory (`shopDraft`) as before: { back, avatar, done }.
export const shopDraft = ref(null);

const CHANNEL = 'learning-web-arrange';
export const arrangeChannel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL) : null;

const randomToken = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// Opens the arrange page in a new tab. `query` as for /account/arrange (layer, back, bought);
// `avatar` is a try-on look to arrange instead of the saved one. Returns false when the tab
// could not be opened; the page then opens here through `router`.
export function openArranger(router, query = {}, avatar = null) {
  const q = { ...query, tab: '1' };
  if (avatar) {
    const token = randomToken();
    try {
      localStorage.setItem('arrange:' + token, JSON.stringify({ back: query.back, avatar }));
      q.token = token;
    } catch {}
  }
  const url = router.resolve({ path: '/account/arrange', query: q }).href;
  const tab = window.open(url, '_blank');
  if (tab) return true;
  // Blocked: arrange in this tab
  if (q.token) {
    try { localStorage.removeItem('arrange:' + q.token); } catch {}
  }
  const same = { ...query };
  if (avatar) {
    shopDraft.value = { back: query.back, avatar };
    same.draft = '1';
  }
  router.push({ path: '/account/arrange', query: same });
  return false;
}

// The try-on look handed to a new tab under `token`, read once.
export function takeHandedLook(token) {
  if (!token) return null;
  try {
    const raw = localStorage.getItem('arrange:' + token);
    localStorage.removeItem('arrange:' + token);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
