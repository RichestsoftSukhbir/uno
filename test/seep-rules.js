// Seep rule checks against the 100-point profile (pagat.com/fishing/seep.html) and the Punjabi 30-point option.
const E = require('../public/js/shared/engine.js');
const P = require('../public/js/shared/patti.js');
const B = require('../public/js/shared/bots.js');
const R = P.SeepRules;

let failures = 0, passed = 0;
function check(name, cond, info) {
  if (cond) { passed++; return; }
  failures++;
  console.log('FAIL', name, info !== undefined ? JSON.stringify(info) : '');
}
let uid = 0;
const card = code => ({ id: 'k' + (uid++), r: code.slice(0, -1), s: code.slice(-1) });
const loose = code => ({ kind: 'card', c: card(code) });
const house = (value, owners, pakka, codes) => ({ kind: 'house', value, owners, pakka: !!pakka, cards: (codes || []).map(card) });
function ctx(floor, hand, p, teams) {
  return { floor, hand: hand.map(card), p: p || 0, phase: 'play', bid: null, sameSide: teams ? (a, b) => a % 2 === b % 2 : null };
}
const types = list => list.map(a => a.type + (a.value ? a.value : '') + (a.pakka ? 'P' : '')).sort().join(',');
const c0 = x => x.hand[0];

/* captures */
{
  const x = ctx([loose('3H'), loose('4C'), loose('7D'), loose('2S')], ['7S', 'KD']);
  const cap = R.capture(x, 7);
  check('7 captures 3+4 and the loose 7 together (all matching items)', cap.length === 3 && cap.indexOf(3) < 0, cap);
  const y = ctx([loose('5H'), loose('5C'), loose('6D')], ['10S']);
  check('10 captures 5+5, not 5+6 overlap', R.capture(y, 10).join() === '0,1');
  const z = ctx([house(11, [1], false, ['5H', '6D']), loose('JD'), loose('8C'), loose('3H')], ['JS']);
  check('J captures house of 11 + loose J + 8+3', R.capture(z, 11).length === 4);
  const w = ctx([house(12, [1], false, ['5H', '7D']), loose('2C')], ['10S']);
  check('a 10 cannot use a loose 2 to take a house of 12 (houses only by their own value)', R.capture(w, 10).length === 0 && R.capture(w, 12).join() === '0');
}

/* "9 on 9": a 9 played onto a loose 9 while holding another 9 is a pakka house */
{
  const x = ctx([loose('9H')], ['9S', '9C']);
  const opts = R.optionsAt(x, c0(x), [0]);
  check('9 on loose 9 offers capture and pakka house', types(opts) === 'build9P,capture9', types(opts));
  const y = ctx([loose('9H')], ['9S', '4C']);
  check('9 on 9 without another 9: capture only', types(R.optionsAt(y, c0(y), [0])) === 'capture9');
  const z = ctx([loose('4H'), loose('5D')], ['9S', '9C']);
  check('9 onto 4+5 (holding a 9): pakka house of 9', types(R.optionsAt(z, c0(z), [0, 1])).indexOf('build9P') >= 0);
}

/* building */
{
  const x = ctx([loose('5H')], ['6S', 'JC']);
  check('6 onto 5 builds 11 when holding a J', types(R.optionsAt(x, c0(x), [0])) === 'build11');
  const y = ctx([loose('5H')], ['6S', '4C']);
  check('cannot build 11 without a J', R.optionsAt(y, c0(y), [0]).length === 0);
  const z = ctx([loose('2H')], ['5S', '7C']);
  check('houses must be 9 or more', R.optionsAt(z, c0(z), [0]).length === 0);
}

/* cement, raise, ownership */
{
  const own = ctx([house(10, [0], false, ['6H', '4D'])], ['10S', '10C']);
  const o1 = R.optionsAt(own, c0(own), [0]);
  check('owner with two 10s may cement their own 10 house', types(o1).indexOf('cement10') >= 0, types(o1));
  const own1 = ctx([house(10, [0], false, ['6H', '4D'])], ['10S', '2C']);
  const o2 = R.optionsAt(own1, c0(own1), [0]);
  check('owner with one 10 can only capture with it', types(o2) === 'capture10', types(o2));
  check('owner may not throw their last 10', !R.legal(own1).some(a => a.type === 'throw' && a.cardId === c0(own1).id));
  const opp = ctx([house(10, [1], false, ['6H', '4D'])], ['2S', 'QC']);
  check('break an opponent\'s house: 10 + 2 = 12 holding a Q', types(R.optionsAt(opp, c0(opp), [0])) === 'raise12');
  const mine = ctx([house(10, [0], false, ['6H', '4D'])], ['2S', 'QC', '10D']);
  check('cannot break your own house', !R.optionsAt(mine, c0(mine), [0]).some(a => a.type === 'raise'));
  const pk = ctx([house(10, [1], true, ['6H', '4D', '10H'])], ['2S', 'QC']);
  check('cannot break a pakka house', !R.optionsAt(pk, c0(pk), [0]).some(a => a.type === 'raise'));
  const viaLoose = ctx([house(10, [1], false, ['6H', '4D']), loose('2C')], ['QS', 'QD']);
  check('loose cards cannot break a house', !R.optionsAt(viaLoose, c0(viaLoose), [0, 1]).some(a => a.type === 'raise'));
  const help = ctx([house(10, [2], false, ['6H', '4D']), loose('3C')], ['7S'], 0, true);
  check('partner\'s house: 7 + loose 3 cements it without holding a 10', types(R.optionsAt(help, c0(help), [0, 1])).indexOf('cement10') >= 0);
  const oppNo = ctx([house(10, [1], false, ['6H', '4D']), loose('3C')], ['7S'], 0, true);
  check('opponent\'s house: need a 10 to add to it', !R.optionsAt(oppNo, c0(oppNo), [0, 1]).some(a => a.type === 'cement'));
}

/* throwing */
{
  const x = ctx([house(11, [0], false, ['5H', '6D']), loose('2C')], ['JS', '4H', '8D']);
  check('with a house on the floor you may not throw if anything else is legal', !R.legal(x).some(a => a.type === 'throw'));
  const y = ctx([loose('2C')], ['4H', '8D']);
  check('no house: throwing is allowed', R.legal(y).some(a => a.type === 'throw'));
}

/* engine: sweeps, merging, end of deal, the 30-point profile */
function game(opts) {
  const g = E.createGame('seep', opts || {}, ['A', 'B', 'C', 'D'].map(n => ({ name: n, kind: 'bot' })));
  g.takeEvents();
  return g;
}
{
  const g = game();
  g.phase = 'play'; g.current = 0; g.stock = [card('2H')];
  g.players.forEach(p => { p.hand = [card('3C')]; });
  g.players[0].hand = [card('9S'), card('5C')];
  g.floor = [loose('4H'), loose('5D')];
  const cap = g.legalFor(0).find(a => a.type === 'capture' && g.players[0].hand.find(c => c.id === a.cardId).r === '9');
  g.act(0, cap);
  check('a sweep scores 50 in the 100-point game', g.sweepPts[0] === 50 && g.sweeps[0] === 1, g.sweepPts);
  const g2 = game();
  g2.phase = 'bidplay'; g2.bid = 9; g2.current = g2.bidder; g2.floor = [loose('4H'), loose('5D')];
  g2.players[g2.bidder].hand = [card('9S'), card('2C'), card('3C'), card('4C')];
  const m = g2.legalFor(g2.bidder).find(a => a.type === 'capture');
  g2.act(g2.bidder, m);
  check('a sweep on the bidder\'s first play scores 25', g2.sweepPts[g2.side(g2.bidder)] === 25, g2.sweepPts);
  const g3 = game({ scoring: '30' });
  g3.phase = 'play'; g3.current = 0; g3.stock = [card('2H')];
  g3.players.forEach(p => { p.hand = [card('3C')]; });
  g3.players[0].hand = [card('JS'), card('5C')];
  g3.floor = [loose('5H'), loose('6D')];
  g3.act(0, g3.legalFor(0).find(a => a.type === 'capture'));
  check('30-point sweep scores the card value (J = 11)', g3.sweepPts[0] === 11, g3.sweepPts);
  const g4 = game();
  g4.phase = 'play'; g4.current = 0;
  g4.players[0].hand = [card('6S'), card('JC'), card('2D')];
  g4.floor = [house(11, [1], false, ['5H', '6D']), loose('5C')];
  g4.act(0, { type: 'build', cardId: g4.players[0].hand[0].id, items: [1], value: 11 });
  check('a second house of 11 merges into the first, pakka', g4.floor.length === 1 && g4.floor[0].pakka && g4.floor[0].cards.length === 4 && g4.floor[0].owners.join() === '1,0', g4.floor);
  const g5 = game();
  g5.phase = 'play'; g5.current = 0;
  g5.players[0].hand = [card('6S'), card('2D')];
  g5.floor = [loose('5C')];
  const bad = g5.act(0, { type: 'build', cardId: g5.players[0].hand[0].id, items: [0], value: 11 });
  check('engine rejects a build without the capture card', !bad.ok);
  let redeals = 0;
  for (let k = 0; k < 300; k++) {
    const g6 = game({ scoring: '30' });
    if (g6.floorNext.some(c => (c.s === 'D' && c.r === '10') || (c.s === 'S' && c.r === '9'))) redeals++;
  }
  check('30-point profile never starts with 10D or 9S on the floor', redeals === 0, redeals);
}

/* house limit and seep limit (both on by default) */
{
  const x = Object.assign(ctx([house(11, [1], false, ['5H', '6D']), house(12, [3], false, ['7C', '5D']), loose('4H')], ['6S', '10C']), { houseLimit: 2 });
  check('two houses standing: no third house (6 onto 4 = 10)', !R.optionsAt(x, c0(x), [2]).some(a => a.type === 'build'));
  const y = Object.assign(ctx([house(11, [1], false, ['5H', '6D']), house(12, [3], false, ['7C', '5D']), loose('5S')], ['6S', 'JC']), { houseLimit: 2 });
  check('...but joining an existing house of the same value is fine (6 onto 5 = 11, merges)', R.optionsAt(y, c0(y), [2]).some(a => a.type === 'build' && a.merge >= 0));
  const z = ctx([house(11, [1], false, ['5H', '6D']), house(12, [3], false, ['7C', '5D']), loose('4H')], ['6S', '10C']);
  check('no limit: a third house is allowed', R.optionsAt(z, c0(z), [2]).some(a => a.type === 'build'));
  const g = game();
  g.phase = 'play'; g.current = 0; g.stock = [card('2H')];
  g.players.forEach(p => { p.hand = [card('3C')]; });
  g.sweeps[0] = 2; g.sweepPts[0] = 100;
  g.players[0].hand = [card('9S'), card('5C')];
  g.floor = [loose('4H'), loose('5D')];
  g.act(0, g.legalFor(0).find(a => a.type === 'capture' && g.players[0].hand.find(c => c.id === a.cardId).r === '9'));
  check('a third seep wipes the side\'s seep points', g.sweeps[0] === 0 && g.sweepPts[0] === 0, [g.sweeps[0], g.sweepPts[0]]);
  const g2 = game({ seepLimit: '0' });
  g2.phase = 'play'; g2.current = 0; g2.stock = [card('2H')];
  g2.players.forEach(p => { p.hand = [card('3C')]; });
  g2.sweeps[0] = 2; g2.sweepPts[0] = 100;
  g2.players[0].hand = [card('9S'), card('5C')];
  g2.floor = [loose('4H'), loose('5D')];
  g2.act(0, g2.legalFor(0).find(a => a.type === 'capture' && g2.players[0].hand.find(c => c.id === a.cardId).r === '9'));
  check('no seep limit: the third seep scores 50', g2.sweeps[0] === 3 && g2.sweepPts[0] === 150, [g2.sweeps[0], g2.sweepPts[0]]);
}

/* whole games, CPUs only, both scoring profiles and baazi */
{
  for (const opts of [{}, { scoring: '30' }, { match: 'baazi' }, { scoring: '30', match: 'baazi' }]) {
    let ok = 0;
    for (let k = 0; k < 60; k++) {
      const n = k % 2 ? 2 : 4;
      const g = E.createGame('seep', opts, Array.from({ length: n }, (_, i) => ({ name: 'P' + i, kind: 'bot', level: 'normal' })));
      let steps = 0, bad = null;
      while (!g.gameOver && steps++ < 20000) {
        if (g.phase === 'roundOver') { g.act(0, { type: 'nextRound' }); continue; }
        const a = g.actor(); const r = g.act(a, B.decide(g.view(a), {}));
        if (!r.ok) { bad = r.error; break; }
        g.takeEvents();
        const all = g.players.reduce((x, p) => x + p.hand.length, 0) + g.stock.length + (g.floorNext || []).length + g.captured[0].length + g.captured[1].length +
          g.floor.reduce((x, it) => x + (it.kind === 'card' ? 1 : it.cards.length), 0);
        if (all !== 52) { bad = 'card count ' + all; break; }
      }
      if (!bad && g.gameOver) ok++; else check('game ' + JSON.stringify(opts), false, bad || 'did not finish');
    }
    check('60 CPU games finish cleanly ' + JSON.stringify(opts), ok === 60, ok);
  }
}

console.log(failures ? 'FAILURES: ' + failures + ' (passed ' + passed + ')' : 'ALL OK (' + passed + ' checks)');
process.exit(failures ? 1 : 0);
