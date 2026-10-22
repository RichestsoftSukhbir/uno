// Pro hall: rule checks + CPU-only games for Texas Hold'em, Blackjack, Indian Rummy and Twenty-Nine.
const E = require('../public/js/shared/engine.js');
require('../public/js/shared/patti.js');
const X = require('../public/js/shared/pro.js');
const B = require('../public/js/shared/bots.js');
let failures = 0, passed = 0;
function check(name, cond, info) { if (cond) { passed++; return; } failures++; console.log('FAIL', name, info !== undefined ? JSON.stringify(info) : ''); }
let uid = 0;
const card = code => ({ id: 'z' + (uid++), r: code.slice(0, -1), s: code.slice(-1) });
const cards = s => s.split(' ').map(card);

/* poker hand ranking */
{
  const h = s => X.bestHand(cards(s));
  check('straight flush beats quads', h('9H 10H JH QH KH 2C 2D')[0] === 8 && h('AS AH AD AC KS 2C 3D')[0] === 7);
  check('wheel A-2-3-4-5 is a 5-high straight', JSON.stringify(h('AS 2H 3D 4C 5S 9H KD')) === '[4,5]', h('AS 2H 3D 4C 5S 9H KD'));
  check('full house from two trips takes the higher trips', JSON.stringify(h('KS KH KD 9C 9S 9H 2D')) === '[6,13,9]', h('KS KH KD 9C 9S 9H 2D'));
  check('flush kickers compared', X.eval5(cards('AH 9H 7H 5H 3H'))[0] === 5);
  check('two pair + best kicker', JSON.stringify(h('QS QH 5D 5C AS 2H 3D')) === '[2,12,5,14]', h('QS QH 5D 5C AS 2H 3D'));
}
/* blackjack values */
{
  check('A+K = 21 soft', X.bjValue(cards('AS KD')).total === 21);
  check('A+A+9 = 21', X.bjValue(cards('AS AD 9C')).total === 21);
  check('K+Q+5 = 25 bust', X.bjValue(cards('KS QD 5C')).total === 25);
}
/* rummy grouping */
{
  const a1 = X.rummyArrange(cards('3H 4H 5H 7S 8S 9S 10S KC KD KH 2D 2C 2S'), 'Q');
  check('valid: pure 3-4-5H, pure 7-10S, set of Kings, set of 2s', a1.valid && a1.pure >= 2, a1);
  const a2 = X.rummyArrange(cards('3H 4H 5H 7S 9S QC KC KD KH 2D 2C 2S AD'), '9');
  check('wild 9 fills 7-8-9S? no: 7S 9S + wild... (9S is itself wild)', a2.seq >= 1);
  const a3 = X.rummyArrange(cards('3H 4H 6H 7S 8S 9S KC KD KH 2D 2C 2S 5C'), '5');
  check('5C is wild: 3-4-(5)-6H impure, 7-8-9S pure -> valid', a3.valid, a3);
  const a4 = X.rummyArrange(cards('3H 5H 7H 9S JS KC 2D 4C 6S 8D 10C QH AS'), '2');
  check('no melds: penalty counts everything except the wild 2, capped at 80', a4.penalty === 80 && !a4.valid, a4.penalty);
  const a5 = X.rummyArrange(cards('QH KH AH 2S 3S 4S 9C 9D 9H 5D 6D 7D 8D'), 'J');
  check('Q-K-A is a valid sequence, K-A-2 is not needed', a5.valid, a5);
  const a6 = X.rummyArrange(cards('KH AH 2H 5S 6S 7S 9C 9D 9H 5D 6D 7D 8D'), 'J');
  check('K-A-2 wrap-around is not a sequence', !a6.valid);
}
/* full games, CPUs only */
function play(id, opts, n, games) {
  let ok = 0;
  for (let k = 0; k < games; k++) {
    const size = Array.isArray(n) ? n[k % n.length] : n;
    const g = E.createGame(id, opts, Array.from({ length: size }, (_, i) => ({ name: 'P' + i, kind: 'bot', level: ['easy', 'normal', 'hard'][i % 3] })));
    let steps = 0, bad = null;
    const chipsTotal = () => g.players.reduce((x, p) => x + p.score, 0) + (g.pot || 0) + (id === 'blackjack' ? 0 : 0);
    const start = chipsTotal();
    while (!g.gameOver && steps++ < 20000) {
      if (g.phase === 'roundOver') { g.act(0, { type: 'nextRound' }); continue; }
      const a = g.actor();
      const act = g.autoNext() || B.decide(g.view(a), {});
      if (!act) { bad = 'no move in ' + g.phase; break; }
      const r = g.act(a, act);
      if (!r.ok) { bad = r.error + ' ' + JSON.stringify(act); break; }
      g.takeEvents();
      if (id === 'holdem' && chipsTotal() !== start) { bad = 'chips ' + chipsTotal() + ' != ' + start; break; }
      if (id === 'twentynine') { const all = g.players.reduce((x, p) => x + p.hand.length, 0) + g.stock.length + g.trick.length + g.wonPiles[0].length + g.wonPiles[1].length; if (all !== 32) { bad = 'cards ' + all; break; } }
      if (id === 'rummy') { const all = g.players.reduce((x, p) => x + p.hand.length, 0) + g.closed.length + g.open.length + 1; const want = g.players.length <= 2 ? 52 : 104; if (all !== want) { bad = 'cards ' + all; break; } }
    }
    if (!bad && g.gameOver) ok++; else { check(id + ' game', false, bad || ('stuck in ' + g.phase + ' after ' + steps)); break; }
  }
  check(id + ' ' + JSON.stringify(opts) + ' ' + games + ' CPU games finish', ok === games, ok);
}
const t0 = Date.now();
play('holdem', {}, [2, 3, 6, 8], 40);
play('holdem', { chips: 200, blinds: '25' }, [2, 4], 20);
play('blackjack', {}, [1, 3, 6], 40);
play('rummy', {}, [2, 4, 6], 12);
play('rummy', { rummyFormat: 'deals', rounds: 3 }, [3], 4);
play('twentynine', {}, 4, 40);
console.log('   (' + ((Date.now() - t0) / 1000).toFixed(1) + 's)');
console.log(failures ? 'FAILURES: ' + failures + ' (passed ' + passed + ')' : 'ALL OK (' + passed + ' checks)');
process.exit(failures ? 1 : 0);
