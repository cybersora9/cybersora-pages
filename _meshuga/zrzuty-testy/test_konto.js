// Konto cybersory w Meshudze (decyzje maisy 03.11): jedno konto strona + gra + Meshuga, opcjonalne, te same klucze co strona.
// Wybór maisy 03.11: A = profil w pasku (B i przełącznik usunięte). W pliku lokalnym działa udawany serwer (nie cybersora.pl).
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file:///' + path.resolve(process.env.MESHUGA_PLIK || path.join(__dirname, '..', 'meshuga-app.html')).replace(/\\/g, '/');
const OUT = __dirname;
const HASLO = 'tajne-haslo-123';
(async () => {
  const browser = await chromium.launch({ headless: process.env.PW_HEADLESS !== 'false' });
  const wyn = { kroki: 0, zrzuty: 0, bledy: [], sprawdzenia: [] };
  const ok = (n, w, i) => wyn.sprawdzenia.push((w ? 'OK  ' : 'BŁĄD ') + n + (i ? ' · ' + i : ''));
  const zrzut = async (p, n) => { await p.screenshot({ path: path.join(OUT, `konto_${n}.png`) }); wyn.zrzuty++; };
  for (const [w, wariant] of [[1280, 'A'], [768, 'A'], [375, 'A']]) {
    const nazwa = `${wariant}_${w}`;
    const ctx = await browser.newContext({ viewport: { width: w, height: w === 375 ? 780 : 820 } });
    await ctx.addInitScript(v => { try { if (!sessionStorage.getItem('t')) { localStorage.clear(); localStorage.setItem('meshuga.ust', JSON.stringify({ konto: 'B' })); sessionStorage.setItem('t', '1'); } } catch (e) {} }, wariant);
    const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') wyn.bledy.push(nazwa + ': ' + m.text()); });
    p.on('pageerror', e => wyn.bledy.push(nazwa + ' pageerror: ' + e.message));
    await p.goto(URL); await p.waitForTimeout(500); wyn.kroki++;
    const przycisk = async () => p.evaluate(() => { const a = document.querySelector('#kontoBtn'); const vis = e => e && e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none'; return vis(a) ? '#kontoBtn' : null; });
    const otworzPasek = async () => { if (w <= 860 && !(await p.evaluate(() => document.querySelector('#app').classList.contains('szuflada')))) { await p.click('#menuTel'); await p.waitForTimeout(400); } };
    // 0. jedna wersja: bez przełącznika makiety i bez wariantu B (stary zapis ust.konto='B' ignorowany)
    const jedna = await p.evaluate(() => ({ seg: !!document.querySelector('[data-ust="konto"], .makieta, .mak-et'), b: !!document.querySelector('#kontoBtnB, #awatarGora, .konto-gora'), attr: document.querySelector('#app').hasAttribute('data-konto') }));
    ok(`${nazwa} jedna wersja: brak przełącznika KONTO i wariantu B`, !jedna.seg && !jedna.b && !jedna.attr, JSON.stringify(jedna));
    // 1. gość
    if (wariant === 'A') await otworzPasek();
    let sel = await przycisk();
    ok(`${nazwa} przycisk konta widoczny we właściwym miejscu`, sel === '#kontoBtn', sel);
    const gosc = await p.evaluate(() => ({ nick: document.querySelector('#kontoNick') && document.querySelector('#kontoNick').textContent, et: document.querySelector('#kontoBtn').getAttribute('aria-label') }));
    ok(`${nazwa} gość: „Zaloguj się”`, gosc.nick === 'Zaloguj się' && gosc.et === 'Zaloguj się', JSON.stringify(gosc));
    if (!sel) { await ctx.close(); continue; }
    // 2. okno logowania
    await p.click(sel); await p.waitForTimeout(250); wyn.kroki++;
    const okno = await p.evaluate(() => { const o = document.querySelector('#oknoKonto'), d = o && o.querySelector('.okno').getBoundingClientRect(); return { otwarte: o && !o.hidden, mak: !document.querySelector('#kMakieta').hidden, miesci: d && d.left >= 0 && d.right <= innerWidth && d.bottom <= innerHeight, fokus: document.activeElement && document.activeElement.id }; });
    ok(`${nazwa} okno logowania otwarte, mieści się, fokus w polu`, okno.otwarte && okno.miesci && /^k(Nick|Haslo)$/.test(okno.fokus), JSON.stringify(okno));
    ok(`${nazwa} w artefakcie widać napis MAKIETA`, okno.mak);
    const kreska = await p.evaluate(() => getComputedStyle(document.querySelector('#kBlad')).borderLeftColor);
    ok(`${nazwa} pusta linia błędu bez czerwonej kreski`, /rgba\(0, 0, 0, 0\)|transparent/.test(kreska), kreska);
    await zrzut(p, `${nazwa}_okno`);
    // 3. walidacja i rejestracja
    await p.click('#kZakladki button[data-z="rej"]');
    await p.fill('#kNick', 'ab'); await p.fill('#kHaslo', 'x'); await p.click('#kWyslij'); wyn.kroki++;
    ok(`${nazwa} za krótki nick: komunikat`, (await p.textContent('#kBlad')).includes('za krótki'));
    await p.fill('#kNick', 'meshufan'); await p.fill('#kHaslo', 'krotkie'); await p.click('#kWyslij'); wyn.kroki++;
    ok(`${nazwa} za krótkie hasło: komunikat`, (await p.textContent('#kBlad')).includes('min. 8'));
    await p.fill('#kHaslo', HASLO); await p.click('#kWyslij'); await p.waitForTimeout(500); wyn.kroki++;
    const kod = await p.evaluate(() => ({ widac: !document.querySelector('#kKodEkran').hidden, kod: document.querySelector('#kKodPokaz').textContent }));
    ok(`${nazwa} rejestracja: kod odzyskiwania pokazany raz`, kod.widac && /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(kod.kod), kod.kod);
    await zrzut(p, `${nazwa}_kod`);
    await p.click('#kZapisane'); await p.waitForTimeout(250); wyn.kroki++;
    // 4. zalogowany
    const zal = await p.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('dancycloud.sesja') || 'null');
      const wszystko = Object.keys(localStorage).map(k => localStorage.getItem(k)).join('|');
      return { okno: document.querySelector('#oknoKonto').hidden, s, nick: document.querySelector('#kontoNick').textContent, litera: document.querySelector('#awatarPasek').textContent, nickGry: localStorage.getItem('dancycloud.nick'), hasloWLS: wszystko.includes('tajne-haslo-123') };
    });
    ok(`${nazwa} zalogowany: sesja w „dancycloud.sesja” (jak strona), nick w pasku i awatarze`, zal.okno && zal.s && zal.s.nick === 'meshufan' && !!zal.s.token && zal.nick === 'meshufan' && zal.litera === 'm' && zal.nickGry === 'meshufan', JSON.stringify({ nick: zal.nick, litera: zal.litera, s: zal.s && zal.s.nick }));
    ok(`${nazwa} hasło nie trafia do localStorage`, !zal.hasloWLS);
    // 5. panel konta i wylogowanie
    if (wariant === 'A' && w <= 860) await otworzPasek();
    sel = await przycisk();
    await p.click(sel); await p.waitForTimeout(500); wyn.kroki++;
    const pan = await p.evaluate(() => { const e = document.querySelector('#panelKonto'), r = e.getBoundingClientRect(); return { widac: !e.hidden, nick: document.querySelector('#kpNick').textContent, od: document.querySelector('#kpOd').textContent, miesci: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, r: [r.left, r.top, r.right, r.bottom].map(Math.round) }; });
    ok(`${nazwa} panel konta: nick, data, mieści się`, pan.widac && pan.nick === 'meshufan' && /od \d{4}-\d\d-\d\d/.test(pan.od) && pan.miesci, JSON.stringify(pan));
    await zrzut(p, `${nazwa}_panel`);
    await p.click('#wyloguj'); await p.waitForTimeout(300); wyn.kroki++;
    const po = await p.evaluate(() => ({ s: localStorage.getItem('dancycloud.sesja'), nick: document.querySelector('#kontoNick').textContent }));
    ok(`${nazwa} wylogowanie czyści sesję`, po.s === null && po.nick === 'Zaloguj się', JSON.stringify(po));
    // 6. logowanie: złe, zajęty nick, dobre
    if (wariant === 'A' && w <= 860) await otworzPasek();
    await p.click(await przycisk()); await p.waitForTimeout(250);
    await p.fill('#kNick', 'nieistnieje'); await p.fill('#kHaslo', HASLO); await p.click('#kWyslij'); await p.waitForTimeout(450); wyn.kroki++;
    ok(`${nazwa} złe logowanie: „Zły nick albo hasło.”`, (await p.textContent('#kBlad')) === 'Zły nick albo hasło.');
    await p.click('#kZakladki button[data-z="rej"]'); await p.fill('#kNick', 'MeshuFan'); await p.fill('#kHaslo', HASLO); await p.click('#kWyslij'); await p.waitForTimeout(450); wyn.kroki++;
    ok(`${nazwa} zajęty nick (inna wielkość liter): komunikat`, (await p.textContent('#kBlad')).includes('zajęty'));
    await p.click('#kZakladki button[data-z="log"]'); await p.fill('#kNick', 'meshufan'); await p.fill('#kHaslo', HASLO); await p.click('#kWyslij'); await p.waitForTimeout(450); wyn.kroki++;
    const zal2 = await p.evaluate(() => ({ okno: document.querySelector('#oknoKonto').hidden, nick: document.querySelector('#kontoNick').textContent }));
    ok(`${nazwa} dobre logowanie zamyka okno`, zal2.okno && zal2.nick === 'meshufan', JSON.stringify(zal2));
    // 7. Escape zamyka okno
    await p.evaluate(() => { localStorage.removeItem('dancycloud.sesja'); });
    await p.reload(); await p.waitForTimeout(400);
    if (wariant === 'A' && w <= 860) await otworzPasek();
    await p.click(await przycisk()); await p.waitForTimeout(200); await p.keyboard.press('Escape'); await p.waitForTimeout(200); wyn.kroki++;
    ok(`${nazwa} Escape zamyka okno`, await p.evaluate(() => document.querySelector('#oknoKonto').hidden));
    // 8. przyszedł ze strony: sesja + profil z awatarem (te same klucze) → obrazek w awatarze bez logowania
    await p.evaluate(() => {
      const c = document.createElement('canvas'); c.width = c.height = 8; const x = c.getContext('2d'); x.fillStyle = '#e11d33'; x.fillRect(0, 0, 8, 8);
      localStorage.setItem('meshuga-profil', JSON.stringify({ nick: 'meshufan', ava: c.toDataURL('image/png') }));
      localStorage.setItem('dancycloud.sesja', JSON.stringify({ nick: 'meshufan', token: 'makieta.x', waznyDo: new Date(Date.now() + 864e5).toISOString() }));
    });
    await p.reload(); await p.waitForTimeout(400); wyn.kroki++;
    if (wariant === 'A' && w <= 860) await otworzPasek();
    const ze = await p.evaluate(() => ({ img: !!document.querySelector('#awatarPasek img'), nick: document.querySelector('#kontoNick').textContent }));
    ok(`${nazwa} ze strony: awatar z „meshuga-profil” i nick z sesji`, ze.img && ze.nick === 'meshufan', JSON.stringify(ze));
    await zrzut(p, `${nazwa}_zalogowany`);
    // 9. pasek zwinięty (A, szeroki ekran): awatar w środku wąskiej kolumny
    if (wariant === 'A' && w > 860) {
      await p.click('#zwin'); await p.waitForTimeout(500);
      const sr = await p.evaluate(() => { const r = document.querySelector('#awatarPasek').getBoundingClientRect(); return +(r.left + r.width / 2).toFixed(1); });
      ok(`${nazwa} pasek zwinięty: awatar w osi ikon (37,5 px)`, Math.abs(sr - 37.5) <= 1.5, sr + ' px');
      await p.locator('#pasek').screenshot({ path: path.join(OUT, `konto_A_zwiniety.png`) }); wyn.zrzuty++;
    }
    // 10. wygasła sesja = gość
    await p.evaluate(() => localStorage.setItem('dancycloud.sesja', JSON.stringify({ nick: 'meshufan', token: 'x', waznyDo: '2020-01-01T00:00:00Z' })));
    await p.reload(); await p.waitForTimeout(300); wyn.kroki++;
    ok(`${nazwa} wygasła sesja = gość`, await p.evaluate(() => document.querySelector('#kontoNick').textContent === 'Zaloguj się' && localStorage.getItem('dancycloud.sesja') === null));
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(wyn, null, 1));
})();
