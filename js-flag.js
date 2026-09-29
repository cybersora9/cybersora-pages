/* Flaga "JS dziala" ustawiana w <head>, ZANIM przegladarka narysuje strone.
   CSS ukrywa sekcje .reveal tylko pod html.js — bez JS (albo przy bledzie
   app.js) tresc zostaje widoczna. Osobny plik, bo CSP nie wpuszcza skryptow
   inline (script-src 'self'). */
document.documentElement.classList.add('js');
