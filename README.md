# Learning Web 學習網站

[English](#english) | [中文](#中文)

---

## English

A small local web server, written in Python, that hosts learning pages and quizzes for students. It uses only the Python standard library (3.8+), so there is nothing to install beyond Python itself.

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

### Structure

- `setup.ps1` – installs Git and Python on Windows
- `server.py` – static file server plus `/api/topics`
- `data/topics.json` – topics shown on the home page (titles in `en` and `zh`)
- `public/index.html` – home page
- `public/topics/<topic>/` – one independent folder per topic (`math`, `english`, `chinese`), each with `index.html` and a bilingual `content.json`
- `public/js/i18n.js` – English / 中文 language switch (remembered in the browser)
- `public/js/topic.js` – renders a topic's `content.json` in the chosen language
- `public/js/quiz.js` – quiz engine
- `public/css/style.css` – shared styles (light/dark)

Each topic folder also has an `assets/` folder (images, worksheets, … with any depth of subfolders) that is listed on the topic page. See [WEB_MAP.md](WEB_MAP.md) for the full architecture.

### Add a topic

1. Copy a folder in `public/topics/` (for example `math`) to `public/topics/<new>/`.
2. In its `index.html`, set `data-topic="<new>"`.
3. Edit `content.json`: provide both `en` and `zh` with a title, intro, sections and quiz.
4. Add an entry (same `slug`, with `en` / `zh` title and summary) to `data/topics.json`.

---

## 中文

這是一個用 Python 撰寫的本機小型網頁伺服器，提供多個學習主題頁面與小測驗給學生使用。只使用 Python 標準函式庫（3.8 以上），除了 Python 本身外不需要安裝任何套件。

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

### 專案結構

- `setup.ps1` – 在 Windows 上安裝 Git 與 Python
- `server.py` – 靜態檔案伺服器，並提供 `/api/topics`
- `data/topics.json` – 首頁顯示的主題清單（含 `en`、`zh` 標題）
- `public/index.html` – 首頁
- `public/topics/<主題>/` – 每個主題一個獨立資料夾（`math`、`english`、`chinese`），各有 `index.html` 與雙語的 `content.json`
- `public/js/i18n.js` – English / 中文 語言切換（瀏覽器會記住你的選擇）
- `public/js/topic.js` – 依所選語言顯示主題的 `content.json`
- `public/js/quiz.js` – 測驗程式
- `public/css/style.css` – 共用樣式（支援淺色／深色模式）

每個主題資料夾另有 `assets/` 資料夾（圖片、練習題等，可建立任意層級的子資料夾），內容會列在主題頁上。完整架構請見 [WEB_MAP.md](WEB_MAP.md)。

### 新增主題

1. 複製 `public/topics/` 中的任一資料夾（例如 `math`）為 `public/topics/<新主題>/`。
2. 在其 `index.html` 中把 `data-topic="<新主題>"` 改好。
3. 編輯 `content.json`：同時提供 `en` 與 `zh` 的標題、簡介、段落與測驗題。
4. 在 `data/topics.json` 加入對應項目（相同的 `slug`，並提供 `en` / `zh` 標題與簡介）。

---

## License 授權

MIT
