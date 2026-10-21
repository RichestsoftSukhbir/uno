/*
 * Animated rule demonstrations: a small table that acts out a scripted
 * scene with the real card art. Scripts are lists of steps, e.g.
 *   ['cap', 'text'], ['play', 'left', 'gskip'], ['skip', 'top'], ['turn', 'right']
 * Faces are short codes: colour letter + value (r7, bskip, gdraw2, wwild4, tdraw5...).
 */
(function () {
  'use strict';
  var Cards = window.UNOCards, I = window.UNOIcons;
  var W = 560, H = 315, CW = 50, CH = 75;
  var COL = { r: 'red', y: 'yellow', g: 'green', b: 'blue', p: 'pink', t: 'teal', o: 'orange', u: 'purple', w: 'wild' };
  var SEATS = {
    you: { x: 84, y: 282, name: 'You', av: 'panda' },
    left: { x: 64, y: 140, name: 'Leo', av: 'cat' },
    top: { x: 280, y: 38, name: 'Mia', av: 'ghost' },
    right: { x: 496, y: 140, name: 'Kai', av: 'rocket-01' }
  };
  var ORDER = ['you', 'left', 'top', 'right'];

  function face(code) {
    if (!code || code === 'back') return 'back';
    if (typeof code !== 'string') return code;
    // standard deck codes for the Desi games: 'AS', '10D', 'KH'...
    var m = /^(10|[2-9AJQK])([SHDC])$/.exec(code);
    if (m) return { s: m[2], r: m[1] };
    var liar = code.slice(-1) === '*';
    var f = { c: COL[code[0]], v: code.slice(1).replace('*', '') };
    if (liar) f.l = 1;
    return f;
  }
  function el(tag, cls, parent, html) {
    var e = document.createElement(tag);
    e.className = cls;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }

  function Demo(root, demo, opts) {
    this.root = root;
    this.demo = demo;
    this.opts = opts || {};
    this.build();
  }
  var D = Demo.prototype;

  D.build = function () {
    var self = this;
    this.root.innerHTML = '';
    this.wrap = el('div', 'demo', this.root);
    this.box = el('div', 'd-box', this.wrap);
    this.stage = el('div', 'd-stage', this.box);
    this.cap = el('div', 'd-cap', this.wrap);
    this.ctrl = el('div', 'd-ctrl', this.wrap,
      '<button class="d-btn" data-a="toggle" title="Pause">' + I.svg('pause') + '</button>' +
      '<button class="d-btn" data-a="replay" title="Replay">' + I.svg('refresh') + '</button>' +
      '<div class="d-prog"><i></i></div><span class="d-title"></span>');
    this.ctrl.querySelector('[data-a=toggle]').onclick = function () { self.toggle(); };
    this.ctrl.querySelector('[data-a=replay]').onclick = function () { self.restart(); };
    this.prog = this.ctrl.querySelector('.d-prog i');
    this.ctrl.querySelector('.d-title').textContent = this.demo.title;
    this.fit();
    this.ro = window.ResizeObserver ? new ResizeObserver(function () { self.fit(); }) : null;
    if (this.ro) this.ro.observe(this.box);
    this.restart();
  };
  D.fit = function () {
    var w = this.box.clientWidth || W;
    var k = w / W;
    this.box.style.height = (H * k) + 'px';
    this.stage.style.transform = 'scale(' + k + ')';
  };

  /* ---------------- scene ---------------- */
  D.reset = function () {
    var st = this.stage;
    st.innerHTML = '';
    st.classList.remove('dark');
    var two = !!this.demo.two;
    this.seatsOn = two ? ['you', 'top'] : ORDER.slice();
    this.isDos = !!this.demo.dos;
    this.backKind = this.demo.patti ? 'patti' : (this.isDos ? 'dos' : 'uno');
    this.stage.classList.toggle('patti', !!this.demo.patti);
    el('div', 'd-felt', st);
    // direction ring: arrows sit exactly on the ellipse, pointing along it (clockwise)
    var RX = 100, RY = 50, arrows = '';
    [20, 110, 200, 290].forEach(function (deg) {
      var t = deg * Math.PI / 180;
      var x = RX * Math.cos(t), y = RY * Math.sin(t);
      var ang = Math.atan2(RY * Math.cos(t), -RX * Math.sin(t)) * 180 / Math.PI;
      arrows += '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + ang.toFixed(1) + ')"><g class="d-arrow"><path class="d-ring-arrow" d="M-5 -6 L3 0 L-5 6"/></g></g>';
    });
    this.ring = el('div', 'd-ring', st, '<svg viewBox="-110 -60 220 120"><ellipse rx="' + RX + '" ry="' + RY + '" class="d-ring-line"/>' + arrows + '</svg>');
    this.ringLine = this.ring.querySelector('.d-ring-line');
    this.ringFlow = gsap.to(this.ringLine, { attr: { 'stroke-dashoffset': -140 }, duration: 4, ease: 'none', repeat: -1 });
    this.ring.style.display = this.isDos || this.demo.patti ? 'none' : '';
    this.halo = el('div', 'd-halo', st);
    this.glow = el('div', 'd-glow', st);
    this.seat = {};
    this.count = {};
    var self = this;
    this.seatsOn.forEach(function (k) {
      var s = SEATS[k];
      var t = el('div', 'd-seat d-seat-' + k, st, I.avatar(s.av) + '<b>' + s.name + '</b><span class="d-count">0</span>');
      t.style.left = s.x + 'px'; t.style.top = s.y + 'px';
      self.seat[k] = t;
      self.count[k] = 0;
      if (k !== 'you') {
        var fan = el('div', 'd-fan d-fan-' + k, st);
        fan.style.left = s.x + 'px'; fan.style.top = (s.y + (k === 'top' ? 26 : -46)) + 'px';
        for (var i = 0; i < 3; i++) { var c = el('i', '', fan); c.style.backgroundImage = Cards.faceUrl('back', { back: self.backKind }); c.style.transform = 'rotate(' + ((i - 1) * 14) + 'deg)'; }
        self.seat[k].fan = fan;
      }
    });
    this.deckPos = this.isDos ? { x: 150, y: 140 } : (this.demo.launcher ? { x: 228, y: 146 } : { x: 236, y: 148 });
    this.pilePos = this.isDos ? { x: 420, y: 140 } : { x: 324, y: 148 };
    if (this.demo.launcher) {
      this.deck = el('div', 'd-launcher', st, '<i></i>');
    } else {
      this.deck = el('div', 'd-deck', st);
      for (var d = 0; d < 4; d++) { var g = el('i', '', this.deck); g.style.backgroundImage = Cards.faceUrl('back', { back: this.backKind }); g.style.transform = 'translate(' + (-d) + 'px,' + (-d * 1.5) + 'px)'; }
    }
    this.deck.style.left = this.deckPos.x + 'px'; this.deck.style.top = this.deckPos.y + 'px';
    if (this.demo.patti && !this.demo.deck) this.deck.style.display = 'none';
    this.fx = el('div', 'd-fx', st);
    this.cap.innerHTML = '&nbsp;';
    this.pile = [];
    this.trickCards = [];
    this.pot = null;
    this.lbl = null;
    this.pairs = 0;
    this.hand = {};
    this.handOrder = [];
    this.center = [];
    this.handSeq = 0;
    this.dir = 1;
    this.turnSeat = null;
  };

  D.card = function (f, x, y, up) {
    var c = el('div', 'd-card', this.stage, '<div class="d-in"><i class="d-f"></i><i class="d-b"></i></div>');
    var inner = c.firstChild;
    var back = this.backKind;
    var fc = face(f);
    inner.children[0].style.backgroundImage = Cards.faceUrl(fc === 'back' ? 'back' : fc, { back: back });
    inner.children[1].style.backgroundImage = Cards.faceUrl('back', { back: back });
    gsap.set(c, { x: x - CW / 2, y: y - CH / 2 });
    gsap.set(inner, { rotationY: up === false ? 180 : 0 });
    c.inner = inner;
    return c;
  };
  D.setFront = function (c, f) {
    c.inner.children[0].style.backgroundImage = Cards.faceUrl(face(f), { back: this.backKind });
  };
  D.handPos = function (i, n) {
    var sp = Math.min(46, 300 / Math.max(1, n));
    return { x: 300 + (i - (n - 1) / 2) * sp, y: 268 };
  };
  D.layoutHand = function (tl, at) {
    var self = this;
    var n = this.handOrder.length;
    this.handOrder.forEach(function (id, i) {
      var p = self.handPos(i, n);
      tl.to(self.hand[id], { x: p.x - CW / 2, y: p.y - CH / 2, rotation: (i - (n - 1) / 2) * 4, duration: 0.35, ease: 'power2.out' }, at);
    });
  };
  D.seatXY = function (k) {
    var s = SEATS[k];
    if (k === 'you') return { x: 300, y: 268 };
    return { x: s.x, y: s.y + (k === 'top' ? 26 : -46) };
  };
  D.setCount = function (tl, k, delta, at) {
    var self = this;
    tl.call(function () {
      self.count[k] = Math.max(0, self.count[k] + delta);
      var c = self.seat[k] && self.seat[k].querySelector('.d-count');
      if (c) { c.textContent = self.count[k]; gsap.fromTo(c, { scale: 1.6 }, { scale: 1, duration: 0.3 }); }
    }, null, at);
  };
  D.pileTop = function () { return this.pile[this.pile.length - 1]; };
  D.toPile = function (tl, c, at, opts) {
    opts = opts || {};
    var n = this.pile.length;
    this.pile.push(c);
    var r = (Math.sin(n * 7.3) * 22);
    var px = this.pilePos.x + Math.sin(n * 3.1) * 5, py = this.pilePos.y + Math.cos(n * 2.3) * 4;
    tl.set(c, { zIndex: 20 + n }, at);
    tl.to(c, { x: px - CW / 2, y: py - CH / 2, rotation: r, duration: 0.55, ease: 'power3.out' }, at);
    tl.to(c, { scale: 1.3, duration: 0.24, ease: 'power2.out' }, at);
    tl.to(c, { scale: 1, duration: 0.3, ease: 'bounce.out' }, at + 0.24);
    if (opts.flip !== false) tl.to(c.inner, { rotationY: opts.faceDown ? 180 : 0, duration: 0.45 }, at);
  };
  D.float = function (tl, at, k, html, cls) {
    var self = this;
    tl.call(function () {
      var p = k === 'pile' ? self.pilePos : (k === 'center' ? { x: 280, y: 150 } : SEATS[k]);
      var f = el('div', 'd-float ' + (cls || ''), self.fx, html);
      f.style.left = p.x + 'px'; f.style.top = (p.y - 20) + 'px';
      gsap.timeline({ onComplete: function () { f.remove(); } })
        .fromTo(f, { scale: 0.2, opacity: 0 }, { scale: 1.1, opacity: 1, duration: 0.25, ease: 'back.out(2.5)' })
        .to(f, { y: -30, opacity: 0, duration: 0.6, ease: 'power1.in' }, '+=0.7');
    }, null, at);
  };
  D.bubble = function (tl, at, k, html, cls) {
    var self = this;
    tl.call(function () {
      var p = SEATS[k];
      var b = el('div', 'd-bubble ' + (cls || ''), self.fx, html);
      b.style.left = p.x + 'px'; b.style.top = (p.y - (k === 'top' ? -58 : 30)) + 'px';
      gsap.timeline({ onComplete: function () { b.remove(); } })
        .fromTo(b, { scale: 0, rotation: -10 }, { scale: 1, rotation: 0, duration: 0.35, ease: 'elastic.out(1, .5)' })
        .to(b, { opacity: 0, duration: 0.3 }, '+=1.3');
    }, null, at);
  };

  /* ---------------- steps ---------------- */
  var STEPS = {
    cap: function (tl, at, text) {
      var self = this;
      tl.call(function () { self.cap.innerHTML = '<span>' + text + '</span>'; gsap.fromTo(self.cap.firstChild, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 }); }, null, at);
      return 0.25;
    },
    wait: function (tl, at, s) { return s; },
    pile: function (tl, at, f) {
      var c = this.card(f, this.pilePos.x, this.pilePos.y, true);
      this.pile.push(c);
      gsap.set(c, { rotation: -8, zIndex: 20 });
      return 0;
    },
    hand: function (tl, at, faces) {
      var self = this;
      faces.forEach(function (f) {
        var id = self.handSeq++;
        var c = self.card(f, 300, 268, true);
        self.hand[id] = c;
        self.handOrder.push(id);
        c.classList.add('mine');
      });
      var n = this.handOrder.length;
      this.handOrder.forEach(function (id, i) { var p = self.handPos(i, n); gsap.set(self.hand[id], { x: p.x - CW / 2, y: p.y - CH / 2, rotation: (i - (n - 1) / 2) * 4, zIndex: 40 + i }); });
      return 0;
    },
    counts: function (tl, at, map) {
      var self = this;
      Object.keys(map).forEach(function (k) {
        self.count[k] = map[k];
        var c = self.seat[k] && self.seat[k].querySelector('.d-count');
        if (c) c.textContent = map[k];
      });
      return 0;
    },
    dark: function () { this.stage.classList.add('dark'); return 0; },
    turn: function (tl, at, k) {
      var self = this;
      var s = SEATS[k];
      tl.to(this.glow, { left: s.x, top: s.y, opacity: 1, duration: 0.4, ease: 'power2.out' }, at);
      tl.call(function () {
        Object.keys(self.seat).forEach(function (q) { self.seat[q].classList.toggle('on', q === k); });
      }, null, at);
      return 0.45;
    },
    play: function (tl, at, k, f, opts) {
      opts = opts || {};
      var c;
      if (k === 'you') {
        var id = typeof f === 'number' ? this.handOrder[f] : null;
        c = this.hand[id];
        this.handOrder.splice(f, 1);
        tl.to(c, { y: '-=30', duration: 0.15, ease: 'power2.out' }, at);
        at += 0.15;
        if (opts.face) tl.call(this.setFront.bind(this, c, opts.face), null, at);
      } else {
        var p = this.seatXY(k);
        c = this.card(f, p.x, p.y, false);
        gsap.set(c, { opacity: 0 });
        tl.set(c, { opacity: 1 }, at);
        this.setCount(tl, k, -1, at);
      }
      this.toPile(tl, c, at, { faceDown: opts.faceDown });
      if (k === 'you') { this.layoutHand(tl, at + 0.1); this.setCount(tl, 'you', -1, at); }
      return 0.7;
    },
    bad: function (tl, at, idx, why) {
      var c = this.hand[this.handOrder[idx]];
      tl.to(c, { y: '-=24', duration: 0.15 }, at);
      tl.fromTo(c, { x: '-=6' }, { x: '+=12', duration: 0.06, repeat: 5, yoyo: true }, at + 0.15);
      var self = this;
      tl.call(function () {
        var p = { x: parseFloat(gsap.getProperty(c, 'x')) + CW / 2, y: parseFloat(gsap.getProperty(c, 'y')) };
        var f = el('div', 'd-float bad', self.fx, I.svg('cancel-01'));
        f.style.left = p.x + 'px'; f.style.top = p.y + 'px';
        gsap.timeline({ onComplete: function () { f.remove(); } }).fromTo(f, { scale: 0 }, { scale: 1.2, duration: 0.25, ease: 'back.out(3)' }).to(f, { opacity: 0, duration: 0.3 }, '+=0.6');
      }, null, at + 0.15);
      tl.to(c, { y: '+=24', duration: 0.25 }, at + 0.6);
      return 0.9;
    },
    draw: function (tl, at, k, n, faces) {
      var self = this;
      for (var i = 0; i < n; i++) {
        var t = at + i * 0.16;
        var src = this.deckPos;
        if (k === 'you') {
          var f = faces && faces[i] ? faces[i] : 'back';
          var c = this.card(f, src.x, src.y, false);
          var id = this.handSeq++;
          this.hand[id] = c;
          this.handOrder.push(id);
          c.classList.add('mine');
          gsap.set(c, { opacity: 0, zIndex: 40 + id });
          tl.set(c, { opacity: 1 }, t);
          tl.to(c.inner, { rotationY: 0, duration: 0.4 }, t + 0.1);
          this.layoutHand(tl, t);
        } else {
          var p = this.seatXY(k);
          var c2 = this.card('back', src.x, src.y, false);
          gsap.set(c2, { opacity: 0, zIndex: 60 });
          tl.set(c2, { opacity: 1 }, t);
          tl.to(c2, { x: p.x - CW / 2, y: p.y - CH / 2, rotation: 10, scale: 0.6, duration: 0.4, ease: 'power2.in' }, t);
          tl.to(c2, { opacity: 0, duration: 0.1 }, t + 0.4);
        }
        this.setCount(tl, k, 1, t + 0.3);
      }
      return 0.4 + n * 0.16;
    },
    skip: function (tl, at, k) { this.float(tl, at, k, I.svg('blocked'), 'skip'); return 0.6; },
    plus: function (tl, at, k, n) { this.float(tl, at, k, '+' + n, 'plus'); return 0.4; },
    reverse: function (tl, at) {
      this.dir = -this.dir;
      // every arrow turns round on the spot and the dashes flow the other way
      var dir = this.dir, flow = this.ringFlow;
      tl.to(this.ring.querySelectorAll('.d-arrow'), { rotation: dir === 1 ? 0 : 180, svgOrigin: '0 0', duration: 0.5, ease: 'back.inOut(2)', stagger: 0.06 }, at);
      tl.call(function () { gsap.to(flow, { timeScale: dir, duration: 0.6 }); }, null, at);
      tl.fromTo(this.ring, { scale: 1 }, { scale: 1.08, duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.out' }, at);
      this.float(tl, at, 'pile', I.svg(this.dir === 1 ? 'refresh-cw' : 'refresh-ccw'), 'rev');
      return 0.9;
    },
    color: function (tl, at, c) {
      var col = Cards.COLORS[COL[c] || c];
      var self = this;
      tl.call(function () {
        self.halo.style.background = 'radial-gradient(circle, ' + col + ' 0%, transparent 70%)';
        for (var i = 0; i < 16; i++) {
          var s = el('i', 'd-spark', self.fx); s.style.background = col;
          s.style.left = self.pilePos.x + 'px'; s.style.top = self.pilePos.y + 'px';
          var a = Math.random() * 6.28, r = 40 + Math.random() * 50;
          gsap.to(s, { x: Math.cos(a) * r, y: Math.sin(a) * r, opacity: 0, duration: 0.7, onComplete: s.remove.bind(s) });
        }
      }, null, at);
      tl.fromTo(this.halo, { opacity: 0, scale: 0.6 }, { opacity: 0.9, scale: 1, duration: 0.4 }, at);
      return 0.6;
    },
    bubble: function (tl, at, k, text, cls) { this.bubble(tl, at, k, text, cls); return 0.5; },
    banner: function (tl, at, text, cls) {
      var self = this;
      tl.call(function () {
        var b = el('div', 'd-banner ' + (cls || ''), self.fx, text);
        gsap.timeline({ onComplete: function () { b.remove(); } })
          .fromTo(b, { scale: 2.6, opacity: 0, rotation: -10 }, { scale: 1, opacity: 1, rotation: -4, duration: 0.4, ease: 'power3.out' })
          .to(b, { opacity: 0, scale: 0.8, duration: 0.3 }, '+=0.9');
      }, null, at);
      return 1.2;
    },
    stack: function (tl, at, n) { this.float(tl, at, 'pile', '+' + n, 'plus big'); return 0.5; },
    flip: function (tl, at, spec) {
      var self = this;
      spec = spec || {};
      tl.call(function () { self.stage.classList.toggle('dark'); }, null, at + 0.3);
      var all = this.pile.slice(-1).concat(this.handOrder.map(function (id) { return self.hand[id]; }));
      all.forEach(function (c, i) {
        tl.to(c, { scale: 1.15, duration: 0.25 }, at + i * 0.05);
        tl.to(c.inner, { rotationY: '+=180', duration: 0.3, ease: 'power2.in' }, at + i * 0.05);
        tl.call(function () {
          var f = c === self.pileTop() ? spec.pile : (spec.hand || [])[self.handOrder.map(function (id) { return self.hand[id]; }).indexOf(c)];
          if (f) self.setFront(c, f);
        }, null, at + i * 0.05 + 0.3);
        tl.to(c.inner, { rotationY: '+=180', duration: 0.3, ease: 'power2.out' }, at + i * 0.05 + 0.3);
        tl.to(c, { scale: 1, duration: 0.25 }, at + i * 0.05 + 0.55);
      });
      tl.fromTo(this.deck, { rotationY: 0 }, { rotationY: 360, duration: 0.7 }, at);
      return 1.1;
    },
    swap: function (tl, at, a, b, newHand) {
      var self = this;
      var pa = this.seatXY(a), pb = this.seatXY(b);
      [[pa, pb], [pb, pa]].forEach(function (pp, j) {
        for (var i = 0; i < 3; i++) {
          var c = self.card('back', pp[0].x, pp[0].y, false);
          gsap.set(c, { opacity: 0, scale: 0.7, zIndex: 70 });
          tl.set(c, { opacity: 1 }, at + i * 0.06);
          tl.to(c, { x: pp[1].x - CW / 2, y: pp[1].y - CH / 2, rotation: 200 * (j ? -1 : 1), duration: 0.7, ease: 'power2.inOut' }, at + i * 0.06);
          tl.to(c, { opacity: 0, duration: 0.15 }, at + 0.75 + i * 0.06);
        }
      });
      tl.call(function () { var t = self.count[a]; self.count[a] = self.count[b]; self.count[b] = t; [a, b].forEach(function (k) { var e = self.seat[k] && self.seat[k].querySelector('.d-count'); if (e) e.textContent = self.count[k]; }); }, null, at + 0.7);
      if (newHand && (a === 'you' || b === 'you')) {
        var ids = this.handOrder.slice();
        ids.forEach(function (id) { tl.to(self.hand[id], { opacity: 0, y: '-=40', duration: 0.3 }, at); });
        this.handOrder = [];
        tl.call(function () { ids.forEach(function (id) { self.hand[id].remove(); }); }, null, at + 0.35);
        STEPS.hand.call(this, tl, at, newHand);
        this.handOrder.forEach(function (id) { gsap.set(self.hand[id], { opacity: 0 }); tl.to(self.hand[id], { opacity: 1, duration: 0.3 }, at + 0.8); });
      }
      return 1.1;
    },
    rotate: function (tl, at, newHand) {
      var self = this;
      var ks = this.seatsOn;
      ks.forEach(function (k, i) {
        var to = ks[(i + 1) % ks.length];
        var pa = self.seatXY(k), pb = self.seatXY(to);
        var c = self.card('back', pa.x, pa.y, false);
        gsap.set(c, { opacity: 0, scale: 0.7, zIndex: 70 });
        tl.set(c, { opacity: 1 }, at);
        tl.to(c, { x: pb.x - CW / 2, y: pb.y - CH / 2, rotation: 180, duration: 0.7, ease: 'power2.inOut' }, at);
        tl.to(c, { opacity: 0, duration: 0.15 }, at + 0.75);
      });
      if (newHand) {
        var ids = this.handOrder.slice();
        ids.forEach(function (id) { tl.to(self.hand[id], { opacity: 0, duration: 0.3 }, at); });
        this.handOrder = [];
        STEPS.hand.call(this, tl, at, newHand);
        this.handOrder.forEach(function (id) { gsap.set(self.hand[id], { opacity: 0 }); tl.to(self.hand[id], { opacity: 1, duration: 0.3 }, at + 0.8); });
      }
      return 1.1;
    },
    launch: function (tl, at, k, n) {
      var self = this;
      tl.to(this.deck, { scale: 0.88, duration: 0.08, yoyo: true, repeat: 1 }, at);
      if (!n) { this.float(tl, at + 0.1, 'pile', 'click…', 'claim'); return 0.8; }
      tl.fromTo(this.stage, { x: 0 }, { x: 4, duration: 0.05, repeat: 5, yoyo: true, clearProps: 'x' }, at + 0.1);
      var p = this.seatXY(k);
      for (var i = 0; i < n; i++) {
        var c = this.card('back', this.deckPos.x, this.deckPos.y, false);
        gsap.set(c, { opacity: 0, zIndex: 70 });
        var ang = (i / n) * 6.28;
        tl.set(c, { opacity: 1 }, at + 0.1);
        tl.to(c, { x: this.deckPos.x - CW / 2 + Math.cos(ang) * 70, y: this.deckPos.y - CH / 2 + Math.sin(ang) * 40 - 20, rotation: 360 + i * 40, duration: 0.35, ease: 'power2.out' }, at + 0.1);
        tl.to(c, { x: p.x - CW / 2, y: p.y - CH / 2, scale: 0.6, duration: 0.45, ease: 'power2.in' }, at + 0.5 + i * 0.05);
        tl.to(c, { opacity: 0, duration: 0.1 }, at + 0.95 + i * 0.05);
      }
      this.float(tl, at + 0.2, k, '+' + n, 'plus');
      this.setCount(tl, k, n, at + 0.9);
      return 1.3;
    },
    out: function (tl, at, k) {
      var self = this;
      tl.call(function () { self.seat[k].classList.add('out'); if (self.seat[k].fan) self.seat[k].fan.style.opacity = 0.2; }, null, at);
      this.bubble(tl, at, k, 'KNOCKED OUT', 'red');
      return 0.9;
    },
    facedown: function (tl, at, k, claim) {
      var c;
      if (k === 'you') {
        var id = this.handOrder[0];
        c = this.hand[id];
        this.handOrder.splice(0, 1);
        tl.to(c.inner, { rotationY: 180, duration: 0.3 }, at);
        this.layoutHand(tl, at + 0.2);
      } else {
        var p = this.seatXY(k);
        c = this.card('back', p.x, p.y, false);
        gsap.set(c, { opacity: 0 });
        tl.set(c, { opacity: 1 }, at);
        this.setCount(tl, k, -1, at);
      }
      this.toPile(tl, c, at + 0.1, { faceDown: true });
      this.float(tl, at + 0.5, 'pile', '“' + claim + '”', 'claim');
      return 0.9;
    },
    reveal: function (tl, at, f, honest) {
      var c = this.pileTop();
      tl.call(this.setFront.bind(this, c, f), null, at);
      tl.to(c, { scale: 1.4, duration: 0.25 }, at);
      tl.to(c.inner, { rotationY: 0, duration: 0.45 }, at);
      tl.to(c, { scale: 1, duration: 0.3 }, at + 0.6);
      STEPS.banner.call(this, tl, at + 0.4, honest ? 'TRUTH!' : 'BUSTED!', honest ? 'good' : 'bad');
      return 1.4;
    },
    takeback: function (tl, at, k) {
      var c = this.pile.pop();
      var p = this.seatXY(k);
      tl.to(c, { x: p.x - CW / 2, y: p.y - CH / 2, scale: 0.6, rotation: 0, duration: 0.5, ease: 'power2.inOut' }, at);
      tl.to(c, { opacity: 0, duration: 0.15 }, at + 0.5);
      this.setCount(tl, k, 1, at + 0.5);
      return 0.6;
    },
    discardAll: function (tl, at, idxs) {
      var self = this;
      // idxs are positions in the current hand
      var ids = idxs.map(function (i) { return self.handOrder[i]; });
      this.handOrder = this.handOrder.filter(function (id) { return ids.indexOf(id) < 0; });
      ids.forEach(function (id, j) { self.toPile(tl, self.hand[id], at + j * 0.15); self.setCount(tl, 'you', -1, at + j * 0.15); });
      this.layoutHand(tl, at + 0.2);
      return 0.6 + ids.length * 0.15;
    },
    dare: function (tl, at, text, cat) {
      var self = this;
      tl.call(function () {
        var d = el('div', 'd-dare d-dare-' + (cat || 'family'), self.fx, '<small>' + (cat || 'family').toUpperCase() + ' DARE</small><p>' + text + '</p>');
        gsap.timeline({ onComplete: function () { d.remove(); } })
          .fromTo(d, { rotationY: 90, scale: 0.6 }, { rotationY: 0, scale: 1, duration: 0.45, ease: 'back.out(1.6)' })
          .to(d, { opacity: 0, y: -10, duration: 0.3 }, '+=1.8');
      }, null, at);
      return 2.5;
    },
    roulette: function (tl, at, k, faces) {
      var self = this;
      var p = this.seatXY(k);
      faces.forEach(function (f, i) {
        var t = at + i * 0.55;
        var c = self.card(f, self.deckPos.x, self.deckPos.y, false);
        gsap.set(c, { opacity: 0, zIndex: 70 });
        tl.set(c, { opacity: 1 }, t);
        tl.to(c, { x: 280 - CW / 2 + i * 8, y: 150 - CH / 2 - 10, duration: 0.25 }, t);
        tl.to(c.inner, { rotationY: 0, duration: 0.25 }, t + 0.1);
        tl.to(c, { x: p.x - CW / 2, y: p.y - CH / 2, scale: 0.6, duration: 0.3, ease: 'power2.in' }, t + 0.4 + (i === faces.length - 1 ? 0.4 : 0));
        tl.to(c, { opacity: 0, duration: 0.1 }, t + 0.7 + (i === faces.length - 1 ? 0.4 : 0));
        self.setCount(tl, k, 1, t + 0.6);
      });
      return faces.length * 0.55 + 0.6;
    },
    /* DOS */
    center: function (tl, at, faces) {
      var self = this;
      faces.forEach(function (f) { self.addSlot(f, true); });
      return 0;
    },
    match: function (tl, at, slot, idxs, bonus) {
      var self = this;
      var s = this.center[slot];
      var ids = idxs.map(function (i) { return self.handOrder[i]; });
      this.handOrder = this.handOrder.filter(function (id) { return ids.indexOf(id) < 0; });
      ids.forEach(function (id, j) {
        var c = self.hand[id];
        s.matched.push(c);
        tl.set(c, { zIndex: 30 + j }, at);
        tl.to(c, { x: s.x - CW / 2 + 14 + j * 16, y: 150 - CH / 2 + 30 + j * 10, rotation: 10 + j * 8, duration: 0.5, ease: 'power3.out' }, at + j * 0.15);
        self.setCount(tl, 'you', -1, at + j * 0.15);
      });
      this.layoutHand(tl, at + 0.25);
      if (bonus) this.float(tl, at + 0.6, 'center', bonus, 'claim');
      return 0.9;
    },
    clear: function (tl, at, refill) {
      var self = this;
      var keep = [];
      var j = 0;
      this.center.forEach(function (s) {
        if (!s.matched.length && !s.taken) { keep.push(s); return; }
        [s.card].concat(s.matched).forEach(function (c) {
          tl.to(c, { x: self.pilePos.x - CW / 2, y: self.pilePos.y - CH / 2, rotation: (j % 3 - 1) * 15, duration: 0.45, ease: 'power2.inOut' }, at + j * 0.06);
          j++;
        });
      });
      this.center = keep;
      var t = at + 0.5 + j * 0.06;
      (refill || []).forEach(function (f, i) { self.addSlot(f, false, tl, t + i * 0.2); });
      this.layoutCenter(tl, t);
      return 0.8 + j * 0.06 + (refill || []).length * 0.2;
    },
    take: function (tl, at, slots) {
      var self = this;
      slots.forEach(function (i) { var sl = self.center[i]; sl.taken = true; tl.to(sl.card, { y: '-=10', duration: 0.2, yoyo: true, repeat: 1 }, at); });
      return 0.45;
    },
    /* ---- Desi games ---- */
    trick: function (tl, at, k, f) {
      var c;
      var sp = this.seatXY(k);
      var tx = 280 + (sp.x - 280) * 0.42, ty = 150 + (sp.y - 150) * 0.42;
      if (k === 'you') {
        var id = this.handOrder[f];
        c = this.hand[id];
        this.handOrder.splice(f, 1);
        this.layoutHand(tl, at + 0.1);
        this.setCount(tl, 'you', -1, at);
      } else {
        c = this.card(f, sp.x, sp.y, false);
        gsap.set(c, { opacity: 0 });
        tl.set(c, { opacity: 1 }, at);
        this.setCount(tl, k, -1, at);
      }
      this.trickCards = (this.trickCards || []).concat([c]);
      tl.set(c, { zIndex: 30 + this.trickCards.length }, at);
      tl.to(c, { x: tx - CW / 2, y: ty - CH / 2, rotation: (Math.random() - 0.5) * 24, scale: 0.9, duration: 0.5, ease: 'power3.out' }, at);
      tl.to(c.inner, { rotationY: 0, duration: 0.4 }, at);
      return 0.6;
    },
    collect: function (tl, at, dest) {
      var self = this;
      var cards = this.trickCards || [];
      this.trickCards = [];
      var p = dest === 'out' ? { x: 470, y: 250 } : this.seatXY(dest);
      cards.forEach(function (c, i) {
        tl.to(c, { x: p.x - CW / 2, y: p.y - CH / 2, rotation: 0, scale: 0.6, duration: 0.5, ease: 'power2.inOut' }, at + i * 0.06);
        if (dest === 'out') tl.to(c.inner, { rotationY: 180, duration: 0.3 }, at + i * 0.06);
        tl.to(c, { opacity: dest === 'out' ? 0.9 : 0, duration: 0.2 }, at + 0.5 + i * 0.06);
      });
      if (dest !== 'out') this.setCount(tl, dest, cards.length, at + 0.5);
      return 0.8 + cards.length * 0.06;
    },
    pickupPile: function (tl, at, k) {
      var p = this.seatXY(k);
      var cards = this.pile.splice(0);
      cards.forEach(function (c, i) {
        tl.to(c, { x: p.x - CW / 2, y: p.y - CH / 2, rotation: 0, scale: 0.6, duration: 0.5, ease: 'power2.inOut' }, at + i * 0.05);
        tl.to(c, { opacity: 0, duration: 0.2 }, at + 0.5 + i * 0.05);
      });
      this.setCount(tl, k, cards.length, at + 0.5);
      return 0.8 + cards.length * 0.05;
    },
    chips: function (tl, at, k, amount) {
      var self = this;
      if (!this.pot) {
        this.pot = el('div', 'd-pot', this.stage, '<i></i><i></i><i></i><b>0</b>');
        this.potAmt = 0;
      }
      var p = SEATS[k];
      for (var i = 0; i < 4; i++) {
        var ch = el('i', 'd-chip', this.fx);
        ch.style.left = p.x + 'px'; ch.style.top = p.y + 'px';
        gsap.set(ch, { opacity: 0 });
        tl.set(ch, { opacity: 1 }, at + i * 0.05);
        tl.to(ch, { left: 280 + (Math.random() - 0.5) * 20, top: 140 + (Math.random() - 0.5) * 10, duration: 0.5, ease: 'power2.inOut' }, at + i * 0.05);
        tl.to(ch, { opacity: 0, duration: 0.2 }, at + 0.6 + i * 0.05);
      }
      tl.call(function () { self.potAmt += amount; self.pot.querySelector('b').textContent = self.potAmt; gsap.fromTo(self.pot, { scale: 1.2 }, { scale: 1, duration: 0.3 }); }, null, at + 0.55);
      this.float(tl, at, k, '-' + amount, 'plus');
      return 0.8;
    },
    grid: function (tl, at, k, f) {
      var fc = face(f);
      var order = ['S', 'H', 'D', 'C'];
      var r = fc.r === 'A' ? 1 : fc.r === 'J' ? 11 : fc.r === 'Q' ? 12 : fc.r === 'K' ? 13 : +fc.r;
      var gx = 280 + (r - 7) * 24, gy = 92 + order.indexOf(fc.s) * 38;
      var sp = this.seatXY(k);
      var c = this.card(fc, sp.x, sp.y, false);
      gsap.set(c, { opacity: 0, zIndex: 25 + r });
      tl.set(c, { opacity: 1 }, at);
      tl.to(c, { x: gx - CW / 2, y: gy - CH / 2, scale: 0.48, rotation: 0, duration: 0.55, ease: 'power3.out' }, at);
      tl.to(c.inner, { rotationY: 0, duration: 0.4 }, at);
      if (k !== 'you') this.setCount(tl, k, -1, at);
      return 0.65;
    },
    gridSet: function (tl, at, codes) {
      var self = this;
      codes.forEach(function (f) {
        var fc = face(f);
        var order = ['S', 'H', 'D', 'C'];
        var r = fc.r === 'A' ? 1 : fc.r === 'J' ? 11 : fc.r === 'Q' ? 12 : fc.r === 'K' ? 13 : +fc.r;
        var c = self.card(fc, 280 + (r - 7) * 24, 92 + order.indexOf(fc.s) * 38, true);
        gsap.set(c, { scale: 0.48, zIndex: 25 + r });
      });
      return 0;
    },
    steal: function (tl, at, k, f) {
      var sp = this.seatXY(k);
      var c = this.card(f, sp.x, sp.y, false);
      var id = this.handSeq++;
      this.hand[id] = c;
      this.handOrder.push(id);
      c.classList.add('mine');
      gsap.set(c, { opacity: 0, scale: 0.7, zIndex: 40 + id });
      tl.set(c, { opacity: 1 }, at);
      tl.to(c, { y: '-=24', duration: 0.2 }, at);
      tl.to(c, { scale: 1, duration: 0.4 }, at + 0.2);
      tl.to(c.inner, { rotationY: 0, duration: 0.35 }, at + 0.3);
      this.layoutHand(tl, at + 0.2);
      this.setCount(tl, k, -1, at);
      this.setCount(tl, 'you', 1, at + 0.4);
      return 0.8;
    },
    pairOut: function (tl, at, idxs) {
      var self = this;
      var ids = idxs.map(function (i) { return self.handOrder[i]; });
      this.handOrder = this.handOrder.filter(function (id) { return ids.indexOf(id) < 0; });
      this.pairs = (this.pairs || 0) + 1;
      ids.forEach(function (id, j) {
        var c = self.hand[id];
        tl.to(c, { x: 410 + j * 14 - CW / 2, y: 236 - CH / 2 - self.pairs * 3, rotation: -10 + j * 18, scale: 0.6, duration: 0.5, ease: 'power3.out' }, at + j * 0.1);
        self.setCount(tl, 'you', -1, at + j * 0.1);
      });
      this.layoutHand(tl, at + 0.3);
      this.float(tl, at + 0.4, 'you', 'Pair!', 'claim');
      return 0.9;
    },
    label: function (tl, at, text) {
      var self = this;
      tl.call(function () {
        if (!self.lbl) self.lbl = el('div', 'd-label', self.stage);
        self.lbl.innerHTML = text;
        gsap.fromTo(self.lbl, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2)' });
      }, null, at);
      return 0.4;
    },
    place: function (tl, at, idx) {
      var id = this.handOrder[idx];
      var c = this.hand[id];
      this.handOrder.splice(idx, 1);
      this.center.push({ card: c, matched: [], x: 0 });
      this.setCount(tl, 'you', -1, at);
      this.layoutCenter(tl, at);
      this.layoutHand(tl, at + 0.1);
      return 0.6;
    }
  };
  D.addSlot = function (f, instant, tl, at) {
    var c = this.card(f, this.deckPos.x, this.deckPos.y, !!instant);
    this.center.push({ card: c, matched: [], x: 0 });
    if (instant) { this.layoutCenter(); return; }
    gsap.set(c, { opacity: 0 });
    tl.set(c, { opacity: 1 }, at);
    tl.to(c.inner, { rotationY: 0, duration: 0.35 }, at);
  };
  D.layoutCenter = function (tl, at) {
    var n = this.center.length;
    var self = this;
    this.center.forEach(function (s, i) {
      s.x = 285 + (i - (n - 1) / 2) * 72;
      if (tl) tl.to(s.card, { x: s.x - CW / 2, y: 150 - CH / 2, rotation: 0, duration: 0.4, ease: 'power2.out' }, at);
      else gsap.set(s.card, { x: s.x - CW / 2, y: 150 - CH / 2 });
    });
  };

  /* ---------------- playback ---------------- */
  D.restart = function () {
    var self = this;
    if (this.tl) this.tl.kill();
    if (this.ringFlow) this.ringFlow.kill();
    this.reset();
    var tl = this.tl = gsap.timeline({ paused: true, onUpdate: function () { self.prog.style.width = (tl.progress() * 100) + '%'; } });
    var at = 0.3;
    (this.demo.steps || []).forEach(function (s) {
      var fn = STEPS[s[0]];
      if (!fn) return;
      var d = fn.apply(self, [tl, at].concat(s.slice(1)));
      at += d + (d ? 0.25 : 0);
    });
    tl.call(function () {}, null, at + 1.6);
    tl.eventCallback('onComplete', function () { self.loopTimer = setTimeout(function () { if (!self.dead && !self.paused) self.restart(); }, 400); });
    this.paused = false;
    this.ctrl.querySelector('[data-a=toggle]').innerHTML = I.svg('pause');
    tl.play();
  };
  D.toggle = function () {
    this.paused = !this.paused;
    if (this.paused) this.tl.pause(); else if (this.tl.progress() >= 1) this.restart(); else this.tl.resume();
    this.ctrl.querySelector('[data-a=toggle]').innerHTML = I.svg(this.paused ? 'play' : 'pause');
  };
  D.destroy = function () {
    this.dead = true;
    clearTimeout(this.loopTimer);
    if (this.tl) this.tl.kill();
    if (this.ringFlow) this.ringFlow.kill();
    if (this.ro) this.ro.disconnect();
    this.root.innerHTML = '';
  };

  window.UNODemo = Demo;
})();
