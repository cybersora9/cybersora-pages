// buduj.mjs — wydanie cybersora.pl ze zminifikowanymi plikami (SZYBKOŚĆ S5, krok 9).
//
// Źródło w repo zostaje czytelne (komentarze to dokumentacja decyzji). Ten skrypt robi
// kopię strony do katalogu wydania i tylko tam minifikuje:
//   - app.js, kula.js, js-flag.js, sonda.js  → esbuild --minify (bez zmiany składni, nazwy globalne zostają)
//   - views.css                               → lightningcss --minify
//   - index.html: <style> → lightningcss, komentarze HTML precz, wcięcia przed tagami precz
// Nie rusza: <script> (JSON-LD), <pre>, <textarea>, <figure data-pole="zrzut"> (soraos.js czyta
// z niego komentarz jako opis zrzutu), soraos.* (już zminifikowane), obrazów, nazw plików i ?v=.
//
// Użycie: node buduj.mjs <katalog-źródła> <katalog-wydania>
// GitHub Actions (.github/workflows/pages.yml) odpala to przy każdym pushu na master.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync, rmSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { transformSync } from 'esbuild';
import { transform as cssTransform } from 'lightningcss';

const [src, out] = process.argv.slice(2);
if (!src || !out) { console.error('użycie: node buduj.mjs <źródło> <wydanie>'); process.exit(2); }

const JS_MIN = ['app.js', 'kula.js', 'js-flag.js', 'sonda.js'];
const CSS_MIN = ['views.css'];
const HTML_MIN = ['index.html'];

// Jak dotychczasowy Jekyll na GitHub Pages: pliki i katalogi z kropką lub podkreśleniem nie trafiają na stronę.
const pomin = (rel) => rel.split(sep).some((s) => s.startsWith('.') || s.startsWith('_') || s === 'node_modules');

function kopiuj(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    const rel = relative(src, p);
    if (pomin(rel)) continue;
    if (statSync(p).isDirectory()) { mkdirSync(join(out, rel), { recursive: true }); kopiuj(p); }
    else copyFileSync(p, join(out, rel));
  }
}

const minCss = (kod, nazwa) =>
  cssTransform({ filename: nazwa, code: Buffer.from(kod), minify: true }).code.toString();

function minHtml(html) {
  // Strefy chronione zostają bajt w bajt (poza <style>, którego treść minifikujemy).
  const re = /(<script\b[\s\S]*?<\/script>)|(<style\b[^>]*>)([\s\S]*?)(<\/style>)|(<pre\b[\s\S]*?<\/pre>)|(<textarea\b[\s\S]*?<\/textarea>)|(<figure\b[^>]*data-pole="zrzut"[\s\S]*?<\/figure>)|(<!--[\s\S]*?-->)/g;
  let wynik = '', ost = 0, m;
  const wolne = (t) => t.replace(/\n[ \t]+(?=<)/g, '\n').replace(/\n{2,}/g, '\n');
  while ((m = re.exec(html))) {
    wynik += wolne(html.slice(ost, m.index));
    if (m[2]) wynik += m[2] + minCss(m[3], 'index.html<style>') + m[4];
    else if (m[8]) { /* komentarz: precz */ }
    else wynik += m[0];
    ost = re.lastIndex;
  }
  return wynik + wolne(html.slice(ost));
}

// Czyścimy zawartość, nie sam katalog (na Windows serwer podglądu trzyma uchwyt do katalogu).
mkdirSync(out, { recursive: true });
for (const n of readdirSync(out)) rmSync(join(out, n), { recursive: true, force: true });
kopiuj(src);

const raport = [];
const zapisz = (n, przed, po) => { writeFileSync(join(out, n), po); raport.push([n, Buffer.byteLength(przed), Buffer.byteLength(po)]); };

for (const n of JS_MIN) {
  const kod = readFileSync(join(src, n), 'utf8');
  const r = transformSync(kod, { loader: 'js', minify: true, legalComments: 'none', charset: 'utf8' });
  zapisz(n, kod, r.code);
}
for (const n of CSS_MIN) { const kod = readFileSync(join(src, n), 'utf8'); zapisz(n, kod, minCss(kod, n)); }
for (const n of HTML_MIN) { const kod = readFileSync(join(src, n), 'utf8'); zapisz(n, kod, minHtml(kod)); }

for (const [n, a, b] of raport) console.log(`${n.padEnd(12)} ${String(a).padStart(7)} → ${String(b).padStart(7)} B (${Math.round(100 * (b - a) / a)}%)`);
