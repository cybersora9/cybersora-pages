/*! DancyCloud: panel topki (v5). Czysty JS, bez bibliotek. Rysuje topkę w podanym elemencie i wysyła wyniki do Workera.
 *  API: DancyRanking.create({ api, el, onRank }) -> { onRunStart, onRunEnd, refresh, destroy }
 *  Gra o panelu nie wie: łączy je host (np. DancyCloud.mount(ekran, { onRunStart: r.onRunStart, onRunEnd: r.onRunEnd })). */
(function (G) {
  'use strict';

  var KEY_NICK = 'dancycloud.nick';
  var KEY_SESJA = 'dancycloud.sesja';   // { nick, token, waznyDo } z serwera (konto: sam nick + hasło)
  var NICK_RE = /^[A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźż_.\-]{3,16}$/;   // jak w serwer/src/zasady.js
  var PONOW_MS = 5000, LIMIT_MS = 8000;
  var TRYBY = [['unik', 'Unik'], ['ogien', 'Ogień']];
  var OKRESY = [['tydzien', 'Ten tydzień'], ['zawsze', 'Zawsze']];
  var MSG = {
    brakNicku: 'Wpisz nick, żeby trafić do topki.',
    niedostepny: 'Ranking chwilowo niedostępny.',
    pusto: 'Pusto. Zagraj i bądź pierwszy.',
    laduje: 'Ładuję topkę…',
    wysylam: 'Wysyłam wynik…',
    ponawiam: 'Brak połączenia z rankingiem. Ponawiam za 5 s…'
  };

  var CSS =
    '.dcr{--i:var(--ink,#0e0e12);--a:var(--th-accent,#e11d33);--h:var(--th-hot,#ff3a52);--s:var(--th-solid,#d4132b);' +
    '--l:var(--th-label,#ff6b7d);--m:var(--muted-dark,#9a9098);--b:var(--bone,#f6f2f3);' +
    '--pn:var(--panel,color-mix(in srgb,#0e0e12,#fff 4%));--ln:var(--line,color-mix(in srgb,#0e0e12,#fff 11%));' +
    '--br:var(--bar,color-mix(in srgb,#0e0e12,#e11d33 7%));--mo:var(--mono,"Geist Mono",ui-monospace,Consolas,monospace);' +
    '--ct:polygon(0 0,calc(100% - 7px) 0,100% 7px,100% 100%,7px 100%,0 calc(100% - 7px));' +
    'box-sizing:border-box;width:100%;min-width:0;background:var(--ln);padding:1px;clip-path:var(--ct);color:var(--b);font-family:var(--mo)}' +
    '.dcr *{box-sizing:border-box}' +
    '.dcr-in{background:var(--i);clip-path:var(--ct);padding:0 0 12px;display:flex;flex-direction:column;gap:10px}' +
    '.dcr-bel{display:flex;align-items:center;height:34px;padding:0 12px;background:var(--br);border-bottom:1px solid var(--ln)}' +
    '.dcr-k,.dcr-bel h2,.dcr label,.dcr th,.dcr button{font:500 11px/1.3 var(--mo);letter-spacing:.08em;text-transform:uppercase}' +
    '.dcr-bel h2{margin:0;color:var(--l)}' +
    '.dcr-sek{padding:0 12px;display:flex;flex-direction:column;gap:6px;min-width:0}' +
    '.dcr label{color:var(--l)}' +
    '.dcr input{width:100%;min-width:0;font:500 14px/1 var(--mo);color:var(--b);background:var(--pn);border:1px solid var(--ln);padding:10px;clip-path:var(--ct);border-radius:0}' +
    '.dcr input:focus{outline:none;border-color:var(--h)}' +
    '.dcr input:focus-visible{box-shadow:inset 0 0 0 1px var(--b)}' +
    '.dcr input[aria-invalid=true]{border-color:var(--h)}' +
    '.dcr-pod{margin:0;font:400 11px/1.4 var(--mo);color:var(--m)}' +
    '.dcr-st,.dcr-fst{margin:0;min-height:1.4em;font:500 12px/1.4 var(--mo);color:var(--b)}' +
    '.dcr-st[data-r=zle],.dcr-fst[data-r=zle]{color:var(--l)}' +
    '.dcr-st b{color:var(--l);font-weight:700}' +
    '.dcr-gr{display:flex;gap:6px;flex-wrap:wrap}' +
    '.dcr button{color:var(--b);background:var(--pn);border:1px solid var(--ln);padding:9px 10px;min-height:36px;cursor:pointer;clip-path:var(--ct);flex:1 1 0;min-width:0}' +
    '.dcr button:hover{border-color:var(--h)}' +
    '.dcr button[aria-pressed=true]{background:var(--br);border-color:var(--h);color:var(--l)}' +
    '.dcr button:focus{outline:none}' +
    '.dcr button:focus-visible{box-shadow:inset 0 0 0 2px var(--b)}' +
    '.dcr-wy{flex:none!important;align-self:flex-start;background:var(--s)!important;border-color:var(--s)!important}' +
    '.dcr table{width:100%;border-collapse:collapse;table-layout:fixed;font:400 13px/1.2 var(--mo)}' +
    '.dcr caption{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}' +
    '.dcr th{color:var(--m);text-align:left;padding:6px 4px;border-bottom:1px solid var(--ln)}' +
    '.dcr td{padding:7px 4px;border-bottom:1px solid var(--pn);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.dcr .dcr-n{width:3.2em;color:var(--m)}.dcr .dcr-w{width:6.5em;text-align:right}.dcr .dcr-f{width:3.4em;text-align:right}' +
    '.dcr td.dcr-w{color:var(--b);font-weight:500}' +
    '.dcr tr.dcr-ja td{background:var(--s);color:var(--b);border-bottom-color:var(--s)}' +
    '.dcr tfoot td{border-bottom:0}' +
    '.dcr tr.dcr-przerwa td{color:var(--m);padding:2px 4px;text-align:center}' +
    '.dcr-info{margin:0;font:400 12px/1.4 var(--mo);color:var(--m)}' +
    '.dcr-info[data-r=zle]{color:var(--l)}' +
    // konto: większe etykiety (13 px) i cele dotyku 44 px
    '.dcr-konto label,.dcr-konto button{font-size:13px;letter-spacing:.04em}' +
    '.dcr-konto button,.dcr-konto input{min-height:44px}' +
    '.dcr-konto .dcr-pod,.dcr-konto .dcr-fst{font-size:13px}' +
    '.dcr-form{display:flex;flex-direction:column;gap:6px;margin:0;padding:10px;background:var(--pn);clip-path:var(--ct)}' +
    '.dcr-form input{background:var(--i)}' +
    '.dcr-ja-txt{margin:0;font:500 14px/1.4 var(--mo);color:var(--b)}.dcr-ja-txt b{color:var(--l)}' +
    '.dcr-link{flex:none!important;align-self:flex-start;background:none!important;border-color:transparent!important;text-transform:none!important;text-decoration:underline;padding:9px 0!important;color:var(--l)!important}' +
    '.dcr-kodbox{display:flex;flex-direction:column;gap:8px;padding:10px;border:1px solid var(--h);clip-path:var(--ct);background:var(--br)}' +
    '.dcr-kod{display:block;font:700 18px/1.3 var(--mo);letter-spacing:.06em;color:var(--b);user-select:all;word-break:break-all}' +
    '.dcr [hidden]{display:none!important}';

  var cssEl = null, cssRef = 0, licznik = 0;
  var sluchacze = [];   // panele na stronie: zmiana sesji w jednym odświeża wszystkie

  var pamiec = null;    // gdy localStorage nie działa (prywatne okno, podgląd), sesja żyje do przeładowania strony
  function czytajSesje() {
    var s = pamiec;
    try { s = JSON.parse(G.localStorage.getItem(KEY_SESJA) || 'null'); } catch (e) { /* zostaje pamiec */ }
    return s && s.token && s.nick && !(Date.parse(s.waznyDo) <= Date.now()) ? s : null;
  }
  function zapiszSesje(s) {
    pamiec = s ? { nick: s.nick, token: s.token, waznyDo: s.waznyDo } : null;
    try { if (s) G.localStorage.setItem(KEY_SESJA, JSON.stringify({ nick: s.nick, token: s.token, waznyDo: s.waznyDo })); else G.localStorage.removeItem(KEY_SESJA); } catch (e) { /* ok */ }
    for (var k = 0; k < sluchacze.length; k++) try { sluchacze[k](); } catch (e) { /* panel */ }
  }

  function czytaj() { try { return G.localStorage.getItem(KEY_NICK) || ''; } catch (e) { return ''; } }
  function zapisz(v) { try { if (v) G.localStorage.setItem(KEY_NICK, v); else G.localStorage.removeItem(KEY_NICK); } catch (e) { /* bez localStorage panel działa */ } }

  function create(o) {
    o = o || {};
    var el = o.el;
    if (!el || !el.appendChild) throw new Error('DancyRanking.create: podaj element el');
    var api = String(o.api || '').replace(/\/+$/, '');
    var doc = el.ownerDocument || document, win = doc.defaultView || G;
    if (!cssRef++) { cssEl = doc.createElement('style'); cssEl.textContent = CSS; doc.head.appendChild(cssEl); }
    var id = 'dcr' + (++licznik);

    var root = doc.createElement('section');
    root.className = 'dcr';
    root.setAttribute('aria-labelledby', id + '-h');
    root.innerHTML =
      '<div class="dcr-in">' +
      '<div class="dcr-bel"><h2 id="' + id + '-h">Topka · DancyCloud</h2></div>' +
      // konto (opcjonalne): rezerwuje nick w topce. Tylko nick i hasło.
      '<div class="dcr-sek dcr-konto">' +
      '<div data-k="wyl"><p class="dcr-pod">Konto rezerwuje Twój nick w topce. Tylko nick i hasło, bez maila.</p>' +
      '<div class="dcr-gr"><button type="button" data-a="pokaz-log">Zaloguj</button><button type="button" data-a="pokaz-rej">Załóż konto</button></div></div>' +
      '<form class="dcr-form" data-k="form" novalidate hidden>' +
      '<label for="' + id + '-kn">Nick</label><input id="' + id + '-kn" name="nick" type="text" maxlength="16" autocomplete="username" spellcheck="false" autocapitalize="off">' +
      '<div data-pole="kod" hidden><label for="' + id + '-kk">Kod odzyskiwania</label><input id="' + id + '-kk" name="kod" type="text" maxlength="24" autocomplete="off" spellcheck="false" autocapitalize="characters" placeholder="XXXX-XXXX-XXXX-XXXX"></div>' +
      '<label for="' + id + '-kh" data-l="haslo">Hasło</label><input id="' + id + '-kh" name="haslo" type="password" maxlength="128" autocomplete="current-password">' +
      '<div data-pole="powtorz" hidden><label for="' + id + '-kh2">Powtórz hasło</label><input id="' + id + '-kh2" name="powtorz" type="password" maxlength="128" autocomplete="new-password"></div>' +
      '<p class="dcr-pod" data-pole="podp" hidden>Hasło: min. 8 znaków. Bez imienia, nazwiska i maila.</p>' +
      '<p class="dcr-fst" data-k="fst" role="status" aria-live="polite"></p>' +
      '<div class="dcr-gr"><button type="submit" class="dcr-wy" data-k="fok">Zaloguj</button><button type="button" data-a="anuluj">Anuluj</button></div>' +
      '<button type="button" class="dcr-link" data-a="pokaz-odz">Nie pamiętam hasła</button></form>' +
      '<div data-k="wl" hidden><p class="dcr-ja-txt">Grasz jako <b data-k="jan"></b></p>' +
      '<div class="dcr-gr"><button type="button" data-a="wyloguj">Wyloguj</button><button type="button" data-a="pokaz-usun">Usuń konto</button></div></div>' +
      '<form class="dcr-form" data-k="usun" novalidate hidden>' +
      '<label for="' + id + '-ku">Hasło, żeby potwierdzić</label><input id="' + id + '-ku" name="haslo" type="password" maxlength="128" autocomplete="current-password">' +
      '<p class="dcr-pod">Usuniemy konto i wszystkie jego wyniki z topki. Tego nie da się cofnąć.</p>' +
      '<p class="dcr-fst" data-k="ust" role="status" aria-live="polite"></p>' +
      '<div class="dcr-gr"><button type="submit" class="dcr-wy">Usuń konto i wyniki</button><button type="button" data-a="anuluj-usun">Anuluj</button></div></form>' +
      '<div class="dcr-kodbox" data-k="kodbox" role="group" aria-labelledby="' + id + '-kt" hidden>' +
      '<p class="dcr-pod" id="' + id + '-kt">Twój kod odzyskiwania. Zapisz go teraz, drugi raz go nie pokażemy. Bez niego zapomniane hasło = nowe konto.</p>' +
      '<code class="dcr-kod" data-k="kod"></code>' +
      '<button type="button" data-a="kod-ok">Zapisałem kod</button></div>' +
      '</div>' +
      '<div class="dcr-sek"><label for="' + id + '-n" data-k="nl">Twój nick</label>' +
      '<input id="' + id + '-n" type="text" maxlength="16" autocomplete="nickname" spellcheck="false" autocapitalize="off" aria-describedby="' + id + '-p">' +
      '<p class="dcr-pod" id="' + id + '-p">3–16 znaków: litery, cyfry, _ - . Bez konta wystarczy sam nick.</p>' +
      '<p class="dcr-st" role="status" aria-live="polite"></p>' +
      '<button type="button" class="dcr-wy" data-a="wyslij" hidden>Wyślij z nowym nickiem</button></div>' +
      '<div class="dcr-sek"><div class="dcr-gr" role="group" aria-label="Tryb gry">' +
      TRYBY.map(function (t) { return '<button type="button" data-t="' + t[0] + '" aria-pressed="false">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div class="dcr-gr" role="group" aria-label="Okres">' +
      OKRESY.map(function (t) { return '<button type="button" data-o="' + t[0] + '" aria-pressed="false">' + t[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="dcr-sek"><table><caption></caption><thead><tr>' +
      '<th scope="col" class="dcr-n">#</th><th scope="col">Nick</th><th scope="col" class="dcr-w">Wynik</th><th scope="col" class="dcr-f">Fala</th>' +
      '</tr></thead><tbody></tbody><tfoot></tfoot></table>' +
      '<p class="dcr-info"></p></div></div>';
    el.appendChild(root);
    function q(s) { return root.querySelector(s); }

    var inp = q('#' + id + '-n'), st = q('.dcr-st'), info = q('.dcr-info'), tb = q('tbody'), tf = q('tfoot'), cap = q('caption'), bWy = q('[data-a=wyslij]');
    var tryb = 'ogien', okres = 'tydzien', dead = false, seq = 0;
    var run = null;          // bieżąca runda: { mode, p: Promise<{runId, token}|{blad}> }
    var ostatni = null;      // ostatni start (do kontynuacji „Od bossa”)
    var wynikJa = null;      // ostatni przyjęty wynik gracza: { mode, nick, score, wave, zawsze:{place,total,best}, tydzien:{...} }
    var czeka = null;        // wynik odrzucony za nick, do ponownego wysłania: { ids, w }
    var timery = [], kontrolery = [], stNick = false;   // stNick: w statusie jest podpowiedź o nicku

    inp.value = czytaj();

    // --- sieć ---------------------------------------------------------------------------
    function timer(fn, ms) {
      var h = win.setTimeout(function () { timery.splice(timery.indexOf(h), 1); fn(); }, ms);
      timery.push(h); return h;
    }
    function zapytanie(metoda, sciezka, cialo, cache, token) {
      if (dead) return Promise.resolve({ siec: true });
      var ac = win.AbortController ? new win.AbortController() : null, h = 0;
      if (ac) { kontrolery.push(ac); h = timer(function () { ac.abort(); }, LIMIT_MS); }
      var nagl = cialo ? { 'Content-Type': 'application/json' } : {};
      if (token) nagl.Authorization = 'Bearer ' + token;
      var init = { method: metoda, headers: nagl, body: cialo ? JSON.stringify(cialo) : undefined, cache: cache || 'default', signal: ac ? ac.signal : undefined };
      function sprzataj() {
        if (h) { win.clearTimeout(h); var k = timery.indexOf(h); if (k >= 0) timery.splice(k, 1); }
        if (ac) { var j = kontrolery.indexOf(ac); if (j >= 0) kontrolery.splice(j, 1); }
      }
      return win.fetch(api + sciezka, init).then(function (r) {
        return r.json().then(function (d) { return d; }, function () { return {}; }).then(function (d) {
          sprzataj();
          if (r.ok) return { ok: true, dane: d };
          return r.status >= 500 ? { siec: true, status: r.status } : { blad: d && d.error || 'Błąd rankingu.', kod: d && d.kod, status: r.status };
        });
      }, function () { sprzataj(); return { siec: true }; });
    }

    // --- widok ---------------------------------------------------------------------------
    function status(txt, zle, oNicku) { stNick = !!oNicku; st.textContent = txt || ''; if (zle) st.setAttribute('data-r', 'zle'); else st.removeAttribute('data-r'); }
    function nick() { return inp.value.normalize ? inp.value.normalize('NFC').trim() : inp.value.trim(); }
    function nickOk() { return NICK_RE.test(nick()); }
    function przyciski() {
      var b = root.querySelectorAll('[data-t]'), k;
      for (k = 0; k < b.length; k++) b[k].setAttribute('aria-pressed', String(b[k].getAttribute('data-t') === tryb));
      b = root.querySelectorAll('[data-o]');
      for (k = 0; k < b.length; k++) b[k].setAttribute('aria-pressed', String(b[k].getAttribute('data-o') === okres));
      cap.textContent = 'Topka, tryb ' + (tryb === 'ogien' ? 'Ogień' : 'Unik') + ', ' + (okres === 'tydzien' ? 'ten tydzień' : 'od początku');
    }
    function wiersz(r, ja) {
      var tr = doc.createElement('tr'), d = [['dcr-n', r.place], ['', r.nick], ['dcr-w', r.score], ['dcr-f', r.wave == null ? '–' : r.wave]];
      if (ja) tr.className = 'dcr-ja';
      for (var k = 0; k < 4; k++) { var td = doc.createElement('td'); if (d[k][0]) td.className = d[k][0]; td.textContent = String(d[k][1]); tr.appendChild(td); }
      if (ja) tr.setAttribute('aria-label', 'Ty: miejsce ' + r.place + ', ' + r.nick + ', ' + r.score + ' punktów');
      return tr;
    }
    function rysuj(lista) {
      var ses = czytajSesje();
      var mojKlucz = (wynikJa && wynikJa.mode === tryb ? wynikJa.nick : ses ? ses.nick : nick()).toLowerCase(), jest = false, k;
      tb.textContent = ''; tf.textContent = '';
      for (k = 0; k < lista.length; k++) {
        var ja = !!mojKlucz && String(lista[k].nick).toLowerCase() === mojKlucz;
        if (ja) jest = true;
        tb.appendChild(wiersz(lista[k], ja));
      }
      // gracz spoza topki: pokazany pod nią
      var m = wynikJa && wynikJa.mode === tryb ? wynikJa[okres] : null;
      if (!jest && m && m.place) {
        var p = doc.createElement('tr'), td = doc.createElement('td');
        p.className = 'dcr-przerwa'; td.colSpan = 4; td.textContent = '…'; p.appendChild(td); tf.appendChild(p);
        tf.appendChild(wiersz({ place: m.place, nick: wynikJa.nick, score: m.best, wave: wynikJa.best === m.best ? wynikJa.wave : null }, true));
      }
      info.removeAttribute('data-r');
      info.textContent = lista.length ? '' : MSG.pusto;
    }
    function odswiez(swiezo) {
      var nr = ++seq;
      przyciski();
      if (!tb.children.length) info.textContent = MSG.laduje;
      return zapytanie('GET', '/top?mode=' + tryb + '&okres=' + okres + '&limit=10', null, swiezo ? 'no-cache' : 'default').then(function (r) {
        if (dead || nr !== seq) return;
        if (r.ok) rysuj(r.dane.lista || []);
        else { tb.textContent = ''; tf.textContent = ''; info.textContent = r.siec ? MSG.niedostepny : r.blad; info.setAttribute('data-r', 'zle'); }
      });
    }
    function miejsceTxt(m) { return m && m.place ? 'Twoje miejsce: #' + m.place + ' z ' + m.total : ''; }

    // --- wysyłanie wyniku -----------------------------------------------------------------
    function wyslij(ids, w, proba) {
      var s = czytajSesje(), n = s ? s.nick : nick();
      status(MSG.wysylam);
      return zapytanie('POST', '/run/end', { runId: ids.runId, token: ids.token, arena: true, nick: n, score: w.score, mode: w.mode, durationMs: w.durationMs, wave: w.wave, bossesBeaten: w.bossesBeaten }, null, s && s.token).then(function (r) {
        if (dead) return null;
        if (r.ok) {
          czeka = null; bWy.hidden = true;
          var d = r.dane;
          wynikJa = { mode: w.mode, nick: d.nick || n, score: w.score, wave: w.wave, best: d.best, zawsze: { place: d.place, total: d.total, best: d.best }, tydzien: d.tydzien || null };
          var m = wynikJa[okres] || wynikJa.zawsze;
          st.removeAttribute('data-r'); stNick = false;
          st.textContent = '';
          st.appendChild(doc.createTextNode('Twoje miejsce: '));
          var b = doc.createElement('b'); b.textContent = '#' + m.place; st.appendChild(b);
          st.appendChild(doc.createTextNode(' z ' + m.total + (okres === 'tydzien' ? ' w tym tygodniu' : '') + ' · wynik ' + w.score + (d.best > w.score ? ', najlepszy ' + d.best : '')));
          if (tryb !== w.mode) tryb = w.mode;
          odswiez(true);
          var wy = { place: m.place, total: m.total, best: m.best };
          if (typeof o.onRank === 'function') try { o.onRank(wy); } catch (e) { /* host */ }
          return wy;
        }
        if (r.siec) {
          if (!proba) {
            status(MSG.ponawiam, true);
            return new Promise(function (ok) { timer(function () { ok(dead ? null : wyslij(ids, w, 1)); }, PONOW_MS); });
          }
          status(MSG.niedostepny + ' Wynik ' + w.score + ' nie trafił do topki.', true);
          return null;
        }
        if (r.kod === 'nick' || r.kod === 'nick_konto' || r.kod === 'sesja') {   // start nie przepadł: można poprawić i wysłać jeszcze raz
          czeka = { ids: ids, w: w }; bWy.hidden = false;
          if (r.kod === 'sesja') zapiszSesje(null);
          status((r.kod === 'nick' ? 'Nick odrzucony: ' : '') + r.blad + ' Wynik ' + w.score + ' czeka na wysłanie.', true);
          return null;
        }
        status('Wynik odrzucony: ' + r.blad, true);
        return null;
      });
    }

    function onRunStart(info0) {
      if (dead) return;
      // etap 1b: topka to Arena (bazowy sprzęt). Kampania (arena: false) nie startuje rundy na serwerze.
      if (info0 && info0.arena === false) { run = null; return; }
      var m = (info0 && info0.mode) || 'ogien';
      czeka = null; bWy.hidden = true;
      if (m !== tryb && (m === 'unik' || m === 'ogien')) { tryb = m; odswiez(); }
      // panel poza stroną (host liczy rundy w ukrytym panelu): nick bierzemy z zapisu, który zrobił widoczny panel
      if (!doc.documentElement.contains(root)) inp.value = czytaj();
      if (!czytajSesje()) {
        if (!nickOk()) { run = null; status(MSG.brakNicku, true, true); return; }
        zapisz(nick());
      }
      status('');
      var cialo = { mode: m, arena: true };
      if (info0 && info0.retry && ostatni && ostatni.mode === m) cialo.poprzedni = { runId: ostatni.runId, token: ostatni.token };
      var r = { mode: m };
      r.p = zapytanie('POST', '/run/start', cialo).then(function (x) {
        if (x.ok) { ostatni = { mode: m, runId: x.dane.runId, token: x.dane.token }; return x.dane; }
        return x;
      });
      run = r;
    }

    function onRunEnd(w) {
      if (dead || !w) return Promise.resolve(null);
      var r = run; run = null;
      if (!r) {
        if (!czytajSesje() && !nickOk()) status(MSG.brakNicku + ' Wynik ' + w.score + ' nie został wysłany.', true);
        return Promise.resolve(null);
      }
      return r.p.then(function (ids) {
        if (dead) return null;
        if (!ids || !ids.runId) {
          status(ids && ids.blad ? ids.blad + ' Wynik ' + w.score + ' nie trafił do topki.' : MSG.niedostepny + ' Wynik ' + w.score + ' nie trafił do topki.', true);
          return null;
        }
        return wyslij(ids, w, 0);
      });
    }

    // --- zdarzenia -------------------------------------------------------------------------------
    function onClick(e) {
      var b = e.target && e.target.closest ? e.target.closest('button') : null;
      if (!b || !root.contains(b)) return;
      if (b.getAttribute('data-t')) { if (tryb !== b.getAttribute('data-t')) { tryb = b.getAttribute('data-t'); odswiez(); } return; }
      if (b.getAttribute('data-o')) {
        if (okres !== b.getAttribute('data-o')) {
          okres = b.getAttribute('data-o');
          if (wynikJa && wynikJa.mode === tryb && wynikJa[okres]) status(miejsceTxt(wynikJa[okres]));
          odswiez();
        }
        return;
      }
      if (kontoKlik(b)) return;
      if (b === bWy && czeka) {
        if (czytajSesje()) { var c0 = czeka; czeka = null; bWy.hidden = true; wyslij(c0.ids, c0.w, 0); return; }
        if (!nickOk()) { status('Popraw nick: 3–16 znaków, litery, cyfry, _ - .', true); inp.focus(); return; }
        zapisz(nick());
        var c = czeka; czeka = null; bWy.hidden = true;
        wyslij(c.ids, c.w, 0);
      }
    }
    function onInput() {
      var v = nick(), zly = !!v && !NICK_RE.test(v);
      inp.setAttribute('aria-invalid', String(zly));
      if (!v) status(MSG.brakNicku, false, true);
      else if (zly) status('3–16 znaków: litery, cyfry, _ - .', true, true);
      else if (stNick) status('');
    }
    function onChange() { if (nickOk() || !nick()) zapisz(nick()); }
    function onKey(e) { if (e.key === 'Enter') { e.preventDefault(); onChange(); if (czeka) bWy.click(); else inp.blur(); } }
    // --- konto: nick + hasło, sesja w localStorage, wspólna dla wszystkich paneli -----------------
    var kWyl = q('[data-k=wyl]'), kForm = q('[data-k=form]'), kWl = q('[data-k=wl]'), kUsun = q('[data-k=usun]'), kBox = q('[data-k=kodbox]');
    var fSt = q('[data-k=fst]'), uSt = q('[data-k=ust]'), fOk = q('[data-k=fok]'), inpWrap = [inp, q('[data-k=nl]'), q('#' + id + '-p')];
    var tryb0 = 'log', zajety = false;   // tryb formularza: log | rej | odz
    function pole(nazwa) { return kForm.elements[nazwa]; }
    function fStatus(el, txt, zle) { el.textContent = txt || ''; if (zle) el.setAttribute('data-r', 'zle'); else el.removeAttribute('data-r'); }
    function widokKonta() {
      var s = czytajSesje();
      kWyl.hidden = !!s || !kForm.hidden || !kBox.hidden;
      kWl.hidden = !s || !kUsun.hidden || !kBox.hidden;
      if (s) { q('[data-k=jan]').textContent = s.nick; kForm.hidden = true; }
      else kUsun.hidden = true;
      for (var k = 0; k < inpWrap.length; k++) inpWrap[k].hidden = !!s;
      bWy.textContent = s ? 'Wyślij wynik' : 'Wyślij z nowym nickiem';
      if (s && stNick) status('');
      else if (!s && !nick() && !czeka && !wynikJa) status(MSG.brakNicku, false, true);
    }
    function otworzForm(t) {
      tryb0 = t;
      var rej = t === 'rej', odz = t === 'odz';
      q('[data-pole=kod]').hidden = !odz;
      q('[data-pole=powtorz]').hidden = !(rej || odz);
      q('[data-pole=podp]').hidden = !(rej || odz);
      q('[data-l=haslo]').textContent = odz ? 'Nowe hasło' : 'Hasło';
      pole('haslo').setAttribute('autocomplete', rej || odz ? 'new-password' : 'current-password');
      q('[data-a=pokaz-odz]').hidden = t !== 'log';
      fOk.textContent = rej ? 'Załóż konto' : odz ? 'Ustaw nowe hasło' : 'Zaloguj';
      pole('haslo').value = ''; pole('powtorz').value = ''; pole('kod').value = '';
      if (!pole('nick').value && nickOk()) pole('nick').value = nick();
      fStatus(fSt, '');
      kForm.hidden = false; widokKonta();
      try { pole('nick').focus({ preventScroll: true }); } catch (e) { pole('nick').focus(); }
    }
    function zamknijForm() { kForm.hidden = true; fStatus(fSt, ''); widokKonta(); }
    function pokazKod(kod) {
      q('[data-k=kod]').textContent = kod;
      kBox.hidden = false; widokKonta();
      try { q('[data-a=kod-ok]').focus({ preventScroll: true }); } catch (e) { /* ok */ }
    }
    function poZalogowaniu(d, kod) {
      zapiszSesje(d);   // odświeża widok we wszystkich panelach
      pole('haslo').value = ''; pole('powtorz').value = ''; pole('kod').value = '';
      kForm.hidden = true;
      if (kod) pokazKod(kod); else widokKonta();
      status('Zalogowano jako ' + d.nick + '. Wyniki z Areny trafią do topki pod tym nickiem.');
      if (czeka) { var c = czeka; czeka = null; bWy.hidden = true; wyslij(c.ids, c.w, 0); }
      else odswiez(true);
    }
    function wyslijForm(e) {
      e.preventDefault();
      if (zajety) return;
      var n = (pole('nick').value.normalize ? pole('nick').value.normalize('NFC') : pole('nick').value).trim();
      var h = pole('haslo').value, h2 = pole('powtorz').value, kod = pole('kod').value;
      var zle = !NICK_RE.test(n) ? ['nick', 'Nick: 3–16 znaków, litery, cyfry, _ - .']
        : tryb0 === 'odz' && kod.replace(/[^A-Za-z0-9]/g, '').length !== 16 ? ['kod', 'Kod ma 16 znaków (XXXX-XXXX-XXXX-XXXX).']
        : !h ? ['haslo', 'Podaj hasło.']
        : tryb0 !== 'log' && h.length < 8 ? ['haslo', 'Hasło: min. 8 znaków.']
        : tryb0 !== 'log' && h !== h2 ? ['powtorz', 'Hasła się różnią.'] : null;
      var wszystkie = ['nick', 'kod', 'haslo', 'powtorz'];
      for (var k = 0; k < wszystkie.length; k++) pole(wszystkie[k]).setAttribute('aria-invalid', String(!!zle && zle[0] === wszystkie[k]));
      if (zle) { fStatus(fSt, zle[1], true); pole(zle[0]).focus(); return; }
      var sciezka = tryb0 === 'rej' ? '/konto/rejestracja' : tryb0 === 'odz' ? '/konto/odzyskaj' : '/konto/logowanie';
      var cialo = tryb0 === 'odz' ? { nick: n, kod: kod, noweHaslo: h } : { nick: n, haslo: h };
      zajety = true; fOk.disabled = true;
      fStatus(fSt, tryb0 === 'rej' ? 'Zakładam konto…' : tryb0 === 'odz' ? 'Sprawdzam kod…' : 'Loguję…');
      zapytanie('POST', sciezka, cialo).then(function (r) {
        zajety = false; fOk.disabled = false;
        if (dead) return;
        if (r.ok) { poZalogowaniu(r.dane, r.dane.kodOdzyskiwania); return; }
        fStatus(fSt, r.siec ? MSG.niedostepny : r.blad, true);
        var p = { nick: 'nick', nick_zajety: 'nick', haslo: 'haslo', kod: 'kod', logowanie: 'haslo' }[r.kod];
        if (p) { pole(p).setAttribute('aria-invalid', 'true'); pole(p).focus(); }
      });
    }
    function wyslijUsun(e) {
      e.preventDefault();
      var s = czytajSesje(), h = kUsun.elements.haslo.value;
      if (!s || zajety) return;
      if (!h) { fStatus(uSt, 'Podaj hasło.', true); kUsun.elements.haslo.focus(); return; }
      zajety = true; fStatus(uSt, 'Usuwam konto…');
      zapytanie('DELETE', '/konto', { haslo: h }, null, s.token).then(function (r) {
        zajety = false;
        if (dead) return;
        if (r.ok) {
          kUsun.elements.haslo.value = ''; kUsun.hidden = true; wynikJa = null;
          zapiszSesje(null);
          status('Konto usunięte razem z wynikami (' + (r.dane.usunieteWyniki || 0) + ').');
          odswiez(true); return;
        }
        if (r.kod === 'sesja') { kUsun.hidden = true; zapiszSesje(null); status(r.blad, true); return; }
        fStatus(uSt, r.siec ? MSG.niedostepny : r.blad, true);
        kUsun.elements.haslo.focus();
      });
    }
    function kontoKlik(b) {
      var a = b.getAttribute('data-a');
      if (a === 'pokaz-log') otworzForm('log');
      else if (a === 'pokaz-rej') otworzForm('rej');
      else if (a === 'pokaz-odz') otworzForm('odz');
      else if (a === 'anuluj') zamknijForm();
      else if (a === 'kod-ok') { kBox.hidden = true; q('[data-k=kod]').textContent = ''; widokKonta(); }
      else if (a === 'pokaz-usun') { kUsun.hidden = false; fStatus(uSt, ''); widokKonta(); kUsun.elements.haslo.focus(); }
      else if (a === 'anuluj-usun') { kUsun.hidden = true; kUsun.elements.haslo.value = ''; widokKonta(); }
      else if (a === 'wyloguj') {
        var s = czytajSesje();
        if (s) zapytanie('POST', '/konto/wyloguj', {}, null, s.token);   // serwer unieważnia token; lokalnie wylogowujemy od razu
        wynikJa = null; zapiszSesje(null); status('Wylogowano.'); odswiez(true);
      } else return false;
      return true;
    }
    kForm.addEventListener('submit', wyslijForm);
    kUsun.addEventListener('submit', wyslijUsun);
    sluchacze.push(widokKonta);
    // sesja z innego dnia: sprawdź po cichu, czy serwer ją jeszcze zna
    (function () {
      var s = czytajSesje();
      if (!s || !api) return;
      zapytanie('GET', '/konto', null, 'no-store', s.token).then(function (r) { if (!dead && r.kod === 'sesja') zapiszSesje(null); });
    })();

    root.addEventListener('click', onClick);
    inp.addEventListener('input', onInput);
    inp.addEventListener('change', onChange);
    inp.addEventListener('keydown', onKey);

    przyciski();
    widokKonta();
    if (api) odswiez(); else { info.textContent = MSG.niedostepny; info.setAttribute('data-r', 'zle'); }

    function destroy() {
      if (dead) return;
      dead = true;
      while (timery.length) win.clearTimeout(timery.pop());
      while (kontrolery.length) { try { kontrolery.pop().abort(); } catch (e) { /* ok */ } }
      root.removeEventListener('click', onClick);
      kForm.removeEventListener('submit', wyslijForm);
      kUsun.removeEventListener('submit', wyslijUsun);
      var ks = sluchacze.indexOf(widokKonta); if (ks >= 0) sluchacze.splice(ks, 1);
      inp.removeEventListener('input', onInput);
      inp.removeEventListener('change', onChange);
      inp.removeEventListener('keydown', onKey);
      if (root.parentNode) root.parentNode.removeChild(root);
      if (!--cssRef && cssEl) { if (cssEl.parentNode) cssEl.parentNode.removeChild(cssEl); cssEl = null; }
      run = ostatni = wynikJa = czeka = null;
    }

    // stan do testów (nie jest potrzebny hostowi)
    function stan() { return { tryb: tryb, okres: okres, nick: nick(), konto: (czytajSesje() || {}).nick || null, timery: timery.length, zapytania: kontrolery.length, wynik: wynikJa, dead: dead }; }

    return { onRunStart: onRunStart, onRunEnd: onRunEnd, refresh: function () { return odswiez(true); }, destroy: destroy, state: stan };
  }

  G.DancyRanking = { create: create, version: '1.0.0' };
})(typeof window !== 'undefined' ? window : this);
