/*
 * UNO Arena - computer players.
 * Bots only look at their own view (their hand + public information).
 */
(function (root, factory) {
  var E = typeof module === 'object' && module.exports ? require('./engine.js') : root.UNOEngine;
  var B = factory(E);
  if (typeof module === 'object' && module.exports) module.exports = B;
  root.UNOBots = B;
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';

  var META = E.META;
  var NOISE = { easy: 30, normal: 8, hard: 2 };
  var FORGET_UNO = { easy: 0.35, normal: 0.1, hard: 0 };
  var CATCH = { easy: [0.3, 2600], normal: [0.6, 1500], hard: [0.92, 750] };
  var LATE_CALL = { easy: [0.5, 1800], normal: [0.8, 900], hard: [1, 300] };

  function rand(r) { return (r || Math.random)(); }
  function faceOf(v, card) {
    if (!card) return null;
    if (v.variant === 'flip') return v.side === 'dark' ? card.b : card.a;
    return card.a;
  }
  function countColors(v, hand) {
    var c = {};
    hand.forEach(function (card) { var f = faceOf(v, card); if (f && f.c !== 'wild') c[f.c] = (c[f.c] || 0) + 1; });
    return c;
  }
  function bestColor(v, hand, colors, rnd) {
    var counts = countColors(v, hand);
    var best = null, bs = -1;
    colors.forEach(function (c) {
      var s = (counts[c] || 0) + rand(rnd) * 0.5;
      if (s > bs) { bs = s; best = c; }
    });
    return best;
  }
  function nextSeat(v, from, steps) {
    var n = v.players.length;
    var cur = from;
    var s = steps || 1;
    var g = 0;
    while (s > 0 && g++ < 50) { cur = ((cur + v.dir) % n + n) % n; if (!v.players[cur].out) s--; }
    return cur;
  }
  function pointsOf(f) {
    if (!f) return 0;
    if (E.isNum(f.v)) return +f.v;
    var m = META[f.v] || {};
    return m.kind === 'wild' ? 50 : 20;
  }

  /* ---------------- UNO family ---------------- */
  function decideUno(v, mem, rnd) {
    var me = v.players[v.me];
    var level = me.level || 'normal';
    var legal = v.legal;
    var byType = {};
    legal.forEach(function (a) { (byType[a.type] = byType[a.type] || []).push(a); });
    var hand = me.hand;

    if (v.phase === 'roundOver') return null;

    // shout UNO before playing the second-to-last card
    if (byType.uno && v.unoPending !== v.me && v.current === v.me && v.phase === 'turn') {
      var key = 'uno' + v.round + '_' + v.turnNo;
      if (!mem[key]) {
        mem[key] = true;
        if (rand(rnd) >= FORGET_UNO[level]) return { type: 'uno' };
      }
    }

    switch (v.phase) {
      case 'color':
        return { type: 'color', color: bestColor(v, hand, (byType.color || []).map(function (a) { return a.color; }), rnd) };
      case 'roulette': {
        // pick the colour we have seen least - more of it should be left in the pile
        var seen = countColors(v, hand.concat(v.discard));
        var cols = (byType.color || []).map(function (a) { return a.color; });
        cols.sort(function (a, b) { return (seen[a] || 0) - (seen[b] || 0) + (rand(rnd) - 0.5); });
        return { type: 'color', color: cols[0] };
      }
      case 'target': {
        var mine = hand.length;
        var targets = byType.target || [];
        targets.sort(function (a, b) { return v.players[a.target].count - v.players[b.target].count; });
        if (v.pend && v.pend.mode === 'draw2') return targets[0];
        // swap: take the smallest hand if it helps
        return mine > v.players[targets[0].target].count ? targets[0] : targets[targets.length - 1];
      }
      case 'challenge': {
        var off = v.players[v.pend.p];
        var pr = level === 'easy' ? 0.15 : (off.count >= 6 ? 0.4 : 0.2);
        if (level === 'hard' && hand.length >= 10) pr *= 0.5;
        return rand(rnd) < pr ? { type: 'challenge' } : { type: 'accept' };
      }
      case 'liar':
        return liarCheck(v, level, rnd);
      case 'dare':
        return rand(rnd) < 0.65 ? { type: 'dareDo' } : { type: 'dareDraw' };
      case 'dareActive':
        return rand(rnd) < 0.85 ? { type: 'dareDone' } : { type: 'dareFail' };
      case 'launch':
        return { type: 'hit' };
    }

    var plays = byType.play || [];
    if (v.phase === 'drawn') {
      if (plays.length) return plays[0];
      return byType.pass ? byType.pass[0] : null;
    }
    if (v.current !== v.me) {
      // jump-in opportunities
      if (plays.length && rand(rnd) < (level === 'easy' ? 0.2 : 0.6)) return plays[0];
      return null;
    }

    // Liar's: bluff when stuck (or sometimes just for fun)
    if (v.variant === 'liars' && v.claims && v.claims.length && v.drawStack === 0) {
      var bluff = maybeBluff(v, plays, level, rnd);
      if (bluff) return bluff;
    }

    if (!plays.length) return byType.draw ? byType.draw[0] : (legal[0] || null);
    var nextP = v.players[nextSeat(v, v.me, 1)];
    var counts = countColors(v, hand);
    var scored = plays.map(function (a) {
      var card = hand.filter(function (c) { return c.id === a.cardId; })[0];
      var f = faceOf(v, card) || {};
      var m = META[f.v] || { kind: 'number' };
      var s = 10;
      var threat = nextP.count <= 2;
      if (E.isNum(f.v)) {
        s += 5 + (+f.v) * 0.4 + (counts[f.c] || 0) * 2.5;
        if (f.c !== v.color) s += (counts[f.c] || 0) - (counts[v.color] || 0);
        if (v.options.sevenO && f.v === '7') {
          var minOther = Math.min.apply(null, v.players.filter(function (p) { return p.id !== v.me && !p.out; }).map(function (p) { return p.count; }));
          s += (hand.length - 1 - minOther) * 4;
        }
        if ((v.options.sevenO && f.v === '0') || (v.variant === 'liars' && f.v === '10')) {
          var prev = v.players[nextSeat({ players: v.players, dir: -v.dir }, v.me, 1)];
          s += (hand.length - 1 - prev.count) * 3;
        }
        if (v.variant === 'liars' && f.v === '7') {
          var mo = Math.min.apply(null, v.players.filter(function (p) { return p.id !== v.me && !p.out; }).map(function (p) { return p.count; }));
          s += (hand.length - 1 - mo) * 4;
        }
      } else if (m.kind === 'wild') {
        s += hand.length <= 2 ? 25 : -12;
        if (m.draw) s += threat ? 30 : m.draw * 1.2 - 4;
        if (f.v === 'roulette') s += threat ? 25 : 4;
        if (f.v === 'wildskip' || f.v === 'wildskip2' || f.v === 'wildrev') s += threat ? 18 : 3;
        if (f.v === 'wildswap') s += (hand.length - 1 - nextP.count) * 3;
        if (v.variant === 'allwild') s += 15;
      } else {
        s += (counts[f.c] || 0) * 1.5 + (f.c === v.color ? 3 : 0);
        if (f.v === 'skip' || f.v === 'reverse') s += threat ? 25 : 6;
        if (m.draw) s += threat ? 30 + m.draw : 6 + m.draw;
        if (f.v === 'skipall') s += 16;
        if (f.v === 'discardall') s += (counts[f.c] || 1) * 7;
        if (f.v === 'flip') s += 6 + rand(rnd) * 6;
        if (f.v === 'dare') s += 12;
        if (f.v === 'hit2') s += threat ? 25 : 8;
        if (f.v === 'trade') s += (hand.length - 1 - nextP.count) * 3;
      }
      if (v.drawStack > 0) s = 100 - (m.draw || 0); // stack with the smallest card that works
      s += (rand(rnd) - 0.5) * 2 * NOISE[level];
      return { a: a, s: s };
    });
    scored.sort(function (x, y) { return y.s - x.s; });
    return scored[0].a;
  }

  function maybeBluff(v, plays, level, rnd) {
    var hand = v.players[v.me].hand;
    var liars = hand.filter(function (c) { return c.a && c.a.l; });
    if (!liars.length) return null;
    var stuck = !plays.length;
    var chance = stuck ? (level === 'easy' ? 0.6 : 0.9) : (level === 'easy' ? 0.15 : 0.3);
    if (rand(rnd) > chance) return null;
    var card = liars[Math.floor(rand(rnd) * liars.length)];
    var real = card.a;
    var claims = v.claims.filter(function (c) { return c.c !== 'wild'; });
    var truthLegal = claims.some(function (c) { return c.c === real.c && c.v === real.v; });
    var claim;
    // sometimes tell the truth to bait a challenge
    if (truthLegal && rand(rnd) < 0.45) claim = { c: real.c, v: real.v };
    else if (claims.length && rand(rnd) < 0.85) claim = claims[Math.floor(rand(rnd) * claims.length)];
    else claim = { c: 'wild', v: 'wild', color: bestColor(v, hand, E.LIGHT, rnd) };
    return { type: 'bluff', cardId: card.id, claim: claim };
  }

  function liarCheck(v, level, rnd) {
    var claim = v.pend.claim;
    var max = claim.c === 'wild' ? 2 : (claim.v === '0' || claim.v === '10' ? 1 : 2);
    var seen = 0;
    v.players[v.me].hand.concat(v.discard).forEach(function (c) {
      var f = c.a;
      if (f && f.v === claim.v && (claim.c === 'wild' || f.c === claim.c)) seen++;
    });
    if (seen >= max) return { type: 'challenge' };
    var claimer = v.players[v.pend.p];
    var pr = level === 'easy' ? 0.2 : 0.28;
    if (claimer.count <= 1) pr += 0.25;
    if (claim.c === 'wild') pr += 0.12;
    if (seen === max - 1) pr += 0.15;
    return rand(rnd) < pr ? { type: 'challenge' } : { type: 'accept' };
  }

  /* ---------------- DOS ---------------- */
  function dosVal(c) { return c.v === 'dos' ? 2 : (c.v === 'hash' ? 0 : +c.v); }
  function decideDos(v, mem, rnd) {
    var me = v.players[v.me];
    var level = me.level || 'normal';
    var legal = v.legal;
    var hand = me.hand;
    var byType = {};
    legal.forEach(function (a) { (byType[a.type] = byType[a.type] || []).push(a); });
    if (v.phase === 'roundOver') return null;
    if (byType.uno && hand.length <= 3 && v.current === v.me) {
      var key = 'dos' + v.round + '_' + v.turnNo + '_' + hand.length;
      if (!mem[key]) { mem[key] = true; if (rand(rnd) >= FORGET_UNO[level] && hand.length === 2) return { type: 'uno' }; }
    }
    var cardById = {};
    hand.forEach(function (c) { cardById[c.id] = c.a; });
    if (byType.match) {
      var scored = byType.match.map(function (a) {
        var target = v.center[a.slot].card.a;
        var cards = a.cards.map(function (id) { return cardById[id]; });
        var colorOk = cards.every(function (c) { return c.c === 'wild' || target.v === 'dos' || c.c === target.c; });
        var s = cards.length * 10;
        if (colorOk) s += cards.length === 2 ? 22 : 9;
        // keep wild cards for later unless they finish the hand
        cards.forEach(function (c) { if (c.v === 'hash') s -= 6; if (c.v === 'dos') s -= 3; });
        if (hand.length - cards.length === 0) s += 100;
        s += (rand(rnd) - 0.5) * NOISE[level];
        return { a: a, s: s };
      });
      scored.sort(function (x, y) { return y.s - x.s; });
      return scored[0].a;
    }
    if (byType.endTurn) return byType.endTurn[0];
    if (byType.draw) return byType.draw[0];
    if (byType.place) {
      // give away the hardest card to match: a big plain number
      var pl = byType.place.slice().sort(function (a, b) {
        var ca = cardById[a.cardId], cb = cardById[b.cardId];
        var sa = ca.c === 'wild' || ca.v === 'hash' ? -50 : dosVal(ca);
        var sb = cb.c === 'wild' || cb.v === 'hash' ? -50 : dosVal(cb);
        return sb - sa;
      });
      return pl[0];
    }
    return null;
  }

  function decide(v, mem, rnd) {
    mem = mem || {};
    if (!v || !v.legal || !v.legal.length) return null;
    return v.engine === 'dos' ? decideDos(v, mem, rnd) : decideUno(v, mem, rnd);
  }

  return {
    decide: decide,
    catchChance: function (level) { return CATCH[level] || CATCH.normal; },
    lateCall: function (level) { return LATE_CALL[level] || LATE_CALL.normal; }
  };
});
