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
    ok: '<path d="M5 12l5 5 9-10"/>'
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
  function powiedz(t) {
    toastT.textContent = t;
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
    menu.style.top = Math.round(r.bottom + 10) + 'px';
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
    if (a === 'wyloguj') wyloguj(); else otworzArkusz(a);
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
    if (tak) { b.dataset.t = b.textContent; b.textContent = tekst; b.disabled = true; b.setAttribute('aria-busy', 'true'); }
    else { b.textContent = b.dataset.t || b.textContent; b.disabled = false; b.removeAttribute('aria-busy'); }
  }
  function pole(id, etyk, typ, auto) {
    var p = el('div', 'kn-pole'), l = el('label', null, etyk), i = el('input', 'kn-in');
    l.htmlFor = id; i.id = id; i.type = typ; i.autocomplete = auto; i.required = true;
    if (typ === 'text') { i.autocapitalize = 'off'; i.spellcheck = false; }
    p.append(l, i); return { p: p, i: i };
  }

  /* ---------------- logowanie / rejestracja / odzyskiwanie ---------------- */
  var lo = okno('kn-log', 'Konto cybersory'), log = lo.d;
  var loH = el('h2', 'kn-h', 'Konto cybersory');
  var loTaby = el('div', 'kn-taby'); loTaby.setAttribute('role', 'tablist'); loTaby.setAttribute('aria-label', 'Logowanie albo nowe konto');
  var tLog = btn('kn-tab', 'Zaloguj'), tRej = btn('kn-tab', 'Załóż konto');
  [tLog, tRej].forEach(function (t) { t.setAttribute('role', 'tab'); loTaby.appendChild(t); });
  var loForm = el('form'); loForm.noValidate = true;
  var fNick = pole('knNick', 'Nick', 'text', 'username');
  fNick.i.maxLength = 20;
  var fHaslo = pole('knHaslo', 'Hasło', 'password', 'current-password');
  var fKod = pole('knKod', 'Kod odzyskiwania', 'text', 'off'); fKod.i.placeholder = 'XXXX-XXXX-XXXX'; fKod.i.classList.add('kn-mono');
  var loBlad = el('p', 'kn-blad'); loBlad.setAttribute('role', 'alert'); loBlad.id = 'knLogBlad';
  var loOk = el('button', 'kn-btn kn-btn--p', 'Zaloguj'); loOk.type = 'submit';
  var loZapomnialem = btn('kn-link', 'Nie pamiętam hasła');
  // 04.11 maisa: przy zakładaniu konta powiedzieć wprost, że maili na razie nie ma
  var loBezMaila = el('p', 'kn-pod', 'Na razie bez maila: konto to sam nick i hasło.'); loBezMaila.id = 'knBezMaila';
  loForm.append(fNick.p, fKod.p, fHaslo.p, loBezMaila, loBlad, loOk, loZapomnialem);
  /* po rejestracji / odzyskaniu: kod */
  var loKod = el('div'); loKod.hidden = true; loKod.style.cssText = 'display:flex;flex-direction:column;gap:14px';
  var kodH = el('p', 'kn-pod', 'Twój kod odzyskiwania. Zapisz go teraz, drugi raz go nie pokażemy.');
  var kodPole = el('div', 'kn-kod');
  var kodKopiuj = btn('kn-btn kn-btn--g', 'Kopiuj kod');
  var kodDalej = btn('kn-btn kn-btn--p', 'Zapisałem kod');
  var kodRzad = el('div', 'kn-rzad kn-rzad--k'); kodRzad.append(kodKopiuj, kodDalej);
  loKod.append(kodH, kodPole, kodRzad);
  lo.w.append(zamykacz(log), loH, loTaby, loForm, loKod);
  var trybLog = 'log';
  function ustawTryb(t) {
    trybLog = t;
    tLog.setAttribute('aria-selected', String(t === 'log')); tRej.setAttribute('aria-selected', String(t === 'rej'));
    tLog.tabIndex = t === 'rej' ? -1 : 0; tRej.tabIndex = t === 'rej' ? 0 : -1;
    loTaby.hidden = t === 'odz';
    loH.textContent = t === 'odz' ? 'Nowe hasło' : 'Konto cybersory';
    fKod.p.hidden = t !== 'odz';
    fHaslo.p.querySelector('label').textContent = t === 'odz' ? 'Nowe hasło' : 'Hasło';
    fHaslo.i.autocomplete = t === 'log' ? 'current-password' : 'new-password';
    fHaslo.i.minLength = t === 'log' ? 0 : 8;
    loOk.textContent = t === 'rej' ? 'Załóż konto' : t === 'odz' ? 'Ustaw nowe hasło' : 'Zaloguj';
    loZapomnialem.textContent = t === 'odz' ? 'Wróć do logowania' : 'Nie pamiętam hasła';
    loZapomnialem.hidden = t === 'rej';
    loBezMaila.hidden = t !== 'rej';
    loBlad.textContent = '';
    [fNick.i, fHaslo.i, fKod.i].forEach(function (i) { i.removeAttribute('aria-invalid'); i.removeAttribute('aria-describedby'); });
  }
  tLog.addEventListener('click', function () { ustawTryb('log'); fNick.i.focus(); });
  tRej.addEventListener('click', function () { ustawTryb('rej'); fNick.i.focus(); });
  loTaby.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault(); (trybLog === 'log' ? tRej : tLog).click(); (trybLog === 'log' ? tLog : tRej).focus();
  });
  loZapomnialem.addEventListener('click', function () { ustawTryb(trybLog === 'odz' ? 'log' : 'odz'); fNick.i.focus(); });
  function pokazLogowanie(t) {
    zamknijMenu(false);
    loForm.hidden = false; loKod.hidden = true; loForm.reset(); ustawTryb(t || 'log');
    if (!log.open) log.showModal();
    fNick.i.focus();
  }
  function bladPola(i, t) {
    loBlad.textContent = t;
    if (i) { i.setAttribute('aria-invalid', 'true'); i.setAttribute('aria-describedby', 'knLogBlad'); i.focus(); }
  }
  loForm.addEventListener('submit', function (e) {
    e.preventDefault();
    [fNick.i, fHaslo.i, fKod.i].forEach(function (i) { i.removeAttribute('aria-invalid'); });
    var nick = fNick.i.value.trim(), haslo = fHaslo.i.value, kod = fKod.i.value.trim();
    if (!nick) return bladPola(fNick.i, 'Wpisz nick.');
    if (trybLog === 'odz' && !kod) return bladPola(fKod.i, 'Wpisz kod odzyskiwania.');
    if (!haslo) return bladPola(fHaslo.i, 'Wpisz hasło.');
    if (trybLog !== 'log' && haslo.length < 8) return bladPola(fHaslo.i, 'Hasło musi mieć co najmniej 8 znaków.');
    loBlad.textContent = '';
    var gosc = koszykLokalny();
    zajety(loOk, true, trybLog === 'rej' ? 'Zakładam konto…' : trybLog === 'odz' ? 'Sprawdzam kod…' : 'Loguję…');
    var p = trybLog === 'rej' ? api.rejestracja(nick, haslo) : trybLog === 'odz' ? api.odzyskaj(nick, kod, haslo) : api.logowanie(nick, haslo);
    p.then(function (r) {
      stan = r.dane;
      return scalKoszyk(gosc).then(function () { return r; });
    }).then(function (r) {
      zajety(loOk, false);
      zmiana();
      if (r.kod) {   // rejestracja albo odzyskanie: pokaż nowy kod
        loForm.hidden = true; loTaby.hidden = true; loKod.hidden = false;
        loH.textContent = trybLog === 'rej' ? 'Konto gotowe' : 'Hasło zmienione';
        kodPole.textContent = r.kod;
        kodDalej.dataset.nowe = trybLog === 'rej' ? '1' : '';
        kodDalej.focus();
      } else {
        log.close();
        if (toastWidac() && /koszyka gościa/.test(toastT.textContent)) return;
        powiedz('Cześć, ' + stan.profil.nick + '.');
      }
    }).catch(function (err) {
      zajety(loOk, false);
      bladPola(err.kod === 'haslo' ? fHaslo.i : err.kod === 'nick' || err.kod === 'dane' ? fNick.i : null, err.message || 'Coś nie zagrało. Spróbuj jeszcze raz.');
    });
  });
  kodKopiuj.addEventListener('click', function () {
    var t = kodPole.textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(
      function () { kodKopiuj.textContent = 'Skopiowane ✓'; },
      function () { var r = D.createRange(); r.selectNodeContents(kodPole); var s = getSelection(); s.removeAllRanges(); s.addRange(r); kodKopiuj.textContent = 'Zaznaczone, skopiuj Ctrl+C'; });
  });
  kodDalej.addEventListener('click', function () {
    var nowe = kodDalej.dataset.nowe === '1';
    kodKopiuj.textContent = 'Kopiuj kod';
    log.close();
    if (nowe) {
      otworzArkusz('przeglad');
      powiedz('Konto gotowe.' + (scalone ? ' Dodaliśmy ' + scalone + ' ' + pozycjeB(scalone) + ' z koszyka gościa.' : '') + ' Zdjęcie dodasz przyciskiem z aparatem.');
    }
  });
  log.addEventListener('close', function () { if (!ark.open && !kadr.open) av.focus(); });

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
  var ZAKLADKI = [['przeglad', 'Przegląd'], ['koszyk', 'Koszyk'], ['zamowienia', 'Zamówienia'], ['gra', 'Gra'], ['meshuga', 'Meshuga'], ['ustawienia', 'Ustawienia']];
  var zakladka = 'przeglad';
  var arkGlowa = el('div', 'kn-glowa');
  var arkTaby = el('div', 'kn-taby'); arkTaby.setAttribute('role', 'tablist'); arkTaby.setAttribute('aria-label', 'Sekcje konta');
  var arkPanel = el('div', 'kn-panel'); arkPanel.setAttribute('role', 'tabpanel'); arkPanel.id = 'knPanel'; arkPanel.tabIndex = -1;
  ZAKLADKI.forEach(function (z) {
    var t = btn('kn-tab', z[1]); t.setAttribute('role', 'tab'); t.dataset.z = z[0]; t.id = 'knTab-' + z[0]; t.setAttribute('aria-controls', 'knPanel');
    arkTaby.appendChild(t);
  });
  var kat = el('span', 'kn-kat'); kat.setAttribute('aria-hidden', 'true');
  ao.w.append(kat, zamykacz(ark, 'Zamknij konto'), arkGlowa, arkTaby, arkPanel);
  arkTaby.addEventListener('click', function (e) { var t = e.target.closest('[data-z]'); if (t) { zakladka = t.dataset.z; rysujArkusz(); } });
  arkTaby.addEventListener('keydown', function (e) {
    var t = Array.prototype.slice.call(arkTaby.children), i = t.indexOf(D.activeElement);
    var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? t.length - 1 : null;
    if (n === null || i < 0) return;
    e.preventDefault(); n = (n + t.length) % t.length;
    zakladka = t[n].dataset.z; rysujArkusz(); t[n].focus();
  });
  function idzDo(z) { zakladka = z; rysujArkusz(); var t = D.getElementById('knTab-' + z); if (t) t.focus(); }

  function otworzArkusz(z) {
    if (!api.sesja()) { pokazLogowanie('log'); return; }
    zakladka = z || 'przeglad';
    rysujArkusz();
    if (!ark.open) ark.showModal();
    var t = D.getElementById('knTab-' + zakladka); if (t) t.focus();
    if (!stan) wczytaj();
  }
  ark.addEventListener('close', function () { if (!kadr.open) av.focus(); });

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
    ({ przeglad: pPrzeglad, koszyk: pKoszyk, zamowienia: pZamowienia, gra: pGra, meshuga: pMeshuga, ustawienia: pUstawienia })[zakladka]();
  }
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
    s.append(k1, k2, k3, k4);
    arkPanel.appendChild(s);
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
    var kz = el('div', 'kn-karta');
    var zm = btn('kn-btn kn-btn--g', 'Zmień zdjęcie'); zm.addEventListener('click', function () { pokazKadr(); });
    var rz = el('div', 'kn-rzad'); rz.appendChild(zm);
    kz.append(el('span', 'kn-lab', 'Zdjęcie'), rz);
    var kw = el('div', 'kn-karta');
    var wy = btn('kn-btn kn-btn--g', 'Wyloguj'); wy.addEventListener('click', function () { wyloguj(); });
    var wszedzie = btn('kn-btn kn-btn--g', 'Wyloguj na wszystkich urządzeniach');
    wszedzie.addEventListener('click', function () {
      zajety(wszedzie, true, 'Wylogowuję…');
      api.wylogujWszedzie().then(function () { poWylogowaniu('Wylogowano na wszystkich urządzeniach.'); }, function (e) { zajety(wszedzie, false); powiedz(e.message); });
    });
    var rw = el('div', 'kn-rzad'); rw.append(wy, wszedzie);
    kw.append(el('span', 'kn-lab', 'Sesje'), rw, el('p', 'kn-ostrz', 'Wylogowanie na wszystkich urządzeniach zamyka też tę kartę. Zalogujesz się nickiem i hasłem.'));
    var ku = el('div', 'kn-karta');
    var pokazUsun = btn('kn-btn kn-btn--ostrz', 'Usuń konto');
    var fu = el('form'); fu.noValidate = true; fu.hidden = true; fu.style.cssText = 'display:flex;flex-direction:column;gap:10px';
    var uh = pole('knUsunHaslo', 'Hasło', 'password', 'current-password');
    var ub = el('p', 'kn-blad'); ub.setAttribute('role', 'alert');
    var uok = el('button', 'kn-btn kn-btn--p', 'Usuń konto na zawsze'); uok.type = 'submit';
    var uan = btn('kn-btn kn-btn--g', 'Anuluj');
    var ur = el('div', 'kn-rzad'); ur.append(uok, uan);
    fu.append(el('p', 'kn-ostrz', 'Usuniemy konto, zdjęcie, koszyk, zamówienia i rozmowy. Tego nie da się cofnąć.'), uh.p, ub, ur);
    pokazUsun.addEventListener('click', function () { fu.hidden = false; pokazUsun.hidden = true; uh.i.focus(); });
    uan.addEventListener('click', function () { fu.hidden = true; pokazUsun.hidden = false; pokazUsun.focus(); });
    fu.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!uh.i.value) { ub.textContent = 'Wpisz hasło.'; uh.i.focus(); return; }
      zajety(uok, true, 'Usuwam…');
      api.usunKonto(uh.i.value).then(function () { poWylogowaniu('Konto usunięte.'); },
        function (er) { zajety(uok, false); ub.textContent = er.message; uh.i.setAttribute('aria-invalid', 'true'); uh.i.focus(); });
    });
    ku.append(el('span', 'kn-lab', 'Usunięcie konta'), pokazUsun, fu);
    arkPanel.append(kz, kw, ku);
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
    var b = btn('kn-kot', null, k[1]); b.dataset.kot = k[0]; b.setAttribute('aria-pressed', 'false'); b.appendChild(img(kotUrl(k[0], 64), ''));
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
    Array.prototype.forEach.call(kKoty.querySelectorAll('[data-kot]'), function (b) { b.setAttribute('aria-pressed', String(!maZdj && K.kot === b.dataset.kot)); });
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
    var b = e.target.closest('[data-kot]'); if (!b) return;
    K.kot = b.dataset.kot; K.zrodlo = null; kImg.removeAttribute('src'); kBlad.textContent = ''; rysujKadr();
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
    zapiszPytanie: function (q) {
      if (!stan) return;
      api.rozmowa(q).then(function (r) { stan.rozmowy = r.rozmowy; }).catch(function () {});
    }
  };

  function zamontuj() {
    var strona = D.querySelector('.nav__side');
    var koszyk = D.getElementById('navCart');
    if (strona) strona.insertBefore(av, koszyk || strona.firstChild);
    else { av.style.cssText = 'position:fixed;right:16px;top:16px;z-index:1100'; D.body.appendChild(av); }
    D.body.append(menu, log, ark, kadr, toast);
    odswiezPasek();
    wczytaj();
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', zamontuj); else zamontuj();
})();
