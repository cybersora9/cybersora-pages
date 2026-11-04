# Meshuga: gotowe do wpięcia na stronę (03.11.2026, v1.8)

Status: **wygląd wybrany (03.11, v1.8)**: karty-widget (wariant 2), płatek A, kółko A, tło „spadający kod”, powitanie „Od czego zaczynamy?”, tryby „Szybki / Dokładny”, charakter bez zmian. Pasek MAKIETA usunięty. Wpięcie na żywą stronę dopiero po osobnym „tak” maisy.

- Artefakt aplikacji: https://claude.ai/artifact/WNnVCAxaRz3AVA7HJa58oR (odpowiada przez Claude'a w artefakcie; bez zgody widza = tryb pokazowy z gotowymi tekstami)
- Źródło: `Documents\Meshuga\meshuga-app.src.html` → `python -I buduj.py` → `meshuga-app.html` (czcionki i moduł kota wklejane)
- Kot statyczny (warstwy): `cybersora-assets\logo\kot-awatar\meshuga.svg`
- Moduł animacji + kółka: `Documents\Meshuga\meshuga-kot.js`

## Jak wpiąć kota (róg strony, przycisk „Czatuj”)
1. Dołącz `meshuga-kot.js` i z `meshuga-app.src.html` skopiuj blok CSS „kot (moduł meshuga-kot.js)” (klasy `.mk*`, zmienne `--mk-futro`, `--mk-obrys`, `--mk-disk`, `--krew`, `--hot`, `--kosc`, `--fg`, `--mono`).
2. `<div id="kotRog" style="width:64px"></div>` → `const kot = MeshugaKot.mount(document.getElementById('kotRog'), { ring: true })`.
3. API: `kot.squint(true/false)` przy „pisze…” (kółko przyspiesza ×3,2), `kot.flash()` po odpowiedzi, `kot.setRing(true/false)` (od v1.8 jest tylko kółko A), `kot.destroy()`, `MeshugaKot.setMotion(false)` = wyłącz animacje.
4. Rozmiary sprawdzone: 40 px (bez kółka, w pasku i przy odpowiedzi), 188 px (z kółkiem, pusty stan). Kółko zajmuje zewnętrzne 12% promienia.
5. Ruch: tylko transform/opacity; pauza przy ukrytej karcie; reduced-motion = statyczny kot.

Kontrakt pod serwer (później): jak `kot-czat.js` strony, POST `{q, widok, historia}` → `{odpowiedz, link}`. Znaczniki w odpowiedzi modelu: `[[KARTA:id]]`, `[[PROJEKT:id]]`, `[[ZESPOL]]`, od v1.3 także `[[WYCENA:typ+dodatek]]` (kalkulator) (opis w `ZASADY` w źródle aplikacji).

Od v1.4 (03.11): brief w 5 pytaniach i komendy `/cena /brief /projekty /skan /nowy` działają lokalnie, bez serwera i modelu, więc przejdą na stronę 1:1. Kot ma nowy stan `kot.slucha(true/false)` (mikrofon). Głos (Web Speech) na żywej stronie zadziała w Chrome i Edge; w ramce artefaktu dostęp do mikrofonu może być zablokowany.

Od v1.5–1.8 (03.11):
- „Oceń mój zrzut” (v1.5): „+”, upuszczenie albo Ctrl+V → `sample` z `images`. Na stronie potrzebny serwer przyjmujący obraz (kontrakt jak wyżej + pole `obraz` base64, ≤ 5 MB, png/jpeg/webp/gif); bez niego chowamy „+”.
- Płatek śniegu w „Co umiem” (v1.6, wariant A): canvas pod kartami, slot trzyma miejsce; powyżej 860 px płatek między kolumnami ze strumieniami do kart, niżej nad kartami bez strumieni. Bez poświaty.
- Mikrofon (v1.8): w ramce claude.ai ikona jest chowana od razu (`window.claude.use` = ramka); poza ramką chowa się, gdy `permissions` zwraca `denied` albo przy pierwszym błędzie `not-allowed`. Na stronie głos zostaje.
- Święta (v1.10, 1.11–6.01, sterowane datą `sezonSwiat()`): śnieg z kodu w tle (`tloSnieg`), czerwony płatek SVG z lewej kota (`platekHero`), choinka z kodu z prawej (`choinka`), napis „U nas święta zaczynają się wcześniej.”. Poza sezonem wszystko znika samo, wraca spadający kod.
- Ikony kart (v1.10): Recraft, zestaw „linia”, wektor. Źródło `ikony\zestaw1_linia.svg` → `python -I ikony\tnij_ikony.py` → `ikony_zestaw1.html` (ukryte ścieżki) + `ikony_ciecia.json` (viewBox każdej ikony); `buduj.py` wkleja oba. Ikona = `<svg viewBox>` + maska z `<use href="#ikZestaw">`, kolor `currentColor`.
- Do 860 px szerokości albo przy oknie niższym niż 720 px karty są zwarte, bez ikon (inaczej przycinały powitanie na tablecie).
- Prawdziwe odpowiedzi sprawdzone 03.11 w claude.ai (5 pytań): wycena → kalkulator + „do zespołu”, pomysł → /brief, projekty → karta projektu, widoczność → skan + Start, porównanie → 2 karty + kalkulator; wszystkie poniżej 90 słów.

## NA ŻYWO od 03.11.2026 (v1.18, cybersora-pages 49042b0)
- Pełna aplikacja: **https://cybersora.pl/meshuga/** (tryb pokazowy: gotowe teksty, kalkulator, brief, komendy; konto cybersory na prawdziwym Workerze). „+” (zrzut) wyłączony bez serwera, mikrofon schowany, bo strona wysyła `Permissions-Policy: microphone=()` (decyzja maisy: zostaje).
- Build: `python -I buduj.py` robi też `strona\meshuga\index.html` + `meshuga.js` (CSP strony: bez skryptów inline, czcionki z `/fonts/`). Wdrożenie = skopiować oba pliki do `cybersora-pages\meshuga\`, commit tylko tych plików, push (GitHub Pages ~45 s).
- Okienko w rogu (`cybersora-pages\kot-czat.js`): domyślny adres aplikacji `/meshuga/`, „Czatuj” przenosi pytanie w `?q=` (aplikacja wysyła je sama i czyści adres) i nick w `?nick=`.
- Testy: `test_strona.js` (build pod CSP, 39), `test_wdrozenie.js` (droga róg → aplikacja na kopii cybersora-pages, 14; `NAKLADKA=` podmienia pliki do testu czerwonego), `test_zywo.js` (prawdziwa cybersora.pl + konto testowe zakładane i usuwane, 19).
- Zostaje: animowany kot z `meshuga-kot.js` w rogu zamiast kółka CSS (makieta do wyboru maisy). Uwaga: `SoraWebsite\_artefakt_strona\kot-czat.js` (artefakt strony) nadal domyślnie wskazuje artefakt aplikacji; żywa wersja jest w `cybersora-pages`.

## „Meshuga myśli” — jak wpiąć na stronę (04.11.2026, v1.21; wariant do wyboru maisy A/B/C)
Gotowe w aplikacji (artefakt Version 24). Na stronie jeszcze NIE ma. Instrukcja dla karty strony albo dla sesji 9 Meshugi:
1. **Moduł:** skopiować `Documents\Meshuga\meshuga-kot.js` do `cybersora-pages\` i `SoraWebsite\_artefakt_strona\` (stara kopia nie ma `mysli`). Podbić `?v=` przy `meshuga-kot.js`, `kot-czat.js`, `kot-czat.css` w `index.html` (teraz `20261104k` / `20261104m`).
2. **API:** `kot.mysli(true)` przy wysłaniu pytania, `kot.mysli(false)` gdy jest odpowiedź (moduł sam robi błysk oczu i mrużenie; nie dublować `squint`/`flash`). `MeshugaKot.wariantMysli('A'|'B'|'C')` = wybór wariantu (po decyzji maisy na stałe w module). Wstęga rysuje się na dwóch `<canvas class="mk-mysl">` wstawianych w element kota, 22% poza jego obrys, więc rodzic nie może mieć `overflow:hidden` tuż przy kocie.
3. **CSS (do `kot-czat.css`, w przestrzeni `.kot`):** `.mk-ring-slot{transition:opacity .45s}` + `.mk.mk-mysli .mk-ring-slot{opacity:.28}` (kółko przygasa, gra wstęga).
4. **`kot-czat.js`, funkcja `zapytaj()`:** zamiast `kot.squint(true)` → `if (kot && kot.mysli) kot.mysli(true); else if (kot) kot.squint(true);`, w `gotowe()` odpowiednio `kot.mysli(false)` (bez osobnego `flash`). Napis „Meshuga pisze…” → etap z tematu (cennik / kod / pomysł / projekty / „układam odpowiedź”), ta sama logika co `etapyMysli()` w `meshuga-app.src.html` (sesja 9 wydziela ją do modułu jako `MeshugaKot.etapy()`).
5. **Czas:** bez `KOT_API` odpowiedź przychodzi po 450 ms, a wstęga potrzebuje ok. 1 s (wejście 0,55 + wyjście 0,45). Rekomendacja: minimum 1,2 s przy gotowych odpowiedziach (decyzja maisy).
6. **Telefon:** sprawdzić, czy arkusz okienka zasłania kota w rogu; jeśli tak, animacja przy awatarze w nagłówku albo sam napis (zrzut 375 do decyzji maisy).
7. **CSP:** przechodzi (canvas + `style` przez JS, zero inline `<script>`). Wydajność: wstęga to trzecia pętla obok mapy i kuli, ale tylko 1–3 s po pytaniu; po odpowiedzi rAF stoi.
8. **Aplikacja `/meshuga/`:** `python -I buduj.py` → skopiować `strona\meshuga\*` do `cybersora-pages\meshuga\` (moduł jest w środku `meshuga.js`).
9. **Testy:** `test_kot_rog.js` (rozszerzyć o stan „myśli”, 375/768/1280, fallback bez modułu), `test_wdrozenie.js` (CSP, 404), potem po pushu `test_zywo.js`. Push tylko po „tak” maisy.

## Kątowniki usunięte wszędzie (04.11.2026, decyzja maisy)
Zmienione na dysku przez kartę Meshugi (obie kopie strony): `index.html` (karty, hero, manifest, stopka, Laboratorium, celownik pasa znaków), `views.css` (zrzuty w Ofercie, galeria sztuki, konfigurator), `kot-czat.css` (dymek i panel), `oferta-v10/ov10.css` (kafel). `cybersora-pages` commit be57aed (niewypchnięty); `_artefakt_strona` zmieniona tylko na dysku, artefakt strony NaVzg49mNrNzHjvuxfww36 NIE przepublikowany. Kontrola: `Meshuga\zrzuty-testy\test_bez_katownikow_strona.js`.
