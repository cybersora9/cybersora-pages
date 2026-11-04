// Meshuga pod cybersora.pl/meshuga: build strony (strona\meshuga\) z prawdziwymi nagłówkami żywej strony
// (CSP bez skryptów inline i bez czcionek data:, Permissions-Policy bez mikrofonu) + pytanie z okienka w ?q=.
// Pliki podaje page.route z dysku (bez serwera). Host cybersora.test = udawany serwer kont (nie dotykamy Workera).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = process.env.MESHUGA_ZRZUTY || path.join(__dirname, 'wyniki');
require('fs').mkdirSync(OUT, { recursive: true });
const STRONA = process.env.MESHUGA_STRONA || path.join(__dirname, '..', 'strona');
const FONTY = process.env.MESHUGA_FONTY || path.resolve(__dirname, '..', '..', 'fonts');
const ART = require('url').pathToFileURL(path.resolve(process.env.MESHUGA_PLIK || path.join(__dirname, '..', 'meshuga-app.html'))).href;
const CSP = "default-src 'self'; script-src 'self' https://web3forms.com https://hcaptcha.com https://*.hcaptcha.com; style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.web3forms.com https://hcaptcha.com https://*.hcaptcha.com https://dancycloud-ranking.dancycloud-ranking.workers.dev; frame-src https://hcaptcha.com https://*.hcaptcha.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://api.web3forms.com";
const TYPY = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2', '.css': 'text/css' };
const PYT = 'Ile kosztuje bot na Discorda?';
(async () => {
  const browser = await chromium.launch({ headless: process.env.PW_HEADLESS !== 'false' });
  const wyn = { kroki: 0, zrzuty: 0, bledy: [], sprawdzenia: [] };
  const ok = (n, w, i) => wyn.sprawdzenia.push((w ? 'OK  ' : 'BŁĄD ') + n + (i ? ' · ' + i : ''));
  const czekajOdp = p => p.waitForFunction(() => (() => { const t = document.querySelectorAll('#feed .msg-m .tekst'); return t.length > 0 && t[t.length - 1].textContent.trim().length > 20; })(), null, { timeout: 8000 }).then(() => true, () => false);

  // A. artefakt (plik): pytanie z ?q= wysyła się samo, adres traci ?q=
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => wyn.bledy.push('art pageerror: ' + e.message));
    // podgląd tekstu co klatkę: kawałek znacznika [[KARTA:…]] nie może mignąć w trakcie pisania
    await p.addInitScript(() => { window.__resztki = []; setInterval(() => { document.querySelectorAll('#feed .msg-m .tekst').forEach(e => { const t = e.textContent; if (/\[/.test(t)) window.__resztki.push(t.slice(-40)); }); }, 10); });
    await p.goto(ART + '?q=' + encodeURIComponent(PYT)); wyn.kroki++;
    const jest = await p.waitForFunction(t => [...document.querySelectorAll('#feed .msg-u')].some(e => e.textContent === t), PYT, { timeout: 4000 }).then(() => true, () => false);
    ok('artefakt: pytanie z ?q= wysłane samo', jest);
    ok('artefakt: odpowiedź przyszła', jest && await czekajOdp(p));
    await p.waitForFunction(() => !document.querySelector('#feed .log li:not(.ok)'), null, { timeout: 10000 }).catch(() => {}); const resztki = await p.evaluate(() => window.__resztki);
    ok('artefakt: w trakcie pisania nie miga kawałek znacznika „[”', resztki.length === 0, resztki.length + ' klatek · ' + (resztki[0] || ''));
    ok('artefakt: ?q= zdjęte z adresu', !/[?&]q=/.test(await p.evaluate(() => location.search)), await p.evaluate(() => location.search));
    await p.reload(); await p.waitForTimeout(500); wyn.kroki++;
    ok('artefakt: odświeżenie nie wysyła drugi raz', (await p.evaluate(t => [...document.querySelectorAll('#feed .msg-u')].filter(e => e.textContent === t).length, PYT)) <= 1);
    await ctx.close();
  }

  // B. build strony pod nagłówkami żywej strony
  const plikiOk = fs.existsSync(path.join(STRONA, 'meshuga', 'index.html')) && fs.existsSync(path.join(STRONA, 'meshuga', 'meshuga.js'));
  ok('build strony: meshuga/index.html + meshuga/meshuga.js', plikiOk, STRONA);
  if (plikiOk) for (const w of [1280, 768, 375]) {
    const n = 'strona_' + w;
    const ctx = await browser.newContext({ viewport: { width: w, height: w === 375 ? 780 : 820 } });
    const csp = [];
    await ctx.route('http://cybersora.test/**', async r => {
      const u = new URL(r.request().url());
      let f = u.pathname.endsWith('/') ? u.pathname + 'index.html' : u.pathname;
      const plik = f.startsWith('/fonts/') ? path.join(FONTY, path.basename(f)) : path.join(STRONA, f);
      if (!fs.existsSync(plik)) return r.fulfill({ status: 404, body: 'brak' });
      await r.fulfill({ status: 200, body: fs.readFileSync(plik), headers: { 'content-type': TYPY[path.extname(plik)] || 'application/octet-stream', 'content-security-policy': CSP, 'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()', 'x-frame-options': 'DENY' } });
    });
    await ctx.addInitScript(() => { window.__resztki = []; setInterval(() => { document.querySelectorAll('#feed .msg-m .tekst').forEach(e => { const t = e.textContent; if (/\[/.test(t)) window.__resztki.push(t.slice(-40)); }); }, 10); });
    const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') { wyn.bledy.push(n + ': ' + m.text()); if (/Content Security Policy/i.test(m.text())) csp.push(m.text()); } });
    p.on('pageerror', e => wyn.bledy.push(n + ' pageerror: ' + e.message));
    await p.goto('http://cybersora.test/meshuga/?q=' + encodeURIComponent(PYT)); await p.waitForTimeout(800); wyn.kroki++;
    ok(`${n} zero naruszeń CSP`, csp.length === 0, csp.length + ' · ' + (csp[0] || '').slice(0, 120));
    const f = await p.evaluate(async () => { await document.fonts.ready; return { sora: document.fonts.check('600 16px Sora'), mono: document.fonts.check('500 13px "Geist Mono"'), zal: [...document.fonts].filter(x => x.status === 'loaded').map(x => x.family.replace(/"/g, '')) }; });
    ok(`${n} czcionki Sora i Geist Mono z /fonts/`, f.zal.includes('Sora') && f.zal.includes('Geist Mono'), f.zal.join(','));
    const s = await p.evaluate(() => ({ kot: !!document.querySelector('#kotHero svg, #kotPasek svg'), title: document.title, lang: document.documentElement.lang, wrocH: document.querySelector('a.poz[href]') && document.querySelector('a.poz[href]').getAttribute('href'), wrocT: document.querySelector('a.poz[href]') && document.querySelector('a.poz[href]').getAttribute('target'), poziomy: document.documentElement.scrollWidth > innerWidth, inline: [...document.scripts].filter(x => !x.src).length }));
    ok(`${n} kot zamontowany`, s.kot);
    ok(`${n} tytuł, lang=pl, zero skryptów inline`, /Meshuga/.test(s.title) && s.lang === 'pl' && s.inline === 0, JSON.stringify({ t: s.title, l: s.lang, i: s.inline }));
    ok(`${n} „Wróć na cybersora.pl” w tej samej karcie`, s.wrocH === '/' && !s.wrocT, s.wrocH + ' ' + s.wrocT);
    ok(`${n} bez poziomego przewijania`, !s.poziomy);
    const jest = await p.waitForFunction(t => [...document.querySelectorAll('#feed .msg-u')].some(e => e.textContent === t), PYT, { timeout: 4000 }).then(() => true, () => false);
    ok(`${n} pytanie z okienka (?q=) wysłane samo i jest odpowiedź`, jest && await czekajOdp(p));
    await p.waitForFunction(() => !document.querySelector('#feed .log li:not(.ok)'), null, { timeout: 10000 }).catch(() => {}); const resztki = await p.evaluate(() => window.__resztki);
    ok(`${n} w trakcie pisania nie miga kawałek znacznika „[”`, resztki.length === 0, resztki.length + ' klatek · ' + (resztki[0] || ''));
    ok(`${n} adres bez ?q=`, (await p.evaluate(() => location.pathname + location.search)) === '/meshuga/', await p.evaluate(() => location.pathname + location.search));
    await p.waitForTimeout(300);
    ok(`${n} mikrofon schowany (microphone=() na stronie)`, await p.evaluate(() => document.querySelector('#mikro').hidden));
    await p.screenshot({ path: path.join(OUT, `strona_${w}_rozmowa.png`) }); wyn.zrzuty++;
    if (w <= 860) { await p.click('#menuTel'); await p.waitForTimeout(400); }
    await p.click('#nowy'); await p.waitForTimeout(500); wyn.kroki++;
    ok(`${n} „Nowy czat” wraca do startu`, await p.evaluate(() => document.querySelectorAll('#feed .msg-u').length === 0));
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, `strona_${w}_start.png`) }); wyn.zrzuty++;
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(wyn, null, 1));
})();
