"""Applies pending SQL migrations from ./migrations, in file-name order.

    python migrate.py            # apply pending migrations to DATABASE_URL
    python migrate.py --status   # list applied / pending, change nothing

Each file runs in its own transaction and is recorded in schema_migrations,
so running it again is a no-op. Everyone on the team runs the same files.

After the SQL files, any plain-text passwords (e.g. from a restored backup)
are replaced with hashes. That step runs every time and is also a no-op once
every password is hashed.
"""

import argparse
import hashlib
import os
import sys

import psycopg2

from config import BASE_DIR, Config
from passwords import count_plaintext_passwords, hash_plaintext_passwords

MIGRATIONS_DIR = os.path.join(BASE_DIR, "migrations")


def migration_files():
    return sorted(name for name in os.listdir(MIGRATIONS_DIR) if name.endswith(".sql"))


def ensure_table(cur):
    cur.execute(
        """CREATE TABLE IF NOT EXISTS schema_migrations (
               filename    varchar(255) PRIMARY KEY,
               checksum    varchar(64) NOT NULL,
               applied_at  timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
           )"""
    )


def hash_passwords(conn):
    with conn, conn.cursor() as cur:
        cur.execute("SELECT pg_advisory_xact_lock(4243, 1)")
        changed = hash_plaintext_passwords(cur)
    print(f"Hashed {changed} plain-text password(s)." if changed else "All passwords are hashed.")


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--status", action="store_true", help="show status only")
    args = parser.parse_args()

    if not Config.DATABASE_URL:
        sys.exit("DATABASE_URL is not set (OceanStays_backend/.env).")

    conn = psycopg2.connect(Config.DATABASE_URL, connect_timeout=15)
    try:
        with conn, conn.cursor() as cur:
            ensure_table(cur)
            cur.execute("SELECT filename, checksum FROM schema_migrations")
            applied = dict(cur.fetchall())

        pending = []
        for name in migration_files():
            with open(os.path.join(MIGRATIONS_DIR, name), encoding="utf-8") as handle:
                sql = handle.read()
            checksum = hashlib.sha256(sql.encode()).hexdigest()
            if name in applied:
                note = "" if applied[name] == checksum else "  (file changed since it was applied!)"
                print(f"  applied  {name}{note}")
            else:
                print(f"  pending  {name}")
                pending.append((name, sql, checksum))

        if args.status or not pending:
            print("Nothing to apply." if not pending else f"{len(pending)} pending.")
            if args.status:
                with conn, conn.cursor() as cur:
                    print(f"{count_plaintext_passwords(cur)} user(s) with plain-text passwords.")
            else:
                hash_passwords(conn)
            return

        for name, sql, checksum in pending:
            with conn, conn.cursor() as cur:
                cur.execute("SELECT pg_advisory_xact_lock(4243, 1)")
                cur.execute("SELECT 1 FROM schema_migrations WHERE filename = %s", (name,))
                if cur.fetchone():
                    continue
                cur.execute(sql)
                cur.execute(
                    "INSERT INTO schema_migrations (filename, checksum) VALUES (%s, %s)",
                    (name, checksum),
                )
            print(f"  applied  {name}  ✓")
        print(f"Applied {len(pending)} migration(s).")
        hash_passwords(conn)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
