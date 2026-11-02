#!/usr/bin/env python3
"""Serve the latest built Hylex dashboard without a Node-based asset server."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import os


import socket

DIST = Path(__file__).resolve().parents[1] / "dist"
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "5173"))


def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


class DashboardHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def send_head(self):
        path = urlsplit(self.path).path
        if path != "/" and not (DIST / path.lstrip("/")).is_file():
            if Path(path).suffix:
                self.send_error(404, "File not found")
                return None
            # Keep client-side routes working if the dashboard adds any later.
            self.path = "/index.html"
        return super().send_head()

    def end_headers(self):
        path = urlsplit(self.path).path
        if path == "/" or path == "/index.html":
            self.send_header("Cache-Control", "no-cache")
        elif path.startswith("/assets/"):
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        super().end_headers()


if not (DIST / "index.html").is_file():
    raise SystemExit("Built dashboard not found. Run `npm run build` first.")

try:
    server = ThreadingHTTPServer((HOST, PORT), DashboardHandler)
except OSError as error:
    raise SystemExit(
        f"Can't start the dashboard at http://{HOST}:{PORT}/ ({error}). "
        "Stop the other server using this port, then run `npm run dev` again."
    ) from error

server.daemon_threads = True
local_ip = get_local_ip()
print("Project Hylex is running!", flush=True)
print(f"  > Local:   http://localhost:{PORT}/", flush=True)
print(f"  > Network: http://{local_ip}:{PORT}/ (use this link on your phone)", flush=True)
print("Keep this process running. Press Control+C to stop the server.", flush=True)

try:
    server.serve_forever()
except KeyboardInterrupt:
    print("\nProject Hylex preview stopped.", flush=True)
finally:
    server.server_close()
