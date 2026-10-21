/*
 * Standard 52-card deck ("patte") for the Desi games, drawn as SVG.
 * Looks: 'modern' (light, flat, big indexes - the default), 'noir' (black premium deck with gold line art, star dust and
 * crescent moons), 'indian' (ivory cards, gold borders, Raja/Rani/Ghulam courts,
 * maroon mandala back) and 'pro' (classic white casino cards, lattice back).
 * Faces are { s: 'S'|'H'|'D'|'C', r: 'A'|'2'..'10'|'J'|'Q'|'K' } in a 60 x 90 box.
 */
(function () {
  'use strict';

  var PIP = {
    H: 'M0,9 C-9,2 -11,-2 -11,-5.5 C-11,-9.5 -7.4,-11.5 -4.4,-10.8 C-2.2,-10.3 -0.6,-8.6 0,-7.2 C0.6,-8.6 2.2,-10.3 4.4,-10.8 C7.4,-11.5 11,-9.5 11,-5.5 C11,-2 9,2 0,9 Z',
    D: 'M0,-11 C3,-6 6,-2.5 8.5,0 C6,2.5 3,6 0,11 C-3,6 -6,2.5 -8.5,0 C-6,-2.5 -3,-6 0,-11 Z',
    S: 'M0,-11 C-3,-6.5 -11,-2.8 -11,2.4 C-11,6.4 -7.6,8.1 -4.6,7 C-3.1,6.4 -1.9,5.2 -1.2,4 C-1.4,6.8 -2.4,9 -4.2,10.6 L4.2,10.6 C2.4,9 1.4,6.8 1.2,4 C1.9,5.2 3.1,6.4 4.6,7 C7.6,8.1 11,6.4 11,2.4 C11,-2.8 3,-6.5 0,-11 Z',
    C: 'M0,-11 C3.1,-11 5.2,-8.6 5.2,-5.9 C5.2,-4.6 4.7,-3.4 3.9,-2.5 C4.6,-2.9 5.4,-3.1 6.3,-3.1 C9,-3.1 11.2,-0.9 11.2,1.9 C11.2,4.7 9,6.9 6.3,6.9 C4.2,6.9 2.4,5.6 1.6,3.8 C1.7,6.6 2.7,8.9 4.4,10.6 L-4.4,10.6 C-2.7,8.9 -1.7,6.6 -1.6,3.8 C-2.4,5.6 -4.2,6.9 -6.3,6.9 C-9,6.9 -11.2,4.7 -11.2,1.9 C-11.2,-0.9 -9,-3.1 -6.3,-3.1 C-5.4,-3.1 -4.6,-2.9 -3.9,-2.5 C-4.7,-3.4 -5.2,-4.6 -5.2,-5.9 C-5.2,-8.6 -3.1,-11 0,-11 Z'
  };
  var NAMES = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
  var HINDI = { S: 'Hukum', H: 'Paan', D: 'Eent', C: 'Chidi' };
  var RANK_NAME = { A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' };
  var RANK_HINDI = { A: 'Ikka', J: 'Ghulam', Q: 'Begum', K: 'Badshah' };

  var STYLE = {
    indian: { paper: '#fffaf0', paper2: '#fbecc8', red: '#c1121f', black: '#1b1b2f', gold: '#c9971c', frame: '#c9971c', font: "Georgia,'Times New Roman',serif", skin: '#e8b07a' },
    pro: { paper: '#ffffff', paper2: '#f2f2f2', red: '#d0021b', black: '#111111', gold: '#b08d2c', frame: '#1f3b73', font: "'Helvetica Neue',Arial,sans-serif", skin: '#f2c9a0' }
  };

  function color(s, st) { return s === 'H' || s === 'D' ? st.red : st.black; }
  function pip(s, x, y, sc, fill, flip) {
    return '<path d="' + PIP[s] + '" fill="' + fill + '" transform="translate(' + x + ' ' + y + ') scale(' + sc + ')' + (flip ? ' rotate(180)' : '') + '"/>';
  }

  function shell(st, inner) {
    var g = st === STYLE.indian;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 90" width="240" height="360">' +
      '<defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + st.paper + '"/><stop offset="1" stop-color="' + st.paper2 + '"/></linearGradient></defs>' +
      '<rect x="0.3" y="0.3" width="59.4" height="89.4" rx="5" fill="url(#pg)" stroke="#222" stroke-width="0.6"/>' +
      (g ? '<rect x="2.2" y="2.2" width="55.6" height="85.6" rx="3.6" fill="none" stroke="' + st.gold + '" stroke-width="0.8"/><rect x="3.4" y="3.4" width="53.2" height="83.2" rx="3" fill="none" stroke="' + st.gold + '" stroke-width="0.3"/>' : '') +
      inner + '</svg>';
  }
  function corners(f, st) {
    var c = color(f.s, st);
    var t = '<g><text x="7.5" y="12.2" text-anchor="middle" style="font-family:' + st.font + ';font-weight:700;font-size:' + (f.r === '10' ? 8.2 : 10) + 'px" fill="' + c + '" letter-spacing="-0.6">' + f.r + '</text>' +
      pip(f.s, 7.5, 17.6, 0.3, c) + '</g>';
    return t + '<g transform="rotate(180 30 45)">' + t + '</g>';
  }

  var LAYOUT = {
    2: [[30, 20], [30, 70]],
    3: [[30, 20], [30, 45], [30, 70]],
    4: [[19, 20], [41, 20], [19, 70], [41, 70]],
    5: [[19, 20], [41, 20], [30, 45], [19, 70], [41, 70]],
    6: [[19, 20], [41, 20], [19, 45], [41, 45], [19, 70], [41, 70]],
    7: [[19, 20], [41, 20], [30, 32.5], [19, 45], [41, 45], [19, 70], [41, 70]],
    8: [[19, 20], [41, 20], [30, 32.5], [19, 45], [41, 45], [30, 57.5], [19, 70], [41, 70]],
    9: [[19, 20], [41, 20], [19, 36.7], [41, 36.7], [30, 45], [19, 53.3], [41, 53.3], [19, 70], [41, 70]],
    10: [[19, 20], [41, 20], [30, 28.3], [19, 36.7], [41, 36.7], [19, 53.3], [41, 53.3], [30, 61.7], [19, 70], [41, 70]]
  };

  function numberFace(f, st) {
    var c = color(f.s, st);
    var body = (LAYOUT[+f.r] || []).map(function (p) { return pip(f.s, p[0], p[1], 0.52, c, p[1] > 46); }).join('');
    return shell(st, corners(f, st) + body);
  }

  function aceFace(f, st) {
    var c = color(f.s, st);
    var indian = st === STYLE.indian;
    var deco = '';
    if (indian) {
      // a little mandala around the big pip
      var petals = '';
      for (var i = 0; i < 12; i++) petals += '<ellipse cx="30" cy="31" rx="2.4" ry="5.2" transform="rotate(' + (i * 30) + ' 30 45)" fill="none" stroke="' + st.gold + '" stroke-width="0.5"/>';
      deco = '<circle cx="30" cy="45" r="17" fill="none" stroke="' + st.gold + '" stroke-width="0.6"/><circle cx="30" cy="45" r="19.5" fill="none" stroke="' + st.gold + '" stroke-width="0.3" stroke-dasharray="1 1.2"/>' + petals;
    } else if (f.s === 'S') {
      deco = '<circle cx="30" cy="45" r="17" fill="none" stroke="' + c + '" stroke-width="0.5"/>';
    }
    var sc = f.s === 'S' ? 1.25 : 1.05;
    return shell(st, corners(f, st) + deco + pip(f.s, 30, 45, sc, c));
  }

  // court cards: a half-length figure, mirrored like real playing cards
  function courtFace(f, st) {
    var c = color(f.s, st);
    var indian = st === STYLE.indian;
    var robe = c, trim = st.gold, skin = st.skin;
    var accent = f.s === 'H' || f.s === 'D' ? (indian ? '#1b4d8c' : '#1f3b73') : (indian ? '#c1121f' : '#c8102e');
    var head = '<circle cx="30" cy="25.5" r="5.4" fill="' + skin + '" stroke="#3a2a1a" stroke-width="0.4"/>' +
      '<circle cx="28.2" cy="25" r="0.55" fill="#222"/><circle cx="31.8" cy="25" r="0.55" fill="#222"/>' +
      '<path d="M28.6 28 Q30 29 31.4 28" fill="none" stroke="#7a3a2a" stroke-width="0.45" stroke-linecap="round"/>';
    var hat = '', extra = '';
    if (f.r === 'K') {
      // Raja: turban with jewel and plume, moustache, sword
      hat = '<path d="M23.6 23.6 C23.6 17 36.4 17 36.4 23.6 C34.5 21.6 25.5 21.6 23.6 23.6 Z" fill="' + accent + '" stroke="' + trim + '" stroke-width="0.6"/>' +
        '<path d="M24.5 21.8 Q30 19.5 35.5 21.8" fill="none" stroke="' + trim + '" stroke-width="0.5"/>' +
        '<circle cx="30" cy="19.8" r="1.3" fill="' + trim + '" stroke="#7a5a10" stroke-width="0.3"/>' +
        '<path d="M30.4 19 C31.5 15 34.5 13.6 35.6 13.8 C33.6 15.2 32 17 31.1 19.4 Z" fill="' + (indian ? '#f4a300' : trim) + '"/>';
      extra = '<path d="M27.6 27.3 Q30 26.4 32.4 27.3 Q30 28 27.6 27.3 Z" fill="#3a2414"/>' +
        '<path d="M38.5 31 L42.5 13" stroke="#8a8f99" stroke-width="1.1" stroke-linecap="round"/><path d="M37 30 L40.6 31.6" stroke="' + trim + '" stroke-width="1"/>';
    } else if (f.r === 'Q') {
      // Rani: tiara, bindi, earrings, a flower
      hat = '<path d="M24.6 21.8 L26 17.6 L28 20.2 L30 16.4 L32 20.2 L34 17.6 L35.4 21.8 Z" fill="' + trim + '" stroke="#7a5a10" stroke-width="0.35"/>' +
        '<path d="M24.6 22 C24 27 24.4 31 23.2 33 M35.4 22 C36 27 35.6 31 36.8 33" fill="none" stroke="#2a1a10" stroke-width="1.6" stroke-linecap="round"/>';
      extra = (indian ? '<circle cx="30" cy="22.6" r="0.75" fill="#c1121f"/>' : '') +
        '<circle cx="24.4" cy="27.6" r="0.8" fill="' + trim + '"/><circle cx="35.6" cy="27.6" r="0.8" fill="' + trim + '"/>' +
        '<circle cx="41" cy="16" r="2.2" fill="' + (indian ? '#f4a300' : accent) + '"/><circle cx="41" cy="16" r="0.9" fill="#fff4c2"/><path d="M41 18.2 L39.5 30" stroke="#2e7d32" stroke-width="0.7"/>';
    } else {
      // Ghulam: small cap, staff
      hat = '<path d="M24.8 22.6 C25.2 18.4 34.8 18.4 35.2 22.6 Z" fill="' + accent + '" stroke="' + trim + '" stroke-width="0.5"/><circle cx="30" cy="18.6" r="0.9" fill="' + trim + '"/>';
      extra = '<path d="M39.5 32 L41 13.5" stroke="#6d4c2f" stroke-width="1" stroke-linecap="round"/><path d="M39.6 13.4 L41 11 L42.4 13.4 Z" fill="' + trim + '"/>';
    }
    var body = '<path d="M20.5 45 C20.5 36 24 31.5 30 31.5 C36 31.5 39.5 36 39.5 45 Z" fill="' + robe + '" stroke="#222" stroke-width="0.4"/>' +
      '<path d="M26.4 31.9 L30 37 L33.6 31.9" fill="none" stroke="' + trim + '" stroke-width="1"/>' +
      '<path d="M30 37 L30 45" stroke="' + trim + '" stroke-width="0.6" stroke-dasharray="1 1"/>' +
      (indian ? '<circle cx="30" cy="40" r="1.1" fill="' + trim + '"/><path d="M22.5 42 Q30 39.5 37.5 42" fill="none" stroke="' + trim + '" stroke-width="0.5"/>' : '');
    var half = '<g>' + body + head + hat + extra + pip(f.s, 17.2, 17.5, 0.36, c) + '</g>';
    var frame = '<rect x="11.5" y="9" width="37" height="72" rx="2" fill="' + (indian ? '#fff3d6' : '#fafafa') + '" stroke="' + st.frame + '" stroke-width="0.8"/>' +
      '<line x1="11.5" y1="45" x2="48.5" y2="45" stroke="' + st.frame + '" stroke-width="0.4"/>';
    var clip = '<clipPath id="cf"><rect x="11.5" y="9" width="37" height="36"/></clipPath>';
    return shell(st, corners(f, st) + '<defs>' + clip + '</defs>' + frame +
      '<g clip-path="url(#cf)">' + half + '</g><g transform="rotate(180 30 45)"><g clip-path="url(#cf)">' + half + '</g></g>');
  }


  /* ---------------- modern: light, flat and easy to read ---------------- */
  var MOD = { paper: '#f7f5ef', red: '#d7263d', navy: '#1d2b4f', coral: '#ef7b5b', pale: '#b5d8de', redTint: '#f6dcd8', navyTint: '#dde6ea',
    font: "'Helvetica Neue',Arial,'Liberation Sans',sans-serif" };
  function modInk(s) { return s === 'H' || s === 'D' ? MOD.red : MOD.navy; }
  function modShell(inner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 90" width="240" height="360">' +
      '<rect x="0.3" y="0.3" width="59.4" height="89.4" rx="3.6" fill="' + MOD.paper + '" stroke="#c9c4b8" stroke-width="0.5"/>' + inner + '</svg>';
  }
  // big, bold corner index: the part you still see when cards overlap in a hand
  function modCorners(f) {
    var c = modInk(f.s);
    var t = '<g><text x="7.6" y="13.4" text-anchor="middle" style="font-family:' + MOD.font + ';font-weight:800;font-size:' + (f.r === '10' ? 9.6 : 12) + 'px" fill="' + c + '" letter-spacing="-0.8">' + f.r + '</text>' +
      '<path d="' + PIP[f.s] + '" fill="' + c + '" transform="translate(7.6 20.2) scale(.34)"/></g>';
    return t + '<g transform="rotate(180 30 45)">' + t + '</g>';
  }
  function modNumber(f) {
    var c = modInk(f.s);
    // pip columns pulled in a little so they clear the larger corner index
    var body = (LAYOUT[+f.r] || []).map(function (q) { return pip(f.s, 30 + (q[0] - 30) * 0.8, 45 + (q[1] - 45) * 0.96, 0.52, c, q[1] > 46); }).join('');
    return modShell(modCorners(f) + body);
  }
  function modAce(f) {
    var red = f.s === 'H' || f.s === 'D';
    var tint = red ? MOD.redTint : MOD.navyTint, acc = red ? MOD.coral : MOD.pale;
    var deco = '<circle cx="30" cy="45" r="19" fill="' + tint + '"/>' +
      '<path d="M30 26 A19 19 0 0 1 49 45 L30 45 Z" fill="' + acc + '" opacity=".55"/>';
    return modShell(modCorners(f) + deco + pip(f.s, 30, 45, f.s === 'S' ? 1.3 : 1.15, modInk(f.s)));
  }
  // courts: a crowned letter monogram, mirrored like a real court card, over flat geometric shapes
  function modCourt(f) {
    var red = f.s === 'H' || f.s === 'D', ink = modInk(f.s);
    var acc = red ? MOD.coral : MOD.pale, acc2 = red ? MOD.redTint : MOD.navyTint;
    var crown = f.r === 'K' ? 'M21.5 21 L21.5 13 L25.8 16.8 L30 11.5 L34.2 16.8 L38.5 13 L38.5 21 Z'
      : f.r === 'Q' ? 'M22.5 21 L23.5 14.5 L27 17.6 L30 13 L33 17.6 L36.5 14.5 L37.5 21 Z'
      : 'M23.5 21 L23.5 15.5 L30 18.5 L36.5 15.5 L36.5 21 Z';
    var half = '<g>' +
      '<path d="M14 45 L14 28 A17 17 0 0 1 31 45 Z" fill="' + acc2 + '"/>' +
      '<path d="M46 45 L46 30 L33 45 Z" fill="' + acc + '" opacity=".7"/>' +
      '<path d="' + crown + '" fill="' + (red ? MOD.red : MOD.navy) + '"/>' +
      '<rect x="21.5" y="20" width="17" height="1.6" fill="' + acc + '"/>' +
      '<text x="30" y="43.6" text-anchor="middle" style="font-family:Georgia,\'Times New Roman\',serif;font-weight:700;font-size:25px" fill="' + ink + '">' + f.r + '</text>' +
      pip(f.s, 42.8, 25.5, 0.3, ink) + '</g>';
    var clip = '<clipPath id="mc"><rect x="13" y="9" width="34" height="36"/></clipPath>';
    return modShell(modCorners(f) + '<defs>' + clip + '</defs>' +
      '<g clip-path="url(#mc)">' + half + '</g><g transform="rotate(180 30 45)"><g clip-path="url(#mc)">' + half + '</g></g>' +
      '<line x1="14" y1="45" x2="46" y2="45" stroke="' + ink + '" stroke-width="0.4" opacity=".35"/>');
  }
  // back: a Bauhaus-style tiling of flat shapes
  function modBack() {
    var P = [MOD.navy, MOD.red, MOD.coral, MOD.pale, MOD.paper];
    // [background, shape colour, shape, rotation] per tile, 4 columns x 6 rows
    var T = [[3, 0, 'tri', 0], [0, 4, 'qc', 1], [2, 1, 'sq', 0], [4, 0, 'qc', 2],
      [1, 2, 'half', 0], [4, 1, 'circ', 0], [0, 3, 'tri', 2], [2, 4, 'dia', 0],
      [4, 0, 'qc', 3], [3, 1, 'tri', 1], [1, 4, 'qc', 0], [0, 2, 'half', 2],
      [2, 0, 'dia', 0], [0, 4, 'half', 1], [4, 2, 'tri', 3], [3, 0, 'qc', 1],
      [0, 3, 'circ', 0], [1, 2, 'qc', 2], [3, 0, 'half', 3], [4, 1, 'tri', 0],
      [4, 1, 'qc', 0], [2, 0, 'tri', 1], [0, 4, 'dia', 0], [1, 3, 'qc', 3]];
    var w = 13, h = 82 / 6, x0 = 4, y0 = 4, tiles = '';
    T.forEach(function (t, i) {
      var cx = x0 + (i % 4) * w, cy = y0 + Math.floor(i / 4) * h, bg = P[t[0]], fg = P[t[1]];
      var shape = t[2] === 'tri' ? '<path d="M0 0 L' + w + ' 0 L0 ' + h + ' Z" fill="' + fg + '"/>'
        : t[2] === 'qc' ? '<path d="M0 0 L' + w + ' 0 A' + w + ' ' + h + ' 0 0 1 0 ' + h + ' Z" fill="' + fg + '"/>'
        : t[2] === 'half' ? '<path d="M0 ' + h + ' A' + w / 2 + ' ' + h / 2 + ' 0 0 1 ' + w + ' ' + h + ' Z" fill="' + fg + '"/>'
        : t[2] === 'circ' ? '<circle cx="' + w / 2 + '" cy="' + h / 2 + '" r="' + w * 0.36 + '" fill="' + fg + '"/>'
        : t[2] === 'dia' ? '<path d="M' + w / 2 + ' 1.5 L' + (w - 1.5) + ' ' + h / 2 + ' L' + w / 2 + ' ' + (h - 1.5) + ' L1.5 ' + h / 2 + ' Z" fill="' + fg + '"/>'
        : '<rect x="' + w * 0.22 + '" y="' + h * 0.22 + '" width="' + w * 0.56 + '" height="' + h * 0.56 + '" fill="' + fg + '"/>';
      tiles += '<g transform="translate(' + cx.toFixed(2) + ' ' + cy.toFixed(2) + ')"><rect width="' + (w + 0.05) + '" height="' + (h + 0.05) + '" fill="' + bg + '"/>' +
        '<g transform="rotate(' + t[3] * 90 + ' ' + w / 2 + ' ' + h / 2 + ')">' + shape + '</g></g>';
    });
    return modShell('<clipPath id="mb"><rect x="4" y="4" width="52" height="82" rx="2"/></clipPath><g clip-path="url(#mb)">' + tiles + '</g>');
  }

  /* ---------------- noir: black & gold premium deck ---------------- */
  var NOIR = { red: '#e8262e', ivory: '#f1e9d6', gold: '#d9b45a', goldDim: 'rgba(217,180,90,.42)', font: "Georgia,'Times New Roman',serif" };
  function seeded(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
  }
  function sparkle(x, y, r, fill, op) {
    return '<path d="M0,-' + r + ' Q0,0 ' + r + ',0 Q0,0 0,' + r + ' Q0,0 -' + r + ',0 Q0,0 0,-' + r + ' Z" fill="' + (fill || NOIR.gold) + '"' + (op ? ' opacity="' + op + '"' : '') + ' transform="translate(' + x + ' ' + y + ')"/>';
  }
  function crescent(x, y, r, rot) {
    // a gold disc with a dark disc bitten out of it
    return '<g transform="translate(' + x + ' ' + y + ') rotate(' + (rot || 0) + ')"><circle r="' + r + '" fill="' + NOIR.gold + '"/><circle cx="' + (r * 0.45) + '" cy="' + (-r * 0.3) + '" r="' + (r * 0.9) + '" fill="#121116"/></g>';
  }
  function noirInk(s) { return s === 'H' || s === 'D' ? 'url(#nr)' : 'url(#nw)'; }
  function noirSolid(s) { return s === 'H' || s === 'D' ? NOIR.red : NOIR.ivory; }
  function noirShell(key, inner) {
    var rnd = seeded(key), dust = '';
    for (var i = 0; i < 16; i++) dust += '<circle cx="' + (5 + rnd() * 50).toFixed(1) + '" cy="' + (5 + rnd() * 80).toFixed(1) + '" r="' + (0.15 + rnd() * 0.3).toFixed(2) + '" fill="' + NOIR.gold + '" opacity="' + (0.25 + rnd() * 0.5).toFixed(2) + '"/>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 90" width="240" height="360"><defs>' +
      '<radialGradient id="nb" cx=".5" cy=".42" r=".78"><stop offset="0" stop-color="#1f1d24"/><stop offset="1" stop-color="#060607"/></radialGradient>' +
      '<radialGradient id="nr" cx=".38" cy=".32" r=".85"><stop offset="0" stop-color="#ff7a6e"/><stop offset=".5" stop-color="#e3202a"/><stop offset="1" stop-color="#8a0b12"/></radialGradient>' +
      '<radialGradient id="nw" cx=".38" cy=".32" r=".85"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#eee5d0"/><stop offset="1" stop-color="#a99d82"/></radialGradient>' +
      '<linearGradient id="ng" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8e6a8"/><stop offset=".45" stop-color="#cfa64c"/><stop offset=".7" stop-color="#8d6b22"/><stop offset="1" stop-color="#ecd28a"/></linearGradient>' +
      '</defs><rect x="0.3" y="0.3" width="59.4" height="89.4" rx="3.6" fill="url(#nb)" stroke="#000" stroke-width="0.6"/>' +
      '<rect x="2.4" y="2.4" width="55.2" height="85.2" rx="2.2" fill="none" stroke="url(#ng)" stroke-width="0.35" opacity="0.85"/>' + dust + inner + '</svg>';
  }
  function noirCorners(f) {
    var c = noirSolid(f.s);
    var t = '<g><text x="7.4" y="12" text-anchor="middle" style="font-family:' + NOIR.font + ';font-size:' + (f.r === '10' ? 8 : 9.6) + 'px" fill="' + c + '" letter-spacing="-0.5">' + f.r + '</text>' +
      '<path d="' + PIP[f.s] + '" fill="' + c + '" transform="translate(7.4 17.4) scale(.28)"/></g>';
    return t + '<g transform="rotate(180 30 45)">' + t + '</g>';
  }
  function noirNumber(f) {
    var n = +f.r;
    var geo = '<circle cx="30" cy="45" r="' + (n % 2 ? 15 : 18) + '" fill="none" stroke="' + NOIR.goldDim + '" stroke-width="0.3"/>' +
      '<line x1="30" y1="9" x2="30" y2="81" stroke="' + NOIR.goldDim + '" stroke-width="0.22"/>' +
      '<path d="M30 7.6 L31 9 L30 10.4 L29 9 Z M30 79.6 L31 81 L30 82.4 L29 81 Z" fill="' + NOIR.gold + '" opacity=".7"/>' +
      (n >= 6 ? '<ellipse cx="30" cy="45" rx="13" ry="27" fill="none" stroke="' + NOIR.goldDim + '" stroke-width="0.22" stroke-dasharray="0.6 1"/>' : '') +
      (n !== 3 && n !== 5 && n !== 9 ? sparkle(30, 45, 2.2) : '') + crescent(30, 12.5, 1.5, -30);
    var body = (LAYOUT[n] || []).map(function (q) {
      return '<path d="' + PIP[f.s] + '" fill="' + noirInk(f.s) + '" transform="translate(' + q[0] + ' ' + q[1] + ') scale(.5)' + (q[1] > 46 ? ' rotate(180)' : '') + '"/>';
    }).join('');
    return noirShell(f.r + f.s, geo + noirCorners(f) + body);
  }
  function noirAce(f) {
    var red = f.s === 'H' || f.s === 'D', line = red ? NOIR.red : NOIR.gold, sc = f.s === 'D' ? 1.55 : 1.45;
    var rays = '';
    for (var i = 0; i < 36; i++) { var a = i * Math.PI / 18; rays += '<line x1="30" y1="45" x2="' + (30 + Math.cos(a) * 20).toFixed(2) + '" y2="' + (45 + Math.sin(a) * 20).toFixed(2) + '"/>'; }
    var pipT = 'translate(30 45) scale(' + sc + ')';
    var inner = '<clipPath id="ac"><path d="' + PIP[f.s] + '" transform="' + pipT + '"/></clipPath>' +
      '<circle cx="30" cy="45" r="21" fill="none" stroke="' + NOIR.goldDim + '" stroke-width="0.35"/>' +
      '<circle cx="30" cy="45" r="23" fill="none" stroke="' + NOIR.goldDim + '" stroke-width="0.25" stroke-dasharray="0.5 1.1"/>' +
      (red ? '<path d="' + PIP[f.s] + '" fill="url(#nr)" opacity=".38" transform="' + pipT + '"/>' : '') +
      '<g clip-path="url(#ac)" stroke="' + line + '" stroke-width="0.22" opacity=".9">' + rays + '</g>' +
      '<path d="' + PIP[f.s] + '" fill="none" stroke="' + line + '" stroke-width="' + (0.7 / sc).toFixed(2) + '" transform="' + pipT + '"/>' +
      '<path d="' + PIP[f.s] + '" fill="none" stroke="' + NOIR.gold + '" stroke-width="' + (0.35 / 1.05).toFixed(2) + '" opacity=".75" transform="translate(30 45) scale(' + (sc * 0.72).toFixed(2) + ')"/>' +
      '<circle cx="30" cy="45" r="3.4" fill="#0c0b0f" stroke="' + NOIR.gold + '" stroke-width="0.35"/>' + sparkle(30, 45, 3.2, red ? '#ffd9a0' : NOIR.gold) +
      crescent(30, 19, 1.9, -30) + sparkle(18, 25, 1.2) + sparkle(43, 28, 0.9) + sparkle(16, 64, 0.9) + sparkle(44, 66, 1.2) +
      '<circle cx="30" cy="72.5" r="0.8" fill="' + NOIR.gold + '"/><line x1="30" y1="69" x2="30" y2="71.6" stroke="' + NOIR.gold + '" stroke-width="0.3"/>';
    return noirShell(f.r + f.s, noirCorners(f) + inner);
  }
  function noirCourt(f) {
    var red = f.s === 'H' || f.s === 'D', G = 'url(#ng)', g = NOIR.gold;
    var robe = red ? '#5c0b12' : '#17161c', accent = red ? NOIR.red : NOIR.ivory, skin = '#eadcbc';
    var halo = '<circle cx="30" cy="25" r="9.5" fill="none" stroke="' + NOIR.goldDim + '" stroke-width="0.35"/><circle cx="30" cy="25" r="11.2" fill="none" stroke="' + NOIR.goldDim + '" stroke-width="0.2" stroke-dasharray="0.5 0.9"/>';
    var body = '<path d="M19.5 45 C19.5 36 23.5 31.4 30 31.4 C36.5 31.4 40.5 36 40.5 45 Z" fill="' + robe + '" stroke="' + g + '" stroke-width="0.45"/>' +
      '<path d="M22.8 36 L37.2 44.6" stroke="' + accent + '" stroke-width="1.3" opacity=".85"/><path d="M22.8 36 L37.2 44.6" stroke="' + g + '" stroke-width="0.25"/>' +
      '<path d="M26.2 31.8 L30 37.4 L33.8 31.8" fill="none" stroke="' + G + '" stroke-width="0.9"/>' +
      '<path d="M21.3 39 Q24.5 36.8 25.8 33.2 M38.7 39 Q35.5 36.8 34.2 33.2" fill="none" stroke="' + g + '" stroke-width="0.3"/>' +
      '<circle cx="30" cy="40" r="0.7" fill="' + g + '"/><circle cx="30" cy="42.6" r="0.7" fill="' + g + '"/>';
    var head = '<path d="M24.8 25.6 C24.8 21.6 27.2 19.8 30 19.8 C32.8 19.8 35.2 21.6 35.2 25.6 C35.2 29 33 31.4 30 31.4 C27 31.4 24.8 29 24.8 25.6 Z" fill="' + skin + '" stroke="' + g + '" stroke-width="0.4"/>' +
      '<path d="M27 25 Q28 24.4 29 25 M31 25 Q32 24.4 33 25" fill="none" stroke="#2a1d10" stroke-width="0.45" stroke-linecap="round"/>' +
      '<path d="M30 25.4 L29.5 27.6 L30.4 27.7" fill="none" stroke="#9a7f55" stroke-width="0.3"/><path d="M28.8 29 Q30 29.6 31.2 29" fill="none" stroke="#8a2a22" stroke-width="0.4" stroke-linecap="round"/>';
    var top = '', extra = '';
    if (f.r === 'K') {
      top = '<path d="M24.4 22.2 L24.4 16.4 L27 19 L30 14.6 L33 19 L35.6 16.4 L35.6 22.2 Z" fill="' + G + '" stroke="#5c4310" stroke-width="0.3"/>' +
        '<circle cx="30" cy="19.6" r="0.9" fill="' + accent + '"/><circle cx="26.2" cy="20.6" r="0.5" fill="' + accent + '"/><circle cx="33.8" cy="20.6" r="0.5" fill="' + accent + '"/>';
      extra = '<path d="M25.4 27.4 C25.8 32.6 28 34 30 34.4 C32 34 34.2 32.6 34.6 27.4 C33.4 29.8 31.6 30.4 30 30.4 C28.4 30.4 26.6 29.8 25.4 27.4 Z" fill="#cdbb92" stroke="' + g + '" stroke-width="0.3"/>' +
        '<path d="M27.4 28.4 Q30 27.4 32.6 28.4" fill="none" stroke="#6b5636" stroke-width="0.5"/>' +
        '<path d="M40 33 L43.4 11.6" stroke="#d9d3c3" stroke-width="0.9" stroke-linecap="round"/><path d="M40.6 29.4 L41.3 25.1" stroke="#8d8676" stroke-width="0.3"/>' +
        '<path d="M38.2 31.6 L42.3 32.6" stroke="' + G + '" stroke-width="1"/><circle cx="39.9" cy="34.6" r="0.8" fill="' + g + '"/>';
    } else if (f.r === 'Q') {
      top = '<path d="M25.6 21.4 L26.6 18.4 L28.3 20 L30 17.2 L31.7 20 L33.4 18.4 L34.4 21.4 Z" fill="' + G + '" stroke="#5c4310" stroke-width="0.25"/>' +
        '<circle cx="30" cy="17.2" r="0.7" fill="' + accent + '"/><circle cx="26.6" cy="18.3" r="0.45" fill="' + g + '"/><circle cx="33.4" cy="18.3" r="0.45" fill="' + g + '"/>';
      extra = '<path d="M24.8 23.4 C23.4 28 23.8 32.8 21.6 35.6 C23.8 35.4 25.4 33.4 25.8 30.6 M35.2 23.4 C36.6 28 36.2 32.8 38.4 35.6 C36.2 35.4 34.6 33.4 34.2 30.6" fill="#2b2118" stroke="' + g + '" stroke-width="0.35"/>' +
        '<circle cx="24.9" cy="28.4" r="0.6" fill="' + g + '"/><circle cx="35.1" cy="28.4" r="0.6" fill="' + g + '"/>' +
        '<g transform="translate(41.2 15.6)">' + [0, 72, 144, 216, 288].map(function (r) { return '<ellipse cy="-1.3" rx="0.8" ry="1.4" fill="' + accent + '" transform="rotate(' + r + ')"/>'; }).join('') + '<circle r="0.7" fill="' + g + '"/></g>' +
        '<path d="M41.2 17.6 L39.6 31" stroke="' + g + '" stroke-width="0.45"/>';
    } else {
      top = '<path d="M24.6 22.4 C24.8 18.2 35.2 18.2 35.4 22.4 Z" fill="' + robe + '" stroke="' + G + '" stroke-width="0.6"/>' +
        '<path d="M34.2 19.6 C36.8 16 39.6 15.6 41 16 C38.6 17 36.6 18.6 35.4 21" fill="' + accent + '" stroke="' + g + '" stroke-width="0.25"/>';
      extra = '<path d="M25.2 24.4 C24.6 27 25 29.4 26 30.4 M34.8 24.4 C35.4 27 35 29.4 34 30.4" fill="none" stroke="#3a2c1c" stroke-width="1"/>' +
        '<path d="M40.2 33 L41.6 11.4" stroke="#8a6a3a" stroke-width="0.8" stroke-linecap="round"/><path d="M40.3 11.6 L41.7 8.6 L43 11.8 Z" fill="' + G + '"/>';
    }
    var half = '<g>' + halo + body + head + top + extra + '</g>';
    var frame = '<rect x="13" y="8.6" width="34" height="72.8" rx="1.6" fill="#0d0c10" stroke="' + G + '" stroke-width="0.55"/>' +
      '<rect x="14.1" y="9.7" width="31.8" height="70.6" rx="1.1" fill="none" stroke="' + NOIR.goldDim + '" stroke-width="0.2"/>';
    var mid = '<line x1="13" y1="45" x2="47" y2="45" stroke="' + G + '" stroke-width="0.35"/><path d="M30 43.4 L31.4 45 L30 46.6 L28.6 45 Z" fill="' + accent + '" stroke="' + g + '" stroke-width="0.2"/>';
    var clip = '<clipPath id="cf"><rect x="13" y="8.6" width="34" height="36.4"/></clipPath>';
    return noirShell(f.r + f.s, noirCorners(f) + '<defs>' + clip + '</defs>' + frame +
      '<g clip-path="url(#cf)">' + half + '</g><g transform="rotate(180 30 45)"><g clip-path="url(#cf)">' + half + '</g></g>' + mid);
  }
  function noirBack() {
    var G = 'url(#ng)', g = NOIR.gold, d = NOIR.goldDim, ticks = '';
    for (var i = 0; i < 32; i++) { var a = i * Math.PI / 16, r1 = i % 2 ? 9.6 : 8.6; ticks += '<line x1="' + (30 + Math.cos(a) * r1).toFixed(2) + '" y1="' + (45 + Math.sin(a) * r1).toFixed(2) + '" x2="' + (30 + Math.cos(a) * 10.4).toFixed(2) + '" y2="' + (45 + Math.sin(a) * 10.4).toFixed(2) + '"/>'; }
    var diamond = function (x, y, s) { return '<path d="M' + x + ' ' + (y - s) + ' L' + (x + s * 0.7) + ' ' + y + ' L' + x + ' ' + (y + s) + ' L' + (x - s * 0.7) + ' ' + y + ' Z" fill="' + NOIR.red + '" stroke="' + g + '" stroke-width="0.2"/>'; };
    var inner = '<rect x="4.6" y="4.6" width="50.8" height="80.8" rx="2" fill="none" stroke="' + G + '" stroke-width="0.6"/>' +
      '<rect x="6.2" y="6.2" width="47.6" height="77.6" rx="1.4" fill="none" stroke="' + d + '" stroke-width="0.25" stroke-dasharray="0.6 0.9"/>' +
      '<circle cx="30" cy="31" r="13.5" fill="none" stroke="' + d + '" stroke-width="0.35"/><circle cx="30" cy="59" r="13.5" fill="none" stroke="' + d + '" stroke-width="0.35"/>' +
      '<circle cx="30" cy="45" r="18.5" fill="none" stroke="' + d + '" stroke-width="0.25" stroke-dasharray="0.5 1"/>' +
      '<line x1="30" y1="6.2" x2="30" y2="83.8" stroke="' + d + '" stroke-width="0.25"/><line x1="6.2" y1="45" x2="53.8" y2="45" stroke="' + d + '" stroke-width="0.25"/>' +
      '<path d="M6.2 6.2 L22 30 M53.8 6.2 L38 30 M6.2 83.8 L22 60 M53.8 83.8 L38 60" stroke="' + d + '" stroke-width="0.2"/>' +
      '<circle cx="30" cy="45" r="10.4" fill="#0c0b0f" stroke="' + G + '" stroke-width="0.4"/><g stroke="' + g + '" stroke-width="0.2">' + ticks + '</g>' +
      '<g transform="rotate(45 30 45)">' + sparkle(30, 45, 6.2, G).replace('fill="url(#ng)"', 'fill="url(#ng)" opacity=".55"') + '</g>' + sparkle(30, 45, 9, G) +
      '<circle cx="30" cy="45" r="1.1" fill="' + NOIR.red + '"/>' +
      crescent(15.4, 45, 2.2, 90) + crescent(44.6, 45, 2.2, -90) + crescent(30, 14.5, 1.6, 0) + crescent(30, 75.5, 1.6, 180) +
      diamond(10.2, 10.6, 1.7) + diamond(49.8, 10.6, 1.7) + diamond(10.2, 79.4, 1.7) + diamond(49.8, 79.4, 1.7) + diamond(30, 21.5, 1.2) + diamond(30, 68.5, 1.2) +
      sparkle(17, 21, 1.1) + sparkle(43, 21, 1.1) + sparkle(17, 69, 1.1) + sparkle(43, 69, 1.1);
    return noirShell('back', inner);
  }

  function face(f, theme) {
    if (theme === 'modern') return f.r === 'A' ? modAce(f) : (f.r === 'J' || f.r === 'Q' || f.r === 'K') ? modCourt(f) : modNumber(f);
    if (theme === 'noir') return f.r === 'A' ? noirAce(f) : (f.r === 'J' || f.r === 'Q' || f.r === 'K') ? noirCourt(f) : noirNumber(f);
    var st = STYLE[theme] || STYLE.indian;
    if (f.r === 'A') return aceFace(f, st);
    if (f.r === 'J' || f.r === 'Q' || f.r === 'K') return courtFace(f, st);
    return numberFace(f, st);
  }

  function back(theme) {
    if (theme === 'modern') return modBack();
    if (theme === 'noir') return noirBack();
    if (theme === 'pro') {
      var lines = '';
      for (var i = -90; i < 90; i += 5) lines += '<path d="M' + i + ' 0 L' + (i + 90) + ' 90 M' + (i + 90) + ' 0 L' + i + ' 90"/>';
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 90" width="240" height="360"><defs><clipPath id="bc"><rect x="4" y="4" width="52" height="82" rx="2.5"/></clipPath></defs>' +
        '<rect x="0.3" y="0.3" width="59.4" height="89.4" rx="5" fill="#fff" stroke="#222" stroke-width="0.6"/>' +
        '<rect x="4" y="4" width="52" height="82" rx="2.5" fill="#a3121c"/>' +
        '<g clip-path="url(#bc)" stroke="rgba(255,255,255,.55)" stroke-width="0.55">' + lines + '</g>' +
        '<rect x="4" y="4" width="52" height="82" rx="2.5" fill="none" stroke="#fff" stroke-width="0.8"/>' +
        '<circle cx="30" cy="45" r="9" fill="#a3121c" stroke="#fff" stroke-width="0.9"/><path d="' + PIP.S + '" fill="#fff" transform="translate(30 45) scale(.55)"/></svg>';
    }
    // Indian: maroon with a gold mandala and paisley corners
    var petals = '', outer = '';
    for (var k = 0; k < 16; k++) petals += '<ellipse cx="30" cy="35" rx="2.6" ry="6.2" transform="rotate(' + (k * 22.5) + ' 30 45)" fill="#e0b13a" opacity="0.92"/>';
    for (var j = 0; j < 24; j++) outer += '<circle cx="30" cy="27.5" r="0.9" transform="rotate(' + (j * 15) + ' 30 45)" fill="#f6d77a"/>';
    var paisley = function (x, y, r) {
      return '<g transform="translate(' + x + ' ' + y + ') rotate(' + r + ')"><path d="M0 -5 C4 -5 5 0 2.5 3 C1 4.6 -2 5 -3 3 C-4 1 -2.5 -0.5 -0.5 0 C1.5 0.5 1.5 -3 0 -5 Z" fill="#e0b13a"/><circle cx="-0.8" cy="1.6" r="0.8" fill="#7a0f1f"/></g>';
    };
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 90" width="240" height="360">' +
      '<defs><radialGradient id="mg" cx=".5" cy=".5" r=".7"><stop offset="0" stop-color="#a3172b"/><stop offset="1" stop-color="#5e0a17"/></radialGradient></defs>' +
      '<rect x="0.3" y="0.3" width="59.4" height="89.4" rx="5" fill="#fff6e0" stroke="#222" stroke-width="0.6"/>' +
      '<rect x="3.5" y="3.5" width="53" height="83" rx="3" fill="url(#mg)" stroke="#e0b13a" stroke-width="1"/>' +
      '<rect x="6" y="6" width="48" height="78" rx="2" fill="none" stroke="#e0b13a" stroke-width="0.4" stroke-dasharray="1.2 1"/>' +
      '<circle cx="30" cy="45" r="17.5" fill="none" stroke="#e0b13a" stroke-width="0.6"/>' + outer + petals +
      '<circle cx="30" cy="45" r="6.5" fill="#7a0f1f" stroke="#e0b13a" stroke-width="0.8"/><circle cx="30" cy="45" r="3" fill="#e0b13a"/><circle cx="30" cy="45" r="1.2" fill="#7a0f1f"/>' +
      paisley(12, 13, 30) + paisley(48, 13, -30 + 180) + paisley(12, 77, -30) + paisley(48, 77, 210) + '</svg>';
  }

  function name(f) { return (RANK_NAME[f.r] || f.r) + ' of ' + NAMES[f.s]; }
  function short(f) { return f.r + ({ S: '♠', H: '♥', D: '♦', C: '♣' })[f.s]; }

  window.UNOPattiArt = { face: face, back: back, name: name, short: short, PIP: PIP, NAMES: NAMES, HINDI: HINDI, RANK_HINDI: RANK_HINDI };
})();
