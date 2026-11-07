"""Zero-dependency learning web server. Run: python server.py [port]

Routes
  /                      static files from public/
  /api/topics            data/topics.json
  /api/assets/<topic>    JSON tree of public/topics/<topic>/assets (any depth)
"""
import json
import os
import re
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(ROOT, "public")
TOPICS_DIR = os.path.join(PUBLIC, "topics")
TOPICS_JSON = os.path.join(ROOT, "data", "topics.json")
SLUG_RE = re.compile(r"^/api/assets/([a-z0-9-]+)/?$")


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


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".json": "application/json",
        ".svg": "image/svg+xml",
        ".txt": "text/plain; charset=utf-8",
        ".md": "text/plain; charset=utf-8",
        ".csv": "text/csv; charset=utf-8",
    }

    def send_json(self, payload, status=200):
        body = payload if isinstance(payload, bytes) else json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?")[0]

        if path == "/api/topics":
            try:
                with open(TOPICS_JSON, "rb") as f:
                    self.send_json(f.read())
            except OSError:
                self.send_error(500, "Cannot read topics")
            return

        match = SLUG_RE.match(path)
        if match:
            assets = os.path.join(TOPICS_DIR, match.group(1), "assets")
            if not os.path.isdir(assets):
                self.send_json({"error": "no assets"}, 404)
                return
            self.send_json(asset_tree(assets))
            return

        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", 3000))
    handler = partial(Handler, directory=PUBLIC)
    with ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"Learning Web running at http://localhost:{port}  (Ctrl+C to stop)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
