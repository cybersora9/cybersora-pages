// v1.8 jedna wersja (wybór maisy 03.11): karty-widget, kółko A, tło kod, bez paska MAKIETA; mikrofon schowany w ramce artefaktu.
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file:///' + path.resolve(__dirname, '..', 'meshuga-app.html').replace(/\\/g, '/');
const OUT = __dirname;
// udawana ramka claude.ai: tylko window.claude.use (sample niedostępne → tryb pokazowy)
const RAMKA = () => { window.claude = { use: async () => null }; };
(async () => {
  const browser = await chromium.launch({ headless: process.env.PW_HEADLESS !== 'false' });
  const wyn = { kroki: 0, zrzuty: 0, bledy: [], sprawdzenia: [] };
  const ok = (n, w, i) => wyn.sprawdzenia.push((w ? 'OK  ' : 'BŁĄD ') + n + (i ? ' · ' + i : ''));
  for (const [w, motyw, ramka] of [[1280, 'dark', false], [1280, 'light', false], [768, 'dark', false], [375, 'dark', false], [1280, 'dark', true], [375, 'dark', true]]) {
    const nazwa = `${w}_${motyw}${ramka ? '_ramka' : ''}`;
    const ctx = await browser.newContext({ viewport: { width: w, height: w === 375 ? 780 : 820 } });
    // stare klucze makiety w pamięci: mają zostać zignorowane
    await ctx.addInitScript(m => { try { localStorage.setItem('meshuga.ust', JSON.stringify({ motyw: m, ring: 'C', tlo: '3', karty: '1', platek: 'B' })); } catch (e) {} }, motyw);
    if (ramka) await ctx.addInitScript(RAMKA);
    const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') wyn.bledy.push(nazwa + ': ' + m.text()); });
    p.on('pageerror', e => wyn.bledy.push(nazwa + ' pageerror: ' + e.message));
    await p.goto(URL); await p.waitForTimeout(700); wyn.kroki++;
    const m = await p.evaluate(() => {
      const k = [...document.querySelectorAll('#karty .karta')].map(e => e.getBoundingClientRect());
      const nach = k.some((a, i) => k.some((b, j) => i < j && !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom)));
      const ik = document.querySelector('#karty .karta .ik'), nr = document.querySelector('#karty .karta .nr');
      const mik = document.querySelector('#mikro');
      const h1 = document.querySelector('#powitanie');
      return {
        karty: k.length, nach, hs: [...new Set(k.map(r => Math.round(r.height)))],
        ik: ik ? (ik.getBoundingClientRect().width ? Math.round(ik.getBoundingClientRect().width) + 'px' : 'none') : 'brak',
        nr: nr ? (nr.getBoundingClientRect().width ? 'widoczny' : 'none') : 'brak',
        makieta: !!document.querySelector('[data-ust="karty"], [data-ust="ring"], [data-ust="tlo"], [data-ust="stan"], [data-ust="platek"]'),
        ring: [...document.querySelectorAll('#kotHero .mk-ring')].map(r => r.getAttribute('class')).join(','),
        tlo: !!document.querySelector('#tlo canvas.tlo-kod, #tlo canvas.tlo-snieg'), glitch: !!document.querySelector('#tlo .gpas'),
        mikro: mik.hidden ? 'schowany' : getComputedStyle(mik).display,
        kontaktPrawo: Math.round(innerWidth - document.querySelector('#kontaktBtn').getBoundingClientRect().right),
        powitanie: h1 ? h1.textContent.trim() : '', poziomy: document.documentElement.scrollWidth > innerWidth
      };
    });
    const tel = w <= 860; // do 860 px karty zwarte, bez rzędu z ikoną
    ok(`${nazwa} 4 karty, nie nachodzą, równe`, m.karty === 4 && !m.nach && m.hs.length === 1 && !m.poziomy, 'wysokości ' + m.hs.join('/'));
    ok(`${nazwa} karta-widget (ikona${tel ? ' schowana na telefonie' : ' i numer'})`, tel ? m.ik === 'none' : (m.ik === '34px' && m.nr === 'widoczny'), 'ik=' + m.ik + ' nr=' + m.nr);
    ok(`${nazwa} brak starych przełączników makiety`, !m.makieta);
    ok(`${nazwa} kółko A mimo ring:C w pamięci`, m.ring === 'mk-ring mk-ring-A', m.ring);
    ok(`${nazwa} tło kod mimo tlo:3 w pamięci`, m.tlo && !m.glitch);
    ok(`${nazwa} mikrofon`, ramka ? m.mikro === 'schowany' : m.mikro !== 'schowany', m.mikro);
    ok(`${nazwa} „Napisz” przy prawej krawędzi`, m.kontaktPrawo >= 14 && m.kontaktPrawo <= 20, m.kontaktPrawo + ' px');
    ok(`${nazwa} powitanie`, m.powitanie === 'Od czego zaczynamy?', m.powitanie);
    await p.screenshot({ path: path.join(OUT, `v18_${nazwa}.png`) }); wyn.zrzuty++;
    if (w === 1280 && motyw === 'dark' && !ramka) {
      await p.hover('#karty .karta >> nth=1'); await p.waitForTimeout(450); wyn.kroki++;
      const str = await p.evaluate(() => getComputedStyle(document.querySelectorAll('#karty .karta')[1].querySelector('.str')).opacity);
      ok(`${nazwa} najechanie: strzałka zamiast numeru`, +str > .9, 'opacity ' + str);
      await p.locator('.karty-wrap').screenshot({ path: path.join(OUT, `v18_karty_najechana.png`) }); wyn.zrzuty++;
    }
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(wyn, null, 1));
})();
