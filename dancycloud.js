/*! DancyCloud 4.0.0 — gra do terminala SORA//OS (cybersora.pl). Czysty JS + Canvas 2D, bez bibliotek.
 *  API: window.DancyCloud.mount(element, { onExit }) -> { destroy() }; DancyCloud.icons (zestaw ikon) */
(function (G) {
  'use strict';

  // Kolory wyłącznie z tokenów strony (wzorce/tokeny.css). Powierzchnie = ink zmieszany z bielą albo karmazynem.
  var C = {
    ink: '#0e0e12', acc: '#e11d33', hot: '#ff3a52', solid: '#d4132b', label: '#ff6b7d',
    muted: '#9a9098', bone: '#f6f2f3', cyan: 'rgba(80,220,255,.85)',
    panel: '#18181b', line: '#28282c', bar: '#1d0f14',
    cloudFar: '#131317', cloudNear: '#1f1f23', city: '#2e1017',
    // v4: głębia z tej samej reguły (ink + biel 16% / 9%, ink + karmazyn 25%)
    hull: '#353538', plate: '#242427', deep: '#43121a'
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
  var PCT = []; for (var pc = 0; pc <= 100; pc++) PCT.push(pc + '%');   // napisy procentu życia bossa (bez sklejania w klatce)
  var BN = ['NullPointer', 'Memory Leak', 'Race Condition', 'Segfault Prime'], BNU = BN.map(function (n) { return n.toUpperCase(); });
  // --- strojenie trudności (v4): wszystko, co zmienia tempo i ciężar walk, jest tutaj ---
  var WAVE_S = 20;                    // długość fali [s]; co falę szybciej i gęściej
  var BOSS1_S = 100;                  // pierwszy boss na początku 6. fali (5 fal po 20 s; testerzy 7.10: za mało fal przed bossem; było 48)
  var BOSS_EVERY = 5;                 // kolejni bossowie co tyle fal (było 4; zegar fal stoi w trakcie walki)
  var BNEED = [250, 360, 360, 1350];  // trafień kulą do pokonania (Ogień, mnożnik 1); v4: 165/240/240/900, v3: 60/90/110/170
  var THR = [66.7, 33.4, 15];         // progi życia [%]: faza 2, faza 3, desperacja
  var TELE = [0.6, 0.45, 0.35, 0.4];  // telegraf ataku w fazie 1, 2, 3 i w desperacji [s]
  var IDLE_S = [0.5, 0.35, 0.25, 0.3]; // przerwa przed kolejnym atakiem [s] (v4: 0.6/0.45/0.35/0.2)
  var PHASE_V = [1, 1.15, 1.3, 1.35]; // prędkość pocisków i ataków w fazie 1, 2, 3 i w desperacji (v4: 1/1/1/1.12)
  var SWEEP_FREE = 10;                // laser, pasy, GC i tandem dopiero, gdy na polu jest najwyżej tyle pocisków bossa
  var REC_S = 0.35;                   // RECOVER: chwila po ataku [s] (v4: 0.4)
  var VULN_N = [2, 3, 3, 3];          // odsłonięcie (VULNERABLE) co tyle ataków
  var VULN_S = [1.8, 1.5, 1.3, 1.0];  // długość odsłonięcia [s]
  var STAG_S = 1.2;                   // STAGGER: bomba rzucona w odsłonięciu ogłusza bossa na tyle [s]
  var SHIFT_S = 1.0, DESP_S = 1.1;    // przejście fazy i wejście w desperację [s]; boss jest wtedy nietykalny
  var HITSTOP = 0.07;                 // stop-klatka przy przejściu fazy i przy staggerze [s]
  var DMG_EX = 2, DMG_ST = 2, ARMOR = 0.5; // mnożnik obrażeń: odsłonięcie, stagger, pancerz (reszta walki)
  var BOMB_DMG = [6, 10];             // bomba w bossa [% życia]: Ogień, Unik (razy mnożnik stanu)
  var UNIK_FILL = 14, UNIK_GRAZE = 6; // Unik w walce: nowa bomba co 14 s albo co 6 muśnięć pocisków bossa (maks. 3)
  var ARROW_V = 230;                  // strzałki `->` [px/s przy wysokości pola 600]
  var SWEEP_V = 340;                  // pasy `==` [px/s przy szerokości pola 700]
  var HELL_S = 15;                    // Segfault Prime: desperacja do przetrwania albo zabicia [s]
  var SUDO_V = 1.4, SUDO_T = 0.75;    // tryb sudo: bossowie +40% szybciej, telegrafy krótsze
  var COMBO_S = 2;                    // combo gaśnie po tylu sekundach bez akcji
  var PAR = [70, 85, 100, 150];       // ocena walki: czas „na S” [s] dla bossów 1–4 (v4: 45/55/65/100, przed podniesieniem życia)
  var ELITE_P = 0.04, ELITE_CD = 7;   // elity od fali 3: szansa przy każdej nowej linijce, min. przerwa [s]
  var INTRO_S = 1.8, DEATH_S = 1.5;   // wejście i śmierć bossa [s] (przy prefers-reduced-motion wejście trwa 0,9 s)
  // ataki: [id, etykieta, boss, od fazy (4 = tylko desperacja), waga, +gracz w rogu, +gracz pod bossem, czas ataku [s]]
  var ATK = [
    ['arrows', 'strzałki ->', 0, 1, 3, 0, 1, 0.8], ['dereference', 'dereferencja', 0, 1, 2, 3, 0, 1.3],
    ['dangling', 'dangling pointers', 0, 2, 2, 0, 1, 1.7], ['wall', 'ściana 0x00000000', 0, 2, 2, 1, 0, 0.6],
    ['nulljump', 'null jump', 0, 3, 2, 3, 0, 1.6], ['spiral', 'spirala *', 0, 4, 4, 0, 0, 2.6],
    ['dump', 'zrzut linijek', 1, 1, 3, 0, 1, 0.5], ['malloc', 'malloc', 1, 1, 2, 0, 0, 0.8],
    ['heapspray', 'heap spray', 1, 2, 2, 2, 0, 0.6], ['gc', 'garbage collector', 1, 2, 2, 3, 0, 0.6],
    ['swap', 'swap', 1, 3, 2, 2, 0, 2.4], ['oom', 'OOM', 1, 4, 4, 0, 0, 4.6],
    ['sweep', 'pasy ==', 2, 1, 3, 0, 0, 0.5], ['crossfire', 'krzyżowy ogień', 2, 1, 2, 2, 1, 2.4],
    ['deadlock', 'deadlock', 2, 2, 2, 0, 0, 6], ['mutex', 'mutex', 2, 2, 2, 0, 1, 3.6],
    ['tandem', 'tandem', 2, 3, 2, 3, 0, 2.3], ['desync', 'desync', 2, 4, 4, 0, 0, 1.3],
    ['echo-np', 'echo: NullPointer', 3, 1, 3, 0, 1, 0.8], ['sigsegv', 'pierścień SIGSEGV', 3, 1, 2, 1, 0, 2.4],
    ['echo-ml', 'echo: Memory Leak', 3, 2, 2, 0, 1, 0.5], ['stackoverflow', 'stack overflow', 3, 2, 2, 2, 0, 1.8],
    ['coredump', 'core dump', 3, 3, 2, 0, 1, 0.5], ['echo-rc', 'echo: Race Condition', 3, 3, 2, 1, 0, 0.5],
    ['kernelpanic', 'kernel panic', 3, 3, 1, 0, 0, 1.8], ['bullethell', 'bullet hell', 3, 4, 9, 0, 0, HELL_S]
  ];
  var A_ARR = 0, A_DER = 1, A_DNG = 2, A_WALL = 3, A_JMP = 4, A_SPI = 5, A_DMP = 6, A_MAL = 7, A_SPR = 8, A_GC = 9, A_SWP = 10, A_OOM = 11,
    A_SWE = 12, A_CRS = 13, A_LCK = 14, A_MTX = 15, A_TND = 16, A_DSY = 17, A_ENP = 18, A_RNG = 19, A_EML = 20, A_STK = 21, A_ERC = 23,
    A_PNC = 24, A_COR = 22, A_HEL = 25;
  // stany maszyny bossa
  var S_INTRO = 0, S_IDLE = 1, S_TELE = 2, S_ATK = 3, S_REC = 4, S_VULN = 5, S_STAG = 6, S_SHIFT = 7, S_DESP = 8, S_DEATH = 9;
  var SN = ['INTRO', 'IDLE', 'TELEGRAPH', 'ATTACK', 'RECOVER', 'VULNERABLE', 'STAGGER', 'PHASE_SHIFT', 'DESPERATION', 'DEATH'];
  var GRADES = ['C', 'B', 'A', 'S'];
  var ATT = [], ATA = [];   // etykiety ataków w HUD (gotowe napisy: bez sklejania tekstu w klatce)
  for (var ai = 0; ai < ATK.length; ai++) { ATT.push('> ' + ATK[ai][1]); ATA.push('$ ' + ATK[ai][1]); }
  var HELLT = [];
  for (ai = 0; ai <= HELL_S; ai++) HELLT.push('$ bullet hell · przetrwaj ' + ai + ' s');

  // --- bossowie: geometria w jednostkach, środek bossa w (0,0) ---
  var DIM = [[204, 132], [264, 156], [152, 160], [268, 204]];   // pole rysunku i hitbox (Race Condition: jedna połówka)
  var FWB = [0.44, 0.46, 0.19, 0.6], FHB = [0.40, 0.40, 0.40, 0.52]; // maks. część szerokości / wysokości pola (v4.1: Segfault Prime większy)
  var ORY = [0.46, 0.36, 0, 0.32];                                // skąd lecą strzałki (część wysokości bossa od środka)
  var ACC = [C.acc, C.hot, C.bone, C.bone];                               // akcent w fazach 1–3: karmazyn → biel
  var FZ = ['FAZA 1/3', 'FAZA 2/3', 'FAZA 3/3', 'DESPERACJA'];
  var TAG = ['dereferencja wskaźnika null', 'pamięć rośnie, nikt jej nie zwalnia', 'dwa wątki, jeden zasób', 'naruszenie ochrony pamięci'];
  // v4.1: korpus w ciemnych tonach (ink, panel, plate), konstrukcja z karmazynowych żeber, kość tylko na górnych fazach i w ognisku.
  // rim = krawędź zwrócona w lewo (karmazyn), lit = krawędź zwrócona w górę (kość), dark = krawędź dolna i prawa (ink)
  var PAL = { hull: C.plate, plate: C.panel, edge: C.solid, dark: C.ink, sol: C.solid, hot: C.hot, acc: C.acc, txt: C.deep, hi: C.bone, lit: C.bone, rim: C.acc, deep: C.deep };
  var PALF = { hull: C.bone, plate: C.bone, edge: C.ink, dark: C.muted, sol: C.bone, hot: C.ink, acc: C.bone, txt: C.muted, hi: C.ink, lit: C.bone, rim: C.bone, deep: C.muted };
  function OCT(cx, cy, r, k) { return [cx - r + k, cy - r, cx + r - k, cy - r, cx + r, cy - r + k, cx + r, cy + r - k, cx + r - k, cy + r, cx - r + k, cy + r, cx - r, cy + r - k, cx - r, cy - r + k]; }
  function MX(a) { var b = [], j; for (j = 0; j < a.length; j += 2) b.push(-a[j], a[j + 1]); return b; }
  // 1. NullPointer: długi, ostry grot z asymetrycznymi kolcami barków
  var NP_HULL = [-102, -44, -94, -58, -58, -53, -46, -66, -34, -55, 34, -55, 50, -63, 60, -53, 96, -58, 102, -40, 66, -10, 75, -1, 58, 2, 26, 32, 9, 45, 0, 66, -9, 45, -26, 32, -62, 0, -71, -5, -64, -12];
  var NP_PL = [-90, -48, 88, -48, 92, -42, 60, -12, 64, -6, 22, 25, 0, 40, -22, 25, -58, -4, -92, -42];
  var NP_PNL = [-86, -42, -58, -42, -44, -18, -52, -10], NP_PNR = MX(NP_PNL);
  var NP_TIP = [-24, 27, 24, 27, 9, 42, 0, 64, -9, 42];
  var NP_BAND = [-92, -55, 90, -55, 94, -50, 94, -47, -94, -47];
  var NP_SOCK = OCT(0, -14, 36, 12), NP_RING = OCT(0, -14, 30, 10);
  var NP_FIN = [0, -14, 22, -14, 22, -26, 58, 0, 22, 26, 22, 14, 0, 14];
  var NP_FIN2 = [6, -8, 26, -8, 28, -17, 50, 0, 28, 17, 26, 8, 6, 8];
  var NP_ARM = [0, -5, 60, -5, 60, -12, 78, 0, 60, 12, 60, 5, 0, 5];
  // 2. Memory Leak: kleszcze (wnętrze w stronę +x), masa komórek liczona przy budowie z nieregularnych elips
  var ML_CLAMP = [-10, -72, 20, -74, 46, -50, 30, -56, 24, -46, 16, -56, 8, -50, 2, -20, 8, 0, 2, 20, 8, 50, 16, 56, 24, 46, 30, 56, 46, 50, 20, 74, -10, 72, -20, 40, -14, 0, -20, -40];
  var ML_BLOB = [0, -4, 64, 42, -58, 12, 42, 32, 62, -10, 46, 34, 22, 34, 36, 22, -34, -40, 32, 16, 40, 30, 24, 20, -110, 30, 26, 15, 116, -32, 22, 14, 92, 34, 22, 13, -70, -40, 22, 12, 52, -48, 18, 10];
  var ML_DRIP = [-74, 38, 2, -36, 36, 3, 6, 52, 1, 42, 48, 2, 84, 40, 2];   // wiszące komórki: x, y początku, ile
  var ML_VEIN = [-14, 4, -40, 10, -72, -6, 12, -8, 40, -22, 74, -12, -6, 12, -14, 30, -34, 40, 10, 10, 30, 28, 56, 30];
  var ML_HEART = [0, -16, 7, -9, 17, -13, 14, -3, 20, 4, 8, 8, 3, 18, -4, 9, -16, 11, -13, 0, -19, -8, -7, -8];
  // 3. Race Condition: T1 smukła i szybka, T2 ciężka; oś x połówki: + w stronę łańcucha
  var RC_HULL = [-44, -77, 30, -77, 46, -60, 34, -44, 46, -30, 32, -14, 44, 0, 30, 16, 42, 30, 28, 48, 36, 62, 20, 77, -36, 77, -50, 58, -40, 0, -52, -56];
  var RC_PL = [-36, -69, 26, -69, 36, -58, 26, -44, 36, -30, 24, -14, 34, 0, 22, 16, 32, 30, 20, 48, 26, 60, 14, 69, -30, 69, -42, 54, -32, 0, -44, -52];
  var RC_HULL2 = [-62, -70, -50, -80, 44, -80, 56, -66, 46, -50, 58, -36, 46, -22, 58, -8, 46, 6, 58, 20, 46, 34, 58, 48, 46, 62, 54, 80, -52, 80, -66, 66];
  var RC_PL2 = [-54, -64, -44, -72, 36, -72, 46, -63, 36, -50, 48, -36, 36, -22, 48, -8, 36, 6, 48, 20, 36, 34, 48, 48, 36, 62, 42, 72, -46, 72, -58, 62];
  var RC_ARM = [-50, -52, -62, -44, -62, 46, -50, 54];
  var RC_CLAW = [0, -6, 20, -6, 24, -14, 46, -14, 36, -3, 22, -3, 22, 3, 36, 3, 46, 14, 24, 14, 20, 6, 0, 6];
  var RC_CUT = [-20, -12, 0, -22, 22, 2, 70, 12];                 // linia pęknięcia połówki przy połowie życia
  var RC_TOPC = [-90, -100, 90, -100, 90, 12, 70, 12, 22, 2, 0, -22, -20, -12, -90, -34];
  var RC_BOTC = [-90, -34, -20, -12, 0, -22, 22, 2, 70, 12, 90, 12, 90, 100, -90, 100];
  // 4. Segfault Prime: skrzydła z trzech ostrzy, głowa ze skośnymi szczelinami, szczęka z zębów, wielka korona
  var SP_W1 = [-46, -26, -96, -60, -138, -72, -112, -42, -50, -8], SP_W2 = [-48, -8, -108, -30, -148, -24, -114, -6, -50, 12], SP_W3 = [-48, 14, -100, 16, -134, 38, -96, 36, -48, 34];
  var SP_T1 = [-62, 22, 62, 22, 70, 34, 66, 84, 78, 100, 52, 90, -52, 90, -78, 100, -66, 84, -70, 34];
  var SP_T2 = [-50, -38, 50, -38, 56, -26, 50, 24, -50, 24, -56, -26];
  var SP_P2 = [-44, -32, 44, -32, 48, -24, 44, 18, -44, 18, -48, -24];
  var SP_T3 = [-30, -78, 30, -78, 36, -68, 32, -36, -32, -36, -36, -68];
  var SP_P3 = [-25, -72, 25, -72, 29, -65, 26, -42, -26, -42, -29, -65];
  var SP_EYL = [-46, -20, -14, -8, -15, -3, -45, -13], SP_EYR = MX(SP_EYL);
  var SP_BROW = [-54, -31, 0, -14, 54, -31, 54, -23, 0, -6, -54, -23];
  var SP_MAW = [-50, 46, 50, 46, 50, 72, -50, 72];
  var SP_CROWN = [-54, 0, -52, -14, -44, -5, -36, -32, -27, -7, -17, -24, -8, -8, 0, -44, 8, -8, 18, -28, 28, -7, 38, -38, 46, -5, 53, -18, 56, 0];
  var SP_ARM = [0, -9, 46, -9, 54, -3, 54, 3, 46, 9, 0, 9];
  var SP_CLAW = [50, -18, 82, -10, 66, 0, 82, 10, 50, 18, 57, 0];
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
    // v4.1: miniatury nowych sylwetek. b1 grot z okiem i płetwami, b2 masa komórek wylewająca się z kleszczy z kroplami,
    // b3 smukła i ciężka połówka spięte łańcuchem, b4 głowa w koronie ze skośnymi oczami i zębami, z ostrzami skrzydeł
    b1: [[0, [1, 3, 6, 1, 8, 4, 16, 4, 18, 1, 23, 3, 18, 9, 15, 12, 12, 23, 9, 12, 6, 9]], [1, [9.5, 5.5, 14.5, 5.5, 16, 7.5, 16, 9.5, 14.5, 11, 9.5, 11, 8, 9.5, 8, 7.5]], [0, [11, 7, 13, 7, 13, 9.5, 11, 9.5]]],
    b2: [[0, [2, 2, 8, 2, 10, 5, 6, 4, 4, 6, 4, 14, 6, 16, 10, 15, 8, 18, 2, 18, 1, 10]], [0, [22, 2, 16, 2, 14, 5, 18, 4, 20, 6, 20, 14, 18, 16, 14, 15, 16, 18, 22, 18, 23, 10]],
      [0, CR(7, 6, 4, 4, 1)], [0, CR(11.5, 5, 4, 4, 1)], [0, CR(8.5, 10.5, 5, 4.5, 1)], [0, CR(14, 9.5, 4, 4, 1)], [0, CR(0, 12, 3, 3, 0.8)], [0, CR(21, 6, 3, 3, 0.8)],
      [0, [10.5, 15, 11.5, 15, 11.5, 17.5, 10.5, 17.5]], [0, CR(9.5, 17.5, 3, 2.5, 0.6)], [0, CR(10, 21, 2, 2, 0.5)], [0, CR(15, 14, 2, 2.5, 0.5)]],
    b3: [[0, [1, 5, 7, 2, 9, 4, 8, 20, 4, 22, 2, 20, 4, 12]], [0, [14, 3, 21, 3, 23, 1, 24, 7, 22, 9, 23, 19, 20, 22, 14, 22, 13, 19, 13, 6]],
      [1, [4.5, 7, 7, 6.5, 7, 8.5, 4.5, 9]], [1, [16, 7, 19, 7, 19, 10, 16, 10]], [0, [8, 9.5, 10.5, 9.5, 10.5, 11.5, 8, 11.5]], [0, [11, 12, 13.5, 12, 13.5, 14, 11, 14]]],
    b4: [[0, [4, 10, 5, 6, 7, 8, 8.5, 3, 10.5, 7, 12, 0.5, 13.5, 7, 15.5, 3, 17, 8, 19, 6, 20, 10, 20, 15, 18, 19, 18, 22, 6, 22, 6, 19, 4, 15]],
      [0, [4, 11, 0, 7, 1, 13, 4, 16]], [0, [20, 11, 24, 7, 23, 13, 20, 16]],
      [1, [5.5, 11, 10.5, 13, 10.5, 14.5, 5.5, 12.8]], [1, [18.5, 11, 13.5, 13, 13.5, 14.5, 18.5, 12.8]],
      [1, [7.5, 17, 16.5, 17, 15.5, 19, 14.5, 17.8, 13.3, 19.5, 12, 17.8, 10.7, 19.5, 9.5, 17.8, 8.5, 19]]],
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

  // --- bossowie: rysunki części (wołane raz przy budowie, kontekst już przeskalowany do jednostek) ---
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
  // v4.1: tekst kodu z kod.txt tylko w wybranych panelach, większy i w niskim kontraście (karmazyn ciemny na panelu)
  function tex(x, P, pts, fs, sd) {
    var j, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, y, s;
    for (j = 0; j < pts.length; j += 2) { x0 = Math.min(x0, pts[j]); x1 = Math.max(x1, pts[j]); y0 = Math.min(y0, pts[j + 1]); y1 = Math.max(y1, pts[j + 1]); }
    x.save(); pf(x, pts); x.clip();
    x.font = '500 ' + fs + 'px ' + MONO; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillStyle = P.txt;
    for (y = y0 + fs; y < y1; y += fs * 1.45) {
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
      x.strokeStyle = P.dark; x.lineWidth = 3.6; x.stroke();
      x.strokeStyle = P.hot; x.lineWidth = 1.2; x.stroke();
    }
    x.restore();
  }
  // faza krawędzi: światło z góry. Krawędź zwrócona w górę = kość (cienka), w lewo = karmazyn, w dół i w prawo = ink (wnęka: odwrotnie)
  function bev(x, pts, P, lw, inv) {
    var j, n = pts.length, A = 0, ax, ay, bx, by, nx, ny, l, d;
    for (j = 0; j < n; j += 2) A += pts[j] * pts[(j + 3) % n] - pts[(j + 2) % n] * pts[j + 1];
    x.save(); pf(x, pts); x.clip(); x.lineCap = 'square';
    for (j = 0; j < n; j += 2) {
      ax = pts[j]; ay = pts[j + 1]; bx = pts[(j + 2) % n]; by = pts[(j + 3) % n];
      nx = by - ay; ny = ax - bx; if (A < 0) { nx = -nx; ny = -ny; }
      l = Math.sqrt(nx * nx + ny * ny) || 1; nx /= l; ny /= l; if (inv) { nx = -nx; ny = -ny; }
      d = -(nx + ny) * 0.7071;
      if (ny < -0.6) { x.strokeStyle = P.lit; x.lineWidth = lw * 2; }
      else if (d > 0.2) { x.strokeStyle = P.rim; x.lineWidth = lw * 2.2; }
      else if (d < -0.3) { x.strokeStyle = P.dark; x.lineWidth = lw * 2.6; }
      else continue;
      ln(x, ax, ay, bx, by);
    }
    x.restore();
  }
  // cień jako kreskowanie skośne (dolna część wielokąta) ciemnym karmazynem, bez gradientu
  function hat(x, P, pts, fr, sp) {
    var j, y0 = 1e9, y1 = -1e9, x0 = 1e9, x1 = -1e9;
    for (j = 0; j < pts.length; j += 2) { x0 = Math.min(x0, pts[j]); x1 = Math.max(x1, pts[j]); y0 = Math.min(y0, pts[j + 1]); y1 = Math.max(y1, pts[j + 1]); }
    x.save(); pf(x, pts); x.clip(); x.beginPath(); x.rect(x0, y0 + (y1 - y0) * fr, x1 - x0, y1 - y0); x.clip();
    x.strokeStyle = P.deep; x.lineWidth = 1.1; sp = sp || 3.4;
    for (j = x0 - (y1 - y0); j < x1; j += sp) ln(x, j, y1, j + (y1 - y0), y0);
    x.restore();
  }
  // płyta: płaszczyzna + faza krawędzi + cienki kontur
  function pb(x, pts, fill, P, lw, inv) { pf(x, pts, fill); bev(x, pts, P, lw || 1.2, inv); pf(x, pts, null, P.dark, 0.8); }
  function rivets(x, P, a) { x.fillStyle = P.edge; for (var j = 0; j < a.length; j += 2) x.fillRect(a[j] - 1.3, a[j + 1] - 1.3, 2.6, 2.6); }
  // żebro: karmazynowa linia konstrukcji wpuszczona w ciemny rowek (łamana)
  function rib(x, P, a, w, col) {
    x.lineJoin = 'miter'; x.lineCap = 'butt'; x.beginPath(); x.moveTo(a[0], a[1]);
    for (var j = 2; j < a.length; j += 2) x.lineTo(a[j], a[j + 1]);
    x.strokeStyle = P.dark; x.lineWidth = w + 2.6; x.stroke(); x.strokeStyle = col || P.sol; x.lineWidth = w; x.stroke();
  }

  // 1. NullPointer: długi grot wskaźnika, kolce barków, gniazdo wielkiego oka, karmazynowe żebra od oka do krawędzi
  function artNP(x, P) {
    var j;
    pb(x, NP_HULL, P.hull, P, 2);
    pb(x, NP_PL, P.plate, P, 1, true);
    hat(x, P, NP_PL, 0.55);
    pb(x, NP_PNL, P.hull, P, 1); pb(x, NP_PNR, P.hull, P, 1);
    tex(x, P, NP_PNL, 6, 9); tex(x, P, NP_PNR, 6, 13);
    rib(x, P, [-36, -6, -62, -2, -90, -40], 3); rib(x, P, [36, -6, 62, -2, 90, -40], 3);
    rib(x, P, [-20, 20, -46, 6], 2.2, P.acc); rib(x, P, [20, 20, 46, 6], 2.2, P.acc); rib(x, P, [0, 24, 0, 30], 3);
    pb(x, NP_TIP, P.sol, P, 1.4);
    pf(x, [-12, 31, 12, 31, 0, 56], P.hot); pf(x, [-5, 34, 5, 34, 0, 46], P.dark);
    pf(x, NP_BAND, P.sol);
    x.fillStyle = P.dark; for (j = 0; j < 15; j++) x.fillRect(-88 + j * 12, -54, 6, 5);
    x.fillStyle = P.hot; x.fillRect(-94, -48.5, 188, 1.4);
    pb(x, NP_SOCK, P.dark, P, 1.8, true);
    st(x, '*ptr', 8, -66, -36, P.hi, 1);
    rivets(x, P, [-84, -46, 80, -46, -46, 2, 46, 2, -24, 30, 24, 30]);
  }
  // płetwa-strzałka z trzech warstw: tył (ciemny), środek (karmazyn), grot (gorący z jasną krawędzią)
  function artFin(x, P) {
    pb(x, NP_FIN, P.hull, P, 1.4); hat(x, P, NP_FIN, 0.5);
    pb(x, NP_FIN2, P.sol, P, 1.1);
    pf(x, [30, -10, 46, 0, 30, 10], P.hot); x.strokeStyle = P.hi; x.lineWidth = 1.2; ln(x, 30, -10, 46, 0);
    x.fillStyle = P.dark; x.fillRect(10, -6, 3, 12); x.fillRect(17, -6, 3, 12);
  }
  function artArm(x, P) {
    pb(x, NP_ARM, P.hull, P, 1.2);
    rib(x, P, [4, 0, 58, 0], 2);
    pf(x, [62, -8, 74, 0, 62, 8], P.hot);
  }
  // oko: płytka `null` jest najjaśniejszym elementem bossa
  function artNull(x, P) {
    pf(x, [-21, -12, 17, -12, 21, -8, 21, 12, -17, 12, -21, 8], P.hi, P.dark, 1.6);
    st(x, 'null', 12, 0, 0.8, P.dark, 1);
  }

  // 2. Memory Leak: komórki pamięci (atlas): 0–3 ciemne, 4–5 przepełnione (karmazyn), 6 błysk
  function artCell(x, P, v) {
    var j, q = CR(-7.5, -7.5, 15, 15, 3.5);
    if (v < 4) {
      pf(x, q, v === 3 ? P.hull : P.plate);
      x.strokeStyle = P.rim; x.lineWidth = 1.8; ln(x, -6.6, -3.5, -6.6, 7); x.strokeStyle = P.lit; x.lineWidth = 1.6; ln(x, -7.5, -6.7, 3.5, -6.7);
      x.fillStyle = P.deep; x.fillRect(-4, -2, 9, 1.6); x.fillRect(-4, 1.6, 5, 1.6);
      if (v === 1) { x.fillStyle = P.sol; x.fillRect(-4, 3.5, 9, 3.5); }
      if (v === 2) { x.fillStyle = P.hi; x.fillRect(-4, 4, 2.5, 2.5); x.fillRect(0, 4, 2.5, 2.5); }
      pf(x, q, null, P.dark, 0.8);
    } else if (v < 6) {
      pf(x, q, v === 4 ? P.sol : P.hot);
      x.fillStyle = v === 4 ? P.dark : P.hi;
      for (j = 0; j < 4; j++) x.fillRect(-5, -4.5 + j * 3, j & 1 ? 6 : 10, 1.3);
      pf(x, q, null, P.dark, 0.8);
    } else pf(x, q, C.bone);
  }
  // kleszcze: ramię z zakrzywionymi szczękami i zębami wbitymi w masę
  function artClamp(x, P) {
    pb(x, ML_CLAMP, P.hull, P, 1.6);
    rib(x, P, [-6, -64, -13, -36, -8, 0, -13, 36, -6, 64], 3);
    rib(x, P, [-10, -66, 24, -66, 38, -54], 2, P.acc); rib(x, P, [-10, 66, 24, 66, 38, 54], 2, P.acc);
    pf(x, [28, -60, 44, -52, 32, -55], P.hot); pf(x, [28, 60, 44, 52, 32, 55], P.hot);
    pf(x, [16, -60, 22, -51, 19, -59], P.hi); pf(x, [16, 60, 22, 51, 19, 59], P.hi);
    rivets(x, P, [-4, -66, -4, 66, -6, 0]);
  }
  function artHeap(x, P) {
    pb(x, [-42, -8, 38, -8, 42, -4, 42, 8, -42, 8], P.hull, P, 1.2);
    st(x, 'HEAP', 7, -27, 0.6, P.hi, 1);
    pf(x, [-14, -3.5, 36, -3.5, 36, 3.5, -14, 3.5], P.dark);
  }

  // 3. Race Condition: T1 (m = 1, lewa) smukła z odgiętymi ostrzami, T2 (m = -1, prawa) ciężka z naramiennikami
  function artRC(x, P, m) {
    var j, H1 = m > 0 ? RC_HULL : RC_HULL2, P1 = m > 0 ? RC_PL : RC_PL2;
    x.save(); x.scale(m, 1);
    if (m > 0) {                                // T1: odgięte do tyłu ostrza prędkości
      pb(x, [-40, -60, -70, -76, -58, -46, -44, -40], P.sol, P, 1);
      pb(x, [-42, -24, -78, -34, -60, -8, -42, -6], P.sol, P, 1.2);
      pb(x, [-42, 14, -72, 12, -56, 34, -44, 30], P.hull, P, 1.2);
      pb(x, [-44, 46, -64, 52, -50, 66, -40, 60], P.sol, P, 1);
    } else {                                    // T2: ciężkie naramienniki z kolcami
      pb(x, RC_ARM, P.plate, P, 1.2);
      pb(x, [-60, -66, -88, -78, -80, -46, -84, -30, -64, -24], P.sol, P, 1.4);
      pf(x, [-88, -78, -80, -64, -76, -72], P.hot);
      pb(x, [-62, 18, -90, 26, -82, 40, -88, 56, -62, 50], P.hull, P, 1.4);
      pf(x, [-90, 26, -80, 34, -82, 40], P.hot); pf(x, [-88, 56, -78, 50, -76, 54], P.sol);
    }
    pb(x, H1, P.hull, P, 2);
    pb(x, P1, P.plate, P, 1, true);
    hat(x, P, P1, 0.6);
    if (m < 0) { pb(x, [-46, -6, 30, -6, 30, 22, -46, 22], P.hull, P, 1); tex(x, P, [-46, -6, 30, -6, 30, 22, -46, 22], 6, 11); pb(x, [-52, 32, 38, 32, 44, 38, 44, 64, -52, 64], P.sol, P, 1.2); }
    else { tex(x, P, [-30, -2, 22, -2, 22, 24, -30, 24], 6, 4); pb(x, [-34, 35, 20, 35, 25, 41, 25, 61, -34, 61], P.sol, P, 1.2); }
    rib(x, P, m > 0 ? [-36, -46, 20, -46, 30, -56] : [-50, -48, 34, -48], 3);
    rib(x, P, m > 0 ? [-30, 30, 16, 30] : [-50, 34, 34, 34], 3);
    rib(x, P, m > 0 ? [-30, 0, 26, 8] : [-54, -20, -54, 58], 2.2, P.acc);
    pb(x, OCT(-10, -24, 22, 7), P.dark, P, 1.4, true);
    x.fillStyle = P.dark; for (j = -40; j < 64; j += 9) x.fillRect(m > 0 ? 24 : 32, j, 7, 3);
    x.fillStyle = P.sol; x.fillRect(m > 0 ? -46 : -62, -40, m > 0 ? 6 : 9, 80);
    rib(x, P, m > 0 ? [-38, -72, 24, -72, 36, -60] : [-46, -75, 40, -75, 50, -64], 1.8, P.hi);
    x.restore();
    st(x, m > 0 ? 'T1' : 'T2', m > 0 ? 22 : 28, (m > 0 ? -6 : -12) * m, 48, P.hi, 1);
    rivets(x, P, m > 0 ? [-36, -70, 22, -70, -30, 66] : [56, -74, -40, -74, 56, 74, -40, 74]);
  }
  function artClaw(x, P) {
    pb(x, RC_CLAW, P.hull, P, 1.2);
    pf(x, OCT(5, 0, 4, 1.2), P.sol);
    pf(x, [38, -13, 46, -14, 38, -6], P.hot); pf(x, [38, 13, 46, 14, 38, 6], P.hot);
  }
  function artLink(x, P, col) {
    pf(x, [-8, -6, 3, -6, 3, -9, 9, -4, 3, 1, 3, -2, -8, -2], col, P.dark, 1.2);
    pf(x, [8, 2, -3, 2, -3, -1, -9, 4, -3, 9, -3, 6, 8, 6], col, P.dark, 1.2);
  }

  // 4. Segfault Prime: skrzydła z ostrzy, trzy piętra (szczęka, głowa ze szczelinami, gniazdo rdzenia)
  function artSPHalf(x, P, sd) {                // jedno skrzydło (lewe) — prawe to odbicie
    pb(x, SP_W3, P.hull, P, 1.4); hat(x, P, SP_W3, 0.4); rib(x, P, [-50, 24, -100, 26, -128, 36], 2.2, P.acc);
    pb(x, SP_W2, P.sol, P, 1.4); rib(x, P, [-50, 2, -110, -16, -144, -24], 2.6, P.deep);
    pb(x, SP_W1, P.hull, P, 1.6); tex(x, P, SP_W1, 6, sd); rib(x, P, [-50, -16, -100, -46, -134, -70], 2.6, P.hi);
    pf(x, [-138, -72, -124, -58, -128, -66], P.hot); pf(x, [-148, -24, -134, -20, -136, -26], P.hot); pf(x, [-134, 38, -122, 32, -124, 37], P.sol);
  }
  function artSP(x, P) {
    var j;
    artSPHalf(x, P, 6); x.save(); x.scale(-1, 1); artSPHalf(x, P, 17); x.restore();
    // piętro 1: szczęka. Paszcza (ink + ciemny karmazyn), górne zęby kościane, dolne karmazynowe, żuchwa z kolcami
    pb(x, SP_T1, P.hull, P, 2); hat(x, P, SP_T1, 0.7);
    pf(x, SP_MAW, P.dark); pf(x, [-46, 54, 46, 54, 46, 66, -46, 66], P.deep);
    for (j = 0; j < 8; j++) { pf(x, [-48 + j * 12, 46, -36 + j * 12, 46, -42 + j * 12, 62 - (j & 1) * 5], j === 3 || j === 4 ? P.hi : P.lit); }
    for (j = 0; j < 7; j++) pf(x, [-44 + j * 13, 72, -32 + j * 13, 72, -38 + j * 13, 58 + (j & 1) * 4], P.sol);
    pf(x, [-50, 44, 50, 44, 50, 47, -50, 47], P.dark); pf(x, [-50, 71, 50, 71, 50, 74, -50, 74], P.dark);
    rib(x, P, [-62, 30, 62, 30], 3); rib(x, P, [-58, 80, -24, 86, 24, 86, 58, 80], 2.4, P.acc);
    // piętro 2: głowa, brwi w kształcie V nad skośnymi szczelinami oczu
    pb(x, SP_T2, P.hull, P, 2); pb(x, SP_P2, P.plate, P, 1, true);
    pb(x, SP_BROW, P.hull, P, 1.4); rib(x, P, [-54, -27, 0, -10, 54, -27], 2.6);
    pb(x, SP_EYL, P.dark, P, 1, true); pb(x, SP_EYR, P.dark, P, 1, true);
    rib(x, P, [-34, 4, -18, 14, 18, 14, 34, 4], 2, P.acc); x.fillStyle = P.dark; x.fillRect(-2, 2, 4, 14);
    // piętro 3: gniazdo rdzenia
    pb(x, SP_T3, P.hull, P, 2); pb(x, SP_P3, P.plate, P, 1, true); tex(x, P, SP_P3, 5.5, 21);
    rib(x, P, [-36, -38, 36, -38], 3);
    pb(x, SP_CORE, P.dark, P, 1.4, true);
    rivets(x, P, [-60, 36, 60, 36, -46, -34, 46, -34, -28, -74, 28, -74]);
  }
  function artCrown(x, P) {
    pb(x, SP_CROWN, P.hull, P, 1.4);
    rib(x, P, [-50, -3, 50, -3], 2.4);
    pf(x, [-3, -44, 3, -44, 0, -32], P.hi); pf(x, [35, -38, 41, -38, 38, -28], P.hi); pf(x, [-39, -32, -33, -32, -36, -22], P.hi);
    pf(x, [16, -28, 20, -28, 18, -22], P.sol); pf(x, [-19, -24, -15, -24, -17, -18], P.sol);
  }
  function artRing(x, P) {
    var s, a0, a1, r0 = 86, r1 = 99;
    for (s = 0; s < 16; s++) {
      if (s % 4 === 3) continue;
      a0 = s * Math.PI / 8 + 0.05; a1 = (s + 1) * Math.PI / 8 - 0.05;
      pf(x, [r0 * Math.cos(a0), r0 * Math.sin(a0), r1 * Math.cos(a0), r1 * Math.sin(a0), r1 * Math.cos(a1 + 0.08), r1 * Math.sin(a1 + 0.08), r0 * Math.cos(a1), r0 * Math.sin(a1)], s % 4 === 0 ? P.hot : P.sol, P.dark, 1.2);
      if (!(s & 1)) { x.fillStyle = s % 4 === 0 ? P.hi : P.acc; x.fillRect(102 * Math.cos(a0) - 1.6, 102 * Math.sin(a0) - 1.6, 3.2, 3.2); }
    }
  }
  function artSPArm(x, P) {
    pb(x, SP_ARM, P.hull, P, 1.3); rib(x, P, [4, 0, 46, 0], 2);
    pb(x, SP_CLAW, P.sol, P, 1);
    pf(x, [66, -12, 82, -10, 70, -6], P.hot); pf(x, [66, 12, 82, 10, 70, 6], P.hot);
    pf(x, OCT(0, 0, 7, 2), P.dark, P.acc, 1);
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
    '<p class="dcg-p">Lecisz nad miastem. Z góry spada nasz kod. Pięć fal, na szóstej boss.</p>' +
    '<div class="dcg-row" role="group" aria-label="Tryb gry">' +
    '<button type="button" data-m="unik" aria-pressed="true">' + ibtn('shield', 20) + 'Unik</button>' +
    '<button type="button" data-m="ogien" aria-pressed="false">' + ibtn('auto', 20) + 'Ogień</button></div>' +
    '<p class="dcg-p dcg-md"></p><p class="dcg-k dcg-rec">' + ibtn('record', 18) + '<span></span></p>' +
    '<p class="dcg-k">' + ibtn('b1', 18) + ibtn('b2', 18) + ibtn('b3', 18) + ibtn('b4', 18) + '<span class="dcg-oc">4 bossy</span></p>' +
    '<div class="dcg-row"><button type="button" class="dcg-go" data-a="start">Start</button>' +
    '<button type="button" data-a="cont" hidden>' + ibtn('boss', 20) + '<span></span></button>' +
    '<button type="button" data-a="snd" aria-pressed="false" aria-label="Dźwięk: wył.">' + ibtn('mute', 20) + '<span>Dźwięk: wył.</span></button></div>' +
    '<div class="dcg-row" role="group" aria-label="Wyzwania"><button type="button" data-a="sudo" aria-pressed="false">' + ibtn('power', 20) + 'sudo</button>' +
    '<button type="button" data-a="rush">' + ibtn('boss', 20) + 'Boss rush</button></div><p class="dcg-p dcg-sm dcg-lk"></p>' +
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
    '<div class="dcg-row"><p class="dcg-big dcg-gr" aria-label="ocena">S</p><p class="dcg-k dcg-gd" style="flex:1"></p></div><p class="dcg-k dcg-rt" hidden></p>' +
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
  function loadJ(k) { try { var v = G.localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function saveJ(k, v) { try { if (v) G.localStorage.setItem(k, JSON.stringify(v)); else G.localStorage.removeItem(k); } catch (e) { /* bez localStorage: bez punktu kontrolnego */ } }
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
    // ?elite=1 (elity od fali 1, często), ?unlock=1 / opts.unlock (sudo i boss rush bez pokonania Segfault Prime, np. w demo), ?sil=1 (boss jednym kolorem: test sylwetki)
    var testElite = !!(opts.elite || (qs && qs.get('elite') === '1')), unlockOpt = !!(opts.unlock || (qs && qs.get('unlock') === '1')), silh = !!(qs && qs.get('sil') === '1'), silx = !!(qs && qs.get('sil') === '2');
    // ?bhp=N: boss zaczyna z N% życia (tylko do zrzutów i pomiaru desperacji; walki w testach czasu idą od 100%)
    var testHp = +(opts.bhp || (qs && qs.get('bhp')) || 0);

    // --- stan ---
    var W = 0, H = 0, dpr = 0, F = 0, s0 = 1, bs = 1, cw = 8, lh = 18, pad = 5;
    var elSpr = [], spr = [], atlas = null, gIdx = {}, cellW = 10, eligible = [], eligN = 0, shipG = [], pj = [], ic = {};
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
    var bossTier = 0, tb = -1, tbTier = 0, cp = null, diedBoss = false, earned = [0, 0, 0, 0], pickIds = [], lastBoss = 0;
    // boss v4: st = 1 wejście, 2 walka, 3 śmierć (zgrubnie, jak w v3); fs = stan maszyny (S_*), atk = bieżący atak (A_*)
    var BO = { on: false, type: 0, tier: 0, n: 1, st: 0, en: 0, age: 0, ph: 0, need: 60, phase: 1, g: 0, sub: 0, fast: 1, hit: 0, hp: 100, dt: 0, lane: 0, laneW: 0,
      il: 1.8, vp: 1, hpG: 100, gT: 0, blk: 0, bt: 2, d1: 0, d2: 0, d3: 0, armT: 0, cb: 0, dr: 0, gone: false, et: 0, sh: 0,
      fs: 0, ft: 0, fd: 0, atk: -1, last: -1, cnt: 0, stC: [], atC: [], tm: 0, k: 0, sd: 1, a0: 0, a1: 0, bm: 0, bmA: 0, bmHW: 0, gx: 0, gy: 0, gw: 0,
      jOn: 0, jx: 0, jy: 0, jy0: 0, tx: 0, ty: 0, wl: 0, mtx: -1, mtT: 0, lockHp: 0, lx: [0, 0, 0], ly: [0, 0], echo: 0, echoA: -1, echoS: 1,
      fq: [0, 0, 0, 0, 0, 0], fqN: 0, fT: 0, pend: 0, panic: 0, sag: 0, chip: 0, hits: 0, stg: 0, t0: 0, vk: 1, tk: 1, hellT: 0, fired: 0, sx: 0, sy: 0 };
    var BP = [], RX = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], RK = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], RN = 0, i, AW = [];
    for (i = 0; i < SN.length; i++) BO.stC.push(0);
    for (i = 0; i < ATK.length; i++) { BO.atC.push(0); AW.push(0); }
    // stos (stack overflow): wysokość i czas życia każdej kolumny
    var NSK = 10, STK = [], STT = [];
    for (i = 0; i < NSK; i++) { STK.push(0); STT.push(0); }
    // v4: combo, ocena, Unik-bomba z muśnięć, sudo, boss rush, elity, stop-klatka, smuga statku, fala karmazynu w mieście
    var combo = 0, comboT = 0, comboM = 1, bmeter = 0, sudo = false, rush = false, rushT = 0, rushN = 0, eliteCd = 0, hitstop = 0, godCd = 0;
    var TRX = [0, 0, 0, 0, 0], TRY = [0, 0, 0, 0, 0], trI = 0, trT = 0, cityB = null, cityW = 0, despP = 0, sil = null, prMax = 0;
    var ELP = { k: 0, t: 0, x: 0, gx: 0, gw: 0 }, gradeLast = 0, ELC = [0, 0, 0, 0];
    // v3: części bossa (BA), skala jednostek, glitch-pasy, wybuchy, odłamki i odpadające części (pule)
    var BA = null, BU = 1, haz = null, gN = 1, TBX = 0, TBY = 0, TS = 1, nextBossT = BOSS1_S;
    var GLY = [0, 0.2, 0.4, 0.6, 0.8, 1], GLX = [0, 0, 0, 0, 0], glA = 0, glT = 1;
    var EXP = [], exN = 0, SHD = [], shN = 0, DTP = [];

    // --- pule obiektów (zero alokacji w pętli) ---
    var OB = [], obN = 0, PT = [], ptN = 0, BL = [], blN = 0, FL = [], flN = 0, PR = [], prN = 0;
    for (i = 0; i < 48; i++) OB.push({ x: 0, y: 0, w: 0, h: 0, vy: 0, k: 0, hv: false, hp: 1, hit: 0, near: 0, el: 0, vx: 0, ex: 0, rv: 0, fz: 0, y1: 0, at: 0 });
    for (i = 0; i < 900; i++) PT.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, g: 0, r: 0 });
    for (i = 0; i < 64; i++) BL.push({ x: 0, y: 0 });
    for (i = 0; i < 8; i++) FL.push({ x: 0, y: 0, life: 0, txt: '' });
    for (i = 0; i < 320; i++) PR.push({ x: 0, y: 0, vx: 0, vy: 0, r: 6, g: 0, rot: 0, near: 0, t: 0, s: 0, a: 0, hw: 0, hh: 0, hp: 0, life: 0, k: 0 });
    for (i = 0; i < 2; i++) BP.push({ x: 0, y: -200, w: 0, h: 0, u: 1, spin: 0, fc: 0, hp: 100, max: 100, hit: 0, alive: false, ex: false, side: 1, ov: 0, ox: 0, oy: 0, mz: 0, hx: 0, hy: 0 });
    for (i = 0; i < 16; i++) EXP.push({ x: 0, y: 0, r: 0, life: 0, max: 1 });
    for (i = 0; i < 96; i++) SHD.push({ x: 0, y: 0, vx: 0, vy: 0, a: 0, va: 0, s: 0, life: 0, c: C.line });
    for (i = 0; i < 6; i++) DTP.push({ pt: null, x: 0, y: 0, vx: 0, vy: 0, a: 0, va: 0, S: 1, m: 1, life: 0 });

    function font(b, px) { return (b ? '700 ' : '400 ') + (px || F) + 'px ' + MONO; }
    function ls(c, v) { if ('letterSpacing' in c) c.letterSpacing = v + 'px'; }
    function go(s) { state = s; root.setAttribute('data-st', s); }
    function tag() {
      root.setAttribute('data-boss', BO.on ? BN[BO.type] : '');
      root.setAttribute('data-bhp', BO.on ? String(Math.ceil(BO.hp)) : '');
      root.setAttribute('data-bst', BO.on ? SN[BO.fs] : '');
      root.setAttribute('data-atk', BO.on && BO.atk >= 0 && (BO.fs === S_TELE || BO.fs === S_ATK) ? ATK[BO.atk][0] : '');
      root.setAttribute('data-phase', BO.on ? String(BO.phase) : '');
    }

    // --- render jednorazowy: linijki, znaki, pociski, bossowie i ikony HUD do offscreen canvas ---
    // gh = sam tekst bez tabliczki (linijka przelatująca za bossem)
    function lineSprite(s, w, h, heavy, gh) {
      var c = mk(w * dpr, h * dpr), x = c.getContext('2d');
      x.scale(dpr, dpr);
      x.fillStyle = heavy ? C.solid : C.ink;
      if (!gh) x.fillRect(0, 0, w, h);
      if (!heavy && !gh) {
        x.strokeStyle = C.line; x.lineWidth = 1; x.strokeRect(0.5, 0.5, w - 1, h - 1);
        x.fillStyle = C.acc; x.fillRect(0, 0, 2, h);
      }
      x.font = font(heavy); x.fillStyle = gh ? C.muted : C.bone; x.textBaseline = 'middle';
      x.fillText(s, pad, h / 2 + 0.5);
      return c;
    }
    // pociski bossa: jasne wnętrze + 2 px obwódki ink (czytelne na każdym tle); .i = wersja na odwrócone barwy (kernel panic)
    function pjSprite(kind, s) {
      var m = mk(4, 4).getContext('2d'), w, h, fs = F + 6, o = { c: null, i: null, w: 0, h: 0 }, v;
      if (kind === 0) { m.font = font(true, fs + (s === '*' ? 5 : 0)); w = Math.ceil(m.measureText(s).width) + 10; h = lh + 6; }
      else if (kind === 2) { m.font = font(true, F); w = Math.ceil(Math.max(m.measureText(s).width + 14, cellW * 5)); h = lh + 2; }
      else if (kind === 1) { w = 22; h = 14; } else if (kind === 3) { w = h = 64; } else if (kind === 4) { w = h = 16; } else if (kind === 5) { w = 34; h = 12; } else { w = h = 14; }
      o.w = w; o.h = h;
      for (v = 0; v < 2; v++) {
        var c = mk(w * dpr, h * dpr), x = c.getContext('2d'), fi = v ? C.ink : C.bone, ol = v ? C.hot : C.ink, ac = v ? C.bone : C.hot;
        x.scale(dpr, dpr); x.lineJoin = 'miter';
        if (kind === 0) {
          x.font = font(true, fs + (s === '*' ? 5 : 0)); x.textAlign = 'center'; x.textBaseline = 'middle';
          x.lineWidth = 4; x.strokeStyle = ol; x.strokeText(s, w / 2, h / 2 + 0.5); x.fillStyle = fi; x.fillText(s, w / 2, h / 2 + 0.5);
        } else if (kind === 1) {
          pf(x, [2, 3, 12, 3, 20, 7, 12, 11, 2, 11, 6, 7], fi, ol, 2); x.fillStyle = ac; x.fillRect(12, 6, 5, 2);
        } else if (kind === 2) {
          x.fillStyle = ol; x.fillRect(0, 0, w, h); x.fillStyle = fi; x.fillRect(2, 2, w - 4, h - 4); x.fillStyle = ac; x.fillRect(2, 2, 3, h - 4);
          x.font = font(true, F); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = ol; x.fillText(s, w / 2 + 2, h / 2 + 0.5);
        } else if (kind === 3) {
          x.translate(32, 32); x.fillStyle = ol; octPath(x, 0, 0, 31, 10); x.fill(); x.fillStyle = ac; octPath(x, 0, 0, 28.5, 9); x.fill();
          x.fillStyle = fi; octPath(x, 0, 0, 22, 7); x.fill(); x.fillStyle = ac; octPath(x, -4, -4, 9, 3); x.fill(); x.fillStyle = fi; x.fillRect(-10, -10, 5, 5);
        } else if (kind === 4) {
          x.fillStyle = ol; x.fillRect(0, 0, 16, 16); x.fillStyle = fi; x.fillRect(2, 2, 12, 12); x.fillStyle = ac; x.fillRect(5, 5, 6, 6);
        } else if (kind === 5) {
          x.fillStyle = ol; x.fillRect(0, 0, 34, 12); x.fillStyle = ac; x.fillRect(2, 2, 30, 8); x.fillStyle = fi; x.fillRect(2, 2, 30, 3);
        } else {
          x.translate(7, 7); x.fillStyle = ol; octPath(x, 0, 0, 7, 2.4); x.fill(); x.fillStyle = fi; octPath(x, 0, 0, 5, 1.7); x.fill(); x.fillStyle = ac; x.fillRect(-1.5, -1.5, 3, 3);
        }
        if (v) o.i = c; else o.c = c;
      }
      return o;
    }
    function octPath(x, cx, cy, r, k) {
      x.beginPath(); x.moveTo(cx - r + k, cy - r); x.lineTo(cx + r - k, cy - r); x.lineTo(cx + r, cy - r + k); x.lineTo(cx + r, cy + r - k);
      x.lineTo(cx + r - k, cy + r); x.lineTo(cx - r + k, cy + r); x.lineTo(cx - r, cy + r - k); x.lineTo(cx - r, cy - r + k); x.closePath();
    }
    // elity: karmazynowa płytka z jasną ramką, żeby od razu odróżniały się od zwykłych linijek
    function eliteSprite(s) {
      var m = mk(4, 4).getContext('2d'), w, c, x;
      m.font = font(true); w = Math.ceil(m.measureText(s).width + pad * 2 + 4);
      c = mk(w * dpr, lh * dpr); x = c.getContext('2d'); x.scale(dpr, dpr);
      x.fillStyle = C.bone; x.fillRect(0, 0, w, lh); x.fillStyle = C.deep; x.fillRect(2, 2, w - 4, lh - 4); x.fillStyle = C.hot; x.fillRect(2, 2, 3, lh - 4);
      x.font = font(true); x.fillStyle = C.bone; x.textBaseline = 'middle'; x.fillText(s, pad + 3, lh / 2 + 0.5);
      return { c: c, w: w, h: lh };
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
      var key = ty + ':' + W + ':' + H + ':' + dpr + ':' + F, A, j, i, k, X, Y, e, ids, ac, dx, dy;
      if (BA && BA.key === key) return;
      BU = bossU(ty) * (ty === 1 ? 1.15 : 1);
      A = { key: key, ty: ty, h: null, h2: null, k1: null, k2: null, p1: null, p2: null, p3: null, card: buildCard(ty) };
      if (ty === 0) {
        A.h = prt(208, 136, 104, 68, artNP);
        A.k1 = prt(208, 136, 104, 68, crk(NP_HULL, 4, 1), 0, 1); A.k2 = prt(208, 136, 104, 68, crk(NP_HULL, 5, 4), 0, 1);
        A.p1 = prt(62, 56, 2, 28, artFin); A.p2 = prt(82, 28, 2, 14, artArm); A.p3 = prt(46, 28, 23, 14, artNull);
      } else if (ty === 1) {
        A.p1 = prt(70, 148, 26, 74, artClamp); A.p2 = prt(88, 20, 44, 10, artHeap);
        // v4.1: masa komórek z kilku nieregularnych elips (wylewa się poza kleszcze); kolejność napełniania (od dołu) i odpadania (od brzegu)
        A.cx = []; A.cy = []; A.cv = []; A.e = []; A.cs = [];
        for (j = 0; j < 11; j++) for (i = 0; i < 16; i++) {
          X = (i - 7.5) * 17 + (j & 1) * 7 - 3.5; Y = (j - 5) * 17; e = 0;
          for (k = 0; k < ML_BLOB.length; k += 4) { dx = (X - ML_BLOB[k]) / ML_BLOB[k + 2]; dy = (Y - ML_BLOB[k + 1]) / ML_BLOB[k + 3]; e = Math.max(e, 1 - dx * dx - dy * dy); }
          if (e <= 0 || (Math.abs(X) < 21 && Math.abs(Y) < 19)) continue;
          A.cx.push(X + ((i * 7 + j * 3) % 5 - 2) * 1.4 + (i % 3 === 1 ? 2 : 0)); A.cy.push(Y + ((i * 3 + j * 5) % 5 - 2) * 1.3 + ((i * 11) % 4) * 0.8); A.cv.push((i * 5 + j * 3) % 4);
          A.cs.push(e < 0.25 ? 0.82 + ((i + j) % 3) * 0.09 : 1.04 + ((i * 3 + j) % 3) * 0.07); A.e.push(1 - e + ((i * 13 + j * 7) % 5) * 0.03);
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
        A.h = prt(184, 166, 92, 83, artRC, 1); A.h2 = prt(184, 166, 92, 83, artRC, -1);
        A.k1 = prt(184, 166, 92, 83, crk(RC_HULL, 4, 2), 0, 1); A.k2 = prt(184, 166, 92, 83, crk(RC_HULL2, 4, 7, -1), 0, 1);
        A.p1 = prt(50, 32, 2, 16, artClaw);
        A.l0 = prtC(20, 20, 10, 10, artLink, PAL, C.solid); A.l2 = prtC(20, 20, 10, 10, artLink, PAL, C.plate); A.l1 = prtC(20, 20, 10, 10, artLink, PAL, C.bone);
      } else {
        A.h = prt(304, 192, 152, 84, artSP);
        A.k1 = prt(304, 192, 152, 84, crk(SP_T2, 3, 1), 0, 1); A.k2 = prt(304, 192, 152, 84, crk(SP_T1, 4, 3), 0, 1);
        A.p1 = prt(116, 52, 58, 48, artCrown); A.p2 = prt(212, 212, 106, 106, artRing); A.p3 = prt(86, 40, 2, 20, artSPArm);
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
        spr.push({ w: w, h: lh, n: lineSprite(s, w, lh, false), b: lineSprite(s, w, lh, true), t: lineSprite(s, w, lh, false, true), g: gl, cw: (tw / s.length) });
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
      for (k = 0; k < obN; k++) if (OB[k].k >= 0) { OB[k].w = spr[OB[k].k].w; OB[k].h = lh; }
      pj = [pjSprite(0, '->'), pjSprite(0, '=='), pjSprite(0, '*'), pjSprite(1), pjSprite(2, '0x00'), pjSprite(3), pjSprite(4), pjSprite(5),
        pjSprite(6), pjSprite(2, 'frame'), pjSprite(2, 'free()')];
      elSpr = [eliteSprite('<<<<<<< merge conflict'), eliteSprite('>>>>>>> merge conflict'), eliteSprite('while(true)'), eliteSprite('// FIXME')];
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
      city = mk(P * dpr, cityH * dpr); cityB = mk(P * dpr, cityH * dpr);
      var c = city.getContext('2d'), cb = cityB.getContext('2d');
      c.scale(dpr, dpr); cb.scale(dpr, dpr);
      while (x < P) {
        bw = Math.round(rnd(18, 56));
        if (x + bw > P - 16) bw = P - x;
        bh = Math.round(rnd(0.3, 1) * (cityH - 10));
        c.fillStyle = cb.fillStyle = C.city;
        c.fillRect(x, cityH - bh, bw, bh); cb.fillRect(x, cityH - bh, bw, bh);
        if (bw > 22 && Math.random() < 0.22) { c.fillRect(x + (bw >> 1) - 1, cityH - bh - 9, 2, 9); cb.fillRect(x + (bw >> 1) - 1, cityH - bh - 9, 2, 9); }
        cb.fillStyle = C.deep; cb.fillRect(x, cityH - bh, bw, 2);
        // okna: w spokoju nieliczne i przygaszone; w walce (druga kopia) gęsto i karmazynowo
        for (wy = cityH - bh + 6; wy < cityH - 5; wy += 7)
          for (wx = x + 4; wx < x + bw - 5; wx += 6) {
            k = Math.random();
            if (k < 0.06) { c.fillStyle = k < 0.02 ? C.muted : C.solid; c.fillRect(wx, wy, 2, 3); }
            if (k < 0.2) { cb.fillStyle = k < 0.07 ? C.hot : C.solid; cb.fillRect(wx, wy, 2, 3); }
          }
        x += bw + (Math.random() < 0.3 ? Math.round(rnd(2, 8)) : 0);
      }
      cityP = P; cityOff = 0;
      clouds = [];
      n = Math.round(clamp(W / 160, 4, 9));
      for (k = 0; k < n * 3; k++) { clouds.push(cloud({ gl: k >= n * 2 }, k % 2 === 0, rnd(-20, H))); }   // trzecia część: chmury-glitch tylko w walce
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
      if (silh || silx) sil = mk(W * d, H * d);
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
      if (o.k < 0) { burst(o.x + o.w / 2, o.y + o.h / 2, 16, 200); return; }   // elita: płytka pęka na znaki
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
      o.el = 0; o.vx = 0; o.rv = 0; o.fz = 0; o.at = 0;
      obN++;
      // elity: od fali 3, rzadko, zawsze z telegrafem
      if ((wave >= 3 || testElite) && !ELP.k && eliteCd <= 0 && Math.random() < (testElite ? 0.4 : ELITE_P)) {
        ELP.k = 1 + ((Math.random() * 3) | 0); ELP.t = 0.8; ELC[ELP.k]++; eliteCd = testElite ? 2.5 : ELITE_CD;
        ELP.gw = Math.max(86 * s0, 74); ELP.gx = rnd(W * 0.25, W * 0.75); ELP.x = rnd(4, Math.max(4, W - elSpr[ELP.k === 2 ? 2 : 3].w - 4));
        sfx('tele');
      }
    }
    // elita wchodzi po telegrafie: 1 merge conflict (dwie linijki z boków z luką), 2 while(true) (zawraca raz), 3 // FIXME (mina)
    function eliteGo() {
      var k = ELP.k, o, sp, v = speed() * 1.1, j;
      ELP.k = 0;
      for (j = 0; j < (k === 1 ? 2 : 1); j++) {
        if (obN >= OB.length) return;
        o = OB[obN++]; sp = elSpr[k === 1 ? j : k === 2 ? 2 : 3];
        o.k = -1 - (k === 1 ? j : k === 2 ? 2 : 3); o.w = sp.w; o.h = sp.h; o.y = -sp.h - 2; o.vy = v; o.hv = false; o.hit = 0; o.near = 0; o.rv = 0; o.fz = 0; o.el = k;
        o.hp = k === 1 ? 999 : k === 2 ? 3 : 1; o.at = 0;
        if (k === 1) { o.ex = j ? 1 : -1; o.x = j ? W : -o.w; o.y1 = j ? ELP.gx + ELP.gw / 2 : ELP.gx - ELP.gw / 2 - o.w; o.vx = (o.y1 - o.x) / Math.max(0.4, (H * 0.35) / v); }
        else { o.x = ELP.x; o.vx = 0; o.y1 = H * rnd(0.62, 0.74); }
      }
    }
    // linijka z kodu spuszczona przez bossa w wybranym miejscu
    function lineAt(x, k, vy, y) {
      if (obN >= OB.length) return;
      var o = OB[obN++], sp = spr[k];
      o.k = k; o.w = sp.w; o.h = sp.h; o.x = clamp(x, 2, Math.max(2, W - sp.w - 2)); o.y = y;
      o.hv = false; o.hp = 1; o.hit = 0; o.near = 0; o.vy = vy; o.el = 0; o.vx = 0; o.at = 1;
    }
    // pocisk bossa: g = rodzaj (0 `->`, 1 `==`, 2 `*`, 3 dangling, 4 blok ściany, 5 bąbel, 6 komórka, 7 fala uderzeniowa, 8 kulka, 9 ramka stosu, 10 blok GC)
    function proj(x, y, vx, vy, g, r) {
      if (prN >= PR.length) return null;
      var p = PR[prN++], s2 = pj[g];
      p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.g = g; p.r = r; p.near = 0; p.rot = Math.atan2(vy, vx);
      p.t = 0; p.s = 0; p.a = 0; p.hp = 0; p.life = 0; p.k = 0;
      if (g === 4 || g === 7 || g === 9 || g === 10) { p.hw = s2.w / 2 - 1; p.hh = s2.h / 2 - 1; } else p.hw = p.hh = 0;
      if (prN > prMax) prMax = prN;
      return p;
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
      obN = 0; prN = 0; grace = 0.5; ELP.k = 0; clearStack();
      if (up.slow) slowT = 0.9 + 0.9 * up.slow;
      if (!reduced) flash = FLASH;
      sfx('bomb');
      if (BO.on) bossBomb();
      ui();
    }
    // trafienie statku: tarcza pochłania jedno, inaczej SEGFAULT. Zwraca true, gdy statek zginął.
    function hurt() {
      if (state !== 'play' || invul > 0 || BO.st === 1 || BO.st === 3) return false;
      if (god) { if (godCd <= 0) { if (BO.on) BO.hits++; godCd = 0.8; } return false; }   // tryb testowy: liczymy trafienia do oceny
      if (BO.on) BO.hits++;
      combo = 0; comboT = 0; comboM = 1;
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

    // --- bossowie v4: maszyna stanów, repertuar ataków, fazy, desperacja, stagger ---
    function bossTop() { return W < 600 ? 186 : 80; }   // pod paskiem życia bossa
    function hsc() { return clamp(H / 600, 0.75, 1.3); }
    function bossPos() {
      var ty = BO.type, u = bossU(ty) * (ty === 1 ? 0.95 + 0.2 * BO.g : 1), k, p, e = BO.st === 1 ? 1 - Math.pow(1 - BO.en, 3) : 1, xx, yy, top = bossTop(), am, sg = BO.sag * 16 * bs;
      for (k = 0; k < BO.n; k++) {
        p = BP[k]; p.u = u; p.w = DIM[ty][0] * u; p.h = DIM[ty][1] * u;
        am = Math.max(0, (W - p.w) / 2 - 6);
        if (ty === 0) { xx = W / 2 + Math.sin(BO.ph * 0.7) * Math.min(W * 0.2, am); yy = top + p.h / 2 + Math.min(BO.age * 4 * bs, H * 0.04); }
        else if (ty === 1) { xx = W / 2 + Math.sin(BO.ph * 0.5) * Math.min(W * 0.12, am); yy = top + p.h / 2; }
        else if (ty === 2) { xx = W / 2 + (k ? 1 : -1) * (W * 0.18 + Math.sin(BO.ph * 0.6) * W * 0.03); yy = top + p.h / 2 + Math.sin(BO.ph * 0.9 + k * 2) * 6; }
        else { xx = W / 2 + Math.sin(BO.ph * 0.4) * Math.min(W * 0.08, am); yy = top + 114 * u + Math.sin(BO.ph * 0.9) * 5; }
        p.hx = xx; p.hy = yy;
        if (ty === 0 && BO.jOn) { xx = BO.jx; yy = BO.jy; }
        if (p.ov) { xx = p.ox; yy = p.oy; }
        p.x = xx; p.y = yy + (p.ov || BO.jOn ? 0 : sg) - (1 - e) * (yy + p.h);
      }
    }
    function showBanner(txt) { bannerTxt = txt; bannerW = 0; banner = 2.2; }
    function setFs(s, d) { BO.fs = s; BO.ft = 0; BO.fd = d; BO.stC[s]++; tag(); }
    function phaseOf(hp) { return hp > THR[0] ? 1 : hp > THR[1] ? 2 : hp > THR[2] ? 3 : 4; }
    function alive() { return (BP[0].alive ? 1 : 0) + (BO.n === 2 && BP[1].alive ? 1 : 0); }
    // część bossa, w którą warto strzelać (dla bota testowego i dla celownika mutexu)
    function aimP() {
      var a = BP[0], c = BP[1];
      if (BO.n < 2) return a;
      if (!a.alive) return c; if (!c.alive) return a;
      if (BO.mtx >= 0) return BP[BO.mtx ^ 1];
      return a.hp <= c.hp ? a : c;
    }
    function nearP() { var a = BP[0], c = BP[1]; if (BO.n < 2 || !c.alive) return a; if (!a.alive) return c; return Math.abs(ship.x - a.x) < Math.abs(ship.x - c.x) ? a : c; }
    var EX = 0, EY = 0;
    function eye(p, k) {   // ognisko bossa (oko / rdzeń), z którego lecą pociski
      var u = p.u, ty = BO.type;
      if (ty === 0) { EX = p.x; EY = p.y - 12 * u; } else if (ty === 1) { EX = p.x; EY = p.y; }
      else if (ty === 2) { EX = p.x + (k ? 10 : -10) * u; EY = p.y - 24 * u; } else { EX = p.x; EY = p.y - 55 * u; }
    }
    function bossStart() {
      var ty = bossTier % 4, n = ty === 2 ? 2 : 1, k, p;
      ensureArt(ty);
      cp = { score: score, bombs: bombs, up: { fire: up.fire, dbl: up.dbl, shield: up.shield, graze: up.graze, slow: up.slow, power: up.power, agile: up.agile, cache: up.cache },
        sh: shieldOn, wave: wave, waveT: waveT, tier: bossTier, nbt: nextBossT, t: t, nb: nextBomb, step: step };
      BO.on = true; BO.type = ty; BO.tier = bossTier; BO.n = n; BO.st = 1; BO.en = 0; BO.age = 0; BO.ph = 0; BO.hit = 0;
      BO.need = BNEED[ty] * (1 + 0.5 * Math.floor(bossTier / 4));
      BO.phase = 1; BO.g = 0; BO.sub = 0; BO.fast = 1; BO.hp = 100;
      BO.il = reduced ? 0.9 : INTRO_S; BO.vp = 1; BO.hpG = 100; BO.gT = 0; BO.blk = -1; BO.bt = 2.5; BO.d1 = BO.d2 = BO.d3 = 0; BO.armT = 0; BO.cb = 0; BO.dr = 0;
      BO.gone = false; BO.et = 0; BO.sh = 0; glA = 0; glT = 0.05;
      BO.atk = -1; BO.last = -1; BO.cnt = 0; BO.pend = 0; BO.sag = 0; BO.chip = 0; BO.hits = 0; BO.stg = 0; BO.t0 = t; BO.hellT = 0; BO.vk = 1;
      for (k = 0; k < SN.length; k++) BO.stC[k] = 0;
      for (k = 0; k < ATK.length; k++) BO.atC[k] = 0;
      atkClear();
      for (k = 0; k < 2; k++) {
        p = BP[k]; p.alive = k < n; p.hp = p.max = 100 / n; p.hit = 0; p.ex = false; p.spin = 0;
        p.side = k ? -1 : 1; p.x = W / 2; p.y = -200; p.fc = 0; p.ov = 0; p.mz = 0;
      }
      if (mode === 'unik' && bombs < 1) bombs = 1;   // v4: jedna pomoc na start walki w Uniku (v3: 2)
      bmeter = 0;
      // boss wchodzi na czystą scenę: linijki rozsypują się na znaki, w trakcie wejścia nic nie trafia statku
      for (k = obN - 1; k >= 0; k--) shatter(OB[k]);
      obN = 0; prN = 0; spawnT = 1; banner = 0; ELP.k = 0; clearStack();
      if (testHp > 0 && testHp < 100) {
        for (k = 0; k < n; k++) BP[k].hp = BP[k].max * testHp / 100;
        BO.hp = BO.hpG = testHp; BO.phase = phaseOf(testHp); BO.vp = Math.min(3, BO.phase) + (BO.phase === 4 ? 1 : 0);
        if (BO.phase >= 3) BO.d1 = ty === 3 ? 1 : 0;
      }
      setFs(S_INTRO, BO.il);
      bossPos();
      if (testHp > 0 && testHp < 100 && BO.phase > 1) phaseLook();
      tag(); ui(); sfx('boss');
      live.textContent = 'Uwaga, boss: ' + BN[ty] + '. Faza 1 z 3.';
    }
    function clearStack() { for (var j = 0; j < NSK; j++) { STK[j] = 0; STT[j] = 0; } }
    function atkClear() {
      BO.bm = 0; BO.jOn = 0; BO.wl = 0; BO.mtx = -1; BO.lockHp = 0; BO.echo = 0; BO.panic = 0; BO.sub = 0; BO.fired = 0;
      BP[0].ov = BP[1].ov = 0;
    }
    // pierwsze ataki nowej fazy: boss pokazuje to, czego jeszcze nie było (potem już losowo)
    function queueNew(ph) {   // nowe ataki fazy dopisywane do kolejki (niepokazane z poprzedniej fazy zostają, jeśli wolno ich użyć)
      var b = BO, j, k, n = 0;
      for (k = 0; k < b.fqN; k++) if (!(b.type === 3 && ph === 4)) b.fq[n++] = b.fq[k];
      b.fqN = n;
      for (j = 0; j < ATK.length && b.fqN < 6; j++) if (ATK[j][2] === b.type && ATK[j][3] === ph) b.fq[b.fqN++] = j;
    }
    function teleLen(j) {
      var d = TELE[BO.phase - 1] * (sudo ? SUDO_T : 1);
      if (j === A_JMP) d *= 1.5; else if (j === A_LCK || j === A_TND) d *= 1.4; else if (j === A_DER || j === A_OOM || j === A_SWP || j === A_STK) d *= 1.25;
      else if (j === A_PNC) d = Math.max(0.8, d * 1.8); else if (j === A_COR) d = 1.7; else if (j === A_HEL) d = 1.0;
      return d;
    }
    // ważone losowanie następnego ataku: faza + pozycja gracza (róg, pod bossem), bez powtórki tego samego ataku
    function pickAttack() {
      var b = BO, ph = b.phase, ty = b.type, j, k, A, w, sum = 0, r, q = nearP(),
        cor = ship.x < W * 0.22 || ship.x > W * 0.78, und = Math.abs(ship.x - q.x) < q.w * 0.3,
        busy = prN > SWEEP_FREE;   // 7.10 (testerzy: laser po ścianie/spirali = nie do ominięcia): ataki zamiatające pole czekają, aż pociski zejdą
      for (j = 0; j < ATK.length; j++) {
        A = ATK[j]; w = 0;
        if (A[2] === ty && j !== b.last) {
          if (ph === 4) { if (A[3] === 4 || (ty !== 3 && A[3] <= 3)) w = A[4] + (cor ? A[5] : 0) + (und ? A[6] : 0); }
          else if (A[3] <= ph) w = A[4] + (cor ? A[5] : 0) + (und ? A[6] : 0);
        }
        if (busy && sweeping(j)) w = 0;
        AW[j] = w; sum += w;
      }
      if (b.fqN > 0 && busy && sweeping(b.fq[0])) { setFs(S_IDLE, 0.3); return; }
      if (b.fqN > 0) { j = b.fq[0]; for (k = 1; k < b.fqN; k++) b.fq[k - 1] = b.fq[k]; b.fqN--; startTele(j); return; }
      if (sum <= 0) { setFs(S_IDLE, 0.3); b.last = -1; return; }
      r = Math.random() * sum;
      for (j = 0; j < ATK.length - 1; j++) { if (AW[j] > 0 && (r -= AW[j]) < 0) break; }
      while (AW[j] <= 0) j--;
      startTele(j);
    }
    function sweeping(j) { return j === A_DER || j === A_SWE || j === A_GC || j === A_ERC || j === A_TND; }
    function startTele(j) {
      var b = BO, p = BP[0], n, sl, k, jj, a, s, top;
      b.atk = j; b.last = j; b.tx = ship.x; b.ty = ship.y; b.tm = 0; b.k = 0; b.fired = 0;
      b.vk = (sudo ? SUDO_V : 1) * PHASE_V[b.phase - 1] * (b.n === 2 && alive() === 1 ? 1.3 : 1);
      if (j === A_DER) {
        eye(p, 0); s = Math.abs(ship.x - p.x) < 8 ? (Math.random() < 0.5 ? -1 : 1) : ship.x > p.x ? 1 : -1;
        b.sd = s; b.a0 = Math.atan2(36 * bs, (s > 0 ? W : 0) - EX); b.a1 = Math.PI / 2 + s * 0.13;
      } else if (j === A_WALL) { b.gw = Math.max(84 * s0, 72); b.gx = rnd(b.gw, W - b.gw); }
      else if (j === A_DMP || j === A_EML) {
        n = j === A_EML ? 4 : clamp(3 + Math.floor(b.g * 4) + (b.phase >= 3 ? 1 : 0), 3, 7); sl = W / n; RN = n;
        for (jj = 0; jj < n; jj++) { k = eligible[(Math.random() * eligN) | 0]; RK[jj] = k; RX[jj] = clamp(sl * jj + rnd(0, sl) - spr[k].w / 2, 2, W - spr[k].w - 2); }
      } else if (j === A_GC) {
        top = p.y + p.h * 0.55; b.sd = ship.x < W / 2 ? -1 : 1; b.gw = Math.max(96 * s0, 84); b.gy = rnd(Math.max(top + b.gw * 0.7, H * 0.4), H - b.gw * 0.7);
      } else if (j === A_SWE || j === A_ERC || j === A_DSY) b.sd = Math.random() < 0.5 ? 1 : -1;
      else if (j === A_CRS) { b.gw = Math.max(104 * s0, 92); b.a0 = Math.asin(clamp((ship.x - W / 2) / (W * 0.32), -1, 1)); }
      else if (j === A_LCK) {
        a = rnd(-0.05, 0.05); b.lx[0] = W * (0.2 + a); b.lx[1] = W * (0.5 + a); b.lx[2] = W * (0.8 + a);
        top = Math.max(BP[0].y + BP[0].h * 0.5, BP[1].y + BP[1].h * 0.5); b.ly[0] = top + (H - top) * 0.32; b.ly[1] = top + (H - top) * 0.7;
      } else if (j === A_MTX) b.mtx = !BP[0].alive ? 1 : !BP[1].alive ? 0 : (Math.random() < 0.5 ? 0 : 1);
      else if (j === A_TND) b.ly[0] = ship.y;
      else if (j === A_STK) {
        for (jj = 0; jj < 8; jj++) { k = (Math.random() * NSK) | 0; if (STK[k] >= 2 && Math.random() < 0.7) k = (k + 3) % NSK; RK[jj] = k; }
        RN = 8;
      } else if (j === A_COR) { b.sub = 1; b.laneW = Math.max(70, 64 * s0); b.lane = rnd(b.laneW, W - b.laneW); sfx('boss'); }
      setFs(S_TELE, teleLen(j)); sfx('tele');
    }
    function teleUpd() {
      var b = BO, j = b.atk, f = b.ft / b.fd;
      if ((j === A_ARR || j === A_ENP || j === A_JMP || j === A_PNC) && f < 0.65) { b.tx = ship.x; b.ty = ship.y; }
      if (j === A_TND && f < 0.7) b.ly[0] = ship.y;
      if (j === A_SWE || j === A_ERC || j === A_DSY) { if (f < 0.3) b.ty = ship.y; }
      if (j === A_COR) b.sub = b.ft < 1.2 ? 1 : 2;
    }
    function arrow(p, da, tx, ty) {
      var y0 = p.y + ORY[BO.type] * p.h, a = Math.atan2(ty - y0, tx - p.x) + da, v = ARROW_V * hsc() * BO.vk * BO.fast;
      proj(p.x + Math.cos(a) * 8, y0 + Math.sin(a) * 8, Math.cos(a) * v, Math.sin(a) * v, 0, 6 * s0);
    }
    function sweep(side, ty, rows) {
      var r, j, v = SWEEP_V * BO.vk * clamp(W / 700, 0.8, 1.3);
      for (r = 0; r < rows; r++)
        for (j = 0; j < 6; j++) proj(side > 0 ? -12 - j * 50 : W + 12 + j * 50, clamp(ty - r * 46 * s0, 20, H - 20), side * v, 0, 1, 7 * s0);
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
    function ring(x, y, n, a0, v, g) { for (var j = 0; j < n; j++) { var a = a0 + j * 6.2832 / n; proj(x, y, Math.cos(a) * v, Math.sin(a) * v, g, (g === 2 ? 7 : 5) * s0); } }
    function atkStart() {
      var b = BO, j = b.atk, p = BP[0], hs = hsc(), k, n, x, a, q, bw;
      b.atC[j]++; b.tm = 0; b.k = 0; b.fired = 0;
      if (j === A_DER) { b.bm = 1; b.bmA = b.a0; b.bmHW = (7 + 2 * Math.min(3, b.phase)) * s0; }
      else if (j === A_DNG) {
        eye(p, 0); n = b.phase >= 3 ? 5 : 4;
        for (k = 0; k < n; k++) { a = Math.PI * (0.15 + 0.7 * k / (n - 1)); q = proj(EX, EY, Math.cos(a) * 190, Math.sin(a) * 190, 3, 5 * s0); if (q) q.a = a; }
      } else if (j === A_WALL) {
        bw = pj[4].w;
        for (x = bw / 2; x < W + bw / 2; x += bw) if (Math.abs(x - b.gx) > b.gw / 2 + bw / 2) proj(x, -12, 0, 150 * hs * b.vk, 4, 0);
      } else if (j === A_JMP) { b.jOn = 1; b.jx = clamp(b.tx, p.w * 0.4, W - p.w * 0.4); b.jy = -p.h; b.sub = 0; }
      else if (j === A_DMP || j === A_EML) {
        for (k = 0; k < RN; k++) lineAt(RX[k], RK[k], speed() * (j === A_DMP ? 1.35 : 1.05) * b.vk, -lh);
        if (j === A_DMP) {   // Memory Leak: przy zrzucie wyrzuca też pierścień komórek i trzy celowane
          ring(p.x, p.y, 6 + 2 * b.phase, b.age, 180 * hs * b.vk, 6);
          a = Math.atan2(ship.y - p.y, ship.x - p.x);
          for (k = -2; k <= 2; k++) proj(p.x, p.y, Math.cos(a + k * 0.16) * 300 * hs * b.vk, Math.sin(a + k * 0.18) * 300 * hs * b.vk, 6, 6 * s0);
        }
      }
      else if (j === A_MAL) {
        n = b.phase >= 2 ? 6 : 5;
        for (k = 0; k < n; k++) { a = Math.PI * (0.1 + 0.8 * k / (n - 1)); q = proj(p.x, p.y, Math.cos(a) * 160, Math.sin(a) * 160, 5, 8 * s0); if (q) { q.hp = 4; q.life = mode === 'unik' ? 5 : 6; } }
      } else if (j === A_SPR) {
        n = 11 + 3 * (Math.min(3, b.phase) - 1);
        for (k = 0; k < n; k++) { a = rnd(0.1, Math.PI - 0.1); q = proj(p.x, p.y, Math.cos(a) * 255 * hs * b.vk, Math.sin(a) * 255 * hs * b.vk, 6, 6 * s0); if (q) q.life = 6; }
      } else if (j === A_GC) {
        bw = pj[10].h; x = b.sd > 0 ? -pj[10].w : W + pj[10].w;
        for (a = bw / 2; a < H + bw / 2; a += bw) if (Math.abs(a - b.gy) > b.gw / 2 + bw / 2) proj(x, a, b.sd * W / 1.7 * b.vk, 0, 10, 0);
        if (b.phase >= 3) { b.echo = 0.9; b.echoS = b.sd; b.ty = clamp(b.gy + (Math.random() < 0.5 ? -1 : 1) * rnd(110, 180) * s0, H * 0.4, H - b.gw * 0.7); }   // od fazy 3 drugi przejazd GC, luka w nowym miejscu (zaznaczona)
      } else if (j === A_SWE || j === A_ERC) { sweep(b.sd, b.ty, b.phase >= 2 ? 2 : 1); if (b.phase === 4 || j === A_ERC) { b.echo = 0.5; b.echoS = -b.sd; } }
      else if (j === A_DSY) { sweep(1, b.ty, 1); sweep(-1, b.ty - 92 * s0, 1); b.echo = 0.5; b.echoS = b.sd; }
      else if (j === A_LCK) { b.lockHp = 10; }
      else if (j === A_PNC) { if (!reduced) b.panic = 1; }
      else if (j === A_COR) { b.sub = 0; curtain(); }
      else if (j === A_HEL) { b.hellT = 0; }
      if (j === A_ARR && b.phase === 4) { b.echo = 0.55; b.echoS = 0; }
      if (b.type === 2 && b.phase === 4 && !b.echo) { b.echo = 0.6; b.echoS = b.sd; }   // desync: każdy atak ma echo
      b.echoA = j;
      setFs(S_ATK, ATK[j][7]);
    }
    // co dzieje się w trakcie ataku (emisje rozłożone w czasie, promień, ściany, przyciąganie)
    function atkUpd(dt) {
      var b = BO, j = b.atk, p = BP[0], hs = hsc(), tm = (b.tm += dt), k, a, x, q, f, n, pp, y, v;
      if (j === A_ARR || j === A_ENP) {
        n = j === A_ENP || b.phase >= 2 ? 2 : 3;
        if (b.fired < n && tm >= b.fired * (n === 3 ? 0.25 : 0.4)) {
          x = b.fired ? ship.x : b.tx; y = b.fired ? ship.y : b.ty;
          if (n === 3) arrow(p, 0, x, y); else { arrow(p, -0.3, x, y); arrow(p, 0, x, y); arrow(p, 0.3, x, y); }
          b.fired++;
        }
      } else if (j === A_DER) {
        f = clamp(tm / 1.25, 0, 1); f = f * f * (3 - 2 * f); b.bmA = b.a0 + (b.a1 - b.a0) * f; if (tm > 1.25) b.bm = 0;
      } else if (j === A_JMP) {
        y = H - p.h * 0.42;
        if (tm < 0.35) { f = tm / 0.35; b.jy = -p.h + (y + p.h) * f * f; }
        else if (b.sub === 0) {
          b.sub = 1; b.jy = y; if (!reduced) shake = 0.25; hitstop = 0.05;
          for (k = -1; k <= 1; k += 2) { q = proj(b.jx + k * p.w * 0.3, H - 10 * s0, k * 330 * b.vk, 0, 7, 0); }
          burst(b.jx, H - 8, 18, 260); sfx('bomb');
        } else if (tm > 0.8) { f = clamp((tm - 0.8) / 0.7, 0, 1); f = f * f * (3 - 2 * f); b.jy = y + (p.hy - y) * f; b.jx += (p.hx - b.jx) * f; if (f >= 1) b.jOn = 0; }
      } else if (j === A_SPI) {
        if (tm >= b.fired * 0.09) { eye(p, 0); a = b.fired * 0.42; v = 150 * hs * Math.min(b.vk, 1.15);   // 7.10: rzadsza i wolniejsza spirala (gracze: „nie ma czasu uciec”)
        proj(EX, EY, Math.cos(a) * v, Math.sin(a) * v, 2, 7 * s0); proj(EX, EY, -Math.cos(a) * v, -Math.sin(a) * v, 2, 7 * s0); b.fired++; }
      } else if (j === A_SWP) {
        if (tm >= b.fired * 0.5) { ring(p.x, p.y, 10, b.fired * 0.4, 130 * hs * b.vk, 6); b.fired++; }
      } else if (j === A_OOM) {
        f = tm < 1 ? tm : tm > 3.8 ? Math.max(0, (4.6 - tm) / 0.8) : 1; f = clamp(f, 0, 1); b.wl = W * 0.27 * f * f * (3 - 2 * f);
        if (tm >= 0.9 + b.fired * 0.9 && tm < 3.8) {
          k = eligible[(Math.random() * eligN) | 0]; x = rnd(b.wl + 4, Math.max(b.wl + 4, W - b.wl - spr[k].w - 4));
          if (spr[k].w < W - 2 * b.wl - 8) lineAt(x, k, speed() * 1.5, -lh);
          ring(p.x, p.y, 10, b.fired, 140 * hs * b.vk, 6); b.fired++;
        }
      } else if (j === A_CRS) {
        if (tm >= b.fired * 0.3 && tm < 2.2) {
          b.gx = W / 2 + Math.sin(b.a0 + tm * 0.9) * W * 0.32;   // luka jedzie wolniej niż statek y = Math.max(BP[0].y, BP[1].y) + BP[0].h * 0.45; x = (b.fired & 1 ? 20 : 0) * s0 + 10 * s0;
          for (; x < W; x += 40 * s0) if (Math.abs(x - b.gx) > b.gw / 2) proj(x, y, 0, 240 * hs * b.vk, 8, 5 * s0);
          BP[b.fired & 1].mz = 0.12; if (BO.n === 2 && !BP[b.fired & 1].alive) BP[(b.fired & 1) ^ 1].mz = 0.12;
          b.fired++;
        }
      } else if (j === A_LCK) {
        if (tm >= 0.6 + b.fired * 0.85) { for (k = 0; k < 2; k++) if (BP[k].alive) arrow(BP[k], 0, ship.x, ship.y); b.fired++; }
      } else if (j === A_MTX) {
        if ((b.mtT += dt) >= 1.5) { b.mtT = 0; if (alive() === 2) b.mtx ^= 1; else b.mtx = b.mtx < 0 ? (BP[0].alive ? 0 : 1) : -1; sfx('tele'); }
        if (tm >= 0.3 + b.fired * 0.55) { pp = BP[b.fired & 1].alive ? BP[b.fired & 1] : BP[(b.fired & 1) ^ 1]; eye(pp, pp === BP[1] ? 1 : 0); a = Math.atan2(ship.y - EY, ship.x - EX); v = 260 * hs * b.vk; proj(EX, EY, Math.cos(a) * v, Math.sin(a) * v, 1, 7 * s0); pp.mz = 0.12; b.fired++; }
      } else if (j === A_TND) {
        for (k = 0; k < 2; k++) {
          pp = alive() === 2 ? BP[k] : (k ? null : BP[0].alive ? BP[0] : BP[1]);
          if (!pp) continue;
          f = tm - k * 1.0;
          if (k === 1 && f < -0.5 + dt && f >= -0.5) b.ly[1] = ship.y;
          if (f < -0.5) b.ly[1] = ship.y;
          y = clamp(b.ly[k], H * 0.36, H - pp.h * 0.4);
          x = pp.side > 0 ? pp.w * 0.5 + 4 : W - pp.w * 0.5 - 4;
          if (f < 0 || f > 1.2) { pp.ov = 0; continue; }
          pp.ov = 1;
          if (f < 0.25) { a = f / 0.25; pp.ox = pp.hx + (x - pp.hx) * a; pp.oy = pp.hy + (y - pp.hy) * a; }
          else if (f < 0.75) { a = (f - 0.25) / 0.5; a = a * a; pp.ox = x + (W - 2 * x) * a; pp.oy = y; if (f > 0.3 && f < 0.32) sfx('tele'); }
          else { a = (f - 0.75) / 0.45; pp.ox = W - x + (pp.hx - (W - x)) * a; pp.oy = y + (pp.hy - y) * a; }
        }
      } else if (j === A_RNG) {
        if (tm >= b.fired * 0.3 && tm < 2.3) { eye(p, 0); ring(EX, EY, 14, b.fired * 0.22, 150 * hs * b.vk, 8); b.fired++; }
      } else if (j === A_STK) {
        if (b.fired < RN && tm >= b.fired * 0.18) { x = (RK[b.fired] + 0.5) * W / NSK; q = proj(x, -14, 0, 300 * hs * b.vk, 9, 0); if (q) q.k = RK[b.fired]; b.fired++; }
      } else if (j === A_PNC) {
        if (tm >= 0.15 + b.fired * 0.32 && tm < 1.6) { arrow(p, 0, ship.x, ship.y); b.fired++; }
      } else if (j === A_HEL) {
        b.hellT = tm;
        if (tm >= b.fired * 0.1 && tm < HELL_S - 1) {
          eye(p, 0); v = 135 * hs * b.vk; a = tm * 1.3;
          for (k = 0; k < 2; k++) { proj(EX, EY, Math.cos(a + k * 3.1416) * v, Math.sin(a + k * 3.1416) * v, 8, 5 * s0); proj(EX, EY, Math.cos(-a * 0.8 + k * 3.1416 + 1.57) * v * 0.85, Math.sin(-a * 0.8 + k * 3.1416 + 1.57) * v * 0.85, 2, 6 * s0); }
          if (b.fired % 10 === 5) arrow(p, 0, ship.x, ship.y);
          b.fired++;
        }
      }
    }
    function atkEnd() {
      var b = BO, j = b.atk;
      b.bm = 0; b.wl = 0; b.mtx = -1; b.panic = 0; b.lockHp = 0; b.sub = 0; BP[0].ov = BP[1].ov = 0;
      if (b.jOn) { b.jOn = 0; }
      if (j === A_HEL && BO.st === 2) { floater(ship.x, ship.y - 34 * s0, 'przetrwane'); bossKill(); return true; }
      return false;
    }
    function echoFire() {
      var b = BO, j = b.echoA;
      if (j === A_ARR) { arrow(BP[0], -0.3, ship.x, ship.y); arrow(BP[0], 0.3, ship.x, ship.y); }
      else if (j === A_SWE || j === A_ERC || j === A_DSY) sweep(b.echoS || 1, ship.y, 1);
      else if (j === A_GC) { b.gy = b.ty; var bw = pj[10].h, y; for (y = bw / 2; y < H + bw / 2; y += bw) if (Math.abs(y - b.gy) > b.gw / 2 + bw / 2) proj(b.echoS > 0 ? -pj[10].w : W + pj[10].w, y, b.echoS * W / 1.7 * b.vk, 0, 10, 0); }
      if (b.type === 2 && b.phase === 4 && j !== A_DSY && j !== A_SWE) sweep(Math.random() < 0.5 ? 1 : -1, ship.y, 1);
    }
    function stagger() {
      var b = BO;
      setFs(S_STAG, STAG_S); b.stg++; hitstop = HITSTOP; if (!reduced) shake = 0.15;
      floater(BP[0].x, BP[0].y + BP[0].h * 0.6, 'stagger ×2'); sfx('bhit'); addCombo();
    }
    function lockBreak() {
      var b = BO;
      floater(b.lx[1], (b.ly[0] + b.ly[1]) / 2, 'deadlock zerwany'); burst(b.lx[1], (b.ly[0] + b.ly[1]) / 2, 30, 300);
      atkEnd(); b.cnt = 0; setFs(S_VULN, VULN_S[b.phase - 1]); addCombo();
    }
    // maszyna stanów: INTRO → IDLE → TELEGRAPH → ATTACK → RECOVER → (VULNERABLE | STAGGER) → … → PHASE_SHIFT → … → DESPERATION → DEATH
    function fsm(dt) {
      var b = BO, k, ex;
      b.ft += dt;
      if (b.fs === S_IDLE) { if (b.ft >= b.fd) pickAttack(); }
      else if (b.fs === S_TELE) { teleUpd(); if (b.ft >= b.fd) atkStart(); }
      else if (b.fs === S_ATK) { atkUpd(dt); if (b.fs === S_ATK && b.ft >= b.fd) { if (atkEnd()) return; b.cnt++; setFs(S_REC, REC_S); } }
      else if (b.fs === S_REC) {
        if (b.ft >= b.fd) {
          if (b.cnt >= VULN_N[b.phase - 1] && !(b.type === 3 && b.phase === 4)) { b.cnt = 0; setFs(S_VULN, VULN_S[b.phase - 1]); sfx('tele'); }
          else setFs(S_IDLE, IDLE_S[b.phase - 1] * (sudo ? SUDO_T : 1));
        }
      } else if (b.fs === S_VULN || b.fs === S_STAG) { if (b.ft >= b.fd) { if (b.pend) { b.pend = 0; phaseShift(b.phase + 1); } else setFs(S_IDLE, IDLE_S[b.phase - 1]); } }
      else if (b.fs === S_SHIFT || b.fs === S_DESP) {
        if (b.ft >= b.fd * 0.5 && b.vp !== Math.min(3, b.phase) + (b.phase === 4 ? 1 : 0)) phaseLook();
        if (b.ft >= b.fd) setFs(S_IDLE, 0.35);
      }
      ex = b.fs === S_VULN || b.fs === S_STAG || (b.type === 3 && b.phase === 4);
      for (k = 0; k < 2; k++) BP[k].ex = ex && BP[k].alive;
    }
    // --- efekty: wybuchy, odłamki, glify rozsypane promieniście, odpadające części, iskry trafień ---
    function burst(x, y, n, v) {
      for (var j = 0, a, sp; j < n; j++) { a = Math.random() * 6.283; sp = v * (0.35 + 0.65 * Math.random()); part(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 50, (Math.random() * gN) | 0, j & 1); }
    }
    function shard(x, y, s, col) {
      if (shN >= SHD.length) return;
      var d = SHD[shN++], a = Math.random() * 6.283, v = rnd(80, 300);
      d.x = x; d.y = y; d.vx = Math.cos(a) * v; d.vy = Math.sin(a) * v - 120; d.a = a; d.va = rnd(-9, 9); d.s = s; d.life = rnd(0.7, 1.2); d.c = col;
    }
    // iskry w miejscu trafienia: krótkie, szybkie, w górę (odbite od pancerza)
    function spark(x, y, sh) {
      for (var j = 0, d, a, v; j < (sh ? 2 : 3) && shN < SHD.length; j++) {
        d = SHD[shN++]; a = -Math.PI / 2 + rnd(-1.1, 1.1); v = rnd(160, 340);
        d.x = x; d.y = y; d.vx = Math.cos(a) * v; d.vy = Math.sin(a) * v; d.a = a; d.va = 0; d.s = sh ? 5 : 3.5; d.life = rnd(0.12, 0.24); d.c = sh ? C.muted : j ? C.hot : C.bone;
      }
    }
    function boom(x, y, r) {
      if (exN < EXP.length) { var e = EXP[exN++]; e.x = x; e.y = y; e.r = r; e.life = e.max = rnd(0.35, 0.55); }
      burst(x, y, 12, 260);
      shard(x, y, r * 0.35, C.plate); shard(x, y, r * 0.25, C.solid);
    }
    function detach(pt, p, X, Y, a0, m) {
      for (var j = 0, d; j < DTP.length; j++) if (DTP[j].life <= 0) {
        d = DTP[j]; d.pt = pt; d.x = p.x + p.u * X; d.y = p.y + p.u * Y; d.a = a0; d.m = m; d.S = p.u;
        d.vx = (X < 0 ? -1 : 1) * rnd(60, 160); d.vy = -rnd(90, 190); d.va = (X < 0 ? -1 : 1) * rnd(1.5, 4); d.life = 1.8;
        burst(d.x, d.y, 14, 200); shard(d.x, d.y, 10 * p.u, C.plate);
        return;
      }
    }
    // płyty pancerza odpadają przy przejściu fazy
    function plates(p, n) {
      for (var j = 0; j < n; j++) shard(p.x + rnd(-0.42, 0.42) * p.w, p.y + rnd(-0.38, 0.38) * p.h, rnd(9, 20) * p.u, j % 3 === 0 ? C.solid : j & 1 ? C.deep : C.plate);
      burst(p.x, p.y, 16, 300);
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
      b.age += dt; b.ph += dt * (b.fs === S_VULN || b.fs === S_STAG ? 0.3 : b.phase === 4 ? 1.5 : 1); b.armT += dt;
      if (b.hit > 0) b.hit -= dt;
      if (b.gT > 0) b.gT -= dt; else if (b.hpG > b.hp) b.hpG = Math.max(b.hp, b.hpG - dt * 70);
      for (k = 0; k < b.n; k++) {
        p = BP[k];
        if (p.hit > 0) p.hit -= dt;
        if (p.fc > 0) p.fc -= dt;
        if (p.mz > 0) p.mz -= dt;
        p.spin += dt * (2.2 + 3.2 * (1 - p.hp / p.max)) * (b.n === 2 && !BP[k ^ 1].alive ? 1.7 : 1) * (b.fs === S_STAG ? 0.2 : 1);
      }
      b.sag += ((b.fs === S_STAG ? 1 : b.fs === S_VULN ? 0.35 : 0) - b.sag) * Math.min(1, dt * 8);
      b.blk -= dt;
      if ((b.bt -= dt) <= 0) { b.bt = rnd(2.2, 4); if (b.blk < 0) b.blk = 0.22; }
      glitchTick(dt, b.st === 3 || b.fs === S_SHIFT || b.fs === S_DESP);
      if (b.st === 1) {                        // wejście: boss zjeżdża z góry, nic nie atakuje
        b.en = Math.min(1, b.age / (b.il * 0.62));
        bossPos();
        if (b.age >= b.il) { b.st = 2; b.en = 1; queueNew(b.phase); setFs(S_IDLE, 0.5); }
        return;
      }
      bossPos();
      if (b.st === 3) { bossDying(dt); return; }
      fsm(dt);
      if (b.st !== 2) return;
      if (b.echo > 0 && (b.echo -= dt) <= 0) echoFire();
      p = BP[0];
      if (b.type === 1) {                       // Memory Leak: rośnie, gubi komórki, kapie kodem
        b.g = Math.min(1, b.g + dt / 38 * (b.fs === S_VULN ? -1.5 : 1)); if (b.g < 0) b.g = 0;
        sw = 1 + 0.1 * b.g;
        j = Math.floor((1 - b.hp / 100) * BA.n * 0.5);
        while (b.cb < j) {
          k = 0; while (k < BA.n - 1 && BA.br[k] !== b.cb) k++;
          X = p.x + BA.cx[k] * sw * p.u; Y = p.y + BA.cy[k] * sw * p.u;
          shard(X, Y, 15 * p.u, b.cb & 1 ? C.solid : C.plate); burst(X, Y, 5, 120);
          b.cb++;
        }
        if ((b.dr -= dt) <= 0) { b.dr = 0.2 - 0.1 * b.g; k = BA.fo[(Math.random() * Math.min(12, BA.n)) | 0]; part(p.x + BA.cx[k] * sw * p.u, p.y + (BA.cy[k] + 8) * sw * p.u, rnd(-12, 12), rnd(10, 50), (Math.random() * gN) | 0, 1); }
      } else if (b.type === 3 && b.phase >= 3 && (b.dr -= dt) <= 0) {   // Segfault Prime w fazie 3 rozpada się na znaki
        b.dr = b.phase === 4 ? 0.03 : 0.06;
        part(p.x + rnd(-0.4, 0.4) * p.w, p.y + rnd(-0.35, 0.4) * p.h, rnd(-40, 40), rnd(-90, -10), (Math.random() * gN) | 0, Math.random() < 0.5 ? 1 : 0);
      }
      // zderzenie z korpusem (null jump w telegrafie: boss jest tylko konturem i nie zabija)
      if (state === 'play' && !(b.atk === A_JMP && b.fs === S_TELE)) for (k = 0; k < b.n; k++) {
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
            for (var j = 0; j < 12; j++) shard(p.x + rnd(-0.3, 0.3) * p.w, p.y + rnd(-0.3, 0.3) * p.h, rnd(6, 16) * p.u, j & 1 ? C.solid : C.plate);
          }
          if (!reduced) { flash = FLASH; shake = 0.3; }
          sfx('win');
        }
      }
      if (b.dt <= 0) bossWin();
    }
    // nowy wygląd w połowie przejścia fazy: odpadają części, akcent jaśnieje, w desperacji odsłonięty rdzeń
    function phaseLook() {
      var b = BO, p = BP[0], ph = b.phase;
      b.vp = Math.min(3, ph) + (ph === 4 ? 1 : 0); b.armT = 0;
      if (b.type === 0) {
        if (ph >= 3 && !b.d1) { b.d1 = 1; detach(BA.p1, p, -96, -32, Math.PI, 1); }
        if (ph >= 4 && !b.d2) { b.d2 = 1; b.d3 = 1; detach(BA.p1, p, 96, -32, 0, 1); }
      } else if (b.type === 1) { if (ph >= 4 && !b.d1) { b.d1 = 1; detach(BA.p2, p, 0, -76, 0, 1); } }
      else if (b.type === 2) {
        if (ph >= 4 && !b.d1) { b.d1 = 1; for (var k = 0; k < 2; k++) if (BP[k].alive) detach(BA.p1, BP[k], k ? -50 : 50, 30, k ? Math.PI : 0, 1); }
      } else {
        if (ph >= 3 && !b.d1) { b.d1 = 1; detach(BA.p1, p, 0, -80, 0, 1); }
        if (ph >= 4 && !b.d2) { b.d2 = 1; detach(BA.p3, p, 124, -6, 0.95, 1); detach(BA.p3, p, -124, -6, Math.PI - 0.95, 1); }
      }
    }
    var PHB = [['faza 2: refactor', 'faza 3: hotfix', 'desperacja: spirala *'], ['faza 2: refactor', 'faza 3: hotfix', 'desperacja: OOM'],
      ['faza 2: refactor', 'faza 3: hotfix', 'desperacja: desync'], ['faza 2: refactor', 'faza 3: core dump', 'desperacja: bullet hell']];
    function phaseShift(np) {
      var b = BO, k;
      atkClear(); b.phase = np; b.cnt = 0; b.last = -1; b.atk = -1; prN = 0; clearStack(); queueNew(np);
      for (k = obN - 1; k >= 0; k--) shatter(OB[k]);
      obN = 0;
      setFs(np === 4 ? S_DESP : S_SHIFT, np === 4 ? DESP_S : SHIFT_S);
      hitstop = HITSTOP; if (!reduced) shake = 0.25;
      for (k = 0; k < b.n; k++) if (BP[k].alive) { plates(BP[k], np === 4 ? 16 : 10); BP[k].hit = 0.08; }
      showBanner(PHB[b.type][np - 2]);
      live.textContent = BN[b.type] + (np === 4 ? ': desperacja.' : ': faza ' + np + ' z 3.');
      sfx('boss');
    }
    function bossDeal(p, u, sx, sy) {
      var b = BO, m, np, th, d, q;
      if (b.st !== 2 || !p.alive || u <= 0) return;
      if (b.fs === S_SHIFT || b.fs === S_DESP || b.fs === S_INTRO || (b.atk === A_JMP && b.fs === S_TELE)) { if (sx) spark(sx, sy, true); return; }
      if (b.mtx >= 0 && p === BP[b.mtx]) { if (sx) spark(sx, sy, true); return; }   // tarcza mutexu: ta połówka nie przyjmuje obrażeń
      m = b.fs === S_VULN ? DMG_EX : b.fs === S_STAG ? DMG_ST : ARMOR;
      p.hp -= u * m;
      b.hit = 0.045; sfx('bhit');
      if (sx) spark(sx, sy, false);
      if (p.fc <= 0 || u > 5) { p.hit = 0.06; p.fc = 0.28; }   // biały błysk i drżenie najwyżej co 0,28 s (bomba zawsze)
      if (b.gT <= 0) b.gT = 0.3;
      if (b.blk < -0.5) b.blk = 0.22;
      b.chip += u * m;
      while (b.chip >= 5) { b.chip -= 5; shard(p.x + rnd(-0.4, 0.4) * p.w, p.y + rnd(-0.3, 0.35) * p.h, rnd(6, 11) * p.u, Math.random() < 0.5 ? C.deep : C.plate); }   // odprysk pancerza co 5% życia
      if (p.hp <= 0) {
        p.hp = 0;
        if (b.type === 2 && BP[0].alive && BP[1].alive) {   // jedna połówka pada i odpada, druga przyspiesza
          p.alive = false; p.ov = 0;
          floater(p.x, p.y + p.h / 2, 'druga przyspiesza');
          detach(p === BP[0] ? BA.h : BA.h2, p, p === BP[0] ? -1 : 1, 0, 0, 1);
          detach(BA.p1, p, p === BP[0] ? 50 : -50, 30, p === BP[0] ? 0 : Math.PI, 1);
          boom(p.x, p.y, 40 * p.u);
          if (b.mtx >= 0) b.mtx = -1;
        }
      }
      b.hp = BP[0].hp + (b.n === 2 ? BP[1].hp : 0);
      np = phaseOf(b.hp);
      if (np > b.phase && b.hp > 0.001) {
        th = THR[b.phase - 1];
        if (b.hp < th) { d = th - b.hp; q = p.alive ? p : BP[p === BP[0] ? 1 : 0]; q.hp += d; b.hp = BP[0].hp + (b.n === 2 ? BP[1].hp : 0); }
        if (b.fs === S_STAG) b.pend = 1; else phaseShift(b.phase + 1);   // stagger dogrywa się do końca, potem przejście fazy
      }
      tag();
      if (b.hp <= 0.001) bossKill();
    }
    function bossBomb() {
      var b = BO, d = BOMB_DMG[mode === 'unik' ? 1 : 0] * (1 + 0.5 * up.power), k, n = alive(), p;
      if (b.st !== 2 || b.fs === S_INTRO || b.fs === S_SHIFT || b.fs === S_DESP) return;
      if (b.atk === A_COR && b.fs === S_TELE) {   // parowanie „core dump” bombą
        floater(ship.x, ship.y - 30 * s0, 'parry'); b.atC[A_COR]++; atkClear();   // sparowany core dump liczy się jako wykonany (to jego mechanika)
        b.cnt = 0; stagger(); bossDeal(BP[0], d);
        return;
      }
      // 7.10 (feedback maisy): bomba przerywa też trwający atak bossa — promienie (dereferencja), ściany, pasy, przyciąganie,
      // a w telegrafie anuluje atak, zanim wystrzeli. Wyjątki: zamek deadlocku (ma własną reakcję) i bullet hell (do przetrwania).
      if ((b.fs === S_ATK || b.fs === S_TELE) && b.atk !== A_LCK && b.atk !== A_HEL) {
        floater(ship.x, ship.y - 30 * s0, 'przerwane'); atkClear(); b.cnt++; setFs(S_REC, REC_S);
      }
      if (b.atk === A_LCK && b.fs === S_ATK) lockBreak();
      else if (b.fs === S_VULN) stagger();
      for (k = 0; k < b.n; k++) { p = BP[k]; if (p.alive) bossDeal(p, d / n); if (b.st !== 2 || b.fs === S_SHIFT || b.fs === S_DESP) break; }
    }
    function bossKill() {
      var k, p = BP[0], b = BO;
      b.st = 3; b.dt = DEATH_S; b.et = 0; prN = 0; b.fT = b.age - b.il; atkClear(); clearStack(); setFs(S_DEATH, DEATH_S);   // fT: czas walki od końca wejścia do śmierci
      // części odpadają od razu
      if (b.type === 0) { if (!b.d2) { b.d2 = 1; detach(BA.p1, p, 96, -32, 0, 1); } if (!b.d1) { b.d1 = 1; detach(BA.p1, p, -96, -32, Math.PI, 1); } }
      else if (b.type === 1) { detach(BA.p1, p, -114, 0, 0, 1); detach(BA.p1, p, 114, 0, 0, -1); }
      else if (b.type === 2) { p = BP[0].alive ? BP[0] : BP[1]; if (!b.d1) detach(BA.p1, p, p === BP[0] ? 50 : -50, 30, p === BP[0] ? 0 : Math.PI, 1); }
      else { if (!b.d2) { detach(BA.p3, p, 124, -6, 0.95, 1); detach(BA.p3, p, -124, -6, Math.PI - 0.95, 1); } if (!b.d1) { b.d1 = 1; detach(BA.p1, p, 0, -80, 0, 1); } }
      for (k = obN - 1; k >= 0; k--) shatter(OB[k]);
      obN = 0; sfx('boss'); tag();
    }
    // ocena walki: czas względem „par”, trafienia w statek (tarcza / tryb testowy), wykorzystane staggery
    function grade() {
      var b = BO, d = b.fT, sc = 100 - Math.max(0, d - PAR[b.type]) * 1.2 - b.hits * 20 + b.stg * 8;
      return sc >= 90 ? 3 : sc >= 70 ? 2 : sc >= 45 ? 1 : 0;
    }
    function bossWin() {
      var bonus = 500 * (BO.tier + 1), g = grade(), k = KEYP + 'ocena.' + BO.type, bg = load(k), rb, tt;
      score += bonus; bombs = Math.min(5, bombs + 1);
      earned[BO.type] = 1; lastBoss = BO.type;
      stopLoop(); go('merge'); diedBoss = false;
      gradeLast = g;
      if (g + 1 > bg) save(k, g + 1);
      if (BO.type === 3 && !sudo) save(KEYP + 'sudo', 1);
      ovMerge.querySelector('canvas').setAttribute('data-i', 'b' + (BO.type + 1));
      q('.dcg-cm').textContent = 'merge: ' + BN[BO.type];
      q('.dcg-mb').textContent = '+' + bonus + ' punktów';
      q('.dcg-gr').textContent = GRADES[g];
      q('.dcg-gd').textContent = 'ocena · czas ' + Math.round(BO.age - BO.il) + ' s · trafienia ' + BO.hits + ' · stagger ' + BO.stg + (bg ? ' · najlepsza ' + GRADES[Math.max(bg - 1, g)] : '');
      rushN = rush ? rushN + 1 : 0;
      tt = q('.dcg-rt');
      if (rush && rushN >= 4) {
        rb = load(KEYP + 'rush.' + mode);
        k = Math.round(t * 10);
        if (!rb || k < rb) { save(KEYP + 'rush.' + mode, k); rb = k; }
        tt.textContent = 'boss rush: ' + fmtT(k) + ' · rekord ' + fmtT(rb); tt.hidden = false;
      } else tt.hidden = true;
      paintIcons(ovMerge); ui(); draw();
      ovMerge.hidden = false;
      live.textContent = 'Merge: ' + BN[BO.type] + '. Ocena ' + GRADES[g] + '. Plus ' + bonus + ' punktów i jedna bomba.';
      focusIn('[data-a=next]');
    }
    function fmtT(ds) { var m = Math.floor(ds / 600), s2 = (ds % 600) / 10; return m + ':' + (s2 < 10 ? '0' : '') + s2.toFixed(1).replace('.', ','); }
    function pickScreen() {
      var pool = [], k, n, h = '', id, u;
      if (rush && rushN >= 4) { rush = false; rushN = 0; exit(true); return; }
      for (k = 0; k < UKEYS.length; k++) {
        id = UKEYS[k]; u = UPS[id];
        if (u.og && mode !== 'ogien') continue;
        if (up[id] >= u.max || (id === 'shield' && (shieldOn || sudo))) continue;
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
      if (!UPS[id] || up[id] >= UPS[id].max || (id === 'shield' && sudo)) return;
      up[id]++;
      if (id === 'shield') shieldOn = true;
      if (id === 'cache') step = 800;
      if (id === 'graze') { grazeBonus = 25 + 10 * up.graze; grazeTxt = '+' + grazeBonus + ' muśnięcie'; }
    }
    // punkt kontrolny (7.10, prośba maisy): po pokonanym bossie i wyborze ulepszenia zapisujemy stan rundy;
    // na ekranie startowym „Po bossie …” wraca tu (wynik, bomby, ulepszenia), kolejny boss przychodzi szybciej
    var CP_NEXT_S = 12;   // po wznowieniu z punktu kontrolnego kolejny boss po tylu sekundach
    function cpKey() { return KEYP + 'cp.' + mode + (sudo ? '.sudo' : ''); }
    function resumeAfterBoss() {
      ovPick.hidden = ovMerge.hidden = true;
      if (!rush && testTier < 0 && !god) {
        var u = {}, k; for (k in up) u[k] = up[k];
        saveJ(cpKey(), { score: score, bombs: bombs, wave: wave, waveT: waveT, t: t, nb: nextBomb, step: step, up: u, sh: shieldOn, tier: bossTier, nbt: waveT + CP_NEXT_S });
      }
      BO.on = false; BO.st = 0; tag();
      ensureArt(bossTier % 4);
      grace = 1.2; spawnT = 1; invul = 0.8; prN = 0;
      if (rush) { tb = 2; tbTier = bossTier; }   // boss rush: kolejny boss za 2 s
      go('play'); ui();
      try { root.focus({ preventScroll: true }); } catch (e) { root.focus(); }
      startLoop();
    }
    function addCombo() {
      combo++; comboT = COMBO_S;
      comboM = combo >= 15 ? 4 : combo >= 8 ? 3 : combo >= 3 ? 2 : 1;
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
      if (BO.on && BO.st === 2) {
        var px = 0, py = 0, d, lo;
        if (BO.atk === A_SWP && BO.fs === S_ATK) {   // swap: rdzeń przyciąga statek (do ucieczki: ok. 42% prędkości statku)
          px = BP[0].x - ship.x; py = BP[0].y - ship.y; d = Math.sqrt(px * px + py * py) || 1;
          px = px / d * sp * 0.52 * BO.vk * dt; py = py / d * sp * 0.52 * BO.vk * dt;
        }
        if (BO.wl > 0) {   // OOM: ściany spychają statek do środka
          lo = BO.wl + 9 * s0;
          if (ship.x + px < lo) px = lo - ship.x; else if (ship.x + px > W - lo) px = W - lo - ship.x;
        }
        ship.x += px; ship.y += py;
        if (drag.on) { drag.sx += px; drag.sy += py; drag.tx += px; drag.ty += py; }
      }
      clampShip();
      tilt += (clamp(ship.vx / sp, -1, 1) - tilt) * Math.min(1, dt * 12);
      if ((trT += dt) >= 0.03) { trT = 0; trI = (trI + 1) % 5; TRX[trI] = ship.x; TRY[trI] = ship.y; }
    }

    function grazed(boss) {
      score += grazeBonus * comboM; grazeN++; addCombo();
      floater(ship.x, ship.y - 26 * s0, comboM > 1 ? grazeTxt + ' ×' + comboM : grazeTxt); sfx('graze');
      if (boss && mode === 'unik' && BO.on) bmeter += 1 / UNIK_GRAZE;
    }
    // FIXME: krzyż kulek po minięciu statku
    function fixmeBoom(o) {
      var x = o.x + o.w / 2, y = o.y + o.h / 2, v = 210 * clamp(H / 600, 0.75, 1.3), j;
      for (j = 0; j < (wave >= 6 ? 8 : 4); j++) proj(x, y, Math.cos(j * Math.PI / (wave >= 6 ? 4 : 2)) * v, Math.sin(j * Math.PI / (wave >= 6 ? 4 : 2)) * v, 8, 5 * s0);
      burst(x, y, 16, 220); sfx('kill');
    }
    function update(dt) {
      var sd = state === 'dying' ? dt * 0.35 : dt, k, j, o, p, b, f, nw, x0, x1, q;
      if (slowT > 0) { slowT -= dt; sd *= 0.5; }
      if (godCd > 0) godCd -= dt;
      if (comboT > 0 && (comboT -= dt) <= 0) { combo = 0; comboM = 1; }
      if (state === 'play') {
        t += dt; score += dt * 20;
        if (!BO.on) {
          waveT += dt; nw = 1 + Math.floor(waveT / WAVE_S);
          if (nw !== wave) { wave = nw; setBanner(); }
          if (tb > 0 && (tb -= dt) <= 0) { tb = -1; bossTier = tbTier; nextBossT = waveT + BOSS_EVERY * WAVE_S; bossStart(); bossTier++; }
          else if (tb < 0 && !rush && waveT >= nextBossT) { nextBossT = waveT + BOSS_EVERY * WAVE_S; bossStart(); bossTier++; }
        }
        if (score >= nextBomb) {
          nextBomb += step;
          if (bombs < 3) { bombs++; floater(ship.x, ship.y - 34 * s0, '+1 bomba'); ui(); }
        }
        if (BO.on && BO.st === 2 && mode === 'unik') {   // Unik: bomba ładuje się w walce (czas + muśnięcia pocisków bossa)
          bmeter += dt / UNIK_FILL;
          if (bmeter >= 1) { if (bombs < 3) { bmeter -= 1; bombs++; floater(ship.x, ship.y - 34 * s0, '+1 bomba'); ui(); } else bmeter = 1; }
        }
        moveShip(dt);
        if (grace > 0) grace -= dt;
        if (invul > 0) invul -= dt;
        if (eliteCd > 0) eliteCd -= dt;
        if (!BO.on) {   // v4: w walce nie ma losowego deszczu, linijki spadają tylko w atakach, które ich używają
          spawnT -= sd; if (spawnT <= 0 && grace <= 0) { spawn(); spawnT = interval(); }
          if (ELP.k && (ELP.t -= sd) <= 0) eliteGo();
        }
        if (mode === 'ogien') { fireT -= dt; if (fireT <= 0) { fireT = 0.14 / (1 + 0.35 * up.fire); shoot(); } }
      } else if ((dieT -= dt) <= 0) { gameOver(); return; }
      if (banner > 0) banner -= dt;
      if (flash > 0) flash -= dt;
      if (shake > 0) shake -= dt;
      if (shipShake > 0) shipShake -= dt;
      if (BO.on && state !== 'start') bossUpdate(sd);
      if (state === 'merge') return;
      cityW = clamp(cityW + (BO.on && BO.st === 2 ? sd * 0.7 : -sd * 0.5), 0, 1);
      despP = BO.on && BO.st === 2 && BO.phase === 4 && !reduced ? despP + sd : 0;

      var bgk = (reduced ? 0.4 : 1) * (1 + 0.06 * (wave - 1));
      cityOff = (cityOff + 8 * bgk * sd) % cityP;
      for (k = 0; k < clouds.length; k++) {
        o = clouds[k];
        o.y += (o.far ? 20 : 52) * bgk * sd * (o.gl ? 1.6 : 1);
        if (o.y > H + 4) cloud(o, o.far, -o.h - rnd(0, 60));
      }

      var hx1 = ship.x - 6 * s0, hx2 = ship.x + 6 * s0, hy1 = ship.y - 9 * s0, hy2 = ship.y + 9 * s0, gz = (12 + 8 * up.graze) * s0, dx, dy;
      for (k = obN - 1; k >= 0; k--) {
        o = OB[k];
        o.y += o.vy * sd;
        if (o.el === 1) { if ((o.ex < 0 && o.x < o.y1) || (o.ex > 0 && o.x > o.y1)) { o.x += o.vx * sd; if ((o.ex < 0) === (o.x > o.y1)) o.x = o.y1; } }
        else if (o.el === 2 && !o.rv && o.y >= o.y1) { o.rv = 1; o.vy = -Math.abs(o.vy) * 1.25; }
        else if (o.el === 3) {
          if (!o.fz && state === 'play' && o.y > ship.y + 26 * s0) o.fz = 0.35;
          if (o.fz > 0 && (o.fz -= sd) <= 0) { fixmeBoom(o); removeOb(k); continue; }
        }
        if (o.hit > 0) o.hit -= dt;
        if (o.y > H + 2 || (o.rv && o.y < -o.h - 4)) { removeOb(k); continue; }
        if (state !== 'play') continue;
        x0 = o.el === 1 && o.ex < 0 ? 0 : o.x; x1 = o.el === 1 && o.ex > 0 ? W : o.x + o.w;
        dx = x0 > hx2 ? x0 - hx2 : hx1 > x1 ? hx1 - x1 : 0;
        dy = o.y > hy2 ? o.y - hy2 : hy1 > o.y + o.h ? hy1 - o.y - o.h : 0;
        if (dx === 0 && dy === 0) { if (hurt()) break; }
        else if (dy === 0 && dx < gz) { if (!o.near) o.near = 1; }
        else if (o.near === 1) { o.near = 2; grazed(false); }
      }
      // pociski bossów (pula PR): ruch, zachowanie rodzaju, zderzenie (koło albo prostokąt), muśnięcie
      for (k = prN - 1; k >= 0; k--) {
        p = PR[k]; p.t += sd;
        if (p.g === 3) {                        // dangling pointer: rozlot, zawis i celowanie, zryw
          if (p.s === 0) { p.vx *= 1 - Math.min(1, sd * 4); p.vy *= 1 - Math.min(1, sd * 4); if (p.t > 0.45) p.s = 1; }
          else if (p.s === 1) { p.a = Math.atan2(ship.y - p.y, ship.x - p.x); p.rot = p.a; p.vx = p.vy = 0; if (p.t > 0.95 + (k % 5) * 0.08) { p.s = 2; f = 520 * clamp(H / 600, 0.75, 1.3) * BO.vk; p.vx = Math.cos(p.a) * f; p.vy = Math.sin(p.a) * f; } }
        } else if (p.g === 5) {                 // bąbel pamięci: dryfuje do statku i rośnie
          f = Math.atan2(ship.y - p.y, ship.x - p.x); p.vx += (Math.cos(f) * 70 - p.vx) * Math.min(1, sd * 1.5); p.vy += (Math.sin(f) * 70 - p.vy) * Math.min(1, sd * 1.5);
          p.r = Math.min(34, 8 + p.t * 5.5) * s0;
          if (p.t > p.life) {
            if (mode === 'ogien') for (j = 0; j < 8; j++) proj(p.x, p.y, Math.cos(j * 0.785) * 170, Math.sin(j * 0.785) * 170, 6, 6 * s0);
            burst(p.x, p.y, 10, 160); PR[k] = PR[prN - 1]; PR[prN - 1] = p; prN--; continue;
          }
        } else if (p.g === 6 && p.life > 0) {   // komórka sterty: odbija się od ścian
          if (p.x < p.r) p.vx = Math.abs(p.vx); else if (p.x > W - p.r) p.vx = -Math.abs(p.vx);
          if (p.y < p.r) p.vy = Math.abs(p.vy); else if (p.y > H - p.r) p.vy = -Math.abs(p.vy);
          if (p.t > p.life) { PR[k] = PR[prN - 1]; PR[prN - 1] = p; prN--; continue; }
        } else if (p.g === 9) {                 // ramka stosu: spada do swojej kolumny i staje na stosie
          f = H - STK[p.k] * pj[9].h - p.hh;
          if (p.y + p.vy * sd >= f) {
            if (STK[p.k] < 3) { STK[p.k]++; STT[p.k] = 7; } else burst(p.x, f, 8, 140);
            if (!reduced) shake = Math.max(shake, 0.06);
            PR[k] = PR[prN - 1]; PR[prN - 1] = p; prN--; continue;
          }
        }
        p.x += p.vx * sd; p.y += p.vy * sd;
        if (p.x < -120 || p.x > W + 120 || p.y > H + 40 || p.y < -120) { PR[k] = PR[prN - 1]; PR[prN - 1] = p; prN--; continue; }
        if (state !== 'play') continue;
        if (p.hw) { dx = Math.max(0, Math.abs(p.x - ship.x) - p.hw - 6 * s0); dy = Math.max(0, Math.abs(p.y - ship.y) - p.hh - 9 * s0); f = dx === 0 && dy === 0; dx = dx + dy; }
        else { dx = p.x - ship.x; dy = p.y - ship.y; f = Math.sqrt(dx * dx + dy * dy) - p.r - 5.5 * s0; dx = f; f = f < 0; }
        if (f) {
          if (p.g !== 9 && p.g !== 10 && p.g !== 4 && p.g !== 7) { PR[k] = PR[prN - 1]; PR[prN - 1] = p; prN--; }
          if (hurt()) break;
        } else if (dx < gz) { if (!p.near) p.near = 1; }
        else if (p.near === 1) { p.near = 2; grazed(true); }
      }
      // stos: kolumny kruszą się po 7 s; ramki na stosie zabijają
      for (k = 0; k < NSK; k++) if (STK[k]) {
        if ((STT[k] -= sd) <= 0) { burst((k + 0.5) * W / NSK, H - STK[k] * pj[9].h / 2, 12, 160); STK[k] = 0; continue; }
        if (state === 'play' && hy2 > H - STK[k] * pj[9].h && hx2 > k * W / NSK && hx1 < (k + 1) * W / NSK) hurt();
      }
      // promień dereferencji, krata deadlocku
      if (BO.on && BO.st === 2 && state === 'play') {
        b = BO;
        if (b.bm) {
          eye(BP[0], 0); dx = ship.x - EX; dy = ship.y - EY; f = Math.cos(b.bmA) * dx + Math.sin(b.bmA) * dy;
          if (f > 0 && Math.abs(-Math.sin(b.bmA) * dx + Math.cos(b.bmA) * dy) < b.bmHW + 5 * s0) hurt();
        }
        if (b.atk === A_LCK && b.fs === S_ATK && b.lockHp > 0) {
          f = 4 * s0;
          for (j = 0; j < 3; j++) if (Math.abs(ship.x - b.lx[j]) < f + 6 * s0 && ship.y > b.ly[0] - (b.ly[1] - b.ly[0]) * 0.8) hurt();
          for (j = 0; j < 2; j++) if (Math.abs(ship.y - b.ly[j]) < f + 9 * s0) hurt();
        }
      }

      if (state === 'play') {
        var bd = 100 / BO.need;
        for (k = blN - 1; k >= 0; k--) {
          b = BL[k]; b.y -= 760 * dt;
          var gone = b.y < -12;
          for (j = obN - 1; !gone && j >= 0; j--) {
            o = OB[j];
            x0 = o.el === 1 && o.ex < 0 ? 0 : o.x; x1 = o.el === 1 && o.ex > 0 ? W : o.x + o.w;
            if (b.x >= x0 - 1 && b.x <= x1 + 1 && b.y <= o.y + o.h && b.y + 9 >= o.y) {
              gone = true;
              if (o.el === 3) { fixmeBoom(o); removeOb(j); score += 30; }
              else if (--o.hp <= 0) {
                score += (o.hv ? 50 : o.el ? 80 : 10) * comboM; addCombo();
                if (o.hv || o.el) floater(o.x + o.w / 2, o.y, o.el ? '+' + 80 * comboM + ' elita' : '+50 dekompilacja');
                if (o.el) burst(o.x + o.w / 2, o.y, 24, 240); else shatter(o);
                removeOb(j); sfx('kill');
              } else { o.hit = 0.09; sfx('hit'); }
            }
          }
          if (!gone && BO.on && BO.st === 2) {
            for (j = 0; j < prN; j++) {          // bąble malloc da się zestrzelić
              p = PR[j];
              if (p.g !== 5) continue;
              dx = b.x - p.x; dy = b.y - p.y;
              if (dx * dx + dy * dy < p.r * p.r) {
                gone = true; spark(b.x, b.y, false);
                if (--p.hp <= 0) { burst(p.x, p.y, 12, 200); score += 25 * comboM; addCombo(); PR[j] = PR[prN - 1]; PR[prN - 1] = p; prN--; }
                break;
              }
            }
            q = BO;
            if (!gone && q.atk === A_LCK && q.fs === S_ATK && q.lockHp > 0 && Math.abs(b.x - q.lx[1]) < 14 * s0 && Math.abs(b.y - (q.ly[0] + q.ly[1]) / 2) < 16 * s0) {
              gone = true; spark(b.x, b.y, false); if (--q.lockHp <= 0) lockBreak();
            }
          }
          if (!gone && BO.on && BO.st >= 1) {
            for (j = 0; j < BO.n; j++) {
              p = BP[j];
              if (!p.alive) continue;
              if (b.x >= p.x - p.w * 0.46 && b.x <= p.x + p.w * 0.46 && b.y <= p.y + p.h * 0.42 && b.y + 9 >= p.y - p.h * 0.42) {
                gone = true;
                if (BO.st === 2) { score += 2; bossDeal(p, bd, b.x, b.y); }
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
    // statek v4: rysunek o 20% większy (hitbox bez zmian), płomień z pełnych kształtów, przechył, smuga przy szybkim ruchu
    function drawShip(c, x, y, s) {
      var a = tilt * 0.22, cs = Math.cos(a), sn = Math.sin(a), sx = 1 - 0.1 * Math.abs(tilt), L, j, fl, k, hull = BO.panic ? C.ink : C.bone, sp2 = ship.vx * ship.vx + ship.vy * ship.vy;
      s *= 1.2;
      if (sp2 > 90000 && !reduced) {             // smuga: trzy poprzednie pozycje jako płaskie sylwetki
        c.fillStyle = C.solid;
        for (j = 1; j <= 3; j++) {
          k = (trI - j + 5) % 5; c.globalAlpha = 0.34 - j * 0.09;
          c.setTransform(dpr * cs * sx * s, dpr * sn * sx * s, -dpr * sn * s, dpr * cs * s, dpr * (TRX[k] + shx), dpr * (TRY[k] + shy));
          pl(c, SH_BODY); c.fill(); pl(c, SH_WL); c.fill(); pl(c, SH_WR); c.fill();
        }
        c.globalAlpha = 1;
      }
      if (shipShake > 0 && !reduced) { x += rnd(-2.2, 2.2); y += rnd(-1.6, 1.6); }
      if (invul > 0 && (reduced || ((t * 14) | 0) % 2)) c.globalAlpha = 0.5;
      c.setTransform(dpr * cs * sx * s, dpr * sn * sx * s, -dpr * sn * s, dpr * cs * s, dpr * (x + shx), dpr * (y + shy));
      fl = reduced ? 0.5 : Math.random(); L = 6 + fl * 6 + up.agile * 2 + (ship.vy < -60 ? 4 : 0);
      // płomień: pełne wielokąty (karmazyn, jasny karmazyn, biały rdzeń), migocą długością
      c.fillStyle = C.solid; c.beginPath(); c.moveTo(-3.6, 14); c.lineTo(3.6, 14); c.lineTo(1.2, 14 + L); c.lineTo(-1.2, 14 + L * 0.85); c.closePath(); c.fill();
      c.fillStyle = C.hot; c.beginPath(); c.moveTo(-2.4, 14); c.lineTo(2.4, 14); c.lineTo(0.4, 14 + L * 0.7); c.lineTo(-0.6, 14 + L * 0.6); c.closePath(); c.fill();
      c.fillStyle = C.bone; c.fillRect(-1, 14, 2, 2 + fl * 2.5);
      if (up.agile) { c.fillStyle = C.solid; c.fillRect(-6.5, 14, 1.5, L - 5); c.fillRect(5, 14, 1.5, L - 5); }
      c.fillStyle = hull; pl(c, SH_WL); c.fill(); pl(c, SH_WR); c.fill(); pl(c, SH_BODY); c.fill();
      c.fillStyle = C.muted; c.fillRect(2.5, -11, 2.5, 22); c.fillRect(-14, 9, 5, 2); c.fillRect(9, 11, 5, 2);   // cień kadłuba (prawa strona, dół skrzydeł)
      c.fillStyle = C.acc; pl(c, SH_STL); c.fill(); pl(c, SH_STR); c.fill();
      c.fillStyle = C.solid; pl(c, SH_CAB); c.fill();
      c.fillStyle = C.bone; c.fillRect(-1.5, -9, 2, 3);
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

    var hudRT = -1, hudRS = '', LBW = {}, LBF = {}, hudCb = -1, hudCm = '', hudCs = '';
    var HSTL = { 5: 'ODSŁONIĘTY · ×2', 6: 'STAGGER · ×2', 7: 'PRZEJŚCIE FAZY', 8: 'DESPERACJA' };
    function hud(c) {
      var j, sc = Math.floor(score), bsx = recNow, x, pw = 134;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.font = '500 11px ' + MONO; ls(c, 0.88);
      c.textAlign = 'left'; c.textBaseline = 'middle';
      if (sc !== hudScore) { hudScore = sc; hudTxt = 'WYNIK ' + sc; }
      if (bombs !== hudBomb) { hudBomb = bombs; hudB = '×' + bombs; }
      if (grazeN !== hudGraze) { hudGraze = grazeN; hudG = '×' + grazeN; }
      if (bsx !== hudRec) { hudRec = bsx; hudR = String(bsx); }
      // płytka pod HUD: linijki przelatują pod nią, a liczby zostają czytelne
      c.fillStyle = C.ink; c.fillRect(6, 6, pw, 100);
      c.fillStyle = C.acc; c.fillRect(6, 6, 2, 100);
      c.fillStyle = C.label;
      c.fillText(hudTxt, 14, 15);
      if (rush && (t | 0) !== hudRT) { hudRT = t | 0; hudRS = 'RUSH ' + hudRT + ' s'; }
      c.fillText(rush ? hudRS : hudWave, 14, 31);
      if (sudo) { c.fillStyle = C.hot; c.fillText('SUDO', 96, 31); c.fillStyle = C.label; }
      c.drawImage(snd ? ic.sound : ic.mute, 118, 10, 14, 14);
      c.drawImage(ic.bomb, 14, 40, 16, 16); c.fillText(hudB, 34, 49);
      if (BO.on && mode === 'unik') { c.fillStyle = C.line; c.fillRect(14, 57, 40, 3); c.fillStyle = C.hot; c.fillRect(14, 57, 40 * Math.min(1, bmeter), 3); c.fillStyle = C.label; }
      x = 64;
      if (shieldOn) { c.drawImage(ic.shield, x, 40, 16, 16); x += 22; }
      if (mode === 'ogien') c.drawImage(ic.auto, x, 40, 16, 16);
      c.drawImage(ic.graze, 14, 64, 16, 16); c.fillText(hudG, 34, 73);
      c.drawImage(ic.record, 70, 64, 16, 16); c.fillText(hudR, 90, 73);
      if (comboM > 1 || combo > 0) {             // combo: mnożnik i pasek gaśnięcia
        if (combo !== hudCb) { hudCb = combo; hudCm = '×' + comboM; hudCs = 'COMBO ' + combo; }
        c.font = '700 13px ' + MONO; c.fillStyle = comboM > 1 ? C.bone : C.muted; c.fillText(hudCm, 14, 93);
        c.font = '500 10px ' + MONO; c.fillStyle = C.label; c.fillText(hudCs, 44, 93);
        c.fillStyle = C.line; c.fillRect(14, 101, pw - 16, 2); c.fillStyle = C.hot; c.fillRect(14, 101, (pw - 16) * comboT / COMBO_S, 2);
      } else { c.font = '500 10px ' + MONO; c.fillStyle = C.line; c.fillText('COMBO —', 14, 93); }
      ls(c, 0);
      if (BO.on) {                            // pasek życia bossa: odznaka, nazwa, faza, segmenty faz, biały błysk utraconego kawałka, bieżący atak
        var nar = W < 600, bw = nar ? W - 16 : Math.min(W * 0.56, 640), x0 = nar ? 8 : Math.max(152, W / 2 - bw / 2), x1 = nar ? W - 8 : Math.min(x0 + bw, W - 60),
          y0 = nar ? 114 : 8, f = BO.hp / 100, gq = BO.hpG / 100, w2, yb = y0 + 26, jx = BO.hit > 0 && !reduced ? rnd(-2, 2) : 0, lab;
        x0 += jx; x1 += jx; w2 = x1 - x0;
        if (BO.st === 1) { f *= Math.min(1, BO.age / BO.il); gq = f; }
        // 7.10 (feedback maisy: pasek się nie rzucał w oczy): grubszy pasek 16 px, karmazynowa ramka, procent życia przy pasku
        c.fillStyle = C.ink; c.fillRect(x0 - 8, y0 - 4, w2 + 16, 66);
        c.fillStyle = BO.phase === 4 ? C.hot : C.acc; c.fillRect(x0 - 8, y0 - 4, 3, 66); c.fillRect(x0 - 8, y0 - 4, w2 + 16, 1); c.fillRect(x0 - 8, y0 + 61, w2 + 16, 1);
        c.drawImage(ic.bb[BO.type], x0, y0, 22, 22);
        c.textBaseline = 'middle'; c.textAlign = 'left';
        c.font = '700 14px ' + MONO; ls(c, 1.8); c.fillStyle = C.bone; c.fillText(BNU[BO.type], x0 + 30, y0 + 11);
        c.font = '500 11px ' + MONO; ls(c, 0.88); c.fillStyle = BO.phase === 4 ? C.hot : C.label; c.textAlign = 'right'; c.fillText(FZ[BO.phase - 1], x1, y0 + 11);
        c.textAlign = 'left'; ls(c, 0);
        c.fillStyle = C.line; c.fillRect(x0, yb, w2, 16);
        if (gq > f) { c.fillStyle = C.bone; c.fillRect(x0 + w2 * f, yb, w2 * (gq - f), 16); }
        c.fillStyle = BO.hit > 0 ? C.bone : BO.phase >= 3 ? C.hot : C.acc; c.fillRect(x0, yb, w2 * f, 16);
        c.fillStyle = C.hot; c.fillRect(x0, yb, w2 * f, 3);   // jasna górna krawędź paska
        c.fillStyle = C.ink; for (j = 0; j < 3; j++) c.fillRect(x0 + w2 * THR[j] / 100 - 1.5, yb - 1, 3, 18);
        c.font = '700 13px ' + MONO; c.textAlign = 'right'; c.fillStyle = C.bone; c.fillText(PCT[clamp(Math.ceil(BO.hp), 0, 100)], x1, yb + 30); c.textAlign = 'left';
        c.fillStyle = C.muted;
        for (j = 1; j < 30; j++) c.fillRect(x0 + w2 * j / 30, yb + 18, 1, j % 5 ? 2 : 4);
        // co robi boss: atak (jak commit), odsłonięcie, stagger, przejście fazy
        lab = HSTL[BO.fs] || (BO.atk >= 0 && (BO.fs === S_TELE || BO.fs === S_ATK) ? (BO.fs === S_TELE ? ATT : ATA)[BO.atk] : '');
        if (BO.atk === A_HEL && BO.fs === S_ATK) lab = HELLT[clamp(Math.ceil(HELL_S - BO.hellT), 0, HELL_S)];
        if (lab && BO.st === 2) {
          c.font = '500 10px ' + MONO; ls(c, 0.8); c.fillStyle = BO.fs === S_VULN || BO.fs === S_STAG ? C.bone : BO.fs === S_TELE ? C.hot : C.label;
          c.fillText(lab, x0, yb + 30); ls(c, 0);
        }
      }
    }

    // --- bossowie: rysowanie w klatce (bez alokacji: tylko transformacje, obrazy i krótkie ścieżki) ---
    var TA = 0, TL = false, TP = 0;   // obrót całego bossa (stagger), telegraf trwa, postęp telegrafu
    function setB(x, y, S) { TBX = x; TBY = y; TS = S; }
    function us(c) { var k = dpr * TS; c.setTransform(k, 0, 0, k, dpr * (TBX + shx), dpr * (TBY + shy)); if (TA) c.rotate(TA); }
    // część w układzie bossa: przesunięcie (X, Y) w jednostkach, obrót, skala; gl = glitch-pasy, fl = biały błysk trafienia
    function dp(c, pt, X, Y, a, sx, sy, gl, fl) {
      var img = fl ? pt.f : pt.n, j, y0, y1, ih;
      us(c); if (X || Y) c.translate(X, Y); if (a) c.rotate(a); if (sx !== 1 || sy !== 1) c.scale(sx, sy);
      if (!gl || glA <= 0) { c.drawImage(img, -pt.ax, -pt.ay, pt.w, pt.h); return; }
      ih = img.height;
      for (j = 0; j < 5; j++) {
        y0 = GLY[j]; y1 = GLY[j + 1];
        c.drawImage(img, 0, y0 * ih, img.width, (y1 - y0) * ih, -pt.ax + GLX[j] * pt.w, -pt.ay + y0 * pt.h, pt.w, (y1 - y0) * pt.h);
        if (GLX[j]) { c.fillStyle = C.hot; c.fillRect(-pt.ax + GLX[j] * pt.w, -pt.ay + y0 * pt.h, pt.w, 1.2); }
      }
    }
    // pierścień w perspektywie: obrót w płaszczyźnie, spłaszczenie, przechył
    function ring3(c, pt, X, Y, th, tl, sc, sq, fl) {
      var ct = Math.cos(th), s1 = Math.sin(th), cp2 = Math.cos(tl), sp2 = Math.sin(tl);
      us(c); c.translate(X, Y);
      c.transform(sc * (cp2 * ct - sp2 * sq * s1), sc * (sp2 * ct + cp2 * sq * s1), sc * (-cp2 * s1 - sp2 * sq * ct), sc * (-sp2 * s1 + cp2 * sq * ct), 0, 0);
      c.drawImage(fl ? pt.f : pt.n, -pt.ax, -pt.ay, pt.w, pt.h);
    }
    function quad(c, ca, sa, cx, cy, r0, r1, hw) {
      var nx = -sa * hw, ny = ca * hw;
      c.beginPath(); c.moveTo(cx + ca * r0 + nx, cy + sa * r0 + ny); c.lineTo(cx + ca * r1 + nx, cy + sa * r1 + ny);
      c.lineTo(cx + ca * r1 - nx, cy + sa * r1 - ny); c.lineTo(cx + ca * r0 - nx, cy + sa * r0 - ny); c.closePath(); c.fill();
    }
    function octP(c, cx, cy, r, k) { octPath(c, cx, cy, r, k); }
    function sqr(c, cx, cy, r, a) {
      var ca = Math.cos(a) * r, sa = Math.sin(a) * r;
      c.beginPath(); c.moveTo(cx + ca, cy + sa); c.lineTo(cx - sa, cy + ca); c.lineTo(cx - ca, cy - sa); c.lineTo(cx + sa, cy - ca); c.closePath(); c.fill();
    }
    function ease3(v) { v = clamp(v, 0, 1); return 1 - (1 - v) * (1 - v) * (1 - v); }
    // desperacja: wyrwa w pancerzu i odsłonięty rdzeń, zawsze najjaśniejszy punkt bossa
    function coreX(c, X, Y, r) {
      var ph = BO.ph, j, a;
      r *= 1 + (reduced ? 0 : Math.sin(ph * 8) * 0.07);
      c.fillStyle = C.ink; octP(c, X, Y, r * 1.38, r * 0.46); c.fill();
      c.fillStyle = C.deep; octP(c, X, Y, r * 1.22, r * 0.4); c.fill();
      for (j = 0; j < 8; j++) { a = ph * 2.4 + j * 0.785; c.fillStyle = j & 1 ? C.hot : C.solid; quad(c, Math.cos(a), Math.sin(a), X, Y, r * 0.72, r * 1.16, r * 0.13); }
      c.fillStyle = C.bone; octP(c, X, Y, r * 0.62, r * 0.2); c.fill();
      c.fillStyle = C.hot; octP(c, X, Y, r * 0.34, r * 0.11); c.fill();
      c.fillStyle = C.bone; c.fillRect(X - r * 0.1, Y - r * 0.1, r * 0.2, r * 0.2);
    }
    // stagger: gwiazdki krążą nad bossem
    function dizzy(c, p) {
      var j, a, g = pj[2];
      for (j = 0; j < 3; j++) {
        a = BO.age * 5 + j * 2.094;
        c.setTransform(dpr, 0, 0, dpr, dpr * (p.x + Math.cos(a) * p.w * 0.28 + shx), dpr * (p.y - p.h * 0.55 + Math.sin(a) * 9 + shy));
        c.drawImage(g.c, -g.w / 2, -g.h / 2, g.w, g.h);
      }
      base(c);
    }

    // 1. NullPointer: wielkie oko `null`, źrenica-celownik śledzi statek, wokół oka obraca się pierścień segmentów
    function drawNP(c, p, fl) {
      var b = BO, vp = Math.min(3, b.vp), ac = ACC[b.vp - 1], ph = b.ph, j, h, X, osc = reduced ? 0 : Math.sin(ph * 2.1) * 0.12, sl = (vp >= 2 ? 7 : 0) - (p.ex ? 9 : 0), a, ae, px, py, lid, r, sc;
      us(c);
      if (b.d3 < 1) {
        c.fillStyle = ac;                         // korona: trzy ostrza pulsują (odpadają przy przejściu do fazy 2)
        for (j = vp >= 2 ? 0 : -1; j <= (vp >= 2 ? 0 : 1); j++) {
          h = 9 + 9 * (0.5 + 0.5 * Math.sin(ph * 3 + j * 1.4)); X = j * 42;
          c.beginPath(); c.moveTo(X - 6, -55); c.lineTo(X + 6, -55); c.lineTo(X + 1, -55 - h); c.lineTo(X - 6, -55 - h * 0.6); c.closePath(); c.fill();
        }
      }
      if (vp >= 2 && b.st !== 3) {              // od fazy 2: ramiona-wskaźniki wysuwają się spod kadłuba
        ae = ease3(b.armT / 0.7); a = 0.62 + (reduced ? 0 : Math.sin(ph * 1.7) * 0.12) + (b.fs === S_STAG ? 0.5 : 0);
        dp(c, BA.p2, 50, 4, a, ae, 1, false, fl); dp(c, BA.p2, -50, 4, Math.PI - a, ae, 1, false, fl);
      }
      a = osc + (vp >= 2 ? 0.22 : 0);
      if (!b.d1) dp(c, BA.p1, -96 - sl, -32, -a, -1, 1, true, fl);
      if (!b.d2) dp(c, BA.p1, 96 + sl, -32, a, 1, 1, true, fl);
      dp(c, BA.h, 0, 0, 0, 1, 1, true, fl);
      if (b.hp < 55) dp(c, BA.k1, 0, 0, 0, 1, 1, true, false);
      if (b.hp < 28) dp(c, BA.k2, 0, 0, 0, 1, 1, true, false);
      us(c);
      if (b.vp === 4) { coreX(c, 0, -14, 28); return; }
      r = ph * (vp >= 2 ? -1.3 : 0.6);          // pierścień segmentów (w fazie 2+ szybciej i w drugą stronę)
      for (j = 0; j < 12; j++) { a = r + j * 0.5236; c.fillStyle = j % 3 === 0 ? (TL ? C.hot : ac) : C.deep; quad(c, Math.cos(a), Math.sin(a), 0, -14, 37.5, 44, 6); }
      c.strokeStyle = TL ? C.hot : p.ex ? C.bone : ac; c.lineWidth = vp === 3 ? 3.4 : 2.4; pl(c, NP_RING); c.stroke();
      c.fillStyle = p.ex ? C.bone : ac;         // szprychy tęczówki
      for (j = 0; j < 8; j++) { r = ph * (vp >= 2 ? 1.1 : 0.5) + j * 0.785; quad(c, Math.cos(r), Math.sin(r), 0, -14, 22, 28, 1.6); }
      px = clamp((ship.x - p.x) / (p.w * 0.5), -1, 1) * 9; py = clamp((ship.y - p.y) / (H * 0.5), -1, 1) * 7;
      if (b.fs === S_STAG) { px = Math.sin(b.age * 6) * 7; py = 0; }
      if (TL || vp === 3) { c.fillStyle = TL ? C.hot : C.solid; c.fillRect(px - 25, -14 + py - 15, 50, 30); }
      sc = 1 + (p.hit > 0 ? 0.14 : 0) + (reduced ? 0 : 0.04 * Math.sin(ph * 5));
      dp(c, BA.p3, px, -14 + py, 0, sc, sc, false, fl);
      us(c); c.fillStyle = TL ? C.hot : C.bone;   // celownik: narożniki wokół źrenicy i kreski do pierścienia
      X = px; h = -14 + py;
      c.fillRect(X - 27, h - 17, 8, 2); c.fillRect(X - 27, h - 17, 2, 8); c.fillRect(X + 19, h - 17, 8, 2); c.fillRect(X + 25, h - 17, 2, 8);
      c.fillRect(X - 27, h + 15, 8, 2); c.fillRect(X - 27, h + 9, 2, 8); c.fillRect(X + 19, h + 15, 8, 2); c.fillRect(X + 25, h + 9, 2, 8);
      c.fillRect(X - 1, h - 26, 2, 6); c.fillRect(X - 1, h + 20, 2, 6); c.fillRect(X - 35, h - 1, 6, 2); c.fillRect(X + 29, h - 1, 6, 2);
      lid = b.blk > 0 && !p.ex ? Math.sin(Math.PI * (1 - b.blk / 0.22)) : 0;
      if (b.fs === S_STAG) lid = 0.55;
      if (lid > 0.02) {                         // powieki
        us(c); c.save(); pl(c, NP_SOCK); c.clip();
        c.fillStyle = C.plate; c.fillRect(-37, -51, 74, 36 * lid); c.fillRect(-37, 23 - 36 * lid, 74, 36 * lid);
        c.fillStyle = ac; c.fillRect(-37, -52.5 + 36 * lid, 74, 1.5); c.fillRect(-37, 23 - 36 * lid, 74, 1.5);
        c.restore();
      }
      if (vp === 3) {                           // faza 3: rozszczepione klamry gniazda
        us(c); c.fillStyle = C.hot; r = 48 + (reduced ? 0 : 2 * Math.sin(ph * 6));
        c.fillRect(-r - 3, -44, 3, 60); c.fillRect(-r - 3, -44, 9, 3); c.fillRect(-r - 3, 13, 9, 3);
        c.fillRect(r, -44, 3, 60); c.fillRect(r - 6, -44, 9, 3); c.fillRect(r - 6, 13, 9, 3);
      }
    }
    // 2. Memory Leak: nieregularna masa komórek wylewa się poza kleszcze, z dołu kapią bloki pamięci, w środku bije serce sterty
    function drawML(c, p, fl) {
      var b = BO, ac = ACC[b.vp - 1], g = b.g, ph = b.ph, sw = 1 + 0.1 * g + (reduced ? 0 : 0.03 * Math.sin(ph * 1.7)), N = BA.n, fill = Math.floor(N * (0.16 + 0.84 * g)),
        i, k, X, Y, v, cp2 = BA.cp, j, h, n, op = (p.ex ? 16 : 0) + (b.atk === A_SWP && b.fs === S_ATK ? -10 : 0), r, a, bt, pu, wb;
      us(c);
      for (j = 0; j < ML_DRIP.length; j += 3) {   // wiszące komórki na nitkach i odrywające się krople
        X = ML_DRIP[j] * sw + (reduced ? 0 : Math.sin(ph * 1.6 + j) * 2.5); Y = ML_DRIP[j + 1] * sw; n = ML_DRIP[j + 2];
        c.fillStyle = C.solid; c.fillRect(X - 1, Y, 2, n * 13 + 4);
        for (k = 0; k < n; k++) c.drawImage(BA.at, (fl ? 6 : k === n - 1 ? 5 : 4) * cp2, 0, cp2, cp2, X - 6, Y + 5 + k * 13, 12, 12);
        if (!reduced) {
          a = ph * (0.45 + 0.4 * g) + j * 0.137; a -= Math.floor(a); h = Y + 6 + n * 13 + a * a * (40 + 40 * g);
          c.globalAlpha = 1 - a; c.fillStyle = a < 0.4 ? C.hot : C.solid; c.fillRect(X - 3, h, 6, 7); c.globalAlpha = 1;
        }
      }
      c.beginPath();                            // ciemna masa pod komórkami: poszarpany brzeg zamiast prostokąta (jedna ścieżka)
      for (i = 0; i < N; i++) { k = BA.fo[i]; if (BA.br[k] >= b.cb) c.rect(BA.cx[k] * sw - 11.5, BA.cy[k] * sw - 11.5, 23, 23); }
      c.fillStyle = C.ink; c.fill();
      for (i = 0; i < N; i++) {
        k = BA.fo[i];
        if (BA.br[k] < b.cb) continue;
        X = BA.cx[k] * sw; Y = BA.cy[k] * sw;
        if (!reduced) Y += Math.sin(ph * 2.4 + k * 0.9) * (0.5 + g);
        if (glA > 0) { v = (Y + 66) / 132; for (j = 0; j < 4 && GLY[j + 1] < v; j++); X += GLX[j] * 200; }
        v = fl ? 6 : i < fill ? (b.vp >= 2 && k % 3 === 0 ? 5 : 4) : BA.cv[k];
        r = BA.cs[k];
        c.drawImage(BA.at, v * cp2, 0, cp2, cp2, X - 8 * r, Y - 8 * r, 16 * r, 16 * r);
      }
      wb = reduced ? 0 : Math.sin(ph * 2.3) * 0.05 + (p.hit > 0 ? 0.05 : 0);   // kleszcze ledwo trzymają
      dp(c, BA.p1, -(76 + 8 * g) * sw - op, 6, wb, 1, 0.82, true, fl);
      dp(c, BA.p1, (76 + 8 * g) * sw + op, -6, -wb, -1, 0.82, true, fl);
      us(c);
      if (b.vp === 4) coreX(c, 0, 0, 24);
      else {
        bt = reduced ? 0.5 : ph * (1.1 + 0.6 * g); bt -= Math.floor(bt);   // rytm serca: dwa uderzenia
        pu = bt < 0.1 ? Math.sin(bt * 31.4) : bt > 0.18 && bt < 0.28 ? 0.6 * Math.sin((bt - 0.18) * 31.4) : 0;
        c.strokeStyle = pu > 0.3 ? C.hot : C.solid; c.lineWidth = 2.2; c.lineJoin = 'miter'; c.beginPath();   // żyły do masy
        for (j = 0; j < ML_VEIN.length; j += 6) { c.moveTo(ML_VEIN[j] * sw, ML_VEIN[j + 1] * sw); c.lineTo(ML_VEIN[j + 2] * sw, ML_VEIN[j + 3] * sw); c.lineTo(ML_VEIN[j + 4] * sw, ML_VEIN[j + 5] * sw); }
        c.stroke();
        c.fillStyle = C.ink; octP(c, 0, 0, 25, 8); c.fill();
        if (pu > 0 && bt < 0.33) { c.globalAlpha = 1 - bt * 3; c.strokeStyle = C.hot; c.lineWidth = 2; octP(c, 0, 0, 26 + bt * 90, 9 + bt * 30); c.stroke(); c.globalAlpha = 1; }
        r = 1.5 * (1 + 0.2 * pu + (p.hit > 0 ? 0.12 : 0));
        c.save(); c.scale(r, r);
        c.fillStyle = p.ex ? C.bone : TL ? (((b.age * 16) | 0) & 1 ? C.hot : C.bone) : C.solid; pl(c, ML_HEART); c.fill();
        c.scale(0.62, 0.62); c.fillStyle = p.ex ? C.hot : C.hot; pl(c, ML_HEART); c.fill();
        c.restore();
        c.fillStyle = C.bone; r = 3 + 2 * pu + (p.ex ? 2 : 0); c.fillRect(-r, -r - 1, r * 2, r * 2);
      }
      if (!b.d1) { dp(c, BA.p2, 0, -76 * sw, 0, 1, 1, false, fl); us(c); c.fillStyle = ac; c.fillRect(-13, -76 * sw - 2.5, 48 * g, 5); }  // tabliczka HEAP z miernikiem wycieku
    }
    // 3. Race Condition: gruby łańcuch ⇄ z wyścigiem iskier między połówkami
    function drawChain(c) {
      var A = BP[0], B = BP[1], u = A.u, n, j, t2, X, Y, x0, x1, y0, y1, sg, row, sp, q, img, z;
      for (row = 0; row < 2; row++) {
        if (A.alive && B.alive) {
          x0 = A.x + 46 * u; x1 = B.x - 54 * u; y0 = A.y + (row ? 40 : -20) * u; y1 = B.y + (row ? 40 : -20) * u;
          n = clamp(Math.floor(Math.abs(x1 - x0) / (19 * u)), 2, 50); sg = (8 + (reduced ? 0 : 5 * Math.sin(BO.ph * 2 + row))) * u;
          for (j = 0; j <= n; j++) {
            t2 = j / n; X = x0 + (x1 - x0) * t2; Y = y0 + (y1 - y0) * t2 + Math.sin(t2 * Math.PI) * sg;
            c.setTransform(dpr * u * 1.45, 0, 0, dpr * u * 1.45, dpr * (X + shx), dpr * (Y + shy)); c.drawImage(j & 1 ? BA.l2 : BA.l0, -10, -10, 20, 20);
          }
          // wyścig iskier: lewa w prawo, prawa w lewo; ranna połówka biegnie szybciej
          for (sp = 0; sp < 2; sp++) {
            q = BO.ph * (0.55 + 0.5 * (1 - BP[sp].hp / BP[sp].max)) + row * 0.37;
            q -= Math.floor(q); if (sp) q = 1 - q;
            for (j = 0; j < 5; j++) {
              t2 = clamp(q - (sp ? -1 : 1) * j * 0.022, 0, 1); X = x0 + (x1 - x0) * t2; Y = y0 + (y1 - y0) * t2 + Math.sin(t2 * Math.PI) * sg;
              img = j ? (sp ? C.hot : C.solid) : C.bone; z = (6 - j) * u;
              c.setTransform(dpr, 0, 0, dpr, dpr * (X + shx), dpr * (Y + shy)); c.fillStyle = C.ink; c.fillRect(-z - 1.5, -z - 1.5, z * 2 + 3, z * 2 + 3); c.fillStyle = img; c.fillRect(-z, -z, z * 2, z * 2);
            }
          }
        } else {                                // zerwany łańcuch zwisa z żywej połówki
          q = A.alive ? A : B; sp = A.alive ? 1 : -1;
          x0 = q.x + sp * 46 * u; y0 = q.y + (row ? 40 : -20) * u;
          for (j = 0; j < 6 - row * 2; j++) {
            X = x0 + sp * 4 * u + (reduced ? 0 : Math.sin(BO.ph * 2 + row) * j * 2 * u); Y = y0 + j * 17 * u;
            c.setTransform(0, dpr * u * 1.45, -dpr * u * 1.45, 0, dpr * (X + shx), dpr * (Y + shy)); c.drawImage(j & 1 ? BA.l2 : BA.l0, -10, -10, 20, 20);
          }
        }
      }
      base(c);
    }
    // połówka poniżej połowy życia pęka: górny odłamek odsuwa się, w szczelinie świeci karmazyn
    function splitRC(c, pt, m, fl) {
      var o = 5 + (reduced ? 0 : Math.sin(BO.ph * 7) * 1), im = fl ? pt.f : pt.n;
      us(c); c.scale(m, 1); c.lineJoin = 'miter'; c.beginPath(); c.moveTo(-70, -26);
      for (var j = 0; j < RC_CUT.length; j += 2) c.lineTo(RC_CUT[j], RC_CUT[j + 1]);
      c.strokeStyle = C.ink; c.lineWidth = 10; c.stroke(); c.strokeStyle = C.hot; c.lineWidth = 3.4; c.stroke();
      us(c); c.save(); c.scale(m, 1); pl(c, RC_BOTC); c.clip(); c.scale(m, 1); c.drawImage(im, -pt.ax, -pt.ay, pt.w, pt.h); c.restore();
      us(c); c.save(); c.scale(m, 1); pl(c, RC_TOPC); c.clip(); c.scale(m, 1); c.translate(-1.5 * m, -o); c.drawImage(im, -pt.ax, -pt.ay, pt.w, pt.h); c.restore();
    }
    function drawRC(c, p, k, fl) {
      var b = BO, m = k ? -1 : 1, ac = ACC[b.vp - 1], j, r, ga = 1, cl, a;
      if (p.hp < p.max * 0.7 && !reduced && ((b.age * 9) | 0) % 3 === 0) ga = 0.6;   // ranna połówka mruga
      c.globalAlpha = ga;
      cl = TL ? TP : p.mz > 0 ? 1 : 0;
      a = (reduced ? 0 : Math.sin(b.ph * 2 + k) * 0.15) - cl * 0.35;
      if (!b.d1) dp(c, BA.p1, m * (46 + cl * 12), 30, m * a, m, 1, false, fl);
      if (p.hp < p.max * 0.5) splitRC(c, k ? BA.h2 : BA.h, m, fl);
      else {
        dp(c, k ? BA.h2 : BA.h, 0, 0, 0, 1, 1, true, fl);
        if (p.hp < p.max * 0.7) dp(c, k ? BA.k2 : BA.k1, 0, 0, 0, 1, 1, true, false);
      }
      us(c);
      if (b.vp === 4) { c.globalAlpha = 1; coreX(c, m * -10, -24, 20); }
      else {
        for (j = 0; j < 8; j++) {                 // wskaźnik „wątek pracuje”: kręci się szybciej, gdy połówka jest ranna
          r = m * p.spin + j * 0.785;
          c.fillStyle = j < 2 ? C.bone : j < 4 ? ac : C.deep; c.globalAlpha = ga * (j === 0 ? 1 : 1 - j * 0.08);
          quad(c, Math.cos(r), Math.sin(r), m * -10, -24, 7, 20, 3);
        }
        c.globalAlpha = ga;
        r = p.hit > 0 ? 7 : 5.5;
        c.fillStyle = p.ex ? C.bone : TL ? C.hot : C.bone; octP(c, m * -10, -24, r, r * 0.32); c.fill();
      }
      c.fillStyle = ac; c.fillRect(m * -40, k ? -69 : -66, m * 70 * clamp(p.hp / p.max, 0, 1), 4);
      if (b.mtx === k) {                         // mutex: tarcza na tej połówce (strzały się odbijają)
        c.globalAlpha = 1; c.strokeStyle = (((b.age * 12) | 0) & 1) && b.mtT > 1.2 ? C.hot : C.bone; c.lineWidth = 3;
        c.save(); c.scale(1.1 * m, 1.08); pl(c, k ? RC_HULL2 : RC_HULL); c.restore(); c.stroke();
        c.fillStyle = C.bone; c.fillRect(-16, -96, 32, 12); c.font = '700 8px ' + MONO; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = C.ink; c.fillText('LOCK', 0, -89.5);
      }
      c.globalAlpha = 1;
    }
    // 4. Segfault Prime: korona z kolców, skośne szczeliny oczu, szczęka; w desperacji pęka na pół i odsłania rdzeń
    function drawSP(c, p, fl) {
      var b = BO, ph = b.ph, vp = Math.min(3, b.phase), ac = ACC[b.vp - 1], a, ae, j, r, X, t1 = ph * (0.7 + 0.25 * vp), t2 = -ph * (0.5 + 0.2 * vp), cwd = cellW * dpr, lhd = lh * dpr, gw, gh, px, o = 0, im, hk = p.hit > 0 ? 1.18 : 1;
      ring3(c, BA.p2, 0, -6, t1, 0.14, 1.12, 0.26, fl); ring3(c, BA.p2, 0, -6, t2, -0.22, 0.9, 0.32, fl);
      if (vp >= 2 && b.st !== 3 && !b.d2) {
        ae = ease3(b.armT / 0.8); a = 0.95 + (reduced ? 0 : Math.sin(ph * 1.4) * 0.12) + (b.fs === S_STAG ? 0.6 : 0);
        dp(c, BA.p3, 124, -6, a, ae, 1, false, fl); dp(c, BA.p3, -124, -6, Math.PI - a, ae, 1, false, fl);
      }
      if (!b.d1) dp(c, BA.p1, 0, -76 - (reduced ? 0 : 3 * (0.5 + 0.5 * Math.sin(ph * 2.2))) - (vp >= 2 ? 4 : 0), 0, 1, 1, true, fl);
      if (b.phase === 4) {                       // desperacja: kadłub pęka na pół, w szczelinie widać rdzeń
        o = 22 + (reduced ? 0 : 3 * Math.sin(ph * 5)); im = fl ? BA.h.f : BA.h.n;
        us(c); c.fillStyle = C.ink; c.fillRect(-o - 4, -86, o * 2 + 8, 192); c.fillStyle = C.deep; c.fillRect(-o + 3, -86, o * 2 - 6, 192);
        c.strokeStyle = C.hot; c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, -86);
        for (j = 0; j < 12; j++) c.lineTo((j & 1 ? 1 : -1) * (o - 8) * 0.7, -70 + j * 15);
        c.stroke();
        for (j = 0; j < 2; j++) {
          us(c); c.save(); c.translate(j ? o : -o, j ? -2 : 2); c.beginPath(); c.rect(j ? 0 : -170, -130, 170, 260); c.clip(); c.drawImage(im, -BA.h.ax, -BA.h.ay, BA.h.w, BA.h.h); c.restore();
        }
      } else {
        dp(c, BA.h, 0, 0, 0, 1, 1, true, fl);
        if (b.hp < 67) dp(c, BA.k1, 0, 0, 0, 1, 1, true, false);
        if (b.hp < 34) dp(c, BA.k2, 0, 0, 0, 1, 1, true, false);
      }
      us(c); c.save(); c.beginPath(); c.rect(-170, -6, 340, 140); c.clip();   // przednia połowa pierścieni
      ring3(c, BA.p2, 0, -6, t1, 0.14, 1.12, 0.26, fl); ring3(c, BA.p2, 0, -6, t2, -0.22, 0.9, 0.32, fl);
      c.restore();
      px = clamp((ship.x - p.x) / (p.w * 0.5), -1, 1) * 7;
      for (j = 0; j < 2; j++) {                  // oczy-szczeliny i źrenice przesuwające się po skosie za statkiem
        us(c); c.translate(j ? o : -o, 0);
        c.fillStyle = TL && ((b.age * 16) | 0) & 1 ? C.bone : ac; pl(c, j ? SP_EYR : SP_EYL); c.fill();
        X = (j ? 28 : -28) + px; c.fillStyle = C.ink; c.fillRect(X - 2.5, -20 + (j ? 46 - X : X + 46) * 0.375 + 1, 5, 5);
      }
      us(c);
      if (b.phase === 4) { coreX(c, 0, -55, 26 * hk); return; }
      if (vp === 1) {                           // rdzeń zmienia kształt z każdą fazą
        r = 12 * hk * (1 + (reduced ? 0 : 0.08 * Math.sin(ph * 5)));
        c.fillStyle = ac; sqr(c, 0, -55, r, ph * 1.4); c.fillStyle = C.ink; sqr(c, 0, -55, r * 0.6, -ph * 2); c.fillStyle = C.bone; c.fillRect(-3.5 * hk, -55 - 3.5 * hk, 7 * hk, 7 * hk);
      } else if (vp === 2) {
        r = (13 + (reduced ? 0 : 2.5 * Math.sin(ph * 4))) * hk;
        c.fillStyle = ac; c.beginPath();
        for (j = 0; j < 16; j++) { a = ph * 0.8 + j * 0.3927; X = j & 1 ? 5 : r; c.lineTo(Math.cos(a) * X, -55 + Math.sin(a) * X); }
        c.closePath(); c.fill(); c.fillStyle = C.bone; octP(c, 0, -55, 4.5 * hk, 1.3); c.fill();
      } else {                                  // faza 3: rdzeń rozpada się na znaki
        c.strokeStyle = (((b.age * 10) | 0) & 1) && !reduced ? C.hot : C.bone; c.lineWidth = 1.6; octP(c, 0, -55, 14 * hk, 4.5); c.stroke();
        c.fillStyle = C.bone; octP(c, 0, -55, 5, 1.6); c.fill();
        gw = cellW / TS; gh = lh / TS;
        for (j = 0; j < 14; j++) {
          a = ph * 1.6 + j * 0.449; r = 9 + 6 * Math.sin(ph * 3 + j);
          c.drawImage(atlas, ((j * 7 + ((ph * 5) | 0)) % gN) * cwd, (j & 1) * lhd, cwd, lhd, Math.cos(a) * r - gw / 2, -55 + Math.sin(a) * r * 0.8 - gh / 2, gw, gh);
        }
      }
    }
    function drawBossTo(c) {
      var ty = BO.type, k, p, fl, jx, jy, a, fade;
      if (ty === 2) drawChain(c);
      for (k = 0; k < BO.n; k++) {
        p = BP[k];
        if (!p.alive) continue;
        fl = !reduced && (p.hit > 0 || (BO.st === 3 && ((BO.dt * 18) | 0) & 1) || ((BO.fs === S_SHIFT || BO.fs === S_DESP) && BO.ft < 0.3 && ((BO.ft * 14) | 0) & 1));
        a = reduced ? 0 : BO.st === 3 ? 5 : p.hit > 0 ? 2.5 : BO.fs === S_SHIFT || BO.fs === S_DESP ? 3 : 0;   // drżenie przy trafieniu, przejściu fazy i śmierci
        jx = a ? rnd(-a, a) : 0; jy = a ? rnd(-a, a) * 0.6 : 0;
        TA = BO.fs === S_STAG ? (k ? -1 : 1) * (0.13 + (reduced ? 0 : 0.05 * Math.sin(BO.age * 9))) : 0;
        fade = ty === 0 && BO.atk === A_JMP && BO.fs === S_TELE ? 1 - 0.8 * Math.min(1, TP * 1.6) : 1;   // null jump: boss znika do konturu
        c.globalAlpha = fade;
        setB(p.x + jx, p.y + jy, p.u);
        if (ty === 0) drawNP(c, p, fl); else if (ty === 1) drawML(c, p, fl); else if (ty === 2) drawRC(c, p, k, fl); else drawSP(c, p, fl);
        c.globalAlpha = 1; TA = 0;
        if (fade < 1) {                          // kontur `null` w miejscu bossa
          base(c); c.strokeStyle = C.bone; c.lineWidth = 2;
          setB(p.x, p.y, p.u); us(c); c.globalAlpha = 1 - fade; pl(c, NP_HULL); c.lineWidth = 2 / p.u; c.stroke(); c.globalAlpha = 1;
          st(c, 'null', 22, 0, -12, C.bone, 1);
        }
      }
      base(c);
    }
    function drawBoss(c) {
      var ty = BO.type, k, p, j, bl, qx, qy, sx2, sy2, th, sc;
      if (!BA || BA.ty !== ty || BO.gone) return;
      TL = BO.fs === S_TELE; TP = TL ? clamp(BO.ft / BO.fd, 0, 1) : 0;
      if (silh && sil) {                         // test sylwetki: cały boss jednym kolorem
        sc = sil.getContext('2d'); sc.setTransform(1, 0, 0, 1, 0, 0); sc.clearRect(0, 0, sil.width, sil.height);
        drawBossTo(sc); sc.setTransform(1, 0, 0, 1, 0, 0); sc.globalCompositeOperation = 'source-in'; sc.fillStyle = C.muted; sc.fillRect(0, 0, sil.width, sil.height); sc.globalCompositeOperation = 'source-over';
        c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(sil, 0, 0); base(c);
      } else {
        drawBossTo(c);
        if (silx && sil) { sc = sil.getContext('2d'); sc.setTransform(1, 0, 0, 1, 0, 0); sc.clearRect(0, 0, sil.width, sil.height); drawBossTo(sc); root.__sil = sil; }
      }
      for (k = 0; k < BO.n; k++) {
        p = BP[k];
        if (!p.alive || BO.st !== 2) continue;
        if (p.ex) {                             // odsłonięty: białe nawiasy na rogach
          bl = 16 * p.u; c.fillStyle = BO.fs === S_STAG ? C.hot : C.bone; th = 3;
          for (j = 0; j < 4; j++) {
            qx = j & 1 ? p.x + p.w * 0.5 : p.x - p.w * 0.5; qy = j & 2 ? p.y + p.h * 0.48 : p.y - p.h * 0.48; sx2 = j & 1 ? -1 : 1; sy2 = j & 2 ? -1 : 1;
            c.fillRect(Math.min(qx, qx + sx2 * bl), qy - (sy2 > 0 ? 0 : th), bl, th);
            c.fillRect(qx - (sx2 > 0 ? 0 : th), Math.min(qy, qy + sy2 * bl), th, bl);
          }
        }
        if (BO.fs === S_STAG) dizzy(c, p);
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
      var l = Math.max(7, r * 0.45), t3 = 3;
      c.fillStyle = col;
      c.fillRect(x - r, y - r, l, t3); c.fillRect(x - r, y - r, t3, l); c.fillRect(x + r - l, y - r, l, t3); c.fillRect(x + r - t3, y - r, t3, l);
      c.fillRect(x - r, y + r - t3, l, t3); c.fillRect(x - r, y + r - l, t3, l); c.fillRect(x + r - l, y + r - t3, l, t3); c.fillRect(x + r - t3, y + r - l, t3, l);
      c.fillRect(x - 1, y - 6, 2, 12); c.fillRect(x - 6, y - 1, 12, 2);
    }
    // pas ostrzegawczy pod kątem a, od (x0, y0)
    function lane(c, x0, y0, a, hw, pr, bl) {
      var ca = Math.cos(a), sa = Math.sin(a), n;
      c.setTransform(dpr * ca, dpr * sa, -dpr * sa, dpr * ca, dpr * (x0 + shx), dpr * (y0 + shy));
      c.globalAlpha = 0.2 + 0.35 * pr; c.fillStyle = haz; c.fillRect(0, -hw, 2400, hw * 2);
      c.globalAlpha = 1; c.fillStyle = C.hot; c.fillRect(0, -hw - 2, 2400, 2); c.fillRect(0, hw, 2400, 2);
      c.fillStyle = bl ? C.bone : C.label;
      for (n = 0; n < 16; n++) chev(c, 34 + n * 46 + pr * 46, 0, 6 * s0);
      base(c);
    }
    function hband(c, y, hw, pr, side, bl) {   // poziomy pas (np. `==`, tandem)
      var n;
      c.globalAlpha = 0.22 + 0.35 * pr; c.fillStyle = haz; c.fillRect(0, y - hw, W, hw * 2);
      c.globalAlpha = 1; c.fillStyle = C.hot; c.fillRect(0, y - hw - 2, W, 2); c.fillRect(0, y + hw, W, 2);
      c.setTransform(dpr * side, 0, 0, dpr, dpr * ((side > 0 ? 0 : W) + shx), dpr * shy);
      c.fillStyle = bl ? C.bone : C.label;
      for (n = 0; n < W / 60; n++) chev(c, 20 + n * 60 + pr * 60, y, 8 * s0);
      base(c);
    }
    function vband(c, x, w, pr, bl, y0) {      // pionowa kolumna (zrzuty linijek, stos)
      c.globalAlpha = 0.16 + 0.3 * pr; c.fillStyle = haz; c.fillRect(x, y0, w, H - y0);
      c.globalAlpha = 1; c.fillStyle = C.hot; c.fillRect(x, y0, 2, H - y0); c.fillRect(x + w - 2, y0, 2, H - y0);
      c.setTransform(0, dpr, -dpr, 0, dpr * (x + w / 2 + shx), dpr * shy);
      c.fillStyle = bl ? C.bone : C.label;
      for (var n = 0; n < 3; n++) chev(c, y0 + lh + 20 + n * 18 + pr * 18, 0, 7);
      base(c);
    }
    function gapMark(c, x, y, w, col) { c.fillStyle = col; c.fillRect(x - w / 2, y - 10, 3, 20); c.fillRect(x + w / 2 - 3, y - 10, 3, 20); c.fillRect(x - w / 2, y - 10, 8, 3); c.fillRect(x + w / 2 - 8, y - 10, 8, 3); c.fillRect(x - w / 2, y + 7, 8, 3); c.fillRect(x + w / 2 - 8, y + 7, 8, 3); }
    // prostokąt zajmowany przez bossa (z częściami wystającymi poza hitbox) + 12 px marginesu
    var GR = false, GX0 = 0, GY0 = 0, GX1 = 0, GY1 = 0, BXF = [1.04, 1.12, 1.2, 1.14];
    function bossRect() {
      var k, p, hw, hh;
      GR = false;
      if (!BO.on || BO.st < 1 || BO.gone || !BA) return;
      for (k = 0; k < BO.n; k++) {
        p = BP[k]; if (!p.alive) continue;
        hw = p.w * 0.5 * BXF[BO.type] + 12; hh = p.h * 0.5 * (BO.type === 3 ? 1.16 : 1.08) + 12;
        if (!GR) { GX0 = p.x - hw; GX1 = p.x + hw; GY0 = p.y - hh; GY1 = p.y + hh; GR = true; }
        else { GX0 = Math.min(GX0, p.x - hw); GX1 = Math.max(GX1, p.x + hw); GY0 = Math.min(GY0, p.y - hh); GY1 = Math.max(GY1, p.y + hh); }
      }
    }
    // etykieta ataku: nigdy na bossie (jeśli wypada w jego prostokącie, schodzi pod niego)
    function label(c, s, x, y, col, px) {
      px = px || 11; c.font = LBF[px] || (LBF[px] = '700 ' + px + 'px ' + MONO); ls(c, 1.5); c.textAlign = 'center'; c.textBaseline = 'middle';
      var key = s + px, w = LBW[key];
      if (w === undefined) w = LBW[key] = c.measureText(s).width;   // szerokość napisu liczona raz
      if (GR && x + w / 2 + 6 > GX0 && x - w / 2 - 6 < GX1 && y + 9 > GY0 && y - 9 < GY1) y = GY1 + 12;
      c.fillStyle = C.ink; c.fillRect(x - w / 2 - 6, y - 9, w + 12, 18); c.fillStyle = col; c.fillText(s, x, y + 0.5); ls(c, 0);
    }
    function drawTele(c) {
      var b = BO, j = b.atk, p = BP[0], pr = TP, bl = reduced ? 1 : ((b.age * 16) | 0) & 1, k, x, y, w, a, r, n, hw, y0;
      if (j === A_ARR || j === A_ENP || j === A_PNC) {
        y0 = p.y + ORY[b.type] * p.h; a = Math.atan2(b.ty - y0, b.tx - p.x); hw = (24 - 17 * pr) * s0;
        n = j === A_PNC || (j === A_ARR && b.phase < 2) ? 0 : 1;
        for (k = -n; k <= n; k++) lane(c, p.x, y0, a + k * 0.3, hw, pr, bl);
        reticle(c, b.tx, b.ty, (54 - 36 * pr) * s0, bl ? C.bone : C.hot);
        if (j === A_PNC) { label(c, 'KERNEL PANIC', W / 2, H * 0.5, bl ? C.bone : C.hot, 22); c.fillStyle = C.hot; c.fillRect(W / 2 - 90, H * 0.5 + 16, 180 * (1 - pr), 4); }
      } else if (j === A_DER) {                // klin promienia: cała połowa pola po stronie gracza
        eye(p, 0); c.globalAlpha = 0.14 + 0.3 * pr; c.fillStyle = haz;
        c.beginPath(); c.moveTo(EX, EY); c.lineTo(EX + Math.cos(b.a0) * 3000, EY + Math.sin(b.a0) * 3000); c.lineTo(EX + Math.cos(b.a1) * 3000, EY + Math.sin(b.a1) * 3000); c.closePath(); c.fill();
        c.globalAlpha = 1; lane(c, EX, EY, b.a0, (16 - 10 * pr) * s0, pr, bl);
        c.fillStyle = bl ? C.bone : C.hot;
        for (k = 1; k < 7; k++) { a = b.a0 + (b.a1 - b.a0) * k / 7; r = 150 * s0; c.setTransform(dpr * Math.cos(a + b.sd * 1.57), dpr * Math.sin(a + b.sd * 1.57), -dpr * Math.sin(a + b.sd * 1.57), dpr * Math.cos(a + b.sd * 1.57), dpr * (EX + Math.cos(a) * r + shx), dpr * (EY + Math.sin(a) * r + shy)); chev(c, 0, 0, 7); }
        base(c);
      } else if (j === A_DNG) {
        eye(p, 0);
        for (k = 0; k < (b.phase >= 3 ? 5 : 4); k++) { a = Math.PI * (0.15 + 0.7 * k / ((b.phase >= 3 ? 5 : 4) - 1)); reticle(c, EX + Math.cos(a) * 80 * s0 * (0.5 + pr), EY + Math.sin(a) * 80 * s0 * (0.5 + pr), 10, bl ? C.bone : C.hot); }
      } else if (j === A_WALL) {
        c.globalAlpha = 0.25 + 0.35 * pr; c.fillStyle = haz; c.fillRect(0, 0, b.gx - b.gw / 2, 28); c.fillRect(b.gx + b.gw / 2, 0, W, 28); c.globalAlpha = 1;
        c.fillStyle = C.hot; c.fillRect(0, 28, b.gx - b.gw / 2, 2); c.fillRect(b.gx + b.gw / 2, 28, W, 2);
        gapMark(c, b.gx, 16 + pr * 30, b.gw, bl ? C.bone : C.hot); label(c, '0x00000000', W / 2, 44, C.label, 10);
      } else if (j === A_JMP) {
        x = clamp(b.tx, p.w * 0.4, W - p.w * 0.4); w = p.w * 0.8;
        vband(c, x - w / 2, w, pr, bl, 0); reticle(c, x, H - 34 * s0, (60 - 30 * pr) * s0, bl ? C.bone : C.hot);
      } else if (j === A_SPI || j === A_SPR || j === A_MAL || j === A_RNG || j === A_HEL || j === A_SWP) {
        eye(p, 0); r = (90 - 60 * pr) * s0; c.fillStyle = bl ? C.bone : C.hot;
        n = j === A_RNG ? 14 : 8;
        for (k = 0; k < n; k++) { a = k * 6.283 / n + b.age; c.fillRect(EX + Math.cos(a) * r - 2, EY + Math.sin(a) * r - 2, 4, 4); }
        if (j === A_SWP) for (k = 0; k < 4; k++) { a = k * 1.571 + 0.785; lane(c, EX + Math.cos(a) * 900, EY + Math.sin(a) * 900, a + Math.PI, 8 * s0, pr, bl); }
        if (j === A_MAL) label(c, 'malloc()', EX, EY + p.h * 0.6, C.label, 10);
      } else if (j === A_DMP || j === A_EML) {
        for (k = 0; k < RN; k++) { x = RX[k]; w = spr[RK[k]].w; vband(c, x, w, pr, bl, 0); r = (1 - pr) * 12; c.strokeStyle = bl ? C.bone : C.hot; c.lineWidth = 2; c.strokeRect(x - r, 2, w + r * 2, lh + r * 0.6); }
      } else if (j === A_GC) {
        x = b.sd > 0 ? 0 : W - 34; c.globalAlpha = 0.3 + 0.4 * pr; c.fillStyle = haz; c.fillRect(x, 0, 34, b.gy - b.gw / 2); c.fillRect(x, b.gy + b.gw / 2, 34, H); c.globalAlpha = 1;
        gapMark(c, b.sd > 0 ? 40 : W - 40, b.gy, b.gw * 0.4, bl ? C.bone : C.hot);
        hband(c, b.gy, b.gw / 2, pr * 0.2, b.sd, bl); label(c, 'free()', b.sd > 0 ? 70 : W - 70, b.gy - b.gw / 2 - 14, C.label, 10);
      } else if (j === A_OOM) {
        w = W * 0.27 * pr; c.globalAlpha = 0.35; c.fillStyle = haz; c.fillRect(0, 0, w, H); c.fillRect(W - w, 0, w, H); c.globalAlpha = 1;
        c.fillStyle = C.hot; c.fillRect(w, 0, 2, H); c.fillRect(W - w - 2, 0, 2, H); label(c, 'OUT OF MEMORY', W / 2, H * 0.5, bl ? C.bone : C.hot, 16);
      } else if (j === A_SWE || j === A_ERC || j === A_DSY) {
        hw = (28 - 19 * pr) * s0;
        for (k = 0; k < (b.phase >= 2 && j === A_SWE ? 2 : 1); k++) hband(c, clamp(b.ty - k * 46 * s0, 20, H - 20), hw, pr, b.sd, bl);
        if (j === A_DSY) hband(c, clamp(b.ty - 92 * s0, 20, H - 20), hw, pr, -b.sd, bl);
      } else if (j === A_CRS) {
        y = Math.max(BP[0].y, BP[1].y) + BP[0].h * 0.45; x = W / 2 + Math.sin(b.a0) * W * 0.32;
        c.globalAlpha = 0.18 + 0.3 * pr; c.fillStyle = haz; c.fillRect(0, y, x - b.gw / 2, H - y); c.fillRect(x + b.gw / 2, y, W, H - y); c.globalAlpha = 1;
        c.strokeStyle = bl ? C.bone : C.hot; c.lineWidth = 2; c.strokeRect(x - b.gw / 2, y, b.gw, H - y);
      } else if (j === A_LCK) {
        drawGrid(c, pr);
      } else if (j === A_TND) {
        k = BP[0].alive ? BP[0] : BP[1];
        hband(c, clamp(b.ly[0], H * 0.36, H - k.h * 0.4), k.h * 0.42, pr, k.side, bl);
      } else if (j === A_STK) {
        for (k = 0; k < RN; k++) { x = RK[k] * W / NSK; c.globalAlpha = 0.2 + 0.3 * pr; c.fillStyle = haz; c.fillRect(x + 2, H - pj[9].h * 3, W / NSK - 4, pj[9].h * 3); c.globalAlpha = 1; c.fillStyle = bl ? C.bone : C.hot; chev(c, x + W / NSK / 2, 18 + pr * 20, 7); }
        label(c, 'stack overflow', W / 2, H - pj[9].h * 3 - 16, C.label, 10);
      } else if (j === A_COR) {                 // pas bezpieczny przed zrzutem „core dump”, okno bomby (parry)
        x = b.lane - b.laneW / 2; w = b.lane + b.laneW / 2;
        c.globalAlpha = b.sub === 2 ? 0.45 : 0.22; c.fillStyle = haz; c.fillRect(0, 0, x, H); c.fillRect(w, 0, W - w, H);
        c.globalAlpha = 1; c.strokeStyle = C.bone; c.lineWidth = 2; c.strokeRect(x, 0, b.laneW, H);
        c.font = '500 9px ' + MONO; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = C.bone; c.fillText('BEZPIECZNY', b.lane, H * 0.62);
        c.fillStyle = C.hot; c.fillRect(x, 0, b.laneW * clamp(1 - b.ft / b.fd, 0, 1), 5);
        a = b.sub === 1 ? 1 + 0.6 * (1 - b.ft / 1.2) : 1;
        c.strokeStyle = C.hot; c.lineWidth = 2; c.strokeRect(p.x - p.w * 0.5 * a, p.y - p.h * 0.45 * a, p.w * a, p.h * 0.9 * a);
        if (b.sub === 1) label(c, 'BOMBA = PARRY', p.x, p.y + p.h * 0.6, bl ? C.bone : C.hot, 11);
      }
    }
    function drawGrid(c, pr) {   // krata deadlocku z łańcuchów + zamek
      var b = BO, j, x, y, n, top = b.ly[0] - (b.ly[1] - b.ly[0]) * 0.8, act = b.fs === S_ATK, u = BP[0].u, lx = b.lx[1], lyc = (b.ly[0] + b.ly[1]) / 2;
      c.globalAlpha = act ? 1 : 0.25 + 0.5 * pr;
      for (j = 0; j < 3; j++) for (y = top; y < H; y += 15 * u) { c.setTransform(0, dpr * u, -dpr * u, 0, dpr * (b.lx[j] + shx), dpr * (y + shy)); c.drawImage(act ? BA.l1 : BA.l0, -9, -9, 18, 18); }
      for (j = 0; j < 2; j++) for (x = 0; x < W; x += 15 * u) { c.setTransform(dpr * u, 0, 0, dpr * u, dpr * (x + shx), dpr * (b.ly[j] + shy)); c.drawImage(act ? BA.l1 : BA.l0, -9, -9, 18, 18); }
      base(c); c.globalAlpha = 1;
      if (act && b.lockHp > 0) {
        n = 14 * s0; c.fillStyle = C.ink; c.fillRect(lx - n - 2, lyc - n - 2, n * 2 + 4, n * 2 + 4); c.fillStyle = C.bone; c.fillRect(lx - n, lyc - n * 0.4, n * 2, n * 1.4);
        c.strokeStyle = C.bone; c.lineWidth = 3; c.strokeRect(lx - n * 0.55, lyc - n, n * 1.1, n * 0.7);
        c.fillStyle = C.hot; c.fillRect(lx - n, lyc + n - 4, n * 2 * b.lockHp / 10, 3); c.fillStyle = C.ink; c.fillRect(lx - 2, lyc, 4, 6);
      }
    }
    // to, co atak zostawia na ekranie: promień, krata, ściany OOM, linie przyciągania, tor tandemu
    function drawAtk(c) {
      var b = BO, j = b.atk, k, a, ca, sa, hw, x, f, pp;
      if (b.bm) {
        eye(BP[0], 0); a = b.bmA; ca = Math.cos(a); sa = Math.sin(a); hw = b.bmHW;
        c.setTransform(dpr * ca, dpr * sa, -dpr * sa, dpr * ca, dpr * (EX + shx), dpr * (EY + shy));
        c.fillStyle = C.ink; c.fillRect(0, -hw - 2, 2400, hw * 2 + 4);
        c.fillStyle = C.hot; c.fillRect(0, -hw, 2400, hw * 2);
        c.fillStyle = C.bone; c.fillRect(0, -hw * 0.42, 2400, hw * 0.84);
        for (k = 0; k < 24; k++) { x = ((k * 97 + b.age * 900) % 2400); c.fillStyle = C.ink; c.fillRect(x, -hw * 0.42, 6, hw * 0.84); }
        base(c);
      }
      if (j === A_LCK && b.fs === S_ATK && b.lockHp > 0) drawGrid(c, 1);
      if (b.wl > 0) {
        for (k = 0; k < 2; k++) {
          x = k ? W - b.wl : 0;
          c.fillStyle = C.ink; c.fillRect(x, 0, b.wl, H); c.globalAlpha = 0.5; c.fillStyle = haz; c.fillRect(x, 0, b.wl, H); c.globalAlpha = 1;
          c.fillStyle = C.bone; c.fillRect(k ? x : x + b.wl - 3, 0, 3, H);
        }
        label(c, 'OOM', W / 2, H - 30, C.hot, 12);
      }
      if (b.echo > 0 && b.echoA === A_GC) {   // telegraf drugiego przejazdu GC
        x = b.echoS > 0 ? 0 : W - 34; c.globalAlpha = 0.45; c.fillStyle = haz; c.fillRect(x, 0, 34, b.ty - b.gw / 2); c.fillRect(x, b.ty + b.gw / 2, 34, H); c.globalAlpha = 1;
        gapMark(c, b.echoS > 0 ? 40 : W - 40, b.ty, b.gw * 0.4, ((b.age * 16) | 0) & 1 ? C.bone : C.hot);
      }
      if (j === A_SWP && b.fs === S_ATK) {
        pp = BP[0]; c.strokeStyle = C.hot; c.lineWidth = 2;
        f = (b.age * 2) % 1;
        for (k = 0; k < 5; k++) { a = 1 - ((k / 5 + f) % 1); c.globalAlpha = 0.25 + 0.6 * (1 - a); c.beginPath(); c.moveTo(ship.x + (pp.x - ship.x) * (1 - a), ship.y + (pp.y - ship.y) * (1 - a)); c.lineTo(ship.x + (pp.x - ship.x) * (1 - a * 0.9), ship.y + (pp.y - ship.y) * (1 - a * 0.9)); c.stroke(); }
        c.globalAlpha = 1; label(c, 'SWAP', pp.x, pp.y + pp.h * 0.62, C.bone, 11);
      }
      if (j === A_TND && b.fs === S_ATK && b.tm < 1.0 && alive() === 2) hband(c, clamp(b.ly[1], H * 0.36, H - BP[1].h * 0.4), BP[1].h * 0.42, clamp((b.tm - 0.5) / 0.5, 0, 1), -1, ((b.age * 16) | 0) & 1);
    }
    function drawStack(c) {
      var k, j, sp = pj[9], cw2 = W / NSK, x;
      for (k = 0; k < NSK; k++) for (j = 0; j < STK[k]; j++) {
        x = k * cw2 + (cw2 - sp.w) / 2;
        c.globalAlpha = STT[k] < 1 && !reduced && ((STT[k] * 10) | 0) & 1 ? 0.5 : 1;
        c.drawImage(BO.panic ? sp.i : sp.c, x, H - (j + 1) * sp.h, sp.w, sp.h);
        c.fillStyle = C.ink; c.fillRect(k * cw2, H - (j + 1) * sp.h, x - k * cw2, sp.h); c.fillRect(x + sp.w, H - (j + 1) * sp.h, x - k * cw2, sp.h);
      }
      c.globalAlpha = 1;
    }
    // elity: telegraf przed wejściem
    function drawElTele(c) {
      var bl = ((t * 16) | 0) & 1, pr = 1 - ELP.t / 0.8, w;
      if (ELP.k === 1) {
        c.globalAlpha = 0.3 + 0.3 * pr; c.fillStyle = haz; c.fillRect(0, 0, ELP.gx - ELP.gw / 2, 26); c.fillRect(ELP.gx + ELP.gw / 2, 0, W, 26); c.globalAlpha = 1;
        gapMark(c, ELP.gx, 14, ELP.gw, bl ? C.bone : C.hot); label(c, 'merge conflict', ELP.gx, 42, C.hot, 10);
      } else {
        w = elSpr[ELP.k === 2 ? 2 : 3].w; vband(c, ELP.x, w, pr, bl, 0);
        label(c, ELP.k === 2 ? 'while(true)' : '// FIXME', ELP.x + w / 2, 42, C.hot, 10);
      }
    }
    // kolejność: tło → deszcz linijek → boss → telegrafy i ataki → pociski bossa → statek → efekty → UI
    function draw() {
      if (dead || !W) return;
      var c = ctx, k, o, p, f, sp, a, inv = BO.on && BO.panic > 0, x0, fr;
      shx = shy = 0;
      if (shake > 0) { a = 6 * shake / 0.3; shx = rnd(-a, a); shy = rnd(-a, a); }
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.globalAlpha = 1;
      c.fillStyle = inv ? C.bone : C.ink; c.fillRect(0, 0, W, H);
      if (despP > 0 && !inv) { c.globalAlpha = 0.2 + 0.14 * Math.sin(despP * 4.5); c.fillStyle = C.deep; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }   // desperacja: tło pulsuje
      base(c);

      c.drawImage(city, -cityOff, H - cityH, cityP, cityH);
      c.drawImage(city, cityP - cityOff, H - cityH, cityP, cityH);
      if (cityW > 0) {                            // w walce okna miasta przechodzą w karmazyn falą od lewej
        fr = cityW * (W + 40);
        c.save(); c.beginPath(); c.rect(-10, H - cityH - 12, fr, cityH + 24); c.clip();
        c.drawImage(cityB, -cityOff, H - cityH, cityP, cityH); c.drawImage(cityB, cityP - cityOff, H - cityH, cityP, cityH);
        c.restore();
        if (cityW < 1) { c.fillStyle = C.hot; c.fillRect(fr - 12, H - cityH, 2, cityH); }
      }
      for (a = 1; a >= 0; a--) {
        for (k = 0; k < clouds.length; k++) {
          o = clouds[k];
          if (o.far !== !!a || (o.gl && cityW <= 0)) continue;
          c.fillStyle = o.gl ? (a ? C.bar : C.deep) : a ? C.cloudFar : C.cloudNear;
          if (o.gl) c.globalAlpha = cityW;
          c.fillRect(o.x, o.y, o.w, o.h);
          c.fillRect(o.x + o.o, o.y + o.h, o.w * o.sw, 2);
          c.fillRect(o.x - o.o * 0.6, o.y - 2, o.w * 0.3, 2);
          c.globalAlpha = 1;
        }
      }

      if (BO.on && BO.st === 1) {                // wejście bossa: ekran ciemnieje
        c.globalAlpha = 0.62 * Math.min(1, BO.age / 0.2) * clamp((BO.il - BO.age) / 0.35, 0, 1); c.fillStyle = C.ink; c.fillRect(-10, -10, W + 20, H + 20); c.globalAlpha = 1;
      }
      // deszcz linijek: pod bossem. v4.1: w prostokącie bossa (+12 px) zwykła linijka traci tabliczkę i gaśnie do 30%,
      // linijki-pociski z ataków (o.at) i elity zostają w pełni czytelne
      bossRect();
      for (k = 0; k < obN; k++) {
        o = OB[k];
        if (o.k < 0) {                            // elity
          sp = elSpr[-1 - o.k];
          if (o.el === 1) { c.fillStyle = C.bone; x0 = o.ex < 0 ? 0 : o.x + o.w; c.fillRect(x0, o.y, o.ex < 0 ? o.x : W - x0, o.h); c.fillStyle = C.deep; c.fillRect(x0, o.y + 2, o.ex < 0 ? o.x : W - x0, o.h - 4); }
          if (o.el === 3 && o.fz > 0 && ((o.fz * 20) | 0) & 1) { c.fillStyle = C.bone; c.fillRect(o.x - 2, o.y - 2, o.w + 4, o.h + 4); }
          c.drawImage(sp.c, o.x, o.y, o.w, o.h);
          if (o.el === 2) { c.fillStyle = C.hot; chev(c, o.x + o.w + 10, o.y + o.h / 2, 5); }
        } else {
          sp = spr[o.k];
          if (GR && !o.at && o.x < GX1 && o.x + o.w > GX0 && o.y < GY1 && o.y + o.h > GY0) {
            c.save(); c.beginPath(); c.rect(0, 0, W, H); c.rect(GX0, GY0, GX1 - GX0, GY1 - GY0); c.clip('evenodd');
            c.drawImage(o.hv ? sp.b : sp.n, o.x, o.y, o.w, o.h); c.restore();
            c.save(); c.beginPath(); c.rect(GX0, GY0, GX1 - GX0, GY1 - GY0); c.clip(); c.globalAlpha = 0.3;
            c.drawImage(sp.t, o.x, o.y, o.w, o.h); c.restore();
          } else c.drawImage(o.hv ? sp.b : sp.n, o.x, o.y, o.w, o.h);
          if (o.hv && mode === 'ogien') { c.fillStyle = C.bone; for (a = 0; a < o.hp; a++) c.fillRect(o.x + o.w - 5, o.y + 3 + a * 5, 3, 3); }
        }
        if (o.hit > 0) { c.strokeStyle = C.bone; c.lineWidth = 2; c.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2); }
      }
      if (ELP.k && state === 'play') drawElTele(c);
      // telegrafy i ślady ataków pod bossem: pasy wychodzą spod kadłuba, sylwetka zostaje cała
      if (BO.on && BO.st === 2) { drawAtk(c); if (BO.fs === S_TELE && BO.atk >= 0) drawTele(c); }
      if (BO.on && BO.st >= 1) drawBoss(c);
      if (BO.on) drawStack(c);
      for (k = 0; k < prN; k++) {
        p = PR[k]; sp = pj[p.g];
        if (p.g <= 3) {
          a = Math.cos(p.rot); f = Math.sin(p.rot);
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
        c.font = '500 11px ' + MONO; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = inv ? C.ink : C.label;
        for (k = 0; k < flN; k++) {
          f = FL[k];
          c.globalAlpha = Math.min(1, f.life / 0.3);
          c.fillText(f.txt, f.x, f.y);
        }
        c.globalAlpha = 1;
      }
      if (banner > 0 && state !== 'start') {     // baner: w walce na dole, żeby nie lądował na bossie
        c.globalAlpha = Math.min(1, banner / 0.4);
        c.font = '500 12px ' + MONO; c.textAlign = 'center'; c.textBaseline = 'middle';
        if (!bannerW) bannerW = c.measureText(bannerTxt).width;
        var by = Math.round(BO.on ? H - 44 : H * 0.3);
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
      if (hitstop > 0) { hitstop -= dt; dt = 0; }   // stop-klatka: świat stoi, kadr się rysuje
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
      var ok = unlockOpt || load(KEYP + 'sudo') > 0, oc = '', rb = load(KEYP + 'rush.' + mode), j, sb = q('[data-a=sudo]'), rbt = q('[data-a=rush]');
      sb.disabled = rbt.disabled = !ok; if (!ok) sudo = false;
      sb.setAttribute('aria-pressed', String(sudo));
      for (j = 0; j < 4; j++) { k = load(KEYP + 'ocena.' + j); oc += (j ? ' ' : '') + (k ? GRADES[k - 1] : '–'); }
      q('.dcg-oc').textContent = '4 bossy · oceny ' + oc;
      var cpd = loadJ(cpKey()), cb = q('[data-a=cont]');
      cb.hidden = !(cpd && cpd.tier > 0);
      if (cpd && cpd.tier > 0) q('[data-a=cont] span').textContent = 'Po bossie ' + BN[(cpd.tier - 1) % 4] + ' · ' + cpd.score;
      q('.dcg-lk').textContent = !ok ? 'sudo i boss rush: po pokonaniu Segfault Prime.' : sudo ? 'sudo: bossowie o 40% szybsi, krótsze telegrafy, bez tarczy.' :
        'Boss rush: czterech bossów pod rząd' + (rb ? ', rekord ' + fmtT(rb) : '') + '.';
    }
    function focusIn(sel) { var b = q(sel); if (b) try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } }

    function start(retry, rushMode) {
      ovStart.hidden = ovPause.hidden = ovOver.hidden = ovMerge.hidden = ovPick.hidden = true;
      reduced = !!(mq && mq.matches);
      go('play');
      obN = ptN = blN = flN = prN = exN = shN = 0;
      for (i = 0; i < DTP.length; i++) DTP[i].life = 0;
      BO.on = false; BO.st = 0; slowT = 0; invul = 0; shipShake = 0; diedBoss = false;
      grace = 0; fireT = 0.3; flash = shake = 0; tilt = 0; tb = -1; hitstop = 0; combo = 0; comboT = 0; comboM = 1; bmeter = 0; ELP.k = 0; eliteCd = 0; prMax = 0; cityW = 0; despP = 0;
      clearStack(); atkClear();
      if (retry && cp) {
        score = cp.score; bombs = Math.max(cp.bombs, 1); wave = cp.wave; waveT = cp.waveT; t = cp.t; nextBomb = cp.nb; step = cp.step;
        for (i in cp.up) up[i] = cp.up[i];
        shieldOn = cp.sh; bossTier = cp.tier; nextBossT = cp.nbt;
      } else {
        t = 0; waveT = 0; score = 0; wave = 1; bombs = 1; nextBomb = 1000; step = 1000; bossTier = 0; nextBossT = BOSS1_S; grazeN = 0; cp = null;
        for (i in up) up[i] = 0;
        shieldOn = false; earned[0] = earned[1] = earned[2] = earned[3] = 0; grazeBonus = 25; grazeTxt = '+25 muśnięcie';
        rush = !!rushMode; rushN = 0;
        if (rush) { tb = 1.5; tbTier = 0; }
        else if (testTier >= 0) { tb = 2; tbTier = testTier; }
        if (testUps) testUps.split(',').forEach(applyUp);
      }
      spawnT = 0.5;
      setBanner(); banner = 1.8; hudScore = -1;
      ship.x = W / 2; ship.y = H * 0.78; ship.vx = ship.vy = 0;
      keys.l = keys.r = keys.u = keys.d = 0; drag.on = false;
      live.textContent = '';
      ensureArt((retry && cp ? bossTier : rush ? 0 : testTier >= 0 ? testTier : bossTier) % 4);   // części bossa budujemy przed pętlą
      if (retry === true && cp) { bossStart(); bossTier++; }   // ten sam boss od początku (z punktu kontrolnego: fala, boss za CP_NEXT_S)
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
    function exit(soft) {
      stopLoop(); rush = false;
      if (!soft && typeof opts.onExit === 'function') { opts.onExit(); if (dead) return; }
      go('start'); ovPause.hidden = ovOver.hidden = ovMerge.hidden = ovPick.hidden = true; ovStart.hidden = false;
      ship.x = W / 2; ship.y = H * 0.78; obN = ptN = blN = flN = prN = exN = shN = 0; flash = shake = 0; BO.on = false; BO.st = 0; tag(); clearStack(); atkClear(); cityW = 0;
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
      else if (a === 'cont') { cp = loadJ(cpKey()); if (cp && cp.up) start('cp'); else { cp = null; start(false); } }
      else if (a === 'rush') { if (!b.disabled) start(false, true); }
      else if (a === 'sudo') { if (!b.disabled) { sudo = !sudo; setMode(mode); } }
      else if (a === 'next') pickScreen();
      else if (a === 'resume') resume();
      else if (a === 'pause') pause();
      else if (a === 'exit') exit(false);
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
      var p = BP[0], b = BO, st = {}, at = {}, k, a;
      if (b.on) {
        for (k = 0; k < SN.length; k++) st[SN[k]] = b.stC[k];
        for (k = 0; k < ATK.length; k++) if (ATK[k][2] === b.type) at[ATK[k][0]] = b.atC[k];
        a = aimP();
      }
      return { state: state, mode: mode, score: Math.floor(score), bombs: bombs, wave: wave, shield: shieldOn, up: up, ship: { x: ship.x, y: ship.y },
        combo: combo, comboM: comboM, sudo: sudo, rush: rush, rushN: rushN, grade: GRADES[gradeLast], prN: prN, prMax: prMax, obN: obN, W: W, H: H, s0: s0,
        elKinds: ELC.slice(1), elites: (function () { var n = 0; for (var j = 0; j < obN; j++) if (OB[j].el) n++; return n; })(), elTele: ELP.k,
        boss: b.on ? { name: BN[b.type], type: b.type, hp: b.hp, st: b.st, phase: b.phase, x: p.x, y: p.y, w: p.w, h: p.h, ex: p.ex, n: b.n,
          alive: [BP[0].alive, BP[1].alive], hps: [BP[0].hp, BP[1].hp], x2: BP[1].x, sub: b.sub, lane: b.lane, laneW: b.laneW, tele: b.fs === S_TELE ? b.fd - b.ft : 0, hit: BP[0].hit + BP[1].hit,
          vp: b.vp, age: b.age, il: b.il, dt: b.dt, gone: b.gone, fsm: SN[b.fs], atk: b.atk >= 0 ? ATK[b.atk][0] : '', ft: b.ft, fd: b.fd,
          aim: a.x, aimY: a.y, mtx: b.mtx, parry: b.atk === A_COR && b.fs === S_TELE, lock: b.atk === A_LCK && b.fs === S_ATK && b.lockHp > 0,
          lockX: b.lx[1], lockY: (b.ly[0] + b.ly[1]) / 2, hits: b.hits, stg: b.stg, fightT: b.st === 3 ? b.fT : b.age - b.il, wl: b.wl, stats: { st: st, at: at } } : null,
        t: t, waveT: waveT, nextBoss: nextBossT };
    }
    // zagrożenia w kadrze jako prostokąty {x, y, w, h, vx, vy} (tylko dla bota testowego, który unika)
    function hazards() {
      var o = [], k, p, b = BO, j, a, d, top;
      for (k = 0; k < obN; k++) { p = OB[k]; o.push({ x: p.el === 1 && p.ex < 0 ? 0 : p.x, y: p.y, w: p.el === 1 ? (p.ex < 0 ? p.x + p.w : W - p.x) : p.w, h: p.h, vx: 0, vy: p.vy }); }
      for (k = 0; k < prN; k++) { p = PR[k]; a = p.hw || p.r; d = p.hh || p.r; o.push({ x: p.x - a, y: p.y - d, w: a * 2, h: d * 2, vx: p.vx, vy: p.vy }); }
      if (b.on && b.st === 2) {
        for (k = 0; k < b.n; k++) { p = BP[k]; if (p.alive) o.push({ x: p.x - p.w * 0.4, y: p.y - p.h * 0.4, w: p.w * 0.8, h: p.h * 0.8, vx: 0, vy: 0, body: 1 }); }
        if (b.bm) { eye(BP[0], 0); for (j = 0; j < 40; j++) o.push({ x: EX + Math.cos(b.bmA) * j * 30 - b.bmHW, y: EY + Math.sin(b.bmA) * j * 30 - b.bmHW, w: b.bmHW * 2, h: b.bmHW * 2, vx: 0, vy: 0 }); }
        if (b.atk === A_LCK && ((b.fs === S_ATK && b.lockHp > 0) || b.fs === S_TELE)) { top = b.ly[0] - (b.ly[1] - b.ly[0]) * 0.8; for (j = 0; j < 3; j++) o.push({ x: b.lx[j] - 4, y: top, w: 8, h: H, vx: 0, vy: 0 }); for (j = 0; j < 2; j++) o.push({ x: 0, y: b.ly[j] - 4, w: W, h: 8, vx: 0, vy: 0 }); }
        if (b.wl > 0) { o.push({ x: 0, y: 0, w: b.wl, h: H, vx: 0, vy: 0 }); o.push({ x: W - b.wl, y: 0, w: b.wl, h: H, vx: 0, vy: 0 }); }
      }
      for (k = 0; k < NSK; k++) if (STK[k]) o.push({ x: k * W / NSK, y: H - STK[k] * pj[9].h, w: W / NSK, h: STK[k] * pj[9].h, vx: 0, vy: 0 });
      return o;
    }
    return { destroy: destroy, state: snap, hazards: hazards };
  }

  G.DancyCloud = { mount: mount, version: '4.0.0', icons: { names: INAMES, canvas: iconCanvas } };
})(typeof window !== 'undefined' ? window : this);
