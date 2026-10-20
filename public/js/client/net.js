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
  Net.prototype.url = function () {
    var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return proto + '//' + location.host + '/ws';
  };
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
    ws.onopen = function () {
      self.retry = 0;
      self.hello();
      self.emit('status', { state: 'online' });
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
      self.emit('status', { state: 'offline' });
      if (self.ws === ws) self.ws = null;
      if (self.wanted) {
        self.retry++;
        setTimeout(function () { if (self.wanted) self.connect(); }, Math.min(8000, 600 * self.retry));
      }
    };
    ws.onerror = function () { self.emit('status', { state: 'error' }); };
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
