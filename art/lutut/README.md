© 2026 Isaac Flake. All Rights Reserved.

# Lútut model (fourth pass)

Built in Blender (5.3, run headless through the `bpy` Python module) from Isaac's sculpt `Lutut.obj`
(Google Drive: Render / Lútut, about 100 MB, exported from Nomad Sculpt). The .obj is too big for
GitHub, so it stays in Drive. The game copy is `rpg/assets/models/lutut.glb` (Torcain's Run).

## What's here
- `lutut.glb`: the game model (5.0 MB): 41k triangles, a 10k-triangle low-detail copy (`Lutut_LOD1`) on the
  same skeleton, 52 bones, 17 animations, hit points and collision spheres. Faces +Z in three.js, feet at the
  origin, 3.28 units wingtip to wingtip (the game scales it by 3.6, to about 11.8 m).
- `Lutut.blend`: the rigged, painted and animated Blender file (textures packed in).
- `blender/`: the scripts that made it, so any step can be changed and re-run (see Rebuilding).
- `previews/`: renders.

## The look
- Near-black hide with a faint violet cast, darker on the back, a touch lighter on the belly; lips the same dark hide,
  dark red only deep in the gullet, dull bone teeth, horns dark at the base to dull bone at the tips.
- **Eyes:** the part-sphere domes under the brow, beside the horns, yellow over the whole eyeball, under clear
  (glossy, uncoloured) lids. The glow is on the eyeball only: it comes from the emissive texture, there are no
  lights, and the game keeps it under its bloom threshold so no halo spreads onto the face.
- No carvings or bioluminescent lines (tried and taken out).
- **Throat:** the gullet is its own material (`LututThroat`) so the game can light it red while it screeches.
- No neck: the head never moves on its own, only with the body.

## Skeleton (52 bones)
root, spine, chest, head, upper and lower lip (`jaw_up`, `jaw_low`; the mouth can only flare wider, never close),
13 tail bones (`tail1`…`tail13`) plus `tail_ball` (the spiked ball is weighted 100% to it), each wing `upperarm`,
`forearm` and four two-bone fingers, four legs (`front_`/`back_` `thigh`, `shin`, `foot`, `.L`/`.R`).

## Hit points and collision (nodes riding the bones; radius in extras `lutut_radius`, kind in `lutut_kind`)
- `hit_mouth` (head): where it sucks things in. `hit_tail` (tail_ball): the spiked ball.
- `col_body_front/mid/rear`, `col_tail_1`…`6`, `col_tail_ball`, `col_wing_L0`…`L3` / `R0`…`R3`.

## Animations
| Clip | What it is |
|---|---|
| Idle, Fly, Glide | Hover, flight (tail working in a travelling S), glide. Wings twist back and half-fold on the upstroke. |
| Stand, Walk | On the ground: wings always tucked, slow breathing, tail relaxed straight out behind. |
| TakeOff | Wings spread wide and running, a jump, then strong flaps. Its root rises to 1.6 units: the game keeps it on the ground while this plays and sets its flying height to that when it ends. |
| LandGlide | Glides in, flares, touches down, folds its wings. Starts 2.2 units up and ends on the ground. |
| LandBarrel | Wings tucked, barrels into the ground, rolls over along its length and comes up on its feet. Same heights. |
| Dive | Folds back and stoops, flares the mouth at the bottom, pulls up. |
| Suck | Hovers, flares the mouth wide and draws in, the body swelling with the breath. It never bites. |
| TailSmack | The main tail attack: the tail whips down and forward under the belly. |
| TailSwipeL / TailSwipeR | The spiked ball clubbed out to its left / right. |
| TailSmackUp | Only for something above it: the tail coils over the back and hammers down in front of the face. |
| Screech | Rears up, mouth wide, shaking (the game lights the throat red). |
| Hurt, Death | |

## In Torcain's Run (`rpg/js/lutut3d.js`)
Loaded with the other models (`main.js`). Every Lutut (`enemies.js`, Megla's night sky, the Dya'Akara 3D board)
is played by this model; if it can't load, the old built-in Lutut is used. Its brain: rests on the ground and
walks a little, takes off, circles high, comes back in to land (glide or barrel). When it fights: a screech
(stuns), circling, then a dive with the mouth flared that pulls you in; then it hangs low over you and clubs with
its tail (under its belly, to the side you're on, or over its back if you're above it) or sucks, then climbs
again. Your hits, arrows and fire bolts measure against its collision spheres, and you can't walk through its
body. The tail also swings on its own when it turns or climbs. Age variants: young (smaller, paler, dimmer eyes),
adult, old (bigger, darker). The low-detail mesh shows beyond 46 m. Sounds (screech, wingbeats,
suck, dive, tail) are a first pass made with the game's own synthesiser (`audio.js`, `sfx._lutut`).

## Rebuilding
Put `lutut.obj` in a work folder, set `LUTUT_WORK` to that folder, then run each script with
`python3 <script>` (needs `pip install bpy`):
`import_obj` → `s1` (clean, recentre, decimate) → `rig` (uses `bones.py`) → `paint` → `bake`
→ `mat` → `anim` (motion in `motion.py`) → `export`. Then copy `lutut.glb` to `rpg/assets/models/`.
Previews: `look.py`, `lookc.py` (eyes and body, day and night), `asheet.py`, `posepv.py` (single poses),
`probe.py` (where the tail ball and mouth end up), `sprites2d.py` (side-view frames for the 2D games).

## Seen on the Road North (`rpg/js/road.js`)
On day two (the forest) and day four (the mountain pass), about twenty seconds into the day's walk, a Lútut
crosses the sky over the mountains ahead: flapping on day two, gliding low through the pass on day four. The
camera turns to watch it while Tanoc and the Carpenter talk about it, so it can't be missed.
