// Test płatka w „Co umiem” (jedna wersja = A, wybór 03.11): 3 szerokości, strumienie do kart, najechanie, jasny motyw, nachodzenie, ruch.
const { chromium } = require('playwright');
const path = require('path');
const URL = require('url').pathToFileURL(path.resolve(__dirname, '..', 'meshuga-app.html')).href;
const OUT = process.env.MESHUGA_ZRZUTY || path.join(__dirname, 'wyniki');
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: process.env.PW_HEADLESS !== 'false' });
  const wyn = { kroki: 0, zrzuty: 0, bledy: [], sprawdzenia: [] };
  const ok = (n, w, i) => wyn.sprawdzenia.push((w ? 'OK  ' : 'BŁĄD ') + n + (i ? ' · ' + i : ''));
  for (const w of [1280, 768, 375]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w === 375 ? 780 : 900 } });
    const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') wyn.bledy.push(w + ': ' + m.text()); });
    p.on('pageerror', e => wyn.bledy.push(w + ' pageerror: ' + e.message));
    await p.goto(URL); await p.waitForTimeout(500); wyn.kroki++;
    await p.evaluate(() => document.querySelector('#umiemBtn').click()); await p.waitForTimeout(900); wyn.kroki++;
    const m = await p.evaluate(() => {
      const sc = document.querySelector('.umiem-scena'), slot = sc.querySelector('.platek-slot').getBoundingClientRect();
      const karty = [...sc.querySelectorAll('.ak')].map(a => a.getBoundingClientRect());
      const nach = karty.some(k => !(k.right <= slot.left || k.left >= slot.right || k.bottom <= slot.top || k.top >= slot.bottom));
      const srodek = karty.some(k => k.left < slot.left) && karty.some(k => k.left > slot.right);
      const cv = sc.querySelector('canvas'), c = cv.getContext('2d');
      const d = c.getImageData(0, 0, cv.width, cv.height).data; let czer = 0; for (let i = 0; i < d.length; i += 16) if (d[i + 3] > 40 && d[i] > 150 && d[i + 1] < 90) czer++;
      return { nach, srodek, czer, przelacznik: !!document.querySelector('[data-ust="platek"]'), poziomy: document.querySelector('#przewijak').scrollWidth > document.querySelector('#przewijak').clientWidth, slot: Math.round(slot.width) + '×' + Math.round(slot.height) };
    });
    ok(`${w} brak przełącznika PŁATEK`, !m.przelacznik);
    ok(`${w} płatek nie nachodzi na karty`, !m.nach, 'slot ' + m.slot);
    ok(`${w} układ`, w > 860 ? m.srodek : !m.srodek, w > 860 ? 'płatek między kolumnami' : 'do 860 px: płatek nad kartami');
    ok(`${w} płatek narysowany`, m.czer > 200, m.czer + ' czerwonych próbek');
    ok(`${w} bez poziomego przewijania`, !m.poziomy);
    const kl = () => p.evaluate(() => document.querySelector('.umiem-scena canvas').toDataURL().length + ':' + document.querySelector('.umiem-scena canvas').toDataURL().slice(-60));
    const k1 = await kl(); await p.waitForTimeout(400); const k2 = await kl(); wyn.kroki++;
    ok(`${w} animuje się`, k1 !== k2);
    await p.screenshot({ path: path.join(OUT, `platek_${w}.png`) }); wyn.zrzuty++;
    if (w === 1280) {
      await p.hover('.umiem-scena .ak >> nth=1'); await p.waitForTimeout(500); wyn.kroki++;
      await p.locator('.umiem-scena').screenshot({ path: path.join(OUT, `platek_1280_najechana.png`) }); wyn.zrzuty++;
      await p.click('#ustBtn'); await p.click('.seg[data-ust="motyw"] button[data-v="light"]'); await p.keyboard.press('Escape'); await p.waitForTimeout(500); wyn.kroki += 2;
      await p.screenshot({ path: path.join(OUT, `platek_1280_jasny.png`) }); wyn.zrzuty++;
    }
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(wyn, null, 1));
})();
