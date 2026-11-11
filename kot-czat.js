/* MESHUGA — kot-asystent cybersory w prawym dolnym rogu (03.11.2026, artefakt).
   Małe okienko = szybki dostęp, nie pełny czat: powitanie, 4 szybkie pytania
   z gotowymi odpowiedziami (ceny i terminy czyta z #cennik), pole „Zapytaj Meshugę…”
   i duży przycisk „Czatuj”, który otwiera pełną aplikację Meshugi z pytaniem w ?q=.
   Adres aplikacji: window.MESHUGA_APP (pusty = przycisk „wkrótce”).
   Później: window.KOT_API = 'https://…/czat' → szybkie odpowiedzi z pośrednika
   (Claude Haiku). Bez śledzenia; localStorage tylko na flagi „podpowiedź widziana”. */
(function () {
  'use strict';
  if (window.__kotCzat) return; window.__kotCzat = 1;

  // Na żywo aplikacja Meshugi stoi pod cybersora.pl/meshuga/ (kopia artefaktu strony ma tu link do artefaktu).
  // Nie przez <script> w index.html: CSP strony (Cloudflare) nie wpuszcza skryptów wpisanych w HTML.
  var APP = window.MESHUGA_APP != null ? String(window.MESHUGA_APP) : '/meshuga/';
  if (APP && !/^(\/(?!\/)|https:\/\/)/.test(APP)) APP = '';   // 04.11 (audyt B): tylko ścieżka na stronie albo https:, nigdy javascript:/data:

  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  /* ---------- profil testowy: nick + własny awatar (tylko ta przeglądarka) ---------- */
  var PROFIL_KEY = 'meshuga-profil';
  /* 04.11 (audyt B): localStorage może być ręcznie zmieniony albo uszkodzony. Nick 2–24 znaki,
     awatar tylko jako data:image/* base64 (idzie do url("…") w style) albo kot z assety/kot-awatar/. */
  function dobryNick(n) { return typeof n === 'string' && n.length >= 2 && n.length <= 24 && /^[\p{L}\p{N}_.\- ]+$/u.test(n); }
  function dobryAva(d) {
    return typeof d === 'string' && ((d.length < 270000 && /^data:image\/(webp|jpeg|png|gif);base64,[A-Za-z0-9+\/]+=*$/.test(d)) ||
      /^assety\/kot-awatar\/kot-[a-z]+-\d+\.webp$/.test(d));
  }
  function wczytajProfil() {
    if (window.Konto) { var k = window.Konto.profil(); return k && dobryNick(k.nick) ? { nick: k.nick, ava: dobryAva(k.ava) ? k.ava : '' } : null; }   // 04.11: konto strony zamiast profilu testowego
    try {
      var p = JSON.parse(LS.get(PROFIL_KEY) || 'null');
      if (p && typeof p === 'object' && dobryNick(p.nick))
        return { nick: p.nick, ava: dobryAva(p.ava) ? p.ava : '', od: typeof p.od === 'string' ? p.od.slice(0, 10) : '' };
    } catch (e) {}
    return null;
  }
  function zapiszProfil(p) {
    try { if (p) localStorage.setItem(PROFIL_KEY, JSON.stringify(p)); else localStorage.removeItem(PROFIL_KEY); return true; } catch (e) { return false; }
  }
  var profil = wczytajProfil();
  var widok = function () { var w = (location.hash.slice(1) || 'start').split(/[?&]/)[0]; return w === 'meshuga' ? 'somi' : w; };   // 03.11: adres #meshuga = widok somi
  var telefon = function () { return matchMedia('(max-width:480px)').matches; };

  /* ---------- podpowiedzi (raz na widok, dla nowego gościa) ---------- */
  var PODPOWIEDZI = {
    start:  { t: 'Pierwszy raz u nas? Jestem Meshuga. W minutę pokażę, co robimy i ile to kosztuje.', a: 'Pokaż mi' },
    oferta: { t: 'Szukasz ceny? Cennik z ceną z góry jest na drugiej karcie Oferty. Mogę też podać ją od razu.', a: 'Podaj ceny' },
    somi:   { t: 'Tu poznasz mnie z bliska: kulę, pamięć i radar zleceń. O resztę strony też możesz mnie zapytać.', a: 'Zapytaj mnie' }
  };

  /* ---------- dane ze strony ---------- */
  function cennik() {
    var out = [];
    document.querySelectorAll('#cennik li[data-cena][data-topic]').forEach(function (li) {
      var t = li.getAttribute('data-topic').replace(/\s*\([^)]*\)\s*$/, '');
      if (!out.some(function (o) { return o.t === t; }))
        out.push({ t: t, c: li.getAttribute('data-cena'), d: li.getAttribute('data-czas') || '' });
    });
    return out;
  }

  /* ---------- gotowe odpowiedzi ---------- */
  var BAZA = [
    { k: /cen|koszt|ile|płac|plac|zł|zl|tani|droż|budżet|budzet/i, f: function () {
        var c = cennik().slice(0, 5);
        if (!c.length) return { t: 'Ceny podajemy z góry w Ofercie, na karcie z cennikiem.', go: ['oferta', 'Otwórz Ofertę'] };
        return { t: 'Kilka cen z naszego cennika:\n' + c.map(function (o) { return '• ' + o.t + ': ' + o.c + (o.d ? ' (' + o.d + ')' : ''); }).join('\n') + '\nPełna lista jest w Ofercie.', go: ['oferta', 'Cały cennik'] };
      } },
    { k: /termin|jak dług|ile czas|kiedy|szybko/i, f: function () {
        var c = cennik().filter(function (o) { return o.d; }).slice(0, 4);
        return { t: c.length ? 'Przykładowe terminy:\n' + c.map(function (o) { return '• ' + o.t + ': ' + o.d; }).join('\n') : 'Termin podajemy po krótkiej rozmowie o tym, co ma robić program.', go: ['contact', 'Opisz swój projekt'] };
      } },
    { k: /audyt|skan|widoczn|google|wizytówk|wizytowk|seo/i, f: function () {
        return { t: 'Robimy darmowy skan widoczności: sprawdzamy, jak firmę widzi Google i asystenci AI, i mówimy, co poprawić.', go: ['oferta', 'Zobacz w Ofercie'] }; } },
    { k: /salondesk|salon|grafik|fryzjer|kosmetycz/i, f: function () {
        return { t: 'SalonDesk prowadzi salon: grafik, klienci i kasa w jednym programie. Działa u klienta.', go: ['products', 'Zobacz projekty'] }; } },
    { k: /somi|asystent/i, f: function () {
        return { t: 'To ja, Meshuga, asystent AI cybersory. Sam szukam zleceń i pomagam w pracy.', go: ['somi', 'Poznaj mnie bliżej'] }; } },
    { k: /pycodemath|matemat|python/i, f: function () {
        return { t: 'Pycodemath sprawdza matematykę w kodzie. Jest darmowy i publiczny.', go: ['products', 'Zobacz projekty'] }; } },
    { k: /sora.?os|pulpit/i, f: function () {
        return { t: 'SORA//OS to nasz pulpit jak z gry: projekty, terminy, terminal i DancyCloud.', go: ['soraos', 'Otwórz SORA//OS'] }; } },
    { k: /meshug/i, f: function () {
        return { t: 'Meshuga to ja, AI Chatbot cybersory. Tu odpowiadam krótko. Dłuższa rozmowa będzie w pełnej aplikacji pod przyciskiem „Czatuj”.' }; } },
    { k: /kim|kto|o was|o tobie|zespół|zespol|patryk|firma/i, f: function () {
        return { t: 'Za cybersorą stoi Patryk Gwóźdź, a ja, Meshuga, pomagam mu w pracy. Więcej w zakładce O mnie.', go: ['onas', 'O mnie'] }; } },
    { k: /stron|www|aplikacj|bot|program|zamówien|zamowien|zrobi|robicie/i, f: function () {
        return { t: 'Piszemy programy, aplikacje, boty i strony na zamówienie, od pierwszej rozmowy do wdrożenia. Napisz, co ma robić, a odpiszemy z wyceną.', go: ['contact', 'Opisz, co ma robić'] }; } },
    { k: /kontakt|mail|napisa|napisz|rozmow/i, f: function () {
        return { t: 'Najprościej przez formularz w Kontakcie. Na żywo widzisz, co do nas trafi.', go: ['contact', 'Przejdź do Kontaktu'] }; } },
    { k: /cześć|czesc|hej|siema|dzień dobry|dzien dobry|witam/i, f: function () {
        return { t: 'Cześć! O co chcesz zapytać? Ceny, terminy, nasze programy, a może darmowy skan widoczności?' }; } }
  ];
  function odpowiedz(q) {
    for (var i = 0; i < BAZA.length; i++) if (BAZA[i].k.test(q)) return BAZA[i].f();
    return APP
      ? { t: 'Na to odpowiem pełniej w aplikacji. Kliknij „Czatuj”, pytanie przeniosę ze sobą.' }
      : { t: 'Tego jeszcze nie umiem. Pełna aplikacja Meshugi powstaje. Do tego czasu napisz do nas, odpiszemy po ludzku.', go: ['contact', 'Napisz do nas'] };
  }

  /* ---------- budowa ---------- */
  var el = function (tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
  var root = el('div', 'kot');
  root.id = 'kot';
  var tip = el('div', 'kot__tip'); tip.setAttribute('role', 'status');
  var tipT = el('p', null); tipT.style.margin = '0';
  var tipRow = el('div', 'kot__tipRow');
  var tipA = el('button', 'kot__b kot__b--main'); tipA.type = 'button';
  var tipX = el('button', 'kot__b', 'Nie teraz'); tipX.type = 'button';
  tipRow.append(tipA, tipX); tip.append(tipT, tipRow);

  var tlo = el('div', 'kot__tlo'); // przyciemnienie pod arkuszem (tylko telefon)

  var panel = el('div', 'kot__panel');
  panel.id = 'kotPanel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Meshuga, AI Chatbot cybersory'); panel.inert = true;
  var uchwyt = el('button', 'kot__uchwyt'); uchwyt.type = 'button'; uchwyt.setAttribute('aria-label', 'Zamknij okienko Meshugi');
  var head = el('div', 'kot__head');
  var name = el('div', 'kot__name', 'Meshuga'); name.appendChild(el('small', null, 'AI Chatbot cybersory'));
  var x = el('button', 'kot__x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Zamknij okienko Meshugi');
  var prof = el('button', 'kot__prof'); prof.type = 'button';
  head.append(el('span', 'kot__ava'), name, prof, x);

  /* widok profilu (zamiast rozmowy) */
  var pv = el('div', 'kot__profil');
  var pvH = el('p', 'kot__etykieta', 'profil testowy');
  var pvRow = el('div', 'kot__pRow');
  var pAva = el('span', 'kot__pAva'); pAva.setAttribute('aria-hidden', 'true');
  var pPlik = el('input'); pPlik.type = 'file'; pPlik.accept = 'image/jpeg,image/png,image/webp,image/gif,image/avif'; pPlik.hidden = true;
  var pWybierz = el('button', 'kot__b', 'Wybierz obrazek'); pWybierz.type = 'button';
  var pUsun = el('button', 'kot__b', 'Usuń'); pUsun.type = 'button'; pUsun.setAttribute('aria-label', 'Usuń awatar');
  var pBtns = el('div', 'kot__pBtns'); pBtns.append(pWybierz, pUsun);
  pvRow.append(pAva, pBtns, pPlik);
  var pLab = el('label', 'kot__pLab', 'Nick'); pLab.htmlFor = 'kotNick';
  var pNick = el('input', 'kot__in'); pNick.id = 'kotNick'; pNick.type = 'text'; pNick.maxLength = 24; pNick.autocomplete = 'nickname';
  pNick.placeholder = 'np. nocny_kod'; pNick.setAttribute('aria-describedby', 'kotNickInfo');
  var pInfo = el('p', 'kot__pInfo', 'Od 2 do 24 znaków: litery, cyfry, _ . -. Nick, nie imię i nazwisko.'); pInfo.id = 'kotNickInfo';
  var pBlad = el('p', 'kot__blad'); pBlad.setAttribute('role', 'alert');
  var pZapisz = el('button', 'kot__b kot__b--main', 'Zapisz'); pZapisz.type = 'button';
  var pWyloguj = el('button', 'kot__b', 'Wyloguj'); pWyloguj.type = 'button';
  var pWroc = el('button', 'kot__b', 'Wróć'); pWroc.type = 'button';
  var pAkcje = el('div', 'kot__pAkcje'); pAkcje.append(pZapisz, pWroc, pWyloguj);
  var pNote = el('p', 'kot__note', 'Konto testowe: nick i awatar zostają tylko w tej przeglądarce, nigdzie ich nie wysyłamy.');
  pv.append(pvH, pvRow, pLab, pNick, pInfo, pBlad, pAkcje, pNote);
  var log = el('div', 'kot__log'); log.setAttribute('aria-live', 'polite');
  var chipsH = el('p', 'kot__etykieta', 'szybkie pytania');
  var chips = el('div', 'kot__chips');
  [['Ile to kosztuje?'], ['Darmowy skan', '', 'Darmowy skan widoczności'], ['Co robicie?'], ['Co jest gdzie?', 'mapa']].forEach(function (c) {
    var b = el('button', 'kot__b', c[0]); b.type = 'button'; b.dataset.q = c[2] || c[0]; if (c[1]) b.dataset.akcja = c[1]; chips.appendChild(b);
  });
  var form = el('form', 'kot__form');
  var inp = el('input', 'kot__in'); inp.type = 'text'; inp.placeholder = 'Zapytaj Meshugę…'; inp.setAttribute('aria-label', 'Pytanie do Meshugi'); inp.maxLength = 300;
  inp.setAttribute('enterkeyhint', 'send');
  var send = el('button', 'kot__send', '→'); send.type = 'submit'; send.setAttribute('aria-label', 'Szybka odpowiedź');
  form.append(inp, send);
  var czatuj = el('a', 'kot__czatuj');
  var czatujT = el('span', 'kot__czatujT', 'Czatuj');
  var czatujS = el('span', 'kot__czatujS', APP ? 'pełna aplikacja Meshugi ↗' : 'pełna aplikacja · wkrótce');
  czatuj.append(czatujT, czatujS);
  if (APP) { czatuj.target = '_blank'; czatuj.rel = 'noopener noreferrer'; }
  else { czatuj.setAttribute('role', 'button'); czatuj.setAttribute('aria-disabled', 'true'); czatuj.tabIndex = 0; root.classList.add('kot--bezApp'); }
  var note = el('p', 'kot__note', 'Odpowiadam z treści strony. Nie zapisuję rozmowy.');
  panel.append(uchwyt, head, pv, log, chipsH, chips, form, czatuj, note);

  var btn = el('button', 'kot__btn'); btn.type = 'button';
  btn.setAttribute('aria-label', 'Meshuga: szybkie pytania i czat'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'kotPanel');
  // 04.11 (wariant A, wybór maisy): żywy kot z meshuga-kot.js w kółku z aplikacji.
  // Bez modułu zostaje zdjęcie kot-128.webp i kółko CSS.
  var kot = null;
  if (window.MeshugaKot) {
    var mk = el('span', 'kot__mk'); mk.setAttribute('aria-hidden', 'true');
    btn.classList.add('kot__btn--zywy'); btn.append(mk, el('span', 'kot__dot'));
    kot = window.MeshugaKot.mount(mk, { ring: true });
  } else btn.append(el('span', 'kot__ring'), el('span', 'kot__skan'), el('span', 'kot__dot'));
  root.append(tip, tlo, panel, btn);
  document.body.appendChild(root);

  /* ---------- przycisk „Czatuj” ---------- */
  var ostatnie = '';
  function adresApp() {
    var q = inp.value.trim() || ostatnie, par = [];
    if (q) par.push('q=' + encodeURIComponent(q));
    if (profil) par.push('nick=' + encodeURIComponent(profil.nick)); // awatar nie mieści się w adresie
    return APP + (par.length ? (APP.indexOf('?') < 0 ? '?' : '&') + par.join('&') : '');
  }
  function odswiezCzatuj() { if (APP) czatuj.href = adresApp(); }
  inp.addEventListener('input', odswiezCzatuj);
  odswiezCzatuj();
  var wkrotcePowiedziane = false;
  function czatujKlik(e) {
    if (APP) { czatuj.href = adresApp(); return; }
    e.preventDefault();
    if (!wkrotcePowiedziane) { wkrotcePowiedziane = true; msg('kot', 'Pełna aplikacja Meshugi jeszcze powstaje. Do tego czasu odpowiem tu na szybkie pytania.'); }
  }
  czatuj.addEventListener('click', czatujKlik);
  czatuj.addEventListener('keydown', function (e) { if (!APP && (e.key === 'Enter' || e.key === ' ')) czatujKlik(e); });

  /* ---------- odpowiedzi ---------- */
  function msg(kto, t, go) {
    var m = el('div', 'kot__m kot__m--' + kto); m.textContent = t;
    if (kto === 'ty' && profil) m.insertBefore(el('span', 'kot__kto', profil.nick), m.firstChild);
    if (go) { var a = el('a', 'kot__go', go[1] + ' →'); a.href = '#' + go[0]; a.dataset.nav = go[0]; a.addEventListener('click', function () { zamknij(false); }); m.appendChild(document.createElement('br')); m.appendChild(a); }
    log.appendChild(m); log.scrollTop = log.scrollHeight;
  }
  var przywitany = false;
  /* etap myślenia z tematu pytania (ta sama logika co etapyMysli() w aplikacji Meshugi) */
  function etapKota(q) {
    q = q.toLowerCase();
    if (/```|\bkod|python|javascript|typescript|\bjs\b|błąd|blad|error|funkcj|pętl|petl|programow/.test(q)) return 'czytam Twój kod';
    if (/pomys|opisz|opiszę/.test(q)) return 'rozkładam pomysł na kroki';
    if (/cen|koszt|ile|zł|wycen/.test(q)) return 'przeglądam cennik';
    if (/projekt|zrobili|portfolio/.test(q)) return 'szukam w projektach';
    return 'układam odpowiedź';
  }
  /* 04.11 (audyt B): odpowiedź z KOT_API to obce dane: tylko tekst (textContent), przycięty,
     link tylko do znanego widoku strony (#widok), inaczej bez linku. */
  var WIDOKI = ['start', 'oferta', 'cennik', 'products', 'rnd', 'zrobilismy', 'meshuga', 'somi', 'soraos', 'onas', 'sztuka', 'contact', 'polityka'];
  function zApi(j) {
    if (!j || typeof j.odpowiedz !== 'string' || !j.odpowiedz.trim()) return null;
    var o = { t: j.odpowiedz.slice(0, 1200) }, l = j.link;
    if (Array.isArray(l) && typeof l[0] === 'string' && typeof l[1] === 'string' && WIDOKI.indexOf(l[0]) >= 0 && l[1].trim())
      o.go = [l[0], l[1].slice(0, 40)];
    return o;
  }
  function zapytaj(q) {
    q = (q || '').trim(); if (!q) return;
    ostatnie = q; odswiezCzatuj();
    msg('ty', q);
    if (window.Konto) window.Konto.zapiszPytanie(q);
    /* 04.11: „Meshuga myśli” — wstęga wokół kota (meshuga-kot.js) i etap z tematu pytania. Trzecia pętla
       obok mapy i kuli, ale tylko na czas myślenia (1–3 s po pytaniu); po odpowiedzi rAF stoi. */
    var p = el('div', 'kot__pisze', '› ' + etapKota(q)); log.appendChild(p); log.scrollTop = log.scrollHeight;
    var t0 = Date.now(), wstega = !!(kot && kot.mysli);
    if (wstega) kot.mysli(true); else if (kot) kot.squint(true);
    var gotowe = function (o) {
      setTimeout(function () {   /* min. 1,2 s: wstęga zdąży wejść i wyjść */
        p.remove();
        if (wstega) kot.mysli(false); else if (kot) { kot.squint(false); kot.flash(); }
        msg('kot', o.t, o.go);
      }, Math.max(0, 1200 - (Date.now() - t0)));
    };
    if (window.KOT_API) {
      fetch(window.KOT_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: q, widok: widok() }) })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (j) { gotowe(zApi(j) || odpowiedz(q)); })
        .catch(function () { gotowe(odpowiedz(q)); });
    } else setTimeout(function () { gotowe(odpowiedz(q)); }, 450);
  }
  form.addEventListener('submit', function (e) { e.preventDefault(); var q = inp.value; inp.value = ''; zapytaj(q); });
  chips.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.akcja === 'mapa') { zamknij(false); var g = document.getElementById('navGuide'); if (g) g.click(); return; }
    zapytaj(b.dataset.q);
  });

  /* ---------- klawiatura na telefonie: arkusz nad klawiaturą ---------- */
  var vv = window.visualViewport;
  function dopasuj() {
    if (!vv || !otwarty) return;
    var kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    root.style.setProperty('--kb', kb + 'px');
    root.style.setProperty('--vvh', Math.round(vv.height) + 'px');
  }
  if (vv) { vv.addEventListener('resize', dopasuj); vv.addEventListener('scroll', dopasuj); }

  /* ---------- otwieranie / zamykanie ---------- */
  var otwarty = false, odKogo = null;
  function otworz(pytanie) {
    schowajTip(true);
    var gp = document.getElementById('navPanel');
    if (gp && gp.classList.contains('open')) { var gb = document.getElementById('navGuide'); if (gb) gb.click(); }
    if (!otwarty) {
      otwarty = true; odKogo = document.activeElement;
      root.classList.add('kot--open'); panel.inert = false; btn.setAttribute('aria-expanded', 'true');
      dopasuj();
      if (!przywitany) {
        przywitany = true;
        msg('kot', profil
          ? 'Cześć, ' + profil.nick + '! Tu Meshuga. Wybierz szybkie pytanie albo napisz własne.'
          : 'Cześć, jestem Meshuga, AI Chatbot cybersory. Wybierz szybkie pytanie albo napisz własne.');
        if (!profil) {
          var z = el('button', 'kot__go kot__go--profil', window.Konto ? 'Zaloguj się: nick i zdjęcie' : 'Załóż profil: nick i awatar'); z.type = 'button';
          z.addEventListener('click', function () { if (window.Konto) { zamknij(false); window.Konto.zaloguj(); } else pokazProfil(true); });
          log.lastChild.appendChild(document.createElement('br')); log.lastChild.appendChild(z);
        }
      }
    }
    if (pytanie) zapytaj(pytanie);
    setTimeout(function () { if (!matchMedia('(hover:none)').matches) inp.focus(); else x.focus(); }, 60);
  }
  function zamknij(fokus) {
    if (!otwarty) return;
    otwarty = false; root.classList.remove('kot--open', 'kot--profil'); panel.inert = true; btn.setAttribute('aria-expanded', 'false');
    panel.style.transform = '';
    root.style.removeProperty('--kb');
    if (fokus !== false) (odKogo && odKogo.focus && odKogo !== document.body ? odKogo : btn).focus();
  }
  btn.addEventListener('click', function () { otwarty ? zamknij() : otworz(); });
  x.addEventListener('click', function () { zamknij(); });
  tlo.addEventListener('click', function () { zamknij(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (otwarty) { zamknij(); e.stopPropagation(); } else if (root.classList.contains('kot--tip')) schowajTip(true);
  }, true);
  window.kotCzat = { otworz: otworz, zamknij: zamknij };
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-kot]'); if (!t) return; e.preventDefault(); otworz(t.getAttribute('data-kot') || '');
  });

  /* ---------- profil: widok, awatar, zapis ---------- */
  var nowyAva = null; // dataURL wybranego obrazka przed zapisem ('' = usunięty)
  function ustawAva(n, d, nick) {
    if (d && !dobryAva(d)) d = '';
    n.style.backgroundImage = d ? 'url("' + d + '")' : '';
    n.textContent = d ? '' : (nick ? nick.charAt(0).toUpperCase() : '');
    n.classList.toggle('bezObrazka', !d);
  }
  function odswiezProfil() {
    ustawAva(prof, profil && profil.ava, profil && profil.nick);
    if (!profil) prof.textContent = '+';
    prof.setAttribute('aria-label', profil ? 'Twój profil: ' + profil.nick : window.Konto ? 'Zaloguj się' : 'Załóż profil testowy');
    prof.title = profil ? profil.nick : window.Konto ? 'Konto' : 'Profil testowy';
    pWyloguj.hidden = !profil;
    if (window.Konto) note.textContent = profil ? 'Odpowiadam z treści strony. Twoje pytania zapisuję na Twoim koncie.' : 'Odpowiadam z treści strony. Nie zapisuję rozmowy.';
    odswiezCzatuj();
  }
  window.addEventListener('konto:zmiana', function () {
    profil = wczytajProfil(); odswiezProfil();
    if (profil) { var z = log.querySelector('.kot__go--profil'); if (z) z.remove(); }
  });
  function pokazProfil(tak) {
    root.classList.toggle('kot--profil', tak);
    if (tak) {
      nowyAva = profil ? (profil.ava || '') : '';
      pNick.value = profil ? profil.nick : '';
      pBlad.textContent = '';
      ustawAva(pAva, nowyAva, pNick.value);
      pUsun.hidden = !nowyAva;
      setTimeout(function () { pNick.focus(); }, 30);
    } else setTimeout(function () { (matchMedia('(hover:none)').matches ? prof : inp).focus(); }, 30);
  }
  function obrazek(plik, cb) {
    if (!plik || !/^image\/(jpeg|png|webp|gif|avif)$/.test(plik.type)) return cb('To nie jest obrazek. Wybierz JPG, PNG, WEBP albo GIF.');
    if (plik.size > 8e6) return cb('Obrazek jest za duży (najwyżej 8 MB).');
    // 04.11 (audyt B): FileReader → data:, nie createObjectURL → blob:, bo CSP strony (img-src 'self' data:)
    // blokuje blob: i na żywo żaden awatar by się nie wczytał
    var fr = new FileReader(), img = new Image(), zle = function () { cb('Nie udało się odczytać obrazka.'); };
    img.onload = function () {
      var c = document.createElement('canvas'); c.width = c.height = 128;
      var s = Math.min(img.naturalWidth, img.naturalHeight);
      if (!s) return zle();
      c.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, 128, 128);
      var d = c.toDataURL('image/webp', 0.85);
      if (d.indexOf('data:image/webp') !== 0) d = c.toDataURL('image/jpeg', 0.85);
      if (!dobryAva(d)) return zle();
      cb(null, d);
    };
    img.onerror = zle; fr.onerror = zle;
    fr.onload = function () { if (typeof fr.result === 'string' && fr.result.indexOf('data:image/') === 0) img.src = fr.result; else zle(); };
    fr.readAsDataURL(plik);
  }
  prof.addEventListener('click', function () {
    if (window.Konto) { zamknij(false); profil ? window.Konto.otworz('meshuga') : window.Konto.zaloguj(); return; }
    pokazProfil(!root.classList.contains('kot--profil'));
  });
  pWybierz.addEventListener('click', function () { pPlik.click(); });
  pPlik.addEventListener('change', function () {
    obrazek(pPlik.files[0], function (err, d) {
      pPlik.value = '';
      if (err) { pBlad.textContent = err; return; }
      pBlad.textContent = ''; nowyAva = d; ustawAva(pAva, d, pNick.value); pUsun.hidden = false;
    });
  });
  pUsun.addEventListener('click', function () { nowyAva = ''; ustawAva(pAva, '', pNick.value); pUsun.hidden = true; pWybierz.focus(); });
  pNick.addEventListener('input', function () { if (!nowyAva) ustawAva(pAva, '', pNick.value.trim()); });
  pNick.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); pZapisz.click(); } });
  pZapisz.addEventListener('click', function () {
    var n = pNick.value.trim().replace(/\s+/g, ' ');
    if (n.length < 2) { pBlad.textContent = 'Nick musi mieć co najmniej 2 znaki.'; pNick.focus(); return; }
    if (!dobryNick(n)) { pBlad.textContent = 'Nick może mieć tylko litery, cyfry, spację i znaki _ . -'; pNick.focus(); return; }
    var nowy = { nick: n, ava: nowyAva || '', od: (profil && profil.od) || new Date().toISOString().slice(0, 10) };
    if (!zapiszProfil(nowy)) { pBlad.textContent = 'Przeglądarka nie pozwala zapisać profilu (tryb prywatny?).'; return; }
    var nowyGosc = !profil; profil = nowy; odswiezProfil(); pokazProfil(false);
    msg('kot', nowyGosc ? 'Miło Cię poznać, ' + n + '! Profil zapisany.' : 'Zapisane, ' + n + '.');
    var z = log.querySelector('.kot__go--profil'); if (z) z.remove();
  });
  pWroc.addEventListener('click', function () { pokazProfil(false); });
  pWyloguj.addEventListener('click', function () {
    zapiszProfil(null); profil = null; odswiezProfil(); pokazProfil(false);
    msg('kot', 'Wylogowano. Nick i awatar usunięte z tej przeglądarki.');
  });
  odswiezProfil();

  /* ---------- uchwyt arkusza: stuknięcie lub przeciągnięcie w dół zamyka ---------- */
  var y0 = null, dy = 0;
  uchwyt.addEventListener('pointerdown', function (e) {
    if (!telefon()) return;
    y0 = e.clientY; dy = 0; uchwyt.setPointerCapture(e.pointerId); panel.classList.add('kot__panel--ciagnij');
  });
  uchwyt.addEventListener('pointermove', function (e) {
    if (y0 == null) return; dy = Math.max(0, e.clientY - y0); panel.style.transform = 'translateY(' + dy + 'px)';
  });
  function puscUchwyt() {
    if (y0 == null) return;
    y0 = null; panel.classList.remove('kot__panel--ciagnij'); panel.style.transform = '';
    if (dy > 70) zamknij();
  }
  uchwyt.addEventListener('pointerup', puscUchwyt);
  uchwyt.addEventListener('pointercancel', puscUchwyt);
  uchwyt.addEventListener('click', function () { if (dy <= 70) zamknij(); });

  /* ---------- podpowiedź ---------- */
  var tipWidok = null;
  function schowajTip(zapamietaj) {
    if (!root.classList.contains('kot--tip')) return;
    root.classList.remove('kot--tip');
    if (zapamietaj && tipWidok) LS.set('kot-tip-' + tipWidok, '1');
  }
  tipX.addEventListener('click', function () { schowajTip(true); btn.focus(); });
  tipA.addEventListener('click', function () {
    var w = tipWidok; schowajTip(true);
    otworz(w === 'oferta' ? 'Ile to kosztuje?' : (w === 'start' ? 'Co robicie?' : ''));
  });
  var ruszyl = false, zegar = null;
  function zaplanuj() {
    clearTimeout(zegar); schowajTip(false);
    var w = widok(), p = PODPOWIEDZI[w];
    if (!p || otwarty || LS.get('kot-tip-' + w) || LS.get('kot-tipy-off')) return;
    zegar = setTimeout(function () {
      if (otwarty || !ruszyl || widok() !== w || document.querySelector('.nav__scrim.on')) return;
      tipWidok = w; tipT.textContent = p.t; tipA.textContent = p.a; root.classList.add('kot--tip');
    }, 4000);
  }
  ['pointerdown', 'scroll', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function f() { if (!ruszyl) { ruszyl = true; zaplanuj(); } }, { passive: true, once: true });
  });
  window.addEventListener('hashchange', zaplanuj);

  /* ---------- okno Meshugi na ekranie (#meshuga) → kot w rogu się chowa ---------- */
  var oknoMeshugi = document.querySelector('.mesh-okno__ramka');
  if (oknoMeshugi && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (wpisy) {
      var widac = wpisy[wpisy.length - 1].isIntersecting;
      root.classList.toggle('kot--przy-oknie', widac);
      if (widac) schowajTip(false);
    }, { threshold: 0.25 }).observe(oknoMeshugi);
  }
})();
