# Meshuga next gen: research 03.11.2026

4 wyszukiwania (trendy UX czatów 2026, cyberpunkowe UI asystentów, boty sprzedażowe na stronach, wzorce: canvas/pamięć/głos/rozumowanie). Źródła to głównie blogi projektowe i strony dostawców, więc traktuję je jako kierunki, nie jako twarde dane.

## Co mówi rynek (w skrócie)
1. **Odejście od samego tekstu, czyli generatywne UI z gotowego katalogu.** Model nie pisze HTML-a, tylko wybiera z przygotowanych komponentów (karta, formularz, wykres). Robi tak Gemini (Dynamic View), tak działają też MCP Apps. Meshuga ma już zalążek: znaczniki `[[KARTA]]`.
2. **Z czatu do zlecania.** Zamiast „doradź mi” jest „zrób to za mnie” (Nielsen: „delegative UI”). Asystent prowadzi przez zadanie krok po kroku.
3. **Rozumowanie na widoku, zwinięte.** Ślad kroków streamuje się na żywo, a potem zwija do podsumowania.
4. **Canvas.** Dłuższe wyniki (wycena, brief) trafiają do panelu obok czatu i można je tam edytować, zamiast przewijać ich w rozmowie.
5. **Widoczna pamięć.** Użytkownik widzi, co asystent o nim zapamiętał, i może to poprawić albo usunąć.
6. **Multimodalność.** Głos z transkrypcją na żywo i wskaźnikiem słuchania, do tego obraz (wrzucony zrzut).
7. **Boty sprzedażowe.** Kwalifikują klienta dynamicznymi pytaniami, budują wycenę na bieżąco, zbierają „RFQ” (zakres, termin, budżet) i przekazują to człowiekowi albo do kalendarza.
8. **Cyberpunkowe czaty** z rynku (Retro Terminal itp.) opierają się na CRT, poświacie i zielonym tekście. To nie nasza droga, bo glow jest zakazany. Charakter Meshugi ma budować ruch, mono i kontrast, nie neony.

## Propozycje dla Meshugi (priorytet)

### Etap 1: da się zrobić w artefakcie już teraz (sample + tools)
| # | Funkcja | Co robi | Dlaczego |
|---|---|---|---|
| 1 | **Narzędzia zamiast znaczników** | `sample({tools})`: `pokaz_cennik`, `pokaz_projekt`, `wycena`, `brief` jako funkcje strony | pewniejsze niż parsowanie `[[...]]` tekstu, generatywne UI z katalogu |
| 2 | **Kalkulator wyceny na żywo** | karta z suwakami/przełącznikami (zakres, termin, pakiet), cena przelicza się z CENNIKA | najczęstszy powód wejścia; rzadkość u konkurencji |
| 3 | **Log rozumowania jako terminal** | zwijany ślad: `> czytam cennik… > dobieram pakiet… ✓` (prawdziwe wywołania narzędzi, nie udawane) | cyberpunk natywnie, bez glow; zaufanie |
| 4 | **Brief w 5 pytaniach → gotowa wiadomość** | Meshuga dopytuje (cel, termin, budżet, przykład, kontakt), składa brief, przycisk „Wyślij do nas” / „Pobierz” | kwalifikacja leada; dziś „Napisz do nas” jest puste |
| 5 | **Oceń mój zrzut** | wrzuć zrzut swojej strony/apki → Meshuga wypunktuje 3 rzeczy do poprawy + link do audytu | `sample images:true` działa w artefakcie; most do oferty audytów |
| 6 | **Komendy `/` i Ctrl+K** | `/cena`, `/brief`, `/projekty`, `/skan`, `/nowy` z podpowiedziami w polu | terminalowy charakter, szybkość |
| 7 | **Dyktowanie (mikrofon już jest)** | Web Speech pl-PL, kółko kota pulsuje w rytm głosu (transform, bez glow) | ikona już stoi, a nic nie robi |

### Etap 2: wygląd i „żywość”
- **Panel canvas** po prawej: wycena/brief otwiera się obok rozmowy, edytowalny, z „kopiuj / pobierz PDF”.
- **Kot reaguje na treść:** uszy w dół przy błędzie, szerokie oczy przy cenie, zamknięte przy „myślę”, glitch C·S przy zerwanym połączeniu („sygnał zerwany, spróbuj jeszcze raz”).
- **Odszyfrowanie nagłówków:** pierwsza linia odpowiedzi pojawia się jako krótki „scramble” znaków (~300 ms, wyłączany w reduced-motion).
- **Numer sesji** w stylu `#CS-4D45` przy rozmowie i w briefie (żeby Patryk i maisa wiedzieli, o którą chodzi).
- **Widoczna pamięć:** „Co Meshuga o tobie wie” (nick, branża, budżet), do edycji i usunięcia; na razie localStorage.
- Dźwięki opcjonalne (cichy „blip” przy odpowiedzi), domyślnie wyłączone.

### Etap 3: potrzebny serwer
- Skan strony po adresie URL (pobranie i analiza, czego artefakt nie potrafi).
- Wspólne konto strona ↔ aplikacja, historia na serwerze.
- Rezerwacja rozmowy (Cal.com) i zapis leada w jednym miejscu.
- Kontekst strony: „widzę, że oglądasz Ofertę, pokazać pakiety?”.

## Czego NIE robić
- Poświaty, scanline'ów CRT, zielonego tekstu, bocznych linijek HUD (zakazy karty).
- Udawanego „myślenia” z wymyślonymi krokami: log pokazuje tylko prawdziwe wywołania narzędzi.
- Proaktywnych dymków co 10 s, bo to irytuje.

## Moja rekomendacja na następną sesję
Najpierw **1 + 2 + 3** (narzędzia, kalkulator, log). Jedno przejście daje największy skok „next gen” i od razu wzmacnia sprzedaż. Potem 4 (brief) i 7 (mikrofon).

## Źródła
- https://uxdesign.cc/the-interface-has-left-the-building-8fdb558d33a9
- https://jakobnielsenphd.substack.com/p/2026-prediction-comic
- https://www.aiacceleratorinstitute.com/nobody-wants-another-chatbot-7-interface-architectures-worth-building/
- https://dev.to/zdeb_fouc_f95089367652fc5/from-agent-checkpoints-to-spatial-widgets-five-uiux-patterns-that-look-poised-to-define-2026-m3i
- https://www.parallelhq.com/blog/llm-chat-ux-patterns
- https://www.setproduct.com/blog/ai-chat-interface-ui-design
- https://ibl.ai/docs/os/chat-canvas/chat.md
- https://labs.adaline.ai/p/post-chat-interface-ai-products
- https://conffab.com/elsewhere/post-chat-ui/
- https://hunted.space/dashboard/retroterminal
- https://smithery.ai/skills/ckorhonen/tui-designer
- https://www.chatbase.co/blog/sales-automation
- https://boei.help/ai-chatbot/sales/
- https://wonderchat.io/uses/industrial-sales-chatbot
- https://lollypop.design/blog/2025/january/chatbot-ui-ux-design-best-practices-examples/?p=16136
