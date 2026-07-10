/* ============================================================
   DYA'AKARA — core/token.js
   Token minting. Every token is one specific individual creature:
   rolled traits, personality diamonds, a locked behavior value
   (weighted lifetime energy average), and a backstory written at
   crafting time. Description cards are auto-generated.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util, SP = DYA.species, L = DYA.lore;

  const T = {};

  /* ============ LIFE-HISTORY QUIRKS (design doc Part V) ============
     Every individual carries at least one lived-experience quirk: a
     concrete thing from its history that shows up on the field. Not
     just flavor — each one is implemented in the match engine. */
  const mobile = (sp) => !(sp.features.rooted || sp.features.stationary || sp.features.rootsOnDeploy || sp.rig === 'field' || sp.rig === 'tree' || sp.rig === 'relic');
  const fighter = (sp) => !sp.tags.includes('passive');
  const grounded = (sp) => mobile(sp) && !sp.tags.includes('flyer');

  T.QUIRKS = [
    { id: 'rock_thrower', note: 'Grabs loose stone and throws it — hard. Periodic ranged rock strike that staggers.', story: 'It grew up beside the quarry at {place}, and it never lost the habit of grabbing rocks and throwing them at whatever annoys it', ok: fighter },
    { id: 'heavy_boned', note: 'Heavy-boned: tougher and slower than its card suggests.', story: 'Raised on the mineral-heavy slopes above {place}, it came out heavy-boned — slow, and very hard to put down', ok: () => true },
    { id: 'swift_blood', note: 'Swift-blooded: faster and lighter-built than its card suggests.', story: 'The runt of its clutch, chased by everything near {place} — it survived by never once being caught', ok: mobile },
    { id: 'keen_eye', note: 'Strikes from farther out than most of its kind.', story: 'It spent its youth watching the flight lines from a cliff ledge over {place}; nothing gets close unnoticed', ok: fighter },
    { id: 'long_wind', note: 'Longer reach on breath, vine, or strike than its kind.', story: 'It hunted across the wide flats near {place}, where reach decided every meal', ok: fighter },
    { id: 'iron_gut', note: 'Wounds close strangely fast — slow regeneration on the field.', story: 'It wallowed for years in the hot mineral springs by {place}; its wounds close strangely fast', ok: () => true },
    { id: 'thick_hide', note: 'Caked hide shrugs off a little of every blow.', story: 'It rolled in the bog-crust at {place} as a juvenile and the mud never fully washed out', ok: () => true },
    { id: 'scarred_survivor', note: 'When badly hurt, old scars take part of every blow.', story: 'A Lutut took it as a juvenile near {place} — and dropped it. The scars taught it how to live through worse', ok: () => true },
    { id: 'skittish', note: 'The first bad wound sends it into a burst of speed.', story: 'Trap-hunters startled it young near {place}; hurt it, and it becomes very hard to catch', ok: mobile },
    { id: 'cornered_fighter', note: 'Fights harder when wounded.', story: 'It was cornered by a Rodak pack as a pup near {place} — and it won', ok: fighter },
    { id: 'storm_born', note: 'Fights harder while the Sunear\u2019Zikhron passes overhead.', story: 'It was born mid-passage of the Sunear\u2019Zikhron over {place}; the storm still sings to it', ok: fighter },
    { id: 'early_riser', note: 'Starts the match fast — stronger in the first minute.', story: 'It hunted at first light every day of its life around {place}', ok: fighter },
    { id: 'slow_burner', note: 'Grows stronger late in a long match.', story: 'An old soul from {place} — it takes a while to remember how dangerous it is', ok: fighter },
    { id: 'pack_raised', note: 'Fights better with allies close by.', story: 'It was raised inside a Punk pack near {place} and still fights shoulder-to-shoulder', ok: fighter },
    { id: 'loner', note: 'Fights better with no allies nearby.', story: 'It lived alone in the high passes above {place}; crowds make it careless, solitude makes it sharp', ok: fighter },
    { id: 'vengeful', note: 'An ally falling nearby sends it into a brief fury.', story: 'It watched a bond-mate die to hunters at {place}. It does not forgive quickly', ok: fighter },
    { id: 'forest_reared', note: 'Fights harder inside forest ground.', story: 'Reared under the canopy at {place} — the treeline is home ground', ok: fighter },
    { id: 'shore_reared', note: 'Fights harder in shallow water.', story: 'It hatched on the tide-rocks at {place}; shallow water is its arena', ok: fighter },
    { id: 'relic_runner', note: 'Carries the relic noticeably faster.', story: 'It spent its youth hauling river stones out of the shallows at {place} for no reason anyone could name — born to carry', ok: (sp) => mobile(sp) && !sp.tags.includes('passive') },
    { id: 'water_raised', note: 'Water never slows it.', story: 'It was raised beside a Grothyn pond at {place} and treats water as dry land', ok: (sp) => grounded(sp) && sp.element !== 'Su' && !sp.tags.includes('su') },
    { id: 'bog_raised', note: 'Bog never slows it.', story: 'It was whelped in the Awvadhi margins near {place}; bog is just ground to it', ok: grounded },
    { id: 'hoard_sense', note: 'Sniffs out extra resources while it lives.', story: 'It nested beside a trader\u2019s cache at {place} and came to understand treasure', ok: () => true },
  ];
  T.QUIRK_BY_ID = {};
  T.QUIRKS.forEach(q => T.QUIRK_BY_ID[q.id] = q);

  T.rollQuirks = function (sp, rng) {
    const pool = T.QUIRKS.filter(q => q.ok(sp));
    if (!pool.length) return [];
    const out = [rng.pick(pool).id];
    if (rng.chance(0.12)) {
      const q2 = rng.pick(pool).id;
      if (q2 !== out[0]) out.push(q2);
    }
    return out;
  };

  /* accessor — tokens minted before this update derive theirs
     deterministically from their id, so every token has a history */
  T.quirks = function (tok) {
    if (tok.quirks && tok.quirks.length) return tok.quirks;
    const sp = SP.get(tok.speciesId);
    tok.quirks = T.rollQuirks(sp, new U.Rng(U.hashStr((tok.id || sp.id) + '::quirk')));
    return tok.quirks;
  };

  /* Mint a new token.
     opts: { speciesId, rng, rarity (force), owner, crafter, temperBias (-1..1, hunt questions ~5%),
             name (force), isStarter } */
  T.mint = function (opts) {
    const rng = opts.rng || new U.Rng(U.newSeed());
    const sp = SP.get(opts.speciesId);
    if (!sp) throw new Error('Unknown species ' + opts.speciesId);

    const rarity = (opts.rarity != null) ? opts.rarity : rng.int(sp.rarity[0], sp.rarity[1]);
    const sizeIdx = U.clamp(rng.int(sp.size[0], sp.size[1]), 0, 4);

    /* Behavior value: the weighted lifetime energy average (design doc Part V).
       Low = calm truth, high = aggressive truth. Locked at crafting. */
    let energy = Math.round(Math.max(5, rng.gauss(400, 300)));
    // moment of acquisition = ~5% additional influence
    const acquisition = rng.chance(0.3) ? rng.range(0.5, 3) : rng.range(0.9, 1.1);
    energy = Math.round(energy * (0.95 + 0.05 * acquisition));
    if (opts.temperBias) energy = Math.round(energy * (1 + 0.05 * opts.temperBias)); // hidden hunt-question influence
    energy = U.clamp(energy, 5, 3000);

    /* General stat traits */
    const age = rng.range(0.1, 1);           // → health
    const combatExp = rng.range(0, 1);       // → skill
    const painTolerance = rng.range(0.2, 1);

    /* Personality diamonds */
    const D = SP.DIAMONDS;
    const diamonds = {};
    for (const k in D) diamonds[k] = rng.pick(D[k]);
    // energy average nudges primary/combat rolls toward its truth
    if (energy > 900 && rng.chance(0.6)) { diamonds.primary = 'Aggressive'; }
    if (energy < 120 && rng.chance(0.5)) { diamonds.risk = rng.pick(['Calculated', 'Cautious']); }

    /* Per-individual variables from species definition */
    const vars = {};
    for (const k in (sp.vars || {})) {
      const [lo, hi] = sp.vars[k];
      vars[k] = Math.round(rng.range(lo, hi) * 100) / 100;
    }
    const picks = {};
    for (const k in (sp.picks || {})) picks[k] = rng.pick(sp.picks[k]);

    /* Middle layers: Eikar / Keilia specific traits (Part V) */
    let layer = null;
    if (sp.eikarLayer) {
      const ET = SP.EIKAR_TRAITS;
      const quarethen = rng.chance(0.1); // ~1 in 10 Eikar
      layer = {
        race: 'Eikar',
        subRace: quarethen ? 'Quarethen' : rng.pick(ET.subRace.filter(s => s !== 'Quarethen')),
        quarethen,
        leadership: U.clamp(rng.range(0.1, 0.9) + (quarethen ? 0.25 : 0), 0, 1.2),
        zikhron: rng.range(0.1, 1),
        storyKnowledge: rng.int(0, 4),
        musicConnection: rng.range(0, 1),
        erokeriaMinds: rng.int(1, 4),
        defaultMind: rng.pick(ET.defaultMind),
        compassion: rng.range(0, 1),
        loyalty: rng.pick(ET.loyalty),
        reputation: rng.range(0, 1),
        alignment: rng.pick(ET.alignment),
        ambition: rng.pick(ET.ambition),
        communication: rng.pick(ET.communication),
        adaptability: rng.range(0.2, 1),
        conditioning: rng.range(0.3, 1),
        specialty: rng.pick(ET.specialty),
      };
    } else if (sp.keiliaLayer) {
      const KT = SP.KEILIA_TRAITS;
      layer = {
        race: 'Keilia',
        subRace: rng.pick(KT.subRace),
        leadership: rng.range(0.3, 1),
        zikhron: rng.range(0.1, 0.7),
        craftKnowledge: rng.range(0.3, 1),
        musicConnection: rng.range(0.1, 0.8),
        erokeriaMinds: rng.int(2, 5),
        defaultMind: rng.pick(KT.defaultMind),
        compassion: rng.range(0.2, 0.9),
        loyalty: rng.pick(KT.loyalty),
        reputation: rng.range(0, 1),
        alignment: rng.pick(KT.alignment),
        ambition: rng.pick(KT.ambition),
        communication: rng.pick(KT.communication),
        conditioning: rng.range(0.6, 1.2),
        hairArmorQuality: rng.range(0.3, 1),
        buildLegacy: rng.chance(0.25) ? 'Known builder — recognized on the field' : 'Quiet works',
        guild: rng.pick(KT.guild),
        hammerBond: rng.range(0.2, 1),
        structuralInstinct: rng.range(0.3, 1),
        collectiveMemory: rng.range(0.4, 1),
        mountCompatibility: rng.range(0, 0.6),
        trauma: 'Carries the weight of a nearly-lost people',
      };
    }

    /* Stats: size × species multipliers × age/experience, then the
       individual's own rolls — constitution, ferocity, gait. Species
       baseline is only the center point; wide variation is the rule
       (design doc Part V), with rare runts and prodigies at the tails. */
    const mul = sp.statMul || { hp: 1, dmg: 1, speed: 1 };
    let vigor = U.clamp(rng.gauss(1, 0.14), 0.66, 1.5);
    let ferocity = U.clamp(rng.gauss(1, 0.14), 0.66, 1.5);
    let gait = U.clamp(rng.gauss(1, 0.09), 0.78, 1.28);
    const outlier = rng.chance(0.08) ? (rng.chance(0.5) ? 'prodigy' : 'runt') : null;
    if (outlier === 'prodigy') { vigor *= 1.18; ferocity *= 1.18; }
    if (outlier === 'runt') { vigor *= 0.82; ferocity *= 0.85; gait *= 1.08; }
    const hp = Math.max(2, Math.round(SP.SIZE_HP[sizeIdx] * mul.hp * (0.75 + age * 0.5) * (1 + rarity * 0.06) * vigor));
    const dmg = Math.max(0.5, Math.round(SP.SIZE_DMG[sizeIdx] * mul.dmg * (0.8 + combatExp * 0.5) * (1 + rarity * 0.05) * ferocity * 10) / 10);
    const speed = Math.round(SP.SIZE_SPEED[sizeIdx] * mul.speed * rng.range(0.9, 1.12) * gait);

    /* life-history quirks — rolled from the pools this species can live */
    const quirks = T.rollQuirks(sp, rng);

    /* Naming: tokens default to their species name until the owner names
       them (July update §4). AI players auto-name theirs in Dearcineon. */
    const name = opts.name || (opts.aiOwner ? L.genCreatureName(rng, sp.name) : sp.name);
    const place = rng.pick(L.PLACES);
    const mat = rng.pick(L.MATERIALS);
    const quirkStory = quirks.map(qid => T.QUIRK_BY_ID[qid].story.replace('{place}', rng.pick(L.PLACES)) + '.').join(' ');
    const story =
      sp.name + ' — "' + name + '" — ' +
      rng.pick(L.STORY_LIVED).replace('{terr}', rng.pick(L.TERRAINS)).replace('{place}', place) + '. ' +
      (energy > 800 ? L.STORY_TEMPER[1 + (rng.int(0, 1) * 2)] : energy < 150 ? L.STORY_TEMPER[0] : rng.pick(L.STORY_TEMPER)) + ' ' +
      quirkStory + ' ' +
      (outlier === 'prodigy' ? 'Even hunters who dislike superlatives call it an exceptional specimen. ' : outlier === 'runt' ? 'It is small for its kind and has spent its whole life making that everyone else\u2019s problem. ' : '') +
      rng.pick(L.STORY_MATERIAL).replace('{mat}', mat).replace('{place}', place);

    /* Per-token resource cost vector (July update §1): total scales with
       rarity, split across the four resources by element affinity. A token
       may cost any combination, including zero of a type. Locked at mint. */
    const costVec = T.deriveCostVec(sp, rarity, rng);

    const now = Date.now();
    return {
      id: U.uid('tok'),
      speciesId: sp.id,
      name,
      nameLocked: !!opts.nameLocked,
      cost: costVec,
      ownerId: opts.owner || null,
      crafterId: opts.crafter || opts.owner || null,
      rarity, sizeIdx,
      element: sp.element,
      behaviorValue: energy,          // locked at crafting time
      story,                          // text field, written at crafting time
      material: mat,
      age: Math.round(age * 100) / 100,
      combatExp: Math.round(combatExp * 100) / 100,
      painTolerance: Math.round(painTolerance * 100) / 100,
      diamonds, vars, picks, layer,
      quirks, outlier,
      stats: { hp, dmg, speed },
      craftedAt: now,
      tradeHistory: [],
      status: 'collection',           // collection / market / pouch / field
      displayOnly: false,
      flagged: false,
      frozen: false,
      matchesPlayed: 0,
      isStarter: !!opts.isStarter,
      isRental: false,
    };
  };

  /* Total cost (sum across the four resources) to ready this token */
  T.cost = (tok) => {
    const v = T.costVec(tok);
    return v.Fti + v.Su + v.Eldi + v.Ular;
  };

  /* Resource cost vector; derives one for tokens minted before the update */
  T.costVec = function (tok) {
    if (tok.cost && typeof tok.cost === 'object') return tok.cost;
    const sp = SP.get(tok.speciesId);
    return T.deriveCostVec(sp, tok.rarity, new U.Rng(U.hashStr(tok.id || sp.id)));
  };

  T.deriveCostVec = function (sp, rarity, rng) {
    const total = SP.RARITY_COST[rarity];
    const v = { Fti: 0, Su: 0, Eldi: 0, Ular: 0 };
    const others = SP.ELEMENTS.filter(e => e !== sp.element && e !== sp.element2);
    let left = total;
    /* primary element carries most of the cost */
    v[sp.element] = Math.max(1, Math.ceil(total * 0.55));
    left -= v[sp.element];
    if (sp.element2 && left > 0) {
      const s = Math.min(left, Math.max(1, Math.round(total * 0.25)));
      v[sp.element2] += s; left -= s;
    }
    /* remainder spills into other resources — deterministic per token */
    while (left > 0) {
      v[rng.pick(others)] += 1; left--;
    }
    return v;
  };

  T.fmtCost = function (vec) {
    return SP.ELEMENTS.filter(e => vec[e] > 0).map(e => vec[e] + ' ' + e).join(' · ') || 'free';
  };

  /* Baseline market value in gold */
  T.baseValue = function (tok) {
    const sp = SP.get(tok.speciesId);
    let v = SP.RARITY_VALUE[tok.rarity];
    v *= 1 + tok.sizeIdx * 0.08;
    v *= 1 + tok.combatExp * 0.2;
    if (sp.tags.includes('apex')) v *= 1.2;
    if (sp.tags.includes('generator')) v *= 1.3;
    return Math.round(v);
  };

  /* Auto-generated description card (design doc: no manual submission) */
  T.descriptionCard = function (tok) {
    const sp = SP.get(tok.speciesId);
    const temper =
      tok.behaviorValue > 1200 ? 'Volatile — its truth runs hot; expect aggression beyond its species baseline.' :
      tok.behaviorValue > 700 ? 'Spirited — noticeably more forward than most of its kind.' :
      tok.behaviorValue > 300 ? 'True to its kind — behaves close to the species baseline.' :
      tok.behaviorValue > 120 ? 'Settled — calmer and more measured than most of its kind.' :
      'Serene — a remarkably gentle truth; slow to anger even for its species.';
    return {
      title: tok.name,
      species: sp.name,
      rarity: SP.RARITIES[tok.rarity],
      size: SP.SIZES[tok.sizeIdx],
      element: sp.element + (sp.element2 ? ' / ' + sp.element2 : ''),
      cost: T.cost(tok),
      temperament: temper,
      diamonds: tok.diamonds,
      special: sp.special,
      desc: sp.desc,
      story: tok.story,
      fieldNotes: T.quirks(tok).map(qid => (T.QUIRK_BY_ID[qid] || { note: qid }).note),
    };
  };

  /* Summary line used in lists */
  T.summary = (tok) => {
    const sp = SP.get(tok.speciesId);
    return sp.name + ' · ' + SP.RARITIES[tok.rarity] + ' · ' + SP.SIZES[tok.sizeIdx];
  };

  DYA.token = T;
})();
