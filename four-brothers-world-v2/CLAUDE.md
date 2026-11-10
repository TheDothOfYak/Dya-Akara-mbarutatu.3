# 4 Brothers World V2: project map

Read this first. It says where everything lives, so a change doesn't need the whole game re-read.

## Ground rules (from McKay)
- Only change files in `four-brothers-world-v2/`. Never touch the main game (repo root) or Dya'Akara.
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
- Serve the repo root: `python3 -m http.server 8765`, open `/four-brothers-world-v2/index.html` with Playwright (Chromium is preinstalled).
- Block (route-abort) Google Fonts, peerjs, supabase, `/js/config.js`, `account.js`, `broadcast.js`.
- Start a game in the page: `P.species = 'fuzzy'; P.look = RW.art.defaultLook('fuzzy'); RW.game.newCharacter(); await RW.game.start();`
- Time of day: override `Date.now` (the day is 480 real seconds; `t = (now/1000 % 480)/480`, noon at 0.5).
- Screenshots at 1100x680 show 34x21 tiles; for a wide view, hold the player at grid points and stitch shots.

## Publishing
- From the session's clone: commit on `main` and `git push origin HEAD:main` (GitHub is linked with push access).
- Then check the "Deploy Dya'Akara to GitHub Pages" and "…Firebase Hosting" runs: `gh run list -R TheDothOfYak/Dya-Akara-mbarutatu.3` (re-run Pages if it times out), and the live files.
- If push is ever blocked again: use the GitHub upload page in the browser (`github.com/TheDothOfYak/Dya-Akara-mbarutatu.3/upload/main/four-brothers-world-v2`) and commit straight to main.
