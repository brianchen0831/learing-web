import { computed } from 'vue';
import { doll, hairTables, isSkin, layersOf, skinColor, transformOf } from './doll.js';

let nextId = 0;
// Full body: the figure spans about y 84-1236, so trim the empty margins while keeping
// the 720 x 1272 shape, so every avatar box keeps its size.
export const FULL_VIEW = '29 70 662 1170';

// Paper doll drawn from stacked image layers on a 720 x 1272 canvas. The body image is
// light gray, and the skin color is multiplied over it (and over any layer marked `skin`,
// such as ears). The hair image is gray too, and
// is colored with a gradient map. The head icon is the same drawing, cropped to the head.
export default {
  name: 'UserAvatar',
  props: {
    avatar: { type: Object, required: true },
    head: { type: Boolean, default: false }, // true: head icon; false: full body
    view: { type: String, default: '' }, // a viewBox of its own, such as the arrange page's work area
  },
  setup(props) {
    const id = nextId++;
    const filterId = `skin-${id}`;
    const hairId = `hair-${id}`;
    const layers = computed(() => layersOf(props.avatar));
    const skin = computed(() => skinColor(props.avatar.skin));
    const hair = computed(() => hairTables(props.avatar.hair_color));
    const viewBox = computed(() => props.view || (
      props.head ? doll.value?.head[props.avatar.gender] || '250 60 220 220' : FULL_VIEW
    ));
    function filterOf(layer) {
      if (isSkin(layer)) return `url(#${filterId})`;
      if (layer === 'hair' && hair.value) return `url(#${hairId})`;
      return null;
    }
    const transform = (layer) => transformOf(props.avatar, layer);
    return { doll, filterId, hairId, hair, layers, skin, viewBox, filterOf, transform };
  },
  template: `
    <svg v-if="doll" class="user-avatar" :viewBox="viewBox" aria-hidden="true">
      <defs>
        <filter :id="filterId" color-interpolation-filters="sRGB">
          <feFlood :flood-color="skin"/>
          <feComposite in2="SourceAlpha" operator="in"/>
          <feBlend in="SourceGraphic" mode="multiply"/>
        </filter>
        <filter v-if="hair" :id="hairId" color-interpolation-filters="sRGB">
          <feComponentTransfer>
            <feFuncR type="table" :tableValues="hair.r"/>
            <feFuncG type="table" :tableValues="hair.g"/>
            <feFuncB type="table" :tableValues="hair.b"/>
          </feComponentTransfer>
        </filter>
      </defs>
      <g v-for="l in layers" :key="l.layer" :transform="transform(l.layer)">
        <image :href="l.url" width="720" height="1272" :filter="filterOf(l.layer)"/>
      </g>
    </svg>
  `,
};
