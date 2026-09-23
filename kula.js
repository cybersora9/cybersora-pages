/* kula.js — wyniesione z index.html 23.09 (BEZPIECZENSTWO modul 5: CSP bez 'unsafe-inline').
   Dawne bloki 2+3: ladowacz three.js po load + __somiOrbBoot (kula SOMI).
   Laduje sie zwyklym <script src> w tym samym miejscu co dawny blok inline — kolejnosc wykonania bez zmian. */
(function(){
  'use strict';
  var canvas = document.getElementById('somiDemoOrb');
  if(!canvas) return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* Sprawdzenie WebGL-a PRZED pobraniem: na sprzęcie bez sterownika kula i tak
     by nie ruszyła, więc ściąganie 590 KB byłoby czystą stratą transferu. */
  try {
    var probe = document.createElement('canvas');
    if(!(probe.getContext('webgl') || probe.getContext('experimental-webgl'))) return;
  } catch(e){ return; }

  window.addEventListener('load', function(){
    var tag = document.createElement('script');
    tag.src = 'vendor/three.min.js';
    tag.onload = function(){
      try { window.__somiOrbBoot(); } catch(e){}
    };
    document.head.appendChild(tag);
  });
})();

window.__somiOrbBoot = function(){
'use strict';
if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
if(typeof THREE === 'undefined') return;  // vendor/three.min.js nie wczytał się — cisza, nie błąd

var accent, hot, warnCol, okCol;
try {
  var cs = getComputedStyle(document.documentElement);
  accent = new THREE.Color(cs.getPropertyValue('--th-accent').trim() || '#e11d33');
  hot = new THREE.Color(cs.getPropertyValue('--th-hot').trim() || '#ff3a52');
  warnCol = new THREE.Color(cs.getPropertyValue('--warn').trim() || '#d9a441');
  okCol = new THREE.Color(cs.getPropertyValue('--ok').trim() || '#6fbf95');
} catch(e) {
  accent = new THREE.Color('#e11d33'); hot = new THREE.Color('#ff3a52');
  warnCol = new THREE.Color('#d9a441'); okCol = new THREE.Color('#6fbf95');
}

/* Kolor i "temperament" na stan — 'error' celowo ZATRZYMUJE obrót
   (spin 0) zamiast dostawać własny odcień: to samo 'hot' co 'tool',
   ale nieruchome czyta się jako "utknęła". Zamiast tego dostaje szybki,
   drobny jitter (breathAmp/breathFreq wysokie) — "zamrożona, ale się
   trzęsie", nie "martwa". Kolor zostaje KRWISTY; bursztyn TYLKO
   w 'thinking' — z Jarvisa bierzemy budowę, nie złoto. */
var MOOD_COLOR = {calm: accent, wow: hot, tool: hot, thinking: warnCol, speaking: okCol, error: hot};

/* Dziesięć pól na stan, nie pięć. Pierwsze pięć to wartości, które stały
   tu od początku; pozostałe pięć steruje warstwami przeniesionymi ze stołu
   i przyjechały tą samą drogą co reszta — przez panel eksportu, nie z głowy.
     fibers — gęstość włókien      frame — jasność klatki
     burn   — przepalenie środka   wave  — bieżąca fala
     scan   — skanowanie                                              */
var MOOD_PARAMS = {
  calm:     {spin: 1,   breathAmp: 0.05, breathFreq: 0.6, size: 1.00, glow: 0.35, fibers: 0.22, frame: 0.16, burn: 0.18, wave: 0.10, scan: 0.15},
  /* WOW STONOWANY 11.09. Bylo: spin 6 (szesc razy szybciej niz calm!), size 1.30,
     glow 0.70, scan 0.90 — przy kazdej zmianie trasy kula dostawala napadu.
     Teraz blizej calm: ma byc widac, ze zareagowala, a nie ze zwariowala.
     Stare wartosci zostaja tutaj, gdyby trzeba bylo wrocic. */
  wow:      {spin: 2.0, breathAmp: 0.07, breathFreq: 1.2, size: 1.07, glow: 0.45, fibers: 0.42, frame: 0.34, burn: 0.38, wave: 0.18, scan: 0.30},
  tool:     {spin: 6,   breathAmp: 0.10, breathFreq: 2.0, size: 1.20, glow: 0.65, fibers: 0.95, frame: 0.74, burn: 0.55, wave: 0.35, scan: 0.72},
  thinking: {spin: 2.2, breathAmp: 0.09, breathFreq: 1.1, size: 1.05, glow: 0.50, fibers: 0.45, frame: 0.46, burn: 0.30, wave: 0.28, scan: 0.50},
  speaking: {spin: 1.3, breathAmp: 0.16, breathFreq: 3.2, size: 1.15, glow: 0.60, fibers: 0.50, frame: 0.40, burn: 0.46, wave: 0.75, scan: 0.30},
  error:    {spin: 0,   breathAmp: 0.22, breathFreq: 9.0, size: 1.10, glow: 0.80, fibers: 0.80, frame: 0.90, burn: 0.70, wave: 0.20, scan: 0.00},
  /* Profil TYLKO dla kuli w pasku (navOrb, 19.09) — ta sama gestosc/blask
     co 'calm', ale zero oddechu/fali/skanu: obraca sie i nic wiecej.
     Nigdy nie dostaje setMood/flare z zewnatrz, wiec te zera sa ostatnim
     slowem, nie punktem startowym do animacji. */
  static:   {spin: 1,   breathAmp: 0,    breathFreq: 0,   size: 1.00, glow: 0.35, fibers: 0.22, frame: 0.16, burn: 0.18, wave: 0.00, scan: 0.00}
};
var MOOD_KEYS = ['spin','breathAmp','breathFreq','size','glow','fibers','frame','burn','wave','scan'];

/* ---------- Seria TRANSFER — czysta matematyka kuli ---------- */
/* Ten blok nie dotyka ani DOM-u, ani WebGL-a. Dzięki temu bramka wycina go
   i puszcza przez node (tak samo jak blok OSC 52 wyżej): gdyby siedział
   w środku makeOrb, nie byłoby czego zmierzyć. Wartości pochodzą ze stołu
   roboczego (artefakt 72c8ed0b), nie z głowy. */

/* KADR. Płótno i kamera idą w PARZE — to stosunek WYSOKOŚCI bufora do
   odległości kamery decyduje, ile pikseli zajmie kula (PerspectiveCamera
   dostaje PIONOWE pole widzenia). Obie kule zachowują swój stosunek
   i dostają margines: duża 520/4.0 = 130 → 760/5.85 = 129.9, mała
   140/4.0 = 35 → 205/5.85 = 35.04. Margines jest konieczny, bo poświata
   przepalenia i długie włókna sięgają dalej niż stary kadr i urywały się
   na brzegu płótna prostą linią — jako widoczny KWADRAT. */
function kadrSkala(bok, kamera){ return bok / kamera; }
/* M2.1 — PLOTNO W ROZMIARZE WYSWIETLANIA. Do M2 bufor mial na stale 322x205,
   a przegladarka skalowala go w dol 3,93x do 81,7x52. ZMIERZONE przed zmiana
   (sonda _sonda_kula.html, 120 klatek): w widocznym wycinku paska srednia
   jasnosc 3,7/255, mediana 0,1, maksimum 47 — przy logotypie o jasnosci 255.
   W samym buforze, PRZED skalowaniem, maksimum wynosilo 168: swiatlo bylo, tylko
   siedzialo w punktach mniejszych od piksela ekranu i ginelo w sredniej sasiadow.
   Dlatego `bok` to teraz wysokosc slotu w pasku, a nie liczba z terminala.
   Kamera ZOSTAJE 4.2, bo o wielkosci kuli na ekranie decyduje sam kadr — pole
   widzenia i odleglosc — a nie rozdzielczosc bufora: kula zajmuje ten sam
   UŁAMEK wysokosci niezaleznie od tego, ile pikseli ta wysokosc ma. Przy
   buforze rownym wyswietlaniu `bok/kamera` czyta sie wprost jako piksele ekranu
   na jednostke sceny: 52/4.2 = 12,4, czyli kula o promieniu 1 ma 24,8 px srednicy. */
var ORB_FRAME = {
  mala:  {bok: 205, kamera: 5.85},  /* kadr 1:1 z terminala — punkt odniesienia, na stronie nieuzywany */
  /* PASEK — jedyna liczba, ktora rozni sie od terminala, i z policzonego powodu.
     Terminal pokazuje ten kadr na 103 px wysokosci, wiec kula (34% wysokosci
     kadru przy kamerze 5.85) ma tam ~35 px. Pasek strony ma 64 px wysokosci,
     wiec to samo plotno wchodzi na 52 px — kula zeszlaby do ~18 px, czyli
     mniej niz maskotka, ktora zastepuje (27x34 px). Kamera blizej odwraca
     dokladnie ten stosunek: 5.85 * 18/25 = 4.2 → kula ~25 px.
     Margines na wlokna zostaje: siegaja 1.42 promienia, czyli 1,42*12,4 =
     17,6 px od srodka przy polowie kadru 26 px — dalej nie dotykaja krawedzi,
     wiec poswiata nie urwie sie widocznym kwadratem. ZMIERZONE sonda: 99%
     swiatla miesci sie w promieniu 21,8 px, czyli wciaz wewnatrz kadru. */
  /* `bok` jest tu WARTOSCIA ZAPASOWA: prawdziwa wysokosc bierze sie ze slotu
     w chwili rysowania (patrz wysokoscSlotu / dopasujPlotno), bo pasek kurczy
     sie po przewinieciu z 64 na 52 px, a na telefonie stoi na 44. `prop` to
     ksztalt kadru — ten sam co w terminalu, 322:205; zmienila sie gestosc
     bufora, nie jego proporcja. */
  pasek: {bok: 52, kamera: 4.2, prop: 322/205}
  /* Terminal ma tu jeszcze dwa kadry (duza 760 i czolo 410) przy TEJ SAMEJ
     kamerze. Nie przenosze ich, bo na stronie nie ma dla nich plotna — a te
     same 5.85 znacza, ze gdyby kiedys doszly, kula zajmie ten sam ulamek
     kadru co tutaj. */
};

/* MIESZANIE. AdditiveBlending przy alpha:true dopisuje do kanału ALFA płótna,
   a płótno składa się ze stroną jako kolor + (1 - alfa) * tło. Ciemna kreska
   z wysoką alfą ZJADA więc poświatę leżącą pod spodem (.face__glow) — cienkie
   łuki klatki wychodziły jako czarne kreski na czerwonym kloszu.
   Z alfą przybitą do zera składanie jest czystym dodawaniem: warstwa może
   tylko dołożyć światła, nigdy je odjąć. */
function zMieszaniem(o){
  o.blending           = THREE.CustomBlending;
  o.blendEquation      = THREE.AddEquation;
  o.blendSrc           = THREE.OneFactor;
  o.blendDst           = THREE.OneFactor;
  o.blendEquationAlpha = THREE.AddEquation;
  o.blendSrcAlpha      = THREE.ZeroFactor;
  o.blendDstAlpha      = THREE.OneFactor;
  return o;
}

/* KRYCIE. Konsekwencja mieszania wyżej: material.opacity siedzi w kanale
   alfa, a alfę właśnie przybiliśmy do zera — od teraz nie robi NIC. Krycie
   wchodzi tam, gdzie na pewno dojdzie: w kolor na wierzchołek. */
var KRYCIE = {rdzen: 0.95, wlokno: 0.90, klatka: 0.95, jadro: 0.44, odlamek: 0.75};
function krycieHalo(glow){ return 0.2 + glow * 0.4; }

/* EKSPOZYCJA. Punkty dodają się do siebie, więc dwa razy gęstsza chmura
   świeci dwa razy mocniej i kanały dobijają do jedynki. Najpierw nasyca się
   najsilniejszy kanał, potem dorastają pozostałe — i kolor stanu BIELEJE.
   Jasność pojedynczego punktu spada więc z pierwiastkiem gęstości, żeby
   liczba punktów zmieniała ZIARNO chmury, a nie ekspozycję całej sceny. */
function ekspozycja(N){ return Math.pow(900 / Math.max(120, N), 0.5); }

/* CHMURA i WARSTWY — jeden zestaw wartości dla obu kul, prosto z panelu
   eksportu na stole. Instancje różnią się tylko GĘSTOŚCIĄ (N), a liczby
   włókien i odłamków skalują się razem z nią, żeby mała kula nie była
   ani łysa, ani zarośnięta. */
var ORB_CLOUD  = {N: 1600, kopce: 4, sigma: 0.21, amp: 0.09};
var ORB_LAYERS = {
  fibers: 120,   /* liczba włókien przy pełnej gęstości */
  lines:  2,     /* linii na włókno — linewidth w WebGL NIE działa */
  reach:  0.42,  /* zasięg włókna poza chmurę */
  depth:  0.72,  /* przyciemnienie drugiej strony kuli */
  rings:  3,     /* klatka; obrót = -0.26 rdzenia, czyli PRZECIWNIE */
  arc:    0.62,  /* ile obręczy widać; reszta to wędrująca szczelina */
  debris: 22     /* odłamki na własnych orbitach */
};
/* PUNKT — MIERZONY W PIKSELACH EKRANU, nie w jednostkach sceny (M2.1).
   `PointsMaterial.size` jest w jednostkach SCENY, a three liczy z niego
   gl_PointSize = size * pixelRatio * (wysokosc_css/2) / odleglosc. Odkad bufor
   ma rozmiar wyswietlania, piksel bufora jest pikselem ekranu, wiec te dwie
   miary przelicza sie wprost: size = px * kamera / (wysokosc/2). W module
   trzymam PIKSELE, bo to jedyna liczba, ktora widac — jednostki sceny milczaly
   o tym, ze rdzen chmury schodzi do 0,31 px i nie ma czym swiecic.
   Stare wartosci przeliczone na piksele ekranu (slot 52 px, kamera 4.2):
   rdzen 0,31, halo 0,68, odlamek 0,28, zar 1,00 — wszystkie PONIZEJ albo tuz
   przy pikselu. Jedyna warstwa, ktora rysowala sie w pelni, byla ISKRA
   (3,40 + 9,60*zar px) — miekka poswiata przepalenia; to ona trzymala dotad
   cala kule przy zyciu i dlatego zostaje bez zmian. */
var ORB_PUNKT = {
  rdzen:     1.30,   /* ~4,2x wiecej niz bylo: przy 460 punktach na kuli o srednicy
                        24,8 px odstep miedzy sasiadami to ok. 1,4 px — punkt ma go
                        prawie domykac, zeby chmura czytala sie jako ziarno, nie mgla */
  halo:      2.86,   /* ten sam stosunek do rdzenia co dotad (0.11/0.05 = 2,2) */
  odlamek:   1.15,
  /* ZAR — jadro przepalenia. Stara wartosc (0,68 + 1,18*zar px) NIGDY sie nie
     narysowala: przy spokoju wychodzilo z niej 1,0 px, czyli jeden piksel na
     kule o srednicy 25 px. Chmura jest POWLOKA, wiec sama z siebie swieci
     mocniej przy KRAWEDZI niz w srodku (na obrzezu wiecej punktow wpada
     w jeden piksel) — zmierzone: p90 86 i p99 117 leza blisko siebie, czyli
     rownomierna tarcza bez jadra. Jedyna warstwa, ktora moze zrobic srodek,
     to wlasnie zar; stad i wieksza kropka, i wlasny mnoznik jasnosci nizej. */
  zarBaza:   3.20, zarZar:   3.40, zarJasnosc: 2.20,
  iskraBaza: 3.40, iskraZar: 9.60,
  /* JASNOSC — jedyna liczba dobrana POMIAREM, nie wyprowadzona. Punkt urosl
     17 razy w POWIERZCHNI, wiec przy tej samej jasnosci na punkt chmura zalalaby
     pasek na bialo. Sama zachowawczosc (1/17,6 = 0,057) oddalaby z powrotem
     dzisiejsza ciemna kaszke, tylko grubszym ziarnem. Wartosc nizej wyszla
     z sondy — dobrana tak, zeby w widocznym wycinku paska trafic w pasmo
     ustalone PRZED strojeniem: maksimum >= 180, 1-8% pikseli powyzej 128,
     8-30% powyzej 40, srednia 12-30. */
  jasnosc:   0.36
};

/* Wysokosc, na jakiej plotno naprawde stoi w pasku. Slot ma display:none az do
   chwili, gdy kula wstanie (klasa has-orb), wiec przy pierwszym wywolaniu
   prostokat jest zerowy — stad wartosc zapasowa z ORB_FRAME. Kiedy slot sie
   odslania, ResizeObserver wola dopasujPlotno jeszcze raz. */
function wysokoscSlotu(canvas){
  var el = (canvas && canvas.parentNode) || canvas;
  var r = el ? el.getBoundingClientRect() : null;
  return Math.max(8, Math.round((r && r.height) || ORB_FRAME.pasek.bok));
}

var ORB_MOTION = {
  turbulence: 0.35,  /* dryf rdzenia; klatka go NIE dostaje */
  burst:      0.14,  /* rozsypanie przy rozbłysku — 0,45 do 11.09; maisa: "strasznie swiruje jak klikniesz" */
  ease:       0.14   /* tempo przelewania stanu; 1 = przeskok */
};
var ORB_OPTICS = {
  on:         true,
  aberration: 0.40,  /* rozjazd kanałów: 0.004 + 0.055*r² kadru */
  streak:     0.55,  /* pozioma smuga; 17 próbek co 0.009 kadru */
  threshold:  0.42,  /* od jakiej jasności smuga w ogóle powstaje */
  grain:      0.40,  /* MNOŻĄCE — dodawane narysowałoby prostokąt płótna */
  vignette:   0.45,  /* też mnożąca, z tego samego powodu */
  distortion: 0.30   /* beczka 0.22*r²; ma być ledwo mierzalna */
};

/* Losowanie z ziarna, nie Math.random: kształt chmury ma być powtarzalny
   między odświeżeniami. KAŻDA instancja dostaje INNE ziarno — to samo
   zrobiłoby z małej i dużej kuli bliźniaki o identycznym kształcie. */
function zZiarna(seed){
  var z = seed >>> 0;
  return function(){ z = (z * 1664525 + 1013904223) % 4294967296; return z / 4294967296; };
}

/* Punkty rozłożone po kuli fibonacciowo (golden-angle spiral) zamiast
   losowo — losowy rozkład zawsze zostawia rzadkie "dziury" i zbite kępki
   przy takim N, fibonacci daje równą gęstość na całej powierzchni. */
function fibonacciSphere(N){
  var dirs = new Float32Array(N * 3);
  var goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for(var i = 0; i < N; i++){
    var y = 1 - (i / (N - 1)) * 2;
    var rY = Math.sqrt(Math.max(0, 1 - y * y));
    var theta = goldenAngle * i;
    dirs[i*3]   = Math.cos(theta) * rY;
    dirs[i*3+1] = y;
    dirs[i*3+2] = Math.sin(theta) * rY;
  }
  return dirs;
}

/* ROZSTROJENIE SIATKI. Sam ciąg Fibonacciego rozkłada punkty równomiernie,
   ale UKŁADA je w spiralę — i przy dużej gęstości oko zaczyna czytać
   koncentryczne łuki zamiast chmury. Przesuwamy każdy punkt o ułamek
   średniego odstępu w losowym kierunku stycznym: równomierność zostaje
   (przesunięcie jest mniejsze niż odstęp), a regularny wzór znika. */
function rozstrojSiatke(dirs, N, rnd){
  var odstep = Math.sqrt(4 * Math.PI / N) * 0.62;
  for(var i = 0; i < N; i++){
    var dx = dirs[i*3], dy = dirs[i*3+1], dz = dirs[i*3+2];
    var ax, ay, az;
    if(Math.abs(dy) < 0.9){ ax = -dz; ay = 0; az = dx; }
    else                  { ax = 0;   ay = dz; az = -dy; }
    var al = Math.sqrt(ax*ax+ay*ay+az*az) || 1;
    ax/=al; ay/=al; az/=al;
    var bx = dy*az - dz*ay, by = dz*ax - dx*az, bz = dx*ay - dy*ax;
    var kat = rnd() * Math.PI * 2;
    var d = odstep * Math.sqrt(rnd());
    var ox = (ax*Math.cos(kat) + bx*Math.sin(kat)) * d;
    var oy = (ay*Math.cos(kat) + by*Math.sin(kat)) * d;
    var oz = (az*Math.cos(kat) + bz*Math.sin(kat)) * d;
    var nx = dx+ox, ny = dy+oy, nz = dz+oz;
    var nl = Math.sqrt(nx*nx+ny*ny+nz*nz) || 1;
    dirs[i*3] = nx/nl; dirs[i*3+1] = ny/nl; dirs[i*3+2] = nz/nl;
  }
}

/* Kilka "kopców" nałożonych na promień punktu wg jego kierunku (gaussowski
   spadek od losowego środka na kuli) — zamiast idealnej kuli daje to
   nieregularną, puchatą bryłę. Suma przycięta, żeby nawet przy nałożeniu
   kilku kopców blisko siebie punkt nie wystrzelił poza kadr. */
function addPuff(dirs, N, ile, sigmaBaza, ampBaza, rnd){
  var centers = [], b;
  for(b = 0; b < ile; b++){
    var x = rnd()*2-1, y = rnd()*2-1, z = rnd()*2-1;
    var len = Math.sqrt(x*x + y*y + z*z) || 1;
    var sign = rnd() < 0.35 ? -1 : 1;
    centers.push({
      x:x/len, y:y/len, z:z/len,
      amp: sign * (ampBaza * 0.55 + rnd() * ampBaza * 0.9),
      sigma: sigmaBaza * 0.75 + rnd() * sigmaBaza * 0.5
    });
  }
  var puff = new Float32Array(N);
  for(var i = 0; i < N; i++){
    var dx = dirs[i*3], dy = dirs[i*3+1], dz = dirs[i*3+2], sum = 0;
    for(var c2 = 0; c2 < centers.length; c2++){
      var c = centers[c2];
      var ang = 1 - (dx*c.x + dy*c.y + dz*c.z);
      sum += c.amp * Math.exp(-(ang*ang) / (2*c.sigma*c.sigma));
    }
    puff[i] = Math.max(-0.14, Math.min(sum, 0.16));
  }
  return puff;
}

function gladko(a, b, x){
  var u = (x - a) / (b - a);
  u = u < 0 ? 0 : (u > 1 ? 1 : u);
  return u * u * (3 - 2 * u);
}

/* Liczba włókien i odłamków skalowana gęstością instancji. Mała kula ma
   mniej punktów, więc te same 120 włókien zrobiłyby z niej jeża. */
function ileWarstwy(ile, N){ return Math.max(0, Math.round(ile * N / ORB_CLOUD.N)); }
/* ---------- koniec matematyki: niżej DOM i WebGL ---------- */

/* Miękka kropka zamiast twardego kwadratu, który THREE.Points rysuje
   domyślnie. Jedna tekstura, współdzielona przez wszystkie kule. */
var dotTexture = (function(){
  var c = document.createElement('canvas');
  c.width = c.height = 64;
  var g = c.getContext('2d');
  var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0,   'rgba(255,255,255,1)');
  grad.addColorStop(0.35,'rgba(255,255,255,.55)');
  grad.addColorStop(1,   'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

/* Druga kropka, DUŻO bardziej miękka — pod poświatę przepalenia. Ta od
   punktów trzyma pełne krycie do 35% promienia i przy rozmiarze jądra
   dawała twardy biały krążek zamiast prześwietlenia. */
var jadroTexture = (function(){
  var c = document.createElement('canvas');
  c.width = c.height = 128;
  var g = c.getContext('2d');
  var grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0,    'rgba(255,255,255,1)');
  grad.addColorStop(0.14, 'rgba(255,255,255,.62)');
  grad.addColorStop(0.34, 'rgba(255,255,255,.24)');
  grad.addColorStop(0.55, 'rgba(255,255,255,.09)');
  grad.addColorStop(0.74, 'rgba(255,255,255,.035)');
  grad.addColorStop(0.88, 'rgba(255,255,255,.012)');
  grad.addColorStop(1,    'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();

/* Wierzchołek wspólny dla obu przebiegów optyki: quad wypełnia kadr,
   więc żadnych macierzy — pozycja idzie prosto do clip space. */
var VS_QUAD = [
  'varying vec2 vUv;',
  'void main(){ vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }'
].join('\n');

var FS_SMUGA = [
  'uniform sampler2D tScena;',
  'uniform vec2 krok;',
  'uniform float prog;',
  'varying vec2 vUv;',
  'void main(){',
  '  vec3 suma = vec3(0.0);',
  '  float waga = 0.0;',
  '  for(int i = -8; i <= 8; i++){',
  '    float fi = float(i);',
  '    float w = exp(-fi * fi / 26.0);',
  '    vec3 c = texture2D(tScena, vUv + krok * fi).rgb;',
  '    float l = max(max(c.r, c.g), c.b);',
  '    suma += c * smoothstep(prog, prog + 0.30, l) * w;',
  '    waga += w;',
  '  }',
  '  gl_FragColor = vec4(suma / waga, 1.0);',
  '}'
].join('\n');

/* SKŁADANIE — wszystko, co robi "szkło zamiast renderu", siedzi tutaj.
   `prop` skaluje współrzędne tak, żeby promień był liczony IZOTROPOWO,
   w jednostkach wysokości kadru. Bez tego winieta i rozszczepienie
   wyszłyby na małej kuli (322x205) ELIPTYCZNE — a to jedyna różnica
   między instancjami; wartości zostają jedne. Dla kwadratu prop = (1,1),
   czyli duża kula liczy dokładnie to, co stół. */
var FS_SKLAD = [
  'uniform sampler2D tScena;',
  'uniform sampler2D tSmuga;',
  'uniform vec2 prop;',
  'uniform float aber, smuga, ziarno, winieta, dyst, czas;',
  'varying vec2 vUv;',
  '',
  'float szum(vec2 p){',
  '  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);',
  '}',
  '',
  'void main(){',
  '  vec2 d = vUv - 0.5;',
  '  vec2 c = d * prop;',
  '  float r2 = dot(c, c);',
  '  float r = sqrt(r2);',
  /* DYSTORSJA: beczka. Ułamek procenta — ma być mikroskopijna, jak
     w obiektywie, a nie jak w rybim oku. */
  '  vec2 uv = 0.5 + d * (1.0 + dyst * 0.22 * r2);',
  /* ROZSZCZEPIENIE: człon stały plus rosnący z kwadratem promienia.
     Sam człon kwadratowy dawałby rozjazd dopiero w rogach kadru,
     a kula siedzi w środku — czyli tam, gdzie nie byłoby go widać. */
  '  vec2 kier = r > 0.0001 ? c / r : vec2(0.0);',
  '  vec2 roz = (kier / prop) * aber * (0.004 + 0.055 * r2);',
  '  vec3 kol;',
  '  kol.r = texture2D(tScena, uv + roz).r;',
  '  kol.g = texture2D(tScena, uv).g;',
  '  kol.b = texture2D(tScena, uv - roz).b;',
  '  kol += texture2D(tSmuga, uv).rgb * smuga * 1.7;',
  '  kol *= 1.0 - winieta * smoothstep(0.04, 0.42, r2);',
  /* ZIARNO: mnożące na całości plus śladowa domieszka dodawana TAM,
     GDZIE JUŻ COŚ ŚWIECI. Samo mnożenie na czerni jest niewidzialne,
     a samo dodawanie narysowałoby prostokąt płótna. */
  '  float g = szum(floor(vUv * 940.0) + vec2(czas, czas * 1.7)) - 0.5;',
  '  float jasn = max(max(kol.r, kol.g), kol.b);',
  '  kol *= 1.0 + g * ziarno * 0.85;',
  '  kol += g * ziarno * 0.10 * smoothstep(0.004, 0.09, jasn);',
  /* ALFA ZERO. Płótno składa się ze stroną premultiplied, a poświata leży
     POD nim w zwykłym divie — każda alfa większa od zera zaczęłaby ją
     zjadać. Quad ma przy tym NoBlending, bo przy zwykłym mieszaniu alfa
     zero znaczy "nie rysuj nic" i ekran zostałby czarny. */
  '  gl_FragColor = vec4(max(kol, 0.0), 0.0);',
  '}'
].join('\n');

/* Jedno wywołanie = jedna kula na jednym <canvas>. Znak tekstowy (mark)
   i duża kula w .face są WIDZAMI tego samego stanu, nie osobnymi źródłami
   prawdy — stąd ten sam SOMI_MOOD/PULSE rusza je oba (patrz `moodOrbs.forEach`
   niżej). Kula w pasku (navOrb) jest z tego celowo WYŁĄCZONA (19.09, maisa:
   "niech ona jest statyczna, obraca sie spokojnie, nic wiecej") — dostaje
   własny, martwy profil `static` i nigdy nie zmienia nastroju. */
function makeOrb(canvas, baseSpin, N, glowEl, glowStrength, kamera, ziarnoBazowe, initMood){
  glowStrength = glowStrength == null ? 0.8 : glowStrength;
  kamera = kamera == null ? ORB_FRAME.mala.kamera : kamera;
  /* Kula w pasku (initMood='static') ma TYLKO rotowac — patrz MOOD_PARAMS.static.
     Ale przechylenie ponizej i precesja pierscieni (szukaj `esStatic` nizej) sa
     TWARDO wpisane w petle, poza systemem MOOD_PARAMS — zaden zestaw wartosci
     stanu ich nie wylaczy. To byla prawdziwa przyczyna "ekspresji" zgloszonej
     20.09 (kula kiwa sie i patrzy na boki mimo profilu static), nie brakujacy
     parametr w MOOD_PARAMS. */
  var esStatic = (initMood === 'static');
  if(!canvas) return null;
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  } catch(e) { return null; }  // brak WebGL na TEJ karcie — inne (jeśli są) i tak działają

  /* Od M2.1 zrodlem prawdy o rozmiarze jest SLOT, nie atrybuty plotna: bufor
     dostaje tyle pikseli, ile plotno zajmuje na ekranie (razy devicePixelRatio).
     `updateStyle=false` zostaje, bo szerokosc w CSS jest `auto` i sama idzie za
     proporcja bufora — nie ma czego nadpisywac. */
  var PROP = ORB_FRAME.pasek.prop;
  var Hc = wysokoscSlotu(canvas), Wc = Math.round(Hc * PROP);
  var doSceny = kamera / (Hc * 0.5);   /* 1 px ekranu = tyle jednostek sceny */
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(Wc, Hc, false);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, PROP, 0.1, 14);
  camera.position.z = kamera;   /* patrz ORB_FRAME: wysokość bufora i ta odległość idą w parze */
  var expo = ekspozycja(N);                   /* gestosc chmury — dotyczy tez wlokien */
  var expoPunkt = expo * ORB_PUNKT.jasnosc;   /* + tlumienie za urosniety punkt (M2.1) */
  var rnd = zZiarna(ziarnoBazowe);

  /* group — rdzeń, halo, włókna, jądro, skan: to, co ŻYJE.
     rama  — klatka i odłamki: to, co jest MECHANICZNE i idzie PRZECIWNIE. */
  var group = new THREE.Group();
  var rama  = new THREE.Group();
  scene.add(group, rama);

  var dirs = fibonacciSphere(N);
  rozstrojSiatke(dirs, N, rnd);
  var puff = addPuff(dirs, N, ORB_CLOUD.kopce, ORB_CLOUD.sigma, ORB_CLOUD.amp, rnd);
  var phase = new Float32Array(N);
  var kick  = new Float32Array(N);
  for(var i = 0; i < N; i++){
    phase[i] = rnd() * Math.PI * 2;
    /* własna siła odrzutu na punkt — rozpad ma być rozsypaniem,
       a nie równym napompowaniem całej kuli */
    kick[i] = 0.25 + rnd() * 0.95;
  }

  /* GŁĘBIA i PRZEPALENIE siedzą w kolorze na wierzchołek: material.color
     zostaje BIAŁY, a prawdziwy kolor stanu wjeżdża atrybutem 'color'.
     Jeden kanał robi wtedy trzy rzeczy naraz — przyciemnia punkty z drugiej
     strony kuli, rozpala środek do bieli i podświetla pas skanu — bez
     własnego shadera i bez drugiego przebiegu renderowania. */
  var coreGeo = new THREE.BufferGeometry();
  coreGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage));
  coreGeo.setAttribute('color',    new THREE.BufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage));
  var coreMat = new THREE.PointsMaterial(zMieszaniem({ map: dotTexture, color: 0xffffff, vertexColors: true, size: ORB_PUNKT.rdzen * doSceny, transparent: true, depthWrite: false, sizeAttenuation: true }));
  var core = new THREE.Points(coreGeo, coreMat);
  core.frustumCulled = false;

  var haloGeo = new THREE.BufferGeometry();
  haloGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage));
  haloGeo.setAttribute('color',    new THREE.BufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage));
  var haloMat = new THREE.PointsMaterial(zMieszaniem({ map: dotTexture, color: 0xffffff, vertexColors: true, size: ORB_PUNKT.halo * doSceny, transparent: true, depthWrite: false, sizeAttenuation: true }));
  var halo = new THREE.Points(haloGeo, haloMat);
  halo.frustumCulled = false;
  group.add(core, halo);

  /* PRZEPALENIE — DWIE kropki, nie jedna. Jedna nie umie być naraz biała
     w środku i miękka na brzegu: przy jednej trzeba wybrać między "biały
     żar" a "delikatna poświata", a kompromis dawał matową szarą kulkę.
       ZAR   — mała i JASNA, prawie biała: to jest prześwietlone jądro;
       ISKRA — duża i ciemna, sama poświata dookoła żaru. */
  var zarMat   = new THREE.PointsMaterial(zMieszaniem({ map: dotTexture,   color: 0x000000, size: ORB_PUNKT.zarBaza * doSceny, transparent: true, depthWrite: false, sizeAttenuation: true }));
  var iskraMat = new THREE.PointsMaterial(zMieszaniem({ map: jadroTexture, color: 0x000000, size: ORB_PUNKT.iskraBaza * doSceny, transparent: true, depthWrite: false, sizeAttenuation: true }));
  var zGeo = new THREE.BufferGeometry();
  zGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
  var zar = new THREE.Points(zGeo, zarMat); zar.frustumCulled = false;
  var iGeo = new THREE.BufferGeometry();
  iGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
  var iskra = new THREE.Points(iGeo, iskraMat); iskra.frustumCulled = false;
  group.add(iskra, zar);

  /* SKAN — jedna obręcz na płaszczyźnie przelotu. Jednolita jasność, więc
     nie potrzebuje koloru na wierzchołek: cała jest "światłem", nie bryłą. */
  var skanMat = new THREE.LineBasicMaterial(zMieszaniem({ color: 0x000000, transparent: true, depthWrite: false }));
  var seg = 128, spos = new Float32Array(seg*3);
  for(i = 0; i < seg; i++){
    var sa = i / seg * Math.PI * 2;
    spos[i*3] = Math.cos(sa); spos[i*3+1] = 0; spos[i*3+2] = Math.sin(sa);
  }
  var sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(spos, 3));
  var skanRing = new THREE.LineLoop(sGeo, skanMat);
  skanRing.frustumCulled = false;
  group.add(skanRing);

  /* WŁÓKNA. linewidth w WebGL nie działa — linia zawsze ma 1 px, cokolwiek
     się ustawi. Grubość robimy KILKOMA LINIAMI OBOK SIEBIE, nie rurką:
     włókna pulsują długością co klatkę, a rurka wymagałaby przebudowy
     geometrii przy KAŻDEJ klatce. */
  var wloknoMat = new THREE.LineBasicMaterial(zMieszaniem({ vertexColors: true, transparent: true, depthWrite: false }));
  var fibN = ileWarstwy(ORB_LAYERS.fibers, N);
  var fibLay = Math.max(1, ORB_LAYERS.lines);
  var fibIdx, fibLen, fibPX, fibPY, fibPZ, wlokno = null;
  if(fibN > 0){
    fibIdx = new Int32Array(fibN); fibLen = new Float32Array(fibN);
    fibPX = new Float32Array(fibN); fibPY = new Float32Array(fibN); fibPZ = new Float32Array(fibN);
    for(i = 0; i < fibN; i++){
      /* Kolejność ZŁOTA, nie zwykły prefiks: w ciągu Fibonacciego y leci
         monotonicznie od bieguna do bieguna, więc pierwsze k indeksów
         siedziałoby w jednej czapce i kula byłaby najeżona tylko od góry. */
      fibIdx[i] = Math.min(N - 1, Math.floor(((i * 0.61803398875) % 1) * N));
      fibLen[i] = 0.35 + rnd() * 0.75;
      var id0 = fibIdx[i];
      var fdx = dirs[id0*3], fdy = dirs[id0*3+1], fdz = dirs[id0*3+2];
      var px0, py0, pz0;
      if(Math.abs(fdy) < 0.9){ px0 = -fdz; py0 = 0;   pz0 = fdx; }
      else                   { px0 = 0;    py0 = fdz; pz0 = -fdy; }
      var pl0 = Math.sqrt(px0*px0 + py0*py0 + pz0*pz0) || 1;
      fibPX[i] = px0/pl0; fibPY[i] = py0/pl0; fibPZ[i] = pz0/pl0;
    }
    /* CZTERY wierzchołki na warstwę, nie dwa: włókno to DWA odcinki,
       ciemny-jasny i jasny-ciemny. Przy jednym odcinku najjaśniejszy koniec
       wypadał tam, gdzie zbiegają się wszystkie włókna naraz, i sto
       kilkadziesiąt jasnych końców składało się w twardą białą kulkę. */
    var wierz = fibN * fibLay * 4;
    var fGeo = new THREE.BufferGeometry();
    fGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(wierz*3), 3).setUsage(THREE.DynamicDrawUsage));
    fGeo.setAttribute('color',    new THREE.BufferAttribute(new Float32Array(wierz*3), 3).setUsage(THREE.DynamicDrawUsage));
    wlokno = new THREE.LineSegments(fGeo, wloknoMat);
    wlokno.frustumCulled = false;
    group.add(wlokno);
  }

  /* KLATKA. Przechyły STAŁE, nie losowe: klatka ma być tym samym przyrządem
     po każdym przeładowaniu — w przeciwieństwie do chmury, którą się losuje. */
  var ramaMat = new THREE.LineBasicMaterial(zMieszaniem({ vertexColors: true, transparent: true, depthWrite: false }));
  var PRZECHYL = [[0.30, 0.00, 0.18], [1.34, 0.42, -0.24], [0.72, 1.15, 0.55], [-0.48, 0.66, 0.95]];
  var PIERSCIENIE = [];
  var rseg = 192;
  for(i = 0; i < ORB_LAYERS.rings; i++){
    var rr = 1.20 + i * 0.115;
    var rpos = new Float32Array(rseg*3);
    for(var k0 = 0; k0 < rseg; k0++){
      var ka = k0 / rseg * Math.PI * 2;
      rpos[k0*3] = Math.cos(ka) * rr; rpos[k0*3+1] = Math.sin(ka) * rr; rpos[k0*3+2] = 0;
    }
    var rGeo = new THREE.BufferGeometry();
    rGeo.setAttribute('position', new THREE.BufferAttribute(rpos, 3));
    rGeo.setAttribute('color',    new THREE.BufferAttribute(new Float32Array(rseg*3), 3).setUsage(THREE.DynamicDrawUsage));
    var L = new THREE.LineLoop(rGeo, ramaMat);
    var t0 = PRZECHYL[i % PRZECHYL.length];
    L.rotation.set(t0[0], t0[1], t0[2]);
    L.userData = {r: rr, bx: t0[0], by: t0[1], bz: t0[2],
                  tempo: 0.5 + i*0.31, dim: 1 - i*0.16, seg: rseg, luki: 2 + i};
    L.frustumCulled = false;
    rama.add(L);
    PIERSCIENIE.push(L);
  }

  /* ODŁAMKI — drobiny na własnych, pochylonych orbitach poza chmurą.
     Każdy dostaje gotową bazę ortonormalną swojej orbity; liczenie jej
     co klatkę byłoby marnotrawstwem. */
  var odlamkiMat = new THREE.PointsMaterial(zMieszaniem({ map: dotTexture, color: 0xffffff, vertexColors: true, size: ORB_PUNKT.odlamek * doSceny, transparent: true, depthWrite: false, sizeAttenuation: true }));
  var odlN = ileWarstwy(ORB_LAYERS.debris, N);
  var odlU, odlV, odlR, odlW, odlF, odlamki = null;
  if(odlN > 0){
    odlU = new Float32Array(odlN*3); odlV = new Float32Array(odlN*3);
    odlR = new Float32Array(odlN); odlW = new Float32Array(odlN); odlF = new Float32Array(odlN);
    for(i = 0; i < odlN; i++){
      var nx = rnd()*2-1, ny = rnd()*2-1, nz = rnd()*2-1;
      var nl = Math.sqrt(nx*nx+ny*ny+nz*nz) || 1;
      nx/=nl; ny/=nl; nz/=nl;
      var ux, uy, uz;
      if(Math.abs(ny) < 0.9){ ux = -nz; uy = 0; uz = nx; }
      else                  { ux = 0;   uy = nz; uz = -ny; }
      var ul = Math.sqrt(ux*ux+uy*uy+uz*uz) || 1;
      ux/=ul; uy/=ul; uz/=ul;
      var vx = ny*uz - nz*uy, vy = nz*ux - nx*uz, vz = nx*uy - ny*ux;
      odlU[i*3]=ux; odlU[i*3+1]=uy; odlU[i*3+2]=uz;
      odlV[i*3]=vx; odlV[i*3+1]=vy; odlV[i*3+2]=vz;
      odlR[i] = 1.26 + rnd() * 0.72;
      odlW[i] = (0.10 + rnd() * 0.26) * (rnd() < 0.35 ? -1 : 1);
      odlF[i] = rnd() * Math.PI * 2;
    }
    var oGeo = new THREE.BufferGeometry();
    oGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(odlN*3), 3).setUsage(THREE.DynamicDrawUsage));
    oGeo.setAttribute('color',    new THREE.BufferAttribute(new Float32Array(odlN*3), 3).setUsage(THREE.DynamicDrawUsage));
    odlamki = new THREE.Points(oGeo, odlamkiMat);
    odlamki.frustumCulled = false;
    rama.add(odlamki);
  }

  /* ---------- OPTYKA: trzy przebiegi zamiast jednego ----------
     scena → BUFOR, bufor → BUFOR SMUGI (próg jasności + poziome rozmycie),
     bufor + smuga → PŁÓTNO przez shader składający. Ręcznie, bo vendor
     three.min.js to r128 bez EffectComposer.

     Bufor sceny bez filtrowania (NearestFilter) — shader czyta go spod
     dystorsji i spod rozjazdu kanałów, czyli prawie nigdy dokładnie
     w środku piksela; przy filtrowaniu dwuliniowym każdy piksel wychodziłby
     ze średniej sąsiadów i cała kula robiłaby się miękka. */
  var PR = renderer.getPixelRatio();
  var BW = Math.max(1, Math.round(Wc * PR)), BH = Math.max(1, Math.round(Hc * PR));
  var rtScena = new THREE.WebGLRenderTarget(BW, BH, {
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat, type: THREE.UnsignedByteType, stencilBuffer: false
  });
  var rtSmuga = new THREE.WebGLRenderTarget(Math.max(1, Math.round(BW/4)), Math.max(1, Math.round(BH/4)), {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
    stencilBuffer: false, depthBuffer: false
  });
  var kameraPlaska = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  var quadGeo = new THREE.PlaneGeometry(2, 2);
  var matSmuga = new THREE.ShaderMaterial({
    uniforms: {tScena:{value: rtScena.texture}, krok:{value: new THREE.Vector2(0.009, 0.0)},
               prog:{value: ORB_OPTICS.threshold}},
    vertexShader: VS_QUAD, fragmentShader: FS_SMUGA,
    depthTest: false, depthWrite: false, blending: THREE.NoBlending
  });
  var matSklad = new THREE.ShaderMaterial({
    uniforms: {
      tScena:{value: rtScena.texture}, tSmuga:{value: rtSmuga.texture},
      /* Ksztalt kadru jest staly (322:205), wiec ta para nie zalezy od tego,
         ile pikseli ma akurat bufor — przy zmianie rozmiaru nie ma jej co ruszac. */
      prop:{value: new THREE.Vector2(PROP, 1)},
      aber:{value: ORB_OPTICS.aberration}, smuga:{value: ORB_OPTICS.streak},
      ziarno:{value: ORB_OPTICS.grain}, winieta:{value: ORB_OPTICS.vignette},
      dyst:{value: ORB_OPTICS.distortion}, czas:{value: 0}
    },
    vertexShader: VS_QUAD, fragmentShader: FS_SKLAD,
    depthTest: false, depthWrite: false, blending: THREE.NoBlending
  });
  var scenaSmugi = new THREE.Scene(); scenaSmugi.add(new THREE.Mesh(quadGeo, matSmuga));
  var scenaSkladu = new THREE.Scene(); scenaSkladu.add(new THREE.Mesh(quadGeo, matSklad));

  /* ---------- ZMIANA ROZMIARU (M2.1) ----------
     Skoro bufor ma byc rozmiaru wyswietlania, musi za nim nadazac. Zmienia sie
     w trzech sytuacjach i wszystkie trzy przechodza przez ten sam prostokat:
     pasek kurczy sie po przewinieciu (52 → 44 px), przy 640 px slot schodzi do
     44 px, a przy przeniesieniu okna na inny monitor zmienia sie
     devicePixelRatio. ResizeObserver lapie dwie pierwsze i moment, w ktorym
     slot w ogole sie odslania; trzecia dokladamy nasluchem na `resize`.
     Kamera i proporcja sie NIE zmieniaja: kadr zostaje ten sam, zmienia sie
     tylko liczba pikseli, ktora go opisuje — dlatego kula po przewinieciu
     robi sie mniejsza dokladnie tak, jak maleje pasek.
     Warunek na wejsciu jest istotny: bez niego kazde tykniecie obserwatora
     kasowaloby i tworzylo od nowa dwa cele renderowania. */
  function dopasujPlotno(){
    var h = wysokoscSlotu(canvas);
    var pr = Math.min(devicePixelRatio || 1, 2);
    var w = Math.round(h * PROP);
    if(h === Hc && w === Wc && pr === renderer.getPixelRatio()) return;
    Hc = h; Wc = w; doSceny = kamera / (Hc * 0.5);
    renderer.setPixelRatio(pr);
    renderer.setSize(Wc, Hc, false);
    BW = Math.max(1, Math.round(Wc * pr)); BH = Math.max(1, Math.round(Hc * pr));
    rtScena.setSize(BW, BH);
    rtSmuga.setSize(Math.max(1, Math.round(BW / 4)), Math.max(1, Math.round(BH / 4)));
    /* Rozmiary punktow ida za `doSceny` w petli; tu tylko odlamki, ktore
       maja staly rozmiar i inaczej zostalyby przy poprzedniej skali. */
    odlamkiMat.size = ORB_PUNKT.odlamek * doSceny;
  }
  if(typeof ResizeObserver === 'function'){
    new ResizeObserver(dopasujPlotno).observe(canvas.parentNode || canvas);
  }
  addEventListener('resize', dopasujPlotno);

  /* ---------- stan ---------- */
  var spin = baseSpin;
  var stanCel = MOOD_PARAMS.calm;                                 /* dokąd stan zmierza */
  var biezace = {};                                               /* gdzie jest teraz */
  for(i = 0; i < MOOD_KEYS.length; i++) biezace[MOOD_KEYS[i]] = MOOD_PARAMS.calm[MOOD_KEYS[i]];
  var kolorTeraz = accent.clone(), kolorCel = accent.clone();
  var flara = 0;                                                  /* obwiednia rozbłysku, 1 → 0 */
  var skanPoz = -1.2, autoRotY = 0, ramaRotY = 0;
  var userRotX = 0, userRotY = 0, glowOstatnie = -1, klatkaNr = 0;
  var SKALA = new THREE.Vector3();

  var corePos = coreGeo.attributes.position.array, coreCol = coreGeo.attributes.color.array;
  var haloPos = haloGeo.attributes.position.array, haloCol = haloGeo.attributes.color.array;

  /* Dwa drobiazgi do włókien — wpis pary wierzchołków i pary kolorów.
     Osobno tylko po to, żeby pętla po włóknach dała się przeczytać. */
  function ustawWlokno(a, v, dx, dy, dz, rA, rB, ox, oy, oz){
    a[v*3]     = dx*rA + ox; a[v*3+1]     = dy*rA + oy; a[v*3+2]     = dz*rA + oz;
    a[(v+1)*3] = dx*rB + ox; a[(v+1)*3+1] = dy*rB + oy; a[(v+1)*3+2] = dz*rB + oz;
  }
  function ustawKolor(a, v, r1, g1, b1, r2, g2, b2){
    a[v*3]     = r1; a[v*3+1]     = g1; a[v*3+2]     = b1;
    a[(v+1)*3] = r2; a[(v+1)*3+1] = g2; a[(v+1)*3+2] = b2;
  }

  /* PAUZA/WZNOWIENIE (18.09) — druga kula (sekcja SOMI) nie moze chodzic caly
     czas: zasada 4 planu ("najwyzej dwie pracujace petle animacji") juz jest
     wyczerpana przez mape czastek + ta kule w pasku. `aktywna` domyslnie true,
     wiec pasek dziala DOKLADNIE jak przedtem — pauza wchodzi z zewnatrz, tylko
     dla instancji, ktora tego potrzebuje (patrz IntersectionObserver nizej). */
  var aktywna = true;
  var rysuj = function animate(){
    if(!aktywna) return;
    requestAnimationFrame(animate);
    var t = performance.now();
    var i, k;
    klatkaNr++;

    /* --- 0. PRZEJŚCIE: stan się przelewa, nie przeskakuje ----------------
       Każdy parametr dochodzi do celu wykładniczo. Dzięki temu wejście
       w "błąd" nie zatrzymuje obrotu w jednej klatce, tylko go hamuje,
       a kolor przechodzi przez pośrednie barwy zamiast strzelić. */
    var pk = ORB_MOTION.ease;
    for(i = 0; i < MOOD_KEYS.length; i++){
      k = MOOD_KEYS[i];
      biezace[k] += (stanCel[k] - biezace[k]) * pk;
    }
    kolorTeraz.lerp(kolorCel, pk);
    spin = biezace.spin * baseSpin;
    coreMat.size = ORB_PUNKT.rdzen * doSceny * biezace.size;
    haloMat.size = ORB_PUNKT.halo  * doSceny * biezace.size;
    if(glowEl && Math.abs(biezace.glow - glowOstatnie) > 0.005){
      glowOstatnie = biezace.glow;
      glowEl.style.opacity = String(biezace.glow * glowStrength);
    }

    flara *= 0.945;                      /* obwiednia rozbłysku, ~0,9 s do zera */
    if(flara < 0.002) flara = 0;

    var freq = t * 0.001 * biezace.breathFreq;
    var glebia = ORB_LAYERS.depth;
    var burn = Math.min(1, biezace.burn * (1 + 0.25 * flara));   /* 0,7 do 11.09 */
    var br = kolorTeraz.r, bg = kolorTeraz.g, bb = kolorTeraz.b;
    var rdzenKr = KRYCIE.rdzen * expoPunkt;
    var krycieH = krycieHalo(biezace.glow) * expoPunkt;
    var rozpad = ORB_MOTION.burst * flara;
    var turbo = ORB_MOTION.turbulence * 0.045;
    var falaAmp = biezace.wave * 0.085;
    var falaFaza = t * 0.0022;
    var skan = biezace.scan;

    /* SKAN — płaszczyzna przelatuje przez kulę od bieguna do bieguna.
       Tempo STAŁE, niezależne od siły: suwak decyduje, jak mocno widać
       przelot, a nie jak szybko. Inaczej "mniej skanu" znaczyłoby
       "wolniejszy skan", co jest zupełnie inną informacją. */
    skanPoz = -1.18 + 2.36 * ((t * 0.000225) % 1);
    var skanSzer = 0.085, skanInv = 1 / skanSzer;

    /* --- 1. transformacje PRZED pętlą po punktach ------------------------
       Głębia liczy się z macierzy świata, więc obrót musi być już ustawiony
       i przeliczony, ZANIM policzymy, który punkt jest z przodu. */
    autoRotY += spin;
    /* KONTR-ROTACJA: klatka idzie w DRUGĄ stronę i wolniej. Dwa obiekty
       w tym samym tempie czyta się jako jeden; przeciwne kierunki czyta
       się jako dwa niezależne mechanizmy — i o to chodzi. */
    ramaRotY -= spin * 0.26;
    group.rotation.y = autoRotY + userRotY;
    /* esStatic: kula w pasku ma tylko rotowac wokol Y (spin), bez kiwania
       glowa po X — to kiwanie bylo zaszyte tu na sztywno, poza MOOD_PARAMS. */
    group.rotation.x = esStatic ? userRotX : (Math.sin(t / 4000) * 0.15 + userRotX);
    var cel = 1 + 0.05 * flara;   /* skok skali przy rozbłysku — 0,16 do 11.09 */
    group.scale.lerp(SKALA.set(cel, cel, cel), 0.22);
    rama.rotation.y = ramaRotY + userRotY * 0.6;
    rama.rotation.x = group.rotation.x * 0.45;
    rama.scale.copy(group.scale);
    var ri, R;
    for(ri = 0; ri < PIERSCIENIE.length; ri++){
      R = PIERSCIENIE[ri];
      /* PRECESJA: oś pierścienia wędruje sama, powoli, każdy w swoim tempie —
         stąd wrażenie żyroskopu zamiast obręczy przyklejonej do kuli.
         esStatic: zostaje sam obrót Y (spin), osie X/Z stoją — inaczej kula
         "static" dalej by żyła przez same pierścienie. */
      R.rotation.y = R.userData.by + ramaRotY * R.userData.tempo;
      R.rotation.x = esStatic ? R.userData.bx : (R.userData.bx + Math.sin(t * 0.00012 * R.userData.tempo) * 0.20);
      R.rotation.z = esStatic ? R.userData.bz : (R.userData.bz + Math.cos(t * 0.00009 * R.userData.tempo + ri) * 0.16);
    }
    scene.updateMatrixWorld(true);

    var e = group.matrixWorld.elements;
    var sk = group.scale.x || 1;
    /* trzeci wiersz macierzy obrotu — rzut kierunku na oś kamery */
    var m0 = e[2]/sk, m1 = e[6]/sk, m2 = e[10]/sk;

    /* --- 2. rdzeń + halo -------------------------------------------------
       Jedna pętla liczy wszystko, co dotyczy punktu: oddech, falę, dryf,
       rozpad, głębię, przepalenie i pas skanu. Rozbicie tego na osobne
       przebiegi znaczyłoby czytanie tych samych pozycji kilka razy. */
    for(i = 0; i < N; i++){
      var dx = dirs[i*3], dy = dirs[i*3+1], dz = dirs[i*3+2];
      var f = phase[i];
      var r = (1 + puff[i]) * (1 + biezace.breathAmp * Math.sin(freq + f));
      /* FALA — spójna, biegnie wzdłuż osi Y bryły, nie ma własnej fazy
         na punkt; to jest różnica między falą a oddechem */
      r *= 1 + falaAmp * Math.sin(dy * 3.4 - falaFaza);
      /* TURBULENCJA — dwa sinusy o niewspółmiernych okresach, więc dryf
         nie zapętla się na oko; to jest ta "żywa" połowa charakteru */
      r *= 1 + turbo * Math.sin(t*0.00047 + f*3.1) * Math.sin(t*0.00031 + f*1.7);
      /* ROZPAD — odrzut z własną siłą na punkt, gaśnie z obwiednią rozbłysku */
      r *= 1 + rozpad * kick[i];
      /* pas skanu: kwadratowy garb zamiast wykładnika — tysiąc kilkaset razy
         na klatkę exp() kosztuje realnie, a różnicy w kształcie nie widać */
      var sd = (dy - skanPoz) * skanInv;
      var sb = sd*sd < 1 ? skan * (1 - sd*sd) : 0;
      r *= 1 + sb * 0.035;

      corePos[i*3] = dx*r; corePos[i*3+1] = dy*r; corePos[i*3+2] = dz*r;
      var rh = r * 1.06;
      haloPos[i*3] = dx*rh; haloPos[i*3+1] = dy*rh; haloPos[i*3+2] = dz*rh;

      var zs = m0*dx + m1*dy + m2*dz;          /* +1 = przód, -1 = tył */
      var cien = (1 - glebia * (1 - (zs*0.5 + 0.5))) * (1 + sb * 1.7);
      var b = burn * gladko(0.66, 1.0, zs);    /* przepalenie tylko w samym środku tarczy;
                                                  szerzej — i kolor stanu bieleje na całej kuli */
      var jb = 1 - b;
      var kr = br*cien*jb + b, kg = bg*cien*jb + b, kb = bb*cien*jb + b;
      coreCol[i*3] = kr*rdzenKr; coreCol[i*3+1] = kg*rdzenKr; coreCol[i*3+2] = kb*rdzenKr;
      haloCol[i*3] = kr*krycieH; haloCol[i*3+1] = kg*krycieH; haloCol[i*3+2] = kb*krycieH;
    }
    coreGeo.attributes.position.needsUpdate = true;
    coreGeo.attributes.color.needsUpdate = true;
    haloGeo.attributes.position.needsUpdate = true;
    haloGeo.attributes.color.needsUpdate = true;

    /* --- 3. włókna ------------------------------------------------------- */
    if(wlokno && fibN){
      var fp = wlokno.geometry.attributes.position.array;
      var fc = wlokno.geometry.attributes.color.array;
      /* gęstość to naprawdę LICZBA rysowanych włókien, nie sama jasność */
      var widoczne = Math.round(fibN * biezace.fibers);
      wlokno.geometry.setDrawRange(0, widoczne * fibLay * 4);
      var jasBaza = (0.55 + 0.45 * biezace.fibers) * KRYCIE.wlokno * (0.55 + 0.45 * expo);
      for(var fi = 0; fi < widoczne; fi++){
        var id = fibIdx[fi];
        var wx = dirs[id*3], wy = dirs[id*3+1], wz = dirs[id*3+2];
        var wf = phase[id];
        /* ta sama faza co punkt źródłowy — włókno oddycha razem z chmurą */
        var puls = 1 + biezace.breathAmp * Math.sin(freq + wf);
        puls *= 1 + falaAmp * Math.sin(wy * 3.4 - falaFaza);
        puls *= 1 + rozpad * kick[id];
        var wsd = (wy - skanPoz) * skanInv;
        var wsb = wsd*wsd < 1 ? skan * (1 - wsd*wsd) : 0;
        var rOut = (1 + puff[id]) * puls * (1 + fibLen[fi] * ORB_LAYERS.reach * (0.78 + 0.22 * Math.sin(freq * 1.3 + wf)) + wsb * 0.22);
        var rIn = 0.12, rMid = rIn + (rOut - rIn) * 0.40;

        var wzs = m0*wx + m1*wy + m2*wz;
        var wcien = (1 - glebia * (1 - (wzs*0.5 + 0.5))) * (1 + wsb * 1.4);
        var wb = burn * gladko(0.55, 1.0, wzs), wjb = 1 - wb;
        var inR = (br*wcien*wjb + wb) * jasBaza;
        var inG = (bg*wcien*wjb + wb) * jasBaza;
        var inB = (bb*wcien*wjb + wb) * jasBaza;

        for(var j = 0; j < fibLay; j++){
          var lw = 1 - Math.abs(j - (fibLay - 1) / 2) * 0.34;
          var off = (j - (fibLay - 1) / 2) * 0.009;
          var ox = fibPX[fi]*off, oy = fibPY[fi]*off, oz = fibPZ[fi]*off;
          var v = (fi * fibLay + j) * 4;
          /* odcinek 1: zbieg → trzon, odcinek 2: trzon → koniec.
             Jasność siedzi w trzonie; miejsce zbiegu i sam czubek gasną. */
          ustawWlokno(fp, v,     wx, wy, wz, rIn,  rMid, ox, oy, oz);
          ustawWlokno(fp, v + 2, wx, wy, wz, rMid, rOut, ox, oy, oz);
          var jS = lw, jZ = lw * 0.08, jK = lw * 0.14;
          ustawKolor(fc, v,     inR*jZ, inG*jZ, inB*jZ, inR*jS, inG*jS, inB*jS);
          ustawKolor(fc, v + 2, inR*jS, inG*jS, inB*jS, inR*jK, inG*jK, inB*jK);
        }
      }
      wlokno.geometry.attributes.position.needsUpdate = true;
      wlokno.geometry.attributes.color.needsUpdate = true;
    }

    /* --- 4. klatka: łuki, znaczniki, głębia -------------------------------
       Łuk robimy MASKĄ NA KOLORZE, nie krótszą geometrią: wtedy długość łuku
       działa na żywo i nie trzeba przebudowywać pierścieni, a szczelina może
       wędrować dookoła obręczy. */
    var luk = ORB_LAYERS.arc;
    for(ri = 0; ri < PIERSCIENIE.length; ri++){
      var P = PIERSCIENIE[ri];
      var pe = P.matrixWorld.elements;
      var ps = (rama.scale.x || 1) * P.userData.r;
      var rp = P.geometry.attributes.position.array;
      var rc = P.geometry.attributes.color.array;
      var jas = biezace.frame * P.userData.dim * KRYCIE.klatka;
      var pseg = P.userData.seg, luki = P.userData.luki;
      var przesuw = ramaRotY * (0.6 + ri * 0.35);
      for(var k2 = 0; k2 < pseg; k2++){
        var vx = rp[k2*3], vy = rp[k2*3+1], vz = rp[k2*3+2];
        var rzs = (pe[2]*vx + pe[6]*vy + pe[10]*vz) / ps;
        var u = (k2 / pseg * luki + przesuw) % 1;
        if(u < 0) u += 1;
        var maska = u < luk ? Math.min(gladko(0, 0.05, u), gladko(0, 0.05, luk - u)) : 0;
        /* ZNACZNIKI — co dwunasty wierzchołek jaśniej. Podziałka przyrządu,
           nie ozdoba: pokazuje, jak szybko obręcz się kręci. */
        if(k2 % 12 === 0) maska *= 2.6;
        var rcien = (1 - glebia * (1 - (rzs*0.5 + 0.5))) * jas * maska;
        rc[k2*3] = br*rcien; rc[k2*3+1] = bg*rcien; rc[k2*3+2] = bb*rcien;
      }
      P.geometry.attributes.color.needsUpdate = true;
    }

    /* --- 5. odłamki ------------------------------------------------------- */
    if(odlamki && odlN){
      var op = odlamki.geometry.attributes.position.array;
      var oc = odlamki.geometry.attributes.color.array;
      var re = rama.matrixWorld.elements;
      var rs = rama.scale.x || 1;
      var n0 = re[2]/rs, n1 = re[6]/rs, n2 = re[10]/rs;
      for(i = 0; i < odlN; i++){
        var a2 = odlF[i] + t * 0.001 * odlW[i];
        var ca = Math.cos(a2), sa2 = Math.sin(a2);
        var RR = odlR[i] * (1 + rozpad * 0.5);
        var px2 = (odlU[i*3]*ca + odlV[i*3]*sa2) * RR;
        var py2 = (odlU[i*3+1]*ca + odlV[i*3+1]*sa2) * RR;
        var pz2 = (odlU[i*3+2]*ca + odlV[i*3+2]*sa2) * RR;
        op[i*3] = px2; op[i*3+1] = py2; op[i*3+2] = pz2;
        var ozs = (n0*px2 + n1*py2 + n2*pz2) / RR;
        var ojas = (1 - glebia * (1 - (ozs*0.5 + 0.5))) * KRYCIE.odlamek *
                   (0.55 + 0.45 * Math.sin(t * 0.0013 + odlF[i] * 4.1)) *
                   (0.35 + 0.65 * biezace.frame) * ORB_PUNKT.jasnosc;
        oc[i*3] = br*ojas; oc[i*3+1] = bg*ojas; oc[i*3+2] = bb*ojas;
      }
      odlamki.geometry.attributes.position.needsUpdate = true;
      odlamki.geometry.attributes.color.needsUpdate = true;
    }

    /* --- 6. obręcz skanu --------------------------------------------------- */
    var promienSkanu = 1.06 - skanPoz * skanPoz;
    if(skan > 0.02 && promienSkanu > 0.001){
      var rr2 = Math.sqrt(promienSkanu);
      skanRing.visible = true;
      skanRing.position.y = skanPoz;
      skanRing.scale.set(rr2, 1, rr2);
      var sj = skan * 0.55 * (0.45 + 0.55 * rr2);
      skanMat.color.setRGB((br + (1-br)*0.45) * sj, (bg + (1-bg)*0.45) * sj, (bb + (1-bb)*0.45) * sj);
    } else {
      skanRing.visible = false;
    }

    /* --- 7. jądro przepalenia ---------------------------------------------- */
    iskraMat.size = (ORB_PUNKT.iskraBaza + burn * ORB_PUNKT.iskraZar) * doSceny;
    var sila = burn * KRYCIE.jadro;
    iskraMat.color.setRGB((br + (1-br)*0.72) * sila, (bg + (1-bg)*0.72) * sila, (bb + (1-bb)*0.72) * sila);
    /* żar: mały, prawie biały i jasny — WARTOŚĆ, nie krycie, decyduje o tym,
       czy środek czyta się jako rozgrzany do białości czy jako szara plama */
    zarMat.size = (ORB_PUNKT.zarBaza + burn * ORB_PUNKT.zarZar) * doSceny;
    var zj = Math.min(1, 0.12 + burn * 0.92);
    zarMat.color.setRGB(br + (1-br)*0.93*zj, bg + (1-bg)*0.93*zj, bb + (1-bb)*0.93*zj);
    /* Podwojne uzycie zj (raz na barwe, raz na wartosc) dawalo przy spokoju
       0,40 * 0,40 = 0,16 bieli, czyli okolo 55/255 dolozonego swiatla w srodku
       kuli, ktora dookola ma juz 90 — jadro gaslo w tle. Mnoznik przywraca mu
       przewage, nie ruszajac ani barwy, ani przebiegu przy zmianie stanu. */
    zarMat.color.multiplyScalar(Math.min(1, zj * ORB_PUNKT.zarJasnosc));

    /* --- 8. przebieg końcowy ---------------------------------------------- */
    if(ORB_OPTICS.on){
      /* Ziarno przeskakuje co klatkę — to jedyny ruch w tej warstwie. */
      matSklad.uniforms.czas.value = (klatkaNr % 101) * 3.71;
      renderer.setRenderTarget(rtScena);
      renderer.render(scene, camera);
      renderer.setRenderTarget(rtSmuga);
      renderer.render(scenaSmugi, kameraPlaska);
      renderer.setRenderTarget(null);
      renderer.render(scenaSkladu, kameraPlaska);
    } else {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    }
  };
  rysuj();

  canvas.hidden = false;

  /* Przeciaganie recznej rotacji (i "szturchniecie" palcem) z terminala tu NIE
     wchodzi: w pasku kula jest wnetrzem <button>, wiec pointerdown na plotnie
     zjadalby klik otwierajacy czat, a obracanie kuli wielkosci 40 px nikomu
     do niczego nie sluzy. Klik obsluguje przycisk, blysk leci przez SOMI_PULSE. */

  /* applyMood ustawia CEL, nie wartość: pętla dociąga do niego wykładniczo
     (patrz PRZEJŚCIE). Z zewnątrz setMood(m) działa dokładnie tak samo jak
     przedtem — zmienia się tylko to, że kula DOCHODZI do nowego stanu przez
     kilkanaście klatek, zamiast wskoczyć w jednej. */
  function applyMood(m, odRazu){
    stanCel = MOOD_PARAMS[m] || MOOD_PARAMS.calm;
    kolorCel.copy(MOOD_COLOR[m] || accent);
    if(odRazu){
      for(var q = 0; q < MOOD_KEYS.length; q++) biezace[MOOD_KEYS[q]] = stanCel[MOOD_KEYS[q]];
      kolorTeraz.copy(kolorCel);
    }
    /* Poświata poza samym WebGL-em — osobny rozmyty <div> pod canvasem
       (patrz .face__glow), nie filtr na samym canvasie (patrz komentarz
       przy .face__stack w CSS — drop-shadow na buforze WebGL potrafiło
       narysować kwadratową ramkę zamiast miękkiej poświaty). */
    if(glowEl){
      glowEl.style.background = 'radial-gradient(circle, #' + kolorCel.getHexString() + ' 0%, transparent 70%)';
    }
  }
  applyMood(initMood || 'calm', true);

  return {
    setMood: function(m){
      applyMood(m);
      /* 'wow' NIE odpala juz flary (11.09): zmiana trasy wolala jedno i drugie
         naraz, wiec rozblysk skladal sie podwojnie. Klikniecie dalej ja odpala
         przez SOMI_PULSE — tam rozblysk jest cala trescią zdarzenia. */
      if(m === 'error') flara = 1;
    },
    flare: function(){ flara = 1; },
    pauza: function(){ aktywna = false; },
    wznow: function(){ if(!aktywna){ aktywna = true; requestAnimationFrame(rysuj); } },
    /* ZMIERZONE (18.09): gdy platno budzi sie nie samo (has-orb juz stoi),
       tylko dlatego, ze OTOCZENIE (trasa SPA, [hidden]) traci display:none
       gdzies wyzej w drzewie, ResizeObserver na canvas.parentNode NIE
       odpala — jego kontrakt patrzy na WLASNY element, a ten w tej chwili
       niczego nie zmienia, zmienia sie przodek. Bufor zostawal wiec na
       zapasowych 82x52 (pasek.bok=52) zamiast prawdziwych ~322x205.
       Wolane recznie z IntersectionObserver nizej, w momencie gdy sekcja
       naprawde wchodzi w kadr — dokladnie wtedy, gdy przodek juz na pewno
       ma display inny niz none. */
    dopasuj: function(){ dopasujPlotno(); }
  };
}

var somiDemoCanvas = document.getElementById('somiDemoOrb');
var somiDemoGlow = document.querySelector('.somi-demo__orb-glow');
var somiDemoOrb;

/* JEDYNA instancja od 22.09 (kulka w pasku/navOrb usunieta na prosbe maisy —
   zostaje tylko ta, sekcja "SOMI z bliska"). Kamera i N wziete WPROST z
   ORB_FRAME.mala ("punkt odniesienia, na stronie nieuzywany" — az do teraz),
   bo to DOKLADNIE ten wariant: kadr 322:205 przy wysokosci bliskiej 205 px,
   dla ktorego 460 punktow i poswiata 0,35 byly juz zmierzone w terminalu
   (mala/pasek boczny), zamiast zgadywac nowe liczby. */
somiDemoOrb = makeOrb(somiDemoCanvas, 0.0022, 460, somiDemoGlow, 0.35, ORB_FRAME.mala.kamera, 20260918);
var orbs = [somiDemoOrb].filter(Boolean);
if(!orbs.length) return;  // brak WebGL — znak tekstowy zostaje jedynym wskaźnikiem

var moodOrbs = orbs;

/* Druga kula NIE moze chodzic caly czas — zasada 4 planu ("najwyzej dwie
   pracujace petle animacji") jest juz wyczerpana przez mape czastek + kule
   w pasku. Startuje zapauzowana i budzi sie tylko, gdy jej sekcja NAPRAWDE
   jest w kadrze (dziala to tez wtedy, gdy trasa "somi" jest schowana —
   [hidden] daje display:none, wiec IntersectionObserver i tak zglosi
   isIntersecting:false, zero dodatkowej logiki na trase). */
if(somiDemoOrb){
  somiDemoOrb.pauza();
  var somiDemoWrap = somiDemoCanvas.closest('.somi-demo__orb-wrap');
  if(somiDemoWrap && !somiDemoCanvas.hidden) somiDemoWrap.classList.add('has-orb');
  if(typeof IntersectionObserver === 'function'){
    new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){ somiDemoOrb.dopasuj(); somiDemoOrb.wznow(); } else somiDemoOrb.pauza();
      });
    }, {threshold: 0.15}).observe(somiDemoCanvas.parentNode);
  } else {
    somiDemoOrb.dopasuj(); somiDemoOrb.wznow();  // brak IntersectionObserver — bezpieczniej wlaczyc niz zgasic na zawsze
  }
}

var realMood = window.SOMI_MOOD;
window.SOMI_MOOD = function(m){
  realMood(m);
  moodOrbs.forEach(function(o){ o.setMood(m); });
};

var realPulse = window.SOMI_PULSE;
window.SOMI_PULSE = function(){
  realPulse();
  moodOrbs.forEach(function(o){ o.flare(); });
};
};
