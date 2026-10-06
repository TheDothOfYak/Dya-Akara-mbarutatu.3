/* ============================================================
   TORCAIN'S RUN — Rokarvac I: The Ruins of Aakalay
   Drawn from the Rokarvac: Noka has been carried off to a new
   mountain again and left a riddle. Its first step leads Tanoc —
   Torcain, now that he is Stamijan — and his friend Phorus, a
   Kalo'Eik and a Nur, to the dead city of Aakalay. There are
   stygian pieces everywhere; most of them are memory cores.
   ============================================================ */

export const TITLE = {
  kicker: "Torcain's Run · Rokarvac I",
  title: 'The Ruins of Aakalay',
  sub: 'A tale of the Mbaru Tatu',
};

export const RIDDLE = [
  'Where the city swore and the swearing stung,',
  'five cores still hum what no mouth has sung.',
  'Bring them to the stone that drinks the oath —',
  'and the stone will show you the lie in both.',
];

export const OPENING = [
  'Noka is gone again.',
  'The old soul in the stygian iron has left her mountain, as she always does — and, as she always does, she has left a riddle behind.',
  'Three days of hiking. Two more riding wild Punks. One night aboard an Eldi ship, its Stryx pilot humming in the stump.',
  'The riddle’s first step points to a city that has been dead for a very long time.',
];

/* dialogue lines: [speaker, text] — speaker keys map to portraits */
export const SPEAKERS = {
  torcain: { name: 'Torcain', color: '#c89aff', sub: 'Stamijan · Eikar' },
  phorus: { name: 'Phorus', color: '#7ad8ff', sub: "Kalo'Eik · Nur" },
  noka: { name: 'Noka', color: '#ffd27a', sub: 'the soul in the iron' },
  memory: { name: 'Zikhron', color: '#b48aff', sub: 'a memory core' },
  stryx: { name: 'The Stryx', color: '#9ad86a', sub: 'pilot of the stump' },
};

export const DIALOG = {
  arrive: [
    ['phorus', 'Three days hiking, two on Punks that wanted to eat us, and a night on a fire tree. You owe me a hot meal, Torcain.'],
    ['torcain', 'When Noka’s found. Not before.'],
    ['phorus', 'Mm. Well. There it is. Aakalay. Or what’s left of it.'],
    ['torcain', 'The riddle starts here. "Five cores still hum." Can you hear them?'],
    ['phorus', 'I can feel stygian everywhere — this whole city is lousy with it. Most of it has gone quiet.'],
    ['phorus', 'But five pieces are still singing. Memory cores. Old ones. I’ll point the way when you need it.'],
    ['torcain', 'Then we follow the singing.'],
    ['phorus', 'One more thing. Wild Punks have nested in the old streets. And the mist here doesn’t move with the wind. Keep that axe close.'],
  ],
  stryx: [
    ['stryx', 'Kreee. Seed is warm. Ship is ready. Stryx waits.'],
    ['torcain', 'We’re not done here yet.'],
    ['stryx', 'Kree. Stryx is very good at waiting.'],
  ],
  firstFight: [
    ['phorus', 'Wild Punks! Mind the vines — they wind up before they bite.'],
  ],
  firstCore: [
    ['phorus', 'That’s one. Hold it a moment longer than you think you need to — they talk, if you let them.'],
  ],
  allCores: [
    ['phorus', 'All five. They’re singing to each other now… and something in the plaza is listening.'],
    ['torcain', 'The stone that drinks the oath. The Oath Stone, in the old Zahreh plaza.'],
  ],
  atStone: [
    ['phorus', 'This is it. Can you feel it pulling? It wants the cores. It wants anything that remembers.'],
    ['torcain', 'Then let’s give it something to remember.'],
  ],
  bossRise: [
    ['phorus', 'The ground — Torcain, get back!'],
    ['phorus', 'That’s no tree. That’s a Hurst forced into bark — a Megla Aagac, grown out of whoever swore this city away!'],
    ['torcain', 'The lord of Aakalay. Still holding on to his oaths.'],
    ['phorus', 'Then cut them. Its heart is the glowing knot in the trunk. I’ll keep its little ones off you!'],
  ],
  bossHalf: [
    ['phorus', 'It’s angry now — watch the roots, they’re coming faster!'],
  ],
  bossDown: [
    ['phorus', 'It’s… quiet. The mist is going still.'],
    ['torcain', 'The cores are still singing. Louder.'],
    ['phorus', 'They want to show you something. Noka told us about this — the Kahizecvar. A trance. It could take a while.'],
    ['torcain', 'Do it.'],
    ['phorus', 'If you drool, I’m telling everyone.'],
  ],
  wake: [
    ['phorus', 'There you are. A fortnight and some change, by my count. I put you in water, like Noka said to — sorry about the stygian in it.'],
    ['torcain', 'I saw it, Phorus. All of it. From every one of them.'],
    ['torcain', 'Two riders on a Nekh’Vorran came to duel him. They broke the stone’s hold — but the lord got out. Changed. The first Megla Aagac. The first Malsti Punk.'],
    ['phorus', 'And the riddle?'],
    ['torcain', 'Noka was in the memory too. Watching. She left the next line where only a trance would find it.'],
  ],
};

/* what each memory core says when held — fragments of the fall of Aakalay */
export const CORES = {
  library: {
    who: 'a scribe of the library',
    lines: [
      'We swore on the stone because the Zahreh told us to. It did not hurt. Not at first.',
      'Then the granaries closed, and the pay stopped, and the ones who tried to leave the oath… screamed.',
    ],
  },
  tower: {
    who: 'a watchman on the east wall',
    lines: [
      'Wings in the dark. A great worm out of the Duat, over the walls — a Nekh’Vorran.',
      'And on its back, a nekhic Eik in a showman’s coat, laughing like this was a festival. He called the lord out by name. A duel.',
    ],
  },
  grove: {
    who: 'a smith under the fire tree',
    lines: [
      'Step away from the oath and the stone burns you from the inside. Everyone knows that.',
      'What nobody knew — what the stone ate anyone for learning — is that if you keep pushing… you break free.',
    ],
  },
  shrine: {
    who: 'a child at the cliff shrine',
    lines: [
      'The lord fell in the plaza, and then the mist came up out of the ground where he fell.',
      'It had his voice. It said everyone still belonged to him.',
    ],
  },
  garden: {
    who: '…unclear. This core has been tampered with',
    lines: [
      'the cores were reshaped — claws that are not claws — scales like old light —',
      'something very old and very large was here, trying to keep him away from the Duat. It was too late.',
    ],
  },
};

export const TRANCE = [
  'Kahizecvar.',
  'You are a scribe, a watchman, a smith, a child — all at once, without a single thought or feeling missing.',
  'You feel the oath close around the city like a fist.',
  'You see Kiet on the back of Jhealanil, the great Nekh’Vorran, landing in the plaza with a grin — and the duel that ends the lord’s reign.',
  'You see the oath break, and the people walk out of it, and the treasuries emptied into the streets.',
  'And you see what crawls out of the lord as he falls: a seedling of the Duat, rooting in the plaza… and a fist-sized Punk scuttling into the dark with his memory in its stem.',
  'At the very edge of the memory, an old voice, amused, speaking in riddles.',
];

export const NEXT_RIDDLE = [
  'Little Eikar with the borrowed name,',
  'the stone forgot, but the stem kept the same.',
  'Follow the Punk with a lord in its head',
  'to the isle where the Urverk wakes the dead.',
];

export const OBJECTIVES = {
  talk: 'Speak with Phorus on the pier',
  cores: n => `Recover the singing memory cores (${n}/5)`,
  stone: 'Bring the cores to the Oath Stone in the Zahreh plaza',
  boss: 'Cut the Oath-Rooted loose',
  done: 'Rokarvac I complete — explore, or return to the ship',
};

export const CODEX = [
  ['Torcain', 'Tanoc Filugani’s name now that he is Stamijan. An Eikar torn across Eternal Space as a boy, saved by the Carpenter, Buhkon Eldi, who gave him his first Aagac. He uses the Duat to carry his axe where no arm could reach.'],
  ['Phorus', 'A Kalo’Eik and a Nur — the Kalo’Eik live on the moons. Phorus can sense stygian and tell a memory core from dead iron, and can wake the Kahizecvar trance.'],
  ['Noka', 'An ancient soul trapped in stygian iron, moving from mountain peak to mountain peak. She never says where she’ll go next — only riddles.'],
  ['Eikar', 'The acorn people. Their Aagac — the acorn-cap hat — is part of their being, and the symbol on it shows what kind of Eikar they are. No hands: their weapons float beside them.'],
  ['Stygian', 'Soul iron. Most of the stygian scattered in Aakalay’s dust are memory cores, gone quiet.'],
  ['Zikhron', 'Memory. A memory core holds what it saw, and a Nur can make it show you.'],
  ['The Duat', 'The other side, where the Nekh’Vorran came from. It does not like things it does not know.'],
  ['Tukang', 'Torcain’s relic of fire, speed and heat, made by the Inventor from the first Aagac. It builds heat as he fights.'],
  ['Wild Punk', 'The pumpkin-and-vine family, grown wild. Faster and leaner than a domestic Punk, and much worse-tempered.'],
  ['Malsti Punk', 'Fist-sized Punks that sprout from Duat Seedlings. Already at home in the Duat, so they blink about the battlefield.'],
  ['Megla Aagac', 'What a Duat Seedling most often grows into. In Aakalay, one grew out of the lord who held the Oath Stone.'],
  ['Eldi Ship', 'A mature fire tree, hollowed out. Fire never harms the wood. A living seed in the stern pushes it through the sky, and a Stryx grown in the pilot stump flies it.'],
  ['Zahreh', 'Flowers — and, in the old tongue, the name for a city’s rich and noble. The flowers of the garden still heal.'],
];
