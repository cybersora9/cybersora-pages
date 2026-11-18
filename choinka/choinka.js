(() => {
  // ================= BEZ 3D (v10, etap 6) =================
  // Brak three (zablokowany plik), brak WebGL albo utrata kontekstu: zamiast czarnego ekranu statyczny obraz tej samej choinki w wolnym prostokącie kadru.
  // „brak” = scena nie wstanie: przyciski znikają, karta mówi wprost, co się stało, odliczanie działa dalej. „utrata” = obraz przykrywa płótno do powrotu kontekstu.
  const zapas = document.getElementById("zapas"); let zapasPowod = null;
  // Wolny prostokąt kadru [x0, x1, y0, y1]: na szerokim ekranie na prawo od karty, na wąskim nad kartą.
  // Wpięcie (18.11): #hero (tło hero cybersora.pl, karty nie ma, tekst strony stoi z lewej / na dole) = prawe 54% kadru
  // na szerokim ekranie, górne 58% na wąskim; góra 76 px pod paskiem strony.
  function wolnyKadr(w, h, kr) {
    const szeroki = w / h > 1.35;
    if (/hero/.test(location.hash)) return szeroki ? [w * 0.46, w - 24, 76, h - 20] : [8, w - 8, 76, h * 0.58];
    return [szeroki ? Math.min(kr.right + 24, w * 0.42) : 8, w - (szeroki ? 24 : 8), szeroki ? 20 : 60, szeroki ? h - 20 : kr.top - (w > 640 ? 28 : 10)];
  }
  function ulozZapas() {
    const [x0, x1, y0, y1] = wolnyKadr(innerWidth, innerHeight, document.getElementById("karta").getBoundingClientRect());
    Object.assign(zapas.style, { left: x0 + "px", top: y0 + "px", width: Math.max(40, x1 - x0) + "px", height: Math.max(80, y1 - y0) + "px" });
  }
  function bez3D(powod) {
    zapasPowod = powod;
    if (zapas.hidden) { zapas.hidden = false; ulozZapas(); addEventListener("resize", ulozZapas); }
    document.getElementById("scena").setAttribute("aria-hidden", "true");
    if (powod !== "brak") return;
    document.querySelector(".przyciski").style.display = "none"; document.querySelector(".podpowiedz").style.display = "none";
    document.getElementById("kOpis").textContent = "Ta przeglądarka nie pokazuje grafiki 3D, więc choinka stoi tu jako obraz.";
    wpiszOdliczanie(new Date()); setInterval(() => wpiszOdliczanie(new Date()), 15000);
  }
  function zakryjZapas() { zapas.hidden = true; zapasPowod = null; removeEventListener("resize", ulozZapas); document.getElementById("scena").removeAttribute("aria-hidden"); }
  if (!window.THREE) { bez3D("brak"); return; }
  const T = THREE;
  const KOLOR = { ink: 0x0e0e12, krew: 0xe11d33, hot: 0xff3a52, kosc: 0xf6f2f3, panel: 0x17171d, noc: 0x1e1e26, linia: 0x2c2c36, zloto: 0xffcf33 }; // złoto: wyjątek z 16.11, tylko światło z otwartego prezentu
  // te same tokeny dla shaderów (wartości sRGB, bez mapowania tonów: krew ma zostać krwią co do piksela)
  const GLSL_PALETA = `
    const vec3 INK = vec3(0.055, 0.055, 0.071);
    const vec3 LINIA = vec3(0.173, 0.173, 0.212);
    const vec3 KREW = vec3(0.882, 0.114, 0.200);
    const vec3 HOT = vec3(1.0, 0.227, 0.322);
    const vec3 KOSC = vec3(0.965, 0.949, 0.953);
    const vec3 ZLOTO = vec3(1.0, 0.812, 0.2);`;
  function mulberry(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const R = mulberry(20261115);
  const hex6 = (k) => "#" + k.toString(16).padStart(6, "0");
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const FLAGI = (location.hash || "") + (location.search || "");
  const HERO = /hero/.test(location.hash); // wpięcie w stronę (18.11): bez karty, kółko przewija stronę
  if (HERO) document.documentElement.classList.add("tryb-hero");

  // Duże bombki: nicki ekipy (decyzja maisy 16.11), każdy raz.
  const PROJEKTY = [
    { nazwa: "veen", tag: "ekipa", kolor: KOLOR.krew },
    { nazwa: "nielekbestia", tag: "ekipa", kolor: KOLOR.kosc },
    { nazwa: "miyako", tag: "ekipa", kolor: KOLOR.ink },
    { nazwa: "deadsora", tag: "ekipa", kolor: KOLOR.hot },
  ];
  // v11: zwykłe ozdoby z buźkami (bez nicku). „twarz” = klucz w TWARZE; etykieta po najechaniu: „ozdoba”.
  const OZDOBY_POST = [
    { nazwa: "ozdoba", twarz: "F1", kolor: KOLOR.hot, ozdoba: true },
    { nazwa: "ozdoba", twarz: "G1", kolor: KOLOR.krew, ozdoba: true },
    { nazwa: "ozdoba", twarz: "Reze", kolor: KOLOR.kosc, ozdoba: true }, // czapka krew ginęła na kuli hot (1. podgląd)
    { nazwa: "ozdoba", twarz: "Toji", kolor: KOLOR.kosc, ozdoba: true },
  ];
  // Prezenty: tyle, ile pozycji w widoku Produkty na cybersora.pl (stan 16.11). Znaczniki i opisy przepisane ze strony, kolejność od lewej do prawej pod choinką.
  const PRODUKTY = [
    { nazwa: "SoraPDF", tag: "Windows · wkrótce", opis: "Łączy, dzieli, obraca i zmniejsza PDF-y. Prościej niż w kombajnach." },
    { nazwa: "DancyCloud", tag: "gra · online", opis: "Strzelanka, w której unikasz linijek naszego kodu. Bossowie, sklep i ranking." },
    { nazwa: "Pycodemath", tag: "Python · MIT", opis: "Matematyka dla programistów i agentów AI: wzór zamienia w sprawdzony kod." },
    { nazwa: "SoraEbookReader", tag: "premiera · 8 listopada 2026", opis: "Nasz czytnik e-booków i mang. Wszystko działa na Twoim komputerze, bez internetu." },
    { nazwa: "SalonDesk", tag: "działa u klienta na co dzień", opis: "Program dla salonu beauty, zrobiony na zamówienie. Wszystko działa na komputerze salonu, bez internetu." },
    { nazwa: "SoraFoto", tag: "Windows · wkrótce", opis: "Usuwa lokalizację GPS ze zdjęć, porządkuje nazwy i sortuje po dacie." },
    { nazwa: "SoraShot", tag: "Windows · wkrótce", opis: "Sam zamazuje maile, numery i nazwiska na zrzutach ekranu, zanim je wyślesz." },
    { nazwa: "Twój program", tag: "na zamówienie", opis: "Potrzebujesz programu pod swoją firmę? Napisz, co ma robić. Cenę podajemy z góry." },
  ];

  // ================= POZIOMY JAKOŚCI =================
  const POZIOMY = [
    { nazwa: "wysoka", galazki: 1, zarowki: 4200, dpr: 2, snieg: 1100, odb: 0.5, odbGal: 0.36 },  // odb: rozdzielczość odbicia w podłodze (ułamek ekranu), odbGal: ile gałązek w odbiciu
    { nazwa: "średnia", galazki: 0.6, zarowki: 2200, dpr: 1.5, snieg: 700, odb: 0.35, odbGal: 0.2 },
    { nazwa: "niska", galazki: 0.36, zarowki: 1000, dpr: 1, snieg: 400, odb: 0, odbGal: 0 },        // najniższy poziom: sama plama światła, bez odbicia
  ];
  const telefon = Math.min(innerWidth, innerHeight) < 700 || (window.matchMedia && matchMedia("(pointer: coarse)").matches);
  const wym = /poziom=(\d)/.exec(FLAGI);
  let poziom = wym ? clamp(+wym[1], 0, 2) : (telefon ? 1 : 0);

  const host = document.getElementById("scena");
  let renderer;
  try { renderer = new T.WebGLRenderer({ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: /zrzut/.test(FLAGI) }); }
  catch (e) { bez3D("brak"); return; } // three rzuca „Error creating WebGL context”, gdy getContext zwraca null
  host.appendChild(renderer.domElement);
  const scena = new T.Scene();
  scena.background = new T.Color(KOLOR.ink);
  const FOV = 36;
  const kamera = new T.PerspectiveCamera(FOV, 1, 0.1, 120);
  const U = { uT: { value: 0 }, uSw: { value: 1 }, uPoziom: { value: 0 }, uLid: { value: new T.Vector2() } }; // wspólne: czas, żarówki wł., poziom dźwięku, ugięcie przewodnika (wierzchołka)
  // v5.2: stan ruchu w teksturze 1024×1. Pole 0 = zero, dalej gałęzie (ugięcie styczne i pionowe), gałązki pod ozdobami (przesunięcie końca) i przęsła girlandy (wychylenie).
  const STAN_W = 1024, stanDane = new Float32Array(STAN_W * 4), stanTex = new T.DataTexture(stanDane, STAN_W, 1, T.RGBAFormat, T.FloatType);
  stanTex.needsUpdate = true; U.uStan = { value: stanTex };
  U.uZl = { value: new T.Vector4(0, -50, 0, 0) }; // najjaśniejszy otwarty prezent: położenie i moc światła (dla igieł)
  U.uHo = { value: new T.Vector4(0, -50, 0, 0) }; // emiter hologramu jako światło dla górnych gałązek (położenie w świecie, moc)

  // ================= ZORZA (v7, etap 4) =================
  // Dwa przebiegi. (1) Kurtyny liczone w 1/4 rozdzielczości do tekstury: dolna krawędź fałdu ostra, nad nią pionowe promienie,
  // jasność przycięta (bez przepaleń do bieli); kanał alfa niesie natężenie. (2) Na pełnym ekranie: tło z tekstury
  // plus znaki, które spadają kolumnami wzdłuż promieni. Znak zastępuje tło pod sobą (bez mgły pod znakami).
  // Znaki tylko takie, które Geist Mono naprawdę ma (sprawdza testy\etap4.js, test 3); v6 miało ∫ Σ π √ z czcionki zastępczej.
  const atlas = document.createElement("canvas"); atlas.width = atlas.height = 512;
  const GLIFY = ["0", "1", "{", "}", "(", ")", "=", "+", "*", "/", "<", ">", "$", "#", ";", "&"];
  const texGlif = new T.CanvasTexture(atlas); texGlif.minFilter = T.LinearFilter; texGlif.generateMipmaps = false;
  function rysujAtlas() {
    const c = atlas.getContext("2d"); c.fillStyle = "#000"; c.fillRect(0, 0, 512, 512);
    c.fillStyle = "#fff"; c.textAlign = "center"; c.textBaseline = "middle"; c.font = '500 84px "Geist Mono", ui-monospace, Consolas, monospace';
    GLIFY.forEach((g, i) => c.fillText(g, (i % 4) * 128 + 64, Math.floor(i / 4) * 128 + 68));
    texGlif.needsUpdate = true;
  }
  rysujAtlas();
  if (document.fonts && document.fonts.load) document.fonts.load('500 84px "Geist Mono"').then(rysujAtlas).catch(() => {});
  const GLSL_SZUM = `
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(h21(i), h21(i+vec2(1.0,0.0)), f.x), mix(h21(i+vec2(0.0,1.0)), h21(i+vec2(1.0,1.0)), f.x), f.y); }`;
  const zorzaRT = new T.WebGLRenderTarget(4, 4, { depthBuffer: false, generateMipmaps: false });
  const zorzaKam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), zorzaScena = new T.Scene();
  const zorzaMat = new T.ShaderMaterial({ // przebieg 1: kurtyny (1/4 rozdzielczości)
    depthTest: false, depthWrite: false,
    uniforms: { uT: { value: 0 }, uAsp: { value: 1.6 }, uBoost: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: `
      precision highp float;
      ${GLSL_PALETA}
      varying vec2 vUv; uniform float uT, uAsp, uBoost;
      ${GLSL_SZUM}
      float kurtyny(vec2 uv){
        float t = uT, x = uv.x * uAsp, I = 0.0;
        for(int k=0;k<2;k++){
          float fk = float(k);
          // dolna krawędź kurtyny: fałdy w kilku skalach, płyną powoli
          float a1 = x * 2.3 + t * 0.09 + fk * 2.0, a2 = x * 5.3 - t * 0.13 + fk * 4.1;
          float y0 = 0.70 - 0.13 * fk + 0.05 * sin(a1) + 0.022 * sin(a2) + (vn(vec2(x * 1.6 + fk * 5.0, t * 0.05)) - 0.5) * 0.08;
          float stroma = abs(0.115 * cos(a1) + 0.117 * cos(a2));      // w zgięciu fałdu kurtyna jest widziana z boku: jaśniej
          float d = uv.y - y0;
          float kr = smoothstep(-0.012, 0.004, d);
          // promienie: cienkie pionowe smugi w grupach (odcinki kurtyny), każda innej długości; dryfują powoli w bok
          float xs = x * (42.0 + fk * 9.0) + fk * 31.0 + 1.5 * sin(x * 1.7 + t * 0.07);
          float grupa = smoothstep(0.3, 0.75, vn(vec2(x * 2.4 + fk * 7.0, t * 0.06)));
          float pr = pow(vn(vec2(xs, t * 0.1)), 4.0) * 2.2 * grupa;
          float dl = 1.8 + 4.5 * vn(vec2(xs * 0.5 + 3.0, fk));                    // długość promienia
          I += kr * (0.05 * exp(-max(d, 0.0) * 16.0) + pr * (0.6 + stroma * 3.5) * exp(-max(d, 0.0) * (dl + fk))) * (1.0 - 0.5 * fk); // druga, niższa kurtyna słabsza: bez ściany za drzewem
        }
        return I;
      }
      void main(){
        float I = min(kurtyny(vUv) * (1.0 + uBoost * 1.3), 1.7);          // przycięte: przy głośnej muzyce zorza jaśnieje, ale nie bieleje
        vec3 c = mix(KREW, HOT, smoothstep(0.25, 0.95, I)); c = mix(c, KOSC, 0.3 * smoothstep(1.0, 1.7, I));
        gl_FragColor = vec4(c * I * 0.42, I / 1.7);                       // najjaśniej ok. 0,7 krwi/hot: daleko od bieli
      }`,
  });
  { const q = new T.Mesh(new T.PlaneGeometry(2, 2), zorzaMat); q.frustumCulled = false; zorzaScena.add(q); }
  const zorzaZnakiMat = new T.ShaderMaterial({ // przebieg 2: pełny ekran, tło z tekstury i spadające znaki
    depthTest: false, depthWrite: false,
    uniforms: { uT: zorzaMat.uniforms.uT, uRes: { value: new T.Vector2(1280, 800) }, uCell: { value: 22 }, uZ: { value: zorzaRT.texture }, uGlyph: { value: texGlif }, uZnaki: { value: 1 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }",
    fragmentShader: `
      precision highp float;
      ${GLSL_PALETA}
      varying vec2 vUv; uniform float uT, uCell, uZnaki; uniform vec2 uRes; uniform sampler2D uZ, uGlyph;
      ${GLSL_SZUM}
      void main(){
        vec3 baza = texture2D(uZ, vUv).rgb;
        vec2 cells = uRes / uCell;
        float kol = floor(vUv.x * cells.x);
        float sp = 0.7 + 1.5 * h21(vec2(kol, 3.1));                    // każda kolumna spada własnym tempem
        float yy = vUv.y * cells.y + uT * sp;
        vec2 id = vec2(kol, floor(yy)), f = vec2(fract(vUv.x * cells.x), fract(yy));
        vec2 sc = vec2((kol + 0.5) / cells.x, (id.y + 0.5 - uT * sp) / cells.y); // środek komórki na ekranie
        float Ic = texture2D(uZ, sc).a * 1.7;
        float jest = step(0.38, h21(id + 7.3)) * uZnaki;              // przerwy w kolumnie: znaki jadą ciągami, nie pełną ścianą
        float gi = floor(h21(id + floor(uT * 0.4 * (0.3 + h21(id.yx)))) * 16.0);
        vec2 gc = vec2(mod(gi, 4.0), floor(gi / 4.0));
        float gl = texture2D(uGlyph, (gc + vec2(f.x, 1.0 - f.y)) / 4.0).r;
        float ga = gl * smoothstep(0.16, 0.6, Ic) * jest;
        vec3 gk = mix(KREW, HOT, smoothstep(0.3, 0.9, Ic)); gk = mix(gk, KOSC, smoothstep(0.9, 1.5, Ic));
        gl_FragColor = vec4(mix(baza, gk, ga * 0.95), 1.0);
      }`,
  });
  const zorza = new T.Mesh(new T.PlaneGeometry(2, 2), zorzaZnakiMat);
  zorza.frustumCulled = false; zorza.renderOrder = -10; scena.add(zorza);
  let zorzaCzas = null, zorzaBoost = null; // testy: zatrzymany czas zorzy, wymuszone wzmocnienie (jak przy głośnej muzyce)

  // ================= TŁO v9 (T1): ściana z bloków i jedno duże okno =================
  // Płaszczyzna za drzewem. Poza oknem: cegły panel/noc. Okno: klockowa rama i krzyż szprosów z bloków (linia + noc), za szybą krajobraz z bloków
  // rysowany raz na płótnie (makieta: krajobraz()). Niebo krajobrazu jest przezroczyste (discard), więc zorza z kodu i jej znaki widać tylko w oknie.
  // Zorza testuje głębię: tam, gdzie stoi ściana, jej przebieg 2 nie liczy się wcale (koszt klatki nie rośnie o pełny ekran).
  const OKNO = { x0: -10.5, x1: 10.5, y0: 2.4, y1: 14.2, B: 0.64, z: -13 };
  const krajC = document.createElement("canvas"); krajC.width = 512; krajC.height = 312;
  (function krajobraz() { // bloki 8 px: 64 × 39 bloków na szybę; niebo zostaje puste
    const g = krajC.getContext("2d"), B = 8, kol = 64, wier = 39, Rk = mulberry(5), C = { panel: hex6(KOLOR.panel), noc: hex6(KOLOR.noc), linia: hex6(KOLOR.linia), ink: hex6(KOLOR.ink), kosc: hex6(KOLOR.kosc), krew: hex6(KOLOR.krew), hot: hex6(KOLOR.hot) };
    const blok = (cx, cy, c, a = 1) => { g.globalAlpha = a; g.fillStyle = c; g.fillRect(cx * B, cy * B, B, B); g.globalAlpha = 1; };
    const mx = 52, my = 6; // księżyc z bloków
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) if (a * a + b * b <= 5) blok(mx + a, my + b, C.kosc);
    blok(mx - 1, my, C.linia); blok(mx + 1, my + 1, C.linia);
    const plany = [[0.6, C.panel, 0.07, 7], [0.7, C.noc, 0.08, 5], [0.8, C.linia, 0.05, 4]], wys = [];
    plany.forEach(([baza, c, amp, okres], pi) => {
      const h = [];
      for (let x = 0; x < kol; x++) {
        h[x] = Math.floor(wier * (baza - amp * (Math.sin(x / okres + 5 * (pi + 1)) + 0.6 * Math.sin(x / (okres * 0.47) + pi))));
        for (let y = h[x]; y < wier; y++) blok(x, y, c);
        blok(x, h[x], C.kosc, pi === 2 ? 1 : 0.55 + pi * 0.15); // śnieg na wierzchu
        if (pi === 2 && Rk() < 0.3) blok(x, h[x] + 1, C.kosc, 0.5);
      }
      wys.push(h);
    });
    const choinka = (x, h, c) => { // choinki z klocków na dalszych planach
      const pod = wys[c][x]; if (pod === undefined) return;
      blok(x, pod - 1, C.noc);
      for (let r = 0; r < h; r++) { const sz = Math.floor((h - r) / 2); for (let d = -sz; d <= sz; d++) blok(x + d, pod - 2 - r, C.ink); if (r % 2 === 0) { blok(x - sz, pod - 2 - r, C.kosc, 0.85); blok(x + sz, pod - 2 - r, C.kosc, 0.85); } }
      blok(x, pod - 2 - h, C.kosc);
    };
    for (let i = 1; i < kol; i += 3 + Math.floor(Rk() * 4)) choinka(i, 4 + Math.floor(Rk() * 3), Rk() < 0.5 ? 1 : 2);
    const hx = 9, hp = wys[2][hx + 3]; // chatka z zapalonymi oknami, na lewo od drzewa
    for (let a = 0; a < 7; a++) for (let b = 1; b <= 4; b++) blok(hx + a, hp - b, C.noc);
    for (let r = 0; r < 4; r++) for (let a = r; a < 7 - r; a++) blok(hx + a, hp - 5 - r, r === 0 ? C.kosc : C.krew);
    blok(hx + 2, hp - 3, C.hot); blok(hx + 4, hp - 3, C.hot); blok(hx + 2, hp - 2, C.hot, 0.7); blok(hx + 4, hp - 2, C.hot, 0.7);
    for (let i = 0; i < 26; i++) blok(Math.floor(Rk() * kol), Math.floor(Rk() * wier * 0.55), C.kosc, 0.35 + Rk() * 0.5); // płatki
    g.fillStyle = C.kosc; g.globalAlpha = 0.9; g.fillRect(0, krajC.height - 3, krajC.width, 3); g.globalAlpha = 1; // śnieg na parapecie, od środka szyby
  })();
  const texKraj = new T.CanvasTexture(krajC); texKraj.magFilter = T.NearestFilter; texKraj.minFilter = T.LinearFilter; texKraj.generateMipmaps = false;
  const sciana = new T.Mesh(new T.PlaneGeometry(90, 44), new T.ShaderMaterial({
    uniforms: { uKraj: { value: texKraj }, uOkno: { value: new T.Vector4(OKNO.x0, OKNO.y0, OKNO.x1, OKNO.y1) }, uB: { value: OKNO.B }, uSw: U.uSw },
    vertexShader: "varying vec2 vP; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vP = wp.xy; gl_Position = projectionMatrix * viewMatrix * wp; }",
    fragmentShader: `
      precision highp float;
      ${GLSL_PALETA}
      const vec3 PANEL = vec3(0.090, 0.090, 0.114), NOC = vec3(0.118, 0.118, 0.149);
      uniform sampler2D uKraj; uniform vec4 uOkno; uniform float uB, uSw; varying vec2 vP;
      vec3 blok(vec2 p){ vec2 f = fract((p - uOkno.xy) / uB); return (min(f.x, f.y) < 0.07 || max(f.x, f.y) > 0.93) ? LINIA : NOC; } // blok ramy: obrys linią, środek nocą
      void main(){
        vec2 p = vP, s = (uOkno.xy + uOkno.zw) * 0.5; vec3 c;
        bool szyba = all(greaterThan(p, uOkno.xy)) && all(lessThan(p, uOkno.zw));
        bool rama = all(greaterThan(p, uOkno.xy - uB)) && all(lessThan(p, uOkno.zw + uB));
        if (szyba) {
          if (abs(p.x - s.x) < uB * 0.5 || abs(p.y - s.y) < uB * 0.5) c = blok(p - vec2(uB * 0.5, uB * 0.5)); // krzyż szprosów
          else { vec4 k = texture2D(uKraj, (p - uOkno.xy) / (uOkno.zw - uOkno.xy)); if (k.a < 0.5) discard; c = k.rgb * 0.5; } // K5 maisy (19.11): miasto w szybie na pół jasności, nie ciągnie wzroku przed h1
        } else if (rama) c = blok(p);
        else { // cegły: 1,2 × 0,6, co drugi rząd przesunięty o pół; spoina nocą
          float r = floor(p.y / 0.6); vec2 f = fract(vec2(p.x / 1.2 + 0.5 * mod(r, 2.0), p.y / 0.6));
          c = (f.x < 0.04 || f.y < 0.08) ? NOC : PANEL;
          c = mix(INK, c, smoothstep(0.0, 0.7, p.y));                         // listwa przy podłodze
        }
        float d = length((p - vec2(0.0, 5.0)) * vec2(0.8, 1.0));                // poświata drzewa na ścianie: słaba, bez rozmycia (zwykła funkcja odległości)
        c += mix(KOSC, HOT, 0.3) * uSw * 0.05 * exp(-d * 0.18) * (szyba ? 0.3 : 1.0);
        gl_FragColor = vec4(c, 1.0);
      }`,
  }));
  sciana.position.set(0, 22, OKNO.z); sciana.renderOrder = -11; scena.add(sciana);
  zorzaZnakiMat.depthTest = true; // zorza (z = 1, za wszystkim) rysuje się tylko tam, gdzie ściana nie zapisała głębi: w szybie

  // ================= ŚRODOWISKO DLA ODBIĆ BOMBEK: budowane niżej z rozkładu żarówek i pasa zorzy (budujOtoczenie) =================
  const pmrem = new T.PMREMGenerator(renderer);
  const envTex = null; // materiały dostają mapę po zbudowaniu drzewa (przed pierwszą klatką, więc bez ponownej kompilacji)

  // ================= ŚWIATŁA (stoją w miejscu; kręci się choinka) =================
  const KLUCZ = new T.Vector3(-7, 14, 9).normalize();
  const klucz = new T.DirectionalLight(KOLOR.kosc, 1.9); klucz.position.copy(KLUCZ).multiplyScalar(20);
  const rimKrew = new T.DirectionalLight(KOLOR.krew, 5.5); rimKrew.position.set(8, 7, -10);
  const rimHot = new T.DirectionalLight(KOLOR.hot, 2.8); rimHot.position.set(-9, 6, -8);
  const wyp = new T.DirectionalLight(KOLOR.kosc, 0.35); wyp.position.set(6, 3, 12);
  [klucz, rimKrew, rimHot, wyp].forEach((l) => { l.target.position.set(0, 5, 0); scena.add(l); scena.add(l.target); });
  scena.add(new T.HemisphereLight(KOLOR.linia, KOLOR.ink, 0.7));

  // ================= CHOINKA: szkielet =================
  // pień → okółki → gałęzie (wznoszą się i opadają na końcu) → odgałęzienia → gałązki z igłami.
  const WYS = 10.4, Y0 = 2.55, R0 = 4.0, OKOLKI = 17; // korona zaczyna się wyżej: pod spodem jest miejsce na prezenty
  const profil = (y) => lerp(R0, 0.3, Math.pow(clamp((y - Y0) / (WYS - Y0), 0, 1), 0.85));
  // v6: ugięcie przewodnika. Wierzchołek (od Y_LID0 w górę) gnie się jak wspornik i bierze ze sobą wszystko, co na nim siedzi:
  // igły, żarówki, koraliki, zaczepy ozdób i emiter hologramu. To samo pole w shaderach i w JS (poleDjs), więc nic się nie rozjeżdża.
  const Y_LID0 = WYS - 2.6, Y_LID1 = WYS + 0.5;
  const GLSL_POLE = `
    uniform vec2 uLid;
    vec3 poleD(vec3 p, float h){
      float s = clamp((p.y - ${Y_LID0.toFixed(3)}) / ${(Y_LID1 - Y_LID0).toFixed(3)}, 0.0, 1.0);
      return vec3(uLid.x, 0.0, uLid.y) * (s * s);
    }
    // v5.2: każda gałąź ma własny stan (x: ugięcie styczne końca, y: pionowe). Gałąź gnie się jak wspornik: przy pniu stoi, koniec rusza się najmocniej.
    uniform sampler2D uStan;
    vec4 stanG(float pole){ return texture2D(uStan, vec2((pole + 0.5) / ${STAN_W}.0, 0.5)); }
    vec3 poleG(vec3 p, float pole, float s){
      vec4 st = stanG(pole);
      vec2 e = p.xz / max(length(p.xz), 1e-3);
      return vec3(e.y * st.x, st.y, -e.x * st.x) * (s * s);
    }`;
  const choinka = new T.Group(); scena.add(choinka);
  const GORA = new T.Vector3(0, 1, 0);
  const galazki = []; // { b: Vector3 (nasada), d: Vector3 (kierunek), len, rho, gal: numer gałęzi, s0/s1: odległość nasady i końca od pnia w długościach gałęzi }
  const konce = [];   // końce gałęzi: miejsca na bombki { p, t, glowny, k, a }
  const galezie = [null]; // gałęzie z własnym ruchem: { L, k }; numer 0 = brak ruchu (gęsty wierzchołek przy pniu)
  let biezGal = 0;
  const v1 = new T.Vector3(), v2 = new T.Vector3(), v3 = new T.Vector3();
  function dodajGalazke(p, d, len) {
    const mx = p.x + d.x * len * 0.5, my = p.y + d.y * len * 0.5, mz = p.z + d.z * len * 0.5;
    const g = { b: p.clone(), d: d.clone().normalize(), len, rho: clamp(Math.hypot(mx, mz) / profil(my), 0, 1.15), gal: biezGal, s0: 0, s1: 0 };
    if (biezGal) { const Lg = galezie[biezGal].L; g.s0 = Math.min(Math.hypot(p.x, p.z) / Lg, 1.25); g.s1 = Math.min(Math.hypot(p.x + g.d.x * len, p.z + g.d.z * len) / Lg, 1.25); }
    galazki.push(g); return g;
  }
  // pęd: krzywa od punktu o, w poziomie wzdłuż h, długość L; zwraca punkt i styczną dla odległości s (0..1)
  function ped(o, h, L, wznios, opad) {
    return (s, P, Tn) => {
      P.copy(o).addScaledVector(h, L * s).addScaledVector(GORA, L * (wznios * s - opad * s * s));
      Tn.copy(h).addScaledVector(GORA, wznios - 2 * opad * s).normalize();
    };
  }
  function obsadz(krzywa, L, h, od, krok, dlOd, dlDo) {
    const bok = v3.crossVectors(GORA, h).normalize().clone();
    const P = new T.Vector3(), Tn = new T.Vector3(), d = new T.Vector3();
    for (let dist = od; dist < L; dist += krok * (0.85 + R() * 0.3)) {
      const s = dist / L; krzywa(s, P, Tn);
      for (const zn of [-1, 1]) {
        const beta = (50 + (R() - 0.5) * 26) * Math.PI / 180;
        d.copy(Tn).multiplyScalar(Math.cos(beta)).addScaledVector(bok, zn * Math.sin(beta)).addScaledVector(GORA, -0.2 + (R() - 0.5) * 0.25);
        dodajGalazke(P, d, lerp(dlOd, dlDo, s) * (0.85 + R() * 0.3));
      }
      if (R() < 0.4) { // puch na wierzchu gałęzi
        d.copy(Tn).multiplyScalar(0.75).addScaledVector(GORA, 0.45 + R() * 0.3).addScaledVector(bok, (R() - 0.5) * 0.8);
        dodajGalazke(P, d, 0.42 + R() * 0.2);
      }
    }
    krzywa(1, P, Tn); const gk = dodajGalazke(P, Tn, dlDo * 1.15);
    return { p: P.clone(), t: Tn.clone(), g: gk };
  }
  function galaz(y, a, L, wznios, opad, k, zOdgalezieniami) {
    const o = new T.Vector3(0, y, 0), h = new T.Vector3(Math.cos(a), 0, Math.sin(a));
    biezGal = galezie.length; galezie.push({ L, k });
    const krzywa = ped(o, h, L, wznios, opad);
    const kon = obsadz(krzywa, L, h, 0.5, 0.2, 0.95, 0.6);
    konce.push({ ...kon, glowny: true, k, a });
    if (!zOdgalezieniami) return;
    const bok = new T.Vector3().crossVectors(GORA, h).normalize();
    const P = new T.Vector3(), Tn = new T.Vector3();
    for (let dist = 0.9; dist < L - 0.45; dist += 0.62 * (0.85 + R() * 0.3)) {
      krzywa(dist / L, P, Tn);
      for (const zn of [-1, 1]) {
        const kat = (42 + (R() - 0.5) * 16) * Math.PI / 180;
        const hs = new T.Vector3().copy(h).multiplyScalar(Math.cos(kat)).addScaledVector(bok, zn * Math.sin(kat)).normalize();
        const Ls = Math.min((L - dist) * 0.55 + 0.35, 1.9) * (0.85 + R() * 0.3);
        const ks = obsadz(ped(P.clone(), hs, Ls, 0.04, 0.3), Ls, hs, 0.28, 0.22, 0.72, 0.5);
        konce.push({ ...ks, glowny: false, k, a });
      }
    }
  }
  for (let k = 0; k < OKOLKI; k++) {
    const u = k / (OKOLKI - 1), y = lerp(Y0, WYS - 0.5, Math.pow(u, 0.95));
    const ile = Math.round(lerp(14, 7, u)), przes = R() * Math.PI * 2;
    for (let g = 0; g < ile; g++) {
      const a = przes + (g / ile) * Math.PI * 2 + (R() - 0.5) * 0.14;
      galaz(y + (R() - 0.5) * 0.16, a, profil(y) * (0.86 + R() * 0.26), lerp(0.16, 0.6, u), lerp(0.4, 0.22, u), k, true);
    }
    if (k < OKOLKI - 1) { // krótsze gałęzie między okółkami: wypełniają środek, piętra zostają czytelne
      const y2 = lerp(y, lerp(Y0, WYS - 0.5, Math.pow((k + 1) / (OKOLKI - 1), 0.95)), 0.5), ile2 = Math.max(4, Math.round(ile * 0.6)), p2 = R() * Math.PI * 2;
      for (let g = 0; g < ile2; g++) galaz(y2 + (R() - 0.5) * 0.2, p2 + (g / ile2) * Math.PI * 2 + (R() - 0.5) * 0.3, profil(y2) * (0.5 + R() * 0.16), lerp(0.2, 0.6, u), lerp(0.3, 0.2, u), k, false);
    }
  }
  biezGal = 0;
  for (let i = 0; i < 44; i++) { // przewodnik: gęsty wierzchołek, żeby pień nie prześwitywał
    const a = i * 2.39996, f = i / 43, n = lerp(1.5, 0.3, f);
    dodajGalazke(v1.set(0, lerp(WYS - 2.6, WYS + 0.05, f), 0), v2.set(Math.cos(a) * n, 1, Math.sin(a) * n), lerp(0.85, 0.5, f) * (0.85 + R() * 0.3));
  }
  dodajGalazke(v1.set(0, WYS - 0.1, 0), v2.set(0, 1, 0), 0.6);
  for (let i = galazki.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const tmp = galazki[i]; galazki[i] = galazki[j]; galazki[j] = tmp; }
  const MAKS_GALAZEK = 8000;
  if (galazki.length > MAKS_GALAZEK) galazki.length = MAKS_GALAZEK; // potasowane: każdy początek listy to równa próbka drzewa
  const NG = galazki.length;

  // ---------- miejsca na ozdoby (etap 2): wybierane przed zbudowaniem igieł, bo każda ozdoba wycina sobie w koronie gniazdo na kołysanie ----------
  const R2 = mulberry(20261224);
  const G_FIZ = 16, sinS = (st) => Math.sin(st * Math.PI / 180), S35 = sinS(35);
  const L_OUT = S35, L_IN = sinS(18), L_T = sinS(26); // granice wychylenia (sinus kąta): na zewnątrz, do środka korony, w bok
  const LUZ_GNIAZDA = 0.12;                           // tyle wolnego miejsca zostaje między ozdobą a pędem najbliższej gałązki
  const PROG_SPOCZ = 0.1, PROG_RUCH = 0.05;           // progi testu przenikania: spoczynek i skrajne wychylenie
  // punkty na pędach gałązek w siatce przestrzennej: nimi mierzę odstęp ozdoby od korony
  const KOM = 0.5, siatkaG = new Map(), kluczG = (x, y, z) => (x + 64) | ((y + 64) << 8) | ((z + 64) << 16);
  const wyciete = new Uint8Array(NG), kotwica = new Uint8Array(NG);
  galazki.forEach((g, i) => {
    g.nr = i; g.jest = true;
    for (let s = 0; s <= 4; s++) {
      const t = (s / 4) * g.len, x = g.b.x + g.d.x * t, y = g.b.y + g.d.y * t, z = g.b.z + g.d.z * t;
      const k = kluczG(Math.floor(x / KOM), Math.floor(y / KOM), Math.floor(z / KOM));
      let l = siatkaG.get(k); if (!l) siatkaG.set(k, (l = [])); l.push(x, y, z, i);
    }
  });
  function odstep(cx, cy, cz, r, zbior) { // odległość powierzchni kuli od najbliższego pędu; „zbior” zbiera gałązki bliższe niż LUZ_GNIAZDA
    const R = r + 0.2, x0 = Math.floor((cx - R) / KOM), x1 = Math.floor((cx + R) / KOM), y0 = Math.floor((cy - R) / KOM), y1 = Math.floor((cy + R) / KOM), z0 = Math.floor((cz - R) / KOM), z1 = Math.floor((cz + R) / KOM);
    let naj = 9;
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      const l = siatkaG.get(kluczG(x, y, z)); if (!l) continue;
      for (let n = 0; n < l.length; n += 4) {
        if (wyciete[l[n + 3]]) continue;
        const d = Math.hypot(l[n] - cx, l[n + 1] - cy, l[n + 2] - cz) - r;
        if (d < naj) naj = d; if (zbior && d < LUZ_GNIAZDA) zbior.add(l[n + 3]);
      }
    }
    return naj;
  }
  // odstęp ozdoby od korony w pozie (xr: wychylenie wzdłuż promienia, xt: wzdłuż stycznej)
  function odstepPozy(w, xr, xt, zbior) {
    const x = w.erx * xr + w.erz * xt, z = w.erz * xr - w.erx * xt, c = Math.sqrt(Math.max(0, 1 - x * x - z * z));
    let naj = 9;
    for (const q of w.kule) naj = Math.min(naj, odstep(w.A.x + x * q.o, w.A.y - c * q.o, w.A.z + z * q.o, q.r, zbior));
    return naj;
  }
  const POZY = [[0, 0]]; // spoczynek, potem połowa i pełne wychylenie w 8 kierunkach
  for (const f of [0.5, 1]) {
    POZY.push([L_OUT * f, 0], [-L_IN * f, 0], [0, L_T * f], [0, -L_T * f]);
    for (const a of [L_OUT, -L_IN]) for (const b of [L_T, -L_T]) { const m = Math.hypot(a, b), s = (m > S35 ? S35 / m : 1) * f; POZY.push([a * s, b * s]); }
  }
  function nowaOzdoba(kon, typ, r, L, kule, o, rHit, limit) {
    if (!kon.g.jest || wyciete[kon.g.nr]) return null;
    const A = new T.Vector3().copy(kon.p).addScaledVector(kon.t, kon.odl !== undefined ? kon.odl : (kon.glowny ? 0.64 : 0.53)); // zaczep przy samym końcu gałązki
    const rr = Math.hypot(A.x, A.z); if (rr < 0.25) return null;
    const w = { A, rr, erx: A.x / rr, erz: A.z / rr, typ, r, L, kule, o, rHit, kon, lOut: L_OUT, lIn: L_IN, lT: L_T, los: R2() }; // los: ziarno rozrzutu tej ozdoby (tłumienie, okres, bezwładność)
    const zb = new Set(); for (const [a, b] of POZY) odstepPozy(w, a, b, zb);
    if (zb.size > limit || zb.has(kon.g.nr)) return null; // gniazdo nie może być za duże ani zabrać gałązki, na której ozdoba wisi
    for (const nr of zb) if (kotwica[nr]) return null;       // ani gałązki, na której wisi inna ozdoba
    w.gniazdo = zb; return w;
  }
  const sople = [], male = [], duze = [];
  const ciasno = (w, zapas) => [sople, male, duze].some((l) => l.some((u) => Math.hypot(u.A.x - w.A.x, u.A.y - u.o - (w.A.y - w.o), u.A.z - w.A.z) < u.rHit + w.rHit + zapas));
  const osadz = (w, lista) => { for (const nr of w.gniazdo) wyciete[nr] = 1; kotwica[w.kon.g.nr] = 1; w.kon.zajety = true; lista.push(w); };
  const glowne = konce.filter((k) => k.glowny);
  const RB = 0.42, WP = [4, 7, 9, 6], OKOLKI_GIRLANDY = [2, 5, 8, 11, 14]; // duże bombki wiszą na innych piętrach niż girlanda, żeby koraliki nie zasłaniały nazw
  let wymuszone = 0;
  PROJEKTY.forEach((p, i) => {
    const cel = i * (Math.PI * 2 / PROJEKTY.length) + 0.3, L = RB + 0.34, kule = [{ o: L, r: RB * 1.16 }];
    const kand = glowne.filter((k) => !k.zajety && k.g.jest && !OKOLKI_GIRLANDY.includes(k.k))
      .map((k) => ({ k, d: Math.abs(Math.atan2(Math.sin(k.a - cel), Math.cos(k.a - cel))) + Math.abs(k.k - WP[i]) * 10 }))
      .sort((a, b) => a.d - b.d);
    let w = null;
    for (const { k } of kand) { w = nowaOzdoba(k, 2, RB, L, kule, L, RB, 9999); if (w && !ciasno(w, 0.5)) break; w = null; }
    if (!w) { wymuszone++; w = nowaOzdoba(kand[0].k, 2, RB, L, kule, L, RB, 9999); }
    w.projekt = p; osadz(w, duze);
  });
  // v11: ozdoby z pikselowymi buźkami (F1, G1 z v9 oraz Reze i Toji w czapkach Mikołaja), mniejsze od bombek ekipy, bez nicku i opaski.
  // Wiszą w połowie drogi między bombkami ekipy i na innych piętrach, żeby z kamery domyślnej nie stawały przed nickami.
  const RO = 0.3, WO = [10, 6, 12, 4]; // G1 na 6, nie na 3: na najniższym piętrze obrót 90° bujał nią 14,5° i 5,5 s (etap2/etap52: ≤ 14°, ≤ 5 s)
  OZDOBY_POST.forEach((p, i) => {
    const cel = i * (Math.PI * 2 / OZDOBY_POST.length) + 0.3 + Math.PI / OZDOBY_POST.length, L = RO + 0.3, kule = [{ o: L, r: RO * 1.16 }];
    const kand = glowne.filter((k) => !k.zajety && k.g.jest && !OKOLKI_GIRLANDY.includes(k.k))
      .map((k) => ({ k, d: Math.abs(Math.atan2(Math.sin(k.a - cel), Math.cos(k.a - cel))) + Math.abs(k.k - WO[i]) * 10 }))
      .sort((a, b) => a.d - b.d);
    let w = null;
    for (const { k } of kand) { w = nowaOzdoba(k, 2, RO, L, kule, L, RO, 9999); if (w && !ciasno(w, 0.4)) break; w = null; }
    if (!w) { wymuszone++; w = nowaOzdoba(kand[0].k, 2, RO, L, kule, L, RO, 9999); }
    w.projekt = p; osadz(w, duze);
  });
  const OZDOBY = [KOLOR.krew, KOLOR.kosc, KOLOR.krew, KOLOR.hot, KOLOR.kosc, KOLOR.ink];
  const LICZBA_MALYCH = 116, LICZBA_SOPLI = 28;
  const kolejka = konce.filter((k) => !k.zajety && k.g.jest); // każdy koniec gałęzi próbuję raz, w losowej kolejności
  for (let i = kolejka.length - 1; i > 0; i--) { const j = Math.floor(R2() * (i + 1)), t = kolejka[i]; kolejka[i] = kolejka[j]; kolejka[j] = t; }
  { // końców gałęzi jest za mało na 150 ozdób, więc po nich idą końce zewnętrznych gałązek (brzeg korony, nie sterczące w górę)
    const brzeg = galazki.filter((g) => g.rho > 0.9 && g.d.y < 0.25 && !konce.some((k) => k.g === g)).map((g) => ({ p: g.b, t: g.d, g, odl: g.len * 0.93, glowny: false }));
    for (let i = brzeg.length - 1; i > 0; i--) { const j = Math.floor(R2() * (i + 1)), t = brzeg[i]; brzeg[i] = brzeg[j]; brzeg[j] = t; }
    kolejka.push(...brzeg);
  }
  let nrK = 0, odrzucone = 0;
  for (; nrK < kolejka.length && sople.length < LICZBA_SOPLI; nrK++) { // sople najpierw: potrzebują najmniej miejsca
    const kon = kolejka[nrK], dl = 0.28 + R2() * 0.26, s0 = 0.1;
    const w = nowaOzdoba(kon, 0, 0.03, s0 + dl * 0.4, [{ o: s0 + dl * 0.2, r: 0.04 }, { o: s0 + dl * 0.55, r: 0.03 }, { o: s0 + dl * 0.95, r: 0.02 }], s0 + dl * 0.5, 0.1, 12);
    if (w && !ciasno(w, 0.2)) { w.dl = dl; w.s0 = s0; osadz(w, sople); } else odrzucone++;
  }
  for (; nrK < kolejka.length && male.length < LICZBA_MALYCH; nrK++) {
    const kon = kolejka[nrK], r = 0.13 + R2() * 0.07;
    let w = null;
    for (const L of [r + 0.2 + R2() * 0.12, r + 0.45]) { w = nowaOzdoba(kon, 1, r, L, [{ o: L, r }], L, r, 16); if (w && !ciasno(w, 0.28)) break; w = null; }
    if (w) { w.kolor = OZDOBY[male.length % OZDOBY.length]; osadz(w, male); } else odrzucone++;
  }
  let liczbaWycietych = 0;
  for (let i = 0; i < NG; i++) if (wyciete[i]) { galazki[i].rho = 0; liczbaWycietych++; } // wycięta gałązka nie dostaje igieł ani żarówek
  const wahadla = [...sople, ...male, ...duze]; // kolejność = kolejność instancji: sople, małe bombki, duże
  const NB = galezie.length - 1, POLE_O = NB + 1, POLE_S = POLE_O + wahadla.length; // pola tekstury stanu: gałęzie 1..NB, potem gałązki pod ozdobami, potem przęsła girlandy
  wahadla.forEach((w, i) => { w.i = i; w.kon.g.obc = POLE_O + i; }); // gałązka, na której wisi ozdoba, ugina się pod nią

  // ---------- siatka jednej gałązki: oś +Y długości 1, 28 płaskich igieł po spirali, cienki pęd ----------
  const IGIEL = 28;
  function geoGalazki() {
    const pos = [], nor = [];
    const tri = (a, b, c, n) => { pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); for (let i = 0; i < 3; i++) nor.push(n.x, n.y, n.z); };
    const rad = new T.Vector3(), dir = new T.Vector3(), s = new T.Vector3(), n = new T.Vector3();
    const A = new T.Vector3(), B = new T.Vector3(), C = new T.Vector3(), D = new T.Vector3();
    for (let i = 0; i < IGIEL; i++) {
      const t = 0.04 + 0.94 * (i / (IGIEL - 1)), ang = i * 2.39996, poch = (34 + (i % 3) * 6) * Math.PI / 180;
      rad.set(Math.cos(ang), 0, Math.sin(ang));
      dir.copy(rad).multiplyScalar(Math.sin(poch)); dir.y = Math.cos(poch); dir.normalize();
      const len = 0.23 * (1 - 0.3 * t), w = 0.017;
      s.crossVectors(dir, rad).normalize(); n.crossVectors(dir, s).normalize();
      A.set(rad.x * 0.012, t, rad.z * 0.012);
      C.copy(A).addScaledVector(dir, len);
      B.copy(A).addScaledVector(dir, len * 0.38).addScaledVector(s, w);
      D.copy(A).addScaledVector(dir, len * 0.38).addScaledVector(s, -w);
      tri(A, B, C, n); tri(A, C, D, n);
    }
    for (let j = 0; j < 3; j++) { // pęd
      const a0 = (j / 3) * Math.PI * 2, a1 = ((j + 1) / 3) * Math.PI * 2, r = 0.013;
      A.set(Math.cos(a0) * r, 0, Math.sin(a0) * r); B.set(Math.cos(a1) * r, 0, Math.sin(a1) * r);
      C.set(Math.cos(a1) * r * 0.5, 1, Math.sin(a1) * r * 0.5); D.set(Math.cos(a0) * r * 0.5, 1, Math.sin(a0) * r * 0.5);
      n.set(Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2));
      tri(A, C, B, n); tri(A, D, C, n);
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new T.Float32BufferAttribute(nor, 3));
    return g;
  }
  const geoG = geoGalazki();
  const aLit = new T.InstancedBufferAttribute(new Float32Array(NG * 4), 4);  // światło żarówek: nasada (kość, hot), czubek (kość, hot)
  const aInne = new T.InstancedBufferAttribute(new Float32Array(NG * 3), 3); // głębia w koronie, grupa migotania, odcień
  const aGal = new T.InstancedBufferAttribute(new Float32Array(NG * 4), 4);  // gałąź, odległość nasady i końca od pnia, pole gałązki pod ozdobą (0 = brak)
  geoG.setAttribute("aLit", aLit); geoG.setAttribute("aInne", aInne); geoG.setAttribute("aGal", aGal);
  const iglyMat = new T.ShaderMaterial({
    side: T.DoubleSide,
    uniforms: { uT: U.uT, uSw: U.uSw, uPoziom: U.uPoziom, uLid: U.uLid, uStan: U.uStan, uZl: U.uZl, uHo: U.uHo, uKlucz: { value: KLUCZ }, uMoc: { value: 0.85 } },
    vertexShader: `
      attribute vec4 aLit; attribute vec3 aInne; attribute vec4 aGal;
      varying vec3 vN; varying vec3 vW; varying vec2 vLit; varying vec3 vInne;
      ${GLSL_POLE}
      void main(){
        vec4 lp = instanceMatrix * vec4(position, 1.0);
        lp.xyz += poleD(lp.xyz, aInne.z) + poleG(lp.xyz, aGal.x, mix(aGal.y, aGal.z, position.y)) + stanG(aGal.w).xyz * (position.y * position.y);
        vec4 wp = modelMatrix * lp;
        vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        vW = wp.xyz; vInne = aInne;
        vLit = mix(aLit.xy, aLit.zw, clamp(position.y, 0.0, 1.0));
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      precision highp float;
      ${GLSL_PALETA}
      uniform float uT, uSw, uPoziom, uMoc; uniform vec3 uKlucz; uniform vec4 uZl, uHo;
      varying vec3 vN; varying vec3 vW; varying vec2 vLit; varying vec3 vInne;
      void main(){
        vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
        vec3 V = normalize(cameraPosition - vW);
        float gleb = vInne.x;                                   // 0 w środku korony, 1 na brzegu
        float ndl = dot(N, uKlucz);
        float dyf = (0.3 + 0.7 * (ndl * 0.5 + 0.5)) * mix(0.18, 1.0, gleb);
        // czarne igły: odcienie ink, od bardzo ciemnego w głębi do „linii” na oświetlonym brzegu
        vec3 c = mix(INK * 0.3, mix(INK * 0.85, mix(INK, LINIA, 0.55), vInne.z), dyf);
        vec3 H = normalize(uKlucz + V);
        c = mix(c, KOSC, pow(max(dot(N, H), 0.0), 36.0) * 0.14 * gleb);            // połysk od światła kluczowego
        c = mix(c, KREW, pow(1.0 - abs(dot(N, V)), 2.5) * 0.16 * gleb * (1.0 + uPoziom)); // krawędź od zorzy
        // światło żarówek wypieczone przy budowie drzewa
        float g = 0.5 + 0.5 * sin(uT * (0.7 + vInne.y * 0.13) + vInne.y * 1.7);
        float I = (vLit.x + vLit.y) * uSw * uMoc * (0.72 + 0.28 * g) * (1.0 + uPoziom * 0.8);
        vec3 lc = (KOSC * vLit.x + HOT * vLit.y) / max(vLit.x + vLit.y, 1e-4);
        c = mix(c, lc, 1.0 - exp(-I * I * 1.6)); // krzywa z progiem: jasno tuż przy żarówce, dalej czerń
        vec3 dz = vW - uZl.xyz;                    // światło z otwartego prezentu łapie spód najbliższych gałęzi
        c = mix(c, ZLOTO, uZl.w * 0.5 * exp(-dot(dz, dz) * 0.3) * (0.35 + 0.65 * gleb));
        vec3 dh = vW - uHo.xyz;                    // emiter hologramu świeci na najwyższe gałązki
        c = mix(c, HOT, uHo.w * exp(-dot(dh, dh) * 1.4) * (0.3 + 0.7 * gleb));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const igly = new T.InstancedMesh(geoG, iglyMat, NG);
  {
    const m4 = new T.Matrix4(), q = new T.Quaternion(), q2 = new T.Quaternion(), sk = new T.Vector3();
    for (let i = 0; i < NG; i++) {
      const g = galazki[i];
      q.setFromUnitVectors(GORA, g.d); q2.setFromAxisAngle(GORA, R() * Math.PI * 2); q.multiply(q2);
      const gr = 0.9 + R() * 0.25; sk.set(gr, g.len, gr);
      if (wyciete[i]) sk.set(0, 0, 0); // gniazdo ozdoby
      m4.compose(g.b, q, sk); igly.setMatrixAt(i, m4);
      g.h = R(); // odcień igieł i zarazem faza ugięcia gałązki
      aInne.setXYZ(i, clamp((g.rho - 0.3) / 0.6, 0, 1), 0, g.h);
      aGal.setXYZW(i, g.gal, g.s0, g.s1, g.obc || 0);
    }
  }
  igly.frustumCulled = false; igly.instanceMatrix.needsUpdate = true; choinka.add(igly);

  const pien = new T.Mesh(new T.CylinderGeometry(0.04, 0.36, WYS - 0.7, 12), new T.MeshBasicMaterial({ color: KOLOR.ink }));
  pien.position.y = (WYS - 0.7) / 2 + 0.4; choinka.add(pien);
  // podest zamiast doniczki: dwa niskie stopnie, ink z połyskiem
  const matPodest = new T.MeshStandardMaterial({ color: KOLOR.panel, roughness: 0.35, metalness: 0.2, envMap: envTex, envMapIntensity: 0.35 });
  const st1 = new T.Mesh(new T.CylinderGeometry(2.0, 2.06, 0.42, 72), matPodest); st1.position.y = 0.21; scena.add(st1);
  const st2 = new T.Mesh(new T.CylinderGeometry(1.25, 1.3, 0.36, 72), matPodest); st2.position.y = 0.6; scena.add(st2);
  // podłoga: bez linii obwodu, wtapia się w tło; światło choinki jako plama na powierzchni.
  // v7: wypolerowana. Odbicie drzewa z osobnego przebiegu (kamera lustrzana, ułamek rozdzielczości, uproszczone drzewo),
  // odbicie zorzy liczone wprost: kierunek odbity od podłogi rzutowany na ekran i odczytany z tekstury zorzy. Bez rozmycia.
  const odbRT = new T.WebGLRenderTarget(4, 4, { generateMipmaps: false });
  const podlogaMat = new T.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uSw: U.uSw, uPoziom: U.uPoziom, uPrez: { value: Array.from({ length: 8 }, () => new T.Vector3(0, 0, 0)) },
      uOdb: { value: odbRT.texture }, uOdbOn: { value: 1 }, uZ: { value: zorzaRT.texture }, uRes: { value: new T.Vector2(1280, 800) }, uPV: { value: new T.Matrix4() } },
    vertexShader: "varying vec3 vW; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }",
    fragmentShader: `
      precision highp float;
      ${GLSL_PALETA}
      uniform float uSw, uPoziom, uOdbOn; uniform vec3 uPrez[8]; uniform sampler2D uOdb, uZ; uniform vec2 uRes; uniform mat4 uPV; varying vec3 vW;
      void main(){
        float r = length(vW.xz);
        float plama = uSw * (0.85 + 0.6 * uPoziom) * exp(-r * 0.2) * smoothstep(1.2, 4.6, r);
        vec3 c = mix(INK * 0.8, mix(KOSC, HOT, 0.3), plama * 0.5);
        vec3 V = normalize(cameraPosition - vW);
        float fr = (0.2 + 0.55 * pow(1.0 - V.y, 3.0)) * (1.0 - smoothstep(3.5, 11.0, r)); // połysk: mocniej pod ostrym kątem, gaśnie ku brzegom
        vec2 sc = gl_FragCoord.xy / uRes;
        c += texture2D(uOdb, vec2(1.0 - sc.x, sc.y)).rgb * fr * uOdbOn;                 // kamera lustrzana widzi świat odwrócony w poziomie
        vec4 kz = uPV * vec4(reflect(-V, vec3(0.0, 1.0, 0.0)), 0.0);                   // kierunek odbity: punkt w nieskończoności, jak zorza
        if (kz.w > 0.0) { vec2 uz = kz.xy / kz.w * 0.5 + 0.5; c += texture2D(uZ, clamp(uz, 0.0, 1.0)).rgb * fr * 0.9 * (1.0 - smoothstep(0.98, 1.15, uz.y)); }
        float zl = 0.0; // otwarte prezenty świecą na podłogę wokół siebie (uPrez: x, z, moc)
        for (int i = 0; i < 8; i++) { vec2 d = vW.xz - uPrez[i].xy; zl += uPrez[i].z * exp(-dot(d, d) * 0.55); }
        c = mix(c, ZLOTO, min(zl, 1.0) * 0.42);
        gl_FragColor = vec4(c, 1.0 - smoothstep(8.5, 15.5, r));
      }`,
  });
  const podloga = new T.Mesh(new T.CircleGeometry(16, 96), podlogaMat);
  podloga.rotation.x = -Math.PI / 2; podloga.renderOrder = -5; scena.add(podloga);

  // ---------- prezenty pod choinką (v5.2, decyzja maisy 16.11): każdy prezent to produkt z cybersora.pl ----------
  // Leżą na podłodze łukiem od strony widza i nie kręcą się z drzewem. Najechanie otwiera pokrywę (zawias z tyłu, własna sprężyna)
  // i ze środka wychodzi złote światło: snop, iskry, wnętrze pudełka, odblask na podłodze i na spodzie gałęzi.
  const swiatloDrzewa = new T.PointLight(KOLOR.kosc, 0, 13, 2); swiatloDrzewa.position.set(0, 3.4, 0); scena.add(swiatloDrzewa); // światło choinki na prezentach, podeście i bombkach
  const swiatloPrezentu = new T.PointLight(KOLOR.zloto, 0, 6, 2); scena.add(swiatloPrezentu);
  const uSkalaWsp = { value: 1000 }; // piksele na jednostkę w odległości 1: wspólne dla żarówek, koralików i iskier
  const PARY = [[KOLOR.krew, KOLOR.kosc], [KOLOR.kosc, KOLOR.krew], [KOLOR.noc, KOLOR.hot], [KOLOR.hot, KOLOR.kosc], [KOLOR.panel, KOLOR.kosc], [KOLOR.krew, KOLOR.ink], [KOLOR.kosc, KOLOR.hot], [KOLOR.noc, KOLOR.kosc]];
  const WYMIARY = [[0.92, 0.8, 0.78], [0.78, 0.78, 1.04], [1.0, 0.8, 0.7], [0.84, 0.8, 0.94], [0.98, 0.86, 0.8], [0.8, 0.8, 0.72], [0.88, 0.76, 1.0], [0.94, 0.94, 0.76]];
  const NP = PRODUKTY.length, WYS_POKR = 0.16, ZAKLAD = 0.05, KAT_POKR = 1.85, WYS_SNOPA = 3.6;
  // jeden łuk przed drzewem, równo co 1,12 w poprzek kadru (żaden prezent nie zasłania środka sąsiada), na przemian trochę bliżej i dalej
  const prezenty = PRODUKTY.map((prod, i) => {
    const x0 = -3.92 + 1.12 * i, rs = 4.75 + (i % 2 ? 0.36 : -0.24), fi = Math.asin(x0 / rs), [w, d, h] = WYMIARY[i % WYMIARY.length];
    return { prod, i, x: Math.sin(fi) * rs, z: Math.cos(fi) * rs, w, d, h, hb: h - WYS_POKR + ZAKLAD, rot: fi * 0.7 + (R() - 0.5) * 0.36, para: PARY[i % PARY.length], ot: 0, otV: 0, otRys: -1, cel: 0,
      wst: 0, wstRys: -1, zk: 0, zkV: 0, zb: 0, zbV: 0 }; // v9: wst = postęp rozwiązywania wstążki (0–1); zk, zb = wychylenie zawieszki od frontu i w bok
  });
  const geoP = new T.BoxGeometry(1, 1, 1); geoP.translate(0, 0.5, 0);
  const matP = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.05, envMap: envTex, envMapIntensity: 0.4 });
  const matW = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.28, metalness: 0.35, envMap: envTex, envMapIntensity: 0.8 });
  const pudla = new T.InstancedMesh(geoP, matP, NP * 2), wstazki = new T.InstancedMesh(geoP, matW, NP * 4); // pudła: korpus i pokrywa; wstążki: 2 na korpusie, 2 na pokrywie
  const kokardy = new T.InstancedMesh(new T.TorusGeometry(0.1, 0.03, 8, 18), matW, NP * 2);
  const wezly = new T.InstancedMesh(geoP, matW, NP * 3); // v9: węzeł kokardy i dwa końce wstążki (opadają przy rozwiązywaniu)
  // v9 (A2): zawieszka z logo programu na sznurku od kokardy. Znaki z makiety (symbole zn-* ze strony + 3 nowe w tym samym kroju),
  // narysowane raz przez Path2D do atlasu 4 × 2 (128 px na znak), kolejność = PRODUKTY. Kafel ma ścięte rogi jak na stronie i obrys kością.
  const ZNAKI = {
    SoraPDF: [["M28 14H54V52H92V106H28ZM40 62V70H80V62ZM40 76V84H80V76ZM40 90V98H64V90Z", "kosc", "evenodd"], ["M60 14L92 46H60Z", "krew"]],
    DancyCloud: [["M18 72V60L28 50H36V46L48 34H58L66 26H80L92 38V48L102 58V72Z", "kosc"], ["M60 80L76 100H65L60 93L55 100H44Z", "krew"]],
    Pycodemath: (g, K) => { g.save(); g.translate(6.6, 26.7); g.scale(0.57, 0.57); g.lineCap = "round"; g.lineWidth = 12;
      g.strokeStyle = K.krew; g.stroke(new Path2D("M68,20 C69,11 57,12 55,23 C51,40 54,50 46,62 C38,74 41,82 36,94 C33,105 22,105 20,95"));
      g.strokeStyle = K.kosc; g.lineJoin = "round"; g.stroke(new Path2D("M96,44 L120,63 L96,82")); g.fillStyle = K.krew; g.fillRect(138, 76, 30, 12); g.restore(); },
    SoraEbookReader: [["M18 34L57 28V94L18 100Z M63 28L102 34V100L63 94Z", "kosc"], ["M74 30H86V58L80 52L74 58Z", "krew"]],
    SalonDesk: [["M22 30H98V46H22Z M22 52H44V66H22Z M49 52H71V66H49Z M22 72H44V86H22Z M49 72H71V86H49Z M76 72H98V86H76Z M22 90H44V102H22Z M49 90H71V102H49Z", "kosc"], ["M76 52H98V66H76Z M34 18H42V36H34Z M78 18H86V36H78Z", "krew"]],
    SoraFoto: [["M34 18H102V86L86 102H18V34ZM38.6 29H91V81.4L81.4 91H29V38.6Z", "kosc", "evenodd"], ["M31 88L51 58L63 73L71 63L84 88Z", "krew"], ["M76 34L83 41L76 48L69 41Z", "krew"]],
    SoraShot: [["M18 48V30L30 18H48V30H35L30 35V48Z M72 18H90L102 30V48H90V35L85 30H72Z M102 72V90L90 102H72V90H85L90 85V72Z M48 102H30L18 90V72H30V85L35 90H48Z", "kosc"], ["M40 51H90L80 69H30Z", "krew"]],
    "Twój program": [["M18 22H102V98H18Z M26 38H94V90H26Z", "kosc", "evenodd"], ["M54 46H66V58H78V70H66V82H54V70H42V58H54Z", "krew"]],
  };
  const atlasZn = document.createElement("canvas"); atlasZn.width = 512; atlasZn.height = 256;
  {
    const g = atlasZn.getContext("2d"), K = { kosc: hex6(KOLOR.kosc), krew: hex6(KOLOR.krew), panel: hex6(KOLOR.panel) }, RAMA_ZN = new Path2D("M18 2H118V102L102 118H2V18Z");
    PRODUKTY.forEach((prod, i) => {
      g.save(); g.translate((i % 4) * 128 + 4, Math.floor(i / 4) * 128 + 4);
      g.fillStyle = K.panel; g.fill(RAMA_ZN); g.strokeStyle = K.kosc; g.lineWidth = 3; g.stroke(RAMA_ZN);
      const z = ZNAKI[prod.nazwa];
      if (typeof z === "function") z(g, K); else if (z) z.forEach(([d, k, reg]) => { g.fillStyle = K[k]; g.fill(new Path2D(d), reg || "nonzero"); });
      g.restore();
    });
  }
  const texZn = new T.CanvasTexture(atlasZn); texZn.colorSpace = T.SRGBColorSpace; texZn.anisotropy = 8;
  const matZaw = new T.MeshBasicMaterial({ map: texZn, alphaTest: 0.5, side: T.DoubleSide });
  const zawieszki = PRODUKTY.map((_, i) => {
    const geo = new T.PlaneGeometry(1, 1); geo.translate(0, -0.5, 0); // punkt zawieszenia na górnej krawędzi
    const uv = geo.attributes.uv, u0 = (i % 4) / 4, v0 = 1 - (Math.floor(i / 4) + 1) / 2;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) / 4, v0 + uv.getY(k) / 2);
    const m = new T.Mesh(geo, matZaw); m.matrixAutoUpdate = false; m.frustumCulled = false; scena.add(m); return m;
  });
  const sznurPoz = new Float32Array(NP * 4 * 3), sznurGeo = new T.BufferGeometry(); // sznurek: węzeł → krawędź pokrywy → zawieszka (2 odcinki na prezent)
  sznurGeo.setAttribute("position", new T.BufferAttribute(sznurPoz, 3));
  const sznurki9 = new T.LineSegments(sznurGeo, new T.LineBasicMaterial({ color: KOLOR.kosc, transparent: true, opacity: 0.85 })); sznurki9.frustumCulled = false; scena.add(sznurki9);
  const WST_T = 0.55, WST_FAZA = 0.42; // wstążka rozwiązuje się w 0,55 s, dopiero potem rusza sprężyna pokrywy (za samą sprężyną trwałoby to ok. 0,1 s)
  const sg = (t, a, b) => clamp((t - a) / (b - a), 0, 1), wyjdz = (x) => 1 - Math.pow(1 - x, 3);
  const geoWn = new T.PlaneGeometry(1, 1); geoWn.rotateX(-Math.PI / 2);
  const wnetrza = new T.InstancedMesh(geoWn, new T.MeshBasicMaterial({ color: 0xffffff }), NP); // wnętrze pudełka: po otwarciu świeci złotem
  const pM = { box: new T.Matrix4(), zaw: new T.Matrix4(), m: new T.Matrix4(), m2: new T.Matrix4(), q: new T.Quaternion(), qk: new T.Quaternion(), e: new T.Euler(), sk: new T.Vector3(), p: new T.Vector3(), kol: new T.Color(), zl: new T.Color(KOLOR.zloto),
    wz: new T.Vector3(), kr: new T.Vector3(), zg: new T.Vector3() };
  const JEDEN = new T.Vector3(1, 1, 1), Q0 = new T.Quaternion();
  function macierzPudla(p) { pM.q.setFromAxisAngle(GORA, p.rot); return pM.box.compose(pM.p.set(p.x, 0, p.z), pM.q, JEDEN); }
  function ustawPokrywe(p) { // pokrywa, jej wstążki i kokarda obracają się razem wokół zawiasu na tylnej krawędzi pudełka
    const i = p.i, hy = p.hb - ZAKLAD, hz = (p.d + 0.06) / 2;
    macierzPudla(p);
    pM.zaw.copy(pM.box).multiply(pM.m.makeTranslation(0, hy, -hz)).multiply(pM.m.makeRotationX(-KAT_POKR * p.ot)).multiply(pM.m.makeTranslation(0, -hy, hz));
    const wstaw = (siatka, nr, px, py, pz, q, sx, sy, sz) => { pM.m2.compose(pM.p.set(px, py, pz), q, pM.sk.set(sx, sy, sz)); siatka.setMatrixAt(nr, pM.m.multiplyMatrices(pM.zaw, pM.m2)); };
    const sz = Math.min(p.w, p.d) * 0.17, s = Math.min(p.w, p.d) * 1.15, a = p.wst, M = 1e-4;
    // R1: pętle ściągają się do węzła (0–0,45), końce opadają (0,1–0,5), pas na pokrywie chowa się w węzeł (0,35–0,75),
    // węzeł i końce znikają (0,6–0,8), pasy na korpusie zsuwają się do podłogi (0,45–0,95). Zamykanie: to samo wstecz.
    const petle = 1 - wyjdz(sg(a, 0, 0.45)), opad = wyjdz(sg(a, 0.1, 0.5)), pas = 1 - wyjdz(sg(a, 0.35, 0.75)), znik = 1 - sg(a, 0.6, 0.8), zsuw = 1 - wyjdz(sg(a, 0.45, 0.95));
    wstaw(pudla, i * 2 + 1, 0, hy, 0, Q0, p.w + 0.06, WYS_POKR, p.d + 0.06);
    wstaw(wstazki, i * 4 + 2, 0, hy - 0.006, 0, Q0, sz * Math.max(pas, M), WYS_POKR + 0.012, Math.max((p.d + 0.075) * pas, M));
    wstaw(wstazki, i * 4 + 3, 0, hy - 0.006, 0, Q0, Math.max((p.w + 0.075) * pas, M), WYS_POKR + 0.012, sz * Math.max(pas, M));
    const sp = Math.max(s * petle, M);
    for (const zn of [-1, 1]) { pM.qk.setFromEuler(pM.e.set(0, 0, zn * 0.95 * (0.4 + 0.6 * petle))); wstaw(kokardy, i * 2 + (zn > 0 ? 1 : 0), zn * 0.085 * sp, p.h + 0.07 * sp, 0, pM.qk, sp, sp, sp * 1.5); }
    const wz = Math.max(0.075 * s * znik, M), yw = p.h + 0.02;
    wstaw(wezly, i * 3, 0, yw - wz * 0.4, 0, Q0, wz, wz * 0.8, wz);
    for (const zn of [-1, 1]) { // koniec wstążki: leży na pokrywie skosem ku przodowi, przy rozwiązaniu wydłuża się i opada przez przednią krawędź
      const dl = Math.max((0.2 + 0.12 * opad) * s * znik, M);
      pM.qk.setFromEuler(pM.e.set(0.12 + 1.15 * opad, zn * (0.55 + 0.25 * opad), 0, "YXZ"));
      pM.m2.compose(pM.p.set(zn * 0.02, yw - 0.004, 0.02), pM.qk, pM.sk.set(sz * 0.8 * znik + M, 0.012, dl)).multiply(pM.m.makeTranslation(0, 0, 0.5));
      wezly.setMatrixAt(i * 3 + (zn > 0 ? 2 : 1), pM.m.multiplyMatrices(pM.zaw, pM.m2));
    }
    pM.wz.set(0, yw, 0).applyMatrix4(pM.zaw); // węzeł w świecie: początek sznurka zawieszki
    pM.kr.set(p.w * 0.27, hy + WYS_POKR, (p.d + 0.06) / 2).applyMatrix4(pM.zaw); // przednia krawędź pokrywy nad zawieszką
    pudla.instanceMatrix.needsUpdate = wstazki.instanceMatrix.needsUpdate = kokardy.instanceMatrix.needsUpdate = wezly.instanceMatrix.needsUpdate = true;
    // pasy na korpusie (stałe do v8): zsuwają się w dół, dół pasa stoi na podłodze
    macierzPudla(p);
    const stale = (nr, sx, sy, szz) => { if (zsuw < 1e-3) sx = sy = szz = M; // zsunięty pas znika cały (inaczej płaski ślad leżałby na podłodze)
      pM.m2.compose(pM.p.set(0, 0, 0), Q0, pM.sk.set(sx, sy, szz)); wstazki.setMatrixAt(nr, pM.m.multiplyMatrices(pM.box, pM.m2)); };
    stale(i * 4, sz, Math.max((p.hb + 0.004) * zsuw, M), p.d + 0.012); stale(i * 4 + 1, p.w + 0.012, Math.max((p.hb + 0.004) * zsuw, M), sz);
    p.otRys = p.ot; p.wstRys = p.wst;
    ustawZawieszke(p);
  }
  function ustawZawieszke(p) { // kafel wisi na przedniej ścianie korpusu tuż pod pokrywą; wychyla się od frontu (zk ≥ 0) i w bok (zb)
    const ts = Math.min(0.3, 0.36 * Math.min(p.w, p.h)), hx = p.w * 0.27, hy = p.hb - ZAKLAD - 0.015, hz = p.d / 2 + 0.012;
    macierzPudla(p);
    pM.qk.setFromEuler(pM.e.set(-p.zk, 0, 0.08 + p.zb, "ZXY"));
    pM.m2.compose(pM.p.set(hx, hy, hz), pM.qk, pM.sk.set(ts, ts, 1));
    const z = zawieszki[p.i]; z.matrix.multiplyMatrices(pM.box, pM.m2); z.matrixWorld.copy(z.matrix);
    pM.zg.set(hx, hy, hz).applyMatrix4(pM.box); // górna krawędź kafla w świecie
    const sznur = 1 - sg(p.wst, 0.05, 0.35), o = p.i * 12; // sznurek odwiązuje się razem z kokardą: koniec przy węźle zjeżdża do krawędzi pokrywy
    pM.p.copy(pM.wz).lerp(pM.kr, 1 - sznur);
    sznurPoz.set([pM.p.x, pM.p.y, pM.p.z, pM.kr.x, pM.kr.y, pM.kr.z], o);
    pM.p.copy(pM.kr).lerp(pM.zg, sznur > 0 ? 0 : 1);
    sznurPoz.set([pM.p.x, pM.p.y, pM.p.z, pM.zg.x, pM.zg.y, pM.zg.z], o + 6);
    sznurGeo.attributes.position.needsUpdate = true;
  }
  prezenty.forEach((p) => {
    const i = p.i, sz = Math.min(p.w, p.d) * 0.17;
    macierzPudla(p);
    const stale = (siatka, nr, py, sx, sy, szz) => { pM.m2.compose(pM.p.set(0, py, 0), Q0, pM.sk.set(sx, sy, szz)); siatka.setMatrixAt(nr, pM.m.multiplyMatrices(pM.box, pM.m2)); };
    stale(pudla, i * 2, 0, p.w, p.hb, p.d); // pasy na korpusie: ustawPokrywe (v9 zsuwają się przy rozwiązywaniu)
    stale(wnetrza, i, p.hb + 0.008, p.w - 0.1, 1, p.d - 0.1);
    pM.kol.setHex(p.para[0]); pudla.setColorAt(i * 2, pM.kol); pudla.setColorAt(i * 2 + 1, pM.kol);
    pM.kol.setHex(p.para[1]); for (let k = 0; k < 4; k++) wstazki.setColorAt(i * 4 + k, pM.kol);
    kokardy.setColorAt(i * 2, pM.kol); kokardy.setColorAt(i * 2 + 1, pM.kol);
    for (let k = 0; k < 3; k++) wezly.setColorAt(i * 3 + k, pM.kol);
    wnetrza.setColorAt(i, pM.kol.setHex(KOLOR.ink));
    ustawPokrywe(p);
  });
  [pudla, wstazki, kokardy, wezly, wnetrza].forEach((m) => { m.frustumCulled = false; scena.add(m); });
  // snop światła: stożek rozchodzący się z otworu pudełka, jaśniejszy u dołu, z wolno obracającymi się smugami; rysowany addytywnie, bez rozmycia
  const geoSnop = new T.CylinderGeometry(1.0, 0.44, 1, 32, 1, true); geoSnop.translate(0, 0.5, 0);
  const aMocS = new T.InstancedBufferAttribute(new Float32Array(NP), 1); aMocS.setUsage(T.DynamicDrawUsage); geoSnop.setAttribute("aMoc", aMocS);
  const snopMat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending,
    uniforms: { uT: U.uT },
    vertexShader: `
      attribute float aMoc; varying float vY; varying float vK; varying float vMoc; varying vec3 vN; varying vec3 vV;
      void main(){
        vY = position.y; vK = uv.x * 6.2832; vMoc = aMoc;
        vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal); vV = cameraPosition - wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      precision highp float;
      ${GLSL_PALETA}
      uniform float uT; varying float vY; varying float vK; varying float vMoc; varying vec3 vN; varying vec3 vV;
      void main(){
        float smugi = 0.5 + 0.5 * sin(vK * 7.0 + uT * 0.8) * sin(vK * 3.0 - uT * 0.55 + 1.3);
        float bok = abs(dot(normalize(vN), normalize(vV)));
        float a = vMoc * pow(1.0 - vY, 1.6) * (0.3 + 0.7 * smugi) * (0.2 + 0.8 * bok);
        vec3 c = mix(ZLOTO, KOSC, 0.3 * pow(1.0 - vY, 5.0));
        gl_FragColor = vec4(c * a * 0.72, 1.0);
      }`,
  });
  const snopy = new T.InstancedMesh(geoSnop, snopMat, NP);
  prezenty.forEach((p) => { macierzPudla(p); pM.m2.compose(pM.p.set(0, p.hb, 0), Q0, pM.sk.set(p.w * 1.2, WYS_SNOPA, p.d * 1.2)); snopy.setMatrixAt(p.i, pM.m.multiplyMatrices(pM.box, pM.m2)); });
  snopy.frustumCulled = false; snopy.renderOrder = 5; scena.add(snopy);
  // iskry: drobiny unoszące się w snopie, każda z własnym tempem i torem
  const ISKIER = 34, geoIs = new T.BufferGeometry(), isP = new Float32Array(NP * ISKIER * 3), isS = new Float32Array(NP * ISKIER * 4), isW = new Float32Array(NP * ISKIER);
  prezenty.forEach((p) => { for (let k = 0; k < ISKIER; k++) { const n = p.i * ISKIER + k; isP.set([p.x, p.hb, p.z], n * 3); isS.set([R(), R(), R(), p.i], n * 4); isW[n] = Math.min(p.w, p.d); } });
  geoIs.setAttribute("position", new T.BufferAttribute(isP, 3)); geoIs.setAttribute("aS", new T.BufferAttribute(isS, 4)); geoIs.setAttribute("aW", new T.BufferAttribute(isW, 1));
  const iskryMat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    uniforms: { uT: U.uT, uSkala: uSkalaWsp, uO: { value: [0, 0, 0, 0, 0, 0, 0, 0] } },
    vertexShader: `
      attribute vec4 aS; attribute float aW; uniform float uT, uSkala; uniform float uO[8]; varying float vA; varying float vJ;
      void main(){
        float o = uO[int(aS.w + 0.5)];
        float zycie = fract(uT * (0.32 + 0.3 * aS.x) + aS.y * 7.0);
        float kat = aS.z * 6.2832 + zycie * 3.0 * (aS.x - 0.5);
        float rr = aW * (0.1 + 0.3 * aS.y + 0.45 * zycie * aS.z);
        vec4 mv = modelViewMatrix * vec4(position + vec3(cos(kat) * rr, zycie * (1.1 + 1.5 * aS.x), sin(kat) * rr), 1.0);
        gl_Position = o > 0.02 ? projectionMatrix * mv : vec4(2.0, 2.0, 2.0, 1.0);
        gl_PointSize = max(1.5, 0.05 * (1.0 - 0.6 * zycie) * uSkala / -mv.z);
        vA = o * smoothstep(0.0, 0.12, zycie) * (1.0 - smoothstep(0.55, 1.0, zycie)); vJ = aS.y;
      }`,
    fragmentShader: `
      precision highp float;
      ${GLSL_PALETA}
      varying float vA; varying float vJ;
      void main(){
        float r = length(gl_PointCoord - 0.5) * 2.0;
        if (r > 1.0) discard;
        gl_FragColor = vec4(mix(ZLOTO, KOSC, step(0.7, vJ) * 0.6) * vA * (1.0 - r * r), 1.0);
      }`,
  });
  const iskry = new T.Points(geoIs, iskryMat); iskry.frustumCulled = false; iskry.renderOrder = 6; scena.add(iskry);
  // otwieranie: sprężyna z lekkim przestrzeleniem (pokrywa odskakuje jak wieko skrzynki), zamykanie wolniejsze i bez odbicia
  const OT_OM = 13, OT_DZ = 0.62, ZA_OM = 7, ZA_DZ = 0.9;
  function ruchPrezentow(dt, odrazu) {
    let naj = null, najMoc = 0;
    const uP = podlogaMat.uniforms.uPrez.value, uO = iskryMat.uniforms.uO.value;
    for (const p of prezenty) {
      if (p.trzymaj) { /* testy: stan wymuszony przez prezenty.wymus */ }
      else if (odrazu || mniejRuchu) { p.ot = p.cel; p.otV = 0; p.wst = p.cel; p.zk = p.zkV = p.zb = p.zbV = 0; } // „ogranicz ruch”: od razu stan końcowy, bez animacji wstążki
      else {
        // v9: najpierw wstążka (własny zegar), potem pokrywa; przy zamykaniu odwrotnie: pokrywa wraca, dopiero potem wstążka się zawiązuje
        const wst0 = p.wst;
        if (p.cel > 0.5) p.wst = Math.min(1, p.wst + dt / WST_T); else if (p.ot < 0.06) p.wst = Math.max(0, p.wst - dt / WST_T);
        const cel = p.cel > 0.5 && p.wst >= 1 ? p.cel : 0;
        const otw = cel > p.ot, om = otw ? OT_OM : ZA_OM, dz = otw ? OT_DZ : ZA_DZ, n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
        const otV0 = p.otV;
        for (let k = 0; k < n; k++) { p.otV += (-om * om * (p.ot - cel) - 2 * dz * om * p.otV) * h; p.ot += p.otV * h; }
        if (p.ot < 0) { p.ot = 0; if (p.otV < 0) p.otV = 0; }
        // zawieszka: wahadło na sprężynie; szarpnięcie pokrywy i ściąganie wstążki wybijają ją od frontu i w bok
        const ak = dt > 0 ? (p.otV - otV0) / dt : 0, aw = dt > 0 ? (p.wst - wst0) / dt : 0;
        for (let k = 0; k < n; k++) {
          p.zkV += (-49 * p.zk - 1.6 * p.zkV + 0.035 * ak + 3.2 * Math.abs(aw) * (1 - p.wst)) * h; p.zk += p.zkV * h;
          p.zbV += (-49 * p.zb - 1.6 * p.zbV - 0.015 * ak + 2.2 * aw * (1 - p.wst)) * h; p.zb += p.zbV * h;
          if (p.zk < 0) { p.zk = 0; if (p.zkV < 0) p.zkV *= -0.3; } // nie wchodzi w pudełko
        }
        p.zk = Math.min(p.zk, 1.2); p.zb = clamp(p.zb, -0.6, 0.6);
      }
      if (Math.abs(p.ot - p.otRys) > 5e-4 || Math.abs(p.wst - p.wstRys) > 5e-4) ustawPokrywe(p);
      else if (Math.abs(p.zk) + Math.abs(p.zb) + Math.abs(p.zkV) + Math.abs(p.zbV) > 1e-4) ustawZawieszke(p);
      const moc = Math.pow(clamp(p.ot, 0, 1), 1.6);
      aMocS.array[p.i] = moc; uO[p.i] = moc; uP[p.i].set(p.x, p.z, moc);
      wnetrza.setColorAt(p.i, pM.kol.setHex(KOLOR.ink).lerp(pM.zl, moc));
      if (moc > najMoc) { najMoc = moc; naj = p; }
    }
    aMocS.needsUpdate = true; wnetrza.instanceColor.needsUpdate = true;
    swiatloPrezentu.intensity = 26 * najMoc;
    if (naj) { swiatloPrezentu.position.set(naj.x, naj.h + 0.7, naj.z); U.uZl.value.set(naj.x, naj.h + 0.9, naj.z, najMoc); } else U.uZl.value.w = 0;
  }
  function trafPrezent() { // po promien(): promień kamery (układ świata) kontra pudełka; zwraca numer najbliższego trafionego albo -1
    const o = ray.ray.origin, d = ray.ray.direction;
    let naj = -1, najT = 1e9;
    for (const p of prezenty) {
      const c = Math.cos(p.rot), s = Math.sin(p.rot), ox = o.x - p.x, oz = o.z - p.z;
      const osie = [[ox * c - oz * s, d.x * c - d.z * s, p.w / 2 + 0.06], [o.y - (p.h + 0.1) / 2, d.y, (p.h + 0.1) / 2], [ox * s + oz * c, d.x * s + d.z * c, p.d / 2 + 0.06]];
      let t0 = 0, t1 = 1e9;
      for (const [po, kd, pol] of osie) {
        if (Math.abs(kd) < 1e-9) { if (Math.abs(po) > pol) { t0 = 2e9; break; } continue; }
        const a = (-pol - po) / kd, b = (pol - po) / kd;
        t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b));
      }
      if (t0 <= t1 && t0 < najT) { najT = t0; naj = p.i; }
    }
    return naj;
  }

  // ---------- żarówki: owinięte wzdłuż gałązek, gęściej na brzegu korony ----------
  const NZ = POZIOMY[0].zarowki;
  const zPos = new Float32Array(NZ * 3), zB = new Float32Array(NZ * 4), zG = new Float32Array(NZ * 2); // zB: hot?, faza migotania, grupa, faza ugięcia gałązki; zG: gałąź i odległość od pnia
  for (let i = 0; i < NZ; i++) {
    // żarówka i-ta siedzi na gałązce widocznej także na niższym poziomie jakości, w którym sama jest rysowana
    const zakres = Math.floor(NG * (i < POZIOMY[2].zarowki ? POZIOMY[2].galazki : i < POZIOMY[1].zarowki ? POZIOMY[1].galazki : 1));
    let g; do { g = galazki[Math.floor(R() * zakres)]; } while (R() > g.rho * g.rho);
    const t = 0.25 + R() * 0.75;
    zPos[i * 3] = g.b.x + g.d.x * g.len * t + (R() - 0.5) * 0.06;
    zPos[i * 3 + 1] = g.b.y + g.d.y * g.len * t + (R() - 0.5) * 0.06 + 0.03;
    zPos[i * 3 + 2] = g.b.z + g.d.z * g.len * t + (R() - 0.5) * 0.06;
    zB[i * 4] = R() < 0.22 ? 1 : 0; zB[i * 4 + 1] = R() * 100; zB[i * 4 + 2] = Math.floor(R() * 8); zB[i * 4 + 3] = g.h;
    zG[i * 2] = g.gal; zG[i * 2 + 1] = g.s0 + (g.s1 - g.s0) * t;
  }
  const geoZ = new T.BufferGeometry();
  geoZ.setAttribute("position", new T.BufferAttribute(zPos, 3)); geoZ.setAttribute("aB", new T.BufferAttribute(zB, 4)); geoZ.setAttribute("aGz", new T.BufferAttribute(zG, 2));
  const zarMat = new T.ShaderMaterial({
    alphaToCoverage: true,
    uniforms: { uT: U.uT, uSw: U.uSw, uPoziom: U.uPoziom, uLid: U.uLid, uStan: U.uStan, uSkala: uSkalaWsp, uR: { value: 0.047 } },
    vertexShader: `
      attribute vec4 aB; attribute vec2 aGz; uniform float uT, uSw, uPoziom, uSkala, uR; varying vec3 vB;
      ${GLSL_POLE}
      void main(){
        vec4 mv = modelViewMatrix * vec4(position + poleD(position, aB.w) + poleG(position, aGz.x, aGz.y), 1.0); // żarówka ugina się razem ze swoją gałęzią
        float blisko = smoothstep(0.6, 1.3, -mv.z); // żarówka tuż przy obiektywie gaśnie i maleje, zamiast wyskakiwać jako wielka kropka
        gl_Position = blisko > 0.0 ? projectionMatrix * mv : vec4(2.0, 2.0, 2.0, 1.0);
        vec4 pf = projectionMatrix * vec4(mv.xy, mv.z + uR * 1.6, 1.0); // głębia przodu kulki, nie jej środka: igły nie przecinają krążka
        if (blisko > 0.0) gl_Position.z = pf.z / pf.w * gl_Position.w;
        gl_PointSize = max(2.0 * uR * uSkala / -mv.z * blisko, 1.6);
        float mig = sin(uT * (0.9 + mod(aB.y, 1.7)) + aB.y) * 0.5 + 0.5;
        float fala = sin(position.y * 1.4 - uT * 1.6 + aB.z) * 0.5 + 0.5;
        vB = vec3(aB.x, uSw * min(1.0, 0.62 + mig * 0.3 + fala * 0.12 + uPoziom * 0.8), blisko);
      }`,
    fragmentShader: `
      precision highp float;
      ${GLSL_PALETA}
      varying vec3 vB;
      void main(){
        float r = length(gl_PointCoord - 0.5) * 2.0;
        if (r > 1.0) discard;
        vec3 c = mix(LINIA, mix(KOSC, HOT, vB.x), vB.y);
        // szklana kulka: jasny środek przesunięty ku światłu, ciemniejszy brzeg; bez poświaty
        float kula = length(gl_PointCoord - vec2(0.42, 0.40)) * 2.0;
        c = mix(c, c * 0.55, smoothstep(0.25, 1.15, kula));
        gl_FragColor = vec4(c, (1.0 - smoothstep(0.82, 1.0, r)) * vB.z);
      }`,
  });
  const zarowki = new T.Points(geoZ, zarMat); zarowki.frustumCulled = false; choinka.add(zarowki);

  // wypiek: ile światła z żarówek dociera do nasady i czubka każdej gałązki (siatka przestrzenna, raz na poziom jakości)
  function wypiek(nZar) {
    const siatka = new Map(), klucz3 = (x, y, z) => (x + 64) | ((y + 64) << 8) | ((z + 64) << 16);
    for (let i = 0; i < nZar; i++) {
      const k = klucz3(Math.floor(zPos[i * 3]), Math.floor(zPos[i * 3 + 1]), Math.floor(zPos[i * 3 + 2]));
      let l = siatka.get(k); if (!l) siatka.set(k, (l = [])); l.push(i);
    }
    const wyn = [0, 0, 0, 0]; // kość, hot, najmocniejsza waga, jej grupa
    const probka = (px, py, pz) => {
      wyn[0] = wyn[1] = wyn[2] = 0; wyn[3] = 0;
      const cx = Math.floor(px), cy = Math.floor(py), cz = Math.floor(pz);
      for (let x = cx - 1; x <= cx + 1; x++) for (let y = cy - 1; y <= cy + 1; y++) for (let z = cz - 1; z <= cz + 1; z++) {
        const l = siatka.get(klucz3(x, y, z)); if (!l) continue;
        for (let n = 0; n < l.length; n++) {
          const i = l[n], dx = zPos[i * 3] - px, dy = zPos[i * 3 + 1] - py, dz = zPos[i * 3 + 2] - pz, d2 = dx * dx + dy * dy + dz * dz;
          if (d2 >= 1) continue;
          const w = (1 - d2) * (1 - d2) / (1 + d2 / 0.008);
          wyn[zB[i * 4]] += w; if (w > wyn[2]) { wyn[2] = w; wyn[3] = zB[i * 4 + 2]; }
        }
      }
    };
    for (let i = 0; i < NG; i++) {
      const g = galazki[i];
      probka(g.b.x + g.d.x * g.len * 0.15, g.b.y + g.d.y * g.len * 0.15, g.b.z + g.d.z * g.len * 0.15);
      const k0 = wyn[0], h0 = wyn[1], gr = wyn[3];
      probka(g.b.x + g.d.x * g.len * 0.9, g.b.y + g.d.y * g.len * 0.9, g.b.z + g.d.z * g.len * 0.9);
      aLit.setXYZW(i, k0, h0, wyn[0], wyn[1]); aInne.setY(i, wyn[2] > 0 ? wyn[3] : gr);
    }
    aLit.needsUpdate = true; aInne.needsUpdate = true;
    // kalibracja: mediana światła na gałązkach brzegu korony ma dać ok. 1/4 drogi od ink do koloru żarówki;
    // drzewo zostaje czarne, a jasno jest tylko tuż przy żarówkach
    const sumy = [];
    for (let i = 0; i < NG; i += 3) if (galazki[i].rho > 0.6) sumy.push(aLit.array[i * 4 + 2] + aLit.array[i * 4 + 3]);
    sumy.sort((a, b) => a - b);
    iglyMat.uniforms.uMoc.value = 0.38 /Math.max(sumy[Math.floor(sumy.length / 2)], 1e-3);
  }

  // ---------- ozdoby na sznurkach (etap 2): bombki projektów, małe bombki i sople; każda jest wahadłem ----------
  const NW = wahadla.length, NI = sople.length, NM = male.length, ND0 = NI + NM;
  // stan fizyki: (wx, wz) to poziome składowe jednostkowego kierunku zaczep → ozdoba w układzie drzewa
  // Etap 2b: stan to kąty wychylenia (ux, uz) [rad] sznurka i (bx, bz) samej ozdoby, która goni sznurek z opóźnieniem.
  const RAD = Math.PI / 180;
  const fA = new Float32Array(NW * 3), fE = new Float32Array(NW * 2), fLim = new Float32Array(NW * 3), fOm2 = new Float32Array(NW), fC = new Float32Array(NW), fInvL = new Float32Array(NW);
  const fO = new Float32Array(NW), fRH = new Float32Array(NW), fH = new Float32Array(NW), fLs = new Float32Array(NW), fOmB = new Float32Array(NW), fDzB = new Float32Array(NW), fMasa = new Float32Array(NW);
  const ux = new Float32Array(NW), uz = new Float32Array(NW), vx = new Float32Array(NW), vz = new Float32Array(NW);     // sznurek: kąt i prędkość kątowa
  const bx = new Float32Array(NW), bz = new Float32Array(NW), bvx = new Float32Array(NW), bvz = new Float32Array(NW);   // ozdoba
  const wx = new Float32Array(NW), wz = new Float32Array(NW), px = new Float32Array(NW), pz = new Float32Array(NW);     // sinusy wychylenia sznurka: bieżący i poprzedni krok
  const cx = new Float32Array(NW), cz = new Float32Array(NW), qx = new Float32Array(NW), qz = new Float32Array(NW);     // to samo dla ozdoby
  const fPx = new Float32Array(NW), fPz = new Float32Array(NW), cPx = new Float32Array(NW), cPz = new Float32Array(NW); // pchnięcie kursorem: siła przyłożona i jej cel
  const uderzyl = new Uint8Array(NW);      // ozdoba doszła do twardej granicy (ma się to prawie nie zdarzać)
  const srodki = new Float32Array(NW * 3); // środki ozdób w układzie drzewa, po ugięciu i wychyleniu (trafianie, etykiety, kamera)
  const aWah = new T.InstancedBufferAttribute(new Float32Array(NW * 4), 4); aWah.setUsage(T.DynamicDrawUsage); // xy: sznurek, zw: ozdoba
  const aZacz = new T.InstancedBufferAttribute(new Float32Array(NW * 4), 4);
  const aLs = new T.InstancedBufferAttribute(new Float32Array(NW), 1);
  const aZ2 = new T.InstancedBufferAttribute(new Float32Array(NW * 3), 3);                                     // gałąź, odległość zaczepu od pnia, pole gałązki pod ozdobą
  const aSkr = new T.InstancedBufferAttribute(new Float32Array(NW), 1); aSkr.setUsage(T.DynamicDrawUsage);     // skręt ozdoby wokół sznurka
  const fGal = new Int32Array(NW), fS2 = new Float32Array(NW), fCm = new Float32Array(NW), fCv = new Float32Array(NW), nacY = new Float32Array(NW); // gałąź ozdoby, s², podatność gałązki w bok i w pionie, nadwyżka naciągu sznurka
  const T_ZACZ = 0.86; // zaczep wisi tuż przed końcem gałązki: dostaje tyle jej ugięcia
  wahadla.forEach((w, i) => {
    { const g = w.kon.g, sA = Math.min(g.gal ? Math.hypot(w.A.x, w.A.z) / galezie[g.gal].L : 0, 1.25);
      fGal[i] = g.gal; fS2[i] = sA * sA; aZ2.setXYZ(i, g.gal, sA, POLE_O + i);
      fCm[i] = w.typ === 2 ? 0.5 : w.typ === 1 ? 0.22 * (w.r / 0.16) : 0.07; fCv[i] = w.typ === 2 ? 1.6 : w.typ === 1 ? 0.8 * (w.r / 0.16) : 0.2; }
    w.h = w.kon.g.h; // faza ugięcia tej samej gałązki, na której ozdoba wisi: zaczep idzie razem z nią
    const los = (k) => { const s = Math.sin((w.los + k) * 12.9898) * 43758.5453; return s - Math.floor(s); };
    // długość zredukowana wahadła fizycznego: kula (2/5·r²) albo sopel (pręt), czyli duże bombki bujają się wolniej;
    // tłumienie [1/s]: lekka ozdoba gaśnie szybko, ciężka długo. Rozrzut ±25%, żeby drzewo nie gasło chórem.
    let Le, c, masa;
    if (w.typ === 0) { w.Ls = w.s0; const o = w.s0 + w.dl * 0.35; Le = o + (w.dl * w.dl / 14) / o; c = 1.35 * (0.75 + 0.5 * los(1)); masa = 1; }
    else if (w.typ === 1) { w.Ls = w.L - w.r * 1.12; Le = (w.L + 0.4 * w.r * w.r / w.L) * (0.86 + 0.28 * los(2)); c = 1.15 * (0.16 / w.r) * (0.75 + 0.5 * los(1)); masa = 0.16 / w.r; }
    else { w.Ls = w.L - w.r * 1.12; Le = (w.L + 0.4 * w.r * w.r / w.L) * (0.9 + 0.2 * los(2)); c = 0.72 * (0.85 + 0.3 * los(1)); masa = 0.5; }
    fA[i * 3] = w.A.x; fA[i * 3 + 1] = w.A.y; fA[i * 3 + 2] = w.A.z; fE[i * 2] = w.erx; fE[i * 2 + 1] = w.erz;
    fLim[i * 3] = Math.asin(w.lOut); fLim[i * 3 + 1] = Math.asin(w.lIn); fLim[i * 3 + 2] = Math.asin(w.lT);
    fOm2[i] = G_FIZ / Le; fC[i] = c; fInvL[i] = 1 / Le; fO[i] = w.o; fRH[i] = w.rHit; fH[i] = w.h; fLs[i] = w.Ls; fMasa[i] = masa;
    fOmB[i] = Math.sqrt(G_FIZ / Le) * (2.6 + 0.9 * los(3)); fDzB[i] = w.typ === 2 ? 0.3 : 0.22 + 0.1 * los(4);
    aZacz.setXYZW(i, w.A.x, w.A.y, w.A.z, w.h); aLs.setX(i, w.Ls);
  });
  // obrót w shaderze: macierz instancji trzyma tylko kształt (skala, odsunięcie w dół). Sznurek obraca się wokół zaczepu,
  // ozdoba wokół końca sznurka o własny kąt (spóźnia się za sznurkiem i lekko go wyprzedza przy zawracaniu).
  const GLSL_WAH = GLSL_POLE + `
    attribute vec4 aWah; attribute vec4 aZacz; attribute float aLs; attribute vec3 aZ2; attribute float aSkr;
    vec3 wahO(vec2 w, vec3 v){
      float c = sqrt(max(1.0 - dot(w, w), 0.0));
      vec3 k = vec3(-w.y, 0.0, w.x);
      return v + cross(k, v) + cross(k, cross(k, v)) / (1.0 + c);
    }
    vec3 skrO(vec3 v){ float c = cos(aSkr), s = sin(aSkr); return vec3(c * v.x + s * v.z, v.y, c * v.z - s * v.x); }`;
  function wahadlowy(mat, sznurek) {
    const poz = sznurek
      ? "wahO(aWah.xy, (instanceMatrix * vec4(position, 1.0)).xyz)"
      : "wahO(aWah.zw, skrO((instanceMatrix * vec4(position, 1.0)).xyz) + vec3(0.0, aLs, 0.0)) + wahO(aWah.xy, vec3(0.0, -aLs, 0.0))";
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uLid = U.uLid; sh.uniforms.uStan = U.uStan;
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\n" + GLSL_WAH)
        .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>\nobjectNormal = wahO(${sznurek ? "aWah.xy, objectNormal" : "aWah.zw, skrO(objectNormal)"});`)
        .replace("#include <begin_vertex>", `vec3 transformed = ${poz} + aZacz.xyz + poleD(aZacz.xyz, aZacz.w) + poleG(aZacz.xyz, aZ2.x, aZ2.y) + stanG(aZ2.z).xyz * ${T_ZACZ};`)
        .replace("#include <project_vertex>", "vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);\ngl_Position = projectionMatrix * mvPosition;")
        .replace("#include <worldpos_vertex>", "vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);");
    };
    mat.customProgramCacheKey = () => (sznurek ? "wah-sznurek" : "wah-ozdoba");
    return mat;
  }
  const matKap = new T.MeshStandardMaterial({ color: KOLOR.kosc, metalness: 0.9, roughness: 0.3, envMap: envTex });
  const matKapI = wahadlowy(matKap.clone(), false), matSznur = wahadlowy(matKap.clone(), true);
  const matM = wahadlowy(new T.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.6, roughness: 0.18, envMap: envTex, envMapIntensity: 1.35, clearcoat: 1, clearcoatRoughness: 0.08 }), false);
  const zAtr = (geo) => { geo.setAttribute("aWah", aWah); geo.setAttribute("aZacz", aZacz); geo.setAttribute("aLs", aLs); geo.setAttribute("aZ2", aZ2); geo.setAttribute("aSkr", aSkr); return geo; };
  const geoSopel = new T.ConeGeometry(1, 1, 7, 4); geoSopel.rotateX(Math.PI); geoSopel.translate(0, -0.5, 0);
  const geoSznur = new T.CylinderGeometry(0.007, 0.007, 1, 5, 1, true); geoSznur.translate(0, -0.5, 0);
  const kuleM = new T.InstancedMesh(zAtr(new T.SphereGeometry(1, 28, 18)), matM, ND0);
  const kapM = new T.InstancedMesh(zAtr(new T.CylinderGeometry(0.2, 0.2, 0.22, 12)), matKapI, ND0);
  const sopleM = new T.InstancedMesh(zAtr(geoSopel), matM, Math.max(NI, 1));
  const sznurki = new T.InstancedMesh(zAtr(geoSznur), matSznur, NW);
  const oczka = new T.InstancedMesh(zAtr(new T.TorusGeometry(0.5, 0.11, 6, 16)), matKapI, ND0); // zawieszka z oczkiem na małych bombkach: po niej widać skręt kuli na sznurku
  {
    const m4 = new T.Matrix4(), q = new T.Quaternion(), sk = new T.Vector3(), kol = new T.Color(), zero = new T.Matrix4().makeScale(0, 0, 0);
    wahadla.forEach((w, i) => {
      if (i < ND0) { if (w.typ === 1) { m4.compose(v1.set(0, -w.L + w.r * 1.3, 0), q, sk.setScalar(w.r * 0.36)); oczka.setMatrixAt(i, m4); } else oczka.setMatrixAt(i, zero); }
      if (w.typ === 0) {
        kuleM.setMatrixAt(i, zero); kuleM.setColorAt(i, kol.setHex(KOLOR.kosc));
        m4.compose(v1.set(0, -w.s0 + 0.008, 0), q, sk.setScalar(0.1)); kapM.setMatrixAt(i, m4);
        m4.compose(v1.set(0, -w.s0, 0), q, sk.set(0.03, w.dl, 0.03)); sopleM.setMatrixAt(i, m4); sopleM.setColorAt(i, kol.setHex(KOLOR.kosc));
        m4.compose(v1.set(0, 0, 0), q, sk.set(1, w.s0, 1)); sznurki.setMatrixAt(i, m4);
      } else if (w.typ === 1) {
        m4.compose(v1.set(0, -w.L, 0), q, sk.setScalar(w.r)); kuleM.setMatrixAt(i, m4); kuleM.setColorAt(i, kol.setHex(w.kolor));
        const sz = w.kolor === KOLOR.ink ? 1.35 : 1; // czarna bombka dostaje większy jasny zaczep, żeby nie znikała na czarnym drzewie
        m4.compose(v1.set(0, -w.L + w.r * 1.04, 0), q, sk.set(w.r * sz, w.r, w.r * sz)); kapM.setMatrixAt(i, m4);
        m4.compose(v1.set(0, 0, 0), q, sk.set(1, w.L - w.r * 1.12, 1)); sznurki.setMatrixAt(i, m4);
      } else {
        m4.compose(v1.set(0, 0, 0), q, sk.set(1.4, w.L - w.r * 1.12, 1.4)); sznurki.setMatrixAt(i, m4);
      }
    });
  }
  [kuleM, kapM, sopleM, sznurki, oczka].forEach((m) => { m.frustumCulled = false; choinka.add(m); });
  sopleM.visible = NI > 0;

  // duże bombki projektów: osobne siatki (własna tekstura z opaską i nazwą), pozycja i obrót z tego samego stanu wahadła
  const hex = (k) => "#" + k.toString(16).padStart(6, "0");
  const texMR = (() => { // wspólna mapa: opaska matowa i niemetaliczna (G = szorstkość, B = metaliczność; to dane, nie kolory)
    const c = document.createElement("canvas"); c.width = 4; c.height = 512; const x = c.getContext("2d");
    x.fillStyle = "rgb(0,84,255)"; x.fillRect(0, 0, 4, 512); x.fillStyle = "rgb(0,255,30)"; x.fillRect(0, 196, 4, 120);
    return new T.CanvasTexture(c);
  })();
  // smaczki ekipy na dużych bombkach (decyzje 18.11, makieta-robocik.html): ikona nad opaską (y ≈ 60–190), dopisek pod nią (y ≈ 322–460), na obu stronach kuli.
  // Rysunki własne, w palecie: bez grafiki z gry i bez logo marki. Rysowane wokół x 256 na osobnym płótnie, potem przenoszone wierszami
  // ze ściśnięciem w poziomie o cos(szerokości geograficznej): tekstura równoprostokątna rozciąga rysunek ku biegunom.
  const SMACZKI = (() => {
    const K = { ink: hex(KOLOR.ink), krew: hex(KOLOR.krew), hot: hex(KOLOR.hot), kosc: hex(KOLOR.kosc) };
    const dopisek = (o, txt, y, fs, kol) => { o.font = `500 ${fs}px "Geist Mono", ui-monospace, Consolas, monospace`; o.textAlign = "center"; o.textBaseline = "middle"; o.fillStyle = kol; o.fillText(txt, 256, y); };
    const miecz = (o, cx, cy, s, sx = s) => { // ogromny miecz z demonicznymi skrzydłami (nawiązanie do postaci, nie grafika z gry); sx > s: szersze skrzydła
      o.save(); o.translate(cx, cy); o.scale(sx, s); o.translate(-100, -57); o.fillStyle = K.krew; // v7.1b: długa klinga szpicem w dół (makieta czytała się jak krawat)
      ["M92 38 L108 38 L106 98 L100 112 L94 98 Z",                                                                   // klinga
        "M96 31 C82 29 68 20 58 4 C61 19 65 28 71 34 C64 35 59 39 55 45 C69 44 83 41 96 39 Z",                       // lewe skrzydło jelca
        "M104 31 C118 29 132 20 142 4 C139 19 135 28 129 34 C136 35 141 39 145 45 C131 44 117 41 104 39 Z"].forEach((d) => o.fill(new Path2D(d)));
      o.fillRect(97, 10, 6, 22);                                                                                    // rękojeść
      o.fillStyle = K.hot; o.beginPath(); o.arc(100, 7, 4.5, 0, 7); o.fill(); o.fillRect(99, 44, 2, 50); o.restore(); // głowica i zbrocze
    };
    const zegar = (o, cx, cy, s) => { // zegar z otwartym pierścieniem, strzałka „cofania czasu” i wskazówki (nawiązanie do postaci, nie grafika z gry)
      o.save(); o.translate(cx, cy); o.scale(s, s); o.strokeStyle = o.fillStyle = K.kosc; o.lineCap = "round"; o.lineWidth = 6;
      const a0 = -30 * Math.PI / 180, a1 = 280 * Math.PI / 180;
      o.beginPath(); o.arc(0, 0, 28, a0, a1); o.stroke();
      const P = [28 * Math.cos(a0), 28 * Math.sin(a0)], d = [Math.sin(a0), -Math.cos(a0)], n = [Math.cos(a0), Math.sin(a0)];
      o.beginPath(); o.moveTo(P[0] + d[0] * 11, P[1] + d[1] * 11); o.lineTo(P[0] + n[0] * 8, P[1] + n[1] * 8); o.lineTo(P[0] - n[0] * 8, P[1] - n[1] * 8); o.closePath(); o.fill();
      o.lineWidth = 5; o.beginPath(); o.moveTo(0, 0); o.lineTo(0, -16); o.moveTo(0, 0); o.lineTo(11, 7); o.stroke();
      o.beginPath(); o.arc(0, 0, 4, 0, 7); o.fill(); o.restore();
    };
    const lisc = (o, cx, cy, s) => { // liść konopi: 7 listków z jednego punktu, środkowy najdłuższy
      o.save(); o.translate(cx, cy); o.scale(s, s); o.fillStyle = K.ink;
      for (const [a, l] of [[-90, 30], [-58, 26], [-122, 26], [-28, 18], [-152, 18], [-8, 11], [-172, 11]]) { o.save(); o.rotate((a + 90) * Math.PI / 180); o.beginPath(); o.ellipse(0, -l / 2, l * 0.11, l / 2, 0, 0, 7); o.fill(); o.restore(); } // wąskie listki: grubsze zlewały się w plamę
      o.beginPath(); o.roundRect(-1.2, 0, 2.4, 9, 1); o.fill(); o.restore();
    };
    const joint = (o, cx, cy, s) => { // jointek: bibułka kość, filtr ink, żar hot, cienki dymek kość
      o.save(); o.translate(cx, cy); o.scale(s, s); o.rotate(-20 * Math.PI / 180); // cieńszy niż w makiecie: gruby czytał się jak tasak
      o.fillStyle = K.kosc; o.fill(new Path2D("M-16 -2 L14 -2.8 L14 2.8 L-16 2 z"));
      o.fillStyle = K.ink; o.beginPath(); o.roundRect(-21, -2, 6, 4, 1); o.fill();
      o.fillStyle = K.hot; o.beginPath(); o.roundRect(13, -2.8, 3.5, 5.6, 1.5); o.fill();
      o.globalAlpha = 0.7; o.strokeStyle = K.kosc; o.lineWidth = 1.6; o.lineCap = "round"; o.stroke(new Path2D("M19 -6 c4 -5 -2 -8 2 -13 c3 -4 -1 -7 1 -10")); o.restore();
    };
    const auto = (o, cx, cy, s) => { // przód auta w stylu bawarskiej limuzyny: podwójna nerka z żeberkami, podwójne okrągłe światła; bez logo marki
      o.save(); o.translate(cx, cy); o.scale(s, s);
      o.fillStyle = K.ink; for (const x0 of [-52, 38]) { o.beginPath(); o.roundRect(x0, -4, 14, 10, 3); o.fill(); } // opony spod nadwozia
      o.fillStyle = K.kosc;
      o.fill(new Path2D("M-34 -36 L-24 -52 L24 -52 L34 -36 Z"));                                                     // kabina
      o.fill(new Path2D("M-56 0 L-56 -16 Q-55 -24 -46 -27 L-34 -37 Q-30 -40 -22 -40 L22 -40 Q30 -40 34 -37 L46 -27 Q55 -24 56 -16 L56 0 Z")); // niska maska i zderzak
      o.fillStyle = K.ink; o.fill(new Path2D("M-29 -38 L-21 -49 L21 -49 L29 -38 Z"));                                 // szyba
      for (const k of [-1, 1]) {
        o.beginPath(); o.roundRect(k > 0 ? 2 : -14, -33, 12, 18, 4); o.fill();                                         // nerka grilla
        for (const x of [3, 6, 9]) { o.fillStyle = K.kosc; o.fillRect(k > 0 ? 2 + x - 0.75 : -14 + x - 0.75, -31, 1.5, 14); } // pionowe żeberka
        o.fillStyle = K.ink;
        for (const x of [38, 27]) { o.beginPath(); o.arc(k * x, -25, 5.5, 0, 7); o.fill(); o.strokeStyle = K.kosc; o.lineWidth = 1.5; o.beginPath(); o.arc(k * x, -25, 3.3, 0, 7); o.stroke(); } // „angel eyes”
      }
      o.beginPath(); o.roundRect(-30, -11, 60, 6, 3); o.fill();                                                         // dolny wlot
      o.restore();
    };
    return {
      nielekbestia: (o) => { miecz(o, 256, 163, 0.58, 0.9); dopisek(o, "BEST AATROX EUNE", 346, 34, K.ink); }, // v11: ikony mniejsze i niżej (y ≈ 140–194), nad nimi naklejka
      veen: (o) => { lisc(o, 172, 180, 1.6); zegar(o, 256, 168, 0.95); joint(o, 340, 178, 2.0); dopisek(o, "BEST EKKO EUNE", 336, 30, K.kosc); auto(o, 256, 420, 1.3); },
    };
  })();
  function nalozSmaczek(x, sk, rysuj, strony) {
    const W = 512 * sk, H = 512 * sk, off = document.createElement("canvas"); off.width = W; off.height = H;
    const o = off.getContext("2d"); o.setTransform(sk, 0, 0, sk, 0, 0); rysuj(o);
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
    for (const [y0, y1] of [[48, 196], [316, 464]]) for (let r = y0 * sk; r < y1 * sk; r++) {
      const c = Math.cos((0.5 - (r + 0.5) / H) * Math.PI);
      for (const cx of strony) x.drawImage(off, 0, r, W, 1, (cx - 256 * c) * sk, r, W * c, 1); // nick leży na x 256 i 768: smaczek też, z obu stron kuli
    }
    x.restore();
  }
  // v9: twarze w siatce 16×16 (makieta-pudelka-tlo.html, F1 i G1): własne postacie jak robocik, bez twarzy z gry. Piksele ostre: przenoszenie bez wygładzania.
  // v11: twarze zeszły z bombek ekipy na osobne ozdoby (F1, G1, Reze, Toji); na bombce zostaje mała naklejka z twarzą u góry kuli, nick wraca na przód.
  const TWARZE = (() => {
    const K = { ink: hex(KOLOR.ink), krew: hex(KOLOR.krew), hot: hex(KOLOR.hot), kosc: hex(KOLOR.kosc), linia: hex(KOLOR.linia) };
    const kolo = (px, cx, cy, rr, c) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= rr) px(x, y, c); };
    const prost = (px, x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px(x, y, c); };
    const ZN = { K: K.krew, W: K.kosc, I: K.ink, H: K.hot, L: K.linia };
    const wiersze = (rz) => { if (rz.length !== 16 || rz.some((w) => w.length !== 16)) throw new Error("twarz: siatka nie 16×16"); return (px) => rz.forEach((w, y) => [...w].forEach((z, x) => { if (ZN[z]) px(x, y, ZN[z]); })); };
    return {
      // R1 (tylko paleta; zielone oko i fiolet czekają na zgodę maisy): czapka Mikołaja krew + kość, krótkie włosy ink zasłaniają jedno oko, obróżka, wystawiony język hot
      Reze: wiersze([
        "..........WW....",
        "......KKKKWW....",
        ".....KKKKKK.....",
        "....KKKKKKKK....",
        "...WWWWWWWWWW...",
        "..IIIIIIIIIIII..",
        "..IIIIIIIIWWWI..",
        "..IIIIIIIWWWWI..",
        "..IIIIIIWWIWWI..",
        "..IIIIIWWWWWWI..",
        "..IIIIWWWWWWWI..",
        "...IIIWWWIIWI...",
        "...IIIWWWWHWI...",
        "....I.IWWWWWI...",
        ".......IIIII....",
        "........WWW.....",
      ]),
      // T1 (tylko paleta): czapka Mikołaja, potargane czarne włosy, wąskie oczy, blizna krew przy kąciku ust, półuśmiech w prawo, golf ink
      Toji: wiersze([
        "...........WW...",
        ".......KKKKWW...",
        ".....KKKKKKK....",
        "....KKKKKKKKK...",
        "...WWWWWWWWWWW..",
        "..IIIIIIIIIIIII.",
        ".IIIIIIIIIIIIII.",
        "..IIWIIWWWIIWWI.",
        "..IWWWWWWWWWWWI.",
        "..IWIIWWWWIIWWI.",
        "..IWWWWWWWWWWWI.",
        "..IWWWWWWWWWIWI.",
        "..IWWKIIIIWIWWI.",
        "...IWKWWWWWWWI..",
        "....IIIIIIIII...",
        "...IIIIIIIIIII..",
      ]),
      F1: (px) => { // F1: rogaty hełm, szczelina w kształcie T świeci hot
        for (let i = 0; i < 4; i++) { px(1 + i, 1 + i, K.krew); px(2 + i, 1 + i, K.krew); px(14 - i, 1 + i, K.krew); px(13 - i, 1 + i, K.krew); }
        prost(px, 4, 4, 11, 13, K.ink); prost(px, 3, 6, 12, 11, K.ink); prost(px, 5, 14, 10, 14, K.ink); prost(px, 4, 8, 11, 8, K.hot); prost(px, 7, 9, 8, 11, K.hot); prost(px, 6, 3, 9, 3, K.ink); px(5, 12, K.linia); px(10, 12, K.linia);
      },
      G1: (px) => { // G1: tarcza zegara z minką ^ ^ i ω
        kolo(px, 8, 8, 7.2, K.ink); kolo(px, 8, 8, 6.2, K.kosc);
        [[7, 2], [8, 2], [7, 13], [8, 13], [2, 7], [2, 8], [13, 7], [13, 8], [4, 7], [5, 6], [6, 7], [9, 7], [10, 6], [11, 7]].forEach(([x, y]) => px(x, y, K.ink));
        [[6, 10], [7, 11], [8, 10], [9, 11], [10, 10]].forEach(([x, y]) => px(x, y, K.krew)); px(4, 9, K.hot); px(11, 9, K.hot);
      },
    };
  })();
  const TWARZ_P = 16; // bok piksela twarzy w teksturze 1024×512: twarz 256×256, ok. ±45° szerokości i długości geograficznej
  function nalozTwarz(x, sk, rysuj, cx = 256) {
    const W = 512 * sk, off = document.createElement("canvas"); off.width = W; off.height = W;
    const o = off.getContext("2d"), P = TWARZ_P * sk, x0 = 256 * sk - 8 * P, y0 = 256 * sk - 8 * P;
    rysuj((px, py, c) => { o.fillStyle = c; o.fillRect(x0 + px * P, y0 + py * P, P, P); });
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.imageSmoothingEnabled = false;
    for (let r = Math.floor(y0); r < y0 + 16 * P; r++) {
      const c = Math.cos((0.5 - (r + 0.5) / W) * Math.PI);
      x.drawImage(off, 0, r, W, 1, Math.round((cx - 256 * c) * sk), r, Math.round(W * c), 1);
    }
    x.restore();
  }
  // v11 N1: okrągła naklejka z twarzą postaci u góry kuli, przy zawieszce, nad mieczem/zegarem, lekko przekrzywiona; obwódka kość między dwiema liniami ink
  // (sama kość znikałaby na kościanej bombce nielekbestii). Rysowana płasko wokół (NAK_X, NAK_Y), przenoszona wierszami jak smaczki, na obu stronach kuli.
  // Wiersz rozciągany o 1/cos(szerokości), czyli na kuli koło zostaje kołem (smaczki i twarze z v9 mają ściśnięcie o cos, zostawione bez zmian, bo przyjęte).
  const NAK_X = 256, NAK_Y = 100, NAK_R = 38, NAK_KAT = -14 * Math.PI / 180; // y 62–138 (szerokość geogr. ok. 46–68°)
  function nalozNaklejke(x, sk, rysuj, strony, maska) { // maska: zamiast rysunku samo koło w danym kolorze (mapa szorstkości: naklejka matowa jak papier)
    const W = 512 * sk, off = document.createElement("canvas"); off.width = W; off.height = W;
    const o = off.getContext("2d"); o.setTransform(sk, 0, 0, sk, 0, 0); o.translate(NAK_X, NAK_Y); o.rotate(NAK_KAT);
    const kolo = (r, k) => { o.fillStyle = k; o.beginPath(); o.arc(0, 0, r, 0, 7); o.fill(); };
    if (maska) kolo(NAK_R, maska); else kolo(NAK_R, hex(KOLOR.ink));
    if (!maska) { kolo(NAK_R - 2.5, hex(KOLOR.kosc)); kolo(NAK_R - 7.5, hex(KOLOR.ink)); kolo(NAK_R - 9.5, hex(KOLOR.kosc));
    o.save(); o.beginPath(); o.arc(0, 0, NAK_R - 9.5, 0, 7); o.clip(); o.imageSmoothingEnabled = false;
    const P = 3.1; rysuj((px, py, c) => { o.fillStyle = c; o.fillRect(-8 * P + px * P, -8 * P + py * P, P + 0.05, P + 0.05); }); // +0,05: bez szczelin między pikselami po obrocie
    o.restore();
    }
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
    for (let r = Math.floor((NAK_Y - NAK_R - 2) * sk); r < (NAK_Y + NAK_R + 2) * sk; r++) {
      const c = Math.cos((0.5 - (r + 0.5) / W) * Math.PI);
      for (const cx of strony) x.drawImage(off, 0, r, W, 1, (cx - 256 / c) * sk, r, W / c, 1);
    }
    x.restore();
  }
  const NAKLEJKI = { nielekbestia: "F1", veen: "G1" };
  const mrN = {};
  function mrNaklejki(nazwa) { // bombka z naklejką: własna mapa jak texMR (opaska matowa) plus matowe, niemetaliczne koła naklejek; reszta bombek: wspólna texMR
    if (!NAKLEJKI[nazwa]) return texMR;
    if (mrN[nazwa]) return mrN[nazwa];
    const c = document.createElement("canvas"); c.width = 1024; c.height = 512; const x = c.getContext("2d");
    x.fillStyle = "rgb(0,84,255)"; x.fillRect(0, 0, 1024, 512); x.fillStyle = "rgb(0,255,30)"; x.fillRect(0, 196, 1024, 120);
    nalozNaklejke(x, 1, null, [256, 768], "rgb(0,200,0)");
    return (mrN[nazwa] = new T.CanvasTexture(c));
  }
  const siatki = [], opaski = []; // siatki: wszystkie duże kule (bombki ekipy, potem ozdoby z buźkami) w kolejności wahadeł
  duze.forEach((w) => {
    const p = w.projekt, ciemna = p.kolor === KOLOR.ink, ozd = !!p.ozdoba;
    const sk = ozd ? 1 : poziom === 0 ? 2 : 1; // na mocnym sprzęcie tekstura 2048×1024: nazwa ostra także przy najbliższym podjeździe (ozdoba bez napisów: 1024×512)
    const c = document.createElement("canvas"); c.width = 1024 * sk; c.height = 512 * sk;
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
    opaski.push(() => {
      const x = c.getContext("2d"); x.setTransform(sk, 0, 0, sk, 0, 0);
      x.fillStyle = hex(p.kolor); x.fillRect(0, 0, 1024, 512);
      if (ozd) { for (const cx of [256, 768]) nalozTwarz(x, sk, TWARZE[p.twarz], cx); tex.needsUpdate = true; return; } // ozdoba: buźka z przodu i z tyłu, bez opaski
      x.fillStyle = hex(ciemna ? KOLOR.kosc : KOLOR.ink); x.fillRect(0, 196, 1024, 120); // v11: opaska dookoła, nick z przodu i z tyłu (v9 miało z przodu twarz)
      const fs = Math.min(64, Math.floor(300 / (p.nazwa.length * 0.6)));
      x.font = `500 ${fs}px "Geist Mono", ui-monospace, Consolas, monospace`; x.textAlign = "center"; x.textBaseline = "middle";
      x.fillStyle = hex(ciemna ? KOLOR.ink : KOLOR.kosc);
      x.fillText(p.nazwa, 256, 258); x.fillText(p.nazwa, 768, 258);
      if (SMACZKI[p.nazwa]) nalozSmaczek(x, sk, SMACZKI[p.nazwa], [256, 768]);
      if (NAKLEJKI[p.nazwa]) nalozNaklejke(x, sk, TWARZE[NAKLEJKI[p.nazwa]], [256, 768]);
      tex.needsUpdate = true;
    });
    const mat = ozd
      ? new T.MeshPhysicalMaterial({ color: 0xffffff, map: tex, metalness: 0.35, roughness: 0.42, envMap: envTex, envMapIntensity: 1.2, clearcoat: 1, clearcoatRoughness: 0.08 }) // mniej metalu niż bombki: buźka nie ginie w odbiciach
      : new T.MeshPhysicalMaterial({ color: 0xffffff, map: tex, metalness: ciemna ? 0.2 : 0.75, roughness: 0.55, metalnessMap: mrNaklejki(p.nazwa), roughnessMap: mrNaklejki(p.nazwa), envMap: envTex, envMapIntensity: 1.35, clearcoat: 1, clearcoatRoughness: 0.08 });
    const g = new T.Group(); g.position.copy(w.A);
    // grupa stoi na końcu sznurka (tam ozdoba się obraca), kula wisi pod nim
    const r = w.r, kula = new T.Mesh(new T.SphereGeometry(r, ozd ? 36 : 48, ozd ? 24 : 32), mat); kula.position.y = -(w.L - w.Ls); kula.rotation.y = Math.atan2(w.A.x, w.A.z); g.add(kula);
    const sz = ciemna ? 1.35 : 1;
    const kap = new T.Mesh(new T.CylinderGeometry(r * 0.2 * sz, r * 0.2 * sz, r * 0.22, 16), matKap); kap.position.y = -(w.L - w.Ls) + r * 1.04; g.add(kap);
    choinka.add(g);
    siatki.push({ i: w.i, w, grupa: g, kula, kap, r, projekt: p, ozdoba: ozd, skala: 1, cel: 1, obr0: kula.rotation.y });
  });
  const bombki = siatki.filter((b) => !b.ozdoba), ozdoby = siatki.filter((b) => b.ozdoba); // bombki = tylko nicki ekipy (klawiatura, testy), ozdoby osobno
  const rysujOpaski = () => opaski.forEach((f) => f());
  rysujOpaski();
  if (document.fonts && document.fonts.load) document.fonts.load('500 64px "Geist Mono"').then(rysujOpaski).catch(() => {});

  // ---------- girlanda z koralików: pięć pętli zawieszonych między końcami gałęzi, zwis między zaczepami ----------
  const kor = [], korA = [], korB = [], przesla = []; // przęsło między dwoma zaczepami ma własną bezwładność: buja się wokół linii zaczepów
  for (const okolek of OKOLKI_GIRLANDY) {
    const pk = glowne.filter((k) => k.k === okolek).sort((a, b) => a.a - b.a);
    const Q = pk.map((k) => ({ p: new T.Vector3().copy(k.p).addScaledVector(k.t, 0.3).addScaledVector(GORA, -0.05), h: k.g.h !== undefined ? k.g.h : 0.5, gal: k.g.gal }));
    for (let j = 0; j < Q.length; j++) {
      const a = Q[j], b = Q[(j + 1) % Q.length], dl = a.p.distanceTo(b.p), nb = Math.max(2, Math.round(dl / 0.09)), zwis = 0.14 * dl + 0.03;
      let nx = b.p.z - a.p.z, nz = a.p.x - b.p.x; const nl = Math.hypot(nx, nz) || 1, sx = (a.p.x + b.p.x) / 2, sz = (a.p.z + b.p.z) / 2;
      nx /= nl; nz /= nl; if (nx * sx + nz * sz < 0) { nx = -nx; nz = -nz; } // pozioma normalna do linii zaczepów, na zewnątrz drzewa
      const pole = POLE_S + przesla.length; przesla.push({ zwis, r: Math.hypot(sx, sz), a: a.gal, b: b.gal, los: R2() });
      for (let m = 0; m < nb; m++) {
        const s = m / nb, wz4 = 4 * s * (1 - s);
        kor.push(lerp(a.p.x, b.p.x, s), lerp(a.p.y, b.p.y, s) - zwis * wz4, lerp(a.p.z, b.p.z, s), lerp(a.h, b.h, s), wz4, (kor.length / 6) % 4 === 3 ? 1 : 0);
        korA.push(a.gal, b.gal, s, pole); korB.push(zwis * wz4, nx, nz);
      }
    }
  }
  const NS = przesla.length;
  if (POLE_S + NS > STAN_W) throw new Error("tekstura stanu za mała: " + (POLE_S + NS));
  const NK = kor.length / 6, korP = new Float32Array(NK * 3), korG = new Float32Array(NK * 3);
  for (let i = 0; i < NK; i++) { korP.set(kor.slice(i * 6, i * 6 + 3), i * 3); korG.set(kor.slice(i * 6 + 3, i * 6 + 6), i * 3); }
  const geoKor = new T.BufferGeometry();
  geoKor.setAttribute("position", new T.BufferAttribute(korP, 3)); geoKor.setAttribute("aG", new T.BufferAttribute(korG, 3));
  geoKor.setAttribute("aK", new T.BufferAttribute(new Float32Array(korA), 4)); geoKor.setAttribute("aK2", new T.BufferAttribute(new Float32Array(korB), 3));
  const korMat = new T.ShaderMaterial({
    alphaToCoverage: true,
    uniforms: { uSw: U.uSw, uLid: U.uLid, uStan: U.uStan, uSkala: uSkalaWsp, uR: { value: 0.05 } },
    vertexShader: `
      attribute vec3 aG; attribute vec4 aK; attribute vec3 aK2; uniform float uSkala, uR; varying vec2 vK;
      ${GLSL_POLE}
      void main(){
        // koralik idzie za gałęziami swoich dwóch zaczepów, a przęsło dokłada własne wahnięcie wokół linii zaczepów (stan przęsła: sin i 1 − cos kąta)
        vec3 p = position + poleD(position, aG.x) + poleD(position, aG.x + 0.5) * aG.y * 0.9 + mix(poleG(position, aK.x, 1.0), poleG(position, aK.y, 1.0), aK.z);
        vec4 sp = stanG(aK.w);
        p += aK2.x * (vec3(aK2.y, 0.0, aK2.z) * sp.x + vec3(0.0, sp.y, 0.0));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float blisko = smoothstep(0.6, 1.3, -mv.z);
        gl_Position = blisko > 0.0 ? projectionMatrix * mv : vec4(2.0, 2.0, 2.0, 1.0);
        vec4 pf = projectionMatrix * vec4(mv.xy, mv.z + uR * 1.6, 1.0);
        if (blisko > 0.0) gl_Position.z = pf.z / pf.w * gl_Position.w;
        gl_PointSize = max(2.0 * uR * uSkala / -mv.z * blisko, 1.5);
        vK = vec2(aG.z, blisko);
      }`,
    fragmentShader: `
      precision highp float;
      ${GLSL_PALETA}
      uniform float uSw; varying vec2 vK;
      void main(){
        float r = length(gl_PointCoord - 0.5) * 2.0;
        if (r > 1.0) discard;
        vec3 baza = mix(KREW, KOSC, vK.x);
        vec3 c = mix(mix(INK, baza, 0.5), baza, uSw);                                   // bez żarówek koralik gaśnie do połowy
        c = mix(c, mix(INK, baza, 0.25), smoothstep(0.3, 1.2, length(gl_PointCoord - vec2(0.40, 0.36)) * 2.0)); // cień kulki
        c = mix(c, KOSC, (1.0 - smoothstep(0.05, 0.3, length(gl_PointCoord - vec2(0.36, 0.32)) * 2.0)) * 0.75 * uSw); // ostry połysk, bez poświaty
        gl_FragColor = vec4(c, (1.0 - smoothstep(0.84, 1.0, r)) * vK.y);
      }`,
  });
  const girlanda = new T.Points(geoKor, korMat); girlanda.frustumCulled = false; choinka.add(girlanda);

  // ---------- fizyka: wahadła, gałęzie, przęsła girlandy i przewodnik na CPU, stały krok 1/120 s ----------
  const KROK = 1 / 120;
  // Liczby sprawdzane w testy\etap52.js, etap2b.js i na taśmach klatek z żywej pętli.
  const S_GR = 0.5, KW = 260, CW = 12, CWI = 22; // miękka granica: od połowy zakresu rośnie opór i tłumienie (od strony korony mocniej: ozdoba grzęźnie w igłach)
  const PCH = 11, K_ATT = 1 - Math.exp(-KROK / 0.035), K_ZAN = Math.exp(-KROK / 0.09); // pchnięcie: siła narasta w ok. 35 ms i gaśnie w ok. 90 ms po końcu kontaktu
  const TW_OM = 2.3, TW_C = 0.85, TW_SPRZ = 0.45; // skręt dużej bombki wokół sznurka: okres ok. 2,7 s, bombka spóźnia się za obrotem drzewa
  const ND = NW - ND0, tw = new Float32Array(NW), tv = new Float32Array(NW), tp = new Float32Array(NW), twK = new Float32Array(NW); // skręt wokół sznurka: wszystkie ozdoby
  const K_NAP = 1 - Math.exp(-KROK / 0.045);
  let fizAcc = 0, obrFiz = 0, tFiz = 0, omF1 = 0, omF2 = 0, skokMax = 0, kosztSuma = 0, kosztN = 0, kosztMax = 0;
  const miekko = (x, m) => m * Math.tanh(x / m);
  // ---- ruch ustalony 18.11 (v5.3): gałęzie 50 / ozdoby 50 / ciężar 50, panel strojenia i stary ruch z v5.1 usunięte ----
  const STROJ = { galezie: 50, ozdoby: 50, ciezar: 50 };
  const P = (() => {
    const g = STROJ.galezie / 100, o = STROJ.ozdoby / 100, c = STROJ.ciezar / 100;
    return {
      kappa: lerp(0.22, 0.55, o), asat: lerp(0.03, 0.18, o) * G_FIZ, cMul: lerp(4.8, 2.0, o), kb: lerp(0.15, 0.6, o), // ozdoby: ile czują obrót, jak daleko się wychylają, jak szybko gasną, ile bierze je ruch gałęzi
      gk: lerp(0.08, 0.5, g), omSk: lerp(1.25, 0.8, g),                                                            // gałęzie: ugięcie i sztywność
      omChwyt: lerp(26, 8, c), vMax: lerp(2.2, 0.6, c), vDrag: lerp(7, 2, c), tarcie: lerp(1.6, 3.6, c),             // drzewo: jak szybko idzie za ręką, limit prędkości, hamowanie wybiegu
      cm: 1, drg: true };
  })();
  // przewodnik (wierzchołek z emiterem hologramu): sprężyna 2D w układzie drzewa. Drzewo nie stoi idealnie prosto (mimośród E_LID),
  // więc rozpędzanie i siła odśrodkowa kołyszą wierzchołek; ugięcie jedzie przez poleD do igieł, żarówek, ozdób i emitera.
  const LID = { x: 0, z: 0, vx: 0, vz: 0, px: 0, pz: 0, fx: 0, fz: 0 }, LID_OM = 5.2, LID_DZ = 0.13, E_LID = [0.12, 0.08], LID_MAX = 0.16;
  // gałęzie: każda ma własną sprężynę. x = ugięcie styczne końca (zostaje w tyle przy rozpędzaniu drzewa), y = pionowe (kiwanie góra–dół).
  // Długa gałąź z dołu jest wolniejsza i miększa niż krótka z góry; rozrzut częstości i tłumienia, żeby nie kiwały się chórem.
  const bX = new Float32Array(NB + 1), bY = new Float32Array(NB + 1), bVx = new Float32Array(NB + 1), bVy = new Float32Array(NB + 1), bPx = new Float32Array(NB + 1), bPy = new Float32Array(NB + 1), bAx = new Float32Array(NB + 1);
  const bOm = new Float32Array(NB + 1), bDz = new Float32Array(NB + 1), bR = new Float32Array(NB + 1), bKap = new Float32Array(NB + 1);
  for (let b = 1; b <= NB; b++) { const L = galezie[b].L; bR[b] = L; bOm[b] = Math.min(13, 11.5 / Math.sqrt(L)) * (0.85 + 0.3 * R2()); bDz[b] = 0.2 + 0.1 * R2(); bKap[b] = (R2() - 0.5) * 1.4; }
  // przęsła girlandy: wahadło wokół linii zaczepów, długość z głębokości zwisu
  const sF = new Float32Array(NS), sV = new Float32Array(NS), sPp = new Float32Array(NS), sOm2 = new Float32Array(NS), sC = new Float32Array(NS), sIL = new Float32Array(NS), sR = new Float32Array(NS), sKap = new Float32Array(NS);
  const sGa = new Int32Array(NS), sGb = new Int32Array(NS);
  przesla.forEach((s, j) => { const Le = Math.max(0.1, 0.7 * s.zwis); sOm2[j] = G_FIZ / Le; sIL[j] = 1 / Le; sC[j] = 2 * (0.11 + 0.08 * s.los) * Math.sqrt(G_FIZ / Le); sR[j] = s.r; sKap[j] = (s.los - 0.5) * 0.5; sGa[j] = s.a; sGb[j] = s.b; });
  function zerujFizyke(obr) {
    for (const t of [ux, uz, vx, vz, bx, bz, bvx, bvz, wx, wz, px, pz, cx, cz, qx, qz, fPx, fPz, cPx, cPz, tw, tv, tp, twK, bX, bY, bVx, bVy, bPx, bPy, bAx, sF, sV, sPp, nacY]) t.fill(0);
    uderzyl.fill(0);
    for (const k in LID) LID[k] = 0;
    fizAcc = 0; obrFiz = obr; tFiz = 0; skokMax = 0; omF1 = omF2 = 0;
  }
  function krokFizyki(om, al) {
    tFiz += KROK;
    const ome = om * P.kappa, ale = al * P.kappa, om2 = ome * ome;
    const cc = Math.cos(2 * ome * KROK), sc = Math.sin(2 * ome * KROK);
    if (P.gk > 0) for (let b = 1; b <= NB; b++) { // gałęzie: cel to ugięcie statyczne pod siłą bezwładności, sprężyna dochodzi do niego z własnym rytmem
      const ob = bOm[b] * P.omSk, k2 = ob * ob, tl = 2 * bDz[b] * ob, Rb = bR[b];
      const xT = miekko(-al * Rb * P.gk / k2, 0.13 * Rb);
      const yT = bKap[b] * xT * 0.55 - 0.6 * bX[b] * bX[b] / Rb + miekko(om * om * Rb * P.gk * 0.5 / k2, 0.05 * Rb); // część ruchu w bok przechodzi w pion (każda gałąź inaczej), zgięta gałąź opada, odśrodkowa lekko unosi
      const a1 = k2 * (xT - bX[b]) - tl * bVx[b]; bVx[b] += a1 * KROK; bX[b] += bVx[b] * KROK; bAx[b] = a1;
      bVy[b] += (k2 * 1.7 * (yT - bY[b]) - tl * 1.3 * bVy[b]) * KROK; bY[b] += bVy[b] * KROK;
    }
    for (let i = 0; i < NW; i++) {
      const ax = fA[i * 3], az = fA[i * 3 + 2], il = fInvL[i];
      // siły pozorne w układzie drzewa: odśrodkowa Ω²·r na zewnątrz, Eulera −α×r przeciw rozpędzaniu; razem nasycane
      let fx = om2 * ax - ale * az, fz = om2 * az + ale * ax;
      if (P.kb > 0 && fGal[i]) { const ab = bAx[fGal[i]] * fS2[i] * P.kb * (i >= ND0 ? 1 : 0.45); fx -= ab * fE[i * 2 + 1]; fz += ab * fE[i * 2]; } // zaczep jedzie na gałęzi: jej kiwanie potrząsa ozdobą
      const fm = Math.hypot(fx, fz); if (fm > 1e-6) { const k = miekko(fm, P.asat) / fm; fx *= k; fz *= k; }
      fPx[i] += (cPx[i] - fPx[i]) * K_ATT; fPz[i] += (cPz[i] - fPz[i]) * K_ATT; cPx[i] *= K_ZAN; cPz[i] *= K_ZAN;
      // pełne wahadło: sin kąta w sile powrotnej, cos w napędzie (przy dużym wychyleniu napęd słabnie, ozdoba nie „staje dęba”)
      const x0 = ux[i], z0 = uz[i], th = Math.hypot(x0, z0), sn = th > 1e-4 ? Math.sin(th) / th : 1, cs = Math.cos(th);
      const ci = fC[i] * P.cMul * (i >= ND0 ? 0.5 : 1); // ciężka bombka buja się dłużej niż lekka
      let axx = -fOm2[i] * sn * x0 - ci * vx[i] + fx * il * cs + fPx[i];
      let azz = -fOm2[i] * sn * z0 - ci * vz[i] + fz * il * cs + fPz[i];
      // miękka granica: osobno wzdłuż promienia (na zewnątrz 35°, do środka tyle, ile puszcza korona) i wzdłuż stycznej
      const ex = fE[i * 2], ez = fE[i * 2 + 1], lo = fLim[i * 3], li = fLim[i * 3 + 1], lt = fLim[i * 3 + 2];
      let ur = x0 * ex + z0 * ez, ut = x0 * ez - z0 * ex, vr = vx[i] * ex + vz[i] * ez, vt = vx[i] * ez - vz[i] * ex, wr = 0, wt = 0;
      if (ur > lo * S_GR) { const p = (ur - lo * S_GR) / (lo * (1 - S_GR)); wr = -KW * p * p - CW * p * vr; }
      else if (ur < -li * S_GR) { const p = (-ur - li * S_GR) / (li * (1 - S_GR)); wr = KW * p * p - CWI * p * vr; }
      if (ut > lt * S_GR) { const p = (ut - lt * S_GR) / (lt * (1 - S_GR)); wt = -KW * p * p - CW * p * vt; }
      else if (ut < -lt * S_GR) { const p = (-ut - lt * S_GR) / (lt * (1 - S_GR)); wt = KW * p * p - CW * p * vt; }
      axx += wr * ex + wt * ez; azz += wr * ez - wt * ex;
      const skok = Math.hypot(axx, azz) * KROK; if (skok > skokMax) skokMax = skok;
      let nvx = vx[i] + axx * KROK, nvz = vz[i] + azz * KROK;
      { const t = nvx * cc - nvz * sc; nvz = nvx * sc + nvz * cc; nvx = t; } // siła Coriolisa jako czysty obrót prędkości: płaszczyzna wahań zostaje w pokoju, energii nie przybywa
      let x = x0 + nvx * KROK, z = z0 + nvz * KROK;
      // twarda granica zostaje jako bezpiecznik (gniazdo w koronie jest wycięte tylko do niej); ma się prawie nie zdarzać
      ur = x * ex + z * ez; ut = x * ez - z * ex; vr = nvx * ex + nvz * ez; vt = nvx * ez - nvz * ex;
      let ciecie = false;
      if (ur > lo) { ur = lo; if (vr > 0) vr = 0; ciecie = true; } else if (ur < -li) { ur = -li; if (vr < 0) vr = 0; ciecie = true; }
      if (ut > lt) { ut = lt; if (vt > 0) vt = 0; ciecie = true; } else if (ut < -lt) { ut = -lt; if (vt < 0) vt = 0; ciecie = true; }
      const m = Math.hypot(ur, ut); if (m > 35 * RAD) { ur *= 35 * RAD / m; ut *= 35 * RAD / m; ciecie = true; }
      if (ciecie) { x = ur * ex + ut * ez; z = ur * ez - ut * ex; nvx = vr * ex + vt * ez; nvz = vr * ez - vt * ex; uderzyl[i] = 1; }
      ux[i] = x; uz[i] = z; vx[i] = nvx; vz[i] = nvz;
      nacY[i] = (nvx * nvx + nvz * nvz) / fOm2[i] - (1 - Math.cos(Math.hypot(x, z))); // nadwyżka naciągu sznurka: ciągnie gałązkę w dół, gdy ozdoba przelatuje przez środek
      // ozdoba goni sznurek sprężyną: spóźnia się przy ruszaniu i lekko przestrzeliwuje przy zawracaniu
      const ob = fOmB[i], ob2 = ob * ob, tb = 2 * fDzB[i] * ob;
      bvx[i] += (-ob2 * (bx[i] - x) - tb * (bvx[i] - nvx)) * KROK; bvz[i] += (-ob2 * (bz[i] - z) - tb * (bvz[i] - nvz)) * KROK;
      bx[i] += bvx[i] * KROK; bz[i] += bvz[i] * KROK;
      const t2 = Math.hypot(x, z), s2 = t2 > 1e-4 ? Math.sin(t2) / t2 : 1; wx[i] = x * s2; wz[i] = z * s2;
      const t3 = Math.hypot(bx[i], bz[i]), s3 = (t3 > 1e-4 ? Math.sin(Math.min(t3, 1.2)) / t3 : 1); cx[i] = bx[i] * s3; cz[i] = bz[i] * s3;
    }
    for (let j = 0; j < NW; j++) { // skręt wokół sznurka: bezwładna kula zostaje w tyle za obrotem drzewa i powoli się odkręca (małe szybciej niż duże)
      const dz = j >= ND0, ot = dz ? TW_OM : 3.6, ct = dz ? TW_C : 1.5;
      tv[j] += (-al * TW_SPRZ + twK[j] - ot * ot * tw[j] * (1 + tw[j] * tw[j] * 1.5) - ct * tv[j]) * KROK; twK[j] *= K_ZAN;
      tw[j] += tv[j] * KROK;
    }
    for (let j = 0; j < NS; j++) { // przęsła girlandy: odśrodkowa wynosi je na zewnątrz, szarpnięcia zaczepów je rozkołysują
      const nap = miekko(om2 * sR[j] * 0.8 + sKap[j] * (bAx[sGa[j]] + bAx[sGb[j]]), 0.6 * G_FIZ);
      sV[j] += (-sOm2[j] * Math.sin(sF[j]) - sC[j] * sV[j] + nap * sIL[j] * Math.cos(sF[j])) * KROK; sF[j] = clamp(sF[j] + sV[j] * KROK, -1.2, 1.2);
    }
    { // przewodnik: te same siły pozorne co u ozdób (na mimośrodzie wierzchołka), do tego pchnięcie (klik w hologram, drgnięcie w spoczynku)
      const ex = E_LID[0] + LID.x, ez = E_LID[1] + LID.z, k2 = LID_OM * LID_OM, kg = P.gk * 5;
      const nx = miekko((om * om * ex - al * ez) * kg, 1.2), nz = miekko((om * om * ez + al * ex) * kg, 1.2);
      LID.vx += (-k2 * LID.x - 2 * LID_DZ * LID_OM * LID.vx + nx + LID.fx) * KROK; LID.vz += (-k2 * LID.z - 2 * LID_DZ * LID_OM * LID.vz + nz + LID.fz) * KROK;
      LID.fx *= K_ZAN; LID.fz *= K_ZAN;
      LID.x += LID.vx * KROK; LID.z += LID.vz * KROK;
      const m = Math.hypot(LID.x, LID.z); if (m > LID_MAX) { LID.x *= LID_MAX / m; LID.z *= LID_MAX / m; LID.vx *= 0.5; LID.vz *= 0.5; }
    }
  }
  // jedna klatka: drzewo obróciło się z obrA do obrB, jego prędkość kątowa zmieniła się z omA na omB. Kroki fizyki biorą obie z interpolacji,
  // a przyspieszenie kątowe jest stałe w klatce, więc wynik nie zależy od liczby klatek ani od nierównych zdarzeń myszy.
  function fizyka(dt, obrA, obrB, omA, omB) {
    if (mniejRuchu) return;
    const acc0 = fizAcc, n = Math.min(8, Math.floor((acc0 + dt) / KROK));
    for (let k = 1; k <= n; k++) {
      const f = clamp((k * KROK - acc0) / dt, 0, 1);
      obrFiz = obrA + (obrB - obrA) * f;
      // gałęzie działają jak amortyzator: ozdoby dostają prędkość drzewa po dwóch filtrach (2 × 45 ms), a przyspieszenie liczę z przefiltrowanej.
      // Wahadło o okresie ok. 1 s tego nie odczuwa, a drgania ręki i nierówne zdarzenia myszy (10–60 Hz) znikają.
      const om = clamp(omA + (omB - omA) * f, -12, 12), o2 = omF2;
      omF1 += (om - omF1) * K_NAP; omF2 += (omF1 - omF2) * K_NAP;
      if (k === n) { px.set(wx); pz.set(wz); qx.set(cx); qz.set(cz); tp.set(tw); bPx.set(bX); bPy.set(bY); sPp.set(sF); LID.px = LID.x; LID.pz = LID.z; }
      krokFizyki(omF2, clamp((omF2 - o2) / KROK, -80, 80));
    }
    fizAcc = Math.max(0, Math.min(acc0 + dt - n * KROK, KROK));
  }
  const dD = [0, 0, 0];
  function poleDjs(x, y, z) { // to samo co poleD w shaderze: ugięcie przewodnika
    const s = clamp((y - Y_LID0) / (Y_LID1 - Y_LID0), 0, 1), u = U.uLid.value;
    dD[0] = u.x * s * s; dD[1] = 0; dD[2] = u.y * s * s;
  }
  // stan do rysowania: interpolacja między dwoma ostatnimi krokami (gładko także na 144 Hz), wysyłka jednego atrybutu dla wszystkich siatek
  function odswiezOzdoby() {
    const a = clamp(fizAcc / KROK, 0, 1), w2 = aWah.array, sd = stanDane, sk = aSkr.array;
    U.uLid.value.set(LID.px + (LID.x - LID.px) * a, LID.pz + (LID.z - LID.pz) * a);
    for (let b = 1; b <= NB; b++) { sd[b * 4] = bPx[b] + (bX[b] - bPx[b]) * a; sd[b * 4 + 1] = bPy[b] + (bY[b] - bPy[b]) * a; }
    for (let j = 0; j < NS; j++) { const f = sPp[j] + (sF[j] - sPp[j]) * a, o = (POLE_S + j) * 4; sd[o] = Math.sin(f); sd[o + 1] = 1 - Math.cos(f); }
    for (let i = 0; i < NW; i++) {
      const x = px[i] + (wx[i] - px[i]) * a, z = pz[i] + (wz[i] - pz[i]) * a, c = Math.sqrt(Math.max(0, 1 - x * x - z * z));
      const xb = qx[i] + (cx[i] - qx[i]) * a, zb = qz[i] + (cz[i] - qz[i]) * a, cb = Math.sqrt(Math.max(0, 1 - xb * xb - zb * zb)), ls = fLs[i], ob = fO[i] - ls;
      w2[i * 4] = x; w2[i * 4 + 1] = z; w2[i * 4 + 2] = xb; w2[i * 4 + 3] = zb;
      // gałązka pod ozdobą: sznurek ciągnie jej koniec w stronę wychylenia, a w dół, gdy ozdoba przelatuje przez środek
      const o4 = (POLE_O + i) * 4, eX = fCm[i] * P.cm * x, eZ = fCm[i] * P.cm * z, eY = -fCv[i] * P.cm * clamp(nacY[i], -0.05, 0.25);
      sd[o4] = eX; sd[o4 + 1] = eY; sd[o4 + 2] = eZ;
      poleDjs(fA[i * 3], fA[i * 3 + 1], fA[i * 3 + 2]);
      const g = fGal[i], gX = g ? sd[g * 4] * fS2[i] : 0, gY = g ? sd[g * 4 + 1] * fS2[i] : 0; // to samo co poleG w shaderze
      const zx = fA[i * 3] + dD[0] + fE[i * 2 + 1] * gX + eX * T_ZACZ, zy = fA[i * 3 + 1] + dD[1] + gY + eY * T_ZACZ, zz = fA[i * 3 + 2] + dD[2] - fE[i * 2] * gX + eZ * T_ZACZ; // zaczep
      const kx = zx + x * ls, ky = zy - c * ls, kz = zz + z * ls; // koniec sznurka
      srodki[i * 3] = kx + xb * ob; srodki[i * 3 + 1] = ky - cb * ob; srodki[i * 3 + 2] = kz + zb * ob;
      const skr = tp[i] + (tw[i] - tp[i]) * a; sk[i] = skr;
      if (i >= ND0) {
        const b = siatki[i - ND0];
        b.grupa.position.set(kx, ky, kz); b.grupa.quaternion.setFromUnitVectors(GORA, v1.set(-xb, cb, -zb));
        b.kula.rotation.y = b.obr0 + skr;
      }
    }
    aWah.needsUpdate = true; aSkr.needsUpdate = true; stanTex.needsUpdate = true;
  }
  const katWah = (i) => Math.hypot(ux[i], uz[i]) / RAD;
  // pchnięcie w układzie drzewa: nie skok prędkości, tylko siła, która narasta i gaśnie; lekka ozdoba dostaje mocniej
  function szturchnij(i, dx, dz, moc) {
    if (mniejRuchu || i < 0) return;
    const m = Math.hypot(dx, dz) || 1, k = moc * PCH * fMasa[i] / m;
    cPx[i] = dx * k; cPz[i] = dz * k;
  }
  // symulacja do testów: ten sam kod co w pętli, bez rysowania.
  // Albo obrót o „kat” w czasie „czas” (profil gładki), albo „zdarzenia” [[ms, kąt], …] jak z myszy: drzewo goni je tą samą sprężyną co na żywo, po ostatnim puszczenie.
  function symuluj(o) {
    const zap = { obr: stan.obr, vObr: stan.vObr, drag: stan.drag, chwyt: stan.chwyt, obrCel: stan.obrCel, obrot: stan.obrot };
    zerujFizyke(stan.obr);
    const fps = o.fps || 120, dt = 1 / fps, obr0 = stan.obr, zd = o.zdarzenia, czas = zd ? zd[zd.length - 1][0] / 1000 : (o.czas || 0), ile = Math.round((o.trwanie || 8) * fps);
    const maks = new Float32Array(NW), dog = new Float32Array(NW);
    let nz = 0, obrPusc = null, cof = 0, wybieg = 0, kier = 0, vPusc = 0, galSzczyt = 0;
    stan.obrCel = null; stan.obrot = false; stan.vObr = 0;
    if (zd) { stan.drag = true; stan.chwyt = stan.obr; }
    if (o.impuls) szturchnij(o.impuls.i, o.impuls.dx, o.impuls.dz, o.impuls.moc);
    for (let k = 1; k <= ile; k++) {
      const t = k * dt, omA = stan.vObr, obrA = stan.obr;
      if (zd) {
        while (nz < zd.length && zd[nz][0] / 1000 <= t) { stan.chwyt = obr0 + zd[nz][1]; nz++; }
        if (nz === zd.length && stan.drag) { pusc(); obrPusc = stan.obr; kier = Math.sign(stan.vObr); vPusc = stan.vObr; }
        ruchDrzewa(dt, 0);
        if (obrPusc !== null) { const d = (stan.obr - obrPusc) * kier; if (d > wybieg) wybieg = d; if (wybieg - d > cof) cof = wybieg - d; }
      } else {
        const u = czas ? clamp(t / czas, 0, 1) : 1;
        stan.obr = obr0 + (o.kat || 0) * (u * u * u * (u * (u * 6 - 15) + 10)); stan.vObr = czas && u < 1 ? (o.kat || 0) * 30 * u * u * (1 - u) * (1 - u) / czas : 0;
      }
      fizyka(dt, obrA, stan.obr, omA, stan.vObr);
      for (let i = 0; i < NW; i++) { const kt = katWah(i); if (kt > maks[i]) maks[i] = kt; if (kt > 1) dog[i] = t; }
      for (let b = 1; b <= NB; b += 7) galSzczyt = Math.max(galSzczyt, Math.abs(bX[b]) / bR[b]);
    }
    let naGranicy = 0; for (let i = 0; i < NW; i++) naGranicy += uderzyl[i];
    const wyn = { n: NW, predkoscPoPuszczeniu: +Math.abs(vPusc).toFixed(3), galezieMaksUgiecie: +galSzczyt.toFixed(4), maks: Array.from(maks, (v) => +v.toFixed(2)), dogasanie: Array.from(dog, (v) => +Math.max(0, v - czas).toFixed(2)), naGranicy, skokPredkosci: +(skokMax / RAD).toFixed(2), obrot: +(stan.obr - obr0).toFixed(4), wybieg: +wybieg.toFixed(4), cofniecie: +cof.toFixed(5) };
    Object.assign(stan, zap); zerujFizyke(stan.obr);
    return wyn;
  }
  function przenikanie() {
    let spocz = 0, skraj = 0, minS = 9, minK = 9;
    for (const w of wahadla) {
      const s = odstepPozy(w, 0, 0); minS = Math.min(minS, s); if (s < PROG_SPOCZ) spocz++;
      let zle = false;
      for (const [a, b] of POZY.slice(9)) { const m = odstepPozy(w, a, b); minK = Math.min(minK, m); if (m < PROG_RUCH) zle = true; } // 8 skrajnych wychyleń
      if (zle) skraj++;
    }
    return { n: NW, wSpoczynku: spocz, wSkrajnym: skraj, minSpoczynek: +minS.toFixed(3), minSkrajne: +minK.toFixed(3), wymuszone, wycieteGalazki: liczbaWycietych, koncowGalezi: kolejka.length, sprawdzonych: nrK, odrzuconych: odrzucone };
  }

  // ---------- czubek: hologram robocika (v7.1; wariant B „Monitor” z makiety 18.11, makieta-robocik.html) ----------
  // Przestrzeń 240 j.: głowa 150×150 na środku (x/y 45–195), uszy do y ≈ 12, kulka anteny do y ≈ 7, śruby po bokach (x 37 i 203).
  // Obrys głowy rysuje świetlna rama SDF (jak kafel), ciemne wnętrze głowy daje tylna płyta; tekstura niesie resztę.
  // Tekstura to maska kanałami, barwi ją shader (paleta zamknięta): R = kość, G = krew, B = hot, szary R=G=B = ekran, czarny kryjący = ink (oba barwione na ink).
  const BOK = 1.7, N_PL = 6, GLEB = 0.72, LW = 0.045; // bok głowy, liczba plasterków, głębia bryły, grubość świetlnej ramy
  const Y_EMIT = WYS + 0.5, PRZERWA = 0.32;            // emiter na szczycie przewodnika, wiązka do dolnej krawędzi ramy
  const Y_CZUBKA = Y_EMIT + PRZERWA + BOK / 2;
  const J_ROB = BOK / 150;                              // 1 j. robocika w świecie
  const SZCZYT = Y_CZUBKA + (120 - 7) * J_ROB + 0.1;    // najwyższy punkt sceny (kadr): kulka anteny
  const robJ = (x, y) => [(x - 120) * J_ROB, (120 - y) * J_ROB]; // 240 j. → układ hologramu
  // miny uwu: oczy z pikseli (siatka 8 j., piksel 7 j.), kolejność w cyklu z decyzji 18.11
  const MINY = [["uwu", "^", "^"], ["owo", "o", "o"], ["mrug", "^", "-"], ["ściska", ">", "<"], ["śpi", "-", "-"]];
  const CYKL_MIN = [0, 2, 0, 1, 0, 3, 0, 4], CZAS_MINY = 1.6, CZAS_KLIK = 1.2;
  const WZOR_OKA = {
    "^": [[0, 2], [1, 1], [2, 0], [3, 1], [4, 2]], "o": [[1, 0], [2, 0], [3, 0], [0, 1], [4, 1], [0, 2], [4, 2], [1, 3], [2, 3], [3, 3]],
    "-": [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2]], ">": [[0, 0], [1, 1], [2, 2], [1, 3], [0, 4]], "<": [[4, 0], [3, 1], [2, 2], [3, 3], [4, 4]],
  };
  function rysujMine([nazwa, l, p]) { // jedna mina = jedna tekstura 1024², rysowana raz przy starcie
    const cv = document.createElement("canvas"); cv.width = cv.height = 1024;
    const x = cv.getContext("2d"), s = 1024 / 240; x.setTransform(s, 0, 0, s, 0, 0);
    const KO = "rgb(255,0,0)", KR = "rgb(0,255,0)", HO = "rgb(0,0,255)", CI = "rgb(0,0,0)", EK = "rgb(255,255,255)";
    x.lineJoin = "round"; x.lineCap = "round";
    for (const k of [1, -1]) { // kocie uszy: ciemne wnętrze, krawędź krew; część schowana w głowie wycięta niżej
      const X = (v) => 120 + k * (v - 120);
      x.beginPath(); x.moveTo(X(50), 90); x.lineTo(X(63), 15); x.lineTo(X(112), 55); x.closePath();
      x.fillStyle = CI; x.fill(); x.lineWidth = 6; x.strokeStyle = KR; x.stroke();
    }
    x.globalCompositeOperation = "destination-out"; x.beginPath(); x.roundRect(45, 45, 150, 150, 37.5); x.fill(); x.globalCompositeOperation = "source-over";
    x.beginPath(); x.moveTo(120, 45); x.lineTo(120, 22); x.lineWidth = 6; x.strokeStyle = KR; x.stroke(); // antenka
    x.beginPath(); x.arc(120, 15, 8, 0, 7); x.fillStyle = HO; x.fill();                                  // kulka anteny
    for (const sx of [37, 203]) { x.beginPath(); x.arc(sx, 120, 7, 0, 7); x.fillStyle = CI; x.fill(); x.lineWidth = 4; x.strokeStyle = KR; x.stroke(); } // śruby
    x.beginPath(); x.roundRect(61, 61, 118, 118, 16); x.fillStyle = EK; x.fill(); x.lineWidth = 2.5; x.strokeStyle = "rgba(0,255,0,0.6)"; x.stroke(); // ekran
    const px = (X, Y, k, r = 7) => { x.beginPath(); x.roundRect(X, Y, r, r, r / 7); x.fillStyle = k; x.fill(); };
    for (const [c, w] of WZOR_OKA[l]) px(74 + c * 8, 100 + w * 8, KO);
    for (const [c, w] of WZOR_OKA[p]) px(127 + c * 8, 100 + w * 8, KO);
    for (const [c, w] of [[0, 0], [1, 1], [2, 0], [3, 1], [4, 0]]) px(100 + c * 8, 142 + w * 8, HO); // usta ω
    if (nazwa !== "śpi") for (const X of [64, 72, 160, 168]) px(X, 142, KR);                        // rumieńce na linii ust (wyżej wchodziły na oko >ω<)
    else { // „z z” z pikseli w rogu ekranu
      for (const [c, w] of [[0, 0], [1, 0], [2, 0], [3, 0], [2, 1], [1, 2], [0, 3], [1, 3], [2, 3], [3, 3]]) px(146 + c * 5, 80 + w * 5, KO, 4);
      for (const [c, w] of [[0, 0], [1, 0], [2, 0], [1, 1], [0, 2], [1, 2], [2, 2]]) px(164 + c * 4, 68 + w * 4, KO, 3);
    }
    const t = new T.CanvasTexture(cv); t.anisotropy = 8; return t;
  }
  const twarze = MINY.map(rysujMine);
  twarze.forEach((t) => renderer.initTexture(t)); // wgrane od razu: zmiana miny to tylko podmiana uniformu
  const gPos = [], gG = [], gSK = [];
  for (let s = 0; s < N_PL; s++) { // plasterki od tylnego (0) do przedniego; w buforze w tej kolejności, więc mieszają się od tyłu
    const zs = GLEB * (s / (N_PL - 1) - 0.5);
    for (const [u, v] of [[0, 240], [240, 240], [240, 0], [0, 240], [240, 0], [0, 0]]) { const W = robJ(u, v); gPos.push(W[0], W[1], zs); gG.push(u, v); gSK.push(s, 0); } // przodem do +z
  }
  const geoZn = new T.BufferGeometry();
  geoZn.setAttribute("position", new T.Float32BufferAttribute(gPos, 3)); geoZn.setAttribute("aG", new T.Float32BufferAttribute(gG, 2)); geoZn.setAttribute("aSK", new T.Float32BufferAttribute(gSK, 2));
  const geoKafla = (lista) => { // prostokąty 1×1 (skalowane w shaderze do bieżącej ramy): [z, plasterek, rola], rola 1 = ciemne tło kafla
    const p = [], sk = [];
    for (const [z, s, rola] of lista) for (const [x, y] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) { p.push(x, y, z); sk.push(s, rola); }
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(p, 3)); g.setAttribute("aSK", new T.Float32BufferAttribute(sk, 2)); return g;
  };
  // 11.1 (19.11): bez logotypu „cybersora” i bez przejścia: rama ma stały bok głowy robocika
  const HU = { uT: U.uT, uMig: { value: 1 }, uPrzod: { value: 0 }, uW: { value: BOK }, uH: { value: BOK }, uTwarz: { value: twarze[0] } };
  const PRZOD = (N_PL - 1.5).toFixed(1);
  const GLSL_HOLO = `
    uniform float uMig, uPrzod, uW, uH, uT;
    float alfaPl(float k){ return k > ${PRZOD} ? 1.0 : (1.0 - uPrzod) * mix(0.12, 0.34, k / ${(N_PL - 1).toFixed(1)}); } // przedni plasterek pełny, głębsze coraz ciemniejsze (osobne warstwy, nie smuga)`;
  const holoZnakMat = new T.ShaderMaterial({
    uniforms: HU, transparent: true, depthWrite: false,
    vertexShader: `
      attribute vec2 aG; attribute vec2 aSK; varying vec2 vG; varying vec2 vSK;
      ${GLSL_HOLO}
      void main(){ vG = aG; vSK = aSK; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      precision highp float;
      ${GLSL_PALETA}
      ${GLSL_HOLO}
      uniform sampler2D uTwarz;
      varying vec2 vG; varying vec2 vSK;
      void main(){
        vec4 tx = texture2D(uTwarz, vec2(vG.x / 240.0, 1.0 - vG.y / 240.0));
        float n = min(tx.r, min(tx.g, tx.b)); vec3 k = tx.rgb - n; float sw = k.r + k.g + k.b; // maska: kanały barw, szary = ekran, reszta = ink
        vec3 c; float a;
        if (vSK.x > ${PRZOD}) { c = k.r * KOSC + k.g * KREW + k.b * HOT + max(0.0, 1.0 - sw) * INK; a = tx.a; } // przód: pełny obraz z ciemnym wypełnieniem; ekran w ink (hot na ink 5,08:1, na noc tylko 4,7)
        else { if (sw < 0.02) discard; c = (k.r * KOSC + k.g * KREW + k.b * HOT) / sw; a = tx.a * min(1.0, sw); }           // głębia: same świecące linie i piksele
        a *= alfaPl(vSK.x);
        if (vSK.x < ${PRZOD}) a *= mix(0.4, 1.0, step(0.45, fract(vG.y * 0.22 + uT * 0.9))); // prążki skanowania płyną w górę, tylko w głębi
        a *= uMig; if (a < 0.004) discard;
        gl_FragColor = vec4(c, a);
      }`,
  });
  const holoRamaMat = new T.ShaderMaterial({
    uniforms: HU, transparent: true, depthWrite: false,
    vertexShader: `
      attribute vec2 aSK; varying vec2 vP; varying vec2 vSK;
      ${GLSL_HOLO}
      void main(){ vec3 p = position; p.xy *= vec2(uW, uH) + 0.14; vP = p.xy; vSK = aSK; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `
      precision highp float;
      ${GLSL_PALETA}
      ${GLSL_HOLO}
      varying vec2 vP; varying vec2 vSK;
      void main(){
        vec2 b = vec2(uW, uH) * 0.5; float r = min(uW, uH) * 0.25;   // zaokrąglenie kafla jak w faviconie: rx 8/32
        vec2 q = abs(vP) - b + r; float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r, fw = fwidth(d);
        if (vSK.y > 0.5) { float a = (1.0 - smoothstep(-fw, fw, d)) * 0.97; if (a < 0.004) discard; gl_FragColor = vec4(INK, a); return; } // ciemne tło kafla: znak czytelny na każdej zorzy
        float a = (1.0 - smoothstep(${(LW / 2).toFixed(4)} - fw, ${(LW / 2).toFixed(4)} + fw, abs(d + ${(LW / 2).toFixed(4)}))) * alfaPl(vSK.x) * (vSK.x < 0.5 || vSK.x > ${PRZOD} ? 1.0 : 0.0); // świetlna rama: ostra linia na przednim i tylnym plasterku, bez poświaty
        vec3 c = KREW;
        a *= uMig; if (a < 0.004) discard;
        gl_FragColor = vec4(c, a);
      }`,
  });
  const holo = new T.Group();
  const mPlyta = new T.Mesh(geoKafla([[-GLEB / 2 - 0.02, 0, 1]]), holoRamaMat);
  const mZnak = new T.Mesh(geoZn, holoZnakMat);
  const mRama = new T.Mesh(geoKafla(Array.from({ length: N_PL }, (_, s) => [GLEB * (s / (N_PL - 1) - 0.5), s, 0])), holoRamaMat);
  [mPlyta, mZnak, mRama].forEach((m, i) => { m.frustumCulled = false; m.renderOrder = 20 + i; holo.add(m); }); // tył kafla, znak i ramy: zawsze po drzewie, od tyłu
  scena.add(holo);
  // emiter: pierścień na szczycie przewodnika, jedzie z jego ugięciem (to samo poleD co igły)
  const emiter = new T.Group();
  const pierscien = new T.Mesh(new T.TorusGeometry(0.12, 0.022, 10, 40), matKap); pierscien.rotation.x = Math.PI / 2; emiter.add(pierscien);
  const soczewka = new T.Mesh(new T.CircleGeometry(0.1, 32), new T.MeshBasicMaterial({ color: KOLOR.krew })); soczewka.rotation.x = -Math.PI / 2; soczewka.position.y = 0.004; emiter.add(soczewka);
  const trzon = new T.Mesh(new T.CylinderGeometry(0.045, 0.08, 0.32, 12), new T.MeshStandardMaterial({ color: KOLOR.noc, metalness: 0.85, roughness: 0.32 })); trzon.position.y = -0.16; emiter.add(trzon); // v7: ciemny metal, nie srebrna śruba
  emiter.position.y = Y_EMIT; choinka.add(emiter);
  // wiązka: cienkie linie od pierścienia do dolnej krawędzi ramy (przedniej i tylnej), drobiny płyną nimi w górę
  const N_W = 8, wPos = new Float32Array(N_W * 6), geoW = new T.BufferGeometry(); geoW.setAttribute("position", new T.BufferAttribute(wPos, 3));
  const wiazka = new T.LineSegments(geoW, new T.LineBasicMaterial({ color: KOLOR.krew, transparent: true, opacity: 0.55, depthWrite: false }));
  const RH = mulberry(2026111803), N_D = 36, dPos = new Float32Array(N_D * 3), dLos = Array.from({ length: N_D }, () => [Math.floor(RH() * N_W), RH(), 0.22 + RH() * 0.3, (RH() - 0.5) * 0.05]);
  const geoD = new T.BufferGeometry(); geoD.setAttribute("position", new T.BufferAttribute(dPos, 3));
  const drobiny = new T.Points(geoD, new T.PointsMaterial({ color: KOLOR.kosc, size: 0.035, sizeAttenuation: true, transparent: true, opacity: 0.8, depthWrite: false }));
  [wiazka, drobiny].forEach((o) => { o.frustumCulled = false; o.renderOrder = 19; scena.add(o); });
  // stan hologramu: sprężyny obrotu, migotanie, mina (krok cyklu, wymuszona z testów, klik)
  const hol = { zamr: false, migOn: true, mig0: -9, tMig: 12, yaw: 0, vYaw: 0, pit: 0.05, vPit: 0, wid: true, offY: 0, offP: 0,
    mina: 0, krok: 0, tMina: 0, wymus: null, tKlik: 0 };
  function ustawMine(i) { if (i !== hol.mina) { hol.mina = i; HU.uTwarz.value = twarze[i]; } }
  const HOL_OM = 7, HOL_DZ = 0.62, HOL_MAX = 70 * Math.PI / 180;
  const zawin = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const hC = new T.Vector3(), hT = new T.Vector3(), hN = new T.Vector3();
  function srodekHolo(out) { // środek ramy w świecie: nad emiterem, z dźwignią ugięcia przewodnika
    const dx = U.uLid.value.x * 1.6, dz = U.uLid.value.y * 1.6, c = Math.cos(stan.obr), s = Math.sin(stan.obr);
    return out.set(dx * c + dz * s, Y_CZUBKA, -dx * s + dz * c);
  }
  function hologram(dt, t) {
    // mina: co 1,6 s następna z cyklu; po kliku >ω< na 1,2 s; „ogranicz ruch” = stała uwu; w pauzie i po zamrożeniu stoi
    if (hol.tKlik < 0) hol.tKlik = t + CZAS_KLIK;
    if (hol.wymus !== null) ustawMine(hol.wymus);
    else if (!stan.pauza && !hol.zamr) {
      if (t > hol.tMina) { hol.krok = (hol.krok + 1) % CYKL_MIN.length; hol.tMina = t + CZAS_MINY; }
      ustawMine(t < hol.tKlik ? 3 : mniejRuchu ? 0 : CYKL_MIN[hol.krok]);
    }
    // migotanie: rzadkie (co 7–15 s) i krótkie (0,16 s)
    if (hol.migOn && !mniejRuchu && !stan.pauza && t > hol.tMig) { hol.mig0 = t; hol.tMig = t + 7 + Math.random() * 8; }
    const wm = t - hol.mig0; HU.uMig.value = hol.migOn && wm >= 0 && wm < 0.16 ? (Math.sin(wm * 190) > 0 ? 1 : 0.45) : 1;
    // emiter na wierzchołku: ugięcie i przechył przewodnika
    const dx = U.uLid.value.x, dz = U.uLid.value.y;
    emiter.position.set(dx, Y_EMIT, dz); emiter.rotation.set(dz / 2.6, 0, -dx / 2.6);
    srodekHolo(hC);
    // obrót: znak goni widza na sprężynie (ok. 0,25 s, lekkie przestrzelenie) w układzie drzewa, więc kręcone drzewo go pociąga;
    // w spoczynku odchyłka do ok. 11° (kursor albo powolny dryf), nigdy płasko i nigdy tyłem
    if (!hol.zamr) {
      const kp = kamera.position, ox = kp.x - hC.x, oy = kp.y - hC.y, oz = kp.z - hC.z;
      if (mysz.x > -2 && !stan.drag) {
        hT.copy(hC).project(kamera);
        hol.offY += (clamp((mysz.x - hT.x) * 1.6, -1, 1) * 9 * RAD - hol.offY) * (1 - Math.exp(-8 * dt));
        hol.offP += (clamp((mysz.y - hT.y) * 1.6, -1, 1) * 6 * RAD - hol.offP) * (1 - Math.exp(-8 * dt));
      } else { hol.offY += (5 * RAD * Math.sin(0.37 * t) - hol.offY) * (1 - Math.exp(-2 * dt)); hol.offP += (2.5 * RAD * Math.sin(0.29 * t + 1) - hol.offP) * (1 - Math.exp(-2 * dt)); }
      const fiC = zawin(Math.atan2(ox, oz) + hol.offY - stan.obr), th = Math.atan2(oy, Math.hypot(ox, oz)) + hol.offP;
      if (stan.pauza || mniejRuchu) { hol.yaw = fiC; hol.vYaw = 0; hol.pit = th; hol.vPit = 0; }
      else {
        const n = Math.min(12, Math.max(1, Math.ceil(dt * 240))), h = dt / n, k2 = HOL_OM * HOL_OM, c = 2 * HOL_DZ * HOL_OM;
        for (let i = 0; i < n; i++) {
          hol.vYaw += (k2 * zawin(fiC - hol.yaw) - c * hol.vYaw) * h; hol.yaw += hol.vYaw * h;
          hol.vPit += (k2 * (th - hol.pit) - c * hol.vPit) * h; hol.pit += hol.vPit * h;
        }
        const bl = zawin(hol.yaw - fiC); if (Math.abs(bl) > HOL_MAX) { hol.yaw = fiC + Math.sign(bl) * HOL_MAX; hol.vYaw = 0; }
      }
    }
    holo.position.copy(hC); if (HU.uMig.value < 1) holo.position.x += 0.025;
    holo.rotation.set(-hol.pit, stan.obr + hol.yaw, 0, "YXZ"); holo.updateMatrixWorld();
    // wiązka i drobiny
    const c = Math.cos(stan.obr), s = Math.sin(stan.obr), Wb = HU.uW.value / 2 - Math.min(HU.uW.value, HU.uH.value) * 0.25, Hh = HU.uH.value / 2;
    for (let i = 0; i < N_W; i++) {
      const f = i / (N_W - 1), a = Math.PI * (1 - f), sx = dx + Math.cos(a) * 0.11, sz = dz + (i % 2 ? 0.05 : -0.05);
      wPos[i * 6] = sx * c + sz * s; wPos[i * 6 + 1] = Y_EMIT + 0.01; wPos[i * 6 + 2] = -sx * s + sz * c;
      hT.set(lerp(-Wb, Wb, f), -Hh, i % 2 ? GLEB / 2 : -GLEB / 2); holo.localToWorld(hT);
      wPos[i * 6 + 3] = hT.x; wPos[i * 6 + 4] = hT.y; wPos[i * 6 + 5] = hT.z;
    }
    geoW.attributes.position.needsUpdate = true;
    for (let i = 0; i < N_D; i++) {
      const [j, ph, sp, dr] = dLos[i], u = mniejRuchu ? ph : (t * sp + ph) % 1, o = j * 6;
      dPos[i * 3] = lerp(wPos[o], wPos[o + 3], u) + dr; dPos[i * 3 + 1] = lerp(wPos[o + 1], wPos[o + 4], u); dPos[i * 3 + 2] = lerp(wPos[o + 2], wPos[o + 5], u) - dr;
    }
    geoD.attributes.position.needsUpdate = true;
    // emiter świeci na górne gałązki (kolor hot), mrugnięcie przygasza też to światło
    const ex = dx * c + dz * s, ez = -dx * s + dz * c;
    U.uHo.value.set(ex, Y_EMIT + 0.1, ez, hol.wid ? 0.42 * (HU.uMig.value < 1 ? 0.4 : 1) * (1 + U.uPoziom.value * 0.6) : 0);
  }
  function holoKlik() { // klik w hologram: robocik ściska oczy >ω< i trąca wierzchołek
    hol.tKlik = -1;
    if (!mniejRuchu) { const a = Math.random() * 6.283; LID.fx = Math.cos(a) * 4; LID.fz = Math.sin(a) * 4; }
  }

  // ---------- śnieg ----------
  const LSN = POZIOMY[0].snieg;
  // v7: płatek to matowa sześcioramienna gwiazdka (żarówka jest okrągła i błyszczy), szary z daleka; przy drzewie łapie jego światło.
  // Rozmiar zależy od głębi (perspektywa), obrót i wielkość różne na płatek. Bez kolorowych płatków: hot zostaje dla żarówek.
  const snP = new Float32Array(LSN * 3), snS = new Float32Array(LSN * 2), snF = new Float32Array(LSN * 2);
  for (let i = 0; i < LSN; i++) {
    const a = R() * Math.PI * 2, rs = Math.sqrt(R()) * 11;
    snP[i * 3] = Math.cos(a) * rs; snP[i * 3 + 1] = R() * 16; snP[i * 3 + 2] = Math.sin(a) * rs;
    snS[i * 2] = R() * 6.28; snS[i * 2 + 1] = 0.75 + R() * 0.6;
    snF[i * 2] = R() * 6.28; snF[i * 2 + 1] = 0.5 + R() * 0.9;
  }
  const geoSn = new T.BufferGeometry();
  geoSn.setAttribute("position", new T.BufferAttribute(snP, 3)); geoSn.setAttribute("aS", new T.BufferAttribute(snS, 2));
  const sniegMat = new T.ShaderMaterial({
    uniforms: { uSw: U.uSw, uSkala: uSkalaWsp, uR: { value: 0.026 } },
    vertexShader: `
      attribute vec2 aS; uniform float uSw, uSkala, uR; varying vec2 vS; varying float vL;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(2.0 * uR * aS.y * uSkala / -mv.z, 1.0);
        // światło choinki: odległość płatka od powierzchni korony (ten sam profil co drzewo)
        float h = clamp((position.y - ${Y0.toFixed(3)}) / ${(WYS - Y0).toFixed(3)}, 0.0, 1.0);
        float prof = mix(${R0.toFixed(3)}, 0.3, pow(h, 0.85));
        float d = max(length(position.xz) - prof, 0.0) + max(position.y - ${WYS.toFixed(3)}, 0.0) + max(${Y0.toFixed(3)} - 0.6 - position.y, 0.0) * 0.5;
        vL = uSw * exp(-d * 0.75);
        vS = vec2(aS.x, min(1.0, gl_PointSize / 6.0));
      }`,
    fragmentShader: `
      precision highp float;
      ${GLSL_PALETA}
      varying vec2 vS; varying float vL;
      void main(){
        vec2 p = gl_PointCoord * 2.0 - 1.0; float r = length(p);
        float a = atan(p.y, p.x) + vS.x;
        float ram = pow(abs(cos(3.0 * a)), 8.0);                  // sześć ramion
        float ksz = mix(1.0, 0.32 + 0.68 * ram, vS.y);            // malutki płatek (kilka px) zostaje kropką, większy pokazuje ramiona
        if (r > ksz) discard;
        vec3 c = mix(INK, KOSC, 0.34);                            // matowa szarość z daleka
        c = mix(c, mix(KOSC, HOT, 0.22) * 0.82, vL);              // przy drzewie łapie ciepłe światło, ale nigdy pełnej kości żarówki
        gl_FragColor = vec4(c * (0.86 + 0.14 * (1.0 - r)), 1.0);
      }`,
  });
  const snieg = new T.Points(geoSn, sniegMat); snieg.frustumCulled = false;
  scena.add(snieg);

  // ---------- mapa otoczenia bombek (v7): z rozkładu żarówek i pasa zorzy, budowana raz; druga wersja bez żarówek na zgaszone światełka ----------
  const envMaty = new Set();
  const NIEBO_GLSL = `
    varying vec3 vD; uniform float uZorza, uSw;
    void main(){
      vec3 d = normalize(vD); float el = d.y, az = atan(d.z, d.x);
      vec3 c = INK * 0.7;
      float pas = smoothstep(0.1, 0.28, el) * exp(-max(el - 0.28, 0.0) * 3.2);                // zorza: pas nad horyzontem
      float pr = 0.3 + 0.9 * pow(0.5 + 0.5 * sin(az * 23.0 + 2.0 * sin(az * 7.0)), 6.0);      // pionowe promienie
      float I = pas * pr * uZorza;
      c += mix(KREW, HOT, smoothstep(0.25, 0.85, I)) * I * 0.85;
      c = mix(c, mix(KOSC, HOT, 0.3) * 0.3, smoothstep(0.0, -0.35, el) * uSw * 0.6);            // pod spodem łuna podłogi od drzewa
      gl_FragColor = vec4(c, 1.0);
    }`;
  const zbudujEnv = (zZar, zZorza) => {
    const s = new T.Scene(), smiec = [];
    const nm = new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, uniforms: { uZorza: { value: zZorza ? 1 : 0 }, uSw: { value: zZar ? 1 : 0 } },
      vertexShader: "varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }", fragmentShader: "precision highp float;\n" + GLSL_PALETA + NIEBO_GLSL });
    const ng = new T.SphereGeometry(60, 48, 24); s.add(new T.Mesh(ng, nm)); smiec.push(nm, ng);
    if (zZar) { // żarówki widziane ze środka korony: każda trzecia, w swoim prawdziwym kierunku, kość albo hot jak na drzewie
      const n = Math.floor(NZ / 3), kg = new T.SphereGeometry(1, 8, 6), km = new T.MeshBasicMaterial({ color: 0xffffff });
      const im = new T.InstancedMesh(kg, km, n), m4 = new T.Matrix4(), q = new T.Quaternion(), sk = new T.Vector3(), p = new T.Vector3(), kol = new T.Color();
      for (let k = 0; k < n; k++) {
        const i = k * 3; p.set(zPos[i * 3], zPos[i * 3 + 1] - 5.2, zPos[i * 3 + 2]); const L = p.length(); p.multiplyScalar(6 / L); // na sferze r = 6: jednakowy rozmiar kątowy
        m4.compose(p, q, sk.setScalar(0.05)); im.setMatrixAt(k, m4);
        im.setColorAt(k, kol.setHex(zB[i * 4] ? KOLOR.hot : KOLOR.kosc).multiplyScalar(2.6)); // jaśniejsze niż biel: po rozmyciu na szorstkiej bombce zostaje widoczny punkt
      }
      s.add(im); smiec.push(kg, km);
    }
    const tex = pmrem.fromScene(s, 0, 0.1, 100).texture;
    smiec.forEach((o) => o.dispose());
    return tex;
  };
  const ENV = { pelna: null, zgaszona: null, bezZorzy: null, wymus: null, biez: null };
  function ustawEnv(t) { if (ENV.biez === t) return; ENV.biez = t; envMaty.forEach((m) => { m.envMap = t; }); }

  // ================= MUZYKA I DŹWIĘK (v8) =================
  // Przycisk „muzyka”: pierwsze kliknięcie tworzy AudioContext (przed nim cisza), kolejne wycisza (głośność do 0, potem suspend) i wznawia.
  // Źródło: plik z MUZYKA_PLIK (data: mp3, pętla z bufora, więc bez przerwy na szwie), a dopóki go nie ma, pad z Web Audio.
  // Analizator dzieli widmo na pasma: niskie (30–250 Hz) → zorza (uBoost), średnie i wysokie (250 Hz–8 kHz) → żarówki i hologram (uPoziom).
  // Dzwonki: przy padzie w jego tonacji (a-moll); przy pliku wyciszone, chyba że MUZYKA_TONACJA poda nuty utworu (wtedy grają ciszej).
  const MUZYKA_PLIK = ""; // tu wchodzi mp3 jako data:audio/mpeg;base64,... (plan: ok. 1 MB; licencja komercyjna ElevenLabs przed wdrożeniem)
  const MUZYKA_TONACJA = null; // np. [392, 440, 493.88, 587.33, 659.25] dla utworu w G; null = dzwonki milkną przy pliku
  const NOTY = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66]; // A moll pentatonika
  const PAD = [110, 164.81, 220, 261.63, 329.63];                              // a-moll: A E A C E
  const PASMO_N = [30, 250], PASMO_W = [250, 8000], WZM_N = 1.3, WZM_W = 1, DB_ZAKRES = [-50, -10]; // granice pasm [Hz], wzmocnienia i zakres dB (strojone na padzie i plikach testowych)
  let A = null, wet = null, dry = null, master = null, padBus = null, plikBus = null, plikZr = null, plikStart = 0, plikDl = 0, zrodlo = "pad";
  let analiza = null, daneA = null, daneT = null, poziomN = 0, poziomW = 0, tickA = null, wyciszT = null, chimeNuty = NOTY, chimeSila = 1;
  const dzw = { zagrane: 0, wyciszone: 0 };
  let padOsc = []; // v10: oscylatory padu (z LFO); po przejściu na plik gasną, zamiast grać dalej pod zerową głośnością
  function chime(f, v = 0.22) {
    if (!A || !stan.dzwiek) return;
    if (!chimeNuty) { dzw.wyciszone++; return; }
    if (chimeNuty !== NOTY) { const i = NOTY.findIndex((n) => Math.abs(n - f) < 1 || Math.abs(2 * n - f) < 1); f = chimeNuty[Math.max(i, 0) % chimeNuty.length] * (f > 1200 ? 2 : 1); } // ta sama pozycja w skali utworu
    dzw.zagrane++; v *= chimeSila;
    const t0 = A.currentTime;
    [[1, 1], [2.0, 0.35], [3.01, 0.12]].forEach(([m, w]) => {
      const o = A.createOscillator(), g = A.createGain(); o.type = "sine"; o.frequency.value = f * m;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v * w, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.8 / m);
      o.connect(g); g.connect(dry); g.connect(wet); o.start(t0); o.stop(t0 + 3);
    });
  }
  function glosnosc(cel, s) { const g = master.gain, t = A.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(cel, t + s); }
  function iskra() { // pojedyncze nuty nad padem; przy pliku nie grają
    clearTimeout(tickA); if (!stan.dzwiek || zrodlo !== "pad") return;
    chime(NOTY[Math.floor(Math.random() * NOTY.length)] * (Math.random() < 0.3 ? 2 : 1), 0.09); tickA = setTimeout(iskra, 900 + Math.random() * 2600);
  }
  function budujPad() {
    const lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 650; lp.Q.value = 0.6; lp.connect(dry); lp.connect(wet); padBus.connect(lp);
    const lfo = A.createOscillator(), lg = A.createGain(); lfo.frequency.value = 0.06; lg.gain.value = 260; lfo.connect(lg); lg.connect(lp.frequency); lfo.start(); padOsc.push(lfo);
    PAD.forEach((f, i) => [-7, 7].forEach((de) => {
      const o = A.createOscillator(), g = A.createGain(); o.type = i < 2 ? "sawtooth" : "triangle"; o.frequency.value = f; o.detune.value = de;
      g.gain.value = i < 2 ? 0.035 : 0.05; o.connect(g); g.connect(padBus); o.start(); padOsc.push(o);
    }));
    zrodlo = "pad"; chimeNuty = NOTY; chimeSila = 1; iskra();
  }
  async function wczytajPlik(url, tonacja) { // data: → bufor → pętla (loop na buforze nie robi przerwy na szwie, w odróżnieniu od <audio loop>)
    const b = atob(url.slice(url.indexOf(",") + 1)), u8 = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u8[i] = b.charCodeAt(i);
    const buf = await A.decodeAudioData(u8.buffer);
    if (plikZr) { try { plikZr.stop(); } catch (e) { /* już zatrzymany */ } plikZr.disconnect(); }
    const s = A.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(plikBus); s.start();
    plikZr = s; plikStart = A.currentTime; plikDl = buf.duration; zrodlo = "plik";
    padBus.gain.setTargetAtTime(0, A.currentTime, 0.12); clearTimeout(tickA);
    const koniecPadu = A.currentTime + 1; padOsc.forEach((o) => o.stop(koniecPadu)); padOsc = []; // pad wygasa (≈ 8 stałych czasu), potem oscylatory stają
    chimeNuty = tonacja && tonacja.length ? tonacja : null; chimeSila = 0.5;
    return { sekund: +buf.duration.toFixed(3), kanalow: buf.numberOfChannels };
  }
  function startDzwiek() {
    if (A) { clearTimeout(wyciszT); A.resume(); glosnosc(0.75, 1.2); iskra(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    A = new AC();
    master = A.createGain(); master.gain.value = 0; master.connect(A.destination);
    analiza = A.createAnalyser(); analiza.fftSize = 1024; analiza.smoothingTimeConstant = 0.6; master.connect(analiza);
    daneA = new Float32Array(analiza.frequencyBinCount); daneT = new Float32Array(analiza.fftSize);
    padBus = A.createGain(); plikBus = A.createGain(); plikBus.connect(master);
    dry = A.createGain(); dry.gain.value = 0.8; dry.connect(master);
    const conv = A.createConvolver(), len = A.sampleRate * 3.2, imp = A.createBuffer(2, len, A.sampleRate);
    for (let c = 0; c < 2; c++) { const d = imp.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    conv.buffer = imp; wet = A.createGain(); wet.gain.value = 0.5; wet.connect(conv); conv.connect(master);
    if (MUZYKA_PLIK) wczytajPlik(MUZYKA_PLIK, MUZYKA_TONACJA).catch(budujPad); else budujPad(); // zły plik = pad zamiast ciszy
    glosnosc(0.75, 2.5);
  }
  function stopDzwiek() { if (!A) return; clearTimeout(tickA); glosnosc(0, 0.35); clearTimeout(wyciszT); wyciszT = setTimeout(() => { if (!stan.dzwiek) A.suspend(); }, 450); }
  function dzwiekZaScena() { // v10: scena poza ekranem albo karta w tle → muzyka cichnie i kontekst śpi; po powrocie wraca, jeśli była włączona
    if (!A || !stan.dzwiek) return;
    clearTimeout(wyciszT);
    if (aktywna()) { A.resume(); glosnosc(0.75, 0.6); iskra(); }
    else { clearTimeout(tickA); glosnosc(0, 0.2); wyciszT = setTimeout(() => { if (!aktywna()) A.suspend(); }, 250); }
  }
  function pasmo(z) { // moc w paśmie [Hz] jako suma po prążkach, w dB, przeskalowana: DB_ZAKRES[0] → 0, DB_ZAKRES[1] → 1
    // (średnia bajtów w dB podnosiła pasmo od samego szumu: przy „tylko wysokich” zorza szła na maksimum, pomiar w etap5 test 3)
    const hz = A.sampleRate / analiza.fftSize, a = Math.max(1, Math.round(z[0] / hz)), b = Math.min(daneA.length - 1, Math.round(z[1] / hz)); let p = 0;
    for (let i = a; i <= b; i++) p += Math.pow(10, daneA[i] / 10);
    return clamp((10 * Math.log10(p + 1e-12) - DB_ZAKRES[0]) / (DB_ZAKRES[1] - DB_ZAKRES[0]), 0, 1);
  }

  // ================= STEROWANIE: kręci się choinka, kamera zmienia wysokość i odległość =================
  const mniejRuchu = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let DOL = -0.75; // kadr sięga poniżej podstawy: prezenty z przodu rzutują się niżej niż pień
  const OM_CHWYT = 36, OM_LOT = 4.5, TARCIE = 1.8, AUTO = 0.045; // sprężyna drzewa pod ręką, obrót do wskazanej ozdoby, hamowanie wybiegu, samoczynne kręcenie [rad/s]
  const stan = { chwyt: 0, kier: 1, omKam: 10, elSur: 0.17, obr: 0.4, vObr: 0, obrCel: null, el: 0.17, elCel: 0.17, vEl: 0, zoom: 1, zoomCel: 1, vZoom: 0, drag: false, ost: -10, swiatla: true, snieg: true, obrot: !mniejRuchu, dzwiek: false, pauza: /pauza/.test(FLAGI) };
  // kamera patrzy na „cel”; „dom” to środek całego kadru, „celCel” to miejsce, do którego cel dąży
  const dom = new T.Vector3(0, (SZCZYT + DOL) / 2, 0), cel = dom.clone(), celCel = dom.clone(), celV = new T.Vector3();
  const karta = document.getElementById("karta");
  let bazaR = 22;
  // sprężyna krytycznie tłumiona, rozwiązanie dokładne: niezależna od liczby klatek i przerywalna (nowy cel przejmuje bieżącą prędkość)
  function gladko(o, kx, kv, c, om, dt) {
    const d = o[kx] - c, e = Math.exp(-om * dt), t = (o[kv] + om * d) * dt;
    o[kx] = c + (d + t) * e; o[kv] = (o[kv] - om * t) * e;
  }
  zerujFizyke(stan.obr);
  // Ruch drzewa. Pod ręką: drzewo ma bezwładność i goni rękę sprężyną krytycznie tłumioną (nierówne zdarzenia myszy nie szarpią ozdób).
  // Po puszczeniu: wybiega z prędkością, którą miało, i hamuje bez cofania. Każdy stan przejmuje bieżącą prędkość, więc wszystko jest przerywalne.
  function ruchDrzewa(dt, t) {
    if (stan.drag) {
      if (mniejRuchu) { stan.obr = stan.chwyt; stan.vObr = 0; }
      else { // ciężkie drzewo: idzie za ręką własnym tempem i nie rozpędza się ponad limit, choćby ręka uciekła
        const o0 = stan.obr; gladko(stan, "obr", "vObr", stan.chwyt, P.omChwyt, dt);
        if (Math.abs(stan.vObr) > P.vDrag) { stan.vObr = Math.sign(stan.vObr) * P.vDrag; stan.obr = o0 + stan.vObr * dt; }
      }
    } else if (stan.obrCel !== null) {
      gladko(stan, "obr", "vObr", stan.obrCel, OM_LOT, dt);
      if (Math.abs(stan.obr - stan.obrCel) < 0.002 && Math.abs(stan.vObr) < 0.01) stan.obrCel = null;
    } else if (stan.obrot && t - stan.ost > 2.5 && stan.zoomCel > 0.85) { // z bliska drzewo samo się nie kręci
      stan.vObr += (AUTO * stan.kier - stan.vObr) * (1 - Math.exp(-1.2 * dt)); stan.obr += stan.vObr * dt;
    } else {
      const e = Math.exp(-P.tarcie * dt); stan.obr += stan.vObr * (1 - e) / P.tarcie; stan.vObr *= e;
    }
  }
  function pusc() { // koniec przeciągania: drzewo zostaje z własną prędkością; kręci się dalej w stronę, w którą je puszczono
    stan.drag = false; stan.vObr = clamp(stan.vObr, -P.vMax, P.vMax);
    if (Math.abs(stan.vObr) > 0.05) stan.kier = Math.sign(stan.vObr);
  }
  const EL_MIN = -0.02, EL_MAX = 0.7;
  const guma = (x) => { // miękki koniec zakresu podnoszenia kamery: im dalej za granicę, tym słabiej idzie za ręką
    const o = x > EL_MAX ? x - EL_MAX : x < EL_MIN ? x - EL_MIN : 0; if (!o) return x;
    return (x > EL_MAX ? EL_MAX : EL_MIN) + (o * 0.55 * 0.3) / (0.3 + 0.55 * Math.abs(o));
  };
  function rozmiar() {
    const w = host.clientWidth, h = host.clientHeight, aspekt = w / h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, POZIOMY[poziom].dpr));
    renderer.setSize(w, h, false); kamera.aspect = aspekt;
    // kadr: drzewo wypełnia wolny prostokąt (na szerokim ekranie na prawo od karty, na wąskim nad kartą)
    const szeroki = aspekt > 1.35, [x0, x1, y0, y1] = wolnyKadr(w, h, karta.getBoundingClientRect());
    const tf = Math.tan((FOV / 2) * Math.PI / 180), TW = R0 * 2 + 0.9; // szerokość kadru: korona i łuk prezentów
    DOL = szeroki ? -2.0 : -1.5; dom.y = (SZCZYT + DOL) / 2; // prezenty leżą przed drzewem, więc rzutują się niżej niż jego podstawa
    if (stan.zoomCel > 0.999) celCel.copy(dom);
    bazaR = Math.max(((SZCZYT - DOL) / 2) / (tf * ((y1 - y0) / h)), (TW / 2) / (tf * aspekt * ((x1 - x0) / w))) * 1.015;
    kamera.setViewOffset(w, h, -((x0 + x1) / 2 - w / 2), -((y0 + y1) / 2 - h / 2), w, h);
    kamera.updateProjectionMatrix();
    const bs = renderer.getDrawingBufferSize(new T.Vector2());
    zorzaZnakiMat.uniforms.uRes.value.copy(bs); zorzaMat.uniforms.uAsp.value = aspekt; zorzaZnakiMat.uniforms.uCell.value = 22 * renderer.getPixelRatio();
    zorzaRT.setSize(Math.max(4, Math.ceil(bs.x / 4)), Math.max(4, Math.ceil(bs.y / 4)));       // zorza w 1/4 rozdzielczości
    const fo = POZIOMY[poziom].odb; if (fo) odbRT.setSize(Math.max(4, Math.round(bs.x * fo)), Math.max(4, Math.round(bs.y * fo)));
    podlogaMat.uniforms.uRes.value.copy(bs);
    zarMat.uniforms.uSkala.value = bs.y / (2 * tf);
  }
  function ustawKamere() {
    const r = bazaR * stan.zoom, c = Math.cos(stan.el);
    kamera.position.set(cel.x, cel.y + r * Math.sin(stan.el), cel.z + r * c);
    kamera.lookAt(cel); kamera.updateMatrixWorld(); choinka.rotation.y = stan.obr;
  }
  function ustawPoziom(i) {
    poziom = clamp(i, 0, 2); const P = POZIOMY[poziom];
    igly.count = Math.floor(NG * P.galazki); geoZ.setDrawRange(0, P.zarowki); geoSn.setDrawRange(0, P.snieg);
    wypiek(P.zarowki); rozmiar();
  }
  addEventListener("resize", rozmiar); ustawPoziom(poziom); cel.copy(celCel);

  const ray = new T.Raycaster(), mysz = new T.Vector2(-9, -9), m2 = new T.Vector2();
  let wybrana = null, nad = null, start = null, ruszono = 0;
  let nadP = -1, wybP = -1, fokusP = -1, kartaP = -2; // prezent pod kursorem, przypięty kliknięciem, z fokusem klawiatury; który jest teraz opisany na karcie
  const etykieta = document.getElementById("etykieta");
  const kZ = document.getElementById("kZnacznik"), kT = document.getElementById("kTytul"), kO = document.getElementById("kOpis");
  const nxy = (cx, cy) => { const b = host.getBoundingClientRect(); return [((cx - b.left) / b.width) * 2 - 1, -((cy - b.top) / b.height) * 2 + 1]; };
  const wsp = (e) => { const [x, y] = nxy(e.clientX, e.clientY); mysz.set(x, y); };
  // trafianie analityczne promień–kula, w układzie drzewa, na tych samych pozycjach co fizyka
  const pO = new T.Vector3(), pD = new T.Vector3(), tA = new T.Vector3(), tB = new T.Vector3();
  function promien(nx, ny) {
    m2.set(nx, ny); ray.setFromCamera(m2, kamera);
    const c = Math.cos(stan.obr), s = Math.sin(stan.obr), o = ray.ray.origin, d = ray.ray.direction;
    pO.set(o.x * c - o.z * s, o.y, o.x * s + o.z * c); pD.set(d.x * c - d.z * s, d.y, d.x * s + d.z * c);
  }
  function trafWahadlo(nx, ny) {
    promien(nx, ny);
    let naj = -1, najT = 1e9;
    for (let i = 0; i < NW; i++) {
      const rk = fRH[i] * (i >= ND0 ? siatki[i - ND0].skala : 1.2); // małym ozdobom dokładam margines trafienia
      const ox = srodki[i * 3] - pO.x, oy = srodki[i * 3 + 1] - pO.y, oz = srodki[i * 3 + 2] - pO.z, tca = ox * pD.x + oy * pD.y + oz * pD.z;
      if (tca < 0) continue;
      const d2 = ox * ox + oy * oy + oz * oz - tca * tca; if (d2 > rk * rk) continue;
      const t = tca - Math.sqrt(rk * rk - d2); if (t < najT) { najT = t; naj = i; }
    }
    return naj;
  }
  function trafCzubek() { // po promien(): kula wokół głowy robocika na czubku (z uszami i anteną)
    const oy = Y_CZUBKA + 0.15 - pO.y, tca = -pO.x * pD.x + oy * pD.y - pO.z * pD.z;
    return tca > 0 && pO.x * pO.x + oy * oy + pO.z * pO.z - tca * tca < 1.35;
  }
  function swiat(i, out) { // środek ozdoby w układzie świata
    const c = Math.cos(stan.obr), s = Math.sin(stan.obr), x = srodki[i * 3], z = srodki[i * 3 + 2];
    return out.set(x * c + z * s, srodki[i * 3 + 1], -x * s + z * c);
  }
  const duza = (i) => (i >= ND0 ? siatki[i - ND0] : null);

  // ----- kamera: podjazd do punktu pod kursorem, podlot, powrót -----
  function punktPod(cx, cy, out) {
    const [nx, ny] = nxy(cx, cy), i = trafWahadlo(nx, ny);
    if (i >= 0) { swiat(i, out); return true; }
    const o = ray.ray.origin, d = ray.ray.direction;
    for (let t = 1; t < 70; t += 0.2) { // pierwszy punkt promienia wewnątrz bryły korony (bryła obrotowa, więc bez przeliczania obrotu)
      const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
      if (y > Y0 - 0.4 && y < SZCZYT && Math.hypot(x, z) < (y > WYS ? 0.9 : profil(y) * 0.92)) { out.set(x, y, z); return true; }
    }
    return false;
  }
  // kamera nie wchodzi w drzewo: co najmniej 1,2 jednostki od bryły korony i nad podłogą
  const kamWolna = (x, y, z) => y > 0.5 && !(y < SZCZYT + 1.2 && Math.hypot(x, z) < (y < Y0 ? R0 : profil(y)) + 1.2);
  function zoomO(f, cx, cy) {
    const z1 = clamp(stan.zoomCel * f, 1.6 / bazaR, 1.25); if (z1 === stan.zoomCel) return;
    if (z1 < stan.zoomCel) { // przybliżanie: skaluję położenie kamery i celu względem punktu pod kursorem, więc ten punkt zostaje pod kursorem
      if (cx === undefined || !punktPod(cx, cy, tA)) tA.copy(celCel);
      tB.copy(celCel).sub(tA).multiplyScalar(z1 / stan.zoomCel).add(tA);
      const r = bazaR * z1;
      if (!kamWolna(tB.x, tB.y + r * Math.sin(stan.elCel), tB.z + r * Math.cos(stan.elCel))) return;
      celCel.copy(tB);
    } else { // oddalanie: cel wraca do środka kadru proporcjonalnie do drogi, przy pełnym widoku stoi w domu
      const k = z1 >= 1 ? 0 : clamp((1 - z1) / Math.max(1e-4, 1 - stan.zoomCel), 0, 1);
      celCel.sub(dom).multiplyScalar(k).add(dom);
    }
    stan.zoomCel = z1; stan.omKam = 12; stan.ost = performance.now() / 1000;
  }
  function obrocDo(i) { // obróć drzewo tak, żeby ozdoba stanęła przodem do kamery; prawdziwy obrót, więc ozdoby się rozkołyszą
    const a = Math.atan2(fA[i * 3], fA[i * 3 + 2]), d = -a - stan.obr;
    stan.obrCel = stan.obr + Math.atan2(Math.sin(d), Math.cos(d)); stan.ost = performance.now() / 1000;
    if (mniejRuchu) { stan.obr = stan.obrCel; stan.obrCel = null; stan.vObr = 0; }
  }
  function lecDo(i) {
    obrocDo(i);
    celCel.set(0, fA[i * 3 + 1] - fO[i], Math.hypot(fA[i * 3], fA[i * 3 + 2]));
    stan.zoomCel = (i >= ND0 ? 3.4 : 2.1) / bazaR; stan.elCel = 0.1; stan.omKam = 6;
  }
  // podlot i powrót to długa droga kamery: wolniejsza sprężyna (ok. 1 s), kółko i gest palcami zostają szybkie
  function lecDoCzubka() { celCel.set(0, Y_CZUBKA, 0); stan.zoomCel = Math.max(6.5, (120 * J_ROB + 0.35) / (Math.tan((FOV / 2) * Math.PI / 180) * kamera.aspect)) / bazaR; // cały robocik (240 j. ze śrubami) mieści się też na wąskim ekranie
  stan.elCel = 0.08; stan.omKam = 6; stan.ost = performance.now() / 1000; }
  function wroc() { celCel.copy(dom); stan.zoomCel = 1; stan.elCel = 0.17; stan.omKam = 6; }
  const bWroc = document.getElementById("bWroc"); bWroc.addEventListener("click", wroc);

  // ----- wskaźnik: przeciąganie obraca, dwa palce przybliżają, kursor trąca ozdoby, klik i dwuklik -----
  const palce = new Map();
  let szczD = 0, ostTap = { t: 0, x: 0, y: 0 }, ostRuch = { x: 0, y: 0, t: 0 }, vKur = 0;
  // chwyt zaczyna się od bieżącego położenia i bieżącej prędkości drzewa: złapane w locie hamuje pod ręką, bez skoku
  const chwyc = () => { stan.drag = true; stan.chwyt = stan.obr; stan.elSur = stan.elCel; stan.obrCel = null; };
  host.addEventListener("pointerdown", (e) => {
    host.setPointerCapture(e.pointerId); palce.set(e.pointerId, { x: e.clientX, y: e.clientY });
    stan.obrCel = null; stan.ost = performance.now() / 1000;
    if (palce.size === 2) { const [a, b] = [...palce.values()]; szczD = Math.hypot(a.x - b.x, a.y - b.y); stan.drag = false; stan.elCel = clamp(stan.elCel, EL_MIN, EL_MAX); ruszono = 99; host.classList.remove("chwyt"); return; }
    if (palce.size > 2) return;
    chwyc(); host.classList.add("chwyt"); start = { x: e.clientX, y: e.clientY, t: performance.now() }; ruszono = 0;
  });
  function musniecie(e) { // kursor na ozdobie pcha ją w kierunku swojego ruchu przez cały czas kontaktu; siła z wygładzonej prędkości kursora
    const t = performance.now(), dtm = (t - ostRuch.t) / 1000, dx = e.clientX - ostRuch.x, dy = e.clientY - ostRuch.y;
    ostRuch = { x: e.clientX, y: e.clientY, t };
    if (mniejRuchu || dtm <= 0 || dtm > 0.1) { vKur = 0; return; }
    vKur += (Math.hypot(dx, dy) / dtm - vKur) * (1 - Math.exp(-dtm / 0.04));
    if (vKur < 60) return;
    const m = kamera.matrixWorld.elements, sx = m[0] * dx - m[4] * dy, sz = m[2] * dx - m[6] * dy, c = Math.cos(stan.obr), s = Math.sin(stan.obr);
    const moc = clamp(vKur / 700, 0.25, 2) * 0.5, n = Math.min(12, Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)));
    for (let k = 1, ost = -1; k <= n; k++) { // cały odcinek od poprzedniego zdarzenia, nie tylko jego koniec: szybki kursor nie przeskakuje ozdób
      const [nx, ny] = nxy(e.clientX - dx * (1 - k / n), e.clientY - dy * (1 - k / n)), i = trafWahadlo(nx, ny);
      if (i >= 0 && i !== ost) { szturchnij(i, sx * c - sz * s, sx * s + sz * c, moc); ost = i; }
    }
  }
  function stuknij(i) { // klik: palec trafia w kulę obok środka, więc popycha ją od siebie i w bok, a dużą bombkę dodatkowo skręca na sznurku
    const ox = srodki[i * 3] - pO.x, oy = srodki[i * 3 + 1] - pO.y, oz = srodki[i * 3 + 2] - pO.z, tca = ox * pD.x + oy * pD.y + oz * pD.z;
    const bx2 = (ox - pD.x * tca) / fRH[i], bz2 = (oz - pD.z * tca) / fRH[i]; // przesunięcie środka kuli względem promienia kliknięcia, w promieniach kuli
    szturchnij(i, pD.x * 0.7 + bx2 * 1.3, pD.z * 0.7 + bz2 * 1.3, 1.5);
    if (!mniejRuchu) twK[i] = clamp((bz2 * pD.x - bx2 * pD.z) * 60, -45, 45);
  }
  host.addEventListener("pointermove", (e) => {
    const p = palce.get(e.pointerId); if (p) { p.x = e.clientX; p.y = e.clientY; }
    if (palce.size >= 2) {
      const [a, b] = [...palce.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (szczD > 0 && d > 0) zoomO(szczD / d, (a.x + b.x) / 2, (a.y + b.y) / 2);
      szczD = d; return;
    }
    wsp(e);
    if (!stan.drag) { if (e.pointerType === "mouse") musniecie(e); return; }
    const teraz = performance.now(), dx = e.clientX - start.x, dy = e.clientY - start.y, dtE = Math.max(0.004, (teraz - start.t) / 1000);
    ruszono += Math.abs(dx) + Math.abs(dy);
    stan.chwyt += dx * 0.006 * clamp(stan.zoomCel, 0.3, 1); // z bliska obrót drobniejszy; ręka ustawia cel, drzewo dochodzi do niego własnym ruchem
    stan.elSur += dy * 0.004; stan.elCel = guma(stan.elSur);
    start = { x: e.clientX, y: e.clientY, t: teraz }; stan.ost = teraz / 1000;
  });
  function koniec(e, anulowane) {
    const bylo = palce.size; palce.delete(e.pointerId);
    if (bylo >= 2) { // koniec gestu dwoma palcami: palec, który został, przejmuje obracanie bez skoku
      if (palce.size === 1) { const p = [...palce.values()][0]; start = { x: p.x, y: p.y, t: performance.now() }; chwyc(); ruszono = 99; }
      return;
    }
    if (!stan.drag) return;
    pusc(); host.classList.remove("chwyt"); // prędkość przy puszczeniu to prawdziwa prędkość drzewa: gdy ręka stała, drzewo też już stoi
    stan.elCel = clamp(stan.elCel, EL_MIN, EL_MAX); stan.omKam = 10;
    if (anulowane || ruszono >= 8) return;
    wsp(e);
    const i = trafWahadlo(mysz.x, mysz.y), b = duza(i), t = performance.now(), iP = i < 0 ? trafPrezent() : -1;
    const dwu = t - ostTap.t < 320 && Math.hypot(e.clientX - ostTap.x, e.clientY - ostTap.y) < 30;
    ostTap = { t: dwu ? 0 : t, x: e.clientX, y: e.clientY };
    if (i >= 0) { stuknij(i); chime(NOTY[i % NOTY.length] * (b ? 1 : 2), b ? 0.3 : 0.12); } // klik popycha ozdobę i gra nutę
    if (dwu) {
      if (i >= 0) { if (b) wybierz(b); lecDo(i); }
      else if (iP >= 0) { wybierzP(iP); lecDoPrezentu(iP); }
      else if (trafCzubek()) lecDoCzubka();
      else if (stan.zoomCel < 0.8) wroc();
      else zoomO(0.5, e.clientX, e.clientY);
    } else if (b) wybierz(b === wybrana ? null : b);
    else if (iP >= 0) wybierzP(iP === wybP ? -1 : iP); // klik przypina otwarty prezent (na telefonie to jedyny sposób), drugi klik go zamyka
    else if (i < 0 && trafCzubek()) { holoKlik(); chime(NOTY[4] * 2, 0.16); }
    else if (i < 0) { wybierz(null); wybierzP(-1); }
    if (e.pointerType !== "mouse") mysz.set(-9, -9);
  }
  host.addEventListener("pointerup", (e) => koniec(e, false));
  host.addEventListener("pointercancel", (e) => koniec(e, true));
  host.addEventListener("pointerleave", () => mysz.set(-9, -9));
  host.addEventListener("wheel", (e) => { if (HERO) return; e.preventDefault(); zoomO(Math.exp(e.deltaY * 0.0012), e.clientX, e.clientY); }, { passive: false });

  // ----- klawiatura: strzałki obracają i podnoszą kamerę, + i − przybliżają, Esc wraca; Tab chodzi po bombkach projektów -----
  addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || (e.target && e.target.tagName === "INPUT")) return;
    const pchnij = (zn) => { stan.ost = performance.now() / 1000; if (mniejRuchu) stan.obr += zn * 0.2; else { stan.obrCel = (stan.obrCel !== null ? stan.obrCel : stan.obr) + zn * 0.4; stan.kier = zn; } }; // strzałka przesuwa cel obrotu, drzewo dochodzi do niego płynnie
    if (e.key === "ArrowLeft") pchnij(-1);
    else if (e.key === "ArrowRight") pchnij(1);
    else if (e.key === "ArrowUp") stan.elCel = clamp(stan.elCel + 0.08, -0.02, 0.7);
    else if (e.key === "ArrowDown") stan.elCel = clamp(stan.elCel - 0.08, -0.02, 0.7);
    else if (e.key === "+" || e.key === "=") zoomO(0.85);
    else if (e.key === "-" || e.key === "_") zoomO(1 / 0.85);
    else if (e.key === "Escape") wroc();
    else return;
    e.preventDefault();
  });
  const fokusy = document.getElementById("fokusy");
  prezenty.forEach((p) => { // prezenty dla klawiatury: fokus otwiera prezent, Enter go przypina
    const el = document.createElement("button"); el.type = "button"; el.className = "fb";
    el.setAttribute("aria-label", `Prezent: ${p.prod.nazwa}, ${p.prod.tag}. Enter przypina opis.`);
    el.addEventListener("focus", () => { fokusP = p.i; });
    el.addEventListener("blur", () => { if (fokusP === p.i) fokusP = -1; });
    el.addEventListener("click", () => wybierzP(p.i));
    fokusy.appendChild(el); p.przycisk = el;
  });

  function wybierz(b) { wybrana = b; siatki.forEach((x) => (x.cel = 1)); if (b) b.cel = 1.14; } // duża bombka: nick zostaje podpisany, kula lekko rośnie
  function wybierzP(i) {
    if (i >= 0 && i !== wybP) [0, 2, 4].forEach((n, k) => setTimeout(() => chime(NOTY[(i + n) % NOTY.length] * 2, 0.16), k * 90)); // otwarcie: trzy nuty w górę
    wybP = i;
  }
  function opiszKarte(i) { // karta opisuje prezent przypięty, a gdy żaden nie jest przypięty: ten pod kursorem albo z fokusem
    if (i === kartaP) return; kartaP = i;
    if (i >= 0) { const d = prezenty[i].prod; kZ.textContent = d.tag; kT.textContent = d.nazwa; kO.textContent = d.opis; kOdl.hidden = true; }
    else { kT.textContent = "Pod choinką leżą nasze programy"; kO.textContent = "Najedź na prezent, a się otworzy. Na bombkach wisi ekipa."; odliczaj(); }
    rozmiar();
  }
  // v9 (C1): odliczanie do Wigilii (24.12, 00:00 czasu przeglądarki); 24–26.12 życzenia, od 27.12 liczy do następnego roku.
  // Znacznik karty niesie dni, linia pod tytułem godziny i minuty. Odświeżane co 15 s i przy powrocie karty do stanu domyślnego.
  const kOdl = document.getElementById("kOdl");
  let odlTeraz = null; // testy: podstawiona data (ms)
  function doWigilii(now) {
    let r = now.getFullYear(); const sw = new Date(r, 11, 24), koniec = new Date(r, 11, 27);
    if (now >= sw && now < koniec) return { swieta: true };
    if (now >= koniec) r++;
    const s = Math.floor((new Date(r, 11, 24) - now) / 1000);
    return { swieta: false, d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60 };
  }
  function wpiszOdliczanie(now) { // v10: deklaracja funkcji (wywoływana też z bez3D, zanim scena powstanie), więc elementy szuka sama
    const o = doWigilii(now), z = document.getElementById("kZnacznik"), l = document.getElementById("kOdl"), dd = (n) => String(n).padStart(2, "0");
    z.textContent = o.swieta ? "wesołych świąt" : `do Wigilii ${o.d} ${o.d === 1 ? "dzień" : "dni"}`;
    l.textContent = o.swieta ? "" : `${dd(o.h)} h ${dd(o.m)} min`; l.hidden = o.swieta;
  }
  function odliczaj() {
    if (kartaP !== -1) return;
    wpiszOdliczanie(odlTeraz !== null ? new Date(odlTeraz) : new Date());
  }
  setInterval(odliczaj, 15000);
  function lecDoPrezentu(i) { const p = prezenty[i]; celCel.set(p.x, p.h + 0.7, p.z); stan.zoomCel = 5.5 / bazaR; stan.elCel = 0.3; stan.omKam = 6; stan.ost = performance.now() / 1000; }
  const przel = (id, k, po) => { const b = document.getElementById(id); b.addEventListener("click", () => { stan[k] = !stan[k]; b.setAttribute("aria-pressed", String(stan[k])); if (po) po(); }); b.setAttribute("aria-pressed", String(stan[k])); };
  przel("bSwiatla", "swiatla"); przel("bSnieg", "snieg"); przel("bObrot", "obrot");
  przel("bMuzyka", "dzwiek", () => (stan.dzwiek ? startDzwiek() : stopDzwiek()));

  // ================= ODBICIE W PODŁODZE (v7) =================
  // Kamera lustrzana: macierz świata = odbicie w płaszczyźnie y = 0 · kamera · odwrócenie osi x (wyznacznik dodatni, więc ściany nie zamieniają stron).
  // Rzut ten sam co w kamerze głównej z odwróconym przesunięciem kadru w poziomie, więc punkt podłogi z ekranu (u, v) leży w odbiciu pod (1 − u, v).
  // W odbiciu: mniej gałązek, bez śniegu, zorzy (ta idzie wprost w shaderze podłogi) i samej podłogi.
  const kamOdb = new T.PerspectiveCamera(); kamOdb.matrixAutoUpdate = false; kamOdb.matrixWorldAutoUpdate = false;
  const LUSTRO = new T.Matrix4().makeScale(1, -1, 1), ODWR = new T.Matrix4().makeScale(-1, 1, 1);
  const BEZ_ODB = [zorza, snieg, podloga, drobiny, sciana, sznurki9]; // v9: ściana poza odbiciem (stała jasność na podłodze zagłuszała gaśnięcie żarówek, etap4 test 1; i jeden przebieg mniej)
  let odbOn = true, zorzaWid = true;
  function odbicieKlatka() {
    const Q = POZIOMY[poziom], on = odbOn && Q.odb > 0; podlogaMat.uniforms.uOdbOn.value = on ? 1 : 0; if (!on) return;
    kamOdb.projectionMatrix.copy(kamera.projectionMatrix); kamOdb.projectionMatrix.elements[8] *= -1; kamOdb.projectionMatrixInverse.copy(kamOdb.projectionMatrix).invert();
    kamOdb.matrixWorld.copy(LUSTRO).multiply(kamera.matrixWorld).multiply(ODWR); kamOdb.matrixWorldInverse.copy(kamOdb.matrixWorld).invert();
    const wid = BEZ_ODB.map((o) => o.visible); BEZ_ODB.forEach((o) => (o.visible = false));
    const ig = igly.count, sk = uSkalaWsp.value, tl = scena.background;
    igly.count = Math.min(ig, Math.floor(NG * Q.odbGal)); uSkalaWsp.value = sk * Q.odb; scena.background = null;
    renderer.setRenderTarget(odbRT); renderer.render(scena, kamOdb); renderer.setRenderTarget(null);
    scena.background = tl; uSkalaWsp.value = sk; igly.count = ig; BEZ_ODB.forEach((o, i) => (o.visible = wid[i]));
  }

  // ================= DANE ŚWIATŁA DLA STRONY (v7) =================
  // window.choinkaSwiatlo + zdarzenie „choinka:swiatlo” + zmienne CSS --choinka-kolor (r g b), --choinka-moc (0–1), --choinka-x, --choinka-y (środek światła na ekranie).
  // Najwyżej 15 razy na sekundę. Dowód w artefakcie: krawędź karty od strony drzewa łapie to światło (gradient obramowania, tekst bez zmian).
  const SW_KOSC = [246, 242, 243], SW_HOT = [255, 58, 82], SW_ZLOTO = [255, 207, 51];
  const mieszaj = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const korzen = document.documentElement.style;
  let swT = -1, swN = 0, mocWymus = null;
  function swiatloDane(t, teraz) {
    if (!teraz && t - swT < 1 / 15 - 1e-4) return;
    swT = t; swN++;
    const zl = Math.min(1, U.uZl.value.w);
    let moc = U.uSw.value * (0.8 + 0.08 * Math.sin(t * 1.6)) * (1 + U.uPoziom.value * 0.8) / 1.45 + zl * 0.2;
    moc = mocWymus !== null ? mocWymus : clamp(moc, 0, 1);
    const kol = mieszaj(mieszaj(SW_KOSC, SW_HOT, 0.3 + 0.2 * U.uPoziom.value), SW_ZLOTO, zl * 0.5);
    wek.set(0, 5.2, 0).project(kamera); const x = (wek.x + 1) / 2, y = (1 - wek.y) / 2;
    korzen.setProperty("--choinka-kolor", kol.join(" ")); korzen.setProperty("--choinka-moc", moc.toFixed(3));
    korzen.setProperty("--choinka-x", (x * 100).toFixed(2) + "%"); korzen.setProperty("--choinka-y", (y * 100).toFixed(2) + "%");
    const kr = karta.getBoundingClientRect(), dx = x * innerWidth - (kr.left + kr.width / 2), dy = y * innerHeight - (kr.top + kr.height / 2);
    karta.style.setProperty("--karta-kat", (Math.atan2(dx, -dy) * 180 / Math.PI).toFixed(1) + "deg"); // kierunek od karty do drzewa
    const dane = { kolor: kol, moc: +moc.toFixed(3), x: +x.toFixed(4), y: +y.toFixed(4) };
    window.choinkaSwiatlo = dane; window.dispatchEvent(new CustomEvent("choinka:swiatlo", { detail: dane }));
  }

  // ================= PĘTLA + STRAŻNIK KLATEK =================
  const wek = new T.Vector3(), kamS = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };
  let poprz = performance.now() / 1000, oknoSuma = 0, oknoN = 0, rozbieg = 0, wrocWidac = false, nastDrg = 0, drgOn = true;
  const hud = document.getElementById("pomiar"); let hudT = 0, hudN = 0;
  if (/pomiar/.test(FLAGI)) hud.classList.add("jest");
  { // v10: pomiar na telefonie bez znacznika w adresie (artefakt może go nie przekazać): 3 stuknięcia w logotyp = licznik + poziom niski; kolejne 3 chowają licznik
    let n = 0, t0 = 0; const zn = document.querySelector(".znak"); zn.style.pointerEvents = "auto"; zn.style.touchAction = "manipulation";
    zn.addEventListener("pointerup", () => { const t = performance.now(); n = t - t0 < 600 ? n + 1 : 1; t0 = t; if (n < 3) return; n = 0; if (hud.classList.toggle("jest")) ustawPoziom(2); });
  }
  // v10 (etap 6): pętla rysuje tylko, gdy scena jest na ekranie, karta przeglądarki na wierzchu i kontekst WebGL żyje. Inaczej nie zamawia następnej klatki (0 klatek);
  // powrót zeruje zegar i okno strażnika jakości, żeby przerwa nie wyglądała na wolną klatkę. Odliczanie (setInterval co 15 s) chodzi dalej.
  let naEkranie = true, utracony = false, petlaStoi = false, klatekN = 0;
  function aktywna() { return !document.hidden && naEkranie && !utracony; }
  function wznow() {
    if (!petlaStoi || stan.pauza || !aktywna()) return;
    petlaStoi = false; poprz = performance.now() / 1000; rozbieg = 0; oknoSuma = 0; oknoN = 0; requestAnimationFrame(klatka);
  }
  const zmianaWidocznosci = () => { dzwiekZaScena(); wznow(); };
  document.addEventListener("visibilitychange", zmianaWidocznosci);
  if (window.IntersectionObserver) new IntersectionObserver((w) => { naEkranie = w[w.length - 1].isIntersecting; zmianaWidocznosci(); }).observe(host);
  renderer.domElement.addEventListener("webglcontextlost", () => { utracony = true; bez3D("utrata"); }); // three sam woła preventDefault, więc kontekst może wrócić
  renderer.domElement.addEventListener("webglcontextrestored", () => { // three odtwarza programy, bufory i tekstury; mapy otoczenia (render do celu) trzeba upiec od nowa
    utracony = false; ENV.biez = null; ENV.bezZorzy = null; ENV.pelna = zbudujEnv(true, true); ENV.zgaszona = zbudujEnv(false, true);
    zakryjZapas(); if (stan.pauza) klatka(); else wznow();
  });
  function klatka() {
    const t = performance.now() / 1000, dtP = t - poprz, dt = Math.min(0.05, dtP); poprz = t;
    // strażnik: średnia z 2 s powyżej 22 ms → poziom jakości w dół (nigdy w górę, żeby nie pływało)
    if (!stan.pauza && dtP < 0.25) {
      rozbieg += dtP;
      if (rozbieg > 1.5) { oknoSuma += dtP; oknoN++; if (oknoSuma >= 2) { if (oknoSuma / oknoN > 0.022 && poziom < 2) ustawPoziom(poziom + 1); oknoSuma = 0; oknoN = 0; } }
    }
    const obrA = stan.obr, omA = stan.vObr;
    if (!stan.pauza) ruchDrzewa(dt, t);
    if (stan.pauza) { stan.zoom = stan.zoomCel; stan.elCel = stan.el; cel.copy(celCel); celV.set(0, 0, 0); }
    else { // zbliżenie i cel na tej samej sprężynie: punkt pod kursorem nie ucieka w trakcie podjazdu
      const ok = stan.omKam;
      gladko(stan, "zoom", "vZoom", stan.zoomCel, ok, dt); gladko(stan, "el", "vEl", stan.elCel, stan.drag ? OM_CHWYT : ok, dt);
      kamS.x = cel.x; kamS.y = cel.y; kamS.z = cel.z; kamS.vx = celV.x; kamS.vy = celV.y; kamS.vz = celV.z;
      gladko(kamS, "x", "vx", celCel.x, ok, dt); gladko(kamS, "y", "vy", celCel.y, ok, dt); gladko(kamS, "z", "vz", celCel.z, ok, dt);
      cel.set(kamS.x, kamS.y, kamS.z); celV.set(kamS.vx, kamS.vy, kamS.vz);
    }
    ustawKamere();
    const tF = performance.now();
    if (!stan.pauza) fizyka(dt, obrA, stan.obr, omA, stan.vObr);
    if (P.drg && drgOn && !stan.pauza && !mniejRuchu && t > nastDrg) { // spoczynek: co kilka sekund drgnie jedna ozdoba, zamiast wspólnego przeciągu
      if (nastDrg) { const a = Math.random() * 6.283; if (Math.random() < 0.2) { LID.fx = Math.cos(a) * 1.5; LID.fz = Math.sin(a) * 1.5; } else szturchnij(Math.floor(Math.random() * NW), Math.cos(a), Math.sin(a), 0.3); }
      nastDrg = t + 3 + Math.random() * 5;
    }
    odswiezOzdoby();
    { const k = performance.now() - tF; kosztSuma += k; kosztN++; if (k > kosztMax) kosztMax = k; }
    const zblizone = stan.zoomCel < 0.95 || celCel.distanceToSquared(dom) > 0.01;
    if (zblizone !== wrocWidac) { wrocWidac = zblizone; bWroc.classList.toggle("jest", zblizone); }
    if (analiza && stan.dzwiek) { // pasma: szybkie narastanie, wolniejsze opadanie (żarówki nie migają na każdym okresie)
      analiza.getFloatFrequencyData(daneA); const n = pasmo(PASMO_N), w = pasmo(PASMO_W);
      poziomN += (n - poziomN) * (1 - Math.exp(-(n > poziomN ? 14 : 5) * dt)); poziomW += (w - poziomW) * (1 - Math.exp(-(w > poziomW ? 14 : 5) * dt));
    } else { poziomN *= Math.exp(-3 * dt); poziomW *= Math.exp(-3 * dt); }
    U.uT.value = t; U.uPoziom.value = Math.min(1, poziomW * WZM_W);
    U.uSw.value += ((stan.swiatla ? 1 : 0) - U.uSw.value) * (1 - Math.exp(-6 * dt));
    if (stan.pauza) U.uSw.value = stan.swiatla ? 1 : 0;
    zorzaMat.uniforms.uBoost.value = zorzaBoost !== null ? zorzaBoost : Math.min(1.2, poziomN * WZM_N);
    swiatloDrzewa.intensity = 46 * U.uSw.value * (1 + U.uPoziom.value * 0.8);

    { // co jest pod kursorem: najpierw ozdoby na drzewie, potem prezenty
      const iW = (!stan.drag && mysz.x > -2) ? trafWahadlo(mysz.x, mysz.y) : -1;
      nad = duza(iW); nadP = (!stan.drag && mysz.x > -2 && iW < 0) ? trafPrezent() : -1;
    }
    host.classList.toggle("nad", !!nad || nadP >= 0);
    const pokP = nadP >= 0 ? nadP : fokusP >= 0 ? fokusP : wybP;
    for (const p of prezenty) p.cel = (p.i === nadP || p.i === fokusP || p.i === wybP) ? 1 : 0;
    ruchPrezentow(dt, stan.pauza);
    opiszKarte(wybP >= 0 ? wybP : pokP);
    const pokaz = nad || (pokP < 0 ? wybrana : null), hb = host.getBoundingClientRect();
    if (pokaz) {
      swiat(pokaz.i, wek); wek.y += pokaz.r * pokaz.skala + 0.22; wek.project(kamera);
      etykieta.style.left = ((wek.x + 1) / 2) * hb.width + hb.left + "px"; etykieta.style.top = ((1 - wek.y) / 2) * hb.height + hb.top + "px";
      etykieta.textContent = pokaz.projekt.nazwa; etykieta.classList.add("jest");
    } else if (pokP >= 0) { // nazwa programu nad otwartym prezentem
      const p = prezenty[pokP]; wek.set(p.x, p.h + 0.85, p.z).project(kamera);
      etykieta.style.left = ((wek.x + 1) / 2) * hb.width + hb.left + "px"; etykieta.style.top = ((1 - wek.y) / 2) * hb.height + hb.top + "px";
      etykieta.textContent = p.prod.nazwa; etykieta.classList.add("jest");
    } else etykieta.classList.remove("jest");
    if (fokusP >= 0) { // pierścień fokusu klawiatury stoi na prezencie
      const p = prezenty[fokusP]; wek.set(p.x, p.h / 2, p.z); const gl = -v1.copy(wek).applyMatrix4(kamera.matrixWorldInverse).z; wek.project(kamera);
      const rp = Math.max(14, 0.7 * Math.max(p.w, p.d, p.h) * hb.height / (2 * Math.tan((FOV / 2) * Math.PI / 180) * Math.max(gl, 0.5)));
      const st = p.przycisk.style; st.width = st.height = (rp * 2).toFixed(1) + "px";
      st.transform = `translate(${(((wek.x + 1) / 2) * hb.width + hb.left - rp).toFixed(1)}px, ${(((1 - wek.y) / 2) * hb.height + hb.top - rp).toFixed(1)}px)`;
    }
    siatki.forEach((b) => { // najechanie i wybór: kula rośnie wokół własnego środka, zaczep podjeżdża razem z jej wierzchem
      const c2 = (b === nad && b !== wybrana) ? 1.06 : b.cel; b.skala += (c2 - b.skala) * (1 - Math.exp(-11 * dt));
      b.kula.scale.setScalar(b.skala); b.kap.position.y = -(b.w.L - b.w.Ls) + b.r * 1.04 * b.skala;
    });
    hologram(dt, t);

    snieg.visible = stan.snieg;
    if (stan.snieg) {
      const p = geoSn.attributes.position.array, n = POZIOMY[poziom].snieg;
      for (let i = 0; i < n; i++) { let y = p[i * 3 + 1] - dt * snF[i * 2 + 1] * (mniejRuchu ? 0.2 : 1); if (y < 0) y += 16; p[i * 3 + 1] = y; p[i * 3] += Math.sin(t * 0.7 + snF[i * 2]) * dt * 0.18; }
      geoSn.attributes.position.needsUpdate = true;
    }
    zorzaMat.uniforms.uT.value = zorzaCzas !== null ? zorzaCzas : t;
    if (zorzaWid) { renderer.setRenderTarget(zorzaRT); renderer.render(zorzaScena, zorzaKam); renderer.setRenderTarget(null); }
    ustawEnv(ENV.wymus || (U.uSw.value > 0.5 ? ENV.pelna : ENV.zgaszona));
    odbicieKlatka();
    podlogaMat.uniforms.uPV.value.multiplyMatrices(kamera.projectionMatrix, kamera.matrixWorldInverse);
    renderer.render(scena, kamera); klatekN++;
    swiatloDane(t);
    if (hud.classList.contains("jest")) {
      hudT += dtP; hudN++;
      if (hudT >= 1) { const i = renderer.info.render; hud.textContent = `${(hudN / hudT).toFixed(0)} kl./s · ${(hudT / hudN * 1000).toFixed(1)} ms\n${i.calls} wywołań · ${(i.triangles / 1000).toFixed(0)} tys. trójkątów\njakość: ${POZIOMY[poziom].nazwa} · DPR ${renderer.getPixelRatio().toFixed(2)}`; hudT = 0; hudN = 0; }
    }
    if (!stan.pauza) { if (aktywna()) requestAnimationFrame(klatka); else petlaStoi = true; }
  }
  // dane do testów i pomiaru
  function kadrInfo() {
    const h = host.clientHeight, px = (y) => (1 - v1.set(0, y, 0).project(kamera).y) / 2 * h;
    const dol = px(0), gora = px(WYS + 0.5);
    return { dol, gora, szczyt: px(SZCZYT), udzial: +((dol - gora) / h).toFixed(3), kartaGora: karta.getBoundingClientRect().top };
  }
  window.__choinka = {
    stan, wybierz, bombki, ozdoby, siatki, kamera, srodek: (i) => swiat(i, new T.Vector3()).toArray(), renderer, klatka, zorzaMat, kadrInfo, ustawPoziom, lecDo, lecDoCzubka, wroc, zoomO, cel, celCel,
    poziom: () => POZIOMY[poziom].nazwa,
    tylkoKorona: (tak) => { [zorza, snieg, kuleM, kapM, sopleM, sznurki, girlanda, holo, emiter, wiazka, drobiny, podloga].forEach((o) => (o.visible = !tak && (o !== sopleM || NI > 0))); siatki.forEach((b) => (b.grupa.visible = !tak)); if (tak) stan.snieg = false; }, // do pomiaru jasności samych igieł i żarówek
    liczby: () => ({ prezenty: NP, galezie: NB, przesla: NS, galazki: igly.count, igly: igly.count * IGIEL, zarowki: POZIOMY[poziom].zarowki, wahadla: NW, bombkiDuze: bombki.length, ozdobyPost: ozdoby.length, bombkiMale: NM, sople: NI, koraliki: NK }),
    fizyka: {
      n: NW, pierwszaDuza: ND0, symuluj, przenikanie, zeruj: () => zerujFizyke(stan.obr), katy: () => Array.from({ length: NW }, (_, i) => +katWah(i).toFixed(3)), ograniczonyRuch: mniejRuchu,
      katyRys: () => Array.from({ length: NW }, (_, i) => +(Math.asin(Math.min(1, Math.hypot(aWah.array[i * 4], aWah.array[i * 4 + 1]))) / RAD).toFixed(3)), // kąt taki, jaki poszedł do rysowania (po interpolacji)
      skladowe: (idx) => idx.map((i) => (ux[i] * fE[i * 2] + uz[i] * fE[i * 2 + 1]) / RAD),                 // wychylenie wzdłuż promienia ze znakiem [°]
      okresy: () => Array.from(fOm2, (v) => +(2 * Math.PI / Math.sqrt(v)).toFixed(3)), tlumienia: () => Array.from(fC, (v) => +v.toFixed(3)),
      koszt: (zeruj) => { const w = { sredniMs: +(kosztSuma / Math.max(kosztN, 1)).toFixed(3), maksMs: +kosztMax.toFixed(2), klatek: kosztN }; if (zeruj) { kosztSuma = 0; kosztN = 0; kosztMax = 0; } return w; },
      ekran: (i) => { swiat(i, wek).project(kamera); const hb = host.getBoundingClientRect(); return { x: ((wek.x + 1) / 2) * hb.width + hb.left, y: ((1 - wek.y) / 2) * hb.height + hb.top }; },
      wiatr: (tak) => { drgOn = tak; }, // od v5.3 przeciągu nie ma; zostaje wyłącznik drgnięć w spoczynku
      galezie: () => ({ n: NB, przesla: NS, x: Array.from({ length: NB }, (_, k) => +(bX[k + 1] / bR[k + 1]).toFixed(5)), y: Array.from({ length: NB }, (_, k) => +(bY[k + 1] / bR[k + 1]).toFixed(5)) }), // ugięcie końca gałęzi w długościach gałęzi
    },
    stroj: () => ({ ...STROJ, P: { ...P } }), // ustalone liczby ruchu (tylko odczyt)
    prezenty: {
      n: NP, nazwy: PRODUKTY.map((p) => p.nazwa), otwarcie: () => prezenty.map((p) => +p.ot.toFixed(3)), wybierz: wybierzP, lecDo: lecDoPrezentu,
      ekran: (i) => { const p = prezenty[i]; wek.set(p.x, p.h * 0.5, p.z).project(kamera); const hb = host.getBoundingClientRect(); return { x: ((wek.x + 1) / 2) * hb.width + hb.left, y: ((1 - wek.y) / 2) * hb.height + hb.top }; },
      // v9: prostokąt zawieszki na ekranie (obwiednia 4 rogów kafla), wymuszenie stanu wstążki i pokrywy (testy; w pauzie), wyłącznik zawieszek
      zawieszka: (i) => { const hb = host.getBoundingClientRect(), z = zawieszki[i], xs = [], ys = [];
        for (const [u, v] of [[-0.42, -0.08], [0.42, -0.08], [-0.42, -0.92], [0.42, -0.92]]) { wek.set(u, v, 0).applyMatrix4(z.matrixWorld).project(kamera); xs.push(((wek.x + 1) / 2) * hb.width + hb.left); ys.push(((1 - wek.y) / 2) * hb.height + hb.top); }
        return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; },
      gora: (i) => { const p = prezenty[i], hb = host.getBoundingClientRect(), xs = [], ys = []; macierzPudla(p); // obwiednia górnej części pudełka (pokrywa i kokarda)
        for (const sx of [-1, 1]) for (const sy of [p.hb - 0.1, p.h + 0.3]) for (const sz of [-1, 1]) { wek.set(sx * p.w / 2, sy, sz * p.d / 2).applyMatrix4(pM.box).project(kamera); xs.push(((wek.x + 1) / 2) * hb.width + hb.left); ys.push(((1 - wek.y) / 2) * hb.height + hb.top); }
        return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; },
      wymus: (i, wst, ot) => { const p = prezenty[i]; p.trzymaj = wst !== null && wst !== undefined; if (!p.trzymaj) return; p.wst = wst; p.ot = ot; p.otV = 0; p.zk = p.zb = p.zkV = p.zbV = 0; ustawPokrywe(p); },
      stanWstazki: () => prezenty.map((p) => +p.wst.toFixed(3)),
      zawieszkiWidoczne: (tak) => { [sznurki9, ...zawieszki].forEach((o) => (o.visible = tak)); },
      wstazkiWidoczne: (tak) => { [wstazki, kokardy, wezly].forEach((o) => (o.visible = tak)); },
    },
    odliczanie: { // v9 (C1): podstawiona data (ms od epoki albo null = zegar), odczyt tekstu karty
      ustaw: (ms) => { odlTeraz = ms === null || ms === undefined ? null : ms; odliczaj(); },
      tekst: () => ({ znacznik: kZ.textContent, linia: kOdl.hidden ? null : kOdl.textContent }),
    },
    tlo: { // v9 (T1): ściana i okno; prostokąt szyby na ekranie, wyłącznik ściany
      okno: () => { const hb = host.getBoundingClientRect(), xs = [], ys = []; for (const x of [OKNO.x0, OKNO.x1]) for (const y of [OKNO.y0, OKNO.y1]) { wek.set(x, y, OKNO.z).project(kamera); xs.push(((wek.x + 1) / 2) * hb.width + hb.left); ys.push(((1 - wek.y) / 2) * hb.height + hb.top); } return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), B: OKNO.B }; },
      widoczne: (tak) => { sciana.visible = tak; zorzaZnakiMat.depthTest = tak; },
      plotno: () => krajC.toDataURL(),
    },
    fokus: () => (fokusP >= 0 ? prezenty[fokusP].prod.nazwa : null),
    holo: { // hologram na czubku: stan, pomiary i sterowanie do testów etapu 3
      stan: () => ({ yaw: hol.yaw, pit: hol.pit, lid: [U.uLid.value.x, U.uLid.value.y], emiter: [emiter.position.x, emiter.position.z] }),
      odchylenie: () => { // kąt między normalną znaku a kierunkiem do kamery; „lustro” = widać go od tyłu (S odwrócone)
        hN.set(0, 0, 1).applyQuaternion(holo.quaternion); hT.copy(kamera.position).sub(holo.position).normalize();
        const d = clamp(hN.dot(hT), -1, 1); return { kat: +(Math.acos(d) / RAD).toFixed(3), lustro: d <= 0 };
      },
      mig: (tak) => { hol.migOn = tak; hol.mig0 = -9; },
      zamroz: (tak) => { hol.zamr = tak; },
      tylkoPrzod: (tak) => { HU.uPrzod.value = tak ? 1 : 0; }, // pomiar ostrości samej krawędzi: warstwy w głębi wyłączone
      widoczny: (tak) => { hol.wid = tak; [holo, emiter, wiazka, drobiny].forEach((o) => (o.visible = tak)); },
      mina: (i) => { hol.wymus = i === null || i === undefined ? null : i; if (hol.wymus !== null) ustawMine(hol.wymus); }, // null = wraca cykl
      robot: () => ({ miny: MINY.map((m) => m[0]), mina: hol.mina, nazwa: MINY[hol.mina][0], cykl: CYKL_MIN.slice(), tekstur: twarze.length, szczyt: +SZCZYT.toFixed(3) }),
      ekranPlasterkow: () => { // ten sam punkt znaku (róg ramy) na przednim i tylnym plasterku, w pikselach okna
        const hb = host.getBoundingClientRect(), na = (z) => { hT.set(BOK * 0.4, BOK * 0.4, z); holo.localToWorld(hT).project(kamera); return { x: ((hT.x + 1) / 2) * hb.width, y: ((1 - hT.y) / 2) * hb.height }; };
        return { przod: na(GLEB / 2), tyl: na(-GLEB / 2) };
      },
      probki: () => { // punkty do pomiaru kontrastu: piksel oka uwu (C, kość), piksel ust ω (S, hot), ekran między oczami (tło); prostokąt ramy; czubek ucha i kulka anteny
        const hb = host.getBoundingClientRect(), px = (x, y, z = GLEB / 2) => { hT.set(x, y, z); holo.localToWorld(hT).project(kamera); return [((hT.x + 1) / 2) * hb.width, ((1 - hT.y) / 2) * hb.height]; };
        const g = (x, y) => px(...robJ(x, y));
        const r0 = px(-HU.uW.value / 2, HU.uH.value / 2), r1 = px(HU.uW.value / 2, -HU.uH.value / 2);
        return { C: g(93.5, 103.5), S: g(103.5, 145.5), tlo: g(120, 125), ucho: [g(63, 22), g(177, 22)], antena: g(120, 15),
          ramka: [Math.min(r0[0], r1[0]), Math.min(r0[1], r1[1]), Math.abs(r1[0] - r0[0]), Math.abs(r1[1] - r0[1])] };
      },
    },
    muzyka: { // etap 5: źródło, pasma, dzwonki; plik(url, tonacja) podmienia źródło na pętlę z pliku (testy na syntetycznych WAV)
      stan: () => ({ kontekst: A ? A.state : "brak", gra: stan.dzwiek, zrodlo, petla: zrodlo === "plik" ? !!(plikZr && plikZr.loop) : true, glosnosc: master ? +master.gain.value.toFixed(3) : 0,
        nis: +poziomN.toFixed(4), wys: +poziomW.toFixed(4), uBoost: +zorzaMat.uniforms.uBoost.value.toFixed(3), uPoziom: +U.uPoziom.value.toFixed(3), dzwonki: { ...dzw } }),
      plik: (url, tonacja) => (A ? wczytajPlik(url, tonacja || null) : Promise.resolve(null)),
      pozycja: () => (A && plikDl ? (A.currentTime - plikStart) % plikDl : 0),
      rms: () => { if (!analiza) return 0; analiza.getFloatTimeDomainData(daneT); let s = 0; for (let i = 0; i < daneT.length; i++) s += daneT[i] * daneT[i]; return Math.sqrt(s / daneT.length); },
      tonacja: () => ({ tryb: !chimeNuty ? "wyciszone" : "tonacja", tonika: chimeNuty === NOTY ? "A" : null, dzwonki: chimeNuty ? chimeNuty.slice() : [], pad: PAD.slice() }),
    },
    etap6: { // v10: licznik narysowanych klatek, stan pętli i obrazu zapasowego, oscylatory padu
      klatek: () => klatekN, aktywna, stoi: () => petlaStoi,
      zapas: () => ({ widoczny: !zapas.hidden, powod: zapasPowod }),
      padOsc: () => padOsc.length,
    },
    naEkran: (x, y, z) => { wek.set(x, y, z).project(kamera); const hb = host.getBoundingClientRect(); return [((wek.x + 1) / 2) * hb.width + hb.left, ((1 - wek.y) / 2) * hb.height + hb.top]; },
    otoczenie: { // etap 4: odbicie, mapa otoczenia, zorza, dane światła
      stan: () => ({ odbicie: odbOn && POZIOMY[poziom].odb > 0, poziom, rozdzOdbicia: [odbRT.width, odbRT.height], rozdzZorzy: [zorzaRT.width, zorzaRT.height], aktualizacjiSwiatla: swN }),
      odbicie: (tak) => { odbOn = tak; },
      zorzaWidoczna: (tak) => { zorzaWid = tak; zorza.visible = tak; },
      znaki: (tak) => { zorzaZnakiMat.uniforms.uZnaki.value = tak ? 1 : 0; },
      czasZorzy: (t) => { zorzaCzas = t === null || t === undefined ? null : t; },
      wzmocnienie: (b) => { zorzaBoost = b === null || b === undefined ? null : b; },
      prezentyWidoczne: (tak) => { [pudla, wstazki, kokardy, wezly, wnetrza, sznurki9, ...zawieszki].forEach((o) => (o.visible = tak)); }, // pomiar samej podłogi: pudełka zasłaniają ją przed drzewem
      tylkoZorza: (() => { let zap = null; return (tak) => { if (tak && !zap) { zap = scena.children.map((o) => [o, o.visible]); scena.children.forEach((o) => { if (o !== zorza) o.visible = false; }); } else if (!tak && zap) { zap.forEach(([o, v]) => (o.visible = v)); zap = null; } }; })(),
      env: (w) => { if (w === "bez-zorzy" && !ENV.bezZorzy) ENV.bezZorzy = zbudujEnv(true, false); ENV.wymus = w === "pelna" ? ENV.pelna : w === "bez-zarowek" ? ENV.zgaszona : w === "bez-zorzy" ? ENV.bezZorzy : null; },
      envInfo: () => ({ zarowek: Math.floor(NZ / 3), zorza: true, materialow: envMaty.size }),
      bombkaEkran: (n) => { const b = bombki[n]; swiat(b.i, wek); const d = wek.distanceTo(kamera.position), hb = host.getBoundingClientRect(); const r = b.r * b.skala * hb.height / (2 * Math.tan((FOV / 2) * Math.PI / 180) * d); wek.project(kamera); return { x: ((wek.x + 1) / 2) * hb.width + hb.left, y: ((1 - wek.y) / 2) * hb.height + hb.top, r }; },
      wymusMoc: (m) => { mocWymus = m === null || m === undefined ? null : m; swiatloDane(performance.now() / 1000, true); },
    },
  };
  // mapa otoczenia: wszystkie materiały z odbiciem (podest, prezenty, zaczepy, bombki, emiter) dostają ją przed pierwszą klatką
  scena.traverse((o) => [].concat(o.material || []).forEach((m) => { if (m.isMeshStandardMaterial) envMaty.add(m); }));
  ENV.pelna = zbudujEnv(true, true); ENV.zgaszona = zbudujEnv(false, true); ustawEnv(ENV.pelna);
  klatka();
})();
