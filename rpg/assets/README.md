# Assets for Torcain's Run

## Your own models

Put a `.glb` (or `.gltf`) file in `rpg/assets/models/` and add one entry to `rpg/assets/models.json`. Nothing else needs changing. Remove the entry and the game goes back to the figure it builds itself.

```json
{
  "models": {
    "torcain": {
      "file": "models/torcain.glb",
      "height": 1.4,
      "yaw": 0,
      "hand": "RightHand",
      "anims": { "idle": "Idle", "walk": "Walk", "run": "Run", "attack1": "Slash", "attack3": "Overhead", "roll": "Roll" }
    },
    "foe_rodak": { "file": "models/rodak.glb" }
  },
  "props": [
    { "file": "models/statue.glb", "region": "xilia", "x": 10, "z": 40, "yaw": 90, "height": 3, "solid": true }
  ]
}
```

**Who can be replaced**

| Entry | Who |
| --- | --- |
| `torcain`, `tanoc`, `phorus` | Torcain grown, young Tanoc, Phorus |
| `npc_<look>` | A named townsperson by their look, e.g. `npc_buhkon` (the looks are the keys of `NPC_LOOKS` in `js/npcs.js`) |
| `foe_<type>` | A creature, e.g. `foe_punk`, `foe_rodak`, `foe_kipsu`, `foe_gynge` (the types are the keys of `TYPES` in `js/enemies.js`) |
| `eikar` | Every Eikar who has no entry of their own |

**Settings for a model**

- `file`: the path inside `rpg/assets/`.
- `height`: how tall it stands in the game, in metres. Leave it out and it is made as tall as the figure it replaces.
- `yaw`: degrees to turn it if it faces the wrong way. `y`: metres to lift or lower it.
- `hand`: the name of a bone to put the weapon in. Leave it out and no weapon is drawn.
- `anims`: which of the model's animation clips plays each move. `runSpeed` and `walkSpeed` say how fast (metres a second) the run and walk clips were animated, so feet match the ground; the defaults are 7 and 2.2.

**Moves the game asks for:** `idle`, `walk`, `run`, `jump`, `fall`, `roll`, `attack1`, `attack2`, `attack3` (the heavy blow), `attack4` (a thrust), `attack` (creatures), `hurt`, `talk`, `drink`, `sit`.

You don't need all of them. Clips whose names already say what they are (Idle, Walking, Run, Jump, Attack, Roll) are found without being listed. A move with no clip uses the nearest one: `attack2` falls back to `attack1`, `run` to `walk`, `walk` to `idle`. Attacks and rolls are stretched to the game's own timing, so a blow lands when the game says it does.

**Models with no animations**

- A model with a skeleton but no clips is walked by its bones. This expects Mixamo-style bone names (Hips, Spine, LeftUpLeg, LeftLeg, LeftArm, LeftForeArm, Head).
- A model with no skeleton is moved as one solid piece: it bobs with its stride, leans into a run, squashes when it lands and tips into a blow.

For the best result, give a humanoid model a skeleton and clips. Mixamo (free) will rig an upload and add walk, run, attack and roll animations; export as FBX, convert to `.glb` in Blender with all clips in one file.

**Scenery (`props`)** stands a model on the ground at `x`, `z` in one region (`xilia`, `property`, `aakalay`, `leotik`). `height` sizes it in metres, `solid: false` lets you walk through it.

**Keeping it light:** aim for under about 50,000 triangles and 5 MB a character, with textures of 1024 or 2048 pixels.

## Surfaces (`tex/`)

Photographed materials laid on walls, ground, roofs and bark: `<name>_a.jpg` is the colour and `<name>_n.jpg` the normal map (OpenGL style). `means.json` holds each colour picture's average colour. To change a surface, replace its two files and its line in `means.json`.

All of them are from [Poly Haven](https://polyhaven.com), licence CC0 (public domain):

| File | Poly Haven asset |
| --- | --- |
| `land` | leafy_grass |
| `rock` | rock_face |
| `stone` | medieval_blocks_02 |
| `plaster` | white_rough_plaster |
| `wood` | brown_planks_03 |
| `shingle` | clay_roof_tiles |
| `cobble` | cobblestone_floor_08 |
| `brick` | medieval_red_brick |
| `bark` | jolcham_oak_bark_01 |

## Shapes (`shapes/`)

`rocks.glb` holds nine boulders scanned from real ground, cut down to a few hundred faces each (positions only; the rock surface is laid on by the game). Every plain rock in the game takes one. From Poly Haven, CC0: rock_07, rock_09, rock_moss_set_01, boulder_01.
