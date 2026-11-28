© 2026 Isaac Flake. All Rights Reserved.

# Lútut Rider: design notes

You are an Eikar riding a Lútut out from the roost, as far as it will go. Each ride ends when something
goes wrong. You come back with teeth, spend them, and ride further next time.

## What makes it its own game
- **Flight, not driving or flapping.** The Lútut is a heavy stone drop with bat wings. Speed makes lift,
  the nose decides where the lift goes, and too steep a nose stalls it. It can't climb on beats alone
  (beats weaken as the nose rises, and a stall drops the nose), so the rhythm is: dive for speed, swoop
  up, glide, beat a little, dive again. Holding BEAT does not keep you up.
- **Fuel is hunting.** The gullet is the fuel tank and it only refills with meat. You don't pick up cans:
  you swoop down on prey that runs (Hoppers), scatters (Byrds), is too heavy to take slowly (Shellbacks)
  or only shows itself mid-leap (Mud Eels). Lútut are carnivores and never bite: they suck prey in.
- **A fragile end and a hard end.** The head is near unbreakable and smashes stones; the thin tail cracks.
  So you want to come in nose-level or nose-down and fast, the opposite of a careful landing, but too
  steep or too hard throws your Eikar.

## How it looks
- **The taming, in 3D** (`js/lr_tame3d.js`): Torcain's Run's Lútut model and Eikar, three.js from `rpg/vendor/`,
  the same lighting as Torcain's Run's open regions. Phases: arrive (it circles and lands), creep (move only while
  it isn't looking; caught moving, it screeches you back), leap (GRAB when close and it isn't looking), buck (balance
  needle: its roll pulls you to the low side, lean against it; GRAB through screeches and barrel rolls; wildness
  drains while you stay steady; thrown off, you try again with a little wildness back), calm (it glides down: tamed).
  Harder for a grown (×1.3) and an old (×1.6) Lútut. If 3D can't start, the Lútut is simply given to you.
- **The ride, storybook** (`js/lr_art_tw.js`, the default): painted the way Four Brothers: Tuftwood is
  (`mini-games/tuftwood/src/paint.js`, `scenery.js`, `sky.js`, `heroes.js`): a warm ink line (#3a2a22) round
  everything, gradients lit from the upper left, pom-pom trees, earth with strata, roots and inked pebbles, a
  three-tone grass line with hanging turf and blades in front, glow clouds and light shafts, glossy storybook eyes,
  a paper grain, Gaegu. The Lútut is painted in that manner (drop body, lamprey ring of teeth, glowing eye under a
  heavy brow, horns, bat wings with finger bones, spiked tail ball); the Eikar has Tuftwood's acorn cap for its
  Aagac. The roost menus switch to Tuftwood's parchment and ink with it.
- **The ride, pixel** (`js/lr_art.js`): the 4 Brothers Worlds way: drawn at 9.6 art pixels to the metre into a small buffer
  and scaled up with no smoothing. The Lútut is the 4 Brothers sprite (`img/fbw_lutut_*.png`, copied from
  `art/lutut/sprites/`), turned in 7.5° steps; the rider sits on the back at a seat measured per frame.

## Rules (all in `js/lr_sim.js`)
- Lift = `0.06 × lift × CL(α) × v²`. CL rises with the angle of attack to a stall at 0.42 rad, then falls.
  Tucked wings give almost no lift and little drag.
- Pitch: BEAT +2.5, TUCK −4.2 (× turn), plus the air turning the nose to follow the flight, and the stall drop.
- Meat: 1.6·√mass per second always, plus `beatCost` while beating.
- Landing (impact = speed into the ground, diff = body angle minus slope):
  thrown if |diff| > grip or impact > hardHit; a crack if nose-up (diff > 0.22) and impact > 0.55·tailHit,
  or level and impact > 1.3·tailHit; head-first landings never crack, they plough (lose speed).
  Clean landing: more than 1 s in the air, impact under 5.5, |diff| under 0.3.
- Stones break head first above `smashV × (0.6 + h/6)` m/s (trees need 1.5× and are taller).
- Ends: thrown, tail shattered, sank (marsh water), fell (chasm), hungry (empty and stopped 1.5 s).

## Progress
- Teeth: pickups (1/5/25/100 by distance), prey, tricks × (1 + distance/1500), and 0.25 per metre.
- Lútut: Young (free), Grown (2,500), Old (9,000). Upgrades per Lútut: wing membrane, gullet, tempered
  tail, saddle and straps, 10 levels each, cost `upBase × 1.62^level`.
- Regions: Beuhk Downs (free), The Road North (1,500), The Shard Canyons (6,000), Duskwater Marsh (15,000),
  Storm Ridge (40,000). Every region is the same land each time (seeded), so it can be learned.
- Medals per region at 500 / 1500 / 3000 / 6000 m; twelve feats, each paying once.

## Ideas for later
- A Screech button (the throat lights red) that scatters Byrd flocks into your path or stuns a Shellback.
- TailSmack / TailSwipe as a third control, to break things the head can't reach.
- Daily ride: one shared seed a day, with a board of the best distances.
- Eikar riders to choose (Kiet, a Duskareth Vel thrower...), each with a small perk.
