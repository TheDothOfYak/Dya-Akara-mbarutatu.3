/* ============================================================
   SKAAR UVERKHRON — js/data.js
   Everything the game is made of: resources, terrain, creatures,
   captains, heroes, skills, songs, Relics, buildings, map objects
   and events. Numbers here are the balance knobs.
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU;
  const D = SU.data = {};

  /* ---------------- time ---------------- */
  D.WEEK = 6;            // days in a week
  D.MARKET_DAY = 4;      // day of the week
  D.MONTH = 42;          // days in a month (7 weeks, "about 40")
  D.MAX_FIELD_HEROES = 5;

  /* ---------------- resources ---------------- */
  D.RES = ['gold', 'wood', 'stone', 'food', 'stygian', 'ngakara', 'timber', 'glowmoss'];
  D.RES_INFO = {
    gold: { name: 'Gold', common: true, color: '#e8c25a', desc: 'Pays for everything: buildings, creatures, heroes. Towns make it every day.' },
    wood: { name: 'Wood', common: true, color: '#9a6a3a', desc: 'For buildings, boats and the halls of the town.' },
    stone: { name: 'Stone', common: true, color: '#a8a39a', desc: 'For walls, dwellings and the great buildings.' },
    food: { name: 'Food', common: true, color: '#c9a24e', desc: 'Feeds your people and armies every day. Hungry armies lose heart, then desert.' },
    stygian: { name: 'Stygian', common: false, color: '#8e7cff', desc: 'Soul iron. Relics, Duat powers, the Kahizecvar and the greatest creatures.' },
    ngakara: { name: 'NgAkara', common: false, color: '#5fd3c6', desc: 'Drawn from the head of the Su Naga. You do not have to kill the Naga to take it.' },
    timber: { name: 'Eldi Aagac Timber', short: 'Timber', common: false, color: '#e0703a', desc: 'Fireproof wood of the fire trees.' },
    glowmoss: { name: 'Glowmoss', common: false, color: '#9ff0a0', desc: 'Luminous moss from the deep forests. Songs are steeped in it.' },
  };
  D.START_RES = { gold: 7500, wood: 20, stone: 20, food: 80, stygian: 4, ngakara: 4, timber: 3, glowmoss: 3 };
  D.MARKET_VALUE = { gold: 1, wood: 120, stone: 120, food: 60, stygian: 500, ngakara: 500, timber: 400, glowmoss: 400 };

  /* ---------------- elements: also directions ---------------- */
  D.ELEMENTS = {
    Fti: { name: 'Fti', dir: 'North', desc: 'Air, sky, flight', color: '#bfe3ff' },
    Su: { name: 'Su', dir: 'South', desc: 'Water', color: '#4fb4e8' },
    Eldi: { name: 'Eldi', dir: 'West', desc: 'Fire', color: '#ff8a3a' },
    Ular: { name: 'Ular', dir: 'East', desc: 'Earth', color: '#9ab45a' },
  };

  /* ---------------- terrain ----------------
     cost: movement points per straight step (diagonal ×1.41). el: the element
     a creature finds comfortable on it ("comfort, never weakness"). */
  D.TERRAIN = {
    water: { name: 'Water', cost: 100, el: 'Su', pass: false, water: true },
    grass: { name: 'Grassland', cost: 100, el: 'Ular' },
    dirt: { name: 'Dirt', cost: 100, el: 'Ular' },
    rough: { name: 'Highland', cost: 125, el: 'Fti' },
    sand: { name: 'Sand', cost: 150, el: 'Eldi' },
    snow: { name: 'Snowfield', cost: 150, el: 'Fti' },
    swamp: { name: 'Marsh', cost: 175, el: 'Su' },
    ash: { name: 'Ashland', cost: 125, el: 'Eldi' },
    dusk: { name: 'Duskwaste', cost: 100, el: 'Su', home: 'duskareth' },
    moon: { name: 'Moonrock', cost: 100, el: 'Fti' },
    void: { name: 'The Void', cost: 100, pass: false, void: true },
  };
  D.ROAD_COST = 70;
  D.TERRAIN_ORDER = ['void', 'water', 'swamp', 'sand', 'dirt', 'grass', 'ash', 'dusk', 'rough', 'snow', 'moon']; // edge blending priority

  /* ---------------- layers ---------------- */
  D.LAYERS = [
    { id: 'velki', name: 'Velki', sub: 'The largest Tatu', scale: 1.0 },
    { id: 'xikia', name: 'Xikia', sub: 'The middle Tatu', scale: 0.86 },
    { id: 'leotik', name: 'Leotik', sub: 'The smallest, wildest Tatu', scale: 0.74 },
    { id: 'kalo', name: 'The Kalo', sub: 'The moons', scale: 0.85 },
  ];
  /* orbits: Xikia and Leotik swing around Velki. Period in days. */
  D.ORBITS = { xikia: 24, leotik: 54 };

  /* ---------------- creatures ----------------
     atk/def: added to by the hero's Strength/Defense. dmg: per creature.
     spd: hexes per turn (and initiative). size: hexes on the field.
     grow: per week from its dwelling. cost: per creature. food: per creature per week.
     pop: population used when recruited (people, not beasts).
     el: comfort element. tier 1..9. up: upgraded form id. */
  D.CREATURES = {};
  function cr(id, o) { o.id = id; D.CREATURES[id] = o; }

  /* ---- the Duskareth ---- */
  cr('malsti', { name: 'Malsti Punk', plural: 'Malsti Punks', faction: 'duskareth', tier: 1, art: 'malsti',
    atk: 2, def: 5, dmg: [1, 3], hp: 8, spd: 5, grow: 14, cost: { gold: 30 }, food: 0.3, el: 'Fti', up: 'malsti2',
    abil: ['thief', 'dodge'], desc: 'The smallest of the Punk family, born of the Duat itself. Barely hurts anything, but very hard to kill — and its attacks can steal gold.' });
  cr('malsti2', { name: 'Blinkback Malsti', plural: 'Blinkback Malsti', faction: 'duskareth', tier: 1, upgraded: true, art: 'malsti', tint: 1,
    atk: 3, def: 6, dmg: [2, 3], hp: 10, spd: 7, grow: 14, cost: { gold: 45 }, food: 0.3, el: 'Fti',
    abil: ['thief2', 'dodge', 'blink'], desc: 'Older Malsti that blink through the Duat instead of walking, and carry off more of what they steal.' });

  cr('velnur', { name: 'Velnurthalith', plural: 'Velnurthaliths', faction: 'duskareth', tier: 2, art: 'velnur',
    atk: 5, def: 6, dmg: [3, 5], hp: 18, spd: 4, grow: 9, cost: { gold: 80 }, food: 0.5, pop: 1, el: 'Ular', up: 'velnur2', people: true,
    abil: [], desc: 'Eikar, Keilia and Karnen of the Duskareth with spears, swords and axes. The backbone of every Duskareth army.' });
  cr('velnur2', { name: 'Velnurthalith Oathguard', plural: 'Oathguard', faction: 'duskareth', tier: 2, upgraded: true, art: 'velnur', tint: 1,
    atk: 7, def: 8, dmg: [4, 6], hp: 24, spd: 5, grow: 9, cost: { gold: 115 }, food: 0.5, pop: 1, el: 'Ular', people: true,
    abil: ['guard'], desc: 'Sworn Velnurthaliths in Stygian-edged mail. They answer every attack made on them.' });

  cr('ver', { name: 'Ver', plural: 'the Ver', faction: 'duskareth', tier: 3, art: 'ver',
    atk: 8, def: 5, dmg: [4, 7], hp: 25, spd: 4, grow: 7, cost: { gold: 150 }, food: 0.5, pop: 1, el: 'Fti', up: 'ver2', people: true,
    ranged: true, shots: 10, abil: ['release'], desc: 'The Thar Norvek, the Dark Screamers. Their scream strikes from afar, and sometimes it tears the Duat open and something comes out.' });
  cr('ver2', { name: 'Thar Norvek Elder', plural: 'Thar Norvek Elders', faction: 'duskareth', tier: 3, upgraded: true, art: 'ver', tint: 1,
    atk: 10, def: 6, dmg: [5, 8], hp: 30, spd: 5, grow: 7, cost: { gold: 200 }, food: 0.5, pop: 1, el: 'Fti', people: true,
    ranged: true, shots: 14, abil: ['release2', 'dread'], desc: 'Elders of the Ver. Their scream shakes the nerve of whatever it hits, and the Duat answers them more often.' });

  cr('harkal', { name: 'Harkal', plural: 'Harkal', faction: 'duskareth', tier: 4, art: 'harkal',
    atk: 12, def: 9, dmg: [7, 11], hp: 45, spd: 7, size: 2, shape: [2, 1], grow: 5, cost: { gold: 260, food: 1 }, food: 1, el: 'Su', up: 'harkal2',
    abil: ['frenzy'], desc: 'The Su shark of the Duskareth. It swims through open air as easily as water, but cannot rise into the sky. Damage only makes it wilder.' });
  cr('harkal2', { name: 'Scarred Harkal', plural: 'Scarred Harkal', faction: 'duskareth', tier: 4, upgraded: true, art: 'harkal', tint: 1,
    atk: 14, def: 11, dmg: [9, 13], hp: 55, spd: 8, size: 2, shape: [2, 1], grow: 5, cost: { gold: 340, food: 1 }, food: 1, el: 'Su',
    abil: ['frenzy', 'scars'], desc: 'Old Harkal, toughened by scar on scar. Their frenzy rises faster, and they shrug off more.' });

  cr('kaloeik', { name: 'Kalo’Eik of the Duskareth', short: 'Kalo’Eik', plural: 'Kalo’Eik', faction: 'duskareth', tier: 5, art: 'kaloeik',
    atk: 12, def: 18, dmg: [10, 16], hp: 85, spd: 4, grow: 4, cost: { gold: 450, stygian: 1 }, food: 1.5, pop: 1, el: 'Su', people: true,
    abil: ['shift'], desc: 'Moon-folk who serve the Duskareth. Slow to anger and slower to fall. With a Naelst Velki captain in the army they can shift an ally through the Duat to anywhere they could walk.' });

  cr('tyndael', { name: 'Tyndael', plural: 'Tyndael', faction: 'duskareth', tier: 6, art: 'tyndael',
    atk: 18, def: 14, dmg: [16, 24], hp: 110, spd: 9, grow: 3, cost: { gold: 800, timber: 1 }, food: 1, el: 'Eldi',
    ranged: true, fly: true, shots: 8, abil: ['burn'], desc: 'A living flame given shape: a round body, wide many-coloured wings and a crown of fire. Its feet never touch the ground.' });

  cr('xiweik', { name: 'Xiw’Eik', plural: 'Xiw’Eik', faction: 'duskareth', tier: 7, art: 'xiweik',
    atk: 22, def: 18, dmg: [24, 36], hp: 170, spd: 9, size: 2, shape: [2, 1], capSlots: 2, grow: 2, cost: { gold: 1400, stygian: 1, glowmoss: 1 }, food: 1.5, pop: 1, el: 'Eldi', people: true,
    fly: true, abil: ['chaos'], desc: 'Children of the Xiw and the Eikar from the age of the Skyfalls: acorn folk with devil wings and horns, and songs of chaos.' });

  cr('lutut', { name: 'Lutut', plural: 'Lutut', faction: 'duskareth', tier: 8, art: 'lutut',
    atk: 30, def: 28, dmg: [48, 66], hp: 360, spd: 11, size: 2, shape: [2, 2], capSlots: 2, grow: 1, cost: { gold: 3500, stygian: 3, stone: 3 }, food: 4, el: 'Fti',
    fly: true, abil: ['screech', 'boulder'], desc: 'The great terror of the sky, patterned like carved stone. Its screech stuns, and in a siege it hurls boulders at the walls.' });

  cr('nekh', { name: 'Nekh’Vorran', plural: 'Nekh’Vorran', faction: 'duskareth', tier: 9, art: 'nekh', legendary: true,
    atk: 44, def: 40, dmg: [110, 150], hp: 1200, spd: 10, size: 2, shape: [6, 2], grow: 0, cost: { gold: 10000, stygian: 8, ngakara: 4 }, food: 12, el: 'Su',
    abil: ['burrow', 'devour'], desc: 'The great worm of the Duat that the Duskareth follow. It surges up out of the ground anywhere on the field. Only one to a castle, and only one to a stack.' });

  /* ---- wild creatures ---- */
  cr('wildpunk', { name: 'Wild Punk', plural: 'Wild Punks', wild: true, tier: 1, art: 'punk',
    atk: 4, def: 3, dmg: [1, 3], hp: 10, spd: 7, food: 0.3, el: 'Ular', herd: true, abil: [], desc: 'A faster, leaner cousin of the Domestic Punk: the same pumpkin-and-vine family, grown wild.' });
  cr('dompunk', { name: 'Domestic Punk', plural: 'Domestic Punks', wild: true, tier: 2, art: 'punk', tint: 2,
    atk: 4, def: 6, dmg: [2, 4], hp: 20, spd: 5, food: 0.4, el: 'Ular', herd: true, abil: [], desc: 'A pumpkin-and-vine beast of burden. Herds can be tamed.' });
  cr('uff', { name: 'Uff', plural: 'Uffs', wild: true, tier: 1, art: 'uff',
    atk: 3, def: 2, dmg: [1, 4], hp: 8, spd: 5, food: 0.2, el: 'Ular', abil: ['regrow'], desc: 'An oblivious wanderer on stalk legs, with a long neck, a striped head and spiky petal arms.' });
  cr('kuni', { name: 'Kuni Byrd', plural: 'Kuni Byrds', wild: true, tier: 6, art: 'kuni',
    atk: 18, def: 14, dmg: [16, 24], hp: 110, spd: 12, fly: true, capSlots: 2, food: 1.5, el: 'Fti', abil: ['dive'], desc: 'A great aerial ambusher that dives from altitude. Fiercely territorial.' });
  cr('naga', { name: 'Su Naga', plural: 'Su Naga', wild: true, tier: 7, art: 'naga',
    atk: 24, def: 20, dmg: [26, 38], hp: 190, spd: 7, size: 2, shape: [2, 1], capSlots: 2, food: 3, el: 'Su', abil: ['firsthead'], desc: 'A strategic, patient apex predator. "The Su Naga is calm — that is the most dangerous version of it."' });
  cr('ularnaga', { name: 'Ular Naga', plural: 'Ular Naga', wild: true, beast: true, tier: 8, art: 'ularnaga',
    atk: 28, def: 28, dmg: [40, 56], hp: 330, spd: 6, size: 2, shape: [2, 2], capSlots: 2, food: 3, el: 'Ular', abil: ['firsthead', 'heads'],
    desc: 'A many-headed serpent of the earth on four heavy legs, scaled and armoured, with a spiked club tail. New heads grow as the old prove their strength.' });
  cr('mcfly', { name: 'RubberMcFly', plural: 'RubberMcFly', wild: true, tier: 1, art: 'mcfly',
    atk: 1, def: 2, dmg: [1, 1], hp: 6, spd: 9, fly: true, food: 0.1, el: 'Fti', abil: ['storm'], desc: 'The storm’s companions, among the only creatures that fly in the Sunear’Zikhron, and the only time they glow. Killing one is very bad luck.' });

  D.DUSK_LINEUP = ['malsti', 'velnur', 'ver', 'harkal', 'kaloeik', 'tyndael', 'xiweik', 'lutut', 'nekh'];

  /* ability text */
  D.ABIL = {
    thief: 'Steals a little gold from the enemy with each attack.',
    thief2: 'Steals more gold with each attack.',
    dodge: 'Often slips aside: 20% of attacks against it miss.',
    blink: 'Blinks through the Duat: moves over anything.',
    guard: 'Answers every attack made on it, not just the first.',
    release: 'Sometimes tears the Duat open when it screams, releasing Malsti Punks to fight.',
    release2: 'Tears the Duat open more often.',
    dread: 'Its scream lowers the morale of what it hits.',
    frenzy: 'Hits harder the more of the stack has been hurt.',
    scars: 'Takes 15% less damage.',
    shift: 'With a Naelst Velki captain in the army: shifts an ally stack through the Duat.',
    burn: 'Its fire keeps burning the target a little next turn.',
    chaos: 'Sometimes sings a song of chaos at the start of its turn.',
    screech: 'Its first strike each battle can stun the target.',
    boulder: 'In a siege, hurls boulders at the walls.',
    burrow: 'Moves underground: goes over anything.',
    devour: 'Each strike also heals it.',
    regrow: 'Some of the fallen sprout again after the battle.',
    heads: 'Many heads: each strike also bites another enemy beside it.',
    dive: 'Its first attack each battle hits much harder.',
    firsthead: 'Its first head is near-invincible: the first blow against it each round is halved.',
    storm: 'Glows in the storm. Killing them brings bad luck.',
    flying: 'Flies.',
    ranged: 'Attacks from range.',
  };

  /* ---------------- peoples (heroes and captains are always Dearcàn) ---------------- */
  D.PEOPLES = {
    eikar: { name: 'Eikar', desc: 'The acorn people.', lean: { Cunning: 1, Stride: 1 }, buff: 'malsti' },
    keilia: { name: 'Keilia', desc: 'Builders of the Mbaru Tatu.', lean: { Defense: 2 }, buff: 'velnur', builder: true },
    kaloeik: { name: 'Kalo’Eik', desc: 'The moon-folk.', lean: { Cunning: 1, Defense: 1 }, buff: 'kaloeik' },
    karnen: { name: 'Karnen', desc: 'A small, skilled people.', lean: { Strength: 2 }, buff: 'ver' },
  };
  D.STATS = ['Strength', 'Defense', 'Stride', 'Cunning'];
  D.STAT_INFO = {
    Strength: 'Adds to every creature’s attack.',
    Defense: 'Adds to every creature’s defense.',
    Stride: 'How far the army moves each day.',
    Cunning: 'The whole army acts sooner in battle, and you see more of enemy armies.',
  };

  D.NAMES = {
    eikar: ['Kiet', 'Tanoc', 'Odda', 'Vessil', 'Miro', 'Talun', 'Esk', 'Nuvi', 'Rhoan', 'Pell', 'Ardi', 'Sefa', 'Lio', 'Varro', 'Quen', 'Ilsa', 'Dobb', 'Taya', 'Corvi', 'Hessa'],
    keilia: ['Brunmar', 'Haldra', 'Okreth', 'Velga', 'Thurn', 'Maudra', 'Gorran', 'Ysolde', 'Krell', 'Ammar', 'Dorvek', 'Hild'],
    kaloeik: ['Lunathe', 'Seriv', 'Ovaline', 'Thessa', 'Myrrin', 'Aelun', 'Quorin', 'Phaedra', 'Nolune', 'Ishvel'],
    karnen: ['Pik', 'Tobbe', 'Rusk', 'Nim', 'Wexa', 'Doli', 'Fenn', 'Sorra', 'Jask', 'Mott'],
  };
  D.EPITHETS = ['of the Long Dusk', 'the Quiet', 'Duatborn', 'the Grey', 'of Nekh FtiSular', 'Stormwalker', 'the Patient', 'of the Ring', 'Halfmoon', 'the Hollow-Eyed', 'of Velkinovek', 'the Undaunted', 'Ashgate', 'the Listener'];

  /* ---------------- captains ----------------
     rank decides who can be hired; ability is their one base ability. */
  D.CAPTAIN_RANKS = {
    vel: { name: 'Vel', desc: 'Duskareth who move things through the Duat.' },
    stamijan: { name: 'Stamijan Velki', desc: 'An Onnar of the Duskareth.' },
    naelst: { name: 'Naelst Velki', desc: 'An Onnar of the Duskareth. Lets Kalo’Eik shift allies through the Duat.' },
    thar: { name: 'Thar', desc: 'A Ver who leads instead of screaming.' },
    rogue: { name: 'Rogue', desc: 'An outlaw, hunter or beast-tamer of the wilds.' },
  };
  D.CAPTAIN_ABIL = {
    drillmaster: { name: 'Drillmaster', desc: '+1 attack to the whole squadron.' },
    shieldbearer: { name: 'Shieldbearer', desc: '+1 defense to the whole squadron.' },
    quartermaster: { name: 'Quartermaster', desc: 'The squadron eats a third less food.' },
    banner: { name: 'Bannerbearer', desc: '+1 morale to the whole squadron.' },
    charm: { name: 'Lucky Charm', desc: '+1 luck to the whole squadron.' },
    reservist: { name: 'Reservist', desc: 'Keeps one more stack in reserve; it steps in when one of the squadron’s stacks falls.' },
    warcaller: { name: 'Warcaller', desc: 'Leads one more stack.' },
    duatwalker: { name: 'Duatwalker', desc: 'The squadron moves 15% further and crosses Urverk more safely.' },
    scout: { name: 'Scout', desc: 'Sees 3 tiles further.' },
    beastwarden: { name: 'Beastwarden', desc: 'Beasts in the squadron get 10% more health.' },
    songkeeper: { name: 'Songkeeper', desc: 'Sometimes sings Mend over the squadron in battle.' },
    vanguard: { name: 'Vanguard', desc: 'The squadron acts sooner in battle.' },
  };
  /* captains are seasoned fighters: hard to kill, and they hit like a small stack */
  D.CAPTAIN_BASE = { hp: 160, hpLevel: 30, atk: 10, def: 10, dmg: [8, 14], spd: 5, capacity: 2 };

  /* ---------------- skills (5 levels each) ---------------- */
  D.SKILLS = {
    drill: { name: 'Battle Drill', desc: 'Your creatures deal more melee damage.', per: [5, 10, 15, 20, 25], unit: '% melee damage' },
    shieldwall: { name: 'Shieldwall', desc: 'Your creatures take less damage.', per: [4, 8, 12, 16, 20], unit: '% less damage taken' },
    marks: { name: 'Marksmanship', desc: 'Your ranged creatures deal more damage.', per: [6, 12, 18, 24, 30], unit: '% ranged damage' },
    tactics: { name: 'Field Tactics', desc: 'Set your army up before battle in more of the field.', per: [1, 2, 3, 4, 5], unit: ' extra deployment columns' },
    wayfind: { name: 'Wayfinding', desc: 'The army moves further each day.', per: [6, 12, 18, 24, 30], unit: '% movement' },
    scouting: { name: 'Scouting', desc: 'See further across the map.', per: [1, 2, 3, 4, 5], unit: ' tiles of sight' },
    provision: { name: 'Provisioning', desc: 'Your army eats less.', per: [10, 18, 26, 34, 42], unit: '% less food' },
    seafaring: { name: 'Seafaring', desc: 'Ships carry you further.', per: [15, 30, 45, 60, 75], unit: '% movement at sea' },
    steward: { name: 'Stewardship', desc: 'More gold each day.', per: [100, 200, 300, 400, 500], unit: ' gold a day' },
    diplomacy: { name: 'Diplomacy', desc: 'Wild groups may join you; Urverk families ask less.', per: [10, 20, 30, 40, 50], unit: '% chance / % lower tolls' },
    plunder: { name: 'Plunder', desc: 'More from piles, chests and battles.', per: [10, 20, 30, 40, 50], unit: '% more found' },
    learning: { name: 'Learning', desc: 'More experience.', per: [5, 10, 15, 20, 25], unit: '% XP' },
    captaincy: { name: 'Captaincy', desc: 'Your captains lead more stacks and fight better.', per: [0, 1, 1, 2, 2], unit: ' more stacks per captain (+captain attack)' },
    hearten: { name: 'Heartening', desc: 'Raises your army’s morale.', per: [5, 8, 12, 16, 20], unit: ' morale (out of 100)' },
    fortune: { name: 'Fortune', desc: 'Raises your army’s luck.', per: [1, 1, 2, 2, 3], unit: ' luck' },
    mending: { name: 'Mending', desc: 'After a won battle, some of the fallen recover.', per: [8, 14, 20, 26, 32], unit: '% of the fallen' },
    songcraft: { name: 'Songcraft', desc: 'Sing songs. Each level opens the next tier of songs and deepens your Breath.', per: [1, 2, 3, 4, 5], unit: ' highest song tier' },
    breathwork: { name: 'Breathwork', desc: 'More Breath, and it comes back faster.', per: [10, 20, 30, 40, 50], unit: '% Breath' },
    duatcraft: { name: 'Duatcraft', desc: 'Cross the Duat more safely; Duat songs are stronger.', per: [20, 35, 50, 65, 80], unit: '% safer crossings' },
    skyread: { name: 'Skyreading', desc: 'Read the sky: see further ahead when Urverk open, and sense the storm.', per: [1, 2, 3, 4, 5], unit: ' (sight of the sky)' },
    memory: { name: 'Memorykeeping', desc: 'Cores offer more skills to choose from.', per: [1, 1, 2, 2, 3], unit: ' extra skills offered' },
    beasts: { name: 'Beastmastery', desc: 'Tame wild herds; beasts get more health.', per: [5, 10, 15, 20, 25], unit: '% beast health' },
    siege: { name: 'Siegecraft', desc: 'Break walls faster; your towers shoot harder.', per: [25, 50, 75, 100, 125], unit: '% siege damage' },
    stygiancraft: { name: 'Stygiancraft', desc: 'Your Relics are stronger, and you find Stygian.', per: [1, 1, 2, 2, 3], unit: ' Stygian a week' },
  };
  D.SKILL_IDS = Object.keys(D.SKILLS);

  /* ---------------- songs ----------------
     tier 1..5, breath cost, where: 'battle' | 'map'. */
  D.SONGS = {
    mend: { name: 'Mend', tier: 1, breath: 5, where: 'battle', target: 'ally', desc: 'Heals a stack (and raises a few of its fallen).' },
    rekindle: { name: 'Rekindle', tier: 3, breath: 16, where: 'battle', target: 'body', desc: 'Raises a fallen stack from where its bodies lie: some of them stand and fight again.' },
    rally: { name: 'Rally', tier: 1, breath: 4, where: 'battle', target: 'ally', desc: 'Lifts one stack’s morale for the battle.' },
    quickstep: { name: 'Quickstep', tier: 1, breath: 5, where: 'battle', target: 'ally', desc: 'A stack moves faster for 3 rounds.' },
    dimsight: { name: 'Dim Sight', tier: 1, breath: 5, where: 'battle', target: 'enemy', desc: 'An enemy stack’s ranged attacks do less for 3 rounds.' },
    farhear: { name: 'Far-Hearing', tier: 1, breath: 4, where: 'map', desc: 'Hear the land far away: clears the fog around a distant spot.' },
    pathsong: { name: 'Pathsong', tier: 1, breath: 6, where: 'map', desc: 'Rough ground costs no more than grass for the rest of today.' },
    shroud: { name: 'Shroud', tier: 2, breath: 8, where: 'battle', target: 'ally', desc: 'A stack cannot be shot at until its next turn.' },
    hush: { name: 'Hush', tier: 2, breath: 9, where: 'battle', target: 'none', desc: 'The enemy cannot sing next round.' },
    comfort: { name: 'Comfort Ground', tier: 2, breath: 8, where: 'battle', target: 'ally', desc: 'Makes the ground under a stack comfortable for it.' },
    weight: { name: 'Weight of Dusk', tier: 2, breath: 8, where: 'battle', target: 'enemy', desc: 'An enemy stack moves slower for 3 rounds.' },
    nagacalm: { name: 'Naga Calm', tier: 2, breath: 10, where: 'map', desc: 'Calms the Naga of a ground you hold: it gives double NgAkara this week.' },
    harvest: { name: 'Harvest Song', tier: 2, breath: 10, where: 'map', desc: 'A mine next to you produces double today.' },
    stormscent: { name: 'Storm Scent', tier: 2, breath: 6, where: 'map', desc: 'Sense where the eye of the Sunear’Zikhron is.' },
    duatstep: { name: 'Duat Step', tier: 3, breath: 12, where: 'battle', target: 'allyMove', desc: 'Moves a stack through a small tear in the Duat to any empty spot.' },
    ward: { name: 'Memory Ward', tier: 3, breath: 10, where: 'battle', target: 'captain', desc: 'If this captain falls, the enemy cannot take their core.' },
    dusklash: { name: 'Dusk Lash', tier: 3, breath: 12, where: 'battle', target: 'enemy', desc: 'A lash of shadow strikes one enemy stack.' },
    skyread: { name: 'Sky Reading', tier: 3, breath: 8, where: 'map', desc: 'Learn when every Urverk you know will open next, and where the storm will go next.' },
    homeward: { name: 'Homeward', tier: 3, breath: 16, where: 'map', desc: 'Return to your nearest town.' },
    seal: { name: 'Seal', tier: 3, breath: 14, where: 'map', desc: 'Seals a town you stand in or next to: nobody can attack it for 2 days.' },
    massrally: { name: 'Mass Rally', tier: 4, breath: 18, where: 'battle', target: 'none', desc: 'Lifts the morale of every stack you command.' },
    tide: { name: 'Tide of Shadows', tier: 4, breath: 20, where: 'battle', target: 'enemyArea', desc: 'Shadow washes over a stack and everything next to it.' },
    reach: { name: 'Stamijan’s Reach', tier: 4, breath: 20, where: 'map', desc: 'Pull one of your hero-less squadrons to your side.' },
    link: { name: 'Stygian Link', tier: 4, breath: 16, where: 'map', desc: 'Split a common Relic through the Duat so another of your heroes wears it too.' },
    massmend: { name: 'Mass Mend', tier: 5, breath: 28, where: 'battle', target: 'none', desc: 'Heals every stack you command.' },
    nekhcall: { name: 'Call of the Nekh', tier: 5, breath: 32, where: 'battle', target: 'enemyArea', desc: 'The ground opens under a stack and everything around it.' },
    duatgate: { name: 'Duat Gate', tier: 5, breath: 30, where: 'map', desc: 'Walk through the Duat to any Urverk you have seen.' },
  };
  D.SONG_IDS = Object.keys(D.SONGS);
  /* chaos songs the Xiw'Eik sing on their own */
  D.CHAOS = ['confuse', 'slow', 'hasten', 'scorch', 'backfire'];

  /* ---------------- Relics ----------------
     slot: head neck body hand off feet ring misc. rare: common|rare|great|skaar */
  D.SLOTS = ['head', 'neck', 'body', 'hand', 'off', 'feet', 'ring', 'ring2', 'misc', 'misc2', 'misc3'];
  D.SLOT_NAME = { head: 'Head', neck: 'Neck', body: 'Body', hand: 'Weapon', off: 'Shield', feet: 'Feet', ring: 'Ring', ring2: 'Ring', misc: 'Pack', misc2: 'Pack', misc3: 'Pack', pouch: 'Core Pouch' };
  D.RELICS = {};
  function rel(id, o) { o.id = id; D.RELICS[id] = o; }
  rel('hood', { name: 'Duskweave Hood', slot: 'head', rare: 'common', mods: { Cunning: 1 } });
  rel('aagac', { name: 'Old Ahoac Aagac', slot: 'head', rare: 'rare', mods: { morale: 5, Stride: 1 }, desc: 'An acorn hat that has seen a great many roads.' });
  rel('ringcrown', { name: 'Crown of the Stygian Ring', slot: 'head', rare: 'great', mods: { Strength: 2, Defense: 2, morale: 10 } });
  rel('charmcord', { name: 'Knotted Charm Cord', slot: 'neck', rare: 'common', mods: { luck: 1 } });
  rel('tooth', { name: 'Harkal Tooth Necklace', slot: 'neck', rare: 'common', mods: { Strength: 1 } });
  rel('memstone', { name: 'Memory Stone', slot: 'neck', rare: 'rare', mods: { breath: 6 } });
  rel('naganeck', { name: 'Naga-Scale Torc', slot: 'neck', rare: 'great', mods: { Defense: 3, breath: 10 } });
  rel('leathers', { name: 'Road Leathers', slot: 'body', rare: 'common', mods: { Defense: 1 } });
  rel('mail', { name: 'Stygian-Edged Mail', slot: 'body', rare: 'rare', mods: { Defense: 2, Strength: 1 } });
  rel('duskmantle', { name: 'Mantle of the Long Dusk', slot: 'body', rare: 'great', mods: { Defense: 3, Cunning: 2 } });
  rel('hanii', { name: 'Ash-Haft Hanii', slot: 'hand', rare: 'common', mods: { Strength: 1 }, desc: 'A spear. Hanii is Dearcineon for spear.' });
  rel('tuun', { name: 'Duat-Forged Tuun', slot: 'hand', rare: 'rare', mods: { Strength: 3 }, desc: 'A sword. Tuun is Dearcineon for sword.' });
  rel('saklay', { name: 'Saklay of the Ver', slot: 'hand', rare: 'great', mods: { Strength: 2, rangedPct: 15 }, desc: 'A bow and arrow, as the Dearcineon has it.' });
  rel('buckler', { name: 'Punk-Hide Buckler', slot: 'off', rare: 'common', mods: { Defense: 1 } });
  rel('moonshield', { name: 'Moonstone Shield', slot: 'off', rare: 'rare', mods: { Defense: 2, breath: 3 } });
  rel('boots', { name: 'Wayfarer’s Boots', slot: 'feet', rare: 'common', mods: { Stride: 1 } });
  rel('duatboots', { name: 'Boots of the Vel', slot: 'feet', rare: 'great', mods: { Stride: 3, duatSafe: 25 } });
  rel('bandring', { name: 'Iron Band', slot: 'ring', rare: 'common', mods: { morale: 5 } });
  rel('eyering', { name: 'Ring of the Open Eye', slot: 'ring', rare: 'rare', mods: { Cunning: 2, sight: 1 } });
  rel('breathring', { name: 'Ring of Long Breath', slot: 'ring', rare: 'rare', mods: { breath: 15 } });
  rel('waterskin', { name: 'Bottomless Waterskin', slot: 'misc', rare: 'common', mods: { foodPct: -15 } });
  rel('glowlamp', { name: 'Glowmoss Lantern', slot: 'misc', rare: 'common', mods: { sight: 1 } });
  rel('purse', { name: 'Guild Purse', slot: 'misc', rare: 'rare', mods: { goldDay: 250 } });
  rel('shard', { name: 'Urverk Shard', slot: 'misc', rare: 'great', mods: { duatSafe: 40, Stride: 1 } });
  rel('songbook', { name: 'Rokarvac of Songs', slot: 'misc', rare: 'rare', mods: { breath: 10, Zikhron: 1 }, desc: 'Rokarvac: a journal, a story, a writing book.' });
  rel('stormglass', { name: 'Stormglass', slot: 'misc', rare: 'great', mods: { stormSense: 1, luck: 1 } });
  rel('aerolfeather', { name: 'Feather of the Aerolhorn', slot: 'misc', rare: 'skaar', mods: { Strength: 3, Defense: 3, morale: 10, luck: 1 } });
  rel('nekhprint', { name: 'Rokarvac of the Nekh', slot: 'misc', rare: 'skaar', mods: {}, desc: 'The worm’s writing-book: how to open a Nekh Hollow. Not used up — any town it is carried into can build the Nekh Hollow while it is there.', special: true });
  D.RELIC_IDS = Object.keys(D.RELICS).filter(r => !D.RELICS[r].special);
  D.RARE_ORDER = ['common', 'rare', 'great', 'skaar'];
  D.RARE_COLOR = { common: '#cfc6b0', rare: '#6fb4ff', great: '#c48cff', skaar: '#ffcc55' };

  /* ---------------- town buildings (Duskareth) ----------------
     req: building ids needed. pop: population needed. small: a second one may
     be built the same day. Effects are read by rules.js. */
  D.BUILDINGS = {};
  function bd(id, o) { o.id = id; D.BUILDINGS[id] = o; }
  bd('hall1', { name: 'Muster Hall', cost: {}, gold: 1000, housing: 400, desc: 'The heart of the town. 1000 gold a day.' });
  bd('hall2', { name: 'Hall of Dusk', cost: { gold: 2500, wood: 5, stone: 5 }, req: ['hall1', 'market'], pop: 300, gold: 1750, housing: 700, replaces: 'hall1', desc: '1750 gold a day, and room for more people.' });
  bd('hall3', { name: 'Duskhold Seat', cost: { gold: 5000, stone: 10, stygian: 4 }, req: ['hall2', 'fort2'], pop: 600, gold: 3000, housing: 1100, replaces: 'hall2', desc: '3000 gold a day. The seat of a Duskareth lord.' });
  bd('fort1', { name: 'Palisade Keep', cost: { gold: 1500, wood: 5, stone: 5 }, walls: 1, growth: 0, desc: 'Walls and a gate. Needed for every dwelling above the second.' });
  bd('fort2', { name: 'Stone Citadel', cost: { gold: 3000, stone: 12 }, req: ['fort1'], pop: 250, walls: 2, growth: 25, replaces: 'fort1', desc: 'Stone walls and a tower. Creatures grow 25% faster.' });
  bd('fort3', { name: 'Duskwall Bastion', cost: { gold: 5000, stone: 15, stygian: 2 }, req: ['fort2'], pop: 450, walls: 3, growth: 50, replaces: 'fort2', desc: 'Three towers of the Ver. Creatures grow 50% faster.' });
  bd('tavern', { name: 'Tavern of the Lantern', cost: { gold: 500, wood: 5 }, small: true, desc: 'Hire heroes and squadron captains here.' });
  bd('market', { name: 'Market Square', cost: { gold: 500, wood: 5 }, small: true, desc: 'Trade resources. On market day, travelling sellers come.' });
  bd('woodyard', { name: 'Woodcutters’ Yard', cost: { gold: 600, stone: 2 }, small: true, res: { wood: 2 }, desc: '+2 wood a day.' });
  bd('stoneyard', { name: 'Stonecutters’ Yard', cost: { gold: 600, wood: 4 }, small: true, res: { stone: 2 }, desc: '+2 stone a day.' });
  bd('muster', { name: 'Muster Ground', cost: { gold: 2000, wood: 8, stone: 8 }, req: ['hall2'], desc: 'Recruit here from the dwellings of every one of your towns: the troops come straight to this town.' });
  bd('granary', { name: 'Granary', cost: { gold: 800, wood: 6 }, small: true, food: 8, desc: '+8 food a day.' });
  bd('farms', { name: 'Duat-Edge Farms', cost: { gold: 1500, wood: 10 }, req: ['granary'], pop: 200, food: 16, desc: '+16 food a day. Needs 200 people to work them.' });
  bd('terraces', { name: 'Dusk Terraces', cost: { gold: 1000, stone: 6 }, small: true, housing: 300, desc: 'Homes for 300 more people.' });
  bd('terraces2', { name: 'Keilia Stonehouses', cost: { gold: 2200, stone: 12 }, req: ['terraces'], pop: 400, housing: 500, desc: 'Homes for 500 more people, built the Keilia way.' });
  bd('songs1', { name: 'Hall of Songs', cost: { gold: 2000, wood: 5, stone: 5 }, songTier: 1, desc: 'Heroes with Songcraft learn the first songs here.' });
  bd('songs2', { name: 'Hall of Songs II', cost: { gold: 1500, wood: 5, stone: 5, glowmoss: 2 }, req: ['songs1'], songTier: 2, replaces: 'songs1', desc: 'Second-tier songs.' });
  bd('songs3', { name: 'Hall of Songs III', cost: { gold: 2000, wood: 5, stone: 5, glowmoss: 4 }, req: ['songs2'], pop: 300, songTier: 3, replaces: 'songs2', desc: 'Third-tier songs.' });
  bd('choir', { name: 'Stygian Choir', cost: { gold: 4000, stygian: 5, glowmoss: 5 }, req: ['songs3'], pop: 500, songTier: 4, replaces: 'songs3', desc: 'Fourth-tier songs, sung over liquid Stygian.' });
  bd('t_drill', { name: 'Drill Yard', cost: { gold: 1200, wood: 5 }, small: true, teaches: ['drill', 'shieldwall', 'marks', 'tactics'], desc: 'Training hall: Battle Drill, Shieldwall, Marksmanship, Field Tactics.' });
  bd('t_road', { name: 'Road Lodge', cost: { gold: 1200, wood: 5 }, small: true, teaches: ['wayfind', 'scouting', 'provision', 'seafaring'], desc: 'Training hall: Wayfinding, Scouting, Provisioning, Seafaring.' });
  bd('t_count', { name: 'Counting House', cost: { gold: 1500, stone: 5 }, small: true, teaches: ['steward', 'diplomacy', 'plunder', 'learning'], desc: 'Training hall: Stewardship, Diplomacy, Plunder, Learning.' });
  bd('t_capt', { name: 'Captains’ Lodge', cost: { gold: 1500, wood: 5 }, small: true, teaches: ['captaincy', 'hearten', 'fortune', 'mending'], desc: 'Training hall: Captaincy, Heartening, Fortune, Mending.' });
  bd('t_duat', { name: 'Hall of the Duat', cost: { gold: 2000, stygian: 2 }, small: true, teaches: ['songcraft', 'breathwork', 'duatcraft', 'skyread'], desc: 'Training hall: Songcraft, Breathwork, Duatcraft, Skyreading.' });
  bd('t_pens', { name: 'Memory Pens', cost: { gold: 2000, stone: 5, wood: 5 }, small: true, teaches: ['memory', 'beasts', 'siege', 'stygiancraft'], desc: 'Training hall: Memorykeeping, Beastmastery, Siegecraft, Stygiancraft.' });
  bd('vault', { name: 'Memory Vault', cost: { gold: 2500, stone: 8, stygian: 2 }, desc: 'Keeps memory cores safe, and turns captain cores into new captains.' });
  bd('shipyard', { name: 'Shipyard', cost: { gold: 1500, wood: 15 }, coast: true, desc: 'Build ships. Only in a town by the water.' });
  bd('urverk', { name: 'Duat Gate', cost: { gold: 4000, stygian: 6, stone: 10 }, req: ['hall2'], pop: 400, desc: 'Duskareth art: once a day, a hero here may step through the Duat to any of your other towns with a Duat Gate.' });
  bd('stygwell', { name: 'Stygian Well', cost: { gold: 3000, stone: 8 }, req: ['hall2'], res: { stygian: 1 }, desc: '+1 Stygian a day.' });
  bd('sanctum', { name: 'Vel Sanctum', cost: { gold: 2500, stygian: 3, glowmoss: 2 }, req: ['fort2'], desc: 'Defenders of this town get +2 morale and act sooner.' });
  /* dwellings */
  bd('d1', { name: 'Punk Hollows', cost: { gold: 400, wood: 4 }, dwell: 'malsti', desc: 'Malsti Punks gather here, half in the world and half in the Duat.' });
  bd('d1u', { name: 'Blinking Hollows', cost: { gold: 800, wood: 4, stygian: 1 }, req: ['d1'], dwellUp: 'malsti2', desc: 'Upgrades Malsti Punks to Blinkback Malsti.' });
  bd('d2', { name: 'Velnur Barracks', cost: { gold: 900, wood: 5, stone: 5 }, pop: 50, dwell: 'velnur', desc: 'Velnurthaliths train here.' });
  bd('d2u', { name: 'Oath Hall', cost: { gold: 1300, stone: 6, stygian: 1 }, req: ['d2'], pop: 120, dwellUp: 'velnur2', desc: 'Upgrades Velnurthaliths to the Oathguard.' });
  bd('d3', { name: 'Screaming Spire', cost: { gold: 1200, stone: 8 }, req: ['fort1'], pop: 80, dwell: 'ver', desc: 'Home of the Ver.' });
  bd('d3u', { name: 'Spire of the Thar', cost: { gold: 1600, stone: 6, glowmoss: 2 }, req: ['d3'], pop: 150, dwellUp: 'ver2', desc: 'Upgrades the Ver to Thar Norvek Elders.' });
  bd('d4', { name: 'Harkal Deeps', cost: { gold: 1800, stone: 8, food: 10 }, req: ['fort1'], dwell: 'harkal', desc: 'A cold, deep pool where the Harkal circle.' });
  bd('d4u', { name: 'Scarring Deeps', cost: { gold: 2200, stone: 6, ngakara: 2 }, req: ['d4'], dwellUp: 'harkal2', desc: 'Upgrades Harkal to Scarred Harkal.' });
  bd('d5', { name: 'Moonward Cloister', cost: { gold: 2800, stone: 10, stygian: 2 }, req: ['fort1', 'd2'], pop: 150, dwell: 'kaloeik', desc: 'Kalo’Eik who serve the Duskareth live and teach here.' });
  bd('d6', { name: 'Ember Roost', cost: { gold: 3500, timber: 4, stone: 6 }, req: ['fort1', 'd3'], dwell: 'tyndael', desc: 'A roost of fireproof timber for the Tyndael.' });
  bd('d7', { name: 'Horned Chapel', cost: { gold: 5000, stygian: 3, glowmoss: 3, stone: 8 }, req: ['fort2', 'd5'], pop: 250, dwell: 'xiweik', desc: 'The Xiw’Eik sing their chaos here.' });
  bd('d8', { name: 'Lutut Crags', cost: { gold: 9000, stone: 20, stygian: 4 }, req: ['fort2', 'd6'], dwell: 'lutut', desc: 'A raw crag above the town where the Lutut nest.' });
  bd('d9', { name: 'Nekh Hollow', cost: { gold: 15000, stygian: 10, ngakara: 5, stone: 20 }, req: ['fort3', 'd8'], unlock: 'nekh', dwell: 'nekh', desc: 'A hole into the Duat itself. Built only once the Nekh’Vorran has been unlocked in the eye of the storm.' });
  D.BUILD_ORDER = ['hall1', 'hall2', 'hall3', 'fort1', 'fort2', 'fort3', 'tavern', 'market', 'woodyard', 'stoneyard', 'muster', 'granary', 'farms', 'terraces', 'terraces2', 'songs1', 'songs2', 'songs3', 'choir',
    't_drill', 't_road', 't_count', 't_capt', 't_duat', 't_pens', 'vault', 'shipyard', 'urverk', 'stygwell', 'sanctum',
    'd1', 'd1u', 'd2', 'd2u', 'd3', 'd3u', 'd4', 'd4u', 'd5', 'd6', 'd7', 'd8', 'd9'];
  D.START_BUILDINGS = ['hall1', 'tavern', 'fort1', 'd1', 'd2', 't_drill'];

  /* ---------------- map objects ---------------- */
  D.MINES = {
    gold: { name: 'Gold Seam', res: 'gold', amt: 800 },
    wood: { name: 'Woodcutters’ Camp', res: 'wood', amt: 2 },
    stone: { name: 'Quarry', res: 'stone', amt: 2 },
    food: { name: 'Farmstead', res: 'food', amt: 10 },
    stygian: { name: 'Stygian Vein', res: 'stygian', amt: 1 },
    ngakara: { name: 'Naga Ground', res: 'ngakara', amt: 1, naga: true },
    timber: { name: 'Eldi Aagac Grove', res: 'timber', amt: 1 },
    glowmoss: { name: 'Glowmoss Hollow', res: 'glowmoss', amt: 1 },
  };
  D.VISIT = {
    ring: { name: 'Old Duelling Ring', desc: '+1 Strength, once per hero.', once: 'hero', stat: 'Strength' },
    bulwark: { name: 'Bulwark Stone', desc: '+1 Defense, once per hero.', once: 'hero', stat: 'Defense' },
    banner: { name: 'Fallen Banner', desc: 'The stories of an old war: 1000 experience, once per hero.', once: 'hero', xp: 1000 },
    library: { name: 'Kalo’Eik Library', desc: 'Old memories on the shelves: 500 experience and full Breath, once per hero.', once: 'hero', xp: 500, breath: true },
    milestone: { name: 'Ahoac Milestone', desc: '+1 Stride, once per hero.', once: 'hero', stat: 'Stride' },
    maze: { name: 'Riddle Hedge', desc: '+1 Cunning, once per hero.', once: 'hero', stat: 'Cunning' },
    tower: { name: 'Watchtower', desc: 'Clears the fog for a long way around.', once: 'player' },
    spring: { name: 'Singing Spring', desc: 'Refills Breath. Once a week.', once: 'week' },
    camp: { name: 'Wanderers’ Camp', desc: 'Dearcàn wanderers who may join you.', once: 'week' },
    songstone: { name: 'Song Stone', desc: 'Teaches the song carved on it, if you can sing it.', once: 'hero' },
    seer: { name: 'Seer’s Hut', desc: 'Someone who needs something done.', quest: true },
    fair: { name: 'Fair Grounds', desc: 'Open on market day: races and matches to bet on.', once: 'day' },
    tavern: { name: 'Roadside Tavern', desc: 'Hire heroes and captains away from home.' },
    shipyard: { name: 'Shipyard', desc: 'Build a ship here.' },
    trainer: { name: 'Wandering Trainer', desc: 'Teaches one level of a skill you already have, for gold. Once a week.', once: 'week' },
    shrine: { name: 'Kalo Shrine', desc: 'Merge with a memory core in the Kahizecvar.', kalo: true },
    aerie: { name: 'Kuni Byrd Aerie', desc: 'A rare nest of Kuni Byrds. A hero with Beastmastery 3 may win one as a mount.', once: 'map' },
  };

  /* ---------------- events ---------------- */
  D.WEEK_EVENTS = [
    { id: 'none', name: 'A quiet week', desc: 'Nothing out of the ordinary.' },
    { id: 'swarm', name: 'A RubberMcFly swarm', desc: 'RubberMcFly gather wherever the storm goes. Their numbers grow.' },
    { id: 'harvest', name: 'A good harvest', desc: 'Every farm makes a third more food this week.' },
    { id: 'dance', name: 'The Dancing Kalo', desc: 'A small Kalo of Xikia dances on its near pass. Every Kalo Urverk is open this week.' },
    { id: 'surge', name: 'A Sunear’Zikhron surge', desc: 'The storm moves twice as fast this week.' },
    { id: 'breed', name: 'A week of the punks', desc: 'Malsti Punks grow twice as fast.' },
    { id: 'lean', name: 'A week of famine', desc: 'Blight on the fields: farms and farmsteads make half as much food.' },
    { id: 'song', name: 'A singing week', desc: 'Breath comes back twice as fast.' },
    { id: 'wanderers', name: 'Wanderers on the roads', desc: 'More Dearcàn come to every town: +10% population.' },
  ];
  D.MONTH_EVENTS = [
    { id: 'none', name: 'An ordinary month' },
    { id: 'migration', name: 'The great migration', desc: 'Every wild group doubles.' },
    { id: 'plenty', name: 'A month of plenty', desc: 'Every dwelling grows double this week.' },
    { id: 'guild', name: 'The Guild fair', desc: 'Every market sells at half price on the next market day.' },
  ];

  /* ---------------- how a game is won ---------------- */
  D.WIN = {
    conquer: { name: 'Conquest', desc: 'Take every town of every rival.' },
    prophecy: { name: 'The prophecy', desc: 'Win battles in the eye of the Sunear’Zikhron. The first to win three hears the true prophecy, and wins.' },
    gold: { name: 'The treasury', desc: 'Be the first to gather the gold named for this map.' },
    town: { name: 'The seat', desc: 'Take the named town and hold it for a whole week.' },
  };

  /* ---------------- difficulty: your starting stores, and how hard the computer plays ---------------- */
  D.DIFFICULTY = [
    { id: 'wanderer', name: 'Wanderer', pct: 80, res: 1.6, ai: 'easy', desc: 'Plenty to start with; the computer plays gently.' },
    { id: 'ahoac', name: 'Ahoac', pct: 100, res: 1.25, ai: 'normal', desc: 'A comfortable start.' },
    { id: 'captain', name: 'Captain', pct: 130, res: 1, ai: 'normal', desc: 'An even start.' },
    { id: 'onnar', name: 'Onnar', pct: 160, res: 0.7, ai: 'hard', desc: 'Lean stores; a sharp computer.' },
    { id: 'elster', name: 'Elster', pct: 200, res: 0.45, ai: 'brutal', desc: 'Almost nothing to start with; a ruthless computer.' },
  ];
  /* the heroes you can start with (or a random one) */
  D.START_HEROES = [
    { id: 'kiet', name: 'Kiet the Quiet', people: 'eikar', base: 'wayfind', desc: 'An Eikar scout who knows every road. Starts with Wayfinding.' },
    { id: 'haldra', name: 'Haldra the Grey', people: 'keilia', base: 'steward', desc: 'A Keilia builder. Starts with Stewardship: more gold from her towns.' },
    { id: 'thessa', name: 'Thessa Halfmoon', people: 'kaloeik', base: 'songcraft', desc: 'A Kalo’Eik singer. Starts with Songcraft and a song.' },
    { id: 'rusk', name: 'Rusk Stormwalker', people: 'karnen', base: 'drill', desc: 'A Karnen drillmaster. Starts with Battle Drill: harder-hitting stacks.' },
    { id: 'odda', name: 'Odda of the Ring', people: 'eikar', base: 'captaincy', desc: 'An Eikar who trains captains. Starts with Captaincy.' },
    { id: 'gorran', name: 'Gorran the Patient', people: 'keilia', base: 'hearten', desc: 'A Keilia warden. Starts with Heartening: higher morale.' },
  ];
  D.BONUSES = { random: 'Random', gold: 'Gold (+3000)', res: 'Resources', relic: 'A Relic' };
  D.FACTIONS = [{ id: 'duskareth', name: 'The Duskareth', follows: 'the Nekh’Vorran', ready: true }, { id: 'skarvalorin', name: 'The SkarValorin', follows: 'the Aerolhorn', ready: false }, { id: 'elsharyn', name: 'The Elsha’ryn', follows: 'the Vyrenalur', ready: false }];

  /* ---------------- numbers changed in the Admin Panel (dya_config 'su_balance') ---------------- */
  D.applyBalance = function (bal) {
    if (!bal) return 0; let n = 0;
    Object.entries(bal.creatures || {}).forEach(([id, o]) => { const C = D.CREATURES[id]; if (!C || !o) return;
      ['atk', 'def', 'hp', 'spd', 'shots', 'grow'].forEach(k => { if (typeof o[k] === 'number' && o[k] >= 0) { C[k] = o[k]; n++; } });
      if (Array.isArray(o.dmg) && o.dmg.length === 2) { C.dmg = [Math.min(o.dmg[0], o.dmg[1]), Math.max(o.dmg[0], o.dmg[1])]; n++; }
      if (o.cost && typeof o.cost === 'object') { C.cost = Object.assign({}, o.cost); n++; } });
    Object.entries(bal.buildings || {}).forEach(([id, o]) => { const B = D.BUILDINGS[id]; if (B && o && o.cost && typeof o.cost === 'object') { B.cost = Object.assign({}, o.cost); n++; } });
    return n;
  };

  /* ---------------- computer personalities: one is drawn for each computer player ---------------- */
  D.AI_STYLES = {
    conqueror: { name: 'Conqueror', desc: 'Builds an army and goes for your towns.', war: 1.5, treasure: 0.8, keep: 1, heroes: 0 },
    raider: { name: 'Raider', desc: 'Many fast heroes taking mines and treasure.', war: 1, treasure: 1.4, keep: 0.8, heroes: 1 },
    builder: { name: 'Builder', desc: 'Grows its towns first and strikes late.', war: 0.7, treasure: 1, keep: 1.6, heroes: -1 },
    explorer: { name: 'Explorer', desc: 'Crosses the worlds, hunts shrines, cores and Relics.', war: 0.9, treasure: 1.6, keep: 1, heroes: 0, urverk: 1.8 },
    turtle: { name: 'Turtle', desc: 'Walls up and waits for you to break yourself on them.', war: 0.5, treasure: 0.9, keep: 1.3, heroes: -1, garrison: 0.5 },
  };

  /* ---------------- AI personalities ---------------- */
  D.AI_LEVELS = {
    easy: { name: 'Easy', bonus: 0.75, aggression: 0.6 },
    normal: { name: 'Normal', bonus: 1, aggression: 1 },
    hard: { name: 'Hard', bonus: 1.25, aggression: 1.3 },
    brutal: { name: 'Brutal', bonus: 1.6, aggression: 1.6 },
  };
  D.PLAYER_COLORS = [
    { id: 'red', name: 'Crimson', c: '#c43a3a' }, { id: 'blue', name: 'Su Blue', c: '#3a6fd0' },
    { id: 'green', name: 'Ular Green', c: '#4c9a3c' }, { id: 'gold', name: 'Guild Gold', c: '#d0a23a' },
    { id: 'violet', name: 'Duat Violet', c: '#8a4ad0' }, { id: 'teal', name: 'Naga Teal', c: '#2fa79a' },
  ];
  D.NEUTRAL_COLOR = '#8a8478';
})(typeof window !== 'undefined' ? window : globalThis);
