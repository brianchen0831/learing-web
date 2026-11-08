// Paper doll catalog helpers, shared by the avatar drawing, the customizer and the dressing room.
// The server checks the same rules in account/store.py.
import { ref } from 'vue';
import { dollUrl, getDoll } from '../api.js';

export const doll = ref(null);
export const dollReady = getDoll().then((data) => { doll.value = data; }).catch(() => {});

const fits = (part, gender) => !!(part.files && part.files[gender]);

// Parts for one layer that fit the gender; `free` limits to price 0.
export const partsFor = (gender, layer, { free = false } = {}) =>
  (doll.value ? doll.value.parts : []).filter(
    (p) => p.layer === layer && fits(p, gender) && (!free || !p.price),
  );

export const findPart = (id) => (doll.value ? doll.value.parts.find((p) => p.id === id) : null);
export const isRequired = (layer) => !!doll.value?.layers.find((l) => l.id === layer)?.required;

export function defaultParts(gender) {
  const parts = {};
  (doll.value ? doll.value.parts : []).forEach((p) => {
    if (p.default && fits(p, gender)) parts[p.layer] = p.id;
  });
  return parts;
}

export function defaultAvatar(gender, skin) {
  const genders = doll.value.genders.map((g) => g.id);
  const skins = doll.value.skins.map((s) => s.id);
  const g = genders.includes(gender) ? gender : genders[0];
  return { version: 2, gender: g, skin: skins.includes(skin) ? skin : skins[0], hair_color: hairColors()[0]?.id, parts: defaultParts(g) };
}

// Hair layers are gray. A hair color is a gradient map: gray 0 (outline) to 1 (highlight)
// runs through its `stops`. `hairTables` gives the feFuncR/G/B tableValues for the SVG filter.
export const hairColors = () => doll.value?.hairColors || [];
export function hairTables(id) {
  const colors = hairColors();
  const c = colors.find((x) => x.id === id) || colors[0];
  if (!c) return null;
  const channel = (i) => c.stops.map((s) => (parseInt(s.slice(1 + 2 * i, 3 + 2 * i), 16) / 255).toFixed(3)).join(' ');
  return { r: channel(0), g: channel(1), b: channel(2) };
}

// Drawing order, back to front: the avatar's own order (from the arrange page), with any
// layer it leaves out put back after the layer that comes before it in the catalog.
export function orderOf(avatar) {
  const catalog = doll.value ? doll.value.layers.map((l) => l.id) : [];
  const given = Array.isArray(avatar?.order) ? avatar.order.filter((id) => catalog.includes(id)) : [];
  if (!given.length) return catalog;
  const out = [...new Set(given)];
  catalog.forEach((id, i) => {
    if (out.includes(id)) return;
    const before = catalog.slice(0, i).reverse().find((x) => out.includes(x));
    out.splice(before ? out.indexOf(before) + 1 : 0, 0, id);
  });
  return out;
}

// Image layers to draw, back to front: [{ layer, url }]. The body layer is included.
export function layersOf(avatar) {
  if (!doll.value || !avatar) return [];
  const gender = avatar.gender;
  const byId = Object.fromEntries(doll.value.layers.map((l) => [l.id, l]));
  return orderOf(avatar).map((id) => byId[id]).flatMap((layer) => {
    if (layer.id === 'body') return [{ layer: 'body', url: dollUrl(`${gender}/body.png`) }];
    const part = findPart(avatar.parts?.[layer.id]);
    return part && fits(part, gender) ? [{ layer: layer.id, url: dollUrl(part.files[gender]) }] : [];
  });
}

// A layer's placement from the arrange page: moved by (x, y) and resized by s around (cx, cy).
// Returns an SVG transform, or null when the layer is where the catalog puts it.
export function transformOf(avatar, layer) {
  const a = avatar?.adjust?.[layer];
  if (!a) return null;
  return `translate(${a.x + a.cx} ${a.y + a.cy}) scale(${a.s}) translate(${-a.cx} ${-a.cy})`;
}

// Drops placements for layers whose part differs from `before` (a new part starts in place).
export function keepAdjust(avatar, beforeParts) {
  const adjust = {};
  Object.entries(avatar.adjust || {}).forEach(([layer, a]) => {
    if (avatar.parts?.[layer] && avatar.parts[layer] === beforeParts?.[layer]) adjust[layer] = a;
  });
  return adjust;
}

export const skinColor =(id) => doll.value?.skins.find((s) => s.id === id)?.color || '#eec39a';
export const partFile = (part, gender) => dollUrl(part.files[gender] || Object.values(part.files)[0]);
