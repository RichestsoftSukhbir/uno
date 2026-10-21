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

  /* ---- themed sound packs for the Desi games ---- */
  // Karplus-Strong plucked string - a sitar/santoor-like twang
  function pluck(t, freq, dur, gain) {
    var sr = ctx.sampleRate, len = Math.floor(sr * dur);
    var buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    var period = Math.max(2, Math.floor(sr / freq)), ring = new Float32Array(period);
    for (var i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
    var idx = 0;
    for (var k = 0; k < len; k++) {
      var nx = (idx + 1) % period;
      var v = ring[idx];
      ring[idx] = 0.996 * 0.5 * (ring[idx] + ring[nx]);
      d[k] = v;
      idx = nx;
    }
    var src = ctx.createBufferSource(); src.buffer = buf;
    var g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var f = ctx.createBiquadFilter(); f.type = 'peaking'; f.frequency.value = freq * 3; f.gain.value = 6;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur);
  }
  // tabla: "dha" (bass bayan with a pitch bend) and "na/tin" (bright dayan ring)
  function tablaBass(t, gain) { tone(t, 0.45, 150, 'sine', gain || 0.5, 70); noise(t, 0.04, 400, 1, 0.2); }
  function tablaTin(t, gain, f) { tone(t, 0.22, f || 520, 'sine', gain || 0.22); tone(t, 0.12, (f || 520) * 2.7, 'sine', (gain || 0.22) * 0.4); noise(t, 0.02, 3000, 2, 0.15); }
  function bell(t, gain) { [880, 1320, 2210].forEach(function (f, i) { tone(t, 1.6 - i * 0.3, f, 'sine', (gain || 0.12) / (i + 1)); }); }
  var RAAG = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3]; // Sa Re Ga Pa Dha Sa' Re'

  var PACKS = {
    indian: {
      turn: function (t) { tablaTin(t, 0.18, 600); tablaTin(t + 0.11, 0.14, 700); },
      place: function (t) { FX.place(t); tablaBass(t, 0.18); },
      shuffle: function (t) { FX.shuffle(t); tablaBass(t + 0.05, 0.3); tablaTin(t + 0.25, 0.15); tablaBass(t + 0.45, 0.3); },
      win: function (t) { RAAG.forEach(function (f, i) { pluck(t + i * 0.12, f * 2, 1.4, 0.35); }); bell(t + 0.9, 0.12); },
      lose: function (t) { [392, 349.2, 293.7, 261.6].forEach(function (f, i) { pluck(t + i * 0.2, f, 1.4, 0.3); }); tablaBass(t + 0.85, 0.5); },
      color: function (t) { [523.3, 659.3, 784].forEach(function (f, i) { pluck(t + i * 0.07, f, 0.9, 0.3); }); },
      challenge: function (t) { tablaBass(t, 0.45); tablaTin(t + 0.12, 0.2); tablaBass(t + 0.24, 0.45); },
      thulla: function (t) { tablaBass(t, 0.6); tablaBass(t + 0.14, 0.5); tablaTin(t + 0.28, 0.25, 800); },
      chip: function (t) { [1800, 2400].forEach(function (f, i) { tone(t + i * 0.04, 0.12, f, 'sine', 0.06); }); },
      penalty: function (t) { tablaBass(t, 0.45); tablaBass(t + 0.18, 0.35); },
      pop: function (t) { tablaTin(t, 0.18, 880); }
    },
    pro: {
      turn: function (t) { tone(t, 0.12, 1046, 'sine', 0.08); },
      shuffle: function (t) { FX.shuffle(t); },
      win: function (t) { [523.3, 659.3, 784, 1046.5].forEach(function (f, i) { tone(t + i * 0.09, 0.5, f, 'sine', 0.1); }); },
      lose: function (t) { [392, 330, 262].forEach(function (f, i) { tone(t + i * 0.15, 0.4, f, 'sine', 0.09); }); },
      chip: function (t) { for (var i = 0; i < 3; i++) { tone(t + i * 0.05, 0.08, 2600 + Math.random() * 600, 'triangle', 0.05); noise(t + i * 0.05, 0.03, 5000, 3, 0.08); } },
      thulla: function (t) { tone(t, 0.3, 220, 'triangle', 0.15, 140); },
      challenge: function (t) { tone(t, 0.15, 440, 'triangle', 0.1); tone(t + 0.16, 0.25, 330, 'triangle', 0.1); }
    }
  };
  FX.chip = function (t) { tone(t, 0.08, 2300, 'triangle', 0.06); noise(t, 0.03, 5000, 3, 0.08); };
  FX.thulla = function (t) { FX.caught(t); };
  var pack = null;
  function setPack(name) { pack = PACKS[name] || null; }

  function play(name, delay) {
    if (!settings.on) return;
    if (!ensure()) return;
    var fn = (pack && pack[name]) || FX[name];
    if (!fn) return;
    try { fn(ctx.currentTime + (delay || 0)); } catch (e) { /* ignore */ }
  }

  // lang 'hi' speaks with an Indian (Hindi) voice when the device has one
  function say(text, lang) {
    if (!settings.on || !settings.voice || !window.speechSynthesis) return;
    try {
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 1.15; u.pitch = 1.2; u.volume = settings.volume;
      var want = lang === 'hi' ? /^hi|en-IN/i : (pack === PACKS.indian ? /en-IN|^hi/i : null);
      if (want) {
        var vs = window.speechSynthesis.getVoices().filter(function (v) { return want.test(v.lang); });
        if (vs.length) { u.voice = vs[0]; u.lang = vs[0].lang; } else if (lang === 'hi') u.lang = 'hi-IN';
      }
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }

  function configure(s) {
    Object.assign(settings, s);
    if (master) master.gain.value = settings.volume;
  }

  window.UNOSound = { play: play, say: say, configure: configure, settings: settings, setPack: setPack };
})();
