// sklej.mjs — składa strony cybersora.pl ze źródeł w _zrodla/ (katalog z podkreśleniem nie trafia na stronę).
//
//   _zrodla/szablon.html      wspólna głowa, pasek, okienko „Szybkie pytania”, stopka
//   _zrodla/strony/*.html     treść jednej strony; pierwsza linia to komentarz z ustawieniami w JSON:
//                             <!--{"wyjscie":"oferta/index.html","tytul":"…","opis":"…","kanon":"/oferta/","menu":"oferta"}-->
//   _zrodla/dane.mjs          cennik i gotowe fragmenty ({{>nazwa}})
//
// Znaczniki: {{klucz}} = ustawienie strony, {{>nazwa}} = fragment z dane.mjs, {{v:plik}} = skrót treści pliku
// (do ?v=, żeby pamięć podręczna puszczała plik po każdej zmianie), {{menu:nazwa}} = aria-current dla aktywnej pozycji.
//
// Użycie: node .github/buduj/sklej.mjs            zapisuje strony do repo (podgląd lokalny działa bez budowania)
//         node .github/buduj/sklej.mjs --sprawdz  kod 1, gdy strony w repo różnią się od źródeł (pilnuje tego Actions)

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const zr = join(repo, '_zrodla');
const sprawdz = process.argv.includes('--sprawdz');
const { fragmenty } = await import(pathToFileURL(join(zr, 'dane.mjs')).href);
const czytaj = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const szablon = czytaj(join(zr, 'szablon.html'));
// _zrodla/czesci/nazwa.html = fragment {{>nazwa}} używany na kilku stronach (np. formularz)
for (const n of readdirSync(join(zr, 'czesci')).filter((x) => x.endsWith('.html'))) {
  fragmenty[n.replace(/\.html$/, '')] = czytaj(join(zr, 'czesci', n)).trim().replace(/\{\{>([\w-]+)\}\}/g, (m, k) => fragmenty[k]);
}

const skroty = new Map();
const skrot = (plik) => {
  // tekst liczony z końcami linii LF: ten sam skrót na Windowsie (CRLF po pobraniu) i w Actions
  if (!skroty.has(plik)) {
    const tekst = /\.(js|mjs|css|json|html|svg)$/.test(plik);
    skroty.set(plik, createHash('sha1').update(tekst ? czytaj(join(repo, plik)) : readFileSync(join(repo, plik))).digest('hex').slice(0, 8));
  }
  return skroty.get(plik);
};

function wypelnij(tekst, ust) {
  return tekst
    .replace(/\{\{>([\w-]+)\}\}/g, (m, n) => { if (!(n in fragmenty)) throw new Error('brak fragmentu ' + n); return fragmenty[n]; })
    .replace(/\{\{v:([\w./-]+)\}\}/g, (m, p) => skrot(p))
    .replace(/\{\{menu:([\w-]+)\}\}/g, (m, n) => (ust.menu === n ? ' aria-current="page"' : ''))
    .replace(/\{\{(\w+)\}\}/g, (m, k) => { if (!(k in ust)) throw new Error(`${ust.wyjscie}: brak ustawienia ${k}`); return ust[k]; });
}

let roznice = 0;
const lista = [];
for (const n of readdirSync(join(zr, 'strony')).filter((x) => x.endsWith('.html')).sort()) {
  const surowe = czytaj(join(zr, 'strony', n));
  const m = /^<!--(\{[\s\S]*?\})-->\n/.exec(surowe);
  if (!m) throw new Error(n + ': brak ustawień w pierwszej linii');
  const ust = Object.assign({ glowa: '', skrypty: '', robots: 'index,follow', menu: '', cialo: '', typ: 'website' }, JSON.parse(m[1]));
  // bloki <!--GLOWA-->…<!--/GLOWA--> i <!--SKRYPTY-->…<!--/SKRYPTY--> ze strony trafiają do <head> i przed app.js
  let cialo = surowe.slice(m[0].length);
  for (const [znak, klucz] of [['GLOWA', 'glowa'], ['SKRYPTY', 'skrypty']]) {
    cialo = cialo.replace(new RegExp(`<!--${znak}-->\\n?([\\s\\S]*?)<!--/${znak}-->\\n?`), (x, w) => { ust[klucz] = w.trim(); return ''; });
  }
  ust.tresc = wypelnij(cialo.trim(), ust);
  ust.glowa = wypelnij(ust.glowa, ust);
  ust.skrypty = wypelnij(ust.skrypty, ust);
  const html = wypelnij(szablon, ust).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  const cel = join(repo, ust.wyjscie);
  const stary = existsSync(cel) ? czytaj(cel) : null;
  if (stary !== html) {
    roznice++;
    if (!sprawdz) { mkdirSync(dirname(cel), { recursive: true }); writeFileSync(cel, html); }
  }
  lista.push(`${stary === html ? '  ' : sprawdz ? '≠ ' : '→ '}${ust.wyjscie}`);
}
console.log(lista.join('\n'));
if (sprawdz && roznice) { console.error(`\n${roznice} stron różni się od źródeł w _zrodla/. Uruchom: node .github/buduj/sklej.mjs`); process.exit(1); }
