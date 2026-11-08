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
}

// Resolves once the server has said who is logged in.
export const authReady = fetch('/api/account/me')
  .then((res) => res.json())
  .then((data) => { user.value = data.user; })
  .catch(() => {});

export const register = (name, password, avatar) => post('/api/account/register', { name, password, avatar });
export const login = (name, password) => post('/api/account/login', { name, password });
export const logout = () => post('/api/account/logout', {});
export const saveAvatar = (avatar) => post('/api/account/avatar', { avatar });
export const buyItem = (item) => post('/api/account/buy', { item });
