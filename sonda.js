/* sonda.js — wyniesione z index.html 23.09 (BEZPIECZENSTWO modul 5: CSP bez 'unsafe-inline').
   Dawny blok 4: sonda FPS (#sonda-fps), spi bez haszu.
   Laduje sie zwyklym <script src> w tym samym miejscu co dawny blok inline — kolejnosc wykonania bez zmian. */
(function(){
  'use strict';
  if(location.hash.indexOf('sonda-fps') === -1) return;

  var BEZ  = location.hash.indexOf('bezkuli') > -1;
  var WARM = 4000;    /* rozgrzewka: pierwsze klatki po wczytaniu są zawsze gorsze */
  var RUN  = 12000;   /* właściwy pomiar */
  var KLUCZ = BEZ ? 'sonda_fps_bez' : 'sonda_fps_z';

  var box = document.createElement('div');
  box.setAttribute('style',
    'position:fixed;right:10px;bottom:10px;z-index:2147483647;background:#000000ee;' +
    'border:2px solid #e11d33;border-radius:10px;padding:12px 16px;color:#ff3a52;' +
    'font:700 15px/1.5 Consolas,monospace;white-space:pre;pointer-events:auto;' +
    'max-width:min(92vw,420px);box-shadow:0 8px 40px #000');
  var przycisk = null;

  function dodajPrzycisk(napis, hasz){
    if(przycisk) return;
    przycisk = document.createElement('button');
    przycisk.textContent = napis;
    przycisk.setAttribute('style',
      'display:block;margin-top:10px;width:100%;padding:8px 10px;cursor:pointer;' +
      'background:#e11d33;color:#fff;border:0;border-radius:6px;' +
      'font:700 14px Consolas,monospace');
    przycisk.onclick = function(){ location.hash = hasz; location.reload(); };
    box.appendChild(przycisk);
  }

  function start(){
    document.body.appendChild(box);

    var probki = [], t0 = null, last = null, koniec = false, zamowione = false;

    function widoczne(){
      return document.visibilityState === 'visible' && document.hasFocus();
    }

    /* Jedna zamówiona klatka na raz. Bez tego budzik niżej nakładałby na siebie
       kolejne pętle pomiarowe, a w ukrytej karcie zamówienia kolejkowałyby się
       i wystrzeliły wszystkie naraz przy powrocie. */
    function zamow(){
      if(zamowione || koniec) return;
      zamowione = true;
      requestAnimationFrame(function(ts){ zamowione = false; tick(ts); });
    }

    function czekaj(){
      pisz('SONDA FPS — ' + (BEZ ? 'BEZ KULI' : 'Z KULĄ') + '\n\n' +
           'KLIKNIJ W TO OKNO.\n' +
           'Pomiar rusza, gdy okno jest na wierzchu\n' +
           'i ma skupienie. Potrwa ' + ((WARM + RUN)/1000) + ' s.');
    }

    function tick(ts){
      if(koniec) return;
      if(!widoczne()){
        /* Pomiar w oknie bez skupienia jest bezwartościowy — Chrome dławi wtedy
           klatki albo nie daje ich wcale. Zerujemy i czekamy, zamiast zapisywać
           śmieci i podawać je jako wynik. */
        probki.length = 0; t0 = null;
        czekaj();
        zamow();
        return;
      }
      if(t0 === null){ t0 = ts; last = ts; zamow(); return; }

      var dt = ts - last; last = ts;
      var el = ts - t0;
      if(el > WARM) probki.push(dt);

      if(el < WARM + RUN){
        zamow();
        if(el <= WARM)                    pisz('rozgrzewka ' + Math.ceil((WARM - el)/1000) + ' s…');
        else if(probki.length % 20 === 0) raport(false, probki);
      } else {
        koniec = true;
        raport(true, probki);
      }
    }

    /* Pierwszy komunikat MUSI pojawić się od razu, a nie dopiero z wnętrza
       requestAnimationFrame: w ukrytej karcie rAF nie tyka w ogóle (zmierzone
       11.09: 0 klatek w 4 s), więc inaczej w oknie stałby pusty czerwony
       prostokąt bez instrukcji. */
    czekaj();
    zamow();

    /* Budzik: gdy karta była ukryta, pętla nie ma jak sama wrócić do życia. */
    var budzik = setInterval(function(){
      if(koniec){ clearInterval(budzik); return; }
      zamow();
    }, 800);
    addEventListener('visibilitychange', zamow);
    addEventListener('focus', zamow);
  }

  function pisz(txt){
    box.textContent = txt;
    if(przycisk) box.appendChild(przycisk);
  }

  function raport(zamkniete, probki){
    var s = probki.slice().sort(function(a,b){ return a - b; });
    var n = s.length;
    if(!n){ return; }
    var sum = 0; for(var i = 0; i < n; i++) sum += s[i];
    var dlugie = s.filter(function(x){ return x > 32; }).length;

    var w = {
      kula:    !BEZ && !!document.querySelector('.nav__mascot.has-orb'),
      bezKuli: BEZ,
      klatek:  n,
      fps:     +(1000/(sum/n)).toFixed(1),
      srednia: +(sum/n).toFixed(2),
      mediana: +s[n >> 1].toFixed(2),
      p95:     +s[Math.min(n - 1, Math.floor(n*0.95))].toFixed(2),
      max:     +s[n - 1].toFixed(1),
      dlugie:  dlugie,
      ekran:   innerWidth + 'x' + innerHeight,
      dpr:     devicePixelRatio,
      kiedy:   new Date().toISOString()
    };

    pisz(
      (zamkniete ? 'WYNIK' : 'trwa…') + '   ' + (BEZ ? 'BEZ KULI' : (w.kula ? 'Z KULĄ' : 'kula NIE wstała!')) + '\n' +
      'średnio ' + w.fps + ' fps (' + w.srednia + ' ms)\n' +
      'mediana ' + w.mediana + ' ms    p95 ' + w.p95 + ' ms\n' +
      'najgorsza klatka ' + w.max + ' ms\n' +
      'klatek >32 ms: ' + w.dlugie + ' (' + (100*w.dlugie/n).toFixed(1) + '%)\n' +
      'okno ' + w.ekran + '  dpr ' + w.dpr + '  próbek ' + n
    );
    if(!zamkniete) return;

    try { sessionStorage.setItem(KLUCZ, JSON.stringify(w)); } catch(e){}

    var inny = null;
    try { inny = JSON.parse(sessionStorage.getItem(BEZ ? 'sonda_fps_z' : 'sonda_fps_bez')); } catch(e){}

    if(inny){
      var zK  = BEZ ? inny : w;
      var bezK = BEZ ? w : inny;
      var roznica = +(zK.srednia - bezK.srednia).toFixed(2);
      pisz(
        'OBA PRZEBIEGI GOTOWE\n' +
        '─────────────────────────\n' +
        'z kulą:   ' + zK.fps  + ' fps  (' + zK.srednia  + ' ms)\n' +
        'bez kuli: ' + bezK.fps + ' fps  (' + bezK.srednia + ' ms)\n' +
        '─────────────────────────\n' +
        'KULA KOSZTUJE ' + (roznica >= 0 ? '+' : '') + roznica + ' ms/klatkę\n' +
        'zapas do 60 fps: ' + (16.67 - zK.srednia).toFixed(2) + ' ms\n' +
        'długie klatki: ' + zK.dlugie + ' vs ' + bezK.dlugie + '\n\n' +
        'Przepisz mi cały ten blok.'
      );
      dodajPrzycisk('powtórz przebieg Z KULĄ', '#sonda-fps');
    } else {
      pisz(box.textContent + '\n\nTeraz drugi przebieg — bez kuli,\nżeby było z czym porównać.');
      dodajPrzycisk(BEZ ? 'przebieg Z KULĄ →' : 'przebieg BEZ KULI →',
                    BEZ ? '#sonda-fps' : '#sonda-fps-bezkuli');
    }
  }

  if(document.readyState === 'complete') setTimeout(start, 400);
  else addEventListener('load', function(){ setTimeout(start, 400); });
})();
