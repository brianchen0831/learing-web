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
  return { version: 2, gender: g, skin: skins.includes(skin) ? skin : skins[0], parts: defaultParts(g) };
}

// Image layers to draw, back to front: [{ layer, url }]. The body layer is included.
export function layersOf(avatar) {
  if (!doll.value || !avatar) return [];
  const gender = avatar.gender;
  return doll.value.layers.flatMap((layer) => {
    if (layer.id === 'body') return [{ layer: 'body', url: dollUrl(`${gender}/body.png`) }];
    const part = findPart(avatar.parts?.[layer.id]);
    return part && fits(part, gender) ? [{ layer: layer.id, url: dollUrl(part.files[gender]) }] : [];
  });
}

export const skinColor = (id) => doll.value?.skins.find((s) => s.id === id)?.color || '#eec39a';
export const partFile = (part, gender) => dollUrl(part.files[gender] || Object.values(part.files)[0]);
