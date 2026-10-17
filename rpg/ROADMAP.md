# Torcain's Run — young Tanoc's story: the 27-hour roadmap

The first part of the RPG runs from the last Skyfall on Velki to the **final Sniller battle**. Main story only, it should take about **27 hours** for a first-time player on **Easy**. Realistic will run longer, and side quests, bounties and token matches don't count toward the 27.

## The spine: six Sniller amulets

Tanoc gathers six Sniller amulets in Fyrsti'Vilag. Each one pulls him somewhere different, and each pull is a chapter. Chapter II (the Megla Aagac) is the first amulet. The sixth leads to the final battle.

## Hour budget

| # | Part | Chapter clock key | Target | Estimate now | Status |
|---|---|---|---|---|---|
| — | The Last Skyfall (Velki) | `velki` | 0.5h | ~0.3h | built: supper for the Ahoac crew, the spark drill, the spire, the gate |
| — | The Road North (six days) | `road` | 2h | ~1.5h | built: + the escape across Fyrsti'Vilag (12 amulets), the mended axle (day 3), supper in Beuhk (day 5) |
| I | The Carpenter's Apprentice | `ch1` | 2.5h | ~2.6h | built: the first day + the two summers (14 steps, 4 seasons): Venkin and Orrin, the amulet research |
| II | The Megla Aagac (amulet 1) | `ch2` + `token` | 3h | ~1.5h | built: + rockfall, mist cairns, deadwood, carved stones, Sru Vorn, patrols, day three home |
| — | Home interlude | `after2` | 0.5h | — | partly built |
| III | Amulet 2 | — | 3h | — | to design |
| IV | Amulet 3 | — | 3h | — | to design |
| V | Amulet 4 | — | 3h | — | to design |
| VI | Amulet 5 | — | 3h | — | to design |
| VII | Amulet 6 | — | 3h | — | to design |
| — | Home interludes between III–VII | — | 2h | — | to design |
| — | The final Sniller battle and its run-up | — | 2h | — | design later |
| | **Total** | | **~27h** | | |

The estimates are first-time Easy play, guessed from the content (walking distances, dialogue, fights). They are not measured yet. Up to the first token, that adds up to roughly 5.5–6 hours against the 8-hour target, so the opening still needs about 2 more hours before Chapter III. A playtest with the chapter clocks will show where.

## Measuring

Every save keeps total playtime (`save.time`) and a clock for each chapter (`save.chTime`). Both count gameplay, dialogue and cutscenes, but not pause menus, the title screen or the end card. The journal's **This Run** entry shows the time for each chapter. Play a fresh Easy run, then record the numbers in the table above.

## Rules for every new chapter

- **One new ability or Relic trigger** that opens something in places already visited (the property, Beuhk, the Duskareth keep).
- **One new creature, one boss.** The Gynge (two phases, telegraphed, a trick to learn) is the template.
- **The rhythm:** travel → a strange place → a ruin or dungeon → the boss → a night by the fire with the amulet's Sniller → home.
- **The Sniller's story moves forward** each chapter, building toward the finale.
- **Home changes** every time Tanoc comes back.
- **No padding.** Required fetch quests, grinding and long empty walks don't count toward the target.

## Saves

A run can last more than 20 hours, so updates must never wipe it. If the save's shape changes, bump `SAVE_V` in `js/progress.js` and add a step to `MIGRATIONS` that upgrades the old version. Raising `MIN_SAVE_V` deletes every run older than that, so don't.
