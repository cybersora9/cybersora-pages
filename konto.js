/*! konto.js (04.11.2026): konto cybersory na całą stronę, kierunek B „Szkło nocne”.
 *  Pasek: awatar (gość: sylwetka → logowanie; zalogowany: menu konta). Okna: logowanie/rejestracja/odzyskiwanie,
 *  „Moje konto” (Przegląd, Koszyk, Zamówienia, Gra, Meshuga, Ustawienia), kadrowanie zdjęcia.
 *  Dane wyłącznie przez window.KontoAPI (konto-api.js). Koszyk strony (app.js) zostaje źródłem prawdy w przeglądarce:
 *  słuchamy 'cybersora:koszyk' (zmiana), a po zalogowaniu/wylogowaniu wołamy 'cybersora:koszyk-wczytaj'. */
(function () {
  'use strict';
  if (window.__konto) return; window.__konto = 1;
  var api = window.KontoAPI; if (!api) return;
  var D = document;
  var CART_KEY = 'cybersora_cart';

  /* ---------------- drobne ---------------- */
  function el(tag, cls, txt) { var n = D.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
  function btn(cls, txt, aria) { var b = el('button', cls, txt); b.type = 'button'; if (aria) b.setAttribute('aria-label', aria); return b; }
  var IKO = {
    ja: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    koszyk: '<path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    zam: '<path d="M4 7l8-4 8 4v10l-8 4-8-4z"/><path d="M4 7l8 4 8-4M12 11v10"/>',
    gra: '<rect x="3" y="7" width="18" height="11" rx="5"/><path d="M8 11v3M6.5 12.5h3M15 12h.01M17 14h.01"/>',
    czat: '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>',
    wyjdz: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    aparat: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    ok: '<path d="M5 12l5 5 9-10"/>',
    odznaka: '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.3 7 21l5-2.6 5 2.6-1.5-7.7"/>',
    program: '<rect x="3" y="4" width="18" height="13" rx="3"/><path d="M8 21h8M12 17v4"/>',
    profil: '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="2.2"/><path d="M6 16c.6-1.4 1.8-2.2 3-2.2s2.4.8 3 2.2M14.5 10h4M14.5 13.5h3"/>',
    klucz: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8.5-8.5M16 7l2.5 2.5M13.5 9.5l2 2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/>'
  };
  function ico(n) {
    var s = D.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'kn-ico'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    s.innerHTML = IKO[n];   // stałe ścieżki z tego pliku, bez danych użytkownika
    return s;
  }
  function img(src, alt) { var i = el('img'); i.src = src; i.alt = alt || ''; i.decoding = 'async'; return i; }
  function zl(n) { return Number(n).toLocaleString('pl-PL').replace(/\s/g, ' ') + ' zł'; }
  function pozycje(n) { var d = n % 10, s = n % 100; return n === 1 ? 'pozycja' : (d >= 2 && d <= 4 && (s < 12 || s > 14)) ? 'pozycje' : 'pozycji'; }
  function pozycjeB(n) { var d = n % 10, s = n % 100; return n === 1 ? 'pozycję' : (d >= 2 && d <= 4 && (s < 12 || s > 14)) ? 'pozycje' : 'pozycji'; }
  function data(iso, zGodz) {
    var d = new Date(iso); if (isNaN(d)) return '';
    var s = ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear();
    return zGodz ? s + ', ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) : s;
  }
  function kotUrl(kot, r) { return 'assety/kot-awatar/kot-' + (kot || 'kosc') + '-' + (r || 256) + '.webp'; }
  function avaUrl(p, r) { return (r === 64 ? p.ava64 : p.ava256) || kotUrl(p.kot, r === 64 ? 64 : 256); }
  function koszykLokalny() { try { var k = JSON.parse(localStorage.getItem(CART_KEY)); return Array.isArray(k) ? k : []; } catch (e) { return []; } }
  function koszykUstaw(lista) {
    try { if (lista.length) localStorage.setItem(CART_KEY, JSON.stringify(lista)); else localStorage.removeItem(CART_KEY); } catch (e) { /* tryb prywatny */ }
    window.dispatchEvent(new CustomEvent('cybersora:koszyk-wczytaj'));
  }

  /* ---------------- stan ---------------- */
  var stan = null;          // { profil, koszyk, zamowienia, rozmowy, gra } po zalogowaniu
  function zmiana() {
    odswiezPasek();
    if (ark.open) rysujArkusz();
    window.dispatchEvent(new CustomEvent('konto:zmiana', { detail: publiczny() }));
  }
  function publiczny() {
    var s = stan ? stan.profil : api.sesja();
    if (!s) return null;
    return { nick: s.nick, ava: stan ? avaUrl(stan.profil, 64) : (s.ava64 || kotUrl(s.kot, 64)) };
  }

  /* ---------------- komunikat (toast) ---------------- */
  var toast = el('div', 'kn-toast kn-szklo'); toast.setAttribute('role', 'status');
  var maPopover = typeof toast.showPopover === 'function';
  if (maPopover) toast.popover = 'manual'; else toast.hidden = true;
  var toastOk = el('span', 'kn-toast__ok'); toastOk.appendChild(ico('ok'));
  var toastT = el('span'); toast.append(toastOk, toastT);
  var toastTimer = 0;
  function toastWidac() { return maPopover ? toast.matches(':popover-open') : !toast.hidden; }
  function schowajToast() { if (maPopover) { if (toastWidac()) toast.hidePopover(); } else toast.hidden = true; }
  // blad = komunikat o błędzie: krzyżyk zamiast ptaszka, żeby odmowa nie wyglądała na sukces
  function powiedz(t, blad) {
    toastT.textContent = t;
    toast.classList.toggle('kn-toast--blad', !!blad);
    toastOk.replaceChildren(ico(blad ? 'x' : 'ok'));
    // P1.1: na telefonie komunikat stoi nad dolną krawędzią; gdy okno ma przyklejony pasek zapisu, idzie na górę, żeby go nie zasłaniać
    toast.classList.toggle('kn-toast--gora', !!(window.matchMedia && matchMedia('(max-width:600px)').matches && D.querySelector('dialog[open] .pf-zapis')));
    // ponowne pokazanie przenosi komunikat na wierzch warstwy górnej (nad świeżo otwarte okno)
    if (maPopover) { schowajToast(); toast.showPopover(); } else toast.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(schowajToast, 5200);
  }

  /* ---------------- przycisk w pasku ---------------- */
  var av = btn('kn-av'); av.id = 'knAv';
  function odswiezPasek() {
    var p = publiczny();
    av.textContent = '';
    av.classList.toggle('kn-av--ja', !!p);
    if (p) {
      av.appendChild(img(p.ava, ''));
      av.setAttribute('aria-label', 'Konto: ' + p.nick);
      av.setAttribute('aria-haspopup', 'menu'); av.setAttribute('aria-controls', 'knMenu');
      av.setAttribute('aria-expanded', menu.hidden ? 'false' : 'true');
    } else {
      av.appendChild(ico('ja'));
      av.setAttribute('aria-label', 'Zaloguj się albo załóż konto');
      av.setAttribute('aria-haspopup', 'dialog'); av.removeAttribute('aria-controls'); av.removeAttribute('aria-expanded');
    }
    av.title = p ? p.nick : 'Konto';
  }
  av.addEventListener('click', function (e) {
    if (!publiczny()) { pokazLogowanie('log'); return; }
    menu.hidden ? otworzMenu(e.detail === 0) : zamknijMenu(true);   // detail 0 = Enter/spacja, nie mysz
  });

  /* ---------------- menu konta ---------------- */
  var menu = el('div', 'kn-menu kn-szklo'); menu.id = 'knMenu'; menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', 'Menu konta'); menu.hidden = true;
  function pozycjaMenu(ikona, tekst, akcja, po) {
    var b = btn('kn-wiersz'); b.setAttribute('role', 'menuitem'); b.tabIndex = -1; b.dataset.akcja = akcja;
    b.append(ico(ikona), D.createTextNode(tekst));
    if (po) b.appendChild(po);
    return b;
  }
  function rysujMenu() {
    menu.textContent = '';
    var p = stan ? stan.profil : api.sesja(); if (!p) return;
    var kto = el('div', 'kn-menu__kto');
    var opis = el('div'); opis.append(el('b', null, p.nick), el('span', null, stan ? stan.profil.nr : ''));
    kto.append(img(publiczny().ava, ''), opis);
    menu.appendChild(kto);
    var n = stan ? stan.koszyk.length : koszykLokalny().length;
    var ost = stan && stan.zamowienia[0];
    menu.append(
      pozycjaMenu('ja', 'Moje konto', 'przeglad'),
      pozycjaMenu('profil', 'Mój profil', 'mojprofil'),
      pozycjaMenu('odznaka', 'Osiągnięcia', 'osiagniecia', stan && stan.programy && stan.programy.czytnik ? el('span', 'kn-wiersz__po', 'R' + stan.programy.czytnik.ranga) : null),
      pozycjaMenu('koszyk', 'Koszyk', 'koszyk', el('span', 'kn-wiersz__po', String(n))),
      pozycjaMenu('zam', 'Zamówienia', 'zamowienia', ost ? el('span', 'kn-pill', ETYKIETA[ost.status] || ost.status) : null),
      pozycjaMenu('gra', 'Gra DancyCloud', 'gra', stan && stan.gra.najlepszy ? el('span', 'kn-wiersz__po', String(stan.gra.najlepszy)) : null),
      pozycjaMenu('czat', 'Rozmowy z Meshugą', 'meshuga'),
      el('div', 'kn-sep'),
      pozycjaMenu('wyjdz', 'Wyloguj', 'wyloguj')
    );
  }
  function polozMenu() {
    var r = av.getBoundingClientRect();
    // 06.11: przycisk konta stoi w prawym dolnym rogu, więc menu otwiera się w górę (w pasku otwierało się w dół)
    var wDole = r.top > innerHeight / 2;
    menu.classList.toggle('kn-menu--gora', wDole);
    menu.style.top = wDole ? 'auto' : Math.round(r.bottom + 10) + 'px';
    menu.style.bottom = wDole ? Math.round(innerHeight - r.top + 10) + 'px' : 'auto';
    menu.style.right = Math.max(16, Math.round(innerWidth - r.right)) + 'px';
  }
  function elementyMenu() { return Array.prototype.slice.call(menu.querySelectorAll('[role="menuitem"]')); }
  function otworzMenu(klawiatura) {
    rysujMenu(); polozMenu(); menu.hidden = false; av.setAttribute('aria-expanded', 'true');
    var e = elementyMenu(); if (e[0]) e[0].focus({ focusVisible: !!klawiatura });   // obwódka fokusu tylko przy klawiaturze
  }
  function zamknijMenu(fokus) {
    if (menu.hidden) return;
    menu.hidden = true; av.setAttribute('aria-expanded', 'false');
    if (fokus) av.focus();
  }
  menu.addEventListener('keydown', function (e) {
    var e2 = elementyMenu(), i = e2.indexOf(D.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); e2[(i + 1) % e2.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); e2[(i - 1 + e2.length) % e2.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); e2[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); e2[e2.length - 1].focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); zamknijMenu(true); }
    else if (e.key === 'Tab') zamknijMenu(false);
  });
  menu.addEventListener('click', function (e) {
    var b = e.target.closest('[data-akcja]'); if (!b) return;
    var a = b.dataset.akcja; zamknijMenu(false);
    if (a === 'wyloguj') wyloguj();
    else if (a === 'mojprofil') { var p = publiczny(); if (p && window.ProfilCS) window.ProfilCS.otworz(p.nick); }
    else otworzArkusz(a);
  });
  D.addEventListener('pointerdown', function (e) { if (!menu.hidden && !menu.contains(e.target) && !av.contains(e.target)) zamknijMenu(false); });
  addEventListener('resize', function () { if (!menu.hidden) polozMenu(); });

  /* ---------------- okna: wspólne ---------------- */
  function okno(cls, etykieta) {
    var d = el('dialog', 'kn-dlg kn-szklo ' + cls); d.setAttribute('aria-label', etykieta);
    var w = el('div', 'kn-dlg__in'); d.appendChild(w);
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });   // klik w tło zamyka
    return { d: d, w: w };
  }
  function zamykacz(d, etykieta) {
    var x = btn('kn-btn kn-btn--g kn-btn--o kn-x', null, etykieta || 'Zamknij'); x.appendChild(ico('x'));
    x.addEventListener('click', function () { d.close(); });
    return x;
  }
  function zajety(b, tak, tekst) {
    // krok 2: przycisk z ikoną (klucz, znak GitHub/Discord) wraca razem z ikoną
    if (tak) { if (!b._dzieci) b._dzieci = Array.prototype.slice.call(b.childNodes); b.textContent = tekst; b.disabled = true; b.setAttribute('aria-busy', 'true'); }
    else { if (b._dzieci) { b.replaceChildren.apply(b, b._dzieci); b._dzieci = null; } b.disabled = false; b.removeAttribute('aria-busy'); }
  }
  function pole(id, etyk, typ, auto) {
    var p = el('div', 'kn-pole'), l = el('label', null, etyk), i = el('input', 'kn-in');
    l.htmlFor = id; i.id = id; i.type = typ; i.autocomplete = auto; i.required = true;
    if (typ === 'text') { i.autocapitalize = 'off'; i.spellcheck = false; }
    p.append(l, i); return { p: p, i: i, l: l };
  }
  function check(id, tekst) {
    var p = el('label', 'kn-check'), i = el('input'); i.type = 'checkbox'; i.id = id;
    p.append(i, el('span', null, tekst)); return { p: p, i: i };
  }
  function albo() { var a = el('div', 'kn-albo'); a.appendChild(el('span', null, 'albo')); return a; }
  // znaki GitHub/Discord bierzemy z profil.js (jedno źródło, oryginalne ścieżki Simple Icons); profil.js ładuje się po tym pliku
  function znakMarki(s) { var P = window.ProfilCS; return P && P.znak ? P.znak(s) : null; }
  function wstawZnaki(root) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-dostawca]'), function (b) {
      if (b.querySelector('.pf-znak')) return;
      var z = znakMarki(b.dataset.dostawca); if (z) b.insertBefore(z, b.firstChild);
    });
  }
  var NAZWA_D = { github: 'GitHub', discord: 'Discord' };

  /* ---------------- logowanie i rejestracja: krok 2 serii KONTA BEZPIECZNIE (06.11), bez haseł ----------------
     Klucz dostępu (passkey) na górze, pod nim „albo” → GitHub / Discord. Rejestracja: nick + 16+ + Turnstile + sposób.
     W artefakcie: Turnstile i ekran zgody GitHub/Discord to atrapy; klucz prawdziwy, gdy przeglądarka pozwala (w ramce podglądu nie). */
  var lo = okno('kn-log', 'Konto cybersory'), log = lo.d;
  var loH = el('h2', 'kn-h', 'Konto cybersory');
  var loTaby = el('div', 'kn-taby'); loTaby.setAttribute('role', 'tablist'); loTaby.setAttribute('aria-label', 'Logowanie albo nowe konto');
  var tLog = btn('kn-tab', 'Zaloguj'), tRej = btn('kn-tab', 'Załóż konto');
  [tLog, tRej].forEach(function (t) { t.setAttribute('role', 'tab'); loTaby.appendChild(t); });
  function uwagaAtrapy() {
    var u = el('p', 'kn-uwaga'); u.hidden = true;
    u.append(el('span', 'pf-znacznik', 'ATRAPA'), D.createTextNode('Podgląd blokuje prawdziwe klucze dostępu. Użyjemy klucza-atrapy z tej przeglądarki.'));
    return u;
  }
  function oauthPrzyciski(cel) {
    var w = el('div', 'kn-oauth');
    ['github', 'discord'].forEach(function (s) {
      var b = btn('kn-btn kn-btn--g kn-btn--szer', (cel === 'rej' ? 'Załóż konto przez ' : 'Zaloguj przez ') + NAZWA_D[s]);
      b.dataset.dostawca = s;
      b.addEventListener('click', function () { startOAuth(s, cel, b); });
      w.appendChild(b);
    });
    return w;
  }
  /* panel: logowanie */
  var pLog = el('div', 'kn-etap');
  var bKlucz = btn('kn-btn kn-btn--p kn-btn--szer'); bKlucz.append(ico('klucz'), D.createTextNode('Zaloguj się kluczem dostępu'));
  var cPam = check('knPamietaj', 'Zapamiętaj to urządzenie na 30 dni');
  var uLog = uwagaAtrapy();
  pLog.append(bKlucz, uLog, cPam.p, albo(), oauthPrzyciski('log'));
  /* panel: rejestracja */
  var pRej = el('form', 'kn-etap'); pRej.noValidate = true;
  var fNick = pole('knNick', 'Nick', 'text', 'username');
  fNick.i.maxLength = 20;
  var nLicz = el('span', 'kn-licznik kn-mono', '0/20'); nLicz.setAttribute('aria-hidden', 'true');
  var nGlowa = el('div', 'kn-pole__glowa'); fNick.p.insertBefore(nGlowa, fNick.i); nGlowa.append(fNick.l, nLicz);
  var nPodp = el('p', 'kn-podp'); nPodp.id = 'knNickPodp';
  fNick.i.setAttribute('aria-describedby', 'knNickPodp');
  fNick.p.appendChild(nPodp);
  var cWiek = check('knWiek', 'Mam co najmniej 16 lat');
  var ts = turnstile();
  var bRej = el('button', 'kn-btn kn-btn--p kn-btn--szer'); bRej.type = 'submit'; bRej.append(ico('klucz'), D.createTextNode('Załóż konto z kluczem dostępu'));
  var uRej = uwagaAtrapy();
  pRej.append(fNick.p, cWiek.p, ts.w, bRej, uRej, albo(), oauthPrzyciski('rej'));
  /* panel: zgoda u dostawcy (atrapa ekranu GitHub/Discord) */
  var pOa = el('form', 'kn-etap'); pOa.noValidate = true;
  var oaGlowa = el('div', 'kn-oa__glowa');
  var oaCo = el('p', 'kn-pod');
  var fLogin = pole('knOaLogin', 'Login', 'text', 'off'); fLogin.i.maxLength = 39;
  var bOaOk = el('button', 'kn-btn kn-btn--p'); bOaOk.type = 'submit'; bOaOk.textContent = 'Autoryzuj';
  var bOaWstecz = btn('kn-btn kn-btn--g', 'Wróć');
  var oaRz = el('div', 'kn-rzad kn-rzad--k'); oaRz.append(bOaWstecz, bOaOk);
  pOa.append(oaGlowa, oaCo, fLogin.p, oaRz);
  /* panel: po założeniu konta (zachęta do drugiego sposobu: konto z jednym kluczem ginie razem z urządzeniem) */
  var pPo = el('div', 'kn-etap');
  var bPoDodaj = btn('kn-btn kn-btn--p', 'Dodaj drugi sposób'), bPoPozniej = btn('kn-btn kn-btn--g', 'Później');
  var poRz = el('div', 'kn-rzad kn-rzad--k'); poRz.append(bPoPozniej, bPoDodaj);
  pPo.append(el('p', 'kn-ostrz', 'Masz jeden sposób logowania. Dodaj drugi, żeby nie stracić konta razem z urządzeniem.'), poRz);
  var loBlad = el('p', 'kn-blad'); loBlad.setAttribute('role', 'alert'); loBlad.id = 'knLogBlad';
  var loWybor = el('div', 'kn-wybor'); loWybor.hidden = true;   // atrapa okna „wybierz klucz” przeglądarki
  lo.w.append(zamykacz(log), loH, loTaby, pLog, pRej, pOa, pPo, loBlad, loWybor);

  /* 15.11 (maisa): oczy Meshugi zaglądają znad okna logowania i rejestracji. Źrenice idą za kursorem,
     a przy pisaniu patrzą na pole z fokusem; co kilka sekund mrugnięcie (bez mrugania przy „ogranicz ruch”).
     maisa: „w środku, nie na zewnątrz” — oczy stoją w oknie, nad tytułem. Treść statyczna, bez danych użytkownika. */
  (function oczyMeshugi() {
    var NS = 'http://www.w3.org/2000/svg';
    var oko = function (s) {   // s = 1 lewe, -1 prawe (lustro); kąciki zewnętrzne w górę jak u kota
      var x = function (v) { return s === 1 ? v : 200 - v; };
      return 'M' + x(10) + ' 18 Q' + x(46) + ' 4 ' + x(84) + ' 26 Q' + x(66) + ' 50 ' + x(40) + ' 46 Q' + x(16) + ' 40 ' + x(10) + ' 18Z';
    };
    var svg = D.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'kn-oczy'); svg.setAttribute('viewBox', '0 0 200 52');
    svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    svg.innerHTML =
      '<defs><radialGradient id="knOkoT" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#ff7a6b"/><stop offset=".45" stop-color="#ff3a52"/><stop offset="1" stop-color="#8c0f22"/></radialGradient>' +
      '<clipPath id="knOkoL"><path d="' + oko(1) + '"/></clipPath><clipPath id="knOkoP"><path d="' + oko(-1) + '"/></clipPath></defs>' +
      [[1, 'knOkoL', 48], [-1, 'knOkoP', 152]].map(function (o) {
        return '<g class="kn-oko"><path d="' + oko(o[0]) + '" fill="url(#knOkoT)"/>' +
          '<g clip-path="url(#' + o[1] + ')"><g class="kn-oko__zr" data-cx="' + o[2] + '"><ellipse cx="' + o[2] + '" cy="27" rx="4.6" ry="17" fill="#0e0e12"/>' +
          '<circle cx="' + (o[2] + 7) + '" cy="20" r="2.4" fill="#f6f2f3" opacity=".85"/></g></g>' +
          '<path d="' + oko(o[0]) + '" fill="none" stroke="#0e0e12" stroke-width="2.5"/></g>';
      }).join('');
    lo.w.insertBefore(svg, loH);
    var zr = svg.querySelectorAll('.kn-oko__zr'), cel = null, klatka = 0;
    function patrz(px, py) {
      var r = svg.getBoundingClientRect(); if (!r.width) return;
      var k = r.width / 200;
      Array.prototype.forEach.call(zr, function (g) {
        var cx = r.left + (+g.dataset.cx) * k, cy = r.top + 27 * k;
        var dx = Math.max(-1, Math.min(1, (px - cx) / 260)), dy = Math.max(-1, Math.min(1, (py - cy) / 260));
        g.setAttribute('transform', 'translate(' + (dx * 13).toFixed(1) + ' ' + (dy * 5).toFixed(1) + ')');
      });
    }
    function naPunkt(px, py) { cel = [px, py]; if (!klatka) klatka = requestAnimationFrame(function () { klatka = 0; patrz(cel[0], cel[1]); }); }
    log.addEventListener('pointermove', function (e) { if (e.pointerType !== 'touch') naPunkt(e.clientX, e.clientY); });
    log.addEventListener('focusin', function (e) {
      var r = e.target.getBoundingClientRect && e.target.getBoundingClientRect();
      if (r && r.width) naPunkt(r.left + Math.min(r.width / 2, 60), r.top + r.height / 2);
    });
    log.addEventListener('input', function (e) {   // przy pisaniu oko idzie za kursorem tekstu (w przybliżeniu: długość wpisu)
      var t = e.target; if (!t || t.tagName !== 'INPUT') return;
      var r = t.getBoundingClientRect(); naPunkt(r.left + 14 + Math.min(t.value.length * 9, r.width - 28), r.top + r.height / 2);
    });
    log.addEventListener('close', function () { Array.prototype.forEach.call(zr, function (g) { g.removeAttribute('transform'); }); });
  })();

  function turnstile() {
    // artefakt (i Worker z TURNSTILE=brak): atrapa widżetu, token jednorazowy z udawanego serwera.
    // P3c: gdy Worker mówi „wymagany”, w to miejsce wchodzi prawdziwy widżet Cloudflare (pokaz() przy otwarciu zakładki).
    var w = el('div', 'kn-ts'), b = btn('kn-ts__pole'); b.id = 'knTs';
    b.setAttribute('role', 'checkbox'); b.setAttribute('aria-checked', 'false');
    var kw = el('span', 'kn-ts__kw'), t = el('span', null, 'Nie jestem botem');
    b.append(kw, t);
    var m = el('span', 'kn-ts__marka'); m.append(el('span', 'kn-mono', 'TURNSTILE'), el('span', 'pf-znacznik', 'ATRAPA'));
    w.append(b, m);
    var token = null, trwa = false, cf = null, widzet = null, ustawienia = null;
    var o = { w: w, b: b, token: function () { return token; }, reset: reset, pokaz: pokaz };
    function reset() {
      token = null; trwa = false; w.dataset.stan = ''; b.setAttribute('aria-checked', 'false'); b.removeAttribute('aria-invalid'); t.textContent = 'Nie jestem botem'; kw.textContent = '';
      // token Cloudflare też jest jednorazowy: po każdej próbie widżet bierze nowy
      if (widzet !== null && window.turnstile) try { window.turnstile.reset(widzet); } catch (e) { /* widżet już zniknął */ }
    }
    b.addEventListener('click', function () {
      if (token || trwa || cf) return;
      trwa = true; w.dataset.stan = 'sprawdza'; t.textContent = 'Sprawdzam…'; b.removeAttribute('aria-invalid');
      api.turnstile().then(function (x) {
        token = x; trwa = false; w.dataset.stan = 'ok'; b.setAttribute('aria-checked', 'true'); t.textContent = 'Gotowe'; kw.replaceChildren(ico('ok'));
        if (/botem/.test(loBlad.textContent)) loBlad.textContent = '';
      }, function (e) { reset(); loBlad.textContent = e.message; });
    });
    function skrypt() {
      if (window.turnstile) return Promise.resolve();
      return new Promise(function (ok, zle) {
        var s = D.createElement('script');
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        s.onload = function () { window.turnstile ? ok() : zle(); };
        s.onerror = zle;
        D.head.appendChild(s);
      });
    }
    function prawdziwy(u) {
      cf = el('div', 'kn-ts__cf'); cf.tabIndex = -1; cf.setAttribute('aria-label', 'Antyspam Cloudflare Turnstile');
      w.dataset.widget = 'cf'; b.hidden = true; m.hidden = true; w.insertBefore(cf, b);
      o.b = cf;   // błąd „Potwierdź, że nie jesteś botem” wskazuje widżet
      skrypt().then(function () {
        widzet = window.turnstile.render(cf, {
          sitekey: u.sitekey, action: u.akcja, theme: 'dark', language: 'pl', size: 'flexible', appearance: 'always',
          callback: function (x) { token = x; w.dataset.stan = 'ok'; cf.removeAttribute('aria-invalid'); if (/nie jesteś botem|się nie załadował/.test(loBlad.textContent)) loBlad.textContent = ''; },   // 15.11: błędy serwera (np. „Antyspam nie odpowiada”) zostają widoczne po resecie widżetu
          'expired-callback': function () { token = null; w.dataset.stan = ''; },
          'error-callback': function () { token = null; w.dataset.stan = 'blad'; loBlad.textContent = 'Antyspam się nie załadował. Odśwież stronę i spróbuj jeszcze raz.'; return true; }
        });
      }, function () { w.dataset.stan = 'blad'; loBlad.textContent = 'Antyspam się nie załadował. Sprawdź połączenie i odśwież stronę.'; });
    }
    function pokaz() {
      if (api.tryb !== 'zywo' || ustawienia) return;
      b.disabled = true;   // dopóki Worker nie powie, czy antyspam jest prawdziwy, atrapy nie da się kliknąć
      ustawienia = api.turnstileUstawienia().then(function (u) { b.disabled = false; if (u && u.tryb === 'wymagany' && u.sitekey) prawdziwy(u); },
        function () { b.disabled = false; ustawienia = null; /* następne otwarcie zakładki spróbuje jeszcze raz */ });
    }
    return o;
  }

  var trybLog = 'log', oa = null, wymusAtrapa = false;
  function atrapaTryb() { return api.tryb === 'artefakt' && (wymusAtrapa || !api.kluczeMozliwe()); }
  function odswiezAtrapy() { var on = atrapaTryb(); uLog.hidden = uRej.hidden = !on; }
  function widok(v) {
    pLog.hidden = v !== 'log'; pRej.hidden = v !== 'rej'; pOa.hidden = v !== 'oa'; pPo.hidden = v !== 'po';
    loTaby.hidden = v === 'oa' || v === 'po';
    loWybor.hidden = true;
    // błąd stoi tuż przy tym, czego dotyczy: pod kluczem, nad „Załóż konto”, nad „Autoryzuj”
    if (v === 'log') { pLog.insertBefore(loBlad, cPam.p); pLog.insertBefore(loWybor, cPam.p); }
    else if (v === 'rej') pRej.insertBefore(loBlad, bRej);
    else if (v === 'oa') pOa.insertBefore(loBlad, oaRz);
    else pPo.appendChild(loBlad);
  }
  function czysc() {
    loBlad.textContent = '';
    [fNick.i, cWiek.i, ts.b, fLogin.i].forEach(function (i) { i.removeAttribute('aria-invalid'); });
    fNick.i.setAttribute('aria-describedby', 'knNickPodp');
  }
  function ustawTryb(t) {
    trybLog = t;
    tLog.setAttribute('aria-selected', String(t === 'log')); tRej.setAttribute('aria-selected', String(t === 'rej'));
    tLog.tabIndex = t === 'rej' ? -1 : 0; tRej.tabIndex = t === 'rej' ? 0 : -1;
    loH.textContent = 'Konto cybersory';
    widok(t); czysc(); odswiezAtrapy();
    if (t === 'rej') { licz(); ts.pokaz(); }
  }
  tLog.addEventListener('click', function () { ustawTryb('log'); bKlucz.focus(); });
  tRej.addEventListener('click', function () { ustawTryb('rej'); fNick.i.focus(); });
  loTaby.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault(); (trybLog === 'log' ? tRej : tLog).click(); (trybLog === 'log' ? tLog : tRej).focus();
  });
  function pokazLogowanie(t) {
    zamknijMenu(false);
    pRej.reset(); cPam.i.checked = false; ts.reset(); oa = null;
    wstawZnaki(lo.w);
    ustawTryb(t || 'log');
    if (!log.open) log.showModal();
    (trybLog === 'rej' ? fNick.i : bKlucz).focus();
  }
  function bladPola(i, t) {
    loBlad.textContent = t;
    if (i) { i.setAttribute('aria-invalid', 'true'); i.setAttribute('aria-describedby', (i === fNick.i ? 'knNickPodp ' : '') + 'knLogBlad'); i.focus(); }
  }
  /* nick: licznik i reguły na żywo (te same co na serwerze, konto-reguly.js); błąd dopiero od 3 znaków albo po wyjściu z pola */
  function licz(naWyjscie) {
    var v = fNick.i.value.trim(), n = Array.from(v).length;
    nLicz.textContent = n + '/20';
    var w = v ? api.walidacja.nick(v) : null;
    nPodp.textContent = w && !w.ok && (n >= 3 || naWyjscie) ? w.blad : '';
  }
  fNick.i.addEventListener('input', function () { fNick.i.removeAttribute('aria-invalid'); if (loBlad.textContent) loBlad.textContent = ''; licz(); });
  fNick.i.addEventListener('blur', function () { licz(true); });
  cWiek.i.addEventListener('change', function () { cWiek.i.removeAttribute('aria-invalid'); });
  // rejestracja: wspólne sprawdzenie dla klucza i dla GitHub/Discord
  function daneRejestracji() {
    czysc();
    var w = api.walidacja.nick(fNick.i.value);
    if (!fNick.i.value.trim()) { bladPola(fNick.i, 'Wpisz nick.'); return null; }
    if (!w.ok) { bladPola(fNick.i, w.blad); return null; }
    if (!cWiek.i.checked) { bladPola(cWiek.i, 'Zaznacz, że masz co najmniej 16 lat.'); return null; }
    if (!ts.token()) { bladPola(ts.b, 'Potwierdź, że nie jesteś botem.'); return null; }
    return { nick: w.wartosc, turnstile: ts.token(), wiek16: true };
  }
  function bladKluczaUI(e) {
    if (e.atrapa) {   // ramka podglądu nie dopuszcza kluczy: przełączamy na atrapę i prosimy o jeszcze jedno kliknięcie
      wymusAtrapa = true; odswiezAtrapy();
      loBlad.textContent = 'Ten podgląd nie dopuszcza prawdziwych kluczy dostępu. Kliknij jeszcze raz: użyjemy klucza-atrapy.';
      return;
    }
    bladPola(e.kod === 'nick' ? fNick.i : e.kod === 'wiek' ? cWiek.i : e.kod === 'turnstile' ? ts.b : null, e.message || 'Coś nie zagrało. Spróbuj jeszcze raz.');
  }
  pRej.addEventListener('submit', function (e) {
    e.preventDefault();
    var r = daneRejestracji(); if (!r) return;
    var gosc = koszykLokalny();
    zajety(bRej, true, 'Czekam na klucz…');
    api.rejestracjaKlucz(r.nick, r.turnstile, true, { atrapa: atrapaTryb() }).then(function (x) {
      zajety(bRej, false); return poZalogowaniu(x, gosc, true);
    }, function (er) { zajety(bRej, false); ts.reset(); bladKluczaUI(er); });   // token Turnstile jest jednorazowy
  });
  bKlucz.addEventListener('click', function () {
    czysc();
    if (!atrapaTryb()) return logujZ({});
    var l = api.atrapyKluczy();
    if (!l.length) return bladPola(null, 'Na tym urządzeniu nie ma klucza dostępu. Załóż konto albo zaloguj się przez GitHub lub Discord.');
    if (l.length === 1) return logujZ({ atrapa: l[0].id });
    // kilka kluczy: jak okno przeglądarki „wybierz klucz dostępu”
    loWybor.replaceChildren(el('span', 'kn-lab', 'Wybierz klucz z tego urządzenia'));
    l.forEach(function (a) {
      var b = btn('kn-wiersz'); b.append(ico('klucz'), D.createTextNode(a.nick));
      b.addEventListener('click', function () { loWybor.hidden = true; logujZ({ atrapa: a.id }); });
      loWybor.appendChild(b);
    });
    loWybor.hidden = false; loWybor.querySelector('button').focus();
  });
  function logujZ(z) {
    var gosc = koszykLokalny();
    z.pamietaj = cPam.i.checked;
    zajety(bKlucz, true, 'Czekam na klucz…');
    api.logowanieKlucz(z).then(function (r) { zajety(bKlucz, false); return poZalogowaniu(r, gosc, false); },
      function (e) { zajety(bKlucz, false); bladKluczaUI(e); bKlucz.focus(); });
  }
  /* GitHub / Discord: start (state) → ekran zgody u dostawcy (tu atrapa) → zwrot */
  function startOAuth(s, cel, b) {
    var z = { pamietaj: cPam.i.checked };
    if (cel === 'rej') { var r = daneRejestracji(); if (!r) return; z.nick = r.nick; z.turnstile = r.turnstile; z.wiek16 = true; }
    else czysc();
    zajety(b, true, 'Łączę…');
    api.oauthStart(s, cel, z).then(function (st) {
      zajety(b, false); if (cel === 'rej') ts.reset();
      pokazZgode(s, cel, st);
    }, function (e) { zajety(b, false); if (e.kod === 'turnstile' || e.kod === 'limit') ts.reset(); bladKluczaUI(e); });
  }
  function pokazZgode(s, cel, st) {
    oa = { dostawca: s, cel: cel, state: st };
    oaGlowa.replaceChildren();
    var z = znakMarki(s); if (z) oaGlowa.appendChild(z);
    oaGlowa.append(el('b', null, NAZWA_D[s]), el('span', 'pf-znacznik', 'ATRAPA'));
    oaCo.textContent = 'cybersora dostanie od ' + NAZWA_D[s] + ' tylko identyfikator i nazwę użytkownika.';
    fLogin.l.textContent = s === 'github' ? 'Twój login na GitHubie' : 'Twoja nazwa na Discordzie';
    fLogin.i.value = '';
    loH.textContent = (cel === 'polacz' ? 'Połącz z ' : cel === 'rej' ? 'Załóż konto przez ' : 'Zaloguj przez ') + NAZWA_D[s];
    widok('oa'); czysc();
    if (!log.open) { zamknijMenu(false); log.showModal(); }
    fLogin.i.focus();
  }
  fLogin.i.addEventListener('input', function () { fLogin.i.removeAttribute('aria-invalid'); });
  pOa.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!oa) return;
    czysc();
    var w = api.walidacja.loginOAuth(oa.dostawca, fLogin.i.value);
    if (!fLogin.i.value.trim()) return bladPola(fLogin.i, 'Wpisz login.');
    if (!w.ok) return bladPola(fLogin.i, w.blad);
    var gosc = koszykLokalny(), o = oa;
    zajety(bOaOk, true, 'Autoryzuję…');
    api.oauthZwrot(o.state, w.wartosc).then(function (r) {
      zajety(bOaOk, false); oa = null;
      if (o.cel === 'polacz') {
        stan = r.dane; zmiana(); log.close();
        powiedz(NAZWA_D[o.dostawca] + ' połączony. Link na profilu ma znaczek „potwierdzone”.');
        return;
      }
      return poZalogowaniu(r, gosc, o.cel === 'rej' && !r.istnialo);
    }, function (er) {
      zajety(bOaOk, false); oa = null;
      if (o.cel === 'polacz') { log.close(); powiedz(er.message, true); return; }
      ustawTryb(o.cel === 'rej' && er.kod !== 'brak' ? 'rej' : 'log');   // state jest jednorazowy: wracamy do początku
      bladPola(null, er.message);
    });
  });
  bOaWstecz.addEventListener('click', function () {
    var c = oa && oa.cel; oa = null;
    if (c === 'polacz') { log.close(); return; }
    ustawTryb(c === 'rej' ? 'rej' : 'log'); (c === 'rej' ? fNick.i : bKlucz).focus();
  });
  function polaczOAuth(s) {
    if (!stan) return;
    api.oauthStart(s, 'polacz', {}).then(function (st) { pokazZgode(s, 'polacz', st); }, function (e) { powiedz(e.message, true); });
  }
  function poZalogowaniu(r, gosc, nowe) {
    stan = r.dane;
    return scalKoszyk(gosc).then(function () {
      zmiana();
      if (nowe) { loH.textContent = 'Konto gotowe'; widok('po'); czysc(); bPoDodaj.focus(); return; }
      log.close();
      if (czekaKod) { otworzArkusz('programy'); return; }   // przyszedł z linku programu (?polacz=)
      if (r.istnialo) { powiedz('To konto już istniało. Zalogowano jako ' + stan.profil.nick + '.'); return; }
      if (toastWidac() && /koszyka gościa/.test(toastT.textContent)) return;
      powiedz('Cześć, ' + stan.profil.nick + '.');
    });
  }
  bPoDodaj.addEventListener('click', function () {
    log.close(); otworzArkusz('ustawienia');
    var s = D.getElementById('knSposoby'); if (s) s.scrollIntoView({ block: 'start' });
  });
  bPoPozniej.addEventListener('click', function () {
    log.close();
    if (czekaKod) { otworzArkusz('programy'); return; }
    otworzArkusz('przeglad');
    powiedz('Konto gotowe.' + (scalone ? ' Dodaliśmy ' + scalone + ' ' + pozycjeB(scalone) + ' z koszyka gościa.' : '') + ' Zdjęcie dodasz przyciskiem z aparatem.');
  });
  log.addEventListener('close', function () { oa = null; if (!ark.open && !kadr.open) av.focus(); });

  /* ---------------- koszyk: scalanie i synchronizacja ---------------- */
  var scalone = 0;   // ile pozycji gościa doszło przy ostatnim logowaniu (do komunikatu po rejestracji)
  function scalKoszyk(gosc) {
    scalone = 0;
    var lista = gosc.filter(function (i) { return i && typeof i.name === 'string'; });
    if (!lista.length) { koszykUstaw(stan.koszyk.slice()); return Promise.resolve(); }
    return api.koszykScal(lista).then(function (r) {
      stan.koszyk = r.koszyk; koszykUstaw(r.koszyk.slice()); scalone = r.dodane;
      if (r.dodane) powiedz('Dodaliśmy ' + r.dodane + ' ' + pozycjeB(r.dodane) + ' z koszyka gościa do Twojego konta.');
    }, function () { /* scalenie nieudane: koszyk gościa zostaje lokalnie */ });
  }
  window.addEventListener('cybersora:koszyk', function (e) {
    if (!stan) return;
    var lista = (e.detail && e.detail.items) || koszykLokalny();
    stan.koszyk = lista.slice();
    api.koszykZapisz(lista).catch(function () { /* następna zmiana spróbuje jeszcze raz */ });
    if (ark.open) rysujArkusz();
  });
  /* zamówienie z koszyka wysłane formularzem Kontaktu → trafia na konto, koszyk się czyści */
  window.addEventListener('cybersora:wyslano', function (e) {
    if (!stan || !e.detail || !/^Zamówienie z koszyka/.test(e.detail.temat || '')) return;
    var poz = koszykLokalny(); if (!poz.length) return;
    api.zamowienie(poz).then(function (r) {
      stan.zamowienia.unshift(r.zamowienie); stan.koszyk = []; koszykUstaw([]);
      zmiana(); powiedz('Zamówienie ' + r.zamowienie.nr + ' jest na Twoim koncie.');
    }).catch(function () {});
  });
  /* gra: wynik każdej rundy */
  window.addEventListener('dancycloud:wynik', function (e) {
    if (!stan || !e.detail) return;
    api.wynikGry(e.detail.score).then(function (r) { stan.gra = r.gra; if (ark.open) rysujArkusz(); }).catch(function () {});
  });

  /* ---------------- Moje konto ---------------- */
  var ao = okno('kn-ark', 'Moje konto'), ark = ao.d;
  var ETYKIETA = { wyslane: 'Wysłane', wycena: 'Wycena', praca: 'W pracy', gotowe: 'Gotowe' };
  var KROKI = ['wyslane', 'wycena', 'praca', 'gotowe'];
  var ZAKLADKI = [['przeglad', 'Przegląd'], ['profil', 'Profil'], ['osiagniecia', 'Osiągnięcia'], ['programy', 'Programy'], ['koszyk', 'Koszyk'], ['zamowienia', 'Zamówienia'], ['gra', 'Gra'], ['meshuga', 'Meshuga'], ['ustawienia', 'Ustawienia']];
  var zakladka = 'przeglad';
  var arkGlowa = el('div', 'kn-glowa');
  var arkTaby = el('div', 'kn-taby'); arkTaby.setAttribute('role', 'tablist'); arkTaby.setAttribute('aria-label', 'Sekcje konta');
  var arkPanel = el('div', 'kn-panel'); arkPanel.setAttribute('role', 'tabpanel'); arkPanel.id = 'knPanel'; arkPanel.tabIndex = -1;
  ZAKLADKI.forEach(function (z) {
    var t = btn('kn-tab', z[1]); t.setAttribute('role', 'tab'); t.dataset.z = z[0]; t.id = 'knTab-' + z[0]; t.setAttribute('aria-controls', 'knPanel');
    arkTaby.appendChild(t);
  });
  // 06.11 (P1.1): kątownik .kn-kat wycięty (karta standardu, zasada 1: zero kątowników)
  ao.w.append(zamykacz(ark, 'Zamknij konto'), arkGlowa, arkTaby, arkPanel);
  // komunikat z poprzedniej zakładki nie wisi nad nową (P1.1)
  arkTaby.addEventListener('click', function (e) { var t = e.target.closest('[data-z]'); if (t) { if (t.dataset.z !== zakladka) schowajToast(); zakladka = t.dataset.z; rysujArkusz(); } });
  arkTaby.addEventListener('keydown', function (e) {
    var t = Array.prototype.slice.call(arkTaby.children), i = t.indexOf(D.activeElement);
    var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? t.length - 1 : null;
    if (n === null || i < 0) return;
    e.preventDefault(); n = (n + t.length) % t.length;
    schowajToast(); zakladka = t[n].dataset.z; rysujArkusz(); t[n].focus();
  });
  function idzDo(z) { if (z !== zakladka) schowajToast(); zakladka = z; rysujArkusz(); var t = D.getElementById('knTab-' + z); if (t) t.focus(); }

  function otworzArkusz(z) {
    if (!api.sesja()) { pokazLogowanie('log'); return; }
    zakladka = z || 'przeglad';
    if (!ark.open) narysowana = null;   // zdarzenie close przychodzi później niż ponowne otwarcie
    rysujArkusz();
    if (!ark.open) ark.showModal();
    var t = D.getElementById('knTab-' + zakladka); if (t) t.focus();
    if (!stan) wczytaj();
  }
  ark.addEventListener('close', function () { narysowana = null; if (!kadr.open) av.focus(); });

  function rysujArkusz() {
    arkGlowa.textContent = ''; arkPanel.textContent = '';
    Array.prototype.forEach.call(arkTaby.children, function (t) {
      var on = t.dataset.z === zakladka; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
    });
    arkPanel.setAttribute('aria-labelledby', 'knTab-' + zakladka);
    if (!stan) { arkPanel.appendChild(el('div', 'kn-ladowanie', 'Wczytuję konto…')); return; }
    var p = stan.profil;
    var avW = el('div', 'kn-glowa__av'); avW.appendChild(img(avaUrl(p, 256), ''));
    var aparat = btn('kn-aparat', null, 'Zmień zdjęcie'); aparat.appendChild(ico('aparat'));
    aparat.addEventListener('click', function () { pokazKadr(); });
    avW.appendChild(aparat);
    arkGlowa.append(avW, el('h2', null, p.nick), el('span', 'kn-mono', p.nr + ' · od ' + data(p.od)));
    ({ przeglad: pPrzeglad, profil: pProfil, osiagniecia: pOsiagniecia, programy: pProgramy, koszyk: pKoszyk, zamowienia: pZamowienia, gra: pGra, meshuga: pMeshuga, ustawienia: pUstawienia })[zakladka]();
    narysowana = zakladka;
  }
  var narysowana = null;   // zakładka z poprzedniego rysowania (null po zamknięciu okna): Ustawienia odświeżają się tylko przy wejściu
  function karta(etyk, doZ) {
    var k = doZ ? btn('kn-karta') : el('div', 'kn-karta');
    if (doZ) k.addEventListener('click', function () { idzDo(doZ); });
    k.appendChild(el('span', 'kn-lab', etyk));
    return k;
  }
  function wiersz(a, b) { var r = el('div', 'kn-poz'); r.append(el('span', null, a), el('span', null, b)); return r; }
  function kroki(status) {
    var u = el('ol', 'kn-kroki'), i0 = KROKI.indexOf(status);
    u.setAttribute('aria-label', 'Status: ' + (ETYKIETA[status] || status));
    KROKI.forEach(function (k, i) {
      var li = el('li', 'kn-krok' + (i < i0 ? ' kn-krok--byl' : i === i0 ? ' kn-krok--teraz' : ''));
      li.append(el('i'), D.createTextNode(ETYKIETA[k]));
      if (i === i0) li.setAttribute('aria-current', 'step');
      u.appendChild(li);
    });
    return u;
  }
  function pPrzeglad() {
    var s = el('div', 'kn-siatka');
    var k1 = karta('Koszyk · ' + stan.koszyk.length + ' ' + pozycje(stan.koszyk.length), 'koszyk');
    if (stan.koszyk.length) stan.koszyk.slice(0, 3).forEach(function (i) { k1.appendChild(wiersz(i.name, zl(i.price))); });
    else k1.appendChild(el('span', 'kn-pod', 'Pusto.'));
    var z = stan.zamowienia[0];
    var k2 = karta(z ? 'Zamówienie · ' + z.nr : 'Zamówienia', 'zamowienia');
    if (z) { k2.appendChild(el('span', null, z.pozycje.map(function (i) { return i.name; }).join(', '))); k2.appendChild(kroki(z.status)); }
    else k2.appendChild(el('span', 'kn-pod', 'Jeszcze żadnych.'));
    var k3 = karta('Gra DancyCloud', 'gra');
    var w = el('div'); w.style.cssText = 'display:flex;align-items:baseline;gap:10px';
    w.append(el('span', 'kn-duzy', stan.gra.najlepszy ? stan.gra.najlepszy.toLocaleString('pl-PL') : '—'), el('span', 'kn-lab', 'najlepszy wynik'));
    k3.appendChild(w);
    var r = stan.rozmowy[0];
    var k4 = karta('Meshuga · ostatnie pytanie', 'meshuga');
    if (r) { k4.append(el('span', null, '„' + r.q + '”'), el('span', 'kn-lab', data(r.kiedy, true))); }
    else k4.appendChild(el('span', 'kn-pod', 'Jeszcze nie rozmawialiście.'));
    var k0 = karta('Osiągnięcia', 'osiagniecia'); k0.classList.add('kn-karta--szer');
    var cz = stan.programy && stan.programy.czytnik;
    if (cz && SL) {
      var r0 = el('div', 'pg-mini');
      var e0 = el('span', 'pg-mini__em'); e0.innerHTML = SL.svgEmblematu('czytnik', cz.ranga, false);
      var t0 = el('div'); t0.append(el('b', null, SL.programy.czytnik.rangi[cz.ranga - 1].pl), el('span', 'kn-mono', SL.programy.czytnik.nazwa + ' · R' + cz.ranga + ' · ' + liczba(cz.xp) + ' XP · ' + zdobyteStale(cz) + '/' + SL.programy.czytnik.odznaki.length + ' odznak'));
      r0.append(e0, t0); k0.appendChild(r0);
    } else k0.appendChild(el('span', 'kn-pod', 'Połącz SoraEbookReader, a jego ranga i odznaki pojawią się tutaj.'));
    // krok 2: konto z jednym sposobem logowania (albo stare konto testowe z hasłem) dostaje ostrzeżenie na górze
    var B = stan.bezpieczenstwo;
    if (B && B.sposoby < 2) {
      var kb = el('div', 'kn-karta kn-karta--uwaga');
      var dod = btn('kn-btn kn-btn--p', B.sposoby ? 'Dodaj drugi sposób logowania' : 'Dodaj klucz dostępu');
      dod.style.alignSelf = 'flex-start';
      dod.addEventListener('click', function () { idzDo('ustawienia'); var x = D.getElementById('knSposoby'); if (x) x.scrollIntoView({ block: 'start' }); });
      kb.append(el('p', 'kn-ostrz', B.sposoby ? 'Masz jeden sposób logowania. Zgubione urządzenie = stracone konto.' : 'To konto testowe miało hasło, którego już nie ma. Bez klucza dostępu po wylogowaniu nie wejdziesz.'), dod);
      s.appendChild(kb);
    }
    s.append(k0, k1, k2, k3, k4);
    arkPanel.appendChild(s);
  }

  /* ---------------- K1: osiągnięcia programów i połączone programy ---------------- */
  var SL = window.CybersoraProgramy || null;
  var filtrOdz = 'wszystkie';
  function liczba(n) { return Number(n).toLocaleString('pl-PL').replace(/\s/g, ' '); }
  function dataMs(ms, zGodz) { return data(new Date(ms).toISOString(), zGodz); }
  function zdobyteStale(p) { return p.odznaki.filter(function (o) { return !/^wyzwanie_/.test(o.klucz); }).length; }
  function svgEl(cls, html) { var s = el('span', cls); s.setAttribute('aria-hidden', 'true'); s.innerHTML = html; return s; }   // html tylko ze słownika
  function przelacznik(on, etyk, naZmiane) {
    var b = btn('kn-switch'); b.setAttribute('role', 'switch'); b.setAttribute('aria-checked', String(on));
    b.append(el('span', 'kn-switch__t', etyk), el('span', 'kn-switch__s kn-mono', on ? 'PUBLICZNY' : 'PRYWATNY'), el('i'));
    b.addEventListener('click', function () { naZmiane(b.getAttribute('aria-checked') !== 'true', b); });
    return b;
  }

  /* P1: ustawienia profilu rysuje profil.js (wiersze linków, opis, gablota, widoczność, obrazek OG) */
  function pProfil() {
    if (window.ProfilCS) window.ProfilCS.ustawienia(arkPanel, stan);
    else arkPanel.appendChild(el('p', 'kn-pusto', 'Profil jeszcze się wczytuje.'));
  }
  function pOsiagniecia() {
    // P1: jedna flaga widoczności = cały profil publiczny (z osiągnięciami)
    // P1.1: etykieta mówi, CO przełącza; stan obok (było „Profil publiczny … PRYWATNY”, przeczyło samo sobie)
    var pub = przelacznik(!!stan.profil.osiagniecia_publiczne, 'Widoczność profilu', function (nowe, b) {
      b.disabled = true;
      api.widocznoscOsiagniec(nowe).then(function (d) {
        stan = d; zmiana();
        var x = arkPanel.querySelector('.kn-switch'); if (x) x.focus();
        powiedz(nowe ? 'Profil jest publiczny.' : 'Profil jest prywatny. Widzisz go tylko Ty.');
      }, function (e) { b.disabled = false; powiedz(e.message, true); });
    });
    arkPanel.appendChild(pub);
    var programy = stan.programy || {};
    var lista = Object.keys(programy).filter(function (p) { return SL && SL.programy[p]; });
    if (!lista.length) {
      var pusto = el('div', 'kn-karta pg-pusto');
      pusto.appendChild(svgEl('pg-pusto__em', SL ? SL.svgEmblematu('czytnik', 1, true) : ''));
      pusto.appendChild(el('p', 'kn-pusto', 'Jeszcze żadnych osiągnięć z programów.'));
      var dp = btn('kn-btn kn-btn--p', 'Połącz SoraEbookReader');
      dp.addEventListener('click', function () { idzDo('programy'); });
      pusto.appendChild(dp);
      arkPanel.appendChild(pusto);
      return;
    }
    lista.forEach(function (p) { arkPanel.appendChild(blokProgramu(p, programy[p])); });
  }

  function blokProgramu(p, d) {
    var def = SL.programy[p], R = def.rangi, maks = R.length;
    var sek = el('section', 'pg-prog'); sek.setAttribute('aria-label', 'Osiągnięcia: ' + def.nazwa);
    // karta rangi (jak .czyt-rank w czytniku)
    var kr = el('div', 'kn-karta pg-ranga');
    kr.appendChild(svgEl('pg-ranga__em', SL.svgEmblematu(p, d.ranga, false)));
    var t = el('div', 'pg-ranga__t');
    t.appendChild(el('span', 'pg-eyebrow kn-mono', def.nazwa.toUpperCase() + ' · RANGA R' + d.ranga + ' Z ' + maks));
    t.appendChild(el('h3', null, R[d.ranga - 1].pl));
    var nast = d.ranga < maks ? R[d.ranga] : null, od = R[d.ranga - 1].xp;
    var proc = nast ? Math.max(0, Math.min(100, Math.round((d.xp - od) / (nast.xp - od) * 100))) : 100;
    var xp = el('div', 'pg-xp');
    var tor = el('div', 'pg-tor'); tor.setAttribute('role', 'progressbar'); tor.setAttribute('aria-valuemin', '0'); tor.setAttribute('aria-valuemax', '100');
    tor.setAttribute('aria-valuenow', String(proc)); tor.setAttribute('aria-label', 'Postęp do następnej rangi');
    var pas = el('i'); pas.style.width = proc + '%'; tor.appendChild(pas);
    xp.append(tor, el('span', 'kn-mono', nast ? liczba(d.xp) + ' / ' + liczba(nast.xp) + ' XP' : liczba(d.xp) + ' XP'));
    t.appendChild(xp);
    t.appendChild(el('p', 'kn-pod', nast ? 'Do rangi ' + nast.pl + ' brakuje ' + liczba(nast.xp - d.xp) + ' XP.' : 'To najwyższa ranga.'));
    var chipy = el('div', 'pg-chipy');
    var n = zdobyteStale(d);
    chipy.append(el('span', 'pg-chip kn-mono', n + ' Z ' + def.odznaki.length + ' ODZNAK'));
    Object.keys(d.podsumowanie || {}).forEach(function (k) { if (def.podsumowanie[k]) chipy.appendChild(el('span', 'pg-chip kn-mono', liczba(d.podsumowanie[k]) + ' ' + def.podsumowanie[k].pl.toUpperCase())); });
    t.appendChild(chipy);
    kr.appendChild(t);
    sek.appendChild(kr);

    // nagłówek siatki + filtr
    var glowa = el('div', 'pg-glowa');
    var h = el('h4', null, 'Odznaki '); h.appendChild(el('span', 'kn-mono', n + ' Z ' + def.odznaki.length));
    var seg = el('div', 'pg-seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Pokaż odznaki');
    [['wszystkie', 'Wszystkie'], ['zdobyte', 'Zdobyte'], ['do', 'Do zdobycia']].forEach(function (f) {
      var b = btn('pg-seg__b', f[1]); b.setAttribute('aria-pressed', String(filtrOdz === f[0]));
      b.addEventListener('click', function () { filtrOdz = f[0]; rysujSiatke(); Array.prototype.forEach.call(seg.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); }); });
      seg.appendChild(b);
    });
    glowa.append(h, seg);
    sek.appendChild(glowa);

    var ul = el('ul', 'pg-odznaki'); ul.setAttribute('aria-label', 'Odznaki ' + def.nazwa);
    var zdob = {}; d.odznaki.forEach(function (o) { zdob[o.klucz] = o; });
    // stałe w kolejności czytnika, potem zdobyte wyzwania roczne
    var wszystkie = def.odznaki.map(function (o) { return { klucz: o.klucz, z: zdob[o.klucz] }; })
      .concat(d.odznaki.filter(function (o) { return /^wyzwanie_/.test(o.klucz); }).map(function (o) { return { klucz: o.klucz, z: o }; }));
    function rysujSiatke() {
      ul.textContent = '';
      var widac = wszystkie.filter(function (x) { return filtrOdz === 'wszystkie' || (filtrOdz === 'zdobyte') === !!x.z; });
      if (!widac.length) { ul.appendChild(el('li', 'pg-odz-pusto', filtrOdz === 'zdobyte' ? 'Jeszcze żadnej.' : 'Wszystkie zdobyte.')); return; }
      widac.forEach(function (x) {
        var o = SL.opisOdznaki(p, x.klucz, x.z && x.z.prog);
        if (!o) return;
        var li = el('li', 'pg-odz' + (x.z ? ' pg-odz--ma' : ''));
        li.appendChild(svgEl('pg-odz__ik', SL.svgIkony(o.ikona)));
        var tt = el('div', 'pg-odz__t');
        tt.append(el('b', null, o.nazwa), el('p', null, o.opis));
        // jak w czytniku: krótka data dd.mm przy XP, pełna w dymku
        var meta = el('span', 'kn-mono', x.z ? '+' + liczba(o.xp) + ' XP · ' + dataMs(x.z.zdobyta_ms).slice(0, 5) : liczba(o.xp) + ' XP');
        if (x.z) meta.title = 'Zdobyta ' + dataMs(x.z.zdobyta_ms);
        tt.appendChild(meta);
        li.appendChild(tt);
        li.setAttribute('aria-label', o.nazwa + (x.z ? ', zdobyta ' + dataMs(x.z.zdobyta_ms) : ', jeszcze nie zdobyta'));
        ul.appendChild(li);
      });
    }
    rysujSiatke();
    sek.appendChild(ul);

    // stopka: skąd i kiedy, usunięcie danych programu
    var st = el('div', 'pg-stopka');
    st.appendChild(el('span', 'kn-mono', 'WYSŁANE ' + dataMs(d.przyjete_ms, true) + ' · ' + def.nazwa + ' ' + d.wersja_programu));
    var usun = btn('kn-link', 'Usuń dane ' + def.krotko + 'a z konta');
    var potw = el('div', 'kn-ostrz pg-potw'); potw.hidden = true;
    var tak = btn('kn-btn kn-btn--ostrz', 'Usuń'), nie = btn('kn-btn kn-btn--g', 'Anuluj');
    var rz = el('div', 'kn-rzad'); rz.append(tak, nie);
    potw.append(el('span', null, 'Usunąć rangę i odznaki ' + def.krotko + 'a z konta? Program dalej jest połączony i przy następnej wysyłce wyśle je znowu. Żeby przestał, odłącz go w zakładce Programy.'), rz);
    usun.addEventListener('click', function () { potw.hidden = false; usun.hidden = true; tak.focus(); });
    nie.addEventListener('click', function () { potw.hidden = true; usun.hidden = false; usun.focus(); });
    tak.addEventListener('click', function () {
      zajety(tak, true, 'Usuwam…');
      api.usunDaneProgramu(p).then(function (dd) { stan = dd; zmiana(); powiedz('Dane ' + def.krotko + 'a usunięte z konta.'); D.getElementById('knTab-osiagniecia').focus(); },
        function (e) { zajety(tak, false); powiedz(e.message, true); });
    });
    st.append(usun, potw);
    sek.appendChild(st);
    return sek;
  }

  /* zakładka Programy: kod z programu → zgoda → lista połączonych, odłączanie */
  var czekaKod = '';           // kod z linku ?polacz= (program otworzył przeglądarkę)
  var zgoda = null;            // { kod, program, nazwa_programu, nazwa, wersja_programu, wygasa_s, t0 } po „Dalej”
  function pProgramy() {
    var kp = el('form', 'kn-karta'); kp.noValidate = true;
    if (zgoda) {
      var def = SL && SL.programy[zgoda.program];
      kp.classList.add('pg-zgoda');
      kp.appendChild(el('span', 'kn-lab', 'Połączenie z programem'));
      var kto = el('div', 'pg-urz');
      kto.appendChild(svgEl('pg-urz__ik', SL ? SL.svgIkony(def ? def.ikona : 'read') : ''));
      var mk = el('span', 'kn-mono', zgoda.nazwa + ' · '); mk.appendChild(el('span', 'pg-nw', 'KOD ' + zgoda.kod));   // kod nie łamie się na myślniku
      var o = el('div'); o.append(el('b', null, zgoda.nazwa_programu + ' ' + zgoda.wersja_programu), mk);
      kto.appendChild(o); kp.appendChild(kto);
      kp.appendChild(el('h3', 'kn-h', 'Połączyć z kontem ' + stan.profil.nick + '?'));
      var co = el('ul', 'pg-co');
      ['ranga i XP', 'odznaki z datami zdobycia', 'liczba przeczytanych'].forEach(function (x) { var li = el('li'); li.append(ico('ok'), D.createTextNode(x)); co.appendChild(li); });
      kp.appendChild(co);
      kp.appendChild(el('p', 'kn-ostrz', 'Program nie wyśle tytułów, plików, zakreśleń, notatek ani czasu czytania. Odłączysz go tutaj w każdej chwili.'));
      var zost = Math.max(0, zgoda.wygasa_s - Math.round((Date.now() - zgoda.t0) / 1000));
      kp.appendChild(el('span', 'kn-mono pg-wazny', 'KOD WAŻNY JESZCZE ' + Math.floor(zost / 60) + ':' + ('0' + zost % 60).slice(-2)));
      var bl = el('p', 'kn-blad'); bl.setAttribute('role', 'alert'); kp.appendChild(bl);
      var ok = el('button', 'kn-btn kn-btn--p', 'Połącz'); ok.type = 'submit';
      var nie = btn('kn-btn kn-btn--g', 'Odmów');
      var rz = el('div', 'kn-rzad'); rz.append(ok, nie); kp.appendChild(rz);
      var decyzja = function (tak, b) {
        zajety(b, true, tak ? 'Łączę…' : 'Odmawiam…');
        api.zatwierdzKod(zgoda.kod, tak).then(function () {
          var nazwa = zgoda.nazwa_programu; zgoda = null; czekaKod = '';
          rysujArkusz();
          powiedz(tak ? 'Połączone. ' + nazwa + ' dokończy to sam w ciągu kilku sekund.' : 'Odmówione. Program nie dostał dostępu.');
          wczytajPoChwili();
        }, function (e) { zajety(b, false); bl.textContent = e.message; if (e.kod === 'kod') { zgoda = null; setTimeout(rysujArkusz, 1600); } });
      };
      kp.addEventListener('submit', function (e) { e.preventDefault(); decyzja(true, ok); });
      nie.addEventListener('click', function () { decyzja(false, nie); });
      arkPanel.appendChild(kp);
      setTimeout(function () { ok.focus(); }, 0);
    } else {
      kp.appendChild(el('span', 'kn-lab', 'Połącz program'));
      var pk = pole('knKodProg', 'Kod z programu', 'text', 'off');
      pk.i.classList.add('kn-mono', 'pg-kodin'); pk.i.placeholder = 'XXXX-XXXX'; pk.i.maxLength = 9; pk.i.spellcheck = false;
      pk.i.setAttribute('autocapitalize', 'characters'); pk.i.value = czekaKod;
      var bl2 = el('p', 'kn-blad'); bl2.setAttribute('role', 'alert'); bl2.id = 'knKodProgBlad';
      var dalej = el('button', 'kn-btn kn-btn--p', 'Dalej'); dalej.type = 'submit';
      var rz2 = el('div', 'pg-kodrz'); rz2.append(pk.p, dalej);
      kp.append(rz2, bl2);
      pk.i.addEventListener('input', function () {
        var s = pk.i.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
        pk.i.value = s.length > 4 ? s.slice(0, 4) + '-' + s.slice(4) : s;
      });
      kp.addEventListener('submit', function (e) {
        e.preventDefault();
        if (pk.i.value.replace(/-/g, '').length !== 8) { bl2.textContent = 'Kod ma 8 znaków, np. BCDF-2345.'; pk.i.setAttribute('aria-invalid', 'true'); pk.i.setAttribute('aria-describedby', 'knKodProgBlad'); pk.i.focus(); return; }
        zajety(dalej, true, 'Sprawdzam…');
        api.sprawdzKod(pk.i.value).then(function (r) {
          r.t0 = Date.now(); zgoda = r; rysujArkusz();
        }, function (er) { zajety(dalej, false); bl2.textContent = er.message; pk.i.setAttribute('aria-invalid', 'true'); pk.i.setAttribute('aria-describedby', 'knKodProgBlad'); pk.i.focus(); });
      });
      arkPanel.appendChild(kp);
      if (czekaKod) {   // kod z linku sprawdzamy raz, sam; potem pole zostaje do ręcznej poprawki
        czekaKod = '';
        setTimeout(function () { if (kp.isConnected) dalej.click(); }, 0);
      }
    }

    // połączone programy
    var kl = el('div', 'kn-karta');
    kl.appendChild(el('span', 'kn-lab', 'Połączone programy'));
    var urz = stan.urzadzenia || [];
    if (!urz.length) kl.appendChild(el('span', 'kn-pod', 'Żaden program nie jest połączony.'));
    else {
      var ul = el('ul', 'kn-lista pg-lista');
      urz.forEach(function (u) {
        var def = SL && SL.programy[u.program];
        var li = el('li');
        li.appendChild(svgEl('pg-urz__ik', SL ? SL.svgIkony(def ? def.ikona : 'read') : ''));
        var o = el('div', 'pg-lista__t');
        o.append(el('b', null, (def ? def.nazwa : u.program) + ' ' + u.wersja_programu),
          el('span', 'kn-mono', u.nazwa + ' · OD ' + data(u.od) + ' · ' + (u.ostatnio ? 'WYSŁANE ' + data(u.ostatnio, true) : 'JESZCZE NIC NIE WYSŁAŁ')));
        var od = btn('kn-btn kn-btn--g pg-odlacz', 'Odłącz', 'Odłącz ' + (def ? def.nazwa : u.program) + ' (' + u.nazwa + ')');
        od.addEventListener('click', function () {
          if (od.dataset.pewne !== '1') { od.dataset.pewne = '1'; od.textContent = 'Na pewno odłączyć?'; od.classList.add('kn-btn--ostrz'); return; }
          zajety(od, true, 'Odłączam…');
          api.odlaczUrzadzenie(u.id).then(function (d) { stan = d; zmiana(); powiedz('Odłączone. Program nie może już nic wysłać na konto.'); D.getElementById('knTab-programy').focus(); },
            function (e) { zajety(od, false); powiedz(e.message, true); });
        });
        li.append(o, od);
        ul.appendChild(li);
      });
      kl.appendChild(ul);
      kl.appendChild(el('p', 'kn-pod pg-przyp', 'Odłączenie zatrzymuje wysyłkę. Osiągnięcia zostają na koncie, usuniesz je w zakładce Osiągnięcia.'));
    }
    arkPanel.appendChild(kl);
    if (api.tryb === 'artefakt') arkPanel.appendChild(symulator());
  }
  function wczytajPoChwili() {
    // program odbiera token przy następnym odpytaniu (co 5 s); potem odświeżamy listę
    setTimeout(function () { if (stan) wczytaj(); }, 6500);
  }

  /* --- tylko artefakt: udawany SoraEbookReader (to, co w K3 zrobi apka w Rust) --- */
  var SYM = { tok: null, kodUrz: null, kod: '', stan: 'brak', xp: 4120, timer: 0 };
  function przykladOsiagniec() {
    var t = Date.now(), dz = 86400000;
    var odz = [
      { klucz: 'pierwsza_strona', zdobyta_ms: t - 30 * dz }, { klucz: 'seria_7', zdobyta_ms: t - 21 * dz },
      { klucz: 'nocny_marek', zdobyta_ms: t - 18 * dz }, { klucz: 'tysiac_stron', zdobyta_ms: t - 9 * dz },
      { klucz: 'zakreslacz', zdobyta_ms: t - 6 * dz }, { klucz: 'caly_tom', zdobyta_ms: t - 4 * dz },
      { klucz: 'klasyka', zdobyta_ms: t - 2 * dz }
    ];
    if (SYM.xp > 4120) odz.push({ klucz: 'maraton', zdobyta_ms: t - 60000 });
    return { format: 'cybersora.osiagniecia', wersja: 1, program: 'czytnik', wersja_programu: '1.3.0', policzono_ms: t,
      ranga: SL.rangaZXp('czytnik', SYM.xp), xp: SYM.xp, odznaki: odz, podsumowanie: { przeczytane: SYM.xp > 4120 ? 24 : 23 } };
  }
  function symulator() {
    var k = el('div', 'kn-karta pg-sym');
    k.appendChild(el('span', 'pg-eyebrow kn-mono', 'ARTEFAKT · UDAWANY SORAEBOOKREADER'));
    var st = el('p', 'kn-pod'); st.setAttribute('aria-live', 'polite');
    var rz = el('div', 'kn-rzad');
    var b1 = btn('kn-btn kn-btn--g', SYM.stan === 'kod' ? 'Nowy kod' : 'Czytnik prosi o kod');
    var b2 = btn('kn-btn kn-btn--g', 'Wyślij teraz');
    b2.disabled = !SYM.tok;
    if (SYM.stan === 'kod') {
      var kd = el('div', 'kn-kod', SYM.kod); kd.setAttribute('aria-label', 'Kod z czytnika: ' + SYM.kod);
      k.appendChild(kd);
      st.textContent = 'Czytnik pokazuje ten kod i czeka na zgodę (pyta co 5 s).';
    } else st.textContent = SYM.tok ? 'Czytnik połączony. Automatycznie wysyła najwyżej raz na kilka minut; „Wyślij teraz” od razu.' : 'Tu udajesz czytnik: poproś o kod, wpisz go wyżej i zatwierdź.';
    b1.addEventListener('click', function () {
      zajety(b1, true, 'Proszę o kod…');
      api.program.kod('czytnik', '1.3.0', 'Laptop · Windows').then(function (r) {
        SYM.kodUrz = r.kod_urzadzenia; SYM.kod = r.kod_uzytkownika; SYM.stan = 'kod'; SYM.tok = null;
        clearTimeout(SYM.timer); SYM.timer = setTimeout(odpytaj, r.odstep_s * 1000);
        rysujArkusz();
      }, function (e) { zajety(b1, false); powiedz(e.message, true); });
    });
    b2.addEventListener('click', function () {
      SYM.xp += 180; zajety(b2, true, 'Wysyłam…');
      api.program.wyslij(SYM.tok, 'czytnik', przykladOsiagniec()).then(function () { zajety(b2, false); powiedz('Czytnik wysłał osiągnięcia.'); wczytaj(); },
        function (e) { SYM.xp -= 180; zajety(b2, false); if (e.kod === 'token') { SYM.tok = null; rysujArkusz(); } powiedz(e.message, true); });
    });
    rz.append(b1, b2);
    k.append(st, rz);
    return k;
  }
  function odpytaj() {
    if (!SYM.kodUrz) return;
    api.program.token(SYM.kodUrz).then(function (r) {
      SYM.tok = r.token_urzadzenia; SYM.kodUrz = null; SYM.stan = 'polaczony';
      return api.program.wyslij(SYM.tok, 'czytnik', przykladOsiagniec());
    }).then(function () { if (stan) wczytaj(); }, function (e) {
      if (e.kod === 'czeka' || e.kod === 'zwolnij') { SYM.timer = setTimeout(odpytaj, 5000); return; }
      SYM.kodUrz = null; SYM.stan = 'brak'; if (ark.open && zakladka === 'programy') rysujArkusz(); powiedz('Czytnik: ' + e.message);
    });
  }
  function pKoszyk() {
    if (!stan.koszyk.length) {
      arkPanel.appendChild(el('p', 'kn-pusto', 'Koszyk jest pusty.'));
      var a = el('a', 'kn-btn kn-btn--g', 'Zobacz Ofertę'); a.href = '#oferta'; a.dataset.nav = 'oferta'; a.style.alignSelf = 'center';
      a.addEventListener('click', function () { ark.close(); });
      arkPanel.appendChild(a); return;
    }
    var ul = el('ul', 'kn-lista');
    stan.koszyk.forEach(function (i) {
      var li = el('li'); var u = btn('kn-btn kn-btn--g', 'Usuń', 'Usuń z koszyka: ' + i.name);
      u.style.minHeight = '40px'; u.style.padding = '0 14px'; u.style.fontSize = '13px';
      u.addEventListener('click', function () {
        var lista = stan.koszyk.filter(function (j) { return j.name !== i.name; });
        stan.koszyk = lista; koszykUstaw(lista.slice()); api.koszykZapisz(lista).catch(function () {});
        rysujArkusz(); var nast = arkPanel.querySelector('.kn-lista button') || D.getElementById('knTab-koszyk'); if (nast) nast.focus();
      });
      li.append(el('span', null, i.name), el('span', 'kn-cena', zl(i.price)), u);
      ul.appendChild(li);
    });
    var suma = el('div', 'kn-suma'); suma.append(el('span', 'kn-lab', 'Razem'), el('b', null, zl(stan.koszyk.reduce(function (s, i) { return s + Number(i.price); }, 0))));
    var zam = btn('kn-btn kn-btn--p', 'Przejdź do zamówienia');
    zam.addEventListener('click', function () { ark.close(); var z = D.getElementById('koszykZamow'); if (z) z.click(); });
    var info = el('p', 'kn-pod', 'Zamówienie wysyłasz formularzem Kontaktu. Po wysłaniu zobaczysz je w zakładce Zamówienia.');
    arkPanel.append(ul, suma, zam, info);
  }
  function pZamowienia() {
    if (!stan.zamowienia.length) { arkPanel.appendChild(el('p', 'kn-pusto', 'Nie masz jeszcze zamówień.')); return; }
    stan.zamowienia.forEach(function (z) {
      var k = el('div', 'kn-karta');
      var g = el('div', 'kn-poz'); g.append(el('span', null, z.nr), el('span', null, data(z.od, true)));
      k.appendChild(g);
      z.pozycje.forEach(function (i) { k.appendChild(wiersz(i.name, zl(i.price))); });
      k.appendChild(kroki(z.status));
      arkPanel.appendChild(k);
    });
    arkPanel.appendChild(el('p', 'kn-pod', 'Wycenę dostaniesz mailem do 2 dni roboczych.'));
  }
  function pGra() {
    var k = el('div', 'kn-karta');
    var w = el('div'); w.style.cssText = 'display:flex;align-items:baseline;gap:10px';
    w.append(el('span', 'kn-duzy', stan.gra.najlepszy ? stan.gra.najlepszy.toLocaleString('pl-PL') : '—'), el('span', 'kn-lab', 'najlepszy wynik'));
    k.append(el('span', 'kn-lab', 'DancyCloud'), w, el('span', 'kn-pod', stan.gra.gier ? 'Rozegrane rundy: ' + stan.gra.gier : 'Jeszcze nie grałeś na tym koncie.'));
    var a = el('a', 'kn-btn kn-btn--p', 'Zagraj w DancyCloud'); a.href = '#soraos'; a.dataset.nav = 'soraos'; a.style.alignSelf = 'flex-start';
    a.addEventListener('click', function () { ark.close(); });
    k.appendChild(a);
    arkPanel.appendChild(k);
  }
  function pMeshuga() {
    var pisz = btn('kn-btn kn-btn--p', 'Napisz do Meshugi'); pisz.style.alignSelf = 'flex-start';
    pisz.addEventListener('click', function () { ark.close(); if (window.kotCzat) window.kotCzat.otworz(); });
    if (!stan.rozmowy.length) { arkPanel.append(el('p', 'kn-pusto', 'Jeszcze nie rozmawialiście.'), pisz); return; }
    var ul = el('ul', 'kn-lista');
    stan.rozmowy.slice(0, 12).forEach(function (r) {
      var li = el('li'); var o = btn('kn-link', 'Zapytaj znowu', 'Zapytaj znowu: ' + r.q);
      o.addEventListener('click', function () { ark.close(); if (window.kotCzat) window.kotCzat.otworz(r.q); });
      li.append(el('span', null, '„' + r.q + '”'), el('span', 'kn-cena', data(r.kiedy, true)), o);
      ul.appendChild(li);
    });
    arkPanel.append(ul, pisz);
  }
  function pUstawienia() {
    // sesje i sposoby logowania zmieniają się poza tą kartą (inne urządzenie): przy wejściu dociągamy świeży stan,
    // a przerysowujemy tylko, gdy coś się zmieniło (żeby nie zjadać tego, co ktoś właśnie wpisuje)
    if (narysowana !== 'ustawienia') {
      api.ja().then(function (d) {
        // „ostatnio” zmienia się przy każdym zapytaniu, więc nie liczy się jako zmiana
        var odcisk = function (b) { return JSON.stringify(b || null, function (k, v) { return k === 'ostatnio' ? undefined : v; }); };
        var inne = odcisk(d.bezpieczenstwo) !== odcisk(stan && stan.bezpieczenstwo);
        stan = d;
        if (inne && ark.open && zakladka === 'ustawienia') rysujArkusz();
      }, function () { /* zostaje stan z pamięci */ });
    }
    var kz = el('div', 'kn-karta');
    var zm = btn('kn-btn kn-btn--g', 'Zmień zdjęcie'); zm.addEventListener('click', function () { pokazKadr(); });
    var rz = el('div', 'kn-rzad'); rz.appendChild(zm);
    kz.append(el('span', 'kn-lab', 'Zdjęcie'), rz);
    var B = stan.bezpieczenstwo || { klucze: [], oauth: {}, sesje: [], sposoby: 0, email: null };
    arkPanel.append(kz, kartaSposobow(B), kartaEmail(B), kartaSesji(B), kartaUsun());
    wstawZnaki(arkPanel);
  }
  /* krok 2: wiersz listy (ikona, tytuł, opis, akcja) wspólny dla kluczy, GitHub/Discord i sesji */
  function wierszSp(ikona, tytul, opis, akcja) {
    var li = el('li', 'kn-sp');
    var kw = el('span', 'kn-sp__kw'); if (ikona) kw.appendChild(ikona);
    var t = el('div', 'kn-sp__t'); var b = el('b', null, tytul); t.append(b, el('span', 'kn-lab', opis));
    li.append(kw, t); if (akcja) li.appendChild(akcja);
    return { li: li, b: b };
  }
  function poZmianie(t) { return function (d) { if (d) { stan = d; zmiana(); } powiedz(t); }; }
  function bladAkcji(b) { return function (e) { zajety(b, false); powiedz(e.message, true); }; }
  function kartaSposobow(B) {
    var k = el('div', 'kn-karta'); k.id = 'knSposoby';
    k.appendChild(el('span', 'kn-lab', 'Sposoby logowania'));
    if (B.sposoby === 0) k.appendChild(el('p', 'kn-ostrz', 'To konto testowe miało hasło, którego już nie ma. Bez klucza dostępu po wylogowaniu nie wejdziesz.'));
    else if (B.sposoby === 1) k.appendChild(el('p', 'kn-ostrz', 'Masz jeden sposób logowania. Dodaj drugi, żeby nie stracić konta razem z urządzeniem.'));
    var ostatni = B.sposoby <= 1;
    var ul = el('ul', 'kn-sposoby');
    B.klucze.forEach(function (c) {
      var u = btn('kn-btn kn-btn--g', 'Usuń', 'Usuń klucz ' + (c.nazwa || 'dostępu'));
      if (ostatni) { u.disabled = true; u.title = 'To jedyny sposób logowania'; }
      u.addEventListener('click', function () { zajety(u, true, 'Usuwam…'); api.usunKlucz(c.id).then(poZmianie('Klucz dostępu usunięty.'), bladAkcji(u)); });
      var w = wierszSp(ico('klucz'), c.nazwa || 'Klucz dostępu', 'dodany ' + data(c.od) + (c.ostatnio ? ' · ostatnio ' + data(c.ostatnio, true) : ''), u);
      if (c.atrapa) w.b.appendChild(el('span', 'pf-znacznik', 'ATRAPA'));
      ul.appendChild(w.li);
    });
    ['github', 'discord'].forEach(function (s) {
      var x = B.oauth && B.oauth[s], a;
      if (x) {
        a = btn('kn-btn kn-btn--g', 'Odłącz', 'Odłącz ' + NAZWA_D[s]);
        if (ostatni) { a.disabled = true; a.title = 'To jedyny sposób logowania'; }
        a.addEventListener('click', function () { zajety(a, true, 'Odłączam…'); api.odlaczOAuth(s).then(poZmianie(NAZWA_D[s] + ' odłączony.'), bladAkcji(a)); });
      } else {
        a = btn('kn-btn kn-btn--g', 'Połącz', 'Połącz ' + NAZWA_D[s]);
        a.addEventListener('click', function () { polaczOAuth(s); });
      }
      var kw = el('span'); kw.dataset.dostawca = s;   // znak marki wstawia wstawZnaki()
      var w = wierszSp(null, NAZWA_D[s], x ? 'połączony jako ' + x.login + ' · od ' + data(x.od) : 'niepołączony', a);
      w.li.querySelector('.kn-sp__kw').appendChild(kw);
      ul.appendChild(w.li);
    });
    k.appendChild(ul);
    // nowy klucz: nazwa opcjonalna, żeby odróżnić laptop od telefonu
    var f = el('form', 'kn-dodaj'); f.noValidate = true;
    var nz = pole('knNazwaKlucza', 'Nazwa nowego klucza (nieobowiązkowa)', 'text', 'off'); nz.i.required = false; nz.i.maxLength = 32; nz.i.placeholder = 'np. Laptop';
    var dk = el('button', 'kn-btn kn-btn--p'); dk.type = 'submit'; dk.append(ico('klucz'), D.createTextNode('Dodaj klucz dostępu'));
    var ua = uwagaAtrapy(); ua.hidden = !atrapaTryb();
    f.append(nz.p, dk, ua);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var wn = api.walidacja.nazwaKlucza(nz.i.value);
      if (!wn.ok) { powiedz(wn.blad, true); nz.i.focus(); return; }
      zajety(dk, true, 'Czekam na klucz…');
      api.dodajKlucz({ nazwa: wn.wartosc, atrapa: atrapaTryb() }).then(poZmianie('Klucz dostępu dodany.'), function (er) {
        zajety(dk, false);
        if (er.atrapa) { wymusAtrapa = true; ua.hidden = false; powiedz('Ten podgląd nie dopuszcza prawdziwych kluczy. Kliknij jeszcze raz: dodamy klucz-atrapę.', true); return; }
        powiedz(er.message, true);
      });
    });
    k.appendChild(f);
    return k;
  }
  var kodEmailAtrapa = '';   // atrapa: kod „z maila” pokazany na ekranie, dopóki adres czeka na potwierdzenie
  function kartaEmail(B) {
    var k = el('div', 'kn-karta');
    k.appendChild(el('span', 'kn-lab', 'E-mail (nieobowiązkowy)'));
    var e = B.email;
    if (!e) {
      var f = el('form', 'kn-dodaj'); f.noValidate = true;
      var pe = pole('knEmail', 'Adres e-mail', 'email', 'email'); pe.i.required = false;
      var bl = el('p', 'kn-blad'); bl.setAttribute('role', 'alert'); bl.id = 'knEmailBlad'; pe.i.setAttribute('aria-describedby', bl.id);
      var z = el('button', 'kn-btn kn-btn--g', 'Zapisz adres'); z.type = 'submit';
      f.append(pe.p, bl, z);
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var w = api.walidacja.email(pe.i.value);
        if (!w.ok) { bl.textContent = w.blad; pe.i.setAttribute('aria-invalid', 'true'); pe.i.focus(); return; }
        zajety(z, true, 'Zapisuję…');
        api.emailUstaw(w.wartosc).then(function (r) { kodEmailAtrapa = r.kod_atrapa || ''; stan = r.dane; zmiana(); powiedz('Adres zapisany. Potwierdź go kodem.'); var x = D.getElementById('knEmailKod'); if (x) x.focus(); },
          function (er) { zajety(z, false); bl.textContent = er.message; pe.i.setAttribute('aria-invalid', 'true'); pe.i.focus(); });
      });
      k.appendChild(f);
      return k;
    }
    var us = btn('kn-btn kn-btn--g', 'Usuń adres');
    us.addEventListener('click', function () { zajety(us, true, 'Usuwam…'); kodEmailAtrapa = ''; api.emailUsun().then(poZmianie('Adres usunięty.'), bladAkcji(us)); });
    var w0 = wierszSp(ico('mail'), e.adres, e.potwierdzony ? 'potwierdzony' : 'czeka na kod', us);
    w0.b.appendChild(el('span', e.potwierdzony ? 'kn-pill kn-pill--ok' : 'kn-pill', e.potwierdzony ? 'POTWIERDZONY' : 'NIEPOTWIERDZONY'));
    var ul = el('ul', 'kn-sposoby'); ul.appendChild(w0.li); k.appendChild(ul);
    if (!e.potwierdzony) {
      if (kodEmailAtrapa) {
        var ka = el('p', 'kn-uwaga'); ka.append(el('span', 'pf-znacznik', 'ATRAPA'), D.createTextNode('Kod, który przyszedłby mailem: '), el('b', 'kn-mono', kodEmailAtrapa));
        k.appendChild(ka);
      }
      var fk = el('form', 'kn-dodaj'); fk.noValidate = true;
      var pk = pole('knEmailKod', 'Kod z maila', 'text', 'one-time-code'); pk.i.inputMode = 'numeric'; pk.i.maxLength = 6; pk.i.classList.add('kn-mono');
      var bk = el('p', 'kn-blad'); bk.setAttribute('role', 'alert'); bk.id = 'knEmailKodBlad'; pk.i.setAttribute('aria-describedby', bk.id);
      var ok = el('button', 'kn-btn kn-btn--p', 'Potwierdź'); ok.type = 'submit';
      fk.append(pk.p, bk, ok);
      fk.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (!/^\d{6}$/.test(pk.i.value.trim())) { bk.textContent = 'Kod ma 6 cyfr.'; pk.i.setAttribute('aria-invalid', 'true'); pk.i.focus(); return; }
        zajety(ok, true, 'Sprawdzam…');
        api.emailPotwierdz(pk.i.value.trim()).then(function (d) { kodEmailAtrapa = ''; poZmianie('Adres potwierdzony.')(d); },
          function (er) { zajety(ok, false); bk.textContent = er.message; pk.i.setAttribute('aria-invalid', 'true'); pk.i.focus(); });
      });
      k.appendChild(fk);
    }
    return k;
  }
  function kartaSesji(B) {
    var k = el('div', 'kn-karta');
    k.appendChild(el('span', 'kn-lab', 'Sesje'));
    var ul = el('ul', 'kn-sposoby');
    B.sesje.forEach(function (s) {
      var b = btn('kn-btn kn-btn--g', 'Wyloguj', s.ta ? 'Wyloguj to urządzenie' : 'Wyloguj ' + s.opis);
      b.addEventListener('click', function () {
        if (s.ta) { wyloguj(); return; }
        zajety(b, true, 'Wylogowuję…'); api.wylogujSesje(s.id).then(poZmianie('Sesja zamknięta.'), bladAkcji(b));
      });
      var w = wierszSp(ico('program'), s.opis, 'od ' + data(s.od) + ' · ostatnio ' + data(s.ostatnio, true) + (s.pamietaj ? ' · zapamiętane' : ''), b);
      if (s.ta) w.b.appendChild(el('span', 'kn-pill kn-pill--ok', 'TO URZĄDZENIE'));
      ul.appendChild(w.li);
    });
    k.appendChild(ul);
    var inne = btn('kn-btn kn-btn--g', 'Wyloguj pozostałe');
    inne.disabled = B.sesje.length < 2;
    inne.addEventListener('click', function () { zajety(inne, true, 'Wylogowuję…'); api.wylogujInne().then(poZmianie('Pozostałe sesje zamknięte.'), bladAkcji(inne)); });
    var wszedzie = btn('kn-btn kn-btn--g', 'Wyloguj wszędzie');
    wszedzie.addEventListener('click', function () {
      zajety(wszedzie, true, 'Wylogowuję…');
      api.wylogujWszedzie().then(function () { poWylogowaniu('Wylogowano na wszystkich urządzeniach.'); }, bladAkcji(wszedzie));
    });
    var rw = el('div', 'kn-rzad'); rw.append(inne, wszedzie);
    k.appendChild(rw);
    return k;
  }
  function kartaUsun() {
    var ku = el('div', 'kn-karta');
    var pokazUsun = btn('kn-btn kn-btn--ostrz', 'Usuń konto');
    var fu = el('form'); fu.noValidate = true; fu.hidden = true; fu.style.cssText = 'display:flex;flex-direction:column;gap:10px';
    // krok 2: bez hasła potwierdzeniem jest wpisany nick
    var un = pole('knUsunNick', 'Wpisz swój nick: ' + stan.profil.nick, 'text', 'off');
    var ub = el('p', 'kn-blad'); ub.setAttribute('role', 'alert'); ub.id = 'knUsunBlad'; un.i.setAttribute('aria-describedby', ub.id);
    var uok = el('button', 'kn-btn kn-btn--p', 'Usuń konto na zawsze'); uok.type = 'submit';
    var uan = btn('kn-btn kn-btn--g', 'Anuluj');
    var ur = el('div', 'kn-rzad'); ur.append(uok, uan);
    fu.append(el('p', 'kn-ostrz', 'Usuniemy konto, klucze dostępu, połączenia GitHub/Discord, zdjęcie, koszyk, zamówienia i rozmowy. Tego nie da się cofnąć.'), un.p, ub, ur);
    pokazUsun.addEventListener('click', function () { fu.hidden = false; pokazUsun.hidden = true; un.i.focus(); });
    uan.addEventListener('click', function () { fu.hidden = true; pokazUsun.hidden = false; pokazUsun.focus(); });
    fu.addEventListener('submit', function (e) {
      e.preventDefault();
      if (un.i.value.trim().toLowerCase() !== stan.profil.nick.toLowerCase()) { ub.textContent = 'Wpisz swój nick dokładnie.'; un.i.setAttribute('aria-invalid', 'true'); un.i.focus(); return; }
      zajety(uok, true, 'Usuwam…');
      api.usunKonto(un.i.value.trim()).then(function () { poWylogowaniu('Konto usunięte.'); },
        function (er) { zajety(uok, false); ub.textContent = er.message; un.i.setAttribute('aria-invalid', 'true'); un.i.focus(); });
    });
    ku.append(el('span', 'kn-lab', 'Usunięcie konta'), pokazUsun, fu);
    return ku;
  }

  /* ---------------- kadrowanie zdjęcia ---------------- */
  var ko = okno('kn-kadr', 'Zdjęcie profilu'), kadr = ko.d;
  var scena = el('div', 'kn-scena'); scena.tabIndex = 0;
  scena.setAttribute('role', 'group');
  scena.setAttribute('aria-label', 'Kadr zdjęcia. Strzałki przesuwają, plus i minus przybliżają.');
  var kImg = el('img'); kImg.alt = ''; kImg.hidden = true;
  var kKolo = el('div', 'kn-scena__kolo'); kKolo.setAttribute('aria-hidden', 'true'); kKolo.hidden = true;
  var kPusto = el('div', 'kn-scena__pusto');
  var kWybierz = btn('kn-btn kn-btn--p', 'Wybierz zdjęcie');
  kPusto.append(kWybierz, el('span', null, 'JPG, PNG albo WEBP, do 10 MB'));
  scena.append(kImg, kKolo, kPusto);
  var kPlik = el('input'); kPlik.type = 'file'; kPlik.accept = 'image/jpeg,image/png,image/webp'; kPlik.hidden = true;
  var kBok = el('div', 'kn-kadr__bok');
  var kH = el('h2', 'kn-h', 'Kadruj zdjęcie');
  var kPod = el('p', 'kn-pod', 'Przeciągnij, żeby ustawić. Dane z aparatu (miejsce, data) usuwamy przed zapisem.');
  var kZoomL = el('label', 'kn-lab', 'Przybliżenie'); kZoomL.htmlFor = 'knZoom';
  var kZoom = el('input'); kZoom.type = 'range'; kZoom.id = 'knZoom'; kZoom.min = '100'; kZoom.max = '400'; kZoom.value = '100';
  var kMinus = btn('kn-btn kn-btn--g kn-btn--o', '−', 'Oddal'), kPlus = btn('kn-btn kn-btn--g kn-btn--o', '+', 'Przybliż');
  var kZoomW = el('div', 'kn-zoom'); kZoomW.append(kMinus, kZoom, kPlus);
  var kKoty = el('div', 'kn-koty'); kKoty.appendChild(el('span', 'kn-lab', 'albo kot:'));
  [['kosc', 'Kot na jasnym tle'], ['krew', 'Kot na czerwonym tle'], ['szary', 'Kot na szarym tle']].forEach(function (k) {
    // 15.11: data-kn-kot, nie data-kot — data-kot łapie czat Meshugi (kot-czat.js) i wysyłał wybór kota jako pytanie
    var b = btn('kn-kot', null, k[1]); b.dataset.knKot = k[0]; b.setAttribute('aria-pressed', 'false'); b.appendChild(img(kotUrl(k[0], 64), ''));
    kKoty.appendChild(b);
  });
  var kBlad = el('p', 'kn-blad'); kBlad.setAttribute('role', 'alert');
  var kInne = btn('kn-link', 'Inne zdjęcie'); kInne.hidden = true;
  var kAnuluj = btn('kn-btn kn-btn--g', 'Anuluj'), kZapisz = btn('kn-btn kn-btn--p', 'Zapisz');
  var kAkcje = el('div', 'kn-kadr__akcje'); kAkcje.append(kAnuluj, kZapisz);
  kBok.append(kH, kPod, kZoomL, kZoomW, kKoty, kInne, kBlad, kAkcje);
  ko.w.append(scena, kBok, kPlik);

  var K = { w: 0, h: 0, ox: 0, oy: 0, z: 1, kot: null, zrodlo: null };
  function wymiar() { return scena.clientWidth || 356; }
  function bazowa() { var C = wymiar() * 0.8; return C / Math.min(K.w, K.h); }
  function przytnij() {
    var S = wymiar(), C = S * 0.8, s = bazowa() * K.z;
    var mx = Math.max(0, (K.w * s - C) / 2), my = Math.max(0, (K.h * s - C) / 2);
    K.ox = Math.max(-mx, Math.min(mx, K.ox)); K.oy = Math.max(-my, Math.min(my, K.oy));
  }
  function rysujKadr() {
    var maZdj = !!K.zrodlo;
    kImg.hidden = kKolo.hidden = !maZdj; kPusto.hidden = maZdj; kInne.hidden = !maZdj;
    kZoom.disabled = kMinus.disabled = kPlus.disabled = !maZdj;
    scena.tabIndex = maZdj ? 0 : -1;
    Array.prototype.forEach.call(kKoty.querySelectorAll('[data-kn-kot]'), function (b) { b.setAttribute('aria-pressed', String(!maZdj && K.kot === b.dataset.knKot)); });
    kZapisz.disabled = !maZdj && !K.kot;
    if (!maZdj) return;
    przytnij();
    var S = wymiar(), s = bazowa() * K.z;
    kImg.style.width = K.w + 'px'; kImg.style.height = K.h + 'px';
    kImg.style.transform = 'translate(' + (S / 2 + K.ox - K.w * s / 2) + 'px,' + (S / 2 + K.oy - K.h * s / 2) + 'px) scale(' + s + ')';
    kZoom.value = String(Math.round(K.z * 100));
    kZoom.setAttribute('aria-valuetext', Math.round(K.z * 100) + '%');
  }
  function pokazKadr() {
    K.zrodlo = null; K.kot = stan && !stan.profil.ava256 ? stan.profil.kot : null; K.z = 1; K.ox = K.oy = 0;
    kBlad.textContent = ''; kImg.removeAttribute('src');
    if (!kadr.open) kadr.showModal();
    rysujKadr(); kWybierz.focus();
  }
  kWybierz.addEventListener('click', function () { kPlik.click(); });
  kInne.addEventListener('click', function () { kPlik.click(); });
  kPlik.addEventListener('change', function () {
    var f = kPlik.files[0]; kPlik.value = '';
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { kBlad.textContent = 'To nie jest zdjęcie JPG, PNG ani WEBP.'; return; }
    if (f.size > 10e6) { kBlad.textContent = 'Zdjęcie jest za duże (najwyżej 10 MB).'; return; }
    kBlad.textContent = 'Wczytuję…';
    // FileReader → data-URL, bo CSP strony wpuszcza obrazki tylko z 'self' i data: (blob: odpada)
    var r = new FileReader();
    r.onerror = function () { kBlad.textContent = 'Nie udało się odczytać pliku.'; };
    r.onload = function () {
      var i = new Image();
      i.onload = function () {
        if (Math.min(i.naturalWidth, i.naturalHeight) < 64) { kBlad.textContent = 'Zdjęcie jest za małe (najmniej 64 px).'; return; }
        kBlad.textContent = '';
        K.zrodlo = i; K.w = i.naturalWidth; K.h = i.naturalHeight; K.z = 1; K.ox = K.oy = 0; K.kot = null;
        kImg.src = r.result; rysujKadr(); scena.focus();
      };
      i.onerror = function () { kBlad.textContent = 'Nie udało się odczytać zdjęcia.'; };
      i.src = r.result;
    };
    r.readAsDataURL(f);
  });
  function zoom(nowy, cx, cy) {
    nowy = Math.max(1, Math.min(4, nowy));
    // przybliżanie wokół punktu (cx, cy względem środka sceny), żeby obraz nie uciekał spod palca
    var k = nowy / K.z; cx = cx || 0; cy = cy || 0;
    K.ox = cx + (K.ox - cx) * k; K.oy = cy + (K.oy - cy) * k; K.z = nowy;
    rysujKadr();
  }
  kZoom.addEventListener('input', function () { zoom(Number(kZoom.value) / 100); });
  kMinus.addEventListener('click', function () { zoom(K.z - 0.25); });
  kPlus.addEventListener('click', function () { zoom(K.z + 0.25); });
  kKoty.addEventListener('click', function (e) {
    var b = e.target.closest('[data-kn-kot]'); if (!b) return;
    K.kot = b.dataset.knKot; K.zrodlo = null; kImg.removeAttribute('src'); kBlad.textContent = ''; rysujKadr();
  });
  var wsk = {}, gest = null;
  function srodek(e) { var r = scena.getBoundingClientRect(); return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 }; }
  scena.addEventListener('pointerdown', function (e) {
    if (!K.zrodlo) return;
    scena.setPointerCapture(e.pointerId); wsk[e.pointerId] = { x: e.clientX, y: e.clientY };
    var p = Object.keys(wsk).map(function (k) { return wsk[k]; });
    gest = p.length === 2 ? { d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), z: K.z } : null;
  });
  scena.addEventListener('pointermove', function (e) {
    var w = wsk[e.pointerId]; if (!w) return;
    var dx = e.clientX - w.x, dy = e.clientY - w.y; w.x = e.clientX; w.y = e.clientY;
    var p = Object.keys(wsk).map(function (k) { return wsk[k]; });
    if (p.length === 2 && gest) { zoom(gest.z * Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) / gest.d); return; }
    K.ox += dx; K.oy += dy; rysujKadr();
  });
  function puscWsk(e) { delete wsk[e.pointerId]; gest = null; }
  scena.addEventListener('pointerup', puscWsk); scena.addEventListener('pointercancel', puscWsk);
  scena.addEventListener('wheel', function (e) {
    if (!K.zrodlo) return; e.preventDefault();
    var c = srodek(e); zoom(K.z * (e.deltaY < 0 ? 1.1 : 1 / 1.1), c.x, c.y);
  }, { passive: false });
  scena.addEventListener('keydown', function (e) {
    if (!K.zrodlo) return;
    var krok = e.shiftKey ? 32 : 8;
    if (e.key === 'ArrowLeft') K.ox -= krok; else if (e.key === 'ArrowRight') K.ox += krok;
    else if (e.key === 'ArrowUp') K.oy -= krok; else if (e.key === 'ArrowDown') K.oy += krok;
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoom(K.z + 0.1); return; }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoom(K.z - 0.1); return; }
    else return;
    e.preventDefault(); rysujKadr();
  });
  addEventListener('resize', function () { if (kadr.open) rysujKadr(); });
  function wytnij(rozm) {
    // rysowanie na canvas: przeglądarka sama obraca wg EXIF, a wynik nie niesie żadnych metadanych aparatu
    var S = wymiar(), C = S * 0.8, s = bazowa() * K.z, bok = C / s;
    var sx = K.w / 2 - K.ox / s - bok / 2, sy = K.h / 2 - K.oy / s - bok / 2;
    var c = D.createElement('canvas'); c.width = c.height = rozm;
    var g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
    g.drawImage(K.zrodlo, sx, sy, bok, bok, 0, 0, rozm, rozm);
    var u = c.toDataURL('image/webp', 0.86);
    return u.indexOf('data:image/webp') === 0 ? u : c.toDataURL('image/jpeg', 0.88);
  }
  kAnuluj.addEventListener('click', function () { kadr.close(); });
  kZapisz.addEventListener('click', function () {
    zajety(kZapisz, true, 'Zapisuję…'); kBlad.textContent = '';
    var p = K.zrodlo ? api.awatarZdjecie(wytnij(256), wytnij(64)) : api.awatarKot(K.kot);
    p.then(function (dane) {
      zajety(kZapisz, false); stan.profil = dane.profil; kadr.close(); zmiana(); powiedz('Zdjęcie zapisane.');
    }, function (er) { zajety(kZapisz, false); kBlad.textContent = er.message; });
  });
  kadr.addEventListener('close', function () {
    K.zrodlo = null; kImg.removeAttribute('src');
    var cel = ark.open ? arkGlowa.querySelector('.kn-aparat') : av; if (cel) cel.focus();
  });

  /* ---------------- wylogowanie, start ---------------- */
  function poWylogowaniu(t) {
    stan = null; koszykUstaw([]);
    if (ark.open) ark.close();
    zmiana(); powiedz(t); av.focus();
  }
  function wyloguj() { api.wyloguj().then(function () { poWylogowaniu('Wylogowano.'); }); }
  function wczytaj() {
    if (!api.sesja()) return Promise.resolve();
    av.setAttribute('aria-busy', 'true');
    return api.ja().then(function (d) {
      stan = d;
      koszykUstaw(stan.koszyk.slice());   // koszyk konta jest prawdą po zalogowaniu
      av.removeAttribute('aria-busy'); zmiana();
    }, function (e) {
      av.removeAttribute('aria-busy');
      if (e.kod === 'sesja') { stan = null; zmiana(); }
    });
  }

  /* Meshuga (kot-czat.js) pyta o to: profil do czatu, otwieranie konta, zapis pytań */
  window.Konto = {
    profil: publiczny,
    zaloguj: function () { pokazLogowanie('log'); },
    otworz: function (z) { otworzArkusz(z); },
    // krok 2 (profil.js): „Potwierdź przez GitHub/Discord” = połączenie konta przez OAuth (w artefakcie atrapa ekranu zgody)
    polaczOAuth: function (s) { polaczOAuth(s); },
    // P1 (profil.js): stan konta, zapis nowego stanu z serwera, komunikat
    stan: function () { return stan; },
    ustaw: function (d) { if (d && d.profil) { stan = d; zmiana(); } },
    powiedz: function (t, blad) { powiedz(t, blad); },
    zapiszPytanie: function (q) {
      if (!stan) return;
      api.rozmowa(q).then(function (r) { stan.rozmowy = r.rozmowy; }).catch(function () {});
    }
  };

  /* P3b: powrót z GitHub/Discord (Worker przekierowuje na /?konto=… albo /?konto-blad=<kod>&dostawca=…) */
  var NARZ_D = { github: 'GitHubem', discord: 'Discordem' };
  function tekstPowrotu(kod, d) {
    var N = NAZWA_D[d] || 'GitHub albo Discord', Z = NARZ_D[d] || 'tym kontem';
    return ({
      state: 'Logowanie trwało za długo albo zaczęło się w innej karcie. Zacznij jeszcze raz.',
      brak: 'Nie ma konta połączonego z ' + (NARZ_D[d] ? 'tym ' + Z : 'tym kontem') + '. Załóż konto albo zaloguj się kluczem dostępu.',
      zajete: 'To konto ' + N + ' jest już połączone z innym kontem cybersory.',
      juz: 'Masz już połączone inne konto ' + N + '. Najpierw je odłącz.',
      login: 'Nazwa konta ' + N + ' nie pasuje do zasad cybersory. Załóż konto kluczem dostępu.',
      dostawca: N + ' nie potwierdził logowania. Spróbuj jeszcze raz.',
      sesja: 'Sesja wygasła w trakcie łączenia. Zaloguj się i połącz jeszcze raz.',
      anulowano: 'Anulowano. Nic się nie zmieniło.',
      beta: 'Konta są na razie w zamkniętej becie.',
      nick: 'Ten nick jest już zajęty. Wybierz inny.'
    })[kod] || 'Coś poszło nie tak po stronie serwera. Spróbuj za chwilę.';
  }
  function pokazPowrot(p) {
    if (p.ok && p.wynik === 'polaczono') {
      otworzArkusz('ustawienia');
      var sp = D.getElementById('knSposoby'); if (sp) sp.scrollIntoView({ block: 'start' });
      powiedz((NAZWA_D[p.dostawca] || 'Konto') + ' połączony. Link na profilu ma znaczek „potwierdzone”.');
      return Promise.resolve();
    }
    if (p.ok) return Promise.resolve(stan ? powiedz('Cześć, ' + stan.profil.nick + '.') : null);
    if ((p.kod === 'zajete' || p.kod === 'juz') && stan) otworzArkusz('ustawienia');
    else if (p.kod === 'brak' || p.kod === 'nick') pokazLogowanie('rej');
    else if (p.kod === 'sesja') pokazLogowanie('log');
    powiedz(tekstPowrotu(p.kod, p.dostawca), p.kod !== 'anulowano');
    return Promise.resolve();
  }

  function zamontuj() {
    // 06.11 (maisa, karta standardu zasada 13): konto w prawym dolnym rogu, w doku razem z dymkiem czatu (czat.js);
    // kot Meshugi przeszedł na jego dawne miejsce w pasku
    // 15.11 (maisa, zasada 13 zmieniona): konto wraca do paska, na miejsce Przewodnika (przed „Napisz do nas”).
    // Dok w rogu zostaje tylko jako zapas, gdy strona nie ma paska.
    var side = D.querySelector('.nav__side');
    if (side) side.insertBefore(av, side.querySelector('.nav__cta'));
    else {
      var dok = D.getElementById('knDok');
      if (!dok) { dok = el('div', 'kn-dok'); dok.id = 'knDok'; D.body.appendChild(dok); }
      dok.appendChild(av);
    }
    D.body.append(menu, log, ark, kadr, toast);
    odswiezPasek();
    // ?polacz=KOD: program (np. czytnik) otworzył przeglądarkę z kodem urządzenia. Kod zdejmujemy z adresu od razu.
    var q = null;
    try { q = new URLSearchParams(location.search).get('polacz'); } catch (e) { /* stara przeglądarka */ }
    if (q !== null) {
      var s = String(q).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      czekaKod = s.length === 8 ? s.slice(0, 4) + '-' + s.slice(4) : '';
      try { history.replaceState(history.state, '', location.pathname + location.hash); } catch (e) { /* bez historii */ }
    }
    var powrot = api.powrotOAuth ? api.powrotOAuth() : null;
    // koszyk gościa trzeba złapać przed wczytaj(): po zalogowaniu koszyk konta nadpisuje lokalny
    var gosc = powrot && powrot.ok && powrot.wynik === 'ok' ? koszykLokalny() : null;
    wczytaj().then(function () {
      if (powrot && gosc && stan) return scalKoszyk(gosc).then(function () { if (!scalone) pokazPowrot(powrot); });
      if (powrot) return pokazPowrot(powrot);
    }).then(function () {
      if (!czekaKod) return;
      if (api.sesja()) otworzArkusz('programy');
      else { pokazLogowanie('log'); powiedz('Zaloguj się, żeby połączyć program z kontem.'); }
    });
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', zamontuj); else zamontuj();
})();
