# 4 Brothers World V2 (preview)

V2 is built on the main game (v1.8), so it has everything the main game has (account saves, Acorn World's waystones, beds, market day and the rest), plus the V2 changes below. It keeps its own saves on your account, separate from the main game. The first time you play V2 in a browser, it starts from the hero you already have there.

## How each hero moves
- **Rock (heavy):** slow to start (about a second to full walk speed), skids a couple of blocks when he stops, and barely steers in the air. Stronger gravity, and no fall damage: a hard landing thuds and knocks nearby monsters. Hold sprint for a run-up and he smashes through dirt and sand (not stone) and rams monsters for speed-based damage. Enemies shove him half as hard.
- **Ghost (light):** falls slowly and drifts on his own momentum, so he keeps going when you let go. Hover (hold jump) still works. Monsters shove him further.
- **Fuzzy (bounces):** landing from a height bounces him, and he takes no fall damage. Tap jump just as you land for a big bounce, or hold S to stick the landing. Hold jump while falling and he sucks in air and floats down slowly (uses stamina).
- **Acorn (climbs, glides):** clings to walls and slides slowly. Hold toward a wall and W to climb it (uses stamina). Space kicks him off the wall and gives his double jump back. Hold jump while falling to glide on a leaf (uses stamina).

## Swimming
- No more "hold jump to rise". Each jump press is a **stroke** in the direction you hold (up by default), then you glide against the water's drag. A stroke at the surface leaps you out. S dives.
- **Fuzzies** drift up toward the surface. **Acorns** float and bob on top. **Ghosts** hang neutral where you stop.
- **Air:** everyone but the rock needs air now. Fuzzies, acorns and ghosts have an air bar that runs out after 10 s with your head under water, and then you start drowning. Rocks still never drown.
- **Rocks can't swim.** They sink, walk the bottom slowly, hop about a block and a half, and crawl up walls underwater (hold toward the wall and jump). They can still punch their way out.

## A bigger Ghost World
- The Ghost World is now 800x320 blocks (it was 520x240), about the size of Fuzzy World and Rock World. West to east: the Pale Hills and the Pale Keep, the Bonewood (a thick dead forest, with the Hanging Hollow), the Soulmire (black pools, boardwalks and a shrine island), Barrowtown (ruined houses, a graveyard, and the Barrow, a crypt underneath with a hidden room), the Mistspires (tall peaks with a Cyitor watchtower), and the Hollows.
- Six new creatures with their own drawings: the Pale Hound, Grave Crawler, Mire Slime, Bone Grasper, Mire Eel and Mist Bat. They're in the Field Guide under a new Ghost World Wildlife tab.
- Barrow Chests in the ruins hold ectoplasm, coins, Stygian and platinum ore, and sometimes key fragments or recipe squares.
- It's a rebuilt world, so it's saved under a new name: blocks you changed in the old Ghost World don't carry over. Your bag and gear do, and you start again at the Pale Keep.

## The Warthog King
- The cliff on the west side of King's Clearing is now a gentle slope, and the slope counts as part of his arena, so he charges up it. There's no ledge left where he can't reach you.
- If you get above him (a ledge, a tree, a tower you built), he leaps up at you and lands with a stomp.
- The King's Clearing waystone moved back a little onto flat ground. If you had already woken it, it stays woken.

## Running sideways
- The fuzzy, rock, acorn and ghost now run (and jump) in a full side view: one eye at the front, only the near arm showing, and legs that really stride. Same sizes as before.
- Idle, swing and swim frames are the original drawings. Hats, capes and armor still fit, since they follow each frame's outline.

## Living trees
- **Shake the leaves:** hit a tree's leaves (not the trunk) and nuts fall out, sometimes a Fuzzberry. The leaves stay. A patch of canopy gives again after a minute and a half. Acorns shake loose an extra nut. Tree Nuts heal a little.
- **Timber!** Chop a trunk and the tree falls away from you, slowly at first, and hurts any monster it lands on. It hurts you too if you stand where it falls.
- **Logs:** a felled tree lands as solid logs. Walk along them, or fell a tree across a gap, a pit or a stream and it is a bridge. Chop a log up for wood. Logs the tree doesn't have room to land on become loose wood.
- **Stumps grow back:** the stump you leave grows a sapling after a couple of minutes, and then a whole new tree (as long as there's room). It keeps its timer in the save the way crops do. Chop the stump to clear it.
- Giant trees and the village tree trunks still come down the old way, so the towns built in them stay safe.

## The rock and building
- Fixed: the rock smashed whatever he aimed at, including blocks he had just placed, because holding the mouse after placing a block counted as a swing. Now he never smashes with a block, torch or seed in his hand.
- A smash has to wind up on the block first (about a sixth of a second), so a quick click does nothing.
- He only smashes dirt, sand and stone in a line. Anything built (planks, bricks, doors, benches, chests, logs) is broken one block at a time, the normal way, and his run-up charge doesn't smash it either.
- Right-clicking a door or a chest no longer slams the ground by accident.

## Hero magic (V)
- **Ghost:** turn invisible for 6 s. Monsters lose track of you, and your first hit from hiding lands twice as hard.
- **Rock:** eat fire, lightning or poison crystals and they grow on you. Your punches carry the element, F slams the ground, and your hits smash stone 3 to 5 blocks deep.
- **Fuzzy:** a storm cloud where you aim. Rain slows monsters under it, and lightning strikes them for 7 s.
- **Acorn:** brambles burst up where you aim. Monsters in them are stuck and get scratched. Aim at your own feet for a healing sprout instead.

## Staffs that each shoot their own way
- **Ember Staff:** lobs a fireball that bursts into flame where it lands.
- **Tide Staff:** a wave rolls along the ground through every monster in its way.
- **Wisp Staff:** three wisps circle you, then hunt the nearest monsters, even through walls.
- **Gnarlroot Staff:** a thorn that weaves through the air and splits in three when it hits.
- **Starfur Staff:** a star that bounces off walls and pierces through monsters.

## Money and treasure
- **Coins** from monsters, chests and cleared hauntings. Rare monsters and bosses drop a lot.
- **Tumble the Trader** waits next to where you arrive in every world. Tumble sells Recipe Squares, key fragments, Star Embers and a Chest Compass, and upgrades the weapon you're holding (up to +3, 20% stronger each time).
- **Legendary chests:** two in every world, deep underground. Three key fragments make a Legendary Key. Inside are coins, Star Embers, a Recipe Square and one of the legendary staffs.
- **Recipe Squares:** bronze, platinum, stygian and soulsteel gear has to be learned first. Each square teaches the next set.

## Monsters and worlds
- Ghosts are cloud blobs that fade in and out. Each area has a set number of them, and once you clear an area it stays quiet for a while.
- Rare elites that take some thinking: Ghost Tank and Lütut (Ghost World and the Duat), Thornback (Fuzzy World), Canopy Stalker (Acorn World) and Geode Golem (Rock World).
- Cyitors, the Empire's elite peacekeepers.
- Fuzzy World's mountains are broad slopes, with long joined-up caves and lava underneath.
- The fuzzy is back to his original main-game sprite and size (the 1.5x side-on one is gone).
