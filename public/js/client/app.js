/* UNO Arena - application: menus, sessions, HUD and input. */
(function () {
  'use strict';
  var E = window.UNOEngine, Cards = window.UNOCards, S = window.UNOSound, Rules = window.UNORules, I = window.UNOIcons;
  function ic(n, cls) { return I.svg(n, cls); }
  function av(a, cls) { return I.avatar(a, cls); }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var AVATARS = window.UNOIcons.AVATARS;
  var BOT_NAMES = ['Ava', 'Leo', 'Mia', 'Kai', 'Zoe', 'Max', 'Ivy', 'Rex', 'Luna', 'Finn', 'Nova', 'Ollie'];
  var BOT_AVATARS = ['robot-01', 'panda', 'cat', 'rabbit', 'turtle', 'bird', 'ghost', 'alien-01', 'rocket-01', 'monster', 'pacman-01', 'robot-02'];
  var SIGNATURE = {
    classic: { c: 'wild', v: 'wild4' }, flip: { c: 'teal', v: 'draw5' }, nomercy: { c: 'wild', v: 'wild10' }, allwild: { c: 'wild', v: 'wildswap' },
    attack: { c: 'red', v: 'hit2' }, liars: 'back', dare: { c: 'red', v: 'dare' }, dos: { c: 'wild', v: 'dos' }
  };
  var COLOR_KEYS = ['1', '2', '3', '4'];
  function sig(id) { var V = E.VARIANTS[id]; return V && V.sig ? V.sig : SIGNATURE[id]; }
  function backOf(id) { var V = E.VARIANTS[id] || {}; return V.universe === 'desi' ? 'patti' : (id === 'dos' ? 'dos' : 'uno'); }
  function universeOf(id) { return (E.VARIANTS[id] || {}).universe || 'uno'; }
  function gamesOf(u) { return Object.keys(E.VARIANTS).filter(function (id) { return universeOf(id) === u; }); }

  /* the whole site switches between the UNO hall and the Desi Patti hall */
  function applyUniverse() {
    var u = settings.universe === 'desi' ? 'desi' : 'uno';
    var th = settings.desiTheme === 'pro' ? 'pro' : 'indian';
    document.body.dataset.universe = u;
    document.body.dataset.desiTheme = th;
    var art = Cards.deckStyle();
    Cards.setDesiTheme(th);
    Cards.setDesiDeck(settings.desiDeck || 'noir');
    if (Cards.deckStyle() !== art) {
      if (app.table) app.table.refreshFaces();
      if (app.screen === 'home' && app.homeBuilt) buildHome();
    }
    var playingDesi = app.view && app.view.engine === 'patti';
    S.setPack(u === 'desi' || playingDesi ? th : null);
    document.title = u === 'desi' ? 'Desi Patti - UNO Arena' : 'UNO Arena';
    $$('.uni-switch button').forEach(function (b) { b.classList.toggle('active', b.dataset.u === u); });
    $$('.theme-switch button').forEach(function (b) { b.classList.toggle('active', b.dataset.t === th); });
  }
  function hallTransition(kind, mid) {
    // a giant card spins round while the whole site changes underneath it
    var desi = kind !== 'uno';
    app.transitioning = true;
    var ov = document.createElement('div');
    ov.className = 'uni-transition ' + (desi ? 'to-desi' : 'to-uno');
    // the card shows the hall you're leaving, then turns edge-on and comes back as the hall you're entering.
    // The swap happens exactly at the edge-on moment (no backface tricks, so every browser shows the right side).
    var nextBack = function () { return Cards.faceImg('back', { back: desi ? 'patti' : 'uno' }); };
    var front = Cards.faceImg('back', { back: settings.universe === 'desi' ? 'patti' : 'uno' }); // the hall you're in now
    var next = nextBack();
    ov.innerHTML = '<div class="ut-burst"></div><div class="ut-card"><img src="' + front + '"><img class="ut-back" src="' + next + '" style="visibility:hidden"></div><div class="ut-title"></div>';
    document.body.appendChild(ov);
    var card = $('.ut-card', ov), title = $('.ut-title', ov), frontImg = $('.ut-card img', ov), backImg = $('.ut-back', ov);
    function swap() {
      try { mid(); } finally {
        var src = nextBack();             // the deck can change with the theme
        if (src !== next) backImg.src = src;
        frontImg.style.visibility = 'hidden';
        backImg.style.visibility = 'visible';
      }
    }
    title.textContent = desi ? (settings.desiTheme === 'pro' || kind === 'pro' ? 'DESI PATTI' : 'देसी पत्ती') : 'UNO ARENA';
    S.play('shuffle');
    var tl = gsap.timeline({ onComplete: function () { ov.remove(); app.transitioning = false; } });
    tl.fromTo(ov, { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(150% at 50% 50%)', duration: 0.55, ease: 'power2.in' })
      .fromTo(card, { scale: 0.2, rotationY: -90, rotationZ: -20 }, { scale: 1, rotationY: 0, rotationZ: -6, duration: 0.5, ease: 'back.out(1.6)' }, 0.2)
      .to(card, { rotationY: 90, duration: 0.28, ease: 'power2.in', onComplete: swap })
      .fromTo(card, { rotationY: -90 }, { rotationY: 0, duration: 0.3, ease: 'power2.out', immediateRender: false })
      .fromTo(title, { y: 30, opacity: 0, scale: 0.8 }, { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' }, '-=0.2')
      .to(card, { scale: 0.1, rotationZ: 30, y: -40, opacity: 0, duration: 0.45, ease: 'power2.in' }, '+=0.35')
      .to(title, { opacity: 0, duration: 0.25 }, '<')
      .to(ov, { clipPath: 'circle(0% at 50% 50%)', duration: 0.5, ease: 'power2.inOut' }, '-=0.15');
    for (var i = 0; i < 26; i++) {
      var d = document.createElement('i');
      $('.ut-burst', ov).appendChild(d);
      var a = Math.random() * Math.PI * 2, r = 120 + Math.random() * 380;
      gsap.fromTo(d, { x: 0, y: 0, rotation: 0, opacity: 1 }, { x: Math.cos(a) * r, y: Math.sin(a) * r, rotation: Math.random() * 720, opacity: 0, duration: 1.4 + Math.random() * 0.6, delay: 0.7, ease: 'power2.out' });
    }
  }
  function setUniverse(u) {
    if (settings.universe === u || app.transitioning) return;
    hallTransition(u === 'desi' ? settings.desiTheme : 'uno', function () {
      settings.universe = u;
      saveSettings();
      buildHome();
      $('#screen-home').scrollTop = 0;
    });
  }
  function setDesiTheme(t) {
    if (settings.desiTheme === t || app.transitioning) return;
    hallTransition(t, function () { settings.desiTheme = t; saveSettings(); buildHome(); });
  }

  /* ------------------------------------------------------------------ */
  /* settings                                                            */
  /* ------------------------------------------------------------------ */
  var DEFAULT_SETTINGS = { sound: true, voice: true, volume: 0.7, anim: 1, theme: 'green', hints: true, sortHand: true, botSpeed: 1, name: '', avatar: 'panda', universe: 'uno', desiTheme: 'indian', desiDeck: 'noir' };
  var settings = Object.assign({}, DEFAULT_SETTINGS);
  try { Object.assign(settings, JSON.parse(localStorage.getItem('uno.settings') || '{}')); } catch (e) { /* ignore */ }
  function saveSettings() {
    try { localStorage.setItem('uno.settings', JSON.stringify(settings)); } catch (e) { /* ignore */ }
    applySettings();
  }
  function applySettings() {
    applyUniverse();
    S.configure({ on: settings.sound, voice: settings.voice, volume: +settings.volume });
    document.body.dataset.theme = settings.theme;
    if (app.table) app.table.speed = +settings.anim;
    if (app.session && app.session.controller) app.session.controller.speed = 1 / (+settings.botSpeed || 1);
    $('#btnSound').innerHTML = ic(settings.sound ? 'volume-high' : 'volume-off');
  }

  /* ------------------------------------------------------------------ */
  /* small UI helpers                                                    */
  /* ------------------------------------------------------------------ */
  function showScreen(id) {
    $$('.screen').forEach(function (s) { s.classList.toggle('active', s.id === 'screen-' + id); });
    app.screen = id;
  }
  function toast(text, cls) {
    var t = document.createElement('div');
    t.className = 'toast ' + (cls || '');
    t.textContent = text;
    $('#toasts').appendChild(t);
    gsap.fromTo(t, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25 });
    setTimeout(function () { gsap.to(t, { opacity: 0, y: -10, duration: 0.3, onComplete: function () { t.remove(); } }); }, cls === 'error' ? 2600 : 2200);
  }
  function modal(html, opts) {
    opts = opts || {};
    var m = $('#modal'), card = $('#modalCard');
    card.className = 'modal-card ' + (opts.cls || '');
    card.innerHTML = html;
    m.classList.remove('hidden');
    m.onclick = function (e) { if (e.target === m && opts.dismiss !== false) closeModal(); };
    gsap.fromTo(card, { scale: 0.85, opacity: 0, y: 20 }, { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: 'back.out(1.6)' });
    $$('[data-close]', card).forEach(function (b) { b.onclick = closeModal; });
    app.modalOpen = opts.id || true;
    return card;
  }
  function closeModal() {
    $('#modal').classList.add('hidden');
    app.modalOpen = null;
    if (app.demo) { app.demo.destroy(); app.demo = null; }
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function cardImg(f, cls, back) { return '<img class="' + (cls || 'mini-card') + '" src="' + Cards.faceImg(f, { back: back }) + '" alt="">'; }
  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }

  var app = {
    screen: 'home', table: null, session: null, queue: [], busy: false, view: null,
    selected: [], modalOpen: null, shownRoundEnd: null
  };
  window.UNOApp = app;

  /* ------------------------------------------------------------------ */
  /* home                                                                */
  /* ------------------------------------------------------------------ */
  /* ------------------------------------------------------------------ */
  /* hero showcase                                                       */
  /* ------------------------------------------------------------------ */
  function buildShowcase(desiHall) {
    var old = app.showcase;
    if (old) { gsap.ticker.remove(old.tick); clearInterval(old.timer); gsap.killTweensOf(old.els); }
    var fan = $('#lpFan');
    fan.innerHTML = '';
    var back = Cards.faceImg('back', { back: desiHall ? 'patti' : 'uno' });
    var heroFaces = desiHall ? [{ s: 'S', r: 'A' }, { s: 'H', r: 'K' }, { s: 'D', r: 'Q' }, { s: 'C', r: 'J' }, { s: 'H', r: 'A' }]
      : [{ c: 'wild', v: 'wild4' }, { c: 'yellow', v: 'draw2' }, { c: 'blue', v: 'reverse' }, { c: 'green', v: 'skip' }, { c: 'red', v: '7' }, { c: 'wild', v: 'wild' }];
    var ringFaces = desiHall
      ? [{ s: 'H', r: '10' }, { s: 'S', r: '7' }, { s: 'C', r: 'K' }, { s: 'H', r: 'Q' }, { s: 'D', r: '9' }, { s: 'S', r: 'J' }, { s: 'D', r: 'A' }, { s: 'C', r: '5' }, { s: 'H', r: '8' }, 'back']
      : [{ c: 'red', v: '7' }, { c: 'blue', v: 'reverse' }, { c: 'green', v: 'skip' }, { c: 'yellow', v: 'draw2' }, { c: 'wild', v: 'wild' }, { c: 'red', v: 'draw2' }, { c: 'blue', v: '0' }, { c: 'green', v: '5' }, { c: 'yellow', v: '9' }, 'back'];
    var img = function (f) { return f === 'back' ? back : Cards.faceImg(f); };

    fan.innerHTML = '<div class="sh-pool"></div><div class="sh-orbit"></div><div class="sh-sparks">' + new Array(14).join('<i></i>') + '</div>' +
      '<div class="sh-halo"></div><div class="sh-hero"><img class="sh-reflect" alt=""><div class="sh-hero-in"><img alt=""><i class="sh-sheen"></i></div></div>';
    var hero = $('.sh-hero', fan), heroIn = $('.sh-hero-in', fan), heroImg = $('.sh-hero-in img', fan), reflect = $('.sh-reflect', fan);
    heroImg.src = reflect.src = img(heroFaces[0]);
    var ring = ringFaces.map(function (f) {
      var c = document.createElement('div');
      c.className = 'sh-card';
      c.innerHTML = '<img src="' + img(f) + '" alt="">';
      c.dataset.face = JSON.stringify(f);
      fan.appendChild(c);
      return c;
    });
    $$('.sh-sparks i', fan).forEach(function (sp, i) {
      sp.style.left = (8 + Math.random() * 84) + '%';
      sp.style.animationDelay = (-Math.random() * 6).toFixed(2) + 's';
      sp.style.animationDuration = (4 + Math.random() * 4).toFixed(2) + 's';
    });

    // turn the featured card edge-on, swap its face, turn it back
    var idx = 0, flipping = false;
    function showFace(f) {
      if (flipping) return;
      flipping = true;
      gsap.timeline({ onComplete: function () { flipping = false; } })
        .to(reflect, { opacity: 0, duration: 0.2 }, 0)
        .to(heroIn, { rotationY: 90, duration: 0.32, ease: 'power2.in' }, 0)
        .add(function () { heroImg.src = reflect.src = img(f); })
        .fromTo(heroIn, { rotationY: -90 }, { rotationY: 0, duration: 0.42, ease: 'back.out(1.6)', immediateRender: false })
        .fromTo($('.sh-sheen', heroIn), { xPercent: -160 }, { xPercent: 160, duration: 0.8, ease: 'power2.inOut' }, '-=0.2')
        .to(reflect, { opacity: 1, duration: 0.35 }, '-=0.6');
      S.play('flick');
    }
    var timer = setInterval(function () {
      if (app.screen !== 'home' || document.hidden) return;
      idx = (idx + 1) % heroFaces.length;
      showFace(heroFaces[idx]);
    }, 3600);
    hero.addEventListener('click', function () { idx = (idx + 1) % heroFaces.length; showFace(heroFaces[idx]); });
    ring.forEach(function (c) {
      c.addEventListener('click', function () { var f = JSON.parse(c.dataset.face); if (f !== 'back') showFace(f); });
    });

    // the ring: each card's place, size and depth worked out every frame
    var angle = 0, speed = 1, target = 1, n = ring.length;
    var stageEl = $('#lpStage'), orbit = $('.sh-orbit', fan);
    stageEl.onpointerenter = function () { target = 0.25; };
    stageEl.onpointerleave = function () { target = 1; };
    function tick(time, dt) {
      if (app.screen !== 'home') return;
      speed += (target - speed) * 0.05;
      angle += (dt / 1000) * 0.32 * speed;
      var w = stageEl.clientWidth || 500, narrow = w < 520;
      var rx = Math.min(w * 0.45, 310), ry = narrow ? 62 : 104, lift = narrow ? 42 : 66;
      gsap.set(orbit, { width: rx * 2, height: ry * 2, x: -rx, y: lift - ry });
      for (var i = 0; i < n; i++) {
        var a = angle + i * Math.PI * 2 / n;
        var d = Math.cos(a);                 // 1 = nearest the viewer, -1 = far side
        var sc = 0.62 + 0.3 * (d + 1) / 2;
        gsap.set(ring[i], {
          x: Math.sin(a) * rx, y: lift + d * ry, scale: sc,
          rotationY: -Math.sin(a) * 38, rotation: Math.sin(a) * 8, transformPerspective: 800,
          zIndex: d > 0.15 ? 60 + Math.round(d * 20) : 10 + Math.round((d + 1) * 10),
          opacity: 0.45 + 0.55 * (d + 1) / 2
        });
      }
    }
    gsap.ticker.add(tick);
    tick(0, 0);
    // entrance: the featured card drops in and the ring fans out from it
    gsap.fromTo(hero, { y: -120, scale: 0.4, opacity: 0, rotation: -25 }, { y: 0, scale: 1, opacity: 1, rotation: 0, duration: 0.9, delay: 0.25, ease: 'back.out(1.5)' });
    // set the 3D depth once: tweening transformPerspective would grow it from 0 and blow the card up
    gsap.set([hero, heroIn], { transformPerspective: 900 });
    gsap.fromTo(hero, { rotationY: -8, rotationX: 0 }, { rotationY: 10, rotationX: -6, duration: 3.2, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1.2 });
    gsap.fromTo(ring.map(function (c) { return c.firstChild; }), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, stagger: 0.06, delay: 0.5, ease: 'back.out(1.7)' });
    app.showcase = { tick: tick, timer: timer, els: [hero, heroIn].concat(ring) };
  }

  function buildHome() {
    app.homeBuilt = true;
    var grid = $('#variantGrid');
    grid.innerHTML = '';
    gamesOf(settings.universe === 'desi' ? 'desi' : 'uno').forEach(function (id, n) {
      var V = E.VARIANTS[id];
      var tile = document.createElement('article');
      tile.className = 'mode';
      tile.style.setProperty('--accent', V.accent);
      tile.innerHTML = '<div class="mode-card"><div class="mode-art">' + cardImg(sig(id), 'mode-img') + cardImg('back', 'mode-img mode-img-back', backOf(id)) + '</div>' +
        '<span class="mode-players">' + I.svg('user') + ' ' + V.players[0] + '-' + V.players[1] + '</span></div>' +
        '<div class="mode-body"><h3>' + esc(V.name) + '</h3><p>' + esc(V.tagline) + '</p>' +
        '<div class="mode-actions"><button class="cta cta-yellow cta-sm" data-play>' + I.svg('play') + ' Play</button><button class="mode-rules" data-rules>' + I.svg('book-open-01') + ' Rules</button></div></div>';
      tile.querySelector('[data-play]').onclick = function () { openSetup(id); };
      tile.querySelector('[data-rules]').onclick = function () { openRules(id); };
      tile.querySelector('.mode-card').onclick = function () { openSetup(id); };
      gsap.set(tile, { transformPerspective: 900 });
      tile.addEventListener('pointermove', function (e) {
        var r = tile.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(tile, { rotationY: x * 10, rotationX: -y * 8, duration: 0.4 });
      });
      tile.addEventListener('pointerleave', function () { gsap.to(tile, { rotationY: 0, rotationX: 0, duration: 0.6 }); });
      grid.appendChild(tile);
    });
    var desiHall = settings.universe === 'desi';
    $$('.how-card').forEach(function (img, i) {
      var f = img.dataset.face;
      img.src = desiHall ? Cards.faceImg([{ s: 'S', r: 'A' }, { s: 'H', r: '2' }, { s: 'D', r: '3' }][i]) : Cards.faceImg({ c: { r: 'red', y: 'yellow', g: 'green' }[f[0]], v: f.slice(1) });
    });

    // hero showcase: a big featured card that turns to a new card every few seconds,
    // with a ring of cards orbiting round it over a pool of light
    buildShowcase(desiHall);
    $('.lp-sticker').textContent = desiHall ? (settings.desiTheme === 'pro' ? 'ACE!' : 'शाबाश!') : 'UNO!';
    gsap.fromTo('.lp-sticker', { scale: 0, rotation: -40 }, { scale: 1, rotation: 12, duration: 0.7, delay: 1.3, ease: 'elastic.out(1, .5)' });
    gsap.to('.lp-sticker', { scale: 1.08, duration: 0.8, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 2 });
    if (!app.heroBound) {
      app.heroBound = true;
      var stage = $('#lpStage');
      gsap.set(stage, { transformPerspective: 1100 });
      $('#screen-home').addEventListener('pointermove', function (e) {
        var x = e.clientX / window.innerWidth - 0.5, y = e.clientY / window.innerHeight - 0.5;
        gsap.to(stage, { rotationY: x * 14, rotationX: -y * 10, duration: 0.8 });
      });
    }
    gsap.from('.lp-copy > *', { y: 30, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' });
    gsap.from('.lp-features span', { y: 20, opacity: 0, duration: 0.5, stagger: 0.06, delay: 0.6 });

    // reveal sections as they scroll into view
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          io.unobserve(en.target);
          gsap.fromTo(en.target, { y: 50, opacity: 0, rotation: (Math.random() - 0.5) * 6 }, { y: 0, opacity: 1, rotation: 0, duration: 0.7, ease: 'back.out(1.4)' });
        });
      }, { root: $('#screen-home'), threshold: 0.15 });
      $$('.mode, .how-step, .lp-final').forEach(function (e) { gsap.set(e, { opacity: 0 }); io.observe(e); });
    }

    // drifting cards in the hero background
    var hc = $('#homeCards');
    hc.innerHTML = '';
    var bg = desiHall ? [{ s: 'S', r: 'K' }, { s: 'H', r: '7' }, 'back', { s: 'D', r: '10' }, { s: 'C', r: 'A' }, { s: 'H', r: 'Q' }, 'back', { s: 'S', r: '9' }]
      : [{ c: 'red', v: '7' }, { c: 'wild', v: 'wild4' }, { c: 'blue', v: 'reverse' }, { c: 'green', v: 'skip' }, { c: 'yellow', v: 'draw2' }, 'back', { c: 'red', v: '0' }, { c: 'wild', v: 'wild' }];
    bg.forEach(function (f, i) {
      var img = document.createElement('img');
      img.src = Cards.faceImg(f, { back: desiHall ? 'patti' : 'uno' });
      img.className = 'float-card';
      hc.appendChild(img);
      gsap.set(img, { left: (i / bg.length) * 100 + '%', top: (10 + Math.random() * 70) + '%', rotation: Math.random() * 60 - 30 });
      gsap.to(img, { y: '+=' + (40 + Math.random() * 60), rotationY: '+=' + (Math.random() > 0.5 ? 360 : -360), rotation: '+=' + (Math.random() * 40 - 20), duration: 9 + Math.random() * 8, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: -Math.random() * 8 });
    });

    var home = $('#screen-home');
    function scrollTo(id) { var t = id === 'top' ? 0 : $('#lp' + id.charAt(0).toUpperCase() + id.slice(1)).offsetTop - 70; home.scrollTo({ top: t, behavior: 'smooth' }); }
    $$('[data-scroll]').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); scrollTo(a.dataset.scroll); }; });
    home.addEventListener('scroll', function () { $('#lpNav').classList.toggle('solid', home.scrollTop > 40); });
    var quick = function () {
      var qv = settings.universe === 'desi' ? 'bhabhi' : 'classic';
      setup.variant = qv; setup.mode = 'cpu';
      startLocal(qv, E.VARIANTS[qv].defaults, cpuSeats(3, 'normal'));
    };
    $('#btnQuick').onclick = quick;
    $('#navPlay').onclick = function () { scrollTo('modes'); };
    $('#btnFinalPlay').onclick = function () { scrollTo('modes'); };
    var hallDefault = function () { var g = gamesOf(settings.universe === 'desi' ? 'desi' : 'uno'); return g.indexOf(setup.variant) >= 0 ? setup.variant : g[0]; };
    $('#btnOnline').onclick = function () { openSetup(hallDefault(), 'online'); };
    $('#btnPassPlay').onclick = function () { openSetup(hallDefault(), 'pass'); };
    $('#btnHowTo').onclick = function () { openRules(hallDefault()); };
    $('#navRules').onclick = function (e) { e.preventDefault(); openRules(hallDefault()); };
    $$('.uni-switch button').forEach(function (b) { b.onclick = function () { setUniverse(b.dataset.u); }; });
    $$('.theme-switch button').forEach(function (b) { b.onclick = function () { setDesiTheme(b.dataset.t); }; });
    $('#btnSettingsHome').onclick = openSettings;
  }

  /* ------------------------------------------------------------------ */
  /* age verification for the adults-only dare deck                      */
  /* ------------------------------------------------------------------ */
  function isAdultVerified() { try { return localStorage.getItem('uno.age18') === '1'; } catch (e) { return false; } }
  function ageBlocked() { try { return sessionStorage.getItem('uno.ageBlocked') === '1'; } catch (e) { return false; } }
  function ageGate(cb) {
    if (isAdultVerified()) return cb(true);
    if (ageBlocked()) { toast('The adults-only deck is for players aged 18 and over.', 'error'); return cb(false); }
    var now = new Date();
    var years = [];
    for (var y = now.getFullYear(); y >= now.getFullYear() - 100; y--) years.push(y);
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var card = modal('<div class="age-gate"><div class="age-badge">18+</div><h2>Adults only</h2>' +
      '<p>The adult dare deck contains cheeky party dares meant for grown-ups. Please confirm your date of birth.</p>' +
      '<div class="age-dob"><select data-d><option value="">Day</option>' + Array.from({ length: 31 }, function (_, i) { return '<option>' + (i + 1) + '</option>'; }).join('') + '</select>' +
      '<select data-m><option value="">Month</option>' + months.map(function (m, i) { return '<option value="' + i + '">' + m + '</option>'; }).join('') + '</select>' +
      '<select data-y><option value="">Year</option>' + years.map(function (y) { return '<option>' + y + '</option>'; }).join('') + '</select></div>' +
      '<label class="opt age-check"><input type="checkbox" data-c><span>I confirm that I and everyone playing with me are 18 or older.</span></label>' +
      '<p class="age-err hidden"></p>' +
      '<div class="pr-btns"><button class="btn ghost" data-no>Cancel</button><button class="btn primary" data-yes>Verify &amp; continue</button></div></div>', { id: 'age', dismiss: false });
    var err = $('.age-err', card);
    function fail(msg) { err.textContent = msg; err.classList.remove('hidden'); gsap.fromTo(card, { x: -8 }, { x: 8, duration: 0.06, repeat: 5, yoyo: true, clearProps: 'x' }); }
    $('[data-no]', card).onclick = function () { closeModal(); cb(false); };
    $('[data-yes]', card).onclick = function () {
      var d = +$('[data-d]', card).value, m = $('[data-m]', card).value, y = +$('[data-y]', card).value;
      if (!d || m === '' || !y) return fail('Please enter your full date of birth.');
      var dob = new Date(y, +m, d);
      if (dob.getDate() !== d) return fail('That date doesn\'t exist.');
      var age = now.getFullYear() - y - ((now.getMonth() < +m || (now.getMonth() === +m && now.getDate() < d)) ? 1 : 0);
      if (age < 18) {
        try { sessionStorage.setItem('uno.ageBlocked', '1'); } catch (e) { /* ignore */ }
        closeModal();
        toast('Sorry - the adults-only deck is for players aged 18 and over. The family deck is all yours!', 'error');
        return cb(false);
      }
      if (!$('[data-c]', card).checked) return fail('Please confirm everyone playing is 18 or older.');
      try { localStorage.setItem('uno.age18', '1'); } catch (e) { /* ignore */ }
      closeModal();
      toast('Age verified - adult dares unlocked.', 'info');
      cb(true);
    };
  }

  /* ------------------------------------------------------------------ */
  /* setup                                                               */
  /* ------------------------------------------------------------------ */
  var setup = { variant: 'classic', mode: 'cpu', cpuCount: 3, level: 'normal', pass: null, opts: {} };

  function openSetup(variant, mode) {
    setup.variant = variant;
    setup.mode = mode || setup.mode || 'cpu';
    var V = E.VARIANTS[variant];
    setup.opts = Object.assign({}, V.defaults);
    setup.cpuCount = fitCount(V, setup.cpuCount + 1) - 1;
    if (!setup.pass) setup.pass = [{ name: settings.name || 'Player 1', kind: 'human', avatar: settings.avatar }, { name: 'Player 2', kind: 'human', avatar: rnd(AVATARS) }];
    $('#setupName').textContent = V.name;
    $('#setupTag').textContent = V.tagline;
    $('#setupCard').src = Cards.faceImg(sig(variant));
    $('#cpuName').value = settings.name || '';
    $('#onName').value = settings.name || '';
    $('#cpuAvatar').innerHTML = av(settings.avatar);
    $('#onAvatar').innerHTML = av(settings.avatar);
    $('#cpuCount').textContent = setup.cpuCount;
    buildOptForm($('#optForm'), variant, setup.opts, function (k, v) { setup.opts[k] = v; });
    setMode(setup.mode);
    renderPass();
    showScreen('setup');
  }
  function setMode(mode) {
    setup.mode = mode;
    $$('#modeTabs button').forEach(function (b) { b.classList.toggle('active', b.dataset.mode === mode); });
    $$('.mode-pane').forEach(function (p) { p.classList.toggle('hidden', p.dataset.pane !== mode); });
    $('#btnStart').classList.toggle('hidden', mode === 'online');
    $('#houseRules').classList.toggle('hidden', false);
    if (mode === 'online') connectOnline();
  }
  function buildOptForm(root, variant, opts, onChange, disabled) {
    var V = E.VARIANTS[variant];
    root.innerHTML = '';
    V.options.forEach(function (k) {
      var d = E.OPTION_DEFS[k];
      if (!d) return;
      var row = document.createElement('label');
      row.className = 'opt opt-' + d.type;
      var val = opts[k] != null ? opts[k] : V.defaults[k];
      var input;
      if (d.type === 'bool') {
        row.innerHTML = '<input type="checkbox"' + (val ? ' checked' : '') + '><span>' + esc(d.label) + '</span>';
        input = row.querySelector('input');
        input.onchange = function () { onChange(k, input.checked); };
      } else if (d.type === 'select') {
        row.innerHTML = '<span>' + esc(d.label) + '</span><select>' + d.choices.map(function (c) { return '<option value="' + c[0] + '"' + (c[0] === val ? ' selected' : '') + '>' + esc(c[1]) + '</option>'; }).join('') + '</select>';
        input = row.querySelector('select');
        input.onchange = function () {
          if (d.adultGate && input.value === 'adult') {
            return ageGate(function (ok) {
              if (ok) onChange(k, 'adult');
              else { input.value = 'family'; onChange(k, 'family'); }
            });
          }
          onChange(k, input.value);
        };
      } else {
        row.innerHTML = '<span>' + esc(d.label) + '</span><input type="number" min="' + d.min + '" max="' + d.max + '" step="' + d.step + '" value="' + val + '">';
        input = row.querySelector('input');
        input.onchange = function () { var n = Math.max(d.min, Math.min(d.max, +input.value || d.min)); input.value = n; onChange(k, n); };
      }
      if (disabled) input.disabled = true;
      root.appendChild(row);
    });
    if (V.fixed) {
      var note = document.createElement('p');
      note.className = 'hint';
      var fixedTxt = [];
      if (V.fixed.stacking && V.id === 'nomercy') fixedTxt.push('stacking (equal or higher)');
      if (V.fixed.sevenO) fixedTxt.push('7-0 swaps');
      if (V.fixed.drawMode === 'until') fixedTxt.push('draw until playable');
      if (V.fixed.mercy) fixedTxt.push('Mercy Rule');
      if (fixedTxt.length) { note.textContent = 'Always on in this mode: ' + fixedTxt.join(', ') + '.'; root.appendChild(note); }
    }
  }
  // nearest allowed table size (Seep: 2 or 4, Court Piece: exactly 4)
  function fitCount(V, n) {
    var allowed = V.allowed || [];
    if (!allowed.length) for (var i = V.players[0]; i <= V.players[1]; i++) allowed.push(i);
    var best = allowed[0];
    allowed.forEach(function (a) { if (Math.abs(a - n) < Math.abs(best - n)) best = a; });
    return best;
  }
  function cpuSeats(n, level) {
    var seats = [{ name: settings.name || 'You', kind: 'human', avatar: settings.avatar }];
    var names = BOT_NAMES.slice().sort(function () { return Math.random() - 0.5; });
    for (var i = 0; i < n; i++) {
      var lv = level === 'mixed' ? ['easy', 'normal', 'hard'][i % 3] : level;
      seats.push({ name: names[i], kind: 'bot', level: lv, avatar: BOT_AVATARS[BOT_NAMES.indexOf(names[i]) % BOT_AVATARS.length] });
    }
    return seats;
  }
  function renderPass() {
    var root = $('#passPlayers');
    root.innerHTML = '';
    var V = E.VARIANTS[setup.variant];
    setup.pass.forEach(function (p, i) {
      var row = document.createElement('div');
      row.className = 'player-row';
      row.innerHTML = '<button class="avatar-pick" title="Change avatar">' + av(p.avatar) + '</button>' +
        (p.kind === 'human' ? '<input maxlength="16" value="' + esc(p.name) + '">' : '<span class="pname">' + esc(p.name) + '</span><select><option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option></select>') +
        '<span class="tag-kind">' + (p.kind === 'human' ? 'Human' : 'CPU') + '</span><button class="btn tiny ghost" data-rm title="Remove">' + ic('cancel-01') + '</button>';
      var inp = row.querySelector('input');
      if (inp) inp.oninput = function () { p.name = inp.value; };
      var sel = row.querySelector('select');
      if (sel) { sel.value = p.level || 'normal'; sel.onchange = function () { p.level = sel.value; }; }
      row.querySelector('.avatar-pick').onclick = function () { pickAvatar(function (a) { p.avatar = a; renderPass(); }); };
      row.querySelector('[data-rm]').onclick = function () { if (setup.pass.length > 2) { setup.pass.splice(i, 1); renderPass(); } };
      root.appendChild(row);
    });
    $('#passAddHuman').disabled = $('#passAddBot').disabled = setup.pass.length >= V.players[1];
  }
  function bindSetup() {
    $$('[data-back]').forEach(function (b) { b.onclick = function () { showScreen('home'); }; });
    $$('#modeTabs button').forEach(function (b) { b.onclick = function () { setMode(b.dataset.mode); }; });
    $$('#screen-setup .stepper button').forEach(function (b) {
      b.onclick = function () {
        var V = E.VARIANTS[setup.variant];
        var allowed = V.allowed || null;
        var want = setup.cpuCount + 1 + +b.dataset.step;
        if (allowed) { var idx = allowed.indexOf(setup.cpuCount + 1) + +b.dataset.step; want = allowed[Math.max(0, Math.min(allowed.length - 1, idx))]; }
        setup.cpuCount = Math.max(V.players[0], Math.min(V.players[1], want)) - 1;
        $('#cpuCount').textContent = setup.cpuCount;
      };
    });
    $$('#cpuLevel button').forEach(function (b) {
      b.onclick = function () { setup.level = b.dataset.v; $$('#cpuLevel button').forEach(function (x) { x.classList.toggle('active', x === b); }); };
    });
    $('#cpuAvatar').onclick = function () { pickAvatar(function (a) { settings.avatar = a; saveSettings(); $('#cpuAvatar').innerHTML = av(a); $('#onAvatar').innerHTML = av(a); }); };
    $('#onAvatar').onclick = $('#cpuAvatar').onclick;
    $('#cpuName').oninput = function () { settings.name = this.value.trim(); saveSettings(); $('#onName').value = settings.name; };
    $('#onName').oninput = function () { settings.name = this.value.trim(); saveSettings(); $('#cpuName').value = settings.name; };
    $('#passAddHuman').onclick = function () { setup.pass.push({ name: 'Player ' + (setup.pass.length + 1), kind: 'human', avatar: rnd(AVATARS) }); renderPass(); };
    $('#passAddBot').onclick = function () {
      var used = setup.pass.map(function (p) { return p.name; });
      var n = BOT_NAMES.filter(function (x) { return used.indexOf(x) < 0; })[0] || 'CPU';
      setup.pass.push({ name: n, kind: 'bot', level: 'normal', avatar: BOT_AVATARS[BOT_NAMES.indexOf(n) % BOT_AVATARS.length] });
      renderPass();
    };
    $('#setupRules').onclick = function () { openRules(setup.variant); };
    $('#btnStart').onclick = function () {
      if (setup.variant === 'dare' && setup.opts.dareDeck === 'adult' && !isAdultVerified()) {
        return ageGate(function (ok) { if (ok) $('#btnStart').click(); else { setup.opts.dareDeck = 'family'; openSetup('dare', setup.mode); } });
      }
      if (setup.mode === 'cpu') startLocal(setup.variant, setup.opts, cpuSeats(setup.cpuCount, setup.level));
      else if (setup.mode === 'pass') {
        if (!setup.pass.some(function (p) { return p.kind === 'human'; })) return toast('Add at least one human player', 'error');
        var PV = E.VARIANTS[setup.variant];
        if (fitCount(PV, setup.pass.length) !== setup.pass.length || setup.pass.length < PV.players[0]) return toast(PV.name + ' needs ' + (PV.allowed ? PV.allowed.join(' or ') : PV.players[0] + '-' + PV.players[1]) + ' players', 'error');
        startLocal(setup.variant, setup.opts, setup.pass.map(function (p, i) { return { name: (p.name || '').trim() || ('Player ' + (i + 1)), kind: p.kind, level: p.level || 'normal', avatar: p.avatar }; }));
      }
    };
    // online
    $('#onCreate').onclick = function () {
      if (!ensureName()) return;
      app.net.send({ t: 'create', variant: setup.variant, opts: setup.opts, isPublic: $('#onPublic').checked });
    };
    $('#onJoin').onclick = function () {
      if (!ensureName()) return;
      var c = $('#onCode').value.trim().toUpperCase();
      if (c.length < 4) return toast('Enter the room code', 'error');
      app.net.send({ t: 'join', code: c });
    };
    $('#onCode').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('#onJoin').click(); });
    $('#onRefresh').onclick = function () { app.net.send({ t: 'list' }); };
  }
  function ensureName() {
    if (!settings.name) { toast('Enter your name first', 'error'); $('#onName').focus(); return false; }
    app.net.connect({ name: settings.name, avatar: settings.avatar });
    return true;
  }
  function pickAvatar(cb) {
    var card = modal('<h2>Pick an avatar</h2><div class="avatar-grid">' + AVATARS.map(function (a) { return '<button data-a="' + a + '" title="' + a.replace(/-\d+$/, '') + '">' + av(a) + '</button>'; }).join('') + '</div>');
    $$('.avatar-grid button', card).forEach(function (b) { b.onclick = function () { cb(b.dataset.a); closeModal(); }; });
  }

  /* ------------------------------------------------------------------ */
  /* sessions                                                            */
  /* ------------------------------------------------------------------ */
  function ensureTable() {
    if (app.table) return app.table;
    app.table = new window.UNOTable($('#tableRoot'), {
      onCardClick: onCardClick,
      onCardThrow: function (id) { onCardClick(id, true); },
      onDeckClick: onDeckClick,
      onSlotClick: onSlotClick,
      onSeatClick: onSeatClick,
      onOppCardClick: onOppCardClick,
      onToast: toast,
      sortHand: function () { return settings.sortHand; },
      queueBoost: function () { return app.queue.length > 2 ? 2.2 : (app.queue.length > 0 ? 1.4 : 1); },
      isLocalHuman: function (pid) { return app.session && app.session.type === 'local' && app.session.humans.indexOf(pid) >= 0; }
    });
    app.table.speed = +settings.anim;
    return app.table;
  }

  function endSession() {
    if (app.session && app.session.controller) app.session.controller.destroy();
    clearInterval(app.timerInt); app.timerInt = null;
    if (app.clockEl) app.clockEl.remove();
    app.session = null;
    app.queue = [];
    app.view = null;
    app.selected = [];
    app.shownRoundEnd = null;
    if (app.table) app.table.clear();
    $('#curtain').classList.add('hidden');
    closeModal();
  }

  function startLocal(variant, opts, seats) {
    endSession();
    var game = E.createGame(variant, opts, seats);
    var humans = seats.map(function (s, i) { return s.kind === 'human' ? i : -1; }).filter(function (i) { return i >= 0; });
    var session = app.session = { type: 'local', game: game, humans: humans, viewer: humans.length ? humans[0] : 0, config: { variant: variant, opts: opts, seats: seats } };
    session.controller = new window.UNOController.Controller(game, {
      botDelay: 800,
      turnTimer: +(game.o && game.o.turnTimer) || 0,
      onTimeout: function () { if (app.session === session) toast('Time\'s up - auto move', 'info'); },
      onUpdate: function (events) {
        if (app.session !== session) return;
        enqueue({ view: game.view(session.viewer), events: events });
      }
    });
    session.controller.speed = 1 / (+settings.botSpeed || 1);
    ensureTable();
    showScreen('game');
    $('#btnChat').classList.add('hidden');
    $('#emotes').classList.add('hidden');
    applySettings();
    setTimeout(function () { session.controller.start(); }, 50);
  }

  function enqueue(item) {
    app.queue.push(item);
    pump();
  }
  function pump() {
    if (app.busy) return;
    var item = app.queue.shift();
    if (!item) { idle(); return; }
    app.busy = true;
    var prevView = app.view;
    app.view = item.view;
    app.deadline = item.deadline != null ? Date.now() + item.deadline : null;
    logEvents(item.events);
    if (!prevView || prevView.round !== item.view.round) { app.selected = []; }
    clearPromptIfStale(item.view);
    app.table.update(item.view, item.events).then(function () {
      app.busy = false;
      renderHud(app.view);
      pump();
    }, function (err) { console.error(err); app.busy = false; pump(); });
    renderHud(item.view, true);
  }
  function idle() {
    var s = app.session;
    if (!s || s.type !== 'local' || s.humans.length < 2) return;
    var g = s.game;
    if (g.phase === 'roundOver' || g.gameOver) return;
    var actor = g.actor();
    if (actor == null || s.humans.indexOf(actor) < 0 || actor === s.viewer) return;
    // hand the device to the next human
    s.controller.pause();
    var p = g.players[actor];
    $('#curtainName').textContent = p.name;
    $('#curtainAv').innerHTML = av(p.avatar);
    $('#curtain').classList.remove('hidden');
    gsap.fromTo('#curtain .curtain-card', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 });
    $('#curtainGo').onclick = function () {
      $('#curtain').classList.add('hidden');
      s.viewer = actor;
      app.selected = [];
      enqueue({ view: g.view(actor), events: [] });
      s.controller.resume();
    };
  }

  /* ------------------------------------------------------------------ */
  /* acting                                                              */
  /* ------------------------------------------------------------------ */
  function me() { return app.view && app.view.me != null ? app.view.players[app.view.me] : null; }
  function legal(type) { return (app.view && app.view.legal || []).filter(function (a) { return a.type === type; }); }
  function act(action) {
    var s = app.session;
    if (!s) return;
    if (s.type === 'local') {
      var r = s.controller.act(s.viewer, action);
      if (!r.ok) { S.play('error'); toast(r.error, 'error'); }
      return r;
    }
    app.net.send({ t: 'act', action: action });
    return { ok: true };
  }

  function faceOfCard(cv) {
    var v = app.view;
    if (!cv) return null;
    if (v.variant === 'flip' && v.side === 'dark') return cv.b;
    return cv.a;
  }
  function shakeCard(id) {
    var rec = app.table.cards[id];
    if (!rec) return;
    gsap.fromTo(rec.inner, { x: -8 }, { x: 8, duration: 0.06, repeat: 5, yoyo: true, onComplete: function () { gsap.set(rec.inner, { x: 0 }); } });
  }

  function onCardClick(id, thrown) {
    var v = app.view;
    if (!v || app.busy && !thrown && false) return;
    var mine = me();
    if (!mine) return;
    var cv = mine.hand.filter(function (c) { return c.id === id; })[0];
    if (!cv) return;
    if (v.engine === 'dos') return dosCardClick(id);
    if (v.engine === 'patti') return pattiCardClick(id);
    // Liar's: Liar cards (with circles) are always played face-down with an announcement
    if (legal('bluff').some(function (a) { return a.cardId === id; })) return openClaimPicker(id);
    if (cv.a && cv.a.l && v.variant === 'liars') { S.play('error'); shakeCard(id); toast(v.actor === v.me ? 'Liar cards can\'t be played right now' : 'Wait for your turn', 'info'); return; }
    var play = legal('play').filter(function (a) { return a.cardId === id; })[0];
    if (play) { S.play('flick'); act(play); return; }
    S.play('error');
    shakeCard(id);
    if (v.actor !== v.me) toast('Wait for your turn', 'info');
    else if (v.drawStack) toast('Stack a draw card or take +' + v.drawStack, 'info');
    else if (v.phase === 'drawn') toast('You can only play the card you just drew', 'info');
    else if (v.phase === 'turn') {
      var top = v.discard[v.discard.length - 1];
      var tf = top && (top.claim || faceOfCard(top));
      toast('Doesn\'t match - play ' + (v.color ? v.color : '') + ' or a ' + (tf && tf.c !== 'wild' ? E.cardName({ c: '', v: tf.v }).trim() : 'Wild'), 'info');
    }
  }
  function onDeckClick() {
    var v = app.view;
    if (!v) return;
    if (legal('hit').length) return act({ type: 'hit' });
    if (legal('draw').length) { act({ type: 'draw' }); return; }
    if (v.actor === v.me) { S.play('error'); toast(v.phase === 'drawn' ? 'Play the drawn card or keep it' : 'You can\'t draw now', 'info'); }
  }
  function onSeatClick(pid) {
    var t = legal('target').filter(function (a) { return a.target === pid; })[0];
    if (t) { closeModal(); act(t); }
  }

  /* Desi games */
  function pattiCardClick(id) {
    var v = app.view;
    if (v.actor !== v.me) { S.play('error'); shakeCard(id); toast('Wait for your turn', 'info'); return; }
    if (v.select) {
      // Bluff: pick 1-4 cards, then press Play
      var i = app.selected.indexOf(id);
      if (i >= 0) app.selected.splice(i, 1);
      else if (app.selected.length < v.select.max) app.selected.push(id);
      else { S.play('error'); toast('At most ' + v.select.max + ' cards', 'info'); return; }
      S.play('flick');
      app.table.selected = app.selected;
      app.table.relayout();
      renderHud(v);
      return;
    }
    var moves = (v.legal || []).filter(function (a) { return a.cardId === id && a.type !== 'pick'; });
    if (!moves.length) { S.play('error'); shakeCard(id); toast(v.status || 'That card can\'t be played now', 'info'); return; }
    if (moves.length === 1) { S.play('flick'); app.pattiChoice = null; act(moves[0]); return; }
    // Seep: several things this card can do
    app.pattiChoice = { cardId: id, moves: moves };
    renderHud(v);
  }
  function onOppCardClick(id) {
    var v = app.view;
    if (!v || v.engine !== 'patti') return;
    var pick = (v.legal || []).filter(function (a) { return a.type === 'pick' && a.cardId === id; })[0];
    if (pick) { S.play('flick'); act(pick); }
  }
  function pattiPlaySelected() {
    var v = app.view;
    var sel = app.selected.slice();
    if (!v.select || sel.length < v.select.min) return toast('Select the cards to play first', 'info');
    if (!v.select.needRank) { app.selected = []; act({ type: 'play', cardIds: sel }); return; }
    var counts = {};
    sel.forEach(function (id) { var c = me().hand.filter(function (x) { return x.id === id; })[0]; if (c && c.a) counts[c.a.r] = (counts[c.a.r] || 0) + 1; });
    var ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
    var card = modal('<h2>Claim a rank</h2><p class="hint">You\'re putting ' + sel.length + ' card' + (sel.length > 1 ? 's' : '') + ' face-down. Say they are… (truth or bluff!)</p>' +
      '<div class="rank-grid">' + ranks.map(function (r) { return '<button data-r="' + r + '"' + (counts[r] ? ' class="truth"' : '') + '><b>' + r + '</b>' + (counts[r] ? '<small>you hold ' + counts[r] + '</small>' : '') + '</button>'; }).join('') + '</div>' +
      '<div class="pr-btns"><button class="btn ghost" data-close>Cancel</button></div>', { id: 'rank', cls: 'claim-modal' });
    $$('[data-r]', card).forEach(function (b) {
      b.onclick = function () { closeModal(); app.selected = []; act({ type: 'play', cardIds: sel, rank: b.dataset.r }); };
    });
  }
  var BTN_STYLE = { green: 'ab-green', yellow: 'ab-yellow', red: 'ab-red', blue: 'ab-blue', wild: 'ab-wild' };
  var BTN_ICON = { pass: 'arrow-right-01', bluff: 'alert-02', see: 'eye', chaal: 'checkmark-circle-02', raise: 'flash', pack: 'cancel-01', show: 'cards-01', sideshow: 'view-off', allin: 'fire', accept: 'checkmark-circle-02', deny: 'cancel-01', play: 'play' };
  function renderPattiHud(v, early) {
    var m = v.me != null ? v.players[v.me] : null;
    var myTurn = v.actor === v.me && v.me != null;
    ['#btnUno', '#btnCatch', '#btnDraw', '#btnPass', '#btnEndTurn'].forEach(function (s) { $(s).classList.add('hidden'); });
    $('#hudVariant').textContent = (E.VARIANTS[v.variant] || {}).short || v.name;
    $('#hudRound').textContent = 'Round ' + v.round + (v.rounds > 1 ? ' of ' + v.rounds : '');
    if (m) {
      $('#meAv').innerHTML = av(m.avatar);
      $('#meName').textContent = m.name + (app.session && app.session.type === 'local' && app.session.humans.length > 1 ? '' : ' (you)');
      var meta = [m.count + ' card' + (m.count === 1 ? '' : 's')];
      if (v.chips) meta.push('◉ ' + m.score + ' chips'); else if (v.rounds > 1 || v.teams) meta.push(m.score + ' pts');
      if (m.tag && m.tag !== 'BLIND' && m.tag !== 'SEEN') meta.push(m.tag);
      $('#meMeta').textContent = meta.join(' · ');
      $('#mePanel').classList.toggle('active', myTurn);
      $('#mePanel').classList.remove('hidden');
    } else $('#mePanel').classList.add('hidden');
    if (!myTurn) { app.pattiChoice = null; if (app.selected.length && v.select == null) app.selected = []; }
    // buttons
    var btns = [];
    (v.buttons && v.buttons.length ? v.buttons : (v.legal || []).filter(function (a) { return a.label && (a.type === 'pass' || a.type === 'bluff'); })).forEach(function (a) {
      btns.push({ label: a.label, style: a.style || (a.type === 'bluff' ? 'red' : 'blue'), icon: BTN_ICON[a.type] || 'play', action: a });
    });
    if (v.select && myTurn) btns.unshift({ label: v.select.label + (app.selected.length ? ' (' + app.selected.length + ')' : ''), style: 'yellow', icon: 'play', select: true, disabled: app.selected.length < v.select.min });
    var box = $('#pattiBtns');
    var sigKey = JSON.stringify(btns.map(function (b) { return [b.label, b.disabled]; }));
    if (box.dataset.k !== sigKey) {
      box.dataset.k = sigKey;
      box.innerHTML = '';
      btns.forEach(function (b) {
        var el = document.createElement('button');
        el.className = 'act-btn ' + (BTN_STYLE[b.style] || 'ab-blue');
        el.disabled = !!b.disabled;
        el.innerHTML = '<span class="ab-ic">' + ic(b.icon) + '</span><span class="ab-txt">' + esc(b.label) + '</span>';
        el.onclick = function () { if (b.select) pattiPlaySelected(); else act(b.action); };
        box.appendChild(el);
      });
    }
    // playable cards
    var playable = [];
    if (myTurn) {
      if (v.select) (m ? m.hand : []).forEach(function (c) { playable.push(c.id); });
      else (v.legal || []).forEach(function (a) { if (a.cardId && a.type !== 'pick' && playable.indexOf(a.cardId) < 0) playable.push(a.cardId); });
    }
    app.table.markCards(settings.hints ? playable : [], myTurn && settings.hints && !v.select, app.selected, myTurn ? v.pickFrom : null);
    // status
    var st = $('#hudStatus');
    var txt = v.status || '';
    if (v.myHandName) txt += ' · Your hand: ' + v.myHandName;
    if (st.textContent !== txt) { st.textContent = txt; gsap.fromTo(st, { xPercent: -50, x: 0, y: -6, opacity: 0.4 }, { xPercent: -50, x: 0, y: 0, opacity: 1, duration: 0.25 }); } // stay centred whatever the text length
    st.classList.toggle('mine', myTurn);
    // prompt: trump / bid choices, or the moves a Seep card can make
    var p = $('#prompt');
    var html = '';
    var opts = [];
    if (myTurn && v.prompt) { html = '<h4>' + esc(v.prompt.title) + '</h4>' + (v.prompt.text ? '<p>' + esc(v.prompt.text) + '</p>' : ''); opts = v.prompt.options; }
    else if (myTurn && app.pattiChoice) {
      var cv = (m ? m.hand : []).filter(function (c) { return c.id === app.pattiChoice.cardId; })[0];
      html = '<h4>What should ' + (cv && cv.a ? esc(window.UNOPattiArt.short(cv.a)) : 'this card') + ' do?</h4>';
      opts = app.pattiChoice.moves.map(function (a) { return { label: a.label, action: a }; });
    }
    if (opts.length) html += '<div class="choice-list">' + opts.map(function (o, i) { return '<button class="btn big' + (o.suit ? ' suit-' + o.suit : '') + '" data-o="' + i + '">' + esc(o.label) + '</button>'; }).join('') + '</div>' + (app.pattiChoice ? '<div class="pr-btns"><button class="btn ghost" data-cancel>Cancel</button></div>' : '');
    if (early) return;
    if (p.dataset.html !== html) {
      p.dataset.html = html;
      p.innerHTML = html;
      p.classList.toggle('show', !!html);
      if (html) gsap.fromTo(p, { y: 30, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.7)' });
      $$('[data-o]', p).forEach(function (b) { b.onclick = function () { var o = opts[+b.dataset.o]; app.pattiChoice = null; act(o.action); }; });
      var cb = $('[data-cancel]', p);
      if (cb) cb.onclick = function () { app.pattiChoice = null; renderHud(app.view); };
    }
    var key = v.round + ':' + v.turnNo + ':' + v.actor;
    if (myTurn && app.lastTurnKey !== key && v.phase !== 'roundOver') S.play('turn');
    app.lastTurnKey = key;
    if (v.phase === 'roundOver' && app.shownRoundEnd !== v.round + ':' + v.gameOver) {
      app.shownRoundEnd = v.round + ':' + v.gameOver;
      setTimeout(function () { showRoundEnd(app.view); }, 1300);
    }
  }

  /* DOS */
  function dosCardClick(id) {
    var v = app.view;
    if (v.actor !== v.me) { toast('Wait for your turn', 'info'); return; }
    var place = legal('place').filter(function (a) { return a.cardId === id; })[0];
    var hasMatch = legal('match').length > 0;
    if (place && (v.phase === 'bonus' || !hasMatch)) { act(place); app.selected = []; return; }
    var i = app.selected.indexOf(id);
    if (i >= 0) app.selected.splice(i, 1);
    else { app.selected.push(id); if (app.selected.length > 2) app.selected.shift(); }
    S.play('flick');
    app.table.selected = app.selected;
    app.table.relayout();
    renderHud(v);
  }
  function onSlotClick(slot) {
    var v = app.view;
    if (!v || v.engine !== 'dos') return;
    if (v.actor !== v.me) return toast('Wait for your turn', 'info');
    if (!app.selected.length) return toast('Select one or two cards from your hand first', 'info');
    var sel = app.selected.slice().sort().join(',');
    var m = legal('match').filter(function (a) { return a.slot === slot && a.cards.slice().sort().join(',') === sel; })[0];
    if (!m) { S.play('error'); toast(app.selected.length === 1 ? 'That number doesn\'t match' : 'Those two don\'t add up to it', 'error'); return; }
    app.selected = [];
    act(m);
  }

  /* ------------------------------------------------------------------ */
  /* HUD                                                                 */
  /* ------------------------------------------------------------------ */
  function name(pid) { var p = app.view.players[pid]; return p ? p.name : '?'; }
  function clearPromptIfStale(v) {
    if (app.modalOpen === 'claim' && (v.actor !== v.me || v.phase !== 'turn')) closeModal();
    if (app.modalOpen === 'target' && (v.phase !== 'target' || v.actor !== v.me)) closeModal();
    // the turn moved on (e.g. the clock ran out): drop half-made desi choices
    if (v.actor !== v.me) {
      if (app.modalOpen === 'rank') closeModal();
      app.pattiChoice = null;
    }
    var mine = v.me != null && v.players[v.me] ? v.players[v.me].hand.map(function (c) { return c.id; }) : [];
    app.selected = app.selected.filter(function (id) { return mine.indexOf(id) >= 0; });
  }

  function renderHud(v, early) {
    if (!v) return;
    document.body.dataset.playing = v.engine;
    $('#pattiBtns').classList.toggle('hidden', v.engine !== 'patti');
    if (v.engine === 'patti') { renderPattiHud(v, early); updateTimer(); return; }
    var m = v.me != null ? v.players[v.me] : null;
    var myTurn = v.actor === v.me && v.me != null;
    var isDos = v.engine === 'dos';
    $('#hudVariant').textContent = (E.VARIANTS[v.variant] || {}).short || v.name;
    $('#hudRound').textContent = 'Round ' + v.round + (v.options.scoreMode === 'points' ? ' · to ' + v.options.target : '');
    // me panel
    if (m) {
      $('#meAv').innerHTML = av(m.avatar);
      $('#meName').textContent = m.name + (app.session && app.session.type === 'local' && app.session.humans.length > 1 ? '' : ' (you)');
      $('#meMeta').textContent = m.count + ' card' + (m.count === 1 ? '' : 's') + (v.options.scoreMode === 'points' ? ' · ' + m.score + ' pts' : '') + (m.out ? ' · OUT' : '');
      $('#mePanel').classList.toggle('active', myTurn);
      $('#mePanel').classList.remove('hidden');
    } else $('#mePanel').classList.add('hidden');

    // buttons
    var types = {};
    (v.legal || []).forEach(function (a) { types[a.type] = true; });
    var uno = $('#btnUno');
    uno.classList.toggle('is-dos', isDos);
    uno.disabled = !types.uno;
    uno.classList.toggle('hidden', !types.uno);
    uno.classList.toggle('pulse', !!types.uno);
    var catchB = $('#btnCatch');
    catchB.classList.toggle('hidden', !types.catch);
    if (types.catch) $('.ab-txt', catchB).textContent = 'Catch ' + name(v.unoPending) + '!';
    var draw = $('#btnDraw');
    draw.classList.toggle('hidden', !(types.draw || types.hit));
    $('.ab-txt', draw).textContent = v.drawStack ? 'Take +' + v.drawStack : (v.variant === 'attack' || types.hit ? 'Hit launcher' : 'Draw');
    draw.classList.toggle('ab-red', !!v.drawStack);
    draw.classList.toggle('ab-blue', !v.drawStack);
    $('#btnPass').classList.toggle('hidden', !types.pass);
    $('#btnEndTurn').classList.toggle('hidden', !types.endTurn);
    $('#btnLog').classList.toggle('hidden', false);

    // playable highlighting
    var playable = [];
    if (isDos) {
      if (myTurn) {
        legal('match').forEach(function (a) { a.cards.forEach(function (id) { if (playable.indexOf(id) < 0) playable.push(id); }); });
        if (v.phase === 'bonus' || (!legal('match').length && legal('place').length)) legal('place').forEach(function (a) { playable.push(a.cardId); });
      }
      app.table.setSlotSelectable(myTurn && app.selected.length > 0);
    } else {
      legal('play').forEach(function (a) { playable.push(a.cardId); });
      legal('bluff').forEach(function (a) { playable.push(a.cardId); });
    }
    app.table.markCards(settings.hints ? playable : [], myTurn && settings.hints && !isDos, app.selected);
    app.table.setTargetMode(myTurn && v.phase === 'target');

    // status + prompt
    renderStatus(v, myTurn);
    if (!early) renderPrompt(v, myTurn);
    updateTimer();
    // turn notification
    var key = v.round + ':' + v.turnNo + ':' + v.actor;
    if (!early && myTurn && app.lastTurnKey !== key && v.phase !== 'roundOver') { S.play('turn'); }
    if (!early) app.lastTurnKey = key;
    if (!early && v.phase === 'roundOver' && app.shownRoundEnd !== v.round + ':' + v.gameOver) {
      app.shownRoundEnd = v.round + ':' + v.gameOver;
      setTimeout(function () { showRoundEnd(app.view); }, 1100);
    }
  }

  function renderStatus(v, myTurn) {
    var st = $('#hudStatus');
    var txt = '';
    var actor = v.actor;
    var pend = v.pend;
    if (v.phase === 'roundOver') txt = (v.roundResult ? name(v.roundResult.winner) : '') + ' wins the round!';
    else if (myTurn) {
      switch (v.phase) {
        case 'turn':
          if (v.engine === 'dos') txt = app.selected.length ? 'Now tap a Center Row card to match' : 'Select 1-2 cards, then tap a Center Row card';
          else if (v.drawStack) txt = '+' + v.drawStack + ' incoming - stack a draw card or take them!';
          else txt = 'Your turn' + (v.color ? ' - match ' + v.color.toUpperCase() : '');
          break;
        case 'drawn': txt = v.engine === 'dos' ? 'Match with the drawn card, or tap a card to add it to the Center Row' : 'You drew a playable card - play it or keep it'; break;
        case 'bonus': txt = 'Color Match bonus! Tap a card to add it to the Center Row'; break;
        case 'color': txt = 'Choose a colour'; break;
        default: txt = 'Your decision';
      }
    } else if (actor != null) {
      var who = name(actor);
      switch (v.phase) {
        case 'color': txt = who + ' is choosing a colour…'; break;
        case 'target': txt = who + ' is choosing a player…'; break;
        case 'challenge': txt = who + ' decides whether to challenge…'; break;
        case 'liar': txt = who + ' decides: believe it or call LIAR?'; break;
        case 'roulette': txt = who + ' is naming a colour for the Roulette…'; break;
        case 'dare': txt = who + ': dare or draw?'; break;
        case 'dareActive': txt = who + '\'s dare: "' + (pend && pend.text) + '"'; break;
        case 'launch': txt = who + ' must hit the launcher…'; break;
        case 'bonus': txt = who + ' is adding cards to the Center Row…'; break;
        default: txt = who + '\'s turn' + (v.drawStack ? ' (+' + v.drawStack + ' stacked)' : '');
      }
    }
    if (st.textContent !== txt) {
      st.textContent = txt;
      gsap.fromTo(st, { y: -6, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.25 });
    }
    st.classList.toggle('mine', !!myTurn);
  }

  function colorButtons(colors, type) {
    return '<div class="color-pick">' + colors.map(function (c, i) {
      return '<button class="cp cp-' + c + '" data-color="' + c + '" style="--c:' + Cards.COLORS[c] + '"><span>' + c + '</span><kbd>' + (i + 1) + '</kbd></button>';
    }).join('') + '</div>';
  }

  function renderPrompt(v, myTurn) {
    var p = $('#prompt');
    var html = '';
    var pend = v.pend || {};
    if (myTurn) {
      switch (v.phase) {
        case 'color':
          html = '<h4>Choose a colour</h4>' + colorButtons(legal('color').map(function (a) { return a.color; }));
          break;
        case 'roulette':
          html = '<h4>Color Roulette! Name a colour - you flip cards until it appears</h4>' + colorButtons(legal('color').map(function (a) { return a.color; }));
          break;
        case 'target':
          html = '<h4>' + (pend.mode === 'draw2' ? 'Who draws two?' : 'Swap hands with…') + '</h4><div class="target-pick">' +
            legal('target').map(function (a) { var pl = v.players[a.target]; return '<button data-target="' + a.target + '"><span class="tp-av">' + av(pl.avatar) + '</span><b>' + esc(pl.name) + '</b><small>' + pl.count + ' cards</small></button>'; }).join('') + '</div>';
          break;
        case 'challenge': {
          var wc = pend.value === 'wildcolor';
          html = '<h4>' + esc(name(pend.p)) + ' played ' + E.cardName({ c: 'wild', v: pend.value }) + '</h4><p>' +
            (wc ? 'Accept and draw until you hit ' + (pend.color || v.color) + ', or challenge.' : 'Accept and draw ' + pend.n + ', or challenge.') +
            ' If ' + esc(name(pend.p)) + ' had a ' + (pend.color || v.color || '') + ' card, they take the penalty. If not, you take it +2.</p>' +
            '<div class="pr-btns"><button class="btn big" data-act="accept">' + (wc ? 'Accept' : 'Accept +' + pend.n) + '</button><button class="btn big danger" data-act="challenge">' + ic('justice-scale-01') + ' Challenge!</button></div>';
          break;
        }
        case 'liar':
          html = '<h4>' + esc(name(pend.p)) + ' says: <span class="claim">' + E.cardName(pend.claim) + (pend.color ? ' - ' + pend.color : '') + '</span></h4>' +
            '<p>Believe it, or call LIAR? Wrong call costs ' + (v.options.liarPenalty || 2) + ' cards.</p>' +
            '<div class="pr-btns"><button class="btn big" data-act="accept">' + ic('handshake') + ' Believe</button><button class="btn big danger" data-act="challenge">' + ic('eye') + ' LIAR!</button></div>';
          break;
        case 'dare':
          html = '<h4>' + (E.DARE_LABEL[pend.category] || 'Dare') + '!</h4><p>Take the dare, or draw ' + pend.n + ' cards?</p>' +
            '<div class="pr-btns"><button class="btn big primary" data-act="dareDo">' + ic('mask-theater-01') + ' Do the dare</button><button class="btn big" data-act="dareDraw">Draw ' + pend.n + '</button></div>';
          break;
        case 'dareActive':
          html = '<div class="dare-card dare-' + pend.category + '"><small>' + (E.DARE_LABEL[pend.category] || '') + '</small><p>' + esc(pend.text) + '</p></div>' +
            '<div class="pr-btns"><button class="btn big primary" data-act="dareDone">' + ic('checkmark-circle-02') + ' Done!</button><button class="btn big" data-act="dareFail">' + ic('sad-01') + ' Give up (+' + (pend.n + 2) + ')</button></div>';
          break;
        case 'launch':
          html = '<h4>Hit the launcher' + (pend.mode === 'count' ? ' (' + pend.left + ' more)' : ' until it fires!') + '</h4><div class="pr-btns"><button class="btn big danger" data-act="hit">' + ic('bomb') + ' HIT</button></div>';
          break;
      }
    } else if (v.phase === 'dareActive') {
      html = '<div class="dare-card dare-' + pend.category + '"><small>' + esc(name(pend.actor)) + ' - ' + (E.DARE_LABEL[pend.category] || '') + '</small><p>' + esc(pend.text) + '</p></div>';
    }
    if (p.dataset.html === html) return;
    p.dataset.html = html;
    p.innerHTML = html;
    p.classList.toggle('show', !!html);
    if (html) gsap.fromTo(p, { y: 30, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.7)' });
    $$('[data-color]', p).forEach(function (b) { b.onclick = function () { act({ type: 'color', color: b.dataset.color }); }; });
    $$('[data-target]', p).forEach(function (b) { b.onclick = function () { act({ type: 'target', target: +b.dataset.target }); }; });
    $$('[data-act]', p).forEach(function (b) { b.onclick = function () { act({ type: b.dataset.act }); }; });
  }

  // turn clock: a ring fills around the avatar of whoever is on the clock, with the seconds left
  function clockDeadline() {
    var s = app.session;
    // local games read the controller live, so pauses and pass-and-play hand-overs restart it correctly
    return s && s.type === 'local' ? s.controller.deadline : app.deadline;
  }
  function clockHost(pid) {
    if (pid === app.view.me) return $('#meAv');
    var seat = app.table && app.table.seats && app.table.seats[pid];
    return seat ? seat.querySelector('.seat-av') : null;
  }
  function updateTimer() {
    if (app.timerInt) return;
    var clock = app.clockEl;
    if (!clock) {
      clock = app.clockEl = document.createElement('div');
      clock.className = 'turn-clock';
      clock.innerHTML = '<svg viewBox="0 0 100 100"><circle class="tc-track" cx="50" cy="50" r="46" pathLength="100"/><circle class="tc-fill" cx="50" cy="50" r="46" pathLength="100"/></svg><b class="tc-sec"></b>';
    }
    var fill = clock.querySelector('.tc-fill'), sec = clock.querySelector('.tc-sec');
    var seen = null, total = 1, lastTick = 0;
    function tick() {
      var v = app.view, dl = clockDeadline();
      var host = dl && v && v.actor != null && v.phase !== 'roundOver' && !v.gameOver ? clockHost(v.actor) : null;
      if (!host) { if (clock.parentNode) clock.remove(); return; }
      // the deadline also covers the animation before the turn; never show more than the limit
      var limit = (+(v.options && v.options.turnTimer) || 0) * 1000;
      if (dl !== seen) { seen = dl; total = limit || Math.max(1000, dl - Date.now()); }
      if (clock.parentNode !== host) host.appendChild(clock);
      var left = Math.min(total, Math.max(0, dl - Date.now())), used = 1 - left / total;
      fill.style.strokeDashoffset = (100 - used * 100).toFixed(2);
      fill.style.stroke = 'hsl(' + Math.round(130 * (1 - used)) + ', 90%, 55%)';
      var s = Math.ceil(left / 1000);
      sec.textContent = s;
      clock.classList.toggle('urgent', left < 6000);
      if (v.actor === v.me && left < 6000 && left > 0 && s !== lastTick) { lastTick = s; S.play('tick'); }
    }
    tick();
    app.timerInt = setInterval(tick, 100);
  }

  function logEvents(events) {
    var list = $('#logList');
    (events || []).forEach(function (e) {
      if (e.t !== 'log') return;
      var d = document.createElement('div');
      d.textContent = e.text;
      list.appendChild(d);
    });
    while (list.children.length > 120) list.removeChild(list.firstChild);
    list.scrollTop = list.scrollHeight;
  }

  /* Liar's claim picker: one tap for the truth, or colour tab + card thumbnail */
  function openClaimPicker(cardId) {
    var v = app.view;
    var claims = v.claims || [];
    var cv = me().hand.filter(function (c) { return c.id === cardId; })[0];
    var real = cv.a;
    var truth = claims.filter(function (x) { return x.c === real.c && x.v === real.v; })[0];
    var tabs = E.LIGHT.filter(function (c) { return claims.some(function (x) { return x.c === c; }); });
    tabs.push('wild');
    var current = tabs.indexOf(v.color) >= 0 ? v.color : tabs[0];
    var html = '<div class="lp">' +
      '<div class="lp-head">' + cardImg(real, 'lp-real') + '<div><h2>Liar card!</h2><p>Play it face-down and say what it is. Tell the truth&hellip; or lie.</p></div></div>' +
      (truth ? '<button class="lp-truth" data-truth>' + ic('checkmark-circle-02') + ' Tell the truth: <b>' + esc(E.cardName(real)) + '</b></button>' : '') +
      '<div class="lp-or">' + (truth ? 'or claim it\'s&hellip;' : 'Claim it\'s&hellip;') + '</div>' +
      '<div class="lp-tabs">' + tabs.map(function (c) {
        return '<button data-tab="' + c + '" class="lp-tab lp-' + c + '" style="--c:' + (c === 'wild' ? '#222' : Cards.COLORS[c]) + '">' + (c === 'wild' ? 'Wild' : c) + '</button>';
      }).join('') + '</div><div class="lp-grid"></div><div class="lp-cols hidden"></div>' +
      '<div class="pr-btns"><button class="btn ghost" data-close>Cancel</button></div></div>';
    var card = modal(html, { id: 'claim', cls: 'claim-modal' });
    function send(claim) { closeModal(); act({ type: 'bluff', cardId: cardId, claim: claim }); }
    function show(tab) {
      $$('.lp-tab', card).forEach(function (b) { b.classList.toggle('active', b.dataset.tab === tab); });
      var grid = $('.lp-grid', card), cols = $('.lp-cols', card);
      cols.classList.add('hidden');
      var opts = tab === 'wild' ? [{ c: 'wild', v: 'wild' }, { c: 'wild', v: 'wild4' }] : claims.filter(function (x) { return x.c === tab; });
      grid.innerHTML = opts.map(function (x, i) { return '<button class="lp-card" data-i="' + i + '" title="' + esc(E.cardName(x)) + '">' + cardImg({ c: x.c, v: x.v }, 'lp-img') + '</button>'; }).join('');
      $$('.lp-card', grid).forEach(function (b) {
        b.onclick = function () {
          var x = opts[+b.dataset.i];
          if (x.c !== 'wild') return send({ c: x.c, v: x.v });
          // wild claims also announce a colour
          $$('.lp-card', grid).forEach(function (o) { o.classList.toggle('picked', o === b); });
          cols.classList.remove('hidden');
          cols.innerHTML = '<span>Colour:</span>' + E.LIGHT.map(function (c) { return '<button data-col="' + c + '" style="--c:' + Cards.COLORS[c] + '"></button>'; }).join('');
          $$('[data-col]', cols).forEach(function (cb) { cb.onclick = function () { send({ c: 'wild', v: x.v, color: cb.dataset.col }); }; });
        };
      });
    }
    $$('.lp-tab', card).forEach(function (b) { b.onclick = function () { show(b.dataset.tab); }; });
    var tb = $('[data-truth]', card);
    if (tb) tb.onclick = function () { send({ c: real.c, v: real.v }); };
    show(current);
  }

  /* round end */
  function showRoundEnd(v) {
    if (!v || v.phase !== 'roundOver' || !v.roundResult) return;
    if (v.engine === 'patti') return showPattiRoundEnd(v);
    var rr = v.roundResult;
    var pts = v.options.scoreMode === 'points';
    var rows = v.players.slice().sort(function (a, b) { return b.score - a.score; }).map(function (p) {
      var br = rr.breakdown.filter(function (x) { return x.p === p.id; })[0];
      var won = p.id === rr.winner;
      return '<tr class="' + (won ? 'won' : '') + '"><td><span class="name-cell">' + av(p.avatar, 'sm') + ' ' + esc(p.name) + (won ? ' ' + ic('champion', 'gold') : '') + '</span>' + (p.out ? ' <small>(knocked out)</small>' : '') + '</td><td>' + (won ? '-' : (br ? br.cards : 0)) + '</td><td>' + (won ? '+' + rr.points : (br ? br.points : 0)) + '</td>' + (pts ? '<td><b>' + p.score + '</b></td>' : '') + '</tr>';
    }).join('');
    var mineWin = rr.winner === v.me;
    var title = rr.gameOver ? (mineWin ? 'You win the game!' : name(rr.winner) + ' wins the game!') : (mineWin ? 'You win the round!' : name(rr.winner) + ' wins the round');
    var online = app.session && app.session.type === 'online';
    var isHost = online && app.session.room && app.session.room.isHost;
    var btns = '';
    if (rr.gameOver) {
      if (!online) btns = '<button class="btn big primary" data-x="again">Play again</button>';
      else if (isHost) btns = '<button class="btn big primary" data-x="rematch">Rematch</button><button class="btn big" data-x="lobby">Back to lobby</button>';
      else btns = '<p class="hint">Waiting for the host…</p>';
      btns += '<button class="btn big ghost" data-x="menu">Main menu</button>';
    } else {
      btns = '<button class="btn big primary" data-x="next">Next round ' + ic('arrow-right-01') + '</button><button class="btn ghost" data-x="close">View table</button>';
    }
    var card = modal('<h2 class="re-title">' + esc(title) + '</h2>' + (rr.koBonus ? '<p class="hint">Includes ' + rr.koBonus + ' knockout bonus points</p>' : '') +
      '<table class="score-table"><thead><tr><th>Player</th><th>Cards left</th><th>Points</th>' + (pts ? '<th>Total</th>' : '') + '</tr></thead><tbody>' + rows + '</tbody></table>' +
      (pts && !rr.gameOver ? '<p class="hint">First to ' + v.options.target + ' points wins.</p>' : '') +
      '<div class="pr-btns">' + btns + '</div>', { id: 'roundEnd', dismiss: !rr.gameOver });
    $$('[data-x]', card).forEach(function (b) {
      b.onclick = function () {
        var x = b.dataset.x;
        closeModal();
        if (x === 'next') act({ type: 'nextRound' });
        else if (x === 'again') { var c = app.session.config; startLocal(c.variant, c.opts, c.seats); }
        else if (x === 'rematch') app.net.send({ t: 'rematch' });
        else if (x === 'lobby') app.net.send({ t: 'toLobby' });
        else if (x === 'menu') quitToMenu();
      };
    });
  }

  function quitToMenu() {
    if (app.session && app.session.type === 'online') app.net.send({ t: 'leave' });
    endSession();
    showScreen('home');
  }

  /* ------------------------------------------------------------------ */
  /* rules / settings / menu                                             */
  /* ------------------------------------------------------------------ */
  function showPattiRoundEnd(v) {
    var rr = v.roundResult;
    var winners = rr.winners || [rr.winner];
    var rows = v.players.slice().sort(function (a, b) { return b.score - a.score; }).map(function (p) {
      var won = winners.indexOf(p.id) >= 0;
      var d = rr.delta && rr.delta[p.id];
      return '<tr class="' + (won ? 'won' : '') + '"><td><span class="name-cell">' + av(p.avatar, 'sm') + ' ' + esc(p.name) + (won ? ' ' + ic('champion', 'gold') : '') + '</span></td>' +
        '<td>' + esc(p.handName || p.tag || '') + '</td><td>' + (d ? '+' + d : '') + '</td><td><b>' + (v.chips ? '◉ ' : '') + p.score + '</b></td></tr>';
    }).join('');
    var champ = v.players[rr.champion];
    var title = rr.gameOver ? (champ.id === v.me ? 'You win the game!' : champ.name + ' wins the game!') : rr.title;
    var online = app.session && app.session.type === 'online';
    var isHost = online && app.session.room && app.session.room.isHost;
    var btns;
    if (rr.gameOver) {
      btns = !online ? '<button class="btn big primary" data-x="again">Play again</button>' : (isHost ? '<button class="btn big primary" data-x="rematch">Rematch</button><button class="btn big" data-x="lobby">Back to lobby</button>' : '<p class="hint">Waiting for the host…</p>');
      btns += '<button class="btn big ghost" data-x="menu">Main menu</button>';
    } else btns = '<button class="btn big primary" data-x="next">Next round ' + ic('arrow-right-01') + '</button><button class="btn ghost" data-x="close">View table</button>';
    var card = modal('<h2 class="re-title">' + esc(title) + '</h2>' + (rr.gameOver ? '<p class="hint">' + esc(rr.title) + '</p>' : '') +
      '<table class="score-table"><thead><tr><th>Player</th><th></th><th>Round</th><th>' + (v.chips ? 'Chips' : 'Total') + '</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      (!rr.gameOver && v.rounds > 1 ? '<p class="hint">Round ' + v.round + ' of ' + v.rounds + '</p>' : '') +
      '<div class="pr-btns">' + btns + '</div>', { id: 'roundEnd', dismiss: !rr.gameOver });
    $$('[data-x]', card).forEach(function (b) {
      b.onclick = function () {
        var x = b.dataset.x;
        closeModal();
        if (x === 'next') act({ type: 'nextRound' });
        else if (x === 'again') { var c = app.session.config; startLocal(c.variant, c.opts, c.seats); }
        else if (x === 'rematch') app.net.send({ t: 'rematch' });
        else if (x === 'lobby') app.net.send({ t: 'toLobby' });
        else if (x === 'menu') quitToMenu();
      };
    });
  }

  function openRules(variant) {
    var ids = gamesOf(variant ? universeOf(variant) : (settings.universe === 'desi' ? 'desi' : 'uno'));
    if (!variant) variant = ids[0];
    var card = modal('<div class="rules"><div class="rules-tabs">' + ids.map(function (id) { return '<button data-v="' + id + '">' + esc(E.VARIANTS[id].short) + '</button>'; }).join('') + '<button data-v="controls">Controls</button></div><div class="rules-body"></div><div class="pr-btns"><button class="btn" data-close>Close</button></div></div>', { cls: 'wide rules-modal' });
    function show(id) {
      $$('.rules-tabs button', card).forEach(function (b) { b.classList.toggle('active', b.dataset.v === id); });
      var body = $('.rules-body', card);
      if (id === 'controls') {
        body.innerHTML = '<h2>How to play in UNO Arena</h2><dl class="ctl">' + Rules.general.map(function (g) { return '<dt>' + esc(g[0]) + '</dt><dd>' + esc(g[1]) + '</dd>'; }).join('') + '</dl>';
        return;
      }
      var R = Rules.variants[id], V = E.VARIANTS[id];
      var back = backOf(id);
      var demos = (window.UNODemos && window.UNODemos[id]) || [];
      var cardDemo = {};
      demos.forEach(function (d, i) { if (d.card != null) cardDemo[d.card] = i; });
      body.innerHTML = '<h2>' + esc(V.name) + '</h2><p class="lead">' + R.intro + '</p>' +
        (demos.length ? '<section class="demo-sec"><h3>' + ic('play', 'gold') + ' Watch it in action</h3>' +
          '<div class="demo-chips">' + demos.map(function (d, i) { return '<button data-demo="' + i + '">' + esc(d.title) + '</button>'; }).join('') + '</div>' +
          '<div class="demo-host"></div></section>' : '') +
        '<h3>The deck</h3><p>' + R.deck + '</p>' +
        '<h3>Setup</h3><ul>' + R.setup.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' +
        '<h3>Playing</h3><ol>' + R.turn.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol>' +
        '<h3>' + (R.cardsTitle || 'Special cards') + '</h3><div class="rule-cards">' + R.cards.map(function (c, ci) {
          var di = cardDemo[ci];
          return '<div class="rc">' + cardImg(c[0], 'rc-img', back) + '<div><b>' + esc(c[1]) + '</b><p>' + c[2] + '</p>' +
            (di != null ? '<button class="rc-watch" data-demo="' + di + '">' + ic('play') + ' Watch</button>' : '') + '</div></div>';
        }).join('') + '</div>' +
        (R.extra.length ? '<ul class="extra">' + R.extra.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' : '') +
        '<h3>Scoring</h3><p>' + R.scoring + '</p>';
      body.scrollTop = 0;
      if (app.demo) { app.demo.destroy(); app.demo = null; }
      var host = $('.demo-host', body);
      function playDemo(i, scroll) {
        if (app.demo) app.demo.destroy();
        app.demo = new window.UNODemo(host, demos[i]);
        $$('.demo-chips button', body).forEach(function (b) { b.classList.toggle('active', +b.dataset.demo === i); });
        if (scroll) host.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (host) {
        $$('[data-demo]', body).forEach(function (b) { b.onclick = function () { playDemo(+b.dataset.demo, b.classList.contains('rc-watch')); }; });
        playDemo(0, false);
      }
    }
    $$('.rules-tabs button', card).forEach(function (b) { b.onclick = function () { show(b.dataset.v); }; });
    show(variant || 'classic');
  }

  function openSettings() {
    var s = settings;
    var card = modal('<h2>Settings</h2><div class="settings">' +
      '<label class="opt"><input type="checkbox" data-k="sound"' + (s.sound ? ' checked' : '') + '><span>Sound effects</span></label>' +
      '<label class="opt"><input type="checkbox" data-k="voice"' + (s.voice ? ' checked' : '') + '><span>Voice ("UNO!")</span></label>' +
      '<label class="opt"><span>Volume</span><input type="range" min="0" max="1" step="0.05" data-k="volume" value="' + s.volume + '"></label>' +
      '<label class="opt"><span>Animation speed</span><select data-k="anim"><option value="0.7">Relaxed</option><option value="1">Normal</option><option value="1.4">Fast</option><option value="2">Very fast</option></select></label>' +
      '<label class="opt"><span>CPU speed</span><select data-k="botSpeed"><option value="0.7">Slow</option><option value="1">Normal</option><option value="1.6">Fast</option></select></label>' +
      '<label class="opt"><span>Table</span><select data-k="theme"><option value="green">Green felt</option><option value="blue">Blue felt</option><option value="red">Casino red</option><option value="purple">Midnight</option><option value="wood">Wooden table</option></select></label>' +
      '<label class="opt"><span>Desi card design</span><select data-k="desiDeck"><option value="noir">Noir gold</option><option value="theme">Match the hall theme</option><option value="indian">Indian ivory</option><option value="pro">Classic white</option></select></label>' +
      '<label class="opt"><input type="checkbox" data-k="hints"' + (s.hints ? ' checked' : '') + '><span>Highlight playable cards</span></label>' +
      '<label class="opt"><input type="checkbox" data-k="sortHand"' + (s.sortHand ? ' checked' : '') + '><span>Sort my hand by colour</span></label>' +
      '</div><div class="pr-btns"><button class="btn primary" data-close>Done</button></div>');
    $$('select[data-k]', card).forEach(function (el) { el.value = String(s[el.dataset.k]); });
    $$('[data-k]', card).forEach(function (el) {
      el.onchange = el.oninput = function () {
        var k = el.dataset.k;
        s[k] = el.type === 'checkbox' ? el.checked : (el.type === 'range' || k === 'anim' || k === 'botSpeed' ? +el.value : el.value);
        saveSettings();
        if (k === 'sortHand' && app.table && app.view) app.table.relayout();
        if (k === 'sound' && s.sound) S.play('pop');
      };
    });
  }

  function openMenu() {
    var local = app.session && app.session.type === 'local';
    if (local) app.session.controller.pause();
    var card = modal('<h2>Paused</h2><div class="menu-list">' +
      '<button class="btn big primary" data-m="resume">' + ic('play') + ' Resume</button>' +
      '<button class="btn big" data-m="rules">' + ic('book-open-01') + ' Rules</button>' +
      '<button class="btn big" data-m="settings">' + ic('settings-01') + ' Settings</button>' +
      (local ? '<button class="btn big" data-m="restart">' + ic('refresh') + ' Restart game</button>' : '') +
      '<button class="btn big danger" data-m="quit">' + ic('logout-03') + ' Quit to menu</button></div>', { id: 'menu' });
    var resume = function () { if (local && app.session) app.session.controller.resume(); };
    $('#modal').onclick = function (e) { if (e.target === $('#modal')) { closeModal(); resume(); } };
    $$('[data-m]', card).forEach(function (b) {
      b.onclick = function () {
        var m = b.dataset.m;
        if (m === 'resume') { closeModal(); resume(); }
        else if (m === 'rules') { resume(); openRules(app.view && app.view.variant); }
        else if (m === 'settings') { resume(); openSettings(); }
        else if (m === 'restart') { var c = app.session.config; startLocal(c.variant, c.opts, c.seats); }
        else if (m === 'quit') quitToMenu();
      };
    });
  }

  /* ------------------------------------------------------------------ */
  /* online                                                              */
  /* ------------------------------------------------------------------ */
  function connectOnline() {
    var net = app.net;
    if (!net.available()) { $('#netStatus').textContent = 'Online play needs the UNO Arena server (run "npm start" and open http://localhost:3000).'; return; }
    net.connect({ name: settings.name || 'Player', avatar: settings.avatar });
    net.send({ t: 'list' });
  }
  function bindNet() {
    var net = app.net = new window.UNONet();
    net.on('status', function (s) {
      var map = { connecting: 'Connecting to server…', online: 'Connected', offline: 'Disconnected - retrying…', error: 'Could not reach the server', unavailable: 'Online play needs the server (npm start).' };
      $('#netStatus').textContent = map[s.state] || '';
      if (s.state === 'offline' && app.session && app.session.type === 'online') toast('Connection lost - reconnecting…', 'warn');
    });
    net.on('welcome', function () { if (app.screen === 'setup' && setup.mode === 'online') net.send({ t: 'list' }); });
    net.on('list', function (m) {
      var root = $('#roomList');
      if (!m.rooms.length) { root.innerHTML = '<p class="hint">No open rooms yet - create one!</p>'; return; }
      root.innerHTML = m.rooms.map(function (r) {
        return '<div class="room-row"><b>' + esc(E.VARIANTS[r.variant].name) + '</b><span>' + esc(r.host || '') + '\'s room · ' + r.players + '/' + r.max + '</span><button class="btn tiny" data-code="' + r.code + '">Join</button></div>';
      }).join('');
      $$('[data-code]', root).forEach(function (b) { b.onclick = function () { if (ensureName()) net.send({ t: 'join', code: b.dataset.code }); }; });
    });
    net.on('room', function (m) {
      var room = m.room;
      if (!app.session || app.session.type !== 'online') {
        endSession();
        app.session = { type: 'online', room: room };
      }
      app.session.room = room;
      if (room.variant === 'dare' && room.opts && room.opts.dareDeck === 'adult' && !isAdultVerified() && !app.ageAsking) {
        app.ageAsking = true;
        ageGate(function (ok) {
          app.ageAsking = false;
          if (!ok) { net.send({ t: 'leave' }); endSession(); showScreen('home'); toast('That room uses the adults-only dare deck.', 'warn'); }
        });
      }
      if (room.state === 'lobby') {
        if (app.screen === 'game') { endSession(); app.session = { type: 'online', room: room }; }
        renderLobby(room);
        if (app.screen !== 'lobby') showScreen('lobby');
      }
    });
    net.on('game', function (m) {
      if (!app.session || app.session.type !== 'online') return;
      if (app.screen !== 'game') {
        ensureTable();
        app.table.clear();
        showScreen('game');
        $('#btnChat').classList.remove('hidden');
        $('#emotes').classList.remove('hidden');
        applySettings();
      }
      enqueue({ view: m.view, events: m.events, deadline: m.deadline });
    });
    net.on('error', function (m) { S.play('error'); toast(m.msg, 'error'); });
    net.on('toast', function (m) { toast(m.msg, 'info'); });
    net.on('kicked', function () { toast('You were removed from the room', 'warn'); endSession(); showScreen('home'); });
    net.on('left', function () { if (app.screen === 'lobby') { endSession(); showScreen('setup'); } });
    net.on('chat', function (m) { addChat(m); });
    net.on('emote', function (m) {
      if (!app.table || !app.view) return;
      if (I.has(m.e)) app.table.bubble(m.seat, ic(m.e), 'emote');
      S.play('pop');
    });
  }
  function addChat(m) {
    var html = m.from == null ? '<div class="sys">' + esc(m.text) + '</div>' : '<div class="chat-line">' + av(m.avatar, 'sm') + '<span><b>' + esc(m.from) + ':</b> ' + esc(m.text) + '</span></div>';
    ['#lobbyChat', '#gameChat'].forEach(function (s) { var el = $(s); el.insertAdjacentHTML('beforeend', html); el.scrollTop = el.scrollHeight; });
    if (app.screen === 'game' && !$('#chatPanel').classList.contains('open')) $('#chatDot').classList.remove('hidden');
    if (app.screen === 'game' && m.from != null && app.table) toast(m.from + ': ' + m.text, 'chat');
  }
  function renderLobby(room) {
    var V = E.VARIANTS[room.variant];
    $('#lobbyCode').textContent = room.code;
    $('#lobbyVariant').textContent = V.name + ' · ' + room.seats.length + '/' + V.players[1] + ' players' + (room.isPublic ? ' · public' : ' · private');
    $$('.host-only').forEach(function (e) { e.classList.toggle('hidden', !room.isHost); });
    $('#lobbyWait').textContent = room.isHost ? (room.seats.length < 2 ? 'Add a CPU or wait for friends to join' : '') : 'Waiting for the host to start…';
    var seats = $('#lobbySeats');
    seats.innerHTML = room.seats.map(function (s, i) {
      return '<div class="player-row"><span class="avatar-pick">' + av(s.avatar) + '</span><span class="pname">' + esc(s.name) + (i === room.you ? ' (you)' : '') + (i === room.host ? ' ' + ic('crown', 'gold') : '') + '</span>' +
        '<span class="tag-kind">' + (s.kind === 'bot' ? 'CPU ' + s.level : (s.connected ? 'online' : 'offline')) + '</span>' +
        (room.isHost && i !== room.you ? '<button class="btn tiny ghost" data-rm="' + i + '" title="Remove">' + ic('cancel-01') + '</button>' : '') + '</div>';
    }).join('');
    $$('[data-rm]', seats).forEach(function (b) { b.onclick = function () { app.net.send({ t: 'removeSeat', index: +b.dataset.rm }); }; });
    var sel = $('#lobbyVariantSel');
    if (!sel.options.length) sel.innerHTML = [['uno', 'UNO'], ['desi', 'Desi Patti']].map(function (g) {
      return '<optgroup label="' + g[1] + '">' + gamesOf(g[0]).map(function (id) { return '<option value="' + id + '">' + esc(E.VARIANTS[id].name) + '</option>'; }).join('') + '</optgroup>';
    }).join('');
    sel.value = room.variant;
    if (room.isHost) buildOptForm($('#lobbyOpts'), room.variant, room.opts, function (k, v) { var o = {}; o[k] = v; app.net.send({ t: 'setOpts', opts: o }); });
  }
  function bindLobby() {
    $('#lobbyLeave').onclick = function () { app.net.send({ t: 'leave' }); endSession(); showScreen('setup'); };
    $('#lobbyCopy').onclick = function () {
      var url = location.origin + location.pathname + '?room=' + $('#lobbyCode').textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { toast('Invite link copied!', 'info'); }, function () { prompt('Share this link:', url); });
    };
    $$('[data-bot]').forEach(function (b) { b.onclick = function () { app.net.send({ t: 'addBot', level: b.dataset.bot }); }; });
    $('#lobbyVariantSel').onchange = function () { app.net.send({ t: 'setOpts', variant: this.value }); };
    $('#lobbyStart').onclick = function () { app.net.send({ t: 'start' }); };
    ['#lobbyChatForm', '#gameChatForm'].forEach(function (s) {
      $(s).onsubmit = function (e) {
        e.preventDefault();
        var inp = $('input', this);
        if (inp.value.trim()) app.net.send({ t: 'chat', text: inp.value.trim() });
        inp.value = '';
      };
    });
  }

  /* ------------------------------------------------------------------ */
  /* game screen bindings                                                */
  /* ------------------------------------------------------------------ */
  function bindGame() {
    $('#btnMenu').onclick = openMenu;
    $('#btnRules').onclick = function () { openRules(app.view && app.view.variant); };
    $('#btnSettingsGame').onclick = openSettings;
    $('#btnSound').onclick = function () { settings.sound = !settings.sound; saveSettings(); };
    $('#btnLog').onclick = function () { $('#logPanel').classList.toggle('open'); $('#chatPanel').classList.remove('open'); };
    $('#btnChat').onclick = function () { $('#chatPanel').classList.toggle('open'); $('#logPanel').classList.remove('open'); $('#chatDot').classList.add('hidden'); };
    $$('.side-panel [data-close]').forEach(function (b) { b.onclick = function () { b.closest('.side-panel').classList.remove('open'); }; });
    $('#btnUno').onclick = function () { act({ type: 'uno' }); };
    $('#btnCatch').onclick = function () { act({ type: 'catch' }); };
    $('#btnDraw').onclick = onDeckClick;
    $('#btnPass').onclick = function () { act({ type: 'pass' }); };
    $('#btnEndTurn').onclick = function () { app.selected = []; act({ type: 'endTurn' }); };
    $$('#emotes button').forEach(function (b) { b.onclick = function () { app.net.send({ t: 'emote', e: b.dataset.e }); }; });
    document.addEventListener('keydown', function (e) {
      if (app.screen !== 'game' || e.target.tagName === 'INPUT') return;
      var v = app.view;
      if (e.key === 'Escape') { if (app.modalOpen) { closeModal(); if (app.session && app.session.type === 'local') app.session.controller.resume(); } else openMenu(); return; }
      if (!v || app.modalOpen) return;
      var k = e.key.toLowerCase();
      if (k === 'd') onDeckClick();
      else if (k === 'u') act({ type: 'uno' });
      else if (k === 'c' && legal('catch').length) act({ type: 'catch' });
      else if (k === 'p' && legal('pass').length) act({ type: 'pass' });
      else if (k === 'e' && legal('endTurn').length) act({ type: 'endTurn' });
      else if (COLOR_KEYS.indexOf(k) >= 0) {
        var cols = legal('color');
        var c = cols[+k - 1];
        if (c) act(c);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* boot                                                                */
  /* ------------------------------------------------------------------ */
  function boot() {
    I.hydrate();
    settings.avatar = I.avatarName(settings.avatar) === 'user' ? 'panda' : settings.avatar;
    applySettings();
    buildHome();
    bindSetup();
    bindNet();
    bindLobby();
    bindGame();
    var params = new URLSearchParams(location.search);
    var room = params.get('room');
    if (room) {
      openSetup('classic', 'online');
      $('#onCode').value = room.toUpperCase();
      history.replaceState(null, '', location.pathname);
      if (settings.name) setTimeout(function () { $('#onJoin').click(); }, 300);
      else toast('Enter your name, then press Join', 'info');
    }
    // rejoin an online game after a reload (the server remembers our seat)
    try { if (localStorage.getItem('uno.token') && app.net.available() && !room) app.net.connect({ name: settings.name || 'Player', avatar: settings.avatar }); } catch (e) { /* ignore */ }
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* optional */ });
    }
    // test hook
    window.UNOApp.startLocal = startLocal;
    window.UNOApp.openRules = openRules;
  }
  document.addEventListener('DOMContentLoaded', boot);
})();
