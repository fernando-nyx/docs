-- E-mails transacionais (acesso liberado / pedido cancelado). Um por pedido e tipo: a Sellyo manda
-- um aviso por produto (o bump é outro aviso, mesmo orderId), e o e-mail só deve sair uma vez.
CREATE TABLE email_log (
  id         TEXT PRIMARY KEY,                             -- "access:<orderId>", "refunded:<orderId>", "chargeback:<orderId>"
  kind       TEXT NOT NULL,
  to_email   TEXT NOT NULL COLLATE NOCASE,
  status     TEXT NOT NULL,                                -- queued | sent | failed | skipped
  detail     TEXT NOT NULL DEFAULT '',                     -- id do Resend ou motivo da falha
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_email_log_to ON email_log(to_email);
