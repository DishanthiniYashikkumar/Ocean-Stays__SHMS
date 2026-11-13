"""Hashes any plain-text passwords in "user".password_hash.

    python scripts/hash_passwords.py           # hash every plain-text password
    python scripts/hash_passwords.py --check   # count plain-text rows, change nothing

`python migrate.py` already does this on every run; this script is kept for
running it on its own. Everyone keeps the same password; only how it is stored
changes. Safe to run twice. Nothing is printed except counts.
"""

import argparse
import os
import sys

import psycopg2

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import Config  # noqa: E402
from passwords import count_plaintext_passwords, hash_plaintext_passwords  # noqa: E402


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    conn = psycopg2.connect(Config.DATABASE_URL, connect_timeout=15)
    try:
        with conn, conn.cursor() as cur:
            if args.check:
                print(f"{count_plaintext_passwords(cur)} user(s) with plain-text passwords.")
                return
            print(f"Hashed {hash_plaintext_passwords(cur)} password(s).")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
