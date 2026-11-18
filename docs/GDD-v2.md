# Bárhol Bármikor Bárkivel — GDD v2 (Game Design Document)

**Verzió:** 2.0 · **Állapot:** vertikális szelet tervezve és megvalósítva · **Nyelv:** magyar
**Projekt:** életszimulátor, amelyben a falu gazdasági motorja a szerelem és az intimitás.

---

## 1. Egy mondatban

Egy telepes-szimulátor, ahol a lakók szerelmi életét irányítod közvetve: helyszíneket építesz, a közösség hangulatát formálod, és a boldog találkozásokból termelődő **✨ Inspirációból** fejleszted a falut a hajnali tábortüntől a robotkorszakon át az űrkorszakig.

## 2. Pillérek

1. **A szerelem a gazdaság** — nem melléktörténet: az intimitás és kapcsolódás az egyetlen forrása a főépítési erőforrásnak. Ami a Simsből a „fun" moodlet, az itt a nemzeti jövedelem.
2. **Közvetett irányítás** — nem parancsolod a lakókat, hanem **környezetet tervezel**: a Utility AI dönt helyetted (RimWorld / The Sims modell).
3. **A kapcsolatgráf az élmény** — minden lakónak emlékei, exei, féltékenységei és hírneve van; a drámák nem scriptek, hanem a gráf melléktermékei.
4. **Korszakok íve** — a technológiai fejlődés megváltoztatja a szerelem formáit is: udvarlást → hírnév → média → társkereső alkalmazás → szolgálati robotok → ???

## 3. Core Loop

```
Megfigyelés (igények, feszültség)
   ↓
Építés / zónatervezés (helyszínek, moodletek)
   ↓
Utility AI: lakók társalog, táncol, fürdik, udvarol
   ↓
Kompatibilitási mátrix + Kémia → együttlét (fade-to-black)
   ↓
Eufória buff → ✨ Inspiráció termelés
   ↓
Inspiráció költése: épületek, technológiák
   ↓
Új helyszínek → új lehetőségek → (vissza az elejére)
```

Ellensúlyok, amelyek megakadályozzák a kifutásból (runaway loop):
- az **Inspiráció naponta 20%-át elveszíti** (perishable premium-erőforrás),
- **telítettségi görbe**: ugyanaz a pár ugyanazon a napon egyre kevesebbet ad (×0,7-es szorzó),
- a technológiák és épületek **exponenciálisan drágulnak**,
- a **Feszültség** (féltékenység, kielégítetlen igények) 80 fölé érve sztrájkot okoz, ami megfelezi a termelést.

## 4. Erőforrások

| Erőforrás | Jel | Termelés | Fogyás | Határ |
| --- | --- | --- | --- | --- |
| **Inspiráció** | ✨ | együttlétek, fesztiválok | −20%/nap; költés építésre, tech-re | a fő építőerőforrás |
| **Feszültség** | ⚠️ | féltékenység +12, kielégítetlen igények, hajléktalanság | fürdő, fesztivál, alvás, idő | 80 felett sztrájk |
| **Kémia** (rejtett) | ❤️ | tánc +3/ó, beszélgetés +1,5/ó, együttlét +8 | sikertelen udvarlás −2 | 0–100, páronként |

## 5. Agent modell

**Igények (0–100, óránként csökkennek):** Életerő (−0,9/ó; alvás +8/ó) · Higiénia (−0,9/ó; kút/fürdő) · Kapcsolódás (−1,1/ó; tánc, beszélgetés) · Intimitás (−1,4/ó; együttlét).

**Traitok:**
- **Monogám** — párkapcsolatban csak a párjával flörtöl; ha a párja megcsalja: féltékenység-robbanás (+12 Feszültség, veszekedés-emlék, 35% szakítás).
- **Szabad szellem** — gyorsabb intimitás-igény, flörtöl bárkivel, nem féltékeny; a Monogám párok természetes drámagenerátora.
- **Romantikus** — gyorsabb kapcsolódás-igény, pár-létrehozásra hajlamos.
- **Munkamániás** — építkezést keres, kapcsolódás-igénye lassabb, életereje gyorsabban fogy.

**Kompatibilitási mátrix:** érdeklődés-átfedés (zene, tánc, kertészkedés, történetek, csillagok, kézművesség — 25 pont / egyezés) + trait-szinergia (pl. Romantikus+Romantikus +15, Monogám+Szabad szellem −15) − blokkok (veszekedés −45, monogám hűség −100).

**Utility AI:** minden döntésnél a lakó kiértékeli a lehetőségeit:
`pont = sürgősség(igény) × helyszín-minőség × távolsági faktor × hangulat-szorzók`
és a legjobbat választja, 0,25 órás döntési hűtéssel. A lakók **üldözős** logikával követik a flörtcélpontot (homing), így a mozgó célpontok ellenére is létrejön az udvarlás.

**Szimulációs LOD (terv a 30+ lakóra):** képernyőn belül teljes szimuláció, képernyőn kívül statisztikai közelítés. A szeletben mind a 20–30 lakó teljesen szimulált.

## 6. Kapcsolatgráf és memória (1. iteráció részleges)

A szeletben már létezik: párok (`partnerId`), exek (`exPartnerek`), veszekedés-emlékek (`veszekedesek`), kémia-térkép. **M1-ben jön:** pletkyahálózat (hírek terjedése lakóról lakóra, torzulással), „morál" megítélés (a falu véleménye a nyílt/flörtölő magatartásról — kultúránként eltérő), és hosszú távú emlékek (évfordulók, régi sérelmek).

## 7. Építés és zónák

A vertikális szelet 4 épülettípussal indul: **Lakóház** (100 ✨, alvás + privát éjszakák, 3 lakó), **Kút** (60 ✨), **Táncház** (180 ✨, kapcsolódás + kémia), **Fürdő** (240 ✨, prémium higiénia + eufória). A helyszínek **moodleteket** adnak (eufória-időzítkö), a privát/lakózónák határozzák meg, hol kezdődhet együttlét (saját- vagy pár-lakás, éjjel a fürdő).

## 8. Korszakok és tech-fák

Hét korszak, mindegyikben három tech-ág: **Közösség** (társadalmi szabályok, drámamechanikák), **Építészet** (új helyszínek), **Szenvedély** (intimitás-kultúra, ✨-hatékonyság). Egy korszak 4–6 techből áll; az átmenetet előfizetési-alapú hírnév + épületfeltétel zárja.

### 8.1 Hajnal-kor *(a vertikális szelet tartalma — megvalósítva)*
Tábortűz-kultúra, közös kútnál ismerkedés. Techek: **Tűzfény lámpások** (+10% ✨ éjszaka), **Agyagkemence** (jobb fürdő, lassabb higiénia-hanyatlás), **Népszokások** (fesztivál-akció: −12 Feszültség, +20 ✨).

### 8.2 Falukor
Techek: *Betűvetés* (krónika bővül: láncszerű események), *Piacnap* (kereskedelem: fejlesztő-nyersanyag), *Báltermek* (táncház-bővítés: kémia ×1,25), *Skandalum* (pletyka-rendszer bekapcsolása: hírek terjednek, botrányok arányosan csökkentik a hírnevet). Új események: betyár-ajándék, jóslás a tűznél.

### 8.3 Városkor
Techek: *Céhek* (munkamegosztás: lakók foglalkozást kapnak → szabadidő-igény nő), *Városi fürdők* (_CAPACITY_ moodlet), *Szalonok* (polgári udvarlás: kompatibilitás-súly átrendeződés), *Színház* (eufória-esemény moziban). A Feszültség forrásai átrendeződnek: zsúfoltság és rivalizálás.

### 8.4 Iparkor
Techek: *Gáztűzhelyek*, *Társasházak* (6 lakó/ház, de zsúfoltság-dráma), *Vasút* (karaván-események → új lakók vándorolnak be), *Fotográfia* (a botrányok „bizonyítékkal" terjednek). Új mechanika: **hírnév**-skála falanként, a lakók konformitása trait szerint eltérő.

### 8.5 Modern kor
Techek: *Rádió* (tömeg-eufória, de uniformizálás: kémia-növekedés lassul), *Autók* (randi-hatótáv nő: „autózás" helyszín), *Televízió* (normák sugárzása: Monogám-nyomás nő → Szabad szellemek frusztrációja), *Társkereső iroda* (pár-rendelés: kompatibilitás-lista UI).

### 8.6 Robotika
Techek: *Szolgálati robotok* (igény-kiszolgálás géppel — olcsó, de **lassan erodálja az ember-ember kémiát**: a robot-moodlet után az igazi találkozás kevesebb kémiát ad), *Szervetlen társak* (robot-partner választható), *Emberi Érintés Mozgalom* (ellen-tech: közösségi esemény, ami visszaállítja a kémiát). Ez a korszak a játék morális csúcsa: kényelem vs. valódi kapcsolat.

### 8.7 Űrkorszak
Techek: *Űrkikötő* (UFO-diplomácia: **komikus idegen frakció** — furcsa szokások, cseréje: „bio-kozmetikai" elpusztítása nélkül), *Alap-telep* (új térképrész), *Gravitációs bálterem* (alacsony gravitációs tánc: egyedi eufória), *Fénysebesség-udvarlás* (idődilatációs szerelem: a távollévő partner kémiája nem hanyatlóik). Végállapot: a falu kultúrája „exportálni" kezdheti magát (kolóniák, mindegyik a te játékodból kikerült normákkal).

## 9. Eseményrendszer

Alap-hullám: karaván (új lakó), fesztivál, születés, botrány, szakítás, sztrájk. **M2-től:** hangulat-ciklusok ( tavasz → szerelem-szezonalitás), válság-láncok (hírnév-összeomlás → tömeges elvándorlás). Az események data-driven (`esemenyek.json` szerű struktúra) — modding alap.

## 10. Krónika

Minden fontos esemény feljegyzést kap (nap, óra, típus, szöveg): szerelem, dráma, építés, technológia, születés, esemény. Hosszú távon a krónika lesz a „falu regénye" — exportálható szöveg (M3: naptár-nézet + kép-exportálás megosztáshoz).

## 11. Tartalmi szabályzat (rögzített design-döntés)

- Minden intim jelenet **fade-to-black** technikával jelenik meg; explicit vizuális tartalom soha nem kerül a játékba.
- **Tartalom-erősség csúszka** a jogszabályi/platform-követelményekhez: *Romantikus* (alap) / *Csípős* (több dráma, +10% ✨) / *Meglepetésmentes* (féltékenység-kikapcsolás).
- **Minden romantikus szereplő felnőtt (18+).** A generációk-generálás során született gyerekek kifejezetten kizárva minden romantiikus/intim mechanikából (a kódban `flirtezheto()` keményen tiltja) — csak igényeik (életerő, higiénia, kapcsolódás) és felnövekedésük van.
- **Háziállatok** társaság-moodletet adnak, sosem intimitás-célpontok; **fantázialények** űr-NPC frakciók a késői korszakokban.
- A modding API (M4+) nem tudja felülírni a fenti alapszabályokat.

## 12. Műszaki terv

**Fázis 1 — most (ez a repo):** vanilla HTML5 + Canvas 2D + WebAudio, build-lépés nélkül. A szimulációs mag (`js/sim.js`) tiszta logika: böngészőben ÉS Node-ban fut → automatikus tesztelhető. Nyisd meg az `index.html`-t és működik.

**Fázis 2 — M2-től:** migráció **PixiJS + TypeScript**-re (web-fókusz: itch.io elsődleges cél; WebGL a több ezer sprite-hoz), a szim-mag változatlanul hordozható. Desktop-változat Tauri/Electron borítással, ha Steam-re megy.

**Indoklás (Godot 4 vs. web-stack):** a web-cél („kis mellék kereset online felületeken") + a már működő JS-sim miatt a PixiJS/TS vonal kisebb újraírás; a Godot 4 csak akkor lesz releváns, ha nagyon mértékű vektoros animációt/lokális gépi tanulást vezetnénk be.

## 13. A vertikális szelet tartalma

Lásd: [vertikalis-szelet.md](vertikalis-szelet.md). Röviden: **20 lakó, 1 korszak (Hajnal-kor), 4 épülettípus, teljes core loop, nemzedékek, krónika, tartalom-csúszka, fade-to-black, opció: kamera-követés + zoom.**

## 14. Megnyitott kérdések (M1-re)

1. Pletyka-algoritmus: korlátozott sugárú terjedés vagy teljes gráf?
2. Kultúra-norma modellezése: falu-szintű skálák vagy trait-szintű?
3. Gazdasági mélység: kell-e nyersanyag-szint az Inspiráció mögé M2-ben?
