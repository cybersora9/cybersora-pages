/* app.js — cała logika strony po cięciu (24.11.2026): menu, odsłanianie sekcji, okno „Szybkie pytania”,
   galeria zrzutów, formularz kontaktowy (Web3Forms + hCaptcha ładowana dopiero przy formularzu),
   doładowanie konfiguratora po kliknięciu oraz mapa Polski w hero Startu (JEDNA pętla rysowania, tylko gdy jest #map).
   Bez bibliotek. Skrypty wpisane w HTML nie przejdą przez CSP strony, dlatego wszystko jest w plikach. */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  document.documentElement.classList.add('js');   // zwykle robi to js-flag.js w <head>; tu asekuracja

  /* ---------- menu na telefonie ---------- */
  const nav = $('#nav'), burger = $('.nav__burger');
  if (nav && burger) {
    const ustaw = (on) => {
      nav.classList.toggle('is-open', on);
      burger.setAttribute('aria-expanded', String(on));
      burger.setAttribute('aria-label', on ? 'Zamknij menu' : 'Otwórz menu');
    };
    burger.addEventListener('click', () => ustaw(!nav.classList.contains('is-open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('.nav__link')) ustaw(false); });
    document.addEventListener('click', (e) => { if (nav.classList.contains('is-open') && !nav.contains(e.target)) ustaw(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { ustaw(false); burger.focus(); }
    });
  }

  /* ---------- odsłanianie sekcji przy przewijaniu (raz na sekcję) ---------- */
  const doOdsloniecia = $$('.reveal');
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((wpisy) => {
      wpisy.forEach((w) => { if (w.isIntersecting) { w.target.classList.add('in'); io.unobserve(w.target); } });
    }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });
    doOdsloniecia.forEach((el) => io.observe(el));
  } else doOdsloniecia.forEach((el) => el.classList.add('in'));

  /* ---------- okno „Szybkie pytania”: gotowe odpowiedzi w HTML, tu tylko otwieranie ---------- */
  const pytania = $('#pytania');
  if (pytania && typeof pytania.showModal === 'function') {
    let wrocDo = null;
    $$('[data-pyt-otworz]').forEach((b) => b.addEventListener('click', () => {
      wrocDo = b.offsetParent ? b : burger;
      pytania.showModal();
      document.documentElement.classList.add('okno-otwarte');
    }));
    pytania.addEventListener('click', (e) => {
      if (e.target.closest('[data-pyt-zamknij]')) { pytania.close(); return; }
      const r = pytania.getBoundingClientRect();   // klik w tło (poza ramką okna) zamyka
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) pytania.close();
    });
    pytania.addEventListener('toggle', (e) => {   // jedno pytanie otwarte naraz
      if (e.target.open) $$('details[open]', pytania).forEach((d) => { if (d !== e.target) d.open = false; });
    }, true);
    pytania.addEventListener('close', () => {
      document.documentElement.classList.remove('okno-otwarte');
      if (wrocDo) wrocDo.focus({ preventScroll: true });
    });
  } else $$('[data-pyt-otworz]').forEach((b) => { b.hidden = true; });

  /* ---------- galeria zrzutów: miniatura podmienia duży zrzut; klik w duży = podgląd na cały ekran ---------- */
  $$('[data-galeria]').forEach((gal) => {
    const duzy = $('[data-gal-duzy]', gal), podpis = $('[data-gal-podpis]', gal);
    if (!duzy) return;
    const nazwa = gal.dataset.galNazwa || '';
    const alt = (t) => (nazwa ? nazwa + ': ' : '') + t;
    const miniatury = $$('button[data-gal-src]', gal);
    gal.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-gal-src]'); if (!b) return;
      duzy.src = b.dataset.galSrc;
      duzy.alt = alt(b.dataset.galOpis || '');
      if (podpis) podpis.textContent = b.dataset.galOpis || '';
      miniatury.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
    const otworz = $('[data-gal-otworz]', gal);
    if (!otworz || !miniatury.length || typeof HTMLDialogElement !== 'function') return;
    const zrob = (tag, kl, txt) => { const x = document.createElement(tag); if (kl) x.className = kl; if (txt) x.textContent = txt; return x; };
    let ok = null, obraz, opis, licz, zamknij, nr = 0;
    function pokaz(i) {
      nr = (i + miniatury.length) % miniatury.length;
      const b = miniatury[nr], t = b.dataset.galOpis || '';
      obraz.src = b.dataset.galSrc; obraz.alt = alt(t); opis.textContent = t;
      licz.textContent = (nr + 1) + ' / ' + miniatury.length;
      b.click();   // karta pod spodem pokazuje ten sam zrzut po zamknięciu
    }
    function zbuduj() {   // okno powstaje przy pierwszym otwarciu, nie przy ładowaniu strony
      ok = zrob('dialog', 'gal-ok'); ok.setAttribute('aria-label', nazwa ? 'Zrzuty: ' + nazwa : 'Zrzuty');
      licz = zrob('span', 'gal-ok__licz'); zamknij = zrob('button', null, '×');
      zamknij.type = 'button'; zamknij.setAttribute('aria-label', 'Zamknij podgląd');
      const gora = zrob('div', 'gal-ok__gora'); gora.append(licz, zamknij);
      const strzalka = (znak, etyk, krok) => { const s = zrob('button', null, znak); s.type = 'button'; s.setAttribute('aria-label', etyk); s.addEventListener('click', () => pokaz(nr + krok)); return s; };
      obraz = zrob('img'); obraz.decoding = 'async';
      const scena = zrob('div', 'gal-ok__scena'); scena.append(strzalka('‹', 'Poprzedni zrzut', -1), obraz, strzalka('›', 'Następny zrzut', 1));
      opis = zrob('p', 'gal-ok__opis'); opis.setAttribute('aria-live', 'polite');
      const dol = zrob('div', 'gal-ok__dol'); dol.append(strzalka('‹', 'Poprzedni zrzut', -1), strzalka('›', 'Następny zrzut', 1));
      ok.append(gora, scena, opis, dol); document.body.appendChild(ok);
      zamknij.addEventListener('click', () => ok.close());
      ok.addEventListener('close', () => { document.documentElement.classList.remove('okno-otwarte'); otworz.focus({ preventScroll: true }); });
      ok.addEventListener('click', (e) => { if (!e.target.closest('button, img')) ok.close(); });
      ok.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); pokaz(nr - 1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); pokaz(nr + 1); }
      });
    }
    otworz.addEventListener('click', () => {
      if (!ok) zbuduj();
      const i = miniatury.findIndex((x) => x.getAttribute('aria-pressed') === 'true');
      pokaz(i < 0 ? 0 : i); document.documentElement.classList.add('okno-otwarte'); ok.showModal(); zamknij.focus();
    });
  });

  /* ---------- formularz kontaktowy ----------
     Wysyłka: własny fetch do API Web3Forms (bez ich skryptu). Klucz jest publiczny z założenia: widać go w każdym
     żądaniu z przeglądarki, a pozwala tylko wysłać wiadomość na skrzynkę cybersory. hCaptcha (skrypt Web3Forms)
     ładuje się dopiero przy pierwszym dotknięciu formularza, tak jak mówi polityka prywatności. */
  const form = $('form#formularz');
  if (form) {
    const KLUCZ = 'c4523b4b-92d5-4d0e-ac9b-e7c4de8b4000';
    const POCZTA = 'cybersora@zohomail.eu';
    const status = $('#formStatus'), chipTemat = $('#formTemat'), chipKonf = $('#formKonf');
    const guzik = $('button[type="submit"]', form);
    const pole = (n) => form.elements[n];
    const ustawTemat = (t) => {
      pole('temat').value = t || '';
      chipTemat.hidden = !t;
      if (t) $('b', chipTemat).textContent = t;
    };
    const ustawKonf = (tekst, skrot) => {
      pole('konfigurator').value = tekst || '';
      if (!chipKonf) return;
      chipKonf.hidden = !tekst;
      if (tekst) $('b', chipKonf).textContent = skrot;
    };
    try {
      const t = new URLSearchParams(location.search).get('temat');
      if (t) ustawTemat(t.slice(0, 80));
    } catch (e) { /* stary adres bez parametrów */ }
    $$('[data-temat]').forEach((a) => a.addEventListener('click', () => ustawTemat(a.dataset.temat)));
    $('[data-temat-usun]', form).addEventListener('click', () => ustawTemat(''));
    if (chipKonf) $('[data-konf-usun]', form).addEventListener('click', () => ustawKonf('', ''));
    window.addEventListener('konfigurator:gotowe', (e) => {
      ustawKonf(e.detail.tekst, e.detail.skrot);
      if (e.detail.temat) ustawTemat(e.detail.temat);
      form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      pole('wiadomosc').focus({ preventScroll: true });
    });

    let captcha = false;
    const ladujCaptche = () => {
      if (captcha) return;
      captcha = true;
      const s = document.createElement('script');
      s.src = 'https://web3forms.com/client/script.js';
      s.async = true;
      document.body.appendChild(s);
    };
    form.addEventListener('focusin', ladujCaptche, { once: true });
    form.addEventListener('pointerdown', ladujCaptche, { once: true });

    const komunikat = (t, blad) => { status.textContent = t; status.classList.toggle('blad', !!blad); };
    const jakEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
    const jakTelefon = (s) => /^[+\d][\d\s()-]{6,}$/.test(s) && s.replace(/\D/g, '').length >= 7;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      if (fd.get('botcheck')) return;   // pułapka: pole niewidoczne dla człowieka wypełnił bot
      const imie = (fd.get('imie') || '').trim(), kontakt = (fd.get('kontakt') || '').trim(), tresc = (fd.get('wiadomosc') || '').trim();
      const zle = [];
      const sprawdz = (n, ok) => { pole(n).setAttribute('aria-invalid', String(!ok)); if (!ok) zle.push(n); };
      sprawdz('imie', imie.length > 0);
      sprawdz('kontakt', jakEmail(kontakt) || jakTelefon(kontakt));
      sprawdz('wiadomosc', tresc.length > 0);
      if (zle.length) {
        komunikat(zle[0] === 'kontakt' && kontakt ? 'Podaj e-mail albo numer telefonu, na który mam odpisać.' : 'Uzupełnij zaznaczone pola.', true);
        pole(zle[0]).focus();
        return;
      }
      const token = fd.get('h-captcha-response');
      if (!token) {
        ladujCaptche();
        komunikat('Zaznacz pole „Jestem człowiekiem” nad przyciskiem. Jeśli go nie widać, napisz na ' + POCZTA + '.', true);
        return;
      }
      const temat = (fd.get('temat') || '').trim();
      const wiadomosc =
        'Od: ' + imie + '\n' +
        'Kontakt: ' + kontakt + '\n' +
        (temat ? 'Temat: ' + temat + '\n' : '') +
        'Strona: ' + location.pathname + '\n\n' +
        (fd.get('konfigurator') ? fd.get('konfigurator') + '\n\n' : '') +
        'Wiadomość:\n' + tresc;
      guzik.disabled = true; guzik.textContent = 'Wysyłanie…';
      try {
        const dane = { access_key: KLUCZ, subject: 'Zgłoszenie ze strony' + (temat ? ': ' + temat : ''), from_name: imie, message: wiadomosc, 'h-captcha-response': token };
        if (jakEmail(kontakt)) dane.email = kontakt;
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(dane)
        });
        const wynik = await res.json();
        if (!wynik.success) throw new Error(wynik.message || 'nieznany błąd');
        form.dataset.wyslano = '1';
        komunikat('Dziękuję, ' + imie + '. Wiadomość wysłana. Odpiszę na ' + kontakt + ', zwykle w 24 godziny, najdalej w 2 dni robocze.');
        status.focus();
      } catch (err) {
        guzik.disabled = false; guzik.textContent = 'Wyślij →';
        komunikat('Nie udało się wysłać wiadomości. Spróbuj jeszcze raz albo napisz na ' + POCZTA + '.', true);
      }
    });
  }

  /* ---------- konfigurator ceny: kod i style pobierają się dopiero po kliknięciu ---------- */
  const konfMiejsce = $('#konfMiejsce'), konfStart = $('#konfStart');
  if (konfMiejsce && konfStart) {
    let laduje = null;
    const zasob = (tag, attrs) => new Promise((ok, zle) => {
      const el = document.createElement(tag);
      Object.assign(el, attrs);
      el.onload = ok; el.onerror = () => zle(new Error('nie wczytano ' + (attrs.src || attrs.href)));
      document.head.appendChild(el);
    });
    konfStart.addEventListener('click', () => {
      if (laduje) return;
      konfStart.disabled = true; konfStart.textContent = 'Wczytuję…';
      laduje = Promise.all([
        zasob('link', { rel: 'stylesheet', href: konfMiejsce.dataset.css }),
        zasob('script', { src: konfMiejsce.dataset.js })
      ]).then(() => { window.Konfigurator.zamontuj(konfMiejsce); })
        .catch(() => { laduje = null; konfStart.disabled = false; konfStart.textContent = 'Nie udało się wczytać. Spróbuj ponownie'; });
    });
  }

  /* ---------- mapa Polski w hero Startu ---------- */
  if ($('#map') && $('#stage')) mapaStart();

  function mapaStart() {
    const stage = document.getElementById('stage');
    const canvas = document.getElementById('map');
    const ctx = canvas.getContext('2d');

    // Real Poland border, 44 vertices [lon, lat] (Natural Earth via world.geo.json).
    const POLAND_LL = [
      [15.016996,51.106674],[14.607098,51.745188],[14.685026,52.089947],
      [14.4376,52.62485],[14.074521,52.981263],[14.353315,53.248171],
      [14.119686,53.757029],[14.8029,54.050706],[16.363477,54.513159],
      [17.622832,54.851536],[18.620859,54.682606],[18.696255,54.438719],
      [19.66064,54.426084],[20.892245,54.312525],[22.731099,54.327537],
      [23.243987,54.220567],[23.484128,53.912498],[23.527536,53.470122],
      [23.804935,53.089731],[23.799199,52.691099],[23.199494,52.486977],
      [23.508002,52.023647],[23.527071,51.578454],[24.029986,50.705407],
      [23.922757,50.424881],[23.426508,50.308506],[22.51845,49.476774],
      [22.776419,49.027395],[22.558138,49.085738],[21.607808,49.470107],
      [20.887955,49.328772],[20.415839,49.431453],[19.825023,49.217125],
      [19.320713,49.571574],[18.909575,49.435846],[18.853144,49.49623],
      [18.392914,49.988629],[17.649445,50.049038],[17.554567,50.362146],
      [16.868769,50.473974],[16.719476,50.215747],[16.176253,50.422607],
      [16.238627,50.697733],[15.490972,50.78473]
    ];

    /* MAPA 2.0 (24.11): granice 16 wojewodztw z mapa-pl.js (window.MAPA_PL; kwantyzacja 0,002 st., delta base36).
       Bez tego pliku (blad sieci) zostaje stary 44-punktowy kontur i kropki jak dawniej. */
    const MP = window.MAPA_PL || null;
    const REG = MP ? MP.w.map(([n, st, d]) => {
      const a = st.split(','), q = [parseInt(a[0], 36), parseInt(a[1], 36)], t = d ? d.split(' ') : [];
      let x = q[0], y = q[1];
      for (let i = 0; i + 1 < t.length; i += 2) { x += parseInt(t[i], 36); y += parseInt(t[i + 1], 36); q.push(x, y); }
      return { n, q, ll: null };
    }) : null;
    if (REG) {
      // krawedz wspolna dwoch wojewodztw: rysowana raz (f=1), kopia pomijana (f=2); krawedz zewnetrzna = granica Polski (f=0)
      const seen = new Map();
      REG.forEach(r => {
        const n = r.q.length / 2; r.f = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n, ax = r.q[2 * i], ay = r.q[2 * i + 1], bx = r.q[2 * j], by = r.q[2 * j + 1];
          const k = (ax < bx || (ax === bx && ay < by)) ? ax + ',' + ay + '|' + bx + ',' + by : bx + ',' + by + '|' + ax + ',' + ay;
          seen.set(k, (seen.get(k) || 0) + 1);
          r.k = r.k || []; r.k[i] = k;
        }
      });
      const done = new Set();
      REG.forEach(r => {
        for (let i = 0; i < r.f.length; i++) {
          const k = r.k[i];
          r.f[i] = seen.get(k) === 1 ? 0 : (done.has(k) ? 2 : (done.add(k), 1));
        }
        r.k = null;
      });
    }
    const _src = REG ? REG.reduce((acc, r) => { for (let i = 0; i < r.q.length; i += 2) acc.push([r.q[i] / MP.q, r.q[i + 1] / MP.q]); return acc; }, []) : POLAND_LL;
    let _lonMin = 1e9, _lonMax = -1e9, _latMin = 1e9, _latMax = -1e9;
    _src.forEach(p => { if (p[0] < _lonMin) _lonMin = p[0]; if (p[0] > _lonMax) _lonMax = p[0]; if (p[1] < _latMin) _latMin = p[1]; if (p[1] > _latMax) _latMax = p[1]; });
    const _kx = Math.cos(((_latMin + _latMax) / 2) * Math.PI / 180);
    const OUTLINE = POLAND_LL.map(([lon, lat]) => [
      (lon - _lonMin) * _kx,
      (_latMax - lat)
    ]);
    const RAW_W = (_lonMax - _lonMin) * _kx;
    const RAW_H = (_latMax - _latMin);
    // lon/lat -> jednostki konturu (przed skala)
    const projX = lon => (lon - _lonMin) * _kx, projY = lat => _latMax - lat;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    /* C (07.10): kropki mapy w tablicach typowanych (bylo: tablica ~4 800 obiektow). Petla mapy czyta
       je co klatke, a przy 4x CPU dostep do pol obiektow byl polowa skryptu Startu. PN = liczba kropek. */
    const DRYF_K = 1024 / (2 * Math.PI), DRYF = new Float32Array(1024);   // 1,6 * sin; cos = przesuniecie o 256
    for (let i = 0; i < 1024; i++) DRYF[i] = Math.sin(i / DRYF_K) * 1.6;
    let PN = 0, PX = new Float32Array(0), PY = PX, PVX = PX, PVY = PX, PHX = PX, PHY = PX, PPH = PX, PSP = PX, PR = PX, PCD = PX, PREG = new Uint8Array(0);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* SZYBKOSC S4 (krok 7): tryb LITE dla slabego telefonu (dotyk i <= 4 rdzenie albo <= 4 GB RAM) albo
       oszczedzania danych. Tla tras i sekcji jak przy "ogranicz ruch" (jedna statyczna klatka), bez iskier
       i czipow; mapa sklada sie normalnie i ~2,5 s po wejsciu petla zasypia na ostatniej klatce (budzi ja
       zmiana trasy, dotyk/kursor, zmiana rozmiaru). Do testow: ?lite=1 wymusza, ?lite=0 wylacza. */
    const LITE = (() => {
      const q = /[?&]lite=([01])\b/.exec(location.search);
      if (q) return q[1] === '1';
      if (reduce) return false;
      const n = navigator;
      if (n.connection && n.connection.saveData) return true;
      return matchMedia('(pointer: coarse)').matches && ((n.hardwareConcurrency || 8) <= 4 || (n.deviceMemory || 8) <= 4);
    })();
    const stoi = reduce || LITE;   // tla bez ruchu: statyczna klatka zamiast animacji
    let liteSpi = false, liteOd = 0;   // LITE: petla uspiona / ostatnia pobudka (liteBudz, liteUspij przy frame)
    if (LITE) document.documentElement.classList.add('lite');

    const mouse = { x: -9999, y: -9999, active: false };

    const KOL = { a: [225, 29, 51], hot: [255, 58, 82] };   // jeden kolor marki na mapie

    const rgba = (c, al) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + al + ')';

    // map footprint + pulse origin — set in buildParticles, used by the wave and the sparks
    const mapBox = { x: 0, y: 0, w: 0, h: 0 };
    const pulse = { cx: 0, cy: 0, maxR: 0 };

    /* Sylwetka Polski zyje TYLKO na Starcie — jedyny prawdziwy moment "MADE IN
       POLAND". Reszta widokow zostaje CZYSTA (decyzja 6 z 11.09, doslownie) —
       "kolo zamiast mapy" (M4.9, 18.09) zostalo odrzucone przez maise ten sam
       dzien jako kolejna niedoprawiona zgadywanka. Nie zastepowac tego nowym
       ksztaltem bez jej wyraznej decyzji. */
    function buildParticles() {
      if (stoi) liteBudz();   // nowy rozmiar plotna czysci obraz: petla musi narysowac mape od nowa
      const rect = stage.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const uzyjMapy = true;

      let mapW, mapH, scale;
      const mob = !!(REG && uzyjMapy && W < 700);   // MAPA 2.0: telefon = mapa jako osobny blok pod paskiem, tekst pod nia
      mapaW.mob = mob;
      if (uzyjMapy) {
        if (mob) { mapW = Math.min(W - 28, 480); scale = mapW / RAW_W; mapH = RAW_H * scale; }
        else {
          mapH = Math.min(H * 0.72, W * 0.62);
          scale = mapH / RAW_H;
          mapW = RAW_W * scale;
        }
      } else {
        mapW = mapH = 0;
      }
      /* MAPA 2.0: na szerokim ekranie mapa przesunieta w prawo (tekst hero z lewej nie lezy juz na zachodzie kraju);
         prawy skraj zostawia luz na pionowy stempel. Waski ekran: jak dotad, na srodku. */
      const offX = W >= 1000 ? Math.max((W - mapW) / 2, Math.min(W * 0.6 - mapW / 2, W - mapW - 120)) : (W - mapW) / 2;
      const offY = mob ? 76 : (H - mapH) / 2;
      mapBox.x = offX; mapBox.y = offY; mapBox.w = mapW; mapBox.h = mapH;
      pulse.cx = offX + mapW / 2;
      pulse.cy = offY + mapH / 2;
      pulse.maxR = Math.hypot(mapW, mapH) / 2 + 60;
      mapaWarstwyBuduj(uzyjMapy, offX, offY, scale);   // MAPA 2.0: granice, miasta, siec lukow

      if (!uzyjMapy) { PN = 0; return; }

      const rw = Math.max(1, Math.ceil(mapW));
      const rh = Math.max(1, Math.ceil(mapH));
      const off = document.createElement('canvas');
      off.width = rw; off.height = rh;
      const octx = off.getContext('2d', { willReadFrequently: true });
      const step = mob ? 8.5 : Math.max(6, Math.round(mapH / 78));
      const rk = mob ? 1.4 : 1;   // telefon: mniej, ale wieksze kropki
      const pts = [];
      if (REG) {
        // kazde wojewodztwo wypelnione swoim "numerem" w kanale R, potem szczelina na granicach (kropki nie wchodza na kreske)
        const sciezki = REG.map((r, i) => {
          const p = regPath(r, scale, 0, 0);
          octx.fillStyle = 'rgb(' + (i * 14 + 14) + ',0,0)';
          octx.fill(p);
          return p;
        });
        octx.globalCompositeOperation = 'destination-out';
        octx.lineWidth = Math.max(2.4, step * 0.5); octx.lineJoin = 'round';
        sciezki.forEach(p => octx.stroke(p));
        octx.globalCompositeOperation = 'source-over';
        const data = octx.getImageData(0, 0, rw, rh).data;
        const dy = step * 0.866;
        for (let y = 0, row = 0; y < rh; y += dy, row++) {
          for (let x = (row & 1) * step * 0.5; x < rw; x += step) {
            const jx = x + (Math.random() - 0.5) * step * 0.32;
            const jy = y + (Math.random() - 0.5) * step * 0.32;
            const sx = Math.min(rw - 1, Math.max(0, jx | 0));
            const sy = Math.min(rh - 1, Math.max(0, jy | 0));
            const o = (sy * rw + sx) * 4;
            if (data[o + 3] > 128) {
              const id = Math.min(REG.length - 1, Math.max(0, Math.round((data[o] - 14) / 14)));
              pts.push({ hx: offX + jx, hy: offY + jy, ph: Math.random() * Math.PI * 2, sp: 0.6 + Math.random() * 0.9,
                r: (0.8 + Math.random() * 1.0) * rk, reg: id, cd: Math.hypot(offX + jx - pulse.cx, offY + jy - pulse.cy) });
            }
          }
        }
      } else {
        octx.fillStyle = '#000';
        octx.beginPath();
        OUTLINE.forEach(([x, y], i) => {
          const px = x * scale, py = y * scale;
          i ? octx.lineTo(px, py) : octx.moveTo(px, py);
        });
        octx.closePath();
        octx.fill();
        const data = octx.getImageData(0, 0, rw, rh).data;
        for (let y = 0; y < rh; y += step) {
          for (let x = 0; x < rw; x += step) {
            const jx = x + (Math.random() - 0.5) * step * 0.7;
            const jy = y + (Math.random() - 0.5) * step * 0.7;
            const sx = Math.min(rw - 1, Math.max(0, jx | 0));
            const sy = Math.min(rh - 1, Math.max(0, jy | 0));
            if (data[(sy * rw + sx) * 4 + 3] > 128) {
              pts.push({ hx: offX + jx, hy: offY + jy, ph: Math.random() * Math.PI * 2, sp: 0.6 + Math.random() * 0.9,
                r: 0.9 + Math.random() * 1.1, reg: 255, cd: Math.hypot(offX + jx - pulse.cx, offY + jy - pulse.cy) });
            }
          }
        }
      }
      PN = pts.length;
      PX = new Float32Array(PN); PY = new Float32Array(PN); PVX = new Float32Array(PN); PVY = new Float32Array(PN);
      PHX = new Float32Array(PN); PHY = new Float32Array(PN); PPH = new Float32Array(PN); PSP = new Float32Array(PN);
      PR = new Float32Array(PN); PCD = new Float32Array(PN); PREG = new Uint8Array(PN);
      for (let i = 0; i < PN; i++) {
        const q = pts[i];
        PX[i] = PHX[i] = q.hx; PY[i] = PHY[i] = q.hy; PPH[i] = q.ph; PSP[i] = q.sp; PR[i] = q.r; PCD[i] = q.cd; PREG[i] = q.reg;
      }
    }

    /* ===================== MAPA 2.0 (24.11): granice wojewodztw, miasta, siec lukow z pakietami =====================
       Statyczna warstwa (kreski granic, kropki i podpisy miast) rysowana RAZ do bufora, w klatce jedno drawImage.
       Dynamika (kilkanascie lukow miedzy miastami, pakiety z ogonem, wojewodztwo pod kursorem/palcem)
       to kilka sciezek na klatke, zero shadowBlur, zero alokacji w petli. Poza Startem (PN = 0) i bez mapa-pl.js
       wszystko wylaczone (zostaje dawna mapa z kropek). Telefon (W < 700): mapa jako osobny blok nad tekstem. */
    const mapaW = { on: false, mob: false, stat: null, sx: 0, sy: 0, sw: 0, sh: 0, city: [], arcs: [],
      hover: -1, hx: -1e9, hy: -1e9, tap: null, rev0: 0, rv: 1 };
    const MOB_LAB = new Set(['Warszawa', 'Gdańsk', 'Wrocław', 'Poznań', 'Szczecin', 'Lublin']);
    function regPath(r, scale, ox, oy) {
      const p = new Path2D(), n = r.q.length / 2, Q = MP.q;
      for (let i = 0; i < n; i++) {
        const x = projX(r.q[2 * i] / Q) * scale + ox, y = projY(r.q[2 * i + 1] / Q) * scale + oy;
        i ? p.lineTo(x, y) : p.moveTo(x, y);
      }
      p.closePath();
      return p;
    }
    function mapaWarstwyBuduj(uzyj, offX, offY, scale) {
      mapaW.on = !!(REG && uzyj);
      if (!mapaW.on) { mapaW.stat = null; mapaW.rev0 = 0; return; }
      if (!mapaW.rev0) mapaW.rev0 = performance.now();
      const Q = MP.q;
      mapaW.scale = scale; mapaW.offX = offX; mapaW.offY = offY;
      mapaW.city = MP.m.map(c => ({ n: c[0], x: offX + projX(c[1]) * scale, y: offY + projY(c[2]) * scale, lon: c[1] }));
      // fala intro i puls biegna ze srodka mapy (pulse.cx/cy ustawione wyzej), bez wyroznionego miasta
      const g = { x: pulse.cx, y: pulse.cy };
      const bx = mapBox.x, by = mapBox.y, bw = mapBox.w, bh = mapBox.h;
      pulse.maxR = Math.max(Math.hypot(g.x - bx, g.y - by), Math.hypot(g.x - bx - bw, g.y - by),
        Math.hypot(g.x - bx, g.y - by - bh), Math.hypot(g.x - bx - bw, g.y - by - bh)) + 60;
      // luki miedzy miastami (siec na cala Polske): punkt kontrolny wyniesiony w bok od cieciwy
      const C = mapaW.city, nC = C.length;
      mapaW.arcs = C.map((p, i) => {
        const c = C[(i * 5 + 3) % nC];
        const mx = (p.x + c.x) / 2, my = (p.y + c.y) / 2, dx = c.x - p.x, dy = c.y - p.y, d = Math.hypot(dx, dy) || 1;
        const lift = d * 0.2;
        return { x0: p.x, y0: p.y, cx: mx + (dy / d) * lift, cy: my - (dx / d) * lift - d * 0.05, x1: c.x, y1: c.y,
          ph: (i * 0.173) % 1, sp: 0.1 + (i % 4) * 0.014 };
      }).filter(e => e.x0 !== e.x1 || e.y0 !== e.y1);
      // sciezki ekranowe wojewodztw (podswietlenie pod kursorem), srodek do podpisu, wielokat do trafienia
      REG.forEach(r => {
        r.path = regPath(r, scale, offX, offY);
        const n = r.q.length / 2; r.sx = new Float32Array(n); r.sy = new Float32Array(n);
        let cx = 0, cy = 0;
        for (let i = 0; i < n; i++) {
          r.sx[i] = offX + projX(r.q[2 * i] / Q) * scale; r.sy[i] = offY + projY(r.q[2 * i + 1] / Q) * scale;
          cx += r.sx[i]; cy += r.sy[i];
        }
        r.cx = cx / n; r.cy = cy / n;
      });
      mapaW.hover = -1; mapaW.hx = mapaW.hy = -1e9;
      mapaStatBuduj();
    }
    function mapaStatBuduj() {
      if (!mapaW.on) return;
      const M = 110, sx = Math.floor(mapBox.x - M), sy = Math.floor(mapBox.y - 40), sw = Math.ceil(mapBox.w + 2 * M), sh = Math.ceil(mapBox.h + 80);
      const cv = mapaW.stat || document.createElement('canvas');
      cv.width = Math.floor(sw * dpr); cv.height = Math.floor(sh * dpr);
      const c = cv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, -sx * dpr, -sy * dpr);
      const Q = MP.q, sc = mapaW.scale, ox = mapaW.offX, oy = mapaW.offY, k = mapaW.mob ? 1.5 : 1;
      const X = i => ox + projX(i / Q) * sc, Y = i => oy + projY(i / Q) * sc;
      c.lineJoin = 'round'; c.lineCap = 'round';
      // granice wewnetrzne (cienkie), potem zewnetrzna (jasna z poswiata); na telefonie grubsze
      const seg = (flag, w, col) => {
        c.beginPath();
        REG.forEach(r => {
          const n = r.f.length;
          for (let i = 0; i < n; i++) {
            if (r.f[i] !== flag) continue;
            const j = (i + 1) % n;
            c.moveTo(X(r.q[2 * i]), Y(r.q[2 * i + 1])); c.lineTo(X(r.q[2 * j]), Y(r.q[2 * j + 1]));
          }
        });
        c.lineWidth = w; c.strokeStyle = col; c.stroke();
      };
      seg(1, 1 * k, 'rgba(255,58,82,' + (mapaW.mob ? 0.34 : 0.26) + ')');
      seg(0, 7 * k, 'rgba(225,29,51,0.10)');
      seg(0, 3.2 * k, 'rgba(225,29,51,0.22)');
      seg(0, 1.3 * k, 'rgba(255,92,110,0.9)');
      // miasta: kropka + podpis (Geist Mono)
      c.textBaseline = 'middle';
      mapaW.city.forEach((m, i) => {
        const lewo = (m.lon < 18.7 && m.n !== 'Szczecin') || m.lon > 22.3;   // podpis od strony wnetrza kraju, nie na granicy
        c.textAlign = lewo ? 'right' : 'left';
        const tx = m.x + (lewo ? -9 : 9);
          c.fillStyle = 'rgba(255,200,205,0.9)';
          c.beginPath(); c.arc(m.x, m.y, mapaW.mob ? 2.6 : 2.1, 0, 6.2832); c.fill();
          if (mapaW.mob && !MOB_LAB.has(m.n)) return;   // telefon: tylko wieksze miasta, wieksza czcionka
          c.font = '500 ' + (mapaW.mob ? 11 : 10) + 'px "Geist Mono", ui-monospace, monospace';
          c.fillStyle = 'rgba(255,214,218,0.66)'; c.fillText(m.n.toUpperCase(), tx, m.y);
      });
      mapaW.stat = cv; mapaW.sx = sx; mapaW.sy = sy; mapaW.sw = sw; mapaW.sh = sh;
    }
    // wojewodztwo pod kursorem/palcem: punkt w wielokacie (16 wielokatow, tylko gdy punkt sie przesunal)
    function mapaTrafienie(x, y) {
      if (Math.abs(x - mapaW.hx) + Math.abs(y - mapaW.hy) < 2) return;
      mapaW.hx = x; mapaW.hy = y;
      let hit = -1;
      if (x > mapBox.x && x < mapBox.x + mapBox.w && y > mapBox.y && y < mapBox.y + mapBox.h) {
        for (let k = 0; k < REG.length && hit < 0; k++) {
          const sx = REG[k].sx, sy = REG[k].sy, n = sx.length;
          let w = false;
          for (let i = 0, j = n - 1; i < n; j = i++) {
            if ((sy[i] > y) !== (sy[j] > y) && x < (sx[j] - sx[i]) * (y - sy[i]) / (sy[j] - sy[i]) + sx[i]) w = !w;
          }
          if (w) hit = k;
        }
      }
      mapaW.hover = hit;
    }
    // dynamika: luki z ogonem, uderzenia w miasta, wojewodztwo/miasto pod kursorem lub palcem
    function mapaDraw(time, mA, mx, my) {
      if (!mapaW.on || !PN) return;
      const rv = mapaW.rv;
      if (mapaW.stat) { ctx.globalAlpha = rv; ctx.drawImage(mapaW.stat, mapaW.sx, mapaW.sy, mapaW.sw, mapaW.sh); ctx.globalAlpha = 1; }
      const hot = KOL.hot, a = KOL.a, A = mapaW.arcs, lw = mapaW.mob ? 1.3 : 1;
      if (rv >= 0.6) {
        const ra = Math.min(1, (rv - 0.6) / 0.4);
        ctx.lineWidth = lw;
        ctx.strokeStyle = rgba(a, 0.2 * ra);
        ctx.beginPath();
        for (let i = 0; i < A.length; i++) { const e = A[i]; ctx.moveTo(e.x0, e.y0); ctx.quadraticCurveTo(e.cx, e.cy, e.x1, e.y1); }
        ctx.stroke();
        if (!stoi) {
          // pakiety: jasna glowa + ogon komety (7 punktow), po dojsciu blysk i dwa pierscienie na miescie
          for (let i = 0; i < A.length; i++) {
            const e = A[i], u = (time * e.sp + e.ph) % 1;
            for (let k = 0; k < 7; k++) {
              const t = u - k * 0.016; if (t < 0) break;
              const w = 1 - t, px = w * w * e.x0 + 2 * w * t * e.cx + t * t * e.x1, py = w * w * e.y0 + 2 * w * t * e.cy + t * t * e.y1;
              ctx.fillStyle = rgba(k === 0 ? [255, 235, 238] : hot, (k === 0 ? 0.95 : 0.55 / (k + 0.5)) * ra);
              ctx.beginPath(); ctx.arc(px, py, k === 0 ? 2.1 : 1.6 - k * 0.12, 0, 6.2832); ctx.fill();
            }
            if (u < 0.28) {
              const f = u / 0.28;
              ctx.fillStyle = rgba(hot, 0.38 * (1 - f) * ra);
              ctx.beginPath(); ctx.arc(e.x1, e.y1, 3 + f * 5, 0, 6.2832); ctx.fill();
              ctx.strokeStyle = rgba(hot, 0.7 * (1 - f) * ra);
              ctx.beginPath(); ctx.arc(e.x1, e.y1, 3 + f * 14, 0, 6.2832); ctx.stroke();
              if (f > 0.25) { ctx.strokeStyle = rgba(hot, 0.45 * (1 - f) * ra); ctx.beginPath(); ctx.arc(e.x1, e.y1, 2 + (f - 0.25) * 18, 0, 6.2832); ctx.stroke(); }
            }
          }
        }
      }
      // wskazanie: kursor (komputer) albo ostatni tap (telefon, ~3 s)
      let act = mA, ex = mx, ey = my;
      const tp = mapaW.tap;
      if (!act && tp && time - tp.t < 3) { act = true; ex = tp.x; ey = tp.y; }
      if (act) mapaTrafienie(ex, ey); else if (mapaW.hover !== -1) { mapaW.hover = -1; mapaW.hx = -1e9; }
      const h = mapaW.hover;
      if (h >= 0) {
        const r = REG[h];
        ctx.fillStyle = rgba(hot, 0.07); ctx.fill(r.path);
        ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(hot, 0.9); ctx.stroke(r.path);
        ctx.save();
        ctx.font = '500 ' + (mapaW.mob ? 12 : 11) + 'px "Geist Mono", ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillText(r.n.toUpperCase(), r.cx, r.cy - 16);
        ctx.restore();
      }
      // najblizsze miasto w zasiegu palca/kursora: pierscien i jasny podpis
      if (act) {
        const C = mapaW.city, rad = mapaW.mob ? 26 : 14;
        let best = -1, bd = rad * rad;
        for (let i = 0; i < C.length; i++) { const dx = C[i].x - ex, dy = C[i].y - ey, d2 = dx * dx + dy * dy; if (d2 < bd) { bd = d2; best = i; } }
        if (best >= 0) {
          const c = C[best], f = (time * 1.4) % 1;
          ctx.strokeStyle = rgba(hot, 0.9 * (1 - f)); ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.arc(c.x, c.y, 4 + f * 10, 0, 6.2832); ctx.stroke();
          ctx.save();
          ctx.font = '500 ' + (mapaW.mob ? 12 : 11) + 'px "Geist Mono", ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = '#fff'; ctx.fillText(c.n.toUpperCase(), c.x, c.y - 15);
          ctx.restore();
        }
      }
    }

    /* ===================== sparks — rare embers drifting up, away from the map ===================== */
    const SPARK_N = 14;
    let sparks = [];

    function offMap(x, y) {
      return !(x > mapBox.x - 20 && x < mapBox.x + mapBox.w + 20 &&
               y > mapBox.y - 20 && y < mapBox.y + mapBox.h + 20);
    }

    // przypisuje pola w miejscu: odrodzenie iskry w petli bez alokacji obiektu
    function newSpark(s, seed) {
      let x = 0, y = 0;
      // spawn along the bottom edge and the sides; a few tries to stay clear of the map box
      for (let i = 0; i < 8; i++) {
        if (seed) {
          x = Math.random() * W; y = Math.random() * H;
        } else if (Math.random() < 0.6) {
          x = Math.random() * W; y = H + 8 + Math.random() * 30;
        } else {
          x = Math.random() < 0.5 ? 10 + Math.random() * 60 : W - 10 - Math.random() * 60;
          y = H * (0.35 + Math.random() * 0.65);
        }
        if (offMap(x, y)) break;
      }
      s.x = x; s.y = y;
      s.r = 0.6 + Math.random() * 0.8;
      s.a = 0.15 + Math.random() * 0.25;
      s.vy = 0.1 + Math.random() * 0.25;
      s.amp = 6 + Math.random() * 14;
      s.ph = Math.random() * Math.PI * 2;
      s.sp = 0.3 + Math.random() * 0.5;
      return s;
    }

    function buildSparks() {
      sparks = [];
      if (stoi) return;
      for (let i = 0; i < SPARK_N; i++) sparks.push(newSpark({}, true));
    }

    const LINK_CAP = 50;
    const nearMouse = new Int32Array(LINK_CAP);   // indeksy kropek
    const nearD2 = new Float64Array(LINK_CAP);
    let nearCount = 0;

    /* P1 (30.09): bufory rysowania hurtem (kropki mapy i linie sieci), alokowane przy zmianie
       liczby kropek, nie co klatke. Stringi kolorow tylko przy zmianie koloru/jasnosci. */
    const PW = 6, LB = 5;
    const pbCnt = new Int32Array(PW + 1), pbOff = new Int32Array(PW + 1), pbStyle = new Array(PW + 1);
    let pbB = new Uint8Array(0), pbR = new Float32Array(0), pbIdx = new Int32Array(0);
    const lbSeg = new Float32Array(LINK_CAP * (LINK_CAP - 1) / 2 * 5), lbStyle = new Array(LB);
    let pbKey = '';
    function pbFit() {
      const n = PN;
      if (pbB.length !== n) { pbB = new Uint8Array(n); pbR = new Float32Array(n); pbIdx = new Int32Array(n); }
    }
    function pbColors(boost) {
      const a = KOL.a, key = (a[0] | 0) + ',' + (a[1] | 0) + ',' + (a[2] | 0) + ',' + boost;
      if (key === pbKey) return;
      pbKey = key;
      for (let k = 0; k <= PW; k++) pbStyle[k] = rgba(a, 0.45 * boost + 0.3 * k / PW);
      for (let k = 0; k < LB; k++) lbStyle[k] = rgba(a, 0.5 * (k + 0.5) / LB);
    }

    let mouseT = -1e9, drawT = 0;
    /* Samoregulacja: sredni czas rysowania klatki (EMA). Powyzej 6 ms (slaby procesor: przy 4x CPU
       Start z kursorem ~7 ms) kursor nad mapa nie podbija petli ponad 60 kl./s. Na 60 Hz bez zmian,
       na 120 Hz slabszy laptop dostaje polowe pracy zamiast pelnego rdzenia. */
    let pracaMs = 0, slabyCpu = false;   // histereza: wlacza sie > 6 ms, puszcza < 3 ms

    let lastT = performance.now();
    let rafOn = true;
    function frame(t) {
      const fps = t - mouseT < 1500 && !slabyCpu ? 0 : 30;   // pelne tempo tylko chwile po ruchu kursora
      if (fps) {
        const iv = 1000 / fps, el = t - drawT;
        if (el < iv - 2) { if (rafOn) requestAnimationFrame(frame); return; }
        drawT = el > 2 * iv ? t : drawT + iv;
      } else drawT = t;
      const t0p = performance.now();
      const dt = Math.max(0, Math.min((t - lastT) / 1000, 0.05)) || 0;
      lastT = t;
      const time = t * 0.001;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      // pulse wave: every ~9s a soft front expands from the map centroid and fades out
      let waveR = -1, waveGain = 0;
      if (!stoi) {
        const ph = (time % 9) / 9;
        if (ph < 0.5) {
          const q = ph / 0.5;
          waveR = q * pulse.maxR;
          waveGain = Math.sin(Math.PI * q);
        }
      }

      const RAD = 92, RAD2 = RAD * RAD;
      /* LINK_RAD szerszy niz promien odpychania (RAD=92), zeby lapal pierscien
         czastek osiadly tuz za "fosa", a nie sama wyczyszczona dziure. */
      const LINK_RAD = 140, LINK_RAD2 = LINK_RAD * LINK_RAD;
      nearCount = 0;
      pbFit(); pbCnt.fill(0);
      const mA = mouse.active, mx = mouse.x, my = mouse.y;
      const hovR = mapaW.on ? mapaW.hover : -1;
      // intro: kropki odslaniaja sie fala od srodka mapy (~2 s po wejsciu na Start); bez animacji od razu w calosci
      let revR = 1e9;
      if (mapaW.on && !stoi) {
        const pr = Math.min(1, (t - mapaW.rev0 - 250) / 2000);
        mapaW.rv = pr <= 0 ? 0 : pr;
        if (pr < 1) revR = (pr <= 0 ? 0 : 1 - (1 - pr) * (1 - pr)) * pulse.maxR;
      } else mapaW.rv = 1;
      for (let i = 0; i < PN; i++) {
        let tx = PHX[i], ty = PHY[i];
        if (!stoi) {
          // C (07.10): sinus z tablicy (1024 probki, blad ~0,01 px); Math.sin/cos byly 80% tej petli
          const sp = PSP[i], ph = PPH[i];
          tx += DRYF[((time * sp + ph) * DRYF_K | 0) & 1023];
          ty += DRYF[((time * sp * 0.9 + ph) * DRYF_K + 256 | 0) & 1023];
        }

        let x = PX[i], y = PY[i];
        let vx = PVX[i] + (tx - x) * 0.06;
        let vy = PVY[i] + (ty - y) * 0.06;

        if (mA) {
          const dx = x - mx, dy = y - my;
          const d2 = dx * dx + dy * dy;
          if (d2 < RAD2 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const force = (1 - d / RAD) * 5.5;
            vx += (dx / d) * force;
            vy += (dy / d) * force;
          }
          /* PULSOWANIE MAPY — naprawa 11.09. Bylo: z czastek w promieniu brano 50
             LOSOWYCH (reservoir sampling) i losowano OD NOWA CO KLATKE. W promieniu
             140 px jest ich grubo wiecej niz 50, wiec co klatke wychodzil inny
             podzbior i siec linii migotala 60 razy na sekunde — to bylo to
             "nienaturalne pulsowanie". Teraz: 50 NAJBLIZSZYCH kursorowi, wybierane
             deterministycznie. Ten sam uklad czastek daje ten sam zestaw, wiec siec
             jest spokojna i plynnie jedzie za kursorem, zamiast migac.
             Wstawianie do posortowanej listy o stalej dlugosci: bez sortowania
             calosci i bez ani jednej alokacji na klatke. */
          if (d2 < LINK_RAD2) {
            let k;
            if (nearCount < LINK_CAP) k = nearCount++;
            else if (d2 >= nearD2[LINK_CAP - 1]) k = -1;   // dalsza niz najdalsza z juz wybranych
            else k = LINK_CAP - 1;
            if (k >= 0) {
              while (k > 0 && nearD2[k - 1] > d2) {
                nearD2[k] = nearD2[k - 1]; nearMouse[k] = nearMouse[k - 1]; k--;
              }
              nearD2[k] = d2; nearMouse[k] = i;
            }
          }
        }

        vx *= 0.86; vy *= 0.86;
        PVX[i] = vx; PVY[i] = vy; PX[i] = x + vx; PY[i] = y + vy;

        let b = 0, rad = PR[i];
        if (waveR >= 0) {
          const dd = Math.abs(PCD[i] - waveR);
          if (dd < 70) {
            const f = (1 - dd / 70) * waveGain;
            b = Math.min(PW, Math.round(f * PW));
            rad += f * 0.9;
          }
        }
        if (revR < 1e8) { const dd = revR - PCD[i]; if (dd < 0) rad = 0; else if (dd < 36) { b = PW; rad += 0.7; } }
        if (hovR >= 0 && PREG[i] === hovR) { if (b < 4) b = 4; rad += 0.35; }
        pbB[i] = b; pbR[i] = rad; pbCnt[b]++;
      }
      /* P1 (30.09): kropki mapy hurtem. Bylo: fillStyle (nowy string rgba) + beginPath + arc + fill
         NA KAZDA kropke, ~2000 fill na klatke = polowa czasu Startu. Teraz alfa fali skwantowana do
         PW+1 kubelkow (roznica 0,05 krycia, nie do zobaczenia), jedna sciezka i jeden fill na kubelek,
         sortowanie przez zliczanie bez alokacji. Promien zostaje dokladny, per kropka. */
      if (PN) {
        pbColors(mouse.active ? 1 : 0.82);
        for (let k = 0, o = 0; k <= PW; k++) { pbOff[k] = o; o += pbCnt[k]; }
        for (let i = 0; i < PN; i++) pbIdx[pbOff[pbB[i]]++] = i;
        for (let k = 0, o = 0; k <= PW; k++) {
          const n = pbCnt[k]; if (!n) continue;
          ctx.fillStyle = pbStyle[k];
          ctx.beginPath();
          for (let e = o + n; o < e; o++) {
            const i = pbIdx[o], px = PX[i], py = PY[i], r = pbR[i];
            // P1: kropka do 1,5 px promienia jako kwadrat (po wygladzeniu nie do odroznienia od kola, a rect
            // jest kilka razy tanszy od arc); wieksze kropki i fala zostaja kolami
            // C (07.10): wieksze kropki jako krzyz z dwoch prostokatow (osmiokat, po wygladzeniu przy 3-6 px
            // wyglada jak kolo); arc byl polowa skryptu Startu przy 4x CPU, krzyz 2x tanszy. Jedna sciezka,
            // nonzero: zachodzace prostokaty sie sumuja, nie podwajaja krycia.
            if (r <= 1.5) { const q = r * 0.886; ctx.rect(px - q, py - q, 2 * q, 2 * q); }
            else { const a = r * 0.924, c = r * 0.6; ctx.rect(px - a, py - c, 2 * a, 2 * c); ctx.rect(px - c, py - a, 2 * c, 2 * a); }
          }
          ctx.fill();
        }
      }

      mapaDraw(time, mA, mx, my);   // MAPA 2.0: granice, luki miedzy miastami, pakiety, wojewodztwo pod kursorem

      // circuit-link lines: cursor wakes the map into a live neural net, not just glowing dots
      // P1: odcinki w LB kubelkach alfy, jeden stroke na kubelek (bylo: stroke + string na odcinek)
      if (nearCount > 1) {
        let n = 0;
        for (let i = 0; i < nearCount; i++) {
          const a = nearMouse[i], ax = PX[a], ay = PY[a];
          for (let j = i + 1; j < nearCount; j++) {
            const q = nearMouse[j], qx = PX[q], qy = PY[q];
            const dx = ax - qx, dy = ay - qy;
            const d2 = dx * dx + dy * dy;
            if (d2 >= 1600) continue;
            const o = n * 5;
            lbSeg[o] = ax; lbSeg[o + 1] = ay; lbSeg[o + 2] = qx; lbSeg[o + 3] = qy;
            lbSeg[o + 4] = Math.min(LB - 1, ((1 - Math.sqrt(d2) / 40) * LB) | 0);
            n++;
          }
        }
        ctx.lineWidth = 1;
        for (let k = 0; k < LB; k++) {
          let any = false;
          for (let s = 0; s < n; s++) {
            const o = s * 5;
            if (lbSeg[o + 4] !== k) continue;
            if (!any) { any = true; ctx.beginPath(); }
            ctx.moveTo(lbSeg[o], lbSeg[o + 1]);
            ctx.lineTo(lbSeg[o + 2], lbSeg[o + 3]);
          }
          if (any) { ctx.strokeStyle = lbStyle[k]; ctx.stroke(); }
        }
      }

      // iskry: kilkanascie drobin unoszacych sie poza mapa
      for (let i = 0; i < sparks.length; i++) {
        const s = sparks[i];
        s.y -= s.vy * dt * 120;
        if (s.y < -10) newSpark(s, false);
        const sx = s.x + Math.sin(time * s.sp + s.ph) * s.amp;
        ctx.fillStyle = rgba(KOL.hot, s.a);
        ctx.beginPath();
        ctx.arc(sx, s.y, s.r, 0, 6.2832);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
      if (stoi) liteUspij(t);
      klatkaKoniec(t0p);
    }
    /* LITE: mapa ulozona, przejscie warstw skonczone, nikt nie dotyka -> petla staje, na plotnie zostaje
       ostatnia klatka. liteSpi trzyma ja zatrzymana takze wtedy, gdy ustawPetleMapy chcialby ja wznowic. */
    function liteBudz() {
      liteOd = performance.now();
      if (liteSpi) { liteSpi = false; ustawPetleMapy(); }
    }
    function liteUspij(t) {
      if (t - liteOd < 1200 || t - mouseT < 1500 || mouse.active || (mapaW.tap && t * 0.001 - mapaW.tap.t < 3.2)) return;
      liteSpi = true; rafOn = false;
    }
    function klatkaKoniec(t0p) {
      pracaMs += (performance.now() - t0p - pracaMs) * 0.05;
      if (pracaMs > 6) slabyCpu = true; else if (pracaMs < 3) slabyCpu = false;
      if (rafOn) requestAnimationFrame(frame);
    }
    /* Petla mapy chodzi tylko wtedy, gdy mape widac.
       Dwa powody stopu, jeden wylacznik: ukryta karta (jak dotad) ORAZ — od M4.1 —
       zjechanie z hero, bo mapa nie siega juz dalej niz hero. Odzyskane klatki
       to nie teoria: pod hero nie ma juz nic do liczenia. */
    let tloWidoczne = true;
    function ustawPetleMapy() {
      const maBiec = tloWidoczne && !document.hidden;
      // LITE: uspiona petla zostaje uspiona (klasa mapa-biegnie bez zmian, zeby pasek nie zmienial wygladu)
      if (maBiec && !rafOn && !liteSpi) { rafOn = true; lastT = performance.now(); requestAnimationFrame(frame); }
      else if (!maBiec) { rafOn = false; }
      /* PASEK 03.10: nad pracujaca mapa szklo paska przeliczaloby rozmycie w kazdej klatce
         (zmierzone 4x CPU: 6-7 przycietych klatek na Starcie, bez tego 0) — wtedy pasek jest pelny */
      document.documentElement.classList.toggle('mapa-biegnie', maBiec);
    }
    document.addEventListener('visibilitychange', ustawPetleMapy);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((wpisy) => {
        tloWidoczne = wpisy.some(w => w.isIntersecting);
        /* SZYBKOSC S4: glitchFlick na h1 hero mrugal dalej poza ekranem (CSS na watku glownym, zmierzone
           29 ms CPU/s na telefonie pod hero, gdy nic innego nie pracuje). Hero poza kadrem = animacja stoi. */
        document.documentElement.classList.toggle('hero-poza', !tloWidoczne);
        ustawPetleMapy();
      }, { threshold: 0 }).observe(stage);
    }

    // interaction — tracked on window so the SPA views layered above never block it
    function setMouse(e) {
      const r = canvas.getBoundingClientRect();
      const src = e.touches ? e.touches[0] : e;
      mouse.x = src.clientX - r.left;
      mouse.y = src.clientY - r.top;
      mouse.active = true;
      mouseT = performance.now();   // P1: pelne tempo petli tylko chwile po ruchu kursora
      if (stoi) liteBudz();
    }
    window.addEventListener('mousemove', setMouse);
    window.addEventListener('touchmove', setMouse, { passive: true });
    window.addEventListener('mouseout', (e) => {
      if (!e.relatedTarget) { mouse.active = false; mouse.x = mouse.y = -9999; }
    });
    window.addEventListener('touchend', () => { mouse.active = false; });
    // MAPA 2.0: dotyk zamiast hovera. Tap na mape = wojewodztwo i najblizsze miasto swieca ~3 s; pionowy swipe dalej przewija
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || !mapaW.on) return;
      const r = canvas.getBoundingClientRect();
      mapaW.tap = { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() * 0.001 };
      mapaW.hx = -1e9;
      mouseT = performance.now();
      if (stoi) liteBudz();
    }, { passive: true });
    /* ---------- start mapy i zmiana rozmiaru ---------- */
    let rzT = 0, rzW = 0, rzH = 0;
    function przebuduj() {
      const r = stage.getBoundingClientRect();
      if (!r.width || (Math.abs(r.width - rzW) < 1 && Math.abs(r.height - rzH) < 1)) return;   // pasek adresu na telefonie nie przebudowuje mapy
      rzW = r.width; rzH = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      buildParticles();
      buildSparks();
    }
    const poZmianie = () => { clearTimeout(rzT); rzT = setTimeout(przebuduj, 160); };
    if ('ResizeObserver' in window) new ResizeObserver(poZmianie).observe(stage);
    else window.addEventListener('resize', poZmianie);
    // podpisy miast rysują się do bufora raz: po wczytaniu kroju mono bufor powstaje od nowa
    if (document.fonts && document.fonts.load) {
      document.fonts.load('500 18px "Geist Mono"').then(() => { if (W) { mapaStatBuduj(); if (stoi) liteBudz(); } }, () => {});
    }
    // start w osobnym zadaniu: definicje wyżej nie blokują pierwszego malowania
    const ustap = () => (window.scheduler && typeof scheduler.yield === 'function') ? scheduler.yield() : new Promise((r) => setTimeout(r, 0));
    ustap().then(() => { przebuduj(); requestAnimationFrame(frame); });
  }
})();
