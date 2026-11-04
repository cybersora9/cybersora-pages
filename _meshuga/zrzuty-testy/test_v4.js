// Test v1.4: komendy /, kalkulator na telefonie, brief w 5 pytaniach, Ctrl+K, mikrofon, historia.
const { chromium } = require('playwright');
const path = require('path');
const URL = require('url').pathToFileURL(path.resolve(__dirname, '..', 'meshuga-app.html')).href;
const OUT = process.env.MESHUGA_ZRZUTY || path.join(__dirname, 'wyniki');
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: process.env.PW_HEADLESS !== 'false' });
  const wyn = { kroki: 0, zrzuty: 0, bledy: [], sprawdzenia: [] };
  const ok = (nazwa, warunek, info) => { wyn.sprawdzenia.push((warunek ? 'OK  ' : 'BŁĄD ') + nazwa + (info ? ' · ' + info : '')); };
  for (const w of [1280, 375]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w === 375 ? 780 : 820 } });
    const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') wyn.bledy.push(w + ': ' + m.text()); });
    p.on('pageerror', e => wyn.bledy.push(w + ' pageerror: ' + e.message));
    await p.goto(URL); await p.waitForTimeout(600); wyn.kroki++;
    const shot = async n => { await p.screenshot({ path: path.join(OUT, `v4_${w}_${n}.png`) }); wyn.zrzuty++; };
    const overflow = async () => p.evaluate(() => document.documentElement.scrollWidth > innerWidth || [...document.querySelectorAll('.ak')].some(e => e.getBoundingClientRect().right > innerWidth + 1));

    // 1. „/” pokazuje 5 komend
    await p.click('#wpis'); await p.keyboard.type('/'); wyn.kroki++;
    ok(w + ' podpowiedzi po /', await p.locator('#slash button').count() === 5);
    if (w === 1280) await shot('komendy');
    // filtr + Esc
    await p.keyboard.type('p'); ok(w + ' filtr /p', await p.locator('#slash button').count() === 1);
    await p.keyboard.press('Escape'); ok(w + ' Esc zamyka', await p.locator('#slash').isHidden()); wyn.kroki += 2;
    await p.fill('#wpis', '');
    // 2. /cena przez strzałki: / → ↓? pierwsza to /cena → Enter
    await p.keyboard.type('/'); await p.keyboard.press('Enter'); await p.waitForTimeout(200); wyn.kroki++;
    ok(w + ' /cena → kalkulator', await p.locator('.kalk').count() === 1);
    await p.click('.kalk button[data-id="bot"]'); await p.click('.kalk button[data-id="pelny"]'); wyn.kroki += 2;
    const suma = await p.textContent('.kalk .suma b'), term = await p.textContent('.kalk .suma span');
    ok(w + ' suma bot+pełny', suma.replace(/\s/g, ' ') === 'od 2 190 zł', suma + ' · ' + term);
    if (w === 375) {
      const rzedy = await p.evaluate(() => { const b = [...document.querySelectorAll('.kalk .opcje')][0].querySelectorAll('button'); return new Set([...b].map(x => Math.round(x.getBoundingClientRect().top))).size; });
      ok('375 kalkulator 2 w wierszu', rzedy === 2, 'wiersze typów: ' + rzedy);
      const h = await p.evaluate(() => Math.round(document.querySelector('.kalk').getBoundingClientRect().height));
      ok('375 wysokość karty', h < 640, h + ' px (v1.3: jedna pozycja w wierszu)');
    }
    await p.locator('.kalk').scrollIntoViewIfNeeded(); await shot('kalkulator');
    ok(w + ' brak wystawania (kalk)', !(await overflow()));
    // 3. Dodaj do briefu → brief startuje z wyceną
    await p.click('.kalk [data-a="brief"]'); await p.waitForTimeout(150); wyn.kroki++;
    ok(w + ' brief start', (await p.locator('.krok-brief').last().textContent()) === 'BRIEF · 1/5');
    const odp = ['Zapisy klientek na wizyty przez stronę', 'Klientki i recepcja', 'Zeszyt i telefon', 'pomiń', 'nie wiem'];
    for (const a of odp) { await p.fill('#wpis', a); await p.keyboard.press('Enter'); await p.waitForTimeout(120); wyn.kroki++; }
    ok(w + ' karta briefu', await p.locator('.brief').count() === 1);
    const pola = await p.evaluate(() => [...document.querySelectorAll('.brief textarea')].map(t => t.value));
    ok(w + ' pola briefu', pola[0] === odp[0] && pola[3] === '' && /Bot/.test(pola[5]) && /2 190/.test(pola[5]), JSON.stringify(pola).slice(0, 160));
    ok(w + ' numer CS-xxxx', /^BRIEF #CS-\d{4}$/.test(await p.textContent('.brief .kod')));
    await p.locator('.brief').scrollIntoViewIfNeeded(); await shot('brief');
    ok(w + ' brak wystawania (brief)', !(await overflow()));
    // 4. Ctrl+K
    await p.click('body', { position: { x: 5, y: 300 } }).catch(() => {});
    await p.keyboard.press('Control+k'); await p.waitForTimeout(100); wyn.kroki++;
    ok(w + ' Ctrl+K', (await p.inputValue('#wpis')) === '/' && await p.locator('#slash').isVisible() && await p.evaluate(() => document.activeElement.id === 'wpis'));
    await p.keyboard.press('Escape'); await p.fill('#wpis', '');
    // 5. mikrofon
    const maSR = await p.evaluate(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition));
    await p.click('#mikro'); await p.waitForTimeout(700); wyn.kroki++;
    const stan = await p.evaluate(() => ({ pressed: document.querySelector('#mikro').getAttribute('aria-pressed'), stopka: document.querySelector('#stopka').textContent, slucha: !!document.querySelector('.mk-slucha') }));
    ok(w + ' mikrofon reaguje', true, 'API: ' + maSR + ' · pressed=' + stan.pressed + ' · slucha=' + stan.slucha + ' · „' + stan.stopka.slice(0, 70) + '”');
    if (stan.pressed === 'true') { await p.click('#mikro'); await p.waitForTimeout(300); }
    // 6. historia po przeładowaniu
    await p.reload(); await p.waitForTimeout(600); wyn.kroki++;
    if (w === 375) { await p.click('#menuTel'); await p.waitForTimeout(400); }
    await p.locator('#historia .poz', { hasText: 'Wycena z kalkulatora' }).first().click(); await p.waitForTimeout(200);
    ok(w + ' brief w historii', await p.locator('.brief').count() === 1 && await p.locator('.krok-brief').count() === 5 && await p.locator('.log summary').count() >= 7);
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(wyn, null, 1));
})();
