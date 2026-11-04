// Po usunięciu kątowników (04.11): zrzuty aplikacji i strony + sprawdzenie, że żaden pseudo-element nie rysuje rogów.
const { chromium } = require('playwright');
const OUT = 'C:/Users/maisa/Documents/Meshuga/zrzuty-testy/bez-katownikow';
const APP = 'file:///C:/Users/maisa/Documents/Meshuga/meshuga-app.html';
const STR = 'file:///C:/Users/maisa/Documents/cybersora-pages/index.html';
(async () => {
  const b = await chromium.launch({ headless: true });
  let kroki = 0, bledy = [], zrzuty = 0;
  // ile elementów ma ::before/::after z 4+ gradientami liniowymi (wzór kątownika)
  const licz = () => [...document.querySelectorAll('*')].filter(e => ['::before', '::after'].some(ps => {
    const s = getComputedStyle(e, ps); return s.content !== 'none' && (s.backgroundImage.match(/linear-gradient/g) || []).length >= 4 && !/90deg|180deg/.test(s.backgroundImage); })).length;
  for (const w of [1280, 375]) {
    const p = await b.newPage({ viewport: { width: w, height: 860 } });
    await p.goto(APP); await p.waitForTimeout(800); kroki++;
    await p.screenshot({ path: `${OUT}/app_start_${w}.png` }); zrzuty++;
    await p.click('#kontoBtn').catch(() => {}); await p.waitForTimeout(500); kroki++;
    await p.screenshot({ path: `${OUT}/app_konto_${w}.png` }); zrzuty++;
    const n = await p.evaluate(licz); if (n) bledy.push(`app ${w}: ${n} elementów z kątownikami`); kroki++;
    await p.close();
  }
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(STR); await p.waitForTimeout(1200); kroki++;
  await p.screenshot({ path: OUT + "/strona_start_1280.png" }); zrzuty++;
  const n = await p.evaluate(licz); if (n) bledy.push(`strona: ${n} elementów z kątownikami`); kroki++;
  await b.close();
  console.log(`kroki ${kroki}, zrzuty ${zrzuty}, błędy ${bledy.length}`, bledy);
})();
