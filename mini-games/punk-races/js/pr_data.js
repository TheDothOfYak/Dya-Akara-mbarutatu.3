/* ============================================================
   PUNK RACES — js/pr_data.js
   The tracks, cups, rival riders, and what a Punk can look like.
   Every number here is easy to change.
   ============================================================ */
(function (root) {
  'use strict';
  const PR = root.PR = root.PR || {};

  /* Each track is built from its seed, so it is the same every time.
     theme:   colours and the hazards that belong there
     length:  px to the finish (about 40 px is a metre)
     trees:   [min, max] gap between trees
     tall:    [min, max] tree height
     hills:   how rolling the ground is
     gaps:    how many breaks in the ground (water, chasms)
     hazards: thorn patches on the ground (Xikia), venom bogs (Leotik),
              geysers (the Ashen Reach), fog (Velki's misted north)
     fruit:   how many Ju fruit hang along the way (each fills boost) */
  PR.TRACKS = [
    { id: 'beuhk', name: 'Beuhk Lanes', where: 'Xikia · the farm country round Beuhk', seed: 1101, length: 15800,
      theme: 'farm', trees: [260, 380], tall: [230, 300], hills: 0.5, gaps: 1, gapKinds: ['water'], hazards: { thorns: 1 }, fruit: 6, purse: 60, par: 21,
      blurb: 'Orchard rows and hay fields. A good first race: plenty of trees, and only the mill-stream to cross.' },
    { id: 'hedgeoak', name: 'Hedge-Oak Run', where: 'Xikia · the low country north of the city', seed: 2207, length: 18400,
      theme: 'forest', trees: [240, 360], tall: [260, 360], hills: 0.8, gaps: 2, gapKinds: ['water', 'chasm'], hazards: { thorns: 3 }, fruit: 7, purse: 80, par: 26,
      blurb: 'Old hedge-oaks along the road, thorn hedges between them, and a dry gully that eats careless riders.' },
    { id: 'ford', name: 'The Snow-Melt Ford', where: 'Xikia · the forest road', seed: 3313, length: 19300,
      theme: 'river', trees: [250, 370], tall: [270, 380], hills: 0.6, gaps: 4, gapKinds: ['water', 'water', 'water', 'chasm'], hazards: {}, fruit: 7, purse: 100, par: 26,
      blurb: 'The road crosses the river again and again. Punks can swim, but slowly. Stay up in the pines.' },
    { id: 'mistwood', name: 'Mistwood', where: 'Velki · the misted north', seed: 4421, length: 20600,
      theme: 'mist', trees: [270, 400], tall: [300, 420], hills: 1.0, gaps: 3, gapKinds: ['chasm', 'water', 'chasm'], hazards: { fog: 1, thorns: 2 }, fruit: 8, purse: 130, par: 32,
      blurb: 'Tall grey firs in the fog. You see the next branch late, so trust your Punk’s reach.' },
    { id: 'spires', name: 'The Velki Spires', where: 'Velki · the cliff forests', seed: 5531, length: 22000,
      theme: 'spires', trees: [300, 430], tall: [360, 480], hills: 1.5, gaps: 5, gapKinds: ['chasm'], hazards: { thorns: 1 }, fruit: 8, purse: 170, par: 33,
      blurb: 'Huge trees on broken ground and deep drops between them. Fall in and you climb out the slow way.' },
    { id: 'ashen', name: 'The Ashen Reach', where: 'Leotik · the burnt edge', seed: 6637, length: 22800,
      theme: 'ash', trees: [280, 420], tall: [260, 380], hills: 1.1, gaps: 3, gapKinds: ['chasm', 'chasm', 'water'], hazards: { geysers: 5 }, fruit: 9, purse: 210, par: 31,
      blurb: 'Black dead trees, hot ground and steam vents that throw you high. Ride a geyser and you can skip a tree.' },
    { id: 'venomgrove', name: 'Venomgrove', where: 'Leotik · the wild jungle', seed: 7741, length: 24200,
      theme: 'jungle', trees: [230, 340], tall: [280, 400], hills: 0.9, gaps: 3, gapKinds: ['water', 'chasm', 'water'], hazards: { venom: 5 }, fruit: 10, purse: 260, par: 37,
      blurb: 'Leotik grows things that hurt. The ground is mostly bog. The best riders hardly touch it.' },
    { id: 'derby', name: 'The Market Day Derby', where: 'The great fair · day four of the week', seed: 8853, length: 26400,
      theme: 'fair', trees: [250, 390], tall: [270, 400], hills: 1.0, gaps: 4, gapKinds: ['water', 'chasm', 'water', 'chasm'], hazards: { thorns: 2, geysers: 2 }, fruit: 11, purse: 340, par: 40,
      blurb: 'The race everyone bets on. Banners, crowds and a bit of every kind of ground from across the three Tatu.' },
  ];
  PR.track = id => PR.TRACKS.find(t => t.id === id) || PR.TRACKS[0];

  /* Cups: three races, points for each place, the purse goes to the winner. */
  PR.POINTS = [10, 6, 3, 1];
  PR.CUPS = [
    { id: 'sapling', name: 'Sapling Cup', tracks: ['beuhk', 'hedgeoak', 'ford'], fee: 20, prize: 250, rival: 0.22, needs: null },
    { id: 'canopy', name: 'Canopy Cup', tracks: ['ford', 'mistwood', 'spires'], fee: 60, prize: 600, rival: 0.5, needs: 'sapling' },
    { id: 'ember', name: 'Ember Cup', tracks: ['spires', 'ashen', 'venomgrove'], fee: 120, prize: 1100, rival: 0.74, needs: 'canopy' },
    { id: 'crown', name: 'Crown of the Fair', tracks: ['ashen', 'venomgrove', 'derby'], fee: 200, prize: 2000, rival: 0.95, needs: 'ember' },
  ];
  PR.cup = id => PR.CUPS.find(c => c.id === id);

  /* Rival riders and their Punks. skill 0..1 is how well they time a swing;
     their Punk's stats grow with the cup. */
  PR.RIVALS = [
    { id: 'tessa', rider: 'Tessa Ruun', punk: 'Old Brick', coat: 'rust', hat: '#7a4a24', style: 'steady', bias: { speed: 1, grip: 0, spring: 0, nerve: 0 } },
    { id: 'oddo', rider: 'Oddo Vane', punk: 'Quickrind', coat: 'wild', hat: '#4a3a2a', style: 'reckless', bias: { speed: 0, grip: 1, spring: 1, nerve: 0 } },
    { id: 'sefi', rider: 'Sefi Ularbright', punk: 'Tidewater', coat: 'pale', hat: '#3a6a7a', style: 'clean', bias: { speed: 0, grip: 0, spring: 1, nerve: 1 } },
    { id: 'brakk', rider: 'Brakk of Beuhk', punk: 'Gourdo', coat: 'orange', hat: '#6a5a2a', style: 'steady', bias: { speed: 1, grip: 1, spring: 0, nerve: 0 } },
    { id: 'neka', rider: 'Neka Thornwise', punk: 'Bramblejack', coat: 'striped', hat: '#2a4a2a', style: 'clean', bias: { speed: 0, grip: 1, spring: 0, nerve: 1 } },
    { id: 'lun', rider: 'Lun the Quiet', punk: 'Moonrind', coat: 'night', hat: '#3a3a5a', style: 'reckless', bias: { speed: 1, grip: 0, spring: 1, nerve: 0 } },
    { id: 'ama', rider: 'Ama Kettle', punk: 'Butterloaf', coat: 'gold', hat: '#8a6a2a', style: 'steady', bias: { speed: 0, grip: 0, spring: 1, nerve: 1 } },
  ];

  /* Coats: rind colour, rib shade, vine colour. Domestic Punks are orange;
     wild blood shows darker, with longer vine-legs. */
  PR.COATS = {
    orange: { name: 'Orange', rind: '#e8842a', rib: '#b85c16', vine: '#4e7a32', stem: '#6a5a2a' },
    rust: { name: 'Rust', rind: '#b8542a', rib: '#843416', vine: '#4a6a2e', stem: '#5a4a22' },
    gold: { name: 'Gold', rind: '#e8b23a', rib: '#b8841c', vine: '#5a8a36', stem: '#6a5a2a' },
    pale: { name: 'Pale', rind: '#f0d6a0', rib: '#c8a870', vine: '#6a9a4a', stem: '#7a6a3a' },
    wild: { name: 'Wild', rind: '#7a6a3a', rib: '#4e4422', vine: '#2e4a22', stem: '#3a3018' },
    striped: { name: 'Striped', rind: '#e0a040', rib: '#5a7a2a', vine: '#3a6a2a', stem: '#5a4a22' },
    night: { name: 'Night', rind: '#4a3e5a', rib: '#2a2238', vine: '#2a2a3a', stem: '#2a2230' },
    ember: { name: 'Ember', rind: '#d8442a', rib: '#ffb040', vine: '#4a3a22', stem: '#3a2a1a' },
  };
  /* coats a foal can be born with, and how often */
  PR.FOAL_COATS = ['orange', 'orange', 'orange', 'rust', 'rust', 'gold', 'gold', 'pale', 'striped', 'wild', 'wild', 'night', 'ember'];

  PR.STATS = [
    { id: 'speed', name: 'Speed', about: 'how fast it runs on the ground, and how little the air slows it' },
    { id: 'grip', name: 'Grip', about: 'how far its vines reach for a branch' },
    { id: 'spring', name: 'Spring', about: 'how hard it pumps a swing, and how far a clean release throws it' },
    { id: 'nerve', name: 'Nerve', about: 'how strong a boost is, and how fast the boost fills' },
  ];
  PR.STAT_MAX = 10;

  const NAME_A = ['Bram', 'Gour', 'Rind', 'Pip', 'Squash', 'Moss', 'Tangle', 'Hob', 'Bumble', 'Sprout', 'Thistle', 'Clod', 'Marrow', 'Puddle', 'Kettle', 'Fern', 'Burl', 'Nutmeg', 'Ember', 'Mudd'];
  const NAME_B = ['kin', 'lo', 'jack', 'wick', 'bottom', 'top', 'socks', 'bell', 'wort', 'loaf', 'bean', 'nose', 'ling', 'patch', 'step', 'string', 'drum', 'by', 'kettle', 'sprig'];
  PR.punkName = rnd => NAME_A[Math.floor(rnd() * NAME_A.length)] + NAME_B[Math.floor(rnd() * NAME_B.length)];

  /* the costs of things */
  PR.trainCost = (lvl) => 30 + lvl * lvl * 12;         // raising a stat from lvl to lvl+1
  PR.MAX_PUNKS = 4;
  PR.FOAL_PRICE = [120, 180, 260];                   // the foal market's three pens, plain to fine
  PR.PAIR_COST = 220;                                // pairing two of your Punks at the Grove
  PR.SELL_BASE = 40;
  PR.START_COINS = 150;
})(typeof window !== 'undefined' ? window : globalThis);
