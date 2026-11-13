import re

import psycopg2
import pytest
from werkzeug.security import generate_password_hash

from conftest import PASSWORD, TEST_DSN, _email_for_role, sql
from passwords import count_plaintext_passwords, hash_plaintext_passwords, is_hashed


@pytest.mark.parametrize("role", ["GUEST", "RECEPTIONIST", "HOUSEKEEPING", "SERVICE_STAFF", "ADMIN"])
def test_login_returns_token_and_role(login, role):
    session = login(role)
    assert session.token.count(".") == 2  # a real JWT
    assert session.user["role"] == role
    me = session.get("/auth/me")
    assert me.status_code == 200 and me.get_json()["role"] == role


def test_login_updates_last_sign_in_and_audits(client):
    email = _email_for_role("Guest", 2)
    sql('UPDATE "user" SET last_sign_in = NULL WHERE email = %s', (email,))
    assert client.post("/login", json={"email": email, "password": PASSWORD}).status_code == 200
    assert sql('SELECT last_sign_in FROM "user" WHERE email = %s', (email,))[0][0] is not None
    assert sql("SELECT COUNT(*) FROM audit_log al JOIN \"user\" u USING (user_id) "
               "WHERE u.email = %s AND al.action_type = 'Login' AND al.result_status = 'Success'", (email,))[0][0] >= 1


def test_login_by_username_works(client):
    username = sql('SELECT username, email FROM "user" ORDER BY user_id LIMIT 1')[0][0]
    assert client.post("/login", json={"username": username, "password": PASSWORD}).status_code == 200


def test_login_wrong_password_is_401_and_audited(client):
    email = _email_for_role("Guest")
    before = sql("SELECT COUNT(*) FROM audit_log WHERE action_type = 'Login' AND result_status = 'Failed'")[0][0]
    response = client.post("/login", json={"email": email, "password": "wrong-password"})
    assert response.status_code == 401
    assert "message" in response.get_json()
    after = sql("SELECT COUNT(*) FROM audit_log WHERE action_type = 'Login' AND result_status = 'Failed'")[0][0]
    assert after == before + 1


def test_login_missing_fields_is_400(client):
    assert client.post("/login", json={}).status_code == 400
    assert client.post("/login", data="not json", content_type="text/plain").status_code == 400


def _restore_password(email):
    sql('UPDATE "user" SET password_hash = %s WHERE email = %s', (generate_password_hash(PASSWORD), email))


def test_plain_text_password_cannot_log_in(client):
    email = _email_for_role("Guest", 3)
    sql('UPDATE "user" SET password_hash = %s WHERE email = %s', ("legacy-plain-1", email))
    try:
        assert client.post("/login", json={"email": email, "password": "legacy-plain-1"}).status_code == 401
    finally:
        _restore_password(email)


def test_migration_hashes_plain_text_passwords(client):
    email = _email_for_role("Guest", 3)
    sql('UPDATE "user" SET password_hash = %s WHERE email = %s', ("legacy-plain-2", email))
    try:
        conn = psycopg2.connect(TEST_DSN)
        try:
            with conn, conn.cursor() as cur:
                assert count_plaintext_passwords(cur) == 1
                assert hash_plaintext_passwords(cur) == 1
                assert hash_plaintext_passwords(cur) == 0
        finally:
            conn.close()
        stored = sql('SELECT password_hash FROM "user" WHERE email = %s', (email,))[0][0]
        assert stored.startswith("scrypt:") and "legacy-plain-2" not in stored
        assert client.post("/login", json={"email": email, "password": "legacy-plain-2"}).status_code == 200
    finally:
        _restore_password(email)


def test_older_hash_method_is_upgraded_on_login(client):
    email = _email_for_role("Guest", 3)
    sql('UPDATE "user" SET password_hash = %s WHERE email = %s',
        (generate_password_hash(PASSWORD, method="pbkdf2"), email))
    try:
        assert client.post("/login", json={"email": email, "password": PASSWORD}).status_code == 200
        stored = sql('SELECT password_hash FROM "user" WHERE email = %s', (email,))[0][0]
        assert stored.startswith("scrypt:")
    finally:
        _restore_password(email)


def test_registration_stores_a_hash(client):
    response = client.post("/auth/register", json={
        "firstName": "Hash", "lastName": "Check", "email": "hash.check@example.com",
        "phone": "", "password": "longenough1"})
    assert response.status_code == 201
    stored = sql('SELECT password_hash FROM "user" WHERE email = %s', ("hash.check@example.com",))[0][0]
    assert stored.startswith("scrypt:") and "longenough1" not in stored


@pytest.mark.parametrize("value, expected", [
    (generate_password_hash("x"), True),
    (generate_password_hash("x", method="pbkdf2"), True),
    ("scrypt:abc", False),            # a plain password that merely looks like a prefix
    ("scrypt:1$salt", False),
    ("plain-password", False),
    ("md5$salt$hash", False),
    ("", False),
    (None, False),
])
def test_is_hashed(value, expected):
    assert is_hashed(value) is expected


def test_inactive_account_cannot_log_in(client, admin):
    email = _email_for_role("Guest", 4)
    user_id = sql('SELECT user_id FROM "user" WHERE email = %s', (email,))[0][0]
    assert admin.patch(f"/users/{user_id}/status", json={"status": "SUSPENDED"}).status_code == 200
    assert client.post("/login", json={"email": email, "password": PASSWORD}).status_code == 403
    assert admin.patch(f"/users/{user_id}/status", json={"status": "ACTIVE"}).status_code == 200
    assert client.post("/login", json={"email": email, "password": PASSWORD}).status_code == 200


def test_protected_routes_need_a_token(client):
    for path in ("/admin/stats", "/bookings", "/notifications", "/users", "/payments"):
        response = client.get(path)
        assert response.status_code == 401, path
        assert response.get_json()["message"]
    assert client.get("/admin/stats", headers={"Authorization": "Bearer backend-22"}).status_code == 401


def test_wrong_role_is_403(guest, housekeeper):
    assert guest.get("/admin/stats").status_code == 403
    assert guest.get("/bookings").status_code == 403
    assert housekeeper.get("/admin/settings").status_code == 403
    assert guest.get("/housekeeping/tasks").status_code == 403


def test_register_creates_guest_and_signs_in(client):
    response = client.post("/auth/register", json={
        "firstName": "Test", "lastName": "Traveller", "email": "Test.Traveller@example.com",
        "phone": "+94 77 000 0000", "password": "longenough1"})
    assert response.status_code == 201, response.get_json()
    body = response.get_json()
    assert body["token"] and body["user"]["role"] == "GUEST"
    assert sql("SELECT COUNT(*) FROM guest g JOIN \"user\" u USING (user_id) WHERE u.email = %s",
               ("test.traveller@example.com",))[0][0] == 1
    duplicate = client.post("/auth/register", json={
        "firstName": "Again", "lastName": "Traveller", "email": "test.traveller@example.com",
        "phone": "", "password": "longenough1"})
    assert duplicate.status_code == 409


def test_register_validates_input(client):
    short = client.post("/auth/register", json={
        "firstName": "A", "lastName": "B", "email": "short@example.com", "phone": "", "password": "short"})
    assert short.status_code == 400
    bad_email = client.post("/auth/register", json={
        "firstName": "A", "lastName": "B", "email": "not-an-email", "phone": "", "password": "longenough1"})
    assert bad_email.status_code == 400


def test_password_reset_flow(client, capsys):
    email = _email_for_role("Guest", 5)
    assert client.post("/auth/forgot-password", json={"email": email}).status_code == 200
    token = re.search(r"reset-password\?token=([\w-]+)", capsys.readouterr().out).group(1)

    assert client.post("/auth/reset-password", json={"token": token, "password": "short"}).status_code == 400
    assert client.post("/auth/reset-password", json={"token": token, "password": "BrandNewPass9"}).status_code == 200
    assert client.post("/auth/reset-password", json={"token": token, "password": "BrandNewPass9"}).status_code == 400
    assert client.post("/login", json={"email": email, "password": "BrandNewPass9"}).status_code == 200
    # unknown emails get the same reply, and nothing is printed
    assert client.post("/auth/forgot-password", json={"email": "nobody@example.com"}).status_code == 200
    assert "reset-password" not in capsys.readouterr().out


def test_logout_is_audited(guest):
    assert guest.post("/auth/logout").status_code == 200
    assert sql("SELECT COUNT(*) FROM audit_log WHERE action_type = 'Logout' AND user_id = %s",
               (guest.id,))[0][0] >= 1
