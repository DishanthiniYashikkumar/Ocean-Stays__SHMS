"""Database access: one connection pool and a few small helpers.

Every helper returns rows as dicts and always hands its connection back to the
pool, even when the query fails.

    rows = query("SELECT * FROM room WHERE status = %s", ("Available",))
    row  = query_one("SELECT ... WHERE id = %s", (room_id,))
    with transaction() as cur:          # commit on success, rollback on error
        cur.execute("UPDATE ...")
"""

import threading
import time
from contextlib import contextmanager

import psycopg2
import psycopg2.extras
import psycopg2.pool

_pool = None
_pool_lock = threading.Lock()
_last_used = {}

# Neon suspends idle computes and drops their connections. A pooled
# connection that sat unused for longer than this is checked before reuse.
_STALE_AFTER_SECONDS = 30


class DatabaseUnavailable(Exception):
    """Raised when no working connection can be obtained."""


def init_pool(dsn, minconn=1, maxconn=12):
    global _pool
    with _pool_lock:
        if _pool is not None:
            _pool.closeall()
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn,
            maxconn,
            dsn,
            connect_timeout=10,
            keepalives=1,
            keepalives_idle=30,
            keepalives_interval=10,
            keepalives_count=3,
            cursor_factory=psycopg2.extras.RealDictCursor,
        )


def close_pool():
    global _pool
    with _pool_lock:
        if _pool is not None:
            _pool.closeall()
            _pool = None


def _checkout():
    if _pool is None:
        raise DatabaseUnavailable("The database pool has not been initialised.")

    last_error = None
    for _ in range(3):
        try:
            conn = _pool.getconn()
        except psycopg2.pool.PoolError as error:
            raise DatabaseUnavailable("Too many concurrent requests.") from error
        except psycopg2.OperationalError as error:
            last_error = error
            continue

        if conn.closed:
            _pool.putconn(conn, close=True)
            continue

        idle = time.monotonic() - _last_used.get(id(conn), time.monotonic())
        if idle > _STALE_AFTER_SECONDS:
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                conn.rollback()
            except psycopg2.Error as error:
                last_error = error
                _pool.putconn(conn, close=True)
                continue
        return conn

    raise DatabaseUnavailable("Could not connect to the database.") from last_error


def _checkin(conn):
    broken = bool(conn.closed)
    if not broken:
        try:
            conn.rollback()
        except psycopg2.Error:
            broken = True
    _last_used[id(conn)] = time.monotonic()
    _pool.putconn(conn, close=broken)


@contextmanager
def connection():
    conn = _checkout()
    try:
        yield conn
    finally:
        _checkin(conn)


@contextmanager
def transaction():
    """Yields a cursor; commits when the block succeeds, rolls back otherwise."""
    with connection() as conn:
        try:
            with conn.cursor() as cur:
                yield cur
            conn.commit()
        except BaseException:
            if not conn.closed:
                conn.rollback()
            raise


def query(sql, params=None):
    with connection() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        return [dict(row) for row in cur.fetchall()]


def query_one(sql, params=None):
    with connection() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        row = cur.fetchone()
        return dict(row) if row else None


def scalar(sql, params=None):
    row = query_one(sql, params)
    return next(iter(row.values())) if row else None


def execute(sql, params=None):
    """Runs one write statement in its own transaction; returns rowcount."""
    with transaction() as cur:
        cur.execute(sql, params)
        return cur.rowcount


def fetch_all(cur, sql, params=None):
    cur.execute(sql, params)
    return [dict(row) for row in cur.fetchall()]


def fetch_one(cur, sql, params=None):
    cur.execute(sql, params)
    row = cur.fetchone()
    return dict(row) if row else None
