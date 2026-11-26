-- Limite de aparelhos: guarda o aparelho de cada sessão e os logins recentes (freio contra conta compartilhada).
ALTER TABLE sessions ADD COLUMN device TEXT NOT NULL DEFAULT '';

CREATE TABLE logins (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_logins_user ON logins(user_id, at);
