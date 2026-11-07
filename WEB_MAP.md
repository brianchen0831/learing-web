# Web Map 網站架構圖

How Learning Web is put together: what each folder does, what the browser requests, and how to extend it.
Learning Web 的整體架構：每個資料夾的用途、瀏覽器發出哪些請求，以及如何擴充。

## 1. Directory tree 目錄結構

```
learning-web/
├── server.py                  Python (stdlib) web server
├── setup.ps1                  Windows installer for Git + Python
├── WEB_MAP.md                 this file 本文件
├── README.md                  quick start 快速開始
├── data/
│   └── topics.json            topic index shown on the home page 首頁主題清單
└── public/                    everything the browser can fetch 瀏覽器可取得的所有檔案
    ├── index.html             home page 首頁
    ├── css/style.css          shared styles (light/dark) 共用樣式
    ├── js/
    │   ├── i18n.js            language switch EN / 中文 語言切換
    │   ├── quiz.js            quiz widget 測驗元件
    │   └── topic.js           renders a topic page 顯示主題頁面
    └── topics/
        └── <topic>/           one independent folder per topic 每個主題一個獨立資料夾
            ├── index.html     thin shell: <main id="app" data-topic="<topic>">
            ├── content.json   lessons + quiz, in "en" and "zh"
            └── assets/        images, worksheets, ... any depth 任意層級的子資料夾
                ├── images/
                └── worksheets/
                    ├── beginner/
                    └── advanced/
```

Current topics 目前的主題: `math` (數學), `english` (英文), `chinese` (中文).

## 2. Page map 頁面地圖

| URL | File | Purpose |
| --- | ---- | ------- |
| `/` | `public/index.html` | Home: topic cards, language switch, last quiz scores |
| `/topics/math/` | `public/topics/math/index.html` | Math lesson |
| `/topics/english/` | `public/topics/english/index.html` | English lesson |
| `/topics/chinese/` | `public/topics/chinese/index.html` | Chinese lesson |

Every topic page has: contents list → lesson sections (text, image, list, code) → Resources tree → quiz.
每個主題頁依序包含：本課內容 → 課程段落（文字、圖片、清單、程式碼）→ 學習資源 → 小測驗。

## 3. Request flow 請求流程

```
Browser                         server.py                       Disk
  │ GET /                          │                              │
  │──────────────────────────────▶ │ static file ───────────────▶ public/index.html
  │ GET /api/topics                │                              │
  │──────────────────────────────▶ │ send_json ─────────────────▶ data/topics.json
  │                                │
  │ GET /topics/math/              │ static file ───────────────▶ public/topics/math/index.html
  │ GET /topics/math/content.json  │ static file ───────────────▶ .../math/content.json
  │ GET /api/assets/math           │ asset_tree() walks ────────▶ .../math/assets/** (recursive)
  │ GET /topics/math/assets/...    │ static file ───────────────▶ the file itself (image, .md ...)
```

## 4. API 介面

| Endpoint | Returns |
| -------- | ------- |
| `GET /api/topics` | The contents of `data/topics.json` |
| `GET /api/assets/<topic>` | Recursive JSON tree of `public/topics/<topic>/assets`. `404` if the topic has no `assets/` folder. `<topic>` must match `[a-z0-9-]+`. |

Asset tree shape 資產樹格式 (folders first, then files, A–Z; hidden files and symlinks are skipped):

```json
[
  { "name": "images", "type": "dir", "children": [
    { "name": "fraction-pie.svg", "type": "file", "size": 812 }
  ]},
  { "name": "worksheets", "type": "dir", "children": [
    { "name": "beginner", "type": "dir", "children": [ ... ] }
  ]}
]
```

## 5. Language (i18n) 語言切換

- `public/js/i18n.js` holds the interface strings (buttons, headings) for `en` and `zh`, exposed as `window.I18N`.
- The choice is saved in `localStorage` (`lang`). First visit: Chinese if the browser language starts with `zh`, otherwise English.
- Switching language fires a `langchange` event; the home page and topic pages listen and re-render without reloading.
- Lesson text is **not** in `i18n.js` – it lives in each topic's `content.json` under `en` and `zh`.
- Static text can use `data-i18n="key"` and is translated automatically.

## 6. Topic content format `content.json`

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
- `image.src` is relative to the topic's `assets/` folder and may include subfolders (e.g. `images/diagrams/pie.svg`).
- `answer` is the zero-based index of the correct option.
- All text is inserted with `textContent`, so it is never interpreted as HTML.

## 7. Assets 資產資料夾

Each topic owns `public/topics/<topic>/assets/`. Create any subfolders you like; the Resources section on the topic page shows the whole tree as collapsible folders with links to every file.
每個主題擁有自己的 `assets/`，可自由建立任意層級的子資料夾；主題頁的「學習資源」會以可展開的資料夾顯示整個樹狀結構。

| Topic | Subfolders |
| ----- | ---------- |
| math | `images/`, `worksheets/beginner/`, `worksheets/advanced/` |
| english | `images/`, `vocab/`, `worksheets/grammar/` |
| chinese | `images/`, `characters/basic/`, `worksheets/` |

Served types: `.svg .png .jpg .gif .webp` (images), `.md .txt .csv` (UTF-8 text), `.json`, `.pdf` and anything else Python's `mimetypes` knows.

## 8. Add a topic 新增主題

1. Copy `public/topics/math/` to `public/topics/<new>/` and empty out `assets/`, then add your own subfolders and files.
2. In `<new>/index.html` set `data-topic="<new>"` and the `<title>`.
3. Write `<new>/content.json` with both `en` and `zh`.
4. Add `{ "slug": "<new>", "icon": "…", "title": {"en","zh"}, "summary": {"en","zh"} }` to `data/topics.json`.
5. Restart nothing – refresh the browser.

## 9. Design rules 設計原則

- **No dependencies**: Python standard library only; no build step.
- **Topics are independent**: a topic's content and assets live only in its own folder; shared code lives in `public/js` and `public/css`.
- **Safe by default**: server binds to `127.0.0.1`, asset API validates the topic name and skips symlinks, UI text uses `textContent`.
- **Line endings**: LF everywhere (`.gitattributes`).
