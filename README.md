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
- `data/topics.json` – list of topics shown on the home page
- `public/topics/*.html` – one page per topic
- `public/js/quiz.js` – quiz engine, reads questions from `data-quiz` JSON
- `public/css/style.css` – shared styles (light/dark)

### Add a topic

1. Copy a file in `public/topics/` and edit the lesson and quiz.
2. Add an entry (matching `slug`) to `data/topics.json`.

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
- `data/topics.json` – 首頁顯示的主題清單
- `public/topics/*.html` – 每個主題一個頁面
- `public/js/quiz.js` – 測驗程式，從 `data-quiz` 的 JSON 讀取題目
- `public/css/style.css` – 共用樣式（支援淺色／深色模式）

### 新增主題

1. 複製 `public/topics/` 中的任一檔案，修改教學內容與測驗題目。
2. 在 `data/topics.json` 加入對應的項目（`slug` 需與檔名一致）。

---

## License 授權

MIT
