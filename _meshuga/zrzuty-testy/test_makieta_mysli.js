// Makieta „Meshuga myśli”: 3 szerokości × stany, konsola, klatki przez 3 s.
const { chromium } = require('playwright');
const path = require('path');
const OUT = 'C:/Users/maisa/Documents/Meshuga/zrzuty-testy/makieta-mysli';
const URL = 'file:///C:/Users/maisa/Documents/Meshuga/makieta-mysli.html';
(async () => {
  const b = await chromium.launch({ headless: process.env.PW_HEADLESS === 'true' });
  let bledy = 0, kroki = 0, zrzuty = 0; const log = [];
  const ok = (w, m) => { kroki++; if (!w) { bledy++; log.push('BŁĄD: ' + m); } };
  for (const [w, h] of [[1280, 900], [768, 1000], [375, 800]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const kons = [];
    p.on('console', m => { if (m.type() === 'error') kons.push(m.text()); });
    p.on('pageerror', e => kons.push(String(e)));
    p.on('requestfailed', r => kons.push('sieć: ' + r.url()));
    await p.goto(URL); await p.waitForTimeout(2600);
    // klatki: 3 s requestAnimationFrame
    const fr = await p.evaluate(() => new Promise(r => { let n = 0, max = 0, l = performance.now(); const s = l;
      (function f(t) { n++; max = Math.max(max, t - l); l = t; if (t - s < 3000) requestAnimationFrame(f); else r({ n, max }); })(l); }));
    log.push(`${w}: ${fr.n} klatek w 3 s, najdłuższa ${fr.max.toFixed(1)} ms`);
    ok(fr.n >= 150, `${w}: za mało klatek ${fr.n}`);
    const etap = await p.locator('.hero .etap .tx').first().textContent();
    ok(etap === 'przeglądam cennik', `${w}: etap po 5,6 s = "${etap}"`);
    // nic nie wychodzi poza ekran poziomo
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(sw <= w, `${w}: przewijanie poziome ${sw}`);
    // napis etapu nie nachodzi na canvas wstęgi (pole rysowania przedniego płótna vs napis)
    const kol = await p.evaluate(() => [...document.querySelectorAll('.hero')].map(h => {
      const c = h.querySelector('.mk').getBoundingClientRect(), t = h.querySelector('.etap').getBoundingClientRect();
      return t.top - (c.bottom + c.height * 0.12); }));
    ok(kol.every(x => x >= 0), `${w}: napis za blisko wstęgi ${kol}`);
    await p.screenshot({ path: `${OUT}/mysli_${w}.png`, fullPage: true }); zrzuty++;
    if (w === 1280) {
      for (const v of ['A', 'B', 'C']) { await p.locator(`.karta[data-v=${v}] .hero`).screenshot({ path: `${OUT}/hero_${v}.png` }); zrzuty++; }
      await p.click('[data-temat=kod]'); await p.click('#bZrzut'); await p.waitForTimeout(2000);
      const e2 = await p.locator('.hero .etap .tx').first().textContent();
      ok(e2 === 'oglądam Twój zrzut', `etap ze zrzutem po 1 s = "${e2}"`);
      await p.waitForTimeout(2600);
      const e3 = await p.locator('.hero .etap .tx').first().textContent();
      ok(e3 === 'czytam Twój kod', `etap kod = "${e3}"`);
      await p.click('#bGotowe'); await p.waitForTimeout(800);
      const puste = await p.evaluate(() => [...document.querySelectorAll('.mm-c')].every(c => {
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) if (d[i]) return false; return true; }));
      ok(puste, 'po „gotowe” płótna nie są puste');
      const sq = await p.locator('.mk-squint').count(); ok(sq === 0, `po „gotowe” ${sq} kotów dalej mruży`);
      await p.screenshot({ path: `${OUT}/gotowe_1280.png` }); zrzuty++;
      await p.click('#bMysli'); await p.click('#bRuch'); await p.waitForTimeout(1200);
      await p.screenshot({ path: `${OUT}/ruch_ograniczony_1280.png` }); zrzuty++;
      const a = await p.evaluate(() => document.getAnimations().length); ok(a === 0, `ograniczony ruch: ${a} animacji`);
    }
    ok(kons.length === 0, `${w}: konsola/sieć ${kons.join(' | ')}`);
    await p.close();
  }
  await b.close();
  console.log(log.join('\n')); console.log(`kroki ${kroki}, błędy ${bledy}, zrzuty ${zrzuty}`);
})();
