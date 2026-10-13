/* ============================================================
   TORCAIN'S RUN — all the words of the game.
   Drawn from the Rokarvac: Noka has been carried off to a new
   mountain again and left a riddle. Tanoc — Torcain, now that he
   is Stamijan — and his friend Phorus, a Kalo'Eik and a Nur, set
   out from Beuhk on Xikia, where the Carpenter Buhkon Eldi once
   found him, to the abandoned city of Aakalay, and on through an
   Urverk to Leotik.
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
  'The riddle points to a city that has been dead for a very long time. Getting there will take a ship, a seed, and an axe-arm that hasn’t gone soft.',
  'So Torcain goes home first — to Beuhk, and to the Carpenter who taught him everything.',
];

/* ---------------- Beuhk: the prologue ---------------- */
export const XILIA = {
  kicker: "Torcain's Run · Prologue",
  title: 'Home to Beuhk',
  intro: [
    ['phorus', 'Beuhk! Fresh bread, warm hearths, Punks that don’t want to eat us. I could live here, Torcain.'],
    ['torcain', 'You say that about every town with an oven.'],
    ['phorus', 'And I mean it every time. So — the riddle. "Where the city swore and the swearing stung, five cores still hum." That’s Aakalay.'],
    ['torcain', 'Aakalay’s a ruin. Nobody’s sailed there in a lifetime.'],
    ['phorus', 'Then we’ll need a ship, and you’ll need your arm back. You’ve been carrying that axe like a shopping basket.'],
    ['torcain', 'Buhkon will set me right. His place is out west of town, up the little road on his hill.'],
    ['phorus', 'Go on, then. Find the Carpenter. I’ll be smelling the bakery.'],
  ],
  tut: [
    /* 0 → 1 meeting */
    [
      ['buhkon', 'Tanoc! — Torcain, I should say. Look at you. Stamijan, and still too thin.'],
      ['torcain', 'Noka’s gone again, Buhkon. The riddle points to Aakalay.'],
      ['buhkon', 'Aakalay. Hah. Then you’ll want the old drills before you go. Those straw dummies — break all three. Left-click, and keep clicking to chain a combo.'],
      ['buhkon', 'WASD to move, the mouse to look. Shift to run, Space to jump. Go on.'],
    ],
    /* 1 → 2 dummies broken */
    [
      ['buhkon', 'Good! Heavy hands, same as ever. Now — see the one up on the high post?'],
      ['buhkon', 'Aim at it and RIGHT-click. The Duat will carry your axe there and bring it home. That’s your Duat Strike.'],
    ],
    /* 2 → 3 high dummy */
    [
      ['buhkon', 'Ha! Clean through. Last thing: the tower. Climb the stair to the top.'],
      ['buhkon', 'Jump off, then HOLD Space while you fall. Your coat will catch the wind, and you glide. Don’t look down. Or do. It’s nice.'],
    ],
    /* 3 → 4 glided */
    [
      ['buhkon', 'Like a seed on the wind! Come back and talk to me, little Eikar.'],
    ],
    /* 4 → 5 graduation */
    [
      ['buhkon', 'That’s everything I can teach you in a yard. The rest the wilds will teach you, and they’re less patient.'],
      ['buhkon', 'Remember: C to roll — they can’t hit what isn’t there. R drinks Albali film to heal. T locks on. Q lets the Tukang’s heat out when it’s full.'],
      ['buhkon', 'F asks Phorus to sense the way. I for your pack, K for your skills, M for the map, J for your quests, Tab for your Rokarvac. Rest at Nur Lanterns.'],
      ['buhkon', 'And one last thing — not a drill. Nur’Hlyst. Close your eyes. Listen with your Hurst, not your ears, and push.'],
      ['buhkon', 'There. Feel the world light up? Press G, any time. Hidden things will answer — chests, ore, and Sniller amulets, if any are about.'],
      ['buhkon', 'Bring the amulets to nobody — keep them. They hum toward old vaults; every few you gather will show you something worth having.'],
      ['buhkon', 'And talk to people! Half this town wants a favour, and favours make friends — and friends lend Punks.'],
      ['buhkon', 'Now. The Stryx at the docks has been squawking since you landed. Go see what it wants.'],
    ],
  ],
  buhkonAfter: [
    'The tower’s still there if you want to practice gliding. Or I could find you more dummies. I have a lot of straw.',
    'Go find Noka. And eat something — you look like a twig.',
    'The Ember Grove is north-east, past the forest road. Tyndaels nest there. Mind your eyebrows.',
    'That tower will hold books one day. Cores, too. A zikhron library of your own — when you’re ready for one.',
    'Sniller amulets in the rafters again. They wander, those things. Use your Nur’Hlyst; they glow cold teal.',
  ],
  stryxSeed: [
    ['stryx', 'Torcain. Four minutes later than I estimated. Your Carpenter talks.'],
    ['torcain', 'Can you fly us toward Aakalay?'],
    ['stryx', 'Not on this seed. It is eleven years old and I have nursed it through the last three flights. Push it once more and we become a very large torch.'],
    ['stryx', 'I need a fresh one — warm, from the young fire tree in the Ember Grove. The tree has only just begun to seed.'],
    ['phorus', 'North-east of town. Something hot nests there now.'],
    ['stryx', 'Tyndaels. Flying sparks with wings. They breathe fire; you move. I have calculated that you will move most of the time.'],
  ],
  stryxWait: [
    ['stryx', 'The Ember Grove. North-east. A warm seed, not a cold one. I will be here, reading the wind.'],
  ],
  stryxEarly: [
    ['stryx', 'Your Carpenter asked me to wait until he has finished with you. This ship took eleven years to grow. I can wait an afternoon.'],
  ],
  seedTaken: [
    ['phorus', 'That’s it — I can feel it humming from here. It’s like holding a sunset. Don’t you dare sell it.'],
    ['torcain', 'Back to the docks, then. Aakalay.'],
  ],
  setSail: [
    ['stryx', 'Good seed. Very good seed. Stand clear of the stern.'],
    ['stryx', 'One condition. No Eldi ship flies near Aakalay — the oath-mist chills a seed to death. I will set you down at the edge of the Ashen Reach. The rest is on foot.'],
    ['phorus', 'On FOOT?'],
    ['torcain', 'We’ve walked further for less.'],
  ],
  sailCards: [
    'The seed takes root in the stern, and the old fire tree shakes off its moorings.',
    'Beuhk falls behind — smoke from the chimneys, Buhkon waving from his tower.',
    'The Stryx sets you down at the edge of the Ashen Reach and is gone before Phorus has finished complaining.',
    'Three days of hiking. Two more riding wild Punks that wanted to eat you.',
  ],
};
export const ARRIVE_AAKALAY = ['The old causeway ends at a dock nobody has used in a lifetime.', 'Nobody lives here anymore. Not Eikar. Not Keilia. Only animals, and the quiet.', 'Aakalay.'];

/* dialogue lines: [speaker, text] — speaker keys map to portraits */
export const SPEAKERS = {
  torcain: { name: 'Torcain', color: '#c89aff', sub: 'Stamijan · Eikar' },
  phorus: { name: 'Phorus', color: '#7ad8ff', sub: "Kalo'Eik · Nur" },
  noka: { name: 'Noka', color: '#ffd27a', sub: 'the soul in the iron' },
  memory: { name: 'Zikhron', color: '#b48aff', sub: 'a memory core' },
  stryx: { name: 'The Stryx', color: '#9ad86a', sub: 'pilot of the Eldi ship' },
  buhkon: { name: 'Buhkon Eldi', color: '#ffb050', sub: 'the Carpenter' },
  venkin: { name: 'Venkin', color: '#e0b070', sub: 'Keilia builder' },
  eye: { name: 'The eye of the storm', color: '#fff0c8', sub: 'what lives in the Sunear’Zikhron' },
};

export const DIALOG = {
  arrive: [
    ['phorus', 'Three days hiking, two on Punks that wanted to eat us, and not one hot meal since Beuhk. You owe me, Torcain.'],
    ['torcain', 'When Noka’s found. Not before.'],
    ['phorus', 'Mm. Well. There it is. Aakalay. Or what’s left of it.'],
    ['torcain', 'The riddle starts here. "Five cores still hum." Can you hear them?'],
    ['phorus', 'I can feel stygian everywhere — this whole city is lousy with it. Most of it has gone quiet.'],
    ['phorus', 'But five pieces are still singing. Memory cores. Old ones. I’ll point the way when you need it.'],
    ['torcain', 'Then we follow the singing.'],
    ['phorus', 'One more thing. Nobody has lived here in a lifetime — only animals now, nested in the old streets. And the mist doesn’t move with the wind. Keep that axe close.'],
  ],
  stryx: [
    ['stryx', 'The seed is warm and the ship is ready. Whenever you are.'],
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
  /* the Kahizecvar: the Oath Stone drinks the cores, and Torcain lives the duel */
  tranceIn: [
    ['phorus', 'The stone’s drinking them — all five. Torcain, the cores are pulling at you. This is it. The Kahizecvar.'],
    ['torcain', 'Then let it take me.'],
    ['phorus', 'I’ll be right here. If you drool, I’m telling everyone.'],
  ],
  tranceCards: [
    'Kahizecvar.',
    'The ruin falls away. Aakalay is shining — every street scrubbed clean, every window dark, every soul silent.',
    'You are not Torcain. You are Kiet, at the end of the Era of the Nekh’Vorran, and Kireo’Nik is circling overhead.',
    'In the plaza, beside the stone that drinks oaths, the Master of the Keep is waiting.',
  ],
  bossRise: [
    ['memory', 'Otlið, Master of the Keep. A Keilia, tall as a door, with the Oath Stone’s light running through his scales.'],
    ['memory', '“No able-bodied man walks my city without swearing to me first, nekhic. Kneel, or be sworn.”'],
    ['memory', 'Kiet laughs, and rips the Duat open beside him. This is a duel, and the whole city is watching from behind its shutters.'],
  ],
  bossHalf: [
    ['memory', 'Otlið calls on the oaths of every soul in the city — golden rings close around you. Don’t let them bind.'],
  ],
  bossDown: [
    ['memory', 'Otlið falls to one knee. The oaths snap like strings — all over the city, people breathe at once.'],
    ['memory', 'And from where he fell, something dark puts down a root. A Duat seedling. Something small and violet scuttles off with his memory in its stem.'],
  ],
  wake: [
    ['phorus', 'There you are. A fortnight and some change, by my count. I put you in water, like Noka said to — sorry about the stygian in it.'],
    ['torcain', 'I saw it, Phorus. All of it. From every one of them.'],
    ['torcain', 'An Eikar named Kiet, and his Dya’Can, on a great Nekh’Vorran — Kireo’Nik. They came to duel the Master of the Keep. They broke the stone’s hold.'],
    ['torcain', 'But the Master got out. Changed. A Keilia — the cores have his name cut out of them. Kiet’s people called him Otlið.'],
    ['phorus', 'And the seedling that took root where he fell — that’s the Megla Aagac standing over the plaza. It’s only a tree now. And the Malsti Punk that ran off with his memory.'],
    ['torcain', 'One more thing. The Oath Stone wasn’t just a Relic. It was built over an Urverk. Kiet opened it — I saw the trigger.'],
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
  'You see Kiet astride Kireo’Nik, his great Nekh’Vorran, landing in the plaza with a grin — and the duel that ends the reign of the Master of the Keep.',
  'You see Kiet’s hand on the Oath Stone, and the old Urverk beneath it opening like an eye. You see the trigger.',
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
  boss: 'Win the duel against Otlið — you are Kiet, in the Kahizecvar',
  done: 'Rokarvac I complete — explore, or return to the ship',
  xilia: {
    talk: 'Speak with Phorus on the pier',
    buhkon: 'Find Buhkon the Carpenter on his hill — west of town, up the little road',
    dummies: n => `Break the training dummies (${n}/3)`,
    high: 'Duat Strike the dummy on the high post (aim + right-click)',
    glide: 'Climb the tower, jump, and hold Space to glide',
    back: 'Return to Buhkon',
    stryx: 'See what the Stryx wants at the docks',
    seed: 'Bring a fire seed from the Ember Grove (north-east)',
    sail: 'Bring the fire seed to the Stryx — set sail for Aakalay',
  },
};

export const CODEX = [
  ['Torcain', 'Tanoc Filugani’s name now that he is Stamijan. An Eikar torn across Eternal Space as a boy, saved by the Carpenter, Buhkon Eldi, who gave him his first Aagac. He uses the Duat to carry his axe where no arm could reach.'],
  ['Phorus', 'A Kalo’Eik and a Nur — the Kalo’Eik live on the moons. Phorus can sense stygian and tell a memory core from dead iron, and can wake the Kahizecvar trance.'],
  ['Noka', 'An ancient soul trapped in stygian iron, moving from mountain peak to mountain peak. She never says where she’ll go next — only riddles.'],
  ['Eikar', 'The acorn people: humanoids with acorn-textured skin, markings beneath their eyes, and an Aagac — the acorn-cap hat — that is part of their being. 41% of all Eikar live on Xikia.'],
  ['Stygian', 'Soul iron. Most of the stygian scattered in Aakalay’s dust are memory cores, gone quiet.'],
  ['Zikhron', 'Memory. A memory core holds what it saw, and a Nur can make it show you.'],
  ['The Duat', 'The other side, where the Nekh’Vorran came from. It does not like things it does not know.'],
  ['Tukang', 'Torcain’s relic of fire, speed and heat, made by the Inventor from the first Aagac. It builds heat as he fights.'],
  ['Wild Punk', 'The pumpkin-and-vine family, grown wild. Faster and leaner than a domestic Punk, and much worse-tempered.'],
  ['Malsti Punk', 'Fist-sized Punks that sprout from Duat Seedlings. Already at home in the Duat, so they blink about the battlefield.'],
  ['Megla Aagac', 'A single dark tree, not a forest and not a mind — what a Duat Seedling most often grows into. In Aakalay, one grew where the Master of the Keep fell.'],
  ['Otlið', 'The Master of the Keep at Aakalay — a Keilia. The ShurgrEdan cut his name out of every core they found; “Otlið” is what Kiet’s people called him.'],
  ['The Oath Stone', 'A Relic that holds anyone who swears to it. Break away and it burns; push on and you break free — but the Relic makes its holder hunt down anyone who learns that.'],
  ['Kiet', 'An Eikar at the end of the Era of the Nekh’Vorran who rode the great Nekh’Vorran Kireo’Nik to Aakalay with his Dya’Can, after fifty letters from a farmboy outside the walls.'],
  ['Eldi Ship', 'A mature fire tree, hollowed out. Fire never harms the wood. Only the tree’s own seed can drive it, and a Stryx grown in the pilot stump flies it — smarter than any Esik or Eikar, with reflexes ten times as fast.'],
  ['Zahreh', 'Flowers — and, in the old tongue, the name for a city’s rich and noble. The flowers of the garden still heal.'],
];

/* ================================================================
   additions: lanterns, lore stones, more creatures, Rokarvac II
   ================================================================ */
SPEAKERS.stone = { name: 'Carved Stone', color: '#d9b87a', sub: 'an inscription' };

export const CODEX_MORE = [
  ['Beuhk', 'A farming town of acorn-cap cottages, fields of Ju, and a windmill that never stops. Torcain grew up here, after Buhkon found him.'],
  ['Buhkon Eldi', 'The Carpenter. He builds ships, sheds and cradles, and once mended a boy who fell across Eternal Space. Torcain’s first Aagac came from his hands.'],
  ['Training dummy', 'Straw, sacking and a turnip for a head. Buhkon has a great deal of straw.'],
  ['Xikia', 'Second largest of the three Tatu, with nine continents. Beuhk is on Xikia — and so, a long and dangerous walk away, is Aakalay.'],
  ['Leotik', 'Smallest of the Mbaru Tatu: six and a half continents, mostly unexplored, and home to an absurd number of poisonous and venomous things.'],
  ['Venkin', 'A young Keilia from a family of builders in Beuhk, a few years younger than Torcain, and hopelessly obsessed with the token game.'],
  ['Keilia', 'Builders without equal. The Kalo make their hammers; a Keilia who takes a hammer to war is banished, so Keilia weapons are passable at best.'],
  ['Nur’Hlyst', 'Perception through the Hurst: a golden pulse that makes hidden things answer. Buhkon taught it to Torcain. (G)'],
  ['Sniller amulets', 'A large round gem between two curved horns, cold teal. Snillers were cursed into them when the Angels left. They hum toward old memory vaults.'],
  ['Dya’Akara', 'The token game of the Mbaru Tatu. Each token holds the truth of one creature — one individual, not the kind — sung into stygian with an Okid’Relic. Thrown, it unfolds into that creature’s likeness, which can touch nothing living. Pulses bring Fti, Su, Eldi and Ular to ready your tokens; carry the rival’s Relic home to win.'],
  ['Kofi Galta', 'A crescent-shaped little thing with blade-like spines and a fluffy dark tail. Breeds like bunnies, found everywhere, eaten by basically everything — so it runs from basically everything.'],
  ['Nur Lantern', 'Phorus can wake a Nur-light in an old lantern. Rest beside one to heal, refill the Albali film, and spend zikhron shards to strengthen your Hurst. Resting wakes the wilds again.'],
  ['Zikhron shards', 'Splinters of memory that fall from whatever you defeat. A Nur Lantern can sing them into you.'],
  ['Albali film', 'The healing film from an Albali Byrd’s horn, kept in vials. It stings, but it closes wounds and burns out poison. (R)'],
  ['Rodak', 'Dark, oily, lean and tall, all the same size. Scavengers that follow things expecting an aftermath. They keep their distance — until you are hurt, or until you strike one.'],
  ['Kipsu', 'Weasel face, fox ears, big paws and a very fluffy tail, with glowing patterns all their own. The small ones love trouble — and your shards. Catch the thief to get them back.'],
  ['Albali Byrd', 'Five horns coated in a healing film that stings so badly it paralyses. On Leotik a poison has turned the film toxic. They circle high; strike them when they dive.'],
  ['Duskareth Vel', 'Eikar of the Duskareth who train to throw objects out of the Duat with precision. Watch for knives appearing in the air around you.'],
  ['Tyndael', 'Tynde — spark; Ael — fire. A hovering ball of flame on orange-to-violet wings, its crown of fire growing with its heat. Its legs never touch the ground, and its breath leaves the ground burning.'],
  ['Sru Vorn', 'Long, low and heavy, with matted fur armour, tusks, a spiked ball tail and acid saliva. Its acid pits are farmed like fields.'],
  ['Klug Pillars', 'Great pillars of stygian in the keep on Leotik, each carved with the word "Klug". They feel like many Relics, cores and a grow-forge all at once. Nobody knows what they are for.'],
  ['The Urverk', 'A portal. Each has a trigger, and most triggers are lost — but a memory core can still hold one. Kiet’s opened the Urverk beneath the Oath Stone to Leotik.'],
];

export const STONES = {
  x_square: ['A brass plate on the fountain:', '"XILIA — come in, sit down, have you eaten?"'],
  x_yard: ['Burned into a beam over the workshop door:', '"Buhkon Eldi, Carpenter. Ships, sheds, cradles, and lost boys mended."'],
  x_hideout: ['Scratched into a tree by the hideout, in a Duskareth hand:', '"The Duat is closer here. It is closer everywhere, lately."'],
  a_gate: ['Carved over the gate, worn almost smooth:', '"AAKALAY — WHERE EVERY OATH IS KEPT."', 'Someone has scratched beneath it, much later: "by force."'],
  a_library: ['A shelf-plaque from the library:', '"Memory stores are for recalling history accurately. Dwellers may use them for travel. Do not drink from the cistern — it remembers."'],
  a_tower: ['A watchman’s tally, gouged into the stone.', 'Hundreds of marks. The last row is only half finished.'],
  a_grove: ['Pinned to the fire tree’s root with a smith’s nail:', '"Fire trees are never harmed by fire. Their seeds are. Ask any shipwright."'],
  a_plaza: ['A list of names around the dais, each one sworn.', 'Many have been struck through. A few have been struck through and then — very carefully — written in again.'],
  l_villtur: ['Villtur stone, carved in an older hand:', '"What lives here was here first. Build quietly."'],
  l_bogs: ['A warning post, half dissolved:', '"DON’T STEP IN THE BOGS. That’s the whole trick to a Sru Vorn hunt. The pits are farmed, same as a field of Ju."'],
  l_roost: ['Scratched on a fallen stone beneath the nests:', '"The byrds’ film went green this season. It doesn’t heal anymore. It just hurts."'],
  l_keep: ['On the keep’s threshold, in a hand you almost recognise:', '"Five cores, three pillars, one door. Do keep up, little Eikar."'],
};

export const DIALOG2 = {
  setSail: [
    ['torcain', '"Follow the Punk with a lord in its head, to the isle where the Urverk wakes the dead."'],
    ['phorus', 'Leotik. Of course it’s Leotik. A whole Tatu where everything is either poisonous, venomous, or both.'],
    ['torcain', 'Kiet’s trigger opens this Urverk onto Leotik. I sent word to Beuhk when we found the cores. Venkin answered.'],
    ['venkin', 'Of course I answered. Duro’s bringing his cauldron, Hemla’s bringing everything else. Somebody has to build you a camp on the other side.'],
    ['phorus', 'Venkin! How did you —'],
    ['venkin', 'Three days hiking, two on wild Punks. I hear you know the way.'],
  ],
  urverkCards: [
    'Torcain speaks Kiet’s trigger, and the Urverk under the Oath Stone opens like an eye.',
    'The cold of the Duat. Apparitions on every side. Nobody looks at them for long.',
    'And then rain — warm, heavy rain, on a Tatu none of you has ever stood on.',
    'Behind you, the Urverk closes. It does not open again.',
  ],
  firstLantern: [
    ['phorus', 'Hold on — this old lantern still has a wick of Nur in it. Let me wake it.'],
    ['phorus', 'There. Rest here and I can pull the shards you’ve gathered into your Hurst. And it’ll be where I drag you back to, if you fall.'],
    ['torcain', 'Comforting.'],
  ],
  arriveLeotik: [
    ['phorus', 'Leotik. Smell that? Rot and rain and something sweet that’s definitely poisonous.'],
    ['venkin', 'And the Urverk’s shut behind us. Stranded, then. Fine. I’ll put the camp up by the ruins — south, by the old dock.'],
    ['torcain', 'The Punk came here. I can almost feel the lord’s memory in the air.'],
    ['phorus', 'That’s the Urverk you’re feeling. There’s a keep to the north — and three big pieces of stygian singing louder than anything in Aakalay.'],
    ['phorus', 'Pillars. One in the bogs to the west, one in the ruins of Villtur to the east, one up on the byrd roost. The Punk is hiding behind all three of them.'],
    ['torcain', 'Then we wake the pillars.'],
    ['phorus', 'And try very hard not to step in anything green.'],
    ['phorus', 'If the Punk opens the keep’s Urverk, it might be our way home, too.'],
  ],
  pillarWoken: [
    ['phorus', 'It’s awake — feel that? It’s reaching toward the keep.'],
  ],
  allPillars: [
    ['phorus', 'All three. The keep is humming like a struck bell. Whatever’s in there knows we’re coming.'],
  ],
  sruvorn: [
    ['phorus', 'Sru Vorn! Don’t stand behind it — that tail — and don’t stand in front of it either!'],
  ],
  lordRise: [
    ['phorus', 'The Urverk — it’s opening! And look — the Malsti Punk. The little one from the memory. It’s been hiding in the keep.'],
    ['torcain', 'It isn’t doing anything. It’s scared.'],
    ['phorus', 'The Urverk wakes the dead, Torcain. It’s pulling his memory out of the poor thing’s stem — and pouring it into the stygian.'],
    ['memory', 'The pillars’ stygian runs like wax and stands up. Tall as a door, one eye, scales of black iron. Otlið, Master of the Keep — woken.'],
    ['phorus', 'Same duel, Torcain. Different century. Finish what Kiet started!'],
  ],
  lordHalf: [
    ['phorus', 'He’s pulling more stygian from the Urverk — watch the floor, and stay out of his oath-rings!'],
  ],
  lordDown: [
    ['torcain', 'It’s over. He’s just iron again.'],
    ['phorus', 'And look who’s free. The Malsti Punk — bouncing off the walls. Causing chaos. As is traditional.'],
    ['torcain', 'Go on, little one. Nobody’s carrying anybody’s oaths anymore.'],
    ['noka', 'Well, well. The little Eikar with the borrowed name keeps his promises after all.'],
    ['phorus', 'Noka?!'],
    ['noka', 'The door is open, children. It leads where all old roads lead. I shall be at the top of it, waiting — riddles ready.'],
  ],
};

export const LEOTIK_OBJ = {
  pillars: n => `Wake the three Klug pillars (${n}/3)`,
  keep: 'Go to the Urverk in the keep to the north',
  boss: 'Cut the lord of Aakalay out of the Malsti Lord',
  done: 'Rokarvac II complete',
};

export const ENDING2 = [
  'Through the Urverk, the light is a colour that has no name in Dearcineon.',
  'Phorus takes one step, and then another, and does not let go of your arm.',
  'Somewhere at the top of everything, an old voice is laughing.',
];

export const NEXT_RIDDLE2 = [
  'Up the old road where the mountains are made,',
  'past the iron that sings and the iron that’s weighed —',
  'the peak that is me is the peak that is not.',
  'Come find what the Duat forgot that it forgot.',
];

/* ================================================================
   the bestiary: what Torcain learns about each creature he hunts
   ================================================================ */
export const BEASTS = {
  punk: ['Wild Punk', 'Smaller and quicker than their herd cousins. No eyes, no mouth — just a rind and the vines that grow from the top, legs and arms both. They wind the vines up before they lash — watch for it, step aside, punish.'],
  punk_d: ['Domestic Punk', 'Horse-sized to elephant-sized, saddle-blanketed, and a little dim. Ruut’s herd walks on its vines. They’ll only fight if you start it.'],
  malsti: ['Malsti Punk', 'Hand-sized Punks from Duat Seedlings. Not aggressive — they love chaos, and your shards. The cracks in their rind only glow when they blink through the Duat.'],
  rodak: ['Rodak', 'Lean, tall, wolf-like, short oily fur and a long thin tail. Yellow slit eyes — or black. They travel in threes and keep their distance until they smell blood. Then they come all at once. Fell one and the rest of the pack is gone.'],
  kipsu: ['Kipsu (wild)', 'Thieves. A wild Kipsu will snatch your shards and bolt. Catch it before it gets away and you get them back.'],
  kipsu_f: ['Kipsu (tame)', 'Fluffy, curious and fond of petals. They shed fluff if you give them a scratch.'],
  albali: ['Albali Byrd', 'Round, dog-sized, wide-winged, one retractable bone-white horn with a wet sheen. Each one falls as a fruit from an Albali Aagac. Villtur (wild) ones wait, then dive — strike while they’re low.'],
  tyndael: ['Tyndael', 'A flying creature made entirely of flame. It keeps its distance and throws fire that keeps burning on the ground. Don’t stand in it.'],
  vel: ['Duskareth Vel', 'Duat-walkers who throw knives out of thin air. They stagger badly when hit hard.'],
  sruvorn: ['Sru Vorn', 'Two tusks, dense hair, a mace-ball tail, and it walks high like a hunting lizard. Big as a large horse and still growing. Never stand in front of it. Or behind it.'],
  kofi: ['Kofi', 'A cat-sized ball of hair with two horns and a lot of tiny legs, whiskers streaming off its back. No ears. It scurries from everything, because everything eats it.'],
  skorthal: ['Skor’Thal', 'The great old Punk of Aakalay. Its cut stem shows its rings, and patterns glow under a scarred, vine-choked rind. It harms no one. Few have ever found it.'],
};
/* hunt this many of a kind and Torcain has "studied" it: +15% damage against it */
export const STUDY_AT = { vel: 3, sruvorn: 1 };
export const STUDY_DEFAULT = 10;

export const SKORTHAL = {
  sit: [
    ['torcain', '(You sit down in the moss, an arm’s length from the biggest Punk you have ever seen. It doesn’t move.)'],
    ['memory', 'Its stem was cut, long ago — you can count the rings. Hundreds. Under the scarred rind, slow patterns glow and fade like breathing.'],
    ['torcain', '(A vine uncurls from the top of it, slow as a sunrise, and settles across your knees. Wound into it, grown right through, is a ring.)'],
    ['phorus', 'Don’t move. …It’s giving it to you. The lord’s oath-ring. It carried that for a hundred years and it’s giving it to you.'],
    ['memory', 'A curl of rind falls beside you. The vine slides back. Skor’Thal settles deeper into the moss, and goes on being old.'],
  ],
};

export const JOURNAL = {
  page_1: ['A torn page, the ink still faintly warm:', '"The stone wants more every season. First oaths. Then names. Last week it took Ilva’s memory of her own mother. She smiled and didn’t know why she was crying."'],
  page_2: ['Another page, in the same tight hand:', '"The lord says the stone keeps us safe. Safe from what, I asked. He couldn’t remember. I don’t think he can remember anything that isn’t a promise."'],
  page_3: ['The writing gets faster here:', '"We are leaving tonight. All of us who still remember why. We will not swear anything to anyone ever again. Not even to come back."'],
  page_4: ['The last page, smeared with something green:', '"The old herd-Punk took the lord’s ring when it fell and wandered north with it. It grows every year now. The old folk call it Skor’Thal. It scars the trees where it rubs. Leave it be. Leave all of it."'],
};

/* ================================================================
   the Sunear'Zikhron — the Waves of Memory — and what lives in its eye.
   Every prophecy is true: each one points at something that happens.
   ================================================================ */
export const SUNEAR = {
  arrive: [
    'The Sunear’Zikhron. Waves of memory, Torcain. It has to touch every inch of a Tatu before it moves on, and today it’s touching us.',
    'Feel that? The storm’s here. The Kalo read every wave that passes. Let me listen.',
    'Memory weather. Don’t be frightened of the people you see in it. They’re only remembering.',
  ],
  eye: 'There — the eye. A column of quiet. If we find it and keep pace with it, what lives there gives a true prophecy. The only true one there is.',
  echo: ['They walked here once. The storm remembers them for us.', 'Don’t wave. They can’t see you. Probably.'],
  mcfly: 'RubberMcFly — glowing! They only glow in the storm. The more of them play in it, the stronger it blows.',
  lost: 'We lost it. Keep up with the eye — it doesn’t wait.',
  passed: 'It’s moving on. Through the Duat, to the next Tatu. It’ll be back.',
  after: ['That voice… That wasn’t Noka. Was it?', 'A true prophecy. Write it in the Rokarvac. Every word.', 'The eye only ever tells the truth. It just doesn’t tell you when.'],
};
export const PROPHECY = {
  xilia: [
    'A seed that remembers fire will carry you past the mist. The ash will know your name before you know its.',
    'Three days on foot and two on the backs of things that want to eat you. You will not mind. You will remember it fondly.',
    'The Carpenter built you a cradle once. He will build you a road home, and you will not see him do it.',
  ],
  aakalay: [
    'Five voices sleep in the dust of an oath. Wake them, and the stone that drinks oaths will drink yours.',
    'You will wear another’s hands, and with them you will end a Master who is not finished ending.',
    'The tree that grew where he fell is dark. Dark is not the same as dead.',
    'A small thing with a lord in its head will run. Follow it and you will reach an isle that wakes the dead.',
  ],
  leotik: [
    'Three stones of Ular are sleeping. Each will wake for a song only you can carry to it.',
    'The Master will rise in stolen iron, and the frightened thing that carried him will go free.',
    'Up the old road where mountains are made, a peak that is not a peak is waiting for you.',
  ],
};
export const SHURGREDAN = {
  warn: ['Torcain. What did you do. That was a RubberMcFly — the most perfect thing that flies.', 'The sky’s gone quiet. The ShurgrEdan will answer before the day is out. They always answer.'],
  strike: 'THE SHURGREDAN ANSWERS.',
  after: 'Some rules aren’t written down anywhere, Torcain. They don’t need to be.',
};
export const CODEX_LORE = [
  ['The Sunear’Zikhron', 'Sunear means waves; zikhron, memory. A storm that has always existed and never been weak. It must touch every inch of a Tatu before it passes through the Duat to the next. The Kalo read what each wave brings. Find its eye and keep pace with it, and what lives there gives a true prophecy.'],
  ['RubberMcFly', 'A small, round, winged creature, considered the most perfect of all. It never fights. It is among the only things that can fly in the Sunear’Zikhron, and the storm is the only time it glows.'],
  ['The ShurgrEdan', 'Kill a RubberMcFly and the ShurgrEdan will answer before the day is out: a claw of light out of a quiet sky. It cannot be blocked or turned aside.'],
  ['The Megla Pass', 'Megla means mist. The old road over the ridge between Beuhk and the Ashen Reach tops out in a mist that never quite lifts. Three days on foot, two on a Punk.'],
  ['Eldi · Fti · Su · Ular', 'In Dearcineon the four elements are also the four directions: Eldi is fire and the west, Fti air and the north, Su water and the south, Ular earth and the east. The waymarkers on the old roads still use them.'],
];


/* ================================================================
   THE TRUE BEGINNING — Velki, year 307A, the last Skyfall.
   Tanoc Filugani is thirteen. He wants to be an Ahoac. He climbs a
   spire in Fyrsti'Vilag to watch the Angels and the Snillers fight,
   walks out of the gate toward it of his own accord, and is caught
   in it — and wakes on Xikia, in front of the Carpenter's stall.
   ================================================================ */
SPEAKERS.tanoc = { name: 'Tanoc', color: '#e0b080', sub: 'Tanoc Filugani · Eikar, thirteen' };
SPEAKERS.tale = { name: 'Rokarvac', color: '#e8d8a8', sub: 'as it is written' };
SPEAKERS.xwi = { name: 'Xwi', color: '#fff3c8', sub: 'an Angel' };
SPEAKERS.guard = { name: 'Gate warden', color: '#d8c090', sub: 'Fyrsti’Vilag, Velki' };
SPEAKERS.ahoac = { name: 'Ahoac', color: '#ffb46a', sub: 'a Firefall catcher' };

export const PROLOGUE = {
  kicker: "Torcain's Run · The Beginning",
  title: 'The Last Skyfall',
  cards: [
    'Before Torcain, there was Tanoc.',
    'Velki, in the year 307A. The sun is going down over Fyrsti’Vilag, and the sky is on fire for the last time.',
    'Up there, the Xwi — the Angels — are at war with the Snillers. They have been at war through every Skyfall anyone can remember.',
    'Tanoc Filugani is thirteen. He wants to be an Ahoac, one of the armoured acrobats who catch the Firefall before it lands.',
    'He is curious. He is reckless. And he is not going to watch the last Skyfall from the street.',
  ],
  start: [
    ['tanoc', 'Everyone’s on the rooftops. That’s no good — you can’t see anything past the wall from a roof.'],
    ['tanoc', 'The spire, though. Nobody’s allowed up the spire. Which means nobody will be up there.'],
  ],
  barks: [
    'Up, up, up. Don’t look down. …I looked down.',
    'The Ahoac crews do this in armour. Uphill. Under fire.',
    'Nearly there. I can hear it from here.',
  ],
  top: [
    ['tale', 'From the top of the spire, the whole of Fyrsti’Vilag falls away, and the battle is right there past the north gate.'],
    ['tale', 'The Angels burn white and gold. The Snillers are cold teal, a great gem between two curved horns and a shape behind it that will not sit still in the light.'],
    ['tale', 'Neither of them stays put. They blink in and out of the world — here, gone, there — and wherever they have been, the air keeps sparking.'],
    ['tanoc', 'The Ahoac are going out the north gate. They’re going to catch it. They’re actually going to catch it.'],
    ['tanoc', 'If I’m ever going to be one of them, I have to see it up close. Not from up here.'],
  ],
  guard: [
    ['guard', 'Filugani. Of course it’s you. The gate’s open for the Ahoac crews, not for boys in borrowed boots.'],
    ['tanoc', 'I’m not going to touch anything. I just want to see.'],
    ['guard', 'Everybody just wants to see. Stay this side of the wall, and you’ll live to tell your mother you saw it.'],
  ],
  ahoac: [
    ['ahoac', 'Out of the road, little Eik! If it sparks near you, you drop flat. You hear me? FLAT.'],
  ],
  outside: [
    'The air outside the wall tastes like a struck bell.',
    'Somewhere, a spark goes off where nothing was. Then another, closer.',
    'Closer. Just a little closer.',
  ],
  caught: [
    'The air in front of you tears open.',
    'Everything goes white.',
    'Silence.',
  ],
};

/* Xikia, a breath later — and a whole Tatu away */
export const ARRIVAL = {
  cards: [
    'Light, and noise, and a smell of bread.',
    'It was nearly sunset on Velki. It is midday here.',
  ],
  wake: [
    ['tanoc', '…the sun was going down. It was nearly dark. Why is it — where —'],
    ['buhkon', 'Easy. Easy, now. Inside, quick, before the whole market gets a look at you.'],
    ['tale', 'A big Eikar with sawdust in his beard pulls you behind the stall’s awning. A few faces in the square turn, and stare, and look away again — not quickly enough.'],
    ['tanoc', 'My hat. Where’s my hat? I can’t — everything’s — I can’t think —'],
    ['buhkon', 'I know. I know. Hold still. Here.'],
    ['tale', 'He sets an Aagac on your head — not yours, but warm, with stygian threaded through its veins like roots. It settles.'],
    ['tale', 'And the world comes into focus all at once.'],
  ],
  focus: [
    ['tanoc', 'That’s… that’s Velki. In the sky. Why is Velki in the sky?'],
    ['buhkon', 'Because you’re on Xikia, little Eikar. A long way from home. My name is Buhkon Eldi. I’m a carpenter.'],
    ['tanoc', 'Tanoc. Tanoc Filugani. I was outside the gate. There was a spark, and then —'],
    ['buhkon', 'And then here. Yes. I know what happened to you, Tanoc. I’ll tell you when there’s time. There isn’t now.'],
    ['buhkon', 'Help me pack the stall. Something followed you through, and I would like very much to be gone before it finds its feet.'],
  ],
  materialize: [
    ['tale', 'The air over the square cracks like ice. An Angel and a Sniller come through together, still locked in their fight — and the shockwave knocks the hat clean off your head.'],
  ],
  freeze: [
    ['tale', 'And everything stops.'],
    ['tale', 'The Angel and the Sniller hang in the air, and the whole square holds its breath, and both of them are looking at you.'],
    ['tale', 'Up close, the Sniller is enormous. Nobody has ever seen one whole before — not like this, not standing still.'],
    ['buhkon', 'Tanoc. Your hat. Now.'],
  ],
  hatBack: [
    ['xwi', 'There. You see it too.'],
    ['xwi', 'Then it is done. We must go, and we will not come again. No Skyfall will follow this one.'],
    ['xwi', 'And you — sleep in the stone, every one of you, until you are needed.'],
    ['tale', 'The Sniller folds in on itself with a sound like a bell under water, and is gone. Where it hung, something small and teal clatters onto the cobbles. Then another. Then a rain of them.'],
    ['tale', 'Across the sky, one by one, the Angels go out like lamps.'],
    ['tale', 'And then the market screams.'],
  ],
  bag: [
    ['buhkon', 'Here — take this. It’s Relic-bound: it holds what you put in it and won’t let go for anyone else.'],
    ['buhkon', 'Those things that fell are Sniller amulets. Gather as many as you can before somebody who shouldn’t have them does.'],
    ['buhkon', 'Some will be on the ground. Some will be up on the roofs, or stuck fast in a wall. Climb if you have to. Be quick.'],
    ['buhkon', 'And take my hatchet. Blunt side out. Things are going to be frightened.'],
  ],
  punk: [
    ['tanoc', 'A Punk! A little one — it’s gone wild with all the noise!'],
    ['buhkon', 'It’s frightened, not wicked. Knock the fight out of it — don’t kill it.'],
  ],
  calmed: [
    ['tale', 'The little Punk sags, vines limp, and stops fighting. For a long moment it just sits there with its rind against your boot.'],
    ['tale', 'Then it scrambles off between the stalls. You have the strangest feeling it hasn’t gone far.'],
  ],
  called: [
    ['buhkon', 'Tanoc! That’s enough — leave the rest. We go. Now.'],
    ['tanoc', 'Go where?'],
    ['buhkon', 'Home. My yard, across town by the docks road — yours too, if you want it. Shutters closed, and I’ll tell you everything I can.'],
  ],
  amuletSay: n => n === 1 ? 'Cold. It hums, like it’s listening.' : n === 3 ? 'They’re all humming the same note.' : n === 5 ? 'One more… there was one up high.' : '',
  /* home with the Carpenter */
  home: [
    'They leave the square in the chaos, and nobody stops them. A small Punk follows a little way behind, and thinks it isn’t seen.',
    'The Carpenter’s yard, across town by the docks road. Shutters closed. Soup. A bed in the loft that smells of cedar shavings.',
    'Tanoc sleeps for a day and a night.',
  ],
};

export const PRO_OBJ = {
  spire: 'Climb the spire to watch the last Skyfall',
  gate: 'Go out the north gate, toward the battle',
  hat: 'Put your hat back on',
  amulets: n => `Gather the fallen Sniller amulets (${n}/6)`,
  punk: 'Calm the frightened Punk — don’t kill it',
  back: 'Run back to the Carpenter’s stall',
};

/* Chapter I — the Carpenter's apprentice. Young Tanoc in Beuhk, before any of the rest. */
export const YOUNG = {
  kicker: "Tanoc · Chapter I",
  title: "The Carpenter’s Apprentice",
  morning: [
    ['tale', 'Morning. There is bread and a pot of something warm on the table, and nobody at it. Hammering, from the workshop.'],
    ['tanoc', 'The sky’s still wrong. Velki just… hanging there.'],
    ['tanoc', 'I’m not sitting in a loft all day. Let’s see where I am.'],
  ],
  relicSpot: 'Something blue is glinting in the mud by the lakeshore.',
  relicTaken: [
    ['tale', 'A smooth grey stone, warm in your hand. Blue light moves under its skin like a slow pulse — and for a moment, you are certain it is looking back.'],
    ['tanoc', 'It’s humming. Buhkon will know what it is.'],
  ],
  relicBuhkon: [
    ['buhkon', 'Up and about, then. Good. What’s that you’ve — ah.'],
    ['buhkon', 'Let me see. …Tanoc. Did it call to you, or did you just find it?'],
    ['tanoc', 'I… don’t know. It was glinting. And then it was humming. Is that calling?'],
    ['buhkon', 'It might be. That’s a Relic. There’s a Hurst in it — a soul that’s settled in for a long, quiet life. This one keeps you on your feet: a little less tired, a little less hungry.'],
    ['buhkon', 'Most folk carry a few. Few folk ever hear one hum. Keep it.'],
    ['buhkon', 'And since you can hear them — let me show you how to listen properly. Close your eyes. Listen with your Hurst, not your ears. And push.'],
  ],
  hlyst: [
    ['tale', 'A golden pulse rolls out of you, across the yard, the lake, the rooftops — and the world lights up. Things answer: chests, ore, the cold teal of a Sniller amulet somewhere far off.'],
    ['buhkon', 'That’s Nur’Hlyst. Press G, whenever you like. Hidden things will answer you.'],
    ['buhkon', 'Now. Ahoac, you said? Catchers of the Firefall. Let’s see what those hands can do. The straw dummies, there — knock all three down. Blunt side.'],
  ],
  dummies: [
    ['buhkon', 'Hah! Quick feet, heavy hands. Not bad at all.'],
    ['buhkon', 'An Ahoac has to fall well, too. Climb the tower, jump, and HOLD Space as you fall. Arms out — let the wind take you.'],
  ],
  glided: [
    ['buhkon', 'Like a seed on the wind! Come back down and talk to me.'],
  ],
  end: [
    ['buhkon', 'That’s enough for one day. You’ll stay — for as long as you want to. There’s a lot to learn, and I’d rather you learned it here than out there.'],
    ['tanoc', 'Buhkon… the Angels. The Sniller. They all looked at me. Why?'],
    ['buhkon', 'Because of what you are. And that is a long story, and you have a long time to hear it.'],
    ['buhkon', 'For now: the town’s yours. Meet people. Help where you can. Keep those amulets close — and keep your hat on.'],
  ],
  stryx: [['stryx', 'An Eikar boy with somebody else’s hat. Not a passenger. Come back when you have a name of your own.']],
  buhkonIdle: [
    'Explore. Help folk. Keep your hat on.',
    'That tower will hold books one day. Yours, maybe.',
    'The Relic still humming? Good. Talk to it. They like that.',
    'Sniller amulets wander. Use your Nur’Hlyst — they glow cold teal.',
  ],
  pass: 'Rockfall across the Megla Pass — and Buhkon said three days of mist past it. Not today.',
  chapterEnd: 'Chapter I ends here — more of Tanoc’s story is coming. Until then, Beuhk is yours.',
};
export const YOUNG_OBJ = {
  explore: 'Step outside and look around',
  relic: 'Something blue is glinting at the lakeshore, down by the old dock',
  bring: 'Bring the humming stone to Buhkon, up at the house',
  dummies: n => `Knock down Buhkon’s straw dummies (${n}/3)`,
  glide: 'Climb the tower, jump, and hold Space to glide',
  back: 'Return to Buhkon',
  free: 'Chapter I — Beuhk is yours. More of Tanoc’s story is coming.',
};

/* ================================================================
   THE ROAD NORTH — from Fyrsti'Vilag on Xikia, six days to Beuhk
   and the Carpenter's hill beyond it.
   ================================================================ */
SPEAKERS.hurst = { name: 'The Hurst', color: '#ff9a4a', sub: 'in the fire-stone' };
SPEAKERS.punk = { name: 'The Punk', color: '#9ad86a', sub: 'young, and following' };
SPEAKERS.folk = { name: 'Beuhk folk', color: '#e8d8a8', sub: 'overheard' };

export const ROAD = {
  /* the market scene now happens in Fyrsti'Vilag, Xikia's own city of that name */
  loc: ['Fyrsti’Vilag', 'Xikia · midday · a whole Tatu from home'],
  wakeExtra: [
    ['tanoc', 'But where is this? It looks like home. It looks almost like home.'],
    ['buhkon', 'Fyrsti’Vilag — Xikia’s Fyrsti’Vilag. Same name as your city, other Tatu. Yours is up there, in the sky.'],
  ],
  leave: [
    'They slip out of the north gate in the chaos, the Carpenter’s cart half-packed, and nobody stops them.',
    'Behind them, Fyrsti’Vilag is still screaming. Ahead: the road north.',
  ],
  day1: {
    cards: ['Day one.', 'The low country north of the city: farms, hedges, the road running pale between them.'],
    talk: [
      ['buhkon', 'You walk like an Ahoac. Light on the front of your feet.'],
      ['tanoc', 'I was going to be one. I was going to catch the Firefall.'],
      ['buhkon', '“Was.” You’re thirteen. Nothing is “was” at thirteen.'],
    ],
    barks: [
      ['buhkon', 'Six days to my home. Five if you stop asking if we’re nearly there.'],
      ['tanoc', 'Are we nearly there?'],
      ['buhkon', 'Kofi Galta! Look — on the road. Everything eats those, so they run from everything.'],
      ['buhkon', 'We camp at the hedge-oak. Up ahead, where the road bends.'],
    ],
    camp: [
      ['tale', 'Evening. A fire under an old hedge-oak. The Carpenter takes a smooth grey skipping-stone out of his pocket and turns it over in his fingers.'],
      ['buhkon', 'This is a Relic. Stygian, worked thin, with a Hurst inside — a soul, settled in. This one’s a little fire-rat from under the Eldi Aagac. Warm and chatty.'],
      ['buhkon', 'Every Relic has a trigger. Do the right thing and it answers. Do the wrong thing and it sits there being a rock.'],
      ['buhkon', 'Here’s a deal. Work out this one’s trigger before we reach the next town, and it’s yours.'],
      ['tanoc', 'That’s it? That’s the whole lesson?'],
      ['buhkon', 'Listening is the whole lesson. Goodnight.'],
    ],
    stoneMenu: 'The fire-stone sits warm in your palm. A thumb-shaped dip in the top. What do you try?',
    press: [['tale', 'You press your thumb into the dip. It’s warm. Nothing else happens. Somewhere in the stone, something snickers.']],
    talkTo: [
      ['tanoc', '…Hello? Are you in there?'],
      ['hurst', 'chk-chk! Warm hands. Good hands. Bored. So bored. Want to THROW something.'],
      ['hurst', 'Little thing. On the dip. Little thing goes FAST.'],
    ],
    noPebble: [['tanoc', 'A little thing on the dip… I need a pebble. There were some by the fire.']],
    trigger: [
      ['tale', 'You set a pebble in the dip. The stone shivers — and the pebble leaves your hand in a streak of flame and smacks into the oak.'],
      ['hurst', 'YES! Again! Again again again!'],
      ['tanoc', 'Buhkon! Buhkon, I did it — the pebble — it —'],
      ['tale', 'The Carpenter doesn’t open his eyes. But the corner of his mouth moves.'],
      ['tale', 'The flame never touched you. The Hurst decided it wouldn’t.'],
    ],
  },
  day2: {
    cards: ['Day two.', 'The road climbs into the forest. Dense, green, and old.'],
    send: [
      ['buhkon', 'We’ll eat better if one of us hunts. Not me — I’m old and I’m comfortable.'],
      ['buhkon', 'There are Kofi Galta all through these woods. Bring one back. And don’t go further than you can still see the smoke.'],
    ],
    caught: [['tanoc', 'Got one! It’s — oh. It’s much smaller up close.']],
    reveal: [
      ['tale', 'Something rustles in the ferns behind you. Something that has been following you for two days and thinks it hasn’t been seen.'],
      ['tale', 'The little Punk from the market. Vines down, rind scuffed, very pleased with itself.'],
      ['tanoc', 'You. You followed us all the way from the city?'],
      ['punk', '(It bumps its rind against your knee. Yes. Obviously.)'],
      ['tanoc', 'You need a name, then.'],
    ],
    back: [
      ['tanoc', 'Buhkon — I got a Kofi. And… a Punk got me.'],
      ['buhkon', 'Mm. I know. It’s been eating our scraps since the city.'],
      ['buhkon', 'Well. Three of us, then.'],
    ],
  },
  day3: {
    cards: ['Day three.', 'Rain in the forest. They wait it out at the camp, and the Carpenter talks.'],
    talk: [
      ['buhkon', 'You want to know what happened to you. I’ll give you the pieces I have.'],
      ['buhkon', 'Zikhron is memory. Not the kind in your head — the kind that soaks into things. Stone remembers. Stygian remembers best of all.'],
      ['buhkon', 'Stygian is soul-iron. Relics are made of it, and memory cores, and your hat — the veins in an Aagac are stygian. That’s why you couldn’t think without one.'],
      ['buhkon', 'There are people who want stygian more than anything. The Duskareth, who walk the Duat. The SkarValorin, who forge. The Elsha’ryn, who keep memory.'],
      ['buhkon', 'The Skaar Uverkhron, all three of them. You’ll hear those names again. When you do — keep your hat on and your mouth shut.'],
      ['tanoc', 'And the Angels? Why did they look at me?'],
      ['buhkon', 'That piece I’ll give you when you’re older. It’s a heavy one.'],
    ],
  },
  day4: {
    cards: ['Day four.', 'The mountain pass. Thin air, loose stone, and too many shadows keeping pace on the ridge.'],
    warn: [
      ['buhkon', 'Rodak. They’ve been following since the treeline — waiting for one of us to get hurt.'],
      ['buhkon', 'They won’t wait anymore. Back to back, Tanoc. Hatchet up.'],
    ],
    won: [
      ['buhkon', 'Fell one and the rest of the pack goes. Rodak never stay to bury their own.'],
      ['buhkon', 'You did well. Your Punk did better.'],
    ],
  },
  day5: {
    cards: ['Day five.', 'Down out of the pass, and into a town.'],
    loc: ['Beuhk', 'Xikia · the town before the Carpenter’s hill'],
    rest: [
      ['buhkon', 'Beuhk. We rest here tonight. Hot food, a real roof.'],
      ['buhkon', 'Keep your hat on, keep your ears open. People talk, after a day like that one.'],
    ],
    whispers: [
      ['folk', '…gone, all of them. The Angels. Not a Skyfall since, and they say there won’t ever be another.'],
      ['folk', '…my cousin swears the amulets hum at night. Like they’re listening for something.'],
      ['folk', '…the old prophecy, the one about the boy who fell —'],
      ['folk', '…an Eikar child with no hat, right in front of a market stall, in Fyrsti’Vilag. Brown as an acorn, they said. Thirteen, maybe.'],
    ],
    heard: [['tanoc', '(…they’re talking about me.)'], ['buhkon', 'They are. Which is why we leave at first light.']],
  },
  day6: {
    cards: ['Day six.', 'The last of it: out of town by the little road, west and up.'],
    obj: 'Follow the little road west out of Beuhk to the Carpenter’s hill',
    crest: [
      'Tanoc crests the hill.',
      'A big house and a workshop at the top. A barn. A tower. Fenced fields, and a lake below, shining all the way to a dark forest on the far shore.',
      'Mountains to the west and south. Big sky over all of it.',
      'Home, the Carpenter says, as if it were nothing at all.',
    ],
  },
  /* objectives for the road */
  obj: {
    day1: 'Walk north with the Carpenter to the hedge-oak camp',
    stone: 'Find the fire-stone’s trigger',
    pebble: 'Pick up a pebble by the fire',
    hunt: 'Hunt a Kofi Galta in the forest — stay in sight of the smoke',
    back: 'Bring it back to the camp',
    day4: 'Cross the mountain pass',
    rodak: n => `Drive off the Rodak (${n} left)`,
    day5: 'Rest in Beuhk — and listen',
    meet: 'Find the Carpenter by the town hearth',
  },
};

/* ================================================================
   TANOC'S FIRST ARC — Chapter I onward, task by task.
   Years 1–4 in snapshots, then Year 5 and the fake finale.
   ================================================================ */
SPEAKERS.venkin_y = { name: 'Venkin', color: '#e0b070', sub: 'Keilia, builder’s kid, token-mad' };
SPEAKERS.sniller = { name: 'The Sniller', color: '#6af0e0', sub: 'in the amulet' };
SPEAKERS.ver = { name: 'Ver master', color: '#b070ff', sub: 'Duskareth' };
SPEAKERS.researcher = { name: 'Ilse Varrow', color: '#a8d8b0', sub: 'library researcher' };
SPEAKERS.malsti = { name: 'The Malsti Punk', color: '#c890ff', sub: 'small, and pleased with itself' };
SPEAKERS.wrath = { name: 'The Bound One', color: '#ff7a7a', sub: 'a Sniller in a Relic' };

export const ARC = {
  /* the side-objective from Quest 1: link the longevity Relic so it works from home */
  link: {
    offer: [
      ['buhkon', 'That stone of yours. You have to carry it for it to work — unless it’s linked.'],
      ['buhkon', 'Bring me two Punk vines, a little Stygian ore, and two Zahreh petals. I’ll show you how it’s done.'],
    ],
    wait: [['buhkon', 'Two Punk vines, one bit of Stygian ore, two Zahreh petals. The Punks on the hill shed vines; the ore glows gold to Nur’Hlyst; the petals grow all over.']],
    done: [
      ['tale', 'The Carpenter winds the vines round the stone, presses the ore in soft, and lays the petals over it like a bandage. Then he hums to it — the stone hums back.'],
      ['buhkon', 'There. Linked. Leave it on the shelf by your bed, and it’ll still keep you on your feet out there.'],
      ['buhkon', 'One day you’ll want more than one linked at once. That takes a ring. Not today.'],
    ],
  },
  /* Venkin: one of the only kids in town */
  venkin: {
    offer: [
      ['buhkon', 'There’s a Keilia family in town — builders, good ones. Their youngest, Venkin, is about the only other child in Beuhk.'],
      ['buhkon', 'Go and find Venkin. Take your tokens. You’ll get on.'],
    ],
    meet: [
      ['venkin_y', 'You’re the boy from the hill! The Carpenter’s boy! Do you play? Tell me you play.'],
      ['tanoc', 'I’ve got… some tokens. A few I found. A few I, um. Borrowed. On Velki.'],
      ['venkin_y', 'VELKI tokens?! Oh, they’ll be wild ones. Come on — throw one. Right here.'],
      ['tale', 'You and Venkin play until the lamplighter chases you off the square. Then you play behind the bakery.'],
    ],
  },
  /* years pass, in snapshots */
  years: {
    one: ['Year one.', 'Tanoc learns the hill: every fence-post, every fort, every place the Punk likes to sleep in the sun.'],
    two: ['Year two.', 'He is taller. The Punk is a great deal taller. The lake has stopped being frightening.'],
    three: ['Year three.', 'Venkin wins more games than Tanoc does, and says so, often.'],
    four: ['Year four.', 'The tower fills, slowly, with copied cores. Tanoc reads them by lamplight.'],
    five: ['Year five.', 'Tanoc is seventeen. The amulets have started to hum at night.'],
  },
  /* the lake and the caves beneath it */
  caves: {
    offer: [
      ['buhkon', 'You swim like a stone, Tanoc. That won’t do, living above a lake.'],
      ['buhkon', 'There’s a shallow cave off the old dock — safe, and lit by the moss. Learn to dive there. Space up, C down. Come up before your lungs complain.'],
    ],
    enter: ['The water is cold, and then it isn’t.', 'Under the old dock, a mouth of green-lit rock opens into the hill.'],
    shallow: [['tale', 'The shallow cave: moss-light, still water, a sandy floor. A good place to practise holding your breath.']],
    relicSpot: 'Something under the water is drawing a slow circle of light on the cave floor.',
    relic: [
      ['tale', 'A shell-stone, ridged like a fan, with a circle of stygian worked into it. It is cold, and very old, and asleep.'],
      ['hurst', '…mmm… deep… the deep was so… dark… and you are… warm…'],
      ['tanoc', 'Hello? Are you — are you dreaming?'],
      ['hurst', '…breathe… with me… slow…'],
      ['tale', 'Something in your chest unclenches. The water around you feels like air that has simply got thicker.'],
    ],
    learned: 'Breath Relic — the shell-stone’s Grothyn Hurst lets you stay under far longer.',
    crack: 'Behind the curtain of roots, the rock is cracked through — and the crack goes down.',
    deep: [['tale', 'The hidden cave. It goes on, and on — wet caves, dry caves, tunnels the water has been patient with for longer than there have been Eikar.']],
    naga: [
      ['tale', 'Far below, in the dark, something moves that is far too large to be in a lake.'],
      ['tale', 'A head, then another, then the long gleam of a body. An ancient Su Naga, asleep in the deep, and young sea-things breeding in the warm water round its coils.'],
      ['tanoc', '(Don’t breathe. Don’t breathe. Don’t — you can’t breathe anyway. Go. Quietly.)'],
    ],
    dry: [
      ['tale', 'The tunnel climbs out of the water into dry stone. The air is still and old. Above you, through a crack, lamplight — and the sound of the Carpenter’s hammer.'],
      ['tanoc', 'This is under the tower. This is right under the tower.'],
      ['tale', 'A dry chamber, deep, safe from damp and from anyone who doesn’t know the way. Shelves would fit there. A great many shelves.'],
    ],
    home: [
      ['buhkon', 'You were gone a long while. And you came up through my floor.'],
      ['tanoc', 'There are caves under everything, Buhkon. There’s a room under the tower — dry, deep — we could keep copies of the cores there. A library nobody could ever burn.'],
      ['buhkon', '…Yes. Yes, we could. Every core you find, a copy below. Start whenever you like.'],
    ],
  },
  /* the buried chest in the forest — never spoken of */
  chest: {
    found: [
      ['tale', 'Under the roots, a chest of black wood, banded in old brass with a crest you have seen once before — burnt into a beam in the Carpenter’s workshop.'],
      ['tale', 'Letters, tied in ribbon. Seals of a great house. Jewellery far too fine for a carpenter. Maps — one marked with a single tree, and a name you can’t read.'],
      ['tale', 'And three tokens, wrapped in silk, that hum against each other like they’re arguing.'],
    ],
    play: [
      ['tale', 'You throw one, just to see. Something vast unfolds over the trees — a silhouette with tendrils and great curved horns — and turns its head to look at you.'],
      ['tale', 'You put the tokens back exactly as you found them. You never mention it. Neither does he.'],
    ],
  },
  /* Quest 2 — the Megla Aagac */
  megla: {
    offer: [
      ['tale', 'One of the Sniller amulets from Fyrsti’Vilag won’t lie still. At night it turns itself to face north.'],
      ['sniller', '…north. The Megla Aagac. Something of mine is held there. Something I was set to find.'],
      ['buhkon', 'The Megla Aagac. It’s a forest — not a tree, a forest — a day north, past the river pass. Mist that doesn’t lift. Things live there that don’t like visitors.'],
      ['buhkon', 'I won’t tell you not to go. I’ll tell you to go carefully, take the Punk, and come home.'],
    ],
    cards: ['The Megla Aagac.', 'A day north, following the river up through the mountain pass. The mist gets heavier with every mile.'],
    clearing: [['tale', 'A clearing at the forest’s edge. Beyond it, massive dark tree shapes stand in fog so thick they look painted on it.']],
    rodak: [['tale', 'Rodak in the treeline. Lean, dark, oily, tall — and curious, not hungry. They sense something is about to happen, and they want to be there for after.']],
    night: [
      ['tale', 'You camp at the forest’s edge. Behind you the mountains and fields still glow. Ahead, only dark — and now and then a flicker of light, gone too fast.'],
      ['tale', 'A Lutut screeches, very far off. Silence. An Api Buta bellows. Silence. Then a sound like someone screaming through a closed door — and a very long silence.'],
    ],
    morning: [['tale', 'Morning. You and the Punk go in on foot. Your vision blurs a little; the mist thickens.']],
    thud: [
      ['tale', 'THUD — off the path, something enormous hitting the ground.'],
      ['tale', 'The Punk grabs you with every vine it has and bolts back to the clearing.'],
      ['tanoc', 'No — stay. Stay here. I’ll be back. I promise.'],
    ],
    drag: [['tale', 'Where the thud came from: a large animal, stunned and gone, and a drag trail leading deeper in.']],
    rodakLine: [['tale', 'The Rodak come out of the mist all round you. They don’t block your way. Deeper in, they stop at a line you can’t see, and wait.']],
    ruins: [['tale', 'Ruins. Old, old stone, half-swallowed by roots. And in one wall, a purple light.']],
    wallRelic: 'A purple Relic is set into the wall. The stone around it is pristine — the further from it, the more ruined everything is.',
    gynge: [['tale', 'The ground under your feet BULGES — and a Gynge erupts out of it, a living hill of rock with a mouth full of dark.']],
    gyngeHint: 'Its soft spots: inside the mouth, and the belly. Q — throw fire-stone shots into its maw.',
    gyngeUp: [['tale', 'Half-broken, the Gynge hauls its whole body out of the earth and comes for you. Its belly is soft — get underneath it.']],
    gyngeDown: [['tale', 'The Gynge goes down like a landslide. When the dust settles you cut a chip of it free — a piece to keep. For a token, one day.']],
    rune: [
      ['tale', 'You clear the moss from the purple Relic. A rune: Akai Gek. You take a rubbing with charcoal and the back of a map.'],
      ['tale', 'Then you touch it, and a song goes into your head and stays there, as if it was burned in.'],
      ['tanoc', 'It won’t come out. The Relic, I mean. The song neither.'],
    ],
    campRuins: [
      ['sniller', 'The rock-beast kept the others away. While it lived, nothing came near. Sleep here. It’s a good place.'],
      ['tale', 'Night sounds, terrifying, just far enough apart to almost be all right. You and the Sniller talk quietly by the fire until you don’t.'],
    ],
    day2: ['Day two.', 'Smaller fights. Things worth gathering. The mist never lifts.'],
    eclipse: [['tale', 'Midday, and Velki slides in front of the sun. The whole of Xikia goes dim.'], ['tale', 'In the dimness: the screaming again. Closer.'], ['sniller', 'There. That way. What I was set to find is there.']],
    hideout: [['tale', 'A Duskareth hideout, camouflaged into the forest: four walls, an open courtyard, watchtower trees along the edge. The ring is inside. It can’t be carried through the Duat, so they’re keeping it here for now.']],
    climb: 'Climb a watchtower tree in the mist and deal with the watcher',
    caught: [['tale', 'The watcher drops without a sound — and every Duskareth in the keep looks up at once. They all know. They always all know.'], ['tale', 'You fumble down into the courtyard. They close in from every side.']],
    down: [['tale', 'There are too many. You go down hard.']],
    help: [['tanoc', 'Shut up and HELP.']],
    release: [
      ['tale', 'The amulet cracks open with light. The Sniller pours half out of it — still tethered at its base, but vast, ancient, filling the courtyard.'],
      ['tale', 'It does not kill them. It puts every guard on the ground, gently, and holds them there.'],
      ['tale', 'Then it turns back to you, and lays something like a hand over you, and the pain goes out like a tide.'],
    ],
    church: [['tale', 'The only real building in the keep: a small church-like room built into the northern wall.']],
    ver: [
      ['ver', 'You. The boy with the brown hat. They’ll all have seen you now.'],
      ['tale', 'He attacks — and his weapon dissolves in his hand. He tears at the Duat — and the Sniller drinks it.'],
      ['ver', 'Wait. Wait — please —'],
      ['tale', 'The zikhron core in his chest breaks its own rule, and turns him into what he is now: a Malsti Punk, small and violet, blinking up at you. The ring sits on its stem.'],
    ],
    ring: [
      ['tale', 'The Sniller reaches for the ring — and can’t touch it. For the first time, it loses its composure.'],
      ['tale', 'You pick it up. A ripple goes through the whole keep, and for one moment the Sniller is completely solid.'],
      ['sniller', '…You hold it. Then I owe you a request. One. Ask.'],
    ],
    request: [
      ['tanoc', 'Make this place clean. And make it so nobody can come in unless I let them.'],
      ['tale', 'The keep changes around you. The rot goes out of the walls. The mist stops at the gate, as if it had been told.'],
      ['tale', 'The Megla Aagac keep is yours: your first base, on Xikia.'],
    ],
    malstiNight: [['tale', 'That night you sleep in the little church. The Malsti Punk watches you from the rafters, then from the floor, then from your boots. By morning it won’t leave your side.']],
    out: [['tale', 'Leaving, you find a path out of the forest you couldn’t see on the way in.'], ['tale', 'At the treeline, your Punk is waiting. It and the Malsti Punk circle each other, sniff, and decide this is fine.']],
    ringNote: 'The Relic Ring — link up to five Relics at once, without carrying them.',
  },
  /* the Gynge chip becomes a token */
  token: [
    ['buhkon', 'You kept a chip of it. Good. Here — the Okid’Relic, the stygian, and you sing.'],
    ['tale', 'You sing the rock-beast’s song, as near as you can remember it, while the Carpenter pours. The chip takes the truth of that one Gynge, and keeps it.'],
    ['buhkon', 'Your first token that’s truly yours. It’ll fight the way it lived.'],
  ],
  /* Quest 3 — the meteor crater and the new hat */
  crater: {
    offer: [
      ['buhkon', 'The Duskareth saw your hat. And the Duskareth keep memories the way other people keep ledgers — by now it’s moving through all of them.'],
      ['buhkon', 'Every Eikar’s hat is their own. If they know your hat, they know you. So we make you a new one.'],
      ['buhkon', 'That needs raw stygian kept soft — which means close to True Raw. There’s a crater three days east. I’m coming with you this time.'],
    ],
    cards: ['The meteor crater.', 'Three days east, both of you looking over your shoulders the whole way. Tanoc’s old hat feels like a lantern on his head.'],
    researchers: [
      ['researcher', 'Buhkon Eldi! As I live. Come down off that ridge, you old hermit.'],
      ['buhkon', 'Ilse. Still planting Stryx in places nobody sensible would go?'],
      ['researcher', 'Next to True Raw, they grow strange. Strange is the whole point. And who is this?'],
      ['buhkon', 'My apprentice. He listens to things.'],
      ['researcher', 'Then he can have these. Three seedlings awake, and a bag of sleepers. Raise them well and they’ll be cleverer than both of us.'],
      ['buhkon', '(quietly) Say thank you, Tanoc. And one day we’ll visit their Stryx school.'],
    ],
    scouts: 'Duskareth scouts on the far rim. The Carpenter steers you away from them without ever seeming to.',
    rubbing: [['tanoc', 'Buhkon — look. From the ruins in the Megla Aagac. Akai Gek.'], ['buhkon', '…Keep that safe. Keep it very safe.']],
    linkLesson: [['tale', 'The Carpenter sits with your longevity Relic a long time, talking to its Hurst. Afterwards he shows you how the linking really works — the part he didn’t say before.']],
    tent: [
      ['tale', 'The tent, by the crater’s edge, close enough to True Raw that the stygian stays soft.'],
      ['tale', 'The Carpenter pushes raw stygian into the vein-channels of a new hat while it’s still warm. Then: “Take yours off.”'],
      ['tale', 'You do, and the world goes far away, the way it did at the Skyfall.'],
    ],
    dream: [
      'Tent canvas.',
      'Muffled voices outside. Duskareth.',
      'Something put into your hands — the hat, and a tool, cold.',
      'The tent flap. A figure, outside, simply — gone.',
      'The Carpenter stepping back in, and carrying on as if nothing happened.',
    ],
    after: [
      ['tale', 'You don’t remember the rest. Only those pieces, and only in dreams, for years.'],
      ['tale', 'The new hat is a little bigger than the old one. Otherwise perfectly ordinary. A different fingerprint — no Duskareth will know you by it now.'],
      ['buhkon', 'Keep the old one. A spare face is a useful thing to own.'],
    ],
    song: [
      ['tale', 'On the way home, by the fire, you teach the Carpenter the song the wall-Relic burned into you. You sing it together.'],
      ['tale', 'Visions come — too fast, too bright to hold. And after them, a deep, quiet sense of purpose settles over both of you, and stays.'],
    ],
  },
  /* Year five — the fake finale, and the real beginning */
  finale: {
    start: [
      ['tale', 'Late at night, every Sniller amulet in the tower starts to ring at once.'],
      ['buhkon', 'That’s not them. That’s something they’re afraid of. Tanoc — the old Relic, in the barn. The one I never let you touch.'],
      ['tale', 'In the barn, a Relic the size of a door is splitting along a seam. Something inside it has been waiting since the first Skyfalls — no curse, no task, no path. Only centuries of fury.'],
    ],
    fight: 'Hold the Bound One back with the Carpenter — strike the shards when they glow',
    noka: [
      ['tale', 'High above the hill, a vast silhouette fills the stars: horns curving like a crown, tendrils snaking down toward you.'],
      ['noka', 'Little Eikar. You are holding a door shut with your hands. Use the amulets instead.'],
      ['noka', 'Ring them round it. Every one you carry. Then say the song the old wall gave you, and the Angels’ unfinished work will finish itself.'],
    ],
    ringObj: 'Set the amulets in a ring around the Bound One',
    sing: 'Sing the Akai Gek song',
    cursed: [
      ['tale', 'The song goes out of you and into the amulets, and the amulets close like a hand.'],
      ['tale', 'The Bound One folds into the stone. A new amulet lies in the straw — cold, quiet, properly cursed. The first ever finished.'],
      ['buhkon', '…Well. I didn’t know that could be done.'],
      ['noka', 'Neither did the Angels, Carpenter. Little Eikar — I am half a day from your door. Come and see me. Alone.'],
    ],
    walk: ['Half a day, alone, up a mountain the Carpenter says has no name.', 'At the top: a stygian Quarigen, and in it, an old soul.'],
    nokaTalk: [
      ['noka', 'There you are. Taller. Good.'],
      ['noka', 'I am Noka. I go from peak to peak. I remember everything, and I tell almost none of it.'],
      ['noka', 'But you I will show a little. Look.'],
    ],
    visions: [
      'A shining city that swore an oath, and a lord who would not let it go.',
      'A great worm out of the Duat, and an Eikar in a showman’s coat laughing on its back.',
      'An island where everything is poisonous, and three friends stranded in the ruins of Villtur.',
      'A name that is not yet yours: Torcain.',
      'And the Angels — somewhere — still watching for you.',
    ],
    end: [
      ['noka', 'That is enough for now. The world is open, little Eikar. Go and see it.'],
    ],
    endCards: ['The world opens.', 'Tanoc · Chapter I — complete.'],
  },
  /* objectives */
  obj: {
    link: 'Bring Buhkon two Punk vines, one Stygian ore, two Zahreh petals',
    venkin: 'Find Venkin in Beuhk and throw a token',
    caves: 'Dive into the shallow cave under the old dock',
    megla: 'Talk to Buhkon about the amulet that faces north',
    meglaGo: 'Ride north to the Megla Aagac — the road out past the Carpenter’s north fence',
    token: 'Ask Buhkon to help sing the Gynge chip into a token',
    crater: 'Talk to Buhkon — the Duskareth saw your hat',
    craterGo: 'Set out east with the Carpenter — the gate at the yard',
    finale: 'The amulets are ringing in the tower — go to the barn',
    free: 'Chapter I complete — the world is open',
  },
};
