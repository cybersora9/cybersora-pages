// Święta (1.11–6.01, wybór maisy 03.11, choinka usunięta 04.11): latające płatki omijające kota, śnieg z kodu w tle,
// napis pod powitaniem; ikony kart z Recraft (wektor). Data podstawiona: 3 listopada (sezon) i 3 marca (poza sezonem).
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file:///' + path.resolve(process.env.MESHUGA_PLIK || path.join(__dirname, '..', 'meshuga-app.html')).replace(/\\/g, '/');
const OUT = __dirname;
const DATA = t => `(() => { const T = ${t}, D = Date, p0 = performance.now();
  class F extends D { constructor(...a) { super(...(a.length ? a : [T + performance.now() - p0])); } static now() { return T + performance.now() - p0; } }
  window.Date = F; })();`;
const LISTOPAD = Date.UTC(2026, 10, 3, 12), MARZEC = Date.UTC(2027, 2, 3, 12);
(async () => {
  const browser = await chromium.launch({ headless: process.env.PW_HEADLESS !== 'false' });
  const wyn = { kroki: 0, zrzuty: 0, bledy: [], sprawdzenia: [] };
  const ok = (n, w, i) => wyn.sprawdzenia.push((w ? 'OK  ' : 'BŁĄD ') + n + (i ? ' · ' + i : ''));
  const przypadki = [
    { w: 1280, motyw: 'dark', sezon: true }, { w: 1280, motyw: 'light', sezon: true }, { w: 1000, motyw: 'dark', sezon: true }, { w: 768, motyw: 'dark', sezon: true },
    { w: 375, motyw: 'dark', sezon: true }, { w: 1280, motyw: 'dark', sezon: false }, { w: 375, motyw: 'dark', sezon: false }
  ];
  for (const { w, motyw, sezon } of przypadki) {
    const nazwa = `${sezon ? 'swieta' : 'marzec'}_${w}_${motyw}`;
    const ctx = await browser.newContext({ viewport: { width: w, height: w === 375 ? 780 : 820 } });
    await ctx.addInitScript(DATA(sezon ? LISTOPAD : MARZEC));
    await ctx.addInitScript(m => { try { localStorage.setItem('meshuga.ust', JSON.stringify({ motyw: m, choinka: 'B' })); } catch (e) {} }, motyw);
    const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') wyn.bledy.push(nazwa + ': ' + m.text()); });
    p.on('pageerror', e => wyn.bledy.push(nazwa + ' pageerror: ' + e.message));
    await p.goto(URL); await p.waitForTimeout(800); wyn.kroki++;
    const m = await p.evaluate(() => {
      const R = e => e.getBoundingClientRect(), nach = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
      const kot = R(document.querySelector('#kotHero'));
      const ch = [...document.querySelectorAll('.choinka')].map(R);
      const ozdoby = ch;
      const lot = [...document.querySelectorAll('.platki-lot .platek-lot')];
      const glowny = R(document.querySelector('.glowny'));
      const srodki = lot.map(e => { const r = R(e); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      const kolory = [...new Set(lot.map(e => e.getAttribute('class').split(' ').find(c => c.startsWith('k-'))))];
      const kb = document.querySelector('.k-bialy');
      const ramBialy = kb ? getComputedStyle(kb).getPropertyValue('--p-ram').trim() === getComputedStyle(kb).getPropertyValue('--fg').trim() : false;
      const symbol = !!document.querySelector('#platekSym path');
      const napis = document.querySelector('#swietaNapis');
      const h1 = R(document.querySelector('#powitanie')), pole = R(document.querySelector('.pole-wrap')), karty = R(document.querySelector('#karty'));
      const nr = napis && !napis.hidden ? R(napis) : null;
      const cv = document.querySelector('#tlo canvas');
      let jasne = 0; if (cv) { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; for (let i = 3; i < d.length; i += 64) if (d[i] > 30) jasne++; }
      const ik = [...document.querySelectorAll('#karty .karta .ik svg')];
      const ikR = ik.map(s => R(s));
      return {
        choinki: ch.length, platki: lot.length, kolory, ramBialy, symbol,
        choinkaZPrawej: ch.length === 1 ? ch[0].left >= kot.right : null,
        rozrzut: srodki.length ? Math.round((Math.max(...srodki.map(s => s.x)) - Math.min(...srodki.map(s => s.x))) / glowny.width * 100) + '% szer. · ' + Math.round((Math.max(...srodki.map(s => s.y)) - Math.min(...srodki.map(s => s.y))) / glowny.height * 100) + '% wys.' : '',
        rozrzutOk: srodki.length >= 4 && (Math.max(...srodki.map(s => s.x)) - Math.min(...srodki.map(s => s.x))) > glowny.width * .4,
        ozdobyNaKota: ozdoby.some(c => nach(c, kot)), ozdobyNaH1: ozdoby.some(c => nach(c, h1)),
        pozaEkranem: ozdoby.some(c => c.left < glowny.left || c.right > innerWidth || c.top < R(document.querySelector('#przewijak')).top),
        wym: 'choinka ' + ch.map(c => Math.round(c.width) + '×' + Math.round(c.height)).join() + ' · kot ' + Math.round(kot.height),
        napis: nr ? napis.textContent.trim() : null, napisPodH1: nr ? nr.top >= h1.bottom : null,
        napisZaslonieta: nr ? nach(nr, pole) || nach(nr, karty) || nr.bottom > R(document.querySelector('#przewijak')).bottom + 0.5 : null,
        tlo: cv ? cv.className : 'brak', jasne,
        ikony: ik.length, ikonyWektor: ik.every(s => s.querySelector('mask use[href="#ikZestaw"]')) && !!document.querySelector('#ikZestaw path'),
        ikonyWidoczne: ikR.filter(r => r.width > 0).length, ikonyKolor: ik.length ? getComputedStyle(ik[0]).color : '',
        makieta: !!document.querySelector('[data-ust="choinka"]'), makietaWidoczna: !!document.querySelector('#makieta') && !document.querySelector('#makieta').hidden, poziomy: document.documentElement.scrollWidth > innerWidth
      };
    });
    if (sezon) {
      // decyzja maisy 04.11: choinka koło kota usunięta (strażnik: w sezonie zero choinek)
      ok(`${nazwa} bez choinki koło kota (decyzja 04.11)`, m.choinki === 0, m.wym);
      ok(`${nazwa} latające płatki: ≥4, rozrzucone po ekranie`, m.platki >= 4 && m.rozrzutOk, m.platki + ' płatków · ' + m.rozrzut);
      ok(`${nazwa} 4 kolory płatków (czerwony, biały, czerwono-biały, biało-czerwony)`, m.kolory.length === 4 && m.symbol && m.ramBialy, m.kolory.join(' '));
      ok(`${nazwa} brak przełącznika PŁATKI (wybrany opad)`, !(await p.evaluate(() => !!document.querySelector('[data-ust="platki"], #makieta'))));
      for (const tr of ['B']) {
        const poz = () => p.evaluate(() => [...document.querySelectorAll('.platek-lot')].map(e => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }));
        const p1 = await poz(); await p.waitForTimeout(900); const p2 = await poz();
        const ruszyly = p1.filter((q, i) => p2[i] && Math.hypot(p2[i][0] - q[0], p2[i][1] - q[1]) > 4).length;
        const wDol = p1.filter((q, i) => p2[i] && p2[i][1] > q[1]).length;
        ok(`${nazwa} ruch ${tr}: płatki lecą${tr === 'B' ? ' (w dół)' : ''}`, ruszyly >= Math.ceil(p1.length * .7) && (tr === 'A' || wDol >= Math.ceil(p1.length * .7)), ruszyly + '/' + p1.length + ' ruszyło · ' + wDol + ' w dół');
        if (w === 1280 || w === 375) { await p.screenshot({ path: path.join(OUT, `platki_${tr}_${w}_${motyw}.png`) }); wyn.zrzuty++; }
        // strażnik (uwaga maisy 03.11): płatek nie może wejść na kota (koło) ani na choinkę (prostokąt); 30 próbek co 100 ms
        const kol = await p.evaluate(async () => {
          const R = e => e.getBoundingClientRect(); let kolizje = 0, probki = 0, najblizej = 1e9;
          for (let i = 0; i < 30; i++) {
            const k = R(document.querySelector('#kotHero')), kx = k.left + k.width / 2, ky = k.top + k.height / 2, kr = k.width / 2;
            const chE = document.querySelector('#kotScena .choinka'), c = chE ? R(chE) : null;
            for (const e of document.querySelectorAll('.platek-lot')) {
              const r = R(e), x = r.left + r.width / 2, y = r.top + r.height / 2, pr = parseFloat(e.style.width) * .46; probki++;
              const dk = Math.hypot(x - kx, y - ky) - kr - pr; najblizej = Math.min(najblizej, dk);
              let dc = 1e9; if (c) { const ddx = Math.max(c.left - x, 0, x - c.right), ddy = Math.max(c.top - y, 0, y - c.bottom); dc = Math.hypot(ddx, ddy) - pr; }
              if (dk < 0 || dc < 0) kolizje++;
            }
            await new Promise(r => setTimeout(r, 100));
          }
          return { kolizje, probki, najblizej: Math.round(najblizej) };
        });
        ok(`${nazwa} płatki omijają kota i choinkę`, kol.kolizje === 0, kol.kolizje + ' kolizji na ' + kol.probki + ' próbek · najbliżej ' + kol.najblizej + ' px od kółka');
      }
      ok(`${nazwa} napis pod powitaniem, widoczny cały`, m.napis === 'U nas święta zaczynają się wcześniej.' && m.napisPodH1 && !m.napisZaslonieta, m.napis);
      ok(`${nazwa} śnieg z kodu`, m.tlo === 'tlo-snieg' && m.jasne > 20, m.tlo + ' · ' + m.jasne + ' próbek');
      if (w === 1280 && motyw === 'dark') {
        const kl = () => p.evaluate(() => document.querySelector('#tlo canvas').toDataURL().length);
        const a = await kl(); await p.waitForTimeout(500); const b = await kl(); wyn.kroki++;
        ok(`${nazwa} śnieg pada`, a !== b);
        await p.click('#karty .karta >> nth=2'); await p.waitForTimeout(900); wyn.kroki++;
        const gasna = await p.evaluate(() => { const e = document.querySelector('.platki-lot'); return e ? +getComputedStyle(e).opacity : -1; });
        ok(`${nazwa} w rozmowie płatki gasną`, gasna === 0, 'krycie ' + gasna);
        await p.click('#nowy'); await p.waitForTimeout(700); wyn.kroki++;
        await p.locator('.hero').screenshot({ path: path.join(OUT, `swieta_hero_1280.png`) }); wyn.zrzuty++;
        await p.locator('.karty-wrap').screenshot({ path: path.join(OUT, `ikony_karty_1280.png`) }); wyn.zrzuty++;
      }
    } else {
      ok(`${nazwa} poza sezonem: bez choinki, płatków, napisu i przełącznika`, m.choinki === 0 && m.platki === 0 && m.napis === null && !m.makietaWidoczna);
      ok(`${nazwa} poza sezonem: zwykły spadający kod`, m.tlo === 'tlo-kod', m.tlo);
    }
    ok(`${nazwa} 4 ikony kart z zestawu Recraft (wektor)`, m.ikony === 4 && m.ikonyWektor, 'widoczne ' + m.ikonyWidoczne + ' · kolor ' + m.ikonyKolor);
    ok(`${nazwa} brak przełącznika makiety`, !m.makieta);
    ok(`${nazwa} bez poziomego przewijania`, !m.poziomy);
    await p.screenshot({ path: path.join(OUT, `swieta_${nazwa}.png`) }); wyn.zrzuty++;
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(wyn, null, 1));
})();
