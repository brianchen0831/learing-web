# Learning Web 學習網站

[English](#english) | [中文](#中文)

---

## English

A local learning website for students: a Vue 3 single-page app served by a small Python server. The server uses only the Python standard library (3.8+) and Vue is stored in the repo, so there is nothing to install beyond Python itself.

### Setup (Windows)

```
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

This installs Git and Python via winget. Reopen your terminal afterwards.

### Run

```
python server.py        # or: python server.py 8080
```

Open http://localhost:3000 (the port can also be set with the `PORT` environment variable).

### Configuration

Your settings are in `config.json`, which is not committed. Copy `config.example.json` to create it; without the file, the defaults are used.

```json
{
  "database_path": "database"
}
```

`database_path` sets where the database folder is. The default is `database/` in the project folder, which git ignores. A relative path starts at the project folder, and an absolute path can point anywhere, for example `"D:/learning-data"`. On Windows, use `/` or `\\` in the path. Restart the server after changing it.

At startup, the server creates one folder per topic and subtopic, such as `database/english/vocabulary` and `database/english/quiz`.

### Structure

- `setup.ps1` – installs Git and Python on Windows
- `server.py` – Python server: static files, `/api/topics`, `/api/assets/<topic>`, and fallback to the Vue app
- `data/topics.json` – topics shown on the home page (titles in `en` and `zh`)
- `public/index.html` – the single HTML page that loads the Vue app
- `public/src/` – the Vue 3 app: `main.js`, `App.js`, `router.js`, `i18n.js`, `api.js`, `store.js`, `components/`, `views/`
- `public/vendor/` – local copies of Vue and Vue Router (no Node.js or build step needed)
- `public/topics/<topic>/` – one independent folder per topic (`math`, `english`, `chinese`), each with a bilingual `content.json` and `assets/`
- `public/css/style.css` – shared styles (light/dark)

Each topic folder also has an `assets/` folder (images, worksheets, … with any depth of subfolders) that is listed on the topic page. See [WEB_MAP.md](WEB_MAP.md) for the full architecture.

### Add a topic

1. Copy a folder in `public/topics/` (for example `math`) to `public/topics/<new>/`.
2. Edit `content.json`: provide both `en` and `zh` with a title, intro, sections and quiz.
3. Replace the files in `assets/`, including the banner `assets/images/hero.jpg`.
4. Add an entry (same `slug`, with `en` / `zh` title and summary, and `image`) to `data/topics.json`.

---

## 中文

這是給學生使用的本機學習網站：以 Vue 3 單頁應用程式為前端，由小型 Python 伺服器提供服務。伺服器只使用 Python 標準函式庫（3.8 以上），Vue 檔案也已放在專案內，除了 Python 本身外不需要安裝任何套件。

### 安裝環境（Windows）

```
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

此腳本會透過 winget 安裝 Git 與 Python，安裝完成後請重新開啟終端機。

### 執行

```
python server.py        # 或指定連接埠：python server.py 8080
```

開啟瀏覽器前往 http://localhost:3000（也可以用環境變數 `PORT` 設定連接埠）。

### 設定

個人設定放在 `config.json`，這個檔案不會被提交到 git。可複製 `config.example.json` 來建立；沒有此檔案時會使用預設值。

```json
{
  "database_path": "database"
}
```

`database_path` 用來指定資料庫資料夾的位置。預設是專案資料夾內的 `database/`，git 會忽略它。相對路徑從專案資料夾開始，也可以用絕對路徑指向其他位置，例如 `"D:/learning-data"`。在 Windows 上，路徑請使用 `/` 或 `\\`。修改後請重新啟動伺服器。

伺服器啟動時會為每個主題和子主題建立資料夾，例如 `database/english/vocabulary` 和 `database/english/quiz`。

### 專案結構

- `setup.ps1` – 在 Windows 上安裝 Git 與 Python
- `server.py` – Python 伺服器：靜態檔案、`/api/topics`、`/api/assets/<主題>`，其他路徑交給 Vue 應用程式
- `data/topics.json` – 首頁顯示的主題清單（含 `en`、`zh` 標題）
- `public/index.html` – 載入 Vue 應用程式的唯一 HTML 頁面
- `public/src/` – Vue 3 應用程式：`main.js`、`App.js`、`router.js`、`i18n.js`、`api.js`、`store.js`、`components/`、`views/`
- `public/vendor/` – 本機的 Vue 與 Vue Router 檔案（不需要 Node.js，也不需要建置步驟）
- `public/topics/<主題>/` – 每個主題一個獨立資料夾（`math`、`english`、`chinese`），各有雙語的 `content.json` 與 `assets/`
- `public/css/style.css` – 共用樣式（支援淺色／深色模式）

每個主題資料夾另有 `assets/` 資料夾（圖片、練習題等，可建立任意層級的子資料夾），內容會列在主題頁上。完整架構請見 [WEB_MAP.md](WEB_MAP.md)。

### 新增主題

1. 複製 `public/topics/` 中的任一資料夾（例如 `math`）為 `public/topics/<新主題>/`。
2. 編輯 `content.json`：同時提供 `en` 與 `zh` 的標題、簡介、段落與測驗題。
3. 替換 `assets/` 中的檔案，包含橫幅圖片 `assets/images/hero.jpg`。
4. 在 `data/topics.json` 加入對應項目（相同的 `slug`，並提供 `en` / `zh` 標題、簡介與 `image`）。

---

## License 授權

MIT
