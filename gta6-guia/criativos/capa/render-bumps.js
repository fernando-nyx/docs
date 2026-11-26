const { chromium } = require('playwright');
const OUT = '/home/user/docs/gta6-guia/criativos/capa/';
const B = [
  { f: 'bump-rota-do-dinheiro-800.png', t1: 'ROTA DO', t2: 'DINHEIRO', sub: 'O jeito mais rápido de ficar rico no GTA 6',
    b1: '<b>22</b>bancos com valores', b2: '<b>$205 MIL</b>no maior cofre', b3: '✓ Códigos dos cofres', i1: 'din1.png', i2: 'din2.png',
    grad: 'linear-gradient(90deg,#ffd24a,#ffe58a 45%,#3df5a6)', glow: 'rgba(255,210,74,.6)' },
  { f: 'bump-guia-da-platina-800.png', t1: 'GUIA DA', t2: 'PLATINA', sub: 'Os 55 troféus do GTA 6, um por um',
    b1: '<b>55</b>troféus explicados', b2: '<b>3 ETAPAS</b>até a platina', b3: '✓ Todos os cheats', i1: 'plat2.png', i2: 'plat1.png',
    grad: 'linear-gradient(90deg,#19e3ff,#e8f6ff 50%,#c9a8ff)', glow: 'rgba(25,227,255,.6)' },
  { f: 'bump-garagem-e-arsenal-800.png', t1: 'GARAGEM &', t2: 'ARSENAL', sub: 'Carros raros, garagens e armas lendárias',
    b1: '<b>15</b>supercarros e onde achar', b2: '<b>8</b>armas lendárias', b3: '✓ Tanque e caça', i1: 'gar1.png', i2: 'gar2.png',
    grad: 'linear-gradient(90deg,#ffa34a,#ff7a5a 45%,#ff2e88)', glow: 'rgba(255,120,60,.6)' },
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 800 } });
  for (const x of B) {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'f')));
    await p.goto('file://' + process.cwd() + '/bump.html?' + q.toString()); await p.waitForTimeout(800);
    await p.screenshot({ path: OUT + x.f }); console.log('ok', x.f);
  }
  await b.close();
})();
