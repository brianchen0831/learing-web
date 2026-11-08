"""User accounts: encrypted storage, password checks and login sessions.

Each account is one file in the database's accounts folder. The file name is a
keyed hash of the username and the content is a single encrypted block, so
without the secret key a file reveals nothing, not even the name.
"""
import base64
import hashlib
import hmac
import json
import os
import secrets
import threading
import time
import unicodedata

from cryptography.fernet import Fernet, InvalidToken

from .doll import AVATAR_VERSION

SCRYPT = {"n": 2 ** 15, "r": 8, "p": 1, "maxmem": 64 * 1024 * 1024, "dklen": 32}
MIN_PASSWORD = 6
MAX_PASSWORD = 128
MAX_NAME = 30
MAX_FAILS = 5
LOCK_SECONDS = 60
SESSION_SECONDS = 7 * 24 * 60 * 60
STARTING_COINS = 300


class AccountError(Exception):
    """A problem to report to the user. The message is an error code."""


def new_secret():
    return base64.urlsafe_b64encode(secrets.token_bytes(32)).decode("ascii")


def hash_password(password, salt):
    return hashlib.scrypt(password.encode("utf-8"), salt=salt, **SCRYPT)


def clean_name(name):
    if not isinstance(name, str):
        raise AccountError("invalid_name")
    name = unicodedata.normalize("NFKC", name).strip()
    if not 1 <= len(name) <= MAX_NAME or not name.isprintable():
        raise AccountError("invalid_name")
    return name


def check_password(password):
    if not isinstance(password, str) or not MIN_PASSWORD <= len(password) <= MAX_PASSWORD:
        raise AccountError("invalid_password")


def clean_avatar(avatar, catalog, owned):
    """Check a submitted avatar against the doll catalog. Missing required layers get defaults.

    `parts` may name one part per layer; a layer set to None is taken off, unless it is required.
    """
    if not isinstance(avatar, dict):
        raise AccountError("invalid_avatar")
    gender, skin = avatar.get("gender"), avatar.get("skin")
    if gender not in catalog.genders or skin not in catalog.skins:
        raise AccountError("invalid_avatar")
    given = avatar.get("parts") or {}
    if not isinstance(given, dict):
        raise AccountError("invalid_avatar")
    parts = catalog.default_parts(gender)
    for layer, part_id in given.items():
        if layer not in catalog.layers or layer == "body":
            raise AccountError("invalid_avatar")
        if part_id is None:
            if layer in catalog.required:
                raise AccountError("invalid_avatar")
            parts.pop(layer, None)
            continue
        part = catalog.parts.get(part_id) if isinstance(part_id, str) else None
        if not part:
            raise AccountError("unknown_item")
        if part["layer"] != layer or not catalog.fits(part, gender):
            raise AccountError("invalid_avatar")
        if part.get("price", 0) > 0 and part_id not in owned:
            raise AccountError("not_owned")
        parts[layer] = part_id
    if any(layer not in parts for layer in catalog.required):
        raise AccountError("invalid_avatar")
    return {"version": AVATAR_VERSION, "gender": gender, "skin": skin, "parts": parts}


class AccountStore:
    def __init__(self, folder, secret, catalog):
        secret = base64.urlsafe_b64decode(secret)
        derive = lambda label: hmac.new(secret, label, hashlib.sha256).digest()
        self.folder = folder
        self.cipher = Fernet(base64.urlsafe_b64encode(derive(b"encrypt")))
        self.index_key = derive(b"index")
        self.catalog = catalog
        self.failures = {}
        self.lock = threading.Lock()
        self.write_lock = threading.Lock()  # one change to an account at a time

    def account_id(self, name):
        key = unicodedata.normalize("NFKC", name).strip().casefold().encode("utf-8")
        return hmac.new(self.index_key, key, hashlib.sha256).hexdigest()

    def _path(self, account_id):
        return os.path.join(self.folder, account_id + ".json")

    def _encrypt(self, record):
        return self.cipher.encrypt(json.dumps(record, ensure_ascii=False).encode("utf-8")).decode("ascii")

    def _load(self, account_id):
        try:
            with open(self._path(account_id), encoding="ascii") as f:
                record = json.loads(self.cipher.decrypt(f.read().encode("ascii")))
        except (OSError, ValueError, InvalidToken):
            return None
        return self._reset_old(record)

    def _reset_old(self, record):
        """Test mode: an account from before the paper doll starts over with the default
        avatar, starting coins and nothing owned. Gender and skin color are kept.
        The result is the same every time, so it is saved only with the account's next change."""
        avatar = record.get("avatar") or {}
        if avatar.get("version") == AVATAR_VERSION:
            return record
        gender = {"boy": "male", "girl": "female"}.get(avatar.get("gender"), avatar.get("gender"))
        record["avatar"] = self.catalog.default_avatar(gender, avatar.get("skin"))
        record["coins"] = STARTING_COINS
        record["owned"] = []
        return record

    def _save(self, account_id, record):
        temp = self._path(account_id) + ".tmp"
        with open(temp, "w", encoding="ascii") as f:
            f.write(self._encrypt(record))
        os.replace(temp, self._path(account_id))

    @staticmethod
    def public(record):
        return {
            "name": record["name"],
            "avatar": record["avatar"],
            "coins": record.get("coins", STARTING_COINS),
            "owned": record.get("owned", []),
        }

    def create(self, name, password, avatar):
        name = clean_name(name)
        check_password(password)
        avatar = clean_avatar(avatar, self.catalog, [])
        salt = secrets.token_bytes(16)
        record = {
            "name": name,
            "salt": base64.b64encode(salt).decode("ascii"),
            "password": base64.b64encode(hash_password(password, salt)).decode("ascii"),
            "avatar": avatar,
            "coins": STARTING_COINS,
            "owned": [],
            "created": int(time.time()),
        }
        account_id = self.account_id(name)
        try:
            with open(self._path(account_id), "x", encoding="ascii") as f:
                f.write(self._encrypt(record))
        except FileExistsError:
            raise AccountError("name_taken") from None
        return account_id, self.public(record)

    def _locked(self, account_id):
        with self.lock:
            count, until = self.failures.get(account_id, (0, 0))
            if until and until <= time.time():
                del self.failures[account_id]
                return False
            return until > time.time()

    def _failed(self, account_id):
        with self.lock:
            count = self.failures.get(account_id, (0, 0))[0] + 1
            until = time.time() + LOCK_SECONDS if count >= MAX_FAILS else 0
            self.failures[account_id] = (count, until)

    def login(self, name, password):
        """Returns (account_id, public data). Unknown names and wrong passwords look the same."""
        if not isinstance(name, str) or not isinstance(password, str) or len(password) > MAX_PASSWORD:
            raise AccountError("bad_login")
        account_id = self.account_id(name)
        if self._locked(account_id):
            raise AccountError("locked")
        record = self._load(account_id)
        salt = base64.b64decode(record["salt"]) if record else bytes(16)
        attempt = hash_password(password, salt)
        expected = base64.b64decode(record["password"]) if record else bytes(32)
        if not record or not hmac.compare_digest(attempt, expected):
            self._failed(account_id)
            raise AccountError("bad_login")
        with self.lock:
            self.failures.pop(account_id, None)
        return account_id, self.public(record)

    def get(self, account_id):
        record = self._load(account_id)
        return self.public(record) if record else None

    def set_avatar(self, account_id, avatar):
        with self.write_lock:
            record = self._load(account_id)
            if not record:
                raise AccountError("invalid_avatar")
            record["avatar"] = clean_avatar(avatar, self.catalog, record.get("owned", []))
            self._save(account_id, record)
            return self.public(record)

    def buy(self, account_id, item_id):
        """Spend coins on a shop item. The price always comes from the server's catalog."""
        if not isinstance(item_id, str) or not self.catalog.is_for_sale(item_id):
            raise AccountError("unknown_item")
        with self.write_lock:
            record = self._load(account_id)
            if not record:
                raise AccountError("not_logged_in")
            owned = record.setdefault("owned", [])
            coins = record.get("coins", STARTING_COINS)
            price = self.catalog.parts[item_id]["price"]
            if item_id in owned:
                raise AccountError("already_owned")
            if not self.catalog.fits(self.catalog.parts[item_id], record["avatar"]["gender"]):
                raise AccountError("wrong_body")
            if coins < price:
                raise AccountError("not_enough_coins")
            record["coins"] = coins - price
            owned.append(item_id)
            self._save(account_id, record)
            return self.public(record)


class Sessions:
    """Login sessions, kept in memory. Restarting the server logs everyone out."""

    def __init__(self):
        self.sessions = {}
        self.lock = threading.Lock()

    def create(self, account_id):
        token = secrets.token_urlsafe(32)
        with self.lock:
            now = time.time()
            self.sessions = {k: v for k, v in self.sessions.items() if v[1] > now}
            self.sessions[token] = (account_id, now + SESSION_SECONDS)
        return token

    def get(self, token):
        with self.lock:
            session = self.sessions.get(token)
        return session[0] if session and session[1] > time.time() else None

    def delete(self, token):
        with self.lock:
            self.sessions.pop(token, None)
