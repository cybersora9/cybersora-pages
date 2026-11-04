// Test v1.5: „Oceń mój zrzut” — wybór pliku, upuszczenie, wysłanie z obrazem, historia, błędy i brak obrazków.
// window.claude jest podstawiony (makieta sample), bo prawdziwy działa tylko w claude.ai.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const URL = require('url').pathToFileURL(path.resolve(__dirname, '..', 'meshuga-app.html')).href;
const OUT = process.env.MESHUGA_ZRZUTY || path.join(__dirname, 'wyniki');
require('fs').mkdirSync(OUT, { recursive: true });
const OBRAZ = fs.readFileSync(path.join(OUT, 'v4_1280_kalkulator.png'));
const ODP = 'Trzy rzeczy na start:\n• Przycisk „Wyślij ten zestaw” ginie obok dwóch innych.\n• Suma jest daleko od zaznaczonych pozycji.\n• Na telefonie karta jest bardzo wysoka.\n\nPełny darmowy skan widoczności sprawdzi resztę. [[KARTA:audyt]]';

function makieta(tryb) {
  // tryb: 'obrazki' | 'bez-obrazkow' | 'odrzuca'
  return `(() => {
    window.__wywolania = [];
    const fake = async (input, opts) => {
      const ost = input[input.length - 1].content;
      window.__wywolania.push({ obrazy: opts.images ? opts.images.length : 0, typ: opts.images ? opts.images[0].type : null, tier: opts.modelTier, cache: opts.cache, ost: ost.slice(-400), tury: input.length, calosc: input.map(t => t.content).join('\\n---\\n').slice(-3000) });
      await new Promise(r => setTimeout(r, 400));
      if (${JSON.stringify(tryb)} === 'odrzuca' && opts.images) throw { code: 'image_rejected', message: 'test' };
      const t = opts.images ? ${JSON.stringify(ODP)} : 'Jasne, mogę doradzić dalej. [[KARTA:audyt]]';
      opts.onText({ text: t, delta: t });
      return { text: t, truncated: false, modelTierApplied: opts.modelTier || 'default' };
    };
    fake.limits = async () => (${JSON.stringify(tryb)} === 'bez-obrazkow' ? { maxPromptBytes: 262144 } : { maxPromptBytes: 262144, images: { maxCount: 1, maxInputBytes: 5242880, mediaTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] } });
    window.claude = { use: async n => n === 'sample' ? fake : null };
  })();`;
}

(async () => {
  const browser = await chromium.launch({ headless: process.env.PW_HEADLESS !== 'false' });
  const wyn = { kroki: 0, zrzuty: 0, bledy: [], sprawdzenia: [] };
  const ok = (nazwa, warunek, info) => { wyn.sprawdzenia.push((warunek ? 'OK  ' : 'BŁĄD ') + nazwa + (info ? ' · ' + info : '')); };
  const strona = async (w, tryb) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: w === 375 ? 780 : 820 } });
    if (tryb) await ctx.addInitScript(makieta(tryb));
    const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') wyn.bledy.push(w + '/' + tryb + ': ' + m.text()); });
    p.on('pageerror', e => wyn.bledy.push(w + '/' + tryb + ' pageerror: ' + e.message));
    await p.goto(URL); await p.waitForTimeout(700); wyn.kroki++;
    return { ctx, p };
  };
  const overflow = p => p.evaluate(() => document.documentElement.scrollWidth > innerWidth);

  for (const w of [1280, 375]) {
    const { ctx, p } = await strona(w, 'obrazki');
    const shot = async n => { await p.screenshot({ path: path.join(OUT, `v5_${w}_${n}.png`) }); wyn.zrzuty++; };
    ok(w + ' plus aktywny', !(await p.locator('#plus.brak').count()));
    ok(w + ' accept z limits()', (await p.getAttribute('#plik', 'accept')) === 'image/png,image/jpeg,image/webp,image/gif');

    // 1. wybór pliku → chip, przycisk wyślij aktywny przy pustym polu
    await p.setInputFiles('#plik', { name: 'moja-strona.png', mimeType: 'image/png', buffer: OBRAZ }); await p.waitForTimeout(200); wyn.kroki++;
    ok(w + ' chip widoczny', await p.locator('#zal').isVisible(), await p.textContent('#zalInfo'));
    ok(w + ' miniatura', await p.evaluate(() => { const i = document.querySelector('#zalImg'); return i.complete && i.naturalWidth > 0; }));
    ok(w + ' wyślij bez tekstu', await p.isEnabled('#wyslij'));
    ok(w + ' brak wystawania (chip)', !(await overflow(p)));
    await shot('chip');

    // 2. wysłanie
    await p.click('#wyslij'); await p.waitForTimeout(120); wyn.kroki++;
    ok(w + ' „Oglądam zrzut…”', (await p.locator('.oglad').count()) === 1);
    await p.waitForSelector('.ak-karty .ak', { timeout: 5000 }).catch(() => {}); await p.waitForTimeout(250);
    const c1 = await p.evaluate(() => window.__wywolania[0]);
    ok(w + ' obraz w wywołaniu', c1 && c1.obrazy === 1 && c1.typ === 'image/png', JSON.stringify({ obrazy: c1 && c1.obrazy, typ: c1 && c1.typ }));
    ok(w + ' tryb dokładny + cache:false', c1 && c1.tier === 'default' && c1.cache === false);
    ok(w + ' instrukcja oceny w ostatniej turze', c1 && /Oceń mój zrzut\.\n\nDo tej wiadomości[\s\S]*dokładnie 3 rzeczy/.test(c1.calosc) && /Oceń mój zrzut\./.test(c1.calosc));
    ok(w + ' karta audytu', (await p.locator('.ak-karty').last().textContent()).includes('Skan widoczności'));
    ok(w + ' 3 punkty', (await p.locator('.msg-m').last().locator('.tekst li').count()) === 3);
    const log = await p.locator('.msg-m').last().locator('.log').textContent();
    ok(w + ' log: zrzut → KB', /zrzut → \d+ KB/.test(log) && /ocena zrzutu/.test(log), log.replace(/\s+/g, ' ').slice(0, 140));
    ok(w + ' etykieta w wiadomości', /zrzut · moja-strona\.png, \d+ KB/.test(await p.locator('.msg-u').last().textContent()));
    ok(w + ' chip zniknął', await p.locator('#zal').isHidden());
    ok(w + ' brak wystawania (ocena)', !(await overflow(p)));
    await shot('ocena');

    // 3. dalsza rozmowa: obraz nie leci drugi raz, w historii zostaje opis
    await p.fill('#wpis', 'A co z telefonem?'); await p.keyboard.press('Enter'); await p.waitForTimeout(900); wyn.kroki++;
    const c2 = await p.evaluate(() => window.__wywolania[1]);
    ok(w + ' kolejna tura bez obrazu', c2 && c2.obrazy === 0 && /\[wcześniej dołączony zrzut: moja-strona\.png/.test(c2.calosc) && !/dokładnie 3 rzeczy/.test(c2.calosc));

    // 4. zły typ pliku
    await p.setInputFiles('#plik', { name: 'notatki.txt', mimeType: 'text/plain', buffer: Buffer.from('abc') }); await p.waitForTimeout(150); wyn.kroki++;
    ok(w + ' odrzuca .txt', await p.locator('#zal').isHidden() && /nie obrazek/.test(await p.textContent('#stopka')));

    // 5. upuszczenie obrazka na pole
    await p.evaluate(b64 => {
      const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      const dt = new DataTransfer(); dt.items.add(new File([u], 'upuszczony.png', { type: 'image/png' }));
      const pole = document.querySelector('#pole');
      pole.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
      window.__ramka = pole.classList.contains('upuszczam');
      pole.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    }, OBRAZ.toString('base64')); await p.waitForTimeout(150); wyn.kroki++;
    ok(w + ' upuszczenie → chip', await p.locator('#zal').isVisible() && (await p.textContent('#zalNazwa')) === 'upuszczony.png' && await p.evaluate(() => window.__ramka));
    await p.click('#zalUsun'); wyn.kroki++;
    ok(w + ' usuń zrzut', await p.locator('#zal').isHidden() && !(await p.isEnabled('#wyslij')));

    // 6. historia po przeładowaniu
    await p.reload(); await p.waitForTimeout(700); wyn.kroki++;
    if (w === 375) { await p.click('#menuTel'); await p.waitForTimeout(400); }
    await p.locator('#historia .poz', { hasText: 'Oceń mój zrzut' }).first().click(); await p.waitForTimeout(250);
    ok(w + ' zrzut w historii', /zrzut · moja-strona\.png/.test(await p.locator('.msg-u').first().textContent()));
    await ctx.close();
  }

  // 7. widok bez obrazków (limits bez images)
  {
    const { ctx, p } = await strona(1280, 'bez-obrazkow');
    ok('bez-obrazków: plus przygaszony', (await p.locator('#plus.brak').count()) === 1);
    await p.click('#plus'); wyn.kroki++;
    ok('bez-obrazków: podpowiedź', /nie mogę oglądać obrazków/.test(await p.textContent('#stopka')));
    await ctx.close();
  }
  // 8. model odrzuca obrazek
  {
    const { ctx, p } = await strona(1280, 'odrzuca');
    await p.setInputFiles('#plik', { name: 'zly.png', mimeType: 'image/png', buffer: OBRAZ }); await p.click('#wyslij'); await p.waitForTimeout(900); wyn.kroki += 2;
    ok('image_rejected: komunikat', /Tego obrazka nie przeczytam/.test(await p.locator('.msg-m .blad').last().textContent()) && (await p.locator('.oglad').count()) === 0);
    await p.screenshot({ path: path.join(OUT, 'v5_1280_odrzucony.png') }); wyn.zrzuty++;
    await ctx.close();
  }
  // 9. tryb pokazowy (bez window.claude)
  {
    const { ctx, p } = await strona(1280, null);
    ok('pokazowy: plus przygaszony', (await p.locator('#plus.brak').count()) === 1);
    await p.click('#plus'); wyn.kroki++;
    ok('pokazowy: podpowiedź', /trybie pokazowym/.test(await p.textContent('#stopka')));
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(wyn, null, 1));
})();
