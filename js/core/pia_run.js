/* ============================================================
   DYA'AKARA — core/pia_run.js
   LEGENDS OF PIA'DON — the run / map manager.

   Owns a `run`: the branching node map, each Guardian's deck,
   relics, HP and gold, and the phase machine that moves the party
   from map → battle → reward → map, up to the planet's Quarry.

   Built multi-player from the start: `run.players` is an array, so
   solo is simply a party of one and the co-op layer (core/pia_coop)
   syncs the exact same object. All battle logic delegates to
   core/pia_engine. Pure enough to run headless in a test.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util, D = DYA.piaData, EN = DYA.piaEngine;
  const R = {};

  const FLOORS = 10;             // 0..9, with 9 = the Quarry
  const REST_FLOOR = 8;

  /* ================= MAP GENERATION ================= */
  R.genMap = function (seed, planetId, diffId) {
    const rng = new U.Rng((seed >>> 0) ^ 0x5eed);
    const diff = D.difficulty(diffId);
    const floors = [];
    for (let f = 0; f < FLOORS; f++) {
      let nodes;
      if (f === FLOORS - 1) nodes = [{ type: 'boss' }];
      else if (f === REST_FLOOR) nodes = [{ type: 'rest' }];
      else {
        const width = rng.int(2, 3);
        nodes = [];
        for (let i = 0; i < width; i++) nodes.push({ type: pickType(rng, f, diff) });
      }
      nodes.forEach((n, i) => { n.id = 'f' + f + 'n' + i; n.f = f; n.i = i; n.w = nodes.length; n.to = []; });
      floors.push(nodes);
    }
    /* edges by index proximity, guaranteeing reachability */
    for (let f = 0; f < floors.length - 1; f++) {
      const cur = floors[f], nxt = floors[f + 1];
      const incoming = {};
      cur.forEach(node => {
        const base = nxt.length === 1 ? 0 : Math.round(node.i * (nxt.length - 1) / Math.max(1, cur.length - 1));
        const targets = new Set([base]);
        if (rng.chance(0.5) && base + 1 < nxt.length) targets.add(base + 1);
        if (rng.chance(0.3) && base - 1 >= 0) targets.add(base - 1);
        targets.forEach(t => { node.to.push(nxt[t].id); incoming[t] = true; });
      });
      /* any next node with no incoming edge — link it from the nearest current node */
      nxt.forEach((nn, j) => {
        if (incoming[j]) return;
        let best = cur[0], bestD = 1e9;
        cur.forEach(node => { const base = nxt.length === 1 ? 0 : Math.round(node.i * (nxt.length - 1) / Math.max(1, cur.length - 1)); const d = Math.abs(base - j); if (d < bestD) { bestD = d; best = node; } });
        best.to.push(nn.id);
      });
    }
    const byId = {};
    floors.forEach(fl => fl.forEach(n => byId[n.id] = n));
    return { floors, byId, start: floors[0].map(n => n.id) };
  };

  function pickType(rng, f, diff) {
    if (f <= 1) return 'battle';
    const r = rng.next();
    const eMin = diff ? diff.eliteFloorMin : 3;
    const eCh = diff ? diff.eliteChance : 0.14;
    if (f >= eMin && r < eCh) return 'elite';
    if (r < eCh + 0.16) return 'event';
    if (r < eCh + 0.16 + 0.10) return 'merchant';
    if (f >= 2 && r < eCh + 0.16 + 0.10 + 0.06) return 'treasure';
    return 'battle';
  }

  /* ================= RUN CREATION ================= */
  /* opts: { seed, planet, mode, difficulty, campaignLen, players:[{id,name,guardianId}] }
     campaignLen 1 = a single run; 2–3 = a Pilgrimage across that many worlds,
     one hero carrying deck / relics / gold between them. */
  R.create = function (opts) {
    const seed = (opts.seed != null ? opts.seed : U.newSeed()) >>> 0;
    const startPlanet = opts.planet || 'velki';
    const diffId = D.difficulty(opts.difficulty).id;
    const len = U.clamp(opts.campaignLen || 1, 1, 3);
    /* pilgrimage worlds: start planet, then the rest in order, no repeats */
    const order = D.PLANETS.map(p => p.id);
    const worlds = [startPlanet];
    order.forEach(id => { if (worlds.length < len && worlds.indexOf(id) < 0) worlds.push(id); });
    const run = {
      seed, planet: startPlanet, mode: opts.mode || 'solo', diffId: diffId,
      hostId: opts.players[0].id,
      players: opts.players.map((pc, idx) => newRunPlayer(pc, idx)),
      map: R.genMap(seed, startPlanet, diffId),
      currentNodeId: null, available: null, floor: -1,
      battle: null, phase: 'map', rewards: null, shop: null,
      campaign: len > 1 ? { total: len, leg: 1, worlds: worlds } : null,
      legScale: 1, _battleSeed: seed,
    };
    run.available = run.map.start.slice();
    return run;
  };

  /* the difficulty combat mods for this run, scaled up per Pilgrimage leg */
  function diffMods(run) {
    const d = D.difficulty(run.diffId), leg = (run.legScale || 1);
    return Object.assign({}, d, { hpMul: d.hpMul * leg, dmgMul: d.dmgMul * (1 + (leg - 1) * 0.5) });
  }
  R.diffMods = diffMods;

  function newRunPlayer(pc, idx) {
    const g = D.guardian(pc.guardianId) || D.GUARDIANS[0];
    const mods = {};
    (g.startRelic ? [g.startRelic] : []).forEach(() => {});
    const relicMods = D.relic(g.startRelic) && D.relic(g.startRelic).mods || {};
    const maxHp = g.maxHp + (relicMods.maxHpDelta || 0);
    return {
      id: pc.id, name: pc.name || g.name, guardianId: g.id,
      deck: D.expandDeck(g.deck).map(id => ({ id, upg: false })),
      relics: g.startRelic ? [g.startRelic] : [],
      gold: D.TUNE.startGold + (relicMods.warm ? 40 : 0),
      hp: maxHp, maxHp: maxHp, potions: [],
      rewardChoices: null, rewardTaken: false, restDone: false,
      seat: idx, connected: true,
    };
  }

  /* ================= ENCOUNTER BUILDING ================= */
  R.encounterFor = function (run, node) {
    const pl = D.planet(run.planet);
    const diff = D.difficulty(run.diffId);
    const rng = new U.Rng((run.seed ^ U.hashStr(node.id) ^ ((run.campaign ? run.campaign.leg : 1) * 2654435761)) >>> 0);
    if (node.type === 'boss') return { type: 'boss', boss: pl.boss };
    if (node.type === 'elite') {
      const keys = [rng.pick(pl.elites)];
      if (node.f >= 6) keys.push(rng.pick(pl.fodder));
      if (diff.extraEnemyChance > 0 && rng.chance(diff.extraEnemyChance)) keys.push(rng.pick(pl.fodder));
      return { type: 'elite', enemies: keys };
    }
    /* ordinary battle: 1–3 fodder, scaling by floor depth (+difficulty extra) */
    let count = U.clamp(1 + Math.floor(node.f / 4) + (rng.chance(0.4) ? 1 : 0), 1, 3);
    if (diff.extraEnemyChance > 0 && rng.chance(diff.extraEnemyChance)) count = Math.min(4, count + 1);
    const keys = [];
    for (let i = 0; i < count; i++) keys.push(rng.pick(pl.fodder));
    return { type: 'battle', enemies: keys };
  };

  /* ================= ENTER A NODE ================= */
  R.enterNode = function (run, nodeId) {
    const node = run.map.byId[nodeId];
    if (!node) return;
    if (run.available && run.available.indexOf(nodeId) < 0) return; // not reachable
    run.currentNodeId = nodeId;
    run.floor = node.f;
    run.players.forEach(p => { p.rewardChoices = null; p.rewardTaken = false; p.restDone = false; });
    switch (node.type) {
      case 'battle': case 'elite': case 'boss':
        R.startBattle(run, node); break;
      case 'rest': case 'event':
        run.phase = 'rest'; break;
      case 'merchant':
        run.phase = 'shop'; R.rollShop(run); break;
      case 'treasure':
        run.phase = 'treasure'; R.rollTreasure(run); break;
      default: run.phase = 'map';
    }
  };

  R.startBattle = function (run, node) {
    const enc = R.encounterFor(run, node);
    run.battle = EN.create({
      seed: (run.seed ^ U.hashStr(node.id) ^ (run.floor * 7919) ^ ((run.campaign ? run.campaign.leg : 1) * 104729)) >>> 0,
      planet: run.planet,
      node: enc,
      playerCount: run.players.length,
      diff: diffMods(run),
      players: run.players.map(p => ({
        id: p.id, name: p.name, guardianId: p.guardianId,
        deck: p.deck, relics: p.relics, hp: p.hp, maxHp: p.maxHp,
      })),
    });
    run.phase = 'battle';
  };

  /* ================= BATTLE RESOLUTION ================= */
  /* called after each battle mutation to see if the fight ended */
  R.syncBattleResult = function (run) {
    const b = run.battle; if (!b || !b.over) return false;
    /* carry HP back to the run */
    b.players.forEach(bp => { const p = R.player(run, bp.id); if (p) p.hp = bp.hp; });
    if (b.victory) {
      const node = run.map.byId[run.currentNodeId];
      R.grantVictory(run, node);
    } else {
      run.phase = 'gameover';
    }
    return true;
  };

  R.grantVictory = function (run, node) {
    const isBoss = node.type === 'boss';
    const isElite = node.type === 'elite';
    const diff = D.difficulty(run.diffId);
    const rng = new U.Rng((run.seed ^ U.hashStr(node.id) ^ 0xbeef) >>> 0);
    run.players.forEach(p => {
      if (p.hp <= 0) return;
      /* gold (scaled by difficulty) */
      const baseGold = isBoss ? 100 : isElite ? 45 : rng.int(14, 26);
      const gm = (1 + relicSum(p, 'goldMul')) * (diff.goldMul || 1);
      p.gold += Math.round(baseGold * gm);
      /* post-battle relic heals */
      p.hp = U.clamp(p.hp + relicSum(p, 'nodeHeal'), 0, p.maxHp);
      p.gold += relicSum(p, 'nodeGold');
      /* card reward: 3 choices */
      p.rewardChoices = R.rollCardChoices(run, p, rng, isElite || isBoss);
      p.rewardTaken = false;
      /* elites/bosses also drop a relic choice */
      if (isElite || isBoss) p.relicReward = R.rollRelic(run, p, rng);
    });
    /* a Pilgrimage: felling a world's Quarry with legs remaining opens a
       reward, then a leg-complete interstitial rather than the final win. */
    const moreLegs = isBoss && run.campaign && run.campaign.leg < run.campaign.total;
    run._legBossCleared = moreLegs;
    run.phase = (isBoss && !moreLegs) ? 'win' : 'reward';
  };

  R.rollCardChoices = function (run, p, rng, better) {
    const odds = D.TUNE.rewardOdds;
    const out = [];
    const tries = 0;
    while (out.length < 3) {
      const r = rng.next();
      let rar = 'common';
      if (better) { if (r < 0.5) rar = 'uncommon'; else if (r < 0.72) rar = 'rare'; else rar = 'common'; }
      else { if (r < odds.common) rar = 'common'; else if (r < odds.common + odds.uncommon) rar = 'uncommon'; else rar = 'rare'; }
      const pool = D.rewardPool(p.guardianId, rar).filter(id => out.indexOf(id) < 0);
      if (!pool.length) continue;
      out.push(rng.pick(pool));
      if (out.length > 20) break;
    }
    return out;
  };

  R.rollRelic = function (run, p, rng) {
    const owned = p.relics;
    const pool = Object.keys(D.RELICS).filter(id => D.RELICS[id].rarity !== 'starter' && owned.indexOf(id) < 0);
    return pool.length ? rng.pick(pool) : null;
  };

  /* player takes (or skips) their card reward */
  R.takeReward = function (run, playerId, cardId) {
    const p = R.player(run, playerId); if (!p || p.rewardTaken) return;
    if (cardId && p.rewardChoices && p.rewardChoices.indexOf(cardId) >= 0) {
      p.deck.push({ id: cardId, upg: false });
    }
    p.rewardTaken = true;
    R.maybeAdvance(run);
  };
  R.takeRelicReward = function (run, playerId, accept) {
    const p = R.player(run, playerId); if (!p) return;
    if (accept && p.relicReward && p.relics.indexOf(p.relicReward) < 0) p.relics.push(p.relicReward);
    p.relicReward = null;
  };

  /* once every connected player has taken their reward, return to map —
     or, if this was a Pilgrimage world's Quarry, to the leg-complete beat */
  R.maybeAdvance = function (run) {
    if (run.phase !== 'reward') return;
    const pending = run.players.filter(p => p.connected && !p.rewardTaken && p.hp > 0);
    if (pending.length > 0) return;
    if (run._legBossCleared) { run._legBossCleared = false; run.phase = 'legcomplete'; return; }
    R.toMap(run);
  };

  /* advance a Pilgrimage to its next world, carrying the hero intact */
  R.nextLeg = function (run) {
    if (!run.campaign || run.campaign.leg >= run.campaign.total) { run.phase = 'win'; return; }
    run.campaign.leg++;
    run.legScale = 1 + (run.campaign.leg - 1) * 0.3;   // each world hits harder
    run.planet = run.campaign.worlds[run.campaign.leg - 1] || run.planet;
    run.map = R.genMap((run.seed ^ (run.campaign.leg * 40503)) >>> 0, run.planet, run.diffId);
    run.available = run.map.start.slice();
    run.currentNodeId = null; run.floor = -1; run.battle = null; run.shop = null;
    /* a breather between worlds — mend a good chunk, but not to full */
    run.players.forEach(p => { if (p.hp > 0) p.hp = U.clamp(p.hp + Math.round(p.maxHp * 0.4), 0, p.maxHp); p.rewardChoices = null; p.relicReward = null; p.treasureRelic = null; });
    run.phase = 'map';
  };

  /* ================= REST / EVENT ================= */
  R.restHeal = function (run, playerId) {
    const p = R.player(run, playerId); if (!p || p.restDone) return;
    const mul = D.difficulty(run.diffId).restHealMul || 1;
    p.hp = U.clamp(p.hp + Math.round(p.maxHp * D.TUNE.restHeal * mul), 0, p.maxHp);
    p.restDone = true;
    R.maybeAdvanceRest(run);
  };
  R.restUpgrade = function (run, playerId, deckIndex) {
    const p = R.player(run, playerId); if (!p || p.restDone) return;
    const c = p.deck[deckIndex];
    if (c && !c.upg && D.card(c.id) && D.card(c.id).upgrade) c.upg = true;
    p.restDone = true;
    R.maybeAdvanceRest(run);
  };
  R.maybeAdvanceRest = function (run) {
    const pending = run.players.filter(p => p.connected && !p.restDone && p.hp > 0);
    if (pending.length === 0) R.toMap(run);
  };

  /* ================= SHOP ================= */
  R.rollShop = function (run) {
    const rng = new U.Rng((run.seed ^ U.hashStr(run.currentNodeId) ^ 0x5401) >>> 0);
    const lead = run.players[0];
    const cards = [];
    ['common', 'common', 'uncommon', 'uncommon', 'rare'].forEach(rar => {
      const pool = D.rewardPool(lead.guardianId, rar);
      if (pool.length) cards.push({ id: rng.pick(pool), price: rar === 'rare' ? 130 : rar === 'uncommon' ? 75 : 45 });
    });
    const relicPool = Object.keys(D.RELICS).filter(id => D.RELICS[id].rarity !== 'starter');
    const relics = [{ id: rng.pick(relicPool), price: 140 }];
    run.shop = { cards, relics, potions: [] };
  };
  R.buyCard = function (run, playerId, idx) {
    const p = R.player(run, playerId), item = run.shop && run.shop.cards[idx];
    if (!p || !item || item.sold || p.gold < item.price) return false;
    p.gold -= item.price; p.deck.push({ id: item.id, upg: false }); item.sold = true; return true;
  };
  R.buyRelic = function (run, playerId, idx) {
    const p = R.player(run, playerId), item = run.shop && run.shop.relics[idx];
    if (!p || !item || item.sold || p.gold < item.price || p.relics.indexOf(item.id) >= 0) return false;
    p.gold -= item.price; p.relics.push(item.id); item.sold = true; return true;
  };
  R.leaveShop = function (run) { R.toMap(run); };

  /* ================= TREASURE ================= */
  R.rollTreasure = function (run) {
    const rng = new U.Rng((run.seed ^ U.hashStr(run.currentNodeId) ^ 0x7a3) >>> 0);
    run.players.forEach(p => {
      const pool = Object.keys(D.RELICS).filter(id => D.RELICS[id].rarity !== 'starter' && p.relics.indexOf(id) < 0);
      p.treasureRelic = pool.length ? rng.pick(pool) : null;
    });
  };
  R.takeTreasure = function (run, playerId, accept) {
    const p = R.player(run, playerId); if (!p) return;
    if (accept && p.treasureRelic && p.relics.indexOf(p.treasureRelic) < 0) p.relics.push(p.treasureRelic);
    p.treasureRelic = null; p.restDone = true;
    R.maybeAdvanceRest(run);
  };

  /* ================= MAP ADVANCE ================= */
  R.toMap = function (run) {
    const node = run.map.byId[run.currentNodeId];
    run.available = node ? node.to.slice() : [];
    run.battle = null; run.shop = null;
    run.players.forEach(p => { p.rewardChoices = null; p.relicReward = null; p.treasureRelic = null; });
    run.phase = (run.available.length === 0) ? 'win' : 'map';
  };

  /* ================= HELPERS ================= */
  R.player = function (run, id) { return run.players.find(p => p.id === id); };
  function relicSum(p, key) {
    let s = 0; p.relics.forEach(rid => { const r = D.relic(rid); if (r && r.mods && typeof r.mods[key] === 'number') s += r.mods[key]; }); return s;
  }
  /* warm_hoard special (goldMul stored, warm start handled at create) */

  /* ================= PERSISTENCE (solo) ================= */
  R.saveKey = function () { const me = DYA.state && DYA.state.me; return 'pia_run_' + (me ? me.id : 'guest'); };
  R.saveSolo = function (run) {
    if (!run || run.mode !== 'solo') return;
    try { localStorage.setItem(R.saveKey(), JSON.stringify(stripForSave(run))); } catch (e) { }
  };
  R.loadSolo = function () {
    try { const s = localStorage.getItem(R.saveKey()); if (!s) return null; const run = JSON.parse(s); if (run.battle) EN.attachRng(run.battle); return run; } catch (e) { return null; }
  };
  R.clearSolo = function () { try { localStorage.removeItem(R.saveKey()); } catch (e) { } };
  function stripForSave(run) {
    const c = JSON.parse(JSON.stringify(run, (k, v) => k === '_rng' ? undefined : v));
    return c;
  }

  /* ================= UNIFIED ACTION DISPATCH =================
     One entry point for every player action, so solo and co-op
     (host) apply moves through the exact same code path. Returns
     true if the action changed state. `action.playerId` identifies
     the acting Guardian. */
  R.applyAction = function (run, action) {
    if (!run || !action) return false;
    switch (action.type) {
      case 'enterNode':
        if (run.phase === 'map') { R.enterNode(run, action.nodeId); return true; }
        return false;
      case 'playCard': {
        if (run.phase !== 'battle' || !run.battle) return false;
        const r = EN.playCard(run.battle, action.playerId, action.handIdx, action.targetUid);
        if (r.ok) R.syncBattleResult(run);
        return r.ok;
      }
      case 'endTurn': {
        if (run.phase !== 'battle' || !run.battle) return false;
        const r = EN.endTurn(run.battle, action.playerId);
        if (r.ok) R.syncBattleResult(run);
        return r.ok;
      }
      case 'takeReward': R.takeReward(run, action.playerId, action.cardId); return true;
      case 'takeRelic': R.takeRelicReward(run, action.playerId, action.accept); return true;
      case 'rest':
        if (action.mode === 'upgrade') R.restUpgrade(run, action.playerId, action.deckIndex);
        else R.restHeal(run, action.playerId);
        return true;
      case 'takeTreasure': R.takeTreasure(run, action.playerId, action.accept); return true;
      case 'buyCard': return R.buyCard(run, action.playerId, action.idx);
      case 'buyRelic': return R.buyRelic(run, action.playerId, action.idx);
      case 'leaveShop': R.leaveShop(run); return true;
      case 'nextLeg': if (run.phase === 'legcomplete') { R.nextLeg(run); return true; } return false;
      default: return false;
    }
  };

  DYA.piaRun = R;
})();
