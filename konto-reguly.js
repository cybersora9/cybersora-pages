/*! konto-reguly.js (06.11.2026, KONTA BEZPIECZNIE krok 2): jedne reguły treści konta dla strony i dla Workera.
 *  Moduł ES bez zależności. Strona ładuje go jako <script type="module"> (wystawia globalThis.KontoReguly),
 *  Worker (P3) robi `import { KontoReguly } from './konto-reguly.js'`. Test w Node: testy_playwright/test-konto-reguly.mjs.
 *  Zmiana reguły = zmiana tylko tutaj; atrapa w przeglądarce niczego nie chroni, chroni dopiero ten sam plik na Workerze. */

/* Słownik startowy v1: celowo krótki, rozbudowa w P3 razem z panelem moderacji. */
const ZAKAZANE = ['kurw', 'korw', 'chuj', 'huj', 'jeba', 'jebi', 'jebn', 'jebac', 'pierdol', 'pizd', 'kutas', 'cwel', 'dziwk', 'spierdal', 'zajeb',
  'fuck', 'shit', 'cunt', 'nigg', 'whore', 'bitch', 'hitler', 'nazi', 'porn',
  'debil', 'kretyn', 'idiot'];   // bez 'rape' (trapez) i 'fag' (fagot); 06.11: obelgi (Meshuga witała „Cześć, debil!”)
// nicki-podróbki: dokładnie (po normalizacji) albo jako część nicku (pierwsze cztery)
const REZERW_W = ['cybersora', 'admin', 'moderator', 'meshuga'];
const REZERW = ['sora', 'somi', 'mod', 'administrator', 'support', 'pomoc', 'root', 'system', 'staff', 'official', 'oficjalny', 'cybersoraofficial', 'kontakt'];
const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i', '|': 'l' };

function norm(t, gwiazdki) {
  // małe litery, bez ogonków, leet → litery, bez powtórzeń; '*' i '#' zostają jako „dowolna litera” (k*rwa)
  let s = String(t || '').normalize('NFKC').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
  s = s.replace(/[0134578@$!|]/g, (c) => LEET[c]);
  s = s.replace(gwiazdki ? /[^a-z*#]/g : /[^a-z]/g, '');
  return s.replace(/(.)\1+/g, '$1');
}
function maWulgaryzm(t) {
  const s = norm(t, true).replace(/#/g, '*');
  return ZAKAZANE.some((z) => {
    const z1 = z.replace(/(.)\1+/g, '$1');
    if (s.indexOf(z1) >= 0) return true;
    if (s.indexOf('*') < 0) return false;
    for (let i = 0; i < z1.length; i++) if (s.indexOf(z1.slice(0, i) + '*' + z1.slice(i + 1)) >= 0 || s.indexOf(z1.slice(0, i) + '*' + z1.slice(i)) >= 0) return true;
    return false;
  });
}
const ZW_RE = /[\u0000-\u0009\u000b-\u001f\u007f­​-‏‪-‮⁠-⁤﻿]/;   // sterujące i niewidoczne
const ZALGO_RE = /\p{M}{3,}/u;
// tylko łacinka z polskimi literami: znaki podobne z innych alfabetów (а/е/о z cyrylicy) odpadają od razu
const NICK_MIN = 3, NICK_MAX = 20;
const NICK_RE = /^[A-Za-z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ_.\-]{3,20}$/;

function walidujNick(t) {
  const n = String(t || '').trim();
  if (!NICK_RE.test(n)) return { ok: false, blad: 'Nick: 3–20 znaków, litery, cyfry i _ . -' };
  if (/^[_.\-]|[_.\-]$/.test(n) || /[_.\-]{2}/.test(n)) return { ok: false, blad: 'Znaki _ . - tylko w środku nicku i pojedynczo.' };
  const s = norm(n);
  if (REZERW.indexOf(s) >= 0 || REZERW_W.some((r) => s.indexOf(r) >= 0)) return { ok: false, blad: 'Ten nick jest zarezerwowany. Wybierz inny.' };
  if (maWulgaryzm(n)) return { ok: false, blad: 'Ten nick nie przejdzie. Wybierz inny.' };
  return { ok: true, wartosc: n };
}

const LINK_RE = /(https?:|www\.|[a-z0-9-]+\.(pl|com|net|org|io|gg|me|ly|xyz|ru|de|eu|info|app|dev|link|site|shop|online|top|tk)\b)/i;
function walidujBio(t) {
  const b = String(t == null ? '' : t).replace(/\r\n?/g, '\n').trim();
  if (Array.from(b).length > 160) return { ok: false, blad: 'Opis: najwyżej 160 znaków.' };
  if ((b.match(/\n/g) || []).length > 2) return { ok: false, blad: 'Opis: najwyżej 3 linijki.' };
  if (ZW_RE.test(b)) return { ok: false, blad: 'Opis ma niewidoczne albo sterujące znaki. Usuń je.' };
  if (ZALGO_RE.test(b)) return { ok: false, blad: 'Opis ma za dużo znaków łączonych (tzw. zalgo).' };
  if (LINK_RE.test(b)) return { ok: false, blad: 'W opisie nie może być linków. Linki dodasz niżej.' };
  if (maWulgaryzm(b)) return { ok: false, blad: 'Opis ma słowa, których tu nie puszczamy.' };
  return { ok: true, wartosc: b };
}

/* linki: tylko trzy serwisy, tylko ich wzorce adresów; zapisujemy sam identyfikator, adres buduje strona */
const SERWISY = ['github', 'linkedin', 'discord'];
// ścieżki GitHuba, które nie są profilami (login, ustawienia, sklep…): link wyglądałby na profil, a prowadzi gdzie indziej
const GH_ZASTRZ = ['login', 'logout', 'signup', 'join', 'session', 'sessions', 'settings', 'marketplace', 'sponsors', 'orgs', 'organizations',
  'apps', 'features', 'about', 'pricing', 'security', 'explore', 'topics', 'collections', 'trending', 'new', 'notifications', 'site',
  'enterprise', 'contact', 'search', 'pulls', 'issues', 'codespaces', 'copilot', 'account', 'password_reset', 'oauth', 'github', 'blog'];
const DISCORD_EPOKA = 1420070400000;   // 01.01.2015: ID Discorda (snowflake) niesie datę utworzenia
const GH_LOGIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
// podszywanie się pod cybersorę: cudzy profil nie może linkować do kont, które wyglądają na nasze
// tylko nazwy marki: „admin” w linku to zwykle nie podróbka (np. github.com/badminton)
function linkZastrz(id) { const s = norm(id); return ['cybersora', 'meshuga'].some((r) => s.indexOf(r) >= 0); }

function walidujLinkWzor(serwis, s) {
  let m;
  const bez = s.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
  if (serwis === 'github') {
    m = /^github\.com\/([^/]+)$/i.exec(bez) || /^@?([^/.:]+)$/.exec(bez);
    if (m && GH_LOGIN_RE.test(m[1])) return { ok: true, wartosc: { typ: 'user', id: m[1] } };
    return { ok: false, blad: 'Nazwa użytkownika albo github.com/nazwa.' };
  }
  if (serwis === 'linkedin') {
    m = /^(?:[a-z]{2,3}\.)?linkedin\.com\/in\/([^/]+)$/i.exec(bez) || /^(?:in\/)?([^/.:]+)$/i.exec(bez);
    if (m && /^[A-Za-z0-9](?:[A-Za-z0-9-]{1,98})[A-Za-z0-9]$/.test(m[1])) return { ok: true, wartosc: { typ: 'in', id: m[1] } };
    return { ok: false, blad: 'Tylko profil, czyli linkedin.com/in/twoja-nazwa.' };
  }
  if (serwis === 'discord') {
    if ((m = /^discord(?:app)?\.com\/users\/(\d{17,20})$/i.exec(bez))) return { ok: true, wartosc: { typ: 'users', id: m[1] } };
    const u = s.replace(/^@/, '').toLowerCase();
    if (/^[a-z0-9_.]{2,32}$/.test(u) && !/\.\./.test(u)) return { ok: true, wartosc: { typ: 'nick', id: u } };
    return { ok: false, blad: 'Nick albo discord.com/users/ID.' };
  }
  return { ok: false, blad: 'Nieznany serwis.' };
}

function walidujLink(serwis, t, teraz) {
  const s = String(t == null ? '' : t).trim();
  if (!s) return { ok: true, wartosc: null };
  if (s.length > 200 || ZW_RE.test(s)) return { ok: false, blad: 'Za długi albo dziwny adres.' };
  if (/[@:]/.test(s.replace(/^https?:\/\//i, '').replace(/^@/, ''))) return { ok: false, blad: 'Adres z „@” albo „:” w środku nie przejdzie (tak się ukrywa prawdziwą stronę).' };
  // 06.11 (plan KONTA BEZPIECZNIE): bez zaproszeń na serwery Discorda; profil linkuje do osoby, nie do cudzej społeczności
  if (/(^|\/\/|\.)discord(?:app)?\.(?:gg\b|com\/invite\b)|^discord\.gg/i.test(s.replace(/^https?:\/\//i, '').replace(/^www\./i, ''))) return { ok: false, blad: 'Zaproszeń na serwery (discord.gg) nie dodamy. Podaj nick albo discord.com/users/ID.' };
  const w = walidujLinkWzor(serwis, s);
  if (!w.ok || !w.wartosc) return w;
  if (linkZastrz(w.wartosc.id)) return { ok: false, blad: 'Ten adres wygląda na konto cybersory. Podaj swój.' };
  if (serwis === 'github' && GH_ZASTRZ.indexOf(w.wartosc.id.toLowerCase()) >= 0) return { ok: false, blad: 'To nie jest profil GitHuba. Podaj swoją nazwę użytkownika.' };
  if (w.wartosc.typ === 'users') {
    const ms = Math.floor(Number(w.wartosc.id) / 4194304) + DISCORD_EPOKA;   // >> 22 bez BigInt; dokładność wystarczy do daty
    if (ms > (teraz || Date.now()) + 864e5) return { ok: false, blad: 'To ID Discorda nie istnieje. Skopiuj je z profilu (Kopiuj ID użytkownika).' };
  }
  return w;
}

function adresLinku(serwis, w) {
  if (!w) return null;
  if (serwis === 'github') return { url: 'https://github.com/' + w.id, pokaz: w.id };
  if (serwis === 'linkedin') return { url: 'https://www.linkedin.com/in/' + w.id, pokaz: 'in/' + w.id };
  if (w.typ === 'users') return { url: 'https://discord.com/users/' + w.id, pokaz: 'ID ' + w.id.slice(0, 4) + '…' + w.id.slice(-4) };
  if (w.typ === 'gg') return null;   // 06.11: zaproszenia wycięte; stare zapisy z artefaktu nie pokazują się i znikają przy zapisie
  return { url: null, pokaz: w.id };   // sam nick Discorda nie ma adresu: kapsuła kopiuje nick
}

/* Krok 2: logowanie przez GitHub/Discord. Na Workerze login przychodzi od dostawcy (po OAuth), tu tylko sprawdzamy kształt.
 * Z dostawcy bierzemy wyłącznie id + nazwę (decyzja 06.11, polityka prywatności w kroku 4). */
const OAUTH = ['github', 'discord'];
function walidujLoginOAuth(serwis, t) {
  const s = String(t == null ? '' : t).trim().replace(/^@/, '');
  if (serwis === 'github') return GH_LOGIN_RE.test(s) && GH_ZASTRZ.indexOf(s.toLowerCase()) < 0
    ? { ok: true, wartosc: s } : { ok: false, blad: 'Login GitHuba: litery, cyfry i pojedyncze myślniki, do 39 znaków.' };
  if (serwis === 'discord') return /^[a-z0-9_.]{2,32}$/.test(s.toLowerCase()) && !/\.\./.test(s)
    ? { ok: true, wartosc: s.toLowerCase() } : { ok: false, blad: 'Nazwa na Discordzie: 2–32 znaki, małe litery, cyfry, _ i kropki.' };
  return { ok: false, blad: 'Nieznany dostawca logowania.' };
}

/* Krok 2: e-mail (opcjonalny). Prosty kształt; prawdziwy dowód to kod wysłany na adres (P3). */
function walidujEmail(t) {
  const e = String(t == null ? '' : t).trim();
  if (!e) return { ok: false, blad: 'Wpisz adres e-mail.' };
  if (e.length > 254 || ZW_RE.test(e) || !/^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/.test(e)) return { ok: false, blad: 'To nie wygląda na adres e-mail.' };
  return { ok: true, wartosc: e.toLowerCase() };
}

/* Krok 2: nazwa klucza dostępu nadana przez użytkownika („Laptop”, „Telefon”). */
function walidujNazweKlucza(t) {
  const n = String(t == null ? '' : t).trim();
  if (!n) return { ok: true, wartosc: '' };
  if (Array.from(n).length > 32 || ZW_RE.test(n)) return { ok: false, blad: 'Nazwa klucza: najwyżej 32 znaki.' };
  if (maWulgaryzm(n)) return { ok: false, blad: 'Tej nazwy nie puścimy.' };
  return { ok: true, wartosc: n };
}

export const KontoReguly = Object.freeze({
  wersja: '2026-11-06',
  NICK_MIN, NICK_MAX,
  norm, maWulgaryzm,
  nick: walidujNick, bio: walidujBio, link: walidujLink, adres: adresLinku,
  loginOAuth: walidujLoginOAuth, email: walidujEmail, nazwaKlucza: walidujNazweKlucza,
  serwisy: SERWISY.slice(), oauth: OAUTH.slice()
});
export default KontoReguly;
if (typeof globalThis !== 'undefined' && !globalThis.KontoReguly) globalThis.KontoReguly = KontoReguly;
