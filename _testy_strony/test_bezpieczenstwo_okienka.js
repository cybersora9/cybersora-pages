// Bezpieczeństwo okienka kota i strony po stronie klienta (05.11, chmura).
// Kopia strony z korzenia repo pod nagłówkiem CSP cybersora.pl (stała CSP z _meshuga/zrzuty-testy/test_wdrozenie.js).
// 1) statycznie: zero inline <script> poza JSON-LD, zero on*= w HTML, zero eval/new Function w skryptach strony,
//    linki target=_blank z rel="noopener noreferrer";
// 2) w przeglądarce: uszkodzony/podrobiony profil w localStorage, wrogie odpowiedzi KOT_API,
//    wgrywany awatar (SVG, nie-obrazek, prawdziwy PNG), ?q= i ?nick= w „Czatuj”, MESHUGA_APP=javascript:.
// Uruchomienie: node _testy_strony/test_bezpieczenstwo_okienka.js  (STRONA_ROOT= inny katalog strony)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = process.env.STRONA_ROOT || path.resolve(__dirname, '..');
const CSP = "default-src 'self'; script-src 'self' https://web3forms.com https://hcaptcha.com https://*.hcaptcha.com; style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.web3forms.com https://hcaptcha.com https://*.hcaptcha.com https://dancycloud-ranking.dancycloud-ranking.workers.dev; frame-src https://hcaptcha.com https://*.hcaptcha.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://api.web3forms.com";
const TYPY = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.avif': 'image/avif', '.json': 'application/json', '.xml': 'application/xml' };

const wyn = { kroki: 0, zrzuty: 0, bledy: [], csp: 0, obce: [], uwagi: [], sprawdzenia: [] };
const ZNANE_INLINE = ['pycodemath-sceny/sceny-podglad.html'];
const ok = (n, w, i) => wyn.sprawdzenia.push((w ? 'OK  ' : 'BŁĄD ') + n + (i ? ' · ' + i : ''));

/* ---------- 1. statycznie ---------- */
function pliki(dir, ext, out = []) {
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith('.') || f.startsWith('_') || f === 'node_modules') continue; // jak buduj.mjs: to nie trafia na stronę
    const p = path.join(dir, f), st = fs.statSync(p);
    if (st.isDirectory()) pliki(p, ext, out); else if (ext.test(f)) out.push(p);
  }
  return out;
}
const html = pliki(ROOT, /\.html$/), js = pliki(ROOT, /\.js$/).filter(f => !/[\\/]vendor[\\/]/.test(f));
for (const f of html) {
  const s = fs.readFileSync(f, 'utf8'), rel = path.relative(ROOT, f);
  const inline = [...s.matchAll(/<script\b(?![^>]*\bsrc=)([^>]*)>/gi)].filter(m => !/ld\+json/.test(m[1]));
  const on = [...s.matchAll(/<[a-z][^>]*?\s(on[a-z]+)\s*=/gi)].map(m => m[1]);
  const blank = [...s.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)].map(m => m[0]).filter(a => !/rel="[^"]*noopener[^"]*noreferrer|rel="[^"]*noreferrer[^"]*noopener/.test(a));
  // ZNANE: podgląd artefaktu bez linku ze strony; pod CSP jego skrypt i tak nie ruszy. Do decyzji maisy (usunąć albo przenieść do _), nie liczony jako błąd.
  if (ZNANE_INLINE.includes(rel.split(path.sep).join('/'))) wyn.uwagi.push(`${rel}: ${inline.length} inline <script> (podgląd bez linku, do decyzji)`);
  else ok(`${rel}: zero inline <script> poza JSON-LD`, inline.length === 0, inline.length + '');
  ok(`${rel}: zero atrybutów on*=`, on.length === 0, [...new Set(on)].join(','));
  ok(`${rel}: target=_blank z rel="noopener noreferrer"`, blank.length === 0, blank.map(a => a.slice(0, 90)).join(' | '));
}
const evale = js.filter(f => /\beval\s*\(|new\s+Function\s*\(|setTimeout\s*\(\s*['"`]|setInterval\s*\(\s*['"`]/.test(fs.readFileSync(f, 'utf8'))).map(f => path.relative(ROOT, f));
ok(`skrypty strony (${js.length}): zero eval/new Function/setTimeout(tekst)`, evale.length === 0, evale.join(','));

/* ---------- 2. w przeglądarce ---------- */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4nGP4z8DwHwyBDAYGBgYGBgYAg4QH/YtfWdUAAAAASUVORK5CYII=', 'base64');
async function strona(browser, opcje = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 }, reducedMotion: 'reduce' });
  await ctx.route(/^https?:\/\/(?!cybersora\.test).*/, r => { wyn.obce.push(r.request().url().slice(0, 80)); return r.abort(); });
  await ctx.route('http://cybersora.test/**', async r => {
    const u = new URL(r.request().url());
    if (u.pathname === '/api-test') return r.fulfill({ status: 200, body: opcje.api || '{}', headers: { 'content-type': 'application/json' } });
    const f = decodeURIComponent(u.pathname.endsWith('/') ? u.pathname + 'index.html' : u.pathname);
    const plik = path.join(ROOT, f);
    if (f.includes('..') || !fs.existsSync(plik) || fs.statSync(plik).isDirectory()) return r.fulfill({ status: 404, body: 'brak' });
    await r.fulfill({ status: 200, body: fs.readFileSync(plik), headers: { 'content-type': TYPY[path.extname(plik)] || 'application/octet-stream', 'content-security-policy': CSP } });
  });
  await ctx.addInitScript(o => {
    window.__alert = 0; window.alert = () => { window.__alert++; };
    if (o.profil !== undefined) try { localStorage.setItem('meshuga-profil', o.profil); } catch (e) {}
    if (o.api) window.KOT_API = '/api-test';
    if (o.app !== undefined) window.MESHUGA_APP = o.app;
  }, { profil: opcje.profil, api: !!opcje.api, app: opcje.app });
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() !== 'error') return; const t = m.text(); if (/Content Security Policy/i.test(t)) wyn.csp++; else if (!/Failed to load resource/.test(t)) wyn.bledy.push(t.slice(0, 160)); });
  p.on('pageerror', e => wyn.bledy.push('pageerror: ' + e.message));
  await p.goto('http://cybersora.test/'); await p.waitForTimeout(900); wyn.kroki++;
  return { ctx, p };
}
const zapytaj = async (p, q) => {
  if (!(await p.evaluate(() => document.getElementById('kot').classList.contains('kot--open')))) { await p.click('.kot__btn'); await p.waitForTimeout(300); }
  await p.fill('#kotPanel .kot__in[aria-label="Pytanie do Meshugi"]', q);
  await p.press('#kotPanel .kot__in[aria-label="Pytanie do Meshugi"]', 'Enter'); await p.waitForTimeout(1500); wyn.kroki++;
};
const stanOkienka = p => p.evaluate(() => {
  const prof = document.querySelector('.kot__prof'), ost = [...document.querySelectorAll('.kot__m--kot')].pop();
  return {
    profilAria: prof.getAttribute('aria-label'), profBg: prof.style.backgroundImage,
    obceWLogu: document.querySelectorAll('.kot__log img, .kot__log script, .kot__log iframe, .kot [onerror], .kot [onclick]').length,
    ost: ost ? ost.textContent : '', linki: ost ? [...ost.querySelectorAll('a')].map(a => a.getAttribute('href')) : [],
    czatuj: { href: document.querySelector('.kot__czatuj').getAttribute('href'), rel: document.querySelector('.kot__czatuj').rel, txt: document.querySelector('.kot__czatuj').textContent },
    alert: window.__alert
  };
});

(async () => {
  const browser = await chromium.launch();
  // a) uszkodzony JSON
  {
    const { ctx, p } = await strona(browser, { profil: '{"nick":"ala",' });
    await zapytaj(p, 'Cześć');
    const s = await stanOkienka(p);
    ok('uszkodzony JSON profilu: strona działa, profil pominięty', s.profilAria === 'Załóż profil testowy' && s.ost.length > 5, s.profilAria);
    await ctx.close();
  }
  // b) podrobiony profil: nick z HTML
  {
    const { ctx, p } = await strona(browser, { profil: JSON.stringify({ nick: '<img src=x onerror=alert(1)>', ava: '' }) });
    await zapytaj(p, 'Cześć');
    const s = await stanOkienka(p);
    ok('nick z HTML w localStorage: odrzucony, nic nie trafia do DOM jako znacznik', s.profilAria === 'Załóż profil testowy' && s.obceWLogu === 0 && s.alert === 0, s.profilAria + ' · obce ' + s.obceWLogu);
    await ctx.close();
  }
  // c) podrobiony awatar: zewnętrzny adres i wstrzyknięcie w url("…")
  for (const [n, ava] of [['adres zewnętrzny', 'https://evil.example/piksel.gif'], ['wstrzyknięcie w url()', 'data:image/png;base64,AAAA"), url("https://evil.example/x'], ['data:text/html', 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==']]) {
    const { ctx, p } = await strona(browser, { profil: JSON.stringify({ nick: 'nocny_kod', ava }) });
    const s = await stanOkienka(p);
    ok(`awatar w localStorage (${n}): odrzucony, nick zostaje`, s.profilAria === 'Twój profil: nocny_kod' && !s.profBg, s.profBg.slice(0, 70));
    await ctx.close();
  }
  // d) za długi nick, zły typ
  {
    const { ctx, p } = await strona(browser, { profil: JSON.stringify({ nick: 'x'.repeat(500), ava: 5 }) });
    const s = await stanOkienka(p);
    ok('nick 500 znaków / awatar liczbą: profil odrzucony', s.profilAria === 'Załóż profil testowy', s.profilAria.slice(0, 50));
    await ctx.close();
  }
  // e) wrogie odpowiedzi KOT_API
  {
    const { ctx, p } = await strona(browser, { api: JSON.stringify({ odpowiedz: '<img src=x onerror=alert(1)>Hej', link: ['javascript:alert(1)//', 'Kliknij'] }) });
    await zapytaj(p, 'test');
    const s = await stanOkienka(p);
    ok('KOT_API z HTML i linkiem javascript: tekst jako tekst, bez linku', s.obceWLogu === 0 && s.ost.indexOf('<img') === 0 && s.linki.length === 0 && s.alert === 0, JSON.stringify({ ost: s.ost.slice(0, 30), linki: s.linki }));
    await ctx.close();
  }
  {
    const { ctx, p } = await strona(browser, { api: JSON.stringify({ odpowiedz: 'Cennik jest w Ofercie.', link: ['oferta', 'Otwórz Ofertę'] }) });
    await zapytaj(p, 'test');
    const s = await stanOkienka(p);
    ok('KOT_API poprawna odpowiedź: tekst i link do znanego widoku', s.ost.indexOf('Cennik jest w Ofercie.') === 0 && s.linki[0] === '#oferta', JSON.stringify(s.linki));
    await ctx.close();
  }
  for (const [n, body] of [['link jako tekst', JSON.stringify({ odpowiedz: 'A', link: 'abc' })], ['odpowiedź liczbą', JSON.stringify({ odpowiedz: 42 })], ['nie-JSON', '<html>502</html>']]) {
    const { ctx, p } = await strona(browser, { api: body });
    await zapytaj(p, 'Ile to kosztuje?');
    const s = await stanOkienka(p);
    ok(`KOT_API ${n}: bez wysypki, bez „undefined”`, s.ost.length > 0 && !/undefined/.test(s.ost) && !s.linki.some(l => !/^#[a-z]+$/.test(l)), s.ost.slice(0, 40) + ' · ' + JSON.stringify(s.linki));
    await ctx.close();
  }
  // f) „Czatuj”: ?q= i ?nick= zakodowane, rel
  {
    const { ctx, p } = await strona(browser, { profil: JSON.stringify({ nick: 'ala.kot', ava: '' }) });
    await p.click('.kot__btn'); await p.waitForTimeout(300);
    await p.fill('#kotPanel .kot__in[aria-label="Pytanie do Meshugi"]', 'a&nick=evil#x "<b>');
    const s = await stanOkienka(p);
    const u = new URL(s.czatuj.href, 'http://cybersora.test/');
    ok('„Czatuj”: q i nick zakodowane, jeden nick, ścieżka /meshuga/', u.pathname === '/meshuga/' && u.searchParams.get('q') === 'a&nick=evil#x "<b>' && u.searchParams.getAll('nick').join() === 'ala.kot' && !u.hash, s.czatuj.href);
    ok('„Czatuj”: rel="noopener noreferrer"', /noopener/.test(s.czatuj.rel) && /noreferrer/.test(s.czatuj.rel), s.czatuj.rel);
    await ctx.close();
  }
  {
    const { ctx, p } = await strona(browser, { app: 'javascript:alert(1)//' });
    const s = await stanOkienka(p);
    ok('MESHUGA_APP=javascript: odrzucony („Czatuj · wkrótce”, bez href)', !s.czatuj.href && /wkrótce/.test(s.czatuj.txt), JSON.stringify(s.czatuj));
    await ctx.close();
  }
  // g) wgrywany awatar
  {
    const { ctx, p } = await strona(browser);
    await p.click('.kot__btn'); await p.waitForTimeout(300);
    await p.click('.kot__prof'); await p.waitForTimeout(200);
    const wgraj = async (name, mimeType, buffer) => {
      await p.setInputFiles('.kot__profil input[type=file]', { name, mimeType, buffer }); await p.waitForTimeout(400); wyn.kroki++;
      return p.evaluate(() => ({ blad: document.querySelector('.kot__blad').textContent, bg: document.querySelector('.kot__pAva').style.backgroundImage }));
    };
    let r = await wgraj('kot.svg', 'image/svg+xml', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="9" height="9"/></svg>'));
    ok('awatar SVG odrzucony', /nie jest obrazek/.test(r.blad) && !r.bg, r.blad);
    r = await wgraj('udaje.png', 'image/png', Buffer.from('to nie jest png'));
    ok('plik udający PNG: komunikat, bez awatara', /Nie udało się/.test(r.blad) && !r.bg, r.blad);
    r = await wgraj('tekst.txt', 'text/plain', Buffer.from('abc'));
    ok('plik tekstowy odrzucony', /nie jest obrazek/.test(r.blad), r.blad);
    r = await wgraj('kot.png', 'image/png', PNG);
    ok('prawdziwy PNG: awatar 128 px jako data:image/webp|jpeg', !r.blad && /^url\("data:image\/(webp|jpeg);base64,/.test(r.bg), r.bg.slice(0, 40));
    await p.fill('#kotNick', 'nocny_kod'); await p.click('.kot__pAkcje .kot__b--main'); await p.waitForTimeout(200);
    const zap = await p.evaluate(() => JSON.parse(localStorage.getItem('meshuga-profil')));
    ok('profil zapisany z poprawnym awatarem', zap.nick === 'nocny_kod' && /^data:image\/(webp|jpeg);base64,/.test(zap.ava));
    await ctx.close();
  }
  ok('zero błędów konsoli', wyn.bledy.length === 0, wyn.bledy.slice(0, 3).join(' | '));
  ok('zero naruszeń CSP', wyn.csp === 0, String(wyn.csp));
  ok('zero żądań do obcych adresów (evil.example)', !wyn.obce.some(u => /evil/.test(u)), wyn.obce.filter(u => /evil/.test(u)).join(','));
  await browser.close();
  console.log(JSON.stringify(wyn, null, 1));
  console.log('\nRAZEM: ' + wyn.sprawdzenia.length + ' sprawdzeń, błędy: ' + wyn.sprawdzenia.filter(s => s.startsWith('BŁĄD')).length);
})();
