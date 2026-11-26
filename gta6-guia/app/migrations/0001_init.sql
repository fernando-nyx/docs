-- Vice 100%: contas, sessões, compras via Sellyo, aceite de termos e progresso.

CREATE TABLE users (
  id                 TEXT PRIMARY KEY,
  email              TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name               TEXT NOT NULL DEFAULT '',
  password_hash      TEXT NOT NULL,
  must_change_password INTEGER NOT NULL DEFAULT 1,
  terms_version      TEXT,                                  -- versão do termo aceito (NULL = ainda não aceitou)
  terms_accepted_at  TEXT,
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Guarda só o SHA-256 do token do cookie.
CREATE TABLE sessions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at   TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- Produto/oferta da Sellyo → módulos que libera ("principal", "dinheiro", "platina", "garagem").
-- Um produto desconhecido entra sozinho (sem liberar nada) no primeiro webhook; depois é só preencher grants.
CREATE TABLE products (
  external_id  TEXT PRIMARY KEY,                           -- código da oferta (off…) ou productId, minúsculo
  name         TEXT NOT NULL DEFAULT '',
  grants       TEXT NOT NULL DEFAULT '',                   -- ex.: "principal" ou "dinheiro" ou "principal,platina"
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Uma linha por pagamento de produto (o bump é outro pagamento).
CREATE TABLE purchases (
  transaction_id TEXT PRIMARY KEY,
  order_id       TEXT,
  external_id    TEXT NOT NULL,
  user_id        TEXT REFERENCES users(id) ON DELETE CASCADE,
  buyer_email    TEXT NOT NULL COLLATE NOCASE,
  status         TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'refunded', 'chargeback')),
  last_event     TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_purchases_user ON purchases(user_id, status);

-- Registro dos webhooks (idempotência e suporte). Sem dados pessoais além do e-mail.
CREATE TABLE webhook_events (
  id          TEXT PRIMARY KEY,
  event       TEXT NOT NULL,
  outcome     TEXT NOT NULL,
  detail      TEXT NOT NULL DEFAULT '',
  payload     TEXT,                                        -- payload sem dados sensíveis, para conferir o formato
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Progresso do checklist (sincroniza entre aparelhos).
CREATE TABLE progress (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data       TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
