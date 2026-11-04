// Responsywność cybersora.pl (05.11, chmura): wszystkie widoki SPA × 13 rozmiarów + okienko kota w 5 stanach.
// Serwer statyczny z korzenia repo (http.createServer) z nagłówkiem CSP strony.
// Liczy: przewijanie poziome, elementy wychodzące poza ekran, tekst przykryty innym elementem,
// ucięte napisy (scrollWidth > clientWidth bez ellipsis), cele dotyku < 44 px i tekst < 14 px na telefonie,
// kot w rogu zasłaniający przyciski / stopkę / pasek konfiguratora (na górze i na dole strony).
// ETAP=przed|po → _testy_strony/zrzuty/responsywnosc_<ETAP>.json i .md (tabela naruszeń).
// WIDOKI=start,oferta  ROZMIARY=375,1280  zawężają przebieg. Uruchomienie: node _testy_strony/test_responsywnosc_strony.js
const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const fs = require('fs');
const ROOT = process.env.STRONA_ROOT || path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'zrzuty');
fs.mkdirSync(OUT, { recursive: true });
const ETAP = process.env.ETAP || 'po';
const CSP = "default-src 'self'; script-src 'self' https://web3forms.com https://hcaptcha.com https://*.hcaptcha.com; style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.web3forms.com https://hcaptcha.com https://*.hcaptcha.com https://dancycloud-ranking.dancycloud-ranking.workers.dev; frame-src https://hcaptcha.com https://*.hcaptcha.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://api.web3forms.com";
const TYPY = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.avif': 'image/avif', '.json': 'application/json', '.xml': 'application/xml', '.mp4': 'video/mp4', '.webm': 'video/webm' };
const WIDOKI = (process.env.WIDOKI || 'start,oferta,cennik,products,zrobilismy,meshuga,soraos,onas,sztuka,contact,polityka').split(',');
const ROZMIARY = (process.env.ROZMIARY || '320,360,375,390,414,600,768,820,1024,1280,1440,1920,844x390').split(',')
  .map(r => { const [w, h] = r.split('x').map(Number); return { n: r, w, h: h || (w <= 480 ? 780 : w <= 1024 ? 1000 : 900), tel: w <= 480 || (h && h <= 480) }; });
const KATEGORIE = ['poziomy', 'pozaEkranem', 'nachodzi', 'uciete', 'dotyk', 'maly', 'kot'];

const serwer = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  let f = decodeURIComponent(u.pathname); if (f.endsWith('/')) f += 'index.html';
  const plik = path.join(ROOT, f);
  if (f.includes('..') || !fs.existsSync(plik) || fs.statSync(plik).isDirectory()) { res.writeHead(404); return res.end('brak'); }
  res.writeHead(200, { 'content-type': TYPY[path.extname(plik)] || 'application/octet-stream', 'content-security-policy': CSP });
  fs.createReadStream(plik).pipe(res);
});

/* ---------- pomiar w przeglądarce (jeden ekran, bieżące przewinięcie) ---------- */
function pomiar(o) {
  const W = innerWidth, H = innerHeight, wyn = { pozaEkranem: [], nachodzi: [], uciete: [], dotyk: [], maly: [], kot: [] };
  const kotRoot = document.getElementById('kot');
  const zakres = o.zakres === 'kot' ? [kotRoot] : [...document.querySelectorAll('.view:not([hidden]), body > header, body > nav, body > footer, footer.site-footer, .nav')].filter(Boolean);
  const wZakresie = n => zakres.some(z => z && z.contains(n)) && (o.zakres === 'kot' || !(kotRoot && kotRoot.contains(n)));
  const nazwa = n => {
    let s = n.tagName.toLowerCase();
    if (n.id) return s + '#' + n.id;
    const k = [...n.classList].slice(0, 2).join('.'); if (k) s += '.' + k;
    const p = n.parentElement; if (p) { const pk = p.id ? '#' + p.id : [...p.classList].slice(0, 1).map(c => '.' + c).join(''); if (pk) s = pk + ' > ' + s; }
    return s;
  };
  const tekst = n => [...n.childNodes].filter(c => c.nodeType === 3 && c.textContent.trim()).map(c => c.textContent.trim()).join(' ').slice(0, 40);
  const cs = n => getComputedStyle(n);
  const widoczny = n => {
    const r = n.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    for (let e = n; e && e !== document.documentElement; e = e.parentElement) {
      const s = cs(e); if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity < 0.05 || e.inert) return false;
      if (e.parentElement && e.parentElement.tagName === 'DETAILS' && !e.parentElement.open && e.tagName !== 'SUMMARY') return false; // zwinięte <details>
      if (e.getAttribute && e.getAttribute('aria-hidden') === 'true' && e.classList.contains('sr-only')) return false;
    }
    return true;
  };
  const staly = n => { for (let e = n; e && e !== document.documentElement; e = e.parentElement) { const p = cs(e).position; if (p === 'fixed' || p === 'sticky') return true; } return false; };
  const ukryty = n => { const s = cs(n); return (s.clip && s.clip !== 'auto' && /rect\(0/.test(s.clip)) || s.clipPath === 'inset(50%)' || (n.getBoundingClientRect().width <= 1); };
  const wszystkie = [...document.querySelectorAll('body *')].filter(n => wZakresie(n) && !/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|BR|OPTION)$/.test(n.tagName));
  const teksty = wszystkie.filter(n => tekst(n) && widoczny(n) && !ukryty(n));
  const wEkranie = r => r.bottom > 0 && r.top < H;
  // 1) poza ekranem: liść (tekst, sterowanie, obraz) po przycięciu przez przodków z overflow≠visible wystaje za [0,W]
  const lisc = wszystkie.filter(n => (tekst(n) || /^(A|BUTTON|INPUT|SELECT|TEXTAREA|IMG|SVG|CANVAS|VIDEO|svg)$/.test(n.tagName)) && widoczny(n) && !ukryty(n));
  for (const n of lisc) {
    let r = n.getBoundingClientRect(); if (!wEkranie(r)) continue;
    let L = r.left, R = r.right;
    for (let e = n.parentElement; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
      const s = cs(e); if (s.overflowX !== 'visible' || (s.clipPath && s.clipPath !== 'none') || s.contain.includes('paint')) { const q = e.getBoundingClientRect(); L = Math.max(L, q.left); R = Math.min(R, q.right); }
    }
    if (R - L < 1) continue;               // całkiem schowany (np. karuzela, menu poza ekranem)
    if (R <= 0 || L >= W) continue;        // celowo poza ekranem
    if (n.matches('canvas.mk-mysl')) continue; // przezroczyste płótno wstęgi (22% zapasu); rysunek sprawdzony na zrzutach
    if (L < -1 || R > W + 1) wyn.pozaEkranem.push(nazwa(n) + ' [' + Math.round(L) + '…' + Math.round(R) + ']');
  }
  // 2) tekst przykryty: środek każdego wiersza tekstu → elementFromPoint; trafiony obcy, nieprzezroczysty, nie-stały element
  const przezroczysty = e => { const s = cs(e); return (s.backgroundColor === 'rgba(0, 0, 0, 0)' || s.backgroundColor === 'transparent') && s.backgroundImage === 'none' && !/^(IMG|CANVAS|VIDEO|svg|SVG|path|IFRAME)$/.test(e.tagName) && !tekst(e) && (s.borderTopWidth === '0px' || s.borderTopStyle === 'none'); };
  // widoczny wycinek: przodkowie z overflow≠visible (np. przewijany dziennik okienka) obcinają, punkt poza wycinkiem nie jest widoczny
  const wycinek = n => { let L = 0, T = 0, R = W, B = H; for (let e = n.parentElement; e && e !== document.body; e = e.parentElement) { const s = cs(e); if (s.overflowX !== 'visible' || s.overflowY !== 'visible') { const q = e.getBoundingClientRect(); L = Math.max(L, q.left); T = Math.max(T, q.top); R = Math.min(R, q.right); B = Math.min(B, q.bottom); } } return { L, T, R, B }; };
  for (const n of teksty) {
    if (staly(n) && o.zakres !== 'kot') continue;
    const wy = wycinek(n);
    for (const c of n.childNodes) {
      if (c.nodeType !== 3 || !c.textContent.trim()) continue;
      const rg = document.createRange(); rg.selectNodeContents(c);
      const rs = [...rg.getClientRects()].filter(q => q.width > 2 && q.height > 2).slice(0, 4);
      for (const q of rs) {
        for (const [fx, fy] of [[0.5, 0.5], [0.08, 0.5], [0.92, 0.5]]) {
          const x = q.left + q.width * fx, y = q.top + q.height * fy;
          if (x < wy.L || y < wy.T || x >= wy.R || y >= wy.B) continue;
          const t = document.elementFromPoint(x, y);
          if (!t || n.contains(t) || t.contains(n)) continue;
          if (o.zakres !== 'kot' && (staly(t) || (kotRoot && kotRoot.contains(t)))) continue;   // pasek i kot: osobno (kategoria „kot”)
          if (przezroczysty(t)) continue;  // np. link rozciągnięty na całą kartę
          // ten sam „guzik”: tekst w etykiecie / przycisku, trafiony jego brat dekoracyjny
          const wsp = n.closest('a,button,label');
          if (wsp && wsp.contains(t)) continue;
          wyn.nachodzi.push(nazwa(n) + ' „' + tekst(n) + '” ← ' + nazwa(t)); break;
        }
      }
    }
  }
  // 3) ucięte: scrollWidth > clientWidth bez ellipsis
  for (const n of teksty) {
    const s = cs(n); if (s.display === 'inline' || s.display === 'contents') continue;
    if (!wEkranie(n.getBoundingClientRect())) continue;
    if (s.textOverflow === 'ellipsis' || /^(INPUT|TEXTAREA|SELECT|PRE|CODE)$/.test(n.tagName) || s.overflowX === 'auto' || s.overflowX === 'scroll') continue;
    if (s.overflowX !== 'visible') {   // przycięte: overflow hidden/clip i tekst szerszy niż pudełko
      if (n.scrollWidth > n.clientWidth + 1) wyn.uciete.push(nazwa(n) + ' „' + tekst(n) + '” ' + n.scrollWidth + '>' + n.clientWidth);
      continue;
    }
    // overflow:visible: scrollWidth liczy też pseudo-elementy, więc mierzymy same wiersze tekstu względem pudełka
    const b = n.getBoundingClientRect(), pl = parseFloat(s.paddingLeft) || 0, pr = parseFloat(s.paddingRight) || 0;
    let L = Infinity, R = -Infinity;
    for (const c of n.childNodes) if (c.nodeType === 3 && c.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(c); for (const q of rg.getClientRects()) { if (q.width < 1) continue; L = Math.min(L, q.left); R = Math.max(R, q.right); } }
    if (R > b.right - Math.max(0, pr - 2) + 2 && R > b.right + 2 || L < b.left - 2) wyn.uciete.push(nazwa(n) + ' „' + tekst(n) + '” tekst ' + Math.round(R - L) + ' px w pudełku ' + Math.round(b.width) + ' px');
  }
  if (o.tel) {
    // 4) cele dotyku < 44 px (bez linków w treści akapitu: wyjątek WCAG 2.5.8 „inline”)
    const sterowanie = wszystkie.filter(n => n.matches('a[href],button,input:not([type=hidden]),select,textarea,[role=button],summary') && widoczny(n));
    for (const n of sterowanie) {
      const r = n.getBoundingClientRect(); if (!wEkranie(r)) continue;
      const s = cs(n);
      if (n.tagName === 'A' && s.display === 'inline' && [...n.parentElement.childNodes].some(c => c.nodeType === 3 && c.textContent.trim())) continue;
      if ((n.type === 'checkbox' || n.type === 'radio') && n.closest('label') && n.closest('label').getBoundingClientRect().height >= 44) continue;
      if (s.opacity === '0' || n.matches('input[type=checkbox],input[type=radio]') && cs(n).appearance === 'none' && r.width < 2) continue;
      if (r.width >= 43.5 && r.height >= 43.5) continue;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2, trafia = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return true; const t = document.elementFromPoint(x, y); if (t && !staly(n) && (staly(t) || (kotRoot && kotRoot.contains(t)))) return true; /* pod paskiem albo kotem: nie wiadomo, pomiar w innym przewinięciu */ return !!t && (n === t || n.contains(t) || (t.closest && t.closest('label') === n.closest('label') && n.closest('label'))); };
      const ok = (r.height >= 43.5 || (trafia(cx, cy - 21.5) && trafia(cx, cy + 21.5))) && (r.width >= 43.5 || (trafia(cx - 21.5, cy) && trafia(cx + 21.5, cy)));
      if (!ok) wyn.dotyk.push(nazwa(n) + ' „' + (n.textContent || n.getAttribute('aria-label') || '').trim().slice(0, 24) + '” ' + Math.round(r.width) + '×' + Math.round(r.height));
    }
    // 5) tekst < 14 px
    for (const n of teksty) {
      if (!wEkranie(n.getBoundingClientRect())) continue;
      const f = parseFloat(cs(n).fontSize); if (f < 13.95) wyn.maly.push(nazwa(n) + ' „' + tekst(n).slice(0, 24) + '” ' + f + 'px');
    }
  }
  // 6) kot w rogu: jego obrys (z kółkiem) przecina przycisk, link, pole, tekst stopki albo pasek konfiguratora
  if (o.kot && kotRoot) {
    const b = kotRoot.querySelector('.kot__btn');
    if (b && widoczny(b)) {
      const r = b.getBoundingClientRect(), K = { l: r.left - 10, t: r.top - 10, r: r.right + 10, b: r.bottom + 10 };
      const cele = wszystkie.filter(n => (n.matches('a[href],button,input,select,textarea,[role=button]') || (tekst(n) && n.closest('footer,.konf-nav'))) && widoczny(n) && !kotRoot.contains(n));
      for (const n of cele) {
        const q = n.getBoundingClientRect();
        const x = Math.min(K.r, q.right) - Math.max(K.l, q.left), y = Math.min(K.b, q.bottom) - Math.max(K.t, q.top);
        if (x > 2 && y > 2) wyn.kot.push(o.kot + ': ' + nazwa(n) + ' „' + (tekst(n) || n.getAttribute('aria-label') || n.textContent || '').trim().slice(0, 24) + '” ' + Math.round(x) + '×' + Math.round(y));
      }
    }
  }
  return wyn;
}

(async () => {
  await new Promise(r => serwer.listen(0, r));
  const PORT = serwer.address().port, BASE = 'http://127.0.0.1:' + PORT + '/';
  const browser = await chromium.launch();
  const tabela = {}, szczegoly = {}, bledy = []; let kroki = 0, csp = 0;
  const dodaj = (wiersz, kol, wyn) => {
    tabela[wiersz] = tabela[wiersz] || {}; szczegoly[wiersz] = szczegoly[wiersz] || {};
    for (const k of KATEGORIE) {
      const s = new Set([...(szczegoly[wiersz][kol] && szczegoly[wiersz][kol][k] || []), ...(wyn[k] || [])]);
      szczegoly[wiersz][kol] = szczegoly[wiersz][kol] || {}; szczegoly[wiersz][kol][k] = [...s];
    }
    tabela[wiersz][kol] = KATEGORIE.reduce((a, k) => a + szczegoly[wiersz][kol][k].length, 0);
  };
  for (const R of ROZMIARY) {
    const ctx = await browser.newContext({ viewport: { width: R.w, height: R.h }, reducedMotion: 'reduce', hasTouch: R.tel, isMobile: R.tel });
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1).*/, r => r.abort());
    const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') { if (/Content Security Policy/i.test(m.text())) csp++; else if (!/Failed to load resource/.test(m.text())) bledy.push(R.n + ': ' + m.text().slice(0, 140)); } });
    p.on('pageerror', e => bledy.push(R.n + ' pageerror: ' + e.message.slice(0, 140)));
    await p.goto(BASE); await p.waitForTimeout(1200); kroki++;
    for (const V of WIDOKI) {
      await p.evaluate(v => { location.hash = '#' + v; }, V); await p.waitForTimeout(V === 'soraos' ? 2600 : 900); kroki++;
      const wyn = { poziomy: [] };
      const sw = await p.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth);
      if (sw > 1) wyn.poziomy.push('scrollWidth o ' + sw + ' px za szeroki');
      const kotwica = V === 'cennik' || V === 'zrobilismy';
      const wys = await p.evaluate(() => document.documentElement.scrollHeight);
      const start = await p.evaluate(() => scrollY);
      const kroki_ = kotwica ? [start] : [];
      if (!kotwica) for (let y = 0; y < wys; y += Math.round(R.h * 0.85)) kroki_.push(y);
      for (let i = 0; i < kroki_.length; i++) {
        await p.evaluate(y => window.scrollTo(0, y), kroki_[i]); await p.waitForTimeout(120);
        const kot = kroki_[i] === 0 && !kotwica ? 'góra' : '';
        Object.entries(await p.evaluate(pomiar, { tel: R.tel, kot })).forEach(([k, v]) => { wyn[k] = (wyn[k] || []).concat(v); });
      }
      if (!kotwica) {  // dół strony: tu kot nie może niczego zasłaniać na stałe
        await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(150);
        Object.entries(await p.evaluate(pomiar, { tel: R.tel, kot: 'dół' })).forEach(([k, v]) => { wyn[k] = (wyn[k] || []).concat(v); });
      }
      dodaj('#' + V, R.n, wyn);
    }
    // okienko kota na starcie: zamknięte, podpowiedź, otwarte, myśli, po odpowiedzi
    await p.evaluate(() => { location.hash = '#start'; }); await p.waitForTimeout(700);
    await p.evaluate(() => window.scrollTo(0, 0));
    const stanKota = async nazwa => {
      const w = await p.evaluate(pomiar, { tel: R.tel, zakres: 'kot' });
      const extra = await p.evaluate(() => {
        const out = [], W = innerWidth, H = innerHeight;
        for (const s of ['.kot__panel', '.kot__tip', '.kot__btn']) {
          const n = document.querySelector(s); if (!n) continue; const c = getComputedStyle(n);
          if (c.visibility === 'hidden' || c.opacity === '0' || c.display === 'none') continue;
          const r = n.getBoundingClientRect(); if (r.left < -1 || r.right > W + 1 || r.top < -1 || r.bottom > H + 1) out.push(s + ' poza ekranem [' + [r.left, r.top, r.right, r.bottom].map(Math.round).join(',') + ']');
        }
        return out;
      });
      w.pozaEkranem = (w.pozaEkranem || []).concat(extra);
      const sw = await p.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth);
      w.poziomy = sw > 1 ? ['scrollWidth o ' + sw + ' px'] : [];
      dodaj('kot: ' + nazwa, R.n, w); kroki++;
    };
    await stanKota('zamknięte');
    await p.evaluate(() => { try { Object.keys(localStorage).filter(k => /^kot-tip/.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) {} });
    await p.mouse.wheel(0, 30); await p.waitForTimeout(4400);
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(150);
    if (await p.evaluate(() => document.getElementById('kot').classList.contains('kot--tip'))) await stanKota('podpowiedź');
    await p.evaluate(() => window.kotCzat && window.kotCzat.otworz()); await p.waitForTimeout(500);
    await stanKota('otwarte');
    await p.fill('#kotPanel .kot__in[aria-label="Pytanie do Meshugi"]', 'Ile to kosztuje?');
    await p.press('#kotPanel .kot__in[aria-label="Pytanie do Meshugi"]', 'Enter'); await p.waitForTimeout(300);
    await stanKota('myśli');
    await p.waitForTimeout(1600);
    await stanKota('po odpowiedzi');
    await ctx.close();
  }
  await browser.close(); serwer.close();
  // tabela
  const kol = ROZMIARY.map(r => r.n);
  let md = `### Naruszenia responsywności (${ETAP})\n\n| widok | ${kol.join(' | ')} | razem |\n|---|${kol.map(() => '---:').join('|')}|---:|\n`;
  let razem = 0; const wgKat = Object.fromEntries(KATEGORIE.map(k => [k, 0]));
  for (const [w, wiersz] of Object.entries(tabela)) {
    const s = kol.reduce((a, k) => a + (wiersz[k] || 0), 0); razem += s;
    md += `| ${w} | ${kol.map(k => wiersz[k] == null ? '–' : wiersz[k]).join(' | ')} | ${s} |\n`;
    for (const k of kol) for (const c of KATEGORIE) wgKat[c] += ((szczegoly[w][k] || {})[c] || []).length;
  }
  md += `\n**Razem: ${razem}** · wg kategorii: ${KATEGORIE.map(k => k + ' ' + wgKat[k]).join(', ')} · kroki ${kroki} · błędy konsoli ${bledy.length} · CSP ${csp}\n`;
  fs.writeFileSync(path.join(OUT, `responsywnosc_${ETAP}.md`), md);
  fs.writeFileSync(path.join(OUT, `responsywnosc_${ETAP}.json`), JSON.stringify({ razem, wgKat, kroki, bledy, csp, tabela, szczegoly }, null, 1));
  console.log(md);
})();
