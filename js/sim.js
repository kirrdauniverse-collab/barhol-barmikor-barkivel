'use strict';
/* ============================================================
   Bárhol Bármikor Bárkivel — szimulációs mag (vertikális szelet 0.1)
   Tiszta logika: nincs DOM/canvas hivatkozás.
   Böngészőben <script src>, Node-ban require() futtatja.
   ============================================================ */

const VERZIO = '0.1.0';

/* ---------- idő ---------- */
const NAP_ORAK = 24;
const EST = 21;   // ekkortól éjszaka
const HAJNAL = 6; // ekkor virrad

function ejVan(ora) { return ora >= EST || ora < HAJNAL; }

/* ---------- segédek ---------- */
function mulberry32(mag) {
  let a = mag >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
function kemiaKulcs(a, b) { return a.id < b.id ? a.id + ':' + b.id : b.id + ':' + a.id; }
function tavolsag(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
function kever(arr, rng) { const c = arr.slice(); for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; }

/* ---------- adattárak ---------- */
const TRAITOK = ['Monogám', 'Szabad szellem', 'Romantikus', 'Munkamániás'];
const ERDEKESSEGEK = ['zene', 'tánc', 'kertészkedés', 'történetek', 'csillagok', 'kézművesség'];
const FERFI_NEVEK = ['Bence', 'Márk', 'Áron', 'Dávid', 'Zsombor', 'Kristóf', 'Bálint', 'Máté', 'Milán', 'Noel', 'Vince', 'Domonkos', 'Imre', 'Olivér'];
const NOI_NEVEK = ['Cili', 'Dóra', 'Flóra', 'Hanna', 'Jázmin', 'Lili', 'Réka', 'Sára', 'Zoé', 'Boróka', 'Emese', 'Villő', 'Panna', 'Napsugár'];

const EPULETEK = {
  lakohaz: { nev: 'Lakóház', ikon: '🏠', szel: 2, mag: 2, koltseg: 100, max: 12, leiras: 'Alvás és privát éjszakák. 3 lakó fér el benne.' },
  kut:     { nev: 'Kút', ikon: '🪣', szel: 1, mag: 1, koltseg: 60,  max: 3,  leiras: 'Gyors, egyszerű higiénia a falu szívében.' },
  tanchaz: { nev: 'Táncház', ikon: '💃', szel: 3, mag: 2, koltseg: 180, max: 2, leiras: 'Kapcsolódás és kémia építése tánc közben.' },
  furdo:   { nev: 'Fürdő', ikon: '🛁', szel: 3, mag: 2, koltseg: 240, max: 2, leiras: 'Prémium higiénia, eufória, esti találkozók.' },
};

const TECHNOLOGIAK = {
  tuzfeny:      { nev: 'Tűzfény lámpások', koltseg: 150, leiras: 'Az éjszakai találkozások 10%-kal több Inspirációt adnak.' },
  agyagkemence: { nev: 'Agyagkemence', koltseg: 250, leiras: 'A fürdő hatékonyabb, és a higiénia lassabban csökken.' },
  nepszokasok:  { nev: 'Népszokások', koltseg: 300, leiras: 'Fesztivál rendezhető: faluszerte eufória, kevesebb feszültség.' },
};

const TARTALMI_FOKOK = ['romantikus', 'csipos', 'meglepetesmentes'];

/* ---------- azonosítók ---------- */
let kovetkezoAzon = 1;
function ujAzon() { return kovetkezoAzon++; }

/* ---------- lakó ---------- */
function letrehozLako(vilag, nev, no, opts = {}) {
  const rng = vilag.rng;
  const lako = {
    id: ujAzon(), nev, no,
    eletkor: opts.gyerek ? 'gyerek' : 'felnott',
    gyerekNap: opts.gyerek ? 0 : null,
    pos: { x: opts.x != null ? opts.x : 20 + rng() * 8, y: opts.y != null ? opts.y : 14 + rng() * 8 },
    hazId: opts.hazId || null,
    allapot: 'ures',      // ures | ut | tevekenyseg | alvas | intimitas | varakozas
    tevekenyseg: null,
    cel: null,
    dondHutes: 0,
    igenyek: {
      eletero: 55 + rng() * 30,
      higienia: 50 + rng() * 35,
      kapcsolodas: 40 + rng() * 35,
      intimitas: 35 + rng() * 35,
    },
    trait: opts.trait || TRAITOK[Math.floor(rng() * TRAITOK.length)],
    erdekessegek: opts.erdekessegek || kever(ERDEKESSEGEK, rng).slice(0, 2),
    partnerId: opts.partnerId || null,
    exPartnerek: [],
    veszekedesek: [],
    flirtHutes: 0,
    flirtCelId: null,
    randival: null,
    randiHatarido: null,
    euforiaOra: 0,
    terhes: null,
  };
  if (lako.eletkor === 'gyerek') lako.igenyek.intimitas = 100;
  return lako;
}

/* ---------- világ ---------- */
function letrehozVilag(mag, beallitasok = {}) {
  const vilag = {
    verzio: VERZIO, mag,
    rng: mulberry32(mag),
    nap: 1, ora: 8.0, osszOra: 8.0,
    inspiracio: 120, feszultseg: 10,
    lakok: [], epuletek: [], dekoracio: [],
    to: { x: 4, y: 24, szel: 4, mag: 3 },
    kemia: {},
    kemiaTelitett: {},
    erosEsemenyekMa: [],
    chronika: [],
    techek: {},
    beallitasok: Object.assign({ tartalom: 'romantikus', nemzedek: true }, beallitasok),
    sztrajkNap: 0,
    kimenet: [],
  };
  return vilag;
}

/* ---------- keresők ---------- */
function epuletIdSzerint(vilag, id) { return id == null ? null : vilag.epuletek.find(e => e.id === id) || null; }
function lakoIdSzerint(vilag, id) { return id == null ? null : vilag.lakok.find(l => l.id === id) || null; }
function hazKozep(e) { return { x: e.x + e.szel / 2, y: e.y + e.mag / 2 }; }
function hazLakoi(vilag, hazId) { return vilag.lakok.filter(l => l.hazId === hazId); }

/* ---------- kémia ---------- */
function kemiaLekeres(vilag, a, b) { return vilag.kemia[kemiaKulcs(a, b)] || 0; }
function kemiaHozzaad(vilag, a, b, delta) {
  const k = kemiaKulcs(a, b);
  vilag.kemia[k] = clamp((vilag.kemia[k] || 0) + delta, 0, 100);
  return vilag.kemia[k];
}

/* ---------- krónika ---------- */
function fuzChronika(vilag, tipus, szoveg) {
  vilag.chronika.push({ nap: vilag.nap, ora: Math.floor(vilag.ora), tipus, szoveg });
  if (vilag.chronika.length > 200) vilag.chronika.splice(0, vilag.chronika.length - 200);
}

/* ---------- kompatibilitás ---------- */
function kompatibilitas(vilag, a, b) {
  if (a.eletkor !== 'felnott' || b.eletkor !== 'felnott') return -100;
  let s = 0;
  const atfedes = a.erdekessegek.filter(x => b.erdekessegek.indexOf(x) !== -1).length;
  s += atfedes * 25;
  if (a.trait === 'Romantikus' && b.trait === 'Romantikus') s += 15;
  if (a.trait === 'Szabad szellem' && b.trait === 'Szabad szellem') s += 10;
  if (a.trait === 'Monogám' && b.trait === 'Monogám') s += 10;
  if ((a.trait === 'Monogám' && b.trait === 'Szabad szellem') || (a.trait === 'Szabad szellem' && b.trait === 'Monogám')) s -= 15;
  if ((a.trait === 'Munkamániás' && b.trait === 'Szabad szellem') || (a.trait === 'Szabad szellem' && b.trait === 'Munkamániás')) s -= 10;
  if ((a.trait === 'Munkamániás' && b.trait === 'Romantikus') || (a.trait === 'Romantikus' && b.trait === 'Munkamániás')) s -= 5;
  if (a.veszekedesek.indexOf(b.id) !== -1 || b.veszekedesek.indexOf(a.id) !== -1) s -= 45;
  if (a.trait === 'Monogám' && a.partnerId && a.partnerId !== b.id) s -= 100;
  if (b.trait === 'Monogám' && b.partnerId && b.partnerId !== a.id) s -= 100;
  return s;
}

function flirtezheto(vilag, a, b) {
  if (!a || !b || a === b) return false;
  if (a.eletkor !== 'felnott' || b.eletkor !== 'felnott') return false;
  if (a.flirtHutes > 0 || b.flirtHutes > 0) return false;
  if (a.randival != null || b.randival != null) return false;
  if (a.veszekedesek.indexOf(b.id) !== -1 || b.veszekedesek.indexOf(a.id) !== -1) return false;
  if (kompatibilitas(vilag, a, b) < -30) return false;
  if (a.trait === 'Monogám' && a.partnerId && a.partnerId !== b.id) return false;
  if (b.trait === 'Monogám' && b.partnerId && b.partnerId !== a.id) return false;
  return true;
}

/* ---------- építés ---------- */
function elhelyezheto(vilag, tipus, x, y) {
  const t = EPULETEK[tipus];
  if (x < 1 || y < 1 || x + t.szel > 47 || y + t.mag > 33) return false;
  const uj = { x, y, szel: t.szel, mag: t.mag };
  const utkozik = (a, b) => a.x < b.x + b.szel && a.x + a.szel > b.x && a.y < b.y + b.mag && a.y + a.mag > b.y;
  if (utkozik(uj, vilag.to)) return false;
  for (const e of vilag.epuletek) if (utkozik(uj, e)) return false;
  return true;
}

function epuletEpites(vilag, tipus, x, y) {
  const t = EPULETEK[tipus];
  if (!t) return { ok: false, hiba: 'Ismeretlen épülettípus.' };
  const db = vilag.epuletek.filter(e => e.tipus === tipus).length;
  if (db >= t.max) return { ok: false, hiba: 'Nem építhető több ' + t.nev + '.' };
  if (vilag.inspiracio < t.koltseg) return { ok: false, hiba: 'Nincs elég ✨ Inspiráció.' };
  if (!elhelyezheto(vilag, tipus, x, y)) return { ok: false, hiba: 'Ide nem építhető.' };
  vilag.inspiracio -= t.koltseg;
  const epulet = { id: ujAzon(), tipus, x, y, szel: t.szel, mag: t.mag, epitve: false, epitHatralevo: 3 };
  vilag.epuletek.push(epulet);
  fuzChronika(vilag, 'epites', 'Új ' + t.nev + ' épül a faluban.');
  vilag.kimenet.push({ tipus: 'toast', ikon: t.ikon, szoveg: t.nev + ' építés alatt…' });
  return { ok: true, epulet };
}

function epuletKesz(vilag, e) {
  e.epitve = true;
  const t = EPULETEK[e.tipus];
  fuzChronika(vilag, 'epites', t.nev + ' elkészült!');
  vilag.kimenet.push({ tipus: 'toast', ikon: t.ikon, szoveg: t.nev + ' elkészült!' });
  if (e.tipus === 'lakohaz') {
    let hely = 3 - hazLakoi(vilag, e.id).length;
    for (const l of vilag.lakok) {
      if (hely <= 0) break;
      if (l.hazId == null) { l.hazId = e.id; hely--; }
    }
  }
}

/* ---------- technológia ---------- */
function techVasarlas(vilag, kulcs) {
  const t = TECHNOLOGIAK[kulcs];
  if (!t) return { ok: false, hiba: 'Ismeretlen technológia.' };
  if (vilag.techek[kulcs]) return { ok: false, hiba: 'Már kifejlesztve.' };
  if (vilag.inspiracio < t.koltseg) return { ok: false, hiba: 'Nincs elég ✨ Inspiráció.' };
  vilag.inspiracio -= t.koltseg;
  vilag.techek[kulcs] = true;
  fuzChronika(vilag, 'tech', t.nev + ' kifejlesztve! ' + t.leiras);
  vilag.kimenet.push({ tipus: 'toast', ikon: '🔬', szoveg: t.nev + ' kifejlesztve!' });
  return { ok: true };
}

/* ---------- fesztivál ---------- */
function fesztival(vilag) {
  for (const l of vilag.lakok) {
    l.igenyek.kapcsolodas = clamp(l.igenyek.kapcsolodas + 30, 0, 100);
    l.euforiaOra = Math.max(l.euforiaOra, 10);
  }
  vilag.feszultseg = clamp(vilag.feszultseg - 12, 0, 100);
  vilag.inspiracio += 20;
  fuzChronika(vilag, 'esemeny', 'Fesztivál a falu szívében — tánc, ének, eufória!');
  vilag.kimenet.push({ tipus: 'toast', ikon: '🎪', szoveg: 'Fesztivál! Eufória járja a falut.' });
}

/* ---------- magán helyszín ---------- */
function privatHely(vilag, a, b) {
  const sajat = epuletIdSzerint(vilag, a.hazId);
  if (sajat) return hazKozep(sajat);
  const mas = epuletIdSzerint(vilag, b.hazId);
  if (mas) return hazKozep(mas);
  const furdo = vilag.epuletek.find(e => e.tipus === 'furdo' && e.epitve);
  if (furdo) return hazKozep(furdo);
  return null;
}

/* ---------- randi és intimitás ---------- */
/* A sikeres udvarlás csak párt köt: az együttlétre este/éjjel dönt a Utility AI. */
function randiInditas(vilag, a, b) {
  if (a.randival != null || b.randival != null) return;
  a.randival = b.id; b.randival = a.id;
  a.flirtCelId = null; b.flirtCelId = null;
  a.randiHatarido = vilag.osszOra + 36;
  b.randiHatarido = vilag.osszOra + 36;
}

function intimitasInditasa(vilag, a, b) {
  const idotartam = 2;
  for (const l of [a, b]) {
    l.allapot = 'intimitas';
    l.tevekenyseg = { tipus: 'intimitas', idotartam, maszik: (l === a ? b.id : a.id) };
    l.cel = null;
  }
  vilag.erosEsemenyekMa.push({ ki: a.id, kivel: b.id });
  const t = vilag.beallitasok.tartalom;
  let szoveg = a.nev + ' és ' + b.nev + ' együtt tölti az éjszakát…';
  if (t === 'csipos') szoveg = a.nev + ' és ' + b.nev + ' nem sokat alszik ma éjjel…';
  if (t === 'meglepetesmentes') szoveg = a.nev + ' és ' + b.nev + ' szépen álmodnak együtt…';
  vilag.kimenet.push({ tipus: 'intimitas', szoveg, poz: { x: a.pos.x, y: a.pos.y } });
}

function intimitasVege(vilag, l) {
  const o = lakoIdSzerint(vilag, l.tevekenyseg ? l.tevekenyseg.maszik : null);
  l.allapot = 'ures'; l.tevekenyseg = null; l.randival = null; l.randiHatarido = null;
  if (!o) return;
  o.allapot = 'ures'; o.tevekenyseg = null; o.randival = null; o.randiHatarido = null;
  for (const x of [l, o]) {
    x.igenyek.intimitas = 100;
    x.igenyek.kapcsolodas = clamp(x.igenyek.kapcsolodas + 40, 0, 100);
    x.igenyek.eletero = clamp(x.igenyek.eletero - 8, 0, 100);
    x.euforiaOra = Math.max(x.euforiaOra, 12);
  }
  kemiaHozzaad(vilag, l, o, 8);
  const kulcs = kemiaKulcs(l, o);
  vilag.kemiaTelitett[kulcs] = (vilag.kemiaTelitett[kulcs] || 0) + 1;
  const telitFaktor = Math.max(0.3, Math.pow(0.7, vilag.kemiaTelitett[kulcs] - 1));
  const kem = kemiaLekeres(vilag, l, o);
  let szorzo = 1;
  if (vilag.beallitasok.tartalom === 'csipos') szorzo *= 1.1;
  if (vilag.techek.tuzfeny) szorzo *= 1.1;
  if (vilag.sztrajkNap > 0) szorzo *= 0.5;
  const nyeres = Math.round(50 * (0.6 + 0.8 * kem / 100) * telitFaktor * szorzo);
  vilag.inspiracio += nyeres;
  fuzChronika(vilag, 'szerelem', l.nev + ' és ' + o.nev + ' együtt töltötte az éjszakát (+' + nyeres + ' ✨)');
  vilag.kimenet.push({ tipus: 'toast', ikon: '❤️', szoveg: l.nev + ' és ' + o.nev + ' együtt töltötte az éjszakát (+' + nyeres + ' ✨)' });
  vilag.kimenet.push({ tipus: 'fenyess', poz: { x: l.pos.x, y: l.pos.y }, szoveg: '+' + nyeres + ' ✨' });

  // párkapcsolat kialakulása
  if (l.partnerId == null && o.partnerId == null && l.exPartnerek.indexOf(o.id) === -1 && o.exPartnerek.indexOf(l.id) === -1) {
    const parEsely = { 'Monogám': 0.55, 'Romantikus': 0.35, 'Szabad szellem': 0.05, 'Munkamániás': 0.25 };
    const esely = Math.min(parEsely[l.trait], parEsely[o.trait]) * (0.5 + kem / 100);
    if (vilag.rng() < esely) {
      l.partnerId = o.id; o.partnerId = l.id;
      fuzChronika(vilag, 'szerelem', l.nev + ' és ' + o.nev + ' pár lettek! A falu ünnepli őket.');
      vilag.kimenet.push({ tipus: 'toast', ikon: '💕', szoveg: l.nev + ' és ' + o.nev + ' pár lettek!' });
    }
  }

  feltekenysegVizsgalat(vilag, l, o);
  const apa = l.no ? o : l;
  if (vilag.beallitasok.nemzedek && l.no !== o.no && l.terhes == null && o.terhes == null && kem >= 45 && vilag.rng() < 0.3) {
    megtermekenyites(vilag, apa.no ? l : o, apa.id);
  }
}

function feltekenysegVizsgalat(vilag, a, b) {
  if (vilag.beallitasok.tartalom === 'meglepetesmentes') return;
  for (const x of [a, b]) {
    const masik = (x === a ? b : a);
    if (x.partnerId == null || x.partnerId === masik.id) continue;
    const p = lakoIdSzerint(vilag, x.partnerId);
    if (!p || p.trait !== 'Monogám') continue;
    vilag.feszultseg = clamp(vilag.feszultseg + (vilag.beallitasok.tartalom === 'csipos' ? 14 : 12), 0, 100);
    p.igenyek.kapcsolodas = clamp(p.igenyek.kapcsolodas - 15, 0, 100);
    if (p.veszekedesek.indexOf(masik.id) === -1) p.veszekedesek.push(masik.id);
    fuzChronika(vilag, 'drama', p.nev + ' féltékeny lett: ' + x.nev + ' és ' + masik.nev + ' együtt voltak.');
    vilag.kimenet.push({ tipus: 'toast', ikon: '💔', szoveg: p.nev + ' féltékeny lett!' });
    if (vilag.rng() < 0.35) {
      x.exPartnerek.push(x.partnerId);
      p.exPartnerek.push(x.id);
      x.partnerId = null; p.partnerId = null;
      fuzChronika(vilag, 'drama', x.nev + ' és ' + p.nev + ' kapcsolata véget ért a botrány után.');
      vilag.kimenet.push({ tipus: 'toast', ikon: '💔', szoveg: x.nev + ' és ' + p.nev + ' szakított!' });
    }
  }
}

function megtermekenyites(vilag, anya, apaId) {
  if (!vilag.beallitasok.nemzedek) return;
  anya.terhes = { hatralevoNap: 3, apaId: apaId != null ? apaId : anya.randival };
}

function szuletes(vilag, anya) {
  if (vilag.lakok.length >= 30) { anya.terhes = null; return; }
  const apa = lakoIdSzerint(vilag, anya.terhes.apaId);
  const no = vilag.rng() < 0.5;
  const nevTarolo = no ? NOI_NEVEK : FERFI_NEVEK;
  const foglalt = vilag.lakok.map(l => l.nev);
  const szabad = nevTarolo.filter(n => foglalt.indexOf(n) === -1);
  const nev = szabad.length ? szabad[Math.floor(vilag.rng() * szabad.length)] : 'Kis-' + anya.nev;
  const orokolt = anya.erdekessegek[Math.floor(vilag.rng() * anya.erdekessegek.length)];
  const gyerek = letrehozLako(vilag, nev, no, {
    gyerek: true, x: anya.pos.x, y: anya.pos.y, hazId: anya.hazId,
    erdekessegek: [orokolt, ERDEKESSEGEK[Math.floor(vilag.rng() * ERDEKESSEGEK.length)]],
  });
  vilag.lakok.push(gyerek);
  anya.terhes = null;
  const apaNev = apa ? apa.nev : 'ismeretlen';
  fuzChronika(vilag, 'szuletes', 'Megszületett ' + nev + ' — ' + anya.nev + ' és ' + apaNev + ' gyereke!');
  vilag.kimenet.push({ tipus: 'toast', ikon: '👶', szoveg: 'Megszületett ' + nev + '!' });
}

/* ---------- tevékenységek ---------- */
function tevekenysegLepes(vilag, l, dt) {
  const tv = l.tevekenyseg;
  if (!tv) { l.allapot = 'ures'; return; }
  switch (tv.tipus) {
    case 'kut':
      l.igenyek.higienia = clamp(l.igenyek.higienia + 38 * dt, 0, 100);
      break;
    case 'furdo':
      l.igenyek.higienia = clamp(l.igenyek.higienia + 55 * dt, 0, 100);
      l.igenyek.kapcsolodas = clamp(l.igenyek.kapcsolodas + 12 * dt, 0, 100);
      break;
    case 'tanc':
      l.igenyek.kapcsolodas = clamp(l.igenyek.kapcsolodas + 30 * dt, 0, 100);
      for (const o of vilag.lakok) {
        if (o !== l && o.allapot === 'tevekenyseg' && o.tevekenyseg && o.tevekenyseg.tipus === 'tanc') {
          kemiaHozzaad(vilag, l, o, 3 * dt);
        }
      }
      break;
    case 'beszelgetes': {
      l.igenyek.kapcsolodas = clamp(l.igenyek.kapcsolodas + 32 * dt, 0, 100);
      const o = lakoIdSzerint(vilag, tv.maszik);
      if (o && o.allapot === 'tevekenyseg' && o.tevekenyseg && o.tevekenyseg.tipus === 'beszelgetes') {
        kemiaHozzaad(vilag, l, o, 1.5 * dt);
      }
      break;
    }
    case 'munka': {
      const e = epuletIdSzerint(vilag, tv.epuletId);
      if (e && !e.epitve) {
        e.epitHatralevo -= dt * 1.3;
        if (e.epitHatralevo <= 0) epuletKesz(vilag, e);
      }
      break;
    }
    case 'udvarlas':
      l.igenyek.kapcsolodas = clamp(l.igenyek.kapcsolodas + 22 * dt, 0, 100);
      break;
    case 'intimitas':
      l.igenyek.intimitas = clamp(l.igenyek.intimitas + 50 * dt, 0, 100);
      break;
  }
  tv.idotartam -= dt;
  if (tv.idotartam <= 0) tevekenysegVege(vilag, l);
}

function tevekenysegVege(vilag, l) {
  const tv = l.tevekenyseg;
  l.tevekenyseg = null;
  l.allapot = 'ures';
  if (!tv) return;
  switch (tv.tipus) {
    case 'furdo':
      vilag.feszultseg = clamp(vilag.feszultseg - 1, 0, 100);
      if (vilag.rng() < 0.5) l.euforiaOra = Math.max(l.euforiaOra, 3);
      break;
    case 'udvarlas': {
      const o = lakoIdSzerint(vilag, tv.maszik);
      if (!o) break;
      if (o.randival != null || l.randival != null) break;
      if (l.id > o.id && (o.tevekenyseg && o.tevekenyseg.tipus === 'udvarlas')) break; // egyetlen dobás pár szintén
      const esely = clamp(0.35 + kompatibilitas(vilag, l, o) / 240 + kemiaLekeres(vilag, l, o) / 160 + (l.euforiaOra > 0 ? 0.08 : 0), 0.12, 0.95);
      if (vilag.rng() < esely) {
        randiInditas(vilag, l, o);
      } else {
        l.flirtHutes = 5; o.flirtHutes = 5;
        kemiaHozzaad(vilag, l, o, -2);
        vilag.feszultseg = clamp(vilag.feszultseg + 1.5, 0, 100);
      }
      break;
    }
  }
}

/* ---------- döntés (Utility AI) ---------- */
function pontoz(l, urg, minoseg, poz) {
  const d = tavolsag(l.pos, poz);
  return urg * minoseg * (1 / (1 + d / 18));
}

/* útnak indítás: megcélpozíció + érkezéskor lefutó kezdés */
function inditCel(l, poz, kezdes) {
  l.cel = { poz: { x: poz.x, y: poz.y }, kezdes };
  l.allapot = 'ut';
}

function dond(vilag, l) {
  const gy = l.eletkor === 'gyerek';
  const ej = ejVan(vilag.ora);
  const lehetseges = [];

  const haz = epuletIdSzerint(vilag, l.hazId);
  if (haz && (l.igenyek.eletero < 45 || (ej && l.igenyek.eletero < 75))) {
    const p = hazKozep(haz);
    lehetseges.push({ pont: pontoz(l, (100 - l.igenyek.eletero) / 100 * (ej ? 3.2 : 1.4), 2.2, p), poz: p, kezdes(v) { inditCel(l, p, () => { l.allapot = 'alvas'; l.tevekenyseg = null; }); } });
  }

  const kutok = vilag.epuletek.filter(e => e.tipus === 'kut' && e.epitve);
  for (const k of kutok) {
    const p = hazKozep(k);
    lehetseges.push({ pont: pontoz(l, (100 - l.igenyek.higienia) / 100 * 2.0 * (gy ? 0.8 : 1), 1.0, p), poz: p, kezdes(v) { inditCel(l, p, () => { l.allapot = 'tevekenyseg'; l.tevekenyseg = { tipus: 'kut', idotartam: 1 }; }); } });
  }

  const furdok = vilag.epuletek.filter(e => e.tipus === 'furdo' && e.epitve);
  for (const f of furdok) {
    const p = hazKozep(f);
    const urg = (100 - l.igenyek.higienia) / 100 * 2.4 + (vilag.feszultseg > 50 ? 0.4 : 0);
    lehetseges.push({ pont: pontoz(l, urg, 1.3, p), poz: p, kezdes(v) { inditCel(l, p, () => { l.allapot = 'tevekenyseg'; l.tevekenyseg = { tipus: 'furdo', idotartam: 1.5 }; }); } });
  }

  const tanchazak = vilag.epuletek.filter(e => e.tipus === 'tanchaz' && e.epitve);
  for (const t of tanchazak) {
    if (ej && !gy) continue;
    const p = hazKozep(t);
    lehetseges.push({ pont: pontoz(l, (100 - l.igenyek.kapcsolodas) / 100 * 2.3, 1.4, p), poz: p, kezdes(v) { inditCel(l, p, () => { l.allapot = 'tevekenyseg'; l.tevekenyseg = { tipus: 'tanc', idotartam: 2 }; }); } });
  }

  const szabadEpites = !gy ? vilag.epuletek.find(e => !e.epitve) : null;
  if (szabadEpites) {
    const p = hazKozep(szabadEpites);
    const urg = (l.trait === 'Munkamániás' ? 2.0 : 0.5) * (vilag.sztrajkNap > 0 ? 0.5 : 1);
    lehetseges.push({ pont: pontoz(l, urg, 1.2, p), poz: p, kezdes(v) { const eid = szabadEpites.id; inditCel(l, p, () => { l.allapot = 'tevekenyseg'; l.tevekenyseg = { tipus: 'munka', idotartam: 2, epuletId: eid }; }); } });
  }

  if (!gy && (!ej || vilag.ora >= 18) && l.flirtHutes <= 0 && l.flirtCelId == null && l.randival == null && vilag.sztrajkNap <= 0) {    let legjobb = null, legjobbKompat = -31;
    for (const o of vilag.lakok) {
      if (!flirtezheto(vilag, l, o)) continue;
      const k = kompatibilitas(vilag, l, o);
      if (k > legjobbKompat) { legjobbKompat = k; legjobb = o; }
    }
    if (legjobb) {
      let tartalomMod = 1;
      if (vilag.beallitasok.tartalom === 'csipos') tartalomMod = 1.15;
      if (vilag.beallitasok.tartalom === 'meglepetesmentes') tartalomMod = 0.85;
      const urg = (100 - l.igenyek.intimitas) / 100 * 2.6 * tartalomMod * (l.trait === 'Szabad szellem' ? 1.15 : 1);
      const p = { x: legjobb.pos.x, y: legjobb.pos.y };
      lehetseges.push({
        pont: pontoz(l, urg, 1.5, p), poz: p,
        kezdes(v) {
          l.flirtCelId = legjobb.id;
          l.cel = { poz: { x: legjobb.pos.x, y: legjobb.pos.y }, masik: legjobb.id };
          if (legjobb.allapot === 'ures') {
            legjobb.allapot = 'varakozas';
            legjobb.tevekenyseg = { tipus: 'flirtVarakozas', idotartam: 1.5, masik: l.id, poz: { x: legjobb.pos.x, y: legjobb.pos.y } };
          }
        }
      });
    }
  }

  // esti/éjszakai együttlét a megjelölt párral
  if (!gy && l.randival != null && (ej || vilag.ora >= 19) && l.allapot !== 'intimitas') {
    const o = lakoIdSzerint(vilag, l.randival);
    if (o && o.randival === l.id && o.allapot !== 'alvas' && o.allapot !== 'intimitas') {
      const hely = privatHely(vilag, l, o);
      if (hely) {
        const urg = 3.0 + (100 - l.igenyek.intimitas) / 100 * 2.0;
        lehetseges.push({
          pont: pontoz(l, urg, 2.0, hely), poz: hely,
          kezdes(v) {
            l.flirtCelId = null;
            l.cel = { poz: { x: hely.x, y: hely.y }, masik: o.id };
            l.allapot = 'ut';
            if (o.allapot === 'ures') {
              o.cel = null;
              o.allapot = 'varakozas';
              o.tevekenyseg = { tipus: 'randiVarakozas', idotartam: 8, masik: l.id, poz: { x: hely.x, y: hely.y } };
              o.randiHatarido = Math.max(o.randiHatarido || 0, v.osszOra + 10);
            }
          }
        });
      }
    }
  }

  // beszélgetés: legközelebbi szabad szomszéd
  let kozeli = null, kozeliD = 10;
  for (const o of vilag.lakok) {
    if (o === l || o.allapot !== 'ures') continue;
    const d = tavolsag(l.pos, o.pos);
    if (d < kozeliD) { kozeliD = d; kozeli = o; }
  }
  if (kozeli != null) {
    const p = { x: kozeli.pos.x, y: kozeli.pos.y };    lehetseges.push({
      pont: pontoz(l, (100 - l.igenyek.kapcsolodas) / 100 * 1.7, 1.0, p), poz: p,
      kezdes(v) {
        const masikId = kozeli.id;
        inditCel(l, p, (vv) => {
          const o = vv.lakok.find(x => x.id === masikId);
          if (o && tavolsag(o.pos, l.pos) < 3) {
            l.allapot = 'tevekenyseg';
            l.tevekenyseg = { tipus: 'beszelgetes', idotartam: 1, maszik: o.id };
            if (o.allapot === 'ures') {
              o.allapot = 'tevekenyseg';
              o.tevekenyseg = { tipus: 'beszelgetes', idotartam: 1, maszik: l.id };
            }
          }
        });
      }
    });
  }

  // sétálgatás alapértelmezettként
  lehetseges.push({
    pont: 0.15, poz: l.pos,
    kezdes(v) {
      l.cel = { poz: { x: clamp(l.pos.x + (v.rng() * 10 - 5), 2, 45), y: clamp(l.pos.y + (v.rng() * 8 - 4), 2, 31) } };
      l.allapot = 'ut';
    }
  });

  let legjobb = null;
  for (const op of lehetseges) if (!legjobb || op.pont > legjobb.pont) legjobb = op;
  if (legjobb && legjobb.pont > 0.14) legjobb.kezdes(vilag);
  else if (haz) { l.allapot = 'alvas'; l.tevekenyseg = null; }
}

/* ---------- lakó frissítése ---------- */
function lakoFrissites(vilag, l, dt) {
  const gy = l.eletkor === 'gyerek';
  if (l.allapot !== 'alvas') {
    l.igenyek.eletero = clamp(l.igenyek.eletero - 0.9 * dt * (l.trait === 'Munkamániás' ? 1.15 : 1) - (l.allapot === 'intimitas' ? 0.3 * dt : 0), 0, 100);
  }
  const higT = 0.9 * (vilag.techek.agyagkemence ? 0.75 : 1);
  l.igenyek.higienia = clamp(l.igenyek.higienia - higT * dt, 0, 100);
  const kapT = 1.1 * (l.trait === 'Romantikus' ? 1.2 : 1) * (gy ? 0.7 : 1) * (l.trait === 'Munkamániás' ? 0.75 : 1);
  l.igenyek.kapcsolodas = clamp(l.igenyek.kapcsolodas - kapT * dt, 0, 100);
  if (!gy && l.allapot !== 'intimitas') {
    const intT = 1.4 * (l.trait === 'Szabad szellem' ? 1.2 : 1);
    l.igenyek.intimitas = clamp(l.igenyek.intimitas - intT * dt, 0, 100);
  }
  l.euforiaOra = Math.max(0, l.euforiaOra - dt);
  l.flirtHutes = Math.max(0, l.flirtHutes - dt);
  l.dondHutes = Math.max(0, l.dondHutes - dt);

  switch (l.allapot) {
    case 'ut': {
      if (!l.cel) { l.allapot = 'ures'; break; }
      // udvarlás közben a célpont követése (homing)
      if (l.flirtCelId != null) {
        const o = lakoIdSzerint(vilag, l.flirtCelId);
        if (o) { l.cel.poz.x = o.pos.x; l.cel.poz.y = o.pos.y; }
        else { l.flirtCelId = null; l.allapot = 'ures'; break; }
      }
      const d = tavolsag(l.pos, l.cel.poz);
      const sebesseg = 11;
      if (d <= 0.8) {
        l.pos.x = l.cel.poz.x; l.pos.y = l.cel.poz.y;
        if (l.randival != null) {
          const o = lakoIdSzerint(vilag, l.cel.masik);
          l.allapot = 'varakozas';
          l.tevekenyseg = { tipus: 'randiVarakozas', idotartam: 6, masik: l.cel.masik, poz: { x: l.pos.x, y: l.pos.y } };
          l.cel = null;
          if (o && o.allapot === 'varakozas' && tavolsag(o.pos, l.pos) < 2.5 && (vilag.ora >= 20 || ejVan(vilag.ora))) {
            intimitasInditasa(vilag, l, o);
          }
        } else if (l.flirtCelId != null) {
          const o = lakoIdSzerint(vilag, l.flirtCelId);
          l.cel = null; l.flirtCelId = null;
          if (o && tavolsag(o.pos, l.pos) < 2.5 && o.allapot !== 'alvas' && o.allapot !== 'intimitas' && flirtezheto(vilag, l, o)) {
            // közvetlen udvarlás mindkettőnek
            l.allapot = 'tevekenyseg';
            l.tevekenyseg = { tipus: 'udvarlas', idotartam: 1, maszik: o.id };
            o.allapot = 'tevekenyseg';
            o.tevekenyseg = { tipus: 'udvarlas', idotartam: 1, maszik: l.id };
            o.flirtCelId = null;
          } else {
            l.flirtHutes = 1; l.allapot = 'ures';
          }
        } else {
          const cel = l.cel; l.cel = null;
          l.allapot = 'ures';
          if (cel && cel.kezdes) cel.kezdes(vilag);
        }
      } else {
        l.pos.x += (l.cel.poz.x - l.pos.x) / d * sebesseg * dt;
        l.pos.y += (l.cel.poz.y - l.pos.y) / d * sebesseg * dt;
      }
      break;
    }
    case 'tevekenyseg': tevekenysegLepes(vilag, l, dt); break;
    case 'alvas': {
      l.igenyek.eletero = clamp(l.igenyek.eletero + 8 * dt, 0, 100);
      if (l.igenyek.eletero > 96 || (vilag.ora >= HAJNAL + 1 && !ejVan(vilag.ora) && l.igenyek.eletero > 65)) {
        l.allapot = 'ures';
      }
      break;
    }
    case 'intimitas': {
      l.tevekenyseg.idotartam -= dt;
      if (l.tevekenyseg.idotartam <= 0) intimitasVege(vilag, l);
      break;
    }
    case 'varakozas': {
      const tv = l.tevekenyseg;
      tv.idotartam -= dt;
      const o = lakoIdSzerint(vilag, tv.masik);
      const ott = o && tavolsag(o.pos, tv.poz) < 2.5;
      if (tv.tipus === 'flirtVarakozas') {
        if (ott && o.allapot !== 'intimitas' && flirtezheto(vilag, l, o)) {
          l.allapot = 'tevekenyseg';
          l.tevekenyseg = { tipus: 'udvarlas', idotartam: 1, maszik: o.id };
          if (o.flirtCelId === l.id || o.allapot === 'ures') {
            o.allapot = 'tevekenyseg';
            o.tevekenyseg = { tipus: 'udvarlas', idotartam: 1, maszik: l.id };
            o.flirtCelId = null;
          }
        } else if (tv.idotartam <= 0) {
          l.flirtCelId = null; l.allapot = 'ures'; l.tevekenyseg = null;
        }
      } else { // randiVarakozas
        if (ott && (vilag.ora >= 20 || ejVan(vilag.ora)) && o.randival === l.id) {
          intimitasInditasa(vilag, l, o);
        } else if (tv.idotartam <= 0 || l.randiHatarido == null || vilag.osszOra > l.randiHatarido) {
          const o2 = lakoIdSzerint(vilag, l.randival);
          if (o2) o2.randival = null;
          l.randival = null; l.randiHatarido = null;
          l.allapot = 'ures'; l.tevekenyseg = null;
        }
      }
      break;
    }
    case 'ures':
    default: {
      if (l.dondHutes <= 0) { dond(vilag, l); l.dondHutes = 0.25; }
      break;
    }
  }
}

/* napi frissítés */
function napiFrissites(vilag) {
  vilag.nap++;
  vilag.inspiracio = Math.floor(vilag.inspiracio * 0.8);
  vilag.kemiaTelitett = {};

  for (const l of vilag.lakok) {
    if (l.randival != null && l.randiHatarido != null && vilag.osszOra > l.randiHatarido) {
      const o = lakoIdSzerint(vilag, l.randival);
      if (o && o.randival === l.id) o.randival = null;
      l.randival = null; l.randiHatarido = null;
    }
    if (l.eletkor === 'gyerek') {
      l.gyerekNap++;
      if (l.gyerekNap >= 12) {
        l.eletkor = 'felnott'; l.gyerekNap = null;
        l.igenyek.intimitas = 40;
        fuzChronika(vilag, 'esemeny', l.nev + ' felnőtt és a falu teljes jogú tagja lett.');
        vilag.kimenet.push({ tipus: 'toast', ikon: '🌟', szoveg: l.nev + ' felnőtt!' });
      }
    }
    if (l.terhes) {
      l.terhes.hatralevoNap--;
      if (l.terhes.hatralevoNap <= 0) szuletes(vilag, l);
    }
  }

  const haztalan = vilag.lakok.filter(l => l.hazId == null || !epuletIdSzerint(vilag, l.hazId)).length;
  if (haztalan > 0) vilag.feszultseg = clamp(vilag.feszultseg + haztalan * 2.5, 0, 100);

  const zsufolt = vilag.epuletek.filter(e => e.tipus === 'lakohaz' && hazLakoi(vilag, e.id).length > 3).length;
  vilag.feszultseg = clamp(vilag.feszultseg + zsufolt, 0, 100);

  const kimaradt = vilag.lakok.filter(l =>
    l.igenyek.eletero < 12 || l.igenyek.higienia < 12 || l.igenyek.kapcsolodas < 12 || (!l.eletkor.includes('gyerek') && l.igenyek.intimitas < 12)
  ).length;
  vilag.feszultseg = clamp(vilag.feszultseg + kimaradt * 1.2, 0, 100);

  if (vilag.feszultseg >= 80 && vilag.sztrajkNap <= 0) {
    vilag.sztrajkNap = 2;
    fuzChronika(vilag, 'esemeny', 'Sztrájk! A falu feszültsége a tetőfokon hágott — az indulatok elnyomják a kellemes érzelmeket.');
    vilag.kimenet.push({ tipus: 'toast', ikon: '⚠️', szoveg: 'Sztrájk! A feszültség túl magas.' });
  }
  vilag.sztrajkNap = Math.max(0, vilag.sztrajkNap - 1);

  if (vilag.techek.nepszokasok && vilag.nap % 6 === 0) fesztival(vilag);

  vilag.feszultseg = clamp(vilag.feszultseg - 2, 0, 100);
}

/* ---------- fő tick ---------- */
function vilagTick(vilag, dt) {
  vilag.ora += dt;
  vilag.osszOra += dt;
  while (vilag.ora >= NAP_ORAK) { vilag.ora -= NAP_ORAK; napiFrissites(vilag); }
  for (const l of vilag.lakok) lakoFrissites(vilag, l, dt);
  for (const e of vilag.epuletek) {
    if (!e.epitve) {
      e.epitHatralevo -= dt * 0.6;
      if (e.epitHatralevo <= 0) epuletKesz(vilag, e);
    }
  }
  vilag.feszultseg = clamp(vilag.feszultseg - 0.04 * dt, 0, 100);
  if (vilag.kimenet.length > 50) vilag.kimenet.splice(0, vilag.kimenet.length - 50);
}

/* ---------- falu alapítása ---------- */
function inditFalut(mag, beallitasok) {
  const vilag = letrehozVilag(mag, beallitasok);
  const rng = vilag.rng;

  const hazak = [[12, 10], [17, 10], [22, 10], [27, 10], [12, 24], [17, 24], [22, 24]];
  for (const [x, y] of hazak) vilag.epuletek.push({ id: ujAzon(), tipus: 'lakohaz', x, y, szel: 2, mag: 2, epitve: true, epitHatralevo: 0 });
  vilag.epuletek.push({ id: ujAzon(), tipus: 'kut', x: 22, y: 17, szel: 1, mag: 1, epitve: true, epitHatralevo: 0 });
  vilag.epuletek.push({ id: ujAzon(), tipus: 'tanchaz', x: 28, y: 11, szel: 3, mag: 2, epitve: true, epitHatralevo: 0 });
  vilag.epuletek.push({ id: ujAzon(), tipus: 'furdo', x: 28, y: 22, szel: 3, mag: 2, epitve: true, epitHatralevo: 0 });

  for (let i = 0; i < 26; i++) {
    const x = 2 + rng() * 44, y = 2 + rng() * 30;
    let ok = !(x < vilag.to.x + vilag.to.szel + 1 && x > vilag.to.x - 1 && y < vilag.to.y + vilag.to.mag + 1 && y > vilag.to.y - 1);
    if (ok) for (const e of vilag.epuletek) if (x > e.x - 1 && x < e.x + e.szel + 1 && y > e.y - 1 && y < e.y + e.mag + 1) { ok = false; break; }
    if (ok) vilag.dekoracio.push({ tipus: 'fa', x, y });
  }
  for (let i = 0; i < 16; i++) vilag.dekoracio.push({ tipus: 'bo', x: 2 + rng() * 44, y: 2 + rng() * 30 });
  for (let i = 0; i < 34; i++) vilag.dekoracio.push({ tipus: 'virag', x: 2 + rng() * 44, y: 2 + rng() * 30 });

  const ferfiNevek = kever(FERFI_NEVEK, rng);
  const noiNevek = kever(NOI_NEVEK, rng);
  const traitPool = kever(['Monogám', 'Monogám', 'Monogám', 'Monogám', 'Szabad szellem', 'Szabad szellem', 'Szabad szellem', 'Szabad szellem', 'Szabad szellem', 'Romantikus', 'Romantikus', 'Romantikus', 'Romantikus', 'Romantikus', 'Munkamániás', 'Munkamániás', 'Munkamániás', 'Munkamániás', 'Munkamániás'], rng);

  for (let i = 0; i < 20; i++) {
    const no = i % 2 === 0;
    const nev = no ? noiNevek[i / 2] : ferfiNevek[(i - 1) / 2];
    const haz = vilag.epuletek.filter(e => e.tipus === 'lakohaz')[i % 7];
    const l = letrehozLako(vilag, nev, no, { hazId: haz.id, trait: traitPool[i] || TRAITOK[Math.floor(rng() * 4)] });
    vilag.lakok.push(l);
  }
  for (const l of vilag.lakok) {
    const haza = epuletIdSzerint(vilag, l.hazId);
    if (haza) {
      l.pos.x = hazKozep(haza).x + (rng() * 6 - 3);
      l.pos.y = hazKozep(haza).y + 2.5 + rng() * 2;
    }
  }

  fuzChronika(vilag, 'esemeny', 'A falu megalapítása: 20 lakó, egy kút, egy táncház, egy fürdő. Hajnal-kor, 1. nap.');
  return vilag;
}

/* ---------- publikus felület ---------- */
const SIM = {
  VERZIO, NAP_ORAK, EST, HAJNAL,
  TRAITOK, ERDEKESSEGEK, FERFI_NEVEK, NOI_NEVEK,
  EPULETEK, TECHNOLOGIAK, TARTALMI_FOKOK,
  mulberry32, clamp, kever, kemiaKulcs, ejVan,
  letrehozVilag, inditFalut, vilagTick,
  kompatibilitas, flirtezheto, kemiaLekeres, kemiaHozzaad,
  epuletEpites, elhelyezheto, techVasarlas, fesztival,
  intimitasInditasa, megtermekenyites, szuletes, epuletKesz,
  epuletIdSzerint, lakoIdSzerint, hazKozep, hazLakoi,
};
if (typeof module !== 'undefined' && module.exports) module.exports = SIM;
if (typeof window !== 'undefined') window.SIM = SIM;
