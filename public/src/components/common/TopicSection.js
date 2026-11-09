import { assetUrl } from '../../api.js';

// One lesson section from content.json: heading, text[], image, list[], code.
export default {
  name: 'TopicSection',
  props: {
    slug: { type: String, required: true },
    section: { type: Object, required: true },
  },
  methods: { assetUrl },
  template: `
    <section class="lesson">
      <h2>{{ section.heading }}</h2>
      <p v-for="(p, i) in section.text" :key="'p' + i">{{ p }}</p>
      <figure v-if="section.image">
        <img :src="assetUrl(slug, section.image.src)" :alt="section.image.alt || ''" loading="lazy">
        <figcaption v-if="section.image.caption">{{ section.image.caption }}</figcaption>
      </figure>
      <ul v-if="section.list"><li v-for="(item, i) in section.list" :key="'l' + i">{{ item }}</li></ul>
      <pre v-if="section.code">{{ section.code }}</pre>
    </section>
  `,
};
