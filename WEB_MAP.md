# Web Map 網站架構圖

An overview of Learning Web. Details of each topic are in the `DESIGN.md` inside that topic's folder.
Learning Web 的架構總覽。各主題的細節請見該主題資料夾內的 `DESIGN.md`。

## Stack 技術堆疊

| Layer | Choice |
| ----- | ------ |
| Server | Python, with the `cryptography` package for accounts |
| Front end | Vue 3 single-page app with Vue Router |
| Build | None: native ES modules, with Vue stored in `public/vendor/` so the site works offline |
| Language | English / 中文 switch |
| Content | JSON files in each topic folder |
| Data | Files in a database folder, set in `config.json` |

## Folders 資料夾

```
learning-web/
├── server.py          web server and API
├── account/           server code for accounts, and their design document
├── setup.ps1          installs Git, Python and packages on Windows
├── config.json        your settings (not committed)
├── secret.key         key that encrypts accounts (not committed)
├── database/          default database folder (not committed)
├── data/topics.json   topics shown on the home page
└── public/            everything the browser can fetch
    ├── index.html     the only HTML page
    ├── css/           shared styles
    ├── assets/        site-wide images
    ├── vendor/        Vue and Vue Router
    ├── src/           the Vue app: views, components, shared modules and account/
    └── topics/        one independent folder per topic
```

## Pages 頁面

| URL | Page |
| --- | ---- |
| `/` | Home page: topic cards, sidebar, Topics dropdown |
| `/topics/<topic>` | A topic |
| `/topics/<topic>/<subtopic>` | A subtopic |
| `/topics/<topic>/<subtopic>/new` | Create a new word list |
| `/login`, `/register` | Log in, or create an account with an avatar |
| `/account` | The user page, with the full-body avatar |
| `/account/avatar` | Customize the avatar |
| `/account/arrange` | Arrange the avatar: drag and resize each part on a canvas |
| `/topics/<topic>/tasks` | A topic's tasks: open ones first, completed ones after in gray |
| `/account/tasks` | Tasks and rewards: completed tasks and progress on open ones |
| `/account/shop` | Dressing room: try on and buy clothes, shoes and accessories |
| `/account/hair` | Hair salon: try on and buy hair styles |
| `/account/beauty` | Beauty salon: try on and buy eyes, noses, mouths and makeup |

## Topics 主題

| Topic | Status | Design |
| ----- | ------ | ------ |
| Math 數學 | To be done | [DESIGN.md](public/topics/math/DESIGN.md) |
| English 英文 | Has subtopics | [DESIGN.md](public/topics/english/DESIGN.md) |
| English: Vocabulary 單字 | Word lists | [DESIGN.md](public/topics/english/vocabulary/DESIGN.md) |
| English: Quiz 測驗 | Vocabulary test | [DESIGN.md](public/topics/english/quiz/DESIGN.md) |
| Chinese 中文 | To be done | [DESIGN.md](public/topics/chinese/DESIGN.md) |

## Config and database 設定與資料庫

`config.json` sets where the database folder is, and `config.example.json` shows the format. The database has the same folders as the topics, and the server creates any missing ones at startup. The browser can only reach the database through the server's API.

設定檔 `config.json` 指定資料庫資料夾的位置。資料庫的資料夾結構與主題相同，伺服器啟動時會自動建立缺少的資料夾。瀏覽器只能透過伺服器的 API 存取資料庫。

## Accounts 帳號

Users can create an account, log in and log out, customize their paper-doll avatar, and spend coins in three shops: the dressing room (clothes), hair salon (hair) and beauty salon (face). The top right shows their head icon, and the user page shows the full-body avatar. Accounts are encrypted in the database. Details are in [account/DESIGN.md](account/DESIGN.md).

使用者可以建立帳號、登入與登出、自訂紙娃娃角色，並在三間商店用金幣購物：試衣間（服裝）、髮廊（髮型）和美容院（臉部）。右上角顯示頭像，使用者頁面顯示全身角色。帳號資料在資料庫中加密保存。

## Tasks and rewards 任務與獎勵

Tasks are defined in `.json` files in each top-level topic's task folder, such as `database/english/task/`, one file per kind of task. Test results of logged-in users are saved per topic, such as `database/english/quiz/results/`, and a task pays its reward once its condition is met. Details are in [account/DESIGN.md](account/DESIGN.md).

任務定義在各主題的任務資料夾，例如 `database/english/task/`，不同種類的任務可放在不同檔案。登入使用者的測驗結果依主題分開儲存，達成條件後即發放獎勵。

## Design rules 設計原則

- **No build step**: Vue runs straight from `public/`.
- **Topics are independent**: a topic's content, assets and design document live in its own folder; shared code lives in `src/` and `css/`.
- **Local and safe**: the server only listens on this computer, and other websites cannot write to the database.
- **Line endings**: LF everywhere.
