# Útiterv — Bárhol Bármikor Bárkivel

## M0 — Vertikális szelet ✅ (kész, ez a repo)

- [x] Szimulációs mag (igények, traitok, kompatibilitás, Utility AI, kémia, telítettség)
- [x] Udvarlás → randi → fade-to-black → ✨ lánc
- [x] Párkapcsolatok, féltékenység-dráma, szakítás
- [x] Nemzedékek (fogamzás → születés → felnövekedés), gyerekek biztonsági zárolása
- [x] Építési mód (4 épület, költség, ütközés, munkások)
- [x] 3 technológia, fesztivál, sztrájk
- [x] Krónika, toastok, lakókártya, kamera-követés + zoom, mobil-támogatás
- [x] Procedurális ambient hang
- [x] 45 szimulációs teszt (Node) + böngészős kézi ellenőrzés

## M1 — „Igazi játék" alapok (~2–3 hét mellék-munka)

- Mentés/betöltés (localStorage + JSON export/import)
- Pletkyahálózat: hírek terjedése gráfban (torzulással), falu-vélemény skála
- További 3 technológia + karaván-esemény (új lakók vándorolnak be)
- Lakókártya bővítés: kapcsolatgráf-nézet (kinek kivel mi a viszonya)
- Balansz-passz az ✨-gazdaságon (játékos-cél: első fesztivál ~5. nap, első születés ~10. nap)

## M2 — PixiJS/TS migráció + itch.io demo

- PixiJS + TypeScript váz, a sim-mag változatlan (Node-tesztek megmaradnak)
- Sprite-atlasz: kézzel rajzolt, stilizált karakterek (Two Point-ihletésű, nem pixel-art, nem firembab)
- itch.io oldal: beágyazott demo (bundle), fejlesztői napló, GDD-részlet
- Visszajelzés-gyűjtés: kérdőív + Discord/megjegyzés

## M3 — Falukor + hírnév

- 2. korszak teljes tech-fája, hírnév-skála, színház/piacnap események
- Krónika-exportálás (szöveg + kép) megosztáshoz
- Opcionális cél: Steam-demo-terv (Tauri csomagolás)

## M4 — Városkor + Iparkor + modding

- Céhek/munkamegosztás, társasház-zsúfoltság-dráma, fotográfia-botrányok
- Data-driven tartalom (épületek/techek/események JSON-ból), modding API a tartalmi szabályzat betartásával
- Steam oldal + Early Access stratégia döntés

## M5 — Robotika

- Szolgálati robotok (kényelem vs. valódi kapcsolat dilemma)
- Emberi Érintés Mozgalom (ellen-mechanika)
- Szervetlen társak (robot-partner) — kifejezetten társasági funkció

## M6 — Űrkorszak + befejezés

- UFO-diplomácia (komikus frakció), alap-telep, gravitációs bálterem
- Kolónia-export (a játékos normáival elindult leánfalu)
- 1.0 kiadás: Steam + itch.io

## Kockázatok

- **Balansz:** az ✨-gazdaság könnyen kifut; a telítettség + decay + sztrájk hármas ellenőrzi — folyamatos tesztelés Node-ban.
- **Tartalom-moderáció:** az itch.io/Steam szabályok szigorúak; a fade-to-black + csúszka + felnőtt-csúszka-kizárás hármas védelem a tervezés alapja, nem utólagos tapasztás.
- **Teljesítmény:** 30+ lakó előbb-utóbb LOD-ot igényel (képernyőn belül teljes, kívül statisztikai szimuláció).
