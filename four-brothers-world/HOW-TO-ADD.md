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
| Acorn World | Elder Capwell (gives the acorn buddy) | The Warthog King | `acornworld.js` |
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
