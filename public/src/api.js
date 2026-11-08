// Small fetch layer with an in-memory cache (one request per URL per page load).
const cache = new Map();

function getJSON(url, { allow404 = false } = {}) {
  if (!cache.has(url)) {
    const request = fetch(url).then((res) => {
      if (res.status === 404 && allow404) return [];
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return res.json();
    });
    cache.set(url, request);
    request.catch(() => cache.delete(url)); // do not cache failures
  }
  return cache.get(url);
}

// Encode each path segment, keeping the slashes.
const enc = (path) => path.split('/').map(encodeURIComponent).join('/');

// `topic` is a topic or subtopic path: "math" or "english/vocabulary".
// Paper doll catalog: genders, skins, layers and parts. See account/doll.py.
export const getDoll = () => getJSON('/assets/avatars/doll/parts.json');
export const dollUrl = (file) => '/assets/avatars/doll/' + file.split('/').map(encodeURIComponent).join('/');
export const getTopics = () => getJSON('/api/topics');
export const getContent = (topic) => getJSON(`/topics/${enc(topic)}/content.json`);
export const getAssets = (topic) => getJSON(`/api/assets/${enc(topic)}`, { allow404: true });

export const getWordLists = (topic) => getJSON(`/api/wordlists/${enc(topic)}`);
export const getWordList = (topic, id) => getJSON(`/api/wordlists/${enc(topic)}/${enc(id)}`);

// First picture for a word from Openverse (openly licensed images, no key needed).
// Returns null when there is none, including when the computer is offline.
export async function findPicture(word) {
  try {
    const data = await getJSON(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(word)}&page_size=1&mature=false`,
    );
    const image = data.results[0];
    if (!image) return null;
    return {
      url: image.thumbnail,
      creator: image.creator,
      license: image.license ? `CC ${image.license.toUpperCase()}` : '',
      link: image.foreign_landing_url,
    };
  } catch {
    return null;
  }
}

export const googleImagesUrl = (word) =>
  `https://www.google.com/search?tbm=isch&safe=active&q=${encodeURIComponent(word)}`;

// Saves a new list and returns its id. Throws an Error with the server's message.
export async function createWordList(topic, list) {
  const url = `/api/wordlists/${enc(topic)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(list),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || String(res.status));
  cache.delete(url); // the list of lists has changed
  return body.id;
}

// URL of a file inside a topic's assets folder; `path` may include subfolders.
export const assetUrl = (topic, path) => `/topics/${enc(topic)}/assets/${enc(path)}`;
