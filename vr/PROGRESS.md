# PROGRESS — Dya'Akara VR

Updated after every milestone. Newest state first.

## Status

| # | Milestone | State |
|---|---|---|
| 0 | Foundation | **Done, gate passed** |
| 1 | The match | Next |
| 2 | The tower | Not started |
| 3 | The town | Not started |
| 4 | The workshop | Not started |
| 5 | The wilds | Not started |
| 6 | Multiplayer | Not started |

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
