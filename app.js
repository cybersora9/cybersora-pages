/* app.js — wyniesione z index.html 23.09 (BEZPIECZENSTWO modul 5: CSP bez 'unsafe-inline').
   Dawny blok 1: mapa czastek, nawigacja/widoki (NAMES, go()), formularze, Web3Forms.
   Laduje sie zwyklym <script src> w tym samym miejscu co dawny blok inline — kolejnosc wykonania bez zmian. */
(() => {
  /* ===================== particle map (unchanged geometry) ===================== */
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

  const _lons = POLAND_LL.map(p => p[0]);
  const _lats = POLAND_LL.map(p => p[1]);
  const _lonMin = Math.min(..._lons), _lonMax = Math.max(..._lons);
  const _latMin = Math.min(..._lats), _latMax = Math.max(..._lats);
  const _kx = Math.cos(((_latMin + _latMax) / 2) * Math.PI / 180);
  const OUTLINE = POLAND_LL.map(([lon, lat]) => [
    (lon - _lonMin) * _kx,
    (_latMax - lat)
  ]);
  const RAW_W = (_lonMax - _lonMin) * _kx;
  const RAW_H = (_latMax - _latMin);

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  let particles = [];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const mouse = { x: -9999, y: -9999, active: false };

  /* ===================== route themes — JEDEN KOLOR (krwisty) na wszystkich trasach =====================
     Kolory a/hot sa juz identyczne na kazdej trasie (decyzja 10.09, patrz komentarz w CSS).
     Rozni sie tylko `layers` — czyli KTORY efekt tla chodzi na danej podstronie
     (iskry / siec / siatka / plyn / skan). To nie kolor, tylko ruch, wiec zostaje.
     Wygaszenie takze tej roznicy = wpisac wszedzie te sama mape `layers`. */
  const THEMES = {
    start:     { a: [225, 29, 51],  hot: [255, 58, 82],   layers: { spark: 1, net: 0, grid: 0, fluid: 0, scan: 0 } },
    products:  { a: [225, 29, 51],  hot: [255, 58, 82],   layers: { spark: 0, net: 0, grid: 0, fluid: 0, scan: 1 } },
    somi:      { a: [225, 29, 51],  hot: [255, 58, 82],   layers: { spark: 0, net: 1, grid: 0, fluid: 0, scan: 0 } },
    onas:      { a: [225, 29, 51],  hot: [255, 58, 82],   layers: { spark: 0, net: 0, grid: 1, fluid: 0, scan: 0 } },
    sztuka:    { a: [225, 29, 51],  hot: [255, 58, 82],   layers: { spark: 0, net: 0, grid: 1, fluid: 0, scan: 0 } },
    rnd:       { a: [225, 29, 51],  hot: [255, 58, 82],   layers: { spark: 0, net: 0, grid: 0, fluid: 1, scan: 0 } },
    contact:   { a: [225, 29, 51],  hot: [255, 58, 82],   layers: { spark: 1, net: 0, grid: 0, fluid: 0, scan: 0 } },
    polityka:  { a: [225, 29, 51],  hot: [255, 58, 82],   layers: { spark: 1, net: 0, grid: 0, fluid: 0, scan: 0 } }
  };
  let themeTarget = THEMES.start;
  // blended state eases toward the target — particles are recoloured, never rebuilt
  const themeState = {
    a: [225, 29, 51], hot: [255, 58, 82],
    layers: { spark: 1, net: 0, grid: 0, fluid: 0, scan: 0 }
  };
  const lerp = (x, y, t) => x + (y - x) * t;
  function themeApproach(dt) {
    const k = reduce ? 1 : 1 - Math.exp(-dt * 4.2);
    for (let i = 0; i < 3; i++) {
      themeState.a[i] = lerp(themeState.a[i], themeTarget.a[i], k);
      themeState.hot[i] = lerp(themeState.hot[i], themeTarget.hot[i], k);
    }
    for (const key in themeState.layers)
      themeState.layers[key] = lerp(themeState.layers[key], themeTarget.layers[key], k);
  }
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
    const rect = stage.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const route = document.documentElement.dataset.route;
    const uzyjMapy = !route || route === 'start';

    let mapW, mapH, scale;
    if (uzyjMapy) {
      mapH = Math.min(H * 0.72, W * 0.62);
      scale = mapH / RAW_H;
      mapW = RAW_W * scale;
    } else {
      mapW = mapH = 0;
    }
    const offX = (W - mapW) / 2;
    const offY = (H - mapH) / 2;

    mapBox.x = offX; mapBox.y = offY; mapBox.w = mapW; mapBox.h = mapH;
    pulse.cx = offX + mapW / 2;
    pulse.cy = offY + mapH / 2;
    pulse.maxR = Math.hypot(mapW, mapH) / 2 + 60;

    if (!uzyjMapy) { particles = []; return; }

    const rw = Math.max(1, Math.ceil(mapW));
    const rh = Math.max(1, Math.ceil(mapH));
    const off = document.createElement('canvas');
    off.width = rw; off.height = rh;
    const octx = off.getContext('2d');
    octx.fillStyle = '#000';
    octx.beginPath();
    OUTLINE.forEach(([x, y], i) => {
      const px = x * scale, py = y * scale;
      i ? octx.lineTo(px, py) : octx.moveTo(px, py);
    });
    octx.closePath();
    octx.fill();
    const data = octx.getImageData(0, 0, rw, rh).data;

    const step = Math.max(6, Math.round(mapH / 78));
    const pts = [];
    for (let y = 0; y < rh; y += step) {
      for (let x = 0; x < rw; x += step) {
        const jx = x + (Math.random() - 0.5) * step * 0.7;
        const jy = y + (Math.random() - 0.5) * step * 0.7;
        const sx = Math.min(rw - 1, Math.max(0, jx | 0));
        const sy = Math.min(rh - 1, Math.max(0, jy | 0));
        if (data[(sy * rw + sx) * 4 + 3] > 128) {
          pts.push({
            hx: offX + jx, hy: offY + jy,
            x: offX + jx, y: offY + jy,
            vx: 0, vy: 0,
            ph: Math.random() * Math.PI * 2,
            sp: 0.6 + Math.random() * 0.9,
            r: 0.9 + Math.random() * 1.1,
            cd: Math.hypot(offX + jx - pulse.cx, offY + jy - pulse.cy)
          });
        }
      }
    }
    particles = pts;
  }

  /* ===================== sparks — rare embers drifting up, away from the map ===================== */
  const SPARK_N = 14;
  let sparks = [];

  function offMap(x, y) {
    return !(x > mapBox.x - 20 && x < mapBox.x + mapBox.w + 20 &&
             y > mapBox.y - 20 && y < mapBox.y + mapBox.h + 20);
  }

  function newSpark(seed) {
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
    return {
      x, y,
      r: 0.6 + Math.random() * 0.8,
      a: 0.15 + Math.random() * 0.25,
      vy: 0.1 + Math.random() * 0.25,
      amp: 6 + Math.random() * 14,
      ph: Math.random() * Math.PI * 2,
      sp: 0.3 + Math.random() * 0.5
    };
  }

  function buildSparks() {
    sparks = [];
    if (reduce) return;
    for (let i = 0; i < SPARK_N; i++) sparks.push(newSpark(true));
  }

  /* ===================== chips — drifting product-glyph outlines, hero-level Produkty accent ===================== */
  const CHIP_N = 9;
  let chips = [];
  function newChip() {
    let x = 0, y = 0;
    for (let i = 0; i < 8; i++) {
      x = Math.random() * W; y = Math.random() * H;
      if (offMap(x, y)) break;
    }
    return {
      x, y, r: 5 + Math.random() * 4,
      ph: Math.random() * Math.PI * 2,
      sp: 0.15 + Math.random() * 0.2,
      amp: 10 + Math.random() * 18,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.3
    };
  }
  function buildChips() {
    chips = [];
    if (reduce) return;
    for (let i = 0; i < CHIP_N; i++) chips.push(newChip());
  }

  /* Bufory pod linie laczace. Alokowane RAZ, nie co klatke: pętla mapy jest
     goraca, a tablica tworzona 60 razy na sekunde to smieci dla GC. */
  const LINK_CAP = 50;
  const nearMouse = new Array(LINK_CAP);
  const nearD2 = new Float64Array(LINK_CAP);
  let nearCount = 0;

  let lastT = performance.now();
  let rafOn = true;
  function frame(t) {
    const dt = Math.max(0, Math.min((t - lastT) / 1000, 0.05)) || 0;
    lastT = t;
    themeApproach(dt);
    ctx.clearRect(0, 0, W, H);
    const time = t * 0.001;
    ctx.globalCompositeOperation = 'lighter';

    // pulse wave: every ~9s a soft front expands from the map centroid and fades out
    let waveR = -1, waveGain = 0;
    if (!reduce) {
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
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      let tx = p.hx, ty = p.hy;
      if (!reduce) {
        tx += Math.sin(time * p.sp + p.ph) * 1.6;
        ty += Math.cos(time * p.sp * 0.9 + p.ph) * 1.6;
      }

      p.vx += (tx - p.x) * 0.06;
      p.vy += (ty - p.y) * 0.06;

      if (mouse.active) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < RAD2 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const force = (1 - d / RAD) * 5.5;
          p.vx += (dx / d) * force;
          p.vy += (dy / d) * force;
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
            nearD2[k] = d2; nearMouse[k] = p;
          }
        }
      }

      p.vx *= 0.86; p.vy *= 0.86;
      p.x += p.vx; p.y += p.vy;

      const boost = mouse.active ? 1 : 0.82;
      let alpha = 0.45 * boost, rad = p.r;
      if (waveR >= 0) {
        const dd = Math.abs(p.cd - waveR);
        if (dd < 70) {
          const f = (1 - dd / 70) * waveGain;
          alpha += f * 0.3;
          rad += f * 0.9;
        }
      }
      ctx.fillStyle = rgba(themeState.a, alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, rad, 0, 6.2832);
      ctx.fill();
    }

    // circuit-link lines: cursor wakes the map into a live neural net, not just glowing dots
    if (nearCount > 1) {
      ctx.lineWidth = 1;
      for (let i = 0; i < nearCount; i++) {
        for (let j = i + 1; j < nearCount; j++) {
          const dx = nearMouse[i].x - nearMouse[j].x, dy = nearMouse[i].y - nearMouse[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 40 * 40) {
            const al = (1 - Math.sqrt(d2) / 40) * 0.5;
            ctx.strokeStyle = rgba(themeState.a, al);
            ctx.beginPath();
            ctx.moveTo(nearMouse[i].x, nearMouse[i].y);
            ctx.lineTo(nearMouse[j].x, nearMouse[j].y);
            ctx.stroke();
          }
        }
      }
    }

    // second, feather-light pass: the embers
    for (let i = 0; i < sparks.length; i++) {
      const s = sparks[i];
      s.y -= s.vy;
      if (s.y < -10) Object.assign(s, newSpark(false));
      const sx = s.x + Math.sin(time * s.sp + s.ph) * s.amp;
      ctx.fillStyle = rgba(themeState.hot, s.a);
      ctx.beginPath();
      ctx.arc(sx, s.y, s.r, 0, 6.2832);
      ctx.fill();
    }

    // third pass: drifting product-chip outlines, only visible while the Produkty theme is active/blending in
    const chipW = themeState.layers.scan;
    if (chipW > 0.02) {
      for (let i = 0; i < chips.length; i++) {
        const c = chips[i];
        const cx = c.x + Math.sin(time * c.sp + c.ph) * c.amp;
        const cy = c.y + Math.cos(time * c.sp * 0.8 + c.ph) * c.amp * 0.6;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(c.rot + time * c.spin);
        ctx.strokeStyle = rgba(themeState.hot, 0.35 * chipW);
        ctx.lineWidth = 1.2;
        ctx.strokeRect(-c.r, -c.r * 0.7, c.r * 2, c.r * 1.4);
        ctx.restore();
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    if (rafOn) requestAnimationFrame(frame);
  }
  /* Petla mapy chodzi tylko wtedy, gdy mape widac.
     Dwa powody stopu, jeden wylacznik: ukryta karta (jak dotad) ORAZ — od M4.1 —
     zjechanie z hero, bo mapa nie siega juz dalej niz hero. Odzyskane klatki
     to nie teoria: pod hero nie ma juz nic do liczenia. */
  let tloWidoczne = true;
  function ustawPetleMapy() {
    const maBiec = tloWidoczne && !document.hidden;
    if (maBiec && !rafOn) { rafOn = true; lastT = performance.now(); requestAnimationFrame(frame); }
    else if (!maBiec) { rafOn = false; }
  }
  document.addEventListener('visibilitychange', ustawPetleMapy);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((wpisy) => {
      tloWidoczne = wpisy.some(w => w.isIntersecting);
      ustawPetleMapy();
    }, { threshold: 0 }).observe(stage);
  }

  /* Warstwa tla ma byc dokladnie tak wysoka, jak hero AKTYWNEGO widoku.
     Hero ma min-height:100svh, ale na waskim ekranie tresc potrafi je wydluzyc
     — wiec mierzymy, zamiast wpisywac 100svh na sztywno. */
  function dopasujTloDoHero() {
    const widok = document.querySelector('.view:not([hidden])');
    const hero = widok && widok.querySelector('.hero');
    if (!hero) return;
    const h = Math.round(hero.getBoundingClientRect().height);
    if (h > 0) stage.style.height = h + 'px';
  }

  // interaction — tracked on window so the SPA views layered above never block it
  function setMouse(e) {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    mouse.x = src.clientX - r.left;
    mouse.y = src.clientY - r.top;
    mouse.active = true;
  }
  window.addEventListener('mousemove', setMouse);
  window.addEventListener('touchmove', setMouse, { passive: true });
  window.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget) { mouse.active = false; mouse.x = mouse.y = -9999; }
  });
  window.addEventListener('touchend', () => { mouse.active = false; });

  /* ===================== glass nav + magic-line + SPA routing ===================== */
  const bar = document.querySelector('.nav__bar');
  const linksWrap = document.getElementById('navlinks');
  const magic = document.querySelector('.nav__magic');
  const burger = document.querySelector('.nav__burger');
  const links = [...bar.querySelectorAll('.nav__link')];
  const views = [...document.querySelectorAll('.view')];
  const NAMES = ['start', 'oferta', 'products', 'somi', 'onas', 'sztuka', 'rnd', 'contact', 'polityka'];

  /* PRODUKTY SCHOWANE (11.09, prosba maisy: "schowalbym te produkty poki co").
     Nic nie jest kasowane: sekcja, karty, trasa i przyciski zostaja w kodzie —
     znika tylko kazde WEJSCIE do nich (link w pasku, CTA na stronie glownej,
     link w stopce) i samo wejscie po adresie #products.
     POWROT = jedno slowo nizej na true, nic wiecej.
     Powod praktyczny stoi w PLAN_STRONY: 32 z 38 przyciskow Gumroada prowadza
     w blad, wiec dzisiaj kazde wejscie na Produkty konczy sie bledem. */
  const PRODUKTY_WIDOCZNE = false;
  if (!PRODUKTY_WIDOCZNE) {
    /* Nie tylko linki: rowniez blok "Top produkty" na stronie glownej, ktory ma
       wlasne przyciski "Kup na Gumroad" i po samym schowaniu trasy zostawal
       widoczny (zlapane 11.09 przy ogladaniu calej strony). */
    document.querySelectorAll('[data-nav="products"], [data-produkty]')
      .forEach(el => { el.hidden = true; });
  }

  /* ===== SOCJALE =====
     JEDYNE miejsce z adresami. Wpisz adres miedzy apostrofy i ikona sama sie
     odblokuje; zostaw pusty, a zostanie wygaszona i nieklikalna. Nie wpisuje
     tu nic z glowy: link do profilu, ktorego nie potwierdzil czlowiek, jest
     gorszy niz brak linku. */
  /* Handle wziete z BANERA FACEBOOKOWEGO cybersory (maisa pokazala go 11.09):
     "GITHUB cybersora9 · LINKEDIN cybersora · INSTAGRAM cybersora9 ·
     FACEBOOK cybersora". Same adresy SKLADAM z handle wedlug standardowego
     wzoru kazdego serwisu — czyli to jedyny krok, ktorego maisa nie potwierdzila
     wprost. DO KLIKNIECIA I SPRAWDZENIA, zwlaszcza Facebook: ta strona powstala
     z przerobienia starej strony Apex North i mogla zachowac stary adres. */
  const SOCJALE = {
    facebook:  'https://www.facebook.com/cybersora',
    instagram: 'https://www.instagram.com/cybersora9',
    linkedin:  'https://www.linkedin.com/in/cybersora',
    github:    'https://github.com/cybersora9'
  };

  /* ===== WEB3FORMS =====
     Klucz jest PUBLICZNY z zalozenia (widoczny w kazdym zadaniu wyslanym
     z przegladarki) — kto go pozna, moze najwyzej wyslac maila na adres
     cybersora@zohomail.eu, tak jak kazdy, kto zna ten adres. Zero skryptu
     Web3Forms na stronie: to nasz wlasny fetch do ich API, nie ich kod. */
  const WEB3FORMS_KEY = 'c4523b4b-92d5-4d0e-ac9b-e7c4de8b4000';
  async function wyslijDoWeb3Forms(payload) {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(Object.assign({ access_key: WEB3FORMS_KEY }, payload))
    });
    return res.json();
  }
  document.querySelectorAll('.soc').forEach(el => {
    const adres = SOCJALE[el.dataset.soc];
    if (!adres) return;                      // zostaje wygaszona
    el.href = adres;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
    el.removeAttribute('aria-disabled');
    el.removeAttribute('title');
  });

  function activeLink() { return links.find(l => l.classList.contains('is-active')); }

  function moveMagic(el) {
    if (!el) { magic.style.opacity = '0'; return; }
    const cr = linksWrap.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    magic.style.width = r.width + 'px';
    magic.style.transform = 'translateX(' + (r.left - cr.left) + 'px)';
    magic.style.opacity = '1';
  }

  function closeMenu() {
    linksWrap.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  }

  function go(view, push) {
    const apply = () => {
      if (!NAMES.includes(view)) view = 'start';
      if (view === 'products' && !PRODUKTY_WIDOCZNE) view = 'start';   // patrz PRODUKTY_WIDOCZNE
      // route theme: CSS switches via data-route, both canvases via themeTarget
      document.documentElement.dataset.route = view;
      themeTarget = THEMES[view] || THEMES.start;
      views.forEach(v => { v.hidden = (v.dataset.view !== view); });
      links.forEach(l => {
        const on = l.dataset.nav === view;
        l.classList.toggle('is-active', on);
        if (on) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current');
      });
      const deadSwitch = document.querySelector('.brand__second');
      if (deadSwitch) deadSwitch.setAttribute('aria-pressed', view === 'sztuka' ? 'true' : 'false');
      /* zmiana trasy = "coś się dzieje": kula rozbłyska i sama wraca do spokoju.
         Powrót jest tutaj, a nie w SOMI_MOOD, bo to wołający wie, że rozbłysk ma
         być chwilowy — stan 'wow' sam z siebie trwa, dopóki ktoś go nie zdejmie. */
      window.SOMI_MOOD('wow');
      setTimeout(() => window.SOMI_MOOD('calm'), 1200);
      requestAnimationFrame(() => moveMagic(activeLink()));
      closeMenu();
      window.scrollTo(0, 0);
      /* M4.1: kazdy widok ma wlasne hero i wlasna jego wysokosc — tlo i mapa
         musza sie do niego przemierzyc po podmianie widoku, nie przed.
         Mierzymy dwa razy: OD RAZU, zeby wysokosc byla dobra nawet gdyby klatka
         nigdy nie przyszla (karta w tle), i jeszcze raz po klatce, gdy uklad
         nowego widoku jest juz policzony do konca. */
      dopasujTloDoHero();
      requestAnimationFrame(() => {
        dopasujTloDoHero();
        buildParticles();
        buildSparks();
        buildChips();
      });
      if (push !== false && ('#' + view) !== location.hash) {
        history.replaceState(null, '', '#' + view);
      }
    };

    /* 21.09: kazda nawigacja (link, hash, switch "/ deadsora") przechodzi
       przez ten SAM most torn-wipe, patrz PROPOZYCJA_PRZEJSCIA_CYBERPUNK.md.
       Bez wsparcia albo z prefers-reduced-motion: apply() leci od razu,
       DOM i tak sie zmienia — zero regresji, po prostu bez animacji. */
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (document.startViewTransition && !reduceMotion) {
      /* .ready odrzuca sie z InvalidStateError, gdy karta jest w tle w
         momencie klikniecia (np. alt-tab) — apply() i tak sie wykonuje,
         po prostu bez animacji. Bez tego .catch to byl niezlapany wyjatek
         w konsoli (zlapane live: "Transition was aborted... Document
         hidden"). */
      document.startViewTransition(apply).ready.catch(() => {});
    } else {
      apply();
    }
  }

  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      go(el.dataset.nav);
    });
  });

  // magic-line follows hover, snaps back to the active link on leave
  links.forEach(l => l.addEventListener('mouseenter', () => moveMagic(l)));
  linksWrap.addEventListener('mouseleave', () => moveMagic(activeLink()));

  burger.addEventListener('click', () => {
    const open = linksWrap.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  window.addEventListener('hashchange', () => go(location.hash.slice(1), false));

  /* ===================== magnetic links (small reach, soft return) ===================== */
  if (!reduce) {
    links.forEach(l => {
      l.addEventListener('mousemove', (e) => {
        const r = l.getBoundingClientRect();
        const mx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const my = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        l.style.transform = 'translate(' + (mx * 3).toFixed(1) + 'px,' + (my * 2).toFixed(1) + 'px)';
      });
      l.addEventListener('mouseleave', () => { l.style.transform = ''; });
    });

    /* 3D tilt on service/product cards — small perspective rotation that follows the cursor */
    document.querySelectorAll('.card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = 'perspective(700px) rotateX(' + (-py * 8).toFixed(2) + 'deg) rotateY(' + (px * 10).toFixed(2) + 'deg) translateY(-5px)';
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* Byl tu blok .nav__fx — canvas z efektem tla zamknietym w szkle pigulki
     (iskry / siec / siatka / plyn / skan + pierscien na klik w link) plus obwodka
     za kursorem. M1 go wygasil: to ta warstwa animacji, ktora zwalnia miejsce dla
     kuli SOMI w M2 (zasada 4 z PLAN_STRONY.md — najwyzej dwie petle naraz).
     Efekty tla podstron zyja dalej na duzym canvasie #map, nietkniete. */
  /* condense on scroll */
  let navTick = false;
  window.addEventListener('scroll', () => {
    if (navTick) return;
    navTick = true;
    requestAnimationFrame(() => {
      navTick = false;
      bar.classList.toggle('is-condensed', window.scrollY > 40);
    });
  }, { passive: true });

  /* ===================== haki SOMI — jeden kontrakt, dwa ciała =====================
     window.SOMI_MOOD('calm'|'wow') i window.SOMI_PULSE() sterują kulą, ktora zyje
     na stronie SOMI (somiDemoOrb). Kulka w pasku + czat, ktore te haki kiedys
     obslugiwaly bezposrednio (maskotka SVG w .nav__mascot), USUNIETE na prosbe
     maisy, 22.09 — baza zostaje jako pusty kontrakt, zeby modul kuli na koncu
     pliku (ktory ja OWIJA, nie podmienia) mial co wolac. Wolajacy (np. router
     przy zmianie trasy) nie musi wiedziec, ze w pasku juz nic nie siedzi. */
  window.SOMI_MOOD = function () {};
  window.SOMI_PULSE = function () {};

  /* ===================== minimal cart — remembers picks locally, no checkout/payment yet ===================== */
  const CART_KEY = 'cybersora_cart';
  function cartLoad() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; } }
  function cartSave(items) { try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) {} }
  const cartItems = cartLoad();
  function cartMarkAdded(name) {
    // the same product can appear twice (home teaser + full Produkty listing) — keep every copy in sync
    document.querySelectorAll('.prod__addcart[data-product="' + CSS.escape(name) + '"]').forEach(b => {
      b.textContent = 'W koszyku ✓';
      b.classList.add('is-added');
      b.disabled = true;
    });
  }
  document.querySelectorAll('.prod__addcart').forEach(btn => {
    const name = btn.dataset.product;
    if (cartItems.some(i => i.name === name)) cartMarkAdded(name);
    btn.addEventListener('click', () => {
      if (!cartItems.some(i => i.name === name)) {
        cartItems.push({ name, price: Number(btn.dataset.price) });
        cartSave(cartItems);
      }
      cartMarkAdded(name);
    });
  });

  /* ===================== Produkty → SOMI order form: jump straight to the form, not just the top of the page ===================== */
  const orderCta = document.getElementById('orderCta');
  if (orderCta) {
    orderCta.addEventListener('click', () => {
      setTimeout(() => {
        const target = document.getElementById('orderSection');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    });
  }

  /* ===================== Kontakt — form + live terminal preview, hands off to a formatted mailto ===================== */
  (function () {
    const scrollCta = document.getElementById('contactScrollCta');
    const target = document.getElementById('kontakt-formularz');
    if (scrollCta && target) {
      scrollCta.addEventListener('click', (e) => {
        e.preventDefault();
        target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      });
    }

    const form = document.getElementById('contactForm');
    const body = document.getElementById('terminalBody');
    if (!form || !body) return;

    function line(label, value, placeholder) {
      const v = (value || '').trim();
      return '<span class="t-label">' + label + ':</span> ' + (v ? escapeHtml(v) : '<span class="t-muted">' + placeholder + '</span>');
    }
    function escapeHtml(s) {
      return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    }

    function render() {
      const fd = new FormData(form);
      const topicText = form.elements['ctopic'].selectedOptions[0]?.text || '';
      const rows = [
        line('OD', fd.get('cname'), 'czekam na imię…'),
        line('EMAIL', fd.get('cemail'), 'czekam na e-mail…'),
        line('TEL', fd.get('cphone'), '—'),
        line('ŹRÓDŁO', fd.get('csource'), '—'),
        line('TEMAT', fd.get('ctopic') ? topicText : '', 'czekam na wybór…'),
        line('BUDŻET', fd.get('cbudget'), '—'),
        line('TERMIN', fd.get('ctimeline'), '—'),
      ];
      const msg = (fd.get('cmessage') || '').trim();
      body.innerHTML =
        '<span class="t-muted">$ nowe_zgloszenie --od=cybersora.pl</span>\n\n' +
        rows.join('\n') +
        '\n\n<span class="t-label">OPIS:</span>\n' +
        (msg ? escapeHtml(msg) : '<span class="t-muted">zacznij pisać po lewej…</span>') +
        '<span class="t-cursor"></span>\n\n' +
        '<span class="t-muted">--- gotowe do wysłania, kliknij "Wyślij zgłoszenie" ---</span>';
    }

    form.addEventListener('input', render);
    form.addEventListener('change', render);
    render();

    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      if (fd.get('botcheck')) return; // honeypot: bot wypelnil pole niewidoczne dla czlowieka
      if (!fd.get('h-captcha-response')) { alert('Zaznacz proszę hCaptcha.'); return; }
      const topicText = form.elements['ctopic'].selectedOptions[0]?.text || fd.get('ctopic') || '';
      const subject = 'Zgłoszenie ze strony: ' + topicText;
      const b =
        'Od: ' + (fd.get('cname') || '') + '\n' +
        'Email: ' + (fd.get('cemail') || '') + '\n' +
        'Telefon: ' + (fd.get('cphone') || '—') + '\n' +
        'Skąd o nas wie: ' + (fd.get('csource') || '—') + '\n' +
        'Temat: ' + topicText + '\n' +
        'Budżet: ' + (fd.get('cbudget') || '') + '\n' +
        'Termin: ' + (fd.get('ctimeline') || '') + '\n\n' +
        'Opis:\n' + (fd.get('cmessage') || '');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Wysyłanie…';
      try {
        const data = await wyslijDoWeb3Forms({
          subject: subject,
          from_name: fd.get('cname') || 'Zgłoszenie ze strony',
          email: fd.get('cemail') || '',
          message: b,
          'h-captcha-response': fd.get('h-captcha-response') || ''
        });
        if (data.success) {
          body.innerHTML = '<span class="t-label">✔ WYSŁANO</span>\n\n' +
            'Dziękujemy' + (fd.get('cname') ? ', ' + escapeHtml(fd.get('cname')) : '') + '. Odezwiemy się na ' +
            escapeHtml(fd.get('cemail') || '') + '.';
          Array.from(form.elements).forEach(el => el.disabled = true);
          submitBtn.textContent = 'Wysłano ✓';
        } else {
          throw new Error(data.message || 'nieznany błąd');
        }
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Wyślij zgłoszenie →';
        body.innerHTML += '\n\n<span class="t-label">✕ NIE WYSŁANO</span>\n' +
          'Coś nie zagrało — spróbuj jeszcze raz albo napisz prosto na ' +
          '<a class="proof__link" href="mailto:cybersora@zohomail.eu">cybersora@zohomail.eu</a>.';
      }
    });
  })();

  /* ===================== SOMI — custom project order form (no backend yet, so it hands off to a formatted mailto) ===================== */
  const orderForm = document.getElementById('orderForm');
  const orderTerminalBody = document.getElementById('orderTerminalBody');
  if (orderForm) {
    if (orderTerminalBody) {
      const escOrder = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
      const orderLine = (label, value, placeholder) => {
        const v = (value || '').trim();
        return '<span class="t-label">' + label + ':</span> ' + (v ? escOrder(v) : '<span class="t-muted">' + placeholder + '</span>');
      };
      const renderOrder = () => {
        const fd = new FormData(orderForm);
        const typeText = orderForm.elements['type'].selectedOptions[0]?.text || '';
        const msg = (fd.get('desc') || '').trim();
        orderTerminalBody.innerHTML =
          '<span class="t-muted">$ zamowienie_somi --klient=Ty</span>\n\n' +
          orderLine('RODZAJ', fd.get('type') ? typeText : '', 'czekam na wybór…') + '\n' +
          orderLine('BUDŻET', fd.get('budget'), '—') + '\n' +
          orderLine('EMAIL', fd.get('email'), 'czekam na e-mail…') +
          '\n\n<span class="t-label">OPIS:</span>\n' +
          (msg ? escOrder(msg) : '<span class="t-muted">zacznij pisać po lewej…</span>') +
          '<span class="t-cursor"></span>\n\n' +
          '<span class="t-muted">--- gotowe do wysłania, kliknij "Wyślij zapytanie do SOMI" ---</span>';
      };
      orderForm.addEventListener('input', renderOrder);
      orderForm.addEventListener('change', renderOrder);
      renderOrder();
    }

    const orderSubmitBtn = orderForm.querySelector('button[type="submit"]');

    orderForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(orderForm);
      if (fd.get('botcheck')) return; // honeypot
      if (!fd.get('h-captcha-response')) { alert('Zaznacz proszę hCaptcha.'); return; }
      const type = fd.get('type') || '';
      const budget = fd.get('budget') || '';
      const desc = fd.get('desc') || '';
      const email = fd.get('email') || '';
      const subject = 'Zamówienie projektu: ' + type;
      const msg = 'Rodzaj: ' + type + '\nBudżet: ' + budget + '\nEmail kontaktowy: ' + email + '\n\nOpis:\n' + desc;

      orderSubmitBtn.disabled = true;
      orderSubmitBtn.textContent = 'Wysyłanie…';
      try {
        const data = await wyslijDoWeb3Forms({
          subject: subject,
          from_name: 'Zamówienie ze strony',
          email: email,
          message: msg,
          'h-captcha-response': fd.get('h-captcha-response') || ''
        });
        if (data.success) {
          if (orderTerminalBody) {
            orderTerminalBody.innerHTML = '<span class="t-label">✔ WYSŁANO</span>\n\n' +
              'Zapytanie poszło do SOMI. Odezwiemy się na ' + email.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])) + '.';
          }
          Array.from(orderForm.elements).forEach(el => el.disabled = true);
          orderSubmitBtn.textContent = 'Wysłano ✓';
        } else {
          throw new Error(data.message || 'nieznany błąd');
        }
      } catch (err) {
        orderSubmitBtn.disabled = false;
        orderSubmitBtn.textContent = 'Wyślij zapytanie do SOMI →';
        if (orderTerminalBody) {
          orderTerminalBody.innerHTML += '\n\n<span class="t-label">✕ NIE WYSŁANO</span>\n' +
            'Coś nie zagrało — spróbuj jeszcze raz albo napisz prosto na ' +
            '<a class="proof__link" href="mailto:cybersora@zohomail.eu">cybersora@zohomail.eu</a>.';
        }
      }
    });
  }

  /* ===================== SOMI z bliska — demo rozmowy BEZ backendu (18.09) =====================
     Zero tokenow, zero API: trzy pytania i trzy odpowiedzi ze skryptu w tym pliku.
     Kazdy klik przerywa poprzednie pisanie (zatrzymajPisanie), zeby dwa szybkie
     kliki nie dokleily tekstu jeden do drugiego. SOMI_MOOD/PULSE sa wolane
     defensywnie (typeof === 'function'): baza jest zdefiniowana wyzej w tym samym
     skrypcie, wiec w praktyce zawsze istnieja, ale demo ma dzialac nawet gdyby
     kolejnosc skryptow kiedys sie zmienila. */
  (function () {
    const body = document.getElementById('somiDemoBody');
    const buttons = document.querySelectorAll('.somi-demo__q');
    const srlive = document.getElementById('somiDemoSrLive');
    if (!body || !buttons.length) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Trzymamy sie WYLACZNIE faktow juz publicznych na tej stronie (proof__item
    // wyzej: 156 leadow, bramka akceptacji, 131 testow) — SOMI nie obiecuje tu
    // nic ponad to, co strona juz mowi gdzie indziej.
    const SKRYPT_DEMO = {
      robi: {
        q: 'Co robisz?',
        a: 'Na co dzień pracuję w zapleczu cybersory: pilnuję radaru ofert i pomagam zespołowi ogarniać robotę. Tu, na stronie, dopiero się tego uczę — na razie umiem porozmawiać i pokazać, od czego zacząć.'
      },
      dziala: {
        q: 'Jak działasz?',
        a: 'Nie mam jednego mózgu do wszystkiego. Radar skanuje oferty bez przerwy i sam zgłasza, co warte uwagi — już zebrał 156 leadów z jednego skanu. Agent, który pisze kod, ma bramkę akceptacji: nic nie wysyła i nic nie zmienia bez zgody człowieka.'
      },
      zdolna: {
        q: 'Do czego jesteś zdolna?',
        a: 'Już teraz: ta przykładowa rozmowa, tutaj na stronie. W budowie: deep research nad ofertami prosto z czatu i agent, który realnie wykona zadanie — zawsze z Twoją zgodą na końcu.'
      }
    };

    const escDemo = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

    let pisanie = null;
    function zatrzymajPisanie() { if (pisanie) { clearTimeout(pisanie); pisanie = null; } }

    function pisz(tekst, i) {
      if (i === 0) body.innerHTML += '<span id="somiDemoAns"></span><span class="t-cursor"></span>';
      const ans = document.getElementById('somiDemoAns');
      if (!ans) return;
      ans.textContent = tekst.slice(0, i);
      if (i < tekst.length) {
        pisanie = setTimeout(() => pisz(tekst, i + 1), 16 + Math.random() * 22);
      } else {
        pisanie = null;
        const cur = body.querySelector('.t-cursor');
        if (cur) cur.remove();
        if (typeof window.SOMI_MOOD === 'function') window.SOMI_MOOD('calm');
      }
    }

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const wpis = SKRYPT_DEMO[btn.dataset.demo];
        if (!wpis) return;
        zatrzymajPisanie();
        buttons.forEach((b) => b.classList.toggle('is-active', b === btn));

        body.innerHTML = '<span class="t-muted">$ somi --zapytaj "' + escDemo(wpis.q) + '"</span>\n\n';
        // Ogloszenie dla czytnika ekranu idzie RAZEM, calym zdaniem — nie
        // czeka na koniec pisania po literce (patrz CSS .somi-demo__srlive).
        if (srlive) srlive.textContent = wpis.q + ' — ' + wpis.a;
        if (typeof window.SOMI_PULSE === 'function') window.SOMI_PULSE();
        if (typeof window.SOMI_MOOD === 'function') window.SOMI_MOOD('thinking');

        if (reduce) {
          body.innerHTML += escDemo(wpis.a);
          if (typeof window.SOMI_MOOD === 'function') window.SOMI_MOOD('calm');
          return;
        }
        pisanie = setTimeout(() => {
          if (typeof window.SOMI_MOOD === 'function') window.SOMI_MOOD('speaking');
          pisz(wpis.a, 0);
        }, 500);
      });
    });
  })();

  /* ===================== Produkty — category filter rail (catcard buttons) over one shared grid ===================== */
  document.querySelectorAll('.catgrid[role="tablist"]').forEach(bar => {
    const chips = [...bar.querySelectorAll('[data-filter]')];
    const wrap = bar.closest('.services__inner');
    const grid = wrap.querySelector('.cards');
    const emptyMsg = wrap.querySelector('.cards__empty');
    const items = grid ? [...grid.querySelectorAll('[data-category]')] : [];
    // counts next to each title — computed from the grid, not hardcoded, so they can't drift out of sync
    chips.forEach(chip => {
      const key = chip.dataset.filter;
      const n = key === 'all' ? items.length : items.filter(el => el.dataset.category === key).length;
      const countEl = chip.querySelector('.catcard__count');
      if (countEl) countEl.textContent = n;
    });
    chips.forEach(chip => chip.addEventListener('click', () => {
      chips.forEach(c => { c.classList.toggle('is-active', c === chip); c.setAttribute('aria-selected', c === chip ? 'true' : 'false'); });
      const key = chip.dataset.filter;
      let visible = 0;
      items.forEach(el => {
        const show = key === 'all' || el.dataset.category === key;
        el.hidden = !show;
        if (show) visible++;
      });
      if (emptyMsg) emptyMsg.hidden = visible > 0;
    }));
  });

  /* ===================== Vinted Profit Tracker — live demo calculator (mirrors the real arkusz's formula) ===================== */
  document.querySelectorAll('.demo--profit').forEach(demo => {
    const buy = demo.querySelector('.js-pt-buy');
    const sell = demo.querySelector('.js-pt-sell');
    const fees = demo.querySelector('.js-pt-fees');
    const profitEl = demo.querySelector('.js-pt-profit');
    const marginEl = demo.querySelector('.js-pt-margin');
    function calc() {
      const b = parseFloat(buy.value) || 0;
      const s = parseFloat(sell.value) || 0;
      const f = parseFloat(fees.value) || 0;
      const profit = s - b - f;
      const margin = s > 0 ? (profit / s) * 100 : 0;
      profitEl.textContent = profit.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';
      marginEl.textContent = margin.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
      profitEl.style.color = profit < 0 ? '#ff3a52' : '';
    }
    [buy, sell, fees].forEach(inp => inp.addEventListener('input', calc));
    calc();
  });

  /* ===================== Kalkulator rentowności — live demo (próg rentowności / BEP) ===================== */
  document.querySelectorAll('.demo--bep').forEach(demo => {
    const fixed = demo.querySelector('.js-bep-fixed');
    const varCost = demo.querySelector('.js-bep-var');
    const price = demo.querySelector('.js-bep-price');
    const unitsEl = demo.querySelector('.js-bep-units');
    const revenueEl = demo.querySelector('.js-bep-revenue');
    function calc() {
      const f = parseFloat(fixed.value) || 0;
      const v = parseFloat(varCost.value) || 0;
      const p = parseFloat(price.value) || 0;
      const margin = p - v;
      const units = margin > 0 ? Math.ceil(f / margin) : 0;
      const revenue = units * p;
      unitsEl.textContent = (margin > 0 ? units.toLocaleString('pl-PL') : '—') + ' szt.';
      revenueEl.textContent = revenue.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';
    }
    [fixed, varCost, price].forEach(inp => inp.addEventListener('input', calc));
    calc();
  });

  /* ===================== Kalkulator marży Allegro — live demo ===================== */
  document.querySelectorAll('.demo--allegro').forEach(demo => {
    const buy = demo.querySelector('.js-al-buy');
    const sell = demo.querySelector('.js-al-sell');
    const fee = demo.querySelector('.js-al-fee');
    const profitEl = demo.querySelector('.js-al-profit');
    const marginEl = demo.querySelector('.js-al-margin');
    function calc() {
      const b = parseFloat(buy.value) || 0;
      const s = parseFloat(sell.value) || 0;
      const feePct = parseFloat(fee.value) || 0;
      const feeAmount = s * feePct / 100;
      const profit = s - b - feeAmount;
      const margin = s > 0 ? (profit / s) * 100 : 0;
      profitEl.textContent = profit.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';
      marginEl.textContent = margin.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
      profitEl.style.color = profit < 0 ? '#ff3a52' : '';
    }
    [buy, sell, fee].forEach(inp => inp.addEventListener('input', calc));
    calc();
  });

  /* ===================== Kalkulator wyceny strony — live demo ===================== */
  document.querySelectorAll('.demo--wycena').forEach(demo => {
    const hours = demo.querySelector('.js-wy-hours');
    const rate = demo.querySelector('.js-wy-rate');
    const buffer = demo.querySelector('.js-wy-buffer');
    const baseEl = demo.querySelector('.js-wy-base');
    const totalEl = demo.querySelector('.js-wy-total');
    function calc() {
      const h = parseFloat(hours.value) || 0;
      const r = parseFloat(rate.value) || 0;
      const buf = parseFloat(buffer.value) || 0;
      const base = h * r;
      const total = base * (1 + buf / 100);
      baseEl.textContent = base.toLocaleString('pl-PL', { maximumFractionDigits: 0 }) + ' zł';
      totalEl.textContent = total.toLocaleString('pl-PL', { maximumFractionDigits: 0 }) + ' zł';
    }
    [hours, rate, buffer].forEach(inp => inp.addEventListener('input', calc));
    calc();
  });

  /* ===================== Generator haseł — live demo (kryptograficznie bezpieczny generator w przeglądarce) ===================== */
  document.querySelectorAll('.demo--pwgen').forEach(demo => {
    const lengthInp = demo.querySelector('.js-pw-length');
    const upperInp = demo.querySelector('.js-pw-upper');
    const digitsInp = demo.querySelector('.js-pw-digits');
    const symbolsInp = demo.querySelector('.js-pw-symbols');
    const out = demo.querySelector('.js-pw-output');
    const btn = demo.querySelector('.js-pw-generate');
    const LOWER = 'abcdefghijklmnopqrstuvwxyz';
    const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const DIGITS = '0123456789';
    const SYMBOLS = '!@#$%^&*()-_=+';
    function generate() {
      let alphabet = LOWER;
      if (upperInp.checked) alphabet += UPPER;
      if (digitsInp.checked) alphabet += DIGITS;
      if (symbolsInp.checked) alphabet += SYMBOLS;
      const len = Math.max(6, Math.min(64, parseInt(lengthInp.value, 10) || 16));
      const bytes = new Uint32Array(len);
      (window.crypto || window.msCrypto).getRandomValues(bytes);
      let pw = '';
      for (let i = 0; i < len; i++) pw += alphabet[bytes[i] % alphabet.length];
      out.textContent = pw;
    }
    btn.addEventListener('click', generate);
    [lengthInp, upperInp, digitsInp, symbolsInp].forEach(inp => inp.addEventListener('input', generate));
    generate();
  });

  /* ===================== reveal on scroll (once per section) ===================== */
  const revealEls = [...document.querySelectorAll('.reveal')];
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  /* ===================== Sztuka: lightbox galerii (21.09) ===================== */
  (() => {
    const items = [...document.querySelectorAll('.sztuka__item')];
    if (!items.length) return;
    const lb = document.getElementById('sztukaLightbox');
    const lbImg = document.getElementById('sztukaLbImg');
    const btnClose = document.getElementById('sztukaLbClose');
    const btnPrev = document.getElementById('sztukaLbPrev');
    const btnNext = document.getElementById('sztukaLbNext');
    let idx = 0;
    let lastFocus = null;

    function show(i) {
      idx = (i + items.length) % items.length;
      lb.classList.remove('is-ready');
      lbImg.src = items[idx].dataset.full;
      lbImg.alt = items[idx].getAttribute('aria-label') || '';
      requestAnimationFrame(() => lb.classList.add('is-ready'));
    }
    function openAt(i) {
      lastFocus = document.activeElement;
      show(i);
      lb.hidden = false;
      document.body.style.overflow = 'hidden';
      btnClose.focus();
    }
    function close() {
      lb.hidden = true;
      lb.classList.remove('is-ready');
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    }
    items.forEach((el, i) => el.addEventListener('click', () => openAt(i)));
    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', () => show(idx - 1));
    btnNext.addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    window.addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
    });
  })();

  /* ===================== boot ===================== */
  let rz;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      dopasujTloDoHero();
      buildParticles();
      buildSparks();
      buildChips();
      moveMagic(activeLink());
    }, 160);
  });

  dopasujTloDoHero();
  buildParticles();
  buildSparks();
  buildChips();
  go(location.hash.slice(1) || 'start', false);
  requestAnimationFrame(frame);
  // settle the magic-line once fonts/layout are final
  window.addEventListener('load', () => requestAnimationFrame(() => moveMagic(activeLink())));
})();
