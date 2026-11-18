'use strict';
/* Egy-fájlos csomag készítése itch.io-hoz:
   az index.html-be beágyazza a js/sim.js és js/main.js tartalmát.
   Futtatás: node scripts/bundle.js  →  dist/barhol-barmikor-barkivel.html */
const fs = require('fs');
const path = require('path');

const gyoker = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(gyoker, 'index.html'), 'utf8');
const sim = fs.readFileSync(path.join(gyoker, 'js', 'sim.js'), 'utf8');
const main = fs.readFileSync(path.join(gyoker, 'js', 'main.js'), 'utf8');

let kimenet = index
  .replace('<script src="js/sim.js"></script>', '<script>\n' + sim + '\n</script>')
  .replace('<script src="js/main.js"></script>', '<script>\n' + main + '\n</script>');

if (kimenet.includes('src="js/')) {
  console.error('HIBA: maradt külső hivatkozás!');
  process.exit(1);
}

fs.mkdirSync(path.join(gyoker, 'dist'), { recursive: true });
const cel = path.join(gyoker, 'dist', 'barhol-barmikor-barkivel.html');
fs.writeFileSync(cel, kimenet);
console.log('Kész: ' + cel + ' (' + Math.round(kimenet.length / 1024) + ' KB)');
