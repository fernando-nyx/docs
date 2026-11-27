/**
 * E-mails transacionais (Resend): acesso liberado e pedido cancelado (reembolso/chargeback).
 * HTML em tabelas com estilos inline, para funcionar em Gmail, Outlook e Apple Mail.
 */

const MODULES = {
  principal: ['🎮', 'Vice Detonado', '135 missões passo a passo + checklist do 100%'],
  dinheiro: ['💰', 'Rota do Dinheiro', 'Os métodos mais rápidos, cofres e códigos'],
  platina: ['🏆', 'Guia da Platina', 'Os 55 troféus, roteiro em 3 etapas e cheats'],
  garagem: ['🏎️', 'Garagem & Arsenal', 'Supercarros, garagens grátis e armas lendárias'],
};
const ORDER = ['principal', 'dinheiro', 'platina', 'garagem'];

/** Nome amigável de um produto pelos módulos que ele libera ("dinheiro" → "Rota do Dinheiro"); senão, o nome da Sellyo. */
export function productTitle(grants, fallback) {
  const keys = String(grants || '').split(',').map((s) => s.trim()).filter((k) => MODULES[k]);
  return keys.length ? keys.map((k) => MODULES[k][1]).join(' + ') : String(fallback || '').trim();
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || '';
const appUrl = (env) => String(env.APP_URL || 'https://app.vicedetonado.com').replace(/\/+$/, '');
const host = (env) => appUrl(env).replace(/^https?:\/\//, '');

const C = { bg: '#0d0618', card: '#1c1033', card2: '#25153f', line: '#3a2560', text: '#f6eeff', muted: '#b3a3d1', pink: '#ff2e88', cyan: '#19e3ff', gold: '#ffd24a', ok: '#3df5a6' };
const FONT = "font-family:Inter,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

function layout(env, { preheader, banner, bannerAlt, body }) {
  const url = appUrl(env);
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>Vice Detonado</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}" style="background:${C.bg};">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
    <tr><td style="border-radius:18px 18px 0 0;overflow:hidden;line-height:0;">
      <a href="${url}" style="text-decoration:none;"><img src="${url}/email/${banner}" width="600" alt="${esc(bannerAlt)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:18px 18px 0 0;color:${C.text};${FONT}font-size:22px;font-weight:900;"></a>
    </td></tr>
    <tr><td bgcolor="${C.card}" style="background:${C.card};border-radius:0 0 18px 18px;padding:32px 28px 30px;${FONT}color:${C.text};font-size:16px;line-height:1.55;">
      ${body}
    </td></tr>
    <tr><td align="center" style="padding:22px 16px 8px;${FONT}font-size:12px;line-height:1.6;color:${C.muted};">
      Vice Detonado · guia não oficial, sem vínculo com a Rockstar Games ou a Take-Two.<br>
      Você recebeu este e-mail por causa de uma compra feita com este endereço.
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

const h1 = (t) => `<h1 style="margin:0 0 12px;${FONT}font-size:26px;line-height:1.2;font-weight:900;color:${C.text};">${t}</h1>`;
const p = (t, extra = '') => `<p style="margin:0 0 16px;${FONT}font-size:16px;line-height:1.55;color:${C.text};${extra}">${t}</p>`;
const small = (t) => `<p style="margin:0 0 10px;${FONT}font-size:14px;line-height:1.55;color:${C.muted};">${t}</p>`;
const label = (t) => `<p style="margin:26px 0 10px;${FONT}font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${C.cyan};">${t}</p>`;

function button(href, text, { bg = C.pink, color = '#12051f' } = {}) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 6px;"><tr>
<td align="center" bgcolor="${bg}" style="border-radius:14px;background:${bg};background-image:linear-gradient(90deg,${C.pink},${C.cyan});">
<a href="${href}" style="display:block;padding:17px 20px;${FONT}font-size:17px;font-weight:900;letter-spacing:.5px;color:${color};text-decoration:none;border-radius:14px;">${text}</a>
</td></tr></table>`;
}

function credentials(env, email, password) {
  const row = (k, v, last) => `<tr>
<td style="padding:12px 16px;${last ? '' : `border-bottom:1px solid ${C.line};`}${FONT}font-size:14px;color:${C.muted};width:64px;">${k}</td>
<td style="padding:12px 16px;${last ? '' : `border-bottom:1px solid ${C.line};`}${FONT}font-size:16px;font-weight:800;color:${C.text};">${v}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.card2}" style="background:${C.card2};border:1px solid ${C.line};border-radius:14px;margin:6px 0 0;">
${row('Site', `<a href="${appUrl(env)}" style="color:${C.cyan};text-decoration:none;">${esc(host(env))}</a>`)}
${row('Login', `<span style="color:${C.text};text-decoration:none;word-break:break-all;">${esc(email)}</span>`)}
${row('Senha', password, true)}
</table>`;
}

function moduleList(keys) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${keys
    .map((k) => {
      const [icon, t, d] = MODULES[k];
      return `<tr><td width="44" valign="top" style="padding:8px 0;font-size:24px;line-height:1;">${icon}</td>
<td style="padding:8px 0;${FONT}"><span style="font-size:16px;font-weight:800;color:${C.text};">${esc(t)}</span><br>
<span style="font-size:14px;color:${C.muted};">${esc(d)}</span></td>
<td width="28" align="right" valign="middle" style="padding:8px 0;${FONT}font-size:18px;font-weight:900;color:${C.ok};">✓</td></tr>`;
    })
    .join('')}</table>`;
}

function steps(env) {
  const s = [
    ['1', `Abra <a href="${appUrl(env)}" style="color:${C.cyan};text-decoration:none;font-weight:800;">${esc(host(env))}</a> no celular ou no computador.`],
    ['2', 'Entre com o e-mail e a senha acima.'],
    ['3', 'Para abrir como app: no iPhone, <b>Compartilhar → Adicionar à Tela de Início</b>; no Android, <b>menu ⋮ → Adicionar à tela inicial</b>.'],
  ];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${s
    .map(([n, t]) => `<tr><td width="40" valign="top" style="padding:7px 0;">
<div style="width:28px;height:28px;line-height:28px;border-radius:14px;background:${C.pink};text-align:center;${FONT}font-size:14px;font-weight:900;color:#12051f;">${n}</div></td>
<td style="padding:10px 0 7px;${FONT}font-size:15px;line-height:1.5;color:${C.text};">${t}</td></tr>`)
    .join('')}</table>`;
}

/** Acesso liberado. grants: Set de módulos liberados; isDefaultPassword: a pessoa ainda não trocou a senha inicial. */
export function accessEmail(env, { name, email, grants, isDefaultPassword }) {
  const keys = ORDER.filter((k) => grants.has(k) || grants.has('tudo'));
  const fn = firstName(name);
  const password = isDefaultPassword
    ? `<span style="font-family:Menlo,Consolas,monospace;color:${C.gold};letter-spacing:1px;">${esc(env.DEFAULT_PASSWORD || '12345678')}</span>`
    : `<span style="font-weight:600;color:${C.muted};">a que você já usa no app</span>`;
  const body = [
    h1(`${fn ? esc(fn) + ', seu' : 'Seu'} acesso está liberado 🎮`),
    p('Vice City é toda sua: missão por missão, cada item do 100% e tudo marcado no checklist para você não perder nada.'),
    label('Seus dados de acesso'),
    credentials(env, email, password),
    button(appUrl(env), 'ACESSAR O DETONADO →'),
    label('O que você liberou'),
    moduleList(keys),
    label('Primeiro acesso em 3 passos'),
    steps(env),
    env.EMAIL_REPLY_TO
      ? `<div style="height:1px;background:${C.line};margin:24px 0 18px;line-height:1px;font-size:0;">&nbsp;</div>` + small('Dúvida ou problema para entrar? É só responder este e-mail.')
      : '',
  ].join('\n');
  const text = [
    `${fn ? fn + ', seu' : 'Seu'} acesso está liberado!`,
    '',
    `Site: ${appUrl(env)}`,
    `Login: ${email}`,
    `Senha: ${isDefaultPassword ? env.DEFAULT_PASSWORD || '12345678' : 'a que você já usa no app'}`,
    '',
    'O que você liberou:',
    ...keys.map((k) => `- ${MODULES[k][1]}: ${MODULES[k][2]}`),
    '',
    'Para abrir como app: no iPhone, Compartilhar > Adicionar à Tela de Início; no Android, menu > Adicionar à tela inicial.',
  ].join('\n');
  return {
    subject: 'Seu acesso ao Vice Detonado está liberado 🎮',
    html: layout(env, { preheader: 'Seu login e senha para abrir o detonado completo do GTA VI.', banner: 'topo-acesso.png', bannerAlt: 'Vice Detonado: acesso liberado', body }),
    text,
  };
}

/**
 * Pedido cancelado. kind: 'refunded' | 'chargeback'. items: nomes dos produtos cancelados.
 * stillHasAccess: a pessoa ainda tem outra compra válida (ex.: só um bump foi reembolsado).
 */
export function cancelEmail(env, { name, kind, items, stillHasAccess }) {
  const fn = firstName(name);
  const cb = kind === 'chargeback';
  const list = items.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.card2}" style="background:${C.card2};border:1px solid ${C.line};border-radius:14px;margin:4px 0 18px;">${items
        .map((t, i) => `<tr><td style="padding:12px 16px;${i < items.length - 1 ? `border-bottom:1px solid ${C.line};` : ''}${FONT}font-size:15px;color:${C.text};"><span style="color:${C.muted};">✕</span>&nbsp; ${esc(t)}</td></tr>`)
        .join('')}</table>`
    : '';
  const intro = cb
    ? 'O banco ou a operadora do cartão nos avisou de uma contestação (chargeback) da sua compra. Por isso, o acesso ao conteúdo abaixo foi suspenso:'
    : 'Seu reembolso foi confirmado. O valor volta pelo mesmo meio de pagamento, no prazo da sua operadora. O acesso ao conteúdo abaixo foi encerrado:';
  const after = stillHasAccess
    ? p('O restante das suas compras continua liberado normalmente no app.')
    : p('Seu login no app continua existindo, mas sem conteúdo liberado. Se quiser voltar, é só comprar de novo com este mesmo e-mail: o seu progresso continua salvo.');
  const body = [
    h1(cb ? 'Recebemos uma contestação da sua compra' : `${fn ? esc(fn) + ', seu' : 'Seu'} pedido foi cancelado`),
    p(intro),
    list,
    after,
    cb ? p(`Se você não reconhece essa contestação ou foi engano, ${env.EMAIL_REPLY_TO ? 'responda este e-mail' : 'fale com a gente'} que a gente resolve.`) : '',
    stillHasAccess ? button(appUrl(env), 'ABRIR O APP →') : '',
    `<div style="height:1px;background:${C.line};margin:22px 0 16px;line-height:1px;font-size:0;">&nbsp;</div>`,
    small(cb ? 'Este é um aviso automático sobre a contestação.' : 'Valeu por ter testado o Vice Detonado. Boa jogatina em Leonida! 🌴'),
  ].join('\n');
  const text = [
    cb ? 'Recebemos uma contestação (chargeback) da sua compra. O acesso foi suspenso:' : 'Seu reembolso foi confirmado. O acesso foi encerrado:',
    ...items.map((t) => `- ${t}`),
    '',
    stillHasAccess ? 'O restante das suas compras continua liberado.' : 'Para voltar, é só comprar de novo com este e-mail: seu progresso continua salvo.',
  ].join('\n');
  return {
    subject: cb ? 'Contestação da sua compra do Vice Detonado' : 'Seu pedido do Vice Detonado foi cancelado',
    html: layout(env, { preheader: cb ? 'O acesso foi suspenso por causa de uma contestação no cartão.' : 'Reembolso confirmado e acesso encerrado.', banner: 'topo-cancelado.png', bannerAlt: 'Vice Detonado: pedido cancelado', body }),
    text,
  };
}

/** Envia pelo Resend. Retorna { ok, id?, error? }. Sem RESEND_API_KEY (dev), só registra no console. */
export async function sendEmail(env, { to, subject, html, text, idempotencyKey }) {
  if (!env.RESEND_API_KEY) {
    console.log('email (sem RESEND_API_KEY, não enviado):', to, subject);
    return { ok: false, error: 'sem RESEND_API_KEY' };
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
      ...(idempotencyKey ? { 'idempotency-key': idempotencyKey.slice(0, 256) } : {}),
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM || 'Vice Detonado <acesso@vicedetonado.com>',
      to: [to],
      subject,
      html,
      text,
      ...(env.EMAIL_REPLY_TO ? { reply_to: env.EMAIL_REPLY_TO } : {}),
    }),
  });
  const body = await r.json().catch(() => ({}));
  return r.ok ? { ok: true, id: body.id } : { ok: false, error: `${r.status} ${body.message || body.name || ''}`.trim() };
}
