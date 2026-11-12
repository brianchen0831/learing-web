import { useRouter } from 'vue-router';
import { openArranger } from './draft.js';

// A link to the arrange workspace that opens it in a new tab (see draft.js).
export default {
  name: 'ArrangeLink',
  setup() {
    const router = useRouter();
    return { open: () => openArranger(router) };
  },
  template: `<a href="/account/arrange" @click.prevent="open"><slot /></a>`,
};
