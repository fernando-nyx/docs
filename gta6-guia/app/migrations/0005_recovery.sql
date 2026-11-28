-- Recuperação de vendas por e-mail: carrinho abandonado e Pix gerado sem pagamento.
-- Uma sequência por pessoa e tipo; para quando a compra é aprovada ou a pessoa pede para sair.
CREATE TABLE recovery (
  id          TEXT PRIMARY KEY,                              -- "<kind>:<email>"
  kind        TEXT NOT NULL CHECK (kind IN ('cart', 'pix')),
  email       TEXT NOT NULL COLLATE NOCASE,
  name        TEXT NOT NULL DEFAULT '',
  external_id TEXT NOT NULL DEFAULT '',                      -- oferta abandonada (para escolher o link)
  link        TEXT NOT NULL DEFAULT '',                      -- link de volta ao checkout
  pix_code    TEXT NOT NULL DEFAULT '',                      -- Pix copia e cola, se vier no aviso
  step        INTEGER NOT NULL DEFAULT 0,                    -- quantos e-mails já saíram
  next_at     TEXT NOT NULL,                                 -- quando sai o próximo
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'done', 'bought', 'optout')),
  detail      TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_recovery_due ON recovery(status, next_at);
CREATE INDEX idx_recovery_email ON recovery(email);

-- Quem pediu para não receber e-mails de recuperação.
CREATE TABLE email_optout (
  email TEXT PRIMARY KEY COLLATE NOCASE,
  at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
