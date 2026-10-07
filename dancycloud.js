/*! DancyCloud 3.0.0 — gra do terminala SORA//OS (cybersora.pl). Czysty JS + Canvas 2D, bez bibliotek.
 *  API: window.DancyCloud.mount(element, { onExit }) -> { destroy() }; DancyCloud.icons (zestaw ikon) */
(function (G) {
  'use strict';

  // Kolory wyłącznie z tokenów strony (wzorce/tokeny.css). Powierzchnie = ink zmieszany z bielą albo karmazynem.
  var C = {
    ink: '#0e0e12', acc: '#e11d33', hot: '#ff3a52', solid: '#d4132b', label: '#ff6b7d',
    muted: '#9a9098', bone: '#f6f2f3', cyan: 'rgba(80,220,255,.85)',
    panel: '#18181b', line: '#28282c', bar: '#1d0f14',
    cloudFar: '#131317', cloudNear: '#1f1f23', city: '#2e1017'
  };
  var COL = { l: C.label, b: C.bone, h: C.hot, m: C.muted };
  var MONO = '"Geist Mono", ui-monospace, Consolas, monospace';
  var SANS = "'Sora', system-ui, Arial, sans-serif";

  // Linijki wyłącznie z wzorce/kod.txt.
  var KOD = [
    'zapis.status = "OPLACONE"',
    'kasa.dodaj(zapis, kwota)',
    'magazyn.sprawdz(zapasy)',
    'async def watch_loop()',
    'async def upwork_watch_loop()',
    'def parse_watchdog_line(line: str)',
    'def save_state(state: Dict[str, Any])',
    'pub fn new(app: &AppHandle, root: PathBuf)',
    'pub fn dir_for(&self, profile: &str, keep: bool)',
    'fn free_port()',
    'fn remove_later(dir: PathBuf)',
    'd/dx sin(x) = cos(x)',
    'simplify(expr) -> wynik',
    'solve(x**2 - 4, x)',
    'generuj_kod(wzor)',
    'public DetectionEvent Decide(DetectionEvent evt)',
    'public Availability Check()',
    'public IReadOnlyList<EventRecord> TryReadRecent(int maxEvents = 50)',
    'def scrape_useme(pages=1, delay=1.0, query=None)',
    'def fetch_offer_detail(url)',
    'def parse_offer(article)',
    'def save_offers(offers)',
    'rata = oblicz_rate(kwota, n)',
    'rrso = stopa + prowizja',
    'podpis = sign(dane, klucz)',
    'verify(podpis, klucz_pub)',
    'if not aktywacja.wazna(): blokuj',
    'fingerprint(maszyna)'
  ];
  var FALE = ['init', 'feat: statek', 'refactor', 'merge conflict', 'hotfix w piątek',
    'rebase', 'force push', 'deploy w nocy', 'rollback', 'legacy'];
  var TRYBY = {
    unik: 'Same uniki. Jedna bomba czyści ekran.',
    ogien: 'Statek strzela sam. Ciężka linijka wytrzymuje 3 trafienia.'
  };
  var BN = ['NullPointer', 'Memory Leak', 'Race Condition', 'Segfault Prime'], BNU = BN.map(function (n) { return n.toUpperCase(); });
  // --- strojenie trudności (v3): wszystko, co zmienia tempo i ciężar walk, jest tutaj ---
  var WAVE_S = 20;                    // długość fali [s]; co falę szybciej i gęściej
  var BOSS1_S = 48;                   // pierwszy boss po tylu sekundach gry (v2: ok. 80 s)
  var BOSS_EVERY = 4;                 // kolejni bossowie co tyle fal (zegar fal stoi w trakcie walki)
  var BNEED = [60, 90, 110, 170];     // trafień kulą do pokonania (Ogień); bomba zabiera 17% życia, w odsłonięciu 34%
  var NP_CD = [1.5, 1.15];            // NullPointer: przerwa między strzałami [s], powyżej / poniżej 60% życia
  var ML_CD = [2.3, 0.9];             // Memory Leak: przerwa między zrzutami linijek [s], na starcie / gdy urośnie do końca
  var SP_CD = [1.5, 1.2];             // Segfault Prime: przerwa między atakami [s], faza 1 / faza 2
  var RC_TURN = 2.8, RC_CD = 1.3;     // Race Condition: długość tury połówki, przerwa samotnej połówki [s]
  var ARROW_V = 210;                  // prędkość strzałek `->` [px/s przy wysokości pola 600]
  var SWEEP_V = 320;                  // prędkość pasów `==` [px/s przy szerokości pola 700]
  var TELE_MIN = 0.45, TELE_RND = 0.15; // telegraf każdego ataku: 0,45–0,6 s
  var RAIN_DIV = 3;                   // w walce zwykły deszcz linijek spada tyle razy rzadziej
  var INTRO_S = 1.8, DEATH_S = 1.5;   // wejście i śmierć bossa [s] (przy prefers-reduced-motion wejście trwa 0,9 s)

  // --- bossowie v3: geometria w jednostkach, środek bossa w (0,0) ---
  var DIM = [[204, 132], [264, 156], [152, 160], [268, 204]];   // pole rysunku (Race Condition: jedna połówka)
  var FWB = [0.44, 0.46, 0.19, 0.54], FHB = [0.40, 0.40, 0.40, 0.46]; // maks. część szerokości / wysokości pola
  var ORY = [0.46, 0.36, 0, 0.32];                                // skąd lecą strzałki (część wysokości bossa od środka)
  var ACC = [C.acc, C.hot, C.bone];                               // akcent w fazach 1–3: karmazyn → biel
  var FZ = ['FAZA 1/3', 'FAZA 2/3', 'FAZA 3/3'];
  var TAG = ['dereferencja wskaźnika null', 'pamięć rośnie, nikt jej nie zwalnia', 'dwa wątki, jeden zasób', 'naruszenie ochrony pamięci'];
  var PAL = { hull: C.line, plate: C.panel, edge: C.muted, dark: C.ink, sol: C.solid, hot: C.hot, txt: C.muted, hi: C.bone };
  var PALF = { hull: C.bone, plate: C.bone, edge: C.ink, dark: C.muted, sol: C.bone, hot: C.ink, txt: C.muted, hi: C.ink };
  function OCT(cx, cy, r, k) { return [cx - r + k, cy - r, cx + r - k, cy - r, cx + r, cy - r + k, cx + r, cy + r - k, cx + r - k, cy + r, cx - r + k, cy + r, cx - r, cy + r - k, cx - r, cy - r + k]; }
  function MX(a) { var b = [], j; for (j = 0; j < a.length; j += 2) b.push(-a[j], a[j + 1]); return b; }
  var NP_HULL = [-100, -58, 88, -58, 100, -46, 100, -36, 60, 6, 66, 12, 22, 54, 0, 64, -22, 54, -66, 12, -60, 6, -100, -36];
  var NP_PL = [-91, -50, 82, -50, 91, -41, 91, -34, 52, 6, 56, 10, 17, 46, 0, 54, -17, 46, -56, 10, -52, 6, -91, -34];
  var NP_PNL = [-86, -30, -60, -30, -40, -6, -50, 2], NP_PNR = MX(NP_PNL);
  var NP_TIP = [-30, 24, 30, 24, 14, 41, 0, 47, -14, 41];
  var NP_BAND = [-96, -56, 88, -56, 94, -50, 94, -47, -96, -47];
  var NP_SOCK = OCT(0, -12, 31, 10), NP_RING = OCT(0, -12, 25, 8);
  var NP_FIN = [0, -11, 26, -11, 26, -22, 50, 0, 26, 22, 26, 11, 0, 11];
  var NP_ARM = [0, -5, 60, -5, 60, -11, 76, 0, 60, 11, 60, 5, 0, 5];
  var ML_CLAMP = [-14, -66, 10, -66, 14, -62, 14, -54, -2, -54, -2, 54, 14, 54, 14, 66, -10, 66, -14, 62];
  var RC_HULL = [-60, -67, -50, -77, 40, -77, 52, -65, 44, -50, 56, -36, 44, -22, 56, -8, 44, 6, 56, 20, 44, 34, 56, 48, 44, 62, 50, 77, -48, 77, -60, 65];
  var RC_PL = [-52, -61, -44, -69, 36, -69, 44, -62, 36, -50, 46, -36, 36, -22, 46, -8, 36, 6, 46, 20, 36, 34, 46, 48, 36, 62, 40, 69, -44, 69, -52, 61];
  var RC_ARM = [-60, -52, -72, -44, -72, 46, -60, 54];
  var RC_CLAW = [0, -6, 20, -6, 24, -12, 42, -12, 35, -3, 22, -3, 22, 3, 35, 3, 42, 12, 24, 12, 20, 6, 0, 6];
  var SP_WL = [-48, -22, -108, -44, -130, -30, -132, -4, -118, 26, -96, 44, -48, 48], SP_WR = MX(SP_WL);
  var SP_T1 = [-58, 20, 58, 20, 66, 28, 66, 86, -56, 86, -66, 76, -66, 28];
  var SP_P1 = [-54, 26, 54, 26, 60, 32, 60, 80, -52, 80, -60, 72, -60, 32];
  var SP_T2 = [-46, -36, 42, -36, 50, -28, 50, 24, -50, 24, -50, -30];
  var SP_P2 = [-42, -30, 38, -30, 44, -24, 44, 18, -44, 18, -44, -26];
  var SP_T3 = [-30, -76, 24, -76, 32, -68, 32, -34, -32, -34, -32, -70];
  var SP_P3 = [-26, -70, 20, -70, 26, -64, 26, -40, -26, -40, -26, -66];
  var SP_EYL = [-40, -16, -12, -16, -16, -4, -40, -4], SP_EYR = MX(SP_EYL);
  var SP_CROWN = [-36, 0, -32, -20, -24, -6, -14, -28, -6, -8, 0, -36, 6, -8, 14, -28, 24, -6, 32, -20, 36, 0];
  var SP_ARM = [0, -9, 46, -9, 54, -3, 54, 3, 46, 9, 0, 9];
  var SP_CLAW = [50, -16, 76, -8, 64, 0, 76, 8, 50, 16, 57, 0];
  var SP_CORE = OCT(0, -55, 15, 5);
  var UPS = {
    fire: { n: 'Szybszy ogień', d: 'Statek strzela o jedną trzecią częściej.', i: 'auto', max: 3, og: 1 },
    dbl: { n: 'Podwójny strzał', d: 'Dwa pociski naraz, obok siebie.', i: 'double', max: 1, og: 1 },
    shield: { n: 'Tarcza', d: 'Pochłania jedno trafienie, potem znika.', i: 'shield', max: 1 },
    graze: { n: 'Większe muśnięcie', d: 'Szerszy pas muśnięcia i więcej punktów za każde.', i: 'graze', max: 2 },
    slow: { n: 'Zwolniony czas', d: 'Po bombie świat na chwilę zwalnia.', i: 'slow', max: 2 },
    power: { n: 'Mocniejsza bomba', d: 'Bomba zadaje bossom o połowę więcej obrażeń.', i: 'power', max: 2 },
    agile: { n: 'Zwinny statek', d: 'Szybszy ruch i mniej bezwładności.', i: 'agile', max: 2 },
    cache: { n: 'Zapas bomb', d: 'Nowa bomba już co 800 punktów.', i: 'cache', max: 1 }
  };
  var UKEYS = ['fire', 'dbl', 'shield', 'graze', 'slow', 'power', 'agile', 'cache'];
  var KEYP = 'dancycloud.rekord.';
  var FLASH = 0.22;

  // --- ikony: jednokolorowe, kanciaste (ścięty prawy górny i lewy dolny róg), ścieżki Canvas na siatce 24×24 ---
  // [0, wielokąt] = wypełnij, [1, wielokąt] = wytnij
  function CR(x, y, w, h, k) { return [x, y, x + w - k, y, x + w, y + k, x + w, y + h, x + k, y + h, x, y + h - k]; }
  function SPK(cx, cy, r1, r2, n) {
    var a = [], i, r;
    for (i = 0; i < n * 2; i++) { r = i & 1 ? r2 : r1; a.push(cx + r * Math.sin(i * Math.PI / n), cy - r * Math.cos(i * Math.PI / n)); }
    return a;
  }
  var SKULL = [4, 8, 4, 4, 8, 3, 17, 3, 20, 6, 20, 15, 16, 19, 16, 22, 8, 22, 8, 19, 4, 15];
  var IC = {
    bomb: [[0, CR(3, 9, 15, 13, 4)], [1, [7, 13, 10, 13, 10, 16, 7, 16]], [0, [15, 8, 17, 5, 21, 5, 21, 8, 18, 8, 17, 10]]],
    shield: [[0, [4, 3, 17, 3, 20, 6, 20, 13, 12, 22, 4, 15]], [1, [8, 7, 15, 7, 16, 8, 16, 12, 12, 17, 8, 13]], [0, [10, 9, 13, 9, 13, 12, 10, 12]]],
    auto: [[0, [3, 21, 3, 9, 5, 5, 7, 9, 7, 21]], [0, [10, 21, 10, 9, 12, 5, 14, 9, 14, 21]], [0, [17, 21, 17, 9, 19, 5, 21, 9, 21, 21]]],
    double: [[0, [4, 21, 4, 9, 7.5, 3, 11, 9, 11, 21]], [0, [13, 21, 13, 9, 16.5, 3, 20, 9, 20, 21]]],
    graze: [[0, CR(2, 3, 6, 18, 2)], [0, CR(11, 3, 6, 18, 2)], [0, [8.5, 9, 10.5, 12, 8.5, 15]], [0, [19, 6, 22, 6, 22, 18, 19, 18]]],
    record: [[0, [5, 3, 16, 3, 19, 6, 19, 11, 15, 15, 9, 15, 5, 11]], [0, [10, 15, 14, 15, 14, 19, 10, 19]], [0, [6, 19, 18, 19, 18, 22, 6, 22]], [0, [2, 5, 5, 5, 5, 9, 2, 9]], [1, [9, 6, 12, 6, 12, 9, 9, 9]]],
    sound: [[0, [3, 9, 8, 9, 13, 4, 13, 20, 8, 15, 3, 15]], [0, [16, 8, 18, 8, 18, 16, 16, 16]], [0, [19.5, 5, 21.5, 5, 21.5, 19, 19.5, 19]]],
    mute: [[0, [3, 9, 8, 9, 13, 4, 13, 20, 8, 15, 3, 15]], [0, [15, 8, 17, 8, 22, 16, 20, 16]], [0, [20, 8, 22, 8, 17, 16, 15, 16]]],
    pause: [[0, CR(5, 4, 5, 16, 2)], [0, CR(14, 4, 5, 16, 2)]],
    boss: [[0, SKULL], [1, [7, 9, 10, 9, 10, 12, 7, 12]], [1, [14, 9, 17, 9, 17, 12, 14, 12]], [1, [11, 14, 13, 14, 13, 17, 11, 17]]],
    b1: [[0, [5, 3, 15, 3, 18, 6, 18, 12, 22, 12, 12, 22, 2, 12, 6, 12]], [1, [9, 6, 14, 6, 14, 10, 9, 10]]],
    b2: [[0, CR(3, 3, 18, 5, 2)], [0, CR(3, 10, 13, 5, 2)], [0, CR(3, 17, 8, 5, 2)], [0, [18, 12, 21, 16, 18, 20, 15, 16]]],
    b3: [[0, CR(2, 4, 9, 16, 3)], [0, CR(13, 4, 9, 16, 3)], [1, [5, 8, 8, 8, 8, 11, 5, 11]], [1, [16, 8, 19, 8, 19, 11, 16, 11]]],
    b4: [[0, [3, 10, 3, 3, 8, 7, 12, 2, 16, 7, 21, 3, 21, 16, 17, 20, 17, 22, 7, 22, 7, 20, 3, 16]], [1, [6, 11, 10, 11, 10, 14, 6, 14]], [1, [14, 11, 18, 11, 18, 14, 14, 14]], [1, [9, 17, 15, 17, 15, 19, 9, 19]]],
    slow: [[0, [5, 3, 19, 3, 19, 6, 14, 12, 19, 18, 19, 21, 5, 21, 5, 18, 10, 12, 5, 6]], [1, [8, 6, 16, 6, 12, 10]]],
    agile: [[0, [3, 5, 8, 5, 14, 12, 8, 19, 3, 19, 9, 12]], [0, [11, 5, 16, 5, 22, 12, 16, 19, 11, 19, 17, 12]]],
    power: [[0, SPK(12, 12, 11, 5, 8)], [1, [10, 10, 14, 10, 14, 14, 10, 14]]],
    cache: [[0, CR(3, 6, 18, 15, 4)], [1, [6, 10, 18, 10, 18, 12, 6, 12]], [1, [10, 15, 14, 15, 14, 18, 10, 18]]]
  };
  var INAMES = ['bomb', 'shield', 'auto', 'graze', 'record', 'sound', 'mute', 'pause', 'boss', 'b1', 'b2', 'b3', 'b4', 'double', 'slow', 'agile', 'power', 'cache'];
  var icoCache = {};

  function fp(x, pts, fill, stroke) {
    x.beginPath(); x.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]);
    x.closePath();
    if (fill) { x.fillStyle = fill; x.fill(); }
    if (stroke) { x.strokeStyle = stroke; x.lineWidth = 2; x.stroke(); }
  }
  // Każda ikona jest renderowana raz (offscreen) i potem tylko wklejana.
  function iconCanvas(name, size, color, frame) {
    var d = Math.min(2, G.devicePixelRatio || 1), key = name + '|' + size + '|' + color + '|' + (frame ? 1 : 0) + '|' + d, c = icoCache[key], x, sh, i;
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = Math.ceil(size * d);
    x = c.getContext('2d'); sh = IC[name] || IC.boss;
    x.scale(size * d / 24, size * d / 24);
    x.fillStyle = x.strokeStyle = color;
    if (frame) {
      x.beginPath(); x.moveTo(1, 1); x.lineTo(18, 1); x.lineTo(23, 6); x.lineTo(23, 23); x.lineTo(6, 23); x.lineTo(1, 18); x.closePath();
      x.lineWidth = 1.6; x.stroke();
      x.translate(12, 12); x.scale(0.58, 0.58); x.translate(-12, -12);
    }
    for (i = 0; i < sh.length; i++) {
      x.globalCompositeOperation = sh[i][0] ? 'destination-out' : 'source-over';
      fp(x, sh[i][1], color);
    }
    icoCache[key] = c;
    return c;
  }
  function ibtn(name, z, col, frame) {
    return '<canvas class="dcg-i" data-i="' + name + '" data-z="' + z + '" data-c="' + (col || 'l') + '"' + (frame ? ' data-f="1"' : '') + ' aria-hidden="true"></canvas>';
  }
  function paintIcons(scope) {
    var l = scope.querySelectorAll('canvas[data-i]'), k, e, z, s;
    for (k = 0; k < l.length; k++) {
      e = l[k]; z = +e.getAttribute('data-z') || 20;
      s = iconCanvas(e.getAttribute('data-i'), z, COL[e.getAttribute('data-c')] || C.label, e.hasAttribute('data-f'));
      e.width = s.width; e.height = s.height; e.style.width = z + 'px'; e.style.height = z + 'px';
      e.getContext('2d').drawImage(s, 0, 0);
    }
  }

  // --- bossowie v3: rysunki części (wołane raz przy budowie, kontekst już przeskalowany do jednostek) ---
  function pf(x, pts, fill, stroke, lw) {
    x.beginPath(); x.moveTo(pts[0], pts[1]);
    for (var j = 2; j < pts.length; j += 2) x.lineTo(pts[j], pts[j + 1]);
    x.closePath();
    if (fill) { x.fillStyle = fill; x.fill(); }
    if (stroke) { x.strokeStyle = stroke; x.lineWidth = lw || 1; x.stroke(); }
  }
  function ln(x, a, b, c, d) { x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); }
  function st(x, s, px, X, Y, fill, b) {
    x.font = (b ? '700 ' : '500 ') + px + 'px ' + MONO; x.fillStyle = fill; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s, X, Y);
  }
  // tekst kodu z kod.txt jako faktura pancerza, przycięty do wielokąta
  function tex(x, P, pts, fs, sd) {
    var j, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, y, s;
    for (j = 0; j < pts.length; j += 2) { x0 = Math.min(x0, pts[j]); x1 = Math.max(x1, pts[j]); y0 = Math.min(y0, pts[j + 1]); y1 = Math.max(y1, pts[j + 1]); }
    x.save(); pf(x, pts); x.clip();
    x.font = '400 ' + fs + 'px ' + MONO; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillStyle = P.txt; x.globalAlpha = 0.36;
    for (y = y0 + fs; y < y1; y += fs * 1.5) {
      s = '';
      while (s.length * fs * 0.6 < x1 - x0 + fs * 6) { sd = (sd * 7 + 3) % KOD.length; s += KOD[sd] + '  '; }
      x.fillText(s, x0 - (sd % 5) * fs, y);
    }
    x.restore();
  }
  // pęknięcia: poszarpane linie od krawędzi do środka (dwa stopnie: przy połowie i przy ćwierci życia)
  function cracks(x, P, pts, n, sd) {
    var j, r, px, py, k;
    x.save(); pf(x, pts); x.clip(); x.lineJoin = 'miter';
    for (j = 0; j < n; j++) {
      k = ((sd + j * 5) % (pts.length / 2)) * 2; px = pts[k] * 0.96; py = pts[k + 1] * 0.96;
      x.beginPath(); x.moveTo(px, py);
      for (r = 0; r < 6; r++) { px += -px * 0.17 + (Math.random() - 0.5) * 18; py += -py * 0.17 + (Math.random() - 0.5) * 18; x.lineTo(px, py); }
      x.strokeStyle = P.dark; x.lineWidth = 3.2; x.stroke();
      x.strokeStyle = P.hot; x.lineWidth = 0.9; x.stroke();
    }
    x.restore();
  }
  function rivets(x, P, a) { x.fillStyle = P.edge; for (var j = 0; j < a.length; j += 2) x.fillRect(a[j] - 1.2, a[j + 1] - 1.2, 2.4, 2.4); }

  // 1. NullPointer: ogromny grot wskaźnika, w środku gniazdo oka
  function artNP(x, P) {
    var j;
    pf(x, NP_HULL, P.hull, P.edge, 1.6);
    pf(x, NP_PL, P.plate);
    tex(x, P, NP_PL, 4.4, 2);
    pf(x, NP_PNL, P.hull, P.edge, 0.7); pf(x, NP_PNR, P.hull, P.edge, 0.7);
    tex(x, P, NP_PNL, 3.6, 9); tex(x, P, NP_PNR, 3.6, 13);
    pf(x, NP_TIP, P.dark, P.edge, 0.8);
    pf(x, NP_BAND, P.sol);
    x.fillStyle = P.dark; for (j = 0; j < 15; j++) x.fillRect(-90 + j * 12, -54.5, 7, 4);
    x.strokeStyle = P.hull; x.lineWidth = 1.5;
    ln(x, -91, -24, -34, -24); ln(x, 34, -24, 91, -24); ln(x, -50, 12, -28, 12); ln(x, 28, 12, 50, 12); ln(x, 0, 20, 0, 24);
    x.fillStyle = P.dark; for (j = 0; j < 4; j++) { x.fillRect(-84 + j * 7, -20, 4, 10); x.fillRect(64 + j * 7, -20, 4, 10); }
    pf(x, NP_SOCK, P.dark, P.edge, 1.4); pf(x, NP_RING, null, P.hull, 2.4);
    st(x, '->', 17, 0, 34, P.hot, 1);
    st(x, '*ptr', 7, -64, -39, P.hi, 1); st(x, '0x00000000', 5, 58, -39, P.edge);
    st(x, 'deref', 4.6, -40, 20, P.edge); st(x, 'SIGSEGV', 4.6, 40, 20, P.edge);
    rivets(x, P, [-86, -44, 78, -44, -46, 4, 46, 4, 0, 50, -24, 30, 24, 30]);
  }
  function artFin(x, P) {
    pf(x, NP_FIN, P.hull, P.edge, 1.4);
    pf(x, [3, -4, 30, -4, 30, 4, 3, 4], P.sol);
    pf(x, [29, -13, 43, 0, 29, 13], P.hot);
    x.fillStyle = P.dark; x.fillRect(8, -10, 2, 5); x.fillRect(14, -10, 2, 5); x.fillRect(8, 5, 2, 5); x.fillRect(14, 5, 2, 5);
  }
  function artArm(x, P) {
    pf(x, NP_ARM, P.hull, P.edge, 1.2);
    x.fillStyle = P.dark; x.fillRect(12, -5, 3, 10); x.fillRect(28, -5, 3, 10); x.fillRect(44, -5, 3, 10);
    pf(x, [62, -7, 72, 0, 62, 7], P.hot);
  }
  function artNull(x, P) {
    pf(x, [-17, -9, 13, -9, 17, -5, 17, 9, -13, 9, -17, 5], P.dark, P.hi, 1.2);
    st(x, 'null', 9.5, 0, 0.8, P.hi, 1);
  }

  // 2. Memory Leak: komórki pamięci (atlas), klamry, tabliczka sterty
  var HEX = ['0x1F', '0xA0', '0x7C', 'free'];
  function artCell(x, P, v) {
    var j;
    if (v < 4) {
      pf(x, CR(-7.5, -7.5, 15, 15, 3.5), P.hull, P.edge, 0.6);
      st(x, HEX[v], 3.8, 0, -2.4, P.edge);
      x.fillStyle = P.plate; x.fillRect(-5, 2.4, 10, 1.5); x.fillRect(-5, 5, 6, 1.2);
    } else if (v < 6) {
      pf(x, CR(-7.5, -7.5, 15, 15, 3.5), v === 4 ? P.sol : P.hot);
      x.fillStyle = v === 4 ? P.dark : P.hi;
      for (j = 0; j < 4; j++) x.fillRect(-5, -4.5 + j * 3, j & 1 ? 6 : 10, 1.3);
    } else pf(x, CR(-7.5, -7.5, 15, 15, 3.5), C.bone);
  }
  function artClamp(x, P) {
    var j;
    pf(x, ML_CLAMP, P.hull, P.edge, 1.3);
    tex(x, P, ML_CLAMP, 3.8, 5);
    pf(x, [-12, -50, -6, -50, -6, 50, -12, 50], P.sol);
    x.fillStyle = P.dark; for (j = -44; j < 44; j += 9) x.fillRect(-11, j, 4, 3);
    rivets(x, P, [6, -60, 6, 60, -8, -60, -8, 60]);
  }
  function artHeap(x, P) {
    pf(x, [-42, -8, 38, -8, 42, -4, 42, 8, -42, 8], P.hull, P.edge, 1);
    st(x, 'HEAP', 7, -27, 0.6, P.hi, 1);
    pf(x, [-14, -3.5, 36, -3.5, 36, 3.5, -14, 3.5], P.dark);
  }

  // 3. Race Condition: połówka (m = 1 lewa, -1 prawa; napisy zawsze czytelne), szczypce, ogniwo łańcucha ⇄
  function artRC(x, P, m) {
    var j;
    x.save(); x.scale(m, 1);
    pf(x, RC_ARM, P.hull, P.edge, 1.2);
    pf(x, RC_HULL, P.hull, P.edge, 1.6);
    pf(x, RC_PL, P.plate);
    tex(x, P, RC_PL, 4.4, m > 0 ? 4 : 11);
    x.fillStyle = P.hull; x.fillRect(-50, -44, 82, 3); x.fillRect(-50, 8, 82, 3); x.fillRect(-50, 46, 82, 3);
    pf(x, OCT(-10, -24, 22, 7), P.dark, P.edge, 1.2);
    pf(x, [-46, -62, 28, -62, 28, -56, -46, -56], P.dark, P.edge, 0.6);
    x.fillStyle = P.dark; for (j = -40; j < 64; j += 8) x.fillRect(29, j, 6, 2.4);
    x.fillStyle = P.sol; x.fillRect(-70, -40, 4, 80);
    x.restore();
    st(x, m > 0 ? 'T1' : 'T2', 22, -12 * m, 30, P.hot, 1);
    st(x, 'lock()', 6, -12 * m, 58, P.edge);
    st(x, 'mutex', 4.6, -12 * m, 4, P.edge);
    rivets(x, P, [-52 * m, -64, 30 * m, -66, -52 * m, 62, 30 * m, 64]);
  }
  function artClaw(x, P) {
    pf(x, RC_CLAW, P.hull, P.edge, 1.2);
    pf(x, OCT(5, 0, 4, 1.2), P.sol);
    pf(x, [36, -11, 41, -11, 36, -5], P.hot); pf(x, [36, 11, 41, 11, 36, 5], P.hot);
  }
  function artLink(x, P, col) {
    pf(x, [-7, -5, 3, -5, 3, -8, 8, -3.5, 3, 1, 3, -2, -7, -2], col);
    pf(x, [7, 2, -3, 2, -3, -1, -8, 3.5, -3, 8, -3, 5, 7, 5], col);
  }

  // 4. Segfault Prime: wieża z trzech pięter, skrzydła, korona, pierścienie, ramiona
  function artSP(x, P) {
    var j;
    pf(x, SP_WL, P.hull, P.edge, 1.5); pf(x, SP_WR, P.hull, P.edge, 1.5);
    tex(x, P, SP_WL, 4.2, 6); tex(x, P, SP_WR, 4.2, 17);
    x.strokeStyle = P.dark; x.lineWidth = 1.6;
    ln(x, -52, -6, -122, -26); ln(x, -52, 22, -120, 16); ln(x, 52, -6, 122, -26); ln(x, 52, 22, 120, 16);
    x.fillStyle = P.sol; x.fillRect(-126, -24, 5, 34); x.fillRect(121, -24, 5, 34);
    x.fillStyle = P.dark; for (j = 0; j < 5; j++) { x.fillRect(-112 + j * 11, 30, 6, 3); x.fillRect(62 + j * 11, 30, 6, 3); }
    st(x, '0xDEADBEEF', 5, -88, 6, P.edge); st(x, 'core dumped', 5, 88, 6, P.edge);
    pf(x, SP_T1, P.hull, P.edge, 1.6); pf(x, SP_P1, P.plate); tex(x, P, SP_P1, 4.4, 3);
    x.fillStyle = P.dark; x.fillRect(-54, 56, 108, 24);
    x.fillStyle = P.edge; for (j = -50; j < 50; j += 12) x.fillRect(j, 58, 7, 18);
    st(x, 'SIGSEGV', 12, 0, 40, P.hot, 1);
    pf(x, SP_T2, P.hull, P.edge, 1.6); pf(x, SP_P2, P.plate); tex(x, P, SP_P2, 4.4, 8);
    pf(x, SP_EYL, P.dark, P.edge, 1); pf(x, SP_EYR, P.dark, P.edge, 1);
    x.fillStyle = P.sol; x.fillRect(-44, 8, 88, 4);
    pf(x, SP_T3, P.hull, P.edge, 1.6); pf(x, SP_P3, P.plate); tex(x, P, SP_P3, 4, 21);
    pf(x, [-32, -40, 32, -40, 32, -34, -32, -34], P.sol);
    pf(x, SP_CORE, P.dark, P.edge, 1.2);
    rivets(x, P, [-60, 30, 60, 30, -60, 82, 58, 82, -46, -32, 46, -32, -28, -72, 22, -72, -100, -34, 100, -34]);
  }
  function artCrown(x, P) {
    pf(x, SP_CROWN, P.hull, P.edge, 1.3);
    pf(x, [-34, -5, 34, -5, 36, 0, -36, 0], P.sol);
    x.fillStyle = P.hot; x.fillRect(-1.5, -33, 3, 5); x.fillRect(-15.5, -25, 3, 4); x.fillRect(12.5, -25, 3, 4);
  }
  function artRing(x, P) {
    var s, a0, a1, r0 = 86, r1 = 98;
    for (s = 0; s < 16; s++) {
      if (s % 4 === 3) continue;
      a0 = s * Math.PI / 8 + 0.05; a1 = (s + 1) * Math.PI / 8 - 0.05;
      pf(x, [r0 * Math.cos(a0), r0 * Math.sin(a0), r1 * Math.cos(a0), r1 * Math.sin(a0), r1 * Math.cos(a1), r1 * Math.sin(a1), r0 * Math.cos(a1), r0 * Math.sin(a1)], s % 4 === 0 ? P.sol : P.edge);
      if (!(s & 1)) { x.fillStyle = P.hi; x.fillRect(101 * Math.cos(a0) - 1.5, 101 * Math.sin(a0) - 1.5, 3, 3); }
    }
  }
  function artSPArm(x, P) {
    pf(x, SP_ARM, P.hull, P.edge, 1.3);
    pf(x, SP_CLAW, P.sol, P.edge, 1);
    x.fillStyle = P.dark; x.fillRect(14, -9, 3, 18); x.fillRect(30, -9, 3, 18);
    pf(x, OCT(0, 0, 7, 2), P.dark, P.edge, 1);
  }

  var CUT = 'clip-path:polygon(0 0,calc(100% - 7px) 0,100% 7px,100% 100%,7px 100%,0 calc(100% - 7px))';
  var CSS =
    '.dcg{position:relative;width:100%;height:100%;overflow:hidden;background:' + C.ink + ';color:' + C.bone +
    ';font-family:' + SANS + ';outline:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}' +
    '.dcg .dcg-cv{position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none}' +
    '.dcg .dcg-i{display:inline-block;flex:none;vertical-align:middle}' +
    '.dcg-ov{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;background:rgba(14,14,18,.84);overflow:auto}' +
    '.dcg [hidden]{display:none!important}' +
    '.dcg-box{width:100%;max-width:340px;display:flex;flex-direction:column;gap:12px;margin:auto}' +
    '.dcg-k{margin:0;font:500 11px/1.4 ' + MONO + ';letter-spacing:.08em;text-transform:uppercase;color:' + C.label + ';display:flex;align-items:center;gap:8px}' +
    '.dcg-h{margin:0;font:700 30px/1.05 ' + SANS + ';letter-spacing:-.01em;color:' + C.bone + '}' +
    '.dcg-h.dcg-sf{font-family:' + MONO + ';color:' + C.hot + ';letter-spacing:.04em}' +
    '.dcg-p{margin:0;font-size:14px;line-height:1.5;color:' + C.muted + '}' +
    '.dcg-sm{font-size:12px}' +
    '.dcg-big{margin:0;font:700 44px/1 ' + MONO + ';color:' + C.bone + '}' +
    '.dcg-cm{margin:0;font:500 15px/1.4 ' + MONO + ';color:' + C.hot + '}' +
    '.dcg-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}' +
    '.dcg button{display:inline-flex;align-items:center;justify-content:center;gap:8px;font:600 13px/1 ' + SANS + ';color:' + C.bone + ';background:' + C.panel + ';border:1px solid ' + C.line +
    ';padding:12px 16px;min-height:44px;cursor:pointer;border-radius:0;' + CUT + '}' +
    '.dcg button:hover{border-color:' + C.hot + '}' +
    '.dcg button[aria-pressed=true]{background:' + C.bar + ';border-color:' + C.hot + ';color:' + C.label + '}' +
    '.dcg button.dcg-go{background:' + C.solid + ';border-color:' + C.solid + '}' +
    '.dcg button:focus{outline:none}' +
    '.dcg button:focus-visible{box-shadow:inset 0 0 0 2px ' + C.bone + '}' +
    '.dcg button.dcg-cb{position:absolute;font:500 11px/1 ' + MONO + ';letter-spacing:.08em;text-transform:uppercase;padding:10px;min-height:44px;min-width:44px;background:' + C.bar + ';border-color:' + C.solid + ';color:' + C.label + '}' +
    '.dcg-pz{top:8px;right:8px}.dcg-bb{right:12px;bottom:12px;min-width:64px!important;min-height:56px!important}' +
    '.dcg button.dcg-card{display:grid;grid-template-columns:40px 1fr;gap:2px 12px;align-items:center;text-align:left;width:100%;min-height:64px;padding:10px 14px}' +
    '.dcg-card .dcg-i{grid-row:1/3}.dcg-ct{font:600 14px/1.2 ' + SANS + ';color:' + C.bone + '}.dcg-cd{font:400 12px/1.35 ' + SANS + ';color:' + C.muted + '}' +
    '.dcg-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}';

  var HTML =
    '<canvas class="dcg-cv" role="img" aria-label="DancyCloud: statek leci nad nocnym miastem, omija spadające linijki kodu i walczy z bossami"></canvas>' +
    '<button type="button" class="dcg-cb dcg-pz" data-a="pause" tabindex="-1" aria-label="Pauza" hidden>' + ibtn('pause', 24) + '</button>' +
    '<button type="button" class="dcg-cb dcg-bb" tabindex="-1" aria-label="Bomba" hidden>' + ibtn('bomb', 24) + '<span></span></button>' +
    '<section class="dcg-ov dcg-start" aria-label="DancyCloud: start"><div class="dcg-box">' +
    '<p class="dcg-k">terminal · gra</p><h2 class="dcg-h">DancyCloud</h2>' +
    '<p class="dcg-p">Lecisz nad miastem. Z góry spada nasz kod. Co cztery fale czeka boss.</p>' +
    '<div class="dcg-row" role="group" aria-label="Tryb gry">' +
    '<button type="button" data-m="unik" aria-pressed="true">' + ibtn('shield', 20) + 'Unik</button>' +
    '<button type="button" data-m="ogien" aria-pressed="false">' + ibtn('auto', 20) + 'Ogień</button></div>' +
    '<p class="dcg-p dcg-md"></p><p class="dcg-k dcg-rec">' + ibtn('record', 18) + '<span></span></p>' +
    '<p class="dcg-k">' + ibtn('b1', 18) + ibtn('b2', 18) + ibtn('b3', 18) + ibtn('b4', 18) + '<span>4 bossy</span></p>' +
    '<div class="dcg-row"><button type="button" class="dcg-go" data-a="start">Start</button>' +
    '<button type="button" data-a="snd" aria-pressed="false" aria-label="Dźwięk: wył.">' + ibtn('mute', 20) + '<span>Dźwięk: wył.</span></button></div>' +
    '<p class="dcg-p dcg-sm">Strzałki lub WASD, na telefonie przeciągnij palcem. Spacja: bomba. Esc lub P: pauza.</p>' +
    '</div></section>' +
    '<section class="dcg-ov dcg-pause" aria-label="Pauza" hidden><div class="dcg-box">' +
    '<p class="dcg-k">pauza</p><h2 class="dcg-h">Stoimy.</h2>' +
    '<div class="dcg-row"><button type="button" class="dcg-go" data-a="resume">Wznów</button>' +
    '<button type="button" data-a="exit">Wyjdź</button></div></div></section>' +
    '<section class="dcg-ov dcg-over" aria-label="Koniec gry" hidden><div class="dcg-box">' +
    '<h2 class="dcg-h dcg-sf">SEGFAULT</h2><p class="dcg-k dcg-why"></p>' +
    '<p class="dcg-big dcg-sc">0</p><p class="dcg-k dcg-best">' + ibtn('record', 18) + '<span></span></p>' +
    '<p class="dcg-k dcg-bd"></p>' +
    '<div class="dcg-row"><button type="button" class="dcg-go" data-a="again">Jeszcze raz</button>' +
    '<button type="button" data-a="retry" hidden>' + ibtn('boss', 20) + 'Od bossa</button>' +
    '<button type="button" data-a="exit">Wyjdź</button></div></div></section>' +
    '<section class="dcg-ov dcg-merge" aria-label="Boss pokonany" hidden><div class="dcg-box">' +
    '<div class="dcg-row">' + ibtn('b1', 56, 'h', 1) + '</div>' +
    '<h2 class="dcg-h dcg-sf">MERGE</h2><p class="dcg-cm"></p>' +
    '<p class="dcg-k dcg-mb"></p><p class="dcg-k">' + ibtn('bomb', 18) + '<span>+1 bomba</span></p>' +
    '<div class="dcg-row"><button type="button" class="dcg-go" data-a="next">Dalej</button></div></div></section>' +
    '<section class="dcg-ov dcg-pick" aria-label="Wybierz ulepszenie" hidden><div class="dcg-box">' +
    '<p class="dcg-k">po bossie · wybierz jedno</p><div class="dcg-cards dcg-box" style="gap:8px;margin:0"></div></div></section>' +
    '<p class="dcg-sr" aria-live="polite"></p>';

  var cssEl = null, cssRef = 0;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function load(k) { try { return Math.max(0, parseInt(G.localStorage.getItem(k), 10) || 0); } catch (e) { return 0; } }
  function save(k, v) { try { G.localStorage.setItem(k, String(v)); } catch (e) { /* bez localStorage gra działa dalej */ } }
  function waveName(n) { return 'fala ' + n + ': ' + FALE[Math.min(n, FALE.length) - 1]; }

  // Sylwetka rakiety (współrzędne jednostkowe, dziób do góry).
  var SH_BODY = [-3, -15, 2, -15, 5, -12, 5, 12, -1, 12, -5, 8, -5, -12];
  var SH_WL = [-5, -3, -14, 7, -14, 11, -9, 13, -5, 11], SH_WR = [5, -3, 14, 7, 14, 13, 5, 11];
  var SH_CAB = [-2, -10, 1.5, -10, 3, -6, 3, -1, -3, -1, -3, -6];
  var SH_STL = [-12, 8, -6, 3, -6, 6, -10, 10], SH_STR = [12, 9, 6, 3, 6, 6, 10, 11];
  var SH_ENG = [-3, 12, 3, 12, 2.5, 15, -2.5, 15];
  var SH_FIN = [4, 5, 8, 11, 8, 16, 5, 12];
  var SH_FINL = [-4, 5, -8, 11, -8, 16, -5, 12];
  var SH_RING = [0, -21, 15, -15, 21, 0, 15, 15, 0, 21, -15, 15, -21, 0, -15, -15];

  function mount(el, opts) {
    if (!el || !el.appendChild) throw new Error('DancyCloud.mount: podaj element');
    opts = opts || {};
    var doc = el.ownerDocument || document, win = doc.defaultView || G;
    if (!cssRef++) { cssEl = doc.createElement('style'); cssEl.textContent = CSS; doc.head.appendChild(cssEl); }

    var root = doc.createElement('div');
    root.className = 'dcg';
    root.tabIndex = -1;
    root.innerHTML = HTML;
    el.appendChild(root);
    function q(s) { return root.querySelector(s); }
    function mk(w, h) { var c = doc.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }

    var cv = q('.dcg-cv'), ctx = cv.getContext('2d', { alpha: false });
    var ovStart = q('.dcg-start'), ovPause = q('.dcg-pause'), ovOver = q('.dcg-over'), ovMerge = q('.dcg-merge'), ovPick = q('.dcg-pick');
    var bPause = q('.dcg-pz'), bBomb = q('.dcg-bb'), bBombT = bBomb.querySelector('span'), live = q('.dcg-sr');
    var mq = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var reduced = !!(mq && mq.matches);
    var touch = !!(win.matchMedia && win.matchMedia('(pointer: coarse)').matches);
    var mem = { unik: 0, ogien: 0 };
    // parametry testowe: ?boss=N (boss N po 2 s od startu rundy), ?god=1 (statek nie ginie)
    var qs = null;
    try { qs = new win.URLSearchParams(win.location.search); } catch (e) { qs = null; }
    var testTier = opts.boss != null ? (+opts.boss || 0) - 1 : qs && qs.get('boss') ? (+qs.get('boss') || 0) - 1 : -1;
    var god = !!(opts.god || (qs && qs.get('god') === '1')), testUps = String(opts.ups || (qs && qs.get('ups')) || '');

    // --- stan ---
    var W = 0, H = 0, dpr = 0, F = 0, s0 = 1, bs = 1, cw = 8, lh = 18, pad = 5;
    var spr = [], atlas = null, gIdx = {}, cellW = 10, eligible = [], eligN = 0, shipG = [], pj = [], ic = {};
    var city = null, cityP = 1, cityH = 0, cityOff = 0, clouds = [];
    var state = 'start', mode = 'unik', snd = false, dead = false, raf = 0, last = 0, ac = null;
    var t = 0, waveT = 0, score = 0, wave = 1, bombs = 1, nextBomb = 1000, step = 1000, spawnT = 0, fireT = 0, grace = 0;
    var flash = 0, shake = 0, dieT = 0, overAt = 0, banner = 0, bannerTxt = '', bannerW = 0, shx = 0, shy = 0;
    var ship = { x: 0, y: 0, vx: 0, vy: 0 }, tilt = 0, shipShake = 0, invul = 0, slowT = 0;
    var keys = { l: 0, r: 0, u: 0, d: 0 };
    var drag = { on: false, id: -1, px: 0, py: 0, sx: 0, sy: 0, tx: 0, ty: 0 };
    var hudScore = -1, hudTxt = '', hudWave = '', hudB = '', hudG = '', hudR = '', hudBomb = -1, hudGraze = -1, hudRec = -1;
    var up = { fire: 0, dbl: 0, shield: 0, graze: 0, slow: 0, power: 0, agile: 0, cache: 0 };
    var recNow = 0, shieldOn = false, grazeN = 0, grazeBonus = 25, grazeTxt = '+25 muśnięcie';
    var bossTier = 0, tb = -1, cp = null, diedBoss = false, earned = [0, 0, 0, 0], pickIds = [], lastBoss = 0;
    var BO = { on: false, type: 0, tier: 0, n: 1, st: 0, en: 0, age: 0, ph: 0, need: 60, mode: 0, ct: 0, phase: 1, g: 0, turn: 0, sub: 0, na: 0, fast: 1, hit: 0, hp: 100, dt: 0, lane: 0, laneW: 0,
      il: 1.8, vp: 1, hpG: 100, gT: 0, blk: 0, bt: 2, d1: 0, d2: 0, armT: 0, cb: 0, dr: 0, gone: false, et: 0, sh: 0 };
    var BP = [], RX = [0, 0, 0, 0, 0, 0, 0, 0], RK = [0, 0, 0, 0, 0, 0, 0, 0], RN = 0, i;
    // v3: części bossa (BA), skala jednostek, glitch-pasy, wybuchy, odłamki i odpadające części (pule)
    var BA = null, BU = 1, haz = null, gN = 1, TBX = 0, TBY = 0, TS = 1, nextBossT = BOSS1_S;
    var GLY = [0, 0.2, 0.4, 0.6, 0.8, 1], GLX = [0, 0, 0, 0, 0], glA = 0, glT = 1;
    var EXP = [], exN = 0, SHD = [], shN = 0, DTP = [];

    // --- pule obiektów (zero alokacji w pętli) ---
    var OB = [], obN = 0, PT = [], ptN = 0, BL = [], blN = 0, FL = [], flN = 0, PR = [], prN = 0;
    for (i = 0; i < 48; i++) OB.push({ x: 0, y: 0, w: 0, h: 0, vy: 0, k: 0, hv: false, hp: 1, hit: 0, near: 0 });
    for (i = 0; i < 900; i++) PT.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, g: 0, r: 0 });
    for (i = 0; i < 64; i++) BL.push({ x: 0, y: 0 });
    for (i = 0; i < 8; i++) FL.push({ x: 0, y: 0, life: 0, txt: '' });
    for (i = 0; i < 48; i++) PR.push({ x: 0, y: 0, vx: 0, vy: 0, r: 6, g: 0, rot: 0, near: 0 });
    for (i = 0; i < 2; i++) BP.push({ x: 0, y: -200, w: 0, h: 0, u: 1, spin: 0, fc: 0, hp: 100, max: 100, hit: 0, alive: false, kind: 0, tele: 0, tele0: 0, cd: 0, ex: false, tx: 0, ty: 0, side: 1 });
    for (i = 0; i < 16; i++) EXP.push({ x: 0, y: 0, r: 0, life: 0, max: 1 });
    for (i = 0; i < 64; i++) SHD.push({ x: 0, y: 0, vx: 0, vy: 0, a: 0, va: 0, s: 0, life: 0, c: C.line });
    for (i = 0; i < 6; i++) DTP.push({ pt: null, x: 0, y: 0, vx: 0, vy: 0, a: 0, va: 0, S: 1, m: 1, life: 0 });

    function font(b, px) { return (b ? '700 ' : '400 ') + (px || F) + 'px ' + MONO; }
    function ls(c, v) { if ('letterSpacing' in c) c.letterSpacing = v + 'px'; }
    function go(s) { state = s; root.setAttribute('data-st', s); }
    function tag() {
      root.setAttribute('data-boss', BO.on ? BN[BO.type] : '');
      root.setAttribute('data-bhp', BO.on ? String(Math.ceil(BO.hp)) : '');
    }

    // --- render jednorazowy: linijki, znaki, pociski, bossowie i ikony HUD do offscreen canvas ---
    function lineSprite(s, w, h, heavy) {
      var c = mk(w * dpr, h * dpr), x = c.getContext('2d');
      x.scale(dpr, dpr);
      x.fillStyle = heavy ? C.solid : C.ink;
      x.fillRect(0, 0, w, h);
      if (!heavy) {
        x.strokeStyle = C.line; x.lineWidth = 1; x.strokeRect(0.5, 0.5, w - 1, h - 1);
        x.fillStyle = C.acc; x.fillRect(0, 0, 2, h);
      }
      x.font = font(heavy); x.fillStyle = C.bone; x.textBaseline = 'middle';
      x.fillText(s, pad, h / 2 + 0.5);
      return c;
    }
    function glyphSprite(s) {
      var m = mk(4, 4).getContext('2d'), w;
      m.font = font(true, F + 2); w = Math.ceil(m.measureText(s).width) + 4;
      var c = mk(w * dpr, lh * dpr), x = c.getContext('2d');
      x.scale(dpr, dpr); x.font = font(true, F + 2); x.fillStyle = C.hot; x.textBaseline = 'middle'; x.textAlign = 'center';
      x.fillText(s, w / 2, lh / 2 + 0.5);
      return { c: c, w: w, h: lh };
    }

    // --- bossowie v3: budowa części (raz na bossa i rozmiar okna, poza pętlą gry) ---
    function bossU(ty) { return Math.min(FWB[ty] * W / DIM[ty][0], FHB[ty] * H / DIM[ty][1]); }
    function prtC(w, h, ax, ay, fn, P, a1) {
      var k = BU * dpr, c = mk(w * k, h * k), x = c.getContext('2d');
      x.setTransform(k, 0, 0, k, ax * k, ay * k); x.lineJoin = 'miter';
      fn(x, P, a1);
      return c;
    }
    function prt(w, h, ax, ay, fn, a1, nf) {
      var n = prtC(w, h, ax, ay, fn, PAL, a1);
      return { n: n, f: nf ? n : prtC(w, h, ax, ay, fn, PALF, a1), w: w, h: h, ax: ax, ay: ay };
    }
    function crk(poly, n, sd, m) { return function (x, P) { if (m) x.scale(m, 1); cracks(x, P, poly, n, sd); }; }
    // karta wejścia: pasy ostrzegawcze, „UWAGA”, nazwa wielkimi literami (mono, rozstrzelona)
    function buildCard(ty) {
      var ch = Math.round(clamp(W * 0.13, 92, 132)), c = mk(W * dpr, ch * dpr), x = c.getContext('2d'), fs = Math.round(clamp(W * 0.062, 22, 58));
      x.scale(dpr, dpr);
      x.globalAlpha = 0.9; x.fillStyle = C.ink; x.fillRect(0, 10, W, ch - 20); x.globalAlpha = 1;
      x.fillStyle = haz; x.fillRect(0, 0, W, 9); x.fillRect(0, ch - 9, W, 9);
      x.fillStyle = C.solid; x.fillRect(0, 9, W, 2); x.fillRect(0, ch - 11, W, 2);
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = '500 12px ' + MONO; ls(x, 4); x.fillStyle = C.hot; x.fillText('UWAGA · BOSS ' + (ty + 1) + '/4', W / 2 + 2, 26);
      x.font = '700 ' + fs + 'px ' + MONO; ls(x, fs * 0.22); x.fillStyle = C.bone; x.fillText(BNU[ty], W / 2 + fs * 0.11, ch / 2 + 4);
      x.font = '400 11px ' + MONO; ls(x, 1); x.fillStyle = C.muted; x.fillText(TAG[ty], W / 2, ch - 22);
      ls(x, 0);
      x.fillStyle = C.solid; x.fillRect(W / 2 - fs * 4, ch / 2 + fs * 0.62, fs * 8, 2);
      return c;
    }
    function ensureArt(ty) {
      if (!W || !atlas || ty < 0) return;
      var key = ty + ':' + W + ':' + H + ':' + dpr + ':' + F, A, j, i, X, Y, e, ids, ac;
      if (BA && BA.key === key) return;
      BU = bossU(ty) * (ty === 1 ? 1.15 : 1);
      A = { key: key, ty: ty, h: null, h2: null, k1: null, k2: null, p1: null, p2: null, p3: null, card: buildCard(ty) };
      if (ty === 0) {
        A.h = prt(204, 132, 102, 66, artNP);
        A.k1 = prt(204, 132, 102, 66, crk(NP_HULL, 4, 1), 0, 1); A.k2 = prt(204, 132, 102, 66, crk(NP_HULL, 5, 4), 0, 1);
        A.p1 = prt(54, 48, 2, 24, artFin); A.p2 = prt(80, 24, 2, 12, artArm); A.p3 = prt(38, 22, 19, 11, artNull);
      } else if (ty === 1) {
        A.p1 = prt(32, 136, 16, 68, artClamp); A.p2 = prt(88, 20, 44, 10, artHeap);
        // siatka komórek pamięci w kształcie bryły; kolejność napełniania (od dołu) i odpadania (od brzegu)
        A.cx = []; A.cy = []; A.cv = []; A.e = [];
        for (j = 0; j < 7; j++) for (i = 0; i < 12; i++) {
          X = (i - 5.5) * 17; Y = (j - 3) * 17; e = X * X / 10400 + Y * Y / 4500;
          if (e > 1 || (Math.abs(X) < 17 && Math.abs(Y) <= 17) || (e > 0.62 && (i * 31 + j * 17) % 7 === 0)) continue;
          A.cx.push(X); A.cy.push(Y); A.cv.push((i * 5 + j * 3) % 4); A.e.push(e + ((i * 13 + j * 7) % 5) * 0.03);
        }
        A.n = A.cx.length; ids = [];
        for (j = 0; j < A.n; j++) ids.push(j);
        A.fo = ids.slice().sort(function (a, b) { return A.cy[b] - A.cy[a] || Math.abs(A.cx[a]) - Math.abs(A.cx[b]); });
        ac = ids.slice().sort(function (a, b) { return A.e[b] - A.e[a]; });
        A.br = []; for (j = 0; j < A.n; j++) A.br[ac[j]] = j;
        A.cp = Math.ceil(16 * BU * dpr);
        A.at = mk(A.cp * 7, A.cp);
        e = A.at.getContext('2d');
        for (j = 0; j < 7; j++) { e.setTransform(BU * dpr, 0, 0, BU * dpr, A.cp * j + A.cp / 2, A.cp / 2); artCell(e, PAL, j); }
      } else if (ty === 2) {
        A.h = prt(152, 160, 76, 80, artRC, 1); A.h2 = prt(152, 160, 76, 80, artRC, -1);
        A.k1 = prt(152, 160, 76, 80, crk(RC_HULL, 4, 2), 0, 1); A.k2 = prt(152, 160, 76, 80, crk(RC_HULL, 4, 7, -1), 0, 1);
        A.p1 = prt(46, 28, 2, 14, artClaw);
        A.l0 = prtC(18, 18, 9, 9, artLink, PAL, C.muted); A.l1 = prtC(18, 18, 9, 9, artLink, PAL, C.bone);
      } else {
        A.h = prt(268, 170, 134, 80, artSP);
        A.k1 = prt(268, 170, 134, 80, crk(SP_T2, 3, 1), 0, 1); A.k2 = prt(268, 170, 134, 80, crk(SP_T1, 4, 3), 0, 1);
        A.p1 = prt(78, 42, 39, 39, artCrown); A.p2 = prt(208, 208, 104, 104, artRing); A.p3 = prt(80, 34, 2, 17, artSPArm);
      }
      BA = A;
    }

    function buildSprites() {
      var m = mk(4, 4).getContext('2d'), chars = '', k, j, s, ch, tw, w, gl;
      m.font = font(false); cw = m.measureText('M').width;
      lh = Math.round(F * 1.6); pad = Math.round(F * 0.55);
      gIdx = {}; spr = [];
      for (k = 0; k < KOD.length; k++) {
        s = KOD[k]; gl = [];
        m.font = font(false); tw = m.measureText(s).width;
        m.font = font(true); tw = Math.max(tw, m.measureText(s).width);
        w = Math.ceil(tw + pad * 2);
        for (j = 0; j < s.length; j++) {
          ch = s.charAt(j);
          if (ch === ' ') { gl.push(-1); continue; }
          if (!(ch in gIdx)) { gIdx[ch] = chars.length; chars += ch; }
          gl.push(gIdx[ch]);
        }
        spr.push({ w: w, h: lh, n: lineSprite(s, w, lh, false), b: lineSprite(s, w, lh, true), g: gl, cw: (tw / s.length) });
      }
      cellW = Math.ceil(cw) + 2;
      atlas = mk(chars.length * cellW * dpr, lh * 2 * dpr);
      var a = atlas.getContext('2d');
      a.scale(dpr, dpr); a.textBaseline = 'middle'; a.textAlign = 'center';
      for (j = 0; j < chars.length; j++) {
        a.font = font(false); a.fillStyle = C.bone; a.fillText(chars.charAt(j), j * cellW + cellW / 2, lh / 2);
        a.font = font(true); a.fillStyle = C.hot; a.fillText(chars.charAt(j), j * cellW + cellW / 2, lh * 1.5);
      }
      shipG = [];
      s = '*/=-()<>';
      for (j = 0; j < s.length; j++) if (s.charAt(j) in gIdx) shipG.push(gIdx[s.charAt(j)]);
      for (k = 0; k < obN; k++) { OB[k].w = spr[OB[k].k].w; OB[k].h = lh; }
      pj = [glyphSprite('->'), glyphSprite('==')];
      gN = Math.max(1, chars.length);
      // wzór pasów ostrzegawczych (telegrafy, karta wejścia): karmazyn po skosie, tło przezroczyste
      var hz = mk(14, 14), hx = hz.getContext('2d');
      hx.fillStyle = C.solid; hx.beginPath(); hx.moveTo(0, 14); hx.lineTo(7, 0); hx.lineTo(12, 0); hx.lineTo(5, 14); hx.closePath(); hx.fill();
      hx.beginPath(); hx.moveTo(12, 14); hx.lineTo(14, 10); hx.lineTo(14, 14); hx.closePath(); hx.fill();
      hx.beginPath(); hx.moveTo(0, 4); hx.lineTo(2, 0); hx.lineTo(0, 0); hx.closePath(); hx.fill();
      haz = ctx.createPattern(hz, 'repeat');
      ic = { bomb: iconCanvas('bomb', 16, C.label), shield: iconCanvas('shield', 16, C.label), auto: iconCanvas('auto', 16, C.label),
        graze: iconCanvas('graze', 16, C.label), record: iconCanvas('record', 16, C.label), sound: iconCanvas('sound', 14, C.muted),
        mute: iconCanvas('mute', 14, C.muted), boss: iconCanvas('boss', 16, C.label),
        bb: [iconCanvas('b1', 22, C.label, 1), iconCanvas('b2', 22, C.label, 1), iconCanvas('b3', 22, C.label, 1), iconCanvas('b4', 22, C.label, 1)] };
      paintIcons(root);
      hudBomb = hudGraze = hudRec = -1;
    }

    function elig() {
      var max = Math.max(W * 0.64, 130), k;
      eligN = 0;
      for (k = 0; k < spr.length; k++) if (spr[k].w <= max) eligible[eligN++] = k;
      if (!eligN) for (k = 0; k < spr.length; k++) eligible[eligN++] = k;
    }

    function cloud(o, far, y) {
      o.far = far;
      o.w = rnd(0.15, 0.45) * W * (far ? 0.8 : 1.15);
      o.h = Math.round(far ? rnd(3, 7) : rnd(6, 14));
      o.x = rnd(-o.w * 0.3, W - o.w * 0.7);
      o.y = y; o.o = Math.round(rnd(-30, 30)); o.sw = rnd(0.2, 0.6);
      return o;
    }

    function buildBg() {
      var P = Math.max(320, Math.round(W)), x = 0, bw, bh, wx, wy, k, n;
      cityH = Math.round(clamp(H * 0.2, 60, 150));
      city = mk(P * dpr, cityH * dpr);
      var c = city.getContext('2d');
      c.scale(dpr, dpr);
      while (x < P) {
        bw = Math.round(rnd(18, 56));
        if (x + bw > P - 16) bw = P - x;
        bh = Math.round(rnd(0.3, 1) * (cityH - 10));
        c.fillStyle = C.city;
        c.fillRect(x, cityH - bh, bw, bh);
        if (bw > 22 && Math.random() < 0.22) c.fillRect(x + (bw >> 1) - 1, cityH - bh - 9, 2, 9);
        c.fillStyle = C.solid;
        for (wy = cityH - bh + 6; wy < cityH - 5; wy += 7)
          for (wx = x + 4; wx < x + bw - 5; wx += 6) if (Math.random() < 0.06) c.fillRect(wx, wy, 2, 3);
        x += bw + (Math.random() < 0.3 ? Math.round(rnd(2, 8)) : 0);
      }
      cityP = P; cityOff = 0;
      clouds = [];
      n = Math.round(clamp(W / 160, 4, 9));
      for (k = 0; k < n * 2; k++) clouds.push(cloud({}, k % 2 === 0, rnd(-20, H)));
    }

    function resize() {
      if (dead) return;
      var w = root.clientWidth, h = root.clientHeight, d = Math.min(2, win.devicePixelRatio || 1), nf;
      if (!w || !h || (w === W && h === H && d === dpr)) return;
      var fx = W ? w / W : 1, fy = H ? h / H : 1;
      W = w; H = h;
      cv.width = Math.round(W * d); cv.height = Math.round(H * d);
      nf = W < 520 ? 11 : W < 900 ? 12 : 13;
      s0 = clamp(Math.min(W, H) / 520, 0.85, 1.3);
      bs = clamp(Math.min(W / 640, H / 560), 0.58, 1.2);
      if (d !== dpr || nf !== F || !atlas) { dpr = d; F = nf; buildSprites(); }
      elig(); buildBg();
      if (BA) ensureArt(BA.ty);
      if (state === 'start') { ship.x = W / 2; ship.y = H * 0.78; } else { ship.x *= fx; ship.y *= fy; clampShip(); }
      if (!raf) draw();
    }

    // --- dźwięk: synteza Web Audio, domyślnie wyłączony ---
    function audio() {
      if (!snd || dead) return null;
      if (!ac) {
        var A = win.AudioContext || win.webkitAudioContext;
        if (!A) return null;
        try { ac = new A(); } catch (e) { return null; }
      }
      if (ac.state === 'suspended' && ac.resume) ac.resume();
      return ac;
    }
    function tone(f1, f2, dur, type, vol) {
      var a = audio();
      if (!a) return;
      try {
        var t0 = a.currentTime, o = a.createOscillator(), g = a.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f1, t0);
        o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
        g.gain.setValueAtTime(vol, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(a.destination);
        o.start(t0); o.stop(t0 + dur + 0.02);
      } catch (e) { /* cisza */ }
    }
    function sfx(k) {
      if (!snd) return;
      if (k === 'graze') tone(1250, 1700, 0.06, 'sine', 0.025);
      else if (k === 'bomb') { tone(240, 40, 0.38, 'triangle', 0.07); tone(900, 140, 0.18, 'square', 0.012); }
      else if (k === 'crash') tone(170, 32, 0.45, 'sawtooth', 0.05);
      else if (k === 'hit') tone(520, 330, 0.04, 'square', 0.01);
      else if (k === 'kill') tone(720, 210, 0.07, 'triangle', 0.02);
      else if (k === 'bhit') tone(300, 240, 0.05, 'square', 0.012);
      else if (k === 'tele') tone(660, 660, 0.05, 'square', 0.008);
      else if (k === 'boss') tone(110, 70, 0.5, 'sawtooth', 0.04);
      else if (k === 'win') { tone(440, 880, 0.3, 'triangle', 0.05); tone(660, 1320, 0.4, 'sine', 0.025); }
      else if (k === 'shield') tone(400, 120, 0.2, 'triangle', 0.05);
    }

    // --- obiekty gry ---
    function part(x, y, vx, vy, g, r) {
      if (ptN >= PT.length) return;
      var p = PT[ptN++];
      p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.g = g; p.r = r;
      p.life = p.max = rnd(0.55, 0.95);
    }
    function shatter(o) {
      var sp = spr[o.k], gl = sp.g, n = gl.length, j;
      for (j = 0; j < n; j++) {
        if (gl[j] < 0) continue;
        part(o.x + pad + j * sp.cw, o.y, rnd(-90, 90) + (j - n / 2) * 4, o.vy * 0.4 + rnd(-150, 30), gl[j], o.hv ? 1 : 0);
      }
    }
    function floater(x, y, txt) {
      if (flN >= FL.length) return;
      var f = FL[flN++];
      f.x = x; f.y = y; f.txt = txt; f.life = 0.9;
    }
    function removeOb(k) { var o = OB[k]; OB[k] = OB[obN - 1]; OB[obN - 1] = o; obN--; }

    function interval() {
      var lvl = wave - 1, ws = clamp(W / 700, 0.65, 1.6);
      var v = Math.max(0.18, 0.9 * Math.pow(0.86, lvl)) / ws;
      if (t < 10) v *= 1.3;
      return v * rnd(0.75, 1.25);
    }
    function speed() { return (80 + 24 * (wave - 1)) * clamp(H / 600, 0.75, 1.35) * (t < 10 ? 0.85 : 1); }
    function blocked(x, w) {
      for (var j = 0; j < obN; j++) {
        var o = OB[j];
        if (o.y < lh * 2.5 && x < o.x + o.w + 8 && x + w + 8 > o.x) return true;
      }
      return false;
    }
    function spawn() {
      if (obN >= OB.length || !eligN) return;
      var o = OB[obN], k = eligible[(Math.random() * eligN) | 0], sp = spr[k], tries = 0, x;
      do { x = rnd(2, Math.max(2, W - sp.w - 2)); } while (++tries < 4 && blocked(x, sp.w));
      o.k = k; o.w = sp.w; o.h = sp.h; o.x = x; o.y = -sp.h - 2;
      o.hv = wave > 1 && Math.random() < Math.min(0.3, 0.06 + 0.04 * (wave - 1));
      o.hp = o.hv ? 3 : 1; o.hit = 0; o.near = 0;
      o.vy = speed() * rnd(0.8, 1.25) * (o.hv ? 1.5 : 1);
      obN++;
    }
    // linijka z kodu spuszczona przez bossa w wybranym miejscu
    function lineAt(x, k, vy, y) {
      if (obN >= OB.length) return;
      var o = OB[obN++], sp = spr[k];
      o.k = k; o.w = sp.w; o.h = sp.h; o.x = clamp(x, 2, Math.max(2, W - sp.w - 2)); o.y = y;
      o.hv = false; o.hp = 1; o.hit = 0; o.near = 0; o.vy = vy;
    }
    function proj(x, y, vx, vy, g, r) {
      if (prN >= PR.length) return;
      var p = PR[prN++];
      p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.g = g; p.r = r; p.near = 0; p.rot = Math.atan2(vy, vx);
    }
    function shoot() {
      var dx = up.dbl ? 5 * s0 : 0;
      if (blN >= BL.length - 1) return;
      var b = BL[blN++];
      b.x = ship.x - dx; b.y = ship.y - 15 * s0;
      if (up.dbl) { b = BL[blN++]; b.x = ship.x + dx; b.y = ship.y - 15 * s0; }
    }
    function bomb() {
      if (state !== 'play' || bombs <= 0) return;
      bombs--;
      for (var k = obN - 1; k >= 0; k--) shatter(OB[k]);
      obN = 0; prN = 0; grace = 0.5;
      if (up.slow) slowT = 0.9 + 0.9 * up.slow;
      if (!reduced) flash = FLASH;
      sfx('bomb');
      if (BO.on) bossBomb();
      ui();
    }
    // trafienie statku: tarcza pochłania jedno, inaczej SEGFAULT. Zwraca true, gdy statek zginął.
    function hurt() {
      if (state !== 'play' || god || invul > 0 || BO.st === 1 || BO.st === 3) return false;
      if (shieldOn) {
        shieldOn = false; invul = 1.2; shipShake = 0.35; sfx('shield');
        if (!reduced) shake = 0.12;
        floater(ship.x, ship.y - 30 * s0, 'tarcza pękła'); ui();
        return false;
      }
      crash();
      return true;
    }
    function crash() {
      diedBoss = BO.on;
      go('dying'); dieT = 0.6; drag.on = false; blN = 0; shipShake = 0.6;
      if (!reduced) { flash = FLASH; shake = 0.3; }
      for (var j = 0; j < 16 && shipG.length; j++) part(ship.x, ship.y, rnd(-220, 220), rnd(-280, 60), shipG[j % shipG.length], j & 1);
      sfx('crash'); ui();
    }

    // --- bossowie ---
    function bossTop() { return W < 600 ? 144 : 58; }   // pod paskiem życia bossa
    function bossPos() {
      var ty = BO.type, u = bossU(ty) * (ty === 1 ? 0.95 + 0.2 * BO.g : 1), k, p, e = BO.st === 1 ? 1 - Math.pow(1 - BO.en, 3) : 1, xx, yy, top = bossTop(), am;
      for (k = 0; k < BO.n; k++) {
        p = BP[k]; p.u = u; p.w = DIM[ty][0] * u; p.h = DIM[ty][1] * u;
        am = Math.max(0, (W - p.w) / 2 - 6);
        if (ty === 0) { xx = W / 2 + Math.sin(BO.ph * 0.7) * Math.min(W * 0.2, am); yy = top + p.h / 2 + Math.min(BO.age * 4 * bs, H * 0.06); }
        else if (ty === 1) { xx = W / 2 + Math.sin(BO.ph * 0.5) * Math.min(W * 0.12, am); yy = top + p.h / 2; }
        else if (ty === 2) { xx = W / 2 + (k ? 1 : -1) * (W * 0.18 + Math.sin(BO.ph * 0.6) * W * 0.03); yy = top + p.h / 2 + Math.sin(BO.ph * 0.9 + k * 2) * 6; }
        else { xx = W / 2 + Math.sin(BO.ph * 0.4) * Math.min(W * 0.08, am); yy = top + 114 * u + Math.sin(BO.ph * 0.9) * 5; }
        p.x = xx; p.y = yy - (1 - e) * (yy + p.h);
      }
    }
    function showBanner(txt) { bannerTxt = txt; bannerW = 0; banner = 2.2; }
    function bossStart() {
      var ty = bossTier % 4, n = ty === 2 ? 2 : 1, k, p;
      ensureArt(ty);
      cp = { score: score, bombs: bombs, up: { fire: up.fire, dbl: up.dbl, shield: up.shield, graze: up.graze, slow: up.slow, power: up.power, agile: up.agile, cache: up.cache },
        sh: shieldOn, wave: wave, waveT: waveT, tier: bossTier, nbt: nextBossT, t: t, nb: nextBomb, step: step };
      BO.on = true; BO.type = ty; BO.tier = bossTier; BO.n = n; BO.st = 1; BO.en = 0; BO.age = 0; BO.ph = 0; BO.hit = 0;
      BO.need = BNEED[ty] * (1 + 0.5 * Math.floor(bossTier / 4));
      BO.mode = 0; BO.ct = ty === 0 ? 7 : ty === 2 ? 1.2 : 9; BO.phase = 1; BO.g = 0; BO.turn = 0; BO.sub = 0; BO.na = 0; BO.fast = 1; BO.hp = 100;
      BO.il = reduced ? 0.9 : INTRO_S; BO.vp = 1; BO.hpG = 100; BO.gT = 0; BO.blk = -1; BO.bt = 2.5; BO.d1 = BO.d2 = 0; BO.armT = 0; BO.cb = 0; BO.dr = 0;
      BO.gone = false; BO.et = 0; BO.sh = 0; glA = 0; glT = 0.05;
      for (k = 0; k < 2; k++) {
        p = BP[k]; p.alive = k < n; p.hp = p.max = 100 / n; p.hit = 0; p.kind = 0; p.tele = p.tele0 = 0; p.cd = 1.4; p.ex = false; p.spin = 0;
        p.side = k ? -1 : 1; p.x = W / 2; p.y = -200; p.fc = 0;
      }
      if (mode === 'unik' && bombs < 2) bombs = 2;
      // boss wchodzi na czystą scenę: linijki rozsypują się na znaki, w trakcie wejścia nic nie trafia statku
      for (k = obN - 1; k >= 0; k--) shatter(OB[k]);
      obN = 0; prN = 0; spawnT = 1; banner = 0;
      bossPos();
      tag(); ui(); sfx('boss');
      live.textContent = 'Uwaga, boss: ' + BN[ty] + '. Faza 1 z 3.';
    }
    function startTele(p, kind) {
      p.kind = kind; p.tele = p.tele0 = TELE_MIN + Math.random() * TELE_RND; p.tx = ship.x; p.ty = ship.y;
      if (kind === 2) {
        var n = BO.type === 3 ? 3 : clamp(2 + Math.floor(BO.g * 4), 2, 6), sl = W / n, j, k;
        RN = n;
        for (j = 0; j < n; j++) { k = eligible[(Math.random() * eligN) | 0]; RK[j] = k; RX[j] = clamp(sl * j + rnd(0, sl) - spr[k].w / 2, 2, W - spr[k].w - 2); }
      }
      if (kind === 3 && BO.type === 3) p.side = Math.random() < 0.5 ? 1 : -1;
      sfx('tele');
    }
    function arrow(p, da) {
      var y0 = p.y + ORY[BO.type] * p.h, a = Math.atan2(p.ty - y0, p.tx - p.x) + da, v = ARROW_V * clamp(H / 600, 0.75, 1.3) * BO.fast;
      proj(p.x + Math.cos(a) * 8, y0 + Math.sin(a) * 8, Math.cos(a) * v, Math.sin(a) * v, 0, 6 * s0);
    }
    function sweep(p) {
      var rows = BO.fast > 1 ? 2 : 1, r, j, v = SWEEP_V * BO.fast * clamp(W / 700, 0.8, 1.3);
      for (r = 0; r < rows; r++)
        for (j = 0; j < 6; j++) proj(p.side > 0 ? -12 - j * 50 : W + 12 + j * 50, clamp(p.ty - r * 46 * s0, 20, H - 20), p.side * v, 0, 1, 7 * s0);
    }
    // zrzut „core dump”: ściana linijek z jednym wolnym pasem
    function curtain() {
      var lx0 = BO.lane - BO.laneW / 2, lx1 = BO.lane + BO.laneW / 2, x, k, n, sd, tries;
      for (sd = 0; sd < 2; sd++) {
        x = sd ? lx1 + 4 : 2; n = 0;
        for (tries = 0; tries < 8 && n < 6; tries++) {
          k = eligible[(Math.random() * eligN) | 0];
          if (spr[k].w > (sd ? W - 2 : lx0 - 4) - x) continue;
          lineAt(x, k, speed() * 1.35, -lh - n * lh * 0.4); x += spr[k].w + 4; n++;
        }
      }
    }
    function bossFire(p) {
      var k = p.kind;
      if (k === 1) arrow(p, 0);
      else if (k === 4) { arrow(p, -0.3); arrow(p, 0); arrow(p, 0.3); }
      else if (k === 2) { for (var j = 0; j < RN; j++) lineAt(RX[j], RK[j], speed() * 1.05, -lh); }
      else if (k === 3) sweep(p);
    }
    function supply() { if (bombs <= 0) { bombs = 1; floater(ship.x, ship.y - 34 * s0, '+1 bomba'); ui(); } }
    function enterExp(len) {
      var p = BP[0];
      supply(); BO.mode = 1; BO.ct = len; p.kind = 0; p.tele = 0;
      if (BO.type === 1) BO.g = Math.max(0, BO.g - 0.25);
    }
    function aiSingle(dt) {
      var b = BO, p = BP[0], kd;
      if (b.mode === 1) {
        p.ex = true;
        if ((b.ct -= dt) <= 0) { b.mode = 0; p.ex = false; p.cd = 0.9; b.na = 0; b.ct = b.type === 0 ? 7 : 9; }
        return;
      }
      p.ex = false;
      if (b.type === 1) b.g = Math.min(1, b.g + dt / 38);
      if (p.tele > 0) {
        if ((p.tele -= dt) <= 0) {
          bossFire(p); p.kind = 0; b.na++;
          p.cd = b.type === 0 ? NP_CD[b.hp <= 60 ? 1 : 0] : b.type === 1 ? Math.max(ML_CD[1], ML_CD[0] - (ML_CD[0] - ML_CD[1]) * b.g) : SP_CD[b.phase === 1 ? 0 : 1];
        }
      } else if ((p.cd -= dt) <= 0) {
        kd = b.type === 0 ? (b.hp <= 60 ? 4 : 1) : b.type === 1 ? 2 : b.phase === 1 ? (b.na % 2 ? 1 : 4) : (b.na % 3 === 0 ? 4 : b.na % 3 === 1 ? 2 : 3);
        startTele(p, kd);
      }
      if (b.type !== 3) { if ((b.ct -= dt) <= 0 && p.tele <= 0) enterExp(b.type === 0 ? 2.6 : 2.5); }
      else if (b.na >= (b.phase === 1 ? 3 : 4) && p.tele <= 0) { b.na = 0; enterExp(b.phase === 1 ? 2 : 1.8); }
    }
    function aiRace(dt) {
      var b = BO, a = BP[0], c = BP[1], k, p, alive = (a.alive ? 1 : 0) + (c.alive ? 1 : 0);
      b.fast = alive === 1 ? 1.45 : 1;
      if (alive === 2) {
        if ((b.ct -= dt) <= 0) { b.turn ^= 1; b.ct = RC_TURN; supply(); BP[b.turn ^ 1].kind = 0; BP[b.turn ^ 1].tele = 0; startTele(BP[b.turn], 3); }
        for (k = 0; k < 2; k++) {
          p = BP[k]; p.ex = k !== b.turn;
          if (p.tele > 0 && (p.tele -= dt) <= 0) { bossFire(p); p.kind = 0; }
        }
      } else {
        p = a.alive ? a : c;
        if (p.tele > 0) { if ((p.tele -= dt) <= 0) { bossFire(p); p.kind = 0; p.cd = RC_CD; } }
        else if ((p.cd -= dt) <= 0) { startTele(p, 3); p.tele = p.tele0 = TELE_MIN; }
        p.ex = p.tele <= 0;
      }
    }
    function aiSegfault(dt) {
      var b = BO, p = BP[0];
      if (b.phase < 3) { aiSingle(dt); return; }
      p.ex = false; b.ct -= dt;
      if (b.sub === 0) {                       // spokój: pojedyncze strzały
        if (p.tele > 0) { if ((p.tele -= dt) <= 0) { bossFire(p); p.kind = 0; p.cd = 1.4; } }
        else if ((p.cd -= dt) <= 0 && b.ct > 0.8) startTele(p, 1);
        if (b.ct <= 0) {
          b.sub = 1; b.ct = 1.2; p.kind = 0; p.tele = 0;
          b.laneW = Math.max(70, 64 * s0); b.lane = rnd(b.laneW, W - b.laneW);
          supply(); sfx('boss');
        }
      } else if (b.sub === 1) { if (b.ct <= 0) { b.sub = 2; b.ct = 0.5; sfx('tele'); } }   // ładowanie: okno bomby
      else if (b.ct <= 0) { curtain(); b.sub = 0; b.ct = 2.4; p.cd = 1.2; }                  // zrzut, jeśli nie przerwano
    }
    // --- efekty v3: wybuchy, odłamki, glify rozsypane promieniście, odpadające części ---
    function burst(x, y, n, v) {
      for (var j = 0, a, sp; j < n; j++) { a = Math.random() * 6.283; sp = v * (0.35 + 0.65 * Math.random()); part(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 50, (Math.random() * gN) | 0, j & 1); }
    }
    function shard(x, y, s, col) {
      if (shN >= SHD.length) return;
      var d = SHD[shN++], a = Math.random() * 6.283, v = rnd(80, 300);
      d.x = x; d.y = y; d.vx = Math.cos(a) * v; d.vy = Math.sin(a) * v - 120; d.a = a; d.va = rnd(-9, 9); d.s = s; d.life = rnd(0.7, 1.2); d.c = col;
    }
    function boom(x, y, r) {
      if (exN < EXP.length) { var e = EXP[exN++]; e.x = x; e.y = y; e.r = r; e.life = e.max = rnd(0.35, 0.55); }
      burst(x, y, 12, 260);
      shard(x, y, r * 0.35, C.line); shard(x, y, r * 0.25, C.solid);
    }
    function detach(pt, p, X, Y, a0, m) {
      for (var j = 0, d; j < DTP.length; j++) if (DTP[j].life <= 0) {
        d = DTP[j]; d.pt = pt; d.x = p.x + p.u * X; d.y = p.y + p.u * Y; d.a = a0; d.m = m; d.S = p.u;
        d.vx = (X < 0 ? -1 : 1) * rnd(60, 160); d.vy = -rnd(90, 190); d.va = (X < 0 ? -1 : 1) * rnd(1.5, 4); d.life = 1.8;
        burst(d.x, d.y, 14, 200); shard(d.x, d.y, 10 * p.u, C.line);
        return;
      }
    }
    function glitchTick(dt, fast) {
      var j;
      if (reduced) { glA = 0; return; }
      if (glA > 0) { glA -= dt; return; }
      if ((glT -= dt) > 0) return;
      glA = rnd(0.07, 0.15); glT = fast ? rnd(0.02, 0.08) : rnd(0.25, 0.8) * (0.4 + 0.6 * BO.hp / 100);
      for (j = 1; j < 5; j++) GLY[j] = (j + rnd(-0.35, 0.35)) / 5;
      for (j = 0; j < 5; j++) GLX[j] = Math.random() < 0.45 ? rnd(-0.08, 0.08) : 0;
    }
    function bossUpdate(dt) {
      var b = BO, k, p, j, X, Y, sw;
      b.age += dt; b.ph += dt * (b.mode === 1 && b.type !== 2 ? 0.3 : 1); b.armT += dt;
      if (b.hit > 0) b.hit -= dt;
      if (b.gT > 0) b.gT -= dt; else if (b.hpG > b.hp) b.hpG = Math.max(b.hp, b.hpG - dt * 70);
      for (k = 0; k < b.n; k++) {
        p = BP[k];
        if (p.hit > 0) p.hit -= dt;
        if (p.fc > 0) p.fc -= dt;
        p.spin += dt * (2.2 + 3.2 * (1 - p.hp / p.max)) * (b.n === 2 && !BP[k ^ 1].alive ? 1.7 : 1);
      }
      b.blk -= dt;
      if ((b.bt -= dt) <= 0) { b.bt = rnd(2.2, 4); if (b.blk < 0) b.blk = 0.22; }
      glitchTick(dt, b.st === 3);
      if (b.st === 1) {                        // wejście: boss zjeżdża z góry, nic nie atakuje
        b.en = Math.min(1, b.age / (b.il * 0.62));
        bossPos();
        if (b.age >= b.il) { b.st = 2; b.en = 1; }
        return;
      }
      bossPos();
      if (b.st === 3) { bossDying(dt); return; }
      if (b.type === 2) aiRace(dt); else if (b.type === 3) aiSegfault(dt); else aiSingle(dt);
      p = BP[0];
      if (b.type === 1) {                       // Memory Leak: odpadające komórki i kapiący kod
        sw = 1 + 0.1 * b.g;
        j = Math.floor((1 - b.hp / 100) * BA.n * 0.5);
        while (b.cb < j) {
          k = 0; while (k < BA.n - 1 && BA.br[k] !== b.cb) k++;
          X = p.x + BA.cx[k] * sw * p.u; Y = p.y + BA.cy[k] * sw * p.u;
          shard(X, Y, 15 * p.u, b.cb & 1 ? C.solid : C.line); burst(X, Y, 5, 120);
          b.cb++;
        }
        if ((b.dr -= dt) <= 0) { b.dr = 0.2 - 0.1 * b.g; k = BA.fo[(Math.random() * Math.min(12, BA.n)) | 0]; part(p.x + BA.cx[k] * sw * p.u, p.y + (BA.cy[k] + 8) * sw * p.u, rnd(-12, 12), rnd(10, 50), (Math.random() * gN) | 0, 1); }
      } else if (b.type === 3 && b.phase === 3 && (b.dr -= dt) <= 0) {   // Segfault Prime w fazie 3 rozpada się na znaki
        b.dr = 0.06;
        part(p.x + rnd(-0.4, 0.4) * p.w, p.y + rnd(-0.35, 0.4) * p.h, rnd(-40, 40), rnd(-90, -10), (Math.random() * gN) | 0, Math.random() < 0.5 ? 1 : 0);
      }
      // zderzenie z korpusem
      if (state === 'play') for (k = 0; k < b.n; k++) {
        p = BP[k];
        if (p.alive && Math.abs(ship.x - p.x) < p.w * 0.4 + 6 * s0 && Math.abs(ship.y - p.y) < p.h * 0.4 + 9 * s0) { hurt(); break; }
      }
    }
    // śmierć: seria wybuchów z części, potem cyjanowy błysk 0,22 s i MERGE
    function bossDying(dt) {
      var b = BO, p, k;
      b.dt -= dt;
      if (!b.gone) {
        if ((b.et -= dt) <= 0) {
          b.et = reduced ? 0.2 : 0.085;
          k = (Math.random() * b.n) | 0; p = BP[k].alive ? BP[k] : BP[k ^ 1];
          boom(p.x + rnd(-0.42, 0.42) * p.w, p.y + rnd(-0.36, 0.36) * p.h, rnd(14, 30) * p.u);
          if (Math.random() < 0.35) sfx('bhit');
        }
        if (b.dt <= FLASH) {
          b.gone = true;
          for (k = 0; k < b.n; k++) {
            p = BP[k];
            if (!p.alive) continue;
            burst(p.x, p.y, 80, 460); boom(p.x, p.y, 60 * p.u);
            for (var j = 0; j < 12; j++) shard(p.x + rnd(-0.3, 0.3) * p.w, p.y + rnd(-0.3, 0.3) * p.h, rnd(6, 16) * p.u, j & 1 ? C.solid : C.line);
          }
          if (!reduced) { flash = FLASH; shake = 0.3; }
          sfx('win');
        }
      }
      if (b.dt <= 0) bossWin();
    }
    function phaseLook() {
      var b = BO, vp = b.type === 3 ? b.phase : b.hp > 66.7 ? 1 : b.hp > 33.4 ? 2 : 3, p = BP[0];
      if (vp !== b.vp) { b.vp = vp; b.armT = 0; if (b.type !== 3) live.textContent = BN[b.type] + ': faza ' + vp + ' z 3.'; }
      if (b.type === 0) {                       // NullPointer gubi płetwy-strzałki
        if (b.hp < 50 && !b.d1) { b.d1 = 1; detach(BA.p1, p, -96, -32, Math.PI, 1); }
        if (b.hp < 25 && !b.d2) { b.d2 = 1; detach(BA.p1, p, 96, -32, 0, 1); }
      }
    }
    function bossDeal(p, u) {
      var b = BO, mn = 0;
      if (b.st !== 2 || !p.alive || u <= 0) return;
      if (b.type === 3) { mn = b.phase === 1 ? 67 : b.phase === 2 ? 33 : 0; p.hp = Math.max(mn, p.hp - u); } else p.hp -= u;
      b.hit = 0.045; sfx('bhit');
      if (p.fc <= 0 || u > 5) { p.hit = 0.06; p.fc = 0.28; }   // biały błysk i drżenie najwyżej co 0,28 s (bomba zawsze)
      if (b.gT <= 0) b.gT = 0.3;
      if (b.blk < -0.5) b.blk = 0.22;
      if (p.hp <= 0) {
        p.hp = 0;
        if (b.type === 2 && BP[0].alive && BP[1].alive) {   // jedna połówka pada i odpada, druga przyspiesza
          p.alive = false;
          floater(p.x, p.y + p.h / 2, 'druga przyspiesza');
          detach(p === BP[0] ? BA.h : BA.h2, p, p === BP[0] ? -1 : 1, 0, 0, 1);
          detach(BA.p1, p, p === BP[0] ? 50 : -50, 30, p === BP[0] ? 0 : Math.PI, 1);
          boom(p.x, p.y, 40 * p.u);
        }
      }
      b.hp = BP[0].hp + (b.n === 2 ? BP[1].hp : 0);
      tag();
      if (b.type === 3 && b.phase < 3 && p.hp <= mn) {
        b.phase++; b.na = 0; showBanner(b.phase === 2 ? 'faza 2: refactor' : 'faza 3: core dump');
        live.textContent = BN[3] + ': faza ' + b.phase + ' z 3.';
        if (b.phase === 2) enterExp(3); else { b.mode = 0; b.sub = 0; b.ct = 2; p.cd = 1.4; p.kind = 0; p.tele = 0; if (bombs < 2) bombs = 2; ui(); }
        if (b.phase === 3 && !b.d1) { b.d1 = 1; detach(BA.p1, p, 0, -80, 0, 1); }
        prN = 0;
      }
      phaseLook();
      if (b.hp <= 0.001) bossKill();
    }
    function bossBomb() {
      var b = BO, pw = 1 + 0.5 * up.power, k, p;
      if (b.st !== 2) return;
      if (b.type === 3 && b.phase === 3) {
        if (b.sub === 0) { floater(ship.x, ship.y - 30 * s0, 'za wcześnie'); return; }
        BP[0].hit = 0.2; b.sub = 0; b.ct = 2.4; BP[0].cd = 1.6; BP[0].kind = 0; BP[0].tele = 0;
        floater(ship.x, ship.y - 30 * s0, 'parry');
        bossDeal(BP[0], 17 * pw);
        return;
      }
      for (k = 0; k < b.n; k++) { p = BP[k]; if (p.alive) bossDeal(p, (p.ex ? 34 : 17) * pw * (b.n === 2 ? 0.7 : 1)); if (b.st !== 2) break; }
    }
    function bossKill() {
      var k, p = BP[0], b = BO;
      b.st = 3; b.dt = DEATH_S; b.et = 0; prN = 0;
      for (k = 0; k < b.n; k++) BP[k].kind = BP[k].tele = 0;
      // części odpadają od razu
      if (b.type === 0) { if (!b.d2) { b.d2 = 1; detach(BA.p1, p, 96, -32, 0, 1); } if (!b.d1) { b.d1 = 1; detach(BA.p1, p, -96, -32, Math.PI, 1); } }
      else if (b.type === 1) { detach(BA.p1, p, -114, 0, 0, 1); detach(BA.p1, p, 114, 0, 0, -1); }
      else if (b.type === 2) { p = BP[0].alive ? BP[0] : BP[1]; detach(BA.p1, p, p === BP[0] ? 50 : -50, 30, p === BP[0] ? 0 : Math.PI, 1); }
      else { detach(BA.p3, p, 124, -6, 0.95, 1); detach(BA.p3, p, -124, -6, Math.PI - 0.95, 1); if (!b.d1) { b.d1 = 1; detach(BA.p1, p, 0, -80, 0, 1); } }
      for (k = obN - 1; k >= 0; k--) shatter(OB[k]);
      obN = 0; sfx('boss'); tag();
    }
    function bossWin() {
      var bonus = 500 * (BO.tier + 1);
      score += bonus; bombs = Math.min(5, bombs + 1);
      earned[BO.type] = 1; lastBoss = BO.type;
      stopLoop(); go('merge'); diedBoss = false;
      ovMerge.querySelector('canvas').setAttribute('data-i', 'b' + (BO.type + 1));
      q('.dcg-cm').textContent = 'merge: ' + BN[BO.type];
      q('.dcg-mb').textContent = '+' + bonus + ' punktów';
      paintIcons(ovMerge); ui(); draw();
      ovMerge.hidden = false;
      live.textContent = 'Merge: ' + BN[BO.type] + '. Plus ' + bonus + ' punktów i jedna bomba.';
      focusIn('[data-a=next]');
    }
    function pickScreen() {
      var pool = [], k, n, h = '', id, u;
      for (k = 0; k < UKEYS.length; k++) {
        id = UKEYS[k]; u = UPS[id];
        if (u.og && mode !== 'ogien') continue;
        if (up[id] >= u.max || (id === 'shield' && shieldOn)) continue;
        pool.push(id);
      }
      if (!pool.length) { resumeAfterBoss(); return; }
      pickIds = [];
      for (n = 0; n < 3 && pool.length; n++) pickIds.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
      for (k = 0; k < pickIds.length; k++) {
        u = UPS[pickIds[k]];
        h += '<button type="button" class="dcg-card" data-u="' + pickIds[k] + '" aria-label="' + (k + 1) + '. ' + u.n + '. ' + u.d + '">' + ibtn(u.i, 40, 'l', 1) +
          '<span class="dcg-ct">' + u.n + '</span><span class="dcg-cd">' + u.d + '</span></button>';
      }
      q('.dcg-cards').innerHTML = h;
      paintIcons(ovPick);
      ovMerge.hidden = true; ovPick.hidden = false; go('pick');
      focusIn('.dcg-card');
    }
    function applyUp(id) {
      if (!UPS[id] || up[id] >= UPS[id].max) return;
      up[id]++;
      if (id === 'shield') shieldOn = true;
      if (id === 'cache') step = 800;
      if (id === 'graze') { grazeBonus = 25 + 10 * up.graze; grazeTxt = '+' + grazeBonus + ' muśnięcie'; }
    }
    function resumeAfterBoss() {
      ovPick.hidden = ovMerge.hidden = true;
      BO.on = false; BO.st = 0; tag();
      ensureArt(bossTier % 4);
      grace = 1.2; spawnT = 1; invul = 0.8; prN = 0;
      go('play'); ui();
      try { root.focus({ preventScroll: true }); } catch (e) { root.focus(); }
      startLoop();
    }

    function clampShip() {
      var mx = 11 * s0, nx = clamp(ship.x, mx, W - mx), ny = clamp(ship.y, 14 * s0, H - 20 * s0);
      if (nx !== ship.x) { ship.x = nx; ship.vx = 0; }
      if (ny !== ship.y) { ship.y = ny; ship.vy = 0; }
    }
    function moveShip(dt) {
      if (dt <= 0) return;
      var sp = clamp(Math.min(W, H) * 0.75, 260, 440) * (1 + 0.12 * up.agile);
      if (drag.on) {
        var k = 1 - Math.exp(-dt * 30), nx = ship.x + (drag.tx - ship.x) * k, ny = ship.y + (drag.ty - ship.y) * k;
        ship.vx = (nx - ship.x) / dt; ship.vy = (ny - ship.y) / dt; ship.x = nx; ship.y = ny;
      } else {
        var ix = keys.r - keys.l, iy = keys.d - keys.u, a = 1 - Math.exp(-dt * (16 + 4 * up.agile));
        if (ix && iy) { ix *= 0.7071; iy *= 0.7071; }
        ship.vx += (ix * sp - ship.vx) * a; ship.vy += (iy * sp - ship.vy) * a;
        ship.x += ship.vx * dt; ship.y += ship.vy * dt;
      }
      clampShip();
      tilt += (clamp(ship.vx / sp, -1, 1) - tilt) * Math.min(1, dt * 12);
    }

    function update(dt) {
      var sd = state === 'dying' ? dt * 0.35 : dt, k, j, o, p, b, f, nw;
      if (slowT > 0) { slowT -= dt; sd *= 0.5; }
      if (state === 'play') {
        t += dt; score += dt * 20;
        if (!BO.on) {
          waveT += dt; nw = 1 + Math.floor(waveT / WAVE_S);
          if (nw !== wave) { wave = nw; setBanner(); }
          if (tb > 0 && (tb -= dt) <= 0) { tb = -1; bossTier = testTier; nextBossT = waveT + BOSS_EVERY * WAVE_S; bossStart(); bossTier++; }
          else if (tb < 0 && waveT >= nextBossT) { nextBossT = waveT + BOSS_EVERY * WAVE_S; bossStart(); bossTier++; }
        }
        if (score >= nextBomb) {
          nextBomb += step;
          if (bombs < 3) { bombs++; floater(ship.x, ship.y - 34 * s0, '+1 bomba'); ui(); }
        }
        moveShip(dt);
        if (grace > 0) grace -= dt;
        if (invul > 0) invul -= dt;
        if (!BO.on || (BO.st === 2 && !(BO.type === 3 && BO.phase === 3))) { spawnT -= sd; if (spawnT <= 0 && grace <= 0) { spawn(); spawnT = interval() * (BO.on ? RAIN_DIV : 1); } }   // w walce rzadszy deszcz
        if (mode === 'ogien') { fireT -= dt; if (fireT <= 0) { fireT = 0.14 / (1 + 0.35 * up.fire); shoot(); } }
      } else if ((dieT -= dt) <= 0) { gameOver(); return; }
      if (banner > 0) banner -= dt;
      if (flash > 0) flash -= dt;
      if (shake > 0) shake -= dt;
      if (shipShake > 0) shipShake -= dt;
      if (BO.on && state !== 'start') bossUpdate(sd);
      if (state === 'merge') return;

      var bgk = (reduced ? 0.4 : 1) * (1 + 0.06 * (wave - 1));
      cityOff = (cityOff + 8 * bgk * sd) % cityP;
      for (k = 0; k < clouds.length; k++) {
        o = clouds[k];
        o.y += (o.far ? 20 : 52) * bgk * sd;
        if (o.y > H + 4) cloud(o, o.far, -o.h - rnd(0, 60));
      }

      var hx1 = ship.x - 6 * s0, hx2 = ship.x + 6 * s0, hy1 = ship.y - 9 * s0, hy2 = ship.y + 9 * s0, gz = (12 + 8 * up.graze) * s0, dx, dy;
      for (k = obN - 1; k >= 0; k--) {
        o = OB[k];
        o.y += o.vy * sd;
        if (o.hit > 0) o.hit -= dt;
        if (o.y > H + 2) { removeOb(k); continue; }
        if (state !== 'play') continue;
        dx = o.x > hx2 ? o.x - hx2 : hx1 > o.x + o.w ? hx1 - o.x - o.w : 0;
        dy = o.y > hy2 ? o.y - hy2 : hy1 > o.y + o.h ? hy1 - o.y - o.h : 0;
        if (dx === 0 && dy === 0) { if (hurt()) break; }
        else if (dy === 0 && dx < gz) { if (!o.near) o.near = 1; }
        else if (o.near === 1) {
          o.near = 2; score += grazeBonus; grazeN++;
          floater(ship.x, ship.y - 26 * s0, grazeTxt); sfx('graze');
        }
      }
      // pociski bossów
      for (k = prN - 1; k >= 0; k--) {
        p = PR[k];
        p.x += p.vx * sd; p.y += p.vy * sd;
        if (p.x < -90 || p.x > W + 90 || p.y > H + 40 || p.y < -90) { PR[k] = PR[prN - 1]; PR[prN - 1] = p; prN--; continue; }
        if (state !== 'play') continue;
        dx = p.x - ship.x; dy = p.y - ship.y;
        var d2 = dx * dx + dy * dy, rr = p.r + 5.5 * s0;
        if (d2 < rr * rr) {
          PR[k] = PR[prN - 1]; PR[prN - 1] = p; prN--;
          if (hurt()) break;
        } else if (d2 < (rr + gz) * (rr + gz)) { if (!p.near) p.near = 1; }
        else if (p.near === 1) { p.near = 2; score += grazeBonus; grazeN++; floater(ship.x, ship.y - 26 * s0, grazeTxt); sfx('graze'); }
      }

      if (state === 'play') {
        var bd = 100 / BO.need;
        for (k = blN - 1; k >= 0; k--) {
          b = BL[k]; b.y -= 760 * dt;
          var gone = b.y < -12;
          for (j = obN - 1; !gone && j >= 0; j--) {
            o = OB[j];
            if (b.x >= o.x - 1 && b.x <= o.x + o.w + 1 && b.y <= o.y + o.h && b.y + 9 >= o.y) {
              gone = true;
              if (--o.hp <= 0) {
                score += o.hv ? 50 : 10;
                if (o.hv) floater(o.x + o.w / 2, o.y, '+50 dekompilacja');
                shatter(o); removeOb(j); sfx('kill');
              } else { o.hit = 0.09; sfx('hit'); }
            }
          }
          if (!gone && BO.on && BO.st >= 1) {
            for (j = 0; j < BO.n; j++) {
              p = BP[j];
              if (!p.alive) continue;
              if (b.x >= p.x - p.w * 0.46 && b.x <= p.x + p.w * 0.46 && b.y <= p.y + p.h * 0.42 && b.y + 9 >= p.y - p.h * 0.42) {
                gone = true;
                if (BO.st === 2 && !(BO.type === 3 && BO.phase === 3)) bossDeal(p, bd * (p.ex ? 2 : 1)); else if (BO.st === 2 && p.fc <= 0) { p.hit = 0.06; p.fc = 0.28; }
                break;
              }
            }
          }
          if (gone) { BL[k] = BL[blN - 1]; BL[blN - 1] = b; blN--; }
        }
      }

      for (k = ptN - 1; k >= 0; k--) {
        p = PT[k];
        p.vy += 380 * sd; p.x += p.vx * sd; p.y += p.vy * sd; p.life -= sd;
        if (p.life <= 0 || p.y > H + 20) { PT[k] = PT[ptN - 1]; PT[ptN - 1] = p; ptN--; }
      }
      for (k = exN - 1; k >= 0; k--) { o = EXP[k]; if ((o.life -= sd) <= 0) { EXP[k] = EXP[exN - 1]; EXP[exN - 1] = o; exN--; } }
      for (k = shN - 1; k >= 0; k--) {
        o = SHD[k]; o.vy += 420 * sd; o.x += o.vx * sd; o.y += o.vy * sd; o.a += o.va * sd;
        if ((o.life -= sd) <= 0) { SHD[k] = SHD[shN - 1]; SHD[shN - 1] = o; shN--; }
      }
      for (k = 0; k < DTP.length; k++) {
        o = DTP[k];
        if (o.life > 0) { o.vy += 420 * sd; o.x += o.vx * sd; o.y += o.vy * sd; o.a += o.va * sd; o.life -= sd; }
      }
      for (k = flN - 1; k >= 0; k--) {
        f = FL[k]; f.y -= 34 * dt; f.life -= dt;
        if (f.life <= 0) { FL[k] = FL[flN - 1]; FL[flN - 1] = f; flN--; }
      }
    }

    // --- rysowanie ---
    function base(c) { c.setTransform(dpr, 0, 0, dpr, dpr * shx, dpr * shy); }
    function pl(c, pts) {
      c.beginPath(); c.moveTo(pts[0], pts[1]);
      for (var j = 2; j < pts.length; j += 2) c.lineTo(pts[j], pts[j + 1]);
      c.closePath();
    }
    function drawShip(c, x, y, s) {
      var a = tilt * 0.22, cs = Math.cos(a), sn = Math.sin(a), sx = 1 - 0.1 * Math.abs(tilt), L, j, fl;
      if (shipShake > 0 && !reduced) { x += rnd(-2.2, 2.2); y += rnd(-1.6, 1.6); }
      if (invul > 0 && (reduced || ((t * 14) | 0) % 2)) c.globalAlpha = 0.5;
      c.setTransform(dpr * cs * sx * s, dpr * sn * sx * s, -dpr * sn * s, dpr * cs * s, dpr * (x + shx), dpr * (y + shy));
      fl = ((t * 30) | 0) % 3; L = 5 + fl * 3 + up.agile * 2;
      // ciąg: ostre pasy, bez poświaty
      c.fillStyle = C.hot; c.fillRect(-1, 15, 2, L);
      c.fillStyle = C.solid; c.fillRect(-3, 14, 1, L - 3); c.fillRect(2, 14, 1, L - 3);
      if (up.agile) { c.fillStyle = C.solid; c.fillRect(-6, 14, 1, L - 5); c.fillRect(5, 14, 1, L - 5); }
      c.fillStyle = C.bone; pl(c, SH_WL); c.fill(); pl(c, SH_WR); c.fill(); pl(c, SH_BODY); c.fill();
      c.fillStyle = C.acc; pl(c, SH_STL); c.fill(); pl(c, SH_STR); c.fill();
      c.fillStyle = C.solid; pl(c, SH_CAB); c.fill();
      c.fillStyle = C.bone; c.fillRect(-1, -8, 2, 3);
      c.fillStyle = C.muted; pl(c, SH_ENG); c.fill();
      if (up.agile) c.fillRect(-7, 11, 2, 3), c.fillRect(5, 11, 2, 3);
      if (up.power) { c.fillStyle = C.solid; c.fillRect(-2, 2, 4, 6); c.fillStyle = C.bone; c.fillRect(-1, 4, 2, 2); }
      if (up.cache) { c.fillStyle = C.muted; c.fillRect(-4.5, -1, 1.5, 6); }
      if (up.slow) { c.fillStyle = C.muted; pl(c, SH_FIN); c.fill(); pl(c, SH_FINL); c.fill(); }
      if (up.graze) { c.fillStyle = C.hot; c.fillRect(-16, 4, 2, 7); c.fillRect(14, 4, 2, 7); if (up.graze > 1) { c.fillRect(-18, 2, 2, 5); c.fillRect(16, 2, 2, 5); } }
      if (up.fire) {
        c.fillStyle = C.muted;
        for (j = 1; j <= up.fire; j++) { c.fillRect(-9 - (j - 1) * 3, 0 - (j - 1), 2, 9); c.fillRect(7 + (j - 1) * 3, 0 - (j - 1), 2, 9); }
        c.fillStyle = C.hot; c.fillRect(-9, -1, 2, 2); c.fillRect(7, -1, 2, 2);
      }
      if (up.dbl) { c.fillStyle = C.muted; c.fillRect(-3.5, -19, 2, 5); c.fillRect(1.5, -19, 2, 5); c.fillStyle = C.hot; c.fillRect(-3.5, -19, 2, 1.5); c.fillRect(1.5, -19, 2, 1.5); }
      if (shieldOn) { c.strokeStyle = C.bone; c.lineWidth = 1.2; pl(c, SH_RING); c.stroke(); }
      c.globalAlpha = 1;
      base(c);
    }

    function hud(c) {
      var j, sc = Math.floor(score), bsx = recNow, x;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.font = '500 11px ' + MONO; ls(c, 0.88);
      c.textAlign = 'left'; c.textBaseline = 'middle';
      if (sc !== hudScore) { hudScore = sc; hudTxt = 'WYNIK ' + sc; }
      if (bombs !== hudBomb) { hudBomb = bombs; hudB = '×' + bombs; }
      if (grazeN !== hudGraze) { hudGraze = grazeN; hudG = '×' + grazeN; }
      if (bsx !== hudRec) { hudRec = bsx; hudR = String(bsx); }
      // płytka pod HUD: linijki przelatują pod nią, a liczby zostają czytelne
      c.fillStyle = C.ink; c.fillRect(6, 6, 134, 82);
      c.fillStyle = C.acc; c.fillRect(6, 6, 2, 82);
      c.fillStyle = C.label;
      c.fillText(hudTxt, 14, 15);
      c.fillText(hudWave, 14, 31);
      c.drawImage(snd ? ic.sound : ic.mute, 118, 24, 14, 14);
      c.drawImage(ic.bomb, 14, 40, 16, 16); c.fillText(hudB, 34, 49);
      x = 64;
      if (shieldOn) { c.drawImage(ic.shield, x, 40, 16, 16); x += 22; }
      if (mode === 'ogien') c.drawImage(ic.auto, x, 40, 16, 16);
      c.drawImage(ic.graze, 14, 62, 16, 16); c.fillText(hudG, 34, 71);
      c.drawImage(ic.record, 70, 62, 16, 16); c.fillText(hudR, 90, 71);
      ls(c, 0);
      if (BO.on) {                            // pasek życia bossa: odznaka, nazwa, faza, segmenty faz, biały błysk utraconego kawałka
        var nar = W < 600, bw = nar ? W - 16 : Math.min(W * 0.56, 640), x0 = nar ? 8 : Math.max(152, W / 2 - bw / 2), x1 = nar ? W - 8 : Math.min(x0 + bw, W - 60),
          y0 = nar ? 94 : 8, f = BO.hp / 100, gq = BO.hpG / 100, w2 = x1 - x0, yb = y0 + 25;
        if (BO.st === 1) { f *= Math.min(1, BO.age / BO.il); gq = f; }
        c.fillStyle = C.ink; c.fillRect(x0 - 6, y0 - 3, w2 + 12, 46);
        c.fillStyle = C.acc; c.fillRect(x0 - 6, y0 - 3, 2, 46);
        c.drawImage(ic.bb[BO.type], x0, y0, 22, 22);
        c.textBaseline = 'middle'; c.textAlign = 'left';
        c.font = '700 12px ' + MONO; ls(c, 1.8); c.fillStyle = C.bone; c.fillText(BNU[BO.type], x0 + 30, y0 + 11);
        c.font = '500 11px ' + MONO; ls(c, 0.88); c.fillStyle = C.label; c.textAlign = 'right'; c.fillText(FZ[BO.vp - 1], x1, y0 + 11);
        c.textAlign = 'left'; ls(c, 0);
        c.fillStyle = C.line; c.fillRect(x0, yb, w2, 10);
        if (gq > f) { c.fillStyle = C.bone; c.fillRect(x0 + w2 * f, yb, w2 * (gq - f), 10); }
        c.fillStyle = BO.hit > 0 ? C.hot : C.solid; c.fillRect(x0, yb, w2 * f, 10);
        c.fillStyle = C.ink; c.fillRect(x0 + w2 / 3 - 1.5, yb - 1, 3, 12); c.fillRect(x0 + w2 * 2 / 3 - 1.5, yb - 1, 3, 12);
        c.fillStyle = C.muted;
        for (j = 1; j < 30; j++) c.fillRect(x0 + w2 * j / 30, yb + 12, 1, j % 5 ? 2 : 4);
      }
    }

    // --- bossowie v3: rysowanie w klatce (bez alokacji: tylko transformacje, obrazy i krótkie ścieżki) ---
    function setB(x, y, S) { TBX = x; TBY = y; TS = S; }
    function us(c) { var k = dpr * TS; c.setTransform(k, 0, 0, k, dpr * (TBX + shx), dpr * (TBY + shy)); }
    // część w układzie bossa: przesunięcie (X, Y) w jednostkach, obrót, skala; gl = glitch-pasy, fl = biały błysk trafienia
    function dp(c, pt, X, Y, a, sx, sy, gl, fl) {
      var cs = a ? Math.cos(a) : 1, sn = a ? Math.sin(a) : 0, img = fl ? pt.f : pt.n, k = dpr * TS, j, y0, y1, ih;
      c.setTransform(k * cs * sx, k * sn * sx, -k * sn * sy, k * cs * sy, dpr * (TBX + TS * X + shx), dpr * (TBY + TS * Y + shy));
      if (!gl || glA <= 0) { c.drawImage(img, -pt.ax, -pt.ay, pt.w, pt.h); return; }
      ih = img.height;
      for (j = 0; j < 5; j++) {
        y0 = GLY[j]; y1 = GLY[j + 1];
        c.drawImage(img, 0, y0 * ih, img.width, (y1 - y0) * ih, -pt.ax + GLX[j] * pt.w, -pt.ay + y0 * pt.h, pt.w, (y1 - y0) * pt.h);
        if (GLX[j]) { c.fillStyle = C.hot; c.fillRect(-pt.ax + GLX[j] * pt.w, -pt.ay + y0 * pt.h, pt.w, 1.2); }
      }
    }
    // pierścień w perspektywie: obrót w płaszczyźnie, spłaszczenie, przechył
    function ring(c, pt, X, Y, th, tl, sc, sq, fl) {
      var ct = Math.cos(th), s1 = Math.sin(th), cp2 = Math.cos(tl), sp2 = Math.sin(tl), k = dpr * TS * sc;
      c.setTransform(k * (cp2 * ct - sp2 * sq * s1), k * (sp2 * ct + cp2 * sq * s1), k * (-cp2 * s1 - sp2 * sq * ct), k * (-sp2 * s1 + cp2 * sq * ct),
        dpr * (TBX + TS * X + shx), dpr * (TBY + TS * Y + shy));
      c.drawImage(fl ? pt.f : pt.n, -pt.ax, -pt.ay, pt.w, pt.h);
    }
    function quad(c, ca, sa, cx, cy, r0, r1, hw) {
      var nx = -sa * hw, ny = ca * hw;
      c.beginPath(); c.moveTo(cx + ca * r0 + nx, cy + sa * r0 + ny); c.lineTo(cx + ca * r1 + nx, cy + sa * r1 + ny);
      c.lineTo(cx + ca * r1 - nx, cy + sa * r1 - ny); c.lineTo(cx + ca * r0 - nx, cy + sa * r0 - ny); c.closePath(); c.fill();
    }
    function octP(c, cx, cy, r, k) {
      c.beginPath(); c.moveTo(cx - r + k, cy - r); c.lineTo(cx + r - k, cy - r); c.lineTo(cx + r, cy - r + k); c.lineTo(cx + r, cy + r - k);
      c.lineTo(cx + r - k, cy + r); c.lineTo(cx - r + k, cy + r); c.lineTo(cx - r, cy + r - k); c.lineTo(cx - r, cy - r + k); c.closePath();
    }
    function sqr(c, cx, cy, r, a) {
      var ca = Math.cos(a) * r, sa = Math.sin(a) * r;
      c.beginPath(); c.moveTo(cx + ca, cy + sa); c.lineTo(cx - sa, cy + ca); c.lineTo(cx - ca, cy - sa); c.lineTo(cx + sa, cy - ca); c.closePath(); c.fill();
    }
    function ease3(v) { v = clamp(v, 0, 1); return 1 - (1 - v) * (1 - v) * (1 - v); }

    // 1. NullPointer
    function drawNP(c, p, fl) {
      var b = BO, vp = b.vp, ac = ACC[vp - 1], ph = b.ph, j, h, X, osc = reduced ? 0 : Math.sin(ph * 2.1) * 0.12, sl = (vp >= 2 ? 7 : 0) - (p.ex ? 9 : 0), a, ae, px, py, lid, r;
      us(c);
      c.fillStyle = ac;                         // korona: trzy ostrza pulsują
      for (j = -1; j <= 1; j++) {
        h = 8 + 7 * (0.5 + 0.5 * Math.sin(ph * 3 + j * 1.4)); X = j * 42;
        c.beginPath(); c.moveTo(X - 5, -56); c.lineTo(X + 5, -56); c.lineTo(X + 5, -56 - h + 3); c.lineTo(X + 2, -56 - h); c.lineTo(X - 5, -56 - h); c.closePath(); c.fill();
      }
      if (vp >= 2 && b.st !== 3) {              // od fazy 2: ramiona-wskaźniki wysuwają się spod kadłuba
        ae = ease3(b.armT / 0.7); a = 0.62 + (reduced ? 0 : Math.sin(ph * 1.7) * 0.12);
        dp(c, BA.p2, 50, 4, a, ae, 1, false, fl); dp(c, BA.p2, -50, 4, Math.PI - a, ae, 1, false, fl);
      }
      a = osc + (vp >= 2 ? 0.22 : 0);
      if (!b.d1) dp(c, BA.p1, -96 - sl, -32, -a, -1, 1, true, fl);
      if (!b.d2) dp(c, BA.p1, 96 + sl, -32, a, 1, 1, true, fl);
      dp(c, BA.h, 0, 0, 0, 1, 1, true, fl);
      if (b.hp < 55) dp(c, BA.k1, 0, 0, 0, 1, 1, true, false);
      if (b.hp < 28) dp(c, BA.k2, 0, 0, 0, 1, 1, true, false);
      us(c);
      c.strokeStyle = p.tele > 0 ? C.hot : p.ex ? C.bone : ac; c.lineWidth = vp === 3 ? 3.4 : 2.4; pl(c, NP_RING); c.stroke();
      c.fillStyle = p.ex ? C.bone : ac;         // szprychy tęczówki
      for (j = 0; j < 8; j++) { r = ph * (vp >= 2 ? 1.1 : 0.5) + j * 0.785; quad(c, Math.cos(r), Math.sin(r), 0, -12, 18, 23, 1.5); }
      px = clamp((ship.x - p.x) / (p.w * 0.5), -1, 1) * 8; py = clamp((ship.y - p.y) / (H * 0.5), -1, 1) * 6;
      if (p.tele > 0 || vp === 3) { c.fillStyle = p.tele > 0 ? C.hot : C.solid; c.fillRect(px - 21, -12 + py - 12, 42, 24); }
      dp(c, BA.p3, px, -12 + py, 0, 1, 1, false, fl);
      lid = b.blk > 0 && !p.ex ? Math.sin(Math.PI * (1 - b.blk / 0.22)) : 0;
      if (lid > 0.02) {                         // powieki
        us(c); c.save(); pl(c, NP_SOCK); c.clip();
        c.fillStyle = C.line; c.fillRect(-32, -43, 64, 31 * lid); c.fillRect(-32, 19 - 31 * lid, 64, 31 * lid);
        c.fillStyle = ac; c.fillRect(-32, -44.5 + 31 * lid, 64, 1.5); c.fillRect(-32, 19 - 31 * lid, 64, 1.5);
        c.restore();
      }
      if (vp === 3) {                           // faza 3: rozszczepione klamry gniazda
        us(c); c.fillStyle = C.hot; r = 36 + (reduced ? 0 : 2 * Math.sin(ph * 6));
        c.fillRect(-r - 3, -38, 3, 52); c.fillRect(-r - 3, -38, 9, 3); c.fillRect(-r - 3, 11, 9, 3);
        c.fillRect(r, -38, 3, 52); c.fillRect(r - 6, -38, 9, 3); c.fillRect(r - 6, 11, 9, 3);
      }
    }
    // 2. Memory Leak
    function drawML(c, p, fl) {
      var b = BO, ac = ACC[b.vp - 1], g = b.g, ph = b.ph, sw = 1 + 0.1 * g + (reduced ? 0 : 0.03 * Math.sin(ph * 1.7)), N = BA.n, fill = Math.floor(N * (0.12 + 0.88 * g)),
        i, k, X, Y, v, cp2 = BA.cp, j, h, op = p.ex ? 16 : 0, r;
      dp(c, BA.p1, -(112 + 10 * g) * sw - op, 0, 0, 1, 1, true, fl);
      dp(c, BA.p1, (112 + 10 * g) * sw + op, 0, 0, -1, 1, true, fl);
      us(c);
      c.fillStyle = ac;                         // kapiący kod: nitki pod masą
      for (j = 0; j < 6; j++) {
        X = -60 + j * 24 + (j & 1) * 4; Y = 56 * sw; h = 4 + 13 * (0.5 + 0.5 * Math.sin(ph * 1.3 + j * 1.9)) * (0.4 + g);
        c.fillRect(X - 1, Y, 2, h); c.fillRect(X - 2, Y + h, 4, 4);
      }
      for (i = 0; i < N; i++) {
        k = BA.fo[i];
        if (BA.br[k] < b.cb) continue;
        X = BA.cx[k] * sw; Y = BA.cy[k] * sw;
        if (!reduced) Y += Math.sin(ph * 2.4 + k * 0.9) * (0.5 + g);
        if (glA > 0) { v = (Y + 66) / 132; for (j = 0; j < 4 && GLY[j + 1] < v; j++); X += GLX[j] * 200; }
        v = fl ? 6 : i < fill ? (b.vp >= 2 && k % 3 === 0 ? 5 : 4) : BA.cv[k];
        c.drawImage(BA.at, v * cp2, 0, cp2, cp2, X - 8, Y - 8, 16, 16);
      }
      r = 15 + (reduced ? 0 : 2 * Math.sin(ph * 3));   // rdzeń sterty
      c.fillStyle = p.ex ? C.bone : p.tele > 0 ? (((b.age * 16) | 0) & 1 ? C.hot : C.bone) : ac;
      octP(c, 0, 0, r, r * 0.35); c.fill();
      c.fillStyle = C.ink; octP(c, 0, 0, r * 0.55, r * 0.2); c.fill();
      c.fillStyle = p.ex ? C.hot : C.bone; c.fillRect(-2, -2, 4, 4);
      dp(c, BA.p2, 0, -76 * sw, 0, 1, 1, false, fl);  // tabliczka HEAP z miernikiem wycieku
      us(c); c.fillStyle = ac; c.fillRect(-13, -76 * sw - 2.5, 48 * g, 5);
    }
    // 3. Race Condition: łańcuch ⇄ z iskrami między połówkami
    function drawChain(c) {
      var A = BP[0], B = BP[1], u = A.u, n, j, t2, X, Y, x0, x1, y0, y1, sg, row, sp, q, img;
      for (row = 0; row < 2; row++) {
        if (A.alive && B.alive) {
          x0 = A.x + 50 * u; x1 = B.x - 50 * u; y0 = A.y + (row ? 40 : -20) * u; y1 = B.y + (row ? 40 : -20) * u;
          n = clamp(Math.floor((x1 - x0) / (15 * u)), 2, 40); sg = (8 + (reduced ? 0 : 5 * Math.sin(BO.ph * 2 + row))) * u;
          for (j = 0; j <= n; j++) {
            t2 = j / n; X = x0 + (x1 - x0) * t2; Y = y0 + (y1 - y0) * t2 + Math.sin(t2 * Math.PI) * sg;
            c.setTransform(dpr * u, 0, 0, dpr * u, dpr * (X + shx), dpr * (Y + shy)); c.drawImage(BA.l0, -9, -9, 18, 18);
          }
          // wyścig iskier: lewa w prawo, prawa w lewo; ranna połówka biegnie szybciej
          for (sp = 0; sp < 2; sp++) {
            q = BO.ph * (0.55 + 0.5 * (1 - BP[sp].hp / BP[sp].max)) + row * 0.37;
            q -= Math.floor(q); if (sp) q = 1 - q;
            for (j = 0; j < 4; j++) {
              t2 = clamp(q - (sp ? -1 : 1) * j * 0.025, 0, 1); X = x0 + (x1 - x0) * t2; Y = y0 + (y1 - y0) * t2 + Math.sin(t2 * Math.PI) * sg;
              img = j ? (sp ? C.hot : C.solid) : C.bone;
              c.setTransform(dpr, 0, 0, dpr, dpr * (X + shx), dpr * (Y + shy)); c.fillStyle = img; c.fillRect(-(4 - j) * u, -(4 - j) * u, (8 - 2 * j) * u, (8 - 2 * j) * u);
            }
          }
        } else {                                // zerwany łańcuch zwisa z żywej połówki
          q = A.alive ? A : B; sp = A.alive ? 1 : -1;
          x0 = q.x + sp * 50 * u; y0 = q.y + (row ? 40 : -20) * u;
          for (j = 0; j < 6 - row * 2; j++) {
            X = x0 + sp * 4 * u + (reduced ? 0 : Math.sin(BO.ph * 2 + row) * j * 2 * u); Y = y0 + j * 13 * u;
            c.setTransform(0, dpr * u, -dpr * u, 0, dpr * (X + shx), dpr * (Y + shy)); c.drawImage(BA.l0, -9, -9, 18, 18);
          }
        }
      }
      base(c);
    }
    function drawRC(c, p, k, fl) {
      var b = BO, m = k ? -1 : 1, ac = ACC[b.vp - 1], j, r, ga = 1, cl, a, pr;
      if (p.hp < p.max * 0.7 && !reduced && ((b.age * 9) | 0) % 3 === 0) ga = 0.55;   // ranna połówka mruga
      c.globalAlpha = ga;
      cl = p.tele > 0 ? 1 - p.tele / p.tele0 : 0;
      a = (reduced ? 0 : Math.sin(b.ph * 2 + k) * 0.15) - cl * 0.35;
      dp(c, BA.p1, m * (50 + cl * 12), 30, m * a, m, 1, false, fl);
      dp(c, k ? BA.h2 : BA.h, 0, 0, 0, 1, 1, true, fl);
      if (p.hp < p.max * 0.55) dp(c, k ? BA.k2 : BA.k1, 0, 0, 0, 1, 1, true, false);
      us(c);
      for (j = 0; j < 8; j++) {                 // wskaźnik „wątek pracuje”: kręci się szybciej, gdy połówka jest ranna
        r = m * p.spin + j * 0.785;
        c.fillStyle = j === 0 ? C.bone : j < 3 ? ac : C.muted; c.globalAlpha = ga * (j === 0 ? 1 : 1 - j * 0.1);
        quad(c, Math.cos(r), Math.sin(r), m * -10, -24, 7, 17, 2.4);
      }
      c.globalAlpha = ga;
      c.fillStyle = p.ex ? C.bone : p.tele > 0 ? C.hot : ac; octP(c, m * -10, -24, 4, 1.4); c.fill();
      pr = b.n === 2 && BP[k ^ 1].alive ? (b.turn === k ? 1 - b.ct / RC_TURN : 0) : (p.tele > 0 ? 1 - p.tele / p.tele0 : 1 - clamp(p.cd / RC_CD, 0, 1));
      c.fillStyle = ac; c.fillRect(m * -45, -61, m * 72 * clamp(pr, 0, 1), 4);
      c.globalAlpha = 1;
    }
    // 4. Segfault Prime
    function drawSP(c, p, fl) {
      var b = BO, ph = b.ph, vp = b.phase, ac = ACC[vp - 1], a, ae, j, r, X, Y, t1 = ph * (0.7 + 0.25 * vp), t2 = -ph * (0.5 + 0.2 * vp), cwd = cellW * dpr, lhd = lh * dpr, gw, gh, px;
      ring(c, BA.p2, 0, -6, t1, 0.14, 1.12, 0.26, fl); ring(c, BA.p2, 0, -6, t2, -0.22, 0.9, 0.32, fl);
      if (vp >= 2 && b.st !== 3) {
        ae = ease3(b.armT / 0.8); a = 0.95 + (reduced ? 0 : Math.sin(ph * 1.4) * 0.12);
        dp(c, BA.p3, 124, -6, a, ae, 1, false, fl); dp(c, BA.p3, -124, -6, Math.PI - a, ae, 1, false, fl);
      }
      if (!b.d1) dp(c, BA.p1, 0, -76 - (reduced ? 0 : 3 * (0.5 + 0.5 * Math.sin(ph * 2.2))) - (vp >= 2 ? 4 : 0), 0, 1, 1, true, fl);
      dp(c, BA.h, 0, 0, 0, 1, 1, true, fl);
      if (b.hp < 67) dp(c, BA.k1, 0, 0, 0, 1, 1, true, false);
      if (b.hp < 34) dp(c, BA.k2, 0, 0, 0, 1, 1, true, false);
      us(c); c.save(); c.beginPath(); c.rect(-160, -6, 320, 140); c.clip();   // przednia połowa pierścieni
      ring(c, BA.p2, 0, -6, t1, 0.14, 1.12, 0.26, fl); ring(c, BA.p2, 0, -6, t2, -0.22, 0.9, 0.32, fl);
      c.restore();
      us(c);
      c.fillStyle = p.tele > 0 && ((b.age * 16) | 0) & 1 ? C.bone : ac;   // oczy-szczeliny
      pl(c, SP_EYL); c.fill(); pl(c, SP_EYR); c.fill();
      px = clamp((ship.x - p.x) / (p.w * 0.5), -1, 1) * 6;
      c.fillStyle = C.ink; c.fillRect(-28 + px, -13, 5, 6); c.fillRect(23 + px, -13, 5, 6);
      if (vp === 1) {                           // rdzeń zmienia kształt z każdą fazą
        c.fillStyle = ac; sqr(c, 0, -55, 12, ph * 1.4); c.fillStyle = C.ink; sqr(c, 0, -55, 7, -ph * 2); c.fillStyle = C.bone; c.fillRect(-1.5, -56.5, 3, 3);
      } else if (vp === 2) {
        r = 13 + (reduced ? 0 : 2.5 * Math.sin(ph * 4));
        c.fillStyle = ac; c.beginPath();
        for (j = 0; j < 16; j++) { a = ph * 0.8 + j * 0.3927; X = j & 1 ? 5 : r; c.lineTo(Math.cos(a) * X, -55 + Math.sin(a) * X); }
        c.closePath(); c.fill(); c.fillStyle = C.ink; octP(c, 0, -55, 3.5, 1); c.fill();
      } else {                                  // faza 3: rdzeń rozpada się na znaki
        c.strokeStyle = (((b.age * 10) | 0) & 1) && !reduced ? C.hot : C.bone; c.lineWidth = 1.6; octP(c, 0, -55, 14, 4.5); c.stroke();
        gw = cellW / TS; gh = lh / TS;
        for (j = 0; j < 14; j++) {
          a = ph * 1.6 + j * 0.449; r = 9 + 6 * Math.sin(ph * 3 + j);
          c.drawImage(atlas, ((j * 7 + ((ph * 5) | 0)) % gN) * cwd, (j & 1) * lhd, cwd, lhd, Math.cos(a) * r - gw / 2, -55 + Math.sin(a) * r * 0.8 - gh / 2, gw, gh);
        }
      }
    }
    function drawBoss(c) {
      var ty = BO.type, k, p, fl, jx, jy, a, j, bl, qx, qy, sx2, sy2, th, r;
      if (!BA || BA.ty !== ty || BO.gone) return;
      if (ty === 2) drawChain(c);
      for (k = 0; k < BO.n; k++) {
        p = BP[k];
        if (!p.alive) continue;
        fl = !reduced && (p.hit > 0 || (BO.st === 3 && ((BO.dt * 18) | 0) & 1));
        a = reduced ? 0 : BO.st === 3 ? 5 : p.hit > 0 ? 2.5 : 0;   // drżenie przy trafieniu i w trakcie śmierci
        jx = a ? rnd(-a, a) : 0; jy = a ? rnd(-a, a) * 0.6 : 0;
        setB(p.x + jx, p.y + jy, p.u);
        if (ty === 0) drawNP(c, p, fl); else if (ty === 1) drawML(c, p, fl); else if (ty === 2) drawRC(c, p, k, fl); else drawSP(c, p, fl);
      }
      base(c);
      for (k = 0; k < BO.n; k++) {
        p = BP[k];
        if (!p.alive || BO.st !== 2) continue;
        if (p.ex) {                             // odsłonięty: białe nawiasy na rogach
          bl = 16 * p.u; c.fillStyle = C.bone; th = 3;
          for (j = 0; j < 4; j++) {
            qx = j & 1 ? p.x + p.w * 0.5 : p.x - p.w * 0.5; qy = j & 2 ? p.y + p.h * 0.48 : p.y - p.h * 0.48; sx2 = j & 1 ? -1 : 1; sy2 = j & 2 ? -1 : 1;
            c.fillRect(Math.min(qx, qx + sx2 * bl), qy - (sy2 > 0 ? 0 : th), bl, th);
            c.fillRect(qx - (sx2 > 0 ? 0 : th), Math.min(qy, qy + sy2 * bl), th, bl);
          }
        }
        if (ty === 3 && BO.phase === 3) {      // tarcza fazy 3: tylko bomba w oknie ładowania
          r = BO.sub > 0 ? 1 + (reduced ? 0 : 0.02 * Math.sin(BO.age * 30)) : 1;
          c.strokeStyle = BO.sub > 0 ? C.hot : C.muted; c.lineWidth = 2;
          c.strokeRect(p.x - p.w * 0.53 * r, p.y - p.h * 0.5 * r, p.w * 1.06 * r, p.h * 1.0 * r);
          c.fillStyle = BO.sub > 0 ? C.bone : C.muted; bl = 22 * p.u;
          c.fillRect(p.x - p.w * 0.53 * r - 2, p.y - p.h * 0.5 * r - 2, bl, 5); c.fillRect(p.x + p.w * 0.53 * r - bl + 2, p.y + p.h * 0.5 * r - 3, bl, 5);
        }
      }
    }
    // wybuchy (romby), odłamki i odpadające części
    function drawFx(c) {
      var k, e, q, r, d, cs, sn;
      for (k = 0; k < DTP.length; k++) {
        d = DTP[k];
        if (d.life <= 0 || !d.pt) continue;
        cs = Math.cos(d.a) * d.S; sn = Math.sin(d.a) * d.S;
        c.globalAlpha = Math.min(1, d.life / 0.5);
        c.setTransform(dpr * cs * d.m, dpr * sn * d.m, -dpr * sn, dpr * cs, dpr * (d.x + shx), dpr * (d.y + shy));
        c.drawImage(d.pt.n, -d.pt.ax, -d.pt.ay, d.pt.w, d.pt.h);
      }
      c.globalAlpha = 1;
      for (k = 0; k < shN; k++) {
        d = SHD[k]; cs = Math.cos(d.a); sn = Math.sin(d.a);
        c.setTransform(dpr * cs, dpr * sn, -dpr * sn, dpr * cs, dpr * (d.x + shx), dpr * (d.y + shy));
        c.fillStyle = d.c; c.fillRect(-d.s / 2, -d.s * 0.3, d.s, d.s * 0.6);
      }
      for (k = 0; k < exN; k++) {
        e = EXP[k]; q = 1 - e.life / e.max; r = e.r * (0.35 + 0.95 * q);
        c.setTransform(dpr * 0.7071, dpr * 0.7071, -dpr * 0.7071, dpr * 0.7071, dpr * (e.x + shx), dpr * (e.y + shy));
        if (q < 0.35) { c.fillStyle = q < 0.12 ? C.bone : C.hot; c.fillRect(-r * 0.62, -r * 0.62, r * 1.24, r * 1.24); }
        c.strokeStyle = q < 0.5 ? C.hot : C.acc; c.lineWidth = Math.max(1, 7 * (1 - q)); c.strokeRect(-r, -r, r * 2, r * 2);
        c.fillStyle = C.bone;
        c.fillRect(-1.5, -r * 1.5, 3, r * 0.4 * (1 - q)); c.fillRect(-1.5, r * 1.1, 3, r * 0.4 * (1 - q));
        c.fillRect(-r * 1.5, -1.5, r * 0.4 * (1 - q), 3); c.fillRect(r * 1.1, -1.5, r * 0.4 * (1 - q), 3);
      }
      base(c);
    }
    // karta wejścia: wjeżdża od środka, glitch na starcie, gaśnie na końcu
    function drawCard(c) {
      var cd = BA.card, a = BO.age, il = BO.il, ch = cd.height / dpr, f = Math.min(1, a / 0.2), o = clamp((il - a) / 0.3, 0, 1), y = Math.round(H * 0.6 - ch / 2),
        w = W * f, x0 = (W - w) / 2, j, y0, y1;
      if (w < 2) return;
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.globalAlpha = o;
      if (reduced || glA <= 0) c.drawImage(cd, x0 * dpr, 0, w * dpr, cd.height, x0, y, w, ch);
      else for (j = 0; j < 5; j++) {
        y0 = GLY[j]; y1 = GLY[j + 1];
        c.drawImage(cd, x0 * dpr, y0 * cd.height, w * dpr, (y1 - y0) * cd.height, x0 + GLX[j] * W * 0.4, y + y0 * ch, w, (y1 - y0) * ch);
      }
      c.globalAlpha = 1;
    }
    // telegrafy: pasy ostrzegawcze, zamykające się kontury, celownik
    function chev(c, x, y, s) {
      c.beginPath(); c.moveTo(x - s, y - s); c.lineTo(x - s * 0.4, y - s); c.lineTo(x + s * 0.6, y); c.lineTo(x - s * 0.4, y + s); c.lineTo(x - s, y + s); c.lineTo(x, y); c.closePath(); c.fill();
    }
    function reticle(c, x, y, r, col) {
      var l = Math.max(7, r * 0.45), t = 3;
      c.fillStyle = col;
      c.fillRect(x - r, y - r, l, t); c.fillRect(x - r, y - r, t, l); c.fillRect(x + r - l, y - r, l, t); c.fillRect(x + r - t, y - r, t, l);
      c.fillRect(x - r, y + r - t, l, t); c.fillRect(x - r, y + r - l, t, l); c.fillRect(x + r - l, y + r - t, l, t); c.fillRect(x + r - t, y + r - l, t, l);
      c.fillRect(x - 1, y - 6, 2, 12); c.fillRect(x - 6, y - 1, 12, 2);
    }
    function drawTele(c) {
      var k, p, j, a, ca, sa, x0, y0, pr, hw, n, x, w, bl = reduced ? 1 : ((BO.age * 16) | 0) & 1, rows, yy, sd;
      for (k = 0; k < BO.n; k++) {
        p = BP[k];
        if (!p.alive || p.tele <= 0) continue;
        pr = 1 - p.tele / p.tele0;
        if (p.kind === 1 || p.kind === 4) {
          x0 = p.x; y0 = p.y + ORY[BO.type] * p.h;
          for (j = p.kind === 4 ? -1 : 0; j <= (p.kind === 4 ? 1 : 0); j++) {
            a = Math.atan2(p.ty - y0, p.tx - x0) + j * 0.3; ca = Math.cos(a); sa = Math.sin(a); hw = (24 - 17 * pr) * s0;
            c.setTransform(dpr * ca, dpr * sa, -dpr * sa, dpr * ca, dpr * (x0 + shx), dpr * (y0 + shy));
            c.globalAlpha = 0.2 + 0.35 * pr; c.fillStyle = haz; c.fillRect(0, -hw, 1800, hw * 2);
            c.globalAlpha = 1; c.fillStyle = C.hot; c.fillRect(0, -hw - 2, 1800, 2); c.fillRect(0, hw, 1800, 2);
            c.fillStyle = bl ? C.bone : C.label;
            for (n = 0; n < 12; n++) chev(c, 34 + n * 46 + pr * 46, 0, 6 * s0);
          }
          base(c);
          reticle(c, p.tx, p.ty, (54 - 36 * pr) * s0, bl ? C.bone : C.hot);
        } else if (p.kind === 2) {
          for (j = 0; j < RN; j++) {
            x = RX[j]; w = spr[RK[j]].w;
            c.globalAlpha = 0.16 + 0.3 * pr; c.fillStyle = haz; c.fillRect(x, 0, w, H);
            c.globalAlpha = 1; c.fillStyle = C.hot; c.fillRect(x, 0, 2, H); c.fillRect(x + w - 2, 0, 2, H);
            sd = (1 - pr) * 12; c.strokeStyle = bl ? C.bone : C.hot; c.lineWidth = 2; c.strokeRect(x - sd, 2, w + sd * 2, lh + sd * 0.6);
            c.setTransform(0, dpr, -dpr, 0, dpr * (x + w / 2 + shx), dpr * shy);
            c.fillStyle = bl ? C.bone : C.label;
            for (n = 0; n < 3; n++) chev(c, lh + 20 + n * 18 + pr * 18, 0, 7);
            base(c);
          }
        } else if (p.kind === 3) {
          rows = BO.fast > 1 ? 2 : 1;
          for (j = 0; j < rows; j++) {
            yy = clamp(p.ty - j * 46 * s0, 20, H - 20); hw = (28 - 19 * pr) * s0;
            c.globalAlpha = 0.22 + 0.35 * pr; c.fillStyle = haz; c.fillRect(0, yy - hw, W, hw * 2);
            c.globalAlpha = 1; c.fillStyle = C.hot; c.fillRect(0, yy - hw - 2, W, 2); c.fillRect(0, yy + hw, W, 2);
            c.setTransform(dpr * p.side, 0, 0, dpr, dpr * ((p.side > 0 ? 0 : W) + shx), dpr * shy);
            c.fillStyle = bl ? C.bone : C.label;
            for (n = 0; n < W / 60; n++) chev(c, 20 + n * 60 + pr * 60, yy, 8 * s0);
            base(c);
          }
        }
      }
      if (BO.type === 3 && BO.phase === 3 && BO.sub > 0 && BO.st === 2) {   // pas bezpieczny przed zrzutem „core dump”
        p = BP[0]; x0 = BO.lane - BO.laneW / 2; x = BO.lane + BO.laneW / 2;
        c.globalAlpha = BO.sub === 2 ? 0.45 : 0.22; c.fillStyle = haz; c.fillRect(0, 0, x0, H); c.fillRect(x, 0, W - x, H);
        c.globalAlpha = 1; c.strokeStyle = C.bone; c.lineWidth = 2; c.strokeRect(x0, 0, BO.laneW, H);
        c.font = '500 9px ' + MONO; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = C.bone; c.fillText('BEZPIECZNY', BO.lane, H * 0.62);
        c.fillStyle = C.hot; c.fillRect(x0, 0, BO.laneW * clamp(BO.sub === 1 ? BO.ct / 1.2 : BO.ct / 0.5, 0, 1), 5);
        a = BO.sub === 1 ? 1 + 0.6 * (BO.ct / 1.2) : 1;
        c.strokeStyle = C.hot; c.lineWidth = 2; c.strokeRect(p.x - p.w * 0.5 * a, p.y - p.h * 0.45 * a, p.w * a, p.h * 0.9 * a);
      }
    }

    function draw() {
      if (dead || !W) return;
      var c = ctx, k, o, p, f, sp, a;
      shx = shy = 0;
      if (shake > 0) { a = 6 * shake / 0.3; shx = rnd(-a, a); shy = rnd(-a, a); }
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.globalAlpha = 1;
      c.fillStyle = C.ink; c.fillRect(0, 0, W, H);
      base(c);

      c.drawImage(city, -cityOff, H - cityH, cityP, cityH);
      c.drawImage(city, cityP - cityOff, H - cityH, cityP, cityH);
      for (a = 1; a >= 0; a--) {
        c.fillStyle = a ? C.cloudFar : C.cloudNear;
        for (k = 0; k < clouds.length; k++) {
          o = clouds[k];
          if (o.far !== !!a) continue;
          c.fillRect(o.x, o.y, o.w, o.h);
          c.fillRect(o.x + o.o, o.y + o.h, o.w * o.sw, 2);
          c.fillRect(o.x - o.o * 0.6, o.y - 2, o.w * 0.3, 2);
        }
      }

      if (BO.on && BO.st === 1) {                // wejście bossa: ekran ciemnieje
        c.globalAlpha = 0.62 * Math.min(1, BO.age / 0.2) * clamp((BO.il - BO.age) / 0.35, 0, 1); c.fillStyle = C.ink; c.fillRect(-10, -10, W + 20, H + 20); c.globalAlpha = 1;
      }
      if (BO.on && BO.st >= 1) { drawBoss(c); if (BO.st === 2) drawTele(c); }
      for (k = 0; k < obN; k++) {
        o = OB[k]; sp = spr[o.k];
        c.drawImage(o.hv ? sp.b : sp.n, o.x, o.y, o.w, o.h);
        if (o.hv && mode === 'ogien') { c.fillStyle = C.bone; for (a = 0; a < o.hp; a++) c.fillRect(o.x + o.w - 5, o.y + 3 + a * 5, 3, 3); }
        if (o.hit > 0) { c.strokeStyle = C.bone; c.lineWidth = 2; c.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2); }
      }
      for (k = 0; k < prN; k++) {
        p = PR[k]; sp = pj[p.g];
        a = Math.cos(p.rot); f = Math.sin(p.rot);
        c.setTransform(dpr * a, dpr * f, -dpr * f, dpr * a, dpr * (p.x + shx), dpr * (p.y + shy));
        c.drawImage(sp.c, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
      }
      base(c);
      if (blN) {
        c.fillStyle = C.hot;
        for (k = 0; k < blN; k++) c.fillRect(BL[k].x - 1, BL[k].y, 2, 9);
      }
      if (state !== 'dying' && state !== 'over') drawShip(c, ship.x, ship.y, s0);

      if (ptN) {
        var cwd = cellW * dpr, lhd = lh * dpr;
        for (k = 0; k < ptN; k++) {
          p = PT[k];
          c.globalAlpha = p.life / p.max;
          c.drawImage(atlas, p.g * cwd, p.r * lhd, cwd, lhd, p.x, p.y, cellW, lh);
        }
        c.globalAlpha = 1;
      }
      if (exN || shN || DTP[0].life > 0 || DTP[1].life > 0 || DTP[2].life > 0 || DTP[3].life > 0 || DTP[4].life > 0 || DTP[5].life > 0) drawFx(c);
      if (BO.on && BO.st === 1 && BA) drawCard(c);

      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (flN) {
        c.font = '500 11px ' + MONO; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = C.label;
        for (k = 0; k < flN; k++) {
          f = FL[k];
          c.globalAlpha = Math.min(1, f.life / 0.3);
          c.fillText(f.txt, f.x, f.y);
        }
        c.globalAlpha = 1;
      }
      if (banner > 0 && state !== 'start') {
        c.globalAlpha = Math.min(1, banner / 0.4);
        c.font = '500 12px ' + MONO; c.textAlign = 'center'; c.textBaseline = 'middle';
        if (!bannerW) bannerW = c.measureText(bannerTxt).width;
        var by = Math.round(H * 0.3);
        c.fillStyle = C.bar; c.fillRect(W / 2 - bannerW / 2 - 12, by - 13, bannerW + 24, 26);
        c.fillStyle = C.acc; c.fillRect(W / 2 - bannerW / 2 - 12, by - 13, 2, 26);
        c.fillStyle = C.label; c.fillText(bannerTxt, W / 2, by + 1);
        c.globalAlpha = 1;
      }
      if (flash > 0) {
        p = flash / FLASH;
        c.globalAlpha = 0.3 * p; c.fillStyle = C.acc; c.fillRect(0, 0, W, H);
        c.globalAlpha = 0.75 * p; c.fillStyle = C.cyan;
        for (k = 0; k < 6; k++) c.fillRect((k & 1 ? 12 : -12) * p, H * (0.08 + k * 0.16), W, 3 + (k % 3) * 5);
        c.globalAlpha = 1;
      }
      if (state !== 'start') hud(c);
    }

    // --- pętla: jedna, tylko gdy gra biegnie ---
    function frame(now) {
      raf = 0;
      if (dead || (state !== 'play' && state !== 'dying')) return;
      var dt = (now - last) / 1000;
      last = now;
      if (dt > 0.05) dt = 0.05; else if (dt < 0) dt = 0;
      update(dt);
      draw();
      if (!dead && (state === 'play' || state === 'dying')) raf = win.requestAnimationFrame(frame);
    }
    function startLoop() { if (!raf && !dead) { last = win.performance.now(); raf = win.requestAnimationFrame(frame); } }
    function stopLoop() { if (raf) { win.cancelAnimationFrame(raf); raf = 0; } }

    // --- ekrany ---
    function best(m) { return Math.max(load(KEYP + m), mem[m]); }
    function setBanner() { showBanner(waveName(wave)); hudWave = 'FALA ' + wave; }
    function ui() {
      bPause.hidden = state !== 'play';
      bBomb.hidden = !(touch && state === 'play');
      bBombT.textContent = '×' + bombs;
      bBomb.setAttribute('aria-label', 'Bomba, zostało ' + bombs);
      bBomb.disabled = bombs <= 0;
    }
    function setMode(m) {
      mode = m === 'ogien' ? 'ogien' : 'unik';
      var bs2 = root.querySelectorAll('[data-m]');
      for (var k = 0; k < bs2.length; k++) bs2[k].setAttribute('aria-pressed', String(bs2[k].getAttribute('data-m') === mode));
      q('.dcg-md').textContent = TRYBY[mode];
      recNow = best(mode); q('.dcg-rec span').textContent = 'rekord: ' + recNow;
    }
    function focusIn(sel) { var b = q(sel); if (b) try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } }

    function start(retry) {
      ovStart.hidden = ovPause.hidden = ovOver.hidden = ovMerge.hidden = ovPick.hidden = true;
      reduced = !!(mq && mq.matches);
      go('play');
      obN = ptN = blN = flN = prN = exN = shN = 0;
      for (i = 0; i < DTP.length; i++) DTP[i].life = 0;
      BO.on = false; BO.st = 0; slowT = 0; invul = 0; shipShake = 0; diedBoss = false;
      grace = 0; fireT = 0.3; flash = shake = 0; tilt = 0; tb = -1;
      if (retry && cp) {
        score = cp.score; bombs = Math.max(cp.bombs, 2); wave = cp.wave; waveT = cp.waveT; t = cp.t; nextBomb = cp.nb; step = cp.step;
        for (i in cp.up) up[i] = cp.up[i];
        shieldOn = cp.sh; bossTier = cp.tier; nextBossT = cp.nbt;
      } else {
        t = 0; waveT = 0; score = 0; wave = 1; bombs = 1; nextBomb = 1000; step = 1000; bossTier = 0; nextBossT = BOSS1_S; grazeN = 0; cp = null;
        for (i in up) up[i] = 0;
        shieldOn = false; earned[0] = earned[1] = earned[2] = earned[3] = 0; grazeBonus = 25; grazeTxt = '+25 muśnięcie';
        if (testTier >= 0) tb = 2;
        if (testUps) testUps.split(',').forEach(applyUp);
      }
      spawnT = 0.5;
      setBanner(); banner = 1.8; hudScore = -1;
      ship.x = W / 2; ship.y = H * 0.78; ship.vx = ship.vy = 0;
      keys.l = keys.r = keys.u = keys.d = 0; drag.on = false;
      live.textContent = '';
      ensureArt((retry && cp ? bossTier : testTier >= 0 ? testTier : bossTier) % 4);   // części bossa budujemy przed pętlą
      if (retry && cp) { bossStart(); bossTier++; }   // ten sam boss od początku
      else tag();
      ui();
      try { root.focus({ preventScroll: true }); } catch (e) { root.focus(); }
      if (snd) audio();
      startLoop();
    }
    function pause() {
      if (state !== 'play') return;
      go('pause'); stopLoop();
      keys.l = keys.r = keys.u = keys.d = 0; drag.on = false;
      ui(); draw();
      ovPause.hidden = false; focusIn('[data-a=resume]');
    }
    function resume() {
      if (state !== 'pause') return;
      ovPause.hidden = true; go('play'); ui();
      try { root.focus({ preventScroll: true }); } catch (e) { root.focus(); }
      startLoop();
    }
    function gameOver() {
      go('over'); stopLoop(); ui(); draw();
      overAt = win.performance.now();
      var sc = Math.floor(score), b = best(mode), nowy = sc > b, h = '', k;
      if (nowy) { b = sc; mem[mode] = sc; save(KEYP + mode, sc); }
      recNow = b;
      q('.dcg-why').textContent = 'core dumped · ' + (diedBoss ? 'boss: ' + BN[BO.type] : waveName(wave));
      q('.dcg-sc').textContent = String(sc);
      q('.dcg-best span').textContent = (nowy && sc > 0 ? 'nowy rekord! ' : 'rekord: ') + b + ' · tryb ' + (mode === 'ogien' ? 'ogień' : 'unik');
      for (k = 0; k < 4; k++) if (earned[k]) h += ibtn('b' + (k + 1), 22, 'l', 1);
      q('.dcg-bd').innerHTML = h ? h + '<span>odznaki</span>' : '';
      q('[data-a=retry]').hidden = !(diedBoss && cp);
      paintIcons(ovOver);
      ovOver.hidden = false;
      live.textContent = 'Segfault. Wynik ' + sc + '. ' + (nowy && sc > 0 ? 'Nowy rekord.' : 'Rekord ' + b + '.');
      focusIn('[data-a=again]');
    }
    function exit() {
      stopLoop();
      if (typeof opts.onExit === 'function') { opts.onExit(); if (dead) return; }
      go('start'); ovPause.hidden = ovOver.hidden = ovMerge.hidden = ovPick.hidden = true; ovStart.hidden = false;
      ship.x = W / 2; ship.y = H * 0.78; obN = ptN = blN = flN = prN = exN = shN = 0; flash = shake = 0; BO.on = false; BO.st = 0; tag();
      setMode(mode); ui(); draw(); focusIn('[data-a=start]');
    }

    // --- wejście ---
    function setKey(k, v) {
      switch (k) {
        case 'ArrowLeft': case 'Left': case 'a': case 'A': keys.l = v; return true;
        case 'ArrowRight': case 'Right': case 'd': case 'D': keys.r = v; return true;
        case 'ArrowUp': case 'Up': case 'w': case 'W': keys.u = v; return true;
        case 'ArrowDown': case 'Down': case 's': case 'S': keys.d = v; return true;
      }
      return false;
    }
    function mine() { var a = doc.activeElement; return !a || a === doc.body || root.contains(a); }
    function onKey(e) {
      if (dead || !mine() || e.ctrlKey || e.metaKey || e.altKey) return;
      var k = e.key, cd;
      if (state === 'play') {
        if (setKey(k, 1)) e.preventDefault();
        else if (k === ' ' || k === 'Spacebar') { if (!e.repeat) bomb(); e.preventDefault(); }
        else if (k === 'Escape' || k === 'p' || k === 'P') { pause(); e.preventDefault(); }
      } else if (state === 'pause' && (k === 'Escape' || k === 'p' || k === 'P')) { resume(); e.preventDefault(); }
      else if (state === 'pick' && (k === '1' || k === '2' || k === '3')) {
        cd = q('.dcg-cards').children[+k - 1];
        if (cd) { applyUp(cd.getAttribute('data-u')); resumeAfterBoss(); e.preventDefault(); }
      }
    }
    function onKeyUp(e) { setKey(e.key, 0); }
    function onBlur() { keys.l = keys.r = keys.u = keys.d = 0; pause(); }
    function onVis() { if (doc.hidden) pause(); }
    function onMq() { reduced = !!(mq && mq.matches); }
    function onClick(e) {
      var b = e.target && e.target.closest ? e.target.closest('button') : null, a, sp;
      if (!b || !root.contains(b) || b === bBomb) return;
      if (b.getAttribute('data-m')) { setMode(b.getAttribute('data-m')); return; }
      if (b.getAttribute('data-u')) { if (state === 'pick') { applyUp(b.getAttribute('data-u')); resumeAfterBoss(); } return; }
      a = b.getAttribute('data-a');
      // spacja wciśnięta na bombę w chwili zderzenia nie może od razu restartować rundy
      if ((a === 'again' || a === 'retry') && win.performance.now() - overAt < 450) return;
      if (a === 'start' || a === 'again') start(false);
      else if (a === 'retry') start(true);
      else if (a === 'next') pickScreen();
      else if (a === 'resume') resume();
      else if (a === 'pause') pause();
      else if (a === 'exit') exit();
      else if (a === 'snd') {
        snd = !snd;
        b.setAttribute('aria-pressed', String(snd));
        b.setAttribute('aria-label', 'Dźwięk: ' + (snd ? 'wł.' : 'wył.'));
        b.querySelector('span').textContent = 'Dźwięk: ' + (snd ? 'wł.' : 'wył.');
        sp = b.querySelector('canvas'); sp.setAttribute('data-i', snd ? 'sound' : 'mute'); paintIcons(b);
        if (snd) audio(); else if (ac && ac.suspend) ac.suspend();
      }
    }
    function onBomb(e) { e.preventDefault(); bomb(); }
    function pDown(e) {
      if (e.pointerType === 'touch' && !touch) { touch = true; ui(); }
      if (state !== 'play' || drag.on) return;
      drag.on = true; drag.id = e.pointerId;
      drag.px = e.clientX; drag.py = e.clientY;
      drag.sx = drag.tx = ship.x; drag.sy = drag.ty = ship.y;
      try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ok */ }
      e.preventDefault();
    }
    function pMove(e) {
      if (!drag.on || e.pointerId !== drag.id) return;
      var mx = 11 * s0, tx = drag.sx + e.clientX - drag.px, ty = drag.sy + e.clientY - drag.py;
      var cx = clamp(tx, mx, W - mx), cy = clamp(ty, 14 * s0, H - 20 * s0);
      // przy krawędzi przesuwamy kotwicę, żeby powrót palca od razu ruszał statkiem
      if (cx !== tx) { drag.sx = cx; drag.px = e.clientX; }
      if (cy !== ty) { drag.sy = cy; drag.py = e.clientY; }
      drag.tx = cx; drag.ty = cy;
    }
    function pUp(e) { if (drag.on && e.pointerId === drag.id) { drag.on = false; ship.vx = ship.vy = 0; } }

    win.addEventListener('keydown', onKey);
    win.addEventListener('keyup', onKeyUp);
    win.addEventListener('blur', onBlur);
    doc.addEventListener('visibilitychange', onVis);
    root.addEventListener('click', onClick);
    bBomb.addEventListener('pointerdown', onBomb);
    cv.addEventListener('pointerdown', pDown);
    cv.addEventListener('pointermove', pMove);
    cv.addEventListener('pointerup', pUp);
    cv.addEventListener('pointercancel', pUp);
    if (mq) { if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq); }
    var ro = null;
    if (win.ResizeObserver) { ro = new win.ResizeObserver(resize); ro.observe(root); } else win.addEventListener('resize', resize);

    // fonty z Google Fonts mogą dojść później: wtedy jeden raz przerysowujemy linijki
    if (doc.fonts && doc.fonts.load) {
      Promise.all([doc.fonts.load('400 13px "Geist Mono"'), doc.fonts.load('700 13px "Geist Mono"')]).then(function () {
        if (!dead && atlas) { buildSprites(); elig(); if (BA) { i = BA.ty; BA = null; ensureArt(i); } if (!raf) draw(); }
      }, function () { /* zostaje monospace */ });
    }

    paintIcons(root);
    go('start');
    setMode(mode);
    resize();
    ui();
    focusIn('[data-a=start]');

    function destroy() {
      if (dead) return;
      dead = true;
      stopLoop();
      win.removeEventListener('keydown', onKey);
      win.removeEventListener('keyup', onKeyUp);
      win.removeEventListener('blur', onBlur);
      doc.removeEventListener('visibilitychange', onVis);
      root.removeEventListener('click', onClick);
      bBomb.removeEventListener('pointerdown', onBomb);
      cv.removeEventListener('pointerdown', pDown);
      cv.removeEventListener('pointermove', pMove);
      cv.removeEventListener('pointerup', pUp);
      cv.removeEventListener('pointercancel', pUp);
      if (mq) { if (mq.removeEventListener) mq.removeEventListener('change', onMq); else if (mq.removeListener) mq.removeListener(onMq); }
      if (ro) ro.disconnect(); else win.removeEventListener('resize', resize);
      if (ac) { try { ac.close(); } catch (e) { /* ok */ } ac = null; }
      if (root.parentNode) root.parentNode.removeChild(root);
      if (!--cssRef && cssEl) { if (cssEl.parentNode) cssEl.parentNode.removeChild(cssEl); cssEl = null; }
      spr = []; atlas = city = null; clouds = []; pj = []; BA = null; haz = null;
    }

    // podgląd stanu dla testów (nie jest potrzebny do gry)
    function snap() {
      var p = BP[0];
      return { state: state, mode: mode, score: Math.floor(score), bombs: bombs, wave: wave, shield: shieldOn, up: up, ship: { x: ship.x, y: ship.y },
        boss: BO.on ? { name: BN[BO.type], type: BO.type, hp: BO.hp, st: BO.st, phase: BO.phase, x: p.x, y: p.y, w: p.w, ex: p.ex, mode: BO.mode, n: BO.n,
          alive: [BP[0].alive, BP[1].alive], x2: BP[1].x, sub: BO.sub, lane: BO.lane, laneW: BO.laneW, tele: p.tele, hit: BP[0].hit + BP[1].hit,
          vp: BO.vp, age: BO.age, il: BO.il, dt: BO.dt, gone: BO.gone, h: p.h } : null, t: t, waveT: waveT, nextBoss: nextBossT };
    }
    return { destroy: destroy, state: snap };
  }

  G.DancyCloud = { mount: mount, version: '3.0.0', icons: { names: INAMES, canvas: iconCanvas } };
})(typeof window !== 'undefined' ? window : this);
