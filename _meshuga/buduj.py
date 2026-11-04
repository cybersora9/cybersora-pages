# Składa meshuga-app.html (artefakt): wkleja czcionki (base64) i moduł kota do źródła.
# Drugi wynik: strona\meshuga\ pod cybersora.pl/meshuga (bez skryptów inline, czcionki z /fonts/ strony).
import base64, hashlib, pathlib, re
tu = pathlib.Path(__file__).parent
fonty = pathlib.Path(r"C:\Users\maisa\Documents\SoraWebsite\_artefakt_strona\fonts")
def ff(rodzina, plik):
    b = base64.b64encode((fonty / plik).read_bytes()).decode()
    return '@font-face{font-family:"%s";src:url(data:font/woff2;base64,%s) format("woff2");font-weight:100 900;font-display:swap;}' % (rodzina, b)
def ffs(rodzina, plik):
    return '@font-face{font-family:"%s";src:url(/fonts/%s) format("woff2");font-weight:100 900;font-display:swap;}' % (rodzina, plik)
def zloz(zrodlo, fonty_css):
    s = zrodlo.replace("/*@@FONTS@@*/", fonty_css)
    s = s.replace("/*@@KOT@@*/", (tu / "meshuga-kot.js").read_text(encoding="utf-8"))
    # ikony kart (Recraft, wektor): ukryty <svg> ze ścieżkami + viewBoxy wycięć (ikony\tnij_ikony.py)
    s = s.replace("<!--@@IKONY@@-->", (tu / "ikony" / "ikony_zestaw1.html").read_text(encoding="utf-8"))
    s = s.replace("/*@@CIECIA@@*/{}", (tu / "ikony" / "ikony_ciecia.json").read_text(encoding="utf-8"))
    assert "@@" not in s, "zostal znacznik @@ w zrodle"
    return s

zrodlo = (tu / "meshuga-app.src.html").read_text(encoding="utf-8")
src = zloz(zrodlo, ff("Sora", "sora-wght-normal.woff2") + ff("Geist Mono", "geist-mono-wght-normal.woff2"))
(tu / "meshuga-app.html").write_text(src, encoding="utf-8", newline="\n")
print("ok", len(src))

# --- strona: CSP cybersora.pl nie wpuszcza skryptów inline ani czcionek data: ---
st = zloz(zrodlo, ffs("Sora", "sora-wght-normal.woff2") + ffs("Geist Mono", "geist-mono-wght-normal.woff2"))
skrypty = re.findall(r"<script>\n?(.*?)</script>", st, flags=re.S)
assert len(skrypty) == 2, len(skrypty)
js = "\n;\n".join(skrypty)
st = re.sub(r"<script>\n?.*?</script>\n?", "", st, flags=re.S)
# na stronie linki do cybersory w tej samej karcie
for stary, nowy in [('href="https://cybersora.pl/" target="_blank" rel="noopener"', 'href="/"'),
                    ('href="https://cybersora.pl/#contact" target="_blank" rel="noopener"', 'href="/#contact"')]:
    assert st.count(stary) == 1, stary
    st = st.replace(stary, nowy)
glowa_artefaktu = '<title>Meshuga</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
assert st.startswith(glowa_artefaktu)
wersja = hashlib.sha1(js.encode("utf-8")).hexdigest()[:10]
glowa = (
    '<!doctype html>\n<html lang="pl">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    '<title>Meshuga · AI Chatbot cybersory</title>\n'
    '<meta name="description" content="Meshuga, AI Chatbot cybersory: wycena programu, bota albo skryptu, brief w 5 pytaniach, darmowy skan widoczności i nasze projekty.">\n'
    '<link rel="canonical" href="https://cybersora.pl/meshuga/">\n'
    '<meta name="theme-color" content="#0e0e12">\n'
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n'
    '<link rel="preload" href="/fonts/sora-wght-normal.woff2" as="font" type="font/woff2" crossorigin>\n'
    '</head>\n<body>\n')
st = glowa + st[len(glowa_artefaktu):] + '<script src="/meshuga/meshuga.js?v=%s"></script>\n</body>\n</html>\n' % wersja
assert "<script>" not in st
cel = tu / "strona" / "meshuga"
cel.mkdir(parents=True, exist_ok=True)
(cel / "index.html").write_text(st, encoding="utf-8", newline="\n")
(cel / "meshuga.js").write_text(js, encoding="utf-8", newline="\n")
print("strona ok", len(st), len(js), wersja)
