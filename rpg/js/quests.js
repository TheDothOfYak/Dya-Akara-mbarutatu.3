/* ============================================================
   Side quests from the folk of the camps. Each has a goal the
   game can check, words for offering / waiting / finishing, and
   a reward.
   goal types:
     items  — hand over materials       { need: { ore: 4 } }
     count  — reach a counter            { counter: 'strays', n: 3 }
     kill   — slay a named creature       { unique: 'vel_library' }
     kills  — slay several of a kind      { kind: 'vel', n: 2 }
   ============================================================ */

export const QUESTS = {
  /* ---------------- Xilia ---------------- */
  q_strays: {
    name: 'Strays', giver: 'ruut', region: 'xilia',
    desc: 'Three of Old Ruut’s domestic Punks wandered off past the fields. Find them and send them home.',
    goal: { type: 'count', counter: 'strays', n: 3 },
    offer: ['Three of my herd got loose out past the fields — gentle things, saddle-blankets on. They’ll follow anyone who whistles.', 'Find them, tell them to go home. They know the way. Mostly.'],
    wait: ['Still missing some of my herd. Look for saddle-blankets out in the countryside.'],
    done: ['All home! You’ve a way with Punks. Here — take Brindle. She likes you. Whistle (H) and she’ll come running.'],
    reward: { xp: 150, shards: 40, flag: 'mount' },
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
    desc: 'Venkin is raising a storehouse and a proper hearth by the square. Bring cut stone from the old rubble piles and fire-tree bark.',
    goal: { type: 'items', need: { stone: 6, bark: 4 } },
    offer: ['A town is just a lot of people who decided to stay. I’d like to give them somewhere to keep their winter Ju.', 'Six cut stones — there are rubble piles all over from the old wall — and four strips of fire-tree bark. I’ll do the rest.'],
    wait: ['Six stone, four bark. I’ve already drawn the plans.'],
    done: ['Look at that. A proper hearth. Cook here any time — and I’ve set aside something I found in the rubble for you.'],
    reward: { xp: 180, shards: 60, items: { t_breath: 1, salad: 2 } },
  },
  q_vel: {
    name: 'Bounty: the Hideout Vel', giver: 'hemla', region: 'xilia',
    desc: 'A Duskareth Vel has set up a hideout in the north-west woods and is robbing the trade road. Hemla will pay — and has a Kalo scroll to sweeten it.',
    goal: { type: 'kill', unique: 'vel_hideout' },
    offer: ['There’s a Duskareth Vel camped in the north-west woods, robbing my suppliers on the trade road. Bad for business.', 'Deal with it and I’ll give you a Kalo scroll that teaches the Duat to fetch.'],
    wait: ['The Vel is still in its hideout. North-west, along the woods road.'],
    done: ['Gone? Truly? Then here — the scroll. Read it and the Duat will drag your foes to your feet.'],
    reward: { xp: 260, shards: 120, spell: 'pull' },
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
    desc: 'Lirra wants every Nur Lantern around Xilia awake again — five in all. Only a Nur can wake them, and you have Phorus.',
    goal: { type: 'lit', prefix: 'x_', n: 5 },
    offer: ['I light the lamps. But the old Nur Lanterns? Only a Nur can wake those, and ours left years ago.', 'There are five round Xilia — the docks, the square, the yard, the forest road, the grove road. Wake them all and the whole town sleeps safer.'],
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
    done: ['So that’s it. They didn’t die here — most of them. They walked away and swore never to come back.', 'And the thing in the last page… Thornback. The Old Punk. It’s still here, Torcain. I can feel it.'],
    reward: { xp: 300, shards: 120 },
  },
  q_thorn: {
    name: 'Thornback', giver: 'phorus', region: 'aakalay',
    desc: 'An ancient wild Punk, swollen on old oath-magic, rules the north grove of Aakalay. Put it to rest.',
    goal: { type: 'kill', unique: 'thornback' },
    offer: ['The Old Punk from the journal. It ate something it shouldn’t have, a long time ago — an oath-ring, maybe.', 'It’s in the north grove. Big. Angry. Be ready for it.'],
    wait: ['Thornback, in the north grove. Eat something first.'],
    done: ['It’s over. Look — the ring, tangled in its vines. Whoever swore on that is long gone. Wear it. Make it mean something better.'],
    reward: { xp: 500, shards: 250, items: { t_oath: 1 } },
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
    desc: 'Bring Duro a Sru Vorn tusk from the acid bogs and he’ll show you how to forge a Tusk Cleaver.',
    goal: { type: 'items', need: { tusk: 1 } },
    offer: ['There’s a Sru Vorn farming acid pits in the west bogs. Its tusks are the finest axe-stock on three Tatu.', 'Bring me one. I’ll teach the cauldron a new song.'],
    wait: ['The bogs are west. Don’t stand in front of it. Or behind it.'],
    done: ['Ha! Look at the grain on that. I can forge you a Tusk Cleaver now — bring ore and oil.'],
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
    goal: { type: 'kills', kind: 'vel', n: 2 },
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
  if (g.type === 'lit') return Math.min(1, Object.keys(save.lit || {}).filter(k => k.startsWith(g.prefix)).length / g.n);
  if (g.type === 'kills') return Math.min(1, Math.max(0, ((save.killsBy || {})[g.kind] || 0) - ((save.qstart || {})[id] || 0)) / g.n);
  return 0;
}
