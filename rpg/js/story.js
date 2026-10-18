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
  ['Sniller amulets', 'A large round gem between two curved horns, cold teal. Snillers were cursed into them when the Xwi left. They hum toward old memory vaults.'],
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
  p_yard: ['Burned into a beam over the workshop door:', '"Buhkon Eldi, Carpenter. Ships, sheds, cradles, and lost boys mended."'],
  p_path: ['A waystone beside the forest path, furred with moss:', '"Land of the House of Eldi. Walk softly. Leave the toadstools be — they light the way home."'],
  p_lookout: ['Scratched into the flat rock at the top of the hill:', '"From here you can see the whole of it, and the whole of it can see you. — B."'],
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
   spire in Fyrsti'Vilag to watch the Xwi and the Snillers fight,
   walks out of the gate toward it of his own accord, and is caught
   in it — and wakes on Xikia, in front of the Carpenter's stall.
   ================================================================ */
SPEAKERS.tanoc = { name: 'Tanoc', color: '#e0b080', sub: 'Tanoc Filugani · Eikar, thirteen' };
SPEAKERS.tale = { name: 'Rokarvac', color: '#e8d8a8', sub: 'as it is written' };
SPEAKERS.xwi = { name: 'Xwi', color: '#fff3c8', sub: 'one of the Xwi' };
SPEAKERS.guard = { name: 'Gate warden', color: '#d8c090', sub: 'Fyrsti’Vilag, Velki' };
SPEAKERS.ahoac = { name: 'Ahoac', color: '#ffb46a', sub: 'a Firefall catcher' };

export const PROLOGUE = {
  kicker: "Torcain's Run · The Beginning",
  title: 'The Last Skyfall',
  cards: [
    'Before Torcain, there was Tanoc.',
    'Velki, in the year 307A. The sun is going down over Fyrsti’Vilag, and the sky is on fire for the last time.',
    'Up there, the Xwi are at war with the Snillers. They have been at war through every Skyfall anyone can remember.',
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
    ['tale', 'It is mostly light. The Xwi are streaks of white and gold; the Snillers are cold teal and storm-grey, wind turning on itself. You catch a shape for a heartbeat — wings of light, a spinning funnel, one eye — and then it is only colour again.'],
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
    ['tale', 'The air over the square cracks like ice. A Xwi and a Sniller come through together, still locked in their fight — and the shockwave knocks the hat clean off your head.'],
  ],
  freeze: [
    ['tale', 'And everything stops.'],
    ['tale', 'The Xwi and the Sniller hang in the air, and the whole square holds its breath, and both of them are looking at you.'],
    ['tale', 'Up close, the Sniller is enormous. Nobody has ever seen one whole before — not like this, not standing still.'],
    ['buhkon', 'Tanoc. Your hat. Now.'],
  ],
  hatBack: [
    ['xwi', 'There. You see it too.'],
    ['xwi', 'Then it is done. We must go, and we will not come again. No Skyfall will follow this one.'],
    ['xwi', 'And you — sleep in the stone, every one of you, until you are needed.'],
    ['tale', 'The Sniller folds in on itself with a sound like a bell under water, and is gone. Where it hung, something small and teal clatters onto the cobbles. Then another. Then a rain of them.'],
    ['tale', 'Across the sky, one by one, the Xwi go out like lamps.'],
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
    ['tanoc', 'What’s its trigger? The fire-stone wanted a pebble.'],
    ['buhkon', 'Hold it flat against your chest and breathe slow — in for four, out for four. It likes a steady heart. When you’re spent, it’ll give you a second wind.'],
    ['tale', 'You hold the stone to your chest and breathe. It hums back, in time. You have the humming stone’s trigger — set it on a quick slot in your book (I).'],
    ['buhkon', 'And since you can hear them — let me show you how to listen properly. Close your eyes. Listen with your Hurst, not your ears. And push.'],
  ],
  hlyst: [
    ['tale', 'A golden pulse rolls out of you, across the yard, the lake, the rooftops — and the world lights up. Things answer: chests, ore, the cold teal of a Sniller amulet somewhere far off.'],
    ['buhkon', 'That’s Nur’Hlyst. Press G, whenever you like. Hidden things will answer you.'],
    ['buhkon', 'Now. Ahoac, you said? Catchers of the Firefall. Let’s see what those hands can do. The straw dummies, there — knock all three down. Blunt side.'],
  ],
  dummies: [
    ['buhkon', 'Hah! Quick feet, heavy hands. Not bad at all.'],
    ['buhkon', 'An Ahoac has to fall well, too — and that’s a real Ahoac cloak you’ve been carrying since Velki, isn’t it? Climb the tower, jump, and HOLD Space as you fall. Arms out — let the cloth take the wind.'],
  ],
  glided: [
    ['buhkon', 'Like a seed on the wind! Come back down and talk to me.'],
  ],
  end: [
    ['buhkon', 'That’s enough for one day. You’ll stay — for as long as you want to. There’s a lot to learn, and I’d rather you learned it here than out there.'],
    ['tanoc', 'Buhkon… the Xwi. The Sniller. They all looked at me. Why?'],
    ['buhkon', 'Because of what you are. And that is a long story, and you have a long time to hear it.'],
    ['buhkon', 'For now: the land’s yours, all of it, and the town along the path. Meet people. Help where you can. Keep those amulets close — and keep your hat on.'],
    ['buhkon', 'And tomorrow, you start earning your soup.'],
  ],
  stryx: [['stryx', 'An Eikar boy with somebody else’s hat. Not a passenger. Come back when you have a name of your own.']],
  buhkonIdle: [
    'Explore. Help folk. Keep your hat on.',
    'That tower will hold books one day. Yours, maybe.',
    'The Relic still humming? Good. Talk to it. They like that.',
    'Sniller amulets wander. Use your Nur’Hlyst — they glow cold teal.',
  ],
  pass: 'Rockfall across the Megla Pass — and Buhkon said three days of mist past it. Not today.',
  chapterEnd: 'The first day is done. Two summers on the Carpenter’s land begin tomorrow — talk to Buhkon.',
};
export const YOUNG_OBJ = {
  explore: 'Step outside and look around',
  relic: 'Something blue is glinting at the lakeshore, down by the old dock',
  bring: 'Bring the humming stone to Buhkon, up at the house',
  dummies: n => `Knock down Buhkon’s straw dummies (${n}/3)`,
  glide: 'Climb the tower, jump, and hold Space to glide',
  back: 'Return to Buhkon',
  free: 'Chapter I — the property and Beuhk are yours. More of Tanoc’s story is coming.',
};

/* ================================================================
   THE ROAD NORTH — from Fyrsti'Vilag on Xikia, six days to Beuhk
   and the Carpenter's hill beyond it.
   ================================================================ */
SPEAKERS.hurst = { name: 'The Hurst', color: '#ff9a4a', sub: 'in the fire-stone' };
SPEAKERS.punk = { name: 'The Punk', color: '#9ad86a', sub: 'young, and following' };
SPEAKERS.folk = { name: 'Beuhk folk', color: '#e8d8a8', sub: 'overheard' };
SPEAKERS.family = { name: 'A family on the road', color: '#e8d8a8', sub: 'out of Fyrsti’Vilag' };
SPEAKERS.resident = { name: 'Townsfolk', color: '#e8d8a8', sub: 'at home' };

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
    cartSee: [
      ['family', 'Oh — oh, thank the Tatu, someone. Our wheel came off in the ditch and went rolling off into the field. With everything we own on this cart.'],
      ['buhkon', 'Whoa, whoa. Off you get, Tanoc — go and help them. Young legs. I’ll hold the Punks and steady their axle.'],
    ],
    wheelGot: 'A cart wheel, nearly as tall as you. You roll it back toward the road.',
    cartWait: 'Not till that family’s on its wheels again, Tanoc. Go on.',
    cartFixed: [
      ['tale', 'You and the Carpenter heave the wheel onto the axle. The cart rights itself with a groan.'],
      ['family', 'Out of Fyrsti’Vilag the same as you, I’d guess. Did you see it? The sky just — stopped. They say the Xwi are gone. Gone!'],
      ['family', 'Here — a bun, for the boy. Fresh this morning. Well. Fresh this morning in a city that was screaming.'],
      ['buhkon', 'Safe roads to you. Keep north of the river tonight — the low road floods.'],
    ],
    hedge: [['tanoc', 'Something’s humming in the hedge… another amulet! It must have blown all the way out here.']],
    sniller: [
      ['tanoc', 'Buhkon. Buhkon, out over the fields — is that one of THEM?'],
      ['buhkon', 'Keep walking. It isn’t looking for us. They can’t stay solid long now — the Xwi saw to that.'],
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
    log: [
      ['tale', 'A great pine lies across the road, roots and all, as if something pushed it over in the night.'],
      ['buhkon', 'Well. Your hatchet, Tanoc. Middle of the trunk, where it’s thinnest — three good swings.'],
    ],
    logDone: [['buhkon', 'Hah! That’s an Ahoac’s swing. Through we go.']],
    stream: [
      ['buhkon', 'The ford. Mind the stones — the water’s snow-melt, and it bites.'],
      ['tanoc', 'Stepping stones. I can do stepping stones. I was going to catch the Firefall.'],
      ['buhkon', 'You can. The cart can’t. See that old footbridge, washed up on the bank down to the left? Two of its long planks, one for each wheel — and lay them straight.'],
    ],
    splash: ['COLD! Cold cold cold —', 'Ahh! It’s like ice!', 'Buhkon is laughing. You can hear him laughing.'],
    across: [['buhkon', 'Dry feet. More or less. On to camp.']],
    planksDone: [
      ['tale', 'Two long planks, one for each wheel, bowing a little over the cold water.'],
      ['buhkon', 'There. A road for the wheels. Walk on, you two — slow — slow — good Punks.'],
    ],
    send: [
      ['buhkon', 'We’ll eat better if one of us hunts. Not me — I’m old and I’m comfortable.'],
      ['buhkon', 'There are Kofi Galta all through these woods. Bring one back. And don’t go further than you can still see the smoke.'],
      ['tanoc', 'With the hatchet?'],
      ['buhkon', 'With a hatchet you’ll be chasing Kofi till you’re grey. Take the fire-stone. A pebble’s quicker than any Kofi ever born.'],
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
    hum: [
      ['tale', 'Night. The rain has stopped. The Carpenter sleeps — or pretends to — and the bag of amulets at your feet begins, very softly, to hum.'],
      ['tale', 'At the edge of the firelight, between the trees, something pale is standing. A spinning storm where its legs should be. A single cold eye.'],
      ['tanoc', '(…It’s not solid. I can see the trees through it. It wants me to follow.)'],
    ],
    wispNear: 'It drifts back as you come — always just ahead, always just beyond the light.',
    wispGone: [
      ['tale', 'In a ring of mossy stones the pale shape stops, turns its one eye on you — and comes apart like smoke in the wind.'],
      ['tale', 'Where it stood, an amulet is set deep into the oldest stone, humming the same note as the ones in your bag.'],
    ],
    wispAmulet: [['tanoc', 'It brought me here. To this. …Why would it want me to have it?']],
    back: [
      ['buhkon', 'You followed one.'],
      ['tanoc', 'You were awake!'],
      ['buhkon', 'I’m always awake. Listen to me now: they hum toward something, and they will try to take you to it. Never follow one alone at night again. Promise me.'],
      ['tanoc', '…I promise.'],
      ['buhkon', 'Good. Sleep. The pass tomorrow.'],
    ],
    cards: ['Day three.', 'Rain in the forest. They wait it out at the camp, and the Carpenter talks.'],
    talk: [
      ['buhkon', 'You want to know what happened to you. I’ll give you the pieces I have.'],
      ['buhkon', 'Zikhron is memory. Not the kind in your head — the kind that soaks into things. Stone remembers. Stygian remembers best of all.'],
      ['buhkon', 'Stygian is soul-iron. Relics are made of it, and memory cores, and your hat — the veins in an Aagac are stygian. That’s why you couldn’t think without one.'],
      ['buhkon', 'There are people who want stygian more than anything. The Duskareth, who walk the Duat. The SkarValorin, who forge. The Elsha’ryn, who keep memory.'],
      ['buhkon', 'The Skaar Uverkhron, all three of them. You’ll hear those names again. When you do — keep your hat on and your mouth shut.'],
      ['tanoc', 'And the Xwi? Why did they look at me?'],
      ['buhkon', 'That piece I’ll give you when you’re older. It’s a heavy one.'],
    ],
  },
  day4: {
    cards: ['Day four.', 'The mountain pass. Thin air, loose stone, and too many shadows keeping pace on the ridge.'],
    rocks: [['buhkon', 'Rocks! Off the ridge — watch the shadows, and keep moving!']],
    offCart: 'Down you get, and walk on ahead. That ridge is loose — I’ll bring the cart through behind you.',
    rocksDone: [['buhkon', 'Through. Breathe. And don’t look up there again — there’s worse waiting.']],
    alpha: [['buhkon', 'That’s the pack’s leader. Bigger, older, and hungry. Fire, Tanoc — if that stone of yours is willing!']],
    warn: [
      ['buhkon', 'Rodak. They’ve been following since the treeline — waiting for one of us to get hurt.'],
      ['buhkon', 'They won’t wait anymore. Back to back, Tanoc. Hatchet up.'],
    ],
    won: [
      ['buhkon', 'The leader’s down, and the rest of the pack goes with it. Rodak never stay to bury their own.'],
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
      ['folk', '…gone, all of them. The Xwi. Not a Skyfall since, and they say there won’t ever be another.'],
      ['folk', '…my cousin swears the amulets hum at night. Like they’re listening for something.'],
      ['folk', '…the old prophecy, the one about the boy who fell —'],
      ['folk', '…an Eikar child with no hat, right in front of a market stall, in Fyrsti’Vilag. Brown as an acorn, they said. Thirteen, maybe.'],
    ],
    heard: [['tanoc', '(…they’re talking about me.)'], ['buhkon', 'They are. Which is why we leave at first light.']],
  },
  day6: {
    cards: ['Day six.', 'The last of it: out of town by the little road west, over the river, and into the trees.'],
    obj: 'Take the forest path west out of Beuhk to the Carpenter’s',
    path: [
      ['tale', 'The trees close over the road like a roof — and then they are not trees any more but giants, trunks wider than a cart is long, going up and up into one roof of leaves that shuts the sky out entirely. Down here it is dim and blue-green, and the town noise is gone all at once behind you.'],
      ['tale', 'And the wood has its own light. Seams of it run up the bark. Beads of it hang along the branches, specks of it among the leaves, far overhead like a second sky. The moss on the stones glows. So do the toadstools.'],
      ['tanoc', 'He said follow it to the top. …It’s a long way to the top.'],
    ],
    pathBarks: [
      ['tanoc', 'Glowing toadstools. In the daytime! Well — it isn’t daytime, down here. It’s never daytime down here.'],
      ['tanoc', 'A brook! And a little bridge. Somebody looks after this path.'],
      ['tanoc', 'A carved stone, all moss. Something about the Eldi house. Eldi — that’s his name, isn’t it?'],
      ['tanoc', 'Daylight, up ahead. Real daylight. The giants are thinning.'],
    ],
    crest: [
      'The trees open, and Tanoc stops dead at the top of the path.',
      'The land falls away below him, long and slow and green, all the way down to a lake so big it shines to a dark forest on the far shore.',
      'Partway down the slope: a big house — a very big house — and a workshop, a barn, a tower, a woodshed, fenced fields, a pasture full of Punks, a lane down to an old dock.',
      'Far off to the south, one blue line of mountains. Everywhere else, forest, going on and on. Big sky over all of it.',
      'Home, the Carpenter says from the porch, as if it were nothing at all.',
    ],
  },
  /* objectives for the road */
  obj: {
    day1: 'Walk north with the Carpenter to the hedge-oak camp',
    stone: 'Find the fire-stone’s trigger',
    pebble: 'Pick up a pebble by the fire',
    hunt: 'Hunt a Kofi Galta with the fire-stone — stay in sight of the smoke',
    back: 'Bring it back to the camp',
    day4: 'Cross the mountain pass',
    cart: 'Help the family: find their cart wheel in the field',
    cartBack: 'Roll the wheel back to the cart',
    log: 'Chop through the fallen pine (three swings)',
    stream: 'Cross the ford',
    planks: n => `Fetch two planks so the cart can cross the stream (${n}/2)`,
    wisp: 'Follow the pale shape into the trees',
    wispAmulet: 'Pry loose the amulet in the stone ring',
    wispBack: 'Go back to the camp',
    rocks: 'Get through the rockslide — watch the shadows',
    rodak: n => `Drive off the Rodak (${n} left)`,
    day5: 'Rest in Beuhk — and listen',
    meet: 'Find the Carpenter by the town hearth',
  },
};

/* ================================================================
   CHAPTER II — THE MEGLA AAGAC
   Two years on. A cooperative Sniller amulet out of Fyrsti'Vilag feels
   its task pulling north, and Tanoc (fifteen now) rides after it into
   the mist forest the folk of Beuhk don't name above a whisper. A Gynge
   in the ruins; the Duskareth keep; a ring; a friend. And at home, the
   Carpenter shows him how to keep a creature's truth.
   ================================================================ */
SPEAKERS.sniller = { name: 'The Sniller', color: '#6af0e0', sub: 'in the amulet' };
SPEAKERS.vel = { name: 'Duskareth', color: '#b070ff', sub: 'a Vel of the keep' };
SPEAKERS.master = { name: 'The Ver master', color: '#c890ff', sub: 'Duskareth, with the ring' };
SPEAKERS.malsti = { name: 'The Malsti Punk', color: '#c88aff', sub: 'who was a Ver, a moment ago' };
SPEAKERS.tanoc15 = { name: 'Tanoc', color: '#e0b080', sub: 'Tanoc Filugani · Eikar, fifteen' };

export const MEGLA = {
  // at home, before: the amulet starts to pull
  pull: [
    ['tale', 'The second summer on the Carpenter’s land is getting old. Tanoc is a hand taller than the boy who came up the forest path. The Punk is a great deal more than that.'],
    ['tale', 'Then one morning, one of the Sniller amulets out of Fyrsti’Vilag — the one that hums when he talks to it — begins to tug. North. Always north, like a dog on a lead.'],
    ['buhkon', 'Let me see it. …Mm. It has a task, and the task has started pulling. They do that.'],
    ['tanoc15', 'Where to?'],
    ['buhkon', 'North, up the river, through the pass. There’s a forest past the mist the Beuhk folk call the Megla Aagac. Old trees. Older than old.'],
    ['buhkon', 'Things live there that don’t live anywhere else. Don’t go off the path at night. Don’t pick a fight with anything you can’t see the edges of.'],
    ['buhkon', 'And if the amulet asks you for something, Tanoc — think before you answer.'],
    ['tanoc15', 'That’s all? That’s all you’re going to tell me?'],
    ['buhkon', 'That’s all you need. Take the Punk. Take the fire-stone. Be back before the leaves turn.'],
  ],
  cards: ['Two years on.', 'The Megla Aagac'],
  ride: [
    ['tale', 'North, following the river up into the pass. The Punk is twice the size she was, and she takes the climb like it’s a game.'],
  ],
  rideBarks: [
    ['tanoc15', 'Mist already. And it’s not even noon.'],
    ['sniller', 'Further. It is further. I can feel it, little one — like a tooth that wants pulling.'],
    ['tanoc15', 'You talk more every day, you know that?'],
    ['tale', 'The mist thickens with every bend of the river. The sounds of the valley go soft, then go away.'],
  ],
  clearing: [
    ['tale', 'The pass opens onto a long clearing, and at its far side, rising out of a wall of fog: trees. Massive, dark trees, whose tops he cannot see.'],
    ['tanoc15', '…The Megla Aagac.'],
    ['tale', 'In the treeline, something moves. Tall, lean, dark, oily — a pack of Rodak, standing quite still, watching him.'],
    ['tanoc15', 'Easy. Easy, girl. They’re not coming. They’re just… looking.'],
    ['sniller', 'They know something is going to happen. Rodak like to be there for what comes after.'],
  ],
  campObj: 'Make camp at the forest edge — the stones by the old firepit',
  night1: [
    ['tale', 'Behind him the mountains and the fields glow soft blue under Velki. In front of him, the forest is simply dark.'],
    ['tale', 'Now and then, a flicker of light between the trunks — gone too fast to be sure of.'],
    ['tanoc15', 'You can come closer to the fire, you know. You don’t have to sit on my feet.'],
    ['punk', '…'],
  ],
  sounds: [
    ['tale', 'Far off in the trees: a screech. Long, rising, like metal dragged on stone. A Lutut, maybe.'],
    ['tale', 'A long silence. Then a bellow, low enough to feel in the ground. Api Buta.'],
    ['tale', 'Silence again. Then something else — a scream, thin and high, that doesn’t sound like any animal he knows.'],
    ['tanoc15', '…Just far enough apart to almost be okay. Almost.'],
  ],
  morning: [
    ['tale', 'Morning. The fog has not lifted; it has only gone grey instead of black.'],
    ['tanoc15', 'On foot, I think. Stay close.'],
  ],
  enterObj: 'Go into the Megla Aagac on foot',
  thud: [
    ['tale', 'Off the path — a thud. Something huge has hit the ground, close.'],
  ],
  grabbed: [
    ['tale', 'Before he can turn, the Punk has him: two vines round his middle, and he’s in the saddle and they’re running, back the way they came, until the trees spit them out into the clearing.'],
    ['tanoc15', 'Hey — hey! Stop. Stop! …I know. I know. I felt it too.'],
    ['tanoc15', 'Listen. You stay here. Right here. Keep the fire going. I’ll go in alone and I’ll come back. Promise.'],
    ['punk', '…'],
    ['tale', 'She does not like it. But she stays.'],
  ],
  aloneObj: 'Go back in — alone. Find what made that sound',
  animal: [
    ['tale', 'A Sru Vorn — a big one, tusked and heavy — lies in the ferns, breathing. Out cold. Something hit it hard enough to drop it where it stood.'],
    ['tale', 'And from it, a drag trail: a long furrow through the moss and the earth, leading deeper in. Something was going to take it. Something dropped it when he came.'],
  ],
  trailObj: 'Follow the drag trail deeper in',
  rodak: [
    ['tale', 'The Rodak come out of the fog on every side. They don’t close. They don’t block the way. They just walk with him, close enough to touch.'],
    ['tanoc15', 'Hello again.'],
  ],
  line: [
    ['tale', 'And then, all at once, they stop — every one of them, at the same invisible line in the moss — and sit, and watch him go on without them.'],
    ['sniller', 'Even the Rodak won’t go past here. Remember that.'],
  ],
  ruins: [
    ['tale', 'Ruins. Ancient worked stone, half-buried and furred with moss, walls standing at angles that suggest a building and then give up.'],
    ['tanoc15', 'Somebody lived here. A long time ago.'],
  ],
  gatherObj: n => `Search the ruins for anything worth taking (${n}/3)`,
  relicSeen: [
    ['tale', 'In the one wall still standing straight, at the heart of the ruin: a purple Relic, set into the stone.'],
    ['tale', 'And the stone around it is pristine — sharp-edged, clean, new as the day it was cut. The further from the Relic, the more ruined everything is.'],
    ['tanoc15', 'Oh, you’re beautiful.'],
  ],
  erupt: [
    ['tale', 'The ground under him heaves.'],
  ],
  gyngeIntro: [
    ['tanoc15', 'A Gynge — it’s a Gynge! Living rock — and its belly’s still in the ground!'],
    ['sniller', 'Its mouth, little one. The soft is in its mouth. Keep away from it and feed it fire.'],
  ],
  phase1: 'Keep your distance — when the maw gapes, put a burning stone in it (Q)',
  amplify: [
    ['tale', 'The purple Relic in the wall hums — he feels it in his teeth — and the fire-stone in his hand goes white-hot. The next stone he throws comes out burning twice as bright.'],
    ['hurst', 'Ooh! Who’s THAT? I like them! Let’s throw something big!'],
  ],
  half: [
    ['tale', 'With a grinding roar the Gynge tears itself up out of the earth — legs of rock, a pale soft underbelly — and comes for him.'],
    ['sniller', 'Its belly! It hides its belly in the ground because the belly is soft! Get under it!'],
  ],
  phase2: 'When it rears up to crush you — Space to slide under it and drive the axe into its belly',
  slid: ['Under it — the axe goes in!', 'Again — right into the soft!', 'Once more!'],
  dead: [
    ['tale', 'The Gynge shudders, sags, and is still — a hill of warm rock in the middle of the ruin, glowing faintly from the cracks.'],
    ['tanoc15', '…I did that. I actually did that.'],
    ['sniller', 'You did. Now take what it can give you. Nothing in this forest should go to waste.'],
  ],
  harvestObj: 'Harvest the Gynge — a chip of its living rock above all',
  chip: [
    ['tale', 'He works a chip of the Gynge’s rock loose — a palm-sized piece from just inside the maw, still warm, faintly singing.'],
    ['tanoc15', 'Buhkon will want to see this. …No. I want to make something with this.'],
  ],
  relicObj: 'Examine the Relic in the wall',
  relic: [
    ['tale', 'The runes round the Relic are worn almost smooth. He can make out one of them — Akai Gek.'],
    ['tale', 'He takes a rubbing on a page of his book with a stub of charcoal. Then, carefully, he touches the metal.'],
    ['tale', 'A song burns into his mind. Not heard — known. All at once, as if he’d always had it.'],
    ['tanoc15', 'Ah — !'],
    ['tale', 'He marks the place on his map. He tries to work the Relic free; it will not move. It has been here longer than the wall, and it means to stay.'],
  ],
  campObj2: 'Make camp in the ruins — nothing will come near the Gynge',
  night2: [
    ['sniller', 'A good place to sleep. Nothing will come near something that killed a Gynge. Not tonight.'],
    ['tanoc15', 'Is that a compliment?'],
    ['sniller', 'It is a fact. Compliments come later, if you live.'],
    ['tale', 'The sounds come again in the night — the screech, the bellow, the thin high screaming — each just far enough apart to almost be okay.'],
    ['tanoc15', 'What was it like? Before. Before the Xwi.'],
    ['sniller', 'Loud. Bright. We were the storms between the mountains, and we were glad. …I do not remember all of it. The amulet keeps some of me and lets the rest go.'],
    ['tanoc15', 'I’m sorry.'],
    ['sniller', 'You are the first one who has ever said that. Go to sleep, little one.'],
  ],
  day2: ['Day two.', 'Deeper in.'],
  day2Obj: 'Follow the amulet’s pull deeper in',
  day2Barks: [
    ['sniller', 'Stronger. It pulls stronger now. We are close.'],
    ['tanoc15', 'Wild Punks — and they’re not in the mood to talk.'],
  ],
  eclipse: [
    ['tale', 'In the middle of the day, the light goes. Velki slides across the face of the sun, and all of Xikia darkens at once.'],
    ['tale', 'And in the dim, out of the forest ahead — the screaming. The dark screamers. Close now.'],
    ['sniller', 'There. Go toward it. Quietly.'],
  ],
  hideoutObj: 'Follow the screaming — quietly',
  hideout: [
    ['tale', 'A keep. Small, camouflaged into the forest: four walls, an open courtyard, and at each corner a watchtower grown out of a living tree.'],
    ['tale', 'Duskareth. Their markings burn purple even from here.'],
    ['sniller', 'The ring is in there. It will not go through the Duat — so they hold it here, until they can carry it to their great house the long way.'],
    ['tanoc15', 'Then I’ll carry it out the short way. Up a tree, over the wall.'],
  ],
  climbObj: 'Climb the watchtower tree on the south-west corner (in the mist)',
  watcher: 'Knock out the watcher',
  noticed: [
    ['tale', 'He drops the watcher — and every marking in the keep flares at once. The Duskareth are all joined to one another; one of them goes dark, and all of them know.'],
    ['vel', 'The tree. South-west. Take him.'],
  ],
  fumble: [
    ['tale', 'He tries to go back the way he came. A spear thuds into the trunk by his hand; he lets go, and he falls — badly — into the courtyard.'],
  ],
  fightObj: 'Fight',
  fightBarks: ['They’re too good — they’re all too good—', 'I can’t — I can’t get past them—', 'Ah—!'],
  down: [
    ['vel', 'An apprentice. A child. Bind him.'],
    ['tanoc15', '…Sniller. Sniller, I know you can — please — shut up and HELP.'],
  ],
  emerge: [
    ['tale', 'The amulet at his chest splits with light. Out of it comes the Sniller — not a wisp, not a whisper, but the storm itself: still tethered at the base to the little amulet, and above that, vast. Ancient. One of the greats.'],
  ],
  rout: [
    ['tale', 'It moves through the courtyard like weather. It does not kill them. It puts every one of them down — gently, efficiently, utterly — and leaves them breathing.'],
    ['tale', 'Then it turns back to him, and the wind of it is warm, and the bruises go out of him like a tide going out.'],
    ['sniller', 'Up, little one. Your work isn’t done. Neither is mine.'],
  ],
  searchObj: 'Search the keep — the little church in the north wall',
  master: [
    ['tale', 'Inside the little church, alone: a Ver of the Duskareth, older, the ring on his finger.'],
    ['master', 'You. A boy and a storm. Do you have the least idea what you’ve walked into?'],
    ['tale', 'He strikes — and his blade dissolves in the Sniller’s wind like sugar in rain.'],
    ['tale', 'He tears open the Duat to run — and the Sniller drinks it, the whole opening, the way you’d drink a cup of water.'],
    ['master', 'No — no. Please. I only hold it. I’m only the one who holds it—'],
    ['tale', 'And then his own Zikhron core turns on him. It knows what he has done; it remembers it all; and it will not carry him any more.'],
    ['tale', 'Where he stood there is a Malsti Punk — small, dark, Duat-born, blinking — with the ring sitting on its stem like a crown.'],
  ],
  ringObj: 'Take the ring',
  cantTouch: [
    ['tale', 'The Sniller reaches for the ring. Its wind slides off it, like water off glass. It reaches again. And again.'],
    ['sniller', 'I cannot — I cannot — it is MINE to carry and I cannot—'],
  ],
  ring: [
    ['tale', 'Tanoc picks up the ring.'],
    ['tale', 'A ripple goes out from his hand through the whole keep — and for one moment the Sniller is entirely solid: a great shape of vine and storm and something like a face, looking at him.'],
    ['sniller', 'Carried. It is carried. …There is a law in this, little one. I must grant you one thing, and then my task is done. Ask.'],
  ],
  askText: 'Ask for one thing.',
  askOpts: ['Cleanse this keep — and let no one in but those I allow', 'Let me think a moment…'],
  thinking: [['sniller', 'Think, then. But I will be here, and so will this place.']],
  cleanse: [
    ['tale', 'The Sniller rises through the keep like a breath drawn in. The purple goes out of every stone. Moss comes back to the walls; the watchtower trees put out new leaves; the courtyard is suddenly full of the smell of rain.'],
    ['sniller', 'It is yours. Only those you allow may enter here. The Megla Aagac will keep it for you.'],
    ['tanoc15', 'Mine? A whole — mine?'],
    ['sniller', 'Yours. And the ring links your Relics to you — five at once — wherever they are. You need never carry them again.'],
  ],
  ringGot: 'Relic ring — link up to five Relics to you, wherever they are',
  churchNight: [
    ['tale', 'That night he sleeps in the little church. The Malsti Punk watches him from the rafters for a long time.'],
    ['tanoc15', 'You can come down, you know. Nobody’s going to hurt you. Not here. Not any more.'],
    ['tale', 'By morning it is asleep on his chest, and it does not leave his side again.'],
  ],
  home: ['Home.', 'Down out of the mist, back along the river, back to the Carpenter’s land — with a ring on his finger, a Malsti Punk on his shoulder, and a chip of Gynge rock in his pocket.'],
};

/* home again: the Carpenter shows him how to make his first token, from the Gynge chip */
export const FIRST_TOKEN = {
  back: [
    ['buhkon', 'There he is. And there’s — is that a Malsti Punk on your shoulder?'],
    ['tanoc15', 'It’s a long story.'],
    ['buhkon', 'They usually are. And a ring. And a look on your face like you’ve swallowed a Gynge.'],
    ['tanoc15', '…Funny you should say that.'],
  ],
  findObj: 'Find Buhkon — he’s in the workshop',
  ask: [
    ['tanoc15', 'I brought you something. Well — I brought me something. A chip off a Gynge. From inside its mouth. I want to make a token from it. My own.'],
    ['buhkon', '…Well. Let’s see if you can.'],
    ['buhkon', 'A token is a creature’s truth — one creature, not the kind. Everything it ever was, its whole temper and life, kept in a piece of it.'],
    ['buhkon', 'Three things. A piece of the creature. A little liquid stygian. And its song — sung while the stygian goes in. All of it inside an Okid’Relic, so there’s somewhere for the truth to live.'],
    ['buhkon', 'Here’s my old Okid’Relic. No Hurst in it, no power — it only keeps what it’s given. Go on.'],
  ],
  stepChip: 'Set the Gynge chip in the Okid’Relic (E)',
  chipIn: [['buhkon', 'Good. Settle it. Now the stygian — slowly. Hold it steady and pour.']],
  stepPour: 'Pour the liquid stygian — hold E',
  poured: [['buhkon', 'That’s enough. Now. Do you know its song?'], ['tanoc15', '…I think I do. I think I always have, since the wall.'], ['buhkon', 'Then sing.']],
  stepSing: 'Sing the Gynge’s song — press each note as it reaches the line',
  sang: [
    ['tale', 'The stygian takes the song, and the chip takes the stygian, and inside the Okid’Relic something wakes.'],
    ['tale', 'Light rises off it — and there, the size of his hand, turning slowly in the air: the Gynge. His Gynge. Grinding its great jaw, glaring at the workshop with no eyes at all.'],
    ['buhkon', '…Well, now. Look at that temper. That’s a true one.'],
    ['buhkon', 'Your first token, Tanoc. Made with your own hands, from a creature you met. Nobody else in the world has that one. Nobody else ever will.'],
    ['tanoc15', 'Can I — can I play it? Against Venkin?'],
    ['buhkon', 'You can try. He’ll cheat.'],
  ],
  missed: [['buhkon', 'Lost the thread. Start the song again — it’s still in you.']],
  end: ['End of Chapter II.', 'Tanoc’s first token: the Gynge of the Megla Aagac.'],
  tokenName: 'The Gynge of the Megla Aagac',
};

/* ---------------- Tanoc's Punk: the saddle from Old Ruut, a stall of its own, and a steed ---------------- */
export const STEED = {
  ruutDone: ['All home! You’ve a way with Punks, boy. That young one that trails you about — the mutt from the city? She’ll carry you, one day soon.', 'Here. An old saddle of mine, good leather, cut down small. Take it to the Carpenter. A Punk wants a place of her own before she’ll wear one.'],
  noSaddle: name => `Not without a saddle — ${name} would have me off in a heartbeat. Old Ruut in Beuhk might have one.`,
  bring: 'Take the saddle home — talk to Buhkon about a place for your Punk',
  askBuhkon: name => [
    ['tanoc', `Old Ruut gave me a saddle. For ${name}.`],
    ['buhkon', 'Did he now. That’s good leather. …A saddle’s the last thing, not the first. She’ll want a place that’s hers first: a stall, a roof, somewhere to sleep that smells of her.'],
    ['buhkon', 'You choose where. It’s your Punk. Walk about, find a spot she’d like, and I’ll bring the timber.'],
  ],
  placeObj: 'Choose a spot for the stall — E to build it there, Esc to think again',
  placeHint: 'Flat ground, clear of buildings and water. The frame turns green where it fits.',
  badSpot: ['Too steep there.', 'Something’s in the way.', 'Not in the water!', 'Too close to the house — she’d have the door off.'],
  built: ['Three days of sawing and pegging and arguing about the roof.', 'And then it is done: a stall with her name over it, hay in the corner, and water in the trough.'],
  fit: name => [
    ['buhkon', `Now the saddle. Easy — let ${name} smell it first. That’s it.`],
    ['tale', `The saddle goes on. ${name} turns round twice to look at it, decides it is hers, and sits down in the straw looking very pleased with herself.`],
    ['buhkon', 'Well. Up you get, then.'],
  ],
  steed: name => `${name} is your steed — E to ride, H to whistle her. She’ll carry materials in her saddlebags, and more as she grows.`,
  bagFull: (cap, bag) => bag ? `You can’t carry any more — you and your Punk’s saddlebags are full (${cap}).` : `Your pack is full (${cap}). A saddle with saddlebags on your Punk would carry more.`,
};

/* ================================================================
   CHAPTER I, GO ON — THE TWO SUMMERS
   The first day is the relic, the drills and the glide. Then two
   summers on the Carpenter's land, a season at a time: the first
   jobs in Beuhk, three amulets that walk off on their own, the
   harvest and the festival, a winter night with Rodak at the
   pasture, the amulet's first words, the Punk grown big enough to
   ride, a long ride round the lake, and the lookout, where north
   starts to pull. Then Chapter II.
   ================================================================ */
SPEAKERS.v1 = { name: 'Ama', color: '#e8d8a8', sub: 'a baker' };
SPEAKERS.v2 = { name: 'Teodr', color: '#e8d8a8', sub: 'a farmer' };
SPEAKERS.v3 = { name: 'Lirra', color: '#e8d8a8', sub: 'a lamplighter' };
SPEAKERS.ruut = { name: 'Old Ruut', color: '#e8d8a8', sub: 'Punk herder' };

export const APPRENTICE = {
  /* each step: where it sits in the year, and what the HUD says */
  seasons: ['The first summer', 'The first summer', 'Autumn', 'Autumn', 'Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'The second summer'],

  /* 0 — the first job: three of the Carpenter's pieces, into Beuhk */
  deliver: {
    give: [
      ['buhkon', 'Morning, apprentice. Yes — apprentice. If you’re eating my soup, you’re learning my trade.'],
      ['buhkon', 'First lesson: a carpenter’s work isn’t done when the last peg goes in. It’s done when it’s in the hands of whoever it’s for.'],
      ['buhkon', 'Three pieces, all spoken for. A cradle for Ama the baker — her sister’s due any day. A new tiller handle for Teodr, out by the fields. And a brass lamp hook for Lirra, who lights the town.'],
      ['buhkon', 'Down the forest path, east, into Beuhk. Hand them over yourself. Let them see who carried them.'],
      ['tanoc', 'They’ll stare at me. Everyone stared at me in the market.'],
      ['buhkon', 'They will. Let them. Hat on, chin up, and say “from Buhkon Eldi.” It opens more doors than you’d think.'],
    ],
    got: 'Buhkon’s three pieces — a cradle, a tiller handle and a lamp hook — for Beuhk',
    parcels: {
      v1: { label: 'Give Ama the cradle', item: 'the cradle', lines: [
        ['tanoc', 'From Buhkon Eldi. It’s the cradle. For your sister.'],
        ['v1', 'Oh! Oh, look at the rockers on it. He’s carved little Zahreh flowers into the ends — the old softy.'],
        ['v1', 'And you’re the boy. The one from the market — no, don’t look like that, nobody minds. You’re thinner than they said. Here. A bun. Two buns.'],
      ] },
      v2: { label: 'Give Teodr the tiller handle', item: 'the tiller handle', lines: [
        ['tanoc', 'From Buhkon Eldi. The new handle for your tiller.'],
        ['v2', 'Ash. Good, straight ash, and he’s worn the grip in for me so it won’t blister. That man thinks of everything.'],
        ['v2', 'You’re living up at his place now? Then you’ll know where the Rodak come down in winter. North wood. Mind it, boy, when the snow comes.'],
      ] },
      v3: { label: 'Give Lirra the lamp hook', item: 'the lamp hook', lines: [
        ['tanoc', 'From Buhkon Eldi. Your lamp hook.'],
        ['v3', 'At last! The old one bent in the storm and I’ve been climbing the posts like a Kipsu ever since.'],
        ['v3', 'You know the Nur Lanterns round town? Old ones, cold as stones. They say they only wake for a Nur, or for someone carrying something alive in stygian. …You’re humming. Did you know you’re humming?'],
      ] },
    },
    done: [
      ['buhkon', 'All three? And nobody chased you out of town with a broom. Good.'],
      ['tanoc', 'Ama gave me buns. Teodr said to mind the north wood in winter. Lirra said I was humming.'],
      ['buhkon', 'You were. That stone of yours hums when you’re pleased. …Here. Your first wage. A carpenter’s apprentice gets paid in shards and soup, and the soup is better.'],
    ],
  },

  /* 1 — three amulets walk off in the night */
  amulets: {
    give: [
      ['tale', 'In the morning the bag of amulets is lighter. Not by much. By three.'],
      ['tanoc', 'Buhkon. Buhkon, some of the amulets are gone. The bag was tied — I tied it myself —'],
      ['buhkon', 'They walk. I did tell you. They hum toward something, and if nothing’s holding them they go and look for it.'],
      ['buhkon', 'They won’t have gone far. Not off the land. Push your Nur’Hlyst, the way I showed you — G — and listen for that cold teal note. Three of them. Bring them home.'],
    ],
    hint: 'Press G to pulse Nur’Hlyst — the amulets answer in cold teal. One always climbs somewhere high.',
    found: n => n === 1 ? 'One. Cold, and humming, and not at all sorry.' : n === 2 ? 'Two. This one was halfway into a molehill.' : 'Three. That’s all of them.',
    done: [
      ['buhkon', 'All three. Where was the last one?'],
      ['tanoc', 'Somewhere it shouldn’t have been. They’re all humming the same note again. Like they’re pleased to be back.'],
      ['buhkon', 'Or pleased they found something. …Keep them close, Tanoc. Closer than a bag.'],
      ['tale', 'That summer goes by in sawdust. Planing, pegging, sweeping. Learning which wood splits and which wood bends, and which wood sings when you knock on it.'],
    ],
  },

  /* 2 — autumn: the harvest */
  harvest: {
    cards: ['Autumn.', 'The leaves on the far shore go red first, then the ones by the house. The Ju is ready.'],
    give: [
      ['buhkon', 'Harvest. Every hand on the land pulls Ju — even carpenters, even apprentices who were going to catch the Firefall.'],
      ['tanoc', 'How much Ju?'],
      ['buhkon', 'Eight good ones, from the field below the orchard, southeast of the yard. Bring them to me. If any of them wake up and run off, let them. A Ju that wants to be a Sprengju that badly has earned it.'],
    ],
    obj: n => `Pull Ju from the field southeast of the yard (${n}/8)`,
    done: [
      ['buhkon', 'Eight. Good ones, too. Half for the cellar, half for the festival.'],
      ['tanoc', 'What festival?'],
      ['buhkon', 'Harvest night in Beuhk. Bonfire in the square, Ama’s buns, the whole town out under Velki. And tokens — everybody plays tokens on harvest night.'],
      ['buhkon', 'Venkin will be there. He’s been asking about you. Says he’s never lost a match to a thirteen-year-old and he doesn’t mean to start.'],
    ],
  },

  /* 3 — the harvest festival, and the first match */
  festival: {
    obj: 'The harvest festival in Beuhk — play a match of Dya’Akara in the square',
    hint: 'Talk to Venkin in the square to play. Win or lose — just play.',
    arrive: [
      ['tale', 'Beuhk on harvest night. A bonfire in the market square tall as a house, lanterns strung from roof to roof, and Velki huge and blue over all of it.'],
      ['tale', 'Somebody is playing a pipe. Somebody else is singing the wrong words to it, loudly. The whole square smells of Zahreh buns.'],
    ],
    buhkon: [
      ['buhkon', 'There you are. Go on — find Venkin. He’s the tall one with the pinecone hair and the smug face.'],
      ['buhkon', 'You’ve carried those tokens of yours since Velki. Tonight you get to throw them.'],
    ],
    tokensAsk: [
      ['tanoc', 'Buhkon… where do tokens come from? Mine were just — mine. I’ve always had them.'],
      ['buhkon', 'A token is a creature’s truth. One creature, the whole of it, kept in a piece of it. Somebody met each of yours, once, and sang it into being.'],
      ['buhkon', 'One day you’ll meet something worth keeping, and you’ll make one of your own. Not yet. You’ll know when.'],
    ],
    played: [
      ['buhkon', 'Well! Win or lose, you threw them like you meant it. That’s what tokens are for.'],
      ['tanoc', 'Venkin cheated.'],
      ['buhkon', 'Venkin always cheats. That’s why it’s a good game. …Come on. The bonfire’s still going, and Ama has saved you a bun the size of your head.'],
      ['tale', 'They walk home late, along the forest path, under the glowing trees. The Punk follows a little way behind, chewing a stolen bun, and thinks she isn’t seen.'],
    ],
    homeObj: 'Walk home to the Carpenter’s along the forest path',
  },

  /* 4 — winter: the Rodak come down to the pasture */
  winter: {
    cards: ['Winter.', 'Snow on the land, ice at the edges of the lake. The north wood goes quiet — and then, one night, it doesn’t.'],
    give: [
      ['buhkon', 'Tanoc. Up. Boots on.'],
      ['buhkon', 'Rodak. Out of the north wood, down to the pasture. The snow’s driven the Kofi off and they’re hungry enough to try the herd.'],
      ['buhkon', 'I’ll take the barn side. You take the pasture fence. Fire-stone, hatchet, and stay on your feet — a Rodak only wants you if you’re bleeding.'],
      ['tanoc', 'How many?'],
      ['buhkon', 'Enough. Go.'],
    ],
    obj: n => `Drive the Rodak off the pasture (${n} left)`,
    hint: 'The pasture is north-west of the house. Q throws the fire-stone.',
    retry: [['buhkon', 'Back on your feet? Good. They’re still out there — the pasture, Tanoc. Go on.']],
    again: 'Go back out to the pasture',
    done: [
      ['tale', 'The last of them goes yelping off into the dark, and the rest of the pack goes with it. Rodak never stay to bury their own.'],
      ['buhkon', 'Hah! Not one of the herd lost. Not ONE. You held that fence like an old hand.'],
      ['buhkon', 'Inside. You’re shaking. That’s the cold, and the fight going out of you — sit by the fire till it’s gone.'],
    ],
  },

  /* 5 — that night: the amulet speaks */
  voice: {
    night: [
      ['tale', 'That night, up in the loft, he can’t sleep. The amulet he wears round his neck — the one that hums when he talks to it — is humming now, and he hasn’t said a word.'],
      ['tanoc', '…Are you awake? Can you be awake?'],
      ['sniller', '…'],
      ['tanoc', 'I held the fence. Did you see? I don’t know if you can see.'],
      ['sniller', '…Saw.'],
      ['tale', 'One word. Cold and clear, like a bell under water. He lies very still.'],
      ['tanoc', 'You — you talked. You can talk.'],
      ['sniller', 'Little. A little. Every day — a little more.'],
      ['sniller', 'The stone. On the path. The old house’s stone. Take me.'],
    ],
    obj: 'Take the amulet to the old waystone on the forest path',
    hint: 'The mossy waystone of the House of Eldi, beside the forest path east of the crest. Read it (E).',
    stone: [
      ['tale', 'He holds the amulet up to the mossy waystone. It goes cold in his hand — colder than the snow — and the carved letters under the moss glow, very faintly, teal.'],
      ['sniller', 'Eldi. …I know this name. Old. Older than the Carpenter. Before the Skyfalls.'],
      ['tanoc', 'You knew Buhkon’s family?'],
      ['sniller', 'Knew a storm that knew them. It is… far away, in me. The amulet keeps some. Lets the rest go.'],
      ['sniller', 'Do not tell him I speak. Not yet. He would worry. He worries well.'],
      ['tanoc', '…All right. Our secret.'],
    ],
    back: [
      ['buhkon', 'You’ve been out at the waystone in the snow. Don’t look surprised — your tracks go straight there and straight back.'],
      ['tanoc', 'I just wanted to read it.'],
      ['buhkon', 'Mm. “Leave the toadstools be — they light the way home.” My grandfather carved that. He was a terrible poet.'],
      ['buhkon', 'Spring soon. Your Punk’s nearly as big as a calf. We should talk about that.'],
    ],
  },

  /* 6 — spring: a saddle and a stall */
  spring: {
    cards: ['Spring.', 'The snow goes off the land in one wet week. The Punk has grown all winter, and she has started trying to carry things — firewood, buckets, the Carpenter.'],
    give: name => [
      ['buhkon', `Look at ${name}. She picked me up yesterday. Picked me UP, Tanoc, and carried me to the woodshed, because she thought that was where I was going.`],
      ['buhkon', 'She’s big enough to carry you, and she wants to. That’s the whole of it, with Punks.'],
      ['buhkon', 'Old Ruut in Beuhk has a saddle he might part with — his strays have been wandering again since the thaw. Help him and ask.'],
    ],
    obj: 'Get a saddle for your Punk — Old Ruut, in Beuhk, has one',
    ruutObj: 'Help Old Ruut with his strays — he’s by the Punk pens in Beuhk',
    done: name => [
      ['buhkon', `There. ${name} has a stall of her own and a saddle that fits. Ride her about. Get the feel of her.`],
      ['buhkon', 'And when you can stay on — a long ride. All the way round the lake to the far shore. There’s something there I’d like you to see.'],
    ],
  },

  /* 7 — the long ride round the lake */
  ride: {
    obj: 'Ride round the lake to the far shore — something there Buhkon wants you to see',
    hint: 'E to ride. The far shore is due west, past the end of the lake. Hold Shift to run.',
    notRiding: 'It’s a long way round. Better on Punk-back.',
    found: [
      ['tale', 'On the far shore, half in the reeds, half in the forest: the bones of a boat. A big one. Ribs of fire-tree wood, grey with age, still not burned — fire-tree never burns.'],
      ['tale', 'Carved in the keel, worn nearly smooth: “Eldi I. Built by B., his first. Sank by B., his first also.”'],
      ['tanoc', 'His first boat. He sank his first boat.'],
      ['sniller', 'Sank. And built another. And another. The ship in the sky — the Stryx flies his.'],
      ['tanoc', 'He never said.'],
      ['sniller', 'He shows. He does not say. You are like him in that.'],
    ],
    look: 'Look at the old boat',
    back: [
      ['buhkon', 'You found her. Eldi I. Prettiest boat on Xikia for nearly an afternoon.'],
      ['tanoc', 'You sank your first boat!'],
      ['buhkon', 'I did. And I learned more from that than from every boat since. That’s why I sent you — a first anything is supposed to go wrong. It’s how you find out what you’re made of.'],
      ['buhkon', 'Now. Last thing before summer. Climb up to the lookout rocks on the north hill and tell me what you see.'],
    ],
  },

  /* 8 — the lookout: north */
  lookout: {
    obj: 'Climb the lookout rocks on the north hill, and look north',
    hint: 'The lookout is far up the north hill, past the pasture.',
    see: [
      'From the top of the lookout the whole land is below him: the house, the lake, the far shore, the forest going on and on.',
      'And far to the north, past Beuhk, past the river, past the mountains — a grey shape on the sky that doesn’t move like cloud. Mist. A wall of it.',
    ],
    after: [
      ['sniller', 'There.'],
      ['tanoc', 'What’s there?'],
      ['sniller', 'Something I am for. …Not yet. Soon. When the summer is old.'],
      ['tale', 'The amulet is warm against his chest all the way home.'],
    ],
    back: [
      ['buhkon', 'Well? What did you see?'],
      ['tanoc', 'Everything. And mist, up north. A lot of it.'],
      ['buhkon', '…Mm. The Megla. Don’t go borrowing trouble, Tanoc. It’ll come to you on its own soon enough.'],
    ],
  },

  /* 9 — the second summer: the pull */
  summer2: {
    cards: ['The second summer.', 'Tanoc is fifteen now, a hand taller, and his hatchet swing has stopped being funny. Brindle can outrun anything on the land.', 'And then, as the summer gets old, one of the amulets begins to pull.'],
  },
};

/* the Beuhk folk, the way they talk to a boy who isn't Stamijan yet and hasn't met Phorus */
export const YOUNG_HELLO = {
  hemla: ['Shards for goods, goods for shards. Even for the Carpenter’s boy. Especially for the Carpenter’s boy — he pays his debts.', 'You smell like Punk. That’s not a complaint — it’s a sales opportunity.'],
  ruut: ['Domestic Punks. Gentle as sheep, if sheep had vines.', 'That mutt of yours from the city — she’ll be bigger than mine, one day. You mark me.'],
  v1: ['Fresh Zahreh buns! Well. Fresh-ish.', 'You’re still too thin. Buhkon doesn’t feed you enough. Here.'],
  v2: ['Rodak in the north wood again. They never bother you — till you’re bleeding.', 'Mind the crops, boy.'],
  v3: ['The old Nur Lanterns only wake for a Nur — or for someone carrying something alive in stygian.', 'Glide off the Carpenter’s tower sometime. Everyone does it once. Most people only once.'],
  v4: ['The Stryx won’t fly anyone it doesn’t like. It doesn’t like anyone.', 'Fire trees never burn. Their seeds, though — whoosh.'],
  kw1: ['Mind the scaffold. And mind my boy — if he’s up there, he’s showing off.', 'We build. The Kalo make our hammers. Never the other way round.'],
  venkin: ['Carpenter’s boy! Race you to the square.', 'Father says I’ll have my own hammer when I’m sixteen. Kalo-made. With the cyan in it.', 'Want to lose at tokens again? I’m bored.'],
};
/* the Beuhk quests, told to young Tanoc: no Phorus, no Stamijan, no Duat */
export const YOUNG_QUESTS = {
  q_lamps: {
    desc: 'Lirra wants every Nur Lantern around Beuhk awake again — five in all. They only wake for something with Nur in it, and your humming stone might be enough.',
    offer: ['I light the lamps. But the old Nur Lanterns? They only wake for a Nur, or for something alive in stygian.', 'That stone you carry hums like it’s alive. There are five lanterns round Beuhk — the docks, the square, the yard, the forest road, the grove road. Try it on all of them.'],
  },
  q_crates: {
    offer: ['Lost three crates off the barge in the storm. They’re caught on the rim somewhere — I can see the rope from the pier.', 'Fetch them back and there’s something in it for you. That golden pulse of the Carpenter’s might show you which way.'],
  },
  q_bake: { offer: ['The harvest festival is coming and I have no petals. NO petals, boy.', 'Four Zahreh petals — the pink flowers — and two tufts of Kipsu fluff. The friendly ones shed it if you give them a scratch.'] },
  q_rodak: { wait: ['Still hearing them at night. Three Rodak, boy.'], done: ['Quiet nights again. My grandfather tied this knot for luck. It worked for him. Mostly.'] },
  q_scaffold: { done: ['Up she goes. You’ve a builder’s patience, boy. The Carpenter’s teaching you right.'] },
  q_ore: { done: ['Now THAT’S a fire. Take this one — first blade out of the new cauldron. A real axe, not a carpenter’s hatchet. Don’t tell Buhkon I said that.'] },
};

/* ================================================================
   CHAPTER II, GO ON — more of the Megla Aagac: the rockfall and the
   mist in the pass, wood for the first fire, the carved stones of the
   ruin, the Sru Vorn awake, the patrols round the keep, and the long
   way home to a Punk who waited.
   ================================================================ */
Object.assign(MEGLA, {
  /* the rockfall across the pass — the one that kept him home all Chapter I */
  rockSee: [
    ['tale', 'Halfway up the pass the road simply stops — buried under a rockfall, boulders the size of carts heaped from one wall of the pass to the other.'],
    ['tanoc15', 'The rockfall. It’s been across the pass since the spring before last. Buhkon said nobody’s shifted it.'],
    ['sniller', 'Nobody had a Punk like yours. Ask her.'],
  ],
  rockObj: n => `Clear the rockfall off the road (${n}/4)`,
  rockHint: 'E at a boulder — your Punk hauls it clear. The cracked one wants fire (Q).',
  haul: 'Loop her vines round the boulder',
  hauled: ['She digs her feet in and heaves — and the boulder grinds off the road.', 'Another one, rolled into the river with a splash she seems very proud of.', 'That one took three tries. She doesn’t want to talk about it.'],
  cracked: 'Split already, right through. Something hot might finish it — the fire-stone (Q).',
  crackHit: ['It hisses. The crack spreads.', 'Again — it’s glowing in the crack now.'],
  rockDone: [
    ['tale', 'The last boulder bursts apart in a shower of hot grit, and the road is clear.'],
    ['tanoc15', 'Through! Good girl. Good, good, GOOD girl.'],
    ['punk', '(She is unbearably pleased with herself.)'],
  ],
  rockBlock: 'The rockfall’s across the whole pass. You’d break a leg climbing it — clear the road.',
  /* the mist in the upper pass, and the cairns of the old walkers */
  mistIn: [
    ['tale', 'Then the mist comes down, all at once, the way a door shuts. Ten steps, and the road is gone. Five more, and so is the river.'],
    ['tanoc15', 'I can’t see. I can’t see anything.'],
    ['sniller', 'The old walkers built stones to find the way through. Find the stones, and set one more on each. I will hum when you are close.'],
  ],
  cairnObj: n => `Find the old waymark cairns in the mist (${n}/4)`,
  cairnHint: 'The amulet hums louder as you get close · E to set a stone on the cairn',
  cairnUse: 'Set a stone on the cairn',
  cairnLit: ['A stone on the cairn. The mist ahead thins — a little.', 'Another. The river again, somewhere to the right.', 'Three. You can see the shapes of the pass walls now.', 'Four — and the mist draws back like a curtain.'],
  hum: { near: 'It sings — close. Very close.', warm: 'Louder… this way.', cold: '…quiet. Not this way.' },
  mistBlock: 'The mist is too thick to go on blind. Find the cairns — listen to the amulet.',
  mistOut: [
    ['sniller', 'There. The walkers knew the way. They always did.'],
    ['tanoc15', 'Who were they?'],
    ['sniller', 'People who did not want to get lost. That is most people.'],
  ],
  /* wood for the first fire */
  woodObj: n => `Gather deadwood for the fire (${n}/4)`,
  woodHint: 'Fallen branches along the edge of the clearing · E',
  woodTake: 'Take the deadwood',
  /* the carved stones of the ruin */
  sealObj: (g, s) => `Search the ruins (${g}/3) · read the carved stones (${s}/3)`,
  sealUse: 'Read the carved stone',
  seals: [
    [['tale', 'Carved deep — the letters sharp-edged near the wall, worn nearly away out here:'], ['stone', '“Here the Akai Gek kept the song of the stone, and the stone kept them.”']],
    [['tale', 'A second stone, split down the middle:'], ['stone', '“We gave the Relic our names so it would remember us. It remembers. We are gone.”']],
    [['tale', 'The last, half-sunk in moss, scratched rather than carved, as if in a hurry:'], ['stone', '“Do not wake what sleeps under the hall. It is not cruel. It is only hungry. It is always only hungry.”']],
  ],
  sealsRead: [
    ['tanoc15', '“What sleeps under the hall.” …The drag trail. The Sru Vorn. Something was taking it somewhere.'],
    ['sniller', 'Quietly now, little one. Very quietly.'],
  ],
  /* day two: the Sru Vorn, awake */
  sruWake: [
    ['tale', 'Something big comes crashing through the ferns — the Sru Vorn from the drag trail, awake now, tusks down. It has decided who to blame.'],
    ['sniller', 'It is frightened, and frightened things are the worst. Do not let it pin you — fire, and move!'],
  ],
  sruName: 'SRU VORN · FRIGHTENED',
  sruDown: [
    ['tale', 'The Sru Vorn staggers, snorts, and sags down into the moss — beaten, not dead, breathing hard.'],
    ['tanoc15', 'It wasn’t me. I didn’t drag you. It really wasn’t me.'],
    ['tale', 'When he looks back from the next rise, it has got up, and gone.'],
  ],
  /* the patrols round the keep, in the eclipse dark */
  sneakIn: [
    ['sniller', 'They walk the wood around the keep — three of them. If one sees you, they all will. Stay out of their sight. Go slowly. Running is loud.'],
    ['tanoc15', '(Tree to tree. Quiet. Quiet.)'],
  ],
  sneakObj: 'Sneak past the Duskareth patrols to the keep',
  sneakHint: 'The purple light ahead of each Vel is where it looks · walk — Shift is loud',
  spotted: [
    ['tale', 'A Vel turns. Its markings flare —'],
    ['sniller', 'NO. Not yet.'],
    ['tale', 'The amulet goes cold, and the world blinks, and you are back among the trunks where you started, unseen. Something in the dark is breathing very hard. It’s you.'],
  ],
  spottedAgain: [['sniller', 'Again. Slower. Wait for them to turn.']],
  sneakDone: [['tanoc15', '(Made it. Made it. Don’t breathe.)']],
  /* day three: the way home */
  morning3: ['Morning.', 'The keep is quiet, and green, and his.'],
  home1: [
    ['tanoc15', 'Home, then. …Oh no. She’s been sitting by that fire for two days.'],
    ['malsti', '(It chirps, from his shoulder. It sounds like a question.)'],
    ['tanoc15', 'You’ll like her. She’s big, and she’ll sit on you, and you’ll like her.'],
  ],
  homeObj: 'Go back to the clearing — your Punk is waiting',
  lineBack: [
    ['tale', 'At the line in the moss the Rodak are waiting. They don’t get up this time. They watch him go by, one after another — and the biggest of them lowers its head.'],
    ['sniller', 'They saw the storm come out of you. You are one of the things that comes after, now.'],
  ],
  reunion: [
    ['tale', 'The fire at the clearing is long out, but she’s there — curled round the cold stones, exactly where he left her.'],
    ['tale', 'She hears him, and she is up and across the clearing in three bounds, and he is flat on his back in the grass with a Punk on top of him.'],
    ['tanoc15', 'Ow — I KNOW — I know, I’m sorry, I’m sorry. I’m back. I said I’d come back.'],
    ['punk', '(She will forgive him in a day or two. Not before.)'],
    ['tale', 'The Malsti Punk looks at her for a long moment, and then climbs up onto her saddle and goes to sleep.'],
  ],
  rideHomeObj: 'Ride home — south, down the pass',
  rideHomeBarks: [
    ['sniller', 'Lighter. The amulet is lighter. The task is done.'],
    ['tanoc15', 'Will you still talk to me? Now it’s done?'],
    ['sniller', 'Try and stop me, little one.'],
  ],
});

/* ================================================================
   THE BEGINNING, GO ON — the afternoon before the last Skyfall: supper
   for the Ahoac gate crew, and their spark drill
   ================================================================ */
SPEAKERS.mother = { name: 'Odda', color: '#e8c8a8', sub: 'keeps the foundling house, Fyrsti’Vilag' };   // Tanoc is an orphan: Odda raised him with the other foundlings
SPEAKERS.captain = { name: 'The Ahoac captain', color: '#ffb46a', sub: 'the north gate crew' };
PROLOGUE.before = {
  mom: [
    ['mother', 'Tanoc! There you are. No — don’t tell me where you’ve been. You’ve soot on your nose. I know exactly where you’ve been.'],
    ['mother', 'The Skyfall starts at dark, and the gate crew have been drilling since noon without a crumb. I’ve baked for them, same as every year. Take them this. Straight there, straight back.'],
    ['tanoc', 'The Ahoac? I can go to the Ahoac yard?'],
    ['mother', 'You can carry a basket to the Ahoac yard. You can not do anything else at the Ahoac yard. And you’ll be back at the house before the first spark — the little ones will want you at the window. Promise me.'],
    ['tanoc', 'I promise.'],
    ['tale', 'He means it. Mostly.'],
  ],
  basketObj: 'Take the supper basket to the Ahoac crew at the gate yard',
  basketHint: 'North, up the main street toward the gate',
  talkCrew: 'Give the Ahoac their supper',
  crew: [
    ['captain', 'Supper! Bless Odda and her ovens, Filugani. Put it down, put it down — not on my boots.'],
    ['tanoc', 'Can I watch the drill? Just watch. I won’t touch anything.'],
    ['captain', 'Watch? Nobody ever learned to catch by watching.'],
    ['captain', 'Tell you what. Hosk up on the gate tower drops practice sparks — clay, dipped in glow. Catch five before they hit the cobbles and you can stand at the yard wall tonight, with the crew.'],
    ['captain', 'Look for the shadow. A spark lands where its shadow is. Get under it, and keep your hands up.'],
  ],
  drillObj: n => `Catch the practice sparks before they land (${n}/5)`,
  drillHint: 'Get under the shadow ring before the spark comes down',
  caught: ['Got it!', 'Two!', 'Three — it stings!', 'Four!', 'FIVE!'],
  missed: ['Too slow!', 'It smacks into the cobbles. The captain winces.', 'Look for the shadow, Filugani!'],
  again: [['captain', 'Again! The Firefall won’t wait for you to find your feet.']],
  done: [
    ['captain', 'Five! Not bad. Not bad at all, for a boy in somebody else’s boots.'],
    ['captain', 'But I lied, a little. Tonight nobody who isn’t crew stands at the yard wall. Not this Skyfall. The sky’s wrong tonight — even the old ones say so.'],
    ['tanoc', 'That’s not fair!'],
    ['captain', 'No. It isn’t. Go home, Filugani. Watch it from the street. Come back when you’re fifteen and we’ll see about real boots.'],
    ['tale', 'He turns to go. Behind him, somebody clears their throat.'],
    ['captain', 'Filugani. Wait. …That was a rotten thing to do to you, and I did it anyway. Here.'],
    ['tale', 'The captain pulls a rolled bundle off the rack by the yard door: rust-red cloth, brass at the collar, cord loops for the wrists.'],
    ['captain', 'A glide cloak. Standard issue — every Ahoac gets one; it’s how we come down off the towers without breaking our legs. That one’s a spare. Call it an apology.'],
    ['captain', 'Jump off something, spread your arms, and HOLD — let the cloth take the wind. Something low, Filugani. Low.'],
    ['tanoc', '…A real Ahoac cloak.'],
    ['captain', 'A real one. Now go home before I change my mind.'],
    ['tale', 'Bells start ringing all across the city. The sun touches the sea.'],
  ],
};

/* ================================================================
   THE ROAD NORTH, GO ON — a mended axle in the rain on day three, and
   supper to fetch in Beuhk on day five
   ================================================================ */
SPEAKERS.hemla = { name: 'Hemla', color: '#e8d8a8', sub: 'Kalo’Eik trader' };
Object.assign(ROAD.day3, {
  axle: [
    ['tale', 'In the night the rain got into the cart’s old axle. In the morning one wheel is lying flat in the mud.'],
    ['buhkon', 'Well. That’s the day decided. Three straight saplings, Tanoc — ash, the pale bark, about as thick as your thumb. I’ll show you how a carpenter mends a thing in the rain.'],
  ],
  axleObj: n => `Cut three straight saplings for the axle (${n}/3)`,
  axleHint: 'Pale-barked ash saplings round the camp · swing the hatchet at them (left-click)',
  axleCut: 'Cut the ash sapling',
  axleCuts: ['One. Straight as a spear.', 'Two. This one had a Kofi under it. It is not pleased.', 'Three — that’s enough.'],
  axleBring: 'Bring the saplings to the Carpenter at the cart',
  axleMend: [
    ['tale', 'He shows you how: split, peg, bind — and bind again with wet Punk vine that tightens as it dries.'],
    ['buhkon', 'There. It’ll hold to Beuhk. Most things will hold to Beuhk if you ask them nicely.'],
    ['tale', 'Then the two of you sit under the cart’s oilcloth, out of the rain, and he talks.'],
  ],
});
Object.assign(ROAD.day5, {
  errand: [
    ['buhkon', 'But a boy has to eat first. Supper: a loaf from Ama the baker, by the square — and ask Hemla, the Kalo trader, for a lamp-wick. We’ll want light on the hill.'],
    ['buhkon', 'Hat on. Say “for Buhkon Eldi,” and nothing else.'],
  ],
  errandObj: n => `Fetch supper for the Carpenter (${n}/2)`,
  errandHint: 'Ama the baker, and Hemla the Kalo trader',
  ama: [
    ['tanoc', 'A loaf, please. For Buhkon Eldi.'],
    ['v1', 'For Buhkon! Then it’s two loaves, and a bun for you, and don’t argue. …You’re the — no. No, never mind. Here.'],
  ],
  hemla: [
    ['tanoc', 'A lamp-wick. For Buhkon Eldi.'],
    ['hemla', 'For Buhkon, the wick is free, and so is the advice: walk fast tomorrow, little one. This town has long tongues, and today they’re all wagging about a hatless boy.'],
  ],
  errandBack: [['buhkon', 'Bread, a wick, and a bun you thought I wouldn’t notice. Good. Eat. Sleep. We go at first light.']],
  back: 'Back to the Carpenter at the town hearth',
});

/* ================================================================
   THE ESCAPE FROM FYRSTI'VILAG — the first amulet he picks up blinks
   him clean across the city. Buhkon takes the cart to the north gate
   to wait. Tanoc has to cross the whole panicking city to reach him,
   gathering amulets on the way: off the cobbles, out of a Kipsu's
   mouth, out of a cracked wall, from a frightened mother, from a
   looter's fist, out of the Stryx's mud fountain — past the city
   guards and a Duskareth agent who wants them all.
   ================================================================ */
SPEAKERS.guardX = { name: 'City guard', color: '#d8c090', sub: 'Fyrsti’Vilag, Xikia' };
SPEAKERS.looter = { name: 'Looter', color: '#c8a888', sub: 'with his pockets full' };
SPEAKERS.mother2 = { name: 'A frightened mother', color: '#e8c8a8', sub: 'in the panic' };
SPEAKERS.kid = { name: 'Her boy', color: '#e8d8b0', sub: 'hiding' };
SPEAKERS.agent = { name: 'Duskareth agent', color: '#b070ff', sub: 'a Vel, in the crowd' };
export const ESCAPE = {
  need: 12,
  plan: [
    ['buhkon', 'I’ll take the cart round to the north gate before they shut it. Meet me there. Don’t dawdle, and don’t let anyone take that bag off you.'],
  ],
  blink: [
    ['tale', 'His fingers close on the amulet — and it closes back. The world folds. White. Then wind, and planks under his feet, and a very long way down.'],
    ['tanoc', 'That’s — I’m UP the home tree. The TOP deck. That’s the whole city between me and the gate.'],
    ['tale', 'Far off to the north, past street after street of roofs, he can just see the gate towers. Below him the great stair winds down and down round the bark.'],
    ['tanoc', '…Right. Down. North. Get the amulets. Get to the gate. Don’t let anyone take the bag.'],
  ],
  obj: n => `Cross the city to Buhkon at the north gate — gather amulets on the way (${n}/12)`,
  hint: 'Down the great stair round the bark — it goes on down through a gap in each deck — then north to the gate towers. Amulets glow cold teal.',
  rootsAmulet: 'Pull the amulet out from between the roots',
  cartAmulet: 'Pick the amulet out of the spilled cart',
  wellAmulet: 'Fish the amulet out of the well bucket',
  benchAmulet: 'Take the amulet off the garden bench',
  stray: 'There — another one, rolled out from under a doorstep. Lucky.',
  agentDrop: 'The Vel is simply not there any more — and the amulets it took fall out of nothing and ring on the cobbles.',
  kipsuSee: 'A Kipsu with something teal in its mouth — it’s got an amulet!',
  kipsuDrop: 'It spits the amulet out and bolts.',
  wall: 'Hack at the cracked wall (left-click)',
  wallSee: 'An amulet, driven right into a garden wall by the blast. The stone round it is cracked.',
  wallHits: ['Chips fly.', 'The crack runs wider —'],
  wallBroke: 'The wall gives way, and the amulet drops out into your hand.',
  mother: [
    ['mother2', 'Please — my boy, he ran when the sky cracked. He had one of those — those things, and he ran. Please.'],
    ['tanoc', 'I’ll find him. What does he look like?'],
    ['mother2', 'Small. Green cap. He hides when he’s scared — in corners, behind things.'],
  ],
  motherAsk: 'Talk to the frightened mother',
  kidFind: 'Find her boy — he hides in corners, behind things',
  kidSee: 'Talk to the boy behind the barrels',
  kidTalk: [
    ['kid', 'Go away. It’s mine. It was in the road and it’s MINE.'],
    ['tanoc', 'Your mum’s looking for you. She’s scared. Come on — I’ll walk you back.'],
    ['kid', '…Can I hold your hand?'],
  ],
  kidBack: 'Walk the boy back to his mother',
  kidHome: [
    ['mother2', 'Oh — oh, there you are, there you are —'],
    ['kid', 'He found me. He has a bag with lots of them in.'],
    ['mother2', 'Then he can have this one too. I don’t want it in my house. Thank you. Go — go on, before the guards come.'],
  ],
  looterSee: 'Snatch the amulet from the looter',
  snatched: [['looter', 'Oi! OI! That’s mine, you little — get him!']],
  looterDown: ['He goes down hard, and decides it isn’t worth it.', 'That one scrambles off over a cart.', 'The last of them runs.'],
  guardSeen: [['guardX', 'You! Boy — those are city property now. Hand it over.']],
  guardTook: 'The guard takes one amulet off you and shoves you back the way you came.',
  guardHint: 'City guards are taking the amulets — keep out of their sight (the gold light is where they look)',
  fountainSee: 'An amulet, glinting in the Stryx’s mud fountain',
  fountainGrab: [
    ['tale', 'He steps over the lip of the basin — and the mud moves. The Stryx’s vines come up out of it and close round his legs, his waist, his arm.'],
    ['tanoc', 'Let GO — I just want the — let go!'],
  ],
  fountainObj: n => `Cut yourself free of the Stryx’s vines — left-click (${n}/4)`,
  fountainFree: 'The last vine parts. You stagger out of the basin with the amulet in your fist and mud to the knees.',
  agentSee: [
    ['tale', 'In the crowd ahead something does not move like the crowd. A tall shape in dark cloth, purple marks along its arms. It looks straight at the bag.'],
    ['agent', 'Children shouldn’t carry what they can’t keep.'],
    ['tanoc', '(Run.)'],
  ],
  agentHint: 'A Duskareth agent — too strong to fight. Outrun it (Shift) and keep moving.',
  agentCaught: 'The Vel’s hand closes on the bag — one amulet is gone — and you tear free.',
  agentMiss: 'The Vel’s hand closes on the bag again — and comes away empty. It has all it can carry. You tear free.',
  agentLost: 'The Vel stops at the edge of the crowd near the gate, and simply isn’t there any more.',
  short: n => `Buhkon: “${n} — that’s all? There are more out there, Tanoc. Twelve at least. Go — quick.”`,
  gate: [
    ['buhkon', 'There you are! I saw the flash from here — I thought — never mind what I thought. How many?'],
    ['tanoc', 'Enough. Buhkon, the first one I touched threw me right across the city.'],
    ['buhkon', '…Did it, now. Up on the cart. Tell me the rest on the road. North — home, six days. Go!'],
  ],
};

/* ================================================================
   THE TWO SUMMERS, GO ON — Venkin, and the amulet research.
   Young Venkin is a Keilia about Tanoc's age, apprenticed to his
   father Orrin, the builder. The two boys raise the storehouse in
   Beuhk, sneak off to the north-shore cave, and join the Carpenter's
   research into the amulets: tests at the bench, asking people who
   know, talking to the Sniller, and a field trip to an old Sniller
   site. What they learn: the Snillers are cursed; each has tasks it
   cannot name, more than one; and there is a way to count how many
   a Sniller has left. (The test results are inventions — change them
   freely.)
   ================================================================ */
SPEAKERS.kw1 = { name: 'Orrin', color: '#e0b070', sub: 'Keilia builder, Venkin’s father' };
SPEAKERS.venkinY = { name: 'Venkin', color: '#e0b070', sub: 'young Keilia, Orrin’s apprentice' };
Object.assign(APPRENTICE, {
  seasons: ['The first summer', 'The first summer', 'The first summer', 'The first summer', 'Autumn', 'Autumn', 'Autumn', 'Winter', 'Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Spring', 'The second summer'],
  /* raising the storehouse, with Orrin and his boy */
  build: {
    give: [
      ['buhkon', 'Orrin the builder is raising a storehouse by the square in Beuhk before the winter. I promised him a carpenter for the roof beams. That’s you.'],
      ['buhkon', 'His boy Venkin is about your age. Keilia — taller than you already, and he’ll tell you so. Try not to fight. Or do, and then shake hands.'],
    ],
    obj: 'Help Orrin and Venkin raise the storehouse in Beuhk — find Venkin by the square',
    meetLabel: 'Meet Orrin’s boy',
    meet: [
      ['venkinY', 'You’re the Carpenter’s boy. The one from the market. Everyone says you fell out of the sky.'],
      ['tanoc', 'I didn’t fall. I was — it’s complicated.'],
      ['venkinY', 'Everything’s complicated if you’re not a Keilia. Come on. Father wants six cut stones and four strips of fire-tree bark before we can raise the frame. I’ll race you for it.'],
      ['kw1', 'And no racing near the quarry heaps. Venkin. VENKIN.'],
    ],
    raised: [
      ['tale', 'Two days of hauling, one of pegging. Orrin calls the beams up one at a time, and two boys on the scaffold catch them, swear at them, and drop exactly one.'],
      ['kw1', 'Up she goes! You’ve good hands, Carpenter’s boy. Better than his, and don’t tell him I said so.'],
      ['venkinY', 'I heard that.'],
      ['venkinY', 'Tanoc. Come back tomorrow? There’s a Kipsu den by the mill and I need someone to hold the sack.'],
    ],
    back: [
      ['buhkon', 'Orrin says you didn’t fall off anything. High praise, from a Keilia.'],
      ['tanoc', 'Venkin wants me to help him with a Kipsu den.'],
      ['buhkon', 'Of course he does. Good. A boy needs someone to get into trouble with. Mind you come home with all your fingers.'],
    ],
    youngQuest: {
      desc: 'Orrin and his son Venkin are raising a storehouse by the square for the winter Ju. Bring cut stone from the quarry heaps and fire-tree bark from the old logs.',
      offer: ['Father wants six cut stones and four strips of fire-tree bark before we raise the frame.', 'The quarry heaps are free for the taking. The bark comes off the old fire-tree logs. Race you.'],
      wait: ['Six stone, four bark. I’ve got two stones already. Hurry up.'],
      done: ['That’s the lot! Father — FATHER — we can raise it!', 'Here. A stone I found in the quarry with a hole right through it. Breath stone, Father calls it. You can have it.'],
    },
  },
  /* tests at the bench */
  tests: {
    give: [
      ['buhkon', 'Now. Those amulets. They walk, they hum, they find their way back to you. I’d like to know why.'],
      ['buhkon', 'Bring the bag to the bench. We’ll try them against everything we’ve got and write down what they do. That’s what research is: trying things, and writing it down.'],
    ],
    obj: n => `Test the amulets at the bench with Buhkon (${n}/5)`,
    menu: 'Which test next?',
    list: {
      water: { label: 'Set one in a bowl of well water', lines: [
        ['tale', 'He sets an amulet in a bowl of cold well water. Frost spreads out from it in a spiral, turning the way a storm turns, until the whole bowl is a little frozen whirlpool.'],
        ['buhkon', 'Storm-stuff. Even sealed up in stone, it remembers being weather.'],
      ] },
      fire: { label: 'Hold the fire-stone up to one', lines: [
        ['tale', 'He holds the fire-stone close to an amulet. The Hurst inside the stone goes absolutely silent. Then, very quietly:'],
        ['hurst', '…don’t like it. It’s BIG in there. Much bigger than it looks. Put it away put it away put it away.'],
      ] },
      ore: { label: 'Touch one to stygian ore', lines: [
        ['tale', 'He touches an amulet to a lump of stygian ore. The ore hums back a different note — and for one heartbeat Tanoc is somewhere else: a sky full of wings and light, and a voice he doesn’t know shouting a name he doesn’t know.'],
        ['tanoc', 'I — I saw something. That wasn’t mine. That wasn’t my memory.'],
        ['buhkon', 'Zikhron. The ore remembers what the amulet keeps. …Careful with that one, Tanoc.'],
      ] },
      hlyst: { label: 'Push Nur’Hlyst through the bag', lines: [
        ['tale', 'He pushes Nur’Hlyst through the bag. Every amulet answers — but not together. One pulses three times. Another, only once. One of them pulses seven times, then won’t stop humming.'],
        ['buhkon', 'Counting. They’re counting something. Write it down — three, one, seven.'],
      ] },
      pair: { label: 'Set two side by side', lines: [
        ['tale', 'Two amulets laid side by side turn on the bench like compass needles — first toward each other, then slowly away, each toward a different wall.'],
        ['buhkon', 'Different directions. Different… somethings. Each one of them wants to go somewhere of its own.'],
      ] },
    },
    done: [
      ['buhkon', 'Five tests, five answers, and not one of them a straight one. That’s amulets for you. We’ll keep at it — and we’ll want people who know more than we do.'],
    ],
  },
  /* the north-shore cave, at night, with Venkin */
  cave: {
    give: [
      ['buhkon', 'Venkin’s here. Came up the path asking for you, and he has the look of a boy with a bad idea. He’s by the barn.'],
    ],
    meetLabel: 'Talk to Venkin',
    meet: [
      ['venkinY', 'There’s a cave on the north shore of your lake. Everyone in Beuhk says something lives in it. Something that hums.'],
      ['tanoc', 'Buhkon said not to go up the north shore after dark.'],
      ['venkinY', 'Buhkon says a lot of things. Tonight, when he’s asleep. Bring your amulets. If they hum at it, we’ll know.'],
      ['tale', 'That night, very quietly, two boys go down the lane past the dock, and along the north shore of the lake.'],
    ],
    obj: 'Sneak along the north shore with Venkin to the cave',
    hint: 'The cave mouth is on the north shore of the lake, west of the pasture',
    inside: [
      ['tale', 'Inside the cave mouth the rock is wrong — melted and run together, shining like black glass. A ring of it, as if lightning had stood here for a whole night.'],
      ['venkinY', 'Storm-glass. Father says it only happens when the sky comes right down to the ground.'],
      ['tale', 'Every amulet in the bag is humming at once. And from the dark at the back of the cave, something hums back — and a lot of small eyes open.'],
      ['venkinY', 'Kipsu! It’s a den — they’ve been sleeping on it — they’re — RUN — no, fight —'],
    ],
    fightObj: n => `Drive off the cave’s Kipsu (${n} left)`,
    caught: [
      ['tale', 'The last Kipsu bolts past them into the night. In the silence after, a lantern comes up the shore.'],
      ['buhkon', 'Out. Both of you. Now.'],
      ['venkinY', 'It was my idea, Carpenter. Not his.'],
      ['buhkon', 'I know it was your idea, Venkin. I can tell your ideas by the smell.'],
      ['tale', 'But he stops in the cave mouth, and holds the lantern up to the storm-glass for a long time, and says nothing. In the morning, a piece of it is on the workshop bench.'],
    ],
  },
  /* asking people who know */
  sources: {
    give: [
      ['buhkon', 'We’ve tried them against everything on the land. Time to ask people who know more than I do.'],
      ['buhkon', 'Hemla, in Beuhk — the Kalo hear stories across three Tatu. And Lirra the lamplighter knows the old lantern lore better than anyone.'],
      ['tanoc', '(…And there’s one more I can ask. One he doesn’t know about.)'],
    ],
    obj: n => `Ask people who know about the amulets (${n}/3)`,
    hint: 'Hemla and Lirra, in Beuhk — and the amulet itself, at the old waystone',
    askLabel: 'Ask about the Sniller amulets',
    hemla: [
      ['hemla', 'The Kalo have a word for those. “Sealed weather.” My grandmother’s ship once carried a crate of them across the Kalo sea.'],
      ['hemla', 'Every night the crate hummed a little louder. On the last night it was quiet — and one of them was gone, and the crate still nailed shut.'],
      ['hemla', 'The Kalo say the Xwi never killed the Snillers. They cursed them: sealed them into stone until they’re needed. Needed for what, nobody ever says.'],
    ],
    lirra: [
      ['v3', 'The old Nur Lanterns? There’s a story they were first lit by Snillers, long before the war. A Sniller would light one to mark a place it meant to come back to.'],
      ['v3', 'So if your amulets are Snillers… then each of them has places it means to go back to. Things to finish.'],
    ],
    sniller: [
      ['sniller', 'Cursed. Yes. That is the word. The Xwi spoke it, and we became stone.'],
      ['sniller', 'Each of us has tasks. Things we must do before we can be… finished.'],
      ['tanoc', 'What tasks? What’s yours?'],
      ['sniller', 'I do not know. I can feel one in front of me, the way you feel a stone in your boot. I cannot see it yet.'],
      ['sniller', 'And more after it. Not one. More.'],
    ],
    snillerLabel: 'Hold the amulet to the waystone, and ask',
    back: [
      ['tanoc', 'Hemla says the Xwi cursed them, not killed them. Lirra says each one has places it means to go back to.'],
      ['buhkon', 'Cursed, sealed, and waiting with somewhere to be. And each one more than one somewhere, if those counts mean what I think.'],
      ['buhkon', 'Spring soon. Your Punk’s nearly as big as a calf. We should talk about that.'],
    ],
  },
  /* the field trip: the storm-glass ring in the forest hollow */
  hollow: {
    give: [
      ['buhkon', 'Your amulet’s been pulling toward the forest hollow all week — the one at the edge of the north woods. Let’s follow it a little way, the three of us, and see what’s there.'],
      ['venkinY', 'Three of us? I’m coming? Father said I could? …Father said I could.'],
    ],
    obj: 'Follow the amulet’s pull to the forest hollow at the edge of the north woods',
    hint: 'The hollow is far north-west of the house, where the woods begin',
    pulse: 'Pulse Nur’Hlyst (G) in the middle of the ring',
    found: [
      ['tale', 'In the bottom of the hollow, under the moss, a ring of storm-glass — a big one, half buried, older than the trees around it.'],
      ['venkinY', 'Another one. Like the cave. Only huge.'],
      ['buhkon', 'A Sniller stood here once. A long time. Go on, Tanoc — your golden pulse, right in the middle of it.'],
    ],
    result: [
      ['tale', 'The Nur’Hlyst goes out of him and comes back changed — rung like a bell by the storm-glass. Every amulet in the bag answers with its count of pulses, slow and clear, and this time he understands them.'],
      ['sniller', '(very quietly, so only he hears) Tasks. That is how many are left.'],
      ['tanoc', 'Buhkon — the pulses. It’s how many tasks each one has LEFT. That one has three. That one, one. That one, seven.'],
      ['buhkon', '…Then we can count them. Every amulet, every task it has still to do. We can’t say what the tasks are. But we can say how many.'],
      ['tale', 'The storm-glass is warm when they leave, and for a whole night afterwards the ring glows faintly through the moss.'],
      ['venkinY', 'I’m telling Father I discovered it.'],
    ],
  },
});
/* the festival, now that Venkin's a friend */
APPRENTICE.harvest.done[3] = ['buhkon', 'Venkin will be there — Orrin says the boy has been practising his throws all summer just to beat you. He’s never lost a match on harvest night, and he doesn’t mean to start.'];
APPRENTICE.tests.done.push(APPRENTICE.amulets.done[3]);
