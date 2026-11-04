// Uruchamia testy Meshugi po kolei (zwykły node + playwright z _meshuga/node_modules) i składa tabelę:
// test → liczba sprawdzeń → błędy. test_zywo.js jest pomijany zawsze (łączy się z prawdziwą stroną i zakłada konto).
// Użycie: node zrzuty-testy/uruchom.js [test_a.js test_b.js …]   (bez argumentów: wszystkie poza test_zywo)
// Najpierw `python3 buduj.py` (testy czytają meshuga-app.html i strona/). Zrzuty: zrzuty-testy/wyniki/ (MESHUGA_ZRZUTY).
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const POMIN = ['test_zywo.js'];
const lista = (process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(__dirname).filter(f => /^test_.*\.js$/.test(f)).sort())
  .map(f => path.basename(f)).filter(f => !POMIN.includes(f));

function ocen(out) {
  // format 1: JSON { sprawdzenia: ['OK …' | 'BŁĄD …'], bledy: [...] }
  const j = out.indexOf('{\n');
  if (j > -1) {
    try {
      const w = JSON.parse(out.slice(j));
      const spr = w.sprawdzenia || [], zle = spr.filter(s => s.startsWith('BŁĄD'));
      const bk = (w.bledy || []).length + (w.csp || 0);
      return { sprawdzen: spr.length, bledow: zle.length + bk, opis: zle.concat((w.bledy || []).map(b => 'konsola: ' + b)).slice(0, 6) };
    } catch (e) { /* inny format niżej */ }
  }
  // format 2: „kroki N, …, błędy M” (test_bez_katownikow*, test_makieta_mysli)
  const k = /kroki (\d+)/.exec(out), b = /błędy (\d+)/.exec(out);
  if (k && b) return { sprawdzen: +k[1], bledow: +b[1], opis: out.split('\n').filter(l => /BŁĄD/.test(l)).slice(0, 6) };
  return { sprawdzen: 0, bledow: 1, opis: ['nie umiem odczytać wyniku testu'] };
}

const tab = [];
for (const f of lista) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8', timeout: 600000, env: process.env, maxBuffer: 64 << 20 });
  const out = (r.stdout || '') + (r.status ? '\n' + (r.stderr || '') : '');
  const w = r.status === 0 ? ocen(r.stdout || '') : { sprawdzen: 0, bledow: 1, opis: [(r.stderr || 'kod wyjścia ' + r.status).split('\n').slice(0, 4).join(' ')] };
  w.test = f; w.s = ((Date.now() - t0) / 1000).toFixed(0);
  tab.push(w);
  console.log(`${w.bledow ? 'BŁĄD' : 'OK  '} ${f.padEnd(30)} ${String(w.sprawdzen).padStart(4)} sprawdzeń · ${w.bledow} błędów · ${w.s} s`);
  w.opis.forEach(o => console.log('       ' + o.slice(0, 220)));
  if (process.env.MESHUGA_PELNY) console.log(out);
}
const S = tab.reduce((a, w) => a + w.sprawdzen, 0), B = tab.reduce((a, w) => a + w.bledow, 0);
console.log(`\nRAZEM: ${tab.length} testów, ${S} sprawdzeń, ${B} błędów`);
console.log('\n| test | sprawdzenia | błędy |\n|---|---:|---:|\n' + tab.map(w => `| \`${w.test}\` | ${w.sprawdzen} | ${w.bledow} |`).join('\n') + `\n| **razem** | **${S}** | **${B}** |`);
process.exitCode = B ? 1 : 0;
