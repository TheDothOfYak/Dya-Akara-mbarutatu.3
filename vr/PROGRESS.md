# PROGRESS — Dya'Akara VR

Updated after every milestone. Newest state first.

## Status

| # | Milestone | State |
|---|---|---|
| 0 | Foundation | **Done, gate passed** |
| 1 | The match | **Done, gate passed** |
| 2 | The tower | **Done, gate passed** |
| 3 | The town | **Done, gate passed** |
| 4 | The workshop | **Done, gate passed** |
| 5 | The wilds | **Done, gate passed** |
| 6 | Multiplayer | **Gate passed; parts still to build (see below)** |

## Art pass (after milestone 6)

Yak asked for the game to be beautiful, not shapes on a blank background. Everything is still generated in code (`presentation/art.gd`), so it ships at no cost and any piece can be replaced by real art.

Done
- The sky over Xikia: Velki huge and close, Leotik small, Xikia's little Kalo, drifting cloud, Pia'don's light, stars at dusk. Haze, soft shadows, bloom and filmic tone in every scene.
- Sri'Ciakala: seven massive ancient trees with flared roots, homes with lit windows on four decks each, stairs winding round the bark, rope bridges, strings of lanterns, blossom in the crowns, roots running down into the sea as reef, living water with foam at the shore, the castle on its hill with banners, a paved square, striped awnings on all 16 stalls, a thatched tavern, meadow grass and flowers that move in the wind, pollen and sea spray in the air.
- The wilds: rolling land coloured by habitat, forest of varied trees with fireflies, bog pools with reeds and mist, weathered cliffs, a boulder shore, the sea, and a great-tree gate home.
- The tower: high above the land at dusk, a balcony open to the sea and to Velki, stone walls, lanterns, rug, bookshelves.
- The workshop: a wide window onto the evening, beams, lanterns. Matches, lobby and replays stand in open Xikia countryside. Match terrain is a true hologram with a glowing lattice.
- Creatures and props have smooth forms, surface grain and a rim of sky light.
- Weapon swings are now measured on the physics clock, so frame rate cannot hide a swing.

Checked by
- All 107 headless checks pass. The match, tower, town, workshop and wilds bots all pass again on the restyled scenes. Screenshots in `docs/`.

Known problems and limits
- Frame rate is untested on a headset. The town and the wilds are much heavier than before (thousands of grass tufts, many trees, shadows). They will need a lower-detail setting for a Quest-class headset.
- Creatures are still built from simple shapes. They wait for real models through the drop-in folders.
- You cannot yet walk up the stairs to the tree decks.

## What to do next (for whoever continues)

1. Put it on a real headset. Nothing has run on hardware. Check OpenXR start-up, controller button names, comfort, frame rate at 72 fps, and every hand interaction.
2. Walking around a friend's town together (avatars, shared NPCs). Today a friend joins by code for a match only.
3. An internet rendezvous for town codes. Today the joiner types the host's address as well as the code (same network, or a forwarded port).
4. Player-run and Guild-sealed tournament brackets. Today there is one tournament match at the arena gate, with cards, fixed scale and terrain.
5. Port the rest of the 2D roster and the full 2D behaviour trees; use them in the wilds too.
6. Hand tracking, offers and negotiation at stalls, foraging, Yak's lines, music, songs and models.

## Milestone 6 — Multiplayer (gate passed)

Gate: *two clients play one match together.* Passes.

Done
- `net/net_session.gd`: host-authoritative, deterministic. Every machine runs the same simulation and only inputs cross the network; the host stamps each input with its tick and sends one frame per tick; a state hash every 5 seconds catches drift.
- Town code as the password to the host's town; a wrong code is refused in plain words. Each visitor plays with their own pouch from their own collection. Ring votes from both players meet in the middle.
- Spectators receive the same frames (late joiners get the backlog), sit in the stands, cannot move onto the field and can send nothing.
- Disconnects: 10 seconds to come back under the same name, then the remaining player takes the win.
- Lobby scene (sign in the town square, or `-- --scene=lobby`): your town code and address, a keypad for the friend's address and code, your horde token to set ring votes, Host, Join, Watch.
- The match scene plays either side or spectates, driven by the session.
- Replays as holograms (`-- --scene=replay`, or "Watch last replay" by the arena gate): any of the five scales, free movement around the field, pause, rewind (re-simulated exactly), and an exactness check at the end.

Checked by
- Three headless processes (host, friend, spectator) played one match to the end with identical final state hashes and no drift; a joiner with the wrong code was refused.
- A headless host plus two rendered clients: one played side 2 through the simulated hands in the VR match scene, one watched from the stands. All three ended at the same tick with the same hash, and the saved replay was exact.
- All 107 headless checks pass (53 rules, 54 in-game).

Not built yet
- Walking around a shared town with a friend, internet play without typing an address, tournament brackets, in-VR friend invites (wrist menu, open question 1).

## Milestone 5 — The wilds (done)

Gate: *a hunt yields a piece, and the token matches the creature.* Passes.

Done
- Wilds scene (`-- --scene=wilds`): a walkable region around the town gate with shore, sea, forest, bog and the cliffs under the sky habitat. Walking back through the gate ends the hunt.
- Persistent population (`sim/wilds_sim.gd`): 24 unique individuals (three of each launch creature and the Wild Punk), each one a token-shaped record with its own age, experience, temperament and stats, a home territory, health and a memory of you (seen, hurt, spared, fed). Saved with the town copy. Each day they age, roam, heal, forget a little, shed pieces, and the dead or old are replaced by newcomers.
- Hunting as yourself (`sim/hunt_rules.gd`): no slots, levels, cooldowns or piece limits. Creatures act on temperament and memory, give a tell before striking, and yield at a quarter health, so killing is never required.
- Pieces, each taken its own way: shed pieces are picked up off the ground; a tooth, tusk or claw is cut with the knife from a trapped or beaten creature; a shaving comes off a calm, trapped or beaten living creature. The piece records how and where.
- Kit on your belt: blade, spear (must be thrust), bow (draw with the other hand), whip (the lash trails and cracks), knife. Damage comes from how fast the weapon really moves. Anything you let go of is thrown. Raise a weapon to block. Armor reduces damage and heavy armor tires you faster.
- Tools: trap (holds a walker that steps on it), bait (draws a creature and is remembered), camp (cook, sleep on a bedroll which passes a day, token sandbox as holograms).
- Survival: hunger and tiredness drain while away; an empty meter makes you slower and weaker. Food, cooked meals, sleep.
- Failure: beaten, you wake in Sri'Ciakala without your food and new pieces. Tokens are never lost.
- Guides paid in town mark the way to the creature they named.

Checked by
- 24 wilds checks in `-- --selftest` (54 in all).
- Wilds autoplay: took blade and knife from the belt, fought a Sru Vorn down with real swings, cut a tusk from the yielding creature, walked back through the gate; the piece reached the workshop rack and the crafted token matched the creature exactly.

Known problems and limits
- Creature behaviour in the wilds is lighter than in a match: roam, flee, attack with a tell, yield. The full match decision trees are not used out here yet.
- No foraging and no swimming; sea creatures come to the shallows.
- Combat numbers are first guesses and need play on a headset.

## Milestone 4 — The workshop (done)

Gate: *crafted token enters the collection and works in a match.* Passes.

Done
- Workshop scene (`-- --scene=workshop`): rack of pieces with tags (what it becomes, material cost, whether you have enough), Okid count and NgAkara vial on the bench, dark plate, Okid'Relic with a lid.
- The ritual by hand: lay the piece on the plate, grab the vial and tilt it over the piece (the veins fill electric blue), seat the piece in the Okid'Relic, touch the lid to close, the creature's song plays and runes circle, the token flies to your hand. Skip button. Shelf button for pieces you are not ready to craft.
- Rules: 2D cost table by rarity, refusal when short (empty vial, the piece will not take the fluid), token is exactly the creature when the piece was taken, behaviour value and background story locked at crafting, story written from where and how.
- A new game starts with one found piece so the ritual can be tried before the first hunt.

Checked by
- 9 workshop checks in `-- --selftest` (30 in all), including paying, throwing and spawning the crafted token in a match.
- Workshop autoplay did the whole ritual with the simulated hands; the collection went from 32 to 33 and the coin ended in the hand.

Known problems and limits
- Songs are placeholder melodies, one per creature.
- Only the vial is a tool.

## Milestone 3 — The town (done)

Gate: *ask an NPC on the spot, play and settle a wager.* Passes.

Done
- Sri'Ciakala scene (`-- --scene=town`): market square, great trees with homes on four levels, the sea, the castle hill, tavern with four tables, signs to the tower, workshop, wilds, arena gate.
- 16 stalls: weapons, food, armor, potions and misc (prices in `data/stalls.json`), 11 seller stalls with physical token listings and prices, and your own stall (list a token for the 2D listing fee, or sell to the Guild at 75%).
- 100 Dya'kukull generated per town copy with the 2D name generator: name, level, home, daily routine in four parts, personality, whether they play at all, whether they wager, whether they guide, and a real collection that persists. About 40 are out in town at a time; the rest are at home or away.
- Written dialogue only (`data/dialogue.json`, all Proposed placeholders): greeting by personality, rumors from the real creature population, guide hire, invitations, wagers.
- Touch a person (or laser + A) to talk: ask for a game on the spot, wager a pouch token, ask for rumors, hire a guide. Tavern people play at tabletop scale. NPCs vote on the rings automatically.
- Wagers settle when you return: a won token leaves the NPC's collection and enters yours; a lost one goes into theirs. Casual XP and gold are paid. Everything is saved.
- Arena gate starts a tournament match with fixed scale and terrain and shows tournament cards (player details and every pouch creature).
- Tavern sandbox against an AI token. Town clock: 24 minutes a day; stalls rotate and NPCs may buy your listings each day. Wrist label shows gold, day and town code.

Checked by
- 15 town checks in `-- --selftest` (21 selftest checks in all): 100 unique people, unwilling NPCs refuse, a willing NPC accepts, the match is played to an end, winning and losing both move the right token, saves round-trip exactly, market purchases work.
- Town autoplay: walked to an NPC, talked by touch, pressed Wager and Start, and the wagered match then ran to its end in the match scene.

Known problems and limits
- No offers or negotiation table, Notify Me or Requests yet. Buy now, listing, Guild buyback, tax and listing fee are in.
- People stroll in the square only; homes are scenery. Walking up the tree levels is not built.
- The wager stake is chosen with a "Stake another token" button rather than by holding out a token.

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
