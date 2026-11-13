"""Test setup.

Tests never touch the real (Neon) database. Each run clones a fresh copy of a
local template database, by default the docker container from the README:

    docker run -d --name oceanstays-testdb -e POSTGRES_PASSWORD=testpass \
        -p 127.0.0.1:55432:5432 postgres:18
    # restore OceanStays.backup into oceanstays_test, run migrate.py against it, then:
    # CREATE DATABASE oceanstays_template TEMPLATE oceanstays_test;

Override with TEST_ADMIN_DSN / TEST_TEMPLATE_DB.
"""

import os
from datetime import timedelta

import psycopg2
import pytest
from werkzeug.security import generate_password_hash

ADMIN_DSN = os.environ.get("TEST_ADMIN_DSN", "postgresql://postgres:testpass@127.0.0.1:55432/postgres")
TEMPLATE_DB = os.environ.get("TEST_TEMPLATE_DB", "oceanstays_template")
RUN_DB = "oceanstays_test_run"
PASSWORD = "Passw0rd!test"


def _recreate_database():
    conn = psycopg2.connect(ADMIN_DSN)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute(f"DROP DATABASE IF EXISTS {RUN_DB} WITH (FORCE)")
        cur.execute(f"CREATE DATABASE {RUN_DB} TEMPLATE {TEMPLATE_DB}")
    conn.close()
    dsn = ADMIN_DSN.rsplit("/", 1)[0] + "/" + RUN_DB
    conn = psycopg2.connect(dsn)
    with conn, conn.cursor() as cur:
        cur.execute('UPDATE "user" SET password_hash = %s, status = \'Active\'',
                    (generate_password_hash(PASSWORD),))
    conn.close()
    return dsn


TEST_DSN = _recreate_database()
os.environ["DATABASE_URL"] = TEST_DSN
os.environ["JWT_SECRET"] = "test-secret-not-for-production-0123456789"
os.environ["APP_TIMEZONE"] = "Asia/Colombo"
os.environ["FLASK_DEBUG"] = "0"
os.environ["ASYNC_SIDE_EFFECTS"] = "0"  # write audit/notifications inline so tests can check them

from app import app as flask_app  # noqa: E402  (must import after the env is set)
from services import today  # noqa: E402

# One account per role, as seeded in OceanStays.backup
ACCOUNTS = {
    "GUEST": "kasun.perera@guest.com",
}


def sql(query, params=None):
    conn = psycopg2.connect(TEST_DSN)
    try:
        with conn, conn.cursor() as cur:
            cur.execute(query, params)
            return cur.fetchall() if cur.description else cur.rowcount
    finally:
        conn.close()


def _email_for_role(role_name, offset=0):
    rows = sql('SELECT u.email FROM "user" u JOIN role r ON r.role_id = u.role_id '
               "WHERE r.role_name = %s ORDER BY u.user_id OFFSET %s LIMIT 1", (role_name, offset))
    return rows[0][0]


@pytest.fixture(scope="session")
def app():
    flask_app.config.update(TESTING=True)
    return flask_app


@pytest.fixture()
def client(app):
    return app.test_client()


class Session:
    def __init__(self, client, payload):
        self.client = client
        self.token = payload["token"]
        self.user = payload["user"]
        self.id = payload["user"]["id"]

    def _call(self, method, path, **kwargs):
        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {self.token}"
        return getattr(self.client, method)(path, headers=headers, **kwargs)

    def get(self, path, **kw):
        return self._call("get", path, **kw)

    def post(self, path, **kw):
        return self._call("post", path, **kw)

    def patch(self, path, **kw):
        return self._call("patch", path, **kw)

    def put(self, path, **kw):
        return self._call("put", path, **kw)


ROLE_NAMES = {
    "GUEST": "Guest",
    "RECEPTIONIST": "Receptionist",
    "HOUSEKEEPING": "Housekeeping",
    "SERVICE_STAFF": "Service Staff",
    "ADMIN": "Administrator",
}


@pytest.fixture()
def login(client):
    def _login(role="GUEST", offset=0, email=None):
        email = email or _email_for_role(ROLE_NAMES[role], offset)
        response = client.post("/login", json={"email": email, "password": PASSWORD})
        assert response.status_code == 200, response.get_json()
        return Session(client, response.get_json())

    return _login


@pytest.fixture()
def guest(login):
    return login("GUEST")


@pytest.fixture()
def other_guest(login):
    return login("GUEST", offset=1)


@pytest.fixture()
def reception(login):
    return login("RECEPTIONIST")


@pytest.fixture()
def housekeeper(login):
    return login("HOUSEKEEPING")


@pytest.fixture()
def service_staff(login):
    return login("SERVICE_STAFF")


@pytest.fixture()
def admin(login):
    return login("ADMIN")


def days(n):
    return (today() + timedelta(days=n)).isoformat()


def free_category(check_in, check_out, minimum=1, exclude=()):
    """A room category with at least `minimum` rooms free for the dates."""
    rows = sql(
        """SELECT rc.room_category_id, COUNT(rm.room_id) FROM room_category rc
           JOIN room rm ON rm.room_category_id = rc.room_category_id
           WHERE rm.status NOT IN ('Maintaining', 'Occupied', 'Dirty', 'Cleaning')
             AND NOT EXISTS (SELECT 1 FROM reservation_room rr JOIN reservation r USING (reservation_id)
                             WHERE rr.room_id = rm.room_id
                               AND r.reservation_status IN ('Pending', 'Confirmed', 'Checked in')
                               AND r.check_in_date < %s AND r.check_out_date > %s)
           GROUP BY rc.room_category_id HAVING COUNT(rm.room_id) >= %s
           ORDER BY rc.room_category_id""",
        (check_out, check_in, minimum),
    )
    rows = [r for r in rows if r[0] not in exclude]
    assert rows, "no free room category for the test dates"
    return rows[0][0]


def book(session, check_in, check_out, category=None, guests=1, expect=201):
    category = category or free_category(check_in, check_out)
    response = session.post("/bookings", json={
        "roomTypeId": category, "checkIn": check_in, "checkOut": check_out,
        "guests": {"adults": guests, "children": 0}, "specialRequests": "Test booking",
    })
    assert response.status_code == expect, response.get_json()
    return response.get_json()


def pay(session, booking_id, method="card"):
    intent = session.post("/payments/intent", json={"bookingId": booking_id, "method": method})
    assert intent.status_code == 201, intent.get_json()
    body = intent.get_json()
    confirm = session.post("/payments/confirm", json={
        "intentId": body["intentId"], "bookingId": booking_id, "providerToken": body["clientSecret"]})
    assert confirm.status_code == 200, confirm.get_json()
    return confirm.get_json()
