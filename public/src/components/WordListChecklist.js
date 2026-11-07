import { listsIn } from '../wordlistTree.js';
import { pick } from '../i18n.js';

// Folder view of word lists with checkboxes. A folder's checkbox selects everything
// inside it, and shows a dash when only part of it is selected.
export default {
  name: 'WordListChecklist',
  props: {
    nodes: { type: Array, required: true },
    selected: { type: Array, required: true },
  },
  emits: ['toggle'],
  methods: {
    pick,
    ids(node) {
      return listsIn(node).map((l) => l.id);
    },
    words(node) {
      return listsIn(node).reduce((sum, l) => sum + l.count, 0);
    },
    allOn(node) {
      return this.ids(node).every((id) => this.selected.includes(id));
    },
    someOn(node) {
      return this.ids(node).some((id) => this.selected.includes(id));
    },
  },
  template: `
    <ul class="check-tree">
      <li v-for="n in nodes" :key="n.path">
        <details v-if="n.type === 'folder'" open>
          <summary>
            <label class="check" @click.stop>
              <input type="checkbox" :checked="allOn(n)" :indeterminate.prop="someOn(n) && !allOn(n)"
                     @change="$emit('toggle', ids(n), $event.target.checked)">
              <span class="folder-icon" aria-hidden="true">📁</span> {{ n.name }} ({{ words(n) }})
            </label>
          </summary>
          <WordListChecklist :nodes="n.children" :selected="selected"
                             @toggle="(ids, on) => $emit('toggle', ids, on)" />
        </details>
        <label v-else class="check">
          <input type="checkbox" :checked="selected.includes(n.list.id)"
                 @change="$emit('toggle', [n.list.id], $event.target.checked)">
          {{ pick(n.list.title) || n.name }} ({{ n.list.count }})
        </label>
      </li>
    </ul>
  `,
};
