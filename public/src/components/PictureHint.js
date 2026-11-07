import { ref, watch } from 'vue';
import { findPicture } from '../api.js';
import { t } from '../i18n.js';

// Picture for a word, with its credit. Shows nothing if no picture is found.
export default {
  name: 'PictureHint',
  props: { word: { type: String, required: true } },
  setup(props) {
    const picture = ref(null);

    watch(
      () => props.word,
      async (word) => {
        picture.value = null;
        const found = await findPicture(word);
        if (word === props.word) picture.value = found;
      },
      { immediate: true },
    );

    return { picture, t };
  },
  template: `
    <figure v-if="picture" class="test-picture">
      <img :src="picture.url" :alt="t('test.picture')" @error="picture = null">
      <figcaption>
        <a :href="picture.link" target="_blank" rel="noopener">{{ [picture.creator, picture.license].filter(Boolean).join(' · ') }}</a>
      </figcaption>
    </figure>
  `,
};
