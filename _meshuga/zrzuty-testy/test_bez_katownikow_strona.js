// Strona po usunięciu kątowników (04.11): podstrony 1280 i 375, konsola, licznik rogów na pseudo-elementach.
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(process.env.MESHUGA_ZRZUTY || path.join(__dirname, 'wyniki'), 'bez-katownikow');
require('fs').mkdirSync(OUT, { recursive: true });
const STR = require('url').pathToFileURL(path.resolve(process.env.STRONA_ROOT || path.join(__dirname, '..', '..'), 'index.html')).href;
(async () => {
  const b = await chromium.launch({ headless: true });
  let kroki = 0, zrzuty = 0; const bledy = [];
  for (const w of [1280, 375]) {
    const p = await b.newPage({ viewport: { width: w, height: w === 375 ? 800 : 900 } });
    p.on('pageerror', e => bledy.push(w + ' pageerror ' + e.message));
    for (const r of ['start', 'oferta', 'products', 'zrobilismy', 'sztuka', 'contact']) {
      await p.goto(STR + '#' + r); await p.waitForTimeout(1400); kroki++;
      await p.screenshot({ path: `${OUT}/strona_${r}_${w}.png` }); zrzuty++;
    }
    const n = await p.evaluate(() => [...document.querySelectorAll('*')].filter(e => ['::before', '::after'].some(ps => {
      const s = getComputedStyle(e, ps); if (s.content === 'none') return false;
      const g = (s.backgroundImage.match(/linear-gradient/g) || []).length >= 4 && /(\d+px \d\.?\d*px)/.test(s.backgroundSize);
      const ramka = s.position === 'absolute' && s.transform === 'none' && parseFloat(s.width) <= 30 && /* obrócony kwadrat = ogonek dymka, nie kątownik */ ((parseFloat(s.borderTopWidth) && parseFloat(s.borderLeftWidth)) || (parseFloat(s.borderBottomWidth) && parseFloat(s.borderRightWidth)));
      return g || ramka; })).map(e => e.className).slice(0, 5));
    if (n.length) bledy.push(w + ' rogi: ' + n.join(', ')); kroki++;
    await p.close();
  }
  await b.close();
  console.log(`kroki ${kroki}, zrzuty ${zrzuty}, błędy ${bledy.length}`, bledy);
})();
