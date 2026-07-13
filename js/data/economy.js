/* ============================================================
   DYA'AKARA — data/economy.js
   Progression & economy exactly per Master Design Doc Part IX.
   ============================================================ */
(function () {
  'use strict';
  const E = {};

  /* ---------- Starting resources ---------- */
  E.START = { gold: 1000, okid: 5, ngakara: 5 };

  /* ---------- XP rates ---------- */
  E.XP = { casualWin: 100, casualLoss: 40, rankedWin: 200, rankedLoss: 75 };
  E.GOLD = { casualWin: 50, casualLoss: 20, rankedWin: 100, rankedLoss: 30 };
  E.XP_BONUS = {
    winStreakPerWin: 25,       // stacking bonus per consecutive win (cap 100)
    winStreakCap: 100,
    firstWinOfDay: 50,
    newTokenMatch: 30,         // playing a match with a newly crafted token
    fastRelic: 40,             // capturing the Relic in under 5 minutes
    comboAchieved: 25,         // executing a known combo in-match
  };

  /* ---------- XP curve (exact bands from design doc) ----------
     Returns XP needed to go from (level) to (level+1). */
  E.xpForLevel = function (level) {
    if (level < 1) return 500;
    if (level <= 10) {
      // 500 → 3,000 gradual climb across 1–10
      return Math.round(500 + (3000 - 500) * ((level - 1) / 9));
    }
    if (level <= 25) return Math.round(3500 + (10000 - 3500) * ((level - 11) / 14));
    if (level <= 40) return Math.round(11000 + (25000 - 11000) * ((level - 26) / 14));
    if (level <= 47) return Math.round(27000 + (45000 - 27000) * ((level - 41) / 6));
    if (level <= 50) return Math.round(50000 + (80000 - 50000) * ((level - 48) / 2));
    return 80000 + 5000 * (level - 50); // 51+: level-50 threshold + 5,000 per level, no cap
  };

  /* ---------- Level reward table (Part IX, condensed to a generator) ----------
     Standard chest every level; milestone chests at 3,5,10,15,20,30,40,50, then every 10. */
  E.MILESTONES = [3, 5, 10, 15, 20, 30, 40, 50];
  E.isMilestone = (lv) => E.MILESTONES.includes(lv) || (lv > 50 && lv % 10 === 0);

  E.levelChest = function (lv, rng) {
    // returns {gold, okid:{qty, rarityIdx}, ngakaraChance, milestone:{tokenRarityIdx, okidQty, okidRarityIdx, ngakara, cosmetic}}
    const r = {};
    function band(v, table) { for (const row of table) { if (lv <= row[0]) return row[1]; } return table[table.length - 1][1]; }
    r.gold = band(lv, [[2, 50], [4, 75], [7, 100], [8, 100], [9, 125], [12, 150], [14, 175], [17, 200], [19, 225], [22, lv >= 21 ? 250 + (lv - 21) * 25 : 250], [24, 275], [27, 300 + (lv - 25) * 12], [29, 325 + (lv - 28) * 25], [32, 375 + (lv - 30) * 12], [36, 400 + (lv - 33) * 8], [39, 450 + (lv - 37) * 12], [44, 500 + (lv - 41) * 16], [47, 550 + (lv - 45) * 12], [49, 600 + (lv - 48) * 25], [50, 700]]);
    if (lv > 50) r.gold = 700 + Math.floor((lv - 50) / 10) * 25;
    r.gold = Math.round(r.gold);
    // okid qty
    r.okidQty = band(lv, [[7, 1], [9, rng.chance(0.5) ? 1 : 2], [17, 2], [19, rng.chance(0.5) ? 2 : 3], [27, 3], [29, rng.chance(0.5) ? 3 : 4], [36, 4], [39, rng.chance(0.5) ? 4 : 5], [44, 5], [47, rng.chance(0.5) ? 5 : 6], [50, 6]]);
    if (lv > 50) r.okidQty = 6 + Math.min(2, Math.floor((lv - 50) / 20));
    // okid quality (rarity index)
    r.okidRarity = band(lv, [[11, 0], [12, rng.chance(0.5) ? 0 : 1], [19, 1], [22, rng.chance(0.5) ? 1 : 2], [29, 2], [32, rng.chance(0.5) ? 2 : 3], [39, 3], [44, rng.chance(0.5) ? 3 : 4], [47, 4], [49, rng.chance(0.5) ? 4 : 5], [50, 5]]);
    if (lv > 50) r.okidRarity = Math.min(6, 5 + (rng.chance(0.3) ? 1 : 0));
    // ngakara chance
    r.ngakaraChance = band(lv, [[4, 0], [7, 0.05], [9, 0.10], [10, 0.15], [12, 0.15], [17, lv >= 17 ? 0.25 : 0.20], [19, 0.25], [22, 0.30], [24, 0.35], [27, 0.35 + (lv - 25) * 0.025], [29, 0.40 + (lv - 28) * 0.05], [32, 0.45 + (lv - 30) * 0.025], [36, 0.50 + (lv - 33) * 0.016], [39, 0.55 + (lv - 37) * 0.025], [44, 0.65 + (lv - 41) * 0.016], [47, 0.75], [49, 0.80], [50, 0.85]]);
    if (lv > 50) r.ngakaraChance = 0.9;
    // milestone bonuses
    if (E.isMilestone(lv)) {
      const M = { 3: [0, 2, 0, 0], 5: [0, 2, 0, 1], 10: [1, 3, 1, 2], 15: [1, 3, 1, 3], 20: [2, 3, 2, 3], 30: [3, 4, 3, 4], 40: [4, 5, 4, 5], 50: [5, 6, 5, 6] };
      let m = M[lv];
      if (!m) { // 51+ every 10: scale toward Torcain
        const step = Math.min(6, 5 + Math.floor((lv - 50) / 30));
        m = [step, 6, step, 6];
      }
      r.milestone = { tokenRarity: m[0], okidQty: m[1], okidRarity: m[2], ngakara: m[3], cosmetic: lv === 50 ? 'Stygian title frame' : null };
    }
    return r;
  };

  /* ---------- Crafting costs (Okid + NgAkara per rarity) ---------- */
  E.CRAFT_COST = [
    { okid: 1, ngakara: 1 },   // Buri
    { okid: 1, ngakara: 2 },   // Tui
    { okid: 2, ngakara: 3 },   // Stamijan
    { okid: 3, ngakara: 5 },   // Naelst
    { okid: 5, ngakara: 8 },   // Onnar
    { okid: 8, ngakara: 12 },  // Elster
    { okid: 15, ngakara: 20 }, // Torcain
  ];

  /* ---------- Craft-by-Okid (admin-designed) ----------
     OFF by default (null). When the admin enables it (Admin → Balance &
     Economy → "Crafted token power per Okid rarity"), crafting a Hunt shard
     lets the player choose which Okid rarity to spend, and THAT choice decides
     how strong the crafted token is: the target rarity plus flat stat
     multipliers, all designer-controlled. Shape when set: an array of 7 (one
     per Okid rarity index) of { rarity, hpMul, dmgMul, speedMul }. */
  E.CRAFT_BY_OKID = null;
  E.defaultCraftByOkid = function () {
    return RARITIES_LEN().map((_, i) => ({ rarity: i, hpMul: 1, dmgMul: 1, speedMul: 1 }));
  };
  function RARITIES_LEN() { return new Array(7).fill(0); }

  /* When ON, the world stops auto-generating filler tokens (ambient Dya'kukull
     crafting, new-AI starter collections). Admin-designed and player tokens are
     untouched. Lets the creator hand-author every active token. */
  E.NO_AUTOGEN = false;

  /* ---------- Combine Okid (fuse up a tier) ----------
     "3 of the same rarity Okid combine into 1 of the next rarity above."
     need = how many of tier N are consumed, yield = how many of tier N+1 are
     produced. Admin-tunable in Balance & Economy. */
  E.COMBINE_OKID = { need: 3, yield: 1 };

  /* ---------- Market ---------- */
  E.MARKET_TAX = [0.03, 0.05, 0.07, 0.10, 0.13, 0.17, 0.20]; // by rarity index
  E.BUYBACK_RATE = 0.75;       // Dya Guild buyback: 75% of market average, no tax
  E.LISTING_FEE = 50;          // flat per listing
  E.TRUSTED_SELLER_SALES = 100;

  /* ---------- Rentals ---------- */
  E.RENTAL = {
    maxTokens: 13,
    baseRate: 0.25,           // 25% of market price per token
    perTokenDiscount: 0.01,   // -1% per additional token rented
    floorRate: 0.03,          // floor at 23+ tokens
    periodMs: DYA.util.NURTUI_MS, // 1 Nurtui = 5 real hours
  };
  E.rentalRate = function (count) {
    return Math.max(E.RENTAL.floorRate, E.RENTAL.baseRate - E.RENTAL.perTokenDiscount * (count - 1));
  };

  /* ---------- Pouch ---------- */
  E.POUCH_SIZE = 25;

  /* ---------- Hunts ---------- */
  E.HUNT = {
    slotEveryLevels: 10,
    cooldownMs: DYA.util.NURTUI_MS, // per-creature cooldown, 1 Nurtui
    goldFloorRate: 0.10, // 10% of creature's gold ceiling
    /* payout ceilings per huntable creature */
    ceilings: {
      su_naga: { gold: 1200, okid: 5, ngakara: 8 },
      sru_vorn: { gold: 900, okid: 4, ngakara: 5 },
      lutut: { gold: 800, okid: 4, ngakara: 5 },
      hvaleia: { gold: 1000, okid: 5, ngakara: 6 },
      ular_naga: { gold: 850, okid: 4, ngakara: 5 },
      tonguatjis: { gold: 550, okid: 3, ngakara: 4 },
      kuni_byrd_wild: { gold: 700, okid: 3, ngakara: 4 },
    },
    secondPieceChance: 0.06,  // extremely rare, never telegraphed, perfect runs only
  };

  /* ---------- Achievements ---------- */
  E.ACHIEVEMENTS = [
    { id: 'first_match', name: 'First Steps on the Field', desc: 'Complete your first match.', hint: 'Play one match of Dya’Akara.', tokenReward: true },
    { id: 'first_win', name: 'The Relic Comes Home', desc: 'Win your first match.', hint: 'Capture the Relic and bring it to your hoard.' },
    { id: 'first_craft', name: 'Songs and NgAkara', desc: 'Craft your first token.', hint: 'Craft a token at the workbench.' },
    { id: 'first_hunt', name: 'Tracker', desc: 'Complete your first Hunt.', hint: 'Complete a Hunt from the Adventures screen.' },
    { id: 'first_sale', name: 'Open for Business', desc: 'Sell a token at your stall.', hint: 'List and sell a token on the market.' },
    { id: 'first_duel', name: 'One on One', desc: 'Win a Duel.', hint: 'Win a 1v1 token duel.' },
    { id: 'win_10', name: 'Local Contender', desc: 'Win 10 matches.', tiered: [10, 100, 1000], tierNames: ['Local Contender', 'Regional Force', 'Living Legend'], hint: 'Win matches. Keep winning matches.' },
    { id: 'craft_10', name: 'Okid Smith', desc: 'Craft 10 tokens.', tiered: [10, 50, 200], tierNames: ['Okid Smith', 'Relic Wright', 'Master of Truths'], hint: 'Craft many tokens.' },
    { id: 'collect_25', name: 'Collector', desc: 'Own 25 tokens at once.', tiered: [25, 60, 150], tierNames: ['Collector', 'Curator', 'Living Library'], hint: 'Grow your collection.' },
    { id: 'tourney_win', name: 'Circuit Breaker', desc: 'Win a tournament.', hint: 'Win any tournament through the browser.' },
    { id: 'relic_fast', name: 'Blink and You Missed It', desc: 'Capture the Relic in under 3 minutes.', hint: 'Win very, very fast.' },
    { id: 'no_losses_hunt', name: 'Perfect Hunt', desc: 'Complete a Hunt without losing a token.', hint: 'Protect every token during a Hunt.' },
    { id: 'mcfly_witness', name: 'The ShurgrEdan Answer', desc: 'Witness a ShurgrEdan retribution.', hint: 'Some rules should not be broken. See it happen.' },
    { id: 'rich_1', name: 'Full Pouches', desc: 'Hold 10,000 gold at once.', tiered: [10000, 100000, 1000000], tierNames: ['Full Pouches', 'Vaultholder', 'Wealth of Velki'], hint: 'Accumulate gold.' },
    { id: 'streak_5', name: 'Momentum', desc: 'Win 5 matches in a row.', hint: 'Do not lose.' },
    { id: 'level_10', name: 'Rising Name', desc: 'Reach level 10.', hint: 'Earn XP from matches.' },
    { id: 'level_50', name: 'Known Across the Tatu', desc: 'Reach level 50.', hint: 'Earn a great deal of XP.' },
    { id: 'all_elements', name: 'Four Winds', desc: 'Own tokens of all four elements.', hint: 'Collect Su, Eldi, Fti, and Ular tokens.' },
    { id: 'torcain_own', name: 'Legend in Hand', desc: 'Own a Torcain token.', hint: 'Obtain a legendary token.' },
    { id: 'duel_wager', name: 'High Stakes', desc: 'Win a duel with a token wagered.', hint: 'Wager a token in a duel. Win.' },
  ];

  /* ---------- Titles (tournament pools, with buffs) ----------
     Only equipped title's buff is active. Level/achievement titles cosmetic only. */
  E.TITLES = [
    // Local — awarded automatically, no pre-match selection
    { id: 't_local_champ', name: 'Tavern Champion', tier: 'Local', buff: { xp: 0.03 }, desc: '+3% match XP' },
    { id: 't_local_hand', name: 'Steady Hand', tier: 'Local', buff: { gold: 0.03 }, desc: '+3% match gold' },
    { id: 't_local_eye', name: 'Keen Eye', tier: 'Local', buff: { huntScore: 0.03 }, desc: '+3% Hunt performance' },
    // Regional — chosen from organizer's pool
    { id: 't_reg_warden', name: 'Warden of the Region', tier: 'Regional', buff: { xp: 0.06 }, desc: '+6% match XP' },
    { id: 't_reg_trader', name: 'Guild-Favored Trader', tier: 'Regional', buff: { tax: -0.02 }, desc: '-2% market tax' },
    { id: 't_reg_tamer', name: 'Beast-Tamer', tier: 'Regional', buff: { startRes: 1 }, desc: '+1 starting resource in matches' },
    // Half Planet
    { id: 't_half_voice', name: 'Voice of the Half-World', tier: 'Half Planet', buff: { xp: 0.10 }, desc: '+10% match XP' },
    { id: 't_half_stygian', name: 'Stygian-Blessed', tier: 'Half Planet', buff: { craftDiscount: 1 }, desc: '-1 Okid on all crafts (min 1)' },
    { id: 't_half_relic', name: 'Relic Runner', tier: 'Half Planet', buff: { startRes: 2 }, desc: '+2 starting resources in matches' },
    // Planet — pick 3 before the final, keep 1
    { id: 't_planet_velki', name: 'Champion of Velki', tier: 'Planet', buff: { xp: 0.15, gold: 0.1 }, desc: '+15% XP, +10% gold' },
    { id: 't_planet_xikia', name: 'Champion of Xikia', tier: 'Planet', buff: { tax: -0.04, gold: 0.1 }, desc: '-4% tax, +10% gold' },
    { id: 't_planet_leotik', name: 'Champion of Leotik', tier: 'Planet', buff: { huntScore: 0.1, startRes: 2 }, desc: '+10% Hunt score, +2 starting resources' },
    // Interplanetary — bundled effects
    { id: 't_inter_mbaru', name: 'Champion of the Mbaru Tatu', tier: 'Interplanetary', buff: { xp: 0.2, gold: 0.15, tax: -0.05, startRes: 2 }, desc: '+20% XP, +15% gold, -5% tax, +2 starting resources' },
  ];

  /* ---------- Match settings vote options ---------- */
  E.PULSE_INTERVALS = [2, 5, 8, 10, 15];
  E.PULSE_AMOUNTS = [1, 2, 3, 4, 5];

  /* ---------- Escalation ---------- */
  E.escalationMult = function (elapsedSec) {
    if (elapsedSec < 600) return 1;
    if (elapsedSec < 900) return 2;
    if (elapsedSec < 1200) return 3;
    return 4 + Math.floor((elapsedSec - 1200) / 300); // +1x every 5 min thereafter
  };

  /* ---------- Tournament circuits ---------- */
  E.CIRCUITS = ['Local', 'Regional', 'Half Planet', 'Whole Planet', 'Interplanetary'];
  E.CIRCUIT_XP = { 'Local': 150, 'Regional': 350, 'Half Planet': 800, 'Whole Planet': 2000, 'Interplanetary': 6000 };
  E.CIRCUIT_GOLD = { 'Local': 120, 'Regional': 400, 'Half Planet': 1200, 'Whole Planet': 3500, 'Interplanetary': 12000 };
  E.CIRCUIT_MIN_LEVEL = { 'Local': 1, 'Regional': 5, 'Half Planet': 15, 'Whole Planet': 30, 'Interplanetary': 40 };

  /* ---------- Official season ladder ----------
     The Guild's season is one long ranked ladder, not a bracket. Everyone
     starts in their Local circuit and plays other players there; winning
     raises your rank, and enough rank PROMOTES you to the next circuit. A
     match is always available — a real player at your circuit if one is
     looking, otherwise a Dya'kukull who fills in. Titles are earned by
     reaching each circuit (official-only). */
  E.CIRCUIT_RANK_FLOOR = { 'Local': 0, 'Regional': 1150, 'Half Planet': 1350, 'Whole Planet': 1550, 'Interplanetary': 1750 };
  E.SEASON_RANK = { win: 25, draw: 0, loss: -18 }; // rating move per official-season match
  /* which circuit a given ranked rating sits in (highest floor it clears) */
  E.circuitForRank = function (rank) {
    let cur = E.CIRCUITS[0];
    for (const c of E.CIRCUITS) { if ((rank || 0) >= E.CIRCUIT_RANK_FLOOR[c]) cur = c; }
    return cur;
  };
  E.circuitIndexForRank = function (rank) { return E.CIRCUITS.indexOf(E.circuitForRank(rank)); };
  /* rank needed for the next promotion, or null at the top */
  E.nextCircuitFloor = function (rank) {
    const i = E.circuitIndexForRank(rank);
    const next = E.CIRCUITS[i + 1];
    return next ? E.CIRCUIT_RANK_FLOOR[next] : null;
  };

  /* ---------- Regions (home region choices; each planet's circuits) ---------- */
  E.REGIONS = [
    { id: 'velkinovek', name: 'Velkinovek', planet: 'Velki', blurb: 'The most populated continent on Velki. Busy circuits, busier taverns.' },
    { id: 'fyrsti', name: 'Fyrsti’Vilag', planet: 'Velki', blurb: 'The rebuilt city of the World Arena. Home of the grandest matches.' },
    { id: 'nekh_ftisular', name: 'Nekh FtiSular', planet: 'Velki', blurb: 'The mist-shrouded northern supercontinent. Quiet, strange, old.' },
    { id: 'xikia_low', name: 'Xikia Lowlands', planet: 'Xikia', blurb: 'Home to nearly half of all Eikar. The heart of the game’s history.' },
    { id: 'xikia_high', name: 'Xikia Highlands', planet: 'Xikia', blurb: 'Keilia country. Towers, keeps, and the finest builders alive.' },
    { id: 'leotik_frontier', name: 'Leotik Frontier', planet: 'Leotik', blurb: 'Wild, venomous, barely mapped. The bravest hunters live here.' },
    { id: 'ularklug', name: 'UlarKlug', planet: 'Leotik', blurb: 'The keep built around a controlled Urverk. Fortress players.' },
  ];

  DYA.economy = E;
})();
