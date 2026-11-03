/* Oferta v10 (02.11.2026): wycieczki po ekranach programów, ekran punktu z powiększeniem, scena Pycodemath,
   zwijana dokumentacja na telefonie. Wszystko w obrębie .ov10, bez globalnych nazw. */
(function () {
  var root = document.querySelector('.ov10');
  if (!root) return;
  function $(s) { return root.querySelector(s); }
  function el(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }

  /* Punkty: bx, by, bw, bh = podświetlany obszar w % obrazu; numer stoi w jego lewym górnym rogu. */
  var TOURY = {
    salon: [
      {id: 'pulpit', nazwa: 'Pulpit', img: 'oferta-v10/pulpit.webp', w: 1920, h: 1080, alt: 'SalonDesk: pulpit dnia z kafelkami kasy, wizyt, obłożenia i zobowiązań', pins: [
        {bx: 13.3, by: 24.4, bw: 66, bh: 12.3, t: 'Cały dzień w czterech liczbach', d: 'Wpływ do kasy, wizyty dzisiaj, obłożenie gabinetów i zobowiązania z pakietów. Właścicielka widzi stan salonu od razu po otwarciu.', po: 'Zamiast przeglądać kasę, kalendarz i pakiety osobno, masz cały dzień w jednym rzędzie.'},
        {bx: 13.3, by: 38.3, bw: 66, bh: 18.8, t: 'Kto dziś pracuje i co ma następne', d: 'Lista zespołu z godzinami zmiany i najbliższą wizytą każdej osoby. Pracownik na urlopie albo z wolnym dniem jest oznaczony.', po: 'Wiesz, kto jest w pracy i co robi za chwilę, bez dzwonienia do zespołu.'},
        {bx: 80, by: 24.4, bw: 18.7, bh: 29.3, t: 'Rzeczy, które czekają na decyzję', d: 'Wnioski o zmianę grafiku, niepotwierdzone zapisy i braki w magazynie. Każda pozycja ma przycisk „Otwórz”.', po: 'Nic nie ginie w wiadomościach: wszystko, co czeka na Ciebie, jest na jednej liście.'},
        {bx: 80, by: 55.2, bw: 18.7, bh: 44.8, t: 'Pakiety klientek w toku', d: 'Kto ile zabiegów z pakietu już wykorzystał i do kiedy ważny jest karnet. Pasek postępu zamiast liczenia w zeszycie.', po: 'Salon nie traci pieniędzy na zapomnianych pakietach i nie spiera się z klientką o liczbę wizyt.'}
      ]},
      {id: 'kalendarz', nazwa: 'Kalendarz', img: 'oferta-v10/kalendarz.webp', w: 1920, h: 1080, alt: 'SalonDesk: kalendarz dnia z kolumnami pracowników', pins: [
        {bx: 24.5, by: 6.5, bw: 26, bh: 5.5, t: 'Podsumowanie dnia', d: 'Liczba wizyt, obsadzone gabinety i obłożenie w procentach, razem z godzinami otwarcia salonu.'},
        {bx: 60.7, by: 34, bw: 20.2, bh: 11.6, t: 'Wizyta poza grafikiem pracownika', d: 'Program zaznacza wizytę, której nie da się zrobić w godzinach tej osoby. Widać to, zanim klientka przyjdzie.'},
        {bx: 18, by: 54, bw: 20.2, bh: 3.9, t: 'Przerwa pracownika', d: 'Przerwa jest w kalendarzu jak wizyta, więc nikt nie wpisze klientki na ten czas.'},
        {bx: 18, by: 82.8, bw: 20.2, bh: 7.6, t: 'Brak uprawnień do zabiegu', d: 'Jeśli pracownik nie ma uprawnień do danego zabiegu, np. do epilacji laserowej, wizyta dostaje znacznik ostrzeżenia.'}
      ]},
      {id: 'kasa', nazwa: 'Kasa', img: 'oferta-v10/kasa-rozliczenie.webp', w: 1920, h: 1080, alt: 'SalonDesk: kasa z cennikiem i paragonem', pins: [
        {bx: 13.3, by: 13, bw: 66, bh: 80, t: 'Cennik jednym kliknięciem', d: 'Zabiegi i produkty pogrupowane po kategoriach, z ceną i czasem trwania. Klik dodaje pozycję do paragonu.'},
        {bx: 80.9, by: 39.7, bw: 17, bh: 4.8, t: 'Cztery formy płatności', d: 'Gotówka, karta, bon i pakiet. Jeden paragon można rozliczyć kilkoma formami naraz.'},
        {bx: 80.9, by: 51.6, bw: 17.5, bh: 8.8, t: 'Paragon zapisuje się w bazie salonu', d: 'Przycisk „Zamknij paragon” zamyka rozliczenie. Dane zostają w salonie, na tym komputerze.'}
      ]}
    ],
    moon: [
      {id: 'blad', nazwa: 'Błąd w teście', img: 'zrzuty_projektow/moonsora.webp', w: 1600, h: 1000, alt: 'MoonSora: terminal z nieudanym testem i asystentem obok', pins: [
        {bx: 4.1, by: 50.5, bw: 45.5, bh: 17.3, t: 'Błąd jest widoczny od razu', d: 'Nieudany test jest podświetlony na czerwono, z kodem wyjścia. Nie trzeba szukać go w ścianie tekstu.'},
        {bx: 51.2, by: 32.5, bw: 14.2, bh: 17, t: 'Asystent obok terminala', d: 'Pytasz „dlaczego to się wysypało?”, a asystent odpowiada przy tym samym błędzie. Nie przełączasz się do innego okna.'},
        {bx: 37.7, by: 84, bw: 9.4, bh: 4.2, t: 'Zapytaj o błąd jednym przyciskiem', d: 'Zaznaczony fragment wyniku idzie do asystenta przyciskiem na dolnym pasku.'},
        {bx: 3.6, by: 29, bw: 41, bh: 4.6, t: 'Karty na każde zadanie', d: 'Każde zadanie ma własną kartę, a u góry jest wyszukiwarka i układ okien. Kilka rzeczy naraz bez kilku okien.'}
      ]}
    ]
  };

  var dlg = $('.ov-dlg'), wyk = $('.ov-wykroj'), aktywny = null, opener = null;
  var D = {poz: $('[data-o="poz"]'), kod: $('[data-o="kod"]'), tyt: $('[data-o="tyt"]'), tekst: $('[data-o="tekst"]'), po: $('.ov-po'), poT: $('[data-o="po"]'), seg: $('.ov-seg'), prev: $('[data-o="prev"]'), next: $('[data-o="next"]'), zam: $('[data-o="zam"]')};
  var widziany = false; try { widziany = !!localStorage.getItem('oferta-numer-klikniety'); } catch (e) {}
  function zgasPodpowiedz() { widziany = true; root.querySelectorAll('.ov-wabi').forEach(function (p) { p.classList.remove('ov-wabi'); }); try { localStorage.setItem('oferta-numer-klikniety', '1'); } catch (e) {} }

  /* Pola dotyku 44 px nie mogą na siebie zachodzić: rozsuwamy numery po wyrenderowaniu. */
  function rozsun(plansza, pins, dane) {
    var W = plansza.clientWidth, H = plansza.clientHeight; if (!W || !H) return;
    var S = 44, P = pins.map(function (b, i) { var p = dane[i]; return {b: b, x: Math.min(Math.max(p.bx, 3), 97) / 100 * W, y: Math.min(Math.max(p.by, 4.5), 96) / 100 * H}; });
    for (var it = 0; it < 40; it++) { var r = false;
      for (var i = 0; i < P.length; i++) for (var j = i + 1; j < P.length; j++) {
        var dx = P[j].x - P[i].x, dy = P[j].y - P[i].y, ox = S - Math.abs(dx), oy = S - Math.abs(dy);
        if (ox > 0 && oy > 0) { r = true;
          if (oy <= ox) { var s = dy >= 0 ? 1 : -1; P[j].y += s * (oy + 1) / 2; P[i].y -= s * (oy + 1) / 2; }
          else { var t = dx >= 0 ? 1 : -1; P[j].x += t * (ox + 1) / 2; P[i].x -= t * (ox + 1) / 2; } } }
      P.forEach(function (q) { q.x = Math.min(Math.max(q.x, S / 2), W - S / 2); q.y = Math.min(Math.max(q.y, S / 2), H - S / 2); });
      if (!r) break; }
    P.forEach(function (q) { q.b.style.left = (q.x / W * 100) + '%'; q.b.style.top = (q.y / H * 100) + '%'; });
  }

  function zbuduj(box) {
    var tabs = TOURY[box.getAttribute('data-tour')], kod = box.getAttribute('data-kod');
    var tablist = box.querySelector('.ov-zakladki'), plansza = box.querySelector('.ov-plansza'), lista = box.querySelector('.ov-punkty');
    if (!widziany) plansza.classList.add('ov-wabi');
    var plaski = []; tabs.forEach(function (t, ti) { t.pins.forEach(function (p, pi) { plaski.push({ti: ti, pi: pi}); }); });
    var tour = {tabs: tabs, kod: kod, plaski: plaski, cur: 0, pokazTab: null};
    var img = el('img'); img.width = tabs[0].w; img.height = tabs[0].h; img.loading = 'lazy'; img.decoding = 'async'; plansza.appendChild(img);
    var pins = [], tab = 0, zbtns = [];
    function pokazTab(ti) {
      tab = ti; var t = tabs[ti];
      img.src = t.img; img.alt = t.alt; img.width = t.w; img.height = t.h;
      pins.forEach(function (b) { b.remove(); }); lista.innerHTML = '';
      pins = t.pins.map(function (p, i) {
        var b = el('button', 'ov-pin', '<span>' + (i + 1) + '</span>'); b.type = 'button';
        b.setAttribute('aria-label', 'Punkt ' + (i + 1) + ': ' + p.t + '. Powiększ');
        b.addEventListener('click', function () { opener = b; otworz(tour, ti, i); });
        plansza.appendChild(b); return b; });
      t.pins.forEach(function (p, i) {
        var li = el('li'), b = el('button', null, '<b>' + (i + 1) + '</b><span>' + p.t + '</span><small>powiększ</small>'); b.type = 'button';
        b.addEventListener('click', function () { opener = b; otworz(tour, ti, i); }); li.appendChild(b); lista.appendChild(li); });
      zbtns.forEach(function (b, k) { b.setAttribute('aria-selected', k === ti ? 'true' : 'false'); });
      rozsun(plansza, pins, t.pins);
    }
    zbtns = tabs.map(function (t, ti) {
      var b = el('button', 'ov-zak', t.nazwa); b.type = 'button'; b.setAttribute('role', 'tab');
      b.addEventListener('click', function () { pokazTab(ti); }); tablist.appendChild(b); return b; });
    tour.pokazTab = function (ti) { if (ti !== tab) pokazTab(ti); };
    img.addEventListener('load', function () { rozsun(plansza, pins, tabs[tab].pins); });
    if (window.ResizeObserver) new ResizeObserver(function () { rozsun(plansza, pins, tabs[tab].pins); }).observe(plansza);
    pokazTab(0);
  }

  /* wykrój: obszar punktu z małym marginesem, powiększony jako tło */
  function wytnij(t, p) {
    var m = 2, x0 = Math.max(0, p.bx - m), y0 = Math.max(0, p.by - m * 1.6), x1 = Math.min(100, p.bx + p.bw + m), y1 = Math.min(100, p.by + p.bh + m * 1.6);
    var w = x1 - x0, h = y1 - y0;
    wyk.style.aspectRatio = (w / 100 * t.w) + ' / ' + (h / 100 * t.h);
    wyk.style.backgroundImage = 'url(' + t.img + ')';
    wyk.style.backgroundSize = (100 / w * 100) + '% ' + (100 / h * 100) + '%';
    wyk.style.backgroundPosition = (w >= 100 ? 0 : x0 / (100 - w) * 100) + '% ' + (h >= 100 ? 0 : y0 / (100 - h) * 100) + '%';
    wyk.setAttribute('aria-label', 'Powiększony fragment: ' + p.t);
    dlg.classList.toggle('ov-szeroki', (w / 100 * t.w) / (h / 100 * t.h) > 1.7);
  }
  function wypelnij(tour, idx) {
    tour.cur = idx; var q = tour.plaski[idx], t = tour.tabs[q.ti], p = t.pins[q.pi];
    tour.pokazTab(q.ti);
    D.poz.textContent = (tour.tabs.length > 1 ? t.nazwa + ' · ' : '') + 'punkt ' + (q.pi + 1) + ' z ' + t.pins.length;
    D.kod.textContent = tour.kod + '-' + t.id.toUpperCase() + '-0' + (q.pi + 1);
    D.tyt.textContent = p.t; D.tekst.textContent = p.d;
    D.po.hidden = !p.po; D.poT.textContent = p.po || '';
    D.seg.innerHTML = ''; tour.plaski.forEach(function (_, k) { var e = el('i'); if (k <= idx) e.className = 'on'; D.seg.appendChild(e); });
    D.next.textContent = idx === tour.plaski.length - 1 ? 'Od początku ↺' : 'Następny punkt →';
    wytnij(t, p);
    dlg.classList.remove('ov-anim'); void dlg.offsetWidth; dlg.classList.add('ov-anim');
  }
  function otworz(tour, ti, pi) {
    zgasPodpowiedz(); aktywny = tour;
    var idx = tour.plaski.findIndex(function (q) { return q.ti === ti && q.pi === pi; });
    wypelnij(tour, idx);
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
  }
  function krok(d) { var n = aktywny.plaski.length; wypelnij(aktywny, (aktywny.cur + d + n) % n); }
  D.zam.addEventListener('click', function () { dlg.close(); });
  D.prev.addEventListener('click', function () { krok(-1); });
  D.next.addEventListener('click', function () { krok(1); });
  dlg.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') krok(1); if (e.key === 'ArrowLeft') krok(-1); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', function () { if (opener && document.contains(opener)) opener.focus(); });
  root.querySelectorAll('[data-tour]').forEach(zbuduj);

  /* Pycodemath: wyniki skopiowane 1:1 z wywołania pycodemath 0.5.0 (PyPI), 02.11.2026. */
  var KOD_ZLY = '<span class="c"># sums.py: ma zsumować 1 + 2 + … + n</span>\ndef sum_to(n):\n    total = 0\n    for i in <span class="zle">range(n)</span>:\n        total += i\n    return total';
  var KOD_OK = '<span class="c"># sums.py po poprawce</span>\ndef sum_to(n):\n    total = 0\n    for i in <span class="dobre">range(n + 1)</span>:\n        total += i\n    return total';
  var CMD = '\n\n<span class="c">$</span> python -m pycodemath "verify code sums.py:sum_to == n*(n+1)/2\n    where n: integer, n>=0"\n';
  var KROKI = [
    {t: 'Kod, który wygląda dobrze', d: 'Funkcja ma sumować liczby od 1 do n. Na oko działa, a w pętli brakuje ostatniej liczby. Taki błąd łatwo przechodzi przez testy.', h: KOD_ZLY},
    {t: 'Pycodemath znajduje błąd', d: 'Program porównuje kod ze wzorem i podaje dokładne wejście, przy którym wynik jest zły. Potem uruchamia kod, żeby to potwierdzić.', h: KOD_ZLY + CMD + '<span class="w-zly">REFUTED</span> (execution): sum_to(n=1) returns 0,\nthe formula gives 1'},
    {t: 'Po poprawce jest dowód', d: 'Po zmianie jednej linijki program dowodzi, że kod zgadza się ze wzorem dla każdego n. To dowód, a nie „chyba działa”.', h: KOD_OK + CMD + '<span class="w-ok">VERIFIED</span> (symbolic): the function minus\nthe formula simplifies to 0'}
  ];
  var term = $('.ov-term'), opisP = $('.ov-krok'), ul = $('[data-o="kroki"]'), graj = $('.ov-graj'), kb = [], kTimer = null, cur = 0;
  if (term && opisP && ul && graj) {
    KROKI.forEach(function (k, i) { var li = el('li'), b = el('button', null, '<b>' + (i + 1) + '</b><span>' + k.t + '</span><small>krok</small>'); b.type = 'button';
      b.addEventListener('click', function () { stop(); cur = krokP(i); }); li.appendChild(b); ul.appendChild(li); kb.push(b); });
    var krokP = function (i) { term.innerHTML = KROKI[i].h; opisP.innerHTML = '<span class="nr">Krok ' + (i + 1) + ' z 3</span><b>' + KROKI[i].t + '</b><span>' + KROKI[i].d + '</span>';
      kb.forEach(function (b, k) { b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); }); return i; };
    var stop = function () { clearTimeout(kTimer); kTimer = null; graj.textContent = '▶ Odtwórz po kolei'; };
    var dalej = function () { cur = krokP(cur + 1); if (cur >= KROKI.length - 1) { stop(); return; } kTimer = setTimeout(dalej, 4200); };
    cur = krokP(0);
    graj.addEventListener('click', function () { if (kTimer) { stop(); return; } if (cur >= KROKI.length - 1) cur = krokP(0); graj.textContent = '❚❚ Pauza'; kTimer = setTimeout(dalej, 2600); });
  }

  /* na telefonie dokumentacja zwinięta, na większych ekranach rozwinięta */
  if (window.matchMedia && matchMedia('(max-width:760px)').matches) root.querySelectorAll('.ov-zw').forEach(function (d) { d.open = false; });
})();
