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
    ['buhkon', 'An Ahoac has to fall well, too. Climb the tower, jump, and HOLD Space as you fall. Arms out — let the wind take you.'],
  ],
  glided: [
    ['buhkon', 'Like a seed on the wind! Come back down and talk to me.'],
  ],
  end: [
    ['buhkon', 'That’s enough for one day. You’ll stay — for as long as you want to. There’s a lot to learn, and I’d rather you learned it here than out there.'],
    ['tanoc', 'Buhkon… the Xwi. The Sniller. They all looked at me. Why?'],
    ['buhkon', 'Because of what you are. And that is a long story, and you have a long time to hear it.'],
    ['buhkon', 'For now: the land’s yours, all of it, and the town along the path. Meet people. Help where you can. Keep those amulets close — and keep your hat on.'],
  ],
  stryx: [['stryx', 'An Eikar boy with somebody else’s hat. Not a passenger. Come back when you have a name of your own.']],
  buhkonIdle: [
    'Explore. Help folk. Keep your hat on.',
    'That tower will hold books one day. Yours, maybe.',
    'The Relic still humming? Good. Talk to it. They like that.',
    'Sniller amulets wander. Use your Nur’Hlyst — they glow cold teal.',
  ],
  pass: 'Rockfall across the Megla Pass — and Buhkon said three days of mist past it. Not today.',
  chapterEnd: 'Chapter I ends here — more of Tanoc’s story is coming. Until then, the property and Beuhk are yours.',
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
      ['buhkon', 'Go on, Tanoc. Young legs. I’ll steady the axle.'],
    ],
    wheelGot: 'A cart wheel, nearly as tall as you. You roll it back toward the road.',
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
    ],
    splash: ['COLD! Cold cold cold —', 'Ahh! It’s like ice!', 'Buhkon is laughing. You can hear him laughing.'],
    across: [['buhkon', 'Dry feet. More or less. On to camp.']],
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
    cart: 'Find the family’s cart wheel in the field',
    cartBack: 'Roll the wheel back to the cart',
    log: 'Chop through the fallen pine (three swings)',
    stream: 'Cross the ford on the stepping stones',
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
    ['tale', 'Two summers go by on the Carpenter’s land. Tanoc grows a hand taller. The Punk grows a great deal more than that.'],
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
