/*
 * UNO Arena - shared rules engine.
 * Runs unchanged in the browser (window.UNOEngine) and in Node (require).
 * Written in ES2017 so it runs on Node 12+ (no optional chaining).
 *
 * Every game exposes the same interface:
 *   game.act(pid, action)    -> { ok, error }
 *   game.takeEvents()        -> [events since last call]
 *   game.view(pid)           -> what that seat is allowed to see + its legal moves
 *   game.legalActions(pid)   -> enumerated moves (bots / timeouts)
 *   game.waitingOn()         -> seats that must act now
 */
(function (root, factory) {
  var E = factory();
  if (typeof module === 'object' && module.exports) module.exports = E;
  root.UNOEngine = E;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var LIGHT = ['red', 'yellow', 'green', 'blue'];
  var DARK = ['pink', 'teal', 'orange', 'purple'];
  var DOS_COLORS = ['red', 'yellow', 'green', 'blue'];

  function shuffle(a, rnd) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function times(n, f) { for (var i = 0; i < n; i++) f(i); }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function pick(a, rnd) { return a[Math.floor(rnd() * a.length)]; }
  function isNum(v) { return /^\d+$/.test(v); }
  function assign(t) { for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; if (s) for (var k in s) t[k] = s[k]; } return t; }

  /* ------------------------------------------------------------------ */
  /* Card metadata                                                       */
  /* ------------------------------------------------------------------ */
  var META = {
    skip: { name: 'Skip', kind: 'action' },
    reverse: { name: 'Reverse', kind: 'action' },
    draw1: { name: 'Draw One', kind: 'action', draw: 1 },
    draw2: { name: 'Draw Two', kind: 'action', draw: 2 },
    draw4: { name: 'Draw Four', kind: 'action', draw: 4 },
    draw5: { name: 'Draw Five', kind: 'action', draw: 5 },
    flip: { name: 'Flip', kind: 'action' },
    skipall: { name: 'Skip Everyone', kind: 'action' },
    discardall: { name: 'Discard All', kind: 'action' },
    dare: { name: 'Dare', kind: 'action', dare: 2 },
    hit2: { name: 'Hit 2', kind: 'action' },
    trade: { name: 'Trade Hands', kind: 'action' },
    wild: { name: 'Wild', kind: 'wild' },
    wild4: { name: 'Wild Draw Four', kind: 'wild', draw: 4 },
    wild2: { name: 'Wild Draw Two', kind: 'wild', draw: 2 },
    wildcolor: { name: 'Wild Draw Color', kind: 'wild' },
    wildrev4: { name: 'Wild Reverse Draw Four', kind: 'wild', draw: 4 },
    wild6: { name: 'Wild Draw Six', kind: 'wild', draw: 6 },
    wild10: { name: 'Wild Draw Ten', kind: 'wild', draw: 10 },
    roulette: { name: 'Wild Color Roulette', kind: 'wild' },
    wilddare: { name: 'Wild Dare', kind: 'wild', dare: 4 },
    wildhit: { name: 'Wild Hit-Fire', kind: 'wild' },
    wildallhit: { name: 'Wild All Hit', kind: 'wild' },
    wildrev: { name: 'Wild Reverse', kind: 'wild' },
    wildskip: { name: 'Wild Skip', kind: 'wild' },
    wildskip2: { name: 'Wild Skip Two', kind: 'wild' },
    wildtarget2: { name: 'Wild Targeted Draw Two', kind: 'wild', draw: 2 },
    wildswap: { name: 'Wild Forced Swap', kind: 'wild' },
    dos: { name: 'Wild DOS', kind: 'wild' },
    hash: { name: 'Wild #', kind: 'action' }
  };

  function cardName(f) {
    if (!f) return 'card';
    if (f.v === 'back') return 'face-down card';
    var m = META[f.v];
    var col = f.c && f.c !== 'wild' ? cap(f.c) + ' ' : '';
    if (isNum(f.v)) return col + f.v;
    if (!m) return col + f.v;
    return m.kind === 'wild' ? m.name : col + m.name;
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  /* ------------------------------------------------------------------ */
  /* Dares (UNO Dare!)                                                   */
  /* ------------------------------------------------------------------ */
  var DARES = {
    family: [
      'Give a compliment to every player at the table.',
      'Tell the funniest joke you know.',
      'Do your best impression of another player (they pick who).',
      'Name 5 animals in 10 seconds.',
      'Sing "Happy Birthday" in a whisper.',
      'Speak only in questions until your next turn.',
      'Make up a two-line poem about the player on your left.',
      'Hum a song - the first player to guess it picks your next color.',
      'Say the alphabet backwards from M.',
      'Describe your favourite food without saying its name.',
      'Do 5 jumping jacks.',
      'Make the silliest face you can and hold it for 10 seconds.',
      'Talk like a robot until your next turn.',
      'Tell everyone your most embarrassing (but friendly) moment.',
      'Balance a card on your nose for 5 seconds.',
      'Say "UNO" in three different accents.'
    ],
    showoff: [
      'Do your best runway walk across the room.',
      'Hold your cards with your feet for one round.',
      'Freestyle rap 4 lines about UNO.',
      'Strike a superhero pose and hold it until your next turn.',
      'Do your best dance move for 10 seconds.',
      'Narrate the next turn like a sports commentator.',
      'Talk like a pirate until your next turn.',
      'Pretend to be a news anchor announcing the score.',
      'Do your best opera singing for one line of a song.',
      'Moonwalk (or try to) for 5 seconds.',
      'Give a dramatic award-acceptance speech for winning this game.',
      'Act out a movie scene - others must guess it.',
      'Do your best celebrity impression.',
      'Play the next turn with your eyes closed.',
      'Air-guitar solo for 10 seconds!',
      'Speak in slow motion until your next turn.'
    ],
    daredevil: [
      'Do 10 push-ups (or 10 squats).',
      'Run around the room once.',
      'Plank for 20 seconds.',
      'Hop on one foot until your next turn.',
      'Hold your breath for 15 seconds.',
      'Do a cartwheel (or a safe somersault).',
      'Wall-sit for 20 seconds.',
      'Let the player on your right pick a song you must sing loud.',
      'Do 15 jumping jacks as fast as possible.',
      'Stand up and play the rest of this round standing.',
      'Spin around 5 times, then say "UNO" without wobbling.',
      'Touch your toes 10 times.',
      'Do your best tiger roar - loud!',
      'Balance on one leg for 20 seconds.',
      'Do a 10-second dance battle with the next player.',
      'Hold your cards above your head until your next turn.'
    ]
  };
  // Adults-only deck (18+, behind an age check in the app): cheeky party dares, never explicit
  DARES.spicy = [
    'Do your most dramatic slow-motion "model walk" across the room.',
    'Let the player on your left read out the last emoji you sent someone.',
    'Serenade the player on your right with a love-song chorus.',
    'Do your best seductive dance move for 10 seconds - make it ridiculous.',
    'Describe your worst date ever in exactly three sentences.',
    'Give the player opposite you your best cheesy pick-up line.',
    'Do an over-the-top romantic movie scene with the next player.',
    'Reveal the celebrity you had the biggest crush on as a teenager.',
    'Let the group pick a nickname you must answer to for the rest of the game.',
    'Speak in your most flirty voice until your next turn.',
    'Show the group the most embarrassing photo in your camera roll you\'re willing to share.',
    'Recreate your most awkward first-kiss story with two cards as actors.',
    'Text someone (group\'s choice) "I can\'t stop thinking about pineapples." No explanation.',
    'Do 10 seconds of interpretive dance titled "My Love Life".',
    'Let another player style your hair however they like.',
    'Confess the cheesiest thing you have ever done to impress someone.'
  ];
  DARES.party = [
    'Do your best stand-up comedy bit about your job for 20 seconds.',
    'Impersonate a reality-TV star announcing who goes home tonight.',
    'Let the group choose a song - you have to lip-sync it with full commitment.',
    'Call a friend and sing them "Happy Birthday" (it\'s not their birthday).',
    'Do your best karaoke ballad voice for one full chorus.',
    'Talk like a late-night radio DJ until your next turn.',
    'Let the group give you a dramatic new hairstyle with their hands.',
    'Do a 15-second TED talk on why you deserve to win this game.',
    'Act out your morning routine as a nature documentary.',
    'Hold a plank while everyone else plays one turn each.',
    'Do your best impression of your boss or teacher.',
    'Let the group pick an accent - keep it until your next turn.',
    'Perform a victory dance as if you just won the lottery.',
    'Rap a verse about the person to your left.',
    'Do the worm (or your best attempt) right now.',
    'Narrate the next two turns like a breathless sports commentator.'
  ];
  DARES.confession = [
    'Tell the group your most embarrassing drunk-text (or almost-sent text) story.',
    'Reveal your most irrational pet peeve - and act it out.',
    'Share the worst gift you ever received and what you did with it.',
    'Admit the last time you pretended to be busy to avoid plans.',
    'Tell everyone the most childish thing you still do.',
    'Reveal the weirdest thing you have ever searched online.',
    'Share your most awkward "wrong person" wave or hug story.',
    'Confess a bad habit nobody here knows about.',
    'Tell the group the pettiest reason you ever stopped talking to someone.',
    'Admit which player here you would least like to be stuck in a lift with - and why (nicely!).',
    'Reveal your most-used guilty-pleasure song.',
    'Share the biggest lie you told as a kid and whether you got caught.',
    'Describe your dating-app bio (real or imaginary) in one line.',
    'Tell the group about a time you laughed at the worst possible moment.',
    'Confess the most money you\'ve wasted on something silly.',
    'Reveal the strangest compliment you have ever received.'
  ];
  var DARE_CATEGORY = { red: 'daredevil', yellow: 'showoff', green: 'family', blue: 'family' };
  var DARE_CATEGORY_ADULT = { red: 'spicy', yellow: 'party', green: 'confession', blue: 'confession' };
  var DARE_LABEL = { family: 'Family Dare', showoff: 'Show-Off Dare', daredevil: 'Daredevil Dare', spicy: 'Spicy Dare (18+)', party: 'Party Dare (18+)', confession: 'Confession Dare (18+)' };

  /* ------------------------------------------------------------------ */
  /* Decks                                                               */
  /* ------------------------------------------------------------------ */
  function colored(deck, colors, spec) {
    colors.forEach(function (c) {
      Object.keys(spec).forEach(function (v) { times(spec[v], function () { deck.push({ c: c, v: v }); }); });
    });
  }
  function wilds(deck, spec, color) {
    Object.keys(spec).forEach(function (v) { times(spec[v], function () { deck.push({ c: color || 'wild', v: v }); }); });
  }
  function nums(from, to, n, extra) {
    var o = {};
    for (var i = from; i <= to; i++) o[String(i)] = n;
    return assign(o, extra);
  }

  var DECKS = {
    classic: function () {
      var d = [];
      colored(d, LIGHT, nums(1, 9, 2, { '0': 1, skip: 2, reverse: 2, draw2: 2 }));
      wilds(d, { wild: 4, wild4: 4 });
      return d; // 108
    },
    nomercy: function () {
      var d = [];
      colored(d, LIGHT, nums(0, 9, 2, { skip: 3, reverse: 3, draw2: 2, draw4: 2, discardall: 3, skipall: 2 }));
      wilds(d, { wildrev4: 8, wild6: 4, wild10: 4, roulette: 8 });
      return d; // 164 playing cards (box has 168 incl. rule cards)
    },
    flipLight: function () {
      var d = [];
      colored(d, LIGHT, nums(1, 9, 2, { draw1: 2, reverse: 2, skip: 2, flip: 2 }));
      wilds(d, { wild: 4, wild2: 4 });
      return d; // 112
    },
    flipDark: function () {
      var d = [];
      colored(d, DARK, nums(1, 9, 2, { draw5: 2, reverse: 2, skipall: 2, flip: 2 }));
      wilds(d, { wild: 4, wildcolor: 4 });
      return d; // 112
    },
    allwild: function () {
      var d = [];
      wilds(d, { wild: 26, wildrev: 14, wildskip: 14, wildskip2: 14, wild2: 14, wild4: 10, wildtarget2: 10, wildswap: 10 });
      return d; // 112
    },
    attack: function () {
      var d = [];
      colored(d, LIGHT, nums(1, 9, 2, { skip: 2, reverse: 2, hit2: 2, discardall: 1, trade: 1 }));
      wilds(d, { wild: 4, wildhit: 2, wildallhit: 2 });
      return d; // 112
    },
    liars: function () {
      var d = [];
      colored(d, LIGHT, nums(1, 9, 2, { '0': 1, '10': 1, skip: 2, reverse: 2, draw2: 2 }));
      wilds(d, { wild: 2, wild4: 2 });
      // Liar cards: the second copy of 1, 3, 5, 7 and 9 in every colour carries the liar circle
      var seen = {};
      d.forEach(function (f) {
        var k = f.c + f.v;
        seen[k] = (seen[k] || 0) + 1;
        if (seen[k] === 2 && ['1', '3', '5', '7', '9'].indexOf(f.v) >= 0) f.l = 1;
      });
      return d; // 112, 20 of them Liar cards
    },
    dare: function () {
      var d = [];
      colored(d, LIGHT, nums(1, 9, 2, { '0': 1, skip: 2, reverse: 2, draw2: 1, dare: 2 }));
      wilds(d, { wild: 3, wild4: 3, wilddare: 2 });
      return d; // 112
    },
    dos: function () {
      var d = [];
      colored(d, DOS_COLORS, { '1': 3, '3': 3, '4': 3, '5': 3, '6': 2, '7': 2, '8': 2, '9': 2, '10': 2, hash: 2 });
      wilds(d, { dos: 12 });
      return d; // 108
    }
  };

  /* ------------------------------------------------------------------ */
  /* Points                                                              */
  /* ------------------------------------------------------------------ */
  function pointsClassic(f) {
    if (isNum(f.v)) return +f.v;
    var m = META[f.v] || {};
    return m.kind === 'wild' ? 50 : 20;
  }
  var POINTS = {
    classic: pointsClassic,
    liars: pointsClassic,
    dare: pointsClassic,
    attack: pointsClassic,
    nomercy: pointsClassic,
    flip: function (f) {
      if (isNum(f.v)) return +f.v;
      return ({ draw1: 10, reverse: 20, skip: 20, flip: 20, wild: 40, wild2: 50, draw5: 20, skipall: 30, wildcolor: 60 })[f.v] || 20;
    },
    allwild: function (f) {
      return ({ wild: 20, wildrev: 20, wildskip: 20, wildskip2: 30, wild2: 30, wild4: 50, wildtarget2: 40, wildswap: 40 })[f.v] || 20;
    },
    dos: function (f) {
      if (f.v === 'dos') return 20;
      if (f.v === 'hash') return 40;
      return +f.v;
    }
  };

  /* ------------------------------------------------------------------ */
  /* Variant catalogue                                                   */
  /* ------------------------------------------------------------------ */
  var OPTION_DEFS = {
    scoreMode: { label: 'Game length', type: 'select', choices: [['single', 'Single round'], ['points', 'Play to target score']] },
    target: { label: 'Target score', type: 'number', min: 50, max: 5000, step: 50 },
    handSize: { label: 'Starting hand', type: 'number', min: 3, max: 12, step: 1 },
    stacking: { label: 'Stack draw cards (+2 on +2, +4 on +4)', type: 'bool' },
    sevenO: { label: '7-0 rule (7 swaps hands, 0 rotates hands)', type: 'bool' },
    jumpIn: { label: 'Jump-in (play an identical card out of turn)', type: 'bool' },
    drawMode: { label: 'When you can\'t play', type: 'select', choices: [['one', 'Draw 1 card'], ['until', 'Draw until playable']] },
    forcePlay: { label: 'Must play a playable drawn card', type: 'bool' },
    challenge: { label: 'Allow Wild Draw challenges', type: 'bool' },
    unoPenalty: { label: 'Penalty for missing UNO', type: 'number', min: 1, max: 6, step: 1 },
    liarPenalty: { label: 'Penalty for a lie / wrong challenge', type: 'number', min: 1, max: 6, step: 1 },
    mercyLimit: { label: 'Mercy rule: knocked out at', type: 'number', min: 15, max: 60, step: 1 },
    turnTimer: { label: 'Turn timer (seconds, 0 = off)', type: 'number', min: 0, max: 120, step: 5 },
    dareDeck: { label: 'Dare deck', type: 'select', choices: [['family', 'Family (all ages)'], ['adult', 'Adults only (18+)']], adultGate: true }
  };

  var VARIANTS = {
    classic: {
      id: 'classic', name: 'UNO Classic', short: 'Classic', players: [2, 10], deck: 'classic', accent: '#ff5555',
      tagline: 'The original 108-card game. Match colour or number, shout UNO!',
      defaults: { scoreMode: 'single', target: 500, handSize: 7, stacking: false, sevenO: false, jumpIn: false, drawMode: 'one', forcePlay: false, challenge: true, unoPenalty: 2, turnTimer: 30 },
      options: ['scoreMode', 'target', 'handSize', 'stacking', 'sevenO', 'jumpIn', 'drawMode', 'forcePlay', 'challenge', 'unoPenalty', 'turnTimer'],
      officialStart: true
    },
    flip: {
      id: 'flip', name: 'UNO Flip!', short: 'Flip', players: [2, 10], deck: 'flip', accent: '#ff3fa4', flip: true,
      tagline: 'Double-sided cards. The Flip card turns the whole game to the brutal Dark Side.',
      defaults: { scoreMode: 'single', target: 500, handSize: 7, stacking: false, jumpIn: false, drawMode: 'one', forcePlay: false, challenge: true, unoPenalty: 2, turnTimer: 30 },
      options: ['scoreMode', 'target', 'handSize', 'stacking', 'jumpIn', 'drawMode', 'forcePlay', 'challenge', 'unoPenalty', 'turnTimer']
    },
    nomercy: {
      id: 'nomercy', name: 'UNO Show \'Em No Mercy', short: 'No Mercy', players: [2, 6], deck: 'nomercy', accent: '#ff2a2a',
      tagline: '168 cards, Draw 10s, stacking, 7-0 and the Mercy Rule. No friends allowed.',
      defaults: { scoreMode: 'single', target: 1000, handSize: 7, stacking: true, sevenO: true, drawMode: 'until', forcePlay: true, unoPenalty: 2, mercyLimit: 25, turnTimer: 30 },
      options: ['scoreMode', 'target', 'handSize', 'mercyLimit', 'unoPenalty', 'turnTimer'],
      fixed: { stacking: true, sevenO: true, drawMode: 'until', forcePlay: true, challenge: false, stackRule: 'higher', mercy: true }
    },
    allwild: {
      id: 'allwild', name: 'UNO All Wild!', short: 'All Wild', players: [2, 10], deck: 'allwild', accent: '#a259ff', allWild: true,
      tagline: 'Every card is Wild. Every play is legal. Pure chaos.',
      defaults: { scoreMode: 'single', target: 500, handSize: 7, stacking: false, unoPenalty: 2, turnTimer: 30 },
      options: ['scoreMode', 'target', 'handSize', 'stacking', 'unoPenalty', 'turnTimer'],
      fixed: { drawMode: 'one', challenge: false }
    },
    attack: {
      id: 'attack', name: 'UNO Attack!', short: 'Attack', players: [2, 10], deck: 'attack', accent: '#ffaa00', launcher: true,
      tagline: 'No draw pile - hit the card launcher and pray it doesn\'t fire.',
      defaults: { scoreMode: 'single', target: 500, handSize: 7, unoPenalty: 2, turnTimer: 30 },
      options: ['scoreMode', 'target', 'handSize', 'unoPenalty', 'turnTimer'],
      fixed: { drawMode: 'launcher', challenge: false, stacking: false }
    },
    liars: {
      id: 'liars', name: 'UNO Liar\'s', short: 'Liar\'s', players: [2, 6], deck: 'liars', accent: '#3fd0c9', liar: true,
      tagline: 'Play cards face-down and lie about them. Call the bluff - or pay for it.',
      defaults: { scoreMode: 'single', target: 500, handSize: 7, liarPenalty: 2, unoPenalty: 2, turnTimer: 30 },
      options: ['scoreMode', 'target', 'handSize', 'liarPenalty', 'unoPenalty', 'turnTimer'],
      fixed: { drawMode: 'one', challenge: false, stacking: false, liarSwaps: true }
    },
    dare: {
      id: 'dare', name: 'UNO Dare!', short: 'Dare', players: [2, 10], deck: 'dare', accent: '#55aa55', dare: true,
      tagline: 'Take the dare or take the cards. Family, Show-Off and Daredevil dares.',
      defaults: { dareDeck: 'family', scoreMode: 'single', target: 500, handSize: 7, stacking: false, drawMode: 'one', challenge: true, unoPenalty: 2, turnTimer: 45 },
      options: ['dareDeck', 'scoreMode', 'target', 'handSize', 'stacking', 'drawMode', 'challenge', 'unoPenalty', 'turnTimer']
    },
    dos: {
      id: 'dos', name: 'DOS', short: 'DOS', players: [2, 10], deck: 'dos', accent: '#5555ff', dos: true,
      tagline: 'UNO\'s sibling: match numbers in the Center Row - single or double - and shout DOS!',
      defaults: { scoreMode: 'single', target: 200, handSize: 7, unoPenalty: 2, turnTimer: 45 },
      options: ['scoreMode', 'target', 'handSize', 'unoPenalty', 'turnTimer']
    }
  };

  function resolveOptions(variant, opts) {
    var o = assign({}, variant.defaults, opts || {}, variant.fixed || {});
    o.stackRule = o.stackRule || 'same';
    o.unoPenalty = +o.unoPenalty || 2;
    o.handSize = Math.max(3, Math.min(12, +o.handSize || 7));
    o.target = +o.target || 500;
    return o;
  }

  var DEFAULT_RND = function () { return Math.random(); };

  /* ================================================================== */
  /* UNO family engine                                                   */
  /* ================================================================== */
  function UnoGame(variantId, opts, seats, rnd) {
    this.V = VARIANTS[variantId];
    if (!this.V || this.V.dos) throw new Error('Unknown UNO variant ' + variantId);
    this.vid = variantId;
    this.o = resolveOptions(this.V, opts);
    this.rnd = rnd || DEFAULT_RND;
    this.points = POINTS[this.V.flip ? 'flip' : variantId] || pointsClassic;
    this.players = seats.map(function (s, i) {
      return { id: i, name: s.name || ('Player ' + (i + 1)), kind: s.kind || 'human', level: s.level || 'normal', avatar: s.avatar || null, hand: [], out: false, score: 0, declared: false, ko: 0 };
    });
    this.events = [];
    this.log = [];
    this.round = 0;
    this.dealer = Math.floor(this.rnd() * this.players.length);
    this.idc = 0;
    this.idp = Math.floor(this.rnd() * 1e6).toString(36);
    this.gameOver = false;
    this.startRound();
  }

  var P = UnoGame.prototype;

  P.newId = function () { this.idc++; return this.idp + '_' + this.idc.toString(36); };
  P.emit = function (e) { this.events.push(e); };
  P.takeEvents = function () { var e = this.events; this.events = []; return e; };
  P.note = function (txt) { this.log.push(txt); if (this.log.length > 60) this.log.shift(); this.emit({ t: 'log', text: txt }); };
  P.pname = function (p) { return this.players[p] ? this.players[p].name : '?'; };

  P.face = function (card) {
    if (!card) return null;
    if (this.V.flip) return this.side === 'dark' ? card.dark : card.light;
    return card;
  };
  P.otherFace = function (card) { return this.side === 'dark' ? card.light : card.dark; };
  P.topCard = function () { return this.discard[this.discard.length - 1]; };
  P.topFace = function () {
    var t = this.topCard();
    if (!t) return null;
    if (t.hidden) return t.claim;
    return this.face(t);
  };
  P.colors = function () { return this.V.flip && this.side === 'dark' ? DARK : LIGHT; };
  P.meta = function (f) { return META[f.v] || { kind: 'number' }; };
  P.isWild = function (f) { return f && (f.c === 'wild'); };
  P.active = function () { return this.players.filter(function (p) { return !p.out; }); };
  P.activeCount = function () { return this.active().length; };

  P.nextOf = function (i, steps, dir) {
    var n = this.players.length;
    var d = dir || this.dir;
    var s = steps == null ? 1 : steps;
    var cur = i;
    var guard = 0;
    while (s > 0 && guard++ < 100) {
      cur = ((cur + d) % n + n) % n;
      if (!this.players[cur].out) s--;
    }
    return cur;
  };

  /* ---------------- round setup ---------------- */
  P.buildDeck = function () {
    var self = this;
    var deck;
    if (this.V.flip) {
      var L = shuffle(DECKS.flipLight(), this.rnd), D = shuffle(DECKS.flipDark(), this.rnd);
      deck = L.map(function (l, i) { return { light: l, dark: D[i] }; });
    } else {
      deck = DECKS[this.V.deck]().map(function (f) { var c = { c: f.c, v: f.v }; if (f.l) c.l = 1; return c; });
    }
    shuffle(deck, this.rnd);
    deck.forEach(function (c) { c.id = self.newId(); });
    return deck;
  };

  P.startRound = function () {
    var self = this;
    this.round++;
    this.side = 'light';
    this.dir = 1;
    this.deck = this.buildDeck();
    this.discard = [];
    this.drawStack = 0;
    this.stackMin = 0;
    this.unoPending = null;
    this.pend = null;
    this.drawnId = null;
    this.turnNo = 0;
    this.roundResult = null;
    this.players.forEach(function (p) { p.hand = []; p.out = false; p.declared = false; p.ko = 0; });
    this.dealer = (this.dealer + 1) % this.players.length;
    // deal
    var order = [];
    for (var r = 0; r < this.o.handSize; r++) {
      for (var k = 1; k <= this.players.length; k++) {
        var p = (this.dealer + k) % this.players.length;
        var c = this.deck.pop();
        this.players[p].hand.push(c);
        order.push([p, c.id]);
      }
    }
    // starting card
    var start;
    var guard = 0;
    while (guard++ < 500) {
      start = this.deck.pop();
      var f = this.face(start);
      var ok = isNum(f.v) || (this.V.officialStart && ['skip', 'reverse', 'draw2', 'wild'].indexOf(f.v) >= 0) || this.V.allWild && f.v === 'wild';
      if (ok) break;
      this.deck.unshift(start); // back into the pile, bottom
    }
    this.discard.push(start);
    var sf = this.face(start);
    this.color = sf.c === 'wild' ? null : sf.c;
    this.current = this.nextOf(this.dealer, 1, 1);
    this.phase = 'turn';
    this.emit({ t: 'deal', order: order, dealer: this.dealer, round: this.round });
    this.note('Round ' + this.round + ' - ' + this.pname(this.dealer) + ' deals. Starting card: ' + cardName(sf) + '.');
    // official classic start effects
    if (this.V.officialStart && !isNum(sf.v)) {
      if (sf.v === 'skip') { this.emit({ t: 'skip', p: this.current }); this.note(this.pname(this.current) + ' is skipped by the starting card.'); this.current = this.nextOf(this.current, 1); }
      else if (sf.v === 'reverse') { this.dir = -1; this.emit({ t: 'reverse', dir: -1 }); this.current = this.dealer; this.note('Starting Reverse: the dealer plays first, anticlockwise.'); }
      else if (sf.v === 'draw2') { var v = this.current; this.drawCards(v, 2, 'penalty'); this.emit({ t: 'skip', p: v }); this.current = this.nextOf(v, 1); }
      else if (sf.v === 'wild') { this.phase = 'color'; this.pend = { type: 'color', p: this.current, value: 'wild', start: true }; }
    }
    if (this.V.allWild) this.color = null;
  };

  /* ---------------- deck handling ---------------- */
  P.reshuffle = function () {
    if (this.discard.length <= 1) return false;
    var top = this.discard.pop();
    var self = this;
    var back = this.discard;
    back.forEach(function (c) { delete c.hidden; delete c.claim; c.id = self.newId(); });
    this.discard = [top];
    this.deck = shuffle(back, this.rnd).concat(this.deck);
    this.emit({ t: 'reshuffle', count: back.length });
    this.note('The discard pile is shuffled into a new draw pile.');
    return true;
  };
  P.drawOne = function () {
    if (!this.deck.length && !this.reshuffle()) return null;
    return this.deck.pop();
  };
  // returns array of drawn cards
  P.drawCards = function (p, n, reason) {
    var pl = this.players[p];
    var got = [];
    for (var i = 0; i < n; i++) {
      var c = this.drawOne();
      if (!c) break;
      pl.hand.push(c);
      got.push(c);
      if (this.checkMercy(p)) break;
    }
    if (got.length) {
      if (pl.hand.length > 1) pl.declared = false;
      if (this.unoPending === p && pl.hand.length > 1) this.unoPending = null;
      this.emit({ t: 'draw', p: p, n: got.length, ids: got.map(function (c) { return c.id; }), reason: reason || 'draw' });
      if (reason && reason !== 'draw') this.note(this.pname(p) + ' draws ' + got.length + ' card' + (got.length > 1 ? 's' : '') + '.');
    }
    return got;
  };
  P.drawUntil = function (p, pred, reason) {
    var got = [];
    var guard = 0;
    while (guard++ < 200) {
      if (this.players[p].out) break;
      var c = this.drawOne();
      if (!c) break;
      this.players[p].hand.push(c);
      got.push(c);
      if (this.checkMercy(p)) break;
      if (pred(c)) break;
    }
    if (got.length) {
      this.players[p].declared = false;
      if (this.unoPending === p) this.unoPending = null;
      this.emit({ t: 'draw', p: p, n: got.length, ids: got.map(function (c) { return c.id; }), reason: reason || 'draw' });
      this.note(this.pname(p) + ' draws ' + got.length + ' card' + (got.length > 1 ? 's' : '') + '.');
    }
    return got;
  };

  P.checkMercy = function (p) {
    if (!this.o.mercy) return false;
    var pl = this.players[p];
    if (pl.out || pl.hand.length < (+this.o.mercyLimit || 25)) return false;
    pl.out = true;
    this.discard = pl.hand.concat(this.discard); // set aside until the next reshuffle
    pl.hand = [];
    this.emit({ t: 'eliminate', p: p });
    this.note(pl.name + ' hits ' + (this.o.mercyLimit || 25) + ' cards and is knocked out by the Mercy Rule!');
    var alive = this.active();
    if (alive.length === 1) {
      alive[0].ko++;
      this.endRound(alive[0].id);
    } else {
      // remember KOs for the winner bonus
      this.kos = (this.kos || 0) + 1;
    }
    return true;
  };

  /* ---------------- legality ---------------- */
  P.stackValue = function (f) {
    var m = this.meta(f);
    return m.draw && f.v !== 'wildtarget2' ? m.draw : 0;
  };
  P.canStack = function (f) {
    var v = this.stackValue(f);
    if (!v) return false;
    if (this.o.stackRule === 'higher') return v >= this.stackMin;
    var top = this.topFace();
    // house rule: same kind, or a bigger draw card on top of a smaller one
    return f.v === top.v || v > this.stackMin;
  };
  P.canPlayFace = function (f) {
    if (this.drawStack > 0) return this.canStack(f);
    if (this.V.allWild) return true;
    var top = this.topFace();
    if (f.c === 'wild') return true;
    if (f.c === this.color) return true;
    if (top && top.c !== 'wild' && top.v === f.v) return true;
    return false;
  };
  P.playableIds = function (p) {
    var self = this;
    var pl = this.players[p];
    if (pl.out || this.gameOver) return [];
    var liarOnly = function (c) { return self.V.liar && c.l; };
    if (this.phase === 'turn' && p === this.current) {
      return pl.hand.filter(function (c) { return !liarOnly(c) && self.canPlayFace(self.face(c)); }).map(function (c) { return c.id; });
    }
    if (this.phase === 'drawn' && p === this.current) {
      var c = pl.hand.filter(function (x) { return x.id === self.drawnId; })[0];
      return c && !liarOnly(c) && this.canPlayFace(this.face(c)) ? [c.id] : [];
    }
    if (this.phase === 'turn' && this.o.jumpIn && p !== this.current && this.drawStack === 0) {
      var top = this.topFace();
      var tc = this.topCard();
      if (!top || top.c === 'wild' || tc.hidden) return [];
      return pl.hand.filter(function (c) { var f = self.face(c); return f.c === top.c && f.v === top.v; }).map(function (c) { return c.id; });
    }
    return [];
  };

  P.actor = function () {
    if (this.gameOver || this.phase === 'roundOver') return null;
    if (this.pend && this.pend.actor != null) return this.pend.actor;
    return this.current;
  };
  P.waitingOn = function () {
    if (this.phase === 'roundOver') return this.players.filter(function (p) { return p.kind !== 'bot'; }).map(function (p) { return p.id; });
    var a = this.actor();
    return a == null ? [] : [a];
  };

  P.legalActions = function (p) {
    var self = this;
    var out = [];
    var pl = this.players[p];
    if (!pl || this.gameOver) return out;
    if (this.phase === 'roundOver') { out.push({ type: 'nextRound' }); return out; }
    if (pl.out) return out;
    // UNO calling / catching is available to everyone at any time it applies
    if (this.unoPending != null && this.unoPending !== p) out.push({ type: 'catch' });
    if (this.unoPending === p) out.push({ type: 'uno' });
    var actor = this.actor();
    if (p === this.current && this.phase === 'turn' && pl.hand.length === 2 && !pl.declared) out.push({ type: 'uno' });

    if (this.phase === 'turn' || this.phase === 'drawn') {
      this.playableIds(p).forEach(function (id) { out.push({ type: 'play', cardId: id }); });
      if (p === this.current) {
        if (this.phase === 'turn') out.push({ type: 'draw' });
        if (this.phase === 'drawn' && !this.o.forcePlay) out.push({ type: 'pass' });
        if (this.phase === 'drawn' && this.o.forcePlay && !this.playableIds(p).length) out.push({ type: 'pass' });
        if (this.V.liar && this.phase === 'turn' && this.drawStack === 0) {
          pl.hand.forEach(function (c) { if (c.l) out.push({ type: 'bluff', cardId: c.id }); });
        }
      }
      return out;
    }
    if (actor !== p) return out;
    var pend = this.pend || {};
    switch (this.phase) {
      case 'color':
        this.colors().forEach(function (c) { out.push({ type: 'color', color: c }); });
        break;
      case 'target':
        this.players.forEach(function (o) { if (o.id !== p && !o.out) out.push({ type: 'target', target: o.id }); });
        break;
      case 'challenge':
        out.push({ type: 'accept' });
        out.push({ type: 'challenge' });
        break;
      case 'liar':
        out.push({ type: 'accept' });
        out.push({ type: 'challenge' });
        break;
      case 'roulette':
        this.colors().forEach(function (c) { out.push({ type: 'color', color: c }); });
        break;
      case 'dare':
        out.push({ type: 'dareDo' });
        out.push({ type: 'dareDraw' });
        break;
      case 'dareActive':
        out.push({ type: 'dareDone' });
        out.push({ type: 'dareFail' });
        break;
      case 'launch':
        out.push({ type: 'hit' });
        break;
    }
    return out;
  };

  /* ---------------- main dispatcher ---------------- */
  P.act = function (p, a) {
    if (this.gameOver) return { ok: false, error: 'Game over' };
    if (!a || !a.type) return { ok: false, error: 'Bad action' };
    var pl = this.players[p];
    if (!pl) return { ok: false, error: 'No such seat' };
    try {
      if (a.type === 'nextRound') {
        if (this.phase !== 'roundOver') return { ok: false, error: 'Round not over' };
        this.startRound();
        return { ok: true };
      }
      if (pl.out) return { ok: false, error: 'You are out' };
      if (a.type === 'uno') return this.doUno(p);
      if (a.type === 'catch') return this.doCatch(p);
      // any other action closes the UNO catch window
      if (this.unoPending != null && this.unoPending !== p) this.unoPending = null;
      if (this.unoPending === p && (a.type === 'play' || a.type === 'draw')) this.unoPending = null;

      if (this.phase === 'turn' || this.phase === 'drawn') {
        if (a.type === 'play') return this.doPlay(p, a.cardId, null);
        if (a.type === 'bluff') return this.doBluff(p, a.cardId, a.claim);
        if (p !== this.current) return { ok: false, error: 'Not your turn' };
        if (a.type === 'draw' && this.phase === 'turn') return this.doDraw(p);
        if (a.type === 'pass' && this.phase === 'drawn') {
          if (this.o.forcePlay && this.playableIds(p).length) return { ok: false, error: 'You must play the drawn card' };
          this.note(this.pname(p) + ' keeps the card.');
          this.endTurn(1);
          return { ok: true };
        }
        return { ok: false, error: 'Illegal move' };
      }
      if (this.actor() !== p) return { ok: false, error: 'Not your decision' };
      switch (this.phase) {
        case 'color': return this.doColor(p, a.color);
        case 'target': return this.doTarget(p, a.target);
        case 'challenge': return a.type === 'challenge' ? this.doChallenge(p) : this.doAcceptWild(p);
        case 'liar': return a.type === 'challenge' ? this.liarChallenge(p) : this.liarAccept(p);
        case 'roulette': return this.doRoulette(p, a.color);
        case 'dare': return a.type === 'dareDo' ? this.dareDo(p) : this.dareDraw(p);
        case 'dareActive': return this.dareResolve(p, a.type === 'dareDone');
        case 'launch': return this.doHit(p);
      }
      return { ok: false, error: 'Illegal move' };
    } catch (err) {
      return { ok: false, error: 'Engine error: ' + err.message };
    }
  };

  /* ---------------- UNO shout ---------------- */
  P.doUno = function (p) {
    var pl = this.players[p];
    if (this.unoPending === p) {
      this.unoPending = null;
      pl.declared = true;
      this.emit({ t: 'uno', p: p });
      this.note(pl.name + ' shouts UNO!');
      return { ok: true };
    }
    if (p === this.current && this.phase === 'turn' && pl.hand.length === 2 && !pl.declared) {
      pl.declared = true;
      this.emit({ t: 'uno', p: p });
      this.note(pl.name + ' shouts UNO!');
      return { ok: true };
    }
    return { ok: false, error: 'You can only call UNO with two cards (before playing) or right after playing your second-to-last card' };
  };
  P.doCatch = function (p) {
    var v = this.unoPending;
    if (v == null || v === p) return { ok: false, error: 'Nobody to catch' };
    this.unoPending = null;
    this.emit({ t: 'caught', p: v, by: p });
    this.note(this.pname(p) + ' catches ' + this.pname(v) + ' without UNO! +' + this.o.unoPenalty);
    this.drawCards(v, this.o.unoPenalty, 'uno');
    return { ok: true };
  };
  P.afterPlayUno = function (p) {
    var pl = this.players[p];
    if (pl.hand.length === 1) {
      if (pl.declared) { /* already shouted */ }
      else this.unoPending = p;
    } else if (pl.hand.length !== 1) {
      pl.declared = false;
    }
  };

  /* ---------------- play ---------------- */
  P.takeFromHand = function (p, id) {
    var h = this.players[p].hand;
    for (var i = 0; i < h.length; i++) if (h[i].id === id) return h.splice(i, 1)[0];
    return null;
  };

  P.doPlay = function (p, cardId, claimFace) {
    var pl = this.players[p];
    if (this.playableIds(p).indexOf(cardId) < 0) return { ok: false, error: 'That card can\'t be played now' };
    var jumpIn = p !== this.current;
    var prevColor = this.color;
    var card = this.takeFromHand(p, cardId);
    if (jumpIn) {
      this.current = p;
      this.emit({ t: 'jumpin', p: p });
      this.note(pl.name + ' jumps in!');
    }
    var f = this.face(card);
    // was the player holding a card of the active colour? (Wild Draw challenge)
    var self = this;
    var guilty = pl.hand.some(function (c) { var cf = self.face(c); return cf.c === prevColor && prevColor; });
    this.discard.push(card);
    this.drawnId = null;
    this.phase = 'resolving';
    this.emit({ t: 'play', p: p, id: card.id, face: f });
    this.note(pl.name + ' plays ' + cardName(f) + '.');
    if (f.c !== 'wild') this.color = f.c;
    this.afterPlayUno(p);
    if (!pl.hand.length) {
      // last card: draw cards still hit the next player
      var m = this.meta(f);
      if (m.draw && f.v !== 'wildtarget2') { var victim = this.nextOf(p, 1); this.drawCards(victim, m.draw + this.drawStack, 'penalty'); this.drawStack = 0; }
      if (f.c === 'wild' && !this.V.allWild) this.color = this.colors()[0];
      this.endRound(p);
      return { ok: true };
    }
    this.resolve(p, f, { prevColor: prevColor, guilty: guilty });
    return { ok: true };
  };

  P.resolve = function (p, f, ctx) {
    var v = f.v;
    var n = this.activeCount();
    if (isNum(v)) {
      var swaps = this.o.sevenO || this.o.liarSwaps;
      if (swaps && v === '7') { this.phase = 'target'; this.pend = { type: 'target', mode: 'swap', p: p, actor: p }; return; }
      if ((this.o.sevenO && v === '0') || (this.o.liarSwaps && v === '10')) { this.rotateHands(); this.endTurn(1); return; }
      this.endTurn(1);
      return;
    }
    if (f.c === 'wild' && !this.V.allWild && v !== 'roulette') {
      this.phase = 'color';
      this.pend = { type: 'color', p: p, actor: p, value: v, prevColor: ctx.prevColor, guilty: ctx.guilty };
      return;
    }
    this.resolveAction(p, f, ctx);
  };

  P.resolveAction = function (p, f, ctx) {
    var v = f.v;
    var self = this;
    var n = this.activeCount();
    var m = this.meta(f);
    switch (v) {
      case 'skip': case 'wildskip': {
        var s = this.nextOf(p, 1);
        this.emit({ t: 'skip', p: s });
        this.note(this.pname(s) + ' is skipped.');
        this.endTurn(2);
        return;
      }
      case 'wildskip2': {
        var s1 = this.nextOf(p, 1), s2 = this.nextOf(p, 2);
        this.emit({ t: 'skip', p: s1 }); if (s2 !== p) this.emit({ t: 'skip', p: s2 });
        this.note('The next two players are skipped.');
        this.endTurn(n === 2 ? 2 : 3);
        return;
      }
      case 'reverse': case 'wildrev': {
        this.dir = -this.dir;
        this.emit({ t: 'reverse', dir: this.dir });
        this.note('Direction reversed.');
        this.endTurn(n === 2 ? 2 : 1);
        return;
      }
      case 'flip': {
        this.doFlip(p);
        return;
      }
      case 'skipall': {
        this.emit({ t: 'skipall', p: p });
        this.note('Everyone is skipped - ' + this.pname(p) + ' goes again!');
        this.endTurn(0);
        return;
      }
      case 'discardall': {
        var col = f.c;
        var pl = this.players[p];
        var dump = pl.hand.filter(function (c) { return self.face(c).c === col; });
        if (dump.length) {
          // extra cards go underneath the Discard All card
          var top = this.discard.pop();
          dump.forEach(function (c) { self.takeFromHand(p, c.id); self.discard.push(c); });
          this.discard.push(top);
          this.emit({ t: 'discardall', p: p, ids: dump.map(function (c) { return c.id; }) });
          this.note(pl.name + ' discards ' + dump.length + ' more ' + col + ' card' + (dump.length > 1 ? 's' : '') + '.');
          this.afterPlayUno(p);
          if (!pl.hand.length) { this.endRound(p); return; }
        }
        this.endTurn(1);
        return;
      }
      case 'hit2': {
        var hv = this.nextOf(p, 1);
        this.current = hv;
        this.phase = 'launch';
        this.pend = { type: 'launch', p: p, actor: hv, left: 2, mode: 'count' };
        this.note(this.pname(hv) + ' must hit the launcher twice!');
        return;
      }
      case 'wildhit': {
        var wv = this.nextOf(p, 1);
        this.current = wv;
        this.phase = 'launch';
        this.pend = { type: 'launch', p: p, actor: wv, left: 99, mode: 'untilFire' };
        this.note(this.pname(wv) + ' must hit the launcher until it fires!');
        return;
      }
      case 'wildallhit': {
        var q = p;
        for (var k = 1; k < n; k++) { q = this.nextOf(q, 1); this.launcherHit(q); if (this.phase === 'roundOver') return; }
        this.endTurn(1);
        return;
      }
      case 'trade': case 'wildswap': {
        this.phase = 'target';
        this.pend = { type: 'target', mode: 'swap', p: p, actor: p };
        return;
      }
      case 'wildtarget2': {
        this.phase = 'target';
        this.pend = { type: 'target', mode: 'draw2', p: p, actor: p };
        return;
      }
      case 'dare': case 'wilddare': {
        var dv = this.nextOf(p, 1);
        this.current = dv;
        this.phase = 'dare';
        var adult = this.o.dareDeck === 'adult';
        var cat = (adult ? DARE_CATEGORY_ADULT : DARE_CATEGORY)[this.color] || pick(adult ? ['spicy', 'party', 'confession'] : ['family', 'showoff', 'daredevil'], this.rnd);
        this.pend = { type: 'dare', p: p, actor: dv, n: m.dare || 2, category: cat };
        this.emit({ t: 'darecard', p: dv, category: cat });
        this.note(this.pname(dv) + ' must take a ' + DARE_LABEL[cat] + ' or draw ' + (m.dare || 2) + '.');
        return;
      }
      case 'roulette': {
        var rv = this.nextOf(p, 1);
        this.current = rv;
        this.phase = 'roulette';
        this.pend = { type: 'roulette', p: p, actor: rv };
        this.note(this.pname(rv) + ' must pick a colour for the Roulette...');
        return;
      }
      case 'wildcolor': {
        var cv = this.nextOf(p, 1);
        if (this.o.challenge) {
          this.current = cv;
          this.phase = 'challenge';
          this.pend = { type: 'challenge', p: p, actor: cv, value: v, n: 0, color: this.color, guilty: ctx.guilty };
          return;
        }
        this.drawColorPenalty(cv, this.color, 0);
        this.emit({ t: 'skip', p: cv });
        this.endTurn(2);
        return;
      }
      case 'wildrev4': {
        this.dir = -this.dir;
        this.emit({ t: 'reverse', dir: this.dir });
        // two players: the reverse makes it your own turn, so you take the four (unless you stack them)
        this.penalty(p, 4, n === 2 ? p : null);
        return;
      }
    }
    if (m.draw) {
      var victim = this.nextOf(p, 1);
      if ((v === 'wild4' || v === 'wild2') && this.o.challenge && !this.o.stacking && !this.V.allWild) {
        this.current = victim;
        this.phase = 'challenge';
        this.pend = { type: 'challenge', p: p, actor: victim, value: v, n: m.draw, guilty: ctx.guilty, color: this.color };
        return;
      }
      this.penalty(p, m.draw, null);
      return;
    }
    // plain wild
    this.endTurn(1);
  };

  P.penalty = function (p, n, forcedVictim) {
    var victim = forcedVictim != null ? forcedVictim : this.nextOf(p, 1);
    if (this.o.stacking) {
      this.drawStack += n;
      this.stackMin = n;
      this.current = victim;
      this.phase = 'turn';
      this.pend = null;
      this.emit({ t: 'stack', total: this.drawStack, p: victim });
      this.note(this.pname(victim) + ' must stack a draw card or take ' + this.drawStack + '!');
      return;
    }
    this.drawCards(victim, n, 'penalty');
    if (this.phase === 'roundOver') return;
    this.emit({ t: 'skip', p: victim });
    this.current = victim;
    this.endTurn(1);
  };

  P.drawColorPenalty = function (victim, color, extra) {
    var self = this;
    this.drawUntil(victim, function (c) { return self.face(c).c === color; }, 'penalty');
    if (extra && this.phase !== 'roundOver') this.drawCards(victim, extra, 'penalty');
  };

  /* ---------------- colour / target ---------------- */
  P.doColor = function (p, color) {
    if (this.colors().indexOf(color) < 0) return { ok: false, error: 'Pick a valid colour' };
    var pend = this.pend;
    this.color = color;
    this.pend = null;
    this.emit({ t: 'color', p: p, color: color });
    this.note(this.pname(p) + ' chooses ' + color + '.');
    if (pend && pend.start) { this.phase = 'turn'; return { ok: true }; }
    if (pend && pend.flipped) { this.endTurn(1); return { ok: true }; }
    this.resolveAction(p, { c: 'wild', v: pend ? pend.value : 'wild' }, pend || {});
    return { ok: true };
  };

  P.doTarget = function (p, t) {
    t = +t;
    var tp = this.players[t];
    if (!tp || tp.out || t === p) return { ok: false, error: 'Pick another player' };
    var pend = this.pend;
    this.pend = null;
    if (pend.mode === 'draw2') {
      this.note(this.pname(p) + ' targets ' + tp.name + ' with Draw Two.');
      this.emit({ t: 'target', p: p, target: t });
      this.drawCards(t, 2, 'penalty');
      if (this.phase !== 'roundOver') this.endTurn(1);
      return { ok: true };
    }
    this.swapHands(p, t);
    this.endTurn(1);
    return { ok: true };
  };

  P.swapHands = function (a, b) {
    var A = this.players[a], B = this.players[b];
    var h = A.hand; A.hand = B.hand; B.hand = h;
    A.declared = false; B.declared = false;
    if (this.unoPending === a || this.unoPending === b) this.unoPending = null;
    this.emit({ t: 'swap', a: a, b: b });
    this.note(A.name + ' swaps hands with ' + B.name + '!');
  };

  P.rotateHands = function () {
    var self = this;
    var alive = this.players.filter(function (p) { return !p.out; });
    var hands = alive.map(function (p) { return p.hand; });
    alive.forEach(function (p, i) {
      // pass your hand to the next player in the direction of play
      var from = self.dir === 1 ? (i - 1 + alive.length) % alive.length : (i + 1) % alive.length;
      p.hand = hands[from];
      p.declared = false;
    });
    this.unoPending = null;
    this.emit({ t: 'rotate', dir: this.dir });
    this.note('Everyone passes their hand ' + (this.dir === 1 ? 'clockwise' : 'anticlockwise') + '!');
  };

  /* ---------------- flip ---------------- */
  P.doFlip = function (p) {
    this.side = this.side === 'light' ? 'dark' : 'light';
    // the draw pile is turned over too
    this.deck.reverse();
    var tf = this.topFace();
    this.emit({ t: 'flip', side: this.side, p: p });
    this.note('FLIP! Everything turns to the ' + this.side.toUpperCase() + ' side.');
    if (tf.c === 'wild') {
      this.phase = 'color';
      this.pend = { type: 'color', p: p, actor: p, value: 'wild', flipped: true };
      return;
    }
    this.color = tf.c;
    this.endTurn(1);
  };

  /* ---------------- challenge ---------------- */
  P.doAcceptWild = function (p) {
    var pend = this.pend;
    this.pend = null;
    if (pend.value === 'wildcolor') this.drawColorPenalty(p, pend.color, 0);
    else this.drawCards(p, pend.n, 'penalty');
    if (this.phase === 'roundOver') return { ok: true };
    this.emit({ t: 'skip', p: p });
    this.endTurn(1);
    return { ok: true };
  };
  P.doChallenge = function (p) {
    var pend = this.pend;
    this.pend = null;
    var off = pend.p;
    if (pend.guilty) {
      this.emit({ t: 'challenge', p: p, target: off, success: true });
      this.note(this.pname(p) + ' challenges... GUILTY! ' + this.pname(off) + ' had a matching colour.');
      if (pend.value === 'wildcolor') this.drawColorPenalty(off, pend.color, 0);
      else this.drawCards(off, pend.n, 'challenge');
      if (this.phase === 'roundOver') return { ok: true };
      // challenger takes a normal turn
      this.current = p;
      this.phase = 'turn';
      this.turnNo++;
      return { ok: true };
    }
    this.emit({ t: 'challenge', p: p, target: off, success: false });
    this.note(this.pname(p) + ' challenges... and is WRONG! +2 extra.');
    if (pend.value === 'wildcolor') this.drawColorPenalty(p, pend.color, 2);
    else this.drawCards(p, pend.n + 2, 'challenge');
    if (this.phase === 'roundOver') return { ok: true };
    this.emit({ t: 'skip', p: p });
    this.endTurn(1);
    return { ok: true };
  };

  /* ---------------- roulette (No Mercy) ---------------- */
  P.doRoulette = function (p, color) {
    if (this.colors().indexOf(color) < 0) return { ok: false, error: 'Pick a colour' };
    this.pend = null;
    this.color = color;
    this.emit({ t: 'color', p: p, color: color });
    this.note(this.pname(p) + ' calls ' + color + ' and starts flipping cards...');
    var self = this;
    var got = this.drawUntil(p, function (c) { return self.face(c).c === color; }, 'roulette');
    this.emit({ t: 'roulette', p: p, color: color, n: got.length });
    if (this.phase === 'roundOver') return { ok: true };
    this.emit({ t: 'skip', p: p });
    this.endTurn(1);
    return { ok: true };
  };

  /* ---------------- dare ---------------- */
  P.dareDo = function (p) {
    var pend = this.pend;
    var list = DARES[pend.category];
    var text = pick(list, this.rnd);
    this.phase = 'dareActive';
    this.pend = assign({}, pend, { type: 'dareActive', text: text });
    this.emit({ t: 'dare', p: p, text: text, category: pend.category });
    this.note(this.pname(p) + ' takes the dare: "' + text + '"');
    return { ok: true };
  };
  P.dareDraw = function (p) {
    var pend = this.pend;
    this.pend = null;
    this.note(this.pname(p) + ' chickens out and draws ' + pend.n + '.');
    this.drawCards(p, pend.n, 'penalty');
    if (this.phase === 'roundOver') return { ok: true };
    this.emit({ t: 'skip', p: p });
    this.endTurn(1);
    return { ok: true };
  };
  P.dareResolve = function (p, done) {
    var pend = this.pend;
    this.pend = null;
    if (done) {
      this.emit({ t: 'daredone', p: p });
      this.note(this.pname(p) + ' completed the dare - no cards drawn, and it\'s their turn!');
      this.current = p;
      this.phase = 'turn';
      this.turnNo++;
      return { ok: true };
    }
    this.note(this.pname(p) + ' failed the dare and draws ' + (pend.n + 2) + '.');
    this.drawCards(p, pend.n + 2, 'penalty');
    if (this.phase === 'roundOver') return { ok: true };
    this.emit({ t: 'skip', p: p });
    this.endTurn(1);
    return { ok: true };
  };

  /* ---------------- attack launcher ---------------- */
  P.launcherRoll = function () {
    var r = this.rnd();
    if (r < 0.58) return 0;
    if (r < 0.80) return 1 + Math.floor(this.rnd() * 2);
    if (r < 0.94) return 3 + Math.floor(this.rnd() * 3);
    return 6 + Math.floor(this.rnd() * 4);
  };
  P.launcherHit = function (p) {
    var n = this.launcherRoll();
    this.emit({ t: 'launch', p: p, n: n });
    if (n === 0) { this.note(this.pname(p) + ' hits the launcher... click. Nothing!'); return 0; }
    this.note(this.pname(p) + ' hits the launcher - BOOM! ' + n + ' card' + (n > 1 ? 's' : '') + ' fly out!');
    var got = this.drawCards(p, n, 'launch');
    return got.length || n;
  };
  P.doHit = function (p) {
    var pend = this.pend;
    var n = this.launcherHit(p);
    if (this.phase === 'roundOver') return { ok: true };
    if (pend.mode === 'count') pend.left--;
    if ((pend.mode === 'count' && pend.left <= 0) || (pend.mode === 'untilFire' && n > 0)) {
      this.pend = null;
      this.emit({ t: 'skip', p: p });
      this.endTurn(1);
    }
    return { ok: true };
  };

  /* ---------------- drawing on your turn ---------------- */
  P.doDraw = function (p) {
    var self = this;
    if (this.drawStack > 0) {
      var total = this.drawStack;
      this.drawStack = 0;
      this.stackMin = 0;
      this.note(this.pname(p) + ' takes the whole stack: ' + total + ' cards!');
      this.drawCards(p, total, 'penalty');
      if (this.phase === 'roundOver') return { ok: true };
      if (this.players[p].out) { this.endTurn(1); return { ok: true }; }
      this.emit({ t: 'skip', p: p });
      this.endTurn(1);
      return { ok: true };
    }
    if (this.o.drawMode === 'launcher') {
      this.launcherHit(p);
      if (this.phase !== 'roundOver') this.endTurn(1);
      return { ok: true };
    }
    var got;
    if (this.o.drawMode === 'until') {
      got = this.drawUntil(p, function (c) { return self.canPlayFace(self.face(c)); }, 'draw');
    } else {
      got = this.drawCards(p, 1, 'draw');
      if (got.length) this.note(this.pname(p) + ' draws a card.');
    }
    if (this.phase === 'roundOver') return { ok: true };
    if (this.players[p].out) { this.endTurn(1); return { ok: true }; }
    var last = got[got.length - 1];
    if (last && !(this.V.liar && last.l) && this.canPlayFace(this.face(last))) {
      this.drawnId = last.id;
      this.phase = 'drawn';
      return { ok: true };
    }
    this.endTurn(1);
    return { ok: true };
  };

  /* ---------------- Liar's ---------------- */
  P.legalClaims = function () {
    var self = this;
    var claims = [];
    var cols = LIGHT;
    var vals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'skip', 'reverse', 'draw2'];
    cols.forEach(function (c) { vals.forEach(function (v) { var f = { c: c, v: v }; if (self.canPlayFace(f)) claims.push(f); }); });
    cols.forEach(function (c) { claims.push({ c: 'wild', v: 'wild', color: c }); claims.push({ c: 'wild', v: 'wild4', color: c }); });
    return claims;
  };
  P.doBluff = function (p, cardId, claim) {
    if (!this.V.liar) return { ok: false, error: 'Bluffing is only allowed in Liar\'s' };
    if (p !== this.current || this.phase !== 'turn' || this.drawStack > 0) return { ok: false, error: 'You can only play face-down on your own turn' };
    if (!claim || !claim.v) return { ok: false, error: 'Announce what the card is' };
    var cf = claim.c === 'wild' ? { c: 'wild', v: claim.v } : { c: claim.c, v: String(claim.v) };
    if (cf.c === 'wild' && LIGHT.indexOf(claim.color) < 0) return { ok: false, error: 'Announce a colour for the wild' };
    if (cf.c !== 'wild' && !this.canPlayFace(cf)) return { ok: false, error: 'Your announcement must be a legal play' };
    if (['wild', 'wild4'].indexOf(cf.v) < 0 && cf.c === 'wild') return { ok: false, error: 'Bad claim' };
    var held = this.players[p].hand.filter(function (c) { return c.id === cardId; })[0];
    if (!held) return { ok: false, error: 'No such card' };
    if (!held.l) return { ok: false, error: 'Only Liar cards (the ones with circles) can be played face-down' };
    var card = this.takeFromHand(p, cardId);
    var real = this.face(card);
    var truthful = real.v === cf.v && (cf.c === 'wild' || real.c === cf.c);
    var prev = { color: this.color };
    card.hidden = true;
    card.claim = cf;
    this.discard.push(card);
    this.drawnId = null;
    var victim = this.nextOf(p, 1);
    this.emit({ t: 'bluff', p: p, id: card.id, claim: cf, color: claim.color || null });
    this.note(this.pname(p) + ' plays a card face-down: "' + cardName(cf) + (cf.c === 'wild' ? ' - ' + claim.color : '') + '"');
    this.afterPlayUno(p);
    this.current = victim;
    this.phase = 'liar';
    this.pend = { type: 'liar', p: p, actor: victim, claim: cf, color: claim.color || null, truthful: truthful, id: card.id, prev: prev };
    return { ok: true };
  };
  P.liarApply = function (pend) {
    var p = pend.p;
    var cf = pend.claim;
    if (cf.c === 'wild') this.color = pend.color; else this.color = cf.c;
    if (!this.players[p].hand.length) { this.endRound(p); return; }
    // the claimed card takes effect from the liar's seat
    this.current = p;
    if (cf.c === 'wild') {
      if (cf.v === 'wild4') { this.penalty(p, 4, null); return; }
      this.endTurn(1);
      return;
    }
    this.resolve(p, cf, {});
  };
  P.liarAccept = function (victim) {
    var pend = this.pend;
    this.pend = null;
    this.emit({ t: 'liarAccept', p: victim });
    this.note(this.pname(victim) + ' believes it.');
    this.liarApply(pend);
    return { ok: true };
  };
  P.liarChallenge = function (victim) {
    var pend = this.pend;
    this.pend = null;
    var liar = pend.p;
    var card = this.discard[this.discard.length - 1];
    var real = this.face(card);
    var pen = +this.o.liarPenalty || 2;
    if (pend.truthful) {
      delete card.hidden; delete card.claim;
      this.emit({ t: 'challenge', p: victim, target: liar, success: false, reveal: real, id: card.id });
      this.note(this.pname(victim) + ' calls LIAR! ...but it really was ' + cardName(real) + '. ' + this.pname(victim) + ' draws ' + pen + '.');
      this.drawCards(victim, pen, 'challenge');
      if (this.phase === 'roundOver') return { ok: true };
      this.liarApply(pend);
      return { ok: true };
    }
    // caught lying: take the card back plus a penalty
    this.discard.pop();
    delete card.hidden; delete card.claim;
    this.players[liar].hand.push(card);
    this.color = pend.prev.color;
    this.emit({ t: 'challenge', p: victim, target: liar, success: true, reveal: real, id: card.id });
    this.note(this.pname(victim) + ' calls LIAR! It was a ' + cardName(real) + '. ' + this.pname(liar) + ' takes it back and draws ' + pen + '.');
    if (this.unoPending === liar) this.unoPending = null;
    this.players[liar].declared = false;
    this.drawCards(liar, pen, 'challenge');
    if (this.phase === 'roundOver') return { ok: true };
    this.current = victim;
    this.phase = 'turn';
    this.turnNo++;
    return { ok: true };
  };

  /* ---------------- turn flow ---------------- */
  P.endTurn = function (steps) {
    if (this.phase === 'roundOver' || this.gameOver) return;
    if (this.players[this.current].out && steps === 0) steps = 1;
    this.current = this.nextOf(this.current, steps);
    this.phase = 'turn';
    this.pend = null;
    this.drawnId = null;
    this.turnNo++;
  };

  P.endRound = function (winner) {
    if (this.phase === 'roundOver' || this.gameOver) return;
    var self = this;
    var w = this.players[winner];
    var pts = 0;
    var breakdown = [];
    this.players.forEach(function (pl) {
      if (pl.id === winner) return;
      var s = 0;
      pl.hand.forEach(function (c) { s += self.points(self.face(c)); });
      if (pl.out) s = 0;
      pts += s;
      breakdown.push({ p: pl.id, points: s, cards: pl.hand.length, out: pl.out });
    });
    var koBonus = 0;
    if (this.vid === 'nomercy') {
      koBonus = this.players.filter(function (pl) { return pl.out; }).length * 250;
      pts += koBonus;
    }
    w.score += pts;
    this.phase = 'roundOver';
    this.pend = null;
    this.unoPending = null;
    var over = this.o.scoreMode !== 'points' || w.score >= this.o.target;
    this.roundResult = { winner: winner, points: pts, koBonus: koBonus, breakdown: breakdown, gameOver: over };
    this.emit({ t: 'roundEnd', winner: winner, points: pts, gameOver: over });
    this.note(w.name + ' wins the round' + (this.o.scoreMode === 'points' ? ' and scores ' + pts + ' points' : '') + '!');
    if (over) {
      this.gameOver = true;
      this.emit({ t: 'gameEnd', winner: winner });
    }
  };

  /* ---------------- views ---------------- */
  P.cardView = function (card, viewer, where) {
    // returns which faces the viewer can see. a = light/front, b = dark/back
    if (!this.V.flip) {
      var visible = where === 'mine' || where === 'discard' || (where === 'other' && this.phase === 'roundOver');
      if (where === 'discard' && card.hidden) return { id: card.id, a: null, b: 'back', claim: card.claim };
      return { id: card.id, a: visible ? (card.l ? { c: card.c, v: card.v, l: 1 } : { c: card.c, v: card.v }) : null, b: 'back' };
    }
    var activeVisible = where === 'mine' || where === 'discard' || (where === 'other' && this.phase === 'roundOver');
    var lightVisible = this.side === 'light' ? activeVisible : !activeVisible;
    return {
      id: card.id,
      a: lightVisible ? clone(card.light) : null,
      b: lightVisible ? null : clone(card.dark)
    };
  };

  P.view = function (viewer) {
    var self = this;
    var me = this.players[viewer];
    var legal = viewer != null && me ? this.legalActions(viewer) : [];
    var top = this.discard.slice(-14).map(function (c) { return self.cardView(c, viewer, 'discard'); });
    var deckTop = this.deck[this.deck.length - 1];
    var pend = null;
    if (this.pend) {
      pend = { type: this.pend.type, p: this.pend.p, actor: this.pend.actor, mode: this.pend.mode, n: this.pend.n, value: this.pend.value, category: this.pend.category, text: this.pend.text, left: this.pend.left, claim: this.pend.claim, color: this.pend.color };
    }
    return {
      engine: 'uno',
      variant: this.vid,
      name: this.V.name,
      options: this.o,
      round: this.round,
      turnNo: this.turnNo,
      phase: this.phase,
      current: this.current,
      actor: this.actor(),
      dir: this.dir,
      color: this.color,
      side: this.side,
      dealer: this.dealer,
      drawStack: this.drawStack,
      deckCount: this.deck.length,
      deckFace: this.V.flip && deckTop ? this.cardView(deckTop, viewer, 'deck') : null,
      discard: top,
      discardCount: this.discard.length,
      unoPending: this.unoPending,
      drawnId: this.drawnId,
      pend: pend,
      me: viewer,
      players: this.players.map(function (pl) {
        return {
          id: pl.id, name: pl.name, kind: pl.kind, level: pl.level, avatar: pl.avatar, score: pl.score, out: pl.out, declared: pl.declared,
          count: pl.hand.length,
          hand: pl.hand.map(function (c) { return self.cardView(c, viewer, pl.id === viewer ? 'mine' : 'other'); })
        };
      }),
      legal: legal,
      claims: this.V.liar && this.phase === 'turn' && viewer === this.current ? this.legalClaims() : null,
      roundResult: this.roundResult,
      gameOver: this.gameOver,
      log: this.log.slice(-30)
    };
  };

  /* ================================================================== */
  /* DOS engine                                                          */
  /* ================================================================== */
  function DosGame(opts, seats, rnd) {
    this.V = VARIANTS.dos;
    this.vid = 'dos';
    this.o = resolveOptions(this.V, opts);
    this.rnd = rnd || DEFAULT_RND;
    this.players = seats.map(function (s, i) {
      return { id: i, name: s.name || ('Player ' + (i + 1)), kind: s.kind || 'human', level: s.level || 'normal', avatar: s.avatar || null, hand: [], out: false, score: 0, declared: false };
    });
    this.events = [];
    this.log = [];
    this.round = 0;
    this.dealer = Math.floor(this.rnd() * this.players.length);
    this.idc = 0;
    this.idp = 'd' + Math.floor(this.rnd() * 1e6).toString(36);
    this.gameOver = false;
    this.startRound();
  }
  var D = DosGame.prototype;
  ['newId', 'emit', 'takeEvents', 'note', 'pname', 'takeFromHand', 'nextOf', 'active', 'activeCount'].forEach(function (k) { D[k] = P[k]; });
  D.dir = 1;

  D.startRound = function () {
    var self = this;
    this.round++;
    this.deck = shuffle(DECKS.dos(), this.rnd);
    this.deck.forEach(function (c) { c.id = self.newId(); });
    this.discard = [];
    this.center = [];
    this.unoPending = null;
    this.roundResult = null;
    this.pend = null;
    this.turnNo = 0;
    this.players.forEach(function (p) { p.hand = []; p.declared = false; });
    this.dealer = (this.dealer + 1) % this.players.length;
    var order = [];
    for (var r = 0; r < this.o.handSize; r++) {
      for (var k = 1; k <= this.players.length; k++) {
        var p = (this.dealer + k) % this.players.length;
        var c = this.deck.pop();
        this.players[p].hand.push(c);
        order.push([p, c.id]);
      }
    }
    this.emit({ t: 'deal', order: order, dealer: this.dealer, round: this.round });
    this.refill();
    this.current = this.nextOf(this.dealer, 1);
    this.beginTurn();
    this.note('Round ' + this.round + ' of DOS - ' + this.pname(this.dealer) + ' deals.');
  };
  D.beginTurn = function () {
    this.phase = 'turn';
    this.matched = 0;
    this.drew = false;
    this.drawnId = null;
    this.bonus = 0;
    this.doubleBonus = 0;
    this.center.forEach(function (s) { s.matched = null; });
    this.turnNo++;
  };
  D.reshuffle = function () {
    if (!this.discard.length) return false;
    var self = this;
    this.deck = shuffle(this.discard, this.rnd).concat(this.deck);
    this.deck.forEach(function (c) { c.id = self.newId(); });
    this.discard = [];
    this.emit({ t: 'reshuffle' });
    this.note('The discard pile becomes the new draw pile.');
    return true;
  };
  D.drawOne = function () {
    if (!this.deck.length && !this.reshuffle()) return null;
    return this.deck.pop();
  };
  D.drawCards = function (p, n, reason) {
    var pl = this.players[p];
    var got = [];
    for (var i = 0; i < n; i++) { var c = this.drawOne(); if (!c) break; pl.hand.push(c); got.push(c); }
    if (got.length) {
      if (pl.hand.length !== 2) pl.declared = false;
      if (this.unoPending === p) this.unoPending = null;
      this.emit({ t: 'draw', p: p, n: got.length, ids: got.map(function (c) { return c.id; }), reason: reason || 'draw' });
      if (reason !== 'draw') this.note(this.pname(p) + ' draws ' + got.length + '.');
    }
    return got;
  };
  D.refill = function () {
    var added = false;
    while (this.center.length < 2) {
      var c = this.drawOne();
      if (!c) break;
      this.center.push({ card: c, matched: null });
      added = true;
    }
    if (added) this.emit({ t: 'refill' });
  };

  // value of a hand card used against a given center target
  D.slotValue = function (slot) { return slot.card.v === 'dos' ? 2 : (slot.card.v === 'hash' ? null : +slot.card.v); };
  D.checkMatch = function (slot, cards) {
    // returns {ok, color} - color: 'single', 'double' or null
    var target = slot.card;
    var tv = this.slotValue(slot);
    var tc = target.c; // dos wild in center: matcher picks colour => any colour matches
    var anyColor = target.v === 'dos';
    function cval(c) { return c.v === 'dos' ? 2 : (c.v === 'hash' ? null : +c.v); }
    function colorOk(c) { return anyColor || c.c === 'wild' || c.c === tc; }
    if (cards.length === 1) {
      var c = cards[0];
      var v = cval(c);
      var ok = tv == null ? true : (v == null ? true : v === tv);
      if (tv == null && v != null && v > 10) ok = false;
      if (!ok) return { ok: false };
      return { ok: true, bonus: colorOk(c) ? 'single' : null };
    }
    if (cards.length === 2) {
      var a = cval(cards[0]), b = cval(cards[1]);
      var ok2;
      if (tv == null) {
        // # in center: any two cards adding up to 10 or less
        var s = (a == null ? 1 : a) + (b == null ? 1 : b);
        ok2 = s <= 10;
      } else if (a == null && b == null) ok2 = tv >= 2;
      else if (a == null) ok2 = tv - b >= 1 && tv - b <= 10;
      else if (b == null) ok2 = tv - a >= 1 && tv - a <= 10;
      else ok2 = a + b === tv;
      if (!ok2) return { ok: false };
      return { ok: true, bonus: colorOk(cards[0]) && colorOk(cards[1]) ? 'double' : null };
    }
    return { ok: false };
  };

  D.legalActions = function (p) {
    var self = this;
    var out = [];
    var pl = this.players[p];
    if (!pl || this.gameOver) return out;
    if (this.phase === 'roundOver') return [{ type: 'nextRound' }];
    if (this.unoPending != null && this.unoPending !== p) out.push({ type: 'catch' });
    if (this.unoPending === p) out.push({ type: 'uno' });
    if (p !== this.current) return out;
    if (this.unoPending !== p && !pl.declared && (pl.hand.length === 2 || (this.phase === 'turn' && pl.hand.length <= 4))) out.push({ type: 'uno' });
    if (this.phase === 'turn' || this.phase === 'drawn') {
      // enumerate matches
      var hand = pl.hand;
      this.center.forEach(function (slot, si) {
        if (slot.matched) return;
        hand.forEach(function (c, i) {
          if (self.phase === 'drawn' && c.id !== self.drawnId) return;
          if (self.checkMatch(slot, [c]).ok) out.push({ type: 'match', slot: si, cards: [c.id] });
        });
        for (var i = 0; i < hand.length; i++) for (var j = i + 1; j < hand.length; j++) {
          if (self.phase === 'drawn' && hand[i].id !== self.drawnId && hand[j].id !== self.drawnId) continue;
          if (self.checkMatch(slot, [hand[i], hand[j]]).ok) out.push({ type: 'match', slot: si, cards: [hand[i].id, hand[j].id] });
        }
      });
      if (this.matched > 0) out.push({ type: 'endTurn' });
      if (this.matched === 0 && this.phase === 'turn' && !this.drew) out.push({ type: 'draw' });
      if (this.matched === 0 && this.phase === 'drawn') hand.forEach(function (c) { out.push({ type: 'place', cardId: c.id }); });
    }
    if (this.phase === 'bonus') pl.hand.forEach(function (c) { out.push({ type: 'place', cardId: c.id }); });
    return out;
  };
  D.actor = function () { return this.phase === 'roundOver' || this.gameOver ? null : this.current; };
  D.waitingOn = function () {
    if (this.phase === 'roundOver') return this.players.filter(function (p) { return p.kind !== 'bot'; }).map(function (p) { return p.id; });
    return this.gameOver ? [] : [this.current];
  };

  D.act = function (p, a) {
    if (this.gameOver) return { ok: false, error: 'Game over' };
    try {
      if (a.type === 'nextRound') { if (this.phase !== 'roundOver') return { ok: false, error: 'Round not over' }; this.startRound(); return { ok: true }; }
      if (a.type === 'uno') return this.doDos(p);
      if (a.type === 'catch') return this.doCatch(p);
      if (this.unoPending != null && this.unoPending !== p) this.unoPending = null;
      if (p !== this.current) return { ok: false, error: 'Not your turn' };
      if (a.type === 'match') return this.doMatch(p, +a.slot, a.cards || []);
      if (a.type === 'endTurn') return this.finishTurn(p);
      if (a.type === 'draw') return this.doDraw(p);
      if (a.type === 'place') return this.doPlace(p, a.cardId);
      return { ok: false, error: 'Illegal move' };
    } catch (err) {
      return { ok: false, error: 'Engine error: ' + err.message };
    }
  };
  D.doDos = function (p) {
    var pl = this.players[p];
    if (this.unoPending === p || (p === this.current && this.phase === 'turn' && pl.hand.length <= 4) || pl.hand.length === 2) {
      if (this.unoPending === p) this.unoPending = null;
      pl.declared = true;
      this.emit({ t: 'uno', p: p, word: 'DOS' });
      this.note(pl.name + ' shouts DOS!');
      return { ok: true };
    }
    return { ok: false, error: 'Call DOS when you are down to two cards' };
  };
  D.doCatch = function (p) {
    var v = this.unoPending;
    if (v == null || v === p) return { ok: false, error: 'Nobody to catch' };
    this.unoPending = null;
    this.emit({ t: 'caught', p: v, by: p });
    this.note(this.pname(p) + ' catches ' + this.pname(v) + ' without DOS! +' + this.o.unoPenalty);
    this.drawCards(v, this.o.unoPenalty, 'uno');
    return { ok: true };
  };
  D.checkDos = function (p) {
    var pl = this.players[p];
    if (pl.hand.length === 2 && !pl.declared) this.unoPending = p;
    if (pl.hand.length !== 2) { if (this.unoPending === p) this.unoPending = null; }
  };
  D.doMatch = function (p, si, ids) {
    var self = this;
    if (this.phase !== 'turn' && this.phase !== 'drawn') return { ok: false, error: 'You can\'t match now' };
    var slot = this.center[si];
    if (!slot || slot.matched) return { ok: false, error: 'Pick an unmatched Center Row card' };
    if (ids.length < 1 || ids.length > 2 || (ids.length === 2 && ids[0] === ids[1])) return { ok: false, error: 'Match with one or two cards' };
    var pl = this.players[p];
    var cards = ids.map(function (id) { return pl.hand.filter(function (c) { return c.id === id; })[0]; });
    if (cards.some(function (c) { return !c; })) return { ok: false, error: 'Card not in hand' };
    if (this.phase === 'drawn' && ids.indexOf(this.drawnId) < 0) return { ok: false, error: 'After drawing you may only match using the drawn card' };
    var r = this.checkMatch(slot, cards);
    if (!r.ok) return { ok: false, error: ids.length === 1 ? 'Number must match the Center Row card' : 'The two cards must add up to the Center Row number' };
    ids.forEach(function (id) { self.takeFromHand(p, id); });
    slot.matched = cards;
    this.matched++;
    if (r.bonus === 'single') this.bonus++;
    if (r.bonus === 'double') { this.bonus++; this.doubleBonus++; }
    this.emit({ t: 'match', p: p, slot: si, ids: ids, bonus: r.bonus });
    this.note(pl.name + (ids.length === 1 ? ' makes a single match' : ' makes a DOUBLE match') + ' on ' + cardName(slot.card) + (r.bonus ? ' - ' + (r.bonus === 'double' ? 'DOUBLE COLOR MATCH!' : 'color match!') : '') + '.');
    this.checkDos(p);
    if (this.phase === 'drawn' || !pl.hand.length) return this.finishTurn(p);
    return { ok: true };
  };
  D.doDraw = function (p) {
    if (this.matched > 0 || this.drew) return { ok: false, error: 'You can\'t draw now' };
    var got = this.drawCards(p, 1, 'draw');
    this.note(this.pname(p) + ' draws a card.');
    this.drew = true;
    this.drawnId = got.length ? got[0].id : null;
    this.phase = 'drawn';
    return { ok: true };
  };
  D.doPlace = function (p, id) {
    var pl = this.players[p];
    if (this.phase === 'drawn' && this.matched === 0) {
      var c = this.takeFromHand(p, id);
      if (!c) return { ok: false, error: 'No such card' };
      this.center.push({ card: c, matched: null });
      this.emit({ t: 'place', p: p, id: c.id });
      this.note(pl.name + ' adds ' + cardName(c) + ' to the Center Row.');
      this.checkDos(p);
      if (!pl.hand.length) { this.endRound(p); return { ok: true }; }
      this.nextPlayer();
      return { ok: true };
    }
    if (this.phase === 'bonus') {
      var b = this.takeFromHand(p, id);
      if (!b) return { ok: false, error: 'No such card' };
      this.center.push({ card: b, matched: null });
      this.emit({ t: 'place', p: p, id: b.id, bonus: true });
      this.note(pl.name + ' adds ' + cardName(b) + ' to the Center Row (bonus).');
      this.checkDos(p);
      this.bonus--;
      if (!pl.hand.length) { this.endRound(p); return { ok: true }; }
      if (this.bonus <= 0) this.nextPlayer();
      return { ok: true };
    }
    return { ok: false, error: 'You can\'t place a card now' };
  };
  D.finishTurn = function (p) {
    var self = this;
    if (this.matched === 0) return { ok: false, error: 'Make a match first, or draw' };
    // 1. matched cards + their center cards go to the discard pile
    var keep = [];
    this.center.forEach(function (s) {
      if (s.matched) { self.discard.push(s.card); s.matched.forEach(function (c) { self.discard.push(c); }); }
      else keep.push(s);
    });
    this.center = keep;
    this.emit({ t: 'clearMatches', p: p });
    // double colour match: everyone else draws one
    var pl = this.players[p];
    if (this.doubleBonus > 0) {
      this.note('Double Color Match bonus! Everyone else draws ' + this.doubleBonus + '.');
      this.players.forEach(function (o) { if (o.id !== p) self.drawCards(o.id, self.doubleBonus, 'penalty'); });
    }
    if (!pl.hand.length) { this.endRound(p); return { ok: true }; }
    // 2. refill to two
    this.refill();
    // 3. colour-match bonus: add cards from your hand
    if (this.bonus > 0) {
      this.phase = 'bonus';
      this.note(pl.name + ' gets to add ' + this.bonus + ' card' + (this.bonus > 1 ? 's' : '') + ' to the Center Row.');
      return { ok: true };
    }
    this.nextPlayer();
    return { ok: true };
  };
  D.nextPlayer = function () {
    this.current = this.nextOf(this.current, 1);
    this.beginTurn();
  };
  D.endRound = function (winner) {
    var self = this;
    var w = this.players[winner];
    var pts = 0;
    var breakdown = [];
    this.players.forEach(function (pl) {
      if (pl.id === winner) return;
      var s = 0;
      pl.hand.forEach(function (c) { s += POINTS.dos(c); });
      pts += s;
      breakdown.push({ p: pl.id, points: s, cards: pl.hand.length });
    });
    w.score += pts;
    this.phase = 'roundOver';
    this.unoPending = null;
    var over = this.o.scoreMode !== 'points' || w.score >= this.o.target;
    this.roundResult = { winner: winner, points: pts, breakdown: breakdown, gameOver: over };
    this.emit({ t: 'roundEnd', winner: winner, points: pts, gameOver: over });
    this.note(w.name + ' wins the round!');
    if (over) { this.gameOver = true; this.emit({ t: 'gameEnd', winner: winner }); }
  };
  D.view = function (viewer) {
    var self = this;
    function cv(c, visible) { return { id: c.id, a: visible ? { c: c.c, v: c.v } : null, b: 'back' }; }
    return {
      engine: 'dos',
      variant: 'dos',
      name: this.V.name,
      options: this.o,
      round: this.round,
      turnNo: this.turnNo,
      phase: this.phase,
      current: this.current,
      actor: this.actor(),
      dir: 1,
      color: null,
      side: 'light',
      dealer: this.dealer,
      drawStack: 0,
      deckCount: this.deck.length,
      discard: this.discard.slice(-10).map(function (c) { return cv(c, true); }),
      discardCount: this.discard.length,
      center: this.center.map(function (s) { return { card: cv(s.card, true), matched: s.matched ? s.matched.map(function (c) { return cv(c, true); }) : null }; }),
      matched: this.matched,
      bonus: this.bonus,
      drew: this.drew,
      drawnId: this.drawnId,
      unoPending: this.unoPending,
      pend: null,
      me: viewer,
      players: this.players.map(function (pl) {
        return {
          id: pl.id, name: pl.name, kind: pl.kind, level: pl.level, avatar: pl.avatar, score: pl.score, out: false, declared: pl.declared,
          count: pl.hand.length,
          hand: pl.hand.map(function (c) { return cv(c, pl.id === viewer || self.phase === 'roundOver'); })
        };
      }),
      legal: viewer != null && this.players[viewer] ? this.legalActions(viewer) : [],
      roundResult: this.roundResult,
      gameOver: this.gameOver,
      log: this.log.slice(-30)
    };
  };

  /* ================================================================== */
  // other card-game families (e.g. the Desi games in patti.js) register themselves here
  var FACTORIES = {};
  function register(defs) {
    Object.keys(defs.variants || {}).forEach(function (id) {
      VARIANTS[id] = defs.variants[id];
      FACTORIES[id] = defs.create;
    });
    Object.keys(defs.options || {}).forEach(function (k) { OPTION_DEFS[k] = defs.options[k]; });
  }

  function createGame(variantId, opts, seats, rnd) {
    if (FACTORIES[variantId]) return FACTORIES[variantId](variantId, opts, seats, rnd);
    if (variantId === 'dos') return new DosGame(opts, seats, rnd);
    return new UnoGame(variantId, opts, seats, rnd);
  }

  return {
    VARIANTS: VARIANTS,
    OPTION_DEFS: OPTION_DEFS,
    META: META,
    DECKS: DECKS,
    POINTS: POINTS,
    LIGHT: LIGHT,
    DARK: DARK,
    DARES: DARES,
    DARE_LABEL: DARE_LABEL,
    cardName: cardName,
    isNum: isNum,
    resolveOptions: resolveOptions,
    createGame: createGame,
    register: register,
    UnoGame: UnoGame,
    DosGame: DosGame
  };
});
