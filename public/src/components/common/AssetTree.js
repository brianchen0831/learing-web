import { assetUrl } from '../../api.js';

const IMAGE = /\.(png|jpe?g|gif|svg|webp)$/i;

// Recursive folder tree. `entries` come from /api/assets/<slug>; `parents` is the folder path so far.
export default {
  name: 'AssetTree',
  props: {
    slug: { type: String, required: true },
    entries: { type: Array, required: true },
    parents: { type: Array, default: () => [] },
  },
  methods: {
    url(name) { return assetUrl(this.slug, [...this.parents, name].join('/')); },
    icon(name) { return IMAGE.test(name) ? '🖼️' : '📄'; },
    kb(size) { return (size / 1024).toFixed(1); },
  },
  template: `
    <ul :class="parents.length ? '' : 'tree'">
      <li v-for="e in entries" :key="e.name">
        <details v-if="e.type === 'dir'" :open="parents.length === 0">
          <summary>📁 {{ e.name }}</summary>
          <AssetTree :slug="slug" :entries="e.children" :parents="[...parents, e.name]" />
        </details>
        <template v-else>
          <a :href="url(e.name)" target="_blank" rel="noopener">{{ icon(e.name) }} {{ e.name }}</a>
          <span class="badge"> {{ kb(e.size) }} KB</span>
        </template>
      </li>
    </ul>
  `,
};
