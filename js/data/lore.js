/* ============================================================
   DYA'AKARA — data/lore.js
   Lore tips, Dearcineon name generation, Hunt narratives &
   question pools, narrators, terrain sets, arenas.
   ============================================================ */
(function () {
  'use strict';
  const L = {};

  /* ---------- Loading screen lore tips ---------- */
  L.TIPS = [
    'The Mbaru Tatu are three sister planets — Velki, Xikia, and Leotik — sharing one orbit within Pia’don.',
    'A token captures the truth of one specific creature — not its species. Two Gynge tokens will never behave alike.',
    'Same-source tokens behave identically. It is, after all, the same truth.',
    'NgAkara is drawn from the head of the Su Naga. You do not have to kill the Naga to take it.',
    'A creature that died in a violent fight yields a token skewed toward those final furious moments.',
    'No creature is weak to terrain. Comfort is a preference — never a vulnerability.',
    'The first head of any Naga is near-invincible. Near.',
    'Kill a RubberMcFly and the ShurgrEdan will answer before the day is out.',
    'The Duskareth can split a Stygian Relic through the Duat — but the split dissolves when its maker dies.',
    'Kipsu are distant kin to the Vyrenalur. If one ever walks the field, every Kipsu will follow it. Without exception.',
    'Rodak hunt in threes. Fell one, and the whole pack vanishes.',
    'The Sunear’Zikhron — the Waves of Memory — is a perpetual storm that circles the planets, carrying memory itself.',
    'Seed races like the Eikar are immortal through memory. To be remembered is to continue.',
    'Noka has watched the Mbaru Tatu for two and a half million years. She narrates only the rarest of Hunts.',
    'The Keilia were nearly decimated. Nearly. Their builders remember everything.',
    'A Mikolo Moko unburdened outruns everything on the field. A Mikolo Moko under Relic weight outruns nothing.',
    'The size setting of a match is purely visual. A Litk duel and a Skaar duel are the same game.',
    'The Dya Guild takes no cut on duel bets. What is wagered is wagered.',
    'Tyndael burn hotter as they hunt. The crown tells you everything, if you know how to read it.',
    'Su Grothyn fire only when truly provoked. Eldi Grothyn were born provoked.',
    'Terrain tokens are placed before the match begins. The field is set; the truth decides the rest.',
    'The Okid’Relic is not a true Relic. It has no Hurst inside it, and it does not know the Duat.',
    'Lose a wagered token and it is gone. The Guild will not retrieve it. The Guild will not sympathize.',
    'Elbergi Plass has run his market stall since before the current Elster Velki took the Duat throne.',
    'An Archer Eikar in a Builder’s tower is worth three on the ground.',
    'Hvaleia cannot be snuck up on. Do not try. It has been tried.',
    'The World Arena of Fyrsti’Vilag was destroyed once. It will not be destroyed twice — so say the Keilia who rebuilt it.',
    'Harkal fight beside each other beautifully, right up until there is no one else left to bite.',
    'Karnen are people, not beasts. The Guild is very clear on this.',
    'Only five Torcain-rank Sprengju exist. Each has a name. Each is catastrophically illegal in three regions.',
  ];

  /* ---------- Dearcineon name generation ---------- */
  const SYL_A = ['Ka', 'Ve', 'Dra', 'Nok', 'Tha', 'Vor', 'El', 'Ska', 'Mal', 'Ki', 'Xa', 'Leo', 'Ula', 'Su', 'Fyr', 'Nekh', 'Tan', 'Kel', 'Ba', 'Zik', 'Ae', 'Uv', 'Stam', 'Nael', 'Ond', 'Kip', 'Har', 'Gro', 'Alb', 'Kar'];
  const SYL_B = ['ri', 'lo', 'va', 'thy', 'dor', 'ka', 'shi', 'ren', 'du', 'na', 'vek', 'lin', 'rak', 'sti', 'meil', 'or', 'an', 'el', 'ik', 'os'];
  const SYL_C = ['n', 'x', 'sh', 'k', 'th', 'r', 'l', 's', 'v', ''];
  L.genName = function (rng) {
    let n = rng.pick(SYL_A) + rng.pick(SYL_B);
    if (rng.chance(0.5)) n += rng.pick(SYL_C);
    if (rng.chance(0.25)) n += '’' + rng.pick(['Eik', 'Vil', 'Dor', 'Kal', 'Nov', 'Ryn']);
    return n;
  };
  L.genCreatureName = function (rng, speciesName) {
    // individual creature names for tokens
    const pre = ['Old', 'Young', 'Grey', 'Broken-', 'Iron', 'Quiet', 'Red', 'Deep', 'Long', 'Swift', 'Still', 'Bright', 'Ash', 'River', 'Storm', 'Moss'];
    const suf = ['fang', 'eye', 'coil', 'tail', 'crown', 'root', 'tooth', 'song', 'shade', 'claw', 'ridge', 'horn', 'whisper', 'bloom'];
    if (rng.chance(0.45)) return L.genName(rng);
    return rng.pick(pre).replace(/-$/, '') + rng.pick(suf);
  };

  /* ---------- Backstory fragments (written at crafting time) ---------- */
  L.STORY_LIVED = [
    'lived most of its life in the {terr} of {place}',
    'was raised near {place}, where it was well known to travelers',
    'haunted the edges of {place} for many seasons',
    'was famous in {place} — children were warned of it by name',
    'kept to itself in the wild country beyond {place}',
    'was studied for years by the scholars of {place}',
  ];
  L.STORY_TEMPER = [
    'It lived calm and unbothered, and its truth is a patient one.',
    'It lived hard and fought often; its truth carries that edge.',
    'Its days were quiet, but its final hour was violent — and the token remembers.',
    'It knew hunger, and the token hunts like it still does.',
    'It was beloved, in its way, and the token has a gentleness to it.',
    'Nothing about its life was gentle. Nothing about the token is either.',
  ];
  L.STORY_MATERIAL = [
    'The token was sung from a shed {mat}, taken without harm.',
    'The token was crafted from a {mat} found after a great battle.',
    'A hunter of {place} traded the {mat} that became this token.',
    'The {mat} was recovered by the Dya’Elkarg and sung true by a Guild crafter.',
  ];
  L.MATERIALS = ['tooth', 'bone', 'scale', 'chip', 'shaving', 'horn fragment', 'shell splinter', 'claw'];
  L.PLACES = ['Velkinovek', 'Fyrsti’Vilag', 'Nekh FtiSular', 'the Xikia Lowlands', 'the Xikia Highlands', 'the Leotik Frontier', 'UlarKlug', 'Aakalay’s ruins', 'the Bolo Kalo shorelands', 'the Elsha’ryn forest edge'];
  L.TERRAINS = ['deep forests', 'open plains', 'high passes', 'dry flats', 'bogs', 'coastal shallows'];

  /* ---------- Hunt narratives ---------- */
  L.NARRATORS = {
    guild: { name: 'Dya’Elkarg Official', style: 'formal', title: 'A Guild-Regulated Hunt' },
    noka: { name: 'Noka', style: 'riddles', title: 'Noka Speaks' },
    guide: { name: 'Local Guide', style: 'plain', title: 'A Guide’s Word' },
  };
  /* Narrator assignment per creature: Noka = rarest/ancient, Guild = regulated, guide = regional */
  L.HUNT_NARRATOR = {
    su_naga: 'noka', hvaleia: 'noka',
    ular_naga: 'guild', lutut: 'guild',
    sru_vorn: 'guide', tonguatjis: 'guide', kuni_byrd_wild: 'guide',
  };

  L.HUNT_INTROS = {
    su_naga: {
      noka: 'Riddle me the calm water, hunter. The sea does not part for you — it watches you. Somewhere below, a mind older than your bloodline counts your heartbeats in blue light. You have come to take a piece of its truth. It has already decided whether to let you. Two questions first, as is the old way — the water listens to how you answer.',
    },
    hvaleia: {
      noka: 'Count its eyes and you will run out of numbers before it runs out of eyes. Nothing surprises the Hvaleia, hunter — not in two and a half million years has one been surprised. So do not try. Come loud. Come honest. It respects that, in the way a mountain respects weather.',
    },
    ular_naga: {
      guild: 'The Dya’Elkarg has sanctioned this Hunt under standard regulation. Target: Ular Naga, earth-line serpent, multiple heads probable. Reminder: the first head is functionally invulnerable — the Guild has certified seventeen deaths this season from hunters who did not believe that. Answer the assessor’s questions, then proceed to the tracking ground.',
    },
    lutut: {
      guild: 'The Dya’Elkarg has sanctioned this Hunt under apex-predator regulation. Target: Lutut, aerial. It hunts Ular Naga for food; consider carefully what that makes you. Its screech will stun before the dive — Guild physicians describe the sensation as "unrecommended." Answer the assessor, then take your position.',
    },
    sru_vorn: {
      guide: 'See them bogs? Don’t step in them bogs. That’s the whole trick to a Sru Vorn hunt, friend — the acid pits are farmed, same as a field of Ju, except a field of Ju has never eaten my cousin’s punk. It’s lazy till it isn’t. Couple questions for the ledger, and we walk.',
    },
    tonguatjis: {
      guide: 'Deep forest work today. The Tonguatjis has been still under that same tree for six days, which means it’s hungry, which means the tongue comes out fast when it comes. Longer than the creature, that tongue, by a lot. Stay off the flight lines and out of the water and answer me these first.',
    },
    kuni_byrd_wild: {
      guide: 'Big one’s been nesting on the cliff shelf since last storm season. Kuni Byrd hits from altitude — you won’t see the dive, you’ll see the shadow, and then you won’t see anything for a bit. Bring something it can’t lift. Questions first — the Guild likes its paperwork.',
    },
  };

  /* ---------- Hunt question pools ----------
     Answers apply a hidden ~5% acquisition influence on the token's temperament.
     'calm' shifts toward patient truth, 'fierce' toward aggressive truth. */
  L.HUNT_QUESTIONS_GENERAL = [
    { q: 'The creature notices you before you are ready. What do you do?', a: [{ t: 'Hold still and let it settle', v: 'calm' }, { t: 'Strike first, strike hard', v: 'fierce' }, { t: 'Fall back and re-approach', v: 'calm' }, { t: 'Make yourself look bigger', v: 'fierce' }] },
    { q: 'What do you carry as your last resort?', a: [{ t: 'A song my mother taught me', v: 'calm' }, { t: 'A blade with no name', v: 'fierce' }, { t: 'Smoke and shadow', v: 'calm' }, { t: 'Nothing. I am the last resort', v: 'fierce' }] },
    { q: 'The weather turns foul mid-track. You…', a: [{ t: 'Wait it out under cover', v: 'calm' }, { t: 'Push through — weather hides my approach', v: 'fierce' }] },
    { q: 'Why this creature?', a: [{ t: 'To learn its truth', v: 'calm' }, { t: 'To prove I can', v: 'fierce' }, { t: 'For the Guild ledger', v: 'calm' }, { t: 'It knows what it did', v: 'fierce' }] },
    { q: 'How do you want the token to remember this day?', a: [{ t: 'As a quiet exchange', v: 'calm' }, { t: 'As the day it met its match', v: 'fierce' }] },
  ];
  L.HUNT_QUESTIONS_SPECIFIC = {
    su_naga: [
      { q: 'The light in the water pulses twice, then goes dark. Noka watches you. What was it saying?', a: [{ t: 'A greeting. I answer in kind', v: 'calm' }, { t: 'A warning. I ignore it', v: 'fierce' }, { t: 'A lie. It wants me to look away', v: 'fierce' }, { t: 'A question. I wait', v: 'calm' }] },
      { q: 'You may take the NgAkara without killing. Do you intend to?', a: [{ t: 'Without question', v: 'calm' }, { t: 'If it lets me', v: 'fierce' }] },
    ],
    ular_naga: [
      { q: 'The assessor asks: which head will you watch?', a: [{ t: 'The first. Always the first', v: 'calm' }, { t: 'Whichever comes closest', v: 'fierce' }] },
      { q: 'It has grown four heads. What does that tell you?', a: [{ t: 'It has survived much — respect that', v: 'calm' }, { t: 'It has killed much — end that', v: 'fierce' }] },
    ],
    lutut: [
      { q: 'The screech comes before the dive. Your plan?', a: [{ t: 'Cover, wax, patience', v: 'calm' }, { t: 'Scream back', v: 'fierce' }] },
    ],
    sru_vorn: [
      { q: 'The guide points at a stockpiled kill, uneaten. Meaning?', a: [{ t: 'It is patient. So are we', v: 'calm' }, { t: 'It is greedy. Greed is a weakness', v: 'fierce' }] },
    ],
    hvaleia: [
      { q: 'You cannot surprise it. So?', a: [{ t: 'Walk in the open, slow', v: 'calm' }, { t: 'Come loud and give it a show', v: 'fierce' }] },
    ],
    tonguatjis: [
      { q: 'Six days still under one tree. What is it doing?', a: [{ t: 'Waiting. It is very good at waiting', v: 'calm' }, { t: 'Starving. Desperation makes it sloppy', v: 'fierce' }] },
    ],
    kuni_byrd_wild: [
      { q: 'The guide offers you a sack of feed-meat. Use?', a: [{ t: 'Payment. The Byrd can be bought', v: 'calm' }, { t: 'Bait. The Byrd can be baited', v: 'fierce' }] },
    ],
  };

  /* ---------- Terrain sets (Part XV) ---------- */
  L.TERRAIN_SETS = [
    { id: 'plains', name: 'Plains Variant', tier: 'Local', basic: true, ground: '#7a8a52', accent: '#93a463', water: false, features: ['grass', 'rocks'] },
    { id: 'forest', name: 'Forest Variant', tier: 'Local', basic: true, ground: '#4e6b3c', accent: '#3c5530', water: false, features: ['trees', 'grass'] },
    { id: 'mountain', name: 'Mountain Variant', tier: 'Local', basic: true, ground: '#6d675e', accent: '#57524a', water: false, features: ['rocks', 'cliffs'] },
    { id: 'desert', name: 'Desert Variant', tier: 'Local', basic: true, ground: '#c2a76b', accent: '#ab9159', water: false, features: ['dunes', 'rocks'] },
    { id: 'ocean', name: 'Coastal Shallows', tier: 'Regional', basic: true, ground: '#5c8a7a', accent: '#3b9ae1', water: true, features: ['water', 'rocks'] },
    { id: 'eldi_aagac', name: 'Eldi Aagac Forest', tier: 'Regional', named: true, ground: '#5e4238', accent: '#b3502c', water: false, features: ['firetrees', 'embers'], blurb: 'A patch of massive fireproof fire trees. Owned by a wealthy house; available on request.' },
    { id: 'elsharyn', name: 'Elsha’ryn Forest', tier: 'Half Planet', named: true, ground: '#39544d', accent: '#68e0c8', water: false, features: ['trees', 'glowmoss'], blurb: 'The sacred luminous forest. Half Planet circuits and above.' },
    { id: 'arpeggio', name: '6 Tribes Arpeggio', tier: 'Whole Planet', named: true, ground: '#8a7a5c', accent: '#c9b487', water: false, features: ['pillars', 'banners'], blurb: 'Massive scale, traditionally large beast matches. Named for the Mar Esik hunt of the six tribes.' },
    { id: 'spire_cliffs', name: 'Spire Cliffs, Leotik', tier: 'Interplanetary', named: true, ground: '#55504f', accent: '#7d6a8a', water: false, features: ['cliffs', 'spires'], blurb: 'Guild-owned. Crowd favorite. Do not look down.' },
  ];

  /* ---------- Arenas (visual venues per circuit) ---------- */
  L.ARENAS = {
    'Local': ['The Cracked Okid Tavern', 'Miller Hama’s Backyard', 'The Old Grain Hall', 'Duskwell Community Floor'],
    'Regional': ['Tower of the Bent Vine', 'Keep Anor’Vek', 'The Regional Grounds at Halmstead'],
    'Half Planet': ['The Amphitheatre of Winds', 'Deepstone Stadium'],
    'Whole Planet': ['The World Arena, Fyrsti’Vilag'],
    'Interplanetary': ['Spire Cliffs Grand Arena, Leotik'],
  };

  /* ---------- Quick chat phrases (in-match; no free text) ---------- */
  L.QUICK_CHAT = ['Good luck!', 'Well played.', 'Nice token!', 'The Relic!', 'Ouch.', 'That was the plan.', 'That was NOT the plan.', 'One more after this?'];
  L.SPECTATOR_REACTIONS = ['👏', '🔥', '😱', '🌟', '💪', '😬'];

  /* ---------- AI merchant ---------- */
  L.ELBERGI = { name: 'Elbergi Plass', stallName: 'Elbergi’s Fine Truths', bio: 'Purveyor of honest tokens since before your grandmother’s grandmother. All sales final. All truths genuine.' };

  DYA.lore = L;
})();
