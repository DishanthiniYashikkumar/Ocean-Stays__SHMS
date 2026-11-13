-- One-time password reset links. Only a SHA-256 hash of the token is stored.
CREATE TABLE IF NOT EXISTS password_reset_token (
    token_id    serial PRIMARY KEY,
    user_id     integer NOT NULL REFERENCES "user" (user_id) ON DELETE CASCADE,
    token_hash  varchar(64) NOT NULL UNIQUE,
    expires_at  timestamp NOT NULL,
    used_at     timestamp,
    created_at  timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_token (user_id);
