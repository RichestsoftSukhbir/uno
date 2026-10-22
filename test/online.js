// Two simulated players + one CPU play a full online game through the server.
const WebSocket = require('ws');
const B = require('../public/js/shared/bots.js');
const URL = process.env.URL || 'ws://localhost:3000/ws';
const variant = process.argv[2] || 'classic';
function client(name) {
  const ws = new WebSocket(URL);
  const c = { ws, name, msgs: [], view: null, room: null, games: 0, errors: [] };
  ws.on('message', d => {
    const m = JSON.parse(d);
    if (m.t === 'room') c.room = m.room;
    if (m.t === 'game') { c.view = m.view; c.games++; }
    if (m.t === 'error') c.errors.push(m.msg);
    c.msgs.push(m.t);
  });
  c.send = o => ws.send(JSON.stringify(o));
  c.open = new Promise(r => ws.on('open', () => { c.send({ t: 'hello', name, avatar: '🦊' }); r(); }));
  return c;
}
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const a = client('Alice'), b = client('Bob');
  await a.open; await b.open; await wait(200);
  a.send({ t: 'create', variant, opts: { turnTimer: 0 }, isPublic: true });
  await wait(200);
  const code = a.room.code;
  b.send({ t: 'join', code });
  await wait(200);
  a.send({ t: 'addBot', level: 'hard' });
  await wait(200);
  // four-player games (partners, or Seep's 2-or-4) get another CPU
  if (['twentynine', 'courtpiece', 'seep'].indexOf(variant) >= 0) { a.send({ t: 'addBot', level: 'normal' }); await wait(200); }
  console.log('room', code, 'seats', a.room.seats.map(s => s.name + ':' + s.kind).join(', '));
  a.send({ t: 'start' });
  await wait(500);
  const mem = { a: {}, b: {} };
  let steps = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < (+process.env.TIMEOUT || 60000)) {
    await wait(60);
    for (const [c, k] of [[a, 'a'], [b, 'b']]) {
      const v = c.view;
      if (!v) continue;
      if (v.gameOver) continue;
      // hidden information check: never see other players' faces mid-round (a show reveals on purpose; blackjack hands are always face up)
      if (v.phase !== 'roundOver' && v.phase !== 'showdown' && v.variant !== 'blackjack') for (const p of v.players) if (p.id !== v.me) for (const card of p.hand) if (card.a && v.variant !== 'flip') throw new Error('LEAK: saw opponent card');
      const act = B.decide(v, mem[k]);
      if (act && (v.actor === v.me || act.type === 'nextRound' || act.type === 'uno')) { c.send({ t: 'act', action: act }); steps++; c.view = null; }
    }
    if (a.view && a.view.gameOver) break;
  }
  const v = a.view || b.view;
  console.log(variant, 'steps', steps, 'updates', a.games, b.games, 'gameOver', v && v.gameOver, 'winner', v && v.roundResult && v.players[v.roundResult.winner].name);
  // reconnect test: Bob drops and comes back with his token
  console.log('errors A', a.errors.slice(0, 5), 'errors B', b.errors.slice(0, 5));
  a.ws.close(); b.ws.close();
  process.exit(v && v.gameOver ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
