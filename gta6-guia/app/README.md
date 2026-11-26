# App Vice 100% (PWA)

Guia de bolso não oficial para GTA 6. HTML/CSS/JS puro, sem framework e sem build pesado.

## Estrutura

| Arquivo | Para quê |
|---|---|
| `build.js` | Converte `../base/*.md` em `data/pt.json`. Rode de novo sempre que atualizar a base. |
| `data/pt.json` | Conteúdo do guia (gerado; não editar à mão). |
| `i18n.js` | Textos da interface por idioma (PT pronto; ES/EN marcados como "em breve"). |
| `app.js` | Telas, checklist, busca, filtro e desbloqueio dos bônus. |
| `style.css` | Visual Vice City (neon, pôr do sol, palmeiras). Sem marca ou arte oficial. |
| `sw.js` + `manifest.webmanifest` | Instalar na tela inicial e funcionar offline. |

## Rodar local

```bash
node build.js && python3 -m http.server 8765
```

Abra `http://localhost:8765`.

## Publicar

Qualquer hospedagem estática com HTTPS (Vercel, Netlify, Cloudflare Pages). Suba a pasta `app/` inteira.

## Bônus (order bumps)

Cada bump libera um módulo por código, enviado no e-mail de compra. Códigos de teste:

| Módulo | Código |
|---|---|
| Rota do Dinheiro | `ROTA-7741` |
| Guia da Platina | `PLAT-5530` |
| Garagem & Arsenal | `GARA-2219` |

**Troque os códigos antes de vender.** No console do navegador, `VICE.hash('NOVO-CODIGO')` mostra o hash; cole em `BUMP_HASHES` no `app.js`.

A trava é só no app (o conteúdo vai junto no `pt.json`). Para low ticket é suficiente. Se a pirataria do link virar problema, o próximo passo é separar os bônus em arquivos protegidos por login.

## Novo idioma

1. Traduzir os arquivos de `base/` para a pasta do idioma.
2. Gerar `data/<lang>.json`.
3. Preencher o bloco do idioma em `i18n.js` e tirar o `_soon`.
