/*
 * UNO Arena - game controller.
 * Drives a game: applies actions, runs bots on a human-like rhythm,
 * lets bots catch missing UNO calls and enforces optional turn timers.
 * Used by local games in the browser and by online rooms on the server.
 */
(function (root, factory) {
  var deps = typeof module === 'object' && module.exports
    ? { E: require('./engine.js'), B: require('./bots.js') }
    : { E: root.UNOEngine, B: root.UNOBots };
  var C = factory(deps.E, deps.B);
  if (typeof module === 'object' && module.exports) module.exports = C;
  root.UNOController = C;
})(typeof self !== 'undefined' ? self : this, function (E, B) {
  'use strict';

  function Controller(game, opts) {
    this.game = game;
    this.opts = opts || {};
    this.mem = {};
    this.timers = [];
    this.turnTimer = null;
    this.deadline = null;
    this.paused = false;
    this.destroyed = false;
    this.speed = this.opts.speed || 1;
  }
  var P = Controller.prototype;
  P.COUNTDOWN_MS = 3200;

  P.isBot = function (pid) {
    if (this.opts.isBot) return this.opts.isBot(pid);
    var p = this.game.players[pid];
    return p && p.kind === 'bot';
  };

  P.start = function () {
    this.flush();
  };

  P.act = function (pid, action) {
    if (this.destroyed) return { ok: false, error: 'Game closed' };
    var r = this.game.act(pid, action);
    if (r.ok) this.flush(pid, action);
    return r;
  };

  P.flush = function (pid, action) {
    var events = this.game.takeEvents();
    this.schedule(events);
    if (this.opts.onUpdate) this.opts.onUpdate(events, { by: pid, action: action, deadline: this.deadline });
  };

  P.clearTimers = function () {
    this.timers.forEach(function (t) { clearTimeout(t); });
    this.timers = [];
    if (this.turnTimer) clearTimeout(this.turnTimer);
    this.turnTimer = null;
    this.deadline = null;
  };

  P.later = function (fn, ms) {
    var self = this;
    var t = setTimeout(function () {
      self.timers = self.timers.filter(function (x) { return x !== t; });
      if (!self.destroyed && !self.paused) fn();
    }, ms);
    this.timers.push(t);
  };

  // rough time the clients need to animate these events
  P.animTime = function (events) {
    var ms = 0;
    (events || []).forEach(function (e) {
      if (e.t === 'deal') ms += (e.more ? 300 : 1200) + e.order.length * (e.more ? 40 : 70);
      else if (e.t === 'pickup' || e.t === 'capture' || e.t === 'trickWon' || e.t === 'trickOut') ms += 600;
      else if (e.t === 'bluffCall' || e.t === 'showdown' || e.t === 'sidecompare') ms += 1200;
      else if (e.t === 'bluffPlay' || e.t === 'bet' || e.t === 'pick' || e.t === 'pairs' || e.t === 'build' || e.t === 'throw' || e.t === 'cement') ms += 450;
      else if (e.t === 'seep' || e.t === 'lastCard') ms += 900;
      else if (e.t === 'showPlay') ms += 1500;            // the table pauses on each Seep move so everyone sees it
      else if (e.t === 'bid' || e.t === 'floor') ms += 600;
      else if (e.t === 'draw') ms += 350 + Math.min(e.n, 12) * 110;
      else if (e.t === 'flip') ms += 1300;
      else if (e.t === 'swap' || e.t === 'rotate') ms += 1000;
      else if (e.t === 'reshuffle') ms += 900;
      else if (e.t === 'play' || e.t === 'bluff') ms += 450;
      else if (e.t === 'launch') ms += 700;
      else if (e.t === 'challenge') ms += 900;
      else if (e.t === 'dare') ms += 2500;
      else if (e.t === 'clearMatches') ms += 600;
    });
    return ms;
  };

  P.schedule = function (events) {
    var self = this;
    var g = this.game;
    this.clearTimers();
    if (this.destroyed || g.gameOver) return;
    var anim = this.animTime(events) / (this.opts.animSpeed || 1);
    // per-game pacing (e.g. Seep): a short pause after every move so the table settles before the next turn
    var pace = (g.V && g.V.pace) || {};
    if (pace.settle && events && events.length) anim += pace.settle * this.speed;
    // a fresh round: the table shows a 3-2-1 countdown before anyone moves
    if ((events || []).some(function (e) { return e.t === 'deal' && !e.more; })) anim += P.COUNTDOWN_MS;
    // Seep: the four floor cards land, then everyone gets a moment to look before the bid is played
    if ((events || []).some(function (e) { return e.t === 'floor'; })) anim += (pace.floorLook || 0) * this.speed;

    if (g.phase === 'roundOver') {
      var allBots = g.players.every(function (p, i) { return self.isBot(i); });
      if (allBots || this.opts.autoNextRound) this.later(function () { self.act(0, { type: 'nextRound' }); }, anim + 4500);
      return;
    }

    // UNO window: the offender may still call it late, others may catch
    if (g.unoPending != null) {
      var off = g.unoPending;
      if (this.isBot(off)) {
        var lc = B.lateCall(g.players[off].level);
        if (Math.random() < lc[0]) this.later(function () { if (g.unoPending === off) self.act(off, { type: 'uno' }); }, anim + lc[1] * (0.6 + Math.random() * 0.8));
      }
      g.players.forEach(function (p, i) {
        if (i === off || p.out || !self.isBot(i)) return;
        var cc = B.catchChance(p.level);
        if (Math.random() < cc[0]) self.later(function () { if (g.unoPending === off) self.act(i, { type: 'catch' }); }, anim + cc[1] * (0.7 + Math.random() * 0.9));
      });
    }

    var actor = g.actor();
    if (actor == null) return;
    // automatic steps (e.g. sweeping a finished trick off the table) run by themselves after a pause
    var auto = g.autoNext && g.autoNext();
    if (auto) {
      this.later(function () { if (g.actor() === actor) self.act(actor, auto); }, anim + 1300 * this.speed);
      return;
    }
    if (this.isBot(actor)) {
      var base = (pace.botDelay || this.opts.botDelay || 950) * this.speed;
      var think = base * (0.75 + Math.random() * 0.6);
      // give humans a moment to catch a missing UNO before the bot moves on
      if (g.unoPending != null) think += 900;
      if (g.phase === 'dareActive') think += 2200;
      this.later(function () { self.botMove(actor); }, anim + think);
    } else if (this.opts.turnTimer > 0) {
      var ms = this.opts.turnTimer * 1000;
      this.deadline = Date.now() + ms + anim;
      this.turnTimer = setTimeout(function () {
        if (self.destroyed || self.paused) return;
        if (g.actor() === actor) {
          if (self.opts.onTimeout) self.opts.onTimeout(actor);
          self.botMove(actor, true);
          // some moves keep the turn (a drawn card, picking a colour, looking at your cards) - finish it
          for (var k = 0; k < 4 && g.actor() === actor && !g.gameOver && g.phase !== 'roundOver' && !(g.autoNext && g.autoNext()); k++) self.botMove(actor, true);
        }
      }, ms + anim);
    }

    // jump-in: bots holding an identical card may slam it down
    if (g.o && g.o.jumpIn && g.phase === 'turn' && !g.drawStack) {
      g.players.forEach(function (p, i) {
        if (i === actor || p.out || !self.isBot(i)) return;
        var ids = g.playableIds(i);
        if (ids.length && Math.random() < (p.level === 'easy' ? 0.15 : 0.45)) {
          self.later(function () {
            if (g.playableIds(i).indexOf(ids[0]) >= 0 && g.actor() !== i) self.act(i, { type: 'play', cardId: ids[0] });
          }, anim + 500 + Math.random() * 900);
        }
      });
    }
  };

  P.botMove = function (pid, timedOut) {
    var g = this.game;
    var view = g.view(pid);
    var mem = this.mem[pid] || (this.mem[pid] = {});
    var action = B.decide(view, mem);
    if (timedOut) {
      // timed-out humans: never bluff or take dares for them
      if (action && (action.type === 'bluff' || action.type === 'dareDo')) action = { type: action.type === 'dareDo' ? 'dareDraw' : 'draw' };
    }
    if (!action) return;
    var r = this.act(pid, action);
    if (!r.ok) {
      // fall back to any legal action so the game never stalls
      var legal = g.legalActions(pid).filter(function (a) { return a.type !== 'uno' && a.type !== 'catch' && a.type !== 'bluff'; });
      var pref = legal.filter(function (a) { return a.type === 'draw' || a.type === 'pass' || a.type === 'accept'; })[0] || legal[0];
      if (pref) {
        if (pref.type === 'color' || pref.type === 'target') { /* already concrete */ }
        this.act(pid, pref);
      }
    }
  };

  P.pause = function () { this.paused = true; this.clearTimers(); };
  P.resume = function () { this.paused = false; this.schedule([]); };
  P.destroy = function () { this.destroyed = true; this.clearTimers(); };

  return { Controller: Controller };
});
