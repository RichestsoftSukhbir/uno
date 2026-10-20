/*
 * 3D card table. A CSS-3D world (tilted felt) rendered with GSAP.
 * Every card is a DOM element keyed by its id; each update computes
 * where every card should be and animates it there (throw arcs,
 * flips, deals, swaps...). Game events add flourishes on top.
 */
(function () {
  'use strict';
  var Cards = window.UNOCards;
  var S = window.UNOSound;

  var CW = 100, CH = 150;

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967295;
  }
  function el(tag, cls, parent, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }
  function rad(d) { return d * Math.PI / 180; }

  var PRESETS = {
    // rx/ry: ellipse of the opponents' held hands, fs: their card scale, avY/avZ: name plate offset in front of the hand
    wide: { tilt: 48, persp: 1700, feltW: 1560, feltH: 980, rx: 610, ry: 330, handY: 585, handZ: 70, handW: 1150, pile: 100, pileY: 10, hs: 1, fs: 0.78, fanZ: 72, avY: 92, avZ: 18, seatSc: 1 },
    tall: { tilt: 26, persp: 1300, feltW: 800, feltH: 1560, rx: 250, ry: 520, handY: 900, handZ: 150, handW: 620, pile: 72, pileY: 60, hs: 1.55, fs: 0.95, fanZ: 80, avY: 80, avZ: 18, seatSc: 1.3, arc: [200, 340] }
  };

  function Table(root, opts) {
    this.root = root;
    this.opts = opts || {};
    this.cards = {};
    this.view = null;
    this.speed = 1;
    this.selected = [];
    this.hoverEnabled = true;
    this.build();
    var self = this;
    window.addEventListener('resize', function () { self.fit(); if (self.view) self.relayout(); });
  }
  var T = Table.prototype;

  T.build = function () {
    this.root.innerHTML = '';
    this.stage = el('div', 'stage', this.root);
    this.world = el('div', 'world', this.stage);
    // neon glow spilling from under the table rim, then the felt itself
    this.feltGlow = el('div', 'felt-glow', this.world);
    this.felt = el('div', 'felt', this.world);
    el('div', 'felt-rim', this.felt);
    this.logo = el('div', 'felt-logo', this.felt, '<span>UNO</span>');
    this.buildRing();
    this.halo = el('div', 'color-halo', this.world);
    this.deckZone = el('div', 'deck-zone', this.world);
    this.launcher = el('div', 'launcher hidden', this.world, '<div class="l-top"></div><div class="l-front"><b>UNO</b><span>ATTACK!</span></div><div class="l-btn"></div>');
    this.glow = el('div', 'turn-glow', this.world);
    this.seatLayer = this.world;
    this.fx = el('div', 'fx-layer', this.root);
    this.seats = {};
    this.ghosts = [];
    this.bindDeck();
    this.fit();
  };

  /* ------------------------------------------------------------ */
  /* geometry                                                      */
  /* ------------------------------------------------------------ */
  T.fit = function () {
    var w = this.root.clientWidth || window.innerWidth;
    var h = this.root.clientHeight || window.innerHeight;
    var L = this.L = Object.assign({}, w / h < 0.9 ? PRESETS.tall : PRESETS.wide);
    if (w / h >= 0.9 && h < 560) L.hs = 1.3;
    this.stage.style.perspective = L.persp + 'px';
    var th = rad(L.tilt);
    var self = this;
    // find the largest scale where felt top and the hand bottom fit on screen
    function proj(s, oy, x, y, z) {
      var y1 = y * Math.cos(th) - z * Math.sin(th);
      var z1 = y * Math.sin(th) + z * Math.cos(th);
      var X = x * s, Y = y1 * s + oy, Z = z1 * s;
      var k = L.persp / (L.persp - Z);
      return { x: X * k, y: Y * k, k: k };
    }
    var best = null;
    function handBottom(sc, oy) {
      var c = proj(sc, oy, 0, L.handY, L.handZ);
      return c.y + CH * sc * c.k * 0.52 * L.hs;
    }
    // every opponent's held fan and name plate must stay on screen and below the top bar
    var n = this.nSeats || 4;
    var seatAngles = [];
    for (var r = 1; r < n; r++) seatAngles.push(this.angleFor(r, n));
    var fanHalfW = (CW * 0.6 + Math.min(110, 9 * 14)) * L.fs, fanUp = CH * 0.95 * L.fs, plateW = 100 * L.seatSc, plateH = 50 * L.seatSc;
    function seatsFit(sc, oy) {
      var topMargin = h < 560 ? 52 : 84;
      for (var i = 0; i < seatAngles.length; i++) {
        var a = rad(seatAngles[i]);
        var x = L.rx * Math.cos(a), y = L.ry * Math.sin(a);
        var f = proj(sc, oy, x, y, L.fanZ);
        var fk = sc * f.k;
        if (f.y - fanUp * fk < -h / 2 + topMargin) return false;
        if (Math.abs(f.x) + fanHalfW * fk > w / 2 - 6) return false;
        var pl = proj(sc, oy, x, y + L.avY, Math.max(L.avZ, 46 * L.seatSc * Math.sin(rad(L.tilt)) + 4));
        var pk = sc * pl.k;
        if (Math.abs(pl.x) + plateW * pk > w / 2 - 6) return false;
        if (pl.y - plateH * pk < -h / 2 + topMargin) return false;
      }
      return true;
    }
    for (var s = 1.8; s > 0.15; s -= 0.01) {
      // anchor: bottom of my hand just above the screen edge
      var oy = 0;
      for (var it = 0; it < 40; it++) {
        var hbt = handBottom(s, oy);
        var kk = proj(s, oy, 0, L.handY, L.handZ).k;
        oy += (h * 0.5 - 24 - hbt) / kk;
      }
      if (!seatsFit(s, oy)) continue;
      var nearL = proj(s, oy, -L.feltW * 0.46, L.feltH * 0.32, 0);
      var handL = proj(s, oy, -(L.handW / 2 + CW / 2) * Math.min(L.hs, 1.15), L.handY, L.handZ);
      if (-nearL.x > w * 0.5 + 30 || -handL.x > w * 0.5 - 8) continue;
      best = { s: s, oy: oy };
      break;
    }
    if (!best) best = { s: 0.3, oy: 0 };
    // keep the hand clear of the HUD in the bottom corners
    var kh = proj(best.s, best.oy, 0, L.handY, L.handZ).k;
    var margin = w / h < 0.9 ? 20 : (w < 720 ? 70 : 215);
    this.handMaxW = Math.max(220, Math.min(L.handW, (w - 2 * margin) / (best.s * kh * L.hs) * L.hs - CW * L.hs));
    this.scale = best.s;
    this.oy = best.oy;
    this.world.style.transform = 'translate3d(0,' + best.oy.toFixed(1) + 'px,0) scale3d(' + best.s + ',' + best.s + ',' + best.s + ') rotateX(' + L.tilt + 'deg)';
    var gp = 230;
    this.feltGlow.style.width = (L.feltW + gp) + 'px';
    this.feltGlow.style.height = (L.feltH + gp) + 'px';
    this.feltGlow.style.marginLeft = (-(L.feltW + gp) / 2) + 'px';
    this.feltGlow.style.marginTop = (-(L.feltH + gp) / 2) + 'px';
    this.felt.style.width = L.feltW + 'px';
    this.felt.style.height = L.feltH + 'px';
    this.felt.style.marginLeft = (-L.feltW / 2) + 'px';
    this.felt.style.marginTop = (-L.feltH / 2) + 'px';
    this.projFn = function (x, y, z) { var p = proj(best.s, best.oy, x, y, z); return { x: w / 2 + p.x, y: h / 2 + p.y, k: p.k * best.s }; };
  };
  T.project = function (x, y, z) { return this.projFn ? this.projFn(x, y, z || 0) : { x: 0, y: 0, k: 1 }; };

  T.isDos = function () { return this.view && this.view.engine === 'dos'; };
  T.pilePos = function (which) {
    var L = this.L;
    if (this.isDos()) return which === 'deck' ? { x: -110, y: -215 } : { x: 110, y: -215 };
    return which === 'deck' ? { x: -L.pile, y: L.pileY } : { x: L.pile, y: L.pileY };
  };

  T.relSeat = function (pid) {
    var v = this.view;
    var n = v.players.length;
    var me = v.me == null ? 0 : v.me;
    return ((pid - me) % n + n) % n;
  };
  T.seatAngle = function (pid) {
    return this.angleFor(this.relSeat(pid), this.view.players.length);
  };
  T.angleFor = function (rel, n) {
    if (rel === 0) return 90;
    var m = n - 1;
    if (m === 1) return 270;
    var a0 = 168, a1 = 372;
    if (m === 2) { a0 = 205; a1 = 335; }
    if (m === 3) { a0 = 180; a1 = 360; }
    // portrait: keep everybody along the top arc so there's room for big hands
    if (this.L && this.L.arc) { a0 = this.L.arc[0]; a1 = this.L.arc[1]; if (m === 2) { a0 = 215; a1 = 325; } }
    return a0 + (a1 - a0) * ((rel - 1) / (m - 1));
  };
  T.seatPos = function (pid, out) {
    var L = this.L;
    var a = rad(this.seatAngle(pid));
    var rx = L.rx + (out || 0), ry = L.ry + (out || 0) * 0.8;
    return { x: rx * Math.cos(a), y: ry * Math.sin(a), a: this.seatAngle(pid) };
  };
  // the name plate sits on the table just in front of the held cards
  T.platePos = function (pid) {
    var p = this.seatPos(pid);
    var L = this.L;
    var lift = 46 * L.seatSc * Math.sin(rad(L.tilt)) + 4;
    return { x: p.x, y: p.y + L.avY, z: Math.max(L.avZ, lift) };
  };

  /* ------------------------------------------------------------ */
  /* card elements                                                 */
  /* ------------------------------------------------------------ */
  T.makeCard = function (id) {
    var c = el('div', 'card', this.world);
    c.dataset.id = id;
    var inner = el('div', 'card-in', c);
    var fa = el('div', 'face fa', inner);
    var fb = el('div', 'face fb', inner);
    var tag = el('div', 'claim-tag', inner);
    var rec = { id: id, el: c, inner: inner, fa: fa, fb: fb, tag: tag, loc: null, ka: null, kb: null };
    this.cards[id] = rec;
    this.bindCard(rec);
    return rec;
  };
  T.setFaces = function (rec, cv) {
    var v = this.view;
    var flip = v.variant === 'flip';
    var back = this.isDos() ? 'dos' : 'uno';
    // a card's faces never change, so keep showing a side we have already seen
    if (cv.a) rec.knownA = cv.a;
    if (cv.b && cv.b !== 'back') rec.knownB = cv.b;
    var A = cv.a || rec.knownA || (flip ? 'unknown-light' : 'back');
    var B = (cv.b && cv.b !== 'back' ? cv.b : rec.knownB) || (flip ? 'unknown-dark' : 'back');
    var ka = Cards.faceKey(A, { back: back }), kb = Cards.faceKey(B, { back: back });
    if (ka !== rec.ka) { rec.fa.style.backgroundImage = Cards.faceUrl(A, { back: back }); rec.ka = ka; }
    if (kb !== rec.kb) { rec.fb.style.backgroundImage = Cards.faceUrl(B, { back: back }); rec.kb = kb; }
    rec.cv = cv;
    if (cv.claim) {
      rec.tag.textContent = 'says: ' + window.UNOEngine.cardName(cv.claim);
      rec.tag.style.display = 'block';
    } else rec.tag.style.display = 'none';
  };

  T.activeIsA = function () { return !(this.view.variant === 'flip' && this.view.side === 'dark'); };

  /* ------------------------------------------------------------ */
  /* layout: target transform for every visible card               */
  /* ------------------------------------------------------------ */
  T.computeTargets = function (v) {
    var self = this;
    var L = this.L;
    var t = {};
    var A = this.activeIsA();
    var faceUpRY = A ? 0 : 180, faceDownRY = A ? 180 : 0, heldRY = A ? 0 : 180;
    var th = L.tilt;

    // discard pile
    var D = this.pilePos('discard');
    var nd = v.discard.length;
    v.discard.forEach(function (cv, i) {
      var r1 = hash(cv.id), r2 = hash(cv.id + 'y'), r3 = hash(cv.id + 'r');
      t[cv.id] = {
        cv: cv, loc: 'discard', x: D.x + (r1 - 0.5) * 22, y: D.y + (r2 - 0.5) * 18, z: 2 + i * 0.9,
        rx: 0, rz: (r3 - 0.5) * 56, fan: 0, iz: 0, ry: cv.a || (v.variant === 'flip') ? faceUpRY : 180, iy: 0, order: i, top: i === nd - 1
      };
    });

    // DOS centre row
    if (v.center) {
      var n = v.center.length;
      var gap = Math.min(150, 760 / Math.max(1, n));
      v.center.forEach(function (slot, i) {
        var x = (i - (n - 1) / 2) * gap;
        var y = 30;
        t[slot.card.id] = { cv: slot.card, loc: 'center' + i, x: x, y: y, z: 2, rx: 0, rz: 0, fan: 0, iz: 0, ry: 0, iy: 0, slot: i };
        (slot.matched || []).forEach(function (cv, k) {
          t[cv.id] = { cv: cv, loc: 'center' + i + 'm', x: x + 14 + k * 22, y: y + 40 + k * 18, z: 6 + k * 2, rx: 0, rz: 8 + k * 6, fan: 0, iz: 0, ry: 0, iy: 0, slot: i };
        });
      });
    }

    // hands
    v.players.forEach(function (p) {
      var cards = p.hand;
      var k = cards.length;
      if (p.id === v.me) {
        var mine = self.sortHand(cards);
        var maxW = self.handMaxW || L.handW;
        var sp = Math.min(CW * 0.78 * L.hs, k > 1 ? maxW / (k - 1) : 0);
        var fanStep = Math.min(3.2, 34 / Math.max(1, k));
        mine.forEach(function (cv, i) {
          var off = i - (k - 1) / 2;
          var sel = self.selected.indexOf(cv.id) >= 0;
          t[cv.id] = {
            cv: cv, loc: 'mine', x: off * sp, y: L.handY + Math.abs(off) * Math.abs(off) * 0.9 * (fanStep / 3), z: L.handZ,
            rx: -th, rz: 0, fan: off * fanStep, iz: i * 0.35, ry: heldRY, iy: sel ? -38 : 0, order: i, mine: true, sc: L.hs
          };
        });
        return;
      }
      // opponents hold their cards upright in a fan, backs towards us; at round end they turn them round
      var sp2 = self.seatPos(p.id);
      var fs = L.fs;
      var spacing = Math.min(16, 150 / Math.max(1, k)) * fs;
      var fstep = Math.min(7, 64 / Math.max(1, k));
      var reveal = v.phase === 'roundOver';
      cards.forEach(function (cv, i) {
        var off = i - (k - 1) / 2;
        t[cv.id] = {
          cv: cv, loc: 'hand' + p.id,
          x: sp2.x + off * spacing, y: sp2.y, z: L.fanZ,
          rx: -th, rz: 0, fan: off * fstep, iz: i * 0.4, ry: reveal ? faceUpRY : faceDownRY,
          iy: Math.abs(off) * Math.abs(off) * 0.5 * fs, sc: fs
        };
      });
    });
    return t;
  };

  T.sortHand = function (cards) {
    if (!this.opts.sortHand || !this.opts.sortHand()) return cards;
    var v = this.view;
    var order = ['red', 'yellow', 'green', 'blue', 'pink', 'teal', 'orange', 'purple', 'wild'];
    var flip = v.variant === 'flip';
    function f(cv) { return (flip && v.side === 'dark' ? cv.b : cv.a) || { c: 'wild', v: 'z' }; }
    function rank(x) { var n = parseInt(x.v, 10); return isNaN(n) ? 20 + x.v.charCodeAt(0) : n; }
    return cards.slice().sort(function (a, b) {
      var fa = f(a), fb = f(b);
      var d = order.indexOf(fa.c) - order.indexOf(fb.c);
      return d || rank(fa) - rank(fb);
    });
  };

  /* ------------------------------------------------------------ */
  /* deck (ghost stack)                                            */
  /* ------------------------------------------------------------ */
  T.renderDeck = function (v) {
    var K = this.pilePos('deck');
    var attack = v.variant === 'attack';
    this.launcher.classList.toggle('hidden', !attack);
    if (attack) {
      gsap.set(this.launcher, { x: K.x, y: K.y, z: 0 });
    }
    var want = attack ? 0 : Math.min(30, Math.ceil(v.deckCount / 3));
    while (this.ghosts.length < want) {
      var g = el('div', 'card ghost', this.deckZone);
      var inner = el('div', 'card-in', g);
      el('div', 'face fa', inner); el('div', 'face fb', inner);
      this.ghosts.push(g);
    }
    while (this.ghosts.length > want) this.ghosts.pop().remove();
    var A = this.activeIsA();
    var flip = v.variant === 'flip';
    var back = this.isDos() ? 'dos' : 'uno';
    var self = this;
    this.ghosts.forEach(function (g, i) {
      var r = hash('g' + i);
      gsap.set(g, { x: K.x + (r - 0.5) * 3, y: K.y + (hash('h' + i) - 0.5) * 3, z: i * 1.1, rotation: (r - 0.5) * 4 });
      var inner = g.firstChild;
      var top = i === self.ghosts.length - 1;
      var fa = inner.children[0], fb = inner.children[1];
      if (flip) {
        // face-down Flip deck shows its other side
        var df = v.deckFace;
        var showB = A; // inactive side
        gsap.set(inner, { rotationY: A ? 180 : 0 });
        var face = top && df ? (showB ? df.b : df.a) : null;
        var url = face ? Cards.faceUrl(face) : Cards.faceUrl(showB ? 'unknown-dark' : 'unknown-light');
        if (showB) fb.style.backgroundImage = url; else fa.style.backgroundImage = url;
      } else {
        gsap.set(inner, { rotationY: 180 });
        fb.style.backgroundImage = Cards.faceUrl('back', { back: back });
      }
    });
    this.deckTopZ = this.ghosts.length * 1.1 + 1;
    if (!this.deckCount) this.deckCount = el('div', 'pile-count', this.world);
    this.deckCount.textContent = v.deckCount;
    gsap.set(this.deckCount, { x: K.x - 30, y: K.y + CH / 2 + 26, z: 1 });
  };

  /* ------------------------------------------------------------ */
  /* seats / avatars                                               */
  /* ------------------------------------------------------------ */
  T.renderSeats = function (v) {
    var self = this;
    var L = this.L;
    var present = {};
    v.players.forEach(function (p) {
      if (p.id === v.me) return;
      present[p.id] = true;
      var s = self.seats[p.id];
      if (!s) {
        s = self.seats[p.id] = el('div', 'seat', self.world,
          '<div class="seat-ring"></div><div class="seat-av"></div><div class="seat-info"><b class="seat-name"></b><span class="seat-meta"></span></div>' +
          '<div class="seat-count"></div><div class="seat-badge"></div><div class="seat-think"><i></i><i></i><i></i></div>');
        s.addEventListener('click', function () { if (self.opts.onSeatClick) self.opts.onSeatClick(p.id); });
      }
      var pos = self.platePos(p.id);
      gsap.set(s, { x: pos.x, y: pos.y, z: pos.z, rotationX: -L.tilt, scale: L.seatSc });
      var avKey = p.avatar + ':' + p.kind;
      if (s.dataset.av !== avKey) { s.dataset.av = avKey; s.querySelector('.seat-av').innerHTML = window.UNOIcons.avatar(p.avatar || (p.kind === 'bot' ? 'robot-01' : 'user')); }
      s.querySelector('.seat-name').textContent = p.name;
      var meta = [];
      if (p.kind === 'bot') meta.push('CPU ' + (p.level || ''));
      if (v.options && v.options.scoreMode === 'points') meta.push(p.score + ' pts');
      if (p.offline) meta.push('offline');
      s.querySelector('.seat-meta').textContent = meta.join(' · ');
      s.querySelector('.seat-count').textContent = p.out ? 'OUT' : p.count;
      s.classList.toggle('active', v.actor === p.id || (v.actor == null && v.current === p.id && v.phase !== 'roundOver'));
      s.classList.toggle('out', !!p.out);
      s.classList.toggle('uno', p.count === (self.isDos() ? 2 : 1) && !p.out);
      s.classList.toggle('pending', v.unoPending === p.id);
      s.classList.toggle('targetable', !!self.targetMode && !p.out);
      var badge = s.querySelector('.seat-badge');
      badge.textContent = v.unoPending === p.id ? '!' : (p.count === (self.isDos() ? 2 : 1) && !p.out ? (self.isDos() ? 'DOS' : 'UNO') : '');
    });
    Object.keys(this.seats).forEach(function (id) { if (!present[id]) { self.seats[id].remove(); delete self.seats[id]; } });

    // turn glow on the felt
    var actor = v.actor != null ? v.actor : v.current;
    if (v.phase === 'roundOver' || actor == null) gsap.to(this.glow, { opacity: 0, duration: 0.3 });
    else {
      var gp = actor === v.me ? { x: 0, y: L.handY - 120 } : this.seatPos(actor, 0);
      gsap.to(this.glow, { x: gp.x, y: gp.y, z: 0.5, opacity: 1, duration: 0.45, ease: 'power2.out' });
    }
  };

  T.renderCenter = function (v) {
    var D = this.pilePos('discard');
    var K = this.pilePos('deck');
    var dos = this.isDos();
    // direction ring around the piles
    this.ring.classList.toggle('hidden', dos);
    gsap.set(this.ring, { x: 0, y: this.L.pileY, z: 0.3 });
    this.setDirection(v.dir);
    // active colour halo
    var col = v.color ? Cards.COLORS[v.color] : null;
    gsap.set(this.halo, { x: D.x, y: D.y, z: 0.6 });
    this.halo.style.setProperty('--halo', col || 'rgba(255,255,255,0.15)');
    this.halo.classList.toggle('hidden', dos);
    this.root.classList.toggle('dark-side', v.side === 'dark');
    this.root.dataset.variant = v.variant;
    // stack badge
    if (!this.stackBadge) this.stackBadge = el('div', 'stack-badge', this.world);
    this.stackBadge.textContent = v.drawStack ? '+' + v.drawStack : '';
    this.stackBadge.classList.toggle('show', !!v.drawStack);
    gsap.set(this.stackBadge, { x: D.x + 95, y: D.y - 70, z: 40, rotationX: -this.L.tilt });
    if (!this.discardCount) this.discardCount = el('div', 'pile-count', this.world);
    this.discardCount.textContent = v.discardCount || '';
    gsap.set(this.discardCount, { x: D.x + 30, y: D.y + CH / 2 + 26, z: 1 });
    if (this.zoneHint) this.zoneHint.remove();
    if (dos && v.center) {
      // labels for centre row slots (click targets)
      this.slotEls = this.slotEls || [];
      while (this.slotEls.length < v.center.length) {
        var se = el('div', 'slot-hit', this.world);
        (function (self, idx) { se.addEventListener('click', function () { if (self.opts.onSlotClick) self.opts.onSlotClick(idx); }); })(this, this.slotEls.length);
        this.slotEls.push(se);
      }
      while (this.slotEls.length > v.center.length) this.slotEls.pop().remove();
      var n = v.center.length;
      var gap = Math.min(150, 760 / Math.max(1, n));
      var self = this;
      this.slotEls.forEach(function (se, i) {
        gsap.set(se, { x: (i - (n - 1) / 2) * gap, y: 30, z: 0.4 });
        se.classList.toggle('matched', !!v.center[i].matched);
        se.classList.toggle('selectable', !!self.slotSelectable);
      });
    } else if (this.slotEls) { this.slotEls.forEach(function (s) { s.remove(); }); this.slotEls = []; }
  };

  /* ------------------------------------------------------------ */
  /* interaction                                                   */
  /* ------------------------------------------------------------ */
  T.bindCard = function (rec) {
    var self = this;
    var c = rec.el;
    var drag = null;
    c.addEventListener('pointerenter', function () {
      if (rec.loc !== 'mine' || drag) return;
      gsap.to(rec.inner, { y: (rec.target ? rec.target.iy : 0) - 26, duration: 0.18, ease: 'power2.out' });
      c.classList.add('hover');
    });
    c.addEventListener('pointerleave', function () {
      if (rec.loc !== 'mine' || drag) return;
      gsap.to(rec.inner, { y: rec.target ? rec.target.iy : 0, duration: 0.25, ease: 'power2.out' });
      c.classList.remove('hover');
    });
    c.addEventListener('pointerdown', function (e) {
      if (rec.loc !== 'mine') return;
      e.preventDefault();
      var r = c.getBoundingClientRect();
      drag = { x0: e.clientX, y0: e.clientY, moved: false, f: Math.max(0.2, r.height / CH), t0: performance.now(), lastY: e.clientY, lastT: performance.now(), vy: 0 };
      try { c.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
    });
    c.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (!drag.moved && Math.hypot(dx, dy) > 9) { drag.moved = true; c.classList.add('dragging'); S.play('flick'); }
      if (drag.moved) {
        var now = performance.now();
        drag.vy = (e.clientY - drag.lastY) / Math.max(1, now - drag.lastT);
        drag.lastY = e.clientY; drag.lastT = now;
        gsap.set(rec.inner, { x: dx / drag.f, y: (rec.target ? rec.target.iy : 0) + dy / drag.f, rotation: (rec.target ? rec.target.fan : 0) + dx / drag.f * 0.05 });
      }
    });
    function end(e) {
      if (!drag) return;
      var d = drag;
      drag = null;
      c.classList.remove('dragging');
      var dy = e.clientY - d.y0;
      if (!d.moved) {
        if (self.opts.onCardClick) self.opts.onCardClick(rec.id);
        return;
      }
      var thrown = dy < -90 || (dy < -40 && d.vy < -0.6);
      if (thrown && self.opts.onCardThrow) {
        self.pendingThrow = rec.id;
        self.opts.onCardThrow(rec.id);
      }
      // spring back (if the play is accepted the next update flies it to the pile)
      gsap.to(rec.inner, { x: 0, y: rec.target ? rec.target.iy : 0, rotation: rec.target ? rec.target.fan : 0, duration: 0.45, ease: 'back.out(1.6)' });
    }
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
  };
  T.bindDeck = function () {
    var self = this;
    function click() { if (self.opts.onDeckClick) self.opts.onDeckClick(); }
    this.deckZone.addEventListener('click', click);
    this.launcher.addEventListener('click', click);
  };

  T.markCards = function (playable, myTurn, selected) {
    var self = this;
    this.selected = selected || [];
    Object.keys(this.cards).forEach(function (id) {
      var rec = self.cards[id];
      if (rec.loc !== 'mine') { rec.el.classList.remove('playable', 'dim', 'selected'); return; }
      var p = playable.indexOf(id) >= 0;
      rec.el.classList.toggle('playable', p);
      rec.el.classList.toggle('dim', myTurn && !p);
      rec.el.classList.toggle('selected', self.selected.indexOf(id) >= 0);
    });
  };

  /* ------------------------------------------------------------ */
  /* the main update                                               */
  /* ------------------------------------------------------------ */
  T.relayout = function () {
    if (!this.view) return;
    var targets = this.computeTargets(this.view);
    var self = this;
    Object.keys(targets).forEach(function (id) {
      var rec = self.cards[id];
      if (!rec) return;
      self.place(rec, targets[id], null, 0, 0.3);
    });
    this.renderDeck(this.view);
    this.renderSeats(this.view);
    this.renderCenter(this.view);
  };

  T.place = function (rec, tg, tl, at, dur, arc) {
    rec.target = tg;
    var outer = { x: tg.x, y: tg.y, rotationX: tg.rx, rotation: tg.rz, scale: tg.sc || 1 };
    var inner = { rotation: tg.fan, rotationY: tg.ry, z: tg.iz, y: tg.iy, x: 0 };
    if (!tl) {
      gsap.to(rec.el, Object.assign({ z: tg.z, duration: dur, ease: 'power2.out', overwrite: 'auto' }, outer));
      gsap.to(rec.inner, Object.assign({ duration: dur, ease: 'power2.out', overwrite: 'auto' }, inner));
      return;
    }
    var ease = arc ? 'power3.out' : 'power2.inOut';
    tl.to(rec.el, Object.assign({ duration: dur, ease: ease }, outer), at);
    tl.to(rec.inner, Object.assign({ duration: dur, ease: 'power2.inOut' }, inner), at);
    if (arc) {
      var z0 = gsap.getProperty(rec.el, 'z') || 0;
      var peak = Math.max(z0, tg.z) + arc;
      tl.to(rec.el, { z: peak, duration: dur * 0.42, ease: 'power2.out' }, at);
      tl.to(rec.el, { z: tg.z, duration: dur * 0.58, ease: 'power2.in' }, at + dur * 0.42);
      if (tg.loc === 'discard' || (tg.loc && tg.loc.indexOf('center') === 0)) {
        // settle bounce + a little slide on landing
        tl.to(rec.el, { z: tg.z + 4, duration: 0.07, ease: 'power1.out' }, at + dur);
        tl.to(rec.el, { z: tg.z, duration: 0.16, ease: 'bounce.out' }, at + dur + 0.07);
        tl.call(function () { S.play('place'); }, null, at + dur * 0.95);
      }
    } else {
      tl.to(rec.el, { z: tg.z, duration: dur, ease: 'power2.inOut' }, at);
    }
  };

  // returns a promise resolved once animations finish
  T.update = function (view, events) {
    var self = this;
    events = events || [];
    var prev = this.view;
    this.view = view;
    if (this.nSeats !== view.players.length) { this.nSeats = view.players.length; this.fit(); }
    var types = {};
    events.forEach(function (e) { types[e.t] = e; });
    var tl = gsap.timeline({ paused: true });
    var targets = this.computeTargets(view);
    var K = this.pilePos('deck');
    var D = this.pilePos('discard');
    var A = this.activeIsA();
    var dealOrder = {};
    if (types.deal) types.deal.order.forEach(function (o, i) { dealOrder[o[1]] = i; });
    var drawSeq = {};
    events.forEach(function (e) { if (e.t === 'draw') e.ids.forEach(function (id, i) { drawSeq[id] = { i: i, reason: e.reason, p: e.p }; }); });

    // deal: gather everything back to the deck first, then shuffle
    var t0 = 0;
    if (types.deal) {
      var old = Object.keys(this.cards);
      old.forEach(function (id) {
        var rec = self.cards[id];
        tl.to(rec.el, { x: K.x, y: K.y, z: 4, rotationX: 0, rotation: 0, duration: 0.5, ease: 'power2.in' }, 0);
        tl.to(rec.inner, { rotationY: A ? 180 : 0, rotation: 0, y: 0, z: 0, duration: 0.5 }, 0);
        tl.set(rec.el, { autoAlpha: 0 }, 0.5);
        tl.call(function () { rec.el.remove(); }, null, 0.52);
        delete self.cards[id];
      });
      t0 = old.length ? 0.55 : 0;
      tl.call(function () { self.renderDeck(view); self.shuffleFx(); }, null, t0);
      t0 += 1.0;
    } else {
      this.renderDeck(view);
    }

    // flip: lift and turn over everything
    if (types.flip) {
      tl.call(function () { S.play('flip'); self.banner('FLIP!', view.side === 'dark' ? 'dark' : 'light'); self.shake(6); }, null, 0);
      this.ghosts.forEach(function (g, i) {
        tl.fromTo(g.firstChild, { rotationY: '+=180' }, { rotationY: '-=180', duration: 0.7, ease: 'power2.inOut' }, 0.1 + i * 0.01);
      });
      t0 += 0.2;
    }
    var seqDraw = 0;
    var moved = 0;
    var flipIdx = 0;
    Object.keys(targets).forEach(function (id) {
      var tg = targets[id];
      var rec = self.cards[id];
      var isNew = !rec;
      if (isNew) {
        rec = self.makeCard(id);
        // new cards come from the deck face down
        gsap.set(rec.el, { x: K.x, y: K.y, z: self.deckTopZ || 20, rotationX: 0, rotation: 0 });
        gsap.set(rec.inner, { rotationY: A ? 180 : 0, rotation: 0, z: 0, y: 0 });
        if (view.variant === 'attack') gsap.set(rec.el, { z: 70 });
      }
      self.setFaces(rec, tg.cv);
      var locChanged = rec.loc !== tg.loc;
      var prevLoc = rec.loc;
      rec.loc = tg.loc;
      rec.el.classList.toggle('in-hand', tg.loc === 'mine');
      if (isNew && types.deal && dealOrder[id] != null) {
        var at = t0 + dealOrder[id] * 0.065 / Math.max(0.6, Math.min(1.6, Object.keys(dealOrder).length / 50));
        tl.call(function () { S.play('deal'); }, null, at);
        self.place(rec, tg, tl, at, 0.42, 70);
        return;
      }
      if (isNew) {
        var ds = drawSeq[id];
        var at2 = t0 + 0.12 + (ds ? ds.i : seqDraw++) * 0.11;
        if (ds && ds.reason === 'launch') {
          // the launcher spits cards out in a messy spray before they land in the hand
          var ang = hash(id) * Math.PI * 2;
          var sx = K.x + Math.cos(ang) * 260, sy = K.y + Math.sin(ang) * 180;
          tl.to(rec.el, { x: sx, y: sy, z: 260, rotation: hash(id + 's') * 720 - 360, duration: 0.35, ease: 'power2.out' }, at2);
          tl.to(rec.inner, { rotationY: '+=360', duration: 0.35 }, at2);
          self.place(rec, tg, tl, at2 + 0.35, 0.45, 40);
        } else {
          tl.call(function () { S.play('draw'); }, null, at2);
          self.place(rec, tg, tl, at2, 0.5, 90);
        }
        moved++;
        return;
      }
      if (locChanged) {
        var toPile = tg.loc === 'discard' || tg.loc.indexOf('center') === 0;
        var between = prevLoc && prevLoc.indexOf('hand') === 0 || prevLoc === 'mine';
        var start = toPile ? t0 : t0 + 0.08;
        var dur = toPile ? 0.55 : (types.swap || types.rotate ? 0.85 : 0.6);
        if (toPile) tl.call(function () { S.play('slide'); }, null, start);
        if (toPile && self.pendingThrow === id) { dur = 0.42; self.pendingThrow = null; }
        // a little spin while flying to the pile
        if (toPile) tl.to(rec.inner, { rotation: (hash(id + 'q') - 0.5) * 40, duration: dur * 0.5 }, start);
        self.place(rec, tg, tl, start, dur, toPile ? 140 : (between ? 120 : 60));
        moved++;
      } else if (types.flip) {
        // the whole table turns over: every card lifts, spins and drops back
        var fi = flipIdx++;
        self.place(rec, tg, tl, t0 + Math.min(fi * 0.012, 0.6), 0.85, rec.loc === 'mine' ? 40 : 90);
      } else {
        self.place(rec, tg, tl, t0, 0.38, 0);
      }
    });

    // cards that left the visible table
    Object.keys(this.cards).forEach(function (id) {
      if (targets[id]) return;
      var rec = self.cards[id];
      delete self.cards[id];
      var toDeck = !!types.reshuffle;
      var dest = toDeck ? K : D;
      if (rec.loc === 'discard' && !toDeck) {
        // buried under newer cards - just remove later
        tl.call(function () { rec.el.remove(); }, null, t0 + 0.6);
        return;
      }
      tl.to(rec.el, { x: dest.x, y: dest.y, z: toDeck ? 10 : 2, rotationX: 0, duration: 0.5, ease: 'power2.inOut' }, t0 + (toDeck ? 0 : 0.1));
      tl.to(rec.inner, { rotationY: toDeck ? (A ? 180 : 0) : (A ? 0 : 180), rotation: 0, y: 0, duration: 0.5 }, t0);
      tl.to(rec.el, { autoAlpha: 0, duration: 0.2 }, t0 + 0.55);
      tl.call(function () { rec.el.remove(); }, null, t0 + 0.8);
    });
    if (types.reshuffle) tl.call(function () { S.play('shuffle'); self.toast('Reshuffling the discard pile', 'info'); }, null, t0);

    tl.call(function () {
      self.renderSeats(view);
      self.renderCenter(view);
    }, null, 0);
    // flourishes for events
    this.eventFx(events, view, prev, tl, t0);

    var p = new Promise(function (resolve) {
      tl.eventCallback('onComplete', resolve);
    });
    tl.timeScale(this.speed * (this.opts.queueBoost ? this.opts.queueBoost() : 1));
    if (tl.duration() === 0) { tl.play(); return Promise.resolve(); }
    tl.play();
    // safety: never hang the queue
    return Promise.race([p, new Promise(function (r) { setTimeout(r, 6000); })]);
  };

  /* ------------------------------------------------------------ */
  /* effects                                                       */
  /* ------------------------------------------------------------ */
  T.seatScreen = function (pid) {
    var v = this.view;
    if (pid === v.me || pid == null) {
      var p = this.project(0, this.L.handY - 40, this.L.handZ + 60);
      return { x: p.x, y: p.y - 40 };
    }
    var pos = this.seatPos(pid);
    var p = this.project(pos.x, pos.y, this.L.fanZ + 30);
    return { x: p.x, y: p.y - 30 };
  };
  T.pileScreen = function () {
    var D = this.pilePos('discard');
    return this.project(D.x, D.y, 30);
  };
  T.float = function (pid, text, cls, delay) {
    var self = this;
    setTimeout(function () {
      var at = pid === 'pile' ? self.pileScreen() : self.seatScreen(pid);
      var f = el('div', 'float ' + (cls || ''), self.fx, text);
      gsap.set(f, { left: at.x, top: at.y, xPercent: -50, yPercent: -50, scale: 0.3, opacity: 0 });
      gsap.timeline({ onComplete: function () { f.remove(); } })
        .to(f, { scale: 1.15, opacity: 1, duration: 0.25, ease: 'back.out(2.5)' })
        .to(f, { scale: 1, duration: 0.15 })
        .to(f, { y: -60, opacity: 0, duration: 0.7, ease: 'power1.in' }, '+=0.75');
    }, (delay || 0) * 1000 / this.speed);
  };
  T.bubble = function (pid, text, cls) {
    var at = this.seatScreen(pid);
    var b = el('div', 'bubble ' + (cls || ''), this.fx, text);
    gsap.set(b, { left: at.x, top: at.y - 30, xPercent: -50, yPercent: -100, scale: 0, rotation: -8 });
    gsap.timeline({ onComplete: function () { b.remove(); } })
      .to(b, { scale: 1, rotation: 0, duration: 0.35, ease: 'elastic.out(1, 0.5)' })
      .to(b, { opacity: 0, y: -20, duration: 0.4 }, '+=1.4');
  };
  T.banner = function (text, cls) {
    var b = el('div', 'banner ' + (cls || ''), this.fx, text);
    gsap.timeline({ onComplete: function () { b.remove(); } })
      .fromTo(b, { scale: 3, opacity: 0, rotation: -10 }, { scale: 1, opacity: 1, rotation: -4, duration: 0.45, ease: 'power3.out' })
      .to(b, { scale: 1.06, duration: 0.6, yoyo: true, repeat: 1, ease: 'sine.inOut' })
      .to(b, { opacity: 0, scale: 0.8, duration: 0.3 });
  };
  T.toast = function (text, cls) { if (this.opts.onToast) this.opts.onToast(text, cls); };
  T.burst = function (color, at) {
    var p = at || this.pileScreen();
    for (var i = 0; i < 26; i++) {
      var d = el('div', 'spark', this.fx);
      d.style.background = color;
      var a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 140;
      gsap.set(d, { left: p.x, top: p.y, scale: 0.6 + Math.random() });
      gsap.to(d, { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.7 - 30, opacity: 0, duration: 0.7 + Math.random() * 0.5, ease: 'power2.out', onComplete: d.remove.bind(d) });
    }
  };
  T.confetti = function () {
    var cols = ['#ff5555', '#ffaa00', '#55aa55', '#5555ff', '#ffffff', '#ff3fa4'];
    var w = this.root.clientWidth, h = this.root.clientHeight;
    for (var i = 0; i < 140; i++) {
      var d = el('div', 'confetti', this.fx);
      d.style.background = cols[i % cols.length];
      gsap.set(d, { left: Math.random() * w, top: -20 - Math.random() * 200, rotation: Math.random() * 360 });
      gsap.to(d, { y: h + 260, x: (Math.random() - 0.5) * 300, rotation: '+=' + (360 + Math.random() * 720), rotationX: Math.random() * 720, duration: 2.5 + Math.random() * 2, ease: 'power1.in', delay: Math.random() * 0.8, onComplete: d.remove.bind(d) });
    }
  };
  T.shake = function (strength) {
    gsap.fromTo(this.stage, { x: 0 }, { x: strength || 8, duration: 0.05, repeat: 7, yoyo: true, ease: 'none', onComplete: function () { gsap.set(this.targets(), { x: 0 }); } });
  };
  T.shuffleFx = function () {
    S.play('shuffle');
    var K = this.pilePos('deck');
    var self = this;
    var gs = this.ghosts.slice(-12);
    gs.forEach(function (g, i) {
      var side = i % 2 ? 1 : -1;
      gsap.timeline()
        .to(g, { x: K.x + side * 70, rotation: side * 12, z: '+=' + (i * 2), duration: 0.22, ease: 'power2.out', delay: i * 0.015 })
        .to(g, { x: K.x, rotation: 0, duration: 0.25, ease: 'power2.in', delay: 0.12 })
        .to(g, { x: K.x + side * 50, rotation: -side * 8, duration: 0.18, ease: 'power2.out' })
        .to(g, { x: K.x, rotation: 0, duration: 0.2, ease: 'power2.in' });
    });
  };
  T.launcherFx = function (n) {
    var l = this.launcher;
    gsap.timeline()
      .to(l.querySelector('.l-btn'), { scaleY: 0.4, duration: 0.08, yoyo: true, repeat: 1 })
      .to(l, { z: n ? 30 : 6, scale: n ? 1.12 : 1.03, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' }, 0);
    if (n) { S.play('boom', 0.1); this.shake(n > 3 ? 12 : 6); } else S.play('launch');
  };

  T.eventFx = function (events, view, prev, tl, t0) {
    var self = this;
    var at = t0 + 0.1;
    events.forEach(function (e) {
      var name = function (p) { return view.players[p] ? view.players[p].name : ''; };
      switch (e.t) {
        case 'skip':
          tl.call(function () { S.play('skip'); self.float(e.p, window.UNOIcons.svg('blocked'), 'skip icon'); }, null, at + 0.35); break;
        case 'skipall':
          tl.call(function () { S.play('skip'); view.players.forEach(function (p) { if (p.id !== e.p && !p.out) self.float(p.id, window.UNOIcons.svg('blocked'), 'skip icon'); }); self.banner('SKIP EVERYONE!'); }, null, at + 0.3); break;
        case 'reverse':
          tl.call(function () { S.play('reverse'); self.ringSpin(); self.float('pile', window.UNOIcons.svg(e.dir === 1 ? 'refresh-cw' : 'refresh-ccw'), 'rev icon'); }, null, at + 0.3); break;
        case 'color':
          tl.call(function () { S.play('color'); self.burst(Cards.COLORS[e.color]); self.float(e.p, e.color.toUpperCase(), 'col col-' + e.color); }, null, at + 0.1); break;
        case 'draw':
          if (e.reason !== 'draw' && e.reason !== 'launch' && e.n > 0) {
            tl.call(function () { self.float(e.p, '+' + e.n, 'plus'); if (e.n >= 4) { S.play('penalty'); self.shake(e.n >= 8 ? 10 : 5); } }, null, at + 0.2);
          }
          break;
        case 'stack':
          tl.call(function () { S.play('penalty'); self.float('pile', '+' + e.total, 'plus big'); }, null, at + 0.3); break;
        case 'uno':
          tl.call(function () { S.play('uno'); S.say(e.word === 'DOS' ? 'DOS!' : 'UNO!'); self.bubble(e.p, (e.word || 'UNO') + '!', 'uno'); }, null, 0); break;
        case 'caught':
          tl.call(function () { S.play('caught'); self.bubble(e.p, 'CAUGHT!', 'caught'); self.toast(name(e.by) + ' caught ' + name(e.p) + '!', 'warn'); }, null, 0); break;
        case 'swap':
          tl.call(function () { S.play('swap'); self.banner('SWAP!'); }, null, at); break;
        case 'rotate':
          tl.call(function () { S.play('swap'); self.banner('PASS HANDS!'); self.ringSpin(); }, null, at); break;
        case 'challenge':
          tl.call(function () { S.play('challenge'); self.bubble(e.p, e.reveal ? 'LIAR!' : 'CHALLENGE!', 'challenge'); }, null, at);
          tl.call(function () { self.banner(e.success ? (e.reveal ? 'BUSTED!' : 'GUILTY!') : (e.reveal ? 'TRUTH!' : 'NOT GUILTY!'), e.success ? 'good' : 'bad'); }, null, at + 0.7);
          break;
        case 'liarAccept':
          tl.call(function () { self.bubble(e.p, 'I believe you…'); }, null, at); break;
        case 'bluff':
          tl.call(function () { self.float('pile', '“' + window.UNOEngine.cardName(e.claim) + (e.color ? ' · ' + e.color : '') + '”', 'claim'); }, null, at + 0.5); break;
        case 'eliminate':
          tl.call(function () { S.play('eliminate'); self.bubble(e.p, 'KNOCKED OUT', 'caught'); self.shake(14); }, null, at + 0.6); break;
        case 'launch':
          tl.call(function () { self.launcherFx(e.n); if (e.n) self.float(e.p, '+' + e.n, 'plus'); }, null, at); break;
        case 'roulette':
          tl.call(function () { self.banner('ROULETTE: ' + e.n + ' CARDS'); }, null, at + 0.3); break;
        case 'discardall':
          tl.call(function () { self.banner('DISCARD ALL!'); }, null, at + 0.4); break;
        case 'jumpin':
          tl.call(function () { self.bubble(e.p, 'JUMP-IN!', 'uno'); }, null, 0); break;
        case 'target':
          tl.call(function () { self.float(e.target, window.UNOIcons.svg('target-02'), 'skip icon'); }, null, at); break;
        case 'darecard':
          tl.call(function () { self.bubble(e.p, 'DARE or DRAW?', 'challenge'); }, null, at + 0.3); break;
        case 'daredone':
          tl.call(function () { S.play('win'); self.bubble(e.p, window.UNOIcons.svg('party') + ' DARE DONE!', 'uno'); }, null, 0); break;
        case 'match':
          tl.call(function () { if (e.bonus) { S.play('color'); self.float('pile', e.bonus === 'double' ? 'DOUBLE COLOR MATCH!' : 'COLOR MATCH!', 'claim'); } }, null, at + 0.4); break;
        case 'roundEnd':
          tl.call(function () {
            var mine = e.winner === view.me;
            S.play(mine ? 'win' : 'lose');
            if (mine || self.opts.isLocalHuman && self.opts.isLocalHuman(e.winner)) self.confetti();
            self.bubble(e.winner, window.UNOIcons.svg('champion') + ' WINNER!', 'uno');
          }, null, at + 0.5);
          break;
      }
    });
  };
  // direction ring: a circle lying flat on the felt (perspective makes it an ellipse),
  // spun by GSAP so reversing can whip it round and settle the other way
  T.buildRing = function () {
    var R = 205, arrows = '';
    for (var i = 0; i < 6; i++) {
      arrows += '<g transform="rotate(' + (i * 120 + 40) + ') translate(' + R + ' 0)"><path d="M-13 -9 L0 7 L13 -9" /></g>';
    }
    // three glowing gradient arcs with arrowheads, like a spinning turn indicator
    var arcs = '';
    for (var j = 0; j < 3; j++) {
      var a0 = j * 120 - 60, a1 = a0 + 96;
      var p0 = [R * Math.cos(a0 * Math.PI / 180), R * Math.sin(a0 * Math.PI / 180)], p1 = [R * Math.cos(a1 * Math.PI / 180), R * Math.sin(a1 * Math.PI / 180)];
      arcs += '<path class="ring-arc" d="M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' A' + R + ' ' + R + ' 0 0 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + '"/>';
    }
    this.ring = el('div', 'dir-ring', this.world,
      '<svg viewBox="-240 -240 480 480" width="480" height="480"><defs>' +
      '<linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3dffd0"/><stop offset=".5" stop-color="#22c7ff"/><stop offset="1" stop-color="#3a6bff"/></linearGradient>' +
      '</defs><g class="ring-spin"><g class="ring-flip">' +
      '<circle r="' + R + '" class="ring-track"/><circle r="' + R + '" class="ring-dash"/>' + arcs +
      '<g class="ring-arrows">' + arrows + '</g></g></g></svg>');
    this.ringSpinEl = this.ring.querySelector('.ring-spin');
    this.ringFlipEl = this.ring.querySelector('.ring-flip');
    gsap.set([this.ringSpinEl, this.ringFlipEl], { svgOrigin: '0 0' });
    this.ringTween = gsap.to(this.ringSpinEl, { rotation: '+=360', duration: 26, ease: 'none', repeat: -1 });
    this.ringDir = 1;
  };
  T.setDirection = function (dir) {
    dir = dir === -1 ? -1 : 1;
    if (dir === this.ringDir) return;
    this.ringDir = dir;
    // arrows turn over, then the ring keeps spinning the new way
    gsap.to(this.ringFlipEl, { scaleY: dir, duration: 0.5, ease: 'back.inOut(2)' });
    gsap.to(this.ringTween, { timeScale: dir, duration: 0.6, ease: 'power2.out' });
    this.ring.classList.toggle('ccw', dir === -1);
  };
  T.ringSpin = function () {
    // quick whip around in the current direction, easing back to cruising speed
    var d = this.ringDir || 1;
    gsap.killTweensOf(this.ringTween);
    gsap.timeline()
      .to(this.ringTween, { timeScale: d * 14, duration: 0.25, ease: 'power2.in' })
      .to(this.ringTween, { timeScale: d, duration: 1.2, ease: 'power3.out' });
    gsap.fromTo(this.ring.querySelector('.ring-arrows'), { opacity: 1 }, { opacity: 0.35, duration: 0.2, yoyo: true, repeat: 3 });
  };


  T.setTargetMode = function (on) { this.targetMode = on; if (this.view) this.renderSeats(this.view); };
  T.setSlotSelectable = function (on) { this.slotSelectable = on; if (this.view) this.renderCenter(this.view); };

  T.clear = function () {
    var self = this;
    Object.keys(this.cards).forEach(function (id) { self.cards[id].el.remove(); });
    this.cards = {};
    Object.keys(this.seats).forEach(function (id) { self.seats[id].remove(); });
    this.seats = {};
    this.view = null;
    this.fx.innerHTML = '';
  };

  window.UNOTable = Table;
})();
