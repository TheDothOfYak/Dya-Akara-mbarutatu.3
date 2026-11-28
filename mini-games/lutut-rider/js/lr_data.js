// © 2026 Isaac Flake. All Rights Reserved.
/* ============================================================
   LÚTUT RIDER — js/lr_data.js
   The numbers behind the game: the regions you ride out over,
   the Lútut you can raise (young, grown, old), what each of their
   four upgrades does, what you hunt, the feats, and the medals.

   A Lútut is a Prince Rupert's drop with bat wings: the round head
   is near unbreakable, the thin tail is not. It never bites: the
   lamprey mouth can't close, so it sucks its prey in. It eats meat
   and nothing else.
   ============================================================ */
(function () {
  'use strict';
  const G = typeof window !== 'undefined' ? window : globalThis;
  const LR = G.LR = G.LR || {};

  LR.DT = 1 / 60;          // the sim always steps this long
  LR.G = 9.8;              // m/s²
  LR.SEG = 120;            // the land is laid out 120 m at a time

  /* ---------------- the Lútut you can raise ---------------- */
  /* scale: size (drawn and hit boxes). mass: heavier is slower to speed up and harder to stop.
     power: wingbeat thrust. lift: how well it holds the air. drag: lower glides further.
     gullet: how much it can eat before it is full (the "fuel"). cracks: tail cracks it can take.
     smash: how hard a stone has to be before the head won't break it. turn: how fast it pitches. */
  LR.KINDS = {
    young: { name: 'Young Lútut', cost: 0, scale: 0.72, mass: 0.75, power: 1.12, lift: 1.0, drag: 1.0, gullet: 80, cracks: 2, smash: 1.0, turn: 1.3, upBase: 40,
      desc: 'Light and quick to turn. Its tail is thin, and it gets hungry fast.' },
    adult: { name: 'Grown Lútut', cost: 2500, scale: 1.0, mass: 1.0, power: 1.08, lift: 1.06, drag: 0.92, gullet: 115, cracks: 3, smash: 1.4, turn: 1.0, upBase: 110,
      desc: 'All-round. Breaks most standing stones head first, and glides well.' },
    old: { name: 'Old Lútut', cost: 9000, scale: 1.15, mass: 1.35, power: 1.08, lift: 1.14, drag: 0.82, gullet: 160, cracks: 4, smash: 2.0, turn: 0.75, upBase: 260,
      desc: 'Huge and slow to pitch, but it glides a very long way and smashes through trees.' },
  };
  LR.KIND_ORDER = ['young', 'adult', 'old'];

  /* ---------------- upgrades ---------------- */
  LR.UPG_MAX = 10;
  LR.UPGRADES = [
    { id: 'wings', name: 'Wing membrane', icon: '🦇', desc: 'Stronger wingbeats and more lift.' },
    { id: 'gullet', name: 'Gullet', icon: '🍖', desc: 'Holds more meat, sucks prey in from further off, and each beat costs less.' },
    { id: 'tail', name: 'Tempered tail', icon: '💎', desc: 'Takes harder knocks before it cracks, and an extra crack at levels 3, 6 and 9.' },
    { id: 'saddle', name: 'Saddle & straps', icon: '🪢', desc: 'Your Eikar stays on through harder, steeper landings.' },
  ];
  LR.upgCost = (kind, lvl) => Math.round(LR.KINDS[kind].upBase * Math.pow(1.62, lvl) / 5) * 5;

  /* everything the sim needs about the Lútut you ride, from its kind and its upgrades */
  LR.stats = function (kind, up) {
    const K = LR.KINDS[kind] || LR.KINDS.young;
    const u = Object.assign({ wings: 0, gullet: 0, tail: 0, saddle: 0 }, up || {});
    return {
      kind, scale: K.scale, mass: K.mass, turn: K.turn, drag: K.drag,
      power: K.power * (1 + 0.065 * u.wings),
      lift: K.lift * (1 + 0.022 * u.wings),
      gullet: Math.round(K.gullet * (1 + 0.09 * u.gullet)),
      suck: (2.4 + 1.2 * K.scale) * (1 + 0.07 * u.gullet),
      beatCost: 5.0 * K.mass * (1 - 0.035 * u.gullet),
      cracks: K.cracks + (u.tail >= 3) + (u.tail >= 6) + (u.tail >= 9),
      tailHit: 7.5 * (1 + 0.08 * u.tail),          // a knock (m/s into the ground) the tail shrugs off
      hardHit: 14 * (1 + 0.06 * u.saddle),         // a landing this hard throws the rider
      grip: 1.15 + 0.06 * u.saddle,                // how far off the slope (rad) the Lútut can land and keep its rider
      smashV: 13 / K.smash,                        // head-first at this speed breaks a standing stone
    };
  };

  /* ---------------- what it hunts (meat only) ---------------- */
  /* food: how much of the gullet it fills. teeth: what the Eikar get for it at the roost.
     minV: it has to be going this fast to suck this one in (a Shellback is heavy). */
  LR.PREY = {
    hopper: { name: 'Rock Hopper', food: 18, teeth: 3, minV: 0, size: 0.5, desc: 'Small and quick. It hops away from a Lútut flying low.' },
    byrd: { name: 'Albali Byrd', food: 10, teeth: 4, minV: 0, size: 0.6, desc: 'Flies in flocks. Its horn film stings so badly that the Lútut\'s wings go numb for a moment.' },
    shellback: { name: 'Shellback', food: 45, teeth: 12, minV: 11, size: 1.3, desc: 'Big, slow and armoured. Only a fast Lútut can suck one in.' },
    eel: { name: 'Mud Eel', food: 20, teeth: 5, minV: 0, size: 0.7, desc: 'Leaps out of the marsh pools. Catch it in the air.' },
  };

  /* ---------------- the regions ---------------- */
  /* amp: hill height (m). wave: hill length (m). rough: small bumps. grow: how fast it gets wilder (per km).
     prey: weights of what lives there. rocks/trees/thermals: per 120 m. cliffs: canyon walls and chasms.
     water: marsh pools (the Lútut is stone: it sinks). wind: gusts (m/s). night: darker sky. */
  LR.STAGES = [
    { id: 'downs', name: 'Beuhk Downs', cost: 0, seed: 1101,
      blurb: 'Soft green hills outside the roost. Hoppers in the grass, Byrds overhead.',
      amp: 16, wave: 170, rough: 1.2, grow: 0.5, prey: { hopper: 6, byrd: 3, shellback: 1 }, meals: 1.25,
      rocks: 0.55, trees: 0.25, thermals: 0.3, cliffs: 0, water: 0, wind: 0,
      sky: ['#6fb4e8', '#cfe8f6'], far: '#8fb0c8', mid: '#5f8a6a', ground: '#4f7a3a', soil: '#5a4430', grass: '#7cb04a' },
    { id: 'road', name: 'The Road North', cost: 1500, seed: 2207,
      blurb: 'Forest along the old road. Tall trees to break or dodge, warm air rising off the stones.',
      amp: 24, wave: 150, rough: 1.6, grow: 0.6, prey: { hopper: 4, byrd: 4, shellback: 2 }, meals: 1.1,
      rocks: 0.45, trees: 1.3, thermals: 0.55, cliffs: 0, water: 0, wind: 0,
      sky: ['#e8a868', '#f6dcb0'], far: '#b08a78', mid: '#4a6a48', ground: '#3e5e30', soil: '#4a3826', grass: '#6a9a3e' },
    { id: 'canyon', name: 'The Shard Canyons', cost: 6000, seed: 3313,
      blurb: 'Flat-topped mesas and sheer chasms. Miss a jump and you go down into the dark.',
      amp: 22, wave: 130, rough: 0.6, grow: 0.7, prey: { hopper: 4, byrd: 5, shellback: 2 }, meals: 1.0,
      rocks: 0.7, trees: 0.1, thermals: 0.7, cliffs: 1, water: 0, wind: 0,
      sky: ['#d86a4a', '#f4c08a'], far: '#a65a48', mid: '#8a4a36', ground: '#a8603e', soil: '#6a3a26', grass: '#c88a58' },
    { id: 'marsh', name: 'Duskwater Marsh', cost: 15000, seed: 4421,
      blurb: 'Low ground and black pools at dusk. The Lútut is stone: if it goes in the water, it sinks.',
      amp: 9, wave: 110, rough: 0.9, grow: 0.5, prey: { hopper: 2, byrd: 3, eel: 6, shellback: 1 }, meals: 1.0,
      rocks: 0.35, trees: 0.6, thermals: 0.25, cliffs: 0, water: 1, wind: 0, night: 0.55,
      sky: ['#2a2a54', '#8a6a8a'], far: '#3a3a5a', mid: '#2e3e3a', ground: '#2f4430', soil: '#2a241e', grass: '#4a6a3a' },
    { id: 'ridge', name: 'Storm Ridge', cost: 40000, seed: 5531,
      blurb: 'Huge peaks in a howling wind. Gusts push you back or fling you forward.',
      amp: 48, wave: 230, rough: 2.2, grow: 0.8, prey: { hopper: 3, byrd: 5, shellback: 2 }, meals: 0.9,
      rocks: 0.6, trees: 0.2, thermals: 0.8, cliffs: 0, water: 0, wind: 7, night: 0.3,
      sky: ['#4a5a70', '#a8b0b8'], far: '#6a7280', mid: '#4a5258', ground: '#5a5e58', soil: '#3a3a36', grass: '#7a8a6a' },
  ];
  LR.stage = id => LR.STAGES.find(s => s.id === id) || LR.STAGES[0];

  /* medals: reaching these distances in a region pays once */
  LR.MEDALS = [
    { id: 'bronze', name: 'Bronze', m: 500, teeth: 150, col: '#c88a4a' },
    { id: 'silver', name: 'Silver', m: 1500, teeth: 600, col: '#c8d0d8' },
    { id: 'gold', name: 'Gold', m: 3000, teeth: 2000, col: '#f0c860' },
    { id: 'stone', name: 'Lútut-stone', m: 6000, teeth: 6000, col: '#b48aff' },
  ];

  /* the value of a tooth you pick up grows the further out you are */
  LR.toothValue = m => m < 600 ? 1 : m < 1800 ? 5 : m < 4000 ? 25 : 100;

  /* feats: each pays once. test(stats of all your runs, the run just ridden) */
  LR.FEATS = [
    { id: 'first', name: 'First flight', desc: 'Ride a Lútut out of the roost.', teeth: 50, test: (S) => S.runs >= 1 },
    { id: 'hunter', name: 'Hunter', desc: 'Suck in 25 prey in all.', teeth: 200, test: (S) => S.eatenAll >= 25 },
    { id: 'glutton', name: 'Glutton', desc: 'Suck in 15 prey in one ride.', teeth: 500, test: (S, R) => R && R.eaten >= 15 },
    { id: 'byrds', name: 'Stung', desc: 'Eat 20 Albali Byrds in all.', teeth: 250, test: (S) => (S.eaten.byrd || 0) >= 20 },
    { id: 'shell', name: 'Shell cracker', desc: 'Eat 5 Shellbacks in all.', teeth: 400, test: (S) => (S.eaten.shellback || 0) >= 5 },
    { id: 'smash', name: 'Hard head', desc: 'Break 20 standing stones head first.', teeth: 300, test: (S) => S.smashed >= 20 },
    { id: 'clean', name: 'Soft feet', desc: 'Make 30 clean landings.', teeth: 300, test: (S) => S.clean >= 30 },
    { id: 'air', name: 'Sky-held', desc: 'Stay in the air 12 s in one go.', teeth: 300, test: (S) => S.airMax >= 12 },
    { id: 'loop', name: 'Over the top', desc: 'Fly a full loop.', teeth: 500, test: (S) => S.loops >= 1 },
    { id: 'skim', name: 'Grass-cutter', desc: 'Skim the ground at speed for 5 s in one go.', teeth: 300, test: (S) => S.skimMax >= 5 },
    { id: 'km', name: 'Long road', desc: 'Ride 10 km in all.', teeth: 800, test: (S) => S.dist >= 10000 },
    { id: 'whole', name: 'Unbroken', desc: 'Ride 2000 m without a single tail crack.', teeth: 1500, test: (S, R) => R && R.dist >= 2000 && R.cracks === 0 },
  ];

  /* the end of a ride, in words */
  LR.ENDS = {
    thrown: 'Your Eikar was thrown off.',
    shattered: 'The tail shattered.',
    hungry: 'Too hungry to fly on: the Lútut landed to rest.',
    sank: 'The Lútut went into the water and sank like a stone.',
    fell: 'You fell into a chasm.',
    quit: 'You turned for home.',
  };

  /* a small seeded random, the same on every machine */
  LR.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
})();
