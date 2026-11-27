// Gera os topos dos e-mails em app/public/email/. Uso: node render-topo.js (precisa do playwright).
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(__dirname, '../../app/public/email/');
(async () => {
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 480 } });
  for (const v of ['acesso', 'cancelado']) {
    await p.goto('file://' + path.join(__dirname, 'topo.html') + '?v=' + v);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(600);
    await p.screenshot({ path: OUT + 'topo-' + v + '.png' });
    console.log('ok', v);
  }
  await b.close();
})();
