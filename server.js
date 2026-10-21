/*
 * UNO Arena server: serves the site and hosts online rooms over WebSocket.
 * The server runs the authoritative game (same engine as the browser),
 * so every player only ever receives their own view of the table.
 *
 *   npm install && npm start      ->  http://localhost:3000
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');
const E = require('./public/js/shared/engine.js');
const { Controller } = require('./public/js/shared/controller.js');
require('./public/js/shared/patti.js'); // registers the Desi games

const PORT = +process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon'
};

/* ------------------------------------------------------------------ */
/* static files                                                        */
/* ------------------------------------------------------------------ */
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  if (urlPath.endsWith('/')) urlPath += 'index.html';
  const file = path.normalize(path.join(PUBLIC, urlPath));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      // unknown paths fall back to the app (supports /?room=CODE links)
      return fs.readFile(path.join(PUBLIC, 'index.html'), (e2, data) => {
        if (e2) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(data);
      });
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
});

/* ------------------------------------------------------------------ */
/* rooms                                                               */
/* ------------------------------------------------------------------ */
const rooms = new Map();          // code -> room
const sessions = new Map();       // token -> { token, name, avatar, ws, room }
const BOT_NAMES = ['Ava', 'Leo', 'Mia', 'Kai', 'Zoe', 'Max', 'Ivy', 'Rex', 'Luna', 'Finn', 'Nova', 'Ollie'];
const BOT_AVATARS = ['robot-01', 'panda', 'cat', 'rabbit', 'turtle', 'bird', 'ghost', 'alien-01', 'rocket-01', 'monster', 'pacman-01', 'robot-02'];
// avatars and emotes are icon names
function iconName(s, fallback) { s = String(s == null ? '' : s); return /^[a-z0-9-]{1,24}$/.test(s) ? s : fallback; }

function code() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c;
  do { c = Array.from({ length: 5 }, () => A[crypto.randomInt ? crypto.randomInt(A.length) : Math.floor(Math.random() * A.length)]).join(''); } while (rooms.has(c));
  return c;
}
function clean(s, n) { return String(s == null ? '' : s).replace(/[<>]/g, '').trim().slice(0, n || 20); }
function send(ws, msg) { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); }

function roomInfo(room, token) {
  return {
    code: room.code,
    host: room.seats.findIndex(s => s.token === room.hostToken),
    isHost: token === room.hostToken,
    variant: room.variant,
    opts: room.opts,
    isPublic: room.isPublic,
    state: room.state,
    you: room.seats.findIndex(s => s.token === token),
    spectators: room.spectators.size,
    seats: room.seats.map(s => ({ name: s.name, avatar: s.avatar, kind: s.kind, level: s.level, connected: s.kind === 'bot' || s.connected }))
  };
}
function broadcastRoom(room) {
  room.seats.forEach(s => { if (s.token) { const ss = sessions.get(s.token); if (ss) send(ss.ws, { t: 'room', room: roomInfo(room, s.token) }); } });
  room.spectators.forEach(tok => { const ss = sessions.get(tok); if (ss) send(ss.ws, { t: 'room', room: roomInfo(room, tok) }); });
}
function decorate(room, view) {
  view.players.forEach((p, i) => { const s = room.seats[i]; p.offline = s && s.kind === 'human' && !s.connected; });
  return view;
}
function sendGame(room, token, events, meta) {
  const ss = sessions.get(token);
  if (!ss || !room.game) return;
  const seat = room.seats.findIndex(s => s.token === token);
  const view = decorate(room, room.game.view(seat >= 0 ? seat : null));
  send(ss.ws, { t: 'game', view, events: events || [], deadline: meta && meta.deadline ? meta.deadline - Date.now() : null });
}
function broadcastGame(room, events, meta) {
  room.seats.forEach(s => { if (s.token) sendGame(room, s.token, events, meta); });
  room.spectators.forEach(tok => sendGame(room, tok, events, meta));
}
function systemChat(room, text) {
  const msg = { t: 'chat', from: null, text };
  room.seats.forEach(s => { if (s.token) { const ss = sessions.get(s.token); if (ss) send(ss.ws, msg); } });
  room.spectators.forEach(tok => { const ss = sessions.get(tok); if (ss) send(ss.ws, msg); });
}

function startGame(room) {
  if (room.controller) room.controller.destroy();
  const seats = room.seats.map(s => ({ name: s.name, kind: s.kind === 'bot' ? 'bot' : 'human', level: s.level, avatar: s.avatar }));
  room.game = E.createGame(room.variant, room.opts, seats);
  room.state = 'playing';
  room.controller = new Controller(room.game, {
    isBot: pid => {
      const s = room.seats[pid];
      if (!s) return true;
      if (s.kind === 'bot') return true;
      return !s.connected && Date.now() - (s.leftAt || 0) > 10000;
    },
    turnTimer: +(room.game.o && room.game.o.turnTimer != null ? room.game.o.turnTimer : room.opts.turnTimer) || 0,
    onTimeout: pid => systemChat(room, room.seats[pid].name + ' ran out of time - auto move.'),
    onUpdate: (events, meta) => {
      broadcastGame(room, events, meta);
      if (room.game.gameOver) { room.state = 'finished'; broadcastRoom(room); }
    }
  });
  broadcastRoom(room);
  room.controller.start();
}

function leaveRoom(ss, explicit) {
  const room = ss.room && rooms.get(ss.room);
  if (!room) { ss.room = null; return; }
  room.spectators.delete(ss.token);
  const idx = room.seats.findIndex(s => s.token === ss.token);
  if (idx >= 0) {
    const seat = room.seats[idx];
    if (room.state === 'lobby' && explicit) {
      room.seats.splice(idx, 1);
    } else if (explicit) {
      // a CPU takes over the seat for the rest of the game
      seat.kind = 'bot'; seat.level = 'normal'; seat.token = null; seat.name += ' (CPU)';
      if (room.game) room.game.players[idx].kind = 'bot';
      systemChat(room, seat.name.replace(' (CPU)', '') + ' left - a CPU takes over.');
      if (room.controller) room.controller.schedule([]);
    } else {
      seat.connected = false;
      seat.leftAt = Date.now();
      if (room.controller) setTimeout(() => room.controller && room.controller.schedule([]), 10500);
    }
  }
  if (explicit) ss.room = null;
  // hand host to another connected human
  if (room.hostToken === ss.token && explicit) {
    const next = room.seats.find(s => s.token && s.kind === 'human');
    room.hostToken = next ? next.token : null;
  }
  const humans = room.seats.filter(s => s.kind === 'human' && s.token);
  if (!humans.length && room.spectators.size === 0) {
    if (room.controller) room.controller.destroy();
    rooms.delete(room.code);
    return;
  }
  broadcastRoom(room);
  if (room.game) broadcastGame(room, []);
}

function handle(ss, msg) {
  const room = ss.room ? rooms.get(ss.room) : null;
  const isHost = room && room.hostToken === ss.token;
  switch (msg.t) {
    case 'list': {
      const list = [];
      rooms.forEach(r => { if (r.isPublic && r.state === 'lobby') list.push({ code: r.code, variant: r.variant, players: r.seats.length, max: E.VARIANTS[r.variant].players[1], host: (r.seats.find(s => s.token === r.hostToken) || {}).name }); });
      return send(ss.ws, { t: 'list', rooms: list });
    }
    case 'create': {
      if (room) leaveRoom(ss, true);
      const variant = E.VARIANTS[msg.variant] ? msg.variant : 'classic';
      const r = {
        code: code(), hostToken: ss.token, variant, opts: Object.assign({}, E.VARIANTS[variant].defaults, msg.opts || {}),
        isPublic: !!msg.isPublic, state: 'lobby', seats: [], spectators: new Set(), created: Date.now()
      };
      r.seats.push({ token: ss.token, name: ss.name, avatar: ss.avatar, kind: 'human', connected: true });
      rooms.set(r.code, r);
      ss.room = r.code;
      return broadcastRoom(r);
    }
    case 'join': {
      const r = rooms.get(clean(msg.code, 8).toUpperCase());
      if (!r) return send(ss.ws, { t: 'error', msg: 'Room not found' });
      if (room && room !== r) leaveRoom(ss, true);
      ss.room = r.code;
      const existing = r.seats.findIndex(s => s.token === ss.token);
      if (existing >= 0) { r.seats[existing].connected = true; }
      else if (r.state === 'lobby') {
        if (r.seats.length >= E.VARIANTS[r.variant].players[1]) { ss.room = null; return send(ss.ws, { t: 'error', msg: 'Room is full' }); }
        r.seats.push({ token: ss.token, name: ss.name, avatar: ss.avatar, kind: 'human', connected: true });
        systemChat(r, ss.name + ' joined.');
      } else {
        r.spectators.add(ss.token);
        send(ss.ws, { t: 'toast', msg: 'Game in progress - you are spectating.' });
      }
      broadcastRoom(r);
      if (r.game) sendGame(r, ss.token, []);
      return;
    }
    case 'leave':
      leaveRoom(ss, true);
      return send(ss.ws, { t: 'left' });
    case 'setOpts':
      if (!isHost || room.state !== 'lobby') return;
      if (msg.variant && E.VARIANTS[msg.variant]) {
        if (msg.variant !== room.variant) room.opts = Object.assign({}, E.VARIANTS[msg.variant].defaults);
        room.variant = msg.variant;
        const max = E.VARIANTS[room.variant].players[1];
        while (room.seats.length > max) {
          const i = room.seats.map(s => s.kind).lastIndexOf('bot');
          if (i < 0) break;
          room.seats.splice(i, 1);
        }
      }
      if (msg.opts) Object.keys(msg.opts).forEach(k => {
        const d = E.OPTION_DEFS[k];
        if (!d) return;
        const v = msg.opts[k];
        if (d.type === 'select' && !d.choices.some(c => c[0] === v)) return;
        if (d.type === 'bool' && typeof v !== 'boolean') return;
        if (d.type === 'number' && (typeof v !== 'number' || v < d.min || v > d.max)) return;
        room.opts[k] = v;
      });
      if (msg.isPublic != null) room.isPublic = !!msg.isPublic;
      return broadcastRoom(room);
    case 'addBot': {
      if (!isHost || room.state !== 'lobby') return;
      if (room.seats.length >= E.VARIANTS[room.variant].players[1]) return send(ss.ws, { t: 'error', msg: 'Table is full' });
      const used = room.seats.map(s => s.name);
      const name = BOT_NAMES.find(n => used.indexOf(n) < 0) || 'CPU';
      room.seats.push({ token: null, name, avatar: BOT_AVATARS[BOT_NAMES.indexOf(name) % BOT_AVATARS.length], kind: 'bot', level: ['easy', 'normal', 'hard'].indexOf(msg.level) >= 0 ? msg.level : 'normal' });
      return broadcastRoom(room);
    }
    case 'removeSeat': {
      if (!isHost || room.state !== 'lobby') return;
      const s = room.seats[msg.index];
      if (!s || s.token === ss.token) return;
      room.seats.splice(msg.index, 1);
      if (s.token) { const o = sessions.get(s.token); if (o) { o.room = null; send(o.ws, { t: 'kicked' }); } }
      return broadcastRoom(room);
    }
    case 'start':
      if (!isHost || room.state === 'playing') return;
      if (room.seats.length < 2) return send(ss.ws, { t: 'error', msg: 'Need at least 2 players (add a CPU)' });
      try { return startGame(room); } catch (e) { room.state = 'lobby'; return send(ss.ws, { t: 'error', msg: e.message }); }
    case 'rematch':
      if (!isHost || !room.game || !room.game.gameOver) return;
      try { return startGame(room); } catch (e) { return send(ss.ws, { t: 'error', msg: e.message }); }
    case 'toLobby':
      if (!isHost) return;
      if (room.controller) room.controller.destroy();
      room.controller = null; room.game = null; room.state = 'lobby';
      return broadcastRoom(room);
    case 'act': {
      if (!room || !room.controller) return;
      const seat = room.seats.findIndex(s => s.token === ss.token);
      if (seat < 0) return send(ss.ws, { t: 'error', msg: 'Spectators cannot play' });
      const r = room.controller.act(seat, msg.action || {});
      if (!r.ok) send(ss.ws, { t: 'error', msg: r.error, action: msg.action && msg.action.type });
      return;
    }
    case 'chat': {
      if (!room) return;
      const now = Date.now();
      if (now - (ss.lastChat || 0) < 400) return;
      ss.lastChat = now;
      const text = clean(msg.text, 200);
      if (!text) return;
      const out = { t: 'chat', from: ss.name, avatar: ss.avatar, text };
      room.seats.forEach(s => { if (s.token) { const o = sessions.get(s.token); if (o) send(o.ws, out); } });
      room.spectators.forEach(tok => { const o = sessions.get(tok); if (o) send(o.ws, out); });
      return;
    }
    case 'emote': {
      if (!room) return;
      const seat = room.seats.findIndex(s => s.token === ss.token);
      const e = iconName(msg.e, null);
      if (!e) return;
      const out = { t: 'emote', seat, e };
      room.seats.forEach(s => { if (s.token) { const o = sessions.get(s.token); if (o) send(o.ws, out); } });
      room.spectators.forEach(tok => { const o = sessions.get(tok); if (o) send(o.ws, out); });
      return;
    }
  }
}

const wss = new WebSocket.Server({ server, path: '/ws', maxPayload: 16 * 1024 });
wss.on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  let ss = null;
  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || typeof msg.t !== 'string') return;
    if (msg.t === 'hello') {
      let token = typeof msg.token === 'string' && /^[a-f0-9]{32}$/.test(msg.token) ? msg.token : null;
      if (token && sessions.has(token)) {
        ss = sessions.get(token);
        if (ss.ws && ss.ws !== ws) { try { ss.ws.close(); } catch (e) { /* ignore */ } }
        ss.ws = ws;
      } else {
        token = token || crypto.randomBytes(16).toString('hex');
        ss = { token, ws, room: null };
        sessions.set(token, ss);
      }
      ss.name = clean(msg.name, 16) || 'Player';
      ss.avatar = iconName(msg.avatar, 'user');
      send(ws, { t: 'welcome', token: ss.token });
      // reconnect into the previous room
      const r = ss.room && rooms.get(ss.room);
      if (r) {
        const seat = r.seats.find(s => s.token === ss.token);
        if (seat) { seat.connected = true; seat.name = seat.name; }
        broadcastRoom(r);
        if (r.game) { sendGame(r, ss.token, []); if (r.controller) r.controller.schedule([]); }
      } else ss.room = null;
      return;
    }
    if (!ss) return;
    try { handle(ss, msg); } catch (e) { console.error('handler error', e); send(ws, { t: 'error', msg: 'Server error' }); }
  });
  ws.on('close', () => {
    if (!ss || ss.ws !== ws) return;
    ss.ws = null;
    leaveRoom(ss, false);
  });
});

setInterval(() => {
  wss.clients.forEach(ws => { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; try { ws.ping(); } catch (e) { /* ignore */ } });
  // forget idle sessions and dead rooms
  const now = Date.now();
  rooms.forEach((r, c) => {
    const live = r.seats.some(s => s.kind === 'human' && s.connected) || r.spectators.size;
    if (!live && now - Math.max(r.created, ...r.seats.map(s => s.leftAt || 0)) > 10 * 60 * 1000) {
      if (r.controller) r.controller.destroy();
      rooms.delete(c);
    }
  });
  sessions.forEach((s, t) => { if (!s.ws && !s.room) sessions.delete(t); });
}, 30000);

// if the port is busy (e.g. another copy is already running), try the next one
let port = PORT;
server.on('error', err => {
  if (err.code === 'EADDRINUSE' && port < PORT + 10) {
    console.warn('Port ' + port + ' is already in use - trying ' + (port + 1) + '...');
    port++;
    setTimeout(() => server.listen(port), 200);
  } else {
    console.error(err.code === 'EADDRINUSE' ? 'Ports ' + PORT + '-' + port + ' are all busy. Set another with PORT=4000 npm start' : err);
    process.exit(1);
  }
});
wss.on('error', () => { /* reported by the http server handler above */ });
server.listen(port, () => {
  console.log('UNO Arena running at http://localhost:' + port);
});
