# Skaar Uverkhron

A turn-based strategy game across the Mbaru Tatu, for Flake Games. You lead the
**Duskareth**, who follow the Nekh'Vorran, across Velki, Xikia, Leotik and their
moons. Pure HTML, CSS and JavaScript like the rest of the site, with no build step,
and every picture drawn in code.

Open `skaar-uverkhron/index.html` (or pick **Skaar Uverkhron** on the Flake Games
home page). On the live site it asks you to sign in like the other main games. On
`localhost`, or with `?guest=1`, it runs without an account and saves in the browser.

`DESIGN.md` records every design decision. This file covers how to play and how
the game is built.

## How to play

- **Win** by taking every rival's towns. Some games and maps use another goal: the
  *prophecy* (win battles in the eye of the storm), the *treasury* (gather gold),
  or *the seat* (hold a named town for a week).
- **The map has four layers:** Velki, Xikia, Leotik and the Kalo (the moons). Switch
  layers with the buttons on the right or the keys 1–4.
- **Moving:** click an army, click a place to see the path, then click again to go.
  Green arrows mean you get there today, red means later days, and ⚔ means a fight.
  Right-click anything to learn about it. Drag to look around, and scroll to zoom.
- **Urverk** are the portals between the worlds. Some open only when the worlds line
  up (hover to see when). Some are kept by families who charge a toll; pay three
  times, or clear the wild creatures near them, and you pass free. Some crossings are
  dangerous: you may lose troops, come out somewhere else, or meet rogue Duskareth.
  You can take a family's Urverk by force, but if you're careless (without
  Diplomacy 2) everyone who knows its trigger may die. A dead Urverk can be revived
  through a seer's quest.
- **Heroes** are generals. They don't fight; they direct their army and sing. Hire
  them at a tavern, then train them at the town's training halls: each hall teaches
  4 skills and offers 2 at random, 2 lessons a day, and a hero can't leave town until
  they have 5 basic skills. Up to 5 heroes can be out on the map at once, and any
  number can stay inside a castle (choose one as the defending general). Leveling up
  raises one stat at random, and you pick one of two skills to raise.
- **Squadron captains** are Dearcàn who each lead a little group of stacks.
  A squadron can go out without a hero: it can take mines and pick up resources and
  gold, but it can't take towns or carry Relics. In battle, captains stand in front
  of their squadron and fight. If one falls, the squadron loses heart.
- **Memory cores:** a fallen hero is gone for good and leaves a core. Whoever picks
  it up sees 5 of its skills and chooses 2 to use (change them any time out of
  battle). The pouch holds 3 cores. At a **Kalo Shrine** (only on the moons), the
  **Kahizecvar** makes 3 skills from one core yours forever and uses up the core.
  You can do it once per shrine, and each one costs twice as much as the last.
  Captain cores go to a Memory Vault to make a new captain with the fallen one's
  abilities.
- **Food** feeds your armies and towns. Hungry armies lose morale, then desert.
  Population grows with food, and some buildings need people to work them.
- **Morale** is per stack: being fed, heavy recent losses, captains, Command and
  Heartening all affect it, and it changes how soon a stack acts. **Luck** sometimes
  spares a stack from a blow. Bad luck can make some of a stack trip on their own
  blades.
- **The Sunear'Zikhron** wanders the Tatu. Inside it, movement slows, production
  halves, the fog comes back and RubberMcFly gather (killing one is bad luck). It
  must touch every part of a Tatu before passing through the Duat to the next. **Win
  a battle in its eye** to unlock the **Nekh'Vorran**: one per castle.
- **Weeks** are 6 days, and day 4 is **market day**: travelling sellers and fairs
  (bet on punk races and Dya'Akara matches). A month is 42 days. Weeks and months
  bring events.
- **Keys:** E end turn · N next army · H hero · K kingdom · Q map songs · Z sleep ·
  1–4 layers · arrows to look around. In battle: W wait · D defend · S sing.

## Modes

- **Against the computer:** easy, normal, hard or brutal.
- **Same device:** people take turns, and the map hides between turns.
- **Online** (signed in): make a room, give friends the 5-letter code, and fill any
  seat with the computer. Play live, or take your turn whenever you like. There's an
  optional turn timer. When someone attacks you on their turn, the computer fights
  for you.
- **Map editor:** paint terrain, trees and roads on all four layers. Place towns,
  starting towns, mines, treasure, places to visit, linked Urverk and wild groups.
  You can also start from a random map. Save maps in the browser, play them, or
  share them. Shared maps appear for everyone after an admin approves them
  (Admin Panel → Skaar Uverkhron → Shared Maps).

## How it's built

| File | What it holds |
|---|---|
| `js/core.js` | the namespace, the seeded random number generator, noise, the hex grid |
| `js/data.js` | every number and name: resources, terrain, creatures, captains, skills, songs, Relics, buildings, map objects, events |
| `js/state.js` | the shape of a game, occupancy, fog, compact save format |
| `js/make.js` | factories: heroes, captains, cores, towns, armies, wild groups, players |
| `js/mapgen.js` | the random map generator (land follows the directions: north Fti, south Su, west Eldi, east Ular) |
| `js/rules.js` | the adventure-map rules: paths, visiting, towns, tavern, training, cores, Urverk, the storm, the days |
| `js/battle.js` | the battle engine (no drawing), its computer player, and writing results back |
| `js/ai.js` | the computer players on the map |
| `js/art.js`, `js/art_objects.js` | all the pictures: terrain, trees, creatures, people, objects, icons |
| `js/view_map.js` | the map on screen: baked ground chunks with organic borders, fog, storm, paths, input |
| `js/view_town.js` | the town screen |
| `js/view_battle.js` | the battle screen |
| `js/ui.js`, `js/dialogs.js` | the side panel, top bar, and every window |
| `js/save.js` | saves in the browser and on the account |
| `js/editor.js` | the map editor and map sharing |
| `js/online.js` | online rooms |
| `js/main.js` | the title, new-game setup, turn flow, battles and the menu |

Everything up to `ai.js` runs without a page, and `tests/test_su_engine.js` plays
computer-against-computer games under node (it's part of `npm test`).

**Account data** (`dya_config` rows):
- `su:<account>:<slot>`: saved games
- `su_rooms:<account>`: the rooms a player is in
- `su_room:<code>`: an online game
- `su_map:<id>`: a shared map, waiting for or given approval
