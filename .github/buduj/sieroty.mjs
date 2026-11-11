// sieroty.mjs — strażnik: wypisuje śledzone pliki, które trafiają na cybersora.pl,
// a których nic na stronie nie wskazuje (śmieci wystawione publicznie).
//
// Odwołanie = pełna ścieżka pliku w treści HTML/JS/CSS/JSON/XML albo sama nazwa pliku
// w pliku z tego samego katalogu. Pliki składane dynamicznie i pliki „z zewnątrz”
// (robots.txt, CNAME) są na liście WYJATKI z powodem.
//
// Użycie: node .github/buduj/sieroty.mjs [katalog-repo]   → kod 1, gdy są sieroty.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, posix } from 'node:path';

const repo = process.argv[2] || '.';
const pliki = execFileSync('git', ['-C', repo, 'ls-files', '-z'], { encoding: 'utf8' })
  .split('\0').filter(Boolean);

// Ta sama reguła co `pomin` w buduj.mjs: z kropką/podkreśleniem/node_modules nie idzie na stronę.
const ROBOCZE = new Set(['node_modules', 'zrzuty-testy', 'pycodemath-sceny', 'pycodemath-gif', 'zrzuty-projektow-v2']);
const publiczny = (p) => !p.split('/').some((s) => s.startsWith('.') || s.startsWith('_') || ROBOCZE.has(s));

const WYJATKI = [
  [/^index\.html$/, 'strona główna'],
  [/^robots\.txt$/, 'czytają roboty'],
  [/^CNAME$/, 'domena GitHub Pages'],
  [/^sitemap\.xml$/, 'wskazana w robots.txt'],
  [/^LICENSE$/, 'prawa autorskie repo (11.11), czyta GitHub, nie strona'],
  [/^assety\/kot-awatar\/kot-(kosc|krew|szary)-(64|256)\.webp$/, 'konto.js kotUrl() składa nazwę'],
];

const TEKST = /\.(html|js|mjs|css|json|xml|txt|webmanifest|svg)$/i;
const tresci = pliki.filter((p) => publiczny(p) && TEKST.test(p))
  .map((p) => ({ p, t: readFileSync(join(repo, p), 'utf8') }));

const sieroty = [];
for (const p of pliki.filter(publiczny)) {
  if (WYJATKI.some(([re]) => re.test(p))) continue;
  const nazwa = posix.basename(p), kat = posix.dirname(p);
  const ma = tresci.some(({ p: q, t }) => q !== p &&
    (t.includes(p) || (posix.dirname(q) === kat && t.includes(nazwa))));
  if (!ma) sieroty.push(p);
}

const publiczne = pliki.filter(publiczny).length;
console.log(`sprawdzone: ${publiczne} publicznych plików z ${pliki.length} śledzonych, wyjątki: ${WYJATKI.length}, sieroty: ${sieroty.length}`);
for (const s of sieroty) console.log('  SIEROTA ' + s);
process.exit(sieroty.length ? 1 : 0);
