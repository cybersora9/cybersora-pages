// Droga użytkownika na kopii żywej strony (Documents\cybersora-pages) z nagłówkami cybersora.pl:
// strona główna → kot w rogu → pytanie → „Czatuj” → cybersora.pl/meshuga/ w nowej karcie odpowiada na to pytanie.
// Host cybersora.test (udawany serwer kont w aplikacji, Workera nie dotykamy).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = __dirname;
const ROOT = process.env.STRONA_ROOT || 'C:\\Users\\maisa\\Documents\\cybersora-pages';
const CSP = "default-src 'self'; script-src 'self' https://web3forms.com https://hcaptcha.com https://*.hcaptcha.com; style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.web3forms.com https://hcaptcha.com https://*.hcaptcha.com https://dancycloud-ranking.dancycloud-ranking.workers.dev; frame-src https://hcaptcha.com https://*.hcaptcha.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://api.web3forms.com";
const TYPY = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.avif': 'image/avif', '.json': 'application/json', '.xml': 'application/xml' };
const PYT = 'Ile kosztuje bot na Discorda?';
(async () => {
  const browser = await chromium.launch({ headless: process.env.PW_HEADLESS !== 'false' });
  const wyn = { kroki: 0, zrzuty: 0, bledy: [], sprawdzenia: [] };
  const ok = (n, w, i) => wyn.sprawdzenia.push((w ? 'OK  ' : 'BŁĄD ') + n + (i ? ' · ' + i : ''));
  for (const w of [1280, 375]) {
    const n = 'wdr_' + w;
    const ctx = await browser.newContext({ viewport: { width: w, height: w === 375 ? 780 : 820 }, reducedMotion: 'reduce' });
    const csp = [], brak = [];
    await ctx.route(/^https?:\/\/(?!cybersora\.test).*/, r => r.abort());
    await ctx.route('http://cybersora.test/**', async r => {
      const u = new URL(r.request().url());
      const f = decodeURIComponent(u.pathname.endsWith('/') ? u.pathname + 'index.html' : u.pathname);
      const nak = process.env.NAKLADKA && path.join(process.env.NAKLADKA, f);
      const plik = nak && fs.existsSync(nak) ? nak : path.join(ROOT, f);
      if (f.includes('..') || !fs.existsSync(plik) || fs.statSync(plik).isDirectory()) { brak.push(f); return r.fulfill({ status: 404, body: 'brak' }); }
      await r.fulfill({ status: 200, body: fs.readFileSync(plik), headers: { 'content-type': TYPY[path.extname(plik)] || 'application/octet-stream', 'content-security-policy': CSP, 'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' } });
    });
    ctx.on('page', pg => {
      pg.on('console', m => { if (m.type() === 'error') { if (/Content Security Policy/i.test(m.text())) csp.push(m.text()); else if (!/Failed to load resource/.test(m.text())) wyn.bledy.push(n + ': ' + m.text()); } });
      pg.on('pageerror', e => wyn.bledy.push(n + ' pageerror: ' + e.message));
    });
    const p = await ctx.newPage();
    await p.goto('http://cybersora.test/'); await p.waitForTimeout(1500); wyn.kroki++;
    const kot = p.locator('.kot__btn');
    ok(`${n} kot w rogu widoczny`, await kot.isVisible().catch(() => false));
    await kot.click(); await p.waitForTimeout(500); wyn.kroki++;
    await p.fill('#kotPanel .kot__in[aria-label="Pytanie do Meshugi"]', PYT); wyn.kroki++;
    const cz = await p.evaluate(() => { const a = document.querySelector('.kot__czatuj'); return { href: a.getAttribute('href'), txt: a.textContent }; });
    ok(`${n} „Czatuj” prowadzi do /meshuga/ z pytaniem`, /^\/meshuga\/\?q=/.test(cz.href || '') && !/wkrótce/.test(cz.txt), JSON.stringify(cz));
    await p.screenshot({ path: path.join(OUT, `wdrozenie_${w}_okienko.png`) }); wyn.zrzuty++;
    const [app] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), p.click('.kot__czatuj', { timeout: 3000 }).catch(() => {})]); wyn.kroki++;
    ok(`${n} aplikacja otwiera się w nowej karcie`, !!app);
    if (app) {
      await app.waitForLoadState(); await app.waitForTimeout(600);
      const jest = await app.waitForFunction(t => [...document.querySelectorAll('#feed .msg-u')].some(e => e.textContent === t), PYT, { timeout: 5000 }).then(() => true, () => false);
      await app.waitForFunction(() => !document.querySelector('#feed .log li:not(.ok)') && document.querySelectorAll('#feed .msg-m .tekst').length > 0, null, { timeout: 10000 }).catch(() => {});
      const s = await app.evaluate(() => ({ adres: location.pathname + location.search, odp: ([...document.querySelectorAll('#feed .msg-m .tekst')].pop() || {}).textContent || '', karty: document.querySelectorAll('#feed .ak').length }));
      ok(`${n} w aplikacji to samo pytanie i odpowiedź z kartami`, jest && s.odp.length > 20 && s.karty > 0, JSON.stringify({ odp: s.odp.slice(0, 50), karty: s.karty }));
      ok(`${n} adres aplikacji wyczyszczony`, s.adres === '/meshuga/', s.adres);
      await app.screenshot({ path: path.join(OUT, `wdrozenie_${w}_aplikacja.png`) }); wyn.zrzuty++;
    }
    ok(`${n} zero naruszeń CSP (strona + aplikacja)`, csp.length === 0, csp.length + ' · ' + (csp[0] || '').slice(0, 140));
    const brakMeshuga = brak.filter(f => /meshuga|fonts|kot-czat/.test(f));
    ok(`${n} pliki Meshugi, czcionki i okienka bez 404`, brakMeshuga.length === 0, brakMeshuga.join(','));
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(wyn, null, 1));
})();
