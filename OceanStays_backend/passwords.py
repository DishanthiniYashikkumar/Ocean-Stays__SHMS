"""Password hashing: the only place passwords are hashed or checked.

Passwords are stored as werkzeug hashes ("scrypt:32768:8:1$<salt>$<hash>").
Plain text is never accepted at sign-in; any plain-text rows left in a database
(e.g. a freshly restored backup) are hashed by `python migrate.py`.
"""

from werkzeug.security import check_password_hash, generate_password_hash

PREFERRED_METHOD = "scrypt"
HASH_METHODS = ("scrypt", "pbkdf2")


def hash_password(password):
    return generate_password_hash(password, method=PREFERRED_METHOD)


def is_hashed(stored):
    """True when `stored` looks like a werkzeug hash, not a plain password."""
    if not isinstance(stored, str):
        return False
    parts = stored.split("$")
    if len(parts) != 3 or not all(parts):
        return False
    method = parts[0].split(":", 1)[0]
    return method in HASH_METHODS


def verify_password(stored, candidate):
    """Checks a sign-in attempt. Plain-text stored values never match."""
    if not is_hashed(stored) or not isinstance(candidate, str):
        return False
    return check_password_hash(stored, candidate)


def needs_rehash(stored):
    """True when a valid hash uses an older method than PREFERRED_METHOD."""
    return is_hashed(stored) and not stored.startswith(PREFERRED_METHOD + ":")


# Checked when no account matches, so a wrong email takes as long as a wrong password.
DUMMY_HASH = hash_password("dummy-password-for-timing")


def count_plaintext_passwords(cur):
    cur.execute('SELECT password_hash FROM "user"')
    return sum(1 for (stored,) in cur.fetchall() if not is_hashed(stored))


def hash_plaintext_passwords(cur):
    """Replaces every plain-text password with its hash. Returns how many changed.

    Everyone keeps the same password; only how it is stored changes. Rows that
    are already hashed are skipped, so it is safe to run any number of times.
    Empty / NULL values are left alone (they can never sign in).
    """
    cur.execute('SELECT user_id, password_hash FROM "user" FOR UPDATE')
    changed = 0
    for user_id, stored in cur.fetchall():
        if not stored or is_hashed(stored):
            continue
        hashed = hash_password(stored)
        if not check_password_hash(hashed, stored):
            raise RuntimeError(f"Hash verification failed for user {user_id}")
        cur.execute('UPDATE "user" SET password_hash = %s WHERE user_id = %s', (hashed, user_id))
        changed += 1
    return changed
