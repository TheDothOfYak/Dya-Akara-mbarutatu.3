/* ============================================================
   STRYX PILOT — js/sp_data.js
   The worlds, the ports, the kinds of job, the ship's parts and
   the pilot's ranks. Every number here is easy to change.

   You are a pilot Stryx, grown into the pilot stump of an Eldi ship:
   a mature fire tree hollowed into a hull, pushed through the sky by
   a living fire seed in the stern, with solar sails that catch the
   light of Pia'don.
   ============================================================ */
(function (root) {
  'use strict';
  const SP = root.SP = root.SP || {};

  /* The sky keeps its own time, the same for every pilot: the seconds since the
     epoch below. A sky day is ten minutes. Everything moves with it, even while
     you stand in a port, so a job taken is a clock ticking. */
  SP.EPOCH = 1790000000;
  SP.DAY = 600;
  SP.skyNow = () => Date.now() / 1000 - SP.EPOCH;
  SP.skyDay = T => Math.floor(T / SP.DAY);
  /* the sky clock: 24 hours to a sky day */
  SP.clockOf = T => { const d = ((T % SP.DAY) + SP.DAY) % SP.DAY / SP.DAY * 24; const h = Math.floor(d), m = Math.floor((d - h) * 60); return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; };
  SP.mmss = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  /* The bodies in the sky. Velki holds the centre; Xikia swings round it
     so close it is nearly a moon; Leotik swings further out; each keeps
     its Kalo. They are big and far apart: it is space travel, after all.
     orbit: [around, distance, angle at time 0, radians per second].
     spin: how fast each turns (radians per second); ports turn with it.
     g: pull at the surface (px/s²). */
  SP.BODIES = [
    { id: 'velki', name: 'Velki', r: 1700, g: 74, orbit: null, spin: 0.021, look: 'velki', blurb: 'The largest Tatu: twelve continents and the largest ocean.' },
    { id: 'bolo', name: 'Bolo Kalo', r: 320, g: 32, orbit: ['velki', 4300, 2.2, 0.0087], spin: 0.05, look: 'kalo', blurb: 'One of Velki’s Kalo, home of the Kalo’Eik.' },
    { id: 'xikia', name: 'Xikia', r: 950, g: 58, orbit: ['velki', 9800, 0.4, 0.0026], spin: 0.026, look: 'xikia', blurb: 'The middle Tatu, held so tight by Velki it nearly orbits it like a moon.' },
    { id: 'dancer', name: 'the Dancing Kalo', r: 210, g: 24, orbit: ['xikia', 2400, 1.0, 0.0175], spin: 0.045, dance: true, look: 'dancer', blurb: 'A small Kalo of Xikia that, on a near pass, is known to dance.' },
    { id: 'leotik', name: 'Leotik', r: 780, g: 50, orbit: ['velki', 19500, 3.6, 0.00116], spin: 0.033, look: 'leotik', blurb: 'The smallest Tatu, and by far the wildest. Most of it is unexplored.' },
  ];
  /* Mba'Karn, the world of the Karnen. On no chart. They say it lies where the
     Waves of Memory go, if you follow them far enough. */
  /* It is massive, and it lies 15,000 m (600,000 px; 40 px to the metre) from the heart of the Mbaru Tatu.
     It shows itself only to a ship that has ridden the Sunear'Zikhron a long way; once a rider has gone
     far enough, the wave itself bends toward it. */
  SP.KARN = { id: 'karn', name: 'Mba’Karn', r: 7000, g: 70, spin: 0.004, look: 'karn', secret: true, x: -480000, y: 360000, blurb: 'The world of the Karnen. On no chart at all.' };
  SP.KARN_DIST = Math.hypot(SP.KARN.x, SP.KARN.y);     // 600,000 px = 15,000 m
  SP.KARN_RIDE = 90000;           // px ridden along the wave, in one go, before it starts to bend toward Mba'Karn
  SP.KARN_SEE = 70000;            // and it shows itself once a rider is this close
  SP.body = id => SP.BODIES.find(b => b.id === id) || (id === 'karn' ? SP.KARN : null);

  /* Ports: a pad on a body's surface at an angle (0 = right, going round
     clockwise as the screen draws it). rank: the pilot rank needed. */
  SP.PORTS = [
    { id: 'rakar', name: 'the Stryx Rakarvorac', body: 'xikia', ang: -1.9, rank: 0, home: true, blurb: 'The great academy of Stryx. Where you were grown, and where you first learned to read the wind.' },
    { id: 'beuhk', name: 'Beuhk', body: 'xikia', ang: -0.6, rank: 0, blurb: 'A busy farming town. Grain, cheese, Punk-feed, and a Carpenter who talks too much.' },
    { id: 'highlands', name: 'the Xikia Highlands', body: 'xikia', ang: 0.9, rank: 0, blurb: 'High country: forest, mountains, crisp air and big skies.' },
    { id: 'ashen', name: 'the edge of the Ashen Reach', body: 'xikia', ang: 2.5, rank: 1, blurb: 'As near to Aakalay as any Eldi ship will go. The oath-mist chills a seed to death.' },
    { id: 'velkinovek', name: 'Velkinovek', body: 'velki', ang: 0.2, rank: 0, blurb: 'The most populous continent of Velki. Everyone is in a hurry.' },
    { id: 'fyrsti', name: 'Fyrsti’Vilag', body: 'velki', ang: 1.15, rank: 0, blurb: 'The city of the World Arena, where Stryx are raised to do nothing but stab.' },
    { id: 'nekh', name: 'Nekh FtiSular', body: 'velki', ang: -1.45, rank: 1, blurb: 'The misted supercontinent across Velki’s north. Storms come off it.' },
    { id: 'sukry', name: 'Su’Kryundel', body: 'velki', ang: 1.75, rank: 2, blurb: 'Frozen, at Velki’s southern pole. Cold enough to slow a seed.' },
    { id: 'bolo', name: 'the Bolo Kalo shorelands', body: 'bolo', ang: -1.2, rank: 1, blurb: 'The Kalo’Eik capital, guarded by Relics upon Relics that turn aside falling space rock.' },
    { id: 'dancer', name: 'the Dancer’s Ledge', body: 'dancer', ang: -2.4, rank: 1, blurb: 'A ledge on the small Kalo that dances. Hold on.' },
    { id: 'ulark', name: 'UlarKlug', body: 'leotik', ang: 2.9, rank: 2, blurb: 'The castle on Leotik, the Eikar foothold. Few pilots fly this far; most folk take the Urverk.' },
    { id: 'villtur', name: 'the ruins of Villtur', body: 'leotik', ang: -2.2, rank: 3, blurb: 'An island of ruins. Everything here wants to bite you, sting you, or both.' },
    { id: 'mbakarn', name: 'Mba’Karn', body: 'karn', ang: -1.57, rank: 0, secret: true, blurb: 'The Karnen’s own world. Every town on the Mbaru Tatu has Karnen in it, quiet and skilled; nobody ever asked where they came from. Here is the answer: a warm, patient world at the far end of the Waves of Memory, its harbour lit with lanterns that have been waiting a very long time for a ship.' },
  ];
  SP.port = id => SP.PORTS.find(p => p.id === id);

  /* What is happening at a port today (some days, some ports). Jobs bound there pay more. */
  SP.EVENTS = [
    { id: 'market', name: 'Market day', kinds: ['crates', 'seeds'], about: 'crates and fire seeds bound here pay half again' },
    { id: 'festival', name: 'A festival', kinds: ['folk'], about: 'passengers bound here pay half again' },
    { id: 'post', name: 'The Guild’s post day', kinds: ['mail'], about: 'mail bound here pays half again' },
    { id: 'wedding', name: 'A wedding', kinds: ['fragile', 'folk'], about: 'fragile goods and guests bound here pay half again' },
  ];
  /* The pilot's ranks, by deliveries made. */
  SP.RANKS = [
    { name: 'Fledgling Pilot', at: 0 },
    { name: 'Ship’s Pilot', at: 6 },
    { name: 'Elder Pilot', at: 18 },
    { name: 'Master of the Rakarvorac', at: 40 },
  ];
  SP.rankOf = n => { let r = 0; SP.RANKS.forEach((k, i) => { if (n >= k.at) r = i; }); return r; };

  /* Kinds of job. */
  SP.JOBS = {
    crates: { name: 'Crates', icon: '📦', pay: 1.0, weight: 1.0, about: 'Plain cargo. Get it there.' },
    fragile: { name: 'Fragile', icon: '🏺', pay: 1.4, weight: 0.5, about: 'Every knock to the hull costs you some of the pay.' },
    mail: { name: 'Mail', icon: '✉️', pay: 1.2, weight: 0.1, about: 'Late mail is paid half.' },
    folk: { name: 'Passengers', icon: '🧑‍🤝‍🧑', pay: 1.3, weight: 0.7, about: 'They tip for a smooth flight and remember a rough one.' },
    seeds: { name: 'Fire seeds', icon: '🔥', pay: 1.6, weight: 0.6, about: 'Hot. A hard knock can set the hold smouldering.' },
  };
  SP.CARGO = {
    crates: ['Grain from Beuhk', 'Punk-feed', 'Ju fruit', 'Tool crates', 'Barrels of cider', 'Cheese wheels', 'Bolts of cloth', 'Lamp-oil'],
    fragile: ['A Keilia’s glasswork', 'Memory-lanterns', 'A crate of eggs', 'Stygian lenses', 'A grandmother’s clock', 'Bottled songs'],
    mail: ['The Guild’s post', 'Letters home', 'A sealed summons', 'Market prices', 'A Relic-keeper’s report'],
    folk: ['A family visiting kin', 'Two Guild assessors', 'A Keilia builder and her hammer', 'A nervous Eikar student', 'Pilgrims to the Megla Aagac', 'A Kalo’Eik who keeps laughing'],
    seeds: ['A warm fire seed', 'Eldi Aagac seedlings', 'Ember-wood for a forge'],
  };

  /* The ship's parts, each 1..5 (the hold 1..3). */
  SP.PARTS = [
    { id: 'seed', name: 'Fire seed', max: 5, about: 'More heat to burn, and a harder push.' },
    { id: 'sails', name: 'Solar sails', max: 5, about: 'Win heat back from Pia’don’s light faster.' },
    { id: 'hull', name: 'Hull', max: 5, about: 'More bark between you and the sky.' },
    { id: 'vines', name: 'Pilot vines', max: 5, about: 'Turn faster, and lash further.' },
    { id: 'hold', name: 'Hold', max: 3, about: 'Carry more jobs at once.' },
    { id: 'cannon', name: 'Seed cannon', max: 5, about: 'Fire bolts of seed-heat (F). Harder and faster with each growth.' },
  ];
  SP.partCost = (id, lvl) => Math.round((id === 'hold' ? 260 : 140) * Math.pow(lvl, 1.7));

  /* Ships for hire: a crew and its skiff run a route for you while you fly your own.
     They need a Ship's Pilot to vouch for them. */
  SP.FLEET = { cost: n => 300 + n * 220, wage: 50, speed: 150, cut: 0.4, lose: 0.08, max: [0, 2, 3, 5], maxTrips: 14 };
  SP.CREWS = ['the Kettlewick sisters', 'old Tumm and his nephew', 'a pair of Kalo’Eik smugglers (retired)', 'the Burl family', 'a Keilia who builds as she flies', 'three Karnen cousins', 'Odda’s foundlings, all grown', 'a Stryx from the Arena who wanted a quieter life'];
  /* Raiding another pilot's ship: get alongside, hook your vines on, and hold there */
  SP.RAID = { range: 190, time: 2.6, cooldown: 12, cut: 1 };

  /* ================= crews, pirates, boarding ================= */
  /* Crew stacks, as in the old strategy games: a kind of fighter and how many of them.
     atk/def: skill; dmg: per fighter; hp: per fighter; spd: hexes a turn; shots: for the ranged.
     Lore-true: a Keilia who takes a hammer to battle is banished, so Keilia fight with shields. */
  SP.UNITS = {
    deckhand: { name: 'Eikar deckhands', short: 'Deckhands', side: 'crew', atk: 4, def: 4, dmg: [2, 3], hp: 9, spd: 5, cost: 14, look: 'eikar', col: '#6a8a3a', about: 'Plain, steady, cheap. The backbone of any deck.' },
    slinger: { name: 'Kalo’Eik slingers', short: 'Slingers', side: 'crew', atk: 6, def: 3, dmg: [2, 3], hp: 7, spd: 4, shots: 10, cost: 28, look: 'kalo', col: '#a8b8e8', about: 'Moon-folk with slings. They shoot across the whole battle, and laugh while they do it.' },
    rigger: { name: 'Karnen riggers', short: 'Riggers', side: 'crew', atk: 5, def: 5, dmg: [2, 4], hp: 11, spd: 7, swing: true, cost: 34, look: 'karnen', col: '#d8a050', about: 'They swing through the rigging: over gaps, over everyone, straight to where they are needed.' },
    shield: { name: 'Keilia shieldwrights', short: 'Shieldwrights', side: 'crew', atk: 6, def: 10, dmg: [4, 7], hp: 32, spd: 3, brace: true, cost: 85, look: 'keilia', col: '#8a6a9a', about: 'Builders, not soldiers: a Keilia never takes a hammer to battle. They bring a shield the size of a door instead, and defending, they take half the harm.' },
    arena: { name: 'Arena Stryx', short: 'Arena Stryx', side: 'crew', atk: 11, def: 7, dmg: [6, 10], hp: 45, spd: 2, noRetaliate: false, firstStrike: true, cost: 160, look: 'stryx', col: '#9a9488', about: 'Raised in the World Arena to do nothing but stab. They strike first, every time.' },
    /* the other side */
    cutthroat: { name: 'Duskareth cutthroats', short: 'Cutthroats', side: 'pirate', atk: 5, def: 3, dmg: [2, 3], hp: 8, spd: 6, look: 'dusk', col: '#3a2a4a', about: 'Quick and quiet, with curved knives.' },
    knife: { name: 'Duskareth knife-throwers', short: 'Knife-throwers', side: 'pirate', atk: 6, def: 2, dmg: [2, 4], hp: 7, spd: 5, shots: 8, duat: true, look: 'duskK', col: '#4a2a5a', about: 'Their knives come out of the Duat: no distance blunts them.' },
    bravo: { name: 'Smuggler bravos', short: 'Bravos', side: 'pirate', atk: 6, def: 5, dmg: [3, 5], hp: 14, spd: 5, look: 'bravo', col: '#7a4a2a', about: 'Hired muscle with stolen Guild swords.' },
    gunner: { name: 'Smuggler slingers', short: 'Slingers', side: 'pirate', atk: 5, def: 3, dmg: [2, 3], hp: 8, spd: 4, shots: 8, look: 'gunner', col: '#8a6a3a', about: 'Ex-Guild slingers who sell their aim.' },
    shade: { name: 'Duat shades', short: 'Shades', side: 'pirate', atk: 7, def: 4, dmg: [3, 6], hp: 12, spd: 6, noRetaliate: true, ethereal: true, look: 'shade', col: '#9ab0c8', about: 'Half out of the Duat. Nothing strikes back at them, and missiles often pass through.' },
    captain: { name: 'a pirate captain', short: 'Captain', side: 'pirate', atk: 9, def: 8, dmg: [6, 10], hp: 50, spd: 5, twoAttacks: true, captain: true, look: 'captain', col: '#c83a3a', about: 'Strikes twice. Takes the fall last.' },
  };
  /* your Stryx is the commander: it never sets foot on the deck (it is rooted in the pilot stump) but each round it may give one order */
  SP.ORDERS = [
    { id: 'lash', name: 'Vine lash', will: 3, target: 'enemy', about: 'Your vines reach across the decks and strike one stack.', power: p => 10 + p.vines * 6 },
    { id: 'rally', name: 'Rally', will: 3, target: 'ally', about: 'Heals a stack of yours, and stands back up some who fell, and they fight on with fresh heart (a sure extra turn of good morale).', power: p => 14 + p.vines * 5 },
    { id: 'flare', name: 'Seed flare', will: 5, target: 'area', about: 'Seed-fire bursts over a stack and everyone beside it, friend or foe.', power: p => 8 + p.seed * 5 },
    { id: 'gust', name: 'Sail gust', will: 2, target: 'ally', about: 'The sails fill: a stack of yours moves half again as far, for the rest of the battle.', power: () => 0 },
    { id: 'roots', name: 'Binding roots', will: 4, target: 'enemy', about: 'Vines pin a stack where it stands: it cannot move for two turns (it can still fight and shoot).', power: () => 2 },
  ];
  SP.WILL = p => 6 + p.vines * 2 + (p.seed || 1);       // the Stryx's will: what its orders cost
  /* the enemy captain's own tricks */
  SP.CAPT_ORDERS = [
    { id: 'storm', name: 'Knife storm', about: 'Knives out of the Duat fall on three of your stacks.' },
    { id: 'step', name: 'Duat step', about: 'A stack steps through the Duat to wherever it likes.' },
  ];

  /* ships at sea (well, in the sky): what a pirate sails, and what it is worth captured */
  SP.SHIPKINDS = {
    sloop: { name: 'sloop', hull: 70, speed: 300, turn: 2.6, crew: 2, pay: 0.9, escortDmg: 8, about: 'Small and quick.' },
    brig: { name: 'brig', hull: 120, speed: 250, turn: 2.0, crew: 3, pay: 1.2, escortDmg: 11, about: 'Sturdy, with room in the hold.' },
    cutter: { name: 'cutter', hull: 100, speed: 330, turn: 2.8, crew: 3, pay: 1.0, escortDmg: 15, about: 'Built to fight. Best as an escort.' },
    galleon: { name: 'galleon', hull: 220, speed: 200, turn: 1.4, crew: 4, pay: 1.6, escortDmg: 13, about: 'A floating fortress, slow and rich.' },
  };
  /* who sails against you, and where */
  SP.FACTIONS = {
    dusk: { name: 'Duskareth raiders', units: ['cutthroat', 'knife', 'cutthroat', 'shade'], knives: true, sail: '#4a2a5a', where: ['leotik', 'velki'], about: 'Out of the Duat with knives. They board anything with cargo.' },
    smug: { name: 'smugglers', units: ['bravo', 'gunner', 'bravo'], knives: false, flee: true, sail: '#7a5a2a', where: ['velki', 'xikia', 'bolo'], about: 'They would rather run than fight, but they bite when cornered.' },
    ghost: { name: 'a ghost ship', units: ['shade', 'shade', 'knife'], knives: true, phase: true, sail: '#a8c0d8', where: ['leotik'], about: 'Its crew are Duat shades. Sometimes it is not quite there.' },
  };
  SP.PIRATE_NAMES = ['Vesh the Thin', 'Old Marrow', 'Captain Sorrowseed', 'Ilka Two-Knives', 'the Grey Abbot', 'Brannoch Dusk', 'Mother Tallow', 'Kett Nine-Fingers', 'Saelith of the Duat', 'the Widow Cray', 'Ruul Half-There', 'Dagmar Stormcrow'];
  SP.SHIP_NAMES = ['Thornbark', 'the Sour Lantern', 'Nightseed', 'the Crooked Aagac', 'Duatmaw', 'the Last Ember', 'Greywhisper', 'the Merry Rot', 'Wanderknife', 'the Hollow Crown', 'Mistcutter', 'the Black Rind'];
  /* reputation: what the ports think of you */
  SP.REP = [
    { at: -1e9, name: 'Notorious', price: 1.2, pay: 0.9 },
    { at: -40, name: 'Distrusted', price: 1.1, pay: 0.95 },
    { at: 0, name: 'Unknown', price: 1, pay: 1 },
    { at: 40, name: 'Known', price: 0.97, pay: 1.03 },
    { at: 120, name: 'Respected', price: 0.92, pay: 1.07 },
    { at: 300, name: 'Feared by pirates', price: 0.87, pay: 1.1 },
    { at: 700, name: 'Hero of the Mbaru Tatu', price: 0.8, pay: 1.15 },
  ];
  SP.repOf = n => { let r = SP.REP[0]; SP.REP.forEach(k => { if (n >= k.at) r = k; }); return r; };
  /* where each port recruits from */
  SP.HALLS = { rakar: ['deckhand', 'rigger'], beuhk: ['deckhand', 'shield'], highlands: ['deckhand', 'rigger'], ashen: ['rigger', 'arena'], velkinovek: ['deckhand', 'shield'], fyrsti: ['arena', 'deckhand'], nekh: ['slinger', 'shield'], sukry: ['shield', 'slinger'], bolo: ['slinger', 'deckhand'], dancer: ['slinger', 'rigger'], ulark: ['arena', 'shield'], villtur: ['rigger', 'slinger'] };
  SP.CREW_MAX = 5;               // stacks on your deck

  /* what the ship can do with its parts */
  /* the names of folk adrift in skiffs */
  SP.ADRIFT = ['two Kalo’Eik fishers', 'a Keilia surveyor', 'a lost Guild courier', 'three students from the Rakarvorac', 'a Karnen trader and her goats', 'an old Eikar who says he meant to do this'];
  SP.ship = function (p) {
    return {
      heatMax: 70 + p.seed * 30,
      thrust: 150 + p.seed * 22,
      burn: 9,                         // heat per second of thrust
      boostCost: 22, boostKick: 230,
      sun: 2.2 + p.sails * 1.4,        // heat back per second
      hullMax: 60 + p.hull * 30,
      turn: 2.6 + p.vines * 0.35,      // radians per second
      lash: 120 + p.vines * 22,        // vine-lash reach
      lashCd: 2.6 - p.vines * 0.2,
      slots: 1 + p.hold,
    };
  };

  /* the pilot's log: what the Stryx thinks, by event */
  SP.LOG = {
    takeoff: ['Seed warm. Sails out. Leaving the pad.', 'The ship took eleven years to grow. I would like to keep it.', 'I have read the wind. Departing.'],
    land: ['Down. The seed rests.', 'Pad reached. I estimated that well.', 'Landed. Nobody screamed.'],
    lowheat: ['Seed heat low. Coast, or we drift.', 'The seed is tired. Spread the sails.'],
    noheat: ['No heat. We drift until the sails win some back.'],
    hit: ['A knock. The bark holds.', 'That was a mistake. Mine.', 'Hull struck.'],
    bigHit: ['A hard knock. The passengers have opinions.', 'That one I will remember.'],
    tyndael: ['Tyndaels. Flying sparks with wings. They breathe fire; I move.', 'Tyndaels. I have calculated that we will move most of the time.'],
    lutut: ['A Lutut. Its screech stuns before the dive.', 'Lutut above. Do not be where it is diving.'],
    rocks: ['Sky rock. The Kalo’Eik turn most of it aside. Not all.', 'Rocks adrift.'],
    storm: ['Storm cells off Nekh FtiSular. The wind has a temper today.'],
    mist: ['Oath-mist. It chills a seed to death. Out, quickly.'],
    wave: ['The Waves of Memory. Ride them: they carry us.', 'The Sunear’Zikhron rolls over us. RubberMcFly glow in it.'],
    wreck: ['The hull is gone. The academy will send a tow. They will not let me forget it.'],
    lash: ['Vines out.'],
    late: ['Late. The post-master will write a letter about this.'],
    distress: ['A distress lantern. Someone is adrift out there.', 'A skiff is signalling. Its seed has gone cold.'],
    rescue: ['Vines fast. We have them. They are very grateful and very loud.', 'Towed clear. The academy will hear of this, for once in a good way.'],
    sling: ['A slingshot round the pull. I calculated that.', 'Round and out, faster than we came in.'],
    heavy: ['Heavy hold. She answers slowly.'],
    karn1: ['The wave goes on. So do we.', 'Still the Waves of Memory. I have not seen their end. Nobody has, that I know of.'],
    karn2: ['Nothing on the charts out here. Only memory, and something warm ahead of it.', 'The stars are wrong. I like it.'],
    karn3: ['A world. There is no world here on any chart. There is now.'],
    raidOn: ['Vines across. Hold alongside.'],
    raided: ['Someone has their vines in our hold! Lash them off!'],
    cut: ['Cut loose. They will not try that twice.'],
    pirate: ['Sails on the horizon, and not friendly ones.', 'Pirates. I can see the knives from here.'],
    struck: ['They have struck their colours. Get alongside and we board.', 'Her sails are down. She is ours if we can take her.'],
    board: ['Vines across. Boarding.'],
    knives: ['Knives out of the Duat!'],
    bend: ['The wave is turning. It knows where it is going, even if I do not.', 'The Sunear’Zikhron bends, slow and sure, toward something.'],
  };
  /* rumours heard in ports (now and then) */
  SP.RUMOURS = [
    'An old Karnen on the dock says her grandmother came from the far end of the Waves of Memory. Nobody believes her. She doesn’t seem to mind.',
    'They say a ship that rides the Sunear’Zikhron long enough, and never leaves it, comes to a world on no chart.',
    'A pilot at the bar swears he flew the wave for half a day before his nerve failed him. “Further,” he keeps saying. “It goes further.”',
    'Raiders hook their vines across from close alongside. Keep your lash ready, and keep near a port if your hold is full.',
    'The Tatu never stop turning. A pad that faced you when you took off will have swung round by the time you get there.',
  ];
})(typeof window !== 'undefined' ? window : globalThis);
