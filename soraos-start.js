/* soraos-start.js — wpięcie komputera SORA//OS na stronie /soraos/ (24.11.2026: wyniesione z app.js, gdy SORA//OS zeszło z menu).
   Treść to lista [data-soraos-tresc] w HTML; moduł soraos.js buduje nad nią pulpit. Gra DancyCloud (dancycloud.js)
   i ranking (ranking.js) pobierają się dopiero po uruchomieniu gry. Brak modułu = zostaje nagłówek strony z linkami.
   Konto cybersory (ukryta beta): pliki konta ładują się TYLKO po wejściu z ?beta albo przy zapisanej sesji. Zwykły gość ich nie pobiera. */
(() => {
  'use strict';
  const V = '20261124a';
  const root = document.querySelector('[data-view="soraos"]');
  const miejsce = root && root.querySelector('[data-soraos-miejsce]');
  const tresc = miejsce && miejsce.querySelector('[data-soraos-tresc]');
  if (!root || !tresc) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function zasob(tag, attrs) {
    return new Promise((ok, zle) => {
      const el = document.createElement(tag);
      Object.assign(el, attrs);
      el.onload = () => ok(el); el.onerror = () => { el.remove(); zle(new Error(attrs.src || attrs.href)); };
      document.head.appendChild(el);
    });
  }
  const json = (url) => fetch(url, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

  /* ---------- konto (ukryta beta) ---------- */
  (function konto() {
    let wBecie = false;
    try {
      const q = /[?&]beta(?:=([^&#]*))?(?:[&#]|$)/.exec(location.search);
      if (q) { if (q[1] === '0') localStorage.removeItem('cybersora.beta'); else localStorage.setItem('cybersora.beta', '1'); }
      wBecie = localStorage.getItem('cybersora.beta') === '1' || !!localStorage.getItem('cybersora.konto.sesja');
    } catch (e) { /* brak dostępu do pamięci przeglądarki: konto zostaje wyłączone */ }
    if (!wBecie) return;
    const kv = '?v=20261115u';
    zasob('link', { rel: 'stylesheet', href: '/konto.css' + kv });
    zasob('link', { rel: 'stylesheet', href: '/profil.css' + kv });
    // kolejność ma znaczenie: słownik i reguły przed API, API przed interfejsem
    const po = (src, typ) => () => zasob('script', Object.assign({ src: src + kv, async: false }, typ ? { type: typ } : {}));
    po('/programy-slownik.js')()
      .then(po('/vendor/simplewebauthn-browser-14.0.0.umd.min.js'))
      .then(po('/konto-reguly.js', 'module'))
      .then(po('/konto-api.js')).then(po('/konto.js')).then(po('/profil.js'))
      .catch(() => { /* konto jest dodatkiem: bez niego pulpit i gra działają */ });
  })();

  /* ---------- ranking DancyCloud (nick + hasło na Workerze). Do testów lokalnych ?dcapi=http://127.0.0.1:8787 ---------- */
  const DC_API = (() => {
    try {
      const p = new URLSearchParams(location.search).get('dcapi');
      if (p && /^http:\/\/(127\.0\.0\.1|localhost)(:\d{1,5})?$/.test(p)) return p;
    } catch (e) { /* zostaje domyślny */ }
    return 'https://dancycloud-ranking.dancycloud-ranking.workers.dev';
  })();
  function dcZRankingiem(DC) {
    if (!DC || !window.DancyRanking) return DC;
    return Object.assign({}, DC, {
      mount(el, o) {
        let gra = null, rk = null;
        try { rk = window.DancyRanking.create({ api: DC_API, el: document.createElement('div'), onRank: (r) => { if (gra && gra.showRank) gra.showRank(r); } }); } catch (e) { rk = null; }
        const koniec = (w) => {
          try { if (w) window.dispatchEvent(new CustomEvent('dancycloud:wynik', { detail: { score: w.score } })); } catch (e) { /* ok */ }
          return rk.onRunEnd(w);
        };
        gra = DC.mount(el, Object.assign({}, o, rk ? { rankingApi: DC_API, onRunStart: rk.onRunStart, onRunEnd: koniec } : {}));
        if (rk && gra && typeof gra.destroy === 'function') {
          const zniszcz = gra.destroy.bind(gra);
          gra.destroy = () => { try { rk.destroy(); } catch (e) { /* ok */ } return zniszcz(); };
        }
        return gra;
      },
    });
  }

  /* dostepnosc.json pokazujemy tylko świeży: brak daty albo starszy niż 14 dni = moduł nie pokazuje wolnych dni */
  function swieza(d) {
    if (!d || !d.aktualizowano) return null;
    const dni = (Date.now() - new Date(d.aktualizowano + 'T00:00:00').getTime()) / 864e5;
    return dni >= 0 && dni <= 14 ? d : null;
  }
  /* „Zamów” i linki z pulpitu prowadzą na zwykłe podstrony */
  const STRONY = { start: '/', oferta: '/oferta/', cennik: '/oferta/#cennik', marketplace: '/oferta/', products: '/projekty/', rnd: '/projekty/', somi: '/projekty/#meshuga', meshuga: '/projekty/#meshuga', onas: '/o-mnie/', contact: '/kontakt/', polityka: '/polityka/' };
  const idz = (widok) => { if (widok !== 'soraos') location.href = STRONY[widok] || '/'; };
  function zamow(usluga) {
    const li = usluga && tresc.querySelector('li[data-id="' + usluga + '"]');
    const temat = li && li.dataset.topic;
    location.href = '/kontakt/' + (temat ? '?temat=' + encodeURIComponent(temat) : '');
  }

  function kafelPulpit() {
    const wzor = root.querySelector('[data-a="otworz"][data-w="lab"]');
    if (!wzor || root.querySelector('[data-pulpit-kafel]')) return;
    const k = wzor.cloneNode(true);
    k.removeAttribute('data-w'); k.removeAttribute('data-a');
    k.setAttribute('data-pulpit-kafel', '');
    k.querySelector('svg').innerHTML = '<path d="M4 6h24v16H4z"></path><path d="M11 27h10M16 22v5"></path>';
    const licznik = k.querySelector('.sx-1u');
    if (licznik) licznik.remove();
    const t = k.querySelectorAll('span');
    if (t[0]) t[0].textContent = 'Pulpit';
    if (t[1]) t[1].textContent = 'Zamyka okna';
    const otwarte = () => [...root.querySelectorAll('.sx-e:not([hidden])')];
    const stan = () => k.setAttribute('aria-pressed', String(!otwarte().length));
    k.addEventListener('click', () => {
      const zamknij = (n) => {
        const wierzch = otwarte().find((o) => !o.dataset.depth);
        const x = wierzch && wierzch.querySelector('[data-a="zamknij"]');
        if (!x) return;
        x.click();
        if (n < 8) setTimeout(() => zamknij(n + 1), 30);
      };
      zamknij(0);
    });
    const pasek = wzor.parentNode;
    pasek.insertBefore(k, pasek.firstElementChild);
    new MutationObserver(stan).observe(root, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
    stan();
  }
  function laboratorium() {
    const lab = root.querySelector('[data-a="otworz"][data-w="lab"]');
    const proj = root.querySelector('[data-a="otworz"][data-w="projekty"]');
    if (!lab || !proj) return;
    proj.parentNode.insertBefore(lab, proj);
    proj.hidden = true;
    const pod = root.querySelector('.sx-14');
    if (pod) pod.textContent = pod.textContent.replace(/co zrobiliśmy/i, 'laboratorium');
  }
  function kafelGry() {
    const term = root.querySelector('[data-a="otworz"][data-w="terminal"]');
    if (!term || root.querySelector('[data-gra-kafel]')) return;
    const k = term.cloneNode(true);
    k.removeAttribute('data-w'); k.removeAttribute('data-a');
    k.setAttribute('data-gra-kafel', ''); k.setAttribute('aria-pressed', 'false');
    k.querySelector('svg').innerHTML = '<path d="M4 10h24v13H4z"></path><path d="M9 14v5M6.5 16.5h5M21 15h1M24 18h1"></path>';
    const t = k.querySelectorAll('span');
    t[0].textContent = 'Gry'; t[1].textContent = 'DancyCloud · jedno kliknięcie';
    k.addEventListener('click', () => {
      term.click();
      const start = (n) => {
        const o = root.querySelector('[data-a="opcja"][data-id="dancycloud"]');
        if (o) o.click(); else if (n < 10) setTimeout(() => start(n + 1), 60);
      };
      start(0);
    });
    term.parentNode.insertBefore(k, term.parentNode.firstElementChild);
    /* powiększanie gry: przycisk w oknie gry; pełny ekran = nakładka (+ Fullscreen API, jeśli wolno) */
    const ustaw = (box, b, on) => {
      box.classList.toggle('gra-pelny', on);
      document.documentElement.classList.toggle('gra-pelny-on', on);
      b.textContent = on ? 'Zmniejsz' : 'Powiększ';
      b.setAttribute('aria-label', on ? 'Zmniejsz grę' : 'Powiększ grę na cały ekran');
      window.dispatchEvent(new Event('resize'));
    };
    const wylacz = () => {
      const g = root.querySelector('.gra-pelny');
      const b = root.querySelector('[data-gra-powieksz]');
      if (g && b) ustaw(g, b, false);
      else if (g) { g.classList.remove('gra-pelny'); document.documentElement.classList.remove('gra-pelny-on'); }
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) wylacz(); });
    new MutationObserver(() => {
      const box = root.querySelector('[aria-label="DancyCloud"][role="region"]');
      if (!box) return;
      const stary = root.querySelector('[data-gra-powieksz]');
      if (stary && !box.contains(stary)) stary.remove();
      if (root.querySelector('[data-gra-powieksz]') || !box.querySelector('canvas, button')) return;
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('data-gra-powieksz', '');
      b.addEventListener('click', () => {
        const on = !box.classList.contains('gra-pelny');
        ustaw(box, b, on);
        if (on && box.requestFullscreen) box.requestFullscreen().catch(() => {});
        else if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
      });
      box.appendChild(b); ustaw(box, b, false);
    }).observe(root, { childList: true, subtree: true });
  }

  const v = '?v=' + V;
  let pomin = null;
  Promise.all([
    zasob('link', { rel: 'stylesheet', href: '/soraos.css' + v }),
    zasob('script', { src: '/soraos.js' + v, async: true }),
    zasob('link', { rel: 'stylesheet', href: '/soraos-pulpit.css' + v }).catch(() => null),
    zasob('script', { src: '/soraos-pulpit.js' + v, async: true }).catch(() => null),
    json('/dane/soraos.json'),
    json('/dane/dostepnosc.json'),
  ]).then(([, , , , dane, dost]) => {
    if (!window.SoraOS) return;
    const pulpit = window.SoraOSPulpit || null;
    if (pulpit) { try { window.SoraOS.registerApp(pulpit.laboratorium(idz)); } catch (e) { /* pulpit bez Laboratorium */ } }
    const os = window.SoraOS.mount(root, {
      tresc, dane, dostepnosc: swieza(dost),
      tlo: pulpit, bezOkna: true, tytul: 'Pulpit',
      onOrder: zamow,
      onNav: idz,
      loadGame: () => (window.DancyCloud && window.DancyRanking ? Promise.resolve(dcZRankingiem(window.DancyCloud))
        : Promise.all([
          window.DancyCloud ? null : zasob('script', { src: '/dancycloud.js' + v, async: true }),
          window.DancyRanking ? null : zasob('script', { src: '/ranking.js' + v, async: true }).catch(() => null),
        ]).then(() => dcZRankingiem(window.DancyCloud))),
      poziom: 'night',
      naglowek: 'B',
    });
    kafelGry(); laboratorium(); kafelPulpit();
    if (!os) return;
    pomin = () => { if (os.pomin) os.pomin(); };
    const pelne = !reduce && !matchMedia('(max-width:760px)').matches;
    Promise.resolve(os.wejdz({ pierwsze: pelne, opoznienie: 0 })).then(() => { pomin = null; });
  }).catch(() => { /* brak modułu: zostaje nagłówek strony */ });
  // animacja uruchamiania trwa ok. 1 s: Esc albo klik ją przeskakuje
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pomin) pomin(); }, true);
  document.addEventListener('pointerdown', () => { if (pomin) pomin(); }, true);
})();
