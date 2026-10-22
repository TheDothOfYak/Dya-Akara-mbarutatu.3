/* ============================================================
   Things you carry: materials gathered from the wilds and from
   the creatures you fell, meals cooked at a fire, axes forged
   in a fire-tree cauldron, and small relics worn as trinkets.
   ============================================================ */

export const ITEMS = {
  /* ---- materials ---- */
  vine: { name: 'Punk vine', kind: 'mat', icon: '🌿', value: 3, desc: 'Tough, springy vine from a Punk’s legs.' },
  oil: { name: 'Rodak oil', kind: 'mat', icon: '🫗', value: 6, desc: 'Dark and slick. Burns hot.' },
  fluff: { name: 'Kipsu fluff', kind: 'mat', icon: '☁', value: 5, desc: 'Shed tail-fluff. Kipsu drop it everywhere.' },
  horn: { name: 'Albali horn', kind: 'mat', icon: '🦴', value: 12, desc: 'A broken horn, still filmed. Alchemists pay well.' },
  thorn: { name: 'Toxic horn', kind: 'mat', icon: '🧪', value: 14, desc: 'A Villtur Albali horn. The film has turned green.' },
  ore: { name: 'Stygian ore', kind: 'mat', icon: '💎', value: 10, desc: 'Raw soul-iron, cold and faintly humming.' },
  bark: { name: 'Fire-tree bark', kind: 'mat', icon: '🪵', value: 4, desc: 'Fire never harms it. Good for building and for forging.' },
  stone: { name: 'Cut stone', kind: 'mat', icon: '🧱', value: 2, desc: 'Squared, honest stone. Builders always want more.' },
  petal: { name: 'Zahreh petal', kind: 'mat', icon: '🌸', value: 4, desc: 'Sweet, and a little healing. Cooks well.' },
  moss: { name: 'Bog moss', kind: 'mat', icon: '🍀', value: 6, desc: 'It soaks up acid. Bitter.' },
  seed: { name: 'Fire seed', kind: 'mat', icon: '🔥', value: 25, desc: 'A seed of an Eldi Aagac. Hot to the touch.' },
  ember: { name: 'Tyndael ember', kind: 'mat', icon: '✴', value: 9, desc: 'Still glowing.' },
  tusk: { name: 'Sru Vorn tusk', kind: 'mat', icon: '🦷', value: 60, desc: 'Long as your arm. Acid-etched.' },
  albali_fruit: { name: 'Albali fruit', kind: 'mat', icon: '🍎', value: 15, desc: 'Ripe, round, two dark lines down from the stem. Left on the ground it hatches into a Byrd. A Kuni Byrd would kill for one.' },
  sprengju_shard: { name: 'Sprengju Relic Shaving', kind: 'mat', icon: '🔶', value: 0, desc: 'A grey sliver off a true Relic, its runes glowing red, orange and yellow. Set it in a Ju field and each pulse it wakes Ju into Sprengju.' },
  skor_rind: { name: 'Skor’Thal’s rind', kind: 'mat', icon: '🟤', value: 0, desc: 'A scarred curl of rind the great old Punk let fall beside you. Sing it in an Okid’Relic.' },
  shaving: { name: 'Punk shaving', kind: 'mat', icon: '🎃', value: 8, desc: 'A curl of rind from a sleeping domestic Punk. Calm and content.' },
  stem: { name: 'Malsti stem', kind: 'mat', icon: '🟣', value: 12, desc: 'A Malsti Punk’s stem. It flickers half into the Duat.' },
  // the Carpenter's still: what alchemy wants that the land gives freely, and what you have to go and find
  wellwater: { name: 'Flask of well water', kind: 'mat', icon: '💧', value: 1, desc: 'Cold, from the bottom of the Carpenter’s well. Every brew starts with it.' },
  honey: { name: 'Honeycomb', kind: 'mat', icon: '🍯', value: 8, desc: 'From the hives by the house. Sweet, and it keeps anything you put in it.' },
  glowcap: { name: 'Glowcap', kind: 'mat', icon: '🍄', value: 9, desc: 'A toadstool that shines on the lakeshore. Steeped, it makes the Nur in you quicker.' },
  stormglass: { name: 'Storm-glass shard', kind: 'mat', icon: '🔷', value: 40, desc: 'Sand the sky came down on and melted. It crackles if you hold it too long.' },
  knife: { name: 'Duat knife', kind: 'mat', icon: '🗡', value: 20, desc: 'A Vel’s throwing knife. It shivers when you hold it.' },

  /* ---- meals (eat for a while-lasting boon) ---- */
  salad: { name: 'Zahreh salad', kind: 'meal', icon: '🥗', value: 12, desc: 'Heals 50 at once.', heal: 50 },
  stew: { name: 'Punk-vine stew', kind: 'meal', icon: '🍲', value: 18, desc: 'Stamina returns 40% faster for 3 minutes.', buff: { stamRegen: 1.4 }, dur: 180, heal: 15 },
  skewer: { name: 'Rodak skewer', kind: 'meal', icon: '🍢', value: 22, desc: '+15% damage for 3 minutes.', buff: { dmg: 1.15 }, dur: 180, heal: 15 },
  broth: { name: 'Fire-seed broth', kind: 'meal', icon: '🍵', value: 40, desc: 'Heat builds twice as fast for 3 minutes.', buff: { heat: 2 }, dur: 180, heal: 20 },
  tea: { name: 'Antidote tea', kind: 'meal', icon: '🫖', value: 30, desc: 'No poison can touch you for 4 minutes.', buff: { antidote: 1 }, dur: 240, heal: 10 },
  bun: { name: 'Zahreh bun', kind: 'meal', icon: '🥯', value: 16, desc: 'Ama’s recipe. Heals 35; stamina returns 25% faster for 2 minutes.', buff: { stamRegen: 1.25 }, dur: 120, heal: 35 },
  roast: { name: 'Ember roast', kind: 'meal', icon: '🍖', value: 30, desc: 'Take 15% less damage for 3 minutes.', buff: { armor: 0.85 }, dur: 180, heal: 25 },

  /* ---- potions, brewed at the Carpenter's still (drink them like a meal) ---- */
  pt_heal: { name: 'Healing draught', kind: 'meal', potion: true, icon: '🧪', value: 24, desc: 'Zahreh steeped in well water. Heals 70 at once.', heal: 70 },
  pt_swift: { name: 'Runner’s tonic', kind: 'meal', potion: true, icon: '🧪', value: 26, desc: 'Honey and water. Stamina returns 60% faster for 4 minutes.', buff: { stamRegen: 1.6 }, dur: 240, heal: 10 },
  pt_iron: { name: 'Ironbark tincture', kind: 'meal', potion: true, icon: '⚗', value: 45, desc: 'Fire-tree bark and soul-iron. Take 22% less damage for 3 minutes.', buff: { armor: 0.78 }, dur: 180, heal: 10 },
  pt_glow: { name: 'Glowcap tonic', kind: 'meal', potion: true, icon: '🧪', value: 40, desc: 'It glows in the flask. Spells, Relics and Nur’Hlyst come back 30% faster for 3 minutes.', buff: { cd: 0.7 }, dur: 180, heal: 10 },
  pt_luck: { name: 'Fortune draught', kind: 'meal', potion: true, icon: '⚗', value: 60, desc: 'From a drowned herbalist’s notebook. +50% shards and +20% experience for 5 minutes.', buff: { shards: 1.5, xp: 1.2 }, dur: 300, heal: 10 },
  pt_storm: { name: 'Storm in a bottle', kind: 'meal', potion: true, icon: '🌩', value: 120, desc: 'It hums against the glass. +30% damage, and every blow staggers half again as hard, for 2½ minutes.', buff: { dmg: 1.3, stagger: 1.5 }, dur: 150, heal: 20 },

  ju: { name: 'Ju', kind: 'meal', icon: '🥕', value: 3, desc: 'It is a carrot. Heals 15.', heal: 15 },
  sprengju: { name: 'Sprengju', kind: 'meal', icon: '🧨', value: 30, desc: 'An awake Ju. Eat it: heals 30, +25% damage and stamina returns 30% faster for 90 seconds. Or throw it (X) — it bursts on impact.', buff: { dmg: 1.25, stamRegen: 1.3 }, dur: 90, heal: 30 },

  /* ---- every other kind of weapon (see ARMS): each kind is learned on a quest, and its first piece comes with the lesson ---- */
  wp_whip: { name: 'Venkin’s old whip', kind: 'weapon', arm: 'whip', icon: '〰', value: 0, dmg: 1.0, desc: 'Braided Punk-vine on a bone handle — the one Venkin learned on. It cracks loud enough to turn a Stryx.' },
  wp_whip2: { name: 'Stryx-handler’s lash', kind: 'weapon', arm: 'whip', icon: '〰', value: 360, dmg: 1.3, stagger: 1.4, desc: '+30% damage. Rodak-oiled, stygian-tipped. The crack staggers.', color: 0x6af0e0 },
  wp_bow: { name: 'Hunter’s bow', kind: 'weapon', arm: 'bow', icon: '🏹', value: 0, dmg: 1.0, desc: 'Fire-tree limbs, vine string.' },
  wp_bow2: { name: 'Kalo longbow', kind: 'weapon', arm: 'bow', icon: '🏹', value: 380, dmg: 1.35, desc: '+35% damage. Its arrows leave a pale trail.', color: 0x9adfff },
  wp_longsword: { name: 'Duro’s longsword', kind: 'weapon', arm: 'longsword', icon: '🗡', value: 0, dmg: 1.0, desc: 'Started years ago, finished at last with your ore. A long, plain, well-kept blade; Duro listed every nick in it on the scabbard.' },
  wp_longsword2: { name: 'Stygian greatsword', kind: 'weapon', arm: 'longsword', icon: '🗡', value: 420, dmg: 1.4, duatCd: 1, desc: '+40% damage. The Duat answers it faster.', color: 0x9a5aff },
  wp_dual: { name: 'Bosk’s twin knives', kind: 'weapon', arm: 'dual', icon: '⚔', value: 0, dmg: 1.0, desc: 'From the dock stores, in a double sheath. One for each hand.' },
  wp_dual2: { name: 'Ember fangs', kind: 'weapon', arm: 'dual', icon: '⚔', value: 360, dmg: 1.3, burn: true, desc: '+30% damage. Every cut smoulders.', color: 0xff7a2a },
  wp_swordshield: { name: 'Shipwreck sword and shield', kind: 'weapon', arm: 'swordshield', icon: '🛡', value: 0, dmg: 1.0, desc: 'Washed ashore in a crate, salt still in the grain of the shield.' },
  wp_swordshield2: { name: 'Gynge-rock bulwark', kind: 'weapon', arm: 'swordshield', icon: '🛡', value: 420, dmg: 1.25, stagger: 1.3, desc: '+25% damage. The shield is a slab of Gynge hide.', color: 0xffa040 },
  wp_battleaxe: { name: 'The Carpenter’s battle axe', kind: 'weapon', arm: 'battleaxe', icon: '🪓', value: 0, dmg: 1.0, desc: 'Two bits, long haft, and “TWO HANDS, TANOC” scratched into it.' },
  wp_battleaxe2: { name: 'Tusk-bitted reaver', kind: 'weapon', arm: 'battleaxe', icon: '🪓', value: 460, dmg: 1.35, stagger: 1.5, desc: '+35% damage. Staggers even big things.', color: 0xb0ff4a },
  wp_throwaxe: { name: 'Orrin’s hatchets', kind: 'weapon', arm: 'throwaxe', icon: '🪓', value: 0, dmg: 1.0, desc: 'A brace of little axes, balanced to throw. They come back to the hand — mostly.' },
  wp_throwaxe2: { name: 'Kindled hatchets', kind: 'weapon', arm: 'throwaxe', icon: '🔥', value: 340, dmg: 1.3, burn: true, desc: '+30% damage. They land burning.', color: 0xff7a2a },
  wp_axebuckler: { name: 'Builder’s axe and buckler', kind: 'weapon', arm: 'axebuckler', icon: '🛡', value: 0, dmg: 1.0, desc: 'Orrin’s spare: a short axe and a round little shield to turn falling timbers.' },
  wp_axebuckler2: { name: 'Stygian hand-axe and boss', kind: 'weapon', arm: 'axebuckler', icon: '🛡', value: 380, dmg: 1.3, duatCd: 1, desc: '+30% damage. The Duat answers it faster.', color: 0x9a5aff },
  wp_spear: { name: 'Ruut’s spear', kind: 'weapon', arm: 'spear', icon: '🔱', value: 0, dmg: 1.0, desc: 'For wild Punks at the far shore. Long enough to keep them off you.' },
  wp_spear2: { name: 'Kalo glass-spear', kind: 'weapon', arm: 'spear', icon: '🔱', value: 360, dmg: 1.3, desc: '+30% damage. A blue-glass head that never dulls.', color: 0x2a9ad0 },
  wp_lance: { name: 'Herder’s lance', kind: 'weapon', arm: 'lance', icon: '🔱', value: 0, dmg: 1.0, desc: 'Old Ruut’s, from when he rode. Hits hardest at a run — or from a Punk’s back.' },
  wp_lance2: { name: 'Skyfall lance', kind: 'weapon', arm: 'lance', icon: '🔱', value: 440, dmg: 1.35, desc: '+35% damage. Hurst-glass from a fallen star in the vamplate.', color: 0xffd27a },
  wp_doublespear: { name: 'Leotik twin-spear', kind: 'weapon', arm: 'doublespear', icon: '🔱', value: 0, dmg: 1.0, desc: 'A head at both ends. Kesh’s people spin it.' },
  wp_doublespear2: { name: 'Acid-glass twin-spear', kind: 'weapon', arm: 'doublespear', icon: '🔱', value: 400, dmg: 1.3, stagger: 1.3, desc: '+30% damage. Both heads etched in Sru acid.', color: 0xb0ff4a },
  wp_doublesword: { name: 'The Carpenter’s twin-blade', kind: 'weapon', arm: 'doublesword', icon: '⚔', value: 0, dmg: 1.0, desc: 'A blade at each end of one long hilt. Buhkon’s, a long time ago. “Spin it slowly at first.”' },
  wp_doublesword2: { name: 'Duat twin-blade', kind: 'weapon', arm: 'doublesword', icon: '⚔', value: 480, dmg: 1.35, duatCd: 1.2, desc: '+35% damage. The Duat answers it faster.', color: 0x9a5aff },
  wp_staff: { name: 'Lamplighter’s pole', kind: 'weapon', arm: 'staff', icon: '🦯', value: 0, dmg: 1.0, desc: 'Lirra’s old lamp-pole, iron-shod. Quick, and it knocks things flat.' },
  wp_staff2: { name: 'Nur-lit staff', kind: 'weapon', arm: 'staff', icon: '🦯', value: 320, dmg: 1.3, stagger: 1.4, desc: '+30% damage. A little Nur-light lives in its head.', color: 0xbfeaff },
  wp_scythe: { name: 'Ama’s reaping scythe', kind: 'weapon', arm: 'scythe', icon: '🌙', value: 0, dmg: 1.0, desc: 'Her late husband’s. For the Zahreh fields. It cuts other things too.' },
  wp_scythe2: { name: 'Toxic-horn reaper', kind: 'weapon', arm: 'scythe', icon: '🌙', value: 420, dmg: 1.35, desc: '+35% damage. A Villtur horn for a blade.', color: 0x7aff6a },
  wp_hammer: { name: 'Orrin’s maul', kind: 'weapon', arm: 'hammer', icon: '🔨', value: 0, dmg: 1.0, desc: 'For driving storehouse pegs. Slow, and it flattens things.' },
  wp_hammer2: { name: 'Gynge-headed maul', kind: 'weapon', arm: 'hammer', icon: '🔨', value: 460, dmg: 1.35, stagger: 1.6, desc: '+35% damage. Nothing stays standing.', color: 0xffa040 },
  wp_fists: { name: 'Sefa’s claw-wraps', kind: 'weapon', arm: 'fists', icon: '🥊', value: 0, dmg: 1.0, desc: 'Knuckle-wraps with Kipsu claws sewn in. “Fennek scratches like THIS.”' },
  wp_fists2: { name: 'Stygian knuckles', kind: 'weapon', arm: 'fists', icon: '🥊', value: 300, dmg: 1.3, desc: '+30% damage. Cold to wear.', color: 0x9a5aff },

  /* ---- axes ---- */
  axe_tanoc: { name: 'Tanoc’s axe', kind: 'weapon', arm: 'axe', icon: '🪓', value: 0, dmg: 1.0, desc: 'The axe Torcain has always carried.' },
  axe_smith: { name: 'Smith’s axe', kind: 'weapon', arm: 'axe', icon: '🪓', value: 120, dmg: 1.18, desc: 'Fire-tree haft, honest steel. +18% damage.' },
  axe_fire: { name: 'Kindled axe', kind: 'weapon', arm: 'axe', icon: '🔥', value: 240, dmg: 1.28, burn: true, desc: '+28% damage. Strikes set foes smouldering.', color: 0xff7a2a },
  axe_styg: { name: 'Stygian cleaver', kind: 'weapon', arm: 'axe', icon: '⚔', value: 400, dmg: 1.42, duatCd: 1.2, desc: '+42% damage. The Duat answers it faster.', color: 0x9a5aff },
  axe_tusk: { name: 'Tusk cleaver', kind: 'weapon', arm: 'axe', icon: '🦷', value: 700, dmg: 1.65, stagger: 1.5, desc: '+65% damage. Staggers even big things.', color: 0xb0ff4a },

  /* ---- trinkets (wear two) ---- */
  t_kipsu: { name: 'Kipsu charm', kind: 'trinket', icon: '🐾', value: 80, desc: '+25% shards from every foe.', perk: { shards: 1.25 } },
  t_feather: { name: 'Albali feather', kind: 'trinket', icon: '🪶', value: 90, desc: 'Glide farther and slower.', perk: { glide: 1 } },
  t_seed: { name: 'Ember seed', kind: 'trinket', icon: '🌰', value: 90, desc: 'Heat builds 30% faster.', perk: { heat: 1.3 } },
  t_breath: { name: 'Breath stone', kind: 'trinket', icon: '🪨', value: 100, desc: 'Stamina returns 25% faster.', perk: { stamRegen: 1.25 } },
  t_ring: { name: 'Hurst ring', kind: 'trinket', icon: '💍', value: 140, desc: '+25 maximum health.', perk: { hp: 25 } },
  t_knot: { name: 'Farmer’s knot', kind: 'trinket', icon: '🪢', value: 110, desc: 'Teodr’s lucky knot. Take 8% less damage.', perk: { armor: 0.92 } },
  t_compass: { name: 'Bosk’s compass', kind: 'trinket', icon: '🧭', value: 120, desc: 'It never points north. +15% experience.', perk: { xp: 1.15 } },
  // made at the Carpenter's bench
  t_amber: { name: 'Honey-amber charm', kind: 'trinket', icon: '🟠', value: 70, desc: 'Honeycomb set hard round a chip of fire-tree. Wounds close slowly on their own.', perk: { regen: 0.6 } },
  t_glowcap: { name: 'Glowcap lantern', kind: 'trinket', icon: '🏮', value: 110, desc: 'A little lantern of glowcaps on a cord. Spells, Relics and Nur’Hlyst come back 15% faster.', perk: { cd: 0.85 } },
  t_storm: { name: 'Storm-glass pendant', kind: 'trinket', icon: '🔷', value: 260, desc: 'Three shards of storm-glass wired together. +12% damage; your blows stagger 25% harder.', perk: { dmg: 1.12, stagger: 1.25 } },
  t_satchel: { name: 'Herbalist’s satchel', kind: 'trinket', icon: '👜', value: 150, desc: 'Dried out and mended. +15% shards and +10% experience.', perk: { shards: 1.15, xp: 1.1 } },
  t_oath: { name: 'Broken oath-ring', kind: 'trinket', icon: '⭕', value: 220, desc: 'The lord’s ring, grown into Skor’Thal’s vines and given freely. +10% damage, heat builds 20% faster.', perk: { dmg: 1.1, heat: 1.2 } },
  t_sniller: { name: 'Sniller’s eye', kind: 'trinket', icon: '🔷', value: 150, desc: 'A cold teal gem that hums. Nur’Hlyst reaches 60% farther; +10% shards.', perk: { hlyst: 1, shards: 1.1 } },
  t_ver: { name: 'Ver’s eye', kind: 'trinket', icon: '👁', value: 160, desc: 'Spells recover 20% faster.', perk: { cd: 0.8 } },

  /* ---- key items ---- */
  k_scroll_pull: { name: 'Kalo scroll: Duat Pull', kind: 'key', icon: '📜', value: 0, read: true, desc: 'Stored willpower. Read it to learn the Duat Pull.' },
  okid: { name: 'Okid’Relic', kind: 'key', icon: '🔮', value: 0, desc: 'Buhkon’s gift. Sing a creature’s song into a piece of it with a little stygian, and the Relic catches its truth as a token.' },
  k_seed: { name: 'Warm fire seed', kind: 'key', icon: '🔥', value: 0, desc: 'From the young fire tree in the Ember Grove, for the Stryx’s ship. Hot to the touch.' },
  /* ---- things to wear: a cloak, the body, the hands, the feet (the Gear page). perk works as a trinket's does ---- */
  ahoac_cloak: { name: 'Ahoac glide cloak', kind: 'wear', slot: 'cloak', color: 0x9a3a1a, icon: '🧥', value: 0, desc: 'Rust-red, brass at the collar, cord loops for the wrists. Standard issue for the Ahoac crews, given as an apology. Jump, then hold Space as you fall: arms out, and the cloak takes the wind.' },
  w_coat: { name: 'Torcain’s coat', kind: 'wear', slot: 'cloak', color: 0x5e1f3e, icon: '🧥', value: 0, desc: 'Plum-dark and long, gold at the collar. It has carried him off more towers than he can count: arms out, and it takes the wind.' },
  w_jerkin: { name: 'Padded jerkin', kind: 'wear', slot: 'body', color: 0x6a4428, icon: '🦺', value: 90, desc: 'Quilted wool under boiled leather, the kind the Ahoac train in. Take 10% less damage.', perk: { armor: 0.9 } },
  w_bracers: { name: 'Leather bracers', kind: 'wear', slot: 'hands', color: 0x5a3a20, icon: '🧤', value: 70, desc: 'Laced from wrist to elbow. A steadier swing: +6% damage.', perk: { dmg: 1.06 } },
  w_boots: { name: 'Kofi-hide boots', kind: 'wear', slot: 'feet', color: 0x9a7650, icon: '🥾', value: 60, desc: 'Soft, light, and very quiet. Stamina returns 12% faster.', perk: { stamRegen: 1.12 } },
  w_hood: { name: 'Fisher’s oilcloak', kind: 'wear', slot: 'cloak', color: 0x2f5a5a, icon: '🧥', value: 120, desc: 'Waxed against the lake wind, cut full for a glider. Glide farther and slower.', perk: { glide: 1 } },
  // more cloaks — the cloak is what you glide with
  w_kipsu: { name: 'Kipsu-fluff mantle', kind: 'wear', slot: 'cloak', color: 0xe8dcc8, look: 'fur', icon: '🧣', value: 140, desc: 'Short and impossibly soft, shed by a hundred Kipsu. Warm to the bone: +15 health.', perk: { hp: 15 } },
  w_byrd: { name: 'Albali-feather cloak', kind: 'wear', slot: 'cloak', color: 0x6a8ab8, look: 'feather', icon: '🪶', value: 220, desc: 'Feathers sewn on in rows like roof tiles. Glide farther; stamina returns 10% faster.', perk: { glide: 1, stamRegen: 1.1 } },
  w_ranger: { name: 'Pass-walker’s cloak', kind: 'wear', slot: 'cloak', color: 0x4a5a3a, icon: '🧥', value: 160, desc: 'Moss-green, hooded, patched at the hem. You are harder to see: take 5% less damage.', perk: { armor: 0.95 } },
  // the body
  w_hide: { name: 'Rodak-hide vest', kind: 'wear', slot: 'body', color: 0x4a3a30, icon: '🦺', value: 150, desc: 'Black fur turned inward, the hide stitched with sinew. Take 12% less damage, +3% damage.', perk: { armor: 0.88, dmg: 1.03 } },
  w_chain: { name: 'Ringmail shirt', kind: 'wear', slot: 'body', color: 0x8a8c96, look: 'chain', icon: '⛓', value: 260, desc: 'Thousands of little riveted rings. Take 18% less damage — but it is heavy: stamina returns 5% slower.', perk: { armor: 0.82, stamRegen: 0.95 } },
  w_scale: { name: 'Stryx-scale coat', kind: 'wear', slot: 'body', color: 0x5a7a3a, look: 'plate', icon: '🛡', value: 340, desc: 'Shed scales from the ship’s Stryx, overlapped on leather. Take 20% less damage.', perk: { armor: 0.8 } },
  w_robe: { name: 'Kalo silk robe', kind: 'wear', slot: 'body', color: 0x3a4a7a, look: 'robe', icon: '👘', value: 200, desc: 'Blue-black, embroidered with stars nobody on Xikia can name. Spells recover 10% faster; +5% experience.', perk: { cd: 0.9, xp: 1.05 } },
  // the hands
  w_wraps: { name: 'Punk-vine wraps', kind: 'wear', slot: 'hands', color: 0x4a7a3a, look: 'wrap', icon: '🧤', value: 50, desc: 'Vine wound round the knuckles and wrists, tight as it dries. +3% damage; stamina returns 6% faster.', perk: { dmg: 1.03, stamRegen: 1.06 } },
  w_gauntlets: { name: 'Iron gauntlets', kind: 'wear', slot: 'hands', color: 0x7a7c86, look: 'gauntlet', icon: '🧤', value: 240, desc: 'Jointed plates over a leather glove. +10% damage; take 5% less.', perk: { dmg: 1.1, armor: 0.95 } },
  // the feet
  w_sandals: { name: 'Runner’s sandals', kind: 'wear', slot: 'feet', color: 0xb8905a, look: 'sandal', icon: '🩴', value: 80, desc: 'Barely there. Stamina returns 20% faster.', perk: { stamRegen: 1.2 } },
  w_greaves: { name: 'Plated greaves', kind: 'wear', slot: 'feet', color: 0x8a8c96, look: 'greave', icon: '🥾', value: 200, desc: 'Steel over the shins, hobnails under the heel. Take 8% less damage; harder to knock off your feet.', perk: { armor: 0.92, stagger: 0.8 } },

  /* ---- Relic armor: a Hurst settled into the thing itself. Later in the tale: the smith won't touch it, and the chests
     that hold it are a long way from home (see FORGE later:true, and the later regions' chests) ---- */
  r_gynge_plate: { name: 'Gynge-heart breastplate', kind: 'wear', slot: 'body', relicArmor: true, color: 0x7a6a5a, glow: 0xffa040, look: 'plate', icon: '🛡', value: 0, desc: 'Rock-hide plates around a Gynge chip that still sings. Its Hurst holds the line: take 30% less damage, +30 health.', perk: { armor: 0.7, hp: 30 } },
  r_ember_mail: { name: 'Ember-heart mail', kind: 'wear', slot: 'body', relicArmor: true, color: 0x6a3a2a, glow: 0xff6a2a, look: 'chain', icon: '🔥', value: 0, desc: 'Ringmail quenched in Tyndael embers, a fire Hurst in the links. Heat builds 30% faster; +8% damage; your blows burn.', perk: { heat: 1.3, dmg: 1.08, burn: 1 } },
  r_stygian_grips: { name: 'Stygian grips', kind: 'wear', slot: 'hands', relicArmor: true, color: 0x2a2238, glow: 0xc89aff, look: 'gauntlet', icon: '🧤', value: 0, desc: 'Soul-iron over the knuckles. The Duat hums in them: +12% damage, spells recover 15% faster.', perk: { dmg: 1.12, cd: 0.85 } },
  r_gynge_greaves: { name: 'Gynge-stone greaves', kind: 'wear', slot: 'feet', relicArmor: true, color: 0x6a5a4a, glow: 0xffa040, look: 'greave', icon: '🥾', value: 0, desc: 'Living rock at the shins. Nothing knocks you down: take 12% less damage, half the stagger.', perk: { armor: 0.88, stagger: 0.5 } },
  r_sniller_cloak: { name: 'Sniller-glass cloak', kind: 'wear', slot: 'cloak', relicArmor: true, color: 0x3a6a78, glow: 0x6af0e0, look: 'feather', icon: '🧥', value: 0, desc: 'Woven with threads of a Sniller’s cold storm. It catches every wind: glide much farther, spells recover 15% faster.', perk: { glide: 2, cd: 0.85 } },
  r_hurst_mantle: { name: 'Hearth-Hurst mantle', kind: 'wear', slot: 'cloak', relicArmor: true, color: 0x8a4a2a, glow: 0xffc070, look: 'fur', icon: '🧣', value: 0, desc: 'A sleepy hearth Hurst curled in the collar. Wounds close on their own; +20 health.', perk: { regen: 0.8, hp: 20 } },
  r_firestone: { name: 'Fire-stone', kind: 'key', icon: '🔥', value: 0, desc: 'A smooth skipping-stone with a thumb-dip. Its Hurst is a warm, chatty fire-rat. Set a pebble in the dip and it throws it in a streak of flame — and never burns the one it likes.' },
  r_longevity: { name: 'Humming stone', kind: 'key', icon: '🔵', value: 0, desc: 'A longevity Relic from the lakeshore. Its Hurst is settled and quiet; it keeps you a little less tired, a little less hungry.' },
  resin: { name: 'Black resin bead', kind: 'mat', icon: '⚫', value: 12, desc: 'Carved, very old, from the ruins in the Megla Aagac. Smells of smoke and rain.' },
  saddle: { name: 'Old Ruut’s saddle', kind: 'key', icon: '🐎', value: 0, desc: 'Good leather, cut down small, with saddlebags. For your Punk — once she has a place of her own.' },
  gynge_chip: { name: 'Gynge chip', kind: 'key', icon: '🪨', value: 0, desc: 'A palm-sized piece of living rock from just inside a Gynge’s maw. Still warm. Still faintly singing.' },
  gynge_hide: { name: 'Gynge rock-hide', kind: 'mat', icon: '🟫', value: 18, desc: 'Plates of a Gynge’s rock skin. Hard enough to turn an axe.' },
  akai_rubbing: { name: 'Akai Gek rubbing', kind: 'key', icon: '📜', value: 0, desc: 'Charcoal rubbing of the runes round the purple Relic in the ruins. You can read one: Akai Gek. Its song is in your head now.' },
  relic_ring: { name: 'Relic ring', kind: 'key', icon: '💍', value: 0, desc: 'Taken from the Duskareth in the Megla Aagac. Links up to five Relics to you wherever they are — you need never carry them again.' },
  tok_gynge: { name: 'Gynge token', kind: 'key', icon: '🗿', value: 0, desc: 'Your first token, made with your own hands: the Gynge of the Megla Aagac, grinding its jaw and glaring with no eyes at all.' },
  amulet: { name: 'Sniller amulet', kind: 'key', icon: '🔹', value: 0, desc: 'A round gem between two curved horns, cold teal. It hums toward something far away.' },
};

/* cooking at a fire: [ingredients] → meal */
export const RECIPES = [
  { out: 'salad', need: { petal: 2 } },
  { out: 'stew', need: { vine: 2, petal: 1 } },
  { out: 'skewer', need: { oil: 1, vine: 1 } },
  { out: 'bun', need: { petal: 2, fluff: 1 } },
  { out: 'roast', need: { ember: 1, oil: 1 } },
  { out: 'broth', need: { seed: 1, petal: 1 } },
  { out: 'tea', need: { moss: 2, thorn: 1 } },
];

/* the Carpenter's still and bench: brews (potions) and crafts (charms). Each is learned before it can be made — in his
   lessons, or from something found out on the land (flag: learn_<out>). hard: brewing it is a test of a steady hand
   (0 — it just works, 1 — keep the still steady, 2 — and the still is lively) */
export const BREWS = [
  { out: 'pt_heal', need: { wellwater: 1, petal: 2 }, hard: 0 },
  { out: 'pt_swift', need: { wellwater: 1, honey: 1 }, hard: 0 },
  { out: 'pt_iron', need: { wellwater: 1, bark: 2, ore: 1 }, hard: 1 },
  { out: 'pt_glow', need: { wellwater: 1, glowcap: 2 }, hard: 0 },
  { out: 'pt_luck', need: { wellwater: 1, petal: 1, glowcap: 1, honey: 1 }, hard: 1 },
  { out: 'pt_storm', need: { wellwater: 1, stormglass: 1, honey: 1, ore: 1 }, hard: 2 },
  { out: 't_amber', need: { honey: 2, bark: 1 }, hard: 0, craft: true },
  { out: 't_glowcap', need: { glowcap: 4, oil: 1, vine: 1 }, hard: 0, craft: true },
  { out: 't_storm', need: { stormglass: 2, ore: 2, vine: 1 }, hard: 2, craft: true },
];

/* ---- the kinds of weapon. Any of them can be wielded — once it's been learned. Each is taught by a side job on the Carpenter's
   job board (job: see JOBS in quests.js), any time at all, and the job hands over the first piece (starter). How it fights:
   rng — reach (× the axe's), dmg, spd (swing speed), arc — how far round the front a blow reaches (−1 all round .. 1 dead ahead),
   thrust — light blows are lunges, whirl — the heavy blow goes all round, block — share of a hit from the front a guard soaks,
   charge — hits harder at speed, ranged — shoots ('arrow') or throws ('hatchet'), crack — the whip's report (stuns), two — two-handed ---- */
export const ARMS = {
  axe: { name: 'Axe', icon: '🪓', starter: 'axe_tanoc', rng: 1, dmg: 1, spd: 1, arc: 0.15, note: 'Balanced. The Duat carries it.' },
  whip: { name: 'Whip', icon: '〰', starter: 'wp_whip', job: 'pj_whip', rng: 1.85, dmg: 0.8, spd: 1.1, arc: 0.55, crack: 1, note: 'Long reach down a narrow line. The crack stuns. Venkin’s weapon of choice.', teach: 'Venkin — Beuhk, or wherever he’s got to' },
  bow: { name: 'Bow', icon: '🏹', starter: 'wp_bow', job: 'pj_bow', rng: 1, dmg: 1.05, spd: 0.85, arc: 0.15, ranged: 'arrow', note: 'Shoots where you look (or at your lock). Heavy: a full draw.' },
  longsword: { name: 'Longsword', icon: '🗡', starter: 'wp_longsword', job: 'pj_longsword', rng: 1.25, dmg: 1.12, spd: 0.95, arc: 0, note: 'Long reach, wide cuts.' },
  dual: { name: 'Dual blades', icon: '⚔', starter: 'wp_dual', job: 'pj_dual', rng: 0.85, dmg: 0.72, spd: 1.45, arc: 0.1, note: 'Fast. A blade in each hand.' },
  swordshield: { name: 'Sword and shield', icon: '🛡', starter: 'wp_swordshield', job: 'pj_swordshield', rng: 1, dmg: 0.92, spd: 1.05, arc: 0.15, block: 0.55, note: 'The shield soaks half of any blow from the front.' },
  battleaxe: { name: 'Battle axe', icon: '🪓', starter: 'wp_battleaxe', job: 'pj_battleaxe', rng: 1.15, dmg: 1.38, spd: 0.78, arc: 0, two: 1, stagger: 1.3, note: 'Slow, huge, two-handed.' },
  throwaxe: { name: 'Throwing axes', icon: '🪓', starter: 'wp_throwaxe', job: 'pj_throwaxe', rng: 1, dmg: 0.95, spd: 1.05, arc: 0.15, ranged: 'hatchet', note: 'Thrown where you look. Heavy: three at once.' },
  axebuckler: { name: 'Axe and buckler', icon: '🛡', starter: 'wp_axebuckler', job: 'pj_axebuckler', rng: 0.95, dmg: 0.96, spd: 1.12, arc: 0.15, block: 0.32, note: 'Quick axe; the buckler turns a third of a blow from the front.' },
  spear: { name: 'Spear', icon: '🔱', starter: 'wp_spear', job: 'pj_spear', rng: 1.5, dmg: 1, spd: 1, arc: 0.55, thrust: 1, two: 1, note: 'Lunges. Keeps things at the end of it.' },
  lance: { name: 'Lance', icon: '🔱', starter: 'wp_lance', job: 'pj_lance', rng: 1.9, dmg: 0.9, spd: 0.85, arc: 0.6, thrust: 1, charge: 1, note: 'Longest reach. Hits far harder at a run, or from a Punk’s back.' },
  doublespear: { name: 'Double-ended spear', icon: '🔱', starter: 'wp_doublespear', job: 'pj_doublespear', rng: 1.4, dmg: 0.95, spd: 1.15, arc: 0.3, thrust: 1, whirl: 1, two: 1, note: 'Lunges; the heavy blow spins it all round.' },
  doublesword: { name: 'Double-ended sword', icon: '⚔', starter: 'wp_doublesword', job: 'pj_doublesword', rng: 1.2, dmg: 1.05, spd: 1.15, arc: 0, whirl: 1, two: 1, note: 'Wide cuts; the heavy blow spins it all round.' },
  staff: { name: 'Quarterstaff', icon: '🦯', starter: 'wp_staff', job: 'pj_staff', rng: 1.3, dmg: 0.82, spd: 1.3, arc: 0, two: 1, stagger: 1.4, note: 'Quick and it knocks things flat.' },
  scythe: { name: 'Scythe', icon: '🌙', starter: 'wp_scythe', job: 'pj_scythe', rng: 1.45, dmg: 1.18, spd: 0.85, arc: -0.4, two: 1, note: 'The widest sweep of all.' },
  hammer: { name: 'War maul', icon: '🔨', starter: 'wp_hammer', job: 'pj_hammer', rng: 1.05, dmg: 1.45, spd: 0.74, arc: 0, two: 1, stagger: 1.6, note: 'Slowest, heaviest. Flattens things.' },
  fists: { name: 'Claws and fists', icon: '🥊', starter: 'wp_fists', job: 'pj_fists', rng: 0.7, dmg: 0.7, spd: 1.6, arc: 0.2, note: 'Fastest of all, and close.' },
};
export const armOf = id => ARMS[(ITEMS[id] || {}).arm] || ARMS.axe;
export const armKey = id => (ITEMS[id] && ARMS[ITEMS[id].arm]) ? ITEMS[id].arm : 'axe';

/* forging at the smith: shards + materials → a weapon (only of a kind you've learned) */
export const FORGE = [
  { out: 'axe_smith', shards: 60, need: { bark: 3, ore: 2 } },
  { out: 'axe_fire', shards: 150, need: { bark: 4, seed: 1, ember: 2 } },
  { out: 'axe_styg', shards: 260, need: { ore: 6, knife: 2 } },
  { out: 'axe_tusk', shards: 400, need: { tusk: 1, ore: 4, oil: 3 } },
  { out: 'wp_whip2', shards: 200, need: { vine: 4, oil: 2, ore: 2 } },
  { out: 'wp_bow2', shards: 220, need: { bark: 4, vine: 3, horn: 1 } },
  { out: 'wp_longsword2', shards: 280, need: { ore: 6, knife: 1 } },
  { out: 'wp_dual2', shards: 220, need: { ore: 3, ember: 3, knife: 1 } },
  { out: 'wp_swordshield2', shards: 260, need: { ore: 4, gynge_hide: 2 } },
  { out: 'wp_battleaxe2', shards: 320, need: { tusk: 1, ore: 4, bark: 2 } },
  { out: 'wp_throwaxe2', shards: 200, need: { ore: 3, ember: 2, bark: 2 } },
  { out: 'wp_axebuckler2', shards: 240, need: { ore: 5, knife: 1, bark: 2 } },
  { out: 'wp_spear2', shards: 220, need: { ore: 3, horn: 2, bark: 2 } },
  { out: 'wp_lance2', shards: 300, need: { ore: 5, bark: 3, seed: 1 } },
  { out: 'wp_doublespear2', shards: 260, need: { ore: 4, tusk: 1 } },
  { out: 'wp_doublesword2', shards: 340, need: { ore: 6, knife: 2, stem: 1 } },
  { out: 'wp_staff2', shards: 180, need: { bark: 4, ore: 2, horn: 1 } },
  { out: 'wp_scythe2', shards: 280, need: { thorn: 3, ore: 4 } },
  { out: 'wp_hammer2', shards: 320, need: { gynge_hide: 2, ore: 5 } },
  { out: 'wp_fists2', shards: 160, need: { ore: 3, knife: 1 } },
  // Relic armor: a Hurst in the metal. Later in the tale (the smith won't try it until he's seen what a Gynge chip does)
  { out: 'r_gynge_greaves', shards: 220, need: { gynge_hide: 2, ore: 3 }, later: true },
  { out: 'r_gynge_plate', shards: 380, need: { gynge_hide: 4, gynge_chip: 1, ore: 4 }, later: true },
  { out: 'r_ember_mail', shards: 340, need: { ember: 4, ore: 6, seed: 1 }, later: true },
  { out: 'r_stygian_grips', shards: 320, need: { knife: 2, ore: 5, resin: 2 }, later: true },
];

/* ---- the Carpenter's craft, later in the tale: bind a Relic's Hurst into a piece you wear. The Relic goes into the
   armor (its quick-slot power comes with it), and the armor takes on something of the Hurst. Every combination is a
   piece of its own: m_<relic>__<armor> ---- */
export const BINDABLE_RELICS = {
  r_firestone: { hurst: 'fire-rat', glow: 0xff8a2a, perk: { heat: 1.2, dmg: 1.05, burn: 1 }, note: 'the fire-rat in it: heat builds faster, blows burn' },
  r_longevity: { hurst: 'humming', glow: 0x5aa0ff, perk: { regen: 0.6, stamRegen: 1.15 }, note: 'the humming Hurst in it: wounds close, breath comes back' },
  gynge_chip: { hurst: 'Gynge', glow: 0xffa040, perk: { armor: 0.9, stagger: 0.6 }, note: 'the Gynge’s song in it: harder to hurt, hard to knock down' },
};
export const bindId = (relic, base) => `m_${relic}__${base}`;
for (const base of Object.keys(ITEMS)) {
  const B = ITEMS[base]; if (B.kind !== 'wear' || B.relicArmor || base === 'w_coat') continue;
  for (const [relic, R] of Object.entries(BINDABLE_RELICS)) {
    const perk = Object.assign({}, B.perk || {});
    for (const [k, v] of Object.entries(R.perk)) perk[k] = k === 'hp' || k === 'glide' || k === 'regen' || k === 'burn' ? (perk[k] || 0) + v : (perk[k] ?? 1) * v;
    ITEMS[bindId(relic, base)] = { name: `${B.name}, ${R.hurst}-bound`, kind: 'wear', slot: B.slot, color: B.color, look: B.look, glow: R.glow, relicArmor: true, bound: relic, base,
      icon: B.icon, value: 0, desc: `${B.desc} Bound by the Carpenter with ${ITEMS[relic] ? ITEMS[relic].name : relic} — ${R.note}.`, perk };
  }
}

/* what the trader keeps on her mat (price in shards) */
export const SHOP = {
  xilia: ['salad', 'stew', 'petal', 'vine', 'fluff', 'bark', 'ore', 'stone', 't_breath', 't_seed'],   // (plain armor comes from the jobs on the Carpenter's board)
  aakalay: [],
  leotik: ['salad', 'stew', 'tea', 'moss', 'ore', 'seed', 'ember', 't_ring'],
};

/* what each creature leaves behind: [item, chance, count] */
export const LOOT = {
  punk: [['vine', 0.7, 1], ['petal', 0.15, 1]],
  malsti: [['vine', 0.3, 1], ['ore', 0.12, 1], ['stem', 0.35, 1]],
  rodak: [['oil', 0.75, 1]],
  kipsu: [['fluff', 0.8, 1]],
  kipsu_f: [['fluff', 0.8, 1]],
  punk_d: [['vine', 0.8, 2]],
  albali: [['horn', 0.5, 1]],
  albali_t: [['thorn', 0.6, 1]],
  vel: [['knife', 1, 1], ['ore', 0.6, 2]],
  tyndael: [['ember', 0.7, 1]],
  sruvorn: [['tusk', 1, 1], ['oil', 1, 3]],
};

export function count(inv, id) { return inv.items[id] || 0; }
export function add(inv, id, n = 1) { inv.items[id] = (inv.items[id] || 0) + n; }
export function take(inv, id, n = 1) {
  if ((inv.items[id] || 0) < n) return false;
  inv.items[id] -= n; if (inv.items[id] <= 0) delete inv.items[id];
  return true;
}
export function hasAll(inv, need) { return Object.entries(need).every(([k, n]) => count(inv, k) >= n); }
export function takeAll(inv, need) { if (!hasAll(inv, need)) return false; for (const [k, n] of Object.entries(need)) take(inv, k, n); return true; }
export const needText = need => Object.entries(need).map(([k, n]) => `${n} ${ITEMS[k].name}`).join(', ');

export function freshInventory() {
  return { items: { axe_tanoc: 1, salad: 1 }, axe: 'axe_tanoc', trinkets: [], buffs: {}, wear: {} };
}

/* the combined effect of what you wear and what you've eaten */
export function effects(inv, now, wear = inv.wear) {
  const fx = { hlyst: 0, xp: 1, dmg: 1, heat: 1, stamRegen: 1, armor: 1, cd: 1, shards: 1, hp: 0, glide: 0, regen: 0, antidote: 0, burn: false, duatCd: 0, stagger: 1 };
  const axe = ITEMS[inv.axe] || ITEMS.axe_tanoc;
  fx.dmg *= axe.dmg || 1; if (axe.burn) fx.burn = true; fx.duatCd += axe.duatCd || 0; fx.stagger *= (axe.stagger || 1) * (armOf(inv.axe).stagger || 1);
  for (const t of inv.trinkets.concat(Object.values(wear || {}).filter(w => inv.items[w]))) {
    const p = (ITEMS[t] || {}).perk || {};
    for (const [k, v] of Object.entries(p)) {
      if (k === 'burn') { if (v) fx.burn = true; } else if (k === 'hp' || k === 'glide' || k === 'hlyst' || k === 'regen') fx[k] = (fx[k] || 0) + v; else fx[k] *= v;
    }
  }
  for (const [id, until] of Object.entries(inv.buffs || {})) {
    if (until < now) { delete inv.buffs[id]; continue; }
    const b = (ITEMS[id] || {}).buff || {};
    for (const [k, v] of Object.entries(b)) { if (k === 'antidote') fx.antidote = 1; else fx[k] *= v; }
  }
  return fx;
}
