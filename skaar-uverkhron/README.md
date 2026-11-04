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
  Right-click anything to learn about it (the info stays up until you click). Drag to
  look around, and scroll to zoom. The **Key** button explains army-size words (A few
  1–4, Several 5–9, A pack 10–19, Lots 20–49, A horde 50–99, A throng 100–249, A swarm
  250–499, Zounds 500–999, A legion 1000+), the marks on paths and the ground.
- **Meeting:** with an army picked, click another of your armies to walk over and
  trade stacks, captains, Relics and memory cores. A squadron can join a hero's army.
  Shift-click picks the other army instead.
- **The side bar** (as in the old games): hero and squadron portraits with movement and
  Breath bars on the left, your towns on the right; below, the stacks of whatever you
  picked. Right-click any castle to see its garrison.
- **Watching:** the computer's armies walk where you have seen the land, and the view
  follows them.
- **Towns:** a slim row of buttons; each one, or a click on a building, opens a full page
  for that one thing. Dwellings have their own recruiting page.
- **Close up:** double-click (or right-click) a creature to see its card, and upgrade
  it there when the town can. Clicking a building to build opens its close-up: the
  picture, what it does, what it needs and what it costs.
- **Urverk** are the portals between the worlds. Some open only when the worlds line
  up (hover to see when). Some are kept by families who charge a toll; pay three
  times, or clear the wild creatures near them, and you pass free. Some crossings are
  dangerous: you may lose troops, come out somewhere else, or meet rogue Duskareth.
  You can take a family's Urverk by force, but there is a 50% chance everyone who
  knows its trigger dies (5% less for each level of Diplomacy). A dead Urverk can be revived
  through a seer's quest.
- **Heroes** are generals. They don't fight; they direct their army and sing. Hire
  them at a tavern, then train them at the town's training halls: each hall teaches
  4 skills and offers 2 at random, 2 lessons a day, and a hero can't leave town until
  they have 5 basic skills. Up to 5 heroes can be out on the map at once, and any
  number can stay inside a castle (choose one as the defending general). Leveling up
  offers two stats and two skills: you pick one of each.
- **Squadron captains** are Dearcàn who each lead a little group of stacks: two to
  start, more with Captaincy and some abilities. A very rare *peerless*
  captain is far stronger but leads only one.
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
  Towns feed themselves except in a week of famine. People come and go a little
  every day; only spare food makes the
  population grow faster. Some buildings need people to work them.
- **Mounts:** heroes ride Domestic Punks (a rare few win a Kuni Byrd). Herds of wild
  punks can be corralled home to the farmers, and bought back at the town's paddock
  as mounts: an army with a punk for every stack travels further. Nobody rides in
  battle.
- **Morale** is per stack, out of 100, and 60 is steady: being fed, heavy recent
  losses, captains, Heartening and some Relics all move it. High morale rolls damage
  nearer the top of the range, low nearer the bottom; very low morale slows a stack
  and can freeze it. A captain's fall costs his squadron about 20.
- **In battle** you see every blow: the attacker lunges, the target reels and flares,
  and numbers change as the blow lands. A stack that dies topples over and its bodies
  stay where it fell. The song **Rekindle** (tier 3) raises some of a fallen stack
  from its bodies, if nothing stands on them.
- **Shooters** do double damage with exactly one hex between them and the target,
  and can't shoot when an enemy is next to them. **Luck** sometimes
  spares a stack from a blow. Bad luck can make some of a stack trip on their own
  blades.
- **The Sunear'Zikhron** wanders the Tatu. Inside it, movement slows, production
  halves, the fog comes back and RubberMcFly gather (killing one is bad luck). It
  must touch every part of a Tatu before passing through the Duat to the next, and
  its size and speed change from day to day (extremes are rare). It refills the
  Breath of heroes inside it and washes buried memory cores out of the ground.
  **End a turn in its eye** for a vision of where the **Rokarvac of the Nekh** lies,
  under guard. It is never used up: while a hero carries it into one of your towns,
  that town can build the Nekh Hollow, and the **Nekh'Vorran** can be recruited
  weekly.
- **Weeks** are 6 days, and day 4 is **market day**: travelling sellers, creatures
  and captains from outside the factions, and fairs (bet on punk races and
  Dya'Akara matches). A month is 42 days. Weeks and months
  bring events.
- **Growing towns:** towns grow about 7% a week, up to 17% with food to spare. Take
  **villages** on the map (guarded, flagged like mines): each sends 30 settlers a week
  to your nearest town. **Travellers** settle in a town some weeks (more often with a
  tavern). Hold a **Feast** in a town once a week (1000 gold, 60 food) and 8% more
  people (at least 25) come to stay. Build homes to make room for them.
- **Where you can go:** point at any spot and the frame says it plainly: green (reachable
  today), gold (a few days away), orange ⚔ (the way passes a wild guard: you will stop and
  fight), red ✕ (you cannot go there). The bar at the bottom says why: water, mountains,
  thick woods, the body of a building (go in by its entrance, which is marked), land you
  have not explored, or something lying in a narrow gap. **Show the way** (G) shades
  everything the picked army can reach today and stripes what blocks it.
- **Keys:** E end turn · N next army · H hero · K kingdom · Q map songs · Z sleep · G show the way ·
  1–4 layers · arrows to look around. In battle: W wait · D defend · S sing.

## Modes

- **A new game** opens a full screen: pick a random map or a made map (filter by
  size, see all four layers), the difficulty (Wanderer 80% to Elster 200%: it sets
  your starting stores, from 25,000 gold down to 3,000, and the computer's level), and for each player their colour,
  who plays, faction, starting hero, starting bonus (gold, resources or a Relic) and
  team. The random map generator has five sizes (Small to Gigantic), water, wild
  creatures, where players start (anywhere, one Tatu each, or all on Velki), the
  storm on or off, the goal, and a seed with a preview. **Play the starter map** on
  the title is one click.
- **Against the computer:** easy, normal, hard or brutal; each computer player also
  draws a personality for the game (conqueror, raider, builder, explorer, turtle).
- **Same device:** people take turns, and the map hides between turns.
- **Online** (signed in): make a room, give friends the 5-letter code, and fill any
  seat with the computer. Play live, or take your turn whenever you like. There's an
  optional turn timer and a chat for the room. **The computer never fights for a
  person:** when someone attacks you, the battle waits for you to come, and you
  play your own side on your own device (both devices run the same battle; only
  your choices travel). The attacker can call it off while waiting.
- **Saving and loading** shows your saves beside a picture of the map, the day,
  the difficulty, the goal and every player.
- **Your records** (on the title): your solo games against the computer, with a
  score and a title for each win, your bests by difficulty, and your fastest win.
  There is no leaderboard.
- **Map editor:** paint terrain, trees and roads on all four layers. Place towns,
  starting towns, mines, treasure, places to visit, linked Urverk and wild groups.
  You can also start from a random map. Save maps in the browser, play them, or
  share them. Shared maps appear for everyone after an admin approves them
  (Admin Panel → Skaar Uverkhron → Shared Maps).

## The Elsha'ryn (the second faction)

The luminous forest, who follow the Vyrenalur. Trackers of memory and grow-forgers,
mostly Eikar and Kalo'Eik. Their towns stand in deep woods and are laid out their own
way: the Root Hall is a great tree off to one side, reached by stepping stones past a
pond, inside a low thorn hedge. Every building has its own Elsha'ryn name and look: the
Hollow Stump (tavern), the Barter Ring (market), the Singing Tree (songs), the Nut Store,
Fruit Gardens, Deadfall Yard, Mossrock Cutters, Gathering Glade, Spear Ground, Trailpost,
Tally Stump, Canopy Lodge, Starwell, Willow Pens and Root Vault. Their captains are
Ju-Keepers, Grovewardens and Memory Trackers.

| # | Creature | Upgrade | What it does |
|---|---|---|---|
| 1 | Sprengju | Nur Sprengju | Little flying carrots that burst on contact (the attackers are spent; nothing strikes back). Under a **Ju-Keeper** captain they ride in a pouch and are loosed in volleys like arrows. Half of all spent Sprengju come back after the battle. |
| 2 | Spear Eikar | Grovewarden Spears | Plain, steady spears. |
| 3 | Stryx | Old Stryx | A wide, flat mesa of stone in three stepped tiers, mossy on top, glowing seams in its flanks and whipping vines. Throws rocks and never moves; just as strong up close, and binds (cannot move) whatever it strikes up close until the Stryx dies or a song moves it. |
| 4 | Albali Byrd | Albali Elder | A round ball of cream feathers with big eyes and wide wings, and one bone-white horn in a glossy healing film. Flies; instead of attacking it can restore the health of an ally beside it (it raises nobody). |
| 5 | Tonguatjis | — | Shelled; its tongue strikes from two hexes away and drags its prey in. |
| 6 | Saklay'Punk'Eik | — | Eikar archers on Domestic Punks: move and then shoot, and shoot even when engaged. |
| 7 | Api Buta | — | The Blind Beast, a huge basalt slug (4×2 hexes, the biggest of the faction): fire breath scorches the one behind its prey; blind (sight powers do not touch it), fireproof. |
| 8 | Sru Vorn | — | The top of the town, one a week. Once a battle, on a random early round, digs a hidden acid bog: enemies who step in burn and are stuck for a turn. |
| 9 | The Vyrenalur | — | Light Shadow: a towering stag of shadow dappled with light, with a crown of antlers of pure light. Every other round it slips into shadow (nothing can target it); its charge is a line of light; its trail glows for three rounds and heals Eikar in it. Kipsu come out of the woods to follow it as their own stack. |

**Their powers:**
- **Memory tracking:** they see every memory core, buried ones too, and can pick up the
  buried ones. The **Memory Tree** shows where every rival hero last fought.
- **Grow-forging (Growing Altar):** grow Glowmoss (Fti), Timber (Eldi), NgAkara (Su) or
  Stone (Ular) onto a Relic over three days; its bearer's army fights at home on that
  element's ground anywhere.
- **Grove songs (Protected Grove):** Grovelight and Rootsnare work only in battles near
  your Groves; a hero who goes too far forgets them.
- **The Oath (Oath Tree):** Changed stacks are stronger (a quarter more health, +2 attack
  and defense) and bound by oath: if their hero surrenders, or they are dismissed, the
  forest takes them as a wild Stryx thicket.
- **The Vyrenalur's trail:** each week three glimmers appear in the woods (only you see
  yours); reach all three in one week and find the **Shed Antler**, which lets a town
  build the Clearing of Light while it is there. Ending a turn in the eye of the
  storm also gives a vision of where one lies (each people is shown its own relic:
  the Duskareth the Rokarvac of the Nekh, the Elsha'ryn a Shed Antler).

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
| `js/saveload.js` | the save and load screens |
| `js/pregame.js` | the new-game screen and the random map options |
| `js/records.js` | your records from solo games |
| `js/editor.js` | the map editor and map sharing |
| `js/online.js` | online rooms, battles between people on two devices, the room chat |
| `js/main.js` | the title, turn flow, battles and the menu |

Everything up to `ai.js` runs without a page, and `tests/test_su_engine.js` plays
computer-against-computer games under node (it's part of `npm test`).

**Account data** (`dya_config` rows):
- `su:<account>:<slot>`: saved games
- `su_rooms:<account>`: the rooms a player is in
- `su_room:<code>`: an online game
- `su_map:<id>`: a shared map, waiting for or given approval
- `su_fight:<code>`: a battle between two people in an online game (the game as it
  was when the battle began, and each person's choices)
- `su_chat:<code>:<time>`: one chat message in an online room
- `su_rec:<account>`: your records from solo games
- `su_balance`: creature numbers and building costs changed in the Admin Panel
  (Admin Panel → Skaar Uverkhron → Creatures & Costs); the game loads them before
  any game starts
