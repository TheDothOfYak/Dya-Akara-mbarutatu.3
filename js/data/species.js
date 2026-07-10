/* ============================================================
   DYA'AKARA — data/species.js
   The full launch token roster (Master Design Doc, Part IV).
   Each species: stats, element, rarity band, size band, sprite
   rig config, per-individual variable ranges (Part V/VI), and
   Vakarborac dictionary text.

   rig: 'quad'  = small four-legged animal placeholder
        'biped' = small two-legged two-armed acorn placeholder
        (variants layered on top: wings, heads, shell, rooted,
         flame, swarm, crab, serpent, blob)
   ============================================================ */
(function () {
  'use strict';

  const RARITIES = ['Buri', 'Tui', 'Stamijan', 'Naelst', 'Onnar', 'Elster', 'Torcain'];
  const RARITY_COST = [1, 2, 3, 5, 8, 12, 20];      // resource cost to ready in-match
  const RARITY_VALUE = [40, 90, 200, 450, 1000, 2400, 6000]; // baseline gold market value
  const SIZES = ['Litk', 'Mael', 'Vel', 'Skor', 'Skaar'];
  const ELEMENTS = ['Fti', 'Su', 'Eldi', 'Ular'];
  const ELEMENT_COLORS = { Fti: '#f0f0f5', Su: '#3b9ae1', Eldi: '#e8842c', Ular: '#4caf50' };
  const ELEMENT_NAMES = { Fti: 'Air', Su: 'Water', Eldi: 'Fire', Ular: 'Earth' };

  /* Personality diamonds (Part V) */
  const DIAMONDS = {
    primary: ['Aggressive', 'Defensive', 'Hoarder', 'Explorer'],
    combat: ['Aggressive', 'Defensive', 'Evasive', 'Ambush'],
    social: ['Solitary', 'Pack', 'Territorial', 'Submissive'],
    risk: ['Reckless', 'Calculated', 'Cautious', 'Cowardly'],
    focus: ['Tunnel vision', 'Adaptable', 'Distracted', 'Reactive'],
    energy: ['Relentless', 'Steady', 'Burst', 'Lazy'],
    terrain: ['Fti', 'Su', 'Ular', 'Eldi'],
  };

  /* hp/dmg base multiplied by size factor at mint time */
  const SIZE_HP = [30, 60, 130, 260, 480];
  const SIZE_DMG = [4, 7, 13, 22, 34];
  const SIZE_RADIUS = [9, 13, 19, 27, 38];
  const SIZE_SPEED = [58, 52, 46, 38, 30];

  const S = {};
  function def(id, o) { o.id = id; S[id] = o; return o; }

  /* ================= PUNK FAMILY ================= */

  def('domestic_punk', {
    name: 'Domestic Punk', family: 'Punk Family', element: 'Ular', element2: 'Su',
    rarity: [1, 4], size: [1, 2], rig: 'quad',
    color: '#d97c2b', color2: '#3f7d3a', // pumpkin body, vine green
    features: { vines: true },
    tags: ['forest', 'mount', 'sapient', 'herbivore'],
    behavior: 'domestic_punk',
    statMul: { hp: 1.15, dmg: 0.9, speed: 1.0 },
    attackRange: 60,
    desc: 'A sapient, pumpkin-bodied creature trailing long vines, long kept alongside Eikar and Keilia as companions and mounts.',
    temperament: 'Loyal, steady, and protective — it favors defense over aggression and bonds closely with its rider or partner.',
    special: 'Water breath is passive Su resource generation only — never a weapon. Can carry an Eikar or Keilia rider; the pair fight as one unit.',
    vars: { vineLength: [45, 95], aggressionThreshold: [0.35, 0.8], loyalty: [0.5, 1], breathCooldown: [8, 16], carryCapacity: [1, 2] },
    picks: {
      vineBehavior: ['grab', 'hold', 'strangle', 'smash', 'bring close', 'throw'],
      breathTier: [1, 1, 2, 2, 3],
      riderRelationship: ['Devoted', 'Protective', 'Independent', 'Symbiotic'],
    },
  });

  def('wild_punk', {
    name: 'Wild Punk', family: 'Punk Family', element: 'Ular',
    rarity: [1, 3], size: [1, 1], rig: 'quad',
    color: '#b8641f', color2: '#2e5c2a',
    features: { vines: true, lean: true },
    tags: ['forest', 'herbivore'],
    behavior: 'wild_punk',
    statMul: { hp: 0.9, dmg: 1.05, speed: 1.3 },
    attackRange: 60,
    desc: 'A faster, leaner cousin of the Domestic Punk — same pumpkin-and-vine family, grown wild.',
    temperament: 'Territorial and evasive — it would rather fight while fleeing than ever stand its ground.',
    special: 'Hoarder instinct: opportunistically grabs anything smaller that wanders too close. Some individuals carry a weak passive water breath.',
    vars: { vineLength: [40, 80], territory: [90, 200], aggressionThreshold: [0.3, 0.7], breathCooldown: [14, 24] },
    picks: { vineBehavior: ['grab', 'smash', 'throw'], hasBreath: [0, 0, 0, 1], ularAffinity: [0.1, 0.2, 0.3] },
  });

  def('malsti_punk', {
    name: 'Malsti Punk', family: 'Punk Family', element: 'Fti',
    rarity: [2, 5], size: [0, 0], rig: 'quad',
    color: '#5a3a75', color2: '#241733', // duat-born: violet-dark
    features: { vines: true, duat: true },
    tags: ['duat', 'thief'],
    behavior: 'malsti_punk',
    statMul: { hp: 0.75, dmg: 0.8, speed: 1.35 },
    attackRange: 40,
    desc: 'The smallest of the Punk family, born of the Duat itself.',
    temperament: 'Highly intelligent, restless, and single-minded about raiding — it slips into an enemy’s hoard to steal, disrupt, and harass.',
    special: 'Teleports through the Duat. Cannot teleport with the Relic, ever. Cannot blink into an occupied space. Stashes stolen resources in the Duat.',
    vars: { teleportRange: [120, 260], teleportCooldown: [4, 9], duatCapacity: [2, 6], stealth: [0.3, 0.9], precision: [0.5, 1] },
    picks: { tendency: ['collector', 'harasser'], targetPreference: ['smallest', 'nearest', 'support'] },
  });

  /* ================= CREATURE TOKENS ================= */

  def('gynge', {
    name: 'Gynge', family: 'Creature', element: 'Ular',
    rarity: [0, 6], size: [0, 4], rig: 'quad',
    color: '#8a8578', color2: '#5d594f', // living rock
    features: { rocky: true, stationary: true, mouth: true },
    tags: ['stationary', 'ambush', 'biolum'],
    behavior: 'gynge',
    statMul: { hp: 1.8, dmg: 1.6, speed: 0 },
    attackRange: 55,
    desc: 'A living creature of rock that erupts up from the ground.',
    temperament: 'Utterly motionless until something warm or vibrating comes close — then its mouth opens like a cave and it strikes.',
    special: 'Fully stationary. Dormant until awareness is triggered. Strikes prey at least one size tier smaller within mouth range. Flip mechanic reserved for a future token.',
    vars: { awarenessRadius: [60, 140], aggressionThreshold: [0.2, 0.8], slumberDepth: [1, 4], mouthSpeed: [0.6, 1.4] },
    picks: { senseType: ['heat', 'vibration'] },
  });

  def('kofi', {
    name: 'Kofi', family: 'Creature', element: 'Ular',
    rarity: [0, 0], size: [0, 0], rig: 'quad',
    color: '#c9a26b', color2: '#8a6f4a',
    features: { soft: true },
    tags: ['prey', 'herbivore', 'spawned'],
    behavior: 'kofi',
    statMul: { hp: 0.4, dmg: 0.1, speed: 1.1 },
    attackRange: 0, notCraftable: true,
    desc: 'The world’s prey animal — small, soft, and eaten by nearly everything.',
    temperament: 'Flighty. Runs from everything, is chased by everything.',
    special: 'Every moving Kofi triggers the prey instinct of every carnivore on the field, regardless of team.',
    vars: { vigor: [0.5, 1] }, picks: {},
  });

  def('big_momma_kofi', {
    name: 'Big Momma Kofi', family: 'Creature', element: 'Ular',
    rarity: [2, 5], size: [2, 2], rig: 'quad',
    color: '#d4b078', color2: '#96784e',
    features: { soft: true, round: true },
    tags: ['prey', 'spawner', 'herbivore'],
    behavior: 'big_momma_kofi',
    statMul: { hp: 1.4, dmg: 0.1, speed: 0.9 },
    attackRange: 0,
    desc: 'A great mother Kofi. She plants herself and breeds, producing one Kofi for every pulse of resources nearby.',
    temperament: 'Two lives: rooted, patient breeder — then a mobile, flighty wanderer who never fights back.',
    special: 'Breeding phase: stationary, spawns one Kofi per resource pulse (element matches the pulse). Spawned Kofi disrupt every carnivore on the field. She cannot fight back while breeding.',
    vars: { breedingDuration: [60, 130], kofiQuality: [0.4, 1] },
    picks: { postBreeding: ['flee', 'flee', 'flee', 'bold'] },
  });

  def('stryx', {
    name: 'Stryx', family: 'Creature', element: 'Ular',
    rarity: [1, 5], size: [1, 3], rig: 'quad',
    color: '#7d766a', color2: '#4d7a44', // stone armor, vine limbs
    features: { rocky: true, vines: true, rootsOnDeploy: true, legless: true },
    tags: ['stationary', 'forest'],
    behavior: 'stryx',
    statMul: { hp: 1.9, dmg: 1.1, speed: 0 },
    attackRange: 75,
    desc: 'A creature of stone armor and vine limbs that begins life as a seed, rooting wherever fortune takes it.',
    temperament: 'Once rooted, it never moves again — territorial, defensive, and almost entirely reactive.',
    special: 'Everything it can do was learned from its environment after landing. Intelligence depends entirely on how it was raised. Absorbs resource pulses passively.',
    vars: { territorialAggression: [0.2, 0.9], intelligence: [0.1, 1], absorbRate: [0, 0.4], reach: [55, 95] },
    picks: { vineCapability: ['grab', 'throw', 'defend', 'build', 'nothing'] },
  });

  def('rodak', {
    name: 'Rodak', family: 'Creature', element: 'Ular',
    rarity: [0, 2], size: [1, 1], rig: 'quad',
    color: '#3a3a42', color2: '#23232a', // dark oily
    features: { lean: true, pack: 3 },
    tags: ['carnivore', 'pack', 'scavenger'],
    behavior: 'rodak',
    statMul: { hp: 0.7, dmg: 0.9, speed: 1.25 },
    attackRange: 22,
    desc: 'Lean, dark, oily scavengers that move — and are crafted — in packs of three.',
    temperament: 'Cowardly opportunists — they only attack creatures already dying or too weak to fight back, and bolt at the first sign of resistance.',
    special: 'One token = a pack of three. If any one Rodak is killed, the entire pack is removed from the field. If one is injured, the pack retreats together.',
    vars: { detectRange: [130, 230], preyThreshold: [0.15, 0.35], coordination: [0.4, 1], recovery: [0.5, 1] },
    picks: {},
  });

  /* -------- Albali Byrd life stages -------- */
  def('albali_aagac', {
    name: 'Albali Aagac', family: 'Albali Byrd', element: 'Ular',
    rarity: [1, 3], size: [3, 3], rig: 'tree',
    color: '#5d8a4a', color2: '#6d4a2e',
    features: { rooted: true },
    tags: ['stationary', 'tree', 'passive', 'forest'],
    behavior: 'inert',
    statMul: { hp: 2.2, dmg: 0, speed: 0 },
    attackRange: 0,
    desc: 'The Albali tree — first form of the Albali Byrd’s five-stage life.',
    temperament: 'A tree. It stands there, magnificently.',
    special: 'Any allied Albali Byrd on the field will guard this tree above all else — even above the Hoard.',
    vars: {}, picks: {},
  });
  def('albali_bud', {
    name: 'Albali Bud', family: 'Albali Byrd', element: 'Fti',
    rarity: [0, 1], size: [0, 0], rig: 'blob',
    color: '#a8c66c', color2: '#7d9b4e',
    features: {},
    tags: ['passive', 'forest', 'fragile'],
    behavior: 'inert',
    statMul: { hp: 0.1, dmg: 0, speed: 0 },
    attackRange: 0,
    desc: 'The bud stage of the Albali Byrd. Small, green, and helpless.',
    temperament: 'None to speak of.',
    special: 'One-hit eliminated. Slightly poisonous if consumed — the eater takes a sting of damage.',
    vars: { poison: [3, 9] }, picks: {},
  });
  def('albali_fruit', {
    name: 'Albali Fruit', family: 'Albali Byrd', element: 'Fti',
    rarity: [0, 1], size: [0, 0], rig: 'blob',
    color: '#d9a441', color2: '#b3812c',
    features: {},
    tags: ['passive', 'forest', 'fragile'],
    behavior: 'inert',
    statMul: { hp: 0.1, dmg: 0, speed: 0 },
    attackRange: 0,
    desc: 'The fruit stage of the Albali Byrd — golden and tempting.',
    temperament: 'None. It is a fruit.',
    special: 'One-hit eliminated. Slightly poisonous if consumed.',
    vars: { poison: [4, 12] }, picks: {},
  });
  def('albali_byrd', {
    name: 'Albali Byrd', family: 'Albali Byrd', element: 'Fti',
    rarity: [2, 5], size: [2, 3], rig: 'bird',
    color: '#e8e3d4', color2: '#b03030', // pale bird, five red horns
    features: { wings: true, horns: 5 },
    tags: ['flyer', 'guardian', 'forest'],
    behavior: 'albali_byrd',
    statMul: { hp: 1.2, dmg: 1.15, speed: 1.1 },
    attackRange: 34,
    desc: 'A great bird crowned with five horns coated in a healing film. Fifth and final form of a five-stage life.',
    temperament: 'Calm and calculating, fiercely protective of its home tree or hoard — it postures before it strikes.',
    special: 'Horns regrow the instant they break. Healing film applies to attackers on contact (stings and numbs) — but turns to plain water if the Byrd falls. Guards an allied Albali Aagac above all else; otherwise treats the Hoard as its home tree.',
    vars: { hornAggression: [0.3, 0.9], camo: [0, 0.7], filmPotency: [4, 14], treeCount: [1, 3] },
    picks: { nesting: ['hoard', 'tree'] },
  });
  def('albali_villtur', {
    name: 'Albali Byrd Villtur', family: 'Albali Byrd', element: 'Fti',
    rarity: [3, 5], size: [2, 3], rig: 'bird',
    color: '#8f8574', color2: '#701818',
    features: { wings: true, horns: 5, feral: true },
    tags: ['flyer', 'carnivore'],
    behavior: 'albali_villtur',
    statMul: { hp: 1.1, dmg: 1.4, speed: 1.25 },
    attackRange: 34,
    desc: 'The feral, hostile Leotik form of the Albali Byrd.',
    temperament: 'Aggressive and unpredictable, fitting for the least explored and most dangerous of the three planets.',
    special: 'All the Byrd’s weapons, none of its patience. Attacks first, postures never.',
    vars: { hornAggression: [0.7, 1], filmPotency: [2, 8] }, picks: {},
  });

  def('sru_vorn', {
    name: 'Sru Vorn', family: 'Creature', element: 'Ular', element2: 'Su',
    rarity: [4, 6], size: [3, 4], rig: 'quad',
    color: '#6b5b45', color2: '#8fbf3f', // matted fur, acid green
    features: { tusks: true, ballTail: true, low: true },
    tags: ['carnivore', 'ambush', 'apex'],
    behavior: 'sru_vorn',
    statMul: { hp: 1.7, dmg: 1.5, speed: 0.85 },
    attackRange: 42,
    desc: 'A heavy, low lizard with matted fur like armor, curved tusks, a spiked ball-tail, and acid saliva.',
    temperament: 'Lazy until prey above a certain size wanders near — then it explodes from cover. Territorial by choice, not by limitation.',
    special: 'Cultivates acid bog traps (Awvadhi) during downtime. Only hunts prey above its threshold size — smaller creatures are beneath its notice.',
    vars: { acidPotency: [6, 18], preyThreshold: [1, 2.4], territory: [140, 260], patience: [4, 14], bogActivity: [0.3, 1] },
    picks: { preservation: [0, 0, 1] },
  });

  def('ular_naga', {
    name: 'Ular Naga', family: 'Naga', element: 'Ular',
    rarity: [2, 6], size: [2, 4], rig: 'quad',
    color: '#57713d', color2: '#3c4f2a',
    features: { heads: [1, 5], serpent: true, ridge: true },
    tags: ['carnivore', 'apex', 'naga'],
    behavior: 'ular_naga',
    statMul: { hp: 1.6, dmg: 1.4, speed: 0.9 },
    attackRange: 48,
    desc: 'A multi-headed serpent of the earth, scaled and armored, with a spiked club tail. New heads grow as the old prove their strength.',
    temperament: 'Reckless and indiscriminate when young — it attacks anything in range without exception. With age it grows territorial and calculating.',
    special: 'Its first head is near-invincible for the life of the token. Each head fights independently and may carry its own breath weapon. Never goes for the Relic. Two Ular Naga assess dominance — the lesser yields.',
    vars: { tacticalIntelligence: [0.1, 0.9], breathStamina: [3, 8], headRegrow: [0, 0.5], dominance: [0.2, 1] },
    picks: { headCount: [1, 2, 2, 3, 3, 4, 5] },
  });

  def('kipsu', {
    name: 'Kipsu', family: 'Creature', element: 'Ular',
    rarity: [0, 3], size: [0, 3], rig: 'quad',
    color: '#a3703f', color2: '#68e0c8', // fox-brown, biolum teal tail
    features: { fluffTail: true, biolumTail: true, ears: true },
    tags: ['pack', 'biolum', 'omnivore'],
    behavior: 'kipsu',
    statMul: { hp: 0.85, dmg: 0.75, speed: 1.2 },
    attackRange: 20,
    desc: 'A pack animal with a weasel’s face, a fox’s ears, and a fluffy bioluminescent tail whose pattern is unique to each individual.',
    temperament: 'Curious, cautious, a little mischievous — it investigates anything unfamiliar and flees rather than fights, unless a packmate is threatened.',
    special: 'Full Vyrenalur override: if a Vyrenalur is anywhere on the field, every Kipsu abandons all behavior and follows its lead completely. (No Vyrenalur token exists yet — the loyalty waits.)',
    vars: { packLoyalty: [0.4, 1], troublemaker: [0, 1], confidence: [0.2, 0.9] },
    picks: { biolumPattern: ['rings', 'waves', 'spots', 'spiral', 'twin-stripe'] },
  });

  def('rubbermcfly', {
    name: 'RubberMcFly', family: 'Vakarborac', element: 'Fti',
    rarity: [3, 6], size: [0, 0], rig: 'mcfly',
    color: '#c8b8e8', color2: '#9d7fe0',
    features: { butterfly: true, beak: true, biolum: true },
    tags: ['passive', 'biolum', 'sacred', 'generator'],
    behavior: 'rubbermcfly',
    statMul: { hp: 0.5, dmg: 0, speed: 0.9 },
    attackRange: 0,
    desc: 'A small, round, winged creature — unassuming to look at, and considered the most perfect of all creatures.',
    temperament: 'Utterly without aggression. It wanders, explores, and never reacts to threat or approach. It does not fight. Ever.',
    special: 'Generates resources every pulse. Any token that kills a RubberMcFly directly is destroyed on the spot by the ShurgrEdan — a catastrophic, unique retribution that cannot be blocked or redirected. Tether elimination does not trigger it. Glows only during the Sunear’Zikhron.',
    vars: { resourceCount: [1, 2] },
    picks: { resourceTypes: ['single', 'single', 'single', 'multi'] },
  });

  def('lutut', {
    name: 'Lutut', family: 'Creature', element: 'Fti',
    rarity: [3, 6], size: [3, 4], rig: 'quad',
    color: '#6d6a80', color2: '#44415c', // stone-carving patterned
    features: { wings: true, carved: true, bigJaw: true },
    tags: ['flyer', 'carnivore', 'apex'],
    behavior: 'lutut',
    statMul: { hp: 1.4, dmg: 1.6, speed: 1.2 },
    attackRange: 40,
    desc: 'A vast flying predator marked with stone-carving-like patterns that deepen with age, and jaws built for processing meat.',
    temperament: 'Reckless and relentless — the apex predator of apex predators, hunting Ular Naga and other great beasts as prey.',
    special: 'Screech stuns prey from altitude before the dive. Two Lutut on a field compete for prey — usually to the death. A rare land-stage juvenile exists with an entirely different profile.',
    vars: { screechPower: [1.5, 4], preyThreshold: [1.4, 2.6], diveSpeed: [1.2, 1.9], landSpeed: [0.6, 1] },
    picks: { screechType: ['targeted', 'targeted', 'targeted', 'area'], stage: ['adult', 'adult', 'adult', 'adult', 'adult', 'adult', 'adult', 'juvenile'] },
  });

  def('hvaleia', {
    name: 'Hvaleia', family: 'Creature', element: 'Su',
    rarity: [4, 6], size: [3, 4], rig: 'quad',
    color: '#33658a', color2: '#1e3f57',
    features: { blowholes: true, clubTail: true, manyEyes: true, low: true, aquatic: true },
    tags: ['su', 'carnivore', 'apex', 'tank'],
    behavior: 'hvaleia',
    statMul: { hp: 2.1, dmg: 1.3, speed: 0.8 },
    attackRange: 46,
    desc: 'An enormous, many-eyed hunter of the open water and the air above it, with a row of blowholes and a heavy clubbed tail.',
    temperament: 'Always moving, always hunting — calculated and confident. Its all-around vision means it can never be caught by surprise.',
    special: 'Jets knock back and stun small creatures (Litk/Mael only — larger creatures shrug them off). Tail club answers everything else. Only weakness: the soft underside beneath its dorsal ridge. Pods of Hvaleia coordinate.',
    vars: { blowholes: [2, 6], jetPotency: [4, 12], clubSize: [0.8, 1.5], tacticalIntelligence: [0.3, 1], jetRange: [80, 150] },
    picks: { toxicJets: [0, 0, 0, 1] },
  });

  /* -------- Grothyn family (shared tree) -------- */
  function grothyn(id, name, element, color, color2, temperMod, rarity) {
    return def(id, {
      name, family: 'Grothyn', element,
      rarity: rarity, size: [1, 3], rig: 'quad',
      color, color2,
      features: { shell: true, rootsOnDeploy: true, stalk: true, aquatic: true },
      tags: ['stationary', 'shell'],
      behavior: 'grothyn',
      statMul: { hp: 1.7, dmg: 1.1, speed: 0 },
      attackRange: 70,
      desc: 'A shelled creature that lives its whole life inside its own shell, extending a single long vine outward as its weapon and its hand. The ' + name.split(' ')[0] + ' branch of the family.',
      temperament: temperMod,
      special: 'Fully rooted. Strikes with vine and breath weapon simultaneously when prey is in range. The three Grothyn branches share one tree — only the trigger differs.',
      vars: { breathStamina: [3, 7], breathCooldown: [3, 7], detectRange: [90, 160], reach: [55, 90], shellDurability: [0.8, 1.4] },
      picks: { vineBehavior: ['strike', 'grab'], reRooting: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1] },
    });
  }
  grothyn('ular_grothyn', 'Ular Grothyn', 'Ular', '#5f7a45', '#43572f',
    'Neutral temperament — fires when provoked, waits otherwise.', [1, 4]);
  grothyn('su_grothyn', 'Su Grothyn', 'Su', '#4a7d99', '#31576b',
    'Passive and slow to anger — fires only when truly provoked.', [1, 4]);
  grothyn('eldi_grothyn', 'Eldi Grothyn', 'Eldi', '#a05a2c', '#7a3f1c',
    'Hair-triggered and quick to burn — fires far more readily than its cousins.', [1, 4]);

  def('makari_swarm', {
    name: 'Makari Swarm', family: 'Creature', element: 'Ular',
    rarity: [1, 4], size: [0, 0], rig: 'swarm',
    color: '#c2b23a', color2: '#7d7325',
    features: { swarm: true },
    tags: ['swarm', 'chaos'],
    behavior: 'makari_swarm',
    statMul: { hp: 1.0, dmg: 1.0, speed: 0.9 },
    attackRange: 16,
    desc: 'A swarm of tiny creatures that explodes outward to cover a patch of ground the moment it is released.',
    temperament: 'Pure chaos — it attacks absolutely everything in its zone, friend and foe alike, with no exceptions.',
    special: 'Damage scales with remaining swarm members. Never respawns once destroyed. Certain creatures consume Makari remains for a crush buff — Chemist Eikar can collect them for the team.',
    vars: { density: [8, 20], territory: [70, 130], aggressionRadius: [30, 80], crushPotency: [0.2, 0.6] },
    picks: { composition: ['Ular-heavy', 'Su-heavy', 'Eldi-heavy', 'Fti-heavy', 'balanced'] },
  });

  def('tonguatjis', {
    name: 'Tonguatjis', family: 'Creature', element: 'Ular',
    rarity: [2, 5], size: [2, 3], rig: 'quad',
    color: '#4f6b3a', color2: '#d46a6a', // forest shell, pink tongue
    features: { shell: true, tongue: true, low: true },
    tags: ['ambush', 'carnivore', 'shell'],
    behavior: 'tonguatjis',
    statMul: { hp: 1.6, dmg: 1.25, speed: 0.7 },
    attackRange: 30,
    desc: 'A great shelled, snapping-jawed creature of the deep forest, known for a tongue many times longer than its body.',
    temperament: 'A slow crawler with near-bottomless patience — it waits for flying or water-bound prey to pass within range of that tongue.',
    special: 'Prefers Fti and Su targets. If its tongue is severed it withdraws into its shell — snap-only for the rest of the match. Flees outright from any Lutut.',
    vars: { tongueLength: [90, 180], tongueSpeed: [1, 2], patience: [4, 16], jawStrength: [1, 1.8], shellDurability: [1, 1.6] },
    picks: { postCatch: ['eat', 'store', 'knockdown'], sizePreference: ['small', 'any'] },
  });

  def('mikolo_moko', {
    name: 'Mikolo Moko', family: 'Creature', element: 'Ular',
    rarity: [0, 3], size: [0, 1], rig: 'quad',
    color: '#7a9455', color2: '#55703a',
    features: { lean: true, snake: true },
    tags: ['thief', 'relic'],
    behavior: 'mikolo_moko',
    statMul: { hp: 0.55, dmg: 0.1, speed: 1.5 },
    attackRange: 0,
    desc: 'A small, snake-bodied, single-minded thief.',
    temperament: 'Obsessed with the Relic above all else — fast and almost invisible unburdened, slow and exposed once carrying anything heavy.',
    special: 'The premier Relic runner. Camouflage is its only defense; it never fights. Sprints unburdened, crawls under Relic weight, zigzags to misdirect pursuers.',
    vars: { camo: [0.3, 0.95], sprint: [1.3, 1.8], carrySpeed: [0.12, 0.3], patience: [3, 12], decoy: [0.2, 1], grip: [0.3, 1], recovery: [0.4, 1] },
    picks: {},
  });

  def('tyndael', {
    name: 'Tyndael', family: 'Creature', element: 'Eldi',
    rarity: [3, 5], size: [1, 2], rig: 'flame',
    color: '#ff7a1a', color2: '#ffd24a',
    features: { flame: true, wings: true, crown: true, hover: true },
    tags: ['fire', 'carnivore', 'flyer'],
    behavior: 'tyndael',
    statMul: { hp: 0.95, dmg: 1.5, speed: 1.15 },
    attackRange: 70,
    desc: 'A living flame given shape — a round body, wide many-colored wings, and a crown of fire whose size and color reflect its age and power. No arms; its legs never touch the ground.',
    temperament: 'Aggressive and always burning — the hotter its crown, the faster, stronger, and more reckless it becomes.',
    special: 'Hunts forest and nature-origin creatures above everything else, without exception. Heat level governs aggression, speed, and damage. Su is a direct counter — it will not face heavy water or a Su Naga.',
    vars: { heat: [0.4, 1], flameSustain: [0.3, 1], flameRegen: [0.2, 0.8], breathRange: [60, 110], crownComplexity: [1, 5] },
    picks: { preyPreference: ['nearest', 'most flammable'] },
  });

  def('raf_krabbi', {
    name: 'Raf Krabbi', family: 'Creature', element: 'Su', element2: 'Ular',
    rarity: [0, 3], size: [0, 1], rig: 'crab',
    color: '#c14953', color2: '#7ec8e3', // red plate, electric blue
    features: { claws: 2, plates: true, electric: true },
    tags: ['su', 'carnivore', 'electric'],
    behavior: 'raf_krabbi',
    statMul: { hp: 1.1, dmg: 0.95, speed: 1.05 },
    attackRange: 20,
    desc: 'A crab-like creature equally at home on land and in water, carrying two claws, thick plate armor — and a constant electric charge.',
    temperament: 'Charges at the nearest thing without a second thought, no matter what it is.',
    special: 'Electric charge builds constantly; discharges on contact or into the densest cluster of targets. Fights alongside other Krabbi — then turns on them after shared combat. Regrows lost claws.',
    vars: { electricPotency: [5, 16], chargeTime: [6, 14], plateThickness: [0.8, 1.4], clawRegen: [0.3, 1], aggressionRange: [100, 220] },
    picks: { dischargePattern: ['constant', 'burst'] },
  });

  def('su_naga', {
    name: 'Su Naga', family: 'Naga', element: 'Su',
    rarity: [4, 6], size: [3, 4], rig: 'quad',
    color: '#2a6f8f', color2: '#68e0e8', // deep sea, electric-blue biolum
    features: { heads: [2, 5], serpent: true, ridge: true, biolum: true, aquatic: true },
    tags: ['su', 'carnivore', 'apex', 'naga', 'biolum'],
    behavior: 'su_naga',
    statMul: { hp: 1.9, dmg: 1.5, speed: 0.85 },
    attackRange: 55,
    desc: 'A massive multi-headed sea serpent, ridged along its back and bioluminescent — light it uses both to speak and to deceive. Its electric-blue blood is NgAkara, the namesake material of Dya’Akara.',
    temperament: 'A strategic apex predator, calculated and patient. "The Su Naga is calm — that is the most dangerous version of it."',
    special: 'First head near-invincible. Reads the field and strikes whatever threatens its side hardest; intercepts Relic carriers but never takes the Relic itself. Uses light to signal allies and deceive enemies. Young Su Naga are reckless — patience comes with age.',
    vars: { tacticalIntelligence: [0.5, 1], breathStamina: [4, 9], patience: [0.3, 1], deception: [0.2, 1], biolumControl: [0.3, 1] },
    picks: { headCount: [2, 2, 3, 3, 4, 5] },
  });

  def('harkal', {
    name: 'Harkal', family: 'Creature', element: 'Su',
    rarity: [1, 4], size: [1, 2], rig: 'quad',
    color: '#5d7e8f', color2: '#38505c',
    features: { finned: true, scars: true, bigJaw: true, hover: true, aquatic: true },
    tags: ['su', 'carnivore', 'flyer'],
    behavior: 'harkal',
    statMul: { hp: 1.0, dmg: 1.3, speed: 1.3 },
    attackRange: 24,
    desc: 'A scarred, fast-moving hunter that swims through open air as easily as water, jaws sized to its body.',
    temperament: 'Aggressive to the point of frenzy — it goes for whatever is nearest with no real plan, and takes damage as a reason to escalate, not retreat.',
    special: 'Frenzy escalates with damage taken and injury nearby. Scar tissue toughens old Harkal. Joins any Harkal fight in progress — then turns on the other Harkal when it ends.',
    vars: { frenzyThreshold: [0.2, 0.6], toothRegen: [0.3, 1], endurance: [6, 16], scarToughness: [0, 0.5] },
    picks: {},
  });

  def('uff', {
    name: 'Uff', family: 'Creature', element: 'Ular',
    rarity: [0, 1], size: [0, 0], rig: 'biped',
    color: '#b5c46a', color2: '#8a4a2e', // striped head
    features: { stalkLegs: true, petalArms: true, stripedHead: true, longNeck: true },
    tags: ['passive', 'chaos'],
    behavior: 'uff',
    statMul: { hp: 0.6, dmg: 0.5, speed: 1.05 },
    attackRange: 26,
    desc: 'An odd, upright creature on two stalk-like legs, with a long curving neck, a striped head, and spiky vine-like petals for arms.',
    temperament: 'An oblivious wanderer with no goals at all — it flails its petal-arms when something gets close, and wanders happily into water.',
    special: 'When eliminated it plants itself on the spot; a new Uff sprouts from the same place after its respawn timer. Pure background chaos.',
    vars: { spikeDamage: [2, 7], reach: [20, 40], reactionSpeed: [0.2, 1], chaos: [0.3, 1] },
    picks: { respawnTier: ['Slow', 'Standard', 'Standard', 'Fast'], headUse: ['decorative', 'decorative', 'headbutt'] },
  });

  /* -------- Kuni Byrd -------- */
  def('kuni_byrd_wild', {
    name: 'Kuni Byrd (Wild)', family: 'Kuni Byrd', element: 'Fti',
    rarity: [3, 5], size: [2, 3], rig: 'bird',
    color: '#8a6d3b', color2: '#d9c27a',
    features: { wings: true, talons: true },
    tags: ['flyer', 'carnivore', 'ambush'],
    behavior: 'kuni_byrd',
    statMul: { hp: 1.15, dmg: 1.45, speed: 1.3 },
    attackRange: 36,
    desc: 'A great aerial predator — an apex ambush hunter that dives from altitude onto prey below.',
    temperament: 'Solitary, fiercely territorial, protective of its nest.',
    special: 'Dive from altitude is its primary weapon. Grabs smaller creatures and drops them from height. Can be temporarily redirected with a food payment.',
    vars: { diveSpeed: [1.4, 2], talons: [1, 1.6], preyThreshold: [0.8, 2], nestDefence: [0.3, 1], recovery: [0.4, 1], stealth: [0.2, 0.9], carryCapacity: [1, 2] },
    picks: { huntingStyle: ['dive bomber', 'patient stalker', 'opportunist'] },
  });
  def('kuni_byrd_ridden', {
    name: 'Kuni Byrd (Ridden)', family: 'Kuni Byrd', element: 'Fti',
    rarity: [4, 6], size: [2, 3], rig: 'bird',
    color: '#8a6d3b', color2: '#b03a2e', // saddle red
    features: { wings: true, talons: true, rider: true },
    tags: ['flyer', 'carnivore', 'mount'],
    behavior: 'kuni_byrd_ridden',
    statMul: { hp: 1.25, dmg: 1.5, speed: 1.25 },
    attackRange: 36,
    desc: 'A Kuni Byrd bonded to a rider — all the wild instincts, plus loyalty.',
    temperament: 'The wild hunter’s heart, tempered by the bond.',
    special: 'Rider attacks from the air while the Byrd flies and dives — two tokens functioning as one. Rider protection instinct can override the hunt. Keilia-compatible individuals are significantly rarer.',
    vars: { bondStrength: [0.4, 1], commandResponse: [0.3, 1], riderProtection: [0.3, 1], diveSpeed: [1.4, 2], preyThreshold: [0.8, 2], recovery: [0.4, 1] },
    picks: { riderRace: ['Eikar', 'Eikar', 'Eikar', 'Keilia'], experience: ['war mount', 'messenger', 'exploration companion'] },
  });

  def('karnen', {
    name: 'Karnen', family: 'Sentient', element: 'Ular',
    rarity: [0, 2], size: [0, 0], rig: 'biped',
    color: '#c9995c', color2: '#7a3b3b', // triangular hat
    features: { triangleHat: true },
    tags: ['sentient', 'worker', 'passive'],
    behavior: 'karnen',
    statMul: { hp: 0.6, dmg: 0.2, speed: 1.0 },
    attackRange: 0,
    desc: 'A small humanoid people, distinguished by triangular hats, native to the planet Trianu and long integrated into Eikar society as skilled workers.',
    temperament: 'Hardworking, timid, entirely peaceable — Karnen never fight, and flee from any threat at the first opportunity.',
    special: 'Harvests bonus resources every pulse. Keeps allied Archers supplied — their quiver management improves dramatically. Works better near allies.',
    vars: { harvestOutput: [1, 2], workEthic: [0.5, 1], bravery: [0.05, 0.4], supplierPrecision: [0.4, 1] },
    picks: { culture: ['North Trianu', 'Coastal Trianu', 'High Trianu', 'Deep Trianu'] },
  });

  /* -------- Ju / Sprengju -------- */
  def('ju_field', {
    name: 'Ju Field', family: 'Ju', element: 'Ular',
    rarity: [0, 3], size: [0, 0], rig: 'field',
    color: '#e8933a', color2: '#4caf50',
    features: { field: true },
    tags: ['passive', 'inert'],
    behavior: 'ju_field',
    statMul: { hp: 0.2, dmg: 0, speed: 0 },
    attackRange: 0,
    desc: 'Inert, carrot-like growths that simply sit in a field doing nothing whatsoever.',
    temperament: 'It is a field of carrots.',
    special: 'No behavior. Individual Ju can be destroyed but the field persists until all are cleared. Becomes valuable when a Sprengju Relic Shaving is near.',
    vars: { fieldSize: [6, 18] }, picks: {},
  });
  def('sprengju_shaving', {
    name: 'Sprengju Relic Shaving', family: 'Ju', element: 'Eldi',
    rarity: [2, 5], size: [0, 0], rig: 'relic',
    color: '#b8b2c8', color2: '#e8842c',
    features: { relicShard: true },
    tags: ['passive', 'activator'],
    behavior: 'sprengju_shaving',
    statMul: { hp: 0.3, dmg: 0, speed: 0 },
    attackRange: 0,
    desc: 'A shaving from a true Relic — the activator that wakes a Ju Field.',
    temperament: 'A shard of metal. It hums, faintly.',
    special: 'Each resource pulse, converts double the pulse resource count of Ju into Sprengju. Inert without a Ju Field in range.',
    vars: { conversionRange: [80, 160], efficiency: [0.6, 1] }, picks: {},
  });
  /* ---- buff fruits: playable one-use boons. They belong to NOBODY once
     placed — whichever creature reaches one first (either team) eats it. */
  def('ember_root', {
    name: 'Ember Root', family: 'Flora', element: 'Eldi',
    rarity: [0, 2], size: [0, 0], rig: 'blob',
    color: '#d4552a', color2: '#ffb03a',
    features: { glow: true, fruit: 'strike' },
    tags: ['passive', 'buff'],
    behavior: 'sprengju',
    statMul: { hp: 0.12, dmg: 0, speed: 0 },
    attackRange: 0,
    desc: 'A smoldering tuber that never quite goes out. Creatures that eat one fight like something is burning in them — because something is.',
    temperament: 'Inert. Warm to the touch. First come, first served.',
    special: 'Consumed by the first creature to reach it — ANY team. Grants a strike surge.',
    vars: { potency: [0.3, 0.55] }, picks: {},
  });
  def('skith_grass', {
    name: 'Skith Grass', family: 'Flora', element: 'Fti',
    rarity: [0, 2], size: [0, 0], rig: 'blob',
    color: '#cfd4b8', color2: '#f0f0f5',
    features: { glow: true, fruit: 'pace' },
    tags: ['passive', 'buff'],
    behavior: 'sprengju',
    statMul: { hp: 0.12, dmg: 0, speed: 0 },
    attackRange: 0,
    desc: 'A wind-bleached bundle of ridge grass. Eating it makes the legs forget how heavy the body is.',
    temperament: 'Inert. Rustles when nothing is moving. First come, first served.',
    special: 'Consumed by the first creature to reach it — ANY team. Grants a burst of pace.',
    vars: { potency: [0.25, 0.45] }, picks: {},
  });
  def('mirrordew', {
    name: 'Mirrordew', family: 'Flora', element: 'Su',
    rarity: [0, 2], size: [0, 0], rig: 'blob',
    color: '#5ab8d8', color2: '#bfe8ff',
    features: { glow: true, fruit: 'mend' },
    tags: ['passive', 'buff'],
    behavior: 'sprengju',
    statMul: { hp: 0.12, dmg: 0, speed: 0 },
    attackRange: 0,
    desc: 'A pod of still water that reflects a creature the way it was before its wounds.',
    temperament: 'Inert. Perfectly calm. First come, first served.',
    special: 'Consumed by the first creature to reach it — ANY team. Closes a third of its wounds.',
    vars: { potency: [0.25, 0.4] }, picks: {},
  });
  def('stonefruit', {
    name: 'Stonefruit', family: 'Flora', element: 'Ular',
    rarity: [0, 2], size: [0, 0], rig: 'blob',
    color: '#8d8578', color2: '#b8ae9c',
    features: { glow: true, fruit: 'guard' },
    tags: ['passive', 'buff'],
    behavior: 'sprengju',
    statMul: { hp: 0.12, dmg: 0, speed: 0 },
    attackRange: 0,
    desc: 'A mineral-hearted fruit of the deep hills. It sits in the stomach like a boulder and blows like one too.',
    temperament: 'Inert. Heavier than it looks. First come, first served.',
    special: 'Consumed by the first creature to reach it — ANY team. Hardens the hide for a time.',
    vars: { potency: [0.2, 0.35] }, picks: {},
  });

  def('sprengju', {
    name: 'Sprengju', family: 'Ju', element: 'Eldi',
    rarity: [1, 4], size: [0, 0], rig: 'blob',
    color: '#ff8c3a', color2: '#ffd24a',
    features: { glow: true },
    tags: ['passive', 'buff'],
    behavior: 'sprengju',
    statMul: { hp: 0.15, dmg: 0, speed: 0 },
    attackRange: 0, notCraftable: true,
    desc: 'A converted Ju — awake now, and potent.',
    temperament: 'Sits glowing on the field, waiting to be eaten.',
    special: 'Boosts any creature that consumes it: damage, speed, and a heal, scaled by the Sprengju’s potency.',
    vars: { potency: [0.15, 0.5] }, picks: {},
  });

  /* ================= SENTIENT UNITS ================= */

  const EIKAR_BASE = {
    family: 'Eikar', rig: 'biped', element: 'Ular',
    color: '#c8a05c', color2: '#6d4a2e', // acorn body, acorn cap
    tags: ['sentient', 'eikar'],
    /* Eikar middle-layer traits (Part V) — rolled for every Eikar */
    eikarLayer: true,
  };
  const KEILIA_BASE = {
    family: 'Keilia', rig: 'biped', element: 'Ular',
    color: '#9c8f7d', color2: '#4a4238', // larger, hair-armored
    tags: ['sentient', 'keilia'],
    keiliaLayer: true,
  };

  def('sword_eikar', Object.assign({}, EIKAR_BASE, {
    name: 'Sword Eikar',
    rarity: [1, 5], size: [1, 1],
    features: { acorn: true, weapon: 'sword' },
    behavior: 'sword_unit',
    statMul: { hp: 1.0, dmg: 1.2, speed: 1.0 },
    attackRange: 22,
    desc: 'A frontline Eikar combatant — acorn-capped, blade in hand, Relics woven into the way they fight.',
    temperament: 'Aggressive or defensive by individual; formation-capable, dangerous alone.',
    special: 'Weaves Relics into combat. Fighting style, blade quality, and formation discipline vary per individual.',
    vars: { bladeQuality: [0.6, 1.4], formationDiscipline: [0.2, 1], stamina: [0.6, 1.2], loyaltyToUnit: [0.3, 1] },
    picks: { fightingStyle: ['aggressive brawler', 'defensive counter-fighter', 'technical precision'], targetPriority: ['biggest threat', 'weakest target', 'closest'] },
  }));
  def('spear_eikar', Object.assign({}, EIKAR_BASE, {
    name: 'Spear Eikar',
    rarity: [1, 5], size: [1, 1],
    features: { acorn: true, weapon: 'spear' },
    behavior: 'spear_unit',
    statMul: { hp: 1.0, dmg: 1.1, speed: 1.0 },
    attackRange: 34,
    desc: 'An Eikar unit fighter with the long Hanii spear — reach enough to unseat riders.',
    temperament: 'Best in formation; holds the edge of its weapon’s range.',
    special: 'Longer reach; natural anti-mount advantage. Can throw the Hanii at range. Higher instinct to assist allies than Sword Eikar.',
    vars: { haniiRange: [70, 130], haniiAccuracy: [0.5, 1], packSynergy: [0.3, 1], antiMount: [1.2, 1.8], formationDiscipline: [0.3, 1] },
    picks: { targetPriority: ['biggest threat', 'closest'] },
  }));
  def('archer_eikar', Object.assign({}, EIKAR_BASE, {
    name: 'Archer Eikar',
    rarity: [1, 5], size: [1, 1],
    features: { acorn: true, weapon: 'bow' },
    behavior: 'archer_unit',
    statMul: { hp: 0.8, dmg: 1.0, speed: 1.0 },
    attackRange: 170,
    desc: 'A positional Eikar shooter. Find a vantage. Hold it. Pick targets carefully.',
    temperament: 'Calm, patient, and allergic to close range.',
    special: 'Natural advantage against flyers and Su creatures. Relocates to allied Builder’s towers. Karnen allies keep the quiver full. A rare few can fire on the move.',
    vars: { bowQuality: [0.7, 1.4], drawSpeed: [0.7, 1.4], quiver: [14, 30], positionalAwareness: [0.3, 1], calm: [0.3, 1] },
    picks: { arrowType: ['broadhead', 'bodkin', 'barbed'], movingShot: [0, 0, 0, 0, 1] },
  }));
  def('chemist_eikar', Object.assign({}, EIKAR_BASE, {
    name: 'Chemist Eikar',
    rarity: [2, 5], size: [1, 1],
    features: { acorn: true, weapon: 'flask' },
    behavior: 'chemist',
    statMul: { hp: 0.75, dmg: 0.1, speed: 1.05 },
    attackRange: 0,
    desc: 'An Eikar support specialist who never fights directly — a force multiplier for whatever team they’re on.',
    temperament: 'Always reading the field, always looking to enhance allies. Useless alone, invaluable alongside others.',
    special: 'Heals injured allies, collects crushed Makari into buff power, supplies refined acid to allied Sru Vorn, and applies enhancements to whoever needs them most.',
    vars: { healPower: [4, 12], healCooldown: [4, 9], buffPotency: [0.15, 0.4], buffDuration: [6, 14], seekRange: [120, 240], fieldReading: [0.3, 1] },
    picks: { tacticalPriority: ['healer', 'offense support', 'generalist'] },
  }));

  def('sword_keilia', Object.assign({}, KEILIA_BASE, {
    name: 'Sword Keilia',
    rarity: [2, 5], size: [2, 2],
    features: { acorn: true, weapon: 'sword', hairArmor: true },
    behavior: 'sword_unit',
    statMul: { hp: 1.35, dmg: 1.45, speed: 0.9 },
    attackRange: 26,
    desc: 'A Keilia frontline fighter — far larger than an Eikar, hair armor down the back, a blade most Eikar could not lift.',
    temperament: 'Commanding, direct, disciplined. Nearly all Keilia carry the weight of a nearly-lost people.',
    special: 'Heavier weapons hit harder. Hair armor guards the back. Quick battle construction: every Keilia can raise a small barrier mid-match.',
    vars: { bladeQuality: [0.8, 1.5], formationDiscipline: [0.5, 1], hairArmor: [0.2, 0.5], stamina: [0.7, 1.3], loyaltyToUnit: [0.4, 1] },
    picks: { fightingStyle: ['aggressive brawler', 'defensive counter-fighter', 'technical precision'], targetPriority: ['biggest threat', 'closest'] },
  }));
  def('spear_keilia', Object.assign({}, KEILIA_BASE, {
    name: 'Spear Keilia',
    rarity: [2, 5], size: [2, 2],
    features: { acorn: true, weapon: 'spear', hairArmor: true },
    behavior: 'spear_unit',
    statMul: { hp: 1.35, dmg: 1.35, speed: 0.9 },
    attackRange: 40,
    desc: 'A Keilia spear fighter — the Hanii in their hands is closer to a ship’s mast.',
    temperament: 'Formation-first, commanding, unshakable.',
    special: 'All the Spear Eikar’s craft with Keilia weight behind it. Quick battle construction available.',
    vars: { haniiRange: [80, 140], haniiAccuracy: [0.5, 1], packSynergy: [0.5, 1], antiMount: [1.3, 2], hairArmor: [0.2, 0.5], formationDiscipline: [0.5, 1] },
    picks: { targetPriority: ['biggest threat', 'closest'] },
  }));
  def('archer_keilia', Object.assign({}, KEILIA_BASE, {
    name: 'Archer Keilia',
    rarity: [2, 5], size: [2, 2],
    features: { acorn: true, weapon: 'bow', hairArmor: true },
    behavior: 'archer_unit',
    statMul: { hp: 1.1, dmg: 1.25, speed: 0.9 },
    attackRange: 185,
    desc: 'A Keilia longbow — arrows the size of spears, discipline like stone.',
    temperament: 'Patient, positional, precise.',
    special: 'Everything the Archer Eikar does, heavier. Tower-seeking, anti-air, Karnen-supplied.',
    vars: { bowQuality: [0.8, 1.5], drawSpeed: [0.6, 1.2], quiver: [12, 26], positionalAwareness: [0.4, 1], calm: [0.5, 1], hairArmor: [0.2, 0.5] },
    picks: { arrowType: ['broadhead', 'bodkin'], movingShot: [0, 0, 0, 0, 1] },
  }));
  def('builder_keilia', Object.assign({}, KEILIA_BASE, {
    name: 'Builder Keilia',
    rarity: [2, 5], size: [2, 2],
    features: { acorn: true, weapon: 'hammer', hairArmor: true },
    behavior: 'builder',
    statMul: { hp: 1.4, dmg: 0.9, speed: 0.85 },
    attackRange: 24,
    desc: 'A Keilia field construction specialist with a Kalo-made hammer — reads the field and builds what is needed.',
    temperament: 'Never fights unless forced. Always looking for the next thing worth building.',
    special: 'Builds archer towers (allied Archers relocate to them), defensive walls at threatened positions, and repairs damaged structures. Master builders may weave traps or Relics into their work.',
    vars: { buildSpeed: [0.6, 1.3], structureQuality: [0.6, 1.4], towerQuality: [0.6, 1.4], repairSpeed: [0.5, 1.2], brawl: [0.2, 0.8] },
    picks: { siegeProficiency: [0, 0, 1], trapIntegration: [0, 0, 0, 1], relicIntegration: [0, 0, 0, 0, 0, 1] },
  }));

  /* ---- Eikar middle-layer trait pools (Part V) ---- */
  const EIKAR_TRAITS = {
    subRace: ['Velkinovek Eikar', 'Nekh FtiSular Eikar', 'Xikia Lowland Eikar', 'Leotik Frontier Eikar', 'Fyrsti’Vilag Eikar', 'Quarethen'],
    loyalty: ['Unaffiliated', 'Unaffiliated', 'Unaffiliated', 'Duskareth', 'SkarValorin', 'Elsha’ryn', 'House loyalty', 'City loyalty'],
    alignment: ['Honorable', 'Ruthless', 'Corrupt', 'Selfless', 'Pragmatic', 'Zealous'],
    ambition: ['Power', 'Protection', 'Knowledge', 'Legacy', 'Wealth', 'Redemption'],
    communication: ['Inspiring', 'Commanding', 'Leads by example', 'Quiet and watchful'],
    defaultMind: ['Calm', 'Focused', 'Fierce', 'Playful', 'Grieving', 'Serene'],
    specialty: ['Herb-lore', 'Stygian theory', 'Beast handling', 'Star-reading', 'Song-craft', 'Duat history', 'Relic appraisal'],
  };
  const KEILIA_TRAITS = {
    subRace: ['Xikia Highland Keilia', 'Velki Coastal Keilia', 'Kalo-raised Keilia', 'Leotik Exile Keilia'],
    loyalty: ['Construction guild', 'House loyalty', 'City loyalty', 'Kalo’Eik allied', 'Unaffiliated'],
    alignment: ['Honorable', 'Stoic', 'Ruthless', 'Selfless', 'Pragmatic'],
    ambition: ['Legacy through construction', 'Protection', 'Restoration of the Keilia', 'Knowledge'],
    communication: ['Commanding', 'Direct', 'Leads by example'],
    defaultMind: ['Stone-calm', 'Focused', 'Grieving', 'Resolute'],
    guild: ['Anvilborn Order', 'Tower-Wrights', 'Deepstone Guild', 'Bridge Singers', 'Free Builders'],
  };

  /* ================= exported API ================= */
  DYA.species = {
    all: S,
    list: Object.keys(S).map(k => S[k]),
    get: (id) => S[id],
    RARITIES, RARITY_COST, RARITY_VALUE, SIZES, ELEMENTS, ELEMENT_COLORS, ELEMENT_NAMES,
    DIAMONDS, SIZE_HP, SIZE_DMG, SIZE_RADIUS, SIZE_SPEED,
    EIKAR_TRAITS, KEILIA_TRAITS,
    /* which species can be picked as one of the 4 starting tokens (one per element) */
    starters: { Su: 'raf_krabbi', Eldi: 'eldi_grothyn', Fti: 'albali_byrd', Ular: 'domestic_punk' },
    starterChoices: {
      Su: ['raf_krabbi', 'harkal', 'su_grothyn'],
      Eldi: ['eldi_grothyn', 'tyndael'],
      Fti: ['albali_byrd', 'kuni_byrd_wild', 'rubbermcfly'],
      Ular: ['domestic_punk', 'wild_punk', 'kipsu', 'gynge'],
    },
    /* Hunt roster at launch (Part X) */
    huntable: ['su_naga', 'sru_vorn', 'lutut', 'hvaleia', 'ular_naga', 'tonguatjis', 'kuni_byrd_wild'],
    /* craftable = everything except spawned/promo */
    craftable: Object.keys(S).filter(k => !S[k].notCraftable),
    /* duel-legal check: a duel needs a token that actually fights.
       Fruit, relic shavings, Ju Fields, Kofi, Mikolo Moko, Karnen,
       the RubberMcFly — anything with no attack — may still be picked
       DELIBERATELY in Pick/Blind mode, but Random assignment and the
       Dya'kukull never field one. */
    canDuel: (id) => { const sp = S[id]; return !!(sp && sp.attackRange > 0 && sp.statMul && sp.statMul.dmg > 0); },
  };
})();
