/* MESHUGA — kot cybersory jako wektor + animacje + cyber-kółka (03.11.2026).
   Użycie:
     const kot = MeshugaKot.mount(el, { ring: true | false });
     kot.squint(true|false)   // mrużenie przy „pisze…” (kółko przyspiesza)
     kot.flash()              // krótki błysk oczu po odpowiedzi
     kot.slucha(true|false)   // słucha mikrofonu (kółko przyspiesza, oczy otwarte)
     kot.setRing(true|false)  // pokazuje albo chowa kółko
     kot.destroy()
     MeshugaKot.setMotion(false)  // wyłącza ruch wszędzie (ustawienie „wyłącz animacje”)
   Ruch tylko przez transform/opacity. Pauza, gdy karta ukryta. reduced-motion = statyczny kot. */
(function (g) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var live = [];
  var motionOn = !(g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var hidden = false;
  var uid = 0;

  /* Sylwetka narysowana z ff-03-kot-wyciety-bez-poswiaty.png (współrzędne obrazu 1000 px). */
  var GLOWA = 'M335 585 C310 640 305 720 330 762 C362 812 440 832 518 832 C600 832 676 812 706 762 C730 720 726 640 700 590 Q672 500 600 478 Q518 455 440 478 Q360 505 335 585 Z';
  var UCHO_L = 'M340 600 L308 525 L331 493 L296 486 L288 446 Q287 434 299 437 L445 480 Q385 520 340 600 Z';
  var UCHO_P = 'M598 480 L740 437 Q753 434 750 447 Q738 528 700 596 Q660 520 598 480 Z';
  var SZYJA = 'M440 800 C426 872 410 980 402 1070 L708 1070 C690 1010 652 962 628 884 L612 800 Z';
  var OKO_L = 'M378 667 Q424 617 471 667 Q424 647 378 667 Z';
  var OKO_P = 'M565 667 Q611 617 658 667 Q611 647 565 667 Z';
  var WASY = [
    'M318 684 Q220 688 135 704', 'M318 704 Q215 730 127 780', 'M322 724 Q262 760 217 815',
    'M720 657 Q810 656 898 670', 'M720 683 Q800 700 880 727', 'M720 703 Q820 742 900 826'
  ];

  function catSVG() {
    var id = 'mk' + (++uid);
    var wasy = WASY.map(function (d) { return '<path d="' + d + '"/>'; }).join('');
    return '' +
      '<svg class="mk-kot" viewBox="236 410 568 520" aria-hidden="true" focusable="false">' +
      '<defs><clipPath id="' + id + 'c"><rect x="236" y="410" width="568" height="520"/></clipPath></defs>' +
      '<g clip-path="url(#' + id + 'c)">' +
      /* obrys kość: kot nie znika na ink */
      '<g class="mk-obrys" fill="none" stroke-width="16" stroke-linejoin="round">' +
        '<path d="' + SZYJA + '"/><path d="' + GLOWA + '"/>' +
        '<path d="' + UCHO_L + '"/><path class="mk-ucho-p" d="' + UCHO_P + '"/>' +
      '</g>' +
      '<g class="mk-wasy" fill="none" stroke-width="4" stroke-linecap="round">' + wasy + '</g>' +
      '<g class="mk-futro">' +
        '<path d="' + SZYJA + '"/><path d="' + UCHO_L + '"/>' +
        '<path class="mk-ucho-p" d="' + UCHO_P + '"/><path d="' + GLOWA + '"/>' +
      '</g>' +
      '<g class="mk-oczy">' +
        '<path class="mk-oko" d="' + OKO_L + '"/><path class="mk-oko" d="' + OKO_P + '"/>' +
        '<g class="mk-blysk"><path d="' + OKO_L + '"/><path d="' + OKO_P + '"/></g>' +
      '</g>' +
      '</g></svg>';
  }

  /* --- cyber-kółko (viewBox 200, środek 100): segmenty, dwa kierunki; wybór maisy 03.11 = A --- */
  function ringSVG() {
    return '<svg class="mk-ring mk-ring-A" viewBox="0 0 200 200" aria-hidden="true" focusable="false">' +
      '<g class="mk-r1"><circle cx="100" cy="100" r="95" fill="none" class="mk-krew" stroke-width="4" stroke-dasharray="46 10 10 10" /></g>' +
      '<g class="mk-r2"><circle cx="100" cy="100" r="86.5" fill="none" class="mk-kosc" stroke-width="2.2" stroke-dasharray="82 26 6 26" /></g>' +
      '<g class="mk-r1"><rect x="97" y="1" width="6" height="6" rx="1" class="mk-hot-f"/><rect x="97" y="193" width="6" height="6" rx="1" class="mk-hot-f"/></g>' +
      '</svg>';
  }

  var RING_ANIM = { 'mk-r1': [360, 16000], 'mk-r2': [-360, 10000] }; /* klasa → [obrót w stopniach, czas ms] */

  function Kot(el, opt) {
    this.el = el; this.opt = opt || {};
    this.anims = []; this.speed = 1; this.sq = false; this.dx = 0; this.dy = 0;
    el.classList.add('mk');
    el.innerHTML = '<div class="mk-ring-slot"></div><div class="mk-disk">' + catSVG() + '</div>';
    this.oczy = el.querySelector('.mk-oczy');
    this.oko = el.querySelectorAll('.mk-oko');
    this.blyskEl = el.querySelector('.mk-blysk');
    this.uszy = el.querySelectorAll('.mk-ucho-p');
    var self = this;
    this._hover = function () { self.twitch(); };
    el.addEventListener('pointerenter', this._hover);
    this.setRing(this.opt.ring || null);
    this.schedule();
    live.push(this);
  }
  Kot.prototype.setRing = function (v) {
    this.anims.forEach(function (a) { a.cancel(); }); this.anims = [];
    var slot = this.el.querySelector('.mk-ring-slot');
    this.el.classList.toggle('mk-has-ring', !!v);
    slot.innerHTML = v ? ringSVG() : '';
    if (!v || !motionOn) return;
    var cfg = RING_ANIM, self = this;
    Object.keys(cfg).forEach(function (cls) {
      slot.querySelectorAll('.' + cls).forEach(function (n) {
        n.style.transformOrigin = '100px 100px';
        var a = n.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(' + cfg[cls][0] + 'deg)' }],
          { duration: cfg[cls][1], iterations: Infinity, easing: 'linear' });
        a.playbackRate = self.speed;
        if (hidden) a.pause();
        self.anims.push(a);
      });
    });
  };
  Kot.prototype.schedule = function () {
    var self = this;
    clearTimeout(this.t);
    if (!motionOn) return;
    this.t = setTimeout(function () {
      if (!hidden && !self.sq) {
        self.blink();
        if (Math.random() < 0.25) setTimeout(function () { self.blink(); }, 260);
      }
      self.schedule();
    }, 3000 + Math.random() * 4000);
  };
  Kot.prototype.blink = function () {
    if (!motionOn) return;
    this.oko.forEach(function (o) {
      o.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.08)', offset: .45 }, { transform: 'scaleY(1)' }],
        { duration: 170, easing: 'ease-in-out' });
    });
  };
  Kot.prototype.twitch = function () {
    if (!motionOn || this._tw) return;
    var self = this; this._tw = 1;
    this.uszy.forEach(function (u) {
      u.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-9deg)', offset: .3 }, { transform: 'rotate(3deg)', offset: .65 }, { transform: 'rotate(0)' }],
        { duration: 380, easing: 'ease-out' });
    });
    setTimeout(function () { self._tw = 0; }, 900);
  };
  Kot.prototype.squint = function (on) {
    this.sq = !!on;
    this.el.classList.toggle('mk-squint', this.sq);
    var r = this.sq ? 3.2 : 1, self = this;
    this.speed = r;
    this.anims.forEach(function (a) { try { a.updatePlaybackRate ? a.updatePlaybackRate(r) : (a.playbackRate = r); } catch (e) { a.playbackRate = r; } });
  };
  /* słucha mikrofonu: kółko szybciej (×2,2), oczy otwarte; squint ma pierwszeństwo */
  Kot.prototype.slucha = function (on) {
    this.el.classList.toggle('mk-slucha', !!on);
    if (this.sq) return;
    var r = on ? 2.2 : 1;
    this.speed = r;
    this.anims.forEach(function (a) { try { a.updatePlaybackRate ? a.updatePlaybackRate(r) : (a.playbackRate = r); } catch (e) { a.playbackRate = r; } });
  };
  Kot.prototype.flash = function () {
    if (!motionOn) return;
    this.blyskEl.animate([{ opacity: 0 }, { opacity: .95, offset: .3 }, { opacity: 0 }], { duration: 420, easing: 'ease-out' });
  };
  Kot.prototype.look = function (px, py) {
    var r = this.el.getBoundingClientRect();
    if (!r.width) return;
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var ax = px - cx, ay = py - cy, d = Math.hypot(ax, ay) || 1;
    var unitsPerPx = 568 / r.width;                 /* oczy ruszają się o 1–2 px na ekranie */
    var m = Math.min(1, d / 400) * 2 * unitsPerPx;
    this.oczy.style.transform = 'translate(' + (ax / d * m).toFixed(1) + 'px,' + (ay / d * m * 0.7).toFixed(1) + 'px)';
  };
  Kot.prototype.destroy = function () {
    clearTimeout(this.t);
    this.anims.forEach(function (a) { a.cancel(); });
    this.el.removeEventListener('pointerenter', this._hover);
    live = live.filter(function (k) { return k !== this; }, this);
  };

  var raf = 0, lx = 0, ly = 0;
  g.addEventListener('pointermove', function (e) {
    if (!motionOn || e.pointerType === 'touch') return;
    lx = e.clientX; ly = e.clientY;
    if (!raf) raf = requestAnimationFrame(function () { raf = 0; live.forEach(function (k) { k.look(lx, ly); }); });
  }, { passive: true });
  document.addEventListener('visibilitychange', function () {
    hidden = document.hidden;
    live.forEach(function (k) { k.anims.forEach(function (a) { hidden ? a.pause() : a.play(); }); });
  });

  g.MeshugaKot = {
    mount: function (el, opt) { return new Kot(el, opt); },
    ringSVG: ringSVG, catSVG: catSVG,
    setMotion: function (on) {
      motionOn = !!on;
      live.forEach(function (k) {
        k.oczy.style.transform = '';
        k.setRing(k.el.classList.contains('mk-has-ring'));
        k.schedule();
      });
    },
    get motion() { return motionOn; }
  };
})(window);


;
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var app = $('#app');
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem('meshuga.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('meshuga.' + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- wiedza z cybersora.pl (cennik i projekty, stan 03.11.2026) ---------- */
  var CENNIK = {
    mikro: { kod: 'CN-MIKRO', n: 'Mikro-skrypt', o: 'Jedno małe zadanie na jeden wieczór: przerobić plik, zebrać dane z jednej strony, policzyć coś za Ciebie.', c: 'od 150 zł', t: 'standard do 14 dni' },
    skrypt: { kod: 'CN-SKRYPT', n: 'Skrypt', o: 'Robi za Ciebie nudną, powtarzalną robotę na komputerze albo w sieci, np. kilka Exceli zebranych w jeden raport.', c: 'od 500 zł', t: 'standard do 14 dni' },
    bot: { kod: 'CN-BOT', n: 'Bot', o: 'Pilnuje czegoś przez całą dobę i odzywa się, kiedy trzeba: nowe zamówienie, zapisy, przypomnienia, dwie usługi połączone przez API.', c: 'od 1 200 zł', t: 'standard do 14 dni' },
    app: { kod: 'CN-APP', n: 'Aplikacja', o: 'Program pisany pod jedną firmę: na komputer albo panel w przeglądarce. Może działać bez internetu, dane zostają u Ciebie.', c: 'od 5 000 zł', t: 'termin po wycenie' },
    audyt: { kod: 'CN-SKAN', n: 'Skan widoczności', o: 'Darmowo sprawdzamy, czy Google widzi Twoją stronę, czy działa na telefonie i szybko się ładuje. Raport z listą usterek, bez zobowiązań.', c: '0 zł', t: 'do 2 dni roboczych' },
    meta: { kod: 'CN-META', n: 'Audyt Meta', o: 'Facebook i Instagram pod lupą: zasięg postów, kim są obserwujący, co poprawić w profilu, plan publikacji. Na statystykach, do których sam dajesz wgląd.', c: 'od 500 zł', t: 'termin po wycenie' },
    start: { kod: 'CN-START', n: 'Pakiet Start', o: 'Zakładamy lub porządkujemy wizytówkę Google i poprawiamy na stronie to, co skan pokazał jako najpilniejsze.', c: '490 zł', t: 'do 7 dni' },
    pelny: { kod: 'CN-PELNY', n: 'Pakiet Pełny', o: 'Wszystko ze Startu plus opisy wszystkich podstron, adres i godziny czytelne dla Google oraz plan zbierania opinii.', c: '990 zł', t: 'do 14 dni' }
  };
  var PROJEKTY = {
    salondesk: { kod: 'PR-SALONDESK', n: 'SalonDesk', o: 'Program do prowadzenia salonu beauty: kalendarz wizyt, grafik zespołu, kartoteka klientek, kasa, magazyn i bony. Działa bez internetu.', f: [['wersja', '1.5.0 · Windows'], ['dane', 'na komputerze salonu']] },
    pycodemath: { kod: 'PR-PYCODEMATH', n: 'Pycodemath', o: 'Silnik dokładnej matematyki dla agentów AI. Od 0.5.0 sprawdza matematykę w kodzie. Publiczny, darmowy.', f: [['wersja', '0.5.0 · PyPI'], ['licencja', 'MIT']] },
    soraflux: { kod: 'PR-SORAFLUX', n: 'SoraFlux', o: 'Konwerter wideo, dźwięku i obrazów na komputer. Pokazuje rozmiar wyniku przed startem, nic nie wysyła do sieci.', f: [['wersja', '1.4.0 · Windows'], ['cena', 'za darmo']] },
    somi: { kod: 'PR-SOMI', n: 'SOMI', o: 'Nasza asystentka AI w terminalu i na Discordzie: rozmowa głosem, research, praca jak agent.', f: [['gdzie', 'terminal · Discord'], ['status', 'używamy na co dzień']] },
    moonsora: { kod: 'PR-MOONSORA', n: 'MoonSora', o: 'Terminal do pracy z agentami AI: polecenia w blokach, asystent obok przy błędach, własna przeglądarka agenta.', f: [['wersja', '0.11.0'], ['status', 'używamy na co dzień']] }
  };
  var EMAIL = 'cybersora@zohomail.eu';

  var ZASADY = [
    'Jesteś Meshuga, czarny kot i asystent na stronie cybersora.pl. cybersora to dwuosobowy zespół, który pisze programy, skrypty, boty i dba o widoczność firm w Google.',
    'Charakter: mówisz „my” o cybersorze, piszesz krótko i po ludzku, z lekkim pazurem (imię zobowiązuje), bez żargonu. Po polsku, polskie cudzysłowy „ ”. Maksymalnie około 90 słów. Bez nagłówków markdown; listę piszesz liniami zaczynanymi od „• ”.',
    'Twarde zasady: podajesz tylko ceny i terminy z cennika poniżej, nic nie zmyślasz. Gdy czegoś nie wiesz albo pytanie wymaga wyceny, mówisz to wprost i proponujesz wysłanie opisu zespołowi. Nie obiecujesz terminów spoza cennika. Nie podajesz telefonu (nie mamy), kontakt: ' + EMAIL + '. Nie zbierasz danych osobowych.',
    'Znaczniki (pisz je dokładnie, na samym końcu odpowiedzi, każdy w nawiasach [[ ]], najwyżej dwa karty): [[KARTA:id]] pokazuje kartę z cennika, gdy mówisz o tej usłudze; [[PROJEKT:id]] pokazuje kartę projektu; [[ZESPOL]] pokazuje przycisk „wyślij do zespołu”, gdy klient opisuje własny pomysł albo prosi o wycenę; [[WYCENA:typ]] albo [[WYCENA:typ+dodatek]] pokazuje kalkulator wyceny z zaznaczonymi pozycjami, gdy klient pyta „ile to kosztuje” albo porównuje opcje (typ: mikro, skrypt, bot, app; dodatek: audyt, start, pelny, meta). Kalkulator liczy sam, więc w tekście nie sumuj cen. Gdy klient chce opisać pomysł, zaproponuj komendę /brief (5 krótkich pytań i gotowy brief do wysłania).',
    'CENNIK (id: nazwa, cena, termin, opis):\n' + Object.keys(CENNIK).map(function (k) { var c = CENNIK[k]; return k + ': ' + c.n + ', ' + c.c + ', ' + c.t + '. ' + c.o; }).join('\n'),
    'PROJEKTY (id: nazwa, opis):\n' + Object.keys(PROJEKTY).map(function (k) { var p = PROJEKTY[k]; return k + ': ' + p.n + '. ' + p.o; }).join('\n')
  ].join('\n\n');

  /* modele (04.11): Astral szybki do wszystkiego, Pycode myśli dłużej; oba pomagają z kodem */
  var ZASADY_KOD = 'Kod: pomagasz też z programowaniem (tłumaczysz błędy, poprawiasz i piszesz fragmenty kodu). Kod zawsze w bloku z trzema grawisami i nazwą języka, np. ```python. Limit słów nie obejmuje kodu. Cenniki i terminy dalej tylko z cennika; większy projekt proponujesz wysłać zespołowi.';
  var ZASADY_ASTRAL = 'Model: Astral (szybki). Odpowiadasz od razu i zwięźle. ' + ZASADY_KOD + ' Fragment kodu najwyżej około 30 linii.';
  var ZASADY_PYCODE = 'Model: Pycode (myśli dłużej). Zanim odpowiesz, przemyśl sprawę krok po kroku i podaj tylko dopracowany wynik. Przy wycenach i pomysłach rozpisz zakres na kroki; przy kodzie dawaj dokładne, sprawdzone rozwiązanie i jednym zdaniem powiedz, dlaczego działa. Możesz pisać do około 160 słów. ' + ZASADY_KOD + ' Fragment kodu najwyżej około 60 linii.';

  var STARTOWE = [
    { kod: 'CENA', q: 'Ile kosztuje aplikacja?' },
    { kod: 'SKAN', q: 'Zrób mi darmowy skan widoczności' },
    { kod: 'PROJEKTY', q: 'Pokaż wasze projekty' },
    { kod: 'POMYSŁ', q: 'Opiszę mój pomysł. Wycenicie?', akcja: 'brief' }
  ];

  /* brief: 5 pytań po kolei, bez modelu (klucz, etykieta, pytanie) */
  var PYTANIA = [
    ['cel', 'Cel', 'Co program ma robić? Napisz w jednym, dwóch zdaniach.'],
    ['kto', 'Kto używa', 'Kto będzie go używał: Ty, Twój zespół czy klienci?'],
    ['teraz', 'Na czym teraz', 'Na czym robisz to teraz? Excel, kartka, inny program?'],
    ['termin', 'Termin', 'Na kiedy jest potrzebny?'],
    ['budzet', 'Budżet', 'Jaki budżet bierzesz pod uwagę? Możesz napisać „nie wiem”.']
  ];
  var KOMENDY = [
    { k: '/cena', o: 'kalkulator wyceny, od razu' },
    { k: '/brief', o: 'pomysł w 5 pytaniach' },
    { k: '/projekty', o: 'co zbudowaliśmy' },
    { k: '/skan', o: 'darmowy skan widoczności' },
    { k: '/nowy', o: 'nowa rozmowa' }
  ];

  var PRZYKLAD = {
    id: 'przyklad', tytul: 'Ile kosztuje bot do zamówień?', przyklad: true,
    msgs: [
      { r: 'user', t: 'Ile kosztuje bot, który da mi znać o nowym zamówieniu w sklepie?' },
      { r: 'assistant', t: 'Taki pilnujący to u nas pozycja „Bot”: od 1 200 zł, standard do 14 dni. Siedzi przy sklepie całą dobę i odzywa się, kiedy wpadnie zamówienie, na Discordzie, mailem albo tam, gdzie wolisz.\n\nŻeby podać konkretną cenę, musimy wiedzieć:\n• na czym stoi sklep (własny, Shoper, Allegro?)\n• gdzie chcesz dostawać powiadomienia\n\nNapisz to w dwóch zdaniach, a przekażę zespołowi. [[KARTA:bot]] [[ZESPOL]]' }
    ]
  };

  /* ---------- stan ---------- */
  var ust = Object.assign({ motyw: 'dark', ruch: 'on', tryb: 'quick', zwiniety: false }, LS.get('ust', {}));
  delete ust.konto; /* stary przełącznik makiety KONTO (A/B), wybrano A */
  ['ring', 'tlo', 'karty', 'platek', 'choinka', 'platki'].forEach(function (k) { delete ust[k]; }); /* dawne przełączniki makiety (wybór 03.11) */
  var czaty = LS.get('czaty', []);
  if (!Array.isArray(czaty)) czaty = [];
  var biezacy = null;      /* {id, tytul, msgs} */
  var trwa = null;         /* AbortController */
  var sample = null, sampleStan = 'czekam';
  var zrzut = null;        /* File czekający na wysłanie */
  var imgLim = null;       /* sample.limits().images albo null */

  /* ---------- koty ---------- */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (ust.ruch === 'off' || reduce) MeshugaKot.setMotion(false);
  var kotHero = MeshugaKot.mount($('#kotHero'), { ring: true });
  var kotPasek = MeshugaKot.mount($('#kotPasek'), { ring: false });

  /* ---------- święta: od 1 listopada do 6 stycznia („u nas święta zaczynają się wcześniej”) ---------- */
  function sezonSwiat() { var d = new Date(), m = d.getMonth(); return m === 10 || m === 11 || (m === 0 && d.getDate() <= 6); }
  var SWIETA = sezonSwiat();
  /* płatek śniegu jak w „Co umiem” (6 ramion z gałązkami, sześciokąt, kropki na końcach, kropkowana orbita z cząstkami), bez poświaty.
     Jeden <symbol>, kolory przez zmienne CSS na każdym płatku (--p-ram, --p-kon, --p-hex, --p-sr, --p-orb). */
  function platekSymbol() {
    var R = 74, kon = '', cz = '';
    for (var k = 0; k < 6; k++) {
      var a = k * Math.PI / 3; kon +='<circle cx="' + (Math.cos(a) * R).toFixed(1) + '" cy="' + (Math.sin(a) * R).toFixed(1) + '" r="4.5" style="fill:var(--p-kon)"/>';
    }
    var ramiona = ''; for (var r = 0; r < 6; r++) ramiona += '<path transform="rotate(' + (r * 60) + ')" d="M' + (R * .2) + ' 0H' + R + [[.46, .3], [.72, .21]].map(function (g) { var x = R * g[0], l = R * g[1]; return 'M' + x + ' 0l' + (l * .77).toFixed(1) + ' ' + (-l * .64).toFixed(1) + 'M' + x + ' 0l' + (l * .77).toFixed(1) + ' ' + (l * .64).toFixed(1); }).join('') + '" style="fill:none;stroke:var(--p-ram);stroke-width:5;stroke-linecap:round"/>';
    for (var j = 0; j < 9; j++) { var b = j * 0.698 + .3; cz += '<circle cx="' + (Math.cos(b) * 92).toFixed(1) + '" cy="' + (Math.sin(b) * 92).toFixed(1) + '" r="' + (j % 2 ? 1.8 : 2.6) + '" style="fill:' + (j % 3 ? 'var(--p-kon)' : 'var(--p-orb)') + '"/>'; }
    var hex = []; for (var h = 0; h < 6; h++) { var ah = h * Math.PI / 3 + Math.PI / 6; hex.push((Math.cos(ah) * 13).toFixed(1) + ',' + (Math.sin(ah) * 13).toFixed(1)); }
    return '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><symbol id="platekSym" viewBox="-100 -100 200 200" overflow="visible">' +
      '<circle r="92" style="fill:none;stroke:var(--p-orb);stroke-width:1.2;stroke-dasharray:2 9;opacity:.55"/>' + cz + ramiona + kon +
      '<polygon points="' + hex.join(' ') + '" style="fill:none;stroke:var(--p-hex);stroke-width:4;stroke-linejoin:round"/><circle r="5.5" style="fill:var(--p-sr)"/></symbol></defs></svg>';
  }

  /* ---------- latające płatki (święta, prośba maisy 03.11): po całym ekranie, 4 kolory; ruch = opad (wybór maisy: „ten opad jest dojebany”) ---------- */
  var KOLORY_PLATKOW = ['czerw', 'bialy', 'czb', 'bcz'];
  var Lot = (function () {
    var box = null, fl = [], raf = 0, t0 = 0, W = 0, H = 0, tm = 0;
    function los(a, b) { return a + Math.random() * (b - a); }
    function zbuduj() {
      if (!box) return;
      box.innerHTML = ''; W = box.clientWidth; H = box.clientHeight;
      var n = Math.max(4, Math.min(12, Math.round(W * H / 80000))), skala = W < 600 ? .7 : 1;
      fl = [];
      for (var i = 0; i < n; i++) {
        var s = Math.round(los(26, 92) * skala), gl = (s / skala - 26) / 66; /* gl = głębia: większy = bliżej, szybciej, wyraźniej */
        var el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        el.setAttribute('class', 'platek-lot k-' + KOLORY_PLATKOW[i % KOLORY_PLATKOW.length]);
        el.setAttribute('viewBox', '-100 -100 200 200'); el.setAttribute('aria-hidden', 'true');
        el.innerHTML = '<use href="#platekSym"/>';
        el.style.width = el.style.height = s + 'px';
        var p = { el: el, s: s, x: (i + los(.15, .85)) / n * W, y: los(0, H), a: los(0, 360), va: los(-14, 14), f: los(0, 6.283), gl: gl };
        el.style.opacity = (.45 + .5 * Math.max(0, Math.min(1, gl))).toFixed(2);
        fl.push(p); box.appendChild(el);
      }
      rysuj(0, performance.now() / 1000);
    }
    /* strefa bez płatków (uwaga maisy 03.11: „nie najeżdżać na kota”): elipsa opisana na kocie + margines,
       we współrzędnych warstwy płatków. Liczona co klatkę (przewijanie i zmiana rozmiaru przesuwają kota). */
    var KOLUMNA = 30; /* płatek nie startuje bliżej osi strefy niż 30 px, więc kołysanie (±24) nie przerzuca go na drugą stronę */
    function strefa() {
      var k = document.getElementById('kotHero'); if (!k || !box || !app.classList.contains('pusty')) return null;
      var b = box.getBoundingClientRect(), r = k.getBoundingClientRect(); if (!r.width) return null;
      var x0 = r.left, x1 = r.right, y0 = r.top, y1 = r.bottom;
      var M = 16;
      return { cx: (x0 + x1) / 2 - b.left, cy: (y0 + y1) / 2 - b.top, a: (x1 - x0) / 2 * 1.4142 + M, b: (y1 - y0) / 2 * 1.4142 + M };
    }
    function kolumna(p, z) { if (z && Math.abs(p.x - z.cx) < KOLUMNA) p.x = z.cx + (p.x >= z.cx ? KOLUMNA : -KOLUMNA); }
    function omin(p, x, z) {
      /* płatek (koło o promieniu r) zsuwa się bokiem po łuku elipsy powiększonej o r; przesunięcie zależy tylko od wysokości, więc bez skoków */
      var r = p.s * .48, A = z.a + r, B = z.b + r, dy = p.y - z.cy;
      if (Math.abs(dy) >= B) return x;
      var trzeba = A * Math.sqrt(1 - dy * dy / (B * B)), sg = p.x >= z.cx ? 1 : -1;
      return sg * (x - z.cx) < trzeba ? z.cx + sg * trzeba : x;
    }
    function rysuj(dt, t) {
      var z = strefa();
      fl.forEach(function (p) {
        var m = p.s;
        p.y += (22 + 46 * Math.max(0, p.gl)) * dt; p.a += p.va * dt;
        if (p.y > H + m) { p.y = -m; p.x = los(0, W); kolumna(p, z); }
        if (!p.kol && z) { kolumna(p, z); p.kol = 1; }
        var x = p.x + Math.sin(t * .8 + p.f) * 24;
        if (z) x = omin(p, x, z);
        p.el.style.transform = 'translate(' + (x - m / 2).toFixed(1) + 'px,' + (p.y - m / 2).toFixed(1) + 'px) rotate(' + p.a.toFixed(1) + 'deg)';
      });
    }
    function klatka(ts) {
      raf = requestAnimationFrame(klatka);
      if (document.hidden || !app.classList.contains('pusty')) { t0 = 0; return; }
      var dt = t0 ? Math.min(.05, (ts - t0) / 1000) : 0; t0 = ts; rysuj(dt, ts / 1000);
    }
    function start() {
      cancelAnimationFrame(raf); raf = 0; t0 = 0;
      if (!SWIETA || !box) return;
      zbuduj();
      if (MeshugaKot.motion) raf = requestAnimationFrame(klatka);
    }
    addEventListener('resize', function () { clearTimeout(tm); tm = setTimeout(start, 200); });
    return { init: function (el) { box = el; }, start: start, ile: function () { return fl.length; } };
  })();
  if (SWIETA) {
    app.classList.add('swieta'); $('#swietaNapis').hidden = false;
    document.body.insertAdjacentHTML('afterbegin', platekSymbol());
    var lotBox = document.createElement('div'); lotBox.className = 'platki-lot'; lotBox.setAttribute('aria-hidden', 'true');
    $('#tlo').after(lotBox); Lot.init(lotBox);
  }

  /* ---------- tło: spadający kod (wybór 03.11), w święta śnieg z kodu ---------- */
  var tlo = { el: $('#tlo'), stop: null };
  function ustawTlo() {
    if (tlo.stop) tlo.stop(); tlo.el.innerHTML = '';
    app.classList.toggle('bez-ruchu', !MeshugaKot.motion);
    tlo.stop = SWIETA ? tloSnieg() : tloKod();
  }
  function tloSnieg() {
    var c = document.createElement('canvas'); c.className = 'tlo-snieg'; tlo.el.appendChild(c);
    var x = c.getContext('2d'), w, h, pl = [], raf = 0, t0 = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    var ZN = '*+×·01{}'.split('');
    var probe = document.createElement('span'); probe.style.color = 'var(--fg2)'; document.body.appendChild(probe);
    function nowy(y) { return { x: Math.random() * w, y: y, v: 14 + Math.random() * 28, f: Math.random() * 6.283, a: 6 + Math.random() * 14, s: 10 + (Math.random() * 9 | 0), z: ZN[Math.random() * ZN.length | 0], r: Math.random() < .28 }; }
    function rozmiar() {
      w = c.clientWidth; h = c.clientHeight; c.width = w * dpr; c.height = h * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
      pl = []; var n = Math.round(w * h / 7000); for (var i = 0; i < n; i++) pl.push(nowy(Math.random() * h));
      rysuj(0, performance.now());
    }
    function rysuj(dt, ts) {
      x.clearRect(0, 0, w, h);
      var szary = getComputedStyle(probe).color, krew = kolor('--krew');
      pl.forEach(function (p) {
        if (dt) { p.y += p.v * dt; if (p.y > h + 20) { var n = nowy(-20); for (var k in n) p[k] = n[k]; } }
        x.globalAlpha = p.r ? .55 : .35; x.fillStyle = p.r ? krew : szary;
        x.font = '500 ' + p.s + 'px "Geist Mono", monospace';
        x.fillText(p.z, p.x + Math.sin(ts / 1250 + p.f) * p.a, p.y);
      });
      x.globalAlpha = 1;
    }
    function klatka(ts) {
      raf = requestAnimationFrame(klatka);
      if (document.hidden) { t0 = 0; return; }
      var dt = t0 ? Math.min(.05, (ts - t0) / 1000) : 0; t0 = ts; rysuj(dt, ts);
    }
    rozmiar(); addEventListener('resize', rozmiar);
    if (MeshugaKot.motion) raf = requestAnimationFrame(klatka);
    return function () { cancelAnimationFrame(raf); removeEventListener('resize', rozmiar); probe.remove(); };
  }
  function kolor(nazwa) { return getComputedStyle(document.documentElement).getPropertyValue(nazwa).trim(); }
  function tloKod() {
    var c = document.createElement('canvas'); c.className = 'tlo-kod'; tlo.el.appendChild(c);
    var x = c.getContext('2d'), w, h, kol = [], fs = 15, t0 = 0, raf = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    var ZN = '01{}[]<>/=+*#;:$アイウエカキクケサシスセ'.split('');
    var CZERW = .3; /* udział kolumn w krwi */
    var probe = document.createElement('span'); probe.style.color = 'var(--kod)'; document.body.appendChild(probe);
    function rozmiar() {
      w = c.clientWidth; h = c.clientHeight; c.width = w * dpr; c.height = h * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
      kol = []; for (var i = 0; i < Math.ceil(w / fs); i++) kol.push({ y: Math.random() * h, v: .4 + Math.random() * .9, r: Math.random() < CZERW });
    }
    function klatka(ts) {
      raf = requestAnimationFrame(klatka);
      if (ts - t0 < 60 || document.hidden) return; t0 = ts;
      x.fillStyle = kolor('--bg'); x.globalAlpha = .18; x.fillRect(0, 0, w, h); x.globalAlpha = 1;
      var szary = getComputedStyle(probe).color, krew = kolor('--krew');
      x.font = '500 13px "Geist Mono", monospace';
      kol.forEach(function (k, i) {
        /* część kolumn spada w krwi (decyzja maisy 03.11: „czerwieni brakuje”) */
        x.globalAlpha = k.r ? .6 : 1; x.fillStyle = k.r ? krew : szary;
        x.fillText(ZN[(Math.random() * ZN.length) | 0], i * fs, k.y);
        k.y += fs * k.v * .5; if (k.y > h + 20) { k.y = -Math.random() * 200; k.r = Math.random() < CZERW; }
      });
      x.globalAlpha = 1;
    }
    rozmiar(); addEventListener('resize', rozmiar);
    if (MeshugaKot.motion) raf = requestAnimationFrame(klatka);
    else { x.font = '500 13px "Geist Mono", monospace'; var kr = kolor('--krew'), sz = getComputedStyle(probe).color; for (var i = 0; i < 900; i++) { x.globalAlpha = i % 4 ? 1 : .6; x.fillStyle = i % 4 ? sz : kr; x.fillText(ZN[i % ZN.length], (i * 37) % w, (i * 53) % h); } x.globalAlpha = 1; }
    return function () { cancelAnimationFrame(raf); removeEventListener('resize', rozmiar); probe.remove(); };
  }
  /* ---------- przełączniki (Ustawienia: motyw, animacje) ---------- */
  function zaznacz() {
    document.querySelectorAll('.seg[data-ust]').forEach(function (s) {
      var v = ust[s.getAttribute('data-ust')];
      s.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === v)); });
    });
  }
  function zapiszUst() { LS.set('ust', ust); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.seg[data-ust] button'); if (!b) return;
    var k = b.parentElement.getAttribute('data-ust'), v = b.getAttribute('data-v');
    if (k === 'motyw') { ust.motyw = v; motyw(); ustawTlo(); }
    else if (k === 'ruch') { ust.ruch = v; MeshugaKot.setMotion(v === 'on' && !reduce); ustawTlo(); Lot.start(); }
    Platek.przerysuj();
    zapiszUst();
    zaznacz();
  });
  function motyw() { if (ust.motyw === 'light') document.documentElement.setAttribute('data-theme', 'light'); else document.documentElement.removeAttribute('data-theme'); }

  /* ---------- pasek ---------- */
  function zwin(v) { ust.zwiniety = v; app.classList.toggle('zwiniety', v); $('#zwin').setAttribute('aria-label', v ? 'Rozwiń pasek' : 'Zwiń pasek'); zapiszUst(); }
  $('#zwin').onclick = function () { zwin(!ust.zwiniety); };
  /* zwinięty pasek: ikona szukajki rozwija pasek i wpisuje w pole */
  $('.szukaj').addEventListener('click', function () { if (ust.zwiniety && window.innerWidth > 860) { zwin(false); setTimeout(function () { $('#szukaj').focus(); }, 360); } });
  $('#menuTel').onclick = function () { app.classList.add('szuflada'); };
  $('#zaslona').onclick = function () { app.classList.remove('szuflada'); };
  function zamknijSzuflade() { app.classList.remove('szuflada'); }

  function rysujHistorie() {
    var q = ($('#szukaj').value || '').toLowerCase();
    var lista = [PRZYKLAD].concat(czaty).filter(function (c) {
      return !q || c.tytul.toLowerCase().indexOf(q) > -1 || c.msgs.some(function (m) { return m.t.toLowerCase().indexOf(q) > -1; });
    });
    var h = $('#historia'); h.innerHTML = '';
    if (!lista.length) { h.innerHTML = '<div class="pusto">Nic nie pasuje do „' + esc(q) + '”.</div>'; return; }
    lista.forEach(function (c) {
      var b = document.createElement('button'); b.className = 'poz' + (biezacy && biezacy.id === c.id ? ' aktywna' : '');
      b.innerHTML = '<span>' + esc(c.tytul) + '</span>' + (c.przyklad ? '<em class="tag">PRZYKŁAD</em>' : '');
      b.onclick = function () { otworz(c); zamknijSzuflade(); };
      h.appendChild(b);
    });
  }
  $('#szukaj').addEventListener('input', rysujHistorie);

  /* ---------- widoki ---------- */
  function pusty() {
    przerwij(); biezacy = null; app.classList.add('pusty'); app.classList.remove('widok-umiem');
    $('#feed').innerHTML = ''; $('#umiemBtn').classList.remove('aktywna');
    kotHero.squint(false); rysujHistorie(); zaznacz();
  }
  $('#nowy').onclick = function () { pusty(); zamknijSzuflade(); $('#wpis').focus(); };
  function otworz(c) {
    przerwij(); biezacy = c; app.classList.remove('pusty', 'widok-umiem'); $('#umiemBtn').classList.remove('aktywna');
    var f = $('#feed'); f.innerHTML = '';
    c.msgs.forEach(function (m) { if (m.r === 'user') dodajU(m.t, m.zrzut); else dodajM(m.t, m.log, m.lok ? m : null); });
    rysujHistorie(); zaznacz(); przewin();
  }

  $('#umiemBtn').onclick = function () {
    przerwij(); app.classList.remove('pusty'); app.classList.add('widok-umiem'); this.classList.add('aktywna'); zamknijSzuflade();
    var k = function (kod, h, p) { return '<article class="ak kat"><div class="kod">' + kod + '</div><h3>' + h + '</h3><p>' + p + '</p></article>'; };
    $('#umiem').innerHTML = '<div class="brw mono"><b>MESHUGA</b><span>CO UMIEM</span></div><h2 id="umiemH">W czym pomogę</h2><div class="umiem-scena"><canvas aria-hidden="true"></canvas><div class="umiem-grid"><div class="platek-slot" aria-hidden="true"></div>' +
      k('CENNIK', 'Podam ceny z góry', 'Znam cały cennik cybersory: od mikro-skryptu za 150 zł po aplikację na zamówienie. Pokażę cenę i termin na karcie.') +
      k('SKAN', 'Umówię darmowy skan', 'Sprawdzimy, czy Google widzi Twoją stronę i czy działa na telefonie. Raport w 2 dni robocze, 0 zł.') +
      k('PROJEKTY', 'Pokażę, co zbudowaliśmy', 'SalonDesk, SoraFlux, Pycodemath, SOMI, MoonSora. Opowiem, co robią i dla kogo są.') +
      k('POMYSŁ', 'Przekażę pomysł zespołowi', 'Opisz, co ma robić program. Złożę z tego krótki opis, który wyślesz nam mailem do wyceny.') +
      '</div></div><div class="nie"><strong>Czego nie robię:</strong><ul><li>nie wymyślam cen ani terminów spoza cennika,</li><li>nie zapisuję rozmów na serwerze; historia zostaje w tej przeglądarce,</li><li>nie dzwonię i nie podaję telefonu, bo go nie mamy.</li></ul></div>';
    $('#przewijak').scrollTop = 0;
    Platek.start($('.umiem-scena'));
  };

  /* ---------- płatek: czerwony płatek śniegu z cząsteczkami, łączy karty „Co umiem” ----------
     Canvas pod kartami. Płatek w środkowej kolumnie, strumienie cząstek do 4 kart (najechana karta = szybszy strumień).
     Bez poświaty (bez shadowBlur), tylko kolory z tokenów. */
  var Platek = (function () {
    var sc = null, cv = null, cx = null, raf = 0, ro = null, t0 = 0, dpr = 1, W = 0, H = 0;
    var geo = null, czast = [], najech = -1, kol = {};
    function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#e11d33'; }
    function rgba(hex, a) { var h = hex.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
    function zmierz() {
      if (!sc) return;
      var r = cv.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      var s = sc.querySelector('.platek-slot').getBoundingClientRect();
      var c = { x: s.left - r.left + s.width / 2, y: s.top - r.top + s.height / 2 };
      var R = Math.max(46, Math.min(s.width, s.height) * 0.36);
      var cele = [];
      if (s.width < r.width * 0.5) { /* telefon: płatek nad kartami, bez strumieni */
        sc.querySelectorAll('.ak').forEach(function (a) {
          var q = a.getBoundingClientRect(), lewa = q.left + q.width / 2 < s.left + s.width / 2;
          cele.push({ x: (lewa ? q.right : q.left) - r.left, y: q.top - r.top + q.height / 2, el: a });
        });
      }
      geo = { c: c, R: R, cele: cele };
      kol = { krew: css('--krew'), hot: css('--hot'), fg: css('--fg') };
      czast = [];
      for (var i = 0; i < 46; i++) czast.push({ typ: 'orb', r: R * (0.75 + Math.random() * 0.9), a: Math.random() * 6.283, w: (0.08 + Math.random() * 0.22) * (Math.random() < 0.5 ? -1 : 1), s: 0.8 + Math.random() * 1.4, k: Math.random() < 0.7 ? 'hot' : 'fg', al: 0.35 + Math.random() * 0.5, f: Math.random() * 6.283 });
      for (var j = 0; j < 12; j++) czast.push({ typ: 'ram', ram: j % 6, t: Math.random(), v: 0.18 + Math.random() * 0.2, s: 1.2, k: 'hot', al: 0.9 });
      cele.forEach(function (cel, ci) { for (var m = 0; m < 7; m++) czast.push({ typ: 'str', ci: ci, t: Math.random(), v: 0.12 + Math.random() * 0.12, s: 1.8 + Math.random() * 1.2, k: m % 3 ? 'hot' : 'fg', al: 0.8, d: (Math.random() - 0.5) * 6 }); });
      rysuj(performance.now());
    }
    function punktStr(cel, t, dx) {
      var c = geo.c, R = geo.R, kat = Math.atan2(cel.y - c.y, cel.x - c.x);
      var sx = c.x + Math.cos(kat) * R * 1.08, sy = c.y + Math.sin(kat) * R * 1.08;
      var mx = (sx + cel.x) / 2, my = (sy + cel.y) / 2 + (cel.y < c.y ? -1 : 1) * 14;
      var u = 1 - t, x = u * u * sx + 2 * u * t * mx + t * t * cel.x, y = u * u * sy + 2 * u * t * my + t * t * cel.y;
      return { x: x, y: y + dx * Math.sin(t * Math.PI), sx: sx, sy: sy, mx: mx, my: my };
    }
    function ramie(ctx, R) {
      ctx.beginPath(); ctx.moveTo(R * 0.2, 0); ctx.lineTo(R, 0);
      [[0.46, 0.3], [0.72, 0.21]].forEach(function (g) {
        var x = R * g[0], l = R * g[1];
        ctx.moveTo(x, 0); ctx.lineTo(x + l * 0.77, -l * 0.64);
        ctx.moveTo(x, 0); ctx.lineTo(x + l * 0.77, l * 0.64);
      });
      ctx.stroke();
    }
    function rysuj(now) {
      if (!geo) return;
      var t = (now - t0) / 1000, dt = Math.min(0.05, (now - (rysuj.last || now)) / 1000); rysuj.last = now;
      var ruch = MeshugaKot.motion;
      var ctx = cx, c = geo.c, R = geo.R;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';
      /* połączenia do kart */
      geo.cele.forEach(function (cel, ci) {
        var p = punktStr(cel, 0, 0), on = ci === najech;
        ctx.strokeStyle = rgba(kol.krew, on ? 0.95 : 0.55); ctx.lineWidth = on ? 2 : 1.3;
        ctx.beginPath(); ctx.moveTo(p.sx, p.sy); ctx.quadraticCurveTo(p.mx, p.my, cel.x, cel.y); ctx.stroke();
        ctx.fillStyle = rgba(kol.hot, on ? 1 : 0.7); ctx.fillRect(cel.x - 2.5, cel.y - 2.5, 5, 5);
      });
      /* płatek */
      var rot = ruch ? t * 0.12 : 0, odd = ruch ? 1 + Math.sin(t * 1.3) * 0.025 : 1;
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(rot); ctx.scale(odd, odd);
      ctx.strokeStyle = kol.krew; ctx.lineWidth = 2.6;
      for (var i = 0; i < 6; i++) { ctx.save(); ctx.rotate(i * Math.PI / 3); ramie(ctx, R); ctx.restore(); }
      ctx.strokeStyle = kol.hot; ctx.lineWidth = 1.4;
      ctx.beginPath(); for (var h = 0; h <= 6; h++) { var a = h * Math.PI / 3 + Math.PI / 6; ctx[h ? 'lineTo' : 'moveTo'](Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2); } ctx.stroke();
      ctx.beginPath(); for (var h2 = 0; h2 <= 6; h2++) { var a2 = h2 * Math.PI / 3; ctx[h2 ? 'lineTo' : 'moveTo'](Math.cos(a2) * R * 0.09, Math.sin(a2) * R * 0.09); } ctx.fillStyle = kol.hot; ctx.fill();
      for (var n = 0; n < 6; n++) { var an = n * Math.PI / 3, pul = ruch ? 0.5 + 0.5 * Math.sin(t * 2.2 + n) : 1; ctx.fillStyle = rgba(kol.hot, 0.55 + 0.45 * pul); ctx.beginPath(); ctx.arc(Math.cos(an) * R, Math.sin(an) * R, 2.6, 0, 6.283); ctx.fill(); }
      ctx.restore();
      /* pierścień z segmentów, obraca się w drugą stronę */
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(ruch ? -t * 0.2 : 0);
      ctx.strokeStyle = rgba(kol.fg, 0.28); ctx.lineWidth = 1.2;
      for (var g = 0; g < 12; g++) { ctx.beginPath(); ctx.arc(0, 0, R * 1.22, g * 0.5236 + 0.06, g * 0.5236 + (g % 3 ? 0.3 : 0.45)); ctx.stroke(); }
      ctx.restore();
      /* cząstki */
      czast.forEach(function (p) {
        var x, y, al = p.al;
        if (p.typ === 'orb') {
          if (ruch) p.a += p.w * dt;
          x = c.x + Math.cos(p.a) * p.r; y = c.y + Math.sin(p.a) * p.r * 0.92;
          al *= ruch ? 0.6 + 0.4 * Math.sin(t * 1.7 + p.f) : 1;
        } else if (p.typ === 'ram') {
          if (ruch) { p.t += p.v * dt; if (p.t > 1) p.t -= 1; }
          var ka = p.ram * Math.PI / 3 + rot, rr = R * (0.2 + 0.8 * p.t) * odd;
          x = c.x + Math.cos(ka) * rr; y = c.y + Math.sin(ka) * rr; al *= 1 - p.t * 0.6;
        } else {
          var cel = geo.cele[p.ci]; if (!cel) return;
          if (ruch) { p.t += p.v * dt * (p.ci === najech ? 2.6 : 1); if (p.t > 1) p.t -= 1; }
          var q = punktStr(cel, p.t, p.d); x = q.x; y = q.y; al *= Math.min(1, p.t * 5, (1 - p.t) * 5);
        }
        ctx.fillStyle = rgba(kol[p.k], Math.max(0, al));
        ctx.fillRect(x - p.s / 2, y - p.s / 2, p.s, p.s);
      });
      if (ruch && !document.hidden && sc && app.classList.contains('widok-umiem')) raf = requestAnimationFrame(rysuj); else raf = 0;
    }
    function start(el) {
      stop(); sc = el; if (!sc) return;
      cv = sc.querySelector('canvas'); cx = cv.getContext('2d'); t0 = performance.now(); rysuj.last = 0;
      sc.querySelectorAll('.ak').forEach(function (a, i) {
        a.addEventListener('mouseenter', function () { najech = i; if (!raf) rysuj(performance.now()); });
        a.addEventListener('mouseleave', function () { najech = -1; if (!raf) rysuj(performance.now()); });
      });
      if (window.ResizeObserver) { ro = new ResizeObserver(function () { zmierz(); if (!raf && MeshugaKot.motion) raf = requestAnimationFrame(rysuj); }); ro.observe(sc); }
      zmierz();
      if (MeshugaKot.motion && !raf) raf = requestAnimationFrame(rysuj);
    }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; if (ro) ro.disconnect(); ro = null; geo = null; najech = -1; }
    document.addEventListener('visibilitychange', function () { if (!document.hidden && sc && geo && !raf && MeshugaKot.motion && app.classList.contains('widok-umiem')) raf = requestAnimationFrame(rysuj); });
    return { start: start, stop: stop, przerysuj: function () { if (sc && geo) zmierz(); if (sc && geo && !raf && MeshugaKot.motion) raf = requestAnimationFrame(rysuj); } };
  })();

  /* ---------- karty startowe ---------- */
  /* ikony kart: zestaw Recraft „linia” (wybór 03.11), wektor; ścieżki w ukrytym #ikZestaw, każda ikona = wycięty viewBox + maska, kolor z CSS */
  var CIECIA = {"POMYSŁ": [2503, 2455, 1197, 1197], "SKAN": [2528, 693, 1151, 1151], "PROJEKTY": [701, 2489, 1137, 1137], "CENA": [717, 754, 1053, 1053]};
  function ikona(kod, i) {
    var c = CIECIA[kod]; if (!c) return '';
    var vb = c.join(' '), id = 'ikm' + i, r = 'x="' + c[0] + '" y="' + c[1] + '" width="' + c[2] + '" height="' + c[3] + '"';
    return '<svg viewBox="' + vb + '"><defs><mask id="' + id + '" maskUnits="userSpaceOnUse" ' + r + '><use href="#ikZestaw"/></mask></defs><rect ' + r + ' fill="currentColor" mask="url(#' + id + ')"/></svg>';
  }
  STARTOWE.forEach(function (s, i) {
    var b = document.createElement('button'); b.className = 'karta kat';
    b.innerHTML = '<span class="gora"><span class="ik" aria-hidden="true">' + ikona(s.kod, i) + '</span><span class="nr">0' + (i + 1) + '</span></span>' +
      '<span class="kod">' + s.kod + '</span><span class="q">' + esc(s.q) + '</span>' +
      '<span class="str" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg></span>';
    b.onclick = function () { if (s.akcja === 'brief') startBrief(); else wyslij(s.q); };
    $('#karty').appendChild(b);
  });

  /* ---------- wiadomości ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function rozbierz(t) {
    var znaczniki = [], m, re = /\[\[(KARTA|PROJEKT|WYCENA):([a-z+]+)\]\]|\[\[ZESPOL\]\]/g;
    while ((m = re.exec(t))) znaczniki.push(m[1] ? { typ: m[1], id: m[2] } : { typ: 'ZESPOL' });
    /* w trakcie pisania znacznik przychodzi kawałkami („[”, „[[KAR”, „[[KARTA:bot]”), więc ucinamy też taki ogon */
    var czysty = t.replace(re, '').replace(/\[\[?[A-Za-z_]*(:[a-z+]*)?\]?$/, '').trim();
    return { czysty: czysty, znaczniki: znaczniki };
  }
  /* bloki ```jezyk … ``` → kod z przyciskiem „Kopiuj”; niedomknięty blok w trakcie pisania też jest kodem */
  function format(t) {
    return String(t).split('```').map(function (c, i) {
      if (!(i % 2)) return formatTekst(c);
      var nl = c.indexOf('\n'), jez = nl > -1 ? c.slice(0, nl).trim() : '', kod = nl > -1 ? c.slice(nl + 1) : c;
      if (!/^[\w+#.-]{0,16}$/.test(jez)) { jez = ''; kod = c; }
      return '<div class="kodblok"><div class="kodbar"><span>' + esc(jez || 'kod') + '</span><button type="button" class="kod-kopiuj">Kopiuj</button></div><pre><code>' + esc(kod.replace(/\n+$/, '')) + '</code></pre></div>';
    }).join('');
  }
  function formatTekst(t) {
    var linie = esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`\n]+)`/g, '<code>$1</code>').split('\n'), out = '', lista = false, akap = [];
    function zamknijAkap() { if (akap.length) { out += '<p>' + akap.join('<br>') + '</p>'; akap = []; } }
    linie.forEach(function (l) {
      var li = /^\s*(?:•|-|\*)\s+(.*)$/.exec(l);
      if (li) { zamknijAkap(); if (!lista) { out += '<ul>'; lista = true; } out += '<li>' + li[1] + '</li>'; return; }
      if (lista) { out += '</ul>'; lista = false; }
      if (!l.trim()) zamknijAkap(); else akap.push(l);
    });
    zamknijAkap(); if (lista) out += '</ul>';
    return out;
  }
  function dodajU(t, zrzut) {
    var d = document.createElement('div'); d.className = 'msg-u'; d.textContent = t;
    if (zrzut) { var e = document.createElement('span'); e.className = 'zrzut-et'; e.textContent = '▣ zrzut · ' + zrzut; d.appendChild(e); }
    $('#feed').appendChild(d); przewin(); return d;
  }
  /* ex = wiadomość lokalna (brief, komenda): {et: etykieta kroku, brief: dane karty} */
  function dodajM(t, log, ex) {
    var d = document.createElement('div'); d.className = 'msg-m';
    d.innerHTML = '<div class="mk-av"></div><div><div class="log"></div><div class="tekst"></div><div class="ak-karty"></div></div>';
    $('#feed').appendChild(d);
    d._kot = MeshugaKot.mount(d.querySelector('.mk-av'), { ring: null });
    d.querySelector('.mk-av').style.width = '40px';
    if (log) rysujLog(d, log, true);
    if (t != null) ustawTekst(d, t, true);
    if (ex) {
      var a = d.querySelector('.akcje'); if (a) a.remove(); /* „odpowiedz jeszcze raz” wołałoby model */
      if (ex.et) d.querySelector('.tekst').insertAdjacentHTML('beforebegin', '<div class="krok-brief">' + esc(ex.et) + '</div>');
      if (ex.brief) d.querySelector('.ak-karty').appendChild(kartaBriefu(ex.brief));
    }
    return d;
  }

  /* ---------- lokalne odpowiedzi (bez modelu): brief i komendy ---------- */
  function zapewnijCzat(t) {
    if (!biezacy || biezacy.przyklad) {
      biezacy = { id: 'c' + Date.now(), tytul: t.length > 46 ? t.slice(0, 44) + '…' : t, msgs: [] };
      czaty.unshift(biezacy); czaty = czaty.slice(0, 30);
      app.classList.remove('pusty', 'widok-umiem'); $('#feed').innerHTML = '';
    }
  }
  function lokalna(m) {
    m.r = 'assistant'; m.lok = true; biezacy.msgs.push(m); zapiszCzaty();
    var d = dodajM(m.t, m.log, m); d._kot.flash(); kotHero.flash(); przewin(); return d;
  }
  function startBrief(wycena) {
    if (trwa) return;
    zapewnijCzat('Brief: nowy pomysł');
    biezacy.brief = { krok: 0, p: {}, wycena: wycena || '' };
    lokalna({ t: 'Zbierzmy to w 5 krótkich pytaniach, potem złożę brief do wysłania. Na każde możesz odpisać „pomiń”.\n\n' + PYTANIA[0][2], et: 'BRIEF · 1/5',
      log: { k: [{ t: 'brief → bez modelu', ok: true }, { t: 'brief → pytanie 1/5', ok: true }].concat(wycena ? [{ t: 'brief → wycena z kalkulatora dołączona', ok: true }] : []) } });
    rysujHistorie(); zaznacz(); wpis.focus();
  }
  function odpowiedzBrief(t) {
    var b = biezacy.brief, p = PYTANIA[b.krok];
    b.p[p[0]] = /^pomi[nń]/i.test(t.trim()) ? '' : t.trim();
    b.krok++;
    if (b.krok < PYTANIA.length) {
      lokalna({ t: PYTANIA[b.krok][2], et: 'BRIEF · ' + (b.krok + 1) + '/5', log: { k: [{ t: 'brief → odpowiedź ' + b.krok + '/5 zapisana', ok: true }, { t: 'brief → pytanie ' + (b.krok + 1) + '/5', ok: true }] } });
    } else {
      var nr = 'CS-' + String(Date.now() % 10000).padStart(4, '0');
      var dane = { nr: nr, p: b.p, wycena: b.wycena };
      delete biezacy.brief;
      lokalna({ t: 'Gotowe. Popraw, co trzeba, i wyślij nam mailem. Wycenę dostaniesz w odpowiedzi.', brief: dane, log: { k: [{ t: 'brief → 5/5 odpowiedzi', ok: true }, { t: 'brief → karta ' + nr + ' złożona', ok: true }] } });
    }
    zaznacz();
  }
  function tekstBriefu(b) {
    var w = ['Brief ' + b.nr + ' z czatu Meshugi', ''];
    PYTANIA.forEach(function (p) { w.push(p[1] + ': ' + (b.p[p[0]] || '—')); });
    if (b.wycena) w.push('', 'Wycena z kalkulatora:', b.wycena);
    return w.join('\n');
  }
  function kartaBriefu(b) {
    var art = document.createElement('article'); art.className = 'ak kat brief';
    art.innerHTML = '<div class="kod">BRIEF #' + esc(b.nr) + '</div><h3>Twój brief</h3><p>Wszystko możesz poprawić. Nic stąd nie wychodzi, dopóki sam nie wyślesz.</p><div class="pola">' +
      PYTANIA.map(function (p) { return '<label><span>' + p[1] + '</span><textarea rows="2" data-k="' + p[0] + '"></textarea></label>'; }).join('') +
      '<label><span>Wycena z kalkulatora</span><textarea rows="2" data-k="wycena" placeholder="Dodaj z kalkulatora albo zostaw puste"></textarea></label></div>' +
      '<div class="rzad"><button class="btn pelny" type="button">Kopiuj</button><a class="btn" href="mailto:' + EMAIL + '">Otwórz pocztę</a></div>';
    art.querySelectorAll('textarea').forEach(function (ta) {
      var k = ta.getAttribute('data-k'); ta.value = k === 'wycena' ? (b.wycena || '') : (b.p[k] || '');
      var wiersze = function () { ta.rows = Math.max(2, Math.min(6, ta.value.split('\n').length + (ta.value.length > 60 ? 1 : 0))); };
      wiersze();
      ta.addEventListener('input', function () { if (k === 'wycena') b.wycena = ta.value; else b.p[k] = ta.value; wiersze(); zapiszCzaty(); });
    });
    art.querySelector('button').onclick = function () { kopiuj(tekstBriefu(b), this); };
    art.querySelector('a').onclick = function () { this.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Brief ' + b.nr) + '&body=' + encodeURIComponent(tekstBriefu(b)); };
    return art;
  }
  /* kalkulator → brief: ostatnia karta briefu, brief w toku albo nowy brief */
  function doBriefu(tekst, btn) {
    var karty = $('#feed').querySelectorAll('.brief');
    if (karty.length) {
      var ta = karty[karty.length - 1].querySelector('textarea[data-k="wycena"]');
      ta.value = tekst; ta.dispatchEvent(new Event('input'));
      karty[karty.length - 1].scrollIntoView({ block: 'nearest', behavior: MeshugaKot.motion ? 'smooth' : 'auto' });
      btn.textContent = 'Dodano';
    } else if (biezacy && biezacy.brief) { biezacy.brief.wycena = tekst; btn.textContent = 'Dodano'; }
    else startBrief(tekst);
  }
  function komenda(k) {
    zamknijSlash(); wpis.value = ''; auto();
    if (k === '/nowy') { pusty(); wpis.focus(); return; }
    if (k === '/brief') { startBrief(); return; }
    if (trwa) return;
    zapewnijCzat(k === '/cena' ? 'Wycena z kalkulatora' : k === '/projekty' ? 'Nasze projekty' : 'Darmowy skan widoczności');
    biezacy.msgs.push({ r: 'user', t: k }); dodajU(k);
    var t = k === '/cena' ? 'Zaznacz, co budujemy i co do tego. Liczę tylko ceny „od” z cennika, nic nie dopisuję. [[WYCENA:pusty]]' : gotowa(k === '/projekty' ? 'projekty' : 'skan');
    lokalna({ t: t, log: { k: [{ t: 'komenda ' + k + ' → bez modelu', ok: true }].concat(krokiZeZnacznikow(rozbierz(t))) } });
    rysujHistorie(); zaznacz();
  }

  /* log: tylko to, co strona naprawdę zrobiła (wysłanie, strumień, karty z cennika) */
  function odmKroki(n) { return n === 1 ? 'KROK' : (n % 10 > 1 && n % 10 < 5 && (n % 100 < 10 || n % 100 > 20)) ? 'KROKI' : 'KROKÓW'; }
  function rysujLog(d, log, zwiniety) {
    var el = d.querySelector('.log');
    if (!log || !log.k || !log.k.length) { el.innerHTML = ''; return; }
    var li = log.k.map(function (k) { return '<li class="' + (k.ok ? 'ok' : '') + '"><span>' + esc(k.t) + '</span></li>'; }).join('');
    if (!zwiniety) { el.innerHTML = '<ol class="zyw">' + li + '</ol>'; return; }
    var czas = log.ms != null ? ' · ' + (log.ms / 1000).toFixed(1).replace('.', ',') + ' S' : '';
    el.innerHTML = '<details><summary>LOG · ' + log.k.length + ' ' + odmKroki(log.k.length) + czas + '</summary><ol>' + li + '</ol></details>';
  }
  function krokiZeZnacznikow(r) {
    var k = [];
    r.znaczniki.forEach(function (z) {
      if (z.typ === 'KARTA' && CENNIK[z.id]) k.push({ t: 'cennik → ' + CENNIK[z.id].kod, ok: true });
      else if (z.typ === 'PROJEKT' && PROJEKTY[z.id]) k.push({ t: 'projekty → ' + PROJEKTY[z.id].kod, ok: true });
      else if (z.typ === 'WYCENA') k.push({ t: 'kalkulator → ' + (z.id.split('+').filter(function (x) { return CENNIK[x]; }).join(' + ') || 'nic nie zaznaczone'), ok: true });
      else if (z.typ === 'ZESPOL') k.push({ t: 'opis dla zespołu złożony', ok: true });
    });
    return k;
  }

  /* kalkulator: tylko ceny „od” z cennika, nic dopisanego */
  var K_TYPY = ['mikro', 'skrypt', 'bot', 'app'], K_DOD = ['audyt', 'start', 'pelny', 'meta'];
  var K_DNI = { mikro: 14, skrypt: 14, bot: 14, start: 7, pelny: 14 };
  function kwota(id) { var m = /([\d\s ]+)\s*zł/.exec(CENNIK[id].c); return m ? parseInt(m[1].replace(/\D/g, ''), 10) : 0; }
  function zl(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' zł'; }
  function odm(n, a, b, c) { return n === 1 ? a : (n % 10 > 1 && n % 10 < 5 && (n % 100 < 10 || n % 100 > 20)) ? b : c; }
  function kalkulator(spec) {
    var wyb = spec.split('+'), typ = wyb.filter(function (x) { return K_TYPY.indexOf(x) > -1; })[0] || null;
    var dod = {}; wyb.forEach(function (x) { if (K_DOD.indexOf(x) > -1) dod[x] = true; });
    if (dod.pelny) delete dod.start;
    var art = document.createElement('article'); art.className = 'ak kat kalk';
    var guzik = function (id, grupa) { var c = CENNIK[id]; return '<button type="button" data-g="' + grupa + '" data-id="' + id + '"><span>' + esc(c.n) + '</span><small>' + esc(c.c) + '</small></button>'; };
    art.innerHTML = '<div class="kod">CN-KALKULATOR</div><h3>Policz swoją wycenę</h3>' +
      '<div class="gr"><div class="et">CO BUDUJEMY</div><div class="opcje">' + K_TYPY.map(function (id) { return guzik(id, 't'); }).join('') + '</div></div>' +
      '<div class="gr"><div class="et">DO TEGO</div><div class="opcje">' + K_DOD.map(function (id) { return guzik(id, 'd'); }).join('') + '</div></div>' +
      '<div class="suma"><b aria-live="polite"></b><span></span></div>' +
      '<p class="uwaga">Liczę ceny „od” z cennika. Dokładną kwotę podamy po krótkim opisie.</p>' +
      '<div class="rzad"><a class="btn pelny" href="#">Wyślij ten zestaw</a><button class="btn" type="button" data-a="kopiuj">Kopiuj</button><button class="btn" type="button" data-a="brief">Dodaj do briefu</button></div>';
    function opis() {
      var poz = (typ ? [typ] : []).concat(Object.keys(dod));
      return poz.map(function (id) { return '• ' + CENNIK[id].n + ' (' + CENNIK[id].c + ')'; }).join('\n');
    }
    function licz() {
      art.querySelectorAll('.opcje button').forEach(function (b) {
        var id = b.getAttribute('data-id');
        b.setAttribute('aria-pressed', String(b.getAttribute('data-g') === 't' ? id === typ : !!dod[id]));
      });
      var poz = (typ ? [typ] : []).concat(Object.keys(dod));
      var suma = poz.reduce(function (s, id) { return s + kwota(id); }, 0);
      var poWycenie = poz.some(function (id) { return id === 'app' || id === 'meta'; });
      var dni = poz.reduce(function (s, id) { return Math.max(s, K_DNI[id] || 0); }, 0);
      art.querySelector('.suma b').textContent = poz.length ? (suma ? 'od ' + zl(suma) : '0 zł') : '—';
      art.querySelector('.suma span').textContent = !poz.length ? 'WYBIERZ POZYCJĘ' : poWycenie ? 'TERMIN PO WYCENIE' : dni ? 'STANDARD DO ' + dni + ' DNI' : 'DO 2 DNI ROBOCZYCH';
      var a = art.querySelector('a.btn');
      a.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Wycena z kalkulatora Meshugi') + '&body=' + encodeURIComponent('Cześć, interesuje mnie:\n' + opis() + '\n\nCo ma robić:\n');
      a.toggleAttribute('aria-disabled', !poz.length);
    }
    art.addEventListener('click', function (e) {
      if (e.target.closest('a[aria-disabled]')) { e.preventDefault(); return; }
      var b = e.target.closest('.opcje button'); if (!b) return;
      var id = b.getAttribute('data-id');
      if (b.getAttribute('data-g') === 't') typ = typ === id ? null : id;
      else { if (dod[id]) delete dod[id]; else { dod[id] = true; if (id === 'pelny') delete dod.start; if (id === 'start') delete dod.pelny; } }
      licz();
    });
    art.querySelector('[data-a="kopiuj"]').onclick = function () { kopiuj('Wycena z kalkulatora Meshugi:\n' + opis(), this); };
    art.querySelector('[data-a="brief"]').onclick = function () {
      if (!typ && !Object.keys(dod).length) return;
      doBriefu(opis() + '\nRazem: ' + art.querySelector('.suma b').textContent + ', ' + art.querySelector('.suma span').textContent.toLowerCase(), this);
    };
    licz();
    return art;
  }
  function ustawTekst(d, t, koniec) {
    var r = rozbierz(t);
    d.querySelector('.tekst').innerHTML = format(r.czysty);
    if (koniec) { kartyAkcji(d, r); akcjePod(d, r.czysty); }
  }
  function stanPisze(d, on) {
    var tx = d.querySelector('.tekst');
    if (on) tx.innerHTML = '';
    d._kot.squint(on); kotHero.squint(on); kotPasek.squint(on);
    przewin();
  }
  function kartyAkcji(d, r) {
    var box = d.querySelector('.ak-karty'); box.innerHTML = '';
    var kart = 0;
    r.znaczniki.forEach(function (z) {
      if (z.typ === 'WYCENA' && !box.querySelector('.kalk')) {
        box.appendChild(kalkulator(z.id));
      } else if (z.typ === 'KARTA' && CENNIK[z.id] && kart < 2) {
        kart++; var c = CENNIK[z.id];
        box.insertAdjacentHTML('beforeend', '<article class="ak kat"><div class="kod">' + c.kod + '</div><h3>' + esc(c.n) + '</h3><p>' + esc(c.o) + '</p><div class="cena"><b>' + esc(c.c) + '</b><span>' + esc(c.t).toUpperCase() + '</span></div></article>');
      } else if (z.typ === 'PROJEKT' && PROJEKTY[z.id] && kart < 2) {
        kart++; var p = PROJEKTY[z.id];
        box.insertAdjacentHTML('beforeend', '<article class="ak kat"><div class="kod">' + p.kod + '</div><h3>' + esc(p.n) + '</h3><p>' + esc(p.o) + '</p><dl class="fakty">' + p.f.map(function (f) { return '<dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd>'; }).join('') + '</dl><div class="rzad"><a class="btn" href="https://cybersora.pl/#products" target="_blank" rel="noopener">Zobacz na stronie</a></div></article>');
      } else if (z.typ === 'ZESPOL' && !box.querySelector('.zespol')) {
        var opis = (biezacy ? biezacy.msgs.filter(function (m) { return m.r === 'user'; }).map(function (m) { return '• ' + m.t; }).join('\n') : '');
        var art = document.createElement('article'); art.className = 'ak kat zespol';
        art.innerHTML = '<div class="kod">DO-ZESPOLU</div><h3>Wyślij to do zespołu</h3><p>Złożyłem opis z naszej rozmowy. Popraw, skopiuj i wyślij na <span class="adres">' + EMAIL + '</span>.</p>' +
          '<label class="sr" for="opis' + Date.now() + '">Opis dla zespołu</label><textarea id="opis' + Date.now() + '"></textarea>' +
          '<div class="rzad"><button class="btn pelny" type="button">Kopiuj opis</button><a class="btn" href="mailto:' + EMAIL + '?subject=' + encodeURIComponent('Pomysł od Meshugi') + '">Otwórz pocztę</a></div>';
        art.querySelector('textarea').value = 'Cześć, piszę z czatu Meshugi.\n\n' + opis;
        art.querySelector('button').onclick = function () { kopiuj(art.querySelector('textarea').value, this, art.querySelector('textarea')); };
        box.appendChild(art);
      }
    });
  }
  function akcjePod(d, tekst) {
    var a = document.createElement('div'); a.className = 'akcje';
    a.innerHTML = '<button class="ikonka" aria-label="Kopiuj odpowiedź" title="Kopiuj"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8.5" y="8.5" width="11" height="11" rx="3"/><path d="M15.5 8.5V7a2.5 2.5 0 0 0-2.5-2.5H7A2.5 2.5 0 0 0 4.5 7v6A2.5 2.5 0 0 0 7 15.5h1.5"/></svg></button>' +
      '<button class="ikonka" aria-label="Odpowiedz jeszcze raz" title="Odśwież"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/></svg></button>';
    var bt = a.querySelectorAll('button');
    bt[0].onclick = function () { kopiuj(tekst, bt[0]); };
    bt[1].onclick = function () {
      if (!biezacy || trwa) return;
      var ost = biezacy.msgs[biezacy.msgs.length - 1];
      var pyt = biezacy.msgs[biezacy.msgs.length - (ost && ost.r === 'assistant' ? 2 : 1)];
      if (pyt && pyt.zrzut) { stopka('Zrzutu nie trzymam w pamięci. Żeby ocenić go jeszcze raz, dołącz go ponownie przez „+”.'); return; }
      if (ost && ost.r === 'assistant') biezacy.msgs.pop();
      d.remove(); odpowiedz();
    };
    d.querySelector('.ak-karty').after(a);
  }
  $('#feed').addEventListener('click', function (e) {
    var b = e.target.closest('.kod-kopiuj'); if (!b) return;
    kopiuj(b.closest('.kodblok').querySelector('code').textContent, b);
    b.textContent = 'Skopiowano'; setTimeout(function () { b.textContent = 'Kopiuj'; }, 1400);
  });
  function kopiuj(t, btn, poleZaznacz) {
    var ok = function () { var s = btn.getAttribute('title'); btn.setAttribute('title', 'Skopiowano'); if (btn.classList.contains('btn')) { var o = btn.textContent; btn.textContent = 'Skopiowano'; setTimeout(function () { btn.textContent = o; }, 1400); } setTimeout(function () { btn.setAttribute('title', s || ''); }, 1400); };
    try { navigator.clipboard.writeText(t).then(ok, function () { if (poleZaznacz) poleZaznacz.select(); }); } catch (e) { if (poleZaznacz) poleZaznacz.select(); }
  }
  function przewin() { var p = $('#przewijak'); requestAnimationFrame(function () { p.scrollTop = p.scrollHeight; }); }

  /* ---------- wysyłanie ---------- */
  var wpis = $('#wpis'), btnW = $('#wyslij');
  function auto() { wpis.style.height = 'auto'; wpis.style.height = Math.min(200, wpis.scrollHeight) + 'px'; if (!trwa) btnW.disabled = !wpis.value.trim() && !zrzut; }
  /* komendy „/”: podpowiedzi nad polem, strzałki + Enter, Esc zamyka */
  var slash = $('#slash'), slashLista = [], slashI = 0;
  function rysujSlash() {
    var v = wpis.value.toLowerCase();
    if (!/^\/\S*$/.test(v) || trwa) { zamknijSlash(); return; }
    slashLista = KOMENDY.filter(function (c) { return c.k.indexOf(v) === 0; });
    if (!slashLista.length) { zamknijSlash(); return; }
    slashI = Math.min(slashI, slashLista.length - 1);
    slash.innerHTML = slashLista.map(function (c, i) { return '<button type="button" role="option" id="sl' + i + '" aria-selected="' + (i === slashI) + '" data-k="' + c.k + '"><b>' + c.k + '</b><span>' + c.o + '</span></button>'; }).join('') +
      '<div class="skrot" aria-hidden="true">↑↓ WYBÓR · ENTER · ESC ZAMYKA · CTRL+K</div>';
    slash.hidden = false; wpis.setAttribute('aria-expanded', 'true'); wpis.setAttribute('aria-activedescendant', 'sl' + slashI);
  }
  function zamknijSlash() { slash.hidden = true; slashI = 0; wpis.setAttribute('aria-expanded', 'false'); wpis.removeAttribute('aria-activedescendant'); }
  slash.addEventListener('mousedown', function (e) { e.preventDefault(); });
  slash.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) komenda(b.getAttribute('data-k')); });
  wpis.addEventListener('input', function () { auto(); rysujSlash(); });
  wpis.addEventListener('blur', zamknijSlash);
  wpis.addEventListener('keydown', function (e) {
    if (!slash.hidden && slashLista.length) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); slashI = (slashI + (e.key === 'ArrowDown' ? 1 : -1) + slashLista.length) % slashLista.length; rysujSlash(); return; }
      if ((e.key === 'Enter' && !e.shiftKey && !e.isComposing) || e.key === 'Tab') { e.preventDefault(); komenda(slashLista[slashI].k); return; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); zamknijSlash(); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#pole').requestSubmit(); }
  });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (app.classList.contains('widok-umiem')) pusty();
      zamknijPanele(); zamknijSzuflade(); wpis.focus();
      if (!wpis.value) { wpis.value = '/'; auto(); }
      rysujSlash();
    }
  });
  $('#pole').addEventListener('submit', function (e) {
    e.preventDefault();
    if (trwa) { trwa.abort(); return; }
    var t = wpis.value.trim(); if (!t && !zrzut) return;
    if (!zrzut && KOMENDY.some(function (c) { return c.k === t.toLowerCase(); })) { komenda(t.toLowerCase()); return; }
    var plik = zrzut;
    if (plik && !t) t = 'Oceń mój zrzut.';
    wpis.value = ''; usunZrzut(); auto(); wyslij(t, plik);
  });
  function wyslij(t, plik) {
    if (trwa) return;
    zapewnijCzat(t);
    var m = { r: 'user', t: t };
    if (plik) { m.zrzut = opisZrzutu(plik); delete biezacy.brief; }
    biezacy.msgs.push(m);
    dodajU(t, m.zrzut); zapiszCzaty(); rysujHistorie(); zaznacz();
    if (biezacy.brief) odpowiedzBrief(t); else odpowiedz(plik);
  }
  function zapiszCzaty() { LS.set('czaty', czaty); }
  function trybPrzycisku(stop) {
    btnW.disabled = stop ? false : !wpis.value.trim() && !zrzut;
    btnW.setAttribute('aria-label', stop ? 'Zatrzymaj' : 'Wyślij');
    btnW.innerHTML = stop ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="2.5"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
  }
  function przerwij() { if (trwa) trwa.abort(); }

  var BLEDY = {
    rate_limited: 'Za dużo pytań naraz. Daj mi chwilę i spróbuj ponownie.',
    session_expired: 'Sesja wygasła. Zaloguj się ponownie, żebym mógł odpowiadać.',
    refused: 'Na to nie odpowiem. Zapytaj o nasze usługi, ceny albo projekty.',
    empty_completion: 'Nic mi z tego nie wyszło. Spróbuj zapytać krócej.',
    upstream_error: 'Połączenie się urwało. Spróbuj jeszcze raz.',
    image_rejected: 'Tego obrazka nie przeczytam. Wrzuć zrzut jako PNG, JPG albo WebP.',
    images_unavailable: 'Tutaj nie mogę oglądać obrazków. Opisz słowami, co Cię gryzie na stronie.'
  };
  var OCENA = 'Do tej wiadomości klient dołączył zrzut ekranu (swojej strony albo aplikacji). Oceń go jak cybersora: dokładnie 3 rzeczy do poprawy, każda w linii zaczynanej od „• ”, konkretnie, z tego, co naprawdę widać na zrzucie (czytelność, układ, przycisk do działania, telefon, tekst). Bez ogólników i bez wymyślania rzeczy, których nie widać. Na koniec jedno zdanie, że pełny darmowy skan widoczności sprawdzi resztę, i znacznik [[KARTA:audyt]]. Jeśli na obrazku nie ma strony ani aplikacji, powiedz to krótko i poproś o zrzut strony.';

  function odpowiedz(plik) {
    var c = biezacy, d = dodajM(null), ctl = new AbortController(); trwa = ctl;
    stanPisze(d, true); trybPrzycisku(true); zaznacz();
    var t0 = performance.now(), demo = !(sample && sampleStan === 'ok');
    var tier = plik ? 'default' : (MODELE[ust.tryb] ? ust.tryb : 'quick'), m = model(tier);
    var log = { k: [
      { t: 'pamięć rozmowy → ' + Math.min(12, c.msgs.length) + ' wiad.', ok: true },
      { t: (demo ? 'tryb pokazowy → gotowe teksty' : plik ? 'model → Pycode (ocena zrzutu)' : 'model → ' + m.n), ok: false }
    ] };
    /* Pycode myśli dłużej: licznik sekund do pierwszego słowa odpowiedzi */
    var mysliT = 0;
    if (tier === 'default' && !plik) {
      var tx0 = d.querySelector('.tekst');
      tx0.innerHTML = '<p class="mdl-mysli"><svg class="mdi mdi-pycode" aria-hidden="true"><use href="#mdlPycode"/></svg>Pycode myśli <span class="t">· 0 s</span></p>';
      mysliT = setInterval(function () { var t = d.querySelector('.mdl-mysli .t'); if (t) t.textContent = '· ' + Math.round((performance.now() - t0) / 1000) + ' s'; else clearInterval(mysliT); }, 1000);
    }
    var bezMysli = function () { clearInterval(mysliT); var e = d.querySelector('.mdl-mysli'); if (e) e.remove(); };
    if (plik) log.k.splice(1, 0, { t: 'zrzut → ' + rozmiar(plik.size), ok: true });
    var pisze = false;
    rysujLog(d, log, false);
    if (plik) d.querySelector('.tekst').innerHTML = '<p class="oglad">Oglądam zrzut…</p>';
    /* obraz leci tylko z ostatnią wiadomością; wcześniejsze zrzuty idą jako opis w tekście */
    var hist = c.msgs.slice(-12).map(function (m, i, a) {
      var tresc = m.t;
      if (m.zrzut) tresc += (i === a.length - 1 && plik) ? '\n\n' + OCENA : '\n[wcześniej dołączony zrzut: ' + m.zrzut + ', oceniony wyżej]';
      return { role: m.r, content: tresc };
    });
    var plynie = function () {
      if (pisze) return; pisze = true; bezMysli();
      log.k[1].ok = true; log.k.push({ t: 'odpowiedź płynie', ok: false }); rysujLog(d, log, false);
    };
    var koniec = function (tekst, blad) {
      if (trwa === ctl) trwa = null;
      bezMysli();
      var og = d.querySelector('.oglad'); if (og) og.remove();
      stanPisze(d, false); trybPrzycisku(false);
      log.k.forEach(function (k) { k.ok = true; });
      if (tekst) {
        var r = rozbierz(tekst);
        log.k = log.k.filter(function (k) { return k.t !== 'odpowiedź płynie'; });
        var ns = r.czysty.split(/\s+/).filter(Boolean).length;
        log.k.push({ t: 'odpowiedź → ' + ns + ' ' + odm(ns, 'słowo', 'słowa', 'słów'), ok: true });
        log.k = log.k.concat(krokiZeZnacznikow(r));
      }
      log.ms = Math.round(performance.now() - t0);
      rysujLog(d, log, true);
      if (tekst) { ustawTekst(d, tekst, true); c.msgs.push({ r: 'assistant', t: tekst, log: log }); zapiszCzaty(); d._kot.flash(); kotHero.flash(); }
      else if (!blad) d.querySelector('.tekst').innerHTML = '';
      if (blad) d.querySelector('.tekst').insertAdjacentHTML('beforeend', '<div class="blad">' + esc(blad) + '</div>');
      zaznacz(); przewin();
    };
    if (sample && sampleStan === 'ok') {
      var poszlo = false;
      var opcje = { modelTier: tier, cache: false, signal: ctl.signal };
      if (plik) opcje.images = [plik];
      sample([{ role: 'user', content: ZASADY + '\n\n' + (tier === 'default' ? ZASADY_PYCODE : ZASADY_ASTRAL) + '\n\nRozmowa zaczyna się poniżej.' }].concat(hist), Object.assign(opcje, {
        onText: function (u) { if (!poszlo) { poszlo = true; d._kot.squint(false); plynie(); } ustawTekst(d, u.text, false); przewin(); }
      })).then(function (r) {
        koniec(r.text + (r.truncated ? '\n\n(Urwałem w pół zdania. Zapytaj o mniej naraz.)' : ''));
      }, function (e) {
        var kod = e && e.code;
        if (kod === 'cancelled') return koniec(e.text || '', e.text ? null : 'Zatrzymane.');
        if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].indexOf(kod) > -1) {
          sampleStan = 'brak'; pokazDemo(); ustawPlus();
          log.k.forEach(function (k) { if (/^model/.test(k.t)) k.t = 'brak zgody → tryb pokazowy'; });
          return koniec(plik ? 'Bez zgody na rozmowę z Claude’em nie obejrzę zrzutu. W trybie pokazowym mogę opowiedzieć o darmowym skanie widoczności, który sprawdzi stronę za Ciebie. [[KARTA:audyt]]' : gotowa(c.msgs[c.msgs.length - 1].t));
        }
        if (kod === 'images_unavailable') { imgLim = null; ustawPlus(); }
        koniec(e && e.text || '', BLEDY[kod] || BLEDY.upstream_error);
      });
    } else {
      /* tryb pokazowy: gotowe odpowiedzi, pisane po kawałku */
      var cel = gotowa(c.msgs[c.msgs.length - 1].t), i = 0;
      setTimeout(function krok() {
        if (ctl.signal.aborted) return koniec(cel.slice(0, i), 'Zatrzymane.');
        if (i === 0) { d._kot.squint(false); plynie(); }
        i = Math.min(cel.length, i + 6); ustawTekst(d, cel.slice(0, i), false); przewin();
        if (i < cel.length) setTimeout(krok, MeshugaKot.motion ? 22 : 0); else koniec(cel);
      }, tier === 'default' ? 1800 : 900);
    }
  }

  function gotowa(q) {
    var t = q.toLowerCase();
    if (/\bkod|python|javascript|typescript|\bjs\b|błąd|blad|error|funkcj|pętl|petl|programowa/.test(t)) return 'Tu jestem w wersji pokazowej, więc pokażę na przykładzie. Średnia z listy w Pythonie:\n```python\nliczby = [4, 8, 15, 16, 23, 42]\nsrednia = sum(liczby) / len(liczby)\nprint(srednia)  # 18.0\n```\n`sum` dodaje wszystko, `len` liczy elementy. Z modelem pomogę z Twoim kodem. Większy projekt? Opisz go zespołowi. [[ZESPOL]]';
    if (/aplikac|program|system/.test(t)) return 'Aplikacja pod jedną firmę zaczyna się u nas od 5 000 zł, a termin podajemy po wycenie. Piszemy program pod Twoją robotę, nie pod uniwersalny formularz, więc cena zależy od tego, co ma robić.\n\nJeśli wystarczy coś mniejszego, np. skrypt albo bot, wychodzi taniej. Opisz, czego potrzebujesz albo przestaw pozycje w kalkulatorze. [[WYCENA:app]] [[ZESPOL]]';
    if (/skan|widoczn|google|seo|audyt/.test(t)) return 'Skan widoczności robimy za darmo: sprawdzamy, czy Google widzi Twoją stronę, czy działa na telefonie i czy szybko się ładuje. Raport z listą usterek dostajesz w ciągu 2 dni roboczych, bez zobowiązań.\n\nPodeślij adres strony mailem i tyle. [[KARTA:audyt]] [[KARTA:start]]';
    if (/projekt|zrobili|portfolio|pokaż|pokaz/.test(t)) return 'Kilka rzeczy, które zbudowaliśmy i które działają:\n• SalonDesk prowadzi salon beauty: wizyty, grafik, kasa, bez internetu\n• SoraFlux, darmowy konwerter wideo i obrazów\n• Pycodemath, publiczny silnik matematyki dla agentów AI\n• SOMI i MoonSora, nasze narzędzia do pracy z AI\n\nO którym opowiedzieć więcej? [[PROJEKT:salondesk]] [[PROJEKT:soraflux]]';
    if (/pomys|wyce|opisz|opiszę/.test(t)) return 'Dawaj. Napisz w paru zdaniach:\n• co program ma robić,\n• kto będzie go używał,\n• na czym teraz to robisz (Excel, kartka, inny program?).\n\nZłożę z tego opis dla zespołu, a wycenę dostaniesz mailem. [[ZESPOL]]';
    if (/bot|powiadom|discord|zamówien|zamowien/.test(t)) return 'Takie pilnowanie to pozycja „Bot”: od 1 200 zł, standard do 14 dni. Działa całą dobę i odzywa się, kiedy trzeba. [[KARTA:bot]] [[ZESPOL]]';
    if (/cen|koszt|ile|zł/.test(t)) return 'Ceny podajemy z góry. Najmniejsze zadanie to mikro-skrypt od 150 zł, skrypt od 500 zł, bot od 1 200 zł, aplikacja od 5 000 zł. Skan widoczności jest za darmo.\n\nZaznacz w kalkulatorze, co Cię interesuje, a policzę od razu. [[WYCENA:skrypt+audyt]]';
    return 'To jest wersja pokazowa i odpowiadam z gotowych tekstów, więc na to pytanie nie mam dobrej odpowiedzi. Zapytaj o ceny, darmowy skan widoczności albo nasze projekty. Pomysł mogę przekazać zespołowi. [[ZESPOL]]';
  }

  function pokazDemo() {
    $('#stopka').innerHTML = '<span class="demo">TRYB POKAZOWY</span> · odpowiedzi z gotowych tekstów. Rozmowy zostają w tej przeglądarce.';
  }

  /* ---------- modele: Astral (quick) i Pycode (default); wybór maisy 04.11, wariant C ---------- */
  var MODELE = { quick: { n: 'Astral', ik: 'mdlAstral', kl: 'mdi-astral' }, 'default': { n: 'Pycode', ik: 'mdlPycode', kl: 'mdi-pycode' } };
  function model(t) { return MODELE[t] || MODELE.quick; }
  var trybBtn = $('#trybBtn');
  function rysujTryb(anim) {
    if (!MODELE[ust.tryb]) ust.tryb = 'quick';
    var m = model(ust.tryb), inny = model(ust.tryb === 'quick' ? 'default' : 'quick');
    $('#trybNazwa').textContent = m.n; $('#trybInfo').textContent = 'MESHUGA · ' + m.n.toUpperCase();
    var ik = $('#trybIk'); ik.setAttribute('class', 'mdi ' + m.kl); ik.innerHTML = '<use href="#' + m.ik + '"/>';
    trybBtn.setAttribute('aria-label', 'Model: ' + m.n + '. Przełącz na ' + inny.n);
    trybBtn.title = 'Przełącz na ' + inny.n;
    $('#mdlKarty').querySelectorAll('.mdl-karta').forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-tryb') === ust.tryb)); });
    if (anim) { trybBtn.classList.remove('zmiana'); void trybBtn.offsetWidth; trybBtn.classList.add('zmiana'); }
  }
  function ustawModel(t) { if (t === ust.tryb) return; ust.tryb = t; zapiszUst(); rysujTryb(true); }
  trybBtn.onclick = function () { ustawModel(ust.tryb === 'quick' ? 'default' : 'quick'); };
  $('#mdlKarty').addEventListener('click', function (e) { var b = e.target.closest('.mdl-karta'); if (!b) return; ustawModel(b.getAttribute('data-tryb')); wpis.focus(); });
  $('#mdlKarty').addEventListener('keydown', function (e) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) < 0) return;
    e.preventDefault(); ustawModel(ust.tryb === 'quick' ? 'default' : 'quick');
    $('#mdlKarty').querySelector('[aria-checked="true"]').focus();
  });

  /* ---------- panele ---------- */
  function przelacz(btn, panel) {
    btn.onclick = function (e) { e.stopPropagation(); var o = panel.hidden; zamknijPanele(); panel.hidden = !o; btn.setAttribute('aria-expanded', String(o)); };
  }
  function zamknijPanele() { ['#panelKontakt', '#panelUst', '#panelKonto'].forEach(function (s) { $(s).hidden = true; }); ['#kontaktBtn', '#ustBtn', '#kontoBtn'].forEach(function (s) { $(s).setAttribute('aria-expanded', 'false'); }); }
  przelacz($('#kontaktBtn'), $('#panelKontakt'));
  przelacz($('#ustBtn'), $('#panelUst'));
  document.addEventListener('click', function (e) { if (!e.target.closest('.panel, .menu, #kontaktBtn, #ustBtn, #kontoBtn, .okno-tlo')) zamknijPanele(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!$('#oknoKonto').hidden) { Konto.zamknij(); return; } zamknijPanele(); zamknijSzuflade(); } });
  $('#kopiujAdres').onclick = function () { kopiuj(EMAIL, this); };
  $('#wyczysc').onclick = function () {
    if (this.dataset.pewne) { czaty = []; zapiszCzaty(); pusty(); this.textContent = 'Wyczyść'; delete this.dataset.pewne; return; }
    this.dataset.pewne = '1'; this.textContent = 'Na pewno?';
    var b = this; setTimeout(function () { b.textContent = 'Wyczyść'; delete b.dataset.pewne; }, 3000);
  };
  /* ---------- konto cybersory (decyzje maisy 03.11) ----------
     Jedno konto: strona + gra DancyCloud + Meshuga (Worker DancyCloud, nick + hasło, bez maila). Logowanie opcjonalne.
     Te same klucze co strona: sesja `dancycloud.sesja` = {nick, token, waznyDo}, nick gościa `dancycloud.nick`, profil okienka `meshuga-profil` = {nick, ava}.
     Na cybersora.pl (ta sama domena = wspólne localStorage) gada z prawdziwym Workerem; w artefakcie i lokalnie z udawanym serwerem,
     który trzyma tylko nicki, nigdy haseł. Rozmowy zostają w przeglądarce (konto ich nie wysyła). */
  var Konto = (function () {
    var KEY_SESJA = 'dancycloud.sesja', KEY_NICK = 'dancycloud.nick', KEY_PROFIL = 'meshuga-profil';
    var NA_ZYWO = /(^|\.)cybersora\.pl$/.test(location.hostname);
    var DC_API = 'https://dancycloud-ranking.dancycloud-ranking.workers.dev';
    var NICK_RE = /^[A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźż_.\-]{3,16}$/;
    var GOSC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5c1.2-3.3 3.9-5 7-5s5.8 1.7 7 5"/></svg>';
    var okno = $('#oknoKonto'), f = $('#fKonto'), zakl = 'log', skad = null;
    function czytaj(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
    function zapisz(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) {} }
    /* te same zasady co Worker (dancycloud\serwer: sprawdzNick, sprawdzHaslo), żeby błąd było widać od razu */
    function bladNicku(n) { n = String(n || '').normalize('NFC').trim(); if (n.length < 3) return 'Nick jest za krótki: min. 3 znaki.'; if (n.length > 16) return 'Nick jest za długi: maks. 16 znaków.'; if (!NICK_RE.test(n)) return 'Nick może mieć tylko litery, cyfry oraz _ - .'; return null; }
    function bladHasla(h, n) { h = String(h || ''); var d = Array.from(h.normalize('NFC')).length; if (d < 8) return 'Hasło jest za krótkie: min. 8 znaków.'; if (d > 128) return 'Hasło jest za długie: maks. 128 znaków.'; if (n && h.normalize('NFC').toLowerCase() === String(n).normalize('NFC').trim().toLowerCase()) return 'Hasło nie może być takie samo jak nick.'; return null; }
    function makieta(sciezka, metoda, d, token) {
      var nicki = LS.get('makieta-nicki', []), jest = function (n) { return nicki.indexOf(String(n || '').trim().toLowerCase()) > -1; };
      function ses(n) { return { nick: n.trim(), token: 'makieta.' + Math.random().toString(36).slice(2), waznyDo: new Date(Date.now() + 30 * 864e5).toISOString() }; }
      function kod() { var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = ''; for (var i = 0; i < 12; i++) { s += a[Math.random() * a.length | 0]; if (i === 3 || i === 7) s += '-'; } return s; }
      return new Promise(function (ok, nie) {
        setTimeout(function () {
          var b;
          if (sciezka === '/konto/rejestracja') {
            if ((b = bladNicku(d.nick))) return nie({ status: 422, kod: 'nick', error: b });
            if ((b = bladHasla(d.haslo, d.nick))) return nie({ status: 422, kod: 'haslo', error: b });
            if (jest(d.nick)) return nie({ status: 409, kod: 'nick_zajety', error: 'Ten nick jest już zajęty. Wybierz inny albo się zaloguj.' });
            nicki.push(d.nick.trim().toLowerCase()); LS.set('makieta-nicki', nicki);
            var r = ses(d.nick); r.kodOdzyskiwania = kod(); return ok(r);
          }
          if (sciezka === '/konto/logowanie') return jest(d.nick) && !bladHasla(d.haslo) ? ok(ses(d.nick)) : nie({ status: 401, kod: 'logowanie', error: 'Zły nick albo hasło.' });
          if (sciezka === '/konto/odzyskaj') {
            if (!jest(d.nick) || !/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(String(d.kod || '').trim())) return nie({ status: 401, kod: 'kod', error: 'Zły nick albo kod odzyskiwania.' });
            if ((b = bladHasla(d.noweHaslo, d.nick))) return nie({ status: 422, kod: 'haslo', error: b });
            var r2 = ses(d.nick); r2.kodOdzyskiwania = kod(); return ok(r2);
          }
          if (sciezka === '/konto/wyloguj') return ok({ ok: true });
          if (sciezka === '/konto' && metoda === 'GET') return token ? ok({ nick: (sesja() || {}).nick, utworzone: new Date().toISOString().slice(0, 10) }) : nie({ status: 401, kod: 'sesja', error: 'Zaloguj się ponownie.' });
          nie({ status: 404, kod: 'brak', error: 'Nie ma takiej ścieżki.' });
        }, 300);
      });
    }
    function api(sciezka, metoda, dane, token) {
      if (!NA_ZYWO) return makieta(sciezka, metoda, dane || {}, token);
      var h = { 'Content-Type': 'application/json' }; if (token) h.Authorization = 'Bearer ' + token;
      return fetch(DC_API + sciezka, { method: metoda, headers: h, body: dane ? JSON.stringify(dane) : undefined }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw { status: r.status, kod: j.kod, error: j.error || 'Serwer kont nie odpowiada. Spróbuj za chwilę.' }; return j; });
      }, function () { throw { status: 0, kod: 'siec', error: 'Brak połączenia z serwerem kont. Spróbuj za chwilę.' }; });
    }
    function sesja() {
      var s = czytaj(KEY_SESJA); if (!s || !s.token || !s.nick) return null;
      if (s.waznyDo && Date.parse(s.waznyDo) < Date.now()) { zapisz(KEY_SESJA, null); return null; }
      return s;
    }
    function awatar(nick) {
      var p = czytaj(KEY_PROFIL);
      if (nick && p && p.nick && typeof p.ava === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,/.test(p.ava) && p.nick.trim().toLowerCase() === nick.trim().toLowerCase()) return '<img alt="" src="' + p.ava + '">';
      return nick ? esc(Array.from(nick.trim())[0] || '?') : GOSC;
    }
    function rysuj() {
      var s = sesja();
      ['#awatarPasek', '#awatarPanel'].forEach(function (q) { var el = $(q); el.innerHTML = awatar(s && s.nick); el.classList.toggle('gosc', !s); });
      $('#kontoNick').textContent = s ? s.nick : 'Zaloguj się';
      $('#kontoPod').textContent = s ? 'konto cybersory' : 'opcjonalne';
      var et = s ? 'Konto: ' + s.nick : 'Zaloguj się';
      $('#kontoBtn').setAttribute('aria-label', et);
      $('#kpNick').textContent = s ? s.nick : '';
    }
    function ustawZakl(z) {
      zakl = z;
      document.querySelectorAll('#kZakladki button').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-z') === z)); });
      $('#kZakladki').hidden = z === 'odz';
      $('#kKodWrap').hidden = z !== 'odz';
      $('#kHasloEt').textContent = z === 'odz' ? 'Nowe hasło' : 'Hasło';
      $('#kHaslo').setAttribute('autocomplete', z === 'log' ? 'current-password' : 'new-password');
      $('#kWyslij').textContent = z === 'log' ? 'Zaloguj' : z === 'rej' ? 'Załóż konto' : 'Ustaw nowe hasło';
      $('#kZapomnialem').textContent = z === 'odz' ? 'Wróć do logowania' : 'Nie pamiętasz hasła?';
      $('#kZapomnialem').hidden = z === 'rej';
      $('#oknoTytul').textContent = z === 'odz' ? 'Odzyskaj konto' : 'Konto cybersory';
      $('#kBlad').textContent = '';
    }
    function otworz(z, przycisk) {
      zamknijPanele(); zamknijSzuflade(); skad = przycisk || null;
      ustawZakl(z || 'log'); f.hidden = false; $('#kKodEkran').hidden = true; $('#kMakieta').hidden = NA_ZYWO; okno.hidden = false;
      /* podpowiedź nicku: ?nick= z okienka strony albo nick gościa z gry; to tylko podpowiedź, nie logowanie */
      var podp = ''; try { podp = new URLSearchParams(location.search).get('nick') || localStorage.getItem(KEY_NICK) || ''; } catch (e) {}
      if (podp && !$('#kNick').value) $('#kNick').value = String(podp).slice(0, 16);
      setTimeout(function () { ($('#kNick').value ? $('#kHaslo') : $('#kNick')).focus(); }, 30);
    }
    function zamknij() { okno.hidden = true; $('#kHaslo').value = ''; $('#kKod').value = ''; $('#kBlad').textContent = ''; if (skad) skad.focus(); }
    function zalogowany(r) {
      zapisz(KEY_SESJA, { nick: r.nick, token: r.token, waznyDo: r.waznyDo }); zapisz(KEY_NICK, r.nick);
      $('#kHaslo').value = ''; $('#kKod').value = ''; rysuj();
      if (r.kodOdzyskiwania) { f.hidden = true; $('#kZakladki').hidden = true; $('#kKodPokaz').textContent = r.kodOdzyskiwania; $('#kKodEkran').hidden = false; $('#kZapisane').focus(); }
      else { zamknij(); stopka('Zalogowano jako ' + r.nick + '. To samo konto działa na stronie i w grze.'); setTimeout(stopkaWroc, 4000); }
    }
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = $('#kNick').value.trim(), h = $('#kHaslo').value, b = null, btn = $('#kWyslij');
      if (zakl === 'log') b = !n || !h ? 'Podaj nick i hasło.' : null;
      else b = bladNicku(n) || (zakl === 'odz' && !$('#kKod').value.trim() ? 'Podaj kod odzyskiwania.' : null) || bladHasla(h, n);
      if (b) { $('#kBlad').textContent = b; return; }
      var dane = zakl === 'odz' ? { nick: n, kod: $('#kKod').value.trim(), noweHaslo: h } : { nick: n, haslo: h };
      var tekst = btn.textContent; btn.disabled = true; btn.textContent = 'Chwila…'; $('#kBlad').textContent = '';
      api(zakl === 'log' ? '/konto/logowanie' : zakl === 'rej' ? '/konto/rejestracja' : '/konto/odzyskaj', 'POST', dane)
        .then(zalogowany, function (err) { $('#kBlad').textContent = (err && err.error) || 'Coś poszło nie tak. Spróbuj jeszcze raz.'; })
        .then(function () { btn.disabled = false; btn.textContent = tekst; });
    });
    $('#kZakladki').addEventListener('click', function (e) { var b = e.target.closest('button[data-z]'); if (b) { ustawZakl(b.getAttribute('data-z')); $('#kNick').focus(); } });
    $('#kZapomnialem').onclick = function () { ustawZakl(zakl === 'odz' ? 'log' : 'odz'); $('#kNick').focus(); };
    $('#kAnuluj').onclick = zamknij;
    okno.addEventListener('mousedown', function (e) { if (e.target === okno) zamknij(); });
    $('#kKopiujKod').onclick = function () { kopiuj($('#kKodPokaz').textContent, this); };
    $('#kZapisane').onclick = function () { zamknij(); stopka('Konto założone. To samo konto działa na stronie i w grze.'); setTimeout(stopkaWroc, 4000); };
    function klik(e) {
      e.stopPropagation(); var s = sesja(), btn = e.currentTarget;
      if (!s) { otworz('log', btn); return; }
      var p = $('#panelKonto'), o = p.hidden; zamknijPanele();
      p.hidden = !o; btn.setAttribute('aria-expanded', String(o));
      if (o) api('/konto', 'GET', null, s.token).then(function (k) { $('#kpOd').textContent = 'konto cybersory · od ' + k.utworzone; }, function (err) { if (err && err.status === 401) { zapisz(KEY_SESJA, null); rysuj(); p.hidden = true; } });
    }
    $('#kontoBtn').addEventListener('click', klik);
    $('#wyloguj').onclick = function () {
      var s = sesja(); zapisz(KEY_SESJA, null); rysuj(); zamknijPanele();
      if (s) api('/konto/wyloguj', 'POST', {}, s.token).catch(function () {});
      stopka('Wylogowano. Rozmowy zostają w tej przeglądarce.'); setTimeout(stopkaWroc, 4000);
    };
    addEventListener('storage', function (e) { if (e.key === KEY_SESJA || e.key === KEY_PROFIL) rysuj(); }); /* logowanie w drugiej karcie strony */
    return { rysuj: rysuj, zamknij: zamknij, otworz: otworz, naZywo: NA_ZYWO };
  })();

  /* ---------- „Oceń mój zrzut”: wybór, upuszczenie albo wklejenie obrazka ---------- */
  var plikIn = $('#plik'), zalUrl = null;
  function rozmiar(b) { return b < 1024 * 1024 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1048576).toFixed(1).replace('.', ',') + ' MB'; }
  function opisZrzutu(f) { return (f.name || 'zrzut') + ', ' + rozmiar(f.size); }
  function mozeObrazki() { return !!(sample && sampleStan === 'ok' && imgLim); }
  function ustawPlus() {
    var b = $('#plus'), on = mozeObrazki();
    b.classList.toggle('brak', !on);
    b.title = on ? 'Oceń mój zrzut: dołącz obrazek strony albo aplikacji' : 'Ocena zrzutu działa, gdy Meshuga rozmawia przez Claude’a';
    if (imgLim && imgLim.mediaTypes && imgLim.mediaTypes.length) plikIn.accept = imgLim.mediaTypes.join(',');
  }
  function dolacz(f) {
    if (!f) return;
    if (!mozeObrazki()) { stopka(sampleStan === 'ok' ? 'Tutaj nie mogę oglądać obrazków. Opisz słowami, co Cię gryzie na stronie.' : 'Ocenę zrzutu robi Claude, a w trybie pokazowym go nie ma. Zapytaj o darmowy skan widoczności.'); return; }
    var typy = imgLim.mediaTypes || [];
    if (typy.length && typy.indexOf(f.type) < 0) { stopka('Ten plik to nie obrazek, który przeczytam. Wrzuć PNG, JPG albo WebP.'); return; }
    if (imgLim.maxInputBytes && f.size > imgLim.maxInputBytes) { stopka('Zrzut jest za duży (' + rozmiar(f.size) + '). Najwyżej ' + rozmiar(imgLim.maxInputBytes) + '.'); return; }
    usunZrzut(); zrzut = f;
    try { zalUrl = URL.createObjectURL(f); $('#zalImg').src = zalUrl; } catch (e) { $('#zalImg').removeAttribute('src'); }
    $('#zalNazwa').textContent = f.name || 'zrzut'; $('#zalInfo').textContent = rozmiar(f.size) + ' · do oceny';
    $('#zal').hidden = false; app.classList.add('ma-zal'); stopkaWroc(); auto();
    if (!wpis.value.trim()) wpis.placeholder = 'Dopisz pytanie albo wyślij sam zrzut';
    wpis.focus();
  }
  function usunZrzut() {
    zrzut = null; $('#zal').hidden = true; app.classList.remove('ma-zal'); $('#zalImg').removeAttribute('src');
    if (zalUrl) { try { URL.revokeObjectURL(zalUrl); } catch (e) {} zalUrl = null; }
    wpis.placeholder = 'Zapytaj Meshugę albo wpisz /'; auto();
  }
  $('#plus').onclick = function () { if (trwa) return; if (!mozeObrazki()) return dolacz({}); plikIn.value = ''; plikIn.click(); };
  plikIn.onchange = function () { if (plikIn.files && plikIn.files[0]) dolacz(plikIn.files[0]); };
  $('#zalUsun').onclick = function () { usunZrzut(); wpis.focus(); };
  var poleEl = $('#pole');
  poleEl.addEventListener('dragover', function (e) { if (e.dataTransfer && [].indexOf.call(e.dataTransfer.types, 'Files') > -1) { e.preventDefault(); poleEl.classList.add('upuszczam'); } });
  poleEl.addEventListener('dragleave', function (e) { if (!poleEl.contains(e.relatedTarget)) poleEl.classList.remove('upuszczam'); });
  poleEl.addEventListener('drop', function (e) { poleEl.classList.remove('upuszczam'); var f = e.dataTransfer && e.dataTransfer.files[0]; if (f) { e.preventDefault(); dolacz(f); } });
  wpis.addEventListener('paste', function (e) {
    var it = e.clipboardData && [].find.call(e.clipboardData.items, function (i) { return i.kind === 'file' && /^image\//.test(i.type); });
    if (it) { e.preventDefault(); dolacz(it.getAsFile()); }
  });

  /* ---------- mikrofon: Web Speech API pl-PL (Chrome, Edge) ---------- */
  var stopkaPrzed = null;
  function stopka(t) { if (stopkaPrzed == null) stopkaPrzed = $('#stopka').innerHTML; $('#stopka').textContent = t; }
  function stopkaWroc() { if (stopkaPrzed != null) { $('#stopka').innerHTML = stopkaPrzed; stopkaPrzed = null; } }
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null, mikroBtn = $('#mikro');
  function kotySluchaja(on) { kotHero.slucha(on); kotPasek.slucha(on); }
  /* Ramka artefaktu claude.ai blokuje mikrofon od razu (not-allowed, bez pytania; pomiar 03.11),
     więc tam ikona znika. Na stronie cybersory głos zostaje. */
  function schowajMikro() { if (rec) { try { rec.abort(); } catch (e) {} } mikroBtn.hidden = true; }
  var wRamce = !!(window.claude && window.claude.use);
  if (wRamce) schowajMikro();
  else if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: 'microphone' }).then(function (p) { if (p.state === 'denied') schowajMikro(); }, function () {});
  }
  if (!SR) {
    mikroBtn.classList.add('brak'); mikroBtn.title = 'Głos działa w Chrome i Edge'; mikroBtn.setAttribute('aria-label', 'Głos niedostępny w tej przeglądarce');
    mikroBtn.onclick = function () { stopka('Rozmowa głosem działa w Chrome i Edge. Tu wpisz pytanie z klawiatury.'); };
  } else mikroBtn.onclick = function () {
    if (rec) { rec.stop(); return; }
    if (trwa) return;
    var baza = wpis.value.trim() ? wpis.value.replace(/\s*$/, ' ') : '', blad = null;
    rec = new SR(); rec.lang = 'pl-PL'; rec.interimResults = true; rec.continuous = false;
    rec.onresult = function (e) { var t = ''; for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; wpis.value = baza + t; auto(); };
    rec.onerror = function (e) { blad = e.error; };
    rec.onend = function () {
      rec = null; mikroBtn.setAttribute('aria-pressed', 'false'); mikroBtn.setAttribute('aria-label', 'Mów do Meshugi'); kotySluchaja(false); stopkaWroc();
      if (blad === 'not-allowed' || blad === 'service-not-allowed') { schowajMikro(); stopka('Przeglądarka nie dała dostępu do mikrofonu, więc chowam ikonę. Wpisz pytanie z klawiatury.'); }
      else if (blad === 'no-speech') stopka('Nic nie usłyszałem. Kliknij mikrofon i mów po polsku.');
      else if (blad && blad !== 'aborted') stopka('Głos się nie udał (' + blad + '). Spróbuj jeszcze raz albo wpisz pytanie.');
      else wpis.focus();
    };
    try { rec.start(); } catch (e) { rec = null; stopka('Nie mogę włączyć mikrofonu w tej przeglądarce.'); return; }
    mikroBtn.setAttribute('aria-pressed', 'true'); mikroBtn.setAttribute('aria-label', 'Zakończ słuchanie'); kotySluchaja(true);
    stopka('Słucham… mów po polsku. Kliknij mikrofon jeszcze raz, żeby skończyć.');
  };

  /* ---------- telefon: klawiatura ---------- */
  if (window.visualViewport) {
    var vv = window.visualViewport;
    var kb = function () { var d = Math.max(0, window.innerHeight - vv.height - vv.offsetTop); document.documentElement.style.setProperty('--kb', d + 'px'); };
    vv.addEventListener('resize', kb); vv.addEventListener('scroll', kb);
  }

  /* ---------- start ---------- */
  motyw(); zwin(!!ust.zwiniety); rysujTryb(); ustawTlo(); Lot.start(); Konto.rysuj(); rysujHistorie(); zaznacz();
  /* pytanie z okienka na stronie („Czatuj” przenosi je w ?q=): wysyłamy raz, gdy wiadomo, czy jest model,
     a ?q= znika z adresu, żeby odświeżenie nie wysłało go drugi raz */
  var pytanieStrony = '';
  try {
    var adres = new URL(location.href);
    pytanieStrony = (adres.searchParams.get('q') || '').trim().slice(0, 500);
    if (adres.searchParams.has('q')) { adres.searchParams.delete('q'); history.replaceState(history.state, '', adres.pathname + adres.search + adres.hash); }
  } catch (e) {}
  function zadajZeStrony() { var q = pytanieStrony; pytanieStrony = ''; if (q) wyslij(q); }
  if (window.claude && window.claude.use) {
    window.claude.use('sample').then(function (s) {
      sample = s; sampleStan = s ? 'ok' : 'brak';
      if (!s) { pokazDemo(); ustawPlus(); zadajZeStrony(); return; }
      /* limits() jest lokalne: bez zgody i bez kosztu */
      (s.limits ? s.limits() : Promise.reject()).then(function (l) { imgLim = (l && l.images) || null; ustawPlus(); }, function () { imgLim = null; ustawPlus(); });
      zadajZeStrony();
    }, function () { sampleStan = 'brak'; pokazDemo(); ustawPlus(); zadajZeStrony(); });
  } else { sampleStan = 'brak'; pokazDemo(); ustawPlus(); zadajZeStrony(); }
})();
