/* ============================================================
   DYA'AKARA — data/abilities.js
   A human-readable CATALOG of everything the match engine actually
   reads off a creature: its per-individual variables, its trait
   picks, its tags, and its feature flags. The Admin Panel turns
   this into dropdown menus so a designer can grant an ability
   without knowing its internal key name.

   Only descriptions & option lists live here. The valid numeric
   RANGES for each variable are learned from the real species data
   at edit time (admin.js aggregates every species' vars), so this
   file never goes stale on numbers — only on prose.
   ============================================================ */
(function () {
  'use strict';
  const A = {};

  /* turn a camelCase key into a Title Case label */
  A.humanize = function (k) {
    return String(k).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, c => c.toUpperCase());
  };

  /* ---------- VARIABLES (rolled 0..1 or a raw range per individual) ----------
     desc = what it does on the field. Anything not listed still shows up in the
     dropdown (learned from species data) with an auto label. */
  A.VARS = {
    resourceCount: { desc: 'Resources this creature GENERATES for you each pulse (make any creature a producer). Pair with the “generator” tag and the “resourceTypes” pick.' },
    aggressionThreshold: { desc: 'How eager it is to attack. Higher = strikes sooner; lower = holds/guards.' },
    aggressionRadius: { desc: 'How far out it looks for something to attack.' },
    aggressionRange: { desc: 'How far out it looks for something to attack.' },
    territorialAggression: { desc: 'Extra aggression when defending its own ground/hoard.' },
    territory: { desc: 'Size of the area it treats as home turf.' },
    awarenessRadius: { desc: 'How close prey must get before a dormant/ambush creature wakes.' },
    detectRange: { desc: 'How far it can sense enemies (stealth counters this).' },
    seekRange: { desc: 'How far it will roam looking for a fight or a target.' },
    vineLength: { desc: 'Reach of the Punk-family vine — its melee/grab range.' },
    breathCooldown: { desc: 'Seconds between elemental breath attacks (lower = more often).' },
    breathRange: { desc: 'Range of the breath attack.' },
    teleportRange: { desc: 'How far a Duat-blinker can teleport.' },
    teleportCooldown: { desc: 'Seconds between teleports.' },
    duatCapacity: { desc: 'How much stolen loot it can stash in the Duat.' },
    stealRate: { desc: 'How quickly a thief drains resources it reaches.' },
    dominance: { desc: 'Contest weight vs. rivals of its kind (bigger/multi-headed win).' },
    riderProtection: { desc: 'How strongly a mount defends its rider when the rider is attacked.' },
    commandResponse: { desc: 'How obediently a mount follows its rider’s strategic commands (0–1).' },
    antiMount: { desc: 'Bonus damage this unit deals against mounted/ridden creatures.' },
    intelligence: { desc: 'Tactical smarts — high values unlock the smart target-picking layer.' },
    tacticalIntelligence: { desc: 'Tactical smarts — high values unlock the smart target-picking layer.' },
    healPower: { desc: 'How much a healer restores per heal.' },
    healCooldown: { desc: 'Seconds between heals.' },
    buffPotency: { desc: 'Strength of buffs it grants allies.' },
    buffDuration: { desc: 'How long its buffs last.' },
    harvestOutput: { desc: 'Base resources a farmer/harvester gathers per pulse.' },
    workEthic: { desc: 'Multiplier on harvesting/building output.' },
    buildSpeed: { desc: 'How fast a builder raises structures.' },
    repairSpeed: { desc: 'How fast it repairs structures/allies.' },
    structureQuality: { desc: 'How strong the things it builds are.' },
    absorbRate: { desc: 'How much it drains/absorbs from what it touches.' },
    carrySpeed: { desc: 'Movement speed while carrying the Relic (thieves keep more).' },
    sprint: { desc: 'Burst movement multiplier.' },
    vigor: { desc: 'General toughness/constitution roll.' },
    bravery: { desc: 'How long it fights before fleeing when hurt.' },
    confidence: { desc: 'Willingness to pick fights it might lose.' },
    patience: { desc: 'How long an ambusher waits before committing.' },
    precision: { desc: 'Accuracy of its attacks.' },
    reach: { desc: 'General attack reach.' },
    recovery: { desc: 'How fast it recovers between actions.' },
    reactionSpeed: { desc: 'How quickly it responds to threats.' },
    jawStrength: { desc: 'Bite damage multiplier.' },
    spikeDamage: { desc: 'Damage from spikes/quills.' },
    crushPotency: { desc: 'Crushing/impact damage.' },
    acidPotency: { desc: 'Acid/corrosion damage.' },
    electricPotency: { desc: 'Electric damage.' },
    jetPotency: { desc: 'Water/ink jet damage.' },
    jetRange: { desc: 'Range of the jet attack.' },
    flameRegen: { desc: 'How fast its flame recovers.' },
    flameSustain: { desc: 'How long its flame lasts.' },
    heat: { desc: 'Starting heat/charge for flame creatures.' },
    quiver: { desc: 'Starting ammo for ranged units.' },
    drawSpeed: { desc: 'How fast an archer fires.' },
    bowQuality: { desc: 'Damage/accuracy of ranged shots.' },
    haniiRange: { desc: 'Range of the hanii (thrown/ranged) attack.' },
    haniiAccuracy: { desc: 'Accuracy of the hanii attack.' },
    screechPower: { desc: 'Strength of a stun/fear screech.' },
    conversionRange: { desc: 'Range over which it converts/affects others.' },
    efficiency: { desc: 'Conversion/processing efficiency.' },
    camo: { desc: 'How well it hides (counters enemy detection).' },
    deception: { desc: 'Decoy/feint effectiveness.' },
    decoy: { desc: 'Strength of the decoy it leaves behind.' },
    stealth: { desc: 'How hard it is to detect.' },
    shellDurability: { desc: 'How much its shell absorbs.' },
    plateThickness: { desc: 'Armor plating — flat damage reduction.' },
    scarToughness: { desc: 'Damage taken off each blow when badly wounded.' },
    hairArmor: { desc: 'Keilia hair-armor protection.' },
    loyaltyToUnit: { desc: 'How strongly it sticks with its unit/formation.' },
    formationDiscipline: { desc: 'How tightly it holds formation.' },
    nestDefence: { desc: 'Aggression when its nest/young are threatened.' },
    foodMotivation: { desc: 'How strongly food/morsels pull it.' },
    troublemaker: { desc: 'Tendency toward chaotic, disruptive behavior.' },
    fieldSize: { desc: 'Radius of a stationary field creature’s effect.' },
    towerQuality: { desc: 'Strength of a tower it garrisons/builds.' },
    diveSpeed: { desc: 'Speed of a diving attack (flyers).' },
    chargeTime: { desc: 'Wind-up time before a heavy attack.' },
    potency: { desc: 'General strength of its signature effect.' },
    tongueLength: { desc: 'Reach of a tongue-grab.' },
    tongueSpeed: { desc: 'Speed of the tongue-grab.' },
    preyThreshold: { desc: 'Max prey size it will attack (relative to itself).' },
    blowholes: { desc: 'Number of spout/jet points.' },
    bogActivity: { desc: 'How active it is in bog/marsh terrain.' },
    filmPotency: { desc: 'Strength of a film/coating effect.' },
    kofiQuality: { desc: 'Quality of a Kofi’s fruit/yield.' },
    breedingDuration: { desc: 'How long breeding/spawning takes.' },
    respawn: { desc: 'Regrowth rate for regenerating creatures.' },
  };

  /* ---------- PICKS (each token gets ONE option) ----------
     options here are the canonical set; the editor also unions in any options
     found in real species data. */
  A.PICKS = {
    resourceTypes: { desc: 'What a generator produces.', options: ['single', 'multi'] },
    breathTier: { desc: 'Strength tier of the elemental breath.', options: [1, 2, 3] },
    hasBreath: { desc: 'Whether this individual has a breath weapon at all (1 = yes).', options: [0, 1] },
    headCount: { desc: 'How many heads (Naga). Also settable per-species under Heads.', options: [1, 2, 3, 4, 5] },
    vineBehavior: { desc: 'What the Punk vine does on a hit.', options: ['grab', 'hold', 'strangle', 'smash', 'bring close', 'throw'] },
    vineCapability: { desc: 'Advanced vine capability.', options: [] },
    riderRelationship: { desc: 'Bond between a mount and its rider.', options: ['Devoted', 'Protective', 'Independent', 'Symbiotic'] },
    targetPriority: { desc: 'Who it prefers to attack first.', options: ['smallest', 'nearest', 'largest', 'support', 'relic'] },
    targetPreference: { desc: 'Who it prefers to attack first.', options: ['smallest', 'nearest', 'support'] },
    huntingStyle: { desc: 'How it approaches a kill.', options: ['stalk', 'ambush', 'chase', 'pack'] },
    postCatch: { desc: 'What it does after catching prey.', options: [] },
    tendency: { desc: 'Overall behavioral leaning.', options: ['collector', 'harasser'] },
    stage: { desc: 'Life/growth stage.', options: [] },
    siegeProficiency: { desc: 'Skill at attacking structures.', options: [] },
    respawnTier: { desc: 'How strongly it regenerates.', options: [] },
    senseType: { desc: 'What sense wakes an ambusher.', options: ['heat', 'vibration'] },
    screechType: { desc: 'Kind of screech effect.', options: ['stun', 'fear', 'rally'] },
  };

  /* ---------- TAGS (on/off labels; some change engine behavior) ---------- */
  A.TAGS = [
    { id: 'apex', desc: 'Top predator — higher value, feared by prey.' },
    { id: 'generator', desc: 'Produces resources (works with the resourceCount variable).' },
    { id: 'mount', desc: 'Can be ridden — carries a rider into battle.' },
    { id: 'flyer', desc: 'Flies — ignores ground, water and bog.' },
    { id: 'stationary', desc: 'Cannot move from where it deploys.' },
    { id: 'passive', desc: 'Never initiates combat.' },
    { id: 'inert', desc: 'Does nothing on its own (props, fruit, fields).' },
    { id: 'thief', desc: 'Steals resources and can carry the Relic quickly.' },
    { id: 'swarm', desc: 'Fights as a swarm of small bodies.' },
    { id: 'sentient', desc: 'Intelligent — Eikar/Keilia-like; can lead and ride.' },
    { id: 'carnivore', desc: 'Meat-eater — hunts other creatures.' },
    { id: 'omnivore', desc: 'Eats anything.' },
    { id: 'herbivore', desc: 'Plant-eater — rarely the aggressor.' },
    { id: 'forest', desc: 'At home in forest terrain (fights better there).' },
    { id: 'su', desc: 'Water-aligned — unhindered in water.' },
    { id: 'fire', desc: 'Fire-aligned.' },
    { id: 'eikar', desc: 'Is an Eikar (the people who ride/lead).' },
    { id: 'prey', desc: 'Prey animal — flees, doesn’t hunt.' },
    { id: 'pack', desc: 'Fights better alongside its own kind.' },
    { id: 'biolum', desc: 'Bioluminescent (visual glow).' },
  ];

  /* ---------- FEATURES (flags; mostly visual, some mechanical) ---------- */
  A.FEATURES = [
    { id: 'heads', kind: 'number', desc: 'Number of heads (Naga). Each head adds contest weight and an attack.' },
    { id: 'rider', kind: 'toggle', desc: 'This creature can carry a rider (mount).' },
    { id: 'vines', kind: 'toggle', desc: 'Punk-family vines (visual + reach).' },
    { id: 'rooted', kind: 'toggle', desc: 'Rooted in place — cannot move.' },
    { id: 'rootsOnDeploy', kind: 'toggle', desc: 'Roots itself once deployed.' },
    { id: 'stationary', kind: 'toggle', desc: 'Immobile.' },
    { id: 'horns', kind: 'toggle', desc: 'Horns (visual + charge).' },
    { id: 'wings', kind: 'toggle', desc: 'Wings (visual; pair with the flyer tag).' },
    { id: 'shell', kind: 'toggle', desc: 'Armored shell (visual).' },
    { id: 'electric', kind: 'toggle', desc: 'Electric aura/attack.' },
    { id: 'fruit', kind: 'toggle', desc: 'Bears fruit (Kofi/Sprengju yield).' },
    { id: 'glow', kind: 'toggle', desc: 'Glowing (visual).' },
    { id: 'biolum', kind: 'toggle', desc: 'Bioluminescent body (visual).' },
    { id: 'biolumTail', kind: 'toggle', desc: 'Bioluminescent tail (visual).' },
    { id: 'duat', kind: 'toggle', desc: 'Duat-born (teleport visual).' },
    { id: 'rocky', kind: 'toggle', desc: 'Living rock (visual).' },
    { id: 'mouth', kind: 'toggle', desc: 'Cave-mouth strike (Gynge).' },
    { id: 'soft', kind: 'toggle', desc: 'Soft-bodied (visual).' },
    { id: 'lean', kind: 'toggle', desc: 'Lean build (visual).' },
    { id: 'flame', kind: 'toggle', desc: 'Flame body (visual).' },
  ];

  DYA.abilities = A;
})();
