"""Ocean Stays SHMS — Flask API.

    python app.py            # http://127.0.0.1:5000

Configuration comes from OceanStays_backend/.env (see .env.example). The
routes live in routes/, one module per area; shared pieces are in db.py,
auth.py, mappings.py, serializers.py and services.py.
"""

import logging

from flask import Flask
from flask_cors import CORS

import db
from auth import init_auth
from config import Config
from errors import register_error_handlers
from json_provider import AppJSONProvider
from routes import BLUEPRINTS


def create_app():
    Config.validate()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    app = Flask(__name__)
    app.json = AppJSONProvider(app)
    app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024  # 1 MB request bodies

    CORS(
        app,
        origins=Config.CORS_ORIGINS,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    )
    init_auth(app, Config.JWT_SECRET, Config.jwt_expires())
    register_error_handlers(app)
    db.init_pool(Config.DATABASE_URL)

    for blueprint in BLUEPRINTS:
        app.register_blueprint(blueprint)

    @app.get("/")
    @app.get("/health")
    def health():
        try:
            db.scalar("SELECT 1")
        except Exception:
            return {"status": "error", "database": "unreachable",
                    "message": "PostgreSQL connection failed."}, 503
        return {"status": "ok", "database": "connected", "message": "PostgreSQL Connected Successfully!"}

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=Config.DEBUG, threaded=True)
