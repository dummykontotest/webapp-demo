"""Authenticated single-property Handover Desk service."""
import argparse
import functools
import getpass
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
from contextlib import contextmanager
from http.cookies import SimpleCookie
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit

from server import Handler, MAX_UPLOAD, ROOT

DB = Path(os.getenv("HANDOVER_DB", ROOT / "private-data" / "desk.sqlite3"))
ORIGIN = os.getenv("HANDOVER_ORIGIN", "")
SESSION_SECONDS = 12 * 3600
BLANK = '{"out":{},"in":{},"settings":{}}'
ROLES = ("supervisor", "landlord")
STANDING_LIMITS = {"rent", "minimum", "months", "advance", "limit", "gasRate", "hike"}


@contextmanager
def database():
    DB.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB, timeout=10)
    conn.row_factory = sqlite3.Row
    try:
        with conn:
            yield conn
    finally:
        conn.close()


def initialize():
    with database() as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS accounts (role TEXT PRIMARY KEY, password TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, role TEXT NOT NULL, expires INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS attempts (address TEXT PRIMARY KEY, count INTEGER NOT NULL, until INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS draft (id INTEGER PRIMARY KEY CHECK (id=1), revision INTEGER NOT NULL, body TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, bytes BLOB NOT NULL);
        """)
        db.execute("INSERT OR IGNORE INTO draft VALUES (1, 0, ?)", (BLANK,))


def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=32768, r=8, p=1, maxmem=64*1024*1024)
    return salt + ":" + digest.hex()


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def write_account(role, password):
    if not 12 <= len(password) <= 200:
        raise ValueError("Use a password between 12 and 200 characters.")
    with database() as db:
        other = db.execute("SELECT password FROM accounts WHERE role<>?", (role,)).fetchone()
        if other and hmac.compare_digest(password_hash(password, other["password"].split(":")[0]), other["password"]):
            raise ValueError("Use a different password for each role.")
        db.execute("INSERT OR REPLACE INTO accounts VALUES (?, ?)", (role, password_hash(password)))
        db.execute("DELETE FROM sessions WHERE role=?", (role,))


def valid_draft(data):
    if not isinstance(data, dict) or set(data) != {"in", "out", "settings"}:
        return False
    for scope, fields in data.items():
        if not isinstance(fields, dict):
            return False
        for key, value in fields.items():
            if key == "others" and scope == "out":
                if not isinstance(value, list) or not all(
                    isinstance(row, dict) and set(row) == {"name", "amount"} and
                    all(type(cell) in (str, int, float) for cell in row.values()) for row in value
                ):
                    return False
            elif type(value) not in (str, int, float, bool):
                return False
    return True


def review_draft(draft):
    out = {
        key: value for key, value in draft["out"].items()
        if key in {"name", "approved", "deposit", "period", "noticeRent", "others",
                   "billAmount", "billUnits", "counted", "electric", "gas",
                   "electricPrevious", "gasPrevious", "electricRate", "gasRate"}
        or (key.startswith("i") and len(key) > 1 and key[1].isdigit())
        or key.startswith("bill") and key[4:].isdigit()
    }
    incoming = {key: value for key, value in draft["in"].items() if key in {
        "name", "start", "end", "rent", "deposit", "advance", "dueFrom", "dueTo",
        "signDate", "signTime", "office", "termsApproved"
    }}
    settings = {key: value for key, value in draft["settings"].items() if key in {
        "rent", "minimum", "months", "advance", "limit", "gasRate", "hike"
    }}
    return {"out": out, "in": incoming, "settings": settings}


def approval_details(draft, scope):
    review = review_draft(draft)
    relevant = review[scope]
    if scope == "out":
        ignore = {"approved", "counted"}
        settings = ("limit", "gasRate")
    else:
        ignore = {"termsApproved", "signDate", "signTime", "office"}
        settings = ("rent", "minimum", "months", "advance", "hike")
    return ({key: value for key, value in relevant.items()
             if key not in ignore and not (key.startswith("bill") and key[4:].isdigit())},
            tuple(review["settings"].get(key) for key in settings))



class SharedHandler(Handler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'self'; img-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
        if ORIGIN.startswith("https:"):
            self.send_header("Strict-Transport-Security", "max-age=31536000")
        super().end_headers()

    def role(self):
        cookie = SimpleCookie(self.headers.get("Cookie", ""))
        if "desk_session" not in cookie:
            return None
        with database() as db:
            row = db.execute("SELECT role FROM sessions WHERE token=? AND expires>?",
                             (token_hash(cookie["desk_session"].value), int(time.time()))).fetchone()
            return row["role"] if row else None

    def cookie_reply(self, data, token="", age=0):
        body = json.dumps(data).encode()
        self.send_response(200)
        secure = "; Secure" if ORIGIN.startswith("https:") else ""
        self.send_header("Set-Cookie", f"desk_session={token}; Path=/; HttpOnly; SameSite=Strict; Max-Age={age}{secure}")
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_data(self, limit):
        size = int(self.headers.get("Content-Length", "0"))
        if not 0 < size <= limit:
            raise ValueError("Invalid request size.")
        return self.rfile.read(size)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path in ("/", "/index.html"):
            page = (ROOT / "dist" / "index.html").read_text(encoding="utf-8-sig")
            body = page.replace("<html lang=", "<html data-shared lang=", 1).encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            return self.wfile.write(body)
        if path in ("/style.css", "/app.js", "/shared.js"):
            return super().do_GET()
        if path == "/health":
            return self.send_json(200, {"ok": True})
        role = self.role()
        if path == "/api/session":
            return self.send_json(200, {"role": role})
        if not role:
            return self.send_json(401, {"error": "Sign in to continue."})
        with database() as db:
            if path == "/api/draft":
                row = db.execute("SELECT revision, body FROM draft WHERE id=1").fetchone()
                draft = json.loads(row["body"])
                return self.send_json(200, {"revision": row["revision"], "draft": review_draft(draft) if role == "landlord" else draft})
            if path == "/api/files":
                rows = db.execute("SELECT id,name,kind FROM files ORDER BY rowid DESC").fetchall()
                return self.send_json(200, {"files": [dict(row) for row in rows]})
            if path.startswith("/api/files/"):
                row = db.execute("SELECT name,kind,bytes FROM files WHERE id=?", (path.rsplit("/", 1)[1],)).fetchone()
                if row:
                    from urllib.parse import quote
                    self.send_response(200)
                    self.send_header("Content-Type", row["kind"])
                    self.send_header("Content-Disposition", "attachment; filename*=UTF-8''" + quote(row["name"], safe=""))
                    self.send_header("Content-Length", str(len(row["bytes"])))
                    self.end_headers()
                    return self.wfile.write(row["bytes"])
        self.send_json(404, {"error": "Not found."})

    def login(self, data):
        role, password = data.get("role"), data.get("password")
        if role not in ROLES or not isinstance(password, str) or len(password) > 200:
            return self.send_json(400, {"error": "Choose an account and enter its password."})
        now = int(time.time())
        # Limit both individual clients and distributed guesses against a role.
        address = self.client_address[0]
        counters = (("client:" + address, 20), ("role:" + role, 40))
        with database() as db:
            db.execute("DELETE FROM attempts WHERE until<=?", (now,))
            for key, limit in counters:
                row = db.execute("SELECT count FROM attempts WHERE address=?", (key,)).fetchone()
                if row and row["count"] >= limit:
                    return self.send_json(429, {"error": "Too many attempts. Try again in 15 minutes."})
            for key, _ in counters:
                db.execute("""INSERT INTO attempts VALUES (?,1,?)
                              ON CONFLICT(address) DO UPDATE SET count=count+1""", (key, now+900))
            account = db.execute("SELECT password FROM accounts WHERE role=?", (role,)).fetchone()
        stored = account["password"] if account else "0"*32 + ":" + "0"*128
        candidate = password_hash(password, stored.split(":")[0])
        if not hmac.compare_digest(stored, candidate):
            return self.send_json(401, {"error": "Incorrect account or password."})
        token = secrets.token_urlsafe(32)
        with database() as db:
            # A concurrent password reset must invalidate this login as well.
            db.execute("BEGIN IMMEDIATE")
            current = db.execute("SELECT password FROM accounts WHERE role=?", (role,)).fetchone()
            if not current or current["password"] != stored:
                return self.send_json(401, {"error": "Try signing in again."})
            db.execute("DELETE FROM sessions WHERE expires<=?", (now,))
            db.execute("INSERT INTO sessions VALUES (?,?,?)", (token_hash(token), role, now+SESSION_SECONDS))
            db.executemany("DELETE FROM attempts WHERE address=?", [(key,) for key, _ in counters])
        self.cookie_reply({"role": role}, token, SESSION_SECONDS)

    def update(self, data, role):
        revision = data.get("revision")
        if type(revision) is not int:
            return self.send_json(400, {"error": "A draft revision is required."})
        with database() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT revision,body FROM draft WHERE id=1").fetchone()
            if revision != row["revision"]:
                return self.send_json(409, {"error": "This draft changed on another device."})
            if role == "landlord":
                draft = json.loads(row["body"])
                field = data.get("approval")
                allowed = {"settlement": ("out", "approved"), "terms": ("in", "termsApproved")}
                if "limits" in data:
                    limits = data["limits"]
                    if (not isinstance(limits, dict) or set(limits) != STANDING_LIMITS or
                        any(type(value) not in (int, float) or not 0 <= value <= 10**9
                            for value in limits.values())):
                        return self.send_json(400, {"error": "Enter valid nonnegative standing limits."})
                    previous = json.loads(row["body"])
                    draft["settings"].update(limits)
                    for scope, key in allowed.values():
                        if approval_details(draft, scope) != approval_details(previous, scope):
                            draft[scope][key] = False
                else:
                    if not isinstance(field, str) or field not in allowed or type(data.get("value")) is not bool:
                        return self.send_json(403, {"error": "Landlords can update standing limits and approvals only."})
                    scope, key = allowed[field]
                    draft[scope][key] = data["value"]
            else:
                draft = data.get("draft")
                if not valid_draft(draft):
                    return self.send_json(400, {"error": "Invalid draft."})
                current = json.loads(row["body"])
                for key in STANDING_LIMITS:
                    draft["settings"].pop(key, None)
                    if key in current["settings"]:
                        draft["settings"][key] = current["settings"][key]
                for scope, key in (("out", "approved"), ("in", "termsApproved")):
                    draft[scope][key] = bool(draft[scope].get(key) and current[scope].get(key)
                                             and approval_details(draft, scope) == approval_details(current, scope))
                for scope, key in (("out", "contractText"), ("in", "aadhaarText")):
                    draft[scope].pop(key, None)
            db.execute("UPDATE draft SET body=?,revision=revision+1 WHERE id=1", (json.dumps(draft),))
        self.send_json(200, {"draft": review_draft(draft) if role == "landlord" else draft, "revision": revision+1})

    def do_POST(self):
        path = urlsplit(self.path).path
        origin = ORIGIN or "http://" + self.headers.get("Host", "")
        if self.headers.get("Origin") != origin:
            return self.send_json(403, {"error": "Use the configured app address."})
        self.connection.settimeout(40)
        try:
            if path == "/api/login":
                data = json.loads(self.read_data(4096))
                if not isinstance(data, dict):
                    raise ValueError()
                return self.login(data)
            role = self.role()
            if not role:
                return self.send_json(401, {"error": "Sign in to continue."})
            if path == "/api/logout":
                cookie = SimpleCookie(self.headers.get("Cookie", ""))
                with database() as db:
                    db.execute("DELETE FROM sessions WHERE token=?", (token_hash(cookie["desk_session"].value),))
                return self.cookie_reply({"role": None})
            if path == "/api/draft":
                data = json.loads(self.read_data(1024*1024))
                if not isinstance(data, dict):
                    raise ValueError()
                return self.update(data, role)
            if role != "supervisor":
                return self.send_json(403, {"error": "The agent manages files and inspection details."})
            if path.startswith("/read/"):
                return self.extract_upload(path)
            if path == "/api/files/delete":
                data = json.loads(self.read_data(4096))
                identifier = data.get("id") if isinstance(data, dict) else None
                if not isinstance(identifier, str):
                    raise ValueError()
                with database() as db:
                    result = db.execute("DELETE FROM files WHERE id=?", (identifier,))
                if not result.rowcount:
                    return self.send_json(404, {"error": "File not found."})
                return self.send_json(200, {"deleted": True})
            if path == "/api/files":
                payload = self.read_data(MAX_UPLOAD)
                kind = {"application/pdf": b"%PDF-", "image/jpeg": b"\xff\xd8\xff", "image/png": b"\x89PNG\r\n\x1a\n"}
                content_type = self.headers.get("Content-Type")
                if content_type not in kind or not payload.startswith(kind[content_type]):
                    return self.send_json(415, {"error": "Choose a PDF, JPG or PNG."})
                name = unquote(self.headers.get("X-File-Name", "File"))[:180] or "File"
                identifier = secrets.token_hex(16)
                with database() as db:
                    db.execute("INSERT INTO files VALUES (?,?,?,?)", (identifier, name, content_type, payload))
                return self.send_json(201, {"id": identifier})
            return self.send_json(404, {"error": "Not found."})
        except (ValueError, TimeoutError):
            return self.send_json(400, {"error": "Invalid or incomplete request."})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=int(os.getenv("PORT", "8765")))
    parser.add_argument("--set-password", choices=ROLES)
    args = parser.parse_args()
    initialize()
    if args.set_password:
        print("Use a unique password of 12 to 200 characters. Typing is hidden.")
        first = getpass.getpass("New password: ")
        if not 12 <= len(first) <= 200:
            parser.error("Use a password between 12 and 200 characters.")
        if first != getpass.getpass("Confirm password: "):
            parser.error("Passwords do not match.")
        try:
            write_account(args.set_password, first)
        except ValueError as error:
            parser.error(str(error))
        label = "Agent / Broker" if args.set_password == "supervisor" else "Landlord"
        print(f"{label} password saved.")
        return
    if args.host not in ("127.0.0.1", "localhost") and not ORIGIN.startswith("https://"):
        parser.error("Set HANDOVER_ORIGIN to the public HTTPS origin.")
    for role in ROLES:
        seed = os.getenv("HANDOVER_" + role.upper() + "_PASSWORD")
        with database() as db:
            exists = db.execute("SELECT 1 FROM accounts WHERE role=?", (role,)).fetchone()
        if seed and not exists:
            write_account(role, seed)
        elif not exists:
            parser.error("Create the " + role + " account using --set-password or its deployment secret.")
    handler = functools.partial(SharedHandler, directory=str(ROOT / "dist"))
    with ThreadingHTTPServer((args.host, args.port), handler) as service:
        print(f"Handover Desk listening on port {args.port}", flush=True)
        service.serve_forever()


if __name__ == "__main__":
    main()




