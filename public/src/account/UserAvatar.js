import { computed } from 'vue';
import { doll, layersOf, skinColor } from './doll.js';

let nextId = 0;

// Paper doll drawn from stacked image layers on a 720 x 1272 canvas. The body image is
// light gray, and the skin color is multiplied over it. The head icon is the same
// drawing, cropped to the head.
export default {
  name: 'UserAvatar',
  props: {
    avatar: { type: Object, required: true },
    head: { type: Boolean, default: false }, // true: head icon; false: full body
  },
  setup(props) {
    const filterId = `skin-${nextId++}`;
    const layers = computed(() => layersOf(props.avatar));
    const skin = computed(() => skinColor(props.avatar.skin));
    const viewBox = computed(() =>
      // Full body: the figure spans about y 84-1236, so trim the empty margins while keeping
      // the 720 x 1272 shape, so every avatar box keeps its size.
      props.head ? doll.value?.head[props.avatar.gender] || '250 60 220 220' : '29 70 662 1170',
    );
    return { doll, filterId, layers, skin, viewBox };
  },
  template: `
    <svg v-if="doll" class="user-avatar" :viewBox="viewBox" aria-hidden="true">
      <defs>
        <filter :id="filterId" color-interpolation-filters="sRGB">
          <feFlood :flood-color="skin"/>
          <feComposite in2="SourceAlpha" operator="in"/>
          <feBlend in="SourceGraphic" mode="multiply"/>
        </filter>
      </defs>
      <image v-for="l in layers" :key="l.layer" :href="l.url" width="720" height="1272"
             :filter="l.layer === 'body' ? 'url(#' + filterId + ')' : null"/>
    </svg>
  `,
};
