-- Telefone da compra (vem no webhook da Sellyo), para pré-preencher o checkout dos módulos à parte.
ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT '';
