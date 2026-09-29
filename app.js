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
    const due = bgT < 0 || time < bgT || (reduce ? w < 0.999 : p.fps > 0 && time - bgT >= 1 / p.fps);
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
     stoi 9 s, skaner przycina 1,2 s, sufit pod tekstem 0,14, pod nadtytulem czysto (karmazyn na karmazynie).
     Drzewo = kolonizacja przestrzeni (Runions 2007), grubosc z modelu rurek, znaki = prawdziwe linijki kodu.
     Generacja jest generatorem (function*) krokowanym w paint z budzetem RN_BUDGET ms: pierwsze drzewo
     zaraz po wejsciu, kazde nastepne liczy sie w czasie stania poprzedniego. Znaki z wlasnego atlasu
     (kod ma male litery i interpunkcje, ktorych glyphAtlas nie ma), pieczone do RN.cv tylko w chwili
     narodzin; paint = drawImage bufora (przyciety skanerem) + kursory, migajace znaki, liscie z puli,
     ziemia, odczyt, maski. Strefy z ukladu (nawigacja, tekst naglowka, wymiar hero), nie na sztywno.
     Komputer: drzewa omijaja tekst; telefon: rosna pod tekstem, przygaszone maska. */
  const RN_OP = 0.40, RN_G = 4.5, RN_HOLD = 9, RN_PRUNE = 1.2, RN_CAP = 0.14, RN_BUDGET = 3;
  const RN_SEL = '[data-view="rnd"] .overlay';
  const RN_CODE = [
    'zapis.klient="Anna K.";zapis.status="OPLACONE";kasa.dodaj(zapis,kwota);magazyn.sprawdz(zapasy);',
    'd/dx sin(x)=cos(x);solve(x**2-4,x);det(M);grad(f,[x,y]);cse(expr);',
    'somi.slucha();somi.mysli(kontekst);somi.odpowiada(glos);pamiec.zapisz(fakt);',
    'if(sadzonka.gotowa){oferta.dodaj(sadzonka)}else{szklarnia.podlej(sadzonka)};',
    'for(const k of kod){drzewo.rosnij(k)};git commit -m "kolejny pęd";'
  ];
  const RN_HEX = '0123456789abcdef';
  const RN_CH = [...new Set([...RN_CODE.join('').replace(/ /g, '·'), ...RN_HEX, '█'])];
  const RN_IX = new Map(RN_CH.map((ch, i) => [ch, i]));
  const RN_HX = [...RN_HEX].map(ch => RN_IX.get(ch)), RN_CUR = RN_IX.get('█');
  const RN = { cv: document.createElement('canvas'), at: document.createElement('canvas'), eb: document.createElement('canvas'),
    eo: { x: 0, y: 0, w: 0, h: 0, ok: false }, atKey: '', cell: 0, cp: 0, fonts: false, mob: false, fs: 12, hf: '',
    top: 0, ground: 0, trees: [], zones: [], items: null, leaf: null, ptr: 0, gen: 0, u: 0, lt: -1,
    job: null, pend: null, pendGen: 0, st: [], sh: [], hud: '', hudR: '', hudK: -1, pruneS: '', fall: [], fallAcc: 0 };
  RN.c = RN.cv.getContext('2d'); RN.ac = RN.at.getContext('2d'); RN.ec = RN.eb.getContext('2d');
  for (let i = 0; i < 40; i++) RN.fall.push({ on: false, x0: 0, y: 0, xl: 0, g0: 0, g1: -1, al: 1, vy: 0, amp: 0, sp: 0, ph: 0, dr: 0, t: 0, land: 0 });
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
    RN.hf = '600 ' + (D ? 10.5 : 8) + 'px "Geist Mono", monospace';
    // pod nawigacja (makieta: 65 px + 39 / + 19), ziemia nad dolna krawedzia hero
    const nb = nav ? Math.max(0, Math.min(140, nav.getBoundingClientRect().bottom - st.top)) : 65;
    RN.top = nb + (D ? 39 : 19); RN.ground = H - (D ? 34 : 14);
    if (bgTextMeasure(RN_SEL)) bgMaskBuild();
    rnEbMask();
    if (D) {   // boki wolne od tekstu (1440: x < 440 i > 1000), sadzonka przy zewnetrznej krawedzi
      const a0 = 26 * s, a1 = W / 2 - 280 * s, b0 = W / 2 + 280 * s, b1 = W - 26 * s;   // blisko krawedzi: korona ma wypelniac rogi
      RN.zones = [a0, a1, b0, b1];
      RN.trees = [{ x: a0 + (a1 - a0) * 0.505, x0: a0, x1: a1, big: 1 }, { x: a0 + (a1 - a0) * 0.16, x0: a0, x1: a1, big: 0 },
        { x: b0 + (b1 - b0) * 0.495, x0: b0, x1: b1, big: 1 }, { x: b0 + (b1 - b0) * 0.84, x0: b0, x1: b1, big: 0 }];
    } else {
      RN.zones = [8 * s, W - 8 * s];
      RN.trees = [{ x: 70 * s, x0: 8 * s, x1: 190 * s, big: 1 }, { x: 326 * s, x0: 200 * s, x1: 382 * s, big: 1 },
        { x: 196 * s, x0: 150 * s, x1: 240 * s, big: 0 }];
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
    RN.items = RN.pend = RN.job = null; RN.ptr = 0; RN.u = 0; RN.lt = -1; RN.fallAcc = 0; RN.hudK = -1;
    for (const q of RN.fall) q.on = false;
  }

  /* Jedno drzewo (albo kilka pni we wspolnej kolonizacji) do listy items; yield miedzy etapami i co iteracje
     kolonizacji. Elementy: k 0 = znak kory (obrocony wzdluz galezi), k 1 = lisc hex (1-2 znaki, goracy). */
  function* rnTree(rng, T, arch, code, items) {
    const D = !RN.mob, fs = RN.fs, top = RN.top, ground = RN.ground, big = T[0].big;
    let ci = Math.floor(rng() * code.length);
    const next = () => { const ch = code[ci++ % code.length]; return RN_IX.get(ch === ' ' ? '·' : ch); };
    const step = fs * 0.8, di = D ? 74 : 44, dk = step * 1.7, laneGap = fs * 0.62, maxLanes = big ? (D ? 7 : 4) : 3;
    let X0 = 1e9, X1 = -1e9;
    for (const t of T) { X0 = Math.min(X0, t.x0); X1 = Math.max(X1, t.x1); }
    const ax = [], ay = [], Hz = ground - top;
    const addAtt = (x, y) => {
      if (x < X0 || x > X1 || y < top + 4 || y > ground - 24 || rnBlocked(x, y)) return false;
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
        if (y < top || y > ground - 6 || x < X0 || x > X1) continue;
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
          if (y < top || rnBlocked(x, y)) continue;
          const two = rng() < 0.35, g0 = RN_HX[Math.floor(rng() * 16)], g1 = two ? RN_HX[Math.floor(rng() * 16)] : -1;
          items.push({ k: 1, x, y, a: 0, g0, g1, b: nd[i] + step * (1 + j), sh: 0, fz: fs, al: 0.55 + rng() * 0.8 });
        }
      }
    }
    // korzenie: kilka pedow przy ziemi, w bok i lekko w dol
    for (const t of T) {
      const nrt = big ? 4 + Math.floor(rng() * 2) : 2;
      for (let j = 0; j < nrt; j++) {
        const side = j % 2 ? 1 : -1, len = (big ? (D ? 46 : 22) : (D ? 20 : 10)) * (0.6 + rng() * 0.6);
        let ang = (side > 0 ? 0 : Math.PI) + side * (0.12 + rng() * 0.35), x = t.x + side * laneGap * 0.8, y = ground - 2;
        for (let s = 0; s < len / step; s++) {
          x += Math.cos(ang) * step; y = Math.min(ground + 10, y + Math.sin(ang) * step); ang += side * (rng() - 0.3) * 0.15;
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
    yield;
    items.sort((a, b) => a.b - b.b);
    yield;
    const leaf = [];
    for (let i = 0; i < items.length; i++) if (items[i].k) leaf.push(i);
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
    RN.items = p.items; RN.leaf = p.leaf; RN.gen = p.gen; RN.ptr = 0; RN.u = 0; RN.hudK = -1; RN.fallAcc = 0;
    RN.pruneS = '// prune gen ' + p.gen;
    for (const q of RN.fall) q.on = false;
    RN.c.clearRect(0, 0, W, H);
  }
  // znak do bufora drzewa: raz, w chwili narodzin
  function rnBake(o) {
    const c = RN.c;
    if (o.k) {
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
    const T = RN_G + RN_HOLD + RN_PRUNE, D = !RN.mob;
    RN.u = reduce ? RN_G + 1 : RN.u + dt;
    // nastepne drzewo liczy sie w czasie stania biezacego; reduced motion: od razu cale, bez podzialu
    if (!RN.job && !RN.pend && (!RN.items || (!reduce && RN.u >= RN_G))) {
      RN.pendGen = RN.items ? RN.gen + 1 : RN.gen; RN.job = rnGen(RN.pendGen);
    }
    if (RN.job) rnStep(reduce ? 1e9 : RN_BUDGET);
    if (RN.pend && (!RN.items || RN.u >= T)) { rnSwap(); if (reduce) RN.u = RN_G + 1; }
    const it = RN.items;
    wc.globalAlpha = op;
    if (it) {
      while (RN.ptr < it.length && it[RN.ptr].b <= RN.u) rnBake(it[RN.ptr++]);
      RN.c.globalAlpha = 1;
      // przycinanie: skaner od gory schodkami, nad nim pusto
      const pr = RN.u > RN_G + RN_HOLD ? Math.min(1, (RN.u - RN_G - RN_HOLD) / RN_PRUNE) : 0;
      const scanY = RN.top - 20 + (RN.ground + 30 - RN.top) * Math.floor(pr * 14) / 14;
      if (pr > 0) {
        const sy = Math.round(scanY * dpr), ch = RN.cv.height - sy;
        if (ch > 0) wc.drawImage(RN.cv, 0, sy, RN.cv.width, ch, 0, sy / dpr, W, ch / dpr);
      } else wc.drawImage(RN.cv, 0, 0, W, H);
      if (!reduce && RN.u < RN_G) {
        // kursory na czubkach rosnacych pedow: ostatnio urodzone znaki
        wc.globalAlpha = op * Math.min(1, RN_OP * 2.4);
        for (let i = Math.max(0, RN.ptr - 40); i < RN.ptr; i++) if (RN.u - it[i].b <= 0.12) rnGlyph(wc, RN_CUR, 1, it[i].x, it[i].y, RN.fs, 0);
      }
      if (!reduce && RN.u < RN_G + RN_HOLD && RN.ptr) {
        // kod zyje: kilka znakow na chwile podmienia sie (rozblysk), bez przerysowania bufora
        const tick = Math.floor(time * 6);
        wc.globalAlpha = op * RN_OP * 1.6;
        for (let j = 0; j < 5; j++) {
          const r = Math.sin((tick * 13 + j * 71 + RN.gen * 7) * 12.9898) * 43758.5453, o = it[Math.floor((r - Math.floor(r)) * RN.ptr)];
          rnGlyph(wc, RN_HX[(tick + j) & 15], 1, o.x, o.y, RN.fs, 0);
        }
      }
      if (!reduce && RN.leaf.length) {
        // spadajace liscie: odrywaja sie od urodzonych, kolysza, laduja na ziemi i gasna (pula, zero alokacji)
        const cap = D ? 40 : 16;
        if (RN.u < RN_G + RN_HOLD) {
          RN.fallAcc += dt * (D ? 5 : 2) * (RN.u < RN_G ? RN.u / RN_G : 1);
          while (RN.fallAcc >= 1) {
            RN.fallAcc -= 1;
            const i = RN.leaf[Math.floor(Math.random() * RN.leaf.length)];
            if (i >= RN.ptr) continue;
            let q = null;
            for (let k = 0; k < cap; k++) if (!RN.fall[k].on) { q = RN.fall[k]; break; }
            if (!q) continue;
            const o = it[i];
            q.on = true; q.x0 = o.x; q.y = o.y; q.g0 = o.g0; q.g1 = o.g1 >= 0 && Math.random() < 0.5 ? o.g1 : -1; q.al = o.al;
            q.vy = D ? 20 + Math.random() * 22 : 11 + Math.random() * 12; q.amp = D ? 10 + Math.random() * 14 : 5 + Math.random() * 7;
            q.sp = 1.1 + Math.random() * 1.6; q.ph = Math.random() * 6.28; q.dr = (Math.random() - 0.3) * (D ? 10 : 5); q.t = 0; q.land = 0;
          }
        }
        const z = RN.fs * 0.9, h = z * 0.3;
        for (let k = 0; k < cap; k++) {
          const q = RN.fall[k]; if (!q.on) continue;
          q.t += dt;
          if (!q.land) {
            q.y += q.vy * dt;
            if (q.y >= RN.ground - 3) { q.y = RN.ground - 3; q.land = dt || 1e-3; q.xl = q.x0 + Math.sin(q.t * q.sp + q.ph) * q.amp + q.t * q.dr; }
          } else q.land += dt;
          if (q.land > 1.6) { q.on = false; continue; }
          const sw = Math.sin(q.t * q.sp + q.ph), x = q.land ? q.xl : q.x0 + sw * q.amp + q.t * q.dr, an = q.land ? 1.57 : sw * 0.7;
          wc.globalAlpha = op * Math.min(1, RN_OP * q.al * (q.land ? 1 - q.land / 1.6 : 1));
          if (q.g1 < 0) rnGlyph(wc, q.g0, 1, x, q.y, z, an);
          else {
            const ca = Math.cos(an) * h, sa = Math.sin(an) * h;
            rnGlyph(wc, q.g0, 1, x - ca, q.y - sa, z, an); rnGlyph(wc, q.g1, 1, x + ca, q.y + sa, z, an);
          }
        }
      }
      if (pr > 0 && pr < 1) {
        wc.globalAlpha = op;
        wc.fillStyle = RN.sh[32]; wc.fillRect(RN.zones[0], Math.round(scanY), W - 2 * RN.zones[0], 1);   // 0,80 = RN_OP * 2
        if (D) { wc.font = RN.hf; wc.textAlign = 'left'; wc.textBaseline = 'alphabetic'; wc.fillStyle = RN.sh[29]; wc.fillText(RN.pruneS, RN.zones[0], Math.round(scanY) - 6); }
      }
    }
    // ziemia i odczyt (string tylko przy zmianie licznika)
    wc.globalAlpha = op;
    wc.fillStyle = rnA(RN_OP * 0.5);
    for (let z = 0; z < RN.zones.length; z += 2) wc.fillRect(RN.zones[z], RN.ground + 1, RN.zones[z + 1] - RN.zones[z], 1);
    const grow = RN.u < RN_G || !it, hk = RN.ptr * 2 + (grow ? 1 : 0);
    if (hk !== RN.hudK) {
      RN.hudK = hk;
      RN.hud = 'SEED 0x' + ((0x3f2a + RN.gen * 7919) & 0xffff).toString(16).toUpperCase().padStart(4, '0') + ' · GEN ' + RN.gen + ' · ' + RN.ptr + ' znaków';
      RN.hudR = grow ? 'kiełkuje…' : 'rośnie w tle';
    }
    wc.font = RN.hf; wc.textBaseline = 'alphabetic'; wc.textAlign = 'left';
    wc.fillStyle = rnA(RN_OP * (D ? 1.3 : 1.2)); wc.fillText(RN.hud, RN.zones[0], RN.ground + (D ? 18 : 11));
    if (D) { wc.textAlign = 'right'; wc.fillStyle = rnA(RN_OP * 1.1); wc.fillText(RN.hudR, RN.zones[3], RN.ground + 18); }
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

    // second, feather-light pass: the embers (waga warstwy spark: tla M8 moga je zdjac)
    const sparkW = themeState.layers.spark;
    if (sparkW > 0.02) {
      for (let i = 0; i < sparks.length; i++) {
        const s = sparks[i];
        s.y -= s.vy;
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
    // wyzej: 156 leadow, bramka akceptacji, ponad 1400 testow) — SOMI nie obiecuje tu
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
