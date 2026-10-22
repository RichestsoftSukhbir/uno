/*
 * The Pro hall - professional card-room games on the same engine base as Desi Patti:
 *   Texas Hold'em, Blackjack, Indian Rummy (13 cards) and Twenty-Nine (29).
 * Points / chips only - no real money. ES5 so it runs on Node 12 and in the browser.
 */
(function (root, factory) {
  var P = typeof module === 'object' && module.exports ? require('./patti.js') : root.UNOPatti;
  var X = factory(P);
  if (typeof module === 'object' && module.exports) module.exports = X;
  root.UNOPro = X;
})(typeof self !== 'undefined' ? self : this, function (P) {
  'use strict';
  var Base = P.Base, B = P.proto, assign = P.assign, hi = P.hi, cname = P.cname, SYM = P.SYM, SUIT_NAME = P.SUIT_NAME, SUITS = P.SUITS, rndFn = P.rndFn;
  function inherit(Ctor) { Ctor.prototype = Object.create(B); return Ctor.prototype; }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }

  var OPTS = {
    blinds: { label: 'Blinds', type: 'select', choices: [['5', '5 / 10'], ['10', '10 / 20'], ['25', '25 / 50']] },
    minBet: { label: 'Table minimum bet', type: 'select', choices: [['10', '10'], ['25', '25'], ['50', '50']] },
    rummyFormat: { label: 'Format', type: 'select', choices: [['points', 'Points rummy - one deal'], ['deals', 'Deals rummy - several deals, lowest total wins']] },
    lastTrick: { label: 'Point for the last trick', type: 'bool' }
  };
  var GAMES = {
    holdem: { id: 'holdem', universe: 'desi', hall: 'pro', name: 'Texas Hold\'em', short: 'Hold\'em', players: [2, 8], accent: '#0f7b5c', sig: { s: 'S', r: 'A' },
      tagline: 'Two hole cards, five on the board, four betting rounds. Make the best five-card hand - chips only.',
      defaults: { rounds: 10, chips: 1000, blinds: '10', turnTimer: 30 }, options: ['rounds', 'chips', 'blinds', 'turnTimer'] },
    blackjack: { id: 'blackjack', universe: 'desi', hall: 'pro', name: 'Blackjack', short: 'Blackjack', players: [1, 6], accent: '#1d4e89', sig: { s: 'H', r: 'A' },
      tagline: 'Beat the dealer to 21 without going bust. Blackjack pays 3 to 2 - chips only.',
      defaults: { rounds: 8, chips: 1000, minBet: '10', turnTimer: 30 }, options: ['rounds', 'chips', 'minBet', 'turnTimer'] },
    rummy: { id: 'rummy', universe: 'desi', hall: 'pro', name: 'Indian Rummy', short: 'Rummy', players: [2, 6], accent: '#7a3b9c', sig: { s: 'D', r: '7' },
      tagline: '13 cards, draw and discard. Two sequences - one of them pure - and you can declare.',
      defaults: { rounds: 1, rummyFormat: 'points', turnTimer: 45 }, options: ['rummyFormat', 'rounds', 'turnTimer'] },
    twentynine: { id: 'twentynine', universe: 'desi', hall: 'pro', name: 'Twenty-Nine (29)', short: '29', players: [4, 4], accent: '#8a5a12', sig: { s: 'C', r: 'J' },
      tagline: 'Partners bid for card points with a 32-card deck - Jacks and Nines rule. Make your contract.',
      defaults: { rounds: 6, lastTrick: true, turnTimer: 30 }, options: ['rounds', 'lastTrick', 'turnTimer'] }
  };

  /* ================================================================== */
  /* poker hand evaluation                                               */
  /* ================================================================== */
  var POKER_NAMES = ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush'];
  // [category, tie-breakers...] for exactly five cards
  function eval5(cs) {
    var v = cs.map(function (c) { return hi(c.r); }).sort(function (a, b) { return b - a; });
    var flush = cs.every(function (c) { return c.s === cs[0].s; });
    var uniq = v.filter(function (x, i) { return v.indexOf(x) === i; });
    var straightHigh = 0;
    if (uniq.length === 5) {
      if (v[0] - v[4] === 4) straightHigh = v[0];
      else if (v[0] === 14 && v[1] === 5) straightHigh = 5;            // A-2-3-4-5
    }
    var counts = {};
    v.forEach(function (x) { counts[x] = (counts[x] || 0) + 1; });
    var groups = Object.keys(counts).map(Number).sort(function (a, b) { return counts[b] - counts[a] || b - a; });
    var shape = groups.map(function (g) { return counts[g]; }).join('');
    if (straightHigh && flush) return [8, straightHigh];
    if (shape === '41') return [7].concat(groups);
    if (shape === '32') return [6].concat(groups);
    if (flush) return [5].concat(v);
    if (straightHigh) return [4, straightHigh];
    if (shape === '311') return [3].concat(groups);
    if (shape === '221') return [2].concat(groups);
    if (shape === '2111') return [1].concat(groups);
    return [0].concat(v);
  }
  function cmpRank(a, b) { for (var i = 0; i < Math.max(a.length, b.length); i++) { var d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; }
  function bestHand(cards) {
    var best = null, n = cards.length;
    if (n < 5) return null;
    for (var a = 0; a < n; a++) for (var b = a + 1; b < n; b++) for (var c = b + 1; c < n; c++) for (var d = c + 1; d < n; d++) for (var e = d + 1; e < n; e++) {
      var r = eval5([cards[a], cards[b], cards[c], cards[d], cards[e]]);
      if (!best || cmpRank(r, best) > 0) best = r;
    }
    return best;
  }

  /* ================================================================== */
  /* TEXAS HOLD'EM                                                       */
  /* ================================================================== */
  function Holdem(id, o, s, r) {
    Base.call(this, id, o, s, r);
    var chips = +this.o.chips || 1000;
    this.players.forEach(function (p) { p.score = chips; });
    this.o.rounds = Math.max(1, Math.min(15, +this.o.rounds || 10));
    this.startRound();
  }
  var HE = inherit(Holdem);
  HE.sb = function () { return +this.o.blinds || 10; };
  HE.bb = function () { return 2 * this.sb(); };
  HE.inHand = function (p) { return this.hand[p] && !this.folded[p]; };
  HE.canAct = function (p) { return this.inHand(p) && this.players[p].score > 0; };
  HE.nextIn = function (i, pred) { var self = this; return this.next(i, function (pl) { return pred.call(self, pl.id); }); };
  HE.isGameOver = function () { return this.players.filter(function (p) { return p.score > 0; }).length <= 1; };
  HE.startRound = function () {
    var self = this;
    this.round++;
    var n = this.players.length;
    this.hand = {}; this.folded = {}; this.bet = {}; this.contrib = {}; this.acted = {};
    this.board = []; this.burn = []; this.pot = 0; this.show = null;
    this.players.forEach(function (p) { p.hand = []; p.tag = p.score > 0 ? '' : 'BUST'; p.out = p.score <= 0; self.bet[p.id] = 0; self.contrib[p.id] = 0; });
    var live = this.players.filter(function (p) { return !p.out; });
    if (live.length < 2) { this.phase = 'deal'; this.o.rounds = this.round; return this.finishRound((live[0] ? live[0].name : 'Nobody') + ' has all the chips!', [live[0] ? live[0].id : 0], null); }
    live.forEach(function (p) { self.hand[p.id] = true; });
    this.stack = this.deck(1);
    // the button moves to the next player still in the game
    this.button = this.round === 1 ? this.dealer : this.nextIn(this.button, function (q) { return !this.players[q].out; });
    var heads = live.length === 2;
    this.sbSeat = heads ? this.button : this.nextIn(this.button, function (q) { return this.hand[q]; });
    this.bbSeat = this.nextIn(this.sbSeat, function (q) { return this.hand[q]; });
    var order = [];
    for (var k = 0; k < 2; k++) for (var i = 1; i <= n; i++) { var q = (this.button + i) % n; if (this.hand[q]) { var c = this.stack.pop(); this.players[q].hand.push(c); order.push([q, c.id]); } }
    this.emit({ t: 'deal', order: order, dealer: this.button, round: this.round });
    this.commit(this.sbSeat, this.sb());
    this.commit(this.bbSeat, this.bb());
    this.currentBet = this.bb();
    this.minRaise = this.bb();
    this.street = 'preflop';
    this.phase = 'bet';
    this.current = this.nextIn(this.bbSeat, this.canAct);
    this.players[this.button].tag = 'DEALER';
    this.note('Hand ' + this.round + ': blinds ' + this.sb() + '/' + this.bb() + ' - ' + this.pname(this.sbSeat) + ' small, ' + this.pname(this.bbSeat) + ' big.');
    if (this.liveCount() - this.allInCount() <= 1 && this.bet[this.current] >= this.currentBet) this.endStreet();
  };
  HE.liveCount = function () { var self = this; return this.players.filter(function (p) { return self.inHand(p.id); }).length; };
  HE.allInCount = function () { var self = this; return this.players.filter(function (p) { return self.inHand(p.id) && p.score === 0; }).length; };
  HE.commit = function (p, amt) {
    amt = Math.max(0, Math.min(amt, this.players[p].score));
    this.players[p].score -= amt;
    this.bet[p] += amt;
    this.contrib[p] += amt;
    this.pot += amt;
    if (amt) this.emit({ t: 'bet', p: p, amount: amt });
    return amt;
  };
  HE.legalFor = function (p) {
    if (this.phase === 'showdown') return [{ type: 'collect', key: 'collect' }];
    if (this.phase === 'runout') return [{ type: 'street', key: 'street' }];
    var pl = this.players[p], toCall = this.currentBet - this.bet[p], stack = pl.score, out = [];
    if (toCall > 0) out.push({ type: 'fold', key: 'fold', label: 'Fold', style: 'red' });
    if (toCall <= 0) out.push({ type: 'check', key: 'check', label: 'Check', style: 'green' });
    else out.push({ type: 'call', key: 'call', amount: Math.min(toCall, stack), label: stack <= toCall ? 'All in ' + stack : 'Call ' + toCall, style: 'green' });
    if (stack > toCall) {
      var minTo = this.currentBet + this.minRaise, word = this.currentBet ? 'Raise to ' : 'Bet ';
      var potTo = this.currentBet + Math.max(this.minRaise, this.pot + toCall);
      [minTo, potTo].forEach(function (to, i) {
        var add = to - this.bet[p];
        if (add < stack && !out.some(function (x) { return x.to === to; })) out.push({ type: 'raise', key: 'raise' + to, to: to, amount: add, label: word + to + (i ? ' (pot)' : ''), style: 'yellow' });
      }, this);
      out.push({ type: 'allin', key: 'allin', amount: stack, label: 'All in ' + stack, style: 'wild' });
    }
    return out;
  };
  HE.autoNext = function () {
    if (this.phase === 'runout') return { type: 'street', key: 'street' };
    if (this.phase === 'showdown') return { type: 'collect', key: 'collect' };
    return null;
  };
  HE.raiseTo = function (p, to) {
    var before = this.currentBet;
    this.commit(p, to - this.bet[p]);
    if (this.bet[p] > before) {
      var inc = this.bet[p] - before;
      if (inc >= this.minRaise) this.minRaise = inc;
      this.currentBet = this.bet[p];
      this.acted = {};                      // everyone else gets to answer the raise
      this.emit({ t: 'raise', p: p });
    }
  };
  HE.on_fold = function (p) { this.folded[p] = true; this.players[p].tag = 'FOLD'; this.emit({ t: 'pack', p: p }); this.note(this.pname(p) + ' folds.'); this.acted[p] = true; this.advance(p); };
  HE.on_check = function (p) { this.note(this.pname(p) + ' checks.'); this.emit({ t: 'pass', p: p }); this.acted[p] = true; this.advance(p); };
  HE.on_call = function (p) { var a = this.commit(p, this.currentBet - this.bet[p]); this.note(this.pname(p) + (this.players[p].score ? ' calls ' + a + '.' : ' calls all in (' + a + ').')); this.acted[p] = true; this.advance(p); };
  HE.on_raise = function (p, a) { this.raiseTo(p, a.to); this.note(this.pname(p) + (this.street === 'preflop' || this.currentBet > a.to ? ' raises to ' : ' bets ') + this.bet[p] + '.'); this.acted[p] = true; this.advance(p); };
  HE.on_allin = function (p) { this.raiseTo(p, this.bet[p] + this.players[p].score); this.note(this.pname(p) + ' goes ALL IN (' + this.bet[p] + ').'); this.acted[p] = true; this.advance(p); };
  HE.advance = function (p) {
    var self = this;
    if (this.liveCount() === 1) {
      var w = this.players.filter(function (pl) { return self.inHand(pl.id); })[0].id;
      return this.award([{ amount: this.pot, winners: [w] }], 'everyone else folded');
    }
    var actors = this.players.filter(function (pl) { return self.canAct(pl.id); });
    var done = actors.every(function (pl) { return self.acted[pl.id] && self.bet[pl.id] === self.currentBet; }) ||
      (actors.length === 1 && this.bet[actors[0].id] >= this.currentBet) || actors.length === 0;
    if (done) return this.endStreet();
    this.current = this.nextIn(p, function (q) { return this.canAct(q) && (!this.acted[q] || this.bet[q] < this.currentBet); });
  };
  HE.dealBoard = function (n) {
    this.burn.push(this.stack.pop());
    var ids = [];
    for (var i = 0; i < n; i++) { var c = this.stack.pop(); this.board.push(c); ids.push(c.id); }
    this.emit({ t: 'floor', ids: ids });
  };
  HE.endStreet = function () {
    var self = this;
    this.players.forEach(function (pl) { self.bet[pl.id] = 0; });
    this.currentBet = 0; this.minRaise = this.bb(); this.acted = {};
    var next = { preflop: 'flop', flop: 'turn', turn: 'river', river: 'showdown' }[this.street];
    if (next === 'showdown') return this.toShowdown();
    this.street = next;
    this.dealBoard(next === 'flop' ? 3 : 1);
    this.note(next[0].toUpperCase() + next.slice(1) + ': ' + this.board.map(cname).join(' '));
    // nobody left who can bet: deal the rest out one street at a time
    var actors = this.players.filter(function (pl) { return self.canAct(pl.id); });
    if (actors.length <= 1) { this.phase = 'runout'; this.current = this.button; return; }
    this.phase = 'bet';
    this.current = this.nextIn(this.button, this.canAct);
  };
  HE.on_street = function () { this.phase = 'bet'; this.endStreet(); };
  // split the pot into side pots by how much each player put in
  HE.pots = function () {
    var self = this, levels = [];
    this.players.forEach(function (pl) { if (self.inHand(pl.id) && levels.indexOf(self.contrib[pl.id]) < 0) levels.push(self.contrib[pl.id]); });
    levels.sort(function (a, b) { return a - b; });
    var pots = [], prev = 0;
    levels.forEach(function (lv) {
      var amount = 0;
      self.players.forEach(function (pl) { amount += Math.max(0, Math.min(self.contrib[pl.id], lv) - prev); });
      var eligible = self.players.filter(function (pl) { return self.inHand(pl.id) && self.contrib[pl.id] >= lv; }).map(function (pl) { return pl.id; });
      if (amount) pots.push({ amount: amount, eligible: eligible });
      prev = lv;
    });
    // chips put in above the highest live contribution (folded players' over-bets) join the last pot
    var counted = sum(pots.map(function (x) { return x.amount; }));
    if (pots.length && counted < this.pot) pots[pots.length - 1].amount += this.pot - counted;
    return pots;
  };
  HE.toShowdown = function () {
    var self = this;
    this.street = 'showdown';
    var ranks = {};
    this.players.forEach(function (pl) { if (self.inHand(pl.id)) ranks[pl.id] = bestHand(pl.hand.concat(self.board)); });
    var pots = this.pots().map(function (pt) {
      var best = null;
      pt.eligible.forEach(function (q) { if (!best || cmpRank(ranks[q], best) > 0) best = ranks[q]; });
      return { amount: pt.amount, winners: pt.eligible.filter(function (q) { return cmpRank(ranks[q], best) === 0; }) };
    });
    var shown = Object.keys(ranks).map(Number);
    this.show = { players: shown, ranks: ranks, pots: pots };
    var top = pots[0] ? pots[0].winners : [];
    this.emit({ t: 'showdown', players: shown, winners: top });
    shown.forEach(function (q) { self.note(self.pname(q) + ' shows ' + self.players[q].hand.map(cname).join(' ') + ' - ' + POKER_NAMES[ranks[q][0]] + '.'); });
    this.phase = 'showdown';
    this.current = top[0] != null ? top[0] : this.button;
  };
  HE.on_collect = function () { this.award(this.show.pots, 'showdown'); };
  HE.award = function (pots, why) {
    var self = this, n = this.players.length, got = {};
    pots.forEach(function (pt) {
      var share = Math.floor(pt.amount / pt.winners.length), rest = pt.amount - share * pt.winners.length;
      // odd chips go to the first winner left of the button
      var order = pt.winners.slice().sort(function (a, b) { return ((a - self.button + n) % n) - ((b - self.button + n) % n); });
      order.forEach(function (w, i) { var x = share + (i === 0 ? rest : 0); self.players[w].score += x; got[w] = (got[w] || 0) + x; });
    });
    var winners = Object.keys(got).map(Number);
    winners.forEach(function (w) { self.players[w].tag = 'WINNER'; });
    this.emit({ t: 'potWon', winners: winners, amount: this.pot });
    var hand = this.show && this.show.ranks[winners[0]] ? ' with ' + POKER_NAMES[this.show.ranks[winners[0]][0]] : '';
    var text = winners.map(function (w) { return self.pname(w) + ' wins ' + got[w]; }).join(', ') + hand + ' (' + why + ').';
    this.pot = 0;
    this.finishRound(text, winners, null, { pot: sum(winners.map(function (w) { return got[w]; })) });
  };
  HE.view = function (viewer) {
    var self = this;
    var showIds = this.show ? this.show.players : [];
    var reveal = this.phase === 'showdown' || (this.phase === 'roundOver' && this.show);
    var v = this.baseView(viewer, {
      zones: [
        { id: 'board', type: 'floor', label: this.board.length ? { flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Showdown' }[this.street] || '' : 'Pre-flop', items: this.board.map(function (c, i) { return { kind: 'card', idx: i, cv: self.cv(c, true) }; }) },
        { id: 'pot', type: 'pot', at: 'below', amount: this.pot, label: 'Pot ' + this.pot, sub: 'Blinds ' + this.sb() + '/' + this.bb() }
      ],
      chips: true,
      status: this.phase === 'showdown' ? 'Showdown!' : this.phase === 'runout' ? 'All in - dealing the board' :
        this.statusFor(viewer, this.currentBet - (this.bet[viewer] || 0) > 0 ? 'Your turn - ' + (this.currentBet - this.bet[viewer]) + ' to call' : 'Your turn - check or bet', 'is thinking…')
    });
    v.players.forEach(function (pv, i) {
      var vis = i === viewer || (reveal && showIds.indexOf(i) >= 0);
      pv.hand = self.players[i].hand.map(function (c) { return self.cv(c, vis); });
      if (reveal && self.show && self.show.ranks[i]) pv.handName = POKER_NAMES[self.show.ranks[i][0]];
    });
    if (viewer != null && this.players[viewer] && this.players[viewer].hand.length === 2) {
      var mine = bestHand(this.players[viewer].hand.concat(this.board));
      v.myHandName = mine ? POKER_NAMES[mine[0]] : (this.players[viewer].hand[0].r === this.players[viewer].hand[1].r ? 'Pocket pair' : '');
    }
    v.buttons = v.legal.filter(function (a) { return a.label; });
    return v;
  };
  HE.scoreboard = function () {
    var self = this;
    return { title: 'Chips', rows: this.players.map(function (pl) {
      var st = pl.out ? 'Out' : self.folded[pl.id] ? 'Folded' : !self.hand[pl.id] ? '' : pl.score === 0 ? 'All in' : self.bet[pl.id] ? 'Bet ' + self.bet[pl.id] : '';
      if (pl.id === self.button && !pl.out) st = (st ? st + ' · ' : '') + 'Dealer';
      return { label: pl.name, p: pl.id, value: '◉ ' + pl.score, sub: st, bad: pl.out || self.folded[pl.id] };
    }), foot: 'Pot ' + this.pot + (this.currentBet ? ' · to call ' + this.currentBet : '') + ' · Hand ' + this.round + '/' + this.o.rounds };
  };

  /* ================================================================== */
  /* BLACKJACK                                                           */
  /* ================================================================== */
  function bjValue(cards) {
    var total = 0, aces = 0;
    cards.forEach(function (c) { if (c.r === 'A') { aces++; total += 11; } else total += (c.r === 'K' || c.r === 'Q' || c.r === 'J') ? 10 : +c.r; });
    while (total > 21 && aces) { total -= 10; aces--; }
    return { total: total, soft: aces > 0 };
  }
  function Blackjack(id, o, s, r) {
    Base.call(this, id, o, s, r);
    var chips = +this.o.chips || 1000;
    this.players.forEach(function (p) { p.score = chips; });
    this.shoe = [];
    this.startRound();
  }
  var BJ = inherit(Blackjack);
  BJ.minBet = function () { return +this.o.minBet || 10; };
  BJ.isGameOver = function () { var m = this.minBet(); return this.players.every(function (p) { return p.score < m; }); };
  BJ.startRound = function () {
    var self = this, m = this.minBet();
    this.round++;
    this.players.forEach(function (p) { p.hand = []; p.out = p.score < m; p.tag = p.out ? 'BUST' : ''; p.done = false; p.doubled = false; });
    this.wager = {};
    this.dealerCards = [];
    this.holeShown = false;
    this.results = null;
    var seated = this.players.filter(function (p) { return !p.out; });
    if (!seated.length) { this.phase = 'deal'; this.o.rounds = this.round; return this.finishRound('Nobody can cover the table minimum.', [0], null); }
    // six-deck shoe, reshuffled when it runs low
    if (this.shoe.length < 60) { this.shoe = this.deck(6); this.emit({ t: 'reshuffle' }); this.note('A fresh six-deck shoe is shuffled.'); }
    this.phase = 'bet';
    this.current = seated[0].id;
    this.note('Round ' + this.round + ' - place your bets (minimum ' + m + ').');
  };
  BJ.seatedAfter = function (p, pred) {
    for (var i = p + 1; i < this.players.length; i++) if (!this.players[i].out && (!pred || pred(this.players[i]))) return i;
    return null;
  };
  BJ.legalFor = function (p) {
    var pl = this.players[p], m = this.minBet();
    if (this.phase === 'dealer') return [{ type: 'dealerStep', key: 'dealer' }];
    if (this.phase === 'bet') {
      var out = [];
      [1, 2.5, 5, 10].forEach(function (k) { var a = Math.round(m * k); if (a <= pl.score && !out.some(function (x) { return x.amount === a; })) out.push({ type: 'bet', key: 'bet' + a, amount: a, label: 'Bet ' + a, style: k === 1 ? 'green' : k >= 5 ? 'wild' : 'yellow' }); });
      return out;
    }
    var hv = bjValue(pl.hand);
    var acts = [{ type: 'hit', key: 'hit', label: 'Hit (' + hv.total + ')', style: 'green' }, { type: 'stand', key: 'stand', label: 'Stand', style: 'red' }];
    if (pl.hand.length === 2 && pl.score >= this.wager[p]) acts.push({ type: 'double', key: 'double', label: 'Double ' + this.wager[p], style: 'yellow' });
    return acts;
  };
  BJ.autoNext = function () { return this.phase === 'dealer' ? { type: 'dealerStep', key: 'dealer' } : null; };
  BJ.on_bet = function (p, a) {
    this.players[p].score -= a.amount;
    this.wager[p] = a.amount;
    this.emit({ t: 'bet', p: p, amount: a.amount });
    this.note(this.pname(p) + ' bets ' + a.amount + '.');
    var nxt = this.seatedAfter(p);
    if (nxt != null) { this.current = nxt; return; }
    this.dealIn();
  };
  BJ.draw = function () { if (!this.shoe.length) this.shoe = this.deck(6); return this.shoe.pop(); };
  BJ.dealIn = function () {
    var self = this, order = [];
    for (var k = 0; k < 2; k++) {
      this.players.forEach(function (pl) { if (!pl.out) { var c = self.draw(); pl.hand.push(c); order.push([pl.id, c.id]); } });
      this.dealerCards.push(this.draw());
    }
    this.emit({ t: 'deal', order: order, round: this.round });
    // dealer peeks for blackjack with an Ace or ten-card showing
    var up = this.dealerCards[0];
    var dealerBJ = bjValue(this.dealerCards).total === 21;
    if (dealerBJ && (up.r === 'A' || bjValue([up]).total === 10)) {
      this.holeShown = true;
      this.note('The dealer has BLACKJACK.');
      return this.settle();
    }
    this.players.forEach(function (pl) { if (!pl.out && bjValue(pl.hand).total === 21) { pl.done = true; pl.tag = 'BLACKJACK'; self.note(pl.name + ' has BLACKJACK!'); } });
    this.phase = 'play';
    var first = this.seatedAfter(-1, function (pl) { return !pl.done; });
    if (first == null) return this.dealerTurn();
    this.current = first;
  };
  BJ.nextPlayer = function (p) {
    var nxt = this.seatedAfter(p, function (pl) { return !pl.done; });
    if (nxt == null) return this.dealerTurn();
    this.current = nxt;
  };
  BJ.on_hit = function (p) {
    var pl = this.players[p], c = this.draw();
    pl.hand.push(c);
    this.emit({ t: 'deal', order: [[p, c.id]], more: true });
    var t = bjValue(pl.hand).total;
    this.note(this.pname(p) + ' hits: ' + cname(c) + ' (' + t + ').');
    if (t > 21) { pl.done = true; pl.tag = 'BUST'; this.emit({ t: 'pack', p: p }); this.note(this.pname(p) + ' is BUST.'); return this.nextPlayer(p); }
    if (t === 21) { pl.done = true; return this.nextPlayer(p); }
  };
  BJ.on_stand = function (p) { this.players[p].done = true; this.note(this.pname(p) + ' stands on ' + bjValue(this.players[p].hand).total + '.'); this.nextPlayer(p); };
  BJ.on_double = function (p) {
    var pl = this.players[p];
    pl.score -= this.wager[p];
    this.emit({ t: 'bet', p: p, amount: this.wager[p] });
    this.wager[p] *= 2;
    pl.doubled = true;
    var c = this.draw();
    pl.hand.push(c);
    this.emit({ t: 'deal', order: [[p, c.id]], more: true });
    var t = bjValue(pl.hand).total;
    this.note(this.pname(p) + ' doubles to ' + this.wager[p] + ' and draws ' + cname(c) + ' (' + t + ').');
    pl.done = true;
    if (t > 21) { pl.tag = 'BUST'; this.emit({ t: 'pack', p: p }); }
    this.nextPlayer(p);
  };
  BJ.dealerTurn = function () {
    this.phase = 'dealer';
    this.current = this.players.filter(function (pl) { return !pl.out; })[0].id;
  };
  // one dealer action per step so the table can animate it: turn the hole card, then hit to 17
  BJ.on_dealerStep = function () {
    var self = this;
    if (!this.holeShown) { this.holeShown = true; this.note('The dealer turns over ' + cname(this.dealerCards[1]) + ' (' + bjValue(this.dealerCards).total + ').'); return; }
    var anyLive = this.players.some(function (pl) { return !pl.out && bjValue(pl.hand).total <= 21; });
    var dv = bjValue(this.dealerCards);
    if (anyLive && dv.total < 17) { var c = this.draw(); this.dealerCards.push(c); this.note('Dealer draws ' + cname(c) + ' (' + bjValue(this.dealerCards).total + ').'); return; }
    this.settle();
  };
  BJ.settle = function () {
    var self = this;
    var dv = bjValue(this.dealerCards), dealerBJ = dv.total === 21 && this.dealerCards.length === 2;
    var lines = [], winners = [], paid = 0;
    this.players.forEach(function (pl) {
      if (pl.out) return;
      var w = self.wager[pl.id] || 0, pv = bjValue(pl.hand), bj = pv.total === 21 && pl.hand.length === 2;
      var back = 0, res;
      if (pv.total > 21) res = 'bust';
      else if (bj && !dealerBJ) { back = w + Math.floor(w * 1.5); res = 'blackjack'; }
      else if (dealerBJ && !bj) res = 'lose';
      else if (dv.total > 21 || pv.total > dv.total) { back = 2 * w; res = 'win'; }
      else if (pv.total === dv.total) { back = w; res = 'push'; }
      else res = 'lose';
      pl.score += back;
      paid += back;
      if (back > w) winners.push(pl.id);
      pl.tag = { bust: 'BUST', blackjack: 'BLACKJACK', win: 'WIN', push: 'PUSH', lose: 'LOSE' }[res];
      lines.push(pl.name + ' ' + { bust: 'busts', blackjack: 'blackjack +' + (back - w), win: 'wins +' + w, push: 'push', lose: 'loses ' + w }[res]);
    });
    if (winners.length) this.emit({ t: 'potWon', winners: winners, amount: paid });
    this.holeShown = true;
    this.finishRound('Dealer ' + (dv.total > 21 ? 'busts with ' + dv.total : dealerBJ ? 'has blackjack' : 'has ' + dv.total) + ': ' + lines.join(', ') + '.', winners.length ? winners : [this.players.filter(function (p) { return !p.out; })[0].id], null);
  };
  BJ.view = function (viewer) {
    var self = this;
    var dcards = this.dealerCards.map(function (c, i) { return { kind: 'card', idx: i, cv: self.cv(c, i === 0 || self.holeShown) }; });
    var shown = this.holeShown ? bjValue(this.dealerCards).total : (this.dealerCards[0] ? bjValue([this.dealerCards[0]]).total : 0);
    var v = this.baseView(viewer, {
      zones: [{ id: 'dealer', type: 'floor', label: this.dealerCards.length ? 'Dealer ' + (this.holeShown ? shown : shown + ' + ?') : 'Dealer', items: dcards }],
      deckCount: this.shoe.length, chips: true,
      status: this.phase === 'bet' ? this.statusFor(viewer, 'Place your bet', 'is betting…') : this.phase === 'dealer' ? 'Dealer\'s turn' :
        this.statusFor(viewer, 'Your hand: ' + (this.players[viewer] ? bjValue(this.players[viewer].hand).total : '') + ' - hit, stand or double', 'is playing…')
    });
    // everybody's cards are face up in blackjack
    v.players.forEach(function (pv, i) { pv.hand = self.players[i].hand.map(function (c) { return self.cv(c, true); }); });
    if (this.players[viewer] && this.players[viewer].hand.length) v.myHandName = bjValue(this.players[viewer].hand).total + (bjValue(this.players[viewer].hand).soft ? ' (soft)' : '');
    v.buttons = v.legal.filter(function (a) { return a.label; });
    return v;
  };
  BJ.scoreboard = function () {
    var self = this;
    var rows = this.players.map(function (pl) {
      var hv = pl.hand.length ? bjValue(pl.hand).total : null;
      return { label: pl.name, p: pl.id, value: '◉ ' + pl.score, sub: [self.wager[pl.id] ? 'Bet ' + self.wager[pl.id] : '', hv != null ? 'Hand ' + hv : '', pl.tag && pl.tag !== 'BUST' ? pl.tag : (pl.tag === 'BUST' && !pl.out ? 'Bust' : '')].filter(Boolean).join(' · '), bad: pl.out || pl.tag === 'BUST' || pl.tag === 'LOSE', good: pl.tag === 'WIN' || pl.tag === 'BLACKJACK' };
    });
    var dv = this.dealerCards.length ? (this.holeShown ? bjValue(this.dealerCards).total : bjValue([this.dealerCards[0]]).total + ' + ?') : '-';
    return { title: 'Blackjack', rows: rows, foot: 'Dealer ' + dv + ' · stands on 17 · round ' + this.round + '/' + this.o.rounds };
  };

  /* ================================================================== */
  /* INDIAN RUMMY (13 cards)                                             */
  /* ================================================================== */
  var RV = { A: 1, J: 11, Q: 12, K: 13 };
  function rv(c) { return RV[c.r] || +c.r; }
  function rummyPts(c, wild) { if (c.r === wild) return 0; return c.r === 'A' || c.r === 'J' || c.r === 'Q' || c.r === 'K' ? 10 : +c.r; }
  /*
   * Best grouping of a hand: melds are sequences (3+ consecutive cards of one suit; Ace low or high,
   * no wrap) and sets (3-4 cards of one rank, all suits different). Cards of the wild-joker rank can
   * stand in for any card; a sequence with no stand-in is "pure". Returns the least unmatched points,
   * preferring arrangements with a pure sequence and two sequences.
   */
  function rummyArrange(cards, wild) {
    var n = cards.length, memo = {};
    var isWild = cards.map(function (c) { return c.r === wild; });
    function key(mask) { return mask; }
    // candidate melds that use card i (by index) plus cards from the free mask
    function meldsWith(i, free) {
      var out = [], c = cards[i];
      var wilds = [];
      for (var j = 0; j < n; j++) if ((free & (1 << j)) && j !== i && isWild[j]) wilds.push(j);
      // sets: same rank, different suits
      if (!isWild[i]) {
        var same = [];
        for (var k = 0; k < n; k++) if ((free & (1 << k)) && k !== i && !isWild[k] && cards[k].r === c.r) same.push(k);
        var bySuit = {}; bySuit[c.s] = i;
        var uniqSuits = same.filter(function (k) { if (bySuit[cards[k].s] != null) return false; bySuit[cards[k].s] = k; return true; });
        var m = uniqSuits.length;
        for (var mask = 0; mask < (1 << m); mask++) {
          var grp = [i];
          for (var b = 0; b < m; b++) if (mask & (1 << b)) grp.push(uniqSuits[b]);
          for (var w = 0; w <= wilds.length && grp.length + w <= 4; w++) {
            if (grp.length + w < 3) continue;
            out.push({ idx: grp.concat(wilds.slice(0, w)), seq: false, pure: false });
          }
        }
      }
      // sequences in c's suit (a wild card can also be used as itself)
      var suit = c.s;
      var bySlot = {};
      for (var k2 = 0; k2 < n; k2++) if ((free & (1 << k2)) && cards[k2].s === suit && (k2 === i || true)) {
        var v = rv(cards[k2]);
        (bySlot[v] = bySlot[v] || []).push(k2);
        if (v === 1) (bySlot[14] = bySlot[14] || []).push(k2);
      }
      var mine = rv(c), slots = mine === 1 ? [1, 14] : [mine];
      slots.forEach(function (sv) {
        for (var lo = Math.max(1, sv - 12); lo <= sv; lo++) {
          for (var hiV = Math.max(sv, lo + 2); hiV <= Math.min(14, lo + 12); hiV++) {
            // fill lo..hiV: c at sv, naturals where present, wilds in the gaps
            var used = {}, idx = [i], gaps = 0, pure = !isWild[i] || true;
            used[i] = true;
            for (var x = lo; x <= hiV; x++) {
              if (x === sv) continue;
              var pick = (bySlot[x] || []).filter(function (q) { return !used[q]; })[0];
              if (pick != null) { used[pick] = true; idx.push(pick); } else gaps++;
            }
            var freeW = wilds.filter(function (q) { return !used[q]; });
            if (gaps > freeW.length) continue;
            var meld = idx.concat(freeW.slice(0, gaps));
            out.push({ idx: meld, seq: true, pure: gaps === 0 });
          }
        }
      });
      return out;
    }
    function solve(free) {
      if (memo[key(free)]) return memo[key(free)];
      var first = -1;
      for (var i = 0; i < n; i++) if ((free & (1 << i)) && !isWild[i]) { first = i; break; }
      var res;
      if (first < 0) {
        // only wild cards left: they're worth nothing; three or more can make a meld of their own
        var left = []; for (var j = 0; j < n; j++) if (free & (1 << j)) left.push(j);
        res = { dw: 0, loose: left.length >= 3 ? [] : left, melds: left.length >= 3 ? [{ idx: left, seq: true, pure: false }] : [], pure: 0, seq: left.length >= 3 ? 1 : 0, spare: left.length >= 3 ? [] : left };
      } else {
        // first card unmatched...
        var rest = solve(free & ~(1 << first));
        res = { dw: rest.dw + rummyPts(cards[first], wild), loose: rest.loose.concat([first]), melds: rest.melds, pure: rest.pure, seq: rest.seq, spare: rest.spare };
        // ...or in a meld
        meldsWith(first, free).forEach(function (m) {
          var mask = free;
          m.idx.forEach(function (q) { mask &= ~(1 << q); });
          var r2 = solve(mask);
          var cand = { dw: r2.dw, loose: r2.loose, melds: r2.melds.concat([m]), pure: r2.pure + (m.pure ? 1 : 0), seq: r2.seq + (m.seq ? 1 : 0), spare: r2.spare };
          if (better(cand, res)) res = cand;
        });
      }
      memo[key(free)] = res;
      return res;
    }
    function score(r) { return r.dw * 100 - Math.min(r.pure, 1) * 30 - Math.min(r.seq, 2) * 10; }
    function better(a, b) { return score(a) < score(b); }
    var all = (1 << n) - 1;
    var r = solve(all);
    // one or two spare wild cards join an existing meld - an impure one, so a pure sequence stays pure
    var spare = r.loose.filter(function (q) { return isWild[q]; });
    if (spare.length) {
      var melds = r.melds.slice(), pure = r.pure;
      var t = -1;
      for (var mi = 0; mi < melds.length; mi++) if (!melds[mi].pure && (melds[mi].seq || melds[mi].idx.length + spare.length <= 4)) { t = mi; break; }
      if (t < 0 && pure >= 2) for (var mj = 0; mj < melds.length; mj++) if (melds[mj].pure) { t = mj; pure--; break; }
      if (t >= 0) {
        melds[t] = { idx: melds[t].idx.concat(spare), seq: melds[t].seq, pure: false };
        r = { dw: r.dw, loose: r.loose.filter(function (q) { return !isWild[q]; }), melds: melds, pure: pure, seq: r.seq };
      }
    }
    var valid = r.dw === 0 && r.loose.length === 0 && r.pure >= 1 && r.seq >= 2;
    // penalty the way losers are scored: no pure sequence -> everything counts; pure but no second sequence -> only the pure sequence is safe
    var penalty;
    if (r.pure < 1) penalty = sum(cards.map(function (c) { return rummyPts(c, wild); }));
    else if (r.seq < 2) {
      var safe = {};
      r.melds.filter(function (m) { return m.pure; })[0].idx.forEach(function (q) { safe[q] = true; });
      penalty = sum(cards.map(function (c, q) { return safe[q] ? 0 : rummyPts(c, wild); }));
    } else penalty = r.dw;
    return { melds: r.melds, loose: r.loose, deadwood: r.dw, pure: r.pure, seq: r.seq, valid: valid, penalty: Math.min(80, penalty) };
  }
  function Rummy(id, o, s, r) {
    Base.call(this, id, o, s, r);
    if (this.o.rummyFormat !== 'deals') this.o.rounds = 1;
    this.startRound();
  }
  var RM = inherit(Rummy);
  RM.startRound = function () {
    var self = this;
    this.round++;
    var n = this.players.length;
    this.players.forEach(function (p) { p.hand = []; p.out = false; p.tag = ''; p.turns = 0; });
    this.closed = this.deck(n <= 2 ? 1 : 2);
    var order = this.dealAll(this.closed.splice(-13 * n), this.dealer + 1);
    this.cut = this.closed.pop();                    // the cut card: every card of its rank is a wild joker
    this.wild = this.cut.r;
    this.open = [this.closed.pop()];
    this.players.forEach(function (pl) { self.arrange(pl.id); });
    this.emit({ t: 'deal', order: order, dealer: this.dealer, round: this.round });
    this.current = (this.dealer + 1) % n;
    this.dealer = (this.dealer + 1) % n;
    this.phase = 'draw';
    this.note('Deal ' + this.round + ': the wild joker is ' + cname(this.cut) + ' - every ' + this.wild + ' is wild.');
  };
  // keep each hand ordered by its best grouping (melds first, then the loose cards by suit)
  RM.arrange = function (p) {
    var h = this.players[p].hand;
    var a = rummyArrange(h, this.wild);
    var order = [];
    a.melds.forEach(function (m) { m.idx.slice().sort(function (x, y) { return rv(h[x]) - rv(h[y]); }).forEach(function (q) { order.push(h[q]); }); });
    var suitO = { S: 0, H: 1, C: 2, D: 3 };
    a.loose.map(function (q) { return h[q]; }).sort(function (x, y) { return suitO[x.s] - suitO[y.s] || rv(x) - rv(y); }).forEach(function (c) { order.push(c); });
    this.players[p].hand = order;
    return a;
  };
  RM.declareCard = function (p) {
    var h = this.players[p].hand, self = this;
    if (h.length !== 14) return null;
    var best = null;
    for (var i = 0; i < h.length; i++) {
      var rest = h.slice(0, i).concat(h.slice(i + 1));
      if (rummyArrange(rest, self.wild).valid && (!best || rummyPts(h[i], self.wild) > rummyPts(best, self.wild))) best = h[i];
    }
    return best;
  };
  RM.legalFor = function (p) {
    var pl = this.players[p], out = [];
    if (this.phase === 'draw') {
      out.push({ type: 'drawDeck', key: 'deck', label: 'Draw from deck', style: 'green' });
      var top = this.open[this.open.length - 1];
      if (top) out.push({ type: 'drawOpen', key: 'open', cardId: null, label: 'Take ' + cname(top), style: 'yellow' });
      out.push({ type: 'drop', key: 'drop', label: 'Drop (' + (pl.turns ? 40 : 20) + ')', style: 'red' });
      return out;
    }
    pl.hand.forEach(function (c) { out.push({ type: 'discard', cardId: c.id, key: 'x' + c.id }); });
    if (this.declareCard(p)) out.push({ type: 'declare', key: 'declare', label: 'Declare!', style: 'wild' });
    return out;
  };
  RM.on_drawDeck = function (p) {
    if (!this.closed.length) {
      // closed deck finished: the open pile (all but its top card) is shuffled to make a new one
      var top = this.open.pop();
      this.closed = P.shuffle(this.open, this.rnd);
      this.open = [top];
      this.emit({ t: 'reshuffle' });
    }
    var c = this.closed.pop();
    this.players[p].hand.push(c);
    this.emit({ t: 'deal', order: [[p, c.id]], more: true });
    this.note(this.pname(p) + ' draws from the deck.');
    this.lastDrawn = c.id;
    this.phase = 'discard';
  };
  RM.on_drawOpen = function (p) {
    var c = this.open.pop();
    this.players[p].hand.push(c);
    this.emit({ t: 'pick', p: p, id: c.id });
    this.note(this.pname(p) + ' picks up ' + cname(c) + ' from the open pile.');
    this.lastDrawn = c.id;
    this.phase = 'discard';
  };
  RM.on_discard = function (p, a) {
    var c = this.take(p, a.cardId);
    this.open.push(c);
    this.emit({ t: 'throw', p: p, id: c.id });
    this.note(this.pname(p) + ' discards ' + cname(c) + '.');
    this.players[p].turns++;
    this.arrange(p);
    this.phase = 'draw';
    this.current = this.next(p, function (pl) { return !pl.out; });
  };
  RM.on_drop = function (p) {
    var pl = this.players[p], pts = pl.turns ? 40 : 20;
    pl.out = true; pl.tag = 'DROP'; pl.dropPts = pts;
    this.emit({ t: 'pack', p: p });
    this.note(this.pname(p) + ' drops (' + pts + ' points).');
    var left = this.players.filter(function (q) { return !q.out; });
    if (left.length === 1) return this.score(left[0].id, 'everyone else dropped');
    this.current = this.next(p, function (q) { return !q.out; });
  };
  RM.on_declare = function (p) {
    var c = this.declareCard(p);
    this.take(p, c.id);
    this.open.push(c);
    this.emit({ t: 'throw', p: p, id: c.id });
    this.arrange(p);
    this.players[p].tag = 'RUMMY';
    this.emit({ t: 'escape', p: p });
    this.note(this.pname(p) + ' discards ' + cname(c) + ' and DECLARES a valid hand!');
    this.score(p, 'a valid declaration');
  };
  RM.score = function (winner, why) {
    var self = this;
    var delta = this.players.map(function (pl) {
      if (pl.id === winner) return 0;
      if (pl.tag === 'DROP') return -pl.dropPts;
      return -rummyArrange(pl.hand, self.wild).penalty;
    });
    var lines = this.players.filter(function (pl) { return pl.id !== winner; }).map(function (pl) { return pl.name + ' ' + (-delta[pl.id]); });
    this.finishRound(this.pname(winner) + ' wins the deal (' + why + '). Penalty points: ' + lines.join(', ') + '.', [winner], delta, { penalties: delta });
  };
  RM.view = function (viewer) {
    var self = this;
    var top = this.open.slice(-3);
    var v = this.baseView(viewer, {
      zones: [
        { id: 'open', type: 'pile', pos: 'center', faceUp: true, label: 'Open pile', cards: top.map(function (c) { return self.cv(c, true); }) },
        { id: 'joker', type: 'pile', pos: 'left', faceUp: true, label: 'Joker: every ' + this.wild, cards: [this.cv(this.cut, true)] }
      ],
      deckCount: this.closed.length, keepOrder: true, wild: this.wild,
      status: this.phase === 'draw' ? this.statusFor(viewer, 'Draw from the closed deck or take the open card', 'is drawing…') : this.statusFor(viewer, 'Tap a card to discard it' + (this.declareCard(viewer) ? ' - or DECLARE!' : ''), 'is discarding…')
    });
    if (this.players[viewer]) {
      var a = rummyArrange(this.players[viewer].hand, this.wild);
      v.myHandName = (a.pure ? 'Pure seq ✓' : 'No pure sequence yet') + ' · ' + a.seq + ' seq · ' + a.penalty + ' pts unmatched';
      v.myGroups = a.melds.map(function (m) { return m.idx.map(function (q) { return self.players[viewer].hand[q].id; }); });
    }
    v.buttons = v.legal.filter(function (x) { return x.label; });
    return v;
  };
  RM.scoreboard = function (viewer) {
    var self = this;
    var mine = this.players[viewer] ? rummyArrange(this.players[viewer].hand, this.wild) : null;
    return { title: this.o.rummyFormat === 'deals' ? 'Penalty points' : 'Rummy', rows: this.players.map(function (pl) {
      return { label: pl.name, p: pl.id, value: pl.out ? 'Dropped' : pl.hand.length + ' cards', sub: (pl.score ? 'Total ' + pl.score : '') + (pl.id === viewer && mine ? (pl.score ? ' · ' : '') + 'your unmatched ' + mine.penalty : ''), bad: pl.out };
    }), foot: 'Wild: every ' + this.wild + ' · deck ' + this.closed.length + (this.o.rummyFormat === 'deals' ? ' · deal ' + this.round + '/' + this.o.rounds : '') };
  };

  /* ================================================================== */
  /* TWENTY-NINE (29)                                                    */
  /* ================================================================== */
  var R29 = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  var POW29 = { J: 8, '9': 7, A: 6, '10': 5, K: 4, Q: 3, '8': 2, '7': 1 };
  var PTS29 = { J: 3, '9': 2, A: 1, '10': 1 };
  function pts29(c) { return PTS29[c.r] || 0; }
  function TwentyNine(id, o, s, r) {
    Base.call(this, id, o, s, r);
    this.players.forEach(function (p) { p.team = p.id % 2; });
    this.gamePts = [0, 0];
    this.startRound();
  }
  var TN = inherit(TwentyNine);
  TN.teamName = function (t) { return this.pname(t) + ' & ' + this.pname(t + 2); };
  TN.startRound = function () {
    var self = this;
    this.round++;
    this.players.forEach(function (p) { p.hand = []; p.tag = ''; });
    var d = this.deck(1).filter(function (c) { return R29.indexOf(c.r) >= 0; });
    this.stock = d;
    this.trick = []; this.wonPiles = [[], []]; this.points = [0, 0]; this.tricksPlayed = 0;
    this.trump = null; this.bid = null; this.bidder = null; this.passed = {};
    var order = [];
    for (var k = 0; k < 4; k++) for (var q = 1; q <= 4; q++) { var p = (this.dealer + q) % 4; var c = this.stock.pop(); this.players[p].hand.push(c); order.push([p, c.id]); }
    this.players.forEach(function (pl) { self.sort29(pl.id); });
    this.emit({ t: 'deal', order: order, dealer: this.dealer, round: this.round });
    this.leader = (this.dealer + 1) % 4;
    this.current = this.leader;
    this.dealer = (this.dealer + 1) % 4;
    this.phase = 'bid';
    this.note('Deal ' + this.round + ' of 29: four cards each - bidding starts at 16.');
  };
  TN.sort29 = function (p) {
    var o = { S: 0, H: 1, C: 2, D: 3 };
    this.players[p].hand.sort(function (a, b) { return o[a.s] - o[b.s] || POW29[b.r] - POW29[a.r]; });
  };
  TN.legalFor = function (p) {
    var self = this;
    if (this.phase === 'collect') return [{ type: 'collect', key: 'collect' }];
    if (this.phase === 'bid') {
      var lo = this.bid ? this.bid + 1 : 16, out = [];
      for (var b = lo; b <= 28 && out.length < 6; b++) out.push({ type: 'bid', value: b, key: 'bid' + b, label: 'Bid ' + b });
      if (out.length && out[out.length - 1].value !== 28) out.push({ type: 'bid', value: 28, key: 'bid28', label: 'Bid 28' });
      // somebody has to take it: the last player can't pass if nobody has bid
      var others = [0, 1, 2, 3].filter(function (q) { return q !== p && !self.passed[q]; });
      if (this.bid || others.length) out.push({ type: 'pass', key: 'pass', label: 'Pass' });
      return out;
    }
    if (this.phase === 'trump') {
      var suits = {};
      this.players[p].hand.forEach(function (c) { suits[c.s] = true; });
      return SUITS.filter(function (s) { return suits[s]; }).map(function (s) { return { type: 'trump', suit: s, key: 't' + s, label: SYM[s] + ' ' + SUIT_NAME[s] }; });
    }
    var h = this.players[p].hand, cards = h;
    if (this.trick.length) { var led = this.trick[0].c.s; var f = h.filter(function (c) { return c.s === led; }); if (f.length) cards = f; }
    return cards.map(function (c) { return { type: 'play', cardId: c.id, key: 'p' + c.id }; });
  };
  TN.autoNext = function () { return this.phase === 'collect' ? { type: 'collect', key: 'collect' } : null; };
  TN.nextBidder = function (p) { for (var k = 1; k <= 4; k++) { var q = (p + k) % 4; if (!this.passed[q]) return q; } return p; };
  TN.on_bid = function (p, a) {
    this.bid = a.value; this.bidder = p;
    this.emit({ t: 'bid', p: p, value: a.value });
    this.note(this.pname(p) + ' bids ' + a.value + '.');
    if (a.value >= 28) return this.wonBid();
    var q = this.nextBidder(p);
    if (q === p) return this.wonBid();
    this.current = q;
  };
  TN.on_pass = function (p) {
    this.passed[p] = true;
    this.emit({ t: 'pass', p: p });
    this.note(this.pname(p) + ' passes.');
    var left = [0, 1, 2, 3].filter(function (q) { return !this.passed[q]; }, this);
    if (left.length === 1 && this.bid != null && left[0] === this.bidder) return this.wonBid();
    this.current = this.nextBidder(p);
  };
  TN.wonBid = function () {
    this.phase = 'trump';
    this.current = this.bidder;
    this.note(this.teamName(this.bidder % 2) + ' must make ' + this.bid + '. ' + this.pname(this.bidder) + ' chooses trump.');
  };
  TN.on_trump = function (p, a) {
    var self = this;
    this.trump = a.suit;
    this.emit({ t: 'trump', p: p, suit: a.suit });
    this.note(this.pname(p) + ' makes ' + SUIT_NAME[a.suit] + ' trump.');
    var order = [];
    for (var k = 0; k < 4; k++) for (var q = 0; q < 4; q++) { var pp = (this.leader + q) % 4; var c = this.stock.pop(); this.players[pp].hand.push(c); order.push([pp, c.id]); }
    this.players.forEach(function (pl) { self.sort29(pl.id); });
    this.emit({ t: 'deal', order: order, more: true });
    this.phase = 'play';
    this.current = this.leader;
  };
  TN.beats = function (x, b, led) {
    var tr = this.trump;
    if (x.s === tr && b.s !== tr) return true;
    if (x.s !== b.s) return false;
    return POW29[x.r] > POW29[b.r];
  };
  TN.on_play = function (p, a) {
    var c = this.take(p, a.cardId), self = this;
    this.trick.push({ p: p, c: c });
    this.emit({ t: 'play', p: p, id: c.id, face: { s: c.s, r: c.r } });
    if (this.trick.length < 4) { this.current = (p + 1) % 4; return; }
    var led = this.trick[0].c.s, best = this.trick[0];
    this.trick.forEach(function (t) { if (self.beats(t.c, best.c, led)) best = t; });
    if (best.c.s === this.trump && led !== this.trump) this.emit({ t: 'cut', p: best.p });
    this.winner = best.p;
    this.phase = 'collect';
    this.current = best.p;
  };
  TN.on_collect = function () {
    var w = this.winner, team = w % 2, self = this;
    var pts = sum(this.trick.map(function (t) { return pts29(t.c); }));
    this.tricksPlayed++;
    if (this.tricksPlayed === 8 && this.o.lastTrick !== false) pts += 1;
    this.points[team] += pts;
    this.trick.forEach(function (t) { self.wonPiles[team].push(t.c); });
    this.emit({ t: 'trickWon', p: w, ids: this.trick.map(function (t) { return t.c.id; }) });
    this.note(this.pname(w) + ' wins the trick' + (pts ? ' (+' + pts + ')' : '') + '.');
    this.trick = [];
    if (this.tricksPlayed === 8) return this.endDeal();
    this.phase = 'play';
    this.current = w;
  };
  TN.endDeal = function () {
    var self = this, bt = this.bidder % 2, made = this.points[bt] >= this.bid;
    this.gamePts[bt] += made ? 1 : -1;
    this.players.forEach(function (pl) { pl.score = self.gamePts[pl.team]; });
    var winners = made ? [bt, bt + 2] : [1 - bt, 3 - bt];
    this.finishRound(this.teamName(bt) + (made ? ' make their bid of ' + this.bid + ' with ' + this.points[bt] + ' points!' : ' fall short: ' + this.points[bt] + ' of ' + this.bid + '.'), winners, null, { made: made });
  };
  TN.view = function (viewer) {
    var self = this, led = this.trick.length ? this.trick[0].c.s : null;
    var zones = [P.trickZone(this, this.trump ? 'Trump ' + SYM[this.trump] : (this.bid ? 'Bid ' + this.bid : 'Bidding'))];
    [0, 1].forEach(function (t) { zones.push({ id: 'won' + t, type: 'won', p: t, label: self.points[t] + ' pts', cards: self.wonPiles[t].slice(-4).map(function (c) { return { id: c.id, a: null, b: 'back' }; }) }); });
    var mine = viewer === this.actor();
    return this.baseView(viewer, {
      zones: zones, trump: this.trump, teams: true,
      status: this.phase === 'bid' ? this.statusFor(viewer, this.bid ? 'Bid more than ' + this.bid + ' or pass' : 'Open the bidding (16 or more)', 'is bidding…')
        : this.phase === 'trump' ? this.statusFor(viewer, 'Choose trump from your four cards', 'is choosing trump…')
          : this.statusFor(viewer, led ? 'Your turn - follow ' + SYM[led] + ' if you can' : 'Your lead', 'is playing…'),
      prompt: mine && (this.phase === 'bid' || this.phase === 'trump') ? { title: this.phase === 'bid' ? 'Your bid' : 'Choose trump', text: this.phase === 'bid' ? 'Points in play: J=3, 9=2, A=1, 10=1' + (this.o.lastTrick !== false ? ', last trick 1 (29 in all)' : ' (28 in all)') + '.' : '', options: this.legalFor(viewer).map(function (a) { return { label: a.label, action: a, suit: a.suit }; }) } : null
    });
  };
  TN.scoreboard = function () {
    var self = this;
    return { title: this.bid ? 'Contract ' + this.bid : 'Twenty-Nine', rows: [0, 1].map(function (t) {
      return { label: self.teamName(t), side: t, value: self.points[t] + ' pts', sub: 'Game points ' + self.gamePts[t] + (self.bidder != null && self.bidder % 2 === t ? ' · bidding team' : '') };
    }), foot: (this.trump ? 'Trump ' + SYM[this.trump] : 'No trump yet') + ' · Deal ' + this.round + '/' + this.o.rounds };
  };

  /* ================================================================== */
  /* CPU players                                                         */
  /* ================================================================== */
  function face(v, id) { var me = v.players[v.me]; var c = me.hand.filter(function (x) { return x.id === id; })[0]; return c && c.a; }
  function pick(list, score) { var best = null, bs = -Infinity; list.forEach(function (x) { var s = score(x); if (s > bs) { bs = s; best = x; } }); return best; }
  function byType(v) { var t = {}; (v.legal || []).forEach(function (a) { (t[a.type] = t[a.type] || []).push(a); }); return t; }
  function boardOf(v) { var z = (v.zones || []).filter(function (z) { return z.id === 'board'; })[0]; return z ? z.items.map(function (it) { return it.cv.a; }) : []; }
  var DECIDE = {
    holdem: function (v, mem, rnd, noise) {
      var T = byType(v);
      if (T.collect) return T.collect[0];
      if (T.street) return T.street[0];
      var me = v.players[v.me], hole = me.hand.map(function (c) { return c.a; }).filter(Boolean), board = boardOf(v);
      var s;
      if (board.length < 3) {
        var a = hi(hole[0].r), b = hi(hole[1].r), top = Math.max(a, b), lowc = Math.min(a, b);
        s = a === b ? 0.5 + a / 28 : (top + lowc) / 40 + (hole[0].s === hole[1].s ? 0.06 : 0) + (top - lowc === 1 ? 0.05 : 0) + (top === 14 ? 0.08 : 0);
      } else {
        var r = bestHand(hole.concat(board));
        s = 0.18 + r[0] * 0.11 + (r[1] || 0) / 140;
        var suits = {}; hole.concat(board).forEach(function (c) { suits[c.s] = (suits[c.s] || 0) + 1; });
        if (board.length < 5 && Object.keys(suits).some(function (k) { return suits[k] === 4; })) s += 0.12;
        // a pair only on the board isn't mine
        if (r[0] === 1 && board.length >= 3 && bestHand(board.concat(board.length < 5 ? [] : [])) && hole.every(function (h) { return !board.some(function (bc) { return bc.r === h.r; }); }) && hole[0].r !== hole[1].r) s -= 0.12;
      }
      s += (rnd() - 0.5) * noise * 0.04;
      var call = T.call ? T.call[0] : null, toCall = call ? call.amount : 0;
      var potZ = (v.zones || []).filter(function (z) { return z.type === 'pot'; })[0], pot = potZ ? potZ.amount : 0;
      var odds = toCall / Math.max(1, pot + toCall);
      if (s > 0.78 && T.raise && rnd() < 0.7) return T.raise[T.raise.length - 1];
      if (s > 0.62 && T.raise && rnd() < 0.45) return T.raise[0];
      if (T.check) return (s > 0.55 && T.raise && rnd() < 0.35) ? T.raise[0] : T.check[0];
      if (call && (s > odds + 0.18 || (toCall <= 0.04 * me.score && s > 0.3))) return call;
      if (s > 0.9 && T.allin) return T.allin[0];
      return T.fold ? T.fold[0] : (call || v.legal[0]);
    },
    blackjack: function (v, mem, rnd) {
      var T = byType(v);
      if (T.dealerStep) return T.dealerStep[0];
      if (T.bet) return T.bet[Math.min(T.bet.length - 1, rnd() < 0.6 ? 0 : 1)];
      var me = v.players[v.me], h = me.hand.map(function (c) { return c.a; }).filter(Boolean), hv = bjValue(h);
      var dz = (v.zones || []).filter(function (z) { return z.id === 'dealer'; })[0];
      var up = dz && dz.items[0] && dz.items[0].cv.a ? bjValue([dz.items[0].cv.a]).total : 10;
      // simplified basic strategy
      if (T.double && !hv.soft && (hv.total === 11 || (hv.total === 10 && up <= 9) || (hv.total === 9 && up >= 3 && up <= 6))) return T.double[0];
      if (hv.soft) return hv.total <= 17 || (hv.total === 18 && up >= 9) ? T.hit[0] : T.stand[0];
      if (hv.total <= 11) return T.hit[0];
      if (hv.total === 12) return up >= 4 && up <= 6 ? T.stand[0] : T.hit[0];
      if (hv.total <= 16) return up <= 6 ? T.stand[0] : T.hit[0];
      return T.stand[0];
    },
    rummy: function (v, mem, rnd) {
      var T = byType(v);
      if (T.declare) return T.declare[0];
      var me = v.players[v.me], hand = me.hand.map(function (c) { return { id: c.id, s: c.a.s, r: c.a.r }; }), wild = v.wild;
      var best1 = function (cards) {
        // the lowest unmatched points after throwing one card away
        var b = null;
        cards.forEach(function (c, i) {
          var rest = cards.slice(0, i).concat(cards.slice(i + 1));
          var a = rummyArrange(rest, wild);
          var sc = a.deadwood * 10 - (a.pure ? 40 : 0) - Math.min(a.seq, 2) * 8 - rummyPts(c, wild) * 0.5;
          if (!b || sc < b.sc) b = { sc: sc, card: c };
        });
        return b;
      };
      if (T.drawDeck) {
        var oz = (v.zones || []).filter(function (z) { return z.id === 'open'; })[0];
        var top = oz && oz.cards.length ? oz.cards[oz.cards.length - 1] : null;
        if (top && T.drawOpen) {
          var withTop = best1(hand.concat([{ id: top.id, s: top.a.s, r: top.a.r }]));
          var now = rummyArrange(hand, wild);
          var nowSc = now.deadwood * 10 - (now.pure ? 40 : 0) - Math.min(now.seq, 2) * 8;
          if (withTop.card.id !== top.id && withTop.sc < nowSc - 25) return T.drawOpen[0];
          if (top.a.r === wild) return T.drawOpen[0];
        }
        return T.drawDeck[0];
      }
      var b = best1(hand);
      return (T.discard || []).filter(function (a) { return a.cardId === b.card.id; })[0] || v.legal[0];
    },
    twentynine: function (v, mem, rnd, noise) {
      var T = byType(v);
      if (T.collect) return T.collect[0];
      var me = v.players[v.me], hand = me.hand.map(function (c) { return c.a; }).filter(Boolean);
      if (T.bid || (T.pass && !T.play)) {
        var est = 13 + sum(hand.map(pts29)) * 2 + hand.filter(function (c) { return c.r === 'J'; }).length * 2 + (noise - 2) * (rnd() - 0.5);
        var bids = T.bid || [];
        var ok = bids.filter(function (a) { return a.value <= est; });
        if (ok.length && (!T.pass || rnd() < 0.85)) return ok[0];
        return T.pass ? T.pass[0] : bids[0];
      }
      if (T.trump) {
        var cnt = {}; hand.forEach(function (c) { cnt[c.s] = (cnt[c.s] || 0) + 1 + POW29[c.r] / 10; });
        return pick(T.trump, function (a) { return cnt[a.suit] || 0; });
      }
      var tz = (v.zones || []).filter(function (z) { return z.type === 'trick'; })[0], cards = tz ? tz.cards : [];
      var tr = v.trump, led = cards.length ? cards[0].cv.a.s : null, win = null;
      cards.forEach(function (t) {
        var x = t.cv.a, b = win && win.cv.a;
        if (!win || (x.s === tr && b.s !== tr) || (x.s === b.s && POW29[x.r] > POW29[b.r])) win = t;
      });
      var partnerWins = win && win.p % 2 === v.me % 2;
      return pick(T.play, function (a) {
        var f = face(v, a.cardId), pw = POW29[f.r], pt = pts29(f);
        if (!led) return pw + (f.s === tr ? -6 : 0) + rnd() * noise * 0.3;
        var beats = win && ((f.s === tr && win.cv.a.s !== tr) || (f.s === win.cv.a.s && pw > POW29[win.cv.a.r]));
        if (partnerWins) return pt * 3 - pw * 0.2 - (f.s === tr ? 6 : 0);           // feed points to the partner
        if (beats) return 20 - pw + (f.s === tr ? -2 : 0);                          // win as cheaply as possible
        return -pt * 3 - pw * 0.3;                                                  // losing: keep points away
      });
    }
  };

  var CTORS = { holdem: Holdem, blackjack: Blackjack, rummy: Rummy, twentynine: TwentyNine };
  if (P && P.addGames) P.addGames(GAMES, CTORS, DECIDE, OPTS);
  return { GAMES: GAMES, eval5: eval5, bestHand: bestHand, POKER_NAMES: POKER_NAMES, bjValue: bjValue, rummyArrange: rummyArrange, pts29: pts29 };
});
