# PROGRESS — Dya'Akara VR

Updated after every milestone. Newest state first.

## Status

| # | Milestone | State |
|---|---|---|
| 0 | Foundation | **Done, gate passed** |
| 1 | The match | **Done, gate passed** |
| 2 | The tower | **Done, gate passed** |
| 3 | The town | Next |
| 4 | The workshop | Not started |
| 5 | The wilds | Not started |
| 6 | Multiplayer | Not started |

## Milestone 2 — The tower (done)

Gate: *collection persists; sandbox runs a two-token test.* Passes.

Done
- Local save file (`user://save.dat`): collection, pouches, open pouch, showcase, gold, materials. New game gives 32 tokens and a first pouch of 20.
- Tower scene (`-- --scene=tower`, the default start): round room, desk, four element trays (Su, Eldi, Fti, Ular) with coins stacked in layers, open pouch on the desk with a live count out of 25 and a cost-and-element tag per token (grip a tag to pull that coin out), saved pouches on wall hooks (touch one to put it on the desk), eight display cases up the stair.
- Flat browse panel: element filters, kind filter, sort by name, rarity or cost, list and grid views, pages. Pressing a row floats that token to your hand.
- Grab a token for the physical coin; press A to wake the hologram with name, element, rarity, size, cost, stats, temperament, special rules, description and background. Grip with the other hand and pull apart to grow it to true size, where it stands on the floor to walk around.
- Practice sandbox (`Sandbox`, usable in any scene): Duel option beside the hologram, or drop a coin on the field. Two tokens, normal creature rules, no resources or costs, pick up and move creatures (frozen while held), swap, pause, reset (same fight again), close.
- Signpost by the door: practice match with the open pouch, town, workshop, wilds.

Checked by
- 59 headless checks pass (53 rules checks plus 6 save checks run with `-- --selftest`).
- Tower autoplay (`-- --scene=tower --autoplay --fresh --save=bot`): pulled a coin from a tray into the pouch (20 to 21), woke two holograms, used Duel twice, and the sandbox ran both creatures. Screenshot inspected.

Known problems and limits
- The kind filter stands in for text search (no keyboard in VR yet).
- Pouch names cannot be changed in VR yet.

## Milestone 1 — The match (done)

Gate: *full match vs AI starts, plays, ends; replay is exact.* Passes.

Done
- Match scene (`scenes/match.tscn`, run with `-- --scene=match`).
- Setup: horde token with three turnable rings (pulse interval, resources per pulse, scale), default chaos with all rings at the bottom, tap the two hordes together to link, votes meet in the middle, tournament settings replace the vote.
- On link: terrain hologram (plains, forest, mountain, desert) covering the arena and beyond, both hordes in their fixed spots, ground-edge outline, a Relic stone floating over each horde, a stand under table-sized fields, stadium stands and a crowd around big arenas.
- Pouch on the hip, no sight into it: thumbstick moves your fingers, haptic ticks tell the size, grip pulls one token, B tips them all onto the table, letting go over the pouch puts one back.
- Token coins show cost on the face as jewels in each resource's colour and shape. Rub to pay in pieces: thumbstick flick for one resource (up Fti, right Su, down Eldi, left Ular) or touch the coin with the other hand. Partial payment stays on the token.
- Throw with the arm (release velocity), with reach scaled to the arena and clamped to the creature's reach. A token can be thrown unpaid and picked back up.
- Spawn: hold grip + trigger for the laser, point at the coin, press A. Works at any time, no pulse wait.
- No pulse timer: a tone, a ripple on both controllers and new resource shapes around the horde. In big arenas your resources also float above you.
- Placeholder creatures with team rings, flyers at altitude over the crowd, per-creature tether with fade and dissolve, ghosting near your head, escalation layers on the pulse tone, victory or defeat shown on the hordes and a floating stats panel.
- Audio engine: spatial sounds scaled to the arena, priority mixing with ducking, loud-event limiter with a warning cue, adaptive placeholder music, volume settings.
- Replay saved after every match (`user://replays/last.replay`).
- Autoplay bot (`-- --scene=match --autoplay`) that plays a whole match through the simulated hands.

Checked by
- 47 headless checks pass.
- Autoplay ran three complete matches (tabletop, large table, person-sized) through the hand controls: link, rummage, rub, throw, laser spawn. Each ended by Relic capture and each saved replay reproduced the final state exactly.
- Screenshots of setup and play inspected.

Known problems and limits
- Matches are short (about one to two minutes) because an unanswered Relic runner wins. The AI waits 20 seconds before its first move to give a new player time. Balance needs Yak's eye.
- Rubbing uses the thumbstick or a touch from the other hand. A true thumb rub needs hand tracking, which is not built yet.
- The opponent is shown as a simple figure. The terrain is scenery only.

## Milestone 0 — Foundation (done)

Gate: *empty scene runs in simulator; simulation passes replay tests.* Both pass.

Done
- Godot 4.3 project in `vr/`, OpenXR enabled, Compatibility renderer (the cheapest path for a Quest-class headset).
- Headset rig with a built-in **desktop simulator** that takes over when no headset is found. Smooth walk, snap or smooth turn, teleport, vignette, seated offset and handedness are settings.
- One `Hand` class for both devices: grab, release with throw velocity, two-button laser, touch, haptics.
- **Simulation core** (`sim/`), ported from the 2D engine: seeded RNG identical to 2D bit for bit, pulses, same-count resources, escalation, pay in pieces, throw, spawn at any time, per-creature tether, flyers with altitude, Relics, +1 cost after a defeat, AI opponent, input log and exact replays.
- Creature data: one folder per creature with `creature.json` (11 creatures: the 7 launch creatures and 4 from the 2D roster).
- Placeholder generator: every creature is built from simple shapes with idle, walk, attack, hurt, fly and death motion.
- Drop-in check script: data file, triangle budget, texture size, scale, missing animations and attachment points, all reported in plain words, with placeholder fallback.
- Tests: 43 checks, all passing (`tests/run_tests.gd`).

Checked by
- `godot --headless -s tests/run_tests.gd` → 43 passed, 0 failed.
- AI-versus-AI matches replayed from their saved logs match at every checkpoint and end in the identical state.
- The scene was run in the simulator under a virtual display and a screenshot inspected.

Known problems and limits
- No real headset has been used. OpenXR start-up is coded but untested on hardware.
- Creature brains are first-pass ports. The 2D game's quirks, mounts, builders, fortifications and the other 2D species are not ported yet.
- Terrain does not block movement yet (the 2D obstacles are not ported).
