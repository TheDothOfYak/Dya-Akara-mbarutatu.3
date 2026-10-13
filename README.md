# DYA'AKARA
### Token Game of the Mbaru Tatu

The full playable build of Dya'Akara, implemented from the **Master Design Document (Sessions 1–14)**. Zero dependencies, no build step — pure HTML/CSS/JavaScript.

---

## How to Play

**Option 1 — just open it:**
Open `index.html` in Chrome/Edge/Firefox. That's it.

**Option 2 — local server (recommended, avoids any file:// quirks):**
```bash
npm run dev          # serves on http://localhost:8000
# or, with no node at all:
python3 -m http.server 8000
```

**GitHub Codespaces:** open this repo in a Codespace, run `npm run dev`, and open the forwarded port 8000 when it pops up.

**Free permanent hosting:** every push to `main` auto-deploys to two places:
- **GitHub Pages** — `https://<your-username>.github.io/Dya-Akara-mbarutatu.3/` (`.github/workflows/deploy-pages.yml`). Requires Settings → Pages → Source → **GitHub Actions**, once.
- **Firebase Hosting** — `https://<your-firebase-project>.web.app` (`.github/workflows/deploy-firebase.yml`). Requires a one-time `FIREBASE_SERVICE_ACCOUNT` repository secret — see below.

Both serve the exact same static files, so both stay in sync automatically from now on.

<details>
<summary>One-time Firebase Hosting setup (only needed once, by whoever owns the Firebase project)</summary>

Uses a service account key rather than `firebase login:ci` — the CI-token login is deprecated and increasingly gets rejected (401) by Firebase's newer Hosting API.

1. [Firebase Console](https://console.firebase.google.com) → your project → gear icon → **Project settings** → **Service accounts** tab → **Generate new private key**. This downloads a `.json` file — keep it safe, it's a real credential.
2. Open that file in a text editor and copy its *entire* contents.
3. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret** → name it `FIREBASE_SERVICE_ACCOUNT` → paste the whole JSON as the value.
4. Push anything to `main` (or re-run the "Deploy Dya'Akara to Firebase Hosting" workflow from the Actions tab) — it deploys to the Firebase project ID named in `.firebaserc`. Note: a Firebase project's actual ID (what goes in `.firebaserc`, `firebase.json`'s `site`, and the workflow's `projectId`) is not always the same as the friendly name shown in the console — Firebase appends a random suffix if your preferred name was already taken globally. Check the exact `project_id` field in your service account JSON key if the deploy fails with a 403 permission error.
</details>

Create an account (email/password — cross-device when online is configured, otherwise stored locally on your device), and the 14-step tutorial takes it from there: your first token is *you*, sung true as an Eikar. You'll finish the tutorial with exactly **13 tokens and 1,000 gold**, as designed.

**The Admin Panel** lives at `admin.html` on either hosting domain — outside the game UI, as specified. First visit on a given domain sets that domain's admin password (the password, the local Dya'kukull AI population, and local market/tournament flavor are stored per-browser-origin, so github.io and web.app each get their own — but real player accounts, the shared market, and admin's game-content edits are cloud-based via Supabase and identical on both). You are the admin.

## Torcain's Run (3D single-player RPG)

A separate, semi-3D action RPG lives in **`rpg/`** — open `rpg/index.html` (or pick **⛵ Torcain’s Run** on the main menu). It runs on a vendored copy of three.js (`rpg/vendor/`), so it still needs no build step and works offline.

The true beginning, a prologue and two chapters so far, following the lore of the Mbaru Tatu. Your run is saved in the browser at every Nur Lantern and story beat; use **Continue** on the title screen to pick it back up.

Noka has moved to a new mountain and left a riddle. You play **Torcain** (Tanoc, now Stamijan) with **Phorus**, the Kalo’Eik Nur, as your companion.

- **The Beginning: the Last Skyfall (Velki, 307A).** A new run starts where the story does. Tanoc Filugani is thirteen and wants to be an Ahoac. At sunset in Fyrsti’Vilag on Velki, he climbs the spire to watch the Angels (Xwi) and the Snillers fight, blinking in and out of the world beyond the north gate. Then, by your own choice, he walks out of the gate toward it and gets caught in a tear in the air. Everything goes white. He wakes at midday, hatless, in front of the Carpenter’s stall in Fyrsti’Vilag on Xikia (a city with the same name as his own, on another Tatu). Buhkon gives him his first Aagac. An Angel and a Sniller come through after him, and the shockwave knocks the hat off. The battle freezes to stare at him, the Angels curse the Snillers into amulets and leave for good, and the square erupts. Gather six Sniller amulets in Buhkon’s Relic-bound bag and calm (don’t kill) a frightened young Punk. (Snillers are storm-genies: a spinning tornado below the waist, a torso of vine-like tendrils that swoop out into arms ending in loose tendrils rather than hands, and one head with a single cold teal eye.)
- **The Road North (six days, Xikia).** Tanoc and the Carpenter slip out of the city and walk north. Day one crosses the low country: a family fleeing the city has lost a cart wheel in a field (help them and they give the boy a bun), an amulet hums in a hedge, a Kofi bolts across the road, and at dusk a half-there Sniller drifts over the fields. At the hedge-oak camp Buhkon hands him a fire-stone Relic and a deal: find its trigger before the next town and keep it. Day two climbs into the forest: a great pine has come down across the road (three swings of the hatchet through its thin middle), then the ford's stepping stones over snow-melt (fall in and you're back on the bank, freezing, with Buhkon laughing). Tanoc hunts alone, and the young Punk that has been following them reveals itself and gets a name from you. Day three is rain at camp while the Carpenter explains Zikhron, Stygian and the factions — and that night the amulets hum and a pale Sniller leads Tanoc into the trees to a ring of stones, where it comes apart and leaves an amulet behind. Day four is the mountain pass: a rockslide (watch for the shadows), then a Rodak pack that won’t wait and, once two have fallen, the pack's leader. The fire-stone works on the road (`Q`). Day five is **Beuhk**, where the talk is all of Angels, humming amulets, and a hatless boy in Fyrsti’Vilag. Day six takes the little road west out of town, over the river, and into the trees.
- **The Carpenter’s property — a land of its own.** You leave Beuhk entirely: the little road west crosses the Brightwater on a plank bridge and runs under an arch of old pines, and the property loads. Then you walk the **forest path**: half a kilometre of winding road between walls of pine, a brook with a footbridge, a mossy waystone of the House of Eldi, glowing toadstools. At the top the trees open and the whole of it is below you: the land falls slowly away, a long green slope down to a great lake (nearly a kilometre across) that shines all the way to a dark forest on the far shore. The big house sits partway down, not on any summit — a rich family's house with two wings, a columned porch and a back terrace over the lake — with the workshop, a red barn with a loft, the tower with its outside stair, a woodshed, four big fenced fields, a garden, an orchard, a pasture of Punks, a well and a firepit in the yard, an old tree with a plank platform, a lane down to the old dock and a boathouse, a rocky lookout on the north hill, a hollow at the forest edge, and a dark mouth in the rocks of the north shore. Mountains only to the far south, a long way off; everywhere else the forest just goes on, and the edges are simply where it's too thick to push through. At night the toadstools, the lake and the fireflies glow. Walk east along the path to go back to Beuhk.
- **Indoors.** Walk up to a door and press `E`. Every building on the property opens into its own room, the way houses do in an old Hylian tale — the big house (breakfast on the long table, the house seals over the hearth, portraits, Zikhron story cores among the books, and Tanoc's loft bed up the stair), the workshop (benches, a cold violet stygian anvil, a half-built boat), the barn (stalls, hay, and a loft hideout), the tower (a stair winding up the inside to the empty shelves and the high window), the boathouse and the woodshed. Most cottages in Beuhk open too, each its own room, some with someone at home, a book on the shelf, or a bun in the basket.
- **Chapter I: The Carpenter’s Apprentice (Beuhk).** A new run stays with young Tanoc. He wakes in his loft bed in the big house, finds a humming longevity Relic in the mud by the old dock at the bottom of the slope, and brings it to the Carpenter, who tells him its trigger and teaches him **Nur’Hlyst** (`G`). Then come the dummy drills with a plain carpenter’s hatchet and a glide off the tower, and Beuhk is his to explore. No Duat, no Tukang, no Phorus yet; those come much later in his story.
- *The chapters below follow Torcain years later. They stay reachable from older saved runs, while new runs focus on young Tanoc for now.*
- **Prologue: Beuhk (on Xikia).** Years later, Torcain comes home to Beuhk, a busy farming town where the Carpenter, Buhkon Eldi, once found Tanoc. Buhkon runs you through the controls in his yard, out along the forest path: training dummies, a Duat Strike at a high dummy, a glide off his tower, and finally **Nur’Hlyst** (`G`). Every townsperson has a side quest, and there's a shop, a forge, a hearth and a bounty board. Then fetch a fire seed from the Ember Grove: the Stryx (a pilot far sharper than any Eikar) flies you to the edge of the Ashen Reach, and it's three days on foot and two on wild Punks to Aakalay.
- **Rokarvac I: The Ruins of Aakalay.** Abandoned: no Eikar or Keilia, only a few animals. Recover five singing memory cores and offer them to the Oath Stone, and Torcain falls into the trance for real: as Kiet, in golden memory, he fights the **Kahizecvar duel** against Otlið, the Keilia Master of the Keep. (The Megla Aagac that grew where Otlið fell is only a dark tree now.) The trance shows Kiet and his great Nekh’Vorran Kireo’Nik — and the trigger of the Urverk beneath the stone. Phorus also finds the torn pages of the last journal. They start a run of hard side quests: rind-scarred trees that only answer Nur'Hlyst, then a den guarded by Rodak, and at the end **Skor'Thal** (Dearcineon: *great, ancient*), the peaceful old Punk. Sit with it, don't fight it.
- **Rokarvac II: The Isle of the Urverk (Leotik).** Through the Urverk with Venkin, Duro and Hemla, who follow you from Beuhk — and stranded when it closes. A stormy jungle with acid bogs, the ruins of Villtur and an Albali roost. Wake three Klug pillars, then face **Otlið, Woken**: the Urverk pours the Master's memory into stygian, stolen from a frightened Malsti Punk that goes free once he falls.

**Dya'Akara, in 3D.** The token game is playable inside the RPG, running the same match engine as the 2D game (`js/engine/match.js`) with the full rules: resource pulses, readying tokens, the extra cost for replaying fallen tokens, and carrying the rival's Relic home (or a one-token duel). Torcain stays on the field and throws his tokens; each one unfolds into a holographic creature that can't touch anyone real. Each match picks a scale (Small, Field or Life-size, where the biggest of a species stands at its true size), and big tokens are rare. Challenge Venkin, Sefa or Bosk in Beuhk (the market square is the arena), or Venkin, Kesh or Ila Vos at the Leotik camp. Torcain starts with the tokens he's carried since Velki; win more from rivals, or get Buhkon's Okid'Relic and sing new ones from creature parts (vine, fluff, oil, horn, ember, tusk, a sleeping Punk's shaving, a Malsti stem, and Skor'Thal's rind for one legendary token). The RPG collection is separate from your 2D Dya'Akara account. In a match: `Q`/`E` choose a token, `R` ready it, `1`–`5` pick a readied token, click to throw, `V` for an overhead view, and `Esc` to concede.

**Difficulty** is picked when you start a run:
- **Easy:** forgiving enemies, health regenerates, 5 healing vials, and you keep your shards when you fall.
- **Realistic:** enemies hit about 3.5× harder than on Easy and have nearly twice the health. Attacks, rolls, sprinting and jumping cost stamina. Nothing heals on its own and you get only 3 vials. When you die, your shards drop where you fell, and the wilds respawn whenever you rest. It is built to take several sittings.

**Creatures:** Wild Punks (eyeless, mouthless, walking on the vines that grow from the top), hand-sized Malsti Punks (not aggressive; they blink through the Duat to steal shards), Rodak (they shadow you and attack when you're weak), Kipsu (they steal shards and run), Albali Byrds (they dive from above; their horns paralyse, or poison on Leotik), Duskareth Vel (they throw knives out of the Duat), Tyndael (flying creatures made entirely of flame, whose fire keeps burning on the ground), Kofi (harmless horned furballs that scurry from everything), the legendary Skor'Thal, and the **Sru Vorn** mini-boss. Every creature model was rebuilt from the Esik field notes.

**An open world on a planet.** Xikia and Leotik are worlds, not floating islands. Each region is now open land roughly three times wider, bounded by natural barriers: ridges, cliffs, gorges and deep water. Phorus tells you why you can't go further. The land runs on to the horizon, and a few floating islets drift high overhead as scenery.
- **Beuhk:** the northern Xikia highlands, with Mirrormere, the Brightwater river, pine forests, the Crown Ridge, the Greyfang cliffs and the Sundered Gorge.
- **Aakalay:** the Ashen Reach, with the Oath Mere, the Flooded Quarter, the Russet and Ember Woods, the Ash Flats, the Rend chasm and the Kuni Spire.
- **Leotik:** a real island in a stormy ocean, with a harbour, beaches and sea cliffs, jungle river valleys, the Glass Lagoon, a smoking volcano and distant islands.

**Day and night.** A full day lasts about 18 minutes, from dawn through golden noon and dusk to a starry night with Pia'don's pale band across the sky. All creatures and people are bioluminescent: faint by day, glowing at night.

**The wilds.** Every Esik creature lives somewhere in the world, by biome, and most are rare:
- Uff, Mikolo Moko, Makari swarms, RubberMcFly, Grothyn, Tonguatjis, Stryx and Gynge.
- Very rarely, an Ular Naga, a Lutut or a wild Kuni Byrd.
- Water creatures are only ever in water: Raf Krabbi, Su Grothyn, Harkal and Hvaleia (swimming through the air above the water), and the great Su Naga.

**Ju fields and Sprengju.** Pull Ju (carrots) from the fields. Each region hides one Sprengju Relic Shaving; set it among the Ju and every pulse it wakes two Ju into Sprengju, which fly about the field. Catch them, then eat one for a boon or throw it with `X` and it bursts on impact.

**Albali Aagac.** Oak-sized trees whose ripe fruit falls and, left alone, hatches into an Albali Byrd (tame in Beuhk and Aakalay, Villtur on Leotik). Pick the fruit up before it hatches.

**The Megla Pass.** Like the exits out of Hyrule Field, an old road over the mountains joins Beuhk and Aakalay (*Megla* is Dearcineon for mist, and the road tops out in it). It runs Eldi-ward (west) from Beuhk over the Crown Ridge, and Fti-ward (north) out of the Reach. Cairns with Nur-lamps and a waymarker in Dearcineon directions mark where it leaves the land. Walk up into the mist and the days of travel pass in a few cards: three on foot, two on Brindle. You come out at the top of the same road in the other region, with Brindle and Phorus. From Beuhk it's blocked by a rockfall until the story has taken you to Aakalay. Each region remembers the lantern you last rested at, and the map shows the pass.

**The Sunear'Zikhron.** Every so often the Waves of Memory roll over the region: bands of memory-light pour across a violet sky, the land dims, and echoes of the folk who once walked there walk past again, made of light. RubberMcFly come out to play in it, and it's the only time they glow. Somewhere the storm has an eye, a slow-drifting column of quiet. Find it and keep pace with it for twenty breaths, and what lives there gives you a **true prophecy**: each one points at something that really happens later in the story. Prophecies are written into the Rokarvac, and keeping pace also restores you and earns shards.

**Lore in the wilds.** Kill a RubberMcFly, the most perfect creature, and the ShurgrEdan answers: a claw of light out of a quiet sky that can't be blocked (it takes most of your health, and can kill you on Realistic). Phorus will never shoot one. Rodak travel in threes, and if you fell one the rest of the pack is gone. The Rokarvac has new entries for the Sunear'Zikhron, RubberMcFly, the ShurgrEdan, the Megla Pass and the four Dearcineon directions.

**Swimming and steep ground.** Deep water no longer stops you: wade in and Torcain swims, head and shoulders above the surface, in every lake, river and lagoon, and a little way out to sea off Leotik. Only the far sea and water by the region's edge turn you back. Swimming is slower, there's no rolling in the water, and land creatures won't follow you in. Ground steeper than about 51° can't be walked or hopped up any more; you slide along it, and you slip off ground that steep if you stop on it. Built stairs, piers and roofs are unaffected.

**Touch controls.** The RPG plays on phones and tablets, and the controls turn on at the first touch:
- **Moving:** a floating joystick on the left; push it past the rim to run.
- **Camera:** drag anywhere on the right to look around.
- **Buttons:** attack, jump/glide, dodge, Duat strike and interact. A row of Torcain's kit and tappable spell slots sit alongside. The top row opens pause, pack, skills, quests, map and the Rokarvac.
- **Dialogue and menus:** tap to advance dialogue; every menu has tap-to-close.
- **Dya'Akara:** ◀ ▶, Ready, 1–5, Throw and View buttons, or tap the field to throw.
- **Kuni Byrd:** climb and dive with the jump and dodge buttons.

**The Kuni Byrd (late game).** A Kuni Byrd nests on each region's highest perch. After Otlið, Woken falls, bring it three Albali fruit and it lets you ride. `B` calls it, `Space` climbs, `C` dives and `B` lands.

**Removed:** Ember Root, Mirrordew and Stonefruit are gone from both games. Old saves are cleaned up on load. Skith grass is now just green grass with white tips.

**Open-world RPG systems:**
- **Folk to talk to.** In Beuhk: Buhkon Eldi, Hemla (a Kalo'Eik trader), Duro (an Eikar smith), Venkin (a Keilia builder), Old Ruut (a Punk herder), Sefa and Fennek, and townsfolk Ama, Teodr, Lirra, Bosk and Orrin. At the Leotik camp: Venkin, Duro and Hemla again, plus Ila Vos (an Elsha'ryn herbalist) and Kesh (a Duskareth deserter).
- **Sixteen side quests**, with dialogue choices, plus **bounty boards** (Beuhk and the Leotik camp) with repeatable hunts.
- **Riding Brindle**: `Space` no longer hops — Brindle throws a vine round a tree ahead and swings you both round it; hold `Space` to keep swinging, let go to fling off up and onward (with no tree in reach, the vines slap the ground and vault you). `Caps Lock` (or `Z`) has Brindle lunge and lash with her vines. Wild and herd Punks swing round the trees too, up off the ground on their vines.
- **Quick slots** (`Q` and `1`–`6`): put whatever you like on them in the book (`I` → Gear). Any Relic whose trigger you've worked out goes on any slot — the fire-stone throws a pebble in a streak of flame, the humming stone gives you a second wind — and so can Torcain's Tukang flare, learned spells, a Sprengju throw, a flask of film, or Nur’Hlyst. A Relic goes onto the first free slot the moment you find its trigger.
- **Nur’Hlyst** (`G`): a golden pulse that reveals chests, gathering spots and quest objects — and the 21 hidden **Sniller amulets**, which pay out at 5, 10, 15 and 21.
- **A bestiary** (Beasts tab): hunt enough of a creature to study it for +15% damage against it.
- **Friendly creatures** that only fight if attacked: Kipsu families you can pet, a domestic Punk herd, and Albali that leave you alone.
- **A Punk mount, Brindle**: whistle with `H`, ride with `E`. Phorus rides too: some days he climbs up behind you on Brindle, other days he takes his own Punk, Lun (Dearcineon for moon and shadow; he's Kalo'Eik, moon-folk, and thinks this is very funny), and keeps pace alongside.
- **Gliding**: hold `Space` in the air.
- **Levels and perks**: three perk trees (Axe, Duat, Survival).
- **Spells** on keys `1`–`4`: Duat Pull, Fti Gust, Ular Quake and Nur Ward.
- **Items and crafting**: an inventory of materials, meals, axes and trinkets. Forge axes at Duro's cauldron and cook at a hearth or camp fire.
- **The world**: loot chests, gathering spots (ore, bark, stone, moss), and eight **Kalo Trials** (puzzles) that reward spells and Hurst seeds.
- **A world map** (`M`) with fast travel between lit lanterns.
- **Cloud saves**: progress saves to your Dya'Akara account when you're signed in, either from the title screen or by launching from the main menu while signed in.

**Nur Lanterns** are the checkpoints. Resting at one heals you, refills your Albali film, respawns enemies, and lets you spend zikhron shards on Vigor, Edge, Breath, Duat mastery, extra film vials and Tukang.

| Input | Action |
|---|---|
| `W A S D` + mouse | Move and look (click the world to capture the mouse) |
| `Shift` / `Space` / `C` | Sprint / jump / dodge roll |
| Left click | Three-strike axe combo |
| Right click | **Duat Strike**: the axe passes through the Duat to the foe you’re aiming at |
| `T` or middle click | Lock on to a target |
| `R` | Drink Albali film (heals and cures poison) |
| `Q` | **Tukang Flare**: releases full heat as a fire nova |
| `F` | **Nur Sense**: Phorus points out the next objective |
| `G` | **Nur’Hlyst**: reveal hidden things nearby |
| `1`–`4` / `H` | Spells / whistle for your Punk |
| `I` `K` `J` `M` | Gear and pack / skills / quests / map |
| `E` / `Tab` / `Esc` | Interact, talk or rest / Rokarvac journal / pause and settings |

Code (`rpg/js/`): `xilia.js` (Beuhk), `world.js` (Aakalay) and `leotik.js` (Leotik) build the regions, `terrain.js` holds shared collision and instancing, `sky.js` the skies, `ship.js` the Eldi ship, `actors.js` and `creatures.js` the models, `enemies.js` the creature AI, `progress.js` the difficulty, saves and upgrades (bump `SAVE_V` to reset every run), `bounties.js` the bounty boards, `dya3d.js` Dya'Akara in 3D, `story.js` all the text, and `main.js` the controls, combat, bosses and quests.

## Match Controls

| Input | Action |
|---|---|
| Mouse wheel over the card strip | Cycle through your pouch (9 cards visible, center highlighted) |
| Click a card | Centers **and readies** it (spends resources) |
| `SPACE` | Trigger readied slot 1 at the mouse cursor |
| `2` – `5` | Trigger readied slots 2–5 at the cursor |
| Drag a readied token onto the field | Trigger at that exact spot |
| `ESC` | Pause (real pause vs AI; cosmetic vs players, as designed) |

Win by getting the **Relic** to your hoard. Mikolo Moko and your sentient units will carry it; everything else on the field is either helping, hunting, or being spectacularly indifferent (looking at you, Uff).

## What's Implemented

Everything in the design document that can exist without a live backend or final art:

- **Match engine (Part III, VI, VII, VIII)** — deterministic fixed-timestep simulation; every launch creature's decision tree in priority order; per-individual trait variation; pulse system with voting + chaos mode; escalation at 10/15/20 min; tether fade at 80%/elimination at 100%; the exact draw rule; all key interaction rules (Kofi prey instinct, Tyndael tunnel vision, Naga dominance and first-head near-invincibility, Hvaleia jet size limits, Malsti Duat edge cases, ShurgrEdan retribution) and combo behaviors (live Eikar mounting, towers, Chemist supply lines, Ju + Sprengju Shaving).

  **Live mounting** — a creature tagged as a *mount* (the Domestic Punk, the Kuni Byrd) now spawns riderless and fights its own wild brain. Field a friendly **Eikar or Keilia** alongside it and the rider walks over and *actually mounts up* — drawn seated on the mount's back, with a little hop as it climbs on. The mount then hits harder, moves **faster**, and shields part of every blow, and fights on command like an Eikar (strategic targeting — relic carriers and enemy support first). Crucially, **the rider keeps its own trait and keeps fighting**: a mounted Archer still looses arrows, a Spear still throws its Hanii — *on top of* the mount's attacks, and it can't be struck directly while up there. That's what makes a mounted pair so strong. The **bond deepens the longer they ride**, so the pair keeps growing stronger through the match; if the mount falls, the rider is thrown clear and fights on foot. All deterministic, so lockstep netplay and replays stay byte-identical.
- **Full token roster (Part IV, V)** — all launch tokens, each minted as a specific *individual* with a locked behavior value (weighted lifetime energy average), personality diamonds, Eikar/Keilia trait layers, an auto-written backstory, life-history quirks with real field effects (25 in the pool), and a unique **physique**: every individual wears its own coat shade, build, and identifying markings (spots, dorsal stripe, facial blaze, pale feet) on the field and on its card.
- **Duel mode** — pick/random/blind, anything wagered, no Guild cut, wagered tokens permanently lost. Random assignment and Dya'kukull opponents only ever field tokens that actually fight (no fruit, relic shavings, or Ju Fields). The only draw a duel allows is a RubberMcFly in play; on a draw nobody wins, all wagers return to their owners, and the match reward is split evenly.
- **Brawl mode** — a *normal* standard match (resources, pulses, Relics, deploy your tokens over the pulse) but with **more than two players**, each keeping their **own hoard and Relic** with their **name floating above their camp**. Three shapes: **Team Battle** — allied sides at **2v2 / 3v3 / 5v5**, allies never fight each other; **Free-for-all** — 3 or 4 players, everyone for themselves; **Surrounded** — you hold the centre of the arena, ringed by rivals who each play for themselves, with an optional **King of the Hill** twist: pick, in the lobby, whether you're the **King** or an **Attacker**. The king holds a pre-built centre **castle** — a wall ring right around the hoard, a level-1 archer tower on each corner (each garrisons one of your own archers), and a permanently-manned Level-2 **keep** that fires as two archers on its own — draws **+50% resources** each pulse, and must **protect its Relic for a set number of minutes** (voted on the settings screen). Attackers hold no Relic of their own; the only prize is the hill. If the king fields a **Builder**, it upgrades the castle's corner towers and walls. **A side wins the instant it has captured EVERY rival's Relic** — and captures are permanent: once a Relic is carried into a camp it stays there, so there are **no take-backs** (you cannot steal your own Relic back, and a Relic knocked loose in the field is never auto-returned home). Built on an **alliance layer** (teams carry a `side`; targeting, friendly-fire, structures, zones, and the AI are all side-aware, so allies never harm each other while every rival side is a foe). **Multiplayer join & lobbies:** pick a shape and hit **Find a match** — the game searches the world for an **open brawl of the same shape** and drops you into its lobby (or hosts one for other searchers), and friends can also **Join a room** by code. Everyone lands in the **same two lobbies and readies up in both**: lobby 1 is the roster ready-up (once all present players are ready, empty seats **fill with Dya'kukull**), lobby 2 is the shared **pulse-settings vote with live chat** — every real player votes, and the Dya'kukull only add votes when there are fewer than two real players. Rival camps are seated from the world's Dya'kukull so their names are real. Brawl is a casual match: it **pays gold and XP** (no rank, nothing staked). Rematch re-runs the same setup. *(A 1v1 standard match is unchanged — `side` defaults to the team index, so two-team play is byte-identical.)*
- **The Hunt (roguelike summoner)** — a single-player, run-based mode on the main menu (🏹 Hunt). Pick a **Hunter** locked to one element, choose one of their **Artifact Forms** (a form can change element — and so Vaelk flavor and draft pool — base ability, and summon pool; Tanoc’s post-Stamijan form **Torcain** shows the system off with a wider, neutral/hybrid pool), then enter a hunting ground (**Velki**, **Xikia**, or **Leotik**) — a string of node battles. Combat introduces **Vaelk** — a resource all its own, separate from a token’s Fti/Su/Eldi/Ular ready cost, representing a Hunter’s inner drive to call beasts to their side. It comes in four elemental flavors (Fti’Vaelk, Su’Vaelk, Eldi’Vaelk, Ular’Vaelk; plural **Vaelkar**); a Hunter generates and spends only their own flavor, and **spends Vaelk to summon** beasts onto the field beside them. Summoned beasts fight with their existing locked behavior — the same match AI as everywhere else. Each Hunter’s draftable pool is the Collection roster **filtered to that element’s affinity** (automatic curation — no separate card set), and you **draft 1 of 3** after every won node. The final node of each ground is the **Quarry** — an existing legendary (Su Naga on Velki, Ular Naga on Xikia, Albali Villtur on Leotik) scaled into a **true boss**: a vast health pool, harder hits, largest size, and its own minions summoned each pulse (the Big Momma Kofi pattern scaled up). It is **meant to be brutally hard.** Beat the Quarry and you claim a crafting **piece of it carrying its exact stats** — take it to the workbench to sing that very monster into your Collection. Lose a fight and the run ends — run-only, with no permanent loss but the Quarry-piece you earn (deck and Vaelk reset each attempt). *(The older narrative-track Hunt is retired; **Expedition** is reserved for a later design. Tunable follow-ups: exact Vaelk regen/summon costs, per-ground node maps, and boss rosters.)*
- **Sandbox mode** — a testing ground in the Play tab: build **both** teams from tokens you own (no rentals), pick a terrain, and set the pulse rules yourself (interval, resources-per-pulse, Standard/Chaos — no vote, it's your sandbox). You then command **both** sides — ready and deploy for one team, then press **Tab** (or the ⇄ button) to hand command to the other and watch them fight. Resources, relic status, the token wheel and readied panel all follow whichever side you currently hold. Nothing is recorded: no XP, no gold, no stats, no rank, so it can't be farmed. Rematch re-runs the same two teams instantly.
- **Replays (Part XIV)** — stored as seed + input log, byte-identical playback, last 50 casual kept, tournament replays permanent.
- **Progression & economy (Part IX)** — exact XP bands, the full level-reward chest table with milestones, crafting costs, market tax by rarity, 75% Guild buyback, 50g listing fee, rentals at 25%→3%, titles with buffs (equipped-only), achievements, the complete 14-step tutorial.
- **Pre-match voting everywhere it belongs** — Quick Play vs AI, casual queue, challenges, tournaments, and cross-device private matches all open on the pulse-settings vote screen (interval, resources-per-pulse, Standard/Chaos, host-set terrain). Online private matches exchange both players' votes live over the room channel; the host stays authoritative on the final match parameters so the two lockstep sims never diverge. The tutorial and Hunts skip straight in, as before.
- **Token upgrading** — raise any individual token to the next rarity (Collection → token → ⬆ Upgrade rarity) for Okid + NgAkara. Its HP, damage, and speed climb to match a freshly-sung token of that tier, up to Torcain. The match engine reads the boosted stats directly, so an upgrade is felt on the field immediately.
- **Legacy narrative Hunt (Part X, retired)** — superseded on the main menu by the run-based Hunt above; kept dormant for existing Hunt slots and admin authoring. Every quarry is an **individual creature** the admin authors by hand in the Admin Panel (there is no default roster): its species, name, narrator, Track intro, encounter chain, and exact rewards are all entered by the admin. A creature can be hunted **once** — the first player to bring it down claims it for the whole world, it leaves every player's roster, and it moves to the admin's **Hunted** list. Players still earn a Hunt slot every 10 levels (expiring at the next band), and the Track keeps its narrator, 2 questions with the hidden ~5% temperament influence, encounter series, and hidden performance-scored payouts.
- **Tournaments (Part XI)** — circuit browser, Guild-sealed vs player-run, brackets with all six tabs, ranked at Regional+, title selection per tier (Local auto → Planet pick-3-keep-1), leaderboards, seasons ended by admin-activated Interplanetary.
- **All UI screens (Part XII)** — built to the locked wireframes: Pia'don login shot, the 9-card token wheel (not radial), collection with collapsible pouch builder, torchlit stalls with the seller-only market average, the crafting ritual (skippable), circular minimap, spinning-coin loading screen with lore tips, the lot.
- **Social (Part XIII)** — friends/pending/blocked, follows (cap 100), notifications (dismissed = gone), quick-chat only in match, reports to the Guild, public bans with collection-only access, spectator mode with cosmetic reactions.
- **Admin panel (Part XVI)** — tournaments, bans/appeals, frozen-token review (cleared/corrected/deleted/penalized), market monitor (local AND the shared online market), token spawning, announcements, trusted-seller grants, a **Hunts tab** where each huntable creature is authored by hand (species, name, narrator, Track intro, encounter chain, rewards) with an Available/Hunted split so consumed quarry retire on their own list, and the full **Dya'kukull tab** managing the 100 AI players who populate the market, stalls, queues, and brackets — now with global AI tuning dials, bulk operations, and per-AI collection management.
- **Live game editing from the admin panel** — every species is fully editable (stats, rarity/size bands, elements, behavior tree, per-individual trait ranges, dictionary text, and the sprite itself: rig, colors, feature layers, or an uploaded image with live animated preview; clone species into new ones), all game text (lore tips, story fragments, quick chat, plus game-wide exact-match UI string replacement), every balance/economy table, and the AI tuning dials. Edits are stored as overrides (`js/core/mods.js`), apply instantly, survive world resets, and — when online is configured — push to Supabase so **every player's game adopts them within a minute**.
- **The Vakarborac** — the creature dictionary as an in-game field guide (main menu → 📖 Vakarborac): every species with living art, temperament, and field notes, organized in the dictionary's five volumes.
- **The Rokarvac of the Mbaru Tatu** — a world codex (main menu → 🪐 The Mbaru Tatu) drawn from the creator's Rokarvac: the three Tatu and their Kalo, the elements as directions, the peoples, the Skaar Uverkhron, the Sunear'Zikhron, how the token game began, and a Dearcineon glossary. Content lives in `DYA.lore.WORLD` (`js/data/lore.js`).
- **The sky over the Mbaru Tatu** (`js/ui/mbaru_sky.js`) — the login shot, the main menu, and the codex share one canon-accurate sky: Velki at the heart of the cluster with Xikia and Leotik swinging around it, each Tatu with its own Kalo (Bolo Kalo among Velki's), Velki's misted north, Leotik's volcanic glints, the Sunear'Zikhron wrapping one world and then crossing through the Duat to the next with RubberMcFly glowing in it, Pia'don's outer cloud, and the far worlds Katkan, Oskerarean, and Su'Kryulndael. Honors reduced-motion. The main menu also shows a rotating field note from the lore tips.

## Match Visuals (each one removable on its own)

Every visual layer on the match field is a separate plug-in file in `js/engine/fx/`, loaded by one `<script>` line in `index.html`. They only *draw* — none of them touches the simulation — so replays, lockstep netplay, and the tests are unaffected. Players can switch each one off under **Settings → Display → Match visuals**. To remove one for everybody, delete its file and its `<script>` line; nothing else refers to it.

| File | What it adds |
|---|---|
| `fx/ground_detail.js` | Grass, pebbles, cracks, dune ripples, ash, flagstones, and soft sunlight on the field (by terrain). Off on Low quality. |
| `fx/arena_frame.js` | Shaded field edges and a gold-trimmed border around the arena. |
| `fx/contact_shadows.js` | Soft shadows under creatures; flyers cast theirs from above. |
| `fx/pulse_ripple.js` | A ring rolls out from a hoard when resources pulse in. |
| `fx/relic_beacon.js` | A light column over each Relic, a trail behind its carrier, a flash on pickup. |
| `fx/hit_sparks.js` | Element-tinted sparks on hits; dust and a rising mote when a creature falls. |
| `fx/damage_numbers.js` | Floating damage/heal numbers (2 or more, merged so they never flood). |
| `fx/ambient_motes.js` | Fireflies, Elsha'ryn spores, embers, dust or sea spray, by terrain. Off on Low quality. |
| `fx/lighting.js` | Campfire glow at each hoard and a vignette that cools to teal in the Sunear'Zikhron. |
| `fx/camera_shake.js` | A short jolt when something big falls or the ShurgrEdan strikes (off with reduced motion). |

The HUD restyle (glass panels, shimmering pulse bar, gold minimap bezel, wheel tray) is `css/match_hud.css` — remove its `<link>` line to go back to the original HUD, or delete any one of its numbered blocks. The plug-in slots themselves are `js/engine/match_fx.js` plus five one-line hooks in `js/engine/render.js`.

## Character Looks (each one removable on its own)

How creatures and people are drawn — on the field, on cards, in the Vakarborac — can be layered or redesigned by plug-ins in `js/engine/looks/`, one file each, switchable under **Settings → Display → Character looks**. Delete a file and its `<script>` line to remove it; a removed species redesign falls back to the original drawing. An admin-uploaded sprite image always wins over any redesign. Display-only — the sim never sees them.

| File | What it does |
|---|---|
| `looks/eikar_canon.js` | Eikar as the creator draws them: acorn-textured triangular bodies, markings under the eyes, a scaled Aagac with a symbol for their kind (sword, spear, bow, flask), and no hands — weapons float beside them. |
| `looks/keilia_canon.js` | Broad Keilia with overlapping hair growing thickest from the shoulders and falling to the calf like a cape; floating tools. |
| `looks/kofi_galta.js` | The Kofi (and Big Momma Kofi) as the Kofi Galta: crescent body, blade-like spines, dark tail tuft. |
| `looks/living_motion.js` | Breathing at rest, leaning into a run, stretching into strikes. |
| `looks/volume_shading.js` | Light from the upper left and shade below, painted only on each body. Off on Low quality. |
| `looks/hit_flash.js` | A creature's exact shape flashes pale when it is struck. |
| `looks/ink_outline.js` | A thin dark outline around every creature. Off on Low quality. |

The slots are `js/engine/char_looks.js` (which also holds the shared floating-weapon drawing) and one hook in `SPR.draw`. Token cards get rarity frames, element glows, and a foil shine on Onnar-and-up from `css/card_frames.css` — remove its `<link>` for plain cards.

## Placeholder Art

Per the creator's direction, all creatures use **animated placeholder rigs**: a small four-legged animal for beasts, a small two-legged, two-armed acorn for humanoids — with species feature layers (extra heads for Naga, five horns for Albali Byrd, the flame crown for Tyndael, hair armor for Keilia…) so everything reads on the field. All animation states are in: idle, walk, run, attack, hit, death fade, dormant, plus signature specials (tongue strike, jet blast, screech, teleport, swarm thinning). Shader treatments per Part XIV: magical shimmer, per-creature bioluminescence (RubberMcFly only glows during the Sunear'Zikhron), tether fade, element-colored resource orbs.

**No music**, by design — the composer is handling that. The music channel exists in Settings and stays politely silent. Synthesized SFX are in (including the ShurgrEdan strike, with its own toggle).

## Online Play (real cross-device multiplayer)

**Dya'Akara is an online-first game.** The cloud (a free Supabase project) is the source of truth — a player's account lives in `dya_accounts`, and `localStorage` is only a local cache. On boot the game holds behind a blocking "Reaching the Guild…" overlay until the servers answer, and if the connection drops mid-session the same overlay returns until it comes back — so play never silently forks into a private local copy (`js/core/online_gate.js`). The deployment in `js/config.js` already ships with a live Supabase project baked in.

> **Offline mode is deliberate, not a fallback.** The local match engine is fully intact behind `DYA.onlineGate.allowOffline`, reserved for a future offline-vs-AI "camping" mode (play against the Dya'kukull with no connection). Until that mode ships, the game requires the cloud to sign in.

See **[ONLINE_SETUP.md](ONLINE_SETUP.md)** for the 10-minute setup. Everything below runs on that Supabase project (Firebase, if you use it, only *hosts the files* — it does not make the game online by itself):

- **Cross-device accounts — log in anywhere** — a player's whole save (collection, gold, level, friends, settings, achievements) is keyed to their email and lives in a `dya_accounts` table, not just one browser's `localStorage`. Log in with the same email+password on any computer — home, work, a phone browser — and pick up exactly where you left off. Bans travel the same way, enforced the moment you log in anywhere. (`js/core/account_cloud.js`.)
- **Cross-device friends** — every player gets a permanent 6-character **friend code** (shown at the top of the Friends screen once online). Exchange codes, send/accept requests, and see each other's live online status from any two computers. (`js/core/online.js`, plain REST, polled every 15s.)
- **Cross-device private matches** — Play → Private Match: one player opens a room and shares a 5-letter code, the other joins with it. Both computers run the identical deterministic simulation and exchange only inputs (lockstep over a Supabase Realtime channel, ~500ms input delay, desync detector included). (`js/core/netplay.js`.)
- **The shared player market — real buy & sell, no duplicates** — list a token to the online market and every player sees it; the full token travels with the listing. Buying is an **atomic conditional update**: exactly one buyer can ever win a token, and the moment they do it leaves the market for everyone else. The seller's device collects the proceeds (minus the Guild tax) on its next sync. Cancelling and admin pulls return the token home. (`js/core/market_online.js`.)
- **The official season — a ranked ladder across circuits** — the Guild's season is one long climb, not a bracket. **It doesn't start until the organizer (the admin) opens it** from the Admin Panel — a shared flag (via `dya_config`) that reaches every player within a minute; until then ranked ladder play is closed. Once open, everyone starts in their **Local** circuit and plays other players there; winning raises your ranked rating and **enough rating promotes you** up a circuit (Local → Regional → Half Planet → Whole Planet → Interplanetary), earning an official title at each. A match is **always available**: *Find a Season Match* pairs you with a real player in your circuit who's also searching (atomic claim over a shared queue → live match), or a Dya'kukull of your circuit fills in so you never wait. Shared leaderboard off real ratings. (`js/core/season.js`; `dya_season_queue` + `rank` on `dya_players`; rating→circuit model in `economy.js`.)
- **Shared bracket tournaments — real players across devices** — create a tournament and your friends **join it from their own devices** (optional **password** to keep it private). Tournaments are for real players: the Dya'kukull only pad the **empty** seats at start, never form a field by themselves, and a real player always seats ahead of a filler. A bracket is just normal matches played in a structure — a pairing between two real players is a **live head-to-head match** over the same lockstep engine as Private Matches (room + match derived from the bracket, nothing exchanged by hand; against a Dya'kukull filler you play their submitted pouch, and an absent live opponent falls back to their pouch so the bracket never stalls). Every match is recorded to history/stats, and the shared bracket fills in for everyone. **Titles come only from official season tournaments**, which the creator makes live and monitors from the Admin Panel. (`js/core/tournaments_online.js`; tables `dya_tournaments` / `dya_tournament_players`; seats are atomic inserts, one row per real registrant.)
- **Admin edits broadcast to all players** — the admin panel's creature/text/balance/AI edits push to a `dya_config` row that every game polls (`js/core/mods.js`). The Admin Panel can also look up and manage any player's cloud account, even one it's never locally seen.
- Configure once in `js/config.js` (bakes it into the deployment), or per-browser in-game via **Friends → Set up online play**. If you set up Supabase before this update, re-run `supabase/schema.sql` once — it's idempotent and just adds the new tables.
- ⚠ Same open-policy security model as the rest of this online layer (see [ONLINE_SETUP.md](ONLINE_SETUP.md#a-note-on-security)): fine for a game shared among people you trust, not equivalent to real per-account authentication.

**Online-first — and what may be played without a connection.** Dya'Akara is the shared world of the Mbaru Tatu, so it runs online-first: with no Supabase configured, or the cloud unreachable, the game shows the online-gate overlay rather than silently running a private copy. The only things playable without the Guild network are the honest practice modes against the machine — **Quick Play — vs AI**, a **Duel — vs AI**, and **Brawl** (multi-player team battles, free-for-all, and surrounded). Everything else — Ranked Season, the Matchmaking Queue, Private Match, Spectate, dueling a player, the Market, Tournaments, and the Hunts — is part of the shared world and passes through a single connect gate (`UI.requireOnline`), never a local silo. Online is configured out of the box in `js/config.js`, so the deployed game is online for everyone by default.

**The Dya'kukull are players.** The world's own hundred inhabitants fill the market, the queues, the brackets, and any empty seat — and to a player they are simply *players*. Nothing in the game reveals them as anything else: no "vs AI" label, no "offline stand-in", no "so you never wait". They stay a per-browser simulation behind the storage adapter (`DYA.store` in `js/core/state.js`) as world flavor rather than portable player data, but a real player always seats ahead of them, and a Dya'kukull only ever fills in seamlessly — indistinguishable from the person on the next computer.

## Deferred (matches Part XVII)

Sniller, Vyrenalur, Aerolhorn, Kalo'Eik variants, Api Buta, the Expedition and Challenge modes, Pia'don-tier titles, replay share links, variable pouch sizes, the Gynge flip mechanic (no current token can trigger it), WebXR/mobile, live tournament spectating (results and stats are shared and watchable, but streaming another pair's match in progress is not), and cross-device negotiation/offers on online listings (online listings are instant-buy; haggling stays on the local stalls).

## Tests

```bash
npm test                          # runs all four suites below
node tests/test_engine.js         # headless: determinism, replay exactness, duel/hunt/standard resolution, duel tie rules
node tests/test_netplay.js        # lockstep netplay: two simulated machines must stay tick-identical
node tests/test_mods_market.js    # admin live-edit overrides + shared market: atomic buys, no token duplicates
node tests/test_cloud_accounts.js # cross-device accounts: same login from a fresh "device", bans travel, offline fallback intact
node tests/test_hunt_run.js       # The Hunt: hunter/form/ground data, element-filtered draft pool, single-flavor Vaelk economy, the Quarry boss + its exact-stats piece reward, run progression
```

---
*Launch design complete. The Guild is watching. Cordially.*
