// Zrzuty do PR (05.11): przed/po poprawek dotyku (wygląd ma zostać ten sam) i miejsca do decyzji maisy.
// PRZED_ROOT = katalog strony sprzed zmian (np. git archive cabc46c), domyślnie tylko „po”.
// Uruchomienie: PRZED_ROOT=/tmp/stary node _testy_strony/zrzuty_responsywnosc.js
const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'zrzuty', 'responsywnosc');
fs.mkdirSync(OUT, { recursive: true });
const TYPY = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.avif': 'image/avif', '.json': 'application/json' };
const serwer = root => http.createServer((q, r) => {
  let f = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (f.endsWith('/')) f += 'index.html';
  const p = path.join(root, f);
  if (f.includes('..') || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TYPY[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r);
});
const UJECIA = [
  // [nazwa, widok, selektor do przewinięcia/wycięcia (null = cały ekran), tylko po?]
  ['375_kontakt_co_to_znaczy', 'contact', '.konf-help', false],
  ['375_produkty_filtry', 'products', '.pr-filtry', false],
  ['375_pasek', 'start', '.nav__bar', false],
  ['decyzja_375_oferta_kot_na_linkach', 'oferta', null, true],
  ['decyzja_375_kontakt_kroki_konfiguratora', 'contact', '#konfSteps', true],
  ['decyzja_375_sztuka_kot_na_galerii', 'sztuka', null, true]
];
(async () => {
  const b = await chromium.launch(); let n = 0;
  for (const [etap, root] of [['przed', process.env.PRZED_ROOT], ['po', path.resolve(__dirname, '..')]]) {
    if (!root) continue;
    const s = serwer(root); await new Promise(r => s.listen(0, r));
    const ctx = await b.newContext({ viewport: { width: 375, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1).*/, r => r.abort());
    const p = await ctx.newPage();
    await p.goto('http://127.0.0.1:' + s.address().port + '/'); await p.waitForTimeout(1200);
    for (const [nazwa, widok, sel, tylkoPo] of UJECIA) {
      if (tylkoPo && etap === 'przed') continue;
      await p.evaluate(v => { location.hash = '#' + v; }, widok); await p.waitForTimeout(900);
      const plik = path.join(OUT, (tylkoPo ? '' : etap + '_') + nazwa + '.png');
      if (sel) {
        await p.evaluate(q => { document.documentElement.style.scrollBehavior = 'auto'; const e = document.querySelector(q); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 200); }, sel); await p.waitForTimeout(300);
        const r = await p.locator(sel).first().boundingBox();
        await p.screenshot({ path: plik, clip: { x: 0, y: Math.max(0, r.y - 16), width: 375, height: Math.min(780 - Math.max(0, r.y - 16), r.height + 32) } });
      } else { await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(200); await p.screenshot({ path: plik }); }
      n++;
    }
    await ctx.close(); s.close();
  }
  await b.close();
  console.log('zrzuty: ' + n + ' → ' + OUT);
})();
