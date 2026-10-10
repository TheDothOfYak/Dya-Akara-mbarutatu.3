/* ============================================================
   TORCAIN'S RUN — all the words of the game.
   Drawn from the Rokarvac: Noka has been carried off to a new
   mountain again and left a riddle. Tanoc — Torcain, now that he
   is Stamijan — and his friend Phorus, a Kalo'Eik and a Nur, set
   out from Xilia on Xikia, where the Carpenter Buhkon Eldi once
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
  'So Torcain goes home first — to Xilia, and to the Carpenter who taught him everything.',
];

/* ---------------- Xilia: the prologue ---------------- */
export const XILIA = {
  kicker: "Torcain's Run · Prologue",
  title: 'Home to Xilia',
  intro: [
    ['phorus', 'Xilia! Fresh bread, warm hearths, Punks that don’t want to eat us. I could live here, Torcain.'],
    ['torcain', 'You say that about every town with an oven.'],
    ['phorus', 'And I mean it every time. So — the riddle. "Where the city swore and the swearing stung, five cores still hum." That’s Aakalay.'],
    ['torcain', 'Aakalay’s a ruin. Nobody’s sailed there in a lifetime.'],
    ['phorus', 'Then we’ll need a ship, and you’ll need your arm back. You’ve been carrying that axe like a shopping basket.'],
    ['torcain', 'Buhkon will set me right. His yard is south-east of the square, by the docks road.'],
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
    ['stryx', 'Tyndaels. Spark-lizards. They spit; you move. I have calculated that you will move most of the time.'],
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
    'Xilia falls behind — smoke from the chimneys, Buhkon waving from his tower.',
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
};

export const DIALOG = {
  arrive: [
    ['phorus', 'Three days hiking, two on Punks that wanted to eat us, and not one hot meal since Xilia. You owe me, Torcain.'],
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
    ['torcain', 'An Eikar named Kiet, and his Dya’Can, on a great Nekh’Vorran — Kireo’Nik. They came to duel the Master of the Keep. They broke the stone’s hold.'],
    ['torcain', 'But the Master got out. Changed. A Keilia — the cores have his name cut out of them. Kiet’s people called him Otlið.'],
    ['phorus', 'And the Duat seedling that grew where he fell. The Megla Aagac we just cut down. And the Malsti Punk that ran.'],
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
  boss: 'Cut the Oath-Rooted loose',
  done: 'Rokarvac I complete — explore, or return to the ship',
  xilia: {
    talk: 'Speak with Phorus on the pier',
    buhkon: 'Find Buhkon the Carpenter in his yard, south-east of the square',
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
  ['Megla Aagac', 'What a Duat Seedling most often grows into. In Aakalay, one grew where the Master of the Keep fell.'],
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
  ['Xilia', 'A farming town of acorn-cap cottages, fields of Ju, and a windmill that never stops. Torcain grew up here, after Buhkon found him.'],
  ['Buhkon Eldi', 'The Carpenter. He builds ships, sheds and cradles, and once mended a boy who fell across Eternal Space. Torcain’s first Aagac came from his hands.'],
  ['Training dummy', 'Straw, sacking and a turnip for a head. Buhkon has a great deal of straw.'],
  ['Xikia', 'Second largest of the three Tatu, with nine continents. Xilia is on Xikia — and so, a long and dangerous walk away, is Aakalay.'],
  ['Leotik', 'Smallest of the Mbaru Tatu: six and a half continents, mostly unexplored, and home to an absurd number of poisonous and venomous things.'],
  ['Venkin', 'A young Keilia from a family of builders in Xilia, a few years younger than Torcain, and hopelessly obsessed with the token game.'],
  ['Keilia', 'Builders without equal. The Kalo make their hammers; a Keilia who takes a hammer to war is banished, so Keilia weapons are passable at best.'],
  ['Nur’Hlyst', 'Perception through the Hurst: a golden pulse that makes hidden things answer. Buhkon taught it to Torcain. (G)'],
  ['Sniller amulets', 'A large round gem between two curved horns, cold teal. Snillers were cursed into them when the Angels left. They hum toward old memory vaults.'],
  ['Kofi Galta', 'A crescent-shaped little thing with blade-like spines and a fluffy dark tail. Breeds like bunnies, found everywhere, eaten by basically everything — so it runs from basically everything.'],
  ['Nur Lantern', 'Phorus can wake a Nur-light in an old lantern. Rest beside one to heal, refill the Albali film, and spend zikhron shards to strengthen your Hurst. Resting wakes the wilds again.'],
  ['Zikhron shards', 'Splinters of memory that fall from whatever you defeat. A Nur Lantern can sing them into you.'],
  ['Albali film', 'The healing film from an Albali Byrd’s horn, kept in vials. It stings, but it closes wounds and burns out poison. (R)'],
  ['Rodak', 'Dark, oily, lean and tall, all the same size. Scavengers that follow things expecting an aftermath. They keep their distance — until you are hurt, or until you strike one.'],
  ['Kipsu', 'Weasel face, fox ears, big paws and a very fluffy tail, with glowing patterns all their own. The small ones love trouble — and your shards. Catch the thief to get them back.'],
  ['Albali Byrd', 'Five horns coated in a healing film that stings so badly it paralyses. On Leotik a poison has turned the film toxic. They circle high; strike them when they dive.'],
  ['Duskareth Vel', 'Eikar of the Duskareth who train to throw objects out of the Duat with precision. Watch for knives appearing in the air around you.'],
  ['Tyndael', 'A spark of fire with legs. Keeps its distance and spits burning venom that lingers on the ground.'],
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
    ['torcain', 'Kiet’s trigger opens this Urverk onto Leotik. I sent word to Xilia when we found the cores. Venkin answered.'],
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
    ['phorus', 'The Urverk — it’s opening!'],
    ['torcain', 'Something’s coming through.'],
    ['phorus', 'That’s — that’s the Punk. The little one from the memory. Except it isn’t little anymore.'],
    ['torcain', 'And it’s wearing his hat.'],
    ['phorus', 'The lord of Aakalay. Still swearing people to him from inside a pumpkin. Cut him out, Torcain!'],
  ],
  lordHalf: [
    ['phorus', 'He’s pulling from the Urverk — watch the floor!'],
  ],
  lordDown: [
    ['torcain', 'It’s over. The stem — his memory is in the stem.'],
    ['phorus', 'Don’t you dare drink that.'],
    ['torcain', 'I’m going to keep it. Somebody should remember what he did. Properly, this time.'],
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
  punk: ['Wild Punk', 'The pumpkin-and-vine family gone feral. They wind their vines up before they bite — watch for it, step aside, punish.'],
  punk_d: ['Domestic Punk', 'Gentle, saddle-blanketed, and a little dim. Ruut’s herd. They’ll only fight if you start it.'],
  malsti: ['Malsti Punk', 'Fist-sized Punks from Duat Seedlings. They blink through the Duat — keep turning.'],
  rodak: ['Rodak', 'Lean scavengers that keep their distance until they smell blood. Then they come all at once.'],
  kipsu: ['Kipsu (wild)', 'Thieves. A wild Kipsu will snatch your shards and bolt. Catch it before it gets away and you get them back.'],
  kipsu_f: ['Kipsu (tame)', 'Fluffy, curious and fond of petals. They shed fluff if you give them a scratch.'],
  albali: ['Albali Byrd', 'Big filmed byrds. They wait, then dive. Strike while they’re low. Their healing film is what fills your vials.'],
  tyndael: ['Tyndael', 'Small fire-lizards that spit burning venom. Don’t stand in the puddles.'],
  vel: ['Duskareth Vel', 'Duat-walkers who throw knives out of thin air. They stagger badly when hit hard.'],
  sruvorn: ['Sru Vorn', 'A tusked bog-beast that farms acid pits. Never stand in front of it. Or behind it.'],
  kofi: ['Kofi Galta', 'Crescent body, blade-like spines, fluffy dark tail. It runs from everything, because everything eats it.'],
  punk_alpha: ['Thornback', 'The Old Punk of Aakalay, swollen on a swallowed oath-ring. Its slam shakes the ground.'],
};
/* hunt this many of a kind and Torcain has "studied" it: +15% damage against it */
export const STUDY_AT = { vel: 3, sruvorn: 1, punk_alpha: 1 };
export const STUDY_DEFAULT = 10;

export const JOURNAL = {
  page_1: ['A torn page, the ink still faintly warm:', '"The stone wants more every season. First oaths. Then names. Last week it took Ilva’s memory of her own mother. She smiled and didn’t know why she was crying."'],
  page_2: ['Another page, in the same tight hand:', '"The lord says the stone keeps us safe. Safe from what, I asked. He couldn’t remember. I don’t think he can remember anything that isn’t a promise."'],
  page_3: ['The writing gets faster here:', '"We are leaving tonight. All of us who still remember why. We will not swear anything to anyone ever again. Not even to come back."'],
  page_4: ['The last page, smeared with something green:', '"The old herd-Punk ate the lord’s ring when it fell. It grows every year now. We call it Thornback. Leave it to the stone. Leave all of it."'],
};
