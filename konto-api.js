/*! konto-api (04.11.2026, krok 2 serii KONTA BEZPIECZNIE 06.11): warstwa danych konta cybersory, jednego na całą stronę.
 *  Dwa tryby, ten sam interfejs:
 *   'artefakt' = udawany serwer w localStorage tej przeglądarki (konta, sesje, awatar jako data-URL, koszyk, zamówienia, rozmowy, gra),
 *   'zywo'     = prawdziwy Worker pod KONTO_API (R2 na zdjęcia, D1 na resztę), jeszcze niewdrożony (P3a–P3d).
 *  UI (konto.js) woła tylko funkcje z window.KontoAPI, więc przejście na żywo = zmiana trybu, bez zmian w UI.
 *  Każda funkcja zwraca Promise; błąd ma pole .kod ('nick', 'sesja', 'siec', 'klucz', ...) i polski komunikat.
 *  06.11 krok 2: BEZ HASEŁ. Logowanie kluczem dostępu (WebAuthn, w przeglądarce przez SimpleWebAuthn) albo GitHub/Discord (OAuth).
 *  Udawany serwer sprawdza wyzwanie, typ i origin z clientDataJSON, ale NIE podpis: podpis sprawdzi @simplewebauthn/server na Workerze (P3a).
 *  Reguły treści (nick, opis, linki, e-mail) są w jednym module konto-reguly.js, tym samym dla Workera. */
(function (G) {
  'use strict';
  if (G.KontoAPI) return;

  var TRYB = G.KONTO_TRYB || (/(^|\.)cybersora\.pl$/.test(location.hostname) ? 'zywo' : 'artefakt');
  // 04.11: adres serwera kont z <meta name="konto-api" content="/api/konto"> w index.html.
  // Na cybersora.pl bez tego meta konto jest ukryte (serwera jeszcze nie ma); wraca po wdrożeniu Workera.
  var META = document.querySelector('meta[name="konto-api"]');
  if (TRYB === 'zywo' && !G.KONTO_API && !(META && META.content)) return;
  // 15.11 ukryta beta: przy <meta name="konto-beta" content="1"> konto widać tylko po wejściu z ?beta
  // (zapamiętane w tej przeglądarce) albo przy zapisanej sesji. Zwykły gość nie widzi nic. ?beta=0 zdejmuje znacznik.
  if (TRYB === 'zywo' && document.querySelector('meta[name="konto-beta"][content="1"]')) {
    var wBecie = false;
    try {
      var qb = /[?&]beta(?:=([^&#]*))?(?:[&#]|$)/.exec(location.search);
      if (qb) { if (qb[1] === '0') localStorage.removeItem('cybersora.beta'); else localStorage.setItem('cybersora.beta', '1'); }
      wBecie = localStorage.getItem('cybersora.beta') === '1' || !!localStorage.getItem('cybersora.konto.sesja');
    } catch (e) {}
    if (!wBecie) return;
  }
  var R = G.KontoReguly;
  if (!R) { if (G.console) console.error('konto-api: brak konto-reguly.js'); return; }
  var API = G.KONTO_API || (META && META.content) || '/api/konto';
  var K_SESJA = 'cybersora.konto.sesja';     // { token, nick, ava64 } klienta (na Workerze: ciasteczko __Host-sesja, P3a)
  var K_DB = 'cybersora.konto.serwer';       // tylko tryb 'artefakt': „baza” udawanego serwera
  var K_ATRAPA = 'cybersora.konto.klucze-atrapy';   // tylko tryb 'artefakt': „urządzenie” z kluczami-atrapami

  function ls(k, v) {
    try {
      if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null');
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch (e) { return v === undefined ? null : false; }
  }
  function blad(kod, msg) { var e = new Error(msg); e.kod = kod; return e; }

  // P3a: na Workerze sesja to ciasteczko __Host-sesja (HttpOnly, JS go nie widzi). W localStorage zostaje tylko
  // znacznik { nick, ava64, kot } do narysowania UI; prawdę mówi serwer (401 'sesja' czyści znacznik).
  var sesja = ls(K_SESJA);
  if (sesja && (TRYB === 'zywo' ? typeof sesja.nick !== 'string' || sesja.token : typeof sesja.token !== 'string')) sesja = null;
  function ustawSesje(s) { sesja = s; ls(K_SESJA, s); }

  /* P3a: powrót z GitHub/Discord. Worker przekierowuje na /?konto=ok|polaczono&nick=…&kot=… albo /?konto-blad=<kod>. */
  var powrotOAuth = null;
  if (TRYB === 'zywo') {
    try {
      var qs = new URLSearchParams(location.search), wynik = qs.get('konto'), kodB = qs.get('konto-blad');
      if (wynik || kodB) {
        var dost = /^(github|discord)$/.test(qs.get('dostawca') || '') ? qs.get('dostawca') : '';
        powrotOAuth = kodB ? { ok: false, kod: kodB, dostawca: dost } : { ok: true, wynik: wynik, dostawca: dost };
        if (!kodB && /^[^\s]{3,40}$/.test(qs.get('nick') || '')) ustawSesje({ nick: qs.get('nick'), ava64: '', kot: qs.get('kot') || 'kosc' });
        ['konto', 'konto-blad', 'nick', 'kot', 'dostawca'].forEach(function (k) { qs.delete(k); });
        var q = qs.toString();
        history.replaceState(history.state, '', location.pathname + (q ? '?' + q : '') + location.hash);
      }
    } catch (e) { /* stara przeglądarka: zostaje adres z parametrami */ }
  }

  /* ---------------- tryb 'zywo': Worker ---------------- */
  function zywo(metoda, sciezka, cialo, tokenUrz) {
    var h = { 'Content-Type': 'application/json' };
    // trasy programu (K0) niosą token urządzenia; sesja strony jedzie w ciasteczku __Host-sesja, nie w nagłówku
    if (tokenUrz) h.Authorization = 'Bearer ' + tokenUrz;
    return fetch(API + sciezka, { method: metoda, headers: h, cache: 'no-store', credentials: 'same-origin', body: cialo ? JSON.stringify(cialo) : undefined })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) {
            var e = blad(j.kod || 'http' + r.status, j.blad || 'Serwer konta nie odpowiada. Spróbuj za chwilę.');
            if (typeof j.pole === 'string') e.pole = j.pole;   // P3b: które pole formularza podświetlić (bio, github, …)
            throw e;
          }
          return j;
        });
      }, function () { throw blad('siec', 'Brak połączenia. Spróbuj za chwilę.'); });
  }

  /* ---------------- reguły: jeden moduł (konto-reguly.js) ---------------- */
  var walidujNick = R.nick, walidujBio = R.bio, walidujLink = R.link, adresLinku = R.adres, SERWISY = R.serwisy;

  /* ---------------- tryb 'artefakt': udawany serwer ---------------- */
  var ALFABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // bez 0/O, 1/I
  function losoweBajty(n) {
    var a = new Uint8Array(n);
    (G.crypto || {}).getRandomValues ? G.crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 256; });
    return a;
  }
  function losowe(n) {
    var a = losoweBajty(n), s = '';
    for (var i = 0; i < n; i++) s += ALFABET[a[i] % ALFABET.length];
    return s;
  }
  function b64url(bajty) {
    var s = ''; for (var i = 0; i < bajty.length; i++) s += String.fromCharCode(bajty[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function zB64url(t) {
    var s = String(t || '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var b = atob(s), a = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
    return a;
  }
  function tekstB64url(t) { return b64url(new TextEncoder().encode(t)); }
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
    if (!d.wyzw) d.wyzw = {};
    if (!d.ts) d.ts = {};
    if (!d.oauth) d.oauth = {};
    if (!Array.isArray(d.rej)) d.rej = [];
    return d;
  }
  function zapiszDb(d) { if (!ls(K_DB, d)) throw blad('miejsce', 'Przeglądarka nie pozwala zapisać danych (tryb prywatny albo brak miejsca).'); }
  function dzis() { return new Date().toISOString(); }
  function uzupelnij(k) {
    // konta z ETAPU 2 nie mają pól K1: urządzenia, osiągnięcia programów, widoczność (domyślnie prywatne)
    if (!Array.isArray(k.urz)) k.urz = [];
    if (!k.programy || typeof k.programy !== 'object') k.programy = {};
    if (typeof k.pub !== 'boolean') k.pub = false;   // P1: jedna flaga = profil publiczny (razem z osiągnięciami)
    // P1: profil
    if (typeof k.bio !== 'string') k.bio = '';
    if (!k.linki || typeof k.linki !== 'object') k.linki = {};
    if (!k.potw || typeof k.potw !== 'object') k.potw = {};
    if (!Array.isArray(k.gablota)) k.gablota = [];
    if (!k.zdob || typeof k.zdob !== 'object') k.zdob = {};
    // krok 2: sposoby logowania (klucze dostępu, GitHub/Discord) i opcjonalny e-mail
    if (!Array.isArray(k.klucze)) k.klucze = [];
    if (!k.oauth || typeof k.oauth !== 'object') k.oauth = {};
    if (!k.uid) k.uid = b64url(losoweBajty(16));   // uchwyt użytkownika WebAuthn: losowy, bez nicku i danych osobowych
    if (k.email && typeof k.email !== 'object') k.email = null;
    przyznaj(k);
    // usunięte dane programu zabierają jego odznaki także z gabloty
    var ma = zdobyteKlucze(k);
    k.gablota = k.gablota.filter(function (g) { return ma.indexOf(g) >= 0; });
    return k;
  }
  function sposoby(k) { return k.klucze.length + Object.keys(k.oauth).length; }
  /* odznaki strony i DancyCloud przyznaje serwer z tego, co sam wie (konto, zamówienia, programy, gra);
     data = pierwsza chwila, w której serwer to zauważył (konto: data założenia) */
  function przyznaj(k) {
    var t = Date.now(), z = k.zdob;
    function daj(klucz, ms) { if (!z[klucz]) z[klucz] = ms || t; }
    daj('strona:konto', Date.parse(k.od) || t);
    if (k.urz.length) daj('strona:czytnik', Date.parse(k.urz[0].od) || t);
    if (k.zam && k.zam.length) daj('strona:zamowienie', Date.parse(k.zam[k.zam.length - 1].od) || t);
    var g = k.gra || {};
    if (g.gier >= 1) daj('dancy:pierwszy_taniec');
    if (g.gier >= 10) daj('dancy:dziesiec_rund');
    if (g.najlepszy >= 5000) daj('dancy:piec_tysiecy');
  }
  /* klucze odznak, które konto ma naprawdę (do gabloty): 'strona:konto', 'czytnik:seria_7', … */
  function zdobyteKlucze(k) {
    var s = Object.keys(k.zdob);
    Object.keys(k.programy).forEach(function (p) { (k.programy[p].odznaki || []).forEach(function (o) { s.push(p + ':' + o.klucz); }); });
    return s;
  }
  function linkiJawne(k) {
    var o = {};
    SERWISY.forEach(function (s) {
      var a = adresLinku(s, k.linki[s]);
      if (a) o[s] = { typ: k.linki[s].typ, id: k.linki[s].id, url: a.url, pokaz: a.pokaz, potwierdzony: !!k.potw[s] };
    });
    return o;
  }
  /* to, co widzi obcy: bez koszyka, zamówień, rozmów, urządzeń, sposobów logowania i e-maila. Zdjęcie dopiero po przeglądzie (P3), do tego czasu kot. */
  function projekcja(k) {
    var prog = {};
    Object.keys(k.programy).forEach(function (p) {
      var d = k.programy[p];
      prog[p] = { ranga: d.ranga, xp: d.xp, odznaki: d.odznaki, podsumowanie: d.podsumowanie, wersja_programu: d.wersja_programu };
    });
    return { nick: k.nick, od: k.od, kot: k.kot, ava256: '', bio: k.bio, linki: linkiJawne(k), gablota: k.gablota.slice(),
      programy: prog, odznaki_cs: JSON.parse(JSON.stringify(k.zdob)), publiczny: !!k.pub };
  }

  /* ---- sesje: token losowy, wygasanie z przesuwaniem (30 dni z „zapamiętaj”, inaczej 1 dzień) ---- */
  var DZIEN = 864e5, SESJA_DLUGA = 30 * DZIEN, SESJA_KROTKA = DZIEN;
  function opisUA(ua) {
    ua = String(ua || '');
    var p = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Przeglądarka';
    var s = /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'system nieznany';
    return p + ' · ' + s;
  }
  function nowaSesja(d, klucz, pamietaj) {
    var t = losowe(32), teraz = Date.now();
    d.sesje[t] = { k: klucz, od: dzis(), id: 'S-' + losowe(6), ostatnio: teraz, pamietaj: !!pamietaj,
      wygasa: teraz + (pamietaj ? SESJA_DLUGA : SESJA_KROTKA), opis: opisUA(G.navigator && navigator.userAgent) };
    return t;
  }
  function sprzatnijSesje(d) {
    var t = Date.now();
    Object.keys(d.sesje).forEach(function (x) { var s = d.sesje[x]; if (s.wygasa && s.wygasa < t) delete d.sesje[x]; });
  }
  function kontoZSesji(d) {
    sprzatnijSesje(d);
    var s = sesja && d.sesje[sesja.token];
    var k = s && d.konta[s.k];
    if (!k) throw blad('sesja', 'Sesja wygasła. Zaloguj się jeszcze raz.');
    // sesje sprzed kroku 2 nie mają pól: dopisujemy je, wygasanie z przesuwaniem
    var teraz = Date.now();
    if (!s.id) { s.id = 'S-' + losowe(6); s.opis = opisUA(G.navigator && navigator.userAgent); }
    s.ostatnio = teraz; s.wygasa = teraz + (s.pamietaj ? SESJA_DLUGA : SESJA_KROTKA);
    return uzupelnij(k);
  }
  function sesjeKonta(d, klucz) {
    sprzatnijSesje(d);
    return Object.keys(d.sesje).filter(function (t) { return d.sesje[t].k === klucz; }).map(function (t) {
      var s = d.sesje[t];
      return { id: s.id || '', opis: s.opis || 'Przeglądarka', od: s.od, ostatnio: s.ostatnio ? new Date(s.ostatnio).toISOString() : s.od,
        pamietaj: !!s.pamietaj, ta: !!(sesja && t === sesja.token) };
    }).sort(function (a, b) { return (b.ta - a.ta) || (Date.parse(b.ostatnio) - Date.parse(a.ostatnio)); });
  }
  function zabijSesje(d, klucz, poza) {
    Object.keys(d.sesje).forEach(function (t) { if (d.sesje[t].k === klucz && t !== poza) delete d.sesje[t]; });
  }

  function profil(k) {
    return { nick: k.nick, nr: 'KONTO-' + ('000' + k.nr).slice(-4), od: k.od, kot: k.kot, ava256: k.ava ? k.ava.d256 : '', ava64: k.ava ? k.ava.d64 : '',
      osiagniecia_publiczne: !!k.pub, publiczny: !!k.pub,
      bio: k.bio || '', linki: linkiJawne(k), gablota: (k.gablota || []).slice(), odznaki_cs: JSON.parse(JSON.stringify(k.zdob || {})) };
  }
  function urzadzeniaJawne(k) {
    return k.urz.map(function (u) { return { id: u.id, program: u.program, nazwa: u.nazwa, wersja_programu: u.wersja, od: u.od, ostatnio: u.ostatnio }; });
  }
  function bezpieczenstwo(d, k) {
    var o = {};
    R.oauth.forEach(function (s) { var x = k.oauth[s]; o[s] = x ? { login: x.login, od: x.od } : null; });
    return {
      klucze: k.klucze.map(function (c) { return { id: c.id, nazwa: c.nazwa || '', od: c.od, ostatnio: c.ostatnio || null, atrapa: !!c.atrapa }; }),
      oauth: o,
      email: k.email ? { adres: k.email.adres, potwierdzony: !!k.email.potw } : null,
      sesje: sesjeKonta(d, k.nick.toLowerCase()),
      sposoby: sposoby(k),
      stare_haslo: !!k.haslo && !sposoby(k)   // konto testowe sprzed kroku 2: hasła już nie ma w UI
    };
  }
  function calosc(k, d) {
    uzupelnij(k);
    return { profil: profil(k), koszyk: k.koszyk, zamowienia: k.zam, rozmowy: k.rozmowy, gra: k.gra,
      programy: k.programy, urzadzenia: urzadzeniaJawne(k), bezpieczenstwo: bezpieczenstwo(d || db(), k) };
  }

  /* ---- krok 2: antyspam (atrapa Turnstile + limit nowych kont), wyzwania WebAuthn ---- */
  var TS_S = 300, WYZW_S = 300, OAUTH_S = 600, REJ_DOBA = 8;   // REJ_DOBA: w artefakcie na przeglądarkę, na Workerze na IP (P3c)
  function sprzatnij(d) {
    var t = Date.now();
    ['ts', 'wyzw', 'oauth'].forEach(function (n) { Object.keys(d[n]).forEach(function (x) { var w = d[n][x]; if ((w.wygasa || w) < t) delete d[n][x]; }); });
    d.rej = d.rej.filter(function (x) { return t - x < DZIEN; });
  }
  function zuzyjTurnstile(d, token) {
    sprzatnij(d);
    if (typeof token !== 'string' || !d.ts[token]) throw blad('turnstile', 'Potwierdź, że nie jesteś botem.');
    delete d.ts[token];   // jednorazowy, jak prawdziwy token Turnstile (siteverify w P3c)
  }
  function limitRejestracji(d) {
    sprzatnij(d);
    if (d.rej.length >= REJ_DOBA) throw blad('limit', 'Z tego miejsca założono dziś za dużo kont. Spróbuj jutro.');
  }
  function nickWolny(d, nick) {
    var wn = walidujNick(nick);
    if (!wn.ok) throw blad('nick', wn.blad);
    if (d.konta[wn.wartosc.toLowerCase()]) throw blad('nick', 'Ten nick jest zajęty.');
    return wn.wartosc;
  }
  function noweKonto(d, nick, uid) {
    d.nr += 1;
    var k = { nick: nick, nr: d.nr, od: dzis(), kot: 'kosc', ava: null, uid: uid || b64url(losoweBajty(16)),
      koszyk: [], zam: [], rozmowy: [], gra: { najlepszy: 0, gier: 0 }, klucze: [], oauth: {} };
    d.konta[nick.toLowerCase()] = k;
    d.rej.push(Date.now());
    return uzupelnij(k);
  }
  var RP_NAZWA = 'cybersora';
  function opcjeRejestracji(d, cel, uid, nick, wykluczone, extra) {
    var ch = b64url(losoweBajty(32));
    d.wyzw[ch] = Object.assign({ cel: cel, uid: uid, wygasa: Date.now() + WYZW_S * 1000 }, extra || {});
    // ten sam kształt co generateRegistrationOptions() z @simplewebauthn/server (P3a)
    return {
      challenge: ch, rp: { name: RP_NAZWA, id: location.hostname },
      user: { id: uid, name: nick, displayName: nick },
      pubKeyCredParams: [{ alg: -8, type: 'public-key' }, { alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
      timeout: 60000, attestation: 'none',
      excludeCredentials: (wykluczone || []).map(function (c) { return { id: c.id, type: 'public-key', transports: c.transports || [] }; }),
      authenticatorSelection: { residentKey: 'required', requireResidentKey: true, userVerification: 'preferred' },
      extensions: { credProps: true }
    };
  }
  function opcjeLogowania(d) {
    var ch = b64url(losoweBajty(32));
    d.wyzw[ch] = { cel: 'log', wygasa: Date.now() + WYZW_S * 1000 };
    // klucz wykrywalny: bez allowCredentials, przeglądarka sama pokazuje klucze tej strony
    return { challenge: ch, rpId: location.hostname, timeout: 60000, userVerification: 'preferred', allowCredentials: [] };
  }
  /* wspólne sprawdzenie odpowiedzi: kształt, clientDataJSON (typ, wyzwanie, origin). Zwraca [wyzwanie, dane klienta]. */
  function sprawdzOdpowiedz(d, o, typ, cel) {
    sprzatnij(d);
    if (!o || typeof o !== 'object' || typeof o.id !== 'string' || !/^[A-Za-z0-9_-]{16,1366}$/.test(o.id) || o.type !== 'public-key' || !o.response)
      throw blad('klucz', 'Klucz dostępu nie zadziałał. Spróbuj jeszcze raz.');
    var cd;
    try { cd = JSON.parse(new TextDecoder().decode(zB64url(o.response.clientDataJSON))); } catch (e) { throw blad('klucz', 'Klucz dostępu nie zadziałał. Spróbuj jeszcze raz.'); }
    var w = cd && d.wyzw[cd.challenge];
    if (!w || w.cel !== cel || cd.type !== typ) throw blad('wyzwanie', 'Minął czas na klucz dostępu. Spróbuj jeszcze raz.');
    if (cd.origin !== location.origin) throw blad('klucz', 'Ten klucz należy do innej strony.');
    delete d.wyzw[cd.challenge];   // wyzwanie jednorazowe: powtórzona odpowiedź odpada
    if (o.atrapa && TRYB !== 'artefakt') throw blad('klucz', 'Klucz dostępu nie zadziałał. Spróbuj jeszcze raz.');
    return w;
  }
  function zapiszKlucz(k, o, nazwa) {
    if (k.klucze.length >= 10) throw blad('limit', 'Na koncie jest już 10 kluczy dostępu. Usuń któryś.');
    if (kluczGdziekolwiek(o.id)) throw blad('klucz-jest', 'Ten klucz dostępu jest już na koncie.');
    var r = o.response;
    k.klucze.push({ id: o.id, pk: typeof r.publicKey === 'string' ? r.publicKey.slice(0, 2048) : '', alg: Number(r.publicKeyAlgorithm) || null,
      transports: Array.isArray(r.transports) ? r.transports.filter(function (t) { return typeof t === 'string'; }).slice(0, 6) : [],
      nazwa: nazwa || '', od: dzis(), ostatnio: null, licznik: 0, atrapa: !!o.atrapa });
    delete k.sol; delete k.haslo; delete k.kod;   // konto testowe sprzed kroku 2: stare hasło znika razem z pierwszym kluczem
  }
  var _db = null;   // baza bieżącego wywołania (do kluczGdziekolwiek)
  function kluczGdziekolwiek(id) {
    for (var n in _db.konta) { var kk = _db.konta[n]; if ((kk.klucze || []).some(function (c) { return c.id === id; })) return kk; }
    return null;
  }
  function polaczOAuth(d, k, dostawca, ext) {
    // jedno konto GitHub/Discord = jedno konto cybersory (Worker: UNIQUE (serwis, id_zewnetrzne) w D1)
    var inne = Object.keys(d.konta).some(function (n) { var o = d.konta[n]; return o !== k && o.oauth && o.oauth[dostawca] && o.oauth[dostawca].id === ext.id; });
    if (inne) throw blad('zajete', 'To konto ' + NAZWA[dostawca] + ' jest już połączone z innym kontem cybersory.');
    k.oauth[dostawca] = { id: ext.id, login: ext.login, od: dzis() };
    // połączenie ustawia link na profilu i znaczek „potwierdzone” (zastępuje przycisk-atrapę z P1)
    k.linki[dostawca] = dostawca === 'github' ? { typ: 'user', id: ext.login } : { typ: 'nick', id: ext.login };
    k.potw[dostawca] = true;
    delete k.sol; delete k.haslo; delete k.kod;
  }
  var NAZWA = { github: 'GitHub', discord: 'Discord' };
  function kodEmail() { var a = losoweBajty(4); return String(((a[0] << 16) | (a[1] << 8) | a[2]) % 1000000 + 1000000).slice(1); }

  /* --- K0/K1: programy na koncie (przepływ kodu urządzenia jak RFC 8628) --- */
  var ALFABET_KODU = 'BCDFGHJKLMNPQRSTVWXZ23456789';   // bez samogłosek (żadnych słów) i bez 0/O, 1/I
  var KOD_S = 600, ODSTEP_S = 5, WYSYLKA_S = 30;
  function kodUzytkownika() {
    var a = new Uint8Array(8), s = '';
    G.crypto.getRandomValues(a);
    for (var i = 0; i < 8; i++) s += ALFABET_KODU[a[i] % ALFABET_KODU.length];
    return s.slice(0, 4) + '-' + s.slice(4);
  }
  function normKod(t) { var s = String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return s.length === 8 ? s.slice(0, 4) + '-' + s.slice(4) : ''; }
  function sprzatnijKody(d) {
    if (!d.kody) d.kody = {};
    var t = Date.now();
    Object.keys(d.kody).forEach(function (k) { if (d.kody[k].wygasa < t) delete d.kody[k]; });
    return d.kody;
  }
  function slownik() {
    var s = G.CybersoraProgramy;
    if (!s) throw blad('slownik', 'Brak słownika programów.');
    return s;
  }
  // token urządzenia → [konto, urządzenie]; w bazie leży tylko skrót tokenu
  function zUrzadzenia(d, token) {
    if (typeof token !== 'string' || !/^csu_[A-Z0-9]{40}$/.test(token)) return Promise.reject(blad('token', 'Program nie jest połączony z kontem.'));
    return skrot(token).then(function (h) {
      for (var n in d.konta) {
        var k = uzupelnij(d.konta[n]);
        for (var i = 0; i < k.urz.length; i++) if (k.urz[i].hTok === h) return [k, k.urz[i]];
      }
      throw blad('token', 'Program został odłączony od konta.');
    });
  }
  function czystyKoszyk(lista) {
    if (!Array.isArray(lista)) return [];
    return lista.filter(function (i) { return i && typeof i.name === 'string' && i.name.length <= 120 && isFinite(Number(i.price)); })
      .slice(0, 50).map(function (i) { return { name: i.name, price: Number(i.price) }; });
  }
  function zSesjaOdp(d, k, pamietaj) { return { token: nowaSesja(d, k.nick.toLowerCase(), pamietaj), dane: calosc(k, d) }; }

  var TRASY = {
    /* ---- krok 2: rejestracja i logowanie bez haseł ---- */
    'POST /turnstile': function (d) {
      // atrapa widżetu Cloudflare Turnstile: na Workerze token przyjdzie z widżetu i pójdzie do siteverify (P3c)
      sprzatnij(d);
      var t = 'ts_' + losowe(24); d.ts[t] = Date.now() + TS_S * 1000;
      return { token: t };
    },
    'POST /rejestracja/opcje': function (d, c) {
      var nick = nickWolny(d, c.nick);
      if (c.wiek16 !== true) throw blad('wiek', 'Konto mogą założyć osoby, które mają co najmniej 16 lat.');
      limitRejestracji(d);
      zuzyjTurnstile(d, c.turnstile);
      var uid = b64url(losoweBajty(16));
      return { opcje: opcjeRejestracji(d, 'rej', uid, nick, [], { nick: nick }) };
    },
    'POST /rejestracja/klucz': function (d, c) {
      var w = sprawdzOdpowiedz(d, c.odpowiedz, 'webauthn.create', 'rej');
      var nick = nickWolny(d, w.nick);   // nick mógł zniknąć w międzyczasie
      limitRejestracji(d);
      var wk = R.nazwaKlucza(c.nazwa); if (!wk.ok) throw blad('nazwa', wk.blad);
      var k = noweKonto(d, nick, w.uid);
      zapiszKlucz(k, c.odpowiedz, wk.wartosc);
      return zSesjaOdp(d, k, c.pamietaj);
    },
    'POST /logowanie/opcje': function (d) { return { opcje: opcjeLogowania(d) }; },
    'POST /logowanie/klucz': function (d, c) {
      sprawdzOdpowiedz(d, c.odpowiedz, 'webauthn.get', 'log');
      var k = kluczGdziekolwiek(c.odpowiedz.id);
      // ten sam komunikat dla „nie ma klucza” i „konto usunięte”: nie zdradzamy, które konta istnieją
      if (!k) throw blad('klucz-obcy', 'Ten klucz nie pasuje do żadnego konta. Załóż konto albo użyj innego sposobu.');
      uzupelnij(k);
      var uh = c.odpowiedz.response.userHandle;
      if (uh && uh !== k.uid) throw blad('klucz-obcy', 'Ten klucz nie pasuje do żadnego konta. Załóż konto albo użyj innego sposobu.');
      var cl = k.klucze.filter(function (x) { return x.id === c.odpowiedz.id; })[0];
      if (!!cl.atrapa !== !!c.odpowiedz.atrapa) throw blad('klucz', 'Klucz dostępu nie zadziałał. Spróbuj jeszcze raz.');
      cl.ostatnio = dzis(); cl.licznik = (cl.licznik || 0) + 1;
      return zSesjaOdp(d, k, c.pamietaj);
    },
    // OAuth: start = ‘state’ (na Workerze + PKCE i przekierowanie do dostawcy), zwrot = callback /api/oauth/<dostawca>/callback
    'POST /oauth/start': function (d, c) {
      if (R.oauth.indexOf(c.dostawca) < 0) throw blad('dostawca', 'Logowanie tylko przez GitHub albo Discord.');
      if (['log', 'rej', 'polacz'].indexOf(c.cel) < 0) throw blad('cel', 'Zła operacja.');
      var z = { dostawca: c.dostawca, cel: c.cel, wygasa: Date.now() + OAUTH_S * 1000, pamietaj: !!c.pamietaj };
      if (c.cel === 'rej') {
        z.nick = nickWolny(d, c.nick);
        if (c.wiek16 !== true) throw blad('wiek', 'Konto mogą założyć osoby, które mają co najmniej 16 lat.');
        limitRejestracji(d);
        zuzyjTurnstile(d, c.turnstile);
      }
      if (c.cel === 'polacz') z.k = kontoZSesji(d).nick.toLowerCase();
      sprzatnij(d);
      var st = b64url(losoweBajty(24)); d.oauth[st] = z;
      return { state: st };
    },
    'POST /oauth/zwrot': function (d, c) {
      if (TRYB !== 'artefakt') throw blad('trasa', 'Nieznana operacja konta.');   // na Workerze login przychodzi od dostawcy, nie z formularza
      sprzatnij(d);
      var z = typeof c.state === 'string' && d.oauth[c.state];
      if (!z) throw blad('state', 'Logowanie trwało za długo. Zacznij jeszcze raz.');
      delete d.oauth[c.state];
      var wl = R.loginOAuth(z.dostawca, c.login); if (!wl.ok) throw blad('login', wl.blad);
      // atrapa „identyfikatora od dostawcy”: na Workerze to numeryczne id z API GitHuba/Discorda, nie login
      var ext = { id: 'atrapa:' + wl.wartosc.toLowerCase(), login: wl.wartosc };
      var zn = null;
      Object.keys(d.konta).some(function (n) { var o = d.konta[n]; if (o.oauth && o.oauth[z.dostawca] && o.oauth[z.dostawca].id === ext.id) { zn = o; return true; } return false; });
      if (z.cel === 'polacz') {
        var k = d.konta[z.k]; if (!k || !sesja || !d.sesje[sesja.token] || d.sesje[sesja.token].k !== z.k) throw blad('sesja', 'Sesja wygasła. Zaloguj się jeszcze raz.');
        uzupelnij(k); polaczOAuth(d, k, z.dostawca, ext);
        return { dane: calosc(k, d) };
      }
      if (zn) { uzupelnij(zn); var r0 = zSesjaOdp(d, zn, z.pamietaj); r0.istnialo = z.cel === 'rej'; return r0; }   // konto już jest: po prostu logujemy
      if (z.cel === 'log') throw blad('brak', 'Nie ma konta połączonego z tym ' + (z.dostawca === 'github' ? 'GitHubem' : 'Discordem') + '. Załóż konto.');
      var nick = nickWolny(d, z.nick);
      var nk = noweKonto(d, nick);
      polaczOAuth(d, nk, z.dostawca, ext);
      return zSesjaOdp(d, nk, z.pamietaj);
    },

    'GET /': function (d) { return { dane: calosc(kontoZSesji(d), d) }; },
    'POST /wyloguj': function (d) { if (sesja) delete d.sesje[sesja.token]; return {}; },
    'POST /wyloguj-wszedzie': function (d) {
      zabijSesje(d, kontoZSesji(d).nick.toLowerCase(), null);
      return {};
    },
    'POST /wyloguj-inne': function (d) {
      var k = kontoZSesji(d);
      zabijSesje(d, k.nick.toLowerCase(), sesja.token);
      return { dane: calosc(k, d) };
    },

    /* ---- krok 2: sposoby logowania na koncie ---- */
    'POST /klucze/opcje': function (d) {
      var k = kontoZSesji(d);
      if (k.klucze.length >= 10) throw blad('limit', 'Na koncie jest już 10 kluczy dostępu. Usuń któryś.');
      return { opcje: opcjeRejestracji(d, 'dodaj', k.uid, k.nick, k.klucze, { k: k.nick.toLowerCase() }) };
    },
    'POST /klucze': function (d, c) {
      var k = kontoZSesji(d);
      var w = sprawdzOdpowiedz(d, c.odpowiedz, 'webauthn.create', 'dodaj');
      if (w.k !== k.nick.toLowerCase()) throw blad('wyzwanie', 'Minął czas na klucz dostępu. Spróbuj jeszcze raz.');
      var wk = R.nazwaKlucza(c.nazwa); if (!wk.ok) throw blad('nazwa', wk.blad);
      zapiszKlucz(k, c.odpowiedz, wk.wartosc);
      return { dane: calosc(k, d) };
    },
    'PUT /email': function (d, c) {
      var k = kontoZSesji(d), we = R.email(c.adres);
      if (!we.ok) throw blad('email', we.blad);
      var kod = kodEmail();
      return skrot(k.uid + ':' + kod).then(function (h) {
        k.email = { adres: we.wartosc, potw: false, kodH: h, wygasa: Date.now() + 15 * 60000, prob: 0 };
        // atrapa: kod wraca na ekran; na Workerze idzie mailem (usługa wysyłki do wyboru w P3, RODO)
        return { dane: calosc(k, d), kod_atrapa: kod };
      });
    },
    'POST /email/potwierdz': function (d, c) {
      var k = kontoZSesji(d), e = k.email;
      if (!e || e.potw) throw blad('email', 'Nie ma adresu do potwierdzenia.');
      if (Date.now() > e.wygasa || e.prob >= 5) throw blad('kod', 'Kod wygasł. Zapisz adres jeszcze raz, przyjdzie nowy.');
      e.prob += 1;
      return skrot(k.uid + ':' + String(c.kod || '').replace(/\D/g, '')).then(function (h) {
        if (h !== e.kodH) throw blad('kod', 'Zły kod. Zostało prób: ' + (5 - e.prob) + '.');
        e.potw = true; delete e.kodH; delete e.wygasa; delete e.prob;
        return { dane: calosc(k, d) };
      });
    },
    'DELETE /email': function (d) { var k = kontoZSesji(d); k.email = null; return { dane: calosc(k, d) }; },

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
      return { dane: calosc(k, d) };
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
      przyznaj(k);
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
      przyznaj(k);
      return { gra: k.gra };
    },
    'DELETE /': function (d, c) {
      // krok 2: bez hasła potwierdzeniem jest wpisany nick (Worker P3a może dołożyć świeży klucz dostępu)
      var k = kontoZSesji(d), klucz = k.nick.toLowerCase();
      if (String(c.nick || '').trim().toLowerCase() !== klucz) throw blad('nick', 'Wpisz swój nick dokładnie, żeby usunąć konto.');
      delete d.konta[klucz];
      zabijSesje(d, klucz, null);
      var kody = sprzatnijKody(d);
      Object.keys(kody).forEach(function (x) { if (kody[x].k === klucz) delete kody[x]; });
      return { nick: k.nick };
    },

    /* ---- strona programu (bez sesji strony; potem token urządzenia) ---- */
    'POST /urzadzenia/kod': function (d, c) {
      var s = slownik(), prog = s.programy[c.program];
      if (!prog) throw blad('program', 'Nieznany program.');
      var wersja = String(c.wersja_programu || '');
      if (!/^[0-9A-Za-z.+-]{1,20}$/.test(wersja)) throw blad('wersja_programu', 'Zła wersja programu.');
      var nazwa = String(c.nazwa || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40) || prog.nazwa;
      var kody = sprzatnijKody(d), ku;
      do { ku = kodUzytkownika(); } while (kody[ku]);
      var tajny = losowe(40);
      return skrot(tajny).then(function (h) {
        kody[ku] = { hUrz: h, program: c.program, wersja: wersja, nazwa: nazwa, wygasa: Date.now() + KOD_S * 1000, stan: 'czeka', k: null, pyt: 0 };
        var adres = location.origin + location.pathname;
        return { kod_urzadzenia: tajny, kod_uzytkownika: ku, adres: adres, adres_pelny: adres + '?polacz=' + ku, wygasa_s: KOD_S, odstep_s: ODSTEP_S };
      });
    },
    'POST /urzadzenia/token': function (d, c) {
      var kody = sprzatnijKody(d);
      return skrot(String(c.kod_urzadzenia || '')).then(function (h) {
        var ku = Object.keys(kody).filter(function (x) { return kody[x].hUrz === h; })[0];
        if (!ku) throw blad('wygasl', 'Kod wygasł. Poproś program o nowy.');
        var z = kody[ku], teraz = Date.now();
        if (teraz - z.pyt < ODSTEP_S * 1000 - 300) { z.pyt = teraz; throw blad('zwolnij', 'Za często. Pytaj co ' + ODSTEP_S + ' s.'); }
        z.pyt = teraz;
        if (z.stan === 'czeka') throw blad('czeka', 'Czekam na zatwierdzenie na stronie.');
        delete kody[ku];
        if (z.stan === 'odmowa') throw blad('odmowa', 'Połączenie odrzucone na stronie.');
        var k = d.konta[z.k];
        if (!k) throw blad('wygasl', 'Konto już nie istnieje.');
        uzupelnij(k);
        if (k.urz.length >= 10) throw blad('limit', 'Na koncie jest już 10 programów. Odłącz któryś na stronie.');
        var token = 'csu_' + losowe(40);
        return skrot(token).then(function (ht) {
          var u = { id: 'U-' + losowe(6), program: z.program, nazwa: z.nazwa, wersja: z.wersja, od: dzis(), ostatnio: null, hTok: ht };
          k.urz.push(u);
          return { token_urzadzenia: token, urzadzenie: { id: u.id, program: u.program, nazwa: u.nazwa }, konto: { nick: k.nick } };
        });
      });
    },
    'DELETE /urzadzenia/ja': function (d, c, tok) {
      return zUrzadzenia(d, tok).then(function (ku) {
        ku[0].urz = ku[0].urz.filter(function (u) { return u !== ku[1]; });
        return {};
      });
    },

    /* ---- strona www (sesja strony): zgoda, lista, odłączanie, widoczność ---- */
    'POST /urzadzenia/sprawdz': function (d, c) {
      kontoZSesji(d);
      var ku = normKod(c.kod), z = ku && sprzatnijKody(d)[ku];
      if (!z || z.stan !== 'czeka') throw blad('kod', 'Ten kod jest zły albo wygasł. Sprawdź go w programie.');
      var prog = slownik().programy[z.program];
      return { kod: ku, program: z.program, nazwa_programu: prog.nazwa, nazwa: z.nazwa, wersja_programu: z.wersja,
        wygasa_s: Math.max(0, Math.round((z.wygasa - Date.now()) / 1000)) };
    },
    'POST /urzadzenia/zatwierdz': function (d, c) {
      var k = kontoZSesji(d);
      var ku = normKod(c.kod), z = ku && sprzatnijKody(d)[ku];
      if (!z || z.stan !== 'czeka') throw blad('kod', 'Ten kod jest zły albo wygasł. Sprawdź go w programie.');
      z.stan = c.zgoda === true ? 'zgoda' : 'odmowa';
      z.k = k.nick.toLowerCase();
      return { stan: z.stan };
    },
    'PUT /profil/widocznosc': function (d, c) {
      var k = kontoZSesji(d);
      if (typeof c.osiagniecia_publiczne !== 'boolean') throw blad('widocznosc', 'Zła wartość.');
      // decyzja 05.11: profil publiczny tylko dla konta z pewnym logowaniem (klucz/GitHub/Discord) albo potwierdzonym e-mailem
      if (c.osiagniecia_publiczne && !sposoby(k) && !(k.email && k.email.potw)) throw blad('weryfikacja', 'Najpierw dodaj klucz dostępu albo połącz GitHub lub Discord.');
      k.pub = c.osiagniecia_publiczne;
      return { dane: calosc(k, d) };
    },

    /* ---- P1: profil ---- */
    'PUT /profil': function (d, c) {
      var k = kontoZSesji(d);
      if (c.bio !== undefined) {
        var wb = walidujBio(c.bio);
        if (!wb.ok) { var eb = blad('bio', wb.blad); eb.pole = 'bio'; throw eb; }
        k.bio = wb.wartosc;
      }
      if (c.linki !== undefined) {
        if (!c.linki || typeof c.linki !== 'object') throw blad('linki', 'Zła lista linków.');
        var nowe = {}, zmienione = [];
        Object.keys(c.linki).forEach(function (s) { if (SERWISY.indexOf(s) < 0) throw blad('linki', 'Nieznany serwis w linkach.'); });
        SERWISY.forEach(function (s) {
          var w = walidujLink(s, c.linki[s]);
          if (!w.ok) { var el = blad('link', w.blad); el.pole = s; throw el; }
          if (w.wartosc) nowe[s] = w.wartosc;
          var stary = k.linki[s];
          if (!w.wartosc || !stary || stary.id !== w.wartosc.id || stary.typ !== w.wartosc.typ) zmienione.push(s);
        });
        // limit zmian linków: najwyżej 6 na dobę (podmiana linków na spam i zaproszenia do oszustw)
        var teraz = Date.now(), doba = (k.linkiZm || []).filter(function (t) { return teraz - t < 864e5; });
        var dodane = zmienione.filter(function (s) { return nowe[s]; }).length;
        if (dodane && doba.length + dodane > 6) {
          var godz = Math.ceil((864e5 - (teraz - doba[0])) / 36e5);
          throw blad('limit', 'Linki zmieniasz za często. Spróbuj za ' + godz + ' godz.');
        }
        for (var i = 0; i < dodane; i++) doba.push(teraz);
        k.linkiZm = doba;
        // zmieniony link traci znaczek „potwierdzone” (połączenie GitHub/Discord trzeba powtórzyć)
        zmienione.forEach(function (s) { delete k.potw[s]; });
        k.linki = nowe;
      }
      if (c.gablota !== undefined) {
        if (!Array.isArray(c.gablota) || c.gablota.length > 5) throw blad('gablota', 'Gablota: najwyżej 5 odznak.');
        var ma = zdobyteKlucze(k), widz = {};
        c.gablota.forEach(function (g) {
          if (typeof g !== 'string' || ma.indexOf(g) < 0) throw blad('gablota', 'W gablocie mogą być tylko zdobyte odznaki.');
          if (widz[g]) throw blad('gablota', 'Odznaka powtórzona w gablocie.');
          widz[g] = 1;
        });
        k.gablota = c.gablota.slice();
      }
      return { dane: calosc(k, d) };
    },
    'GET /profil/podglad': function (d) { return { profil: projekcja(kontoZSesji(d)) }; }
  };

  /* trasy z parametrem w ścieżce: [wzór, funkcja(d, cialo, token, dopasowanie)] */
  var WZORY = [
    // P1: profil publiczny /u/<nick> (bez sesji). Prywatny = tylko nick, bez żadnych danych.
    [/^GET \/u\/([^/]{1,80})$/, function (d, c, tok, m) {
      var n; try { n = decodeURIComponent(m[1]); } catch (e) { n = ''; }
      var k = d.konta[String(n).trim().toLowerCase()];
      if (!k) throw blad('brak', 'Nie ma takiego profilu.');
      uzupelnij(k);
      return k.pub ? { profil: projekcja(k) } : { prywatny: true, nick: k.nick };
    }],
    // krok 2: usuwanie sposobu logowania; ostatniego się nie da (konto bez wejścia = stracone konto)
    [/^DELETE \/klucze\/([A-Za-z0-9_-]{16,1366})$/, function (d, c, tok, m) {
      var k = kontoZSesji(d);
      if (!k.klucze.some(function (x) { return x.id === m[1]; })) throw blad('klucz', 'Tego klucza już nie ma na koncie.');
      if (sposoby(k) <= 1) throw blad('ostatni', 'To jedyny sposób logowania. Najpierw dodaj drugi.');
      k.klucze = k.klucze.filter(function (x) { return x.id !== m[1]; });
      return { dane: calosc(k, d) };
    }],
    [/^DELETE \/oauth\/(github|discord)$/, function (d, c, tok, m) {
      var k = kontoZSesji(d);
      if (!k.oauth[m[1]]) throw blad('oauth', NAZWA[m[1]] + ' nie jest połączony.');
      if (sposoby(k) <= 1) throw blad('ostatni', 'To jedyny sposób logowania. Najpierw dodaj drugi.');
      delete k.oauth[m[1]]; delete k.potw[m[1]];   // link na profilu zostaje, bez znaczka „potwierdzone”
      return { dane: calosc(k, d) };
    }],
    [/^DELETE \/sesje\/(S-[A-Z0-9]{6})$/, function (d, c, tok, m) {
      var k = kontoZSesji(d), klucz = k.nick.toLowerCase(), byla = false, ta = false;
      Object.keys(d.sesje).forEach(function (t) { if (d.sesje[t].k === klucz && d.sesje[t].id === m[1]) { byla = true; ta = t === sesja.token; delete d.sesje[t]; } });
      if (!byla) throw blad('sesja-brak', 'Tej sesji już nie ma.');
      return ta ? { ta: true } : { dane: calosc(k, d) };
    }],
    [/^DELETE \/urzadzenia\/(U-[A-Z0-9]{6})$/, function (d, c, tok, m) {
      var k = kontoZSesji(d), przed = k.urz.length;
      k.urz = k.urz.filter(function (u) { return u.id !== m[1]; });
      if (k.urz.length === przed) throw blad('urzadzenie', 'Tego programu już nie ma na koncie.');
      return { dane: calosc(k, d) };
    }],
    [/^PUT \/programy\/([a-z]{2,20})\/osiagniecia$/, function (d, c, tok, m) {
      return zUrzadzenia(d, tok).then(function (ku) {
        var k = ku[0], u = ku[1];
        if (u.program !== m[1]) throw blad('program', 'Ten token należy do innego programu.');
        if (JSON.stringify(c).length > slownik().MAKS_BAJTOW) throw blad('rozmiar', 'Za duża treść (najwyżej 8 KB).');
        var teraz = Date.now();
        if (u.wysl && teraz - u.wysl < WYSYLKA_S * 1000) {
          var e = blad('zwolnij', 'Za często. Następna wysyłka za chwilę.'); e.ponow_po_s = Math.ceil((WYSYLKA_S * 1000 - (teraz - u.wysl)) / 1000); throw e;
        }
        var w = slownik().waliduj(m[1], c, teraz);
        if (!w.ok) throw blad('schemat', w.blad + (w.pole ? ' (' + w.pole + ')' : ''));
        w.dane.przyjete_ms = teraz;
        w.dane.urzadzenie = u.id;
        k.programy[m[1]] = w.dane;
        u.wysl = teraz; u.ostatnio = new Date(teraz).toISOString(); u.wersja = c.wersja_programu;
        return { przyjete_ms: teraz, nastepna_po_s: WYSYLKA_S };
      });
    }],
    [/^DELETE \/programy\/([a-z]{2,20})$/, function (d, c, tok, m) {
      // z programu (token urządzenia) albo ze strony (sesja): usuwa osiągnięcia programu, połączenie zostaje
      var p = tok ? zUrzadzenia(d, tok).then(function (ku) { return ku[0]; }) : Promise.resolve(kontoZSesji(d));
      return p.then(function (k) { delete k.programy[m[1]]; return tok ? {} : { dane: calosc(k, d) }; });
    }]
  ];

  function artefakt(metoda, sciezka, cialo, tok) {
    // opóźnienie jak w sieci, żeby stany ładowania w UI były prawdziwe
    return new Promise(function (ok) { setTimeout(ok, 220 + Math.random() * 260); }).then(function () {
      var klucz = metoda + ' ' + sciezka, f = TRASY[klucz], m = null;
      for (var i = 0; !f && i < WZORY.length; i++) { m = WZORY[i][0].exec(klucz); if (m) f = WZORY[i][1]; }
      if (!f) throw blad('trasa', 'Nieznana operacja konta.');
      var d = db(); _db = d;
      return Promise.resolve(f(d, cialo || {}, tok, m)).then(function (wynik) { zapiszDb(d); return wynik; },
        function (e) { zapiszDb(d); throw e; });   // licznik odpytań, zużyte wyzwania i tokeny zostają także po błędzie
    });
  }

  /* ---------------- klucze dostępu w przeglądarce ----------------
     Prawdziwe: SimpleWebAuthnBrowser (vendor/simplewebauthn-browser-14.0.0.umd.min.js, MIT).
     Atrapa (tylko artefakt): podgląd na claude.ai działa w ramce, która nie dostaje uprawnień do kluczy dostępu,
     więc „urządzenie” udaje localStorage tej przeglądarki. Odpowiedź ma ten sam kształt, serwer ją rozpoznaje po polu atrapa. */
  function politykaPozwala(rodzaj) {
    var fp = D.featurePolicy || D.permissionsPolicy;
    try { if (fp && fp.allowsFeature) return fp.allowsFeature(rodzaj === 'create' ? 'publickey-credentials-create' : 'publickey-credentials-get'); } catch (e) { /* stara przeglądarka */ }
    return true;
  }
  var D = document;
  function bladKlucza(e) {
    var kod = e && e.code, nazwa = (e && e.cause && e.cause.name) || (e && e.name) || '', msg = String((e && e.cause && e.cause.message) || (e && e.message) || '');
    var x;
    if (kod === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED' || nazwa === 'InvalidStateError') x = blad('klucz-jest', 'Ten klucz dostępu jest już na koncie.');
    else if (/feature|permissions? policy|not enabled|cross-origin|iframe/i.test(msg) || kod === 'ERROR_INVALID_DOMAIN' || kod === 'ERROR_INVALID_RP_ID' || nazwa === 'SecurityError')
      x = blad('klucz-ramka', 'Ta strona nie może tu użyć klucza dostępu.');
    else if (kod === 'ERROR_CEREMONY_ABORTED' || nazwa === 'NotAllowedError' || nazwa === 'AbortError') x = blad('anulowano', 'Anulowano albo minął czas. Spróbuj jeszcze raz.');
    else if (/not supported/i.test(msg)) x = blad('klucz-brak', 'Ta przeglądarka nie obsługuje kluczy dostępu.');
    else x = blad('klucz', 'Klucz dostępu nie zadziałał. Spróbuj jeszcze raz.');
    x.atrapa = TRYB === 'artefakt' && (x.kod === 'klucz-ramka' || x.kod === 'klucz-brak');
    return x;
  }
  function ceremonia(rodzaj, opcje) {
    var SW = G.SimpleWebAuthnBrowser;
    if (!SW || !SW.browserSupportsWebAuthn()) return Promise.reject(bladKlucza({ message: 'not supported' }));
    if (!politykaPozwala(rodzaj)) return Promise.reject(bladKlucza({ name: 'SecurityError', message: 'feature not enabled' }));
    var p = rodzaj === 'create' ? SW.startRegistration({ optionsJSON: opcje }) : SW.startAuthentication({ optionsJSON: opcje });
    return p.catch(function (e) { throw bladKlucza(e); });
  }
  function atrapyLista() { var l = ls(K_ATRAPA); return Array.isArray(l) ? l : []; }
  function atrapaUtworz(opcje) {
    var id = b64url(losoweBajty(16));
    var l = atrapyLista(); l.unshift({ id: id, uid: opcje.user.id, nick: opcje.user.name, od: Date.now() }); ls(K_ATRAPA, l.slice(0, 20));
    return { id: id, rawId: id, type: 'public-key', atrapa: true, authenticatorAttachment: 'platform', clientExtensionResults: {},
      response: { clientDataJSON: tekstB64url(JSON.stringify({ type: 'webauthn.create', challenge: opcje.challenge, origin: location.origin, crossOrigin: false })),
        attestationObject: '', transports: ['internal'], publicKey: '', publicKeyAlgorithm: -7 } };
  }
  function atrapaPobierz(opcje, id) {
    var a = atrapyLista().filter(function (x) { return x.id === id; })[0];
    if (!a) throw blad('klucz-obcy', 'Na tym urządzeniu nie ma takiego klucza.');
    return { id: a.id, rawId: a.id, type: 'public-key', atrapa: true, authenticatorAttachment: 'platform', clientExtensionResults: {},
      response: { clientDataJSON: tekstB64url(JSON.stringify({ type: 'webauthn.get', challenge: opcje.challenge, origin: location.origin, crossOrigin: false })),
        authenticatorData: '', signature: '', userHandle: a.uid } };
  }
  // z = { atrapa: true } albo { atrapa: '<id klucza-atrapy>' } przy logowaniu
  function kluczNowy(opcje, z) { return z && z.atrapa ? Promise.resolve(atrapaUtworz(opcje)) : ceremonia('create', opcje); }
  function kluczIstniejacy(opcje, z) { return z && z.atrapa ? Promise.resolve().then(function () { return atrapaPobierz(opcje, z.atrapa); }) : ceremonia('get', opcje); }

  var wolaj = TRYB === 'zywo' ? zywo : artefakt;
  function poSesji(r) {
    var p = r.dane.profil;
    ustawSesje({ token: TRYB === 'zywo' ? undefined : r.token, nick: p.nick, ava64: p.ava64, kot: p.kot });
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
  function dane(r) { return odswiezSesje(r.dane); }

  G.KontoAPI = {
    tryb: TRYB,
    sesja: function () { return sesja ? { nick: sesja.nick, ava64: sesja.ava64 || '', kot: sesja.kot || 'kosc' } : null; },
    /* krok 2: rejestracja i logowanie bez haseł. z = { pamietaj, atrapa, nazwa } */
    // artefakt: atrapa Turnstile (token jednorazowy z udawanego serwera). Na Workerze w trybie 'brak' tokenu nie ma (Worker go nie sprawdza).
    turnstile: function () { return TRYB === 'zywo' ? Promise.resolve('brak') : wolaj('POST', '/turnstile').then(function (r) { return r.token; }); },
    // P3c: co pokazać zamiast atrapy. Worker: { tryb: 'wymagany', sitekey, akcja } | { tryb: 'brak' | 'zamkniety' }
    turnstileUstawienia: function () { return TRYB === 'zywo' ? wolaj('GET', '/turnstile') : Promise.resolve({ tryb: 'atrapa' }); },
    rejestracjaKlucz: function (nick, turnstile, wiek16, z) {
      z = z || {};
      return wolaj('POST', '/rejestracja/opcje', { nick: nick, turnstile: turnstile, wiek16: wiek16 === true })
        .then(function (r) { return kluczNowy(r.opcje, z); })
        .then(function (o) { return wolaj('POST', '/rejestracja/klucz', { odpowiedz: o, pamietaj: !!z.pamietaj, nazwa: z.nazwa || '' }); })
        .then(poSesji);
    },
    logowanieKlucz: function (z) {
      z = z || {};
      return wolaj('POST', '/logowanie/opcje').then(function (r) { return kluczIstniejacy(r.opcje, z); })
        .then(function (o) { return wolaj('POST', '/logowanie/klucz', { odpowiedz: o, pamietaj: !!z.pamietaj }); })
        .then(poSesji);
    },
    oauthStart: function (dostawca, cel, z) {
      z = z || {};
      return wolaj('POST', '/oauth/start', { dostawca: dostawca, cel: cel, nick: z.nick, turnstile: z.turnstile, wiek16: z.wiek16 === true, pamietaj: !!z.pamietaj })
        .then(function (r) {
          if (TRYB !== 'zywo') return r.state;
          // Worker: prawdziwy ekran zgody u dostawcy; strona wraca przez /api/konto/oauth/<dostawca>/callback
          location.assign(r.url);
          return new Promise(function () { /* strona odchodzi; przycisk zostaje w stanie „Łączę…” */ });
        });
    },
    // P3a: wynik powrotu z GitHub/Discord ({ ok, wynik|kod, dostawca }) albo null; konto.js pokazuje go raz przy starcie (P3b)
    powrotOAuth: function () { return powrotOAuth; },
    // atrapa ekranu zgody dostawcy: w artefakcie użytkownik wpisuje login; na Workerze to przekierowanie i callback
    oauthZwrot: function (state, login) {
      return wolaj('POST', '/oauth/zwrot', { state: state, login: login }).then(function (r) { return r.token ? poSesji(r) : (odswiezSesje(r.dane), r); });
    },
    // czy ta strona może tu użyć prawdziwego klucza dostępu (przeglądarka + uprawnienia ramki)
    kluczeMozliwe: function () { var SW = G.SimpleWebAuthnBrowser; return !!(SW && SW.browserSupportsWebAuthn() && politykaPozwala('create') && politykaPozwala('get')); },
    atrapyKluczy: function () { return TRYB === 'artefakt' ? atrapyLista().map(function (a) { return { id: a.id, nick: a.nick }; }) : []; },
    ja: zSesja(function () { return wolaj('GET', '/').then(dane); }),
    wyloguj: function () {
      var p = sesja ? wolaj('POST', '/wyloguj').catch(function () { /* lokalnie i tak wylogowujemy */ }) : Promise.resolve();
      return p.then(function () { ustawSesje(null); });
    },
    wylogujWszedzie: zSesja(function () { return wolaj('POST', '/wyloguj-wszedzie').then(function () { ustawSesje(null); }); }),
    wylogujInne: zSesja(function () { return wolaj('POST', '/wyloguj-inne').then(dane); }),
    wylogujSesje: zSesja(function (id) {
      return wolaj('DELETE', '/sesje/' + encodeURIComponent(id)).then(function (r) { if (r.ta) { ustawSesje(null); return null; } return dane(r); });
    }),
    dodajKlucz: zSesja(function (z) {
      z = z || {};
      return wolaj('POST', '/klucze/opcje').then(function (r) { return kluczNowy(r.opcje, z); })
        .then(function (o) { return wolaj('POST', '/klucze', { odpowiedz: o, nazwa: z.nazwa || '' }); }).then(dane);
    }),
    usunKlucz: zSesja(function (id) { return wolaj('DELETE', '/klucze/' + encodeURIComponent(id)).then(dane); }),
    odlaczOAuth: zSesja(function (dostawca) { return wolaj('DELETE', '/oauth/' + encodeURIComponent(dostawca)).then(dane); }),
    emailUstaw: zSesja(function (adres) { return wolaj('PUT', '/email', { adres: adres }).then(function (r) { dane(r); return r; }); }),
    emailPotwierdz: zSesja(function (kod) { return wolaj('POST', '/email/potwierdz', { kod: kod }).then(dane); }),
    emailUsun: zSesja(function () { return wolaj('DELETE', '/email').then(dane); }),
    awatarZdjecie: zSesja(function (d256, d64) { return wolaj('PUT', '/awatar', { d256: d256, d64: d64 }).then(dane); }),
    awatarKot: zSesja(function (kot) { return wolaj('PUT', '/awatar', { kot: kot }).then(dane); }),
    koszykZapisz: zSesja(function (lista) { return wolaj('PUT', '/koszyk', { koszyk: lista }); }),
    koszykScal: zSesja(function (lista) { return wolaj('POST', '/koszyk/scal', { koszyk: lista }); }),
    zamowienie: zSesja(function (pozycje) { return wolaj('POST', '/zamowienia', { pozycje: pozycje }); }),
    rozmowa: zSesja(function (q) { return wolaj('POST', '/rozmowy', { q: q }); }),
    wynikGry: zSesja(function (w) { return wolaj('POST', '/gra', { wynik: w }); }),
    usunKonto: zSesja(function (nick) {
      return wolaj('DELETE', '/', { nick: nick }).then(function (r) {
        // klucze-atrapy usuniętego konta znikają z „urządzenia” (prawdziwy klucz usuwa się w menedżerze haseł/systemie)
        if (TRYB === 'artefakt') ls(K_ATRAPA, atrapyLista().filter(function (a) { return String(a.nick).toLowerCase() !== String(r.nick).toLowerCase(); }));
        ustawSesje(null);
      });
    }),
    // K1: programy na koncie (strona)
    sprawdzKod: zSesja(function (kod) { return wolaj('POST', '/urzadzenia/sprawdz', { kod: kod }); }),
    zatwierdzKod: zSesja(function (kod, zgoda) { return wolaj('POST', '/urzadzenia/zatwierdz', { kod: kod, zgoda: zgoda === true }); }),
    odlaczUrzadzenie: zSesja(function (id) { return wolaj('DELETE', '/urzadzenia/' + encodeURIComponent(id)).then(function (r) { return r.dane; }); }),
    usunDaneProgramu: zSesja(function (program) { return wolaj('DELETE', '/programy/' + encodeURIComponent(program)).then(function (r) { return r.dane; }); }),
    widocznoscOsiagniec: zSesja(function (pub) { return wolaj('PUT', '/profil/widocznosc', { osiagniecia_publiczne: pub === true }).then(function (r) { return r.dane; }); }),
    // P1: profil cybersory
    zapiszProfil: zSesja(function (zmiany) { return wolaj('PUT', '/profil', zmiany).then(function (r) { return r.dane; }); }),
    podgladProfilu: zSesja(function () { return wolaj('GET', '/profil/podglad').then(function (r) { return r.profil; }); }),
    profilPubliczny: function (nick) { return wolaj('GET', '/u/' + encodeURIComponent(String(nick || '').slice(0, 40))); },
    walidacja: { nick: walidujNick, bio: walidujBio, link: walidujLink, adres: adresLinku, serwisy: SERWISY.slice(), email: R.email, nazwaKlucza: R.nazwaKlucza, loginOAuth: R.loginOAuth, NICK_MAX: R.NICK_MAX },
    /* K0: strona programu (SoraEbookReader robi to w Rust, K3). Tu do testów i do symulatora w artefakcie.
       Token urządzenia nie trafia do sesji strony ani do localStorage. */
    program: {
      kod: function (program, wersja, nazwa) { return wolaj('POST', '/urzadzenia/kod', { program: program, wersja_programu: wersja, nazwa: nazwa }); },
      token: function (kodUrz) { return wolaj('POST', '/urzadzenia/token', { kod_urzadzenia: kodUrz }); },
      wyslij: function (token, program, osiagniecia) { return wolaj('PUT', '/programy/' + program + '/osiagniecia', osiagniecia, token); },
      usunDane: function (token, program) { return wolaj('DELETE', '/programy/' + program, null, token); },
      odlacz: function (token) { return wolaj('DELETE', '/urzadzenia/ja', null, token); }
    }
  };
})(window);
