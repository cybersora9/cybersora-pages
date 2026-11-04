/*! konto-api (04.11.2026): warstwa danych konta cybersory, jednego na całą stronę.
 *  Dwa tryby, ten sam interfejs:
 *   'artefakt' = udawany serwer w localStorage tej przeglądarki (konta, sesje, awatar jako data-URL, koszyk, zamówienia, rozmowy, gra),
 *   'zywo'     = prawdziwy Worker pod KONTO_API (R2 na zdjęcia, D1 na resztę), jeszcze niewdrożony.
 *  UI (konto.js) woła tylko funkcje z window.KontoAPI, więc przejście na żywo = zmiana trybu, bez zmian w UI.
 *  Każda funkcja zwraca Promise; błąd ma pole .kod ('nick', 'haslo', 'sesja', 'siec', ...) i polski komunikat. */
(function (G) {
  'use strict';
  if (G.KontoAPI) return;

  var TRYB = G.KONTO_TRYB || (/(^|\.)cybersora\.pl$/.test(location.hostname) ? 'zywo' : 'artefakt');
  // 04.11: adres serwera kont z <meta name="konto-api" content="/api/konto"> w index.html.
  // Na cybersora.pl bez tego meta konto jest ukryte (serwera jeszcze nie ma); wraca po wdrożeniu Workera.
  var META = document.querySelector('meta[name="konto-api"]');
  if (TRYB === 'zywo' && !G.KONTO_API && !(META && META.content)) return;
  var API = G.KONTO_API || (META && META.content) || '/api/konto';
  var K_SESJA = 'cybersora.konto.sesja';     // { token, nick, ava64 } klienta
  var K_DB = 'cybersora.konto.serwer';       // tylko tryb 'artefakt': „baza” udawanego serwera

  function ls(k, v) {
    try {
      if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null');
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch (e) { return v === undefined ? null : false; }
  }
  function blad(kod, msg) { var e = new Error(msg); e.kod = kod; return e; }

  var sesja = ls(K_SESJA);
  if (sesja && typeof sesja.token !== 'string') sesja = null;
  function ustawSesje(s) { sesja = s; ls(K_SESJA, s); }

  /* ---------------- tryb 'zywo': Worker ---------------- */
  function zywo(metoda, sciezka, cialo) {
    var h = { 'Content-Type': 'application/json' };
    if (sesja) h.Authorization = 'Bearer ' + sesja.token;
    return fetch(API + sciezka, { method: metoda, headers: h, cache: 'no-store', body: cialo ? JSON.stringify(cialo) : undefined })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) throw blad(j.kod || 'http' + r.status, j.blad || 'Serwer konta nie odpowiada. Spróbuj za chwilę.');
          return j;
        });
      }, function () { throw blad('siec', 'Brak połączenia. Spróbuj za chwilę.'); });
  }

  /* ---------------- tryb 'artefakt': udawany serwer ---------------- */
  var NICK_RE = /^[\p{L}\p{N}_.\-]{3,20}$/u;
  var ALFABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // bez 0/O, 1/I
  function losowe(n) {
    var a = new Uint8Array(n), s = '';
    (G.crypto || {}).getRandomValues ? G.crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 256; });
    for (var i = 0; i < n; i++) s += ALFABET[a[i] % ALFABET.length];
    return s;
  }
  function kodOdz() { var s = losowe(12); return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8); }
  function skrot(tekst) {
    if (G.crypto && G.crypto.subtle && G.TextEncoder) {
      return G.crypto.subtle.digest('SHA-256', new TextEncoder().encode(tekst)).then(function (b) {
        return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      });
    }
    var h = 5381; for (var i = 0; i < tekst.length; i++) h = ((h << 5) + h + tekst.charCodeAt(i)) | 0;   // awaryjnie (http bez crypto.subtle)
    return Promise.resolve('d' + (h >>> 0).toString(16));
  }
  function db() {
    var d = ls(K_DB);
    if (!d || d.v !== 1) d = { v: 1, nr: 41, konta: {}, sesje: {} };
    return d;
  }
  function zapiszDb(d) { if (!ls(K_DB, d)) throw blad('miejsce', 'Przeglądarka nie pozwala zapisać danych (tryb prywatny albo brak miejsca).'); }
  function dzis() { return new Date().toISOString(); }
  function kontoZSesji(d) {
    var s = sesja && d.sesje[sesja.token];
    var k = s && d.konta[s.k];
    if (!k) throw blad('sesja', 'Sesja wygasła. Zaloguj się jeszcze raz.');
    return k;
  }
  function profil(k) {
    return { nick: k.nick, nr: 'KONTO-' + ('000' + k.nr).slice(-4), od: k.od, kot: k.kot, ava256: k.ava ? k.ava.d256 : '', ava64: k.ava ? k.ava.d64 : '' };
  }
  function calosc(k) {
    return { profil: profil(k), koszyk: k.koszyk, zamowienia: k.zam, rozmowy: k.rozmowy, gra: k.gra };
  }
  function nowaSesja(d, klucz) {
    var t = losowe(32);
    d.sesje[t] = { k: klucz, od: dzis() };
    return t;
  }
  function czystyKoszyk(lista) {
    if (!Array.isArray(lista)) return [];
    return lista.filter(function (i) { return i && typeof i.name === 'string' && i.name.length <= 120 && isFinite(Number(i.price)); })
      .slice(0, 50).map(function (i) { return { name: i.name, price: Number(i.price) }; });
  }

  var TRASY = {
    'POST /rejestracja': function (d, c) {
      var nick = String(c.nick || '').trim();
      if (!NICK_RE.test(nick)) throw blad('nick', 'Nick: 3–20 znaków, litery, cyfry i _ . -');
      if (String(c.haslo || '').length < 8) throw blad('haslo', 'Hasło musi mieć co najmniej 8 znaków.');
      var klucz = nick.toLowerCase();
      if (d.konta[klucz]) throw blad('nick', 'Ten nick jest zajęty.');
      var sol = losowe(16), kod = kodOdz();
      return Promise.all([skrot(sol + ':' + c.haslo), skrot(sol + ':' + kod)]).then(function (h) {
        d.nr += 1;
        d.konta[klucz] = { nick: nick, nr: d.nr, od: dzis(), sol: sol, haslo: h[0], kod: h[1], kot: 'kosc', ava: null,
          koszyk: [], zam: [], rozmowy: [], gra: { najlepszy: 0, gier: 0 } };
        var t = nowaSesja(d, klucz);
        return { token: t, kod: kod, dane: calosc(d.konta[klucz]) };
      });
    },
    'POST /logowanie': function (d, c) {
      var k = d.konta[String(c.nick || '').trim().toLowerCase()];
      if (!k) throw blad('dane', 'Zły nick albo hasło.');
      return skrot(k.sol + ':' + String(c.haslo || '')).then(function (h) {
        if (h !== k.haslo) throw blad('dane', 'Zły nick albo hasło.');
        return { token: nowaSesja(d, k.nick.toLowerCase()), dane: calosc(k) };
      });
    },
    'POST /odzyskaj': function (d, c) {
      var k = d.konta[String(c.nick || '').trim().toLowerCase()];
      var kod = String(c.kod || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      kod = kod.slice(0, 4) + '-' + kod.slice(4, 8) + '-' + kod.slice(8, 12);
      if (String(c.haslo || '').length < 8) throw blad('haslo', 'Nowe hasło musi mieć co najmniej 8 znaków.');
      if (!k) throw blad('dane', 'Zły nick albo kod odzyskiwania.');
      return skrot(k.sol + ':' + kod).then(function (h) {
        if (h !== k.kod) throw blad('dane', 'Zły nick albo kod odzyskiwania.');
        var nowyKod = kodOdz(), klucz = k.nick.toLowerCase();
        return Promise.all([skrot(k.sol + ':' + c.haslo), skrot(k.sol + ':' + nowyKod)]).then(function (hh) {
          k.haslo = hh[0]; k.kod = hh[1];
          Object.keys(d.sesje).forEach(function (t) { if (d.sesje[t].k === klucz) delete d.sesje[t]; });
          return { token: nowaSesja(d, klucz), kod: nowyKod, dane: calosc(k) };
        });
      });
    },
    'GET /': function (d) { return { dane: calosc(kontoZSesji(d)) }; },
    'POST /wyloguj': function (d) { if (sesja) delete d.sesje[sesja.token]; return {}; },
    'POST /wyloguj-wszedzie': function (d) {
      var klucz = kontoZSesji(d).nick.toLowerCase();
      Object.keys(d.sesje).forEach(function (t) { if (d.sesje[t].k === klucz) delete d.sesje[t]; });
      return {};
    },
    'PUT /awatar': function (d, c) {
      var k = kontoZSesji(d);
      if (c.kot) {
        if (['kosc', 'krew', 'szary'].indexOf(c.kot) < 0) throw blad('awatar', 'Nieznany kot.');
        k.kot = c.kot; k.ava = null;
      } else {
        var ok = function (u, max) { return typeof u === 'string' && /^data:image\/(webp|png|jpeg);base64,/.test(u) && u.length < max; };
        if (!ok(c.d256, 120000) || !ok(c.d64, 20000)) throw blad('awatar', 'Zdjęcie ma zły format albo jest za duże.');
        k.ava = { d256: c.d256, d64: c.d64 };
      }
      return { dane: calosc(k) };
    },
    'PUT /koszyk': function (d, c) { var k = kontoZSesji(d); k.koszyk = czystyKoszyk(c.koszyk); return { koszyk: k.koszyk }; },
    'POST /koszyk/scal': function (d, c) {
      var k = kontoZSesji(d), dodane = 0;
      czystyKoszyk(c.koszyk).forEach(function (i) {
        if (!k.koszyk.some(function (j) { return j.name === i.name; })) { k.koszyk.push(i); dodane++; }
      });
      k.koszyk = k.koszyk.slice(0, 50);
      return { koszyk: k.koszyk, dodane: dodane };
    },
    'POST /zamowienia': function (d, c) {
      var k = kontoZSesji(d), poz = czystyKoszyk(c.pozycje);
      if (!poz.length) throw blad('pusto', 'Koszyk jest pusty.');
      var z = { nr: 'Z-' + ('000' + (k.zam.length + 1)).slice(-3), od: dzis(), pozycje: poz, status: 'wyslane' };
      k.zam.unshift(z); k.zam = k.zam.slice(0, 50);
      k.koszyk = [];
      return { zamowienie: z };
    },
    'POST /rozmowy': function (d, c) {
      var k = kontoZSesji(d), q = String(c.q || '').trim().slice(0, 300);
      if (q) { k.rozmowy.unshift({ q: q, kiedy: dzis() }); k.rozmowy = k.rozmowy.slice(0, 50); }
      return { rozmowy: k.rozmowy };
    },
    'POST /gra': function (d, c) {
      var k = kontoZSesji(d), w = Math.max(0, Math.round(Number(c.wynik) || 0));
      k.gra.gier += 1; if (w > k.gra.najlepszy) k.gra.najlepszy = w;
      return { gra: k.gra };
    },
    'DELETE /': function (d, c) {
      var k = kontoZSesji(d), klucz = k.nick.toLowerCase();
      return skrot(k.sol + ':' + String(c.haslo || '')).then(function (h) {
        if (h !== k.haslo) throw blad('haslo', 'Złe hasło.');
        delete d.konta[klucz];
        Object.keys(d.sesje).forEach(function (t) { if (d.sesje[t].k === klucz) delete d.sesje[t]; });
        return {};
      });
    }
  };

  function artefakt(metoda, sciezka, cialo) {
    // opóźnienie jak w sieci, żeby stany ładowania w UI były prawdziwe
    return new Promise(function (ok) { setTimeout(ok, 220 + Math.random() * 260); }).then(function () {
      var f = TRASY[metoda + ' ' + sciezka];
      if (!f) throw blad('trasa', 'Nieznana operacja konta.');
      var d = db();
      return Promise.resolve(f(d, cialo || {})).then(function (wynik) { zapiszDb(d); return wynik; });
    });
  }

  var wolaj = TRYB === 'zywo' ? zywo : artefakt;
  function poSesji(r) {
    var p = r.dane.profil;
    ustawSesje({ token: r.token, nick: p.nick, ava64: p.ava64, kot: p.kot });
    return r;
  }
  function odswiezSesje(dane) {
    if (sesja && dane && dane.profil) ustawSesje({ token: sesja.token, nick: dane.profil.nick, ava64: dane.profil.ava64, kot: dane.profil.kot });
    return dane;
  }
  function zSesja(f) {
    return function () {
      if (!sesja) return Promise.reject(blad('sesja', 'Nie jesteś zalogowany.'));
      return f.apply(null, arguments).catch(function (e) { if (e.kod === 'sesja') ustawSesje(null); throw e; });
    };
  }

  G.KontoAPI = {
    tryb: TRYB,
    sesja: function () { return sesja ? { nick: sesja.nick, ava64: sesja.ava64 || '', kot: sesja.kot || 'kosc' } : null; },
    rejestracja: function (nick, haslo) { return wolaj('POST', '/rejestracja', { nick: nick, haslo: haslo }).then(poSesji); },
    logowanie: function (nick, haslo) { return wolaj('POST', '/logowanie', { nick: nick, haslo: haslo }).then(poSesji); },
    odzyskaj: function (nick, kod, haslo) { return wolaj('POST', '/odzyskaj', { nick: nick, kod: kod, haslo: haslo }).then(poSesji); },
    ja: zSesja(function () { return wolaj('GET', '/').then(function (r) { return odswiezSesje(r.dane); }); }),
    wyloguj: function () {
      var p = sesja ? wolaj('POST', '/wyloguj').catch(function () { /* lokalnie i tak wylogowujemy */ }) : Promise.resolve();
      return p.then(function () { ustawSesje(null); });
    },
    wylogujWszedzie: zSesja(function () { return wolaj('POST', '/wyloguj-wszedzie').then(function () { ustawSesje(null); }); }),
    awatarZdjecie: zSesja(function (d256, d64) { return wolaj('PUT', '/awatar', { d256: d256, d64: d64 }).then(function (r) { return odswiezSesje(r.dane); }); }),
    awatarKot: zSesja(function (kot) { return wolaj('PUT', '/awatar', { kot: kot }).then(function (r) { return odswiezSesje(r.dane); }); }),
    koszykZapisz: zSesja(function (lista) { return wolaj('PUT', '/koszyk', { koszyk: lista }); }),
    koszykScal: zSesja(function (lista) { return wolaj('POST', '/koszyk/scal', { koszyk: lista }); }),
    zamowienie: zSesja(function (pozycje) { return wolaj('POST', '/zamowienia', { pozycje: pozycje }); }),
    rozmowa: zSesja(function (q) { return wolaj('POST', '/rozmowy', { q: q }); }),
    wynikGry: zSesja(function (w) { return wolaj('POST', '/gra', { wynik: w }); }),
    usunKonto: zSesja(function (haslo) { return wolaj('DELETE', '/', { haslo: haslo }).then(function () { ustawSesje(null); }); })
  };
})(window);
