// Bhabhi "last card must be beaten" rule: hand-built scenarios run through the real engine.
const E = require('../public/js/shared/engine.js');
require('../public/js/shared/patti.js');
const B = require('../public/js/shared/bots.js');

let failures = 0, passed = 0;
function check(name, cond, info) {
  if (cond) { passed++; return; }
  failures++;
  console.log('FAIL', name, info !== undefined ? JSON.stringify(info) : '');
}

// players A, B, C, D = 0..3; hands written like '5S', '10H', 'AS'
let uid = 0;
const card = code => ({ id: 't' + (uid++), r: code.slice(0, -1), s: code.slice(-1) });
function setup(mode, hands, current) {
  const seats = ['A', 'B', 'C', 'D'].map(n => ({ name: n, kind: 'bot', level: 'normal' }));
  const g = E.createGame('bhabhi', mode ? { lastCard: mode } : {}, seats);
  g.takeEvents();
  g.players.forEach((p, i) => { p.hand = (hands[i] || []).map(card); p.out = !p.hand.length; p.tag = p.out ? 'SAFE' : ''; });
  g.trick = []; g.trickSize = 0; g.outPile = []; g.firstTrick = false; g.result = null;
  g.voids = g.players.map(() => ({}));
  g.phase = 'play'; g.current = current || 0;
  g.total = g.players.reduce((n, p) => n + p.hand.length, 0);
  return g;
}
const id = (g, p, code) => g.players[p].hand.find(c => c.r + c.s === code).id;
function play(g, p, code) {
  const r = g.act(p, { type: 'play', cardId: id(g, p, code) });
  if (!r.ok) throw new Error(g.players[p].name + ' could not play ' + code + ': ' + r.error);
}
const counts = g => g.players.map(p => p.hand.length);
function conserved(g) {
  const n = g.players.reduce((k, p) => k + p.hand.length, 0) + g.outPile.length + g.trick.length;
  return n === g.total;
}
// the auto step (trick collection) the controller runs by itself
function settle(g) { let a; while ((a = g.autoNext())) g.act(g.actor(), a); }

/* 1. the example from the spec: C plays their final card, D holds only a lower spade */
{
  const g = setup('trick', [['5S', '9H', 'KH', '2C', '3D'], ['3S', 'QH', '4C'], ['4S'], ['2S', '7H', '8C', '9D']]);
  play(g, 0, '5S'); play(g, 1, '3S'); play(g, 2, '4S');
  check('1 waits on D, the responder', g.phase === 'collect' && g.actor() === 3, { phase: g.phase, actor: g.actor() });
  check('1 C is not safe yet', !g.players[2].out);
  check('1 only move is to take (same for humans and CPUs)', JSON.stringify(g.legalFor(3).map(a => a.type)) === '["collect"]');
  const v = g.view(3);
  check('1 CPU decision is the same take', B.decide(v, {}).type === 'collect');
  settle(g);
  check('1 D picked up all 3 cards on the table', g.players[3].hand.length === 7, counts(g));
  check('1 C is safe after the take', g.players[2].out && g.players[2].tag === 'SAFE');
  check('1 D leads next', g.actor() === 3 && g.phase === 'play' && !g.trick.length);
  check('1 hands are A5 B2 C0 D7', JSON.stringify(counts(g)) === '[4,2,0,7]', counts(g));
  check('1 cards conserved', conserved(g));
}

/* 2. D can beat the final card: no take, D plays on and C escapes when the trick ends */
{
  const g = setup('trick', [['5S', '9H'], ['3S', 'QH'], ['4S'], ['2S', '9S', '8C']]);
  play(g, 0, '5S'); play(g, 1, '3S'); play(g, 2, '4S');
  check('2 D just plays', g.phase === 'play' && g.actor() === 3);
  check('2 D may only follow with spades', g.legalFor(3).every(a => g.players[3].hand.find(c => c.id === a.cardId).s === 'S'));
  play(g, 3, '9S'); settle(g);
  check('2 trick went out, nobody picked up', g.outPile.length === 4 && JSON.stringify(counts(g)) === '[1,1,0,2]', counts(g));
  check('2 C is safe', g.players[2].out);
  check('2 cards conserved', conserved(g));
}

/* 3. D has no spades at all: not this rule - D throws a thulla and the highest spade picks up */
{
  const g = setup('trick', [['5S', '9H'], ['3S', 'QH'], ['4S'], ['7H', '8C']]);
  play(g, 0, '5S'); play(g, 1, '3S'); play(g, 2, '4S');
  check('3 D gets a normal turn', g.phase === 'play' && g.actor() === 3);
  play(g, 3, '8C'); settle(g);
  check('3 thulla: A (highest spade, 5S) picks up', g.players[0].hand.length === 5, counts(g));
  check('3 C is safe', g.players[2].out);
  check('3 cards conserved', conserved(g));
}

/* 4. 'card' mode: D takes only the final card and the trick carries on */
{
  const g = setup('card', [['5S', '9H'], ['3S', 'QH'], ['4S'], ['2S', '7H']]);
  play(g, 0, '5S'); play(g, 1, '3S'); play(g, 2, '4S');
  settle(g);
  check('4 D took just the 4S', g.players[3].hand.some(c => c.r + c.s === '4S') && g.players[3].hand.length === 3, counts(g));
  check('4 C is safe', g.players[2].out);
  check('4 D must still play to this trick', g.phase === 'play' && g.actor() === 3 && g.trick.length === 2);
  play(g, 3, '4S'); settle(g);
  check('4 trick of A, B, D went out', g.outPile.length === 3 && JSON.stringify(counts(g)) === '[1,1,0,2]', { counts: counts(g), out: g.outPile.length });
  check('4 cards conserved', conserved(g));
}

/* 5. 'off' (classic): the rule never fires */
{
  const g = setup('off', [['5S', '9H'], ['3S', 'QH'], ['4S'], ['2S', '7H']]);
  play(g, 0, '5S'); play(g, 1, '3S'); play(g, 2, '4S');
  check('5 classic: D plays on', g.phase === 'play' && g.actor() === 3);
  play(g, 3, '2S'); settle(g);
  check('5 classic: trick goes out, C safe', g.outPile.length === 4 && g.players[2].out);
}

/* 6. round completion: only C and D still hold cards, D can't beat C's final card */
{
  const g = setup('trick', [[], [], ['4S'], ['2S', '7H']], 2);
  play(g, 2, '4S');
  check('6 D must take', g.phase === 'collect' && g.actor() === 3);
  check('6 round not over before the take', g.phase !== 'roundOver');
  settle(g);
  check('6 C safe, D is the Bhabhi', g.players[2].out && g.players[3].tag === 'BHABHI' && g.phase === 'roundOver', { phase: g.phase, tag: g.players[3].tag });
  check('6 cards conserved', conserved(g));
}

/* 7. 'card' mode, same end-game: D takes the card and is left alone - the Bhabhi */
{
  const g = setup('card', [[], [], ['4S'], ['2S', '7H']], 2);
  play(g, 2, '4S'); settle(g);
  check('7 D is the Bhabhi', g.phase === 'roundOver' && g.players[3].tag === 'BHABHI', { phase: g.phase });
  check('7 cards conserved', conserved(g));
}

/* 8. C's final card completes the trick: nobody is left to respond, so C simply escapes */
{
  const g = setup('trick', [['5S', '9H'], ['3S', 'QH'], ['6S', '8H'], ['4S']], 0);
  play(g, 0, '5S'); play(g, 1, '3S'); play(g, 2, '6S'); play(g, 3, '4S'); settle(g);
  check('8 D (last to play) is safe, no take', g.players[3].out && g.outPile.length === 4, counts(g));
}

/* 9. C leads with their final card */
{
  const g = setup('trick', [['5H', '9H'], ['3S', 'QH'], ['2S', '8D'], ['4S']], 3);
  play(g, 3, '4S');
  check('9 A has no spades: plays a normal thulla', g.phase === 'play' && g.actor() === 0);
  const g2 = setup('trick', [['2S', '9H'], ['3S', 'QH'], ['2C'], ['4S']], 3);
  play(g2, 3, '4S'); settle(g2);
  check('9 A holds only a lower spade: takes the led card and leads', g2.players[0].hand.length === 3 && g2.actor() === 0 && g2.players[3].out, counts(g2));
}

/* 10. a whole game with the rule on, CPUs only, many seeds: always finishes, cards conserved */
{
  let games = 0, fired = 0;
  for (const mode of ['trick', 'card']) {
    for (let k = 0; k < 150; k++) {
      const n = 3 + (k % 4);
      const g = E.createGame('bhabhi', { lastCard: mode }, Array.from({ length: n }, (_, i) => ({ name: 'P' + i, kind: 'bot', level: 'normal' })));
      let steps = 0;
      while (!g.gameOver && steps++ < 6000) {
        if (g.phase === 'roundOver') { g.act(0, { type: 'nextRound' }); continue; }
        const a = g.actor();
        const act = g.autoNext() || B.decide(g.view(a), {});
        const r = g.act(a, act);
        if (!r.ok) { check('10 legal CPU move', false, r.error); break; }
        g.takeEvents().forEach(e => { if (e.t === 'lastCard') fired++; });
        const all = g.players.reduce((x, p) => x + p.hand.length, 0) + g.outPile.length + g.trick.length;
        if (all !== 52) { check('10 cards conserved', false, { mode, all }); break; }
      }
      check('10 game finished (' + mode + ')', g.gameOver);
      games++;
    }
  }
  check('10 rule actually came up in play', fired > 0, fired);
  console.log('   ' + games + ' CPU games with the rule on, last-card takes: ' + fired);
}

console.log(failures ? 'FAILURES: ' + failures + ' (passed ' + passed + ')' : 'ALL OK (' + passed + ' checks)');
process.exit(failures ? 1 : 0);
