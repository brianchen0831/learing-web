import { listsIn } from '../wordlistTree.js';

// Folder view of word lists for the Vocabulary sidebar. The folder holding the
// selected list opens by itself; others open with a click.
export default {
  name: 'WordListTree',
  props: {
    nodes: { type: Array, required: true },
    selectedId: { type: String, default: '' },
    label: { type: Function, required: true },
  },
  methods: {
    holdsSelected(node) {
      return listsIn(node).some((l) => l.id === this.selectedId);
    },
  },
  template: `
    <ul>
      <li v-for="n in nodes" :key="n.path">
        <details v-if="n.type === 'folder'" :open="holdsSelected(n)">
          <summary><span class="folder-icon" aria-hidden="true">📁</span> {{ n.name }}</summary>
          <WordListTree :nodes="n.children" :selected-id="selectedId" :label="label" />
        </details>
        <span v-else-if="n.list.invalid" class="list-invalid">{{ label(n.list) }}</span>
        <RouterLink v-else :to="{ query: { list: n.list.id } }" :class="{ selected: n.list.id === selectedId }"
                    :aria-current="n.list.id === selectedId ? 'true' : null">{{ label(n.list) }}</RouterLink>
      </li>
    </ul>
  `,
};
