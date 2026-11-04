# Tnie zestaw Recraft (2x2, jedno SVG) na 4 ikony wektorowe do kart startowych.
# Wynik: ikony_zestaw1.html = ukryte <svg> z <g id="ikZestaw"> (czerwone ścieżki = biały, wycięcia = czarny, do maski)
# i ikony_ciecia.json = viewBox każdej ikony (kwadrat z marginesem). Kolor nadaje CSS (currentColor).
import json, pathlib, re
tu = pathlib.Path(__file__).parent
s = (tu / "zestaw1_linia.svg").read_text(encoding="utf-8")
s = re.sub(r"<metadata>.*?</metadata>", "", s, flags=re.S)
sciezki = re.findall(r"<path\b[^>]*>", s)
CZERW = "rgb(253,70,77)"
SROD = 4358 / 2
nazwy = {(0, 0): "CENA", (1, 0): "SKAN", (0, 1): "PROJEKTY", (1, 1): "POMYSŁ"}
bb = {}
wyj = []
for p in sciezki:
    fill = re.search(r'fill="([^"]*)"', p).group(1)
    d = re.search(r'\bd="([^"]*)"', p).group(1)
    liczby = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", d)]
    xs, ys = liczby[0::2], liczby[1::2]
    if min(xs) <= 1 and max(xs) >= 4357 and min(ys) <= 1:  # tło całego obrazka
        continue
    kol = "#fff" if fill == CZERW else "#000"
    wyj.append('<path fill="%s" d="%s"/>' % (kol, d))
    if fill == CZERW:
        q = (int(sum(xs) / len(xs) > SROD), int(sum(ys) / len(ys) > SROD))
        b = bb.setdefault(q, [1e9, 1e9, -1e9, -1e9])
        b[0] = min(b[0], min(xs)); b[1] = min(b[1], min(ys)); b[2] = max(b[2], max(xs)); b[3] = max(b[3], max(ys))
ciecia = {}
for q, (x0, y0, x1, y1) in bb.items():
    bok = max(x1 - x0, y1 - y0) * 1.06
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    ciecia[nazwy[q]] = [round(cx - bok / 2), round(cy - bok / 2), round(bok), round(bok)]
(tu / "ikony_zestaw1.html").write_text(
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><g id="ikZestaw">' + "".join(wyj) + "</g></defs></svg>",
    encoding="utf-8", newline="\n")
(tu / "ikony_ciecia.json").write_text(json.dumps(ciecia, ensure_ascii=False), encoding="utf-8")
print(len(wyj), "ścieżek", ciecia)
