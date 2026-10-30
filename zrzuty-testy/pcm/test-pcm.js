// Weryfikacja scen Pycodemath na stronie. MUTATE=1: dane celowo zepsute, strażnik musi zaświecić na czerwono.
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');
const URL = process.env.TARGET_URL || 'http://localhost:8765/';
const OUT = process.env.PW_ARTIFACT_DIR || __dirname;
const MUT = process.env.MUTATE === '1';
const widths = MUT ? [1280] : [375, 768, 1280, 1920, 2560];
const log = { kroki: 0, zrzuty: 0, bledy: [], gwardia: [], metryki: [] };
const ok = (nazwa, warunek, info = '') => { log.kroki++; log.gwardia.push({ nazwa, ok: !!warunek, info }); };

async function wejdz(browser, w, reduced) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 800 : 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') log.bledy.push(`${w} console: ${m.text()}`); });
  page.on('pageerror', e => log.bledy.push(`${w} pageerror: ${e.message}`));
  page.on('requestfailed', r => log.bledy.push(`${w} requestfailed: ${r.url()}`));
  page.on('response', r => { if (r.status() >= 400) log.bledy.push(`${w} http ${r.status()}: ${r.url()}`); });
  if (MUT) await page.route('**/pycodemath-sceny/dane.json', async route => {
    const d = await (await route.fetch()).json();
    d.regulamin.wiersze.forEach(x => { if (x.n === 5) x.kod = 10; });       // kod "naprawiony" od razu: nie ma czerwonego wiersza
    d.faktura.wiersze.forEach(x => { x.brakuje_gr = 0; x.float = x.dokladnie; }); // faktura zgodna: brak rozjazdu
    route.fulfill({ json: d });
  });
  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(() => document.querySelector('#pycodemath').scrollIntoView({ block: 'start' }));
  await page.waitForSelector('#pcm-s1 svg.wyk path', { timeout: 8000 });
  return { ctx, page };
}
const krok = (page, sel, k) => page.evaluate(([s, k]) => { const i = document.querySelector(s + ' input[type=range]'); i.value = k; i.dispatchEvent(new Event('input', { bubbles: true })); return +i.max; }, [sel, k]);
const tekst = (page, sel) => page.locator(sel).innerText();
async function zrzut(page, sel, nazwa) {
  await page.locator(sel).scrollIntoViewIfNeeded();
  await page.waitForTimeout(450);
  await page.locator(sel).screenshot({ path: path.join(OUT, nazwa + '.png') }); log.zrzuty++;
}

(async () => {
  const browser = await chromium.launch({ headless: process.env.PW_HEADLESS !== 'false' });
  try {
    for (const w of widths) {
      const { ctx, page } = await wejdz(browser, w, false);
      // scena 1
      const n1 = await krok(page, '#pcm-s1', 0);
      await zrzut(page, '#pcm-s1', `${w}-s1-start`);
      await krok(page, '#pcm-s1', Math.round(n1 / 3)); await zrzut(page, '#pcm-s1', `${w}-s1-polowa`);
      await krok(page, '#pcm-s1', n1);
      await page.waitForTimeout(500); await zrzut(page, '#pcm-s1', `${w}-s1-koniec`);
      const t1 = await tekst(page, '#pcm-s1 .liczniki');
      ok(`${w} s1 koniec: cena 15,00 zł i zysk 800,00 zł`, /15,00 zł/.test(t1) && /800,00 zł/.test(t1), t1.replace(/\n/g, ' '));
      // scena 2
      const n2 = await krok(page, '#pcm-s2', 0); await zrzut(page, '#pcm-s2', `${w}-s2-start`);
      await krok(page, '#pcm-s2', 9); await zrzut(page, '#pcm-s2', `${w}-s2-polowa`);
      await krok(page, '#pcm-s2', n2 - 1); await zrzut(page, '#pcm-s2', `${w}-s2-przyczyna`);
      const brak = await tekst(page, '#pcm-s2 .brak strong');
      ok(`${w} s2 po 12 pozycjach brakuje 3 gr`, brak.trim() === '3 gr', brak);
      await krok(page, '#pcm-s2', n2); await zrzut(page, '#pcm-s2', `${w}-s2-koniec`);
      ok(`${w} s2 po poprawce brakuje 0 gr`, (await tekst(page, '#pcm-s2 .brak strong')).trim() === '0 gr');
      // scena 3
      const n3 = await krok(page, '#pcm-s3', 0); await zrzut(page, '#pcm-s3', `${w}-s3-start`);
      await krok(page, '#pcm-s3', 6);
      const zle5 = await page.locator('#pcm-s3 tbody tr.zle').count();
      ok(`${w} s3 przy 5 sztukach wiersz błyska na czerwono`, zle5 === 1, 'wierszy zle=' + zle5);
      await zrzut(page, '#pcm-s3', `${w}-s3-pierwszy-rozjazd`);
      await krok(page, '#pcm-s3', 12); ok(`${w} s3 pigułka OBALONE`, /OBALONE/.test(await tekst(page, '#pcm-s3 [data-r=pig]')));
      await krok(page, '#pcm-s3', n3); await zrzut(page, '#pcm-s3', `${w}-s3-koniec`);
      ok(`${w} s3 po poprawce 0 czerwonych wierszy i DOWIEDZIONE`, (await page.locator('#pcm-s3 tbody tr.zle').count()) === 0 && /DOWIEDZIONE/.test(await tekst(page, '#pcm-s3 [data-r=pig]')));
      // metryki układu
      const m = await page.evaluate(() => {
        const r = document.querySelector('.pcm'), out = { docX: document.documentElement.scrollWidth - innerWidth, sceneX: 0, malyTekst: [], malePrzyciski: [] };
        r.querySelectorAll('.scena').forEach(s => { if (s.scrollWidth > s.clientWidth + 1) out.sceneX++; });
        r.querySelectorAll('h2,h3,p,small,strong,td,th,span,summary,button,label,pre,code').forEach(e => {
          if (!e.offsetParent || !e.childNodes.length) return;
          if (![...e.childNodes].some(c => c.nodeType === 3 && c.textContent.trim())) return;
          const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 14) out.malyTekst.push(e.tagName + ':' + fs);
        });
        r.querySelectorAll('button,input[type=range]').forEach(b => { const q = b.getBoundingClientRect(); if (q.height < 43.5 || q.width < 43.5) out.malePrzyciski.push(b.textContent.trim() + ' ' + Math.round(q.width) + 'x' + Math.round(q.height)); });
        return out;
      });
      log.metryki.push({ w, ...m });
      ok(`${w} brak poziomego przewijania strony`, m.docX <= 0, 'docX=' + m.docX);
      ok(`${w} brak ściśniętych scen (scrollWidth>clientWidth)`, m.sceneX === 0, 'sceneX=' + m.sceneX);
      ok(`${w} tekst >=14 px`, m.malyTekst.length === 0, m.malyTekst.slice(0, 4).join(','));
      ok(`${w} cele dotyku >=44 px`, m.malePrzyciski.length === 0, m.malePrzyciski.join(','));
      await ctx.close();
    }
    if (!MUT) { // reduced-motion: stan końcowy od razu, bez klikania
      const { ctx, page } = await wejdz(browser, 1280, true);
      await page.waitForTimeout(600);
      const kr = await page.locator('#pcm-s3 .krok').innerText();
      ok('reduced-motion: scena 3 od razu w stanie końcowym', /^14 \/ 14$/.test(kr.trim()), kr);
      await zrzut(page, '#pcm-s3', '1280-reduced-s3');
      await ctx.close();
      // odtwarzanie: po Odtwórz krok rośnie sam
      const { ctx: c2, page: p2 } = await wejdz(browser, 1280, false);
      await krok(p2, '#pcm-s3', 0); await p2.click('#pcm-s3 [data-a=od]'); await p2.waitForTimeout(2500);
      const sam = +(await p2.locator('#pcm-s3 input[type=range]').inputValue());
      ok('Od nowa: scena 3 idzie sama (krok > 0 po 2,5 s)', sam > 0, 'krok=' + sam);
      await p2.click('#pcm-s3 [data-a=gra]'); const stop = +(await p2.locator('#pcm-s3 input[type=range]').inputValue()); await p2.waitForTimeout(1500);
      ok('Pauza zatrzymuje scenę', stop === +(await p2.locator('#pcm-s3 input[type=range]').inputValue()), 'krok=' + stop);
      await c2.close();
    }
  } finally { await browser.close(); }
  ok('konsola i sieć: 0 błędów', log.bledy.length === 0, log.bledy.slice(0, 3).join(' | '));
  const czerwone = log.gwardia.filter(g => !g.ok);
  console.log(JSON.stringify({ tryb: MUT ? 'MUTATE (oczekiwane czerwone)' : 'normalny', kroki: log.kroki, zrzuty: log.zrzuty, zielone: log.gwardia.length - czerwone.length, czerwone: czerwone.length, czerwoneLista: czerwone, metryki: log.metryki, bledy: log.bledy }, null, 1));
  fs.writeFileSync(path.join(OUT, MUT ? 'raport-mutate.json' : 'raport.json'), JSON.stringify(log, null, 1));
})();
