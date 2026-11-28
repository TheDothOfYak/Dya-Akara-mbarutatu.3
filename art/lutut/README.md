© 2026 Isaac Flake. All Rights Reserved.

# Lútut model (first pass, for review)

Built in Blender (5.3, run headless through the `bpy` Python module) from Isaac's sculpt `Lutut.obj`
(Google Drive: Render / Lútut, about 100 MB, exported from Nomad Sculpt). The .obj is too big for
GitHub, so it stays in Drive. **Not in any game yet**: this folder is the source, waiting for review.

## What's here
- `lutut.glb`: the game-ready model (3.5 MB). 41k triangles, 46 bones, 4 textures (2048 px), 9 animations.
  Faces +Z in three.js, feet at the origin, about 3.3 units wingtip to wingtip.
- `Lutut.blend`: the rigged, painted and animated Blender file (textures packed in).
- `blender/`: the scripts that made it, in order (see below), so any step can be changed and re-run.
- `previews/`: renders and viewer screenshots.

## What was done
- **Cleanup:** the .obj also held two copies each of a smooth drop shape ("Sperm") and a spiked ball
  ("Cone") hanging under the tail. They looked like leftover reference shapes, so they were left out.
  Only the creature itself ("Full") is used.
- **Game mesh:** decimated from 315k to 41k triangles; the full sculpt detail is baked into a normal map.
- **Skeleton (46 bones):** root, spine, chest, head, upper and lower lip (`jaw_up`, `jaw_low`),
  7 tail bones plus `tail_ball`, and for each wing `upperarm`, `forearm` and four two-bone fingers;
  four legs (`front_`/`back_` `thigh`, `shin`, `foot`, `.L`/`.R`). Skinned with Blender's automatic weights,
  4 bones per vertex.
- **Paint:** near-black skin with a faint violet cast (darker on the back, a touch lighter on the belly),
  slightly lighter ridges, claws and spines, dark red lamprey gums and gullet, dull bone teeth, horns dark
  at the base to dull bone at the tips. Eyes: the two slanted sockets under the brow, painted amber
  with a faint yellow glow (emissive texture).
- **Animations:** `Idle` (hovering wingbeats), `Fly`, `Glide`, `Walk` (wings folded, four-legged gait),
  `Bite`, `TailSwipe`, `Screech`, `Hurt`, `Death`. The attack, hurt and death clips play once; the rest loop.

## Rebuilding
Put `lutut.obj` in a work folder, set `LUTUT_WORK` to that folder, then run each script with
`python3 <script>` (needs `pip install bpy`):
`import_obj` → `s1` (clean, recentre, decimate) → `rig` (uses `bones.py`) → `paint` → `bake` → `mat`
→ `anim` → `export`. `look.py` and `asheet.py` render previews. Colours live in `paint.py`, bone
positions in `bones.py`, motion in `anim.py`.

## For the games (later)
`rpg/assets/models.json` can take it as `"foe_lutut": { "file": "models/lutut.glb", "anims": { "idle": "Idle",
"walk": "Fly", "run": "Fly", "attack1": "Bite", "attack2": "TailSwipe", "attack3": "Screech", "hurt": "Hurt" } }`
once it is approved.
