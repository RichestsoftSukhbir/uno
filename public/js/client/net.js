/* WebSocket client with automatic reconnect. */
(function () {
  'use strict';
  function Net() {
    this.ws = null;
    this.handlers = {};
    this.token = null;
    try { this.token = localStorage.getItem('uno.token'); } catch (e) { /* ignore */ }
    this.queue = [];
    this.wanted = false;
    this.retry = 0;
    this.identity = { name: 'Player', avatar: 'user' };
  }
  Net.prototype.on = function (t, fn) { (this.handlers[t] = this.handlers[t] || []).push(fn); return this; };
  Net.prototype.emit = function (t, msg) { (this.handlers[t] || []).forEach(function (f) { f(msg); }); };
  // the game server: this site by default, or another host set in <meta name="uno-server" content="wss://...">
  Net.prototype.url = function () {
    var meta = document.querySelector('meta[name="uno-server"]');
    var custom = meta && meta.content && meta.content.trim();
    if (custom) return custom.replace(/\/$/, '') + (/\/ws$/.test(custom) ? '' : '/ws');
    var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return proto + '//' + location.host + '/ws';
  };
  // hosts that cut long connections (Vercel functions end after ~5 minutes): swap to a fresh
  // connection before that happens, so the game never sees a drop
  var HANDOVER_MS = 4 * 60 * 1000;
  Net.prototype.available = function () { return location.protocol === 'http:' || location.protocol === 'https:'; };
  Net.prototype.connect = function (identity) {
    var self = this;
    if (identity) this.identity = identity;
    this.wanted = true;
    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) {
      if (this.ws.readyState === 1) this.hello();
      return;
    }
    if (!this.available()) { this.emit('status', { state: 'unavailable' }); return; }
    var ws;
    try { ws = new WebSocket(this.url()); } catch (e) { this.emit('status', { state: 'error' }); return; }
    this.ws = ws;
    this.emit('status', { state: 'connecting' });
    this.wire(ws, true);
  };
  // every connection gets its own handlers (so a swapped-in connection behaves exactly like the first)
  Net.prototype.wire = function (ws, fresh) {
    var self = this;
    if (fresh) ws.onopen = function () {
      self.retry = 0;
      self.hello();
      self.emit('status', { state: 'online' });
      self.planHandover(ws);
    };
    ws.onmessage = function (ev) {
      var msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.t === 'welcome') {
        self.token = msg.token;
        try { localStorage.setItem('uno.token', msg.token); } catch (e) { /* ignore */ }
        var q = self.queue; self.queue = [];
        q.forEach(function (m) { self.send(m); });
      }
      self.emit(msg.t, msg);
    };
    ws.onclose = function () {
      clearTimeout(ws.handoverTimer);
      if (ws.replaced || self.ws !== ws) return;          // swapped for a newer connection: nothing lost
      self.emit('status', { state: 'offline' });
      self.ws = null;
      if (self.wanted) {
        self.retry++;
        // the first retry is immediate - a host cutting the connection shouldn't freeze the game
        setTimeout(function () { if (self.wanted) self.connect(); }, self.retry === 1 ? 0 : Math.min(8000, 500 * self.retry));
      }
    };
    ws.onerror = function () { if (self.ws === ws) self.emit('status', { state: 'error' }); };
  };
  Net.prototype.planHandover = function (ws) {
    var self = this;
    clearTimeout(ws.handoverTimer);
    ws.handoverTimer = setTimeout(function () {
      if (self.ws !== ws || ws.readyState !== 1 || !self.wanted) return;
      var next;
      try { next = new WebSocket(self.url()); } catch (e) { return; }
      next.onopen = function () {
        next.send(JSON.stringify({ t: 'hello', token: self.token, name: self.identity.name, avatar: self.identity.avatar }));
      };
      next.onmessage = function (ev) {
        var msg;
        try { msg = JSON.parse(ev.data); } catch (e) { return; }
        if (msg.t !== 'welcome') return;
        // switch over: the server has moved our seat to the new connection
        ws.replaced = true;
        self.ws = next;
        self.wire(next, false);
        try { ws.close(); } catch (e) { /* ignore */ }
        next.onmessage(ev);
        self.planHandover(next);
      };
      next.onerror = function () { /* keep the old connection; it reconnects normally if it is cut */ };
    }, self.handoverMs || HANDOVER_MS);
  };
  Net.prototype.hello = function () {
    this.ws.send(JSON.stringify({ t: 'hello', token: this.token, name: this.identity.name, avatar: this.identity.avatar }));
  };
  Net.prototype.send = function (msg) {
    if (this.ws && this.ws.readyState === 1 && this.token) this.ws.send(JSON.stringify(msg));
    else { this.queue.push(msg); this.connect(); }
  };
  Net.prototype.close = function () { this.wanted = false; if (this.ws) this.ws.close(); };
  window.UNONet = Net;
})();
