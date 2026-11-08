import { createRouter, createWebHistory } from 'vue-router';
import { authReady, user } from './account/auth.js';

// Views are loaded lazily, the first time their route is visited.
const routes = [
  { path: '/', name: 'home', component: () => import('./views/HomeView.js') },
  { path: '/login', name: 'login', component: () => import('./account/LoginView.js'), meta: { guestOnly: true } },
  { path: '/register', name: 'register', component: () => import('./account/RegisterView.js'), meta: { guestOnly: true } },
  { path: '/account', name: 'account', component: () => import('./account/AccountView.js'), meta: { loginOnly: true } },
  { path: '/account/avatar', name: 'avatar', component: () => import('./account/AvatarView.js'), meta: { loginOnly: true } },
  { path: '/account/shop', name: 'shop', component: () => import('./account/DressingRoomView.js'), meta: { loginOnly: true } },
  { path: '/topics/:slug', name: 'topic', component: () => import('./views/TopicView.js'), props: true },
  { path: '/topics/:slug/:sub', name: 'subtopic', component: () => import('./views/TopicView.js'), props: true },
  { path: '/topics/:slug/:sub/new', name: 'new-word-list', component: () => import('./views/WordListEditorView.js'), props: true },
  { path: '/:rest(.*)*', name: 'not-found', component: () => import('./views/NotFoundView.js') },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach(async (to) => {
  await authReady;
  if (to.meta.loginOnly && !user.value) return '/login';
  if (to.meta.guestOnly && user.value) return '/account';
  return true;
});

export default router;
