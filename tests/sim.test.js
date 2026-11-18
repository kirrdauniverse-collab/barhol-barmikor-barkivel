'use strict';
/* ============================================================
   Bárhol Bármikor Bárkivel — szimulációs tesztek (Node)
   Futtatás: node tests/sim.test.js
   ============================================================ */
const path = require('path');
const S = require(path.join(__dirname, '..', 'js', 'sim.js'));

let tesztek = 0, hibak = 0;
function ellenoriz(nev, feltetel) {
  tesztek++;
  if (feltetel) { console.log('  ✔ ' + nev); }
  else { hibak++; console.log('  ✘ HIBA: ' + nev); }
}

function ore(vilag, orak) { // ennyi játékórát lép
  for (let i = 0; i < Math.round(orak / 0.1); i++) S.vilagTick(vilag, 0.1);
}

console.log('— Bárhol Bármikor Bárkivel szimulációs tesztek (SIM ' + S.VERZIO + ') —');

/* 1. Falu felépítése */
{
  const w = S.inditFalut(42, {});
  ellenoriz('20 felnőtt lakó', w.lakok.length === 20 && w.lakok.every(l => l.eletkor === 'felnott'));
  ellenoriz('van kút, táncház, fürdő', ['kut', 'tanchaz', 'furdo'].every(t => w.epuletek.some(e => e.tipus === t)));
  ellenoriz('mindenki lakott', w.lakok.every(l => S.epuletIdSzerint(w, l.hazId)));
  ellenoriz('traitok keveredve', new Set(w.lakok.map(l => l.trait)).size >= 3);
}

/* 2. Igények hanyatlása */
{
  const w = S.inditFalut(42, {});
  const elotte = w.lakok.map(l => l.igenyek.higienia);
  ore(w, 0.25);
  let csokkent = 0;
  w.lakok.forEach((l, i) => { if (l.igenyek.higienia < elotte[i]) csokkent++; });
  ellenoriz('a higiénia csökken időben (a lakók többségénél)', csokkent >= 14);
}

/* 3. Kémia rendszer */
{
  const w = S.inditFalut(42, {});
  const [a, b] = w.lakok;
  S.kemiaHozzaad(w, a, b, 30);
  ellenoriz('kémia hozzáadás + lekérés', S.kemiaLekeres(w, a, b) === 30);
  S.kemiaHozzaad(w, a, b, 200);
  ellenoriz('kémia 100-nál tetőzik', S.kemiaLekeres(w, a, b) === 100);
  ellenoriz('kémia szimmetrikus kulcs', S.kemiaLekeres(w, b, a) === 100);
}

/* 4. Kompatibilitás és tiltások */
{
  const w = S.inditFalut(42, {});
  const [a, b] = w.lakok;
  const gyerek = S.lakoIdSzerint(w, a.id);
  gyerek.eletkor = 'gyerek';
  ellenoriz('gyerekkel nem flörtölhető', S.flirtezheto(w, gyerek, b) === false);
  gyerek.eletkor = 'felnott';
  const c = w.lakok[2];
  a.trait = 'Monogám'; b.trait = 'Monogám'; c.trait = 'Romantikus';
  a.partnerId = b.id; b.partnerId = a.id;
  ellenoriz('monogám párkapcsolatban másra nem', S.flirtezheto(w, a, c) === false);
  ellenoriz('monogám a saját párjával igen', S.flirtezheto(w, a, b) === true);
}

/* 5. Intimitás lánc: direkt esemény */
{
  const w = S.inditFalut(42, {});
  const [a, b] = w.lakok;
  S.kemiaHozzaad(w, a, b, 50);
  a.allapot = 'ures'; b.allapot = 'ures';
  S.intimitasInditasa(w, a, b);
  ellenoriz('intimitás állapot beállt', a.allapot === 'intimitas' && b.allapot === 'intimitas');
  const inspElotte = w.inspiracio;
  ore(w, 2.2);
  const szerelem = w.chronika.filter(c => c.tipus === 'szerelem');
  ellenoriz('krónika rögzíti az együttlétet', szerelem.length >= 1);
  ellenoriz('Inspiráció termelődött (+>0)', w.inspiracio > inspElotte);
  ellenoriz('eufória buff megjárta', a.euforiaOra > 0 && b.euforiaOra > 0);
}

/* 6. Napi telítettség: ugyanaz a pár kevesebbet ad másodjára */
{
  const w = S.inditFalut(42, {});
  const [a, b] = w.lakok;
  S.kemiaHozzaad(w, a, b, 60);
  a.igenyek.kapcsolodas = 50; b.igenyek.kapcsolodas = 50;
  S.intimitasInditasa(w, a, b); ore(w, 2.2);
  const els = w.inspiracio;
  S.intimitasInditasa(w, a, b); ore(w, 2.2);
  const mas = w.inspiracio - els;
  ellenoriz('második együttlét kevesebb ✨ (telítettség)', mas < 50 * 1.68 && mas > 0);
}

/* 7. Féltékenység dráma */
{
  const w = S.inditFalut(42, {});
  const [p, x, c] = w.lakok;
  p.trait = 'Monogám'; x.trait = 'Szabad szellem'; c.trait = 'Romantikus';
  p.partnerId = x.id; x.partnerId = p.id;
  const feszElotte = w.feszultseg;
  w.beallitasok.tartalom = 'romantikus';
  S.intimitasInditasa(w, x, c); ore(w, 2.2);
  ellenoriz('féltékenység emeli a feszültséget', w.feszultseg > feszElotte);
  ellenoriz('krónika drámát jegyez', w.chronika.some(e => e.tipus === 'drama'));
  // meglepetésmentes: nincs dráma
  const w2 = S.inditFalut(43, { tartalom: 'meglepetesmentes' });
  const [p2, x2, c2] = w2.lakok;
  p2.trait = 'Monogám'; x2.trait = 'Szabad szellem';
  p2.partnerId = x2.id;
  const f2 = w2.feszultseg;
  S.intimitasInditasa(w2, x2, c2); ore(w2, 2.2);
  ellenoriz('„Meglepetésmentes" mód: nincs dráma a krónikában', !w2.chronika.some(c => c.tipus === 'drama'));
}

/* 8. Technológia: Tűzfény +10% */
{
  const w = S.inditFalut(42, {});
  const [a, b] = w.lakok;
  w.inspiracio = 1000;
  S.kemiaHozzaad(w, a, b, 50);
  const ered = S.techVasarlas(w, 'tuzfeny');
  ellenoriz('tech vásárlás levonja a költséget', ered.ok && w.inspiracio === 1000 - 150);
  ellenoriz('tech flag beállt', w.techek.tuzfeny === true);
  S.intimitasInditasa(w, a, b); ore(w, 2.2);
  const wKontrol = S.inditFalut(42, {});
  const [aK, bK] = wKontrol.lakok;
  S.kemiaHozzaad(wKontrol, aK, bK, 50);
  S.intimitasInditasa(wKontrol, aK, bK); ore(wKontrol, 2.2);
  const nyeres = s => { const m = s.chronika.find(c => c.tipus === 'szerelem' && c.szoveg.includes('✨')); return m ? Number(m.szoveg.match(/\+(\d+) ✨/)[1]) : 0; };
  const techNyel = nyeres(w), kontrol = nyeres(wKontrol);
  ellenoriz('Tűzfény ~10%-kal több ✨ (' + techNyel + ' vs ' + kontrol + ')', techNyel > kontrol && Math.abs(techNyel - kontrol * 1.1) <= 2);
}

/* 9. Építés: költség, megépülés, lakás-kiosztás */
{
  const w = S.inditFalut(42, {});
  w.inspiracio = 500;
  const ered = S.epuletEpites(w, 'lakohaz', 5, 5);
  ellenoriz('építés engedélyezett és kifizetett', ered.ok && w.inspiracio === 500 - 100);
  ellenoriz('építés alatt áll', ered.ok && ered.epulet.epitve === false);
  // lakótalanítunk egy lakót, hogy teszteljük a kiosztást
  const l = w.lakok[0];
  l.hazId = null;
  ore(w, 4);
  ellenoriz('az épület 4 óra alatt elkészül', ered.epulet.epitve === true);
  ellenoriz('hajléktalan lakó beköltözött', l.hazId === ered.epulet.id);
  const hibas = S.epuletEpites(w, 'lakohaz', 5, 5);
  ellenoriz('ütközés helyén nem építhet', !hibas.ok);
  // max darabszám
  for (let i = 0; i < 12; i++) { w.inspiracio = 5000; S.epuletEpites(w, 'lakohaz', 40, 2 + i * 3); }
  w.inspiracio = 5000;
  const tul = S.epuletEpites(w, 'lakohaz', 44, 30);
  ellenoriz('lakóházból max 12', !tul.ok);
}

/* 10. Szaporulat: fogamzás → születés */
{
  const w = S.inditFalut(42, { nemzedek: true });
  const anya = w.lakok.find(l => l.no);
  const db = w.lakok.length;
  S.megtermekenyites(w, anya, anya.id + 1);
  ore(w, 65);
  ellenoriz('3 nap után született a gyerek', w.lakok.length === db + 1);
  const gyerek = w.lakok[w.lakok.length - 1];
  ellenoriz('az újszülött gyerek', gyerek.eletkor === 'gyerek');
  ellenoriz('gyerekkel nem lehet flörtölni', w.lakok.every(l => !S.flirtezheto(w, l, gyerek)));
  // nemzedékek kikapcsolva: nem születik
  const w2 = S.inditFalut(43, { nemzedek: false });
  const anya2 = w2.lakok.find(l => l.no);
  S.megtermekenyites(w2, anya2, anya2.id + 1);
  ore(w2, 65);
  ellenoriz('nemzedékek kikapcsolva: nincs születés', w2.lakok.length === 20);
}

/* 11. Sztrájk magas feszültségnél */
{
  const w = S.inditFalut(42, {});
  ore(w, 15.8); // közel éjfélig
  w.feszultseg = 85;
  ore(w, 0.5); // éjféli átfordulás: lefut a napi frissítés
  ellenoriz('sztrájk kirobban 80 felett', w.sztrajkNap > 0);
  ellenoriz('sztrájk a krónikában', w.chronika.some(c => c.szoveg.includes('Sztrájk')));
}

/* 12. Fesztivál hatása */
{
  const w = S.inditFalut(42, {});
  w.feszultseg = 60;
  const feszElotte = w.feszultseg;
  S.fesztival(w);
  ellenoriz('fesztivál csökkenti a feszültséget', w.feszultseg < feszElotte);
  ellenoriz('fesztivál eufóriát ad', w.lakok.every(l => l.euforiaOra > 0));
}

/* 13. Teljes futás: 20 nap önjáró szimuláció */
{
  let osszSzerelem = 0, osszInsp = 0;
  for (const mag of [42, 7, 99]) {
    const w = S.inditFalut(mag, { tartalom: 'romantikus', nemzedek: true });
    ore(w, 480);
    const szerelem = w.chronika.filter(c => c.tipus === 'szerelem').length;
    osszSzerelem += szerelem;
    osszInsp += w.inspiracio;
    ellenoriz('mag ' + mag + ': 20 nap alatt történt együttlét', szerelem >= 5);
    ellenoriz('mag ' + mag + ': a gazdaság él (✨ > 100)', w.inspiracio > 100);
    ellenoriz('mag ' + mag + ': senki nem akadt fenn', w.lakok.every(l => l.allapot != null));
  }
  console.log('  (20 napos futások összesen: ' + osszSzerelem + ' együttlét, átlag ✨: ' + Math.round(osszInsp / 3) + ')');
}

console.log('');
if (hibak === 0) console.log('✅ Minden teszt átment (' + tesztek + '/' + tesztek + ')');
else { console.log('❌ ' + hibak + ' teszt bukott (' + (tesztek - hibak) + '/' + tesztek + ' ment át)'); process.exit(1); }
