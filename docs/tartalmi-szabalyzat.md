# Tartalmi szabályzat

**Státusz:** rögzített design-döntés a projekt alapítása óta (GDD v2, 11. fejezet). Ez a dokumentum a fejlesztés, a modding és a kiadás közös alapja.

## 1. Elvek

1. **Fade-to-black minden intimitásnál.** A játékban semmilyen explicit vizuális tartalom nem jelenik meg: az együttlét sötétítést, román címkéket és krónika-jegyzetet kap. Ez nem technikai korlát, hanem a játék hangulatának („közvetett, emberi, humoros") része.
2. **Korhatár-piacon maradás.** A cél a platform-kompatibilis, moderálható kiadás (itch.io, Steam). A **tartalom-erősség csúszka** (Romantikus / Csípős / Meglepetésmentes) azt szabályozza, mennyi dráma és előrejelzés jelenik meg — de a szabályzat alapszabályait egyetlen fokozat sem kapcsolja ki.
3. **Csak felnőtt romantikus szereplők.** Minden romantikában/intimitásban részt vevő karakter felnőtt. A „Nemzedékek" funkcióval született gyerekek a kódban **keményen zárolva** vannak minden romantiikus/intim mechanikából (`flirtezheto()` minden gyerekre `false`-t ad; az igény-modelljükben az Intimitás nem létezik). Nekik csak életszimulációs tartalom jut: alvás, higiénia, játék/tánc, tanulás és felnövekedés.
4. **Állatok és fantázialények.** Háziállatok társasági moodleteket adnak (M3+), sosem intimitás-célpontok. Fantázialények (idegenek, misztikus lények) a késői korszakok NPC-frakciói — komikus diplomácia, nem romantiikus tartalom.
5. **Valós személyek.** Nem használunk valós, azonosítható személyeket sem néven, sem megjelenésben.

## 2. Miért ez a keret?

A játék felnőtt témát (szerelem, intimitás, féltékenység, születés) úgy kezel, ahogy a legjobb életszimulátorok: **humoros, közvetett, emberi** módon. A fade-to-black nem cenzúra-hátrány, hanem a játék pillere: a fantázia és a krónika-mesélés több élményt ad, mint a explicicitás, és megnyitja a teljes cél-piahot (jogilag differenciált régiók, platform-szabályok).

## 3. Modding-szabály (M4-től)

A modding API tartalmat (szövegek, események, épületek) bővítheti, de:
- a fade-to-black keretet nem kapcsolhatja ki,
- a gyerek-kizárást nem kerülheti meg,
- nem importálhat külső explicit assetet a játék vizuális rendszerébe.

Ezek a szabályok a mod-betöltőben technikailag érvényesítendők, nem csak ajánlások.

## 4. Kivitelezés a kódban

| Szabály | Hely a kódban |
| --- | --- |
| Fade-to-black esemény | `sim.js: intimitasInditasa()` → `kimenet {tipus:'intimitas'}` → `main.js: fenekesSzoveg()` |
| Gyerek-zárolás | `sim.js: kompatibilitas()` (−100) és `flirtezheto()` |
| Tartalom csúszka | `vilag.beallitasok.tartalom` → szövegválasztás és szorzók az `intimitasVege()`/`feltekenysegVizsgalat()`-ben |
| Szaporulat-határ | `vilag.beallitasok.nemzedek` kapcsoló + 30 lakós faluhatár |
