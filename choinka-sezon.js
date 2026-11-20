/* Choinka na Starcie (sezon 19.11–6.01). Decyzje maisy 18.11: choinka zamiast tła hero (wariant A:
   h1, lead i przyciski zostają z lewej, pas faktów schowany), telefon dostaje obraz zapasowy.
   Poza sezonem ten plik nic nie robi: bez three.min.js (670 KB) i choinka.js (190 KB).
   Data = czas lokalny przeglądarki. ?choinka=1 / ?choinka=0 wymusza włączenie / wyłączenie (podgląd przed sezonem).
   Źródło sceny: Documents\EKSPANSJA CYBERSORY\choinka\choinka.html → buduj-strona.js → choinka/. */
(function () {
  'use strict';
  // Telefon: true = 3D także na telefonie. Włączyć dopiero po pomiarze z Redmi 14 (≥ 30 kl./s na poziomie „niska”).
  var TELEFON_3D = false;

  var wym = /[?&]choinka=([01])/.exec(location.search);
  var d = new Date(), m = d.getMonth(), dz = d.getDate();
  // 19.11 maisa: start sezonu od razu (od 19.11), nie od 1.12.
  var sezon = wym ? wym[1] === '1' : (m === 10 && dz >= 19) || (m === 11) || (m === 0 && dz <= 6);
  if (!sezon) return;
  var hero = document.querySelector('.hero--start');
  if (!hero) return;

  // U1 maisy (19.11): odliczanie do Wigilii w lewym górnym rogu hero. Element strony, nie sceny: działa bez 3D, na telefonie
  // i przy „ogranicz ruch”. Do 24.12 00:00 dni, godziny, minuty; 24–26.12 „wesołych świąt”; 27.12–6.01 nie ma go wcale.
  // Poza sezonem (podgląd ?choinka=1) liczy do najbliższej Wigilii tego roku.
  function odliczanie(now) {
    var r = now.getFullYear(), mc = now.getMonth();
    if (mc === 0 || now >= new Date(r, 11, 27)) return null;
    if (now >= new Date(r, 11, 24)) return 'wesołych świąt';
    var s = Math.floor((new Date(r, 11, 24) - now) / 1000), dni = Math.floor(s / 86400), dd = function (n) { return (n < 10 ? '0' : '') + n; };
    return [dni + ' ' + (dni === 1 ? 'dzień' : 'dni') + ' ' + dd(Math.floor(s / 3600) % 24) + ' h ' + dd(Math.floor(s / 60) % 60) + ' min'];
  }
  if (odliczanie(d)) {
    var odl = document.createElement('p'), opis = document.createElement('span'), czas = document.createElement('span');
    odl.className = 'hero__odliczanie'; opis.className = 'hero__odliczanie-k';
    odl.appendChild(opis); odl.appendChild(document.createTextNode(' ')); odl.appendChild(czas); // spacja w tekście, nie tylko odstęp: czytnik ekranu
    var wpisz = function () {
      var t = odliczanie(new Date());
      if (!t) { odl.hidden = true; return; }           // strona otwarta przez północ 26/27.12
      opis.hidden = typeof t === 'string';
      opis.textContent = opis.hidden ? '' : 'do Wigilii';
      czas.textContent = opis.hidden ? t : t[0];
    };
    wpisz();
    hero.insertBefore(odl, hero.firstChild);
    document.documentElement.classList.add('choinka-odl');
    setInterval(wpisz, 15000);
  }

  // ten sam warunek „telefonu” co w scenie (choinka.js)
  var telefon = Math.min(innerWidth, innerHeight) < 700 || !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  // 19.11 (critique): „ogranicz ruch” na komputerze = hero jak poza sezonem (scena w trybie hero dalej rysuje śnieg i zorzę); odliczanie zostaje
  var malyRuch = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (malyRuch && !(telefon && !TELEFON_3D)) return;
  var tlo = document.createElement('div');
  tlo.className = 'hero__choinka';
  tlo.setAttribute('aria-hidden', 'true'); // ozdoba za h1: czytnik ekranu zaczyna od nagłówka
  if (telefon && !TELEFON_3D) {
    var img = document.createElement('img');
    img.src = 'choinka/zapas.webp?v=12'; // podbić przy każdym nowym obrazie (bez tego telefon dostaje starą kopię z pamięci podręcznej)
    img.alt = '';
    img.width = 703; img.height = 900; img.decoding = 'async';
    tlo.appendChild(img);
    tlo.classList.add('hero__choinka--obraz');
  } else {
    var ramka = document.createElement('iframe');
    ramka.src = 'choinka/index.html?v=20261120a#hero'; // ?v= podbijać razem ze zmianą sceny (HTML sceny też siedzi w pamięci podręcznej)
    ramka.title = 'Choinka cybersory';
    ramka.tabIndex = -1; // Tab idzie od paska prosto do przycisków hero, nie przez 8 prezentów w scenie
    ramka.setAttribute('allow', 'autoplay');
    // 19.11: scena wchodzi dopiero po załadowaniu (skrypty sceny są synchroniczne, pierwsza klatka zaraz po load)
    // 20.11 (lagi): sandbox bez allow-same-origin = osobny proces (Chrome/Edge 117+). Scena 3D nie dzieli już wątku ze stroną,
    // więc jej klatki i budowanie sceny nie blokują przewijania. Scena nie sięga do rodzica ani do localStorage; fonty idą z ACAO: *.
    ramka.setAttribute('sandbox', 'allow-scripts');
    ramka.addEventListener('load', function () { setTimeout(function () { tlo.classList.add('gotowa'); }, 120); });
    tlo.appendChild(ramka);
  }
  hero.insertBefore(tlo, hero.firstChild);
  document.documentElement.classList.add('choinka-sezon');
})();
