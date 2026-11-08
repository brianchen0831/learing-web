import { computed, ref, watch } from 'vue';
import { findPart } from './doll.js';
import { lang, pick, t } from '../i18n.js';

// A list of tasks from GET /api/account/tasks, shown 25 to a page. Each task has a check
// box: empty with a progress bar while open, ticked with its date once completed (in gray).
export default {
  name: 'TaskList',
  props: {
    tasks: { type: Array, required: true },
    pageSize: { type: Number, default: 25 },
  },
  setup(props) {
    const page = ref(1);
    const pages = computed(() => Math.max(1, Math.ceil(props.tasks.length / props.pageSize)));
    const shown = computed(() => props.tasks.slice((page.value - 1) * props.pageSize, page.value * props.pageSize));
    watch(() => props.tasks, () => { page.value = 1; });

    const name = (x) => (typeof x === 'string' ? x : pick(x));
    const date = (s) => new Date(s * 1000).toLocaleDateString(lang.value === 'zh' ? 'zh-TW' : 'en');
    function reward(r) {
      if (!r) return '';
      const parts = [];
      if (r.coins) parts.push(`${r.coins} ${t('shop.coinUnit')}`);
      r.items.forEach((id) => {
        const part = findPart(id);
        parts.push(part ? pick(part.label) : id);
      });
      return parts.join(' · ');
    }
    function go(n) {
      page.value = Math.min(Math.max(n, 1), pages.value);
    }

    return { page, pages, shown, name, date, reward, go, pick, t };
  },
  template: `
    <div>
      <ul class="task-list">
        <li v-for="x in shown" :key="x.id" :class="{ 'task-complete': x.done_at }">
          <span class="task-check" :class="{ checked: x.done_at }" role="img"
                :aria-label="x.done_at ? t('tasks.done') : t('tasks.open')">
            <svg v-if="x.done_at" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          <div class="task-body">
            <strong>{{ name(x.name) }}</strong>
            <p v-if="x.description" class="intro">{{ pick(x.description) }}</p>
            <p v-if="x.done_at" class="task-meta">{{ t('tasks.doneOn') }} {{ date(x.done_at) }}<span v-if="x.reward"> · {{ t('tasks.reward') }}: {{ reward(x.reward) }}</span></p>
            <template v-else>
              <div class="task-bar" role="progressbar" :aria-valuenow="x.progress[0]" aria-valuemin="0" :aria-valuemax="x.progress[1]">
                <span :style="{ width: (100 * x.progress[0] / x.progress[1]) + '%' }"></span>
              </div>
              <p class="task-meta">{{ x.progress[0] }} / {{ x.progress[1] }} · {{ t('tasks.reward') }}: {{ reward(x.reward) }}</p>
            </template>
          </div>
        </li>
      </ul>
      <nav v-if="pages > 1" class="pager" :aria-label="t('tasks.pages')">
        <button type="button" class="btn" :disabled="page === 1" @click="go(page - 1)">‹ {{ t('tasks.prev') }}</button>
        <button v-for="n in pages" :key="n" type="button" class="btn pager-num" :aria-current="n === page ? 'page' : null"
                @click="go(n)">{{ n }}</button>
        <button type="button" class="btn" :disabled="page === pages" @click="go(page + 1)">{{ t('tasks.next') }} ›</button>
      </nav>
    </div>
  `,
};
