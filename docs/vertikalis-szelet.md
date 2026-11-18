# Vertikális szelet 0.1 — pontos tartalom

**Cél:** a játék magja egyetlen játszható fájlban (`index.html`) — 10 perc alatt átlátható, órákon át játszható falu-légkör.

## Ami benne van (minden megvalósult és tesztelt)

| Elem | Részlet |
| --- | --- |
| **20 lakó** | 10 férfi / 10 nő, magyar nevekkel, véletlenszerű trait- és érdeklődés-kiosztás, 7 lakóházba leosztva |
| **1 korszak** | Hajnal-kor, 3 technológiával (Tűzfény lámpások, Agyagkemence, Népszokások) |
| **4 épülettípus** | Lakóház (100 ✨), Kút (60 ✨), Táncház (180 ✨), Fürdő (240 ✨) — építési mód szellem-előnézettel, ütközés-ellenőrzéssel, munkások gyorsítják |
| **Teljes core loop** | igények → Utility AI → udvarlás (üldözős logika) → randi → éjszakai együttlét **fade-to-black**-kel → ✨ Inspiráció (telítettségi szorzóval) → építés/technológia |
| **Párkapcsolatok** | együttlét után trait-függő eséllyel pár alakul (Monogám 0,55 / Romantikus 0,35 / Munkamániás 0,25 / Szabad szellem 0,05 × kémia-faktor) |
| **Dráma** | Monogám féltékenység: +12 ⚠️, veszekedés-emlék, 35% szakítás; „Meglepetésmentes" módban kikapcsolva |
| **Szaporulat** | „Nemzedékek" kapcsoló: kémia ≥ 45 + együttlét → 30% fogamzás → 3 nap → születés (faluhatár: 30 lakó); gyerekek 12 nap alatt felnőnek, és **keményen kizárva** minden romantiikus mechanikából |
| **Sztrájk** | Feszültség ≥ 80 → 2 nap: az együttlétek ✨-hozama feleződik, krónika-jegyzet |
| **Fesztivál** | Népszokások-tech után gombbal (✨20): +30 kapcsolódás mindenkinek, −12 ⚠️ |
| **Kamera** | szabad mozgás (húzás), görgő/csippentés-zoom (0,5×–2,8×), lakó-követés mód |
| **UI** | magyar nyelven: felső sáv (nap/óra, ✨, ⚠️, 👥, sebesség ⏸/▶/⏩), építés-panel, Krónika- és Lakók-fül, lakókártya (igény-sávok, trait, kapcsolatok), technológia- és beállítás-módal, súgó, toast-értesítések |
| **Hang** | procedurális WebAudio: nappal dúrós pentaton pluck-motívum, éjjel mollá vált, csengő az ✨-hozamnál; kikapcsolható |
| **Nap/éj ciklus** | 1 játéknap ≈ 36 s (1×); éjjeli sötétítés, lámpafény a Táncháznál és a Fürdőnél |
| **Krónika** | 6 kategóriában színezett esemény-napló (szerelem / dráma / építés / tech / születés / esemény) |
| **Tartalom csúszka** | Romantikus / Csípős (+10% ✨, élőbb szövegek) / Meglepetésmentes (nincs féltékenység) |
| **Mobil** | touch-pan, pinch-zoom, az UI áthelyeződik keskeny képernyőn |

## Ami NINCS benne (tudatosan — lásd útiterv)

- Mentés/betöltés (M1), pletkyaháló (M1), több korszak (M1–M4), hírnév (M3), robotok/UFO (M5–M6), modding API (M4+).

## Hogyan futtasd

1. Töltsd le / klónozd a repót, nyisd meg az `index.html`-t böngészőben. Ennyi. (Vagy: `python3 -m http.server 8080` és `http://localhost:8080`.)
2. Nyomd meg az **„Ébredj a faluban!"** gombot, válassz lakót a Lakók fülön, figyeld az éjszakákat, építsd ki a falut.

## Hibakeresés fejlesztőknek

- Szim-tesztek: `node tests/sim.test.js` → 45 ellenőrzés.
- Konzol-horog: `window.__BBB.vilag()` / `.kamera()` / `.epites(tipus, x, y)` a futó játék belső állapotához.
- Egy-fájlos csomag itch.io-hoz: `node scripts/bundle.js` → `dist/barhol-barmikor-barkivel.html` (minden beágyazva).
