/**
 * Vice Detonado — API (Cloudflare Worker + D1). O resto do site é servido pelos assets em ./public.
 *
 * Rotas:
 *   POST /api/webhooks/sellyo     venda aprovada / reembolso / chargeback (cria a conta e libera módulos)
 *   POST /api/login               { email, password }
 *   POST /api/logout
 *   GET  /api/me                  conta, módulos liberados e termo aceito
 *   POST /api/terms               { version } — registra o aceite do termo
 *   POST /api/password            { current, next }
 *   GET  /api/content/:lang/:mod  conteúdo do módulo (só se a compra liberou)
 *   GET  /api/missions/:lang      índice das missões · GET /api/missions/:lang/:slug  passo a passo
 *   GET  /api/progress  · PUT /api/progress { data }
 *   GET  /api/email/sair?e=&t=    descadastro dos e-mails de recuperação
 * Agendador (cron a cada 5 min): envia os e-mails de recuperação de carrinho/Pix que estão na hora.
 */
import CONTENT_PT from './content/pt.json';
import MISSOES_PT from './content/missoes-pt.json';
import { accessEmail, cancelEmail, recoveryEmail, sendEmail, productTitle } from './emails.js';

const CONTENT = { pt: CONTENT_PT };
const TERMS_VERSION = '2026-11-26';
const SESSION_DAYS = 60;
const enc = new TextEncoder();

// ---------- util ----------
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
const now = () => new Date().toISOString();
const isDev = (env) => env.APP_ENV === 'development';
const cookieName = (env) => (isDev(env) ? 'v100_session' : '__Host-v100_session');

async function readJson(req) {
  try { return await req.json(); } catch { return null; }
}
function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(v) {
  const b = v.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((v.length + 3) % 4);
  return Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
}
const randomToken = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));
async function sha256(v) {
  const d = await crypto.subtle.digest('SHA-256', enc.encode(v));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a[i] ^ b[i];
  return x === 0;
}
const sameText = (a, b) => sameBytes(enc.encode(String(a)), enc.encode(String(b)));

// Senhas: PBKDF2-SHA256, 100k iterações (máximo do Workers).
async function pbkdf2(pw, salt, it) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: it }, key, 256));
}
async function hashPassword(pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$100000$${b64url(salt)}$${b64url(await pbkdf2(pw, salt, 100000))}`;
}
async function verifyPassword(pw, stored) {
  const [scheme, it, salt, hash] = String(stored).split('$');
  if (scheme !== 'pbkdf2-sha256' || !salt || !hash) return false;
  return sameBytes(await pbkdf2(pw, fromB64url(salt), Number(it)), fromB64url(hash));
}
const DUMMY_HASH = 'pbkdf2-sha256$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const normEmail = (e) => String(e || '').trim().toLowerCase();
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 200;

// ---------- sessão ----------
function getCookie(req, name) {
  const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name.replace(/[^\w]/g, '\\$&') + '=([^;]+)'));
  return m ? m[1] : null;
}
function sessionCookie(env, token, expires) {
  return `${cookieName(env)}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires.toUTCString()}${isDev(env) ? '' : '; Secure'}`;
}
// Aparelho em poucas palavras, a partir do User-Agent (só para referência).
function deviceLabel(req) {
  const ua = req.headers.get('user-agent') || '';
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : 'Outro';
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : '';
  return `${os} ${br}`.trim().slice(0, 40);
}

/**
 * Limite de aparelhos (contra conta compartilhada/revendida):
 *  - no máximo MAX_DEVICES sessões abertas por conta; entrar num aparelho novo derruba o mais antigo;
 *  - no máximo MAX_LOGINS_DAY logins em 24h; passou disso, só no dia seguinte.
 */
async function createSession(env, userId, req) {
  const maxDevices = Math.max(1, Number(env.MAX_DEVICES) || 2);
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
  await env.DB.batch([
    env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at, device) VALUES (?, ?, ?, ?)')
      .bind(await sha256(token), userId, expires.toISOString(), deviceLabel(req)),
    // mantém só as N mais recentes
    env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?1 AND id NOT IN
      (SELECT id FROM sessions WHERE user_id = ?1 ORDER BY created_at DESC, rowid DESC LIMIT ?2)`).bind(userId, maxDevices),
    env.DB.prepare('INSERT INTO logins (user_id) VALUES (?)').bind(userId),
    env.DB.prepare("DELETE FROM logins WHERE at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days')"),
  ]);
  return sessionCookie(env, token, expires);
}
async function tooManyLogins(env, userId) {
  const max = Math.max(1, Number(env.MAX_LOGINS_DAY) || 5);
  const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM logins WHERE user_id = ? AND at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')")
    .bind(userId).first();
  return (r?.n || 0) >= max;
}
async function loadUser(req, env) {
  const token = getCookie(req, cookieName(env));
  if (!token || token.length > 100) return null;
  const sid = await sha256(token);
  const row = await env.DB.prepare(
    `SELECT s.id AS sid, s.expires_at, u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
  ).bind(sid).first();
  if (!row) return null;
  if (Date.parse(row.expires_at) <= Date.now()) {
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sid).run();
    return null;
  }
  return row;
}

// ---------- acesso ----------
async function grantsFor(env, user) {
  const { results } = await env.DB.prepare(
    `SELECT p.grants FROM purchases pu JOIN products p ON p.external_id = pu.external_id
      WHERE pu.status = 'approved' AND (pu.user_id = ? OR pu.buyer_email = ?)`,
  ).bind(user.id, user.email).all();
  const set = new Set();
  for (const r of results) String(r.grants || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((g) => set.add(g));
  // Comprou um bump, tem o principal (o bump só existe junto da compra principal).
  if (set.size) set.add('principal');
  return set;
}
// Módulos do principal; os demais são liberados pelo bump de mesmo nome.
const MODULE_GRANT = { missoes: 'principal', inicio: 'principal', cem: 'principal', dinheiro: 'dinheiro', platina: 'platina', garagem: 'garagem' };
const canSee = (grants, mod) => grants.has('tudo') || grants.has(MODULE_GRANT[mod]);

// ---------- Sellyo ----------
const EVENT_KIND = {
  sale_approved: 'approved',
  sale_pix_generated: 'pending',
  sale_boleto_generated: 'pending',
  sale_refunded: 'refunded',
  sale_chargeback: 'chargeback',
  sale_abandoned: 'abandoned',
};

/** Itens do aviso. A Sellyo costuma mandar um aviso por produto (bump = outro aviso, mesmo orderId);
 *  se um dia o bump vier dentro do mesmo aviso (lista), cada item vira uma compra própria. */
function itemsOf(p) {
  const list = [];
  const add = (it, ownPayment) => {
    if (!it || typeof it !== 'object') return;
    const code = String(it.offer?.code || '').trim().toLowerCase();
    const pid = String(it.productId || it.product_id || it.id || '').trim().toLowerCase();
    const externalId = code || pid;
    if (!externalId) return;
    const name = [it.name, it.offer?.name].filter(Boolean).join(' · ').slice(0, 300);
    list.push({ externalId, name, paymentId: ownPayment || it.paymentId || it.payment?.paymentId || null });
  };
  add(p.item, p.payment?.paymentId);
  for (const key of ['items', 'orderBumps', 'order_bumps', 'bumps']) {
    for (const src of [p[key], p.order?.[key], p.item?.[key]]) if (Array.isArray(src)) src.forEach((it) => add(it));
  }
  // Remove repetidos (o item principal pode aparecer também na lista).
  const seen = new Set();
  return list.filter((x) => (seen.has(x.externalId) ? false : seen.add(x.externalId)));
}

// Tira dados pessoais do payload antes de guardar (fica só o formato, para conferência).
function redact(v, k = '') {
  if (Array.isArray(v)) return v.map((x) => redact(x));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([kk, x]) => [kk, redact(x, kk)]));
  if (/document|cpf|phone|tel|address|street|zip|cep|card|ip/i.test(k)) return '***';
  return v;
}

// ---------- e-mails ----------
// Espera os avisos dos bumps do mesmo pedido chegarem antes de montar o e-mail (o waitUntil aguenta até 30 s).
const EMAIL_DELAY_MS = 8000;

/** Um e-mail por pedido e tipo: o primeiro aviso do pedido reserva o envio; os seguintes (bumps) só atualizam a compra. */
async function notifyBuyer(env, { kind, email, name, orderId, basePayment }) {
  const type = kind === 'approved' ? 'access' : kind; // access | refunded | chargeback
  const id = `${type}:${orderId || basePayment}`;
  const claim = await env.DB.prepare("INSERT OR IGNORE INTO email_log (id, kind, to_email, status) VALUES (?, ?, ?, 'queued')")
    .bind(id, type, email).run();
  if (!claim.meta?.changes) return;
  const done = (status, detail = '') =>
    env.DB.prepare("UPDATE email_log SET status = ?, detail = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?")
      .bind(status, String(detail).slice(0, 500), id).run();

  await new Promise((r) => setTimeout(r, Number(env.EMAIL_DELAY_MS ?? EMAIL_DELAY_MS)));
  const user = (await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()) || { id: null, email, name: '' };
  const grants = await grantsFor(env, user);
  const who = user.name || name || '';

  let msg;
  if (type === 'access') {
    if (!grants.size) return done('skipped', 'produto sem mapeamento em products.grants');
    msg = accessEmail(env, { name: who, email, grants, isDefaultPassword: user.must_change_password !== 0 });
  } else {
    const { results } = await env.DB.prepare(
      `SELECT pr.name, pr.grants FROM purchases pu LEFT JOIN products pr ON pr.external_id = pu.external_id
        WHERE pu.status = ?1 AND pu.buyer_email = ?2
          AND (pu.order_id = ?3 OR pu.transaction_id = ?4 OR pu.transaction_id LIKE ?4 || ':%')`,
    ).bind(kind, email, orderId, basePayment).all();
    const items = [...new Set(results.map((r) => productTitle(r.grants, r.name)).filter(Boolean))];
    msg = cancelEmail(env, { name: who, kind, items, stillHasAccess: grants.size > 0 });
  }
  const r = await sendEmail(env, { to: email, ...msg, idempotencyKey: id });
  await done(r.ok ? 'sent' : 'failed', r.ok ? r.id : r.error);
}

// ---------- recuperação de vendas (e-mail) ----------
// Primeiro e-mail: carrinho em 60 min, Pix em 15 min. Depois, 24 h e 48 h após o início (iguais para os dois).
const REC_FIRST_MIN = { cart: 60, pix: 15 };
const REC_LATER_H = [24, 48];
const addMin = (iso, m) => new Date(Date.parse(iso) + m * 60000).toISOString();

async function hmacTag(env, value) {
  const secret = env.UNSUB_SECRET || env.SELLYO_WEBHOOK_TOKEN || env.RESEND_API_KEY || 'vice-detonado';
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(value)))).slice(0, 24);
}
async function unsubUrl(env, email) {
  const base = String(env.APP_URL || 'https://app.vicedetonado.com').replace(/\/+$/, '');
  return `${base}/api/email/sair?e=${encodeURIComponent(email)}&t=${await hmacTag(env, email)}`;
}

/** Link de volta ao checkout: o que vier no aviso da Sellyo; senão, o checkout do produto (pelos módulos que ele libera). */
async function recoveryLink(env, p, externalId, kind) {
  const fromPayload = [p.checkout?.url, p.checkoutUrl, p.checkout_url, p.cart?.checkoutUrl, p.cart?.url, p.links?.checkout, p.payment?.checkoutUrl]
    .find((x) => typeof x === 'string' && /^https:\/\//.test(x));
  let url = fromPayload;
  if (!url) {
    const prod = await env.DB.prepare('SELECT grants FROM products WHERE external_id = ?').bind(externalId).first();
    const g = String(prod?.grants || '');
    url = g.includes('dinheiro') ? env.BUMP_URL_DINHEIRO : g.includes('platina') ? env.BUMP_URL_PLATINA : g.includes('garagem') ? env.BUMP_URL_GARAGEM : env.CHECKOUT_URL;
  }
  if (!url) return '';
  try {
    const u = new URL(url);
    const phone = String(p.customer?.phone || '').replace(/[^\d]/g, '');
    const set = { name: p.customer?.name, email: p.customer?.email, phone, utm_source: 'email', utm_medium: 'recuperacao', utm_campaign: kind };
    for (const [k, v] of Object.entries(set)) if (v && !u.searchParams.has(k)) u.searchParams.set(k, String(v));
    return u.toString();
  } catch { return url; }
}

/** Começa (ou atualiza) a sequência de recuperação de uma pessoa. */
async function startRecovery(env, p, { kind, email, externalId }) {
  if (await env.DB.prepare('SELECT 1 FROM email_optout WHERE email = ?').bind(email).first()) return 'optout';
  // Já comprou esse produto? Nada a recuperar.
  const owned = await env.DB.prepare("SELECT 1 FROM purchases WHERE buyer_email = ? AND external_id = ? AND status = 'approved'").bind(email, externalId).first();
  if (owned) return 'ja comprou';
  const id = `${kind}:${email}`;
  const link = await recoveryLink(env, p, externalId, kind);
  const pixCode = String(p.payment?.pix?.copyPaste || p.payment?.pix?.code || p.payment?.pix?.qrCode || p.payment?.pixCode || p.pix?.code || '').slice(0, 1000);
  const t = now();
  const cur = await env.DB.prepare('SELECT status, updated_at FROM recovery WHERE id = ?').bind(id).first();
  if (cur?.status === 'active') {
    // Sequência já em andamento: só atualiza o link/código (não recomeça para não repetir e-mails).
    await env.DB.prepare("UPDATE recovery SET link = COALESCE(NULLIF(?, ''), link), pix_code = COALESCE(NULLIF(?, ''), pix_code), updated_at = ? WHERE id = ?")
      .bind(link, pixCode, t, id).run();
    return 'em andamento';
  }
  // Uma sequência encerrada há menos de 7 dias não recomeça (evita mandar a mesma série de novo).
  if (cur && Date.now() - Date.parse(cur.updated_at) < 7 * 86400000) return 'recente';
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO recovery (id, kind, email, name, external_id, link, pix_code, step, next_at, status, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, ?8, 'active', ?9, ?9)
       ON CONFLICT(id) DO UPDATE SET name = ?4, external_id = ?5, link = ?6, pix_code = ?7, step = 0, next_at = ?8, status = 'active', detail = '', created_at = ?9, updated_at = ?9`)
      .bind(id, kind, email, String(p.customer?.name || '').slice(0, 200), externalId, link, pixCode, addMin(t, REC_FIRST_MIN[kind]), t),
    // Quem gerou Pix sai da sequência de carrinho (fica só a do Pix).
    ...(kind === 'pix' ? [env.DB.prepare("UPDATE recovery SET status = 'done', detail = 'virou pix', updated_at = ? WHERE id = ? AND status = 'active'").bind(t, `cart:${email}`)] : []),
  ]);
  return 'iniciada';
}

/** Compra aprovada: encerra as sequências dessa pessoa. */
const stopRecovery = (env, email) =>
  env.DB.prepare("UPDATE recovery SET status = 'bought', updated_at = ? WHERE email = ? AND status = 'active'").bind(now(), email).run();

/** Agendador: envia os e-mails que estão na hora (até 50 por rodada). */
async function runRecovery(env) {
  const { results } = await env.DB.prepare("SELECT * FROM recovery WHERE status = 'active' AND next_at <= ? ORDER BY next_at LIMIT 50").bind(now()).all();
  for (const r of results) {
    const t = now();
    const close = (status, detail = '') => env.DB.prepare('UPDATE recovery SET status = ?, detail = ?, updated_at = ? WHERE id = ?').bind(status, detail, t, r.id).run();
    if (await env.DB.prepare('SELECT 1 FROM email_optout WHERE email = ?').bind(r.email).first()) { await close('optout'); continue; }
    const bought = await env.DB.prepare("SELECT 1 FROM purchases WHERE buyer_email = ? AND status = 'approved' AND (external_id = ? OR updated_at >= ?)")
      .bind(r.email, r.external_id, r.created_at).first();
    if (bought) { await close('bought'); continue; }
    if (!r.link) { await close('done', 'sem link de checkout'); continue; }
    const step = r.step + 1;
    const unsub = await unsubUrl(env, r.email);
    const msg = recoveryEmail(env, { kind: r.kind, step, name: r.name, link: r.link, pixCode: r.pix_code, unsubUrl: unsub });
    const res = await sendEmail(env, { to: r.email, ...msg, idempotencyKey: `rec:${r.id}:${r.created_at}:${step}`,
      headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } });
    if (!res.ok) {
      // Falhou: tenta de novo em 15 min; desiste depois de 3 dias do início.
      const giveUp = Date.now() - Date.parse(r.created_at) > 3 * 86400000;
      await env.DB.prepare('UPDATE recovery SET next_at = ?, status = ?, detail = ?, updated_at = ? WHERE id = ?')
        .bind(addMin(t, 15), giveUp ? 'done' : 'active', `falha no e-mail ${step}: ${res.error}`, t, r.id).run();
      continue;
    }
    const next = step <= REC_LATER_H.length ? addMin(r.created_at, REC_LATER_H[step - 1] * 60) : null;
    await env.DB.prepare('UPDATE recovery SET step = ?, next_at = ?, status = ?, detail = ?, updated_at = ? WHERE id = ?')
      .bind(step, next || t, next ? 'active' : 'done', `e-mail ${step} enviado`, t, r.id).run();
  }
  return results.length;
}

async function sellyoWebhook(req, env, url, ctx) {
  if (env.SELLYO_WEBHOOK_TOKEN && !sameText(url.searchParams.get('token') || '', env.SELLYO_WEBHOOK_TOKEN)) {
    return json({ ok: false, error: 'Token inválido' }, 401);
  }
  const p = await readJson(req);
  if (!p || typeof p.event !== 'string') return json({ ok: false, error: 'Payload inválido' }, 400);
  const kind = EVENT_KIND[p.event] || 'ignore';
  const eventId = `${p.event}:${p.payment?.id || p.payment?.paymentId || p.cart?.id || p.timestamp || randomToken(8)}`;
  const log = async (outcome, detail = '') => {
    await env.DB.prepare('INSERT OR IGNORE INTO webhook_events (id, event, outcome, detail, payload) VALUES (?, ?, ?, ?, ?)')
      .bind(eventId, p.event, outcome, detail, JSON.stringify(redact(p)).slice(0, 20000)).run();
    return json({ ok: true, outcome, detail });
  };

  const dup = await env.DB.prepare('SELECT outcome FROM webhook_events WHERE id = ?').bind(eventId).first();
  if (dup) return json({ ok: true, outcome: 'duplicate' });
  if (kind === 'ignore') return log('ignored');
  if (kind === 'abandoned') {
    const email = normEmail(p.customer?.email);
    const it = itemsOf(p)[0];
    if (!validEmail(email) || !it) return log('ignored', 'abandono sem e-mail ou produto');
    return log('recovery', await startRecovery(env, p, { kind: 'cart', email, externalId: it.externalId }));
  }
  if (kind === 'approved' && p.subscription?.customerAccess?.hasAccess === false) return log('ignored', 'sem acesso');

  const email = normEmail(p.customer?.email);
  const items = itemsOf(p);
  const basePayment = String(p.payment?.paymentId || '');
  if (!validEmail(email)) return json({ ok: false, error: 'falta customer.email' }, 400);
  if (!items.length) return json({ ok: false, error: 'falta item.productId' }, 400);
  if (!basePayment) return json({ ok: false, error: 'falta payment.paymentId' }, 400);

  let user = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  let created = false;
  const buyerName = String(p.customer?.name || '').trim().slice(0, 200);
  const buyerPhone = String(p.customer?.phone || '').replace(/[^\d+]/g, '').slice(0, 20);
  if (!user && kind === 'approved') {
    const id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO users (id, email, name, phone, password_hash) VALUES (?, ?, ?, ?, ?)')
      .bind(id, email, buyerName, buyerPhone, await hashPassword(env.DEFAULT_PASSWORD || '12345678')).run();
    user = { id };
    created = true;
  } else if (user && kind === 'approved' && (buyerName || buyerPhone)) {
    // Completa nome/telefone que ainda estejam vazios (contas antigas ou compra sem telefone).
    await env.DB.prepare(`UPDATE users SET name = CASE WHEN name = '' THEN ?1 ELSE name END,
        phone = CASE WHEN phone = '' THEN ?2 ELSE phone END WHERE id = ?3`).bind(buyerName, buyerPhone, user.id).run();
  }

  const stmts = [];
  const unmapped = [];
  for (const [i, it] of items.entries()) {
    // Produto novo entra sem liberar nada até alguém preencher "grants".
    stmts.push(env.DB.prepare('INSERT OR IGNORE INTO products (external_id, name) VALUES (?, ?)').bind(it.externalId, it.name));
    const tx = it.paymentId || (i === 0 ? basePayment : `${basePayment}:${it.externalId}`);
    const status = kind; // approved | pending | refunded | chargeback
    stmts.push(env.DB.prepare(
      `INSERT INTO purchases (transaction_id, order_id, external_id, user_id, buyer_email, status, last_event)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
       ON CONFLICT(transaction_id) DO UPDATE SET
         -- reembolso/chargeback são definitivos: uma aprovação repetida do mesmo pagamento não devolve o acesso
         status = CASE WHEN purchases.status IN ('refunded','chargeback') THEN purchases.status
                       WHEN ?6 = 'pending' AND purchases.status = 'approved' THEN purchases.status
                       ELSE ?6 END,
         user_id = COALESCE(?4, purchases.user_id), last_event = ?7, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
    ).bind(tx, p.order?.orderId || null, it.externalId, user?.id || null, email, status, p.event));
  }
  await env.DB.batch(stmts);
  for (const it of items) {
    const prod = await env.DB.prepare('SELECT grants FROM products WHERE external_id = ?').bind(it.externalId).first();
    if (!prod?.grants) unmapped.push(it.externalId);
  }
  let recNote = '';
  if (kind === 'approved') await stopRecovery(env, email);
  else if (p.event === 'sale_pix_generated') recNote = 'recuperação: ' + (await startRecovery(env, p, { kind: 'pix', email, externalId: items[0].externalId }));
  const outcome = kind === 'approved' ? (unmapped.length ? 'unmapped_product' : 'granted') : kind === 'pending' ? 'recorded' : 'revoked';
  if (kind !== 'pending') {
    const job = notifyBuyer(env, { kind, email, name: p.customer?.name, orderId: p.order?.orderId || null, basePayment })
      .catch((e) => console.error('email_error', e?.message));
    if (ctx) ctx.waitUntil(job);
    else await job;
  }
  return log(outcome, [created ? 'conta criada' : '', unmapped.length ? 'sem mapeamento: ' + unmapped.join(', ') : '', recNote].filter(Boolean).join(' · '));
}

// ---------- rotas da conta ----------
function catalog(lang = 'pt') {
  const c = CONTENT[lang] || CONTENT.pt;
  return c.modules.map((m) => ({ id: m.id, icon: m.icon, total: m.total }));
}

async function me(user, env) {
  const grants = await grantsFor(env, user);
  return {
    user: {
      email: user.email,
      name: user.name,
      phone: user.phone || '',
      mustChangePassword: !!user.must_change_password,
      termsAccepted: user.terms_version === TERMS_VERSION,
    },
    termsVersion: TERMS_VERSION,
    checkoutUrl: env.CHECKOUT_URL || '',
    bumpUrls: { dinheiro: env.BUMP_URL_DINHEIRO || '', platina: env.BUMP_URL_PLATINA || '', garagem: env.BUMP_URL_GARAGEM || '' },
    modules: catalog().map((m) => ({ ...m, access: canSee(grants, m.id) })),
    built: CONTENT_PT.built,
  };
}

async function api(req, env, url, ctx) {
  const path = url.pathname;
  const method = req.method;

  if (path === '/api/webhooks/sellyo' && method === 'POST') return sellyoWebhook(req, env, url, ctx);

  // Prévia dos e-mails, só no ambiente de desenvolvimento: /api/dev/email/acesso | reembolso | chargeback
  const rv = path.match(/^\/api\/dev\/email\/(carrinho|pix)-([123])$/);
  if (rv && method === 'GET' && isDev(env)) {
    const m = recoveryEmail(env, { kind: rv[1] === 'pix' ? 'pix' : 'cart', step: Number(rv[2]), name: 'Lucia Caminos', link: 'https://pay.sellyo.com.br/p/exemplo',
      pixCode: rv[1] === 'pix' ? '00020126580014br.gov.bcb.pix0136exemplo-de-codigo-pix-copia-e-cola5204000053039865406' : '', unsubUrl: await unsubUrl(env, 'lucia@example.com') });
    return new Response(m.html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
  if (path === '/api/dev/recovery/run' && method === 'POST' && isDev(env)) return json({ processed: await runRecovery(env) });

  if (path === '/api/email/sair' && (method === 'GET' || method === 'POST')) {
    const email = normEmail(url.searchParams.get('e'));
    const ok = validEmail(email) && sameText(url.searchParams.get('t') || '', await hmacTag(env, email));
    if (ok) {
      await env.DB.batch([
        env.DB.prepare('INSERT OR IGNORE INTO email_optout (email) VALUES (?)').bind(email),
        env.DB.prepare("UPDATE recovery SET status = 'optout', updated_at = ? WHERE email = ? AND status = 'active'").bind(now(), email),
      ]);
    }
    const msg = ok ? 'Pronto! Você não vai mais receber esses e-mails.' : 'Link inválido.';
    return new Response(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vice Detonado</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0d0618;color:#f6eeff;font-family:Inter,system-ui,sans-serif;text-align:center;padding:24px">
<div><h1 style="font-size:22px">${msg}</h1><p style="color:#b3a3d1">Se mudar de ideia, é só comprar quando quiser.</p></div></body></html>`,
      { status: ok ? 200 : 400, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }

  const pv = path.match(/^\/api\/dev\/email\/(acesso|reembolso|chargeback)$/);
  if (pv && method === 'GET' && isDev(env)) {
    const m = pv[1] === 'acesso'
      ? accessEmail(env, { name: 'Lucia Caminos', email: 'lucia@example.com', grants: new Set(['principal', 'dinheiro', 'platina']), isDefaultPassword: true })
      : cancelEmail(env, { name: 'Lucia Caminos', kind: pv[1] === 'chargeback' ? 'chargeback' : 'refunded', items: ['Vice Detonado', 'Rota do Dinheiro'], stillHasAccess: false });
    return new Response(m.html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  }

  if (path === '/api/login' && method === 'POST') {
    const b = (await readJson(req)) || {};
    const email = normEmail(b.email);
    const pw = String(b.password || '');
    if (!validEmail(email) || !pw || pw.length > 200) return json({ error: 'INVALID_CREDENTIALS' }, 401);
    const u = await env.DB.prepare('SELECT id, password_hash FROM users WHERE email = ?').bind(email).first();
    const ok = await verifyPassword(pw, u?.password_hash || DUMMY_HASH);
    if (!u || !ok) return json({ error: 'INVALID_CREDENTIALS' }, 401);
    if (await tooManyLogins(env, u.id)) return json({ error: 'TOO_MANY_LOGINS' }, 429);
    const cookie = await createSession(env, u.id, req);
    const full = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(u.id).first();
    return json(await me(full, env), 200, { 'set-cookie': cookie });
  }

  const user = await loadUser(req, env);
  if (path === '/api/logout' && method === 'POST') {
    if (user) await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(user.sid).run();
    return json({ ok: true }, 200, { 'set-cookie': `${cookieName(env)}=; Path=/; Max-Age=0${isDev(env) ? '' : '; Secure'}` });
  }
  if (!user) return json({ error: 'UNAUTHENTICATED' }, 401);

  if (path === '/api/me' && method === 'GET') return json(await me(user, env));

  if (path === '/api/terms' && method === 'POST') {
    const b = (await readJson(req)) || {};
    if (b.version !== TERMS_VERSION) return json({ error: 'TERMS_VERSION' }, 400);
    await env.DB.prepare('UPDATE users SET terms_version = ?, terms_accepted_at = ?, updated_at = ? WHERE id = ?')
      .bind(TERMS_VERSION, now(), now(), user.id).run();
    return json({ ok: true });
  }

  if (path === '/api/password' && method === 'POST') {
    const b = (await readJson(req)) || {};
    const next = String(b.next || '');
    if (next.length < 6 || next.length > 200) return json({ error: 'WEAK_PASSWORD' }, 400);
    if (!(await verifyPassword(String(b.current || ''), user.password_hash))) return json({ error: 'INVALID_CREDENTIALS' }, 401);
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?').bind(await hashPassword(next), now(), user.id),
      env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND id <> ?').bind(user.id, user.sid),
    ]);
    return json({ ok: true });
  }

  const mm = path.match(/^\/api\/missions\/([a-z]{2})(?:\/([a-z0-9-]+))?$/);
  if (mm && method === 'GET') {
    const grants = await grantsFor(env, user);
    if (!canSee(grants, 'missoes')) return json({ error: 'LOCKED' }, 403);
    const data = MISSOES_PT; // um idioma por enquanto
    if (!mm[2]) return json(data.index, 200, { 'cache-control': 'private, max-age=300' });
    const m = data.detail[mm[2]];
    return m ? json(m, 200, { 'cache-control': 'private, max-age=300' }) : json({ error: 'NOT_FOUND' }, 404);
  }

  const cm = path.match(/^\/api\/content\/([a-z]{2})\/([a-z]+)$/);
  if (cm && method === 'GET') {
    const [, lang, mod] = cm;
    const grants = await grantsFor(env, user);
    if (!canSee(grants, mod)) return json({ error: 'LOCKED' }, 403);
    const m = (CONTENT[lang] || CONTENT.pt).modules.find((x) => x.id === mod);
    if (!m) return json({ error: 'NOT_FOUND' }, 404);
    return json(m, 200, { 'cache-control': 'private, max-age=300' });
  }

  if (path === '/api/progress') {
    if (method === 'GET') {
      const r = await env.DB.prepare('SELECT data FROM progress WHERE user_id = ?').bind(user.id).first();
      return json({ data: r ? JSON.parse(r.data) : {} });
    }
    if (method === 'PUT') {
      const b = (await readJson(req)) || {};
      const data = b.data && typeof b.data === 'object' ? b.data : {};
      const s = JSON.stringify(data);
      if (s.length > 200000) return json({ error: 'TOO_LARGE' }, 413);
      await env.DB.prepare(
        `INSERT INTO progress (user_id, data, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
      ).bind(user.id, s, now()).run();
      return json({ ok: true });
    }
  }
  return json({ error: 'NOT_FOUND' }, 404);
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) {
      try {
        return await api(req, env, url, ctx);
      } catch (e) {
        console.error('api_error', e?.message);
        return json({ error: 'INTERNAL' }, 500); // a Sellyo reenvia em caso de 5xx
      }
    }
    return env.ASSETS.fetch(req);
  },
  // Cron (wrangler.jsonc → triggers): recuperação de carrinho/Pix por e-mail.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runRecovery(env).catch((e) => console.error('recovery_error', e?.message)));
  },
};
