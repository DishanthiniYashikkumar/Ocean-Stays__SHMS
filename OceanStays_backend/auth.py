"""Login tokens (JWT) and role checks.

    @bp.get("/admin/stats")
    @require_roles(ADMIN)
    def stats(): ...

    @bp.get("/notifications")
    @require_roles()            # any signed-in user
    def list_notifications():
        actor = current_actor() # {user_id, role, guest_id, staff_id, name}
"""

from functools import wraps

from flask import g
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    get_jwt,
    get_jwt_identity,
    verify_jwt_in_request,
)

from errors import ApiError

jwt = JWTManager()


def init_auth(app, secret, expires):
    app.config["JWT_SECRET_KEY"] = secret
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = expires
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]
    jwt.init_app(app)

    def unauthorized(_reason):
        return {"message": "Your session has expired. Please sign in again."}, 401

    jwt.unauthorized_loader(unauthorized)
    jwt.invalid_token_loader(unauthorized)
    jwt.expired_token_loader(lambda _header, _payload: unauthorized(None))
    jwt.revoked_token_loader(lambda _header, _payload: unauthorized(None))
    jwt.needs_fresh_token_loader(lambda _header, _payload: unauthorized(None))


def issue_token(user):
    """user: dict with user_id, role (API constant), guest_id, staff_id, name."""
    return create_access_token(
        identity=str(user["user_id"]),
        additional_claims={
            "role": user["role"],
            "guest_id": user.get("guest_id"),
            "staff_id": user.get("staff_id"),
            "name": user.get("name"),
        },
    )


class Actor(dict):
    """The signed-in user, built from the token's claims."""

    @property
    def user_id(self):
        return self["user_id"]

    @property
    def role(self):
        return self["role"]

    @property
    def guest_id(self):
        return self.get("guest_id")

    @property
    def staff_id(self):
        return self.get("staff_id")

    def has(self, *roles):
        return self.role in roles


def _load_actor():
    claims = get_jwt()
    return Actor(
        user_id=int(get_jwt_identity()),
        role=claims.get("role"),
        guest_id=claims.get("guest_id"),
        staff_id=claims.get("staff_id"),
        name=claims.get("name"),
    )


def require_roles(*roles):
    """Requires a valid token; with roles given, the user's role must be one of them."""

    def decorator(view):
        @wraps(view)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            actor = _load_actor()
            if roles and actor.role not in roles:
                raise ApiError(403, "You don't have permission to perform that action.")
            g.actor = actor
            return view(*args, **kwargs)

        return wrapper

    return decorator


def optional_auth(view):
    """Lets anonymous callers in, but reads the token when one is sent."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request(optional=True)
            g.actor = _load_actor() if get_jwt_identity() else None
        except Exception:  # an invalid token on a public route is just ignored
            g.actor = None
        return view(*args, **kwargs)

    return wrapper


def current_actor():
    return g.get("actor")
