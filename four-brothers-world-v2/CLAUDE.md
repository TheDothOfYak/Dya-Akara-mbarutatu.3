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
- Zones: 'deepjungle', 'highlands', 'den' (v2s23), 'jvillage' (v2s20), plus the base ones.
- Saves: block changes are stored by OLD index (800-wide); new land gets indexes from 256000 up (`toStore`/`fromStore` in v2s23). Keep this if the world changes again.

## What each module does (newest first)
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
