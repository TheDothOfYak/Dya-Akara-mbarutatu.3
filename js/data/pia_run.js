/* ============================================================
   DYA'AKARA — data/pia_run.js
   LEGENDS OF PIA'DON — a turn-based roguelike card game.

   This is the "Card Guardians"-style deckbuilder skinned in the
   Mbaru Tatu: a Guardian climbs a string of map nodes, plays
   energy-cost cards (attacks, skills, powers, and SUMMONS that
   call creatures to fight beside them), reads enemy intents, and
   fells a planet's great Quarry at the top. Playable solo, or in
   co-op for up to three Guardians against scaled foes.

   Everything here is ORIGINAL card content. Only the raw genre
   mechanics (energy, block, intents, a node map) are shared with
   the genre at large — none of another game's text or art. All
   creature art is reused from the existing Dya'Akara roster by
   species id, so a summoned Harkal looks exactly like a Harkal.

   This file holds DATA + pure helpers only. The battle engine is
   core/pia_engine.js, the run/map manager core/pia_run.js, the
   co-op layer core/pia_coop.js, and the screens ui/screens_pia.js.
   ============================================================ */
(function () {
  'use strict';
  const SP = DYA.species;
  const EL = SP.ELEMENT_COLORS;

  /* ================= EFFECT SCHEMA =================
     A card carries an `e` bag of effects the engine applies in a
     fixed order. All keys optional:
       damage      per-hit damage to the target(s)
       hits        number of hits (default 1 when damage set)
       aoe         true => damage hits every enemy
       block       block gained by the caster
       draw        cards drawn
       energy      Vaelk (energy) gained now
       heal        HP healed on the caster
       poison      poison stacks applied to target (aoe-aware)
       vuln        vulnerable stacks applied to target
       weak        weak stacks applied to target
       str         strength gained by the caster (whole battle)
       dex         dexterity gained by the caster (whole battle)
       regen       regen stacks on the caster
       strAllies   strength added to all your summoned allies
       blockAllies block granted to all your summoned allies
       reviveBlock caster grants block to a downed ally? (n/a solo)
       lifesteal   heal the caster for damage dealt
     A `summon` card additionally carries a `summon` descriptor —
     see SUMMONS below.
     `target`: 'enemy' (default for damage), 'self', 'allEnemies'.
     `exhaust`: card leaves the deck for the rest of the battle. */

  /* ================= GUARDIANS (hero classes) =================
     Each Guardian is locked to one element (its Vaelk flavor and
     its planet flavor), has a starting HP pool, a base energy of
     3, and a fixed starting deck. `avatar` is the existing species
     whose living art stands in as the Guardian on the field. */
  const GUARDIANS = [
    {
      id: 'tanoc', name: 'Tanoc', title: 'the Urverk', element: 'Ular',
      avatar: 'sword_eikar', maxHp: 80, color: EL.Ular,
      // a heavy-built Eikar with a duskier, earth-dark coat and a dorsal stripe
      phys: { hue: -12, light: -7, build: 1.12, marking: 'stripe', markSeed: 1201 },
      blurb: 'A sword-Eikar brawler who learned the Urverk at Aakalay. He trades blows up close, stacks his own strength, and holds the line while the earth answers his call.',
      // starting deck: card ids repeated by count
      deck: { strike_ular: 4, guard: 4, urverk_slam: 1, callearth: 1 },
      startRelic: 'okid_charm',
    },
    {
      id: 'kiet', name: 'Kiet', title: 'the Winddancer', element: 'Fti',
      avatar: 'archer_eikar', maxHp: 68, color: EL.Fti,
      // a lean, pale, airy Eikar with a facial blaze
      phys: { hue: 10, light: 15, build: 0.9, marking: 'blaze', markSeed: 5533 },
      blurb: 'A theatrical Nekhic’Eik archer-Eikar — wind and showmanship. He plays a flurry of cheap cards, never stands still, and punishes anything that overcommits.',
      deck: { strike_fti: 4, guard: 3, feint: 2, flourish: 1 },
      startRelic: 'nekhic_bell',
    },
    {
      id: 'buhkon', name: 'Buhkon Eldi', title: 'the Kindler', element: 'Eldi',
      avatar: 'chemist_eikar', maxHp: 74, color: EL.Eldi,
      // a solid, ember-warm Eikar dappled with pale spots
      phys: { hue: 20, light: -2, build: 1.05, marking: 'spots', markSeed: 3007 },
      blurb: 'The Carpenter — a chemist-Eikar; calm, deliberate, a mentor. He builds his side up rather than rushing it down, kindling burns and calling creatures to carry the fight.',
      deck: { strike_eldi: 4, guard: 3, ember: 2, kindle_call: 1 },
      startRelic: 'ember_seed',
    },
    {
      id: 'phorus', name: 'Phorus', title: 'the Tidewarden', element: 'Su',
      avatar: 'spear_eikar', maxHp: 82, color: EL.Su,
      // a heavy, deep-coated Eikar with pale sea-marked feet
      phys: { hue: -28, light: -10, build: 1.14, marking: 'socks', markSeed: 8842 },
      blurb: 'A coastal tide-warden — a spear-Eikar who fights like the sea itself: patient, heavy, inexorable. He walls up behind block, chills his foes to a crawl, and calls the depths up to drown them.',
      deck: { strike_su: 4, guard: 3, undertow: 1, calltide: 1 },
      startRelic: 'brine_charm',
    },
  ];

  /* ================= SUMMONS =================
     A summon puts an allied creature on YOUR side. It has its own
     HP and acts every ally phase. `species` is an existing roster
     creature so it renders with real art. Behaviors:
       dmg        it attacks an enemy for this each ally phase
       block      it grants the caster this block each ally phase
       healAlly   it heals the lowest-HP Guardian this each phase
       poison     its attack also applies this much poison
       taunt      enemies target taunting allies before Guardians
       guardPct   % of damage aimed at its owner it soaks instead
       decay      loses this much HP each turn (temporary summons) */
  const SUMMONS = {
    call_harkal: { species: 'harkal', name: 'Called Harkal', hp: 22, dmg: 8, taunt: false },
    call_rodak: { species: 'rodak', name: 'Rodak Pack', hp: 14, dmg: 6, count: 1 },
    call_grothyn: { species: 'ular_grothyn', name: 'Shell Grothyn', hp: 30, dmg: 4, block: 5, taunt: true, guardPct: 0.5 },
    call_stryx: { species: 'stryx', name: 'Rooted Stryx', hp: 26, dmg: 9 },
    call_kipsu: { species: 'kipsu', name: 'Kipsu', hp: 12, dmg: 5, healAlly: 4 },
    call_tyndael: { species: 'tyndael', name: 'Kindled Tyndael', hp: 20, dmg: 7, poison: 3 },
    call_krabbi: { species: 'raf_krabbi', name: 'Raf Krabbi', hp: 24, dmg: 7 },
    call_albali: { species: 'albali_byrd', name: 'Albali Byrd', hp: 18, dmg: 6, block: 4 },
    call_eikar: { species: 'spear_eikar', name: 'Spear Eikar', hp: 22, dmg: 8 },
    call_lutut: { species: 'lutut', name: 'Lutut', hp: 30, dmg: 12 },
    call_hvaleia: { species: 'hvaleia', name: 'Called Hvaleia', hp: 42, dmg: 10, block: 6, taunt: true, guardPct: 0.5 },
    call_sugrothyn: { species: 'su_grothyn', name: 'Su Grothyn', hp: 28, dmg: 4, block: 6, taunt: true },
  };

  /* ================= CARD LIBRARY =================
     rarity: starter | common | uncommon | rare
     A card omitting `target` on a damage effect defaults to a
     single enemy. `upgrade` fields overwrite the base `e`/summon
     values (merged) when a card is upgraded at a rest site. */
  const CARDS = {
    /* ---------- neutral basics (in starting decks) ---------- */
    strike_ular: { name: 'Earthen Strike', cls: 'tanoc', type: 'attack', cost: 1, rarity: 'starter',
      text: 'Deal 6 damage.', e: { damage: 6 }, upgrade: { e: { damage: 9 } } },
    strike_fti: { name: 'Wind Cut', cls: 'kiet', type: 'attack', cost: 1, rarity: 'starter',
      text: 'Deal 5 damage. Draw 1.', e: { damage: 5, draw: 1 }, upgrade: { e: { damage: 8, draw: 1 } } },
    strike_eldi: { name: 'Ember Strike', cls: 'buhkon', type: 'attack', cost: 1, rarity: 'starter',
      text: 'Deal 6 damage. Apply 2 Poison.', e: { damage: 6, poison: 2 }, upgrade: { e: { damage: 8, poison: 3 } } },
    guard: { name: 'Guard', cls: 'neutral', type: 'skill', cost: 1, rarity: 'starter',
      text: 'Gain 5 Block.', target: 'self', e: { block: 5 }, upgrade: { e: { block: 8 } } },

    /* ---------- Tanoc (Ular / brawler) ---------- */
    urverk_slam: { name: 'Urverk Slam', cls: 'tanoc', type: 'attack', cost: 2, rarity: 'starter',
      text: 'Deal 10 damage. Apply 2 Vulnerable.', e: { damage: 10, vuln: 2 }, upgrade: { e: { damage: 14, vuln: 3 } } },
    callearth: { name: 'Call the Earth', cls: 'tanoc', type: 'summon', cost: 2, rarity: 'starter',
      text: 'Summon a Shell Grothyn (30 HP, taunts, guards you, gains 5 Block/turn).', summon: 'call_grothyn', upgrade: { summonBonus: { hp: 12 } } },
    bracewall: { name: 'Bracewall', cls: 'tanoc', type: 'skill', cost: 1, rarity: 'common',
      text: 'Gain 8 Block. Gain 1 Strength.', target: 'self', e: { block: 8, str: 1 }, upgrade: { e: { block: 11, str: 1 } } },
    heavyswing: { name: 'Heavy Swing', cls: 'tanoc', type: 'attack', cost: 2, rarity: 'common',
      text: 'Deal 8 damage. Deal 8 more if you have Block.', e: { damage: 8, bonusIfBlock: 8 }, upgrade: { e: { damage: 10, bonusIfBlock: 10 } } },
    quake: { name: 'Aakalay Quake', cls: 'tanoc', type: 'attack', cost: 2, rarity: 'uncommon',
      text: 'Deal 7 damage to ALL enemies. Apply 1 Vulnerable to all.', target: 'allEnemies', e: { damage: 7, aoe: true, vuln: 1 }, upgrade: { e: { damage: 10, aoe: true, vuln: 1 } } },
    urverk_stance: { name: 'Urverk Stance', cls: 'tanoc', type: 'power', cost: 1, rarity: 'uncommon',
      text: 'Power. Whenever you play an Attack, gain 2 Block.', target: 'self', e: { power: 'blockOnAttack', amount: 2 }, upgrade: { e: { power: 'blockOnAttack', amount: 3 } } },
    stonehide: { name: 'Stonehide', cls: 'tanoc', type: 'skill', cost: 2, rarity: 'common',
      text: 'Gain 14 Block.', target: 'self', e: { block: 14 }, upgrade: { e: { block: 18 } } },
    warcall: { name: 'Warcall', cls: 'tanoc', type: 'skill', cost: 1, rarity: 'uncommon',
      text: 'Gain 3 Strength. All your allies gain 3 Strength.', target: 'self', e: { str: 3, strAllies: 3 }, upgrade: { e: { str: 4, strAllies: 4 } } },
    naga_breaker: { name: 'Naga Breaker', cls: 'tanoc', type: 'attack', cost: 3, rarity: 'rare',
      text: 'Deal 22 damage. If it kills, gain 2 energy.', e: { damage: 22, refundOnKill: 2 }, upgrade: { e: { damage: 30, refundOnKill: 2 } } },
    summon_eikar: { name: 'Rally an Eikar', cls: 'tanoc', type: 'summon', cost: 2, rarity: 'common',
      text: 'Summon a Spear Eikar (22 HP, hits for 8).', summon: 'call_eikar', upgrade: { summonBonus: { hp: 8, dmg: 3 } } },

    /* ---------- Kiet (Fti / tempo) ---------- */
    feint: { name: 'Feint', cls: 'kiet', type: 'skill', cost: 0, rarity: 'starter',
      text: 'Gain 4 Block. Draw 1.', target: 'self', e: { block: 4, draw: 1 }, upgrade: { e: { block: 6, draw: 1 } } },
    flourish: { name: 'Nekhic Flourish', cls: 'kiet', type: 'attack', cost: 1, rarity: 'starter',
      text: 'Deal 4 damage 2 times.', e: { damage: 4, hits: 2 }, upgrade: { e: { damage: 6, hits: 2 } } },
    dartwind: { name: 'Dart on the Wind', cls: 'kiet', type: 'attack', cost: 0, rarity: 'common',
      text: 'Deal 3 damage. Apply 1 Weak.', e: { damage: 3, weak: 1 }, upgrade: { e: { damage: 5, weak: 1 } } },
    updraft: { name: 'Updraft', cls: 'kiet', type: 'skill', cost: 1, rarity: 'common',
      text: 'Gain 2 Dexterity. Draw 2.', target: 'self', e: { dex: 2, draw: 2 }, upgrade: { e: { dex: 3, draw: 2 } } },
    stormstep: { name: 'Stormstep', cls: 'kiet', type: 'attack', cost: 1, rarity: 'uncommon',
      text: 'Deal 6 damage. Draw 1. Gain 1 energy.', e: { damage: 6, draw: 1, energy: 1 }, upgrade: { e: { damage: 9, draw: 1, energy: 1 } } },
    cyclone: { name: 'Cyclone', cls: 'kiet', type: 'attack', cost: 2, rarity: 'uncommon',
      text: 'Deal 5 damage to ALL enemies 2 times.', target: 'allEnemies', e: { damage: 5, hits: 2, aoe: true }, upgrade: { e: { damage: 7, hits: 2, aoe: true } } },
    showoff: { name: 'Showmanship', cls: 'kiet', type: 'power', cost: 1, rarity: 'uncommon',
      text: 'Power. The first card you play each turn costs 0.', target: 'self', e: { power: 'firstFree' }, upgrade: { cost: 0 } },
    thousandcuts: { name: 'Thousand Cuts', cls: 'kiet', type: 'power', cost: 1, rarity: 'rare',
      text: 'Power. Whenever you play a card, deal 1 damage to ALL enemies.', target: 'self', e: { power: 'cutsOnPlay', amount: 1 }, upgrade: { e: { power: 'cutsOnPlay', amount: 2 } } },
    call_stormbyrd: { name: 'Call an Albali Byrd', cls: 'kiet', type: 'summon', cost: 1, rarity: 'common',
      text: 'Summon an Albali Byrd (18 HP, hits for 6, gives you 4 Block/turn).', summon: 'call_albali', upgrade: { summonBonus: { hp: 6, dmg: 2 } } },
    tempest_diver: { name: 'Tempest Diver', cls: 'kiet', type: 'summon', cost: 2, rarity: 'rare',
      text: 'Summon a Lutut (30 HP, dives for 12).', summon: 'call_lutut', upgrade: { summonBonus: { dmg: 4 } } },

    /* ---------- Buhkon (Eldi / summon & burn) ---------- */
    ember: { name: 'Ember', cls: 'buhkon', type: 'attack', cost: 1, rarity: 'starter',
      text: 'Apply 4 Poison.', e: { poison: 4 }, upgrade: { e: { poison: 6 } } },
    kindle_call: { name: 'Kindle-Call', cls: 'buhkon', type: 'summon', cost: 1, rarity: 'starter',
      text: 'Summon a Kindled Tyndael (20 HP, hits for 7 and applies 3 Poison).', summon: 'call_tyndael', upgrade: { summonBonus: { hp: 8 } } },
    hearthguard: { name: 'Hearthguard', cls: 'buhkon', type: 'summon', cost: 2, rarity: 'common',
      text: 'Summon a Kipsu (12 HP) that heals your lowest Guardian 4/turn.', summon: 'call_kipsu', upgrade: { summonBonus: { healAlly: 3, hp: 6 } } },
    firewall: { name: 'Firewall', cls: 'buhkon', type: 'skill', cost: 2, rarity: 'common',
      text: 'Gain 12 Block. Apply 3 Poison to ALL enemies.', target: 'self', e: { block: 12, poisonAll: 3 }, upgrade: { e: { block: 15, poisonAll: 4 } } },
    conflagration: { name: 'Conflagration', cls: 'buhkon', type: 'attack', cost: 2, rarity: 'uncommon',
      text: 'Deal damage to ALL enemies equal to their Poison.', target: 'allEnemies', e: { detonatePoison: true, aoe: true }, upgrade: { cost: 1 } },
    carpenter: { name: "Carpenter's Patience", cls: 'buhkon', type: 'power', cost: 1, rarity: 'uncommon',
      text: 'Power. At the start of your turn, all your allies gain 3 Strength.', target: 'self', e: { power: 'allyGrowth', amount: 3 }, upgrade: { e: { power: 'allyGrowth', amount: 4 } } },
    emberroot: { name: 'Ember-Root', cls: 'buhkon', type: 'skill', cost: 1, rarity: 'common',
      text: 'Gain 4 Regen. Draw 1.', target: 'self', e: { regen: 4, draw: 1 }, upgrade: { e: { regen: 6, draw: 1 } } },
    pyre: { name: 'Great Pyre', cls: 'buhkon', type: 'attack', cost: 3, rarity: 'rare',
      text: 'Apply 8 Poison to ALL enemies. Summon a Raf Krabbi (24 HP).', target: 'allEnemies', e: { poisonAll: 8 }, summon: 'call_krabbi', upgrade: { e: { poisonAll: 12 } } },
    twin_call: { name: 'Twin Call', cls: 'buhkon', type: 'summon', cost: 2, rarity: 'uncommon',
      text: 'Summon a Rooted Stryx (26 HP, hits for 9) AND a Called Harkal (22 HP, hits for 8).', summon: ['call_stryx', 'call_harkal'], upgrade: { summonBonus: { hp: 8 } } },

    /* ---------- Phorus (Su / tide control & defense) ---------- */
    strike_su: { name: 'Tide Lash', cls: 'phorus', type: 'attack', cost: 1, rarity: 'starter',
      text: 'Deal 6 damage.', e: { damage: 6 }, upgrade: { e: { damage: 9 } } },
    undertow: { name: 'Undertow', cls: 'phorus', type: 'attack', cost: 2, rarity: 'starter',
      text: 'Deal 8 damage. Apply 2 Weak.', e: { damage: 8, weak: 2 }, upgrade: { e: { damage: 11, weak: 2 } } },
    calltide: { name: 'Call the Tide', cls: 'phorus', type: 'summon', cost: 1, rarity: 'starter',
      text: 'Summon a Called Harkal (22 HP, hits for 8).', summon: 'call_harkal', upgrade: { summonBonus: { hp: 6, dmg: 2 } } },
    brine_ward: { name: 'Brine Ward', cls: 'phorus', type: 'skill', cost: 1, rarity: 'common',
      text: 'Gain 8 Block. Gain 2 Regen.', target: 'self', e: { block: 8, regen: 2 }, upgrade: { e: { block: 11, regen: 3 } } },
    riptide: { name: 'Riptide', cls: 'phorus', type: 'attack', cost: 1, rarity: 'common',
      text: 'Deal 7 damage. Apply 1 Weak.', e: { damage: 7, weak: 1 }, upgrade: { e: { damage: 10, weak: 1 } } },
    deepdraw: { name: 'Deep Draw', cls: 'phorus', type: 'skill', cost: 1, rarity: 'common',
      text: 'Gain 5 Block. Draw 2.', target: 'self', e: { block: 5, draw: 2 }, upgrade: { e: { block: 8, draw: 2 } } },
    call_depths: { name: 'Call the Depths', cls: 'phorus', type: 'summon', cost: 2, rarity: 'common',
      text: 'Summon a Su Grothyn (28 HP, taunts, guards you, gains 6 Block/turn).', summon: 'call_sugrothyn', upgrade: { summonBonus: { hp: 10 } } },
    chillwater: { name: 'Chillwater', cls: 'phorus', type: 'skill', cost: 2, rarity: 'uncommon',
      text: 'Gain 8 Block. Apply 3 Weak to ALL enemies.', target: 'allEnemies', e: { block: 8, weak: 3 }, upgrade: { e: { block: 11, weak: 3 } } },
    tide_surge: { name: 'Tide Surge', cls: 'phorus', type: 'attack', cost: 2, rarity: 'uncommon',
      text: 'Deal 6 damage to ALL enemies. Apply 1 Weak to all.', target: 'allEnemies', e: { damage: 6, weak: 1 }, upgrade: { e: { damage: 9, weak: 1 } } },
    tidal_bulwark: { name: 'Tidal Bulwark', cls: 'phorus', type: 'power', cost: 1, rarity: 'uncommon',
      text: 'Power. Whenever you play a Skill, gain 3 Block.', target: 'self', e: { power: 'blockOnSkill', amount: 3 }, upgrade: { e: { power: 'blockOnSkill', amount: 4 } } },
    leviathan_call: { name: 'Leviathan Call', cls: 'phorus', type: 'summon', cost: 2, rarity: 'rare',
      text: 'Summon a Called Hvaleia (42 HP, taunts, guards you, hits for 10).', summon: 'call_hvaleia', upgrade: { summonBonus: { hp: 16 } } },
    maelstrom: { name: 'Maelstrom', cls: 'phorus', type: 'attack', cost: 3, rarity: 'rare',
      text: 'Deal 10 damage to ALL enemies. Apply 2 Weak to all.', target: 'allEnemies', e: { damage: 10, weak: 2 }, upgrade: { e: { damage: 14, weak: 2 } } },
    drowned_might: { name: 'Drowned Might', cls: 'phorus', type: 'attack', cost: 2, rarity: 'rare',
      text: 'Deal 14 damage. Lifesteal.', e: { damage: 14, lifesteal: true }, upgrade: { e: { damage: 19, lifesteal: true } } },

    /* ---------- neutral (reward pool for everyone) ---------- */
    steady_breath: { name: 'Steady Breath', cls: 'neutral', type: 'skill', cost: 0, rarity: 'common',
      text: 'Gain 3 Block. Draw 1.', target: 'self', e: { block: 3, draw: 1 }, upgrade: { e: { block: 5, draw: 1 } } },
    hunters_focus: { name: "Hunter's Focus", cls: 'neutral', type: 'skill', cost: 1, rarity: 'uncommon',
      text: 'Gain 1 energy. Draw 2.', target: 'self', e: { energy: 1, draw: 2 }, upgrade: { cost: 0 } },
    okid_draught: { name: 'Okid Draught', cls: 'neutral', type: 'skill', cost: 1, rarity: 'common',
      text: 'Heal 8 HP.', target: 'self', e: { heal: 8 }, upgrade: { e: { heal: 12 } } },
    relic_ward: { name: 'Relic Ward', cls: 'neutral', type: 'skill', cost: 2, rarity: 'uncommon',
      text: 'Gain 10 Block. All your allies gain 6 Block.', target: 'self', e: { block: 10, blockAllies: 6 }, upgrade: { e: { block: 14, blockAllies: 8 } } },
    call_pack: { name: 'Call a Rodak Pack', cls: 'neutral', type: 'summon', cost: 1, rarity: 'common',
      text: 'Summon a Rodak Pack (14 HP, hits for 6).', summon: 'call_rodak', upgrade: { summonBonus: { hp: 6, dmg: 2 } } },
    mikolo_gambit: { name: 'Mikolo Gambit', cls: 'neutral', type: 'attack', cost: 1, rarity: 'uncommon',
      text: 'Deal 9 damage. Lifesteal.', e: { damage: 9, lifesteal: true }, upgrade: { e: { damage: 13, lifesteal: true } } },
  };

  /* ================= RELICS =================
     Passive, whole-run. The engine reads `mods` at hook points, so
     most relics are pure data. */
  const RELICS = {
    okid_charm: { name: 'Okid Charm', icon: '⬡', rarity: 'starter',
      text: 'At the start of each battle, gain 6 Block.', mods: { startBlock: 6 } },
    nekhic_bell: { name: "Nekhic'Eik Bell", icon: '🔔', rarity: 'starter',
      text: 'The first turn of each battle, gain 1 extra energy.', mods: { startEnergyOnce: 1 } },
    ember_seed: { name: 'Ember Seed', icon: '🌱', rarity: 'starter',
      text: 'At the start of each battle, apply 2 Poison to a random enemy.', mods: { startPoisonRandom: 2 } },
    brine_charm: { name: 'Brine Charm', icon: '🐚', rarity: 'starter',
      text: 'At the start of each battle, gain 4 Block and 2 Regen.', mods: { startBlock: 4, startRegen: 2 } },
    tide_pearl: { name: 'Tide Pearl', icon: '🔵', rarity: 'common',
      text: 'At the start of each battle, gain 3 Regen.', mods: { startRegen: 3 } },
    vaelk_core: { name: 'Vaelk Core', icon: '◈', rarity: 'boss',
      text: 'Gain 1 extra energy every turn. Start each battle 6 HP lower.', mods: { energyPerTurn: 1, maxHpDelta: -6 } },
    hunters_horn: { name: "Hunter's Horn", icon: '🎺', rarity: 'uncommon',
      text: 'Your summoned allies enter with +8 HP and +2 Strike.', mods: { summonHp: 8, summonDmg: 2 } },
    growers_ring: { name: "Grower's Ring", icon: '💍', rarity: 'uncommon',
      text: 'At the start of your turn, all your allies gain 1 Strength.', mods: { allyGrowthPerTurn: 1 } },
    stone_totem: { name: 'Stone Totem', icon: '🪨', rarity: 'common',
      text: 'The first time each battle you would drop below 1 HP on a hit, survive with 1 HP.', mods: { deathWard: true } },
    guild_seal: { name: 'Guild Seal', icon: '🎖️', rarity: 'uncommon',
      text: 'After each battle, heal 6 HP and gain 15 gold.', mods: { nodeHeal: 6, nodeGold: 15 } },
    naga_scale: { name: 'Naga Scale', icon: '🐉', rarity: 'boss',
      text: 'Draw 1 extra card each turn.', mods: { drawPerTurn: 1 } },
    warm_hoard: { name: 'Warm Hoard', icon: '🪙', rarity: 'common',
      text: 'Start each run with 40 extra gold. Gain +25% gold from battles.', mods: { goldMul: 0.25 } },
  };

  /* ================= ENEMIES =================
     `moves` are the possible intents. The engine's simple AI picks
     among them (avoiding 3-in-a-row of the same). Damage shown to
     the player is the per-hit dmg (post-scaling). `size` scales the
     art. Summoner enemies carry a `summon` move. */
  const ENEMIES = {
    /* -- Velki (Su) fodder & elites -- */
    e_krabbi: { species: 'raf_krabbi', name: 'Raf Krabbi', hp: 26, size: 1,
      moves: [{ id: 'pinch', intent: 'attack', dmg: 7 }, { id: 'spark', intent: 'attack', dmg: 4, hits: 2 }, { id: 'shell', intent: 'block', block: 6 }] },
    e_harkal: { species: 'harkal', name: 'Harkal', hp: 20, size: 1,
      moves: [{ id: 'dive', intent: 'attack', dmg: 9 }, { id: 'screech', intent: 'debuff', weak: 1, name: 'Screech' }] },
    e_hvaleia: { species: 'hvaleia', name: 'Hvaleia', hp: 55, size: 3, elite: true,
      moves: [{ id: 'maw', intent: 'attack', dmg: 14 }, { id: 'sound', intent: 'attack', dmg: 5, hits: 3 }, { id: 'harden', intent: 'block', block: 12 }] },
    e_grothyn_su: { species: 'su_grothyn', name: 'Su Grothyn', hp: 34, size: 1,
      moves: [{ id: 'harden', intent: 'block', block: 10 }, { id: 'spew', intent: 'attack', dmg: 8 }] },

    /* -- Xikia (Ular) fodder & elites -- */
    e_rodak: { species: 'rodak', name: 'Rodak', hp: 14, size: 0,
      moves: [{ id: 'bite', intent: 'attack', dmg: 6 }, { id: 'circle', intent: 'buff', str: 2, name: 'Circle' }] },
    e_wildpunk: { species: 'wild_punk', name: 'Wild Punk', hp: 22, size: 1,
      moves: [{ id: 'lash', intent: 'attack', dmg: 8 }, { id: 'grab', intent: 'debuff', weak: 1, dmg: 3, name: 'Vine Grab' }] },
    e_sruvorn: { species: 'sru_vorn', name: 'Sru Vorn', hp: 60, size: 3, elite: true,
      moves: [{ id: 'ambush', intent: 'attack', dmg: 16 }, { id: 'acid', intent: 'debuff', vuln: 2, dmg: 6, name: 'Acid Spray' }, { id: 'coil', intent: 'block', block: 10 }] },
    e_makari: { species: 'makari_swarm', name: 'Makari Swarm', hp: 18, size: 1,
      moves: [{ id: 'swarm', intent: 'attack', dmg: 3, hits: 3 }, { id: 'thin', intent: 'block', block: 5 }] },

    /* -- Leotik (Fti) fodder & elites -- */
    e_albali: { species: 'albali_byrd', name: 'Albali Byrd', hp: 24, size: 1,
      moves: [{ id: 'peck', intent: 'attack', dmg: 8 }, { id: 'guard', intent: 'block', block: 8 }] },
    e_kuni: { species: 'kuni_byrd_wild', name: 'Kuni Byrd', hp: 30, size: 2,
      moves: [{ id: 'stoop', intent: 'attack', dmg: 12 }, { id: 'shadow', intent: 'debuff', vuln: 2, name: 'Shadow Pass' }] },
    e_lutut: { species: 'lutut', name: 'Lutut', hp: 58, size: 3, elite: true,
      moves: [{ id: 'screech', intent: 'debuff', weak: 2, dmg: 4, name: 'Stun Screech' }, { id: 'dive', intent: 'attack', dmg: 15 }, { id: 'circle', intent: 'buff', str: 3, name: 'Circle' }] },
    e_malstipunk: { species: 'malsti_punk', name: 'Malsti Punk', hp: 16, size: 0,
      moves: [{ id: 'blink', intent: 'debuff', weak: 1, name: 'Duat Blink' }, { id: 'raid', intent: 'attack', dmg: 7 }] },

    /* -- shared: a minion the bosses summon -- */
    m_harkal: { species: 'harkal', name: 'Shoal Harkal', hp: 12, size: 0,
      moves: [{ id: 'dive', intent: 'attack', dmg: 6 }] },
    m_makari: { species: 'makari_swarm', name: 'Swarmling', hp: 10, size: 0,
      moves: [{ id: 'swarm', intent: 'attack', dmg: 4 }] },
    m_kuni: { species: 'kuni_byrd_wild', name: 'Flock Byrd', hp: 14, size: 1,
      moves: [{ id: 'stoop', intent: 'attack', dmg: 7 }] },
  };

  /* ================= BOSSES (the Quarry) =================
     One legendary per planet, scaled into a true boss that summons
     minions each few turns — the Big Momma Kofi pattern. */
  const BOSSES = {
    velki: { species: 'su_naga', name: 'Vaelmyr, the Tidewyrm', hp: 300, size: 4, boss: true, heads: 3,
      blurb: 'A Su Naga swollen to legend in the deep — its first head near-unkillable, and it never stops calling the shoals.',
      moves: [
        { id: 'crush', intent: 'attack', dmg: 20 },
        { id: 'tide', intent: 'attack', dmg: 8, hits: 3 },
        { id: 'call', intent: 'summon', summon: 'm_harkal', count: 2, name: 'Call the Shoals' },
        { id: 'coil', intent: 'block', block: 20 },
        { id: 'sunder', intent: 'debuff', vuln: 3, dmg: 10, name: 'Sunder' },
      ], summonEvery: 3 },
    xikia: { species: 'ular_naga', name: 'Kravaxis, the Coil of Xikia', hp: 320, size: 4, boss: true, heads: 3,
      blurb: 'An Ular Naga that rules the shelves by dominance — it floods the field with swarms as it coils.',
      moves: [
        { id: 'slam', intent: 'attack', dmg: 22 },
        { id: 'flood', intent: 'summon', summon: 'm_makari', count: 3, name: 'Flood the Field' },
        { id: 'dominance', intent: 'buff', str: 4, name: 'Dominance' },
        { id: 'lash', intent: 'attack', dmg: 7, hits: 3 },
        { id: 'coil', intent: 'block', block: 24 },
      ], summonEvery: 3 },
    leotik: { species: 'albali_villtur', name: 'Skarn Vhal, the Frontier Wing', hp: 260, size: 4, boss: true,
      blurb: 'A five-horned Albali Villtur that owns the ridgeline — it keeps calling its flock down out of the wind.',
      moves: [
        { id: 'stoop', intent: 'attack', dmg: 24 },
        { id: 'flock', intent: 'summon', summon: 'm_kuni', count: 2, name: 'Call the Flock' },
        { id: 'gale', intent: 'attack', dmg: 6, hits: 3 },
        { id: 'shadow', intent: 'debuff', vuln: 2, weak: 1, name: 'Shadow Pass' },
        { id: 'roost', intent: 'block', block: 18 },
      ], summonEvery: 3 },
  };

  /* ================= PLANETS / GROUNDS =================
     Each planet is a run: a map of nodes, its enemy pools by depth,
     and its boss. */
  const PLANETS = [
    { id: 'velki', name: 'Velki', element: 'Su',
      blurb: 'Drowned coasts and tide-caves. The water remembers everyone who wades in.',
      fodder: ['e_krabbi', 'e_harkal', 'e_grothyn_su'], elites: ['e_hvaleia'], boss: 'velki' },
    { id: 'xikia', name: 'Xikia', element: 'Ular',
      blurb: 'Highland shelves and lowland scrub. The ground itself is territorial here.',
      fodder: ['e_rodak', 'e_wildpunk', 'e_makari'], elites: ['e_sruvorn'], boss: 'xikia' },
    { id: 'leotik', name: 'Leotik', element: 'Fti',
      blurb: 'Frontier ridges and thin, fast air. Nothing up here holds still for long.',
      fodder: ['e_albali', 'e_kuni', 'e_malstipunk'], elites: ['e_lutut'], boss: 'leotik' },
  ];

  /* ================= TUNING =================
     Shared knobs. Multiplayer scaling lives here so co-op is a
     single, legible multiplier. */
  const TUNE = {
    baseEnergy: 3,
    handSize: 5,
    startGold: 60,
    maxSummons: 4,           // per Guardian
    /* co-op scaling per number of Guardians (index = playerCount) */
    enemyHpScale: [1, 1, 1.7, 2.4],   // 1p=1x, 2p=1.7x, 3p=2.4x total HP
    enemyDmgScale: [1, 1, 1.15, 1.3],
    extraEnemiesPerPlayer: 1,          // bigger packs with more Guardians
    /* card reward rarity odds */
    rewardOdds: { common: 0.62, uncommon: 0.31, rare: 0.07 },
    upgradeOdds: 0,
    restHeal: 0.30,          // fraction of max HP a rest heals
  };

  /* ================= PURE HELPERS ================= */
  function guardian(id) { return GUARDIANS.find(g => g.id === id) || null; }
  function planet(id) { return PLANETS.find(p => p.id === id) || null; }
  function card(id) { const c = CARDS[id]; return c ? Object.assign({ id }, c) : null; }
  function relic(id) { const r = RELICS[id]; return r ? Object.assign({ id }, r) : null; }
  function summonDef(id) { const s = SUMMONS[id]; return s ? Object.assign({ key: id }, s) : null; }
  function enemyDef(id) { const e = ENEMIES[id] || BOSSES[id]; return e ? Object.assign({ key: id }, e) : null; }
  function bossDef(id) { const b = BOSSES[id]; return b ? Object.assign({ key: id }, b) : null; }

  /* The reward pool for a Guardian: its own class cards + neutrals,
     of a given rarity. */
  function rewardPool(clsId, rarity) {
    return Object.keys(CARDS).filter(id => {
      const c = CARDS[id];
      if (c.rarity === 'starter') return false;
      if (c.rarity !== rarity) return false;
      return c.cls === clsId || c.cls === 'neutral';
    });
  }

  /* Expand a deck spec {cardId: count} into an array of card ids. */
  function expandDeck(spec) {
    const out = [];
    for (const id in spec) for (let i = 0; i < spec[id]; i++) out.push(id);
    return out;
  }

  DYA.piaData = {
    GUARDIANS, SUMMONS, CARDS, RELICS, ENEMIES, BOSSES, PLANETS, TUNE,
    guardian, planet, card, relic, summonDef, enemyDef, bossDef,
    rewardPool, expandDeck,
    ELEMENT_COLORS: SP.ELEMENT_COLORS, ELEMENT_NAMES: SP.ELEMENT_NAMES,
  };
})();
