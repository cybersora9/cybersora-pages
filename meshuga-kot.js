/* MESHUGA — kot cybersory jako wektor + animacje + cyber-kółka (03.11.2026).
   Użycie:
     const kot = MeshugaKot.mount(el, { ring: true | false });
     kot.squint(true|false)   // mrużenie przy „pisze…” (kółko przyspiesza)
     kot.flash()              // krótki błysk oczu po odpowiedzi
     kot.slucha(true|false)   // słucha mikrofonu (kółko przyspiesza, oczy otwarte)
     kot.setRing(true|false)  // pokazuje albo chowa kółko
     kot.destroy()
     MeshugaKot.setMotion(false)  // wyłącza ruch wszędzie (ustawienie „wyłącz animacje”)
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
  Kot.prototype.destroy = function () {
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
      });
    },
    get motion() { return motionOn; }
  };
})(window);
