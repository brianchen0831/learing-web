"""Zero-dependency learning web server. Run: python server.py [port]"""
import json
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(ROOT, "public")
TOPICS = os.path.join(ROOT, "data", "topics.json")


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".json": "application/json",
        ".svg": "image/svg+xml",
    }

    def do_GET(self):
        if self.path.split("?")[0] == "/api/topics":
            try:
                with open(TOPICS, "rb") as f:
                    body = f.read()
            except OSError:
                self.send_error(500, "Cannot read topics")
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
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
