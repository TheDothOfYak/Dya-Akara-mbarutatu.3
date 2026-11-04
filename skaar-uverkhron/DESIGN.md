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
- **Devices:** made for computers and tablets. Phones can view it but it isn't built
  to be played there.
- **Art:** drawn in code, in the style of the other Flake Games games but much more
  detailed and smooth (not blocky): clear and readable like the classics of the genre.
- **Players:** 2–6 per map, with teams. Play against the computer, on the same
  device (taking turns), or online — online both live (everyone on at once) and
  turn-whenever-you-like.
- **Winning:** conquer everything. Some maps have special win conditions.
- **Time:** one turn is one day. A **week is 6 days**; day 4 is **market day** (fairs,
  deals, shops open only that day, betting on punk races, Dya'Akara matches and other
  shows: watch and bet, never take part). A **month is about 40 days**, with monthly
  events.
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
  Everyone can use the editor and share maps; shared maps must be approved first.

- Ships: oceans can be sailed. Armies of fliers can cross water and mountains only if
  the hero or captain can fly too. A hero's **mount** can be changed (a Kuni Byrd is
  very rare).
- A mine can be guarded with a stack.

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
  the Urverk's trigger. If nobody left knows the trigger, that Urverk cannot be used
  until it is found again through a (difficult) quest.

### The Sunear'Zikhron (the storm)
- The storm moves across the map on a completely random path, different every game.
  It must touch every part of a Tatu before passing through the Duat to the next. It
  skips the moons.
- Where it is: movement slows, low ground floods, the fog comes back, RubberMcFly are
  far more common (and can be killed by accident), and production there is **halved**
  for the day.
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
- **Food** feeds armies (upkeep), recruitment and towns. Every creature eats; bigger
  creatures eat more; hungry armies lose morale.
- **Population:** a bigger town means a better economy, more troops to recruit and
  more people for jobs. Some buildings and upgrades need a certain population. Food
  and morale matter most for population growth.
- **Territory must be kept safe forever.** Wild stacks can retake undefended places,
  and sometimes attack a guarded mine anyway.

## 4. Heroes (generals)

- Heroes are generals. They **do not fight** on the battlefield, have no health bar
  and no attack. They direct the troops.
- **Hired at a tavern** (where squadron captains are also hired).
- **Base stats:** **Strength** (adds to every creature's attack), **Defense** (adds to
  every creature's defense), **Stride** (how far the army moves each day) and
  **Cunning** (who moves first in battle, and how much you can see of enemy armies).
  (Command and Zikhron were dropped: morale comes from skills, captains and Relics;
  a hero's Breath grows with their level.) Stats can go up and down. Relics, armour and other gear
  affect them.
- **Heroes on the field:** at most **5 heroes out on the map** per player. Inside a
  castle a player may keep as many as they like, but must choose which one is the
  **defending general**.
- **Peoples:** a hero's people (Eikar, Keilia, Kalo'Eik, Karnen…) and the hero
  themself can give a better buff to certain creatures.
- **Leveling up** offers two stats and two skills; you pick one of each.
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
  - **Training costs gold**, and is only for heroes who have not yet filled their
    5 basic skills.

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
- Most songs are **not** attack songs. There are many small basic songs in tiers
  (1st, 2nd, 3rd and up), and rarer bigger ones.
- Learned from town buildings, shrines, cores, scrolls, the Kalo and market days.
- Songs are fuelled by **Breath**: it refills a little each day and fully in a town;
  eating food also refills it. Squad captains and some creatures sometimes sing on
  their own, but nothing big.
- Not in the game: Echo, and anything that makes a single stack retreat (stacks
  never retreat on their own).
- **Stamijan's Reach** (map): pull one of your squadrons to the hero.
- **Stygian Link**: split a **common** Relic between two heroes. Only common Relics.

## 5. Squadron captains and the army

- **Squadron captains** are always one of the **Dearcàn** (Eikar, Keilia, Kalo'Eik,
  Karnen…), never an unthinking beast.
- A captain has **one base skill or ability**, and stats like **morale and luck**.
- A squadron with only a captain **cannot capture towns** and **cannot pick up
  objects** (no pockets). It **can** capture mines and pick up resources and gold.
- Enemy captain cores can be used: bring the core to your own town and make a captain
  from it.
- Captains **are part of battles**.
- A squadron with a captain can go out into the world **without a hero**.
- Captains can be in a hero's army. The army can move on without its captains.
- **Captain cores:** captains drop memory cores too. A captain core is brought back
  to a town to give a **new captain** all of the old one's stats. It is not used
  for upgrading heroes.
- **Wild stacks** have a leader (or leaders, if the group has several stacks), and
  they drop memory cores.

### Army structure
- A hero (general) has **5 slots**. A single stack only ever takes **one** of these.
- A slot holds a single creature stack, or a **squadron captain**, who commands more
  stacks under them (how many depends on the captain and their perks).
- **#9 creatures** (such as the Nekh'Vorran) cannot be placed under a captain.
- Some big creatures take **two of a captain's slots**. Slots are not hexes: a
  creature can take one slot but two hexes on the battlefield.
  - **Harkal:** 1 slot, 2 hexes. **Xiw'Eik:** 2 slots, 2 hexes wide.
    **Lutut:** 2 slots, 2×2 hexes. **Nekh'Vorran:** 6 hexes long and 2 wide
    (never under a captain).
- **Heroes ride Domestic Punks** (pumpkin-and-vine beasts), or a Kuni Byrd if
  they win one.
- Some captains can keep certain troops as **reserves** that step in during battle.

### Morale and luck
- **Morale is a real thing:** lots of factors affect it, mostly survival rate (how many
  of a stack died recently) and being fed. Morale is **per stack** and changes that
  stack's speed in battle (Cunning does the same for the whole army).
- **Good luck:** a stack hit while lucky takes less damage (fewer die).
- **Bad luck** is much rarer: while moving, some of a stack can trip and fall on
  their own swords.

## 6. Towns

- Towns are **castles** (walls, gates, towers; sieges).
- **One building per day**, but some small ones allow two, and a high enough
  population (especially many Keilia) allows more.
- Each castle can build a **shipyard**.
- No creature dwellings out on the map for now, but wild punks and other herds can be
  found and **domesticated or bred**.
- A captain can defend a town without a hero.
- Each town has **9 creatures**.
  - Creatures **1–4** have upgrades. Creatures **5–8** do not.
  - Creature **#9** is the legendary one: **one per town**, and **only one per stack**.
    Four towns means up to four #9s.
- **Unlocking #9:** **winning a battle inside the eye** of the Sunear'Zikhron unlocks
  **one species** of #9 at a time. If all your towns are the same faction, that unlocks it for all of them.
- **Town screen:** a semi-3D picture of the town; click buildings to build and use them.
### The Duskareth's 9
1. **Malsti Punk:** very weak attack, hard to kill, may steal gold when attacking. Melee.
2. **Velnurthaliths:** Eikar, Keilia and Karnen with spears, swords or axes. Melee.
3. **The Ver (Thar Norvek):** ranged; sometimes release creatures from the Duat.
4. **Harkal:** the Su shark. Doesn't need water but cannot fly. Melee.
5. **Kalo'Eik of the Duskareth:** melee, lots of health, little attack. With a
   **Naelst Velki** captain in the army, they can teleport single-slot stacks anywhere
   within the Kalo'Eik's movement range.
6. **Tyndael:** ranged, flying.
7. **Xiw'Eik:** children of the Xiw and the Eikar: acorns with devil wings and horns.
   Songs of chaos. Melee, flying.
8. **The Lutut:** the big terrors of the sky. Flying, mostly melee; in a siege they
   throw boulders at the walls.
9. **The Nekh'Vorran.**
(1–4 have upgrades; 5–9 do not.)

## 7. Factions

| Faction | Follows | Special art |
|---|---|---|
| **Duskareth** (first) | the Nekh'Vorran | The Duat |
| SkarValorin (later) | the Aerolhorn | The Great Anvil (they still hold it at this point in history), and the Aerolhorn |
| **Elsha'ryn** (second, built) | the Vyrenalur | Memory tracking, grow-forging, Grove songs, the Oath (see README) |

## 8. Battles

- Turn-based tactical battles on a hex grid, bigger and a little more zoomed out than
  the genre usual, with **no scrolling**.
- **Captains stand on the field as their own fighter, in front of their squadron**, so
  armies stand in little groups, not one straight line.
- Stacks of the same creature in one squadron fight as **one combined stack**.
- **Elements:** a creature fights a little better on ground of its own element and
  is **never weaker** anywhere ("comfort, never weakness").
- Approach direction on the map does **not** affect battles.
- **No auto-battle.**
- Online turn timers are optional.

## 9. Quests and events

- Quests can be almost anything: from Kalo, families, towns, map characters.
- The story campaign will be designed later.
- Weekly events each week; a market day on the middle day of each week.

---

## 10. Choices made while building, and what was decided since

Every number here is easy to change (and creature numbers and building costs can be
changed from the Admin Panel without touching the code).

- **Upgrades for creatures 1–4:** Blinkback Malsti, Velnurthalith Oathguard,
  Thar Norvek Elder, Scarred Harkal (names kept for now). One figure stands for
  each stack in battle.
- **Wild groups** are led by rogue Dearcàn captains, except pure beasts with no
  leader: the Ular Naga (a four-legged, many-headed earth Naga, 2×2 hexes, bites
  two foes at once), Su Naga, RubberMcFly and the wild punk herds. Kuni Byrds are
  never wild: a hero with Beastmastery 3 can win one at a Kuni Byrd Aerie as a
  rare mount.
- **Buildings:** Muster Hall → Hall of Dusk → Duskhold Seat; Palisade Keep → Stone
  Citadel → Duskwall Bastion; Tavern, Market, Granary, Farms, Terraces, Hall of Songs
  (I–III) → Stygian Choir, Memory Vault, Shipyard, Duat Gate, Stygian Well, Vel
  Sanctum, six training halls, and the nine dwellings.
- **A month is 42 days** (seven 6-day weeks).
- **Captains** lead 2 stacks to start; Warcaller and Captaincy add more. They are tough
  (160 health and more with level) and hit like a small stack. When one falls, troops
  with no room left in the army march home to the nearest town instead of deserting.
- **Heroes** always come with a captain leading a stack, and a second stack.
  A very rare *peerless* captain (about 1 in 80) is far stronger but leads only one.
- **XP and levels:** beating a hero's army gives half the usual XP for the creatures
  killed. Each level offers two stats and two skills; you pick one of each.
- **Morale** is out of 100, 60 is steady. It skews damage rolls (high toward the top
  of the range, low toward the bottom); below 35 a stack slows, below 25 it may
  freeze. A captain's fall costs his squadron 20. **Luck** runs −3 to +3.
- **Shooting:** double damage with exactly one hex between shooter and target, half
  beyond 10 hexes, none when an enemy is adjacent. The battle grid stays hexes.
- **The Kahizecvar** costs 5000 gold and 10 of every other resource, doubling each time.
- **Urverk families** give free passage after you pay three times, or after you clear
  wild creatures near their Urverk. Taking one by force: a 50% chance that everyone
  who knows the trigger dies, 5% less per level of Diplomacy.
- **The Nekh'Vorran:** end a turn in the eye of the storm and your hero has a vision
  of the Rokarvac of the Nekh, lying under a strong guard somewhere on the map. It is
  a blueprint, never used up: while a hero carries it in one of your towns, that town
  can build the Nekh Hollow. The Nekh'Vorran is then recruited weekly.
- **The storm** changes its size, eye and speed from day to day on a bell curve
  (extremes are rare but happen). It refills Breath and washes buried cores up.
- **Food** is balanced so towns go hungry only in a week of famine; only spare food
  speeds population growth. Herds can be corralled home and bought back as mounts
  (mounts are for travel only).
- **Market day** brings creatures and a captain from outside the factions.
- **Ways to win** besides conquest: the prophecy (win 3 battles in the eye), the
  treasury (200,000 gold), or the seat (hold a named town for a week). The game ends
  when every person is out.
- **Starting:** random starts, kept apart; with three players, one on each Tatu.
  Five difficulty levels (Wanderer, Ahoac, Captain, Onnar, Elster) set a person's
  starting stores and the computer's level; a starting hero and a starting bonus are
  chosen before the game.
- **Five map sizes:** Small, Medium, Large, Extra large, Gigantic.
- **Computer personalities:** each computer player draws one for the game
  (conqueror, raider, builder, explorer, turtle).
- **Online:** the computer never fights for a person. An attack on someone on
  another device waits for them; both devices run the same battle and only the
  choices travel. Rooms have a chat.
- **Records:** only personal records for solo games; no leaderboard.
- **Meeting:** click another of your armies to walk over and trade (stacks, captains,
  Relics, cores); a squadron can join a hero's army whole.
- **Population** changes a little every day.
- **Tiers:** each tier is a big step up. Tier 8 (the Lutut) is the top of the town: very
  strong, very costly, and exactly one a week.
- **Balance (in the spirit of the old games):**
  - Worth for gold climbs with tier: a tier 8 creature gives about 40 times what a
    tier 1 does for each gold, tier 9 about 150 times. Both factions match within
    about 15% at every tier.
  - Tiers 1–6 cost gold alone; tier 7 one rare; tier 8 (3,500 gold) two; tier 9
    (10,000 gold) nine.
  - A full week of upgraded troops costs about 17,000 gold. A town with the top hall
    makes 21,000 a week.
  - Gold Seam 1000 a day; wood and stone mines 2 a day; rare mines 1 a day.
  - The market trades at 125 for wood or stone, 250 for a rare and 40 for food (one
    market gives 45% of that, more with more markets).
  - Dwellings cost the same by tier for both peoples: 500 at tier 1, rising to 15,000
    at tier 8 and 20,000 at tier 9, plus stone and rares higher up.
  - A person's starting stores by difficulty: 25,000 / 15,000 / 10,000 / 7,000 /
    3,000 gold, with common and rare resources to match. The computer starts with
    12,000.
  - Towns grow 5% a week, up to 13% with spare food. The top hall needs 450 people
    and the top walls 400.
  - The computer builds its halls first, trades at the market for what a building
    lacks, and saves for the next building until the week's end.
- **Economy:** halls pay 1000 / 1750 / 3000 gold a day; Woodcutters' and Stonecutters'
  Yards; a Muster Ground recruits from every town's dwellings; recruit everything in one
  click. Corralled punks can be mustered as troops, butchered for food, or put to work
  (cheaper buildings in that town).
- **Rekindle** can raise the enemy's fallen to fight for you only with Songcraft 5.
- **Battles show the blows:** lunges, recoils, deaths after the blow lands, and bodies
  left on the field. **Rekindle** (tier 3 song, 16 Breath) raises fallen stacks from
  their bodies; the computer uses it too.
- **Training** a basic skill costs 100 gold.
- **Looking closer:** right-click anything for its details; double-click a creature for
  its card (upgrade it there in town); buildings open a close-up before you build.
  A Key explains army-size words (A few 1–4 … A legion 1000+), path marks and ground.

## 11. Not built yet

- The SkarValorin, the campaign, and the Dya'Akara special event (on hold).
- The Elsha'ryn's common buildings (tavern, market, halls) still use the Duskareth look
  in their town; the computer does not hunt glimmers for the Shed Antler yet.
- Siege extras: moats, special defenses, siege machines.
- Sound (to be written by the creator).
- An undo button in the map editor, and editing details of placed things (amounts,
  Urverk timings).
- Online battles need both people there at once; an attack on someone who is away
  waits until it is called off.
- The computer doesn't use boats or map songs.
- Balance: every number is untested by people.
