import { lang, setLang } from '../../i18n.js';

export default {
  name: 'LangSwitch',
  setup() {
    const options = [
      { code: 'en', label: 'English' },
      { code: 'zh', label: '中文' },
    ];
    return { lang, setLang, options };
  },
  template: `
    <div class="lang-switch" role="group" aria-label="Language">
      <button v-for="o in options" :key="o.code" type="button"
              :aria-pressed="String(lang === o.code)" @click="setLang(o.code)">
        {{ o.label }}
      </button>
    </div>
  `,
};
