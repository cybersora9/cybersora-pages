// Test na żywej cybersora.pl (prawdziwy Worker kont). Konto testowe zakładane i USUWANE na końcu.
const { chromium } = require('playwright');
const path = require('path');
const OUT = __dirname;
const BAZA = 'https://cybersora.pl';
const PYT = 'Ile kosztuje bot na Discorda?';
const NICK = 'mtest_' + Math.random().toString(36).slice(2, 8);
const HASLO = 'Test-' + Math.random().toString(36).slice(2, 12) + '9';
(async () => {
  const browser = await chromium.launch({ headless: process.env.PW_HEADLESS === 'true' });
  const wyn = { kroki: 0, zrzuty: 0, bledy: [], sprawdzenia: [] };
  const ok = (n, w, i) => wyn.sprawdzenia.push((w ? 'OK  ' : 'BŁĄD ') + n + (i ? ' · ' + i : ''));
  const sluchaj = (pg, n) => { pg.on('console', m => { if (m.type() === 'error') wyn.bledy.push(n + ': ' + m.text().slice(0, 160)); }); pg.on('pageerror', e => wyn.bledy.push(n + ' pageerror: ' + e.message)); };

  // 1. droga: strona → kot → pytanie → Czatuj → aplikacja (3 szerokości)
  for (const w of [1280, 768, 375]) {
    const n = 'zywo_' + w;
    const ctx = await browser.newContext({ viewport: { width: w, height: w === 375 ? 780 : 820 } });
    ctx.on('page', pg => sluchaj(pg, n));
    const p = await ctx.newPage();
    await p.goto(BAZA + '/'); await p.waitForTimeout(2000); wyn.kroki++;
    await p.click('.kot__btn'); await p.waitForTimeout(600); wyn.kroki++;
    await p.fill('#kotPanel .kot__in[aria-label="Pytanie do Meshugi"]', PYT);
    const href = await p.getAttribute('.kot__czatuj', 'href');
    ok(`${n} „Czatuj” → /meshuga/?q=`, /^\/meshuga\/\?q=/.test(href || ''), href);
    const [app] = await Promise.all([ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null), p.click('.kot__czatuj', { timeout: 4000 }).catch(() => {})]); wyn.kroki++;
    if (!app) { ok(`${n} aplikacja otwarta`, false); await ctx.close(); continue; }
    await app.waitForLoadState(); await app.waitForTimeout(800);
    await app.waitForFunction(t => [...document.querySelectorAll('#feed .msg-u')].some(e => e.textContent === t), PYT, { timeout: 8000 }).catch(() => {});
    await app.waitForFunction(() => !document.querySelector('#feed .log li:not(.ok)') && document.querySelectorAll('#feed .msg-m .tekst').length > 0, null, { timeout: 12000 }).catch(() => {});
    const s = await app.evaluate(() => ({ adres: location.href, odp: (([...document.querySelectorAll('#feed .msg-m .tekst')].pop()) || {}).textContent || '', karty: document.querySelectorAll('#feed .ak').length, mik: document.querySelector('#mikro').hidden, poziomy: document.documentElement.scrollWidth > innerWidth, sora: document.fonts.check('600 16px Sora') }));
    ok(`${n} aplikacja na cybersora.pl/meshuga/ odpowiada z kartami`, s.adres === BAZA + '/meshuga/' && s.odp.length > 20 && s.karty > 0, JSON.stringify({ adres: s.adres, karty: s.karty }));
    ok(`${n} czcionka Sora, mikrofon schowany, bez poziomego przewijania`, s.sora && s.mik && !s.poziomy, JSON.stringify(s).slice(0, 120));
    await app.screenshot({ path: path.join(OUT, `zywo_${w}_aplikacja.png`) }); wyn.zrzuty++;
    await ctx.close();
  }

  // 2. konto na żywo (1280)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  ctx.on('page', pg => sluchaj(pg, 'konto'));
  const a = await ctx.newPage();
  await a.goto(BAZA + '/meshuga/'); await a.waitForTimeout(1200); wyn.kroki++;
  ok('konto: na cybersora.pl brak napisu MAKIETA (prawdziwy serwer)', await a.evaluate(() => document.querySelector('#kMakieta').hidden));
  await a.click('#kontoBtn'); await a.waitForTimeout(300);
  await a.click('#kZakladki button[data-z="rej"]'); await a.fill('#kNick', NICK); await a.fill('#kHaslo', HASLO); await a.click('#kWyslij'); wyn.kroki++;
  const kod = await a.waitForFunction(() => !document.querySelector('#kKodEkran').hidden && document.querySelector('#kKodPokaz').textContent, null, { timeout: 10000 }).then(h => h.jsonValue(), () => '');
  ok('konto: rejestracja na Workerze, kod odzyskiwania pokazany', !!kod, kod ? 'kod ' + String(kod).length + ' znaków' : (await a.textContent('#kBlad')));
  await a.screenshot({ path: path.join(OUT, 'zywo_konto_kod.png') }); wyn.zrzuty++;
  if (kod) {
    await a.click('#kZapisane'); await a.waitForTimeout(400);
    const ses = await a.evaluate(() => JSON.parse(localStorage.getItem('dancycloud.sesja') || 'null'));
    ok('konto: sesja w „dancycloud.sesja”', ses && ses.nick === NICK && !!ses.token);
    // strona główna widzi tę samą sesję (ta sama domena)
    const st = await ctx.newPage(); await st.goto(BAZA + '/'); await st.waitForTimeout(1500); wyn.kroki++;
    const naStronie = await st.evaluate(() => (JSON.parse(localStorage.getItem('dancycloud.sesja') || 'null') || {}).nick);
    ok('konto: strona główna widzi tę samą sesję', naStronie === NICK, naStronie);
    const ja = await st.evaluate(async t => { const r = await fetch('https://dancycloud-ranking.dancycloud-ranking.workers.dev/konto', { headers: { Authorization: 'Bearer ' + t } }); return r.status; }, ses.token);
    ok('konto: token ze strony działa na Workerze (GET /konto 200)', ja === 200, ja);
    await st.close();
    await a.reload(); await a.waitForTimeout(800);
    ok('konto: aplikacja po odświeżeniu pokazuje nick', (await a.textContent('#kontoNick')) === NICK);
    await a.screenshot({ path: path.join(OUT, 'zywo_konto_zalogowany.png') }); wyn.zrzuty++;
    // wylogowanie
    await a.click('#kontoBtn'); await a.waitForTimeout(700);
    ok('konto: panel z datą z serwera', /od \d{4}-\d\d-\d\d/.test(await a.textContent('#kpOd')), await a.textContent('#kpOd'));
    await a.click('#wyloguj'); await a.waitForTimeout(1200); wyn.kroki++;
    const po = await a.evaluate(async t => ({ s: localStorage.getItem('dancycloud.sesja'), st: (await fetch('https://dancycloud-ranking.dancycloud-ranking.workers.dev/konto', { headers: { Authorization: 'Bearer ' + t } })).status }), ses.token);
    ok('konto: wylogowanie czyści sesję i unieważnia token (401)', po.s === null && po.st === 401, JSON.stringify(po));
    // ponowne logowanie i usunięcie konta
    await a.click('#kontoBtn'); await a.waitForTimeout(300);
    await a.fill('#kNick', NICK); await a.fill('#kHaslo', HASLO); await a.click('#kWyslij'); wyn.kroki++;
    await a.waitForFunction(() => document.querySelector('#oknoKonto').hidden, null, { timeout: 10000 }).catch(() => {});
    ok('konto: ponowne logowanie', (await a.textContent('#kontoNick')) === NICK);
    const del = await a.evaluate(async h => { const s = JSON.parse(localStorage.getItem('dancycloud.sesja')); const r = await fetch('https://dancycloud-ranking.dancycloud-ranking.workers.dev/konto', { method: 'DELETE', headers: { Authorization: 'Bearer ' + s.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ haslo: h }) }); return r.status; }, HASLO);
    const znowu = await a.evaluate(async d => (await fetch('https://dancycloud-ranking.dancycloud-ranking.workers.dev/konto/logowanie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })).status, { nick: NICK, haslo: HASLO });
    ok('konto: testowe konto usunięte (logowanie potem 401)', del >= 200 && del < 300 && znowu === 401, 'DELETE ' + del + ' · logowanie ' + znowu);
    wyn.konto = { nick: NICK, usuniete: znowu === 401 };
  }
  await ctx.close();
  await browser.close();
  console.log(JSON.stringify(wyn, null, 1));
})();
