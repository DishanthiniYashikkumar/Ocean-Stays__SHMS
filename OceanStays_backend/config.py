"""Settings, read once from the environment / OceanStays_backend/.env."""

import os
from datetime import timedelta

from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Values already in the environment win, so tests and CI can override .env.
load_dotenv(os.path.join(BASE_DIR, ".env"))


def _bool(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class Config:
    DATABASE_URL = os.environ.get("DATABASE_URL")
    JWT_SECRET = os.environ.get("JWT_SECRET")
    JWT_HOURS = int(os.environ.get("JWT_HOURS", "12"))
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.environ.get(
            "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ]
    APP_TIMEZONE = os.environ.get("APP_TIMEZONE", "Asia/Colombo")
    DEBUG = _bool("FLASK_DEBUG", False)
    ASYNC_SIDE_EFFECTS = _bool("ASYNC_SIDE_EFFECTS", True)
    CURRENCY = "LKR"

    @classmethod
    def validate(cls):
        missing = [name for name in ("DATABASE_URL", "JWT_SECRET") if not getattr(cls, name)]
        if missing:
            raise RuntimeError(
                f"Missing {', '.join(missing)}. Add them to OceanStays_backend/.env "
                "(see .env.example)."
            )

    @classmethod
    def jwt_expires(cls):
        return timedelta(hours=cls.JWT_HOURS)
