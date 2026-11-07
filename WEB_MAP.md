# Web Map 網站架構圖

How Learning Web is put together: the stack, what each folder does, what the browser requests, and how to extend it.
Learning Web 的整體架構：技術堆疊、每個資料夾的用途、瀏覽器發出哪些請求，以及如何擴充。

## 1. Stack 技術堆疊

| Layer | Choice | Why |
| ----- | ------ | --- |
| Server | Python standard library (`http.server`) | nothing to install besides Python |
| Front end | **Vue 3** single-page app | components, reactivity, modern structure |
| Routing | **Vue Router 4** (history mode) | clean URLs such as `/topics/math` |
| Modules | native ES modules + import map | **no Node.js, no build step** |
| Language | small reactive i18n module (EN / 中文) | no extra library |
| Content | JSON files per topic | easy to edit, easy to translate |

Vue and Vue Router are stored locally in `public/vendor/` (Vue 3.5.13 and Vue Router 4.5.0, MIT license), so the site works offline.
Vue 與 Vue Router 的檔案放在 `public/vendor/`，離線也能使用。Components use template strings in `.js` files instead of `.vue` files, because `.vue` files need a build step. If the project grows, it can move to Vite + `.vue` files without changing the component structure.

## 2. Directory tree 目錄結構

```
learning-web/
├── server.py                    Python web server (static files + API + SPA fallback)
├── setup.ps1                    Windows installer for Git + Python
├── config.example.json          sample settings (committed)
├── config.json                  your settings (not committed)
├── database/                    default database folder (not committed)
├── WEB_MAP.md                   this file 本文件
├── README.md                    quick start 快速開始
├── data/
│   └── topics.json              topic index shown on the home page 首頁主題清單
└── public/                      everything the browser can fetch
    ├── index.html               the only HTML page: import map + <div id="app">
    ├── css/style.css            shared styles (light/dark)
    ├── assets/images/           site-wide images: home-bg.jpg, CREDITS.md
    ├── vendor/                  vue.esm-browser.prod.js, vue-router.esm-browser.prod.js
    ├── src/                     the Vue app 前端程式
    │   ├── main.js              creates the app, installs the router
    │   ├── App.js               root: header + <RouterView> + footer
    │   ├── router.js            routes (lazy-loaded views)
    │   ├── i18n.js              reactive language state, t(), pick()
    │   ├── api.js               fetch helpers with cache, assetUrl()
    │   ├── store.js             quiz scores (reactive + localStorage)
    │   ├── components/
    │   │   ├── AppHeader.js     top bar
    │   │   ├── LangSwitch.js    English / 中文 toggle
    │   │   ├── TopicMenu.js     "Topics" dropdown (home page header)
    │   │   ├── HomeSidebar.js   home page sidebar: topic links, last scores
    │   │   ├── TopicCard.js     card on the home page
    │   │   ├── TopicSection.js  one lesson section (text, image, list, code)
    │   │   ├── AssetTree.js     recursive folder tree of a topic's assets
    │   │   ├── WordList.js      word list sidebar and table
    │   │   ├── WordDialog.js    pop-up for adding or editing a word
    │   │   └── QuizBlock.js     quiz with per-answer feedback
    │   └── views/
    │       ├── HomeView.js      route /
    │       ├── TopicView.js     routes /topics/:slug and /topics/:slug/:sub
    │       ├── WordListEditorView.js  route /topics/:slug/:sub/new
    │       └── NotFoundView.js  any other route
    └── topics/
        └── <topic>/             one independent folder per topic 每個主題一個獨立資料夾
            ├── content.json     lessons + quiz, in "en" and "zh"
            └── assets/          images, worksheets, ... any depth of subfolders
                ├── images/      hero.jpg (banner), diagrams, CREDITS.md
                └── worksheets/
```

Current topics 目前的主題: `math` (數學), `english` (英文), `chinese` (中文).

## 3. Component map 元件關係

```
App
├── AppHeader ─┬─ TopicMenu (home page only)
│              └─ LangSwitch
├── RouterView
│   ├── HomeView ─┬─ HomeSidebar
│   │             └─ TopicCard (×N)
│   ├── TopicView ─┬─ TopicSection (×N)
│   │              ├─ AssetTree (recursive)
│   │              ├─ QuizBlock
│   │              └─ WordList
│   ├── WordListEditorView ── WordDialog
│   └── NotFoundView
└── footer
```

Shared state 共用狀態: `i18n.js` (`lang`), `store.js` (`scores`). Both are Vue reactive objects, so every component using them updates instantly – there is no page reload when the language changes.

## 4. Routes 路由

| URL | View | Data loaded |
| --- | ---- | ----------- |
| `/` | `HomeView` | `GET /api/topics` |
| `/topics/<slug>` | `TopicView` | `GET /topics/<slug>/content.json`, `GET /api/assets/<slug>` |
| `/topics/<slug>/<sub>` | `TopicView` | the same requests for `<slug>/<sub>`, plus the parent's `content.json` |
| `/topics/<slug>/<sub>/new` | `WordListEditorView` | saves with `POST /api/wordlists/<slug>/<sub>` |
| anything else | `NotFoundView` | – |

## 5. Request flow 請求流程

```
Browser                             server.py                          Disk
 │ GET /topics/math                   │ not a file, no "."  → SPA        │
 │──────────────────────────────────▶ │ send_index() ───────────────────▶ public/index.html
 │ GET /src/main.js (+ imports)       │ static file ────────────────────▶ public/src/**, public/vendor/**
 │ GET /api/topics                    │ send_json ──────────────────────▶ data/topics.json
 │ GET /topics/math/content.json      │ static file ────────────────────▶ public/topics/math/content.json
 │ GET /api/assets/math               │ asset_tree() walks ─────────────▶ public/topics/math/assets/** (recursive)
 │ GET /topics/math/assets/images/…   │ static file ────────────────────▶ the image / worksheet itself
```

Server rules 伺服器規則 (`server.py`):

1. `/api/topics` and `/api/assets/<slug>` return JSON.
2. If the path is an existing file, it is served (correct MIME type, `.md/.txt/.csv` as UTF-8).
3. If the last path segment contains a `.` but no file exists → real `404`.
4. Otherwise it is a client-side route → `public/index.html` (the Vue Router takes over). Directories are never listed.

## 6. API 介面

| Endpoint | Returns |
| -------- | ------- |
| `GET /api/topics` | The contents of `data/topics.json` |
| `GET /api/assets/<topic>` | Recursive JSON tree of `public/topics/<topic>/assets`. `404` if the topic has no `assets/` folder. `<topic>` must match `[a-z0-9-]+`. |

Asset tree shape (folders first, then files, A–Z; hidden files and symlinks are skipped):

```json
[
  { "name": "images", "type": "dir", "children": [
    { "name": "fraction-pie.svg", "type": "file", "size": 812 }
  ]},
  { "name": "worksheets", "type": "dir", "children": [ ... ] }
]
```

## 7. Language (i18n) 語言切換

- `src/i18n.js` holds the interface strings (buttons, headings) for `en` and `zh`. `lang` is a Vue `ref`; `t(key)` and `pick({en, zh})` read it, so templates update automatically.
- The choice is saved in `localStorage` (`lang`). First visit: Chinese if the browser language starts with `zh`, otherwise English.
- Lesson text is **not** in `i18n.js` – it lives in each topic's `content.json` under `en` and `zh`.

## 8. Topic content format `content.json`

```json
{
  "en": {
    "icon": "➗",
    "title": "Math",
    "intro": "Short introduction.",
    "sections": [
      {
        "heading": "Fractions",
        "text":  ["Paragraph 1", "Paragraph 2"],
        "image": { "src": "images/fraction-pie.svg", "alt": "...", "caption": "..." },
        "list":  ["item", "item"],
        "code":  "preformatted text"
      }
    ],
    "quiz": [
      { "q": "Question?", "options": ["A", "B", "C"], "answer": 1 }
    ]
  },
  "zh": { "…same shape, Chinese text…" }
}
```

- All fields in a section are optional except `heading`.
- `image.src` is relative to the topic's `assets/` folder and may include subfolders.
- `answer` is the zero-based index of the correct option.
- Vue's `{{ }}` escapes all text, so content is never interpreted as HTML.

## 9. Assets 資產資料夾

Each topic owns `public/topics/<topic>/assets/`. Create any subfolders you like; the Resources section shows the whole tree as collapsible folders with links to every file.
每個主題擁有自己的 `assets/`，可自由建立任意層級的子資料夾；主題頁的「學習資源」會以可展開的資料夾顯示整個樹狀結構。

All three topics are currently placeholders: `content.json` has empty `sections` and `quiz`, and `assets/` holds only `images/hero.jpg` and `images/CREDITS.md`. A topic with no sections and no quiz shows "To be done / 待完成" on its page. Adding sections or a quiz brings back the full layout automatically; also update `summary` in `data/topics.json`.
目前三個主題都是待完成狀態；在 `content.json` 加入段落或測驗後，完整版面會自動出現，並請更新 `data/topics.json` 的 `summary`。

### Photos 圖片

- `assets/images/hero.jpg` in each topic is the banner on the topic page and the card picture on the home page (`image` in `data/topics.json`). If it is missing, a gradient is shown instead.
- The topic photos come from Pexels under the Pexels License (1280 × 800 crops). Creator, source link and license are in each topic's `assets/images/CREDITS.md`. Update it whenever you add or change a photo.
- Images are stored locally, so the site works offline.
- The home page background is `public/assets/images/home-bg.jpg` (set on `.home` in `css/style.css`). It comes from Pexels under the Pexels License, not CC0; see `public/assets/images/CREDITS.md`.

## 10. Add a topic 新增主題

1. Create `public/topics/<new>/` with `content.json` (both `en` and `zh`) and `assets/images/hero.jpg` (record it in `assets/images/CREDITS.md`). Add any other asset subfolders you want.
2. Add `{ "slug": "<new>", "icon": "…", "image": "/topics/<new>/assets/images/hero.jpg", "title": {"en","zh"}, "summary": {"en","zh"} }` to `data/topics.json`.
3. Refresh the browser. No code changes and no restart are needed.

### Subtopics 子主題

A topic can contain subtopics, one level deep. `english` has `vocabulary` and `quiz`:

```
public/topics/english/
├── content.json          lists "subtopics" at the top level
├── assets/images/hero.jpg
├── vocabulary/
│   └── content.json      same format as a topic; assets/ is optional
└── quiz/
    └── content.json
```

To add one 新增子主題:

1. Create `public/topics/<topic>/<sub>/content.json` with `en` and `zh`.
2. Add `{ "slug": "<sub>", "title": {"en","zh"}, "summary": {"en","zh"} }` to `subtopics` in the parent's `content.json`.

The parent page shows subtopics as cards. A subtopic page uses its parent's banner photo and links back to the parent. Use lowercase letters, numbers and `-` in the folder name.

## 11. Add a component or page 新增元件或頁面

- **Component:** create `src/components/MyThing.js` exporting `{ name, props, setup, template }`, import it where it is used and list it in `components`.
- **Page:** create `src/views/MyView.js`, add a route in `src/router.js`.
- **Interface text:** add the key to both `en` and `zh` in `src/i18n.js`.

## 12. Config and database 設定與資料庫

`server.py` reads `config.json` at startup. A setting left out of the file, or a missing file, uses the default. Invalid JSON or an unusable path stops the server with an error, so data is never written to an unexpected place.

| Setting | Default | Meaning |
| ------- | ------- | ------- |
| `database_path` | `database` | Database folder. A relative path starts at the project folder; an absolute path can be anywhere. |

The database mirrors the topics, and the server creates any missing folders at startup from `data/topics.json` and each topic's `subtopics`. Existing files are never changed.
資料庫的結構與主題相同，伺服器啟動時會自動建立缺少的資料夾，不會更動既有檔案。

```
database/
├── math/
├── english/
│   ├── vocabulary/
│   └── quiz/
└── chinese/
```

The browser cannot reach the database folder directly. It only goes through the word list API, which can read lists and create new ones.
瀏覽器無法直接存取資料庫資料夾，只能透過單字表 API 讀取或新增單字表。

The default `database/` folder is not in git, so a fresh clone starts with no word lists.
預設的 `database/` 不在 git 中，因此重新 clone 專案後不會有單字表。

### Word lists 單字表

Each word list is one JSON file in a database folder, for example `database/english/vocabulary/animals.json`. The file name, without `.json`, is the list's id; it may use letters, numbers, `-` and `_`.
每個單字表是一個 JSON 檔案，檔名（不含 `.json`）就是單字表的 id。

```json
{
  "title": { "en": "Animals", "zh": "動物" },
  "words": [
    {
      "word": "fish",
      "meanings": [
        { "meaning": "an animal that lives in water", "chinese": "魚", "example": "We saw many fish in the sea." },
        { "meaning": "to try to catch fish", "chinese": "釣魚", "example": "We fish in the lake every summer." }
      ]
    }
  ]
}
```

| Field | Required | Meaning |
| ----- | -------- | ------- |
| `title` | no | List name in `en` and `zh`; the file name is shown if it is missing |
| `words` | yes | The words, in display order |
| `word` | yes | The English word; also builds the dictionary link |
| `meanings` | yes | One entry per meaning of the word |
| `meaning` | no | Meaning in English |
| `chinese` | no | Meaning in Chinese |
| `example` | no | Example sentence |

- To create a list in the site, use **+ New list** in the sidebar. This opens `/topics/<topic>/<sub>/new`: enter the list name, then add words with **+**. Each word opens a pop-up, where **+** adds another meaning.
- You can also add a list by saving a `.json` file in the folder and refreshing the browser. No restart is needed.
- New lists are named after the list name, for example `my-words.json`, or `list.json` when the name has no English letters or numbers. A number is added if the name is taken, so existing files are never replaced.
- A list created on the site stores its name in both `en` and `zh`.
- Lists cannot be edited or deleted on the site yet. Edit or delete the file in the database folder instead.
- A file that breaks these rules still appears in the sidebar, marked as having errors, but cannot be selected.
- Each word links to `https://dictionary.cambridge.org/dictionary/english/<word>`. Spaces in a phrase become `-`.
- The selected list is kept in the URL, for example `/topics/english/vocabulary?list=animals`.
- A subtopic shows word lists when its `content.json` has `"view": "wordlist"` at the top level.

| Endpoint | Returns |
| -------- | ------- |
| `GET /api/wordlists/<topic>/<sub>` | `[{ "id", "title", "count" }]`, or `{ "id", "invalid": true }` for a broken file. Empty if there are none. |
| `GET /api/wordlists/<topic>/<sub>/<id>` | The whole list; `404` if it is missing or broken |
| `POST /api/wordlists/<topic>/<sub>` | Creates a list from `{ "title": "name", "words": [...] }` and returns `201` with `{ "id" }`, or an `{ "error" }` message |

Saving only accepts `application/json` requests up to 1 MB from this site's own pages (`Host` must be `localhost` or `127.0.0.1`, and `Origin` must match), so other websites open in the browser cannot write to the database. `<topic>/<sub>` must be a real subtopic.

## 13. Design rules 設計原則

- **No build step**: Vue runs straight from `public/`; the Vue files are vendored, not fetched from a CDN.
- **Topics are independent**: a topic's content and assets live only in its own folder; shared code lives in `src/` and `css/`.
- **Safe by default**: the server binds to `127.0.0.1`, the asset API validates the topic name and skips symlinks, directories are never listed.
- **Line endings**: LF everywhere (`.gitattributes`).
