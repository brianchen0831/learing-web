import { ref } from 'vue';

// A look being tried on in a shop, handed to the arrange page and back, so items can be
// placed before they are bought. Kept in memory only: { back: <shop path>, avatar, done }.
// `done` is set by the arrange page when it hands the look back.
export const shopDraft = ref(null);
