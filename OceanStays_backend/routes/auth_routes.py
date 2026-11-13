"""Sign-in, registration, password reset."""

import hashlib
import logging
import re
import secrets
from datetime import timedelta

from flask import Blueprint

import db
from auth import current_actor, issue_token, require_roles
from config import Config
from errors import ApiError, json_body, require_text
from passwords import DUMMY_HASH, hash_password, needs_rehash, verify_password
from serializers import USER_SELECT, user_out
from services import audit, now_naive

bp = Blueprint("auth", __name__)
log = logging.getLogger("oceanstays")

EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
MIN_PASSWORD = 8


def _session_payload(row):
    user = user_out(row)
    token = issue_token({
        "user_id": row["user_id"],
        "role": user["role"],
        "guest_id": row.get("guest_id"),
        "staff_id": row.get("staff_id"),
        "name": user["name"],
    })
    session_user = {
        "id": user["id"],
        "name": user["name"],
        "firstName": user["firstName"],
        "lastName": user["lastName"],
        "email": user["email"],
        "phone": user["phone"],
        "role": user["role"],
    }
    return {
        "message": "Login successful",
        "token": token,
        "user": session_user,
        # Kept for older clients that read the flat fields.
        "user_id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "role": user["role"],
    }


@bp.post("/login")
def login():
    data = json_body()
    identifier = str(data.get("email") or data.get("username") or "").strip()
    password = data.get("password") or ""
    if not identifier or not password:
        raise ApiError(400, "Enter your email address and password.")

    creds = db.query_one(
        """SELECT user_id, password_hash, status FROM "user"
           WHERE LOWER(email) = LOWER(%s) OR LOWER(username) = LOWER(%s)
           ORDER BY (LOWER(email) = LOWER(%s)) DESC LIMIT 1""",
        (identifier, identifier, identifier),
    )
    if not creds:
        verify_password(DUMMY_HASH, str(password))  # same work as a real check
    if not creds or not verify_password(creds["password_hash"], str(password)):
        audit(creds["user_id"] if creds else None, "Login", "Authentication",
              identifier[:100], "Failed")
        raise ApiError(401, "Incorrect email or password. Please try again.")

    status = creds["status"] or "Active"
    if status != "Active":
        audit(creds["user_id"], "Login", "Authentication", f"Account {status.lower()}", "Failed")
        raise ApiError(403, f"This account is {status.lower()}. Please contact the front desk.")

    # Record the sign-in (re-hashing an older-method hash with scrypt) and load
    # the profile in the same round trip.
    stored = creds["password_hash"]
    new_hash = hash_password(str(password)) if needs_rehash(stored) else stored
    with db.transaction() as cur:
        cur.execute('UPDATE "user" SET last_sign_in = %s, password_hash = %s WHERE user_id = %s;'
                    + USER_SELECT + " WHERE u.user_id = %s",
                    (now_naive(), new_hash, creds["user_id"], creds["user_id"]))
        row = dict(cur.fetchone())
    audit(row["user_id"], "Login", "Authentication", row["email"])
    return _session_payload(row)


@bp.post("/auth/logout")
@require_roles()
def logout():
    actor = current_actor()
    audit(actor.user_id, "Logout", "Authentication", actor.get("name"))
    return {"message": "Signed out."}


@bp.get("/auth/me")
@require_roles()
def me():
    row = db.query_one(USER_SELECT + " WHERE u.user_id = %s", (current_actor().user_id,))
    if not row:
        raise ApiError(401, "Your session has expired. Please sign in again.")
    return user_out(row)


def _validate_password(password):
    if not isinstance(password, str) or len(password) < MIN_PASSWORD:
        raise ApiError(400, f"Password must be at least {MIN_PASSWORD} characters.",
                       {"password": f"Use at least {MIN_PASSWORD} characters."})


def _unique_username(cur, email):
    base = re.sub(r"[^a-z0-9._-]", "", email.split("@")[0].lower())[:40] or "guest"
    candidate, n = base, 1
    while db.fetch_one(cur, 'SELECT 1 FROM "user" WHERE username = %s', (candidate,)):
        n += 1
        candidate = f"{base}{n}"
    return candidate


@bp.post("/auth/register")
def register():
    data = json_body()
    first = require_text(data, "firstName", "First name", 50)
    last = require_text(data, "lastName", "Last name", 50)
    email = require_text(data, "email", "Email", 100).lower()
    phone = str(data.get("phone") or "").strip()[:20] or None
    password = data.get("password")
    if not EMAIL_PATTERN.match(email):
        raise ApiError(400, "Enter a valid email address.", {"email": "Enter a valid email address."})
    _validate_password(password)

    with db.transaction() as cur:
        if db.fetch_one(cur, 'SELECT 1 FROM "user" WHERE LOWER(email) = %s', (email,)):
            raise ApiError(409, "An account with that email already exists. Try signing in instead.")
        role = db.fetch_one(cur, "SELECT role_id FROM role WHERE role_name = 'Guest'")
        user = db.fetch_one(
            cur,
            """INSERT INTO "user" (username, email, password_hash, phone_number, role_id,
                                   first_name, last_name, status, created_at, last_sign_in)
               VALUES (%s, %s, %s, %s, %s, %s, %s, 'Active', %s, %s) RETURNING user_id""",
            (_unique_username(cur, email), email, hash_password(password), phone,
             role["role_id"], first, last, now_naive(), now_naive()),
        )
        cur.execute("INSERT INTO guest (user_id) VALUES (%s)", (user["user_id"],))

    row = db.query_one(USER_SELECT + " WHERE u.user_id = %s", (user["user_id"],))
    audit(row["user_id"], "Create", "Users", f"Registered {email}")
    payload = _session_payload(row)
    payload["message"] = "Account created"
    return payload, 201


def _hash_token(token):
    return hashlib.sha256(token.encode()).hexdigest()


@bp.post("/auth/forgot-password")
def forgot_password():
    data = json_body()
    email = str(data.get("email") or "").strip().lower()
    reply = {"message": "If an account exists for that email, a reset link is on its way."}
    if not email:
        raise ApiError(400, "Enter your email address.")

    user = db.query_one(
        """SELECT user_id, first_name FROM "user"
           WHERE LOWER(email) = %s AND COALESCE(status, 'Active') = 'Active'""",
        (email,),
    )
    if not user:
        return reply

    token = secrets.token_urlsafe(32)
    with db.transaction() as cur:
        cur.execute("UPDATE password_reset_token SET used_at = %s WHERE user_id = %s AND used_at IS NULL",
                    (now_naive(), user["user_id"]))
        cur.execute(
            "INSERT INTO password_reset_token (user_id, token_hash, expires_at) VALUES (%s, %s, %s)",
            (user["user_id"], _hash_token(token), now_naive() + timedelta(hours=1)),
        )

    link = f"{Config.FRONTEND_URL}/reset-password?token={token}"
    # Demo mode: no mail server is configured, so the link goes to the console.
    print(f"\n[password reset] {email}: {link}\n", flush=True)
    log.info("Password reset link issued for user %s", user["user_id"])
    audit(user["user_id"], "Update", "Authentication", "Password reset requested")
    return reply


@bp.post("/auth/reset-password")
def reset_password():
    data = json_body()
    token = str(data.get("token") or "").strip()
    password = data.get("password")
    if not token:
        raise ApiError(400, "That reset link is invalid. Please request a new one.")
    _validate_password(password)

    with db.transaction() as cur:
        record = db.fetch_one(
            cur,
            """SELECT token_id, user_id, expires_at, used_at FROM password_reset_token
               WHERE token_hash = %s FOR UPDATE""",
            (_hash_token(token),),
        )
        if not record or record["used_at"] is not None:
            raise ApiError(400, "That reset link is invalid or has already been used. Please request a new one.")
        if record["expires_at"] < now_naive():
            raise ApiError(410, "That reset link has expired. Please request a new one.")
        cur.execute('UPDATE "user" SET password_hash = %s WHERE user_id = %s',
                    (hash_password(password), record["user_id"]))
        cur.execute("UPDATE password_reset_token SET used_at = %s WHERE user_id = %s AND used_at IS NULL",
                    (now_naive(), record["user_id"]))

    audit(record["user_id"], "Update", "Authentication", "Password reset completed")
    return {"message": "Your password has been reset. You can sign in now."}


