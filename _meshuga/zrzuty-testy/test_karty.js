// Warianty kart startowych 0–3: ciemny i jasny, 1280 i 375, najechanie; nachodzenie i równe wysokości.
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file:///' + path.resolve(__dirname, '..', 'meshuga-app.html').replace(/\\/g, '/');
const OUT = __dirname;
(async () => {
  const browser = await chromium.launch({ headless: process.env.PW_HEADLESS !== 'false' });
  const wyn = { kroki: 0, zrzuty: 0, bledy: [], sprawdzenia: [] };
  const ok = (n, w, i) => wyn.sprawdzenia.push((w ? 'OK  ' : 'BŁĄD ') + n + (i ? ' · ' + i : ''));
  for (const w of [1280, 375]) {
    for (const motyw of ['dark', 'light']) {
      if (w === 375 && motyw === 'light') continue;
      const ctx = await browser.newContext({ viewport: { width: w, height: w === 375 ? 780 : 820 } });
      await ctx.addInitScript(m => { try { localStorage.setItem('meshuga.ust', JSON.stringify({ motyw: m })); } catch (e) {} }, motyw);
      const p = await ctx.newPage();
      p.on('console', m => { if (m.type() === 'error') wyn.bledy.push(w + ': ' + m.text()); });
      p.on('pageerror', e => wyn.bledy.push(w + ' pageerror: ' + e.message));
      await p.goto(URL); await p.waitForTimeout(500); wyn.kroki++;
      // motyw: przez przełącznik, gdy klucz LS jest inny
      const jest = await p.evaluate(() => document.documentElement.getAttribute('data-theme') || 'dark');
      if (jest !== motyw) { await p.evaluate(m => { document.querySelector('#ustBtn').click(); document.querySelector(`.seg[data-ust="motyw"] button[data-v="${m}"]`).click(); document.body.click(); }, motyw); await p.waitForTimeout(300); }
      for (const v of ['0', '1', '2', '3']) {
        await p.evaluate(v => document.querySelector(`.seg[data-ust="karty"] button[data-v="${v}"]`).click(), v); await p.waitForTimeout(250); wyn.kroki++;
        const m = await p.evaluate(() => {
          const k = [...document.querySelectorAll('#karty .karta')].map(e => e.getBoundingClientRect());
          const nach = k.some((a, i) => k.some((b, j) => i < j && !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom)));
          const hs = new Set(k.map(r => Math.round(r.height)));
          const h1 = document.querySelector('#powitanie').getBoundingClientRect(), k0 = k[0];
          return { nach, hs: [...hs], podPowitaniem: k0.top >= h1.bottom, klasa: document.querySelector('#karty').className, poziomy: document.documentElement.scrollWidth > innerWidth };
        });
        ok(`${w} ${motyw} v${v} klasa`, v === '0' ? m.klasa === 'karty' : m.klasa.includes('kv-' + v), m.klasa);
        ok(`${w} ${motyw} v${v} karty nie nachodzą`, !m.nach && m.podPowitaniem && !m.poziomy, 'wysokości ' + m.hs.join('/'));
        await p.locator('.karty-wrap').screenshot({ path: path.join(OUT, `karty_v${v}_${w}_${motyw}.png`) }); wyn.zrzuty++;
        if (w === 1280 && motyw === 'dark' && v !== '0') {
          await p.hover('#karty .karta >> nth=1'); await p.waitForTimeout(450);
          await p.locator('.karty-wrap').screenshot({ path: path.join(OUT, `karty_v${v}_1280_najechana.png`) }); wyn.zrzuty++;
          await p.mouse.move(5, 5); await p.waitForTimeout(300);
        }
      }
      await ctx.close();
    }
  }
  await browser.close();
  console.log(JSON.stringify(wyn, null, 1));
})();
