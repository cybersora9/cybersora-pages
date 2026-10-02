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
     i z jaka waga. To nie kolor, tylko ruch, wiec zostaje.
     M8 Sesja 1 (29.09): spark = iskry, chips = kontury produktow (dawny mylacy `scan`),
     net = waga M1 Blackwall, bg = waga tla z rejestru BG; pole `bg` wskazuje malarza z BG.
     Martwe `grid`/`fluid` usuniete. Iskry swiecily dotad na KAZDEJ trasie (warstwy nikt
     nie czytal), wiec spark: 1 wszedzie = wyglad bez zmian; tla M8 zdejma je trasa po trasie. */
  const THEMES = {
    start:     { a: [225, 29, 51],  hot: [255, 58, 82],   layers: { spark: 1, net: 0, chips: 0, bg: 0 } },
    oferta:    { a: [225, 29, 51],  hot: [255, 58, 82],   layers: { spark: 0, net: 0, chips: 0, bg: 1 }, bg: 'oferta' },
    products:  { a: [225, 29, 51],  hot: [255, 58, 82],   layers: { spark: 1, net: 0, chips: 1, bg: 0 } },
    somi:      { a: [225, 29, 51],  hot: [255, 58, 82],   layers: { spark: 1, net: 1, chips: 0, bg: 0 }, bg: 'm1' },
    onas:      { a: [225, 29, 51],  hot: [255, 58, 82],   layers: { spark: 0, net: 0, chips: 0, bg: 1 }, bg: 'onas' },
    sztuka:    { a: [225, 29, 51],  hot: [255, 58, 82],   layers: { spark: 1, net: 0, chips: 0, bg: 0 } },
    rnd:       { a: [225, 29, 51],  hot: [255, 58, 82],   layers: { spark: 0, net: 0, chips: 0, bg: 1 }, bg: 'rnd' },
    contact:   { a: [225, 29, 51],  hot: [255, 58, 82],   layers: { spark: 1, net: 0, chips: 0, bg: 0 } },
    polityka:  { a: [225, 29, 51],  hot: [255, 58, 82],   layers: { spark: 1, net: 0, chips: 0, bg: 0 } }
  };
  let themeTarget = THEMES.start;
  // blended state eases toward the target — particles are recoloured, never rebuilt
  const themeState = {
    a: [225, 29, 51], hot: [255, 58, 82],
    layers: { spark: 1, net: 0, chips: 0, bg: 0 }
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

    if (fontsReady) glyphAtlas();   // atlas znakow niezalezny od trasy
    bgBuild();                      // tlo trasy z rejestru BG (na somi: M1)
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
    if (reduce) return;
    for (let i = 0; i < SPARK_N; i++) sparks.push(newSpark({}, true));
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

  /* ===================== wspolne narzedzia tel (M8 Sesja 1, 29.09, wydzielone z M1) =====================
     Kubelki alfy, atlas znakow i datamosh sluza kazdemu tlu z rejestru BG, nie tylko M1.
     Plasko: fillRect/stroke/drawImage, zero shadowBlur i blur, zero alokacji przy malowaniu. */

  /* Kubelki alfy: prostokaty i odcinki zbierane do Float32Array z numerem kubelka, potem
     jeden fillStyle na kubelek, nie na prostokat. Odcinki bez Path2D (nowa sciezka co
     przerysowanie to smieci dla GC): beginPath + moveTo/lineTo + jeden stroke na kubelek. */
  const BK_N = 10;
  let bkR = new Float32Array(5000), bkRn = 0;             // x, y, w, h, kubelek
  let bkS = new Float32Array(5000), bkSn = 0;             // x1, y1, x2, y2, kubelek
  const bkStyle = new Array(BK_N), bkLast = new Int16Array(6).fill(-1);
  let bkHot = '';
  const bkOf = al => Math.min(BK_N - 1, (al * BK_N) | 0);
  function bkPush(x, y, w, h, al) {
    if (al <= 0.004 || h <= 0) return;
    if ((bkRn + 1) * 5 > bkR.length) { const nr = new Float32Array(bkR.length * 2); nr.set(bkR); bkR = nr; }
    const o = bkRn * 5;
    bkR[o] = x; bkR[o + 1] = y; bkR[o + 2] = w; bkR[o + 3] = h; bkR[o + 4] = bkOf(al);
    bkRn++;
  }
  function bkSeg(x1, y1, x2, y2, al) {
    if (al <= 0.004) return;
    if ((bkSn + 1) * 5 > bkS.length) { const ns = new Float32Array(bkS.length * 2); ns.set(bkS); bkS = ns; }
    const o = bkSn * 5;
    bkS[o] = x1; bkS[o + 1] = y1; bkS[o + 2] = x2; bkS[o + 3] = y2; bkS[o + 4] = bkOf(al);
    bkSn++;
  }
  // stringi kolorow kubelkow liczone tylko przy zmianie koloru motywu, nie przy kazdym malowaniu
  function bkColors() {
    const a = themeState.a, hot = themeState.hot;
    let same = true;
    for (let i = 0; i < 3; i++) if (bkLast[i] !== (a[i] | 0) || bkLast[i + 3] !== (hot[i] | 0)) same = false;
    if (same) return;
    for (let i = 0; i < 3; i++) { bkLast[i] = a[i] | 0; bkLast[i + 3] = hot[i] | 0; }
    for (let b = 0; b < BK_N; b++) bkStyle[b] = rgba(b > 7 ? hot : a, (b + 0.5) / BK_N);
    bkHot = rgba(hot, 1);
  }
  function bkFlush(c) {
    bkColors();
    c.lineWidth = 1;
    for (let b = 0; b < BK_N; b++) {
      c.fillStyle = c.strokeStyle = bkStyle[b];
      for (let r = 0; r < bkRn; r++) {
        const o = r * 5;
        if (bkR[o + 4] === b) c.fillRect(bkR[o], bkR[o + 1], bkR[o + 2], bkR[o + 3]);
      }
      let any = false;
      for (let s = 0; s < bkSn; s++) {
        const o = s * 5;
        if (bkS[o + 4] !== b) continue;
        if (!any) { c.beginPath(); any = true; }
        c.moveTo(bkS[o], bkS[o + 1]); c.lineTo(bkS[o + 2], bkS[o + 3]);
      }
      if (any) c.stroke();
    }
    bkRn = bkSn = 0;
  }

  /* atlas znakow (wzor: baner FB cybersory): budowany raz, potem tylko drawImage. Niezalezny od
     trasy: powstaje po document.fonts.load, inaczej znaki zapieklyby sie w foncie zastepczym.
     Geist Mono strony nie ma katakany — ta spada na font systemowy (Yu Gothic / Hiragino), zero CDN. */
  const GLYPHS = [...'0123456789ABCDEFSZXŻÓŁŚĆĄĘŃŹ$@&{}[]<>/\\|+=*#%アイウエオカキクケコサシスセソタチツテトナニハヒフヘホマミムメモヤユヨラリルレロワヲン'];
  const atlas = document.createElement('canvas'), actx = atlas.getContext('2d');
  let fontsReady = false, atlasKey = '', FS = 18, cell = 23;
  function glyphAtlas() {
    FS = W < 600 ? 14 : 18; cell = Math.ceil(FS * 1.25);
    const key = FS + ':' + dpr;
    if (key === atlasKey) return;
    atlasKey = key;
    const c = Math.ceil(cell * dpr);
    atlas.width = c * GLYPHS.length; atlas.height = c * 3;
    actx.setTransform(dpr, 0, 0, dpr, 0, 0);
    actx.font = '500 ' + FS + 'px "Geist Mono", "Yu Gothic", "Hiragino Sans", "MS Gothic", monospace';
    actx.textAlign = 'center'; actx.textBaseline = 'middle';
    const tones = [rgba(THEMES.start.a, 1), rgba(THEMES.start.hot, 1), '#f6f2f3'];   // ogon / czolo / bialy znak na czele
    for (let k = 0; k < 3; k++) {
      actx.fillStyle = tones[k];
      for (let i = 0; i < GLYPHS.length; i++) actx.fillText(GLYPHS[i], i * cell + cell / 2, k * cell + cell / 2);
    }
  }
  const fontsDone = () => { fontsReady = true; atlasKey = ''; if (W) { glyphAtlas(); bgBuild(); } };
  if (document.fonts && document.fonts.load) document.fonts.load('500 18px "Geist Mono"').then(fontsDone, fontsDone);
  else fontsReady = true;

  // datamosh: co ~3 s na 140 ms pozioma wstega gotowej klatki przesuwa sie w bok (twarde ciecie, zero blur)
  const MOSH = { t: 0, y: 0, h: 0, x: 0 };
  const moshOff = document.createElement('canvas'), moshCtx = moshOff.getContext('2d');
  function mosh(dt) {
    MOSH.t -= dt;
    if (MOSH.t < -0.14) {
      MOSH.t = 2 + Math.random() * 2.5;
      MOSH.h = 10 + Math.random() * 40; MOSH.y = Math.random() * (H - MOSH.h);
      MOSH.x = (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 18);
    }
    if (MOSH.t >= 0) return;
    if (moshOff.width !== canvas.width || moshOff.height < Math.ceil(52 * dpr)) { moshOff.width = canvas.width; moshOff.height = Math.ceil(52 * dpr); }
    const sy = Math.floor(MOSH.y * dpr), sh = Math.max(1, Math.floor(MOSH.h * dpr));
    moshCtx.clearRect(0, 0, moshOff.width, sh);
    moshCtx.drawImage(canvas, 0, sy, canvas.width, sh, 0, 0, canvas.width, sh);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, MOSH.y, W, MOSH.h);
    ctx.drawImage(moshOff, 0, 0, canvas.width, sh, MOSH.x, MOSH.y, W, MOSH.h);
  }

  /* Maska tekstu (M8 Sesja 2B). Linie tekstu naglowka widoku mierzone raz na build przez
     Range.getClientRects (prostokat kazdej linii, nie calego bloku). Elipsa z Sesji 1 zostawiala
     rogi opisu bez sufitu: na zrzucie 390 px kontrast spadal do 4,48:1. (a) bgInText: odrzucanie
     spawnu na tekscie, koszt 0. (c) bgMaskOut: destination-out gotowej maski po paint, jeden
     drawImage; jedyna metoda, ktora trzyma sufit krycia pod tekstem takze po sumowaniu w 'lighter'.
     Maska ma wymiar bloku tekstu z marginesem, nie ekranu. Miekka krawedz = zagniezdzone prostokaty
     (raz, przy budowie), bez blur. */
  const TXT_PAD = 6, TXT_F = 22, TXT_FN = 8;
  const TXT = { x: 0, y: 0, w: 0, h: 0, n: 0, r: new Float32Array(160), ok: false };
  const bgMask = document.createElement('canvas'), mctx = bgMask.getContext('2d');
  /* Widok wjezdza animacja viewIn (translateY 10px -> 0, 0,45 s), a build leci w pierwszej klatce trasy:
     pomiar bez poprawki wychodzil do 10 px za nisko (tlo O nas siadalo na kresce faktow). Odejmujemy
     biezace przesuniecie widoku, zeby mierzyc uklad docelowy. */
  function bgViewDy(el) {
    const v = el && el.closest('.view');
    if (!v) return 0;
    const t = getComputedStyle(v).transform;
    return t && t !== 'none' ? new DOMMatrixReadOnly(t).m42 : 0;
  }
  function bgTextMeasure(sel) {
    const el = document.querySelector(sel);
    TXT.ok = false; TXT.n = 0;
    if (!el) return false;
    const rg = document.createRange(); rg.selectNodeContents(el);
    const rs = rg.getClientRects(), st = stage.getBoundingClientRect(), dy = bgViewDy(el);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < rs.length && TXT.n < 40; i++) {
      const q = rs[i];
      if (q.width < 1 || q.height < 1) continue;
      const o = TXT.n * 4, x = q.left - st.left, y = q.top - st.top - dy;
      TXT.r[o] = x; TXT.r[o + 1] = y; TXT.r[o + 2] = q.width; TXT.r[o + 3] = q.height; TXT.n++;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + q.width); y1 = Math.max(y1, y + q.height);
    }
    if (!TXT.n) return false;
    const m = TXT_PAD + TXT_F;
    TXT.x = x0 - m; TXT.y = y0 - m; TXT.w = x1 - x0 + 2 * m; TXT.h = y1 - y0 + 2 * m;
    TXT.ok = true;
    return true;
  }
  function bgInText(x, y) {
    for (let i = 0; i < TXT.n; i++) {
      const o = i * 4;
      if (x > TXT.r[o] - TXT_PAD && x < TXT.r[o] + TXT.r[o + 2] + TXT_PAD &&
          y > TXT.r[o + 1] - TXT_PAD && y < TXT.r[o + 1] + TXT.r[o + 3] + TXT_PAD) return true;
    }
    return false;
  }
  function bgMaskBuild() {   // raz na build, po bgTextMeasure
    if (!TXT.ok) return;
    const w = Math.ceil(TXT.w * dpr), h = Math.ceil(TXT.h * dpr);
    if (bgMask.width !== w || bgMask.height !== h) { bgMask.width = w; bgMask.height = h; }
    mctx.setTransform(dpr, 0, 0, dpr, -TXT.x * dpr, -TXT.y * dpr);
    mctx.clearRect(TXT.x, TXT.y, TXT.w, TXT.h);
    mctx.fillStyle = '#000';
    // warstwy od najszerszej: kazda doklada krycie, rdzen (linia + TXT_PAD) konczy na pelnym
    for (let s = TXT_FN; s >= 0; s--) {
      const e = TXT_PAD + TXT_F * s / TXT_FN;
      mctx.globalAlpha = s ? 1 / (TXT_FN + 1) : 1;
      for (let i = 0; i < TXT.n; i++) {
        const o = i * 4;
        mctx.fillRect(TXT.r[o] - e, TXT.r[o + 1] - e, TXT.r[o + 2] + 2 * e, TXT.r[o + 3] + 2 * e);
      }
    }
    mctx.globalAlpha = 1;
  }
  function bgMaskOut(c, k) {   // k: jaka czesc krycia zdjac pod tekstem (0..1)
    if (!TXT.ok) return;
    c.globalCompositeOperation = 'destination-out'; c.globalAlpha = k;
    c.drawImage(bgMask, TXT.x, TXT.y, TXT.w, TXT.h);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }

  /* ===================== silnik tel podstron (M8 Sesja 1, 29.09) =====================
     Rejestr BG = { id: { build(W,H), paint(c,time,age,op), live?(ctx,dt,time,op), fps, comp, layer? } }.
     Trasa wskazuje malarza polem THEMES[trasa].bg; waga = themeState.layers[layer || 'bg'].
     Bufor offscreen przerysowywany max fps razy/s (logika `due`), na klatke jeden drawImage.
     fps: 0 = malowane raz z op=1, waga warstwy idzie przez globalAlpha.
     DWA SLOTY: przy zmianie trasy biezacy bufor przechodzi do bgPrev i ZAMARZA (zadnego paint,
     tylko globalAlpha + drawImage we wlasnym wymiarze, wygaszanie k=8/s). Dotad M1 malowala dalej
     do bufora starego wymiaru przez ~0,9 s wygaszania warstwy i drawImage rozciagal ja do nowego
     hero (390 px: 96 klatek). Pula dwoch canvasow, realokacja tylko przy innym wymiarze. */
  const BG = {};
  const bgSlot = () => { const cv = document.createElement('canvas'); return { cv, cx: cv.getContext('2d'), w: 0, h: 0 }; };
  let bgCur = bgSlot(), bgPrev = bgSlot();
  let bgId = '', bgOn = false, bgT0 = 0, bgT = -1, bgPrevA = 0, bgPrevComp = 'source-over';
  function bgFit(s) {
    const pw = Math.floor(W * dpr), ph = Math.floor(H * dpr);
    if (s.cv.width !== pw || s.cv.height !== ph) { s.cv.width = pw; s.cv.height = ph; }
    else s.cx.clearRect(0, 0, pw, ph);
    s.w = W; s.h = H;
    s.cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  // z buildParticles: resize, wejscie na trase, po klatce ukladu
  function bgBuild() {
    bgId = themeTarget.bg || '';
    const p = BG[bgId];
    if (!p) return;
    bgFit(bgCur); p.build(W, H); bgT = -1;
  }
  // z go(), zanim nowe hero zmieni wymiar sceny
  function bgLeave() {
    const p = BG[bgId];
    if (p && bgOn) {
      const s = bgCur; bgCur = bgPrev; bgPrev = s;
      bgPrevA = reduce ? 0 : 1; bgPrevComp = p.comp;
    }
    bgId = ''; bgOn = false;
  }
  function bgDraw(dt, time) {
    if (bgPrevA > 0.02) {
      ctx.globalCompositeOperation = bgPrevComp; ctx.globalAlpha = bgPrevA;
      ctx.drawImage(bgPrev.cv, 0, 0, bgPrev.w, bgPrev.h);   // wlasny wymiar: przyciete, nigdy rozciagniete
      ctx.globalAlpha = 1;
      bgPrevA *= Math.exp(-8 * dt);
    } else bgPrevA = 0;
    const p = BG[bgId];
    if (!p) return;
    const w = themeState.layers[p.layer || 'bg'];
    if (w <= 0.02) { bgOn = false; return; }
    if (!bgOn) { bgOn = true; bgT0 = time; bgT = -1; }   // wejscie na widok: tlo sklada sie od nowa
    const age = reduce ? 99 : time - bgT0;
    // przy reduced motion przerysowanie tylko gdy zmienia sie krycie warstwy
    const due = bgT < 0 || time < bgT || (reduce ? w < 0.999 : p.fps > 0 && time - bgT >= 1 / p.fps - 0.004);   // P1: tolerancja jak w tempoPetli, inaczej co druga klatka petli 24/s gubila przerysowanie
    if (due) { bgT = time; p.paint(bgCur.cx, time, age, p.fps ? w : 1); }
    ctx.globalCompositeOperation = p.comp;
    if (!p.fps) ctx.globalAlpha = w;
    ctx.drawImage(bgCur.cv, 0, 0, W, H);
    ctx.globalAlpha = 1;
    if (p.live && !reduce) p.live(ctx, dt, time, w);
  }

  /* ===================== M1 Blackwall — sciana za SOMI (aspekt 11, Sesja 2, 29.09) =====================
     Malarz BG.m1 na warstwie `net` widoku somi. Wzor: makieta_m1_sciana.html.
     Ustawienia maisy (29.09): wariant C (luk + smear + chmura punktow + datamosh), krycie 0,45,
     odstep 6 px, wybrzuszenie za naglowkiem, prazki splywaja; deszcz kodu sredni (55% kolumn),
     cala szerokosc, krycie 0,7. */
  const M1_OP = 0.45, M1_STEP = 6, M1_CODE = 0.55, M1_CODE_OP = 0.7;
  const M1 = { n: 0, bx: 0, by: 0, R: 1, bulgeOk: false, pc: [] };

  // odchylenie poziome w wybrzuszeniu: prazki rozchodza sie od srodka, jakby cos napieralo zza sciany
  function m1Bend(x, y, amp) {
    const u = (x - M1.bx) / M1.R, t = (y - M1.by) / (M1.R * 1.4);
    const e = t * t >= 1 ? 0 : (1 - t * t) * (1 - t * t);   // okno zerowe na brzegu strefy: bez skoku
    return Math.sign(u) * amp * Math.abs(u) * Math.exp(-u * u) * 2.33 * e;
  }
  /* Tablice wybrzuszenia liczone raz na pomiar (m1Measure), nie w petli: m1Bend rozpada sie na
     czynnik kolumny (fx) i czynnik wiersza (ey), a rozjasnienie na gy. W strefie jest ~18 tys.
     odcinkow na przerysowanie; trzy Math.exp na odcinek kosztowaly 7 ms przy 4x CPU. */
  function m1Luts() {
    const n = Math.max(2, Math.ceil(H) + 2);
    M1.ey = new Float32Array(n); M1.gy = new Float32Array(n);
    for (let y = 0; y < n; y++) {
      const t = (y - M1.by) / (M1.R * 1.4), dy = (y - M1.by) / M1.R;
      M1.ey[y] = t * t >= 1 ? 0 : (1 - t * t) * (1 - t * t);
      M1.gy[y] = Math.exp(-dy * dy);
    }
    M1.fx = new Float32Array(M1.n);
    for (let i = 0; i < M1.n; i++) {
      const u = (M1.x[i] - M1.bx) / M1.R;
      M1.fx[i] = Math.sign(u) * Math.abs(u) * Math.exp(-u * u) * 2.33;
    }
  }
  // kawalek prazka [a0,a1]: prosto = prostokat; w strefie wybrzuszenia = odcinki po 24 px w kubelkach
  function m1Piece(x, fa, a0, a1, cw, al, bend, boost) {
    if (a1 <= a0) return;
    if (!bend) { bkPush(x, a0, cw, a1 - a0, al); return; }
    const zr = M1.R * 1.4, z0 = Math.max(a0, M1.by - zr), z1 = Math.min(a1, M1.by + zr);
    if (z1 <= z0) { bkPush(x, a0, cw, a1 - a0, al); return; }
    if (z0 > a0) bkPush(x, a0, cw, z0 - a0, al);
    if (a1 > z1) bkPush(x, z1, cw, a1 - z1, al);
    const ey = M1.ey, gy = M1.gy, x5 = x + 0.5;
    for (let y = z0; y < z1; y += 24) {
      const y2 = Math.min(z1, y + 24);
      const a = Math.min(0.99, al * (1 + (boost - 1) * gy[(y + y2) * 0.5 | 0]));
      bkSeg(x5 + fa * ey[y | 0], y, x5 + fa * ey[y2 | 0], y2, a);
    }
  }

  // deszcz kodu na atlasie znakow
  const CODE = { cols: 0, rows: 0, colW: 26, grid: null, head: null, speed: null, len: null, white: null, on: null, last: -1 };
  function m1Spawn(c, seed) {
    CODE.len[c] = 6 + Math.random() * 18;
    CODE.speed[c] = 4 + Math.random() * 11;               // komorek na sekunde
    CODE.head[c] = seed ? Math.random() * (CODE.rows + CODE.len[c]) : -Math.random() * CODE.rows * 0.6;
    CODE.white[c] = Math.random() < 0.3 ? 1 : 0;
  }
  function m1BuildCode() {
    CODE.colW = Math.round(cell * 1.15);
    CODE.cols = Math.ceil(W / CODE.colW); CODE.rows = Math.ceil(H / cell) + 1;
    CODE.grid = new Uint8Array(CODE.cols * CODE.rows);
    for (let i = 0; i < CODE.grid.length; i++) CODE.grid[i] = Math.random() * GLYPHS.length | 0;
    const n = CODE.cols;
    CODE.head = new Float32Array(n); CODE.speed = new Float32Array(n); CODE.len = new Float32Array(n);
    CODE.white = new Uint8Array(n); CODE.on = new Uint8Array(n);
    for (let c = 0; c < n; c++) { CODE.on[c] = Math.random() < M1_CODE ? 1 : 0; m1Spawn(c, true); }
    CODE.last = -1;
  }
  function m1PaintCode(wc, time, age, op, amp) {
    if (!CODE.grid) return;
    const dt = CODE.last < 0 ? 0 : Math.min(0.2, time - CODE.last);
    CODE.last = time;
    const c3 = Math.ceil(cell * dpr), gain = M1_CODE_OP * op * Math.min(1, age / 0.9);
    for (let c = 0; c < CODE.cols; c++) {
      if (!CODE.on[c]) continue;
      if (!reduce) {
        CODE.head[c] += CODE.speed[c] * dt;
        if (CODE.head[c] - CODE.len[c] > CODE.rows) m1Spawn(c, false);
      }
      const x0 = c * CODE.colW + CODE.colW / 2, h = Math.floor(CODE.head[c]), L = CODE.len[c];
      for (let k = 0; k < L; k++) {
        const r = h - k;
        if (r < 0 || r >= CODE.rows) continue;
        const al = Math.pow(1 - k / L, 1.3) * gain;
        if (al <= 0.02) continue;
        const gi = r * CODE.cols + c, y = r * cell + cell / 2;
        if (!reduce && Math.random() < 0.03) CODE.grid[gi] = Math.random() * GLYPHS.length | 0;   // migotanie znakow
        const tone = k === 0 ? (CODE.white[c] ? 2 : 1) : (k < 3 ? 1 : 0);
        wc.globalAlpha = Math.min(1, al);
        wc.drawImage(atlas, CODE.grid[gi] * c3, tone * c3, c3, c3, x0 + m1Bend(x0, y, amp) - cell / 2, y - cell / 2, cell, cell);
      }
    }
    wc.globalAlpha = 1;
  }

  // srodek wybrzuszenia = naglowek widoku somi; mierzony przy budowie, nie co klatke
  function m1Measure() {
    const ov = document.querySelector('[data-view="somi"] .overlay');
    const r = ov && ov.getBoundingClientRect();
    M1.bulgeOk = !!(r && r.width);
    if (!M1.bulgeOk) { M1.bx = W / 2; M1.by = H * 0.5; }
    else {
      const st = stage.getBoundingClientRect();
      M1.bx = r.left - st.left + r.width / 2; M1.by = r.top - st.top + r.height * 0.28;
    }
    m1Luts();
  }
  function m1Build() {
    const n = Math.ceil(W / M1_STEP) + 2;
    M1.n = n;
    M1.x = new Float32Array(n); M1.a = new Float32Array(n); M1.sp = new Float32Array(n);
    M1.dl = new Float32Array(n); M1.w = new Float32Array(n);
    M1.sS = new Float32Array(n * 3); M1.sL = new Float32Array(n * 3); M1.sB = new Float32Array(n * 3);
    let run = 0, runA = 0.5;
    for (let i = 0; i < n; i++) {
      M1.x[i] = i * M1_STEP + (Math.random() - 0.5) * M1_STEP * 0.5;
      // pixel sort: sasiednie kolumny dziela jasnosc pasmami, stad posortowany wyglad
      if (--run <= 0) { run = 2 + (Math.random() * 10 | 0); runA = 0.2 + Math.random() * 0.8; }
      M1.a[i] = runA * (0.75 + Math.random() * 0.25);
      M1.sp[i] = 5 + Math.random() * 20;
      M1.dl[i] = Math.random();
      M1.w[i] = Math.random() < 0.12 ? 2 : 1;
      for (let k = 0; k < 3; k++) {
        M1.sS[i * 3 + k] = Math.random();
        M1.sL[i * 3 + k] = 0.08 + Math.random() * 0.5;
        M1.sB[i * 3 + k] = 0.35 + Math.random() * 0.65;
      }
    }
    M1.R = Math.min(W * 0.5, H) * 0.34;
    m1Measure();
    const pc = M1.pc = [];
    for (let i = 0, pn = Math.round(W / 7); i < pn; i++) {
      const q = Math.random();
      pc.push({ x: Math.random() * W, y: H - q * q * H * 0.2 - 2, s: Math.random() < 0.3 ? 2 : 1,
        a: 0.25 + (1 - q) * 0.6, ph: Math.random() * 6.28, sp: 0.2 + Math.random() * 0.6 });
    }
    if (fontsReady) { glyphAtlas(); m1BuildCode(); } else CODE.grid = null;
  }

  function m1Paint(wc, time, age, net) {
    if (!M1.bulgeOk) m1Measure();   // naglowek mogl nie miec jeszcze ukladu przy budowie
    const op = M1_OP * net;
    const amp = M1.R * 0.2 * (reduce ? 1 : 1 + 0.12 * Math.sin(time * 9) * Math.sin(time * 2.3));
    // luk: kurtyna zamknieta w elipsie wokol naglowka
    const acx = M1.bx, arx = W * 0.44, ary = H * 0.62, acy = M1.by + H * 0.08;
    for (let i = 0; i < M1.n; i++) {
      const x = M1.x[i], u = (x - acx) / arx;
      if (u <= -1 || u >= 1) continue;
      const half = ary * Math.sqrt(1 - u * u);
      const top = Math.max(0, acy - half), bot = Math.min(H, acy + half), span = bot - top;
      if (span <= 2) continue;
      // jednorazowe zlozenie sciany po wejsciu na widok: kolumny spadaja z gory, ~0.9 s
      const asm = Math.min(1, Math.max(0, (age - M1.dl[i] * 0.55) / 0.35));
      if (asm <= 0) continue;
      const visBot = top + span * asm;
      const dx = (x - M1.bx) / M1.R, boost = 1 + 0.9 * Math.exp(-dx * dx * 1.4);
      const base = M1.a[i] * Math.pow(1 - u * u, 0.6) * op, cw = M1.w[i];
      const bend = Math.abs(x - M1.bx) < M1.R * 2, fa = M1.fx[i] * amp;
      // odcinki: tlo kolumny + 3 posortowane pasy, splywajace w dol
      for (let k = -1; k < 3; k++) {
        let y0, len, al;
        if (k < 0) { y0 = top; len = span; al = base * 0.22; }
        else {
          y0 = top + ((M1.sS[i * 3 + k] * span + (reduce ? 0 : time * M1.sp[i])) % span);
          len = M1.sL[i * 3 + k] * span; al = base * M1.sB[i * 3 + k];
        }
        // pas moze przejsc przez dol luku: wtedy dwa kawalki (bez alokacji tablic)
        const wrap = y0 + len > bot;
        m1Piece(x, fa, y0, Math.min(wrap ? bot : y0 + len, visBot), cw, al, bend, boost);
        if (wrap) m1Piece(x, fa, top, Math.min(top + (y0 + len - bot), visBot), cw, al, bend, boost);
      }
    }
    wc.clearRect(0, 0, W, H);
    wc.globalCompositeOperation = 'lighter';
    bkFlush(wc);
    m1PaintCode(wc, time, age, net, amp);
    // chmura punktow u dolu (grunt przed sciana): kwadraty 1-2 px, bez arc; w buforze, nie co klatke
    const fade = op * Math.min(1, age / 0.9);
    wc.fillStyle = bkHot;
    for (let i = 0; i < M1.pc.length; i++) {
      const p = M1.pc[i];
      wc.globalAlpha = Math.min(1, p.a * fade);
      wc.fillRect(p.x + (reduce ? 0 : Math.sin(time * p.sp + p.ph) * 3), p.y, p.s, p.s);
    }
    wc.globalAlpha = 1;
  }
  BG.m1 = { layer: 'net', fps: 24, comp: 'lighter', build: m1Build, paint: m1Paint, live: (c, dt) => mosh(dt) };

  /* ===================== A1 boczna soczewka — tlo Oferty (aspekt 11, M8 Sesja 2B, 29.09) =====================
     Malarz BG.oferta na warstwie `bg`. Wzor 1:1: makieta_m8_oferta.html, wariant A (buildWF / lensState /
     drawLens). Siatka kropek w soczewce czyta wireframe strony klienta; cykl x1 -> x4 -> x12 twardymi
     skokami, na x12 czytelny element audytu z ocena, co trzeci cykl znak C·S w stopce (podpis jak numer
     seryjny w BR2049). Ustawienia maisy (2A): krycie 0,32, skok co 1,8 s, kropki co 4 px (telefon x0,85),
     sufit pod tekstem 0,18. Kropki zmieniaja sie tylko przy skoku, wiec soczewka rysuje sie raz na stan
     do wlasnego bufora OF.cv; paint to drawImage + duch pierscienia + maska tekstu. Wireframe i jego alfa
     (jedyne getImageData) powstaja raz na zycie strony, po zaladowaniu fontow. */
  const OF_OP = 0.32, OF_T = 1.8, OF_G = 4, OF_CAP = 0.18, OF_WW = 1200, OF_WH = 900;
  const OF_SEL = '[data-view="oferta"] .overlay';
  const OF_TG = [
    { x: 150, y: 128, label: '<title>', note: 'tytuł strony', ok: true },
    { x: 1010, y: 168, label: 'meta', note: 'brak meta opisu', ok: false },
    { x: 250, y: 650, label: 'H1', note: 'jeden nagłówek H1', ok: true },
    { x: 985, y: 705, label: 'https://', note: 'certyfikat HTTPS', ok: true },
    { x: 600, y: 838, label: 'sitemap', note: 'brak sitemap.xml', ok: false },
    { x: 1062, y: 836, note: 'podpis: cybersora', ok: true, mark: true }   // [5] = znak C·S
  ];
  OF_TG.forEach(t => { t.line = (t.mark ? '[cs] ' : t.ok ? '[ok] ' : '[!!] ') + t.note; });
  const OF_Z = [1, 4, 12], OF_ZS = ['×1', '×4', '×12'];
  // co trzeci cykl znak, poza tym elementy audytu po kolei (tryb c3 z makiety)
  const ofPick = w => w % 3 === 2 ? 5 : (w - Math.floor(w / 3)) % 5;
  const OF = { wa: null, fonts: false, cv: document.createElement('canvas'), key: -1, st: [], hot: '',
    cx: 0, cy: 0, vx: 0, vy: 0, r: 1, ruler: 1, fs: 11, n: 0, d: null, hit: null };
  OF.c = OF.cv.getContext('2d');

  function ofWire() {
    const wf = document.createElement('canvas'); wf.width = OF_WW; wf.height = OF_WH;
    const c = wf.getContext('2d');
    c.fillStyle = '#000'; c.strokeStyle = '#000'; c.lineWidth = 3;
    c.strokeRect(20, 20, OF_WW - 40, OF_WH - 40);                 // okno przegladarki
    c.fillRect(20, 20, OF_WW - 40, 60);                           // pasek adresu
    c.clearRect(60, 38, 640, 26); c.strokeRect(60, 38, 640, 26);
    for (let i = 0; i < 5; i++) c.fillRect(760 + i * 80, 46, 56, 10);   // linki
    c.strokeRect(80, 140, 520, 250);                              // zdjecie salonu
    c.beginPath(); c.moveTo(80, 390); c.lineTo(240, 250); c.lineTo(340, 330); c.lineTo(440, 220); c.lineTo(600, 390); c.stroke();
    c.fillRect(650, 204, 400, 46);                               // naglowek strony: sam pasek, bez nazwy (maisa 29.09)
    for (let i = 0; i < 6; i++) c.fillRect(650, 290 + i * 26, 430 - (i * 53) % 150, 11);
    for (let k = 0; k < 3; k++) {                                  // trzy karty uslug
      const x = 80 + k * 360; c.strokeRect(x, 440, 320, 160);
      c.fillRect(x + 20, 462, 150, 16);
      for (let i = 0; i < 4; i++) c.fillRect(x + 20, 496 + i * 22, 270 - (i * 41) % 90, 9);
    }
    for (let i = 0; i < 4; i++) c.fillRect(420, 640 + i * 30, 460 - (i * 67) % 160, 12);
    c.fillRect(80, 760, 1040, 3);
    // elementy audytu: drobny tekst, czytelny dopiero przy duzym powiekszeniu
    c.font = '600 22px "Geist Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i < 5; i++) {
      const t = OF_TG[i];
      c.clearRect(t.x - 70, t.y - 18, 140, 36); c.strokeRect(t.x - 70, t.y - 18, 140, 36); c.fillText(t.label, t.x, t.y + 1);
    }
    // znak Blackwall: geometria kanoniczna (viewBox 134x100, kreska 17), trzy pasma przesuniete w bok o -5/+4 j.
    const mk = document.createElement('canvas'); mk.width = 134; mk.height = 100;
    const m = mk.getContext('2d'); m.lineWidth = 17; m.lineCap = 'butt'; m.lineJoin = 'miter'; m.strokeStyle = '#000';
    m.setTransform(1.05, 0, 0, 1.05, 4, 10); m.stroke(new Path2D('M52 10 H24 L10 24 V56 L24 70 H52'));
    m.setTransform(1.05, 0, 0, 1.05, 66, 10); m.stroke(new Path2D('M50 10 H24 L12 22 V28 L24 40 H36 L48 52 V58 L36 70 H10'));
    const ms = 0.36, mx = OF_TG[5].x - 67 * ms, my = OF_TG[5].y - 50 * ms;
    [[0, 31, 0], [35, 28, -5], [67, 33, 4]].forEach(([y, h, dx]) => c.drawImage(mk, 0, y, 134, h, mx + dx * ms, my + y * ms, 134 * ms, h * ms));
    const d = c.getImageData(0, 0, OF_WW, OF_WH).data;
    const wa = new Uint8Array(OF_WW * OF_WH);
    for (let i = 0; i < wa.length; i++) wa[i] = d[i * 4 + 3];
    OF.wa = wa;
  }
  const ofFontsDone = () => { OF.fonts = true; if (W && bgId === 'oferta') bgBuild(); };
  if (document.fonts && document.fonts.load)
    document.fonts.load('600 22px "Geist Mono"').then(ofFontsDone, ofFontsDone);
  else OF.fonts = true;

  function ofBuild() {
    if (!OF.wa && OF.fonts) ofWire();
    // geometria z makiety (1440: (1150, 470) r 205, linijka z prawej; 390: (360, 108) r 92, z lewej), skalowana od szerokosci
    const mob = W < 760, s = mob ? W / 390 : W / 1440;
    OF.r = (mob ? 92 : 205) * s; OF.ruler = mob ? -1 : 1; OF.fs = mob ? 11 : 13;
    OF.cx = mob ? W - 30 * s : W - 290 * s; OF.cy = mob ? 108 * s : H * (470 / 900);
    // soczewka w rogu telefonu wystaje poza ekran: kadr celu przesuwa sie na jej widoczna czesc
    const r = OF.r;
    OF.vx = Math.max(r * 0.55, Math.min(W - r * 0.55, OF.cx));
    OF.vy = Math.max(65 + r * 0.55, Math.min(H - r * 0.55, OF.cy));
    // przesuniecia kropek w kole 0,9 r: liczone raz tutaj, w malowaniu tylko odczyt alfy wireframe'u
    const g = OF_G * (mob ? 0.85 : 1), rr = (r * 0.9) * (r * 0.9);
    let n = 0;
    for (let y = -r; y <= r; y += g) for (let x = -r; x <= r; x += g) if (x * x + y * y <= rr) n++;
    OF.d = new Float32Array(n * 2); OF.hit = new Uint8Array(n); OF.n = n;
    n = 0;
    for (let y = -r; y <= r; y += g) for (let x = -r; x <= r; x += g) if (x * x + y * y <= rr) { OF.d[n * 2] = x; OF.d[n * 2 + 1] = y; n++; }
    for (let i = 0; i <= 20; i++) OF.st[i] = rgba(themeState.a, (i / 20).toFixed(3));
    OF.hot = rgba(themeState.hot, 1);
    const pw = Math.floor(W * dpr), ph = Math.floor(H * dpr);
    if (OF.cv.width !== pw || OF.cv.height !== ph) { OF.cv.width = pw; OF.cv.height = ph; }
    OF.c.setTransform(dpr, 0, 0, dpr, 0, 0);
    OF.key = -1;
    if (bgTextMeasure(OF_SEL)) bgMaskBuild();
  }
  const ofA = a => OF.st[Math.max(0, Math.min(20, Math.round(a * 20)))];

  // jeden stan soczewki (poziom lv, cel ti) do bufora OF.cv; wolane tylko przy skoku
  function ofLens(lv, ti) {
    const c = OF.c, t = OF_TG[ti], z = OF_Z[lv], depth = lv / 2, a = OF_OP;
    const r = OF.r, cx = OF.cx, cy = OF.cy, L = OF.ruler, wa = OF.wa, d = OF.d, hit = OF.hit;
    c.clearRect(0, 0, W, H);
    // widok: przy x1 cala strona w soczewce, dalej kadry wokol celu
    const k = (OF_WW * 0.55) / z / r;
    const fx = z === 1 ? OF_WW / 2 : t.x + (cx - OF.vx) * k, fy = z === 1 ? OF_WH / 2 : t.y + (cy - OF.vy) * k;
    for (let i = 0; i < OF.n; i++) {
      const wx = (fx + d[i * 2] * k) | 0, wy = (fy + d[i * 2 + 1] * k) | 0;
      hit[i] = wx >= 0 && wy >= 0 && wx < OF_WW && wy < OF_WH && wa[wy * OF_WW + wx] > 110 ? 1 : 0;
    }
    c.fillStyle = ofA(a * 0.16);
    for (let i = 0; i < OF.n; i++) if (!hit[i]) c.fillRect(cx + d[i * 2], cy + d[i * 2 + 1], 1, 1);
    const mark = t.mark && depth === 1;   // znalezienie znaku: kropki mocniej i grubiej
    const s = mark ? 2.5 : z >= 10 ? 2 : 1.5;
    c.fillStyle = ofA(mark ? Math.min(1, a * 1.5) : a);
    for (let i = 0; i < OF.n; i++) if (hit[i]) c.fillRect(cx + d[i * 2], cy + d[i * 2 + 1], s, s);
    // pierscienie, krzyz z przerwa, podzialka na obwodzie
    c.lineWidth = 1; c.strokeStyle = ofA(a * 0.9);
    c.beginPath(); c.arc(cx, cy, r, 0, 6.2832); c.stroke();
    c.strokeStyle = ofA(a * 0.5); c.beginPath(); c.arc(cx, cy, r * 0.62, 0, 6.2832); c.stroke();
    c.beginPath();
    c.moveTo(cx - r - 14, cy + 0.5); c.lineTo(cx - 10, cy + 0.5); c.moveTo(cx + 10, cy + 0.5); c.lineTo(cx + r + 14, cy + 0.5);
    c.moveTo(cx + 0.5, cy - r - 14); c.lineTo(cx + 0.5, cy - 10); c.moveTo(cx + 0.5, cy + 10); c.lineTo(cx + 0.5, cy + r + 14);
    for (let i = 0; i < 72; i++) {
      const an = i * Math.PI / 36, l = i % 6 ? 4 : 9, ca = Math.cos(an), sa = Math.sin(an);
      c.moveTo(cx + ca * r, cy + sa * r); c.lineTo(cx + ca * (r + l), cy + sa * (r + l));
    }
    c.stroke();
    // linijka z boku soczewki + znacznik poziomu (jak podzialka w BR2049)
    const rx = cx + L * (r + 26), y0 = cy - r * 0.8, y1 = cy + r * 0.8;
    c.strokeStyle = ofA(a * 0.7); c.beginPath(); c.moveTo(rx + 0.5, y0); c.lineTo(rx + 0.5, y1);
    for (let y = y0, i = 0; y <= y1; y += 8, i++) { const l = i % 5 ? 4 : 8; c.moveTo(rx, y + 0.5); c.lineTo(rx + L * l, y + 0.5); }
    c.stroke();
    const my = y1 - depth * (y1 - y0);
    c.fillStyle = ofA(Math.min(1, a * 1.4)); c.beginPath();
    c.moveTo(rx - L * 4, my); c.lineTo(rx - L * 9, my - 5); c.lineTo(rx - L * 14, my); c.lineTo(rx - L * 9, my + 5); c.closePath(); c.fill();
    /* odczyt: powiekszenie i na najglebszym poziomie wynik elementu audytu. Po krytyce 29.09
       czytelny: 13/11 px, [!!] pelnym goracym karmazynem (~5,7:1), [ok]/[cs] przygaszone (~3,4:1).
       Komputer: pod soczewka, jak w makiecie. Telefon: pod paskiem nawigacji przy prawym brzegu
       (pod soczewka wpadal pod maske opisu i znikal), na wyczyszczonym pasku, bez kropek pod literami. */
    c.font = '600 ' + OF.fs + 'px "Geist Mono", monospace'; c.textAlign = 'right'; c.textBaseline = 'alphabetic';
    const lh = OF.fs * 1.5, tx = L > 0 ? cx + r * 0.72 : W - 8, ty = L > 0 ? cy + r + OF.fs * 2.2 : 65 + OF.fs * 1.6;
    if (L < 0) {
      const tw = Math.max(c.measureText(OF_ZS[lv]).width, depth === 1 ? c.measureText(t.line).width : 0);
      c.clearRect(tx - tw - 6, ty - OF.fs - 3, tw + 12, OF.fs + 8 + (depth === 1 ? lh : 0));
    }
    c.fillStyle = ofA(0.7);
    c.fillText(OF_ZS[lv], tx, ty);
    if (depth === 1) {
      c.fillStyle = t.ok ? ofA(0.8) : OF.hot;
      c.fillText(t.line, tx, ty + lh);
    }
  }

  function ofPaint(wc, time, age, op) {
    wc.clearRect(0, 0, W, H);
    if (!OF.wa) return;
    if (!TXT.ok && bgTextMeasure(OF_SEL)) bgMaskBuild();   // naglowek mogl nie miec jeszcze ukladu przy budowie
    // czas od wejscia na widok dzielony na kroki; ostatni poziom trzyma 2 kroki; reduced motion stoi na x4
    let lv = 1, which = 0, since = 1;
    if (!reduce) {
      const step = Math.floor(age / OF_T);
      which = Math.floor(step / 4); lv = Math.min(2, step % 4); since = age - step * OF_T;
    }
    const ti = ofPick(which), key = lv ? lv * 10 + ti : 0;
    if (key !== OF.key) { OF.key = key; ofLens(lv, ti); }
    wc.globalAlpha = op;
    wc.drawImage(OF.cv, 0, 0, W, H);
    // mechaniczny skok: przez ~2 klatki bufora duch pierscienia o stopien obok
    if (since < 0.085) {
      wc.lineWidth = 1; wc.strokeStyle = ofA(OF_OP * 0.6);
      wc.beginPath(); wc.arc(OF.cx, OF.cy, OF.r * (lv % 2 ? 1.08 : 0.9), 0, 6.2832); wc.stroke();
    }
    wc.globalAlpha = 1;
    bgMaskOut(wc, 1 - OF_CAP / (OF_OP * 1.9));   // sufit pod tekstem
  }
  BG.oferta = { layer: 'bg', fps: 24, comp: 'lighter', build: ofBuild, paint: ofPaint };

  /* ===================== M8 Sesja 3B — tlo O nas: B1 dwie fale synchronizacji (29.09) =====================
     Malarz BG.onas na warstwie `bg`. Wzor 1:1: makieta_m8_onas.html, wariant A (oscyloskop). Wybor
     (maisa zdal sie na nas, 29.09): A, bez iskier, krycie 0,34, zatrzask co 6 s, zgoda 1,2 s, sufit 0,18.
     Pelna i przerywana fala w jednym ekranie z siatka 1 px; faza przerywanej wolno dryfuje, a pod koniec
     kazdego cyklu twardo wskakuje na pelna (duch starej fazy ~80 ms, blysk klamer 0,25 s). Pasmo liczone
     z ukladu tekstu, nie na sztywno: komputer = dolna tercja pod pasem faktow, telefon = pusty pas miedzy
     opisem a faktami (341-402 px przy 390). Siatka raz do wlasnego bufora; paint = drawImage siatki,
     dwie polilinie (x i obwiednia z Float32Array liczone przy budowie), klamry, licznik, maska tekstu. */
  const ON_OP = 0.34, ON_P = 6, ON_H = 1.2, ON_CAP = 0.18;
  const ON_SEL = '[data-view="onas"] .overlay';
  const ON = { cv: document.createElement('canvas'), st: [], x0: 0, x1: 0, y: 0, a: 0, k: 0, fs: 11, mob: false,
    xs: null, en: null, n: 0, dash: [7, 6], lw: 1.25, pad: 12, txt: '', txtS: '', txtD: '' };
  ON.c = ON.cv.getContext('2d');
  const onA = a => ON.st[Math.max(0, Math.min(40, Math.round(a * 40)))];
  const onRnd = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  // fala harmoniczna: dwie skladowe; przy d = 0 ksztalty identyczne z pelna
  const onWave = (x, th, d) => 0.72 * Math.sin(ON.k * x * (1 + 0.05 * d) - th) + 0.28 * Math.sin(2.1 * ON.k * x - 1.6 * th + d * 1.1);
  // faza przerywanej w chwili t od wejscia: dryf przez P - H s, potem zgoda przez H s
  const onPhi = (cyc, u) => (onRnd(cyc) < 0.5 ? -1 : 1) * (0.7 + onRnd(cyc + 9) * 1.1) * (0.55 + 0.45 * Math.sin(6.2832 * u * 1.3));

  function onBuild() {
    const v = document.querySelector('[data-view="onas"]'), st = stage.getBoundingClientRect(), dy = bgViewDy(v);
    const stub = v && v.querySelector('.stub'), rail = v && v.querySelector('.hero__rail');
    ON.mob = W < 760;
    const s = ON.mob ? W / 390 : W / 1440;
    if (stub && rail) {
      const sb = stub.getBoundingClientRect().bottom - st.top - dy, rr = rail.getBoundingClientRect();
      const rt = rr.top - st.top - dy, rb = rr.bottom - st.top - dy;
      if (ON.mob) { ON.y = (sb + rt) / 2; ON.a = Math.max(6, Math.min(12 * s, (rt - sb) / 2 - 18)); }
      else { ON.y = rb + (H - rb) * 0.49; ON.a = Math.max(10, Math.min(42 * s, (H - rb) * 0.15)); }
    } else { ON.y = H * 0.84; ON.a = 12; }
    ON.x0 = ON.mob ? 24 : 96 * s; ON.x1 = W - ON.x0;
    ON.k = 6.2832 / (ON.mob ? 150 * s : 360 * s);
    // telefon: ramka ekranu ciasniej (pad 6), bo pas miedzy opisem a faktami ma ~60 px i klamra siadala na kresce faktow
    ON.fs = ON.mob ? 9 : 11; ON.dash = ON.mob ? [5, 4] : [7, 6]; ON.lw = ON.mob ? 1 : 1.25; ON.pad = ON.mob ? 6 : 12;
    const step = ON.mob ? 1 : 2, e = ON.mob ? 30 : 90;
    ON.n = Math.floor((ON.x1 - ON.x0) / step) + 1;
    ON.xs = new Float32Array(ON.n); ON.en = new Float32Array(ON.n);
    for (let i = 0; i < ON.n; i++) {
      const x = ON.x0 + i * step; ON.xs[i] = x;
      ON.en[i] = Math.max(0, Math.min(1, (x - ON.x0) / e, (ON.x1 - x) / e)) * ON.a;
    }
    for (let i = 0; i <= 40; i++) ON.st[i] = rgba(themeState.a, (i / 40).toFixed(3));
    // siatka oscyloskopu: raz do wlasnego bufora
    const pw = Math.floor(W * dpr), ph = Math.floor(H * dpr);
    if (ON.cv.width !== pw || ON.cv.height !== ph) { ON.cv.width = pw; ON.cv.height = ph; }
    const c = ON.c; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    const g = ON.mob ? 12 : 24, top = ON.y - ON.a - ON.pad, bot = ON.y + ON.a + ON.pad;
    c.lineWidth = 1; c.strokeStyle = onA(ON_OP * 0.24); c.beginPath();
    for (let x = ON.x0; x <= ON.x1 + 0.1; x += g) { c.moveTo(Math.round(x) + 0.5, top); c.lineTo(Math.round(x) + 0.5, bot); }
    for (let y = top; y <= bot + 0.1; y += g / 2) { c.moveTo(ON.x0, Math.round(y) + 0.5); c.lineTo(ON.x1, Math.round(y) + 0.5); }
    c.stroke();
    c.strokeStyle = onA(ON_OP * 0.45); c.beginPath(); c.moveTo(ON.x0, Math.round(ON.y) + 0.5); c.lineTo(ON.x1, Math.round(ON.y) + 0.5); c.stroke();
    ON.txt = '';
    if (bgTextMeasure(ON_SEL)) bgMaskBuild();
  }

  function onStroke(c, th, phi, d) {
    const xs = ON.xs, en = ON.en, y = ON.y;
    c.beginPath(); c.moveTo(xs[0], y - en[0] * onWave(xs[0], th + phi, d));
    for (let i = 1; i < ON.n; i++) c.lineTo(xs[i], y - en[i] * onWave(xs[i], th + phi, d));
    c.stroke();
  }

  function onPaint(wc, time, age, op) {
    wc.clearRect(0, 0, W, H);
    if (!ON.xs) return;
    if (!TXT.ok && bgTextMeasure(ON_SEL)) bgMaskBuild();
    // reduced motion: stoi w zgodzie (jedna linia, 100 %)
    let lock = true, phi = 0, pre = 0, since = 9, th = 1.1;
    if (!reduce) {
      const cyc = Math.floor(age / ON_P), u = age - cyc * ON_P, drift = ON_P - ON_H;
      th = age * 6.2832 * 0.22;
      if (u >= drift) { since = u - drift; pre = onPhi(cyc, 0.999); }
      else { lock = false; phi = onPhi(cyc, u / drift); }
    }
    wc.globalAlpha = op;
    wc.drawImage(ON.cv, 0, 0, W, H);
    const a = ON_OP, top = ON.y - ON.a - ON.pad, bot = ON.y + ON.a + ON.pad;
    // klamry ekranu: przy zatrzasku blysk
    const L = ON.mob ? 7 : 12, x0 = ON.x0 - 4.5, x1 = ON.x1 + 4.5;
    wc.lineWidth = 1; wc.strokeStyle = onA(a * (lock && since < 0.25 ? 1.6 : 0.7)); wc.beginPath();
    wc.moveTo(ON.x0 + L, top - 4.5); wc.lineTo(x0, top - 4.5); wc.lineTo(x0, bot + 4.5); wc.lineTo(ON.x0 + L, bot + 4.5);
    wc.moveTo(ON.x1 - L, top - 4.5); wc.lineTo(x1, top - 4.5); wc.lineTo(x1, bot + 4.5); wc.lineTo(ON.x1 - L, bot + 4.5);
    wc.stroke();
    wc.lineWidth = ON.lw; wc.strokeStyle = onA(a);
    onStroke(wc, th, 0, 0);
    wc.setLineDash(ON.dash); wc.strokeStyle = onA(a * (lock ? 1.2 : 1));
    onStroke(wc, th, phi, lock ? 0 : 1);
    if (lock && since < 0.085) { wc.strokeStyle = onA(a * 0.45); onStroke(wc, th, pre, 1); }
    wc.setLineDash([]);
    // licznik mono przy krawedzi; string budowany tylko przy zmianie odczytu
    const p = lock ? 1000 : Math.max(0, Math.round((100 - Math.abs(phi) / Math.PI * 90 - 3.1) * 10));
    const key = p + (lock ? 'z' : '') + Math.round(Math.abs(phi) * 100);
    if (key !== ON.txt) {
      ON.txt = key;
      ON.txtS = 'SYNC ' + (p / 10).toFixed(1).replace('.', ',') + ' %' + (lock ? '  · zgoda' : '');
      ON.txtD = 'Δφ ' + (lock ? '0,00' : Math.abs(phi).toFixed(2).replace('.', ',')) + ' rad';
    }
    // telefon: licznik pod faktami, prawy odczyt odsuniety od naroznika HUD (.hero::after, prawy dol)
    const ly = ON.mob ? H - 26 : top - 10;
    wc.font = '600 ' + ON.fs + 'px "Geist Mono", monospace'; wc.textBaseline = 'alphabetic';
    wc.textAlign = 'left'; wc.fillStyle = onA(a * (lock ? 2.2 : 1.4)); wc.fillText(ON.txtS, x0, ly);
    wc.textAlign = 'right'; wc.fillStyle = onA(a * 1.1); wc.fillText(ON.txtD, ON.mob ? x1 - 18 : x1, ly);
    wc.globalAlpha = 1;
    bgMaskOut(wc, Math.max(0, 1 - ON_CAP / Math.min(1, ON_OP * 2.2)));   // sufit pod tekstem
  }
  BG.onas = { layer: 'bg', fps: 24, comp: 'lighter', build: onBuild, paint: onPaint };

  /* ===================== M8 Sesja 5B — tlo Sadzonek: C drzewo z kodu (29.09) =====================
     Malarz BG.rnd na warstwie `bg`. Wzor 1:1: makieta_m8_sadzonki.html, wariant C (genC / bake / paint).
     Wybor maisy (5A, „PERFECTO”): wspolne drzewo (dwa duze pnie rosna w jednej kolonizacji, korony lacza
     sie lukiem nad naglowkiem), sadzonki obok, spadajace liscie, bez iskier; krycie 0,40, rosnie 4,5 s,
     sufit pod tekstem 0,14, pod nadtytulem czysto (karmazyn na karmazynie). Poprawka maisy 29.09: drzewo rosnie
     RAZ na wejscie i zostaje (bez przycinania i nowych pokolen), bez odczytu SEED/GEN, liscie sypia sie jak jesienia.
     Drzewo = kolonizacja przestrzeni (Runions 2007), grubosc z modelu rurek, znaki = prawdziwe linijki kodu.
     Generacja jest generatorem (function*) krokowanym w paint z budzetem RN_BUDGET ms, zaraz po wejsciu. Znaki z wlasnego atlasu
     (kod ma male litery i interpunkcje, ktorych glyphAtlas nie ma), pieczone do RN.cv tylko w chwili
     narodzin; paint = drawImage bufora (przyciety skanerem) + kursory, migajace znaki, liscie z puli,
     ziemia, odczyt, maski. Strefy z ukladu (nawigacja, tekst naglowka, wymiar hero), nie na sztywno.
     Komputer: drzewa omijaja tekst; telefon: rosna pod tekstem, przygaszone maska. */
  const RN_OP = 0.40, RN_G = 4.5, RN_CAP = 0.14, RN_BUDGET = 3, RN_FALL = 160, RN_LIE = 3.5;
  const RN_SEL = '[data-view="rnd"] .overlay';
  const RN_CODE = [
    'zapis.klient="Anna K.";zapis.status="OPLACONE";kasa.dodaj(zapis,kwota);magazyn.sprawdz(zapasy);',
    'd/dx sin(x)=cos(x);solve(x**2-4,x);det(M);grad(f,[x,y]);cse(expr);',
    'somi.slucha();somi.mysli(kontekst);somi.odpowiada(glos);pamiec.zapisz(fakt);',
    'if(sadzonka.gotowa){oferta.dodaj(sadzonka)}else{szklarnia.podlej(sadzonka)};',
    'for(const k of kod){drzewo.rosnij(k)};git commit -m "kolejny pęd";'
  ];
  const RN_HEX = '0123456789abcdef';
  const RN_GRASS = '|/\\!', RN_GTIP = "'`,.:";   // trawa z kodu (z headera Pycodemath, maisa 30.09: „dojebana”)
  const RN_CH = [...new Set([...RN_CODE.join('').replace(/ /g, '·'), ...RN_HEX, '█', ...RN_GRASS, ...RN_GTIP])];
  const RN_IX = new Map(RN_CH.map((ch, i) => [ch, i]));
  const RN_HX = [...RN_HEX].map(ch => RN_IX.get(ch)), RN_CUR = RN_IX.get('█');
  const RN = { cv: document.createElement('canvas'), at: document.createElement('canvas'), eb: document.createElement('canvas'),
    eo: { x: 0, y: 0, w: 0, h: 0, ok: false }, atKey: '', cell: 0, cp: 0, fonts: false, mob: false, fs: 12,
    top: 0, ground: 0, trees: [], items: null, leaf: null, ptr: 0, gen: 0, u: 0, lt: -1,
    job: null, pend: null, pendGen: 0, st: [], sh: [], fall: [], fallAcc: 0 };
  RN.c = RN.cv.getContext('2d'); RN.ac = RN.at.getContext('2d'); RN.ec = RN.eb.getContext('2d');
  for (let i = 0; i < RN_FALL; i++) RN.fall.push({ on: false, x0: 0, y: 0, xl: 0, g0: 0, g1: -1, al: 1, vy: 0, amp: 0, sp: 0, ph: 0, dr: 0, t: 0, land: 0 });
  const rnA = a => RN.st[Math.max(0, Math.min(40, Math.round(a * 40)))];
  const rnRng = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const rnFontsDone = () => { RN.fonts = true; RN.atKey = ''; if (W && bgId === 'rnd') bgBuild(); };
  if (document.fonts && document.fonts.load) document.fonts.load('600 12px "Geist Mono"').then(rnFontsDone, rnFontsDone);
  else RN.fonts = true;

  // atlas: wiersz 0 karmazyn (kora, galezie), wiersz 1 goracy (liscie, kursor); komorki w pikselach urzadzenia
  function rnAtlas() {
    const key = RN.fs + ':' + dpr + ':' + RN.fonts;
    if (key === RN.atKey) return;
    RN.atKey = key;
    RN.cell = Math.ceil(RN.fs * 1.4); RN.cp = Math.ceil(RN.cell * dpr);
    RN.at.width = RN.cp * RN_CH.length; RN.at.height = RN.cp * 2;
    const c = RN.ac, cp = RN.cp;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.font = '600 ' + (RN.fs * dpr).toFixed(1) + 'px "Geist Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
    [THEMES.start.a, THEMES.start.hot].forEach((col, k) => {
      c.fillStyle = rgba(col, 1);
      for (let i = 0; i < RN_CH.length; i++) c.fillText(RN_CH[i], i * cp + cp / 2, k * cp + cp / 2);
    });
  }
  // znak z atlasu: srodek (x, y), rozmiar z px, obrot an; c ma transform dpr
  function rnGlyph(c, gi, row, x, y, z, an) {
    const cp = RN.cp, s = RN.cell * z / RN.fs;
    if (an) {
      const co = Math.cos(an) * dpr, si = Math.sin(an) * dpr;
      c.setTransform(co, si, -si, co, x * dpr, y * dpr);
      c.drawImage(RN.at, gi * cp, row * cp, cp, cp, -s / 2, -s / 2, s, s);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else c.drawImage(RN.at, gi * cp, row * cp, cp, cp, x - s / 2, y - s / 2, s, s);
  }
  // komputer: drzewa omijaja linie tekstu z zapasem 26 px; telefon: rosna pod tekstem (maska je przygasza)
  function rnBlocked(x, y) {
    if (RN.mob) return false;
    for (let i = 0; i < TXT.n; i++) {
      const o = i * 4;
      if (x > TXT.r[o] - 26 && x < TXT.r[o] + TXT.r[o + 2] + 26 && y > TXT.r[o + 1] - 26 && y < TXT.r[o + 1] + TXT.r[o + 3] + 26) return true;
    }
    return false;
  }
  // nadtytul to karmazyn na karmazynie: sufit 0,14 go nie ratuje (makieta: 390 px 4,18:1), wiec pod nim czysto
  function rnEbMask() {
    const E = RN.eo, el = document.querySelector('[data-view="rnd"] .eyebrow');
    E.ok = false;
    if (!el) return;
    const rg = document.createRange(); rg.selectNodeContents(el);
    const rs = rg.getClientRects(), st = stage.getBoundingClientRect(), dy = bgViewDy(el);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < rs.length; i++) {
      const q = rs[i]; if (q.width < 1) continue;
      x0 = Math.min(x0, q.left - st.left); x1 = Math.max(x1, q.right - st.left);
      y0 = Math.min(y0, q.top - st.top - dy); y1 = Math.max(y1, q.bottom - st.top - dy);
    }
    if (x1 < x0) return;
    const m = 16, rx = x0 - 40, ry = y0 - 4, rw = x1 - x0 + 80, rh = y1 - y0 + 8;   // kreski ::before/::after w srodku
    E.x = rx - m; E.y = ry - m; E.w = rw + 2 * m; E.h = rh + 2 * m;
    const pw = Math.ceil(E.w * dpr), ph = Math.ceil(E.h * dpr);
    if (RN.eb.width !== pw || RN.eb.height !== ph) { RN.eb.width = pw; RN.eb.height = ph; }
    const c = RN.ec;
    c.setTransform(dpr, 0, 0, dpr, -E.x * dpr, -E.y * dpr); c.clearRect(E.x, E.y, E.w, E.h); c.fillStyle = '#000';
    for (let s = 8; s >= 0; s--) {
      const e = m * s / 8;
      c.globalAlpha = s ? 1 / 9 : 1; c.fillRect(rx - e, ry - e, rw + 2 * e, rh + 2 * e);
    }
    c.globalAlpha = 1; E.ok = true;
  }

  function rnBuild() {
    const st = stage.getBoundingClientRect(), nav = document.querySelector('.nav');
    RN.mob = W < 760; RN.fs = RN.mob ? 9 : 12;
    const D = !RN.mob, s = D ? W / 1440 : W / 390;
    // pod nawigacja (makieta: 65 px + 39 / + 19), ziemia nad dolna krawedzia hero
    const nb = nav ? Math.max(0, Math.min(140, nav.getBoundingClientRect().bottom - st.top)) : 65;
    RN.top = nb + (D ? 39 : 19); RN.ground = H - (D ? 34 : 14);
    /* sufit galezi (maisa 30.09, kolka w gornych rogach): korony licza sie od RN.top jak dotad, ale swiatlo i pedy
       moga dojsc do RN.roof tuz pod nawigacja. Nawigacja ma pelne tlo, wiec logo i przycisk zostaja czyste. */
    RN.roof = nb + (D ? 12 : 8);
    if (bgTextMeasure(RN_SEL)) bgMaskBuild();
    rnEbMask();
    /* x0/x1 = strefa korony (ksztalt jak dotad), e0/e1 = dokad pedy moga dorosnac (do krawedzi ekranu) */
    if (D) {   // boki wolne od tekstu (1440: x < 440 i > 1000), sadzonka przy zewnetrznej krawedzi
      const a0 = 26 * s, a1 = W / 2 - 280 * s, b0 = W / 2 + 280 * s, b1 = W - 26 * s, e0 = 6 * s, e1 = W - 6 * s;
      RN.trees = [{ x: a0 + (a1 - a0) * 0.505, x0: a0, x1: a1, e0, e1: a1, big: 1 }, { x: a0 + (a1 - a0) * 0.16, x0: a0, x1: a1, e0, e1: a1, big: 0 },
        { x: b0 + (b1 - b0) * 0.495, x0: b0, x1: b1, e0: b0, e1, big: 1 }, { x: b0 + (b1 - b0) * 0.84, x0: b0, x1: b1, e0: b0, e1, big: 0 }];
    } else {
      RN.trees = [{ x: 70 * s, x0: 8 * s, x1: 190 * s, e0: 2, e1: 190 * s, big: 1 }, { x: 326 * s, x0: 200 * s, x1: 382 * s, e0: 200 * s, e1: W - 2, big: 1 },
        { x: 196 * s, x0: 150 * s, x1: 240 * s, e0: 150 * s, e1: 240 * s, big: 0 }];
    }
    for (let i = 0; i <= 40; i++) { RN.st[i] = rgba(themeState.a, (i / 40).toFixed(3)); RN.sh[i] = rgba(themeState.hot, (i / 40).toFixed(3)); }
    rnAtlas();
    /* przebudowa na tym samym widoku bez zmiany ukladu (font doladowany, pasek adresu telefonu) nie sadzi
       drzewa od nowa; wejscie na widok (bgOn jeszcze false) zawsze zaczyna od ziarna */
    const key = [W, H, dpr, RN.top, TXT.x | 0, TXT.y | 0, TXT.w | 0].join('|');
    if (bgOn && RN.items && key === RN.key) return;
    RN.key = key;
    const pw = Math.floor(W * dpr), ph = Math.floor(H * dpr);
    if (RN.cv.width !== pw || RN.cv.height !== ph) { RN.cv.width = pw; RN.cv.height = ph; }
    RN.c.setTransform(dpr, 0, 0, dpr, 0, 0); RN.c.clearRect(0, 0, W, H);
    // nowy uklad = nowe drzewo od ziarna biezacej generacji; job startuje w paint, gdy tekst ma uklad
    RN.items = RN.pend = RN.job = null; RN.ptr = 0; RN.u = 0; RN.lt = -1; RN.fallAcc = 0;
    for (const q of RN.fall) q.on = false;
  }

  /* Jedno drzewo (albo kilka pni we wspolnej kolonizacji) do listy items; yield miedzy etapami i co iteracje
     kolonizacji. Elementy: k 0 = znak kory (obrocony wzdluz galezi), k 1 = lisc hex (1-2 znaki, goracy). */
  function* rnTree(rng, T, arch, code, items) {
    const D = !RN.mob, fs = RN.fs, top = RN.top, roof = RN.roof, ground = RN.ground, big = T[0].big;
    let ci = Math.floor(rng() * code.length);
    const next = () => { const ch = code[ci++ % code.length]; return RN_IX.get(ch === ' ' ? '·' : ch); };
    const step = fs * 0.8, di = D ? 74 : 44, dk = step * 1.7, laneGap = fs * 0.62, maxLanes = big ? (D ? 7 : 4) : 3;
    let X0 = 1e9, X1 = -1e9;
    for (const t of T) { X0 = Math.min(X0, t.e0); X1 = Math.max(X1, t.e1); }
    // dopelnienia rogow i pasa pod nawigacja ciagna z osobnego ziarna, zeby korony z rng zostaly jak byly
    const rng2 = rnRng(0x51ab + RN.gen * 131 + T.length);
    const ax = [], ay = [], Hz = ground - top;
    const addAtt = (x, y) => {
      if (x < X0 || x > X1 || y < roof + 4 || y > ground - 24 || rnBlocked(x, y)) return false;
      ax.push(x); ay.push(y); return true;
    };
    for (const t of T) {
      const h = big ? Hz * (0.93 + rng() * 0.05) : Hz * (0.42 + rng() * 0.1);
      const cTop = ground - h, cBot = ground - h * (big ? 0.47 + rng() * 0.08 : 0.4);
      const rx = Math.min((t.x1 - t.x0) / 2 - 6, h * (big ? 0.34 : 0.42));
      const cx = Math.max(t.x0 + rx, Math.min(t.x1 - rx, t.x + (rng() - 0.5) * rx * 0.35));
      t.cTop = cTop; t.cBot = cBot; t.cx = cx;
      // korona = kilka nachodzacych elips, zeby sylwetka nie byla idealnym jajkiem
      const blobs = [{ x: cx, y: (cTop + cBot) / 2, rx, ry: (cBot - cTop) / 2 }];
      for (let i = 0, nb = 3 + Math.floor(rng() * 3); i < nb; i++)
        blobs.push({ x: cx + (rng() - 0.5) * rx * 1.1, y: cTop + (cBot - cTop) * (0.25 + rng() * 0.55), rx: rx * (0.45 + rng() * 0.35), ry: (cBot - cTop) * (0.3 + rng() * 0.25) });
      const N = big ? (D ? 440 : 200) : (D ? 120 : 60);
      for (let tries = 0, n = 0; n < N && tries < N * 8; tries++) {
        const bl = blobs[Math.floor(rng() * blobs.length)], u = rng() * Math.PI * 2, r = Math.sqrt(rng());
        if (addAtt(bl.x + Math.cos(u) * bl.rx * r, bl.y + Math.sin(u) * bl.ry * r)) n++;
      }
      yield;
      /* wspolna korona: gorny zewnetrzny rog strefy tez ma swiatlo (maisa 29.09: „zeby wypelnialo strone
         faktycznie”), inaczej elipsy zwezaja sie ku gorze i przy krawedzi ekranu zostaje pusty rog */
      if (arch && T.length > 1) {
        const outer = t === T.reduce((a, b) => a.cx < b.cx ? a : b) ? t.x0 : t.x1, dir = outer < cx ? 1 : -1;
        const ox = outer + dir * rx * 0.3, oy = cTop + (cBot - cTop) * 0.2, orx = rx * 0.6, ory = (cBot - cTop) * 0.28;
        const NC = D ? 130 : 40;
        for (let tries = 0, n = 0; n < NC && tries < NC * 8; tries++) {
          const u = rng() * Math.PI * 2, r = Math.sqrt(rng());
          if (addAtt(ox + Math.cos(u) * orx * r, oy + Math.sin(u) * ory * r)) n++;
        }
        /* maisa 30.09 (kolka 1 i 4): rog nadal pusty pod logo i przy prawej krawedzi, wiec druga plama swiatla
           wyzej i w samym rogu ekranu, od sufitu galezi do ok. jednej trzeciej korony */
        if (!D) {
          const ex = dir > 0 ? t.e0 : t.e1;
          const qx = ex + dir * rx * 0.35, qy = roof + (cBot - roof) * 0.2, qrx = rx * 0.55, qry = (cBot - roof) * 0.22;
          for (let tries = 0, n = 0; n < 30 && tries < 240; tries++) {
            const u = rng2() * Math.PI * 2, r = Math.sqrt(rng2());
            if (addAtt(qx + Math.cos(u) * qrx * r, qy + Math.sin(u) * qry * r)) n++;
          }
        } else {
          /* maisa 30.09 poznym wieczorem (hak w lewym rogu): jedna plama w samym rogu ciagnela jedna dluga galaz,
             ktora obrysowywala pusta kieszen. Swiatlo idzie teraz w rog pasem od lewego brzegu korony: kilka
             malych elips, kazda w zasiegu di od poprzedniej, wiec do rogu rosnie kilka galezi obok siebie.
             Kierunek z polozenia pnia: `outer` wyzej porownuje cx, a prawa korona nie ma go jeszcze, gdy liczy sie
             lewa, wiec dla lewego drzewa plamy „w rog” szly do srodka (zostaja, bo trzymaja luk; strumien rng bez zmian) */
          const dO = t.x < W / 2 ? 1 : -1, ex = dO > 0 ? t.e0 : t.e1;
          if (dO !== dir) {   // lewe drzewo nie mialo gornej plamy przy krawedzi, dostaje ja z rng2
            const ox = (dO > 0 ? t.x0 : t.x1) + dO * rx * 0.3;
            for (let tries = 0, n = 0; n < NC && tries < NC * 8; tries++) {
              const u = rng2() * Math.PI * 2, r = Math.sqrt(rng2());
              if (addAtt(ox + Math.cos(u) * orx * r, oy + Math.sin(u) * ory * r)) n++;
            }
          }
          const fx = cx - dO * rx * 0.7, fy = (cTop + cBot) / 2, tx = ex + dO * 40, ty = roof + 40;
          const K = Math.max(3, Math.ceil(Math.hypot(tx - fx, ty - fy) / (di * 0.6)));
          for (let k = 0; k <= K; k++) {
            const f = k / K, px = fx + (tx - fx) * f, py = fy + (ty - fy) * f, pr = di * (0.75 - f * 0.15);
            for (let tries = 0, n = 0; n < 22 && tries < 180; tries++) {
              const u = rng2() * Math.PI * 2, r = Math.sqrt(rng2());
              if (addAtt(px + Math.cos(u) * pr, py + Math.sin(u) * pr * 0.8)) n++;
            }
          }
          yield;
          /* szersze ekrany: ta sama liczba punktow na wieksza korone dawala rzadszy zewnetrzny brzeg (1920 ~0,56x
             gestosci z 1440), wiec dopelnienie w zewnetrznej polowie glownej elipsy rosnie z szerokoscia */
          const s = W / 1440, NE = Math.round(440 * Math.max(0, s - 1) + 60), ry = (cBot - cTop) / 2;
          for (let tries = 0, n = 0; n < NE && tries < NE * 8; tries++) {
            const u = rng2() * Math.PI - Math.PI / 2, r = Math.sqrt(rng2());
            if (addAtt(cx - dO * Math.abs(Math.cos(u)) * rx * r, fy + Math.sin(u) * ry * r)) n++;
          }
          // kieszen nad sadzonka przy krawedzi: duza korona schodzi tu nizej i laczy sie z sadzonka
          const kx0 = ex, kx1 = cx - dO * rx * 0.6, ky0 = cTop + (cBot - cTop) * 0.3, ky1 = ground - Hz * 0.5;
          for (let tries = 0, n = 0; n < 70 && tries < 560; tries++)
            if (addAtt(kx0 + (kx1 - kx0) * rng2(), ky0 + (ky1 - ky0) * rng2())) n++;
        }
      }
      yield;
    }
    if (arch && T.length > 1) {
      // luk wspolnej korony: od gornej czesci lewej korony do prawej, najwyzej na srodku, nad nadtytulem
      const L = T.reduce((a, b) => a.cx < b.cx ? a : b), R = T.reduce((a, b) => a.cx > b.cx ? a : b);
      const xa = L.cx, xb = R.cx, yEnd = L.cTop + (L.cBot - L.cTop) * 0.3, yMid = top + (D ? 30 : 8), th = D ? 36 : 12;
      const N = D ? 360 : 90;
      for (let tries = 0, n = 0; n < N && tries < N * 10; tries++) {
        const x = xa + (xb - xa) * rng(), u = (x - (xa + xb) / 2) / ((xb - xa) / 2), yc = yEnd - (yEnd - yMid) * (1 - u * u);
        if (addAtt(x + (rng() - 0.5) * 8, yc + (rng() - 0.5) * 2 * th)) n++;
      }
      // pas pod nawigacja przez cala szerokosc (maisa 30.09, kolka 2 i 3): luk bez dziury, galezie do gory strony
      const NB = D ? 240 : 50, hb = D ? 110 : 40;
      for (let tries = 0, n = 0; n < NB && tries < NB * 10; tries++)
        if (addAtt(X0 + (X1 - X0) * rng2(), roof + 4 + rng2() * hb)) n++;
      /* maisa 01.10 (kolko na srodku luku): waski pas swiatla dawal na srodku jedna nitke z pusta kieszenia pod nia,
         jak drut miedzy drzewami. Na komputerze srodek luku dostaje z rng2 szerszy pas i polksiezyc swiatla w dol,
         do polowy drogi do nadtytulu (rnBlocked i tak trzyma 26 px od tekstu), wiec korony sie zrastaja */
      if (D) {
        const E = RN.eo, yEb = E.ok ? E.y : yMid + 200, xm = (xa + xb) / 2, hw = (xb - xa) / 2;
        for (let tries = 0, n = 0; n < 200 && tries < 2000; tries++) {
          const u = (rng2() * 2 - 1) * 0.5, yc = yEnd - (yEnd - yMid) * (1 - u * u), f = 1 - (u / 0.5) ** 2;
          const dep = Math.max(0, (yEb - yc) * 0.6 - th) * f;
          if (addAtt(xm + u * hw + (rng2() - 0.5) * 8, yc - th * (1 + 0.8 * f) + rng2() * (th * (2 + 1.6 * f) + dep))) n++;
        }
      }
    }
    yield;
    // siatki (klucz liczbowy): swiatlo i wezly; komorka di, wiec sasiedzi 3x3 pokrywaja promien di
    const key = (x, y) => (Math.floor(x / di) + 8) * 4096 + Math.floor(y / di) + 8;
    const na = ax.length, aon = new Uint8Array(na).fill(1), ag = new Map();
    for (let a = 0; a < na; a++) { const k = key(ax[a], ay[a]); let l = ag.get(k); if (!l) ag.set(k, l = []); l.push(a); }
    yield;
    const nx = [], ny = [], np = [], nk = [], nr = [], nd = [], ng = new Map();
    const addNode = (x, y, p, root) => {
      const i = nx.length;
      nx.push(x); ny.push(y); np.push(p); nk.push(0);
      nr.push(p < 0 ? root : nr[p]); nd.push(p < 0 ? 0 : nd[p] + Math.hypot(x - nx[p], y - ny[p]));
      if (p >= 0) nk[p]++;
      const k = key(x, y); let l = ng.get(k); if (!l) ng.set(k, l = []); l.push(i);
      return i;
    };
    const near = (x, y, rad) => {
      let best = -1, bd = rad * rad;
      const gx = Math.floor(x / di) + 8, gy = Math.floor(y / di) + 8;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const l = ng.get((gx + a) * 4096 + gy + b); if (!l) continue;
        for (let j = 0; j < l.length; j++) { const i = l[j], dx = nx[i] - x, dy = ny[i] - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
      }
      return best;
    };
    const seesLight = (x, y) => {
      const gx = Math.floor(x / di) + 8, gy = Math.floor(y / di) + 8;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const l = ag.get((gx + a) * 4096 + gy + b); if (!l) continue;
        for (let j = 0; j < l.length; j++) if (Math.hypot(ax[l[j]] - x, ay[l[j]] - y) < di) return true;
      }
      return false;
    };
    // pnie: od ziemi ku srodkowi dolu korony z lekkim falowaniem, az korona je „zobaczy”
    const roots = [];
    T.forEach((t, ri) => {
      roots.push(addNode(t.x, ground, -1, ri));
      for (let i = 0; i < 400; i++) {
        const n = nx.length - 1;
        if (ny[n] < t.cBot || seesLight(nx[n], ny[n])) break;
        let dx = t.cx - nx[n], dy = t.cBot - ny[n];
        const l = Math.hypot(dx, dy) || 1; dx = dx / l + Math.sin(i * 0.35 + t.x) * 0.12; dy /= l;
        const m = Math.hypot(dx, dy); addNode(nx[n] + dx / m * step, ny[n] + dy / m * step, n);
      }
    });
    // kolonizacja: kazde swiatlo ciagnie najblizszy wezel, wezel rosnie krokiem ku sumie kierunkow
    const accX = [], accY = [], accS = [], touched = [], fresh = [];
    for (let it = 0; it < 320; it++) {
      touched.length = 0;
      for (let a = 0; a < na; a++) {
        if (a % 1200 === 1199) yield;   // wiecej swiatla w rogach: pierwsze iteracje dzielone, krok przy 4x CPU krotki
        if (!aon[a]) continue;
        const i = near(ax[a], ay[a], di); if (i < 0) continue;
        const dx = ax[a] - nx[i], dy = ay[a] - ny[i], l = Math.hypot(dx, dy) || 1;
        if (accS[i] !== it) { accS[i] = it; accX[i] = 0; accY[i] = 0; touched.push(i); }
        accX[i] += dx / l; accY[i] += dy / l;
      }
      if (!touched.length) break;
      fresh.length = 0;
      for (let q = 0; q < touched.length; q++) {
        const i = touched[q];
        let dx = accX[i], dy = accY[i] - 0.35;                        // fototropizm: lekko w gore
        const l = Math.hypot(dx, dy); if (l < 1e-3) continue; dx /= l; dy /= l;
        const x = nx[i] + dx * step, y = ny[i] + dy * step;
        if (y < roof || y > ground - 6 || x < X0 || x > X1) continue;
        if (near(x, y, step * 0.5) >= 0) continue;
        fresh.push(addNode(x, y, i));
      }
      if (!fresh.length) break;
      // zjedzone swiatlo gasnie (dk < di, wiec wystarcza komorki 3x3 wokol nowego wezla)
      for (let q = 0; q < fresh.length; q++) {
        const j = fresh[q], gx = Math.floor(nx[j] / di) + 8, gy = Math.floor(ny[j] / di) + 8;
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
          const l = ag.get((gx + a) * 4096 + gy + b); if (!l) continue;
          for (let z = 0; z < l.length; z++) { const k = l[z]; if (aon[k] && Math.hypot(ax[k] - nx[j], ay[k] - ny[j]) < dk) aon[k] = 0; }
        }
      }
      yield;
    }
    /* most miedzy koronami (maisa 29.09: „tu brakuje mi polaczenia z tymi drzewami”): obie strony luku zjadaja
       swiatlo, zanim sie spotkaja, i na srodku zostaje przerwa. Szukamy najblizszej pary wezlow z dwoch pni
       w gornym pasie miedzy pniami i dociagamy od jednej galazke krokiem step, z lekkim wygieciem w gore. */
    if (arch && T.length > 1) {
      const lo = Math.min(T[0].cx, T[1].cx), hi = Math.max(T[0].cx, T[1].cx), yb = top + (ground - top) * 0.4;
      const c0 = [], c1 = [];
      for (let i = 0; i < nx.length; i++) if (ny[i] < yb && nx[i] > lo && nx[i] < hi) (nr[i] === 0 ? c0 : c1).push(i);
      let best = 1e18, A = -1, B = -1, pary = 0;
      for (let q = 0; q < c0.length; q++) {
        // yield po liczbie sprawdzonych par, nie wezlow: pas pod nawigacja zageszcza oba koniuszki luku
        if ((pary += c1.length) > 30000) { pary = 0; yield; }
        const i = c0[q];
        for (let z = 0; z < c1.length; z++) { const j = c1[z], dx = nx[i] - nx[j], dy = ny[i] - ny[j], d = dx * dx + dy * dy; if (d < best) { best = d; A = i; B = j; } }
      }
      if (A >= 0 && best > step * step * 2.5) {
        const d = Math.sqrt(best), n = Math.ceil(d / step);
        let p = A;
        for (let k = 1; k < n; k++) {
          const t = k / n;
          p = addNode(nx[A] + (nx[B] - nx[A]) * t, ny[A] + (ny[B] - ny[A]) * t - Math.sin(t * Math.PI) * d * 0.08, p);
        }
      }
      yield;
    }
    // grubosc: model rurek od czubkow do korzenia, skala osobno dla kazdego pnia
    const nn = nx.length, r2 = new Float32Array(nn);
    for (let i = nn - 1; i >= 0; i--) { if (!nk[i]) r2[i] += 1; if (np[i] >= 0) r2[np[i]] += r2[i]; }
    const kk = roots.map(r => maxLanes / Math.sqrt(r2[r] || 1));
    // znaki wzdluz galezi, pas po pasie
    for (let i = 0; i < nn; i++) {
      if (i % 120 === 119) yield;
      const p = np[i]; if (p < 0) continue;
      const ang = Math.atan2(ny[i] - ny[p], nx[i] - nx[p]), vx = -Math.sin(ang), vy = Math.cos(ang);
      // nasada przy ziemi rozszerza sie (ostatnie ~4 kroki pnia), jak u prawdziwego drzewa
      const flare = 1 + Math.max(0, 1 - (ground - ny[i]) / (step * 4)) * 0.5;
      const w = Math.sqrt(r2[i]) * kk[nr[i]] * flare, L = Math.max(1, Math.min(maxLanes + 2, Math.round(w))), thin = L === 1;
      const fz = fs * (thin ? (w < 0.55 ? 0.72 : 0.84) : 1);
      for (let l = 0; l < L; l++) {
        const off = (l - (L - 1) / 2) * laneGap, edge = L > 1 && (l === 0 || l === L - 1);
        items.push({ k: 0, x: nx[i] + vx * off, y: ny[i] + vy * off, a: ang + Math.PI / 2, g0: next(), g1: -1, b: nd[i],
          sh: edge ? 1 : thin ? 0.9 : 0.4, fz, al: 0 });
      }
      // liscie: kepy hex przy czubkach i najcienszych galazkach
      if ((!nk[i] || r2[i] <= 2) && rng() < (nk[i] ? 0.35 : 1)) {
        const k = 3 + Math.floor(rng() * 3), R = D ? 10 : 6;
        for (let j = 0; j < k; j++) {
          const u = rng() * Math.PI * 2, r = R * Math.sqrt(rng()), x = nx[i] + Math.cos(u) * r, y = ny[i] + Math.sin(u) * r - R * 0.3;
          if (y < roof || rnBlocked(x, y)) continue;
          const two = rng() < 0.35, g0 = RN_HX[Math.floor(rng() * 16)], g1 = two ? RN_HX[Math.floor(rng() * 16)] : -1;
          items.push({ k: 1, x, y, a: 0, g0, g1, b: nd[i] + step * (1 + j), sh: 0, fz: fs, al: 0.55 + rng() * 0.8 });
        }
      }
    }
    // korzenie: kilka pedow przy ziemi, w bok; nad linia ziemi (maisa 30.09: „drzewa wychodza poza linie na dole”)
    const yR = ground - fs * 0.4;
    for (const t of T) {
      const nrt = big ? 4 + Math.floor(rng() * 2) : 2;
      for (let j = 0; j < nrt; j++) {
        const side = j % 2 ? 1 : -1, len = (big ? (D ? 46 : 22) : (D ? 20 : 10)) * (0.6 + rng() * 0.6);
        let ang = (side > 0 ? 0 : Math.PI) + side * (0.12 + rng() * 0.35), x = t.x + side * laneGap * 0.8, y = yR - 2;
        for (let s = 0; s < len / step; s++) {
          x += Math.cos(ang) * step; y = Math.min(yR, y + Math.sin(ang) * step); ang += side * (rng() - 0.3) * 0.15;
          items.push({ k: 0, x, y, a: ang + Math.PI / 2, g0: next(), g1: -1, b: s * step * 0.6, sh: Math.max(0.2, 0.6 - s * 0.04), fz: fs * (0.9 - s * 0.03), al: 0 });
        }
      }
    }
  }
  // cala generacja: wspolne drzewo z duzych pni + sadzonki osobno; b (droga od korzenia) skalowane do RN_G sekund
  function* rnGen(gen) {
    const rng = rnRng(0x3f2a + gen * 7919 + (67 << 8)), items = [];
    yield* rnTree(rng, RN.trees.filter(t => t.big), true, RN_CODE[gen % RN_CODE.length], items);
    for (let i = 0; i < RN.trees.length; i++)
      if (!RN.trees[i].big) yield* rnTree(rng, [RN.trees[i]], false, RN_CODE[(gen + i) % RN_CODE.length], items);
    let mx = 0;
    for (const o of items) if (o.b > mx) mx = o.b;
    for (const o of items) o.b = o.b / (mx || 1) * RN_G;
    /* trawa z kodu (port z headera Pycodemath, maisa 30.09: „dodaj tę trawę do strony”): od lewej do prawej krawędzi
       ekranu (maisa 30.09: „żeby trawa rosła dalej, tak do końca strony”), łączy linie ziemi pod drzewami; rośnie od pni
       w boki. Między pniami spotyka się pośrodku, za skrajnymi pniami dochodzi do krawędzi w tej samej chwili.
       Źdźbło 1–5 znaków, kępy z dwóch sinusów, czubek czasem gorący; pieczone do bufora jak kora (bez kołysania,
       zero kosztu na klatkę). */
    const D = !RN.mob, fs = RN.fs, g = RN.ground;
    const pnie = RN.trees.map(t => t.x).sort((a, b) => a - b), p0 = pnie[0], p1 = pnie[pnie.length - 1];
    let midD = 1;
    for (let i = 1; i < pnie.length; i++) midD = Math.max(midD, (pnie[i] - pnie[i - 1]) / 2);
    const reach = x => x < p0 ? (p0 - x) / Math.max(1, p0) : x > p1 ? (x - p1) / Math.max(1, W - p1)
      : Math.min(...pnie.map(p => Math.abs(x - p))) / midD;
    const krok = fs * 0.7;
    for (let x = rng() * 4, q = 0; x < W; x += (D ? 3 : 2.5) + rng() * (D ? 4 : 3)) {
      if (++q % 120 === 0) yield;
      if (rnBlocked(x, g - 20)) continue;
      const kepa = 0.5 + 0.5 * Math.sin(x * 0.019 + 1.3) * Math.sin(x * 0.0071 + 0.4);
      const n = 1 + Math.floor(Math.pow(rng(), 1.3) * (D ? 2 + kepa * 4 : 1 + kepa * 3)), lean = (rng() - 0.5) * 0.5;
      const b0 = 0.1 + Math.min(1, reach(x)) * RN_G * 0.8, sh = 0.5 + rng() * 0.4, hot = rng() < 0.2;
      for (let j = 0; j < n; j++) {
        const d = j * krok + fs * 0.45, tip = j === n - 1;
        const s = tip ? RN_GTIP : RN_GRASS, gi = RN_IX.get(s[Math.floor(rng() * s.length)]);
        items.push({ k: 2, x: x + Math.sin(lean) * d, y: g - Math.cos(lean) * d, a: lean, g0: gi, g1: -1,
          b: b0 + j * 0.06, sh, fz: fs, al: tip && hot ? 1 : 0 });
      }
    }
    yield;
    items.sort((a, b) => a.b - b.b);
    yield;
    const leaf = [];
    for (let i = 0; i < items.length; i++) if (items[i].k === 1) leaf.push(i);
    return { items, leaf: Int32Array.from(leaf), gen };
  }
  function rnStep(budget) {
    const t0 = performance.now();
    let r;
    do r = RN.job.next(); while (!r.done && performance.now() - t0 < budget);
    if (r.done) { RN.job = null; RN.pend = r.value; }
  }
  function rnSwap() {
    const p = RN.pend; RN.pend = null;
    RN.items = p.items; RN.leaf = p.leaf; RN.gen = p.gen; RN.ptr = 0; RN.u = 0; RN.fallAcc = 0;
    for (const q of RN.fall) q.on = false;
    RN.c.clearRect(0, 0, W, H);
  }
  // znak do bufora drzewa: raz, w chwili narodzin
  function rnBake(o) {
    const c = RN.c;
    if (o.k === 2) {   // trawa: karmazyn, czubek czasem goracy (al 1)
      c.globalAlpha = Math.min(1, RN_OP * o.sh);
      rnGlyph(c, o.g0, o.al ? 1 : 0, o.x, o.y, o.fz, o.a);
    } else if (o.k) {
      c.globalAlpha = Math.min(1, RN_OP * o.al);
      if (o.g1 < 0) rnGlyph(c, o.g0, 1, o.x, o.y, RN.fs, 0);
      else { const h = RN.fs * 0.3; rnGlyph(c, o.g0, 1, o.x - h, o.y, RN.fs, 0); rnGlyph(c, o.g1, 1, o.x + h, o.y, RN.fs, 0); }
    } else {
      c.globalAlpha = Math.min(1, RN_OP * o.sh);
      rnGlyph(c, o.g0, 0, o.x, o.y, o.fz, o.a);
    }
  }

  function rnPaint(wc, time, age, op) {
    wc.clearRect(0, 0, W, H);
    if (!TXT.ok && bgTextMeasure(RN_SEL)) { bgMaskBuild(); rnEbMask(); }
    if (!TXT.ok && !RN.mob) return;   // bez ukladu tekstu drzewo wroslo by w naglowek
    const dt = RN.lt < 0 ? 0 : Math.max(0, Math.min(0.1, time - RN.lt)); RN.lt = time;
    const D = !RN.mob;
    RN.u = reduce ? RN_G + 1 : RN.u + dt;
    // jedno drzewo na wejscie (maisa: „raz sie wygeneruja i bedzie git”); reduced motion: od razu cale
    if (!RN.items && !RN.job && !RN.pend) RN.job = rnGen(RN.gen);
    if (RN.job) rnStep(reduce ? 1e9 : RN_BUDGET);
    if (RN.pend) { rnSwap(); if (reduce) RN.u = RN_G + 1; }
    const it = RN.items;
    wc.globalAlpha = op;
    if (it) {
      while (RN.ptr < it.length && it[RN.ptr].b <= RN.u) rnBake(it[RN.ptr++]);
      RN.c.globalAlpha = 1;
      // bufor tylko do linii ziemi: nasada pni i korzenie nie wystaja pod nia
      const gp = Math.min(RN.cv.height, Math.round((RN.ground + 1) * dpr));
      wc.drawImage(RN.cv, 0, 0, RN.cv.width, gp, 0, 0, W, gp / dpr);
      if (!reduce && RN.u < RN_G) {
        // kursory na czubkach rosnacych pedow: ostatnio urodzone znaki
        wc.globalAlpha = op * Math.min(1, RN_OP * 2.4);
        for (let i = Math.max(0, RN.ptr - 40); i < RN.ptr; i++) if (RN.u - it[i].b <= 0.12) rnGlyph(wc, RN_CUR, 1, it[i].x, it[i].y, RN.fs, 0);
      }
      if (!reduce && RN.ptr) {
        // kod zyje: kilka znakow na chwile podmienia sie (rozblysk), bez przerysowania bufora
        const tick = Math.floor(time * 6);
        wc.globalAlpha = op * RN_OP * 1.6;
        for (let j = 0; j < 5; j++) {
          const r = Math.sin((tick * 13 + j * 71 + RN.gen * 7) * 12.9898) * 43758.5453, o = it[Math.floor((r - Math.floor(r)) * RN.ptr)];
          rnGlyph(wc, RN_HX[(tick + j) & 15], 1, o.x, o.y, RN.fs, 0);
        }
      }
      if (!reduce && RN.leaf.length) {
        /* jesien (maisa 29.09: „zeby ten kod intensywniej sypal liscmi”): liscie odrywaja sie od urodzonych,
           kolysza szeroko, laduja na ziemi i gasna. Gestosc trzyma pula (komputer 160, telefon 60 naraz),
           tempo odrywania wyzsze niz pula, wiec w powietrzu jest zawsze tyle, ile miesci pula; zero alokacji. */
        const cap = D ? RN_FALL : 60;
        RN.fallAcc += dt * (D ? 26 : 10) * (RN.u < RN_G ? RN.u / RN_G : 1);
        while (RN.fallAcc >= 1) {
          RN.fallAcc -= 1;
          const i = RN.leaf[Math.floor(Math.random() * RN.leaf.length)];
          if (i >= RN.ptr) continue;
          let q = null;
          for (let k = 0; k < cap; k++) if (!RN.fall[k].on) { q = RN.fall[k]; break; }
          if (!q) { RN.fallAcc = 0; break; }
          const o = it[i];
          q.on = true; q.x0 = o.x; q.y = o.y; q.g0 = o.g0; q.g1 = o.g1 >= 0 && Math.random() < 0.5 ? o.g1 : -1; q.al = o.al;
          q.vy = D ? 28 + Math.random() * 32 : 15 + Math.random() * 17; q.amp = D ? 12 + Math.random() * 20 : 6 + Math.random() * 9;
          q.sp = 0.9 + Math.random() * 1.6; q.ph = Math.random() * 6.28; q.dr = (Math.random() - 0.3) * (D ? 16 : 7); q.t = 0; q.land = 0;
        }
        const z = RN.fs * 0.9, h = z * 0.3;
        for (let k = 0; k < cap; k++) {
          const q = RN.fall[k]; if (!q.on) continue;
          q.t += dt;
          if (!q.land) {
            q.y += q.vy * dt;
            if (q.y >= RN.ground - 3) { q.y = RN.ground - 3; q.land = dt || 1e-3; q.xl = q.x0 + Math.sin(q.t * q.sp + q.ph) * q.amp + q.t * q.dr; }
          } else q.land += dt;
          if (q.land > RN_LIE) { q.on = false; continue; }   // leza na ziemi jak dywan jesienia
          const sw = Math.sin(q.t * q.sp + q.ph), x = q.land ? q.xl : q.x0 + sw * q.amp + q.t * q.dr, an = q.land ? 1.57 : sw * 0.7;
          wc.globalAlpha = op * Math.min(1, RN_OP * q.al * 1.15 * (q.land ? 1 - q.land / RN_LIE : 1));
          if (q.g1 < 0) rnGlyph(wc, q.g0, 1, x, q.y, z, an);
          else {
            const ca = Math.cos(an) * h, sa = Math.sin(an) * h;
            rnGlyph(wc, q.g0, 1, x - ca, q.y - sa, z, an); rnGlyph(wc, q.g1, 1, x + ca, q.y + sa, z, an);
          }
        }
      }
    }
    // linia ziemi (odczyt SEED/GEN zdjety na prosbe maisy)
    wc.globalAlpha = op;
    wc.fillStyle = rnA(RN_OP * 0.5);
    // jedna linia od krawedzi do krawedzi (maisa 30.09: „polacz te linie pod drzewami”), trawa na niej laczy drzewa
    wc.fillRect(0, RN.ground + 1, W, 1);
    wc.globalAlpha = 1;
    // sufit pod tekstem liczony od pelnego krycia (nakladki w lighter go nie przebijaja), pod nadtytulem czysto
    bgMaskOut(wc, 1 - RN_CAP);
    if (RN.eo.ok) {
      wc.globalCompositeOperation = 'destination-out';
      wc.drawImage(RN.eb, RN.eo.x, RN.eo.y, RN.eo.w, RN.eo.h);
      wc.globalCompositeOperation = 'source-over';
    }
  }
  BG.rnd = { layer: 'bg', fps: 24, comp: 'lighter', build: rnBuild, paint: rnPaint };

  /* Bufory pod linie laczace. Alokowane RAZ, nie co klatke: pętla mapy jest
     goraca, a tablica tworzona 60 razy na sekunde to smieci dla GC. */
  const LINK_CAP = 50;
  const nearMouse = new Array(LINK_CAP);
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
    const n = particles.length;
    if (pbB.length !== n) { pbB = new Uint8Array(n); pbR = new Float32Array(n); pbIdx = new Int32Array(n); }
  }
  function pbColors(boost) {
    const a = themeState.a, key = (a[0] | 0) + ',' + (a[1] | 0) + ',' + (a[2] | 0) + ',' + boost;
    if (key === pbKey) return;
    pbKey = key;
    for (let k = 0; k <= PW; k++) pbStyle[k] = rgba(a, 0.45 * boost + 0.3 * k / PW);
    for (let k = 0; k < LB; k++) lbStyle[k] = rgba(a, 0.5 * (k + 0.5) / LB);
  }

  /* P1 (30.09): tempo petli wedlug tego, co jest na ekranie. Bylo: kazda trasa 120 kl./s na
     monitorze 120 Hz, takze gdy tlo przerysowuje sie 24x/s, a trasa ma tylko 14 iskier —
     czyszczenie i skladanie kanwy na caly ekran co klatke = ~50% rdzenia na stojacej stronie.
     Klatka pominieta nie dotyka kanwy, wiec przegladarka nie ma czego skladac.
       0  = kazda klatka ekranu: przejscie miedzy trasami albo kursor przed chwila ruszal sie nad mapa
       60 = sama mapa (dryf i fala sa wolne)
       fps tla = tlo podstrony (i tak przerysowuje sie tyle razy)
       30 = same iskry */
  let mouseT = -1e9, drawT = 0;
  /* Samoregulacja: sredni czas rysowania klatki (EMA). Powyzej 6 ms (slaby procesor: przy 4x CPU
     Start z kursorem ~7 ms) kursor nad mapa nie podbija petli ponad 60 kl./s. Na 60 Hz bez zmian,
     na 120 Hz slabszy laptop dostaje polowe pracy zamiast pelnego rdzenia. */
  let pracaMs = 0, slabyCpu = false;   // histereza: wlacza sie > 6 ms, puszcza < 3 ms
  function tempoPetli(t) {
    if (bgPrevA > 0.02) return 0;
    for (const k in themeState.layers) if (Math.abs(themeState.layers[k] - themeTarget.layers[k]) > 0.01) return 0;
    if (particles.length) return t - mouseT < 1500 && !slabyCpu ? 0 : 60;
    const p = BG[bgId];
    if (p && themeState.layers[p.layer || 'bg'] > 0.02) return p.fps || 30;
    return 30;
  }

  let lastT = performance.now();
  let rafOn = true;
  function frame(t) {
    const fps = reduce ? 0 : tempoPetli(t);
    if (fps) {
      const iv = 1000 / fps, el = t - drawT;
      if (el < iv - 2) { if (rafOn) requestAnimationFrame(frame); return; }
      drawT = el > 2 * iv ? t : drawT + iv;
    } else drawT = t;
    const t0p = performance.now();
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
    pbFit(); pbCnt.fill(0);
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

      let b = 0, rad = p.r;
      if (waveR >= 0) {
        const dd = Math.abs(p.cd - waveR);
        if (dd < 70) {
          const f = (1 - dd / 70) * waveGain;
          b = Math.min(PW, Math.round(f * PW));
          rad += f * 0.9;
        }
      }
      pbB[i] = b; pbR[i] = rad; pbCnt[b]++;
    }
    /* P1 (30.09): kropki mapy hurtem. Bylo: fillStyle (nowy string rgba) + beginPath + arc + fill
       NA KAZDA kropke, ~2000 fill na klatke = polowa czasu Startu. Teraz alfa fali skwantowana do
       PW+1 kubelkow (roznica 0,05 krycia, nie do zobaczenia), jedna sciezka i jeden fill na kubelek,
       sortowanie przez zliczanie bez alokacji. Promien zostaje dokladny, per kropka. */
    if (particles.length) {
      pbColors(mouse.active ? 1 : 0.82);
      for (let k = 0, o = 0; k <= PW; k++) { pbOff[k] = o; o += pbCnt[k]; }
      for (let i = 0; i < particles.length; i++) pbIdx[pbOff[pbB[i]]++] = i;
      for (let k = 0, o = 0; k <= PW; k++) {
        const n = pbCnt[k]; if (!n) continue;
        ctx.fillStyle = pbStyle[k];
        ctx.beginPath();
        for (let e = o + n; o < e; o++) {
          const i = pbIdx[o], p = particles[i], r = pbR[i];
          // P1: kropka do 1,5 px promienia jako kwadrat (po wygladzeniu nie do odroznienia od kola, a rect
          // jest kilka razy tanszy od arc); wieksze kropki i fala zostaja kolami
          if (r <= 1.5) { const q = r * 0.886; ctx.rect(p.x - q, p.y - q, 2 * q, 2 * q); }
          else { ctx.moveTo(p.x + r, p.y); ctx.arc(p.x, p.y, r, 0, 6.2832); }
        }
        ctx.fill();
      }
    }

    // circuit-link lines: cursor wakes the map into a live neural net, not just glowing dots
    // P1: odcinki w LB kubelkach alfy, jeden stroke na kubelek (bylo: stroke + string na odcinek)
    if (nearCount > 1) {
      let n = 0;
      for (let i = 0; i < nearCount; i++) {
        const a = nearMouse[i];
        for (let j = i + 1; j < nearCount; j++) {
          const q = nearMouse[j];
          const dx = a.x - q.x, dy = a.y - q.y;
          const d2 = dx * dx + dy * dy;
          if (d2 >= 1600) continue;
          const o = n * 5;
          lbSeg[o] = a.x; lbSeg[o + 1] = a.y; lbSeg[o + 2] = q.x; lbSeg[o + 3] = q.y;
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

    // second, feather-light pass: the embers (waga warstwy spark: tla M8 moga je zdjac)
    const sparkW = themeState.layers.spark;
    if (sparkW > 0.02) {
      for (let i = 0; i < sparks.length; i++) {
        const s = sparks[i];
        s.y -= s.vy * dt * 120;   // P1: predkosc w czasie (strojona na 120 Hz), nie na klatke - petla bywa 30 kl./s
        if (s.y < -10) newSpark(s, false);
        const sx = s.x + Math.sin(time * s.sp + s.ph) * s.amp;
        ctx.fillStyle = rgba(themeState.hot, s.a * sparkW);
        ctx.beginPath();
        ctx.arc(sx, s.y, s.r, 0, 6.2832);
        ctx.fill();
      }
    }

    // third pass: drifting product-chip outlines, only visible while the Produkty theme is active/blending in
    const chipW = themeState.layers.chips;
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

    // fourth pass: tlo trasy z rejestru BG (na somi M1 Blackwall) + zamrozony bufor poprzedniej trasy
    bgDraw(dt, time);

    ctx.globalCompositeOperation = 'source-over';
    pracaMs += (performance.now() - t0p - pracaMs) * 0.05;
    if (pracaMs > 6) slabyCpu = true; else if (pracaMs < 3) slabyCpu = false;
    if (rafOn) requestAnimationFrame(frame);
  }
  /* Petla mapy chodzi tylko wtedy, gdy mape widac.
     Dwa powody stopu, jeden wylacznik: ukryta karta (jak dotad) ORAZ — od M4.1 —
     zjechanie z hero, bo mapa nie siega juz dalej niz hero. Odzyskane klatki
     to nie teoria: pod hero nie ma juz nic do liczenia. */
  let tloWidoczne = true;
  /* popup Sadzonek zakrywa cale tlo — wtedy petla stoi, a jedyna pracujaca
     petla jest pisanie w terminalu popupu (zasada: max dwie naraz) */
  let popupZakrywa = false;
  function ustawPetleMapy() {
    const maBiec = tloWidoczne && !document.hidden && !popupZakrywa;
    if (maBiec && !rafOn) { rafOn = true; lastT = performance.now(); requestAnimationFrame(frame); }
    else if (!maBiec) { rafOn = false; }
    /* PASEK 03.10: nad pracujaca mapa szklo paska przeliczaloby rozmycie w kazdej klatce
       (zmierzone 4x CPU: 6-7 przycietych klatek na Starcie, bez tego 0) — wtedy pasek jest pelny */
    document.documentElement.classList.toggle('mapa-biegnie', maBiec);
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
    mouseT = performance.now();   // P1: pelne tempo petli tylko chwile po ruchu kursora
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

  /* PIGULKA (03.10): pokazuje TYLKO najechanie. Aktywna zakladka ma stala kreske w CSS, wiec po zjechaniu
     pigulka gasnie w miejscu zamiast leciec przez caly pasek na aktywna (maisa: "swiruje" przy szybkiej myszce).
     Zgaszona staje przy nastepnym najechaniu od razu pod kursorem, bez przejazdu. */
  let magicWidac = false, magicGas = 0;
  function moveMagic(el) {
    clearTimeout(magicGas);
    if (!el) { magic.style.opacity = '0'; magicWidac = false; return; }
    const cr = linksWrap.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (!magicWidac) magic.style.transition = 'opacity .16s ease';
    magic.style.width = (r.width - 2) + 'px';
    magic.style.transform = 'translate(' + (r.left - cr.left + 1) + 'px,-50%)';
    if (!magicWidac) { void magic.offsetWidth; magic.style.transition = ''; }
    magic.style.opacity = '1';
    magicWidac = true;
  }
  function zgasMagic() {
    clearTimeout(magicGas);
    magicGas = setTimeout(() => { magic.style.opacity = '0'; magicWidac = false; }, 90);
  }

  function closeMenu() {
    linksWrap.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    ustawLawe();
  }

  /* P1 (30.09): hCaptcha dopiero przy formularzu. Bylo: <script web3forms> w stopce ladowal
     api.js hCaptchy na KAZDEJ trasie od pierwszej sekundy, a ona slucha kazdego ruchu myszy
     i przewijania (profil: L.scrollX / _VRiksp... w kazdej klatce przewijania Startu). Polityka
     prywatnosci obiecuje, ze skrypt laduje sie przy wysylce — teraz: wejscie w Kontakt albo
     pierwszy fokus/dotyk w formularzu (zamowienie na SOMI). Widzety .h-captcha sa w DOM od
     poczatku, wiec skrypt znajduje je tak samo jak przy ladowaniu z HTML. */
  let captchaJest = false;
  function ladujCaptche() {
    if (captchaJest) return;
    captchaJest = true;
    const sc = document.createElement('script');
    sc.src = 'https://web3forms.com/client/script.js';
    sc.async = true;
    document.body.appendChild(sc);
  }
  document.querySelectorAll('.orderform').forEach(f => {
    f.addEventListener('focusin', ladujCaptche, { once: true });
    f.addEventListener('pointerdown', ladujCaptche, { once: true });
  });

  function go(view, push) {
    const apply = () => {
      if (!NAMES.includes(view)) view = 'start';
      if (view === 'products' && !PRODUKTY_WIDOCZNE) view = 'start';   // patrz PRODUKTY_WIDOCZNE
      /* w Kontakcie hCaptcha startuje w wolnej chwili (jej inicjacja to jeden ~400 ms task,
         nie moze trafic w wjazd widoku); fokus w formularzu laduje ja od razu */
      if (view === 'contact' && !captchaJest) {
        const tuJeszcze = () => { if (document.documentElement.dataset.route === 'contact') ladujCaptche(); };
        // wyjscie z Kontaktu przed czasem = czekamy na fokus, zeby ~400 ms nie trafilo w inna trase
        setTimeout(() => (window.requestIdleCallback || setTimeout)(tuJeszcze, { timeout: 4000 }), 1500);
      }
      // tlo starej trasy zamarza w drugim slocie, zanim nowe hero zmieni wymiar sceny
      if (document.documentElement.dataset.route !== view) bgLeave();
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
      moveMagic(null);
      closeMenu();
      zamknijPrzewodnik();
      lawaChwila(1200);   // wjazd nowej trasy dostaje caly czas klatki
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
      /* TEMAT Z GORY (27.09): "Zapytaj o darmowy audyt / o wycene / o SOMI"
         od razu wybiera temat w Kontakcie; change odswieza terminal podgladu. */
      const topic = el.dataset.topic;
      const sel = topic && document.querySelector('#contactForm [name="ctopic"]');
      if (sel && [...sel.options].some(o => o.value === topic)) {
        sel.value = topic;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });

  // pigulka idzie za kursorem po zakladkach, po zjechaniu gasnie w miejscu
  links.forEach(l => {
    l.addEventListener('mouseenter', () => moveMagic(l));
    l.addEventListener('focus', () => moveMagic(l));
    l.addEventListener('blur', zgasMagic);
  });
  linksWrap.addEventListener('mouseleave', zgasMagic);

  burger.addEventListener('click', () => {
    const open = linksWrap.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    ustawLawe();
  });

  /* ===================== PRZEWODNIK (03.10, wariant B) =====================
     Klik w "Przewodnik" rozwija pelny panel pod paskiem, strona przyciemnia sie (#navScrim).
     Zamykaja: ten sam przycisk, klik w tlo, Esc (fokus wraca na przycisk), wejscie w dowolna trase.
     Zamkniety panel ma inert, wiec Tab nie wpada w niewidoczne kafle. */
  const navEl = document.querySelector('.nav');
  const guideBtn = document.getElementById('navGuide');
  const guidePanel = document.getElementById('navPanel');
  const scrim = document.getElementById('navScrim');
  function otworzPrzewodnik() {
    guidePanel.inert = false; guidePanel.classList.add('open'); scrim.classList.add('on');
    navEl.classList.add('is-guide'); guideBtn.setAttribute('aria-expanded', 'true'); ustawLawe();
  }
  function zamknijPrzewodnik() {
    if (!guidePanel.classList.contains('open')) return;
    // fokus w panelu (Enter na kaflu) wraca na przycisk, zanim inert wyrzuci go na <body>
    if (guidePanel.contains(document.activeElement)) guideBtn.focus();
    guidePanel.classList.remove('open'); guidePanel.inert = true; scrim.classList.remove('on');
    navEl.classList.remove('is-guide'); guideBtn.setAttribute('aria-expanded', 'false'); ustawLawe();
  }
  guideBtn.addEventListener('click', () => guidePanel.classList.contains('open') ? zamknijPrzewodnik() : otworzPrzewodnik());
  scrim.addEventListener('click', zamknijPrzewodnik);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && guidePanel.classList.contains('open')) { zamknijPrzewodnik(); guideBtn.focus(); }
  });

  /* ===================== LAWA: wosk w lukach paska (03.10) =====================
     Dwie kolonie po 3 kule: luka logo|menu i luka menu|przyciski, nigdy pod napisami. Kula:
     [x0, x1 jako ulamek szerokosci luki, srodek y (pasek 64 px), wychyl y, promien, czas boku, gora-dol, oddechu, przesuniecie].
     Tory zachodza, czasy wzglednie pierwsze: kule schodza sie (zlewaja), rozchodza (szyja, oderwanie).
     Ruch to sam CSS (transform); JS buduje kule raz i liczy luki po fontach i przy resize — zero rAF. */
  const navLava = document.getElementById('navLava');
  const KOLONIE = [
    [[.12, .55, 34, 12, 23, 17, 8.3, 10.1, -3], [.32, .80, 28, 14, 17, 13, 6.7, 9.3, -11], [.20, .66, 42, 10, 25, 23, 9.7, 12.7, -17]],
    [[.10, .58, 32, 12, 22, 16, 7.9, 11.3, -23], [.36, .88, 24, 14, 16, 12, 6.3, 9.7, -13], [.24, .66, 42, 10, 25, 25, 9.1, 12.1, -29]]
  ];
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const LAWA_SKALA = 3;   // kolonia liczona w 1/3 rozdzielczosci i rozciagana scale(3) w CSS
  const kolonie = KOLONIE.map(kule => {
    const svg = document.createElementNS(SVG_NS, 'svg'), g = document.createElementNS(SVG_NS, 'g');
    svg.setAttribute('class', 'nav__kolonia'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    g.setAttribute('filter', 'url(#woskF)');
    kule.forEach(([, , , , pr, dx, dy, ds, del]) => {
      const gx = document.createElementNS(SVG_NS, 'g'), gy = document.createElementNS(SVG_NS, 'g'), c = document.createElementNS(SVG_NS, 'circle');
      gx.setAttribute('class', 'wx'); gy.setAttribute('class', 'wy'); c.setAttribute('class', 'wz');
      c.setAttribute('r', pr / LAWA_SKALA); c.setAttribute('fill', 'url(#woskGrad)');
      gx.style.setProperty('--dx', dx); gx.style.setProperty('--dy', dy); gx.style.setProperty('--ds', ds); gx.style.setProperty('--del', del);
      gy.appendChild(c); gx.appendChild(gy); g.appendChild(gx);
    });
    svg.appendChild(g); navLava.appendChild(svg);
    return { svg, kule, g };
  });
  function lawaPozycje() {
    const bi = bar.getBoundingClientRect();
    const tresc = el => {
      // mierzymy tresc, nie pudelko: logo i przyciski siedza w kolumnach 1fr rozciagnietych na pol paska
      const rg = document.createRange(); rg.selectNodeContents(el);
      const rr = rg.getBoundingClientRect(); return rr.width ? [rr.left - bi.left, rr.right - bi.left] : null;
    };
    const b = tresc(document.querySelector('.nav__brand')), n = tresc(linksWrap), sd = tresc(document.querySelector('.nav__side'));
    const odstep = 18, H = 64;   // wosk nie podchodzi blizej niz 18 px do napisow; wysokosc paska bez splaszczenia
    const luki = [b && n ? [b[1] + odstep, n[0] - odstep] : null, n && sd ? [n[1] + odstep, sd[0] - odstep] : null];
    kolonie.forEach(({ svg, kule, g }, k) => {
      const l = luki[k], w = l ? l[1] - l[0] : 0;
      if (w < 90) { svg.style.display = 'none'; return; }
      svg.style.display = ''; svg.style.left = Math.round(l[0]) + 'px';
      svg.setAttribute('width', Math.round(w / LAWA_SKALA)); svg.setAttribute('height', Math.round(H / LAWA_SKALA));
      [...g.children].forEach((gx, i) => {
        const [a, bb, yc, amp] = kule[i];
        gx.style.setProperty('--x0', (a * w / LAWA_SKALA).toFixed(1) + 'px'); gx.style.setProperty('--x1', (bb * w / LAWA_SKALA).toFixed(1) + 'px');
        gx.style.setProperty('--y0', ((yc - amp) / LAWA_SKALA).toFixed(1) + 'px'); gx.style.setProperty('--y1', ((yc + amp) / LAWA_SKALA).toFixed(1) + 'px');
      });
    });
  }
  /* regula pauzy: jeden atrybut na pasku, CSS zatrzymuje wszystkie animacje wosku */
  const lawaTelefon = matchMedia('(max-width: 900px)');
  const lawaMaloRuchu = matchMedia('(prefers-reduced-motion: reduce)');
  let lawaPrzewija = false, lawaPrzewT = 0, lawaCzeka = false, lawaCzekaT = 0;
  function ustawLawe() {
    const stoi = document.hidden || lawaTelefon.matches || lawaMaloRuchu.matches || lawaPrzewija || lawaCzeka
      || guidePanel.classList.contains('open') || linksWrap.classList.contains('open');
    navEl.dataset.lava = stoi ? 'stop' : 'run';
  }
  /* chwilowa pauza: przejscie miedzy trasami i ruch kursora nad mapa hero (mapa leci wtedy pelnym
     tempem). ZMIERZONE 03.10 przy 4x CPU: mapa pod kursorem + wosk naraz = przyciete klatki, osobno 0.
     Kursor nad paskiem nie zatrzymuje wosku — tam sie na niego patrzy. */
  function lawaChwila(ms) {
    if (!lawaCzeka) { lawaCzeka = true; ustawLawe(); }
    clearTimeout(lawaCzekaT);
    lawaCzekaT = setTimeout(() => { lawaCzeka = false; ustawLawe(); }, ms);
  }
  window.addEventListener('mousemove', (e) => {
    if (rafOn && tloWidoczne && !navEl.contains(e.target)) lawaChwila(900);
  }, { passive: true });
  window.addEventListener('scroll', () => {
    // przy przewijaniu wosk stoi (strona dostaje caly czas klatki), rusza 250 ms po zatrzymaniu
    if (!lawaPrzewija) { lawaPrzewija = true; ustawLawe(); }
    clearTimeout(lawaPrzewT);
    lawaPrzewT = setTimeout(() => { lawaPrzewija = false; ustawLawe(); }, 250);
  }, { passive: true });
  document.addEventListener('visibilitychange', ustawLawe);
  lawaTelefon.addEventListener('change', () => { if (!lawaTelefon.matches) closeMenu(); ustawLawe(); lawaPozycje(); });
  lawaMaloRuchu.addEventListener('change', ustawLawe);
  let lawaResizeT = 0;
  window.addEventListener('resize', () => { clearTimeout(lawaResizeT); lawaResizeT = setTimeout(lawaPozycje, 150); });
  if (document.fonts) document.fonts.ready.then(lawaPozycje);
  lawaPozycje();
  ustawLawe();

  window.addEventListener('hashchange', () => go(location.hash.slice(1), false));

  /* ===================== magnetic links (small reach, soft return) ===================== */
  if (!reduce) {
    /* Magnes na zakladkach paska WYCIETY 03.10: slowo drgalo o 2-3 px pod nieruchoma pigulka. */

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
        'Skąd o mnie wie: ' + (fd.get('csource') || '—') + '\n' +
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
            'Dziękuję' + (fd.get('cname') ? ', ' + escapeHtml(fd.get('cname')) : '') + '. Odezwę się na ' +
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
              'Zapytanie poszło do SOMI. Odezwę się na ' + email.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])) + '.';
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
    // wyzej: 156 leadow, bramka akceptacji, ponad 1400 testow) — SOMI nie obiecuje tu
    // nic ponad to, co strona juz mowi gdzie indziej.
    const SKRYPT_DEMO = {
      robi: {
        q: 'Co robisz?',
        a: 'Na co dzień pracuję w zapleczu cybersory: pilnuję radaru ofert i pomagam Patrykowi ogarniać robotę. Tu, na stronie, dopiero się tego uczę — na razie umiem porozmawiać i pokazać, od czego zacząć.'
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
  /* html.js stawia js-flag.js w <head>; tu tylko asekuracja, gdyby go zabraklo */
  document.documentElement.classList.add('js');
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
      /* threshold 0.15 na wysokich sekcjach dawal puste klatki przy szybkim
         przewijaniu — odslaniamy, gdy gorna krawedz minie 90% wysokosci ekranu */
    }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });
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

  /* ===================== Sadzonki: popup karty projektu (sesja 2, 30.09) =====================
     Klik w .seed otwiera #sproutPop na projekcie z karty; strzalki (w oknie i klawiatura
     ←/→) chodza po wszystkich czterech w kolejnosci kart, bez zamykania. Stan = jeden
     indeks `idx`. Tresc z tablicy SADZONKI nizej — fakty sprawdzone w repo projektow
     30.09, zero liczb spoza nich (zasada strony: nie zmyslac). Znak i "kod" w tle
     bierzemy z samej karty (cloneNode), zeby nie trzymac dwoch kopii rysunku.
     Pisanie po literce = pracujaca petla, wiec chodzi tylko przy otwartym oknie,
     a petla tla (mapa/BG) w tym czasie stoi (popupZakrywa). */
  (() => {
    const seeds = [...document.querySelectorAll('.seed[data-project]')];
    const somiKarty = [...document.querySelectorAll('.card[data-somi]')];   // 30.09: karty "Co juz umie" na SOMI
    const pop = document.getElementById('sproutPop');
    if ((!seeds.length && !somiKarty.length) || !pop) return;
    const $ = (id) => document.getElementById(id);
    const win = pop.querySelector('.sprout__win');
    const mainEl = document.querySelector('main');
    const body = $('sproutBody'), term = $('sproutTerm'), qs = $('sproutQs'), srlive = $('sproutSrLive');
    const btnPrev = $('sproutPrev'), btnNext = $('sproutNext'), btnClose = $('sproutClose');
    const shot = $('sproutShot'), shotImg = $('sproutShotImg');

    /* Zrodla (30.09): SalonDesk — app\salondesk\app\kasa.py, domain\reguly.py, wersja.py,
       DLA_TESTERA.md, app\README.md; Pycodemath — README, CHANGELOG, pyproject, PyPI JSON na zywo;
       Rachmistrz — rachmistrz\rrso.py, ARCHITEKTURA.md, NASTEPNY_MODUL.md; Frostwall — verify.py,
       fingerprint.py, seal.py, README. Nazwy klienta SalonDeska celowo NIE podajemy. */
    const SADZONKI = {
      salondesk: {
        nazwa: 'SalonDesk',
        lead: 'Program do prowadzenia salonu beauty na jednym komputerze: kalendarz wizyt, grafik zespołu, kartoteka klientek, kasa, magazyn i bony. Działa bez internetu i bez chmury.',
        fakty: [
          ['zakres', 'Wizyty · grafik · kartoteka · kasa · magazyn'],
          ['wersja', '1.4.2 · Windows · instalator'],
          ['silnik', 'Python · pywebview · SQLite'],
          ['dane', 'Na komputerze salonu, bez serwera'],
        ],
        zrzut: {
          src: 'sadzonki/salondesk-pulpit.webp', w: 1890, h: 342,
          alt: 'Pulpit SalonDeska w ciemnym motywie: powitanie, baner o danych pokazowych i kafle z wpływem do kasy, wizytami, obłożeniem i zobowiązaniami.',
          podpis: 'Prawdziwy zrzut aplikacji na danych pokazowych. Nazwiska w panelu po prawej rozmyte.',
        },
        pytania: [
          { q: 'Jak działa kasa?', a: 'Paragon składa się z usług, produktów, bonów i pakietów, a wizytę z kalendarza rozlicza się jednym ruchem, po cenie z dnia rezerwacji. Płacić można gotówką, kartą, bonem albo pakietem, także kilkoma formami naraz. Sprzedany produkt sam schodzi ze stanu magazynu. Kwoty liczymy w groszach, nigdy na liczbach z przecinkiem, więc suma dnia zgadza się co do grosza.' },
          { q: 'Gdzie są dane?', a: 'Wszystko zapisuje się w jednej bazie SQLite na komputerze salonu. Program działa bez internetu i bez chmury, więc dane nie wychodzą poza ten komputer. Obecna wersja to 1.4.2, z instalatorem na Windows.' },
        ],
      },
      pycodemath: {
        nazwa: 'Pycodemath',
        lead: 'Silnik dokładnej matematyki dla agentów AI. Zamiast zgadywać wynik, agent zleca obliczenie i dostaje odpowiedź policzoną symbolicznie, w kilku znakach.',
        fakty: [
          ['status', 'Publiczny na PyPI · wersja 0.4.0'],
          ['licencja', 'MIT · Python 3.11+'],
          ['dostęp', 'Serwer MCP · REPL · wiersz poleceń'],
          ['nowość', '0.4.0 sprawdza wyniki'],
        ],
        zrzut: null,
        pytania: [
          { q: 'Co potrafi policzyć?', a: 'Pochodne, całki, granice, szeregi i sumy, także nieskończone. Rozwiązuje równania i układy, liczy wartości własne macierzy, szuka minimów funkcji i rozwiązuje równania różniczkowe, symbolicznie i numerycznie. Ze wzoru potrafi wygenerować gotowy kod NumPy.' },
          { q: 'Gdzie go wziąć?', a: 'Z PyPI: pip install pycodemath (wersja 0.4.0, Python 3.11 lub nowszy). Kod jest otwarty, na licencji MIT: github.com/cybersora9/pycodemath. Od wersji 0.4.0 umie sprawdzić wynik i odpowiedzieć: potwierdzony, obalony z kontrprzykładem albo nierozstrzygnięty.' },
        ],
      },
      rachmistrz: {
        nazwa: 'Rachmistrz',
        lead: 'Biblioteka do liczenia kredytu i pożyczki konsumenckiej: RRSO, rata i harmonogram spłat. Liczy według metody z ustawy, nie na oko.',
        fakty: [
          ['status', 'Działa · wersja 0.1.0'],
          ['zakres', 'RRSO · rata annuitetowa · harmonogramy'],
          ['silnik', 'Python 3.11+ · NumPy · bez interfejsu'],
          ['ochrona', 'Licencja przez Frostwall'],
        ],
        zrzut: null,
        pytania: [
          { q: 'Jak liczy RRSO?', a: 'Tak, jak każe załącznik nr 4 do ustawy o kredycie konsumenckim. Szuka takiej rocznej stopy, przy której zdyskontowane wypłaty równają się zdyskontowanym spłatom. Równanie rozwiązuje metodą Newtona zabezpieczoną bisekcją. Wzór i jego pochodną wyprowadził Pycodemath, moja druga sadzonka.' },
          { q: 'Da się go kupić?', a: 'Jeszcze nie. Program działa, a decyzja o sprzedaży wciąż przede mną. Plan jest taki: 7 dni próby przypiętej do komputera, potem licencja bez terminu, w dwóch pakietach, sam RRSO albo pełny.' },
        ],
      },
      frostwall: {
        nazwa: 'Frostwall',
        lead: 'Moja biblioteka licencyjna. Sprawdza licencję i odblokowuje chroniony kod bez łączenia się z żadnym serwerem.',
        fakty: [
          ['status', 'Wersja 0.1.0 · biblioteka wewnętrzna'],
          ['kryptografia', 'Ed25519 · AES-GCM · SHA-256'],
          ['silnik', 'Python 3.11+ · cryptography'],
          ['pierwszy', 'Chroni Rachmistrza'],
        ],
        zrzut: null,
        pytania: [
          { q: 'Jak działa bez internetu?', a: 'Licencja to token podpisany kluczem Ed25519, a podpis da się sprawdzić na miejscu, bez serwera. Po kolei sprawdzane są: podpis, cofnięty zegar, data ważności i odcisk komputera. Chroniony kod jest zaszyfrowany AES-GCM, a klucz do niego jest zapieczętowany odciskiem tej jednej maszyny. Nie udaję, że to pancerz: to podniesiona poprzeczka, nie zamek nie do ruszenia.' },
          { q: 'Po co to komu?', a: 'Przede wszystkim mnie. To firmowa biblioteka, która pilnuje licencji moich programów, a pierwszym z nich jest Rachmistrz. Każdy odmowny wynik ma swój konkretny powód, więc program może powiedzieć klientowi wprost, co jest nie tak.' },
        ],
      },
    };

    /* Karty "Co juz umie, co dochodzi" na SOMI (30.09). Zrodla w repo SOMI: modules/providers.py,
       api_gateway.py, modules/pamiec.py (rozmowa); radar.py, generated/outreach_proposal.py,
       memory/offer_history.jsonl (281 ofert), memory/applications.jsonl (12 ghosted + 2 drafted),
       upwork_discord.py (research); modules/agent.py _HANDLERS (12 narzedzi), docs/PLAN_PARITY.md
       (tryby, P1-P10), git log P10 = 2026-07-29, NASTEPNY_MODUL_AGENT.md (569 po P10),
       commit N6 29.09 (bramka 1509/0) (agent). "264 / 14 / 156" z karty NIE potwierdzone. */
    const SOMI_KROKI = {
      rozmowa: {
        nazwa: 'Przykładowa rozmowa',
        lead: 'Na tej stronie SOMI odpowiada na trzy gotowe pytania. To zapis, nie czat na żywo. Prawdziwa SOMI rozmawia ze mną w terminalu i na Discordzie.',
        kod: 'somi> router.wybierz(zadanie)\n  rutyna   -> deepseek-v4-flash\n  trudne   -> claude-sonnet-5\n  synteza  -> claude-opus-5-5\npamiec.szukaj("radar")',
        fakty: [
          ['tutaj', '3 pytania, odpowiedzi spisane'],
          ['u mnie', 'Terminal · bot na Discordzie'],
          ['modele', 'DeepSeek do rutyny · Claude do trudnych'],
          ['pamięć', 'Indeks z dziennika i dokumentacji'],
        ],
        zrzut: null,
        pytania: [
          { q: 'Na jakim modelu działa?', a: 'Router dobiera model do zadania: DeepSeek V4 Flash do rutyny, Claude Sonnet 5 do trudnych pytań, Claude Opus 5.5 do syntezy. Na Discordzie model da się wybrać ręcznie.' },
          { q: 'Czy pamięta rozmowy?', a: 'Ma indeks pamięci w SQLite, zbudowany z jej dziennika i z dokumentacji projektów. Wyszukiwanie po znaczeniu, na embeddingach, jest dopiero w planie.' },
        ],
      },
      research: {
        nazwa: 'Deep research',
        lead: 'Radar przegląda zlecenia z Useme i Upwork, odrzuca stare i ocenia resztę pod moje umiejętności. Działa dziś, tylko jeszcze nie z poziomu czatu SOMI.',
        znak: '.somi-demo__parts li:nth-child(2) .somi-demo__glyph',
        fakty: [
          ['źródła', 'Useme · Upwork'],
          ['w historii', '281 ofert, bez powtórek'],
          ['zgłoszenia', '12 wysłanych · 2 szkice'],
          ['wyniki', 'Raport w plikach · Upwork na Discordzie'],
        ],
        zrzut: null,
        pytania: [
          { q: 'Jak ocenia oferty?', a: 'Każda oferta dostaje wynik od 0 do 100 za dopasowanie tytułu, tagów i opisu do moich umiejętności. Radar dolicza stawkę i wiek. Oferty starsze niż 21 dni odpadają, a 12 najlepszych dostaje pełny opis. Ostatnie słowo, czyli świeżość, dopasowanie, wykonalność i stawka, zapada w sesji z Claude.' },
          { q: 'Skąd wie, co już widział?', a: 'Każda oferta trafia do historii. Przy następnym skanie radar pomija te, które już zna, a nowe stawia na górze. W historii jest dziś 281 ofert, od 21 lipca do 30 września.' },
        ],
      },
      agent: {
        nazwa: 'Agent, który działa',
        lead: 'W terminalu SOMI ma pętlę narzędzi: czyta i przeszukuje pliki, pisze i edytuje kod, uruchamia komendy. Nic ryzykownego bez mojej zgody.',
        znak: '.somi-demo__parts li:nth-child(3) .somi-demo__glyph',
        fakty: [
          ['narzędzia', '12: pliki, kod, komendy, zadania'],
          ['tryby', 'normal · auto · plan · bypass'],
          ['parity', '10 modułów, zamknięte 29.07.2026'],
          ['bramka', '1509 testów, 0 błędów (29.09)'],
        ],
        zrzut: null,
        pytania: [
          { q: 'Kiedy pyta o zgodę?', a: 'Zależy od trybu, przełączanego Shift+Tab: normal, auto, plan albo bypass. Zapis w katalogu projektu nie pyta, komendy w terminalu pytają. Odpowiedź „tak i nie pytaj więcej” działa tylko dla tej jednej komendy, ścieżki albo narzędzia. Plik reguł z listami allow, ask i deny wygrywa nad trybem, a blokady niebezpiecznych komend nie wyłącza żaden tryb.' },
          { q: 'Co znaczy parity z Claude Code?', a: 'To seria 10 modułów, od P1 do P10, w której terminal SOMI dostał to, co ma Claude Code: narzędzia, tryby zgody i reguły dostępu. Ostatni moduł zamknąłem 29 lipca 2026. Po nim bramka miała 569 testów bez błędu, a dziś cała bramka SOMI to 1509 testów.' },
        ],
      },
    };

    /* 30.09: to samo okno obsluguje dwie grupy kart. Strzalki chodza tylko po kartach
       grupy, z ktorej je otwarto; pasek okna pokazuje jej schemat (sadzonki:// / somi://). */
    const GRUPY = {
      sadzonki: { karty: seeds, dane: SADZONKI, klucz: 'project', schemat: 'sadzonki://' },
      somi: { karty: somiKarty, dane: SOMI_KROKI, klucz: 'somi', schemat: 'somi://' },
    };
    let g = GRUPY.sadzonki, lista = [];
    let idx = 0, lastFocus = null, pisanie = null, zamykanie = null;

    const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    function zatrzymajPisanie() { if (pisanie) { clearTimeout(pisanie); pisanie = null; } }
    function terminalPusty(id) {
      term.innerHTML = '$ ' + esc(id) + ' --pytaj <span class="t-muted">— wybierz pytanie powyżej</span>';
    }
    function pisz(tekst, i) {
      if (i === 0) term.innerHTML += '<span class="sprout__ans"></span><span class="t-cursor"></span>';
      const ans = term.querySelector('.sprout__ans');
      if (!ans) return;
      ans.textContent = tekst.slice(0, i);
      if (i < tekst.length) pisanie = setTimeout(() => pisz(tekst, i + 1), 14 + Math.random() * 20);
      else {
        pisanie = null;
        const cur = term.querySelector('.t-cursor');
        if (cur) cur.remove();
      }
    }

    function render(i) {
      idx = (i + lista.length) % lista.length;
      const id = lista[idx], p = g.dane[id];
      const karta = g.karty.find((s) => s.dataset[g.klucz] === id);
      zatrzymajPisanie();

      $('sproutScheme').textContent = g.schemat;
      $('sproutPath').textContent = id;
      $('sproutCount').textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(lista.length).padStart(2, '0');
      $('sproutTag').textContent = karta.querySelector('.seed__tag, .card__tag').textContent;
      $('sproutTitle').textContent = p.nazwa;
      $('sproutLead').textContent = p.lead;
      $('sproutLog').textContent = id + '_zapis.log';
      const kod = karta.querySelector('.seed__code');
      $('sproutCode').textContent = kod ? kod.textContent : (p.kod || '');

      // znak z karty (Sadzonki) albo ze wskazanego miejsca strony (SOMI: pajak radaru, mina agenta);
      // <mask id> SalonDeska dostaje wlasne id, zeby nie dublowac id w dokumencie
      const zrodloZnaku = karta.querySelector('.seed__mark svg') || (p.znak ? document.querySelector(p.znak) : null);
      if (zrodloZnaku) {
        const znak = zrodloZnaku.cloneNode(true);
        znak.querySelectorAll('[id]').forEach((el) => {
          const stare = el.id, nowe = stare + '-pop';
          el.id = nowe;
          znak.querySelectorAll('[mask="url(#' + stare + ')"]').forEach((m) => m.setAttribute('mask', 'url(#' + nowe + ')'));
        });
        znak.removeAttribute('role');
        znak.removeAttribute('aria-label');
        znak.removeAttribute('class');
        $('sproutMark').replaceChildren(znak);
      } else $('sproutMark').replaceChildren();

      const dl = $('sproutFacts');
      dl.replaceChildren();
      p.fakty.forEach(([k, v]) => {
        const dt = document.createElement('dt'); dt.textContent = k;
        const dd = document.createElement('dd'); dd.textContent = v;
        dl.append(dt, dd);
      });

      if (p.zrzut) {
        shotImg.src = p.zrzut.src;
        shotImg.width = p.zrzut.w;
        shotImg.height = p.zrzut.h;
        shotImg.alt = p.zrzut.alt;
        $('sproutShotCap').textContent = p.zrzut.podpis;
        shot.hidden = false;
      } else {
        shot.hidden = true;
        shotImg.removeAttribute('src');
        shotImg.alt = '';
      }

      qs.replaceChildren();
      p.pytania.forEach((pyt) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'somi-demo__q';
        b.textContent = pyt.q;
        b.addEventListener('click', () => zapytaj(pyt, b, id));
        qs.append(b);
      });
      terminalPusty(id);
      if (srlive) srlive.textContent = '';

      const nazwa = (k) => g.dane[lista[(k + lista.length) % lista.length]].nazwa;
      const jedna = lista.length < 2;
      btnPrev.hidden = btnNext.hidden = jedna;
      btnPrev.textContent = '← ' + nazwa(idx - 1);
      btnNext.textContent = nazwa(idx + 1) + ' →';
      btnPrev.setAttribute('aria-label', 'Poprzedni projekt: ' + nazwa(idx - 1));
      btnNext.setAttribute('aria-label', 'Następny projekt: ' + nazwa(idx + 1));
      body.scrollTop = 0;
    }

    function zapytaj(pyt, btn, id) {
      zatrzymajPisanie();
      qs.querySelectorAll('.somi-demo__q').forEach((b) => b.classList.toggle('is-active', b === btn));
      term.innerHTML = '<span class="t-muted">$ ' + esc(id) + ' --pytaj "' + esc(pyt.q) + '"</span>\n\n';
      if (srlive) srlive.textContent = pyt.q + ' — ' + pyt.a;
      if (reduce) { term.innerHTML += esc(pyt.a); return; }
      pisanie = setTimeout(() => pisz(pyt.a, 0), 350);
    }

    function openAt(grupa, id) {
      g = GRUPY[grupa];
      lista = g.karty.map((s) => s.dataset[g.klucz]).filter((k) => g.dane[k]);
      const i = lista.indexOf(id);
      if (i < 0) return;
      clearTimeout(zamykanie);
      lastFocus = document.activeElement;
      render(i);
      pop.hidden = false;
      document.documentElement.classList.add('is-sprout-open');
      if (mainEl) mainEl.inert = true;
      popupZakrywa = true;
      ustawPetleMapy();
      void win.offsetWidth; // wymuszony uklad: przejscie startuje od stanu zamknietego (rAF stal w tle karty)
      pop.classList.add('is-open');
      btnClose.focus();
    }
    function close() {
      if (pop.hidden) return;
      zatrzymajPisanie();
      pop.classList.remove('is-open');
      document.documentElement.classList.remove('is-sprout-open');
      if (mainEl) mainEl.inert = false;
      zamykanie = setTimeout(() => { pop.hidden = true; }, reduce ? 0 : 340);
      popupZakrywa = false;
      ustawPetleMapy();
      if (lastFocus) lastFocus.focus();
    }

    Object.keys(GRUPY).forEach((nazwaGrupy) => {
      const gr = GRUPY[nazwaGrupy];
      gr.karty.forEach((s) => s.addEventListener('click', () => openAt(nazwaGrupy, s.dataset[gr.klucz])));
    });
    btnClose.addEventListener('click', close);
    $('sproutBackdrop').addEventListener('click', close);
    btnPrev.addEventListener('click', () => render(idx - 1));
    btnNext.addEventListener('click', () => render(idx + 1));

    // focus trap: Tab krazy tylko po elementach okna (reszta strony i tak jest inert)
    const FOKUS = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
    window.addEventListener('keydown', (e) => {
      if (pop.hidden || !pop.classList.contains('is-open') && e.key !== 'Escape') return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); render(idx - 1); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); render(idx + 1); return; }
      if (e.key !== 'Tab') return;
      const f = [...win.querySelectorAll(FOKUS)].filter((el) => !el.closest('[hidden]'));
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !win.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // arkusz na telefonie: przeciagniecie paska w dol o > 70 px zamyka (bez podazania za palcem)
    let startY = null;
    const bar = $('sproutBar');
    bar.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' && !e.target.closest('button')) startY = e.clientY; });
    bar.addEventListener('pointerup', (e) => { if (startY !== null && e.clientY - startY > 70) close(); startY = null; });
    bar.addEventListener('pointercancel', () => { startY = null; });
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
