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
  /* ---------------- Aakalay ---------------- */
  q_strays: {
    name: 'Strays', giver: 'ruut', region: 'aakalay',
    desc: 'Three of Old Ruut’s domestic Punks wandered into the ruins. Find them and send them home.',
    goal: { type: 'count', counter: 'strays', n: 3 },
    offer: ['Three of my herd got loose — gentle things, saddle-blankets on. They’ll follow anyone who whistles.', 'Find them, tell them to go home. They know the way. Mostly.'],
    wait: ['Still missing some of my herd. Look for saddle-blankets in the ruins.'],
    done: ['All home! You’ve a way with Punks. Here — take Brindle. She likes you. Whistle (H) and she’ll come running.'],
    reward: { xp: 150, shards: 40, flag: 'mount' },
  },
  q_fennek: {
    name: 'Where’s Fennek?', giver: 'sefa', region: 'aakalay',
    desc: 'Sefa’s pet Kipsu, Fennek, ran off toward the cliff shrine in the north-west.',
    goal: { type: 'count', counter: 'fennek', n: 1 },
    offer: ['Fennek ran away! He chased a byrd toward the old shrine on the cliffs. Please find him!', 'He has a blue stripe on his tail and he LOVES petals.'],
    wait: ['Did you find Fennek? The shrine is north-west, past the library.'],
    done: ['FENNEK! Oh — thank you thank you. Here, take my lucky charm. It always finds shiny things.'],
    reward: { xp: 120, items: { t_kipsu: 1 } },
  },
  q_ore: {
    name: 'Ore for the Cauldron', giver: 'duro', region: 'aakalay',
    desc: 'Duro needs stygian ore and fire-tree bark to get his forge burning. Ore glows purple in the rocks — strike it to break it loose. Bark comes off fallen fire-tree logs.',
    goal: { type: 'items', need: { ore: 4, bark: 3 } },
    offer: ['I can grow a blade from fire-tree wood and soul-iron — if I had either.', 'Four lumps of stygian ore, three strips of fire-tree bark. Break the ore out of the purple rocks; peel the bark off the old logs.'],
    wait: ['Four ore, three bark. The cauldron’s hungry.'],
    done: ['Now THAT’S a fire. Take this one — first blade out of the new cauldron. Come back with more and I’ll forge you better.'],
    reward: { xp: 160, items: { axe_smith: 1 } },
  },
  q_camp: {
    name: 'Raise the Camp', giver: 'venkin', region: 'aakalay',
    desc: 'Venkin wants to turn the pier camp into something that will last. Bring cut stone from the ruins and fire-tree bark.',
    goal: { type: 'items', need: { stone: 6, bark: 4 } },
    offer: ['A camp is a ruin someone decided to love. I’d like to love this one properly.', 'Six cut stones from the ruins — the rubble piles — and four strips of fire-tree bark. I’ll do the rest.'],
    wait: ['Six stone, four bark. I’ve already drawn the plans.'],
    done: ['Look at that. A proper hearth. Cook here any time — and I’ve set aside something I found in the rubble for you.'],
    reward: { xp: 180, shards: 60, items: { t_breath: 1, salad: 2 } },
  },
  q_vel: {
    name: 'Bounty: the Library Vel', giver: 'hemla', region: 'aakalay',
    desc: 'A Duskareth Vel has made the Drowned Library its lair. Hemla will pay — and has a Kalo scroll to sweeten it.',
    goal: { type: 'kill', unique: 'vel_library' },
    offer: ['There’s a Duskareth Vel in the old library, picking through the memory stores. Bad for business.', 'Deal with it and I’ll give you a Kalo scroll that teaches the Duat to fetch.'],
    wait: ['The Vel is still in the library. West, along the old road.'],
    done: ['Gone? Truly? Then here — the scroll. Read it and the Duat will drag your foes to your feet.'],
    reward: { xp: 260, shards: 120, spell: 'pull' },
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
  if (g.type === 'kills') return Math.min(1, Math.max(0, ((save.killsBy || {})[g.kind] || 0) - ((save.qstart || {})[id] || 0)) / g.n);
  return 0;
}
