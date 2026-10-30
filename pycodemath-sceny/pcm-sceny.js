/* Pycodemath na żywo. Dane z dane.json (prawdziwe wywołania silnika, patrz dane_sceny.py).
   Animacja na setTimeout, bez pętli rAF. Start dopiero, gdy sekcja jest blisko kadru. */
(function () {
  var root = document.querySelector('.pcm');
  if (!root) return;
  var ladowane = false;
  function laduj() {
    if (ladowane) return; ladowane = true;
    fetch('pycodemath-sceny/dane.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(start)
      .catch(function () { root.querySelector('.pcm__in').insertAdjacentHTML('beforeend', '<p class="pcm-blad" role="alert">Nie udało się wczytać scen. Odśwież stronę.</p>'); });
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es, o) { if (es[0].isIntersecting) { o.disconnect(); laduj(); } }, {rootMargin: '700px 0px'}).observe(root);
  else laduj();
function start(D) {

const RED = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (RED) document.querySelector('.pcm').classList.add('reduced');
const $ = (s, r = document) => r.querySelector(s);
const zl = (x, d = 2) => Number(x).toLocaleString('pl-PL', {minimumFractionDigits: d, maximumFractionDigits: d});
const gr = n => n + ' gr';
const scenes = [];

/* sterowanie wspólne: Odtwórz/Pauza, Od nowa, suwak. Kroki biegną z setTimeout, bez pętli rAF. */
function player(root, cfg) {
  const ster = $('.ster', root);
  ster.innerHTML = '<button class="glowny" data-a="gra" aria-label="Odtwórz">Odtwórz</button><button data-a="od">Od nowa</button>'
    + '<label class="suwak"><span class="krok" data-r="kr"></span><input type="range" min="0" value="0" aria-label="Krok sceny"></label>';
  const gra = $('[data-a=gra]', ster), od = $('[data-a=od]', ster), sl = $('input', ster), kr = $('[data-r=kr]', ster);
  const P = {i: 0, n: cfg.n(), t: null, grajacy: false};
  const draw = () => { P.n = cfg.n(); sl.max = P.n; sl.value = P.i; kr.textContent = P.i + ' / ' + P.n; sl.setAttribute('aria-valuetext', 'krok ' + P.i + ' z ' + P.n); cfg.render(P.i); };
  P.go = i => { P.i = Math.max(0, Math.min(P.n, i)); draw(); };
  P.stop = () => { clearTimeout(P.t); P.grajacy = false; gra.textContent = P.i >= P.n ? 'Odtwórz ponownie' : 'Odtwórz'; gra.setAttribute('aria-label', gra.textContent); };
  const tick = () => {
    if (P.i >= P.n) { P.stop(); return; }
    P.go(P.i + 1);
    if (P.i >= P.n) { P.stop(); return; }
    P.t = setTimeout(tick, cfg.delay(P.i));
  };
  P.play = () => {
    scenes.forEach(s => s !== P && s.stop());
    if (RED) { P.go(P.n); P.stop(); return; }
    if (P.i >= P.n) P.go(0);
    P.grajacy = true; gra.textContent = 'Pauza'; gra.setAttribute('aria-label', 'Pauza');
    P.t = setTimeout(tick, cfg.delay(P.i));
  };
  gra.onclick = () => P.grajacy ? P.stop() : P.play();
  od.onclick = () => { P.stop(); P.go(0); P.play(); };
  sl.oninput = () => { P.stop(); P.go(+sl.value); };
  P.draw = draw; P.root = root; scenes.push(P);
  new IntersectionObserver(es => es.forEach(e => {
    if (e.intersectionRatio >= .3 && !P.zagrane) { P.zagrane = true; if (!RED) P.play(); }
    if (!e.isIntersecting && P.grajacy) P.stop();
  }), {threshold: [0, .3]}).observe(root);
  if (RED) P.go(P.n); else P.go(0);
  return P;
}

/* scena 1 */
(function () {
  const root = $('#pcm-s1'), C = D.cena, svg = $('#pcm-wyk');
  const W = 640, H = 320, L = 52, R = 18, T = 20, B = 36, x0 = 5, x1 = 25, y1 = 850;
  const X = c => L + (c - x0) / (x1 - x0) * (W - L - R), Y = z => H - B - z / y1 * (H - T - B);
  let run = C.przebiegi[0];
  const r = k => $('[data-r=' + k + ']', root);
  const sciezka = C.krzywa.map((p, j) => (j ? 'L' : 'M') + X(p.cena).toFixed(1) + ' ' + Y(p.zysk).toFixed(1)).join('');
  let osie = '';
  for (let z = 0; z <= 800; z += 200) osie += `<line x1="${L}" x2="${W - R}" y1="${Y(z)}" y2="${Y(z)}" stroke="rgba(246,242,243,.14)"/><text x="${L - 8}" y="${Y(z) + 4}" text-anchor="end">${z}</text>`;
  for (let c = 5; c <= 25; c += 5) osie += `<text x="${X(c)}" y="${H - 12}" text-anchor="middle">${c} zł</text>`;
  svg.innerHTML = osie + `<text x="${L}" y="12">zysk w zł</text><path d="${sciezka}" fill="none" stroke="#f6f2f3" stroke-width="3"/>`
    + `<g id="slad"></g><line id="styczna" stroke="#ff3a52" stroke-width="3" stroke-linecap="round"/><g class="pkt" id="pkt"><circle r="11" fill="#e11d33" stroke="#f6f2f3" stroke-width="3"/></g><g id="meta" opacity="0"></g>`;
  const slad = $('#slad', svg), st = $('#styczna', svg), pkt = $('#pkt', svg), meta = $('#meta', svg);
  const render = i => {
    const k = run.kroki[i], ost = i === run.kroki.length - 1;
    pkt.style.transform = `translate(${X(k.cena)}px,${Y(k.zysk)}px)`;
    slad.innerHTML = run.kroki.slice(0, i).map(q => `<circle cx="${X(q.cena)}" cy="${Y(q.zysk)}" r="4.5" fill="#ff3a52" opacity=".55"/>`).join('');
    const s = k.nachylenie, dx = 1.8, ya = k.zysk - s * dx, yb = k.zysk + s * dx;
    const clip = v => Math.max(0, Math.min(y1, v));
    st.setAttribute('x1', X(k.cena - dx)); st.setAttribute('x2', X(k.cena + dx));
    st.setAttribute('y1', Y(clip(ya))); st.setAttribute('y2', Y(clip(yb)));
    st.style.display = ost ? 'none' : '';
    meta.setAttribute('opacity', ost ? 1 : 0);
    meta.innerHTML = ost ? `<line x1="${L}" x2="${W - R}" y1="${Y(800)}" y2="${Y(800)}" stroke="#ff3a52" stroke-dasharray="6 6" stroke-width="2"/><text x="${W - R}" y="${Y(800) - 8}" text-anchor="end" fill="#f6f2f3" style="fill:#f6f2f3">sufit: 800 zł</text>` : '';
    r('cena').textContent = zl(k.cena) + ' zł'; r('zysk').textContent = zl(k.zysk) + ' zł'; r('krok').textContent = i + ' z ' + (run.kroki.length - 1);
    const li = run.kroki.length - 1;
    let t;
    if (i === 0) t = `Start: cena ${zl(k.cena)} zł daje zysk ${zl(k.zysk)} zł. Program sprawdza, w którą stronę zysk rośnie.`;
    else if (ost) t = `<b>Sprawdzone: wyżej już się nie da.</b> Po ${run.wynik.iteracje} krokach cena ${zl(run.wynik.cena)} zł daje zysk ${zl(run.wynik.zysk)} zł, a stok krzywej jest równy zeru.`;
    else if (Math.abs(k.cena - run.kroki[i - 1].cena) < 0.05) t = `Krok ${i}: cena zmienia się już o mniej niż 5 groszy (${zl(k.cena)} zł). Program dopracowuje wynik.`;
    else { const p = run.kroki[i - 1]; t = `Krok ${i}: przy ${zl(p.cena)} zł zysk rośnie, jeśli ${p.nachylenie > 0 ? 'podniesiesz' : 'obniżysz'} cenę. Program ustawia ${zl(k.cena)} zł i zysk wynosi ${zl(k.zysk)} zł.`; }
    r('podpis').innerHTML = t;
  };
  const P = player(root, {n: () => run.kroki.length - 1, render, delay: i => RED ? 0 : (i < 9 ? 750 : 170)});
  root.querySelectorAll('[data-start]').forEach(b => b.onclick = () => {
    root.querySelectorAll('[data-start]').forEach(x => x.setAttribute('aria-pressed', x === b));
    run = C.przebiegi[+b.dataset.start]; P.stop(); P.go(0); P.play();
  });
})();

/* scena 2 */
(function () {
  const root = $('#pcm-s2'), F = D.faktura, W = F.wiersze, N = W.length + 2;
  const r = k => $('[data-r=' + k + ']', root);
  const render = i => {
    const nw = Math.min(i, W.length), napr = i >= N;
    r('wiersze').innerHTML = W.slice(0, nw).map((w, j) => {
      const zly = !napr && w.float !== w.dokladnie && Number(w.float) !== Number(w.dokladnie);
      return `<tr class="${zly ? 'zle' : ''}${j === nw - 1 && i <= W.length ? ' nowy' : ''}"><td>${zl(w.netto)}</td><td>${zl(napr ? w.dokladnie : w.float)}</td><td>${zl(w.dokladnie)}</td></tr>`;
    }).join('');
    const last = nw ? W[nw - 1] : null;
    r('sf').textContent = last ? zl(napr ? last.suma_dokladnie : last.suma_float) + ' zł' : '–';
    r('sd').textContent = last ? zl(last.suma_dokladnie) + ' zł' : '–';
    r('brak').textContent = last && !napr ? gr(last.brakuje_gr) : '0 gr';
    const dy = r('dymek'); dy.hidden = i < W.length + 1;
    const pr = F.przyczyna;
    if (i === W.length + 1) dy.innerHTML = `Przyczyna: komputer zapisuje liczbę 1,23 jako <code>${pr.zapisane_jako.slice(0, 24)}…</code>, czyli odrobinę mniej. Przy ${zl(pr.swiadek.x)} zł netto wychodzi ${pr.float.replace('.', ',')} zamiast ${pr.dokladnie.replace('.', ',')}.<details><summary>Dla ciekawych: cały zapis</summary><span class="mono">${pr.zapisane_jako}</span></details>`;
    if (napr) dy.innerHTML = 'Poprawka: kwoty liczone dziesiętnie i zaokrąglane jawnym trybem „w górę od połowy” (round_money). Obie kolumny są takie same, suma się zgadza.';
    let t;
    if (i === 0) t = 'Faktura jest pusta. Dodajemy pozycje jedna po drugiej.';
    else if (i <= W.length) { const w = W[i - 1]; t = (w.float !== w.dokladnie && Number(w.float) !== Number(w.dokladnie)) ? `Pozycja ${i}: komputer liczy ${zl(w.float)} zł, a powinno być ${zl(w.dokladnie)} zł. <b>Tu ginie grosz.</b>` : `Pozycja ${i}: obie kolumny się zgadzają.`; }
    else if (i === W.length + 1) t = `Po dwunastu pozycjach brakuje <b>${gr(F.wynik.brakuje_gr)}</b>. Program wskazuje przyczynę.`;
    else t = `<b>Sprawdzone: suma ${zl(F.wynik.suma_dokladnie)} zł zgadza się co do grosza.</b> Zwykły komputer miał ${zl(F.wynik.suma_float)} zł.`;
    r('podpis').innerHTML = t;
  };
  player(root, {n: () => N, render, delay: i => RED ? 0 : (i <= W.length ? 650 : 2600)});
})();

/* scena 3 */
(function () {
  const root = $('#pcm-s3'), G = D.regulamin, W = G.wiersze, N = W.length + 3;
  const r = k => $('[data-r=' + k + ']', root);
  const render = i => {
    const nw = Math.min(i, W.length), naprawa = i > W.length + 1;
    r('kolkod').textContent = naprawa ? 'Kod po poprawce' : 'Kod';
    r('wiersze').innerHTML = W.slice(0, nw).map((w, j) => {
      const v = naprawa ? w.po_poprawce : w.kod, zly = v !== w.regulamin;
      return `<tr class="${zly ? 'zle' : ''}${j === nw - 1 && i <= W.length ? ' nowy' : ''}"><td>${w.n}</td><td>${w.regulamin} zł</td><td>${v} zł${zly ? ' ✗' : ''}</td></tr>`;
    }).join('');
    const kod = (naprawa ? G.kod_poprawny : G.kod_bledny).split('\n').filter(Boolean);
    const lin = naprawa ? 1 : 1;
    r('kod').innerHTML = kod.map((l, j) => `<span class="l ${j === lin ? (naprawa ? 'dobra' : (i > 5 ? 'zla' : '')) : ''}">${l.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`).join('');
    const pg = r('pig');
    pg.innerHTML = i === W.length + 1 ? '<span class="pig ref">OBALONE: rabat(n=5)</span>' : (naprawa ? '<span class="pig ok">DOWIEDZIONE dla każdej liczby sztuk</span>' : '');
    const te = r('test'); te.hidden = i < N; te.textContent = i >= N ? G.wygenerowany_test.split('\n').filter(l => /^(def |    #|    assert|from |import )/.test(l)).join('\n') : '';
    let t;
    if (i === 0) t = 'Regulamin mówi: 10 zł za każde pełne 5 sztuk. Sprawdzamy kolejne koszyki.';
    else if (i <= W.length) { const w = W[i - 1]; t = w.kod === w.regulamin ? `Koszyk ${w.n} szt.: kod ${w.kod} zł, regulamin ${w.regulamin} zł. Zgadza się.` : `Koszyk ${w.n} szt.: kod daje ${w.kod} zł, regulamin ${w.regulamin} zł. <b>Tu się myli.</b>`; }
    else if (i === W.length + 1) t = '<b>Program uruchomił funkcję i potwierdził błąd.</b> Przy 5 sztukach rabat ma być 10 zł, a kod daje 0 zł. Przyczyna: znak „>” zamiast „>=”.';
    else if (i === W.length + 2) t = '<b>Po poprawce wszystko się zgadza.</b> Program dowodzi, że funkcja równa się wzorowi dla każdej liczby sztuk, nie tylko dla tych dziesięciu.';
    else t = 'Na koniec program pisze gotowy test. Odtąd ten błąd nie wróci niezauważony.';
    r('podpis').innerHTML = t;
  };
  player(root, {n: () => N, render, delay: i => RED ? 0 : (i <= W.length ? (W[i - 1] && W[i - 1].kod !== W[i - 1].regulamin ? 1800 : 520) : 2800)});
})();

}
})();
