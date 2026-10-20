// Plays thousands of bot-only games for every variant and checks invariants.
const E = require('../public/js/shared/engine.js');
const B = require('../public/js/shared/bots.js');
const variants = process.argv[2] ? [process.argv[2]] : Object.keys(E.VARIANTS);
const GAMES = +process.argv[3] || 300;
let failures = 0;
function total(g) {
  let n = g.deck.length + g.discard.length + g.players.reduce((s, p) => s + p.hand.length, 0);
  if (g.center) n += g.center.reduce((s, c) => s + 1 + (c.matched ? c.matched.length : 0), 0);
  return n;
}
for (const vid of variants) {
  const stats = { rounds: 0, steps: 0, events: {} };
  for (let gi = 0; gi < GAMES; gi++) {
    const n = 2 + (gi % 5);
    const opts = gi % 3 === 0 ? { scoreMode: 'points', target: 300, stacking: true, sevenO: true, jumpIn: true, drawMode: gi % 2 ? 'until' : 'one' } : {};
    const seats = Array.from({ length: n }, (_, i) => ({ name: 'B' + i, kind: 'bot', level: ['easy', 'normal', 'hard'][i % 3] }));
    const g = E.createGame(vid, opts, seats);
    const deckSize = total(g);
    const mem = {};
    let steps = 0;
    while (!g.gameOver && steps < 20000) {
      steps++;
      if (g.phase === 'roundOver') { g.act(0, { type: 'nextRound' }); stats.rounds++; continue; }
      // random UNO catching
      if (g.unoPending != null && Math.random() < 0.5) {
        const others = g.players.filter(p => p.id !== g.unoPending && !p.out);
        const r = Math.random() < 0.5 ? g.act(g.unoPending, { type: 'uno' }) : g.act(others[0].id, { type: 'catch' });
        if (!r.ok) { console.log(vid, 'uno/catch failed', r.error); failures++; }
      }
      const a = g.actor();
      if (a == null) { console.log(vid, 'no actor in phase', g.phase); failures++; break; }
      const v = g.view(a);
      const act = B.decide(v, mem[a] || (mem[a] = {}));
      if (!act) { console.log(vid, 'bot returned null', g.phase, JSON.stringify(v.legal).slice(0, 200)); failures++; break; }
      const r = g.act(a, act);
      if (!r.ok) {
        console.log(vid, 'illegal bot action', JSON.stringify(act), r.error, 'phase', g.phase);
        failures++;
        const fb = g.legalActions(a).find(x => !['uno', 'catch', 'bluff'].includes(x.type));
        if (!fb || !g.act(a, fb).ok) break;
      }
      for (const e of g.takeEvents()) stats.events[e.t] = (stats.events[e.t] || 0) + 1;
      const t = total(g);
      if (t !== deckSize) { console.log(vid, 'card count changed', deckSize, '->', t, 'after', JSON.stringify(act)); failures++; break; }
      const ids = new Set();
      for (const c of g.deck.concat(g.discard, ...g.players.map(p => p.hand))) { if (ids.has(c.id)) { console.log(vid, 'duplicate id'); failures++; } ids.add(c.id); }
    }
    if (!g.gameOver) { console.log(vid, 'game did not finish', g.phase, steps); failures++; }
    stats.steps += steps;
    stats.rounds++;
  }
  console.log(vid.padEnd(9), 'games', GAMES, 'rounds', stats.rounds, 'avg steps', Math.round(stats.steps / GAMES), Object.entries(stats.events).filter(([k]) => k !== 'log').map(([k, v]) => k + ':' + v).join(' '));
}
console.log(failures ? 'FAILURES: ' + failures : 'ALL OK');
process.exit(failures ? 1 : 0);
