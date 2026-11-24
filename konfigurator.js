/* konfigurator.js — orientacyjna cena skryptu, bota albo aplikacji w sześciu krokach (model cen z 06.10.2026).
   Ładowany dopiero po kliknięciu „Otwórz konfigurator” w Kontakcie (app.js), razem z konfigurator.css.
   Niczego nie wysyła. Wybory zapisuje tylko w tej przeglądarce (localStorage, klucz konf_v1), żeby nie przepadły
   po odświeżeniu. „Dołącz do wiadomości” przekazuje tekst podsumowania do formularza zdarzeniem konfigurator:gotowe. */
(() => {
  'use strict';
  const HTML = "<div class=\"konf-hud\"><span>krok <b id=\"konfN\">01</b>/06 · <span id=\"konfT\">start</span></span><span><span class=\"konf-saved\" id=\"konfSaved\">✓ zapisano</span><span id=\"konfLeft\">ok. 3 min</span></span></div>\n<div class=\"konf-steps\" id=\"konfSteps\"></div>\n<div class=\"konf-scan\">\n<div class=\"konf-diagram\" id=\"konfDiagram\" role=\"img\" aria-label=\"Schemat systemu\"></div>\n<div class=\"konf-price\">\n<small>cena orient.</small>\n<p class=\"konf-total\" id=\"konfTotal\">—</p>\n<span class=\"konf-delta\" id=\"konfDelta\" aria-hidden=\"true\"></span>\n<p class=\"konf-upto\" id=\"konfUpto\"></p>\n</div>\n<details class=\"konf-lines\"><summary>Skąd ta cena</summary><ul id=\"konfLines\"></ul></details>\n</div>\n<section class=\"konf-pane\" data-pane=\"0\" aria-labelledby=\"konfH0\">\n<h3 id=\"konfH0\" tabindex=\"-1\">Od czego zaczynamy?</h3>\n<p class=\"konf-sub\">Wybierz najbliższy opis. Ustawię rozsądne wartości domyślne, a zmienisz tylko to, co się nie zgadza.</p>\n<div class=\"konf-opts konf-opts--2\" id=\"kg-rodzaj\"></div>\n<p class=\"konf-dep\" id=\"konfDepRodzaj\" hidden></p>\n<details class=\"konf-help\"><summary>Co to znaczy?</summary><p>Nie trzeba trafić idealnie. Przy wahaniu między dwoma opisami lepiej wybrać mniejszy. Jeśli okaże się za mały, powiem to przy wycenie, zanim cokolwiek zapłacisz.</p></details>\n</section>\n<section class=\"konf-pane\" data-pane=\"1\" aria-labelledby=\"konfH1\" hidden>\n<h3 id=\"konfH1\" tabindex=\"-1\">Jak ma działać</h3>\n<p class=\"konf-sub\">Trzy pytania, które najbardziej zmieniają nakład pracy.</p>\n<div class=\"konf-q\">Skąd bierze dane</div><div class=\"konf-opts\" id=\"kg-zrodla\"></div>\n<details class=\"konf-help\"><summary>Co to znaczy?</summary><p>Źródło to miejsce, z którego skrypt czyta informacje: plik Excel, strona internetowa, program księgowy, skrzynka mailowa. Policz, ile takich miejsc ma być w jednym działaniu.</p></details>\n<div class=\"konf-q\">Gdzie działa</div><div class=\"konf-opts\" id=\"kg-gdzie\"></div>\n<details class=\"konf-help\"><summary>Co to znaczy?</summary><p>Na komputerze zamawiającego: skrypt działa, kiedy komputer jest włączony. Na serwerze: działa sam, także w nocy i gdy komputer jest wyłączony. Serwer to dodatkowa praca przy konfiguracji i miesięczny koszt hostingu po stronie zamawiającego.</p></details>\n<p class=\"konf-dep\" id=\"konfDepGdzie\" hidden>Panel w przeglądarce wymaga serwera, więc ustawiono go automatycznie.</p>\n<div class=\"konf-q\">Jak się go obsługuje</div><div class=\"konf-opts\" id=\"kg-ui\"></div>\n<details class=\"konf-help\"><summary>Co to znaczy?</summary><p>Bez okna: uruchamia się plik albo skrypt startuje sam i zostawia wynik. Proste okno: program z przyciskami. Panel w przeglądarce: wejście przez stronę, logowanie i tabele, może z niego korzystać kilka osób.</p></details>\n<div class=\"konf-unsure\"><span>Brak pewności? Zostają wartości domyślne i ustalamy to razem przy wycenie. Nic za to nie dopłacasz.</span><button type=\"button\" data-unsure=\"1\" aria-pressed=\"false\">Nie wiem, ustalmy razem</button></div>\n</section>\n<section class=\"konf-pane\" data-pane=\"2\" aria-labelledby=\"konfH2\" hidden>\n<h3 id=\"konfH2\" tabindex=\"-1\">Termin i materiały</h3>\n<p class=\"konf-sub\">Im więcej materiału na starcie i im mniej pośpiechu, tym taniej.</p>\n<div class=\"konf-q\">Termin</div><div class=\"konf-opts\" id=\"kg-termin\"></div>\n<details class=\"konf-help\"><summary>Co to znaczy?</summary><p>Termin liczy się od dnia, w którym wycena zostaje zaakceptowana i dostarczone są materiały. Pilne zlecenia wypychają inne prace, dlatego kosztują więcej.</p></details>\n<div class=\"konf-q\">Dokładny termin <span class=\"konf-q__opt\">opcjonalnie</span></div>\n<div class=\"konf-cal\" id=\"konfCal\">\n<div class=\"konf-cal__head\">\n<button type=\"button\" class=\"konf-cal__nav\" data-cal-nav=\"-1\" aria-label=\"Poprzedni miesiąc\">‹</button>\n<span class=\"konf-cal__title\" id=\"konfCalTitle\" aria-live=\"polite\"></span>\n<button type=\"button\" class=\"konf-cal__nav\" data-cal-nav=\"1\" aria-label=\"Następny miesiąc\">›</button>\n</div>\n<div class=\"konf-cal__dow\" aria-hidden=\"true\"><span>PN</span><span>WT</span><span>ŚR</span><span>CZ</span><span>PT</span><span>SO</span><span>ND</span></div>\n<div class=\"konf-cal__grid\" id=\"konfCalGrid\"></div>\n<div class=\"konf-cal__foot\"><span id=\"konfCalInfo\" aria-live=\"polite\"></span><button type=\"button\" class=\"konf-cal__clear\" id=\"konfCalClear\" hidden>wyczyść datę</button></div>\n</div>\n<details class=\"konf-help\"><summary>Co to znaczy?</summary><p>Jeśli zlecenie ma być gotowe na konkretny dzień (start sezonu, koniec miesiąca, wyjazd), zaznacz go w kalendarzu. Z odległości do tej daty sam dobiera się tryb terminu powyżej: im bliżej, tym wyższa dopłata. Bez daty zostaje wybrany wyżej tryb.</p></details>\n<div class=\"konf-q\">Przykładowe dane i opis kroków</div><div class=\"konf-opts konf-opts--2\" id=\"kg-dane\"></div>\n<details class=\"konf-help\"><summary>Co to znaczy?</summary><p>Przykładowe dane to np. kilka prawdziwych plików albo zrzutów ekranu, na których skrypt ma pracować. Opis kroków to kilka zdań: najpierw to, potem tamto. Z tym praca idzie szybciej, więc taniej.</p></details>\n<div class=\"konf-unsure\"><span>Brak pewności? Zostają wartości domyślne i ustalamy to razem przy wycenie. Nic za to nie dopłacasz.</span><button type=\"button\" data-unsure=\"2\" aria-pressed=\"false\">Nie wiem, ustalmy razem</button></div>\n</section>\n<section class=\"konf-pane\" data-pane=\"3\" aria-labelledby=\"konfH3\" hidden>\n<h3 id=\"konfH3\" tabindex=\"-1\">Ochrona i jakość</h3>\n<p class=\"konf-sub\">Podstawowe zabezpieczenia są zawsze w cenie. Rozszerzone warto wybrać, gdy skrypt dotyka haseł, danych osobowych albo działa w internecie.</p>\n<div class=\"konf-q\">Zabezpieczenia</div><div class=\"konf-opts konf-opts--2\" id=\"kg-zab\"></div>\n<details class=\"konf-help\"><summary>Co to znaczy?</summary><p>Rozszerzone, jeśli skrypt loguje się na konta, trzyma hasła lub klucze, przetwarza dane klientów albo jest dostępny z internetu. Jeśli tylko porządkuje pliki na komputerze, podstawowe wystarczy.</p></details>\n<div class=\"konf-q\">Testy automatyczne</div><div class=\"konf-opts konf-opts--2\" id=\"kg-testy\"></div>\n<details class=\"konf-help\"><summary>Co to znaczy?</summary><p>Testy to drugi, mały program, który po każdej zmianie sprawdza, czy skrypt dalej liczy poprawnie. Opłacają się, gdy skrypt ma żyć długo i będzie rozwijany.</p></details>\n<div class=\"konf-unsure\"><span>Brak pewności? Zostają wartości domyślne i ustalamy to razem przy wycenie. Nic za to nie dopłacasz.</span><button type=\"button\" data-unsure=\"3\" aria-pressed=\"false\">Nie wiem, ustalmy razem</button></div>\n</section>\n<section class=\"konf-pane\" data-pane=\"4\" aria-labelledby=\"konfH4\" hidden>\n<h3 id=\"konfH4\" tabindex=\"-1\">Serwis po oddaniu</h3>\n<p class=\"konf-sub\">Świat wokół skryptu się zmienia: strona źródłowa przebuduje układ, zmieni się API, pojawi się nowa potrzeba. Serwis to niska, stała opłata za poprawki i rozwój. Nie jest obowiązkowy, a im dłużej trwa, tym jest tańszy.</p>\n<div class=\"konf-opts\" id=\"kg-serwis\"></div>\n<details class=\"konf-help\"><summary>Co to znaczy?</summary><p>Serwis obejmuje poprawki, gdy coś przestanie działać z przyczyn zewnętrznych (zmiana strony, API, systemu), oraz rozwój. Nie obejmuje nowego, dużego zakresu: ten wyceniam osobno. Rezygnacja jest możliwa na koniec każdego okresu.</p></details>\n<div id=\"konfOkresWrap\"><div class=\"konf-q\">Na jak długo</div><div class=\"konf-opts\" id=\"kg-okres\"></div></div>\n</section>\n<section class=\"konf-pane\" data-pane=\"5\" aria-labelledby=\"konfH5\" hidden>\n<h3 id=\"konfH5\" tabindex=\"-1\">Podsumowanie</h3>\n<p class=\"konf-sub\">To cena orientacyjna, nie oferta. Wiążącą podaję po przeczytaniu opisu. Wynik możesz dołączyć do wiadomości w formularzu powyżej; sam konfigurator niczego nie wysyła.</p>\n<div class=\"konf-recap\" id=\"konfRecap\"></div>\n<button type=\"button\" class=\"btn\" id=\"konfDolacz\">Dołącz do wiadomości &rarr;</button>\n</section>\n<div class=\"konf-nav\">\n<button class=\"konf-btn\" id=\"konfPrev\" type=\"button\" hidden>← Wstecz</button>\n<span class=\"konf-navprice\" id=\"konfNavPrice\" aria-hidden=\"true\"></span>\n<button class=\"konf-btn konf-btn--go\" id=\"konfNext\" type=\"button\">Dalej →</button>\n</div>";
  function zamontuj(miejsce) {
    if (miejsce.dataset.gotowy) return;
    miejsce.dataset.gotowy = '1';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wrap = document.createElement('div');
    wrap.className = 'konf-wrap'; wrap.dataset.step = '0';
    const konf = document.createElement('section');
    konf.className = 'konf'; konf.id = 'konf'; konf.setAttribute('aria-label', 'Konfigurator ceny');
    konf.innerHTML = HTML;
    wrap.appendChild(konf);
    miejsce.replaceChildren(wrap);
    const $ = (id) => document.getElementById(id);

    const RODZAJE = [
      { id: 'mikro', k: 'Porządek w plikach', t: 'Mikro-skrypt', d: 'Jedno zadanie, jedno źródło: zmiana nazw, scalanie arkuszy, mały konwerter.', base: 150 },
      { id: 'skrypt', k: 'Raport i dane', t: 'Skrypt', d: 'Kilka kroków, pobieranie danych, raport, praca według harmonogramu.', base: 500 },
      { id: 'bot', k: 'Pilnowanie 24/7', t: 'Bot', d: 'Działa całą dobę, pilnuje czegoś i odzywa się przez Discord, mail lub API.', base: 1200 },
      { id: 'app', k: 'Program dla firmy', t: 'Aplikacja', d: 'Kalendarz, klienci, magazyn, panel dla zespołu. Pod jedną firmę.', base: 5000, from: true }
    ];
    const PRESET = {
      mikro: { zrodla: '1', gdzie: 'pc', ui: 'cli', termin: 'std', dane: 'nie', zab: 'pod', testy: 'nie', serwis: 'brak', okres: '1' },
      skrypt: { zrodla: '3', gdzie: 'pc', ui: 'cli', termin: 'std', dane: 'nie', zab: 'pod', testy: 'nie', serwis: 'pod', okres: '6' },
      bot: { zrodla: '3', gdzie: 'srv', ui: 'cli', termin: 'std', dane: 'nie', zab: 'pod', testy: 'nie', serwis: 'pod', okres: '6' },
      app: { zrodla: '1', gdzie: 'pc', ui: 'gui', termin: 'std', dane: 'nie', zab: 'pod', testy: 'nie', serwis: 'stal', okres: '12' }
    };
    /* s = krotka nazwa modulu do terminala (> install modul:serwer ...) */
    const G = {
      zrodla: [{ id: '1', s: '1', t: 'Jedno', d: 'jeden plik, strona lub system', p: 0 }, { id: '3', s: '2-3', t: '2 do 3', d: 'kilka plików, stron lub API', p: 0.25, rec: 1 }, { id: '4', s: '4+', t: '4 i więcej', d: 'wiele źródeł, scalanie i czyszczenie', p: 0.6 }],
      gdzie: [{ id: 'pc', s: 'pc', t: 'Na komputerze zamawiającego', d: 'uruchamia się ręcznie lub z harmonogramu', p: 0 }, { id: 'srv', s: 'serwer', t: 'Na serwerze', d: 'działa bez komputera zamawiającego, uruchamiam i konfiguruję', p: 0.3 }],
      ui: [{ id: 'cli', s: 'bez-okna', t: 'Bez okna', d: 'uruchamia się plik, wynik ląduje w pliku lub na mailu', p: 0 }, { id: 'gui', s: 'okno', t: 'Proste okno', d: 'kilka przycisków i pól na Windowsie', p: 0.35 }, { id: 'web', s: 'panel-www', t: 'Panel w przeglądarce', d: 'logowanie, tabele, kilku użytkowników', p: 0.7 }],
      termin: [{ id: 'luz', s: '30d', t: 'Bez pośpiechu', d: 'do 30 dni', p: -0.1 }, { id: 'std', s: '14d', t: 'Standard', d: 'do 14 dni', p: 0, rec: 1 }, { id: 'szyb', s: '5d', t: 'Szybki', d: 'do 5 dni', p: 0.25 }, { id: 'pilny', s: '48h', t: 'Pilny', d: 'w 48 godzin', p: 0.5 }],
      dane: [{ id: 'tak', s: 'gotowe', t: 'Są', d: 'przykładowe dane i opis krok po kroku', p: -0.1 }, { id: 'nie', s: 'brak', t: 'Brak', d: 'wyciągnę to z rozmowy', p: 0 }],
      zab: [{ id: 'pod', s: 'podstawowe', t: 'Podstawowe', d: 'w cenie: brak haseł w kodzie, sprawdzanie danych wejściowych, dziennik błędów', p: 0, rec: 1 }, { id: 'roz', s: 'rozszerzone', t: 'Rozszerzone', d: 'sekrety poza kodem, szyfrowana konfiguracja, kopia zapasowa ustawień, przegląd pod kątem typowych luk', p: 0.2 }],
      testy: [{ id: 'nie', s: 'bez', t: 'Bez testów', d: 'sprawdzanie ręczne na danych zamawiającego', p: 0 }, { id: 'tak', s: 'auto', t: 'Z testami automatycznymi', d: 'łatwiej bezpiecznie zmieniać kod w przyszłości', p: 0.15 }]
    };
    const GROUPS = ['zrodla', 'gdzie', 'ui', 'termin', 'dane', 'zab', 'testy'];
    const SERWIS = [
      { id: 'brak', t: 'Bez serwisu', d: 'Poprawki z ceny i koniec. Zmiany później według cennika.', pct: 0, min: 0 },
      { id: 'pod', t: 'Serwis Podstawowy', d: 'Naprawiam błędy i dopasowuję skrypt, gdy zmieni się źródło danych. Reakcja do 3 dni roboczych.', pct: 0.04, min: 39, rec: 1 },
      { id: 'stal', t: 'Serwis Stały', d: 'To co Podstawowy, szybsza reakcja, miesięczny przegląd zabezpieczeń i jedna drobna zmiana w miesiącu.', pct: 0.08, min: 79 }
    ];
    const OKRES = [
      { id: '1', t: 'Miesiąc po miesiącu', d: 'rezygnacja w dowolnym momencie', m: 0 },
      { id: '6', t: '6 miesięcy', d: 'stawka niższa o 10%', m: 0.1, rec: 1 },
      { id: '12', t: '12 miesięcy', d: 'stawka niższa o 20%', m: 0.2 }
    ];
    const STEPS = [['start', 'Start'], ['dzialanie', 'Działanie'], ['termin', 'Termin'], ['ochrona', 'Ochrona'], ['serwis', 'Serwis'], ['wysylka', 'Podsumowanie']];
    const LAB = { zrodla: 'Źródła danych', gdzie: 'Działa', ui: 'Interfejs', termin: 'Termin', dane: 'Przykładowe dane', zab: 'Zabezpieczenia', testy: 'Testy' };
    const STEP_OF = { rodzaj: 0, zrodla: 1, gdzie: 1, ui: 1, termin: 2, dane: 2, zab: 3, testy: 3, serwis: 4, okres: 4 };
    const KEY = 'konf_v1';
    let st = Object.assign({ rodzaj: 'skrypt' }, PRESET.skrypt);
    let step = 0;
    let unsure = {};
    let prevTotal = null;
    let savedT = 0;

    const nb = (s) => s.replace(/\s/g, ' ');
    const zl = (n) => nb(n.toLocaleString('pl-PL')) + ' zł';
    const r5 = (n) => Math.round(n / 5) * 5;
    const find = (a, id) => a.find((x) => x.id === id);
    const sgn = (p) => (p > 0 ? '+' : p < 0 ? '−' : '') + Math.round(Math.abs(p) * 100) + '%';

    function save() {
      try {
        localStorage.setItem(KEY, JSON.stringify({ st: st, step: step, un: unsure }));
        const el = $('konfSaved');
        if (el) { el.classList.add('on'); clearTimeout(savedT); savedT = setTimeout(() => el.classList.remove('on'), 1400); }
      } catch (e) { /* tryb prywatny / zablokowane dane: konfigurator dziala bez zapisu */ }
    }
    function load() {
      try {
        const s = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (s && s.st && find(RODZAJE, s.st.rodzaj)) {
          const ok = GROUPS.every((k) => find(G[k], s.st[k])) && find(SERWIS, s.st.serwis) && find(OKRES, s.st.okres);
          if (ok) { st = Object.assign(st, s.st); step = Math.min(5, s.step | 0); unsure = s.un || {}; if (st.data && dniDo(st.data) < 1) st.data = ''; }
        }
      } catch (e) { /* uszkodzony zapis: zostaja ustawienia domyslne */ }
    }

    /* ---------- kalendarz terminu ---------- */
    const MIESIACE = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
    const MIESIACE_D = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
    const DNI = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
    const pad2 = (n) => String(n).padStart(2, '0');
    const isoOf = (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
    function parseIso(v) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
      if (!m) return null;
      const d = new Date(+m[1], +m[2] - 1, +m[3]);
      return isoOf(d) === v ? d : null;
    }
    function dzis() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
    function dniDo(v) { const d = parseIso(v); return d ? Math.round((d - dzis()) / 864e5) : -1; }
    /* odleglosc do daty -> tryb terminu (te same dopłaty co wybor reczny) */
    function terminZDaty(n) { return n >= 21 ? 'luz' : n >= 6 ? 'std' : n >= 3 ? 'szyb' : 'pilny'; }
    function dataOpis(v) {
      const d = parseIso(v);
      return d ? d.getDate() + ' ' + MIESIACE_D[d.getMonth()] + ' ' + d.getFullYear() + ', ' + DNI[d.getDay()] : '';
    }
    let calY = dzis().getFullYear();
    let calM = dzis().getMonth();
    function calRender() {
      const t0 = dzis();
      const minIdx = t0.getFullYear() * 12 + t0.getMonth();
      const idx = calY * 12 + calM;
      $('konfCalTitle').textContent = MIESIACE[calM] + ' ' + calY;
      konf.querySelector('[data-cal-nav="-1"]').disabled = idx <= minIdx;
      konf.querySelector('[data-cal-nav="1"]').disabled = idx >= minIdx + 12;
      const first = (new Date(calY, calM, 1).getDay() + 6) % 7;
      const dni = new Date(calY, calM + 1, 0).getDate();
      let g = '';
      for (let i = 0; i < first; i++) g += '<span></span>';
      for (let d = 1; d <= dni; d++) {
        const dt = new Date(calY, calM, d);
        const v = isoOf(dt);
        const n = Math.round((dt - t0) / 864e5);
        const wk = dt.getDay() === 0 || dt.getDay() === 6;
        g += '<button type="button" class="konf-day' + (wk ? ' is-wknd' : '') + (n === 0 ? ' is-today' : '') + '" data-date="' + v + '"' +
          (n < 1 ? ' disabled' : '') + ' aria-pressed="' + (st.data === v ? 'true' : 'false') + '" aria-label="' + dataOpis(v) + '">' + d + '</button>';
      }
      $('konfCalGrid').innerHTML = g;
      const info = $('konfCalInfo');
      if (st.data) {
        const n = dniDo(st.data);
        info.textContent = dataOpis(st.data) + ' · za ' + n + ' dni · tryb: ' + find(G.termin, st.termin).t.toLowerCase() + (n < 2 ? ' · poniżej 48 h: czy to realne, wychodzi w rozmowie' : '');
      } else {
        info.textContent = 'Bez konkretnej daty. Wybierz dzień albo zostaw tryb powyżej.';
      }
      $('konfCalClear').hidden = !st.data;
    }

    function calc(s) {
      const rod = find(RODZAJE, s.rodzaj);
      const lines = [];
      let sum = rod.base;
      /* cena "od" = domyslny zestaw rodzaju (PRESET): dopłata liczy sie od roznicy wzgledem zestawu,
         wiec preset kazdego rodzaju kosztuje dokladnie base, a odejscie od niego dodaje albo odejmuje */
      GROUPS.forEach((k) => {
        const o = find(G[k], s[k]);
        const z = find(G[k], PRESET[rod.id][k]);
        const dp = o && z ? o.p - z.p : 0;
        if (dp !== 0) {
          const amt = r5(rod.base * dp);
          if (amt === 0) return;
          sum += amt;
          const name = dp < 0 && ['zrodla', 'gdzie', 'ui', 'zab', 'testy'].indexOf(k) >= 0 ? LAB[k] + ': ' + o.t.toLowerCase()
            : k === 'zrodla' ? 'Źródła danych: ' + o.t.toLowerCase()
            : k === 'gdzie' ? 'Działa na serwerze'
            : k === 'ui' ? 'Interfejs: ' + o.t.toLowerCase()
            : k === 'termin' ? 'Termin: ' + o.t.toLowerCase()
            : k === 'dane' ? 'Przykładowe dane są'
            : k === 'zab' ? 'Zabezpieczenia rozszerzone' : 'Testy automatyczne';
          lines.push({ k: k, n: name, p: dp, a: amt });
        }
      });
      const hi = Math.round((sum * 1.2) / 10) * 10;
      const sv = find(SERWIS, s.serwis);
      const ok = find(OKRES, s.okres);
      let mon = 0;
      if (sv.pct > 0) { mon = Math.max(sv.min, Math.round(sum * sv.pct)); mon = Math.round(mon * (1 - ok.m)); }
      return { rod: rod, lines: lines, total: sum, hi: hi, mon: mon, sv: sv, ok: ok, months: s.serwis === 'brak' ? 0 : parseInt(s.okres, 10) };
    }

    /* ---------- budowa kart wyboru ---------- */
    function optHtml(name, o, idx, pTxt, extra) {
      return '<label class="konf-opt' + (o.p < 0 || o.m > 0 ? ' is-neg' : '') + '"><input type="radio" name="' + name + '" value="' + o.id + '">' +
        '<span class="konf-opt__b">' + (extra || '') +
        '<span class="konf-opt__t">' + o.t + '</span><span class="konf-opt__d">' + o.d + '</span>' +
        '<span class="konf-opt__p"><span>' + pTxt + '</span>' + (o.rec ? '<span class="konf-opt__r">polecane</span>' : '') + '</span></span></label>';
    }
    function build() {
      $('kg-rodzaj').innerHTML = RODZAJE.map((o, i) => optHtml('rodzaj', { id: o.id, t: o.k, d: o.d, rec: o.id === 'skrypt' }, i, (o.from ? 'od ' : '') + zl(o.base), '<span class="konf-opt__k">' + o.t + '</span>')).join('');
      GROUPS.forEach((k) => {
        $('kg-' + k).innerHTML = G[k].map((o, i) => optHtml(k, o, i, o.p === 0 ? 'w cenie' : sgn(o.p) + ' ceny')).join('');
      });
      $('kg-serwis').innerHTML = SERWIS.map((o, i) => optHtml('serwis', o, i, o.pct === 0 ? '0 zł' : Math.round(o.pct * 100) + '% ceny / mies. (min. ' + o.min + ' zł)')).join('');
      $('kg-okres').innerHTML = OKRES.map((o, i) => optHtml('okres', o, i, o.m === 0 ? 'stawka pełna' : '−' + Math.round(o.m * 100) + '% stawki')).join('');
      $('konfSteps').innerHTML = STEPS.map((s, i) => '<button type="button" class="konf-seg" data-go="' + i + '" aria-label="Krok ' + (i + 1) + ': ' + s[1] + '"><i></i><span>' + (s[2] || s[1]) + '</span></button>').join('');
      $('konfSteps').setAttribute('role', 'group');
      $('konfSteps').setAttribute('aria-label', 'Kroki konfiguratora');
    }
    function syncRadios() {
      Object.keys(st).forEach((k) => {
        const el = konf.querySelector('input[name="' + k + '"][value="' + st[k] + '"]');
        if (el) el.checked = true;
      });
    }

    /* ---------- schemat systemu (SVG, tylko CSS-owy przeplyw kresek) ---------- */
    function node(x, y, w, h, c, cls) {
      return '<path class="dg-node ' + (cls || '') + '" d="M' + (x + c) + ' ' + y + 'H' + (x + w) + 'V' + (y + h - c) + 'L' + (x + w - c) + ' ' + (y + h) + 'H' + x + 'V' + (y + c) + 'Z"/>';
    }
    function tx(x, y, txt, cls) { return '<text' + (cls ? ' class="' + cls + '"' : '') + ' x="' + x + '" y="' + y + '">' + txt + '</text>'; }
    function diagram(c) {
      const n = st.zrodla === '1' ? 1 : st.zrodla === '3' ? 3 : 4;
      const ys = n === 1 ? [56] : n === 3 ? [24, 56, 88] : [10, 40, 70, 100];
      const outLbl = st.ui === 'cli' ? 'PLIK' : st.ui === 'gui' ? 'OKNO' : 'WWW';
      const srv = st.gdzie === 'srv';
      const roz = st.zab === 'roz';
      let o = '<rect class="dg-frame" x="136" y="28" width="116" height="84"/>' + tx(140, 24, srv ? 'SERWER' : 'KOMPUTER', srv ? 'r' : '');
      ys.forEach((y, i) => {
        const yc = y + 11;
        const d = 'M82 ' + yc + 'H110V70H152';
        o += '<path class="dg-line" d="' + d + '"/><path class="dg-flow" d="' + d + '"/>' + node(18, y, 64, 22, 5, 'dim') + tx(26, y + 14, i === 3 ? 'ŹR 4+' : 'ŹR 0' + (i + 1));
      });
      o += '<path class="dg-line" d="M236 70H292"/><path class="dg-flow" d="M236 70H292"/>';
      o += node(152, 48, 84, 44, 8) + tx(164, 68, { mikro: 'MIKRO', skrypt: 'SKRYPT', bot: 'BOT', app: 'APLIKACJA' }[c.rod.id], 'b') + tx(164, 82, c.rod.id === 'app' ? 'APP' : 'AUTO');
      o += node(292, 54, 56, 32, 6) + tx(302, 74, outLbl, 'b');
      o += '<path class="dg-shield' + (roz ? ' on' : '') + '" transform="translate(82 0)" d="M194 3l11 4v8c0 7-5 11-11 14c-6-3-11-7-11-14V7z"/>';
      if (roz) o += '<path class="dg-tick" transform="translate(82 0)" d="M189 14l4 4 7-8"/>';
      o += tx(294, 14, roz ? 'OCHRONA+' : 'OCHRONA', roz ? 'r' : '');
      if (st.testy === 'tak') o += tx(292, 104, '✓ TESTY', 'l');
      o += tx(292, 40, st.data ? st.data.slice(8) + '.' + st.data.slice(5, 7) : { luz: '30 DNI', std: '14 DNI', szyb: '5 DNI', pilny: '48 H' }[st.termin], st.termin === 'pilny' || st.termin === 'szyb' ? 'r' : '');
      const sv = c.sv;
      o += '<path class="dg-line dg-sep" d="M18 130H348"/>';
      o += tx(18, 146, sv.pct ? 'SERWIS: ' + sv.t.replace('Serwis ', '').toUpperCase() + ' · ' + (c.months > 1 ? c.months + ' MIES.' : 'MIES.') : 'BEZ SERWISU · POPRAWKI ' + (c.rod.id === 'mikro' ? 7 : 14) + ' DNI', sv.pct ? 'l' : '');
      $('konfDiagram').innerHTML = '<svg viewBox="0 0 366 154" aria-hidden="true" focusable="false">' + o + '</svg>';
      $('konfDiagram').setAttribute('aria-label', 'Schemat: ' + n + (n === 1 ? ' źródło' : ' źródeł') + ' danych, ' + c.rod.t + ', ' + (srv ? 'serwer' : 'komputer zamawiającego') + ', wynik: ' + outLbl.toLowerCase());
    }

    /* ---------- podsumowanie dla terminala i wysylki (ukryte pole) ---------- */
    function podsumowanie(c) {
      return {
        v: 1,
        rodzaj: c.rod.k + ' (' + c.rod.t + ')',
        od: !!c.rod.from,
        mod: GROUPS.map((k) => { const o = find(G[k], st[k]); const dp = o.p - find(G[k], PRESET[st.rodzaj][k]).p; return [k + ':' + o.s, dp === 0 ? 'w cenie' : sgn(dp)]; }),
        data: st.data ? st.data + ' (' + DNI[parseIso(st.data).getDay()] + ')' : '',
        serwis: c.sv.t + (c.mon ? ', ' + (c.months > 1 ? c.months + ' mies.' : 'miesięcznie') + ' (' + zl(c.mon) + '/mies.)' : ''),
        cena: c.total,
        hi: c.hi,
        ust: Object.keys(unsure).filter((k) => unsure[k]).map((k) => STEPS[k][1])
      };
    }
    function render() {
      if (st.data && dniDo(st.data) < 1) st.data = '';
      const c = calc(st);
      GROUPS.forEach((k) => {   // doplaty na kartach liczone wzgledem zestawu wybranego rodzaju
        const z = find(G[k], PRESET[st.rodzaj][k]);
        G[k].forEach((o) => {
          const el = konf.querySelector('input[name="' + k + '"][value="' + o.id + '"]');
          const sp = el && el.closest('label').querySelector('.konf-opt__p > span');
          if (sp) sp.textContent = o === z ? 'w cenie' : sgn(o.p - z.p) + ' ceny';
        });
      });
      const pre = c.rod.from ? 'od ' : '';
      const tot = $('konfTotal');
      tot.textContent = pre + zl(c.total);
      $('konfNavPrice').textContent = pre + zl(c.total);
      if (prevTotal !== null && prevTotal !== c.total) {
        const d = c.total - prevTotal;
        $('konfDelta').textContent = (d > 0 ? '+' : '−') + zl(Math.abs(d));
        tot.classList.remove('is-pulse');
        void tot.offsetWidth;
        tot.classList.add('is-pulse');
      }
      prevTotal = c.total;
      $('konfUpto').textContent = 'Górna granica, jeśli opis okaże się niepełny: ' + zl(c.hi) + '.';
      let l = '<li class="is-base"><span>' + c.rod.t + ' (cena wyjściowa)</span><span>' + zl(c.rod.base) + '</span></li>';
      c.lines.forEach((x) => {
        l += '<li class="' + (x.a < 0 ? 'is-neg' : '') + '"><span>' + x.n + '</span><span>' + sgn(x.p) + ' · ' + (x.a < 0 ? '−' : '+') + zl(Math.abs(x.a)) + '</span></li>';
      });
      if (!c.lines.length) l += '<li><span>Bez dopłat i rabatów</span><span>0 zł</span></li>';
      if (c.mon) l += '<li class="is-base"><span>' + c.sv.t + '</span><span>' + zl(c.mon) + ' / mies.</span></li>';
      $('konfLines').innerHTML = l;

      const web = st.ui === 'web';
      const pc = konf.querySelector('input[name="gdzie"][value="pc"]');
      if (pc) pc.disabled = web;
      $('konfDepGdzie').hidden = !web;
      $('konfOkresWrap').hidden = st.serwis === 'brak';
      const tooBig = st.rodzaj === 'mikro' && c.total > 150;
      const dep = $('konfDepRodzaj');
      const txt = st.rodzaj === 'app'
        ? 'Aplikacja to największy rodzaj. Kwota jest punktem wyjścia. Cenę ustalamy po rozmowie o zakresie, o ile się podejmę.'
        : tooBig ? 'Przy takich wymaganiach to już raczej Skrypt. Lepiej wybrać wyższy rodzaj albo zmniejszyć zakres, wtedy cena będzie uczciwsza.' : '';
      dep.hidden = !txt;
      dep.textContent = txt;
      diagram(c);
      calRender();
      recap(c);
      save();
    }
    function recap(c) {
      const rows = [['Rodzaj', c.rod.k + ' (' + c.rod.t + ')', 'rodzaj']];
      GROUPS.forEach((k) => rows.push([LAB[k], find(G[k], st[k]).t + (k === 'termin' && st.data ? ', do ' + dataOpis(st.data) : ''), k]));
      rows.push(['Serwis', c.sv.t + (c.mon ? ', ' + c.ok.t.toLowerCase() : ''), 'serwis']);
      rows.push(['Cena orient.', (c.rod.from ? 'od ' : '') + zl(c.total) + ' (górna granica ' + zl(c.hi) + ')', null]);
      $('konfRecap').innerHTML = rows.map((r) => {
        const s = r[2] === null ? -1 : STEP_OF[r[2]];
        const u = s >= 1 && s <= 3 && unsure[s];
        return '<div><span>' + r[0] + '</span><span>' + r[1] + (u ? ' · do ustalenia razem' : '') + '</span>' +
          (s >= 0 ? '<button type="button" data-go="' + s + '" aria-label="Zmień: ' + r[0] + '">zmień</button>' : '<span></span>') + '</div>';
      }).join('');
    }

    /* ---------- kroki ---------- */
    function go(i, focus) {
      step = Math.max(0, Math.min(5, i));
      wrap.dataset.step = String(step);
      konf.querySelectorAll('.konf-pane').forEach((p) => { p.hidden = +p.getAttribute('data-pane') !== step; });
      konf.querySelectorAll('.konf-seg').forEach((b, k) => {
        b.classList.toggle('is-done', k < step);
        b.classList.toggle('is-on', k === step);
        if (k === step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
      $('konfN').textContent = String(step + 1).padStart(2, '0');
      $('konfT').textContent = STEPS[step][1];
      $('konfPrev').hidden = step === 0;
      $('konfPrev').textContent = '← ' + (step > 0 ? STEPS[step - 1][1] : 'Wstecz');
      $('konfNext').hidden = step === 5;
      $('konfNext').textContent = 'Dalej: ' + STEPS[Math.min(5, step + 1)][1] + ' →';
      const left = 5 - step;
      $('konfLeft').textContent = step === 5 ? 'ostatni krok' : 'zostało ' + left + ' ' + (left === 1 ? 'krok' : left < 5 ? 'kroki' : 'kroków');
      document.querySelectorAll('#konf [data-unsure]').forEach((b) => {
        const k = +b.getAttribute('data-unsure');
        b.setAttribute('aria-pressed', unsure[k] ? 'true' : 'false');
        b.textContent = unsure[k] ? '✓ Ustalimy razem' : 'Nie wiem, ustalmy razem';
      });
      if (focus) {
        wrap.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        const h = $('konfH' + step);
        if (h) h.focus({ preventScroll: true });
      }
      save();
    }

    /* ---------- zdarzenia konfiguratora ---------- */
    konf.addEventListener('change', (e) => {
      const t = e.target;
      if (t.type !== 'radio') return;
      if (t.name === 'rodzaj') {
        const keep = st.data;
        st = Object.assign({ rodzaj: t.value }, PRESET[t.value]); unsure = {};
        if (keep) { st.data = keep; st.termin = terminZDaty(dniDo(keep)); }
        syncRadios();
      }
      else {
        st[t.name] = t.value;
        if (t.name === 'termin') st.data = '';
        if (t.name === 'ui' && t.value === 'web' && st.gdzie === 'pc') { st.gdzie = 'srv'; syncRadios(); }
      }
      render();
    });
    wrap.addEventListener('click', (e) => {
      const g = e.target.closest('[data-go]');
      if (g) { go(+g.getAttribute('data-go'), true); return; }
      const dd = e.target.closest('[data-date]');
      if (dd) {
        st.data = dd.getAttribute('data-date');
        st.termin = terminZDaty(dniDo(st.data));
        syncRadios();
        render();
        const again = konf.querySelector('[data-date="' + st.data + '"]');
        if (again) again.focus();
        return;
      }
      const cn = e.target.closest('[data-cal-nav]');
      if (cn) {
        const idx = calY * 12 + calM + (+cn.getAttribute('data-cal-nav'));
        calY = Math.floor(idx / 12); calM = idx % 12;
        calRender();
        return;
      }
      if (e.target.closest('#konfCalClear')) { st.data = ''; render(); return; }
      const u = e.target.closest('[data-unsure]');
      if (u) {
        const k = +u.getAttribute('data-unsure');
        unsure[k] = !unsure[k];
        u.setAttribute('aria-pressed', unsure[k] ? 'true' : 'false');
        u.textContent = unsure[k] ? '✓ Ustalimy razem' : 'Nie wiem, ustalmy razem';
        render();
      }
    });
    $('konfNext').addEventListener('click', () => go(step + 1, true));
    $('konfPrev').addEventListener('click', () => go(step - 1, true));

    /* „Dołącz do wiadomości”: tekst podsumowania trafia do formularza (app.js słucha konfigurator:gotowe) */
    $('konfDolacz').addEventListener('click', () => {
      const c = calc(st), k = podsumowanie(c);
      const tekst = 'Konfigurator na stronie (cena orientacyjna):\n' +
        'Rodzaj: ' + k.rodzaj + (k.od ? ' (cena od)' : '') + '\n' +
        'Moduły: ' + k.mod.map((m) => m[0] + ' (' + m[1] + ')').join(', ') + '\n' +
        (k.data ? 'Termin docelowy: ' + k.data + '\n' : '') +
        'Serwis: ' + k.serwis + '\n' +
        (k.ust.length ? 'Do ustalenia razem: ' + k.ust.join(', ') + '\n' : '') +
        'Cena orientacyjna: ' + (k.od ? 'od ' : '') + zl(k.cena) + ' (górna granica ' + zl(k.hi) + ')';
      window.dispatchEvent(new CustomEvent('konfigurator:gotowe', { detail: {
        tekst: tekst, skrot: c.rod.t + ', ' + (k.od ? 'od ' : '') + zl(k.cena),
        temat: st.rodzaj === 'app' ? 'Aplikacja na zamówienie' : 'Skrypt lub automatyzacja' } }));
    });

    load();
    if (st.data) { const d0 = parseIso(st.data); calY = d0.getFullYear(); calM = d0.getMonth(); }
    build();
    syncRadios();
    render();
    go(step, false);

    $('konfH' + step).focus({ preventScroll: true });
  }
  window.Konfigurator = { zamontuj: zamontuj };
})();
