/*! DancyCloud 5.0.0 — gra do terminala SORA//OS (cybersora.pl). Czysty JS + Canvas 2D, bez bibliotek.
 *  API: window.DancyCloud.mount(element, { onExit, onRunStart, onRunEnd }) -> { destroy(), showRank() }; DancyCloud.icons (zestaw ikon)
 *  Plik zbudowany z src/ (npm run build). Nie edytuj ręcznie. */
(() => {
  // src/silnik/global.js
  var G = typeof window !== "undefined" ? window : globalThis;

  // src/silnik/kolory.js
  var C = {
    ink: "#0e0e12",
    acc: "#e11d33",
    hot: "#ff3a52",
    solid: "#d4132b",
    label: "#ff6b7d",
    muted: "#9a9098",
    bone: "#f6f2f3",
    cyan: "rgba(246,242,243,.85)",
    // nazwa historyczna: błysk bomby, teraz kość
    panel: "#18181b",
    line: "#28282c",
    bar: "#1d0f14",
    cloudFar: "#131317",
    cloudNear: "#1f1f23",
    city: "#2e1017",
    // v4: głębia z tej samej reguły (ink + biel 16% / 9%, ink + karmazyn 25%)
    hull: "#353538",
    plate: "#242427",
    deep: "#43121a",
    // kolory naszych (rakieta, zasoby gracza, fokus GUI): 7.10 maisa — bez cyjanu, karmazyn cybersory
    ally: "#ff3a52",
    allyDeep: "#e11d33",
    allyDark: "#43121a"
  };
  var COL = { l: C.label, b: C.bone, h: C.hot, m: C.muted, y: C.ally, k: C.ink };
  var MONO = '"Geist Mono", ui-monospace, Consolas, monospace';
  var SANS = "'Sora', system-ui, Arial, sans-serif";

  // src/ikony/ikony.js
  function CR(x, y, w, h, k) {
    return [x, y, x + w - k, y, x + w, y + k, x + w, y + h, x + k, y + h, x, y + h - k];
  }
  function SPK(cx, cy, r1, r2, n) {
    var a = [], i, r;
    for (i = 0; i < n * 2; i++) {
      r = i & 1 ? r2 : r1;
      a.push(cx + r * Math.sin(i * Math.PI / n), cy - r * Math.cos(i * Math.PI / n));
    }
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
    // v4.1: miniatury nowych sylwetek. b1 grot z okiem i płetwami, b2 masa komórek wylewająca się z kleszczy z kroplami,
    // b3 smukła i ciężka połówka spięte łańcuchem, b4 głowa w koronie ze skośnymi oczami i zębami, z ostrzami skrzydeł
    b1: [[0, [1, 3, 6, 1, 8, 4, 16, 4, 18, 1, 23, 3, 18, 9, 15, 12, 12, 23, 9, 12, 6, 9]], [1, [9.5, 5.5, 14.5, 5.5, 16, 7.5, 16, 9.5, 14.5, 11, 9.5, 11, 8, 9.5, 8, 7.5]], [0, [11, 7, 13, 7, 13, 9.5, 11, 9.5]]],
    b2: [
      [0, [2, 2, 8, 2, 10, 5, 6, 4, 4, 6, 4, 14, 6, 16, 10, 15, 8, 18, 2, 18, 1, 10]],
      [0, [22, 2, 16, 2, 14, 5, 18, 4, 20, 6, 20, 14, 18, 16, 14, 15, 16, 18, 22, 18, 23, 10]],
      [0, CR(7, 6, 4, 4, 1)],
      [0, CR(11.5, 5, 4, 4, 1)],
      [0, CR(8.5, 10.5, 5, 4.5, 1)],
      [0, CR(14, 9.5, 4, 4, 1)],
      [0, CR(0, 12, 3, 3, 0.8)],
      [0, CR(21, 6, 3, 3, 0.8)],
      [0, [10.5, 15, 11.5, 15, 11.5, 17.5, 10.5, 17.5]],
      [0, CR(9.5, 17.5, 3, 2.5, 0.6)],
      [0, CR(10, 21, 2, 2, 0.5)],
      [0, CR(15, 14, 2, 2.5, 0.5)]
    ],
    b3: [
      [0, [1, 5, 7, 2, 9, 4, 8, 20, 4, 22, 2, 20, 4, 12]],
      [0, [14, 3, 21, 3, 23, 1, 24, 7, 22, 9, 23, 19, 20, 22, 14, 22, 13, 19, 13, 6]],
      [1, [4.5, 7, 7, 6.5, 7, 8.5, 4.5, 9]],
      [1, [16, 7, 19, 7, 19, 10, 16, 10]],
      [0, [8, 9.5, 10.5, 9.5, 10.5, 11.5, 8, 11.5]],
      [0, [11, 12, 13.5, 12, 13.5, 14, 11, 14]]
    ],
    b4: [
      [0, [4, 10, 5, 6, 7, 8, 8.5, 3, 10.5, 7, 12, 0.5, 13.5, 7, 15.5, 3, 17, 8, 19, 6, 20, 10, 20, 15, 18, 19, 18, 22, 6, 22, 6, 19, 4, 15]],
      [0, [4, 11, 0, 7, 1, 13, 4, 16]],
      [0, [20, 11, 24, 7, 23, 13, 20, 16]],
      [1, [5.5, 11, 10.5, 13, 10.5, 14.5, 5.5, 12.8]],
      [1, [18.5, 11, 13.5, 13, 13.5, 14.5, 18.5, 12.8]],
      [1, [7.5, 17, 16.5, 17, 15.5, 19, 14.5, 17.8, 13.3, 19.5, 12, 17.8, 10.7, 19.5, 9.5, 17.8, 8.5, 19]]
    ],
    slow: [[0, [5, 3, 19, 3, 19, 6, 14, 12, 19, 18, 19, 21, 5, 21, 5, 18, 10, 12, 5, 6]], [1, [8, 6, 16, 6, 12, 10]]],
    agile: [[0, [3, 5, 8, 5, 14, 12, 8, 19, 3, 19, 9, 12]], [0, [11, 5, 16, 5, 22, 12, 16, 19, 11, 19, 17, 12]]],
    power: [[0, SPK(12, 12, 11, 5, 8)], [1, [10, 10, 14, 10, 14, 14, 10, 14]]],
    cache: [[0, CR(3, 6, 18, 15, 4)], [1, [6, 10, 18, 10, 18, 12, 6, 12]], [1, [10, 15, 14, 15, 14, 18, 10, 18]]],
    // etap 1: kłódka (zablokowany tryb) i mob (kolczasta mina z okiem)
    lock: [[0, CR(4, 10, 16, 12, 3)], [0, [6, 10, 6, 6, 9, 2, 15, 2, 18, 6, 18, 10, 15, 10, 15, 7, 14, 5, 10, 5, 9, 7, 9, 10]], [1, [11, 13, 13, 13, 13, 19, 11, 19]]],
    mob: [[0, SPK(12, 12, 11.5, 7.5, 8)], [1, [10, 8, 14, 8, 16, 10, 16, 14, 14, 16, 10, 16, 8, 14, 8, 10]], [0, [11, 10.5, 13, 10.5, 13.5, 11, 13.5, 13, 13, 13.5, 11, 13.5, 10.5, 13, 10.5, 11]]],
    // etap 1b: kredyt ₡ (żeton), pancerz (trzy płyty), magnes (zasięg zbierania), pocisk (moc pocisku), hangar (wrota), skórka (pędzel w pasy)
    kr: [[0, [7, 2, 17, 2, 22, 7, 22, 17, 17, 22, 7, 22, 2, 17, 2, 7]], [1, [8, 6, 16, 6, 16, 9, 11, 9, 11, 15, 16, 15, 16, 18, 8, 18]], [0, [12, 3.5, 13.5, 3.5, 13.5, 20.5, 12, 20.5]]],
    armor: [[0, [3, 3, 19, 3, 21, 5, 21, 8, 3, 8]], [0, [3, 10, 21, 10, 21, 15, 3, 15]], [0, [3, 17, 21, 17, 21, 19, 19, 21, 3, 21]], [1, [10, 5, 14, 5, 14, 6.5, 10, 6.5]]],
    engine: [[0, [8, 3, 16, 3, 16, 8, 19, 13, 5, 13, 8, 8]], [0, [6, 14, 18, 14, 18, 15, 6, 15]], [1, [8, 16, 16, 16, 14, 19, 12, 22, 10, 19]]],
    magnet: [[0, [3, 3, 9, 3, 9, 13, 10, 15, 14, 15, 15, 13, 15, 3, 21, 3, 21, 14, 17, 20, 7, 20, 3, 14]], [1, [3, 6, 9, 6, 9, 8, 3, 8]], [1, [15, 6, 21, 6, 21, 8, 15, 8]]],
    dmg: [[0, [10, 22, 10, 9, 12, 2, 14, 9, 14, 22]], [0, [4, 13, 8, 13, 8, 15, 4, 15]], [0, [16, 13, 20, 13, 20, 15, 16, 15]], [0, [5, 6, 8, 9, 7, 10, 4, 7]], [0, [19, 6, 20, 7, 17, 10, 16, 9]]],
    hangar: [[0, [2, 9, 12, 2, 22, 9, 22, 22, 2, 22]], [1, [6, 11, 18, 11, 18, 22, 6, 22]], [0, [8, 13, 16, 13, 16, 15, 8, 15]], [0, [8, 17, 16, 17, 16, 19, 8, 19]]],
    // etap 2b: przebicie (pocisk przez płytę), strzał boczny, laser ładowany, odłamki, skrzynka, moduł, synergia, odłamek modułu
    pierce: [[0, [3, 8, 9, 8, 9, 16, 3, 16]], [0, [11, 3, 14, 3, 14, 21, 11, 21]], [1, [11.5, 10.5, 13.5, 10.5, 13.5, 13.5, 11.5, 13.5]], [0, [16, 10.5, 19, 10.5, 19, 8, 23, 12, 19, 16, 19, 13.5, 16, 13.5]], [0, [5, 10.5, 9, 10.5, 9, 13.5, 5, 13.5]]],
    side: [[0, [10.5, 22, 10.5, 9, 12, 3, 13.5, 9, 13.5, 22]], [0, [2, 19, 5, 9, 8, 6, 8, 12, 4.5, 20]], [0, [22, 19, 19, 9, 16, 6, 16, 12, 19.5, 20]]],
    laser: [[0, CR(3, 15, 8, 7, 2)], [0, [5, 5, 9, 5, 9, 15, 5, 15]], [0, [13, 9, 22, 9, 22, 12, 13, 12]], [0, [12, 13.5, 20, 13.5, 20, 15, 12, 15]], [1, [5, 17, 9, 17, 9, 19, 5, 19]]],
    shrap: [[0, [9, 22, 9, 12, 12, 7, 15, 12, 15, 22]], [0, [3, 8, 6, 3, 9, 6, 6, 9]], [0, [18, 6, 21, 3, 22, 8, 19, 9]], [0, [11, 3, 13, 1, 14, 4, 12, 5]]],
    crate: [[0, CR(2, 6, 20, 16, 4)], [1, [4, 11, 20, 11, 20, 12.5, 4, 12.5]], [0, [6, 2, 18, 2, 20, 6, 4, 6]], [1, [10, 14, 14, 14, 14, 16, 12.5, 16, 12.5, 17.5, 10, 17.5]], [1, [11, 18.5, 12.5, 18.5, 12.5, 20, 11, 20]]],
    module: [[0, CR(5, 5, 14, 14, 3)], [1, CR(8, 8, 8, 8, 2)], [0, [10, 10, 14, 10, 14, 14, 10, 14]], [0, [7, 1, 9, 1, 9, 5, 7, 5]], [0, [15, 1, 17, 1, 17, 5, 15, 5]], [0, [7, 19, 9, 19, 9, 23, 7, 23]], [0, [15, 19, 17, 19, 17, 23, 15, 23]], [0, [1, 11, 5, 11, 5, 13, 1, 13]], [0, [19, 11, 23, 11, 23, 13, 19, 13]]],
    syn: [[0, CR(1, 4, 10, 10, 2)], [0, CR(13, 10, 10, 10, 2)], [1, CR(4, 7, 4, 4, 1)], [1, CR(16, 13, 4, 4, 1)], [0, [9, 11, 15, 11, 15, 13, 9, 13]]],
    shard: [[0, [12, 2, 20, 10, 12, 22, 4, 10]], [1, [12, 6, 16, 10, 12, 17, 8, 10]]],
    skin: [[0, [3, 3, 17, 3, 21, 7, 21, 11, 3, 11]], [1, [7, 5, 9, 5, 9, 9, 7, 9]], [1, [12, 5, 14, 5, 14, 9, 12, 9]], [0, [10, 11, 14, 11, 14, 21, 12, 23, 10, 21]]]
  };
  var INAMES = ["bomb", "shield", "auto", "graze", "record", "sound", "mute", "pause", "boss", "b1", "b2", "b3", "b4", "double", "slow", "agile", "power", "cache", "lock", "mob", "kr", "armor", "magnet", "dmg", "hangar", "skin", "engine", "pierce", "side", "laser", "shrap", "crate", "module", "syn", "shard"];
  var icoCache = {};
  function fp(x, pts, fill, stroke) {
    x.beginPath();
    x.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]);
    x.closePath();
    if (fill) {
      x.fillStyle = fill;
      x.fill();
    }
    if (stroke) {
      x.strokeStyle = stroke;
      x.lineWidth = 2;
      x.stroke();
    }
  }
  function iconCanvas(name, size, color, frame) {
    var d = Math.min(2, G.devicePixelRatio || 1), key2 = name + "|" + size + "|" + color + "|" + (frame ? 1 : 0) + "|" + d, c = icoCache[key2], x, sh, i;
    if (c) return c;
    c = document.createElement("canvas");
    c.width = c.height = Math.ceil(size * d);
    x = c.getContext("2d");
    sh = IC[name] || IC.boss;
    x.scale(size * d / 24, size * d / 24);
    x.fillStyle = x.strokeStyle = color;
    if (frame) {
      x.beginPath();
      x.moveTo(1, 1);
      x.lineTo(18, 1);
      x.lineTo(23, 6);
      x.lineTo(23, 23);
      x.lineTo(6, 23);
      x.lineTo(1, 18);
      x.closePath();
      x.lineWidth = 1.6;
      x.stroke();
      x.translate(12, 12);
      x.scale(0.58, 0.58);
      x.translate(-12, -12);
    }
    for (i = 0; i < sh.length; i++) {
      x.globalCompositeOperation = sh[i][0] ? "destination-out" : "source-over";
      fp(x, sh[i][1], color);
    }
    icoCache[key2] = c;
    return c;
  }
  function ibtn(name, z, col, frame) {
    return '<canvas class="dcg-i" data-i="' + name + '" data-z="' + z + '" data-c="' + (col || "l") + '"' + (frame ? ' data-f="1"' : "") + ' aria-hidden="true"></canvas>';
  }
  function paintIcons(scope) {
    var l = scope.querySelectorAll("canvas[data-i]"), k, e, z, s;
    for (k = 0; k < l.length; k++) {
      e = l[k];
      z = +e.getAttribute("data-z") || 20;
      s = iconCanvas(e.getAttribute("data-i"), z, COL[e.getAttribute("data-c")] || C.label, e.hasAttribute("data-f"));
      e.width = s.width;
      e.height = s.height;
      e.style.width = z + "px";
      e.style.height = z + "px";
      e.getContext("2d").drawImage(s, 0, 0);
    }
  }

  // src/dane/tresci.js
  var KOD = [
    'zapis.status = "OPLACONE"',
    "kasa.dodaj(zapis, kwota)",
    "magazyn.sprawdz(zapasy)",
    "async def watch_loop()",
    "async def upwork_watch_loop()",
    "def parse_watchdog_line(line: str)",
    "def save_state(state: Dict[str, Any])",
    "pub fn new(app: &AppHandle, root: PathBuf)",
    "pub fn dir_for(&self, profile: &str, keep: bool)",
    "fn free_port()",
    "fn remove_later(dir: PathBuf)",
    "d/dx sin(x) = cos(x)",
    "simplify(expr) -> wynik",
    "solve(x**2 - 4, x)",
    "generuj_kod(wzor)",
    "public DetectionEvent Decide(DetectionEvent evt)",
    "public Availability Check()",
    "public IReadOnlyList<EventRecord> TryReadRecent(int maxEvents = 50)",
    "def scrape_useme(pages=1, delay=1.0, query=None)",
    "def fetch_offer_detail(url)",
    "def parse_offer(article)",
    "def save_offers(offers)",
    "rata = oblicz_rate(kwota, n)",
    "rrso = stopa + prowizja",
    "podpis = sign(dane, klucz)",
    "verify(podpis, klucz_pub)",
    "if not aktywacja.wazna(): blokuj",
    "fingerprint(maszyna)"
  ];
  var FALE = [
    "init",
    "feat: statek",
    "refactor",
    "merge conflict",
    "hotfix w piątek",
    "rebase",
    "force push",
    "deploy w nocy",
    "rollback",
    "legacy"
  ];

  // src/bossy/czesci.js
  var DIM = [[204, 132], [264, 156], [152, 160], [268, 204]];
  var FWB = [0.44, 0.46, 0.19, 0.6];
  var FHB = [0.4, 0.4, 0.4, 0.52];
  var ORY = [0.46, 0.36, 0, 0.32];
  var ACC = [C.acc, C.hot, C.bone, C.bone];
  var FZ = ["FAZA 1/3", "FAZA 2/3", "FAZA 3/3", "DESPERACJA"];
  var TAG = ["dereferencja wskaźnika null", "pamięć rośnie, nikt jej nie zwalnia", "dwa wątki, jeden zasób", "naruszenie ochrony pamięci"];
  var PAL = { hull: C.plate, plate: C.panel, edge: C.solid, dark: C.ink, sol: C.solid, hot: C.hot, acc: C.acc, txt: C.deep, hi: C.bone, lit: C.bone, rim: C.acc, deep: C.deep };
  var PALF = { hull: C.bone, plate: C.bone, edge: C.ink, dark: C.muted, sol: C.bone, hot: C.ink, acc: C.bone, txt: C.muted, hi: C.ink, lit: C.bone, rim: C.bone, deep: C.muted };
  function OCT(cx, cy, r, k) {
    return [cx - r + k, cy - r, cx + r - k, cy - r, cx + r, cy - r + k, cx + r, cy + r - k, cx + r - k, cy + r, cx - r + k, cy + r, cx - r, cy + r - k, cx - r, cy - r + k];
  }
  function MX(a) {
    var b = [], j;
    for (j = 0; j < a.length; j += 2) b.push(-a[j], a[j + 1]);
    return b;
  }
  var NP_HULL = [-102, -44, -94, -58, -58, -53, -46, -66, -34, -55, 34, -55, 50, -63, 60, -53, 96, -58, 102, -40, 66, -10, 75, -1, 58, 2, 26, 32, 9, 45, 0, 66, -9, 45, -26, 32, -62, 0, -71, -5, -64, -12];
  var NP_PL = [-90, -48, 88, -48, 92, -42, 60, -12, 64, -6, 22, 25, 0, 40, -22, 25, -58, -4, -92, -42];
  var NP_PNL = [-86, -42, -58, -42, -44, -18, -52, -10];
  var NP_PNR = MX(NP_PNL);
  var NP_TIP = [-24, 27, 24, 27, 9, 42, 0, 64, -9, 42];
  var NP_BAND = [-92, -55, 90, -55, 94, -50, 94, -47, -94, -47];
  var NP_SOCK = OCT(0, -14, 36, 12);
  var NP_RING = OCT(0, -14, 30, 10);
  var NP_FIN = [0, -14, 22, -14, 22, -26, 58, 0, 22, 26, 22, 14, 0, 14];
  var NP_FIN2 = [6, -8, 26, -8, 28, -17, 50, 0, 28, 17, 26, 8, 6, 8];
  var NP_ARM = [0, -5, 60, -5, 60, -12, 78, 0, 60, 12, 60, 5, 0, 5];
  var ML_CLAMP = [-10, -72, 20, -74, 46, -50, 30, -56, 24, -46, 16, -56, 8, -50, 2, -20, 8, 0, 2, 20, 8, 50, 16, 56, 24, 46, 30, 56, 46, 50, 20, 74, -10, 72, -20, 40, -14, 0, -20, -40];
  var ML_BLOB = [0, -4, 64, 42, -58, 12, 42, 32, 62, -10, 46, 34, 22, 34, 36, 22, -34, -40, 32, 16, 40, 30, 24, 20, -110, 30, 26, 15, 116, -32, 22, 14, 92, 34, 22, 13, -70, -40, 22, 12, 52, -48, 18, 10];
  var ML_DRIP = [-74, 38, 2, -36, 36, 3, 6, 52, 1, 42, 48, 2, 84, 40, 2];
  var ML_VEIN = [-14, 4, -40, 10, -72, -6, 12, -8, 40, -22, 74, -12, -6, 12, -14, 30, -34, 40, 10, 10, 30, 28, 56, 30];
  var ML_HEART = [0, -16, 7, -9, 17, -13, 14, -3, 20, 4, 8, 8, 3, 18, -4, 9, -16, 11, -13, 0, -19, -8, -7, -8];
  var RC_HULL = [-44, -77, 30, -77, 46, -60, 34, -44, 46, -30, 32, -14, 44, 0, 30, 16, 42, 30, 28, 48, 36, 62, 20, 77, -36, 77, -50, 58, -40, 0, -52, -56];
  var RC_PL = [-36, -69, 26, -69, 36, -58, 26, -44, 36, -30, 24, -14, 34, 0, 22, 16, 32, 30, 20, 48, 26, 60, 14, 69, -30, 69, -42, 54, -32, 0, -44, -52];
  var RC_HULL2 = [-62, -70, -50, -80, 44, -80, 56, -66, 46, -50, 58, -36, 46, -22, 58, -8, 46, 6, 58, 20, 46, 34, 58, 48, 46, 62, 54, 80, -52, 80, -66, 66];
  var RC_PL2 = [-54, -64, -44, -72, 36, -72, 46, -63, 36, -50, 48, -36, 36, -22, 48, -8, 36, 6, 48, 20, 36, 34, 48, 48, 36, 62, 42, 72, -46, 72, -58, 62];
  var RC_ARM = [-50, -52, -62, -44, -62, 46, -50, 54];
  var RC_CLAW = [0, -6, 20, -6, 24, -14, 46, -14, 36, -3, 22, -3, 22, 3, 36, 3, 46, 14, 24, 14, 20, 6, 0, 6];
  var RC_CUT = [-20, -12, 0, -22, 22, 2, 70, 12];
  var RC_TOPC = [-90, -100, 90, -100, 90, 12, 70, 12, 22, 2, 0, -22, -20, -12, -90, -34];
  var RC_BOTC = [-90, -34, -20, -12, 0, -22, 22, 2, 70, 12, 90, 12, 90, 100, -90, 100];
  var SP_W1 = [-46, -26, -96, -60, -138, -72, -112, -42, -50, -8];
  var SP_W2 = [-48, -8, -108, -30, -148, -24, -114, -6, -50, 12];
  var SP_W3 = [-48, 14, -100, 16, -134, 38, -96, 36, -48, 34];
  var SP_T1 = [-62, 22, 62, 22, 70, 34, 66, 84, 78, 100, 52, 90, -52, 90, -78, 100, -66, 84, -70, 34];
  var SP_T2 = [-50, -38, 50, -38, 56, -26, 50, 24, -50, 24, -56, -26];
  var SP_P2 = [-44, -32, 44, -32, 48, -24, 44, 18, -44, 18, -48, -24];
  var SP_T3 = [-30, -78, 30, -78, 36, -68, 32, -36, -32, -36, -36, -68];
  var SP_P3 = [-25, -72, 25, -72, 29, -65, 26, -42, -26, -42, -29, -65];
  var SP_EYL = [-46, -20, -14, -8, -15, -3, -45, -13];
  var SP_EYR = MX(SP_EYL);
  var SP_BROW = [-54, -31, 0, -14, 54, -31, 54, -23, 0, -6, -54, -23];
  var SP_MAW = [-50, 46, 50, 46, 50, 72, -50, 72];
  var SP_CROWN = [-54, 0, -52, -14, -44, -5, -36, -32, -27, -7, -17, -24, -8, -8, 0, -44, 8, -8, 18, -28, 28, -7, 38, -38, 46, -5, 53, -18, 56, 0];
  var SP_ARM = [0, -9, 46, -9, 54, -3, 54, 3, 46, 9, 0, 9];
  var SP_CLAW = [50, -18, 82, -10, 66, 0, 82, 10, 50, 18, 57, 0];
  var SP_CORE = OCT(0, -55, 15, 5);
  function pf(x, pts, fill, stroke, lw) {
    x.beginPath();
    x.moveTo(pts[0], pts[1]);
    for (var j = 2; j < pts.length; j += 2) x.lineTo(pts[j], pts[j + 1]);
    x.closePath();
    if (fill) {
      x.fillStyle = fill;
      x.fill();
    }
    if (stroke) {
      x.strokeStyle = stroke;
      x.lineWidth = lw || 1;
      x.stroke();
    }
  }
  function ln(x, a, b, c, d) {
    x.beginPath();
    x.moveTo(a, b);
    x.lineTo(c, d);
    x.stroke();
  }
  function st(x, s, px, X, Y, fill, b) {
    x.font = (b ? "700 " : "500 ") + px + "px " + MONO;
    x.fillStyle = fill;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(s, X, Y);
  }
  function tex(x, P2, pts, fs, sd) {
    var j, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, y, s;
    for (j = 0; j < pts.length; j += 2) {
      x0 = Math.min(x0, pts[j]);
      x1 = Math.max(x1, pts[j]);
      y0 = Math.min(y0, pts[j + 1]);
      y1 = Math.max(y1, pts[j + 1]);
    }
    x.save();
    pf(x, pts);
    x.clip();
    x.font = "500 " + fs + "px " + MONO;
    x.textAlign = "left";
    x.textBaseline = "middle";
    x.fillStyle = P2.txt;
    for (y = y0 + fs; y < y1; y += fs * 1.45) {
      s = "";
      while (s.length * fs * 0.6 < x1 - x0 + fs * 6) {
        sd = (sd * 7 + 3) % KOD.length;
        s += KOD[sd] + "  ";
      }
      x.fillText(s, x0 - sd % 5 * fs, y);
    }
    x.restore();
  }
  function cracks(x, P2, pts, n, sd) {
    var j, r, px, py, k;
    x.save();
    pf(x, pts);
    x.clip();
    x.lineJoin = "miter";
    for (j = 0; j < n; j++) {
      k = (sd + j * 5) % (pts.length / 2) * 2;
      px = pts[k] * 0.96;
      py = pts[k + 1] * 0.96;
      x.beginPath();
      x.moveTo(px, py);
      for (r = 0; r < 6; r++) {
        px += -px * 0.17 + (Math.random() - 0.5) * 18;
        py += -py * 0.17 + (Math.random() - 0.5) * 18;
        x.lineTo(px, py);
      }
      x.strokeStyle = P2.dark;
      x.lineWidth = 3.6;
      x.stroke();
      x.strokeStyle = P2.hot;
      x.lineWidth = 1.2;
      x.stroke();
    }
    x.restore();
  }
  function bev(x, pts, P2, lw, inv) {
    var j, n = pts.length, A = 0, ax, ay, bx, by, nx, ny, l, d;
    for (j = 0; j < n; j += 2) A += pts[j] * pts[(j + 3) % n] - pts[(j + 2) % n] * pts[j + 1];
    x.save();
    pf(x, pts);
    x.clip();
    x.lineCap = "square";
    for (j = 0; j < n; j += 2) {
      ax = pts[j];
      ay = pts[j + 1];
      bx = pts[(j + 2) % n];
      by = pts[(j + 3) % n];
      nx = by - ay;
      ny = ax - bx;
      if (A < 0) {
        nx = -nx;
        ny = -ny;
      }
      l = Math.sqrt(nx * nx + ny * ny) || 1;
      nx /= l;
      ny /= l;
      if (inv) {
        nx = -nx;
        ny = -ny;
      }
      d = -(nx + ny) * 0.7071;
      if (ny < -0.6) {
        x.strokeStyle = P2.lit;
        x.lineWidth = lw * 2;
      } else if (d > 0.2) {
        x.strokeStyle = P2.rim;
        x.lineWidth = lw * 2.2;
      } else if (d < -0.3) {
        x.strokeStyle = P2.dark;
        x.lineWidth = lw * 2.6;
      } else continue;
      ln(x, ax, ay, bx, by);
    }
    x.restore();
  }
  function hat(x, P2, pts, fr, sp) {
    var j, y0 = 1e9, y1 = -1e9, x0 = 1e9, x1 = -1e9;
    for (j = 0; j < pts.length; j += 2) {
      x0 = Math.min(x0, pts[j]);
      x1 = Math.max(x1, pts[j]);
      y0 = Math.min(y0, pts[j + 1]);
      y1 = Math.max(y1, pts[j + 1]);
    }
    x.save();
    pf(x, pts);
    x.clip();
    x.beginPath();
    x.rect(x0, y0 + (y1 - y0) * fr, x1 - x0, y1 - y0);
    x.clip();
    x.strokeStyle = P2.deep;
    x.lineWidth = 1.1;
    sp = sp || 3.4;
    for (j = x0 - (y1 - y0); j < x1; j += sp) ln(x, j, y1, j + (y1 - y0), y0);
    x.restore();
  }
  function pb(x, pts, fill, P2, lw, inv) {
    pf(x, pts, fill);
    bev(x, pts, P2, lw || 1.2, inv);
    pf(x, pts, null, P2.dark, 0.8);
  }
  function rivets(x, P2, a) {
    x.fillStyle = P2.edge;
    for (var j = 0; j < a.length; j += 2) x.fillRect(a[j] - 1.3, a[j + 1] - 1.3, 2.6, 2.6);
  }
  function rib(x, P2, a, w, col) {
    x.lineJoin = "miter";
    x.lineCap = "butt";
    x.beginPath();
    x.moveTo(a[0], a[1]);
    for (var j = 2; j < a.length; j += 2) x.lineTo(a[j], a[j + 1]);
    x.strokeStyle = P2.dark;
    x.lineWidth = w + 2.6;
    x.stroke();
    x.strokeStyle = col || P2.sol;
    x.lineWidth = w;
    x.stroke();
  }
  function artNP(x, P2) {
    var j;
    pb(x, NP_HULL, P2.hull, P2, 2);
    pb(x, NP_PL, P2.plate, P2, 1, true);
    hat(x, P2, NP_PL, 0.55);
    pb(x, NP_PNL, P2.hull, P2, 1);
    pb(x, NP_PNR, P2.hull, P2, 1);
    tex(x, P2, NP_PNL, 6, 9);
    tex(x, P2, NP_PNR, 6, 13);
    rib(x, P2, [-36, -6, -62, -2, -90, -40], 3);
    rib(x, P2, [36, -6, 62, -2, 90, -40], 3);
    rib(x, P2, [-20, 20, -46, 6], 2.2, P2.acc);
    rib(x, P2, [20, 20, 46, 6], 2.2, P2.acc);
    rib(x, P2, [0, 24, 0, 30], 3);
    pb(x, NP_TIP, P2.sol, P2, 1.4);
    pf(x, [-12, 31, 12, 31, 0, 56], P2.hot);
    pf(x, [-5, 34, 5, 34, 0, 46], P2.dark);
    pf(x, NP_BAND, P2.sol);
    x.fillStyle = P2.dark;
    for (j = 0; j < 15; j++) x.fillRect(-88 + j * 12, -54, 6, 5);
    x.fillStyle = P2.hot;
    x.fillRect(-94, -48.5, 188, 1.4);
    pb(x, NP_SOCK, P2.dark, P2, 1.8, true);
    st(x, "*ptr", 8, -66, -36, P2.hi, 1);
    rivets(x, P2, [-84, -46, 80, -46, -46, 2, 46, 2, -24, 30, 24, 30]);
  }
  function artFin(x, P2) {
    pb(x, NP_FIN, P2.hull, P2, 1.4);
    hat(x, P2, NP_FIN, 0.5);
    pb(x, NP_FIN2, P2.sol, P2, 1.1);
    pf(x, [30, -10, 46, 0, 30, 10], P2.hot);
    x.strokeStyle = P2.hi;
    x.lineWidth = 1.2;
    ln(x, 30, -10, 46, 0);
    x.fillStyle = P2.dark;
    x.fillRect(10, -6, 3, 12);
    x.fillRect(17, -6, 3, 12);
  }
  function artArm(x, P2) {
    pb(x, NP_ARM, P2.hull, P2, 1.2);
    rib(x, P2, [4, 0, 58, 0], 2);
    pf(x, [62, -8, 74, 0, 62, 8], P2.hot);
  }
  function artNull(x, P2) {
    pf(x, [-21, -12, 17, -12, 21, -8, 21, 12, -17, 12, -21, 8], P2.hi, P2.dark, 1.6);
    st(x, "null", 12, 0, 0.8, P2.dark, 1);
  }
  function artCell(x, P2, v) {
    var j, q = CR(-7.5, -7.5, 15, 15, 3.5);
    if (v < 4) {
      pf(x, q, v === 3 ? P2.hull : P2.plate);
      x.strokeStyle = P2.rim;
      x.lineWidth = 1.8;
      ln(x, -6.6, -3.5, -6.6, 7);
      x.strokeStyle = P2.lit;
      x.lineWidth = 1.6;
      ln(x, -7.5, -6.7, 3.5, -6.7);
      x.fillStyle = P2.deep;
      x.fillRect(-4, -2, 9, 1.6);
      x.fillRect(-4, 1.6, 5, 1.6);
      if (v === 1) {
        x.fillStyle = P2.sol;
        x.fillRect(-4, 3.5, 9, 3.5);
      }
      if (v === 2) {
        x.fillStyle = P2.hi;
        x.fillRect(-4, 4, 2.5, 2.5);
        x.fillRect(0, 4, 2.5, 2.5);
      }
      pf(x, q, null, P2.dark, 0.8);
    } else if (v < 6) {
      pf(x, q, v === 4 ? P2.sol : P2.hot);
      x.fillStyle = v === 4 ? P2.dark : P2.hi;
      for (j = 0; j < 4; j++) x.fillRect(-5, -4.5 + j * 3, j & 1 ? 6 : 10, 1.3);
      pf(x, q, null, P2.dark, 0.8);
    } else pf(x, q, C.bone);
  }
  function artClamp(x, P2) {
    pb(x, ML_CLAMP, P2.hull, P2, 1.6);
    rib(x, P2, [-6, -64, -13, -36, -8, 0, -13, 36, -6, 64], 3);
    rib(x, P2, [-10, -66, 24, -66, 38, -54], 2, P2.acc);
    rib(x, P2, [-10, 66, 24, 66, 38, 54], 2, P2.acc);
    pf(x, [28, -60, 44, -52, 32, -55], P2.hot);
    pf(x, [28, 60, 44, 52, 32, 55], P2.hot);
    pf(x, [16, -60, 22, -51, 19, -59], P2.hi);
    pf(x, [16, 60, 22, 51, 19, 59], P2.hi);
    rivets(x, P2, [-4, -66, -4, 66, -6, 0]);
  }
  function artHeap(x, P2) {
    pb(x, [-42, -8, 38, -8, 42, -4, 42, 8, -42, 8], P2.hull, P2, 1.2);
    st(x, "HEAP", 7, -27, 0.6, P2.hi, 1);
    pf(x, [-14, -3.5, 36, -3.5, 36, 3.5, -14, 3.5], P2.dark);
  }
  function artRC(x, P2, m) {
    var j, H1 = m > 0 ? RC_HULL : RC_HULL2, P1 = m > 0 ? RC_PL : RC_PL2;
    x.save();
    x.scale(m, 1);
    if (m > 0) {
      pb(x, [-40, -60, -70, -76, -58, -46, -44, -40], P2.sol, P2, 1);
      pb(x, [-42, -24, -78, -34, -60, -8, -42, -6], P2.sol, P2, 1.2);
      pb(x, [-42, 14, -72, 12, -56, 34, -44, 30], P2.hull, P2, 1.2);
      pb(x, [-44, 46, -64, 52, -50, 66, -40, 60], P2.sol, P2, 1);
    } else {
      pb(x, RC_ARM, P2.plate, P2, 1.2);
      pb(x, [-60, -66, -88, -78, -80, -46, -84, -30, -64, -24], P2.sol, P2, 1.4);
      pf(x, [-88, -78, -80, -64, -76, -72], P2.hot);
      pb(x, [-62, 18, -90, 26, -82, 40, -88, 56, -62, 50], P2.hull, P2, 1.4);
      pf(x, [-90, 26, -80, 34, -82, 40], P2.hot);
      pf(x, [-88, 56, -78, 50, -76, 54], P2.sol);
    }
    pb(x, H1, P2.hull, P2, 2);
    pb(x, P1, P2.plate, P2, 1, true);
    hat(x, P2, P1, 0.6);
    if (m < 0) {
      pb(x, [-46, -6, 30, -6, 30, 22, -46, 22], P2.hull, P2, 1);
      tex(x, P2, [-46, -6, 30, -6, 30, 22, -46, 22], 6, 11);
      pb(x, [-52, 32, 38, 32, 44, 38, 44, 64, -52, 64], P2.sol, P2, 1.2);
    } else {
      tex(x, P2, [-30, -2, 22, -2, 22, 24, -30, 24], 6, 4);
      pb(x, [-34, 35, 20, 35, 25, 41, 25, 61, -34, 61], P2.sol, P2, 1.2);
    }
    rib(x, P2, m > 0 ? [-36, -46, 20, -46, 30, -56] : [-50, -48, 34, -48], 3);
    rib(x, P2, m > 0 ? [-30, 30, 16, 30] : [-50, 34, 34, 34], 3);
    rib(x, P2, m > 0 ? [-30, 0, 26, 8] : [-54, -20, -54, 58], 2.2, P2.acc);
    pb(x, OCT(-10, -24, 22, 7), P2.dark, P2, 1.4, true);
    x.fillStyle = P2.dark;
    for (j = -40; j < 64; j += 9) x.fillRect(m > 0 ? 24 : 32, j, 7, 3);
    x.fillStyle = P2.sol;
    x.fillRect(m > 0 ? -46 : -62, -40, m > 0 ? 6 : 9, 80);
    rib(x, P2, m > 0 ? [-38, -72, 24, -72, 36, -60] : [-46, -75, 40, -75, 50, -64], 1.8, P2.hi);
    x.restore();
    st(x, m > 0 ? "T1" : "T2", m > 0 ? 22 : 28, (m > 0 ? -6 : -12) * m, 48, P2.hi, 1);
    rivets(x, P2, m > 0 ? [-36, -70, 22, -70, -30, 66] : [56, -74, -40, -74, 56, 74, -40, 74]);
  }
  function artClaw(x, P2) {
    pb(x, RC_CLAW, P2.hull, P2, 1.2);
    pf(x, OCT(5, 0, 4, 1.2), P2.sol);
    pf(x, [38, -13, 46, -14, 38, -6], P2.hot);
    pf(x, [38, 13, 46, 14, 38, 6], P2.hot);
  }
  function artLink(x, P2, col) {
    pf(x, [-8, -6, 3, -6, 3, -9, 9, -4, 3, 1, 3, -2, -8, -2], col, P2.dark, 1.2);
    pf(x, [8, 2, -3, 2, -3, -1, -9, 4, -3, 9, -3, 6, 8, 6], col, P2.dark, 1.2);
  }
  function artSPHalf(x, P2, sd) {
    pb(x, SP_W3, P2.hull, P2, 1.4);
    hat(x, P2, SP_W3, 0.4);
    rib(x, P2, [-50, 24, -100, 26, -128, 36], 2.2, P2.acc);
    pb(x, SP_W2, P2.sol, P2, 1.4);
    rib(x, P2, [-50, 2, -110, -16, -144, -24], 2.6, P2.deep);
    pb(x, SP_W1, P2.hull, P2, 1.6);
    tex(x, P2, SP_W1, 6, sd);
    rib(x, P2, [-50, -16, -100, -46, -134, -70], 2.6, P2.hi);
    pf(x, [-138, -72, -124, -58, -128, -66], P2.hot);
    pf(x, [-148, -24, -134, -20, -136, -26], P2.hot);
    pf(x, [-134, 38, -122, 32, -124, 37], P2.sol);
  }
  function artSP(x, P2) {
    var j;
    artSPHalf(x, P2, 6);
    x.save();
    x.scale(-1, 1);
    artSPHalf(x, P2, 17);
    x.restore();
    pb(x, SP_T1, P2.hull, P2, 2);
    hat(x, P2, SP_T1, 0.7);
    pf(x, SP_MAW, P2.dark);
    pf(x, [-46, 54, 46, 54, 46, 66, -46, 66], P2.deep);
    for (j = 0; j < 8; j++) {
      pf(x, [-48 + j * 12, 46, -36 + j * 12, 46, -42 + j * 12, 62 - (j & 1) * 5], j === 3 || j === 4 ? P2.hi : P2.lit);
    }
    for (j = 0; j < 7; j++) pf(x, [-44 + j * 13, 72, -32 + j * 13, 72, -38 + j * 13, 58 + (j & 1) * 4], P2.sol);
    pf(x, [-50, 44, 50, 44, 50, 47, -50, 47], P2.dark);
    pf(x, [-50, 71, 50, 71, 50, 74, -50, 74], P2.dark);
    rib(x, P2, [-62, 30, 62, 30], 3);
    rib(x, P2, [-58, 80, -24, 86, 24, 86, 58, 80], 2.4, P2.acc);
    pb(x, SP_T2, P2.hull, P2, 2);
    pb(x, SP_P2, P2.plate, P2, 1, true);
    pb(x, SP_BROW, P2.hull, P2, 1.4);
    rib(x, P2, [-54, -27, 0, -10, 54, -27], 2.6);
    pb(x, SP_EYL, P2.dark, P2, 1, true);
    pb(x, SP_EYR, P2.dark, P2, 1, true);
    rib(x, P2, [-34, 4, -18, 14, 18, 14, 34, 4], 2, P2.acc);
    x.fillStyle = P2.dark;
    x.fillRect(-2, 2, 4, 14);
    pb(x, SP_T3, P2.hull, P2, 2);
    pb(x, SP_P3, P2.plate, P2, 1, true);
    tex(x, P2, SP_P3, 5.5, 21);
    rib(x, P2, [-36, -38, 36, -38], 3);
    pb(x, SP_CORE, P2.dark, P2, 1.4, true);
    rivets(x, P2, [-60, 36, 60, 36, -46, -34, 46, -34, -28, -74, 28, -74]);
  }
  function artCrown(x, P2) {
    pb(x, SP_CROWN, P2.hull, P2, 1.4);
    rib(x, P2, [-50, -3, 50, -3], 2.4);
    pf(x, [-3, -44, 3, -44, 0, -32], P2.hi);
    pf(x, [35, -38, 41, -38, 38, -28], P2.hi);
    pf(x, [-39, -32, -33, -32, -36, -22], P2.hi);
    pf(x, [16, -28, 20, -28, 18, -22], P2.sol);
    pf(x, [-19, -24, -15, -24, -17, -18], P2.sol);
  }
  function artRing(x, P2) {
    var s, a0, a1, r0 = 86, r1 = 99;
    for (s = 0; s < 16; s++) {
      if (s % 4 === 3) continue;
      a0 = s * Math.PI / 8 + 0.05;
      a1 = (s + 1) * Math.PI / 8 - 0.05;
      pf(x, [r0 * Math.cos(a0), r0 * Math.sin(a0), r1 * Math.cos(a0), r1 * Math.sin(a0), r1 * Math.cos(a1 + 0.08), r1 * Math.sin(a1 + 0.08), r0 * Math.cos(a1), r0 * Math.sin(a1)], s % 4 === 0 ? P2.hot : P2.sol, P2.dark, 1.2);
      if (!(s & 1)) {
        x.fillStyle = s % 4 === 0 ? P2.hi : P2.acc;
        x.fillRect(102 * Math.cos(a0) - 1.6, 102 * Math.sin(a0) - 1.6, 3.2, 3.2);
      }
    }
  }
  function artSPArm(x, P2) {
    pb(x, SP_ARM, P2.hull, P2, 1.3);
    rib(x, P2, [4, 0, 46, 0], 2);
    pb(x, SP_CLAW, P2.sol, P2, 1);
    pf(x, [66, -12, 82, -10, 70, -6], P2.hot);
    pf(x, [66, 12, 82, 10, 70, 6], P2.hot);
    pf(x, OCT(0, 0, 7, 2), P2.dark, P2.acc, 1);
  }

  // src/bossy/strojenie.js
  var BN = ["NullPointer", "Memory Leak", "Race Condition", "Segfault Prime"];
  var BNU = BN.map(function(n) {
    return n.toUpperCase();
  });
  var WAVE_S = 20;
  var BOSS1_S = 100;
  var BOSS_EVERY = 5;
  var BREATH_S = 1.5;
  var BNEED = [250, 360, 360, 1350];
  var THR = [66.7, 33.4, 15];
  var TELE = [0.6, 0.45, 0.35, 0.4];
  var IDLE_S = [0.5, 0.35, 0.25, 0.3];
  var PHASE_V = [1, 1.15, 1.3, 1.35];
  var SWEEP_FREE = 10;
  var REC_S = 0.35;
  var VULN_N = [2, 3, 3, 3];
  var VULN_S = [1.8, 1.5, 1.3, 1];
  var STAG_S = 1.2;
  var SHIFT_S = 1;
  var DESP_S = 1.1;
  var HITSTOP = 0.07;
  var DMG_EX = 2;
  var DMG_ST = 2;
  var ARMOR = 0.5;
  var BOMB_DMG = [6, 10];
  var UNIK_FILL = 14;
  var UNIK_GRAZE = 6;
  var ARROW_V = 230;
  var SWEEP_V = 340;
  var HELL_S = 15;
  var SUDO_V = 1.4;
  var SUDO_T = 0.75;
  var COMBO_S = 2;
  var PAR = [70, 85, 100, 150];
  var ELITE_P = 0.04;
  var ELITE_CD = 7;
  var INTRO_S = 1.8;
  var DEATH_S = 1.5;
  var ATK = [
    ["arrows", "strzałki ->", 0, 1, 3, 0, 1, 0.8],
    ["dereference", "dereferencja", 0, 1, 2, 3, 0, 1.3],
    ["dangling", "dangling pointers", 0, 2, 2, 0, 1, 1.7],
    ["wall", "ściana 0x00000000", 0, 2, 2, 1, 0, 0.6],
    ["nulljump", "null jump", 0, 3, 2, 3, 0, 1.6],
    ["spiral", "spirala *", 0, 4, 4, 0, 0, 2.6],
    ["dump", "zrzut linijek", 1, 1, 3, 0, 1, 0.5],
    ["malloc", "malloc", 1, 1, 2, 0, 0, 0.8],
    ["heapspray", "heap spray", 1, 2, 2, 2, 0, 0.6],
    ["gc", "garbage collector", 1, 2, 2, 3, 0, 0.6],
    ["swap", "swap", 1, 3, 2, 2, 0, 2.4],
    ["oom", "OOM", 1, 4, 4, 0, 0, 4.6],
    ["sweep", "pasy ==", 2, 1, 3, 0, 0, 0.5],
    ["crossfire", "krzyżowy ogień", 2, 1, 2, 2, 1, 2.4],
    ["deadlock", "deadlock", 2, 2, 2, 0, 0, 6],
    ["mutex", "mutex", 2, 2, 2, 0, 1, 3.6],
    ["tandem", "tandem", 2, 3, 2, 3, 0, 2.3],
    ["desync", "desync", 2, 4, 4, 0, 0, 1.3],
    ["echo-np", "echo: NullPointer", 3, 1, 3, 0, 1, 0.8],
    ["sigsegv", "pierścień SIGSEGV", 3, 1, 2, 1, 0, 2.4],
    ["echo-ml", "echo: Memory Leak", 3, 2, 2, 0, 1, 0.5],
    ["stackoverflow", "stack overflow", 3, 2, 2, 2, 0, 1.8],
    ["coredump", "core dump", 3, 3, 2, 0, 1, 0.5],
    ["echo-rc", "echo: Race Condition", 3, 3, 2, 1, 0, 0.5],
    ["kernelpanic", "kernel panic", 3, 3, 1, 0, 0, 1.8],
    ["bullethell", "bullet hell", 3, 4, 9, 0, 0, HELL_S]
  ];
  var A_ARR = 0;
  var A_DER = 1;
  var A_DNG = 2;
  var A_WALL = 3;
  var A_JMP = 4;
  var A_SPI = 5;
  var A_DMP = 6;
  var A_MAL = 7;
  var A_SPR = 8;
  var A_GC = 9;
  var A_SWP = 10;
  var A_OOM = 11;
  var A_SWE = 12;
  var A_CRS = 13;
  var A_LCK = 14;
  var A_MTX = 15;
  var A_TND = 16;
  var A_DSY = 17;
  var A_ENP = 18;
  var A_RNG = 19;
  var A_EML = 20;
  var A_STK = 21;
  var A_ERC = 23;
  var A_PNC = 24;
  var A_COR = 22;
  var A_HEL = 25;
  var S_INTRO = 0;
  var S_IDLE = 1;
  var S_TELE = 2;
  var S_ATK = 3;
  var S_REC = 4;
  var S_VULN = 5;
  var S_STAG = 6;
  var S_SHIFT = 7;
  var S_DESP = 8;
  var S_DEATH = 9;
  var SN = ["INTRO", "IDLE", "TELEGRAPH", "ATTACK", "RECOVER", "VULNERABLE", "STAGGER", "PHASE_SHIFT", "DESPERATION", "DEATH"];
  var GRADES = ["C", "B", "A", "S"];
  var ATT = [];
  var ATA = [];
  for (ai = 0; ai < ATK.length; ai++) {
    ATT.push("> " + ATK[ai][1]);
    ATA.push("$ " + ATK[ai][1]);
  }
  var ai;
  var HELLT = [];
  for (ai = 0; ai <= HELL_S; ai++) HELLT.push("$ bullet hell · przetrwaj " + ai + " s");

  // src/gui/css.js
  var CUT = "polygon(0 0,calc(100% - 7px) 0,100% 7px,100% 100%,7px 100%,0 calc(100% - 7px))";
  var CUT12 = "polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))";
  var SCAN = "repeating-linear-gradient(0deg,rgba(246,242,243,.028) 0 1px,transparent 1px 3px)";
  var GUI_CSS = ".dcg{--i:" + C.ink + ";--p:" + C.panel + ";--l:" + C.line + ";--b:" + C.bone + ";--m:" + C.muted + ";--a:" + C.acc + ";--h:" + C.hot + ";--s:" + C.solid + ";--lb:" + C.label + ";--y:" + C.ally + ";--yd:" + C.allyDeep + ";--yk:" + C.allyDark + ";--hu:" + C.hull + ";--pl:" + C.plate + ";--br:" + C.bar + ";--dp:" + C.deep + ";--mo:" + MONO + ";--sa:" + SANS + ";--cut:" + CUT + ";--cut12:" + CUT12 + ";--e:cubic-bezier(.22,1,.36,1)}.dcg{container-type:size}.dcg *{box-sizing:border-box}.dcg-scr{position:absolute;inset:0;display:flex;padding:24px;overflow:auto;overscroll-behavior:contain}.dcg-scr.dcg-dim{background:rgba(14,14,18,.78)}.dcg-scr.dcg-solid{background:var(--i)}.dcg-scr[data-in]{animation:dcgIn .22s steps(1,end) both}.dcg-scr[data-in] .dcg-pn{animation:dcgCut .22s var(--e) both;animation-delay:calc(var(--d,0) * 40ms)}.dcg-scr[data-out]{animation:dcgOut .16s linear both;pointer-events:none}.dcg-scr[data-out] .dcg-pn{animation:dcgCutOut .16s linear both}@keyframes dcgIn{from{opacity:.001}to{opacity:1}}@keyframes dcgOut{from{opacity:1}to{opacity:0}}@keyframes dcgCut{0%{transform:translateX(calc(var(--sx,-1) * 28px));opacity:0;clip-path:inset(0 0 66% 0)}25%{transform:translateX(calc(var(--sx,-1) * -6px));opacity:1;clip-path:inset(34% 0 0 0)}50%{transform:translateX(calc(var(--sx,-1) * 4px));clip-path:inset(0 0 34% 0)}75%{transform:translateX(calc(var(--sx,-1) * -2px));clip-path:inset(0)}100%{transform:none;opacity:1;clip-path:inset(0)}}@keyframes dcgCutOut{0%{transform:none;opacity:1;clip-path:inset(0)}50%{transform:translateX(calc(var(--sx,-1) * 6px));clip-path:inset(0 0 40% 0)}100%{transform:translateX(calc(var(--sx,-1) * 24px));opacity:0;clip-path:inset(0 0 100% 0)}}.dcg-type{display:inline-block;white-space:nowrap;overflow:hidden;vertical-align:bottom}.dcg-scr[data-in] .dcg-type{animation:dcgType var(--tt,.24s) steps(var(--n,12),end) both}@keyframes dcgType{from{max-width:0}to{max-width:var(--tw,40ch)}}.dcg-noanim .dcg-scr[data-in],.dcg-noanim .dcg-scr[data-in] .dcg-pn,.dcg-noanim .dcg-scr[data-in] .dcg-type{animation:dcgIn .2s linear both}.dcg-noanim .dcg-scr[data-out],.dcg-noanim .dcg-scr[data-out] .dcg-pn{animation:dcgOut .16s linear both}.dcg-pn{position:relative;background:var(--l);padding:1px;clip-path:var(--cut);min-width:0}.dcg-pi{position:relative;background:var(--p);background-image:" + SCAN + ';clip-path:var(--cut);padding:16px;height:100%;display:flex;flex-direction:column;gap:12px;min-width:0}.dcg-pn.dcg-pk{background:var(--h)}.dcg-pn.dcg-pk>.dcg-pi{background-color:var(--br)}.dcg-ph{display:flex;align-items:center;gap:8px;margin:-16px -16px 0;padding:0 16px;height:32px;border-bottom:1px solid var(--l);background:rgba(14,14,18,.5)}.dcg-ph b{font:500 10px/1 var(--mo);letter-spacing:.08em;color:var(--m);font-variant-numeric:tabular-nums}.dcg-ph span{font:500 11px/1 var(--mo);letter-spacing:.08em;text-transform:uppercase;color:var(--b)}.dcg-ph i{flex:1;height:1px;background:var(--l)}.dcg-ph em{font:500 10px/1 var(--mo);letter-spacing:.08em;text-transform:uppercase;color:var(--m);font-style:normal}.dcg-lab{margin:0;font:500 11px/1.4 var(--mo);letter-spacing:.08em;text-transform:uppercase;color:var(--m)}.dcg-lab.dcg-y{color:var(--y)}.dcg-lab.dcg-r{color:var(--lb)}.dcg-txt{margin:0;font:400 14px/1.5 var(--sa);color:var(--m)}.dcg-num{font-family:var(--mo);font-variant-numeric:tabular-nums;font-feature-settings:"tnum"}.dcg-hd{margin:0;font:700 28px/1.1 var(--sa);letter-spacing:-.01em;color:var(--b)}.dcg-hd.dcg-r{color:var(--h);font-family:var(--mo);letter-spacing:.04em}.dcg-b{position:relative;display:flex;align-items:center;gap:12px;width:100%;min-height:44px;padding:0 16px;margin:0;border:0;border-radius:0;background:var(--l);color:var(--b);font:600 14px/1 var(--sa);text-align:left;cursor:pointer;clip-path:var(--cut);isolation:isolate;transition:transform .12s var(--e),color .12s}.dcg-b::before{content:"";position:absolute;inset:1px;background:var(--p);clip-path:var(--cut);z-index:-2}.dcg-b::after{content:"";position:absolute;inset:0;background:var(--y);z-index:-1;clip-path:polygon(100% 0,100% 0,100% 0);transition:clip-path .16s var(--e)}.dcg-b:focus{outline:none}.dcg-b:hover,.dcg-b:focus-visible,.dcg-b.dcg-f{color:var(--i);transform:translateX(2px)}.dcg-b:hover::after,.dcg-b:focus-visible::after,.dcg-b.dcg-f::after{clip-path:polygon(100% 0,-120% 0,100% 220%)}.dcg-b:focus-visible{box-shadow:none}.dcg-b:focus-visible::before,.dcg-b.dcg-f::before{inset:2px}.dcg-b .dcg-ix{font:500 10px/1 var(--mo);letter-spacing:.08em;color:var(--m);font-variant-numeric:tabular-nums;min-width:16px}.dcg-b:hover .dcg-ix,.dcg-b:focus-visible .dcg-ix,.dcg-b.dcg-f .dcg-ix{color:var(--yk)}.dcg-b .dcg-kb{margin-left:auto;font:500 10px/1 var(--mo);letter-spacing:.08em;text-transform:uppercase;color:var(--m)}.dcg-b:hover .dcg-kb,.dcg-b:focus-visible .dcg-kb,.dcg-b.dcg-f .dcg-kb{color:var(--yk)}.dcg-b.dcg-go{background:var(--yd)}.dcg-b.dcg-go::before{background:var(--yk)}.dcg-b.dcg-sel{background:var(--y)}.dcg-b.dcg-sel::before{background:var(--yk)}.dcg-b.dcg-warn::before{background:var(--br)}.dcg-b.dcg-warn{background:var(--s)}.dcg-b[disabled],.dcg-b[aria-disabled=true]{cursor:default;color:var(--m)}.dcg-b[disabled]::after{display:none}.dcg-b[disabled]{transform:none}.dcg-b .dcg-i{flex:none}.dcg-bs{display:flex;flex-direction:column;gap:8px}.dcg-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.dcg-row>.dcg-b{width:auto;flex:1 1 auto;justify-content:center;text-align:center}.dcg-b.dcg-hit{animation:dcgHit .18s steps(2,end)}@keyframes dcgHit{0%{background:var(--b)}100%{background:var(--y)}}.dcg-foot{position:absolute;left:24px;right:24px;bottom:12px;display:flex;gap:16px;justify-content:flex-end;flex-wrap:wrap;pointer-events:none}.dcg-foot span{font:500 10px/1 var(--mo);letter-spacing:.08em;text-transform:uppercase;color:var(--m)}.dcg-foot kbd{font:500 10px/1 var(--mo);color:var(--b);border:1px solid var(--l);padding:3px 5px;margin-right:6px;background:var(--p)}.dcg-title{align-items:center;justify-content:center;flex-direction:column;gap:16px;text-align:center;cursor:pointer}.dcg-logo{margin:0;font:700 clamp(30px,10.5cqw,104px)/1 var(--sa);letter-spacing:.02em;color:var(--b);display:flex;justify-content:center;white-space:nowrap}.dcg-logo span{display:inline-block}.dcg-logo .dcg-lc{color:transparent;-webkit-text-stroke:2px var(--b)}.dcg-logo .dcg-cur{width:.42em;height:.12em;align-self:flex-end;margin:0 0 .1em .08em;background:var(--y)}.dcg-scr:not([data-out]) .dcg-cur{animation:dcgBl 1s steps(1,end) infinite}.dcg-scr[data-in] .dcg-logo span{animation:dcgGl .8s steps(4,end) both;animation-delay:calc(var(--k) * 30ms)}@keyframes dcgGl{0%{opacity:0;transform:translate(var(--dx),var(--dy))}40%{opacity:1;transform:translate(calc(var(--dx) * .3),calc(var(--dy) * .3)) skewX(-12deg)}70%{transform:translate(calc(var(--dx) * -.08),0)}100%{opacity:1;transform:none}}.dcg-noanim .dcg-scr[data-in] .dcg-logo span{animation:dcgIn .3s linear both}.dcg-tag{display:flex;gap:12px;align-items:center;justify-content:center}.dcg-tag i{width:48px;height:1px;background:var(--l)}.dcg-any{margin:24px 0 0;min-height:44px;cursor:pointer;font:500 12px/1 var(--mo);letter-spacing:.16em;text-transform:uppercase;color:var(--b);padding:12px 20px;border:1px solid var(--l);background:rgba(14,14,18,.72);clip-path:var(--cut)}.dcg-any b{color:var(--y);font-weight:500}.dcg-scr:not([data-out]) .dcg-any{animation:dcgBl 1.2s steps(1,end) .9s infinite}@keyframes dcgBl{0%,60%{opacity:1}61%,100%{opacity:.35}}.dcg-noanim .dcg-any{animation:none!important}.dcg-menu{display:grid;grid-template-columns:minmax(240px,300px) minmax(0,1fr) minmax(200px,260px);gap:16px;align-items:stretch;width:100%;max-width:1200px;margin:auto;max-height:640px;padding-bottom:24px}.dcg-col{display:flex;flex-direction:column;gap:16px;min-width:0}.dcg-menu>.dcg-col>.dcg-pn{flex:1}.dcg-mlogo{margin:0;font:700 28px/1 var(--sa);letter-spacing:.02em;color:var(--b)}.dcg-hang{flex:1;display:flex;flex-direction:column;min-height:240px}.dcg-hang .dcg-pi{justify-content:space-between}.dcg-shipc{flex:1;position:relative;min-height:160px;border:1px solid var(--l);background-color:var(--i);background-image:linear-gradient(var(--l) 1px,transparent 1px),linear-gradient(90deg,var(--l) 1px,transparent 1px);background-size:32px 32px;background-position:center}.dcg-shipc canvas{position:absolute;inset:0;width:100%;height:100%}.dcg-shipc::before,.dcg-shipc::after{content:"";position:absolute;width:16px;height:16px;border:1px solid var(--y)}.dcg-shipc::before{left:8px;top:8px;border-right:0;border-bottom:0}.dcg-shipc::after{right:8px;bottom:8px;border-left:0;border-top:0}.dcg-spec{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.dcg-spec div{border-top:1px solid var(--l);padding-top:8px;min-width:0}.dcg-spec b{display:block;font:500 16px/1.2 var(--mo);color:var(--b);font-variant-numeric:tabular-nums;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dcg-stat{display:flex;flex-direction:column;gap:4px;padding-bottom:12px;border-bottom:1px solid var(--l)}.dcg-stat:last-child{border-bottom:0;padding-bottom:0}.dcg-big{margin:0;font:700 36px/1 var(--mo);color:var(--b);font-variant-numeric:tabular-nums;letter-spacing:-.02em}.dcg-mid{margin:0;font:500 20px/1.1 var(--mo);color:var(--b);font-variant-numeric:tabular-nums}.dcg-grd{display:flex;gap:4px}.dcg-grd span{width:28px;height:28px;display:flex;align-items:center;justify-content:center;font:700 13px/1 var(--mo);color:var(--m);border:1px solid var(--l);background:var(--i)}.dcg-grd span.dcg-ok{color:var(--i);background:var(--b);border-color:var(--b)}.dcg-wrap{width:100%;max-width:1040px;margin:auto;display:flex;flex-direction:column;gap:16px;padding-bottom:24px}.dcg-top{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap}.dcg-top .dcg-b{width:auto}.dcg-modes{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.dcg-mc{display:flex;flex-direction:column;align-items:stretch;gap:12px;min-height:244px;padding:16px;text-align:left}.dcg-mc .dcg-mn{font:700 20px/1.1 var(--sa)}.dcg-mc .dcg-md{font:400 13px/1.45 var(--sa);color:var(--m);flex:1}.dcg-mc:hover .dcg-md,.dcg-mc:focus-visible .dcg-md,.dcg-mc.dcg-f .dcg-md{color:var(--yk)}.dcg-mc .dcg-mr{display:flex;justify-content:space-between;gap:8px;border-top:1px solid var(--l);padding-top:8px;font:500 11px/1.3 var(--mo);letter-spacing:.06em;text-transform:uppercase;color:var(--m)}.dcg-mc .dcg-mr b{color:var(--b);font-weight:500;font-variant-numeric:tabular-nums}.dcg-mc:hover .dcg-mr,.dcg-mc:focus-visible .dcg-mr,.dcg-mc.dcg-f .dcg-mr,.dcg-mc:hover .dcg-mr b,.dcg-mc:focus-visible .dcg-mr b,.dcg-mc.dcg-f .dcg-mr b{color:var(--i);border-color:var(--yd)}.dcg-mc .dcg-mh{display:flex;align-items:center;justify-content:space-between}.dcg-mc[aria-disabled=true] .dcg-mn{color:var(--m)}.dcg-mc .dcg-lock{font:500 10px/1.3 var(--mo);letter-spacing:.08em;text-transform:uppercase;color:var(--b);display:flex;gap:6px;align-items:center}.dcg-mc[aria-disabled=true]:hover .dcg-lock,.dcg-mc[aria-disabled=true]:focus-visible .dcg-lock,.dcg-mc[aria-disabled=true].dcg-f .dcg-lock{color:var(--i)}.dcg-set{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.dcg-sr2{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 16px;align-items:center;min-height:44px}.dcg-sr2>label,.dcg-sr2>span{font:600 14px/1.2 var(--sa);color:var(--b)}.dcg-rng{display:flex;align-items:center;gap:12px}.dcg-rng output{font:500 12px/1 var(--mo);color:var(--b);min-width:3ch;text-align:right;font-variant-numeric:tabular-nums}.dcg input[type=range]{-webkit-appearance:none;appearance:none;width:160px;height:44px;background:transparent;margin:0;cursor:pointer}.dcg input[type=range]:focus{outline:none}.dcg input[type=range]::-webkit-slider-runnable-track{height:4px;background:linear-gradient(90deg,var(--y) 0 var(--v,50%),var(--l) var(--v,50%) 100%)}.dcg input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:20px;margin-top:-8px;background:var(--b);border:0;clip-path:polygon(0 0,100% 0,100% 70%,50% 100%,0 70%)}.dcg input[type=range]:focus-visible::-webkit-slider-thumb{background:var(--y)}.dcg input[type=range]::-moz-range-track{height:4px;background:var(--l)}.dcg input[type=range]::-moz-range-progress{height:4px;background:var(--y)}.dcg input[type=range]::-moz-range-thumb{width:14px;height:20px;border:0;border-radius:0;background:var(--b)}.dcg input[type=range]:focus-visible{box-shadow:inset 0 0 0 1px var(--y)}.dcg-tg{width:auto!important;min-width:96px;justify-content:center!important;font:500 11px/1 var(--mo)!important;letter-spacing:.08em;text-transform:uppercase}.dcg-tg[aria-pressed=true]::before{background:var(--yk)}.dcg-tg[aria-pressed=true]{background:var(--y);color:var(--y)}.dcg-tg[aria-pressed=true]:hover,.dcg-tg[aria-pressed=true]:focus-visible,.dcg-tg[aria-pressed=true].dcg-f{color:var(--i)}.dcg-keys{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.dcg-key{min-height:44px;font:500 12px/1 var(--mo)!important;letter-spacing:.04em}.dcg-key b{margin-left:auto;font-weight:500;color:var(--b);border:1px solid var(--l);padding:4px 8px;background:var(--i);min-width:44px;text-align:center}.dcg-key[data-wait] b{color:var(--y);border-color:var(--y)}.dcg-conf{border-top:1px solid var(--l);padding-top:12px;display:flex;flex-direction:column;gap:8px}.dcg-tk{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:16px;align-items:start}.dcg-tk .dcr{clip-path:none;background:transparent;padding:0}.dcg-tk .dcr-in{background:transparent;clip-path:none;padding:0}.dcg-tk .dcr-bel{display:none}.dcg-tk .dcr-sek{padding:0}.dcg-tk .dcr button[aria-pressed=true]{background:var(--yk);border-color:var(--y);color:var(--y)}.dcg-tk .dcr button:hover{border-color:var(--y)}.dcg-tk .dcr input:focus{border-color:var(--y)}.dcg-tk .dcr tr.dcr-ja td{background:var(--yk);color:var(--b);border-bottom-color:var(--yd)}.dcg-tk .dcr-wy{background:var(--yd)!important;border-color:var(--y)!important}.dcg-tk .dcr label,.dcg-tk .dcr-st b{color:var(--m)}.dcg-off{display:flex;flex-direction:column;gap:8px;padding:24px 0;align-items:flex-start}.dcg-mid2{margin:auto;width:100%;max-width:720px;display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:16px;align-items:start}.dcg-one{margin:auto;width:100%;max-width:440px;display:flex;flex-direction:column;gap:16px}.dcg-ups{display:flex;gap:8px;flex-wrap:wrap}.dcg-ups span{display:flex;align-items:center;gap:6px;font:500 11px/1 var(--mo);letter-spacing:.06em;text-transform:uppercase;color:var(--b);border:1px solid var(--yd);background:var(--yk);padding:6px 8px}.dcg-ups em{font-style:normal;color:var(--m)}.dcg-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:var(--l);border:1px solid var(--l)}.dcg-stats div{background:var(--i);padding:10px 12px;display:flex;flex-direction:column;gap:6px;min-width:0}.dcg-stats b{font:500 18px/1 var(--mo);color:var(--b);font-variant-numeric:tabular-nums}.dcg-sf{font:700 clamp(32px,7cqw,56px)/1 var(--mo);letter-spacing:.04em;color:var(--h);margin:0}.dcg-why{margin:0;font:500 12px/1.4 var(--mo);letter-spacing:.06em;color:var(--lb)}.dcg-new{font:500 11px/1 var(--mo);letter-spacing:.08em;text-transform:uppercase;color:var(--i);background:var(--y);padding:4px 6px}.dcg-gr{font:700 56px/1 var(--mo);color:var(--b);margin:0;width:72px;height:72px;display:flex;align-items:center;justify-content:center;border:1px solid var(--l);background:var(--i)}.dcg-pick .dcg-b{min-height:64px;padding:10px 16px}.dcg-pick .dcg-ct{font:600 14px/1.2 var(--sa)}.dcg-pick .dcg-cd{font:400 12px/1.35 var(--sa);color:var(--m)}.dcg-pick .dcg-b:hover .dcg-cd,.dcg-pick .dcg-b:focus-visible .dcg-cd,.dcg-pick .dcg-b.dcg-f .dcg-cd{color:var(--yk)}.dcg button.dcg-cb{position:absolute;display:flex;align-items:center;justify-content:center;gap:6px;min-width:44px;min-height:44px;padding:0 10px;border:1px solid var(--l);border-radius:0;background:rgba(14,14,18,.82);color:var(--b);font:500 12px/1 var(--mo);clip-path:var(--cut);cursor:pointer}.dcg button.dcg-cb:hover,.dcg button.dcg-cb:focus-visible{border-color:var(--y);outline:none}.dcg-pz{top:12px;right:12px}.dcg button.dcg-bb{right:16px;bottom:16px;min-width:72px;min-height:64px;border-color:var(--yd);color:var(--y)}.dcg-ark{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.dcg-ac{min-height:72px;padding:12px 16px;align-items:flex-start}.dcg-ac .dcg-an{font:700 16px/1.2 var(--sa)}.dcg-ac .dcg-an em{font:500 10px/1 var(--mo);letter-spacing:.08em;text-transform:uppercase;color:var(--m);font-style:normal;margin-left:6px}.dcg-ac .dcg-ad{font:400 12px/1.45 var(--sa);color:var(--m)}.dcg-ac.dcg-sel{background:var(--y)}.dcg-ac.dcg-sel::before{background:var(--yk)}.dcg-ac.dcg-sel .dcg-an em{color:var(--y)}.dcg-ac:hover .dcg-ad,.dcg-ac:focus-visible .dcg-ad,.dcg-ac.dcg-f .dcg-ad,.dcg-ac:hover .dcg-an em,.dcg-ac:focus-visible .dcg-an em,.dcg-ac.dcg-f .dcg-an em{color:var(--yk)}.dcg-wrap.dcg-wide{max-width:1200px}.dcg .dcg-ac,.dcg .dcg-skn{color:var(--b)}.dcg .dcg-ac:hover,.dcg .dcg-ac:focus-visible,.dcg .dcg-ac.dcg-f,.dcg .dcg-skn:hover,.dcg .dcg-skn:focus-visible,.dcg .dcg-skn.dcg-f{color:var(--i)}.dcg-hgl{position:sticky;top:0}.dcg-hg{display:grid;grid-template-columns:minmax(260px,340px) minmax(0,1fr);gap:16px;align-items:start}.dcg-hshc{min-height:220px;aspect-ratio:1/1;flex:none}.dcg-wal{display:flex;flex-direction:column;gap:4px;border-top:1px solid var(--l);padding-top:12px}.dcg-big.dcg-y,.dcg-y{color:var(--y)}.dcg-krs{font-weight:500;color:var(--yd)}.dcg-hnote{font-size:12px}.dcg-hnote b{color:var(--b);font-weight:600}.dcg-skins{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.dcg-skn{min-height:56px;padding:8px 10px;gap:10px}.dcg-skt{font:600 13px/1.2 var(--sa)}.dcg-skn .dcg-lab{font-size:10px}.dcg-skn:hover .dcg-lab,.dcg-skn:focus-visible .dcg-lab,.dcg-skn.dcg-f .dcg-lab{color:var(--yk)}.dcg-skn.dcg-sel .dcg-lab{color:var(--y)}.dcg-skn.dcg-sel:hover .dcg-lab,.dcg-skn.dcg-sel:focus-visible .dcg-lab,.dcg-skn.dcg-sel.dcg-f .dcg-lab{color:var(--yk)}.dcg-sw{display:grid;grid-template-columns:10px 6px 10px;width:28px;height:28px;flex:none;border:1px solid var(--l);background:var(--i);padding:3px;gap:0}.dcg-sw i{display:block}.dcg-sw i:nth-child(1){background:var(--h)}.dcg-sw i:nth-child(2){background:var(--s)}.dcg-sw i:nth-child(3){background:var(--c)}.dcg-shop{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.dcg-sc{position:relative;display:flex;flex-direction:column;gap:10px;padding:12px;background:var(--i);border:1px solid var(--l);clip-path:var(--cut);min-width:0}.dcg-sc.dcg-full{border-color:var(--yd)}.dcg-sch{display:flex;align-items:center;gap:10px}.dcg-sct{margin:0;font:600 15px/1.2 var(--sa);color:var(--b)}.dcg-pips{margin-left:auto;display:flex;gap:3px;flex:none}.dcg-pips i{width:8px;height:12px;background:var(--l);clip-path:polygon(0 0,100% 0,100% 70%,70% 100%,0 100%)}.dcg-pips i.dcg-on{background:var(--y)}.dcg-scd{margin:0;font:400 12px/1.45 var(--sa);color:var(--m)}.dcg-scv{margin:0;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;font:500 12px/1.3 var(--mo);color:var(--m);font-variant-numeric:tabular-nums;border-top:1px solid var(--l);padding-top:8px}.dcg-scv em{font-style:normal;color:var(--yd)}.dcg-scv b{font-weight:500;color:var(--y)}.dcg-scf{display:flex;align-items:center;gap:12px;margin-top:auto}.dcg-pr{font:700 16px/1 var(--mo);color:var(--b);font-variant-numeric:tabular-nums;white-space:nowrap}.dcg-pr.dcg-no{color:var(--m)}.dcg-pr.dcg-mx{color:var(--y);font-size:12px;letter-spacing:.08em;text-transform:uppercase}.dcg-buy{width:auto;margin-left:auto;min-width:112px;justify-content:center;font:600 13px/1 var(--sa)}.dcg-buy[aria-disabled=true]{font:500 11px/1 var(--mo);letter-spacing:.04em}.dcg-buy[aria-disabled=true]::after{background:var(--l)}.dcg-buy[aria-disabled=true]:hover,.dcg-buy[aria-disabled=true]:focus-visible,.dcg-buy[aria-disabled=true].dcg-f{color:var(--b)}.dcg-bought{animation:dcgBuy .42s steps(3,end)}@keyframes dcgBuy{0%{border-color:var(--y);background:var(--yk)}66%{border-color:var(--b);background:var(--yk)}100%{border-color:var(--l);background:var(--i)}}.dcg-skn.dcg-bought{animation:dcgHit .3s steps(2,end)}.dcg-noanim .dcg-bought{animation:none}.dcg-gbr{display:flex;flex-direction:column}.dcg-gbr div{display:grid;grid-template-columns:minmax(0,1fr) auto 64px;gap:10px;padding:4px 0;border-bottom:1px solid var(--l);font:500 11px/1.3 var(--mo);letter-spacing:.04em;color:var(--m)}.dcg-gbr span{text-transform:uppercase}.dcg-gbr em{font-style:normal;color:var(--b);text-align:right}.dcg-gbr b{text-align:right;color:var(--y);font-weight:700}.dcg-gbr b.dcg-neg{color:var(--h)}.dcg-mtop{display:flex;flex-direction:column;gap:10px}.dcg-mslots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.dcg-msl{min-height:76px;flex-direction:column;align-items:flex-start;justify-content:flex-start;gap:5px;padding:10px;color:var(--b);min-width:0}.dcg-msl>*{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dcg-msl .dcg-mn2{font:600 13px/1.2 var(--sa)}.dcg-msl .dcg-lab{font-size:10px}.dcg-msl.dcg-empty{color:var(--m);border-style:dashed}.dcg-msl:hover .dcg-lab,.dcg-msl:focus-visible .dcg-lab,.dcg-msl.dcg-f .dcg-lab{color:var(--yk)}.dcg-crate{display:grid;grid-template-columns:minmax(200px,auto) minmax(0,1fr);grid-template-rows:auto auto;gap:4px 14px;align-items:center}.dcg-crate .dcg-cbtn{grid-row:span 2}.dcg-cbtn{min-height:56px;gap:10px;justify-content:flex-start;font:600 14px/1.2 var(--sa)}.dcg-cpr{font:700 12px/1 var(--mo)}.dcg-cbtn[aria-disabled=true]{opacity:.7}.dcg-odds,.dcg-shd{font-size:10px;line-height:1.4}.dcg-crr{display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--y);background:var(--yk);clip-path:var(--cut);color:var(--b)}.dcg-crr b{font:700 15px/1.2 var(--sa)}.dcg-crr .dcg-lab{color:var(--b)}.dcg-crr.dcg-r1{border-color:var(--b)}.dcg-crr.dcg-r2{border-color:var(--y);box-shadow:inset 0 0 0 2px var(--y)}.dcg-crop{animation:dcgCrate .5s steps(4,end)}@keyframes dcgCrate{0%{transform:scaleY(.2);opacity:0}50%{transform:scaleY(1.08);opacity:1}100%{transform:scaleY(1)}}.dcg-noanim .dcg-crop{animation:none}.dcg-syn{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.dcg-sy{display:flex;gap:8px;align-items:flex-start;padding:6px 8px;border:1px solid var(--l);font:400 11px/1.4 var(--sa);color:var(--m);min-width:0}.dcg-sy b{font:600 12px/1.3 var(--sa);color:var(--b)}.dcg-sy.dcg-on{border-color:var(--y);background:var(--yk)}.dcg-sy.dcg-on b,.dcg-sy.dcg-on{color:var(--b)}.dcg-sy.dcg-half{border-color:var(--yd)}.dcg-sy em{font-style:normal;color:var(--y)}.dcg-mods{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.dcg-mc2{display:flex;flex-direction:column;gap:6px;padding:10px;background:var(--i);border:1px solid var(--l);clip-path:var(--cut);min-width:0}.dcg-mc2.dcg-r1{border-color:var(--m)}.dcg-mc2.dcg-r2{border-color:var(--yd)}.dcg-mc2.dcg-lock{opacity:.55}.dcg-mc2 h3{margin:0;font:600 13px/1.2 var(--sa);color:var(--b)}.dcg-mc2 p{margin:0;font:400 11px/1.4 var(--sa);color:var(--m)}.dcg-mrow{display:flex;gap:6px;flex-wrap:wrap;margin-top:auto}.dcg-mrow .dcg-b{width:auto;min-height:36px;padding:6px 10px;font:600 12px/1 var(--sa)}@media (max-width:640px){.dcg-crate{grid-template-columns:1fr}.dcg-crate .dcg-cbtn{grid-row:auto}.dcg-syn,.dcg-mods{grid-template-columns:1fr}.dcg-msl{padding:8px}}.dcg-over .dcg-mid2{grid-template-rows:auto auto;max-width:760px}.dcg-over .dcg-pk{grid-row:span 2}.dcg-krp>.dcg-pi{gap:8px}.dcg-krv{font-size:32px}.dcg-krv span:first-child{color:var(--yd);font-weight:500}.dcg-krl{display:flex;flex-direction:column}.dcg-krl div{display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid var(--l);font:500 11px/1.3 var(--mo);letter-spacing:.06em;text-transform:uppercase;color:var(--m)}.dcg-krl b{font-weight:500;color:var(--b);font-variant-numeric:tabular-nums}.dcg-mkr{margin:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.dcg-mkr b{font:700 16px/1 var(--mo);color:var(--y)}.dcg-mkr .dcg-lab{flex-basis:100%}.dcg-krl div.dcg-z b{color:var(--m)}@media (max-width:1000px){.dcg-shop{grid-template-columns:1fr}}@media (max-width:760px){.dcg-hgl{display:contents}.dcg-hgl>.dcg-pn:nth-child(2){order:3}.dcg-hgr2{order:2}.dcg-hgl>.dcg-pn:first-child>.dcg-pi{display:grid;grid-template-columns:132px minmax(0,1fr);gap:12px 16px;align-items:center}.dcg-hgl>.dcg-pn:first-child .dcg-ph,.dcg-hgl>.dcg-pn:first-child .dcg-hnote{grid-column:1/-1}.dcg-hgl .dcg-hshc{min-height:132px;height:132px}.dcg-hgl .dcg-wal{border-top:0;padding-top:0}.dcg-hgl .dcg-wal .dcg-big{font-size:30px}.dcg-over .dcg-krp{order:3}.dcg-krl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:16px}}@media (max-width:760px){.dcg-hgl{position:static}.dcg-hg{grid-template-columns:1fr}.dcg-hshc{aspect-ratio:auto;min-height:180px}.dcg-ark{grid-template-columns:1fr;gap:8px}.dcg-over .dcg-pk{grid-row:auto}}@media (max-height:640px){.dcg-hshc{min-height:150px;aspect-ratio:auto}}@media (max-width:1000px){.dcg-modes{grid-template-columns:repeat(2,minmax(0,1fr))}.dcg-mc{min-height:180px}}@media (max-width:860px){.dcg-menu{grid-template-columns:minmax(220px,280px) minmax(0,1fr)}.dcg-menu .dcg-recs{grid-column:1/-1;flex-direction:row}.dcg-menu .dcg-recs>.dcg-pn{flex:1}}@media (max-width:640px){.dcg-scr{padding:16px}.dcg-menu{grid-template-columns:1fr;gap:12px}.dcg-hang{display:none}.dcg-menu .dcg-recs{flex-direction:column}.dcg-modes{grid-template-columns:1fr;gap:8px}.dcg-mc{min-height:0;gap:8px}.dcg-set{grid-template-columns:1fr}.dcg-tk{grid-template-columns:1fr}.dcg-mid2{grid-template-columns:1fr}.dcg-foot{display:none}.dcg-hd{font-size:24px}.dcg-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.dcg-keys{grid-template-columns:1fr}.dcg input[type=range]{width:120px}}@media (max-height:640px){.dcg-mc{min-height:180px}.dcg-foot{display:none}}.dcg [hidden]{display:none!important}.dcg-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}';

  // src/gui/ekrany.js
  var LOGO = "DANCYCLOUD";
  var DX = [-140, 90, -60, 160, -110, 70, -170, 120, -40, 150];
  var DY = [-60, 80, -110, 40, 90, -80, 30, -120, 110, -30];
  function hd(n, txt, em) {
    return '<div class="dcg-ph"><b>' + n + "</b><span>" + txt + "</span><i></i>" + (em ? "<em>" + em + "</em>" : "") + "</div>";
  }
  function pn(inner, d, sx, cls) {
    return '<div class="dcg-pn' + (cls ? " " + cls : "") + '" style="--d:' + (d || 0) + ";--sx:" + (sx || -1) + '"><div class="dcg-pi">' + inner + "</div></div>";
  }
  function typ(txt) {
    return '<span class="dcg-type" style="--n:' + txt.length + ";--tw:" + (txt.length + 1) + 'ch">' + txt + "</span>";
  }
  function btn(a, ix, txt, kb, extra) {
    return '<button type="button" class="dcg-b' + (extra || "") + '" data-a="' + a + '"><span class="dcg-ix">' + ix + "</span><span>" + txt + "</span>" + (kb ? '<span class="dcg-kb">' + kb + "</span>" : "") + "</button>";
  }
  function back() {
    return '<button type="button" class="dcg-b dcg-back" data-a="back" style="width:auto"><span class="dcg-ix">ESC</span><span>Wstecz</span></button>';
  }
  function top(n, h, sub) {
    return '<div class="dcg-top"><div class="dcg-col" style="gap:4px"><p class="dcg-lab">' + n + " · " + sub + '</p><h2 class="dcg-hd">' + typ(h) + "</h2></div>" + back() + "</div>";
  }
  var FOOT = '<div class="dcg-foot" aria-hidden="true"><span><kbd>↑↓←→</kbd>wybór</span><span><kbd>Enter</kbd><kbd>A</kbd>ok</span><span><kbd>Esc</kbd><kbd>B</kbd>wstecz</span></div>';
  function screensHTML() {
    var logo = "", j;
    for (j = 0; j < LOGO.length; j++) logo += "<span" + (j >= 5 ? ' class="dcg-lc"' : "") + ' style="--k:' + j + ";--dx:" + DX[j] + "px;--dy:" + DY[j] + 'px">' + LOGO.charAt(j) + "</span>";
    return '<section class="dcg-scr dcg-title" data-s="title" aria-label="DancyCloud: ekran tytułowy" hidden><p class="dcg-lab dcg-tag"><i></i>SORA//OS · terminal · gra<i></i></p><h1 class="dcg-logo" aria-label="DancyCloud">' + logo + '<span class="dcg-cur" aria-hidden="true"></span></h1><p class="dcg-txt">Unikaj kodu. Zestrzel malware. Pokonaj czterech bossów.</p><button type="button" class="dcg-any" data-a="title">Naciśnij dowolny klawisz <b>·</b> dotknij</button></section><section class="dcg-scr dcg-start" data-s="menu" aria-label="Menu główne" hidden><div class="dcg-menu"><div class="dcg-col">' + pn(hd("01", "Menu", "SORA//OS") + '<h2 class="dcg-mlogo">' + typ("DANCYCLOUD") + '</h2><nav class="dcg-bs" aria-label="Menu główne">' + btn("start", "01", "Graj", '<span class="dcg-pm">Unik</span>', " dcg-go") + '<button type="button" class="dcg-b" data-a="cont" hidden><span class="dcg-ix">↺</span><span class="dcg-cpt">Po bossie</span><span class="dcg-kb"></span></button>' + btn("modes", "02", "Tryby") + btn("hangar", "03", "Hangar / Sklep", '<span class="dcg-pkr">₡ 0</span>') + btn("topka", "04", "Topka") + btn("settings", "05", "Ustawienia") + '<button type="button" class="dcg-b" data-a="exit" hidden><span class="dcg-ix">06</span><span>Wyjdź</span></button></nav><p class="dcg-lab dcg-hint">Enter: graj · Esc: tytuł</p>', 0, -1) + '</div><div class="dcg-col dcg-hang">' + pn(hd("02", "Rakieta", "hangar") + '<div class="dcg-shipc"><canvas class="dcg-shipv" aria-hidden="true"></canvas></div><div class="dcg-spec"><div><p class="dcg-lab">Tryb</p><b class="dcg-sm1">Unik</b></div><div><p class="dcg-lab">Kredyty</p><b class="dcg-num dcg-y dcg-skr">₡ 0</b></div><div><p class="dcg-lab">Bossy</p><b class="dcg-num dcg-sbo">0 / 4</b></div></div>', 1, 1, "dcg-hang") + '</div><div class="dcg-col dcg-recs">' + pn(hd("03", "Rekordy") + '<div class="dcg-stat"><p class="dcg-lab">Rekord · <span class="dcg-rm">Unik</span></p><p class="dcg-big dcg-cu" data-cu="rec">0</p></div><div class="dcg-stat" hidden><p class="dcg-lab">Rekord · <span class="dcg-rm2">Ogień</span></p><p class="dcg-mid dcg-cu" data-cu="rec2">0</p></div><div class="dcg-stat"><p class="dcg-lab">Oceny bossów</p><div class="dcg-grd dcg-og"><span>–</span><span>–</span><span>–</span><span>–</span></div></div><div class="dcg-stat"><p class="dcg-lab">Boss rush</p><p class="dcg-mid dcg-rush">—</p></div><div class="dcg-stat"><p class="dcg-lab">Próby · ten tryb</p><p class="dcg-mid dcg-prb">0</p></div>', 2, 1) + "</div></div>" + FOOT + '</section><section class="dcg-scr dcg-dim" data-s="modes" aria-label="Wybór trybu" hidden><div class="dcg-wrap">' + top("02", "Wybór trybu", "tryby") + '<div class="dcg-ark" role="group" aria-label="Rodzaj gry: Arena albo Kampania">' + ark("1", "record", "Arena", "topka", "Wszyscy na bazowym sprzęcie: zakupy z hangaru wyłączone, skórka zostaje. Wynik trafia do topki.") + ark("0", "hangar", "Kampania", "twój sprzęt", "Grasz rakietą z hangaru, ze wszystkimi zakupami. Rekordy zostają na tym urządzeniu, bez topki.") + '</div><div class="dcg-modes" role="group" aria-label="Tryby gry">' + mode("unik", "01", "shield", "Unik", "Bez strzelania. Unikasz linijek i bomb mobów, Spacja czyści ekran.", 0).replace("<button", "<button hidden") + mode("ogien", "02", "auto", "Ogień", "Mysz steruje statkiem, lewy przycisk (albo Z) trzymany strzela. Esc oddaje kursor.", 1) + mode("sudo", "03", "power", "sudo", "Bossowie o 40% szybsi, krótsze telegrafy, bez tarczy z ulepszeń.", 2) + mode("rush", "04", "boss", "Boss rush", "Czterech bossów pod rząd z wyborem ulepszenia. Liczy się czas.", 3) + '</div><p class="dcg-lab dcg-mbase">sudo i boss rush grasz w ostatnio wybranym trybie statku</p></div>' + FOOT + '</section><section class="dcg-scr dcg-solid dcg-hgr" data-s="hangar" aria-label="Hangar i sklep" hidden><div class="dcg-wrap dcg-wide">' + top("03", "Hangar", "sklep · ulepszenia trwałe") + '<div class="dcg-hg"><div class="dcg-col dcg-hgl">' + pn(hd("01", "Rakieta", "kampania") + '<div class="dcg-shipc dcg-hshc"><canvas class="dcg-hship" aria-hidden="true"></canvas></div><div class="dcg-wal"><p class="dcg-lab">Kredyty</p><p class="dcg-big dcg-y" aria-live="polite"><span class="dcg-krs">₡ </span><span class="dcg-num dcg-cu" data-cu="wal">0</span></p><p class="dcg-lab dcg-wst"></p></div><p class="dcg-txt dcg-hnote">Zakupy działają w <b>Kampanii</b>. W <b>Arenie</b> (topka) wszyscy latają na bazowym sprzęcie — skórka zostaje.</p>', 0, -1) + pn(hd("02", "Skórki", "tylko wygląd") + '<div class="dcg-skins" role="group" aria-label="Skórki rakiety"></div>', 1, -1) + '</div><div class="dcg-col dcg-hgr2">' + // etap 2b: moduły ze skrzynek (losowanie za ₡ z gry), 3 gniazda, synergie
    pn(hd("03", "Moduły", "skrzynki · 3 gniazda · kampania") + '<div class="dcg-mtop"><div class="dcg-mslots" role="group" aria-label="Gniazda modułów"></div><div class="dcg-crate"><button type="button" class="dcg-b dcg-go dcg-cbtn" data-crate="1">' + ibtn("crate", 22, "k") + '<span class="dcg-col" style="gap:2px"><span>Otwórz skrzynkę</span><span class="dcg-cpr">₡ 450</span></span></button><p class="dcg-lab dcg-odds"></p><p class="dcg-lab dcg-shd"></p></div></div><div class="dcg-crr" aria-live="polite" hidden></div><div class="dcg-syn" role="list" aria-label="Synergie"></div><div class="dcg-mods" role="list" aria-label="Twoje moduły"></div>', 2, 1) + pn(hd("04", "Ulepszenia", "trwałe · poziomy") + '<div class="dcg-shop" role="list"></div>', 3, 1) + '</div></div></div></section><section class="dcg-scr dcg-solid" data-s="topka" aria-label="Topka" hidden><div class="dcg-wrap">' + top("03", "Topka", "ranking graczy") + '<div class="dcg-tk">' + pn(hd("01", "Ranking", "tydzień · zawsze") + '<div class="dcg-rk-host"></div><div class="dcg-off" hidden><p class="dcg-lab dcg-r">Ranking niedostępny</p><p class="dcg-txt">Brak połączenia z serwerem topki. Rekordy zapisują się na tym urządzeniu.</p></div>', 0, -1) + pn(hd("02", "Twoje rekordy") + '<div class="dcg-stat"><p class="dcg-lab">Unik</p><p class="dcg-mid dcg-num dcg-tu">0</p></div><div class="dcg-stat"><p class="dcg-lab">Ogień</p><p class="dcg-mid dcg-num dcg-to">0</p></div><p class="dcg-txt" style="font-size:12px">Wynik trafia do topki po końcu rundy, jeśli wpiszesz nick. Rundy testowe się nie liczą.</p>', 1, 1) + "</div></div>" + FOOT + '</section><section class="dcg-scr dcg-solid" data-s="settings" aria-label="Ustawienia" hidden><div class="dcg-wrap">' + top("04", "Ustawienia", "konfiguracja") + '<div class="dcg-set">' + pn(hd("01", "Dźwięk") + row("Dźwięk", '<button type="button" class="dcg-b dcg-tg" data-a="snd" aria-pressed="false"><span>Wył.</span></button>') + row('<label for="dcg-vm">Muzyka</label>', rng("vm", "music")) + row('<label for="dcg-vs">Efekty</label>', rng("vs", "sfx")), 0, -1) + pn(hd("02", "Rozgrywka") + row("Trudność", '<div class="dcg-row" role="group" aria-label="Trudność"><button type="button" class="dcg-b dcg-tg" data-diff="normal" aria-pressed="true">Normalna</button><button type="button" class="dcg-b dcg-tg" data-diff="sudo" aria-pressed="false">sudo</button></div>') + '<p class="dcg-lab dcg-dlk"></p>' + row("Pełny ekran", '<button type="button" class="dcg-b dcg-tg" data-a="fs" aria-pressed="false">Wył.</button>'), 1, 1) + pn(hd("03", "Redukcja efektów") + row("Trzęsienie ekranu", tg("shake")) + row("Glitch", tg("glitch")) + row("Błyski", tg("flash")) + '<p class="dcg-lab dcg-rmn" hidden>System prosi o ograniczenie ruchu: efekty są wyłączone.</p>', 2, -1) + pn(hd("04", "Sterowanie", "klawiatura · pad") + '<div class="dcg-keys">' + key("l", "Lewo") + key("r", "Prawo") + key("u", "Góra") + key("d", "Dół") + key("fire", "Strzał (trzymaj)") + key("bomb", "Bomba") + key("pause", "Pauza") + '</div><p class="dcg-lab">Pad: gałka / krzyżak · A bomba · Start pauza · B wstecz</p>', 3, 1) + pn(hd("05", "Dane") + '<div class="dcg-bs"><button type="button" class="dcg-b dcg-warn" data-a="reset"><span class="dcg-ix">!</span><span>Resetuj rekordy</span></button><div class="dcg-conf" hidden role="alertdialog" aria-labelledby="dcg-cq"><p class="dcg-lab dcg-r" id="dcg-cq">Na pewno? Rekordy, oceny i odblokowania znikną.</p><div class="dcg-row"><button type="button" class="dcg-b dcg-warn" data-a="reset-yes">Usuń</button><button type="button" class="dcg-b" data-a="reset-no">Anuluj</button></div></div><p class="dcg-lab dcg-rdone" hidden>Rekordy usunięte.</p><button type="button" class="dcg-b dcg-warn" data-a="sreset"><span class="dcg-ix">!</span><span>Resetuj postęp hangaru</span></button><div class="dcg-sconf" hidden role="alertdialog" aria-labelledby="dcg-sq"><p class="dcg-lab dcg-r" id="dcg-sq">Na pewno? Kredyty, ulepszenia i skórki wrócą do zera. Tego nie da się cofnąć.</p><div class="dcg-row"><button type="button" class="dcg-b dcg-warn" data-a="sreset-yes">Zeruj hangar</button><button type="button" class="dcg-b" data-a="sreset-no">Anuluj</button></div></div><p class="dcg-lab dcg-sdone" hidden>Hangar wyzerowany.</p></div>', 4, -1) + "</div></div>" + FOOT + '</section><section class="dcg-scr dcg-dim dcg-pause" data-s="pause" aria-label="Pauza" hidden><div class="dcg-mid2">' + pn(hd("II", "Pauza", "gra wstrzymana") + '<h2 class="dcg-hd">' + typ("Stoimy.") + '</h2><div class="dcg-bs">' + btn("resume", "01", "Wznów", "Esc", " dcg-go") + btn("settings", "02", "Ustawienia") + btn("menu", "03", "Wyjdź do menu") + "</div>", 0, -1) + pn(hd("02", "Runda") + '<div class="dcg-stat"><p class="dcg-lab">Wynik</p><p class="dcg-big dcg-num dcg-psc">0</p></div><div class="dcg-stat"><p class="dcg-lab">Fala</p><p class="dcg-mid dcg-num dcg-pwv">1</p></div><div class="dcg-stat"><p class="dcg-lab dcg-y">Ulepszenia</p><div class="dcg-ups dcg-pup"></div></div>', 1, 1) + '</div></section><section class="dcg-scr dcg-dim dcg-over" data-s="over" aria-label="Koniec gry" hidden><div class="dcg-mid2">' + pn(hd("!!", "Koniec rundy", "core dumped") + '<h2 class="dcg-sf">' + typ("SEGFAULT") + '</h2><p class="dcg-why"></p><div class="dcg-row" style="align-items:flex-end;gap:12px"><p class="dcg-big dcg-sc" data-cu="score">0</p><span class="dcg-new" hidden>Nowy rekord</span></div><p class="dcg-lab dcg-best"><span></span></p><div class="dcg-stats"><div><p class="dcg-lab">Czas</p><b class="dcg-s-t">0:00</b></div><div><p class="dcg-lab">Fale</p><b class="dcg-s-w">1</b></div><div><p class="dcg-lab">Moby</p><b class="dcg-s-m">0</b></div><div><p class="dcg-lab">Muśnięcia</p><b class="dcg-s-g">0</b></div><div><p class="dcg-lab">Bossowie</p><b class="dcg-s-b">0</b></div><div><p class="dcg-lab">Combo maks.</p><b class="dcg-s-c">×1</b></div><div><p class="dcg-lab">Próba</p><b class="dcg-s-p">—</b></div><div><p class="dcg-lab">Na tym bossie</p><b class="dcg-s-pb">—</b></div></div><p class="dcg-lab dcg-bd"></p>', 0, -1, "dcg-pk") + pn(hd("₡", "Kredyty", "zapisane w hangarze") + '<p class="dcg-big dcg-y dcg-krv"><span>+₡ </span><span class="dcg-num" data-cu="kr">0</span></p><div class="dcg-krl"></div><p class="dcg-lab dcg-krw"></p>', 1, 1, "dcg-krp") + pn(hd("02", "Co dalej") + '<div class="dcg-bs">' + btn("again", "01", "Jeszcze raz", "Enter", " dcg-go") + '<button type="button" class="dcg-b" data-a="retry" hidden><span class="dcg-ix">02</span>' + ibtn("boss", 18) + "<span>Od bossa</span></button>" + btn("hangar", "03", "Hangar / Sklep") + btn("menu", "04", "Menu") + '</div><p class="dcg-lab dcg-rkl dcg-rk" hidden></p>', 2, 1) + '</div></section><section class="dcg-scr dcg-dim dcg-merge" data-s="merge" aria-label="Boss pokonany" hidden><div class="dcg-one">' + pn(hd("OK", "Boss pokonany", "merge") + '<div class="dcg-row" style="gap:16px;flex-wrap:nowrap"><span class="dcg-mbi">' + ibtn("b1", 56, "b", 1) + '</span><div class="dcg-col" style="gap:6px"><h2 class="dcg-hd">' + typ("MERGE") + '</h2><p class="dcg-cm dcg-lab"></p></div></div><div class="dcg-row" style="gap:16px;flex-wrap:nowrap"><p class="dcg-gr" aria-label="ocena">S</p><p class="dcg-lab dcg-gd" style="flex:1"></p></div><div class="dcg-gbr" aria-label="Za co ta ocena"></div><p class="dcg-lab dcg-rt" hidden></p><p class="dcg-lab dcg-mb"></p><p class="dcg-lab dcg-y" style="display:flex;gap:8px;align-items:center">' + ibtn("bomb", 18, "y") + '<span>+1 bomba</span></p><p class="dcg-mkr">' + ibtn("kr", 18, "y") + '<b>+₡ 0</b><span class="dcg-lab"></span></p><div class="dcg-bs">' + btn("next", "01", "Dalej", "Enter", " dcg-go") + "</div>", 0, -1) + '</div></section><section class="dcg-scr dcg-dim dcg-pick" data-s="pick" aria-label="Wybierz ulepszenie" hidden><div class="dcg-one">' + pn(hd("UP", "Po bossie", "wybierz jedno") + '<h2 class="dcg-hd">' + typ("Ulepszenie") + '</h2><div class="dcg-cards dcg-bs"></div>', 0, -1) + "</div></section>";
  }
  function mode(m, ix, icon, name, desc, d) {
    return '<button type="button" class="dcg-b dcg-mc" data-m="' + m + '" style="--d:' + d + '"><span class="dcg-mh">' + ibtn(icon, 28, "b") + '<span class="dcg-ix">' + ix + '</span></span><span class="dcg-mn">' + name + '</span><span class="dcg-md">' + desc + '</span><span class="dcg-lock" hidden>' + ibtn("lock", 14, "b") + '<span>Odblokuj: pokonaj Segfault Prime</span></span><span class="dcg-mr"><span>Rekord</span><b class="dcg-mrv">0</b></span><span class="dcg-mr"><span>Bossy</span><b class="dcg-mrg">– – – –</b></span></button>';
  }
  function ark(v, icon, name, sub, desc) {
    return '<button type="button" class="dcg-b dcg-ac" data-ar="' + v + '" aria-pressed="false">' + ibtn(icon, 24, "b") + '<span class="dcg-col" style="gap:4px"><span class="dcg-an">' + name + " <em>" + sub + '</em></span><span class="dcg-ad">' + desc + "</span></span></button>";
  }
  function row(l, ctl) {
    return '<div class="dcg-sr2">' + (l.charAt(0) === "<" ? l : "<span>" + l + "</span>") + ctl + "</div>";
  }
  function rng(id, k) {
    return '<div class="dcg-rng"><input type="range" id="dcg-' + id + '" min="0" max="100" step="5" data-v="' + k + '"><output for="dcg-' + id + '">0</output></div>';
  }
  function tg(k) {
    return '<button type="button" class="dcg-b dcg-tg" data-fx="' + k + '" aria-pressed="true">Wł.</button>';
  }
  function key(k, name) {
    return '<button type="button" class="dcg-b dcg-key" data-key="' + k + '"><span>' + name + "</span><b>—</b></button>";
  }

  // src/gui/szablon.js
  var CSS = ".dcg{position:relative;width:100%;height:100%;overflow:hidden;background:" + C.ink + ";color:" + C.bone + ";font-family:" + SANS + ";outline:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}.dcg .dcg-cv{position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none}.dcg .dcg-i{display:inline-block;flex:none;vertical-align:middle}.dcg-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}" + GUI_CSS;
  var HTML = '<canvas class="dcg-cv" role="img" aria-label="DancyCloud: statek leci nad nocnym miastem, omija spadające linijki kodu i bomby malware, walczy z bossami"></canvas><button type="button" class="dcg-cb dcg-pz" data-a="pause" tabindex="-1" aria-label="Pauza" hidden>' + ibtn("pause", 20, "b") + '</button><button type="button" class="dcg-cb dcg-bb" tabindex="-1" aria-label="Bomba" hidden>' + ibtn("bomb", 22, "y") + "<span></span></button>" + screensHTML() + '<p class="dcg-sr" aria-live="polite"></p>';

  // src/gui/nawigacja.js
  var SEL = "button:not([disabled]):not([hidden]),input:not([disabled]),a[href]";
  function createScreens(root2, hooks) {
    var cur = "", stack = [], scr = {}, list = root2.querySelectorAll("[data-s]"), j;
    for (j = 0; j < list.length; j++) scr[list[j].getAttribute("data-s")] = list[j];
    function visible(el) {
      return !el.hidden && el.offsetParent !== null && !el.closest("[hidden]");
    }
    function items(name) {
      var s = scr[name || cur], out = [], all, k;
      if (!s) return out;
      all = s.querySelectorAll(SEL);
      for (k = 0; k < all.length; k++) if (visible(all[k])) out.push(all[k]);
      return out;
    }
    function onEnd(e) {
      var s = e.currentTarget;
      if (e.target !== s) return;
      if (s.hasAttribute("data-out")) {
        s.removeAttribute("data-out");
        s.hidden = true;
      } else if (s.hasAttribute("data-in")) s.removeAttribute("data-in");
    }
    for (j in scr) scr[j].addEventListener("animationend", onEnd);
    function focus(el, kb) {
      if (!el) return;
      var a = root2.querySelectorAll(".dcg-f"), k;
      for (k = 0; k < a.length; k++) a[k].classList.remove("dcg-f");
      try {
        el.focus({ preventScroll: !kb });
      } catch (e) {
        el.focus();
      }
      if (kb) el.classList.add("dcg-f");
      if (el.scrollIntoView && kb) try {
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
      } catch (e) {
      }
    }
    function hideNow(s) {
      s.removeAttribute("data-in");
      s.removeAttribute("data-out");
      s.hidden = true;
    }
    function show(name, o) {
      o = o || {};
      var prev = cur, s = scr[name], ps = scr[prev], instant = !!o.instant;
      if (!s) return;
      if (prev && prev !== name && ps && !o.keep) {
        if (instant || ps.hidden) hideNow(ps);
        else {
          ps.removeAttribute("data-in");
          ps.setAttribute("data-out", "");
        }
      }
      if (o.push && prev && prev !== name) stack.push([prev, root2.ownerDocument.activeElement]);
      if (!o.push && !o.keepStack) stack.length = 0;
      cur = name;
      s.removeAttribute("data-out");
      s.hidden = false;
      if (!instant) {
        s.removeAttribute("data-in");
        void s.offsetWidth;
        s.setAttribute("data-in", "");
      }
      if (hooks.onShow) hooks.onShow(name, prev);
      var f = o.el || (o.focus ? s.querySelector(o.focus) : null);
      if (!f || !visible(f)) f = items(name)[0];
      focus(f, !!o.kb);
    }
    function hideAll() {
      for (var k in scr) hideNow(scr[k]);
      cur = "";
      stack.length = 0;
      var a = root2.querySelectorAll(".dcg-f");
      for (k = 0; k < a.length; k++) a[k].classList.remove("dcg-f");
    }
    function s0(n) {
      return scr[n];
    }
    function back2() {
      var p = stack.pop();
      if (p) {
        show(p[0], { keepStack: true, kb: true, el: p[1] && s0(p[0]).contains(p[1]) ? p[1] : null });
        return true;
      }
      return false;
    }
    function move(dx, dy) {
      var it = items(), a = root2.ownerDocument.activeElement, k, r0, r, best = null, bd = 1e9, cx, cy, ox, oy, d, el;
      if (!it.length) return false;
      if (it.indexOf(a) < 0) {
        focus(it[0], true);
        return true;
      }
      r0 = a.getBoundingClientRect();
      cx = r0.left + r0.width / 2;
      cy = r0.top + r0.height / 2;
      for (k = 0; k < it.length; k++) {
        el = it[k];
        if (el === a) continue;
        r = el.getBoundingClientRect();
        ox = r.left + r.width / 2 - cx;
        oy = r.top + r.height / 2 - cy;
        if (dx && ox * dx <= 4) continue;
        if (dy && oy * dy <= 4) continue;
        d = dx ? Math.abs(ox) + 2 * Math.abs(oy) : Math.abs(oy) + 2 * Math.abs(ox);
        if (d < bd) {
          bd = d;
          best = el;
        }
      }
      if (!best && dy) {
        best = dy > 0 ? it[0] : it[it.length - 1];
        if (best === a) best = null;
      }
      if (best) {
        focus(best, true);
        if (hooks.onMove) hooks.onMove();
        return true;
      }
      return false;
    }
    function current() {
      return cur;
    }
    function ensureFocus() {
      var a = root2.ownerDocument.activeElement, it = items();
      if (cur && it.length && it.indexOf(a) < 0) focus(it[0], false);
    }
    function destroy() {
      for (var k in scr) scr[k].removeEventListener("animationend", onEnd);
    }
    return { show, hideAll, back: back2, move, current, focus, items, ensureFocus, el: scr, destroy };
  }
  function createCounters() {
    var L = [];
    function set(el, to, dur) {
      var from = +(el.getAttribute("data-v") || 0) || 0, k;
      for (k = 0; k < L.length; k++) if (L[k].el === el) {
        L.splice(k, 1);
        break;
      }
      el.setAttribute("data-v", String(to));
      if (!dur || from === to) {
        el.textContent = fmt(to);
        return;
      }
      L.push({ el, from, to, t: 0, d: dur });
    }
    function tick(dt) {
      for (var k = L.length - 1; k >= 0; k--) {
        var c = L[k], p;
        c.t += dt;
        p = Math.min(1, c.t / c.d);
        p = 1 - (1 - p) * (1 - p) * (1 - p);
        c.el.textContent = fmt(Math.round(c.from + (c.to - c.from) * p));
        if (c.t >= c.d) L.splice(k, 1);
      }
    }
    function busy() {
      return L.length > 0;
    }
    function clear() {
      L.length = 0;
    }
    return { set, tick, busy, clear };
  }
  function fmt(n) {
    var s = String(Math.max(0, Math.floor(n))), o = "", k, c = 0;
    for (k = s.length - 1; k >= 0; k--) {
      o = s.charAt(k) + o;
      if (++c % 3 === 0 && k) o = " " + o;
    }
    return o;
  }

  // src/gui/pad.js
  var DEAD = 0.35;
  var REP0 = 0.34;
  var REP = 0.11;
  function createPad(win, onConnect) {
    var nav = win.navigator, n = 0, P2 = { x: 0, y: 0, a: 0, b: 0, st: 0, A: 0, B: 0, ST: 0, dx: 0, dy: 0, any: 0 };
    var held = 0, hx = 0, hy = 0, rt = 0, pa = 0, pb2 = 0, ps = 0, conn = 0;
    function onConn() {
      conn++;
      if (onConnect) onConnect();
    }
    function onDis() {
      conn = Math.max(0, conn - 1);
    }
    win.addEventListener("gamepadconnected", onConn);
    win.addEventListener("gamepaddisconnected", onDis);
    function first() {
      var l = nav && nav.getGamepads ? nav.getGamepads() : null, k;
      if (!l) return null;
      for (k = 0; k < l.length; k++) if (l[k] && l[k].connected !== false) return l[k];
      return null;
    }
    function btn2(g, i) {
      var b = g.buttons[i];
      return b ? typeof b === "object" ? b.pressed || b.value > 0.5 : b > 0.5 : false;
    }
    function poll(dt) {
      var g = first(), x = 0, y = 0, a, b, s, sx, sy;
      P2.A = P2.B = P2.ST = 0;
      P2.dx = P2.dy = 0;
      P2.any = 0;
      if (!g) {
        P2.x = P2.y = 0;
        pa = pb2 = ps = 0;
        held = 0;
        return P2;
      }
      x = g.axes[0] || 0;
      y = g.axes[1] || 0;
      if (Math.abs(x) < DEAD) x = 0;
      if (Math.abs(y) < DEAD) y = 0;
      if (btn2(g, 14)) x = -1;
      if (btn2(g, 15)) x = 1;
      if (btn2(g, 12)) y = -1;
      if (btn2(g, 13)) y = 1;
      P2.x = x;
      P2.y = y;
      a = btn2(g, 0);
      b = btn2(g, 1);
      s = btn2(g, 9);
      P2.A = a && !pa ? 1 : 0;
      P2.B = b && !pb2 ? 1 : 0;
      P2.ST = s && !ps ? 1 : 0;
      P2.a = a ? 1 : 0;
      P2.b = b ? 1 : 0;
      P2.st = s ? 1 : 0;
      pa = a;
      pb2 = b;
      ps = s;
      sx = x > 0.5 ? 1 : x < -0.5 ? -1 : 0;
      sy = y > 0.5 ? 1 : y < -0.5 ? -1 : 0;
      if (sy) sx = 0;
      if (sx || sy) {
        if (!held || sx !== hx || sy !== hy) {
          held = 1;
          hx = sx;
          hy = sy;
          rt = REP0;
          P2.dx = sx;
          P2.dy = sy;
        } else if ((rt -= dt) <= 0) {
          rt = REP;
          P2.dx = sx;
          P2.dy = sy;
        }
      } else held = 0;
      P2.any = P2.A || P2.B || P2.ST || P2.dx || P2.dy ? 1 : 0;
      return P2;
    }
    function connected() {
      return conn > 0 || !!first();
    }
    function destroy() {
      win.removeEventListener("gamepadconnected", onConn);
      win.removeEventListener("gamepaddisconnected", onDis);
    }
    return { poll, connected, destroy, P: P2 };
  }

  // src/gui/ustawienia.js
  var KEY = "dancycloud.ustawienia";
  var KEY_NAMES = { " ": "Spacja", ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓", Escape: "Esc", Enter: "Enter", Tab: "Tab", Shift: "Shift" };
  function defaults() {
    return {
      snd: false,
      music: 60,
      sfx: 80,
      diff: "normal",
      shake: true,
      glitch: true,
      flash: true,
      base: "unik",
      arena: true,
      keys: { l: "ArrowLeft", r: "ArrowRight", u: "ArrowUp", d: "ArrowDown", fire: "z", bomb: " ", pause: "Escape" }
    };
  }
  function loadSettings() {
    var s = defaults(), o, k;
    try {
      o = JSON.parse(G.localStorage.getItem(KEY) || "null");
    } catch (e) {
      o = null;
    }
    if (o && typeof o === "object") {
      for (k in s) if (k !== "keys" && typeof o[k] === typeof s[k]) s[k] = o[k];
      if (o.keys) {
        for (k in s.keys) if (typeof o.keys[k] === "string" && o.keys[k]) s.keys[k] = o.keys[k];
      }
    }
    s.music = clampV(s.music);
    s.sfx = clampV(s.sfx);
    if (s.base !== "ogien") s.base = "unik";
    if (s.diff !== "sudo") s.diff = "normal";
    return s;
  }
  function clampV(v) {
    v = Math.round(+v || 0);
    return v < 0 ? 0 : v > 100 ? 100 : v;
  }
  function saveSettings(s) {
    try {
      G.localStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) {
    }
  }
  function keyName(k) {
    return KEY_NAMES[k] || (k && k.length === 1 ? k.toUpperCase() : k || "—");
  }

  // src/dzwiek/dzwiek.js
  function createAudio(win) {
    var ac = null, on = false, gm = null, gs = null, src = null, buf = null, vm = 0.6, vs = 0.8, mus = false;
    function ctx() {
      if (!on) return null;
      if (!ac) {
        var A = win.AudioContext || win.webkitAudioContext;
        if (!A) return null;
        try {
          ac = new A();
        } catch (e) {
          return null;
        }
        gs = ac.createGain();
        gs.gain.value = vs;
        gs.connect(ac.destination);
        gm = ac.createGain();
        gm.gain.value = vm * 0.5;
        gm.connect(ac.destination);
      }
      if (ac.state === "suspended" && ac.resume) ac.resume();
      return ac;
    }
    function tone(f1, f2, dur, type, vol) {
      var a = ctx();
      if (!a || vs <= 0) return;
      try {
        var t0 = a.currentTime, o = a.createOscillator(), g = a.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f1, t0);
        o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
        g.gain.setValueAtTime(vol, t0);
        g.gain.exponentialRampToValueAtTime(1e-4, t0 + dur);
        o.connect(g);
        g.connect(gs);
        o.start(t0);
        o.stop(t0 + dur + 0.02);
      } catch (e) {
      }
    }
    function sfx(k) {
      if (!on) return;
      if (k === "graze") tone(1250, 1700, 0.06, "sine", 0.025);
      else if (k === "bomb") {
        tone(240, 40, 0.38, "triangle", 0.07);
        tone(900, 140, 0.18, "square", 0.012);
      } else if (k === "crash") tone(170, 32, 0.45, "sawtooth", 0.05);
      else if (k === "hit") tone(520, 330, 0.04, "square", 0.01);
      else if (k === "kill") tone(720, 210, 0.07, "triangle", 0.02);
      else if (k === "pop") {
        tone(900, 260, 0.06, "triangle", 0.03);
        tone(180, 60, 0.12, "square", 8e-3);
      } else if (k === "drop") tone(330, 200, 0.05, "triangle", 8e-3);
      else if (k === "bhit") tone(300, 240, 0.05, "square", 0.012);
      else if (k === "tele") tone(660, 660, 0.05, "square", 8e-3);
      else if (k === "boss") tone(110, 70, 0.5, "sawtooth", 0.04);
      else if (k === "win") {
        tone(440, 880, 0.3, "triangle", 0.05);
        tone(660, 1320, 0.4, "sine", 0.025);
      } else if (k === "shield") tone(400, 120, 0.2, "triangle", 0.05);
      else if (k === "tik") tone(1800, 1500, 0.025, "square", 6e-3);
      else if (k === "ok") {
        tone(880, 1320, 0.07, "triangle", 0.025);
      } else if (k === "back") tone(700, 420, 0.06, "triangle", 0.02);
      else if (k === "kr") tone(1500, 2100, 0.04, "sine", 0.012);
      else if (k === "buy") {
        tone(520, 1040, 0.09, "triangle", 0.035);
        tone(180, 90, 0.16, "square", 0.012);
        tone(1560, 1560, 0.05, "sine", 0.015);
      } else if (k === "nope") tone(260, 180, 0.09, "square", 0.012);
    }
    var MF = [520, 300, 760, 240, 420, 180, 140, 640, 900, 1100, 600, 1500, 980, 820], MW = ["triangle", "square", "sine", "sawtooth", "triangle", "square", "sawtooth", "sine", "sine", "square", "triangle", "sine", "triangle", "square"];
    function mob(ty, d) {
      if (!on) return;
      var f = MF[ty] || 500, w = MW[ty] || "triangle";
      if (d === 2) tone(f * 2, f * 2, 0.03, "square", 6e-3);
      else if (d === 1) {
        tone(f * 1.2, f * 0.3, 0.09, w, 0.022);
        tone(f * 0.4, f * 0.15, 0.12, "square", 6e-3);
      } else tone(f, f * 0.7, 0.05, w, 8e-3);
    }
    function track(a) {
      var sr = 22050, bpm = 110, st2 = 60 / bpm / 2, n = 128, len = Math.ceil(st2 * n * sr), b = a.createBuffer(1, len, sr), d = b.getChannelData(0), i, j, t, f, e, s0, s1, ph = 0, ph2 = 0;
      var bass = [45, 45, 45, 45, 41, 41, 43, 43], arp = [57, 60, 64, 69, 64, 60, 57, 52];
      for (j = 0; j < n; j++) {
        s0 = Math.floor(j * st2 * sr);
        s1 = Math.floor((j + 1) * st2 * sr);
        f = 440 * Math.pow(2, (bass[j >> 4 & 7] - 69 - 12) / 12);
        var fa = 440 * Math.pow(2, (arp[j & 7] + (j >> 5 & 1 ? 3 : 0) - 69) / 12);
        for (i = s0; i < s1 && i < len; i++) {
          t = (i - s0) / sr;
          e = Math.exp(-t * 9);
          ph += f / sr;
          ph2 += fa / sr;
          d[i] = 0.22 * e * (ph % 1 < 0.5 ? 1 : -1) * 0.6 + 0.08 * Math.exp(-t * 14) * Math.sin(ph2 * 6.2832) + ((j & 3) === 0 ? 0.12 * Math.exp(-t * 40) * Math.sin(t * 2 * Math.PI * (60 - t * 400)) : 0);
        }
      }
      return b;
    }
    function music(play) {
      mus = !!play;
      var a = ctx();
      if (!a) return;
      if (mus && !src && vm > 0) {
        try {
          if (!buf) buf = track(a);
          src = a.createBufferSource();
          src.buffer = buf;
          src.loop = true;
          src.connect(gm);
          src.start();
        } catch (e) {
          src = null;
        }
      } else if (!mus && src) {
        try {
          src.stop();
          src.disconnect();
        } catch (e) {
        }
        src = null;
      }
    }
    function setOn(v) {
      on = !!v;
      if (on) {
        ctx();
        if (mus) music(true);
      } else {
        if (src) {
          try {
            src.stop();
          } catch (e) {
          }
          src = null;
        }
        if (ac && ac.suspend) ac.suspend();
      }
    }
    function volume(m, s) {
      vm = m;
      vs = s;
      if (gm) gm.gain.value = vm * 0.5;
      if (gs) gs.gain.value = vs;
      if (mus && vm > 0 && !src) music(true);
    }
    function close() {
      if (src) {
        try {
          src.stop();
        } catch (e) {
        }
        src = null;
      }
      if (ac) {
        try {
          ac.close();
        } catch (e) {
        }
        ac = null;
      }
    }
    return { sfx, mob, music, setOn, volume, close, on: function() {
      return on;
    }, ctx: function() {
      return ac;
    } };
  }

  // src/wrogowie/art.js
  var VIRUS = 0;
  var BOTNET = 1;
  var SPYWARE = 2;
  var MINER = 3;
  var MOB_NAMES = ["Virus", "Botnet", "Spyware", "Cryptominer"];
  var TAU = Math.PI * 2;
  function P() {
    return new Path2D();
  }
  function circ(r, x, y) {
    var p = P();
    p.arc(x || 0, y || 0, r, 0, TAU);
    return p;
  }
  function poly(a) {
    var p = P(), j;
    p.moveTo(a[0], a[1]);
    for (j = 2; j < a.length; j += 2) p.lineTo(a[j], a[j + 1]);
    p.closePath();
    return p;
  }
  function ball(x, r, fill, shade, rim, lw) {
    var c = circ(r);
    x.fillStyle = shade;
    x.fill(c);
    x.save();
    x.clip(c);
    x.fillStyle = fill;
    x.beginPath();
    x.arc(-r * 0.14, -r * 0.16, r * 0.93, 0, TAU);
    x.fill();
    x.restore();
    x.strokeStyle = rim;
    x.lineWidth = 2.6;
    x.lineCap = "round";
    x.beginPath();
    x.arc(0, 0, r - 4.2, Math.PI * 1.08, Math.PI * 1.55);
    x.stroke();
    x.strokeStyle = C.ink;
    x.lineWidth = lw || 4;
    x.stroke(c);
  }
  function patch(x, clip, pts, col) {
    x.save();
    x.clip(clip);
    x.fillStyle = col;
    x.fill(poly(pts));
    x.restore();
  }
  function rivet(x, X, Y, r) {
    x.fillStyle = C.ink;
    x.beginPath();
    x.arc(X, Y, r + 0.9, 0, TAU);
    x.fill();
    x.fillStyle = C.muted;
    x.beginPath();
    x.arc(X - 0.3, Y - 0.3, r, 0, TAU);
    x.fill();
  }
  function seam(x, a, b, c, d, lw) {
    x.strokeStyle = C.ink;
    x.lineWidth = lw || 1.8;
    x.beginPath();
    x.moveTo(a, b);
    x.lineTo(c, d);
    x.stroke();
  }
  function spike(x, L, hw, band) {
    var b = poly([-hw, 0, 0, -L, hw, 0]);
    x.fillStyle = C.solid;
    x.fill(b);
    x.fillStyle = C.label;
    x.fill(poly([-hw, 0, 0, -L, -hw * 0.25, 0]));
    x.fillStyle = C.bone;
    x.fill(poly([-hw * 0.34, -L * 0.66, 0, -L, hw * 0.34, -L * 0.66]));
    if (band) {
      x.fillStyle = C.muted;
      x.fill(poly([-hw * 0.78, -L * 0.22, hw * 0.78, -L * 0.22, hw * 0.62, -L * 0.36, -hw * 0.62, -L * 0.36]));
    }
    x.strokeStyle = C.ink;
    x.lineWidth = 2.6;
    x.lineJoin = "round";
    x.stroke(b);
  }
  function drill(x, L, hw, ph) {
    var b = poly([-hw, 0, hw, 0, 0, L]), j, y0, y1, w0, w1;
    x.fillStyle = C.muted;
    x.fill(b);
    x.save();
    x.clip(b);
    x.fillStyle = C.bone;
    x.fill(poly([-hw, 0, -hw * 0.1, 0, 0, L]));
    x.strokeStyle = C.ink;
    x.lineWidth = 1.8;
    for (j = 0; j < 4; j++) {
      y0 = (j + ph * 0.5) * L / 4;
      y1 = y0 + L / 8;
      w0 = hw * (1 - y0 / L);
      w1 = hw * (1 - y1 / L);
      x.beginPath();
      x.moveTo(-w0, y0);
      x.lineTo(w1, y1);
      x.stroke();
    }
    x.restore();
    x.fillStyle = C.solid;
    x.fillRect(-hw - 1, -3, hw * 2 + 2, 4);
    x.strokeStyle = C.ink;
    x.lineWidth = 2.6;
    x.lineJoin = "round";
    x.stroke(b);
    x.strokeRect(-hw - 1, -3, hw * 2 + 2, 4);
  }
  function eyeSock(x, e) {
    x.fillStyle = C.ink;
    x.fill(circ(e));
    x.fillStyle = C.deep;
    x.beginPath();
    x.arc(0, 0, e * 0.86, 0, TAU);
    x.fill();
  }
  function eyeIris(x, e, hot) {
    var r = e * 0.64;
    x.fillStyle = hot ? C.hot : C.acc;
    x.fill(circ(r));
    x.fillStyle = hot ? C.label : C.solid;
    x.beginPath();
    x.arc(0, 0, r, 0.15 * Math.PI, 0.85 * Math.PI);
    x.arc(0, 0, r * 0.62, 0.85 * Math.PI, 0.15 * Math.PI, true);
    x.fill();
    x.strokeStyle = C.ink;
    x.lineWidth = 1.6;
    x.stroke(circ(r));
    x.fillStyle = C.ink;
    x.fill(circ(hot ? r * 0.3 : r * 0.44));
    x.fillStyle = C.bone;
    x.fill(circ(r * 0.2, -r * 0.36, -r * 0.4));
    x.fill(circ(r * 0.09, r * 0.3, r * 0.34));
  }
  function eyeLid(x, e) {
    var d = circ(e * 1.02, 0, e);
    x.fillStyle = C.hull;
    x.fill(d);
    x.strokeStyle = C.muted;
    x.lineWidth = 1.8;
    x.beginPath();
    x.arc(0, e, e * 0.9, 0.18 * Math.PI, 0.82 * Math.PI);
    x.stroke();
    x.strokeStyle = C.ink;
    x.lineWidth = 2.4;
    x.stroke(d);
  }
  function eyeRim(x, e) {
    x.strokeStyle = C.ink;
    x.lineWidth = e * 0.34;
    x.stroke(circ(e * 1.06));
    x.strokeStyle = C.muted;
    x.lineWidth = e * 0.16;
    x.stroke(circ(e * 1.06));
    x.strokeStyle = C.bone;
    x.lineWidth = e * 0.1;
    x.beginPath();
    x.arc(0, 0, e * 1.06, Math.PI * 1.1, Math.PI * 1.5);
    x.stroke();
  }
  function eyeBrow(x, e) {
    var R = e * 1.12, b = P();
    b.moveTo(-R * 0.96, -e * 0.34);
    b.lineTo(0, e * 0.02);
    b.lineTo(R * 0.96, -e * 0.34);
    b.arc(0, 0, R, -0.34, Math.PI + 0.34, true);
    b.closePath();
    x.fillStyle = C.hull;
    x.fill(b);
    x.fillStyle = C.plate;
    x.fill(poly([R * 0.2, -e * 0.24, R * 0.96, -e * 0.34, R * 0.8, -e * 0.62]));
    x.strokeStyle = C.bone;
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(-R * 0.86, -e * 0.38);
    x.lineTo(0, -e * 0.06);
    x.stroke();
    x.strokeStyle = C.muted;
    x.beginPath();
    x.moveTo(0, -e * 0.06);
    x.lineTo(R * 0.86, -e * 0.38);
    x.stroke();
    x.strokeStyle = C.ink;
    x.lineWidth = 2.6;
    x.lineJoin = "round";
    x.stroke(b);
  }
  function virusSpikes(x) {
    for (var j = 0; j < 12; j++) {
      x.save();
      x.rotate(j * TAU / 12);
      x.translate(0, -26);
      if (j % 2) spike(x, 17, 6.4, false);
      else spike(x, 26, 8.2, true);
      x.restore();
    }
  }
  function virusBody(x) {
    var r = 31, c = circ(r), j, a;
    ball(x, r, C.hull, C.plate, C.bone, 4.2);
    x.save();
    x.clip(c);
    patch(x, c, [-30, -8, -18, -22, -10, -14, -22, 2], C.deep);
    patch(x, c, [12, 18, 26, 6, 32, 20, 18, 32], C.deep);
    patch(x, c, [-26, 12, -16, 16, -18, 26, -28, 22], C.solid);
    patch(x, c, [10, -30, 22, -24, 16, -18], C.solid);
    x.strokeStyle = C.ink;
    x.lineWidth = 2;
    x.stroke(circ(22.5));
    for (j = 0; j < 8; j++) {
      a = j * TAU / 8 + 0.39;
      seam(x, Math.cos(a) * 22.5, Math.sin(a) * 22.5, Math.cos(a) * 31, Math.sin(a) * 31, 1.8);
    }
    x.restore();
    for (j = 0; j < 8; j++) {
      a = j * TAU / 8;
      rivet(x, Math.cos(a) * 26.5, Math.sin(a) * 26.5, 1.4);
    }
    x.strokeStyle = C.ink;
    x.lineWidth = 4.2;
    x.stroke(c);
  }
  function virusSpike1(x) {
    spike(x, 26, 8.2, true);
  }
  function botBody(x) {
    var r = 27, c = circ(r);
    ball(x, r, C.hull, C.plate, C.bone, 4.2);
    x.save();
    x.clip(c);
    x.fillStyle = C.solid;
    x.fillRect(-30, -2, 60, 17);
    x.fillStyle = C.label;
    x.fillRect(-30, -2, 60, 2.2);
    x.fillStyle = C.deep;
    x.fillRect(-30, 12, 60, 3);
    patch(x, c, [-24, -20, -14, -24, -16, -14], C.deep);
    seam(x, -30, -2, 30, -2, 2);
    seam(x, -30, 15, 30, 15, 2);
    seam(x, 0, -27, 0, -2, 1.8);
    x.restore();
    rivet(x, -18, -12, 1.4);
    rivet(x, 18, -12, 1.4);
    rivet(x, -21, 20, 1.3);
    rivet(x, 21, 20, 1.3);
    x.fillStyle = C.ink;
    x.fill(poly([-15, -1, 15, -1, 18, 6, 15, 15, -15, 15, -18, 6]));
    x.strokeStyle = C.ink;
    x.lineWidth = 4.2;
    x.stroke(c);
  }
  function botAntenna(x) {
    x.fillStyle = C.ink;
    x.fillRect(-3.4, -24, 6.8, 26);
    x.fillStyle = C.muted;
    x.fillRect(-1.8, -23, 3.6, 24);
    x.fillStyle = C.bone;
    x.fillRect(-1.8, -23, 1.2, 24);
    x.fillStyle = C.hull;
    x.fill(poly([-5, 2, 5, 2, 4, -4, -4, -4]));
    x.strokeStyle = C.ink;
    x.lineWidth = 2;
    x.stroke(poly([-5, 2, 5, 2, 4, -4, -4, -4]));
    x.save();
    x.translate(0, -27);
    ball(x, 5.6, C.acc, C.solid, C.bone, 2.6);
    x.restore();
  }
  function botLeg(x) {
    var b = poly([-5, -2, 6, -3, 12, 9, 11, 26, 5, 14, -3, 5]);
    x.fillStyle = C.muted;
    x.fill(b);
    x.fillStyle = C.bone;
    x.fill(poly([-5, -2, 0, -2.5, 7, 11, 11, 26, 5, 14, -3, 5]));
    seam(x, 1, 3, 7, 4, 1.6);
    seam(x, 4, 9, 9.5, 10, 1.6);
    x.strokeStyle = C.ink;
    x.lineWidth = 2.6;
    x.lineJoin = "round";
    x.stroke(b);
  }
  function spyBody(x) {
    var r = 25, c = circ(r), j, a;
    ball(x, r, C.hull, C.plate, C.bone, 4.2);
    x.save();
    x.clip(c);
    x.strokeStyle = C.solid;
    x.lineWidth = 3.4;
    x.stroke(circ(23));
    x.restore();
    for (j = 0; j < 4; j++) {
      a = j * TAU / 4 + TAU / 8;
      rivet(x, Math.cos(a) * 21.5, Math.sin(a) * 21.5, 1.3);
    }
    x.strokeStyle = C.ink;
    x.lineWidth = 4.2;
    x.stroke(c);
  }
  function spySpikes(x) {
    var A = [-0.5, 0, 0.5, Math.PI - 0.45, Math.PI, Math.PI + 0.45], j;
    for (j = 0; j < A.length; j++) {
      x.save();
      x.rotate(A[j]);
      x.translate(0, -24);
      spike(x, 9, 3.8, false);
      x.restore();
    }
  }
  function spyWing(x) {
    var T = [-31, -16, -36, -3, -30, 10], j, f, tx, ty, y0;
    for (j = 2; j >= 0; j--) {
      tx = T[j * 2];
      ty = T[j * 2 + 1];
      y0 = -3 + j * 5;
      f = P();
      f.moveTo(0, y0 - 3);
      f.quadraticCurveTo(tx * 0.5, ty - 9 + j * 2, tx, ty);
      f.quadraticCurveTo(tx * 0.5, ty + 7, 0, y0 + 4);
      f.closePath();
      x.fillStyle = j === 1 ? C.muted : C.bone;
      x.fill(f);
      x.strokeStyle = C.ink;
      x.lineWidth = 2.4;
      x.lineJoin = "round";
      x.stroke(f);
    }
    x.fillStyle = C.hull;
    x.fill(poly([3, -7, -6, -7, -6, 16, 3, 16]));
    x.strokeStyle = C.ink;
    x.lineWidth = 2.2;
    x.stroke(poly([3, -7, -6, -7, -6, 16, 3, 16]));
  }
  function spyRod(x) {
    x.fillStyle = C.ink;
    x.fillRect(-3, -22, 6, 24);
    x.fillStyle = C.solid;
    x.fillRect(-1.6, -21, 3.2, 22);
    x.fillStyle = C.label;
    x.fillRect(-1.6, -21, 1, 22);
    x.fillStyle = C.hull;
    x.fill(circ(4.4, 0, -22));
    x.strokeStyle = C.ink;
    x.lineWidth = 2;
    x.stroke(circ(4.4, 0, -22));
  }
  function rotor(x, r) {
    var j, a;
    x.fillStyle = C.plate;
    x.fill(circ(r));
    x.strokeStyle = C.ink;
    x.lineWidth = 3;
    x.stroke(circ(r));
    x.strokeStyle = C.muted;
    x.lineWidth = 2;
    x.stroke(circ(r - 3));
    for (j = 0; j < 6; j++) {
      a = j * TAU / 6;
      x.strokeStyle = C.ink;
      x.lineWidth = 4.4;
      x.beginPath();
      x.moveTo(0, 0);
      x.lineTo(Math.cos(a) * (r - 2), Math.sin(a) * (r - 2));
      x.stroke();
      x.strokeStyle = C.bone;
      x.lineWidth = 1.6;
      x.stroke();
    }
    x.fillStyle = C.solid;
    x.fill(circ(r * 0.24));
    x.strokeStyle = C.ink;
    x.lineWidth = 2;
    x.stroke(circ(r * 0.24));
  }
  function minerBody(x) {
    var r = 28, c = circ(r);
    ball(x, r, C.solid, C.deep, C.label, 4.2);
    x.save();
    x.clip(c);
    patch(x, c, [-28, 10, -16, 4, -12, 20, -26, 26], C.hull);
    patch(x, c, [14, -26, 26, -16, 20, -10, 10, -18], C.deep);
    seam(x, -28, -6, 28, -6, 1.8);
    seam(x, -10, -28, -14, -6, 1.6);
    seam(x, 12, -28, 14, -6, 1.6);
    x.restore();
    var v = poly([-17, -2, 17, -2, 20, 6, 17, 17, -17, 17, -20, 6]);
    x.fillStyle = C.plate;
    x.fill(v);
    x.strokeStyle = C.ink;
    x.lineWidth = 3;
    x.lineJoin = "round";
    x.stroke(v);
    rivet(x, -15, 1.5, 1.2);
    rivet(x, 15, 1.5, 1.2);
    x.fillStyle = C.hull;
    x.fill(circ(5, -27, 4));
    x.fill(circ(5, 27, 4));
    x.strokeStyle = C.ink;
    x.lineWidth = 2.4;
    x.stroke(circ(5, -27, 4));
    x.stroke(circ(5, 27, 4));
    x.strokeStyle = C.ink;
    x.lineWidth = 4.2;
    x.stroke(c);
  }
  function minerHousing(x) {
    var h = poly([-14, 0, -12, -8, 12, -8, 14, 0]);
    x.fillStyle = C.hull;
    x.fill(h);
    x.strokeStyle = C.ink;
    x.lineWidth = 2.6;
    x.stroke(h);
    x.strokeStyle = C.muted;
    x.lineWidth = 1.4;
    x.beginPath();
    x.moveTo(-11, -6);
    x.lineTo(11, -6);
    x.stroke();
  }
  function minerPick(x) {
    x.save();
    x.rotate(-0.5);
    x.fillStyle = C.ink;
    x.fillRect(-3.4, -30, 6.8, 31);
    x.fillStyle = C.solid;
    x.fillRect(-1.8, -29, 3.6, 29);
    x.fillStyle = C.label;
    x.fillRect(-1.8, -29, 1.1, 29);
    var h = P();
    h.moveTo(-22, -24);
    h.quadraticCurveTo(-12, -40, 0, -36);
    h.quadraticCurveTo(12, -40, 22, -24);
    h.quadraticCurveTo(10, -32, 0, -30);
    h.quadraticCurveTo(-10, -32, -22, -24);
    h.closePath();
    x.fillStyle = C.plate;
    x.fill(h);
    x.strokeStyle = C.muted;
    x.lineWidth = 1.6;
    x.beginPath();
    x.moveTo(-18, -27);
    x.quadraticCurveTo(-10, -37, 0, -34);
    x.stroke();
    x.strokeStyle = C.ink;
    x.lineWidth = 2.6;
    x.lineJoin = "round";
    x.stroke(h);
    x.fillStyle = C.hull;
    x.fillRect(-3.6, -36, 7.2, 8);
    x.strokeRect(-3.6, -36, 7.2, 8);
    x.restore();
    x.fillStyle = C.hull;
    x.fill(circ(4.6));
    x.strokeStyle = C.ink;
    x.lineWidth = 2.2;
    x.stroke(circ(4.6));
  }
  function minerDrill(x, ph) {
    drill(x, 24, 7.5, ph);
  }
  function bombArt(x) {
    x.fillStyle = C.ink;
    x.fill(circ(7.6));
    x.fillStyle = C.acc;
    x.fill(circ(6.4));
    x.fillStyle = C.bone;
    x.fill(circ(4.2));
    x.fillStyle = C.acc;
    x.fillRect(-0.9, -4.2, 1.8, 3);
    x.fillRect(-0.9, 1.2, 1.8, 3);
  }
  function drillShotArt(x) {
    drill(x, 22, 6, 0);
  }
  var EYE = { 0: 15, 1: 10.5, 2: 16, 3: 11 };
  function eyeParts(e) {
    var s = e * 1.3 + 4;
    return [
      ["sock", s * 2, s * 2, s, s, function(x) {
        eyeSock(x, e);
      }],
      ["iris", e * 1.6, e * 1.6, e * 0.8, e * 0.8, function(x) {
        eyeIris(x, e, 0);
      }],
      ["irisH", e * 1.6, e * 1.6, e * 0.8, e * 0.8, function(x) {
        eyeIris(x, e, 1);
      }],
      ["lid", e * 2.3, e * 2.3, e * 1.15, 2, function(x) {
        x.translate(0, 0.5);
        eyeLid(x, e);
      }],
      ["rim", s * 2, s * 2, s, s, function(x) {
        eyeRim(x, e);
      }],
      ["brow", e * 2.6, e * 1.6, e * 1.3, e * 1.3, function(x) {
        eyeBrow(x, e);
      }]
    ];
  }
  var PARTS = [
    [["spikes", 116, 116, 58, 58, virusSpikes], ["body", 72, 72, 36, 36, virusBody], ["spike1", 22, 30, 11, 28, virusSpike1]],
    [["body", 64, 64, 32, 32, botBody], ["ant", 18, 40, 9, 34, botAntenna], ["leg", 26, 34, 8, 6, botLeg]],
    [["body", 58, 58, 29, 29, spyBody], ["spikes", 76, 76, 38, 38, spySpikes], ["wing", 44, 50, 38, 24, spyWing], ["rod", 14, 32, 7, 28, spyRod], ["rotor", 44, 44, 22, 22, function(x) {
      rotor(x, 19);
    }]],
    [
      ["body", 74, 66, 37, 33, minerBody],
      ["house", 34, 14, 17, 11, minerHousing],
      ["fan", 36, 36, 18, 18, function(x) {
        rotor(x, 15);
      }],
      ["pick", 52, 46, 33, 40, minerPick],
      ["drill0", 20, 30, 10, 4, function(x) {
        minerDrill(x, 0);
      }],
      ["drill1", 20, 30, 10, 4, function(x) {
        minerDrill(x, 1);
      }]
    ]
  ];
  function eyeSize(ty) {
    return EYE[ty];
  }
  function eyePartList(ty) {
    return eyeParts(EYE[ty]);
  }

  // src/wrogowie/art2.js
  var WORM = 4;
  var TROJAN = 5;
  var RANSOM = 6;
  var PHISH = 7;
  var ROOTKIT = 8;
  var KEYLOG = 9;
  var LOGIC = 10;
  var SPAM = 11;
  var DRONE = 12;
  var ADWARE = 13;
  var MOB_NAMES2 = ["Worm", "Trojan", "Ransomware", "Phishing", "Rootkit", "Keylogger", "Logic Bomb", "Spam Swarm", "Dron trojana", "Adware"];
  var EYE2 = [11, 7, 11, 9, 13, 10, 11, 6.5, 7, 9];
  var SZ2 = [1.25, 2.1, 1.85, 1.65, 1.5, 1.55, 1.45, 0.9, 1.15, 1.45];
  var TAU2 = Math.PI * 2;
  function rr(x0, y0, x1, y1, r) {
    var p = P();
    p.moveTo(x0 + r, y0);
    p.lineTo(x1 - r, y0);
    p.quadraticCurveTo(x1, y0, x1, y0 + r);
    p.lineTo(x1, y1 - r);
    p.quadraticCurveTo(x1, y1, x1 - r, y1);
    p.lineTo(x0 + r, y1);
    p.quadraticCurveTo(x0, y1, x0, y1 - r);
    p.lineTo(x0, y0 + r);
    p.quadraticCurveTo(x0, y0, x0 + r, y0);
    p.closePath();
    return p;
  }
  function plate(x, p, fill, shade, rim, lw, x0, y0, x1, y1) {
    x.fillStyle = shade;
    x.fill(p);
    x.save();
    x.clip(p);
    x.fillStyle = fill;
    x.fillRect(x0 - 2, y0 - 2, (x1 - x0) * 0.86 + 2, (y1 - y0) * 0.8 + 2);
    x.strokeStyle = rim;
    x.lineWidth = 2.4;
    x.beginPath();
    x.moveTo(x0 + 3, y1 - 6);
    x.lineTo(x0 + 3, y0 + 3);
    x.lineTo(x1 - 8, y0 + 3);
    x.stroke();
    x.restore();
    x.strokeStyle = C.ink;
    x.lineWidth = lw || 3.6;
    x.lineJoin = "round";
    x.stroke(p);
  }
  function spikeAt(x, X, Y, a, L, hw, band) {
    x.save();
    x.translate(X, Y);
    x.rotate(a);
    spike(x, L, hw, band);
    x.restore();
  }
  function wormHead(x) {
    var b = P();
    b.moveTo(-20, -18);
    b.lineTo(8, -21);
    b.quadraticCurveTo(26, -20, 28, -4);
    b.lineTo(28, 8);
    b.quadraticCurveTo(26, 20, 10, 21);
    b.lineTo(-20, 19);
    b.quadraticCurveTo(-25, 0, -20, -18);
    b.closePath();
    spikeAt(x, -8, -18, -0.15, 13, 5, false);
    spikeAt(x, 6, -20, 0.1, 15, 5.5, true);
    plate(x, b, C.hull, C.plate, C.bone, 4, -24, -21, 28, 21);
    x.save();
    x.clip(b);
    x.fillStyle = C.bone;
    x.fillRect(-20, -22, 9, 44);
    x.fillStyle = C.muted;
    x.fillRect(-14, -22, 3, 44);
    patch(x, b, [-20, 6, -12, 2, -10, 14, -18, 18], C.deep);
    x.fillStyle = C.solid;
    x.fill(poly([12, 10, 29, 6, 29, 22, 12, 22]));
    x.fillStyle = C.bone;
    for (var j = 0; j < 3; j++) x.fill(poly([14 + j * 5, 10, 17 + j * 5, 10, 15.5 + j * 5, 15]));
    seam(x, -11, -22, -11, 22, 2);
    seam(x, 12, 10, 29, 6, 2);
    x.restore();
    rivet(x, -16, -12, 1.3);
    rivet(x, -16, 12, 1.3);
    rivet(x, 22, -12, 1.2);
    x.strokeStyle = C.ink;
    x.lineWidth = 4;
    x.stroke(b);
  }
  function wormSeg(x) {
    var b = rr(-15, -17, 15, 17, 8);
    spikeAt(x, 0, -15, 0, 11, 4.6, false);
    spikeAt(x, 0, 15, Math.PI, 9, 4, false);
    plate(x, b, C.bone, C.muted, C.bone, 3.8, -15, -17, 15, 17);
    x.save();
    x.clip(b);
    x.fillStyle = C.hull;
    x.fillRect(-15, -18, 8, 36);
    x.fillRect(5, -18, 6, 36);
    x.fillStyle = C.plate;
    x.fillRect(-9, -18, 2, 36);
    patch(x, b, [-4, -17, 6, -12, 2, -4, -6, -8], C.deep);
    patch(x, b, [6, 8, 15, 6, 15, 17, 4, 17], C.solid);
    seam(x, -7, -18, -7, 18, 2);
    seam(x, 5, -18, 5, 18, 2);
    x.restore();
    rivet(x, -11, 0, 1.2);
    rivet(x, 8, -10, 1.1);
    x.strokeStyle = C.ink;
    x.lineWidth = 3.8;
    x.stroke(b);
  }
  function wormTail(x) {
    var b = rr(-9, -12, 11, 12, 6);
    spikeAt(x, -8, 0, -Math.PI / 2, 14, 5.5, true);
    plate(x, b, C.hull, C.plate, C.bone, 3.6, -9, -12, 11, 12);
    x.save();
    x.clip(b);
    x.fillStyle = C.bone;
    x.fillRect(0, -13, 5, 26);
    x.restore();
    x.strokeStyle = C.ink;
    x.lineWidth = 3.6;
    x.stroke(b);
  }
  function trojanBody(x) {
    var b = P();
    b.moveTo(-22, -14);
    b.lineTo(20, -16);
    b.quadraticCurveTo(30, -14, 30, -2);
    b.lineTo(28, 12);
    b.quadraticCurveTo(26, 18, 18, 18);
    b.lineTo(-20, 18);
    b.quadraticCurveTo(-28, 16, -27, 4);
    b.lineTo(-27, -6);
    b.quadraticCurveTo(-27, -13, -22, -14);
    b.closePath();
    plate(x, b, C.bone, C.muted, C.bone, 4, -28, -16, 30, 18);
    x.save();
    x.clip(b);
    x.fillStyle = C.hull;
    x.fill(poly([-4, -18, 18, -18, 22, -8, 0, -6]));
    x.fillStyle = C.plate;
    x.fill(poly([0, -6, 22, -8, 24, -4, 2, -2]));
    patch(x, b, [-24, -8, -14, -12, -12, -2, -22, 2], C.deep);
    patch(x, b, [16, 4, 28, 0, 28, 14, 18, 16], C.deep);
    patch(x, b, [-10, 10, -2, 8, -4, 18, -12, 18], C.solid);
    seam(x, -12, -16, -14, 18, 2);
    seam(x, 14, -16, 15, 18, 2);
    x.fillStyle = C.ink;
    x.fillRect(-9, 2, 20, 16);
    x.fillStyle = C.acc;
    x.fill(circ(2.4, -3, 10));
    x.fill(circ(2.4, 5, 10));
    x.fillStyle = C.bone;
    x.fill(circ(0.8, -3.6, 9.4));
    x.fill(circ(0.8, 4.4, 9.4));
    x.restore();
    rivet(x, -20, -9, 1.3);
    rivet(x, 24, -10, 1.3);
    rivet(x, -20, 12, 1.2);
    rivet(x, 24, 10, 1.2);
    x.strokeStyle = C.ink;
    x.lineWidth = 2.6;
    x.strokeRect(-9, 2, 20, 16);
    x.lineWidth = 4;
    x.stroke(b);
  }
  function trojanHead(x) {
    var n = poly([-4, 6, 8, 2, 2, -18, -12, -20]);
    plate(x, n, C.bone, C.muted, C.bone, 3.6, -12, -20, 8, 6);
    var h = P();
    h.moveTo(-10, -30);
    h.lineTo(0, -26);
    h.lineTo(2, -16);
    h.lineTo(-12, -12);
    h.lineTo(-28, -8);
    h.quadraticCurveTo(-34, -10, -33, -16);
    h.lineTo(-24, -26);
    h.closePath();
    plate(x, h, C.bone, C.muted, C.bone, 3.8, -34, -30, 2, -8);
    x.save();
    x.clip(h);
    x.fillStyle = C.hull;
    x.fill(poly([-34, -16, -26, -14, -28, -6, -36, -8]));
    x.fillStyle = C.ink;
    x.fill(circ(1.3, -30, -12));
    seam(x, -22, -26, -18, -12, 1.8);
    patch(x, h, [-14, -24, -6, -26, -8, -18], C.deep);
    x.restore();
    x.fillStyle = C.hull;
    x.fill(poly([-8, -30, -4, -38, 0, -28]));
    x.strokeStyle = C.ink;
    x.lineWidth = 2.4;
    x.stroke(poly([-8, -30, -4, -38, 0, -28]));
    for (var j = 0; j < 5; j++) {
      var mx = -2 + j * 2.6, my = -30 + j * 5.4, f = poly([mx, my, mx + 9, my - 6, mx + 6, my + 3]);
      x.fillStyle = j & 1 ? C.solid : C.acc;
      x.fill(f);
      x.strokeStyle = C.ink;
      x.lineWidth = 2.2;
      x.stroke(f);
    }
    x.strokeStyle = C.ink;
    x.lineWidth = 3.8;
    x.stroke(h);
  }
  function trojanLeg(x) {
    var l = rr(-5, -4, 5, 19, 3);
    plate(x, l, C.bone, C.muted, C.bone, 3, -5, -4, 5, 19);
    seam(x, -5, 7, 5, 7, 1.8);
    rivet(x, 0, 7, 1.4);
    x.fillStyle = C.plate;
    x.fill(circ(5.6, 0, 21));
    x.strokeStyle = C.ink;
    x.lineWidth = 3;
    x.stroke(circ(5.6, 0, 21));
    x.fillStyle = C.solid;
    x.fill(circ(2.2, 0, 21));
    x.strokeStyle = C.ink;
    x.lineWidth = 1.4;
    x.stroke(circ(2.2, 0, 21));
  }
  function trojanTail(x) {
    for (var j = 0; j < 6; j++) {
      var a = -2.4 + j * 0.62, X = 8 + Math.cos(a) * 11, Y = -4 + Math.sin(a) * 11, s = circ(4.4 - j * 0.35, X, Y);
      x.fillStyle = j & 1 ? C.solid : C.acc;
      x.fill(s);
      x.strokeStyle = C.ink;
      x.lineWidth = 2.2;
      x.stroke(s);
    }
  }
  function trojanHatch(x) {
    var h = poly([0, 0, 20, 0, 20, 4, 0, 4]);
    x.fillStyle = C.hull;
    x.fill(h);
    x.fillStyle = C.bone;
    x.fillRect(0, 0, 20, 1.2);
    x.strokeStyle = C.ink;
    x.lineWidth = 2.4;
    x.stroke(h);
    rivet(x, 16, 2, 0.9);
  }
  function ransomBody(x) {
    var b = rr(-25, -21, 25, 22, 4), j;
    for (j = -1; j <= 1; j++) spikeAt(x, j * 15, 21, Math.PI, j ? 8 : 10, 4, false);
    spikeAt(x, -22, -20, -0.4, 9, 4, false);
    spikeAt(x, 22, -20, 0.4, 9, 4, false);
    plate(x, b, C.bone, C.muted, C.bone, 4.2, -25, -21, 25, 22);
    x.save();
    x.clip(b);
    x.strokeStyle = C.hull;
    x.lineWidth = 3.2;
    x.strokeRect(-19, -15, 38, 31);
    x.fillStyle = C.solid;
    x.fillRect(-25, -21, 50, 4);
    x.fillStyle = C.label;
    x.fillRect(-25, -21, 50, 1.2);
    patch(x, b, [-25, 4, -16, 0, -14, 14, -25, 20], C.deep);
    patch(x, b, [14, -16, 25, -12, 25, -2, 18, -6], C.deep);
    x.fillStyle = C.ink;
    x.fill(poly([-4, 9, 4, 9, 6, 19, -6, 19]));
    x.restore();
    rivet(x, -20, -11, 1.4);
    rivet(x, 20, -11, 1.4);
    rivet(x, -20, 16, 1.4);
    rivet(x, 20, 16, 1.4);
    x.strokeStyle = C.ink;
    x.lineWidth = 4.2;
    x.stroke(b);
  }
  function ransomShackle(x) {
    var p = P();
    p.moveTo(-14, 2);
    p.lineTo(-14, -14);
    p.arc(0, -14, 14, Math.PI, 0);
    p.lineTo(14, 2);
    x.lineCap = "butt";
    x.strokeStyle = C.ink;
    x.lineWidth = 12;
    x.stroke(p);
    x.strokeStyle = C.hull;
    x.lineWidth = 7.5;
    x.stroke(p);
    x.strokeStyle = C.muted;
    x.lineWidth = 1.8;
    x.beginPath();
    x.arc(0, -14, 15.2, Math.PI * 1.05, Math.PI * 1.5);
    x.stroke();
  }
  function ransomLink(x) {
    x.strokeStyle = C.ink;
    x.lineWidth = 5;
    x.beginPath();
    x.ellipse(0, 0, 5, 3.4, 0, 0, TAU2);
    x.stroke();
    x.strokeStyle = C.hull;
    x.lineWidth = 2.4;
    x.stroke();
    x.strokeStyle = C.muted;
    x.lineWidth = 1;
    x.beginPath();
    x.ellipse(0, 0, 5, 3.4, 0, Math.PI * 1.1, Math.PI * 1.7);
    x.stroke();
  }
  function ransomClaw(x) {
    var c = rr(-6, -3, 6, 6, 2);
    x.fillStyle = C.hull;
    x.fill(c);
    x.strokeStyle = C.ink;
    x.lineWidth = 2.6;
    x.stroke(c);
    var l = P();
    l.moveTo(-5, 5);
    l.quadraticCurveTo(-13, 12, -6, 20);
    l.lineTo(-4, 14);
    l.quadraticCurveTo(-6, 10, -1, 6);
    l.closePath();
    var r = P();
    r.moveTo(5, 5);
    r.quadraticCurveTo(13, 12, 6, 20);
    r.lineTo(4, 14);
    r.quadraticCurveTo(6, 10, 1, 6);
    r.closePath();
    x.fillStyle = C.solid;
    x.fill(l);
    x.fill(r);
    x.fillStyle = C.bone;
    x.fill(poly([-6, 20, -4, 14, -7, 15]));
    x.fill(poly([6, 20, 4, 14, 7, 15]));
    x.strokeStyle = C.ink;
    x.lineWidth = 2.4;
    x.stroke(l);
    x.stroke(r);
  }
  function ransomShield(x) {
    var s = P();
    s.moveTo(-16, -6);
    s.lineTo(16, -6);
    s.lineTo(18, 4);
    s.lineTo(12, 12);
    s.lineTo(-12, 12);
    s.lineTo(-18, 4);
    s.closePath();
    x.fillStyle = C.deep;
    x.fill(s);
    x.save();
    x.clip(s);
    x.fillStyle = C.solid;
    x.fillRect(-18, -6, 32, 13);
    x.fillStyle = C.label;
    x.fillRect(-18, -6, 34, 1.6);
    x.restore();
    x.strokeStyle = C.ink;
    x.lineWidth = 3.4;
    x.lineJoin = "round";
    x.stroke(s);
    x.strokeStyle = C.ink;
    x.lineWidth = 3.6;
    x.beginPath();
    x.arc(0, 0, 4, Math.PI, 0);
    x.stroke();
    x.strokeStyle = C.bone;
    x.lineWidth = 1.6;
    x.stroke();
    x.fillStyle = C.bone;
    x.fillRect(-5.5, 0, 11, 8);
    x.strokeStyle = C.ink;
    x.lineWidth = 2;
    x.strokeRect(-5.5, 0, 11, 8);
    x.fillStyle = C.ink;
    x.fill(circ(1.4, 0, 3.2));
    x.fillRect(-0.7, 3.5, 1.4, 3);
    rivet(x, -13, 3, 1.1);
    rivet(x, 13, 3, 1.1);
  }
  function keyArt(x) {
    x.strokeStyle = C.ink;
    x.lineWidth = 6;
    x.beginPath();
    x.arc(-6, 0, 5, 0, TAU2);
    x.stroke();
    x.strokeStyle = C.ally;
    x.lineWidth = 3;
    x.stroke();
    x.fillStyle = C.ink;
    x.fillRect(-2, -2.6, 16, 5.2);
    x.fillRect(8, 0, 3, 7);
    x.fillRect(12, 0, 3, 6);
    x.fillStyle = C.bone;
    x.fillRect(-1, -1.4, 14, 2.8);
    x.fillRect(9, 0, 1.4, 5.6);
    x.fillRect(13, 0, 1.4, 4.6);
    x.fillStyle = C.bone;
    x.fill(circ(1.6, -6, 0));
  }
  function creditArt(big) {
    return function(x) {
      var r = big ? 8 : 5.6, p = poly([-r * 0.5, -r, r * 0.5, -r, r, -r * 0.5, r, r * 0.5, r * 0.5, r, -r * 0.5, r, -r, r * 0.5, -r, -r * 0.5]);
      x.fillStyle = C.ink;
      x.fill(poly([-r * 0.5 - 1.6, -r - 1.6, r * 0.5 + 1.6, -r - 1.6, r + 1.6, -r * 0.5 - 1.6, r + 1.6, r * 0.5 + 1.6, r * 0.5 + 1.6, r + 1.6, -r * 0.5 - 1.6, r + 1.6, -r - 1.6, r * 0.5 + 1.6, -r - 1.6, -r * 0.5 - 1.6]));
      x.fillStyle = big ? C.ally : C.allyDeep;
      x.fill(p);
      x.strokeStyle = C.bone;
      x.lineWidth = big ? 1.8 : 1.4;
      x.beginPath();
      x.arc(0, 0, r * 0.5, 0.35 * Math.PI, 1.65 * Math.PI);
      x.stroke();
      x.beginPath();
      x.moveTo(-r * 0.2, -r * 0.62);
      x.lineTo(-r * 0.2, r * 0.62);
      x.stroke();
    };
  }
  function chargeArt(x) {
    x.fillStyle = C.ink;
    x.fill(circ(9));
    x.fillStyle = C.ally;
    x.fill(circ(7.6));
    x.fillStyle = C.bone;
    x.fill(circ(5.4));
    x.fillStyle = C.ink;
    x.fillRect(-1, -9, 2, 4);
    x.fill(circ(2.2));
  }
  function armorArt(x) {
    var p = poly([-16, -5, 16, -5, 19, 0, 16, 6, -16, 6, -19, 0]);
    x.fillStyle = C.muted;
    x.fill(p);
    x.fillStyle = C.bone;
    x.fillRect(-16, -5, 32, 2);
    x.strokeStyle = C.ink;
    x.lineWidth = 2.6;
    x.lineJoin = "round";
    x.stroke(p);
    rivet(x, -12, 1, 1.2);
    rivet(x, 0, 1, 1.2);
    rivet(x, 12, 1, 1.2);
  }
  var DROP_ART = [creditArt(false), creditArt(true), keyArt, chargeArt];
  function phishBody(x) {
    var b = P(), j, k;
    b.moveTo(-28, -2);
    b.quadraticCurveTo(-20, -20, 4, -18);
    b.quadraticCurveTo(22, -16, 26, 0);
    b.quadraticCurveTo(22, 16, 2, 17);
    b.quadraticCurveTo(-18, 18, -28, 6);
    b.closePath();
    plate(x, b, C.bone, C.muted, C.bone, 4.2, -28, -20, 26, 18);
    x.save();
    x.clip(b);
    x.fillStyle = C.solid;
    x.fill(poly([-24, -12, 6, -22, 28, -8, 26, -3, 4, -10, -20, -6]));
    x.fillStyle = C.label;
    x.fill(poly([-24, -12, 6, -22, 10, -19, -20, -10]));
    x.strokeStyle = C.muted;
    x.lineWidth = 1.4;
    for (j = 0; j < 4; j++) for (k = 0; k < 3; k++) {
      x.beginPath();
      x.arc(-2 + j * 7, -2 + k * 6 + (j & 1) * 3, 3, 0.2 * Math.PI, 0.8 * Math.PI);
      x.stroke();
    }
    patch(x, b, [8, 6, 20, 2, 18, 14, 6, 14], C.deep);
    seam(x, -10, -14, -12, 16, 2.2);
    x.fillStyle = C.ink;
    x.fill(poly([-30, 0, -12, 4, -14, 12, -30, 8]));
    x.fillStyle = C.bone;
    for (j = 0; j < 4; j++) {
      x.fill(poly([-28 + j * 4, 0.6, -25 + j * 4, 1.4, -26.5 + j * 4, 5.5]));
      x.fill(poly([-28 + j * 4, 9, -25 + j * 4, 9.5, -26.5 + j * 4, 5]));
    }
    x.restore();
    x.strokeStyle = C.ink;
    x.lineWidth = 4.2;
    x.stroke(b);
  }
  function phishTail(x) {
    var f = P();
    f.moveTo(0, -3);
    f.lineTo(16, -16);
    f.lineTo(13, -4);
    f.lineTo(18, 0);
    f.lineTo(13, 4);
    f.lineTo(16, 16);
    f.lineTo(0, 3);
    f.closePath();
    x.fillStyle = C.solid;
    x.fill(f);
    x.fillStyle = C.label;
    x.fill(poly([0, -3, 16, -16, 12, -10]));
    x.strokeStyle = C.ink;
    x.lineWidth = 2.6;
    x.lineJoin = "round";
    x.stroke(f);
    seam(x, 2, 0, 14, -10, 1.2);
    seam(x, 2, 0, 14, 10, 1.2);
  }
  function phishFin(x) {
    var f = poly([-10, 0, -8, -10, -4, -3, 0, -13, 3, -3, 8, -11, 10, 0]);
    x.fillStyle = C.solid;
    x.fill(f);
    x.strokeStyle = C.ink;
    x.lineWidth = 2.4;
    x.lineJoin = "round";
    x.stroke(f);
  }
  function phishRod(x) {
    var p = P();
    p.moveTo(0, 0);
    p.quadraticCurveTo(-2, -30, -22, -30);
    x.lineCap = "round";
    x.strokeStyle = C.ink;
    x.lineWidth = 6.5;
    x.stroke(p);
    x.strokeStyle = C.hull;
    x.lineWidth = 3.6;
    x.stroke(p);
    x.strokeStyle = C.muted;
    x.lineWidth = 1;
    x.stroke(p);
    for (var j = 0; j < 4; j++) {
      var u = 0.15 + j * 0.24, v = 1 - u, X = 2 * v * u * -2 + u * u * -22, Y = 2 * v * u * -30 + u * u * -30;
      x.fillStyle = C.ink;
      x.fill(circ(2.4, X, Y));
      x.fillStyle = C.solid;
      x.fill(circ(1.4, X, Y));
    }
    x.fillStyle = C.solid;
    x.fill(circ(3.4, -22, -30));
    x.strokeStyle = C.ink;
    x.lineWidth = 2;
    x.stroke(circ(3.4, -22, -30));
  }
  function hookArt(x) {
    var p = P();
    p.moveTo(0, 0);
    p.lineTo(0, 12);
    p.arc(-5, 12, 5, 0, Math.PI * 0.95);
    x.lineCap = "round";
    x.strokeStyle = C.ink;
    x.lineWidth = 5;
    x.stroke(p);
    x.strokeStyle = C.muted;
    x.lineWidth = 2.4;
    x.stroke(p);
    x.strokeStyle = C.bone;
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(-0.6, 1);
    x.lineTo(-0.6, 11);
    x.stroke();
    x.fillStyle = C.bone;
    x.fill(poly([-10, 12, -12, 6, -7, 9]));
    x.strokeStyle = C.ink;
    x.lineWidth = 1.6;
    x.stroke(poly([-10, 12, -12, 6, -7, 9]));
    x.fillStyle = C.hull;
    x.fill(circ(2.6));
    x.strokeStyle = C.ink;
    x.lineWidth = 1.6;
    x.stroke(circ(2.6));
  }
  function rootBody(x) {
    var b = P();
    b.moveTo(0, -30);
    b.lineTo(8, -20);
    b.lineTo(18, -26);
    b.lineTo(20, -12);
    b.lineTo(30, -10);
    b.lineTo(24, 4);
    b.quadraticCurveTo(26, 18, 14, 22);
    b.lineTo(-14, 22);
    b.quadraticCurveTo(-26, 18, -24, 4);
    b.lineTo(-30, -10);
    b.lineTo(-20, -12);
    b.lineTo(-18, -26);
    b.lineTo(-8, -20);
    b.closePath();
    plate(x, b, C.hull, C.plate, C.bone, 4, -30, -30, 30, 22);
    x.save();
    x.clip(b);
    x.fillStyle = C.deep;
    x.fill(poly([-20, -12, -8, -20, 0, -30, 8, -20, 20, -12, 16, -8, 0, -14, -16, -8]));
    x.fillStyle = C.solid;
    x.fill(poly([-6, -21, 0, -29, 6, -21, 0, -17]));
    x.fillStyle = C.ink;
    x.beginPath();
    x.ellipse(0, 3, 16, 14, 0, 0, TAU2);
    x.fill();
    x.fillStyle = C.solid;
    x.fillRect(-30, 16, 60, 3);
    x.fillStyle = C.deep;
    x.fillRect(-30, 19, 60, 4);
    seam(x, -14, 22, -18, 4, 1.8);
    seam(x, 14, 22, 18, 4, 1.8);
    x.restore();
    rivet(x, -20, 10, 1.2);
    rivet(x, 20, 10, 1.2);
    x.strokeStyle = C.ink;
    x.lineWidth = 4;
    x.stroke(b);
  }
  function rootRoot(x) {
    var p = P();
    p.moveTo(-3.5, 0);
    p.quadraticCurveTo(-6, 10, -1, 16);
    p.quadraticCurveTo(3, 21, 0, 26);
    p.quadraticCurveTo(6, 20, 3, 14);
    p.quadraticCurveTo(1, 8, 3.5, 0);
    p.closePath();
    x.fillStyle = C.plate;
    x.fill(p);
    x.fillStyle = C.deep;
    x.fill(poly([-3, 2, 3, 2, 2, 8, -3, 8]));
    x.strokeStyle = C.ink;
    x.lineWidth = 2.4;
    x.lineJoin = "round";
    x.stroke(p);
    x.fillStyle = C.solid;
    x.fill(circ(1.6, 0, 26));
  }
  function keyBase(x) {
    var b = rr(-30, 2, 30, 18, 4), j, k;
    plate(x, b, C.hull, C.plate, C.bone, 3.8, -30, 2, 30, 18);
    for (k = 0; k < 2; k++) for (j = 0; j < 7; j++) {
      var X = -26 + j * 7.5 + k * 2, Y = 5 + k * 6, kc = rr(X, Y, X + 6, Y + 4.6, 1);
      x.fillStyle = (j + k * 3) % 5 === 2 ? C.solid : j % 3 === 1 ? C.muted : C.bone;
      x.fill(kc);
      x.strokeStyle = C.ink;
      x.lineWidth = 1.3;
      x.stroke(kc);
    }
    x.fillStyle = C.bone;
    x.fill(rr(-14, 13.4, 14, 16.6, 1));
    x.strokeStyle = C.ink;
    x.lineWidth = 1.3;
    x.stroke(rr(-14, 13.4, 14, 16.6, 1));
    for (j = -1; j <= 1; j += 2) {
      x.fillStyle = C.plate;
      x.fill(poly([j * 22, 18, j * 26, 18, j * 30, 26, j * 20, 26]));
      x.strokeStyle = C.ink;
      x.lineWidth = 2.4;
      x.stroke(poly([j * 22, 18, j * 26, 18, j * 30, 26, j * 20, 26]));
    }
    x.strokeStyle = C.ink;
    x.lineWidth = 3.8;
    x.stroke(b);
  }
  function keyTurret(x) {
    var d = P();
    d.moveTo(-17, 4);
    d.lineTo(-17, -6);
    d.arc(0, -6, 17, Math.PI, 0);
    d.lineTo(17, 4);
    d.closePath();
    plate(x, d, C.solid, C.deep, C.label, 4, -17, -23, 17, 4);
    x.save();
    x.clip(d);
    x.fillStyle = C.hull;
    x.fillRect(-18, -1, 36, 6);
    seam(x, -18, -1, 18, -1, 2);
    x.restore();
    rivet(x, -13, 1.5, 1.1);
    rivet(x, 13, 1.5, 1.1);
    x.strokeStyle = C.ink;
    x.lineWidth = 4;
    x.stroke(d);
  }
  function keyBarrel(x) {
    x.fillStyle = C.ink;
    x.fillRect(0, -5.5, 33, 11);
    x.fillStyle = C.muted;
    x.fillRect(1.5, -3.5, 30, 7);
    x.fillStyle = C.bone;
    x.fillRect(1.5, -3.5, 30, 2);
    x.fillStyle = C.solid;
    x.fillRect(14, -7.5, 9, 15);
    x.strokeStyle = C.ink;
    x.lineWidth = 2.4;
    x.strokeRect(14, -7.5, 9, 15);
    x.fillStyle = C.hot;
    x.fill(circ(6, 33, 0));
    x.strokeStyle = C.ink;
    x.lineWidth = 2.8;
    x.stroke(circ(6, 33, 0));
    x.fillStyle = C.bone;
    x.fill(circ(2.4, 33, 0));
  }
  function logicBody(x) {
    var r = 22, c = circ(r);
    ball(x, r, C.hull, C.plate, C.bone, 4.2);
    x.save();
    x.clip(c);
    x.fillStyle = C.solid;
    x.fillRect(-24, 10, 48, 7);
    x.fillStyle = C.label;
    x.fillRect(-24, 10, 48, 1.4);
    patch(x, c, [-20, -6, -12, -14, -8, -6, -18, 0], C.deep);
    seam(x, -24, 10, 24, 10, 2);
    seam(x, -24, 17, 24, 17, 2);
    x.restore();
    rivet(x, -15, 13.5, 1.1);
    rivet(x, 0, 13.5, 1.1);
    rivet(x, 15, 13.5, 1.1);
    x.strokeStyle = C.ink;
    x.lineWidth = 4.2;
    x.stroke(c);
  }
  function logicCap(x) {
    var b = rr(-7, -9, 7, 2, 2);
    x.fillStyle = C.muted;
    x.fill(b);
    x.fillStyle = C.bone;
    x.fillRect(-6, -8, 3, 9);
    x.strokeStyle = C.ink;
    x.lineWidth = 2.6;
    x.stroke(b);
    var w = P();
    w.moveTo(0, -9);
    w.quadraticCurveTo(6, -16, 2, -21);
    x.strokeStyle = C.ink;
    x.lineWidth = 4;
    x.stroke(w);
    x.strokeStyle = C.bone;
    x.lineWidth = 1.6;
    x.stroke(w);
  }
  function logicFin(x) {
    var f = poly([0, -6, 12, -12, 14, 8, 0, 6]);
    x.fillStyle = C.plate;
    x.fill(f);
    x.fillStyle = C.solid;
    x.fill(poly([8, -9.5, 12, -12, 14, 8, 10, 7.4]));
    x.strokeStyle = C.ink;
    x.lineWidth = 2.4;
    x.lineJoin = "round";
    x.stroke(f);
  }
  function sparkArt(x) {
    x.fillStyle = C.ink;
    x.fill(poly([0, -7, 2.4, -2.4, 7, 0, 2.4, 2.4, 0, 7, -2.4, 2.4, -7, 0, -2.4, -2.4]));
    x.fillStyle = C.hot;
    x.fill(poly([0, -5, 1.6, -1.6, 5, 0, 1.6, 1.6, 0, 5, -1.6, 1.6, -5, 0, -1.6, -1.6]));
    x.fillStyle = C.bone;
    x.fill(circ(1.4));
  }
  function digitArt(d) {
    return function(x) {
      var b = rr(-8, -9, 8, 9, 2);
      x.fillStyle = C.ink;
      x.fill(b);
      x.strokeStyle = C.acc;
      x.lineWidth = 1.6;
      x.stroke(b);
      x.fillStyle = d <= 2 ? C.hot : C.bone;
      x.font = "700 15px " + MONO;
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.fillText(String(d), 0, 1);
    };
  }
  function spamBody(x) {
    var b = rr(-17, -11, 17, 12, 2);
    plate(x, b, C.bone, C.muted, C.bone, 3.4, -17, -11, 17, 12);
    x.strokeStyle = C.ink;
    x.lineWidth = 2.2;
    x.beginPath();
    x.moveTo(-17, -10);
    x.lineTo(0, 3);
    x.lineTo(17, -10);
    x.moveTo(-17, 11);
    x.lineTo(-5, 1);
    x.moveTo(17, 11);
    x.lineTo(5, 1);
    x.stroke();
    x.fillStyle = C.acc;
    x.fill(poly([-8, 4, -4, 12, 4, 12, 8, 4]));
    x.strokeStyle = C.ink;
    x.lineWidth = 1.6;
    x.stroke(poly([-8, 4, -4, 12, 4, 12, 8, 4]));
    x.fillStyle = C.solid;
    x.fill(circ(9, 0, 1));
    x.strokeStyle = C.ink;
    x.lineWidth = 2.6;
    x.stroke(circ(9, 0, 1));
  }
  function spamWing(x) {
    var f = P();
    f.moveTo(0, -2);
    f.quadraticCurveTo(-10, -14, -18, -10);
    f.quadraticCurveTo(-12, -2, -16, 2);
    f.quadraticCurveTo(-8, 4, 0, 3);
    f.closePath();
    x.fillStyle = C.bone;
    x.fill(f);
    x.fillStyle = C.muted;
    x.fill(poly([-6, 2, -14, -4, -16, 2]));
    x.strokeStyle = C.ink;
    x.lineWidth = 2.2;
    x.lineJoin = "round";
    x.stroke(f);
  }
  function droneBody(x) {
    var r = 13, c = circ(r);
    ball(x, r, C.hull, C.plate, C.bone, 3.4);
    x.save();
    x.clip(c);
    x.fillStyle = C.solid;
    x.fillRect(-14, 7, 28, 4);
    x.restore();
    spikeAt(x, 0, 12, Math.PI, 7, 3.4, false);
    x.strokeStyle = C.ink;
    x.lineWidth = 3.4;
    x.stroke(c);
  }
  function droneRod(x) {
    x.fillStyle = C.ink;
    x.fillRect(-2.2, -14, 4.4, 15);
    x.fillStyle = C.muted;
    x.fillRect(-1, -13, 2, 13);
  }
  function adBody(x) {
    var b = rr(-28, -20, 28, 20, 3), j;
    plate(x, b, C.bone, C.muted, C.bone, 4, -28, -20, 28, 20);
    x.save();
    x.clip(b);
    x.fillStyle = C.solid;
    x.fillRect(-28, -20, 56, 9);
    x.fillStyle = C.label;
    x.fillRect(-28, -20, 56, 1.6);
    seam(x, -28, -11, 28, -11, 2.2);
    x.fillStyle = C.hull;
    x.fillRect(-22, 10, 20, 6);
    x.fillStyle = C.acc;
    x.fillRect(2, 10, 20, 6);
    x.strokeStyle = C.ink;
    x.lineWidth = 1.6;
    x.strokeRect(-22, 10, 20, 6);
    x.strokeRect(2, 10, 20, 6);
    patch(x, b, [16, -8, 28, -10, 28, 4, 20, 2], C.deep);
    x.restore();
    for (j = 0; j < 3; j++) {
      var X = 6 + j * 7.5;
      x.fillStyle = C.ink;
      x.fillRect(X - 3, -18.5, 6, 6);
      x.strokeStyle = C.bone;
      x.lineWidth = 1.3;
      x.beginPath();
      x.moveTo(X - 1.8, -17.3);
      x.lineTo(X + 1.8, -13.7);
      x.moveTo(X + 1.8, -17.3);
      x.lineTo(X - 1.8, -13.7);
      x.stroke();
    }
    x.strokeStyle = C.ink;
    x.lineWidth = 4;
    x.stroke(b);
  }
  function adCorner(x) {
    spikeAt(x, 0, 0, 0, 9, 4, false);
  }
  var PARTS2 = [
    [["head", 60, 60, 26, 36, wormHead], ["seg", 34, 54, 17, 28, wormSeg], ["tail", 40, 30, 24, 15, wormTail]],
    [["body", 64, 40, 30, 19, trojanBody], ["head", 48, 48, 38, 40, trojanHead], ["leg", 18, 38, 9, 4, trojanLeg], ["tail", 34, 32, 10, 22, trojanTail], ["hatch", 24, 8, 2, 2, trojanHatch]],
    [["body", 56, 66, 28, 33, ransomBody], ["shackle", 42, 40, 21, 36, ransomShackle], ["link", 16, 12, 8, 6, ransomLink], ["claw", 30, 26, 15, 5, ransomClaw], ["shield", 40, 22, 20, 8, ransomShield]],
    [["body", 62, 42, 31, 21, phishBody], ["tail", 22, 36, 2, 18, phishTail], ["fin", 24, 16, 12, 14, phishFin], ["rod", 30, 38, 26, 35, phishRod], ["hook", 18, 24, 13, 4, hookArt]],
    [["body", 64, 56, 32, 32, rootBody], ["root", 16, 32, 8, 3, rootRoot]],
    [["base", 64, 30, 32, 0, keyBase], ["turret", 40, 32, 20, 26, keyTurret], ["barrel", 44, 20, 2, 10, keyBarrel]],
    [
      ["body", 50, 50, 25, 25, logicBody],
      ["cap", 22, 28, 11, 23, logicCap],
      ["fin", 18, 26, 2, 13, logicFin],
      ["spark", 16, 16, 8, 8, sparkArt],
      ["d1", 20, 22, 10, 11, digitArt(1)],
      ["d2", 20, 22, 10, 11, digitArt(2)],
      ["d3", 20, 22, 10, 11, digitArt(3)],
      ["d4", 20, 22, 10, 11, digitArt(4)],
      ["d5", 20, 22, 10, 11, digitArt(5)]
    ],
    [["body", 38, 28, 19, 13, spamBody], ["wing", 22, 21, 20, 15, spamWing]],
    [["body", 30, 36, 15, 15, droneBody], ["rod", 6, 16, 3, 15, droneRod], ["rotor", 30, 30, 15, 15, function(x) {
      rotor(x, 12);
    }]],
    [["body", 60, 44, 30, 22, adBody], ["corner", 12, 12, 6, 11, adCorner]]
  ];

  // src/wrogowie/rys.js
  var NTY = 4 + PARTS2.length;
  function tySize(ty) {
    return ty < 4 ? 1 : SZ2[ty - 4];
  }
  var DG = ["d1", "d1", "d2", "d3", "d4", "d5"];
  function eyeR(ty) {
    return ty < 4 ? eyeSize(ty) : EYE2[ty - 4];
  }
  var ATK_S = 0.42;
  var HIT_S = 0.3;
  var DIE_S = 0.62;
  function buildMobSprites(mk, k, dpr, norm) {
    var out = [], ty, list, j, d;
    for (ty = 0; ty < NTY; ty++) {
      out[ty] = { _k: k * (norm ? norm.length ? norm[ty] : 1 : tySize(ty)) };
      list = ty < 4 ? PARTS[ty].concat(eyePartList(ty)) : PARTS2[ty - 4].concat(eyeParts(EYE2[ty - 4]));
      for (j = 0; j < list.length; j++) {
        d = list[j];
        out[ty][d[0]] = part(mk, out[ty]._k, dpr, d[1], d[2], d[3], d[4], d[5]);
      }
    }
    return out;
  }
  function buildBombSprites(mk, k, dpr) {
    return {
      bomb: part(mk, k, dpr, 18, 18, 9, 9, bombArt),
      drill: part(mk, k, dpr, 16, 28, 8, 3, drillShotArt),
      key: part(mk, k * 1.3, dpr, 30, 16, 12, 8, keyArt),
      shot: part(mk, k, dpr, 14, 14, 7, 7, shotArt),
      armor: part(mk, k, dpr, 42, 16, 21, 8, armorArt),
      drop: [part(mk, k, dpr, 16, 16, 8, 8, DROP_ART[0]), part(mk, k, dpr, 22, 22, 11, 11, DROP_ART[1]), part(mk, k * 1.2, dpr, 30, 16, 12, 8, DROP_ART[2]), part(mk, k, dpr, 22, 22, 11, 13, DROP_ART[3])]
    };
  }
  function shotArt(x) {
    x.fillStyle = C.ink;
    x.fill(circ(6.2));
    x.fillStyle = C.hot;
    x.fill(circ(5));
    x.fillStyle = C.bone;
    x.fill(circ(3.2));
  }
  function part(mk, k, dpr, w, h, ax, ay, fn) {
    var s = k * dpr, n = mk(w * s, h * s), x = n.getContext("2d"), f;
    x.setTransform(s, 0, 0, s, ax * s, ay * s);
    x.lineJoin = "round";
    x.lineCap = "round";
    fn(x);
    f = mk(w * s, h * s);
    x = f.getContext("2d");
    x.drawImage(n, 0, 0);
    x.globalCompositeOperation = "source-atop";
    x.fillStyle = C.bone;
    x.fillRect(0, 0, f.width, f.height);
    return { n, f, ax: ax * k, ay: ay * k, w: w * k, h: h * k };
  }
  var R0 = 1;
  var R1 = 0;
  var R2 = 0;
  var R3 = 1;
  var R4 = 0;
  var R5 = 0;
  var K = 1;
  var WH = false;
  var FACE = 1;
  function root(c, dpr, x, y, a, sx, sy) {
    var co = Math.cos(a) * dpr, si2 = Math.sin(a) * dpr;
    R0 = co * sx;
    R1 = si2 * sx;
    R2 = -si2 * sy;
    R3 = co * sy;
    R4 = x * dpr;
    R5 = y * dpr;
  }
  function dp(c, p, X, Y, a, sx, sy) {
    c.setTransform(R0, R1, R2, R3, R4, R5);
    if (a) {
      var co = Math.cos(a), si2 = Math.sin(a);
      c.transform(co * sx, si2 * sx, -si2 * sy, co * sy, X * K, Y * K);
    } else c.transform(sx, 0, 0, sy, X * K, Y * K);
    c.drawImage(WH ? p.f : p.n, -p.ax, -p.ay, p.w, p.h);
  }
  function disc(c, p, X, Y, q, a) {
    c.setTransform(R0, R1, R2, R3, R4, R5);
    c.transform(1, 0, 0, q, X * K, Y * K);
    c.rotate(a);
    c.drawImage(WH ? p.f : p.n, -p.ax, -p.ay, p.w, p.h);
  }
  function eye(c, P2, m, X, Y) {
    var e = eyeR(m.ty), sq = m.hit > 0 ? Math.sin(Math.PI * m.hit / HIT_S) : 0;
    dp(c, P2.sock, X, Y, 0, 1, 1);
    dp(c, m.glow ? P2.irisH : P2.iris, X + FACE * m.ex * e * 0.3, Y + m.ey * e * 0.3, sq * 0.5, 1 + 0.3 * sq, 1 - 0.35 * sq);
    var L = Math.max(m.lid, sq * 0.55);
    if (L > 0.02) dp(c, P2.lid, X, Y - e * 1.04, 0, 1, L);
    dp(c, P2.rim, X, Y, 0, 1, 1);
    dp(c, P2.brow, X, Y + 1.5 * m.tens + 2 * sq, -sq * 0.14, 1, 1 + 0.25 * m.tens);
  }
  function ease(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v * v * (3 - 2 * v);
  }
  function drawMob(c, S, m, k, dpr, ox, oy) {
    var P2 = S[m.ty], t = m.t, ph = m.ph, br = Math.sin(t * 4.2 + ph), sx = 1 + 0.035 * br, sy = 1 - 0.035 * br, y = m.y + Math.sin(t * 2.1 + ph) * 1.6 * k * m.s;
    var a = m.lean, j, v, h;
    m.tens = 0;
    if (m.atk >= 0 && m.atk < ATK_S) {
      if (m.atk < 0.16) {
        v = ease(m.atk / 0.16);
        sx += 0.13 * v;
        sy -= 0.13 * v;
        m.tens = v;
      } else {
        v = 1 - ease((m.atk - 0.16) / (ATK_S - 0.16));
        sx -= 0.08 * v;
        sy += 0.14 * v;
        y -= 4 * k * m.s * v;
        m.tens = v * 0.5;
      }
    }
    if (m.hit > 0) {
      v = Math.sin(Math.PI * m.hit / HIT_S);
      y -= 7 * k * m.s * v;
      a += 0.22 * v * (m.ph > 3 ? 1 : -1);
    }
    K = P2._k * m.s;
    FACE = m.face || 1;
    if (m.die >= 0) {
      drawDeath(c, P2, m, dpr, ox, oy, y);
      return;
    }
    root(c, dpr, m.x + ox, y + oy, a, sx * FACE, sy);
    WH = m.fl > 0;
    switch (m.ty) {
      case VIRUS:
        dp(c, P2.spikes, 0, 0, t * 0.5 + ph, 1, 1);
        dp(c, P2.body, 0, 0, 0, 1, 1);
        eye(c, P2, m, 0, 0);
        break;
      case BOTNET:
        for (j = 0; j < 3; j++) {
          v = 0.16 * Math.sin(t * 9 + j * 1.7 + ph);
          dp(c, P2.leg, -8 - j * 7, 26 - j * 5, -0.15 - j * 0.42 + v, -1, 1);
          dp(c, P2.leg, 8 + j * 7, 26 - j * 5, 0.15 + j * 0.42 - v, 1, 1);
        }
        for (j = 0; j < 3; j++) dp(c, P2.ant, (j - 1) * 12, j === 1 ? -24 : -20, (j - 1) * 0.42 + 0.12 * Math.sin(t * 3.1 + j + ph) - m.tens * (j - 1) * 0.2, 1, 1);
        dp(c, P2.body, 0, 0, 0, 1, 1);
        eye(c, P2, m, 0, 6.5);
        break;
      case SPYWARE:
        v = 0.28 * Math.sin(t * 11 + ph);
        dp(c, P2.wing, -21, 2, -v, 1, 1);
        dp(c, P2.wing, 21, 2, v, -1, 1);
        dp(c, P2.rod, -13, -15, -0.62, 1, 1);
        dp(c, P2.rod, 13, -15, 0.62, 1, 1);
        h = t * 22;
        disc(c, P2.rotor, -13 + Math.sin(-0.62) * 22, -15 - Math.cos(0.62) * 22, 0.28, h);
        disc(c, P2.rotor, 13 + Math.sin(0.62) * 22, -15 - Math.cos(0.62) * 22, 0.28, -h);
        dp(c, P2.spikes, 0, 0, 0, 1, 1);
        dp(c, P2.body, 0, 0, 0, 1, 1);
        eye(c, P2, m, 0, 0);
        break;
      case MINER:
        v = Math.floor(t * 14) & 1;
        for (j = 0; j < 3; j++) if (!(j === 1 && m.hide > 0)) dp(c, v ^ j & 1 ? P2.drill1 : P2.drill0, (j - 1) * 14, j === 1 ? 25 : 21, (1 - j) * 0.35, 1, 1);
        h = 0.22 * Math.sin(t * 3.3 + ph) + m.tens * 0.35;
        dp(c, P2.pick, -23, -4, h, 1, 1);
        dp(c, P2.pick, 23, -4, -h, -1, 1);
        dp(c, P2.house, 0, -26, 0, 1, 1);
        disc(c, P2.fan, 0, -31, 0.32, t * 16);
        dp(c, P2.body, 0, 0, 0, 1, 1);
        eye(c, P2, m, 0, 7.5);
        break;
      case WORM:
        if (m.sg === 0) {
          dp(c, P2.head, 0, 0, 0, 1, 1);
          eye(c, P2, m, 4, -5);
        } else dp(c, m.sg === 2 ? P2.tail : P2.seg, 0, 0, 0, 1, 1);
        break;
      case TROJAN:
        dp(c, P2.tail, 27, -10, 0.25 * Math.sin(t * 2.6 + ph), 1, 1);
        for (j = 0; j < 4; j++) {
          v = m.walk * 0.32 * Math.sin(t * 7 + j * 1.6);
          dp(c, P2.leg, [-21, -11, 11, 22][j], 14, v, 1, 1);
        }
        dp(c, P2.body, 0, 0, 0, 1, 1);
        dp(c, P2.hatch, -9, 17, m.hatch * 1.5, 1, 1);
        dp(c, P2.head, -20, -8, 0.06 * Math.sin(t * 3 + ph) - m.tens * 0.15, 1, 1);
        eye(c, P2, m, -38, -28);
        break;
      case RANSOM:
        for (j = -1; j <= 1; j += 2) {
          var L = m.armS === j ? m.arm : 0, sw = 0.25 * Math.sin(t * 2.2 + ph + j), n = 3 + Math.floor(L / 8), q;
          for (q = 1; q <= n; q++) {
            v = q / n;
            dp(c, P2.link, j * (25 + 10 * v * (L ? 0.3 : 1)) + sw * 8 * v, -4 + (16 + L) * v, q & 1 ? 0 : 1.57, 1, 1);
          }
          dp(c, P2.claw, j * (25 + 10 * (L ? 0.3 : 1)) + sw * 8, 14 + L, sw * 0.4, 1, 1 + (L ? 0.1 : 0));
        }
        dp(c, P2.shackle, 0, -20, 0, 1, 1 - 0.12 * m.tens);
        dp(c, P2.body, 0, 0, 0, 1, 1);
        eye(c, P2, m, 0, -3);
        if (m.sh > 0) dp(c, P2.shield, 0, 20, 0, 1, 1);
        break;
      case PHISH:
        dp(c, P2.tail, 24, 0, 0.3 * Math.sin(t * 6 + ph), 1, 1);
        dp(c, P2.fin, 2, -16, 0, 1, 1 + 0.1 * Math.sin(t * 5));
        dp(c, P2.rod, 6, -14, -0.08 * m.tens, 1, 1);
        dp(c, P2.body, 0, 0, 0, 1, 1);
        eye(c, P2, m, -11, -5);
        break;
      case ROOTKIT:
        for (j = 0; j < 3; j++) dp(c, P2.root, (j - 1) * 12, 19, 0.3 * Math.sin(t * 3 + j * 2 + ph), 1, 1);
        dp(c, P2.body, 0, 0, 0, 1, 1);
        eye(c, P2, m, 0, 4);
        break;
      case KEYLOG:
        dp(c, P2.base, 0, 2, 0, 1, 1);
        dp(c, P2.turret, 0, 4, 0, 1, 1);
        dp(c, P2.barrel, 0, -4, m.aim, 1 - 0.18 * m.tens, 1);
        eye(c, P2, m, 0, -4);
        break;
      case LOGIC:
        dp(c, P2.fin, 19, 4, 0.08 * Math.sin(t * 4), 1, 1);
        dp(c, P2.fin, -19, 4, -0.08 * Math.sin(t * 4), -1, 1);
        dp(c, P2.cap, 0, -20, 0, 1, 1);
        if ((t * 12 | 0) & 1) dp(c, P2.spark, 2, -41, t * 5, 1, 1);
        dp(c, P2.body, 0, 0, 0, 1, 1);
        eye(c, P2, m, 0, -2);
        if (m.cnt > 0) {
          v = 1 + 0.18 * (m.cnt % 1);
          dp(c, P2[DG[Math.min(5, Math.ceil(m.cnt))]], 0, -58, 0, v, v);
        }
        break;
      case SPAM:
        v = 0.55 + 0.45 * Math.sin(t * 22 + ph);
        dp(c, P2.wing, -13, -4, 0, 1, v);
        dp(c, P2.wing, 13, -4, 0, -1, v);
        dp(c, P2.body, 0, 0, 0, 1, 1);
        eye(c, P2, m, 0, 1);
        break;
      case DRONE:
        dp(c, P2.rod, -7, -8, -0.55, 1, 1);
        dp(c, P2.rod, 7, -8, 0.55, 1, 1);
        disc(c, P2.rotor, -15, -20, 0.3, t * 30);
        disc(c, P2.rotor, 15, -20, 0.3, -t * 30);
        dp(c, P2.body, 0, 0, 0, 1, 1);
        eye(c, P2, m, 0, -1);
        break;
      case ADWARE:
        dp(c, P2.corner, -27, -19, -0.8, 1, 1);
        dp(c, P2.corner, 27, -19, 0.8, 1, 1);
        dp(c, P2.corner, -27, 19, -2.35, 1, 1);
        dp(c, P2.corner, 27, 19, 2.35, 1, 1);
        dp(c, P2.body, 0, 0, 0, 1, 1);
        eye(c, P2, m, 0, -0.5);
        break;
    }
    WH = false;
  }
  var DX2 = [-1, 1, -0.6, 0.7, -0.2, 0.3, -0.9, 0.9];
  var DY2 = [-1.1, -0.9, -1.4, -1.3, -1.6, -1.5, -0.6, -0.7];
  function fly(c, p, i, d, X, Y, sx) {
    var vx = DX2[i & 7] * 120, vy = DY2[i & 7] * 150;
    dp(c, p, X + vx * d / K, Y + (vy * d + 520 * d * d) / K, (i & 1 ? 1 : -1) * d * 9, sx, 1);
  }
  function drawDeath(c, P2, m, dpr, ox, oy, y) {
    var d = m.die, sw;
    if (d < 0.1) {
      sw = 1 + 1.6 * d;
      root(c, dpr, m.x + ox, y + oy, 0, sw, sw);
      WH = true;
      if (m.ty === VIRUS) dp(c, P2.spikes, 0, 0, m.t * 0.5 + m.ph, 1, 1);
      dp(c, P2.body || (m.sg === 0 ? P2.head : P2.seg) || P2.base, 0, 0, 0, 1, 1);
      WH = false;
      return;
    }
    d -= 0.1;
    root(c, dpr, m.x + ox, y + oy, 0, 1, 1);
    c.globalAlpha = d > 0.36 ? Math.max(0, 1 - (d - 0.36) / 0.16) : 1;
    switch (m.ty) {
      case VIRUS:
        for (var j = 0; j < 6; j++) fly(c, P2.spike1, j, d, Math.cos(j) * 20, Math.sin(j) * 20, 1);
        break;
      case BOTNET:
        fly(c, P2.ant, 0, d, -12, -20, 1);
        fly(c, P2.ant, 1, d, 12, -20, 1);
        fly(c, P2.leg, 2, d, -10, 20, -1);
        fly(c, P2.leg, 3, d, 10, 20, 1);
        fly(c, P2.leg, 6, d, -18, 14, -1);
        fly(c, P2.leg, 7, d, 18, 14, 1);
        break;
      case SPYWARE:
        fly(c, P2.wing, 0, d, -21, 2, 1);
        fly(c, P2.wing, 1, d, 21, 2, -1);
        fly(c, P2.rotor, 2, d, -26, -33, 1);
        fly(c, P2.rotor, 3, d, 26, -33, 1);
        break;
      case MINER:
        fly(c, P2.pick, 0, d, -23, -4, 1);
        fly(c, P2.pick, 1, d, 23, -4, -1);
        fly(c, P2.drill0, 4, d, -14, 21, 1);
        fly(c, P2.drill1, 5, d, 14, 21, 1);
        fly(c, P2.fan, 2, d, 0, -31, 1);
        break;
      case WORM:
        fly(c, m.sg === 0 ? P2.head : m.sg === 2 ? P2.tail : P2.seg, 2, d * 0.6, 0, 0, 1);
        break;
      case TROJAN:
        fly(c, P2.head, 0, d, -20, -8, 1);
        fly(c, P2.leg, 6, d, -18, 13, 1);
        fly(c, P2.leg, 7, d, 19, 13, 1);
        fly(c, P2.tail, 1, d, 27, -10, 1);
        fly(c, P2.hatch, 4, d, -9, 17, 1);
        fly(c, P2.leg, 2, d, -9, 13, 1);
        break;
      case RANSOM:
        fly(c, P2.shackle, 4, d, 0, -20, 1);
        fly(c, P2.claw, 6, d, -30, 14, 1);
        fly(c, P2.claw, 7, d, 30, 14, 1);
        fly(c, P2.link, 0, d, -25, 0, 1);
        fly(c, P2.link, 1, d, 25, 0, 1);
        break;
      case PHISH:
        fly(c, P2.tail, 1, d, 24, 0, 1);
        fly(c, P2.rod, 0, d, 6, -14, 1);
        fly(c, P2.fin, 5, d, 2, -16, 1);
        break;
      case ROOTKIT:
        for (var q2 = 0; q2 < 3; q2++) fly(c, P2.root, q2 + 2, d, (q2 - 1) * 12, 19, 1);
        break;
      case KEYLOG:
        fly(c, P2.barrel, 1, d, 0, -4, 1);
        fly(c, P2.turret, 4, d, 0, 4, 1);
        fly(c, P2.base, 6, d * 0.5, 0, 2, 1);
        break;
      case LOGIC:
        fly(c, P2.cap, 4, d, 0, -20, 1);
        fly(c, P2.fin, 0, d, -19, 4, -1);
        fly(c, P2.fin, 1, d, 19, 4, 1);
        break;
      case SPAM:
        fly(c, P2.wing, 0, d, -13, -4, 1);
        fly(c, P2.wing, 1, d, 13, -4, -1);
        break;
      case DRONE:
        fly(c, P2.rotor, 0, d, -15, -20, 1);
        fly(c, P2.rotor, 1, d, 15, -20, 1);
        break;
      case ADWARE:
        fly(c, P2.corner, 0, d, -27, -19, 1);
        fly(c, P2.corner, 1, d, 27, -19, 1);
        fly(c, P2.corner, 6, d, -27, 19, 1);
        fly(c, P2.corner, 7, d, 27, 19, 1);
        break;
    }
    if (!(m.ty === WORM && m.sg)) {
      fly(c, P2.brow, 4, d * 0.9, 0, -12, 1);
      fly(c, P2.iris, 5, d * 0.8, 0, 0, 1);
    }
    c.globalAlpha = 1;
  }
  function drawBomb(c, S, x, y, a, k, dpr) {
    var co = Math.cos(a) * dpr, si2 = Math.sin(a) * dpr, p = S.bomb;
    c.setTransform(co, si2, -si2, co, x * dpr, y * dpr);
    c.drawImage(p.n, -p.ax, -p.ay, p.w, p.h);
  }
  function drawSprite(c, p, x, y, a, sc, dpr) {
    var co = Math.cos(a) * dpr * sc, si2 = Math.sin(a) * dpr * sc;
    c.setTransform(co, si2, -si2, co, x * dpr, y * dpr);
    c.drawImage(p.n, -p.ax, -p.ay, p.w, p.h);
  }
  function drawDrill(c, S, x, y, dpr) {
    var p = S.drill;
    c.setTransform(dpr, 0, 0, dpr, x * dpr, y * dpr);
    c.drawImage(p.n, -p.ax, -p.ay, p.w, p.h);
  }

  // src/wrogowie/arkusz.js
  var ALL_NAMES = MOB_NAMES.concat(MOB_NAMES2);
  var ROLE = [
    "siatka · bomba pionowo",
    "sznur · nalot dywanowy",
    "formacja · nurkowanie",
    "zawis · wiertło",
    "wąż · dzieli się",
    "koń · wypuszcza drony",
    "czołg · kłódka · cepy",
    "haczyk ściąga statek",
    "niewidzialny · migocze",
    "snajper · linia celu",
    "odlicza 5 · pierścień",
    "rój kopert",
    "mały kamikaze",
    "osłona · łapie pociski"
  ];
  var EXT = [116, 104, 100, 100, 130, 76, 80, 64, 80, 72, 92, 46, 54, 64];
  var NORM = EXT.map(function(e) {
    return 100 / e;
  });
  function mob0(ty, x, y) {
    return {
      ty,
      x,
      y,
      s: 1,
      ph: 1,
      t: 0.4,
      ex: 0.3,
      ey: 0.6,
      lid: 0,
      glow: 0,
      atk: -1,
      hit: 0,
      fl: 0,
      die: -1,
      lean: 0,
      hide: 0,
      tens: 0,
      face: 1,
      sg: 0,
      walk: 0,
      hatch: 0,
      arm: 0,
      armS: 0,
      sh: 1,
      aim: 1.57,
      cnt: 0,
      vis: 1
    };
  }
  function canvasFor(cv, W, H, dpr) {
    var doc = cv.ownerDocument;
    cv.width = W * dpr;
    cv.height = H * dpr;
    cv.style.width = W + "px";
    cv.style.height = H + "px";
    var c = cv.getContext("2d");
    c.fillStyle = C.ink;
    c.fillRect(0, 0, cv.width, cv.height);
    return { c, mk: function(w, h) {
      var e = doc.createElement("canvas");
      e.width = Math.max(1, Math.ceil(w));
      e.height = Math.max(1, Math.ceil(h));
      return e;
    } };
  }
  function wormDemo(c, S, m, k, dpr) {
    var j, q, K2 = S[4]._k * m.s, sp = 25 * K2;
    for (j = 4; j >= 0; j--) {
      q = mob0(4, m.x + (1.6 - j) * sp, m.y + Math.sin(j * 1.3) * 5 * K2);
      q.sg = j === 0 ? 0 : j === 4 ? 2 : 1;
      q.s = m.s;
      q.lean = -Math.cos(j * 1.3) * 0.18;
      q.t = m.t + j * 0.3;
      q.ph = m.ph;
      q.atk = m.atk;
      q.hit = j ? 0 : m.hit;
      q.die = j && m.die < 0.1 ? -1 : m.die;
      q.lid = m.lid;
      q.ex = m.ex;
      drawMob(c, S, q, k, dpr, 0, 0);
    }
  }
  function drawAny(c, S, m, k, dpr) {
    if (m.ty === 4 && m.sg === 0 && m.s >= 0) wormDemo(c, S, m, k, dpr);
    else drawMob(c, S, m, k, dpr, 0, 0);
  }
  function mobSheet(cv) {
    var dpr = 2, W = 1280, rowH = 118, H = 70 + NTY * rowH + 30, o = canvasFor(cv, W, H, dpr), c = o.c, S96, S32, SB, ty, j, m, y, x;
    S96 = buildMobSprites(o.mk, 0.6, dpr, NORM);
    S32 = buildMobSprites(o.mk, 0.32, dpr, NORM);
    SB = buildBombSprites(o.mk, 1.12, dpr);
    var LAB = ["ok. 60 px", "ok. 32 px", "idle", "idle · mrug", "atak", "trafienie", "śmierć 1", "śmierć 2"], XS = [70, 160, 270, 390, 510, 630, 750, 870];
    var FR = [
      function() {
      },
      function(q) {
        q.lid = 1;
        q.t = 1.1;
        q.ex = -0.6;
      },
      function(q) {
        q.atk = 0.12;
        q.glow = 1;
        q.lid = 0.45;
        q.hatch = 1;
        q.arm = 60;
        q.armS = 1;
        q.cnt = 2.4;
        q.walk = 1;
      },
      function(q) {
        q.hit = HIT_S * 0.5;
      },
      function(q) {
        q.die = 0.06;
      },
      function(q) {
        q.die = 0.3;
      }
    ];
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.font = "500 11px " + MONO;
    c.fillStyle = C.muted;
    c.textAlign = "center";
    for (j = 0; j < LAB.length; j++) c.fillText(LAB[j].toUpperCase(), XS[j], 28);
    for (ty = 0; ty < NTY; ty++) {
      y = 96 + ty * rowH;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = C.line;
      c.fillRect(24, y + 56, 1232, 1);
      c.textAlign = "left";
      c.fillStyle = C.bone;
      c.font = "700 14px " + MONO;
      c.fillText(ALL_NAMES[ty].toUpperCase(), 980, y - 6);
      c.font = "500 11px " + MONO;
      c.fillStyle = C.muted;
      c.fillText(ROLE[ty].toUpperCase(), 980, y + 14);
      m = mob0(ty, XS[0], y);
      drawAny(c, S96, m, 0.6, dpr);
      m = mob0(ty, XS[1], y);
      drawAny(c, S32, m, 0.32, dpr);
      for (j = 0; j < 6; j++) {
        m = mob0(ty, XS[2 + j], y);
        FR[j](m);
        drawAny(c, S96, m, 0.6, dpr);
      }
    }
    var BG = [C.ink, C.hull, C.city, C.muted, C.bone, C.solid];
    y = H - 34;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = C.muted;
    c.font = "500 11px " + MONO;
    c.textAlign = "left";
    c.fillText("POCISKI WROGÓW I ZRZUTY (₡1, ₡5, KLUCZ, BOMBA) NA TŁACH", 24, y + 4);
    for (j = 0; j < BG.length; j++) {
      x = 420 + j * 140;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = BG[j];
      c.fillRect(x, y - 24, 140, 48);
      drawBomb(c, SB, x + 14, y, j * 0.5, 1, dpr);
      drawDrill(c, SB, x + 34, y - 10, dpr);
      drawSprite(c, SB.shot, x + 52, y, 0, 1, dpr);
      drawSprite(c, SB.drop[0], x + 70, y, 0, 1, dpr);
      drawSprite(c, SB.drop[1], x + 88, y, 0, 1, dpr);
      drawSprite(c, SB.drop[2], x + 110, y, -0.3, 1, dpr);
      drawSprite(c, SB.drop[3], x + 130, y, 0, 1, dpr);
    }
  }
  function bestiary(cv) {
    var dpr = 2, cols = 4, cw = 300, ch = 176, W = 24 * 2 + cols * cw, rows = Math.ceil(NTY / cols), H = 64 + rows * ch + 16, o = canvasFor(cv, W, H, dpr), c = o.c, ty, m, X, Y;
    var S96 = buildMobSprites(o.mk, 0.96, dpr, NORM), S24 = buildMobSprites(o.mk, 0.24, dpr, NORM);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.font = "700 16px " + MONO;
    c.fillStyle = C.bone;
    c.textAlign = "left";
    c.fillText("BESTIARIUSZ · " + NTY + " TYPÓW", 24, 38);
    c.font = "500 11px " + MONO;
    c.fillStyle = C.muted;
    c.fillText("KAŻDY MOB W 96 PX I 24 PX", 300, 38);
    for (ty = 0; ty < NTY; ty++) {
      X = 24 + ty % cols * cw;
      Y = 60 + Math.floor(ty / cols) * ch;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = C.panel;
      c.fillRect(X + 4, Y + 4, cw - 8, ch - 8);
      c.fillStyle = C.line;
      c.fillRect(X + 4, Y + 4, cw - 8, 1);
      c.fillRect(X + 4, Y + ch - 5, cw - 8, 1);
      c.fillStyle = C.acc;
      c.fillRect(X + 4, Y + 4, 2, ch - 8);
      c.font = "700 13px " + MONO;
      c.fillStyle = C.bone;
      c.fillText(ALL_NAMES[ty].toUpperCase(), X + 16, Y + 26);
      c.font = "500 10px " + MONO;
      c.fillStyle = C.muted;
      c.fillText(ROLE[ty].toUpperCase(), X + 16, Y + ch - 16);
      c.fillStyle = C.ink;
      c.fillRect(X + cw - 52, Y + 14, 36, 36);
      m = mob0(ty, X + 120, Y + 92);
      drawAny(c, S96, m, 0.96, dpr);
      m = mob0(ty, X + cw - 34, Y + 32);
      drawAny(c, S24, m, 0.24, dpr);
    }
  }

  // src/wrogowie/fale.js
  var ROZDZIALY = [
    [
      // rozdział 1 → NullPointer
      { t: "init: pierwsze infekcje", g: [["grid", VIRUS, 14, 0, { rows: 2 }], ["arc", SPYWARE, 6, 7]] },
      { t: "feat: robak w sieci", g: [["worm", WORM, 7, 0], ["chain", BOTNET, 5, 5], ["worm", WORM, 6, 10]] },
      { t: "fix: snajperzy w kolejce", g: [["solo", KEYLOG, 2, 0], ["arc", VIRUS, 8, 1.5], ["chain", BOTNET, 5, 9]] },
      { t: "refactor: deszcz kodu", g: [["lines", 0, 0, 0]] },
      { t: "merge: koń w paczce", g: [["solo", TROJAN, 1, 0], ["swarm", SPAM, 12, 4], ["grid", VIRUS, 7, 9, { rows: 1 }]] }
    ],
    [
      // rozdział 2 → Memory Leak
      { t: "hotfix w piątek", g: [["spiral", VIRUS, 10, 0], ["solo", LOGIC, 2, 4], ["solo", LOGIC, 1, 10]] },
      { t: "chore: phishing", g: [["solo", PHISH, 2, 0], ["arc", SPYWARE, 6, 3], ["swarm", SPAM, 10, 10]] },
      { t: "event: bug bounty", ev: "bounty", g: [["grid", VIRUS, 12, 0, { rows: 2 }], ["swarm", SPAM, 12, 4]] },
      { t: "rebase: okup za pliki", g: [["solo", RANSOM, 1, 0], ["chain", BOTNET, 5, 3], ["solo", ADWARE, 2, 1.5]] },
      { t: "deploy w nocy", g: [["solo", ROOTKIT, 3, 0], ["worm", WORM, 8, 3], ["solo", MINER, 2, 9]] }
    ],
    [
      // rozdział 3 → Race Condition
      { t: "event: patch tuesday", ev: "patch", g: [["grid", VIRUS, 14, 0, { rows: 2 }], ["arc", SPYWARE, 6, 5]] },
      { t: "feat: rój spamu", g: [["swarm", SPAM, 14, 0], ["solo", KEYLOG, 2, 2], ["swarm", SPAM, 14, 8]] },
      { t: "force push", g: [["lines", 0, 0, 0]] },
      { t: "rollback: koń i kłódka", g: [["solo", TROJAN, 1, 0], ["solo", RANSOM, 1, 4], ["solo", LOGIC, 2, 9]] },
      { t: "legacy: stare robaki", g: [["worm", WORM, 8, 0], ["worm", WORM, 8, 4], ["solo", PHISH, 1, 6]] }
    ],
    [
      // rozdział 4 → Segfault Prime
      { t: "feat: spirala szpiegów", g: [["spiral", SPYWARE, 10, 0], ["solo", ROOTKIT, 2, 4], ["solo", KEYLOG, 1, 9]] },
      { t: "perf: koparki", g: [["solo", MINER, 3, 0], ["grid", VIRUS, 8, 2, { rows: 1 }], ["chain", BOTNET, 6, 8]] },
      { t: "event: bug bounty", ev: "bounty", g: [["grid", SPYWARE, 12, 0, { rows: 2 }], ["grid", VIRUS, 8, 5, { rows: 1 }]] },
      { t: "security: okup ×2", g: [["solo", RANSOM, 2, 0], ["solo", ADWARE, 3, 2], ["swarm", SPAM, 12, 8]] },
      { t: "release: wszystko naraz", g: [["solo", TROJAN, 1, 0], ["solo", LOGIC, 2, 3], ["solo", KEYLOG, 2, 7]] }
    ]
  ];
  var FALI_W_ROZDZIALE = 5;
  function waveDef(n) {
    var i = Math.max(0, n - 1), ch = Math.floor(i / FALI_W_ROZDZIALE), k = i % FALI_W_ROZDZIALE;
    return { ch, k, lvl: ch, d: ROZDZIALY[ch % ROZDZIALY.length][k] };
  }
  function waveTitle(n) {
    var w = waveDef(n);
    return "fala " + (w.ch + 1) + "." + (w.k + 1) + ": " + w.d.t;
  }
  function isLinesWave(n) {
    var g = waveDef(n).d.g;
    return g.length === 1 && g[0][0] === "lines";
  }

  // src/wrogowie/moby.js
  var MOB_HP = [1, 2, 2, 4, 2, 14, 8, 5, 2, 4, 3, 1, 1, 7];
  var MOB_PTS = [40, 60, 80, 120, 50, 400, 300, 160, 220, 150, 120, 15, 30, 90];
  var HIT_R = [26, 26, 26, 26, 17, 30, 28, 24, 24, 26, 22, 16, 13, 28];
  var MOB_SIZE = 50;
  var WAVE_MAX = 21;
  var LINES_S = 15;
  var VIRUS_CD = [1.7, 4.2];
  var CARPET_DT = 0.3;
  var CHAIN_S = 6.2;
  var DIVE_EVERY = [1.5, 2.8];
  var DIVE_TELE = 0.5;
  var DIVE_V = 500;
  var MINER_CD = [1.8, 2.8];
  var MINER_TELE = 0.36;
  var DRILL_V = 840;
  var BOMB_V = 205;
  var SHOT_V = 210;
  var KEY_V = 640;
  var KEY_TELE = 0.6;
  var KEY_LOCK = 0.22;
  var KEY_CD = [2.2, 3.4];
  var WORM_V = 120;
  var WORM_CD = [2.4, 4];
  var TROJAN_CD = 4.6;
  var TROJAN_TELE = 0.7;
  var DRONES = 3;
  var DRONE_MAX = 7;
  var FLAIL_TELE = 0.7;
  var FLAIL_V = 900;
  var FLAIL_CD = [2.8, 3.8];
  var RANSOM_SH = 8;
  var HOOK_TELE = 0.55;
  var HOOK_V = 520;
  var HOOK_PULL = 165;
  var HOOK_HOLD = 1.5;
  var HOOK_CD = [3, 4.5];
  var HOOK_BONUS = 150;
  var ROOT_CD = [2.4, 3.6];
  var ROOT_MAT = 0.75;
  var ROOT_SHOW = 1.1;
  var LOGIC_N = 5;
  var RING_N = 10;
  var SPAM_CD = [5, 9];
  var AD_CD = [3.5, 5];
  var MAX_TOK = 2;
  var COL_GAP = 90;
  var ENTRY_S = 1.7;
  var STAGGER_S = 0.11;
  var MAXB = 46;
  var DROP_UP_P = 0.012;
  var DROP_BOMB_P = 6e-3;
  var BOUNTY_KR = 3;
  var ARMOR_HP = 2;
  var NM = 72;
  var NB = 160;
  var ND = 40;
  var TAU3 = Math.PI * 2;
  function createMoby(api) {
    var M = [], B = [], D = [], mN = 0, bN = 0, dN = 0, S = null, k = 0.5, j, T = 0, active = false, waveN = 0, diveT = 0, att = false, attT = 0;
    var done = false, kinds = [], groups = [], gN = 0, gNext = 0, def = null, lvl = 0, ev = "", lines = false, wid = 0, tok = 0, maxObj = 0, cause = "";
    var stat = { spawn: [], drop: [], kill: [], bombKill: 0, pat: {}, ev: {}, drops: [0, 0, 0, 0], picked: [0, 0, 0, 0], cut: 0, hooked: 0, split: 0, shieldBreak: 0, defused: 0, boom: 0 };
    for (j = 0; j < NTY; j++) {
      stat.spawn.push(0);
      stat.drop.push(0);
      stat.kill.push(0);
    }
    for (j = 0; j < NM; j++) M.push({
      ty: 0,
      st: 0,
      t: 0,
      et: 0,
      del: 0,
      fx: 0,
      fy: 0,
      b0x: 0,
      b0y: 0,
      b1x: 0,
      b1y: 0,
      b2x: 0,
      b2y: 0,
      b3x: 0,
      b3y: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      hp: 1,
      hit: 0,
      fl: 0,
      die: -1,
      atk: -1,
      cd: 0,
      lid: 0,
      ex: 0,
      ey: 0,
      glow: 0,
      lean: 0,
      hide: 0,
      ph: 0,
      s: 1,
      tens: 0,
      near: 0,
      ch: 0,
      pt: 0,
      dir: 1,
      tl: 0,
      face: 1,
      sg: 0,
      walk: 0,
      hatch: 0,
      arm: 0,
      armS: 0,
      sh: 0,
      aim: 1.57,
      cnt: 0,
      vis: 1,
      wid: 0,
      ps: 0,
      pv: 0,
      y0: 0,
      dv: 0,
      lv: 0,
      ar: 0,
      flee: 0,
      hk: 0,
      hx: 0,
      hy: 0,
      ht: 0,
      tx: 0,
      tk: 0,
      n: 0,
      gi: 0,
      a: 0,
      a2: 0,
      r: 0
    });
    for (j = 0; j < NB; j++) B.push({ x: 0, y: 0, vx: 0, vy: 0, a: 0, va: 0, r: 6, d: 0, t: 0, near: 0, ty: 0, stick: 0, src: 0 });
    for (j = 0; j < ND; j++) D.push({ x: 0, y: 0, vx: 0, vy: 0, t: 0, ty: 0, mg: 0 });
    for (j = 0; j < 8; j++) groups.push({ pat: "", ty: 0, n: 0, d: 0, o: null, on: false });
    function rnd3(a, b) {
      return a + Math.random() * (b - a);
    }
    function hs() {
      var h = api.H() / 600;
      return h < 0.75 ? 0.75 : h > 1.3 ? 1.3 : h;
    }
    function KK(m) {
      return k * tySize(m.ty) * m.s;
    }
    var SBomb = null;
    function build() {
      k = MOB_SIZE * api.s0() / 100;
      S = buildMobSprites(api.mk, k, api.dpr());
      SBomb = buildBombSprites(api.mk, 1.12 * api.s0(), api.dpr());
    }
    function add(ty, quiet) {
      if (mN >= NM) return null;
      var m = M[mN++];
      m.ty = ty;
      m.st = 0;
      m.t = rnd3(0, 3);
      m.et = 0;
      m.del = 0;
      m.hp = Math.ceil(MOB_HP[ty] * (1 + 0.25 * lvl));
      m.hit = 0;
      m.fl = 0;
      m.die = -1;
      m.atk = -1;
      m.lid = 0;
      m.ex = 0;
      m.ey = 0.5;
      m.glow = 0;
      m.lean = 0;
      m.hide = 0;
      m.ph = rnd3(0, 6.28);
      m.s = 1;
      m.near = 0;
      m.vx = m.vy = 0;
      m.cd = 0;
      m.tl = 0;
      m.x = -999;
      m.y = -999;
      m.face = 1;
      m.sg = 0;
      m.walk = 0;
      m.hatch = 0;
      m.arm = 0;
      m.armS = 0;
      m.sh = 0;
      m.aim = 1.57;
      m.cnt = 0;
      m.vis = 1;
      m.dv = ty === SPYWARE ? 1 : 0;
      m.lv = 0;
      m.ar = ev === "patch" ? ARMOR_HP : 0;
      m.flee = 0;
      m.hk = 0;
      m.tk = 0;
      m.n = 0;
      m.a = 0;
      m.a2 = 0;
      m.r = 0;
      m.dir = 1;
      m.pt = 0;
      m.y0 = 0;
      if (!quiet) stat.spawn[ty]++;
      return m;
    }
    function bez(m, ax, ay, bx, by, cx, cy, dx, dy) {
      m.b0x = ax;
      m.b0y = ay;
      m.b1x = bx;
      m.b1y = by;
      m.b2x = cx;
      m.b2y = cy;
      m.b3x = dx;
      m.b3y = dy;
    }
    function bezAt(m, u) {
      var v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u, W = api.W(), H = api.H();
      m.x = (a * m.b0x + b * m.b1x + c * m.b2x + d * m.b3x) * W;
      m.y = (a * m.b0y + b * m.b1y + c * m.b2y + d * m.b3y) * H;
    }
    function kindOn(ty) {
      for (var q = 0; q < kinds.length; q++) if (kinds[q] === ALL_NAMES[ty]) return;
      kinds.push(ALL_NAMES[ty]);
    }
    function startWave(n) {
      var w = waveDef(n), q, g, G2;
      def = w.d;
      lvl = w.lvl;
      ev = def.ev || "";
      waveN = n;
      T = 0;
      done = false;
      kinds.length = 0;
      gN = 0;
      gNext = 0;
      lines = isLinesWave(n);
      active = !lines;
      if (ev) stat.ev[ev] = (stat.ev[ev] || 0) + 1;
      for (q = 0; q < def.g.length && q < groups.length; q++) {
        g = def.g[q];
        G2 = groups[gN++];
        G2.pat = g[0];
        G2.ty = g[1];
        G2.n = g[2] + (g[2] > 3 ? Math.min(3, lvl) : lvl > 1 ? 1 : 0);
        G2.d = g[3];
        G2.o = g[4] || null;
        G2.on = false;
        G2.gi = q;
        stat.pat[G2.pat] = (stat.pat[G2.pat] || 0) + 1;
      }
      diveT = rnd3(DIVE_EVERY[0], DIVE_EVERY[1]) + ENTRY_S;
    }
    function spawnGroup(G2) {
      var ty = G2.ty, n = G2.n, W = api.W(), i, m, r, c, cols, rows, side, ch;
      G2.on = true;
      if (G2.pat !== "lines") kindOn(ty);
      if (G2.pat === "grid") {
        rows = G2.o && G2.o.rows || 1;
        cols = Math.max(3, Math.ceil(n / rows));
        cols = Math.min(cols, Math.max(4, Math.floor(W / (MOB_SIZE * api.s0() * 1.6))));
        for (i = 0; i < n; i++) {
          r = Math.floor(i / cols);
          c = i % cols;
          if (r >= rows + 1) break;
          m = add(ty);
          if (!m) break;
          m.st = 0;
          m.del = i * STAGGER_S;
          m.gi = G2.gi;
          m.fx = (c + 0.5) / cols * 0.84 + 0.08;
          m.fy = 0.12 + r * 0.1 + 0.03 * (G2.gi & 1);
          side = r + G2.gi & 1 ? 1 : -1;
          bez(m, 0.5 + side * 0.62, -0.12, 0.5 + side * 0.18, 0.62, m.fx - side * 0.25, 0.08, m.fx, m.fy);
          m.cd = rnd3(0.6, VIRUS_CD[1]);
          m.y0 = 1;
          if (ev === "bounty") m.flee = 1;
        }
      } else if (G2.pat === "arc") {
        for (i = 0; i < n; i++) {
          m = add(ty);
          if (!m) break;
          side = i & 1 ? 1 : -1;
          m.st = 0;
          m.del = (i >> 1) * 0.22;
          m.gi = G2.gi;
          m.dv = 1;
          m.fx = 0.5 + side * (0.08 + 0.11 * (i >> 1));
          if (m.fx < 0.06 || m.fx > 0.94) m.fx = 0.5 + side * 0.06 * ((i >> 1) % 3);
          m.fy = 0.3 + 0.04 * (G2.gi & 1);
          bez(m, side > 0 ? 1.1 : -0.1, 0.32, side > 0 ? 0.55 : 0.45, 0.62, 0.5 - side * 0.35, -0.05, m.fx, m.fy);
          m.cd = rnd3(1, VIRUS_CD[1]);
        }
      } else if (G2.pat === "spiral") {
        for (i = 0; i < n; i++) {
          m = add(ty);
          if (!m) break;
          m.st = 7;
          m.del = i * 0.16;
          m.a = i * TAU3 / n;
          m.gi = G2.gi;
          m.cd = rnd3(1, VIRUS_CD[1]);
          m.dv = ty === SPYWARE ? 1 : 0;
        }
      } else if (G2.pat === "chain") {
        ch = n > 5 ? 2 : 1;
        for (i = 0; i < n; i++) {
          m = add(ty);
          if (!m) break;
          c = Math.floor(i / Math.ceil(n / ch));
          m.st = 5;
          m.ch = c + G2.gi;
          m.del = c * (CHAIN_S * 0.5) + i % Math.ceil(n / ch) * 0.36;
          m.dir = c + G2.gi & 1 ? -1 : 1;
          m.pt = 0;
          m.cd = 0;
          chainPath(m, m.ch);
        }
      } else if (G2.pat === "swarm") {
        side = G2.gi & 1 ? -1 : 1;
        r = [0.22, 0.4, 0.3, 0.5][waveN + G2.gi & 3];
        for (i = 0; i < n; i++) {
          m = add(ty);
          if (!m) break;
          m.st = 10;
          m.del = i % 4 * 0.12 + Math.floor(i / 4) * 0.25;
          m.dir = side;
          m.cd = rnd3(1.5, 6);
          m.y0 = r + rnd3(-0.06, 0.06);
          m.a = rnd3(-30, 30);
          m.pt = 0;
          m.n = 0;
          m.gi = G2.gi;
          m.face = side;
          if (ev === "bounty") m.flee = 1;
        }
      } else if (G2.pat === "worm") {
        wid++;
        var K2 = k * tySize(WORM), gap = 23 * K2, lane = G2.gi + waveN & 1;
        for (i = 0; i < n; i++) {
          m = add(ty);
          if (!m) break;
          m.st = 11;
          m.wid = wid;
          m.sg = i === 0 ? 0 : i === n - 1 ? 2 : 1;
          m.ps = -40 - i * gap;
          m.pv = WORM_V * hs();
          m.y0 = 0.1 + 0.05 * (G2.gi % 3);
          m.dir = lane ? -1 : 1;
          m.hp = Math.ceil((i === 0 ? 3 : i === n - 1 ? 1 : 2) * (1 + 0.25 * lvl));
          m.cd = rnd3(WORM_CD[0], WORM_CD[1]);
          m.ph = i * 0.7;
          if (i) stat.spawn[ty]--;
        }
      } else if (G2.pat === "solo") {
        for (i = 0; i < n; i++) {
          m = add(ty);
          if (!m) break;
          soloInit(m, i, n, G2.gi);
        }
      } else if (G2.pat === "lines") lines = true;
    }
    function chainPath(m, ch) {
      var lo = 0.5 + 0.06 * ((ch + waveN) % 3), hi = 0.1 + 0.05 * (ch % 3);
      if (m.dir > 0) bez(m, -0.12, hi, 0.25, lo, 0.75, lo, 1.12, hi);
      else bez(m, 1.12, hi, 0.75, lo, 0.25, lo, -0.12, hi);
    }
    function soloInit(m, i, n, gi) {
      var side = i + gi & 1 ? 1 : -1, fx = n > 1 ? 0.2 + 0.6 * i / (n - 1) : 0.5;
      m.gi = gi;
      m.del = i * 0.6;
      m.fx = fx;
      switch (m.ty) {
        case MINER:
          m.st = 0;
          m.fx = 0.5 + side * (0.18 + 0.12 * (i >> 1));
          m.fy = 0.15 + 0.05 * (i % 2);
          bez(m, side > 0 ? 1.12 : -0.12, 0.05, side > 0 ? 0.9 : 0.1, 0.5, m.fx, 0.42, m.fx, m.fy);
          m.cd = rnd3(0.5, 1.5);
          break;
        case TROJAN:
          m.st = 20;
          m.dir = side;
          m.face = -side;
          m.fy = 0.16;
          m.x = side > 0 ? -60 : api.W() + 60;
          m.tx = api.W() * (side > 0 ? 0.3 : 0.7);
          m.cd = 1.2;
          m.n = 0;
          break;
        case RANSOM:
          m.st = 21;
          m.fy = 0.19;
          m.sh = Math.ceil(RANSOM_SH * (1 + 0.25 * lvl));
          m.cd = rnd3(1.5, 2.5);
          m.a = rnd3(1.5, 2.5);
          break;
        case PHISH:
          m.st = 22;
          m.dir = side;
          m.face = side > 0 ? -1 : 1;
          m.fy = 0.14 + 0.07 * (i & 1);
          m.x = side > 0 ? -50 : api.W() + 50;
          m.cd = rnd3(1.2, 2);
          m.hk = 0;
          break;
        case ROOTKIT:
          m.st = 23;
          m.vis = 0;
          m.cd = rnd3(0.8, 2) + i * 0.7;
          m.fy = 0.2 + 0.12 * (i % 2);
          m.fx = fx;
          break;
        case KEYLOG:
          m.st = 24;
          m.fy = 0.15 + 0.05 * (i & 1);
          m.cd = rnd3(1.2, 2.2) + i * 0.8;
          break;
        case LOGIC:
          m.st = 25;
          m.fx = n > 1 ? 0.25 + 0.5 * i / (n - 1) : rnd3(0.3, 0.7);
          m.fy = rnd3(0.28, 0.42);
          m.cnt = 0;
          m.del = i * 1.4;
          break;
        case ADWARE:
          m.st = 26;
          m.fx = fx;
          m.fy = 0.3;
          m.y = -40;
          m.cd = rnd3(2, 4);
          break;
      }
      if (m.st >= 20 && m.st !== 20 && m.st !== 22) {
        m.x = m.fx * api.W();
        m.y = -60 * api.s0();
      }
    }
    function leave() {
      done = false;
      active = false;
      lines = false;
      for (var i = 0; i < mN; i++) M[i].lv = 1;
      gN = 0;
    }
    function clear() {
      mN = 0;
      bN = 0;
      dN = 0;
      active = false;
      lines = false;
      done = false;
      gN = 0;
      tok = 0;
    }
    function drop(x, y, vx, vy, ty, src) {
      if (bN >= NB || bN >= MAXB + (ty === 1 ? 4 : 0)) return;
      var b = B[bN++], s0 = api.s0();
      b.x = x;
      b.y = y;
      b.vx = vx;
      b.vy = vy;
      b.a = rnd3(0, 6);
      b.va = rnd3(-5, 5);
      b.r = (ty === 1 ? 5.6 : ty === 2 ? 5.4 : 7.2) * s0;
      b.t = 0;
      b.near = 0;
      b.ty = ty;
      b.stick = 0;
      b.src = src;
      stat.drop[src]++;
    }
    function aimed(m, x, y, v, spread) {
      var sh = api.ship, a = Math.atan2(sh.y - y, sh.x - x) + spread;
      drop(x, y, Math.cos(a) * v, Math.sin(a) * v, 2, m.ty);
    }
    function loot(x, y, ty) {
      if (dN >= ND) return;
      var d = D[dN++];
      d.x = x;
      d.y = y;
      d.vx = rnd3(-40, 40);
      d.vy = rnd3(-120, -60);
      d.t = 0;
      d.ty = ty;
      d.mg = 0;
      stat.drops[ty]++;
    }
    function lootFor(m) {
      var big = ev === "bounty";
      if (big) {
        api.chip(m.x + 10, m.y, BOUNTY_KR);
        stat.drops[1]++;
      } else stat.drops[0]++;
      if (Math.random() < (big ? 0.12 : DROP_UP_P)) loot(m.x + 8, m.y, 2);
      else if (m.ty === LOGIC || Math.random() < (big ? 0.06 : DROP_BOMB_P)) loot(m.x - 8, m.y, 3);
    }
    function takeTok(m, colX) {
      if (tok >= MAX_TOK) return false;
      if (colX != null) for (var i = 0; i < mN; i++) {
        var o = M[i];
        if (o !== m && o.tk === 2 && Math.abs(o.tx - colX) < COL_GAP * api.s0()) return false;
      }
      tok++;
      m.tk = colX != null ? 2 : 1;
      m.tx = colX != null ? colX : m.tx;
      return true;
    }
    function freeTok(m) {
      if (m.tk) {
        m.tk = 0;
        tok = Math.max(0, tok - 1);
      }
    }
    var WX = 0, WY = 0;
    function wormAt(m, ps) {
      var W = api.W(), H = api.H(), mg = 0.08 * W, Lw = W - 2 * mg, h = hs(), y0 = m.y0 * H, dr = 0.11 * H, u, lane, f, ln2, e;
      if (ps < 0) {
        WX = m.dir > 0 ? mg : W - mg;
        WY = y0 + ps;
        return;
      }
      u = ps / Lw;
      lane = Math.floor(u);
      f = u - lane;
      ln2 = lane % 6;
      ln2 = ln2 > 3 ? 6 - ln2 : ln2;
      var nx = (lane + 1) % 6, ln22 = nx > 3 ? 6 - nx : nx;
      e = f > 0.88 ? (f - 0.88) / 0.12 : 0;
      e = e * e * (3 - 2 * e);
      var fx = lane & 1 ? 1 - f : f;
      if (m.dir < 0) fx = 1 - fx;
      WX = mg + fx * Lw;
      WY = y0 + dr * (ln2 + (ln22 - ln2) * e) + Math.sin(ps * 0.028) * 14 * h;
    }
    function update(dt, sd) {
      var W = api.W(), H = api.H(), s0 = api.s0(), sh = api.ship, play = api.playing(), h = hs(), m, b, u, i, q, dx, dy, d, r, gx, gy, nAlive = 0, hx1, hx2, hy1, hy2, gz, px, K2, o;
      T += sd;
      if (att) {
        attract(sd);
        return;
      }
      for (i = 0; i < gN; i++) if (!groups[i].on && T >= groups[i].d) spawnGroup(groups[i]);
      gx = Math.sin(T * 0.55) * W * 0.045;
      gy = Math.min(T * 3.2 * h, H * 0.1);
      for (i = mN - 1; i >= 0; i--) {
        m = M[i];
        m.t += sd;
        if (m.hit > 0) m.hit -= sd;
        if (m.fl > 0) m.fl -= sd;
        if (m.hide > 0) m.hide -= sd;
        if (m.atk >= 0 && (m.atk += sd) > ATK_S) m.atk = -1;
        if (m.die >= 0) {
          if ((m.die += sd) > DIE_S) {
            M[i] = M[mN - 1];
            M[mN - 1] = m;
            mN--;
          }
          continue;
        }
        if (m.del > 0) {
          m.del -= sd;
          if (m.st < 20) m.x = -999;
          nAlive++;
          continue;
        }
        K2 = KK(m);
        dx = sh.x - m.x;
        dy = sh.y - m.y;
        d = Math.sqrt(dx * dx + dy * dy) || 1;
        m.ex += (dx / d - m.ex) * Math.min(1, sd * 6);
        m.ey += (dy / d - m.ey) * Math.min(1, sd * 6);
        if ((m.tl -= sd) <= 0) {
          m.tl = rnd3(2, 5);
          m.lid = 1;
        }
        if (m.lid > 0 && m.glow === 0) m.lid = Math.max(0, m.lid - sd * 7);
        if (m.lv) {
          freeTok(m);
          m.hk = 0;
          m.arm = 0;
          m.glow = 0;
          m.vis = Math.max(m.vis, m.ty === ROOTKIT ? 0.6 : 1);
          if (m.ty === WORM) {
            m.ps -= Math.abs(m.pv) * 2.5 * sd;
            wormAt(m, m.ps);
            m.x = WX;
            m.y = WY;
          } else m.y -= 320 * h * sd;
          m.lean *= 0.9;
          if (m.y < -80 * s0 || m.x < -500) {
            M[i] = M[mN - 1];
            M[mN - 1] = m;
            mN--;
          }
          continue;
        }
        nAlive++;
        if (m.flee && m.st === 1 && m.et > 1.2) {
          m.st = 12;
          m.et = 0;
          m.vx = (m.x < W / 2 ? -1 : 1) * rnd3(30, 70);
          m.vy = -rnd3(5, 15);
        }
        switch (m.st) {
          case 0:
            m.et += sd;
            u = Math.min(1, m.et / ENTRY_S);
            u = u * u * (3 - 2 * u);
            px = m.x;
            bezAt(m, u);
            m.lean = (m.x - px) * 0.01;
            if (m.ty !== MINER) {
              m.x += gx * u;
              m.y += (m.y0 ? gy : 0) * u;
            }
            if (u >= 1) {
              m.st = m.ty === MINER ? 6 : 1;
              m.et = 0;
            }
            break;
          case 1:
            m.et += sd;
            m.x = m.fx * W + gx;
            m.y = m.fy * H + (m.y0 ? gy : 0);
            m.lean *= 0.9;
            if ((m.ty === VIRUS || m.ty === BOTNET) && play && !m.flee && (m.cd -= sd) <= 0) {
              m.cd = rnd3(VIRUS_CD[0], VIRUS_CD[1]) * (m.ty === BOTNET ? 1.4 : 1) / (1 + 0.15 * lvl);
              m.atk = 0;
              drop(m.x, m.y + 22 * K2, 0, BOMB_V * h * (1 + 0.06 * lvl), 0, m.ty);
              api.msfx(m.ty, 0);
            }
            break;
          case 2:
            m.x = m.fx * W + gx + Math.sin(m.et * 60) * 1.5;
            m.y = m.fy * H + (m.y0 ? gy : 0);
            m.et += sd;
            m.lid = 0.45;
            m.glow = 1;
            if (m.et >= DIVE_TELE) {
              m.st = 3;
              m.et = 0;
              m.glow = 0;
              m.lid = 0;
              m.atk = 0;
              stat.drop[m.ty]++;
              api.msfx(m.ty, 0);
              dx = sh.x - m.x;
              dy = sh.y - m.y;
              d = Math.sqrt(dx * dx + dy * dy) || 1;
              m.vx = dx / d * DIVE_V * h * 0.4;
              m.vy = dy / d * DIVE_V * h * 0.4;
            }
            break;
          case 3:
            m.et += sd;
            if (m.et < 0.45) {
              dx = sh.x - m.x;
              dy = sh.y - m.y;
              r = Math.sqrt(dx * dx + dy * dy) || 1;
              m.vx += (dx / r * DIVE_V * h - m.vx) * Math.min(1, sd * 3);
              m.vy += (Math.max(0.4, dy / r) * DIVE_V * h - m.vy) * Math.min(1, sd * 3);
            }
            m.vy += 220 * h * sd;
            m.x += m.vx * sd;
            m.y += m.vy * sd;
            m.lean = Math.atan2(m.vx, m.vy) * -0.5;
            if (m.y > H + 70 * s0 || m.x < -90 || m.x > W + 90) {
              if (m.ty === DRONE) {
                M[i] = M[mN - 1];
                M[mN - 1] = m;
                mN--;
                continue;
              }
              m.st = 4;
              m.et = 0;
              bez(m, m.fx, -0.15, m.fx + 0.1, 0.02, m.fx - 0.1, m.fy - 0.06, m.fx, m.fy);
            }
            break;
          case 4:
            m.et += sd;
            u = Math.min(1, m.et / 1.2);
            bezAt(m, u * u * (3 - 2 * u));
            m.x += gx * u;
            m.lean *= 0.9;
            if (u >= 1) {
              m.st = m.r ? 8 : 1;
              m.et = 0;
            }
            break;
          case 5:
            m.pt += sd / CHAIN_S;
            u = m.pt;
            px = m.x;
            bezAt(m, Math.min(1, u));
            m.lean = (m.x - px) * 0.012;
            m.face = 1;
            if (play && u > 0.24 && u < 0.76 && (m.cd -= sd) <= 0) {
              m.cd = m.ty === BOTNET ? CARPET_DT : rnd3(1.2, 2.4);
              m.atk = 0;
              drop(m.x, m.y + 20 * K2, m.dir * 18, BOMB_V * h * 1.12, 0, m.ty);
              if (m.ty !== BOTNET || (m.t * 3 | 0) % 3 === 0) api.msfx(m.ty, 0);
            }
            if (u >= 1) {
              m.pt = 0;
              m.dir = -m.dir;
              m.del = 1.4;
              m.cd = 0;
              m.ch++;
              chainPath(m, m.ch);
            }
            break;
          case 6:
            m.et += sd;
            if (m.glow) {
              m.lid = 0.3;
              if ((m.cd -= sd) <= 0) {
                m.glow = 0;
                m.lid = 0;
                m.atk = 0;
                m.hide = 0.6;
                m.cd = rnd3(MINER_CD[0], MINER_CD[1]) / (1 + 0.1 * lvl);
                drop(m.x, m.y + 24 * K2, 0, DRILL_V * h, 1, MINER);
                api.msfx(MINER, 0);
                freeTok(m);
              }
            } else {
              d = sh.x - m.x;
              r = 150 * h * sd;
              m.x += d > r ? r : d < -r ? -r : d;
              m.lean = (d > 0 ? 1 : -1) * Math.min(0.15, Math.abs(d) * 2e-3);
              for (q = 0; q < mN; q++) {
                o = M[q];
                if (o === m || o.ty !== MINER || o.die >= 0 || o.st !== 6) continue;
                dx = m.x - o.x;
                if (dx > -86 * k * 1.9 && dx < 86 * k * 1.9) m.x += (dx >= 0 ? 1 : -1) * 120 * h * sd;
              }
              if (m.x < 30 * s0) m.x = 30 * s0;
              else if (m.x > W - 30 * s0) m.x = W - 30 * s0;
              m.y = m.fy * H + Math.sin(m.t * 1.7) * 6;
              if (play && (m.cd -= sd) <= 0 && Math.abs(d) < 60 * s0 && takeTok(m, m.x)) {
                m.glow = 1;
                m.cd = MINER_TELE;
                api.sfx("tele");
              } else if (m.cd < -1.5) m.cd = 0;
            }
            break;
          case 7:
            m.et += sd;
            u = Math.min(1, m.et / 2.4);
            r = Math.min(W, H) * 0.17;
            d = r + (Math.max(W, H) * 0.75 - r) * Math.pow(1 - u, 1.5);
            q = m.a + T * 0.5 + (1 - u) * 3 * Math.PI;
            dy = Math.sin(q) * d * 0.72;
            if (dy > H * 0.2) dy = H * 0.2;
            px = m.x;
            m.x = W * 0.5 + Math.cos(q) * d;
            m.y = H * 0.3 + dy;
            m.lean = (m.x - px) * 0.01;
            if (u >= 1) {
              m.st = 8;
              m.et = 0;
              m.r = 1;
            }
            break;
          case 8:
            m.et += sd;
            r = Math.min(W, H) * 0.17 * (1 + 0.12 * Math.sin(T * 0.9));
            q = m.a + T * 0.5;
            m.x = W * 0.5 + Math.cos(q) * r;
            m.y = H * 0.3 + Math.sin(q) * r * 0.72;
            m.lean = -Math.sin(q) * 0.15;
            m.fx = m.x / W;
            m.fy = m.y / H;
            if (m.ty === VIRUS && play && (m.cd -= sd) <= 0) {
              m.cd = rnd3(VIRUS_CD[0], VIRUS_CD[1]) * 1.2 / (1 + 0.15 * lvl);
              m.atk = 0;
              drop(m.x, m.y + 22 * K2, 0, BOMB_V * h, 0, VIRUS);
              api.msfx(VIRUS, 0);
            }
            break;
          case 10:
            m.pt += sd;
            px = m.x;
            m.x = m.dir > 0 ? -40 + m.pt * 190 * h + m.a : W + 40 - m.pt * 190 * h - m.a;
            m.y = m.y0 * H + Math.sin(m.pt * 2.6 + m.ph * 0.4) * H * 0.07 + Math.sin(m.t * 9 + m.ph) * 3;
            m.lean = Math.cos(m.pt * 2.6 + m.ph * 0.4) * 0.3 * m.dir;
            m.face = m.dir;
            if (m.flee && m.pt > 1.5) {
              m.y -= (m.pt - 1.5) * 90 * h;
            }
            if (play && !m.flee && m.x > 20 && m.x < W - 20 && m.y < H * 0.6 && (m.cd -= sd) <= 0) {
              m.cd = rnd3(SPAM_CD[0], SPAM_CD[1]) / (1 + 0.1 * lvl);
              m.atk = 0;
              drop(m.x, m.y + 10 * K2, 0, BOMB_V * h * 0.75, 2, SPAM);
              if (i % 3 === 0) api.msfx(SPAM, 0);
            }
            if (m.dir > 0 && m.x > W + 50 || m.dir < 0 && m.x < -50) {
              if (++m.n >= 3 || m.flee) {
                M[i] = M[mN - 1];
                M[mN - 1] = m;
                mN--;
                continue;
              }
              m.dir = -m.dir;
              m.pt = 0;
              m.y0 = [0.22, 0.48, 0.34][m.n % 3] + rnd3(-0.05, 0.05);
              m.del = 0.6;
            }
            break;
          case 11:
            m.ps += m.pv * sd;
            wormAt(m, m.ps);
            m.x = WX;
            m.y = WY;
            wormAt(m, m.ps + (m.pv >= 0 ? 4 : -4));
            dx = WX - m.x;
            dy = WY - m.y;
            m.face = dx >= 0 ? 1 : -1;
            m.lean = Math.atan2(dy * m.face, dx * m.face);
            if (m.pv < 0 && m.ps < -80) {
              M[i] = M[mN - 1];
              M[mN - 1] = m;
              mN--;
              continue;
            }
            if (m.sg === 0 && play && m.ps > 0 && (m.cd -= sd) <= 0) {
              m.cd = rnd3(WORM_CD[0], WORM_CD[1]) / (1 + 0.15 * lvl);
              m.atk = 0;
              drop(m.x, m.y + 14 * K2, 0, BOMB_V * h, 0, WORM);
              api.msfx(WORM, 0);
            }
            break;
          case 12:
            m.et += sd;
            m.vy -= 14 * h * sd;
            m.x += (m.vx + Math.sin(m.et * 5 + m.ph) * 90) * sd;
            m.y += m.vy * sd;
            if (m.y < -60 * s0 || m.x < -60 || m.x > W + 60) {
              M[i] = M[mN - 1];
              M[mN - 1] = m;
              mN--;
              continue;
            }
            break;
          case 20:
            trojan(m, sd, W, H, h, K2, play);
            break;
          case 21:
            ransom(m, sd, W, H, h, K2, play);
            break;
          case 22:
            phish(m, sd, W, H, h, K2, play);
            break;
          case 23:
            rootkit(m, sd, W, H, h, K2, play);
            break;
          case 24:
            keylog(m, sd, W, H, h, K2, play);
            break;
          case 25:
            if (logic(m, sd, W, H, h, K2, play)) {
              M[i] = M[mN - 1];
              M[mN - 1] = m;
              mN--;
              continue;
            }
            break;
          case 26:
            adware(m, sd, W, H, h, K2);
            break;
          case 30:
          case 31:
          case 32:
            drone(m, sd, W, H, h, K2, play);
            break;
        }
      }
      if (active && play && (diveT -= sd) <= 0) {
        diveT = rnd3(DIVE_EVERY[0], DIVE_EVERY[1]) / (1 + 0.12 * lvl);
        var pick = -1, n = 0;
        for (i = 0; i < mN; i++) if (M[i].dv && (M[i].st === 1 || M[i].st === 8) && M[i].die < 0 && !M[i].lv && !M[i].flee && Math.random() * ++n < 1) pick = i;
        if (pick >= 0) {
          M[pick].st = 2;
          M[pick].et = 0;
          api.sfx("tele");
        }
      }
      hx1 = sh.x - 6 * s0;
      hx2 = sh.x + 6 * s0;
      hy1 = sh.y - 9 * s0;
      hy2 = sh.y + 9 * s0;
      gz = api.grazeR();
      for (i = bN - 1; i >= 0; i--) {
        b = B[i];
        b.t += sd;
        if (b.stick > 0) {
          if ((b.stick -= sd) <= 0) {
            B[i] = B[bN - 1];
            B[bN - 1] = b;
            bN--;
          }
          continue;
        }
        b.x += b.vx * sd;
        b.y += b.vy * sd;
        b.a += b.va * sd;
        if (b.ty === 1 && b.y > H - 6 * s0) {
          b.y = H - 6 * s0;
          b.stick = 0.5;
          continue;
        }
        if (b.y > H + 20 || b.y < -40 || b.x < -30 || b.x > W + 30) {
          B[i] = B[bN - 1];
          B[bN - 1] = b;
          bN--;
          continue;
        }
        if (!play) continue;
        dx = b.x < hx1 ? hx1 - b.x : b.x > hx2 ? b.x - hx2 : 0;
        dy = b.y < hy1 ? hy1 - b.y : b.y > hy2 ? b.y - hy2 : 0;
        d = Math.sqrt(dx * dx + dy * dy) - b.r;
        if (d < 0) {
          cause = ALL_NAMES[b.src] + (b.ty === 1 ? ": wiertło" : b.ty === 2 ? ": pocisk" : ": bomba");
          B[i] = B[bN - 1];
          B[bN - 1] = b;
          bN--;
          if (api.hurt(cause)) return;
          continue;
        }
        if (d < gz) {
          if (!b.near) b.near = 1;
        } else if (b.near === 1) {
          b.near = 2;
          api.graze();
        }
      }
      if (play) for (i = 0; i < mN; i++) {
        m = M[i];
        if (m.die >= 0 || m.x < -500 || m.lv) continue;
        K2 = KK(m);
        if (m.ty === RANSOM && m.arm > 0 && m.a2 === 2) {
          var cx = m.x + m.armS * 28 * K2, cy = m.y + (24 + m.arm) * K2;
          dx = cx < hx1 ? hx1 - cx : cx > hx2 ? cx - hx2 : 0;
          dy = cy < hy1 ? hy1 - cy : cy > hy2 ? cy - hy2 : 0;
          if (dx * dx + dy * dy < 100 * K2 * K2) {
            cause = "Ransomware: cep";
            if (api.hurt(cause)) return;
          }
          if (Math.abs(sh.x - cx) < 5 * K2 + 6 * s0 && sh.y > m.y && sh.y < cy) {
            cause = "Ransomware: łańcuch";
            if (api.hurt(cause)) return;
          }
        }
        if (m.ty === PHISH && m.hk === 2 && Math.abs(sh.x - m.hx) < 12 * s0 && Math.abs(sh.y - m.hy) < 16 * s0) {
          m.hk = 3;
          m.ht = 0;
          stat.hooked++;
          api.floater(sh.x, sh.y - 30 * s0, "złapany na haczyk");
          api.msfx(PHISH, 0);
        }
        if (m.ty === PHISH && m.hk === 3) {
          sh.y = Math.min(H - 20 * s0, sh.y + HOOK_PULL * h * sd);
          sh.x += (m.hx - sh.x) * Math.min(1, sd * 2);
          m.hx = sh.x;
          m.hy = sh.y;
        }
      }
      if (play) for (i = 0; i < mN; i++) {
        m = M[i];
        if (m.die >= 0 || m.x < -500 || m.ty === ROOTKIT && m.vis < 0.5) continue;
        r = HIT_R[m.ty] * KK(m) * 0.85;
        dx = m.x < hx1 ? hx1 - m.x : m.x > hx2 ? m.x - hx2 : 0;
        dy = m.y < hy1 ? hy1 - m.y : m.y > hy2 ? m.y - hy2 : 0;
        if (dx * dx + dy * dy < r * r) {
          cause = ALL_NAMES[m.ty] + ": zderzenie";
          kill(m, false);
          if (api.hurt(cause)) return;
        }
      }
      var mg = api.magnet();
      for (i = dN - 1; i >= 0; i--) {
        o = D[i];
        o.t += sd;
        dx = sh.x - o.x;
        dy = sh.y - o.y;
        d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (play && d < mg) o.mg = 1;
        if (o.mg) {
          r = (260 + 500 * o.t) * sd;
          o.x += dx / d * Math.min(d, r);
          o.y += dy / d * Math.min(d, r);
        } else {
          o.vy = Math.min(110 * h, o.vy + 260 * sd);
          o.vx *= 0.97;
          o.x += o.vx * sd + Math.sin(o.t * 3 + i) * 12 * sd;
          o.y += o.vy * sd;
        }
        if (play && d < 16 * s0) {
          stat.picked[o.ty]++;
          api.pickup(o.ty, o.x, o.y);
          D[i] = D[dN - 1];
          D[dN - 1] = o;
          dN--;
          continue;
        }
        if (o.y > H + 20) {
          D[i] = D[dN - 1];
          D[dN - 1] = o;
          dN--;
        }
      }
      if (mN + bN > maxObj) maxObj = mN + bN;
      var pending = false;
      for (i = 0; i < gN; i++) if (!groups[i].on) pending = true;
      if (active && !pending && nAlive === 0 && T > 1) {
        active = false;
        done = true;
      }
      if (active && T > WAVE_MAX) {
        leave();
        done = true;
      }
      if (lines && T > LINES_S) {
        lines = false;
        done = true;
      }
    }
    function trojan(m, sd, W, H, h, K2, play) {
      var d = m.tx - m.x, v = 70 * h * sd, i;
      m.y = m.fy * H + Math.abs(Math.sin(m.t * 7)) * -2 * m.walk;
      if (m.a2 === 0) {
        m.walk = 1;
        m.face = d > 0 ? -1 : 1;
        m.x += d > v ? v : d < -v ? -v : d;
        m.hatch = Math.max(0, m.hatch - sd * 3);
        if (Math.abs(d) < 2 && (m.cd -= sd) <= 0) {
          m.a2 = 1;
          m.et = 0;
          m.walk = 0;
          api.sfx("tele");
        }
      } else if (m.a2 === 1) {
        m.et += sd;
        m.hatch = Math.min(1, m.et / TROJAN_TELE);
        m.tens = m.hatch;
        m.x += Math.sin(m.et * 50) * 0.6;
        if (m.et >= TROJAN_TELE) {
          var alive = 0;
          for (i = 0; i < mN; i++) if (M[i].ty === DRONE && M[i].die < 0) alive++;
          if (play) for (i = 0; i < DRONES + (lvl > 1 ? 1 : 0) && alive + i < DRONE_MAX; i++) {
            var o = add(DRONE);
            if (!o) break;
            o.st = 30;
            o.x = m.x - m.face * 0;
            o.y = m.y + 14 * K2;
            o.vx = (i - 1.5) * 80 * h;
            o.vy = 60 * h;
            o.del = i * 0.12;
            o.cd = rnd3(0.5, 1.4);
            o.fx = (m.x + (i - 1.5) * 50 * api.s0()) / W;
            o.fy = 0.32 + 0.05 * (i & 1);
            kindOn(DRONE);
          }
          m.atk = 0;
          stat.drop[TROJAN]++;
          api.msfx(TROJAN, 0);
          m.a2 = 2;
          m.et = 0;
        }
      } else {
        m.et += sd;
        if (m.et > 0.6) {
          m.a2 = 0;
          m.n++;
          m.tx = W * (0.18 + Math.random() * 0.64);
          m.cd = TROJAN_CD / (1 + 0.12 * lvl);
        }
      }
    }
    function drone(m, sd, W, H, h, K2, play) {
      var tx = m.fx * W, ty = m.fy * H;
      if (m.st === 30) {
        m.x += (tx - m.x) * Math.min(1, sd * 3);
        m.y += (ty - m.y) * Math.min(1, sd * 3);
        if (Math.abs(ty - m.y) < 4) {
          m.st = 31;
          m.et = 0;
        }
      } else if (m.st === 31) {
        m.et += sd;
        m.x = tx + Math.sin(m.t * 2 + m.ph) * 14;
        m.y = ty + Math.sin(m.t * 3.1 + m.ph) * 6;
        if (play && m.et > m.cd + 0.6) {
          m.st = 32;
          m.et = 0;
          api.sfx("tele");
        }
      } else {
        m.et += sd;
        m.glow = 1;
        m.lid = 0.45;
        if (m.et > 0.45) {
          m.st = 3;
          m.et = 0;
          m.glow = 0;
          m.lid = 0;
          m.atk = 0;
          stat.drop[DRONE]++;
          api.msfx(DRONE, 0);
          m.vx = 0;
          m.vy = DIVE_V * h * 0.3;
        }
      }
    }
    function ransom(m, sd, W, H, h, K2, play) {
      var sh = api.ship, d, v;
      if (m.y < m.fy * H - 1) {
        m.y += 60 * h * sd;
        return;
      }
      m.y = m.fy * H + Math.sin(m.t * 1.3) * 3;
      if (!m.a2) {
        d = sh.x - m.x;
        v = 34 * h * sd;
        m.x += d > v ? v : d < -v ? -v : d;
        m.lean = d > 0 ? 0.04 : -0.04;
        if (play && (m.a -= sd) <= 0) {
          m.a = rnd3(2.2, 3.2) / (1 + 0.15 * lvl);
          m.atk = 0;
          drop(m.x, m.y + 30 * K2, 0, BOMB_V * h * 0.8, 0, RANSOM);
          api.msfx(RANSOM, 0);
        }
        if (play && (m.cd -= sd) <= 0) {
          m.armS = sh.x >= m.x ? 1 : -1;
          if (takeTok(m, m.x + m.armS * 28 * K2)) {
            m.a2 = 1;
            m.et = 0;
            api.sfx("tele");
          } else m.cd = 0.4;
        }
      } else if (m.a2 === 1) {
        m.et += sd;
        m.tens = Math.min(1, m.et / FLAIL_TELE);
        m.arm = Math.sin(m.et * 40) * 2;
        if (m.et >= FLAIL_TELE) {
          m.a2 = 2;
          m.et = 0;
          m.atk = 0;
          m.arm = 0;
          stat.drop[RANSOM]++;
          api.msfx(RANSOM, 0);
        }
      } else if (m.a2 === 2) {
        d = Math.min(H * 0.92 - m.y, Math.max(sh.y + 20, H * 0.6) - m.y) / K2;
        m.arm = Math.min(d, m.arm + FLAIL_V / K2 * sd);
        if (m.arm >= d) {
          m.et += sd;
          if (m.et > 0.25) {
            m.a2 = 3;
          }
        }
      } else {
        m.arm -= FLAIL_V * 0.6 / K2 * sd;
        if (m.arm <= 0) {
          m.arm = 0;
          m.a2 = 0;
          m.cd = rnd3(FLAIL_CD[0], FLAIL_CD[1]) / (1 + 0.12 * lvl);
          m.tens = 0;
          freeTok(m);
        }
      }
    }
    function phish(m, sd, W, H, h, K2, play) {
      var sh = api.ship, tipx, tipy;
      if (m.hk === 0 || m.hk === 5) {
        m.x += m.dir * 60 * h * sd;
        m.face = m.dir > 0 ? -1 : 1;
        if (m.dir > 0 && m.x > W - 40 * K2 - 24 || m.dir < 0 && m.x < 40 * K2 + 24) {
          if (m.x > -20 && m.x < W + 20) m.dir = -m.dir;
        }
      }
      m.y = m.fy * H + Math.sin(m.t * 1.6 + m.ph) * 8;
      tipx = m.x + m.face * -16 * K2;
      tipy = m.y - 44 * K2;
      if (m.hk === 0) {
        m.hx = tipx;
        m.hy = tipy + 10 * K2;
        if (play && (m.cd -= sd) <= 0 && m.x > 30 && m.x < W - 30 && Math.abs(sh.x - tipx) < W * 0.3) {
          m.hk = 1;
          m.ht = 0;
          api.sfx("tele");
        }
      } else if (m.hk === 1) {
        m.ht += sd;
        m.tens = 1;
        m.hx = tipx + Math.sin(m.ht * 18) * 6;
        m.hy = tipy + 10 * K2;
        if (m.ht >= HOOK_TELE) {
          m.hk = 2;
          m.ht = 0;
          m.atk = 0;
          stat.drop[PHISH]++;
          api.msfx(PHISH, 0);
          m.tens = 0;
        }
      } else if (m.hk === 2) {
        m.hx = tipx;
        m.hy += HOOK_V * h * sd;
        if (m.hy > Math.min(H - 10, sh.y + 70 * api.s0())) {
          m.hk = 4;
        }
      } else if (m.hk === 3) {
        m.ht += sd;
        if (m.ht > HOOK_HOLD) {
          m.hk = 4;
        }
      } else if (m.hk === 4) {
        m.hx += (tipx - m.hx) * Math.min(1, sd * 6);
        m.hy -= HOOK_V * 0.8 * h * sd;
        if (m.hy <= tipy + 10 * K2) {
          m.hk = 0;
          m.cd = rnd3(HOOK_CD[0], HOOK_CD[1]) / (1 + 0.12 * lvl);
        }
      } else if (m.hk === 5) {
        m.ht += sd;
        m.hy += 300 * sd;
        if (m.ht > 2) {
          m.hk = 0;
          m.cd = rnd3(1, 2);
        }
      }
    }
    function rootkit(m, sd, W, H, h, K2, play) {
      if (m.y < m.fy * H - 1 && m.a2 === 0) m.y += 200 * h * sd;
      if (m.a2 === 0) {
        m.vis = m.t % 0.9 < 0.09 ? 0.35 : 0;
        if (play && (m.cd -= sd) <= 0 && takeTok(m, null)) {
          m.a2 = 1;
          m.et = 0;
          api.msfx(ROOTKIT, 0);
        } else if (m.cd < 0) m.cd = 0.3;
      } else if (m.a2 === 1) {
        m.et += sd;
        m.vis = Math.min(1, m.et / ROOT_MAT);
        m.glow = m.vis > 0.5 ? 1 : 0;
        m.lid = 0.4;
        if (m.et >= ROOT_MAT) {
          m.glow = 0;
          m.lid = 0;
          m.atk = 0;
          m.a2 = 2;
          m.et = 0;
          if (play) for (var q = -1; q <= 1; q++) aimed(m, m.x, m.y + 10 * K2, SHOT_V * h * (1 + 0.05 * lvl), q * 0.22);
        }
      } else if (m.a2 === 2) {
        m.et += sd;
        if (m.et > 0.3) freeTok(m);
        if (m.et > ROOT_SHOW) {
          m.a2 = 3;
          m.et = 0;
        }
      } else {
        m.et += sd;
        m.vis = Math.max(0, 1 - m.et / 0.4);
        if (m.et > 0.4) {
          m.a2 = 0;
          m.vis = 0;
          m.x = W * (0.12 + Math.random() * 0.76);
          m.y = H * (0.12 + Math.random() * 0.28);
          m.cd = rnd3(ROOT_CD[0], ROOT_CD[1]) / (1 + 0.12 * lvl);
        }
      }
    }
    function keylog(m, sd, W, H, h, K2, play) {
      var sh = api.ship, a;
      if (m.y < m.fy * H - 1) {
        m.y += 120 * h * sd;
        return;
      }
      m.y = m.fy * H;
      a = Math.atan2(sh.y - (m.y - 4 * K2), sh.x - m.x);
      if (m.a2 === 0) {
        m.aim += (a - m.aim) * Math.min(1, sd * 4);
        if (play && (m.cd -= sd) <= 0) {
          if (takeTok(m, null)) {
            m.a2 = 1;
            m.et = 0;
            api.sfx("tele");
          } else m.cd = 0.3;
        }
      } else if (m.a2 === 1) {
        m.et += sd;
        m.glow = 1;
        m.lid = 0.35;
        m.tens = Math.min(1, m.et / KEY_TELE);
        if (m.et < KEY_TELE - KEY_LOCK) m.aim += (a - m.aim) * Math.min(1, sd * 8);
        if (m.et >= KEY_TELE) {
          m.glow = 0;
          m.lid = 0;
          m.atk = 0;
          m.a2 = 2;
          m.et = 0;
          m.tens = 0;
          var bx = m.x + Math.cos(m.aim) * 34 * K2, by = m.y - 4 * K2 + Math.sin(m.aim) * 34 * K2, v = KEY_V * h;
          drop(bx, by, Math.cos(m.aim) * v, Math.sin(m.aim) * v, 2, KEYLOG);
          api.msfx(KEYLOG, 0);
        }
      } else {
        m.et += sd;
        if (m.et > 0.3) {
          m.a2 = 0;
          freeTok(m);
          m.cd = rnd3(KEY_CD[0], KEY_CD[1]) / (1 + 0.12 * lvl);
        }
      }
    }
    var lastBoom = -9;
    function logic(m, sd, W, H, h, K2, play) {
      if (m.y < m.fy * H - 1) {
        m.y += 110 * h * sd;
        m.lean = Math.sin(m.t * 3) * 0.08;
        return false;
      }
      m.y = m.fy * H + Math.sin(m.t * 2) * 3;
      if (!play) return false;
      if (m.cnt === 0) m.cnt = LOGIC_N + 0.999;
      var c0 = Math.ceil(m.cnt);
      m.cnt -= sd;
      if (Math.ceil(m.cnt) !== c0 && m.cnt > 0) api.msfx(LOGIC, 2);
      if (m.cnt <= 1 && T - lastBoom < 1) m.cnt = 1.01;
      m.glow = m.cnt < 2 ? 1 : 0;
      if (m.cnt <= 0) {
        lastBoom = T;
        stat.boom++;
        stat.drop[LOGIC]++;
        var a0 = Math.random() * TAU3, v = SHOT_V * 0.75 * h;
        for (var q = 0; q < RING_N; q++) {
          var a = a0 + q * TAU3 / RING_N;
          drop(m.x + Math.cos(a) * 16 * K2, m.y + Math.sin(a) * 16 * K2, Math.cos(a) * v, Math.sin(a) * v, 2, LOGIC);
        }
        api.bits(m.x, m.y, 20);
        api.msfx(LOGIC, 0);
        api.sfx("bomb");
        m.die = 0;
        return false;
      }
      return false;
    }
    function adware(m, sd, W, H, h, K2) {
      var sh = api.ship, best = null, bd = 1e9, i, o, d, tx, ty;
      for (i = 0; i < mN; i++) {
        o = M[i];
        if (o === m || o.die >= 0 || o.lv || o.ty === ADWARE || o.x < -500 || o.ty === SPAM) continue;
        d = Math.abs(o.x - sh.x) + Math.abs(o.y - H * 0.2) * 0.3;
        if (d < bd) {
          bd = d;
          best = o;
        }
      }
      tx = best ? best.x : m.fx * W;
      ty = best ? Math.min(H * 0.55, best.y + HIT_R[best.ty] * KK(best) + 30 * K2) : m.fy * H;
      m.x += (tx - m.x) * Math.min(1, sd * 1.4);
      m.y += (ty - m.y) * Math.min(1, sd * 1.4);
      m.lean = (tx - m.x) * 2e-3;
      if (api.playing() && m.y > 0 && (m.cd -= sd) <= 0) {
        m.cd = rnd3(AD_CD[0], AD_CD[1]) / (1 + 0.1 * lvl);
        m.atk = 0;
        aimed(m, m.x, m.y + 20 * K2, SHOT_V * 0.8 * h, 0);
        api.msfx(ADWARE, 0);
      }
    }
    function kill(m, scored) {
      if (m.die >= 0) return;
      m.die = 0;
      m.glow = 0;
      stat.kill[m.ty]++;
      freeTok(m);
      if (m.ty === WORM) splitWorm(m);
      if (scored) {
        var p = MOB_PTS[m.ty];
        if (m.ty === KEYLOG) api.combo(2);
        if (m.ty === ROOTKIT) api.floater(m.x, m.y - 34 * k, "rootkit wykryty");
        if (m.ty === LOGIC && m.cnt > 0) {
          stat.defused++;
          api.floater(m.x, m.y - 34 * k, "rozbrojona");
        }
        api.score(p, m.x, m.y - 20 * k, m.ty);
        lootFor(m);
      }
      if (m.ty === PHISH && m.hk === 3) m.hk = 0;
      api.bits(m.x, m.y, m.ty === SPAM || m.ty === DRONE ? 5 : 12 + m.ty % 4 * 3);
      api.msfx(m.ty, 1);
    }
    function splitWorm(m) {
      var i, o, sgn = m.pv >= 0 ? 1 : -1, nb = 0, front = null, back2 = null, fd = 1e9, bd = 1e9, nw = ++wid, d;
      for (i = 0; i < mN; i++) {
        o = M[i];
        if (o === m || o.ty !== WORM || o.wid !== m.wid || o.die >= 0) continue;
        d = (o.ps - m.ps) * sgn;
        if (d < 0) {
          o.wid = nw;
          o.pv = -m.pv * 1.15;
          nb++;
          if (-d < bd) {
            bd = -d;
            back2 = o;
          }
        } else if (d < fd) {
          fd = d;
          front = o;
        }
      }
      if (back2) back2.sg = 0;
      if (front && front.sg === 1) front.sg = 2;
      if (nb && front) {
        stat.split++;
      }
      if (!front && back2 === null) return;
      if (m.sg === 0 && front === null && back2) back2.sg = 0;
    }
    function shot(x, y, dm) {
      var i, m, r, dx, dy, K2;
      for (i = 0; i < mN; i++) {
        m = M[i];
        if (m.die >= 0 || m.x < -500 || m.lv) continue;
        K2 = KK(m);
        if (m.ty === PHISH && m.hk >= 1 && m.hk <= 4 && Math.abs(x - m.hx) < 5 * api.s0() && y > m.y - 40 * K2 && y < m.hy) {
          if (m.hk === 3) api.floater(api.ship.x, api.ship.y - 30 * api.s0(), "uwolniony");
          m.hk = 5;
          m.ht = 0;
          stat.cut++;
          api.score(HOOK_BONUS, x, y);
          api.floater(x, y - 12, "lina przecięta");
          api.sfx("kill");
          return true;
        }
        if (m.ty === ROOTKIT && m.vis < 0.25) continue;
        r = HIT_R[m.ty] * K2;
        dx = x - m.x;
        dy = y - m.y;
        if (dx * dx + dy * dy < r * r) {
          if (m.ty === RANSOM && m.sh > 0 && Math.abs(dx) < 17 * K2 && dy > 0) {
            m.hit = HIT_S * 0.5;
            api.sfx("bhit");
            if (--m.sh <= 0) {
              stat.shieldBreak++;
              api.floater(m.x, m.y + 30 * K2, "kłódka zbita");
              loot(m.x, m.y + 20 * K2, 2);
              api.bits(m.x, m.y + 20 * K2, 10);
              api.msfx(RANSOM, 1);
            }
            return true;
          }
          if (m.ar > 0) {
            m.ar--;
            m.hit = HIT_S * 0.5;
            api.sfx("bhit");
            return true;
          }
          if ((m.hp -= dm || 1) <= 1e-3) kill(m, true);
          else {
            m.hit = HIT_S;
            if (api.fx.flash) m.fl = 0.07;
            api.sfx("hit");
          }
          return true;
        }
      }
      return false;
    }
    function bomb() {
      for (var i = 0; i < mN; i++) {
        var m = M[i];
        if (m.die < 0 && m.x > -500 && m.y > -40 && m.y < api.H() + 40 && !m.lv) {
          kill(m, true);
          stat.bombKill++;
        }
      }
      bN = 0;
      tok = 0;
    }
    function draw(c, ox, oy) {
      if (!S) return;
      var i, m, b, dpr = api.dpr(), H = api.H(), W = api.W(), K2, y, x, q, n, a, L, s0 = api.s0();
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (i = 0; i < mN; i++) {
        m = M[i];
        if (m.die >= 0 || m.lv || m.x < -500) continue;
        K2 = KK(m);
        if (m.ty === MINER && m.glow) {
          c.fillStyle = C.hot;
          for (y = m.y + 30 * K2; y < H; y += 14) c.fillRect(m.x - 1 + ox, y + oy, 2, 8);
          c.fillStyle = C.bone;
          c.fillRect(m.x - 7 + ox, H - 4 + oy, 14, 2);
        } else if (m.ty === RANSOM && m.a2 === 1) {
          x = m.x + m.armS * 28 * K2;
          c.fillStyle = C.hot;
          for (y = m.y + 30 * K2; y < H * 0.92; y += 16) c.fillRect(x - 3 + ox, y + oy, 6, 6);
        } else if (m.ty === KEYLOG && m.a2 === 1) {
          L = Math.max(W, H) * 1.3;
          a = m.aim;
          x = m.x + Math.cos(a) * 34 * K2;
          y = m.y - 4 * K2 + Math.sin(a) * 34 * K2;
          n = m.et >= KEY_TELE - KEY_LOCK;
          c.fillStyle = n ? C.hot : C.acc;
          for (q = 0; q < L; q += n ? 6 : 16) c.fillRect(x + Math.cos(a) * q - 1 + ox, y + Math.sin(a) * q - 1 + oy, n ? 3 : 2, n ? 3 : 2);
        } else if (m.ty === LOGIC && m.cnt > 0 && m.cnt < 1.5) {
          c.strokeStyle = C.hot;
          c.lineWidth = 2;
          c.beginPath();
          c.arc(m.x + ox, m.y + oy, (30 + 30 * (1.5 - m.cnt)) * K2, 0, TAU3);
          c.stroke();
        }
        if (m.ty === PHISH && m.hk > 0) {
          x = m.x + m.face * -16 * K2;
          y = m.y - 44 * K2;
          c.fillStyle = C.ink;
          c.fillRect(Math.min(x, m.hx) - 1.5 + ox, y + oy, Math.abs(m.hx - x) + 3, 3);
          c.fillRect(m.hx - 1.5 + ox, y + oy, 3, m.hy - y);
          c.fillStyle = m.hk === 3 ? C.hot : C.muted;
          c.fillRect(m.hx - 0.5 + ox, y + oy, 1, m.hy - y);
        }
      }
      for (i = 0; i < mN; i++) {
        m = M[i];
        if (m.x < -500) continue;
        if (m.ty === ROOTKIT) {
          if (m.vis <= 0.01 && m.die < 0) continue;
          c.globalAlpha = m.die >= 0 ? 1 : m.vis;
        }
        drawMob(c, S, m, k, dpr, ox, oy);
        c.globalAlpha = 1;
        if (m.ar > 0 && m.die < 0) drawSprite(c, SBomb.armor, m.x + ox, m.y + 25 * KK(m) + oy, 0, KK(m) / k * 0.75, dpr);
        if (m.ty === PHISH && m.hk > 0 && m.die < 0) drawSprite(c, S[PHISH].hook, m.hx + ox, m.hy + oy, m.hk === 1 ? Math.sin(m.ht * 18) * 0.4 : 0, 1, dpr);
      }
      for (i = 0; i < bN; i++) {
        b = B[i];
        if (b.ty === 1) drawDrill(c, SBomb, b.x + ox, b.y + oy, dpr);
        else if (b.ty === 2) drawSprite(c, SBomb.shot, b.x + ox, b.y + oy, 0, 1, dpr);
        else drawBomb(c, SBomb, b.x + ox, b.y + oy, b.a, 1, dpr);
      }
      for (i = 0; i < dN; i++) {
        b = D[i];
        drawSprite(c, SBomb.drop[b.ty], b.x + ox, b.y + oy, b.ty === 2 ? Math.sin(b.t * 4) * 0.3 : 0, 1, dpr);
      }
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.globalAlpha = 1;
    }
    function attractOn(on) {
      att = on;
      attT = 0;
      if (on) {
        mN = 0;
        bN = 0;
        dN = 0;
        active = false;
        lines = false;
      }
    }
    var AT = [VIRUS, SPYWARE, TROJAN, BOTNET, VIRUS, RANSOM, MINER, SPAM, PHISH, SPYWARE];
    function attract(sd) {
      var W = api.W(), H = api.H(), i, m, u, L = 15;
      attT += sd;
      if (mN === 0) {
        for (i = 0; i < AT.length; i++) {
          m = add(AT[i], true);
          m.st = 9;
          m.del = i * 0.6;
          m.pt = 0;
          m.dir = 1;
          m.lid = 0;
          m.sh = AT[i] === RANSOM ? 1 : 0;
          m.face = AT[i] === TROJAN ? -1 : AT[i] === PHISH ? -1 : 1;
          m.walk = 1;
        }
      }
      for (i = 0; i < mN; i++) {
        m = M[i];
        m.t += sd;
        if (m.hit > 0) m.hit -= sd;
        if ((m.tl -= sd) <= 0) {
          m.tl = rnd3(2, 5);
          m.lid = 1;
        }
        if (m.lid > 0) m.lid = Math.max(0, m.lid - sd * 7);
        if (m.del > 0) {
          m.del -= sd;
          m.x = -999;
          continue;
        }
        m.pt += sd / L;
        u = m.pt;
        if (u > 1) {
          m.pt = 0;
          u = 0;
        }
        m.x = -0.1 * W + u * 1.2 * W;
        m.y = H * (0.3 + 0.1 * Math.sin(u * TAU3 * 1.5 + i * 0.4)) + Math.sin(m.t * 2 + i) * 6;
        m.ex = 0.6;
        m.ey = 0.7;
        m.lean = Math.cos(u * TAU3 * 1.5 + i * 0.4) * 0.12;
        if (m.face < 0) m.face = -1;
      }
    }
    function probe() {
      var o = { dive: 0, hook: 0, hookX: 0, hookY: 0, fishX: -1, logic: 0, lock: 0, flee: 0, ring: 0, entry: 0, aim: 0 }, i, m;
      for (i = 0; i < mN; i++) {
        m = M[i];
        if (m.die >= 0 || m.x < -500) continue;
        if (m.st === 3 || m.st === 2) o.dive++;
        if (m.st === 0 || m.st === 7) o.entry++;
        if (m.st === 8) o.ring++;
        if (m.ty === PHISH) {
          o.fishX = m.x + m.face * -16 * KK(m);
          if (m.hk > o.hook) {
            o.hook = m.hk;
            o.hookX = m.hx;
            o.hookY = m.hy;
          }
        }
        if (m.ty === LOGIC && m.cnt > 0 && (!o.logic || m.cnt < o.logic)) o.logic = m.cnt;
        if (m.ty === RANSOM && m.sh > 0) o.lock = m.sh;
        if (m.st === 12) o.flee++;
        if (m.ty === KEYLOG && m.a2 === 1) o.aim = Math.max(o.aim, m.et);
      }
      return o;
    }
    function snap() {
      var wd = waveN ? waveDef(waveN) : null;
      return {
        n: mN,
        bombs: bN,
        drops: dN,
        active,
        lines,
        done,
        wave: waveN,
        title: wd ? wd.d.t : "",
        ev,
        kinds: kinds.slice(),
        maxObj,
        tok,
        spawn: stat.spawn.slice(),
        drop: stat.drop.slice(),
        kill: stat.kill.slice(),
        bombKill: stat.bombKill,
        pat: Object.assign({}, stat.pat),
        evs: Object.assign({}, stat.ev),
        loot: stat.drops.slice(),
        picked: stat.picked.slice(),
        cut: stat.cut,
        hooked: stat.hooked,
        split: stat.split,
        shieldBreak: stat.shieldBreak,
        defused: stat.defused,
        boom: stat.boom,
        cause,
        names: ALL_NAMES,
        probe: probe()
      };
    }
    function hazards(o) {
      var i, m, b, r, K2, x, y, a, q;
      for (i = 0; i < mN; i++) {
        m = M[i];
        if (m.die >= 0 || m.x < -500 || m.ty === ROOTKIT && m.vis < 0.5) continue;
        K2 = KK(m);
        r = HIT_R[m.ty] * K2 * 0.85;
        o.push({ x: m.x - r, y: m.y - r, w: r * 2, h: r * 2, vx: m.st === 3 ? m.vx : 0, vy: m.st === 3 ? m.vy : 0, body: 1 });
        if (m.ty === MINER && m.glow) o.push({ x: m.x - 8, y: m.y, w: 16, h: api.H(), vx: 0, vy: 0 });
        if (m.ty === RANSOM && m.a2 >= 1 && m.a2 <= 2) {
          x = m.x + m.armS * 28 * K2;
          o.push({ x: x - 10 * K2, y: m.y, w: 20 * K2, h: api.H() * 0.92 - m.y, vx: 0, vy: 0 });
        }
        if (m.ty === KEYLOG && m.a2 === 1 && m.et > KEY_TELE - 0.35) {
          a = m.aim;
          for (q = 1; q < 12; q++) {
            x = m.x + Math.cos(a) * q * 40;
            y = m.y + Math.sin(a) * q * 40;
            o.push({ x: x - 9, y: y - 9, w: 18, h: 18, vx: 0, vy: 0 });
          }
        }
        if (m.ty === PHISH && m.hk === 2) o.push({ x: m.hx - 10, y: m.hy - 10, w: 20, h: 20, vx: 0, vy: HOOK_V * hs() });
        if (m.ty === LOGIC && m.cnt > 0 && m.cnt < 0.6) o.push({ x: m.x - 60 * K2, y: m.y - 60 * K2, w: 120 * K2, h: 120 * K2, vx: 0, vy: 0 });
      }
      for (i = 0; i < bN; i++) {
        b = B[i];
        o.push({ x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2, vx: b.vx, vy: b.vy });
      }
    }
    function busy() {
      return active || mN > 0 || bN > 0;
    }
    function resetStats() {
      for (var q = 0; q < NTY; q++) {
        stat.spawn[q] = 0;
        stat.drop[q] = 0;
        stat.kill[q] = 0;
      }
      stat.bombKill = 0;
      stat.pat = {};
      stat.ev = {};
      stat.drops = [0, 0, 0, 0];
      stat.picked = [0, 0, 0, 0];
      stat.cut = stat.hooked = stat.split = stat.shieldBreak = stat.defused = stat.boom = 0;
      maxObj = 0;
      cause = "";
    }
    function killed() {
      var s = 0;
      for (var q = 0; q < NTY; q++) s += stat.kill[q];
      return s;
    }
    return {
      build,
      startWave,
      leave,
      clear,
      update,
      draw,
      shot,
      bomb,
      attract: attractOn,
      snap,
      hazards,
      busy,
      active: function() {
        return active;
      },
      rain: function() {
        return lines;
      },
      done: function() {
        return done;
      },
      resetStats,
      killed,
      cause: function() {
        return cause;
      },
      sprites: function() {
        return S;
      }
    };
  }

  // src/rakieta/ksztalt.js
  var SH_BODY = [-3, -15, 2, -15, 5, -12, 5, 12, -1, 12, -5, 8, -5, -12];
  var SH_WL = [-5, -3, -14, 7, -14, 11, -9, 13, -5, 11];
  var SH_WR = [5, -3, 14, 7, 14, 13, 5, 11];
  var SH_CAB = [-2, -10, 1.5, -10, 3, -6, 3, -1, -3, -1, -3, -6];
  var SH_STL = [-12, 8, -6, 3, -6, 6, -10, 10];
  var SH_STR = [12, 9, 6, 3, 6, 6, 10, 11];
  var SH_ENG = [-3, 12, 3, 12, 2.5, 15, -2.5, 15];
  var SH_FIN = [4, 5, 8, 11, 8, 16, 5, 12];
  var SH_FINL = [-4, 5, -8, 11, -8, 16, -5, 12];
  var SH_RING = [0, -21, 15, -15, 21, 0, 15, 15, 0, 21, -15, 15, -21, 0, -15, -15];

  // src/rakieta/ulepszenia.js
  var UPS = {
    fire: { n: "Szybszy ogień", d: "Statek strzela o 35% częściej (na poziom).", i: "auto", max: 3, og: 1 },
    dbl: { n: "Podwójny strzał", d: "Dwa pociski naraz, obok siebie.", i: "double", max: 1, og: 1 },
    shield: { n: "Tarcza", d: "Pochłania jedno trafienie, potem znika.", i: "shield", max: 1 },
    graze: { n: "Większe muśnięcie", d: "Szerszy pas muśnięcia i więcej punktów za każde.", i: "graze", max: 2 },
    slow: { n: "Zwolniony czas", d: "Po bombie świat na chwilę zwalnia.", i: "slow", max: 2 },
    power: { n: "Mocniejsza bomba", d: "Bomba zadaje bossom o połowę więcej obrażeń.", i: "power", max: 2 },
    agile: { n: "Zwinny statek", d: "Szybszy ruch i mniej bezwładności.", i: "agile", max: 2 },
    cache: { n: "Zapas bomb", d: "Nowa bomba już co 800 punktów.", i: "cache", max: 1 },
    // etap 2b: karty, które czuć na bossie
    pierce: { n: "Przebicie", d: "Pancerz bossa przepuszcza 12 pp obrażeń więcej, pocisk przebija jedną linijkę.", i: "pierce", max: 2, og: 1 },
    shrap: { n: "Pociski odłamkowe", d: "Trafienie w bossa odpryskuje 2 odłamki po 30% mocy.", i: "shrap", max: 1, og: 1 }
  };
  var UKEYS = ["fire", "dbl", "shield", "graze", "slow", "power", "agile", "cache", "pierce", "shrap"];

  // src/sklep/moduly.js
  var CRATE = 450;
  var RAR = ["zwykły", "rzadki", "epicki"];
  var CHANCE = [60, 30, 10];
  var SHARD_DUP = [6, 15, 40];
  var SHARD_UP = [0, 20, 50];
  var SLOTS = 3;
  var MODS = [
    { id: "magnes", n: "Magnes", i: "magnet", r: 0, v: 60, u: "%", d: "Żetony ₡ lecą z {v}% dalszego zasięgu." },
    { id: "bufor", n: "Bufor combo", i: "graze", r: 0, v: 1, u: " s", f: 1, d: "Combo gaśnie {v} s później." },
    { id: "chlod", n: "Chłodnica", i: "auto", r: 0, v: 12, u: "%", og: 1, d: "Działko strzela {v}% szybciej." },
    { id: "plyta", n: "Płyta", i: "armor", r: 0, v: 1, u: "", d: "Runda zaczyna się z {v} płytą pancerza więcej.", lv: [1, 1, 2] },
    { id: "kond", n: "Kondensator", i: "cache", r: 0, v: 12, u: "%", d: "Bomba ładuje się {v}% szybciej (punkty, w Uniku czas i muśnięcia)." },
    { id: "odlamki", n: "Odłamki", i: "shrap", r: 0, v: 25, u: "%", og: 1, d: "Trafienie w bossa odpryskuje 2 odłamki po {v}% mocy." },
    { id: "iglica", n: "Iglica", i: "pierce", r: 0, v: 10, u: " pp", og: 1, d: "Pancerz bossa przepuszcza {v} pp obrażeń więcej." },
    { id: "bok", n: "Działko boczne", i: "side", r: 1, v: 33, u: "%", og: 1, d: "Boczne strzały przy {v}% strzałów." },
    { id: "ladunek", n: "Ładunek", i: "laser", r: 1, v: 10, u: " s", og: 1, inv: 1, d: "Laser ładowany co {v} s." },
    { id: "ekran", n: "Ekran", i: "shield", r: 1, v: 70, u: " s", inv: 1, d: "Tarcza odnawia się co {v} s (albo szybciej ze sklepu)." },
    { id: "turbina", n: "Turbina", i: "engine", r: 1, v: 10, u: "%", d: "Statek lata {v}% szybciej." },
    { id: "rezonans", n: "Rezonans", i: "graze", r: 1, v: 0.12, u: "%", f: 2, d: "Każde muśnięcie pocisku bossa zdejmuje mu {v}% życia." },
    { id: "kwant", n: "Rdzeń kwantowy", i: "power", r: 2, v: 12, u: "%", og: 1, d: "{v}% pocisków trafia potrójnie." },
    { id: "dron", n: "Dron", i: "mob", r: 2, v: 3, u: "/s", d: "Dron obok statku strzela {v} razy na sekundę (też w Uniku)." },
    { id: "petla", n: "Pętla czasu", i: "slow", r: 2, v: 1, u: " s", f: 1, d: "Po bombie i po trafieniu w tarczę świat zwalnia na {v} s." },
    { id: "root", n: "Root", i: "lock", r: 2, v: 1, u: "", d: "Pierwsza bomba w walce z bossem zawsze ogłusza (stagger).", lv: [1, 1, 2] }
  ];
  var LVK = [1, 1.35, 1.7];
  var SYN = [
    { id: "lancuch", n: "Łańcuch", m: ["iglica", "odlamki"], d: "Odłamki przebijają i jest ich 3; trafienie odłamkiem odpryskuje jeszcze raz." },
    { id: "zetony", n: "Żetony ładują bombę", m: ["magnes", "bufor"], d: "Każdy zebrany żeton ₡ ładuje bombę o 4%." },
    { id: "ostrzal", n: "Ostrzał", m: ["bok", "chlod"], d: "Boczne strzały przy każdym strzale." },
    { id: "przelad", n: "Przeładowanie", m: ["ladunek", "kond"], d: "Bomba od razu ładuje laser; każdy promień ładuje bombę o 10%." },
    { id: "bastion", n: "Bastion", m: ["ekran", "plyta"], d: "Zdarta płyta pancerza odrasta raz w każdej walce z bossem." },
    { id: "slizg", n: "Ślizg", m: ["turbina", "rezonans"], d: "Muśnięcie w pełnym pędzie liczy się podwójnie (punkty, ₡, rana bossa)." },
    { id: "roj", n: "Rój", m: ["dron", "kwant", "iglica"], d: "Pociski drona trafiają potrójnie co trzeci raz i przebijają pancerz." },
    { id: "kernel", n: "Kernel", m: ["root", "petla"], d: "Ogłuszenie z bomby trwa 1,5× dłużej, a świat zwalnia na 1 s." }
  ];
  var MODI = {};
  for (mi = 0; mi < MODS.length; mi++) MODI[MODS[mi].id] = MODS[mi];
  var mi;
  function roll(rnd3) {
    var r = rnd3() * 100, rr2 = r < CHANCE[0] ? 0 : r < CHANCE[0] + CHANCE[1] ? 1 : 2, pool = [], j;
    for (j = 0; j < MODS.length; j++) if (MODS[j].r === rr2) pool.push(MODS[j].id);
    return pool[Math.min(pool.length - 1, rnd3() * pool.length | 0)];
  }
  function openCrate(shop, rnd3) {
    if (shop.kr < CRATE) return null;
    var id = roll(rnd3), m = MODI[id], dup = (shop.mods[id] || 0) > 0, sh = 0;
    shop.kr -= CRATE;
    shop.crates = (shop.crates || 0) + 1;
    if (dup) {
      sh = SHARD_DUP[m.r];
      shop.shards += sh;
    } else shop.mods[id] = 1;
    return { id, dup, shards: sh, lv: shop.mods[id], r: m.r };
  }
  function upCost(lv) {
    return lv >= 3 ? 0 : SHARD_UP[lv];
  }
  function upgrade(shop, id) {
    var lv = shop.mods[id] || 0, c = upCost(lv);
    if (!lv || lv >= 3 || shop.shards < c) return false;
    shop.shards -= c;
    shop.mods[id] = lv + 1;
    return true;
  }
  function equip(shop, id, slot) {
    var j;
    if (!shop.mods[id]) return false;
    for (j = 0; j < SLOTS; j++) if (shop.slots[j] === id) return false;
    if (slot == null) {
      for (j = 0; j < SLOTS; j++) if (!shop.slots[j]) {
        slot = j;
        break;
      }
    }
    if (slot == null) slot = SLOTS - 1;
    shop.slots[slot] = id;
    return true;
  }
  function unequip(shop, slot) {
    if (shop.slots[slot]) {
      shop.slots[slot] = null;
      return true;
    }
    return false;
  }
  function mval(id, lv) {
    var m = MODI[id], v;
    if (!m || !lv) return 0;
    if (m.lv) return m.lv[lv - 1];
    v = m.inv ? m.v / LVK[lv - 1] : m.v * LVK[lv - 1];
    return m.f === 2 ? Math.round(v * 100) / 100 : m.f === 1 ? Math.round(v * 10) / 10 : Math.round(v);
  }
  function mdesc(id, lv) {
    var m = MODI[id], v = mval(id, Math.max(1, lv));
    return m.d.replace("{v}", String(v).replace(".", ","));
  }
  function loadout(shop, on) {
    var o = { m: {}, s: {}, n: 0 }, j, k, ok, id;
    if (!on || !shop || !shop.slots) return o;
    for (j = 0; j < SLOTS; j++) {
      id = shop.slots[j];
      if (id && shop.mods[id]) {
        o.m[id] = shop.mods[id];
        o.n++;
      }
    }
    for (j = 0; j < SYN.length; j++) {
      ok = true;
      for (k = 0; k < SYN[j].m.length; k++) if (!o.m[SYN[j].m[k]]) ok = false;
      if (ok) o.s[SYN[j].id] = true;
    }
    return o;
  }

  // src/sklep/ekonomia.js
  var KR = {
    // żeton za moba (trudniejszy = więcej): Virus, Botnet, Spyware, Cryptominer; etap 2: Worm (za segment), Trojan, Ransomware,
    // Phishing, Rootkit, Keylogger, Logic Bomb, Spam (drobne), dron trojana, Adware
    mob: [2, 3, 3, 5, 1, 12, 10, 6, 6, 5, 4, 1, 1, 3],
    heavy: 1,
    // żeton za ciężką linijkę (3 trafienia) w Ogniu; zwykła linijka nic nie daje
    elite: 4,
    // żeton za elitę (while(true), // FIXME)
    grazeN: 4,
    // 1 ₡ za każde 4 muśnięcia (linijki, bomby mobów, pociski bossów)
    timeS: 8,
    // 1 ₡ za każde 8 s przetrwane w rundzie (Unik nie strzela, więc to jego główny dochód obok fal)
    unik: 3,
    // w Uniku fale i czas ×3 (etap 1b: ×2; etap 2: fale bez zestrzeleń trwają pełne 21 s, symulacja dała ok. 21 h zamiast 13): bez strzelania nie ma żetonów z zestrzeleń (tylko z bomb), a sklep ma być do przejścia
    //   w podobnym czasie w obu trybach (symulacja: Ogień ok. 12 h, Unik ok. 14 h do pełnego sklepu)
    wave: 3,
    waveUp: 1,
    // ukończona fala n: 3 + 1 × n (fala 5 = 8 ₡)
    waveMax: 10,
    //   … ale nie więcej niż 10 za falę
    boss: [30, 45, 60, 90],
    // pokonany boss: NullPointer, Memory Leak, Race Condition, Segfault Prime
    bossLoop: 0.5,
    //   każde kolejne okrążenie bossów (5. boss = NullPointer drugi raz) +50%
    grade: [0, 5, 12, 25],
    // premia za ocenę walki: C, B, A, S
    combo3: 1,
    combo4: 2
    // wejście na combo ×3 / ×4
  };
  var CHIP_S = 6;
  var SHOP = [
    // etap 2b (maisa: „wyposażenie mało bije”): Szybszy ogień +25 pp na poziom (było +10), Moc pocisku +25 pp (było +20)
    { id: "fire", n: "Szybszy ogień", i: "auto", og: 1, c0: 90, cg: 3.4, v: [0, 25, 50, 75, 100], u: "% szybkostrzelności", d: "Bazowe działko strzela częściej." },
    { id: "dmg", n: "Moc pocisku", i: "dmg", og: 1, c0: 120, cg: 3.4, v: [0, 25, 50, 75, 100], u: "% obrażeń", d: "Każdy pocisk zadaje więcej obrażeń wrogom i bossom." },
    // etap 2b: nowe — przebicie pancerza bossa (poza odsłonięciem boss przyjmuje 50% obrażeń; z przebiciem więcej) i linijek, strzał boczny, laser ładowany
    { id: "pierce", n: "Przebicie", i: "pierce", og: 1, c0: 130, cg: 3.6, v: [50, 58, 66, 74], u: "% obrażeń w pancerz", d: "Pocisk przebija pancerz bossa i jedną linijkę więcej na poziom." },
    { id: "side", n: "Strzał boczny", i: "side", og: 1, c0: 140, cg: 3.6, v: [0, 33, 50, 100], u: "% strzałów z bokami", d: "Dwa pociski pod kątem (po 50% mocy) co któryś strzał." },
    { id: "laser", n: "Laser ładowany", i: "laser", og: 1, c0: 160, cg: 3.7, v: [0, 10, 8, 6], u: " s ładowania", d: "Co kilka sekund działko wypala promień w górę (0,5 s, ok. 24 pocisków).", zero: "brak" },
    { id: "dbl", n: "Podwójny strzał", i: "double", og: 1, c0: 150, cg: 3.6, v: [0, 25, 34, 50], u: "% strzałów podwójnych", d: "Co któryś strzał leci parą pocisków." },
    { id: "armor", n: "Pancerz na start", i: "armor", c0: 160, cg: 3.9, v: [0, 1, 2, 3], u: [" trafienie gratis", " trafienia gratis", " trafień gratis"], d: "Płyty pancerza przyjmują trafienia na początku rundy." },
    { id: "shield", n: "Tarcza", i: "shield", c0: 140, cg: 3.5, v: [0, 90, 60, 40], u: " s do odnowienia", d: "Tarcza odnawia się sama po pewnym czasie.", zero: "brak" },
    { id: "sbomb", n: "Start z bombą", i: "bomb", c0: 80, cg: 3.7, v: [1, 2, 3, 4], u: [" bomba na start", " bomby na start", " bomb na start"], d: "Więcej bomb na początku rundy (poziom 3: zapas do 4)." },
    { id: "cache", n: "Zapas bomb", i: "cache", c0: 100, cg: 3.3, v: [1e3, 920, 840, 760, 680], u: " pkt na bombę", d: "Nowa bomba za mniej punktów." },
    { id: "power", n: "Mocniejsza bomba", i: "power", c0: 110, cg: 3.3, v: [0, 15, 30, 45, 60], u: "% obrażeń bomby", d: "Bomba zadaje bossom więcej obrażeń." },
    { id: "slow", n: "Zwolniony czas", i: "slow", c0: 70, cg: 3.4, v: [0, 0.6, 1.2, 1.8], u: " s zwolnienia po bombie", d: "Po bombie świat na chwilę zwalnia.", f: 1 },
    { id: "graze", n: "Większe muśnięcie", i: "graze", c0: 50, cg: 3.35, v: [25, 30, 35, 40, 45], u: " pkt za muśnięcie", d: "Szerszy pas muśnięcia i więcej punktów." },
    { id: "agile", n: "Zwinny statek", i: "agile", c0: 75, cg: 3.4, v: [0, 5, 10, 15, 20], u: "% prędkości", d: "Szybszy ruch i mniej bezwładności." },
    // etap 2 (testerzy 7.10: „coś w sklepie na szybkość”): Silnik podnosi prędkość maksymalną; Zwinny statek to głównie zwrotność
    { id: "engine", n: "Silnik", i: "engine", c0: 60, cg: 3.4, v: [0, 8, 16, 24, 32], u: "% prędkości maks.", d: "Mocniejszy silnik: statek lata szybciej." },
    { id: "magnet", n: "Zasięg zbierania", i: "magnet", c0: 45, cg: 3.3, v: [26, 40, 56, 74, 96], u: " px zasięgu", d: "Żetony ₡ lecą do statku z daleka." }
  ];
  var SHOPI = {};
  for (si = 0; si < SHOP.length; si++) SHOPI[SHOP[si].id] = SHOP[si];
  var si;
  function maxLv(id) {
    return SHOPI[id].v.length - 1;
  }
  var PRICE_K = 0.9;
  function price(id, lv) {
    var s = SHOPI[id];
    return Math.round(s.c0 * PRICE_K * Math.pow(s.cg, lv - 1) / 5) * 5;
  }
  var SKINS = [
    { id: "std", n: "Seria 0", d: "Kość, karmazynowe pasy na skrzydłach.", c: 0, hull: "#f6f2f3", str: "#e11d33", cab: "#43121a", pas: 0 },
    { id: "stal", n: "Stal", d: "Jasna stal, podwójny pas na kadłubie.", c: 2e3, hull: "#c9c7cc", str: "#e11d33", cab: "#0e0e12", pas: 1 },
    { id: "lod", n: "Krew", d: "Kość z głęboką czerwienią i pasem przez środek.", c: 5e3, hull: "#f6f2f3", str: "#d4132b", cab: "#ff3a52", pas: 2 },
    { id: "noc", n: "Nocny lot", d: "Ciemna stal, jasne krawędzie i karmazynowe szewrony.", c: 1e4, hull: "#5b5a60", str: "#ff3a52", cab: "#f6f2f3", pas: 3 }
  ];
  var SKINI = {};
  for (si = 0; si < SKINS.length; si++) SKINI[SKINS[si].id] = SKINS[si];
  var KEY2 = "dancycloud.sklep";
  function empty() {
    var lv = {}, k;
    for (k = 0; k < SHOP.length; k++) lv[SHOP[k].id] = 0;
    return { kr: 0, lv, skin: "std", own: ["std"], earned: 0, rounds: 0, mods: {}, shards: 0, slots: [null, null, null], crates: 0 };
  }
  function loadShop(mem) {
    var s = empty(), o = null, k, id;
    if (mem && mem.v) o = mem.v;
    else try {
      o = JSON.parse(G.localStorage.getItem(KEY2) || "null");
    } catch (e) {
      o = null;
    }
    if (o && typeof o === "object") {
      s.kr = Math.max(0, Math.floor(+o.kr || 0));
      s.earned = Math.max(0, Math.floor(+o.earned || 0));
      s.rounds = Math.max(0, Math.floor(+o.rounds || 0));
      if (o.lv) for (k = 0; k < SHOP.length; k++) {
        id = SHOP[k].id;
        s.lv[id] = Math.max(0, Math.min(maxLv(id), Math.floor(+o.lv[id] || 0)));
      }
      if (Array.isArray(o.own)) {
        for (k = 0; k < o.own.length; k++) if (SKINI[o.own[k]] && s.own.indexOf(o.own[k]) < 0) s.own.push(o.own[k]);
      }
      if (SKINI[o.skin] && s.own.indexOf(o.skin) >= 0) s.skin = o.skin;
      if (o.mods && typeof o.mods === "object") {
        for (id in o.mods) if (MODI[id]) s.mods[id] = Math.max(0, Math.min(3, Math.floor(+o.mods[id] || 0)));
      }
      s.shards = Math.max(0, Math.floor(+o.shards || 0));
      s.crates = Math.max(0, Math.floor(+o.crates || 0));
      if (Array.isArray(o.slots)) for (k = 0; k < SLOTS; k++) {
        id = o.slots[k];
        s.slots[k] = id && s.mods[id] && s.slots.indexOf(id) < 0 ? id : null;
      }
    }
    return s;
  }
  function saveShop(s, mem) {
    var t = JSON.stringify(s);
    if (mem) mem.v = JSON.parse(t);
    try {
      G.localStorage.setItem(KEY2, t);
      return true;
    } catch (e) {
      return false;
    }
  }
  function resetShop(mem) {
    if (mem) mem.v = null;
    try {
      G.localStorage.removeItem(KEY2);
    } catch (e) {
    }
    return empty();
  }
  function val(id, lv) {
    return SHOPI[id].v[lv];
  }

  // src/sklep/hangar.js
  var MNT_S = 0.45;
  function fv(it, lv) {
    var v = it.v[lv];
    if (it.zero && !v) return it.zero;
    var u = it.u;
    if (typeof u !== "string") u = v === 1 ? u[0] : v % 10 >= 2 && v % 10 <= 4 && (v % 100 < 10 || v % 100 >= 20) ? u[1] : u[2];
    return (it.f ? String(v).replace(".", ",") : fmt(v)) + u;
  }
  function createHangar(api) {
    var root2 = api.root, shop = api.shop, box = root2.querySelector(".dcg-shop"), sk = root2.querySelector(".dcg-skins");
    var cv = root2.querySelector(".dcg-hship"), wal = root2.querySelector("[data-cu=wal]"), wst = root2.querySelector(".dcg-wst");
    var msl = root2.querySelector(".dcg-mslots"), mods = root2.querySelector(".dcg-mods"), syn = root2.querySelector(".dcg-syn"), crr = root2.querySelector(".dcg-crr");
    var cbtn = root2.querySelector("[data-crate]"), odds = root2.querySelector(".dcg-odds"), shd = root2.querySelector(".dcg-shd"), last = null;
    odds.textContent = "szanse: " + RAR[0] + " " + CHANCE[0] + "% · " + RAR[1] + " " + CHANCE[1] + "% · " + RAR[2] + " " + CHANCE[2] + "% · duplikat = odłamki";
    cbtn.querySelector(".dcg-cpr").textContent = "₡ " + fmt(CRATE);
    function card(it) {
      var lv = shop.lv[it.id], mx = maxLv(it.id), full = lv >= mx, c = full ? 0 : price(it.id, lv + 1), can = !full && shop.kr >= c, j, pips = "";
      for (j = 0; j < mx; j++) pips += "<i" + (j < lv ? ' class="dcg-on"' : "") + "></i>";
      return '<article class="dcg-sc' + (full ? " dcg-full" : can ? "" : " dcg-poor") + '" data-id="' + it.id + '" role="listitem"><div class="dcg-sch">' + ibtn(it.i, 28, full ? "m" : "y") + '<div class="dcg-col" style="gap:2px;min-width:0"><h3 class="dcg-sct">' + it.n + '</h3><p class="dcg-lab">poziom ' + lv + " / " + mx + (it.og ? " · tryb Ogień" : "") + '</p></div><span class="dcg-pips" aria-hidden="true">' + pips + '</span></div><p class="dcg-scd">' + it.d + '</p><p class="dcg-scv"><span>' + fv(it, lv) + "</span>" + (full ? "" : '<em aria-hidden="true">→</em><b>' + fv(it, lv + 1) + "</b>") + '</p><div class="dcg-scf">' + (full ? '<span class="dcg-pr dcg-mx">Pełny</span>' : '<span class="dcg-pr' + (can ? "" : " dcg-no") + '">₡ ' + fmt(c) + "</span>") + '<button type="button" class="dcg-b dcg-buy" data-buy="' + it.id + '"' + (full ? " disabled" : can ? "" : ' aria-disabled="true"') + ' aria-label="' + it.n + ": " + (full ? "pełny poziom" : "kup poziom " + (lv + 1) + " za " + c + " kredytów, efekt " + fv(it, lv) + " na " + fv(it, lv + 1) + (can ? "" : ", brakuje " + (c - shop.kr))) + '">' + (full ? "Maks." : can ? "Kup" : "Brakuje ₡ " + fmt(c - shop.kr)) + "</button></div></article>";
    }
    function skin(s) {
      var own = shop.own.indexOf(s.id) >= 0, on = shop.skin === s.id, can = shop.kr >= s.c;
      return '<button type="button" class="dcg-b dcg-skn' + (on ? " dcg-sel" : "") + '" data-skin="' + s.id + '" aria-pressed="' + on + '"' + (!own && !can ? ' aria-disabled="true"' : "") + ' aria-label="Skórka ' + s.n + ": " + s.d + (on ? " Założona." : own ? " Załóż." : " Kup za " + s.c + " kredytów." + (can ? "" : " Brakuje " + (s.c - shop.kr) + ".")) + '"><span class="dcg-sw" style="--h:' + s.hull + ";--s:" + s.str + ";--c:" + s.cab + '"><i></i><i></i><i></i></span><span class="dcg-col" style="gap:2px;min-width:0"><span class="dcg-skt">' + s.n + '</span><span class="dcg-lab">' + (on ? "założona" : own ? "załóż" : "₡ " + fmt(s.c)) + "</span></span></button>";
    }
    function slotHtml(j) {
      var id = shop.slots[j], m = id && MODI[id];
      if (!m) return '<button type="button" class="dcg-b dcg-msl dcg-empty" data-mslot="' + j + '" aria-label="Gniazdo ' + (j + 1) + ': puste. Załóż moduł z listy poniżej."><span class="dcg-lab">gniazdo ' + (j + 1) + '</span><span class="dcg-mn2">pusto</span></button>';
      return '<button type="button" class="dcg-b dcg-msl" data-mslot="' + j + '" aria-label="Gniazdo ' + (j + 1) + ": " + m.n + ", poziom " + shop.mods[id] + '. Zdejmij."><span class="dcg-lab">gniazdo ' + (j + 1) + ' · zdejmij</span><span class="dcg-row" style="gap:6px;flex-wrap:nowrap">' + ibtn(m.i, 18, "y") + '<span class="dcg-mn2">' + m.n + '</span></span><span class="dcg-lab">' + RAR[m.r] + " · poz. " + shop.mods[id] + "</span></button>";
    }
    function modHtml(m) {
      var lv = shop.mods[m.id] || 0, on = shop.slots.indexOf(m.id) >= 0, c = upCost(lv), h;
      if (!lv) return '<article class="dcg-mc2 dcg-lock dcg-r' + m.r + '" role="listitem"><div class="dcg-row" style="gap:8px;flex-wrap:nowrap">' + ibtn("crate", 18, "m") + "<h3>?? " + RAR[m.r] + "</h3></div><p>Jeszcze nie wylosowany.</p></article>";
      h = '<article class="dcg-mc2 dcg-r' + m.r + '" data-mid="' + m.id + '" role="listitem"><div class="dcg-row" style="gap:8px;flex-wrap:nowrap">' + ibtn(m.i, 18, "y") + "<h3>" + m.n + '</h3><span class="dcg-pips" aria-hidden="true"><i class="dcg-on"></i><i' + (lv >= 2 ? ' class="dcg-on"' : "") + "></i><i" + (lv >= 3 ? ' class="dcg-on"' : "") + '></i></span></div><p class="dcg-lab">' + RAR[m.r] + " · poziom " + lv + " / 3" + (m.og ? " · tryb Ogień" : "") + "</p><p>" + mdesc(m.id, lv) + '</p><div class="dcg-mrow"><button type="button" class="dcg-b" data-mequip="' + m.id + '"' + (on ? ' aria-disabled="true"' : "") + ' aria-label="' + m.n + ": " + (on ? "założony" : "załóż do gniazda") + '">' + (on ? "Założony" : "Załóż") + "</button>";
      if (lv < 3) h += '<button type="button" class="dcg-b" data-mup="' + m.id + '"' + (shop.shards >= c ? "" : ' aria-disabled="true"') + ' aria-label="' + m.n + ": ulepsz na poziom " + (lv + 1) + " za " + c + " odłamków, efekt: " + mdesc(m.id, lv + 1) + '">Poz. ' + (lv + 1) + " · " + c + " odł.</button>";
      return h + "</div></article>";
    }
    function synHtml(y) {
      var j, n = 0, names = [];
      for (j = 0; j < y.m.length; j++) {
        if (shop.slots.indexOf(y.m[j]) >= 0) n++;
        names.push(MODI[y.m[j]].n);
      }
      return '<div class="dcg-sy' + (n === y.m.length ? " dcg-on" : n ? " dcg-half" : "") + '" role="listitem" data-syn="' + y.id + '">' + ibtn("syn", 16, n === y.m.length ? "y" : "m") + "<span><b>" + y.n + "</b>" + (n === y.m.length ? " <em>aktywna</em>" : " · " + n + "/" + y.m.length) + "<br>" + names.join(" + ") + ": " + y.d + "</span></div>";
    }
    function modsList() {
      var h = "", k, n = 0;
      for (k = 0; k < SLOTS; k++) h += slotHtml(k);
      msl.innerHTML = h;
      h = "";
      for (k = 0; k < SYN.length; k++) h += synHtml(SYN[k]);
      syn.innerHTML = h;
      h = "";
      for (k = 0; k < MODS.length; k++) {
        h += modHtml(MODS[k]);
        if (shop.mods[MODS[k].id]) n++;
      }
      mods.innerHTML = h;
      cbtn.setAttribute("aria-disabled", shop.kr >= CRATE ? "false" : "true");
      cbtn.setAttribute("aria-label", "Otwórz skrzynkę za " + CRATE + " kredytów. Szanse: " + RAR[0] + " " + CHANCE[0] + " procent, " + RAR[1] + " " + CHANCE[1] + ", " + RAR[2] + " " + CHANCE[2] + "." + (shop.kr >= CRATE ? "" : " Brakuje " + (CRATE - shop.kr) + "."));
      shd.textContent = "moduły " + n + " / " + MODS.length + " · odłamki " + fmt(shop.shards) + " · skrzynki " + fmt(shop.crates || 0);
      paintIcons(msl);
      paintIcons(syn);
      paintIcons(mods);
    }
    function crate() {
      var r = openCrate(shop, Math.random), m;
      if (!r) {
        api.sfx("nope");
        api.say("Za mało kredytów na skrzynkę: brakuje " + (CRATE - shop.kr) + ".");
        return;
      }
      if (!r.dup && shop.slots.indexOf(null) >= 0) equip(shop, r.id);
      saveShop(shop, api.mem);
      api.sfx("buy");
      last = r;
      m = MODI[r.id];
      crr.hidden = false;
      crr.className = "dcg-crr dcg-r" + m.r;
      crr.innerHTML = ibtn(m.i, 28, "y") + '<span class="dcg-col" style="gap:2px"><b>' + m.n + '</b><span class="dcg-lab">' + RAR[m.r] + (r.dup ? " · duplikat: +" + r.shards + " odłamków" : " · nowy moduł" + (shop.slots.indexOf(r.id) >= 0 ? " · założony" : "")) + "</span></span>";
      paintIcons(crr);
      if (!api.reduced()) {
        crr.classList.remove("dcg-crop");
        void crr.offsetWidth;
        crr.classList.add("dcg-crop");
      }
      fill(true);
      refocus("[data-crate]");
      api.say("Skrzynka: " + m.n + ", " + RAR[m.r] + (r.dup ? ". Duplikat, plus " + r.shards + " odłamków." : ". Nowy moduł."));
    }
    function list() {
      var h = "", k;
      modsList();
      for (k = 0; k < SHOP.length; k++) h += card(SHOP[k]);
      box.innerHTML = h;
      h = "";
      for (k = 0; k < SKINS.length; k++) h += skin(SKINS[k]);
      sk.innerHTML = h;
      paintIcons(box);
      paintIcons(sk);
      var n = 0, m = 0;
      for (k = 0; k < SHOP.length; k++) {
        n += shop.lv[SHOP[k].id];
        m += maxLv(SHOP[k].id);
      }
      wst.textContent = "ulepszenia " + n + " / " + m + " · skórki " + shop.own.length + " / " + SKINS.length + " · zarobione " + fmt(shop.earned);
    }
    function fill(anim) {
      api.cnt.set(wal, shop.kr, anim && !api.reduced() ? 0.5 : 0);
      list();
      api.ship(cv);
    }
    function refocus(sel) {
      var b = root2.querySelector(sel);
      if (b) api.focus(b);
    }
    function flash(sel) {
      var e = root2.querySelector(sel);
      if (e && !api.reduced()) {
        e.classList.remove("dcg-bought");
        void e.offsetWidth;
        e.classList.add("dcg-bought");
      }
    }
    function buy(id) {
      var it = SHOPI[id], lv, c;
      if (!it) return;
      lv = shop.lv[id];
      if (lv >= maxLv(id)) return;
      c = price(id, lv + 1);
      if (shop.kr < c) {
        api.sfx("nope");
        api.say("Za mało kredytów: brakuje " + (c - shop.kr) + ". Zbierasz je w każdej rundzie.");
        return;
      }
      shop.kr -= c;
      shop.lv[id] = lv + 1;
      saveShop(shop, api.mem);
      api.sfx("buy");
      fill(true);
      api.mnt.id = id;
      api.mnt.k = api.reduced() ? 1 : 0;
      api.ship(cv);
      api.loop();
      flash(".dcg-sc[data-id=" + id + "]");
      refocus("[data-buy=" + id + "]");
      api.say(it.n + ": poziom " + (lv + 1) + ". Zostało " + shop.kr + " kredytów.");
    }
    function pickSkin(id) {
      var s = SKINI[id];
      if (!s) return;
      if (shop.own.indexOf(id) < 0) {
        if (shop.kr < s.c) {
          api.sfx("nope");
          api.say("Za mało kredytów na skórkę " + s.n + ": brakuje " + (s.c - shop.kr) + ".");
          return;
        }
        shop.kr -= s.c;
        shop.own.push(id);
        api.sfx("buy");
      } else api.sfx("ok");
      shop.skin = id;
      saveShop(shop, api.mem);
      fill(true);
      api.mnt.id = "skin";
      api.mnt.k = 1;
      api.ship(cv);
      flash("[data-skin=" + id + "]");
      refocus("[data-skin=" + id + "]");
      api.say("Skórka " + s.n + " założona.");
    }
    function click(b) {
      var v;
      if (v = b.getAttribute("data-buy")) {
        buy(v);
        return true;
      }
      if (v = b.getAttribute("data-skin")) {
        pickSkin(v);
        return true;
      }
      if (b.hasAttribute("data-crate")) {
        crate();
        return true;
      }
      if ((v = b.getAttribute("data-mslot")) != null) {
        if (unequip(shop, +v)) {
          saveShop(shop, api.mem);
          api.sfx("ok");
          fill(false);
          refocus('[data-mslot="' + v + '"]');
          api.say("Gniazdo " + (+v + 1) + " wolne.");
        }
        return true;
      }
      if (v = b.getAttribute("data-mequip")) {
        if (equip(shop, v)) {
          saveShop(shop, api.mem);
          api.sfx("ok");
          fill(false);
          refocus("[data-mequip=" + v + "]");
          api.say(MODI[v].n + " założony.");
        }
        return true;
      }
      if (v = b.getAttribute("data-mup")) {
        if (upgrade(shop, v)) {
          saveShop(shop, api.mem);
          api.sfx("buy");
          fill(false);
          flash("[data-mid=" + v + "]");
          refocus("[data-mup=" + v + "],[data-mequip=" + v + "]");
          api.say(MODI[v].n + ": poziom " + shop.mods[v] + ".");
        } else {
          api.sfx("nope");
          api.say("Za mało odłamków.");
        }
        return true;
      }
      return false;
    }
    function tick(dt) {
      if (api.mnt.k >= 1) return;
      api.mnt.k = Math.min(1, api.mnt.k + dt / MNT_S);
      api.ship(cv);
    }
    function busy() {
      return api.mnt.k < 1;
    }
    function stop() {
      api.mnt.k = 1;
    }
    return { fill, click, tick, busy, stop, canvas: cv, last: function() {
      return last;
    } };
  }

  // src/bossy/czesci2b.js
  var ML_TANK = [-20, -36, 20, -36, 25, -30, 25, 30, 20, 36, -20, 36, -25, 30, -25, -30];
  var ML_TANKW = [-9, -24, 9, -24, 9, 22, -9, 22];
  var ML_PIPE = [-11, -44, 11, -44, 11, 40, -11, 40];
  var ML_PIPEF = [-17, -50, 17, -50, 17, -40, -17, -40];
  var ML_CORE = OCT(0, 0, 30, 10);
  function artTank(x, P2, m) {
    var j;
    x.save();
    x.scale(m, 1);
    pb(x, [14, -10, 40, -18, 46, -8, 18, 4], P2.sol, P2, 1);
    x.restore();
    pb(x, ML_TANK, P2.hull, P2, 1.8);
    hat(x, P2, ML_TANK, 0.62);
    for (j = 0; j < 3; j++) {
      pf(x, [-26, -22 + j * 22, 26, -22 + j * 22, 26, -17 + j * 22, -26, -17 + j * 22], P2.plate);
      rib(x, P2, [-25, -19.5 + j * 22, 25, -19.5 + j * 22], 1.4, j === 1 ? P2.acc : P2.sol);
    }
    pb(x, ML_TANKW, P2.dark, P2, 1, true);
    pb(x, [-8, -44, 8, -44, 10, -36, -10, -36], P2.plate, P2, 1);
    pf(x, [-3, -50, 3, -50, 3, -44, -3, -44], P2.sol);
    x.fillStyle = P2.dark;
    x.fillRect(-14, -30, 3, 54);
    x.fillRect(11, -30, 3, 54);
    st(x, m > 0 ? "L" : "R", 8, m > 0 ? -17 : 17, 28, P2.hi, 1);
    rivets(x, P2, [-21, -32, 21, -32, -21, 32, 21, 32]);
  }
  function artPipe(x, P2) {
    var j;
    pb(x, ML_PIPE, P2.hull, P2, 1.6);
    for (j = 0; j < 4; j++) pb(x, [-14, -30 + j * 18, 14, -30 + j * 18, 14, -25 + j * 18, -14, -25 + j * 18], P2.sol, P2, 0.9);
    rib(x, P2, [-4, -42, -4, 38], 2, P2.acc);
    pb(x, ML_PIPEF, P2.plate, P2, 1.2);
    pb(x, [-26, 40, 26, 40, 30, 44, 30, 56, -26, 56, -30, 52], P2.hull, P2, 1.2);
    st(x, "HEAP", 8, 0, 48.5, P2.hi, 1);
    pf(x, [-6, 56, 6, 56, 3, 66, -3, 66], P2.hot);
    rivets(x, P2, [-22, 44, 22, 44]);
  }
  function artCore(x, P2) {
    pb(x, ML_CORE, P2.dark, P2, 1.6, true);
    pf(x, OCT(0, 0, 24, 8), null, P2.sol, 1.4);
    x.fillStyle = P2.sol;
    x.fillRect(-31, -2, 6, 4);
    x.fillRect(25, -2, 6, 4);
    x.fillRect(-2, -31, 4, 6);
    x.fillRect(-2, 25, 4, 6);
  }
  var RC_SAT = OCT(0, 0, 20, 7);
  function artSat(x, P2, n) {
    pb(x, RC_SAT, P2.hull, P2, 1.6);
    hat(x, P2, RC_SAT, 0.6);
    pb(x, OCT(0, 0, 13, 4.5), P2.plate, P2, 1, true);
    pf(x, [-24, -3, -18, -3, -18, 3, -24, 3], P2.sol);
    pf(x, [18, -3, 24, -3, 24, 3, 18, 3], P2.sol);
    pf(x, [-3, 18, 3, 18, 2, 26, -2, 26], P2.hot);
    rib(x, P2, [-12, -15, 12, -15], 1.6, P2.acc);
    st(x, "W" + n, 7, 0, 12.5, P2.hi, 1);
    rivets(x, P2, [-14, -8, 14, -8]);
  }
  var SP_HEAD = [-56, -38, -36, -78, 36, -78, 56, -38, 50, 24, -50, 24];
  function artSPHead(x, P2) {
    pb(x, SP_T2, P2.hull, P2, 2);
    pb(x, SP_P2, P2.plate, P2, 1, true);
    pb(x, SP_BROW, P2.hull, P2, 1.4);
    rib(x, P2, [-54, -27, 0, -10, 54, -27], 2.6);
    pb(x, SP_EYL, P2.dark, P2, 1, true);
    pb(x, SP_EYR, P2.dark, P2, 1, true);
    rib(x, P2, [-34, 4, -18, 14, 18, 14, 34, 4], 2, P2.acc);
    x.fillStyle = P2.dark;
    x.fillRect(-2, 2, 4, 14);
    pb(x, SP_T3, P2.hull, P2, 2);
    pb(x, SP_P3, P2.plate, P2, 1, true);
    tex(x, P2, SP_P3, 5.5, 21);
    rib(x, P2, [-36, -38, 36, -38], 3);
    pb(x, SP_CORE, P2.dark, P2, 1.4, true);
    rivets(x, P2, [-46, -34, 46, -34, -28, -74, 28, -74]);
  }
  var SP_JAWO = [-70, 22, 70, 22, 78, 100, -78, 100];
  function artSPJaw(x, P2) {
    var j;
    pb(x, SP_T1, P2.hull, P2, 2);
    hat(x, P2, SP_T1, 0.7);
    pf(x, SP_MAW, P2.dark);
    pf(x, [-46, 54, 46, 54, 46, 66, -46, 66], P2.deep);
    for (j = 0; j < 8; j++) pf(x, [-48 + j * 12, 46, -36 + j * 12, 46, -42 + j * 12, 62 - (j & 1) * 5], j === 3 || j === 4 ? P2.hi : P2.lit);
    for (j = 0; j < 7; j++) pf(x, [-44 + j * 13, 72, -32 + j * 13, 72, -38 + j * 13, 58 + (j & 1) * 4], P2.sol);
    pf(x, [-50, 44, 50, 44, 50, 47, -50, 47], P2.dark);
    pf(x, [-50, 71, 50, 71, 50, 74, -50, 74], P2.dark);
    rib(x, P2, [-62, 30, 62, 30], 3);
    rib(x, P2, [-58, 80, -24, 86, 24, 86, 58, 80], 2.4, P2.acc);
    rivets(x, P2, [-60, 36, 60, 36]);
  }
  function artSPWing(x, P2, sd) {
    x.translate(48, 0);
    artSPHalf(x, P2, sd);
  }
  var SP_WINGO = [0, -26, -50, -64, -100, -74, -100, 40, -50, 36, 0, 34];
  var SP_CROWNO = [-54, 0, -36, -32, 0, -44, 38, -38, 56, 0];

  // src/bossy/strojenie2b.js
  var NPH = 6;
  var THR2 = [85, 70, 55, 40, 22];
  var PART_HP = [
    // udział części w puli życia [%] (część 0 = rdzeń; Race Condition: 0, 1 = bliźniaki)
    null,
    [50, 10, 10, 10, 10, 10],
    [25, 25, 12.5, 12.5, 12.5, 12.5],
    [45, 11, 11, 11, 11, 11]
  ];
  var PART_BONUS = 3;
  var CORE_MIN = 1;
  var PHASE_V2 = [1, 1.07, 1.14, 1.2, 1.25, 1.28];
  var TELE2 = [0.62, 0.56, 0.5, 0.46, 0.42, 0.45];
  var IDLE2 = [0.55, 0.48, 0.42, 0.36, 0.32, 0.36];
  var VULN_N2 = [2, 3, 3, 3, 3, 3];
  var VULN_S2 = [1.8, 1.6, 1.5, 1.4, 1.3, 1.1];
  var NEED2 = [0, 1930, 1394, 5080];
  var ARENA_K = 0.27;
  var KAMP_DPS = 4.84;
  var PAR2 = [0, 290, 340, 580];
  var PARU2 = [0, 150, 150, 190];
  var HELL2_S = 12;
  var SAFE_GAP = 84;
  var ATK2 = [
    // Memory Leak (12)
    ["ml-dump", "memcpy(dump)", 1, 1, 3, 0.6, 1, 0, 0, 1],
    ["ml-malloc", "malloc()", 1, 1, 2, 0.8, 1, 0, 0, 0],
    ["ml-spray", "heap_spray()", 1, 2, 2, 0.6, 1, 0, 2, 0],
    ["ml-uaf", "use_after_free", 1, 2, 2, 2.4, 1.1, 0, 0, 1],
    ["ml-gc", "gc.collect()", 1, 3, 2, 0.7, 1, 1, 3, 0],
    ["ml-dfree", "double_free", 1, 3, 2, 1.6, 1.1, 0, 0, 0],
    ["ml-swap", "swap()", 1, 4, 2, 2.4, 1.25, 0, 2, 0],
    ["ml-fork", "fork()", 1, 4, 2, 1.6, 1, 0, 0, 1],
    ["ml-realloc", "realloc()", 1, 5, 2, 4.2, 1.3, 0, 2, 0],
    ["ml-frag", "fragmentation", 1, 5, 2, 3.4, 1.2, 0, 0, 0],
    ["ml-oom", "OOM", 1, 6, 3, 4.6, 1.25, 0, 0, 0],
    ["ml-leak", "leak()", 1, 6, 3, 2.6, 1, 0, 0, 0],
    // Race Condition (12)
    ["rc-sweep", "sweep ==", 2, 1, 3, 0.5, 1, 1, 0, 0],
    ["rc-cross", "crossfire", 2, 1, 2, 2.4, 1, 0, 2, 1],
    ["rc-lock", "deadlock", 2, 2, 2, 6, 1.4, 0, 0, 0],
    ["rc-toctou", "TOCTOU", 2, 2, 2, 1, 1.3, 0, 0, 1],
    ["rc-mutex", "mutex", 2, 3, 2, 3.6, 1, 0, 0, 1],
    ["rc-spin", "spinlock", 2, 3, 2, 2.6, 1.1, 0, 2, 0],
    ["rc-tandem", "tandem", 2, 4, 2, 2.3, 1.4, 1, 3, 0],
    ["rc-prio", "priority_inversion", 2, 4, 2, 2.6, 1, 0, 0, 1],
    ["rc-live", "livelock", 2, 5, 2, 4, 1.1, 0, 0, 0],
    ["rc-ctx", "context_switch", 2, 5, 2, 1.4, 1.4, 0, 1, 1],
    ["rc-desync", "desync", 2, 6, 3, 1.3, 1, 1, 0, 0],
    ["rc-race", "data_race", 2, 6, 3, 3, 1, 0, 0, 0],
    // Segfault Prime (14)
    ["sp-np", "echo: NullPointer", 3, 1, 3, 0.8, 1, 0, 0, 1],
    ["sp-sigsegv", "SIGSEGV", 3, 1, 2, 2.4, 1, 0, 1, 0],
    ["sp-ml", "echo: Memory Leak", 3, 2, 2, 0.6, 1, 0, 0, 1],
    ["sp-stack", "stack overflow", 3, 2, 2, 1.8, 1.25, 0, 2, 0],
    ["sp-rc", "echo: Race Condition", 3, 3, 2, 0.6, 1, 1, 1, 0],
    ["sp-core", "core dump", 3, 3, 2, 0.5, 1, 0, 0, 1],
    ["sp-panic", "kernel panic", 3, 4, 1, 1.8, 1.8, 0, 0, 0],
    ["sp-page", "page fault", 3, 4, 2, 2.6, 1.7, 0, 0, 0],
    ["sp-dfault", "double fault", 3, 4, 2, 1.8, 1, 0, 1, 0],
    ["sp-bof", "buffer overflow", 3, 5, 2, 3.4, 1.2, 0, 0, 0],
    ["sp-smash", "stack smashing", 3, 5, 2, 1.6, 1.6, 0, 0, 1],
    ["sp-jmp", "jmp *null", 3, 5, 2, 1.7, 1.8, 0, 3, 0],
    ["sp-seg", "segfault", 3, 6, 3, 2.6, 1.4, 0, 0, 0],
    ["sp-hell", "bullet hell", 3, 6, 9, HELL2_S, 1.6, 0, 0, 0]
  ];
  var NATK2 = ATK2.length;
  var AI2 = {};
  for (i2 = 0; i2 < NATK2; i2++) AI2[ATK2[i2][0]] = i2;
  var i2;
  var ATT2 = [];
  var ATA2 = [];
  for (i2 = 0; i2 < NATK2; i2++) {
    ATT2.push("> " + ATK2[i2][1]);
    ATA2.push("$ " + ATK2[i2][1]);
  }
  var HELLT2 = [];
  for (i2 = 0; i2 <= HELL2_S; i2++) HELLT2.push("$ bullet hell · przetrwaj " + i2 + " s");
  var PN = [
    null,
    ["rdzeń sterty", "zbiornik L", "zbiornik R", "rura HEAP", "kleszcz L", "kleszcz R"],
    ["T1", "T2", "wątek W1", "wątek W2", "wątek W3", "wątek W4"],
    ["rdzeń", "korona", "skrzydło L", "skrzydło R", "szczęka", "pierścienie"]
  ];
  var FZ2 = ["FAZA 1/6", "FAZA 2/6", "FAZA 3/6", "FAZA 4/6", "FAZA 5/6", "DESPERACJA"];
  var PHB2 = [
    null,
    ["faza 2: wyciek", "faza 3: zbieracz", "faza 4: swap", "faza 5: realloc", "desperacja: OOM"],
    ["faza 2: blokada", "faza 3: mutex", "faza 4: priorytety", "faza 5: przełączanie", "desperacja: desync"],
    ["faza 2: echo sterty", "faza 3: echo wątków", "faza 4: jądro", "faza 5: przepełnienie", "desperacja: bullet hell"]
  ];

  // src/bossy/silnik2b.js
  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  function rnd(a, b) {
    return a + Math.random() * (b - a);
  }
  var DIM2 = [null, [352, 236], [152, 160], [324, 236]];
  var FW2 = [0, 0.56, 0.19, 0.64];
  var FH2 = [0, 0.42, 0.4, 0.52];
  var HB = [
    null,
    [[0, -6, 92, 60], [0, 0, 25, 36], [0, 0, 25, 36], [0, 6, 13, 46], [18, 0, 24, 60], [18, 0, 24, 60]],
    [[0, 0, 70, 67], [0, 0, 70, 67], [0, 0, 20, 20], [0, 0, 20, 20], [0, 0, 20, 20], [0, 0, 20, 20]],
    [[0, -27, 44, 51], [0, -20, 70, 22], [-52, -18, 48, 54], [-52, -18, 48, 54], [0, 61, 40, 39], [0, 6, 126, 20]]
  ];
  function createBossy2b(A) {
    var BO = A.BO, P2 = [], k, E;
    for (k = 0; k < 6; k++) P2.push({
      x: 0,
      y: 0,
      hx: 0,
      hy: 0,
      hw: 0,
      hh: 0,
      hp: 0,
      max: 0,
      alive: false,
      hit: 0,
      fc: 0,
      core: false,
      shot: 0,
      auto: 0,
      a: 0,
      sx: 1,
      ox: 0,
      oy: 0,
      bx: 0,
      by: 0,
      mz: 0,
      spin: 0,
      sl: 0,
      tA: 0,
      tX: 0,
      tY: 0,
      fx: 0,
      fy: 0
    });
    E = {
      ty: 1,
      u: 1,
      x: 0,
      y: 0,
      hx: 0,
      hy: 0,
      a: -1,
      last: -1,
      tm: 0,
      fired: 0,
      sub: 0,
      sd: 1,
      vk: 1,
      gx: 0,
      gw: 0,
      gy: 0,
      gx2: 0,
      a0: 0,
      a1: 0,
      tx: 0,
      ty2: 0,
      wL: 0,
      wR: 0,
      cx: 0,
      cw: 0,
      zN: 0,
      killed: 0,
      shotN: 0,
      autoN: 0,
      tgt: 1,
      fq: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      fqN: 0,
      atC: [],
      at0: [],
      graze: 0,
      bombs: 0,
      bombV: 0,
      echo: 0,
      echoA: -1,
      jOn: 0,
      jx: 0,
      jy: 0,
      mtx: -1,
      mtT: 0,
      lockHp: 0,
      lx: [0, 0, 0],
      ly: [0, 0],
      pg: [],
      pg2: [],
      rows: 0,
      rk: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      rx: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      rn: 0,
      swapT: 0,
      ghost: 0,
      intro: 0,
      snap: null,
      dr: 0,
      cb: 0,
      g: 0,
      phT: [],
      dmgT: 0,
      armT: 0,
      despT: 0,
      hell: 0,
      ex: false,
      fragGap: 0,
      bofX: 0,
      segX: 0,
      segW: 0,
      page: 0,
      pageN: 0
    };
    for (k = 0; k < NATK2; k++) {
      E.atC.push(0);
      E.at0.push(0);
    }
    for (k = 0; k < 12; k++) {
      E.pg.push(0);
      E.pg2.push(0);
    }
    for (k = 0; k <= NPH; k++) E.phT.push(0);
    var Z = [];
    for (k = 0; k < 16; k++) Z.push({ x: 0, y: 0, w: 0, h: 0 });
    var DT = [];
    for (k = 0; k < 6; k++) DT.push({ k: -1, x: 0, y: 0, vx: 0, vy: 0, a: 0, va: 0, life: 0, S: 1, m: 1 });
    var ART = null;
    function W() {
      return A.W();
    }
    function H() {
      return A.H();
    }
    function s0() {
      return A.s0();
    }
    function hs() {
      return A.hsc();
    }
    function shipV() {
      return A.shipV();
    }
    function nAlive(core) {
      var n = 0;
      for (var j = 0; j < 6; j++) if (P2[j].alive && P2[j].core === core) n++;
      return n;
    }
    function firstCore() {
      for (var j = 0; j < 6; j++) if (P2[j].alive && P2[j].core) return P2[j];
      return P2[0];
    }
    function bossU(ty) {
      return Math.min(FW2[ty] * W() / DIM2[ty][0], FH2[ty] * H() / DIM2[ty][1]);
    }
    function prtC(w, h, ax, ay, fn, Pl, a1) {
      var d = A.dpr(), q = E.u * d, c = A.mk(w * q, h * q), x = c.getContext("2d");
      x.setTransform(q, 0, 0, q, ax * q, ay * q);
      x.lineJoin = "miter";
      fn(x, Pl, a1);
      return c;
    }
    function crkFn(poly2, n, sd, m) {
      return function(x, Pl) {
        if (m) x.scale(m, 1);
        cracks(x, Pl, poly2, n, sd);
      };
    }
    function prt(w, h, ax, ay, fn, a1, poly2, m) {
      return { n: prtC(w, h, ax, ay, fn, PAL, a1), f: prtC(w, h, ax, ay, fn, PALF, a1), k1: prtC(w, h, ax, ay, crkFn(poly2, 3, 2, m), PAL), k2: prtC(w, h, ax, ay, crkFn(poly2, 5, 7, m), PAL), w, h, ax, ay };
    }
    function ensure(ty) {
      var key2 = ty + ":" + W() + ":" + H() + ":" + A.dpr(), R;
      if (ART && ART.key === key2) return;
      E.u = bossU(ty);
      R = { key: key2, ty, p: [] };
      if (ty === 1) {
        R.p[0] = prt(72, 72, 36, 36, artCore, 0, ML_CORE);
        R.p[1] = prt(100, 100, 50, 50, artTank, 1, ML_TANK);
        R.p[2] = prt(100, 100, 50, 50, artTank, -1, ML_TANK);
        R.p[3] = prt(64, 124, 32, 54, artPipe, 0, ML_PIPE);
        R.p[4] = prt(70, 148, 26, 74, artClamp, 0, ML_CLAMP);
        R.p[5] = R.p[4];
      } else if (ty === 2) {
        R.p[0] = prt(184, 166, 92, 83, artRC, 1, [-44, -77, 30, -77, 46, -60, 44, 0, 42, 30, 20, 77, -36, 77, -50, 58, -40, 0, -52, -56]);
        R.p[1] = prt(184, 166, 92, 83, artRC, -1, [-62, -70, -50, -80, 44, -80, 58, -36, 58, 48, 54, 80, -52, 80, -66, 66], -1);
        for (k = 0; k < 4; k++) R.p[2 + k] = prt(56, 60, 28, 28, artSat, k + 1, RC_SAT);
      } else {
        R.p[0] = prt(124, 112, 62, 84, artSPHead, 0, SP_HEAD);
        R.p[1] = prt(116, 52, 58, 48, artCrown, 0, SP_CROWNO);
        R.p[2] = prt(112, 120, 108, 76, artSPWing, 6, SP_WINGO);
        R.p[3] = prt(112, 120, 108, 76, artSPWing, 17, SP_WINGO);
        R.p[4] = prt(164, 84, 82, 20, artSPJaw, 0, SP_JAWO);
        R.p[5] = prt(212, 212, 106, 106, artRing, 0, [-99, 0, 0, -99, 99, 0, 0, 99]);
      }
      ART = R;
    }
    function start(ty, tier, need, hp0) {
      var k2, p2, sh = PART_HP[ty];
      E.ty = ty;
      ensure(ty);
      BO.v2 = true;
      BO.n = 0;
      BO.atk = -1;
      BO.panic = 0;
      BO.wl = 0;
      BO.need = need;
      BO.bm = 0;
      E.a = -1;
      E.last = -1;
      E.killed = 0;
      E.shotN = 0;
      E.autoN = 0;
      E.fqN = 0;
      E.graze = 0;
      E.bombs = 0;
      E.bombV = 0;
      E.echo = 0;
      E.jOn = 0;
      E.mtx = -1;
      E.lockHp = 0;
      E.wL = E.wR = 0;
      E.zN = 0;
      E.ghost = 0;
      E.dr = 0;
      E.cb = 0;
      E.g = 0;
      E.armT = 0;
      E.hell = 0;
      E.dmgT = 0;
      E.page = 0;
      for (k2 = 0; k2 < NATK2; k2++) E.atC[k2] = 0;
      for (k2 = 0; k2 <= NPH; k2++) E.phT[k2] = 0;
      for (k2 = 0; k2 < 6; k2++) {
        p2 = P2[k2];
        p2.max = p2.hp = sh[k2];
        p2.alive = true;
        p2.hit = 0;
        p2.fc = 0;
        p2.shot = 0;
        p2.auto = 0;
        p2.mz = 0;
        p2.spin = k2 * 1.57;
        p2.sl = 0;
        p2.core = ty === 2 ? k2 < 2 : k2 === 0;
        p2.a = 0;
        p2.sx = 1;
        p2.hw = HB[ty][k2][2];
        p2.hh = HB[ty][k2][3];
      }
      for (k2 = 0; k2 < 6; k2++) DT[k2].life = 0;
      if (hp0 > 0 && hp0 < 100) {
        for (k2 = 0; k2 < 6; k2++) P2[k2].hp = P2[k2].max * hp0 / 100;
      }
      E.intro = ty === 3 ? 1 : 0;
      E.snap = ty === 3 ? A.snapshot() : null;
      layout(0);
    }
    function layout(dt) {
      var w = W(), h = H(), u = E.u, ty = E.ty, ph = BO.phase, t = BO.ph, top2 = A.top(), e = BO.st === 1 ? 1 - Math.pow(1 - BO.en, 3) : 1, k2, p2, m, am, bx, by, r, a, sp, q;
      if (ty === 1) {
        am = Math.max(0, (w - DIM2[1][0] * u) / 2 - 6);
        sp = [0.5, 0.55, 0.62, 0.5, 0.95, 0.7][ph - 1];
        bx = w / 2 + Math.sin(t * sp) * Math.min(w * (ph >= 3 ? 0.18 : 0.12), am);
        by = top2 + 112 * u + (ph >= 2 ? 10 * u : 0) + Math.sin(t * 1.3) * 4;
        if (E.a >= 0 && ATK2[E.a][0] === "ml-swap" && BO.fs === S_ATK) bx = E.hx;
        E.hx = bx;
        E.hy = by;
        by -= (1 - e) * (by + 240 * u);
        E.x = bx;
        E.y = by;
        for (k2 = 0; k2 < 6; k2++) {
          p2 = P2[k2];
          m = k2 === 2 || k2 === 5 ? -1 : 1;
          if (k2 === 0) {
            p2.x = bx;
            p2.y = by;
          } else if (k2 < 3) {
            p2.x = bx + m * -95 * u * (1 + 0.05 * E.g);
            p2.y = by + 30 * u + Math.sin(t * 2 + k2) * 2 * u;
          } else if (k2 === 3) {
            p2.x = bx;
            p2.y = by + 70 * u;
            p2.a = Math.sin(t * 1.4) * 0.05;
          } else {
            r = (ph >= 4 ? 10 : 0) + (BO.fs === S_VULN ? 14 : 0) + Math.sin(t * 2.3) * 3;
            p2.x = bx + m * -(150 + r) * u;
            p2.y = by - 4 * u;
            p2.a = m * -Math.sin(t * 2.3) * 0.05;
            p2.sx = m;
          }
        }
      } else if (ty === 2) {
        sp = [0.6, 0.7, 0.8, 0.9, 1.1, 1.3][ph - 1];
        for (k2 = 0; k2 < 2; k2++) {
          p2 = P2[k2];
          m = k2 ? 1 : -1;
          q = E.swapT > 0 ? -m : m;
          bx = w / 2 + q * (w * 0.18 + Math.sin(t * sp) * w * 0.03 * (ph >= 3 ? 2 : 1));
          by = top2 + 83 * u + Math.sin(t * 0.9 + k2 * 2) * 6 * (ph >= 4 ? 2 : 1);
          if (!p2.ov) {
            p2.hx = bx;
            p2.hy = by;
            p2.x = bx;
            p2.y = by - (1 - e) * (by + 166 * u);
          }
        }
        if (!P2[0].alive && P2[1].alive && !P2[1].ov) {
          P2[1].x += (w / 2 - P2[1].x) * Math.min(1, dt * 1.5);
        }
        if (!P2[1].alive && P2[0].alive && !P2[0].ov) {
          P2[0].x += (w / 2 - P2[0].x) * Math.min(1, dt * 1.5);
        }
        for (k2 = 2; k2 < 6; k2++) {
          p2 = P2[k2];
          if (p2.ov) continue;
          q = P2[k2 & 1 ^ (ph >= 5 && (t * 0.4 | 0) & 1 ? 1 : 0)];
          if (!q.alive) q = P2[0].alive ? P2[0] : P2[1];
          r = (96 + (ph >= 3 ? 10 : 0)) * u;
          a = t * (1.1 + 0.25 * ph) * (k2 & 1 ? 1 : -1) + (k2 >> 1) * Math.PI + (k2 & 1) * 0.6;
          bx = q.x + Math.cos(a) * r;
          by = q.y + Math.sin(a) * r * 0.55 + 12 * u;
          if (dt > 0 && BO.st === 2) {
            p2.x += (bx - p2.x) * Math.min(1, dt * 6);
            p2.y += (by - p2.y) * Math.min(1, dt * 6);
          } else {
            p2.x = bx;
            p2.y = by;
          }
          p2.spin += dt * (4 + 2 * ph);
        }
        E.x = (P2[0].x + P2[1].x) / 2;
        E.y = Math.min(P2[0].y, P2[1].y);
      } else {
        am = Math.max(0, (w - DIM2[3][0] * u) / 2 - 6);
        sp = [0.4, 0.45, 0.5, 0.55, 0.65, 0.8][ph - 1];
        bx = w / 2 + Math.sin(t * sp) * Math.min(w * (0.06 + 0.02 * ph), am);
        by = top2 + 124 * u + Math.sin(t * 0.9) * 5;
        E.hx = bx;
        E.hy = by;
        var jx = E.jOn ? E.jx : bx, jy = E.jOn ? E.jy : by;
        if (BO.st === 1) {
          e = clamp((BO.age - BO.il * 0.42) / (BO.il * 0.5), 0, 1);
        }
        E.x = bx;
        E.y = by;
        var wa = [0.28, 0.16, -0.06, -0.16, -0.26, -0.34][ph - 1] + Math.sin(t * 1.4) * 0.04 + (BO.fs === S_STAG ? 0.4 : 0), cy = -[0, 3, 5, 7, 9, 10][ph - 1], jo = ph >= 4 ? 8 + Math.sin(t * 3) * 2 : 0;
        for (k2 = 0; k2 < 6; k2++) {
          p2 = P2[k2];
          if (k2 === 0) {
            p2.x = jx;
            p2.y = jy - (1 - e) * (jy + 120 * u);
          } else if (k2 === 1) {
            p2.x = jx;
            p2.y = jy + (-80 + cy) * u - (1 - e) * 300 * u;
          } else if (k2 < 4) {
            m = k2 === 2 ? -1 : 1;
            p2.x = bx + m * 60 * u + m * (1 - e) * w * 0.6;
            p2.y = by;
            p2.a = -m * wa;
            p2.sx = -m;
          } else if (k2 === 4) {
            p2.x = jx;
            p2.y = jy + jo * u + (1 - e) * 260 * u;
          } else {
            p2.x = bx;
            p2.y = by + 44 * u + (1 - e) * 200 * u;
          }
        }
      }
      for (k2 = 0; k2 < 6; k2++) {
        p2 = P2[k2];
        q = HB[ty][k2];
        if (!(ty === 2 && p2.ov)) {
          p2.bx = p2.x + q[0] * u * p2.sx;
          p2.by = p2.y + q[1] * u;
        }
      }
    }
    function partAt(x, y) {
      var best = -1, bb = -1e9, j, p2, u = E.u;
      for (j = 0; j < 6; j++) {
        p2 = P2[j];
        if (!p2.alive) continue;
        if (x >= p2.bx - p2.hw * u && x <= p2.bx + p2.hw * u && y <= p2.by + p2.hh * u && y + 9 >= p2.by - p2.hh * u && p2.by + p2.hh * u > bb) {
          bb = p2.by + p2.hh * u;
          best = j;
        }
      }
      return best;
    }
    function firstInCol(x) {
      var best = -1, bb = -1e9, j, p2, u = E.u;
      for (j = 0; j < 6; j++) {
        p2 = P2[j];
        if (p2.alive && x >= p2.bx - p2.hw * u && x <= p2.bx + p2.hw * u && p2.by + p2.hh * u > bb) {
          bb = p2.by + p2.hh * u;
          best = j;
        }
      }
      return best;
    }
    var AIM = { x: 0, k: 0 };
    function aim() {
      var j, x, k2, best = -1, bh = 1e9, x0 = 1e9, x1 = -1e9, n = 40, w = W(), lo = 1e9, hi = -1e9, p2;
      for (j = 0; j < 6; j++) {
        p2 = P2[j];
        if (p2.alive) {
          lo = Math.min(lo, p2.bx - p2.hw * E.u);
          hi = Math.max(hi, p2.bx + p2.hw * E.u);
        }
      }
      lo = Math.max(8, lo);
      hi = Math.min(w - 8, hi);
      for (j = 0; j <= n; j++) {
        x = lo + (hi - lo) * j / n;
        k2 = firstInCol(x);
        if (k2 < 0) continue;
        p2 = P2[k2];
        var sc = p2.hp + (p2.core ? 1e3 : 0);
        if (sc < bh - 0.01) {
          bh = sc;
          best = k2;
          x0 = x1 = x;
        } else if (k2 === best) {
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
        }
      }
      if (best < 0) {
        AIM.x = E.x;
        AIM.k = 0;
        return AIM;
      }
      AIM.x = (x0 + x1) / 2;
      AIM.k = best;
      return AIM;
    }
    function stateMul() {
      return BO.fs === S_VULN ? DMG_EX : BO.fs === S_STAG ? DMG_ST : A.armor();
    }
    function immune() {
      return BO.st !== 2 || BO.fs === S_SHIFT || BO.fs === S_DESP || BO.fs === S_INTRO || E.a >= 0 && ATK2[E.a][0] === "sp-jmp" && BO.fs === S_TELE;
    }
    function shot(x, y, dmg, ap) {
      if (!BO.on || BO.st < 1 || BO.gone) return false;
      var k2 = partAt(x, y);
      if (k2 < 0) return false;
      if (BO.st !== 2) return true;
      if (immune() || E.mtx >= 0 && k2 === E.mtx) {
        A.spark(x, y, true);
        return true;
      }
      deal(k2, dmg * (ap ? Math.max(1, stateMul()) : stateMul()), x, y);
      A.score(2);
      return true;
    }
    function beam(x, d) {
      if (BO.st !== 2 || immune()) return -1e9;
      var k2 = firstInCol(x), p2;
      if (k2 < 0 || E.mtx >= 0 && k2 === E.mtx) return -1e9;
      p2 = P2[k2];
      if (p2.by > A.ship.y) return -1e9;
      deal(k2, d * stateMul(), 0, 0);
      return p2.by + p2.hh * E.u;
    }
    function pctHit(pct) {
      if (BO.st !== 2 || immune()) return;
      var a = aim();
      deal(a.k, pct, 0, 0);
    }
    function forceStag() {
      if (BO.st !== 2 || immune() || BO.fs === S_STAG) return false;
      atkClear();
      BO.cnt = 0;
      stagger();
      return true;
    }
    function floorOf(p2) {
      return p2.core && nAlive(false) > 0 ? CORE_MIN * (E.ty === 2 ? 0.5 : 1) : 0;
    }
    function deal(k2, d, sx, sy) {
      var p2 = P2[k2], f, lost;
      if (!p2.alive || d <= 0) return;
      f = floorOf(p2);
      lost = Math.min(d, Math.max(0, p2.hp - f));
      p2.hp -= lost;
      if (lost <= 0 && f > 0) {
        if (sx) A.spark(sx, sy, true);
        hudHit();
        return;
      }
      BO.hit = 0.045;
      A.sfx("bhit");
      if (sx) A.spark(sx, sy, false);
      if (p2.fc <= 0 || d > 5) {
        p2.hit = 0.06;
        p2.fc = 0.28;
      }
      if (BO.gT <= 0) BO.gT = 0.3;
      E.dmgT += lost;
      while (E.dmgT >= 5) {
        E.dmgT -= 5;
        A.shard(p2.x + rnd(-1, 1) * p2.hw * E.u, p2.y + rnd(-1, 1) * p2.hh * E.u, rnd(6, 11) * E.u, Math.random() < 0.5 ? C.deep : C.plate);
      }
      if (p2.hp <= 1e-4) partDie(k2, true);
      recalc();
    }
    function hudHit() {
      BO.hit = 0.03;
    }
    function recalc() {
      var s = 0, j, np;
      for (j = 0; j < 6; j++) if (P2[j].alive) s += Math.max(0, P2[j].hp);
      BO.hp = s;
      if (BO.st !== 2) return;
      np = phaseTarget();
      if (np > BO.phase) {
        if (BO.fs === S_STAG) BO.pend = 1;
        else if (BO.fs !== S_SHIFT && BO.fs !== S_DESP) phaseShift(BO.phase + 1);
      }
      if (s <= 1e-3) kill();
    }
    function phaseTarget() {
      var hp = BO.hp, j, ph = 1;
      for (j = 0; j < THR2.length; j++) if (hp <= THR2[j]) ph = j + 2;
      return Math.max(ph, Math.min(5, 1 + E.killed));
    }
    function partDie(k2, byShot) {
      var p2 = P2[k2], u = E.u, j, q, n, add;
      if (!p2.alive) return;
      p2.alive = false;
      if (byShot) {
        p2.shot = 1;
        E.shotN++;
      } else {
        p2.auto = 1;
        E.autoN++;
      }
      E.killed++;
      A.boom(p2.x, p2.y, 34 * u);
      detach(k2);
      if (!p2.core) {
        if (byShot) {
          add = PART_BONUS;
          for (j = 0; j < 6 && add > 0; j++) {
            q = P2[j];
            if (q.alive && q.core) {
              n = Math.min(add, Math.max(0, q.hp - (nAlive(false) > 0 ? CORE_MIN : 0.5)));
              q.hp -= n;
              add -= n;
            }
          }
          A.floater(p2.x, p2.y + p2.hh * u, PN[E.ty][k2] + " zniszczony");
        }
        if (E.ty === 2 && E.mtx === k2) E.mtx = -1;
      } else if (E.ty === 2) {
        A.floater(p2.x, p2.y + p2.hh * u, "drugi wątek przyspiesza");
        if (E.mtx >= 0) E.mtx = -1;
      }
      A.sfx("boss");
      A.tag();
    }
    function detach(k2) {
      var p2 = P2[k2], d, j;
      for (j = 0; j < 6; j++) if (DT[j].life <= 0) {
        d = DT[j];
        d.k = k2;
        d.x = p2.x;
        d.y = p2.y;
        d.a = p2.a;
        d.m = p2.sx;
        d.S = E.u;
        d.vx = (p2.x < W() / 2 ? -1 : 1) * rnd(60, 170);
        d.vy = -rnd(90, 200);
        d.va = (p2.x < W() / 2 ? -1 : 1) * rnd(1.5, 4);
        d.life = 1.8;
        A.burst(p2.x, p2.y, 18, 230);
        A.shard(p2.x, p2.y, 12 * E.u, C.plate);
        A.shard(p2.x, p2.y, 9 * E.u, C.solid);
        return;
      }
    }
    function shedAll() {
      var j, add = 0, cores = nAlive(true), q;
      for (j = 0; j < 6; j++) {
        q = P2[j];
        if (q.alive && !q.core) {
          add += q.hp;
          q.hp = 0;
          partDie(j, false);
        }
      }
      for (j = 0; j < 6 && cores; j++) {
        q = P2[j];
        if (q.alive && q.core) q.hp += add / cores;
      }
      recalc();
    }
    function setFs(s, d) {
      BO.fs = s;
      BO.ft = 0;
      BO.fd = d;
      BO.stC[s]++;
      A.tag();
    }
    function queueNew(ph) {
      var j, k2, n = 0;
      if (E.ty === 3 && ph === 6) E.fqN = 0;
      for (k2 = 0; k2 < E.fqN; k2++) if (ATK2[E.fq[k2]][3] <= ph) E.fq[n++] = E.fq[k2];
      E.fqN = n;
      for (j = 0; j < NATK2 && E.fqN < 11; j++) if (ATK2[j][2] === E.ty && ATK2[j][3] === ph && !(E.ty === 3 && ATK2[j][0] === "sp-hell")) E.fq[E.fqN++] = j;
      if (E.ty === 3 && ph === 6) E.fq[E.fqN++] = AI2["sp-hell"];
    }
    function teleLen(j) {
      var d = TELE2[BO.phase - 1] * (A.sudo() ? SUDO_T : 1) * ATK2[j][6];
      if (ATK2[j][0] === "sp-core") d = 1.7;
      return d;
    }
    var AW = [];
    for (k = 0; k < NATK2; k++) AW.push(0);
    function nearX() {
      var p2 = P2[0];
      if (E.ty === 2 && (!p2.alive || P2[1].alive && Math.abs(A.ship.x - P2[1].x) < Math.abs(A.ship.x - p2.x))) p2 = P2[1];
      return p2;
    }
    function pick() {
      if (A.still()) {
        setFs(S_IDLE, 0.5);
        return;
      }
      var fa = A.forceAtk();
      if (fa && AI2[fa] != null && ATK2[AI2[fa]][2] === E.ty) {
        tele(AI2[fa]);
        return;
      }
      var ph = BO.phase, j, w, sum = 0, r, X, ship = A.ship, w0 = W(), q = nearX(), cor = ship.x < w0 * 0.22 || ship.x > w0 * 0.78, und = Math.abs(ship.x - q.x) < 60 * E.u, busy = A.prN() > SWEEP_FREE;
      if (E.fqN > 0) {
        j = E.fq[0];
        if (busy && ATK2[j][7]) {
          setFs(S_IDLE, 0.3);
          return;
        }
        for (r = 1; r < E.fqN; r++) E.fq[r - 1] = E.fq[r];
        E.fqN--;
        tele(j);
        return;
      }
      for (j = 0; j < NATK2; j++) {
        X = ATK2[j];
        w = 0;
        if (X[2] === E.ty && j !== E.last && X[0] !== "sp-hell") {
          if (ph === 6 ? X[3] === 6 || X[3] >= 4 : X[3] <= ph) w = X[4] + (X[3] === ph ? 1 : 0) + (cor ? X[8] : 0) + (und ? X[9] : 0);
          if (E.ty === 3 && ph === 6 && X[3] < 6) w = 0;
        }
        if (busy && X[7]) w = 0;
        AW[j] = w;
        sum += w;
      }
      if (sum <= 0) {
        setFs(S_IDLE, 0.3);
        E.last = -1;
        return;
      }
      r = Math.random() * sum;
      for (j = 0; j < NATK2 - 1; j++) if (AW[j] > 0 && (r -= AW[j]) < 0) break;
      while (AW[j] <= 0) j--;
      tele(j);
    }
    function fsm(dt) {
      var j;
      BO.ft += dt;
      if (BO.fs === S_IDLE) {
        if (BO.ft >= BO.fd) pick();
      } else if (BO.fs === S_TELE) {
        teleUpd(dt);
        if (BO.ft >= BO.fd) atkStart();
      } else if (BO.fs === S_ATK) {
        atkUpd(dt);
        if (BO.fs === S_ATK && BO.ft >= BO.fd) {
          if (atkEnd()) return;
          BO.cnt++;
          setFs(S_REC, REC_S);
        }
      } else if (BO.fs === S_REC) {
        if (BO.ft >= BO.fd) {
          if (BO.cnt >= VULN_N2[BO.phase - 1] && !(E.ty === 3 && BO.phase === 6)) {
            BO.cnt = 0;
            setFs(S_VULN, VULN_S2[BO.phase - 1]);
            A.sfx("tele");
          } else setFs(S_IDLE, IDLE2[BO.phase - 1] * (A.sudo() ? SUDO_T : 1));
        }
      } else if (BO.fs === S_VULN || BO.fs === S_STAG) {
        if (BO.ft >= BO.fd) {
          if (BO.pend || phaseTarget() > BO.phase) {
            BO.pend = 0;
            phaseShift(BO.phase + 1);
          } else setFs(S_IDLE, IDLE2[BO.phase - 1]);
        }
      } else if (BO.fs === S_SHIFT || BO.fs === S_DESP) {
        if (BO.ft >= BO.fd * 0.5 && BO.vp !== BO.phase) {
          BO.vp = BO.phase;
          E.armT = 0;
          if (BO.phase === 6) shedAll();
        }
        if (BO.ft >= BO.fd) {
          if (phaseTarget() > BO.phase && BO.phase < 6) phaseShift(BO.phase + 1);
          else setFs(S_IDLE, 0.35);
        }
      }
      E.ex = BO.fs === S_VULN || BO.fs === S_STAG || E.ty === 3 && BO.phase === 6;
      j = 0;
    }
    function phaseShift(np) {
      var j;
      atkClear();
      BO.phase = np;
      BO.cnt = 0;
      E.last = -1;
      E.a = -1;
      A.clearPR();
      A.clearStack();
      queueNew(np);
      A.shatterLines();
      E.phT[np] = BO.age;
      setFs(np === 6 ? S_DESP : S_SHIFT, np === 6 ? DESP_S : SHIFT_S);
      A.hitstop(HITSTOP);
      A.shake(0.25);
      for (j = 0; j < 6; j++) if (P2[j].alive) {
        plates(P2[j], np === 6 ? 12 : 7);
        P2[j].hit = 0.08;
      }
      A.banner(PHB2[E.ty][np - 2]);
      A.live(A.name() + (np === 6 ? ": desperacja." : ": faza " + np + " z 6."));
      A.sfx("boss");
    }
    function plates(p2, n) {
      var u = E.u;
      for (var j = 0; j < n; j++) A.shard(p2.x + rnd(-1, 1) * p2.hw * u, p2.y + rnd(-1, 1) * p2.hh * u, rnd(8, 18) * u, j % 3 === 0 ? C.solid : j & 1 ? C.deep : C.plate);
      A.burst(p2.x, p2.y, 10, 260);
    }
    function atkClear() {
      E.wL = E.wR = 0;
      E.zN = 0;
      E.echo = 0;
      E.jOn = 0;
      E.mtx = -1;
      E.lockHp = 0;
      E.sub = 0;
      E.fired = 0;
      E.ghost = 0;
      E.swapT = 0;
      BO.panic = 0;
      E.page = 0;
      for (var j = 0; j < 6; j++) P2[j].ov = 0;
    }
    function stagger() {
      setFs(S_STAG, STAG_S * A.stagK());
      BO.stg++;
      A.hitstop(HITSTOP);
      A.shake(0.15);
      A.onStag();
      var p2 = firstCore();
      A.floater(p2.x, p2.y + p2.hh * E.u, "stagger ×2");
      A.sfx("bhit");
      A.combo();
    }
    function V(v) {
      return v * hs() * E.vk;
    }
    function proj(x, y, vx, vy, g, r) {
      return A.proj(x, y, vx, vy, g, r);
    }
    function arrow(x, y, da, tx, ty, m) {
      var a = Math.atan2(ty - y, tx - x) + da, v = ARROW_V * hs() * E.vk * (m || 1);
      proj(x + Math.cos(a) * 8, y + Math.sin(a) * 8, Math.cos(a) * v, Math.sin(a) * v, 0, 6 * s0());
    }
    function ring(x, y, n, a0, v, g, gA, gW) {
      var j, a, d;
      for (j = 0; j < n; j++) {
        a = a0 + j * 6.2832 / n;
        if (gW > 0) {
          d = Math.atan2(Math.sin(a - gA), Math.cos(a - gA));
          if (Math.abs(d) < gW / 2) continue;
        }
        proj(x, y, Math.cos(a) * v, Math.sin(a) * v, g, (g === 2 ? 7 : 5) * s0());
      }
    }
    function sweep(side, ty, rows) {
      var r, j, v = SWEEP_V * E.vk * clamp(W() / 700, 0.8, 1.3), w = W(), h = H();
      for (r = 0; r < rows; r++) for (j = 0; j < 6; j++) proj(side > 0 ? -12 - j * 50 : w + 12 + j * 50, clamp(ty - r * 46 * s0(), 20, h - 20), side * v, 0, 1, 7 * s0());
    }
    function wallRow(gx, gw, y, vy, g) {
      var bw = A.pj(g || 4).w, x, n = 0;
      for (x = bw / 2; x < W() + bw / 2; x += bw) if (Math.abs(x - gx) > gw / 2 + bw / 2) {
        proj(x, y, 0, vy, g || 4, 0);
        n++;
      }
      return n;
    }
    function gap() {
      return Math.max(SAFE_GAP * s0(), 72);
    }
    function eyeX(k2) {
      var p2 = P2[k2].alive ? P2[k2] : firstCore();
      return p2.x;
    }
    function eyeY(k2) {
      var p2 = P2[k2].alive ? P2[k2] : firstCore(), u = E.u;
      if (E.ty === 1) return p2.y + (k2 === 3 ? 40 * u : 0);
      if (E.ty === 2) return p2.core ? p2.y - 24 * u : p2.y;
      return k2 === 0 ? p2.y - 55 * u : p2.y;
    }
    function alive(k2) {
      return P2[k2].alive ? 1 : 0;
    }
    function zone(x, y, w, h) {
      if (E.zN >= Z.length) return;
      var z = Z[E.zN++];
      z.x = x;
      z.y = y;
      z.w = w;
      z.h = h;
    }
    function tele(j) {
      var id = ATK2[j][0], ship = A.ship, w = W(), h = H(), k2, a, top2, n, s, x;
      E.a = j;
      E.last = j;
      E.tx = ship.x;
      E.ty2 = ship.y;
      E.tm = 0;
      E.fired = 0;
      E.sub = 0;
      E.vk = (A.sudo() ? SUDO_V : 1) * PHASE_V2[BO.phase - 1] * (E.ty === 2 && nAlive(true) === 1 ? 1.25 : 1);
      if (id === "ml-dump" || id === "sp-ml") {
        n = id === "sp-ml" ? 4 + 2 * alive(4) : clamp(3 + 2 * alive(3) + (BO.phase >= 3 ? 1 : 0), 3, 7);
        s = w / n;
        E.rn = n;
        for (k2 = 0; k2 < n; k2++) {
          E.rk[k2] = A.rline();
          E.rx[k2] = clamp(s * k2 + rnd(0, s) - A.lineW(E.rk[k2]) / 2, 2, w - A.lineW(E.rk[k2]) - 2);
        }
        for (k2 = 0; k2 < n - 1; k2++) if (E.rx[k2] + A.lineW(E.rk[k2]) > ship.x - 30 && E.rx[k2] < ship.x + 30 && Math.random() < 0.5) E.rx[k2] = clamp(E.rx[k2] + 60, 2, w - A.lineW(E.rk[k2]) - 2);
      } else if (id === "ml-gc") {
        top2 = E.y + 70 * E.u;
        E.sd = ship.x < w / 2 ? -1 : 1;
        E.gw = Math.max(100 * s0(), 88);
        E.gy = rnd(Math.max(top2 + E.gw * 0.7, h * 0.42), h - E.gw * 0.7);
      } else if (id === "ml-dfree") {
        E.a0 = Math.atan2(ship.y - eyeY(1), ship.x - eyeX(1));
        E.a1 = Math.atan2(ship.y - eyeY(2), ship.x - eyeX(2));
      } else if (id === "ml-realloc") {
        E.cw = Math.max(w * 0.42, 190 * s0());
        E.cx = clamp(ship.x, E.cw / 2, w - E.cw / 2);
        E.sd = E.cx < w / 2 ? 1 : -1;
      } else if (id === "ml-frag") {
        E.fragGap = clamp(ship.x, gap(), w - gap());
      } else if (id === "rc-sweep" || id === "rc-desync" || id === "sp-rc") E.sd = Math.random() < 0.5 ? 1 : -1;
      else if (id === "rc-cross") {
        E.gw = Math.max(108 * s0(), 96);
        E.a0 = Math.asin(clamp((ship.x - w / 2) / (w * 0.32), -1, 1));
      } else if (id === "rc-lock") {
        a = rnd(-0.05, 0.05);
        E.lx[0] = w * (0.2 + a);
        E.lx[1] = w * (0.5 + a);
        E.lx[2] = w * (0.8 + a);
        top2 = Math.max(P2[0].y, P2[1].y) + 80 * E.u;
        E.ly[0] = top2 + (h - top2) * 0.32;
        E.ly[1] = top2 + (h - top2) * 0.7;
      } else if (id === "rc-toctou") {
        E.gw = gap() * 1.15;
        E.gx = clamp(ship.x + rnd(-60, 60), E.gw, w - E.gw);
        E.gx2 = clamp(E.gx + (Math.random() < 0.5 ? -1 : 1) * rnd(90, 140) * s0(), E.gw, w - E.gw);
        E.sub = 0;
      } else if (id === "rc-mutex") E.mtx = !P2[0].alive ? 1 : !P2[1].alive ? 0 : Math.random() < 0.5 ? 0 : 1;
      else if (id === "rc-tandem") E.ly[0] = ship.y;
      else if (id === "rc-prio") {
        E.rn = 0;
        for (k2 = 5; k2 >= 2; k2--) if (P2[k2].alive) E.rk[E.rn++] = k2;
        if (E.rn < 2) {
          E.rk[E.rn++] = P2[0].alive ? 0 : 1;
          E.rk[E.rn++] = P2[1].alive ? 1 : 0;
        }
      } else if (id === "rc-ctx") {
        E.ghost = 1;
      } else if (id === "rc-race") E.sd = ship.x < w / 2 ? 1 : -1;
      else if (id === "sp-stack") {
        for (k2 = 0; k2 < 8; k2++) {
          x = Math.random() * 10 | 0;
          if (A.stackAt(x) >= 2 && Math.random() < 0.7) x = (x + 3) % 10;
          E.rk[k2] = x;
        }
        E.rn = 8;
      } else if (id === "sp-core") {
        E.sub = 1;
        E.gw = Math.max(70, 64 * s0());
        E.gx = rnd(E.gw, w - E.gw);
        A.sfx("boss");
      } else if (id === "sp-page") pagePick(true);
      else if (id === "sp-smash") {
        smashPick();
      } else if (id === "sp-jmp") {
        E.tx = ship.x;
      } else if (id === "sp-seg") {
        E.segW = Math.max(w * 0.36, 150 * s0());
        E.segX = clamp(ship.x, E.segW / 2 + 4, w - E.segW / 2 - 4);
        E.sd = E.segX < w / 2 ? 1 : -1;
      } else if (id === "sp-bof") {
        E.bofX = clamp(ship.x, gap(), w - gap());
      }
      setFs(S_TELE, teleLen(j));
      A.sfx("tele");
    }
    function pagePick(first) {
      var j, sc, sr, w = W(), h = H(), y0 = h * 0.4, pw = w / 4, ph = (h - y0) / 3, ship = A.ship, n, c0, r0;
      c0 = clamp(ship.x / pw | 0, 0, 3);
      r0 = clamp((ship.y - y0) / ph | 0, 0, 2);
      for (j = 0; j < 12; j++) E.pg[j] = 1;
      if (first) {
        sc = c0;
        sr = r0;
        E.pg[sr * 4 + sc] = 0;
        E.pg[sr * 4 + (sc < 3 ? sc + 1 : sc - 1)] = 0;
        n = 2;
      } else {
        sc = c0;
        sr = r0;
        if (Math.random() < 0.6 || r0 === 0 && false) sc = c0 < 3 && (c0 === 0 || Math.random() < 0.5) ? c0 + 1 : c0 - 1;
        else sr = r0 < 2 && (r0 === 0 || Math.random() < 0.5) ? r0 + 1 : r0 - 1;
        E.pg[sr * 4 + sc] = 0;
        n = 1;
      }
      while (n < 4) {
        j = Math.random() * 12 | 0;
        if (E.pg[j] && !(!first && j === r0 * 4 + c0)) {
          E.pg[j] = 0;
          n++;
        }
      }
    }
    function smashPick() {
      var j, x, used = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], sc = clamp(A.ship.x / (W() / 10) | 0, 0, 9), n = 0, tries = 0;
      used[sc] = -1;
      while (n < 4 && tries++ < 60) {
        x = Math.random() * 10 | 0;
        if (used[x] || x > 0 && used[x - 1] > 0 || x < 9 && used[x + 1] > 0) continue;
        used[x] = 1;
        E.rk[n++] = x;
      }
      E.rn = n;
    }
    function teleUpd() {
      var id = ATK2[E.a][0], f = BO.ft / BO.fd, ship = A.ship;
      if ((id === "sp-np" || id === "sp-panic") && f < 0.65) {
        E.tx = ship.x;
        E.ty2 = ship.y;
      }
      if (id === "rc-tandem" && f < 0.7) E.ly[0] = ship.y;
      if ((id === "rc-sweep" || id === "rc-desync" || id === "sp-rc") && f < 0.3) E.ty2 = ship.y;
      if (id === "sp-core") E.sub = BO.ft < 1.2 ? 1 : 2;
      if (id === "sp-jmp" && f < 0.5) E.tx = ship.x;
      if (id === "rc-toctou" && BO.fd - BO.ft < 0.5 && !E.sub) {
        E.sub = 1;
        A.sfx("tele");
      }
    }
    function atkStart() {
      var j = E.a, id = ATK2[j][0], w = W(), h = H(), k2, n, a, q, x, y, v, c = firstCore(), ship = A.ship, s = s0();
      E.atC[j]++;
      E.tm = 0;
      E.fired = 0;
      if (id === "ml-dump" || id === "sp-ml") {
        for (k2 = 0; k2 < E.rn; k2++) A.lineAt(E.rx[k2], E.rk[k2], A.speed() * (id === "ml-dump" ? 1.35 : 1.05) * E.vk, -A.lh());
        if (id === "ml-dump") ring(c.x, c.y, 6 + 2 * Math.min(3, BO.phase), BO.age, V(170), 6, 0, 0);
      } else if (id === "ml-malloc") {
        n = 4 + alive(4) + (BO.phase >= 3 ? 1 : 0);
        for (k2 = 0; k2 < n; k2++) {
          a = Math.PI * (0.1 + 0.8 * k2 / (n - 1));
          q = proj(c.x, c.y, Math.cos(a) * 160, Math.sin(a) * 160, 5, 8 * s);
          if (q) {
            q.hp = 4;
            q.life = A.mode() === "unik" ? 4.5 : 5.5;
          }
        }
      } else if (id === "ml-spray") {
        n = 10 + 3 * alive(1);
        for (k2 = 0; k2 < n; k2++) {
          a = rnd(0.12, Math.PI - 0.12);
          x = eyeX(1);
          y = eyeY(1);
          q = proj(P2[1].alive ? x : c.x, P2[1].alive ? y : c.y, Math.cos(a) * V(240), Math.sin(a) * V(240), 6, 6 * s);
          if (q) q.life = 3.6;
        }
      } else if (id === "ml-uaf") {
        n = 10 + 2 * alive(5);
        for (k2 = 0; k2 < n; k2++) {
          a = BO.age * 0.7 + k2 * 6.2832 / n;
          q = proj(c.x, c.y, Math.cos(a) * V(230), Math.sin(a) * V(230), 8, 6 * s);
          if (q) {
            q.bh = 1;
            q.ox = c.x;
            q.oy = c.y;
            q.v0 = V(250);
          }
        }
      } else if (id === "ml-gc") {
        gcPass(E.sd, E.gy);
        if (BO.phase >= 5 || alive(4)) {
          E.echo = 0.9;
          E.echoA = j;
          E.sd = -E.sd;
          E.ty2 = clamp(E.gy + (Math.random() < 0.5 ? -1 : 1) * rnd(100, 170) * s, h * 0.42, h - E.gw * 0.7);
        }
      } else if (id === "ml-dfree") {
        dfree();
        E.echo = alive(2) ? 0.75 : 0;
        E.echoA = j;
      } else if (id === "ml-fork") {
        n = 4 + 2 * alive(1);
        a = Math.atan2(ship.y - c.y, ship.x - c.x);
        for (k2 = 0; k2 < n; k2++) {
          x = a + (k2 - (n - 1) / 2) * 0.32;
          q = proj(c.x, c.y + 20 * E.u, Math.cos(x) * V(150), Math.sin(x) * V(150), 8, 6 * s);
          if (q) {
            q.bh = 2;
            q.k2 = 2;
            q.v1 = 0.6;
          }
        }
      } else if (id === "ml-oom") {
        E.sub = 0;
      } else if (id === "rc-sweep" || id === "sp-rc") {
        sweep(E.sd, E.ty2, BO.phase >= 2 || id === "sp-rc" && (alive(2) || alive(3)) ? 2 : 1);
        if (id === "sp-rc" || BO.phase >= 5) {
          E.echo = 0.5;
          E.echoA = j;
          E.sd = -E.sd;
        }
      } else if (id === "rc-desync") {
        sweep(1, E.ty2, 1);
        sweep(-1, E.ty2 - 92 * s, 1);
        E.echo = 0.55;
        E.echoA = j;
      } else if (id === "rc-lock") E.lockHp = 10;
      else if (id === "sp-panic") {
        if (!A.reduced()) BO.panic = 1;
      } else if (id === "sp-core") {
        E.sub = 0;
        curtain();
      } else if (id === "sp-hell") {
        E.hell = 1e-3;
      } else if (id === "sp-jmp") {
        E.jOn = 1;
        E.jx = clamp(E.tx, 72 * E.u, w - 72 * E.u);
        E.jy = E.y;
        E.sub = 0;
      } else if (id === "rc-ctx") {
        E.swapT = 6;
        E.ghost = 0;
        ctxFire();
      } else if (id === "rc-toctou") {
        wallRow(E.gx2, E.gw, Math.max(P2[0].y, P2[1].y) + 70 * E.u, V(250), 4);
      } else if (id === "sp-dfault") {
        ring(eyeX(0), eyeY(0), 16, BO.age, V(165), 8, 0, 0);
        E.sub = 1;
      } else if (id === "sp-page") {
        E.page = 1;
        E.pageN = 0;
      }
      E.echoA = E.echo > 0 ? j : E.echoA;
      setFs(S_ATK, ATK2[j][5]);
    }
    function gcPass(sd, gy) {
      var bw = A.pj(10).h, x = sd > 0 ? -A.pj(10).w : W() + A.pj(10).w, y;
      for (y = bw / 2; y < H() + bw / 2; y += bw) if (Math.abs(y - gy) > E.gw / 2 + bw / 2) proj(x, y, sd * W() / 1.7 * E.vk, 0, 10, 0);
    }
    function dfree() {
      var j, v = V(150), ga = Math.max(0.7, 2 * Math.atan(gap() / 2 / 160));
      for (j = 1; j <= 2; j++) {
        var x = eyeX(j), y = eyeY(j), a = Math.atan2(A.ship.y - y, A.ship.x - x);
        ring(x, y, 18, BO.age * 0.3 + j * 0.17, v, 8, a, ga);
      }
    }
    function curtain() {
      var lx0 = E.gx - E.gw / 2, lx1 = E.gx + E.gw / 2, x, k2, n, sd, tries, w = W();
      for (sd = 0; sd < 2; sd++) {
        x = sd ? lx1 + 4 : 2;
        n = 0;
        for (tries = 0; tries < 8 && n < 6 + 2 * alive(4); tries++) {
          k2 = A.rline();
          if (A.lineW(k2) > (sd ? w - 2 : lx0 - 4) - x) continue;
          A.lineAt(x, k2, A.speed() * 1.35, -A.lh() - n * A.lh() * 0.4);
          x += A.lineW(k2) + 4;
          n++;
        }
      }
    }
    function ctxFire() {
      var j, p2;
      for (j = 0; j < 6; j++) {
        p2 = P2[j];
        if (!p2.alive) continue;
        if (p2.core) {
          arrow(p2.x, p2.y + 50 * E.u, -0.28, A.ship.x, A.ship.y);
          arrow(p2.x, p2.y + 50 * E.u, 0, A.ship.x, A.ship.y);
          arrow(p2.x, p2.y + 50 * E.u, 0.28, A.ship.x, A.ship.y);
        } else arrow(p2.x, p2.y, 0, A.ship.x, A.ship.y, 0.9);
      }
    }
    function atkUpd(dt) {
      var j = E.a, id = ATK2[j][0], tm = E.tm += dt, w = W(), h = H(), k2, a, x, y, v, q, f, n, c = firstCore(), ship = A.ship, s = s0(), u = E.u, p2;
      if (id === "ml-swap") {
        if (tm >= E.fired * 0.5) {
          ring(c.x, c.y, 10, E.fired * 0.4, V(125), 6, 0, 0);
          E.fired++;
        }
        A.pull(c.x, c.y, (0.46 + 0.08 * alive(5)) * E.vk, dt);
      } else if (id === "ml-realloc") {
        f = tm < 0.8 ? tm / 0.8 : tm > 3.6 ? Math.max(0, (4.2 - tm) / 0.6) : 1;
        f = f * f * (3 - 2 * f);
        if (tm > 0.8 && tm < 3.6) E.cx = clamp(E.cx + E.sd * shipV() * 0.22 * dt, E.cw / 2, w - E.cw / 2);
        if (E.cx <= E.cw / 2 + 1 || E.cx >= w - E.cw / 2 - 1) E.sd = -E.sd;
        E.wL = (E.cx - E.cw / 2) * f;
        E.wR = (w - E.cx - E.cw / 2) * f;
        if (tm >= 0.9 + E.fired * 0.85 && tm < 3.4) {
          ring(c.x, c.y, 9, E.fired * 0.5, V(130), 6, 0, 0);
          if (alive(3)) {
            k2 = A.rline();
            if (A.lineW(k2) < E.cw - gap() - 8) A.lineAt(Math.random() < 0.5 ? E.cx - E.cw / 2 + 4 : E.cx + E.cw / 2 - A.lineW(k2) - 4, k2, A.speed() * 1.3, -A.lh());
          }
          E.fired++;
        }
      } else if (id === "ml-frag") {
        if (tm >= E.fired * 0.55 && tm < 3) {
          if (E.fired) E.fragGap = clamp(E.fragGap + (Math.random() < 0.5 ? -1 : 1) * rnd(0.25, 0.55) * shipV() * 0.55, gap(), w - gap());
          wallRow(E.fragGap, gap(), E.y + 80 * u, V(150), 4);
          E.fired++;
        }
      } else if (id === "ml-oom") {
        f = tm < 1 ? tm : tm > 3.8 ? Math.max(0, (4.6 - tm) / 0.8) : 1;
        f = clamp(f, 0, 1);
        f = w * 0.27 * f * f * (3 - 2 * f);
        E.wL = E.wR = f;
        if (tm >= 0.9 + E.fired * 0.9 && tm < 3.8) {
          k2 = A.rline();
          x = rnd(f + 4, Math.max(f + 4, w - f - A.lineW(k2) - 4));
          if (A.lineW(k2) < w - 2 * f - gap() - 8) A.lineAt(x, k2, A.speed() * 1.4, -A.lh());
          ring(c.x, c.y, 10, E.fired, V(135), 6, 0, 0);
          E.fired++;
        }
      } else if (id === "ml-leak") {
        if (tm >= E.fired * 0.1 && tm < 2.5) {
          a = E.fired * 0.44;
          v = 140 * hs() * Math.min(E.vk, 1.15);
          proj(c.x, c.y, Math.cos(a) * v, Math.sin(a) * v, 6, 6 * s);
          proj(c.x, c.y, -Math.cos(a) * v, -Math.sin(a) * v, 6, 6 * s);
          E.fired++;
        }
      } else if (id === "rc-cross") {
        if (tm >= E.fired * 0.3 && tm < 2.2) {
          E.gx = w / 2 + Math.sin(E.a0 + tm * 0.9) * w * 0.32;
          y = Math.max(P2[0].y, P2[1].y) + 70 * u;
          x = (E.fired & 1 ? 20 : 0) * s + 10 * s;
          for (; x < w; x += 40 * s) if (Math.abs(x - E.gx) > E.gw / 2) proj(x, y, 0, V(240), 8, 5 * s);
          P2[E.fired & 1].mz = 0.12;
          E.fired++;
        }
      } else if (id === "rc-lock") {
        if (tm >= 0.6 + E.fired * 0.85) {
          for (k2 = 0; k2 < 2; k2++) if (P2[k2].alive) arrow(P2[k2].x, P2[k2].y + 50 * u, 0, ship.x, ship.y);
          E.fired++;
        }
      } else if (id === "rc-mutex") {
        if ((E.mtT += dt) >= 1.5) {
          E.mtT = 0;
          if (nAlive(true) === 2) E.mtx ^= 1;
          else E.mtx = E.mtx < 0 ? P2[0].alive ? 0 : 1 : -1;
          A.sfx("tele");
        }
        if (tm >= 0.3 + E.fired * 0.55) {
          p2 = P2[E.fired & 1].alive ? P2[E.fired & 1] : P2[E.fired & 1 ^ 1];
          a = Math.atan2(ship.y - p2.y, ship.x - p2.x);
          v = V(255);
          proj(p2.x, p2.y + 30 * u, Math.cos(a) * v, Math.sin(a) * v, 1, 7 * s);
          p2.mz = 0.12;
          E.fired++;
        }
      } else if (id === "rc-spin") {
        p2 = P2[0].alive ? P2[0] : P2[1];
        if (tm >= E.fired * 0.2 && tm < 2.4) {
          n = 0;
          for (k2 = 2; k2 < 6; k2++) if (P2[k2].alive) n++;
          n = Math.max(2, n);
          v = V(170);
          for (k2 = 0; k2 < n; k2++) {
            a = tm * 1.5 + k2 * 6.2832 / n;
            proj(p2.x + Math.cos(a) * 60 * u, p2.y + Math.sin(a) * 60 * u, Math.cos(a) * v, Math.sin(a) * v, 8, 5 * s);
          }
          E.fired++;
        }
        for (k2 = 2; k2 < 6; k2++) if (P2[k2].alive) {
          P2[k2].ov = 1;
          a = tm * 1.5 + (k2 - 2) * 1.5708;
          P2[k2].x = p2.x + Math.cos(a) * 60 * u;
          P2[k2].y = p2.y + Math.sin(a) * 60 * u;
          P2[k2].bx = P2[k2].x;
          P2[k2].by = P2[k2].y;
        }
      } else if (id === "rc-tandem") tandem(tm);
      else if (id === "rc-prio") {
        n = tm / 0.5 | 0;
        if (n > E.fired && E.fired < E.rn + 1) {
          if (E.fired >= 1) {
            p2 = P2[E.rk[E.fired - 1]];
            a = E.lx[E.fired - 1 & 1];
            for (k2 = 0; k2 < 5; k2++) {
              q = proj(p2.x - Math.cos(a) * k2 * 22, p2.y - Math.sin(a) * k2 * 22, Math.cos(a) * V(400), Math.sin(a) * V(400), 0, 6 * s);
            }
            A.sfx("tele");
          }
          if (E.fired < E.rn) {
            p2 = P2[E.rk[E.fired]];
            E.lx[E.fired & 1] = Math.atan2(ship.y - p2.y, ship.x - p2.x);
            E.ly[E.fired & 1] = E.rk[E.fired];
          }
          E.fired++;
        }
      } else if (id === "rc-live") {
        if (tm >= E.fired * 0.9 && tm < 3.2) {
          y = Math.max(P2[0].y, P2[1].y) + 70 * u;
          x = rnd(w * 0.25, w * 0.75);
          var bw = A.pj(4).w, gw = gap() * 1.1, sgn = E.fired & 1 ? 1 : -1;
          for (a = bw / 2; a < w + bw / 2; a += bw) if (Math.abs(a - x) > gw / 2 + bw / 2) {
            q = proj(a, y, 0, V(105), 4, 0);
            if (q) {
              q.bh = 3;
              q.ox = a;
              q.v0 = sgn * Math.min(110 * s, shipV() * 0.3);
              q.v1 = 1.6;
            }
          }
          E.fired++;
        }
      } else if (id === "rc-race") {
        n = tm / 0.5 | 0;
        if (n > E.fired && tm < 2.8) {
          if (E.fired) sweep(E.sd, E.ty2, 1);
          E.sd = -E.sd;
          E.ty2 = clamp(ship.y + rnd(-50, 50) * s, h * 0.35, h - 20);
          E.fired++;
        }
      } else if (id === "sp-np") {
        n = alive(1) ? 2 : 1;
        if (E.fired < 2 && tm >= E.fired * 0.4) {
          x = E.fired ? ship.x : E.tx;
          y = E.fired ? ship.y : E.ty2;
          for (k2 = -n; k2 <= n; k2++) arrow(eyeX(0), eyeY(0) + 80 * u, k2 * 0.28, x, y);
          E.fired++;
        }
      } else if (id === "sp-sigsegv") {
        if (tm >= E.fired * 0.3 && tm < 2.3) {
          ring(eyeX(0), eyeY(0), 12 + 2 * alive(5), E.fired * 0.22, V(150), 8, 0, 0);
          E.fired++;
        }
      } else if (id === "sp-stack") {
        if (E.fired < E.rn && tm >= E.fired * 0.18) {
          x = (E.rk[E.fired] + 0.5) * w / 10;
          A.stackDrop(x, E.rk[E.fired], V(300));
          E.fired++;
        }
      } else if (id === "sp-panic") {
        if (tm >= 0.15 + E.fired * 0.32 && tm < 1.6) {
          arrow(eyeX(0), eyeY(0) + 60 * u, 0, ship.x, ship.y);
          E.fired++;
        }
      } else if (id === "sp-page") {
        if (E.page === 1) {
          E.page = 2;
          E.sub = tm;
        } else if (E.page === 2 && tm - E.sub > 0.5) {
          if (E.pageN === 0) {
            E.pageN = 1;
            pagePick(false);
            E.page = 3;
            E.sub = tm;
            A.sfx("tele");
          } else E.page = 4;
        } else if (E.page === 3 && tm - E.sub > 1.25) {
          E.page = 2;
          E.sub = tm;
        }
        E.zN = 0;
        if (E.page === 2) {
          var y0 = h * 0.4, pw = w / 4, ph2 = (h - y0) / 3;
          for (k2 = 0; k2 < 12; k2++) if (E.pg[k2]) zone(k2 % 4 * pw, y0 + (k2 / 4 | 0) * ph2, pw, ph2);
        }
        if (E.page === 4) BO.ft = BO.fd;
      } else if (id === "sp-dfault") {
        if (E.sub === 1 && tm > 0.55) {
          E.sub = 2;
          ring(eyeX(0), eyeY(0), 16, BO.age + Math.PI / 16, V(165), 8, 0, 0);
        }
        if (E.sub === 2 && tm > 1.1 && alive(5)) {
          E.sub = 3;
          ring(eyeX(0), eyeY(0), 16, BO.age * 2, V(150), 2, Math.atan2(ship.y - eyeY(0), ship.x - eyeX(0)), 1);
        }
      } else if (id === "sp-bof") {
        if (tm >= E.fired * 0.34 && tm < 3.1) {
          E.bofX = clamp(E.bofX + Math.sin(tm * 1.7 + E.sd) * shipV() * 0.34 * 0.34, gap(), w - gap());
          wallRow(E.bofX, gap() * 1.05, E.y + 90 * u, V(175), 4);
          E.fired++;
        }
      } else if (id === "sp-smash") {
        if (E.fired < 3 && tm >= E.fired * 0.22) {
          for (k2 = 0; k2 < E.rn; k2++) {
            x = (E.rk[k2] + 0.5) * w / 10;
            proj(x - 9 * s, h + 14, 0, -V(430), 4, 0);
            proj(x + 9 * s, h + 14, 0, -V(430), 4, 0);
          }
          E.fired++;
        }
      } else if (id === "sp-jmp") {
        y = h - 100 * u;
        if (tm < 0.35) {
          f = tm / 0.35;
          E.jy = E.hy + (y - E.hy) * f * f;
        } else if (E.sub === 0) {
          E.sub = 1;
          E.jy = y;
          A.shake(0.25);
          A.hitstop(0.05);
          for (k2 = -1; k2 <= 1; k2 += 2) proj(E.jx + k2 * 72 * u, h - 10 * s, k2 * V(330), 0, 7, 0);
          A.burst(E.jx, h - 8, 18, 260);
          A.sfx("bomb");
        } else if (tm > 0.8) {
          f = clamp((tm - 0.8) / 0.7, 0, 1);
          f = f * f * (3 - 2 * f);
          E.jy = y + (E.hy - y) * f;
          E.jx += (E.hx - E.jx) * f;
          if (f >= 1) E.jOn = 0;
        }
      } else if (id === "sp-seg") {
        E.zN = 0;
        if (tm > 0.2 && tm < 2.4) {
          E.segX = clamp(E.segX + E.sd * shipV() * 0.18 * dt, E.segW / 2 + 4, w - E.segW / 2 - 4);
          if (E.segX <= E.segW / 2 + 5 || E.segX >= w - E.segW / 2 - 5) E.sd = -E.sd;
          zone(0, h * 0.3, E.segX - E.segW / 2, h * 0.7);
          zone(E.segX + E.segW / 2, h * 0.3, w - E.segX - E.segW / 2, h * 0.7);
          if (tm >= 0.4 + E.fired * 0.55) {
            ring(eyeX(0), eyeY(0), 14, E.fired * 0.3, V(140), 8, 0, 0);
            E.fired++;
          }
        }
      } else if (id === "sp-hell") {
        E.hell = tm;
        if (tm >= E.fired * 0.13 && tm < HELL2_S - 1) {
          v = 120 * hs() * Math.min(E.vk, 1.12);
          a = tm * 0.85;
          for (k2 = 0; k2 < 3; k2++) proj(eyeX(0), eyeY(0), Math.cos(a + k2 * 2.094) * v, Math.sin(a + k2 * 2.094) * v, 8, 5 * s);
          if (E.fired % 15 === 7) {
            a = Math.atan2(ship.y - eyeY(0), ship.x - eyeX(0));
            ringGaps(eyeX(0), eyeY(0), 18, BO.age, v * 0.9, a);
          }
          if (E.fired % 12 === 5) arrow(eyeX(0), eyeY(0), 0, ship.x, ship.y, 0.85);
          E.fired++;
        }
      }
    }
    function ringGaps(x, y, n, a0, v, aim2) {
      var j, a, gw = 0.5;
      for (j = 0; j < n; j++) {
        a = a0 + j * 6.2832 / n;
        if (Math.abs(Math.atan2(Math.sin(a - aim2), Math.cos(a - aim2))) < gw || Math.abs(Math.atan2(Math.sin(a - aim2 - 2.094), Math.cos(a - aim2 - 2.094))) < gw || Math.abs(Math.atan2(Math.sin(a - aim2 + 2.094), Math.cos(a - aim2 + 2.094))) < gw) continue;
        proj(x, y, Math.cos(a) * v, Math.sin(a) * v, 2, 7 * s0());
      }
    }
    function tandem(tm) {
      var k2, p2, f, y, x, ex, a, w = W(), h = H(), n = nAlive(true);
      for (k2 = 0; k2 < 2; k2++) {
        p2 = n === 2 ? P2[k2] : k2 ? null : P2[0].alive ? P2[0] : P2[1];
        if (!p2) continue;
        f = tm - k2 * 1;
        if (f < -0.5) E.ly[1] = A.ship.y;
        y = clamp(E.ly[k2], h * 0.36, h - 67 * E.u);
        x = p2 === P2[0] ? 70 * E.u + 4 : w - 70 * E.u - 4;
        ex = w - x;
        if (f < 0 || f > 1.2) {
          p2.ov = 0;
          continue;
        }
        p2.ov = 1;
        if (f < 0.25) {
          a = f / 0.25;
          p2.x = p2.hx + (x - p2.hx) * a;
          p2.y = p2.hy + (y - p2.hy) * a;
        } else if (f < 0.75) {
          a = (f - 0.25) / 0.5;
          a = a * a;
          p2.x = x + (ex - x) * a;
          p2.y = y;
        } else {
          a = (f - 0.75) / 0.45;
          p2.x = ex + (p2.hx - ex) * a;
          p2.y = y + (p2.hy - y) * a;
        }
        p2.bx = p2.x;
        p2.by = p2.y;
      }
    }
    function atkEnd() {
      var id = ATK2[E.a][0];
      E.wL = E.wR = 0;
      E.zN = 0;
      E.mtx = -1;
      BO.panic = 0;
      E.lockHp = 0;
      E.sub = 0;
      E.jOn = 0;
      E.page = 0;
      for (var j = 0; j < 6; j++) P2[j].ov = 0;
      if (id === "sp-hell" && BO.st === 2) {
        A.floater(A.ship.x, A.ship.y - 34 * s0(), "przetrwane");
        kill();
        return true;
      }
      return false;
    }
    function echoFire() {
      var id = ATK2[E.echoA][0];
      if (id === "ml-gc") {
        E.gy = E.ty2;
        gcPass(E.sd, E.gy);
      } else if (id === "ml-dfree") dfree();
      else if (id === "rc-sweep" || id === "sp-rc" || id === "rc-desync") sweep(E.sd || 1, A.ship.y, 1);
    }
    function bomb(d) {
      var id = E.a >= 0 ? ATK2[E.a][0] : "", j, n = 0, p2;
      if (BO.st !== 2 || BO.fs === S_INTRO || BO.fs === S_SHIFT || BO.fs === S_DESP) return;
      E.bombs++;
      if (id === "sp-core" && BO.fs === S_TELE) {
        A.floater(A.ship.x, A.ship.y - 30 * s0(), "parry");
        atkClear();
        BO.cnt = 0;
        stagger();
        E.bombV++;
        dealBomb(d);
        return;
      }
      if ((BO.fs === S_ATK || BO.fs === S_TELE) && id !== "rc-lock" && id !== "sp-hell") {
        A.floater(A.ship.x, A.ship.y - 30 * s0(), "przerwane");
        atkClear();
        BO.cnt++;
        setFs(S_REC, REC_S);
      }
      if (id === "rc-lock" && BO.fs === S_ATK) lockBreak();
      else if (BO.fs === S_VULN) {
        stagger();
        E.bombV++;
      }
      dealBomb(d);
      j = n;
      p2 = j;
    }
    function dealBomb(d) {
      var j, n = nAlive(false), c = nAlive(true);
      for (j = 0; j < 6; j++) {
        if (!P2[j].alive) continue;
        deal(j, P2[j].core ? d * (n ? 0.4 : 1) / c : d * 0.6 / n);
        if (BO.st !== 2 || BO.fs === S_SHIFT || BO.fs === S_DESP) break;
      }
    }
    function lockBreak() {
      A.floater(E.lx[1], (E.ly[0] + E.ly[1]) / 2, "deadlock zerwany");
      A.burst(E.lx[1], (E.ly[0] + E.ly[1]) / 2, 30, 300);
      atkEnd();
      BO.cnt = 0;
      setFs(S_VULN, VULN_S2[BO.phase - 1]);
      A.combo();
    }
    function lockShot(x, y) {
      if (E.a >= 0 && ATK2[E.a][0] === "rc-lock" && BO.fs === S_ATK && E.lockHp > 0 && Math.abs(x - E.lx[1]) < 14 * s0() && Math.abs(y - (E.ly[0] + E.ly[1]) / 2) < 16 * s0()) {
        A.spark(x, y, false);
        if (--E.lockHp <= 0) lockBreak();
        return true;
      }
      return false;
    }
    function kill() {
      BO.st = 3;
      BO.dt = DEATH_S;
      BO.et = 0;
      A.clearPR();
      BO.fT = BO.age - BO.il;
      atkClear();
      A.clearStack();
      setFs(S_DEATH, DEATH_S);
      for (var j = 0; j < 6; j++) if (P2[j].alive && !P2[j].core) {
        P2[j].alive = false;
        detach(j);
      }
      A.shatterLines();
      A.sfx("boss");
      A.tag();
    }
    function update(dt) {
      var j, p2, u = E.u, w = W(), h = H(), ship = A.ship, id;
      BO.age += dt;
      BO.ph += dt * (BO.fs === S_VULN || BO.fs === S_STAG ? 0.3 : BO.phase === 6 ? 1.5 : 1);
      E.armT += dt;
      if (BO.hit > 0) BO.hit -= dt;
      if (BO.gT > 0) BO.gT -= dt;
      else if (BO.hpG > BO.hp) BO.hpG = Math.max(BO.hp, BO.hpG - dt * 70);
      for (j = 0; j < 6; j++) {
        p2 = P2[j];
        if (p2.hit > 0) p2.hit -= dt;
        if (p2.fc > 0) p2.fc -= dt;
        if (p2.mz > 0) p2.mz -= dt;
        p2.spin += dt * (2.2 + 3.2 * (1 - p2.hp / Math.max(0.01, p2.max)));
      }
      for (j = 0; j < 6; j++) if (DT[j].life > 0) {
        p2 = DT[j];
        p2.vy += 420 * dt;
        p2.x += p2.vx * dt;
        p2.y += p2.vy * dt;
        p2.a += p2.va * dt;
        p2.life -= dt;
      }
      if (E.swapT > 0) E.swapT -= dt;
      if (BO.st === 1) {
        BO.en = Math.min(1, BO.age / (BO.il * 0.62));
        layout(dt);
        if (BO.age >= BO.il) {
          BO.st = 2;
          BO.en = 1;
          queueNew(BO.phase);
          E.phT[BO.phase] = BO.age;
          if (BO.phase === 6) {
            shedAll();
            setFs(S_DESP, DESP_S);
          } else setFs(S_IDLE, 0.5);
        }
        return;
      }
      layout(dt);
      if (BO.st === 3) {
        dying(dt);
        return;
      }
      fsm(dt);
      if (BO.st !== 2) return;
      if (E.echo > 0 && (E.echo -= dt) <= 0) echoFire();
      if (E.ty === 1) {
        E.g = Math.min(1, E.g + dt / 38 * (BO.fs === S_VULN ? -1.5 : 1));
        if (E.g < 0) E.g = 0;
        if ((E.dr -= dt) <= 0 && P2[3].alive) {
          E.dr = 0.18 - 0.08 * E.g;
          A.part(P2[3].x + rnd(-6, 6) * u, P2[3].y + 60 * u, rnd(-10, 10), rnd(20, 60), Math.random() * A.gN() | 0, 1);
        }
      } else if (E.ty === 3 && BO.phase >= 5 && (E.dr -= dt) <= 0) {
        E.dr = BO.phase === 6 ? 0.03 : 0.06;
        p2 = firstCore();
        A.part(p2.x + rnd(-60, 60) * u, p2.y + rnd(-60, 60) * u, rnd(-40, 40), rnd(-90, -10), Math.random() * A.gN() | 0, Math.random() < 0.5 ? 1 : 0);
      }
      if (E.wL > 0 || E.wR > 0) A.walls(E.wL, E.wR);
      if (!A.playing()) return;
      id = E.a >= 0 ? ATK2[E.a][0] : "";
      for (j = 0; j < E.zN; j++) {
        p2 = Z[j];
        if (ship.x > p2.x - 4 * s0() && ship.x < p2.x + p2.w + 4 * s0() && ship.y > p2.y - 6 * s0() && ship.y < p2.y + p2.h + 6 * s0()) {
          A.hurt("strefa " + id);
          break;
        }
      }
      if (id === "rc-lock" && BO.fs === S_ATK && E.lockHp > 0) {
        var f = 4 * s0();
        for (j = 0; j < 3; j++) if (Math.abs(ship.x - E.lx[j]) < f + 6 * s0() && ship.y > E.ly[0] - (E.ly[1] - E.ly[0]) * 0.8) A.hurt("deadlock");
        for (j = 0; j < 2; j++) if (Math.abs(ship.y - E.ly[j]) < f + 9 * s0()) A.hurt("deadlock");
      }
      if (!(id === "sp-jmp" && BO.fs === S_TELE) && E.ghost === 0) for (j = 0; j < 6; j++) {
        p2 = P2[j];
        if (p2.alive && Math.abs(ship.x - p2.bx) < p2.hw * u * 0.85 + 6 * s0() && Math.abs(ship.y - p2.by) < p2.hh * u * 0.85 + 9 * s0()) {
          A.hurt("korpus");
          break;
        }
      }
    }
    function dying(dt) {
      var p2, j;
      BO.dt -= dt;
      if (!BO.gone) {
        if ((BO.et -= dt) <= 0) {
          BO.et = A.reduced() ? 0.2 : 0.085;
          p2 = firstCore();
          A.boom(p2.x + rnd(-1, 1) * p2.hw * E.u, p2.y + rnd(-1, 1) * p2.hh * E.u, rnd(14, 30) * E.u);
          if (Math.random() < 0.35) A.sfx("bhit");
        }
        if (BO.dt <= 0.22) {
          BO.gone = true;
          for (j = 0; j < 6; j++) {
            p2 = P2[j];
            if (!p2.alive) continue;
            A.burst(p2.x, p2.y, 70, 460);
            A.boom(p2.x, p2.y, 60 * E.u);
            p2.alive = false;
          }
          A.flash();
          A.shake(0.3);
          A.sfx("win");
        }
      }
      if (BO.dt <= 0) A.win();
    }
    function prTick(p2, sd) {
      var a, v, j, q;
      if (p2.bh === 1) {
        if (p2.s === 0) {
          p2.vx *= 1 - Math.min(1, sd * 3.2);
          p2.vy *= 1 - Math.min(1, sd * 3.2);
          if (p2.t > 0.6) {
            p2.s = 1;
            p2.vx = p2.vy = 0;
          }
        } else if (p2.s === 1) {
          if (p2.t > 1.6) {
            p2.s = 2;
            a = Math.atan2(p2.oy - p2.y, p2.ox - p2.x);
            p2.vx = Math.cos(a) * p2.v0;
            p2.vy = Math.sin(a) * p2.v0;
            p2.rot = a;
          }
        }
        return 0;
      }
      if (p2.bh === 2) {
        if (p2.k2 > 0 && p2.t >= p2.v1) {
          v = Math.sqrt(p2.vx * p2.vx + p2.vy * p2.vy);
          a = Math.atan2(p2.vy, p2.vx);
          for (j = -1; j <= 1; j += 2) {
            q = A.proj(p2.x, p2.y, Math.cos(a + j * 0.38) * v * 1.05, Math.sin(a + j * 0.38) * v * 1.05, 8, p2.r);
            if (q) {
              q.bh = 2;
              q.k2 = p2.k2 - 1;
              q.v1 = 0.6;
            }
          }
          A.burst(p2.x, p2.y, 3, 90);
          return 1;
        }
        return 0;
      }
      if (p2.bh === 3) {
        p2.x = p2.ox + Math.sin(p2.t * p2.v1) * p2.v0 / p2.v1 * 1;
        p2.y += p2.vy * sd;
        return 2;
      }
      return 0;
    }
    var TBX = 0, TBY = 0, TS = 1, TA = 0;
    function us(c) {
      var q = A.dpr() * TS;
      c.setTransform(q, 0, 0, q, A.dpr() * (TBX + A.shx()), A.dpr() * (TBY + A.shy()));
      if (TA) c.rotate(TA);
    }
    function dp2(c, pt, X, Y, a, sx, sy, im) {
      us(c);
      if (X || Y) c.translate(X, Y);
      if (a) c.rotate(a);
      if (sx !== 1 || sy !== 1) c.scale(sx, sy);
      c.drawImage(im || pt.n, -pt.ax, -pt.ay, pt.w, pt.h);
    }
    function octP(c, cx, cy, r, kk) {
      c.beginPath();
      c.moveTo(cx - r + kk, cy - r);
      c.lineTo(cx + r - kk, cy - r);
      c.lineTo(cx + r, cy - r + kk);
      c.lineTo(cx + r, cy + r - kk);
      c.lineTo(cx + r - kk, cy + r);
      c.lineTo(cx - r + kk, cy + r);
      c.lineTo(cx - r, cy + r - kk);
      c.lineTo(cx - r, cy - r + kk);
      c.closePath();
    }
    function quad(c, ca, sa, cx, cy, r0, r1, hw) {
      var nx = -sa * hw, ny = ca * hw;
      c.beginPath();
      c.moveTo(cx + ca * r0 + nx, cy + sa * r0 + ny);
      c.lineTo(cx + ca * r1 + nx, cy + sa * r1 + ny);
      c.lineTo(cx + ca * r1 - nx, cy + sa * r1 - ny);
      c.lineTo(cx + ca * r0 - nx, cy + sa * r0 - ny);
      c.closePath();
      c.fill();
    }
    function coreX(c, X, Y, r) {
      var ph = BO.ph, j, a;
      r *= 1 + (A.reduced() ? 0 : Math.sin(ph * 8) * 0.07);
      c.fillStyle = C.ink;
      octP(c, X, Y, r * 1.38, r * 0.46);
      c.fill();
      c.fillStyle = C.deep;
      octP(c, X, Y, r * 1.22, r * 0.4);
      c.fill();
      for (j = 0; j < 8; j++) {
        a = ph * 2.4 + j * 0.785;
        c.fillStyle = j & 1 ? C.hot : C.solid;
        quad(c, Math.cos(a), Math.sin(a), X, Y, r * 0.72, r * 1.16, r * 0.13);
      }
      c.fillStyle = C.bone;
      octP(c, X, Y, r * 0.62, r * 0.2);
      c.fill();
      c.fillStyle = C.hot;
      octP(c, X, Y, r * 0.34, r * 0.11);
      c.fill();
      c.fillStyle = C.bone;
      c.fillRect(X - r * 0.1, Y - r * 0.1, r * 0.2, r * 0.2);
    }
    function part2(c, k2, X, Y, a, sx, sy, fl2) {
      var p2 = P2[k2], R = ART.p[k2], f = p2.hp / Math.max(0.01, p2.max);
      dp2(c, R, X, Y, a, sx, sy, fl2 ? R.f : R.n);
      if (!fl2 && f < 0.66) dp2(c, R, X, Y, a, sx, sy, f < 0.33 ? R.k2 : R.k1);
    }
    function fl(k2) {
      return A.fxFlash() && (P2[k2].hit > 0 || BO.st === 3 && (BO.dt * 18 | 0) & 1 || (BO.fs === S_SHIFT || BO.fs === S_DESP) && BO.ft < 0.3 && (BO.ft * 14 | 0) & 1);
    }
    function jit(k2) {
      var a = A.reduced() ? 0 : BO.st === 3 ? 5 : P2[k2].hit > 0 ? 2.5 : BO.fs === S_SHIFT || BO.fs === S_DESP ? 3 : 0;
      return a ? rnd(-a, a) : 0;
    }
    function setB(x, y, S) {
      TBX = x;
      TBY = y;
      TS = S;
    }
    var ACC2 = [C.acc, C.acc, C.hot, C.hot, C.bone, C.bone];
    function drawBoss(c) {
      if (!ART || BO.gone) return;
      var u = E.u, j, p2, ac = ACC2[BO.vp - 1] || C.acc;
      TA = BO.fs === S_STAG ? 0.1 + (A.reduced() ? 0 : 0.04 * Math.sin(BO.age * 9)) : 0;
      if (E.ty === 1) drawML(c, u, ac);
      else if (E.ty === 2) drawRC(c, u, ac);
      else drawSP(c, u, ac);
      TA = 0;
      A.base(c);
      for (j = 0; j < 6; j++) {
        p2 = P2[j];
        if (!p2.alive || BO.st !== 2 || !E.ex) continue;
        bracket(c, p2.bx, p2.by, p2.hw * u + 6, p2.hh * u + 6, BO.fs === S_STAG ? C.hot : C.bone);
      }
      drawDetach(c);
    }
    function bracket(c, x, y, hw, hh, col) {
      var bl = Math.min(16, hw * 0.5, hh * 0.5), th = 3;
      c.fillStyle = col;
      c.fillRect(x - hw, y - hh, bl, th);
      c.fillRect(x - hw, y - hh, th, bl);
      c.fillRect(x + hw - bl, y - hh, bl, th);
      c.fillRect(x + hw - th, y - hh, th, bl);
      c.fillRect(x - hw, y + hh - th, bl, th);
      c.fillRect(x - hw, y + hh - bl, th, bl);
      c.fillRect(x + hw - bl, y + hh - th, bl, th);
      c.fillRect(x + hw - th, y + hh - bl, th, bl);
    }
    function drawDetach(c) {
      var j, d, cs, sn, R, dpr = A.dpr();
      for (j = 0; j < 6; j++) {
        d = DT[j];
        if (d.life <= 0 || d.k < 0) continue;
        R = ART.p[d.k];
        cs = Math.cos(d.a) * d.S;
        sn = Math.sin(d.a) * d.S;
        c.globalAlpha = Math.min(1, d.life / 0.5);
        c.setTransform(dpr * cs * d.m, dpr * sn * d.m, -dpr * sn, dpr * cs, dpr * (d.x + A.shx()), dpr * (d.y + A.shy()));
        c.drawImage(R.k2, -R.ax, -R.ay, R.w, R.h);
        c.globalAlpha *= 0.85;
        c.drawImage(R.n, -R.ax, -R.ay, R.w, R.h);
      }
      c.globalAlpha = 1;
      A.base(c);
    }
    function drawML(c, u, ac) {
      var BA = A.BA(), p2 = P2[0], ph = BO.ph, g = E.g, sw = 1 + 0.1 * g + (A.reduced() ? 0 : 0.03 * Math.sin(ph * 1.7)), j, k2, X, Y, v, N, cp2, fill, r, bt, pu, f, jx = jit(0);
      setB(p2.x + jx, p2.y, u);
      for (j = 4; j < 6; j++) if (P2[j].alive) {
        setB(P2[j].x + jit(j), P2[j].y, u);
        part2(c, j, 0, 0, P2[j].a, P2[j].sx, 0.82, fl(j));
      }
      setB(p2.x + jx, p2.y, u);
      if (BA && BA.ty === 1 && BA.at) {
        N = BA.n;
        cp2 = BA.cp;
        fill = Math.floor(N * (0.16 + 0.84 * g));
        var cut = Math.floor((1 - p2.hp / p2.max) * N * 0.45);
        us(c);
        c.beginPath();
        for (j = 0; j < N; j++) {
          k2 = BA.fo[j];
          if (BA.br[k2] >= cut) c.rect(BA.cx[k2] * sw * 0.72 - 10, BA.cy[k2] * sw * 0.8 - 10, 20, 20);
        }
        c.fillStyle = C.ink;
        c.fill();
        for (j = 0; j < N; j++) {
          k2 = BA.fo[j];
          if (BA.br[k2] < cut) continue;
          X = BA.cx[k2] * sw * 0.72;
          Y = BA.cy[k2] * sw * 0.8 + (A.reduced() ? 0 : Math.sin(ph * 2.4 + k2 * 0.9) * (0.5 + g));
          v = fl(0) ? 6 : j < fill ? BO.vp >= 3 && k2 % 3 === 0 ? 5 : 4 : BA.cv[k2];
          r = BA.cs[k2] * 0.95;
          c.drawImage(BA.at, v * cp2, 0, cp2, cp2, X - 8 * r, Y - 8 * r, 16 * r, 16 * r);
        }
      }
      part2(c, 0, 0, 0, 0, 1, 1, fl(0));
      us(c);
      if (BO.vp === 6) coreX(c, 0, 0, 24);
      else {
        bt = A.reduced() ? 0.5 : ph * (1.1 + 0.25 * BO.vp);
        bt -= Math.floor(bt);
        pu = bt < 0.1 ? Math.sin(bt * 31.4) : bt > 0.18 && bt < 0.28 ? 0.6 * Math.sin((bt - 0.18) * 31.4) : 0;
        c.fillStyle = C.ink;
        octP(c, 0, 0, 22, 7);
        c.fill();
        r = 1.2 * (1 + 0.2 * pu + (p2.hit > 0 ? 0.12 : 0));
        c.save();
        c.scale(r, r);
        c.fillStyle = E.ex ? C.bone : BO.fs === S_TELE ? (BO.age * 16 | 0) & 1 ? C.hot : C.bone : C.solid;
        heart(c);
        c.fill();
        c.scale(0.62, 0.62);
        c.fillStyle = C.hot;
        heart(c);
        c.fill();
        c.restore();
        c.fillStyle = C.bone;
        r = 3 + 2 * pu + (E.ex ? 2 : 0);
        c.fillRect(-r, -r - 1, r * 2, r * 2);
      }
      for (j = 1; j < 3; j++) if (P2[j].alive) {
        setB(P2[j].x + jit(j), P2[j].y, u);
        part2(c, j, 0, 0, 0, 1, 1, fl(j));
        us(c);
        f = clamp(P2[j].hp / P2[j].max, 0, 1);
        c.fillStyle = C.deep;
        c.fillRect(-8, -23, 16, 44);
        c.fillStyle = f < 0.34 ? C.hot : ac;
        c.fillRect(-8, 21 - 44 * f, 16, 44 * f);
        if (!A.reduced()) {
          c.fillStyle = C.bone;
          c.fillRect(-8, 21 - 44 * f, 16, 1.5);
        }
      }
      if (P2[3].alive) {
        setB(P2[3].x + jit(3), P2[3].y, u);
        part2(c, 3, 0, 0, P2[3].a, 1, 1, fl(3));
      }
    }
    var HEART = [0, -16, 7, -9, 17, -13, 14, -3, 20, 4, 8, 8, 3, 18, -4, 9, -16, 11, -13, 0, -19, -8, -7, -8];
    function heart(c) {
      c.beginPath();
      c.moveTo(HEART[0], HEART[1]);
      for (var j = 2; j < HEART.length; j += 2) c.lineTo(HEART[j], HEART[j + 1]);
      c.closePath();
    }
    function drawRC(c, u, ac) {
      var j, p2, m, a, ga, dpr = A.dpr(), BA = A.BA(), x0, x1, y0, y1, n, t2, X, Y, row2;
      if (BA && BA.l0 && P2[0].alive && P2[1].alive) for (row2 = 0; row2 < 2; row2++) {
        x0 = P2[0].x + 46 * u;
        x1 = P2[1].x - 54 * u;
        y0 = P2[0].y + (row2 ? 40 : -20) * u;
        y1 = P2[1].y + (row2 ? 40 : -20) * u;
        n = clamp(Math.floor(Math.abs(x1 - x0) / (19 * u)), 2, 50);
        for (j = 0; j <= n; j++) {
          t2 = j / n;
          X = x0 + (x1 - x0) * t2;
          Y = y0 + (y1 - y0) * t2 + Math.sin(t2 * Math.PI) * (8 + 5 * Math.sin(BO.ph * 2 + row2)) * u;
          c.setTransform(dpr * u * 1.45, 0, 0, dpr * u * 1.45, dpr * (X + A.shx()), dpr * (Y + A.shy()));
          c.drawImage(j & 1 ? BA.l2 : BA.l0, -10, -10, 20, 20);
        }
      }
      for (j = 2; j < 6; j++) {
        p2 = P2[j];
        if (!p2.alive) continue;
        var q = P2[j & 1].alive ? P2[j & 1] : firstCore();
        A.base(c);
        c.strokeStyle = C.deep;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(q.x, q.y);
        c.lineTo(p2.x, p2.y);
        c.stroke();
      }
      for (j = 0; j < 2; j++) {
        p2 = P2[j];
        if (!p2.alive) continue;
        m = j ? -1 : 1;
        ga = p2.hp < p2.max * 0.6 && !A.reduced() && (BO.age * 9 | 0) % 3 === 0 ? 0.7 : 1;
        c.globalAlpha = ga * (E.ghost && BO.fs === S_TELE ? 0.65 : 1);
        setB(p2.x + jit(j), p2.y, u);
        part2(c, j, 0, 0, 0, 1, 1, fl(j));
        us(c);
        if (BO.vp === 6) {
          c.globalAlpha = 1;
          coreX(c, m * -10, -24, 20);
        } else {
          for (var i = 0; i < 8; i++) {
            a = m * p2.spin + i * 0.785;
            c.fillStyle = i < 2 ? C.bone : i < 4 ? ac : C.deep;
            quad(c, Math.cos(a), Math.sin(a), m * -10, -24, 7, 20, 3);
          }
          c.fillStyle = E.ex ? C.bone : BO.fs === S_TELE ? C.hot : C.bone;
          octP(c, m * -10, -24, p2.hit > 0 ? 7 : 5.5, 2);
          c.fill();
        }
        c.fillStyle = ac;
        c.fillRect(m * -40, j ? -69 : -66, m * 70 * clamp(p2.hp / p2.max, 0, 1), 4);
        if (E.mtx === j) {
          c.globalAlpha = 1;
          c.strokeStyle = (BO.age * 12 | 0) & 1 && E.mtT > 1.2 ? C.hot : C.bone;
          c.lineWidth = 3;
          c.strokeRect(-76, -86, 152, 172);
          c.fillStyle = C.bone;
          c.fillRect(-16, -100, 32, 12);
          c.font = "700 8px " + MONO;
          c.textAlign = "center";
          c.textBaseline = "middle";
          c.fillStyle = C.ink;
          c.fillText("LOCK", 0, -93.5);
        }
        c.globalAlpha = 1;
      }
      for (j = 2; j < 6; j++) {
        p2 = P2[j];
        if (!p2.alive) continue;
        setB(p2.x + jit(j), p2.y, u);
        part2(c, j, 0, 0, 0, 1, 1, fl(j));
        us(c);
        c.fillStyle = BO.fs === S_TELE ? C.hot : ac;
        for (var i22 = 0; i22 < 3; i22++) {
          a = p2.spin * 1.6 + i22 * 2.094;
          quad(c, Math.cos(a), Math.sin(a), 0, 0, 3, 11, 2);
        }
        c.fillStyle = C.bone;
        c.fillRect(-2, -2, 4, 4);
      }
      if (E.ghost && BO.fs === S_TELE) {
        A.base(c);
        c.strokeStyle = C.bone;
        c.lineWidth = 2;
        c.setLineDash ? c.setLineDash([6, 5]) : 0;
        for (j = 0; j < 2; j++) if (P2[j].alive) {
          X = W() - P2[j].x;
          c.strokeRect(X - 70 * u, P2[j].y - 67 * u, 140 * u, 134 * u);
        }
        if (c.setLineDash) c.setLineDash([]);
      }
    }
    function ring3(c, R, X, Y, th, tl, sc, sq, im) {
      var ct = Math.cos(th), s1 = Math.sin(th), cp = Math.cos(tl), sp = Math.sin(tl);
      us(c);
      c.translate(X, Y);
      c.transform(sc * (cp * ct - sp * sq * s1), sc * (sp * ct + cp * sq * s1), sc * (-cp * s1 - sp * sq * ct), sc * (-sp * s1 + cp * sq * ct), 0, 0);
      c.drawImage(im, -R.ax, -R.ay, R.w, R.h);
    }
    function drawSP(c, u, ac) {
      var p2 = P2[0], ph = BO.ph, vp = BO.vp, j, a, t1 = ph * (0.7 + 0.12 * vp), t2 = -ph * (0.5 + 0.1 * vp), R52 = ART.p[5], im5, o = 0, X, px, hk = p2.hit > 0 ? 1.18 : 1, r, f5 = fl(5), br = vp >= 5 ? 0.12 * Math.sin(ph * 3) : 0;
      if (E.intro && BO.st === 1) drawShatter(c);
      if (P2[5].alive) {
        im5 = f5 ? R52.f : P2[5].hp < P2[5].max * 0.34 ? R52.k2 : R52.n;
        setB(P2[5].x, P2[5].y, u);
        us(c);
        c.save();
        c.beginPath();
        c.rect(-170, -150, 340, 150);
        c.clip();
        ring3(c, R52, 0, 0, t1, 0.1 + br, 1.28, 0.34, im5);
        ring3(c, R52, 0, 0, t2, -0.16 - br, 1.06, 0.4, im5);
        c.restore();
      }
      for (j = 2; j < 4; j++) if (P2[j].alive) {
        setB(P2[j].x + jit(j), P2[j].y, u);
        part2(c, j, 0, 0, P2[j].a, P2[j].sx, 1, fl(j));
      }
      if (P2[1].alive) {
        setB(P2[1].x + jit(1), P2[1].y, u);
        part2(c, 1, 0, 0, 0, 1.25, 1 + (vp >= 2 ? 0.12 : 0), fl(1));
      }
      setB(p2.x + jit(0), p2.y, u);
      if (vp === 6) {
        o = 20 + (A.reduced() ? 0 : 3 * Math.sin(ph * 5));
        us(c);
        c.fillStyle = C.ink;
        c.fillRect(-o - 4, -86, o * 2 + 8, 120);
        c.fillStyle = C.deep;
        c.fillRect(-o + 3, -86, o * 2 - 6, 120);
        for (j = 0; j < 2; j++) {
          us(c);
          c.save();
          c.translate(j ? o : -o, j ? -2 : 2);
          c.beginPath();
          c.rect(j ? 0 : -170, -130, 170, 260);
          c.clip();
          c.drawImage(fl(0) ? ART.p[0].f : ART.p[0].n, -ART.p[0].ax, -ART.p[0].ay, ART.p[0].w, ART.p[0].h);
          c.restore();
        }
      } else part2(c, 0, 0, 0, 0, 1, 1, fl(0));
      px = clamp((A.ship.x - p2.x) / (150 * u), -1, 1) * 7;
      for (j = 0; j < 2; j++) {
        us(c);
        c.translate(j ? o : -o, 0);
        c.fillStyle = BO.fs === S_TELE && (BO.age * 16 | 0) & 1 ? C.bone : ac;
        c.beginPath();
        if (j) {
          c.moveTo(46, -20);
          c.lineTo(14, -8);
          c.lineTo(15, -3);
          c.lineTo(45, -13);
        } else {
          c.moveTo(-46, -20);
          c.lineTo(-14, -8);
          c.lineTo(-15, -3);
          c.lineTo(-45, -13);
        }
        c.closePath();
        c.fill();
        X = (j ? 28 : -28) + px;
        c.fillStyle = C.ink;
        c.fillRect(X - 2.5, -20 + (j ? 46 - X : X + 46) * 0.375 + 1, 5, 5);
      }
      us(c);
      if (vp === 6) coreX(c, 0, -55, 26 * hk);
      else {
        r = (11 + vp) * hk * (1 + (A.reduced() ? 0 : 0.08 * Math.sin(ph * 5)));
        c.fillStyle = ac;
        c.beginPath();
        for (j = 0; j < 4 + vp * 2; j++) {
          a = ph * (0.8 + 0.2 * vp) + j * 6.2832 / (4 + vp * 2);
          X = j & 1 ? r * 0.45 : r;
          c.lineTo(Math.cos(a) * X, -55 + Math.sin(a) * X);
        }
        c.closePath();
        c.fill();
        c.fillStyle = C.bone;
        octP(c, 0, -55, 4.5 * hk, 1.3);
        c.fill();
      }
      if (P2[4].alive) {
        setB(P2[4].x + jit(4), P2[4].y, u);
        if (vp >= 4) {
          us(c);
          c.fillStyle = BO.fs === S_TELE ? C.hot : C.solid;
          c.fillRect(-44, 36, 88, 14);
        }
        part2(c, 4, 0, 0, 0, 1, 1, fl(4));
      }
      if (P2[5].alive) {
        setB(P2[5].x, P2[5].y, u);
        us(c);
        c.save();
        c.beginPath();
        c.rect(-170, 0, 340, 150);
        c.clip();
        ring3(c, R52, 0, 0, t1, 0.1 + br, 1.28, 0.34, im5);
        ring3(c, R52, 0, 0, t2, -0.16 - br, 1.06, 0.4, im5);
        c.restore();
      }
    }
    var HEX = "0123456789abcdef";
    function drawShatter(c) {
      var sn = E.snap, w = W(), h = H(), dpr = A.dpr(), f = clamp(BO.age / (BO.il * 0.55), 0, 1), n = 8, m = 6, i, j, tw = w / n, th = h / m, x, y, dx, dy, a, q;
      A.base(c);
      c.globalAlpha = 1 - f * 0.3;
      c.font = "500 10px " + MONO;
      c.textAlign = "left";
      c.textBaseline = "top";
      c.fillStyle = C.deep;
      for (j = 0; j < h; j += 14) {
        q = "";
        for (i = 0; i < 6; i++) q += HEX[j * 7 + i * 13 + (BO.age * 9 | 0) & 15] + HEX[j * 3 + i * 5 & 15] + " ";
        c.fillText("0x" + HEX[j >> 4 & 15] + HEX[j & 15] + "f0 " + q + q, 8, j);
      }
      c.globalAlpha = 1;
      if (!sn || f >= 1) return;
      for (j = 0; j < m; j++) for (i = 0; i < n; i++) {
        q = (i * 7 + j * 13) % 10 / 10;
        a = clamp((f - q * 0.4) / 0.6, 0, 1);
        if (a >= 1) continue;
        dx = (i - n / 2 + 0.5) * a * a * 120;
        dy = a * a * (300 + q * 200);
        x = i * tw;
        y = j * th;
        c.setTransform(dpr, 0, 0, dpr, dpr * (x + tw / 2 + dx), dpr * (y + th / 2 + dy));
        c.rotate((i & 1 ? 1 : -1) * a * 0.6);
        c.globalAlpha = 1 - a;
        c.drawImage(sn, x * dpr, y * dpr, tw * dpr, th * dpr, -tw / 2 + 1, -th / 2 + 1, tw - 2, th - 2);
      }
      c.globalAlpha = 1;
      A.base(c);
    }
    function drawTele(c) {
      if (E.a < 0 || BO.fs !== S_TELE) return;
      var id = ATK2[E.a][0], pr = clamp(BO.ft / BO.fd, 0, 1), bl = A.reduced() ? 1 : (BO.age * 16 | 0) & 1, w = W(), h = H(), s = s0(), u = E.u, j, x, y, a, r, n, cf = firstCore(), hot = bl ? C.bone : C.hot;
      if (id === "ml-dump" || id === "sp-ml") {
        for (j = 0; j < E.rn; j++) {
          x = E.rx[j];
          A.vband(c, x, A.lineW(E.rk[j]), pr, bl, 0);
        }
      } else if (id === "ml-malloc" || id === "ml-spray" || id === "ml-uaf" || id === "ml-swap" || id === "ml-leak" || id === "sp-sigsegv" || id === "sp-hell" || id === "sp-dfault" || id === "rc-spin") {
        x = id === "ml-spray" && P2[1].alive ? eyeX(1) : id === "rc-spin" ? P2[0].alive ? P2[0].x : P2[1].x : E.ty === 3 ? eyeX(0) : cf.x;
        y = id === "ml-spray" && P2[1].alive ? eyeY(1) : id === "rc-spin" ? P2[0].alive ? P2[0].y : P2[1].y : E.ty === 3 ? eyeY(0) : cf.y;
        r = (90 - 60 * pr) * s;
        c.fillStyle = hot;
        n = id === "ml-uaf" ? 12 : 8;
        for (j = 0; j < n; j++) {
          a = j * 6.283 / n + BO.age;
          c.fillRect(x + Math.cos(a) * r - 2, y + Math.sin(a) * r - 2, 4, 4);
        }
        if (id === "ml-swap") for (j = 0; j < 4; j++) {
          a = j * 1.571 + 0.785;
          A.lane(c, x + Math.cos(a) * 900, y + Math.sin(a) * 900, a + Math.PI, 8 * s, pr, bl);
        }
        if (id === "ml-uaf") A.label(c, "free(p) → *p", x, y + 90 * u, C.label, 10);
        if (id === "ml-malloc") A.label(c, "malloc()", x, y + 80 * u, C.label, 10);
      } else if (id === "ml-gc") {
        x = E.sd > 0 ? 0 : w - 34;
        c.globalAlpha = 0.3 + 0.4 * pr;
        c.fillStyle = A.haz();
        c.fillRect(x, 0, 34, E.gy - E.gw / 2);
        c.fillRect(x, E.gy + E.gw / 2, 34, h);
        c.globalAlpha = 1;
        A.gapMark(c, E.sd > 0 ? 40 : w - 40, E.gy, E.gw * 0.4, hot);
        A.hband(c, E.gy, E.gw / 2, pr * 0.2, E.sd, bl);
        A.label(c, "free()", E.sd > 0 ? 70 : w - 70, E.gy - E.gw / 2 - 14, C.label, 10);
      } else if (id === "ml-dfree") {
        for (j = 1; j <= 2; j++) {
          x = eyeX(j);
          y = eyeY(j);
          a = Math.atan2(A.ship.y - y, A.ship.x - x);
          A.lane(c, x, y, a, gap() * 0.5 * (1 - 0.4 * pr), pr * 0.4, bl);
        }
        A.label(c, "free(p); free(p);", w / 2, cf.y + 110 * u, C.label, 10);
      } else if (id === "ml-fork") {
        a = Math.atan2(A.ship.y - cf.y, A.ship.x - cf.x);
        A.lane(c, cf.x, cf.y + 20 * u, a, (20 - 10 * pr) * s, pr, bl);
        A.label(c, "fork()", cf.x, cf.y + 100 * u, C.label, 10);
      } else if (id === "ml-realloc") {
        x = E.cx - E.cw / 2;
        c.globalAlpha = 0.18 + 0.3 * pr;
        c.fillStyle = A.haz();
        c.fillRect(0, 0, x, h);
        c.fillRect(x + E.cw, 0, w - x - E.cw, h);
        c.globalAlpha = 1;
        c.strokeStyle = hot;
        c.lineWidth = 2;
        c.strokeRect(x, 0, E.cw, h);
        A.label(c, "realloc()", E.cx, h * 0.5, hot, 14);
      } else if (id === "ml-frag") {
        A.gapMark(c, E.fragGap, E.y + 100 * u, gap(), hot);
        A.label(c, "fragmentation", w / 2, h * 0.5, C.label, 12);
      } else if (id === "ml-oom") {
        x = w * 0.27 * pr;
        c.globalAlpha = 0.35;
        c.fillStyle = A.haz();
        c.fillRect(0, 0, x, h);
        c.fillRect(w - x, 0, x, h);
        c.globalAlpha = 1;
        c.fillStyle = C.hot;
        c.fillRect(x, 0, 2, h);
        c.fillRect(w - x - 2, 0, 2, h);
        A.label(c, "OUT OF MEMORY", w / 2, h * 0.5, hot, 16);
      } else if (id === "rc-sweep" || id === "rc-desync" || id === "sp-rc") {
        r = (28 - 19 * pr) * s;
        for (j = 0; j < (BO.phase >= 2 && id === "rc-sweep" || id === "sp-rc" && (P2[2].alive || P2[3].alive) ? 2 : 1); j++) A.hband(c, clamp(E.ty2 - j * 46 * s, 20, h - 20), r, pr, E.sd, bl);
        if (id === "rc-desync") A.hband(c, clamp(E.ty2 - 92 * s, 20, h - 20), r, pr, -E.sd, bl);
      } else if (id === "rc-cross") {
        y = Math.max(P2[0].y, P2[1].y) + 70 * u;
        x = w / 2 + Math.sin(E.a0) * w * 0.32;
        c.globalAlpha = 0.18 + 0.3 * pr;
        c.fillStyle = A.haz();
        c.fillRect(0, y, x - E.gw / 2, h - y);
        c.fillRect(x + E.gw / 2, y, w, h - y);
        c.globalAlpha = 1;
        c.strokeStyle = hot;
        c.lineWidth = 2;
        c.strokeRect(x - E.gw / 2, y, E.gw, h - y);
      } else if (id === "rc-lock") drawGrid(c, pr);
      else if (id === "rc-toctou") {
        y = Math.max(P2[0].y, P2[1].y) + 70 * u;
        x = E.sub ? E.gx2 : E.gx;
        c.globalAlpha = 0.22 + 0.35 * pr;
        c.fillStyle = A.haz();
        c.fillRect(0, y - 10, x - E.gw / 2, 24);
        c.fillRect(x + E.gw / 2, y - 10, w, 24);
        c.globalAlpha = 1;
        A.gapMark(c, x, y + 2, E.gw, E.sub ? C.bone : C.label);
        if (E.sub) {
          A.gapMark(c, E.gx, y + 2, E.gw, C.muted);
          A.label(c, "TOCTOU: luka przeskakuje", x, y + 40, hot, 11);
        } else A.label(c, "check()", x, y + 40, C.label, 10);
      } else if (id === "rc-mutex") {
        A.label(c, "mutex.lock()", w / 2, Math.max(P2[0].y, P2[1].y) + 100 * u, C.label, 10);
      } else if (id === "rc-tandem") {
        p = P2[0].alive ? P2[0] : P2[1];
        A.hband(c, clamp(E.ly[0], h * 0.36, h - 67 * u), 67 * u * 0.85, pr, p === P2[0] ? 1 : -1, bl);
      } else if (id === "rc-prio") {
        for (j = 0; j < E.rn; j++) {
          var pp = P2[E.rk[j]];
          c.fillStyle = j === 0 ? hot : C.label;
          c.font = "700 10px " + MONO;
          c.textAlign = "center";
          c.fillText("P" + (j + 1), pp.x, pp.y - 30 * u);
        }
      } else if (id === "rc-live") {
        A.label(c, "livelock", w / 2, h * 0.45, C.label, 12);
      } else if (id === "rc-ctx") {
        A.label(c, "context_switch", w / 2, Math.max(P2[0].y, P2[1].y) + 100 * u, hot, 11);
      } else if (id === "rc-race") {
        A.hband(c, clamp(A.ship.y, 20, h - 20), 18 * s, pr, E.sd, bl);
        A.label(c, "data_race", w / 2, h * 0.3, C.label, 11);
      } else if (id === "sp-np" || id === "sp-panic") {
        y = eyeY(0) + 80 * u;
        a = Math.atan2(E.ty2 - y, E.tx - eyeX(0));
        r = (24 - 17 * pr) * s;
        n = id === "sp-panic" ? 0 : P2[1].alive ? 2 : 1;
        for (j = -n; j <= n; j++) A.lane(c, eyeX(0), y, a + j * 0.28, r, pr, bl);
        A.reticle(c, E.tx, E.ty2, (54 - 36 * pr) * s, hot);
        if (id === "sp-panic") {
          A.label(c, "KERNEL PANIC", w / 2, h * 0.5, hot, 22);
          c.fillStyle = C.hot;
          c.fillRect(w / 2 - 90, h * 0.5 + 16, 180 * (1 - pr), 4);
        }
      } else if (id === "sp-stack") {
        for (j = 0; j < E.rn; j++) {
          x = E.rk[j] * w / 10;
          c.globalAlpha = 0.2 + 0.3 * pr;
          c.fillStyle = A.haz();
          c.fillRect(x + 2, h - A.pj(9).h * 3, w / 10 - 4, A.pj(9).h * 3);
          c.globalAlpha = 1;
          c.fillStyle = hot;
          A.chev(c, x + w / 20, 18 + pr * 20, 7);
        }
        A.label(c, "stack overflow", w / 2, h - A.pj(9).h * 3 - 16, C.label, 10);
      } else if (id === "sp-core") {
        x = E.gx - E.gw / 2;
        c.globalAlpha = E.sub === 2 ? 0.45 : 0.22;
        c.fillStyle = A.haz();
        c.fillRect(0, 0, x, h);
        c.fillRect(x + E.gw, 0, w - x - E.gw, h);
        c.globalAlpha = 1;
        c.strokeStyle = C.bone;
        c.lineWidth = 2;
        c.strokeRect(x, 0, E.gw, h);
        c.font = "500 9px " + MONO;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillStyle = C.bone;
        c.fillText("BEZPIECZNY", E.gx, h * 0.62);
        c.fillStyle = C.hot;
        c.fillRect(x, 0, E.gw * clamp(1 - BO.ft / BO.fd, 0, 1), 5);
        if (E.sub === 1) A.label(c, "BOMBA = PARRY", cf.x, cf.y + 120 * u, hot, 11);
      } else if (id === "sp-page") drawPages(c, pr, false);
      else if (id === "sp-bof") {
        A.gapMark(c, E.bofX, E.y + 110 * u, gap(), hot);
        A.label(c, "buffer overflow", w / 2, h * 0.5, C.label, 12);
      } else if (id === "sp-smash") {
        for (j = 0; j < E.rn; j++) {
          x = E.rk[j] * w / 10;
          A.vband(c, x + 2, w / 10 - 4, pr, bl, h * 0.25);
        }
        A.label(c, "stack smashing", w / 2, h * 0.2, hot, 11);
      } else if (id === "sp-jmp") {
        x = clamp(E.tx, 72 * u, w - 72 * u);
        r = 72 * u;
        A.vband(c, x - r, r * 2, pr, bl, 0);
        A.reticle(c, x, h - 34 * s, (60 - 30 * pr) * s, hot);
        A.label(c, "jmp *null", x, h * 0.45, hot, 11);
      } else if (id === "sp-seg") {
        x = E.segX - E.segW / 2;
        c.globalAlpha = 0.2 + 0.35 * pr;
        c.fillStyle = A.haz();
        c.fillRect(0, h * 0.3, x, h * 0.7);
        c.fillRect(x + E.segW, h * 0.3, w - x - E.segW, h * 0.7);
        c.globalAlpha = 1;
        c.strokeStyle = C.bone;
        c.lineWidth = 2;
        c.strokeRect(x, h * 0.3, E.segW, h * 0.7);
        A.label(c, "SEGMENT", E.segX, h * 0.36, C.bone, 11);
      }
    }
    var p;
    function drawPages(c, pr, act) {
      var w = W(), h = H(), y0 = h * 0.4, pw = w / 4, ph = (h - y0) / 3, j, x, y, bl = (BO.age * 16 | 0) & 1;
      for (j = 0; j < 12; j++) {
        x = j % 4 * pw;
        y = y0 + (j / 4 | 0) * ph;
        if (E.pg[j]) {
          c.globalAlpha = act ? 0.75 : 0.16 + 0.3 * pr;
          c.fillStyle = act ? C.solid : A.haz();
          c.fillRect(x + 2, y + 2, pw - 4, ph - 4);
          c.globalAlpha = 1;
          c.strokeStyle = act ? C.hot : bl ? C.bone : C.hot;
          c.lineWidth = 2;
          c.strokeRect(x + 3, y + 3, pw - 6, ph - 6);
        } else {
          c.strokeStyle = C.muted;
          c.lineWidth = 1;
          c.strokeRect(x + 6, y + 6, pw - 12, ph - 12);
        }
      }
      A.label(c, act ? "PAGE FAULT" : "page fault", w / 2, y0 - 16, act ? C.hot : C.label, 11);
    }
    function drawGrid(c, pr) {
      var BA = A.BA(), j, x, y, n, top2 = E.ly[0] - (E.ly[1] - E.ly[0]) * 0.8, act = BO.fs === S_ATK, u = E.u, lx = E.lx[1], lyc = (E.ly[0] + E.ly[1]) / 2, dpr = A.dpr(), w = W(), h = H();
      if (!BA || !BA.l0) return;
      c.globalAlpha = act ? 1 : 0.25 + 0.5 * pr;
      for (j = 0; j < 3; j++) for (y = top2; y < h; y += 15 * u) {
        c.setTransform(0, dpr * u, -dpr * u, 0, dpr * (E.lx[j] + A.shx()), dpr * (y + A.shy()));
        c.drawImage(act ? BA.l1 : BA.l0, -9, -9, 18, 18);
      }
      for (j = 0; j < 2; j++) for (x = 0; x < w; x += 15 * u) {
        c.setTransform(dpr * u, 0, 0, dpr * u, dpr * (x + A.shx()), dpr * (E.ly[j] + A.shy()));
        c.drawImage(act ? BA.l1 : BA.l0, -9, -9, 18, 18);
      }
      A.base(c);
      c.globalAlpha = 1;
      if (act && E.lockHp > 0) {
        n = 14 * s0();
        c.fillStyle = C.ink;
        c.fillRect(lx - n - 2, lyc - n - 2, n * 2 + 4, n * 2 + 4);
        c.fillStyle = C.bone;
        c.fillRect(lx - n, lyc - n * 0.4, n * 2, n * 1.4);
        c.strokeStyle = C.bone;
        c.lineWidth = 3;
        c.strokeRect(lx - n * 0.55, lyc - n, n * 1.1, n * 0.7);
        c.fillStyle = C.hot;
        c.fillRect(lx - n, lyc + n - 4, n * 2 * E.lockHp / 10, 3);
        c.fillStyle = C.ink;
        c.fillRect(lx - 2, lyc, 4, 6);
      }
    }
    function drawAtk(c) {
      var id = E.a >= 0 ? ATK2[E.a][0] : "", w = W(), h = H(), j, x, a, pp, f, cf = firstCore(), bl = (BO.age * 16 | 0) & 1;
      if (E.wL > 0 || E.wR > 0) {
        for (j = 0; j < 2; j++) {
          a = j ? E.wR : E.wL;
          if (a <= 0) continue;
          x = j ? w - a : 0;
          c.fillStyle = C.ink;
          c.fillRect(x, 0, a, h);
          c.globalAlpha = 0.5;
          c.fillStyle = A.haz();
          c.fillRect(x, 0, a, h);
          c.globalAlpha = 1;
          c.fillStyle = C.bone;
          c.fillRect(j ? x : x + a - 3, 0, 3, h);
        }
        A.label(c, id === "ml-realloc" ? "realloc()" : "OOM", w / 2, h - 30, C.hot, 12);
      }
      if (id === "rc-lock" && BO.fs === S_ATK && E.lockHp > 0) drawGrid(c, 1);
      if (id === "sp-page" && BO.fs === S_ATK) drawPages(c, E.page === 3 ? clamp((E.tm - E.sub) / 1.25, 0, 1) : 1, E.page === 2);
      if (id === "sp-seg" && BO.fs === S_ATK && E.zN) {
        for (j = 0; j < E.zN; j++) {
          var z = Z[j];
          c.fillStyle = C.deep;
          c.fillRect(z.x, z.y, z.w, z.h);
          c.globalAlpha = 0.5;
          c.fillStyle = A.haz();
          c.fillRect(z.x, z.y, z.w, z.h);
          c.globalAlpha = 1;
        }
        c.fillStyle = C.bone;
        c.fillRect(E.segX - E.segW / 2 - 2, h * 0.3, 3, h * 0.7);
        c.fillRect(E.segX + E.segW / 2 - 1, h * 0.3, 3, h * 0.7);
        A.label(c, "SIGSEGV", E.segX, h * 0.36, C.hot, 11);
      }
      if (id === "ml-swap" && BO.fs === S_ATK) {
        pp = cf;
        c.strokeStyle = C.hot;
        c.lineWidth = 2;
        f = BO.age * 2 % 1;
        for (j = 0; j < 5; j++) {
          a = 1 - (j / 5 + f) % 1;
          c.globalAlpha = 0.25 + 0.6 * (1 - a);
          c.beginPath();
          c.moveTo(A.ship.x + (pp.x - A.ship.x) * (1 - a), A.ship.y + (pp.y - A.ship.y) * (1 - a));
          c.lineTo(A.ship.x + (pp.x - A.ship.x) * (1 - a * 0.9), A.ship.y + (pp.y - A.ship.y) * (1 - a * 0.9));
          c.stroke();
        }
        c.globalAlpha = 1;
        A.label(c, "SWAP", pp.x, pp.y + 90 * E.u, C.bone, 11);
      }
      if (id === "rc-prio" && BO.fs === S_ATK && E.fired >= 1 && E.fired <= E.rn) {
        pp = P2[E.rk[E.fired - 1]];
        a = E.lx[E.fired - 1 & 1];
        A.lane(c, pp.x, pp.y, a, 16 * s0(), clamp((E.tm - (E.fired - 1) * 0.5) / 0.5, 0, 1), bl);
      }
      if (id === "rc-tandem" && BO.fs === S_ATK && E.tm < 1 && nAlive(true) === 2) A.hband(c, clamp(E.ly[1], h * 0.36, h - 67 * E.u), 67 * E.u * 0.85, clamp((E.tm - 0.5) / 0.5, 0, 1), -1, bl);
      if (id === "rc-race" && BO.fs === S_ATK) A.hband(c, E.ty2, 18 * s0(), clamp(E.tm % 0.5 / 0.5, 0, 1), E.sd, bl);
      if (E.echo > 0 && E.echoA >= 0 && ATK2[E.echoA][0] === "ml-gc") {
        x = E.sd > 0 ? 0 : w - 34;
        c.globalAlpha = 0.45;
        c.fillStyle = A.haz();
        c.fillRect(x, 0, 34, E.ty2 - E.gw / 2);
        c.fillRect(x, E.ty2 + E.gw / 2, 34, h);
        c.globalAlpha = 1;
        A.gapMark(c, E.sd > 0 ? 40 : w - 40, E.ty2, E.gw * 0.4, bl ? C.bone : C.hot);
      }
      if (E.echo > 0 && E.echoA >= 0 && ATK2[E.echoA][0] === "ml-dfree") {
        for (j = 1; j <= 2; j++) {
          x = eyeX(j);
          a = Math.atan2(A.ship.y - eyeY(j), A.ship.x - x);
          A.lane(c, x, eyeY(j), a, gap() * 0.3, 1 - E.echo / 0.75, bl);
        }
      }
    }
    function hudLabel() {
      if (BO.fs === S_VULN) return "!! odsłonięty: bomba = stagger";
      if (BO.fs === S_STAG) return "!! stagger: obrażenia ×2";
      if (BO.fs === S_SHIFT) return ">> zmiana fazy";
      if (BO.fs === S_DESP) return ">> desperacja";
      if (E.a < 0 || BO.fs !== S_TELE && BO.fs !== S_ATK) return "";
      if (ATK2[E.a][0] === "sp-hell" && BO.fs === S_ATK) return HELLT2[clamp(Math.ceil(HELL2_S - E.hell), 0, HELL2_S)];
      return (BO.fs === S_TELE ? ATT2 : ATA2)[E.a];
    }
    function hazards(o) {
      var j, p2, top2, u = E.u, w = W(), h = H(), id = E.a >= 0 ? ATK2[E.a][0] : "";
      if (!BO.on || BO.st !== 2) return;
      for (j = 0; j < 6; j++) {
        p2 = P2[j];
        if (p2.alive) o.push({ x: p2.bx - p2.hw * u * 0.85, y: p2.by - p2.hh * u * 0.85, w: p2.hw * u * 1.7, h: p2.hh * u * 1.7, vx: 0, vy: 0, body: 1 });
      }
      for (j = 0; j < E.zN; j++) o.push({ x: Z[j].x, y: Z[j].y, w: Z[j].w, h: Z[j].h, vx: 0, vy: 0 });
      if (id === "rc-lock" && (BO.fs === S_ATK && E.lockHp > 0 || BO.fs === S_TELE)) {
        top2 = E.ly[0] - (E.ly[1] - E.ly[0]) * 0.8;
        for (j = 0; j < 3; j++) o.push({ x: E.lx[j] - 4, y: top2, w: 8, h, vx: 0, vy: 0 });
        for (j = 0; j < 2; j++) o.push({ x: 0, y: E.ly[j] - 4, w, h: 8, vx: 0, vy: 0 });
      }
      if (id === "sp-page" && BO.fs === S_ATK && E.page === 3) {
        var y0 = h * 0.4, pw = w / 4, ph = (h - y0) / 3;
        for (j = 0; j < 12; j++) if (E.pg[j]) o.push({ x: j % 4 * pw, y: y0 + (j / 4 | 0) * ph, w: pw, h: ph, vx: 0, vy: 0, soon: 1 });
      }
      if (id === "sp-seg" && BO.fs === S_TELE) {
        o.push({ x: 0, y: h * 0.3, w: E.segX - E.segW / 2, h: h * 0.7, vx: 0, vy: 0, soon: 1 });
        o.push({ x: E.segX + E.segW / 2, y: h * 0.3, w, h: h * 0.7, vx: 0, vy: 0, soon: 1 });
      }
      if (E.wL > 0) o.push({ x: 0, y: 0, w: E.wL, h, vx: 0, vy: 0 });
      if (E.wR > 0) o.push({ x: w - E.wR, y: 0, w: E.wR, h, vx: 0, vy: 0 });
    }
    function snap() {
      var st2 = {}, at = {}, parts = [], j, a = aim(), ph = {};
      for (j = 0; j < SN.length; j++) st2[SN[j]] = BO.stC[j];
      for (j = 0; j < NATK2; j++) if (ATK2[j][2] === E.ty) at[ATK2[j][0]] = E.atC[j];
      for (j = 0; j < 6; j++) parts.push({ name: PN[E.ty][j], hp: +P2[j].hp.toFixed(2), max: P2[j].max, alive: P2[j].alive, shot: P2[j].shot, auto: P2[j].auto, x: P2[j].bx, y: P2[j].by, w: P2[j].hw * E.u * 2, h: P2[j].hh * E.u * 2 });
      for (j = 1; j <= NPH; j++) ph[j] = +E.phT[j].toFixed(1);
      return {
        v2: 1,
        parts,
        aim: a.x,
        aimK: a.k,
        atk: E.a >= 0 ? ATK2[E.a][0] : "",
        stats: { st: st2, at },
        phaseAt: ph,
        killed: E.killed,
        shotN: E.shotN,
        autoN: E.autoN,
        graze: E.graze,
        bombs: E.bombs,
        bombV: E.bombV,
        lock: E.a >= 0 && ATK2[E.a][0] === "rc-lock" && BO.fs === S_ATK && E.lockHp > 0,
        lockX: E.lx[1],
        lockY: (E.ly[0] + E.ly[1]) / 2,
        parry: E.a >= 0 && ATK2[E.a][0] === "sp-core" && BO.fs === S_TELE,
        lane: E.gx,
        laneW: E.gw,
        sub: E.sub,
        mtx: E.mtx,
        zones: E.zN,
        wL: E.wL,
        wR: E.wR,
        hell: E.hell,
        u: E.u,
        x: E.x,
        y: E.y
      };
    }
    function rect(R) {
      var j, p2, u = E.u, any = false;
      for (j = 0; j < 6; j++) {
        p2 = P2[j];
        if (!p2.alive) continue;
        if (!any) {
          R[0] = p2.bx - p2.hw * u;
          R[1] = p2.by - p2.hh * u;
          R[2] = p2.bx + p2.hw * u;
          R[3] = p2.by + p2.hh * u;
          any = true;
        } else {
          R[0] = Math.min(R[0], p2.bx - p2.hw * u);
          R[1] = Math.min(R[1], p2.by - p2.hh * u);
          R[2] = Math.max(R[2], p2.bx + p2.hw * u);
          R[3] = Math.max(R[3], p2.by + p2.hh * u);
        }
      }
      return any;
    }
    function graze() {
      if (BO.on && BO.st === 2) E.graze++;
    }
    function testPhase(ph) {
      var j, n = Math.min(5, ph - 1);
      for (j = 5; j >= 1 && E.killed < n; j--) if (P2[j].alive && !(E.ty === 2 && j < 2)) partDie(j, false);
      BO.phase = ph;
      BO.vp = ph;
      E.armT = 1;
      BO.hp = 0;
      for (j = 0; j < 6; j++) if (P2[j].alive) BO.hp += P2[j].hp;
      if (ph === 6) shedAll();
    }
    function clear() {
      ART = null;
      E.snap = null;
    }
    function snapAtk() {
      return E.a >= 0 && (BO.fs === S_TELE || BO.fs === S_ATK) ? ATK2[E.a][0] : "";
    }
    function phaseFor(hp) {
      var j, ph = 1;
      for (j = 0; j < THR2.length; j++) if (hp <= THR2[j]) ph = j + 2;
      return ph;
    }
    function drawFx() {
      return DT[0].life > 0 || DT[1].life > 0 || DT[2].life > 0 || DT[3].life > 0 || DT[4].life > 0 || DT[5].life > 0;
    }
    return {
      start,
      update,
      shot,
      lockShot,
      bomb,
      prTick,
      drawBoss,
      drawTele,
      drawAtk,
      hudLabel,
      snapAtk,
      beam,
      pctHit,
      forceStag,
      phaseFor,
      hazards,
      snap,
      rect,
      graze,
      testPhase,
      clear,
      ensure,
      aim,
      parts: P2,
      E,
      Z,
      drawFx,
      kill,
      partDie
    };
  }

  // src/silnik/stale.js
  var KEYP = "dancycloud.rekord.";
  var FLASH = 0.22;

  // src/silnik/util.js
  function clamp2(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  function rnd2(a, b) {
    return a + Math.random() * (b - a);
  }
  function load(k) {
    try {
      return Math.max(0, parseInt(G.localStorage.getItem(k), 10) || 0);
    } catch (e) {
      return 0;
    }
  }
  function save(k, v) {
    try {
      G.localStorage.setItem(k, String(v));
    } catch (e) {
    }
  }
  function waveName(n) {
    return "fala " + n + ": " + FALE[Math.min(n, FALE.length) - 1];
  }

  // src/silnik/gra.js
  var cssEl = null;
  var cssRef = 0;
  var BOMB_BUL = 40;
  function mount(el, opts) {
    if (!el || !el.appendChild) throw new Error("DancyCloud.mount: podaj element");
    opts = opts || {};
    var doc = el.ownerDocument || document, win = doc.defaultView || G;
    if (!cssRef++) {
      cssEl = doc.createElement("style");
      cssEl.textContent = CSS;
      doc.head.appendChild(cssEl);
    }
    var root2 = doc.createElement("div");
    root2.className = "dcg";
    root2.tabIndex = -1;
    root2.innerHTML = HTML;
    el.appendChild(root2);
    function q(s) {
      return root2.querySelector(s);
    }
    function mk(w, h) {
      var c = doc.createElement("canvas");
      c.width = Math.max(1, Math.ceil(w));
      c.height = Math.max(1, Math.ceil(h));
      return c;
    }
    var cv = q(".dcg-cv"), ctx = cv.getContext("2d", { alpha: false });
    var ovMerge = q(".dcg-merge"), ovPick = q(".dcg-pick"), ovOver = q(".dcg-over");
    var bPause = q(".dcg-pz"), bBomb = q(".dcg-bb"), bBombT = bBomb.querySelector("span"), live = q(".dcg-sr");
    var mq = win.matchMedia ? win.matchMedia("(prefers-reduced-motion: reduce)") : null;
    var reduced = !!(mq && mq.matches);
    var touch = !!(win.matchMedia && win.matchMedia("(pointer: coarse)").matches);
    var mem = { unik: 0, ogien: 0 };
    var qs = null;
    try {
      qs = new win.URLSearchParams(win.location.search);
    } catch (e) {
      qs = null;
    }
    var testTier = opts.boss != null ? (+opts.boss || 0) - 1 : qs && qs.get("boss") ? (+qs.get("boss") || 0) - 1 : -1;
    var god = !!(opts.god || qs && qs.get("god") === "1"), testUps = String(opts.ups || qs && qs.get("ups") || "");
    var testElite = !!(opts.elite || qs && qs.get("elite") === "1"), unlockOpt = !!(opts.unlock || qs && qs.get("unlock") === "1"), silh = !!(qs && qs.get("sil") === "1"), silx = !!(qs && qs.get("sil") === "2");
    var testHp = +(opts.bhp || qs && qs.get("bhp") || 0);
    var testAtk = String(opts.atak || qs && qs.get("atak") || "");
    var testPh = Math.max(0, Math.min(6, +(opts.faza || qs && qs.get("faza") || 0) | 0)), testStill = !!(opts.stoj || qs && qs.get("stoj") === "1");
    var tempo = Math.max(1, Math.min(8, +(opts.tempo || qs && qs.get("tempo") || 1) | 0));
    var testWave = Math.max(1, +(opts.wave || qs && qs.get("fala") || 1) || 1), noBoss = !!(opts.noBoss || qs && qs.get("bossy") === "0");
    var startScr = String(opts.screen || qs && qs.get("ekran") || "title"), clearT = 0;
    var W = 0, H = 0, dpr = 0, F = 0, s0 = 1, bs = 1, cw = 8, lh = 18, pad = 5;
    var elSpr = [], spr = [], atlas = null, gIdx = {}, cellW = 10, eligible = [], eligN = 0, shipG = [], pj = [], ic = {};
    var city = null, cityP = 1, cityH = 0, cityOff = 0, clouds = [];
    var state = "start", mode2 = "unik", snd = false, dead = false, raf = 0, last = 0;
    var set = loadSettings(), au = createAudio(win), gp = createPad(win, function() {
      startLoop();
    }), cnt = createCounters();
    var hurtSrc = "", deathSrc = "", padX = 0, padY = 0, kbNav = false, fxShake = true, fxGlitch = true, fxFlash = true, attract = false, attractOff = 0, menuT = 0, waitKey = "", mobKills = 0, comboMax = 1, fsOn = false;
    snd = set.snd;
    mode2 = "ogien";
    if (opts.mode === "unik" || opts.mode === "ogien") mode2 = opts.mode;
    if (qs && (qs.get("tryb") === "unik" || qs.get("tryb") === "ogien")) mode2 = qs.get("tryb");
    var t = 0, waveT = 0, score = 0, wave = 1, bombs = 1, nextBomb = 1e3, step = 1e3, spawnT = 0, fireT = 0, grace = 0;
    var flash = 0, shake = 0, dieT = 0, overAt = 0, banner = 0, bannerTxt = "", bannerW = 0, shx = 0, shy = 0;
    var ship = { x: 0, y: 0, vx: 0, vy: 0 }, tilt = 0, shipShake = 0, invul = 0, slowT = 0;
    var keys = { l: 0, r: 0, u: 0, d: 0, f: 0 };
    var mFire = 0, padFire = 0, MOUSE_K = 1;
    var drag = { on: false, id: -1, px: 0, py: 0, sx: 0, sy: 0, tx: 0, ty: 0 };
    var hudScore = -1, hudTxt = "", hudWave = "", hudB = "", hudG = "", hudR = "", hudBomb = -1, hudGraze = -1, hudRec = -1;
    var up = { fire: 0, dbl: 0, shield: 0, graze: 0, slow: 0, power: 0, agile: 0, cache: 0, pierce: 0, shrap: 0 };
    var shopMem = { v: null }, shop = loadShop(shopMem), P2 = {}, arena = true, armorN = 0, shRegT = 0, dblAcc = 0, bombMax = 3, dmgM = 1, grazeK = 0, shots = 0;
    var KRR = { mob: 0, fale: 0, czas: 0, boss: 0, ocena: 0, inne: 0 }, krT = 0, krBank = 0, krHud = -1, krHudT = "0", krPulse = 0, CH = [], chN = 0;
    for (i = 0; i < SHOP.length; i++) P2[SHOP[i].id] = 0;
    var recNow = 0, shieldOn = false, grazeN = 0, grazeBonus = 25, grazeTxt = "+25 muśnięcie";
    var MO = { m: {}, s: {}, n: 0 }, FXV = {}, SYC = { lancuch: 0, zetony: 0, ostrzal: 0, przelad: 0, bastion: 0, slizg: 0, roj: 0, kernel: 0 };
    var sideAcc = 0, laserT = 0, laserOn = 0, laserTk = 0, laserN = 0, droneT = 0, droneN = 0, rootN = 0, bastionUsed = false, bastionT = 0, comboS = COMBO_S, pierceN = 0;
    var testMods = String(opts.mods || qs && qs.get("mods") || ""), testMlv = Math.max(1, Math.min(3, +(opts.mlv || qs && qs.get("mlv") || 1) | 0));
    var WST = { shots: 0, side: 0, crit: 0, shrap: 0, laser: 0, laserDmg: 0, drone: 0, pierce: 0, reson: 0 };
    var bossTier = 0, tb = -1, tbTier = 0, cp = null, diedBoss = false, earned = [0, 0, 0, 0], pickIds = [], lastBoss = 0;
    var BO = {
      on: false,
      type: 0,
      tier: 0,
      n: 1,
      st: 0,
      en: 0,
      age: 0,
      ph: 0,
      need: 60,
      phase: 1,
      g: 0,
      sub: 0,
      fast: 1,
      hit: 0,
      hp: 100,
      dt: 0,
      lane: 0,
      laneW: 0,
      il: 1.8,
      vp: 1,
      hpG: 100,
      gT: 0,
      blk: 0,
      bt: 2,
      d1: 0,
      d2: 0,
      d3: 0,
      armT: 0,
      cb: 0,
      dr: 0,
      gone: false,
      et: 0,
      sh: 0,
      fs: 0,
      ft: 0,
      fd: 0,
      atk: -1,
      last: -1,
      cnt: 0,
      stC: [],
      atC: [],
      tm: 0,
      k: 0,
      sd: 1,
      a0: 0,
      a1: 0,
      bm: 0,
      bmA: 0,
      bmHW: 0,
      gx: 0,
      gy: 0,
      gw: 0,
      jOn: 0,
      jx: 0,
      jy: 0,
      jy0: 0,
      tx: 0,
      ty: 0,
      wl: 0,
      mtx: -1,
      mtT: 0,
      lockHp: 0,
      lx: [0, 0, 0],
      ly: [0, 0],
      echo: 0,
      echoA: -1,
      echoS: 1,
      fq: [0, 0, 0, 0, 0, 0],
      fqN: 0,
      fT: 0,
      pend: 0,
      panic: 0,
      sag: 0,
      chip: 0,
      hits: 0,
      stg: 0,
      t0: 0,
      vk: 1,
      tk: 1,
      hellT: 0,
      fired: 0,
      sx: 0,
      sy: 0
    };
    var BP = [], RX = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], RK = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], RN = 0, i, AW = [];
    for (i = 0; i < SN.length; i++) BO.stC.push(0);
    for (i = 0; i < ATK.length; i++) {
      BO.atC.push(0);
      AW.push(0);
    }
    var NSK = 10, STK = [], STT = [];
    for (i = 0; i < NSK; i++) {
      STK.push(0);
      STT.push(0);
    }
    var combo = 0, comboT = 0, comboM = 1, bmeter = 0, sudo = set.diff === "sudo", rush = false, rushT = 0, rushN = 0, eliteCd = 0, hitstop = 0, godCd = 0;
    var TRX = [0, 0, 0, 0, 0], TRY = [0, 0, 0, 0, 0], trI = 0, trT = 0, cityB = null, cityW = 0, despP = 0, sil = null, prMax = 0;
    var ELP = { k: 0, t: 0, x: 0, gx: 0, gw: 0 }, gradeLast = 0, ELC = [0, 0, 0, 0];
    var BA = null, BU = 1, haz = null, gN = 1, TBX = 0, TBY = 0, TS = 1, nextBossT = BOSS1_S;
    var GLY = [0, 0.2, 0.4, 0.6, 0.8, 1], GLX = [0, 0, 0, 0, 0], glA = 0, glT = 1;
    var EXP = [], exN = 0, SHD = [], shN = 0, DTP = [];
    var OB = [], obN = 0, PT = [], ptN = 0, BL = [], blN = 0, FL = [], flN = 0, PR = [], prN = 0;
    for (i = 0; i < 48; i++) OB.push({ x: 0, y: 0, w: 0, h: 0, vy: 0, k: 0, hv: false, hp: 1, hit: 0, near: 0, el: 0, vx: 0, ex: 0, rv: 0, fz: 0, y1: 0, at: 0 });
    for (i = 0; i < 900; i++) PT.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, g: 0, r: 0 });
    for (i = 0; i < 96; i++) BL.push({ x: 0, y: 0, vx: 0, dm: 1, ap: 0, pc: 0, sh: 0, lh: null });
    for (i = 0; i < 32; i++) CH.push({ x: 0, y: 0, vy: 0, v: 0, life: 0, pull: 0 });
    for (i = 0; i < 8; i++) FL.push({ x: 0, y: 0, life: 0, txt: "" });
    for (i = 0; i < 320; i++) PR.push({ x: 0, y: 0, vx: 0, vy: 0, r: 6, g: 0, rot: 0, near: 0, t: 0, s: 0, a: 0, hw: 0, hh: 0, hp: 0, life: 0, k: 0, bh: 0, ox: 0, oy: 0, v0: 0, v1: 0, k2: 0 });
    for (i = 0; i < 2; i++) BP.push({ x: 0, y: -200, w: 0, h: 0, u: 1, spin: 0, fc: 0, hp: 100, max: 100, hit: 0, alive: false, ex: false, side: 1, ov: 0, ox: 0, oy: 0, mz: 0, hx: 0, hy: 0 });
    for (i = 0; i < 16; i++) EXP.push({ x: 0, y: 0, r: 0, life: 0, max: 1 });
    for (i = 0; i < 96; i++) SHD.push({ x: 0, y: 0, vx: 0, vy: 0, a: 0, va: 0, s: 0, life: 0, c: C.line });
    for (i = 0; i < 6; i++) DTP.push({ pt: null, x: 0, y: 0, vx: 0, vy: 0, a: 0, va: 0, S: 1, m: 1, life: 0 });
    var FX = { flash: true };
    var moby = createMoby({
      W: function() {
        return W;
      },
      H: function() {
        return H;
      },
      s0: function() {
        return s0;
      },
      dpr: function() {
        return dpr;
      },
      ship,
      playing: function() {
        return state === "play";
      },
      mode: function() {
        return mode2;
      },
      reduced: function() {
        return reduced;
      },
      fx: FX,
      mk,
      hurt: function(c) {
        hurtSrc = "mob";
        mobCause = c || "";
        var d = hurt();
        hurtSrc = "";
        return d;
      },
      graze: function() {
        grazed(false);
      },
      grazeR: function() {
        return (12 + 8 * up.graze + 2 * P2.graze) * s0;
      },
      score: function(p, x, y, ty) {
        var v = p * comboM;
        score += v;
        addCombo();
        mobKills++;
        floater(x, y, comboM > 1 ? "+" + v + " ×" + comboM : "+" + v);
        chip(x, y, KR.mob[ty] || 2);
      },
      bits,
      sfx,
      chip: function(x, y, v) {
        chip(x, y, v);
      },
      msfx: function(ty, d) {
        if (snd) au.mob(ty, d);
      },
      floater: function(x, y, txt) {
        floater(x, y, txt);
      },
      combo: function(n) {
        for (var j = 0; j < n; j++) addCombo();
      },
      magnet: function() {
        return val("magnet", P2.magnet) * s0 * (FXV.magK || 1);
      },
      pickup
    });
    var hurtCause = "";
    var B2 = createBossy2b({
      BO,
      ship,
      C,
      W: function() {
        return W;
      },
      H: function() {
        return H;
      },
      s0: function() {
        return s0;
      },
      dpr: function() {
        return dpr;
      },
      hsc,
      top: function() {
        return bossTop();
      },
      reduced: function() {
        return reduced;
      },
      sudo: function() {
        return sudo;
      },
      mode: function() {
        return mode2;
      },
      playing: function() {
        return state === "play";
      },
      shipV: function() {
        return clamp2(Math.min(W, H) * 0.75, 260, 440);
      },
      fxFlash: function() {
        return fxFlash;
      },
      proj: function(x, y, vx, vy, g, r) {
        return proj(x, y, vx, vy, g, r);
      },
      prN: function() {
        return prN;
      },
      clearPR: function() {
        prN = 0;
      },
      lineAt: function(x, k, vy, y) {
        lineAt(x, k, vy, y);
      },
      rline: function() {
        return eligible[Math.random() * eligN | 0];
      },
      lineW: function(k) {
        return spr[k].w;
      },
      lh: function() {
        return lh;
      },
      speed: function() {
        return speed();
      },
      hurt: function(c) {
        hurtCause = c || "";
        var d = hurt();
        hurtCause = "";
        return d;
      },
      burst: function(x, y, n, v) {
        burst(x, y, n, v);
      },
      shard: function(x, y, sz, col) {
        shard(x, y, sz, col);
      },
      boom: function(x, y, r) {
        boom(x, y, r);
      },
      spark: function(x, y, sh) {
        spark(x, y, sh);
      },
      floater: function(x, y, txt) {
        floater(x, y, txt);
      },
      sfx: function(k) {
        sfx(k);
      },
      part: function(x, y, vx, vy, g, r) {
        part2(x, y, vx, vy, g, r);
      },
      gN: function() {
        return gN;
      },
      shake: function(v) {
        if (!reduced) shake = Math.max(shake, v);
      },
      hitstop: function(v) {
        hitstop = v;
      },
      flash: function() {
        if (!reduced) flash = FLASH;
      },
      mk,
      base: function(c) {
        base(c);
      },
      hband: function(c, y, hw, pr, sd, bl) {
        hband(c, y, hw, pr, sd, bl);
      },
      vband: function(c, x, w, pr, bl, y0) {
        vband(c, x, w, pr, bl, y0);
      },
      lane: function(c, x0, y0, a, hw, pr, bl) {
        lane(c, x0, y0, a, hw, pr, bl);
      },
      gapMark: function(c, x, y, w, col) {
        gapMark(c, x, y, w, col);
      },
      reticle: function(c, x, y, r, col) {
        reticle(c, x, y, r, col);
      },
      label: function(c, t2, x, y, col, px) {
        label(c, t2, x, y, col, px);
      },
      chev: function(c, x, y, sz) {
        chev(c, x, y, sz);
      },
      haz: function() {
        return haz;
      },
      shx: function() {
        return shx;
      },
      shy: function() {
        return shy;
      },
      pj: function(g) {
        return pj[g];
      },
      BA: function() {
        return BA;
      },
      snapshot: function() {
        var c2 = mk(cv.width, cv.height);
        c2.getContext("2d").drawImage(cv, 0, 0);
        return c2;
      },
      shatterLines: function() {
        for (var j = obN - 1; j >= 0; j--) shatter(OB[j]);
        obN = 0;
      },
      clearStack: function() {
        clearStack();
      },
      stackAt: function(c2) {
        return STK[c2];
      },
      stackDrop: function(x, c2, v) {
        var q2 = proj(x, -14, 0, v, 9, 0);
        if (q2) q2.k = c2;
      },
      pull: function(x, y, kk, dt) {
        var px = x - ship.x, py = y - ship.y, d = Math.sqrt(px * px + py * py) || 1, sp = clamp2(Math.min(W, H) * 0.75, 260, 440) * kk * dt;
        px = px / d * sp;
        py = py / d * sp;
        ship.x += px;
        ship.y += py;
        if (drag.on) {
          drag.sx += px;
          drag.sy += py;
          drag.tx += px;
          drag.ty += py;
        }
        clampShip();
      },
      walls: function(wl, wr) {
        var lo = wl + 9 * s0, hi = W - wr - 9 * s0, nx = clamp2(ship.x, lo, Math.max(lo, hi));
        if (nx !== ship.x) {
          if (drag.on) {
            drag.sx += nx - ship.x;
            drag.tx += nx - ship.x;
          }
          ship.x = nx;
          ship.vx = 0;
        }
      },
      banner: function(t2) {
        showBanner(t2);
      },
      live: function(t2) {
        live.textContent = t2;
      },
      name: function() {
        return BN[BO.type];
      },
      tag: function() {
        tag();
      },
      score: function(n) {
        score += n;
      },
      combo: function() {
        addCombo();
      },
      armor: function() {
        return armorMul();
      },
      win: function() {
        bossWin();
      },
      stagK: function() {
        return syn("kernel") ? 1.5 : 1;
      },
      onStag: function() {
        onStag();
      },
      still: function() {
        return testStill;
      },
      forceAtk: function() {
        return testAtk;
      }
    });
    function armorMul() {
      return Math.min(1, val("pierce", P2.pierce) / 100 + 0.12 * (up.pierce || 0) + (FXV.ap || 0));
    }
    function onStag() {
      if (syn("kernel")) {
        slowT = Math.max(slowT, 0) + 1;
        SYC.kernel++;
      }
    }
    var mobCause = "", bossCause = "", fG = 0, fB = 0;
    function pickup(ty, x, y) {
      if (ty === 3) {
        if (bombs < 3) {
          bombs++;
          ui();
        }
        floater(x, y - 10 * s0, "+1 bomba");
        sfx("ok");
        return;
      }
      var pool = [], k, id, u;
      for (k = 0; k < UKEYS.length; k++) {
        id = UKEYS[k];
        u = UPS[id];
        if (u.og && mode2 !== "ogien") continue;
        if (up[id] >= u.max || id === "shield" && (shieldOn || sudo)) continue;
        pool.push(id);
      }
      if (!pool.length) {
        chip(x, y, 10);
        return;
      }
      id = pool[Math.random() * pool.length | 0];
      applyUp(id);
      floater(x, y - 10 * s0, "klucz: " + UPS[id].n.toLowerCase());
      sfx("win");
      ui();
    }
    function bits(x, y, n) {
      var g0 = gIdx["0"], g1 = gIdx["1"], j, a, v;
      for (j = 0; j < n; j++) {
        a = Math.random() * 6.283;
        v = rnd2(80, 260);
        part2(x, y, Math.cos(a) * v, Math.sin(a) * v - 60, j & 1 ? g1 != null ? g1 : 0 : g0 != null ? g0 : 0, j % 3 === 0 ? 1 : 0);
      }
    }
    function font(b, px) {
      return (b ? "700 " : "400 ") + (px || F) + "px " + MONO;
    }
    function ls(c, v) {
      if ("letterSpacing" in c) c.letterSpacing = v + "px";
    }
    function go(s) {
      state = s;
      root2.setAttribute("data-st", s);
    }
    function tag() {
      root2.setAttribute("data-boss", BO.on ? BN[BO.type] : "");
      root2.setAttribute("data-bhp", BO.on ? String(Math.ceil(BO.hp)) : "");
      root2.setAttribute("data-bst", BO.on ? SN[BO.fs] : "");
      root2.setAttribute("data-atk", BO.on && (BO.fs === S_TELE || BO.fs === S_ATK) ? BO.v2 ? B2 && B2.E.a >= 0 ? B2.snapAtk() : "" : BO.atk >= 0 ? ATK[BO.atk][0] : "" : "");
      root2.setAttribute("data-phase", BO.on ? String(BO.phase) : "");
    }
    function lineSprite(s, w, h, heavy, gh) {
      var c = mk(w * dpr, h * dpr), x = c.getContext("2d");
      x.scale(dpr, dpr);
      x.fillStyle = heavy ? C.solid : C.ink;
      if (!gh) x.fillRect(0, 0, w, h);
      if (!heavy && !gh) {
        x.strokeStyle = C.line;
        x.lineWidth = 1;
        x.strokeRect(0.5, 0.5, w - 1, h - 1);
        x.fillStyle = C.acc;
        x.fillRect(0, 0, 2, h);
      }
      x.font = font(heavy);
      x.fillStyle = gh ? C.muted : C.bone;
      x.textBaseline = "middle";
      x.fillText(s, pad, h / 2 + 0.5);
      return c;
    }
    function pjSprite(kind, s) {
      var m = mk(4, 4).getContext("2d"), w, h, fs = F + 6, o = { c: null, i: null, w: 0, h: 0 }, v;
      if (kind === 0) {
        m.font = font(true, fs + (s === "*" ? 5 : 0));
        w = Math.ceil(m.measureText(s).width) + 10;
        h = lh + 6;
      } else if (kind === 2) {
        m.font = font(true, F);
        w = Math.ceil(Math.max(m.measureText(s).width + 14, cellW * 5));
        h = lh + 2;
      } else if (kind === 1) {
        w = 22;
        h = 14;
      } else if (kind === 3) {
        w = h = 64;
      } else if (kind === 4) {
        w = h = 16;
      } else if (kind === 5) {
        w = 34;
        h = 12;
      } else {
        w = h = 14;
      }
      o.w = w;
      o.h = h;
      for (v = 0; v < 2; v++) {
        var c = mk(w * dpr, h * dpr), x = c.getContext("2d"), fi = v ? C.ink : C.bone, ol = v ? C.hot : C.ink, ac = v ? C.bone : C.hot;
        x.scale(dpr, dpr);
        x.lineJoin = "miter";
        if (kind === 0) {
          x.font = font(true, fs + (s === "*" ? 5 : 0));
          x.textAlign = "center";
          x.textBaseline = "middle";
          x.lineWidth = 4;
          x.strokeStyle = ol;
          x.strokeText(s, w / 2, h / 2 + 0.5);
          x.fillStyle = fi;
          x.fillText(s, w / 2, h / 2 + 0.5);
        } else if (kind === 1) {
          pf(x, [2, 3, 12, 3, 20, 7, 12, 11, 2, 11, 6, 7], fi, ol, 2);
          x.fillStyle = ac;
          x.fillRect(12, 6, 5, 2);
        } else if (kind === 2) {
          x.fillStyle = ol;
          x.fillRect(0, 0, w, h);
          x.fillStyle = fi;
          x.fillRect(2, 2, w - 4, h - 4);
          x.fillStyle = ac;
          x.fillRect(2, 2, 3, h - 4);
          x.font = font(true, F);
          x.textAlign = "center";
          x.textBaseline = "middle";
          x.fillStyle = ol;
          x.fillText(s, w / 2 + 2, h / 2 + 0.5);
        } else if (kind === 3) {
          x.translate(32, 32);
          x.fillStyle = ol;
          octPath(x, 0, 0, 31, 10);
          x.fill();
          x.fillStyle = ac;
          octPath(x, 0, 0, 28.5, 9);
          x.fill();
          x.fillStyle = fi;
          octPath(x, 0, 0, 22, 7);
          x.fill();
          x.fillStyle = ac;
          octPath(x, -4, -4, 9, 3);
          x.fill();
          x.fillStyle = fi;
          x.fillRect(-10, -10, 5, 5);
        } else if (kind === 4) {
          x.fillStyle = ol;
          x.fillRect(0, 0, 16, 16);
          x.fillStyle = fi;
          x.fillRect(2, 2, 12, 12);
          x.fillStyle = ac;
          x.fillRect(5, 5, 6, 6);
        } else if (kind === 5) {
          x.fillStyle = ol;
          x.fillRect(0, 0, 34, 12);
          x.fillStyle = ac;
          x.fillRect(2, 2, 30, 8);
          x.fillStyle = fi;
          x.fillRect(2, 2, 30, 3);
        } else {
          x.translate(7, 7);
          x.fillStyle = ol;
          octPath(x, 0, 0, 7, 2.4);
          x.fill();
          x.fillStyle = fi;
          octPath(x, 0, 0, 5, 1.7);
          x.fill();
          x.fillStyle = ac;
          x.fillRect(-1.5, -1.5, 3, 3);
        }
        if (v) o.i = c;
        else o.c = c;
      }
      return o;
    }
    function octPath(x, cx, cy, r, k) {
      x.beginPath();
      x.moveTo(cx - r + k, cy - r);
      x.lineTo(cx + r - k, cy - r);
      x.lineTo(cx + r, cy - r + k);
      x.lineTo(cx + r, cy + r - k);
      x.lineTo(cx + r - k, cy + r);
      x.lineTo(cx - r + k, cy + r);
      x.lineTo(cx - r, cy + r - k);
      x.lineTo(cx - r, cy - r + k);
      x.closePath();
    }
    function eliteSprite(s) {
      var m = mk(4, 4).getContext("2d"), w, c, x;
      m.font = font(true);
      w = Math.ceil(m.measureText(s).width + pad * 2 + 4);
      c = mk(w * dpr, lh * dpr);
      x = c.getContext("2d");
      x.scale(dpr, dpr);
      x.fillStyle = C.bone;
      x.fillRect(0, 0, w, lh);
      x.fillStyle = C.deep;
      x.fillRect(2, 2, w - 4, lh - 4);
      x.fillStyle = C.hot;
      x.fillRect(2, 2, 3, lh - 4);
      x.font = font(true);
      x.fillStyle = C.bone;
      x.textBaseline = "middle";
      x.fillText(s, pad + 3, lh / 2 + 0.5);
      return { c, w, h: lh };
    }
    function glyphSprite(s) {
      var m = mk(4, 4).getContext("2d"), w;
      m.font = font(true, F + 2);
      w = Math.ceil(m.measureText(s).width) + 4;
      var c = mk(w * dpr, lh * dpr), x = c.getContext("2d");
      x.scale(dpr, dpr);
      x.font = font(true, F + 2);
      x.fillStyle = C.hot;
      x.textBaseline = "middle";
      x.textAlign = "center";
      x.fillText(s, w / 2, lh / 2 + 0.5);
      return { c, w, h: lh };
    }
    function bossU(ty) {
      return Math.min(FWB[ty] * W / DIM[ty][0], FHB[ty] * H / DIM[ty][1]);
    }
    function prtC(w, h, ax, ay, fn, P3, a1) {
      var k = BU * dpr, c = mk(w * k, h * k), x = c.getContext("2d");
      x.setTransform(k, 0, 0, k, ax * k, ay * k);
      x.lineJoin = "miter";
      fn(x, P3, a1);
      return c;
    }
    function prt(w, h, ax, ay, fn, a1, nf) {
      var n = prtC(w, h, ax, ay, fn, PAL, a1);
      return { n, f: nf ? n : prtC(w, h, ax, ay, fn, PALF, a1), w, h, ax, ay };
    }
    function crk(poly2, n, sd, m) {
      return function(x, P3) {
        if (m) x.scale(m, 1);
        cracks(x, P3, poly2, n, sd);
      };
    }
    function buildCard(ty) {
      var ch = Math.round(clamp2(W * 0.13, 92, 132)), c = mk(W * dpr, ch * dpr), x = c.getContext("2d"), fs = Math.round(clamp2(W * 0.062, 22, 58));
      x.scale(dpr, dpr);
      x.globalAlpha = 0.9;
      x.fillStyle = C.ink;
      x.fillRect(0, 10, W, ch - 20);
      x.globalAlpha = 1;
      x.fillStyle = haz;
      x.fillRect(0, 0, W, 9);
      x.fillRect(0, ch - 9, W, 9);
      x.fillStyle = C.solid;
      x.fillRect(0, 9, W, 2);
      x.fillRect(0, ch - 11, W, 2);
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.font = "500 12px " + MONO;
      ls(x, 4);
      x.fillStyle = C.hot;
      x.fillText("UWAGA · BOSS " + (ty + 1) + "/4", W / 2 + 2, 26);
      x.font = "700 " + fs + "px " + MONO;
      ls(x, fs * 0.22);
      x.fillStyle = C.bone;
      x.fillText(BNU[ty], W / 2 + fs * 0.11, ch / 2 + 4);
      x.font = "400 11px " + MONO;
      ls(x, 1);
      x.fillStyle = C.muted;
      x.fillText(TAG[ty], W / 2, ch - 22);
      ls(x, 0);
      x.fillStyle = C.solid;
      x.fillRect(W / 2 - fs * 4, ch / 2 + fs * 0.62, fs * 8, 2);
      return c;
    }
    function ensureArt(ty) {
      if (!W || !atlas || ty < 0) return;
      var key2 = ty + ":" + W + ":" + H + ":" + dpr + ":" + F, A, j, i3, k, X, Y, e, ids, ac, dx, dy;
      if (BA && BA.key === key2) return;
      BU = bossU(ty) * (ty === 1 ? 1.15 : 1);
      A = { key: key2, ty, h: null, h2: null, k1: null, k2: null, p1: null, p2: null, p3: null, card: buildCard(ty) };
      if (ty === 0) {
        A.h = prt(208, 136, 104, 68, artNP);
        A.k1 = prt(208, 136, 104, 68, crk(NP_HULL, 4, 1), 0, 1);
        A.k2 = prt(208, 136, 104, 68, crk(NP_HULL, 5, 4), 0, 1);
        A.p1 = prt(62, 56, 2, 28, artFin);
        A.p2 = prt(82, 28, 2, 14, artArm);
        A.p3 = prt(46, 28, 23, 14, artNull);
      } else if (ty === 1) {
        A.p1 = prt(70, 148, 26, 74, artClamp);
        A.p2 = prt(88, 20, 44, 10, artHeap);
        A.cx = [];
        A.cy = [];
        A.cv = [];
        A.e = [];
        A.cs = [];
        for (j = 0; j < 11; j++) for (i3 = 0; i3 < 16; i3++) {
          X = (i3 - 7.5) * 17 + (j & 1) * 7 - 3.5;
          Y = (j - 5) * 17;
          e = 0;
          for (k = 0; k < ML_BLOB.length; k += 4) {
            dx = (X - ML_BLOB[k]) / ML_BLOB[k + 2];
            dy = (Y - ML_BLOB[k + 1]) / ML_BLOB[k + 3];
            e = Math.max(e, 1 - dx * dx - dy * dy);
          }
          if (e <= 0 || Math.abs(X) < 21 && Math.abs(Y) < 19) continue;
          A.cx.push(X + ((i3 * 7 + j * 3) % 5 - 2) * 1.4 + (i3 % 3 === 1 ? 2 : 0));
          A.cy.push(Y + ((i3 * 3 + j * 5) % 5 - 2) * 1.3 + i3 * 11 % 4 * 0.8);
          A.cv.push((i3 * 5 + j * 3) % 4);
          A.cs.push(e < 0.25 ? 0.82 + (i3 + j) % 3 * 0.09 : 1.04 + (i3 * 3 + j) % 3 * 0.07);
          A.e.push(1 - e + (i3 * 13 + j * 7) % 5 * 0.03);
        }
        A.n = A.cx.length;
        ids = [];
        for (j = 0; j < A.n; j++) ids.push(j);
        A.fo = ids.slice().sort(function(a, b) {
          return A.cy[b] - A.cy[a] || Math.abs(A.cx[a]) - Math.abs(A.cx[b]);
        });
        ac = ids.slice().sort(function(a, b) {
          return A.e[b] - A.e[a];
        });
        A.br = [];
        for (j = 0; j < A.n; j++) A.br[ac[j]] = j;
        A.cp = Math.ceil(16 * BU * dpr);
        A.at = mk(A.cp * 7, A.cp);
        e = A.at.getContext("2d");
        for (j = 0; j < 7; j++) {
          e.setTransform(BU * dpr, 0, 0, BU * dpr, A.cp * j + A.cp / 2, A.cp / 2);
          artCell(e, PAL, j);
        }
      } else if (ty === 2) {
        A.h = prt(184, 166, 92, 83, artRC, 1);
        A.h2 = prt(184, 166, 92, 83, artRC, -1);
        A.k1 = prt(184, 166, 92, 83, crk(RC_HULL, 4, 2), 0, 1);
        A.k2 = prt(184, 166, 92, 83, crk(RC_HULL2, 4, 7, -1), 0, 1);
        A.p1 = prt(50, 32, 2, 16, artClaw);
        A.l0 = prtC(20, 20, 10, 10, artLink, PAL, C.solid);
        A.l2 = prtC(20, 20, 10, 10, artLink, PAL, C.plate);
        A.l1 = prtC(20, 20, 10, 10, artLink, PAL, C.bone);
      } else {
        A.h = prt(304, 192, 152, 84, artSP);
        A.k1 = prt(304, 192, 152, 84, crk(SP_T2, 3, 1), 0, 1);
        A.k2 = prt(304, 192, 152, 84, crk(SP_T1, 4, 3), 0, 1);
        A.p1 = prt(116, 52, 58, 48, artCrown);
        A.p2 = prt(212, 212, 106, 106, artRing);
        A.p3 = prt(86, 40, 2, 20, artSPArm);
      }
      BA = A;
    }
    function buildSprites() {
      var m = mk(4, 4).getContext("2d"), chars = "", k, j, s, ch, tw, w, gl;
      m.font = font(false);
      cw = m.measureText("M").width;
      lh = Math.round(F * 1.6);
      pad = Math.round(F * 0.55);
      gIdx = {};
      spr = [];
      for (k = 0; k < KOD.length; k++) {
        s = KOD[k];
        gl = [];
        m.font = font(false);
        tw = m.measureText(s).width;
        m.font = font(true);
        tw = Math.max(tw, m.measureText(s).width);
        w = Math.ceil(tw + pad * 2);
        for (j = 0; j < s.length; j++) {
          ch = s.charAt(j);
          if (ch === " ") {
            gl.push(-1);
            continue;
          }
          if (!(ch in gIdx)) {
            gIdx[ch] = chars.length;
            chars += ch;
          }
          gl.push(gIdx[ch]);
        }
        spr.push({ w, h: lh, n: lineSprite(s, w, lh, false), b: lineSprite(s, w, lh, true), t: lineSprite(s, w, lh, false, true), g: gl, cw: tw / s.length });
      }
      cellW = Math.ceil(cw) + 2;
      atlas = mk(chars.length * cellW * dpr, lh * 2 * dpr);
      var a = atlas.getContext("2d");
      a.scale(dpr, dpr);
      a.textBaseline = "middle";
      a.textAlign = "center";
      for (j = 0; j < chars.length; j++) {
        a.font = font(false);
        a.fillStyle = C.bone;
        a.fillText(chars.charAt(j), j * cellW + cellW / 2, lh / 2);
        a.font = font(true);
        a.fillStyle = C.hot;
        a.fillText(chars.charAt(j), j * cellW + cellW / 2, lh * 1.5);
      }
      shipG = [];
      s = "*/=-()<>";
      for (j = 0; j < s.length; j++) if (s.charAt(j) in gIdx) shipG.push(gIdx[s.charAt(j)]);
      for (k = 0; k < obN; k++) if (OB[k].k >= 0) {
        OB[k].w = spr[OB[k].k].w;
        OB[k].h = lh;
      }
      pj = [
        pjSprite(0, "->"),
        pjSprite(0, "=="),
        pjSprite(0, "*"),
        pjSprite(1),
        pjSprite(2, "0x00"),
        pjSprite(3),
        pjSprite(4),
        pjSprite(5),
        pjSprite(6),
        pjSprite(2, "frame"),
        pjSprite(2, "free()")
      ];
      elSpr = [eliteSprite("<<<<<<< merge conflict"), eliteSprite(">>>>>>> merge conflict"), eliteSprite("while(true)"), eliteSprite("// FIXME")];
      gN = Math.max(1, chars.length);
      var hz = mk(14, 14), hx = hz.getContext("2d");
      hx.fillStyle = C.solid;
      hx.beginPath();
      hx.moveTo(0, 14);
      hx.lineTo(7, 0);
      hx.lineTo(12, 0);
      hx.lineTo(5, 14);
      hx.closePath();
      hx.fill();
      hx.beginPath();
      hx.moveTo(12, 14);
      hx.lineTo(14, 10);
      hx.lineTo(14, 14);
      hx.closePath();
      hx.fill();
      hx.beginPath();
      hx.moveTo(0, 4);
      hx.lineTo(2, 0);
      hx.lineTo(0, 0);
      hx.closePath();
      hx.fill();
      haz = ctx.createPattern(hz, "repeat");
      ic = {
        bomb: iconCanvas("bomb", 16, C.label),
        shield: iconCanvas("shield", 16, C.label),
        auto: iconCanvas("auto", 16, C.label),
        graze: iconCanvas("graze", 16, C.label),
        record: iconCanvas("record", 16, C.label),
        sound: iconCanvas("sound", 14, C.muted),
        mute: iconCanvas("mute", 14, C.muted),
        boss: iconCanvas("boss", 16, C.label),
        bb: [iconCanvas("b1", 22, C.label, 1), iconCanvas("b2", 22, C.label, 1), iconCanvas("b3", 22, C.label, 1), iconCanvas("b4", 22, C.label, 1)]
      };
      ic.krY = iconCanvas("kr", 14, C.ally);
      ic.bombY = iconCanvas("bomb", 18, C.ally);
      ic.bombE = iconCanvas("bomb", 18, C.line);
      ic.shieldY = iconCanvas("shield", 20, C.ally);
      ic.u = {};
      for (k = 0; k < UKEYS.length; k++) ic.u[UKEYS[k]] = iconCanvas(UPS[UKEYS[k]].i, 20, C.ally);
      paintIcons(root2);
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
      o.w = rnd2(0.15, 0.45) * W * (far ? 0.8 : 1.15);
      o.h = Math.round(far ? rnd2(3, 7) : rnd2(6, 14));
      o.x = rnd2(-o.w * 0.3, W - o.w * 0.7);
      o.y = y;
      o.o = Math.round(rnd2(-30, 30));
      o.sw = rnd2(0.2, 0.6);
      return o;
    }
    function buildBg() {
      var P3 = Math.max(320, Math.round(W)), x = 0, bw, bh, wx, wy, k, n;
      cityH = Math.round(clamp2(H * 0.2, 60, 150));
      city = mk(P3 * dpr, cityH * dpr);
      cityB = mk(P3 * dpr, cityH * dpr);
      var c = city.getContext("2d"), cb = cityB.getContext("2d");
      c.scale(dpr, dpr);
      cb.scale(dpr, dpr);
      while (x < P3) {
        bw = Math.round(rnd2(18, 56));
        if (x + bw > P3 - 16) bw = P3 - x;
        bh = Math.round(rnd2(0.3, 1) * (cityH - 10));
        c.fillStyle = cb.fillStyle = C.city;
        c.fillRect(x, cityH - bh, bw, bh);
        cb.fillRect(x, cityH - bh, bw, bh);
        if (bw > 22 && Math.random() < 0.22) {
          c.fillRect(x + (bw >> 1) - 1, cityH - bh - 9, 2, 9);
          cb.fillRect(x + (bw >> 1) - 1, cityH - bh - 9, 2, 9);
        }
        cb.fillStyle = C.deep;
        cb.fillRect(x, cityH - bh, bw, 2);
        for (wy = cityH - bh + 6; wy < cityH - 5; wy += 7)
          for (wx = x + 4; wx < x + bw - 5; wx += 6) {
            k = Math.random();
            if (k < 0.06) {
              c.fillStyle = k < 0.02 ? C.muted : C.solid;
              c.fillRect(wx, wy, 2, 3);
            }
            if (k < 0.2) {
              cb.fillStyle = k < 0.07 ? C.hot : C.solid;
              cb.fillRect(wx, wy, 2, 3);
            }
          }
        x += bw + (Math.random() < 0.3 ? Math.round(rnd2(2, 8)) : 0);
      }
      cityP = P3;
      cityOff = 0;
      clouds = [];
      n = Math.round(clamp2(W / 160, 4, 9));
      for (k = 0; k < n * 3; k++) {
        clouds.push(cloud({ gl: k >= n * 2 }, k % 2 === 0, rnd2(-20, H)));
      }
    }
    function resize() {
      if (dead) return;
      var w = root2.clientWidth, h = root2.clientHeight, d = Math.min(2, win.devicePixelRatio || 1), nf;
      if (!w || !h || w === W && h === H && d === dpr) return;
      var fx = W ? w / W : 1, fy = H ? h / H : 1;
      W = w;
      H = h;
      cv.width = Math.round(W * d);
      cv.height = Math.round(H * d);
      nf = W < 520 ? 11 : W < 900 ? 12 : 13;
      s0 = clamp2(Math.min(W, H) / 520, 0.85, 1.3);
      bs = clamp2(Math.min(W / 640, H / 560), 0.58, 1.2);
      if (d !== dpr || nf !== F || !atlas) {
        dpr = d;
        F = nf;
        buildSprites();
      }
      elig();
      buildBg();
      moby.build();
      shipView();
      if (BA) ensureArt(BA.ty);
      if (silh || silx) sil = mk(W * d, H * d);
      if (state === "start") {
        ship.x = W / 2;
        ship.y = H * 0.78;
      } else {
        ship.x *= fx;
        ship.y *= fy;
        clampShip();
      }
      if (!raf) draw();
    }
    function audio() {
      if (snd && !dead) {
        au.volume(set.music / 100, set.sfx / 100);
        au.setOn(true);
      }
    }
    function sfx(k) {
      if (snd) au.sfx(k);
    }
    function part2(x, y, vx, vy, g, r) {
      if (ptN >= PT.length) return;
      var p = PT[ptN++];
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.g = g;
      p.r = r;
      p.life = p.max = rnd2(0.55, 0.95);
    }
    function shatter(o) {
      if (o.k < 0) {
        burst(o.x + o.w / 2, o.y + o.h / 2, 16, 200);
        return;
      }
      var sp = spr[o.k], gl = sp.g, n = gl.length, j;
      for (j = 0; j < n; j++) {
        if (gl[j] < 0) continue;
        part2(o.x + pad + j * sp.cw, o.y, rnd2(-90, 90) + (j - n / 2) * 4, o.vy * 0.4 + rnd2(-150, 30), gl[j], o.hv ? 1 : 0);
      }
    }
    function floater(x, y, txt) {
      if (flN >= FL.length) return;
      var f = FL[flN++];
      f.x = x;
      f.y = y;
      f.txt = txt;
      f.life = 0.9;
    }
    function removeOb(k) {
      var o = OB[k];
      OB[k] = OB[obN - 1];
      OB[obN - 1] = o;
      obN--;
    }
    function chip(x, y, v) {
      if (chN >= CH.length || v <= 0 || state !== "play") return;
      var c = CH[chN++];
      c.x = x;
      c.y = y;
      c.vy = -70 * s0;
      c.v = v;
      c.life = CHIP_S;
      c.pull = 0;
    }
    function chipTick(dt) {
      var R = val("magnet", P2.magnet) * s0 * FXV.magK, k, c, dx, dy, d, v;
      for (k = chN - 1; k >= 0; k--) {
        c = CH[k];
        c.life -= dt;
        dx = ship.x - c.x;
        dy = ship.y - c.y;
        d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (state === "play" && (c.pull || d < R)) {
          c.pull = 1;
          v = Math.min(d, Math.max(320 * s0, d * 10) * dt);
          c.x += dx / d * v;
          c.y += dy / d * v;
          d -= v;
        } else {
          c.vy = Math.min(c.vy + 200 * s0 * dt, 95 * s0);
          c.y += c.vy * dt;
        }
        if (state === "play" && d < 12 * s0) {
          KRR.mob += c.v;
          krPulse = 0.25;
          sfx("kr");
          if (syn("zetony")) {
            charge(0.04);
            SYC.zetony++;
          }
        } else if (c.life > 0 && c.y < H + 12) continue;
        CH[k] = CH[chN - 1];
        CH[chN - 1] = c;
        chN--;
      }
    }
    function krRun() {
      return KRR.mob + KRR.fale + KRR.czas + KRR.boss + KRR.ocena + KRR.inne;
    }
    var krDone = false;
    function bank(end) {
      if (krDone) return 0;
      var n = god ? 0 : krRun() - krBank;
      if (n > 0) {
        shop.kr += n;
        shop.earned += n;
        krBank += n;
      }
      if (end) {
        krDone = true;
        if (!god) shop.rounds++;
      }
      saveShop(shop, shopMem);
      return n;
    }
    function applyPerm() {
      for (var k = 0; k < SHOP.length; k++) P2[SHOP[k].id] = arena ? 0 : shop.lv[SHOP[k].id] || 0;
      dmgM = 1 + val("dmg", P2.dmg) / 100;
      bombMax = P2.sbomb >= 3 ? 4 : 3;
      if (testMods) {
        MO = { m: {}, s: {}, n: 0 };
        var tm = { kr: 0, mods: {}, slots: [] };
        testMods.split(",").forEach(function(id) {
          if (MODI[id]) {
            tm.mods[id] = testMlv;
            tm.slots.push(id);
          }
        });
        tm.slots.length = Math.min(3, tm.slots.length);
        MO = loadout(tm, true);
      } else MO = loadout(shop, !arena);
      fxCalc();
      dblAcc = 0;
      shRegT = 0;
      grazeK = 0;
      chN = 0;
      shots = 0;
      krBank = 0;
      krDone = false;
      KRR.mob = KRR.fale = KRR.czas = KRR.boss = KRR.ocena = KRR.inne = 0;
      krT = 0;
      visLv();
    }
    function mv(id) {
      return MO.m[id] ? mval(id, MO.m[id]) : 0;
    }
    function syn(id) {
      return !!MO.s[id];
    }
    function fxCalc() {
      var o = FXV, l = val("laser", P2.laser), lm = mv("ladunek"), sh = P2.shield ? val("shield", P2.shield) : 0, e = mv("ekran"), k;
      o.magK = 1 + mv("magnes") / 100;
      o.comboS = COMBO_S + mv("bufor");
      o.fireK = 1 + mv("chlod") / 100;
      o.kondK = 1 + mv("kond") / 100;
      o.shrapM = mv("odlamki") / 100;
      o.shrapN = syn("lancuch") ? 3 : 2;
      o.ap = mv("iglica") / 100;
      o.side = syn("ostrzal") ? 1 : Math.max(val("side", P2.side), mv("bok")) / 100;
      o.laserS = l && lm ? Math.min(l, lm) : l || lm;
      o.shieldS = sh && e ? Math.min(sh, e) : sh || e;
      o.spdK = 1 + mv("turbina") / 100;
      o.reson = mv("rezonans");
      o.crit = mv("kwant") / 100;
      o.drone = mv("dron");
      o.slowAdd = mv("petla");
      o.root = mv("root");
      comboS = o.comboS;
      pierceN = P2.pierce || 0;
      for (k in SYC) SYC[k] = 0;
      for (k in WST) WST[k] = 0;
    }
    function interval() {
      var lvl = wave - 1, ws = clamp2(W / 700, 0.65, 1.6);
      var v = Math.max(0.18, 0.9 * Math.pow(0.86, lvl)) / ws;
      if (t < 10) v *= 1.3;
      return v * rnd2(0.75, 1.25);
    }
    function speed() {
      return (80 + 24 * (wave - 1)) * clamp2(H / 600, 0.75, 1.35) * (t < 10 ? 0.85 : 1);
    }
    function blocked(x, w) {
      for (var j = 0; j < obN; j++) {
        var o = OB[j];
        if (o.y < lh * 2.5 && x < o.x + o.w + 8 && x + w + 8 > o.x) return true;
      }
      return false;
    }
    function spawn() {
      if (obN >= OB.length || !eligN || BO.on) return;
      var o = OB[obN], k = eligible[Math.random() * eligN | 0], sp = spr[k], tries = 0, x;
      do {
        x = rnd2(2, Math.max(2, W - sp.w - 2));
      } while (++tries < 4 && blocked(x, sp.w));
      o.k = k;
      o.w = sp.w;
      o.h = sp.h;
      o.x = x;
      o.y = -sp.h - 2;
      o.hv = wave > 1 && Math.random() < Math.min(0.3, 0.06 + 0.04 * (wave - 1));
      o.hp = o.hv ? 3 : 1;
      o.hit = 0;
      o.near = 0;
      o.vy = speed() * rnd2(0.8, 1.25) * (o.hv ? 1.5 : 1);
      o.el = 0;
      o.vx = 0;
      o.rv = 0;
      o.fz = 0;
      o.at = 0;
      obN++;
      if ((wave >= 3 || testElite) && !ELP.k && eliteCd <= 0 && Math.random() < (testElite ? 0.4 : ELITE_P)) {
        ELP.k = 1 + (Math.random() * 3 | 0);
        ELP.t = 0.8;
        ELC[ELP.k]++;
        eliteCd = testElite ? 2.5 : ELITE_CD;
        ELP.gw = Math.max(86 * s0, 74);
        ELP.gx = rnd2(W * 0.25, W * 0.75);
        ELP.x = rnd2(4, Math.max(4, W - elSpr[ELP.k === 2 ? 2 : 3].w - 4));
        sfx("tele");
      }
    }
    function eliteGo() {
      var k = ELP.k, o, sp, v = speed() * 1.1, j;
      ELP.k = 0;
      for (j = 0; j < (k === 1 ? 2 : 1); j++) {
        if (obN >= OB.length) return;
        o = OB[obN++];
        sp = elSpr[k === 1 ? j : k === 2 ? 2 : 3];
        o.k = -1 - (k === 1 ? j : k === 2 ? 2 : 3);
        o.w = sp.w;
        o.h = sp.h;
        o.y = -sp.h - 2;
        o.vy = v;
        o.hv = false;
        o.hit = 0;
        o.near = 0;
        o.rv = 0;
        o.fz = 0;
        o.el = k;
        o.hp = k === 1 ? 999 : k === 2 ? 3 : 1;
        o.at = 0;
        if (k === 1) {
          o.ex = j ? 1 : -1;
          o.x = j ? W : -o.w;
          o.y1 = j ? ELP.gx + ELP.gw / 2 : ELP.gx - ELP.gw / 2 - o.w;
          o.vx = (o.y1 - o.x) / Math.max(0.4, H * 0.35 / v);
        } else {
          o.x = ELP.x;
          o.vx = 0;
          o.y1 = H * rnd2(0.62, 0.74);
        }
      }
    }
    function lineAt(x, k, vy, y) {
      if (obN >= OB.length) return;
      var o = OB[obN++], sp = spr[k];
      o.k = k;
      o.w = sp.w;
      o.h = sp.h;
      o.x = clamp2(x, 2, Math.max(2, W - sp.w - 2));
      o.y = y;
      o.hv = false;
      o.hp = 1;
      o.hit = 0;
      o.near = 0;
      o.vy = vy;
      o.el = 0;
      o.vx = 0;
      o.at = 1;
    }
    function proj(x, y, vx, vy, g, r) {
      if (prN >= PR.length) return null;
      var p = PR[prN++], s2 = pj[g];
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.g = g;
      p.r = r;
      p.near = 0;
      p.rot = Math.atan2(vy, vx);
      p.t = 0;
      p.s = 0;
      p.a = 0;
      p.hp = 0;
      p.life = 0;
      p.k = 0;
      p.bh = 0;
      p.k2 = 0;
      if (g === 4 || g === 7 || g === 9 || g === 10) {
        p.hw = s2.w / 2 - 1;
        p.hh = s2.h / 2 - 1;
      } else p.hw = p.hh = 0;
      if (prN > prMax) prMax = prN;
      return p;
    }
    function bullet(x, y, vx, dm, ap, sh, nc) {
      if (blN >= BL.length) return null;
      var b = BL[blN++];
      b.x = x;
      b.y = y;
      b.vx = vx;
      b.dm = dm;
      b.ap = ap || 0;
      b.pc = sh ? 0 : pierceN + (up.pierce || 0);
      b.sh = sh || 0;
      b.lh = null;
      if (!sh && !nc && FXV.crit && Math.random() < FXV.crit) {
        b.dm *= 3;
        WST.crit++;
      }
      return b;
    }
    function shoot() {
      var dbl = up.dbl;
      if (!dbl && P2.dbl) {
        dblAcc += val("dbl", P2.dbl) / 100;
        if (dblAcc >= 0.999) {
          dblAcc -= 1;
          dbl = 1;
        }
      }
      var dx = dbl ? 5 * s0 : 0, y = ship.y - 15 * s0;
      if (blN >= BL.length - 1) return;
      bullet(ship.x - dx, y, 0, 1);
      if (dbl) bullet(ship.x + dx, y, 0, 1);
      shots += dbl ? 2 : 1;
      WST.shots += dbl ? 2 : 1;
      if (FXV.side > 0 && (sideAcc += FXV.side) >= 0.999) {
        sideAcc -= 1;
        bullet(ship.x - 7 * s0, y + 4, -150, 0.5);
        bullet(ship.x + 7 * s0, y + 4, 150, 0.5);
        WST.side += 2;
        if (syn("ostrzal")) SYC.ostrzal += 2;
      }
    }
    function laserTick(dt) {
      var j, o, y, dmg = 2.4 * dmgM, hitY = -10;
      if (laserOn > 0) {
        laserOn -= dt;
        laserTk -= dt;
        if (laserTk <= 0) {
          laserTk += 0.05;
          if (BO.on && BO.st === 2) {
            if (BO.v2) {
              y = B2.beam(ship.x, dmg * 100 / BO.need);
              if (y > -1e8) {
                hitY = y;
                WST.laserDmg += dmg;
              }
            } else for (j = 0; j < BO.n; j++) {
              o = BP[j];
              if (o.alive && Math.abs(ship.x - o.x) < o.w * 0.46 && o.y < ship.y) {
                bossDeal(o, dmg * 100 / BO.need);
                hitY = o.y + o.h * 0.4;
                WST.laserDmg += dmg;
                break;
              }
            }
          }
          for (j = obN - 1; j >= 0; j--) {
            o = OB[j];
            if (o.at === 0 && o.el !== 1 && ship.x >= o.x && ship.x <= o.x + o.w && o.y < ship.y) {
              if ((o.hp -= dmg) <= 0) {
                shatter(o);
                removeOb(j);
                score += 10 * comboM;
              }
            }
          }
          for (y = ship.y - 20; y > hitY; y -= 22) if (moby.shot(ship.x, y, dmg)) break;
        }
        laserHit = hitY;
        return;
      }
      if (FXV.laserS > 0 && mode2 === "ogien") {
        if ((laserT += dt) >= FXV.laserS) {
          laserT = 0;
          laserOn = 0.5;
          laserTk = 0;
          laserN++;
          WST.laser++;
          sfx("bomb");
          if (syn("przelad")) {
            charge(0.1);
            SYC.przelad++;
          }
        }
      }
    }
    var laserHit = -10;
    function shrap(b) {
      var m = Math.max(FXV.shrapM, up.shrap ? 0.3 : 0), n, j, lc = syn("lancuch");
      if (!m || b.sh >= (lc ? 2 : 1) || blN > BL.length - 4) return;
      n = lc ? 3 : 2;
      for (j = 0; j < n; j++) bullet(b.x + (j - (n - 1) / 2) * 8 * s0, b.y - 6, (j - (n - 1) / 2) * 420 || 60, m, lc ? 1 : 0, b.sh + 1);
      WST.shrap += n;
      if (lc && b.sh) SYC.lancuch++;
    }
    function charge(fr) {
      if (BO.on && mode2 === "unik") bmeter += fr;
      else nextBomb -= step * fr;
    }
    function droneTick(dt) {
      if (!FXV.drone || state !== "play") return;
      if ((droneT += dt) >= 1 / FXV.drone) {
        droneT = 0;
        droneN++;
        WST.drone++;
        var r = syn("roj") && droneN % 3 === 0;
        bullet(ship.x - 26 * s0, ship.y - 2, 0, r ? 2.1 : 0.7, r ? 1 : 0, 0, 1);
        if (r) SYC.roj++;
      }
    }
    function bomb() {
      if (state !== "play" || bombs <= 0) return;
      bombs--;
      for (var k = obN - 1; k >= 0; k--) shatter(OB[k]);
      obN = 0;
      prN = 0;
      grace = 0.5;
      ELP.k = 0;
      clearStack();
      if (up.slow || P2.slow) slowT = (up.slow ? 0.9 + 0.9 * up.slow : 0) + val("slow", P2.slow);
      if (FXV.slowAdd) slowT = Math.max(slowT, 0) + FXV.slowAdd;
      if (syn("przelad") && FXV.laserS) {
        laserT = FXV.laserS;
        SYC.przelad++;
      }
      if (!reduced) flash = FLASH;
      sfx("bomb");
      if (BO.on && FXV.root && rootN < FXV.root && BO.st === 2) {
        if (BO.v2 ? B2.forceStag() : BO.fs !== S_SHIFT && BO.fs !== S_DESP && BO.fs !== S_STAG && (atkClear(), BO.cnt = 0, stagger(), true)) {
          rootN++;
          floater(ship.x, ship.y - 46 * s0, "root: stagger");
        }
      }
      if (BO.on && BO.st === 2) fB++;
      if (BO.on) bossBomb();
      moby.bomb();
      ui();
    }
    function hurt() {
      if (state !== "play" || invul > 0 || BO.st === 1 || BO.st === 3) return false;
      if (BO.on && !hurtSrc) bossCause = hurtCause || (BO.v2 ? B2.snapAtk() || "korpus" : BO.atk >= 0 ? ATK[BO.atk][0] : "korpus");
      if (god) {
        if (godCd <= 0) {
          if (BO.on) BO.hits++;
          godCd = 0.8;
        }
        return false;
      }
      if (BO.on) BO.hits++;
      combo = 0;
      comboT = 0;
      comboM = 1;
      if (shieldOn) {
        shieldOn = false;
        invul = 1.2;
        shipShake = 0.35;
        sfx("shield");
        if (FXV.slowAdd) slowT = Math.max(slowT, FXV.slowAdd);
        if (!reduced) shake = 0.12;
        floater(ship.x, ship.y - 30 * s0, "tarcza pękła");
        ui();
        return false;
      }
      if (armorN > 0) {
        armorN--;
        invul = 1.2;
        shipShake = 0.35;
        sfx("shield");
        if (FXV.slowAdd) slowT = Math.max(slowT, FXV.slowAdd);
        if (syn("bastion") && BO.on && !bastionUsed) {
          bastionUsed = true;
          bastionT = 6;
        }
        if (!reduced) shake = 0.12;
        floater(ship.x, ship.y - 30 * s0, armorN ? "pancerz −1" : "pancerz zdarty");
        ui();
        return false;
      }
      crash();
      return true;
    }
    var escOn = !!(opts.escape || qs && qs.get("ucieczka") === "1"), ESCB = [], escT = 0, DEATHS = [];
    function escRec(dt) {
      if ((escT += dt) < 0.1) return;
      escT = 0;
      ESCB.push({ t, x: ship.x, y: ship.y, hz: hazards() });
      if (ESCB.length > 8) ESCB.shift();
    }
    function escCheck() {
      var S = ESCB.length >= 6 ? ESCB[ESCB.length - 6] : ESCB[0], sp = clamp2(Math.min(W, H) * 0.75, 260, 440) * (1 + 0.12 * up.agile) * (1 + val("agile", P2.agile) / 100) * (1 + val("engine", P2.engine) / 100) * FXV.spdK, hx = 6 * s0 - 1, hy = 9 * s0 - 1, D = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]], L = [0.15, 0.3, 0.5], ok = 0, n = 0, i22, j2, T, x, y, h, X, Y, hit, dl, dd, dx, dy;
      if (!S) return { escape: null, moves: 0, free: 0 };
      for (i22 = 0; i22 < D.length; i22++) for (j2 = 0; j2 < (i22 ? L.length : 1); j2++) {
        dl = i22 ? L[j2] : 0;
        n++;
        hit = false;
        dd = D[i22][0] && D[i22][1] ? 0.7071 : 1;
        for (T = 0; T <= 0.6 && !hit; T += 1 / 60) {
          dx = D[i22][0] * sp * dd * Math.min(T, dl);
          dy = D[i22][1] * sp * dd * Math.min(T, dl);
          x = clamp2(S.x + dx, 11 * s0, W - 11 * s0);
          y = clamp2(S.y + dy, 14 * s0, H - 20 * s0);
          for (h = 0; h < S.hz.length; h++) {
            X = S.hz[h].x + S.hz[h].vx * T;
            Y = S.hz[h].y + S.hz[h].vy * T;
            if (x + hx > X && x - hx < X + S.hz[h].w && y + hy > Y && y - hy < Y + S.hz[h].h) {
              hit = true;
              break;
            }
          }
        }
        if (!hit) ok++;
      }
      return { escape: ok > 0, moves: n, free: ok };
    }
    function crash() {
      if (escOn && BO.on) {
        var ec = escCheck();
        DEATHS.push({ boss: BN[BO.type], phase: BO.phase, atk: bossCause || hurtSrc || "", fsm: SN[BO.fs], t: Math.round((BO.age - BO.il) * 10) / 10, escape: ec.escape, free: ec.free, moves: ec.moves });
      }
      diedBoss = BO.on;
      deathSrc = hurtSrc || (BO.on ? "boss" : "kod");
      go("dying");
      dieT = 0.6;
      drag.on = false;
      blN = 0;
      shipShake = 0.6;
      if (!reduced) {
        flash = FLASH;
        shake = 0.3;
      }
      for (var j = 0; j < 16 && shipG.length; j++) part2(ship.x, ship.y, rnd2(-220, 220), rnd2(-280, 60), shipG[j % shipG.length], j & 1);
      sfx("crash");
      ui();
    }
    function bossTop() {
      return W < 600 ? 186 : 80;
    }
    function hsc() {
      return clamp2(H / 600, 0.75, 1.3);
    }
    function bossPos() {
      var ty = BO.type, u = bossU(ty) * (ty === 1 ? 0.95 + 0.2 * BO.g : 1), k, p, e = BO.st === 1 ? 1 - Math.pow(1 - BO.en, 3) : 1, xx, yy, top2 = bossTop(), am, sg = BO.sag * 16 * bs;
      for (k = 0; k < BO.n; k++) {
        p = BP[k];
        p.u = u;
        p.w = DIM[ty][0] * u;
        p.h = DIM[ty][1] * u;
        am = Math.max(0, (W - p.w) / 2 - 6);
        if (ty === 0) {
          xx = W / 2 + Math.sin(BO.ph * 0.7) * Math.min(W * 0.2, am);
          yy = top2 + p.h / 2 + Math.min(BO.age * 4 * bs, H * 0.04);
        } else if (ty === 1) {
          xx = W / 2 + Math.sin(BO.ph * 0.5) * Math.min(W * 0.12, am);
          yy = top2 + p.h / 2;
        } else if (ty === 2) {
          xx = W / 2 + (k ? 1 : -1) * (W * 0.18 + Math.sin(BO.ph * 0.6) * W * 0.03);
          yy = top2 + p.h / 2 + Math.sin(BO.ph * 0.9 + k * 2) * 6;
        } else {
          xx = W / 2 + Math.sin(BO.ph * 0.4) * Math.min(W * 0.08, am);
          yy = top2 + 114 * u + Math.sin(BO.ph * 0.9) * 5;
        }
        p.hx = xx;
        p.hy = yy;
        if (ty === 0 && BO.jOn) {
          xx = BO.jx;
          yy = BO.jy;
        }
        if (p.ov) {
          xx = p.ox;
          yy = p.oy;
        }
        p.x = xx;
        p.y = yy + (p.ov || BO.jOn ? 0 : sg) - (1 - e) * (yy + p.h);
      }
    }
    function showBanner(txt) {
      bannerTxt = txt;
      bannerW = 0;
      banner = 1.6;
    }
    function setFs(s, d) {
      BO.fs = s;
      BO.ft = 0;
      BO.fd = d;
      BO.stC[s]++;
      tag();
    }
    function phaseOf(hp) {
      return hp > THR[0] ? 1 : hp > THR[1] ? 2 : hp > THR[2] ? 3 : 4;
    }
    function alive() {
      return (BP[0].alive ? 1 : 0) + (BO.n === 2 && BP[1].alive ? 1 : 0);
    }
    function aimP() {
      var a = BP[0], c = BP[1];
      if (BO.n < 2) return a;
      if (!a.alive) return c;
      if (!c.alive) return a;
      if (BO.mtx >= 0) return BP[BO.mtx ^ 1];
      return a.hp <= c.hp ? a : c;
    }
    function nearP() {
      var a = BP[0], c = BP[1];
      if (BO.n < 2 || !c.alive) return a;
      if (!a.alive) return c;
      return Math.abs(ship.x - a.x) < Math.abs(ship.x - c.x) ? a : c;
    }
    var EX = 0, EY = 0;
    function eye2(p, k) {
      var u = p.u, ty = BO.type;
      if (ty === 0) {
        EX = p.x;
        EY = p.y - 12 * u;
      } else if (ty === 1) {
        EX = p.x;
        EY = p.y;
      } else if (ty === 2) {
        EX = p.x + (k ? 10 : -10) * u;
        EY = p.y - 24 * u;
      } else {
        EX = p.x;
        EY = p.y - 55 * u;
      }
    }
    function bossStart() {
      var ty = bossTier % 4, n = ty === 2 ? 2 : 1, k, p;
      ensureArt(ty);
      BO.v2 = ty >= 1;
      cp = {
        score,
        bombs,
        up: { fire: up.fire, dbl: up.dbl, shield: up.shield, graze: up.graze, slow: up.slow, power: up.power, agile: up.agile, cache: up.cache, pierce: up.pierce, shrap: up.shrap },
        sh: shieldOn,
        wave,
        waveT,
        tier: bossTier,
        nbt: nextBossT,
        t,
        nb: nextBomb,
        step,
        ar: armorN
      };
      BO.on = true;
      BO.type = ty;
      BO.tier = bossTier;
      BO.n = n;
      BO.st = 1;
      BO.en = 0;
      BO.age = 0;
      BO.ph = 0;
      BO.hit = 0;
      BO.need = (BO.v2 ? NEED2[ty] * (arena ? ARENA_K : Math.max(ARENA_K, Math.min(1, Math.sqrt(dpsK(true) / KAMP_DPS)))) : BNEED[ty]) * (1 + 0.5 * Math.floor(bossTier / 4));
      BO.phase = 1;
      BO.g = 0;
      BO.sub = 0;
      BO.fast = 1;
      BO.hp = 100;
      BO.il = reduced ? 0.9 : BO.v2 && ty === 3 ? 2.8 : INTRO_S;
      BO.vp = 1;
      BO.hpG = 100;
      BO.gT = 0;
      BO.blk = -1;
      BO.bt = 2.5;
      BO.d1 = BO.d2 = BO.d3 = 0;
      BO.armT = 0;
      BO.cb = 0;
      BO.dr = 0;
      BO.gone = false;
      BO.et = 0;
      BO.sh = 0;
      glA = 0;
      glT = 0.05;
      BO.atk = -1;
      BO.last = -1;
      BO.cnt = 0;
      BO.pend = 0;
      BO.sag = 0;
      BO.chip = 0;
      BO.hits = 0;
      BO.stg = 0;
      BO.t0 = t;
      BO.hellT = 0;
      BO.vk = 1;
      for (k = 0; k < SN.length; k++) BO.stC[k] = 0;
      for (k = 0; k < ATK.length; k++) BO.atC[k] = 0;
      atkClear();
      for (k = 0; k < 2; k++) {
        p = BP[k];
        p.alive = k < n;
        p.hp = p.max = 100 / n;
        p.hit = 0;
        p.ex = false;
        p.spin = 0;
        p.side = k ? -1 : 1;
        p.x = W / 2;
        p.y = -200;
        p.fc = 0;
        p.ov = 0;
        p.mz = 0;
      }
      if (mode2 === "unik" && bombs < 1) bombs = 1;
      rootN = 0;
      bastionUsed = false;
      bastionT = 0;
      fG = 0;
      fB = 0;
      bmeter = 0;
      for (k = obN - 1; k >= 0; k--) shatter(OB[k]);
      obN = 0;
      prN = 0;
      spawnT = 1;
      banner = 0;
      ELP.k = 0;
      clearStack();
      if (BO.v2) {
        BP[0].alive = BP[1].alive = false;
        BO.n = 0;
        B2.start(ty, bossTier, BO.need, testHp);
        if (testPh > 1) B2.testPhase(testPh);
        else if (testHp > 0 && testHp < 100) {
          BO.phase = 1;
          B2.testPhase(Math.max(1, B2.phaseFor(testHp)));
        }
        BO.hpG = BO.hp;
      } else if (testHp > 0 && testHp < 100) {
        for (k = 0; k < n; k++) BP[k].hp = BP[k].max * testHp / 100;
        BO.hp = BO.hpG = testHp;
        BO.phase = phaseOf(testHp);
        BO.vp = Math.min(3, BO.phase) + (BO.phase === 4 ? 1 : 0);
        if (BO.phase >= 3) BO.d1 = ty === 3 ? 1 : 0;
      }
      setFs(S_INTRO, BO.il);
      bossPos();
      if (!BO.v2 && testHp > 0 && testHp < 100 && BO.phase > 1) phaseLook();
      tag();
      ui();
      sfx("boss");
      live.textContent = "Uwaga, boss: " + BN[ty] + (BO.v2 ? ". Faza 1 z 6, sześć części." : ". Faza 1 z 3.");
    }
    function clearStack() {
      for (var j = 0; j < NSK; j++) {
        STK[j] = 0;
        STT[j] = 0;
      }
    }
    var BAND = [0, 0], bandShat = 0;
    var BR = [0, 0, 0, 0];
    function bossBand() {
      var k, p, y0 = 1e9, y1 = -1e9;
      if (BO.v2) {
        if (!B2.rect(BR)) return false;
        BAND[0] = BR[1] - 20;
        BAND[1] = BR[3] + 40;
        return true;
      }
      for (k = 0; k < BO.n; k++) {
        p = BP[k];
        if (p.alive) {
          y0 = Math.min(y0, p.y - p.h / 2);
          y1 = Math.max(y1, p.y + p.h / 2);
        }
      }
      BAND[0] = y0 - 20;
      BAND[1] = y1 + 40;
      return y1 > y0;
    }
    function inBand(o) {
      return o.at === 0 && o.y + o.h > BAND[0] && o.y < BAND[1];
    }
    function clearBand() {
      if (!bossBand()) return;
      for (var k = obN - 1; k >= 0; k--) if (inBand(OB[k])) {
        shatter(OB[k]);
        removeOb(k);
        bandShat++;
      }
    }
    function atkClear() {
      BO.bm = 0;
      BO.jOn = 0;
      BO.wl = 0;
      BO.mtx = -1;
      BO.lockHp = 0;
      BO.echo = 0;
      BO.panic = 0;
      BO.sub = 0;
      BO.fired = 0;
      BP[0].ov = BP[1].ov = 0;
    }
    function queueNew(ph) {
      var b = BO, j, k, n = 0;
      for (k = 0; k < b.fqN; k++) if (!(b.type === 3 && ph === 4)) b.fq[n++] = b.fq[k];
      b.fqN = n;
      for (j = 0; j < ATK.length && b.fqN < 6; j++) if (ATK[j][2] === b.type && ATK[j][3] === ph) b.fq[b.fqN++] = j;
    }
    function teleLen(j) {
      var d = TELE[BO.phase - 1] * (sudo ? SUDO_T : 1);
      if (j === A_JMP) d *= 1.5;
      else if (j === A_LCK || j === A_TND) d *= 1.4;
      else if (j === A_DER || j === A_OOM || j === A_SWP || j === A_STK) d *= 1.25;
      else if (j === A_PNC) d = Math.max(0.8, d * 1.8);
      else if (j === A_COR) d = 1.7;
      else if (j === A_HEL) d = 1;
      return d;
    }
    function pickAttack() {
      var b = BO, ph = b.phase, ty = b.type, j, k, A, w, sum = 0, r, q2 = nearP(), cor = ship.x < W * 0.22 || ship.x > W * 0.78, und = Math.abs(ship.x - q2.x) < q2.w * 0.3, busy = prN > SWEEP_FREE;
      for (j = 0; j < ATK.length; j++) {
        A = ATK[j];
        w = 0;
        if (A[2] === ty && j !== b.last) {
          if (ph === 4) {
            if (A[3] === 4 || ty !== 3 && A[3] <= 3) w = A[4] + (cor ? A[5] : 0) + (und ? A[6] : 0);
          } else if (A[3] <= ph) w = A[4] + (cor ? A[5] : 0) + (und ? A[6] : 0);
        }
        if (busy && sweeping(j)) w = 0;
        AW[j] = w;
        sum += w;
      }
      if (b.fqN > 0 && busy && sweeping(b.fq[0])) {
        setFs(S_IDLE, 0.3);
        return;
      }
      if (b.fqN > 0) {
        j = b.fq[0];
        for (k = 1; k < b.fqN; k++) b.fq[k - 1] = b.fq[k];
        b.fqN--;
        startTele(j);
        return;
      }
      if (sum <= 0) {
        setFs(S_IDLE, 0.3);
        b.last = -1;
        return;
      }
      r = Math.random() * sum;
      for (j = 0; j < ATK.length - 1; j++) {
        if (AW[j] > 0 && (r -= AW[j]) < 0) break;
      }
      while (AW[j] <= 0) j--;
      startTele(j);
    }
    function sweeping(j) {
      return j === A_DER || j === A_SWE || j === A_GC || j === A_ERC || j === A_TND;
    }
    function startTele(j) {
      var b = BO, p = BP[0], n, sl, k, jj, a, s, top2;
      b.atk = j;
      b.last = j;
      b.tx = ship.x;
      b.ty = ship.y;
      b.tm = 0;
      b.k = 0;
      b.fired = 0;
      b.vk = (sudo ? SUDO_V : 1) * PHASE_V[b.phase - 1] * (b.n === 2 && alive() === 1 ? 1.3 : 1);
      if (j === A_DER) {
        eye2(p, 0);
        s = Math.abs(ship.x - p.x) < 8 ? Math.random() < 0.5 ? -1 : 1 : ship.x > p.x ? 1 : -1;
        b.sd = s;
        b.a0 = Math.atan2(36 * bs, (s > 0 ? W : 0) - EX);
        b.a1 = Math.PI / 2 + s * 0.13;
      } else if (j === A_WALL) {
        b.gw = Math.max(84 * s0, 72);
        b.gx = rnd2(b.gw, W - b.gw);
      } else if (j === A_DMP || j === A_EML) {
        n = j === A_EML ? 4 : clamp2(3 + Math.floor(b.g * 4) + (b.phase >= 3 ? 1 : 0), 3, 7);
        sl = W / n;
        RN = n;
        for (jj = 0; jj < n; jj++) {
          k = eligible[Math.random() * eligN | 0];
          RK[jj] = k;
          RX[jj] = clamp2(sl * jj + rnd2(0, sl) - spr[k].w / 2, 2, W - spr[k].w - 2);
        }
      } else if (j === A_GC) {
        top2 = p.y + p.h * 0.55;
        b.sd = ship.x < W / 2 ? -1 : 1;
        b.gw = Math.max(96 * s0, 84);
        b.gy = rnd2(Math.max(top2 + b.gw * 0.7, H * 0.4), H - b.gw * 0.7);
      } else if (j === A_SWE || j === A_ERC || j === A_DSY) b.sd = Math.random() < 0.5 ? 1 : -1;
      else if (j === A_CRS) {
        b.gw = Math.max(104 * s0, 92);
        b.a0 = Math.asin(clamp2((ship.x - W / 2) / (W * 0.32), -1, 1));
      } else if (j === A_LCK) {
        a = rnd2(-0.05, 0.05);
        b.lx[0] = W * (0.2 + a);
        b.lx[1] = W * (0.5 + a);
        b.lx[2] = W * (0.8 + a);
        top2 = Math.max(BP[0].y + BP[0].h * 0.5, BP[1].y + BP[1].h * 0.5);
        b.ly[0] = top2 + (H - top2) * 0.32;
        b.ly[1] = top2 + (H - top2) * 0.7;
      } else if (j === A_MTX) b.mtx = !BP[0].alive ? 1 : !BP[1].alive ? 0 : Math.random() < 0.5 ? 0 : 1;
      else if (j === A_TND) b.ly[0] = ship.y;
      else if (j === A_STK) {
        for (jj = 0; jj < 8; jj++) {
          k = Math.random() * NSK | 0;
          if (STK[k] >= 2 && Math.random() < 0.7) k = (k + 3) % NSK;
          RK[jj] = k;
        }
        RN = 8;
      } else if (j === A_COR) {
        b.sub = 1;
        b.laneW = Math.max(70, 64 * s0);
        b.lane = rnd2(b.laneW, W - b.laneW);
        sfx("boss");
      }
      setFs(S_TELE, teleLen(j));
      sfx("tele");
    }
    function teleUpd() {
      var b = BO, j = b.atk, f = b.ft / b.fd;
      if ((j === A_ARR || j === A_ENP || j === A_JMP || j === A_PNC) && f < 0.65) {
        b.tx = ship.x;
        b.ty = ship.y;
      }
      if (j === A_TND && f < 0.7) b.ly[0] = ship.y;
      if (j === A_SWE || j === A_ERC || j === A_DSY) {
        if (f < 0.3) b.ty = ship.y;
      }
      if (j === A_COR) b.sub = b.ft < 1.2 ? 1 : 2;
    }
    function arrow(p, da, tx, ty) {
      var y0 = p.y + ORY[BO.type] * p.h, a = Math.atan2(ty - y0, tx - p.x) + da, v = ARROW_V * hsc() * BO.vk * BO.fast;
      proj(p.x + Math.cos(a) * 8, y0 + Math.sin(a) * 8, Math.cos(a) * v, Math.sin(a) * v, 0, 6 * s0);
    }
    function sweep(side, ty, rows) {
      var r, j, v = SWEEP_V * BO.vk * clamp2(W / 700, 0.8, 1.3);
      for (r = 0; r < rows; r++)
        for (j = 0; j < 6; j++) proj(side > 0 ? -12 - j * 50 : W + 12 + j * 50, clamp2(ty - r * 46 * s0, 20, H - 20), side * v, 0, 1, 7 * s0);
    }
    function curtain() {
      var lx0 = BO.lane - BO.laneW / 2, lx1 = BO.lane + BO.laneW / 2, x, k, n, sd, tries;
      for (sd = 0; sd < 2; sd++) {
        x = sd ? lx1 + 4 : 2;
        n = 0;
        for (tries = 0; tries < 8 && n < 6; tries++) {
          k = eligible[Math.random() * eligN | 0];
          if (spr[k].w > (sd ? W - 2 : lx0 - 4) - x) continue;
          lineAt(x, k, speed() * 1.35, -lh - n * lh * 0.4);
          x += spr[k].w + 4;
          n++;
        }
      }
    }
    function ring(x, y, n, a0, v, g) {
      for (var j = 0; j < n; j++) {
        var a = a0 + j * 6.2832 / n;
        proj(x, y, Math.cos(a) * v, Math.sin(a) * v, g, (g === 2 ? 7 : 5) * s0);
      }
    }
    function atkStart() {
      var b = BO, j = b.atk, p = BP[0], hs = hsc(), k, n, x, a, q2, bw;
      b.atC[j]++;
      b.tm = 0;
      b.k = 0;
      b.fired = 0;
      if (j === A_DER) {
        b.bm = 1;
        b.bmA = b.a0;
        b.bmHW = (7 + 2 * Math.min(3, b.phase)) * s0;
      } else if (j === A_DNG) {
        eye2(p, 0);
        n = b.phase >= 3 ? 5 : 4;
        for (k = 0; k < n; k++) {
          a = Math.PI * (0.15 + 0.7 * k / (n - 1));
          q2 = proj(EX, EY, Math.cos(a) * 190, Math.sin(a) * 190, 3, 5 * s0);
          if (q2) q2.a = a;
        }
      } else if (j === A_WALL) {
        bw = pj[4].w;
        for (x = bw / 2; x < W + bw / 2; x += bw) if (Math.abs(x - b.gx) > b.gw / 2 + bw / 2) proj(x, -12, 0, 150 * hs * b.vk, 4, 0);
      } else if (j === A_JMP) {
        b.jOn = 1;
        b.jx = clamp2(b.tx, p.w * 0.4, W - p.w * 0.4);
        b.jy = -p.h;
        b.sub = 0;
      } else if (j === A_DMP || j === A_EML) {
        for (k = 0; k < RN; k++) lineAt(RX[k], RK[k], speed() * (j === A_DMP ? 1.35 : 1.05) * b.vk, -lh);
        if (j === A_DMP) {
          ring(p.x, p.y, 6 + 2 * b.phase, b.age, 180 * hs * b.vk, 6);
          a = Math.atan2(ship.y - p.y, ship.x - p.x);
          for (k = -2; k <= 2; k++) proj(p.x, p.y, Math.cos(a + k * 0.16) * 300 * hs * b.vk, Math.sin(a + k * 0.18) * 300 * hs * b.vk, 6, 6 * s0);
        }
      } else if (j === A_MAL) {
        n = b.phase >= 2 ? 6 : 5;
        for (k = 0; k < n; k++) {
          a = Math.PI * (0.1 + 0.8 * k / (n - 1));
          q2 = proj(p.x, p.y, Math.cos(a) * 160, Math.sin(a) * 160, 5, 8 * s0);
          if (q2) {
            q2.hp = 4;
            q2.life = mode2 === "unik" ? 5 : 6;
          }
        }
      } else if (j === A_SPR) {
        n = 11 + 3 * (Math.min(3, b.phase) - 1);
        for (k = 0; k < n; k++) {
          a = rnd2(0.1, Math.PI - 0.1);
          q2 = proj(p.x, p.y, Math.cos(a) * 255 * hs * b.vk, Math.sin(a) * 255 * hs * b.vk, 6, 6 * s0);
          if (q2) q2.life = 6;
        }
      } else if (j === A_GC) {
        bw = pj[10].h;
        x = b.sd > 0 ? -pj[10].w : W + pj[10].w;
        for (a = bw / 2; a < H + bw / 2; a += bw) if (Math.abs(a - b.gy) > b.gw / 2 + bw / 2) proj(x, a, b.sd * W / 1.7 * b.vk, 0, 10, 0);
        if (b.phase >= 3) {
          b.echo = 0.9;
          b.echoS = b.sd;
          b.ty = clamp2(b.gy + (Math.random() < 0.5 ? -1 : 1) * rnd2(110, 180) * s0, H * 0.4, H - b.gw * 0.7);
        }
      } else if (j === A_SWE || j === A_ERC) {
        sweep(b.sd, b.ty, b.phase >= 2 ? 2 : 1);
        if (b.phase === 4 || j === A_ERC) {
          b.echo = 0.5;
          b.echoS = -b.sd;
        }
      } else if (j === A_DSY) {
        sweep(1, b.ty, 1);
        sweep(-1, b.ty - 92 * s0, 1);
        b.echo = 0.5;
        b.echoS = b.sd;
      } else if (j === A_LCK) {
        b.lockHp = 10;
      } else if (j === A_PNC) {
        if (!reduced) b.panic = 1;
      } else if (j === A_COR) {
        b.sub = 0;
        curtain();
      } else if (j === A_HEL) {
        b.hellT = 0;
      }
      if (j === A_ARR && b.phase === 4) {
        b.echo = 0.55;
        b.echoS = 0;
      }
      if (b.type === 2 && b.phase === 4 && !b.echo) {
        b.echo = 0.6;
        b.echoS = b.sd;
      }
      b.echoA = j;
      setFs(S_ATK, ATK[j][7]);
    }
    function atkUpd(dt) {
      var b = BO, j = b.atk, p = BP[0], hs = hsc(), tm = b.tm += dt, k, a, x, q2, f, n, pp, y, v;
      if (j === A_ARR || j === A_ENP) {
        n = j === A_ENP || b.phase >= 2 ? 2 : 3;
        if (b.fired < n && tm >= b.fired * (n === 3 ? 0.25 : 0.4)) {
          x = b.fired ? ship.x : b.tx;
          y = b.fired ? ship.y : b.ty;
          if (n === 3) arrow(p, 0, x, y);
          else {
            arrow(p, -0.3, x, y);
            arrow(p, 0, x, y);
            arrow(p, 0.3, x, y);
          }
          b.fired++;
        }
      } else if (j === A_DER) {
        f = clamp2(tm / 1.25, 0, 1);
        f = f * f * (3 - 2 * f);
        b.bmA = b.a0 + (b.a1 - b.a0) * f;
        if (tm > 1.25) b.bm = 0;
      } else if (j === A_JMP) {
        y = H - p.h * 0.42;
        if (tm < 0.35) {
          f = tm / 0.35;
          b.jy = -p.h + (y + p.h) * f * f;
        } else if (b.sub === 0) {
          b.sub = 1;
          b.jy = y;
          if (!reduced) shake = 0.25;
          hitstop = 0.05;
          for (k = -1; k <= 1; k += 2) {
            q2 = proj(b.jx + k * p.w * 0.3, H - 10 * s0, k * 330 * b.vk, 0, 7, 0);
          }
          burst(b.jx, H - 8, 18, 260);
          sfx("bomb");
        } else if (tm > 0.8) {
          f = clamp2((tm - 0.8) / 0.7, 0, 1);
          f = f * f * (3 - 2 * f);
          b.jy = y + (p.hy - y) * f;
          b.jx += (p.hx - b.jx) * f;
          if (f >= 1) b.jOn = 0;
        }
      } else if (j === A_SPI) {
        if (tm >= b.fired * 0.09) {
          eye2(p, 0);
          a = b.fired * 0.42;
          v = 150 * hs * Math.min(b.vk, 1.15);
          proj(EX, EY, Math.cos(a) * v, Math.sin(a) * v, 2, 7 * s0);
          proj(EX, EY, -Math.cos(a) * v, -Math.sin(a) * v, 2, 7 * s0);
          b.fired++;
        }
      } else if (j === A_SWP) {
        if (tm >= b.fired * 0.5) {
          ring(p.x, p.y, 10, b.fired * 0.4, 130 * hs * b.vk, 6);
          b.fired++;
        }
      } else if (j === A_OOM) {
        f = tm < 1 ? tm : tm > 3.8 ? Math.max(0, (4.6 - tm) / 0.8) : 1;
        f = clamp2(f, 0, 1);
        b.wl = W * 0.27 * f * f * (3 - 2 * f);
        if (tm >= 0.9 + b.fired * 0.9 && tm < 3.8) {
          k = eligible[Math.random() * eligN | 0];
          x = rnd2(b.wl + 4, Math.max(b.wl + 4, W - b.wl - spr[k].w - 4));
          if (spr[k].w < W - 2 * b.wl - 8) lineAt(x, k, speed() * 1.5, -lh);
          ring(p.x, p.y, 10, b.fired, 140 * hs * b.vk, 6);
          b.fired++;
        }
      } else if (j === A_CRS) {
        if (tm >= b.fired * 0.3 && tm < 2.2) {
          b.gx = W / 2 + Math.sin(b.a0 + tm * 0.9) * W * 0.32;
          y = Math.max(BP[0].y, BP[1].y) + BP[0].h * 0.45;
          x = (b.fired & 1 ? 20 : 0) * s0 + 10 * s0;
          for (; x < W; x += 40 * s0) if (Math.abs(x - b.gx) > b.gw / 2) proj(x, y, 0, 240 * hs * b.vk, 8, 5 * s0);
          BP[b.fired & 1].mz = 0.12;
          if (BO.n === 2 && !BP[b.fired & 1].alive) BP[b.fired & 1 ^ 1].mz = 0.12;
          b.fired++;
        }
      } else if (j === A_LCK) {
        if (tm >= 0.6 + b.fired * 0.85) {
          for (k = 0; k < 2; k++) if (BP[k].alive) arrow(BP[k], 0, ship.x, ship.y);
          b.fired++;
        }
      } else if (j === A_MTX) {
        if ((b.mtT += dt) >= 1.5) {
          b.mtT = 0;
          if (alive() === 2) b.mtx ^= 1;
          else b.mtx = b.mtx < 0 ? BP[0].alive ? 0 : 1 : -1;
          sfx("tele");
        }
        if (tm >= 0.3 + b.fired * 0.55) {
          pp = BP[b.fired & 1].alive ? BP[b.fired & 1] : BP[b.fired & 1 ^ 1];
          eye2(pp, pp === BP[1] ? 1 : 0);
          a = Math.atan2(ship.y - EY, ship.x - EX);
          v = 260 * hs * b.vk;
          proj(EX, EY, Math.cos(a) * v, Math.sin(a) * v, 1, 7 * s0);
          pp.mz = 0.12;
          b.fired++;
        }
      } else if (j === A_TND) {
        for (k = 0; k < 2; k++) {
          pp = alive() === 2 ? BP[k] : k ? null : BP[0].alive ? BP[0] : BP[1];
          if (!pp) continue;
          f = tm - k * 1;
          if (k === 1 && f < -0.5 + dt && f >= -0.5) b.ly[1] = ship.y;
          if (f < -0.5) b.ly[1] = ship.y;
          y = clamp2(b.ly[k], H * 0.36, H - pp.h * 0.4);
          x = pp.side > 0 ? pp.w * 0.5 + 4 : W - pp.w * 0.5 - 4;
          if (f < 0 || f > 1.2) {
            pp.ov = 0;
            continue;
          }
          pp.ov = 1;
          if (f < 0.25) {
            a = f / 0.25;
            pp.ox = pp.hx + (x - pp.hx) * a;
            pp.oy = pp.hy + (y - pp.hy) * a;
          } else if (f < 0.75) {
            a = (f - 0.25) / 0.5;
            a = a * a;
            pp.ox = x + (W - 2 * x) * a;
            pp.oy = y;
            if (f > 0.3 && f < 0.32) sfx("tele");
          } else {
            a = (f - 0.75) / 0.45;
            pp.ox = W - x + (pp.hx - (W - x)) * a;
            pp.oy = y + (pp.hy - y) * a;
          }
        }
      } else if (j === A_RNG) {
        if (tm >= b.fired * 0.3 && tm < 2.3) {
          eye2(p, 0);
          ring(EX, EY, 14, b.fired * 0.22, 150 * hs * b.vk, 8);
          b.fired++;
        }
      } else if (j === A_STK) {
        if (b.fired < RN && tm >= b.fired * 0.18) {
          x = (RK[b.fired] + 0.5) * W / NSK;
          q2 = proj(x, -14, 0, 300 * hs * b.vk, 9, 0);
          if (q2) q2.k = RK[b.fired];
          b.fired++;
        }
      } else if (j === A_PNC) {
        if (tm >= 0.15 + b.fired * 0.32 && tm < 1.6) {
          arrow(p, 0, ship.x, ship.y);
          b.fired++;
        }
      } else if (j === A_HEL) {
        b.hellT = tm;
        if (tm >= b.fired * 0.1 && tm < HELL_S - 1) {
          eye2(p, 0);
          v = 135 * hs * b.vk;
          a = tm * 1.3;
          for (k = 0; k < 2; k++) {
            proj(EX, EY, Math.cos(a + k * 3.1416) * v, Math.sin(a + k * 3.1416) * v, 8, 5 * s0);
            proj(EX, EY, Math.cos(-a * 0.8 + k * 3.1416 + 1.57) * v * 0.85, Math.sin(-a * 0.8 + k * 3.1416 + 1.57) * v * 0.85, 2, 6 * s0);
          }
          if (b.fired % 10 === 5) arrow(p, 0, ship.x, ship.y);
          b.fired++;
        }
      }
    }
    function atkEnd() {
      var b = BO, j = b.atk;
      b.bm = 0;
      b.wl = 0;
      b.mtx = -1;
      b.panic = 0;
      b.lockHp = 0;
      b.sub = 0;
      BP[0].ov = BP[1].ov = 0;
      if (b.jOn) {
        b.jOn = 0;
      }
      if (j === A_HEL && BO.st === 2) {
        floater(ship.x, ship.y - 34 * s0, "przetrwane");
        bossKill();
        return true;
      }
      return false;
    }
    function echoFire() {
      var b = BO, j = b.echoA;
      if (j === A_ARR) {
        arrow(BP[0], -0.3, ship.x, ship.y);
        arrow(BP[0], 0.3, ship.x, ship.y);
      } else if (j === A_SWE || j === A_ERC || j === A_DSY) sweep(b.echoS || 1, ship.y, 1);
      else if (j === A_GC) {
        b.gy = b.ty;
        var bw = pj[10].h, y;
        for (y = bw / 2; y < H + bw / 2; y += bw) if (Math.abs(y - b.gy) > b.gw / 2 + bw / 2) proj(b.echoS > 0 ? -pj[10].w : W + pj[10].w, y, b.echoS * W / 1.7 * b.vk, 0, 10, 0);
      }
      if (b.type === 2 && b.phase === 4 && j !== A_DSY && j !== A_SWE) sweep(Math.random() < 0.5 ? 1 : -1, ship.y, 1);
    }
    function stagger() {
      var b = BO;
      setFs(S_STAG, STAG_S * (syn("kernel") ? 1.5 : 1));
      b.stg++;
      hitstop = HITSTOP;
      if (!reduced) shake = 0.15;
      onStag();
      floater(BP[0].x, BP[0].y + BP[0].h * 0.6, "stagger ×2");
      sfx("bhit");
      addCombo();
    }
    function lockBreak() {
      var b = BO;
      floater(b.lx[1], (b.ly[0] + b.ly[1]) / 2, "deadlock zerwany");
      burst(b.lx[1], (b.ly[0] + b.ly[1]) / 2, 30, 300);
      atkEnd();
      b.cnt = 0;
      setFs(S_VULN, VULN_S[b.phase - 1]);
      addCombo();
    }
    function fsm(dt) {
      var b = BO, k, ex;
      b.ft += dt;
      if (b.fs === S_IDLE) {
        if (b.ft >= b.fd) pickAttack();
      } else if (b.fs === S_TELE) {
        teleUpd();
        if (b.ft >= b.fd) atkStart();
      } else if (b.fs === S_ATK) {
        atkUpd(dt);
        if (b.fs === S_ATK && b.ft >= b.fd) {
          if (atkEnd()) return;
          b.cnt++;
          setFs(S_REC, REC_S);
        }
      } else if (b.fs === S_REC) {
        if (b.ft >= b.fd) {
          if (b.cnt >= VULN_N[b.phase - 1] && !(b.type === 3 && b.phase === 4)) {
            b.cnt = 0;
            setFs(S_VULN, VULN_S[b.phase - 1]);
            sfx("tele");
          } else setFs(S_IDLE, IDLE_S[b.phase - 1] * (sudo ? SUDO_T : 1));
        }
      } else if (b.fs === S_VULN || b.fs === S_STAG) {
        if (b.ft >= b.fd) {
          if (b.pend) {
            b.pend = 0;
            phaseShift(b.phase + 1);
          } else setFs(S_IDLE, IDLE_S[b.phase - 1]);
        }
      } else if (b.fs === S_SHIFT || b.fs === S_DESP) {
        if (b.ft >= b.fd * 0.5 && b.vp !== Math.min(3, b.phase) + (b.phase === 4 ? 1 : 0)) phaseLook();
        if (b.ft >= b.fd) setFs(S_IDLE, 0.35);
      }
      ex = b.fs === S_VULN || b.fs === S_STAG || b.type === 3 && b.phase === 4;
      for (k = 0; k < 2; k++) BP[k].ex = ex && BP[k].alive;
    }
    function burst(x, y, n, v) {
      for (var j = 0, a, sp; j < n; j++) {
        a = Math.random() * 6.283;
        sp = v * (0.35 + 0.65 * Math.random());
        part2(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 50, Math.random() * gN | 0, j & 1);
      }
    }
    function shard(x, y, s, col) {
      if (shN >= SHD.length) return;
      var d = SHD[shN++], a = Math.random() * 6.283, v = rnd2(80, 300);
      d.x = x;
      d.y = y;
      d.vx = Math.cos(a) * v;
      d.vy = Math.sin(a) * v - 120;
      d.a = a;
      d.va = rnd2(-9, 9);
      d.s = s;
      d.life = rnd2(0.7, 1.2);
      d.c = col;
    }
    function spark(x, y, sh) {
      for (var j = 0, d, a, v; j < (sh ? 2 : 3) && shN < SHD.length; j++) {
        d = SHD[shN++];
        a = -Math.PI / 2 + rnd2(-1.1, 1.1);
        v = rnd2(160, 340);
        d.x = x;
        d.y = y;
        d.vx = Math.cos(a) * v;
        d.vy = Math.sin(a) * v;
        d.a = a;
        d.va = 0;
        d.s = sh ? 5 : 3.5;
        d.life = rnd2(0.12, 0.24);
        d.c = sh ? C.muted : j ? C.hot : C.bone;
      }
    }
    function boom(x, y, r) {
      if (exN < EXP.length) {
        var e = EXP[exN++];
        e.x = x;
        e.y = y;
        e.r = r;
        e.life = e.max = rnd2(0.35, 0.55);
      }
      burst(x, y, 12, 260);
      shard(x, y, r * 0.35, C.plate);
      shard(x, y, r * 0.25, C.solid);
    }
    function detach(pt, p, X, Y, a0, m) {
      for (var j = 0, d; j < DTP.length; j++) if (DTP[j].life <= 0) {
        d = DTP[j];
        d.pt = pt;
        d.x = p.x + p.u * X;
        d.y = p.y + p.u * Y;
        d.a = a0;
        d.m = m;
        d.S = p.u;
        d.vx = (X < 0 ? -1 : 1) * rnd2(60, 160);
        d.vy = -rnd2(90, 190);
        d.va = (X < 0 ? -1 : 1) * rnd2(1.5, 4);
        d.life = 1.8;
        burst(d.x, d.y, 14, 200);
        shard(d.x, d.y, 10 * p.u, C.plate);
        return;
      }
    }
    function plates(p, n) {
      for (var j = 0; j < n; j++) shard(p.x + rnd2(-0.42, 0.42) * p.w, p.y + rnd2(-0.38, 0.38) * p.h, rnd2(9, 20) * p.u, j % 3 === 0 ? C.solid : j & 1 ? C.deep : C.plate);
      burst(p.x, p.y, 16, 300);
    }
    function glitchTick(dt, fast) {
      var j;
      if (!fxGlitch) {
        glA = 0;
        return;
      }
      if (glA > 0) {
        glA -= dt;
        return;
      }
      if ((glT -= dt) > 0) return;
      glA = rnd2(0.07, 0.15);
      glT = fast ? rnd2(0.02, 0.08) : rnd2(0.25, 0.8) * (0.4 + 0.6 * BO.hp / 100);
      for (j = 1; j < 5; j++) GLY[j] = (j + rnd2(-0.35, 0.35)) / 5;
      for (j = 0; j < 5; j++) GLX[j] = Math.random() < 0.45 ? rnd2(-0.08, 0.08) : 0;
    }
    function bossUpdate(dt) {
      var b = BO, k, p, j, X, Y, sw;
      if (b.v2) {
        glitchTick(dt, b.st === 3 || b.fs === S_SHIFT || b.fs === S_DESP);
        B2.update(dt);
        return;
      }
      b.age += dt;
      b.ph += dt * (b.fs === S_VULN || b.fs === S_STAG ? 0.3 : b.phase === 4 ? 1.5 : 1);
      b.armT += dt;
      if (b.hit > 0) b.hit -= dt;
      if (b.gT > 0) b.gT -= dt;
      else if (b.hpG > b.hp) b.hpG = Math.max(b.hp, b.hpG - dt * 70);
      for (k = 0; k < b.n; k++) {
        p = BP[k];
        if (p.hit > 0) p.hit -= dt;
        if (p.fc > 0) p.fc -= dt;
        if (p.mz > 0) p.mz -= dt;
        p.spin += dt * (2.2 + 3.2 * (1 - p.hp / p.max)) * (b.n === 2 && !BP[k ^ 1].alive ? 1.7 : 1) * (b.fs === S_STAG ? 0.2 : 1);
      }
      b.sag += ((b.fs === S_STAG ? 1 : b.fs === S_VULN ? 0.35 : 0) - b.sag) * Math.min(1, dt * 8);
      b.blk -= dt;
      if ((b.bt -= dt) <= 0) {
        b.bt = rnd2(2.2, 4);
        if (b.blk < 0) b.blk = 0.22;
      }
      glitchTick(dt, b.st === 3 || b.fs === S_SHIFT || b.fs === S_DESP);
      if (b.st === 1) {
        b.en = Math.min(1, b.age / (b.il * 0.62));
        bossPos();
        if (b.age >= b.il) {
          b.st = 2;
          b.en = 1;
          queueNew(b.phase);
          setFs(S_IDLE, 0.5);
        }
        return;
      }
      bossPos();
      if (b.st === 3) {
        bossDying(dt);
        return;
      }
      fsm(dt);
      if (b.st !== 2) return;
      if (b.echo > 0 && (b.echo -= dt) <= 0) echoFire();
      p = BP[0];
      if (b.type === 1) {
        b.g = Math.min(1, b.g + dt / 38 * (b.fs === S_VULN ? -1.5 : 1));
        if (b.g < 0) b.g = 0;
        sw = 1 + 0.1 * b.g;
        j = Math.floor((1 - b.hp / 100) * BA.n * 0.5);
        while (b.cb < j) {
          k = 0;
          while (k < BA.n - 1 && BA.br[k] !== b.cb) k++;
          X = p.x + BA.cx[k] * sw * p.u;
          Y = p.y + BA.cy[k] * sw * p.u;
          shard(X, Y, 15 * p.u, b.cb & 1 ? C.solid : C.plate);
          burst(X, Y, 5, 120);
          b.cb++;
        }
        if ((b.dr -= dt) <= 0) {
          b.dr = 0.2 - 0.1 * b.g;
          k = BA.fo[Math.random() * Math.min(12, BA.n) | 0];
          part2(p.x + BA.cx[k] * sw * p.u, p.y + (BA.cy[k] + 8) * sw * p.u, rnd2(-12, 12), rnd2(10, 50), Math.random() * gN | 0, 1);
        }
      } else if (b.type === 3 && b.phase >= 3 && (b.dr -= dt) <= 0) {
        b.dr = b.phase === 4 ? 0.03 : 0.06;
        part2(p.x + rnd2(-0.4, 0.4) * p.w, p.y + rnd2(-0.35, 0.4) * p.h, rnd2(-40, 40), rnd2(-90, -10), Math.random() * gN | 0, Math.random() < 0.5 ? 1 : 0);
      }
      if (state === "play" && !(b.atk === A_JMP && b.fs === S_TELE)) for (k = 0; k < b.n; k++) {
        p = BP[k];
        if (p.alive && Math.abs(ship.x - p.x) < p.w * 0.4 + 6 * s0 && Math.abs(ship.y - p.y) < p.h * 0.4 + 9 * s0) {
          hurt();
          break;
        }
      }
    }
    function bossDying(dt) {
      var b = BO, p, k;
      b.dt -= dt;
      if (!b.gone) {
        if ((b.et -= dt) <= 0) {
          b.et = reduced ? 0.2 : 0.085;
          k = Math.random() * b.n | 0;
          p = BP[k].alive ? BP[k] : BP[k ^ 1];
          boom(p.x + rnd2(-0.42, 0.42) * p.w, p.y + rnd2(-0.36, 0.36) * p.h, rnd2(14, 30) * p.u);
          if (Math.random() < 0.35) sfx("bhit");
        }
        if (b.dt <= FLASH) {
          b.gone = true;
          for (k = 0; k < b.n; k++) {
            p = BP[k];
            if (!p.alive) continue;
            burst(p.x, p.y, 80, 460);
            boom(p.x, p.y, 60 * p.u);
            for (var j = 0; j < 12; j++) shard(p.x + rnd2(-0.3, 0.3) * p.w, p.y + rnd2(-0.3, 0.3) * p.h, rnd2(6, 16) * p.u, j & 1 ? C.solid : C.plate);
          }
          if (!reduced) {
            flash = FLASH;
            shake = 0.3;
          }
          sfx("win");
        }
      }
      if (b.dt <= 0) bossWin();
    }
    function phaseLook() {
      var b = BO, p = BP[0], ph = b.phase;
      b.vp = Math.min(3, ph) + (ph === 4 ? 1 : 0);
      b.armT = 0;
      if (b.type === 0) {
        if (ph >= 3 && !b.d1) {
          b.d1 = 1;
          detach(BA.p1, p, -96, -32, Math.PI, 1);
        }
        if (ph >= 4 && !b.d2) {
          b.d2 = 1;
          b.d3 = 1;
          detach(BA.p1, p, 96, -32, 0, 1);
        }
      } else if (b.type === 1) {
        if (ph >= 4 && !b.d1) {
          b.d1 = 1;
          detach(BA.p2, p, 0, -76, 0, 1);
        }
      } else if (b.type === 2) {
        if (ph >= 4 && !b.d1) {
          b.d1 = 1;
          for (var k = 0; k < 2; k++) if (BP[k].alive) detach(BA.p1, BP[k], k ? -50 : 50, 30, k ? Math.PI : 0, 1);
        }
      } else {
        if (ph >= 3 && !b.d1) {
          b.d1 = 1;
          detach(BA.p1, p, 0, -80, 0, 1);
        }
        if (ph >= 4 && !b.d2) {
          b.d2 = 1;
          detach(BA.p3, p, 124, -6, 0.95, 1);
          detach(BA.p3, p, -124, -6, Math.PI - 0.95, 1);
        }
      }
    }
    var PHB = [
      ["faza 2: refactor", "faza 3: hotfix", "desperacja: spirala *"],
      ["faza 2: refactor", "faza 3: hotfix", "desperacja: OOM"],
      ["faza 2: refactor", "faza 3: hotfix", "desperacja: desync"],
      ["faza 2: refactor", "faza 3: core dump", "desperacja: bullet hell"]
    ];
    function phaseShift(np) {
      var b = BO, k;
      atkClear();
      b.phase = np;
      b.cnt = 0;
      b.last = -1;
      b.atk = -1;
      prN = 0;
      clearStack();
      queueNew(np);
      for (k = obN - 1; k >= 0; k--) shatter(OB[k]);
      obN = 0;
      setFs(np === 4 ? S_DESP : S_SHIFT, np === 4 ? DESP_S : SHIFT_S);
      hitstop = HITSTOP;
      if (!reduced) shake = 0.25;
      for (k = 0; k < b.n; k++) if (BP[k].alive) {
        plates(BP[k], np === 4 ? 16 : 10);
        BP[k].hit = 0.08;
      }
      showBanner(PHB[b.type][np - 2]);
      live.textContent = BN[b.type] + (np === 4 ? ": desperacja." : ": faza " + np + " z 3.");
      sfx("boss");
    }
    function bossDeal(p, u, sx, sy) {
      var b = BO, m, np, th, d, q2;
      if (b.st !== 2 || !p.alive || u <= 0) return;
      if (b.fs === S_SHIFT || b.fs === S_DESP || b.fs === S_INTRO || b.atk === A_JMP && b.fs === S_TELE) {
        if (sx) spark(sx, sy, true);
        return;
      }
      if (b.mtx >= 0 && p === BP[b.mtx]) {
        if (sx) spark(sx, sy, true);
        return;
      }
      m = b.fs === S_VULN ? DMG_EX : b.fs === S_STAG ? DMG_ST : armorMul();
      p.hp -= u * m;
      b.hit = 0.045;
      sfx("bhit");
      if (sx) spark(sx, sy, false);
      if (p.fc <= 0 || u > 5) {
        p.hit = 0.06;
        p.fc = 0.28;
      }
      if (b.gT <= 0) b.gT = 0.3;
      if (b.blk < -0.5) b.blk = 0.22;
      b.chip += u * m;
      while (b.chip >= 5) {
        b.chip -= 5;
        shard(p.x + rnd2(-0.4, 0.4) * p.w, p.y + rnd2(-0.3, 0.35) * p.h, rnd2(6, 11) * p.u, Math.random() < 0.5 ? C.deep : C.plate);
      }
      if (p.hp <= 0) {
        p.hp = 0;
        if (b.type === 2 && BP[0].alive && BP[1].alive) {
          p.alive = false;
          p.ov = 0;
          floater(p.x, p.y + p.h / 2, "druga przyspiesza");
          detach(p === BP[0] ? BA.h : BA.h2, p, p === BP[0] ? -1 : 1, 0, 0, 1);
          detach(BA.p1, p, p === BP[0] ? 50 : -50, 30, p === BP[0] ? 0 : Math.PI, 1);
          boom(p.x, p.y, 40 * p.u);
          if (b.mtx >= 0) b.mtx = -1;
        }
      }
      b.hp = BP[0].hp + (b.n === 2 ? BP[1].hp : 0);
      np = phaseOf(b.hp);
      if (np > b.phase && b.hp > 1e-3) {
        th = THR[b.phase - 1];
        if (b.hp < th) {
          d = th - b.hp;
          q2 = p.alive ? p : BP[p === BP[0] ? 1 : 0];
          q2.hp += d;
          b.hp = BP[0].hp + (b.n === 2 ? BP[1].hp : 0);
        }
        if (b.fs === S_STAG) b.pend = 1;
        else phaseShift(b.phase + 1);
      }
      tag();
      if (b.hp <= 1e-3) bossKill();
    }
    function bossBomb() {
      var b = BO, d = BOMB_DMG[mode2 === "unik" ? 1 : 0] * (1 + 0.5 * up.power) * (1 + val("power", P2.power) / 100), k, n = alive(), p;
      if (b.v2) {
        if (mode2 === "ogien") d = d / BOMB_DMG[0] * BOMB_BUL * 100 / b.need;
        B2.bomb(d);
        return;
      }
      if (b.st !== 2 || b.fs === S_INTRO || b.fs === S_SHIFT || b.fs === S_DESP) return;
      if (b.atk === A_COR && b.fs === S_TELE) {
        floater(ship.x, ship.y - 30 * s0, "parry");
        atkClear();
        b.cnt = 0;
        stagger();
        bossDeal(BP[0], d);
        return;
      }
      if ((b.fs === S_ATK || b.fs === S_TELE) && b.atk !== A_LCK && b.atk !== A_HEL) {
        floater(ship.x, ship.y - 30 * s0, "przerwane");
        atkClear();
        b.cnt++;
        setFs(S_REC, REC_S);
      }
      if (b.atk === A_LCK && b.fs === S_ATK) lockBreak();
      else if (b.fs === S_VULN) stagger();
      for (k = 0; k < b.n; k++) {
        p = BP[k];
        if (p.alive) bossDeal(p, d / n);
        if (b.st !== 2 || b.fs === S_SHIFT || b.fs === S_DESP) break;
      }
    }
    function bossKill() {
      var k, p = BP[0], b = BO;
      b.st = 3;
      b.dt = DEATH_S;
      b.et = 0;
      prN = 0;
      b.fT = b.age - b.il;
      atkClear();
      clearStack();
      setFs(S_DEATH, DEATH_S);
      if (b.type === 0) {
        if (!b.d2) {
          b.d2 = 1;
          detach(BA.p1, p, 96, -32, 0, 1);
        }
        if (!b.d1) {
          b.d1 = 1;
          detach(BA.p1, p, -96, -32, Math.PI, 1);
        }
      } else if (b.type === 1) {
        detach(BA.p1, p, -114, 0, 0, 1);
        detach(BA.p1, p, 114, 0, 0, -1);
      } else if (b.type === 2) {
        p = BP[0].alive ? BP[0] : BP[1];
        if (!b.d1) detach(BA.p1, p, p === BP[0] ? 50 : -50, 30, p === BP[0] ? 0 : Math.PI, 1);
      } else {
        if (!b.d2) {
          detach(BA.p3, p, 124, -6, 0.95, 1);
          detach(BA.p3, p, -124, -6, Math.PI - 0.95, 1);
        }
        if (!b.d1) {
          b.d1 = 1;
          detach(BA.p1, p, 0, -80, 0, 1);
        }
      }
      for (k = obN - 1; k >= 0; k--) shatter(OB[k]);
      obN = 0;
      sfx("boss");
      tag();
    }
    var GSC = [40, 60, 80], GR2 = { rows: [], sc: 0, g: 0, par: 0 };
    function dpsK(shop2) {
      var u = shop2 ? 0 : 1, fr = (1 + 0.35 * up.fire * u) * (1 + val("fire", P2.fire) / 100) * FXV.fireK, k = fr * dmgM * (1 + Math.max(up.dbl * u, val("dbl", P2.dbl) / 100)) * (1 + FXV.side) * (Math.min(1, val("pierce", P2.pierce) / 100 + 0.12 * (up.pierce || 0) * u + (FXV.ap || 0)) / ARMOR);
      if (FXV.laserS && mode2 === "ogien") k += 24 * dmgM / FXV.laserS / (7.14 * 1);
      if (FXV.drone) k += FXV.drone * 0.7 * dmgM / 7.14;
      if (FXV.shrapM || up.shrap && u) k *= 1 + 2 * Math.max(FXV.shrapM, up.shrap && u ? 0.3 : 0) * 0.8;
      return mode2 === "unik" ? (1 + 0.5 * up.power * u) * (1 + val("power", P2.power) / 100) + (FXV.drone ? FXV.drone * 0.07 : 0) : k;
    }
    function grade() {
      var b = BO, d = Math.max(1, b.fT), ty = b.type, R = GR2.rows, base2 = b.v2 ? NEED2[ty] : BNEED[ty], par = (mode2 === "unik" ? b.v2 ? PARU2[ty] : PAR[ty] * 1.2 : b.v2 ? PAR2[ty] : PAR[ty]) * (b.need / base2) / Math.pow(dpsK(), 0.75), pt, mx = 0, sum = 0, gpm = fG / (d / 60), parts = b.v2 ? B2.E.shotN : -1, v;
      R.length = 0;
      function row2(n, val2, p, m) {
        R.push({ n, v: val2, p: Math.round(p), m });
        sum += p;
        mx += m;
      }
      pt = 35 * clamp2((1.6 * par - d) / (0.8 * par), 0, 1);
      row2("czas", Math.round(d) + " s (norma " + Math.round(par) + " s)", pt, 35);
      row2("muśnięcia", fG + " (" + Math.round(gpm) + "/min)", 20 * clamp2(gpm / 12, 0, 1), 20);
      if (parts >= 0) row2("zniszczone części", parts + " / 5", 15 * Math.min(4, parts) / 4, 15);
      row2("ogłuszenia", String(b.stg), Math.min(12, b.stg * 4), 12);
      if (mode2 === "unik") {
        v = fB ? b.stg / fB : 0;
        row2("bomby w odsłonięcie", b.stg + " / " + fB, 18 * clamp2(v, 0, 1), 18);
      } else row2("bomby poza odsłonięciem", Math.max(0, fB - b.stg) + " / " + fB, Math.max(0, 18 - 4 * Math.max(0, fB - b.stg)), 18);
      row2("trafienia w tarczę", String(b.hits), -10 * b.hits, 0);
      GR2.sc = Math.max(0, Math.round(100 * sum / mx));
      GR2.par = par;
      GR2.g = GR2.sc >= GSC[2] ? 3 : GR2.sc >= GSC[1] ? 2 : GR2.sc >= GSC[0] ? 1 : 0;
      return GR2.g;
    }
    function bossWin() {
      var bonus = 500 * (BO.tier + 1), g = grade(), k = KEYP + "ocena." + BO.type, bg = load(k), rb, tt, kb, kg;
      score += bonus;
      bombs = Math.min(5, bombs + 1);
      kb = Math.round(KR.boss[BO.type] * (1 + KR.bossLoop * Math.floor(BO.tier / 4)));
      kg = KR.grade[g];
      KRR.boss += kb;
      KRR.ocena += kg;
      bank(false);
      earned[BO.type] = 1;
      lastBoss = BO.type;
      stopLoop();
      go("merge");
      diedBoss = false;
      gradeLast = g;
      if (g + 1 > bg) save(k, g + 1);
      if (BO.type === 3 && !sudo) save(KEYP + "sudo", 1);
      q(".dcg-mbi canvas").setAttribute("data-i", "b" + (BO.type + 1));
      q(".dcg-cm").textContent = "merge: " + BN[BO.type];
      q(".dcg-mb").textContent = "+" + bonus + " punktów";
      q(".dcg-mkr b").textContent = "+₡ " + (kb + kg);
      q(".dcg-mkr span").textContent = "boss " + kb + " · ocena " + GRADES[g] + " " + kg + " · w tej rundzie ₡ " + krRun() + (god ? " · test: bez zapisu" : "");
      q(".dcg-gr").textContent = GRADES[g];
      q(".dcg-gd").textContent = "ocena " + GR2.sc + " / 100 · S od " + GSC[2] + ", A od " + GSC[1] + ", B od " + GSC[0] + (bg ? " · najlepsza " + GRADES[Math.max(bg - 1, g)] : "");
      var gh = "", gj, gr;
      for (gj = 0; gj < GR2.rows.length; gj++) {
        gr = GR2.rows[gj];
        gh += "<div><span>" + gr.n + "</span><em>" + gr.v + '</em><b class="' + (gr.p < 0 ? "dcg-neg" : "") + '">' + (gr.p > 0 ? "+" : "") + gr.p + (gr.m ? " / " + gr.m : "") + "</b></div>";
      }
      q(".dcg-gbr").innerHTML = gh;
      rushN = rush ? rushN + 1 : 0;
      tt = q(".dcg-rt");
      if (rush && rushN >= 4) {
        rb = load(KEYP + "rush." + mode2);
        k = Math.round(t * 10);
        if (!rb || k < rb) {
          save(KEYP + "rush." + mode2, k);
          rb = k;
        }
        tt.textContent = "boss rush: " + fmtT(k) + " · rekord " + fmtT(rb);
        tt.hidden = false;
      } else tt.hidden = true;
      paintIcons(ovMerge);
      ui();
      draw();
      showScr("merge", "[data-a=next]");
      live.textContent = "Merge: " + BN[BO.type] + ". Ocena " + GRADES[g] + ". Plus " + bonus + " punktów, jedna bomba i " + (kb + kg) + " kredytów.";
      sfx("win");
    }
    function fmtT(ds) {
      var m = Math.floor(ds / 600), s2 = ds % 600 / 10;
      return m + ":" + (s2 < 10 ? "0" : "") + s2.toFixed(1).replace(".", ",");
    }
    function pickScreen() {
      var pool = [], k, n, h = "", id, u;
      if (rush && rushN >= 4) {
        rush = false;
        rushN = 0;
        exit(true);
        return;
      }
      for (k = 0; k < UKEYS.length; k++) {
        id = UKEYS[k];
        u = UPS[id];
        if (u.og && mode2 !== "ogien") continue;
        if (up[id] >= u.max || id === "shield" && (shieldOn || sudo)) continue;
        pool.push(id);
      }
      if (!pool.length) {
        resumeAfterBoss();
        return;
      }
      pickIds = [];
      for (n = 0; n < 3 && pool.length; n++) pickIds.push(pool.splice(Math.random() * pool.length | 0, 1)[0]);
      for (k = 0; k < pickIds.length; k++) {
        u = UPS[pickIds[k]];
        h += '<button type="button" class="dcg-b dcg-card" data-u="' + pickIds[k] + '" aria-label="' + (k + 1) + ". " + u.n + ". " + u.d + '"><span class="dcg-ix">' + (k + 1) + "</span>" + ibtn(u.i, 32, "b", 1) + '<span class="dcg-col" style="gap:4px"><span class="dcg-ct">' + u.n + '</span><span class="dcg-cd">' + u.d + "</span></span></button>";
      }
      q(".dcg-cards").innerHTML = h;
      paintIcons(ovPick);
      go("pick");
      showScr("pick", ".dcg-card");
    }
    function applyUp(id) {
      if (!UPS[id] || up[id] >= UPS[id].max || id === "shield" && sudo) return;
      up[id]++;
      if (id === "shield") shieldOn = true;
      if (id === "cache") step = Math.round(800 * val("cache", P2.cache) / 1e3);
      visLv();
      if (id === "graze") {
        grazeBonus = val("graze", P2.graze) + 10 * up.graze;
        grazeTxt = "+" + grazeBonus + " muśnięcie";
      }
    }
    var CP_NEXT_S = 12, cpRun = false;
    function cpKey() {
      return KEYP + "cp." + mode2 + (sudo ? ".sudo" : "") + (set.arena !== false ? "" : ".kamp");
    }
    function loadJ(k) {
      try {
        var v = G.localStorage.getItem(k);
        return v ? JSON.parse(v) : null;
      } catch (e) {
        return null;
      }
    }
    function saveJ(k, v) {
      try {
        if (v) G.localStorage.setItem(k, JSON.stringify(v));
        else G.localStorage.removeItem(k);
      } catch (e) {
      }
    }
    function resumeAfterBoss() {
      if (!rush && testTier < 0 && !god) {
        var u0 = {}, k0;
        for (k0 in up) u0[k0] = up[k0];
        saveJ(cpKey(), { score, bombs, wave, waveT, t, nb: nextBomb, step, up: u0, sh: shieldOn, tier: bossTier, nbt: waveT + CP_NEXT_S, ar: armorN });
      }
      scr.hideAll();
      BO.on = false;
      BO.st = 0;
      tag();
      ensureArt(bossTier % 4);
      grace = 1.2;
      spawnT = 1;
      invul = 0.8;
      prN = 0;
      if (rush) {
        tb = 2;
        tbTier = bossTier;
      } else {
        clearT = 0;
        moby.startWave(wave);
      }
      go("play");
      ui();
      try {
        root2.focus({ preventScroll: true });
      } catch (e) {
        root2.focus();
      }
      startLoop();
    }
    function addCombo() {
      var m0 = comboM;
      combo++;
      comboT = comboS;
      comboM = combo >= 15 ? 4 : combo >= 8 ? 3 : combo >= 3 ? 2 : 1;
      if (comboM > m0 && comboM >= 3) KRR.inne += comboM === 4 ? KR.combo4 : KR.combo3;
      if (comboM > comboMax) comboMax = comboM;
    }
    function clampShip() {
      var mx = 11 * s0, nx = clamp2(ship.x, mx, W - mx), ny = clamp2(ship.y, 14 * s0, H - 20 * s0);
      if (nx !== ship.x) {
        ship.x = nx;
        ship.vx = 0;
      }
      if (ny !== ship.y) {
        ship.y = ny;
        ship.vy = 0;
      }
    }
    var autoFire = !!(opts.autoFire || qs && qs.get("auto") === "1" || typeof navigator !== "undefined" && navigator.webdriver && !(qs && qs.get("auto") === "0"));
    function firing() {
      return autoFire || mFire || keys.f || padFire || drag.on && drag.id !== "lock";
    }
    function locked() {
      return doc.pointerLockElement === cv;
    }
    function lockMouse() {
      if (touch || autoFire || locked() || !cv.requestPointerLock) return;
      try {
        var r = cv.requestPointerLock();
        if (r && r.catch) r.catch(function() {
        });
      } catch (e) {
      }
    }
    function onLock() {
      if (locked()) {
        if (state === "play") {
          drag.on = true;
          drag.id = "lock";
          drag.sx = drag.tx = ship.x;
          drag.sy = drag.ty = ship.y;
        }
        return;
      }
      mFire = 0;
      if (drag.id === "lock") {
        drag.on = false;
        drag.id = null;
      }
      if (state === "play") pause();
    }
    function onMouseMove(e) {
      if (!locked() || !drag.on || drag.id !== "lock") return;
      var mx = 11 * s0;
      drag.tx = clamp2(drag.tx + e.movementX * MOUSE_K, mx, W - mx);
      drag.ty = clamp2(drag.ty + e.movementY * MOUSE_K, 14 * s0, H - 20 * s0);
    }
    function onMouseUp(e) {
      if (e.button === 0) mFire = 0;
    }
    function moveShip(dt) {
      if (dt <= 0) return;
      var sp = clamp2(Math.min(W, H) * 0.75, 260, 440) * (1 + 0.12 * up.agile) * (1 + val("agile", P2.agile) / 100) * (1 + val("engine", P2.engine) / 100) * FXV.spdK;
      if (drag.on) {
        var k = 1 - Math.exp(-dt * 30), nx = ship.x + (drag.tx - ship.x) * k, ny = ship.y + (drag.ty - ship.y) * k;
        ship.vx = (nx - ship.x) / dt;
        ship.vy = (ny - ship.y) / dt;
        ship.x = nx;
        ship.y = ny;
      } else {
        var ix = clamp2(keys.r - keys.l + padX, -1, 1), iy = clamp2(keys.d - keys.u + padY, -1, 1), a = 1 - Math.exp(-dt * (16 + 4 * up.agile + 2 * P2.agile)), il = Math.sqrt(ix * ix + iy * iy);
        if (il > 1) {
          ix /= il;
          iy /= il;
        }
        ship.vx += (ix * sp - ship.vx) * a;
        ship.vy += (iy * sp - ship.vy) * a;
        ship.x += ship.vx * dt;
        ship.y += ship.vy * dt;
      }
      if (BO.on && BO.st === 2) {
        var px = 0, py = 0, d, lo;
        if (BO.atk === A_SWP && BO.fs === S_ATK) {
          px = BP[0].x - ship.x;
          py = BP[0].y - ship.y;
          d = Math.sqrt(px * px + py * py) || 1;
          px = px / d * sp * 0.52 * BO.vk * dt;
          py = py / d * sp * 0.52 * BO.vk * dt;
        }
        if (BO.wl > 0) {
          lo = BO.wl + 9 * s0;
          if (ship.x + px < lo) px = lo - ship.x;
          else if (ship.x + px > W - lo) px = W - lo - ship.x;
        }
        ship.x += px;
        ship.y += py;
        if (drag.on) {
          drag.sx += px;
          drag.sy += py;
          drag.tx += px;
          drag.ty += py;
        }
      }
      clampShip();
      tilt += (clamp2(ship.vx / sp, -1, 1) - tilt) * Math.min(1, dt * 12);
      if ((trT += dt) >= 0.03) {
        trT = 0;
        trI = (trI + 1) % 5;
        TRX[trI] = ship.x;
        TRY[trI] = ship.y;
      }
    }
    function grazed(boss) {
      score += grazeBonus * comboM;
      grazeN++;
      addCombo();
      if (++grazeK >= KR.grazeN) {
        grazeK = 0;
        KRR.inne++;
      }
      floater(ship.x, ship.y - 26 * s0, comboM > 1 ? grazeTxt + " ×" + comboM : grazeTxt);
      sfx("graze");
      var dbl2 = syn("slizg") && Math.abs(ship.vx) + Math.abs(ship.vy) > clamp2(Math.min(W, H) * 0.75, 260, 440) * 0.8;
      if (dbl2) {
        score += grazeBonus * comboM;
        SYC.slizg++;
        if (++grazeK >= KR.grazeN) {
          grazeK = 0;
          KRR.inne++;
        }
      }
      if (boss && mode2 === "unik" && BO.on) bmeter += 1 / UNIK_GRAZE * FXV.kondK;
      if (boss && BO.v2) B2.graze();
      if (boss && BO.on && BO.st === 2) fG++;
      if (boss && FXV.reson && BO.on && BO.st === 2) {
        WST.reson++;
        if (BO.v2) B2.pctHit(FXV.reson * (dbl2 ? 2 : 1));
        else bossDeal(nearP(), FXV.reson * (dbl2 ? 2 : 1));
      }
    }
    function fixmeBoom(o) {
      var x = o.x + o.w / 2, y = o.y + o.h / 2, v = 210 * clamp2(H / 600, 0.75, 1.3), j;
      for (j = 0; j < (wave >= 6 ? 8 : 4); j++) proj(x, y, Math.cos(j * Math.PI / (wave >= 6 ? 4 : 2)) * v, Math.sin(j * Math.PI / (wave >= 6 ? 4 : 2)) * v, 8, 5 * s0);
      burst(x, y, 16, 220);
      sfx("kill");
    }
    function bgTick(sd) {
      var bgk = (reduced ? 0.4 : 1) * (1 + 0.06 * (wave - 1)), k, o;
      cityOff = (cityOff + 8 * bgk * sd) % cityP;
      for (k = 0; k < clouds.length; k++) {
        o = clouds[k];
        o.y += (o.far ? 20 : 52) * bgk * sd * (o.gl ? 1.6 : 1);
        if (o.y > H + 4) cloud(o, o.far, -o.h - rnd2(0, 60));
      }
    }
    function update(dt) {
      var sd = state === "dying" ? dt * 0.35 : dt, k, j, o, p, b, f, nw, x0, x1, q2, bhr;
      if (slowT > 0) {
        slowT -= dt;
        sd *= 0.5;
      }
      if (godCd > 0) godCd -= dt;
      if (comboT > 0 && (comboT -= dt) <= 0) {
        combo = 0;
        comboM = 1;
      }
      if (state === "play") {
        t += dt;
        score += dt * 20;
        if ((krT += dt) >= KR.timeS) {
          krT -= KR.timeS;
          KRR.czas += mode2 === "unik" ? KR.unik : 1;
        }
        if (!BO.on) {
          if (rush) waveT += dt;
          else {
            waveT = Math.min(waveT + dt, wave * WAVE_S - 1e-3);
            if (moby.done() && (clearT += dt) > BREATH_S) {
              clearT = 0;
              waveT = wave * WAVE_S;
            }
          }
          nw = 1 + Math.floor(waveT / WAVE_S);
          if (nw !== wave) {
            KRR.fale += Math.min(KR.waveMax, KR.wave + KR.waveUp * wave) * (mode2 === "unik" ? KR.unik : 1);
            wave = nw;
            setBanner();
            clearT = 0;
            if (!rush && !(tb < 0 && !noBoss && waveT >= nextBossT)) moby.startWave(wave);
          }
          if (tb > 0 && (tb -= dt) <= 0) {
            tb = -1;
            bossTier = tbTier;
            nextBossT = waveT + BOSS_EVERY * WAVE_S;
            moby.leave();
            bossStart();
            bossTier++;
          } else if (tb < 0 && !rush && !noBoss && waveT >= nextBossT) {
            nextBossT = waveT + BOSS_EVERY * WAVE_S;
            moby.leave();
            bossStart();
            bossTier++;
          }
        }
        if (score >= nextBomb) {
          nextBomb += step;
          if (bombs < bombMax) {
            bombs++;
            floater(ship.x, ship.y - 34 * s0, "+1 bomba");
            ui();
          }
        }
        if (FXV.shieldS && !shieldOn && !sudo) {
          if ((shRegT += dt) >= FXV.shieldS) {
            shRegT = 0;
            shieldOn = true;
            floater(ship.x, ship.y - 34 * s0, "tarcza gotowa");
            sfx("ok");
          }
        } else shRegT = 0;
        if (BO.on && BO.st === 2 && mode2 === "unik") {
          bmeter += dt / UNIK_FILL * FXV.kondK;
          if (bmeter >= 1) {
            if (bombs < bombMax) {
              bmeter -= 1;
              bombs++;
              floater(ship.x, ship.y - 34 * s0, "+1 bomba");
              ui();
            } else bmeter = 1;
          }
        }
        moveShip(dt);
        if (escOn) escRec(dt);
        if (grace > 0) grace -= dt;
        if (invul > 0) invul -= dt;
        if (eliteCd > 0) eliteCd -= dt;
        if (!BO.on && (moby.rain() || rush || testElite)) {
          spawnT -= sd;
          if (spawnT <= 0 && grace <= 0) {
            spawn();
            spawnT = interval();
          }
          if (ELP.k && (ELP.t -= sd) <= 0) eliteGo();
        }
        if (mode2 === "ogien" && !firing()) fireT = Math.max(0, fireT - dt);
        else if (mode2 === "ogien") {
          fireT -= dt;
          if (fireT <= 0) {
            fireT = Math.max(0, fireT + 0.14 / (1 + 0.35 * up.fire) / (1 + val("fire", P2.fire) / 100) / FXV.fireK);
            shoot();
          }
        }
        if (mode2 === "ogien") {
          laserTick(dt);
          droneTick(dt);
          if (bastionT > 0 && (bastionT -= dt) <= 0) {
            armorN++;
            SYC.bastion++;
            floater(ship.x, ship.y - 34 * s0, "płyta odrosła");
            sfx("ok");
            ui();
          }
        }
      } else if ((dieT -= dt) <= 0) {
        gameOver();
        return;
      }
      if (banner > 0) banner -= dt;
      if (flash > 0) flash -= dt;
      if (shake > 0) shake -= dt;
      if (shipShake > 0) shipShake -= dt;
      if (BO.on && state !== "start") {
        bossUpdate(sd);
        if (BO.on && BO.st >= 1 && obN) clearBand();
      }
      if (state === "merge") return;
      if (state !== "start") moby.update(dt, sd);
      if (chN) chipTick(sd);
      if (krPulse > 0) krPulse -= dt;
      cityW = clamp2(cityW + (BO.on && BO.st === 2 ? sd * 0.7 : -sd * 0.5), 0, 1);
      despP = BO.on && BO.st === 2 && BO.phase === (BO.v2 ? 6 : 4) && !reduced ? despP + sd : 0;
      bgTick(sd);
      var hx1 = ship.x - 6 * s0, hx2 = ship.x + 6 * s0, hy1 = ship.y - 9 * s0, hy2 = ship.y + 9 * s0, gz = (12 + 8 * up.graze + 2 * P2.graze) * s0, dx, dy;
      for (k = obN - 1; k >= 0; k--) {
        o = OB[k];
        o.y += o.vy * sd;
        if (o.el === 1) {
          if (o.ex < 0 && o.x < o.y1 || o.ex > 0 && o.x > o.y1) {
            o.x += o.vx * sd;
            if (o.ex < 0 === o.x > o.y1) o.x = o.y1;
          }
        } else if (o.el === 2 && !o.rv && o.y >= o.y1) {
          o.rv = 1;
          o.vy = -Math.abs(o.vy) * 1.25;
        } else if (o.el === 3) {
          if (!o.fz && state === "play" && o.y > ship.y + 26 * s0) o.fz = 0.35;
          if (o.fz > 0 && (o.fz -= sd) <= 0) {
            fixmeBoom(o);
            removeOb(k);
            continue;
          }
        }
        if (o.hit > 0) o.hit -= dt;
        if (o.y > H + 2 || o.rv && o.y < -o.h - 4) {
          removeOb(k);
          continue;
        }
        if (state !== "play") continue;
        x0 = o.el === 1 && o.ex < 0 ? 0 : o.x;
        x1 = o.el === 1 && o.ex > 0 ? W : o.x + o.w;
        dx = x0 > hx2 ? x0 - hx2 : hx1 > x1 ? hx1 - x1 : 0;
        dy = o.y > hy2 ? o.y - hy2 : hy1 > o.y + o.h ? hy1 - o.y - o.h : 0;
        if (dx === 0 && dy === 0) {
          if (hurt()) break;
        } else if (dy === 0 && dx < gz) {
          if (!o.near) o.near = 1;
        } else if (o.near === 1) {
          o.near = 2;
          grazed(false);
        }
      }
      for (k = prN - 1; k >= 0; k--) {
        p = PR[k];
        p.t += sd;
        bhr = 0;
        if (p.bh) {
          bhr = B2.prTick(p, sd);
          if (bhr === 1) {
            PR[k] = PR[prN - 1];
            PR[prN - 1] = p;
            prN--;
            continue;
          }
        }
        if (bhr === 2) {
        } else if (p.g === 3) {
          if (p.s === 0) {
            p.vx *= 1 - Math.min(1, sd * 4);
            p.vy *= 1 - Math.min(1, sd * 4);
            if (p.t > 0.45) p.s = 1;
          } else if (p.s === 1) {
            p.a = Math.atan2(ship.y - p.y, ship.x - p.x);
            p.rot = p.a;
            p.vx = p.vy = 0;
            if (p.t > 0.95 + k % 5 * 0.08) {
              p.s = 2;
              f = 520 * clamp2(H / 600, 0.75, 1.3) * BO.vk;
              p.vx = Math.cos(p.a) * f;
              p.vy = Math.sin(p.a) * f;
            }
          }
        } else if (p.g === 5) {
          f = Math.atan2(ship.y - p.y, ship.x - p.x);
          p.vx += (Math.cos(f) * 70 - p.vx) * Math.min(1, sd * 1.5);
          p.vy += (Math.sin(f) * 70 - p.vy) * Math.min(1, sd * 1.5);
          p.r = Math.min(34, 8 + p.t * 5.5) * s0;
          if (p.t > p.life) {
            if (mode2 === "ogien") for (j = 0; j < 8; j++) proj(p.x, p.y, Math.cos(j * 0.785) * 170, Math.sin(j * 0.785) * 170, 6, 6 * s0);
            burst(p.x, p.y, 10, 160);
            PR[k] = PR[prN - 1];
            PR[prN - 1] = p;
            prN--;
            continue;
          }
        } else if (p.g === 6 && p.life > 0) {
          if (p.x < p.r) p.vx = Math.abs(p.vx);
          else if (p.x > W - p.r) p.vx = -Math.abs(p.vx);
          if (p.y < p.r) p.vy = Math.abs(p.vy);
          else if (p.y > H - p.r) p.vy = -Math.abs(p.vy);
          if (p.t > p.life) {
            PR[k] = PR[prN - 1];
            PR[prN - 1] = p;
            prN--;
            continue;
          }
        } else if (p.g === 9) {
          f = H - STK[p.k] * pj[9].h - p.hh;
          if (p.y + p.vy * sd >= f) {
            if (STK[p.k] < 3) {
              STK[p.k]++;
              STT[p.k] = 7;
            } else burst(p.x, f, 8, 140);
            if (!reduced) shake = Math.max(shake, 0.06);
            PR[k] = PR[prN - 1];
            PR[prN - 1] = p;
            prN--;
            continue;
          }
        }
        if (bhr !== 2) {
          p.x += p.vx * sd;
          p.y += p.vy * sd;
        }
        if (p.x < -120 || p.x > W + 120 || p.y > H + 40 || p.y < -120) {
          PR[k] = PR[prN - 1];
          PR[prN - 1] = p;
          prN--;
          continue;
        }
        if (state !== "play") continue;
        if (p.hw) {
          dx = Math.max(0, Math.abs(p.x - ship.x) - p.hw - 6 * s0);
          dy = Math.max(0, Math.abs(p.y - ship.y) - p.hh - 9 * s0);
          f = dx === 0 && dy === 0;
          dx = dx + dy;
        } else {
          dx = p.x - ship.x;
          dy = p.y - ship.y;
          f = Math.sqrt(dx * dx + dy * dy) - p.r - 5.5 * s0;
          dx = f;
          f = f < 0;
        }
        if (f) {
          if (p.g !== 9 && p.g !== 10 && p.g !== 4 && p.g !== 7) {
            PR[k] = PR[prN - 1];
            PR[prN - 1] = p;
            prN--;
          }
          if (hurt()) break;
        } else if (dx < gz) {
          if (!p.near) p.near = 1;
        } else if (p.near === 1) {
          p.near = 2;
          grazed(true);
        }
      }
      for (k = 0; k < NSK; k++) if (STK[k]) {
        if ((STT[k] -= sd) <= 0) {
          burst((k + 0.5) * W / NSK, H - STK[k] * pj[9].h / 2, 12, 160);
          STK[k] = 0;
          continue;
        }
        if (state === "play" && hy2 > H - STK[k] * pj[9].h && hx2 > k * W / NSK && hx1 < (k + 1) * W / NSK) hurt();
      }
      if (BO.on && BO.st === 2 && state === "play") {
        b = BO;
        if (b.bm) {
          eye2(BP[0], 0);
          dx = ship.x - EX;
          dy = ship.y - EY;
          f = Math.cos(b.bmA) * dx + Math.sin(b.bmA) * dy;
          if (f > 0 && Math.abs(-Math.sin(b.bmA) * dx + Math.cos(b.bmA) * dy) < b.bmHW + 5 * s0) hurt();
        }
        if (b.atk === A_LCK && b.fs === S_ATK && b.lockHp > 0) {
          f = 4 * s0;
          for (j = 0; j < 3; j++) if (Math.abs(ship.x - b.lx[j]) < f + 6 * s0 && ship.y > b.ly[0] - (b.ly[1] - b.ly[0]) * 0.8) hurt();
          for (j = 0; j < 2; j++) if (Math.abs(ship.y - b.ly[j]) < f + 9 * s0) hurt();
        }
      }
      if (state === "play") {
        var bd = 100 / BO.need;
        for (k = blN - 1; k >= 0; k--) {
          b = BL[k];
          b.y -= 760 * dt;
          if (b.vx) b.x += b.vx * dt;
          var gone = b.y < -12 || b.x < -12 || b.x > W + 12 || moby.shot(b.x, b.y, dmgM * b.dm);
          for (j = obN - 1; !gone && j >= 0; j--) {
            o = OB[j];
            x0 = o.el === 1 && o.ex < 0 ? 0 : o.x;
            x1 = o.el === 1 && o.ex > 0 ? W : o.x + o.w;
            if (o !== b.lh && b.x >= x0 - 1 && b.x <= x1 + 1 && b.y <= o.y + o.h && b.y + 9 >= o.y) {
              gone = true;
              if (b.pc > 0 && o.el !== 1) {
                b.pc--;
                b.lh = o;
                gone = false;
                WST.pierce++;
              }
              if (o.el === 3) {
                chip(o.x + o.w / 2, o.y, 1);
                fixmeBoom(o);
                removeOb(j);
                score += 30;
              } else if ((o.hp -= dmgM * b.dm) <= 1e-3) {
                if (o.hv || o.el) chip(o.x + o.w / 2, o.y + o.h / 2, o.el ? KR.elite : KR.heavy);
                score += (o.hv ? 50 : o.el ? 80 : 10) * comboM;
                addCombo();
                if (o.hv || o.el) floater(o.x + o.w / 2, o.y, o.el ? "+" + 80 * comboM + " elita" : "+50 dekompilacja");
                if (o.el) burst(o.x + o.w / 2, o.y, 24, 240);
                else shatter(o);
                removeOb(j);
                sfx("kill");
              } else {
                o.hit = 0.09;
                sfx("hit");
              }
            }
          }
          if (!gone && BO.on && BO.st === 2) {
            for (j = 0; j < prN; j++) {
              p = PR[j];
              if (p.g !== 5) continue;
              dx = b.x - p.x;
              dy = b.y - p.y;
              if (dx * dx + dy * dy < p.r * p.r) {
                gone = true;
                spark(b.x, b.y, false);
                if (--p.hp <= 0) {
                  burst(p.x, p.y, 12, 200);
                  score += 25 * comboM;
                  addCombo();
                  PR[j] = PR[prN - 1];
                  PR[prN - 1] = p;
                  prN--;
                }
                break;
              }
            }
            q2 = BO;
            if (!gone && q2.atk === A_LCK && q2.fs === S_ATK && q2.lockHp > 0 && Math.abs(b.x - q2.lx[1]) < 14 * s0 && Math.abs(b.y - (q2.ly[0] + q2.ly[1]) / 2) < 16 * s0) {
              gone = true;
              spark(b.x, b.y, false);
              if (--q2.lockHp <= 0) lockBreak();
            }
          }
          if (!gone && BO.on && BO.v2 && BO.st >= 1) {
            gone = B2.lockShot(b.x, b.y) || B2.shot(b.x, b.y, bd * dmgM * b.dm, b.ap);
            if (gone && BO.st === 2) shrap(b);
          }
          if (!gone && BO.on && BO.st >= 1) {
            for (j = 0; j < BO.n; j++) {
              p = BP[j];
              if (!p.alive) continue;
              if (b.x >= p.x - p.w * 0.46 && b.x <= p.x + p.w * 0.46 && b.y <= p.y + p.h * 0.42 && b.y + 9 >= p.y - p.h * 0.42) {
                gone = true;
                if (BO.st === 2) {
                  score += 2;
                  bossDeal(p, bd * dmgM * b.dm, b.x, b.y);
                  shrap(b);
                }
                break;
              }
            }
          }
          if (gone) {
            BL[k] = BL[blN - 1];
            BL[blN - 1] = b;
            blN--;
          }
        }
      }
      for (k = ptN - 1; k >= 0; k--) {
        p = PT[k];
        p.vy += 380 * sd;
        p.x += p.vx * sd;
        p.y += p.vy * sd;
        p.life -= sd;
        if (p.life <= 0 || p.y > H + 20) {
          PT[k] = PT[ptN - 1];
          PT[ptN - 1] = p;
          ptN--;
        }
      }
      for (k = exN - 1; k >= 0; k--) {
        o = EXP[k];
        if ((o.life -= sd) <= 0) {
          EXP[k] = EXP[exN - 1];
          EXP[exN - 1] = o;
          exN--;
        }
      }
      for (k = shN - 1; k >= 0; k--) {
        o = SHD[k];
        o.vy += 420 * sd;
        o.x += o.vx * sd;
        o.y += o.vy * sd;
        o.a += o.va * sd;
        if ((o.life -= sd) <= 0) {
          SHD[k] = SHD[shN - 1];
          SHD[shN - 1] = o;
          shN--;
        }
      }
      for (k = 0; k < DTP.length; k++) {
        o = DTP[k];
        if (o.life > 0) {
          o.vy += 420 * sd;
          o.x += o.vx * sd;
          o.y += o.vy * sd;
          o.a += o.va * sd;
          o.life -= sd;
        }
      }
      for (k = flN - 1; k >= 0; k--) {
        f = FL[k];
        f.y -= 34 * dt;
        f.life -= dt;
        if (f.life <= 0) {
          FL[k] = FL[flN - 1];
          FL[flN - 1] = f;
          flN--;
        }
      }
    }
    function base(c) {
      c.setTransform(dpr, 0, 0, dpr, dpr * shx, dpr * shy);
    }
    function pl(c, pts) {
      c.beginPath();
      c.moveTo(pts[0], pts[1]);
      for (var j = 2; j < pts.length; j += 2) c.lineTo(pts[j], pts[j + 1]);
      c.closePath();
    }
    var vz = { fire: 0, dbl: 0, graze: 0, slow: 0, power: 0, agile: 0, cache: 0, dmg: 0, armor: 0, sbomb: 0, magnet: 0, shield: 0, engine: 0 };
    var MNT = { id: "", k: 1 };
    function visLv() {
      vz.fire = Math.min(3, Math.max(up.fire, Math.ceil(P2.fire * 0.75)));
      vz.dbl = up.dbl || P2.dbl ? 1 : 0;
      vz.graze = Math.min(2, Math.max(up.graze, Math.ceil(P2.graze / 2)));
      vz.slow = up.slow || P2.slow ? 1 : 0;
      vz.power = up.power || P2.power ? 1 : 0;
      vz.agile = up.agile || P2.agile ? 1 : 0;
      vz.cache = up.cache || P2.cache ? 1 : 0;
      vz.engine = P2.engine;
      vz.dmg = P2.dmg;
      vz.armor = P2.armor;
      vz.sbomb = P2.sbomb;
      vz.magnet = P2.magnet;
      vz.shield = P2.shield;
    }
    function mp(c, id) {
      if (MNT.k >= 1 || MNT.id !== id) return false;
      var e = 1 - MNT.k;
      c.save();
      c.globalAlpha *= Math.min(1, MNT.k * 1.6);
      c.translate(e * e * 9, -e * e * 16);
      return true;
    }
    var LOGO_INK = [3, 3, 4, 2, 2, 4, 2, 8, 3, 11, 4, 2], LOGO_BONE = [9, 3, 5, 2, 9, 4, 2, 4, 9, 7, 5, 2, 12, 8, 2, 4, 9, 11, 5, 2];
    function shipLogo(c) {
      var x0 = -4, y0 = 1, u = 0.5, j;
      c.fillStyle = C.ink;
      c.fillRect(x0 - 0.5, y0 - 0.5, 9, 9);
      c.fillStyle = C.acc;
      c.fillRect(x0, y0, 8, 8);
      c.fillStyle = C.ink;
      for (j = 0; j < LOGO_INK.length; j += 4) c.fillRect(x0 + LOGO_INK[j] * u, y0 + LOGO_INK[j + 1] * u, LOGO_INK[j + 2] * u, LOGO_INK[j + 3] * u);
      c.fillStyle = C.bone;
      for (j = 0; j < LOGO_BONE.length; j += 4) c.fillRect(x0 + LOGO_BONE[j] * u, y0 + LOGO_BONE[j + 1] * u, LOGO_BONE[j + 2] * u, LOGO_BONE[j + 3] * u);
      c.fillStyle = C.acc;
      c.fillRect(x0 + 0.5, y0 + 3.1, 7, 0.35);
      c.fillRect(x0 + 0.5, y0 + 5.1, 7, 0.35);
    }
    function drawShip(c, x, y, s) {
      var a = tilt * 0.22, cs = Math.cos(a), sn = Math.sin(a), sx = 1 - 0.1 * Math.abs(tilt), L, j, fl, k, sk = SKINI[shop.skin] || SKINI.std, hull = BO.panic ? C.ink : sk.hull, sp2 = ship.vx * ship.vx + ship.vy * ship.vy, m;
      s *= 1.2;
      if (sp2 > 9e4 && !reduced) {
        c.fillStyle = C.allyDeep;
        for (j = 1; j <= 3; j++) {
          k = (trI - j + 5) % 5;
          c.globalAlpha = 0.34 - j * 0.09;
          c.setTransform(dpr * cs * sx * s, dpr * sn * sx * s, -dpr * sn * s, dpr * cs * s, dpr * (TRX[k] + shx), dpr * (TRY[k] + shy));
          pl(c, SH_BODY);
          c.fill();
          pl(c, SH_WL);
          c.fill();
          pl(c, SH_WR);
          c.fill();
        }
        c.globalAlpha = 1;
      }
      if (shipShake > 0 && !reduced) {
        x += rnd2(-2.2, 2.2);
        y += rnd2(-1.6, 1.6);
      }
      if (invul > 0 && (reduced || (t * 14 | 0) % 2)) c.globalAlpha = 0.5;
      c.setTransform(dpr * cs * sx * s, dpr * sn * sx * s, -dpr * sn * s, dpr * cs * s, dpr * (x + shx), dpr * (y + shy));
      fl = reduced ? 0.5 : Math.random();
      L = 6 + fl * 6 + vz.agile * 2 + vz.engine * 1.5 + (ship.vy < -60 ? 4 : 0);
      c.fillStyle = C.allyDeep;
      c.beginPath();
      c.moveTo(-3.6, 14);
      c.lineTo(3.6, 14);
      c.lineTo(1.2, 14 + L);
      c.lineTo(-1.2, 14 + L * 0.85);
      c.closePath();
      c.fill();
      c.fillStyle = C.ally;
      c.beginPath();
      c.moveTo(-2.4, 14);
      c.lineTo(2.4, 14);
      c.lineTo(0.4, 14 + L * 0.7);
      c.lineTo(-0.6, 14 + L * 0.6);
      c.closePath();
      c.fill();
      c.fillStyle = C.bone;
      c.fillRect(-1, 14, 2, 2 + fl * 2.5);
      if (vz.agile) {
        m = mp(c, "agile");
        c.fillStyle = C.allyDeep;
        c.fillRect(-6.5, 14, 1.5, L - 5);
        c.fillRect(5, 14, 1.5, L - 5);
        if (m) c.restore();
      }
      if (vz.sbomb > 1) {
        m = mp(c, "sbomb");
        c.fillStyle = C.muted;
        for (j = 0; j < vz.sbomb - 1; j++) {
          c.fillRect(-12 + j * 2.5, 13, 2, 3);
          c.fillRect(10 - j * 2.5, 14, 2, 3);
        }
        c.fillStyle = C.ally;
        c.fillRect(-12, 15.5, 2, 1);
        c.fillRect(10, 16.5, 2, 1);
        if (m) c.restore();
      }
      c.fillStyle = hull;
      pl(c, SH_WL);
      c.fill();
      pl(c, SH_WR);
      c.fill();
      pl(c, SH_BODY);
      c.fill();
      c.fillStyle = sk.pas === 3 ? C.bone : C.muted;
      c.fillRect(2.5, -11, 2.5, 22);
      c.fillRect(-14, 9, 5, 2);
      c.fillRect(9, 11, 5, 2);
      c.fillStyle = sk.str;
      pl(c, SH_STL);
      c.fill();
      pl(c, SH_STR);
      c.fill();
      if (sk.pas === 1) {
        c.fillRect(-3.5, -12, 1, 20);
        c.fillRect(-1.5, -12, 1, 20);
      } else if (sk.pas === 2) {
        c.fillRect(-1, 0, 2, 11);
        c.fillRect(-13, 10, 4, 1);
        c.fillRect(9, 12, 4, 1);
      } else if (sk.pas === 3) {
        c.beginPath();
        c.moveTo(-4, 4);
        c.lineTo(0, 1);
        c.lineTo(4, 4);
        c.lineTo(4, 6);
        c.lineTo(0, 3);
        c.lineTo(-4, 6);
        c.closePath();
        c.fill();
        c.beginPath();
        c.moveTo(-4, 8);
        c.lineTo(0, 5);
        c.lineTo(4, 8);
        c.lineTo(4, 10);
        c.lineTo(0, 7);
        c.lineTo(-4, 10);
        c.closePath();
        c.fill();
      }
      c.fillStyle = sk.cab;
      pl(c, SH_CAB);
      c.fill();
      c.fillStyle = sk.pas === 3 ? C.ink : C.bone;
      c.fillRect(-1.5, -9, 2, 3);
      c.fillStyle = C.muted;
      pl(c, SH_ENG);
      c.fill();
      shipLogo(c);
      if (vz.agile) c.fillRect(-7, 11, 2, 3), c.fillRect(5, 11, 2, 3);
      if (vz.armor) {
        m = mp(c, "armor");
        for (j = 0; j < vz.armor; j++) {
          c.fillStyle = state === "play" || state === "dying" ? j < armorN ? C.bone : C.hull : C.bone;
          c.fillRect(-12 + j * 2.4, 5 - j * 1.6, 2, 3.2);
          c.fillRect(10 - j * 2.4, 5 - j * 1.6, 2, 3.2);
        }
        if (m) c.restore();
      }
      if (vz.power) {
        m = mp(c, "power");
        c.fillStyle = C.allyDeep;
        c.fillRect(-2, 2, 4, 6);
        c.fillStyle = C.bone;
        c.fillRect(-1, 4, 2, 2);
        if (m) c.restore();
      }
      if (vz.cache) {
        m = mp(c, "cache");
        c.fillStyle = C.muted;
        c.fillRect(-4.5, -1, 1.5, 6);
        if (m) c.restore();
      }
      if (vz.slow) {
        m = mp(c, "slow");
        c.fillStyle = C.muted;
        pl(c, SH_FIN);
        c.fill();
        pl(c, SH_FINL);
        c.fill();
        if (m) c.restore();
      }
      if (vz.graze) {
        m = mp(c, "graze");
        c.fillStyle = C.ally;
        c.fillRect(-16, 4, 2, 7);
        c.fillRect(14, 4, 2, 7);
        if (vz.graze > 1) {
          c.fillRect(-18, 2, 2, 5);
          c.fillRect(16, 2, 2, 5);
        }
        if (m) c.restore();
      }
      if (vz.fire) {
        m = mp(c, "fire");
        c.fillStyle = C.muted;
        for (j = 1; j <= vz.fire; j++) {
          c.fillRect(-9 - (j - 1) * 3, 0 - (j - 1), 2, 9);
          c.fillRect(7 + (j - 1) * 3, 0 - (j - 1), 2, 9);
        }
        c.fillStyle = C.ally;
        c.fillRect(-9, -1, 2, 2);
        c.fillRect(7, -1, 2, 2);
        if (m) c.restore();
      }
      if (vz.dmg) {
        m = mp(c, "dmg");
        c.fillStyle = C.muted;
        c.fillRect(-0.75, -15 - vz.dmg * 1.5, 1.5, vz.dmg * 1.5 + 1);
        c.fillStyle = C.ally;
        c.fillRect(-1, -16 - vz.dmg * 1.5, 2, 1.2);
        if (m) c.restore();
      }
      if (vz.dbl) {
        m = mp(c, "dbl");
        c.fillStyle = C.muted;
        c.fillRect(-3.5, -19, 2, 5);
        c.fillRect(1.5, -19, 2, 5);
        c.fillStyle = C.ally;
        c.fillRect(-3.5, -19, 2, 1.5);
        c.fillRect(1.5, -19, 2, 1.5);
        if (m) c.restore();
      }
      if (vz.magnet) {
        m = mp(c, "magnet");
        c.fillStyle = C.muted;
        c.fillRect(-0.5, 8, 1, 5);
        c.fillStyle = C.ally;
        k = 1.5 + vz.magnet * 0.9;
        c.fillRect(-k, 8, k * 2, 1);
        if (vz.magnet > 2) c.fillRect(-k + 1, 10, k * 2 - 2, 1);
        if (m) c.restore();
      }
      if (shieldOn) {
        c.strokeStyle = C.ally;
        c.lineWidth = 1.2;
        pl(c, SH_RING);
        c.stroke();
      } else if (vz.shield && state !== "play" && state !== "dying") {
        m = mp(c, "shield");
        c.strokeStyle = C.allyDeep;
        c.lineWidth = 0.6;
        pl(c, SH_RING);
        c.stroke();
        if (m) c.restore();
      }
      c.globalAlpha = 1;
      base(c);
    }
    var hudRT = -1, hudRS = "", LBW = {}, LBF = {}, hudCb = -1, hudCm = "", hudCs = "", hudShown = 0, hudSI = -1, hudST = "0", hudWL = "", hudWR = "", hudWK = "";
    var PCT = [];
    for (i = 0; i <= 100; i++) PCT.push(i + "%");
    var HSTL = { 5: "ODSŁONIĘTY · ×2", 6: "STAGGER · ×2", 7: "PRZEJŚCIE FAZY", 8: "DESPERACJA" };
    function hpan(c, x, y, w, h, k, edge) {
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + w - k, y);
      c.lineTo(x + w, y + k);
      c.lineTo(x + w, y + h);
      c.lineTo(x + k, y + h);
      c.lineTo(x, y + h - k);
      c.closePath();
      c.globalAlpha = 0.84;
      c.fillStyle = C.ink;
      c.fill();
      c.globalAlpha = 1;
      c.strokeStyle = edge || C.line;
      c.lineWidth = 1;
      c.stroke();
    }
    function hud(c) {
      var j, k, x, y, w, sc = Math.floor(score), nar = W < 600, pw = nar ? 156 : 208, ph = 58, fr, id, u, n;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.textBaseline = "middle";
      c.textAlign = "left";
      hudShown += sc > hudShown ? Math.max(1, (sc - hudShown) * 0.18) : sc - hudShown;
      if ((hudShown | 0) !== hudSI) {
        hudSI = hudShown | 0;
        hudST = fmt(hudSI);
      }
      if (rush && (t | 0) !== hudRT) {
        hudRT = t | 0;
        hudRS = "RUSH " + hudRT + " s";
      }
      hpan(c, 12.5, 12.5, pw, ph, 7);
      c.font = "500 10px " + MONO;
      ls(c, 0.8);
      c.fillStyle = C.muted;
      c.fillText("WYNIK", 24, 26);
      c.textAlign = "right";
      c.fillStyle = C.bone;
      c.fillText(rush ? hudRS : hudWave, 12 + pw - 12, 26);
      c.textAlign = "left";
      if (sudo) {
        c.fillStyle = C.hot;
        c.fillText("SUDO", 70, 26);
      }
      ls(c, 0);
      c.font = "700 " + (nar ? 20 : 24) + "px " + MONO;
      c.fillStyle = C.bone;
      c.fillText(hudST, 24, 50);
      if (comboM > 1) {
        if (combo !== hudCb) {
          hudCb = combo;
          hudCm = "×" + comboM;
        }
        x = 12 + pw - 12 - 34;
        y = 38;
        c.fillStyle = C.ally;
        c.fillRect(x, y, 34, 18);
        c.font = "700 12px " + MONO;
        c.fillStyle = C.ink;
        c.textAlign = "center";
        c.fillText(hudCm, x + 17, y + 9.5);
        c.textAlign = "left";
        c.fillStyle = C.allyDark;
        c.fillRect(x, y + 21, 34, 2);
        c.fillStyle = C.ally;
        c.fillRect(x, y + 21, 34 * Math.min(1, comboT / comboS), 2);
      }
      k = krRun();
      if (k !== krHud) {
        krHud = k;
        krHudT = fmt(k);
      }
      x = 12 + pw + 8;
      w = 30 + krHudT.length * 8;
      hpan(c, x + 0.5, 12.5, w, 26, 6, krPulse > 0 ? C.ally : null);
      if (krPulse > 0) {
        c.fillStyle = C.allyDark;
        c.fillRect(x + 2, 15, w - 4, 21);
      }
      c.drawImage(ic.krY, x + 8, 18, 14, 14);
      c.font = "700 13px " + MONO;
      c.fillStyle = C.ally;
      c.fillText(krHudT, x + 26, 26);
      if (!BO.on && !nar) {
        w = Math.min(340, W * 0.32);
        x = Math.round(W / 2 - w / 2);
        if (hudWK !== hudWave + rush + moby.active()) {
          hudWK = hudWave + rush + moby.active();
          hudWL = rush ? "BOSS RUSH" : hudWave + (moby.active() ? " · MOBY" : moby.rain() ? " · KOD" : "");
          k = Math.max(0, Math.ceil((nextBossT - waveT) / WAVE_S - 1e-3));
          hudWR = rush || noBoss ? "" : k <= 1 ? "BOSS: NASTĘPNA" : "BOSS ZA " + k + " FALE";
        }
        hpan(c, x + 0.5, 12.5, w, 34, 6);
        c.font = "500 10px " + MONO;
        ls(c, 0.8);
        c.fillStyle = C.bone;
        c.fillText(hudWL, x + 12, 24);
        c.textAlign = "right";
        c.fillStyle = C.muted;
        c.fillText(hudWR, x + w - 12, 24);
        c.textAlign = "left";
        ls(c, 0);
        fr = waveT % WAVE_S / WAVE_S;
        c.fillStyle = C.line;
        c.fillRect(x + 12, 34, w - 24, 3);
        c.fillStyle = C.bone;
        c.fillRect(x + 12, 34, (w - 24) * fr, 3);
      }
      y = H - 12 - 50;
      w = nar ? 132 : 156;
      hpan(c, 12.5, y + 0.5, w, 50, 7);
      c.font = "500 10px " + MONO;
      ls(c, 0.8);
      c.fillStyle = C.muted;
      c.fillText("BOMBY", 24, y + 13);
      ls(c, 0);
      n = Math.max(bombMax, bombs);
      for (j = 0; j < n; j++) c.drawImage(j < bombs ? ic.bombY : ic.bombE, 24 + j * 22, y + 22, 18, 18);
      fr = BO.on && mode2 === "unik" ? Math.min(1, bmeter) : bombs >= bombMax ? 1 : clamp2(1 - (nextBomb - score) / step, 0, 1);
      x = 24 + n * 22 + 4;
      k = 12 + w - 12 - x;
      if (k > 12) {
        c.fillStyle = C.allyDark;
        c.fillRect(x, y + 30, k, 3);
        c.fillStyle = C.ally;
        c.fillRect(x, y + 30, k * fr, 3);
      }
      if (FXV.laserS && mode2 === "ogien") {
        c.font = "500 9px " + MONO;
        ls(c, 0.8);
        c.fillStyle = laserOn > 0 ? C.ally : C.muted;
        c.fillText("LASER", 24, y - 8);
        ls(c, 0);
        c.fillStyle = C.allyDark;
        c.fillRect(64, y - 10, w - 64, 3);
        c.fillStyle = C.ally;
        c.fillRect(64, y - 10, (w - 64) * (laserOn > 0 ? 1 : Math.min(1, laserT / FXV.laserS)), 3);
      }
      x = W - 12;
      y = touch ? H - 16 - 64 - 12 - 26 : H - 12 - 26;
      for (j = UKEYS.length - 1; j >= 0; j--) {
        id = UKEYS[j];
        if (!up[id]) continue;
        u = UPS[id];
        x -= 26;
        c.drawImage(ic.u[id], x, y, 20, 20);
        for (k = 0; k < up[id]; k++) {
          c.fillStyle = C.ally;
          c.fillRect(x + k * 5, y + 23, 3, 2);
        }
      }
      if (shieldOn) {
        x -= 26;
        c.drawImage(ic.shieldY, x, y, 20, 20);
      }
      if (BO.on) {
        var dsp, bw = nar ? W - 24 : Math.min(W * 0.5, 600), x0 = nar ? 18 : Math.max(240, W / 2 - bw / 2), x1 = nar ? W - 18 : Math.min(x0 + bw, W - 70), y0 = nar ? 84 : 14, f = BO.hp / 100, gq = BO.hpG / 100, w2, yb = y0 + 25, jx = BO.hit > 0 && !reduced ? rnd2(-2, 2) : 0, lab;
        x0 += jx;
        x1 += jx;
        w2 = x1 - x0;
        if (BO.st === 1) {
          f *= Math.min(1, BO.age / BO.il);
          gq = f;
        }
        dsp = BO.phase === (BO.v2 ? 6 : 4);
        hpan(c, x0 - 9.5, y0 - 5.5, w2 + 19, 66, 7, dsp ? C.hot : C.acc);
        c.drawImage(ic.bb[BO.type], x0, y0, 22, 22);
        c.textBaseline = "middle";
        c.textAlign = "left";
        c.font = "700 12px " + MONO;
        ls(c, 1.8);
        c.fillStyle = C.bone;
        c.fillText(BNU[BO.type], x0 + 30, y0 + 11);
        c.font = "500 11px " + MONO;
        ls(c, 0.88);
        c.fillStyle = dsp ? C.hot : C.label;
        c.textAlign = "right";
        c.fillText((BO.v2 ? FZ2 : FZ)[BO.phase - 1], x1, y0 + 11);
        c.textAlign = "left";
        ls(c, 0);
        c.fillStyle = C.line;
        c.fillRect(x0, yb, w2, 16);
        if (gq > f) {
          c.fillStyle = C.bone;
          c.fillRect(x0 + w2 * f, yb, w2 * (gq - f), 16);
        }
        c.fillStyle = BO.hit > 0 ? C.bone : BO.phase >= (BO.v2 ? 4 : 3) ? C.hot : C.acc;
        c.fillRect(x0, yb, w2 * f, 16);
        c.fillStyle = C.hot;
        c.fillRect(x0, yb, w2 * f, 3);
        c.fillStyle = C.ink;
        if (BO.v2) {
          for (j = 0; j < 5; j++) c.fillRect(x0 + w2 * THR2[j] / 100 - 1.5, yb - 1, 3, 18);
          for (j = 0; j < 6; j++) {
            k = B2.parts[j];
            x = x1 - 128 + j * 13;
            c.fillStyle = k.alive ? k.core ? C.bone : C.acc : C.line;
            c.fillRect(x, yb + 25, 9, 9);
            if (!k.alive) {
              c.fillStyle = C.ink;
              c.fillRect(x + 2, yb + 27, 5, 5);
            }
          }
          c.fillStyle = C.ink;
        } else for (j = 0; j < 3; j++) c.fillRect(x0 + w2 * THR[j] / 100 - 1.5, yb - 1, 3, 18);
        c.font = "700 13px " + MONO;
        c.textAlign = "right";
        c.fillStyle = C.bone;
        c.fillText(PCT[clamp2(Math.ceil(BO.hp), 0, 100)], x1, yb + 30);
        c.textAlign = "left";
        c.fillStyle = C.muted;
        for (j = 1; j < 30; j++) c.fillRect(x0 + w2 * j / 30, yb + 18, 1, j % 5 ? 2 : 4);
        lab = HSTL[BO.fs] || (BO.v2 ? B2.hudLabel() : BO.atk >= 0 && (BO.fs === S_TELE || BO.fs === S_ATK) ? (BO.fs === S_TELE ? ATT : ATA)[BO.atk] : "");
        if (BO.atk === A_HEL && BO.fs === S_ATK) lab = HELLT[clamp2(Math.ceil(HELL_S - BO.hellT), 0, HELL_S)];
        if (lab && BO.st === 2) {
          c.font = "500 10px " + MONO;
          ls(c, 0.8);
          c.fillStyle = BO.fs === S_VULN || BO.fs === S_STAG ? C.bone : BO.fs === S_TELE ? C.hot : C.label;
          c.fillText(lab, x0, yb + 30);
          ls(c, 0);
        }
      }
    }
    var TA = 0, TL = false, TP = 0;
    function setB(x, y, S) {
      TBX = x;
      TBY = y;
      TS = S;
    }
    function us(c) {
      var k = dpr * TS;
      c.setTransform(k, 0, 0, k, dpr * (TBX + shx), dpr * (TBY + shy));
      if (TA) c.rotate(TA);
    }
    function dp2(c, pt, X, Y, a, sx, sy, gl, fl) {
      var img = fl ? pt.f : pt.n, j, y0, y1, ih;
      us(c);
      if (X || Y) c.translate(X, Y);
      if (a) c.rotate(a);
      if (sx !== 1 || sy !== 1) c.scale(sx, sy);
      if (!gl || glA <= 0) {
        c.drawImage(img, -pt.ax, -pt.ay, pt.w, pt.h);
        return;
      }
      ih = img.height;
      for (j = 0; j < 5; j++) {
        y0 = GLY[j];
        y1 = GLY[j + 1];
        c.drawImage(img, 0, y0 * ih, img.width, (y1 - y0) * ih, -pt.ax + GLX[j] * pt.w, -pt.ay + y0 * pt.h, pt.w, (y1 - y0) * pt.h);
        if (GLX[j]) {
          c.fillStyle = C.hot;
          c.fillRect(-pt.ax + GLX[j] * pt.w, -pt.ay + y0 * pt.h, pt.w, 1.2);
        }
      }
    }
    function ring3(c, pt, X, Y, th, tl, sc, sq, fl) {
      var ct = Math.cos(th), s1 = Math.sin(th), cp2 = Math.cos(tl), sp2 = Math.sin(tl);
      us(c);
      c.translate(X, Y);
      c.transform(sc * (cp2 * ct - sp2 * sq * s1), sc * (sp2 * ct + cp2 * sq * s1), sc * (-cp2 * s1 - sp2 * sq * ct), sc * (-sp2 * s1 + cp2 * sq * ct), 0, 0);
      c.drawImage(fl ? pt.f : pt.n, -pt.ax, -pt.ay, pt.w, pt.h);
    }
    function quad(c, ca, sa, cx, cy, r0, r1, hw) {
      var nx = -sa * hw, ny = ca * hw;
      c.beginPath();
      c.moveTo(cx + ca * r0 + nx, cy + sa * r0 + ny);
      c.lineTo(cx + ca * r1 + nx, cy + sa * r1 + ny);
      c.lineTo(cx + ca * r1 - nx, cy + sa * r1 - ny);
      c.lineTo(cx + ca * r0 - nx, cy + sa * r0 - ny);
      c.closePath();
      c.fill();
    }
    function octP(c, cx, cy, r, k) {
      octPath(c, cx, cy, r, k);
    }
    function sqr(c, cx, cy, r, a) {
      var ca = Math.cos(a) * r, sa = Math.sin(a) * r;
      c.beginPath();
      c.moveTo(cx + ca, cy + sa);
      c.lineTo(cx - sa, cy + ca);
      c.lineTo(cx - ca, cy - sa);
      c.lineTo(cx + sa, cy - ca);
      c.closePath();
      c.fill();
    }
    function ease3(v) {
      v = clamp2(v, 0, 1);
      return 1 - (1 - v) * (1 - v) * (1 - v);
    }
    function coreX(c, X, Y, r) {
      var ph = BO.ph, j, a;
      r *= 1 + (reduced ? 0 : Math.sin(ph * 8) * 0.07);
      c.fillStyle = C.ink;
      octP(c, X, Y, r * 1.38, r * 0.46);
      c.fill();
      c.fillStyle = C.deep;
      octP(c, X, Y, r * 1.22, r * 0.4);
      c.fill();
      for (j = 0; j < 8; j++) {
        a = ph * 2.4 + j * 0.785;
        c.fillStyle = j & 1 ? C.hot : C.solid;
        quad(c, Math.cos(a), Math.sin(a), X, Y, r * 0.72, r * 1.16, r * 0.13);
      }
      c.fillStyle = C.bone;
      octP(c, X, Y, r * 0.62, r * 0.2);
      c.fill();
      c.fillStyle = C.hot;
      octP(c, X, Y, r * 0.34, r * 0.11);
      c.fill();
      c.fillStyle = C.bone;
      c.fillRect(X - r * 0.1, Y - r * 0.1, r * 0.2, r * 0.2);
    }
    function dizzy(c, p) {
      var j, a, g = pj[2];
      for (j = 0; j < 3; j++) {
        a = BO.age * 5 + j * 2.094;
        c.setTransform(dpr, 0, 0, dpr, dpr * (p.x + Math.cos(a) * p.w * 0.28 + shx), dpr * (p.y - p.h * 0.55 + Math.sin(a) * 9 + shy));
        c.drawImage(g.c, -g.w / 2, -g.h / 2, g.w, g.h);
      }
      base(c);
    }
    function drawNP(c, p, fl) {
      var b = BO, vp = Math.min(3, b.vp), ac = ACC[b.vp - 1], ph = b.ph, j, h, X, osc = reduced ? 0 : Math.sin(ph * 2.1) * 0.12, sl = (vp >= 2 ? 7 : 0) - (p.ex ? 9 : 0), a, ae, px, py, lid, r, sc;
      us(c);
      if (b.d3 < 1) {
        c.fillStyle = ac;
        for (j = vp >= 2 ? 0 : -1; j <= (vp >= 2 ? 0 : 1); j++) {
          h = 9 + 9 * (0.5 + 0.5 * Math.sin(ph * 3 + j * 1.4));
          X = j * 42;
          c.beginPath();
          c.moveTo(X - 6, -55);
          c.lineTo(X + 6, -55);
          c.lineTo(X + 1, -55 - h);
          c.lineTo(X - 6, -55 - h * 0.6);
          c.closePath();
          c.fill();
        }
      }
      if (vp >= 2 && b.st !== 3) {
        ae = ease3(b.armT / 0.7);
        a = 0.62 + (reduced ? 0 : Math.sin(ph * 1.7) * 0.12) + (b.fs === S_STAG ? 0.5 : 0);
        dp2(c, BA.p2, 50, 4, a, ae, 1, false, fl);
        dp2(c, BA.p2, -50, 4, Math.PI - a, ae, 1, false, fl);
      }
      a = osc + (vp >= 2 ? 0.22 : 0);
      if (!b.d1) dp2(c, BA.p1, -96 - sl, -32, -a, -1, 1, true, fl);
      if (!b.d2) dp2(c, BA.p1, 96 + sl, -32, a, 1, 1, true, fl);
      dp2(c, BA.h, 0, 0, 0, 1, 1, true, fl);
      if (b.hp < 55) dp2(c, BA.k1, 0, 0, 0, 1, 1, true, false);
      if (b.hp < 28) dp2(c, BA.k2, 0, 0, 0, 1, 1, true, false);
      us(c);
      if (b.vp === 4) {
        coreX(c, 0, -14, 28);
        return;
      }
      r = ph * (vp >= 2 ? -1.3 : 0.6);
      for (j = 0; j < 12; j++) {
        a = r + j * 0.5236;
        c.fillStyle = j % 3 === 0 ? TL ? C.hot : ac : C.deep;
        quad(c, Math.cos(a), Math.sin(a), 0, -14, 37.5, 44, 6);
      }
      c.strokeStyle = TL ? C.hot : p.ex ? C.bone : ac;
      c.lineWidth = vp === 3 ? 3.4 : 2.4;
      pl(c, NP_RING);
      c.stroke();
      c.fillStyle = p.ex ? C.bone : ac;
      for (j = 0; j < 8; j++) {
        r = ph * (vp >= 2 ? 1.1 : 0.5) + j * 0.785;
        quad(c, Math.cos(r), Math.sin(r), 0, -14, 22, 28, 1.6);
      }
      px = clamp2((ship.x - p.x) / (p.w * 0.5), -1, 1) * 9;
      py = clamp2((ship.y - p.y) / (H * 0.5), -1, 1) * 7;
      if (b.fs === S_STAG) {
        px = Math.sin(b.age * 6) * 7;
        py = 0;
      }
      if (TL || vp === 3) {
        c.fillStyle = TL ? C.hot : C.solid;
        c.fillRect(px - 25, -14 + py - 15, 50, 30);
      }
      sc = 1 + (p.hit > 0 ? 0.14 : 0) + (reduced ? 0 : 0.04 * Math.sin(ph * 5));
      dp2(c, BA.p3, px, -14 + py, 0, sc, sc, false, fl);
      us(c);
      c.fillStyle = TL ? C.hot : C.bone;
      X = px;
      h = -14 + py;
      c.fillRect(X - 27, h - 17, 8, 2);
      c.fillRect(X - 27, h - 17, 2, 8);
      c.fillRect(X + 19, h - 17, 8, 2);
      c.fillRect(X + 25, h - 17, 2, 8);
      c.fillRect(X - 27, h + 15, 8, 2);
      c.fillRect(X - 27, h + 9, 2, 8);
      c.fillRect(X + 19, h + 15, 8, 2);
      c.fillRect(X + 25, h + 9, 2, 8);
      c.fillRect(X - 1, h - 26, 2, 6);
      c.fillRect(X - 1, h + 20, 2, 6);
      c.fillRect(X - 35, h - 1, 6, 2);
      c.fillRect(X + 29, h - 1, 6, 2);
      lid = b.blk > 0 && !p.ex ? Math.sin(Math.PI * (1 - b.blk / 0.22)) : 0;
      if (b.fs === S_STAG) lid = 0.55;
      if (lid > 0.02) {
        us(c);
        c.save();
        pl(c, NP_SOCK);
        c.clip();
        c.fillStyle = C.plate;
        c.fillRect(-37, -51, 74, 36 * lid);
        c.fillRect(-37, 23 - 36 * lid, 74, 36 * lid);
        c.fillStyle = ac;
        c.fillRect(-37, -52.5 + 36 * lid, 74, 1.5);
        c.fillRect(-37, 23 - 36 * lid, 74, 1.5);
        c.restore();
      }
      if (vp === 3) {
        us(c);
        c.fillStyle = C.hot;
        r = 48 + (reduced ? 0 : 2 * Math.sin(ph * 6));
        c.fillRect(-r - 3, -44, 3, 60);
        c.fillRect(-r - 3, -44, 9, 3);
        c.fillRect(-r - 3, 13, 9, 3);
        c.fillRect(r, -44, 3, 60);
        c.fillRect(r - 6, -44, 9, 3);
        c.fillRect(r - 6, 13, 9, 3);
      }
    }
    function drawML(c, p, fl) {
      var b = BO, ac = ACC[b.vp - 1], g = b.g, ph = b.ph, sw = 1 + 0.1 * g + (reduced ? 0 : 0.03 * Math.sin(ph * 1.7)), N = BA.n, fill = Math.floor(N * (0.16 + 0.84 * g)), i3, k, X, Y, v, cp2 = BA.cp, j, h, n, op = (p.ex ? 16 : 0) + (b.atk === A_SWP && b.fs === S_ATK ? -10 : 0), r, a, bt, pu, wb;
      us(c);
      for (j = 0; j < ML_DRIP.length; j += 3) {
        X = ML_DRIP[j] * sw + (reduced ? 0 : Math.sin(ph * 1.6 + j) * 2.5);
        Y = ML_DRIP[j + 1] * sw;
        n = ML_DRIP[j + 2];
        c.fillStyle = C.solid;
        c.fillRect(X - 1, Y, 2, n * 13 + 4);
        for (k = 0; k < n; k++) c.drawImage(BA.at, (fl ? 6 : k === n - 1 ? 5 : 4) * cp2, 0, cp2, cp2, X - 6, Y + 5 + k * 13, 12, 12);
        if (!reduced) {
          a = ph * (0.45 + 0.4 * g) + j * 0.137;
          a -= Math.floor(a);
          h = Y + 6 + n * 13 + a * a * (40 + 40 * g);
          c.globalAlpha = 1 - a;
          c.fillStyle = a < 0.4 ? C.hot : C.solid;
          c.fillRect(X - 3, h, 6, 7);
          c.globalAlpha = 1;
        }
      }
      c.beginPath();
      for (i3 = 0; i3 < N; i3++) {
        k = BA.fo[i3];
        if (BA.br[k] >= b.cb) c.rect(BA.cx[k] * sw - 11.5, BA.cy[k] * sw - 11.5, 23, 23);
      }
      c.fillStyle = C.ink;
      c.fill();
      for (i3 = 0; i3 < N; i3++) {
        k = BA.fo[i3];
        if (BA.br[k] < b.cb) continue;
        X = BA.cx[k] * sw;
        Y = BA.cy[k] * sw;
        if (!reduced) Y += Math.sin(ph * 2.4 + k * 0.9) * (0.5 + g);
        if (glA > 0) {
          v = (Y + 66) / 132;
          for (j = 0; j < 4 && GLY[j + 1] < v; j++) ;
          X += GLX[j] * 200;
        }
        v = fl ? 6 : i3 < fill ? b.vp >= 2 && k % 3 === 0 ? 5 : 4 : BA.cv[k];
        r = BA.cs[k];
        c.drawImage(BA.at, v * cp2, 0, cp2, cp2, X - 8 * r, Y - 8 * r, 16 * r, 16 * r);
      }
      wb = reduced ? 0 : Math.sin(ph * 2.3) * 0.05 + (p.hit > 0 ? 0.05 : 0);
      dp2(c, BA.p1, -(76 + 8 * g) * sw - op, 6, wb, 1, 0.82, true, fl);
      dp2(c, BA.p1, (76 + 8 * g) * sw + op, -6, -wb, -1, 0.82, true, fl);
      us(c);
      if (b.vp === 4) coreX(c, 0, 0, 24);
      else {
        bt = reduced ? 0.5 : ph * (1.1 + 0.6 * g);
        bt -= Math.floor(bt);
        pu = bt < 0.1 ? Math.sin(bt * 31.4) : bt > 0.18 && bt < 0.28 ? 0.6 * Math.sin((bt - 0.18) * 31.4) : 0;
        c.strokeStyle = pu > 0.3 ? C.hot : C.solid;
        c.lineWidth = 2.2;
        c.lineJoin = "miter";
        c.beginPath();
        for (j = 0; j < ML_VEIN.length; j += 6) {
          c.moveTo(ML_VEIN[j] * sw, ML_VEIN[j + 1] * sw);
          c.lineTo(ML_VEIN[j + 2] * sw, ML_VEIN[j + 3] * sw);
          c.lineTo(ML_VEIN[j + 4] * sw, ML_VEIN[j + 5] * sw);
        }
        c.stroke();
        c.fillStyle = C.ink;
        octP(c, 0, 0, 25, 8);
        c.fill();
        if (pu > 0 && bt < 0.33) {
          c.globalAlpha = 1 - bt * 3;
          c.strokeStyle = C.hot;
          c.lineWidth = 2;
          octP(c, 0, 0, 26 + bt * 90, 9 + bt * 30);
          c.stroke();
          c.globalAlpha = 1;
        }
        r = 1.5 * (1 + 0.2 * pu + (p.hit > 0 ? 0.12 : 0));
        c.save();
        c.scale(r, r);
        c.fillStyle = p.ex ? C.bone : TL ? (b.age * 16 | 0) & 1 ? C.hot : C.bone : C.solid;
        pl(c, ML_HEART);
        c.fill();
        c.scale(0.62, 0.62);
        c.fillStyle = p.ex ? C.hot : C.hot;
        pl(c, ML_HEART);
        c.fill();
        c.restore();
        c.fillStyle = C.bone;
        r = 3 + 2 * pu + (p.ex ? 2 : 0);
        c.fillRect(-r, -r - 1, r * 2, r * 2);
      }
      if (!b.d1) {
        dp2(c, BA.p2, 0, -76 * sw, 0, 1, 1, false, fl);
        us(c);
        c.fillStyle = ac;
        c.fillRect(-13, -76 * sw - 2.5, 48 * g, 5);
      }
    }
    function drawChain(c) {
      var A = BP[0], B = BP[1], u = A.u, n, j, t2, X, Y, x0, x1, y0, y1, sg, row2, sp, q2, img, z;
      for (row2 = 0; row2 < 2; row2++) {
        if (A.alive && B.alive) {
          x0 = A.x + 46 * u;
          x1 = B.x - 54 * u;
          y0 = A.y + (row2 ? 40 : -20) * u;
          y1 = B.y + (row2 ? 40 : -20) * u;
          n = clamp2(Math.floor(Math.abs(x1 - x0) / (19 * u)), 2, 50);
          sg = (8 + (reduced ? 0 : 5 * Math.sin(BO.ph * 2 + row2))) * u;
          for (j = 0; j <= n; j++) {
            t2 = j / n;
            X = x0 + (x1 - x0) * t2;
            Y = y0 + (y1 - y0) * t2 + Math.sin(t2 * Math.PI) * sg;
            c.setTransform(dpr * u * 1.45, 0, 0, dpr * u * 1.45, dpr * (X + shx), dpr * (Y + shy));
            c.drawImage(j & 1 ? BA.l2 : BA.l0, -10, -10, 20, 20);
          }
          for (sp = 0; sp < 2; sp++) {
            q2 = BO.ph * (0.55 + 0.5 * (1 - BP[sp].hp / BP[sp].max)) + row2 * 0.37;
            q2 -= Math.floor(q2);
            if (sp) q2 = 1 - q2;
            for (j = 0; j < 5; j++) {
              t2 = clamp2(q2 - (sp ? -1 : 1) * j * 0.022, 0, 1);
              X = x0 + (x1 - x0) * t2;
              Y = y0 + (y1 - y0) * t2 + Math.sin(t2 * Math.PI) * sg;
              img = j ? sp ? C.hot : C.solid : C.bone;
              z = (6 - j) * u;
              c.setTransform(dpr, 0, 0, dpr, dpr * (X + shx), dpr * (Y + shy));
              c.fillStyle = C.ink;
              c.fillRect(-z - 1.5, -z - 1.5, z * 2 + 3, z * 2 + 3);
              c.fillStyle = img;
              c.fillRect(-z, -z, z * 2, z * 2);
            }
          }
        } else {
          q2 = A.alive ? A : B;
          sp = A.alive ? 1 : -1;
          x0 = q2.x + sp * 46 * u;
          y0 = q2.y + (row2 ? 40 : -20) * u;
          for (j = 0; j < 6 - row2 * 2; j++) {
            X = x0 + sp * 4 * u + (reduced ? 0 : Math.sin(BO.ph * 2 + row2) * j * 2 * u);
            Y = y0 + j * 17 * u;
            c.setTransform(0, dpr * u * 1.45, -dpr * u * 1.45, 0, dpr * (X + shx), dpr * (Y + shy));
            c.drawImage(j & 1 ? BA.l2 : BA.l0, -10, -10, 20, 20);
          }
        }
      }
      base(c);
    }
    function splitRC(c, pt, m, fl) {
      var o = 5 + (reduced ? 0 : Math.sin(BO.ph * 7) * 1), im = fl ? pt.f : pt.n;
      us(c);
      c.scale(m, 1);
      c.lineJoin = "miter";
      c.beginPath();
      c.moveTo(-70, -26);
      for (var j = 0; j < RC_CUT.length; j += 2) c.lineTo(RC_CUT[j], RC_CUT[j + 1]);
      c.strokeStyle = C.ink;
      c.lineWidth = 10;
      c.stroke();
      c.strokeStyle = C.hot;
      c.lineWidth = 3.4;
      c.stroke();
      us(c);
      c.save();
      c.scale(m, 1);
      pl(c, RC_BOTC);
      c.clip();
      c.scale(m, 1);
      c.drawImage(im, -pt.ax, -pt.ay, pt.w, pt.h);
      c.restore();
      us(c);
      c.save();
      c.scale(m, 1);
      pl(c, RC_TOPC);
      c.clip();
      c.scale(m, 1);
      c.translate(-1.5 * m, -o);
      c.drawImage(im, -pt.ax, -pt.ay, pt.w, pt.h);
      c.restore();
    }
    function drawRC(c, p, k, fl) {
      var b = BO, m = k ? -1 : 1, ac = ACC[b.vp - 1], j, r, ga = 1, cl, a;
      if (p.hp < p.max * 0.7 && !reduced && (b.age * 9 | 0) % 3 === 0) ga = 0.6;
      c.globalAlpha = ga;
      cl = TL ? TP : p.mz > 0 ? 1 : 0;
      a = (reduced ? 0 : Math.sin(b.ph * 2 + k) * 0.15) - cl * 0.35;
      if (!b.d1) dp2(c, BA.p1, m * (46 + cl * 12), 30, m * a, m, 1, false, fl);
      if (p.hp < p.max * 0.5) splitRC(c, k ? BA.h2 : BA.h, m, fl);
      else {
        dp2(c, k ? BA.h2 : BA.h, 0, 0, 0, 1, 1, true, fl);
        if (p.hp < p.max * 0.7) dp2(c, k ? BA.k2 : BA.k1, 0, 0, 0, 1, 1, true, false);
      }
      us(c);
      if (b.vp === 4) {
        c.globalAlpha = 1;
        coreX(c, m * -10, -24, 20);
      } else {
        for (j = 0; j < 8; j++) {
          r = m * p.spin + j * 0.785;
          c.fillStyle = j < 2 ? C.bone : j < 4 ? ac : C.deep;
          c.globalAlpha = ga * (j === 0 ? 1 : 1 - j * 0.08);
          quad(c, Math.cos(r), Math.sin(r), m * -10, -24, 7, 20, 3);
        }
        c.globalAlpha = ga;
        r = p.hit > 0 ? 7 : 5.5;
        c.fillStyle = p.ex ? C.bone : TL ? C.hot : C.bone;
        octP(c, m * -10, -24, r, r * 0.32);
        c.fill();
      }
      c.fillStyle = ac;
      c.fillRect(m * -40, k ? -69 : -66, m * 70 * clamp2(p.hp / p.max, 0, 1), 4);
      if (b.mtx === k) {
        c.globalAlpha = 1;
        c.strokeStyle = (b.age * 12 | 0) & 1 && b.mtT > 1.2 ? C.hot : C.bone;
        c.lineWidth = 3;
        c.save();
        c.scale(1.1 * m, 1.08);
        pl(c, k ? RC_HULL2 : RC_HULL);
        c.restore();
        c.stroke();
        c.fillStyle = C.bone;
        c.fillRect(-16, -96, 32, 12);
        c.font = "700 8px " + MONO;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillStyle = C.ink;
        c.fillText("LOCK", 0, -89.5);
      }
      c.globalAlpha = 1;
    }
    function drawSP(c, p, fl) {
      var b = BO, ph = b.ph, vp = Math.min(3, b.phase), ac = ACC[b.vp - 1], a, ae, j, r, X, t1 = ph * (0.7 + 0.25 * vp), t2 = -ph * (0.5 + 0.2 * vp), cwd = cellW * dpr, lhd = lh * dpr, gw, gh, px, o = 0, im, hk = p.hit > 0 ? 1.18 : 1;
      ring3(c, BA.p2, 0, -6, t1, 0.14, 1.12, 0.26, fl);
      ring3(c, BA.p2, 0, -6, t2, -0.22, 0.9, 0.32, fl);
      if (vp >= 2 && b.st !== 3 && !b.d2) {
        ae = ease3(b.armT / 0.8);
        a = 0.95 + (reduced ? 0 : Math.sin(ph * 1.4) * 0.12) + (b.fs === S_STAG ? 0.6 : 0);
        dp2(c, BA.p3, 124, -6, a, ae, 1, false, fl);
        dp2(c, BA.p3, -124, -6, Math.PI - a, ae, 1, false, fl);
      }
      if (!b.d1) dp2(c, BA.p1, 0, -76 - (reduced ? 0 : 3 * (0.5 + 0.5 * Math.sin(ph * 2.2))) - (vp >= 2 ? 4 : 0), 0, 1, 1, true, fl);
      if (b.phase === 4) {
        o = 22 + (reduced ? 0 : 3 * Math.sin(ph * 5));
        im = fl ? BA.h.f : BA.h.n;
        us(c);
        c.fillStyle = C.ink;
        c.fillRect(-o - 4, -86, o * 2 + 8, 192);
        c.fillStyle = C.deep;
        c.fillRect(-o + 3, -86, o * 2 - 6, 192);
        c.strokeStyle = C.hot;
        c.lineWidth = 2.4;
        c.beginPath();
        c.moveTo(0, -86);
        for (j = 0; j < 12; j++) c.lineTo((j & 1 ? 1 : -1) * (o - 8) * 0.7, -70 + j * 15);
        c.stroke();
        for (j = 0; j < 2; j++) {
          us(c);
          c.save();
          c.translate(j ? o : -o, j ? -2 : 2);
          c.beginPath();
          c.rect(j ? 0 : -170, -130, 170, 260);
          c.clip();
          c.drawImage(im, -BA.h.ax, -BA.h.ay, BA.h.w, BA.h.h);
          c.restore();
        }
      } else {
        dp2(c, BA.h, 0, 0, 0, 1, 1, true, fl);
        if (b.hp < 67) dp2(c, BA.k1, 0, 0, 0, 1, 1, true, false);
        if (b.hp < 34) dp2(c, BA.k2, 0, 0, 0, 1, 1, true, false);
      }
      us(c);
      c.save();
      c.beginPath();
      c.rect(-170, -6, 340, 140);
      c.clip();
      ring3(c, BA.p2, 0, -6, t1, 0.14, 1.12, 0.26, fl);
      ring3(c, BA.p2, 0, -6, t2, -0.22, 0.9, 0.32, fl);
      c.restore();
      px = clamp2((ship.x - p.x) / (p.w * 0.5), -1, 1) * 7;
      for (j = 0; j < 2; j++) {
        us(c);
        c.translate(j ? o : -o, 0);
        c.fillStyle = TL && (b.age * 16 | 0) & 1 ? C.bone : ac;
        pl(c, j ? SP_EYR : SP_EYL);
        c.fill();
        X = (j ? 28 : -28) + px;
        c.fillStyle = C.ink;
        c.fillRect(X - 2.5, -20 + (j ? 46 - X : X + 46) * 0.375 + 1, 5, 5);
      }
      us(c);
      if (b.phase === 4) {
        coreX(c, 0, -55, 26 * hk);
        return;
      }
      if (vp === 1) {
        r = 12 * hk * (1 + (reduced ? 0 : 0.08 * Math.sin(ph * 5)));
        c.fillStyle = ac;
        sqr(c, 0, -55, r, ph * 1.4);
        c.fillStyle = C.ink;
        sqr(c, 0, -55, r * 0.6, -ph * 2);
        c.fillStyle = C.bone;
        c.fillRect(-3.5 * hk, -55 - 3.5 * hk, 7 * hk, 7 * hk);
      } else if (vp === 2) {
        r = (13 + (reduced ? 0 : 2.5 * Math.sin(ph * 4))) * hk;
        c.fillStyle = ac;
        c.beginPath();
        for (j = 0; j < 16; j++) {
          a = ph * 0.8 + j * 0.3927;
          X = j & 1 ? 5 : r;
          c.lineTo(Math.cos(a) * X, -55 + Math.sin(a) * X);
        }
        c.closePath();
        c.fill();
        c.fillStyle = C.bone;
        octP(c, 0, -55, 4.5 * hk, 1.3);
        c.fill();
      } else {
        c.strokeStyle = (b.age * 10 | 0) & 1 && !reduced ? C.hot : C.bone;
        c.lineWidth = 1.6;
        octP(c, 0, -55, 14 * hk, 4.5);
        c.stroke();
        c.fillStyle = C.bone;
        octP(c, 0, -55, 5, 1.6);
        c.fill();
        gw = cellW / TS;
        gh = lh / TS;
        for (j = 0; j < 14; j++) {
          a = ph * 1.6 + j * 0.449;
          r = 9 + 6 * Math.sin(ph * 3 + j);
          c.drawImage(atlas, (j * 7 + (ph * 5 | 0)) % gN * cwd, (j & 1) * lhd, cwd, lhd, Math.cos(a) * r - gw / 2, -55 + Math.sin(a) * r * 0.8 - gh / 2, gw, gh);
        }
      }
    }
    function drawBossTo(c) {
      var ty = BO.type, k, p, fl, jx, jy, a, fade;
      if (ty === 2) drawChain(c);
      for (k = 0; k < BO.n; k++) {
        p = BP[k];
        if (!p.alive) continue;
        fl = fxFlash && (p.hit > 0 || BO.st === 3 && (BO.dt * 18 | 0) & 1 || (BO.fs === S_SHIFT || BO.fs === S_DESP) && BO.ft < 0.3 && (BO.ft * 14 | 0) & 1);
        a = reduced ? 0 : BO.st === 3 ? 5 : p.hit > 0 ? 2.5 : BO.fs === S_SHIFT || BO.fs === S_DESP ? 3 : 0;
        jx = a ? rnd2(-a, a) : 0;
        jy = a ? rnd2(-a, a) * 0.6 : 0;
        TA = BO.fs === S_STAG ? (k ? -1 : 1) * (0.13 + (reduced ? 0 : 0.05 * Math.sin(BO.age * 9))) : 0;
        fade = ty === 0 && BO.atk === A_JMP && BO.fs === S_TELE ? 1 - 0.8 * Math.min(1, TP * 1.6) : 1;
        c.globalAlpha = fade;
        setB(p.x + jx, p.y + jy, p.u);
        if (ty === 0) drawNP(c, p, fl);
        else if (ty === 1) drawML(c, p, fl);
        else if (ty === 2) drawRC(c, p, k, fl);
        else drawSP(c, p, fl);
        c.globalAlpha = 1;
        TA = 0;
        if (fade < 1) {
          base(c);
          c.strokeStyle = C.bone;
          c.lineWidth = 2;
          setB(p.x, p.y, p.u);
          us(c);
          c.globalAlpha = 1 - fade;
          pl(c, NP_HULL);
          c.lineWidth = 2 / p.u;
          c.stroke();
          c.globalAlpha = 1;
          st(c, "null", 22, 0, -12, C.bone, 1);
        }
      }
      base(c);
    }
    function drawBoss(c) {
      var ty = BO.type, k, p, j, bl, qx, qy, sx2, sy2, th, sc;
      if (!BA || BA.ty !== ty || BO.gone) return;
      TL = BO.fs === S_TELE;
      TP = TL ? clamp2(BO.ft / BO.fd, 0, 1) : 0;
      if (silh && sil) {
        sc = sil.getContext("2d");
        sc.setTransform(1, 0, 0, 1, 0, 0);
        sc.clearRect(0, 0, sil.width, sil.height);
        drawBossTo(sc);
        sc.setTransform(1, 0, 0, 1, 0, 0);
        sc.globalCompositeOperation = "source-in";
        sc.fillStyle = C.muted;
        sc.fillRect(0, 0, sil.width, sil.height);
        sc.globalCompositeOperation = "source-over";
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.drawImage(sil, 0, 0);
        base(c);
      } else {
        drawBossTo(c);
        if (silx && sil) {
          sc = sil.getContext("2d");
          sc.setTransform(1, 0, 0, 1, 0, 0);
          sc.clearRect(0, 0, sil.width, sil.height);
          drawBossTo(sc);
          root2.__sil = sil;
        }
      }
      for (k = 0; k < BO.n; k++) {
        p = BP[k];
        if (!p.alive || BO.st !== 2) continue;
        if (p.ex) {
          bl = 16 * p.u;
          c.fillStyle = BO.fs === S_STAG ? C.hot : C.bone;
          th = 3;
          for (j = 0; j < 4; j++) {
            qx = j & 1 ? p.x + p.w * 0.5 : p.x - p.w * 0.5;
            qy = j & 2 ? p.y + p.h * 0.48 : p.y - p.h * 0.48;
            sx2 = j & 1 ? -1 : 1;
            sy2 = j & 2 ? -1 : 1;
            c.fillRect(Math.min(qx, qx + sx2 * bl), qy - (sy2 > 0 ? 0 : th), bl, th);
            c.fillRect(qx - (sx2 > 0 ? 0 : th), Math.min(qy, qy + sy2 * bl), th, bl);
          }
        }
        if (BO.fs === S_STAG) dizzy(c, p);
      }
    }
    function drawFx(c) {
      var k, e, q2, r, d, cs, sn;
      for (k = 0; k < DTP.length; k++) {
        d = DTP[k];
        if (d.life <= 0 || !d.pt) continue;
        cs = Math.cos(d.a) * d.S;
        sn = Math.sin(d.a) * d.S;
        c.globalAlpha = Math.min(1, d.life / 0.5);
        c.setTransform(dpr * cs * d.m, dpr * sn * d.m, -dpr * sn, dpr * cs, dpr * (d.x + shx), dpr * (d.y + shy));
        c.drawImage(d.pt.n, -d.pt.ax, -d.pt.ay, d.pt.w, d.pt.h);
      }
      c.globalAlpha = 1;
      for (k = 0; k < shN; k++) {
        d = SHD[k];
        cs = Math.cos(d.a);
        sn = Math.sin(d.a);
        c.setTransform(dpr * cs, dpr * sn, -dpr * sn, dpr * cs, dpr * (d.x + shx), dpr * (d.y + shy));
        c.fillStyle = d.c;
        c.fillRect(-d.s / 2, -d.s * 0.3, d.s, d.s * 0.6);
      }
      for (k = 0; k < exN; k++) {
        e = EXP[k];
        q2 = 1 - e.life / e.max;
        r = e.r * (0.35 + 0.95 * q2);
        c.setTransform(dpr * 0.7071, dpr * 0.7071, -dpr * 0.7071, dpr * 0.7071, dpr * (e.x + shx), dpr * (e.y + shy));
        if (q2 < 0.35) {
          c.fillStyle = q2 < 0.12 ? C.bone : C.hot;
          c.fillRect(-r * 0.62, -r * 0.62, r * 1.24, r * 1.24);
        }
        c.strokeStyle = q2 < 0.5 ? C.hot : C.acc;
        c.lineWidth = Math.max(1, 7 * (1 - q2));
        c.strokeRect(-r, -r, r * 2, r * 2);
        c.fillStyle = C.bone;
        c.fillRect(-1.5, -r * 1.5, 3, r * 0.4 * (1 - q2));
        c.fillRect(-1.5, r * 1.1, 3, r * 0.4 * (1 - q2));
        c.fillRect(-r * 1.5, -1.5, r * 0.4 * (1 - q2), 3);
        c.fillRect(r * 1.1, -1.5, r * 0.4 * (1 - q2), 3);
      }
      base(c);
    }
    function drawCard(c) {
      var cd = BA.card, a = BO.age, il = BO.il, ch = cd.height / dpr, f = Math.min(1, a / 0.2), o = clamp2((il - a) / 0.3, 0, 1), y = Math.round(H * 0.6 - ch / 2), w = W * f, x0 = (W - w) / 2, j, y0, y1;
      if (w < 2) return;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.globalAlpha = o;
      if (reduced || glA <= 0) c.drawImage(cd, x0 * dpr, 0, w * dpr, cd.height, x0, y, w, ch);
      else for (j = 0; j < 5; j++) {
        y0 = GLY[j];
        y1 = GLY[j + 1];
        c.drawImage(cd, x0 * dpr, y0 * cd.height, w * dpr, (y1 - y0) * cd.height, x0 + GLX[j] * W * 0.4, y + y0 * ch, w, (y1 - y0) * ch);
      }
      c.globalAlpha = 1;
    }
    function chev(c, x, y, s) {
      c.beginPath();
      c.moveTo(x - s, y - s);
      c.lineTo(x - s * 0.4, y - s);
      c.lineTo(x + s * 0.6, y);
      c.lineTo(x - s * 0.4, y + s);
      c.lineTo(x - s, y + s);
      c.lineTo(x, y);
      c.closePath();
      c.fill();
    }
    function reticle(c, x, y, r, col) {
      var l = Math.max(7, r * 0.45), t3 = 3;
      c.fillStyle = col;
      c.fillRect(x - r, y - r, l, t3);
      c.fillRect(x - r, y - r, t3, l);
      c.fillRect(x + r - l, y - r, l, t3);
      c.fillRect(x + r - t3, y - r, t3, l);
      c.fillRect(x - r, y + r - t3, l, t3);
      c.fillRect(x - r, y + r - l, t3, l);
      c.fillRect(x + r - l, y + r - t3, l, t3);
      c.fillRect(x + r - t3, y + r - l, t3, l);
      c.fillRect(x - 1, y - 6, 2, 12);
      c.fillRect(x - 6, y - 1, 12, 2);
    }
    function lane(c, x0, y0, a, hw, pr, bl) {
      var ca = Math.cos(a), sa = Math.sin(a), n;
      c.setTransform(dpr * ca, dpr * sa, -dpr * sa, dpr * ca, dpr * (x0 + shx), dpr * (y0 + shy));
      c.globalAlpha = 0.2 + 0.35 * pr;
      c.fillStyle = haz;
      c.fillRect(0, -hw, 2400, hw * 2);
      c.globalAlpha = 1;
      c.fillStyle = C.hot;
      c.fillRect(0, -hw - 2, 2400, 2);
      c.fillRect(0, hw, 2400, 2);
      c.fillStyle = bl ? C.bone : C.label;
      for (n = 0; n < 16; n++) chev(c, 34 + n * 46 + pr * 46, 0, 6 * s0);
      base(c);
    }
    function hband(c, y, hw, pr, side, bl) {
      var n;
      c.globalAlpha = 0.22 + 0.35 * pr;
      c.fillStyle = haz;
      c.fillRect(0, y - hw, W, hw * 2);
      c.globalAlpha = 1;
      c.fillStyle = C.hot;
      c.fillRect(0, y - hw - 2, W, 2);
      c.fillRect(0, y + hw, W, 2);
      c.setTransform(dpr * side, 0, 0, dpr, dpr * ((side > 0 ? 0 : W) + shx), dpr * shy);
      c.fillStyle = bl ? C.bone : C.label;
      for (n = 0; n < W / 60; n++) chev(c, 20 + n * 60 + pr * 60, y, 8 * s0);
      base(c);
    }
    function vband(c, x, w, pr, bl, y0) {
      c.globalAlpha = 0.16 + 0.3 * pr;
      c.fillStyle = haz;
      c.fillRect(x, y0, w, H - y0);
      c.globalAlpha = 1;
      c.fillStyle = C.hot;
      c.fillRect(x, y0, 2, H - y0);
      c.fillRect(x + w - 2, y0, 2, H - y0);
      c.setTransform(0, dpr, -dpr, 0, dpr * (x + w / 2 + shx), dpr * shy);
      c.fillStyle = bl ? C.bone : C.label;
      for (var n = 0; n < 3; n++) chev(c, y0 + lh + 20 + n * 18 + pr * 18, 0, 7);
      base(c);
    }
    function gapMark(c, x, y, w, col) {
      c.fillStyle = col;
      c.fillRect(x - w / 2, y - 10, 3, 20);
      c.fillRect(x + w / 2 - 3, y - 10, 3, 20);
      c.fillRect(x - w / 2, y - 10, 8, 3);
      c.fillRect(x + w / 2 - 8, y - 10, 8, 3);
      c.fillRect(x - w / 2, y + 7, 8, 3);
      c.fillRect(x + w / 2 - 8, y + 7, 8, 3);
    }
    var GR = false, GX0 = 0, GY0 = 0, GX1 = 0, GY1 = 0, BXF = [1.04, 1.12, 1.2, 1.14];
    function bossRect() {
      var k, p, hw, hh;
      GR = false;
      if (!BO.on || BO.st < 1 || BO.gone || !BA) return;
      if (BO.v2) {
        if (B2.rect(BR)) {
          GR = true;
          GX0 = BR[0] - 12;
          GY0 = BR[1] - 12;
          GX1 = BR[2] + 12;
          GY1 = BR[3] + 12;
        }
        return;
      }
      for (k = 0; k < BO.n; k++) {
        p = BP[k];
        if (!p.alive) continue;
        hw = p.w * 0.5 * BXF[BO.type] + 12;
        hh = p.h * 0.5 * (BO.type === 3 ? 1.16 : 1.08) + 12;
        if (!GR) {
          GX0 = p.x - hw;
          GX1 = p.x + hw;
          GY0 = p.y - hh;
          GY1 = p.y + hh;
          GR = true;
        } else {
          GX0 = Math.min(GX0, p.x - hw);
          GX1 = Math.max(GX1, p.x + hw);
          GY0 = Math.min(GY0, p.y - hh);
          GY1 = Math.max(GY1, p.y + hh);
        }
      }
    }
    function label(c, s, x, y, col, px) {
      px = px || 11;
      c.font = LBF[px] || (LBF[px] = "700 " + px + "px " + MONO);
      ls(c, 1.5);
      c.textAlign = "center";
      c.textBaseline = "middle";
      var key2 = s + px, w = LBW[key2];
      if (w === void 0) w = LBW[key2] = c.measureText(s).width;
      if (GR && x + w / 2 + 6 > GX0 && x - w / 2 - 6 < GX1 && y + 9 > GY0 && y - 9 < GY1) y = GY1 + 12;
      c.fillStyle = C.ink;
      c.fillRect(x - w / 2 - 6, y - 9, w + 12, 18);
      c.fillStyle = col;
      c.fillText(s, x, y + 0.5);
      ls(c, 0);
    }
    function drawTele(c) {
      var b = BO, j = b.atk, p = BP[0], pr = TP, bl = reduced ? 1 : (b.age * 16 | 0) & 1, k, x, y, w, a, r, n, hw, y0;
      if (j === A_ARR || j === A_ENP || j === A_PNC) {
        y0 = p.y + ORY[b.type] * p.h;
        a = Math.atan2(b.ty - y0, b.tx - p.x);
        hw = (24 - 17 * pr) * s0;
        n = j === A_PNC || j === A_ARR && b.phase < 2 ? 0 : 1;
        for (k = -n; k <= n; k++) lane(c, p.x, y0, a + k * 0.3, hw, pr, bl);
        reticle(c, b.tx, b.ty, (54 - 36 * pr) * s0, bl ? C.bone : C.hot);
        if (j === A_PNC) {
          label(c, "KERNEL PANIC", W / 2, H * 0.5, bl ? C.bone : C.hot, 22);
          c.fillStyle = C.hot;
          c.fillRect(W / 2 - 90, H * 0.5 + 16, 180 * (1 - pr), 4);
        }
      } else if (j === A_DER) {
        eye2(p, 0);
        c.globalAlpha = 0.14 + 0.3 * pr;
        c.fillStyle = haz;
        c.beginPath();
        c.moveTo(EX, EY);
        c.lineTo(EX + Math.cos(b.a0) * 3e3, EY + Math.sin(b.a0) * 3e3);
        c.lineTo(EX + Math.cos(b.a1) * 3e3, EY + Math.sin(b.a1) * 3e3);
        c.closePath();
        c.fill();
        c.globalAlpha = 1;
        lane(c, EX, EY, b.a0, (16 - 10 * pr) * s0, pr, bl);
        c.fillStyle = bl ? C.bone : C.hot;
        for (k = 1; k < 7; k++) {
          a = b.a0 + (b.a1 - b.a0) * k / 7;
          r = 150 * s0;
          c.setTransform(dpr * Math.cos(a + b.sd * 1.57), dpr * Math.sin(a + b.sd * 1.57), -dpr * Math.sin(a + b.sd * 1.57), dpr * Math.cos(a + b.sd * 1.57), dpr * (EX + Math.cos(a) * r + shx), dpr * (EY + Math.sin(a) * r + shy));
          chev(c, 0, 0, 7);
        }
        base(c);
      } else if (j === A_DNG) {
        eye2(p, 0);
        for (k = 0; k < (b.phase >= 3 ? 5 : 4); k++) {
          a = Math.PI * (0.15 + 0.7 * k / ((b.phase >= 3 ? 5 : 4) - 1));
          reticle(c, EX + Math.cos(a) * 80 * s0 * (0.5 + pr), EY + Math.sin(a) * 80 * s0 * (0.5 + pr), 10, bl ? C.bone : C.hot);
        }
      } else if (j === A_WALL) {
        c.globalAlpha = 0.25 + 0.35 * pr;
        c.fillStyle = haz;
        c.fillRect(0, 0, b.gx - b.gw / 2, 28);
        c.fillRect(b.gx + b.gw / 2, 0, W, 28);
        c.globalAlpha = 1;
        c.fillStyle = C.hot;
        c.fillRect(0, 28, b.gx - b.gw / 2, 2);
        c.fillRect(b.gx + b.gw / 2, 28, W, 2);
        gapMark(c, b.gx, 16 + pr * 30, b.gw, bl ? C.bone : C.hot);
        label(c, "0x00000000", W / 2, 44, C.label, 10);
      } else if (j === A_JMP) {
        x = clamp2(b.tx, p.w * 0.4, W - p.w * 0.4);
        w = p.w * 0.8;
        vband(c, x - w / 2, w, pr, bl, 0);
        reticle(c, x, H - 34 * s0, (60 - 30 * pr) * s0, bl ? C.bone : C.hot);
      } else if (j === A_SPI || j === A_SPR || j === A_MAL || j === A_RNG || j === A_HEL || j === A_SWP) {
        eye2(p, 0);
        r = (90 - 60 * pr) * s0;
        c.fillStyle = bl ? C.bone : C.hot;
        n = j === A_RNG ? 14 : 8;
        for (k = 0; k < n; k++) {
          a = k * 6.283 / n + b.age;
          c.fillRect(EX + Math.cos(a) * r - 2, EY + Math.sin(a) * r - 2, 4, 4);
        }
        if (j === A_SWP) for (k = 0; k < 4; k++) {
          a = k * 1.571 + 0.785;
          lane(c, EX + Math.cos(a) * 900, EY + Math.sin(a) * 900, a + Math.PI, 8 * s0, pr, bl);
        }
        if (j === A_MAL) label(c, "malloc()", EX, EY + p.h * 0.6, C.label, 10);
      } else if (j === A_DMP || j === A_EML) {
        for (k = 0; k < RN; k++) {
          x = RX[k];
          w = spr[RK[k]].w;
          vband(c, x, w, pr, bl, 0);
          r = (1 - pr) * 12;
          c.strokeStyle = bl ? C.bone : C.hot;
          c.lineWidth = 2;
          c.strokeRect(x - r, 2, w + r * 2, lh + r * 0.6);
        }
      } else if (j === A_GC) {
        x = b.sd > 0 ? 0 : W - 34;
        c.globalAlpha = 0.3 + 0.4 * pr;
        c.fillStyle = haz;
        c.fillRect(x, 0, 34, b.gy - b.gw / 2);
        c.fillRect(x, b.gy + b.gw / 2, 34, H);
        c.globalAlpha = 1;
        gapMark(c, b.sd > 0 ? 40 : W - 40, b.gy, b.gw * 0.4, bl ? C.bone : C.hot);
        hband(c, b.gy, b.gw / 2, pr * 0.2, b.sd, bl);
        label(c, "free()", b.sd > 0 ? 70 : W - 70, b.gy - b.gw / 2 - 14, C.label, 10);
      } else if (j === A_OOM) {
        w = W * 0.27 * pr;
        c.globalAlpha = 0.35;
        c.fillStyle = haz;
        c.fillRect(0, 0, w, H);
        c.fillRect(W - w, 0, w, H);
        c.globalAlpha = 1;
        c.fillStyle = C.hot;
        c.fillRect(w, 0, 2, H);
        c.fillRect(W - w - 2, 0, 2, H);
        label(c, "OUT OF MEMORY", W / 2, H * 0.5, bl ? C.bone : C.hot, 16);
      } else if (j === A_SWE || j === A_ERC || j === A_DSY) {
        hw = (28 - 19 * pr) * s0;
        for (k = 0; k < (b.phase >= 2 && j === A_SWE ? 2 : 1); k++) hband(c, clamp2(b.ty - k * 46 * s0, 20, H - 20), hw, pr, b.sd, bl);
        if (j === A_DSY) hband(c, clamp2(b.ty - 92 * s0, 20, H - 20), hw, pr, -b.sd, bl);
      } else if (j === A_CRS) {
        y = Math.max(BP[0].y, BP[1].y) + BP[0].h * 0.45;
        x = W / 2 + Math.sin(b.a0) * W * 0.32;
        c.globalAlpha = 0.18 + 0.3 * pr;
        c.fillStyle = haz;
        c.fillRect(0, y, x - b.gw / 2, H - y);
        c.fillRect(x + b.gw / 2, y, W, H - y);
        c.globalAlpha = 1;
        c.strokeStyle = bl ? C.bone : C.hot;
        c.lineWidth = 2;
        c.strokeRect(x - b.gw / 2, y, b.gw, H - y);
      } else if (j === A_LCK) {
        drawGrid(c, pr);
      } else if (j === A_TND) {
        k = BP[0].alive ? BP[0] : BP[1];
        hband(c, clamp2(b.ly[0], H * 0.36, H - k.h * 0.4), k.h * 0.42, pr, k.side, bl);
      } else if (j === A_STK) {
        for (k = 0; k < RN; k++) {
          x = RK[k] * W / NSK;
          c.globalAlpha = 0.2 + 0.3 * pr;
          c.fillStyle = haz;
          c.fillRect(x + 2, H - pj[9].h * 3, W / NSK - 4, pj[9].h * 3);
          c.globalAlpha = 1;
          c.fillStyle = bl ? C.bone : C.hot;
          chev(c, x + W / NSK / 2, 18 + pr * 20, 7);
        }
        label(c, "stack overflow", W / 2, H - pj[9].h * 3 - 16, C.label, 10);
      } else if (j === A_COR) {
        x = b.lane - b.laneW / 2;
        w = b.lane + b.laneW / 2;
        c.globalAlpha = b.sub === 2 ? 0.45 : 0.22;
        c.fillStyle = haz;
        c.fillRect(0, 0, x, H);
        c.fillRect(w, 0, W - w, H);
        c.globalAlpha = 1;
        c.strokeStyle = C.bone;
        c.lineWidth = 2;
        c.strokeRect(x, 0, b.laneW, H);
        c.font = "500 9px " + MONO;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillStyle = C.bone;
        c.fillText("BEZPIECZNY", b.lane, H * 0.62);
        c.fillStyle = C.hot;
        c.fillRect(x, 0, b.laneW * clamp2(1 - b.ft / b.fd, 0, 1), 5);
        a = b.sub === 1 ? 1 + 0.6 * (1 - b.ft / 1.2) : 1;
        c.strokeStyle = C.hot;
        c.lineWidth = 2;
        c.strokeRect(p.x - p.w * 0.5 * a, p.y - p.h * 0.45 * a, p.w * a, p.h * 0.9 * a);
        if (b.sub === 1) label(c, "BOMBA = PARRY", p.x, p.y + p.h * 0.6, bl ? C.bone : C.hot, 11);
      }
    }
    function drawGrid(c, pr) {
      var b = BO, j, x, y, n, top2 = b.ly[0] - (b.ly[1] - b.ly[0]) * 0.8, act = b.fs === S_ATK, u = BP[0].u, lx = b.lx[1], lyc = (b.ly[0] + b.ly[1]) / 2;
      c.globalAlpha = act ? 1 : 0.25 + 0.5 * pr;
      for (j = 0; j < 3; j++) for (y = top2; y < H; y += 15 * u) {
        c.setTransform(0, dpr * u, -dpr * u, 0, dpr * (b.lx[j] + shx), dpr * (y + shy));
        c.drawImage(act ? BA.l1 : BA.l0, -9, -9, 18, 18);
      }
      for (j = 0; j < 2; j++) for (x = 0; x < W; x += 15 * u) {
        c.setTransform(dpr * u, 0, 0, dpr * u, dpr * (x + shx), dpr * (b.ly[j] + shy));
        c.drawImage(act ? BA.l1 : BA.l0, -9, -9, 18, 18);
      }
      base(c);
      c.globalAlpha = 1;
      if (act && b.lockHp > 0) {
        n = 14 * s0;
        c.fillStyle = C.ink;
        c.fillRect(lx - n - 2, lyc - n - 2, n * 2 + 4, n * 2 + 4);
        c.fillStyle = C.bone;
        c.fillRect(lx - n, lyc - n * 0.4, n * 2, n * 1.4);
        c.strokeStyle = C.bone;
        c.lineWidth = 3;
        c.strokeRect(lx - n * 0.55, lyc - n, n * 1.1, n * 0.7);
        c.fillStyle = C.hot;
        c.fillRect(lx - n, lyc + n - 4, n * 2 * b.lockHp / 10, 3);
        c.fillStyle = C.ink;
        c.fillRect(lx - 2, lyc, 4, 6);
      }
    }
    function drawAtk(c) {
      var b = BO, j = b.atk, k, a, ca, sa, hw, x, f, pp;
      if (b.bm) {
        eye2(BP[0], 0);
        a = b.bmA;
        ca = Math.cos(a);
        sa = Math.sin(a);
        hw = b.bmHW;
        c.setTransform(dpr * ca, dpr * sa, -dpr * sa, dpr * ca, dpr * (EX + shx), dpr * (EY + shy));
        c.fillStyle = C.ink;
        c.fillRect(0, -hw - 2, 2400, hw * 2 + 4);
        c.fillStyle = C.hot;
        c.fillRect(0, -hw, 2400, hw * 2);
        c.fillStyle = C.bone;
        c.fillRect(0, -hw * 0.42, 2400, hw * 0.84);
        for (k = 0; k < 24; k++) {
          x = (k * 97 + b.age * 900) % 2400;
          c.fillStyle = C.ink;
          c.fillRect(x, -hw * 0.42, 6, hw * 0.84);
        }
        base(c);
      }
      if (j === A_LCK && b.fs === S_ATK && b.lockHp > 0) drawGrid(c, 1);
      if (b.wl > 0) {
        for (k = 0; k < 2; k++) {
          x = k ? W - b.wl : 0;
          c.fillStyle = C.ink;
          c.fillRect(x, 0, b.wl, H);
          c.globalAlpha = 0.5;
          c.fillStyle = haz;
          c.fillRect(x, 0, b.wl, H);
          c.globalAlpha = 1;
          c.fillStyle = C.bone;
          c.fillRect(k ? x : x + b.wl - 3, 0, 3, H);
        }
        label(c, "OOM", W / 2, H - 30, C.hot, 12);
      }
      if (b.echo > 0 && b.echoA === A_GC) {
        x = b.echoS > 0 ? 0 : W - 34;
        c.globalAlpha = 0.45;
        c.fillStyle = haz;
        c.fillRect(x, 0, 34, b.ty - b.gw / 2);
        c.fillRect(x, b.ty + b.gw / 2, 34, H);
        c.globalAlpha = 1;
        gapMark(c, b.echoS > 0 ? 40 : W - 40, b.ty, b.gw * 0.4, (b.age * 16 | 0) & 1 ? C.bone : C.hot);
      }
      if (j === A_SWP && b.fs === S_ATK) {
        pp = BP[0];
        c.strokeStyle = C.hot;
        c.lineWidth = 2;
        f = b.age * 2 % 1;
        for (k = 0; k < 5; k++) {
          a = 1 - (k / 5 + f) % 1;
          c.globalAlpha = 0.25 + 0.6 * (1 - a);
          c.beginPath();
          c.moveTo(ship.x + (pp.x - ship.x) * (1 - a), ship.y + (pp.y - ship.y) * (1 - a));
          c.lineTo(ship.x + (pp.x - ship.x) * (1 - a * 0.9), ship.y + (pp.y - ship.y) * (1 - a * 0.9));
          c.stroke();
        }
        c.globalAlpha = 1;
        label(c, "SWAP", pp.x, pp.y + pp.h * 0.62, C.bone, 11);
      }
      if (j === A_TND && b.fs === S_ATK && b.tm < 1 && alive() === 2) hband(c, clamp2(b.ly[1], H * 0.36, H - BP[1].h * 0.4), BP[1].h * 0.42, clamp2((b.tm - 0.5) / 0.5, 0, 1), -1, (b.age * 16 | 0) & 1);
    }
    function drawStack(c) {
      var k, j, sp = pj[9], cw2 = W / NSK, x;
      for (k = 0; k < NSK; k++) for (j = 0; j < STK[k]; j++) {
        x = k * cw2 + (cw2 - sp.w) / 2;
        c.globalAlpha = STT[k] < 1 && !reduced && (STT[k] * 10 | 0) & 1 ? 0.5 : 1;
        c.drawImage(BO.panic ? sp.i : sp.c, x, H - (j + 1) * sp.h, sp.w, sp.h);
        c.fillStyle = C.ink;
        c.fillRect(k * cw2, H - (j + 1) * sp.h, x - k * cw2, sp.h);
        c.fillRect(x + sp.w, H - (j + 1) * sp.h, x - k * cw2, sp.h);
      }
      c.globalAlpha = 1;
    }
    function drawElTele(c) {
      var bl = (t * 16 | 0) & 1, pr = 1 - ELP.t / 0.8, w;
      if (ELP.k === 1) {
        c.globalAlpha = 0.3 + 0.3 * pr;
        c.fillStyle = haz;
        c.fillRect(0, 0, ELP.gx - ELP.gw / 2, 26);
        c.fillRect(ELP.gx + ELP.gw / 2, 0, W, 26);
        c.globalAlpha = 1;
        gapMark(c, ELP.gx, 14, ELP.gw, bl ? C.bone : C.hot);
        label(c, "merge conflict", ELP.gx, 42, C.hot, 10);
      } else {
        w = elSpr[ELP.k === 2 ? 2 : 3].w;
        vband(c, ELP.x, w, pr, bl, 0);
        label(c, ELP.k === 2 ? "while(true)" : "// FIXME", ELP.x + w / 2, 42, C.hot, 10);
      }
    }
    function draw() {
      if (dead || !W) return;
      var c = ctx, k, o, p, f, sp, a, inv = BO.on && BO.panic > 0, x0, fr;
      shx = shy = 0;
      if (shake > 0 && fxShake) {
        a = 6 * shake / 0.3;
        shx = rnd2(-a, a);
        shy = rnd2(-a, a);
      }
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.globalAlpha = 1;
      c.fillStyle = inv ? C.bone : C.ink;
      c.fillRect(0, 0, W, H);
      if (despP > 0 && !inv) {
        c.globalAlpha = 0.2 + 0.14 * Math.sin(despP * 4.5);
        c.fillStyle = C.deep;
        c.fillRect(0, 0, W, H);
        c.globalAlpha = 1;
      }
      base(c);
      c.drawImage(city, -cityOff, H - cityH, cityP, cityH);
      c.drawImage(city, cityP - cityOff, H - cityH, cityP, cityH);
      if (cityW > 0) {
        fr = cityW * (W + 40);
        c.save();
        c.beginPath();
        c.rect(-10, H - cityH - 12, fr, cityH + 24);
        c.clip();
        c.drawImage(cityB, -cityOff, H - cityH, cityP, cityH);
        c.drawImage(cityB, cityP - cityOff, H - cityH, cityP, cityH);
        c.restore();
        if (cityW < 1) {
          c.fillStyle = C.hot;
          c.fillRect(fr - 12, H - cityH, 2, cityH);
        }
      }
      for (a = 1; a >= 0; a--) {
        for (k = 0; k < clouds.length; k++) {
          o = clouds[k];
          if (o.far !== !!a || o.gl && cityW <= 0) continue;
          c.fillStyle = o.gl ? a ? C.bar : C.deep : a ? C.cloudFar : C.cloudNear;
          if (o.gl) c.globalAlpha = cityW;
          c.fillRect(o.x, o.y, o.w, o.h);
          c.fillRect(o.x + o.o, o.y + o.h, o.w * o.sw, 2);
          c.fillRect(o.x - o.o * 0.6, o.y - 2, o.w * 0.3, 2);
          c.globalAlpha = 1;
        }
      }
      if (BO.on && BO.st === 1) {
        c.globalAlpha = 0.62 * Math.min(1, BO.age / 0.2) * clamp2((BO.il - BO.age) / 0.35, 0, 1);
        c.fillStyle = C.ink;
        c.fillRect(-10, -10, W + 20, H + 20);
        c.globalAlpha = 1;
      }
      bossRect();
      for (k = 0; k < obN; k++) {
        o = OB[k];
        if (o.k < 0) {
          sp = elSpr[-1 - o.k];
          if (o.el === 1) {
            c.fillStyle = C.bone;
            x0 = o.ex < 0 ? 0 : o.x + o.w;
            c.fillRect(x0, o.y, o.ex < 0 ? o.x : W - x0, o.h);
            c.fillStyle = C.deep;
            c.fillRect(x0, o.y + 2, o.ex < 0 ? o.x : W - x0, o.h - 4);
          }
          if (o.el === 3 && o.fz > 0 && (o.fz * 20 | 0) & 1) {
            c.fillStyle = C.bone;
            c.fillRect(o.x - 2, o.y - 2, o.w + 4, o.h + 4);
          }
          c.drawImage(sp.c, o.x, o.y, o.w, o.h);
          if (o.el === 2) {
            c.fillStyle = C.hot;
            chev(c, o.x + o.w + 10, o.y + o.h / 2, 5);
          }
        } else {
          sp = spr[o.k];
          if (GR && !o.at && o.x < GX1 && o.x + o.w > GX0 && o.y < GY1 && o.y + o.h > GY0) {
            c.save();
            c.beginPath();
            c.rect(0, 0, W, H);
            c.rect(GX0, GY0, GX1 - GX0, GY1 - GY0);
            c.clip("evenodd");
            c.drawImage(o.hv ? sp.b : sp.n, o.x, o.y, o.w, o.h);
            c.restore();
            c.save();
            c.beginPath();
            c.rect(GX0, GY0, GX1 - GX0, GY1 - GY0);
            c.clip();
            c.globalAlpha = 0.3;
            c.drawImage(sp.t, o.x, o.y, o.w, o.h);
            c.restore();
          } else c.drawImage(o.hv ? sp.b : sp.n, o.x, o.y, o.w, o.h);
          if (o.hv && mode2 === "ogien") {
            c.fillStyle = C.bone;
            for (a = 0; a < o.hp; a++) c.fillRect(o.x + o.w - 5, o.y + 3 + a * 5, 3, 3);
          }
        }
        if (o.hit > 0) {
          c.strokeStyle = C.bone;
          c.lineWidth = 2;
          c.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
        }
      }
      if (ELP.k && state === "play") drawElTele(c);
      if (BO.on && BO.st === 2) {
        if (BO.v2) {
          B2.drawAtk(c);
          B2.drawTele(c);
        } else {
          drawAtk(c);
          if (BO.fs === S_TELE && BO.atk >= 0) drawTele(c);
        }
      }
      if (BO.on && BO.st >= 1) {
        if (BO.v2) {
          if (!BO.gone) B2.drawBoss(c);
        } else drawBoss(c);
      }
      if (BO.on) drawStack(c);
      if (moby.busy() || attract) moby.draw(c, shx, shy);
      for (k = 0; k < prN; k++) {
        p = PR[k];
        sp = pj[p.g];
        if (p.bh === 1 && p.s === 1 && !reduced && (p.t * 12 | 0) & 1) {
          c.setTransform(dpr, 0, 0, dpr, dpr * (p.x + shx), dpr * (p.y + shy));
          c.strokeStyle = C.hot;
          c.lineWidth = 2;
          c.strokeRect(-6, -6, 12, 12);
          continue;
        }
        if (p.g <= 3) {
          a = Math.cos(p.rot);
          f = Math.sin(p.rot);
          c.setTransform(dpr * a, dpr * f, -dpr * f, dpr * a, dpr * (p.x + shx), dpr * (p.y + shy));
          c.drawImage(inv ? sp.i : sp.c, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
        } else if (p.g === 5) {
          c.setTransform(dpr, 0, 0, dpr, dpr * (p.x + shx), dpr * (p.y + shy));
          c.drawImage(inv ? sp.i : sp.c, -p.r, -p.r, p.r * 2, p.r * 2);
        } else {
          c.setTransform(dpr, 0, 0, dpr, dpr * (p.x + shx), dpr * (p.y + shy));
          c.drawImage(inv ? sp.i : sp.c, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
        }
      }
      base(c);
      if (chN) {
        for (k = 0; k < chN; k++) {
          o = CH[k];
          if (o.life < 1 && !o.pull && (o.life * 10 | 0) & 1) continue;
          a = (4 + Math.min(3, o.v)) * s0;
          x0 = o.x - a;
          f = o.y - a;
          c.fillStyle = C.allyDark;
          c.fillRect(x0 - 1, f + 1, a * 2 + 2, a * 2 - 2);
          c.fillRect(x0 + 1, f - 1, a * 2 - 2, a * 2 + 2);
          c.fillStyle = C.ally;
          c.fillRect(x0, f + 1.5, a * 2, a * 2 - 3);
          c.fillRect(x0 + 1.5, f, a * 2 - 3, a * 2);
          c.fillStyle = C.allyDark;
          c.fillRect(o.x - 0.75, f + 1.5, 1.5, a * 2 - 3);
          c.fillRect(o.x - a * 0.45, o.y - 0.75, a * 0.9, 1.5);
        }
      }
      if (blN) {
        c.fillStyle = C.bone;
        for (k = 0; k < blN; k++) {
          o = BL[k];
          if (o.sh) c.fillRect(o.x - 1.5, o.y, 3, 5);
          else c.fillRect(o.x - 1, o.y, o.dm >= 2 ? 3 : 2, 10);
        }
      }
      if (laserOn > 0 && state === "play") {
        a = Math.max(0, laserHit);
        f = reduced ? 1 : 0.75 + 0.25 * Math.sin(t * 60);
        c.fillStyle = C.allyDark;
        c.fillRect(ship.x - 6 * s0, a, 12 * s0, ship.y - 16 * s0 - a);
        c.fillStyle = C.ally;
        c.fillRect(ship.x - 3.5 * s0 * f, a, 7 * s0 * f, ship.y - 16 * s0 - a);
        c.fillStyle = C.bone;
        c.fillRect(ship.x - 1, a, 2, ship.y - 16 * s0 - a);
      }
      if (FXV.drone && state !== "start" && state !== "over") {
        x0 = ship.x - 26 * s0;
        f = ship.y + 2 + (reduced ? 0 : Math.sin(t * 5) * 2);
        c.fillStyle = C.allyDark;
        c.beginPath();
        c.moveTo(x0, f - 8 * s0);
        c.lineTo(x0 + 6 * s0, f);
        c.lineTo(x0, f + 8 * s0);
        c.lineTo(x0 - 6 * s0, f);
        c.closePath();
        c.fill();
        c.fillStyle = C.ally;
        c.fillRect(x0 - 2 * s0, f - 2 * s0, 4 * s0, 4 * s0);
      }
      if (state !== "dying" && state !== "over" && state !== "start") drawShip(c, ship.x, ship.y, s0);
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
        c.font = "500 11px " + MONO;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillStyle = inv ? C.ink : C.ally;
        for (k = 0; k < flN; k++) {
          f = FL[k];
          c.globalAlpha = Math.min(1, f.life / 0.3);
          c.fillText(f.txt, f.x, f.y);
        }
        c.globalAlpha = 1;
      }
      if (banner > 0 && state !== "start") {
        var bt = 1.6 - banner, bx, bw2, by = Math.round(BO.on ? H - 52 : H * 0.56);
        c.font = "500 12px " + MONO;
        c.textAlign = "left";
        c.textBaseline = "middle";
        if (!bannerW) bannerW = c.measureText(bannerTxt).width;
        bw2 = bannerW + 56;
        bx = W / 2 - bw2 / 2;
        if (!reduced) bx += bt < 0.22 ? -(1 - ease3(bt / 0.22)) * (bx + bw2) : banner < 0.22 ? (1 - ease3(banner / 0.22)) * (W - bx) : 0;
        else c.globalAlpha = Math.min(1, bt / 0.2, banner / 0.2);
        c.fillStyle = C.ink;
        c.fillRect(bx, by - 15, bw2, 30);
        c.fillStyle = C.line;
        c.fillRect(bx, by - 15, bw2, 1);
        c.fillRect(bx, by + 14, bw2, 1);
        c.fillStyle = BO.on ? C.acc : C.bone;
        c.fillRect(bx, by - 15, 3, 30);
        c.fillStyle = C.muted;
        c.fillText(">_", bx + 14, by + 1);
        c.fillStyle = C.bone;
        c.fillText(bannerTxt, bx + 40, by + 1);
        c.globalAlpha = 1;
      }
      if (flash > 0 && fxFlash) {
        p = flash / FLASH;
        c.globalAlpha = 0.3 * p;
        c.fillStyle = C.acc;
        c.fillRect(0, 0, W, H);
        c.globalAlpha = 0.75 * p;
        c.fillStyle = C.cyan;
        for (k = 0; k < 6; k++) c.fillRect((k & 1 ? 12 : -12) * p, H * (0.08 + k * 0.16), W, 3 + k % 3 * 5);
        c.globalAlpha = 1;
      }
      if (state !== "start") hud(c);
    }
    function needLoop() {
      return !dead && (state === "play" || state === "dying" || attract || cnt.busy() || gp.connected() || MNT.k < 1);
    }
    function frame(now) {
      raf = 0;
      if (dead) return;
      var dt = (now - last) / 1e3;
      last = now;
      if (dt > 0.05) dt = 0.05;
      else if (dt < 0) dt = 0;
      if (gp.connected()) padTick(dt);
      if (state === "play" || state === "dying") {
        if (hitstop > 0) {
          hitstop -= dt;
          dt = 0;
        }
        update(dt);
        for (var r = 1; r < tempo && (state === "play" || state === "dying"); r++) update(dt);
        draw();
      } else if (attract) {
        menuT += dt;
        bgTick(dt);
        moby.update(dt, dt);
        draw();
      }
      if (cnt.busy()) cnt.tick(dt);
      if (MNT.k < 1) hangar.tick(dt);
      if (!raf && needLoop()) raf = win.requestAnimationFrame(frame);
    }
    function startLoop() {
      if (!raf && needLoop()) {
        last = win.performance.now();
        raf = win.requestAnimationFrame(frame);
      }
    }
    function stopLoop() {
      if (raf) {
        win.cancelAnimationFrame(raf);
        raf = 0;
      }
    }
    function stopIdle() {
      if (!needLoop()) stopLoop();
    }
    var scr = createScreens(root2, { onShow: onShowScr, onMove: function() {
      sfx("tik");
    } });
    var topkaPanel = null;
    var hangar = createHangar({
      root: root2,
      shop,
      mem: shopMem,
      sfx,
      say: function(t2) {
        live.textContent = t2;
      },
      cnt,
      reduced: function() {
        return reduced || !set.glitch;
      },
      mnt: MNT,
      ship: function(c) {
        shipTo(c, false);
      },
      loop: startLoop,
      focus: function(el2) {
        scr.focus(el2, kbNav);
      }
    });
    function recKey(m, a) {
      return KEYP + ((a == null ? set.arena !== false : a) ? "" : "kamp.") + m;
    }
    function best(m, a) {
      var ar = a == null ? set.arena !== false : a;
      return Math.max(load(recKey(m, ar)), ar ? mem[m] : mem["k" + m] || 0);
    }
    function unlocked() {
      return unlockOpt || load(KEYP + "sudo") > 0;
    }
    function modeName(m) {
      return m === "ogien" ? "Ogień" : "Unik";
    }
    function setBanner() {
      showBanner(rush ? waveName(wave) : waveTitle(wave));
      hudWave = "FALA " + (rush ? wave : Math.floor((wave - 1) / 5) + 1 + "." + ((wave - 1) % 5 + 1));
    }
    function ui() {
      bPause.hidden = state !== "play";
      bBomb.hidden = !(touch && state === "play");
      bBombT.textContent = "×" + bombs;
      bBomb.setAttribute("aria-label", "Bomba, zostało " + bombs);
      bBomb.disabled = bombs <= 0;
    }
    function setMode(m) {
      mode2 = "ogien";
      set.base = mode2;
      saveSettings(set);
      recNow = best(mode2);
    }
    function focusIn(sel) {
      var b = q(sel);
      if (b) scr.focus(b, kbNav);
    }
    function showScr(name, focus, o) {
      o = o || {};
      o.focus = focus;
      o.kb = kbNav;
      scr.show(name, o);
    }
    function onShowScr(name, prev) {
      if (prev === "topka" && name !== "topka" && topkaPanel) {
        try {
          topkaPanel.destroy();
        } catch (e) {
        }
        topkaPanel = null;
      }
      if (name === "menu") fillMenu();
      else if (name === "modes") fillModes();
      else if (name === "topka") openTopka();
      else if (name === "settings") fillSettings();
      else if (name === "hangar") hangar.fill(false);
      else if (name === "pause") fillPause();
      updateAttract(name);
    }
    function updateAttract(name) {
      var want = state === "start" && !reduced && (name === "title" || name === "menu" || name === "modes");
      if (want !== attract) {
        attract = want;
        moby.attract(want);
        if (!want) moby.clear();
      }
      if (state === "start") {
        if (attract || cnt.busy()) startLoop();
        else {
          stopIdle();
          draw();
        }
      } else startLoop();
    }
    function toMenu() {
      sfx("ok");
      showScr("menu", "[data-a=start]");
    }
    function fillMenu() {
      var o = mode2 === "ogien" ? "unik" : "ogien", og = q(".dcg-og").children, j, k, beat = 0, rb = load(KEYP + "rush." + mode2), d = reduced ? 0 : 0.7;
      q(".dcg-pm").textContent = modeName(mode2) + (set.diff === "sudo" && unlocked() ? " · sudo" : "") + (set.arena !== false ? " · Arena" : " · Kampania");
      q(".dcg-pkr").textContent = "₡ " + fmt(shop.kr);
      q(".dcg-skr").textContent = "₡ " + fmt(shop.kr);
      k = set.arena !== false ? " · arena" : " · kampania";
      q(".dcg-rm").textContent = modeName(mode2) + k;
      q(".dcg-rm2").textContent = modeName(o) + k;
      q(".dcg-sm1").textContent = modeName(mode2);
      cnt.set(q("[data-cu=rec]"), best(mode2), d);
      cnt.set(q("[data-cu=rec2]"), best(o), d);
      for (j = 0; j < 4; j++) {
        k = load(KEYP + "ocena." + j);
        og[j].textContent = k ? GRADES[k - 1] : "–";
        og[j].className = k ? "dcg-ok" : "";
        if (k) beat++;
      }
      q(".dcg-sbo").textContent = beat + " / 4";
      q(".dcg-rush").textContent = rb ? fmtT(rb) : "—";
      q(".dcg-prb").textContent = fmt(load(KEYP + "proby." + mode2));
      sudo = set.diff === "sudo" && unlocked();
      var cpd = loadJ(cpKey()), cb = q(".dcg-menu [data-a=cont]");
      cb.hidden = !(cpd && cpd.tier > 0 && cpd.up);
      if (!cb.hidden) cb.querySelector(".dcg-cpt").textContent = "Po bossie " + BN[(cpd.tier - 1) % 4];
      if (!cb.hidden) cb.querySelector(".dcg-kb").textContent = fmt(cpd.score);
      q(".dcg-menu [data-a=exit]").hidden = typeof opts.onExit !== "function";
      shipView();
    }
    function shipView() {
      shipTo(q(".dcg-shipv"), set.arena !== false);
    }
    function shipTo(c, baseOnly) {
      var r, x, w, h, k, j, id, sP = {}, sU = {}, sSh = shieldOn;
      if (!c || !c.offsetParent || !dpr) return;
      for (j = 0; j < SHOP.length; j++) {
        id = SHOP[j].id;
        sP[id] = P2[id];
        P2[id] = baseOnly ? 0 : shop.lv[id];
      }
      for (id in up) {
        sU[id] = up[id];
        up[id] = 0;
      }
      shieldOn = false;
      visLv();
      r = c.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      if (c.width !== w * dpr || c.height !== h * dpr) {
        c.width = w * dpr;
        c.height = h * dpr;
      }
      x = c.getContext("2d");
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.clearRect(0, 0, c.width, c.height);
      k = Math.min(w, h) / 64;
      shx = shy = 0;
      var tl = tilt, vx = ship.vx, vy = ship.vy, iv = invul;
      tilt = 0;
      ship.vx = ship.vy = 0;
      invul = 0;
      drawShip(x, w / 2, h / 2 + 2 * k, k);
      tilt = tl;
      ship.vx = vx;
      ship.vy = vy;
      invul = iv;
      for (id in sP) P2[id] = sP[id];
      for (id in sU) up[id] = sU[id];
      shieldOn = sSh;
      visLv();
    }
    function gradesTxt() {
      var s2 = "", j, k;
      for (j = 0; j < 4; j++) {
        k = load(KEYP + "ocena." + j);
        s2 += (j ? " " : "") + (k ? GRADES[k - 1] : "–");
      }
      return s2;
    }
    function fillModes() {
      var ok = unlocked(), l = root2.querySelectorAll(".dcg-mc"), j, m, el2, lk, rb = load(KEYP + "rush." + mode2), gt = gradesTxt();
      for (j = 0; j < l.length; j++) {
        el2 = l[j];
        m = el2.getAttribute("data-m");
        lk = (m === "sudo" || m === "rush") && !ok;
        el2.setAttribute("aria-disabled", String(lk));
        el2.querySelector(".dcg-lock").hidden = !lk;
        el2.setAttribute("aria-pressed", String(m === mode2));
        el2.querySelector(".dcg-mrv").textContent = m === "rush" ? rb ? fmtT(rb) : "—" : fmt(best(m === "sudo" ? mode2 : m)) || "0";
        el2.querySelector(".dcg-mrg").textContent = gt;
      }
      q(".dcg-mbase").textContent = "sudo i boss rush grasz w trybie statku: " + modeName(mode2) + " · rekordy: " + (set.arena !== false ? "Arena" : "Kampania");
      l = root2.querySelectorAll("[data-ar]");
      for (j = 0; j < l.length; j++) {
        el2 = l[j];
        el2.setAttribute("aria-pressed", String(el2.getAttribute("data-ar") === "1" === (set.arena !== false)));
        el2.classList.toggle("dcg-sel", el2.getAttribute("aria-pressed") === "true");
      }
    }
    function openTopka() {
      var host = q(".dcg-rk-host"), off = q(".dcg-off"), R = G.DancyRanking, api = opts.rankingApi;
      q(".dcg-tu").textContent = fmt(best("unik"));
      q(".dcg-to").textContent = fmt(best("ogien"));
      if (topkaPanel) return;
      host.innerHTML = "";
      if (R && R.create && api) {
        try {
          topkaPanel = R.create({ api, el: host });
          off.hidden = true;
        } catch (e) {
          topkaPanel = null;
        }
      }
      if (!topkaPanel) off.hidden = false;
    }
    var KEYS6 = ["l", "r", "u", "d", "bomb", "pause"];
    function applyFx() {
      reduced = !!(mq && mq.matches);
      fxShake = set.shake && !reduced;
      fxGlitch = set.glitch && !reduced;
      fxFlash = set.flash && !reduced;
      FX.flash = fxFlash;
      root2.classList.toggle("dcg-noanim", reduced || !set.glitch);
    }
    function tgl(b, on) {
      b.setAttribute("aria-pressed", String(!!on));
      b.textContent = on ? "Wł." : "Wył.";
    }
    function fillSettings() {
      var j, b, l, ok = unlocked();
      tgl(q("[data-a=snd]"), snd);
      tgl(q("[data-a=fs]"), fsOn);
      l = root2.querySelectorAll("input[data-v]");
      for (j = 0; j < l.length; j++) {
        b = l[j];
        b.value = set[b.getAttribute("data-v")];
        rangeView(b);
      }
      l = root2.querySelectorAll("[data-diff]");
      for (j = 0; j < l.length; j++) l[j].setAttribute("aria-pressed", String(l[j].getAttribute("data-diff") === (set.diff === "sudo" && ok ? "sudo" : "normal")));
      q("[data-diff=sudo]").disabled = !ok;
      q(".dcg-dlk").textContent = ok ? "sudo: bossowie +40% szybciej, krótsze telegrafy, bez tarczy" : "sudo odblokujesz, pokonując Segfault Prime";
      l = root2.querySelectorAll("[data-fx]");
      for (j = 0; j < l.length; j++) {
        b = l[j];
        tgl(b, set[b.getAttribute("data-fx")] && !reduced);
        b.disabled = reduced;
      }
      q(".dcg-rmn").hidden = !reduced;
      l = root2.querySelectorAll("[data-key]");
      for (j = 0; j < l.length; j++) {
        b = l[j];
        b.removeAttribute("data-wait");
        b.querySelector("b").textContent = keyName(set.keys[b.getAttribute("data-key")]);
      }
      q(".dcg-conf").hidden = true;
      q(".dcg-rdone").hidden = true;
      q(".dcg-sconf").hidden = true;
      q(".dcg-sdone").hidden = true;
    }
    function rangeView(b) {
      b.style.setProperty("--v", b.value + "%");
      b.nextElementSibling.textContent = b.value;
    }
    function onInput(e) {
      var b = e.target;
      if (!b || !b.getAttribute || !b.getAttribute("data-v")) return;
      set[b.getAttribute("data-v")] = +b.value;
      rangeView(b);
      saveSettings(set);
      au.volume(set.music / 100, set.sfx / 100);
      sfx("tik");
    }
    function fillPause() {
      var h = "", k, u;
      q(".dcg-psc").textContent = fmt(score);
      q(".dcg-pwv").textContent = hudWave.slice(5) + (BO.on ? " · boss" : moby.active() ? " · moby" : moby.rain() ? " · kod" : "");
      for (k = 0; k < UKEYS.length; k++) {
        u = UPS[UKEYS[k]];
        if (up[UKEYS[k]]) h += "<span>" + ibtn(u.i, 14, "y") + u.n + (up[UKEYS[k]] > 1 ? " <em>" + up[UKEYS[k]] + "</em>" : "") + "</span>";
      }
      if (shieldOn) h += "<span>" + ibtn("shield", 14, "y") + "Tarcza aktywna</span>";
      q(".dcg-pup").innerHTML = h || '<p class="dcg-lab">brak · ulepszenia wybierasz po bossach</p>';
      paintIcons(q(".dcg-pup"));
    }
    function start(retry, rushMode) {
      scr.hideAll();
      applyFx();
      attract = false;
      moby.attract(false);
      moby.clear();
      go("play");
      arena = set.arena !== false;
      applyPerm();
      obN = ptN = blN = flN = prN = exN = shN = 0;
      for (i = 0; i < DTP.length; i++) DTP[i].life = 0;
      BO.on = false;
      BO.st = 0;
      slowT = 0;
      invul = 0;
      shipShake = 0;
      diedBoss = false;
      grace = 0;
      fireT = 0.3;
      flash = shake = 0;
      tilt = 0;
      tb = -1;
      hitstop = 0;
      combo = 0;
      comboT = 0;
      comboM = 1;
      bmeter = 0;
      ELP.k = 0;
      eliteCd = 0;
      prMax = 0;
      cityW = 0;
      despP = 0;
      clearT = 0;
      clearStack();
      atkClear();
      sideAcc = 0;
      laserT = 0;
      laserOn = 0;
      droneT = 0;
      if (retry && cp) {
        score = cp.score;
        bombs = Math.max(cp.bombs, 1);
        wave = cp.wave;
        waveT = cp.waveT;
        t = cp.t;
        nextBomb = cp.nb;
        step = cp.step;
        for (i in cp.up) up[i] = cp.up[i];
        shieldOn = cp.sh;
        bossTier = cp.tier;
        nextBossT = cp.nbt;
        armorN = cp.ar || 0;
      } else {
        t = 0;
        waveT = 0;
        score = 0;
        wave = 1;
        bombs = val("sbomb", P2.sbomb);
        step = Math.round(val("cache", P2.cache) / FXV.kondK);
        nextBomb = step;
        bossTier = 0;
        armorN = val("armor", P2.armor) + mv("plyta");
        nextBossT = BOSS1_S;
        grazeN = 0;
        cp = null;
        for (i in up) up[i] = 0;
        shieldOn = false;
        earned[0] = earned[1] = earned[2] = earned[3] = 0;
        grazeBonus = val("graze", P2.graze);
        grazeTxt = "+" + grazeBonus + " muśnięcie";
        rush = !!rushMode;
        rushN = 0;
        mobKills = 0;
        comboMax = 1;
        moby.resetStats();
        if (rush) {
          tb = 1.5;
          tbTier = 0;
        } else if (testTier >= 0) {
          tb = 2;
          tbTier = testTier;
        } else if (testWave > 1) {
          wave = testWave;
          waveT = (testWave - 1) * WAVE_S;
          nextBossT = Math.max(BOSS1_S, waveT + WAVE_S * 1.4);
        }
        if (testUps) testUps.split(",").forEach(applyUp);
        visLv();
      }
      spawnT = 0.5;
      setBanner();
      hudScore = -1;
      hudShown = score;
      if (!rush && !(retry === true && cp)) moby.startWave(wave);
      ship.x = W / 2;
      ship.y = H * 0.78;
      ship.vx = ship.vy = 0;
      keys.l = keys.r = keys.u = keys.d = 0;
      drag.on = false;
      live.textContent = "";
      ensureArt((retry && cp ? bossTier : rush ? 0 : testTier >= 0 ? testTier : bossTier) % 4);
      if (retry === true && cp) {
        bossStart();
        bossTier++;
      } else tag();
      ui();
      try {
        root2.focus({ preventScroll: true });
      } catch (e) {
        root2.focus();
      }
      if (snd) {
        audio();
        au.music(true);
      }
      startLoop();
      lockMouse();
    }
    function play(m) {
      var ok = unlocked();
      if ((m === "sudo" || m === "rush") && !ok) {
        live.textContent = "Tryb zablokowany: pokonaj Segfault Prime.";
        sfx("back");
        return;
      }
      if (m === "unik" || m === "ogien") setMode(m);
      sudo = m === "sudo" || m !== "rush" && set.diff === "sudo" && ok;
      sfx("ok");
      start(false, m === "rush");
    }
    function pause() {
      if (state !== "play") return;
      go("pause");
      stopLoop();
      keys.l = keys.r = keys.u = keys.d = keys.f = 0;
      drag.on = false;
      padX = padY = 0;
      mFire = padFire = 0;
      if (locked()) try {
        doc.exitPointerLock();
      } catch (e) {
      }
      ui();
      draw();
      showScr("pause", "[data-a=resume]");
    }
    function resume() {
      if (state !== "pause") return;
      scr.hideAll();
      go("play");
      ui();
      lockMouse();
      try {
        root2.focus({ preventScroll: true });
      } catch (e) {
        root2.focus();
      }
      startLoop();
    }
    function gameOver() {
      go("over");
      stopLoop();
      ui();
      draw();
      overAt = win.performance.now();
      var sc = Math.floor(score), b = best(mode2), nowy = sc > b, h = "", k, n = 0, m = Math.floor(t / 60), s2 = Math.floor(t % 60);
      if (nowy) {
        b = sc;
        mem[arena ? mode2 : "k" + mode2] = sc;
        save(recKey(mode2, arena), sc);
      }
      recNow = b;
      var pr = 0, prb = 0;
      if (!god) {
        pr = load(KEYP + "proby." + mode2) + 1;
        save(KEYP + "proby." + mode2, pr);
        if (diedBoss) {
          prb = load(KEYP + "proby.boss." + BO.type) + 1;
          save(KEYP + "proby.boss." + BO.type, prb);
        }
      }
      q(".dcg-why").textContent = "core dumped · " + (diedBoss ? "boss: " + BN[BO.type] : waveName(wave)) + (pr ? " · próba #" + pr + (prb ? " (na tym bossie: " + prb + ")" : "") : "");
      q(".dcg-sc").setAttribute("data-v", "0");
      cnt.set(q(".dcg-sc"), sc, reduced ? 0 : 0.8);
      q(".dcg-new").hidden = !(nowy && sc > 0);
      q(".dcg-best span").textContent = (nowy && sc > 0 ? "poprzedni rekord pobity · " : "rekord: " + fmt(b) + " · ") + (arena ? "arena · " : "kampania · ") + "tryb " + (mode2 === "ogien" ? "ogień" : "unik") + (sudo ? " · sudo" : "");
      krOver(bank(true));
      for (k = 0; k < 4; k++) if (earned[k]) {
        h += ibtn("b" + (k + 1), 22, "b", 1);
        n++;
      }
      q(".dcg-bd").innerHTML = h ? h + " <span>odznaki bossów</span>" : "";
      q(".dcg-s-t").textContent = m + ":" + (s2 < 10 ? "0" : "") + s2;
      q(".dcg-s-w").textContent = String(wave);
      q(".dcg-s-m").textContent = String(mobKills);
      q(".dcg-s-g").textContent = String(grazeN);
      q(".dcg-s-b").textContent = String(n);
      q(".dcg-s-c").textContent = "×" + comboMax;
      q(".dcg-s-p").textContent = pr ? "#" + pr : "—";
      q(".dcg-s-pb").textContent = prb ? String(prb) : "—";
      q("[data-a=retry]").hidden = !(diedBoss && cp);
      paintIcons(ovOver);
      showScr("over", "[data-a=again]");
      live.textContent = "Segfault. Wynik " + sc + ". " + (nowy && sc > 0 ? "Nowy rekord." : "Rekord " + b + ".");
      au.music(false);
    }
    function krOver() {
      var l = [["wrogowie", KRR.mob], ["fale", KRR.fale], ["czas", KRR.czas], ["boss", KRR.boss], ["ocena", KRR.ocena], ["muśnięcia, combo", KRR.inne]], h = "", j, e = q("[data-cu=kr]");
      for (j = 0; j < l.length; j++) h += "<div" + (l[j][1] ? "" : ' class="dcg-z"') + "><span>" + l[j][0] + "</span><b>" + fmt(l[j][1]) + "</b></div>";
      q(".dcg-krl").innerHTML = h;
      e.setAttribute("data-v", "0");
      cnt.set(e, krRun(), reduced ? 0 : 0.9);
      q(".dcg-krw").textContent = god ? "tryb testowy: bez zapisu" : "w hangarze: ₡ " + fmt(shop.kr) + (arena ? " · arena: bazowy sprzęt" : " · kampania");
    }
    function exit(soft) {
      stopLoop();
      rush = false;
      if (state === "play" || state === "pause" || state === "merge" || state === "pick") bank(true);
      chN = 0;
      if (!soft && typeof opts.onExit === "function") {
        opts.onExit();
        if (dead) return;
      }
      go("start");
      ship.x = W / 2;
      ship.y = H * 0.78;
      obN = ptN = blN = flN = prN = exN = shN = 0;
      flash = shake = 0;
      BO.on = false;
      BO.st = 0;
      tag();
      clearStack();
      atkClear();
      cityW = 0;
      moby.clear();
      au.music(false);
      ui();
      draw();
      showScr("menu", "[data-a=start]");
    }
    function goBack() {
      var cur = scr.current();
      if (cur === "pause") {
        resume();
        return;
      }
      if (cur === "menu") {
        sfx("back");
        showScr("title", "[data-a=title]");
        return;
      }
      if (!cur || cur === "title" || cur === "over" || cur === "merge" || cur === "pick") return;
      sfx("back");
      if (!scr.back()) showScr(state === "pause" ? "pause" : "menu");
    }
    function activate() {
      var a = doc.activeElement;
      if (scr.current() === "title") {
        toMenu();
        return;
      }
      if (a && root2.contains(a) && a.tagName === "BUTTON") a.click();
    }
    function resetRecords() {
      var ks = [], j, k;
      try {
        for (j = 0; j < G.localStorage.length; j++) {
          k = G.localStorage.key(j);
          if (k && k.indexOf(KEYP) === 0) ks.push(k);
        }
        for (j = 0; j < ks.length; j++) G.localStorage.removeItem(ks[j]);
      } catch (e) {
      }
      mem.unik = mem.ogien = 0;
      recNow = 0;
      if (!unlocked()) {
        sudo = false;
        if (set.diff === "sudo") {
          set.diff = "normal";
          saveSettings(set);
        }
      }
    }
    function setKey(k, v) {
      var K2 = set.keys;
      if (k === K2.l) {
        keys.l = v;
        return true;
      }
      if (k === K2.r) {
        keys.r = v;
        return true;
      }
      if (k === K2.u) {
        keys.u = v;
        return true;
      }
      if (k === K2.d) {
        keys.d = v;
        return true;
      }
      if (k === K2.fire || k === "z" || k === "Z") {
        keys.f = v;
        return true;
      }
      switch (k) {
        case "ArrowLeft":
        case "Left":
        case "a":
        case "A":
          keys.l = v;
          return true;
        case "ArrowRight":
        case "Right":
        case "d":
        case "D":
          keys.r = v;
          return true;
        case "ArrowUp":
        case "Up":
        case "w":
        case "W":
          keys.u = v;
          return true;
        case "ArrowDown":
        case "Down":
        case "s":
        case "S":
          keys.d = v;
          return true;
      }
      return false;
    }
    function mine() {
      var a = doc.activeElement;
      return !a || a === doc.body || root2.contains(a);
    }
    var DIRK = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], Left: [-1, 0], Right: [1, 0], Up: [0, -1], Down: [0, 1] };
    function onKey(e) {
      if (dead || !mine() || e.ctrlKey || e.metaKey || e.altKey) return;
      var k = e.key, cd, cur = scr.current(), d, a;
      if (waitKey) {
        e.preventDefault();
        if (k !== "Escape" && k !== "Tab" && k.length) {
          set.keys[waitKey] = k;
          saveSettings(set);
        }
        waitKey = "";
        fillSettings();
        focusIn("[data-key]");
        return;
      }
      if (state === "play") {
        if (setKey(k, 1)) e.preventDefault();
        else if (k === set.keys.bomb || k === " " || k === "Spacebar") {
          if (!e.repeat) bomb();
          e.preventDefault();
        } else if (k === set.keys.pause || k === "Escape" || k === "p" || k === "P") {
          pause();
          e.preventDefault();
        }
        return;
      }
      if (cur === "title") {
        if (k !== "Shift" && k !== "Tab") {
          e.preventDefault();
          kbNav = true;
          toMenu();
        }
        return;
      }
      if (state === "pick" && (k === "1" || k === "2" || k === "3")) {
        cd = q(".dcg-cards").children[+k - 1];
        if (cd) {
          applyUp(cd.getAttribute("data-u"));
          resumeAfterBoss();
          e.preventDefault();
        }
        return;
      }
      if (k === "Escape" || state === "pause" && cur === "pause" && (k === "p" || k === "P" || k === set.keys.pause)) {
        e.preventDefault();
        kbNav = true;
        goBack();
        return;
      }
      d = DIRK[k];
      if (d && cur) {
        a = doc.activeElement;
        if (a && a.type === "range" && d[0]) return;
        e.preventDefault();
        kbNav = true;
        scr.move(d[0], d[1]);
      } else if (k === "Tab") kbNav = true;
    }
    function onKeyUp(e) {
      setKey(e.key, 0);
    }
    function onBlur() {
      keys.l = keys.r = keys.u = keys.d = 0;
      pause();
    }
    function onVis() {
      if (doc.hidden) pause();
    }
    function onMq() {
      applyFx();
    }
    function onFs() {
      fsOn = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
      if (scr.current() === "settings") tgl(q("[data-a=fs]"), fsOn);
      if (!raf) {
        resize();
      }
    }
    function onPtr() {
      kbNav = false;
    }
    var hovEl = null;
    function onHover(e) {
      var b = e.target && e.target.closest ? e.target.closest(".dcg-b") : null;
      if (b && b !== hovEl && !b.disabled) {
        sfx("tik");
        if (b !== doc.activeElement) scr.focus(b, false);
      }
      hovEl = b;
    }
    function onClick(e) {
      var b = e.target && e.target.closest ? e.target.closest("button") : null, a, v, j, l;
      if (scr.current() === "title" && e.target && e.target.closest && e.target.closest("[data-s=title]")) {
        toMenu();
        return;
      }
      if (!b || !root2.contains(b) || b === bBomb) return;
      if (b.classList.contains("dcg-b")) {
        b.classList.remove("dcg-hit");
        void b.offsetWidth;
        b.classList.add("dcg-hit");
      }
      if (hangar.click(b)) return;
      if (v = b.getAttribute("data-ar")) {
        set.arena = v === "1";
        saveSettings(set);
        sfx("ok");
        fillModes();
        live.textContent = set.arena ? "Arena: bazowy sprzęt, wynik do topki." : "Kampania: sprzęt z hangaru, rekordy lokalne.";
        return;
      }
      if (b.getAttribute("data-m")) {
        play(b.getAttribute("data-m"));
        return;
      }
      if (b.getAttribute("data-u")) {
        if (state === "pick") {
          sfx("ok");
          applyUp(b.getAttribute("data-u"));
          resumeAfterBoss();
        }
        return;
      }
      if (v = b.getAttribute("data-diff")) {
        if (b.disabled) return;
        set.diff = v;
        saveSettings(set);
        l = root2.querySelectorAll("[data-diff]");
        for (j = 0; j < l.length; j++) l[j].setAttribute("aria-pressed", String(l[j] === b));
        sfx("ok");
        return;
      }
      if (v = b.getAttribute("data-fx")) {
        set[v] = !set[v];
        saveSettings(set);
        applyFx();
        tgl(b, set[v]);
        sfx("ok");
        return;
      }
      if (v = b.getAttribute("data-key")) {
        waitKey = v;
        b.setAttribute("data-wait", "");
        b.querySelector("b").textContent = "naciśnij…";
        live.textContent = "Naciśnij nowy klawisz. Esc anuluje.";
        return;
      }
      a = b.getAttribute("data-a");
      if ((a === "again" || a === "retry") && win.performance.now() - overAt < 450) return;
      if (a === "start") play(mode2);
      else if (a === "again") {
        sfx("ok");
        start(false, rush);
      } else if (a === "retry") {
        sfx("ok");
        start(true);
      } else if (a === "cont") {
        sudo = set.diff === "sudo" && unlocked();
        cp = loadJ(cpKey());
        sfx("ok");
        if (cp && cp.up) start("cp");
        else {
          cp = null;
          start(false);
        }
      } else if (a === "title") toMenu();
      else if (a === "hangar") {
        sfx("ok");
        showScr("hangar", "[data-buy]", { push: true });
      } else if (a === "modes" || a === "topka" || a === "settings") {
        sfx("ok");
        showScr(a, a === "modes" ? "[data-m=" + mode2 + "]" : a === "settings" ? "[data-a=snd]" : "[data-a=back]", { push: true });
      } else if (a === "back") goBack();
      else if (a === "next") {
        sfx("ok");
        pickScreen();
      } else if (a === "resume") resume();
      else if (a === "pause") pause();
      else if (a === "menu") exit(true);
      else if (a === "exit") exit(false);
      else if (a === "fs") {
        try {
          if (doc.fullscreenElement || doc.webkitFullscreenElement) (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc);
          else (root2.requestFullscreen || root2.webkitRequestFullscreen).call(root2);
        } catch (x) {
          live.textContent = "Pełny ekran niedostępny.";
        }
      } else if (a === "reset") {
        q(".dcg-conf").hidden = false;
        q(".dcg-rdone").hidden = true;
        focusIn("[data-a=reset-no]");
      } else if (a === "reset-no") {
        q(".dcg-conf").hidden = true;
        focusIn("[data-a=reset]");
      } else if (a === "sreset") {
        q(".dcg-sconf").hidden = false;
        q(".dcg-sdone").hidden = true;
        focusIn("[data-a=sreset-no]");
      } else if (a === "sreset-no") {
        q(".dcg-sconf").hidden = true;
        focusIn("[data-a=sreset]");
      } else if (a === "sreset-yes") {
        var e0 = resetShop(shopMem), kk;
        for (kk in e0) shop[kk] = e0[kk];
        q(".dcg-sconf").hidden = true;
        q(".dcg-sdone").hidden = false;
        live.textContent = "Hangar wyzerowany.";
        focusIn("[data-a=sreset]");
      } else if (a === "reset-yes") {
        resetRecords();
        fillSettings();
        q(".dcg-rdone").hidden = false;
        live.textContent = "Rekordy usunięte.";
        focusIn("[data-a=reset]");
      } else if (a === "snd") {
        snd = !snd;
        set.snd = snd;
        saveSettings(set);
        tgl(b, snd);
        if (snd) {
          audio();
          sfx("ok");
        } else au.setOn(false);
      }
    }
    function padTick(dt) {
      var P3 = gp.poll(dt), cur;
      if (state === "play") {
        padX = P3.x;
        padY = P3.y;
        padFire = P3.a ? 1 : 0;
        if (P3.B) bomb();
        if (P3.ST) pause();
        return;
      }
      padFire = 0;
      padX = padY = 0;
      if (!P3.any || waitKey) return;
      kbNav = true;
      cur = scr.current();
      if (cur === "title") {
        toMenu();
        return;
      }
      if (P3.ST && state === "pause" && cur === "pause") {
        resume();
        return;
      }
      if (P3.dx || P3.dy) {
        var a = doc.activeElement;
        if (a && a.type === "range" && P3.dx) {
          a.value = clamp2(+a.value + P3.dx * 5, 0, 100);
          onInput({ target: a });
        } else scr.move(P3.dx, P3.dy);
      }
      if (P3.A) activate();
      if (P3.B) goBack();
    }
    function onBomb(e) {
      e.preventDefault();
      bomb();
    }
    function pDown(e) {
      if (e.pointerType === "touch" && !touch) {
        touch = true;
        ui();
      }
      if (state === "play" && e.pointerType === "mouse") {
        lockMouse();
        if (e.button === 0) mFire = 1;
        e.preventDefault();
        return;
      }
      if (state !== "play" || drag.on) return;
      drag.on = true;
      drag.id = e.pointerId;
      drag.px = e.clientX;
      drag.py = e.clientY;
      drag.sx = drag.tx = ship.x;
      drag.sy = drag.ty = ship.y;
      try {
        cv.setPointerCapture(e.pointerId);
      } catch (x) {
      }
      e.preventDefault();
    }
    function pMove(e) {
      if (!drag.on || e.pointerId !== drag.id) return;
      var mx = 11 * s0, tx = drag.sx + e.clientX - drag.px, ty = drag.sy + e.clientY - drag.py;
      var cx = clamp2(tx, mx, W - mx), cy = clamp2(ty, 14 * s0, H - 20 * s0);
      if (cx !== tx) {
        drag.sx = cx;
        drag.px = e.clientX;
      }
      if (cy !== ty) {
        drag.sy = cy;
        drag.py = e.clientY;
      }
      drag.tx = cx;
      drag.ty = cy;
    }
    function pUp(e) {
      if (drag.on && e.pointerId === drag.id) {
        drag.on = false;
        ship.vx = ship.vy = 0;
      }
    }
    win.addEventListener("keydown", onKey);
    win.addEventListener("keyup", onKeyUp);
    doc.addEventListener("pointerlockchange", onLock);
    doc.addEventListener("mousemove", onMouseMove);
    win.addEventListener("mouseup", onMouseUp);
    win.addEventListener("blur", onBlur);
    doc.addEventListener("visibilitychange", onVis);
    root2.addEventListener("click", onClick);
    root2.addEventListener("input", onInput);
    root2.addEventListener("pointerdown", onPtr);
    root2.addEventListener("pointerover", onHover);
    doc.addEventListener("fullscreenchange", onFs);
    bBomb.addEventListener("pointerdown", onBomb);
    cv.addEventListener("pointerdown", pDown);
    cv.addEventListener("pointermove", pMove);
    cv.addEventListener("pointerup", pUp);
    cv.addEventListener("pointercancel", pUp);
    if (mq) {
      if (mq.addEventListener) mq.addEventListener("change", onMq);
      else if (mq.addListener) mq.addListener(onMq);
    }
    var ro = null;
    if (win.ResizeObserver) {
      ro = new win.ResizeObserver(resize);
      ro.observe(root2);
    } else win.addEventListener("resize", resize);
    if (doc.fonts && doc.fonts.load) {
      Promise.all([doc.fonts.load('400 13px "Geist Mono"'), doc.fonts.load('700 13px "Geist Mono"')]).then(function() {
        if (!dead && atlas) {
          buildSprites();
          elig();
          if (BA) {
            i = BA.ty;
            BA = null;
            ensureArt(i);
          }
          if (!raf) draw();
        }
      }, function() {
      });
    }
    paintIcons(root2);
    go("start");
    setMode(mode2);
    applyFx();
    resize();
    ui();
    showScr(startScr === "menu" ? "menu" : "title", startScr === "menu" ? "[data-a=start]" : "[data-a=title]", { instant: true });
    function destroy() {
      if (dead) return;
      dead = true;
      stopLoop();
      win.removeEventListener("keydown", onKey);
      win.removeEventListener("keyup", onKeyUp);
      doc.removeEventListener("pointerlockchange", onLock);
      doc.removeEventListener("mousemove", onMouseMove);
      win.removeEventListener("mouseup", onMouseUp);
      if (locked()) try {
        doc.exitPointerLock();
      } catch (e) {
      }
      win.removeEventListener("blur", onBlur);
      doc.removeEventListener("visibilitychange", onVis);
      root2.removeEventListener("click", onClick);
      root2.removeEventListener("input", onInput);
      root2.removeEventListener("pointerdown", onPtr);
      root2.removeEventListener("pointerover", onHover);
      doc.removeEventListener("fullscreenchange", onFs);
      bBomb.removeEventListener("pointerdown", onBomb);
      cv.removeEventListener("pointerdown", pDown);
      cv.removeEventListener("pointermove", pMove);
      cv.removeEventListener("pointerup", pUp);
      cv.removeEventListener("pointercancel", pUp);
      if (mq) {
        if (mq.removeEventListener) mq.removeEventListener("change", onMq);
        else if (mq.removeListener) mq.removeListener(onMq);
      }
      if (ro) ro.disconnect();
      else win.removeEventListener("resize", resize);
      au.close();
      gp.destroy();
      scr.destroy();
      cnt.clear();
      moby.clear();
      if (topkaPanel) {
        try {
          topkaPanel.destroy();
        } catch (e) {
        }
        topkaPanel = null;
      }
      if (root2.parentNode) root2.parentNode.removeChild(root2);
      if (!--cssRef && cssEl) {
        if (cssEl.parentNode) cssEl.parentNode.removeChild(cssEl);
        cssEl = null;
      }
      spr = [];
      atlas = city = null;
      clouds = [];
      pj = [];
      BA = null;
      haz = null;
    }
    function snap() {
      var p = BP[0], b = BO, st2 = {}, at = {}, k, a, r;
      if (b.on && b.v2) {
        a = { x: 0, y: 0 };
      } else if (b.on) {
        for (k = 0; k < SN.length; k++) st2[SN[k]] = b.stC[k];
        for (k = 0; k < ATK.length; k++) if (ATK[k][2] === b.type) at[ATK[k][0]] = b.atC[k];
        a = aimP();
      }
      r = {
        state,
        mode: mode2,
        score: Math.floor(score),
        bombs,
        wave,
        shield: shieldOn,
        up,
        ship: { x: ship.x, y: ship.y },
        combo,
        comboM,
        sudo,
        rush,
        rushN,
        grade: GRADES[gradeLast],
        gradeSc: GR2.sc,
        gradeRows: GR2.rows,
        gradePar: GR2.par,
        fightG: fG,
        fightB: fB,
        dpsK: dpsK(),
        prN,
        blN,
        prMax,
        obN,
        W,
        H,
        s0,
        elKinds: ELC.slice(1),
        elites: (function() {
          var n = 0;
          for (var j = 0; j < obN; j++) if (OB[j].el) n++;
          return n;
        })(),
        elTele: ELP.k,
        boss: b.on ? {
          name: BN[b.type],
          type: b.type,
          hp: b.hp,
          st: b.st,
          phase: b.phase,
          x: p.x,
          y: p.y,
          w: p.w,
          h: p.h,
          ex: p.ex,
          n: b.n,
          alive: [BP[0].alive, BP[1].alive],
          hps: [BP[0].hp, BP[1].hp],
          x2: BP[1].x,
          sub: b.sub,
          lane: b.lane,
          laneW: b.laneW,
          tele: b.fs === S_TELE ? b.fd - b.ft : 0,
          hit: BP[0].hit + BP[1].hit,
          vp: b.vp,
          age: b.age,
          il: b.il,
          dt: b.dt,
          gone: b.gone,
          fsm: SN[b.fs],
          atk: b.atk >= 0 ? ATK[b.atk][0] : "",
          ft: b.ft,
          fd: b.fd,
          aim: a.x,
          aimY: a.y,
          mtx: b.mtx,
          parry: b.atk === A_COR && b.fs === S_TELE,
          lock: b.atk === A_LCK && b.fs === S_ATK && b.lockHp > 0,
          lockX: b.lx[1],
          lockY: (b.ly[0] + b.ly[1]) / 2,
          hits: b.hits,
          stg: b.stg,
          fightT: b.st === 3 ? b.fT : b.age - b.il,
          wl: b.wl,
          stats: { st: st2, at }
        } : null,
        band: b.on && bossBand() ? {
          y0: BAND[0],
          y1: BAND[1],
          lines: (function() {
            var n = 0;
            for (var j = 0; j < obN; j++) if (inBand(OB[j])) n++;
            return n;
          })(),
          atk: (function() {
            var n = 0;
            for (var j = 0; j < obN; j++) if (OB[j].at === 1) n++;
            return n;
          })(),
          shattered: bandShat
        } : null,
        kr: {
          run: { mob: KRR.mob, fale: KRR.fale, czas: KRR.czas, boss: KRR.boss, ocena: KRR.ocena, inne: KRR.inne },
          total: krRun(),
          wallet: shop.kr,
          earned: shop.earned,
          rounds: shop.rounds,
          chips: chN,
          chipXY: CH.slice(0, chN).map(function(c) {
            return [c.x, c.y];
          }),
          arena,
          P: JSON.parse(JSON.stringify(P2)),
          lv: JSON.parse(JSON.stringify(shop.lv)),
          skin: shop.skin,
          own: shop.own.slice(),
          armor: armorN,
          shReg: shRegT,
          bombMax,
          step,
          dmgM,
          shots,
          fireInt: 0.14 / (1 + 0.35 * up.fire) / (1 + val("fire", P2.fire) / 100),
          grazeBonus,
          grazeZone: 12 + 8 * up.graze + 2 * P2.graze,
          magnet: val("magnet", P2.magnet),
          slowAfterBomb: (up.slow ? 0.9 + 0.9 * up.slow : 0) + val("slow", P2.slow),
          speed: clamp2(Math.min(W, H) * 0.75, 260, 440) * (1 + 0.12 * up.agile) * (1 + val("agile", P2.agile) / 100) * (1 + val("engine", P2.engine) / 100),
          bombBoss: BOMB_DMG[mode2 === "unik" ? 1 : 0] * (1 + 0.5 * up.power) * (1 + val("power", P2.power) / 100),
          slowT
        },
        t,
        waveT,
        nextBoss: nextBossT,
        screen: scr.current(),
        bossCause,
        deaths: DEATHS,
        gear: { mods: MO.m, syn: MO.s, fx: FXV, syc: SYC, wst: WST, armor: armorMul(), laserN, laserOn, droneN, rootN, slowT, comboS, pierceN: pierceN + (up.pierce || 0) },
        loop: !!raf,
        death: deathSrc,
        deathCause: deathSrc === "mob" ? mobCause : deathSrc,
        attract,
        mobs: moby.snap(),
        mobKills,
        settings: set
      };
      if (b.on && b.v2) {
        a = B2.snap();
        for (k in a) r.boss[k] = a[k];
        r.boss.aimY = B2.E.y;
        r.boss.fsm = SN[b.fs];
      }
      return r;
    }
    function hazards() {
      var o = [], k, p, b = BO, j, a, d, top2;
      for (k = 0; k < obN; k++) {
        p = OB[k];
        o.push({ x: p.el === 1 && p.ex < 0 ? 0 : p.x, y: p.y, w: p.el === 1 ? p.ex < 0 ? p.x + p.w : W - p.x : p.w, h: p.h, vx: 0, vy: p.vy });
      }
      for (k = 0; k < prN; k++) {
        p = PR[k];
        a = p.hw || p.r;
        d = p.hh || p.r;
        o.push({ x: p.x - a, y: p.y - d, w: a * 2, h: d * 2, vx: p.vx, vy: p.vy });
      }
      if (b.on && b.st === 2) {
        for (k = 0; k < b.n; k++) {
          p = BP[k];
          if (p.alive) o.push({ x: p.x - p.w * 0.4, y: p.y - p.h * 0.4, w: p.w * 0.8, h: p.h * 0.8, vx: 0, vy: 0, body: 1 });
        }
        if (b.bm) {
          eye2(BP[0], 0);
          for (j = 0; j < 40; j++) o.push({ x: EX + Math.cos(b.bmA) * j * 30 - b.bmHW, y: EY + Math.sin(b.bmA) * j * 30 - b.bmHW, w: b.bmHW * 2, h: b.bmHW * 2, vx: 0, vy: 0 });
        }
        if (b.atk === A_LCK && (b.fs === S_ATK && b.lockHp > 0 || b.fs === S_TELE)) {
          top2 = b.ly[0] - (b.ly[1] - b.ly[0]) * 0.8;
          for (j = 0; j < 3; j++) o.push({ x: b.lx[j] - 4, y: top2, w: 8, h: H, vx: 0, vy: 0 });
          for (j = 0; j < 2; j++) o.push({ x: 0, y: b.ly[j] - 4, w: W, h: 8, vx: 0, vy: 0 });
        }
        if (b.wl > 0) {
          o.push({ x: 0, y: 0, w: b.wl, h: H, vx: 0, vy: 0 });
          o.push({ x: W - b.wl, y: 0, w: b.wl, h: H, vx: 0, vy: 0 });
        }
      }
      for (k = 0; k < NSK; k++) if (STK[k]) o.push({ x: k * W / NSK, y: H - STK[k] * pj[9].h, w: W / NSK, h: STK[k] * pj[9].h, vx: 0, vy: 0 });
      if (b.v2) B2.hazards(o);
      moby.hazards(o);
      return o;
    }
    var rkStart = start, rkOver = gameOver, rkWin = bossWin, rkWins = 0, rkOff = testTier >= 0 || god || !!testUps || testWave > 1 || noBoss;
    function rkCall(fn, arg) {
      if (!rkOff && !dead && arena && !cpRun && typeof fn === "function") try {
        fn(arg);
      } catch (e) {
      }
    }
    start = function(retry, rushMode) {
      var cont = retry === true && !!cp;
      cpRun = retry === "cp" || cpRun && cont;
      if (!cont) rkWins = 0;
      rkStart(retry, rushMode);
      showRank(null);
      rkCall(opts.onRunStart, { mode: mode2, retry: cont, arena: true });
    };
    bossWin = function() {
      rkWins++;
      rkWin();
    };
    gameOver = function() {
      rkOver();
      rkCall(opts.onRunEnd, { score: Math.floor(score), mode: mode2, durationMs: Math.round(t * 1e3), wave, bossesBeaten: rkWins, arena: true });
    };
    function showRank(r) {
      if (dead) return;
      var l = q(".dcg-rkl");
      l.textContent = r && r.place ? "topka: #" + r.place + (r.total ? " z " + r.total : "") + (r.best != null ? " · najlepszy " + r.best : "") : "";
      l.hidden = !l.textContent;
    }
    return { destroy, state: snap, hazards, showRank };
  }

  // src/index.js
  G.DancyCloud = {
    mount,
    version: "5.0.0",
    icons: { names: INAMES, canvas: iconCanvas },
    mobs: { names: ALL_NAMES, sheet: mobSheet, bestiary },
    mods: { crate: CRATE, chance: CHANCE, rar: RAR, list: MODS, syn: SYN, roll, open: openCrate, loadout }
  };
})();
