// Pasek boczny (uwaga maisy 03.11): nowe ikony + płynne zwijanie. Ikony mają stać w tym samym miejscu (środek X) po zwinięciu
// i rozwinięciu, napisy gasną, nic nie wystaje z wąskiego paska, ikona szukajki rozwija pasek. Zrzuty: rozwinięty, w połowie, zwinięty.
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file:///' + path.resolve(process.env.MESHUGA_PLIK || path.join(__dirname, '..', 'meshuga-app.html')).replace(/\\/g, '/');
const OUT = __dirname;
(async () => {
  const browser = await chromium.launch({ headless: process.env.PW_HEADLESS !== 'false' });
  const wyn = { kroki: 0, zrzuty: 0, bledy: [], sprawdzenia: [] };
  const ok = (n, w, i) => wyn.sprawdzenia.push((w ? 'OK  ' : 'BŁĄD ') + n + (i ? ' · ' + i : ''));
  for (const motyw of ['dark', 'light']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
    await ctx.addInitScript(m => { try { localStorage.setItem('meshuga.ust', JSON.stringify({ motyw: m, zwiniety: false })); } catch (e) {} }, motyw);
    const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') wyn.bledy.push(motyw + ': ' + m.text()); });
    p.on('pageerror', e => wyn.bledy.push(motyw + ' pageerror: ' + e.message));
    await p.goto(URL); await p.waitForTimeout(600); wyn.kroki++;
    const pomiar = () => p.evaluate(() => {
      const pas = document.querySelector('#pasek').getBoundingClientRect();
      const sel = { zwin: '#zwin svg', nowy: '#nowy svg', szukaj: '.szukaj svg', umiem: '#umiemBtn svg', ust: '#ustBtn svg', wroc: '.pasek-dol a svg' };
      const x = {}, y = {}; for (const k in sel) { const r = document.querySelector(sel[k]).getBoundingClientRect(); x[k] = +(r.left + r.width / 2).toFixed(1); y[k] = Math.round(r.top); }
      const ukr = [...document.querySelectorAll('.pasek .ukr')].map(e => +getComputedStyle(e).opacity);
      const wystaje = [...document.querySelectorAll('#pasek svg')].some(s => { const r = s.getBoundingClientRect(); return r.width && (r.right > pas.right + .5); });
      return { szer: Math.round(pas.width), x, y, ukrMax: Math.max(...ukr), ukrMin: Math.min(...ukr), wystaje, nowe: document.querySelectorAll('#pasek svg.ik-pasek').length };
    });
    const a = await pomiar();
    ok(`${motyw} 6 nowych ikon paska`, a.nowe === 6, a.nowe + '');
    ok(`${motyw} rozwinięty: napisy widoczne`, a.ukrMin === 1);
    const pod = await p.evaluate(() => { const s = document.querySelector('.imie small'), i = document.querySelector('.imie'); return { pelny: s.scrollWidth <= i.clientWidth + 0.5, w: s.scrollWidth, miejsce: i.clientWidth }; });
    ok(`${motyw} rozwinięty: podpis „AI CHATBOT CYBERSORY” nieucięty`, pod.pelny, pod.w + ' / ' + pod.miejsce + ' px');
    await p.locator('#pasek').screenshot({ path: path.join(OUT, `pasek_${motyw}_rozwiniety.png`) }); wyn.zrzuty++;
    await p.click('#zwin'); await p.waitForTimeout(170); wyn.kroki++;
    if (motyw === 'dark') { await p.screenshot({ path: path.join(OUT, `pasek_dark_w_polowie.png`), clip: { x: 0, y: 0, width: 300, height: 820 } }); wyn.zrzuty++; }
    const pol = await pomiar();
    await p.waitForTimeout(500);
    const b = await pomiar();
    ok(`${motyw} zwinięty: 76 px, napisy zgaszone`, b.szer === 76 && b.ukrMax === 0, b.szer + ' px · krycie ' + b.ukrMax);
    const dx = Object.keys(a.x).map(k => Math.abs(a.x[k] - b.x[k]));
    ok(`${motyw} ikony nie skaczą w poziomie (zwinięty vs rozwinięty, bez przycisku zwijania)`, Object.keys(a.x).filter(k => k !== 'zwin').every(k => Math.abs(a.x[k] - b.x[k]) <= 1), JSON.stringify(Object.fromEntries(Object.keys(a.x).map((k, i) => [k, +dx[i].toFixed(1)]))));
    ok(`${motyw} w połowie animacji ikony też stoją`, Object.keys(a.x).filter(k => k !== 'zwin').every(k => Math.abs(a.x[k] - pol.x[k]) <= 1), 'szerokość w połowie ' + pol.szer + ' px');
    ok(`${motyw} ikony nie skaczą w pionie (poza paskiem górnym)`, ['nowy', 'szukaj', 'umiem', 'ust', 'wroc'].every(k => Math.abs(a.y[k] - b.y[k]) <= 1), JSON.stringify(b.y));
    ok(`${motyw} zwinięty: wszystkie ikony w środku paska (37,5 px ± 1,5)`, Object.values(b.x).every(v => Math.abs(v - 37.5) <= 1.5), JSON.stringify(b.x));
    ok(`${motyw} zwinięty: nic nie wystaje`, !b.wystaje);
    await p.locator('#pasek').screenshot({ path: path.join(OUT, `pasek_${motyw}_zwiniety.png`) }); wyn.zrzuty++;
    await p.click('.szukaj', { timeout: 2000 }).catch(() => {}); await p.waitForTimeout(600); wyn.kroki++;
    const c = await p.evaluate(() => ({ szer: Math.round(document.querySelector('#pasek').getBoundingClientRect().width), fokus: document.activeElement && document.activeElement.id }));
    ok(`${motyw} klik w szukajkę rozwija pasek i daje fokus`, c.szer === 272 && c.fokus === 'szukaj', JSON.stringify(c));
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(wyn, null, 1));
})();
