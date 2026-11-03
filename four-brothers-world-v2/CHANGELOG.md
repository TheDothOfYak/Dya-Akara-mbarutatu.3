# 4 Brothers World V2 (preview)

V2 is built on the main game (v1.8), so it has everything the main game has (account saves, Acorn World's waystones, beds, market day and the rest), plus the V2 changes below. It keeps its own saves on your account, separate from the main game. The first time you play V2 in a browser, it starts from the hero you already have there.

## Phones and tablets
- **Play on a phone or tablet.** On a touch screen the game shows its own controls: a joystick on the left (push it all the way to run), Jump, Hit, Use, Cast, Spell, Talk, Torch, Drop and Power (hero magic) on the right, and touch and hold anywhere in the world to swing, mine, chop or place a block right there. In the bag, tap to pick up and put down, and hold an item to eat or wear it. The HUD gets smaller and Chat gets a button. With a mouse and keyboard nothing changes. Code: `js/flake/fbw_touch.js`.
- **More for phones.** Double-tap a spot to use or cast on it (the right-click: fishing, pets, chests, beds). Settings has a Touch controls section: button size, see-through buttons, left-handed (joystick on the right) and a buzz on each press. Hints say which button to tap instead of which key to press, Controls lists the touch controls, the screen stays on while you play, and the game can go full screen from a phone's home screen.
- **Vine and Shape on touch.** The acorn gets a Vine button (it shoots up and ahead), and a Shape button shows while you hold a block. Power aims just ahead of you.

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

## Three new hero moves
- **Acorn roll:** while running on the ground, press **S** and he tucks into a ball and rolls, about twice as fast as running and faster still downhill. Rolling into monsters bowls them over. Jump to hop out of it; press S again or let go of left/right to stop. It uses a little stamina.
- **Ghost slip:** keep pushing into a thin wall (one or two blocks thick) and the ghost fades and slips through to the other side. Not through thicker walls, locked doors, carvings or places he isn't allowed.
- **Wind:** outdoors the wind blows in gusts that change direction now and then (white streaks blow past). It pushes the fuzzy around, a lot in the air and more when he's puffed up, a little on the ground. His runes help him hold steady. No wind underground, underwater, on a vine or on his cloud.

## Runes instead of picks: the Ancient Rune Keeper
- **Picks are gone.** How hard a block you can break comes only from your runes, and each hero's runes are their own: the **acorn** gets a harder cap (it changes colour to the rune's material), the **fuzzy** stronger suction (the air he pulls glows), the **rock** a heavier fist (made of the rune's material), and the **ghost** a stronger permanence (his arm turns the rune's colour when it goes solid).
- **The Ancient Rune Keeper** stands near where you arrive in Fuzzy, Acorn, Rock and Ghost World. Bring him materials, monster parts and coins, and he carves your next rune. 1 Flint (breaks stone): 3 flint, 6 rubble, 3 monster parts, 15 coins. 2 Stone (iron ore): 20 stone, 4 flint, 5 parts, 30 coins. 3 Iron (bronze ore): iron bars. 4 Bronze (platinum). 5 Platinum (stygian). 6 Stygian, 7 Soulsteel and 8 the Duat rune each dig faster.
- Without a rune you can only break soft things (dirt, sand, wood, gravel, flint). Old saves start with no runes; old picks are only weapons now. Pick recipes are gone, so a new hero starts with 58 recipes and 37 to learn.
- The rock can only smash what his fist rune can break, and you see his fist punch each block he smashes (out of reach he just swings).
- The fuzzy's iron-rune air is grey blue, so it stands out from his stone rune.

## The fuzzy
- **One puff jump.** A normal jump, then one puff in the air (and he can still hold jump to float down). His 3rd rune gives a second puff, his 5th a third.
- **Cloud ride:** with the Duat rune, press jump again once your puffs are used up and he rides a cloud for about five seconds (hold jump to stay on). It refills on the ground.
- He opens his mouth wide while he sucks up a block.

## Building in shapes, pouring sand, cracks that stay
- **Shapes:** press **B** to switch between one block (the default), a row of 3, a column of 3, a 2x2 square, or steps. A faint outline shows where they'll go. Each block uses one from your stack.
- **Sand, snow and soul ash pour** when you dig out what holds them up, sliding off edges into a pile. Gravel drops straight down. Falling grains hurt monsters they land on, and wait on your head rather than fall into you. Only blocks near where you dig or build move.
- **Cracks stay:** stop mining a block halfway and its cracks stay for 30 seconds, so you can come back to it.

## Caves, chests and falling
- **Fuzzy World's caves** have more than bats now: slimes, crystal crawlers and scorpions in the caves; ember crawlers, crystal crawlers, jungle slimes and spiky fish in the deep. Most bats down there give way to them.
- **More chests:** 20 more Old Chests in Fuzzy World's caves, 12 in Rock World, 8 in the Ghost World.
- **Every hero takes fall damage** (the rock, fuzzy and ghost used to take none). Up to 7 blocks is safe; past that it hurts a little more each block, and more again past 20 and 40 blocks (about 15 damage from 20 blocks, 33 from 30, 75 from 50). Floating down is always safe: the fuzzy's float, the acorn's leaf, the ghost's hover, a vine or a cloud.

## Elites, the Duat Stone and coins
- **Something is amiss in the Duat.** Elites (Ghost Tank, Lütut, Thornback, Canopy Stalker, Geode Golem) are souls climbing back out of the Duat, and they grow as your gear does. None come until you carry an iron-strength weapon, and never in your first three minutes. With iron they're at 60% health and damage, with bronze 80%, with platinum full strength, with stygian or soulsteel 130% (Duat-touched) and with a legendary weapon 160% (Duat-crowned).
- **Stronger elites carry better things.** Iron-level ones drop what they always did (30–60 coins, a key fragment, sometimes a Star Ember or Recipe Square). Higher up they drop more coins (up to 180–260), more key fragments, Star Embers every time, Recipe Squares more often, and metal bars from bronze up to soulsteel. The strongest also drop soul shards and sometimes a Mirror Shard.
- **The Duat Stone** stands a few steps from where you arrive in every world. Read it (R) to see how restless the Duat is right now. A banner tells you each time it gets worse.
- **Coins:** ordinary monsters drop coins more often (8 in 10 instead of 6 or 7 in 10) and a little more of them. Tumble's prices: Recipe Square 45 (was 60), Star Ember 40 (was 50). Weapon upgrades cost 30, 60 and 90 coins (were 40, 80, 120), plus a Star Ember each as before.

## Fewer recipes to start with
- You start knowing only the basics: wood, flint, stone and iron gear, building blocks, workbenches and forges, metal bars, torches and food. That's 61 recipes instead of 102.
- The other 40 come in eight sets, and each **Recipe Square** you read teaches the next one: bronze gear, the first monster weapons, platinum gear, more monster weapons, stygian gear, storm weapons, soulsteel weapons, and the old secrets (Mirrorblade, Gnarlroot Staff).
- The crafting list only shows recipes you know, and says how many are left. Squares are in chests (a little more often now), dropped by elites and bosses, in legendary chests, and Tumble sells them.
- The Stone Club recipe is gone (the Stone Hammer and Stone Sword do its job). Any you already have still work.
- Old saves: squares you already read still count, and if you'd already moved past a metal, or have a monster weapon in your bag, you keep those monster-weapon recipes.

## How each hero mines
- Every hero mines in his own way now, instead of swinging a tool. **Fuzzy** sucks the block in hard: bits of it stream into his mouth and he puffs up with each pull. **Acorn** headbutts it. **Rock** punches it with his stone fist. **Ghost** turns his arm see-through, slides it into the block, then makes it solid inside it to crack the block.
- Only the look changed: how long each block takes, what you can mine, and what it drops are all the same as before.

## The acorn's vine
- Press **C** (you can change it in Settings) to shoot a vine toward the mouse. It sticks to any block or tree up to 15 blocks away, and you swing from it.
- Left and right pump the swing, **W** climbs up the vine, **S** lets out more, **Space** lets go with a hop (your double jump is still there afterwards), and **C** lets go too. Letting go mid-swing keeps your speed, so you can fling yourself across gaps.
- It costs a little stamina to shoot, and lets go on its own if you hit water or the block it's holding breaks.

## Puff jumps and solid-looking trees
- **Fuzzy puff jumps.** After a normal jump, press jump in the air to suck in air and jump again, higher. You get two of these, each higher than the last (a normal jump is about 5 blocks; with both puffs about 16). They come back when you land or touch water, and each costs a little stamina. The fuzzy swells up while he's puffed, and holding jump while falling still floats him down.
- **Trees** look the same standing as they do when they fall: leaves fill the whole block with a blotchy texture, and the trunk is a solid column. Albali trees stay gold and Ghost World trees stay pale.

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
