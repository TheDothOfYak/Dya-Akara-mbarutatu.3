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
    'The Mbaru Tatu are three Tatu — Velki, Xikia, and Leotik — that circle one another like a world and two great moons, while all three circle Pia’don’s star together.',
    'Tatu means planets. Kalo means moons. Each of the Mbaru Tatu keeps its own Kalo.',
    'Velki is the largest Tatu: twelve continents and the largest ocean on any of the three. The Su Naga first appeared in its waters.',
    'Xikia swings so close under Velki’s pull that it nearly orbits it like a moon. About four in ten of all Eikar live there.',
    'Leotik is the smallest Tatu, and the wildest — six and a half continents, most unexplored, and an absurd number of venomous things.',
    'Fti is Air and the North. Su is Water and the South. Eldi is Fire and the West. Ular is Earth and the East.',
    'Nekh FtiSular, the misted supercontinent at the top of Velki, is named for the Air and the Water: the land of mist.',
    'The Nekh’Vorran first came through out of the Duat into Velki’s heart. Before them, the north of the world was barren and cold.',
    'An Eikar’s Aagac — their acorn hat — is part of their very being. Folk know the hat before they know the face.',
    'Most Keilia are builders. Their master hammers are made for them by the Kalo — and a Keilia who takes a hammer to battle is banished.',
    'The Keilia ran the Mbaru Tatu first. The Great War is where the world passed from the Keilia to the Eikar.',
    'The Skaar Uverkhron are the three greatest factions: the Duskareth follow the Nekh’Vorran, the SkarValorin the Aerolhorn, the Elsha’ryn the Vyrenalur.',
    'The Kalo’Eik can change the shape of Stygian itself. Since the Xwi left, they will not shape it into weapons.',
    'Find the eye of the Sunear’Zikhron and keep pace with it, and what lives there will give you a true prophecy.',
    'The Sunear’Zikhron must touch every inch of a Tatu before it moves on. The Su Naga help it mix with the oceans.',
    'The token game began as research: a creature’s song, liquid Stygian poured into a piece of it, and an Okid’Relic to hold the truth.',
    'Stryx are exactly as clever as they are raised to be. The World Arena’s Stryx only know how to stab. A ship’s pilot Stryx outthinks everyone aboard.',
    'Songs told in the old way bring visions — best in the dark, by firelight or bioluminescence. Young Eikar, with their third eyelid, see them brightest.',
    'Kipsu hatch about the size of a ten-coin, one to three to an egg — and a parent’s size says nothing of the pup’s.',
    'The Albali Byrd’s healing film is bound to the Byrd that made it. If the Byrd dies, the film is only water.',
    'Duat Seedlings most often grow into Megla Aagac. About one in twenty-five sprouts a Malsti Punk instead.',
    'A Dya’Can is a companion of the road — guildmate, brother or sister in arms.',
    'In Dearcineon, saka is the bow, akalay the arrow, and saklay the two together. Hanii is the spear; tuun, the sword.',
    'A token captures the truth of one specific creature — not its species. Two Gynge tokens will never behave alike.',
    'Same-source tokens behave identically. It is, after all, the same truth.',
    'NgAkara is drawn from the head of the Su Naga. You do not have to kill the Naga to take it.',
    'A creature that died in a violent fight yields a token skewed toward those final furious moments.',
    'No creature is weak to terrain. Comfort is a preference — never a vulnerability.',
    'The first head of any Naga is near-invincible. Near.',
    'Kill a RubberMcFly and the ShurgrEdan will answer before the day is out.',
    'The Duskareth can split a Stygian Relic through the Duat — but the split dissolves when its maker dies.',
    'Kipsu are distant kin to the Vyrenalur. If one ever walks the field, every Kipsu will follow it. Without exception.',
    'Rodak travel in threes and follow trouble, waiting for the aftermath. Fell one, and the whole pack vanishes.',
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

  /* ---------- The Rokarvac of the Mbaru Tatu (world codex) ----------
     A player-facing primer on the worlds, drawn from the creator's
     Rokarvac. Kept to what the folk of the Mbaru Tatu could know —
     no hidden truths. Each chapter: { id, title, intro, entries:[{ name, sub, body }] }. */
  L.WORLD = [
    {
      id: 'tatu', title: 'The Three Tatu',
      intro: 'Tatu means planets; Kalo means moons. The Mbaru Tatu are three Tatu and their Kalo. They are not a solar system of their own: Velki holds the centre, Xikia and Leotik swing around it the way great moons would, and all three circle Pia’don’s star together.',
      entries: [
        { name: 'Velki', sub: 'The largest Tatu · twelve continents · the largest ocean', body: 'The heart of the cluster’s dance. The Su Naga first appeared in Velki’s ocean, and the largest and oldest of them still keep its deeps. Velki is also where the Nekh’Vorran first came through out of the Duat, into Velki’s heart. Among its continents: Nekh FtiSular, the misted supercontinent across the north; Velkinovek, the most populous, joined to Nekh FtiSular’s southern reach and running past the equator; long, thin Xyra’kharraen to the southeast; Quarethen, home of famous and infamous generals and tacticians; Gi’Adefus; Moravarethese, more water than land; frozen Su’Kryundel at the southern pole; and Fti and Su Aurvareth, neighbours on good terms since anyone can remember. Fyrsti’Vilag and its World Arena stand on Velki.' },
        { name: 'Xikia', sub: 'The middle Tatu · nine continents', body: 'Held so tightly by Velki’s pull that it nearly orbits Velki like a moon. About 41% of all Eikar live on Xikia — owed, it is said, to the Inventor and his apprentice renaming the capital, and to the destruction of the World Arena. Northern Xikia is high country: dense green forest, mountain ranges, crisp air and big skies. Xikia holds the largest of the three Fti Megla Aagac, and the Stryx Rakarvorac — the great academy of Stryx — stands here.' },
        { name: 'Leotik', sub: 'The smallest Tatu · six and a half continents', body: 'Still far larger than any Kalo, and by far the wildest of the three. Most of Leotik is unexplored. It is home to some of the most aggressive beasts in the Mbaru Tatu and an absurd number of poisonous and venomous plants and animals — the feral Villtur forms of familiar creatures among them. For ages Leotik was all but lost; when Eikar finally learned the trigger of the Urverk that leads there, they arrived on an island of ruins. The ruins of Villtur and the castle of UlarKlug are their foothold.' },
        { name: 'The Kalo', sub: 'Moons of the Mbaru Tatu', body: 'Every Tatu keeps its own Kalo. Bolo Kalo, one of the smaller, is home to the Kalo’Eik; their capital is guarded by Relics upon Relics, made to turn aside falling space rock — and, once, most of the Sunear’Zikhron itself. On a near pass, one small Kalo of Xikia is known to dance.' },
        { name: 'Pia’don', sub: 'The solar system', body: 'The Mbaru Tatu share their star with other worlds: Katkan, the world of the Fuzzies; Oskerarean, the sub-corporeal world of the Ghosties, where True Raw Stygian comes from; and Su’Kryulndael, a waterworld with massive caverns beneath. On clear nights, Pia’don’s outer cloud is a pale ring across the sky.' },
      ],
    },
    {
      id: 'elements', title: 'Elements & Directions',
      intro: 'In Dearcineon, the four elements are also the four directions. Every pulse of resources on the field is one of these four.',
      entries: [
        { name: 'Fti', sub: 'Air · sky · flight — and North', body: 'The root for air, the sky, and flying. Fti creatures are the flyers and the swift.' },
        { name: 'Su', sub: 'Water · liquid — and South', body: 'The root for water and anything that flows. Su Naga, Hvaleia, Harkal and the Su Grothyn are its great beasts.' },
        { name: 'Eldi', sub: 'Fire — and West', body: 'Fire, and an aggressive symbol to the Eikar. The Eldi Aagac — the fire trees — are never harmed by fire.' },
        { name: 'Ular', sub: 'Earth · ground · land — and East', body: 'The root for land, earth, ground and dirt. Put the roots together and you have names: SuUlar is the southeast; Nekh FtiSular, the misted continent, is the land of the Air-Water.' },
        { name: 'Comfort, never weakness', sub: 'A rule of the token game', body: 'No creature is weak to a terrain. Comfort is a preference, never a vulnerability.' },
      ],
    },
    {
      id: 'peoples', title: 'The Peoples',
      intro: 'Dearcàn is the word for the beings of the Mbaru Tatu. Eikar and Keilia are both seed beings — both came from trees — and both are immortal through zikhron, through memory.',
      entries: [
        { name: 'Eikar', sub: 'The acorn people', body: 'Eikar is Dearcineon for acorn. Acorn-textured skin, markings beneath the eyes, and an Aagac — an acorn hat — that is part of their very being. Every Aagac is as unique as a fingerprint; folk recognise the hat before the face. Some young Eikar have an extra eyelid that lets them see more of the spectrum. The Eikar developed after the Keilia and were long treated as lesser; they did not stay that way.' },
        { name: 'Keilia', sub: 'Builders of the Mbaru Tatu', body: 'Almost always far larger than the Eikar. Their hair overlaps like armour, growing thick from the shoulders down to the calf like a cape. Most Keilia are builders — it has been the pride of their people as long as anyone remembers — while only a few are smiths. Their master hammers are made by the Kalo, and a Keilia who uses their hammer in battle is banished and shamed. The Keilia ran the world first and were nearly wiped out when the Nekh’Vorran came; those who survived had mastered their erokeria — their many minds.' },
        { name: 'Kalo’Eik', sub: 'The moon-folk', body: 'A peaceful people who can change the shape of Stygian itself. Since the Xwi left, they refuse to shape it into weapons — the only tool-that-could-be-a-weapon they make is the Keilia hammer. The best libraries and schools in the Mbaru Tatu are theirs or the Keilia’s, built on or near an Urverk so books and memory cores move with ease.' },
        { name: 'Karnen', sub: 'People, not beasts', body: 'A small people long woven into Eikar towns as skilled workers. The Guild is very clear on this.' },
        { name: 'Xwi & Xiw', sub: 'Higher and lower', body: 'Xwi means higher, or angel; Xiw means lower, or devil. The Xwi came to Pia’don, warred with the Snillers through the Skyfalls, and then — after the last Sniller Burst — cursed the Snillers into amulets and left. No Skyfall has come since.' },
      ],
    },
    {
      id: 'factions', title: 'The Skaar Uverkhron',
      intro: 'Skaar means greatest. The Skaar Uverkhron are the three greatest factions of the Mbaru Tatu — and each follows one of the great beasts, in its way.',
      entries: [
        { name: 'The Duskareth', sub: 'The Duat Dwellers · follow the Nekh’Vorran', body: 'Arguably the most powerful of the three. Their powers flow from the Stygian Ring of the Elster Velki, down through the Onnar — the Naelst and Stamijan Velki — to the Ver, the Thar Norvek or Dark Screamers, and on to the Vel, who move objects through the Duat. Their closely guarded art is the Stygian Link: splitting a Relic through the Duat so both halves act as one. A Link dissolves when the Dweller who made it dies. They carry the curse of the Oskeraren.' },
        { name: 'The SkarValorin', sub: 'The Greatest of Valor · follow the Aerolhorn', body: 'Once they could forge Stygian of every kind — raw, zikhron, and Relic — on the Great Anvil, a gift of the ShurgrEdan, without corrupting it. When their ocean keep fell, the Anvil and every mould vanished. Now they can only add Stygian to a core or Relic. They still hold more Stygian weapons than anyone, and speak of the day the Aerolhorn returns.' },
        { name: 'The Elsha’ryn', sub: 'The luminous forest · follow the Vyrenalur', body: 'Trackers of memory: they can find folk, cores, and those who were there in a memory. They grow-forge — growing a plant or raw metal onto a Relic until it becomes part of it. The songs of their Protected Grove work only there; carry one out and you forget it. An Elsha’ryn who has been changed and then breaks their oath is taken by the forest.' },
      ],
    },
    {
      id: 'storm', title: 'The Sunear’Zikhron',
      intro: 'Sunear means waves; zikhron means memory. The Waves of Memory are a storm that has always existed, and has never been weak.',
      entries: [
        { name: 'A storm that must touch everything', sub: 'How the Waves move', body: 'The storm must touch every inch of a Tatu before it moves on — flooding caves, cresting mountains, sinking into roots and sealed caverns if it must — then it passes through the Duat to the next world. Underground rivers and ocean currents are part of it too. The Kalo read what each passing wave brings.' },
        { name: 'RubberMcFly', sub: 'The storm’s companions', body: 'Among the only creatures able to fly in the storm, and the only time they glow at all. The strength of the storm follows how many RubberMcFly play in it. When it needs more strength they gather the Su Naga to the shore to raise ocean spray with their breath — and when it needs more still, the Api Buta.' },
        { name: 'The eye', sub: 'A true prophecy', body: 'Some Dearcineon and some Relics can glimpse strands of the future, but those glimpses are unreliable. Find the eye of the Sunear’Zikhron and keep pace with it, and what dwells there will give a true prophecy — the only foolproof glimpse of what is not yet known.' },
      ],
    },
    {
      id: 'token', title: 'The Token Game',
      intro: 'Dya’Akara began as research, became a schoolroom spectacle, and is now the great competitive game of the Dya Guild.',
      entries: [
        { name: 'Singing a truth', sub: 'How a token is made', body: 'Researchers found that singing a creature’s song while pouring liquid Stygian into a piece of that creature — a tooth, a bone, a shed scale — and setting it inside an Okid’Relic captures the truth of that creature as a living hologram. Two tokens woken near each other behave as the creatures would in the wild.' },
        { name: 'One individual, not a species', sub: 'Why no two tokens are alike', body: 'A token holds one specific creature’s truth. Its nature is the weighted average of that creature’s whole life — its energy and temper — and the moment its material was taken adds about a twentieth more. Two tokens of the same creature behave identically, whoever owns them; two of the same species never do.' },
        { name: 'The Okid’Relic', sub: 'Not a true Relic', body: 'Like a Quarigen, but with no Hurst inside and no power of its own — only a trigger its owner chooses. It houses the creature’s material and the truth sung into it.' },
        { name: 'Everywhere, at every table', sub: 'Who plays', body: 'Libraries and schools keep educational sets. Rich houses keep impressive collections. Everyone else plays in taverns, backyards, and — if they are good enough — the World Arena.' },
      ],
    },
    {
      id: 'words', title: 'Dearcineon',
      intro: 'Dearcineon is the most common language on the Mbaru Tatu, and the tongue of the Eikar. Names here are given as they are in Dearcineon.',
      glossary: [
        ['Tatu', 'planets'], ['Kalo', 'moons'], ['Pia’don', 'the solar system of the Mbaru Tatu'],
        ['Fti', 'air, sky, flight; north'], ['Su', 'water; south'], ['Eldi', 'fire; west'], ['Ular', 'earth, ground; east'],
        ['Eikar', 'acorn'], ['Esik', 'monster, animal'], ['Skepna', 'creature'], ['Canavar', 'beast'],
        ['Skor', 'large, big'], ['Skaar', 'greatest'], ['Mar', 'sea'], ['Megla', 'mist'],
        ['Borac', 'fighter'], ['Vakar', 'guardian'], ['Vakarborac', 'the Great Beasts'], ['Vakar’Eik', 'Eikar of the old guardians; ancestors'],
        ['Zahreh', 'flower'], ['Zahreh’Eik', 'nobles, lords and ladies'], ['Rokarvac', 'journal, story, writing book'],
        ['Zikhron', 'memory'], ['Sunear', 'waves'], ['Kahizecvar', 'a trance that forces a transfer of memory'],
        ['Urverk', 'portal'], ['Nekh', 'darkness'], ['Vorran', 'forceful wanderer'], ['Nekhic', 'of the Nekh’Vorran'],
        ['Nur', 'light'], ['Lun', 'shadow; moon'], ['Tynde', 'spark'], ['Ael', 'fire'], ['Thar', 'power'], ['Novek', 'marked'],
        ['Quora', 'knowledge'], ['Thalos', 'a cold, ancient city'], ['Habosh', 'holy'], ['Ndok', 'not'],
        ['Xwi', 'higher; angel'], ['Xiw', 'lower; devil'], ['Ako', 'yes-and-no'],
        ['Saka', 'bow'], ['Akalay', 'arrow'], ['Saklay', 'bow and arrow'], ['Hanii', 'spear'], ['Tuun', 'sword'],
        ['Mikolo Moko', 'weird leg'], ['Dya’Can', 'companions of the road; brothers and sisters in arms'],
        ['Hurst', 'soul'], ['Stygian', 'soul iron'], ['Quarigen', 'a Stygian housing'],
      ],
    },
  ];

  DYA.lore = L;
})();
