/* ============================================================
   Side quests from the folk of Beuhk and the Leotik camp. Each has a goal the
   game can check, words for offering / waiting / finishing, and
   a reward.
   goal types:
     items  — hand over materials       { need: { ore: 4 } }
     count  — reach a counter            { counter: 'strays', n: 3 }
     kill   — slay a named creature       { unique: 'vel_library' }
     kills  — slay several of a kind      { kind: 'vel', n: 2 }
   ============================================================ */

export const QUESTS = {
  /* ---------------- Beuhk ---------------- */
  q_strays: {
    name: 'Strays', giver: 'ruut', region: 'xilia',
    desc: 'Three of Old Ruut’s domestic Punks wandered off past the fields. Find them and send them home.',
    goal: { type: 'count', counter: 'strays', n: 3 },
    offer: ['Three of my herd got loose out past the fields — gentle things, saddle-blankets on. They’ll follow anyone who whistles.', 'Find them, tell them to go home. They know the way. Mostly.'],
    wait: ['Still missing some of my herd. Look for saddle-blankets out in the countryside.'],
    done: ['All home! You’ve a way with Punks, boy. That young one that trails you about — the mutt from the city? She’ll carry you, one day soon.', 'Here. An old saddle of mine, good leather, cut down small. Take it to the Carpenter. A Punk wants a place of her own before she’ll wear one.'],
    reward: { xp: 150, shards: 40, items: { saddle: 1 }, flag: 'saddle' },
  },
  q_fennek: {
    name: 'Where’s Fennek?', giver: 'sefa', region: 'xilia',
    desc: 'Sefa’s pet Kipsu, Fennek, ran off into the woods north of town.',
    goal: { type: 'count', counter: 'fennek', n: 1 },
    offer: ['Fennek ran away! He chased a byrd into the north woods. Please find him!', 'He has a blue stripe on his tail and he LOVES petals.'],
    wait: ['Did you find Fennek? He went into the woods north of town.'],
    done: ['FENNEK! Oh — thank you thank you. Here, take my lucky charm. It always finds shiny things.'],
    reward: { xp: 120, items: { t_kipsu: 1 } },
  },
  q_ore: {
    name: 'Ore for the Cauldron', giver: 'duro', region: 'xilia',
    desc: 'Duro needs stygian ore and fire-tree bark to get his forge burning. Ore glows purple in the rocks — strike it to break it loose. Bark comes off fallen fire-tree logs.',
    goal: { type: 'items', need: { ore: 4, bark: 3 } },
    offer: ['I can grow a blade from fire-tree wood and soul-iron — if I had either.', 'Four lumps of stygian ore, three strips of fire-tree bark. Break the ore out of the purple rocks; peel the bark off the old logs.'],
    wait: ['Four ore, three bark. The cauldron’s hungry.'],
    done: ['Now THAT’S a fire. Take this one — first blade out of the new cauldron. Come back with more and I’ll forge you better.'],
    reward: { xp: 160, items: { axe_smith: 1 } },
  },
  q_camp: {
    name: 'Raise the Storehouse', giver: 'venkin', region: 'xilia',
    desc: 'Venkin is raising a storehouse by the square for the winter Ju. Bring cut stone from the quarry heaps and fire-tree bark.',
    goal: { type: 'items', need: { stone: 6, bark: 4 } },
    offer: ['A town is just a lot of people who decided to stay. I’d like to give them somewhere to keep their winter Ju.', 'Six cut stones — the quarry heaps around the island are free for the taking — and four strips of fire-tree bark. Help, and the town hearth is yours to cook at whenever you like.'],
    wait: ['Six stone, four bark. I’ve already drawn the plans.'],
    done: ['Look at that. A proper storehouse. The hearth’s yours to cook at any time — and I’ve set aside something I found in the quarry for you.'],
    reward: { xp: 180, shards: 60, items: { t_breath: 1, salad: 2 } },
  },
  q_vel: {
    name: 'Bounty: the Hideout Vel', giver: 'hemla', region: 'xilia',
    desc: 'A Duskareth Vel has set up a hideout in the north-west woods and is robbing the trade road. Hemla will pay — and has a Kalo scroll to sweeten it.',
    goal: { type: 'kill', unique: 'vel_hideout' },
    offer: ['There’s a Duskareth Vel camped in the north-west woods, robbing my suppliers on the trade road. Bad for business.', 'Deal with it and I’ll give you a Kalo scroll that teaches the Duat to fetch.'],
    wait: ['The Vel is still in its hideout. North-west, along the woods road.'],
    done: ['Gone? Truly? Then here — the scroll. Kalo-made, stored willpower. Read it from your pack (I) and the Duat will drag your foes to your feet.'],
    reward: { xp: 260, shards: 120, items: { k_scroll_pull: 1 } },
  },
  q_bake: {
    name: 'Buns for the Festival', giver: 'v1', region: 'xilia',
    desc: 'Ama the baker is short of Zahreh petals and Kipsu fluff for the harvest buns. (Fluff is for the glaze. Don’t ask.)',
    goal: { type: 'items', need: { petal: 4, fluff: 2 } },
    offer: ['The harvest festival is in three days and I have no petals. NO petals, Stamijan.', 'Four Zahreh petals — the pink flowers — and two tufts of Kipsu fluff. The friendly ones shed it if you give them a scratch.'],
    wait: ['Four petals, two fluff. The festival waits for no one. Well. It waits for me.'],
    done: ['Perfect! Here — the first batch is yours, and the recipe. You can cook them at any fire now.'],
    reward: { xp: 140, shards: 30, items: { bun: 3 }, flag: 'recipe_bun' },
  },
  q_rodak: {
    name: 'Rodak in the Rows', giver: 'v2', region: 'xilia',
    desc: 'Rodak have been creeping out of the woods into Teodr’s fields at night. Thin them out.',
    goal: { type: 'kills', kind: 'rodak', n: 3 },
    offer: ['Rodak. Three of them at least, maybe more, digging up my Ju at night.', 'They den in the dark wood west of the forest road. Mind — they smell blood.'],
    wait: ['Still hearing them at night. Three Rodak, Stamijan.'],
    done: ['Quiet nights again. My grandfather tied this knot for luck. It worked for him. Mostly.'],
    reward: { xp: 200, shards: 70, items: { t_knot: 1 } },
  },
  q_lamps: {
    name: 'The Lamplighter', giver: 'v3', region: 'xilia',
    desc: 'Lirra wants every Nur Lantern around Beuhk awake again — five in all. Only a Nur can wake them, and you have Phorus.',
    goal: { type: 'lit', prefix: 'x_', n: 5 },
    offer: ['I light the lamps. But the old Nur Lanterns? Only a Nur can wake those, and ours left years ago.', 'There are five round Beuhk — the docks, the square, the yard, the forest road, the grove road. Wake them all and the whole town sleeps safer.'],
    wait: ['Five lanterns. The map in your book shows the ones you’ve found.'],
    done: ['Look at them! Every one. Here — my mother’s spare film vial. You’ll carry one more from now on.'],
    reward: { xp: 220, shards: 50, flag: 'flask_bonus' },
  },
  q_crates: {
    name: 'Washed Ashore', giver: 'v4', region: 'xilia',
    desc: 'A trade barge lost three crates over the edge in a squall. They snagged on the island’s rim. Bosk wants them back.',
    goal: { type: 'count', counter: 'crates', n: 3 },
    offer: ['Lost three crates off the barge in the storm. They’re caught on the rim somewhere — I can see the rope from the pier.', 'Fetch them back and there’s something in it for you. Phorus can probably feel which way.'],
    wait: ['Three crates, out on the rim. Careful near the edge — it’s a long way down to the cloud sea.'],
    done: ['All three! And not a dent. Here — my old compass. Never once pointed north. Always pointed somewhere interesting.'],
    reward: { xp: 220, shards: 90, items: { t_compass: 1, ore: 2 } },
  },
  q_scaffold: {
    name: 'The Scaffold', giver: 'kw1', region: 'xilia',
    desc: 'Orrin is building a lookout over the fields and is short of materials.',
    goal: { type: 'items', need: { stone: 4, bark: 2, vine: 2 } },
    offer: ['A lookout over the fields. So we see the Rodak coming, for once.', 'Four cut stone, two fire-tree bark, two Punk vines for lashing. Simple. Mind the scaffold.'],
    wait: ['Stone, bark, vine. Four, two, two.'],
    done: ['Up she goes. You’ve a builder’s patience, Stamijan. That’s worth something — learn something new with it.'],
    reward: { xp: 180, shards: 40, points: 1 },
  },
  /* ---------------- Aakalay: Phorus's own quests ---------------- */
  q_pages: {
    name: 'The Last Journal', giver: 'phorus', region: 'aakalay',
    desc: 'Phorus can feel torn journal pages scattered through the dead city, still warm with memory. Find all four and learn why everyone left.',
    goal: { type: 'count', counter: 'pages', n: 4 },
    offer: ['Torcain — wait. There’s something else here, not a core. Paper. Pages, with a little memory still in the ink.', 'Someone wrote down what happened at the end. Four pages, scattered. I’d like to know why they left. Wouldn’t you?'],
    wait: ['More pages out there. Press F and I’ll feel for them.'],
    done: ['So that’s it. They didn’t die here — most of them. They walked away and swore never to come back.', 'And the thing in the last page… Skor’Thal. The great old Punk. It’s still here, Torcain. I can feel it.'],
    reward: { xp: 300, shards: 120 },
  },
  q_thorn: {
    name: 'The Scarred Trees', giver: 'phorus', region: 'aakalay',
    desc: 'Skor’Thal, the great old Punk from the journal, scars the trees where it rubs its rind. The scars only answer Nur’Hlyst (G). Find three, in the worst corners of Aakalay, and read where it walks.',
    goal: { type: 'count', counter: 'scars', n: 3 },
    offer: ['The last page. Skor’Thal — skor, great; thal, ancient. The old herd-Punk that took the lord’s ring north.', 'It isn’t a monster, Torcain. It’s just old, and it doesn’t want to be found. It scars the trees where it rubs. Pulse Nur’Hlyst and the scars will answer — three should show us the way. Mind the Rodak.'],
    wait: ['Three scarred trees. Only Nur’Hlyst shows them. The Rodak country, the Malsti wood, and somewhere north.'],
    done: ['Three scars, all leaning the same way. North — past the Grove Road, into the far wood.', 'Its den is up there. The Rodak follow it around for the windfall. Go quietly. And don’t you dare hurt it.'],
    reward: { xp: 350, shards: 120 },
  },
  q_skorthal: {
    name: 'Skor’Thal', giver: 'phorus', region: 'aakalay',
    desc: 'The scars lead to Skor’Thal’s den in the far north wood. Clear the Rodak that shadow it, then sit with the old Punk. Don’t raise a hand to it.',
    goal: { type: 'count', counter: 'skorthal', n: 1 },
    offer: ['The den, in the far north wood. Whatever happens — it’s not a fight. Clear the scavengers, then sit with it a while.'],
    wait: ['Far north wood. Clear the Rodak first, then sit with Skor’Thal.'],
    done: ['You sat with it. I don’t think anyone’s done that in a hundred years.', 'And it gave you the ring. The lord’s oath-ring, grown right into its vines. Wear it. Make it mean something better than it did.'],
    reward: { xp: 600, shards: 250, items: { t_oath: 1 } },
  },
  /* ---------------- the Carpenter's land: no one gives you these — you find them (alchemy.js) ----------------
     found: what you came across; there's no one to go back to: each finishes where it ends */
  q_glow: {
    name: 'Lights by the Water', found: 'an old jar of glowcaps in the reeds', region: 'property', easy: true,
    desc: 'A jar of dried glowcaps in the reeds, labelled in Buhkon’s hand: “For the dark. Two caps to a flask.” Fresh ones grow on the lakeshore. Gather some and brew the tonic at the still in the yard.',
    goal: { type: 'count', counter: 'q_glow', n: 1 },
    done: [['tale', 'The tonic glows in the flask like a little captured dusk. When he drinks it, the Nur in him comes back quicker, and the dark at the edges of things isn’t quite so dark.'], ['tale', 'And there’s more in the old label, small, on the back: “Four caps, a drop of oil, a twist of vine — a lantern you can wear.”']],
    reward: { xp: 120, shards: 30, flag: 'learn_t_glowcap' },
  },
  q_satchel: {
    name: 'The Drowned Satchel', found: 'a waterlogged satchel snagged under the old dock', region: 'property',
    desc: 'A herbalist’s satchel under the dock, and in it a notebook with three pages torn out. The last page left says where the others went: “one under the red stone on the far shore; one at the top of the lookout rocks, where I watched the storm; one in the south vale, in the old hollow ash.”',
    goal: { type: 'count', counter: 'q_satchel', n: 3 },
    done: [['tale', 'The last page slots in. The notebook is whole again — a travelling herbalist’s, years old, the ink run but readable. Most of it is brews he already knows. One he doesn’t: a Fortune draught, “for a long road and a light purse.”'], ['tale', 'The satchel dries out stiff, but it mends. It’s a good bag. Someone walked a long way with it.']],
    reward: { xp: 260, shards: 80, items: { t_satchel: 1 }, flag: 'learn_pt_luck' },
  },
  q_storm: {
    name: 'Storm in a Bottle', found: 'a lightning-struck tree on the High Meadow', region: 'property', hard: true,
    desc: 'Storm-glass round the roots of a tree the sky came down on — still crackling. A scorch runs off from it, north-west, the way the storm went: there’ll be more where it came down again. Three shards, then the hardest brew there is, at the still.',
    goal: { type: 'count', counter: 'q_storm', n: 4 },
    done: [['tale', 'The flask hums. Inside it the water turns and turns, the way the well water turned round the amulet — a storm the size of his fist, sealed in glass.'], ['buhkon', '…You made that? On your own? — Don’t drink it near the house.']],
    reward: { xp: 450, shards: 150, flag: 'learn_t_storm' },
  },
  /* ---------------- Leotik ---------------- */
  q_pups: {
    name: 'Kipsu Pups', giver: 'venkin', region: 'leotik',
    desc: 'Three Kipsu pups were kicked out of their pack in the storm. Find them and lead them back to the camp before something eats them.',
    goal: { type: 'count', counter: 'pups', n: 3 },
    offer: ['Pups kicked out of a small pack usually don’t make it. Unless someone adopts them.', 'There are three out there, crying in the rain. Bring them here. I’ll build them a hutch.'],
    wait: ['Still pups out there. Listen for the crying.'],
    done: ['Three fluffballs, safe and dry. The camp is louder now. I don’t mind.'],
    reward: { xp: 240, shards: 80, items: { t_feather: 1 } },
  },
  q_sru: {
    name: 'The Tusk', giver: 'duro', region: 'leotik',
    desc: 'Bring down the Sru Vorn in the acid bogs, and Duro will show you how to forge its tusk into a Tusk Cleaver.',
    goal: { type: 'kill', unique: 'sruvorn' },
    offer: ['There’s a Sru Vorn farming acid pits in the west bogs. Its tusks are the finest axe-stock on three Tatu.', 'Bring it down and keep the tusk — then I’ll teach the cauldron a new song.'],
    wait: ['The bogs are west. Don’t stand in front of it. Or behind it.'],
    done: ['Ha! You actually did it. Keep that tusk — bring it to the cauldron with ore and oil, and I’ll forge you a Tusk Cleaver.'],
    reward: { xp: 400, shards: 150, flag: 'forge_tusk' },
  },
  q_antidote: {
    name: 'Antidote', giver: 'ila', region: 'leotik',
    desc: 'Ila Vos is brewing a cure for the toxic film. She needs toxic Albali horns and bog moss.',
    goal: { type: 'items', need: { thorn: 2, moss: 3 } },
    offer: ['The byrds’ film went green. It doesn’t heal anymore, it just burns.', 'Two toxic horns from the Villtur Albali, three handfuls of bog moss. And I’ll teach you the tea.'],
    wait: ['Two toxic horns, three bog moss. The moss grows at the bog edges.'],
    done: ['Steep it long and drink it hot — and the poison slides right off you. The recipe’s yours.'],
    reward: { xp: 280, shards: 90, items: { tea: 3 }, flag: 'recipe_tea' },
  },
  q_vels: {
    name: 'Old Friends', giver: 'kesh', region: 'leotik',
    desc: 'Kesh wants the Duskareth Vels on Leotik stopped before they find the Urverk. Defeat two of them.',
    goal: { type: 'uniques', ids: ['vel_villtur', 'vel_keep'] },
    offer: ['Two Vels came through after me. One in Villtur, one at the keep. If they reach the Urverk first…', 'Stop them, and I’ll teach you the Fti Gust. The Duskareth hate wind.'],
    wait: ['Villtur, and the keep. They throw knives out of the air — keep moving.'],
    done: ['Both. You’re terrifying. Here — breathe out, and push. That’s the Gust.'],
    reward: { xp: 380, shards: 140, spell: 'gust' },
  },
};

export function questProgress(id, q, save, inv) {
  const g = q.goal;
  if (g.type === 'items') return Object.entries(g.need).map(([k, n]) => Math.min(n, (inv.items[k] || 0)) / n).reduce((a, b) => a + b, 0) / Object.keys(g.need).length;
  if (g.type === 'count') return Math.min(1, ((save.counters || {})[g.counter] || 0) / g.n);
  if (g.type === 'kill') return save.cleared[g.unique] ? 1 : 0;
  if (g.type === 'uniques') return g.ids.filter(id => save.cleared[id]).length / g.ids.length;
  if (g.type === 'lit') return Math.min(1, Object.keys(save.lit || {}).filter(k => k.startsWith(g.prefix)).length / g.n);
  if (g.type === 'kills') return Math.min(1, Math.max(0, ((save.killsBy || {})[g.kind] || 0) - ((save.qstart || {})[id] || 0)) / g.n);
  return 0;
}

/* ---------------- the Carpenter's job board, out in his yard ----------------
   Folk from Beuhk pin notices on it, and leave what they owe in the box under it. Side jobs, any time at all —
   young Tanoc or grown Torcain. Each one teaches a kind of weapon (reward.arms: its first piece comes with it)
   or hands over a piece of plain armor. Everything here can be done on the Carpenter's own land.
   goal: items / kills (as above), or lesson — someone shows you in person (done once that weapon is learned) */
export const JOBS = {
  pj_whip: { from: 'Venkin', name: 'Crack of the Whip', desc: 'Venkin wants to show you his whip. He’ll be by the barn. “Bring nothing. Bring EARS.”', goal: { type: 'lesson', arm: 'whip' }, reward: { arms: 'whip', xp: 60 }, done: 'Venkin has written “STRYX HANDLER (TRAINEE)” under your name on the notice.' },
  pj_battleaxe: { from: 'Buhkon', name: 'Logs for the Winter', desc: 'Peel six strips of bark off the fallen fire-tree logs on the land. “There’s an axe in it for you. A big one.”', goal: { type: 'items', need: { bark: 6 } }, reward: { arms: 'battleaxe', xp: 80 }, done: 'Under the board, wrapped in sacking: a battle axe with two bits, and “TWO HANDS, TANOC” scratched on the haft.' },
  pj_bow: { from: 'Hemla', name: 'Byrds over the Lake', desc: 'Two Albali Byrds have been diving at Hemla’s carts on the lake road. Bring them down — anywhere on the land.', goal: { type: 'kills', kind: 'albali', n: 2 }, reward: { arms: 'bow', xp: 120 }, done: 'Hemla’s left a hunter’s bow and a full quiver. “Kalo keep fair books. Arrows are extra next time.”' },
  pj_spear: { from: 'Old Ruut', name: 'Wild Ones at the Far Shore', desc: 'Wild Punks on the far side of the lake keep luring off Ruut’s herd. Drive off three.', goal: { type: 'kills', kind: 'punk', n: 3 }, reward: { arms: 'spear', xp: 140 }, done: 'A farmer’s spear, and Ruut’s scrawl: “Keep them at the end of it, boy. That’s all a spear is.”' },
  pj_lance: { from: 'Old Ruut', name: 'Vine for the Halters', desc: 'Ruut needs Punk vine to plait new halters. Four lengths.', goal: { type: 'items', need: { vine: 4 } }, reward: { arms: 'lance', xp: 90 }, done: 'Ruut’s old riding lance, long as two men. “From when I rode. Hits hardest at a run.”' },
  pj_longsword: { from: 'Duro', name: 'Ore for an Old Blade', desc: 'Duro started a longsword years ago and ran out of soul-iron. Three lumps of stygian ore and two strips of bark finish it.', goal: { type: 'items', need: { ore: 3, bark: 2 } }, reward: { arms: 'longsword', xp: 120 }, done: 'The longsword, finished at last. Duro has engraved every nick in it into a little list on the scabbard.' },
  pj_swordshield: { from: 'Teodr', name: 'Rodak in the North Woods', desc: 'Rodak are coming down out of the north woods at night. Drive off three.', goal: { type: 'kills', kind: 'rodak', n: 3 }, reward: { arms: 'swordshield', xp: 160 }, done: 'A sword and a round shield from a shipwreck crate. “Hide behind the round bit,” Teodr has written. Helpful.' },
  pj_dual: { from: 'Bosk', name: 'Thieves in the Woods', desc: 'Wild Kipsu out in the far woods keep raiding the dock stores. Run three of them off.', goal: { type: 'kills', kind: 'kipsu', n: 3 }, reward: { arms: 'dual', xp: 110 }, done: 'Twin knives in a double sheath. Bosk: “One for each hand. Don’t cut yourself. Twice.”' },
  pj_throwaxe: { from: 'Orrin', name: 'Hafts and Bindings', desc: 'Orrin needs vine and bark for a brace of little hatchets. Three vine, two bark.', goal: { type: 'items', need: { vine: 3, bark: 2 } }, reward: { arms: 'throwaxe', xp: 90 }, done: 'Four little hatchets, balanced to throw. “They come back to the hand,” says the note. “Mostly.”' },
  pj_axebuckler: { from: 'Orrin', name: 'Timber Off the Slope', desc: 'Four strips of fire-tree bark and a lump of ore for the scaffold pegs.', goal: { type: 'items', need: { bark: 4, ore: 1 } }, reward: { arms: 'axebuckler', xp: 100 }, done: 'Orrin’s spare short axe and a little round buckler — for turning falling timbers, mostly.' },
  pj_hammer: { from: 'Orrin', name: 'Pegs for the Storehouse', desc: 'Orrin needs soul-iron for the big storehouse pegs. Two ore, three bark.', goal: { type: 'items', need: { ore: 2, bark: 3 } }, reward: { arms: 'hammer', xp: 110 }, done: 'Orrin’s old maul. It took two people to hang it on the board.' },
  pj_staff: { from: 'Lirra', name: 'Petals for the Lanterns', desc: 'Lirra steeps Zahreh petals in the lantern oil, for the smell. Three petals, two bark for kindling.', goal: { type: 'items', need: { petal: 3, bark: 2 } }, reward: { arms: 'staff', xp: 90 }, done: 'Lirra’s old iron-shod lamp-pole. “Quick, and it knocks things flat. Ask the Rodak.”' },
  pj_scythe: { from: 'Ama', name: 'Zahreh for the Festival', desc: 'Ama is baking for the whole town and she’s out of Zahreh. Six petals, please, picked anywhere on the land.', goal: { type: 'items', need: { petal: 6 } }, reward: { arms: 'scythe', xp: 100 }, done: 'Ama has sent her late husband’s reaping scythe, and two buns, and a note that just says “CAREFUL”.' },
  pj_doublespear: { from: 'Ila', name: 'Horn for the Antidote', desc: 'Ila needs Albali horn for her medicines. Two, still filmed.', goal: { type: 'items', need: { horn: 2 } }, reward: { arms: 'doublespear', xp: 130 }, done: 'A spear with a head at both ends, in Leotik style. “They spin it, where I come from,” writes Ila.' },
  pj_doublesword: { from: 'Buhkon', name: 'Oil for the Lamps', desc: 'Two flasks of Rodak oil and two lumps of ore. “Something I’ve been meaning to give you.”', goal: { type: 'items', need: { oil: 2, ore: 2 } }, reward: { arms: 'doublesword', xp: 150 }, done: 'A blade at each end of one long hilt. The Carpenter’s note: “Mine, a long time ago. Spin it slowly at first.”' },
  pj_fists: { from: 'Sefa', name: 'Fluff for Fennek', desc: 'Sefa is making Fennek a bed. Four tufts of Kipsu fluff — the friendly ones shed it everywhere.', goal: { type: 'items', need: { fluff: 4 } }, reward: { arms: 'fists', xp: 80 }, done: 'Knuckle-wraps with Kipsu claws sewn in, and a drawing of Fennek asleep in his new bed.' },
  // plain armor
  pj_jerkin: { from: 'Buhkon', name: 'Mend the Fences', desc: 'Three lengths of Punk vine to lash the pasture fence. “And you’ll want something warmer than that shirt.”', goal: { type: 'items', need: { vine: 3 } }, reward: { items: { w_jerkin: 1, w_boots: 1 }, xp: 60 }, done: 'A padded jerkin and a pair of good boots, folded on top of the box.' },
  pj_wraps: { from: 'Ama', name: 'A Basket of Petals', desc: 'Three Zahreh petals for Ama’s buns.', goal: { type: 'items', need: { petal: 3 } }, reward: { items: { w_wraps: 1, w_sandals: 1 }, xp: 50 }, done: 'Linen hand-wraps and summer sandals. “You’ll grow out of them by Ju-harvest. Everyone does.”' },
  pj_bracers: { from: 'Teodr', name: 'Rodak Oil', desc: 'Two flasks of Rodak oil for Teodr’s plough.', goal: { type: 'items', need: { oil: 2 } }, reward: { items: { w_bracers: 1 }, xp: 70 }, done: 'Leather bracers, oiled with what you brought.' },
  pj_hood: { from: 'Bosk', name: 'Waxing the Nets', desc: 'Bosk needs Rodak oil to wax the dock nets. Three flasks.', goal: { type: 'items', need: { oil: 3 } }, reward: { items: { w_hood: 1 }, xp: 80 }, done: 'A fisher’s oilcloak — cut full, Bosk says, for gliding off the dock.' },
  pj_kipsu: { from: 'Sefa', name: 'More Fluff', desc: 'Fennek wants a blanket now too. Five tufts of Kipsu fluff.', goal: { type: 'items', need: { fluff: 5 } }, reward: { items: { w_kipsu: 1 }, xp: 70 }, done: 'A Kipsu-fluff cape, very soft, slightly lopsided. Sefa made it herself.' },
  pj_byrd: { from: 'Hemla', name: 'More Byrds', desc: 'Three more Albali Byrds on the lake road. Hemla is losing patience and cargo.', goal: { type: 'kills', kind: 'albali', n: 3 }, reward: { items: { w_byrd: 1 }, xp: 130 }, done: 'A cloak of Byrd feathers. “Waste not,” Hemla has written.' },
  pj_ranger: { from: 'Teodr', name: 'The Night Raiders', desc: 'Two more Rodak on the land. Teodr can hear them from his fields.', goal: { type: 'kills', kind: 'rodak', n: 2 }, reward: { items: { w_ranger: 1 }, xp: 120 }, done: 'A ranger’s green jerkin, with pockets for everything.' },
  pj_hide: { from: 'Old Ruut', name: 'Halters and Hides', desc: 'Three flasks of oil and two lengths of vine to cure leather.', goal: { type: 'items', need: { oil: 3, vine: 2 } }, reward: { items: { w_hide: 1 }, xp: 100 }, done: 'A hide coat, cured with your oil. It smells of Punk. Everything of Ruut’s does.' },
  pj_chain: { from: 'Duro', name: 'Rings of Soul-iron', desc: 'Five lumps of stygian ore for ring-mail.', goal: { type: 'items', need: { ore: 5 } }, reward: { items: { w_chain: 1 }, xp: 120 }, done: 'A shirt of ring-mail, every ring closed by hand.' },
  pj_scale: { from: 'Duro', name: 'Scales and Oil', desc: 'Four ore and two flasks of oil for a coat of scales.', goal: { type: 'items', need: { ore: 4, oil: 2 } }, reward: { items: { w_scale: 1 }, xp: 140 }, done: 'A coat of overlapping scales, oiled bright.' },
  pj_gauntlets: { from: 'Duro', name: 'Knuckle Guards', desc: 'Three ore and a flask of oil.', goal: { type: 'items', need: { ore: 3, oil: 1 } }, reward: { items: { w_gauntlets: 1 }, xp: 100 }, done: 'Plated gauntlets with knuckle guards.' },
  pj_greaves: { from: 'Orrin', name: 'Shin Plates', desc: 'Three ore and two strips of bark.', goal: { type: 'items', need: { ore: 3, bark: 2 } }, reward: { items: { w_greaves: 1 }, xp: 100 }, done: 'Shin plates. “For the scaffold,” says Orrin. “Everything is for the scaffold.”' },
  pj_robe: { from: 'Lirra', name: 'Lantern Linen', desc: 'Four petals and two tufts of fluff for lantern wicks.', goal: { type: 'items', need: { petal: 4, fluff: 2 } }, reward: { items: { w_robe: 1 }, xp: 90 }, done: 'A long lamplighter’s robe, faintly scented of Zahreh.' },
};
export function jobProgress(id, q, save, inv) {
  if (q.goal.type === 'lesson') return (save.arms || {})[q.goal.arm] ? 1 : 0;
  return questProgress(id, q, save, inv);
}
