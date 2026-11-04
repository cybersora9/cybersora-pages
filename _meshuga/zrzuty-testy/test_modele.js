// Modele Meshugi (wybór maisy 04.11: wariant C, Astral = szybki, Pycode = myśli; ikony Astral 1 gwiazda, Pycode 1 </>).
// Pusty ekran: dwie karty modeli; w rozmowie pigułka w polu przełącza model; Pycode pokazuje „Pycode myśli · N s”;
// odpowiedź z kodem = blok kodu z przyciskiem „Kopiuj”. Aplikacja w trybie pokazowym (bez sample).
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file:///' + path.resolve(process.env.MESHUGA_PLIK || path.join(__dirname, '..', 'meshuga-app.html')).replace(/\\/g, '/');
const OUT = __dirname;
(async () => {
  const browser = await chromium.launch({ headless: process.env.PW_HEADLESS !== 'false' });
  const wyn = { kroki: 0, zrzuty: 0, bledy: [], sprawdzenia: [] };
  const ok = (n, w, i) => wyn.sprawdzenia.push((w ? 'OK  ' : 'BŁĄD ') + n + (i ? ' · ' + i : ''));
  for (const w of [1280, 375]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w === 375 ? 780 : 820 } });
    const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') wyn.bledy.push(w + ': ' + m.text()); });
    p.on('pageerror', e => wyn.bledy.push(w + ' pageerror: ' + e.message));
    await p.goto(URL); await p.waitForTimeout(800); wyn.kroki++;
    const pusty = () => p.evaluate(() => {
      const R = e => e && e.getBoundingClientRect(), nach = (a, b) => a && b && !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
      const k = [...document.querySelectorAll('.mdl-karta')].filter(e => e.offsetParent);
      const pig = document.querySelector('#trybBtn');
      const pole = R(document.querySelector('#pole')), karty = R(document.querySelector('#karty'));
      return {
        karty: k.map(e => e.querySelector('b').textContent + (e.getAttribute('aria-checked') === 'true' ? '*' : '')),
        ikony: k.map(e => e.querySelector('svg use') ? e.querySelector('svg use').getAttribute('href') : ''),
        pig: pig ? pig.textContent.trim() : '', info: (document.querySelector('#trybInfo') || {}).textContent || '',
        staryMenu: !!document.querySelector('#trybMenu'),
        uciete: k.some(e => { const b = e.querySelector('b'); return b.scrollWidth > b.clientWidth + 1; }),
        nachodzi: k.some(e => nach(R(e), pole) || nach(R(e), karty)), poza: k.some(e => R(e).bottom > innerHeight || R(e).left < 0 || R(e).right > innerWidth),
        poziomy: document.documentElement.scrollWidth > innerWidth
      };
    });
    let s = await pusty();
    ok(`${w} pusty ekran: karty Astral (wybrany) i Pycode`, s.karty.join() === 'Astral*,Pycode', s.karty.join());
    ok(`${w} ikony: Astral gwiazda, Pycode </>`, s.ikony.join() === '#mdlAstral,#mdlPycode', s.ikony.join());
    ok(`${w} pigułka w polu = Astral, nagłówek MESHUGA · ASTRAL`, s.pig === 'Astral' && s.info === 'MESHUGA · ASTRAL', s.pig + ' / ' + s.info);
    ok(`${w} stare menu Szybki/Dokładny usunięte`, !s.staryMenu);
    ok(`${w} karty modeli nie nachodzą na pole i karty startowe, mieszczą się`, !s.nachodzi && !s.poza && !s.poziomy, JSON.stringify({ n: s.nachodzi, p: s.poza, h: s.poziomy }));
    ok(`${w} nazwy modeli widoczne w całości (bez „…”)`, !s.uciete);
    await p.screenshot({ path: path.join(OUT, `modele_${w}_pusty.png`) }); wyn.zrzuty++;
    // wybór Pycode kartą, zapamiętany po przeładowaniu
    await p.click('.mdl-karta[data-tryb="default"]').catch(() => {}); await p.waitForTimeout(250); wyn.kroki++;
    await p.reload(); await p.waitForTimeout(700); wyn.kroki++;
    s = await pusty();
    ok(`${w} Pycode zapamiętany po przeładowaniu`, s.karty.join() === 'Astral,Pycode*' && s.pig === 'Pycode', s.karty.join() + ' / ' + s.pig);
    // pytanie z Pycode: „Pycode myśli · N s”
    await p.fill('#wpis', 'Jak policzyć średnią w Pythonie?').catch(() => {}); await p.press('#wpis', 'Enter').catch(() => {});
    await p.waitForTimeout(350); wyn.kroki++;
    const mysli = await p.evaluate(() => { const e = document.querySelector('#feed .mdl-mysli'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; });
    // 04.11 (sesja 8): zamiast „Pycode myśli” etap myślenia + sekundy, a wokół awatara wstęga
    ok(`${w} Pycode: etap myślenia „czytam pytanie · N s” przed odpowiedzią`, /^czytam pytanie ?· \d+ s$/.test(mysli), mysli);
    const wst = await p.evaluate(() => { const a = [...document.querySelectorAll('#feed .mk')].pop(); return { kl: a.classList.contains('mk-mysli'), plotna: a.querySelectorAll('canvas.mk-mysl').length }; });
    ok(`${w} Pycode: wstęga myśli wokół awatara (2 płótna)`, wst.kl && wst.plotna === 2, JSON.stringify(wst));
    if (w === 1280) { await p.locator('#feed').screenshot({ path: path.join(OUT, `modele_${w}_mysli.png`) }); wyn.zrzuty++; }
    await p.waitForFunction(() => !document.querySelector('#feed .log li:not(.ok)'), null, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(300); wyn.kroki++;
    const kod = await p.evaluate(() => {
      const b = document.querySelector('#feed .kodblok'); if (!b) return null;
      return { jez: b.querySelector('.kodbar span').textContent, kod: b.querySelector('pre code').textContent, kopiuj: !!b.querySelector('.kod-kopiuj'), mysliZostalo: !!document.querySelector('#feed .mdl-mysli'), poziomy: document.documentElement.scrollWidth > innerWidth };
    });
    ok(`${w} odpowiedź z blokiem kodu (python) i przyciskiem Kopiuj`, kod && /python/i.test(kod.jez) && /sum\(liczby\) \/ len\(liczby\)/.test(kod.kod) && kod.kopiuj && !kod.mysliZostalo && !kod.poziomy, JSON.stringify(kod));
    await p.screenshot({ path: path.join(OUT, `modele_${w}_kod.png`) }); wyn.zrzuty++;
    // w rozmowie: pigułka przełącza model; Astral bez „myśli”
    await p.click('#trybBtn').catch(() => {}); await p.waitForTimeout(250); wyn.kroki++;
    const po = await p.evaluate(() => ({ pig: document.querySelector('#trybBtn').textContent.trim(), ust: JSON.parse(localStorage.getItem('meshuga.ust') || '{}').tryb, label: document.querySelector('#trybBtn').getAttribute('aria-label') }));
    ok(`${w} pigułka przełącza na Astral (i opisuje, na co przełączy)`, po.pig === 'Astral' && po.ust === 'quick' && /Pycode/.test(po.label || ''), JSON.stringify(po));
    await p.fill('#wpis', 'Ile kosztuje bot?'); await p.press('#wpis', 'Enter'); await p.waitForTimeout(350); wyn.kroki++;
    const etA = await p.evaluate(() => { const e = [...document.querySelectorAll('#feed .mdl-mysli .et')].pop(); return e ? e.textContent : ''; });
    ok(`${w} Astral: też myśli do pierwszego słowa (etap z tematu rozmowy)`, /czytam pytanie|przypominam sobie rozmowę/.test(etA), etA);
    await p.waitForTimeout(2600); wyn.kroki++;
    const etA2 = await p.evaluate(() => ({ et: (document.querySelector('#feed .mdl-mysli .et') || {}).textContent || '', plyn: [...document.querySelectorAll('#feed .mk')].pop().classList.contains('mk-mysli') }));
    ok(`${w} Astral: po odpowiedzi wskaźnik i wstęga znikają`, !etA2.et && !etA2.plyn, JSON.stringify(etA2));
    await p.waitForTimeout(2500);
    await p.screenshot({ path: path.join(OUT, `modele_${w}_rozmowa.png`) }); wyn.zrzuty++;
    await ctx.close();
  }
  ok('zero błędów konsoli', wyn.bledy.length === 0, wyn.bledy.slice(0, 3).join(' | '));
  await browser.close();
  console.log(JSON.stringify(wyn, null, 1));
})();
