"""The secret key that encrypts accounts."""
import os
import sys

from .store import new_secret


def load_secret(path, accounts_folder):
    """Read the key, creating it for a new database.

    A lost key cannot be replaced: existing accounts could never be read again,
    so the server stops rather than quietly making a new one.
    """
    try:
        with open(path, encoding="ascii") as f:
            return f.read().strip()
    except FileNotFoundError:
        pass
    except (OSError, ValueError) as error:
        sys.exit(f"Cannot read the secret key {path}: {error}")
    if any(name.endswith(".json") for name in os.listdir(accounts_folder)):
        sys.exit(f"The secret key {path} is missing, so existing accounts cannot be read. Restore it.")
    secret = new_secret()
    try:
        descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "w", encoding="ascii") as f:
            f.write(secret)
    except OSError as error:
        sys.exit(f"Cannot create the secret key {path}: {error}")
    return secret
