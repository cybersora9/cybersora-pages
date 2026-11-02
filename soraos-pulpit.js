/* SORA//OS — pulpit (02.11.2026, wybór maisy z makiety PTZu6hj2xtDpW7kiW6UE6n):
   - tapeta: znak C·S Blackwall + napis „cybersora”, glitch wariant D („jak logo Cyberpunka, po naszemu”),
   - okno „Laboratorium” zamiast kafla „Co zrobiliśmy” (treść czytana z widoku Sadzonek #rnd, bez kopii tekstów).
   Moduł soraos.js zostaje nietknięty: tapetę dostaje przez opcję `tlo` (tlo.tapeta(pulpit) → {destroy}),
   okno przez SoraOS.registerApp. Kolory tylko z palety marki; cyjan wyłącznie w rozszczepieniu (--th-split).
   Wydajność: jeden zegar (setTimeout), działa tylko gdy pulpit jest na ekranie, karta na wierzchu i żadne okno
   go nie zasłania; prefers-reduced-motion = logo nieruchome. */
(function (W, D) {
  'use strict';
  const C = { ink: '#0e0e12', krew: '#e11d33', hot: '#ff3a52', kosc: '#f6f2f3', split: 'rgba(80,220,255,.85)' };
  const NS = 'http://www.w3.org/2000/svg';
  // Pasy znaku Blackwall w spoczynku (kanon z cybersora-assets/logo/cs-blackwall.svg): [y, wysokość, przesunięcie, hot?]
  const BANDS = [[10, 9, 0, 0], [19, 8, 5, 0], [27, 7, -4, 1], [34, 10, 0, 0], [44, 8, 6, 0], [52, 7, -5, 0], [59, 9, 2, 1], [68, 8, -3, 0], [76, 12, 0, 0]];
  const WB = [[0, 30], [30, 20], [50, 22], [72, 30]];   // pasy napisu
  const BL = [C.krew, C.kosc, C.split, C.hot];          // bloki danych
  const R = (a, b) => a + Math.random() * (b - a);
  const RM = W.matchMedia ? W.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  let licznik = 0;

  function svgZnaku(p) {
    const clips = BANDS.map((b, i) => `<clipPath id="${p}b${i}"><rect x="-40" y="${b[0]}" width="214" height="${b[1]}"/></clipPath>`).join('')
      + WB.map((b, i) => `<clipPath id="${p}w${i}"><rect x="-40" y="${b[0]}" width="720" height="${b[1]}"/></clipPath>`).join('')
      + [0, 1, 2, 3].map((k) => `<clipPath id="${p}t${k}"><rect x="-400" y="0" width="1440" height="0"/></clipPath>`).join('');
    const pasy = BANDS.map((b, i) => `<g clip-path="url(#${p}b${i})" stroke="${b[3] ? C.hot : C.krew}" data-band transform="translate(${b[2]} 0)"><use href="#${p}mk"/></g>`).join('');
    const napis = WB.map((b, i) => `<g clip-path="url(#${p}w${i})" data-wband><use href="#${p}wm"/></g>`).join('');
    const duch = (x, c) => `<g class="sxp-duch" transform="translate(${x} 0)" stroke="${c}"><g transform="translate(213 0) scale(1.6)"><use href="#${p}mk"/></g><g transform="translate(140 196) scale(.57)"><use href="#${p}wm"/></g></g>`;
    return `<svg viewBox="0 0 640 300" aria-hidden="true" focusable="false"><defs>
<path id="${p}c" d="M52 10 H24 L10 24 V56 L24 70 H52"/><path id="${p}s" d="M50 10 H24 L12 22 V28 L24 40 H36 L48 52 V58 L36 70 H10"/>
<path id="${p}y" d="M8 10 L30 32 V70 M52 10 L30 32"/><path id="${p}bb" d="M14 10 V70 M14 10 H38 L50 22 V28 L40 38 H14 M40 38 L50 48 V58 L38 70 H14"/>
<path id="${p}e" d="M52 10 H14 V70 H52 M14 38 H44"/><path id="${p}r" d="M14 70 V10 H38 L50 22 V30 L40 40 H14 M36 40 L52 70"/>
<path id="${p}o" d="M24 10 H36 L50 24 V56 L36 70 H24 L10 56 V24 Z"/><path id="${p}a" d="M8 70 L26 10 H34 L52 70 M17 46 H43"/>
<g id="${p}mk" fill="none" stroke-linecap="butt" stroke-linejoin="miter" stroke-width="17"><use href="#${p}c" transform="translate(4 10) scale(1.05)"/><use href="#${p}s" transform="translate(66 10) scale(1.05)"/></g>
<g id="${p}wm" fill="none" stroke-linecap="butt" stroke-linejoin="miter" stroke-width="12"><use href="#${p}c"/><use href="#${p}y" x="70"/><use href="#${p}bb" x="140"/><use href="#${p}e" x="210"/><use href="#${p}r" x="280"/><use href="#${p}s" x="356"/><use href="#${p}o" x="426"/><use href="#${p}r" x="496"/><use href="#${p}a" x="566"/></g>
${clips}</defs>
${duch(-6, C.hot)}${duch(6, C.split)}
<g id="${p}comp" data-comp><g transform="translate(213 0) scale(1.6)">${pasy}</g><g transform="translate(140 196) scale(.57)" stroke="${C.kosc}">${napis}</g></g>
${[0, 1, 2, 3].map((k) => `<g data-tear style="display:none"><rect x="0" width="640" fill="${C.ink}"/><g clip-path="url(#${p}t${k})"><use href="#${p}comp"/></g></g>`).join('')}
${[0, 1, 2].map(() => '<rect data-block style="display:none"/>').join('')}</svg>`;
  }

  function tapeta(desk) {
    if (!desk) return null;
    const p = 'sxp' + (++licznik) + '-';
    const warstwa = D.createElement('div');
    warstwa.className = 'sxp';
    warstwa.innerHTML = svgZnaku(p);
    desk.insertBefore(warstwa, desk.firstChild);
    const svg = warstwa.firstElementChild;
    const q = (s) => [...svg.querySelectorAll(s)];
    const bands = q('[data-band]'), wbands = q('[data-wband]'), blocks = q('[data-block]');
    const comp = svg.querySelector('[data-comp]');
    const tears = q('[data-tear]').map((el, k) => ({ el, blank: el.firstElementChild, g: el.lastElementChild, clip: svg.querySelector(`#${p}t${k} rect`) }));
    const set = (g, dx) => g.setAttribute('transform', `translate(${dx.toFixed(1)} 0)`);

    function spokoj() {
      bands.forEach((g, i) => { set(g, BANDS[i][2]); g.setAttribute('stroke', BANDS[i][3] ? C.hot : C.krew); });
      wbands.forEach((g) => set(g, 0));
      svg.classList.remove('is-split', 'is-blink');
      tears.forEach((t) => { t.el.style.display = 'none'; });
      blocks.forEach((b) => { b.style.display = 'none'; });
      comp.removeAttribute('transform'); comp.removeAttribute('opacity');
    }
    function rozdarcie(n, max) {
      tears.slice(0, n).forEach((t) => {
        const y = R(8, 270), h = R(5, 30);
        t.clip.setAttribute('y', y); t.clip.setAttribute('height', h);
        t.blank.setAttribute('y', y); t.blank.setAttribute('height', h);
        set(t.g, R(.35, 1) * max * (Math.random() < .5 ? -1 : 1));
        t.el.style.display = '';
      });
    }
    function bloki(n) {
      blocks.slice(0, n).forEach((b) => {
        b.setAttribute('x', R(150, 470)); b.setAttribute('y', R(6, 284));
        b.setAttribute('width', R(14, 120)); b.setAttribute('height', R(3, 12));
        b.setAttribute('fill', BL[Math.random() * BL.length | 0]); b.style.display = '';
      });
    }

    let kroki = [];
    function zryw() {
      kroki.forEach(clearTimeout); kroki = [];
      const seq = [];
      // 1. drgnięcie
      seq.push([() => { comp.setAttribute('transform', `translate(${R(-5, 5).toFixed(1)} 0)`); svg.classList.add('is-split'); }, 60]);
      seq.push([spokoj, R(110, 200)]);
      // 2. rozdarcie: 5–7 klatek, w jednej logo znika (zostaje czerwony cień)
      const klatki = 5 + (Math.random() * 3 | 0), znika = 2 + (Math.random() * 2 | 0);
      for (let f = 0; f < klatki; f++) seq.push([() => {
        spokoj();
        rozdarcie(2 + (Math.random() * 3 | 0), 70);
        if (Math.random() < .7) bloki(1 + (Math.random() * 3 | 0));
        BANDS.forEach((b, i) => { if (Math.random() < .35) set(bands[i], b[2] + R(-14, 14)); });
        if (Math.random() < .4) bands[Math.random() * BANDS.length | 0].setAttribute('stroke', C.kosc);
        if (f === 1 || f === 3) set(wbands[Math.random() * WB.length | 0], R(-26, 26));
        svg.classList.toggle('is-split', f < klatki - 1);
        if (f === znika) { comp.setAttribute('opacity', '0'); tears.forEach((t) => { t.el.style.display = 'none'; }); svg.classList.remove('is-split'); svg.classList.add('is-blink'); }
      }, R(45, 85)]);
      // 3. dogasanie
      seq.push([spokoj, R(140, 260)]);
      seq.push([() => { rozdarcie(1, 24); svg.classList.add('is-split'); }, 55]);
      seq.push([spokoj, 0]);
      let t = 0;
      seq.forEach(([fn, ms]) => { kroki.push(setTimeout(fn, t)); t += ms; });
    }

    // Pętla: tylko gdy widać pulpit (widok SORA//OS na ekranie, karta na wierzchu, żadne okno nie zasłania)
    let zegar = 0, widac = false, dziala = false, zaslonieta = false;   // zaslonieta: moduł woła otwarte(bool)
    function tik() {
      if (!zaslonieta) zryw();
      zegar = setTimeout(tik, R(3500, 6500));
    }
    function przelicz() {
      const go = widac && !D.hidden && !RM.matches;
      if (go && !dziala) { dziala = true; zegar = setTimeout(tik, R(1200, 2400)); }
      else if (!go && dziala) { dziala = false; clearTimeout(zegar); kroki.forEach(clearTimeout); kroki = []; spokoj(); }
    }
    const io = W.IntersectionObserver ? new IntersectionObserver((e) => { widac = e[e.length - 1].isIntersecting; przelicz(); }) : null;
    if (io) io.observe(warstwa); else { widac = true; przelicz(); }
    D.addEventListener('visibilitychange', przelicz);
    if (RM.addEventListener) RM.addEventListener('change', przelicz);

    const api = {
      // interfejs tła modułu (jak tlo.js): okno na wierzchu = zryw wstrzymany, logo w spoczynku
      otwarte(on) { zaslonieta = !!on; if (zaslonieta) { kroki.forEach(clearTimeout); kroki = []; spokoj(); } },
      zryw: () => { if (!RM.matches) zryw(); },   // do testów i ręcznego podglądu
      destroy() {
        dziala = false; clearTimeout(zegar); kroki.forEach(clearTimeout);
        if (io) io.disconnect();
        D.removeEventListener('visibilitychange', przelicz);
        if (RM.removeEventListener) RM.removeEventListener('change', przelicz);
        warstwa.remove();
        if (ostatnia === api) ostatnia = null;
      },
    };
    ostatnia = api;
    return api;
  }
  let ostatnia = null;   // tapeta na pulpicie: rozruch kończy się jej zrywem

  /* Rozruch A „Rozruch z logiem” (02.11.2026, wybór maisy z makiety DRoBCrZ2gBSXLnjnCQVhke):
     kreska kineskopu → ekran rozwiera się z linii → log systemu z danymi z paska statusu → 24 bloki z procentami
     → pasy znaku C·S zjeżdżają z boków DOKŁADNIE na logo tapety → rozdarcie nakładki, pod nią ten sam znak.
     Hak modułu: tlo.boot(root, {h, top, d0}) → {el, anims, otwarcie, dur}. Moduł woła go przy pełnym wejściu
     i sam obsługuje „Pomiń”/Esc (anuluje anims, usuwa el). Pełny rozruch raz na sesję; potem null, więc moduł
     daje swoją krótką kreskę kineskopu. Ruch tylko w WAAPI; liczniki tekstu stają, gdy nakładki już nie ma. */
  const KLUCZ = 'soraos:rozruch';
  const pl = (n, a, b, c) => (n === 1 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c);
  const nf = (n) => n.toLocaleString('pl-PL').replace(/\s/g, ' ');
  const liczba = (el) => { const n = el ? parseInt(el.textContent.replace(/\D+/g, ''), 10) : NaN; return Number.isFinite(n) ? n : null; };
  const MALY_ZNAK = `<svg viewBox="0 0 134 92" aria-hidden="true"><g fill="none" stroke="${C.krew}" stroke-width="17" stroke-linejoin="miter"><path d="M52 10 H24 L10 24 V56 L24 70 H52" transform="translate(4 6) scale(1.05)"/><path d="M50 10 H24 L12 22 V28 L24 40 H36 L48 52 V58 L36 70 H10" transform="translate(66 6) scale(1.05)"/></g></svg>`;

  function boot(root, o) {
    if (!root || !o || D.hidden || RM.matches || !root.animate) return null;
    try { if (W.sessionStorage.getItem(KLUCZ)) return null; W.sessionStorage.setItem(KLUCZ, '1'); } catch (e) { /* bez pamięci sesji: pełny rozruch */ }
    const d0 = Math.max(0, +o.d0 || 0), h = Math.max(1, +o.h || root.clientHeight), top = Math.max(0, +o.top || 0);
    const at = (ms) => d0 + ms;

    // dane z pulpitu (te same liczby, które pokazuje pasek statusu i dock)
    const pasek = root.querySelector('.sx-24');
    const bs = pasek ? pasek.querySelectorAll('b') : [];
    const linie = liczba(bs[0]), tydzien = liczba(bs[1]);
    const uslugi = liczba(root.querySelector('[data-w="uslugi"]')), lab = liczba(root.querySelector('[data-w="lab"]'));
    const LOG = [['jądro cybersora', 'OK']];
    if (linie != null) LOG.push(['pamięć: <b data-licz>0</b> ' + pl(linie, 'linia', 'linie', 'linii') + ' naszego kodu', 'OK']);
    if (tydzien != null) LOG.push(['commity w 7 dni: <b>' + nf(tydzien) + '</b>', 'OK']);
    if (uslugi) LOG.push(['co zrobimy: <b>' + uslugi + '</b> ' + pl(uslugi, 'usługa', 'usługi', 'usług') + ' z ceną', 'OK']);
    if (lab) LOG.push(['laboratorium: <b>' + lab + '</b> ' + pl(lab, 'projekt', 'projekty', 'projektów') + ' w budowie', 'OK']);
    LOG.push(['gra DancyCloud', 'GOTOWA'], ['łącze: cybersora.pl', 'OK']);

    const el = D.createElement('div');
    el.className = 'sxb';
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = `top:${top}px;height:${h}px`;
    el.innerHTML = `<div class="sxb-crt"></div><div class="sxb-ekr">
<div class="sxb-log"><div class="sxb-hd">${MALY_ZNAK}SORA//OS 1.0 · rozruch</div>${LOG.map(([t, s]) => `<div class="sxb-ln"><span>${t}</span><em>[ ${s} ]</em></div>`).join('')}</div>
<div class="sxb-blk">${'<i></i>'.repeat(24)}<b>0%</b><small>ładowanie pulpitu</small></div></div>
<div class="sxb-znak">${svgZnaku('sxb' + (++licznik) + '-')}</div>`;
    root.appendChild(el);

    const $ = (s) => el.querySelector(s), $$ = (s) => [...el.querySelectorAll(s)];
    const crt = $('.sxb-crt'), ekr = $('.sxb-ekr'), blk = $('.sxb-blk'), proc = $('.sxb-blk b'), znak = $('.sxb-znak');
    const anims = [];
    const A = (e, kf, ms, opt = {}) => { const a = e.animate(kf, Object.assign({ duration: ms, fill: 'both' }, opt, { delay: at(opt.delay || 0) })); anims.push(a); return a; };
    const pojaw = (e, ms, zgas) => A(e, zgas == null ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0 }, { opacity: 1, offset: 0.001 }, { opacity: 1, offset: 0.999 }, { opacity: 0 }],
      zgas == null ? 1 : zgas - ms, { delay: ms });

    // znak nakładki leży dokładnie na logo tapety (ta sama skala), więc po rozdarciu nic nie skacze
    const rr = root.getBoundingClientRect(), tsvg = root.querySelector('.sxp svg'), t = tsvg && tsvg.getBoundingClientRect();
    const zsvg = znak.firstElementChild;
    if (t && t.width > 40) zsvg.style.cssText = `position:absolute;left:${t.left - rr.left}px;top:${t.top - rr.top - top}px;width:${t.width}px;height:${t.height}px;transform:none`;

    // 0–0,16 s kreska; 0,17–0,29 s ekran rozwiera się z kreski
    A(crt, [{ transform: 'translate(-50%,-50%) scaleX(0)', opacity: 1 }, { transform: 'translate(-50%,-50%) scaleX(1)', opacity: 1, offset: 0.8 }, { transform: 'translate(-50%,-50%) scaleX(1)', opacity: 0 }], 200, { easing: 'steps(5, end)' });
    A(ekr, [{ transform: 'scaleY(.004)', opacity: 0 }, { transform: 'scaleY(.004)', opacity: 1, offset: 0.01 }, { transform: 'none', opacity: 1 }], 120, { delay: 170, easing: 'steps(3, end)' });
    // log: nagłówek 0,32 s, linie co 0,12 s; całość znika przy składaniu znaku
    pojaw($('.sxb-hd'), 320, 2050);
    $$('.sxb-ln').forEach((ln, i) => pojaw(ln, 420 + i * 120, 2050));
    // bloki: 24 w ok. 0,7 s z krótką zadyszką po 16.
    const czas = (k) => 1300 + k * 26 + (k > 16 ? 90 : 0);
    pojaw(blk, 1300, 2050);
    $$('.sxb-blk i').forEach((b, k) => A(b, [{ backgroundColor: 'rgba(246,242,243,.12)' }, { backgroundColor: C.krew }], 1, { delay: czas(k + 1) }));

    // liczniki tekstu (linie i %) na zegarze; stają, gdy moduł zdjął nakładkę (pominięcie)
    const tik = (ms, fn) => setTimeout(() => { if (el.isConnected) fn(); }, at(ms));
    const licz = $('[data-licz]');
    if (licz) for (let k = 1; k <= 8; k++) tik(420 + 120 + k * 32, () => { licz.textContent = nf(Math.round(linie * k / 8)); });
    for (let k = 1; k <= 24; k++) tik(czas(k), () => { proc.textContent = Math.round(k / 24 * 100) + '%'; });

    // 2,05 s: pasy znaku zjeżdżają z boków w trzech skokach na swoje miejsce (kanon BANDS), napis tak samo
    pojaw(znak, 2050);
    const pasy = $$('.sxb-znak [data-band]'), napis = $$('.sxb-znak [data-wband]');
    const zjazd = (g, i, kon, skala) => {
      const s = (i % 2 ? 1 : -1) * skala, SK = 'steps(1, end)';   // skoki co klatkę, bez płynnego zjazdu
      A(g, [{ transform: `translate(${s}px,0)`, easing: SK }, { transform: `translate(${(s * 0.45).toFixed(1)}px,0)`, offset: 0.33, easing: SK },
        { transform: `translate(${(s * 0.15).toFixed(1)}px,0)`, offset: 0.66, easing: SK }, { transform: `translate(${kon}px,0)` }], 240, { delay: 2050 });
    };
    pasy.forEach((g, i) => zjazd(g, i, BANDS[i][2], R(160, 260)));
    napis.forEach((g, i) => zjazd(g, i + 1, 0, R(300, 460)));

    // 2,45–2,75 s: nakładka rozdziera się pasami; pod spodem już leży ta sama tapeta i wchodzą paski pulpitu
    const SK = 'steps(1, end)';
    A(el, [
      { clipPath: 'polygon(0 0,100% 0,100% 100%,0 100%)', easing: SK },
      { clipPath: 'polygon(0 0,100% 0,100% 30%,0 30%,0 38%,100% 38%,100% 100%,0 100%)', offset: 0.2, easing: SK },
      { clipPath: 'polygon(0 12%,100% 12%,100% 20%,0 20%,0 52%,100% 52%,100% 64%,0 64%,0 86%,100% 86%,100% 92%,0 92%)', offset: 0.45, easing: SK },
      { clipPath: 'polygon(0 44%,100% 44%,100% 48%,0 48%,0 70%,100% 70%,100% 72%,0 72%)', offset: 0.7, easing: SK },
      { clipPath: 'polygon(0 50%,100% 50%,100% 50%,0 50%)' }], 300, { delay: 2450 });

    // klik w nakładkę = „Pomiń” modułu
    el.addEventListener('click', () => { const b = root.querySelector('[data-a="pomin"]'); if (b) b.click(); });
    // po rozruchu (albo pominięciu) znak na pulpicie raz się zrywa
    setTimeout(() => { if (ostatnia) ostatnia.zryw(); }, at(2900));

    return { el, anims, otwarcie: 2400, dur: 2800 };
  }

  /* Okno „Laboratorium”: lista z widoku Sadzonek (#rnd). Klik w projekt = przejście do Sadzonek i otwarcie jego karty. */
  const IKONA_LAB = '<path d="M12 4h8M14 4v8L6 25a1.5 1.5 0 0 0 1.3 2.2h17.4A1.5 1.5 0 0 0 26 25l-8-13V4"/><path d="M9.5 19h13"/>';
  function laboratorium(go) {
    const src = () => D.querySelector('[data-view="rnd"]');
    const sadzonki = () => { const r = src(); return r ? [...r.querySelectorAll('.seed[data-project]')] : []; };
    const tekst = (el, s) => { const x = el && el.querySelector(s); return x ? x.textContent.replace(/\s+/g, ' ').trim() : ''; };
    return {
      id: 'lab',
      nazwa: 'Laboratorium',
      ikona: IKONA_LAB,
      q: 'Eksperymenty i rzeczy w budowie',
      n: sadzonki().length || 0,
      mount(el) {
        const r = src();
        const wstep = r ? tekst(r, '.stub') : '';
        const lista = sadzonki().map((s) => {
          const tag = tekst(s, '.seed__tag').replace(/[[\]]/g, '').trim();
          return `<li><button type="button" class="sxl-it" data-projekt="${s.dataset.project}">
<span class="sxl-tag">${tag}</span><span class="sxl-t">${tekst(s, '.seed__title')}</span>
<span class="sxl-b">${tekst(s, '.seed__body')}</span><span class="sxl-go" aria-hidden="true">▸ otwórz</span></button></li>`;
        }).join('');
        el.innerHTML = `<div class="sxl">${wstep ? `<p class="sxl-lead">${wstep}</p>` : ''}
<ul class="sxl-lista" role="list">${lista}</ul>
<button type="button" class="sxl-all" data-projekt="">Wszystkie Sadzonki →</button></div>`;
        const klik = (e) => {
          const b = e.target.closest('[data-projekt]');
          if (!b) return;
          const id = b.dataset.projekt;
          go('rnd');
          if (id) setTimeout(() => { const s = D.querySelector(`[data-view="rnd"] .seed[data-project="${id}"]`); if (s) s.click(); }, 380);
        };
        el.addEventListener('click', klik);
        return { destroy() { el.removeEventListener('click', klik); } };
      },
    };
  }

  W.SoraOSPulpit = { tapeta, boot, laboratorium, wersja: '1.1.0' };
})(window, document);
