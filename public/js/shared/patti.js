/*
 * Desi Patti - Indian card games on a standard 52-card deck:
 *   Bhabhi, Bluff, Seep, Satte Pe Satta, Gadha Chor, Teen Patti, Court Piece.
 * Same interface as the UNO engine (act / view / legalActions / takeEvents),
 * registered into UNOEngine so the controller, server and table reuse it.
 * Includes the CPU players for these games. ES5 so it runs on Node 12.
 */
(function (root, factory) {
  var E = typeof module === 'object' && module.exports ? require('./engine.js') : root.UNOEngine;
  var P = factory(E);
  if (typeof module === 'object' && module.exports) module.exports = P;
  root.UNOPatti = P;
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';

  var SUITS = ['S', 'H', 'D', 'C'];
  var RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  var SYM = { S: '♠', H: '♥', D: '♦', C: '♣' };
  var SUIT_NAME = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
  var RANK_WORD = { A: 'Ace', K: 'King', Q: 'Queen', J: 'Jack' };
  function hi(r) { return RANKS.indexOf(r) + 2; }                                // 2..14, ace high
  function low(r) { return r === 'A' ? 1 : (r === 'J' ? 11 : r === 'Q' ? 12 : r === 'K' ? 13 : +r); } // ace low 1..13
  function red(s) { return s === 'H' || s === 'D'; }
  function cname(c) { return c.r + SYM[c.s]; }
  function plural(r, n) { var w = RANK_WORD[r] || r; return n + ' × ' + w + (n > 1 ? (r === '6' ? 'es' : 's') : ''); }
  function shuffle(a, rnd) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function assign(t) { for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; if (s) for (var k in s) t[k] = s[k]; } return t; }
  function rndFn(r) { return r || function () { return Math.random(); }; }

  /* ================================================================== */
  /* catalogue                                                           */
  /* ================================================================== */
  var OPTS = {
    rounds: { label: 'Rounds', type: 'number', min: 1, max: 15, step: 1 },
    decks: { label: 'Decks', type: 'select', choices: [['1', '1 deck (52 cards)'], ['2', '2 decks (104 cards)']] },
    chips: { label: 'Starting chips', type: 'number', min: 100, max: 100000, step: 100 },
    boot: { label: 'Boot (entry) amount', type: 'number', min: 1, max: 1000, step: 1 },
    potLimit: { label: 'Pot limit (forces a show)', type: 'number', min: 100, max: 1000000, step: 100 },
    sideShow: { label: 'Allow side show', type: 'bool' },
    // Bhabhi house rule: what happens when a player's final card can't be beaten by the next player
    lastCard: { label: 'Last card must be beaten', type: 'select', choices: [['trick', 'On - next player takes the trick'], ['card', 'On - next player takes that card'], ['off', 'Off (classic)']] }
  };
  /*
   * Bhabhi rule settings, kept in one place because the game has many regional variations.
   *  - ranks: the existing order, 2 low ... Ace high (hi()).
   *  - a "beat" is a card of the suit that was led, ranked higher than the final card played.
   *    A player with none of the led suit is not facing the rule: they throw a thulla as usual.
   *  - lastCard 'trick': the responder picks up every card on the table and leads next.
   *    lastCard 'card': the responder takes only the final card, then plays on in the same trick.
   *    lastCard 'off': classic - a player who empties their hand is safe once the trick ends.
   */
  var COMMON = ['rounds', 'turnTimer'];
  var GAMES = {
    bhabhi: { id: 'bhabhi', universe: 'desi', name: 'Bhabhi', short: 'Bhabhi', players: [3, 8], accent: '#c1121f', sig: { s: 'S', r: 'A' },
      tagline: 'Follow suit or slip in a "thulla" - the last one left holding cards is the Bhabhi!',
      defaults: { rounds: 1, lastCard: 'trick', turnTimer: 30 }, options: ['rounds', 'lastCard', 'turnTimer'] },
    bluff: { id: 'bluff', universe: 'desi', name: 'Bluff', short: 'Bluff', players: [3, 8], accent: '#7b2cbf', sig: { s: 'H', r: 'K' },
      tagline: 'Play cards face-down, claim a rank and lie with a straight face. "Bluff!"',
      defaults: { rounds: 1, decks: '1', turnTimer: 30 }, options: ['rounds', 'decks', 'turnTimer'] },
    seep: { id: 'seep', universe: 'desi', name: 'Seep (Sweep)', short: 'Seep', players: [2, 4], allowed: [2, 4], accent: '#2a9d8f', sig: { s: 'D', r: '10' },
      tagline: 'Build houses, capture by value and sweep the floor clean for 50 points.',
      defaults: { rounds: 1, turnTimer: 45 }, options: COMMON,
      // turn pacing (ms): CPUs think a little longer, and every move gets a beat to settle on the table
      pace: { botDelay: 1100, settle: 450 } },
    sevens: { id: 'sevens', universe: 'desi', name: 'Satte Pe Satta', short: 'Satte Pe Satta', players: [3, 8], accent: '#e76f51', sig: { s: 'H', r: '7' },
      tagline: 'Sevens open the rows - build each suit up and down. First to empty the hand wins.',
      defaults: { rounds: 1, turnTimer: 30 }, options: COMMON },
    gadha: { id: 'gadha', universe: 'desi', name: 'Gadha Chor', short: 'Gadha Chor', players: [3, 8], accent: '#6c757d', sig: { s: 'C', r: 'Q' },
      tagline: 'Pull cards from your neighbour, throw away pairs - don\'t be the Gadha left with the odd card!',
      defaults: { rounds: 1, turnTimer: 30 }, options: COMMON },
    teenpatti: { id: 'teenpatti', universe: 'desi', name: 'Teen Patti', short: 'Teen Patti', players: [2, 7], accent: '#d4a017', sig: { s: 'S', r: 'K' },
      tagline: 'Three cards, blind or seen, chaal or pack. Points only - no real money.',
      defaults: { rounds: 5, chips: 1000, boot: 10, potLimit: 2000, sideShow: true, turnTimer: 30 }, options: ['rounds', 'chips', 'boot', 'potLimit', 'sideShow', 'turnTimer'] },
    courtpiece: { id: 'courtpiece', universe: 'desi', name: 'Court Piece (Rang)', short: 'Court Piece', players: [4, 4], accent: '#264653', sig: { s: 'D', r: 'J' },
      tagline: 'Teams of two, one trump suit, 13 tricks. First team to 7 wins - take all 7 for a Kot!',
      defaults: { rounds: 5, turnTimer: 30 }, options: COMMON }
  };
  Object.keys(GAMES).forEach(function (id) { GAMES[id].fixed = {}; });

  /* ================================================================== */
  /* shared base                                                         */
  /* ================================================================== */
  function Base(id, opts, seats, rnd) {
    this.V = GAMES[id];
    this.vid = id;
    this.o = assign({}, this.V.defaults, opts || {});
    this.o.rounds = Math.max(1, Math.min(15, +this.o.rounds || 1));
    this.rnd = rndFn(rnd);
    this.players = seats.map(function (s, i) {
      return { id: i, name: s.name || ('Player ' + (i + 1)), kind: s.kind || 'human', level: s.level || 'normal', avatar: s.avatar || null, hand: [], out: false, score: 0, tag: '' };
    });
    this.events = [];
    this.log = [];
    this.round = 0;
    this.turnNo = 0;
    this.dealer = Math.floor(this.rnd() * this.players.length);
    this.idc = 0;
    this.idp = 'p' + Math.floor(this.rnd() * 1e6).toString(36);
    this.gameOver = false;
    this.phase = 'deal';
    this.current = 0;
    this.roundResult = null;
  }
  var B = Base.prototype;
  B.newId = function () { this.idc++; return this.idp + '_' + this.idc.toString(36); };
  B.emit = function (e) { this.events.push(e); };
  B.takeEvents = function () { var e = this.events; this.events = []; return e; };
  B.note = function (t) { this.log.push(t); if (this.log.length > 60) this.log.shift(); this.emit({ t: 'log', text: t }); };
  B.pname = function (p) { return this.players[p] ? this.players[p].name : '?'; };
  B.deck = function (n) {
    var d = [];
    for (var k = 0; k < (n || 1); k++) SUITS.forEach(function (s) { RANKS.forEach(function (r) { d.push({ s: s, r: r }); }); });
    shuffle(d, this.rnd);
    var self = this;
    d.forEach(function (c) { c.id = self.newId(); });
    return d;
  };
  B.next = function (i, pred) {
    var n = this.players.length;
    for (var k = 1; k <= n; k++) {
      var j = (i + k) % n;
      if (!pred || pred(this.players[j])) return j;
    }
    return i;
  };
  B.take = function (p, id) {
    var h = this.players[p].hand;
    for (var i = 0; i < h.length; i++) if (h[i].id === id) return h.splice(i, 1)[0];
    return null;
  };
  B.find = function (p, id) { return this.players[p].hand.filter(function (c) { return c.id === id; })[0]; };
  B.sortHand = function (p) {
    var order = { S: 0, H: 1, C: 2, D: 3 };
    this.players[p].hand.sort(function (a, b) { return order[a.s] - order[b.s] || hi(a.r) - hi(b.r); });
  };
  B.dealAll = function (cards, start) {
    var order = [];
    var n = this.players.length;
    var i = 0;
    var self = this;
    cards.forEach(function (c) {
      var p = (start + i) % n;
      self.players[p].hand.push(c);
      order.push([p, c.id]);
      i++;
    });
    this.players.forEach(function (pl) { self.sortHand(pl.id); });
    return order;
  };
  B.cv = function (c, visible) { return { id: c.id, a: visible ? { s: c.s, r: c.r } : null, b: 'back' }; };
  B.actor = function () { return this.gameOver || this.phase === 'roundOver' ? null : this.current; };
  B.waitingOn = function () {
    if (this.phase === 'roundOver') return this.players.filter(function (p) { return p.kind !== 'bot'; }).map(function (p) { return p.id; });
    var a = this.actor();
    return a == null ? [] : [a];
  };
  B.autoNext = function () { return null; };
  B.legalFor = function () { return []; };
  B.legalActions = function (p) {
    if (this.gameOver) return [];
    if (this.phase === 'roundOver') return [{ type: 'nextRound', key: 'next' }];
    if (p !== this.actor()) return [];
    return this.legalFor(p);
  };
  B.act = function (p, a) {
    if (this.gameOver) return { ok: false, error: 'Game over' };
    if (!a || !a.type) return { ok: false, error: 'Bad action' };
    try {
      if (a.type === 'nextRound') {
        if (this.phase !== 'roundOver') return { ok: false, error: 'Round not over' };
        this.startRound();
        return { ok: true };
      }
      if (p !== this.actor()) return { ok: false, error: 'Not your turn' };
      var custom = this.validate ? this.validate(p, a) : null;
      if (custom) return custom.ok === false ? custom : this.apply(p, custom);
      var legal = this.legalFor(p);
      var m = legal.filter(function (x) { return x.key === a.key || (!a.key && x.type === a.type && x.cardId === a.cardId && x.target === a.target && x.value === a.value && x.suit === a.suit); })[0];
      if (!m) return { ok: false, error: 'That move isn\'t allowed right now' };
      return this.apply(p, m);
    } catch (err) {
      return { ok: false, error: 'Engine error: ' + err.message };
    }
  };
  B.apply = function (p, a) {
    var fn = this['on_' + a.type];
    if (!fn) return { ok: false, error: 'Unknown move' };
    this.turnNo++;
    fn.call(this, p, a);
    return { ok: true };
  };
  // finish a round: ranking = player ids best -> worst; delta = score changes
  B.finishRound = function (title, winners, delta, extra) {
    var self = this;
    (delta || []).forEach(function (d, i) { self.players[i].score += d || 0; });
    this.phase = 'roundOver';
    var over = this.round >= this.o.rounds || (this.isGameOver && this.isGameOver());
    var best = this.players.slice().sort(function (a, b) { return b.score - a.score; })[0];
    this.roundResult = assign({ winner: winners[0], winners: winners, title: title, delta: delta || [], gameOver: over, champion: best.id }, extra || {});
    this.emit({ t: 'roundEnd', winner: winners[0], gameOver: over });
    this.note(title);
    if (over) { this.gameOver = true; this.emit({ t: 'gameEnd', winner: best.id }); }
  };
  B.baseView = function (viewer, extra) {
    var self = this;
    var reveal = this.phase === 'roundOver';
    return assign({
      engine: 'patti', variant: this.vid, name: this.V.name, options: this.o, round: this.round, rounds: this.o.rounds,
      turnNo: this.turnNo, phase: this.phase, current: this.current, actor: this.actor(), dir: 1, color: null, side: 'light',
      dealer: this.dealer, drawStack: 0, deckCount: 0, discard: [], discardCount: 0, unoPending: null, pend: null, me: viewer,
      players: this.players.map(function (pl) {
        return {
          id: pl.id, name: pl.name, kind: pl.kind, level: pl.level, avatar: pl.avatar, score: pl.score, out: pl.out, declared: false,
          count: pl.hand.length, tag: pl.tag, team: pl.team,
          hand: pl.hand.map(function (c) { return self.cv(c, pl.id === viewer || reveal); })
        };
      }),
      legal: viewer != null && this.players[viewer] ? this.legalActions(viewer) : [],
      zones: [], buttons: [], select: null, prompt: null, status: '',
      roundResult: this.roundResult, gameOver: this.gameOver, log: this.log.slice(-30)
    }, extra || {});
  };
  B.statusFor = function (viewer, mine, theirs) {
    var a = this.actor();
    if (this.phase === 'roundOver') return this.roundResult ? this.roundResult.title : '';
    if (a == null) return '';
    return a === viewer ? mine : this.pname(a) + ' ' + theirs;
  };

  /* ================================================================== */
  /* trick helpers (Bhabhi, Court Piece)                                 */
  /* ================================================================== */
  function trickZone(g, label) {
    return { id: 'trick', type: 'trick', label: label || '', cards: g.trick.map(function (t) { return { p: t.p, cv: g.cv(t.c, true) }; }) };
  }

  /* ================================================================== */
  /* BHABHI                                                              */
  /* ================================================================== */
  function Bhabhi(id, o, s, r) { Base.call(this, id, o, s, r); this.loss = this.players.map(function () { return 0; }); this.startRound(); }
  Bhabhi.prototype = Object.create(B);
  var BH = Bhabhi.prototype;
  BH.startRound = function () {
    var self = this;
    this.round++;
    this.players.forEach(function (p) { p.hand = []; p.out = false; p.tag = ''; });
    this.outPile = [];
    this.trick = [];
    this.result = null;
    this.firstTrick = true;
    this.voids = this.players.map(function () { return {}; }); // suits each player has been seen to lack (public)
    var order = this.dealAll(this.deck(1), this.dealer + 1);
    this.emit({ t: 'deal', order: order, dealer: this.dealer, round: this.round });
    this.dealer = (this.dealer + 1) % this.players.length;
    var lead = 0;
    this.players.forEach(function (pl) { if (pl.hand.some(function (c) { return c.s === 'S' && c.r === 'A'; })) lead = pl.id; });
    this.current = lead;
    this.leader = lead;
    this.phase = 'play';
    this.note('Round ' + this.round + ' of Bhabhi. ' + this.pname(lead) + ' holds the Ace of Spades and leads.');
  };
  BH.active = function () { return this.players.filter(function (p) { return !p.out; }); };
  BH.legalFor = function (p) {
    if (this.phase === 'collect') return [{ type: 'collect', key: 'collect' }];
    var h = this.players[p].hand;
    var cards = h;
    if (this.firstTrick && !this.trick.length) cards = h.filter(function (c) { return c.s === 'S' && c.r === 'A'; });
    else if (this.trick.length) {
      var led = this.trick[0].c.s;
      var follow = h.filter(function (c) { return c.s === led; });
      if (follow.length) cards = follow;
    }
    return cards.map(function (c) { return { type: 'play', cardId: c.id, key: 'p' + c.id }; });
  };
  BH.autoNext = function () { return this.phase === 'collect' ? { type: 'collect', key: 'collect' } : null; };
  BH.on_play = function (p, a) {
    var c = this.take(p, a.cardId);
    var led = this.trick.length ? this.trick[0].c.s : null;
    this.trick.push({ p: p, c: c });
    this.emit({ t: 'play', p: p, id: c.id, face: { s: c.s, r: c.r } });
    var thulla = led && c.s !== led;
    if (thulla) {
      this.voids[p][led] = true;
      this.note(this.pname(p) + ' can\'t follow ' + SUIT_NAME[led] + ' - THULLA with ' + cname(c) + '!');
      this.emit({ t: 'thulla', p: p });
    }
    var playersInTrick = this.trickSize || (this.trickSize = this.active().length);
    if (!thulla && this.trick.length < playersInTrick && this.lastCardCheck(p, c)) return;
    if (thulla || this.trick.length >= playersInTrick) {
      var best = null;
      this.trick.forEach(function (t) { if (t.c.s === (led || c.s) && (!best || hi(t.c.r) > hi(best.c.r))) best = t; });
      this.result = { winner: best.p, pickup: !!thulla };
      this.phase = 'collect';
      this.current = best.p;
      return;
    }
    this.current = this.next(p, function (pl) { return !pl.out; });
    this.firstTrick = this.firstTrick && false;
  };
  // a player has just played their final card: can the next player beat it?
  BH.lastCardCheck = function (p, c) {
    var mode = this.o.lastCard || 'off';
    if (mode === 'off' || this.players[p].hand.length) return false;
    var self = this;
    var played = {};
    this.trick.forEach(function (t) { played[t.p] = true; });
    var q = this.next(p, function (pl) { return !pl.out && !played[pl.id] && pl.hand.length > 0; });
    if (q == null || q === p) return false;
    var led = this.trick[0].c.s;
    var follow = this.players[q].hand.filter(function (x) { return x.s === led; });
    if (!follow.length) return false;                                   // no card of the suit: a normal thulla
    if (follow.some(function (x) { return hi(x.r) > hi(c.r); })) return false;  // they can beat it: play on
    this.result = { winner: q, pickup: true, lastCard: mode, from: p, card: c };
    this.phase = 'collect';
    this.current = q;
    this.note(this.pname(q) + ' can\'t beat ' + this.pname(p) + '\'s last card (' + cname(c) + ') and must take ' + (mode === 'card' ? 'it' : 'the cards') + '.');
    this.emit({ t: 'lastCard', p: q, from: p });
    return true;
  };
  BH.on_collect = function () {
    var self = this;
    var res = this.result;
    if (res.lastCard === 'card') return this.takeLastCard(res);
    var ids = this.trick.map(function (t) { return t.c.id; });
    if (res.pickup) {
      this.trick.forEach(function (t) { self.players[res.winner].hand.push(t.c); delete self.voids[res.winner][t.c.s]; });
      this.sortHand(res.winner);
      this.emit({ t: 'pickup', p: res.winner, ids: ids });
      this.note(this.pname(res.winner) + ' played the highest card and picks up the ' + ids.length + ' cards.');
    } else {
      this.trick.forEach(function (t) { self.outPile.push(t.c); });
      this.emit({ t: 'trickOut', ids: ids });
      this.note('Everyone followed suit - the trick goes out.');
    }
    this.trick = [];
    this.trickSize = 0;
    this.firstTrick = false;
    // anybody with no cards left is safe
    this.players.forEach(function (pl) {
      if (!pl.out && !pl.hand.length) { pl.out = true; pl.tag = 'SAFE'; self.emit({ t: 'escape', p: pl.id }); self.note(pl.name + ' is out of cards - safe!'); }
    });
    var left = this.active();
    if (left.length <= 1) return this.endBhabhi(left[0] ? left[0].id : null);
    this.current = this.players[res.winner].out ? this.next(res.winner, function (pl) { return !pl.out; }) : res.winner;
    this.phase = 'play';
  };
  // 'card' mode: the responder takes the final card, the player who played it is safe, and the trick goes on
  BH.takeLastCard = function (res) {
    var self = this;
    var t = this.trick.pop();
    this.players[res.winner].hand.push(t.c);
    this.sortHand(res.winner);
    delete this.voids[res.winner][t.c.s];
    this.emit({ t: 'pickup', p: res.winner, ids: [t.c.id] });
    this.note(this.pname(res.winner) + ' takes ' + cname(t.c) + '.');
    this.trickSize = this.trick.length ? this.trickSize - 1 : 0;
    this.result = null;
    this.players.forEach(function (pl) {
      if (!pl.out && !pl.hand.length) { pl.out = true; pl.tag = 'SAFE'; self.emit({ t: 'escape', p: pl.id }); self.note(pl.name + ' is out of cards - safe!'); }
    });
    var left = this.active();
    if (left.length <= 1) {
      // only the taker is left holding cards: the trick on the table ends with them
      this.trick.forEach(function (x) { self.outPile.push(x.c); });
      this.trick = [];
      return this.endBhabhi(left[0] ? left[0].id : null);
    }
    this.current = res.winner;
    this.phase = 'play';
  };
  BH.endBhabhi = function (loser) {
    if (loser != null) { this.players[loser].tag = 'BHABHI'; this.loss[loser]++; this.emit({ t: 'bhabhi', p: loser }); }
    var delta = this.players.map(function (pl) { return pl.id === loser ? 0 : 1; });
    var winners = this.players.filter(function (pl) { return pl.id !== loser; }).map(function (pl) { return pl.id; });
    this.finishRound(loser != null ? this.pname(loser) + ' is the Bhabhi!' : 'Everyone escaped at once - no Bhabhi this time!', winners, delta, { loser: loser });
  };
  BH.view = function (viewer) {
    var res = this.result;
    var label = this.phase === 'collect' ? (res.lastCard ? this.pname(res.winner) + ' can\'t beat the last card - takes ' + (res.lastCard === 'card' ? 'it' : 'the cards') + '!'
      : res.pickup ? this.pname(res.winner) + ' picks up!' : 'Trick goes out') : (this.trick.length ? 'Follow ' + SUIT_NAME[this.trick[0].c.s] : '');
    var zones = [trickZone(this, label), { id: 'out', type: 'pile', pos: 'side', faceUp: false, label: this.outPile.length ? 'Out · ' + this.outPile.length : '', cards: this.outPile.slice(-8).map(function (c) { return { id: c.id, a: null, b: 'back' }; }) }];
    var led = this.trick.length ? this.trick[0].c.s : null;
    var voids = this.voids.map(function (v) { return Object.keys(v); });
    return this.baseView(viewer, {
      zones: zones,
      voids: voids,
      status: this.statusFor(viewer, this.firstTrick && !this.trick.length ? 'Lead with the Ace of Spades' : (led ? 'Your turn - follow ' + SYM[led] + ' if you can' : 'Your lead - play any card'), 'is playing…')
    });
  };

  /* ================================================================== */
  /* BLUFF                                                               */
  /* ================================================================== */
  function Bluff(id, o, s, r) { Base.call(this, id, o, s, r); this.startRound(); }
  Bluff.prototype = Object.create(B);
  var BL = Bluff.prototype;
  BL.startRound = function () {
    this.round++;
    this.players.forEach(function (p) { p.hand = []; p.out = false; p.tag = ''; });
    this.pile = [];
    this.outPile = [];
    this.claim = null;
    this.last = null;
    this.passes = 0;
    this.reveal = null;
    var order = this.dealAll(this.deck(+this.o.decks === 2 ? 2 : 1), this.dealer + 1);
    this.emit({ t: 'deal', order: order, dealer: this.dealer, round: this.round });
    this.current = (this.dealer + 1) % this.players.length;
    this.dealer = (this.dealer + 1) % this.players.length;
    this.phase = 'play';
    this.note('Round ' + this.round + ' of Bluff. ' + this.pname(this.current) + ' starts.');
  };
  BL.legalFor = function (p) {
    if (this.phase === 'reveal') return [{ type: 'collect', key: 'collect' }];
    var out = [{ type: 'play', key: 'play' }];
    if (this.claim) out.push({ type: 'pass', key: 'pass', label: 'Pass' });
    if (this.last && this.last.p !== p) out.push({ type: 'bluff', key: 'bluff', label: 'Bluff!' });
    return out;
  };
  BL.autoNext = function () { return this.phase === 'reveal' ? { type: 'collect', key: 'collect' } : null; };
  BL.validate = function (p, a) {
    if (a.type !== 'play') return null;
    if (this.phase !== 'play') return { ok: false, error: 'Not now' };
    var ids = a.cardIds || [];
    var max = +this.o.decks === 2 ? 8 : 4;
    if (!ids.length || ids.length > max) return { ok: false, error: 'Play 1 to ' + max + ' cards' };
    var self = this;
    if (ids.some(function (id, i) { return !self.find(p, id) || ids.indexOf(id) !== i; })) return { ok: false, error: 'Those cards are not in your hand' };
    var rank = this.claim || a.rank;
    if (RANKS.indexOf(rank) < 0) return { ok: false, error: 'Announce a rank' };
    return { type: 'play', cardIds: ids, rank: rank };
  };
  BL.on_play = function (p, a) {
    var self = this;
    if (this.escapeCheck(p)) return;
    var cards = a.cardIds.map(function (id) { return self.take(p, id); });
    if (!this.claim) { this.claim = a.rank; this.note(this.pname(p) + ' starts a new pile - claiming ' + plural(a.rank, cards.length) + '.'); }
    else this.note(this.pname(p) + ' adds ' + plural(this.claim, cards.length) + '.');
    cards.forEach(function (c) { self.pile.push(c); });
    this.last = { p: p, cards: cards, rank: this.claim };
    this.passes = 0;
    this.emit({ t: 'bluffPlay', p: p, ids: a.cardIds, n: cards.length, rank: this.claim });
    this.current = this.next(p, function (pl) { return !pl.out; });
  };
  // a player who emptied their hand escapes once the next player lets it stand
  BL.escapeCheck = function (actor) {
    var l = this.last;
    if (l && l.p !== actor && !this.players[l.p].hand.length && !this.players[l.p].out) {
      this.players[l.p].out = true;
      this.players[l.p].tag = 'WINNER';
      this.emit({ t: 'escape', p: l.p });
      this.finishRound(this.pname(l.p) + ' got rid of every card and wins!', [l.p], this.players.map(function (pl) { return pl.id === l.p ? 1 : 0; }));
      return true;
    }
    return false;
  };
  BL.on_pass = function (p) {
    if (this.escapeCheck(p)) return;
    this.passes++;
    this.emit({ t: 'pass', p: p });
    this.note(this.pname(p) + ' passes.');
    var active = this.players.filter(function (pl) { return !pl.out; }).length;
    if (this.passes >= active - 1) {
      var self = this;
      this.pile.forEach(function (c) { self.outPile.push(c); });
      this.emit({ t: 'trickOut', ids: this.pile.map(function (c) { return c.id; }) });
      this.note('Everyone passed - the pile is cleared. ' + this.pname(this.last.p) + ' starts again.');
      this.pile = [];
      this.claim = null;
      this.current = this.last.p;
      this.last = null;
      this.passes = 0;
      return;
    }
    this.current = this.next(p, function (pl) { return !pl.out; });
  };
  BL.on_bluff = function (p) {
    var l = this.last;
    var honest = l.cards.every(function (c) { return c.r === l.rank; });
    var loser = honest ? p : l.p;
    this.reveal = { by: p, target: l.p, honest: honest, loser: loser, ids: l.cards.map(function (c) { return c.id; }) };
    this.emit({ t: 'bluffCall', p: p, target: l.p, honest: honest, faces: l.cards.map(function (c) { return { s: c.s, r: c.r }; }) });
    this.note(this.pname(p) + ' calls BLUFF on ' + this.pname(l.p) + '... ' + (honest ? 'it was the truth! ' + this.pname(p) + ' takes the pile.' : 'caught lying! ' + this.pname(l.p) + ' takes the pile.'));
    this.phase = 'reveal';
    this.current = loser;
  };
  BL.on_collect = function () {
    var self = this;
    var rv = this.reveal;
    this.pile.forEach(function (c) { self.players[rv.loser].hand.push(c); });
    this.sortHand(rv.loser);
    this.emit({ t: 'pickup', p: rv.loser, ids: this.pile.map(function (c) { return c.id; }) });
    this.pile = [];
    this.claim = null;
    this.last = null;
    this.passes = 0;
    this.reveal = null;
    this.phase = 'play';
    // the winner of the challenge starts the next pile (if they emptied their hand, they win)
    var starter = rv.loser === rv.by ? rv.target : rv.by;
    if (!this.players[starter].hand.length) {
      this.players[starter].out = true;
      this.emit({ t: 'escape', p: starter });
      return this.finishRound(this.pname(starter) + ' got rid of every card and wins!', [starter], this.players.map(function (pl) { return pl.id === starter ? 1 : 0; }));
    }
    this.current = starter;
  };
  BL.view = function (viewer) {
    var self = this;
    var rv = this.reveal;
    var pileCards = this.pile.map(function (c) {
      var shown = rv && rv.ids.indexOf(c.id) >= 0;
      return { id: c.id, a: shown ? { s: c.s, r: c.r } : null, b: 'back', up: shown };
    });
    var label = this.claim ? 'Claim: ' + (RANK_WORD[this.claim] || this.claim) + 's · ' + this.pile.length + ' cards' : (this.pile.length ? '' : 'New pile');
    var mine = viewer === this.actor() && this.phase === 'play';
    var max = +this.o.decks === 2 ? 8 : 4;
    return this.baseView(viewer, {
      zones: [
        { id: 'pile', type: 'pile', pos: 'center', faceUp: false, label: label, cards: pileCards, highlight: this.last ? this.last.cards.map(function (c) { return c.id; }) : [] },
        { id: 'out', type: 'pile', pos: 'side', faceUp: false, label: this.outPile.length ? 'Cleared · ' + this.outPile.length : '', cards: this.outPile.slice(-6).map(function (c) { return { id: c.id, a: null, b: 'back' }; }) }
      ],
      claim: this.claim,
      lastPlay: this.last ? { p: this.last.p, n: this.last.cards.length, rank: this.last.rank } : null,
      select: mine ? { min: 1, max: max, action: 'play', needRank: !this.claim, ranks: RANKS, label: this.claim ? 'Play as ' + (RANK_WORD[this.claim] || this.claim) + 's' : 'Play & claim…' } : null,
      status: this.phase === 'reveal' ? (rv.honest ? 'TRUTH! ' + self.pname(rv.by) + ' takes the pile' : 'BLUFF caught! ' + self.pname(rv.target) + ' takes the pile')
        : this.statusFor(viewer, this.claim ? 'Your turn - add ' + (RANK_WORD[this.claim] || this.claim) + 's, pass, or call Bluff' : 'Start a pile: pick 1-' + max + ' cards and claim a rank', 'is deciding…')
    });
  };

  /* ================================================================== */
  /* SATTE PE SATTA (Sevens)                                             */
  /* ================================================================== */
  function Sevens(id, o, s, r) { Base.call(this, id, o, s, r); this.startRound(); }
  Sevens.prototype = Object.create(B);
  var SV = Sevens.prototype;
  SV.startRound = function () {
    var self = this;
    this.round++;
    this.players.forEach(function (p) { p.hand = []; p.out = false; p.tag = ''; });
    this.rows = {};
    this.board = [];
    var order = this.dealAll(this.deck(1), this.dealer + 1);
    this.emit({ t: 'deal', order: order, dealer: this.dealer, round: this.round });
    this.dealer = (this.dealer + 1) % this.players.length;
    this.players.forEach(function (pl) { if (pl.hand.some(function (c) { return c.s === 'H' && c.r === '7'; })) self.current = pl.id; });
    this.phase = 'play';
    this.note('Round ' + this.round + ' - ' + this.pname(this.current) + ' has the 7 of Hearts and opens.');
  };
  SV.playable = function (c) {
    if (!this.board.length) return c.s === 'H' && c.r === '7';
    var row = this.rows[c.s];
    if (!row) return c.r === '7';
    var v = low(c.r);
    return v === row.lo - 1 || v === row.hi + 1;
  };
  SV.legalFor = function (p) {
    var self = this;
    var out = this.players[p].hand.filter(function (c) { return self.playable(c); }).map(function (c) { return { type: 'play', cardId: c.id, key: 'p' + c.id }; });
    if (!out.length) out.push({ type: 'pass', key: 'pass', label: 'Pass' });
    return out;
  };
  SV.on_play = function (p, a) {
    var c = this.take(p, a.cardId);
    var v = low(c.r);
    var row = this.rows[c.s] || (this.rows[c.s] = { lo: 7, hi: 7 });
    row.lo = Math.min(row.lo, v);
    row.hi = Math.max(row.hi, v);
    this.board.push(c);
    this.emit({ t: 'play', p: p, id: c.id, face: { s: c.s, r: c.r } });
    this.note(this.pname(p) + ' plays ' + cname(c) + '.');
    if (!this.players[p].hand.length) {
      this.players[p].tag = 'WINNER';
      var counts = this.players.map(function (pl) { return pl.hand.length; });
      var total = counts.reduce(function (s, n) { return s + n; }, 0);
      return this.finishRound(this.pname(p) + ' played every card and wins!', [p], this.players.map(function (pl) { return pl.id === p ? total : 0; }));
    }
    this.current = this.next(p);
  };
  SV.on_pass = function (p) {
    this.emit({ t: 'pass', p: p });
    this.note(this.pname(p) + ' can\'t play and passes.');
    this.current = this.next(p);
  };
  SV.view = function (viewer) {
    var self = this;
    return this.baseView(viewer, {
      zones: [{ id: 'grid', type: 'grid', cards: this.board.map(function (c) { return self.cv(c, true); }) }],
      status: this.statusFor(viewer, this.legalFor(viewer).some(function (x) { return x.type === 'play'; }) ? 'Your turn - play a glowing card' : 'No card fits - you must pass', 'is playing…')
    });
  };

  /* ================================================================== */
  /* GADHA CHOR                                                          */
  /* ================================================================== */
  function Gadha(id, o, s, r) { Base.call(this, id, o, s, r); this.startRound(); }
  Gadha.prototype = Object.create(B);
  var GC = Gadha.prototype;
  GC.startRound = function () {
    var self = this;
    this.round++;
    this.players.forEach(function (p) { p.hand = []; p.out = false; p.tag = ''; });
    var deck = this.deck(1);
    this.hidden = deck.pop();           // the odd card nobody can pair
    this.pairs = [];
    var order = this.dealAll(deck, this.dealer + 1);
    this.emit({ t: 'deal', order: order, dealer: this.dealer, round: this.round });
    this.dealer = (this.dealer + 1) % this.players.length;
    this.players.forEach(function (pl) { self.discardPairs(pl.id, true); });
    this.players.forEach(function (pl) { if (!pl.hand.length) { pl.out = true; pl.tag = 'SAFE'; } });
    this.current = this.next(this.dealer - 1 < 0 ? this.players.length - 1 : this.dealer - 1, function (pl) { return !pl.out; });
    this.phase = 'pick';
    var alive = this.players.filter(function (pl) { return !pl.out; });
    if (alive.length <= 1) {
      var g0 = alive[0];
      if (g0) { g0.tag = 'GADHA'; this.emit({ t: 'gadha', p: g0.id }); }
      return this.finishRound(g0 ? g0.name + ' is the Gadha!' : 'Round over', this.players.filter(function (pl) { return pl !== g0; }).map(function (pl) { return pl.id; }), this.players.map(function (pl) { return pl === g0 ? 0 : 1; }), { loser: g0 ? g0.id : null });
    }
    this.note('Round ' + this.round + ' of Gadha Chor. One card is hidden - its partner is the Gadha card!');
  };
  function pairKey(c) { return c.r + (red(c.s) ? 'r' : 'b'); }
  GC.discardPairs = function (p, quiet) {
    var self = this;
    var h = this.players[p].hand;
    var seen = {};
    var gone = [];
    h.slice().forEach(function (c) {
      var k = pairKey(c);
      if (seen[k]) { gone.push(seen[k], c); delete seen[k]; } else seen[k] = c;
    });
    if (!gone.length) return 0;
    this.players[p].hand = h.filter(function (c) { return gone.indexOf(c) < 0; });
    gone.forEach(function (c) { self.pairs.push(c); });
    this.emit({ t: 'pairs', p: p, ids: gone.map(function (c) { return c.id; }) });
    if (!quiet) this.note(this.pname(p) + ' throws away a pair (' + gone.map(cname).join(' + ') + ').');
    return gone.length / 2;
  };
  GC.target = function (p) { return this.next(p, function (pl) { return !pl.out; }); };
  GC.legalFor = function (p) {
    var t = this.target(p);
    return this.players[t].hand.map(function (c, i) { return { type: 'pick', target: t, cardId: c.id, index: i, key: 'k' + c.id }; });
  };
  GC.on_pick = function (p, a) {
    var t = a.target;
    var c = this.take(t, a.cardId);
    this.players[p].hand.push(c);
    this.emit({ t: 'pick', p: p, from: t, id: c.id });
    this.note(this.pname(p) + ' pulls a card from ' + this.pname(t) + '.');
    this.discardPairs(p);
    shuffle(this.players[p].hand, this.rnd);
    this.sortHand(p);
    shuffle(this.players[t].hand, this.rnd);
    var self = this;
    [p, t].forEach(function (q) {
      var pl = self.players[q];
      if (!pl.out && !pl.hand.length) { pl.out = true; pl.tag = 'SAFE'; self.emit({ t: 'escape', p: q }); self.note(pl.name + ' has no cards left - safe!'); }
    });
    var left = this.players.filter(function (pl) { return !pl.out; });
    if (left.length <= 1) {
      var g = left[0];
      if (g) { g.tag = 'GADHA'; this.emit({ t: 'gadha', p: g.id }); }
      return this.finishRound(g ? g.name + ' is left holding ' + cname(g.hand[0]) + ' - GADHA!' : 'Round over', this.players.filter(function (pl) { return !g || pl.id !== g.id; }).map(function (pl) { return pl.id; }),
        this.players.map(function (pl) { return g && pl.id === g.id ? 0 : 1; }), { loser: g ? g.id : null });
    }
    this.current = this.players[t].out ? this.next(p, function (pl) { return !pl.out; }) : t;
    if (this.current === p) this.current = this.next(p, function (pl) { return !pl.out; });
  };
  GC.view = function (viewer) {
    var self = this;
    var reveal = this.phase === 'roundOver';
    var t = this.actor() != null ? this.target(this.actor()) : null;
    return this.baseView(viewer, {
      zones: [
        { id: 'pairs', type: 'pile', pos: 'side', faceUp: true, label: this.pairs.length ? 'Pairs · ' + this.pairs.length / 2 : '', cards: this.pairs.slice(-10).map(function (c) { return self.cv(c, true); }) },
        { id: 'hidden', type: 'pile', pos: 'left', faceUp: reveal, label: reveal ? 'Hidden card' : 'Hidden', cards: [this.cv(this.hidden, reveal)] }
      ],
      pickFrom: viewer === this.actor() ? t : null,
      status: this.statusFor(viewer, 'Your turn - pick a card from ' + (t != null ? this.pname(t) : '') + '\'s hand', 'is picking a card…')
    });
  };

  /* ================================================================== */
  /* TEEN PATTI                                                          */
  /* ================================================================== */
  function handRank(cards) {
    var v = cards.map(function (c) { return hi(c.r); }).sort(function (a, b) { return b - a; });
    var flush = cards[0].s === cards[1].s && cards[1].s === cards[2].s;
    var seq = (v[0] - v[1] === 1 && v[1] - v[2] === 1);
    var a23 = v[0] === 14 && v[1] === 3 && v[2] === 2;
    var seqVal = 0;
    if (seq) seqVal = v[0] === 14 ? 15 : v[0];      // A-K-Q is the best run
    if (a23) seqVal = 14.5;                           // A-2-3 second best
    if (v[0] === v[1] && v[1] === v[2]) return { cat: 6, name: 'Trail', key: [v[0]] };
    if (seqVal && flush) return { cat: 5, name: 'Pure Sequence', key: [seqVal] };
    if (seqVal) return { cat: 4, name: 'Sequence', key: [seqVal] };
    if (flush) return { cat: 3, name: 'Colour', key: v };
    if (v[0] === v[1] || v[1] === v[2]) {
      var pr = v[1], kick = v[0] === v[1] ? v[2] : v[0];
      return { cat: 2, name: 'Pair', key: [pr, kick] };
    }
    return { cat: 1, name: 'High Card', key: v };
  }
  function cmpHands(a, b) {
    var A = handRank(a), Bh = handRank(b);
    if (A.cat !== Bh.cat) return A.cat - Bh.cat;
    for (var i = 0; i < Math.max(A.key.length, Bh.key.length); i++) {
      var d = (A.key[i] || 0) - (Bh.key[i] || 0);
      if (d) return d;
    }
    return 0;
  }
  function TeenPatti(id, o, s, r) {
    Base.call(this, id, o, s, r);
    var chips = +this.o.chips || 1000;
    this.players.forEach(function (p) { p.score = chips; });
    this.startRound();
  }
  TeenPatti.prototype = Object.create(B);
  var TP = TeenPatti.prototype;
  TP.isGameOver = function () { return this.players.filter(function (p) { return p.score > 0; }).length <= 1; };
  TP.startRound = function () {
    var self = this;
    this.round++;
    var boot = +this.o.boot || 10;
    this.pot = 0;
    this.stake = boot;
    this.show = null;
    this.side = null;
    this.players.forEach(function (p) {
      p.hand = []; p.tag = ''; p.seen = false;
      p.out = p.score < boot;            // can't afford the boot: sits out
      if (p.out) p.tag = 'BUST';
    });
    var live = this.players.filter(function (p) { return !p.out; });
    if (live.length < 2) {
      // not enough players can pay the boot - the game is over
      this.o.rounds = this.round;
      var rich = this.players.slice().sort(function (a, b) { return b.score - a.score; })[0];
      this.phase = 'deal';
      return this.finishRound(rich.name + ' wins - nobody else can pay the boot.', [rich.id], null);
    }
    var deck = this.deck(1);
    var order = [];
    for (var k = 0; k < 3; k++) live.forEach(function (p) { var c = deck.pop(); p.hand.push(c); order.push([p.id, c.id]); });
    live.forEach(function (p) { p.score -= boot; self.pot += boot; });
    this.emit({ t: 'deal', order: order, dealer: this.dealer, round: this.round });
    this.emit({ t: 'boot', amount: boot, players: live.map(function (p) { return p.id; }) });
    this.dealer = (this.dealer + 1) % this.players.length;
    this.phase = 'bet';
    this.note('Round ' + this.round + ' - boot ' + boot + ' each, pot ' + this.pot + '.');
    // the boot can leave someone on exactly 0 chips: they're all in from the start
    if (live.filter(function (pl) { return pl.score > 0; }).length <= 1) return this.forceShow('everyone still in is all in');
    this.current = this.next(this.dealer - 1, function (pl) { return !pl.out && pl.score > 0; });
  };
  TP.live = function () { return this.players.filter(function (p) { return !p.out && p.tag !== 'PACKED'; }); };
  TP.costs = function (p) {
    var pl = this.players[p];
    var chaal = pl.seen ? this.stake * 2 : this.stake;
    return { chaal: chaal, raise: chaal * 2 };
  };
  TP.legalFor = function (p) {
    var pl = this.players[p];
    if (this.phase === 'sideReply') return [{ type: 'accept', key: 'accept', label: 'Accept side show' }, { type: 'deny', key: 'deny', label: 'Deny' }];
    if (this.phase === 'showdown') return [{ type: 'collect', key: 'collect' }];
    var c = this.costs(p);
    var out = [];
    if (!pl.seen) out.push({ type: 'see', key: 'see', label: 'See cards', style: 'wild' });
    if (pl.score >= c.chaal) out.push({ type: 'chaal', key: 'chaal', amount: c.chaal, label: (pl.seen ? 'Chaal ' : 'Blind ') + c.chaal, style: 'green' });
    if (pl.score >= c.raise && this.stake * 2 <= (+this.o.boot || 10) * 128) out.push({ type: 'raise', key: 'raise', amount: c.raise, label: 'Raise ' + c.raise, style: 'yellow' });
    var live = this.live();
    if (live.length === 2 && pl.score >= c.chaal) out.push({ type: 'show', key: 'show', amount: c.chaal, label: 'Show ' + c.chaal, style: 'blue' });
    var prev = this.prevLive(p);
    if (this.o.sideShow && live.length > 2 && pl.seen && prev != null && this.players[prev].seen && pl.score >= c.chaal) out.push({ type: 'sideshow', key: 'sideshow', target: prev, amount: c.chaal, label: 'Side show ' + c.chaal, style: 'blue' });
    out.push({ type: 'pack', key: 'pack', label: 'Pack', style: 'red' });
    if (pl.score < c.chaal) out = out.filter(function (x) { return x.type === 'pack' || x.type === 'see'; }).concat([{ type: 'allin', key: 'allin', amount: pl.score, label: 'All in ' + pl.score, style: 'yellow' }]);
    return out;
  };
  TP.prevLive = function (p) {
    var n = this.players.length;
    for (var k = 1; k < n; k++) { var j = ((p - k) % n + n) % n; var q = this.players[j]; if (!q.out && q.tag !== 'PACKED') return j; }
    return null;
  };
  TP.autoNext = function () { return this.phase === 'showdown' ? { type: 'collect', key: 'collect' } : null; };
  TP.bet = function (p, amt) {
    amt = Math.min(amt, this.players[p].score);
    this.players[p].score -= amt;
    this.pot += amt;
    this.emit({ t: 'bet', p: p, amount: amt });
    return amt;
  };
  TP.advance = function (p) {
    var live = this.live();
    if (live.length === 1) return this.award([live[0].id], 'everyone else packed');
    if (this.pot >= (+this.o.potLimit || 1e9)) return this.forceShow('the pot limit was reached');
    // players with no chips left are all in and sit the betting out; with nobody left to bet against, show
    if (live.filter(function (pl) { return pl.score > 0; }).length <= 1) return this.forceShow('everyone still in is all in');
    this.current = this.next(p, function (pl) { return !pl.out && pl.tag !== 'PACKED' && pl.score > 0; });
  };
  TP.on_see = function (p) {
    this.players[p].seen = true;
    this.emit({ t: 'see', p: p });
    this.note(this.pname(p) + ' looks at their cards.');
    this.turnNo++;
  };
  TP.on_chaal = function (p) { var a = this.bet(p, this.costs(p).chaal); this.note(this.pname(p) + (this.players[p].seen ? ' plays chaal: ' : ' plays blind: ') + a + '.'); this.advance(p); };
  TP.on_raise = function (p) { var a = this.bet(p, this.costs(p).raise); this.stake *= 2; this.emit({ t: 'raise', p: p }); this.note(this.pname(p) + ' raises to ' + a + '!'); this.advance(p); };
  TP.on_allin = function (p) { var a = this.bet(p, this.players[p].score); this.note(this.pname(p) + ' goes all in with ' + a + '.'); this.advance(p); };
  TP.on_pack = function (p) {
    this.players[p].tag = 'PACKED';
    this.emit({ t: 'pack', p: p });
    this.note(this.pname(p) + ' packs.');
    this.advance(p);
  };
  TP.on_show = function (p) {
    this.bet(p, this.costs(p).chaal);
    this.note(this.pname(p) + ' asks for a SHOW!');
    this.forceShow('a show was called');
  };
  TP.forceShow = function (why) {
    var live = this.live();
    var best = live[0];
    live.forEach(function (pl) { if (cmpHands(pl.hand, best.hand) > 0) best = pl; });
    var ties = live.filter(function (pl) { return cmpHands(pl.hand, best.hand) === 0; });
    this.show = { players: live.map(function (pl) { return pl.id; }), winners: ties.map(function (pl) { return pl.id; }), why: why };
    this.emit({ t: 'showdown', players: this.show.players, winners: this.show.winners });
    this.phase = 'showdown';
    this.current = best.id;
  };
  TP.on_collect = function () { this.award(this.show.winners, this.show.why); };
  TP.on_sideshow = function (p, a) {
    this.bet(p, this.costs(p).chaal);
    this.side = { from: p, to: a.target };
    this.note(this.pname(p) + ' asks ' + this.pname(a.target) + ' for a side show.');
    this.emit({ t: 'sideshow', p: p, target: a.target });
    this.phase = 'sideReply';
    this.current = a.target;
  };
  TP.on_accept = function (p) {
    var sd = this.side;
    var A = this.players[sd.from], Bp = this.players[sd.to];
    var loser = cmpHands(A.hand, Bp.hand) > 0 ? Bp : A;
    loser.tag = 'PACKED';
    this.emit({ t: 'sidecompare', a: sd.from, b: sd.to, loser: loser.id });
    this.note('Side show: ' + this.pname(sd.from) + ' vs ' + this.pname(sd.to) + ' - ' + loser.name + ' loses and packs.');
    this.side = null;
    this.phase = 'bet';
    this.advance(sd.from);
  };
  TP.on_deny = function (p) {
    var sd = this.side;
    this.note(this.pname(p) + ' denies the side show.');
    this.emit({ t: 'deny', p: p });
    this.side = null;
    this.phase = 'bet';
    this.advance(sd.from);
  };
  TP.award = function (winners, why) {
    var self = this;
    var share = Math.floor(this.pot / winners.length);
    winners.forEach(function (w) { self.players[w].score += share; self.players[w].tag = 'WINNER'; });
    this.emit({ t: 'potWon', winners: winners, amount: this.pot });
    var names = winners.map(function (w) { return self.pname(w); }).join(' & ');
    var hand = this.show ? ' with ' + handRank(this.players[winners[0]].hand).name : '';
    var pot = this.pot;
    this.pot = 0;
    this.finishRound(names + ' win' + (winners.length > 1 ? '' : 's') + ' the pot of ' + pot + hand + ' (' + why + ').', winners, null, { pot: pot });
  };
  TP.cv = function (c, visible) { return { id: c.id, a: visible ? { s: c.s, r: c.r } : null, b: 'back' }; };
  TP.view = function (viewer) {
    var self = this;
    var showIds = this.show ? this.show.players : [];
    var v = this.baseView(viewer, {
      zones: [{ id: 'pot', type: 'pot', amount: this.pot, label: 'Pot ' + this.pot, sub: 'Stake ' + this.stake }],
      status: this.phase === 'showdown' ? 'SHOW! ' + this.show.winners.map(function (w) { return self.pname(w); }).join(' & ') + ' win' + (this.show.winners.length > 1 ? '' : 's')
        : this.phase === 'sideReply' ? (viewer === this.current ? this.pname(this.side.from) + ' wants a side show with you' : this.pname(this.current) + ' is deciding on a side show…')
        : this.statusFor(viewer, this.players[viewer] && this.players[viewer].seen ? 'Your turn - chaal, raise, show or pack' : 'Your turn - play blind or see your cards', 'is betting…'),
      chips: true
    });
    // you only see your own cards once you've "seen" them; everybody's are shown at a showdown
    v.players.forEach(function (pv, i) {
      var pl = self.players[i];
      var vis = (i === viewer && pl.seen) || self.phase === 'roundOver' && showIds.indexOf(i) >= 0 || (self.phase === 'showdown' && showIds.indexOf(i) >= 0);
      pv.hand = pl.hand.map(function (c) { return self.cv(c, vis); });
      pv.seen = pl.seen;
      if (!pv.tag) pv.tag = pl.seen ? 'SEEN' : 'BLIND';
      if (self.phase === 'roundOver' || self.phase === 'showdown') { if (showIds.indexOf(i) >= 0) pv.handName = handRank(pl.hand).name; }
    });
    if (viewer != null && this.players[viewer] && this.players[viewer].seen && this.players[viewer].hand.length === 3) v.myHandName = handRank(this.players[viewer].hand).name;
    v.buttons = v.legal.filter(function (a) { return a.label; });
    return v;
  };

  /* ================================================================== */
  /* COURT PIECE (Rang)                                                  */
  /* ================================================================== */
  function CourtPiece(id, o, s, r) {
    Base.call(this, id, o, s, r);
    this.players.forEach(function (p) { p.team = p.id % 2; });
    this.teamScore = [0, 0];
    this.startRound();
  }
  CourtPiece.prototype = Object.create(B);
  var CP = CourtPiece.prototype;
  CP.startRound = function () {
    var self = this;
    this.round++;
    this.players.forEach(function (p) { p.hand = []; p.tag = ''; });
    this.deckLeft = this.deck(1);
    this.trick = [];
    this.tricks = [0, 0];
    this.wonPiles = [[], []];
    this.trump = null;
    this.firstSeven = null;
    this.caller = (this.dealer + 1) % 4;
    // the trump caller sees five cards first
    var order = [];
    for (var k = 0; k < 5; k++) for (var q = 1; q <= 4; q++) { var p = (this.dealer + q) % 4; var c = this.deckLeft.pop(); this.players[p].hand.push(c); order.push([p, c.id]); }
    this.players.forEach(function (pl) { self.sortHand(pl.id); });
    this.emit({ t: 'deal', order: order, dealer: this.dealer, round: this.round });
    this.current = this.caller;
    this.phase = 'trump';
    this.dealer = (this.dealer + 1) % 4;
    this.note('Round ' + this.round + ' of Court Piece. ' + this.pname(this.caller) + ' picks trump from 5 cards.');
  };
  CP.legalFor = function (p) {
    if (this.phase === 'trump') return SUITS.map(function (s) { return { type: 'trump', suit: s, key: 't' + s, label: SYM[s] + ' ' + SUIT_NAME[s] }; });
    if (this.phase === 'collect') return [{ type: 'collect', key: 'collect' }];
    var h = this.players[p].hand;
    var cards = h;
    if (this.trick.length) { var led = this.trick[0].c.s; var f = h.filter(function (c) { return c.s === led; }); if (f.length) cards = f; }
    return cards.map(function (c) { return { type: 'play', cardId: c.id, key: 'p' + c.id }; });
  };
  CP.autoNext = function () { return this.phase === 'collect' ? { type: 'collect', key: 'collect' } : null; };
  CP.on_trump = function (p, a) {
    var self = this;
    this.trump = a.suit;
    this.emit({ t: 'trump', p: p, suit: a.suit });
    this.note(this.pname(p) + ' calls ' + SUIT_NAME[a.suit] + ' as trump (rang)!');
    var order = [];
    while (this.deckLeft.length) for (var q = 1; q <= 4 && this.deckLeft.length; q++) { var pp = (this.caller + q - 1) % 4; var c = this.deckLeft.pop(); this.players[pp].hand.push(c); order.push([pp, c.id]); }
    this.players.forEach(function (pl) { self.sortHand(pl.id); });
    this.emit({ t: 'deal', order: order, more: true });
    this.phase = 'play';
    this.current = this.caller;
  };
  CP.on_play = function (p, a) {
    var c = this.take(p, a.cardId);
    this.trick.push({ p: p, c: c });
    this.emit({ t: 'play', p: p, id: c.id, face: { s: c.s, r: c.r } });
    if (this.trick.length < 4) { this.current = (p + 1) % 4; return; }
    var led = this.trick[0].c.s, tr = this.trump;
    var best = this.trick[0];
    this.trick.forEach(function (t) {
      var b = best.c, x = t.c;
      if ((x.s === tr && b.s !== tr) || (x.s === b.s && hi(x.r) > hi(b.r))) best = t;
    });
    this.winner = best.p;
    this.phase = 'collect';
    this.current = best.p;
    if (best.c.s === tr && led !== tr) this.emit({ t: 'cut', p: best.p });
  };
  CP.on_collect = function () {
    var w = this.winner, team = w % 2, self = this;
    this.tricks[team]++;
    this.trick.forEach(function (t) { self.wonPiles[team].push(t.c); });
    this.emit({ t: 'trickWon', p: w, ids: this.trick.map(function (t) { return t.c.id; }) });
    this.note(this.pname(w) + ' wins the trick (' + this.teamName(team) + ': ' + this.tricks[team] + ').');
    this.trick = [];
    if (this.tricks[team] >= 7) return this.endHand(team);
    this.phase = 'play';
    this.current = w;
  };
  CP.teamName = function (t) { return this.pname(t) + ' & ' + this.pname(t + 2); };
  CP.endHand = function (team) {
    var kot = this.tricks[1 - team] === 0;
    var pts = kot ? 3 : 1;
    this.teamScore[team] += pts;
    if (kot) this.emit({ t: 'kot', team: team });
    var self = this;
    this.players.forEach(function (pl) { pl.score = self.teamScore[pl.team]; });
    var winners = [team, team + 2];
    this.finishRound(this.teamName(team) + (kot ? ' win with a KOT - all 7 tricks!' : ' win the hand ' + this.tricks[team] + '-' + this.tricks[1 - team] + '.'), winners, null, { team: team, kot: kot });
  };
  CP.view = function (viewer) {
    var self = this;
    var led = this.trick.length ? this.trick[0].c.s : null;
    var zones = [trickZone(this, this.trump ? 'Trump ' + SYM[this.trump] : '')];
    [0, 1].forEach(function (t) {
      zones.push({ id: 'won' + t, type: 'won', p: t, label: self.tricks[t] + ' tricks', cards: self.wonPiles[t].slice(-4).map(function (c) { return { id: c.id, a: null, b: 'back' }; }) });
    });
    return this.baseView(viewer, {
      zones: zones, trump: this.trump, tricks: this.tricks, teams: true,
      status: this.phase === 'trump' ? this.statusFor(viewer, 'Choose the trump suit (rang) from your 5 cards', 'is choosing trump…')
        : this.statusFor(viewer, led ? 'Your turn - follow ' + SYM[led] + ' if you can' : 'Your lead', 'is playing…'),
      prompt: this.phase === 'trump' && viewer === this.current ? { title: 'Choose trump (rang)', options: this.legalFor(viewer).map(function (a) { return { label: a.label, action: a, suit: a.suit }; }) } : null
    });
  };

  /* ================================================================== */
  /* SEEP                                                                */
  /* ================================================================== */
  function seepPts(c) { if (c.s === 'S') return low(c.r); if (c.r === 'A') return 1; if (c.s === 'D' && c.r === '10') return 6; return 0; }
  function Seep(id, o, s, r) {
    Base.call(this, id, o, s, r);
    this.teams = this.players.length === 4;
    this.players.forEach(function (p) { p.team = p.id % 2; });
    this.totals = [0, 0];
    this.startRound();
  }
  Seep.prototype = Object.create(B);
  var SP = Seep.prototype;
  SP.side = function (p) { return this.teams ? p % 2 : p; };
  SP.startRound = function () {
    var self = this;
    this.round++;
    this.players.forEach(function (p) { p.hand = []; p.tag = ''; });
    this.floor = [];             // items: {kind:'card', c} | {kind:'house', value, pakka, owner, cards:[]}
    this.firstDealDone = false;
    this.bid = null;
    this.captured = [[], []];
    this.sweeps = [0, 0];
    this.lastCapture = null;
    var guard = 0;
    do {
      this.stock = this.deck(1);
      this.bidder = (this.dealer + 1) % this.players.length;
      var four = this.stock.splice(-4);
      guard++;
      if (four.some(function (c) { return low(c.r) >= 9; }) || guard > 50) { this.players[this.bidder].hand = four; break; }
    } while (true);
    this.sortHand(this.bidder);
    this.emit({ t: 'deal', order: this.players[this.bidder].hand.map(function (c) { return [self.bidder, c.id]; }), dealer: this.dealer, round: this.round });
    this.dealer = (this.dealer + 1) % this.players.length;
    this.current = this.bidder;
    this.phase = 'bid';
    this.note('Round ' + this.round + ' of Seep. ' + this.pname(this.bidder) + ' looks at 4 cards and bids a house (9-13).');
  };
  SP.valueOf = function (it) { return it.kind === 'card' ? low(it.c.r) : it.value; };
  SP.holds = function (p, v, exceptId) { return this.players[p].hand.some(function (c) { return c.id !== exceptId && low(c.r) === v; }); };
  SP.ownsHouse = function (p) { var s = this.side(p); var self = this; return this.floor.some(function (it) { return it.kind === 'house' && self.side(it.owner) === s; }); };
  // best capture with a card of value v: houses of v + the largest set of loose cards that splits into groups summing to v
  SP.captureSet = function (v) {
    var loose = [], houses = [];
    this.floor.forEach(function (it, i) { if (it.kind === 'card') loose.push(i); else if (it.value === v) houses.push(i); });
    var self = this;
    var vals = loose.map(function (i) { return self.valueOf(self.floor[i]); });
    var best = [];
    function search(avail, picked) {
      // take one group summing to v from the remaining loose cards, recursively
      if (picked.length > best.length) best = picked.slice();
      var first = -1;
      for (var a = 0; a < avail.length; a++) if (avail[a]) { first = a; break; }
      if (first < 0) return;
      // either the first available card joins a group, or it is skipped
      function grp(idx, sum, group) {
        if (sum === v) { var rest = avail.slice(); group.forEach(function (g) { rest[g] = false; }); search(rest, picked.concat(group)); return; }
        for (var k = idx; k < avail.length; k++) if (avail[k] && sum + vals[k] <= v) { group.push(k); grp(k + 1, sum + vals[k], group); group.pop(); }
      }
      grp(first + 1, vals[first], [first]);
      var skip = avail.slice(); skip[first] = false;
      search(skip, picked);
    }
    if (loose.length <= 14) search(loose.map(function () { return true; }), []);
    return houses.concat(best.map(function (k) { return loose[k]; }));
  };
  SP.movesFor = function (p, c) {
    var self = this;
    var v = low(c.r);
    var moves = [];
    var cap = this.captureSet(v);
    if (cap.length) {
      var lbl = cap.map(function (i) { var it = self.floor[i]; return it.kind === 'card' ? cname(it.c) : 'house ' + it.value; }).join(' + ');
      var pts = cap.reduce(function (s, i) { var it = self.floor[i]; return s + (it.kind === 'card' ? seepPts(it.c) : it.cards.reduce(function (t, x) { return t + seepPts(x); }, 0)); }, seepPts(c));
      moves.push({ type: 'capture', cardId: c.id, items: cap, key: 'c' + c.id, label: 'Capture ' + lbl, gain: pts, sweep: cap.length === this.floor.length });
    }
    // build a new house: card + loose cards totalling 9..13, and you must hold a card of that value
    var loose = [];
    this.floor.forEach(function (it, i) { if (it.kind === 'card') loose.push(i); });
    var seenVal = {};
    var n = Math.min(loose.length, 10);
    for (var mask = 1; mask < (1 << n); mask++) {
      var sum = v, idx = [];
      for (var b = 0; b < n; b++) if (mask & (1 << b)) { sum += this.valueOf(this.floor[loose[b]]); idx.push(loose[b]); }
      if (sum < 9 || sum > 13 || !this.holds(p, sum, c.id)) continue;
      if (this.floor.some(function (it) { return it.kind === 'house' && it.value === sum; })) continue; // would merge - keep it simple: use cement instead
      if (!seenVal[sum] || seenVal[sum].length < idx.length) seenVal[sum] = idx;
    }
    Object.keys(seenVal).forEach(function (sv) {
      var idx = seenVal[sv];
      moves.push({ type: 'build', cardId: c.id, items: idx, value: +sv, key: 'b' + c.id + '_' + sv, label: 'Build house of ' + sv + ' (' + [cname(c)].concat(idx.map(function (i) { return cname(self.floor[i].c); })).join(' + ') + ')' });
    });
    // raise an unbroken house, or cement (pakka) a house
    this.floor.forEach(function (it, i) {
      if (it.kind !== 'house') return;
      var nv = it.value + v;
      if (!it.pakka && nv >= 9 && nv <= 13 && self.holds(p, nv, c.id) && !self.floor.some(function (h2) { return h2.kind === 'house' && h2.value === nv; }))
        moves.push({ type: 'raise', cardId: c.id, house: i, value: nv, key: 'r' + c.id + '_' + i, label: 'Raise house ' + it.value + ' to ' + nv });
      if (v === it.value && self.holds(p, it.value, c.id))
        moves.push({ type: 'cement', cardId: c.id, house: i, value: it.value, key: 'm' + c.id + '_' + i, label: 'Make house ' + it.value + ' pakka (cement)' });
    });
    if (!this.ownsHouse(p) || !moves.length) moves.push({ type: 'throw', cardId: c.id, key: 't' + c.id, label: 'Throw ' + cname(c) + ' on the floor' });
    return moves;
  };
  SP.legalFor = function (p) {
    var self = this;
    if (this.phase === 'bid') {
      var vals = {};
      this.players[p].hand.forEach(function (c) { var v = low(c.r); if (v >= 9) vals[v] = true; });
      return Object.keys(vals).map(function (v) { return { type: 'bid', value: +v, key: 'bid' + v, label: 'Bid ' + v }; });
    }
    var out = [];
    this.players[p].hand.forEach(function (c) { out = out.concat(self.movesFor(p, c)); });
    if (this.phase === 'bidplay') {
      var bid = this.bid;
      out = out.filter(function (m) { return (m.type === 'capture' && low(self.find(p, m.cardId).r) === bid) || ((m.type === 'build' || m.type === 'raise') && m.value === bid) || (m.type === 'throw' && low(self.find(p, m.cardId).r) === bid); });
      if (!out.length) out = this.players[p].hand.filter(function (c) { return low(c.r) === bid; }).map(function (c) { return { type: 'throw', cardId: c.id, key: 't' + c.id, label: 'Throw ' + cname(c) }; });
    }
    return out;
  };
  SP.on_bid = function (p, a) {
    var self = this;
    this.bid = a.value;
    this.emit({ t: 'bid', p: p, value: a.value });
    this.note(this.pname(p) + ' bids ' + a.value + '.');
    for (var i = 0; i < 4; i++) this.floor.push({ kind: 'card', c: this.stock.pop() });
    this.emit({ t: 'floor' });
    this.phase = 'bidplay';
  };
  SP.dealRest = function () {
    var self = this;
    var n = this.players.length;
    var order = [];
    // first deal after the bid: the bidder (who already played one of their 4 cards) gets 8 more, everyone else 12
    var firstDeal = !this.firstDealDone;
    this.firstDealDone = true;
    // first deal of a round tops the bidder up to 12; later deals give everyone 12
    var guard = 0;
    while (this.stock.length && guard++ < 200) {
      var dealt = false;
      for (var q = 0; q < n && this.stock.length; q++) {
        var p = (this.bidder + q) % n;
        var want = firstDeal && p === this.bidder ? 11 : 12;
        if (this.players[p].hand.length < want) { var c = this.stock.pop(); this.players[p].hand.push(c); order.push([p, c.id]); dealt = true; }
      }
      if (!dealt) break;
    }
    this.players.forEach(function (pl) { self.sortHand(pl.id); });
    if (order.length) this.emit({ t: 'deal', order: order, more: true });
  };
  SP.removeItems = function (idxs) {
    var set = {};
    idxs.forEach(function (i) { set[i] = true; });
    var removed = [];
    this.floor = this.floor.filter(function (it, i) { if (set[i]) { removed.push(it); return false; } return true; });
    return removed;
  };
  SP.cardsOf = function (items) {
    var out = [];
    items.forEach(function (it) { if (it.kind === 'card') out.push(it.c); else it.cards.forEach(function (c) { out.push(c); }); });
    return out;
  };
  SP.on_capture = function (p, a) {
    var c = this.take(p, a.cardId);
    var got = this.cardsOf(this.removeItems(a.items)).concat([c]);
    var s = this.side(p);
    var self = this;
    got.forEach(function (x) { self.captured[s].push(x); });
    this.lastCapture = p;
    var sweep = !this.floor.length && !this.isLastMove();
    if (sweep) { this.sweeps[s]++; this.emit({ t: 'seep', p: p }); }
    this.emit({ t: 'capture', p: p, ids: got.map(function (x) { return x.id; }) });
    this.note(this.pname(p) + ' captures ' + got.length + ' cards with ' + cname(c) + (sweep ? ' - SEEP! +50' : '') + '.');
    this.afterMove(p);
  };
  SP.on_build = function (p, a) {
    var c = this.take(p, a.cardId);
    var parts = this.cardsOf(this.removeItems(a.items));
    this.floor.push({ kind: 'house', value: a.value, pakka: false, owner: p, cards: parts.concat([c]) });
    this.emit({ t: 'build', p: p, value: a.value });
    this.note(this.pname(p) + ' builds a house of ' + a.value + '.');
    this.afterMove(p);
  };
  SP.on_raise = function (p, a) {
    var c = this.take(p, a.cardId);
    var h = this.floor[a.house];
    h.cards.push(c);
    h.value = a.value;
    h.owner = p;
    this.emit({ t: 'build', p: p, value: a.value });
    this.note(this.pname(p) + ' raises the house to ' + a.value + '.');
    this.afterMove(p);
  };
  SP.on_cement = function (p, a) {
    var c = this.take(p, a.cardId);
    var h = this.floor[a.house];
    h.cards.push(c);
    h.pakka = true;
    h.owner = p;
    this.emit({ t: 'cement', p: p, value: h.value });
    this.note(this.pname(p) + ' makes the house of ' + h.value + ' pakka.');
    this.afterMove(p);
  };
  SP.on_throw = function (p, a) {
    var c = this.take(p, a.cardId);
    this.floor.push({ kind: 'card', c: c });
    this.emit({ t: 'throw', p: p, id: c.id });
    this.note(this.pname(p) + ' throws ' + cname(c) + '.');
    this.afterMove(p);
  };
  SP.isLastMove = function () { return !this.stock.length && this.players.every(function (pl) { return !pl.hand.length; }); };
  SP.afterMove = function (p) {
    var self = this;
    if (this.phase === 'bidplay') { this.phase = 'play'; this.dealRest(); }
    if (this.players.every(function (pl) { return !pl.hand.length; })) {
      if (this.stock.length) this.dealRest();
      else return this.endSeep();
    }
    this.current = this.next(p);
    var guard = 0;
    while (!this.players[this.current].hand.length && guard++ < 4) this.current = this.next(this.current);
  };
  SP.endSeep = function () {
    var self = this;
    if (this.floor.length && this.lastCapture != null) {
      var s = this.side(this.lastCapture);
      this.cardsOf(this.floor).forEach(function (c) { self.captured[s].push(c); });
      this.emit({ t: 'capture', p: this.lastCapture, ids: this.cardsOf(this.floor).map(function (c) { return c.id; }) });
      this.note(this.pname(this.lastCapture) + ' made the last capture and takes the floor.');
      this.floor = [];
    }
    var pts = [0, 1].map(function (t) { return self.captured[t].reduce(function (sum, c) { return sum + seepPts(c); }, 0) + self.sweeps[t] * 50; });
    this.totals[0] += pts[0]; this.totals[1] += pts[1];
    this.players.forEach(function (pl) { pl.score = self.totals[self.side(pl.id)]; });
    var win = pts[0] === pts[1] ? null : (pts[0] > pts[1] ? 0 : 1);
    var who = function (t) { return self.teams ? self.pname(t) + ' & ' + self.pname(t + 2) : self.pname(t); };
    var winners = win == null ? [] : (this.teams ? [win, win + 2] : [win]);
    this.finishRound(win == null ? 'A tie - ' + pts[0] + ' points each!' : who(win) + ' score ' + pts[win] + ' to ' + pts[1 - win] + '!', winners.length ? winners : [0], null, { points: pts, sweeps: this.sweeps.slice() });
  };
  SP.view = function (viewer) {
    var self = this;
    var items = this.floor.map(function (it, i) {
      if (it.kind === 'card') return { kind: 'card', idx: i, cv: self.cv(it.c, true) };
      return { kind: 'house', idx: i, value: it.value, pakka: it.pakka, owner: it.owner, cards: it.cards.map(function (c) { return self.cv(c, true); }) };
    });
    var zones = [{ id: 'floor', type: 'floor', items: items, label: this.phase === 'bid' ? 'Waiting for the bid' : (this.bid && this.phase === 'bidplay' ? 'Bid: ' + this.bid : '') }];
    var nSides = this.teams ? 2 : this.players.length;
    for (var t = 0; t < Math.min(2, nSides); t++) {
      zones.push({ id: 'won' + t, type: 'won', p: t, label: this.captured[t].length + ' cards' + (this.sweeps[t] ? ' · ' + this.sweeps[t] + ' seep' : ''), cards: this.captured[t].slice(-4).map(function (c) { return { id: c.id, a: null, b: 'back' }; }) });
    }
    var mine = viewer === this.actor();
    return this.baseView(viewer, {
      zones: zones, deckCount: this.stock.length, teams: this.teams,
      status: this.phase === 'bid' ? this.statusFor(viewer, 'Bid a house value (9-13) from your 4 cards', 'is bidding…')
        : this.phase === 'bidplay' ? this.statusFor(viewer, 'Play for your bid of ' + this.bid + ': build it, capture it, or throw that card', 'is playing the bid…')
          : this.statusFor(viewer, 'Your turn - tap a card to capture, build or throw', 'is thinking…'),
      prompt: this.phase === 'bid' && mine ? { title: 'Bid a house value', text: 'You must hold a card of the value you bid.', options: this.legalFor(viewer).map(function (a) { return { label: a.label, action: a }; }) } : null,
      perCard: true
    });
  };

  /* ================================================================== */
  /* factory + registration                                              */
  /* ================================================================== */
  var CTORS = { bhabhi: Bhabhi, bluff: Bluff, seep: Seep, sevens: Sevens, gadha: Gadha, teenpatti: TeenPatti, courtpiece: CourtPiece };
  function create(id, opts, seats, rnd) {
    var V = GAMES[id];
    if (V.allowed && V.allowed.indexOf(seats.length) < 0) throw new Error(V.name + ' needs ' + V.allowed.join(' or ') + ' players');
    if (seats.length < V.players[0] || seats.length > V.players[1]) throw new Error(V.name + ' needs ' + V.players[0] + '-' + V.players[1] + ' players');
    return new CTORS[id](id, opts, seats, rnd);
  }
  if (E && E.register) E.register({ variants: GAMES, options: OPTS, create: create });

  /* ================================================================== */
  /* CPU players                                                         */
  /* ================================================================== */
  function face(v, id) {
    var me = v.players[v.me];
    var c = me.hand.filter(function (x) { return x.id === id; })[0];
    return c && c.a;
  }
  function pickBy(list, score) {
    var best = null, bs = -Infinity;
    list.forEach(function (x) { var s = score(x); if (s > bs) { bs = s; best = x; } });
    return best;
  }
  function decide(v, mem, rnd) {
    rnd = rndFn(rnd);
    var legal = v.legal || [];
    if (!legal.length) return null;
    if (v.phase === 'roundOver') return null;
    var me = v.players[v.me];
    var lvl = me.level || 'normal';
    var noise = lvl === 'easy' ? 6 : lvl === 'hard' ? 0.5 : 2;
    var byType = {};
    legal.forEach(function (a) { (byType[a.type] = byType[a.type] || []).push(a); });
    if (byType.collect) return byType.collect[0];
    var trick = (v.zones || []).filter(function (z) { return z.type === 'trick'; })[0];
    switch (v.variant) {
      case 'bhabhi': {
        var plays = byType.play;
        var led = trick && trick.cards.length ? trick.cards[0].cv.a.s : null;
        var voids = v.voids || [];
        var isVoid = function (pid, suit) { return (voids[pid] || []).indexOf(suit) >= 0; };
        var n = v.players.length;
        var played = {};
        (trick ? trick.cards : []).forEach(function (t) { played[t.p] = true; });
        // players still to play in this trick, in turn order
        var after = [];
        for (var k = 1; k < n; k++) { var q = (v.me + k) % n; if (!v.players[q].out && !played[q]) after.push(q); }
        var others = v.players.filter(function (pl) { return pl.id !== v.me && !pl.out; }).map(function (pl) { return pl.id; });
        var inSuit = function (s) { return me.hand.filter(function (c) { return c.a && c.a.s === s; }).length; };
        return pickBy(plays, function (a) {
          var f = face(v, a.cardId);
          var r = hi(f.r);
          if (!led) {
            // lead low, from a short suit (so I can run out of it and thulla later),
            // and never into a suit somebody has already shown they lack
            var danger = others.some(function (q) { return isVoid(q, f.s); });
            return -r - inSuit(f.s) * 1.5 - (danger ? 40 + r : 0) + rnd() * noise;
          }
          if (f.s !== led) return r + rnd() * noise;                  // thulla: dump the biggest card
          var top = 0;
          trick.cards.forEach(function (t) { if (t.cv.a.s === led) top = Math.max(top, hi(t.cv.a.r)); });
          var thullaComing = after.some(function (q) { return isVoid(q, led); });
          if (!after.length) return r + rnd() * noise;                 // last to follow: the trick goes out, so shed my biggest
          if (thullaComing) return (r < top ? 20 + r : -3 * r) + rnd() * noise; // someone will cut: stay under, or as low as possible
          return (r < top ? 20 + r : -r) + rnd() * noise;              // duck under the current winner
        });
      }
      case 'courtpiece': {
        if (byType.trump) {
          var cnt = {};
          me.hand.forEach(function (c) { if (c.a) cnt[c.a.s] = (cnt[c.a.s] || 0) + 1 + hi(c.a.r) / 20; });
          return pickBy(byType.trump, function (a) { return (cnt[a.suit] || 0) + rnd() * 0.1; });
        }
        var tr = v.trump;
        var cards = trick ? trick.cards : [];
        var ledS = cards.length ? cards[0].cv.a.s : null;
        var winning = null;
        cards.forEach(function (t) { var b = winning && winning.cv.a, x = t.cv.a; if (!winning || (x.s === tr && b.s !== tr) || (x.s === b.s && hi(x.r) > hi(b.r))) winning = t; });
        var partnerWins = winning && winning.p % 2 === v.me % 2;
        return pickBy(byType.play, function (a) {
          var f = face(v, a.cardId), r = hi(f.r);
          if (!ledS) return r + (f.s === tr ? -8 : 0) + rnd() * noise;           // lead strong side suits
          var beats = winning && ((f.s === tr && winning.cv.a.s !== tr) || (f.s === winning.cv.a.s && r > hi(winning.cv.a.r)));
          if (partnerWins) return -r - (f.s === tr ? 20 : 0) + rnd() * noise;  // partner has it: throw low
          if (beats) return 30 - r - (f.s === tr ? 5 : 0) + rnd() * noise;      // win as cheaply as possible
          return -r - (f.s === tr ? 20 : 0) + rnd() * noise;
        });
      }
      case 'sevens': {
        if (!byType.play) return byType.pass[0];
        return pickBy(byType.play, function (a) {
          var f = face(v, a.cardId);
          var sameSuit = me.hand.filter(function (c) { return c.a && c.a.s === f.s; }).length;
          return (f.r === '7' ? -2 : 0) + sameSuit * 0.5 + Math.abs(low(f.r) - 7) * 0.3 + rnd() * noise;
        });
      }
      case 'gadha':
        return byType.pick[Math.floor(rnd() * byType.pick.length)];
      case 'bluff': {
        var counts = {};
        me.hand.forEach(function (c) { counts[c.a.r] = (counts[c.a.r] || []).concat([c.id]); });
        var lp = v.lastPlay;
        var maxCards = +v.options.decks === 2 ? 8 : 4;
        if (lp && byType.bluff) {
          var mine = (counts[v.claim] || []).length;
          var decks = +v.options.decks === 2 ? 2 : 1;
          var claimedTotal = mem.claimed || 0;
          var impossible = mine + lp.n > 4 * decks;
          var pr = impossible ? 1 : (lp.n >= 3 ? 0.35 : 0.12) + (v.players[lp.p].count === 0 ? 0.5 : 0) + (lvl === 'easy' ? -0.05 : 0);
          if (rnd() < pr) return { type: 'bluff', key: 'bluff' };
        }
        var rank = v.claim;
        if (!rank) {
          // start a pile with the rank we hold most of
          var bestR = Object.keys(counts).sort(function (a, b) { return counts[b].length - counts[a].length; })[0];
          return { type: 'play', cardIds: counts[bestR].slice(0, maxCards), rank: bestR };
        }
        var have = counts[rank] || [];
        if (have.length) {
          var ids = have.slice(0, maxCards);
          if (ids.length < maxCards && rnd() < 0.25) { var extra = me.hand.filter(function (c) { return c.a.r !== rank; })[0]; if (extra) ids.push(extra.id); }
          return { type: 'play', cardIds: ids };
        }
        if (rnd() < (lvl === 'easy' ? 0.35 : 0.55) || !byType.pass) {
          var worst = me.hand.slice().sort(function (a, b) { return hi(b.a.r) - hi(a.a.r); })[0];
          return { type: 'play', cardIds: [worst.id] };
        }
        return { type: 'pass', key: 'pass' };
      }
      case 'teenpatti': {
        if (byType.accept) return rnd() < 0.5 ? byType.accept[0] : byType.deny[0];
        var cardsF = me.hand.map(function (c) { return c.a; });
        var known = cardsF.every(function (x) { return x; });
        mem.turns = (mem.turns || 0) + 1;
        if (!known && byType.see && (mem.turns > 2 + Math.floor(rnd() * 3) || lvl === 'hard')) return byType.see[0];
        var strength = 0.35 + rnd() * 0.2;
        if (known) {
          var hr = handRank(cardsF.map(function (f) { return { s: f.s, r: f.r }; }));
          strength = (hr.cat - 1) / 5 + (hr.key[0] || 0) / 60;
        }
        var bluffy = rnd() < (lvl === 'easy' ? 0.05 : 0.12);
        if (byType.show && strength > 0.45) return byType.show[0];
        if (strength > 0.65 && byType.raise && rnd() < 0.6) return byType.raise[0];
        if ((strength > 0.25 || bluffy || !known) && byType.chaal) {
          if (byType.sideshow && strength < 0.35 && rnd() < 0.3) return byType.sideshow[0];
          return byType.chaal[0];
        }
        if (byType.allin && strength > 0.5) return byType.allin[0];
        return byType.pack[0];
      }
      case 'seep': {
        if (byType.bid) return pickBy(byType.bid, function (a) { return a.value + rnd(); });
        return pickBy(legal, function (a) {
          var f = face(v, a.cardId) || { r: '2', s: 'H' };
          var cardPts = seepPts(f);
          if (a.type === 'capture') return 40 + (a.gain || 0) * 2 + (a.sweep ? 120 : 0) + a.items.length * 3 + rnd() * noise;
          if (a.type === 'build' || a.type === 'raise') return 30 + a.value + rnd() * noise;
          if (a.type === 'cement') return 28 + rnd() * noise;
          return 10 - cardPts * 2 - low(f.r) * 0.3 + rnd() * noise;   // throw something harmless
        });
      }
    }
    return legal[0];
  }

  return {
    GAMES: GAMES, OPTS: OPTS, SUITS: SUITS, RANKS: RANKS, SYM: SYM, SUIT_NAME: SUIT_NAME, RANK_WORD: RANK_WORD,
    create: create, decide: decide, handRank: handRank, cmpHands: cmpHands, seepPoints: seepPts
  };
});
