import { listsIn } from '../../wordlistTree.js';

// Folder view for a sidebar: folders open with a click, and the folder holding the
// selected item opens by itself. Items come from buildTree() in wordlistTree.js; the
// selected one is kept in the URL as ?<queryKey>=<id>. Used by Vocabulary and math Solutions.
export default {
  name: 'FolderTree',
  props: {
    nodes: { type: Array, required: true },
    selectedId: { type: String, default: '' },
    label: { type: Function, required: true },
    queryKey: { type: String, default: 'list' },
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
          <FolderTree :nodes="n.children" :selected-id="selectedId" :label="label" :query-key="queryKey" />
        </details>
        <span v-else-if="n.list.invalid" class="list-invalid">{{ label(n.list) }}</span>
        <RouterLink v-else :to="{ query: { [queryKey]: n.list.id } }" :class="{ selected: n.list.id === selectedId }"
                    :aria-current="n.list.id === selectedId ? 'true' : null">{{ label(n.list) }}</RouterLink>
      </li>
    </ul>
  `,
};
