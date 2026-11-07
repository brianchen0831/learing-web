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

export const getTopics = () => getJSON('/api/topics');
export const getContent = (slug) => getJSON(`/topics/${encodeURIComponent(slug)}/content.json`);
export const getAssets = (slug) => getJSON(`/api/assets/${encodeURIComponent(slug)}`, { allow404: true });

// URL of a file inside a topic's assets folder; `path` may include subfolders.
export const assetUrl = (slug, path) =>
  `/topics/${encodeURIComponent(slug)}/assets/` + path.split('/').map(encodeURIComponent).join('/');
