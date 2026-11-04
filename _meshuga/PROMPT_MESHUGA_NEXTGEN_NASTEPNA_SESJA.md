# START: Meshuga, sesja 9: „Meshuga myśli” na stałe + wpięcie w cybersora.pl

Wklej w nowej sesji: „Wracamy do Meshugi (Documents\Meshuga). Przeczytaj PROMPT_MESHUGA_NEXTGEN_NASTEPNA_SESJA.md (sekcja Sesja 9). Animacja myśli: wariant __ (A/B/C). Lecimy od punktu 0.”

## Sesja 9: stan na start (04.11 wieczór, sprawdzony)
- **Aplikacja (artefakt WNnVCAxaRz3AVA7HJa58oR Version 24, v1.21):** animacja działa. `meshuga-kot.js`: `kot.mysli(true|false)`, `MeshugaKot.wariantMysli('A'|'B'|'C')`, dwa canvasy `.mk-mysl` (tył przed `.mk-disk`, przód na końcu), tor jak pierścień Saturna, pętla rAF tylko w trakcie myślenia, pauza na ukrytej karcie, ruch wyłączony = statyczny przerywany pierścień. Źródło: `odpowiedz()` w `meshuga-app.src.html` (`etapyMysli()`, `bezMysli()` gasi przy pierwszym słowie i w `koniec`). Przełącznik makiety: Ustawienia → „Myśli · makieta” (`ust.mysli`, `data-ust="mysli"`). Kółko A przygasa do 0,28 (`.mk.mk-mysli .mk-ring-slot`).
- **Strona (`cybersora-pages`, master):** 4 commity NIEWYPCHNIĘTE (4ad42e7 kot w rogu, 8556942 bez choinki, 644ba72 modele, be57aed bez kątowników). Strona ma STARY `meshuga-kot.js` (bez `mysli`) i starą `meshuga/` (v1.20 bez animacji). Wdrożenie = push na master → GitHub Actions `pages.yml` → `.github/buduj/buduj.mjs` (minifikuje app.js/views.css/index.html, **nie rusza** `meshuga-kot.js`, `kot-czat.js` ani `?v=`).
- **Druga kopia strony:** `SoraWebsite\_artefakt_strona` (artefakt NaVzg49mNrNzHjvuxfww36), brudne drzewo z cudzą pracą: zmieniać tylko pliki okienka, nie commitować cudzego.
- Testy: 10 lokalnych, 369 sprawdzeń, 0 błędów (`test_modele.js` już pod etapy). `test_karty.js` = martwy test z v1.7 (do usunięcia albo zostawienia, zapytać jednym zdaniem).

## Sesja 9: research, czyli jak to wpiąć (wnioski z 04.11)
1. **Jedno źródło modułu.** `Meshuga\meshuga-kot.js` jest wzorcem; na stronę idzie kopią (`cybersora-pages\meshuga-kot.js` + kopia w `_artefakt_strona`). Aplikacja `/meshuga/` dostaje go wklejonego przez `buduj.py` (`strona\meshuga\meshuga.js`), więc wystarczy `python -I buduj.py` + `cp -r strona/meshuga/. ../cybersora-pages/meshuga/`. Do sprawdzenia, czy kopie są identyczne: `diff`, a w teście porównanie sha1.
2. **CSP strony** (`test_wdrozenie.js`, stała `CSP`): `script-src 'self'` bez inline, `style-src 'unsafe-inline'`. Canvas i `el.style.cssText` przechodzą; zero `<script>` inline i zero `eval`. Czcionka canvasa w wariancie C: Geist Mono z `/fonts/` (na stronie jest; w okienku przy 64 px i tak kwadraciki).
3. **Okienko strony (`kot-czat.js`, `zapytaj()`):** dziś „Meshuga pisze…” + `kot.squint(true)`, odpowiedź gotowa po 450 ms (bez `KOT_API`). Zmiany:
   - `kot.mysli(true)` przy wysłaniu, `kot.mysli(false)` w `gotowe()` (flash robi moduł, nie dublować `kot.flash()`);
   - „Meshuga pisze…” → jeden krótki etap z tematu (ta sama logika co `etapyMysli()`, wydzielona do modułu jako `MeshugaKot.etapy(pytanie, {historia, zrzut})`, żeby aplikacja i okienko liczyły tak samo);
   - **decyzja maisy:** 450 ms to za krótko, żeby wstęga weszła i wyszła (wejście 0,55 s + wyjście 0,45 s). Rekomendacja: w trybie gotowych odpowiedzi minimum 1,2 s myślenia; przy prawdziwym `KOT_API` bez sztucznego czekania.
   - sprawdzić, czy kot w rogu jest widoczny przy otwartym panelu (telefon = arkusz, może go zasłaniać). Jeśli zasłonięty: animacja na awatarze w nagłówku okienka (`.kot__ava`, dziś zdjęcie) albo tylko napis etapu. Zrzut 375 i decyzja maisy;
   - zachować fallback bez `MeshugaKot` (zdjęcie `kot-128.webp` + kółko CSS, wtedy sam napis).
4. **Wydajność strony:** w `index.html` obowiązuje zasada „najwyżej dwie pętle naraz (mapa + kula)”. Wstęga to trzecia pętla, ale tylko na czas myślenia (1–3 s) i tylko po kliknięciu. Zapisać ten wyjątek w komentarzu przy `zapytaj()`; strażnik: po odpowiedzi `requestAnimationFrame` wstęgi stoi (licznik klatek modułu = 0).
5. **Cache:** podbić `?v=` przy `kot-czat.css/js` i `meshuga-kot.js` w `index.html` (obecnie `?v=20261104k`), inaczej przeglądarki odwiedzających zostaną przy starym module bez `mysli` i `kot-czat.js` się wysypie. Ochrona: w `kot-czat.js` wołać `if (kot && kot.mysli)`.
6. **Ruch ograniczony:** strona ma własny przełącznik animacji? Sprawdzić (`grep -n "reduced\|ruch" app.js`); moduł sam czyta `prefers-reduced-motion`, a przy wyłączonym ruchu rysuje statyczny pierścień.

## Sesja 9: synergia z nowym artefaktem strony (NaVzg49mNrNzHjvuxfww36, wersja 1793760145, przeczytana 04.11)
- **SOMI = Meshuga na stronie.** Trasa `#meshuga` (`data-view="somi"`, nav „Meshuga”, kafel w Przewodniku) to podstrona „POZNAJ MESHUGĘ”: hero, scena z żywym kotem (`#meshScenaKot`, `app.js` ok. linii 3538, montuje `MeshugaKot.mount(..., {ring:true})`), przyciski stanów **spokój / myśli / mówi** (`SOMI_MOOD('calm'|'thinking'|'speaking')`), przykładowa rozmowa w terminalu (`#somiDemoBody`, zapis, nie czat), lista „Co Meshuga już umie”, CTA „Zapytaj o Meshugę” → `#contact`.
- **Błąd w artefakcie strony:** `index.html` ładuje `meshuga-kot.js?v=20261104m`, ale **tego pliku nie ma wśród 87 opublikowanych plików**, więc w artefakcie scena i kot w rogu pokazują zapasowe zdjęcie. Przy publikacji dodać `meshuga-kot.js` do `files`.
- **Rekomendacja (do potwierdzenia przez maisę na starcie):** pełny czat zostaje osobną stroną **`cybersora.pl/meshuga/`** (aplikacja na cały ekran: pasek historii, konto, modele, nie mieści się w SPA z mapą i pętlami), a podstrona `#meshuga` staje się jej wejściem:
  1. hero `#meshuga`: główny przycisk **„Porozmawiaj z Meshugą →”** do `/meshuga/` (w artefakcie: link do artefaktu WNnVCAxaRz3AVA7HJa58oR), „Napisz do nas” jako drugi;
  2. stan **„myśli”** w scenie = `kot.mysli(true)` (ta sama wstęga), opis „myśli: wstęga krąży, oczy zmrużone”; przykładowa rozmowa przy `SOMI_MOOD('thinking')` też włącza wstęgę i pokazuje etap z `MeshugaKot.etapy()`;
  3. tekst „Podłączenie do czatu Meshugi jeszcze przed nami” i CTA „Chcesz być pierwszy, jak Meshuga ruszy pełną parą?” poprawić: czat już działa (pokazowy), link do niego;
  4. kot w rogu: „Czatuj” prowadzi do `/meshuga/` (już tak jest na żywo), a przy zwykłym pytaniu wstęga jak w aplikacji.
  Alternatywa B (czat wbudowany w `#meshuga` w SPA): odradzam, bo dubluje kod aplikacji, gryzie się z budżetem pętli (mapa + kula) i z pełnym ekranem aplikacji; dwa adresy (`#meshuga` i `/meshuga/`) zostają, ale z jasnym podziałem: poznaj / porozmawiaj.
- Pliki `app.js` i `index.html` artefaktu strony to teren karty strony: zmiany w scenie i CTA uzgodnić z maisą (dodatek 04.11 w `SoraWebsite\PROMPT_STRONA_NASTEPNA_SESJA.md`).

## Sesja 9: kolejność
0. `git status` + `git log -5` w `cybersora-pages` i `SoraWebsite\_artefakt_strona`. Nieśledzone pliki Pycodemath i zrzuty to cudza robota.
1. **Wybrany wariant na stałe w aplikacji:** usunąć przełącznik „Myśli · makieta”, `ust.mysli` (i kasować stary zapis jak przy `ust.konto`), przegrane orbity z `ORBITY` i gałąź `roj()` albo rysowania wstęg, `wariantMysli` zostaje tylko jeśli coś go używa. Wydzielić `MeshugaKot.etapy()`.
2. **Test-strażnik `test_mysli.js` (najpierw czerwony na v1.20 przez `MESHUGA_PLIK=` jak w `test_swieta.js`):** wstęga startuje przy wysłaniu i gaśnie przy pierwszym słowie, etap zgodny z tematem (cena / kod / pomysł / projekt / inne, z historią i bez), ruch wyłączony = brak pętli i statyczny pierścień, 3 s pomiaru rAF bez klatki > 50 ms, wstęga i napis nie nachodzą na pole wpisu ani na tekst odpowiedzi, po odpowiedzi 0 aktywnych pętli. Zrzuty 1280/768/375 + GIF z nagrania Playwrighta dla maisy.
3. **Okienko strony** wg punktu 3 researchu i `GOTOWE_DLA_STRONY.md` (sekcja „Meshuga myśli — jak wpiąć”, 9 kroków), w `cybersora-pages` i `_artefakt_strona`. `kot-czat.js` w `_artefakt_strona` należy do karty strony: przed edycją zapytać maisę, czy karta strony nie pracuje teraz równolegle (dodatek 04.11 na górze `SoraWebsite\PROMPT_STRONA_NASTEPNA_SESJA.md`). Po zmianie przepublikować też artefakt strony NaVzg49mNrNzHjvuxfww36 (najpierw `Artifact read`, publish tylko zmienionych plików przez `root` + `files`), bo czekają w nim jeszcze usunięte kątowniki. Rozszerzyć `test_kot_rog.js`: stan „myśli” w 3 szerokościach, fallback bez modułu, CSP, 404.
4. `python -I buduj.py`, kopia `strona\meshuga` na stronę, podbicie `?v=`, 10 testów + `test_mysli` + `test_kot_rog`, artefakt Meshugi (etykieta wersji), scoped commit w `cybersora-pages`.
5. **Push dopiero po „tak” maisy** (wtedy wychodzi też 4 zaległe commity), potem `test_zywo.js` (zakłada i usuwa konto testowe) i zrzut z żywej strony.
6. Na koniec: `GOTOWE_DLA_STRONY.md`, pamięć `project_meshuga.md`, ten prompt na sesję 10 (post świąteczny / etap 2).

Zasady bez zmian: bez poświaty, **zero kątowników**, paleta ink/krew/hot/kość, nic nie nachodzi na tekst, Edit zamiast sed, zrzuty oglądane Readem, raport z liczbami.

---

# (archiwum) Meshuga, sesja 8: animacja „Meshuga myśli” wokół kota

Wklej w nowej sesji: „Wracamy do Meshugi (Documents\Meshuga). Przeczytaj PROMPT_MESHUGA_NEXTGEN_NASTEPNA_SESJA.md (sekcja Sesja 8). Lecimy od makiety.”

## Sesja 8: cel i zasady (pomysł maisy 04.11)
Gdy Meshuga myśli (Pycode, ale też Astral przed pierwszym słowem), wokół kota ma się dziać **piękna animacja ładowania**, a obok krótki napis, **nad czym myśli**. Inspiracja maisy: shikigami Garuda Yuki z Jujutsu Kaisen, czyli płynna wstęga energii, która owija się wokół postaci i goni samą siebie. Bierzemy tylko **charakter ruchu** (płynna, żywa wstęga z „głową” i zanikającym ogonem, przyspiesza i zwalnia jak oddech), **nie** wygląd postaci z anime: żadnego ptaka, oczu, skrzydeł ani niczego, co da się rozpoznać jako Garuda.
- **Standard cybersory wygrywa:** BEZ poświaty i glow, paleta ink/krew/hot/kość, nic nie nachodzi na tekst. „Energia” to geometria i ruch, nie blur.
- **Gdzie:** kot w powitaniu (`#kotHero`, 188/140/112 px), awatar przy wiadomości (`.mk-av`, 40 px) i kot w rogu strony (`kot-czat.js`, 64 px). Na 40 i 64 px wersja uproszczona.
- **„Nad czym myśli”:** `sample` nie oddaje toku myślenia modelu, więc NIE udajemy, że czytamy jego myśli. Napis składamy z tego, co wiemy na pewno: etapy z logu (pamięć rozmowy, zrzut, model) i temat pytania z naszych słów-kluczy (cena → „przeglądam cennik”, kod → „czytam Twój kod”, pomysł → „rozkładam pomysł na kroki”, projekt → „szukam w projektach”). 2–4 krótkie etapy po kolei, ostatni trzyma się do pierwszego słowa. Zastępuje obecne „Pycode myśli · N s” (licznik sekund zostaje jako drobny dopisek).
- **Wydajność:** jedno SVG z kilkunastoma segmentami albo canvas 2D; tylko transform/opacity/stroke-dashoffset, pauza przy ukrytej karcie (jak `meshuga-kot.js`). `prefers-reduced-motion` = statyczny pierścień + sam napis.

## Kolejność
**04.11: makieta gotowa**, artefakt https://claude.ai/artifact/5vWwWy9ogGhRkTB8hvzA9E (plik `makieta-mysli.html`, test `zrzuty-testy\test_makieta_mysli.js` 20/20, 8 zrzutów w `zrzuty-testy\makieta-mysli`). Tor jak pierścień Saturna (przód pod pyszczkiem, tył za dyskiem, dwa canvasy), kółko A przygasa do 0,28 na czas myślenia. Czeka na wybór A/B/C. Uwaga maisy 04.11: **bez kątowników w rogach** (`feedback_bez_katownikow`), usunięte wszędzie (artefakt Version 23, cybersora-pages be57aed, niewypchnięte).
**04.11, v1.21 (artefakt Version 24):** animacja już w aplikacji: `kot.mysli(on)` + `MeshugaKot.wariantMysli(v)` w `meshuga-kot.js`, etapy zamiast „Pycode myśli” (oba modele, `etapyMysli()`), przełącznik **Ustawienia → „Myśli · makieta” A/B/C** (`ust.mysli`). Po wyborze: usunąć przełącznik, `ust.mysli` i przegrane orbity, dodać strażnik (pkt 3), przenieść do okienka strony. `test_modele.js` przerobiony (27/27), 10 testów 369 sprawdzeń 0 błędów. Strona (`cybersora-pages`) jeszcze bez tej zmiany.
1. **Makieta 3 wariantów** (`makieta-mysli.html`, artefakt, przycisk „myśli / gotowe”, rozmiary 188, 64 i 40 px):
   - **A „Wstęga”:** jedna gruba wstęga z krwi, która owija się po spirali wokół kółka (nad i pod kotem, maską przechodzi „za” głowę), z ostrą głową i ogonem z segmentów zanikających do kości;
   - **B „Dwie wstęgi”:** krew i kość krążą w przeciwnych kierunkach po elipsach pochylonych jak orbity atomu, splatają się i rozplatają w rytmie oddechu;
   - **C „Rój znaków”:** ogon wstęgi zbudowany ze znaków kodu (`{ } < > ; 0 1`, Geist Mono), litery płyną po torze i gasną, nawiązanie do tła ze spadającym kodem.
   Każdy wariant: wejście (wstęga wyłania się z kółka), pętla myślenia, wyjście po odpowiedzi (wstęga wraca w kółko + `flash()` oczu). Kot w tym czasie `squint(true)`.
2. Wybór maisy → moduł w `meshuga-kot.js` (`kot.mysli(true|false, {etap})`), ta sama animacja w aplikacji i w okienku strony.
3. Test-strażnik (najpierw czerwony): animacja startuje przy wysłaniu, gaśnie przy pierwszym słowie, napis etapu zmienia się zgodnie z tematem, reduced-motion = zero animacji, 60 klatek bez zacięć (pomiar `requestAnimationFrame` przez 3 s), nic nie nachodzi na powitanie i pole. Zrzuty 1280/768/375 + nagranie GIF przez Playwright dla maisy.
4. Build, 10 testów, artefakt; strona dopiero po „tak”.

---

# (archiwum) Meshuga next gen, sesja 7

Wklej w nowej sesji: „Wracamy do Meshugi (Documents\Meshuga). Przeczytaj PROMPT_MESHUGA_NEXTGEN_NASTEPNA_SESJA.md (sekcja Sesja 7). Kot w rogu: wybieram wariant __ (A/B/C). Lecimy od punktu 1.”

## Sesja 7: zrobione 04.11 (dopisane w trakcie)
- Kot w rogu = **wariant A**, wdrożony lokalnie: `cybersora-pages` commit 4ad42e7 (kot-czat.js/.css, meshuga-kot.js, index.html `?v=20261104k`), ta sama zmiana w `SoraWebsite\_artefakt_strona` (`?v=20261104m`; tam też niewdrożona praca nad kontem, nie moja). Test `zrzuty-testy\test_kot_rog.js`: przed 16 błędów, po 32/32 na obu kopiach; zrzuty `cybersora-pages\zrzuty-testy\kot-rog` (19 przed, 19 po). `test_wdrozenie` 14/14.
- **Choinka koło kota usunięta** (maisa: „wkurwia mnie”), v1.19, artefakt Version 21, `cybersora-pages` commit 8556942 (meshuga/). 9 testów lokalnych, 342 sprawdzenia, 0 błędów.
- **NIE wypchnięte**: push `cybersora-pages` (2 commity) dopiero po „tak” maisy, potem `test_zywo.js`.
- **ZROBIONE (v1.20, artefakt Version 22, cybersora-pages 644ba72):** modele Astral + Pycode, wariant C, ikony Astral 1 / Pycode 1, „Pycode myśli · N s”, bloki kodu z „Kopiuj”, na laptopie (≤900 px wysokości) mniejszy kot w powitaniu, na telefonie karty bez opisu i etykiet. 10 testów, 365 sprawdzeń, 0 błędów. Push 3 commitów (4ad42e7, 8556942, 644ba72) czeka na „tak”, potem `test_zywo.js`. Do sprawdzenia na prawdziwym modelu (Chrome maisy): czy Astral/Pycode trzymają limit, bloki kodu i znaczniki.
- (historia) Nowy pomysł maisy: **modele Meshugi** (Astral = szybki do wszystkiego: cybersora + pomoc z kodem; drugi myślący). Makieta `makieta-modele.html` (A menu / B przełącznik / C karty; nazwa drugiego: Kwazar / Zenit / Nova), zrzuty `zrzuty-testy\makieta-modele` (6). Czeka na wybór. Technicznie: Astral = `quick`, myślący = `default` w `sample`; ZASADY trzeba poszerzyć o pomoc z kodem dla Astrala.

## Sesja 7: stan i kolejność (po 04.11)
Stan: Meshuga na żywo bez zmian (v1.18, cybersora-pages 49042b0). 04.11 powstała makieta `makieta-kot-rog.html` (3 warianty żywego kota z `meshuga-kot.js` w rogu strony, 64 px dysk / 84 px z kółkiem; zrzuty `zrzuty-testy\makieta-rog`, 4 zrzuty, 0 błędów konsoli). Style wariantów są w makiecie, gotowe do przeniesienia.
- A = kółko SVG z aplikacji (`ring: true`), B = obecne kółko CSS strony (`.kot__ring` + `.kot__skan`) i wektorowy kot zamiast `assety/kot-128.webp`, C = jak A, ale głowa wychyla się ponad dysk (maska, bez wąsów).
1. **Wdrożenie wybranego wariantu do okienka** (`cybersora-pages\kot-czat.js/.css`). Najpierw `git status`/`git log` w `cybersora-pages` (nieśledzone pliki Pycodemath to cudza robota, nie ruszać ani nie commitować). Kroki:
   - `meshuga-kot.js` skopiować do `cybersora-pages\` i dołączyć zwykłym `<script src>` przed `kot-czat.js` (CSP: zero skryptów inline), style `.mk*` przenieść do `kot-czat.css` w przestrzeni `.kot` (tokeny `--k-*`).
   - W `kot-czat.js`: `btn` montuje `MeshugaKot.mount(...)`; `kot.squint(true)` przy „Meshuga pisze…”, `squint(false)` + `flash()` po odpowiedzi; awatar `.kot__ava` w nagłówku okienka może zostać zdjęciem (decyzja maisy, zapytać jednym zdaniem).
   - Fallback: gdy `MeshugaKot` się nie wczyta, zostaje obecne tło `kot-128.webp` (nie pusty przycisk).
   - Zachować: kropkę podpowiedzi `.kot__dot`, obrót kółka po otwarciu, focus-visible, reduced-motion (statyczny kot), arkusz na telefonie, odsunięcie nad paskiem konfiguratora w Kontakcie.
   - Testy Playwright: 375/768/1280, stany zamknięte/otwarte/„pisze…”/po odpowiedzi/podpowiedź, reduced-motion, konsola i sieć; zrzuty w `cybersora-pages\zrzuty-testy\kot-rog`, obejrzane Readem. Raport z liczbami.
   - Commit tylko plików okienka (skill `commit-scoped` jeśli trzeba). **Push/wdrożenie na cybersora.pl dopiero po „tak” maisy**, potem `test_zywo.js`.
2. **Post świąteczny** („u nas święta zaczynają się wcześniej”, link cybersora.pl/meshuga): szkic do `EKSPANSJA CYBERSORY\KOLEJKA_PUBLIKACJI.md`; tekst pisze maisa, ja poprawiam i robię grafikę/rolkę (remotion).
3. **Etap 2** z `RESEARCH_NEXTGEN_03-11.md` (panel canvas na wycenę/brief, kot reaguje na treść, numer #CS-xxxx): makieta wariantów przed kodem.
Po zmianie aplikacji Meshugi: `python -I buduj.py`, 9 testów lokalnych, publikacja artefaktu; strona tylko po „tak”.
Obserwacja do decyzji (bez zmian): płatek śniegu potrafi przelecieć pod napisem „MESHUGA · SZYBKI”.

---

# (archiwum) Meshuga next gen, sesja 6

## Sesja 6: stan i kolejność (po 03.11 wieczór)
Stan: **Meshuga NA ŻYWO na https://cybersora.pl/meshuga/** (v1.18, cybersora-pages 49042b0), „Czatuj” z okienka w rogu prowadzi tam z pytaniem. Artefakt Version 20. Konto A wybrane, okno konta bez objaśnień (zasada 11 karty standardu). 10 testów: 366 sprawdzeń, 0 błędów (`test_zywo.js` łączy się z prawdziwą stroną i Workerem, zakłada i usuwa konto testowe; odpalać tylko po wdrożeniu).
1. **Kot animowany w rogu strony** (`meshuga-kot.js` zamiast kółka CSS w `cybersora-pages\kot-czat.js/.css`): makieta 2–3 wariantów (rozmiar 64 px, kółko A, mruganie, `squint` przy „pisze…”) do wyboru maisy, potem wdrożenie (osobne „tak”). **04.11: makieta gotowa** (`makieta-kot-rog.html`: A kółko z aplikacji, B obecne kółko strony + wektorowy kot, C wychylony; zrzuty w `zrzuty-testy\makieta-rog`), czeka na wybór. Plik okienka należy do karty strony: sprawdź `git status`/`git log` w `cybersora-pages` przed edycją.
2. **Post świąteczny** („u nas święta zaczynają się wcześniej”, link cybersora.pl/meshuga): szkic do `EKSPANSJA CYBERSORY` (`KOLEJKA_PUBLIKACJI.md`); tekst pisze maisa, ja poprawiam i robię grafikę/rolkę (remotion).
3. **Etap 2** z `RESEARCH_NEXTGEN_03-11.md` (makieta wariantów przed kodem).
Po każdej zmianie aplikacji: `python -I buduj.py`, 9 testów lokalnych (`test_wdrozenie, test_strona, test_konto, test_swieta, test_pasek, test_wersja, test_platek, test_v4, test_v5`), zrzuty Readem, publikacja artefaktu z etykietą; na stronę: skopiować `strona\meshuga\*` do `cybersora-pages\meshuga\` i wdrożyć dopiero po „tak”.
Obserwacja do decyzji: płatek śniegu potrafi przelecieć pod napisem „MESHUGA · SZYBKI” w nagłówku (omijają tylko kota i choinkę, zgodnie z decyzją 03.11).

---

# (archiwum) Meshuga next gen, sesja 5

Wklej to w nowej sesji (katalog `Documents\Meshuga`).

## Kontekst
- Aplikacja Meshugi (AI Chatbot cybersory) = artefakt https://claude.ai/artifact/WNnVCAxaRz3AVA7HJa58oR (Version 10, v1.8), odpowiada przez `sample` (prawdziwy Claude), bez zgody: tryb pokazowy. Capabilities: `{sample: {images: true}}`. Przy ponownej publikacji pomijaj `capabilities`, żeby zostały. Przed publikacją z nowej rozmowy najpierw `Artifact read` (inaczej odmowa).
- Źródło: `meshuga-app.src.html` → `python -I buduj.py` → `meshuga-app.html` → publikacja tym samym plikiem z etykietą wersji. Moduł kota: `meshuga-kot.js` (od v1.8 tylko kółko A, `ring: true/false`).
- Testy (`PW_HEADLESS=true node ~/.claude/skills/playwright-skill/run.js zrzuty-testy/<plik>`), stan 03.11: 144/144:
  - `test_wersja.js`: jedna wersja (karty-widget, kółko A, tło kod, brak paska MAKIETA, mikrofon schowany w ramce), 49 sprawdzeń, 7 zrzutów;
  - `test_platek.js`: płatek w „Co umiem”, 3 szerokości, 18 sprawdzeń;
  - `test_v4.js`: komendy, kalkulator, brief, Ctrl+K, mikrofon, historia, 30 sprawdzeń;
  - `test_v5.js`: „Oceń mój zrzut” z makietą `sample`, 47 sprawdzeń.
- Zasady: karta `cybersora-assets\STANDARD_GRAFICZNY_CYBERSORA.md` (paleta ink/krew/hot/kość, Sora + Geist Mono, BEZ glow, bez bocznych linijek HUD, nic nie nachodzi na siebie, cudzysłowy „ ”, „cybersora” jednym słowem, bez Gorlic i telefonu). Meshuga = „AI Chatbot cybersory”. Edit zamiast sed -i. Zrzuty oglądać przez Read, raport z liczbami. Wygląd: warianty do wyboru maisy przed wdrożeniem.
- Pułapki: `var kb` w skrypcie (nie nazywaj funkcji `kb`); elementy z `display:flex/grid` potrzebują `[hidden]{display:none}`; w testach licz `.tekst li`; **narzędzie Edit obcina końcową spację w `new_string`** (`.karty.kv-2 ` → `.karty` zlepiło selektor `.karty.karta`) — przy replace_all selektorów zamieniaj całe fragmenty z następnym słowem.

## Zrobione w sesji 4 (03.11, v1.8)
- Wybór maisy: karty 2 (widget), płatek A, kółko A, tło 2 (spadający kod), teksty bez zmian. Przegrane warianty, pasek MAKIETA (KÓŁKO/TŁO/KARTY/PŁATEK/STAN) i stare klucze `ust` usunięte; kółka B/C i tło glitch wycięte z kodu.
- Mikrofon: w ramce claude.ai ikona schowana od razu; poza ramką chowa się przy `denied` albo pierwszym `not-allowed`.
- Prawdziwe odpowiedzi (Chrome maisy, 5 pytań): wszystkie z właściwymi znacznikami i < 90 słów, `ZASADY` bez zmian. Uwaga: rozmowa testowa „Ile kosztuje bot na Discorda…” została w historii przeglądarki maisy.

## Dopisane pod koniec sesji 4 (v1.9–1.10, Version 11–12)
- Święta (1.11–6.01, data): śnieg z kodu, czerwony płatek z lewej kota, choinka z kodu z prawej, napis „U nas święta zaczynają się wcześniej.”. Test `test_swieta.js` (48 sprawdzeń, podstawia datę; `MESHUGA_PLIK=<ścieżka>` pozwala odpalić go na starej wersji, żeby zobaczyć czerwony).
- Ikony kart z Recraft (zestaw „linia”, wektor, w `ikony\`; Recraft: 45 kredytów zostało).
- Karty zwarte do 860 px i przy niskim oknie; kot w pustym stanie bez stylu inline (telefon 120 px, w święta 112 px).
- v1.11 (Version 13): płatek dalej od kota i wyżej; nowe ikony paska bocznego (styl kart); płynne zwijanie paska (tylko szerokość, ikony stoją w miejscu, `overflow:clip`, szukajka rozwija pasek). Test `test_pasek.js` (20 sprawdzeń, na v1.8 14 błędów).
- v1.12 (Version 14): płatek przy kocie zastąpiony latającymi płatkami (`Lot`, symbol `#platekSym`, kolory `.k-czerw/.k-bialy/.k-czb/.k-bcz`), makieta „PŁATKI A dryf / B opad” — **czeka na wybór maisy**; po wyborze usunąć przełącznik i `ust.platki`.
- Razem 6 testów: 231 sprawdzeń, 0 błędów.
- Rekomendacja Claude'a na sesję 5: najpierw Meshuga na cybersora.pl przed grudniem (makieta rogu strony z kotem i „Czatuj” do akceptu), potem post świąteczny, potem etap 2.

## Do zrobienia w sesji 5 (kolejność ustalona 03.11)
0. **Zrobione 03.11 (v1.13–1.14, Version 15–16):** płatki = **opad** (wybór maisy), przełącznik usunięty; **płatki omijają kota i choinkę** (elipsa opisana na obu + 16 px, płatek zsuwa się bokiem po łuku; `strefa()/omin()` w `Lot`), strażnik w `test_swieta.js`: 0 kolizji na 1170 próbek (na v1.13: 43). Zostaje tylko pytanie, czy omijać też powitanie. Opis pierwotnego zadania zostawiony niżej dla porządku.
   - ~~Płatki mają omijać kota (uwaga maisy 03.11):~~ przelatujący za kotem płatek „dziwnie wygląda”. W `Lot.rysuj` dodać strefę wykluczenia = koło wokół `#kotHero` (promień kółka + margines ok. 24 px, liczone z `getBoundingClientRect` względem `.platki-lot`, przeliczane przy resize i zmianie stanu): płatek, który zbliża się do strefy, łagodnie skręca/odpycha się (siła rosnąca przy krawędzi, bez skoków), w ruchu B zsuwa się bokiem po łuku; przy starcie i odrodzeniu nie losować pozycji w strefie. Najlepiej to samo dla choinki (prostokąt `.choinka` + margines). Test-strażnik (najpierw czerwony na v1.12): przez ~3 s próbkować pozycje co klatkę i sprawdzić, że żaden środek płatka + jego promień nie wchodzi w koło kota (ani w choinkę); zrzuty 1280 i 375 w trybie A i B.
1. **Meshuga na cybersora.pl przed grudniem** (święta działają do 6.01, w prywatnym artefakcie nikt ich nie widzi):
   - przeczytać `GOTOWE_DLA_STRONY.md` i stan strony (`Documents\SoraWebsite`, sterownik `PLAN_DOPIESZCZENIE.md`, prompt `SoraWebsite\PROMPT_STRONA_NASTEPNA_SESJA.md`);
   - **makieta rogu strony** (kot w kółku + okienko szybkich pytań + „Czatuj” → pełna aplikacja) do akceptu maisy, zanim cokolwiek trafi na żywo;
   - bez własnego serwera Meshuga na stronie działa w trybie pokazowym (gotowe teksty + kalkulator + brief + komendy); „+” (zrzut) i głos zgodnie z `GOTOWE_DLA_STRONY.md`;
   - wdrożenie na żywo dopiero po „tak” maisy; testy Playwright na stronie (375/768/1280), zrzuty przed/po.
1b. **Konto i logowanie w Meshudze, połączone ze stroną** (prośba maisy 03.11: „na stronie to się robi teraz, więc to musi być i być połączone”, UI będzie trochę inne):
   - **Stan strony (sprawdzony 03.11):** konta robi Worker DancyCloud (`Documents\dancycloud\serwer`, gałąź `gui-kontener`, commit 87b0e8e): nick + hasło (PBKDF2), kod odzyskiwania, sesja 30 dni, trasy `/konto/*`; **jeszcze nie na żywo** — kolejność wdrożenia i znane braki w `SoraWebsite\PROMPT_DANCYCLOUD_WDROZENIE_KONT.md` (CORS przepuszcza tylko cybersora.pl, więc z artefaktu się nie połączy). Okienko Meshugi na stronie ma profil testowy (nick + awatar, localStorage `meshuga-profil`), „Czatuj” przekazuje `?q=` i `?nick=` (`SoraWebsite\PROMPT_STRONA_NASTEPNA_SESJA.md`, punkty 35–40). Otwarta decyzja z tamtego pliku: czy Meshuga bierze nick z konta gry.
   - **Cel:** jedno konto cybersory: to samo logowanie na stronie, w grze i w Meshudze; Meshuga na stronie i pełna aplikacja widzą ten sam nick/awatar i (do decyzji) tę samą historię rozmów.
   - **DECYZJE maisy 03.11:** (1) **jedno konto na wszystko** (strona + gra + Meshuga, konta Workera DancyCloud); (2) **historia rozmów tylko w przeglądarce** (konto = nick + awatar, bez zapisu rozmów na serwerze, bez nowej sekcji RODO o rozmowach); (3) adres **`cybersora.pl/meshuga`** (ta sama domena = wspólne localStorage, logowanie przechodzi samo); (4) płatki omijają tylko kota i choinkę, nie powitanie. Logowanie opcjonalne (gość pisze od razu).
   - **Fakty z kodu (03.11):** Worker `dancycloud\serwer\src\index.js`: `POST /konto/rejestracja {nick,haslo}` → 201 `{nick,token,waznyDo,kodOdzyskiwania}`; `POST /konto/logowanie {nick,haslo}` → `{nick,token,waznyDo}`; `POST /konto/wyloguj` (sesja, unieważnia wszystkie tokeny); `POST /konto/odzyskaj {nick,kod,noweHaslo}`; `GET /konto` (sesja) → `{nick,utworzone}`; `DELETE /konto {haslo}`. Sesja = nagłówek `Authorization: Bearer <token>` (nie ciasteczko). Błędy `{error,kod}` (401 `logowanie`/`sesja`, 409 nick zajęty). Strona trzyma sesję w localStorage **`dancycloud.sesja`** = `{nick,token,waznyDo}` (`_artefakt_strona\ranking.js`), nick gościa w `dancycloud.nick`, profil okienka Meshugi (nick + awatar webp) w **`meshuga-profil`** (`kot-czat.js`). Meshuga ma czytać i zapisywać te same klucze.
   - ~~Najpierw pytania do maisy~~ (odpowiedziane wyżej): (1) jedno konto dla wszystkiego czy osobne Meshugi? (2) historia rozmów na serwerze po zalogowaniu czy dalej tylko w przeglądarce (RODO: polityka prywatności do dopisania, `SoraWebsite\PROMPT_PRAWNY_WDROZENIE_1.md`)? (3) adres aplikacji: `cybersora.pl/meshuga` czy `meshuga.cybersora.pl` (od tego zależy, czy ciasteczko sesji Workera zadziała bez kombinowania z CORS)? (4) czy logowanie jest wymagane do czatu, czy opcjonalne (rekomendacja: opcjonalne, gość pisze od razu).
   - **UI (najpierw makieta wariantów do wyboru):** w pasku bocznym na dole profil (awatar + nick, menu: Konto / Wyloguj) zamiast samego „Ustawienia”; w zwiniętym pasku sam awatar; okno „Zaloguj / Załóż konto” w stylu aplikacji (nick + hasło + kod odzyskiwania pokazany raz, jak w panelu topki DancyCloud `dancycloud\ranking.js`); gość widzi „Zaloguj się” i może pisać dalej.
   - **Technicznie:** artefakt nie połączy się z Workerem (CORS + brak sieci w ramce), więc w artefakcie tylko makieta z udawanym API; prawdziwe połączenie dopiero na żywej stronie (ta sama domena co Worker albo dopisana do CORS). Kontrakt: `/konto/rejestracja`, `/konto/logowanie`, `/konto/ja`, `/konto/wyloguj` (sprawdzić dokładne trasy w kodzie Workera, nie zgadywać). Zero haseł w localStorage i w URL (nick w `?nick=` tylko jako podpowiedź, nie jako logowanie).
   - Kolejność: makieta UI → wybór maisy → aplikacja z udawanym API + testy → wdrożenie Workera (osobne „tak”, wg pliku DancyCloud) → podpięcie na żywo → test na żywo (konto testowe, logowanie na stronie, przejście „Czatuj”, ten sam nick w aplikacji, wylogowanie, usunięcie konta).
   - **ZROBIONE 03.11 (v1.15, Version 17): makieta + aplikacja z udawanym API.** Moduł `Konto` w źródle: okno „Zaloguj / Załóż konto / Odzyskaj” (te same zasady nicku i hasła co Worker), kod odzyskiwania pokazany raz, panel konta (nick, „od RRRR-MM-DD”, Wyloguj), te same klucze co strona (`dancycloud.sesja`, `dancycloud.nick`, `meshuga-profil` z awatarem), podpowiedź nicku z `?nick=`, wygasła sesja = gość, zmiana sesji w innej karcie (`storage`). Na `*.cybersora.pl` gada z prawdziwym Workerem (`DC_API`), gdzie indziej udawany serwer (tylko nicki, zero haseł), napis MAKIETA w oknie. **Czeka na wybór maisy: KONTO A (profil w pasku) / B (awatar w nagłówku)** — po wyborze usunąć przełącznik `.makieta`, `ust.konto`, regułę przegranego wariantu i `ustawMiejsceKonta`. Test `test_konto.js` 73 sprawdzenia (4 warianty × szerokości). Przy okazji naprawione: panele (Ustawienia, Napisz, Konto) na telefonie były o 42 px za szerokie (brak `box-sizing`) i leżały pod szufladą paska.
   - **ZROBIONE 03.11 (v1.16, Version 18): wybór maisy = KONTO A (profil w pasku).** Przełącznik makiety, wariant B (`#kontoBtnB`, `.konto-gora`, `.panel-konto.gora`), `ust.konto` i `ustawMiejsceKonta` usunięte; stary zapis `ust.konto` kasowany przy starcie. `test_konto.js` = strażnik jednej wersji (czerwony na v1.15: 6 błędów), 3 szerokości (1280/768/375), 58 sprawdzeń. Razem 7 testów: 294 sprawdzenia, 0 błędów.
   - **Zostaje:** wdrożenie Workera i strony (wg `SoraWebsite\PROMPT_DANCYCLOUD_WDROZENIE_KONT.md`, osobne „tak”), potem test na żywo jak wyżej. Usuwanie konta celowo nie ma w Meshudze (jest w panelu gry na stronie).

2. **Post świąteczny** („u nas święta zaczynają się wcześniej”, Meshuga na stronie): szkic do `EKSPANSJA CYBERSORY` (kolejka `KOLEJKA_PUBLIKACJI.md`); tekst pisze maisa, ja poprawiam i robię grafikę/rolkę (remotion).
3. **Etap 2 z `RESEARCH_NEXTGEN_03-11.md`** (jeśli zostanie czas), najpierw makieta wariantów:
   - panel po prawej na wycenę/brief (szeroki ekran; telefon bez zmian);
   - kot reaguje na treść: uszy w dół przy błędzie, szerokie oczy przy cenie (`[[WYCENA]]`), API w `meshuga-kot.js`;
   - numer sesji `#CS-xxxx` widoczny w rozmowie.
4. Na koniec: `GOTOWE_DLA_STRONY.md`, pamięć `project_meshuga.md`, ten prompt na sesję 6.

Stan na koniec sesji 4: artefakt Version 17 (v1.15), 7 testów = 309 sprawdzeń, 0 błędów.

Po każdym punkcie: build, 7 testów (`test_konto, test_swieta, test_pasek, test_wersja, test_platek, test_v4, test_v5`), obejrzeć zrzuty, publikacja z etykietą.
