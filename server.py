"""Zero-dependency learning web server. Run: python server.py [port]

Routes
  /api/topics            data/topics.json
  /api/assets/<topic>    JSON tree of public/topics/<topic>/assets (any depth);
                         <topic> may be a subtopic, such as english/vocabulary
  /api/wordlists/<topic>/<sub>        word lists in that database folder;
                                      POST creates a new list
  /api/wordlists/<topic>/<sub>/<id>   one word list; <id> may include folders
  /api/account/...       register, login, logout, avatar and me (see account/)
  other files            static files from public/ (Vue app, content, assets)
  other paths            public/index.html (the Vue Router app handles them)
"""
import json
import os
import re
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote

try:
    from account.doll import Catalog
    from account.keys import load_secret
    from account.rewards import TaskBook
    from account.routes import ACTIONS as ACCOUNT_ACTIONS, AccountRoutes
    from account.store import AccountStore, Sessions
except ModuleNotFoundError as error:
    sys.exit(f"Missing package {error.name}. Run: python -m pip install -r requirements.txt")

ROOT = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(ROOT, "public")
TOPICS_DIR = os.path.join(PUBLIC, "topics")
TOPICS_JSON = os.path.join(ROOT, "data", "topics.json")
SLUG_RE = re.compile(r"^/api/assets/([a-z0-9-]+(?:/[a-z0-9-]+)?)/?$")
WORDLIST_RE = re.compile(r"^/api/wordlists/([a-z0-9-]+/[a-z0-9-]+)(?:/(.+?))?/?$")
MEANING_FIELDS = ("meaning", "chinese", "example")
MAX_BODY = 1024 * 1024
MAX_TITLE = 100
MAX_TEXT = 500
MAX_WORDS = 2000
MAX_MEANINGS = 20
LOCAL_HOSTS = ("localhost", "127.0.0.1")
CONFIG_FILE = os.path.join(ROOT, "config.json")
DEFAULT_CONFIG = {"database_path": "database", "secret_key_path": "secret.key"}
DOLL_CATALOG = os.path.join(PUBLIC, "assets", "avatars", "doll", "parts.json")
ACCOUNTS_FOLDER = "accounts"
TASK_FOLDER = "task"  # <database>/<topic>/task/ holds that topic's task files


def load_config():
    """Read config.json if present; settings it leaves out keep their defaults."""
    config = dict(DEFAULT_CONFIG)
    if os.path.isfile(CONFIG_FILE):
        try:
            # utf-8-sig also accepts the byte order mark some Windows editors add
            with open(CONFIG_FILE, encoding="utf-8-sig") as f:
                user_config = json.load(f)
        except (OSError, ValueError) as error:
            sys.exit(f"Cannot read config.json: {error}")
        if not isinstance(user_config, dict):
            sys.exit("config.json must contain a JSON object")
        config.update(user_config)
    return config


def config_path(config, setting):
    """Absolute path from a setting. Relative paths start at the project folder."""
    path = config[setting]
    if not isinstance(path, str) or not path.strip():
        sys.exit(f'config.json: "{setting}" must be a non-empty string')
    return os.path.normpath(os.path.join(ROOT, os.path.expanduser(path)))


def database_dir(config):
    return config_path(config, "database_path")


def topic_folders():
    """Topic and subtopic paths, such as "math" and "english/vocabulary"."""
    with open(TOPICS_JSON, encoding="utf-8") as f:
        topics = json.load(f)
    folders = []
    for topic in topics:
        slug = topic["slug"]
        folders.append(slug)
        try:
            with open(os.path.join(TOPICS_DIR, slug, "content.json"), encoding="utf-8") as f:
                subtopics = json.load(f).get("subtopics", [])
        except (OSError, ValueError):
            continue
        folders.extend(f"{slug}/{sub['slug']}" for sub in subtopics)
    return folders


def ensure_database(path):
    """Create the database folder with one folder per topic and subtopic, and a task
    folder in each top-level topic."""
    task_folders = [f"{topic}/{TASK_FOLDER}" for topic in topic_folders() if "/" not in topic]
    try:
        for folder in [*topic_folders(), *task_folders, ACCOUNTS_FOLDER]:
            os.makedirs(os.path.join(path, *folder.split("/")), exist_ok=True)
    except OSError as error:
        sys.exit(f"Cannot create database folder {path}: {error}")


def asset_tree(directory):
    """Recursively describe a directory: folders first, then files, A-Z."""
    entries = []
    names = sorted(
        os.listdir(directory),
        key=lambda n: (not os.path.isdir(os.path.join(directory, n)), n.lower()),
    )
    for name in names:
        full = os.path.join(directory, name)
        if name.startswith(".") or os.path.islink(full):
            continue
        if os.path.isdir(full):
            entries.append({"name": name, "type": "dir", "children": asset_tree(full)})
        else:
            entries.append({"name": name, "type": "file", "size": os.path.getsize(full)})
    return entries


def read_wordlist(path):
    """Return a word list file's data, or None if it is missing or not valid."""
    try:
        with open(path, encoding="utf-8-sig") as f:
            data = json.load(f)
    except (OSError, ValueError):
        return None
    words = data.get("words") if isinstance(data, dict) else None
    if not isinstance(words, list):
        return None
    for word in words:
        if not isinstance(word, dict) or not isinstance(word.get("word"), str):
            return None
        meanings = word.get("meanings")
        if not isinstance(meanings, list) or not all(isinstance(m, dict) for m in meanings):
            return None
    return data


def clean_text(value, limit):
    """Trimmed text, or None if the value is not a string or is too long."""
    if not isinstance(value, str) or len(value.strip()) > limit:
        return None
    return value.strip()


def clean_wordlist(data):
    """Validate a submitted list. Returns (word list, None) or (None, error)."""
    if not isinstance(data, dict):
        return None, "expected a JSON object"
    title = clean_text(data.get("title"), MAX_TITLE)
    if not title:
        return None, "the list needs a name"
    words = data.get("words")
    if not isinstance(words, list) or not 1 <= len(words) <= MAX_WORDS:
        return None, "the list needs at least one word"
    cleaned = []
    for item in words:
        word = clean_text(item.get("word"), MAX_TITLE) if isinstance(item, dict) else None
        if not word:
            return None, "every word needs text"
        raw_meanings = item.get("meanings")
        if not isinstance(raw_meanings, list) or len(raw_meanings) > MAX_MEANINGS:
            return None, f"{word}: meanings must be a list"
        meanings = []
        for raw in raw_meanings:
            if not isinstance(raw, dict):
                return None, f"{word}: each meaning must be an object"
            meaning = {key: clean_text(raw.get(key, ""), MAX_TEXT) for key in MEANING_FIELDS}
            if None in meaning.values():
                return None, f"{word}: a meaning is too long or not text"
            if any(meaning.values()):
                meanings.append(meaning)
        if not meanings:
            return None, f"{word}: add at least one meaning"
        cleaned.append({"word": word, "meanings": meanings})
    return {"title": {"en": title, "zh": title}, "words": cleaned}, None


def save_new_wordlist(folder, wordlist):
    """Write a new list file and return its id. Existing files are never replaced."""
    english_title = wordlist["title"]["en"].lower()
    base = re.sub(r"[^a-z0-9]+", "-", english_title).strip("-")[:40].strip("-") or "list"
    os.makedirs(folder, exist_ok=True)
    number = 1
    while True:
        list_id = base if number == 1 else f"{base}-{number}"
        try:
            with open(os.path.join(folder, list_id + ".json"), "x", encoding="utf-8") as f:
                json.dump(wordlist, f, ensure_ascii=False, indent=2)
                f.write("\n")
            return list_id
        except FileExistsError:
            number += 1


def wordlist_index(folder, prefix=""):
    """Summary of each word list, including subfolders; folders come first.

    A list's id is its path without .json, such as "grade1/part1".
    Broken files are flagged, not hidden.
    """
    if not os.path.isdir(folder):
        return []
    subfolders, files = [], []
    for name in sorted(os.listdir(folder), key=str.lower):
        full = os.path.join(folder, name)
        if name.startswith(".") or os.path.islink(full):
            continue
        if os.path.isdir(full):
            subfolders.append(name)
        elif os.path.splitext(name)[1].lower() == ".json":
            files.append(name)
    lists = []
    for name in subfolders:
        lists.extend(wordlist_index(os.path.join(folder, name), f"{prefix}{name}/"))
    for name in sorted(files, key=lambda n: os.path.splitext(n)[0].lower()):
        list_id = prefix + os.path.splitext(name)[0]
        data = read_wordlist(os.path.join(folder, name))
        if data is None:
            lists.append({"id": list_id, "invalid": True})
        else:
            lists.append({"id": list_id, "title": data.get("title"), "count": len(data["words"])})
    return lists


def wordlist_file(folder, list_id):
    """Path of a list inside folder, or None if the id would lead anywhere else."""
    parts = list_id.split("/")
    for part in parts:
        if not part or part.startswith(".") or any(c in part for c in '\\:\0'):
            return None
    path = os.path.join(folder, *parts) + ".json"
    root = os.path.realpath(folder) + os.sep
    return path if os.path.realpath(path).startswith(root) else None


class Handler(AccountRoutes, SimpleHTTPRequestHandler):
    database = None  # set in main()

    @staticmethod
    def quiz_source(topic):
        """The subtopic whose word lists a vocabulary-test page uses, or None."""
        if topic not in topic_folders():
            return None
        try:
            with open(os.path.join(TOPICS_DIR, *topic.split("/"), "content.json"), encoding="utf-8") as f:
                content = json.load(f)
        except (OSError, ValueError):
            return None
        source = content.get("source") if content.get("view") == "vocabulary-test" else None
        return source if source in topic_folders() else None

    def words_in(self, source, lists):
        """Number of different words in the lists, or None if one is missing or broken."""
        folder = os.path.join(self.database, *source.split("/"))
        words = set()
        for list_id in lists:
            path = wordlist_file(folder, list_id)
            data = read_wordlist(path) if path else None
            if data is None:
                return None
            words.update(w["word"].strip().lower() for w in data["words"])
        return len(words)

    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".json": "application/json",
        ".svg": "image/svg+xml",
        ".txt": "text/plain; charset=utf-8",
        ".md": "text/plain; charset=utf-8",
        ".csv": "text/csv; charset=utf-8",
    }

    def send_json(self, payload, status=200, cookie=None):
        body = payload if isinstance(payload, bytes) else json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?")[0]

        if path == "/api/account/me":
            self.account_me()
            return

        if path == "/api/account/tasks":
            self.account_tasks()
            return

        if path == "/api/topics":
            try:
                with open(TOPICS_JSON, "rb") as f:
                    self.send_json(f.read())
            except OSError:
                self.send_error(500, "Cannot read topics")
            return

        match = WORDLIST_RE.match(path)
        if match:
            folder = os.path.join(self.database, *match.group(1).split("/"))
            if match.group(2) is None:
                self.send_json(wordlist_index(folder))
                return
            file = wordlist_file(folder, unquote(match.group(2)))
            data = read_wordlist(file) if file else None
            if data is None:
                self.send_json({"error": "word list not found or not valid"}, 404)
            else:
                self.send_json(data)
            return

        match = SLUG_RE.match(path)
        if match:
            assets = os.path.join(TOPICS_DIR, match.group(1), "assets")
            if not os.path.isdir(assets):
                self.send_json({"error": "no assets"}, 404)
                return
            self.send_json(asset_tree(assets))
            return

        # Single-page app: real files are served as-is; extension-less paths such as
        # /topics/math or /topics/math/ are client-side routes and get index.html.
        # (Directories are never listed.)
        fs_path = self.translate_path(self.path)
        if os.path.isfile(fs_path):
            super().do_GET()
        elif "." in path.rstrip("/").rsplit("/", 1)[-1]:
            self.send_error(404, "File not found")
        else:
            self.send_index()

    def from_this_site(self):
        """Only this site's own pages may write. Blocks other websites in the browser."""
        host = self.headers.get("Host", "")
        origin = self.headers.get("Origin")
        return host.split(":")[0] in LOCAL_HOSTS and origin in (None, f"http://{host}")

    def read_request(self):
        """Parsed JSON body of a request from this site, or None after replying with an error."""
        if not self.from_this_site():
            self.send_json({"error": "forbidden"}, 403)
            return None
        if self.headers.get("Content-Type", "").split(";")[0].strip() != "application/json":
            self.send_json({"error": "expected application/json"}, 415)
            return None
        try:
            length = int(self.headers.get("Content-Length", ""))
        except ValueError:
            self.send_json({"error": "missing length"}, 411)
            return None
        if not 0 < length <= MAX_BODY:
            self.send_json({"error": "the list is too large"}, 413)
            return None
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except ValueError:
            self.send_json({"error": "not valid JSON"}, 400)
            return None

    def do_POST(self):
        path = self.path.split("?")[0]
        if path in ACCOUNT_ACTIONS:
            self.handle_account_post(path)
            return

        match = WORDLIST_RE.match(path)
        if not match or match.group(2) is not None or match.group(1) not in topic_folders():
            self.send_json({"error": "not found"}, 404)
            return
        data = self.read_request()
        if data is None:
            return
        wordlist, error = clean_wordlist(data)
        if error:
            self.send_json({"error": error}, 400)
            return
        folder = os.path.join(self.database, *match.group(1).split("/"))
        try:
            list_id = save_new_wordlist(folder, wordlist)
        except OSError:
            self.send_json({"error": "could not save the list"}, 500)
            return
        self.send_json({"id": list_id}, 201)

    def send_index(self):
        with open(os.path.join(PUBLIC, "index.html"), "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", 3000))
    config = load_config()
    database = database_dir(config)
    ensure_database(database)
    accounts_folder = os.path.join(database, ACCOUNTS_FOLDER)
    secret = load_secret(config_path(config, "secret_key_path"), accounts_folder)
    Handler.database = database
    catalog = Catalog(DOLL_CATALOG)
    def task_files():
        """Every .json file in each top-level topic's task folder, such as
        <database>/english/task/. One file per kind of task keeps them easy to manage."""
        folders = [(os.path.join(database, topic, TASK_FOLDER), topic)
                   for topic in topic_folders() if "/" not in topic]
        files = []
        for folder, topic in folders:
            try:
                names = sorted(os.listdir(folder), key=str.lower)
            except OSError:
                continue
            for name in names:
                if name.lower().endswith(".json"):
                    path = os.path.join(folder, name)
                    if os.path.isfile(path) and not os.path.islink(path):
                        files.append((path, topic))
        return files

    tasks = TaskBook(task_files, catalog)
    Handler.accounts = AccountStore(accounts_folder, secret, catalog, database, tasks)
    Handler.sessions = Sessions()
    handler = partial(Handler, directory=PUBLIC)
    with ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"Database: {database}")
        print(f"Learning Web running at http://localhost:{port}  (Ctrl+C to stop)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
