// Copies browser libraries out of node_modules so the site works fully offline.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'public', 'vendor');
fs.mkdirSync(out, { recursive: true });
const files = [['gsap/dist/gsap.min.js', 'gsap.min.js']];
for (const [src, dest] of files) {
  try {
    fs.copyFileSync(path.join(root, 'node_modules', src), path.join(out, dest));
    console.log('copied', dest);
  } catch (e) {
    console.warn('could not copy', src, e.message);
  }
}
