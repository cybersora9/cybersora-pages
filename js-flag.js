/* Flaga „JS działa” ustawiana w <head>, zanim przeglądarka narysuje stronę: CSS ukrywa sekcje .reveal tylko pod html.js,
   więc bez JS (albo przy błędzie app.js) treść zostaje widoczna. Osobny plik, bo CSP nie wpuszcza skryptów wpisanych w HTML.
   24.11: strona ma prawdziwe podstrony. Stare adresy z kotwicą (cybersora.pl/#oferta, #contact…) przenoszą tu na nowe,
   zanim cokolwiek się narysuje, żeby linki z postów i wizytówek dalej działały. */
document.documentElement.classList.add('js');
(function () {
  if (location.pathname !== '/' && location.pathname !== '/index.html') return;
  var stare = {
    oferta: '/oferta/', marketplace: '/oferta/', cennik: '/oferta/#cennik',
    products: '/projekty/', rnd: '/projekty/', zrobilismy: '/projekty/#salondesk', meshuga: '/projekty/#meshuga', somi: '/projekty/#meshuga',
    onas: '/o-mnie/', contact: '/kontakt/', polityka: '/polityka/', soraos: '/soraos/'
  };
  var cel = stare[location.hash.slice(1).split(/[?&]/)[0]];
  if (cel) location.replace(cel);
})();
