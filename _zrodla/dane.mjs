// dane.mjs — jedno źródło cennika i szybkich pytań. Czyta je .github/buduj/sklej.mjs i wstawia w strony
// (Oferta, Start, okienko „Szybkie pytania”, dane strukturalne). Zmiana ceny = zmiana tutaj i `node .github/buduj/sklej.mjs`.

export const EMAIL = 'cybersora@zohomail.eu';

// grupa: 'google' albo 'kod'. temat = wartość pola „temat” w formularzu (?temat=…).
export const USLUGI = [
  { id: 'skan', grupa: 'google', nazwa: 'Skan widoczności', krotko: 'Darmowy skan Twojej strony', cena: '0 zł', czas: 'do 2 dni roboczych',
    lead: 'Sprawdzam, czy Google widzi Twoją stronę, czy działa na telefonie i czy szybko się ładuje. Bez zobowiązań.',
    przyklady: ['raport z listą usterek', 'co poprawić najpierw'], temat: 'Darmowy skan widoczności', cta: 'Poproś o skan', schema: ['Darmowy skan widoczności w Google', '0'] },
  { id: 'start', grupa: 'google', nazwa: 'Pakiet Start', krotko: 'Wizytówka Google i poprawki strony', cena: '490 zł', czas: 'do 7 dni',
    lead: 'Zakładam albo porządkuję wizytówkę Google, a na stronie poprawiam to, co skan pokazał jako najpilniejsze.',
    przyklady: ['kategorie, opis, zdjęcia, godziny', 'tytuł, opis i nagłówki strony'], temat: 'Pakiet Start (490 zł)', cta: 'Zamów Start', schema: ['Wizytówka Google i poprawki strony (Start)', '490'] },
  { id: 'pelny', grupa: 'google', nazwa: 'Pakiet Pełny', krotko: 'Pełna widoczność', cena: '990 zł', czas: 'do 14 dni',
    lead: 'Wszystko ze Startu, a do tego opisy na wszystkich podstronach, dane, z których Google wie, gdzie i w jakich godzinach działasz, oraz plan zbierania opinii.',
    przyklady: ['opisy wszystkich podstron', 'adres i godziny czytelne dla Google', 'plan zbierania opinii'], temat: 'Pakiet Pełny (990 zł)', cta: 'Zamów Pełny', schema: ['Pełna widoczność w Google', '990'] },
  { id: 'meta', grupa: 'google', nazwa: 'Audyt Meta', krotko: 'Facebook i Instagram pod lupą', cena: 'od 500 zł', czas: 'termin po wycenie',
    lead: 'Sprawdzam, jak działa Twój profil na Facebooku i Instagramie: kto go ogląda, które posty trafiają do ludzi i co poprawić. Opieram się na statystykach profilu, do których sam dajesz mi wgląd. Niczego u Ciebie nie zmieniam.',
    przyklady: ['zasięg i zaangażowanie postów', 'co poprawić w profilu', 'plan, co publikować i kiedy'], temat: 'Audyt Meta (Facebook i Instagram)', cta: 'Zapytaj o wycenę' },

  { id: 'mikro', grupa: 'kod', nazwa: 'Mikro-skrypt', krotko: 'Jedno małe zadanie', cena: 'od 150 zł', czas: 'standard do 14 dni',
    lead: 'Małe zadanie na jeden wieczór: przerobić plik, zebrać dane z jednej strony, policzyć coś za Ciebie.',
    przyklady: ['jedna tabela z kilku plików', 'zmiana nazw setek plików naraz'], temat: 'Skrypt lub automatyzacja', cta: 'Zapytaj o wycenę' },
  { id: 'skrypt', grupa: 'kod', nazwa: 'Skrypt', krotko: 'Nudna robota zrobiona za Ciebie', cena: 'od 500 zł', czas: 'standard do 14 dni',
    lead: 'Robi za Ciebie nudną, powtarzalną robotę na komputerze albo w sieci.',
    przyklady: ['kilka plików Excela zebranych w jeden raport', 'ceny albo oferty ściągane z jednej strony', 'pliki poukładane według daty i klienta'], temat: 'Skrypt lub automatyzacja', cta: 'Zapytaj o wycenę' },
  { id: 'bot', grupa: 'kod', nazwa: 'Bot', krotko: 'Pilnuje czegoś całą dobę', cena: 'od 1 200 zł', czas: 'standard do 14 dni',
    lead: 'Pilnuje czegoś za Ciebie przez całą dobę i odzywa się, kiedy trzeba.',
    przyklady: ['powiadomienie o nowym zamówieniu', 'zapisy i przypomnienia bez ręcznego pisania', 'dwie usługi połączone ze sobą'], temat: 'Skrypt lub automatyzacja', cta: 'Zapytaj o wycenę' },
  { id: 'app', grupa: 'kod', nazwa: 'Aplikacja', krotko: 'Program pod jedną firmę', cena: 'od 5 000 zł', czas: 'termin po wycenie',
    lead: 'Program pisany pod jedną firmę, a nie pod uniwersalny formularz.',
    przyklady: ['program na komputer: kalendarz, klienci, magazyn', 'panel w przeglądarce dla zespołu', 'działa bez internetu, dane zostają u Ciebie'], temat: 'Aplikacja na zamówienie', cta: 'Zapytaj o wycenę' },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nb = (s) => esc(s).replace(/(\d) (\d)/g, '$1&nbsp;$2').replace(/ zł/g, '&nbsp;zł');
const link = (u) => '/kontakt/?temat=' + encodeURIComponent(u.temat);
const u = (id) => USLUGI.find((x) => x.id === id);

const karta = (x) => `<article class="usl" id="usl-${x.id}">
            <p class="usl__krotko">${esc(x.krotko)}</p>
            <h3 class="usl__nazwa">${esc(x.nazwa)}</h3>
            <p class="usl__cena"><b>${nb(x.cena)}</b><span>${esc(x.czas)}</span></p>
            <p class="usl__lead">${esc(x.lead)}</p>
            <ul class="lista">${x.przyklady.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
            <a class="usl__cta" href="${link(x)}">${esc(x.cta)} &rarr;</a>
          </article>`;

const siatka = (grupa) => USLUGI.filter((x) => x.grupa === grupa).map(karta).join('\n          ');

// Odpowiedzi w okienku „Szybkie pytania”: gotowe teksty, ceny z cennika powyżej.
const PYTANIA = [
  ['Ile to kosztuje?', `Ceny znasz z góry: skan widoczności ${nb(u('skan').cena)}, wizytówka Google z poprawkami strony ${nb(u('start').cena)}, skrypt ${nb(u('skrypt').cena)}, bot ${nb(u('bot').cena)}, aplikacja ${nb(u('app').cena)}.`, '/oferta/#cennik', 'Cały cennik'],
  ['Jak działa darmowy skan?', `Podajesz adres strony. W ciągu 2 dni roboczych dostajesz raport: co Google widzi u Ciebie, lista usterek i co poprawić najpierw. Nic nie musisz potem kupować.`, link(u('skan')), 'Poproś o skan'],
  ['Jak szybko odpiszesz?', 'Zwykle w 24 godziny, najdalej w 2 dni robocze. Odpisuję osobiście: biorę zlecenie, dopytuję albo odmawiam z krótkim powodem.', '/kontakt/', 'Napisz do mnie'],
  ['Co dostaję po zakończeniu?', 'Kod źródłowy, instrukcję i 14 dni bezpłatnych poprawek. Prawa autorskie przenoszę na Ciebie krótką umową po zapłacie.', '/oferta/', 'Zobacz ofertę'],
  ['Kto to robi?', 'Jedna osoba: Patryk Gwóźdź. Projektuję i piszę kod sam, więc rozmawiasz z tym, kto wykonuje pracę.', '/o-mnie/', 'O mnie'],
];

// Galeria zrzutów programu (Projekty): duży zrzut + miniatury; app.js podmienia obraz i otwiera podgląd na cały ekran.
const GALERIE = {
  salondesk: { nazwa: 'SalonDesk', plik: 'salondesk', v: '?v=2', zrzuty: [
    ['01-pulpit', 'Cały dzień salonu na jednym ekranie: wizyty, zespół i sprawy do załatwienia.'],
    ['02-grafik', 'Grafik zespołu na cały miesiąc: zmiany, urlopy i obsada każdego dnia.'],
    ['03-klientki', 'Kartoteka klientek: ostatnia wizyta, wydatki, źródło i pakiety w toku.'],
    ['04-kasa', 'Kasa z cennikiem salonu: gotówka, karta, bon albo pakiet na jednym paragonie.'],
    ['05-magazyn', 'Magazyn sam pokazuje, co zamówić, zanim czegoś zabraknie.']] },
  czytnik: { nazwa: 'SoraEbookReader', plik: 'soraczytnik', v: '', zrzuty: [
    ['01-biblioteka', 'Cała biblioteka na jednej półce: książki, light novel i mangi z Twoich folderów.'],
    ['02-czytanie', 'Spokojna typografia, zakreślenia z notatkami i postęp bez rozpraszania.'],
    ['03-ustawienia-czytania', 'Strona taka, jak lubisz: rozmiar, krój, kolory papieru i marginesy jednym kliknięciem.'],
    ['04-manga', 'Manga jak na papierze: rozkładówki, czytanie od prawej i przycinanie marginesów.'],
    ['05-seria', 'Każda seria pamięta tom, stronę i swój sposób czytania.']] },
};
const galeria = (g) => {
  const src = (z, min) => `/zrzuty_projektow/${g.plik}-${z}${min ? '-min' : ''}.webp${g.v}`;
  const [z0, o0] = g.zrzuty[0];
  return `<div class="gal" data-galeria data-gal-nazwa="${g.nazwa}">
            <figure class="gal__shot"><button type="button" class="gal__powieksz" data-gal-otworz aria-label="Powiększ zrzut na cały ekran"><img data-gal-duzy src="${src(z0)}" alt="${g.nazwa}: ${esc(o0)}" width="1600" height="1132" loading="lazy" decoding="async"><span class="gal__lupa" aria-hidden="true">Powiększ ⤢</span></button></figure>
            <p class="gal__opis" data-gal-podpis aria-live="polite">${esc(o0)}</p>
            <div class="gal__mini" role="group" aria-label="Zrzuty: ${g.nazwa}">
              ${g.zrzuty.map(([z, o], i) => `<button type="button" data-gal-src="${src(z)}" data-gal-opis="${esc(o)}" aria-pressed="${i === 0}" aria-label="${esc(o)}"><img src="${src(z, true)}" alt="" width="320" height="226" loading="lazy" decoding="async"></button>`).join('\n              ')}
            </div>
          </div>`;
};

// Lista usług w układzie, który czyta moduł SORA//OS (soraos.js): ten sam cennik, inny zapis.
const KONF = { mikro: 'mikro', skrypt: 'skrypt', bot: 'bot', app: 'app' };
const soraosLi = (x) => `<li data-id="${x.id}" data-cena="${esc(x.cena)}" data-czas="${esc(x.czas)}" data-topic="${esc(x.temat)}"${KONF[x.id] ? ` data-konf="${KONF[x.id]}"` : ''}>
            <article data-roboczy>
              <h4>${esc(x.nazwa)}</h4>
              <p data-pole="krotko">${esc(x.krotko)}</p>
              <p data-pole="lead">${esc(x.lead)}</p>
              <p data-pole="cena">${esc(x.cena)}</p>
              <p data-pole="czas">${esc(x.czas)}</p>
              <ul data-pole="przyklady">${x.przyklady.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
              <a href="${link(x)}">${esc(x.cta)}</a>
            </article>
          </li>`;
const soraosUslugi = `<section data-soraos-app="uslugi">
        <h2>Co zrobię</h2>
        <h3 data-soraos-grupa>Software</h3>
        <ul>
          ${USLUGI.filter((x) => x.grupa === 'kod').map(soraosLi).join('\n          ')}
        </ul>
        <h3 data-soraos-grupa>Widoczność w Google</h3>
        <ul>
          ${['skan', 'meta', 'start', 'pelny'].map((id) => soraosLi(u(id))).join('\n          ')}
        </ul>
      </section>`;

export const fragmenty = {
  'soraos-uslugi': soraosUslugi,
  'galeria-salondesk': galeria(GALERIE.salondesk),
  'galeria-czytnik': galeria(GALERIE.czytnik),
  'cennik-google': siatka('google'),
  'cennik-kod': siatka('kod'),
  pytania: PYTANIA.map(([q, a, href, t]) => `<details class="pyt__p"><summary>${esc(q)}</summary><p>${a}</p><a href="${href}">${esc(t)} &rarr;</a></details>`).join('\n      '),
  'cena-skan': nb(u('skan').cena), 'cena-start': nb(u('start').cena), 'cena-pelny': nb(u('pelny').cena), 'cena-meta': nb(u('meta').cena),
  'cena-mikro': nb(u('mikro').cena), 'cena-skrypt': nb(u('skrypt').cena), 'cena-bot': nb(u('bot').cena), 'cena-app': nb(u('app').cena),
  'schema-oferty': USLUGI.map((x) => `      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": ${JSON.stringify(x.schema ? x.schema[0] : x.nazwa + ': ' + x.krotko.toLowerCase())} }${x.schema ? `, "price": "${x.schema[1]}", "priceCurrency": "PLN"` : ''} }`).join(',\n'),
  tematy: [...new Set(USLUGI.map((x) => x.temat))].map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join(''),
  email: EMAIL,
};
