/*! profil.js (05.11.2026, P1): profil cybersory. Układ A „Wizytówka” (decyzja maisy 05.11), linki: kapsuła na profilu + wiersz w ustawieniach.
 *  Okno profilu pod adresem #u/<nick> (na żywo: cybersora.pl/u/<nick>, P3), zakładka „Profil” w Moim koncie, szkic obrazka OG 1200×630.
 *  Dane wyłącznie przez window.KontoAPI; stan konta i komunikaty przez window.Konto (konto.js). Słownik: window.CybersoraProgramy.
 *  Treść użytkownika (nick, bio, linki) wyłącznie przez textContent / atrybuty, nigdy przez innerHTML. */
(function () {
  'use strict';
  if (window.__profil) return; window.__profil = 1;
  var api = window.KontoAPI, SL = window.CybersoraProgramy;
  if (!api || !SL || !SL.cs) return;
  var D = document, CS = SL.cs;

  /* ---------------- drobne ---------------- */
  function el(tag, cls, txt) { var n = D.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
  function btn(cls, txt, aria) { var b = el('button', cls, txt); b.type = 'button'; if (aria) b.setAttribute('aria-label', aria); return b; }
  function svgSpan(cls, html) { var s = el('span', cls); s.setAttribute('aria-hidden', 'true'); s.innerHTML = html; return s; }   // html tylko ze słownika
  function ik(n) { return SL.svgIkony(n); }
  function liczba(n) { return Number(n || 0).toLocaleString('pl-PL').replace(/\s/g, ' '); }
  function data(ms) { var d = new Date(ms); if (isNaN(d)) return ''; return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear(); }
  function kotUrl(kot, r) { return '/assety/kot-awatar/kot-' + (kot || 'kosc') + '-' + (r || 256) + '.webp'; }
  function konto() { return window.Konto || null; }
  function powiedz(t, blad) { var k = konto(); if (k && k.powiedz) k.powiedz(t, blad); }
  function mojNick() { var s = api.sesja(); return s ? s.nick : ''; }
  function toSamo(a, b) { return String(a || '').toLowerCase() === String(b || '').toLowerCase(); }
  function skrot(t, n) { var a = Array.from(String(t || '')); return a.length > n ? a.slice(0, n - 1).join('') + '…' : a.join(''); }

  /* znaki marek: oryginalne ścieżki Simple Icons 13.21, tylko biały (ciemne tło); bez przeróbek, nic do znaku nie dokładamy */
  var ZNAKI = {
    github: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
    linkedin: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
    discord: 'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z'
  };
  var NAZWY = { github: 'GitHub', linkedin: 'LinkedIn', discord: 'Discord' };
  function znak(s) {
    var v = D.createElementNS('http://www.w3.org/2000/svg', 'svg');
    v.setAttribute('viewBox', '0 0 24 24'); v.setAttribute('class', 'pf-znak pf-znak--' + s); v.setAttribute('aria-hidden', 'true'); v.setAttribute('focusable', 'false');
    if (s === 'linkedin') {   // oficjalny znak: niebieski kafelek z białym „in”
      var r = D.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', '1.5'); r.setAttribute('y', '1.5'); r.setAttribute('width', '21'); r.setAttribute('height', '21'); r.setAttribute('fill', '#fff');
      v.appendChild(r);
    }
    var p = D.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', ZNAKI[s]); v.appendChild(p);
    return v;
  }

  /* ---------------- dane: wszystkie odznaki, suma XP, ranga ---------------- */
  var ZRODLA = [['czytnik', 'Czytnik'], ['dancy', 'DancyCloud'], ['strona', 'Strona']];
  function zbierz(d) {
    var lista = [], suma = 0, podzial = { czytnik: 0, dancy: 0, strona: 0 };   // podział do „Skąd XP?” (P1.1)
    var cz = d.programy && d.programy.czytnik, defCz = SL.programy.czytnik;
    if (defCz) {
      var zd = {}; (cz ? cz.odznaki : []).forEach(function (o) { zd[o.klucz] = o; });
      defCz.odznaki.forEach(function (o) {
        var z = zd[o.klucz], op = SL.opisOdznaki('czytnik', o.klucz);
        lista.push({ zr: 'czytnik', klucz: 'czytnik:' + o.klucz, nazwa: op.nazwa, opis: op.opis, ikona: op.ikona, xp: op.xp, ms: z ? z.zdobyta_ms : null });
      });
      (cz ? cz.odznaki : []).filter(function (o) { return /^wyzwanie_/.test(o.klucz); }).forEach(function (o) {
        var op = SL.opisOdznaki('czytnik', o.klucz, o.prog);
        if (op) lista.push({ zr: 'czytnik', klucz: 'czytnik:' + o.klucz, nazwa: op.nazwa, opis: op.opis, ikona: op.ikona, xp: op.xp, ms: o.zdobyta_ms });
      });
      if (cz) { suma += cz.xp; podzial.czytnik = cz.xp; }   // XP czytnika liczy sam czytnik (odznaki + czytanie)
    }
    ['dancy', 'strona'].forEach(function (zr) {
      CS.zrodla[zr].odznaki.forEach(function (o) {
        var ms = (d.odznaki_cs || {})[zr + ':' + o.klucz] || null;
        lista.push({ zr: zr, klucz: zr + ':' + o.klucz, nazwa: o.pl[0], opis: o.pl[1], ikona: o.ikona, xp: o.xp, ms: ms });
        if (ms) { suma += o.xp; podzial[zr] += o.xp; }
      });
    });
    var mapa = {}; lista.forEach(function (x) { mapa[x.klucz] = x; });
    return { lista: lista, mapa: mapa, suma: suma, podzial: podzial, ranga: CS.ranga(suma), programow: Object.keys(d.programy || {}).length };
  }

  /* ---------------- elementy profilu ---------------- */
  /* P1.1 (06.11, decyzja maisy „wystawa tego, co masz”): kafel = tylko zdobyta odznaka, z datą; nie jest przystankiem Tab
     (lista ma aria-label, czytnik ekranu czyta kafle). Zablokowane widzi wyłącznie właściciel, jako wiersze „Do zdobycia”. */
  function odznaka(x) {
    var li = el('li', 'pf-odz');
    li.appendChild(svgSpan('pf-odz__ik', ik(x.ikona)));
    li.append(el('span', 'pf-odz__n', x.nazwa), el('span', 'pf-odz__d', data(x.ms)));
    li.setAttribute('aria-label', x.nazwa + ', zdobyta ' + data(x.ms) + ', ' + liczba(x.xp) + ' XP');
    return li;
  }
  function zdanie(t) { t = String(t || '').trim(); return /[.!?…]$/.test(t) ? t : t + '.'; }
  function wierszDoZdobycia(x) {
    var li = el('li', 'pf-dozd__w');
    li.appendChild(svgSpan('pf-dozd__ik', ik(x.ikona)));
    var t = el('span', 'pf-dozd__t'); t.append(el('b', null, x.nazwa), el('span', null, zdanie(x.opis)));
    li.append(t, el('span', 'pf-dozd__xp', '+' + liczba(x.xp) + ' XP'));
    return li;
  }
  function nazwaZrodla(zr) { var f = ZRODLA.filter(function (z) { return z[0] === zr; })[0]; return f ? f[1] : zr; }
  function kapsula(s, l) {
    var tekst = el('span', null, l.pokaz);
    var opis = NAZWY[s] + ': ' + l.pokaz + (l.potwierdzony ? ' (potwierdzone)' : '');
    var a;
    if (l.url) {
      a = el('a', 'pf-kaps'); a.href = l.url; a.target = '_blank'; a.rel = 'nofollow noopener noreferrer ugc'; a.referrerPolicy = 'no-referrer';
      a.setAttribute('aria-label', opis + ', otwiera się w nowej karcie');
    } else {
      // sam nick Discorda nie ma adresu: kapsuła kopiuje nick
      a = btn('pf-kaps', null, opis + '. Kliknij, żeby skopiować nick');
      a.addEventListener('click', function () { kopiuj(l.pokaz, 'Skopiowano nick Discorda: ' + l.pokaz + '.'); });
    }
    a.append(znak(s), tekst);
    if (l.potwierdzony) a.appendChild(svgSpan('pf-pot', ik('ok')));
    return a;
  }
  function kartaRangi(z) {
    var r = z.ranga, k = el('section', 'pf-karta pf-ranga'); k.setAttribute('aria-label', 'Ranga cybersory');
    var top = el('div', 'pf-ranga__top');
    var g = svgSpan('pf-godlo', CS.svgGodla(r.nr, 'krew')); g.removeAttribute('aria-hidden'); g.setAttribute('role', 'img'); g.setAttribute('aria-label', 'Godło rangi ' + r.nazwa);
    var n = el('div', 'pf-ranga__n');
    var eb = el('span', 'pf-eyebrow', 'Ranga cybersory · R' + r.nr + ' z ' + CS.rangi.length);
    n.append(eb, el('b', null, r.nazwa));
    top.append(g, n, el('span', 'pf-xp', liczba(z.suma) + ' XP'));
    var tor = el('div', 'pf-tor'); tor.setAttribute('role', 'progressbar'); tor.setAttribute('aria-valuemin', '0'); tor.setAttribute('aria-valuemax', '100');
    tor.setAttribute('aria-valuenow', String(Math.round(r.proc)));
    tor.setAttribute('aria-label', r.nast ? 'Postęp do rangi ' + r.nast.pl : 'Najwyższa ranga');
    var pas = el('i'); pas.style.width = r.proc.toFixed(1) + '%'; tor.appendChild(pas);
    // P1.1: „Skąd XP?” zwinięte pod paskiem, sama lista (karta, zasada 11: bez akapitów objaśniających)
    var sk = el('details', 'pf-skad');
    sk.appendChild(el('summary', null, 'Skąd XP?'));
    var ul = el('ul', 'pf-skad__l');
    [[nazwaZrodla('czytnik'), z.podzial.czytnik], ['Odznaki strony', z.podzial.strona], [nazwaZrodla('dancy'), z.podzial.dancy]].forEach(function (w) {
      var li = el('li'); li.append(el('span', null, w[0]), el('b', null, liczba(w[1]) + ' XP')); ul.appendChild(li);
    });
    var su = el('li', 'pf-skad__suma'); su.append(el('span', null, 'Suma'), el('b', null, liczba(z.suma) + ' XP')); ul.appendChild(su);
    sk.appendChild(ul);
    var dr = el('ol', 'pf-drabina'); dr.setAttribute('aria-label', 'Rangi cybersory');
    CS.rangi.forEach(function (x, j) {
      var li = el('li', j + 1 === r.nr ? 'pf-teraz' : j + 1 < r.nr ? 'pf-jest' : '');
      // 15.11 (maisa: „okropnie wyglądają”): w małym chipie sam znak rangi, bez kafla i kropek, kadr na znak
      var zn = svgSpan('pf-dr__zn', CS.svgGodla(j + 1, j + 1 > r.nr ? 'zab' : j + 1 === r.nr ? 'krew' : ''));
      var zs = zn.querySelector('svg'); if (zs) zs.setAttribute('viewBox', '18 14 86 66');
      li.appendChild(zn);
      li.appendChild(D.createTextNode(x.pl));
      if (j + 1 === r.nr) li.setAttribute('aria-current', 'step');
      li.title = x.pl + ' · od ' + liczba(x.xp) + ' XP';
      dr.appendChild(li);
    });
    k.append(top, tor, el('span', 'pf-meta', r.nast ? 'brakuje ' + liczba(r.nast.xp - z.suma) + ' XP do rangi ' + r.nast.pl : 'najwyższa ranga'), sk, dr);
    return k;
  }

  /* P1.1: link do profilu. Publiczny = „Kopiuj link”. Prywatny = „Udostępnij” w dwóch krokach (wzór „Na pewno odłączyć?” z K1):
     1. klik → „Upublicznij i skopiuj link” + „Anuluj”, nic się jeszcze nie zmienia; 2. klik → profil publiczny + link w schowku. */
  function przyciskiLinku(box, pub, nick) {
    box.textContent = '';
    if (pub) {
      var kl = btn('kn-btn kn-btn--g', 'Kopiuj link');
      kl.addEventListener('click', function () { kopiuj(adresProfilu(nick), 'Link do profilu skopiowany.'); });
      box.appendChild(kl);
      return;
    }
    var ud = btn('kn-btn kn-btn--g', 'Udostępnij');
    ud.setAttribute('aria-label', 'Udostępnij profil: najpierw trzeba go upublicznić');
    ud.addEventListener('click', function () {
      box.textContent = '';
      var tak = btn('kn-btn kn-btn--p', 'Upublicznij i skopiuj link');
      var nie = btn('kn-btn kn-btn--g', 'Anuluj');
      nie.addEventListener('click', function () { przyciskiLinku(box, false, nick); var u = box.querySelector('button'); if (u) u.focus(); });
      tak.addEventListener('click', function () {
        tak.disabled = true; nie.disabled = true;
        var link = adresProfilu(nick);
        api.widocznoscOsiagniec(true).then(function (d) {
          var k = konto(); if (k) k.ustaw(d);
          (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(
            function () { powiedz('Profil jest publiczny. Link skopiowany.'); },
            function () { powiedz('Profil jest publiczny. Adres: ' + link); });
        }, function (e) { tak.disabled = false; nie.disabled = false; powiedz(e.message, true); });
      });
      box.append(tak, nie);
      tak.focus();
    });
    box.appendChild(ud);
  }
  function doUstawien() { zamknij(); var k = konto(); if (k) k.otworz('profil'); }

  var filtr = 'wszystkie';
  function rysujProfil(cel, d, o) {
    // o: { wlasny, podglad, ava }; wl = widok właściciela (bez podglądu); podgląd = dokładnie to, co dostaje gość
    cel.textContent = '';
    var z = zbierz(d), wl = o.wlasny && !o.podglad;
    var wrap = el('div', 'pf');

    if (o.podglad) {
      // P1.1: prawdziwy tryb podglądu, pasek trybu na górze
      var tr = el('div', 'pf-tryb');
      var kz = btn('kn-btn kn-btn--g', 'Zakończ podgląd');
      kz.addEventListener('click', function () { przelaczPodglad(false); });
      tr.append(el('span', 'pf-tryb__t', 'PODGLĄD JAKO GOŚĆ'), kz);
      wrap.appendChild(tr);
      if (!d.publiczny) {
        var bn = el('p', 'pf-baner');
        bn.appendChild(svgSpan(null, ik('lock')));
        bn.appendChild(D.createTextNode('Profil jest prywatny: inni widzą tylko „Ten profil jest prywatny”. Tak będzie wyglądał po włączeniu.'));
        wrap.appendChild(bn);
      }
    }

    // pasek: tylko adres i widoczność (zamknij stoi w rogu okna)
    var pasek = el('div', 'pf-pasek');
    pasek.appendChild(el('span', 'pf-adres', 'cybersora.pl/u/' + d.nick));
    var chip = el('span', 'pf-chip' + (d.publiczny ? ' pf-chip--pub' : ''));
    chip.appendChild(svgSpan(null, ik(d.publiczny ? 'ok' : 'lock')));
    chip.appendChild(D.createTextNode(d.publiczny ? 'publiczny' : (wl ? 'prywatny · widzisz tylko ty' : 'prywatny')));
    pasek.appendChild(chip);
    wrap.appendChild(pasek);

    // wizytówka
    var wiz = el('header', 'pf-wiz');
    var av = el('img', 'pf-wiz__av'); av.src = o.ava || kotUrl(d.kot, 256); av.alt = 'Awatar: ' + (o.ava ? 'zdjęcie' : 'kot cybersory'); av.width = 104; av.height = 104; av.decoding = 'async';
    var tx = el('div', 'pf-wiz__tx');
    var h = el('h2', null, d.nick); h.id = 'pfNick'; h.tabIndex = -1;
    tx.appendChild(h);
    if (d.bio) tx.appendChild(el('p', 'pf-bio', d.bio));
    else if (wl) tx.appendChild(el('p', 'pf-bio pf-bio--pusto', 'Bez opisu. Dodasz go w ustawieniach profilu.'));
    var od = Date.parse(d.od);
    tx.appendChild(el('span', 'pf-meta', 'w cybersorze od ' + data(od) + ' · ' + z.programow + ' ' + (z.programow === 1 ? 'program' : z.programow >= 2 && z.programow <= 4 ? 'programy' : 'programów')));
    var ln = el('div', 'pf-linki');
    api.walidacja.serwisy.forEach(function (s) { var l = d.linki && d.linki[s]; if (l) ln.appendChild(kapsula(s, l)); });
    if (ln.children.length) { ln.setAttribute('role', 'list'); Array.prototype.forEach.call(ln.children, function (c) { c.setAttribute('role', 'listitem'); }); tx.appendChild(ln); }
    wiz.append(av, tx);
    wrap.appendChild(wiz);

    // akcje jednym rzędem pod wizytówką (P1.1): właściciel Podgląd · Edytuj · Udostępnij/Kopiuj link; gość tylko link
    var akcje = el('div', 'pf-akcje');
    if (wl) {
      var pg = btn('kn-btn kn-btn--g', 'Podgląd'); pg.setAttribute('aria-label', 'Podgląd: jak widzą mnie inni');
      pg.addEventListener('click', function () { przelaczPodglad(true); });
      var ed = btn('kn-btn kn-btn--g', 'Edytuj'); ed.setAttribute('aria-label', 'Edytuj profil');
      ed.addEventListener('click', doUstawien);
      akcje.append(pg, ed);
    }
    if (wl || d.publiczny) { var lb = el('span', 'pf-akcje__link'); przyciskiLinku(lb, !!d.publiczny, d.nick); akcje.appendChild(lb); }
    if (akcje.children.length) wrap.appendChild(akcje);

    wrap.appendChild(kartaRangi(z));

    // gablota: wybrane przez właściciela, tylko zdobyte
    var gab = (d.gablota || []).filter(function (k) { return z.mapa[k] && z.mapa[k].ms; });
    if (gab.length || wl) {
      var kg = el('section', 'pf-karta'); kg.setAttribute('aria-labelledby', 'pfGabH');
      var hg = el('div', 'pf-glowa-s');
      var hgt = el('h3', 'pf-eyebrow', 'Gablota · ' + gab.length + ' z 5'); hgt.id = 'pfGabH';
      hg.appendChild(hgt);
      if (wl && gab.length >= 5) {
        var wyb = btn('kn-btn kn-btn--g pf-mala', 'Wybierz odznaki');
        wyb.addEventListener('click', doUstawien);
        hg.appendChild(wyb);
      }
      kg.appendChild(hg);
      var ug = el('ul', 'pf-gablota'); ug.setAttribute('aria-labelledby', 'pfGabH');
      gab.forEach(function (k) { ug.appendChild(odznaka(z.mapa[k])); });
      if (wl && gab.length < 5) {
        // jeden kafel zamiast pustych przerywanych miejsc (P1.1)
        var dl = el('li', 'pf-dodaj-li');
        var db = btn('pf-dodaj', null); db.append(svgSpan('pf-dodaj__plus', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>'), el('span', null, 'Dodaj do gabloty'));
        db.addEventListener('click', doUstawien);
        dl.appendChild(db); ug.appendChild(dl);
      }
      kg.appendChild(ug);
      wrap.appendChild(kg);
    }

    // „Zdobyte · N”: od najnowszej, filtr tylko po źródle z licznikami
    var zdob = z.lista.filter(function (x) { return x.ms; }).sort(function (a, b) { return b.ms - a.ms; });
    if (zdob.length || wl) {
      var ks = el('section', 'pf-karta'); ks.setAttribute('aria-labelledby', 'pfOdzH');
      var hs = el('div', 'pf-glowa-s');
      var hst = el('h3', 'pf-eyebrow', 'Zdobyte · ' + zdob.length); hst.id = 'pfOdzH';
      hs.appendChild(hst);
      var zr = ZRODLA.map(function (f) { return [f[0], f[1], zdob.filter(function (x) { return x.zr === f[0]; }).length]; }).filter(function (f) { return f[2] > 0; });
      if (!zr.some(function (f) { return f[0] === filtr; })) filtr = 'wszystkie';
      var ul = el('ul', 'pf-siatka'); ul.setAttribute('aria-labelledby', 'pfOdzH');
      var rysujSiatke = function () {
        ul.textContent = '';
        var widac = zdob.filter(function (x) { return filtr === 'wszystkie' || x.zr === filtr; });
        if (!widac.length) { ul.appendChild(el('li', 'pf-odz-pusto', 'Jeszcze żadnej.')); return; }
        widac.forEach(function (x) { ul.appendChild(odznaka(x)); });
      };
      if (zr.length > 1) {
        // grupa radiowa: jeden przystanek Tab, strzałki zmieniają filtr
        var fl = el('div', 'pf-filtr'); fl.setAttribute('role', 'radiogroup'); fl.setAttribute('aria-label', 'Pokaż odznaki ze źródła');
        [['wszystkie', 'Wszystkie', zdob.length]].concat(zr).forEach(function (f) {
          var b = btn(null, f[1] + ' '); b.appendChild(el('span', 'pf-filtr__n', String(f[2])));
          b.dataset.f = f[0]; b.setAttribute('role', 'radio'); fl.appendChild(b);
        });
        var ustawFiltr = function (f, fokus) {
          filtr = f;
          Array.prototype.forEach.call(fl.children, function (x) { var on = x.dataset.f === f; x.setAttribute('aria-checked', String(on)); x.tabIndex = on ? 0 : -1; if (on && fokus) x.focus(); });
          rysujSiatke();
        };
        fl.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) ustawFiltr(b.dataset.f, true); });
        fl.addEventListener('keydown', function (e) {
          var t = Array.prototype.slice.call(fl.children), i = t.indexOf(D.activeElement);
          var n = /Right|Down/.test(e.key) ? i + 1 : /Left|Up/.test(e.key) ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? t.length - 1 : null;
          if (n === null || i < 0) return;
          e.preventDefault(); ustawFiltr(t[(n + t.length) % t.length].dataset.f, true);
        });
        hs.appendChild(fl);
        ustawFiltr(filtr, false);
      } else rysujSiatke();
      ks.append(hs, ul);
      wrap.appendChild(ks);
    }

    // „Do zdobycia · N”: tylko właściciel, zwinięte, wiersze z warunkiem tekstem
    var brak = z.lista.filter(function (x) { return !x.ms; });
    if (wl && brak.length) {
      var dz = el('details', 'pf-karta pf-dozd');
      dz.appendChild(el('summary', 'pf-eyebrow', 'Do zdobycia · ' + brak.length));
      var ud = el('ul', 'pf-dozd__l'); ud.setAttribute('aria-label', 'Odznaki do zdobycia');
      brak.forEach(function (x) { ud.appendChild(wierszDoZdobycia(x)); });
      dz.appendChild(ud);
      wrap.appendChild(dz);
    }
    cel.appendChild(wrap);
  }
  function rysujStan(cel, typ, nick) {
    cel.textContent = '';
    var s = el('div', 'pf-stan');
    var im = el('img'); im.src = kotUrl('szary', 256); im.alt = ''; s.appendChild(im);
    var h = el('h2', null, typ === 'prywatny' ? 'Ten profil jest prywatny' : typ === 'blad' ? 'Nie udało się wczytać profilu' : 'Nie ma takiego profilu');
    h.id = 'pfNick'; h.tabIndex = -1; s.appendChild(h);
    if (nick && typ !== 'blad') s.appendChild(el('span', 'pf-meta', 'cybersora.pl/u/' + nick));
    // P1.1: wyjście z ekranu: „Wróć na stronę”, a zalogowany ma też skrót do swojego profilu
    var rz = el('div', 'pf-stan__akcje');
    var wr = btn('kn-btn kn-btn--g', 'Wróć na stronę'); wr.addEventListener('click', zamknij); rz.appendChild(wr);
    var ja = mojNick();
    if (ja && !toSamo(ja, nick)) { var mp = btn('kn-btn kn-btn--p', 'Mój profil'); mp.addEventListener('click', function () { otworz(ja); }); rz.appendChild(mp); }
    s.appendChild(rz);
    cel.appendChild(s);
  }

  /* ---------------- okno profilu i adres #u/<nick> ---------------- */
  var okno = null, wnetrze = null, otwarty = null, poprzedni = '', zrodloFokusu = null;
  function zbudujOkno() {
    if (okno) return;
    okno = el('dialog', 'kn-dlg kn-szklo kn-prof'); okno.setAttribute('aria-labelledby', 'pfNick');
    var w = el('div', 'kn-dlg__in');
    var x = btn('kn-btn kn-btn--g kn-btn--o kn-x', null, 'Zamknij profil');
    x.innerHTML = '<svg viewBox="0 0 24 24" class="kn-ico" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    x.addEventListener('click', zamknij);
    wnetrze = el('div');
    w.append(x, wnetrze); okno.appendChild(w);
    okno.addEventListener('click', function (e) { if (e.target === okno) zamknij(); });
    okno.addEventListener('close', function () {
      // „close” przychodzi asynchronicznie: gdy okno zdążyło się otworzyć na kolejnym profilu, spóźnione zdarzenie nic nie zeruje
      if (okno.open) return;
      otwarty = null;
      // adres wraca do tego sprzed profilu (replaceState: bez przeładowania widoku pod spodem)
      if (/^#u\//.test(location.hash)) { try { history.replaceState(history.state, '', location.pathname + location.search + (poprzedni || '')); } catch (e) { /* ok */ } }
      // P1.1: gdy element, z którego otwarto (np. pozycja menu), zniknął albo jest schowany, fokus wraca do przycisku konta
      var cel = zrodloFokusu && zrodloFokusu.isConnected && zrodloFokusu.getClientRects().length ? zrodloFokusu : D.getElementById('knAv');
      if (cel) cel.focus();
    });
    D.body.appendChild(okno);
  }
  function adresProfilu(nick) {
    return location.origin + location.pathname + '#u/' + encodeURIComponent(nick);
  }
  function otworz(nick, opcje) {
    nick = String(nick || '').trim().slice(0, 40);
    if (!nick) return;
    zbudujOkno();
    if (!okno.open) {
      zrodloFokusu = D.activeElement;
      if (!/^#u\//.test(location.hash)) poprzedni = location.hash;
    }
    otwarty = { nick: nick, podglad: !!(opcje && opcje.podglad) };
    var cel = '#u/' + encodeURIComponent(nick);
    if (location.hash !== cel) { try { history.replaceState(history.state, '', location.pathname + location.search + cel); } catch (e) { /* ok */ } }
    wnetrze.textContent = ''; wnetrze.appendChild(el('div', 'kn-ladowanie', 'Wczytuję profil…'));
    if (!okno.open) okno.showModal();
    wczytaj();
  }
  function wczytaj() {
    var o = otwarty; if (!o) return;
    var wlasny = toSamo(o.nick, mojNick());
    var p;
    if (wlasny && o.podglad) p = api.podgladProfilu().then(function (d) { return { d: d, opc: { wlasny: true, podglad: true } }; });
    else if (wlasny) {
      var k = konto(), st = k && k.stan ? k.stan() : null;
      p = (st ? Promise.resolve(st) : api.ja()).then(function (s) {
        var pr = s.profil;
        var d = { nick: pr.nick, od: pr.od, kot: pr.kot, bio: pr.bio, linki: pr.linki, gablota: pr.gablota, odznaki_cs: pr.odznaki_cs, publiczny: pr.publiczny, programy: s.programy || {} };
        return { d: d, opc: { wlasny: true, podglad: false, ava: pr.ava256 } };
      });
    } else p = api.profilPubliczny(o.nick).then(function (r) { return r.prywatny ? { stan: 'prywatny', nick: r.nick } : { d: r.profil, opc: {} }; });
    p.then(function (w) {
      if (otwarty !== o) return;
      okno.classList.toggle('kn-prof--stan', !!w.stan);   // P1.1: ekrany „prywatny”/„brak” w wąskim oknie z pełnym tłem
      if (w.stan) rysujStan(wnetrze, w.stan, w.nick); else rysujProfil(wnetrze, w.d, w.opc);
      var h = D.getElementById('pfNick'); if (h) h.focus({ preventScroll: true });
    }, function (e) {
      if (otwarty !== o) return;
      okno.classList.add('kn-prof--stan');
      rysujStan(wnetrze, e.kod === 'brak' ? 'brak' : 'blad', o.nick);
      var h = D.getElementById('pfNick'); if (h) h.focus();
    });
  }
  function przelaczPodglad(on) { if (otwarty) { otwarty.podglad = on; wczytaj(); } }
  function zamknij() { if (okno && okno.open) okno.close(); }
  function zAdresu() {
    var m = /^#u\/([^/?#]{1,120})$/.exec(location.hash);
    if (!m) { if (okno && okno.open) zamknij(); return; }
    var n; try { n = decodeURIComponent(m[1]); } catch (e) { return; }
    if (!otwarty || !toSamo(otwarty.nick, n)) otworz(n);
  }
  addEventListener('hashchange', zAdresu);
  // zmiany konta (logowanie, zapis profilu) odświeżają otwarty profil
  addEventListener('konto:zmiana', function () { if (okno && okno.open && otwarty) wczytaj(); });

  function kopiuj(t, ok) {
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { powiedz(ok); },
      function () { powiedz('Nie udało się skopiować. Adres: ' + t, true); });
  }

  /* ---------------- zakładka „Profil” w Moim koncie ---------------- */
  var szkic = null;   // niezapisane zmiany przeżywają przerysowanie okna konta
  function zeStanu(st) {
    var p = st.profil, l = {};
    api.walidacja.serwisy.forEach(function (s) { var x = p.linki && p.linki[s]; l[s] = x ? (x.url && x.typ !== 'nick' ? x.url : x.id) : ''; });
    return { nick: p.nick, bio: p.bio || '', linki: l, gablota: (p.gablota || []).slice() };
  }
  function ustawienia(panel, st) {
    if (!szkic || szkic.nick !== st.profil.nick) szkic = zeStanu(st);
    var p = st.profil, z = zbierz({ programy: st.programy, odznaki_cs: p.odznaki_cs });
    var box = el('div', 'pf-ust');

    // widoczność
    var kw = el('div', 'kn-karta');
    var sw = btn('kn-switch'); sw.setAttribute('role', 'switch'); sw.setAttribute('aria-checked', String(!!p.publiczny));
    sw.append(el('span', 'kn-switch__t', 'Widoczność profilu'), el('span', 'kn-switch__s kn-mono', p.publiczny ? 'PUBLICZNY' : 'PRYWATNY'), el('i'));
    sw.addEventListener('click', function () {
      var nowe = sw.getAttribute('aria-checked') !== 'true'; sw.disabled = true;
      api.widocznoscOsiagniec(nowe).then(function (d) {
        var k = konto(); if (k) k.ustaw(d);
        var x = panel.querySelector('.kn-switch'); if (x) x.focus();
        powiedz(nowe ? 'Profil jest publiczny.' : 'Profil jest prywatny. Widzisz go tylko Ty.');
      }, function (e) { sw.disabled = false; powiedz(e.message, true); });
    });
    var adr = el('span', 'kn-mono pf-adres', 'cybersora.pl/u/' + p.nick);
    var rz = el('div', 'kn-rzad');
    var ot = btn('kn-btn kn-btn--g', 'Otwórz profil'); ot.addEventListener('click', function () { otworz(p.nick); });
    var kp = el('span', 'pf-akcje__link'); przyciskiLinku(kp, !!p.publiczny, p.nick);
    rz.append(ot, kp);
    // P1.1: przełącznik działa od razu (to decyzja o prywatności, nie szkic), więc osobna karta ze znacznikiem „OD RAZU”
    var gw = el('div', 'pf-glowa-k'); gw.appendChild(el('span', 'pf-znacznik', 'OD RAZU'));   // etykieta „Widoczność profilu” niesie sam przełącznik
    kw.append(gw, sw, adr, rz);
    box.appendChild(kw);

    // o mnie
    var kb = el('div', 'kn-karta');
    var lb = el('label', 'kn-lab', 'O mnie'); lb.htmlFor = 'pfBio';
    var ta = el('textarea', 'kn-in pf-bio-in'); ta.id = 'pfBio'; ta.rows = 3; ta.maxLength = 200; ta.value = szkic.bio; ta.spellcheck = true;
    ta.setAttribute('aria-describedby', 'pfBioLicz pfBioBlad');
    var licz = el('span', 'pf-licznik'); licz.id = 'pfBioLicz';
    var bb = el('p', 'kn-blad'); bb.id = 'pfBioBlad'; bb.setAttribute('role', 'alert');
    function liczBio() { var n = Array.from(ta.value).length; licz.textContent = n + ' / 160'; licz.classList.toggle('pf-licznik--za', n > 160); }
    ta.addEventListener('input', function () { szkic.bio = ta.value; liczBio(); ta.removeAttribute('aria-invalid'); bb.textContent = ''; });
    liczBio();
    kb.append(lb, ta, licz, bb);
    box.appendChild(kb);

    // linki (oprawa 3: wiersz)
    var kl = el('div', 'kn-karta');
    kl.appendChild(el('span', 'kn-lab', 'Linki'));
    var ws = el('div', 'pf-wiersze'), pola = {};
    var PODP = { github: 'github.com/nazwa', linkedin: 'linkedin.com/in/nazwa', discord: 'nick albo discord.com/users/ID' };
    api.walidacja.serwisy.forEach(function (s) {
      var w = el('div', 'pf-wiersz');
      var kwk = el('span', 'pf-wiersz__kw'); kwk.appendChild(znak(s));
      var t = el('div', 'pf-wiersz__t');
      var l = el('label', null, NAZWY[s]); l.htmlFor = 'pfL-' + s;
      var i = el('input', 'kn-in'); i.id = 'pfL-' + s; i.type = 'text'; i.inputMode = 'url'; i.autocomplete = 'off'; i.spellcheck = false;
      i.setAttribute('autocapitalize', 'off'); i.maxLength = 200; i.placeholder = PODP[s]; i.value = szkic.linki[s] || '';
      var bl = el('p', 'kn-blad'); bl.id = 'pfL-' + s + '-b'; bl.setAttribute('role', 'alert');
      i.setAttribute('aria-describedby', bl.id);
      i.addEventListener('input', function () { szkic.linki[s] = i.value; i.removeAttribute('aria-invalid'); bl.textContent = ''; });
      t.append(l, i);
      var po = el('div', 'pf-wiersz__po');
      var zap = p.linki && p.linki[s];
      if (zap && zap.potwierdzony) { var c = el('span', 'pf-potw'); c.appendChild(svgSpan(null, ik('ok'))); c.appendChild(D.createTextNode('potwierdzone')); po.appendChild(c); }
      else if (zap && s !== 'linkedin' && api.tryb === 'artefakt') {
        var pb = btn('kn-btn kn-btn--g', 'Potwierdź przez ' + NAZWY[s], 'Potwierdź przez ' + NAZWY[s] + ' (w artefakcie bez prawdziwego logowania)');
        pb.appendChild(el('span', 'pf-znacznik', 'ARTEFAKT'));   // tylko tryb artefakt: ekran zgody dostawcy to atrapa
        // krok 2: potwierdzenie = połączenie konta przez GitHub/Discord (to samo co w Ustawieniach → Sposoby logowania)
        pb.addEventListener('click', function () { var k = konto(); if (k && k.polaczOAuth) k.polaczOAuth(s); });
        po.appendChild(pb);
      }
      w.append(kwk, t, po, bl);
      ws.appendChild(w);
      pola[s] = { i: i, b: bl };
    });
    kl.appendChild(ws);
    box.appendChild(kl);

    // gablota
    var kg = el('div', 'kn-karta');
    var zdob = z.lista.filter(function (x) { return x.ms; });
    szkic.gablota = szkic.gablota.filter(function (k) { return z.mapa[k] && z.mapa[k].ms; });
    var lg = el('span', 'kn-lab'); kg.appendChild(lg);
    var wb = el('div', 'pf-wybor'); wb.setAttribute('role', 'group'); wb.setAttribute('aria-label', 'Odznaki w gablocie, najwyżej 5');
    function rysujWybor() {
      wb.textContent = '';
      lg.textContent = 'Gablota · ' + szkic.gablota.length + ' z 5';
      if (!zdob.length) { wb.appendChild(el('span', 'kn-pod', 'Jeszcze nic do pokazania.')); return; }
      zdob.forEach(function (x) {
        var poz = szkic.gablota.indexOf(x.klucz), on = poz >= 0;
        var b = btn(null, null); b.setAttribute('aria-pressed', String(on)); b.dataset.k = x.klucz;
        b.append(svgSpan(null, ik(x.ikona)), D.createTextNode(x.nazwa));
        // P1.1: wybrana = czerwonawy kafel jak na profilu + numer miejsca w gablocie (kolejność wyboru)
        if (on) { var nr = el('b', 'pf-nr', String(poz + 1)); nr.setAttribute('aria-hidden', 'true'); b.appendChild(nr); b.setAttribute('aria-label', x.nazwa + ', miejsce ' + (poz + 1) + ' w gablocie'); }
        b.disabled = !on && szkic.gablota.length >= 5;
        b.addEventListener('click', function () {
          var i = szkic.gablota.indexOf(x.klucz);
          if (i >= 0) szkic.gablota.splice(i, 1); else if (szkic.gablota.length < 5) szkic.gablota.push(x.klucz);
          rysujWybor();
          var nb = Array.prototype.filter.call(wb.children, function (c) { return c.dataset.k === x.klucz; })[0]; if (nb) nb.focus();
        });
        wb.appendChild(b);
      });
    }
    rysujWybor();
    kg.appendChild(wb);
    box.appendChild(kg);

    // zapis
    var bar = el('div', 'pf-zapis');
    var zp = btn('kn-btn kn-btn--p', 'Zapisz profil');
    var zb = el('p', 'kn-blad'); zb.setAttribute('role', 'alert');
    zp.addEventListener('click', function () {
      zb.textContent = '';
      var wbio = api.walidacja.bio(ta.value), zly = null;
      if (!wbio.ok) { bb.textContent = wbio.blad; ta.setAttribute('aria-invalid', 'true'); zly = zly || ta; }
      api.walidacja.serwisy.forEach(function (s) {
        var w = api.walidacja.link(s, pola[s].i.value);
        // P1.1: wpisana wartość w komunikacie (na 375 pole ucina długi adres, a błąd ma pokazać, co poszło)
        if (!w.ok) { pola[s].b.textContent = '„' + skrot(pola[s].i.value.trim(), 64) + '”: ' + w.blad; pola[s].i.setAttribute('aria-invalid', 'true'); zly = zly || pola[s].i; }
      });
      if (zly) { zly.focus(); zb.textContent = 'Popraw zaznaczone pola.'; return; }
      var linki = {}; api.walidacja.serwisy.forEach(function (s) { linki[s] = pola[s].i.value; });
      zp.disabled = true; zp.textContent = 'Zapisuję…';
      api.zapiszProfil({ bio: ta.value, linki: linki, gablota: szkic.gablota.slice() }).then(function (d) {
        szkic = null;
        var k = konto(); if (k) k.ustaw(d);
        powiedz('Profil zapisany.');
      }, function (e) {
        zp.disabled = false; zp.textContent = 'Zapisz profil';
        var cel = e.pole === 'bio' ? { i: ta, b: bb } : pola[e.pole];
        if (cel) { cel.b.textContent = e.message; cel.i.setAttribute('aria-invalid', 'true'); cel.i.focus(); }
        zb.textContent = e.message;
        if (!cel) powiedz(e.message, true);   // błąd bez pola (np. limit zmian) zastępuje stary „Profil zapisany”
      });
    });
    bar.append(zp, zb);
    box.appendChild(bar);

    // obrazek do udostępniania (szkic OG 1200×630)
    var ko = el('div', 'kn-karta');
    ko.appendChild(el('span', 'kn-lab', 'Obrazek do udostępniania · 1200 × 630'));
    var cv = el('canvas', 'pf-og'); cv.width = 1200; cv.height = 630;
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Podgląd obrazka do udostępniania: ' + p.nick + ', ranga ' + z.ranga.nazwa);
    var pob = el('a', 'kn-btn kn-btn--g', 'Pobierz PNG'); pob.href = '#'; pob.download = 'profil-' + p.nick.replace(/[^A-Za-z0-9_.-]/g, '_') + '-og.png';
    pob.setAttribute('aria-disabled', 'true');
    pob.addEventListener('click', function (e) { if (pob.getAttribute('aria-disabled') === 'true') e.preventDefault(); });
    var rp = el('div', 'kn-rzad'); rp.appendChild(pob);
    ko.append(cv, rp);
    box.appendChild(ko);
    // P1.1: do 5 odznak z gabloty; pusta gablota = 5 najnowszych zdobytych
    var naOG = (p.gablota || []).map(function (k) { return z.mapa[k]; }).filter(function (x) { return x && x.ms; });
    if (!naOG.length) naOG = z.lista.filter(function (x) { return x.ms; }).sort(function (a, b) { return b.ms - a.ms; });
    rysujOG(cv, { nick: p.nick, kot: p.kot, gablota: naOG.slice(0, 5), z: z }).then(function () {
      try { pob.href = cv.toDataURL('image/png'); pob.removeAttribute('aria-disabled'); } catch (e) { /* zablokowane płótno */ }
    }, function () { /* bez podglądu */ });

    panel.appendChild(box);
  }

  /* ---------------- szkic OG image: 1200×630, paleta zamknięta, logotyp „cyber” białe + „sora” czerwone ---------------- */
  var CSS_GODLA = '.cg-t{fill:var(--cg-t)}.cg-h{fill:none;stroke:var(--cg-h);stroke-width:2}.cg-k{fill:var(--cg-k)}.cg-ks{stroke:var(--cg-k)}.cg-a{fill:var(--cg-a)}.cg-on{fill:var(--cg-on)}.cg-off{fill:var(--cg-off)}' +
    'svg{--cg-t:#e11d33;--cg-k:#f6f2f3;--cg-a:#0e0e12;--cg-on:#f6f2f3;--cg-off:rgba(14,14,18,.32);--cg-h:rgba(14,14,18,.4)}';
  function obraz(src) {
    return new Promise(function (ok, nie) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = nie; i.src = src; });
  }
  function svgUrl(svg, css, kolor) {
    var s = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" ' + (kolor ? 'color="' + kolor + '" ' : ''));
    if (css) s = s.replace(/(<svg[^>]*>)/, '$1<style>' + css + '</style>');
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  }
  function zaokr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function rysujOG(cv, o) {
    var g = cv.getContext('2d'), r = o.z.ranga;
    var fonty = D.fonts && D.fonts.load ? Promise.all([D.fonts.load('700 72px Sora'), D.fonts.load('500 24px "Geist Mono"')]).catch(function () {}) : Promise.resolve();
    var obrazy = [obraz(kotUrl(o.kot, 256)), obraz(svgUrl(CS.svgGodla(r.nr, 'krew'), CSS_GODLA))]
      .concat(o.gablota.slice(0, 5).map(function (x) { return obraz(svgUrl(ik(x.ikona), '', '#ff3a52')); }));
    return Promise.all([fonty, Promise.all(obrazy)]).then(function (w) {
      var im = w[1];
      g.fillStyle = '#0e0e12'; g.fillRect(0, 0, 1200, 630);
      zaokr(g, 40, 40, 1120, 550, 32); g.fillStyle = '#17171d'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#2c2c36'; g.stroke();
      // kot w kole
      g.save(); g.beginPath(); g.arc(200, 230, 110, 0, Math.PI * 2); g.clip(); g.drawImage(im[0], 90, 120, 220, 220); g.restore();
      // nick
      g.fillStyle = '#f6f2f3'; g.font = '700 68px Sora, system-ui, sans-serif'; g.textBaseline = 'alphabetic';
      var nick = o.nick; while (g.measureText(nick).width > 760 && nick.length > 4) nick = nick.slice(0, -2) + '…';
      g.fillText(nick, 360, 190);
      // ranga
      g.drawImage(im[1], 360, 222, 112, 112);
      g.fillStyle = 'rgba(246,242,243,.68)'; g.font = '500 22px "Geist Mono", ui-monospace, monospace';
      g.fillText('RANGA CYBERSORY · R' + r.nr + ' Z ' + CS.rangi.length, 496, 258);
      g.fillStyle = '#f6f2f3'; g.font = '700 46px Sora, system-ui, sans-serif'; g.fillText(r.nazwa, 496, 310);
      g.fillStyle = 'rgba(246,242,243,.86)'; g.font = '500 24px "Geist Mono", ui-monospace, monospace';
      g.fillText(liczba(o.z.suma) + ' XP', 360, 384);
      zaokr(g, 360, 400, 560, 10, 5); g.fillStyle = '#0e0e12'; g.fill();
      if (r.proc > 0) { zaokr(g, 360, 400, Math.max(10, 560 * r.proc / 100), 10, 5); g.fillStyle = '#e11d33'; g.fill(); }
      // gablota: do 5 odznak rzędem pod paskiem XP, bez podpisów (P1.1)
      o.gablota.slice(0, 5).forEach(function (x, i) {
        var X = 360 + i * 104, Y = 426;
        zaokr(g, X, Y, 88, 88, 20); g.fillStyle = '#1e1e26'; g.fill();
        zaokr(g, X + 14, Y + 14, 60, 60, 14); g.fillStyle = 'rgba(225,29,51,.18)'; g.fill();
        g.drawImage(im[2 + i], X + 26, Y + 26, 36, 36);
      });
      // logotyp i adres
      g.textAlign = 'right';
      g.font = '500 22px "Geist Mono", ui-monospace, monospace'; g.fillStyle = 'rgba(246,242,243,.68)';
      g.fillText('cybersora.pl/u/' + o.nick, 1100, 540);
      g.font = '700 40px Sora, system-ui, sans-serif';
      var wSora = g.measureText('sora').width;
      g.fillStyle = '#e11d33'; g.fillText('sora', 1100, 494);
      g.fillStyle = '#f6f2f3'; g.fillText('cyber', 1100 - wSora, 494);
      g.textAlign = 'left';
    });
  }

  window.ProfilCS = { otworz: otworz, zamknij: zamknij, ustawienia: ustawienia, zbierz: zbierz, znak: znak };
  function start() { zAdresu(); }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})();
