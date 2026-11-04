// Kot w rogu cybersora.pl (wariant A, wybór maisy 04.11): żywy kot z meshuga-kot.js w kółku SVG z aplikacji
// zamiast zdjęcia kot-128.webp w kółku CSS. Kopia strony z Documents\cybersora-pages z nagłówkami CSP cybersora.pl.
// Stany: zamknięty, podpowiedź, otwarty, „pisze…”, po odpowiedzi; 1280/768/375; reduced-motion; brak modułu kota (fallback).
// 05.11 (chmura): stan „Meshuga myśli” (wstęga A, etap z tematu) w 1280/768/375, strażnik pętli rAF wstęgi
// po odpowiedzi, reduced-motion = statyczna wstęga bez pętli, fallback bez modułu z samym napisem etapu.
// ETAP=przed|po (prefiks zrzutów). Zrzuty: _testy_strony/zrzuty/kot-rog. Uruchomienie: node _testy_strony/test_kot_rog.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = process.env.STRONA_ROOT || path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'zrzuty', 'kot-rog');
fs.mkdirSync(OUT, { recursive: true });
const ETAP = process.env.ETAP || 'po';
const CSP = "default-src 'self'; script-src 'self' https://web3forms.com https://hcaptcha.com https://*.hcaptcha.com; style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.web3forms.com https://hcaptcha.com https://*.hcaptcha.com https://dancycloud-ranking.dancycloud-ranking.workers.dev; frame-src https://hcaptcha.com https://*.hcaptcha.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://api.web3forms.com";
const TYPY = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.avif': 'image/avif', '.json': 'application/json', '.xml': 'application/xml' };

(async () => {
  const browser = await chromium.launch({ headless: process.env.PW_HEADLESS !== 'false' });
  const wyn = { etap: ETAP, kroki: 0, zrzuty: 0, bledy: [], csp: 0, brak404: [], sprawdzenia: [] };
  const ok = (n, w, i) => wyn.sprawdzenia.push((w ? 'OK  ' : 'BŁĄD ') + n + (i ? ' · ' + i : ''));
  const zrzut = async (p, nazwa, loc) => { const o = { path: path.join(OUT, `${ETAP}_${nazwa}.png`) }; await (loc ? loc.screenshot(o) : p.screenshot(o)); wyn.zrzuty++; };

  // zbliżenie rogu z zapasem: wstęga wychodzi 22% poza kota, zrzut samego przycisku by ją uciął
  const zrzutRogu = async (p, nazwa) => {
    const r = await p.locator('.kot__btn').boundingBox(), v = p.viewportSize(), z = 34;
    const x = Math.max(0, r.x - z), y = Math.max(0, r.y - z);
    await p.screenshot({ path: path.join(OUT, `${ETAP}_${nazwa}.png`), clip: { x, y, width: Math.min(v.width - x, r.width + 2 * z), height: Math.min(v.height - y, r.height + 2 * z) } }); wyn.zrzuty++;
  };
  async function kontekst(w, opcje = {}) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w === 375 ? 780 : 820 }, reducedMotion: opcje.reduce ? 'reduce' : 'no-preference', hasTouch: w === 375, isMobile: w === 375 });
    await ctx.route(/^https?:\/\/(?!cybersora\.test).*/, r => r.abort());
    await ctx.route('http://cybersora.test/**', async r => {
      const u = new URL(r.request().url());
      const f = decodeURIComponent(u.pathname.endsWith('/') ? u.pathname + 'index.html' : u.pathname);
      if (opcje.bezKota && /meshuga-kot\.js$/.test(f)) return r.fulfill({ status: 404, body: 'brak' });
      const plik = path.join(ROOT, f);
      if (f.includes('..') || !fs.existsSync(plik) || fs.statSync(plik).isDirectory()) { if (!opcje.bezKota) wyn.brak404.push(f); return r.fulfill({ status: 404, body: 'brak' }); }
      await r.fulfill({ status: 200, body: fs.readFileSync(plik), headers: { 'content-type': TYPY[path.extname(plik)] || 'application/octet-stream', 'content-security-policy': CSP } });
    });
    ctx.on('page', pg => {
      pg.on('console', m => { if (m.type() !== 'error') return; const t = m.text(); if (/Content Security Policy/i.test(t)) wyn.csp++; else if (!/Failed to load resource/.test(t)) wyn.bledy.push(w + ': ' + t); });
      pg.on('pageerror', e => wyn.bledy.push(w + ' pageerror: ' + e.message));
    });
    await ctx.addInitScript(() => {
      // licznik klatek wstęgi: każde czyszczenie canvasu .mk-mysl = jedna klatka pętli rAF modułu
      window.__wstega = 0;
      const cr = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function () { if (this.canvas.classList.contains('mk-mysl')) window.__wstega++; return cr.apply(this, arguments); };
    });
    const p = await ctx.newPage();
    await p.goto('http://cybersora.test/'); await p.waitForTimeout(1400); wyn.kroki++;
    return { ctx, p };
  }
  const stan = p => p.evaluate(() => {
    const b = document.querySelector('.kot__btn'), r = b.getBoundingClientRect(), mk = b.querySelector('.mk');
    const slot = b.querySelector('.mk-ring-slot');
    const bg = getComputedStyle(b).backgroundImage;
    const ringAnims = slot ? slot.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length : 0;
    const ringRot = slot ? getComputedStyle(slot).transform : 'none';
    return {
      btn: [Math.round(r.width), Math.round(r.height), Math.round(innerWidth - r.right), Math.round(innerHeight - r.bottom)],
      mk: !!mk, kotSvg: !!b.querySelector('svg.mk-kot'), ringSvg: !!b.querySelector('svg.mk-ring-A'),
      mkW: mk ? Math.round(mk.getBoundingClientRect().width) : 0,
      zdjecie: /kot-128\.webp/.test(bg), squint: !!b.querySelector('.mk-squint'), staryRing: !!b.querySelector('.kot__ring, .kot__skan'),
      dot: getComputedStyle(b.querySelector('.kot__dot')).display !== 'none', ringAnims, ringRot,
      mysli: !!b.querySelector('.mk.mk-mysli'), canvasy: b.querySelectorAll('canvas.mk-mysl').length,
      slotOp: slot ? +getComputedStyle(slot).opacity : 1,
      przyciete: (() => { for (let n = b.querySelector('.kot__mk'); n && n !== document.body; n = n.parentElement) { if (getComputedStyle(n).overflow !== 'visible') return n.className; } return ''; })(),
      kotWidac: getComputedStyle(b).opacity !== '0' && getComputedStyle(b).visibility !== 'hidden',
      pisze: (document.querySelector('.kot__pisze') || {}).textContent || '',
      poziomy: document.documentElement.scrollWidth > innerWidth
    };
  });

  for (const w of [1280, 768, 375]) {
    const { ctx, p } = await kontekst(w);
    let s = await stan(p);
    ok(`${w} zamknięty: przycisk 64 px w tym samym miejscu (18 px od rogu)`, s.btn[0] === 64 && s.btn[1] === 64 && s.btn[2] === 18 && s.btn[3] === 18, s.btn.join('/'));
    ok(`${w} zamknięty: żywy kot wektorowy w kółku A (84 px), bez zdjęcia i kółka CSS`, s.mk && s.kotSvg && s.ringSvg && s.mkW === 84 && !s.zdjecie && !s.staryRing, JSON.stringify({ mk: s.mk, svg: s.kotSvg, ring: s.ringSvg, mkW: s.mkW, zdjecie: s.zdjecie, stary: s.staryRing }));
    ok(`${w} zamknięty: kółko się kręci`, s.ringAnims >= 2, s.ringAnims + ' animacji');
    ok(`${w} bez poziomego przewijania`, !s.poziomy);
    await zrzut(p, `${w}_zamkniety`);
    await zrzut(p, `${w}_rog_zblizenie`, p.locator('.kot__btn'));
    // podpowiedź: ruch na stronie + 4 s
    await p.mouse.wheel(0, 40); await p.waitForTimeout(4400); wyn.kroki++;
    s = await stan(p);
    ok(`${w} podpowiedź: dymek i kropka`, s.dot && await p.locator('.kot__tip').isVisible(), 'kropka ' + s.dot);
    await zrzut(p, `${w}_podpowiedz`);
    await p.click('.kot__tip .kot__b:not(.kot__b--main)'); wyn.kroki++;
    // otwarty
    await p.click('.kot__btn'); await p.waitForTimeout(600); wyn.kroki++;
    s = await stan(p);
    if (w > 480) {
      const m = /matrix\(([^,]+), ([^,]+)/.exec(s.ringRot), kat = m ? Math.round(Math.atan2(+m[2], +m[1]) * 180 / Math.PI) : 0;
      ok(`${w} otwarty: kółko obrócone o 90°`, kat === 90, s.ringRot + ' · ' + kat + '°');
    }
    await zrzut(p, `${w}_otwarty`);
    // myśli: wstęga A + etap z tematu (pytanie o cenę → „przeglądam cennik…”)
    await p.fill('#kotPanel .kot__in[aria-label="Pytanie do Meshugi"]', 'Ile to kosztuje?');
    await p.evaluate(() => {
      window.__wstega = 0; window.__t0 = performance.now(); window.__tOdp = 0;
      // czas myślenia = od wysłania do zniknięcia napisu etapu
      new MutationObserver((m, o) => { if (window.__mial && !document.querySelector('.kot__pisze')) { window.__tOdp = performance.now() - window.__t0; o.disconnect(); } window.__mial = window.__mial || !!document.querySelector('.kot__pisze'); })
        .observe(document.querySelector('.kot__log'), { childList: true });
    });
    await p.press('#kotPanel .kot__in[aria-label="Pytanie do Meshugi"]', 'Enter'); await p.waitForTimeout(500); wyn.kroki++;
    s = await stan(p);
    ok(`${w} myśli: napis etapu zamiast „Meshuga pisze…”`, s.pisze === 'przeglądam cennik…', s.pisze);
    ok(`${w} myśli: wstęga na dwóch canvasach, kot mruży oczy, kółko przygasa do 0,28`, s.mysli && s.canvasy === 2 && s.squint && Math.abs(s.slotOp - 0.28) < 0.02, JSON.stringify({ mysli: s.mysli, canvasy: s.canvasy, squint: s.squint, op: s.slotOp }));
    ok(`${w} myśli: nic przy kocie nie przycina canvasów (overflow)`, s.przyciete === '', s.przyciete);
    const klatki = await p.evaluate(() => window.__wstega);
    ok(`${w} myśli: pętla wstęgi rysuje`, klatki > 5, klatki + ' klatek / 0,5 s');
    if (w > 480) { ok(`${w} myśli: kot w rogu widoczny przy otwartym okienku`, s.kotWidac); await zrzut(p, `${w}_mysli`); await zrzutRogu(p, `${w}_mysli_zblizenie`); }
    else {
      ok(`${w} myśli: na telefonie arkusz chowa kota (decyzja dla maisy, zostaje sam napis etapu)`, !s.kotWidac, 'kot widać: ' + s.kotWidac);
      await zrzut(p, `${w}_mysli_arkusz`);
      await p.click('.kot__x'); await p.waitForTimeout(350); wyn.kroki++;
      s = await stan(p);
      ok(`${w} myśli: po zamknięciu arkusza wstęga wokół kota w rogu`, s.mysli && s.kotWidac);
      await zrzut(p, `${w}_mysli_rog`);
    }
    // minimum 1,2 s myślenia bez KOT_API
    await p.waitForTimeout(1600); wyn.kroki++;
    const tOdp = await p.evaluate(() => Math.round(window.__tOdp));
    ok(`${w} myśli trwa co najmniej 1,2 s bez KOT_API (wstęga zdąży wejść i wyjść)`, tOdp >= 1200 && tOdp < 1700, tOdp + ' ms');
    s = await stan(p);
    ok(`${w} po odpowiedzi: oczy otwarte, wstęga zgaszona, kółko wraca`, !s.squint && !s.mysli && s.slotOp > 0.95 && (await p.locator('.kot__m--kot').count()) >= 2, JSON.stringify({ squint: s.squint, mysli: s.mysli, op: s.slotOp }));
    await p.evaluate(() => { window.__wstega = 0; }); await p.waitForTimeout(1000);
    const poKlatki = await p.evaluate(() => window.__wstega);
    ok(`${w} po odpowiedzi brak pętli wstęgi (0 klatek rAF w 1 s)`, poKlatki === 0, poKlatki + ' klatek');
    if (w <= 480) { await p.click('.kot__btn'); await p.waitForTimeout(600); }
    await zrzut(p, `${w}_odpowiedz`);
    // focus-visible
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    const fokus = await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('kot__btn') && getComputedStyle(document.activeElement).outlineStyle !== 'none');
    ok(`${w} po zamknięciu fokus wraca na kota z widoczną obwódką`, fokus);
    await ctx.close();
  }
  // reduced-motion: statyczny kot
  {
    const { ctx, p } = await kontekst(1280, { reduce: true });
    const s = await stan(p);
    ok(`reduced-motion: kot jest, kółko stoi`, s.kotSvg && s.ringAnims === 0, s.ringAnims + ' animacji');
    await zrzut(p, `1280_reduced_rog`, p.locator('.kot__btn'));
    await p.click('.kot__btn'); await p.waitForTimeout(300);
    await p.fill('#kotPanel .kot__in[aria-label="Pytanie do Meshugi"]', 'Napiszę mój pomysł');
    await p.press('#kotPanel .kot__in[aria-label="Pytanie do Meshugi"]', 'Enter'); await p.waitForTimeout(100);
    await p.evaluate(() => { window.__wstega = 0; }); await p.waitForTimeout(600);
    const r = await stan(p), kl = await p.evaluate(() => window.__wstega);
    ok(`reduced-motion myśli: statyczna wstęga bez pętli, etap „rozkładam pomysł na kroki…”`, r.mysli && r.canvasy === 2 && kl === 0 && r.pisze === 'rozkładam pomysł na kroki…', JSON.stringify({ mysli: r.mysli, kl, pisze: r.pisze }));
    await zrzutRogu(p, `1280_reduced_mysli`);
    await p.waitForTimeout(1200);
    const r2 = await stan(p);
    ok(`reduced-motion po odpowiedzi: wstęga zgaszona`, !r2.mysli && (await p.locator('.kot__m--kot').count()) >= 2);
    await ctx.close();
  }
  // brak meshuga-kot.js: zostaje zdjęcie kota (nie pusty przycisk)
  {
    const { ctx, p } = await kontekst(1280, { bezKota: true });
    const s = await stan(p);
    ok(`bez modułu kota: zdjęcie kot-128.webp i kółko CSS`, !s.mk && s.zdjecie && s.staryRing, JSON.stringify({ mk: s.mk, zdjecie: s.zdjecie, stary: s.staryRing }));
    await zrzut(p, `1280_fallback_rog`, p.locator('.kot__btn'));
    await p.click('.kot__btn'); await p.waitForTimeout(500);
    ok(`bez modułu kota: okienko dalej się otwiera`, await p.locator('#kotPanel').isVisible());
    await p.fill('#kotPanel .kot__in[aria-label="Pytanie do Meshugi"]', 'Pokażcie projekty');
    await p.press('#kotPanel .kot__in[aria-label="Pytanie do Meshugi"]', 'Enter'); await p.waitForTimeout(120); wyn.kroki++;
    const f = await stan(p);
    ok(`bez modułu kota: sam napis etapu „szukam w projektach…”, bez wstęgi`, f.pisze === 'szukam w projektach…' && f.canvasy === 0, f.pisze);
    await zrzut(p, `1280_fallback_mysli`);
    await p.waitForTimeout(700);
    ok(`bez modułu kota: odpowiedź przychodzi (450 ms)`, (await p.locator('.kot__pisze').count()) === 0 && (await p.locator('.kot__m--kot').count()) >= 2);
    await ctx.close();
  }
  ok('zero błędów konsoli', wyn.bledy.length === 0, wyn.bledy.slice(0, 3).join(' | '));
  ok('zero naruszeń CSP', wyn.csp === 0, String(wyn.csp));
  ok('zero 404 (poza celowym)', wyn.brak404.length === 0, wyn.brak404.join(','));
  await browser.close();
  console.log(JSON.stringify(wyn, null, 1));
})();
