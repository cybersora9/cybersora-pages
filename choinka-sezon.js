/* Choinka na Starcie (sezon 1.12–6.01). Decyzje maisy 18.11: choinka zamiast tła hero (wariant A:
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
  var sezon = wym ? wym[1] === '1' : (m === 11) || (m === 0 && dz <= 6);
  if (!sezon) return;
  var hero = document.querySelector('.hero--start');
  if (!hero) return;

  // ten sam warunek „telefonu” co w scenie (choinka.js)
  var telefon = Math.min(innerWidth, innerHeight) < 700 || !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  var tlo = document.createElement('div');
  tlo.className = 'hero__choinka';
  if (telefon && !TELEFON_3D) {
    var img = document.createElement('img');
    img.src = 'choinka/zapas.webp';
    img.alt = 'Czarna choinka cybersory z czerwonymi i białymi bombkami, robocikiem z kocimi uszami na czubku i prezentami z logo naszych programów.';
    img.width = 703; img.height = 900; img.decoding = 'async';
    tlo.appendChild(img);
    tlo.classList.add('hero__choinka--obraz');
  } else {
    var ramka = document.createElement('iframe');
    ramka.src = 'choinka/index.html#hero';
    ramka.title = 'Choinka cybersory 3D: przeciągnij, żeby obrócić, najedź na prezent albo bombkę';
    ramka.setAttribute('allow', 'autoplay');
    tlo.appendChild(ramka);
  }
  hero.insertBefore(tlo, hero.firstChild);
  document.documentElement.classList.add('choinka-sezon');
})();
