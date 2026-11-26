# App Vice 100%

Guia de bolso para GTA 6. Cloudflare Worker + D1 (o mesmo modelo do Prato Tranquilo).
O app (HTML/CSS/JS puro em `public/`) instala na tela inicial e abre offline depois do primeiro acesso.

## Como funciona

1. A venda é aprovada na **Sellyo** → o webhook cria a conta com o e-mail da compra e a senha inicial (`DEFAULT_PASSWORD`).
2. A pessoa entra com e-mail + senha → no primeiro acesso aceita o **termo** (fica registrado com data e versão) → o app sugere trocar a senha.
3. Cada produto/oferta da Sellyo libera módulos. Os bônus que ela não comprou aparecem trancados, com link de compra.
4. O conteúdo de cada módulo **só sai do servidor para quem comprou** (não vai escondido no app).
5. O progresso do checklist fica no aparelho e sincroniza com a conta (troca de celular sem perder nada).
6. Reembolso ou chargeback retira o acesso daquele produto.

## Estrutura

| Caminho | Para quê |
|---|---|
| `../conteudo/*.md` | Conteúdo para o cliente (sem fontes nem "não oficial"). |
| `../base/*.md` | Pesquisa original com fontes (não vai para o app). |
| `build.cjs` | Converte `conteudo/` em `worker/content/pt.json`. Rode sempre que atualizar o conteúdo. |
| `worker/index.js` | API: webhook Sellyo, login, termo, senha, conteúdo e progresso. |
| `migrations/` | Tabelas do D1. |
| `public/` | O app (telas, visual Vice City, i18n, service worker). |
| `scripts/simulate-sellyo.mjs` | Simula uma venda com bump no servidor local. |

## Rodar local

```bash
npm install
npm run db:migrate:local
npm run dev
```

Em outro terminal: `npm run sellyo:simulate` cria a conta `teste@example.com` (senha `12345678`).
Depois mapeie os produtos de teste (passo 3 abaixo, com `--local`).

## Colocar no ar

1. `npx wrangler d1 create vice100` e cole o `database_id` no `wrangler.jsonc`.
2. `npm run db:migrate:remote` e `npm run deploy`.
3. **Sellyo → Apps → Webhooks → Novo webhook:**
   - URL: `https://SEU-DOMINIO/api/webhooks/sellyo`
   - Eventos: Venda Aprovada, Reembolso, Chargeback (Pix/Boleto gerado são opcionais).
4. Faça uma venda de teste. O produto entra sozinho na tabela `products`, ainda sem liberar nada. Libere assim:

```bash
npx wrangler d1 execute DB --remote --command "SELECT external_id, name, grants FROM products"
npx wrangler d1 execute DB --remote --command "UPDATE products SET grants='principal' WHERE external_id='offxxxx'"
```

Valores de `grants`: `principal` (Começo & História + Checklist 100%), `dinheiro`, `platina`, `garagem`, ou `tudo`.
Use o código da **oferta** (`OFF…`, em minúsculo) quando a venda vier com oferta; senão, o `productId`.

5. Opcional: links de compra dos bônus em `CHECKOUT_URL` e `BUMP_URL_*` no `wrangler.jsonc`.
6. Opcional: proteger o webhook com `npx wrangler secret put SELLYO_WEBHOOK_TOKEN` e cadastrar a URL com `?token=<valor>`.
7. No e-mail de entrega da Sellyo, informe o link do app, "entre com o e-mail da compra" e a senha inicial.

## Order bump

A Sellyo manda **um aviso por produto** (o bump chega em outro aviso, com o mesmo `orderId`). Cada aviso vira uma compra própria; reembolsar só o bump tira só o bump.
Se o bump vier dentro do mesmo aviso (lista `items`, `orderBumps` ou `bumps`), o webhook também entende.
Os avisos ficam em `webhook_events` (com o payload sem dados pessoais) para conferir o formato.

## Termo de aceite

O texto fica em `public/i18n.js` (`terms`). Ao mudar o texto, troque `TERMS_VERSION` em `worker/index.js`: todos aceitam de novo no próximo acesso.

## Novo idioma

Traduzir `conteudo/` → gerar o JSON do idioma no `build.cjs` → importar em `worker/index.js` (`CONTENT`) → preencher o bloco em `public/i18n.js`.
