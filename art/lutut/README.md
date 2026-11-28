© 2026 Isaac Flake. All Rights Reserved.

# Lútut model (second pass, for review)

Built in Blender (5.3, run headless through the `bpy` Python module) from Isaac's sculpt `Lutut.obj`
(Google Drive: Render / Lútut, about 100 MB, exported from Nomad Sculpt). The .obj is too big for
GitHub, so it stays in Drive. **Not in any game yet**: this folder is the source, waiting for review.

## What's here
- `lutut.glb`: the game-ready model (3.5 MB). 41k triangles, 52 bones, 4 textures (2048 px), 10 animations, 2 eye lights.
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
  13 tail bones (`tail1`…`tail13`) plus `tail_ball` (the spiked ball is weighted 100% to it, so it swings as one solid club), and for each wing `upperarm`, `forearm` and four two-bone fingers;
  four legs (`front_`/`back_` `thigh`, `shin`, `foot`, `.L`/`.R`). Skinned with Blender's automatic weights,
  4 bones per vertex.
- **Paint:** near-black skin with a faint violet cast (darker on the back, a touch lighter on the belly),
  slightly lighter ridges, claws and spines, dark red lamprey gums and gullet, dull bone teeth, horns dark
  at the base to dull bone at the tips. Eyes: the two part-sphere domes under the brow beside the horns,
  painted yellow with an emissive glow (strength 4), plus a small yellow point light just in front of each eye
  (`EyeLight.L`/`EyeLight.R`, children of the `head` bone, exported with KHR_lights_punctual). Three.js reads the
  light intensity as 109; set it to about 0.9 with distance 0.9 (as the viewer does).
- **Animations:** `Idle` (hovering wingbeats), `Fly`, `Glide`, `Walk` (wings stay tucked, four-legged gait,
  tail held off the ground), `Bite`, `TailSwipe` (sideways club), `TailSlam` (tail coils over the back and smacks
  the ball down in front of the face), `Screech`, `Hurt`, `Death`. Attack, hurt and death play once; the rest loop.
  Wingbeats twist the membrane back and half-fold the fingers on the upstroke, so the wings never stand straight up.
  The tail swings with a delay along its length in every clip, so it follows the body.

## Rebuilding
Put `lutut.obj` in a work folder, set `LUTUT_WORK` to that folder, then run each script with
`python3 <script>` (needs `pip install bpy`):
`import_obj` → `s1` (clean, recentre, decimate) → `rig` (uses `bones.py`) → `paint` → `bake` → `mat`
→ `anim` → `export`. `look.py` and `asheet.py` render previews. Colours live in `paint.py`, bone
positions in `bones.py`, motion in `motion.py` (`posepv.py` renders single poses).

## For the games (later)
`rpg/assets/models.json` can take it as `"foe_lutut": { "file": "models/lutut.glb", "anims": { "idle": "Idle",
"walk": "Fly", "run": "Fly", "attack1": "Bite", "attack2": "TailSwipe", "attack3": "TailSlam", "attack4": "Screech", "hurt": "Hurt" } }`
once it is approved.
