/*! programy-slownik (05.11.2026, K0): słownik osiągnięć programów cybersory dla strony + walidator kontraktu v1.
 *  Program wysyła tylko klucze i liczby (KONTRAKT_OSIAGNIECIA_PROGRAMOW.md); nazwy, opisy, ikony i emblematy rang
 *  rysuje strona z tego pliku. Wpis „czytnik” = 1:1 z SoraEbookReadera (sora-rodzina-repo, apps/soraczytnik:
 *  i18n/pl.json „osiag.*”, ikonyCzytnika.ts, osiagniecia.rs RANGI/ODZNAKI). Zmiana tam = zmiana tu, w tej samej wersji kontraktu
 *  wolno tylko DOKŁADAĆ klucze. Ten sam walidator (waliduj) ma powtórzyć Worker (K2). */
(function (G) {
  'use strict';
  if (G.CybersoraProgramy) return;

  var FORMAT = 'cybersora.osiagniecia';
  var WERSJA = 1;

  /* ikony odznak (siatka 24, wypełnienie currentColor), ścieżki skopiowane z ikonyCzytnika.ts */
  var IKONY = {
    read: '<path d="M3 5.6c0-.9.8-1.6 1.7-1.5 2.6.2 4.8 1 6.3 2.3V20c-1.6-1.2-3.8-1.9-6.4-2.1-.9-.1-1.6-.8-1.6-1.7V5.6Zm18 0c0-.9-.8-1.6-1.7-1.5-2.6.2-4.8 1-6.3 2.3V20c1.6-1.2 3.8-1.9 6.4-2.1.9-.1 1.6-.8 1.6-1.7V5.6Z"/>',
    lib: '<rect x="3" y="4" width="4.5" height="16" rx="1.6"/><rect x="8.5" y="6.5" width="4.5" height="13.5" rx="1.6"/><rect x="14.2" y="5" width="4.5" height="15" rx="1.6" transform="rotate(-14 16.4 12.5)"/>',
    manga: '<rect x="3" y="3" width="9.5" height="11" rx="2"/><rect x="14" y="3" width="7" height="6.5" rx="2"/><rect x="14" y="11" width="7" height="10" rx="2"/><rect x="3" y="15.5" width="9.5" height="5.5" rx="2"/>',
    voice: '<path d="M4 9.5c0-.6.5-1 1-1h3l4.4-3.7c.7-.5 1.6-.1 1.6.7v13c0 .8-.9 1.2-1.6.7L8 15.5H5c-.5 0-1-.4-1-1v-5Z"/><path d="M16.6 8.3a1 1 0 0 1 1.4.2 6 6 0 0 1 0 7 1 1 0 1 1-1.6-1.2 4 4 0 0 0 0-4.6 1 1 0 0 1 .2-1.4Z"/>',
    mark: '<path d="M6 4.5C6 3.7 6.7 3 7.5 3h9c.8 0 1.5.7 1.5 1.5v15.3c0 .8-.9 1.3-1.6.8L12 17.6l-4.4 3c-.7.5-1.6 0-1.6-.8V4.5Z"/>',
    cup: '<path fill-rule="evenodd" d="M7 3h10v2h3a1 1 0 0 1 1 1v1.5a4.5 4.5 0 0 1-4.4 4.5A5 5 0 0 1 13 14.9V17h3c.6 0 1 .4 1 1v2c0 .6-.4 1-1 1H8a1 1 0 0 1-1-1v-2c0-.6.4-1 1-1h3v-2.1A5 5 0 0 1 7.4 12 4.5 4.5 0 0 1 3 7.5V6a1 1 0 0 1 1-1h3V3Zm10 4v3a2.5 2.5 0 0 0 2-2.5V7h-2ZM5 7v.5A2.5 2.5 0 0 0 7 10V7H5Z"/>',
    flame: '<path d="M12.2 2.5c.5 2.7 2.2 4.1 3.8 5.7 1.6 1.7 2.8 3.6 2.8 6.1A6.6 6.6 0 0 1 12.2 21a6.6 6.6 0 0 1-6.6-6.6c0-2.4 1.1-4.1 2.5-5.6.2 1.6.9 2.7 2.1 3.3-.4-3.5.6-6.8 2-9.6Z"/>',
    moon: '<path d="M14.6 3a8.6 8.6 0 1 0 6.4 14 7.2 7.2 0 0 1-6.4-14Z"/>',
    sun: '<circle cx="12" cy="12" r="4.6"/><g><rect x="10.8" y="1.6" width="2.4" height="3.6" rx="1.2"/><rect x="10.8" y="18.8" width="2.4" height="3.6" rx="1.2"/><rect x="1.6" y="10.8" width="3.6" height="2.4" rx="1.2"/><rect x="18.8" y="10.8" width="3.6" height="2.4" rx="1.2"/><rect x="10.8" y="1.6" width="2.4" height="3.6" rx="1.2" transform="rotate(45 12 12)"/><rect x="10.8" y="1.6" width="2.4" height="3.6" rx="1.2" transform="rotate(135 12 12)"/><rect x="10.8" y="1.6" width="2.4" height="3.6" rx="1.2" transform="rotate(225 12 12)"/><rect x="10.8" y="1.6" width="2.4" height="3.6" rx="1.2" transform="rotate(315 12 12)"/></g>',
    clock: '<path fill-rule="evenodd" d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm-1.1 4.5v5.6l4 2.4 1.1-1.8-2.9-1.7V7.5h-2.2Z"/>',
    pen: '<path d="M15.6 3.6a2 2 0 0 1 2.8 0l2 2a2 2 0 0 1 0 2.8l-9.6 9.6-4.8-4.8 9.6-9.6ZM5.2 14.4l4.4 4.4-1.6 1.6H3.6v-4.4l1.6-1.6Z"/><rect x="12" y="19.4" width="9" height="2.2" rx="1.1"/>',
    rtl: '<path d="M11.5 5.3a1.2 1.2 0 0 1 0 1.7l-5 5 5 5a1.2 1.2 0 1 1-1.7 1.7L4 12.9a1.2 1.2 0 0 1 0-1.7l5.8-5.9a1.2 1.2 0 0 1 1.7 0Zm8 0a1.2 1.2 0 0 1 0 1.7l-5 5 5 5a1.2 1.2 0 1 1-1.7 1.7L12 12.9a1.2 1.2 0 0 1 0-1.7l5.8-5.9a1.2 1.2 0 0 1 1.7 0Z"/>',
    pages: '<rect x="4" y="6" width="12" height="15" rx="2"/><path d="M8 3.5c0-.3.2-.5.5-.5H18a2 2 0 0 1 2 2v12.5c0 .3-.2.5-.5.5H18V6a1 1 0 0 0-1-1H8V3.5Z" opacity=".55"/>',
    notatka: '<path d="M6 3h12a2 2 0 0 1 2 2v9h-4a2 2 0 0 0-2 2v5H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M15.6 21v-4.4c0-.3.2-.6.6-.6H20l-4.4 5Z" opacity=".55"/>',
    kalendarz: '<rect x="6.6" y="2" width="2.4" height="5" rx="1.2"/><rect x="15" y="2" width="2.4" height="5" rx="1.2"/><path fill-rule="evenodd" d="M5.5 4.6h13A2.5 2.5 0 0 1 21 7.1V19a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 19V7.1a2.5 2.5 0 0 1 2.5-2.5ZM6.5 12.3a1.3 1.3 0 1 0 2.6 0 1.3 1.3 0 1 0-2.6 0Zm4.2 0a1.3 1.3 0 1 0 2.6 0 1.3 1.3 0 1 0-2.6 0Zm4.2 0a1.3 1.3 0 1 0 2.6 0 1.3 1.3 0 1 0-2.6 0ZM6.5 16.6a1.3 1.3 0 1 0 2.6 0 1.3 1.3 0 1 0-2.6 0Zm4.2 0a1.3 1.3 0 1 0 2.6 0 1.3 1.3 0 1 0-2.6 0Z"/>'
  };

  /* P1 (05.11): na stronie jeden styl ikon odznak = „linia” zatwierdzona w P0 (kreska 2, okrągłe końce, przerwa w linii,
     kropka-węzeł w kolorze --wezel). Bryły wyżej zostają jako wzór 1:1 z czytnika (apka ma swoje), strona ich nie rysuje. */
  var W = ' fill="var(--wezel,#f6f2f3)" stroke="none"';
  var LINIA = {
    read: '<path d="M12 7.6C9.4 5.8 6.4 5.4 3.4 6.2v11.4c3-.8 6-.4 8.6 1.4V7.6z"/><path d="M12 7.6c2.6-1.8 5.6-2.2 8.6-1.4v7.2M20.6 17.1v.5c-3-.8-6-.4-8.6 1.4"/><circle cx="20.6" cy="15.3" r="1.6"' + W + '/>',
    flame: '<path d="M12.2 3.2c1.5 3.4 5.6 5.4 5.6 10.6a5.8 5.8 0 0 1-11.6 0c0-2.2.9-3.9 2.3-5.2"/><path d="M12 20.2a2.5 2.5 0 0 1-2.5-2.5c0-1.7 1.4-2.6 2.5-3.9 1.1 1.3 2.5 2.2 2.5 3.9"/><circle cx="10.2" cy="5.6" r="1.6"' + W + '/>',
    moon: '<path d="M20 14.4A8.4 8.4 0 1 1 9.6 4"/><path d="M9.6 4a6.9 6.9 0 0 0 6.6 9.7"/><circle cx="18" cy="6" r="1.6"' + W + '/><path d="M18 2.8v.9M18 8.3v.9M14.8 6h.9M20.3 6h.9" stroke-width="1.6"/>',
    sun: '<path d="M15.9 10.6A4.2 4.2 0 1 1 13.4 8"/><circle cx="15.6" cy="8.4" r="1.6"' + W + '/><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4"/>',
    clock: '<path d="M20.5 12A8.5 8.5 0 1 1 15 4.1"/><path d="M12 7.6V12l3 2"/><circle cx="18.6" cy="6.2" r="1.6"' + W + '/>',
    lib: '<path d="M4 4.5h3.6v15H4zM10 4.5h3.6v15H10zM16.1 5.6l3.4-.9 2.4 9.4M22.4 16.3l.4 1.6-3.4.9-3.3-13.2"/><circle cx="22.1" cy="15.1" r="1.45"' + W + '/>',
    pages: '<path d="M19 11v9.5H6V3.5h8.5L19 8M14.5 3.5V8H19"/><path d="M9.5 12.5h4.5M9.5 16h6"/><circle cx="17" cy="12.5" r="1.6"' + W + '/>',
    pen: '<path d="M14.3 5.7l1.4-1.4 4 4-9.8 9.8-4.6 1 1-4.6 6-6"/><path d="M13 7l4 4"/><circle cx="4.6" cy="20.4" r="1.6"' + W + '/>',
    voice: '<path d="M4 10.5v3M8 7.5v9M12 4.5v5.5M12 14v5.5M16 7.5v9M20 10.5v3"/><circle cx="12" cy="12" r="1.6"' + W + '/>',
    manga: '<path d="M13 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7"/><path d="M4 11.5h9M13 4v16M20 16.5V18a2 2 0 0 1-2 2h-1.5"/><circle cx="16.5" cy="9" r="1.6"' + W + '/>',
    rtl: '<path d="M16.5 12H5M9.5 7.5 5 12l4.5 4.5"/><circle cx="20" cy="12" r="1.65"' + W + '/>',
    notatka: '<path d="M19 11.5V4H5v16h9l5-5"/><path d="M14 20v-5h5M8.5 8.5h7M8.5 12h4"/><circle cx="19" cy="8" r="1.6"' + W + '/>',
    mark: '<path d="M17 9.5v11l-5-3.8-5 3.8v-17h6.5"/><circle cx="16.6" cy="3.7" r="1.6"' + W + '/>',
    kalendarz: '<path d="M13 20H4V6.5h16V14"/><path d="M4 10.5h16M8.5 3.5v4M15.5 3.5v4M8 14h1.5M11.5 14H13M8 17h1.5"/><circle cx="19.6" cy="17.6" r="1.6"' + W + '/>',
    user: '<path d="M12.6 6.4A3.6 3.6 0 1 1 9.5 4.4"/><path d="M3 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M18.5 7.5v6M15.5 10.5h6"/><circle cx="11.6" cy="4.6" r="1.45"' + W + '/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7"/><circle cx="12.2" cy="19.8" r="1.6"' + W + '/>',
    cam: '<path d="M20 12.5V19H4V8h3.2L9 5.2h6L16.8 8H20v1.5"/><path d="M15.4 13a3.4 3.4 0 1 1-1.3-2.7"/><circle cx="18" cy="10.6" r="1.45"' + W + '/>',
    cart: '<path d="M3 4h2.5l2.2 11h10.6L20.5 7H11"/><circle cx="9" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/><circle cx="7.6" cy="7" r="1.55"' + W + '/>',
    music: '<path d="M9 18V5.5l7-1.3M20 3.5V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/><circle cx="18.4" cy="3.8" r="1.55"' + W + '/>',
    bolt: '<path d="M11.4 21 12 16H5l8-12.5"/><path d="M14.6 3.5 14 9h5.5l-4.4 6.7"/><circle cx="13.9" cy="17.9" r="1.55"' + W + '/>',
    cup: '<path d="M17 8.5a5 5 0 0 1-10 0V4h6.5"/><path d="M7 6H4.5a3 3 0 0 0 2.8 4M17 6h2.5a3 3 0 0 1-2.8 4M12 13.5V17M8 20.5h8"/><circle cx="16.6" cy="4.1" r="1.55"' + W + '/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    ok: '<path d="M5 12.5 10 17l9-10" stroke-width="2.6"/>'
  };

  /* ---------------- ranga cybersory (P0 zatwierdzone 05.11: „rangi są spoko”) ----------------
     Suma XP ze wszystkich źródeł; rangi czytnika R1–R7 zostają w jego karcie. Godła: kafel jak ikona aplikacji (rx 28/120),
     obecna ranga na krwi z białym znakiem, przyszłe wygaszone, symbole g-1…g-5 z płótna P0, pod znakiem 5 miejsc. */
  var RANGI_CS = [
    { pl: 'Szum', xp: 0, motyw: 'rozsypane piksele' }, { pl: 'Sygnał', xp: 1000, motyw: 'fala sygnału' },
    { pl: 'Węzeł', xp: 3000, motyw: 'sieć węzłów' }, { pl: 'Rdzeń', xp: 7000, motyw: 'rdzeń w pancerzu' },
    { pl: 'Blackwall', xp: 15000, motyw: 'mur z pasm danych' }
  ];
  var nrClip = 0;
  function znakRangi(n) {
    switch (n) {
      case 1: return '<g class="cg-k"><rect x="28" y="30" width="12" height="12"/><rect x="50" y="46" width="7" height="7"/><rect x="64" y="24" width="16" height="16"/><rect x="36" y="60" width="9" height="9"/><rect x="76" y="54" width="9" height="9"/><rect x="58" y="68" width="6" height="6"/></g><rect x="86" y="36" width="8" height="8" class="cg-a"/>';
      case 2: return '<path d="M22 64 38 44 52 60 68 32 82 50 93 36" fill="none" class="cg-ks" stroke-width="9" stroke-linejoin="miter" stroke-linecap="square"/><path d="M90 24H102V36L96 42 90 36Z" class="cg-a"/>';
      case 3: return '<path d="M34 66 60 28 86 66ZM60 28V54M34 66 60 54 86 66" fill="none" class="cg-ks" stroke-width="5"/><g class="cg-k"><path d="M34 56 44 66 34 76 24 66Z"/><path d="M60 18 70 28 60 38 50 28Z"/><path d="M86 56 96 66 86 76 76 66Z"/></g><path d="M60 45 69 54 60 63 51 54Z" class="cg-a"/>';
      case 4: return '<path d="M44 18H76L92 34V66L76 82H44L28 66V34ZM47 27 37 37V63L47 73H73L83 63V37L73 27Z" class="cg-k" fill-rule="evenodd"/><path d="M52 36H68L74 42V58L68 64H52L46 58V42Z" class="cg-a"/>';
      default:
        var id = 'cgc' + (++nrClip);
        return '<clipPath id="' + id + '"><path d="M36 20H98V68L90 76H22V34Z"/></clipPath><g clip-path="url(#' + id + ')"><g class="cg-k"><rect x="22" y="20" width="38" height="8"/><rect x="65" y="20" width="33" height="8"/><rect x="22" y="31" width="18" height="8"/><rect x="45" y="31" width="53" height="8"/><rect x="22" y="53" width="30" height="8"/><rect x="57" y="53" width="41" height="8"/><rect x="22" y="64" width="56" height="12"/><rect x="83" y="64" width="15" height="12"/></g><rect x="22" y="42" width="50" height="8" class="cg-a"/><rect x="77" y="42" width="21" height="8" class="cg-a"/></g>';
    }
  }
  /* stan: 'krew' = obecna ranga, '' = zdobyta wcześniej, 'zab' = jeszcze przed tobą. Kolory w profil.css (.cg, .cg--krew, .cg--zab). */
  function svgGodla(n, stan) {
    var b = '';
    for (var i = 0; i < 5; i++) b += '<rect x="' + (25 + i * 15) + '" y="90" width="10" height="7" rx="1.5" class="' + (i < n ? 'cg-on' : 'cg-off') + '"/>';
    return '<svg class="cg' + (stan ? ' cg--' + stan : '') + '" viewBox="0 0 120 120" aria-hidden="true" focusable="false">' +
      '<rect width="120" height="120" rx="28" class="cg-t"/><rect x="1" y="1" width="118" height="118" rx="27" class="cg-h"/>' + znakRangi(n) + b + '</svg>';
  }
  function rangaCS(xp) {
    var i = 0;
    for (var j = 0; j < RANGI_CS.length; j++) if (xp >= RANGI_CS[j].xp) i = j;
    var nast = RANGI_CS[i + 1] || null;
    return { nr: i + 1, nazwa: RANGI_CS[i].pl, od: RANGI_CS[i].xp, nast: nast,
      proc: nast ? Math.max(0, Math.min(100, (xp - RANGI_CS[i].xp) / (nast.xp - RANGI_CS[i].xp) * 100)) : 100 };
  }
  /* odznaki strony i DancyCloud: przyznaje serwer konta (konto-api), tu tylko nazwy, opisy, ikony i XP */
  var ZRODLA_CS = {
    strona: { nazwa: 'cybersora.pl', krotko: 'strona', odznaki: [
      { klucz: 'konto', ikona: 'user', xp: 100, pl: ['Założone konto', 'Załóż konto na cybersora.pl.'] },
      { klucz: 'czytnik', ikona: 'link', xp: 150, pl: ['Połączony czytnik', 'Połącz SoraEbookReader z kontem.'] },
      { klucz: 'zamowienie', ikona: 'cart', xp: 200, pl: ['Pierwsze zamówienie', 'Wyślij pierwsze zamówienie z koszyka.'] },
      { klucz: 'zdjecie', ikona: 'cam', xp: 100, pl: ['Własne zdjęcie', 'Potwierdź konto i bądź z nami 7 dni. Zdjęcie przejdzie przegląd.'] }
    ] },
    dancy: { nazwa: 'DancyCloud', krotko: 'DancyCloud', odznaki: [
      { klucz: 'pierwszy_taniec', ikona: 'music', xp: 100, pl: ['Pierwszy taniec', 'Zagraj pierwszą rundę w DancyCloud.'] },
      { klucz: 'dziesiec_rund', ikona: 'bolt', xp: 200, pl: ['Dziesięć rund', 'Zagraj 10 rund na jednym koncie.'] },
      { klucz: 'piec_tysiecy', ikona: 'cup', xp: 300, pl: ['Pięć tysięcy', 'Zdobądź 5 000 punktów w jednej rundzie.'] }
    ] }
  };

  /* Emblemat rangi (siatka 64), geometria 1:1 z emblematRangi() czytnika: kafel 60 rx 17, zamknięta książka, kreski poziomu.
     Kolory przez zmienne --em-* (programy.css): zdobyta = kafel krew, zablokowana = ink z obwódką. */
  function emblemat(poziom, maks) {
    var lv = Math.min(maks || 7, Math.max(1, Math.round(poziom)));
    var k = '';
    for (var i = 0; i < lv; i++) k += '<rect x="' + (32 - (lv * 6 - 2) / 2 + i * 6) + '" y="49" width="4" height="6" rx="1.5" style="fill:var(--em-kreski)"/>';
    return '<rect x="2" y="2" width="60" height="60" rx="17" style="fill:var(--em-kafel);stroke:var(--em-obwodka);stroke-width:2"/>' +
      '<rect x="17" y="12" width="7" height="31" rx="2" style="fill:var(--em-grzbiet)"/>' +
      '<rect x="27" y="12" width="20" height="24" rx="2.5" style="fill:var(--em-kartki)"/>' +
      '<path d="M33 9h8v15l-4-3.6-4 3.6Z" style="fill:var(--em-zakladka)"/>' +
      '<rect x="29" y="38.5" width="16" height="4.5" rx="1.5" style="fill:var(--em-kartki)"/>' + k;
  }

  var PROGRAMY = {
    czytnik: {
      nazwa: 'SoraEbookReader',
      krotko: 'czytnik',
      ikona: 'read',
      emblemat: emblemat,
      // RANGI z osiagniecia.rs: próg XP rangi R1…R7
      rangi: [
        { pl: 'Nowicjusz', en: 'Novice', xp: 0 },
        { pl: 'Czytelnik', en: 'Reader', xp: 500 },
        { pl: 'Kartkowicz', en: 'Page Turner', xp: 1500 },
        { pl: 'Mól książkowy', en: 'Bookworm', xp: 3500 },
        { pl: 'Bibliofil', en: 'Bibliophile', xp: 7000 },
        { pl: 'Archiwista', en: 'Archivist', xp: 12000 },
        { pl: 'Strażnik Archiwum', en: 'Keeper of the Archive', xp: 20000 }
      ],
      xpMaks: 1000000,
      // kolejność = kolejność siatki w czytniku (ODZNAKI w osiagniecia.rs)
      odznaki: [
        { klucz: 'pierwsza_strona', ikona: 'read', xp: 50, pl: ['Pierwsza strona', 'Przeczytaj pierwszą stronę w czytniku.'], en: ['First page', 'Read your first page in the reader.'] },
        { klucz: 'seria_7', ikona: 'flame', xp: 200, pl: ['Tydzień z książką', 'Czytaj 7 dni z rzędu.'], en: ['A week with a book', 'Read 7 days in a row.'] },
        { klucz: 'seria_30', ikona: 'flame', xp: 500, pl: ['Miesiąc z książką', 'Czytaj 30 dni z rzędu.'], en: ['A month with a book', 'Read 30 days in a row.'] },
        { klucz: 'nocny_marek', ikona: 'moon', xp: 100, pl: ['Nocny marek', 'Czytaj co najmniej 5 minut między północą a 4:00.'], en: ['Night owl', 'Read at least 5 minutes between midnight and 4 AM.'] },
        { klucz: 'ranny_ptak', ikona: 'sun', xp: 150, pl: ['Ranny ptak', 'Czytaj co najmniej 5 minut między 4:00 a 7:00.'], en: ['Early bird', 'Read at least 5 minutes between 4 and 7 AM.'] },
        { klucz: 'maraton', ikona: 'clock', xp: 250, pl: ['Maraton', 'Dwie godziny w jednej sesji.'], en: ['Marathon', 'Two hours in a single session.'] },
        { klucz: 'klasyka', ikona: 'lib', xp: 300, pl: ['Klasyka', 'Skończ 5 książek.'], en: ['Classics', 'Finish 5 books.'] },
        { klucz: 'tysiac_stron', ikona: 'pages', xp: 200, pl: ['Tysiąc stron', 'Przeczytaj łącznie 1000 stron.'], en: ['A thousand pages', 'Read 1000 pages in total.'] },
        { klucz: 'zakreslacz', ikona: 'pen', xp: 100, pl: ['Zakreślacz', 'Zrób 50 zakreśleń.'], en: ['Highlighter', 'Make 50 highlights.'] },
        { klucz: 'sluchacz', ikona: 'voice', xp: 150, pl: ['Słuchacz', 'Godzina czytania na głos.'], en: ['Listener', 'One hour of read-aloud.'] },
        { klucz: 'caly_tom', ikona: 'manga', xp: 100, pl: ['Cały tom', 'Przeczytaj cały tom mangi albo komiksu.'], en: ['Whole volume', 'Finish a whole manga or comic volume.'] },
        { klucz: 'prawo_do_lewa', ikona: 'rtl', xp: 150, pl: ['Prawo do lewa', 'Trzy tomy w kierunku prawo → lewo.'], en: ['Right to left', 'Three volumes read right → left.'] },
        { klucz: 'notatnik', ikona: 'notatka', xp: 200, pl: ['Notatnik', 'Dopisz notatkę do 20 zakreśleń.'], en: ['Notebook', 'Add a note to 20 highlights.'] },
        { klucz: 'kolekcjoner', ikona: 'mark', xp: 300, pl: ['Kolekcjoner', 'Zbierz 50 pozycji w bibliotece.'], en: ['Collector', 'Have 50 items in your library.'] }
      ],
      // odznaki z kluczem zmiennym: roczne wyzwanie („wyzwanie_2026”, próg = liczba książek z ustawień czytnika)
      dynamiczne: [
        { wzor: /^wyzwanie_(20\d\d)$/, ikona: 'kalendarz', xp: 300, zProgiem: true,
          pl: function (m, prog) { return ['Wyzwanie ' + m[1], 'Przeczytaj ' + prog + ' książek w roku ' + m[1] + '.']; },
          en: function (m, prog) { return [m[1] + ' challenge', 'Read ' + prog + ' books in ' + m[1] + '.']; } }
      ],
      // jedyne pola „podsumowania”, które czytnik może wysłać
      podsumowanie: { przeczytane: { maks: 100000, pl: 'przeczytane', en: 'finished' } }
    }
  };

  /* ---------------- odczyt dla UI ---------------- */
  function opisOdznaki(program, klucz, prog, jezyk) {
    var p = PROGRAMY[program]; if (!p) return null;
    var j = jezyk === 'en' ? 'en' : 'pl';
    for (var i = 0; i < p.odznaki.length; i++) {
      var o = p.odznaki[i];
      if (o.klucz === klucz) return { klucz: klucz, nazwa: o[j][0], opis: o[j][1], ikona: o.ikona, xp: o.xp, stala: true };
    }
    for (var k = 0; k < p.dynamiczne.length; k++) {
      var d = p.dynamiczne[k], m = d.wzor.exec(klucz);
      if (m) { var t = d[j](m, prog || '?'); return { klucz: klucz, nazwa: t[0], opis: t[1], ikona: d.ikona, xp: d.xp, stala: false }; }
    }
    return null;
  }
  function rangaZXp(program, xp) {
    var r = PROGRAMY[program].rangi, n = 1;
    for (var i = 0; i < r.length; i++) if (xp >= r[i].xp) n = i + 1;
    return n;
  }
  function svgIkony(n, styl) {
    if (styl === 'bryla') return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">' + (IKONY[n] || IKONY.cup) + '</svg>';
    return '<svg class="ik-linia" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      (LINIA[n] || LINIA.cup) + '</svg>';
  }
  function svgEmblematu(program, poziom, zablokowana) {
    var p = PROGRAMY[program];
    return '<svg class="pg-emblemat" viewBox="0 0 64 64" aria-hidden="true" focusable="false"' + (zablokowana ? ' data-zablokowana=""' : '') + '>' +
      p.emblemat(poziom, p.rangi.length) + '</svg>';
  }

  /* ---------------- walidator kontraktu v1 (ten sam ma być w Workerze) ----------------
     Zwraca { ok: true, dane } (dane = oczyszczona kopia) albo { ok: false, pole, blad }. */
  var MIN_MS = 1704067200000;            // 2024-01-01: wcześniejsze daty to błąd zegara albo podróbka
  var KLUCZE = ['format', 'wersja', 'program', 'wersja_programu', 'policzono_ms', 'ranga', 'xp', 'odznaki', 'podsumowanie'];
  function calk(v, min, max) { return typeof v === 'number' && Math.floor(v) === v && v >= min && v <= max; }
  function zle(pole, blad) { return { ok: false, pole: pole, blad: blad }; }
  function waliduj(program, c, teraz) {
    teraz = teraz || Date.now();
    var p = PROGRAMY[program];
    if (!p) return zle('program', 'Nieznany program.');
    if (!c || typeof c !== 'object' || Array.isArray(c)) return zle('', 'Treść musi być obiektem JSON.');
    for (var k in c) if (Object.prototype.hasOwnProperty.call(c, k) && KLUCZE.indexOf(k) < 0) return zle(k, 'Nieznane pole: ' + k + '.');
    if (c.format !== FORMAT) return zle('format', 'Zły format.');
    if (c.wersja !== WERSJA) return zle('wersja', 'Nieobsługiwana wersja kontraktu.');
    if (c.program !== program) return zle('program', 'Program w treści nie zgadza się z adresem.');
    if (typeof c.wersja_programu !== 'string' || !/^[0-9A-Za-z.+-]{1,20}$/.test(c.wersja_programu)) return zle('wersja_programu', 'Zła wersja programu.');
    var gora = teraz + 86400000;
    if (!calk(c.policzono_ms, MIN_MS, gora)) return zle('policzono_ms', 'Zła chwila przeliczenia.');
    if (!calk(c.xp, 0, p.xpMaks)) return zle('xp', 'XP poza zakresem.');
    if (!calk(c.ranga, 1, p.rangi.length)) return zle('ranga', 'Ranga poza zakresem.');
    if (c.ranga !== rangaZXp(program, c.xp)) return zle('ranga', 'Ranga nie pasuje do XP.');
    if (!Array.isArray(c.odznaki) || c.odznaki.length > 64) return zle('odznaki', 'Lista odznak: najwyżej 64.');
    var widziane = {}, odz = [];
    for (var i = 0; i < c.odznaki.length; i++) {
      var o = c.odznaki[i], s = 'odznaki[' + i + ']';
      if (!o || typeof o !== 'object' || Array.isArray(o)) return zle(s, 'Odznaka musi być obiektem.');
      for (var kk in o) if (Object.prototype.hasOwnProperty.call(o, kk) && ['klucz', 'zdobyta_ms', 'prog'].indexOf(kk) < 0) return zle(s + '.' + kk, 'Nieznane pole odznaki.');
      if (typeof o.klucz !== 'string' || !/^[a-z0-9_]{1,40}$/.test(o.klucz)) return zle(s + '.klucz', 'Zły klucz odznaki.');
      if (widziane[o.klucz]) return zle(s + '.klucz', 'Odznaka powtórzona.');
      widziane[o.klucz] = 1;
      var opis = opisOdznaki(program, o.klucz, 1);
      if (!opis) return zle(s + '.klucz', 'Nieznana odznaka: ' + o.klucz + '.');
      if (!calk(o.zdobyta_ms, MIN_MS, c.policzono_ms + 60000)) return zle(s + '.zdobyta_ms', 'Zła data zdobycia.');
      var czysta = { klucz: o.klucz, zdobyta_ms: o.zdobyta_ms };
      if (opis.stala) { if (o.prog !== undefined) return zle(s + '.prog', 'Stała odznaka nie ma progu.'); }
      else { if (!calk(o.prog, 1, 1000)) return zle(s + '.prog', 'Wyzwanie potrzebuje progu 1–1000.'); czysta.prog = o.prog; }
      odz.push(czysta);
    }
    var pod = {};
    if (c.podsumowanie !== undefined) {
      if (!c.podsumowanie || typeof c.podsumowanie !== 'object' || Array.isArray(c.podsumowanie)) return zle('podsumowanie', 'Podsumowanie musi być obiektem.');
      for (var pk in c.podsumowanie) {
        if (!Object.prototype.hasOwnProperty.call(c.podsumowanie, pk)) continue;
        var def = p.podsumowanie[pk];
        if (!def) return zle('podsumowanie.' + pk, 'Nieznane pole podsumowania.');
        if (!calk(c.podsumowanie[pk], 0, def.maks)) return zle('podsumowanie.' + pk, 'Liczba poza zakresem.');
        pod[pk] = c.podsumowanie[pk];
      }
    }
    return { ok: true, dane: { format: FORMAT, wersja: WERSJA, program: program, wersja_programu: c.wersja_programu,
      policzono_ms: c.policzono_ms, ranga: c.ranga, xp: c.xp, odznaki: odz, podsumowanie: pod } };
  }

  G.CybersoraProgramy = {
    format: FORMAT, wersja: WERSJA, programy: PROGRAMY,
    opisOdznaki: opisOdznaki, rangaZXp: rangaZXp, svgIkony: svgIkony, svgEmblematu: svgEmblematu, waliduj: waliduj,
    MAKS_BAJTOW: 8192,
    // P1: profil cybersory
    cs: { rangi: RANGI_CS, ranga: rangaCS, svgGodla: svgGodla, zrodla: ZRODLA_CS }
  };
})(typeof window !== 'undefined' ? window : globalThis);   // P3b2: Worker importuje ten sam plik (kopia przez `npm run reguly`)
