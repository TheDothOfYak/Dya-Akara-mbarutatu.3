# 3D battle preview (`3d-battle` branch)

This branch turns the match battlefield and every creature into real 3D (three.js),
while the live game on `main` stays exactly as it is.

## Where to see it
- Every push to `3d-battle` deploys to a Firebase **preview channel** (its own URL,
  `https://dyaakara-yak--3d-battle-<hash>.web.app`). The link is printed in the
  "Preview the 3D battle branch" GitHub Action run summary. It expires 30 days after the last push.
- `/tools/arena3d.html` on that link is a no-login test arena: an AI-vs-AI battle
  or a gallery of every creature, on any terrain set.

## What changed
- `js/engine3d/models.js`: procedural 3D models for every sprite rig (quad, punk,
  biped, bird, flame, crab, gynge, stryx…), with the design-doc shader treatments:
  magical shimmer, bioluminescence, tether fade and hit flash.
- `js/engine3d/render3d.js`: a 3D twin of `engine/render.js` (same API), with
  the arena, stands and crowd, terrain props, structures, relics, orbs, projectiles,
  effects and an HP-bar overlay. The simulation (`engine/match.js`) is untouched.
- `js/vendor/three.min.js`: three.js r149 (MIT), vendored so nothing loads from a CDN.
- `js/engine3d/viewer3d.js`: the token detail page shows the token's battle model on a pedestal. Drag to spin, scroll or pinch to zoom, and use the pose buttons (idle, walk, run, attack, special, hit, fly).
- `index.html`: four extra `<script>` lines. Delete them to go back to 2D only.

## Controls
Right-drag to orbit · mouse wheel to zoom · middle-drag (or shift + right-drag) to pan · Q / E to rotate.
🎬 Action cam follows the fighting (on by default when you're spectating). Double-click a creature to follow it; double-click empty ground to stop.
On touch: two-finger pinch and twist. The camera panel on the left has rotate,
zoom, reset, bird's-eye and a **2D** switch. In 2D a **3D** button switches back.
`?2d=1` or `?3d=1` on the URL forces either view.

## Note
The preview uses the same Supabase backend as the live game, so accounts,
gold and matches played there are real.
