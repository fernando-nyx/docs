// Grava cenas de tela em 720x1280 (viewport de celular 360x640 @2x).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ED = '/tmp/claude-0/-home-user-docs/1b8e7bd0-ddc7-5df4-909a-a1352f42bf5a/scratchpad/ed';
const OUT = ED + '/rec';
const U = 'http://localhost:8787/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const only = process.argv.slice(2);

async function rec(browser, name, fn, opts = {}) {
  if (only.length && !only.includes(name)) return;
  const ctx = await browser.newContext({
    viewport: { width: 432, height: 768 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    recordVideo: { dir: OUT + '/tmp', size: { width: 432, height: 768 } }, storageState: opts.state,
  });
  const p = await ctx.newPage();
  await fn(p, ctx);
  const v = p.video();
  await ctx.close();
  fs.renameSync(await v.path(), path.join(OUT, name + '.webm'));
  console.log('ok', name);
}
async function smoothScroll(p, dy, ms) {
  const steps = Math.round(ms / 30);
  for (let i = 0; i < steps; i++) { await p.mouse.wheel(0, dy / steps); await wait(30); }
}

(async () => {
  fs.mkdirSync(OUT + '/tmp', { recursive: true });
  const b = await chromium.launch();
  // login uma vez e reaproveita a sessão
  const lc = await b.newContext({ viewport: { width: 360, height: 640 } });
  const lp = await lc.newPage();
  await lp.goto(U); await wait(800);
  await lp.fill('input[name=email]', 'teste@example.com'); await lp.fill('input[name=password]', '12345678');
  await lp.click('#login button'); await wait(1500);
  if (await lp.isVisible('#ok')) { await lp.click('#ok'); await wait(500); }
  const setProgress = (n) => lp.evaluate(async (n) => {
    const ids = [];
    for (const mod of ['cem', 'inicio']) { const m = await fetch('/api/content/pt/' + mod).then((r) => r.json());
      for (const s of m.sections) for (const bl of s.blocks) if (bl.type === 'table' && bl.check) bl.items.forEach((x) => ids.push(x.id)); }
    const idx = await fetch('/api/missions/pt').then((r) => r.json());
    idx.forEach((x) => ids.push(x.id));
    const data = {}; ids.slice(0, n).forEach((id) => (data[id] = 1));
    await fetch('/api/progress', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data }) });
  }, n);
  await setProgress(0);
  const state = await lc.storageState();
  // o progresso local também precisa estar zerado
  state.origins = [];

  // --- site de vídeo (dor) ---
  const site = 'file://' + ED + '/videosite.html';
  await rec(b, 'yt-busca', async (p) => { await p.goto(site); await wait(300); await p.evaluate(() => scene('busca')); await wait(300); });
  await rec(b, 'yt-player', async (p) => { await p.goto(site); await p.evaluate(() => scene('player')); await wait(1500); });
  await rec(b, 'yt-scrub', async (p) => { await p.goto(site); await p.evaluate(() => scene('scrub')); await wait(300); });
  await rec(b, 'yt-ingles', async (p) => { await p.goto(site); await p.evaluate(() => scene('ingles')); });

  // --- app ---
  await rec(b, 'app-home', async (p) => { await p.goto(U); await wait(2500); }, { state });
  await rec(b, 'app-lista', async (p) => { await p.goto(U + '#/missoes'); await wait(1500); await smoothScroll(p, 1400, 3500); await wait(500); }, { state });
  await rec(b, 'app-missao', async (p) => {
    await p.goto(U + '#/missoes'); await wait(1200);
    await p.click('a.mlink[href="#/missao/gone-fishing"]'); await wait(1500);
    await smoothScroll(p, 1700, 4500); await wait(800);
  }, { state });
  await rec(b, 'app-perdivel', async (p) => {
    await p.goto(U + '#/missoes'); await wait(800);
    await p.evaluate(() => document.querySelector('a.mlink[href="#/missao/get-shirleys-rum"]').scrollIntoView({ block: 'center' })); await wait(1200);
    await p.click('a.mlink[href="#/missao/get-shirleys-rum"]'); await wait(2500);
  }, { state });
  await rec(b, 'app-capitulo', async (p) => {
    await p.goto(U + '#/m/inicio'); await wait(1200);
    const id = await p.evaluate(() => [...document.querySelectorAll('section.sec')].find((s) => /perd/i.test(s.querySelector('.sec-t')?.textContent || ''))?.id);
    await p.evaluate((id) => document.getElementById(id).scrollIntoView(), id); await wait(800);
    await smoothScroll(p, 700, 2500); await wait(500);
  }, { state });
  await rec(b, 'app-checklist', async (p) => {
    await p.goto(U + '#/m/cem'); await wait(1200);
    await p.evaluate(() => document.querySelectorAll('.item.chk')[4].scrollIntoView({ block: 'center' })); await wait(800);
    const items = await p.$$('.item.chk');
    for (const i of [4, 5, 6, 7, 8]) { await items[i].click(); await wait(550); }
    await wait(600);
  }, { state });
  await rec(b, 'app-filtro', async (p) => {
    await p.goto(U + '#/m/cem'); await wait(1500);
    await p.click('text=Só pendentes'); await wait(1500);
  }, { state });
  await rec(b, 'app-busca', async (p) => {
    await p.goto(U); await wait(1000);
    await p.click('input[name=q]');
    for (const ch of 'cofre') { await p.keyboard.type(ch); await wait(160); }
    await p.keyboard.press('Enter'); await wait(2500);
  }, { state });
  // porcentagem subindo: 3 tomadas com progresso crescente
  for (const [n, tag] of [[90, 'a'], [300, 'b'], [560, 'c']]) {
    await setProgress(n);
    await rec(b, 'app-pct-' + tag, async (p) => { await p.goto(U); await wait(1600); }, { state });
  }
  await setProgress(0);
  await b.close();
})();
