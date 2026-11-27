© 2026 Isaac Flake. All Rights Reserved.

# 4 Brothers World V3: project map

> **Copyright:** every new file starts with `© <year> Isaac Flake. All Rights Reserved.` in its comment style. See the root `CLAUDE.md`.

V3 is a copy of V2 (its `index.html` and `v2*.js` modules, unchanged apart from the save and room names) plus V3's own modules, `v3s1.js` … `v3sN.js`. V2 stays as it is in `four-brothers-world-v2/`.

## V3 specifics
- Saves: browser keys `rw3_`, account rows `fbw3:<account>:<key>` (meta `fbw3-cloud`), rooms `fourbrothersworlds3-<code>` / relay `fbw3-room-<code>`. Heroes start fresh (nothing is copied from V2 or the main game). `RW.VERSION` is set in v3s1.js: bump it with every update.
- New work goes in a new `v3sN.js` after the last one (the same wrap-don't-edit rule). Cache-busters as below.
- v3s1: hosting fixes (Relay.open paced + tracked, N.hostGame with a 9 s fallback to the relay and reconnect loops), shared dropping (`tdrop`/`tpick`), the rock's single block / Shift 2x2 smash, placed-block protection (`RW.v2placed`, marked by `WD.applyRemote` and `P.tryPlace`), rock float toggle (C), the bag's hotbar row.
- v3s2: native-resolution canvas (`RW.v2hd`: a block is 20*k device pixels), 20x20 block textures and worn edges (intercepts 16x16 drawImage calls during `WD.drawTiles`), zoom on - and =.
- v3s3: the new Rock World (1280 x 700, seeded per world: `RW.store` `v2_rockseed`, host's seed sent with the `world` message as `rseed`; `def.store = 'rockv3_<seed>'`). Layout in `meta.layout`, towns in `meta.towns` (zones `town0`…), caverns `meta.caverns`, shafts `meta.shafts`, chamber `meta.arena`, roof spikes `meta.roofSpikes`, starter chest tile `starterchest` (loot `v2starter`). It re-places the town portal, Duat Stone, legendary/old chests and the golden chest.
- v3s4: the Leviathan (`RW.v3lev`): serpent of 100 segments (about 140 blocks), 12,000 HP +30% per extra fighter, shields at 70% and 30% with four guardian classes (`v3g_ruby` knight, `v3g_sapphire` archer, `v3g_amethyst` mage, `v3g_emerald` healer; 400 HP +25%/fighter; frost slow `P.v3slowT`, ward `e.ward`), states charge/frenzy/barrage/beam/whirl/coil/collapse/tail/summon/roar, effects carried in `b.fx` (`v3beam`, `v3vortex`, `v3coil`, `v3shield`, `v3rage`, `v3roar`, `v3slam`). Drawn after the water.
- v3s5: Scale2x copies of sprites in `E.draw`/`E.drawPlayer`/`N.drawPeers` (a frame's own `__hd2` 2x canvas wins), armour plates, hand-painted tool icons, swing trails, soft glows and halo bolts (glows, bolts and trails go through `RW.v3pix`).
- v3s6: boulder rocks (`A.rockSprites` replaced: 12 frames, 0-7 as before + 8-11 run; each 1x frame carries `__hd2` and `hand`). Body/arms/move travel in `look.shape` as `body.arms.move` (RW.SHAPES has hidden keys for every combo and the old tall/stocky/slim). Creator rows patched in by a MutationObserver on `#c-dyn`. Rock World underground ambient lowered (`def.ambientAt` wrap) and the player's own glow dimmed there (`WD.computeLight` wrap). `RW.v3pix(g, fn, {add, soft})`: draw on a 1-unit-per-pixel layer. T toggles `RW.v3mine2` (2x2 mining, used by v3s1); the `torch` action is removed.
- v3s7: glowstones `glow_<dim|bright|radiant>_<colour>` (kind armor, slot `trinket`), light pushed into `WD.computeLight`, friends' glows via `v3glow` messages, outline in `E.drawPlayer`, radiant ones from legendary chests (`WD.setTile` wrap), Trinket row + recolour in `U.renderInv`.

- v3s8: 48x48 Leviathan item art (`RW.v3art`: paint/has/finish; coloured outlines + upper-left light), A.icon carries `__big48`/`__hd2`; UI 16x16 canvases get the big picture (CanvasRenderingContext2D.drawImage patch); big weapons held 1.5x.
- v3s9: drowned-soul guardians (`RW.v3soul`, sprites per class/pose at 1px/unit; v3s4's drawGuardian hands over), names, size 28x54, cores always drop.
- v3s10: Leviathan loot (7 drops, 4 core crafts, cores, Abyssite ore tile `abyssite` + bars/helm/mail/pick, altar tile `levaltar` + rematch, krait pet, 12 trinkets and their effects, `E.v3shots`/`E.v3fx`/`E.v3allies`, soul link messages `v3link`/`v3share`, `v3heal`, `v3pet`, `v3rematch`).
- v3s7 also: three trinket slots `trinket`/`trinket2`/`trinket3` (P.wear wrap: no doubles), Abyssal glowstone tier.
- v3s6 also: look.shape may carry 7 parts `body.arms.move.face.extra.size.vein` (RW.SHAPES is a Proxy), hats/toppers/armour painted on the boulder (`look.v3hat`, `look.v3armor` set by an A.dressed wrap), creator rows Face/Growths/Size/Veins, still preview unless a move is hovered (`RW.v3hoverMove`).
- v3s11: Terraria-style 32x32 icons for every weapon/tool/armour (`RW.v3terraria`), bow/axe painters, crisp swing crescents, coloured hit dust, NPC timer guard.
- v3s12: Rock World fancy lighting (`RW.v3light`): smooth light (2-step upscale), block shading + AO layer, floor shadows; Settings > Lighting; auto turn-down under 45 fps.
- v3s13: Rock World towns (`RW.v3towns`): visitors moved from the start to Stalagmere, abandoned towns (`t.abandoned`, haunted chest tile `hauntchest`, zombie boulders `v3_zboulder`, possessed rocks `v3_possessed`, clear flag `P.flags.v3clear_<town>`), villagers `v3vil_0..11` (trader/jobs/elder; `RW.V3_TOWN_TRADES`, `RW.V3_JOBS`).
- v2s4.js (V3 copy): rocks steer in the air (aup 0.45, abrake 0.9) and stop dead when A/D is let go (not in water, not just after a hit).
- v2s13.js (V3 copy): B no longer cycles building shapes for rocks; for rocks T or B switch one mode, 1x1 or 2x2, for mining and placing (v3s6 sets P.flags.shape 0 or 3).
- v3s14: characters and worlds like Terraria (`RW.v3slots`): Play opens a character list, then a world list. RW.store get/set map hero keys (`save_rock`, `save_backup_*`) to `@c<id>` and world keys (`edits_`, `explored_`, `bossdead_`, `chests_`, `mother_`, `clam_`, `cl_scrib_`, `v2_rockseed`, `duatunlock`) to `@w<id>`. Lists `v3_chars`/`v3_worlds`, picks `v3_curchar`/`v3_curworld`. Old saves migrate to c1/w1. G.start waits for a world pick (tests set `window.__v3direct = true`). Hero save carries `v3posBy` (positions per world) and `v3been`.
- v3s15: chunkier pixels (Leviathan art snapped to 32x32; rock HD frames drawn at 2/3 via an E.drawPlayer drawImage swap, `A.dressed` wrap collects them) and a cleaner bag (bigger slots, one Equipment row, armour style behind a details toggle, compact stats) and one crafting list (craftable first, then greyed, ingredient icons).
- v3s16: hero maker: hover any chip/swatch to preview it (look captured from the preview's A.dressed calls; restored on mouseleave unless clicked; Species and Moves rows skipped), compact multi-column layout that fits 1100x680 without scrolling. v3s6's creator rows now re-patch whenever #c-dyn is rebuilt (marker `data-v3row`).
- v3s6 also: worn helms are flat-topped great helms with an eye slit, nasal and cheek guards (caps/hoods/circlets stay open-faced).
- v3s3 also: you spawn in Stalagmere beside the starter chest (v3s13 sets def.spawn).
- v3s3 also: Stalagmere (ry 60, about 100 blocks floor to roof) has homes for Gneiss, Wedgeworth, Cubert, Slagg (walled forge) and the rune keeper (guesthouse, placed by v3s13), all hanging, joined door to door by sagging walkway bridges on chains; the starter chest and your spawn are inside Gneiss's house. Other visitors go to the first lived-in town.


Read this first. It says where everything lives, so a change doesn't need the whole game re-read.

## Ground rules (from McKay)
- Only change files in `four-brothers-world-v3/` for V3 work (V2 lives in `four-brothers-world-v2/`). Never touch the main game (repo root) or Dya'Akara, except the home page's Play V3 button (`js/flake/hub.js`).
- New work goes in a new `v2sNN.js` file loaded after the last one, wrapping existing functions instead of editing `index.html`'s game code. Small fixes to a recent `v2sNN.js` are fine.
- Script tags carry a cache-buster: `v2sNN.js?v=<first 10 hex of sha256 of the file>`.
- The game must not feel like Terraria: fights reward thinking, the world has its own story and look.
- Art: send McKay a preview sheet before art goes in the game. Stay **very** true to his sketches; ask for photos of the sketch when a creature is described. Keep sprite source in the repo (or the module) so old versions can come back.
- Changes go live by committing to `main` (GitHub Pages and Firebase deploy on push).

## How the code fits
- `index.html` holds the whole main game (v1.8) inline, then loads `v2.js`, `v2s2.js` … `v2s23.js`, then main.js's code (also inline).
  Big inline sections, found by grep: `RW.TILES = [` (blocks), `RW.WALLS = [` (background walls), `A.buildTiles` (tile textures),
  `A.drawDecor` / `A.decorExtra` (drawn tiles), `RW.surface = ` (world-making helpers: ctx, terrain, caves, ores, trees),
  `fuzzyworld` def (`RW.WORLDS.fuzzy`: generate, zoneAt, ambientAt, zones, boss), `E.behaviors` (monster AI: crawler, charger, grazer,
  flyer…), `E.spawnEnemy`, `E.damage`, `E.updateEnemies`, `E.updateNpcs`, `E.draw`, `WD.drawHills / drawTiles / drawWater / drawLight`
  (render order: backdrop → sky → hills → tiles → fx under → entities → water → light → fx over), `RW.net` (saves: `queueEdit`, `chunkOf`, `applyDoc`).
- Globals: `RW.art` (A; `A.drawers` = D, `A.species(id)` → frames `[[right, left], …]`, `A.outline`, `A.furColors`, helpers in `A.h4`:
  disc, poly, qb, stroke, fitFrames), `RW.ent` (E), `RW.player` (P), `RW.ui` (U: talk, toast, banner, openModal), `RW.register` (R.species, R.items),
  `RW.world` (WD: get/set/getBg, meta, surf, zoneAt), `RW.T` / `RW.W` (tile and wall ids by key), `RW.SPECIES`, `RW.ITEMS`, `RW.LOOT`.
- Adding blocks/walls: push onto the END of `RW.TILES` / `RW.WALLS` and set `RW.T[key]` / `RW.W[key]` (see `addTile` in v2s23.js). Never insert in the middle; saves store tile ids.
- World changes: wrap `def.generate` and edit the returned `{W, H, fg, bg, meta}`. Later files wrap earlier ones (v2s23's wrap is outermost).
- Shared lock for "can't hurt you right now": `RW.v2lock.on(e, why)` / `.off(e, why)` (v2s21).

## Fuzzy World layout (tile x; the world is 1200 x 320 since v2s23)
- 0–34 ocean · 34–228 Sunbake Desert (scorpion den at 178) · 228–410 Tuftwood Forest (the starting village 296–346, spawn at 318) · 410–548 Tall Peaks.
- 548–764 (old numbering) Tanglewood Jungle: the Strangler tree at 556, **Tanglehold** 570–642 (Word Temple at 609, home-trees at 593 and 633,
  NPC spots in `meta.jv.npcs`), ruins at 648, Gnarlroot's Hollow (boss grove) 664–744.
- **748–1147 is new (v2s23):** Deep Tanglewood 748–979 (giant trees, Ridgeback Run home-tree + Herder Bramble at ~818, jungle scorpion den at 898),
  cliff + waterfall at ~984, Woolly Highlands 984–1120 (Curlmanes), slope down to the old jungle edge (old 748–764 → 1148–1164), then the eastern ocean.
- Zones: 'galleries', 'roothollow', 'magmahall', 'grotto', 'geode' (v2s24, only where the base zone is caves/deep), 'deepjungle', 'highlands', 'den' (v2s23), 'jvillage' (v2s20), plus the base ones.
- Caves (v2s24): Galleries 34–142, Root Hollows 236–404 and 762–972, Magma Halls 418–544 (hall at x 482), Grottos 556–744, geodes at y 220–290. The base cave mouths (straight shafts) are switched off; each region has a sloping entrance.
- Saves: block changes are stored by OLD index (800-wide); new land gets indexes from 256000 up (`toStore`/`fromStore` in v2s23). Keep this if the world changes again.

## What each module does (newest first)
- v2s29: sleeping in a bed at night skips to sunrise for you only. `G.sky` (the base one, wrapped first via a `drawHills` hook) runs with `Date.now` moved ahead by `RW.store` `v2_sleepskip` {off, until}. It clears when the real sunrise comes. Weather and market days stay on the real clock.
- v2s28: Cloudtop, a cloud land at tile x 190–670, top row 30 (`RW.v2cloud`, `meta.cl`: top/bot per column, npcs, homes, falls). Areas cl_meadow / cl_village / cl_grove / cl_isles. New tiles: cloud, cloudturf, pinkbrick, skyplank, rainbow (platform), skyflower, bigbloom, giantbloom, cottontree, skylamp, cloudportal, rfountain, starbloom, skycrystal. `WD.recalcSky` wrap so the ground below still counts as open sky. The town portal menu goes up (`P.interact` + `E.useHandlers.townportal` wraps), `cloudportal` comes down. Falls from the cloud are capped at vy 80. Fine weather on the cloud (`backdropUnder` around `drawWater`, `G.sky` hook), twilight + stars over the isles. Cloud folk art drawn in code from the "Lil guys" sketch (`RW.v2cloudArt`). Two Scribbles (`cl_scribble`, respawn after 8 minutes), Mayor quest flags `cl_mayor`/`cl_scrib`.
- v2s27: golden boss chests (tiles `goldchest` + filler `goldchestr`, placed near `meta.riftAt` in every world with `def.boss`, `meta.goldChest`; sealed until the boss is beaten; once per hero via `P.flags.goldchest_<wid>`; loot in `openGold()`, art in `drawChest()`); silver den chests (tiles `silverchest` + `silverchestr` on each den floor, `meta.dens[i].silver`; open once per Mother kill: kills in `P.flags.mkill_<denId>` via an E.kill wrap, openings in `P.flags.silver_<denId>`; loot in `openSilver()`, `SILVER` palette).
- v2s26: Storage Chest by-hand recipe + one free chest (`P.flags.gift_chest`), clears cave walls in open air at x 228–296, the Stormmark (`RW.v2powers` define/grant/revoke/has, `innate` hook for a future rune sword; `RW.v2storm` numbers; look via `A.dressed` wrap + `scary()`; crackle arcs; net messages `v2zap`, `v2pw`).
- v2s25: weather (`RW.v2weather`, `RW.v2setWeather(kind)` for testing), sunrise/sunset colours (hooks `RW.game.sky` on the first frame), clouds, rain/snow/fog/lightning, wind only strong high up (`E.move` wrap) and ground motes, tree root feet (`WD.drawTiles` wrap), Broodwing stats, rupees (`rupee_g/b/r` drops convert to 'coin' on pickup; page text says rupees).
- v2s24: themed caves (`customCaves`, zones galleries/roothollow/magmahall/grotto/geode in `meta.v2caves`), cave rock + painted walls, hanging roots/stalactites/lichen, flowing lava + Cooling Crust (`WD.flowWater` wrap), lavafalls (`meta.v2lavafalls`), clams (`meta.v2clams` beds).
- v2s23: wider Fuzzy World, Deep Tanglewood, giant trees (`giantTree`), home-trees (`homeTree`), dens (`den`), Mother Scorpion, Curlmanes, tame ridgebacks/shellbacks, fireflies/sunbeams/butterflies/far trees (`WD.drawHills`/`drawLight` wraps), waterfall, smoother ground (`seam`/`fillet`), everyday tree leaves and bark (outermost `A.drawDecor` wrap, replaces v2s9's flat squares, also draws v2s5's falling trees), restored slinger art (pixel data `SLING_OLD`).
- v2s22: ridgeback/shellback/rider art and species, centipede bats, Captain Shellbrace, Tanglehold defenders.
- v2s21: back hits, daze/poise, bump beats.
- v2s20: Tanglehold (temple, NPCs, quests, Strangler, ruins).
- v2s19: weather magic (V). v2s16: busier caves, more chests, fall damage. v2s15: runes. v2s2: magic, staffs, coins, trader, legendary chests.
  (One-line summaries of all modules are in README.md.)

## Testing (headless)
- Serve the repo root: `python3 -m http.server 8765`, open `/four-brothers-world-v3/index.html` with Playwright (Chromium is preinstalled).
- Block (route-abort) Google Fonts, peerjs, supabase, `/js/config.js`, `account.js`, `broadcast.js`.
- Start a game in the page: `P.species = 'fuzzy'; P.look = RW.art.defaultLook('fuzzy'); RW.game.newCharacter(); await RW.game.start();`
- Time of day: override `Date.now` (the day is 480 real seconds; `t = (now/1000 % 480)/480`, noon at 0.5).
- Screenshots at 1100x680 show 34x21 tiles; for a wide view, hold the player at grid points and stitch shots.

## Publishing
- From the session's clone: commit on `main` and `git push origin HEAD:main` (GitHub is linked with push access).
- Then check the "Deploy Dya'Akara to GitHub Pages" and "…Firebase Hosting" runs: `gh run list -R TheDothOfYak/Dya-Akara-mbarutatu.3` (re-run Pages if it times out), and the live files.
- If push is ever blocked again: use the GitHub upload page in the browser (`github.com/TheDothOfYak/Dya-Akara-mbarutatu.3/upload/main/four-brothers-world-v3`) and commit straight to main.
