// Responsywność aplikacji Meshuga (wersja na stronę, cybersora.test/meshuga/ z CSP żywej strony):
// 12 szerokości + telefon poziomo (844×390) + niskie okno laptopa (1280×650); stany: pusty ekran, klawiatura, Ustawienia,
// Napisz do nas, okno logowania, panel konta, szuflada (telefon) / zwinięty pasek (komputer), myśli (wstęga), rozmowa z długą
// odpowiedzią i blokiem kodu, kalkulator, brief, Co umiem. Naruszenia: poziome przewijanie, coś przykrywa tekst albo pole wpisu,
// ucięty / niedostępny napis, cel dotyku < 44 px (ekrany dotykowe), pole pod klawiaturą (visualViewport), treść pod notchem
// (env(safe-area-inset-*), emulacja przez CDP Emulation.setSafeAreaInsetsOverride).
// Wynik: liczba naruszeń per rozmiar. MESHUGA_STRONA = inny build strony (np. stara wersja).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const STRONA = process.env.MESHUGA_STRONA || path.join(__dirname, '..', 'strona');
const FONTY = process.env.MESHUGA_FONTY || path.resolve(__dirname, '..', '..', 'fonts');
const OUT = path.join(process.env.MESHUGA_ZRZUTY || path.join(__dirname, 'wyniki'), 'responsywnosc');
fs.mkdirSync(OUT, { recursive: true });
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://dancycloud-ranking.dancycloud-ranking.workers.dev; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
const TYPY = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2', '.css': 'text/css' };
/* [szerokość, wysokość, dotyk, notch {top,left,right,bottom}] */
const ROZMIARY = [
  [320, 568, true, null], [360, 740, true, null], [375, 812, true, { top: 47, left: 0, right: 0, bottom: 34 }], [390, 844, true, { top: 47, left: 0, right: 0, bottom: 34 }],
  [414, 896, true, { top: 47, left: 0, right: 0, bottom: 34 }], [600, 960, true, null], [768, 1024, true, { top: 24, left: 0, right: 0, bottom: 20 }], [820, 1180, true, { top: 24, left: 0, right: 0, bottom: 20 }],
  [1024, 768, true, { top: 24, left: 0, right: 0, bottom: 20 }], [1280, 800, false, null], [1440, 900, false, null], [1920, 1080, false, null],
  [844, 390, true, { top: 0, left: 47, right: 47, bottom: 21 }], [1280, 650, false, null]
];
const TYLKO = process.env.ROZMIARY ? process.env.ROZMIARY.split(',') : null;

/* ---------- sprawdzanie w stronie ---------- */
const SPRAWDZ = ({ dotyk, nakladka, sa, wolnePole }) => {
  const W = innerWidth, H = innerHeight, nar = [];
  const opis = e => !e ? '?' : (e.id ? '#' + e.id : e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '')) + (e.textContent && e.textContent.trim() ? ' „' + e.textContent.trim().replace(/\s+/g, ' ').slice(0, 22) + '”' : '');
  const dodaj = (typ, e, info) => { const t = typ + ': ' + opis(e) + (info ? ' · ' + info : ''); if (!nar.includes(t)) nar.push(t); };
  const st = e => getComputedStyle(e);
  const krycie = e => { let o = 1; for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const s = st(x); if (s.display === 'none') return 0; o *= +s.opacity; } return o; };
  const widac = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && st(e).visibility !== 'hidden' && krycie(e) > 0.05; };
  const zakres = nakladka ? [...document.querySelectorAll(nakladka)].filter(widac) : [document.body];
  const wZakresie = e => zakres.some(z => z.contains(e));
  /* przycinające przodki: [prostokąt, przewija się?] */
  const klipy = e => { const k = []; for (let x = e; x && x !== document.documentElement; x = x.parentElement) { const s = st(x); if (s.overflowX !== 'visible' || s.overflowY !== 'visible') k.push({ r: x.getBoundingClientRect(), x: /auto|scroll/.test(s.overflowX), y: /auto|scroll/.test(s.overflowY), el: x }); } return k; };
  const wymus = document.createElement('style'); wymus.textContent = '*{pointer-events:auto!important}'; document.head.appendChild(wymus);
  const kto = (x, y) => document.elementFromPoint(x, y);
  try {
    // 1. poziome przewijanie (strona i kontenery przewijane w pionie)
    if (document.documentElement.scrollWidth > W + 1) dodaj('poziome przewijanie', document.documentElement, document.documentElement.scrollWidth + ' > ' + W);
    document.querySelectorAll('.przewijak, .okno, .panel, .historia').forEach(s => { if (widac(s) && s.scrollWidth > s.clientWidth + 1) dodaj('poziome przewijanie', s, s.scrollWidth + ' > ' + s.clientWidth); });
    // 1b. kontener bez przewijania (overflow hidden/clip) przesunięty skryptem: wtedy nagłówek albo pole uciekają z ekranu
    document.querySelectorAll('.app, .glowny, .cialo, .pasek, body, html').forEach(x => { if (x.scrollTop || x.scrollLeft) { const s2 = st(x); if (!/auto|scroll/.test(s2.overflowY)) dodaj('przesunięty kontener bez przewijania', x, 'scrollTop ' + Math.round(x.scrollTop) + ', scrollLeft ' + Math.round(x.scrollLeft)); } });
    // 2. napisy: przykryte, ucięte, poza ekranem, pod notchem
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => n.nodeValue.trim() ? 1 : 2 });
    const plotna = [...document.querySelectorAll('.mk.mk-mysli canvas.mk-mysl')].filter(c => widac(c)).map(c => {  /* tylko w trakcie myślenia, przycięte jak na ekranie */
      const q = c.getBoundingClientRect(), o = { left: q.left, right: q.right, top: q.top, bottom: q.bottom, mk: c.closest('.mk') };
      klipy(c).forEach(k => { o.left = Math.max(o.left, k.r.left); o.right = Math.min(o.right, k.r.right); o.top = Math.max(o.top, k.r.top); o.bottom = Math.min(o.bottom, k.r.bottom); });
      return o; }).filter(o => o.right > o.left && o.bottom > o.top);
    for (let n; (n = tw.nextNode());) {
      const e = n.parentElement;
      if (!e || e.closest('svg, script, style, .sr, [hidden], .tlo, .platki-lot') || (e.closest('details:not([open])') && !e.closest('summary')) || !wZakresie(e) || !widac(e)) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      const kl = klipy(e);
      const wielokropek = kl.some(k => st(k.el).textOverflow === 'ellipsis') || st(e).textOverflow === 'ellipsis';
      for (const r of rg.getClientRects()) {
        if (r.width < 1 || r.height < 1) continue;
        let x0 = Math.max(r.left, 0), x1 = Math.min(r.right, W), y0 = Math.max(r.top, 0), y1 = Math.min(r.bottom, H), przewijany = false;
        let zaX = false, zaY = false;  /* za przewijanym kontenerem: przycięcie przez dalsze przodki to zwykłe przewijanie */
        for (const k of kl) {
          if (k.y || k.x) przewijany = przewijany || (k.y && (r.bottom > k.r.bottom + 1 || r.top < k.r.top - 1)) || (k.x && (r.right > k.r.right + 1 || r.left < k.r.left - 1));
          if (!k.x && !zaX && (r.left < k.r.left - 1 || r.right > k.r.right + 1) && !wielokropek) dodaj('ucięty napis', e, Math.round(r.left) + '–' + Math.round(r.right) + ' poza ' + Math.round(k.r.left) + '–' + Math.round(k.r.right));
          if (!k.y && !zaY && (r.top < k.r.top - 1 || r.bottom > k.r.bottom + 1)) dodaj('ucięty napis (pion)', e, Math.round(r.top) + '–' + Math.round(r.bottom) + ' poza ' + Math.round(k.r.top) + '–' + Math.round(k.r.bottom));
          zaX = zaX || k.x; zaY = zaY || k.y;
          x0 = Math.max(x0, k.r.left); x1 = Math.min(x1, k.r.right); y0 = Math.max(y0, k.r.top); y1 = Math.min(y1, k.r.bottom);
        }
        if (!przewijany && (r.left < -1 || r.right > W + 1)) dodaj('napis poza ekranem', e, Math.round(r.left) + '–' + Math.round(r.right));
        if (!przewijany && !kl.some(k => k.y) && r.bottom > H + 1) dodaj('napis poza ekranem (dół)', e, Math.round(r.bottom) + ' > ' + H);
        if (x1 - x0 < 2 || y1 - y0 < 2) continue;  /* przewinięty poza widok swojego kontenera */
        const cy = (Math.max(y0, r.top) + Math.min(y1, r.bottom)) / 2;
        for (const cx of [x0 + Math.min(3, (x1 - x0) / 2), (x0 + x1) / 2, x1 - Math.min(3, (x1 - x0) / 2)]) {
          const t = kto(cx, cy);
          if (t && t.tagName === 'CANVAS' && !t.classList.contains('mk-mysl')) { /* płótno ozdobne: liczy się tylko narysowany piksel */
            const q = t.getBoundingClientRect(), px = t.getContext('2d').getImageData(Math.floor((cx - q.left) * t.width / q.width), Math.floor((cy - q.top) * t.height / q.height), 1, 1).data;
            if (px[3] > 24) { dodaj('przykryty napis', e, 'przez rysunek na ' + opis(t)); break; } continue;
          }
          if (t && t !== e && !e.contains(t) && !t.contains(e) && krycie(t) > 0.05) { dodaj('przykryty napis', e, 'przez ' + opis(t)); break; }
        }
        for (const q of plotna) { if (q.mk.contains(e)) continue; if (!(q.right <= r.left || q.left >= r.right || q.bottom <= r.top || q.top >= r.bottom)) dodaj('wstęga na napisie', e); }
        if (sa) {
          if (r.left < sa.left - 0.5 || r.right > W - sa.right + 0.5) dodaj('napis pod notchem (bok)', e, Math.round(r.left) + '–' + Math.round(r.right));
          if (!kl.some(k => k.y) && (r.top < sa.top - 0.5 || r.bottom > H - sa.bottom + 0.5)) dodaj('napis pod notchem (góra/dół)', e, Math.round(r.top) + '–' + Math.round(r.bottom));
        }
      }
    }
    // 2b. powitanie w pustym stanie widać w całości (nie przycięte krawędzią przewijaka)
    const h1 = document.querySelector('.pusty #powitanie');
    if (!nakladka && h1 && widac(h1)) { const r = h1.getBoundingClientRect(), q = document.querySelector('#przewijak').getBoundingClientRect(); if (r.top < q.top - 1 || r.bottom > q.bottom + 1) dodaj('powitanie przycięte', h1, `${Math.round(r.top)}–${Math.round(r.bottom)} w ${Math.round(q.top)}–${Math.round(q.bottom)}`); }
    // 3. pole wpisu: widoczne, nieprzykryte, nad klawiaturą i nad paskiem domowym
    const pole = document.querySelector('#pole');
    if (!nakladka && pole && widac(pole)) {
      const r = pole.getBoundingClientRect(), vv = window.visualViewport, dol = vv ? vv.offsetTop + vv.height : H;
      if (r.top < 0 || r.bottom > dol + 1 || r.left < 0 || r.right > W + 1) dodaj('pole wpisu poza widokiem', pole, `${Math.round(r.top)}–${Math.round(r.bottom)} widok do ${Math.round(dol)}`);
      if (sa && (r.bottom > H - sa.bottom + 0.5 || r.left < sa.left - 0.5 || r.right > W - sa.right + 0.5)) dodaj('pole wpisu pod notchem / paskiem domowym', pole, `${Math.round(r.left)},${Math.round(r.bottom)}`);
      const sl = document.querySelector('#slash');
      for (const fx of [0.08, 0.5, 0.92]) for (const fy of [0.2, 0.8]) {
        const x = r.left + r.width * fx, y = r.top + r.height * fy; if (y < 0 || y > Math.min(H, dol)) continue;
        const t = kto(x, y); if (t && !pole.contains(t) && !(sl && sl.contains(t))) { dodaj('przykryte pole wpisu', pole, 'przez ' + opis(t)); break; }
      }
      if (wolnePole) { const t = kto(r.left + r.width / 2, r.top + r.height / 2); if (t && !pole.contains(t)) dodaj('przykryte pole wpisu', pole, 'przez ' + opis(t)); }
    }
    // 4. nakładka (panel, okno, szuflada): cała na ekranie i poza notchem, nie zasłania własnego przycisku
    if (nakladka) zakres.forEach(z => {
      const r = z.getBoundingClientRect();
      if (r.left < -0.5 || r.right > W + 0.5 || r.top < -0.5 || r.bottom > H + 0.5) dodaj('nakładka poza ekranem', z, `${Math.round(r.left)},${Math.round(r.top)}–${Math.round(r.right)},${Math.round(r.bottom)}`);
      const p = { panelUst: '#ustBtn', panelKonto: '#kontoBtn', panelKontakt: '#kontaktBtn' }[z.id], b = p && document.querySelector(p);
      if (b && widac(b)) { const q = b.getBoundingClientRect(), t = kto(q.left + q.width / 2, q.top + q.height / 2); if (t && z.contains(t)) dodaj('nakładka zasłania swój przycisk', z, p); }
    });
    // 5. cele dotyku ≥ 44×44 (ekrany dotykowe); pole tekstowe w etykiecie liczy się z etykietą
    if (dotyk) document.querySelectorAll('button, a[href], input:not([type=hidden]):not([type=file]), textarea, select, summary, [role=radio], [role=tab]').forEach(e => {
      if (!wZakresie(e) || !widac(e) || e.closest('[hidden], .sr') || st(e).pointerEvents === 'none' || e.closest('.zwiniety .pasek .ukr')) return;
      if (e.closest('p') && e.tagName === 'A') return;  /* link w zdaniu (wyjątek WCAG 2.5.5) */
      const cel = e.closest('label') || e, r = cel.getBoundingClientRect();
      if (r.right <= 0 || r.left >= W || r.bottom <= 0 || r.top >= H) return;
      const kl = klipy(e).filter(k => k.y); if (kl.some(k => r.bottom <= k.r.top || r.top >= k.r.bottom)) return; /* przewinięty poza widok */
      if (r.width < 43.5 || r.height < 43.5) dodaj('cel dotyku < 44 px', e, Math.round(r.width) + '×' + Math.round(r.height));
    });
    // 6. przyciski i pola pod notchem (bok zawsze, góra/dół gdy nie w przewijanym)
    if (sa) document.querySelectorAll('button, a[href], input:not([type=hidden]):not([type=file]), textarea').forEach(e => {
      if (!wZakresie(e) || !widac(e) || e.closest('[hidden], .sr, .zwiniety .pasek .ukr')) return;
      const r = e.getBoundingClientRect(); if (r.right <= 0 || r.left >= W) return;
      if (r.left < sa.left - 0.5 || r.right > W - sa.right + 0.5) dodaj('przycisk pod notchem (bok)', e, Math.round(r.left) + '–' + Math.round(r.right));
      if (!klipy(e).some(k => k.y) && (r.top < sa.top - 0.5 || r.bottom > H - sa.bottom + 0.5)) dodaj('przycisk pod notchem (góra/dół)', e, Math.round(r.top) + '–' + Math.round(r.bottom));
    });
  } finally { wymus.remove(); }
  return nar;
};

(async () => {
  const browser = await chromium.launch({ headless: process.env.PW_HEADLESS !== 'false' });
  const wyn = { kroki: 0, zrzuty: 0, bledy: [], sprawdzenia: [], naruszenia: {} };
  const ok = (n, w, i) => wyn.sprawdzenia.push((w ? 'OK  ' : 'BŁĄD ') + n + (i ? ' · ' + i : ''));
  const ZRZUTY = new Set((process.env.ZRZUTY_STANY || 'pusty,klawiatura (pusty),rozmowa,mysli,szuflada,zwiniety,ustawienia,logowanie,konto,kalkulator,brief').split(','));
  for (const [W, H, dotyk, sa] of ROZMIARY) {
    const roz = W + '×' + H;
    if (TYLKO && !TYLKO.includes(roz) && !TYLKO.includes(String(W))) continue;
    const tel = W <= 860;
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: dotyk, isMobile: dotyk && W < 1024, deviceScaleFactor: 1 });
    await ctx.route('http://cybersora.test/**', async r => {
      const u = new URL(r.request().url()), f = u.pathname.endsWith('/') ? u.pathname + 'index.html' : u.pathname;
      const plik = f.startsWith('/fonts/') ? path.join(FONTY, path.basename(f)) : path.join(STRONA, f);
      if (f.includes('..') || !fs.existsSync(plik)) return r.fulfill({ status: 404, body: 'brak' });
      await r.fulfill({ status: 200, body: fs.readFileSync(plik), headers: { 'content-type': TYPY[path.extname(plik)] || 'application/octet-stream', 'content-security-policy': CSP } });
    });
    await ctx.route(/^https?:\/\/(?!cybersora\.test).*/, r => r.abort());
    await ctx.addInitScript(() => {
      try { if (!sessionStorage.getItem('t')) { localStorage.clear(); localStorage.setItem('meshuga.ust', JSON.stringify({ tryb: 'quick' })); sessionStorage.setItem('t', '1'); } } catch (e) {}
      const st = window.setTimeout; window.__wolno = false;
      window.setTimeout = function (f, ms, ...a) { return st(f, window.__wolno && (ms === 900 || ms === 1800) ? 4000 : ms, ...a); };
    });
    const p = await ctx.newPage();
    if (sa) { const s = await ctx.newCDPSession(p); await s.send('Emulation.setSafeAreaInsetsOverride', { insets: sa }); }
    p.on('console', m => { if (m.type() === 'error') wyn.bledy.push(roz + ': ' + m.text()); });
    p.on('pageerror', e => wyn.bledy.push(roz + ' pageerror: ' + e.message));
    await p.goto('http://cybersora.test/meshuga/'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(700); wyn.kroki++;
    const nar = [];
    const sprawdz = async (stan, opcje = {}) => {
      const lista = await p.evaluate(SPRAWDZ, { dotyk, sa, nakladka: opcje.nakladka || null, wolnePole: !!opcje.wolnePole });
      lista.forEach(l => nar.push(stan + ' → ' + l));
      ok(`${roz} ${stan}`, lista.length === 0, lista.length ? lista.length + ' naruszeń: ' + lista.slice(0, 4).join(' | ') : '');
      if (ZRZUTY.has(stan) && (lista.length || process.env.ZRZUTY_WSZYSTKIE)) { await p.screenshot({ path: path.join(OUT, `${W}x${H}_${stan.replace(/[^a-ząćęłńóśźż0-9]+/gi, '-').replace(/-$/, '')}.png`) }); wyn.zrzuty++; }
      wyn.kroki++;
    };
    const klik = s => p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, s);
    const esc = async () => { await p.keyboard.press('Escape'); await p.waitForTimeout(120); };
    const szuflada = async on => { if (tel && on !== await p.evaluate(() => document.querySelector('#app').classList.contains('szuflada'))) { if (on) await klik('#menuTel'); else await klik('#zaslona'); await p.waitForTimeout(450); } };
    const odpowiedz = () => p.waitForFunction(() => !document.querySelector('#feed .log li:not(.ok)') && !document.querySelector('#feed .mdl-mysli'), null, { timeout: 20000 }).catch(() => {});
    const wpisz = async t => { await p.evaluate(t => { const w = document.querySelector('#wpis'); w.value = t; w.dispatchEvent(new Event('input')); document.querySelector('#pole').requestSubmit(); }, t); };
    const klawiatura = async stan => {
      if (!dotyk) return;
      await p.evaluate(() => { document.querySelector('#wpis').focus(); const v = visualViewport, h = Math.round(innerHeight * 0.42); Object.defineProperty(v, 'height', { configurable: true, get: () => innerHeight - h }); v.dispatchEvent(new Event('resize')); });
      await p.waitForTimeout(450); await sprawdz(stan);
      // powiększenie palcami (scale 2) to nie klawiatura: układ nie może podskoczyć
      const kb = await p.evaluate(() => { const v = visualViewport; Object.defineProperty(v, 'height', { configurable: true, get: () => innerHeight / 2 }); Object.defineProperty(v, 'scale', { configurable: true, get: () => 2 }); v.dispatchEvent(new Event('resize')); return getComputedStyle(document.documentElement).getPropertyValue('--kb').trim() || '0px'; });
      if (kb !== '0px') nar.push(stan + ' → powiększenie palcami traktowane jak klawiatura: --kb ' + kb);
      ok(`${roz} ${stan}: powiększenie (scale 2) nie przesuwa układu`, kb === '0px', kb);
      await p.evaluate(() => { const v = visualViewport; delete v.height; delete v.scale; v.dispatchEvent(new Event('resize')); document.activeElement.blur(); }); await p.waitForTimeout(300);
    };

    await sprawdz('pusty');
    await klawiatura('klawiatura (pusty)');
    await szuflada(true); await klik('#ustBtn'); await p.waitForTimeout(250); await sprawdz('ustawienia', { nakladka: '#panelUst' }); await esc(); await szuflada(false);
    await klik('#kontaktBtn'); await p.waitForTimeout(200); await sprawdz('napisz', { nakladka: '#panelKontakt' }); await esc();
    await szuflada(true); await klik('#kontoBtn'); await p.waitForTimeout(300); await sprawdz('logowanie', { nakladka: '.okno' }); await esc(); await szuflada(false);
    if (tel) { await szuflada(true); await sprawdz('szuflada', { nakladka: '#pasek' }); await szuflada(false); }
    else { await klik('#zwin'); await p.waitForTimeout(450); await sprawdz('zwiniety'); await klik('#zwin'); await p.waitForTimeout(450); }
    await p.evaluate(() => { window.__wolno = true; localStorage.setItem('meshuga.ust', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('meshuga.ust') || '{}'), { tryb: 'default' }))); });
    await p.reload(); await p.waitForTimeout(500);
    await p.evaluate(() => { window.__wolno = true; });
    await wpisz('Ile kosztuje bot do sklepu?'); await p.waitForTimeout(1500); await sprawdz('mysli');
    await odpowiedz();
    await wpisz('Mam błąd w kodzie Pythona: ' + 'bardzo_dluga_nazwa_zmiennej_bez_spacji_'.repeat(6) + ' — pomożesz?'); await odpowiedz();
    await wpisz('Pokaż wasze projekty'); await odpowiedz(); await p.waitForTimeout(300);
    await sprawdz('rozmowa');
    await p.evaluate(() => { document.querySelector('#przewijak').scrollTop = 0; }); await p.waitForTimeout(150); await sprawdz('rozmowa (góra)');
    await klawiatura('klawiatura (rozmowa)');
    await wpisz('/cena'); await p.waitForTimeout(500); await p.evaluate(() => { const k = [...document.querySelectorAll('.kalk')].pop(); if (k) k.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(150); await sprawdz('kalkulator');
    await wpisz('/brief'); await p.waitForTimeout(250);
    for (let i = 0; i < 5; i++) { await wpisz('pomiń'); await p.waitForTimeout(200); }
    await p.evaluate(() => { const k = [...document.querySelectorAll('.brief')].pop(); if (k) k.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(150); await sprawdz('brief');
    await szuflada(true); await klik('#umiemBtn'); await p.waitForTimeout(500); await sprawdz('co umiem');
    // panel konta (zalogowany)
    await p.evaluate(() => localStorage.setItem('dancycloud.sesja', JSON.stringify({ nick: 'MeshuFanka_2026', token: 'makieta.x', waznyDo: new Date(Date.now() + 864e5).toISOString() })));
    await p.reload(); await p.waitForTimeout(500);
    await szuflada(true); await klik('#kontoBtn'); await p.waitForTimeout(500); await sprawdz('konto', { nakladka: '#panelKonto' }); await esc(); await szuflada(false);
    wyn.naruszenia[roz] = nar.length;
    if (nar.length) wyn.lista = (wyn.lista || []).concat(nar.map(n => roz + ' ' + n));
    await ctx.close();
  }
  ok('zero błędów konsoli', wyn.bledy.length === 0, wyn.bledy.slice(0, 3).join(' | '));
  await browser.close();
  console.log(JSON.stringify(wyn, null, 1));
})();
