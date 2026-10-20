/* Synthesised sound effects (Web Audio) - no audio files needed. */
(function () {
  'use strict';
  var ctx = null, master = null, noiseBuf = null;
  var settings = { on: true, volume: 0.7, voice: true };

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = settings.volume;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.0, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, function () { ensure(); }, { once: false, passive: true });
  });

  function noise(t, dur, freq, q, gain, type) {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var f = ctx.createBiquadFilter();
    f.type = type || 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q || 1;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
    return f;
  }
  function tone(t, dur, freq, type, gain, slideTo) {
    var o = ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  var FX = {
    slide: function (t) { noise(t, 0.09, 2600 + Math.random() * 1200, 0.8, 0.35); },
    place: function (t) { noise(t, 0.05, 1800, 1.2, 0.5); tone(t, 0.08, 140, 'sine', 0.25, 70); },
    flick: function (t) { noise(t, 0.04, 4200, 2, 0.3); },
    deal: function (t) { noise(t, 0.06, 3200 + Math.random() * 800, 1, 0.25); },
    shuffle: function (t) { for (var i = 0; i < 18; i++) noise(t + i * 0.035 + Math.random() * 0.01, 0.04, 3000 + Math.random() * 1500, 1.5, 0.2); },
    draw: function (t) { noise(t, 0.12, 2200, 0.7, 0.3); },
    turn: function (t) { tone(t, 0.18, 880, 'sine', 0.15); tone(t + 0.09, 0.25, 1320, 'sine', 0.12); },
    error: function (t) { tone(t, 0.18, 180, 'square', 0.08); tone(t + 0.12, 0.2, 150, 'square', 0.08); },
    skip: function (t) { tone(t, 0.25, 600, 'triangle', 0.25, 160); },
    reverse: function (t) { tone(t, 0.3, 300, 'triangle', 0.2, 900); noise(t, 0.3, 1200, 0.5, 0.15); },
    penalty: function (t) { [523, 466, 415, 349].forEach(function (f, i) { tone(t + i * 0.08, 0.14, f, 'sawtooth', 0.07); }); },
    color: function (t) { [523, 659, 784, 1046].forEach(function (f, i) { tone(t + i * 0.05, 0.25, f, 'sine', 0.1); }); },
    uno: function (t) { tone(t, 0.12, 784, 'square', 0.1); tone(t + 0.12, 0.35, 1046, 'square', 0.12); },
    caught: function (t) { tone(t, 0.4, 220, 'sawtooth', 0.12, 110); noise(t, 0.2, 600, 1, 0.3); },
    flip: function (t) { var f = noise(t, 0.7, 400, 0.6, 0.35, 'bandpass'); f.frequency.exponentialRampToValueAtTime(5000, t + 0.6); tone(t + 0.1, 0.6, 110, 'sine', 0.25, 55); },
    swap: function (t) { noise(t, 0.4, 1500, 0.4, 0.25); tone(t, 0.4, 400, 'sine', 0.12, 800); },
    launch: function (t) { tone(t, 0.05, 900, 'square', 0.15); noise(t + 0.03, 0.08, 500, 3, 0.4); },
    boom: function (t) { noise(t, 0.6, 300, 0.5, 0.7, 'lowpass'); tone(t, 0.5, 90, 'sine', 0.5, 40); },
    win: function (t) { [523, 659, 784, 1046, 784, 1046, 1318].forEach(function (f, i) { tone(t + i * 0.11, 0.3, f, 'triangle', 0.15); }); },
    lose: function (t) { [392, 349, 311, 262].forEach(function (f, i) { tone(t + i * 0.18, 0.35, f, 'triangle', 0.12); }); },
    pop: function (t) { tone(t, 0.08, 600, 'sine', 0.2, 1200); },
    challenge: function (t) { tone(t, 0.15, 330, 'square', 0.1); tone(t + 0.18, 0.3, 494, 'square', 0.1); },
    eliminate: function (t) { tone(t, 0.8, 200, 'sawtooth', 0.15, 40); noise(t, 0.8, 300, 0.4, 0.4, 'lowpass'); },
    tick: function (t) { tone(t, 0.04, 1500, 'square', 0.05); }
  };

  function play(name, delay) {
    if (!settings.on) return;
    if (!ensure() || !FX[name]) return;
    try { FX[name](ctx.currentTime + (delay || 0)); } catch (e) { /* ignore */ }
  }

  function say(text) {
    if (!settings.on || !settings.voice || !window.speechSynthesis) return;
    try {
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 1.15; u.pitch = 1.2; u.volume = settings.volume;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }

  function configure(s) {
    Object.assign(settings, s);
    if (master) master.gain.value = settings.volume;
  }

  window.UNOSound = { play: play, say: say, configure: configure, settings: settings };
})();
