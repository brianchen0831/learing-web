import { createRouter, createWebHistory } from 'vue-router';

// Views are loaded lazily, the first time their route is visited.
const routes = [
  { path: '/', name: 'home', component: () => import('./views/HomeView.js') },
  { path: '/topics/:slug', name: 'topic', component: () => import('./views/TopicView.js'), props: true },
  { path: '/topics/:slug/:sub', name: 'subtopic', component: () => import('./views/TopicView.js'), props: true },
  { path: '/topics/:slug/:sub/new', name: 'new-word-list', component: () => import('./views/WordListEditorView.js'), props: true },
  { path: '/:rest(.*)*', name: 'not-found', component: () => import('./views/NotFoundView.js') },
];

export default createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});
