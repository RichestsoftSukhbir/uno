// Plays many bot-only games of every Desi game and checks invariants.
const E = require('../public/js/shared/engine.js');
const P = require('../public/js/shared/patti.js');
const B = require('../public/js/shared/bots.js');
const ids = process.argv[2] ? [process.argv[2]] : Object.keys(P.GAMES);
const GAMES = +process.argv[3] || 200;
let failures = 0;
function cardsIn(g) {
  const seen = [];
  const add = c => { if (c) seen.push(c); };
  g.players.forEach(p => p.hand.forEach(add));
  ['outPile', 'pile', 'pairs', 'stock', 'deckLeft', 'board'].forEach(k => (g[k] || []).forEach(add));
  if (g.hidden) add(g.hidden);
  if (g.trick) g.trick.forEach(t => add(t.c));
  if (g.captured) g.captured.forEach(a => a.forEach(add));
  if (g.wonPiles) g.wonPiles.forEach(a => a.forEach(add));
  if (g.floor) g.floor.forEach(it => it.kind === 'card' ? add(it.c) : it.cards.forEach(add));
  return seen;
}
for (const id of ids) {
  const V = P.GAMES[id];
  const stats = { rounds: 0, steps: 0, events: {} };
  for (let gi = 0; gi < GAMES; gi++) {
    const sizes = V.allowed || [];
    let n = sizes.length ? sizes[gi % sizes.length] : V.players[0] + (gi % (V.players[1] - V.players[0] + 1));
    const seats = Array.from({ length: n }, (_, i) => ({ name: 'B' + i, kind: 'bot', level: ['easy', 'normal', 'hard'][i % 3] }));
    const opts = gi % 4 === 0 ? { rounds: 3 } : {};
    if (id === 'bluff' && gi % 5 === 0) opts.decks = '2';
    const g = E.createGame(id, opts, seats);
    const total = id === 'bluff' && opts.decks === '2' ? 104 : (id === 'teenpatti' ? null : 52);
    const mem = {};
    let steps = 0;
    while (!g.gameOver && steps < 5000) {
      steps++;
      if (g.phase === 'roundOver') { g.act(0, { type: 'nextRound' }); stats.rounds++; continue; }
      const a = g.actor();
      if (a == null) { console.log(id, 'no actor', g.phase); failures++; break; }
      const auto = g.autoNext();
      let act = auto;
      if (!act) {
        const v = g.view(a);
        act = B.decide(v, mem[a] || (mem[a] = {}));
      }
      if (!act) { console.log(id, 'bot returned nothing in phase', g.phase); failures++; break; }
      const r = g.act(a, act);
      if (!r.ok) { console.log(id, 'illegal', JSON.stringify(act).slice(0, 120), r.error, g.phase); failures++; break; }
      for (const e of g.takeEvents()) stats.events[e.t] = (stats.events[e.t] || 0) + 1;
      if (total) {
        const all = cardsIn(g);
        const uniq = new Set(all.map(c => c.id));
        if (all.length !== total || uniq.size !== total) {
          if (!(id === 'teenpatti')) { console.log(id, 'card count', all.length, uniq.size, 'expected', total, 'after', act.type, 'phase', g.phase); failures++; break; }
        }
      }
    }
    if (!g.gameOver) { console.log(id, 'did not finish', g.phase, steps); failures++; }
    stats.steps += steps;
    stats.rounds++;
  }
  console.log(id.padEnd(11), 'games', GAMES, 'rounds', stats.rounds, 'avg steps', Math.round(stats.steps / GAMES), Object.entries(stats.events).filter(([k]) => k !== 'log').map(([k, v]) => k + ':' + v).join(' '));
}
console.log(failures ? 'FAILURES: ' + failures : 'ALL OK');
process.exit(failures ? 1 : 0);
