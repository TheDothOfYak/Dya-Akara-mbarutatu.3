# Dya'Akara VR

The full-immersion VR version of Dya'Akara, built in **Godot 4.3 + OpenXR**. Design: "Dya'Akara VR — Design Document (v2)". Build brief: FABLE-BRIEF.md. Progress: [PROGRESS.md](PROGRESS.md). Questions for Yak: [QUESTIONS.md](QUESTIONS.md).

## Run it

1. Install Godot 4.3 (standard build, free): https://godotengine.org/download
2. Open this `vr/` folder as a project and press Play.
3. With a headset connected through OpenXR it runs in VR. With no headset it starts the **desktop simulator** automatically.

Desktop simulator controls:

| Input | Does |
|---|---|
| Click, then mouse | Look |
| W A S D | Walk (left stick) |
| Q / E | Turn (right stick) |
| Tab | Switch the active hand |
| Left mouse / Right mouse | Trigger / Grip on the active hand |
| F / G | A / B button on the active hand |
| Hold Alt + mouse, wheel | Move the active hand |
| 1 2 3 4 | Thumbstick flick up / right / down / left |
| R | Put the hands back |

## Check it

```
godot --headless --import                      # once, after cloning
godot --headless -s tests/run_tests.gd         # rules, replays, saves
godot --headless -s tools/check_creatures.gd   # creature folders and dropped-in models
```

## Layers

| Folder | Layer | Holds |
|---|---|---|
| `sim/` | Simulation | Match rules, seeded RNG, AI, replays. No nodes, no graphics, no devices |
| `presentation/` | Presentation | Scenes, creature views, effects, audio |
| `input/` | Input | Headset rig, hands, desktop simulator, grabbing, laser, throwing |
| `data/` | Data | One folder per creature, loaders, saves, NPCs, dialogue |
| `tools/` | Tools | Check script, screenshot helper |
| `tests/` | Tests | Headless test runner |

## Dropping in a real creature model

1. Put the model (`.glb` preferred) in `data/creatures/<creature id>/`.
2. In that folder's `creature.json` set `"model": {"file": "model.glb", "scale": 1.0, "animations": {"idle": "...", "walk": "...", "attack": "...", "hurt": "..."}}` and fill `"attachments"` (eyes, mouth, hands, relic_mount as `[x, y, z]`).
3. Run the check script. It reports every problem in plain words. Anything missing falls back to the placeholder, so the game always runs.

No code changes are needed: the match, tower, wilds and token hologram all load whatever the folder holds.
