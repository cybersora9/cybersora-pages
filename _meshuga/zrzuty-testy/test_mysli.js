// Strażnik „Meshuga myśli” (wariant A na stałe, decyzja właściciela): wstęga wokół kota przy wysłaniu, gaśnie przy pierwszym słowie,
// etapy z MeshugaKot.etapy() zgodne z tematem, ruch wyłączony = statyczny pierścień bez pętli, płynność 3 s, nic nie nachodzi na pole,
// po odpowiedzi 0 pętli wstęgi. Tryb pokazowy (bez Claude’a): Astral czeka 0,9 s, Pycode 1,8 s.
// MESHUGA_PLIK = inny build (np. stara wersja do pokazania, że test jest czerwony).
const { chromium } = require('playwright');
const path = require('path');
const URL = require('url').pathToFileURL(path.resolve(process.env.MESHUGA_PLIK || path.join(__dirname, '..', 'meshuga-app.html'))).href;
const OUT = path.join(process.env.MESHUGA_ZRZUTY || path.join(__dirname, 'wyniki'), 'mysli');
require('fs').mkdirSync(OUT, { recursive: true });

/* licznik pętli wstęgi: każdy requestAnimationFrame z funkcją mKlatka (pętla myśli w meshuga-kot.js) jest zapisany do chwili wywołania */
const LICZNIK = () => {
  const raf = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
  const czeka = new Map(); window.__mysl = { klatki: 0, czeka };
  window.requestAnimationFrame = function (cb) {
    let id;
    const opak = function (ts) { czeka.delete(id); if (cb && cb.name === 'mKlatka') window.__mysl.klatki++; return cb(ts); };
    id = raf(opak); if (cb && cb.name === 'mKlatka') czeka.set(id, 1); return id;
  };
  window.cancelAnimationFrame = function (id) { czeka.delete(id); return cancel(id); };
  window.__petleMysli = () => window.__mysl.czeka.size;
  /* zapis kolejnych etapów i stanu wstęgi w chwili pierwszego słowa */
  window.__zapis = { etapy: [], wstegaPrzyPierwszymSlowie: null };
  new MutationObserver(() => {
    const et = document.querySelector('#feed .mdl-mysli .et');
    if (et) { const t = et.textContent.trim(); if (t && window.__zapis.etapy[window.__zapis.etapy.length - 1] !== t) window.__zapis.etapy.push(t); }
    const tx = [...document.querySelectorAll('#feed .msg-m .tekst')].pop();
    if (tx && window.__zapis.wstegaPrzyPierwszymSlowie === null && !tx.querySelector('.mdl-mysli, .oglad') && tx.textContent.trim().length > 0)
      window.__zapis.wstegaPrzyPierwszymSlowie = document.querySelectorAll('.mk.mk-mysli').length;
  }).observe(document, { subtree: true, childList: true, characterData: true });
};

const TEMATY = [
  ['Ile kosztuje bot do sklepu?', 'przeglądam cennik'],
  ['Mam błąd w kodzie Pythona, pomożesz?', 'czytam Twój kod'],
  ['Mam pomysł na aplikację dla siłowni', 'rozkładam pomysł na kroki'],
  ['Pokaż wasze projekty', 'szukam w projektach'],
  ['Cześć, kim jesteś?', 'układam odpowiedź']
];

(async () => {
  const browser = await chromium.launch({ headless: process.env.PW_HEADLESS !== 'false' });
  const wyn = { kroki: 0, zrzuty: 0, bledy: [], sprawdzenia: [] };
  const ok = (n, w, i) => wyn.sprawdzenia.push((w ? 'OK  ' : 'BŁĄD ') + n + (i ? ' · ' + i : ''));
  async function strona(w, opcje = {}) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w <= 420 ? 780 : 820 }, reducedMotion: opcje.reduce ? 'reduce' : 'no-preference' });
    await ctx.addInitScript(u => { try { if (!sessionStorage.getItem('t')) { localStorage.clear(); localStorage.setItem('meshuga.ust', JSON.stringify(u)); sessionStorage.setItem('t', '1'); } } catch (e) {} }, opcje.ust || {});
    await ctx.addInitScript(LICZNIK);
    if (opcje.wydluz) await ctx.addInitScript(() => { const st = window.setTimeout; window.setTimeout = function (f, ms, ...a) { return st(f, (ms === 900 || ms === 1800) ? 3600 : ms, ...a); }; });
    const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') wyn.bledy.push(w + ': ' + m.text()); });
    p.on('pageerror', e => wyn.bledy.push(w + ' pageerror: ' + e.message));
    await p.goto(URL); await p.waitForTimeout(600); wyn.kroki++;
    return { ctx, p };
  }
  const wyslij = async (p, t) => { await p.fill('#wpis', t); await p.press('#wpis', 'Enter'); wyn.kroki++; };
  const czekajKoniec = p => p.waitForFunction(() => !document.querySelector('#feed .log li:not(.ok)') && !document.querySelector('#feed .mdl-mysli'), null, { timeout: 20000 }).catch(() => {});

  // 1. moduł: wariant A na stałe, MeshugaKot.etapy() liczy etapy tak samo dla aplikacji i okienka strony
  {
    const { ctx, p } = await strona(1280, { ust: { mysli: 'C', motyw: 'dark' } });
    const m = await p.evaluate(() => {
      const K = window.MeshugaKot, e = K && typeof K.etapy === 'function' ? K.etapy : null;
      return {
        etapy: !!e, wariant: !!(K && K.wariantMysli),
        bez: e ? e('Ile kosztuje bot?', { historia: 0 }) : null,
        zH: e ? e('Ile kosztuje bot?', { historia: 3 }) : null,
        zZ: e ? e('Oceń mój zrzut', { historia: 2, zrzut: true }) : null,
        pusty: e ? e('', {}) : null,
        przelacznik: !!document.querySelector('[data-ust="mysli"]'),
        zapis: JSON.parse(localStorage.getItem('meshuga.ust') || '{}')
      };
    });
    ok('moduł: MeshugaKot.etapy(pytanie, {historia, zrzut}) istnieje', m.etapy);
    ok('moduł: bez wyboru wariantu (A na stałe, brak wariantMysli)', !m.wariant);
    ok('Ustawienia: brak przełącznika „Myśli · makieta”', !m.przelacznik);
    ok('stary zapis ust.mysli skasowany przy starcie', !('mysli' in m.zapis), JSON.stringify(m.zapis));
    const dl = a => Array.isArray(a) && a.length >= 2 && a.length <= 4;
    ok('etapy: zawsze 2–4 (bez historii, z historią, ze zrzutem, puste pytanie)', [m.bez, m.zH, m.zZ, m.pusty].every(dl), JSON.stringify([m.bez, m.zH, m.zZ, m.pusty]));
    ok('etapy: z historią dochodzi „przypominam sobie rozmowę”', !!m.zH && m.zH.includes('przypominam sobie rozmowę') && !m.bez.includes('przypominam sobie rozmowę'));
    ok('etapy: ze zrzutem dochodzi „oglądam zrzut”', !!m.zZ && m.zZ.includes('oglądam zrzut'));
    for (const [q, cel] of TEMATY) {
      const r = await p.evaluate(q => window.MeshugaKot.etapy ? window.MeshugaKot.etapy(q, { historia: 0 }) : null, q);
      ok(`etapy: „${q}” → ostatni etap „${cel}”`, !!r && r[r.length - 1] === cel, JSON.stringify(r));
    }
    await ctx.close();
  }

  // 2. aplikacja: wstęga przy wysłaniu, etapy z tematu (Pycode, żeby etap tematu zdążył się pokazać), gaśnie przy pierwszym słowie
  for (const w of [1280, 768, 375]) {
    const { ctx, p } = await strona(w, { ust: { tryb: 'default' } });
    for (const [i, [q, cel]] of TEMATY.entries()) {
      if (i && w !== 1280) break;          /* pełny przegląd tematów na 1280, na węższych pierwszy temat */
      await p.evaluate(() => document.querySelector('#nowy').click()); await p.waitForTimeout(200); /* szuflada na telefonie: klik z kodu */
      await p.evaluate(() => { window.__zapis.etapy = []; window.__zapis.wstegaPrzyPierwszymSlowie = null; });
      await wyslij(p, q); await p.waitForTimeout(150);
      const s = await p.evaluate(() => {
        const R = e => e.getBoundingClientRect(), nach = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
        const av = [...document.querySelectorAll('#feed .msg-m .mk')].pop();
        const pole = R(document.querySelector('#pole'));
        const pl = [...document.querySelectorAll('canvas.mk-mysl')].filter(c => c.offsetParent && R(c).width > 0);
        const napis = document.querySelector('#feed .mdl-mysli');
        return {
          klasa: !!av && av.classList.contains('mk-mysli'), plotna: av ? av.querySelectorAll('canvas.mk-mysl').length : 0,
          petle: window.__petleMysli(), napis: napis ? napis.textContent.replace(/\s+/g, ' ').trim() : '',
          wstegaNaPole: pl.some(c => nach(R(c), pole)), napisNaPole: napis ? nach(R(napis), pole) : null,
          napisUciety: napis ? napis.scrollWidth > napis.clientWidth + 1 || R(napis).right > innerWidth : null
        };
      });
      const n = `${w} „${q}”`;
      ok(`${n}: wstęga startuje przy wysłaniu (klasa mk-mysli, 2 płótna, pętla działa)`, s.klasa && s.plotna === 2 && s.petle >= 1, JSON.stringify({ k: s.klasa, p: s.plotna, l: s.petle }));
      ok(`${n}: pierwszy etap „czytam pytanie · N s”`, /^czytam pytanie ?· \d+ s$/.test(s.napis), s.napis);
      ok(`${n}: wstęga i napis nie nachodzą na pole wpisu, napis nie ucięty`, !s.wstegaNaPole && s.napisNaPole === false && !s.napisUciety, JSON.stringify(s));
      if (i === 0) { await p.waitForTimeout(1100); await p.screenshot({ path: path.join(OUT, `mysli_${w}.png`) }); wyn.zrzuty++; }
      await czekajKoniec(p); await p.waitForTimeout(700);
      const po = await p.evaluate(() => ({
        etapy: window.__zapis.etapy, przySlowie: window.__zapis.wstegaPrzyPierwszymSlowie, petle: window.__petleMysli(),
        klasa: document.querySelectorAll('.mk.mk-mysli').length,
        pusteP: [...document.querySelectorAll('canvas.mk-mysl')].every(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 16) if (d[i]) return false; return true; }),
        oczekiwane: window.MeshugaKot.etapy ? window.MeshugaKot.etapy(document.querySelector('#feed .msg-u').textContent, { historia: 0 }) : null
      }));
      ok(`${n}: etapy w aplikacji = MeshugaKot.etapy() („${cel}”)`, !!po.oczekiwane && po.etapy.length >= 2 && po.etapy.every((e, k) => e === po.oczekiwane[k]) && po.etapy[po.etapy.length - 1] === cel, JSON.stringify(po.etapy));
      ok(`${n}: wstęga gaśnie przy pierwszym słowie`, po.przySlowie === 0, String(po.przySlowie));
      ok(`${n}: po odpowiedzi 0 pętli wstęgi, płótna czyste`, po.petle === 0 && po.klasa === 0 && po.pusteP, JSON.stringify({ l: po.petle, k: po.klasa, c: po.pusteP }));
    }
    // z historią: drugi etap „przypominam sobie rozmowę”
    await p.evaluate(() => { window.__zapis.etapy = []; });
    await wyslij(p, 'A ile to potrwa?'); await czekajKoniec(p); await p.waitForTimeout(300);
    const zh = await p.evaluate(() => window.__zapis.etapy);
    ok(`${w} z historią: „czytam pytanie” → „przypominam sobie rozmowę”`, zh[0] === 'czytam pytanie' && zh[1] === 'przypominam sobie rozmowę', JSON.stringify(zh));
    await ctx.close();
  }

  // 3. ruch wyłączony: Ustawienia → Animacje: Wył. oraz prefers-reduced-motion → statyczny pierścień, zero pętli
  for (const tryb of ['ustawienia', 'reduced-motion']) {
    const { ctx, p } = await strona(1280, { reduce: tryb === 'reduced-motion', ust: { tryb: 'default' } });
    if (tryb === 'ustawienia') { await p.click('#ustBtn'); await p.click('.seg[data-ust="ruch"] button[data-v="off"]'); await p.keyboard.press('Escape'); await p.waitForTimeout(200); wyn.kroki++; }
    await p.evaluate(() => { window.__mysl.klatki = 0; });
    await wyslij(p, 'Ile kosztuje skrypt?'); await p.waitForTimeout(700);
    const s = await p.evaluate(() => {
      const av = [...document.querySelectorAll('#feed .msg-m .mk')].pop(), pl = av ? [...av.querySelectorAll('canvas.mk-mysl')] : [];
      const px = pl.reduce((n, c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) if (d[i] > 20) n++; return n; }, 0);
      return { klasa: !!av && av.classList.contains('mk-mysli'), plotna: pl.length, px, petle: window.__petleMysli(), klatki: window.__mysl.klatki, motion: window.MeshugaKot.motion };
    });
    ok(`ruch wył. (${tryb}): statyczny pierścień narysowany`, s.klasa && s.plotna === 2 && s.px > 40 && s.motion === false, JSON.stringify(s));
    ok(`ruch wył. (${tryb}): brak pętli rAF wstęgi`, s.petle === 0 && s.klatki === 0, JSON.stringify({ l: s.petle, k: s.klatki }));
    if (tryb === 'ustawienia') { await p.screenshot({ path: path.join(OUT, 'mysli_1280_bez_ruchu.png') }); wyn.zrzuty++; }
    await czekajKoniec(p); await p.waitForTimeout(300);
    const po = await p.evaluate(() => ({ petle: window.__petleMysli(), klatki: window.__mysl.klatki, klasa: document.querySelectorAll('.mk.mk-mysli').length }));
    ok(`ruch wył. (${tryb}): po odpowiedzi wstęga zgaszona bez pętli`, po.petle === 0 && po.klatki === 0 && po.klasa === 0, JSON.stringify(po));
    await ctx.close();
  }

  // 4. płynność: 3 s myślenia (opóźnienie trybu pokazowego wydłużone do 3,6 s), żadna klatka > 50 ms
  for (const w of [1280, 375]) {
    const { ctx, p } = await strona(w, { wydluz: true });
    await wyslij(p, 'Jak napisać pętlę w Pythonie?'); await p.waitForTimeout(200);
    const f = await p.evaluate(() => new Promise(ok => {
      const t = []; const k0 = window.__mysl.klatki;
      const krok = ts => { t.push(ts); if (ts - t[0] < 3000) requestAnimationFrame(krok); else { const d = t.slice(1).map((x, i) => x - t[i]); ok({ n: d.length, max: Math.round(Math.max(...d)), sr: +(d.reduce((a, b) => a + b, 0) / d.length).toFixed(1), wstega: window.__mysl.klatki - k0, mysli: document.querySelectorAll('.mk.mk-mysli').length }); } };
      requestAnimationFrame(krok);
    }));
    ok(`${w} płynność: 3 s myślenia bez klatki > 50 ms, wstęga rysowana co klatkę`, f.max <= 50 && f.wstega >= f.n * 0.9 && f.mysli > 0, JSON.stringify(f));
    await czekajKoniec(p); await p.waitForTimeout(700);
    ok(`${w} płynność: po odpowiedzi 0 pętli wstęgi`, (await p.evaluate(() => window.__petleMysli())) === 0);
    await ctx.close();
  }
  ok('zero błędów konsoli', wyn.bledy.length === 0, wyn.bledy.slice(0, 3).join(' | '));
  await browser.close();
  console.log(JSON.stringify(wyn, null, 1));
})();
