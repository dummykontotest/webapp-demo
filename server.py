"""Local HTTP server and on-device extraction for the B-102 Handover Desk."""
import argparse
import functools
import json
import os
import shutil
import subprocess
import tempfile
import webbrowser
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
MAX_UPLOAD = 20 * 1024 * 1024
IMAGE_FORMATS = {"jpg", "jpeg", "png", "webp", "bmp", "tif", "tiff", "heic", "heif"}


def ocr(path):
    if os.name != "nt":
        return subprocess.run(["tesseract", str(path), "stdout", "-l", "eng"],
                              capture_output=True, check=True, timeout=35, encoding="utf-8").stdout.strip()
    command = ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass",
               "-File", str(ROOT / "ocr.ps1"), str(path)]
    return subprocess.run(command, capture_output=True, check=True,
                          timeout=35, encoding="utf-8").stdout.strip()


def capture_time(path):
    try:
        from PIL import Image
        with Image.open(path) as image:
            exif = image.getexif()
            camera = exif.get_ifd(34665)
            raw = camera.get(36867) or exif.get(306)
            if not raw:
                return None
            time = datetime.strptime(raw, "%Y:%m:%d %H:%M:%S")
            offset = camera.get(36881)
            return time.isoformat() + (offset or "")
    except (ImportError, OSError, ValueError, TypeError):
        return None


def read_pdf(path):
    try:
        from pypdf import PdfReader
    except ImportError as error:
        raise ValueError("PDF import needs pypdf. Use Start.ps1 or install pypdf.") from error
    reader = PdfReader(path)
    if reader.is_encrypted:
        raise ValueError("Import an unlocked copy of the PDF.")
    if len(reader.pages) > 20:
        raise ValueError("Use a PDF with 20 pages or fewer.")
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    if text.strip():
        return text
    renderer = shutil.which("pdftoppm")
    if not renderer:
        raise ValueError("Scanned PDFs need pdftoppm. Upload photos or a text-based PDF.")
    prefix = path.parent / "scan"
    subprocess.run([renderer, "-scale-to", "2100", "-png", str(path), str(prefix)],
                   check=True, timeout=40, capture_output=True)
    return "\n".join(ocr(page) for page in sorted(path.parent.glob("scan-*.png")))


class Handler(SimpleHTTPRequestHandler):
    def send_json(self, status, values):
        payload = json.dumps(values).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_POST(self):
        path = urlsplit(self.path).path
        if not path.startswith("/read/"):
            self.send_json(404, {"error": "Unknown endpoint."})
            return
        origin = self.headers.get("Origin")
        if origin and origin != "http://" + self.headers.get("Host", ""):
            self.send_json(403, {"error": "Open the local app from its server address."})
            return
        return self.extract_upload(path)

    def extract_upload(self, path):
        fmt = path.removeprefix("/read/").lower()
        if fmt not in IMAGE_FORMATS | {"pdf"}:
            self.send_json(415, {"error": "Use a PDF, JPG or PNG file."})
            return
        try:
            size = int(self.headers.get("Content-Length") or 0)
            if not 0 < size <= MAX_UPLOAD:
                raise ValueError("Choose a file under 20 MB.")
            with tempfile.TemporaryDirectory() as directory:
                source = Path(directory) / ("upload." + fmt)
                self.connection.settimeout(30)
                source.write_bytes(self.rfile.read(size))
                text = read_pdf(source) if fmt == "pdf" else ocr(source)
                if not text.strip():
                    raise ValueError("No text was recognized. Try a clearer image or enter details manually.")
                captured = capture_time(source) if fmt in IMAGE_FORMATS else None
            self.send_json(200, {"text": text, "captured": captured})
        except ValueError as error:
            self.send_json(422, {"error": str(error)})
        except Exception as error:
            print(f"Extraction failed ({type(error).__name__}).", flush=True)
            self.send_json(422, {"error": "Could not read this file. Try a clear JPG, PNG or unlocked PDF."})


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--open", action="store_true", help="Open the app in the default browser.")
    args = parser.parse_args()
    handler = functools.partial(Handler, directory=str(ROOT / "dist"))
    with ThreadingHTTPServer((args.host, args.port), handler) as server:
        print(f"Handover Desk at http://{args.host}:{args.port}", flush=True)
        if args.open:
            Thread(target=webbrowser.open,
                   args=(f"http://{args.host}:{args.port}/",), daemon=True).start()
        server.serve_forever()



