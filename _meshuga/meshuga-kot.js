/* MESHUGA — kot cybersory jako wektor + animacje + cyber-kółka (03.11.2026).
   Użycie:
     const kot = MeshugaKot.mount(el, { ring: true | false });
     kot.squint(true|false)   // mrużenie przy „pisze…” (kółko przyspiesza)
     kot.flash()              // krótki błysk oczu po odpowiedzi
     kot.slucha(true|false)   // słucha mikrofonu (kółko przyspiesza, oczy otwarte)
     kot.setRing(true|false)  // pokazuje albo chowa kółko
     kot.mysli(true|false)    // wstęga „Meshuga myśli” wokół kota (wejście, pętla, wyjście + błysk oczu)
     kot.destroy()
     MeshugaKot.setMotion(false)  // wyłącza ruch wszędzie (ustawienie „wyłącz animacje”)
     MeshugaKot.wariantMysli('A'|'B'|'C')  // A wstęga, B dwie wstęgi, C rój znaków (makieta 04.11)
   Ruch tylko przez transform/opacity. Pauza, gdy karta ukryta. reduced-motion = statyczny kot. */
(function (g) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var live = [];
  var motionOn = !(g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var hidden = false;
  var uid = 0;

  /* Sylwetka narysowana z ff-03-kot-wyciety-bez-poswiaty.png (współrzędne obrazu 1000 px). */
  var GLOWA = 'M335 585 C310 640 305 720 330 762 C362 812 440 832 518 832 C600 832 676 812 706 762 C730 720 726 640 700 590 Q672 500 600 478 Q518 455 440 478 Q360 505 335 585 Z';
  var UCHO_L = 'M340 600 L308 525 L331 493 L296 486 L288 446 Q287 434 299 437 L445 480 Q385 520 340 600 Z';
  var UCHO_P = 'M598 480 L740 437 Q753 434 750 447 Q738 528 700 596 Q660 520 598 480 Z';
  var SZYJA = 'M440 800 C426 872 410 980 402 1070 L708 1070 C690 1010 652 962 628 884 L612 800 Z';
  var OKO_L = 'M378 667 Q424 617 471 667 Q424 647 378 667 Z';
  var OKO_P = 'M565 667 Q611 617 658 667 Q611 647 565 667 Z';
  var WASY = [
    'M318 684 Q220 688 135 704', 'M318 704 Q215 730 127 780', 'M322 724 Q262 760 217 815',
    'M720 657 Q810 656 898 670', 'M720 683 Q800 700 880 727', 'M720 703 Q820 742 900 826'
  ];

  function catSVG() {
    var id = 'mk' + (++uid);
    var wasy = WASY.map(function (d) { return '<path d="' + d + '"/>'; }).join('');
    return '' +
      '<svg class="mk-kot" viewBox="236 410 568 520" aria-hidden="true" focusable="false">' +
      '<defs><clipPath id="' + id + 'c"><rect x="236" y="410" width="568" height="520"/></clipPath></defs>' +
      '<g clip-path="url(#' + id + 'c)">' +
      /* obrys kość: kot nie znika na ink */
      '<g class="mk-obrys" fill="none" stroke-width="16" stroke-linejoin="round">' +
        '<path d="' + SZYJA + '"/><path d="' + GLOWA + '"/>' +
        '<path d="' + UCHO_L + '"/><path class="mk-ucho-p" d="' + UCHO_P + '"/>' +
      '</g>' +
      '<g class="mk-wasy" fill="none" stroke-width="4" stroke-linecap="round">' + wasy + '</g>' +
      '<g class="mk-futro">' +
        '<path d="' + SZYJA + '"/><path d="' + UCHO_L + '"/>' +
        '<path class="mk-ucho-p" d="' + UCHO_P + '"/><path d="' + GLOWA + '"/>' +
      '</g>' +
      '<g class="mk-oczy">' +
        '<path class="mk-oko" d="' + OKO_L + '"/><path class="mk-oko" d="' + OKO_P + '"/>' +
        '<g class="mk-blysk"><path d="' + OKO_L + '"/><path d="' + OKO_P + '"/></g>' +
      '</g>' +
      '</g></svg>';
  }

  /* --- cyber-kółko (viewBox 200, środek 100): segmenty, dwa kierunki; wybór maisy 03.11 = A --- */
  function ringSVG() {
    return '<svg class="mk-ring mk-ring-A" viewBox="0 0 200 200" aria-hidden="true" focusable="false">' +
      '<g class="mk-r1"><circle cx="100" cy="100" r="95" fill="none" class="mk-krew" stroke-width="4" stroke-dasharray="46 10 10 10" /></g>' +
      '<g class="mk-r2"><circle cx="100" cy="100" r="86.5" fill="none" class="mk-kosc" stroke-width="2.2" stroke-dasharray="82 26 6 26" /></g>' +
      '<g class="mk-r1"><rect x="97" y="1" width="6" height="6" rx="1" class="mk-hot-f"/><rect x="97" y="193" width="6" height="6" rx="1" class="mk-hot-f"/></g>' +
      '</svg>';
  }

  var RING_ANIM = { 'mk-r1': [360, 16000], 'mk-r2': [-360, 10000] }; /* klasa → [obrót w stopniach, czas ms] */

  function Kot(el, opt) {
    this.el = el; this.opt = opt || {};
    this.anims = []; this.speed = 1; this.sq = false; this.dx = 0; this.dy = 0;
    el.classList.add('mk');
    el.innerHTML = '<div class="mk-ring-slot"></div><div class="mk-disk">' + catSVG() + '</div>';
    this.oczy = el.querySelector('.mk-oczy');
    this.oko = el.querySelectorAll('.mk-oko');
    this.blyskEl = el.querySelector('.mk-blysk');
    this.uszy = el.querySelectorAll('.mk-ucho-p');
    var self = this;
    this._hover = function () { self.twitch(); };
    el.addEventListener('pointerenter', this._hover);
    this.setRing(this.opt.ring || null);
    this.schedule();
    live.push(this);
  }
  Kot.prototype.setRing = function (v) {
    this.anims.forEach(function (a) { a.cancel(); }); this.anims = [];
    var slot = this.el.querySelector('.mk-ring-slot');
    this.el.classList.toggle('mk-has-ring', !!v);
    slot.innerHTML = v ? ringSVG() : '';
    if (!v || !motionOn) return;
    var cfg = RING_ANIM, self = this;
    Object.keys(cfg).forEach(function (cls) {
      slot.querySelectorAll('.' + cls).forEach(function (n) {
        n.style.transformOrigin = '100px 100px';
        var a = n.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(' + cfg[cls][0] + 'deg)' }],
          { duration: cfg[cls][1], iterations: Infinity, easing: 'linear' });
        a.playbackRate = self.speed;
        if (hidden) a.pause();
        self.anims.push(a);
      });
    });
  };
  Kot.prototype.schedule = function () {
    var self = this;
    clearTimeout(this.t);
    if (!motionOn) return;
    this.t = setTimeout(function () {
      if (!hidden && !self.sq) {
        self.blink();
        if (Math.random() < 0.25) setTimeout(function () { self.blink(); }, 260);
      }
      self.schedule();
    }, 3000 + Math.random() * 4000);
  };
  Kot.prototype.blink = function () {
    if (!motionOn) return;
    this.oko.forEach(function (o) {
      o.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.08)', offset: .45 }, { transform: 'scaleY(1)' }],
        { duration: 170, easing: 'ease-in-out' });
    });
  };
  Kot.prototype.twitch = function () {
    if (!motionOn || this._tw) return;
    var self = this; this._tw = 1;
    this.uszy.forEach(function (u) {
      u.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-9deg)', offset: .3 }, { transform: 'rotate(3deg)', offset: .65 }, { transform: 'rotate(0)' }],
        { duration: 380, easing: 'ease-out' });
    });
    setTimeout(function () { self._tw = 0; }, 900);
  };
  Kot.prototype.squint = function (on) {
    this.sq = !!on;
    this.el.classList.toggle('mk-squint', this.sq);
    var r = this.sq ? 3.2 : 1, self = this;
    this.speed = r;
    this.anims.forEach(function (a) { try { a.updatePlaybackRate ? a.updatePlaybackRate(r) : (a.playbackRate = r); } catch (e) { a.playbackRate = r; } });
  };
  /* słucha mikrofonu: kółko szybciej (×2,2), oczy otwarte; squint ma pierwszeństwo */
  Kot.prototype.slucha = function (on) {
    this.el.classList.toggle('mk-slucha', !!on);
    if (this.sq) return;
    var r = on ? 2.2 : 1;
    this.speed = r;
    this.anims.forEach(function (a) { try { a.updatePlaybackRate ? a.updatePlaybackRate(r) : (a.playbackRate = r); } catch (e) { a.playbackRate = r; } });
  };
  Kot.prototype.flash = function () {
    if (!motionOn) return;
    this.blyskEl.animate([{ opacity: 0 }, { opacity: .95, offset: .3 }, { opacity: 0 }], { duration: 420, easing: 'ease-out' });
  };
  Kot.prototype.look = function (px, py) {
    var r = this.el.getBoundingClientRect();
    if (!r.width) return;
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var ax = px - cx, ay = py - cy, d = Math.hypot(ax, ay) || 1;
    var unitsPerPx = 568 / r.width;                 /* oczy ruszają się o 1–2 px na ekranie */
    var m = Math.min(1, d / 400) * 2 * unitsPerPx;
    this.oczy.style.transform = 'translate(' + (ax / d * m).toFixed(1) + 'px,' + (ay / d * m * 0.7).toFixed(1) + 'px)';
  };
  /* ---------- „Meshuga myśli”: wstęga wokół kota na dwóch canvasach (tył pod dyskiem, przód nad nim) ---------- */
  var KREW = [225, 29, 51], KOSC = [246, 242, 243], HOT = [255, 58, 82], TAU = Math.PI * 2;
  var ZNAKI = '{}<>;01/=()[]'.split('');
  var wariant = 'A', myslace = [], mRaf = 0, mLast = 0;
  function mix(a, b, u) { return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; }
  function rgba(c, al) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + Math.max(0, al).toFixed(3) + ')'; }
  function rad(d) { return d * Math.PI / 180; }
  /* tor jak pierścień Saturna: z>0 = przed kotem (dolny łuk), z<0 = za dyskiem */
  function rzut(R, phi, al, be) {
    var x0 = R * Math.cos(phi), y0 = R * Math.sin(phi), y1 = y0 * Math.cos(al), z = y0 * Math.sin(al);
    return { x: x0 * Math.cos(be) - y1 * Math.sin(be), y: x0 * Math.sin(be) + y1 * Math.cos(be), z: z / R };
  }
  var ORBITY = {
    A: function (t) { return [{ al: rad(68 + 10 * Math.sin(TAU * t / 3.7)), be: rad(-16 + 24 * Math.sin(TAU * t / 6.1)), dir: 1, kol: KREW, kon: KOSC }]; },
    B: function (t) {
      var s = 0.5 + 0.5 * Math.sin(TAU * t / 4.4);
      return [{ al: rad(64), be: rad(6 + 34 * s), dir: 1, kol: KREW, kon: KREW, off: 0 },
              { al: rad(64), be: rad(-6 - 34 * s), dir: -1, kol: KOSC, kon: KOSC, off: Math.PI }];
    },
    C: function (t) { return [{ al: rad(70), be: rad(-12 + 14 * Math.sin(TAU * t / 5)), dir: 1, kol: KREW, kon: KOSC }]; }
  };
  function Mysl(kot) { this.kot = kot; this.stan = 'off'; this.k = 0; }
  Mysl.prototype.przygotuj = function () {
    var el = this.kot.el, w = el.getBoundingClientRect().width || 40;
    this.w = w; this.maly = w < 100; this.pad = Math.ceil(w * 0.22);
    var S = w + this.pad * 2, dpr = Math.min(2, g.devicePixelRatio || 1), self = this;
    this.S = S; this.dpr = dpr;
    if (!this.cb) {
      var c = function () {
        var e = document.createElement('canvas'); e.className = 'mk-mysl'; e.setAttribute('aria-hidden', 'true');
        e.style.cssText = 'position:absolute;pointer-events:none'; return e;
      };
      this.cb = c(); this.cf = c();
      el.insertBefore(this.cb, el.querySelector('.mk-disk')); el.appendChild(this.cf);
      this.xb = this.cb.getContext('2d'); this.xf = this.cf.getContext('2d');
    }
    [this.cb, this.cf].forEach(function (e) {
      e.width = S * dpr; e.height = S * dpr;
      e.style.left = e.style.top = (-self.pad) + 'px'; e.style.width = e.style.height = S + 'px';
    });
    this.v = wariant; this.phi = 0; this.t = 0; this.hist = []; this.glify = []; this.emit = 0;
  };
  Mysl.prototype.czysc = function () {
    if (!this.cb) return;
    var S = this.S * this.dpr;
    [this.xb, this.xf].forEach(function (x) { x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, S, S); });
    this.xb.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); this.xf.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };
  Mysl.prototype.statyczny = function () {
    this.czysc();
    var c = this.S / 2, R = this.w * 0.56, o = ORBITY[this.v](0)[0], n = 48;
    for (var i = 0; i < n; i += 2) {
      var a = rzut(R, i / n * TAU, o.al, o.be), b = rzut(R, (i + 1) / n * TAU, o.al, o.be), x = (a.z + b.z) > 0 ? this.xf : this.xb;
      x.strokeStyle = rgba(KREW, 0.9); x.lineWidth = Math.max(1.5, this.w * 0.018);
      x.beginPath(); x.moveTo(c + a.x, c + a.y); x.lineTo(c + b.x, c + b.y); x.stroke();
    }
  };
  Mysl.prototype.phiAt = function (tq) {
    var h = this.hist;
    for (var i = h.length - 1; i > 0; i--) if (h[i - 1].t <= tq) { var a = h[i - 1], b = h[i]; return a.p + (b.p - a.p) * ((tq - a.t) / ((b.t - a.t) || 1)); }
    return h.length ? h[0].p : 0;
  };
  Mysl.prototype.krok = function (dt) {
    if (this.stan === 'in') { this.k = Math.min(1, this.k + dt / 0.55); if (this.k >= 1) this.stan = 'on'; }
    if (this.stan === 'out') {
      this.k = Math.max(0, this.k - dt / 0.45);
      if (this.k <= 0) { this.stan = 'off'; this.czysc(); this.kot.flash(); return; }
    }
    this.t += dt;
    this.phi += TAU / (this.maly ? 1.7 : 1.5) * (1 + 0.5 * Math.sin(TAU * this.t / 2.6)) * dt;  /* oddech */
    this.hist.push({ t: this.t, p: this.phi });
    while (this.hist.length > 2 && this.hist[1].t < this.t - 1.3) this.hist.shift();
    if (this.kot.el.offsetParent) this.rysuj(dt);
  };
  Mysl.prototype.rysuj = function (dt) {
    this.czysc();
    var e = 1 - Math.pow(1 - this.k, 3), c = this.S / 2, w = this.w, R = w * (0.36 + 0.2 * e), self = this;
    var orb = ORBITY[this.v](this.t);
    if (this.v === 'C') return this.roj(dt, e, c, R, orb[0]);
    var dwa = this.v === 'B';
    orb.forEach(function (o, oi) {
      var N = self.maly ? 12 : 26, ogon = (dwa ? 0.6 : 0.8) * e, W = dwa ? Math.max(1.6, w * 0.03) : Math.max(2.2, w * 0.05), pts = [], k;
      for (k = 0; k <= N; k++) {
        var tq = self.t - k * ogon / N, oo = ORBITY[self.v](tq)[oi];
        pts.push(rzut(R, self.phiAt(tq) * o.dir + (o.off || 0), oo.al, oo.be));
      }
      for (k = N - 1; k >= 0; k--) {
        var a = pts[k], b = pts[k + 1], u = k / N, x = (a.z + b.z) > 0 ? self.xf : self.xb;
        x.strokeStyle = rgba(mix(o.kol, o.kon, Math.pow(u, 0.9)), Math.pow(1 - u, 1.25) * e);
        x.lineWidth = W * Math.pow(1 - u, 0.7) * (1 + 0.09 * (a.z + b.z));
        x.beginPath(); x.moveTo(c + a.x, c + a.y); x.lineTo(c + a.x + (b.x - a.x) * 0.72, c + a.y + (b.y - a.y) * 0.72); x.stroke();
      }
      var h = pts[0], p1 = pts[1], dx = h.x - p1.x, dy = h.y - p1.y, d = Math.hypot(dx, dy) || 1;
      dx /= d; dy /= d;
      var L = W * 1.7, B = W * 0.62 * (1 + 0.18 * h.z), xh = h.z > 0 ? self.xf : self.xb;
      xh.fillStyle = rgba(o.kol === KREW ? HOT : KOSC, e);
      xh.beginPath(); xh.moveTo(c + h.x + dx * L, c + h.y + dy * L); xh.lineTo(c + h.x - dy * B, c + h.y + dx * B);
      xh.lineTo(c + h.x - dx * W * 0.5, c + h.y - dy * W * 0.5); xh.lineTo(c + h.x + dy * B, c + h.y - dx * B); xh.closePath(); xh.fill();
    });
  };
  Mysl.prototype.roj = function (dt, e, c, R, o) {
    var h = rzut(R, this.phi, o.al, o.be), co = this.maly ? 0.07 : 0.042, self = this;
    if (this.stan !== 'out') { this.emit += dt; while (this.emit > co) { this.emit -= co; this.glify.push({ x: h.x, y: h.y, z: h.z, a: 0, ch: ZNAKI[(Math.random() * ZNAKI.length) | 0] }); } }
    var zycie = this.maly ? 0.7 : 1.0, fs = Math.max(8, this.w * 0.075);
    this.glify = this.glify.filter(function (q) { q.a += dt / zycie; return q.a < 1; });
    [this.xb, this.xf].forEach(function (x) { x.font = '500 ' + fs.toFixed(1) + 'px "Geist Mono", ui-monospace, monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; });
    this.glify.forEach(function (q) {
      var x = q.z > 0 ? self.xf : self.xb, col = rgba(mix(KREW, KOSC, Math.min(1, q.a * 1.4)), Math.pow(1 - q.a, 1.2) * e);
      if (self.maly) { var s = Math.max(1.5, self.w * 0.045) * (1 - 0.5 * q.a); x.fillStyle = col; x.fillRect(c + q.x - s / 2, c + q.y - s / 2, s, s); }
      else { var sc = (1 - 0.4 * q.a) * (1 + 0.15 * q.z); x.save(); x.translate(c + q.x, c + q.y); x.scale(sc, sc); x.fillStyle = col; x.fillText(q.ch, 0, 0); x.restore(); }
    });
    var p1 = rzut(R, this.phi - 0.12, o.al, o.be), xh = h.z > 0 ? this.xf : this.xb, S = Math.max(3, this.w * 0.05) * (1 + 0.18 * h.z);
    xh.save(); xh.translate(c + h.x, c + h.y); xh.rotate(Math.atan2(h.y - p1.y, h.x - p1.x) + Math.PI / 4);
    xh.fillStyle = rgba(HOT, e); xh.fillRect(-S / 2, -S / 2, S, S); xh.restore();
  };
  function mPetla() { if (!mRaf && !hidden && motionOn) { mLast = 0; mRaf = requestAnimationFrame(mKlatka); } }
  function mKlatka(ts) {
    mRaf = 0;
    var dt = mLast ? Math.min(0.05, (ts - mLast) / 1000) : 1 / 60, dalej = false; mLast = ts;
    myslace = myslace.filter(function (m) { if (m.stan === 'off') return false; m.krok(dt); dalej = dalej || m.stan !== 'off'; return true; });
    if (dalej && !hidden && motionOn) mRaf = requestAnimationFrame(mKlatka);
  }
  Kot.prototype.mysli = function (on) {
    var m = this._m || (this._m = new Mysl(this));
    this.el.classList.toggle('mk-mysli', !!on);
    if (on) {
      if (m.stan === 'on' || m.stan === 'in') return;
      if (m.stan === 'off') { m.przygotuj(); m.k = 0; }
      m.stan = 'in'; this.squint(true);
      if (!motionOn) { m.k = 1; m.statyczny(); return; }
      if (myslace.indexOf(m) < 0) myslace.push(m);
      mPetla();
    } else {
      if (m.stan === 'off' || m.stan === 'out') return;
      this.squint(false);
      if (!motionOn) { m.stan = 'off'; m.k = 0; m.czysc(); this.flash(); return; }
      m.stan = 'out'; if (myslace.indexOf(m) < 0) myslace.push(m); mPetla();
    }
  };

  Kot.prototype.destroy = function () {
    if (this._m) { this._m.stan = 'off'; this._m.czysc(); }
    clearTimeout(this.t);
    this.anims.forEach(function (a) { a.cancel(); });
    this.el.removeEventListener('pointerenter', this._hover);
    live = live.filter(function (k) { return k !== this; }, this);
  };

  var raf = 0, lx = 0, ly = 0;
  g.addEventListener('pointermove', function (e) {
    if (!motionOn || e.pointerType === 'touch') return;
    lx = e.clientX; ly = e.clientY;
    if (!raf) raf = requestAnimationFrame(function () { raf = 0; live.forEach(function (k) { k.look(lx, ly); }); });
  }, { passive: true });
  document.addEventListener('visibilitychange', function () {
    hidden = document.hidden;
    live.forEach(function (k) { k.anims.forEach(function (a) { hidden ? a.pause() : a.play(); }); });
    if (!hidden) mPetla();
  });

  g.MeshugaKot = {
    mount: function (el, opt) { return new Kot(el, opt); },
    ringSVG: ringSVG, catSVG: catSVG,
    setMotion: function (on) {
      motionOn = !!on;
      live.forEach(function (k) {
        k.oczy.style.transform = '';
        k.setRing(k.el.classList.contains('mk-has-ring'));
        k.schedule();
        var m = k._m;   /* myśli w trakcie przełączenia ruchu: od nowa w nowym trybie */
        if (m && m.stan !== 'off') { m.stan = 'off'; m.czysc(); k.mysli(true); }
      });
    },
    wariantMysli: function (v) {
      if (!ORBITY[v]) return;
      wariant = v;
      live.forEach(function (k) { var m = k._m; if (m && m.stan !== 'off') { m.v = v; m.glify = []; if (!motionOn) m.statyczny(); } });
    },
    get motion() { return motionOn; }
  };
})(window);
