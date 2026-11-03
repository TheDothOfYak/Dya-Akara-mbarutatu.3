# Skaar Uverkhron — Design Document

A turn-based fantasy strategy game set across the Mbaru Tatu, for Flake Games.
Working title: **Skaar Uverkhron** ("the greatest factions").

This file records what has been **decided**. Anything not written here is still open.
It is a game in the hero-strategy genre (armies of creature stacks, towns, an
adventure map, turn-based battles), but every faction, creature, skill, song,
building, Relic, number and screen is our own, built from the lore of the
Mbaru Tatu (`js/data/lore.js`). The token game Dya'Akara is **not** part of
this game (it may appear later as a special event).

---

## 1. The big picture

- **Where it lives:** on Flake Games, with the one Flake Games account and cloud saves.
- **Look:** mostly 2D, semi-3D (depth and perspective in the town screens and map),
  in the art style of the other Flake Games games. Clear and readable at a glance.
- **Players:** 2–6 per map, with teams. Play against the computer, on the same
  device (taking turns), or online — online both live (everyone on at once) and
  turn-whenever-you-like.
- **Winning:** conquer everything. Some maps have special win conditions.
- **Time:** one turn is one day. Weeks have weekly events, and the middle day of
  each week is a **market day** (fairs, deals, shops open only that day).
- **Scope:** as deep as the biggest games of the genre. Built in playable stages.
- **First version:** one faction, the **Duskareth**. Every player and the computer
  are Duskareth until the second faction arrives.

## 2. The map: three Tatu and their Kalo

- The map has **four layers**: **Velki**, **Xikia**, **Leotik**, and **the Kalo** (moons).
  A button toggles between the layers.
- All three Tatu are in every game from the start.
- **The Kalo layer:** moons cannot be reached from one another. Each one is reached
  only by its own specific Kalo Urverk. Moons are hard to reach and rare.
- **Maps** can be hand-made in a **map editor** or made by a **random map generator**.

### Urverk (portals)
- Urverk work as portals. Some work only when the worlds are in certain positions;
  others work in any position. Hovering over (or right-clicking) an Urverk shows
  when it can next be used. There is no sky clock on screen.
- **Dangerous crossings:** some Duat crossings are riskier than others. A bad
  crossing can lose troops, throw the army out at a random place (not necessarily
  near another Urverk), or start a battle with a rogue Duskareth group.
  The Duskareth cross more safely than anyone else.
- **Urverk families:** some Urverk are operated by a family you must pay.
  You can earn their respect, or protect them, and they will let your armies pass.
  You can also conquer them, but do it wrong and you may kill everyone who knows
  the Urverk's trigger. If nobody left knows the trigger, that Urverk cannot be used.

### The Sunear'Zikhron (the storm)
- The storm moves across the map on a completely random path, different every game.
- Staying in the **eye** of the storm is how you unlock creature **#9** (see Towns).

## 3. Resources

| Common | Rare |
|---|---|
| Gold | Stygian (soul iron) |
| Wood | NgAkara (drawn from the head of the Su Naga) |
| Stone | Eldi Aagac timber (fireproof wood from the fire trees) |
| Food | Glowmoss (from luminous forests) |

- **NgAkara:** a Naga ground can be harvested peacefully for a small steady
  supply, or the Naga killed for one big haul, after which that ground is gone.
- **Territory must be kept safe forever.** Wild stacks can retake undefended places.

## 4. Heroes (generals)

- Heroes are generals. They **do not fight** on the battlefield, have no health bar
  and no attack. They direct the troops.
- **Hired at a tavern** (where squadron captains are also hired).
- **Base stats:** Strength, Defense, and two more (to be chosen). Stats can go up
  and down. Relics, armour and other gear affect them.
- **XP:** heroes gain XP from defeating squadrons, wild creatures and groups, and
  from completing quests. **Defeating a hero gives no XP**; you get their memory
  core instead.
- **Death:** a defeated hero dies and is gone for good. A hero can **surrender**.
  Surrendering to the computer has a set cost; surrendering to a real player,
  that player chooses the cost.
- A hero can never be in another hero's army.

### Skills
- Skills have **5 levels**.
- **Hiring a hero:** each hero comes with **one locked base skill**. You then train
  them in **training halls** (town buildings) until they have **5 basic skills**.
  - Each training hall can teach **4 particular skills**. Training offers **2 of them
    at random**; you pick one.
  - A hero may train at the same hall all 4 times.
  - A hall never offers the basic level of a skill the hero already has. If an
    option would be the hero's locked base skill, it is offered as **level 2** of it.
  - A hero can learn **2 skills a day**, and **cannot leave town** until all 5
    basic skills are learned.

### Memory cores
- Every hero always carries a **core pouch**, which is itself a Relic.
  The pouch holds **3 active cores**; a hero can own more cores than that.
- **Picking up a core:** the game draws **5 skills** from the skills that core holds.
  You choose **2 to be active**; the other 3 sit on the bench.
- You can change which skills are active **any time you are not in a battle**.
- The skills only last as long as the hero holds the core.
- With 3 cores: 5 own skills + 3 × 2 active = **11 active skills**, with **9 on the bench**.
- **The Kahizecvar:** at a **Kalo Shrine** (found only on the Kalo layer), a hero merges
  with a core. They keep **3 skills from it permanently**, and the core is destroyed,
  freeing its pouch slot.
  - Permanent skills are **extra** skills. There is **no cap**.
  - Each hero's Kahizecvar costs more than the last (**exponential**), in large
    amounts of NgAkara and Stygian.
  - A hero can do the Kahizecvar **only once per shrine**.
  - The Kalo who keep a shrine sometimes send the hero on a quest first.

### Songs (magic)
- Songs are learned through **skills**, not something every hero has.
- Most songs are **not** attack songs.
- Learned from certain buildings, shrines, cores and other sources.

## 5. Squadron captains and the army

- **Squadron captains** are always one of the **Dearcàn** (Eikar, Keilia, Kalo'Eik,
  Karnen…), never an unthinking beast.
- A captain has **one base skill or ability**, and stats like **morale and luck**.
- Captains **are part of battles**.
- A squadron with a captain can go out into the world **without a hero**.
- Captains can be in a hero's army. The army can move on without its captains.
- **Captain cores:** captains drop memory cores too. A captain core is brought back
  to a town to give a **new captain** all of the old one's stats. It is not used
  for upgrading heroes.
- **Wild stacks** have a leader (or leaders, if the group has several stacks), and
  they drop memory cores.

### Army structure (proposed, being refined)
- A hero (general) has **5 slots**.
- A slot can hold a single creature stack, or a **squadron captain**, who then
  commands more stacks under them (2, 4, or more, depending on the captain).
- **#9 creatures** (such as the Nekh'Vorran) cannot be placed under a captain.
- Some higher-level creatures take up **two slots**.

## 6. Towns

- Each town has **9 creatures**.
  - Creatures **1–4** have upgrades. Creatures **5–8** do not.
  - Creature **#9** is the legendary one: **one per town**, and **only one per stack**.
    Four towns means up to four #9s.
- **Unlocking #9:** staying in the eye of the Sunear'Zikhron unlocks **one species**
  of #9 at a time. If all your towns are the same faction, that unlocks it for all of them.
- **Town screen:** a semi-3D picture of the town; click buildings to build and use them.
- **The Duskareth's 9 creatures:** to be designed (next).

## 7. Factions

| Faction | Follows | Special art |
|---|---|---|
| **Duskareth** (first) | the Nekh'Vorran | The Duat |
| SkarValorin (later) | the Aerolhorn | The Great Anvil (they still hold it at this point in history), and the Aerolhorn |
| Elsha'ryn (later) | the Vyrenalur | Grow-forging, and the oath-breaking transformations |

## 8. Battles

- Turn-based tactical battles on a grid.
- **Elements:** a creature fights a little better on ground of its own element and
  is **never weaker** anywhere ("comfort, never weakness").
- Approach direction on the map does **not** affect battles.
- **No auto-battle.**

## 9. Quests and events

- Quests can be almost anything: from Kalo, families, towns, map characters.
- Weekly events each week; a market day on the middle day of each week.
