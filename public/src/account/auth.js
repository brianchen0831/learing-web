// The logged-in user, shared by every page. null means nobody is logged in.
import { ref } from 'vue';

export const user = ref(null);

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'failed');
  user.value = data.user;
  return data;
}

// Asks the server again who is logged in, with their saved avatar.
export const refreshUser = () => fetch('/api/account/me')
  .then((res) => res.json())
  .then((data) => { user.value = data.user; })
  .catch(() => {});

// Resolves once the server has said who is logged in.
export const authReady = refreshUser();

export const register = (name, password, avatar) => post('/api/account/register', { name, password, avatar });
export const login = (name, password) => post('/api/account/login', { name, password });
export const logout = () => post('/api/account/logout', {});
export const saveAvatar = (avatar) => post('/api/account/avatar', { avatar });
export const buyItem = (item) => post('/api/account/buy', { item });
// A finished test: { topic, test, lists, total, answered, correct }. Resolves with the tasks it completed.
export const reportResult = (result) => post('/api/account/results', result).then((data) => data.completed || []);
export async function getTasks() {
  const res = await fetch('/api/account/tasks');
  const data = await res.json().catch(() => ({}));
  // A server without the tasks feature answers with the web page, which is not a task list
  if (!res.ok || !Array.isArray(data.tasks)) throw new Error(data.error || 'failed');
  return data.tasks;
}
