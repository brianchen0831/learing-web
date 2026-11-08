import { computed, onMounted, ref, watchEffect } from 'vue';
import TaskList from '../account/TaskList.js';
import { getTasks, user } from '../account/auth.js';
import { getContent } from '../api.js';
import { pick, t } from '../i18n.js';

// A topic's tasks, at /topics/<topic>/tasks: open tasks first, completed ones after, in gray.
// A task belongs to the topic when its condition looks at the topic or one of its subtopics.
export default {
  name: 'TopicTasksView',
  components: { TaskList },
  props: { slug: { type: String, required: true } },
  setup(props) {
    const tasks = ref(null);
    const content = ref(null);
    const failed = ref(false);

    onMounted(async () => {
      getContent(props.slug).then((c) => { content.value = c; }).catch(() => {});
      if (!user.value) return;
      try { tasks.value = await getTasks(); } catch { failed.value = true; }
    });

    const title = computed(() => (content.value ? pick({ en: content.value.en?.title, zh: content.value.zh?.title }) : props.slug));
    watchEffect(() => {
      document.title = `${title.value} · ${t('tasks.topicTitle')} – ${t('site.title')}`;
    });

    const mine = computed(() => (tasks.value || []).filter(
      (x) => x.topic && (x.topic === props.slug || x.topic.startsWith(props.slug + '/')),
    ));
    const open = computed(() => mine.value.filter((x) => !x.done_at));
    const done = computed(() => mine.value.filter((x) => x.done_at).sort((a, b) => b.done_at - a.done_at));
    const ordered = computed(() => [...open.value, ...done.value]);

    return { user, tasks, failed, title, open, done, ordered, t };
  },
  template: `
    <main class="tasks-page">
      <RouterLink class="back" :to="'/topics/' + slug">← {{ title }}</RouterLink>
      <h1>{{ title }} · {{ t('tasks.topicTitle') }}</h1>
      <p v-if="!user" class="lesson">
        <RouterLink to="/login">{{ t('auth.login') }}</RouterLink> {{ t('tasks.loginHint') }}
      </p>
      <p v-else-if="failed">{{ t('tasks.loadError') }}</p>
      <section v-else-if="tasks" class="lesson">
        <p v-if="!ordered.length" class="intro">{{ t('tasks.noneHere') }}</p>
        <template v-else>
          <p class="task-summary">{{ t('tasks.done') }} {{ done.length }} / {{ ordered.length }}</p>
          <TaskList :tasks="ordered" />
        </template>
      </section>
    </main>
  `,
};
