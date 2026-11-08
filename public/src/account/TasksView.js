import { computed, onMounted, ref, watchEffect } from 'vue';
import TaskList from './TaskList.js';
import { getTasks } from './auth.js';
import { t } from '../i18n.js';

// My account > Tasks and rewards: the completed tasks, then the ones still open.
export default {
  name: 'TasksView',
  components: { TaskList },
  setup() {
    const tasks = ref(null);
    const failed = ref(false);

    onMounted(async () => {
      try { tasks.value = await getTasks(); } catch { failed.value = true; }
    });
    watchEffect(() => {
      document.title = `${t('tasks.title')} – ${t('site.title')}`;
    });

    const done = computed(() => (tasks.value || []).filter((x) => x.done_at).sort((a, b) => b.done_at - a.done_at));
    const open = computed(() => (tasks.value || []).filter((x) => !x.done_at));

    return { tasks, failed, done, open, t };
  },
  template: `
    <main class="tasks-page">
      <RouterLink class="back" to="/account">← {{ t('auth.account') }}</RouterLink>
      <h1>{{ t('tasks.title') }}</h1>
      <p v-if="failed">{{ t('tasks.loadError') }}</p>
      <template v-else-if="tasks">
        <section class="lesson">
          <h2>{{ t('tasks.done') }} ({{ done.length }})</h2>
          <p v-if="!done.length" class="intro">{{ t('tasks.noneDone') }}</p>
          <TaskList v-else :tasks="done" />
        </section>
        <section v-if="open.length" class="lesson">
          <h2>{{ t('tasks.open') }}</h2>
          <TaskList :tasks="open" />
        </section>
      </template>
    </main>
  `,
};
