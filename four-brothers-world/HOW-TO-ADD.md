# 4 Brothers World: how to add things

Everything lives on one global object, `RW`. Data files only call `RW.register.*`, so new content never needs engine changes.

| To add… | Edit | Example |
|---|---|---|
| A species (any type) | `js/data/species/<type>.js` | `RW.register.species({ id, type: 'fuzzies', name, world, role, status: 'active', art, hp, dmg, speed, behavior, spawn, drops })` |
| A new species type (a brother's family) | `js/data/species/types.js` | `RW.register.type({ id, name, creator, color, blurb })` |
| A weapon or item | `js/data/items.js` | add an item + a recipe |
| A block | `js/data/tiles.js` | one `add({...})` line |
| A world | `js/data/worlds/<name>.js` | Surface worlds use `RW.surface` (see `fuzzyworld.js`): list biomes left→right, then add villages, an arena and `boss: { species, arena, at, wake }`. Set `order` and `unlockedBy` to place it in the Duat chain. |
| Dialogue, names, carvings, trades | `js/data/lore.js` | plain text |

## Using a real drawing as a sprite
1. Put the scan/photo in `art/` (e.g. `art/creepy_fish.png`).
2. In the species entry, replace `art: { draw: 'fish' }` with `art: { img: 'art/creepy_fish.png', h: 14, palette: ['#dfe8dc', '#8fb0bd', '#4c6575', '#1c2530'] }`.
3. `RW.art.fromImage` removes the paper, crops, shrinks to `h` pixels tall, recolors the pencil with the palette (light → dark) and outlines it.
For hand-colored sprites, add a draw function in `js/engine/art.js` (`D.myCreature = () => [frames]`) and point `art.draw` at it.

## Monster behaviors (`js/engine/entities.js`, `E.behaviors`)
`swimmer`, `dasher`, `lurker`, `crawler`, plus the boss `leviathan`. Add a new one as `E.behaviors.myBehavior = (e, dt, sp) => {...}`.

## Multiplayer
- World edits: shared db collection `rockchunks` (one document per 32×32 tile chunk, fields `t<index>` and `p<index>`).
- Boss state: `rockstate/main`.
- Each player's save: `data/users/<id>/save` (private).
- Live: room presence (positions) + topics `fx` (spells) and `chat`.
Players must be invited by email as **Editors** to build in the shared world.

## The four worlds
| World | Hero / people | Boss (its fall opens the next world) | File |
|---|---|---|---|
| Fuzzy World | Fuzzies: Old Tuft, Burr | Gnarlroot, the Giant Vine Tree | `fuzzyworld.js` |
| Acorn World | Elder Capwell (gives the acorn buddy), the Keilia keep, the Elsha'ryn | The Warthog King | `acornworld.js` |
| Rock World | Rocks: Gneiss, Slagg, Wedgeworth | The Gemscale Leviathan | `rockworld.js` |
| Ghost World | Cyators: Commander Vexa | The Hollow Wraith | `ghostworld.js` |

Fuzzy World is always reachable; every other world opens when the boss of the world before it falls (shared for everyone). Duat Altars sit in every starting village.

Boss behaviors live in `js/engine/entities2.js` (`E.bossAI.gnarlroot`, `hogking`, `wraith`) plus the Leviathan in `entities.js`.
Shared data per world: `chunks_<world>` (Rock World keeps `rockchunks`), boss state in `wstate/<world>` (`rockstate/main` for Rock World).
| The Duat (co-op) | Keeper Sefet, Acolyte Hennu (trades) | The Possessed Reflections, which fuse into **Apophis** | `duatworld.js`, `species/duat.js`, `engine/entities3.js` |

## The Duat
- **Opens** when a fuzzy, a rock, an acorn and a ghost have each beaten their home world's boss (shared record `wstate/duatunlock`).
- **Stamina**: every swing, jump, cast, sprint (Shift) and hover costs stamina. A world's `staminaMul` multiplies it (the Duat is 3).
- **Soul drain**: a world's `soulDrain` (HP per second) applies unless you're near a soul crystal, a campfire or the altar.
- **Great World Feeders** pass through every few minutes. They can't be killed. Their timer is `E.greatFeeder` in `entities3.js`.
- **The final boss** copies everyone in the Duat (plus any of the four heroes nobody brought), then fuses them into Apophis, a small World Feeder. Each player gets their species' legendary weapon (`RW.LEGENDARY`).
- **Beyond the Mirror**: the sixth world is a locked teaser card in the travel menu once Apophis falls.
- Possessed art for any hero: `RW.art.possessedSprites(species, look)`. Recolor any monster with `art.tint`, `art.tintA` and `art.scale`.

## Keeping players' progress when you update
- Saves live in the browser under keys starting with `rw_` (`rw_save_rock` is the hero; `rw_edits_<world>` are the blocks people changed). Never rename them.
- World edits are saved by tile **number**, so only ever add new tiles at the **end** of `js/data/tiles.js`. Never reorder or remove one.
- A new field in the save needs a default when it's missing (see `G.load` in `js/engine/main.js`), so older saves still load.
- Bump `RW.VERSION` (and `#version`) with every update. The first time a new version runs it copies the old save to `rw_save_backup_<old version>`.

## Controls
Every control is an action in `RW.ACTIONS` (`js/core.js`) with up to two keys. Read them with `RW.input.act('jump')` (held) or `RW.input.actHit('jump')` (pressed this frame), never a raw key, so players can change them in Settings.

## Torches and Stryx
- Torch: item `torch` (`kind: 'torch'`). `P.toggleTorch()` puts one in the other hand; `P.torchFx()` lights it.
- Stryx: species `stryx`, behavior `E.behaviors.stryx`, drawing `D.stryx`. `platform: true` on a species lets players stand on its back; `lashR` / `lashY` set how far its vines reach and from how high.

## Armor, hats and capes
- Armor is an item with `kind: 'armor'`, `slot: 'head'` or `'body'`, `def` (how much it soaks up) and `tint` (its colour on the hero); see `js/data/items.js`. `RW.art.dressed()` draws armor, hats and capes over any hero.
- Hats: add a name to `RW.HATS` and a few lines for it in `RW.art.dressed`. Capes: add a colour to `RW.CAPES`.

## Multiplayer
Everyone in a room must run the same `RW.VERSION`: a joining game says hello with its version and the host turns away a different one with a clear message. So bump the version with every update.

## Relay for tricky networks

Since v1.5 you don't need to do anything: when two computers can't link up directly, the game relays the connection through the Dya'Akara site's Supabase project (its settings come from `../js/config.js`). The steps below are optional. They add a TURN relay, which makes the *direct* link work on more networks, so fewer games need the Supabase relay.

1. Make a free account with a TURN relay service. Metered (metered.ca) has a free plan. The game can't make the account for you.
2. In your account, create an app and copy its **credentials link**. It looks like `https://YOURAPP.metered.live/api/v1/turn/credentials?apiKey=YOURKEY`.
3. In `index.html`, find `RW.RELAY = RW.RELAY || { api: '', servers: [] };` and put the link between the quotes after `api:`.
4. Upload `index.html` to GitHub as usual. Everyone refreshes. Only the host and the joiner need the new version.

To try it on one computer first, without editing the file, open the game, press F12, choose Console, and run (with your own link):
`localStorage.setItem('rw_relay', JSON.stringify({ api: 'https://YOURAPP.metered.live/api/v1/turn/credentials?apiKey=YOURKEY' }))`
then refresh. Relay traffic counts against the service's free monthly allowance. A key in `index.html` is visible to anyone who opens the page, which is normal for these services, but pick one with a usage cap.

## Acorn World pieces (v1.6)
- **Big trees:** `homeTree()` and `towerTree()` in `acornworld.js` build a hollow tree of `bark` with floors, stairs (`stairplank`, a one-way step you walk up), ladders and trapdoors. `branchHouse()` hangs a house off a floor.
- **Toggles:** any block with `toggle: '<other block>'` swaps when you press R beside it (`trapdoor` / `trapdoor_open`, `lever` / `lever_on`). See `P.interact` in `engine/entities4.js`.
- **Puzzles:** a world's `meta.puzzles` list. Kinds: `levers` (levers set to `want` open `gate`), `runes` (touch rune stones in `order`), `lever` (one lever opens `gate`). Gates are `keepgate` blocks; opening one turns them to air, which saves and syncs like any block change.
- **Sneaking:** `meta.restricted` (named rectangles) and `meta.guards` (`{ x0, x1, y }` patrol beats). A guard who sees you inside a restricted rectangle sends you to `meta.keepOut`.
- **Creatures of the Mbaru Tatu:** `js/data/species/mbarutatu.js`. `temper: 'critter'` never hurts you, `'neutral'` only after you hit it. Drawings in `engine/art4.js`, behaviors in `engine/entities4.js`.
- **Rebuilding a world from scratch:** give it a new `store` name in its definition (Acorn World uses `store: 'acorn2'`). Block changes, the explored map and saved positions are kept under that name, so old changes don't land in the wrong places.
- **Quests:** add an entry to `RW.QUESTS` in `js/data/lore.js` (`npc`, `title`, `kind`: `bring` / `kill` / `meet` / `visit` / `flag` (a hero flag is set) / `read` (`n` carvings from index `from` have been read) / `sneak` (reach `meta[target]` without being caught; `give` hands over an item first), the item, species or zone, `n`, `reward`, `ask`, `done`, and optionally `req(p)`), then list its id in that person's `quests` in `RW.NPCS`. They are offered in order. Engine: `engine/quests.js`.
- **Grow-forging:** recipes with `at: 'grow'` are made beside a `growaltar` block (the Elsha'ryn's, in the Memory Grove).
- **Memory cores:** `core(c, x, y, i)` in `acornworld.js` places core `i` (carving 17 + i). Lethra's job counts them through the `read_acorn<index>` flags that reading sets.
- **Chests:** any block with `loot` (a `RW.LOOT` table) or `storage: true` opens with R or right-click (`RW.chests` and `U.openChest` in `engine/ui.js`). Contents are saved per world under `chests_<store>` in the browser.

## Acorn World life (v1.8)
Places come from `buildLife()` in `acornworld.js` (it fills `meta.waystones`, `meta.albaliTrees`, `meta.den`, `meta.plot`, `meta.gorge`); Capstead adds `meta.house`, `meta.stall`, `meta.nightHomes` and `meta.crowns`. The engine is `engine/entities5.js`.
- **Using a block:** a block with `use: '<name>'` runs `E.useHandlers[<name>](x, y, tile)` when you press R beside it or right-click it. Built in: `bed` and `rest` (campfire) set where you wake up (`P.flags.bed`), `waystone` wakes and travels, `housedoor` opens your house once `q_orrin_house` is done, `cannon` fires the Ember's cannon.
- **Waystones:** put a `waystone` block in a world and add `{ name, x, y }` to its `meta.waystones`. Waking one sets the flag `way_<world>_<x>_<y>`.
- **Market:** `RW.MARKET` in `lore.js` is a list of trade lists; each market day uses the next one. Same format as other trades (`give`, `get`, optional `note`).
- **Pets:** `TAME` in `entities5.js` maps a creature to its favourite food. Add a size to `PET_SIZE` too. The pet is `P.flags.pet`.
- **Fishing:** `CATCH` in `entities5.js` has a weighted list per water zone (`ocean`, `gorge`, and `other`).
- **Crops:** give an item `plant: '<crop block>'` and make a block with `crop: '<item>'`, `decor: 'crop2'` and `grow` (seconds). It grows on farm soil.
- **Weather:** the storm (`stormDay`), rain (`rainNow`) and market day all come from the shared real-time clock (480 seconds a day), so everyone sees the same weather.
- **New carvings** for Acorn World go at the end of `CARVINGS_ACORN` (27 is Orrin's Plot sign).
