/* ============================================================
   DYA'AKARA — core/pia_engine.js
   LEGENDS OF PIA'DON — the turn-based battle engine.

   A small, pure-ish reducer over a `battle` state: Guardians play
   energy-cost cards, summon allied creatures, and trade blows with
   telegraphed enemies. It runs identically for solo and co-op —
   the co-op layer just calls these same functions on a host and
   broadcasts the resulting state.

   Public API (all mutate + return a small result):
     create(config)                -> battle
     playCard(battle,pid,idx,tgt)  -> {ok,err}
     endTurn(battle,pid)           -> {ok, resolved}
     resolveEnemyTurn(battle)      -> void   (ally + enemy phases)
     cardCost(battle,pid,card)     -> number
     netClone(battle)              -> JSON-safe copy (no rng fn)
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util, D = DYA.piaData;
  const E = {};

  /* ---------- small helpers ---------- */
  function alivePlayers(b) { return b.players.filter(p => !p.dead); }
  function aliveEnemies(b) { return b.enemies.filter(e => e.hp > 0); }
  function aliveAllies(b) { return b.allies.filter(a => a.hp > 0); }
  function playerById(b, id) { return b.players.find(p => p.id === id); }
  function log(b, s) { b.log.push(s); if (b.log.length > 60) b.log.shift(); }

  /* record a UI event on the current batch */
  function emit(b, o) { if (b && b.events) { o.n = b.evId++; b.events.push(o); } }
  /* start a fresh event batch (new array reference so the UI detects it) */
  function freshEvents(b) { b.events = []; }

  /* aggregate all relic mods for a player into one bag */
  function relicMods(relicIds) {
    const m = {};
    (relicIds || []).forEach(rid => {
      const r = D.relic(rid); if (!r || !r.mods) return;
      for (const k in r.mods) {
        if (typeof r.mods[k] === 'number') m[k] = (m[k] || 0) + r.mods[k];
        else m[k] = r.mods[k];
      }
    });
    return m;
  }

  /* ================= CREATE ================= */
  /* config = { seed, planet, node:{type,enemies:[key...],boss:key},
       players:[{id,name,guardianId,deck:[{id,upg}],relics:[id],hp,maxHp}],
       playerCount } */
  E.create = function (config) {
    const b = {
      seed: config.seed >>> 0,
      _rng: new U.Rng((config.seed >>> 0) ^ 0x1a2b3c),
      planet: config.planet || 'velki',
      nodeType: (config.node && config.node.type) || 'battle',
      playerCount: config.playerCount || config.players.length,
      players: [], allies: [], enemies: [],
      turn: 0, phase: 'player', over: false, victory: null, log: [],
      allyUid: 1, enemyUid: 1,
      /* an ordered stream of what happened during the last applied action,
         for the UI to animate (who hit whom, ticks, heals, deaths). Reset
         at the start of each action; the reference changes so the UI knows
         a fresh batch arrived. */
      events: [], evId: 0, _src: null,
      /* difficulty combat mods (defaults = Hunter / 1×, no complications) */
      diff: Object.assign({ hpMul: 1, dmgMul: 1, enemyStartBlock: 0, affixChance: 0, affixOnFodder: false, bossSummonReduce: 0 }, config.diff || {}),
    };

    config.players.forEach((pc, i) => {
      const g = D.guardian(pc.guardianId) || D.GUARDIANS[0];
      const mods = relicMods(pc.relics);
      const maxHp = (pc.maxHp != null ? pc.maxHp : g.maxHp) + (mods.maxHpDelta || 0);
      const p = {
        id: pc.id, name: pc.name || g.name, guardianId: g.id, avatar: g.avatar,
        element: g.element, color: g.color,
        maxHp: maxHp, hp: U.clamp(pc.hp != null ? pc.hp : maxHp, 1, maxHp),
        block: 0, energy: 0, baseEnergy: D.TUNE.baseEnergy,
        seat: i, relics: (pc.relics || []).slice(), mods: mods,
        hand: [], draw: [], discard: [], exhaust: [],
        st: { str: 0, dex: 0, vuln: 0, weak: 0, poison: 0, regen: 0 },
        powers: {}, firstPlayed: false, ended: false, dead: false,
        deathWardUsed: false, turnOne: true,
      };
      /* build the draw pile from the run deck, shuffled */
      const deck = (pc.deck && pc.deck.length) ? pc.deck.slice()
        : D.expandDeck(g.deck).map(id => ({ id, upg: false }));
      p.draw = b._rng.shuffle(deck.map(c => ({ id: c.id, upg: !!c.upg })));
      b.players.push(p);
    });

    /* build enemies (scaled for co-op) */
    buildEnemies(b, config.node || {});

    computeIntents(b);
    startPlayerPhase(b, true);
    return b;
  };

  function scaleForCount(base, arr, n) {
    const idx = U.clamp(n, 0, arr.length - 1);
    return Math.round(base * arr[idx]);
  }

  function makeEnemy(b, key, hpScale, dmgScale) {
    const def = D.enemyDef(key); if (!def) return null;
    const dm = b.diff || {};
    const hp = Math.max(1, Math.round(def.hp * hpScale * (dm.hpMul || 1)));
    const e = {
      uid: 'E' + (b.enemyUid++), key: key, species: def.species, name: def.name,
      maxHp: hp, hp: hp,
      block: 0, size: def.size || 1, boss: !!def.boss, elite: !!def.elite,
      heads: def.heads || 0,
      st: { vuln: 0, weak: 0, poison: 0, str: 0 },
      moves: def.moves, summonEvery: def.summonEvery || 0,
      dmgScale: dmgScale * (dm.dmgMul || 1), history: [], intent: null, summonCounter: 0,
      armor: 0, thorns: 0, venom: 0, regen: 0, affix: null,
    };
    /* the Quarry calls its shoals more often on higher trials */
    if (e.summonEvery && dm.bossSummonReduce) e.summonEvery = Math.max(2, e.summonEvery - dm.bossSummonReduce);
    return e;
  }

  /* difficulty complications: a starting shield, and a possible affix */
  function applyDiff(b, e, eligible) {
    const dm = b.diff || {};
    if (dm.enemyStartBlock) e.block += dm.enemyStartBlock;
    if (eligible && dm.affixChance > 0 && b._rng.chance(dm.affixChance)) {
      const key = b._rng.pick(D.AFFIX_KEYS); const a = D.affix(key);
      if (a) {
        e.affix = key;
        if (a.armor) e.armor = a.armor;
        if (a.thorns) e.thorns = a.thorns;
        if (a.venom) e.venom = a.venom;
        if (a.regen) e.regen = a.regen;
        e.name = a.name + ' ' + e.name;
      }
    }
  }

  function buildEnemies(b, node) {
    const n = b.playerCount, dm = b.diff || {};
    const hpScale = (D.TUNE.enemyHpScale[U.clamp(n, 0, 3)] || 1);
    const dmgScale = (D.TUNE.enemyDmgScale[U.clamp(n, 0, 3)] || 1);
    if (node.boss) {
      const e = makeEnemy(b, node.boss, hpScale, dmgScale);
      if (e) { applyDiff(b, e, true); b.enemies.push(e); }
      /* a boss gets one guard minion per extra player, for pressure */
      const extra = Math.max(0, n - 1);
      const boss = D.bossDef(node.boss);
      const minionKey = boss && boss.moves.find(m => m.summon) ? boss.moves.find(m => m.summon).summon : null;
      for (let i = 0; i < extra && minionKey; i++) {
        const m = makeEnemy(b, minionKey, hpScale, dmgScale); if (m) { applyDiff(b, m, !!dm.affixOnFodder); b.enemies.push(m); }
      }
    } else {
      let keys = (node.enemies || []).slice();
      /* bigger packs with more Guardians */
      const add = Math.max(0, (n - 1)) * (D.TUNE.extraEnemiesPerPlayer || 0);
      if (add && keys.length) { for (let i = 0; i < add; i++) keys.push(keys[i % keys.length]); }
      keys.forEach(k => { const e = makeEnemy(b, k, hpScale, dmgScale); if (e) { applyDiff(b, e, (e.elite || !!dm.affixOnFodder)); b.enemies.push(e); } });
    }
  }

  /* ================= INTENTS (enemy AI) ================= */
  function computeIntents(b) {
    aliveEnemies(b).forEach(e => e.intent = chooseIntent(b, e));
  }
  function chooseIntent(b, e) {
    let moves = e.moves.slice();
    /* boss: force a summon on its cadence, if it has one */
    if (e.summonEvery && e.summonCounter >= e.summonEvery) {
      const s = moves.filter(m => m.intent === 'summon');
      if (s.length) return b._rng.pick(s);
    }
    /* avoid the exact same move 3 times running */
    const h = e.history;
    if (h.length >= 2 && h[h.length - 1] === h[h.length - 2]) {
      const last = h[h.length - 1];
      const alt = moves.filter(m => m.id !== last);
      if (alt.length) moves = alt;
    }
    /* don't summon every turn */
    if (e.summonEvery && e.summonCounter < e.summonEvery) moves = moves.filter(m => m.intent !== 'summon') .length ? moves.filter(m => m.intent !== 'summon') : moves;
    return b._rng.pick(moves);
  }

  /* ================= STATUS + DAMAGE ================= */
  function applyPoison(target, n) { target.st.poison = (target.st.poison || 0) + n; }
  function applyVuln(target, n) { target.st.vuln = (target.st.vuln || 0) + n; }
  function applyWeak(target, n) { target.st.weak = (target.st.weak || 0) + n; }

  /* outgoing attack damage from an attacker with strength/weak */
  function outgoing(base, attacker) {
    let dmg = base + (attacker.st ? (attacker.st.str || 0) : (attacker.str || 0));
    if (attacker.st && attacker.st.weak > 0) dmg = Math.floor(dmg * 0.75);
    return Math.max(0, Math.round(dmg));
  }

  function dealToEnemy(b, e, amount, opts) {
    if (e.hp <= 0) return 0;
    opts = opts || {};
    let dmg = amount;
    if (e.st.vuln > 0) dmg = Math.floor(dmg * 1.5);
    dmg = Math.max(0, dmg);
    let remaining = dmg, blocked = 0;
    if (e.block > 0) { const s = Math.min(e.block, remaining); e.block -= s; remaining -= s; blocked = s; }
    e.hp -= remaining;
    emit(b, { t: 'dmg', src: opts.src || b._src || null, tgt: e.uid, amt: remaining, blocked: blocked, kind: opts.kind || 'hit' });
    /* affix: Thorned strikes the attacker back on a melee/card attack */
    if (e.thorns && opts.kind === 'attack' && opts.src) {
      const src = entityById(b, opts.src);
      if (src) { if (src.kind === 'player') dealToPlayer(b, src.ref, e.thorns, { src: e.uid, kind: 'thorns' }); else dealToAlly(b, src.ref, e.thorns, { src: e.uid, kind: 'thorns' }); }
    }
    if (e.hp <= 0) { e.hp = 0; log(b, e.name + ' is felled.'); emit(b, { t: 'die', tgt: e.uid }); }
    return dmg;
  }

  /* resolve an event source id to the acting player or ally */
  function entityById(b, id) {
    const p = b.players.find(x => x.id === id); if (p) return { kind: 'player', ref: p };
    const a = b.allies.find(x => x.uid === id); if (a) return { kind: 'ally', ref: a };
    return null;
  }

  function dealToPlayer(b, p, amount, opts) {
    if (p.dead) return;
    opts = opts || {};
    let dmg = amount;
    if (p.st.vuln > 0) dmg = Math.floor(dmg * 1.5);
    dmg = Math.max(0, dmg);
    let blocked = 0;
    if (p.block > 0) { const s = Math.min(p.block, dmg); p.block -= s; dmg -= s; blocked = s; }
    if (dmg <= 0) { emit(b, { t: 'dmg', src: opts.src || b._src || null, tgt: p.id, amt: 0, blocked: blocked, kind: opts.kind || 'hit' }); return; }
    if (p.hp - dmg <= 0 && p.mods.deathWard && !p.deathWardUsed) {
      p.deathWardUsed = true; p.hp = 1; log(b, p.name + ' is saved by the Stone Totem!');
      emit(b, { t: 'dmg', src: opts.src || b._src || null, tgt: p.id, amt: dmg, blocked: blocked, kind: opts.kind || 'hit' });
      emit(b, { t: 'ward', tgt: p.id });
      return;
    }
    p.hp -= dmg;
    emit(b, { t: 'dmg', src: opts.src || b._src || null, tgt: p.id, amt: dmg, blocked: blocked, kind: opts.kind || 'hit' });
    if (p.hp <= 0) { p.hp = 0; p.dead = true; log(b, p.name + ' falls!'); emit(b, { t: 'die', tgt: p.id }); }
  }

  function dealToAlly(b, a, amount, opts) {
    opts = opts || {};
    const d = Math.max(0, amount);
    a.hp -= d;
    emit(b, { t: 'dmg', src: opts.src || b._src || null, tgt: a.uid, amt: d, blocked: 0, kind: opts.kind || 'hit' });
    if (a.hp <= 0) { a.hp = 0; log(b, a.name + ' is destroyed.'); emit(b, { t: 'die', tgt: a.uid }); }
  }

  /* heal / block / status emitters (so the UI can show +N and pulses) */
  function healEntity(b, ent, tgtId, amount, kind) {
    const before = ent.hp; ent.hp = U.clamp(ent.hp + amount, 0, ent.maxHp);
    const gained = ent.hp - before;
    if (gained > 0) emit(b, { t: 'heal', tgt: tgtId, amt: gained, kind: kind || 'heal' });
    return gained;
  }
  function gainBlock(b, ent, tgtId, amount) {
    if (amount <= 0) return; ent.block += amount;
    emit(b, { t: 'block', tgt: tgtId, amt: amount });
  }
  function emitStatus(b, tgtId, key, amt) { if (amt > 0) emit(b, { t: 'status', tgt: tgtId, key: key, amt: amt }); }

  /* ================= SUMMONS ================= */
  function summon(b, p, key) {
    const def = D.summonDef(key); if (!def) return;
    if (aliveAllies(b).filter(a => a.ownerId === p.id).length >= D.TUNE.maxSummons) {
      log(b, p.name + ' cannot call more — the field is full.'); return;
    }
    const bonusHp = (p.mods.summonHp || 0);
    const bonusDmg = (p.mods.summonDmg || 0);
    const a = {
      uid: 'A' + (b.allyUid++), ownerId: p.id, key: key,
      species: def.species, name: def.name,
      maxHp: def.hp + bonusHp, hp: def.hp + bonusHp,
      dmg: (def.dmg || 0) + bonusDmg, str: 0, block: def.block || 0,
      taunt: !!def.taunt, healAlly: def.healAlly || 0, poison: def.poison || 0,
    };
    b.allies.push(a);
    log(b, p.name + ' calls a ' + def.name + '.');
    emit(b, { t: 'summon', tgt: a.uid, owner: p.id });
    return a;
  }

  /* ================= CARD COST / PLAY ================= */
  E.cardCost = function (b, pid, card) {
    const p = playerById(b, pid); if (!p) return card.cost || 0;
    if (p.powers.firstFree && !p.firstPlayed) return 0;
    return card.cost || 0;
  };

  /* pick default target enemy if none given */
  function defaultEnemy(b) { const es = aliveEnemies(b); return es.length ? es[0] : null; }

  E.playCard = function (b, pid, handIdx, targetUid) {
    if (b.over || b.phase !== 'player') return { ok: false, err: 'Not your phase.' };
    const p = playerById(b, pid);
    if (!p || p.dead || p.ended) return { ok: false, err: 'Cannot play.' };
    const inst = p.hand[handIdx];
    if (!inst) return { ok: false, err: 'No such card.' };
    const card = mergedCard(inst);
    const cost = E.cardCost(b, pid, card);
    if (p.energy < cost) return { ok: false, err: 'Not enough Vaelk.' };

    let target = null;
    if (needsTarget(card)) {
      target = targetUid ? b.enemies.find(e => e.uid === targetUid && e.hp > 0) : defaultEnemy(b);
      if (!target) target = defaultEnemy(b);
      if (!target) return { ok: false, err: 'No target.' };
    }

    freshEvents(b);
    emit(b, { t: 'play', src: p.id, card: card.name, ctype: card.type });
    p.energy -= cost;
    p.firstPlayed = true;
    /* remove from hand -> discard (or exhaust) */
    p.hand.splice(handIdx, 1);

    /* on-play power: Thousand Cuts */
    if (p.powers.cutsOnPlay) aliveEnemies(b).forEach(e => dealToEnemy(b, e, p.powers.cutsOnPlay, { src: p.id, kind: 'cuts' }));

    applyEffects(b, p, card, target);

    /* on-attack power: Urverk Stance */
    if (card.type === 'attack' && p.powers.blockOnAttack) gainBlock(b, p, p.id, p.powers.blockOnAttack);
    /* on-skill power: Tidal Bulwark */
    if (card.type === 'skill' && p.powers.blockOnSkill) gainBlock(b, p, p.id, p.powers.blockOnSkill);

    if (card.exhaust) p.exhaust.push({ id: inst.id, upg: inst.upg });
    else p.discard.push({ id: inst.id, upg: inst.upg });

    checkOver(b);
    return { ok: true };
  };

  function needsTarget(card) {
    if (card.type === 'summon' && !(card.e && card.e.aoe)) {
      // summon may also carry an aoe attack (Pyre) -> aoe, no single target
      return false;
    }
    const e = card.e || {};
    if (e.aoe || e.poisonAll || e.detonatePoison) return false;
    if (card.target === 'self' || card.target === 'allEnemies') return false;
    return !!(e.damage || e.poison || e.vuln || e.weak);
  }

  /* merge a card's upgrade over its base when upg=true */
  function mergedCard(inst) {
    const base = D.card(inst.id); if (!base) return { id: inst.id, name: '???', cost: 0, e: {} };
    if (!inst.upg || !base.upgrade) return Object.assign({}, base, { upg: false });
    const up = base.upgrade;
    const merged = Object.assign({}, base, { upg: true });
    if (up.cost != null) merged.cost = up.cost;
    if (up.e) merged.e = Object.assign({}, base.e, up.e);
    if (up.summonBonus) merged._summonBonus = up.summonBonus;
    return merged;
  }
  E.mergedCard = mergedCard;

  function applyEffects(b, p, card, target) {
    const e = card.e || {};

    /* summons first so buffs like strAllies can include them */
    if (card.type === 'summon' || card.summon) {
      const keys = Array.isArray(card.summon) ? card.summon : (card.summon ? [card.summon] : []);
      keys.forEach(k => {
        summon(b, p, k);
        if (card._summonBonus) {
          const a = b.allies[b.allies.length - 1];
          if (a) { a.maxHp += (card._summonBonus.hp || 0); a.hp += (card._summonBonus.hp || 0);
            a.dmg += (card._summonBonus.dmg || 0); a.healAlly += (card._summonBonus.healAlly || 0); }
        }
      });
    }

    /* self buffs */
    if (e.str) { p.st.str += e.str; emitStatus(b, p.id, 'str', e.str); }
    if (e.dex) { p.st.dex += e.dex; emitStatus(b, p.id, 'dex', e.dex); }
    if (e.regen) { p.st.regen += e.regen; emitStatus(b, p.id, 'regen', e.regen); }
    if (e.block) gainBlock(b, p, p.id, e.block + (p.st.dex || 0));
    if (e.heal) healEntity(b, p, p.id, e.heal, 'heal');
    if (e.energy) p.energy += e.energy;
    if (e.draw) draw(b, p, e.draw);
    if (e.strAllies) b.allies.filter(a => a.ownerId === p.id && a.hp > 0).forEach(a => { a.str += e.strAllies; emitStatus(b, a.uid, 'str', e.strAllies); });
    if (e.blockAllies) b.allies.filter(a => a.ownerId === p.id && a.hp > 0).forEach(a => gainBlock(b, a, a.uid, e.blockAllies));
    if (e.power) p.powers[e.power] = (e.amount != null ? e.amount : true);

    /* damage */
    if (e.detonatePoison) {
      aliveEnemies(b).forEach(en => { if (en.st.poison > 0) dealToEnemy(b, en, en.st.poison, { src: p.id, kind: 'detonate' }); });
    }
    if (e.damage) {
      const hits = e.hits || 1;
      const targets = (e.aoe || card.target === 'allEnemies') ? aliveEnemies(b) : (target ? [target] : []);
      for (let h = 0; h < hits; h++) {
        targets.forEach(en => {
          if (en.hp <= 0) return;
          let base = e.damage;
          if (e.bonusIfBlock && p.block > 0) base += e.bonusIfBlock;
          const dealt = dealToEnemy(b, en, outgoing(base, p), { src: p.id, kind: 'attack' });
          if (e.lifesteal) healEntity(b, p, p.id, dealt, 'lifesteal');
          if (e.refundOnKill && en.hp <= 0) p.energy += e.refundOnKill;
        });
      }
    }
    /* debuffs on target(s) */
    const debuffTargets = (e.aoe || card.target === 'allEnemies' || e.poisonAll) ? aliveEnemies(b) : (target ? [target] : []);
    if (e.poison) debuffTargets.forEach(en => { if (en.hp > 0) { applyPoison(en, e.poison); emitStatus(b, en.uid, 'poison', e.poison); } });
    if (e.poisonAll) aliveEnemies(b).forEach(en => { applyPoison(en, e.poisonAll); emitStatus(b, en.uid, 'poison', e.poisonAll); });
    if (e.vuln) debuffTargets.forEach(en => { if (en.hp > 0) { applyVuln(en, e.vuln); emitStatus(b, en.uid, 'vuln', e.vuln); } });
    if (e.weak) debuffTargets.forEach(en => { if (en.hp > 0) { applyWeak(en, e.weak); emitStatus(b, en.uid, 'weak', e.weak); } });
  }

  /* ================= DRAW ================= */
  function draw(b, p, n) {
    for (let i = 0; i < n; i++) {
      if (p.draw.length === 0) {
        if (p.discard.length === 0) break;
        p.draw = b._rng.shuffle(p.discard); p.discard = [];
      }
      if (p.hand.length >= 10) { p.discard.push(p.draw.pop()); continue; }
      p.hand.push(p.draw.pop());
    }
  }

  /* ================= PHASES ================= */
  function startPlayerPhase(b, first) {
    b.phase = 'player';
    b.turn++;
    alivePlayers(b).forEach(p => {
      p.block = 0; p.ended = false; p.firstPlayed = false;
      /* battle-start relic effects land on the first turn (so start
         Block survives the turn-start block reset) */
      if (p.turnOne) {
        if (p.mods.startBlock) gainBlock(b, p, p.id, p.mods.startBlock);
        if (p.mods.startRegen) { p.st.regen += p.mods.startRegen; emitStatus(b, p.id, 'regen', p.mods.startRegen); }
        if (p.mods.startPoisonRandom) { const es = aliveEnemies(b); if (es.length) { const en = b._rng.pick(es); applyPoison(en, p.mods.startPoisonRandom); emitStatus(b, en.uid, 'poison', p.mods.startPoisonRandom); } }
      }
      /* poison ticks on the player at the top of their turn */
      if (p.st.poison > 0) { dealToPlayer(b, p, p.st.poison, { kind: 'poison' }); p.st.poison = Math.max(0, p.st.poison - 1); if (p.dead) return; }
      /* regen heals */
      if (p.st.regen > 0) { healEntity(b, p, p.id, p.st.regen, 'regen'); p.st.regen = Math.max(0, p.st.regen - 1); }
      /* energy */
      p.energy = p.baseEnergy + (p.mods.energyPerTurn || 0);
      if (p.turnOne && p.mods.startEnergyOnce) p.energy += p.mods.startEnergyOnce;
      /* weak/vuln on the player decay each of their turns */
      if (p.st.weak > 0) p.st.weak--;
      if (p.st.vuln > 0) p.st.vuln--;
      /* ally growth powers / relics */
      const grow = (p.powers.allyGrowth || 0) + (p.mods.allyGrowthPerTurn || 0);
      if (grow) b.allies.filter(a => a.ownerId === p.id && a.hp > 0).forEach(a => a.str += grow);
      /* draw */
      draw(b, p, D.TUNE.handSize + (p.mods.drawPerTurn || 0));
      p.turnOne = false;
    });
    checkOver(b);
  }

  E.endTurn = function (b, pid) {
    if (b.over || b.phase !== 'player') return { ok: false };
    const p = playerById(b, pid);
    if (!p || p.dead) return { ok: false };
    p.ended = true;
    /* discard hand */
    while (p.hand.length) p.discard.push(p.hand.pop());
    const allDone = alivePlayers(b).every(x => x.ended);
    if (allDone) { E.resolveEnemyTurn(b); return { ok: true, resolved: true }; }
    return { ok: true, resolved: false };
  };

  E.resolveEnemyTurn = function (b) {
    if (b.over) return;
    freshEvents(b);
    b.phase = 'enemy';
    emit(b, { t: 'phase', phase: 'ally' });

    /* ---- ally phase: your summons act ---- */
    aliveAllies(b).forEach(a => {
      const owner = playerById(b, a.ownerId);
      if (a.block && owner && !owner.dead) gainBlock(b, owner, owner.id, a.block);
      if (a.healAlly) {
        const hurt = alivePlayers(b).sort((x, y) => (x.hp / x.maxHp) - (y.hp / y.maxHp))[0];
        if (hurt) healEntity(b, hurt, hurt.id, a.healAlly, 'heal');
      }
      if (a.dmg > 0) {
        const en = pickEnemyTarget(b);
        if (en) { dealToEnemy(b, en, outgoing(a.dmg + a.str, a), { src: a.uid, kind: 'attack' }); if (a.poison && en.hp > 0) { applyPoison(en, a.poison); emitStatus(b, en.uid, 'poison', a.poison); } }
      }
    });
    checkOver(b);
    if (b.over) return;

    /* ---- enemy phase ---- */
    emit(b, { t: 'phase', phase: 'enemy' });
    aliveEnemies(b).forEach(e => {
      /* poison ticks on the enemy */
      if (e.st.poison > 0) { dealToEnemy(b, e, e.st.poison, { kind: 'poison' }); e.st.poison = Math.max(0, e.st.poison - 1); }
      if (e.hp <= 0) return;
      /* affix: Vital heals a little each turn */
      if (e.regen) healEntity(b, e, e.uid, e.regen, 'regen');
      e.block = 0;
      /* affix: Armored raises a shield each turn */
      if (e.armor) gainBlock(b, e, e.uid, e.armor);
      executeIntent(b, e);
      if (e.st.weak > 0) e.st.weak--;
      if (e.st.vuln > 0) e.st.vuln--;
      e.history.push(e.intent ? e.intent.id : '');
      if (e.summonEvery) e.summonCounter = (e.intent && e.intent.intent === 'summon') ? 0 : e.summonCounter + 1;
    });
    checkOver(b);
    if (b.over) return;

    computeIntents(b);
    startPlayerPhase(b, false);
  };

  /* which player/ally an enemy hits: taunting allies first */
  function pickPlayerTarget(b) {
    const taunts = aliveAllies(b).filter(a => a.taunt);
    if (taunts.length) return { type: 'ally', ref: b._rng.pick(taunts) };
    const ps = alivePlayers(b);
    if (!ps.length) return null;
    return { type: 'player', ref: b._rng.pick(ps) };
  }
  /* which enemy an ally hits: prefer non-boss fodder, else the boss */
  function pickEnemyTarget(b) {
    const es = aliveEnemies(b);
    if (!es.length) return null;
    const fodder = es.filter(e => !e.boss);
    return (fodder.length ? b._rng.pick(fodder) : es[0]);
  }

  function executeIntent(b, e) {
    const m = e.intent || e.moves[0];
    const dmgScale = e.dmgScale || 1;
    switch (m.intent) {
      case 'attack': {
        const hits = m.hits || 1;
        for (let h = 0; h < hits; h++) {
          const tgt = pickPlayerTarget(b); if (!tgt) return;
          const dmg = outgoing(Math.round(m.dmg * dmgScale), e);
          if (tgt.type === 'ally') { dealToAlly(b, tgt.ref, dmg, { src: e.uid, kind: 'attack' }); }
          else { dealToPlayer(b, tgt.ref, dmg, { src: e.uid, kind: 'attack' }); if (e.venom && !tgt.ref.dead) { tgt.ref.st.poison = (tgt.ref.st.poison || 0) + e.venom; emitStatus(b, tgt.ref.id, 'poison', e.venom); } }
        }
        break;
      }
      case 'block': gainBlock(b, e, e.uid, m.block || 0); break;
      case 'buff': if (m.str) { e.st.str += m.str; emitStatus(b, e.uid, 'str', m.str); } break;
      case 'debuff': {
        const tgt = pickPlayerTarget(b);
        if (m.dmg) { const dmg = outgoing(Math.round(m.dmg * dmgScale), e);
          if (tgt) { if (tgt.type === 'ally') dealToAlly(b, tgt.ref, dmg, { src: e.uid, kind: 'attack' }); else dealToPlayer(b, tgt.ref, dmg, { src: e.uid, kind: 'attack' }); } }
        if (tgt && tgt.type === 'player') {
          if (m.weak) { tgt.ref.st.weak += m.weak; emitStatus(b, tgt.ref.id, 'weak', m.weak); }
          if (m.vuln) { tgt.ref.st.vuln += m.vuln; emitStatus(b, tgt.ref.id, 'vuln', m.vuln); }
        }
        break;
      }
      case 'summon': {
        const count = m.count || 1;
        for (let i = 0; i < count; i++) {
          const nm = makeEnemy(b, m.summon, 1, dmgScale);
          if (nm && aliveEnemies(b).length < 8) { applyDiff(b, nm, !!(b.diff && b.diff.affixOnFodder)); nm.intent = chooseIntent(b, nm); b.enemies.push(nm); emit(b, { t: 'spawn', tgt: nm.uid, src: e.uid }); }
        }
        log(b, e.name + ' summons reinforcements!');
        break;
      }
    }
  }

  /* ================= WIN / LOSE ================= */
  function checkOver(b) {
    if (b.over) return;
    if (aliveEnemies(b).length === 0) { b.over = true; b.victory = true; b.phase = 'won'; log(b, 'Victory.'); return; }
    if (alivePlayers(b).length === 0) { b.over = true; b.victory = false; b.phase = 'lost'; log(b, 'The Guardians have fallen.'); return; }
  }
  E.checkOver = checkOver;

  /* ================= NET CLONE ================= */
  /* JSON-safe snapshot for broadcasting (drops the rng fn). Clients
     render from this; only the host mutates + calls the reducer. */
  E.netClone = function (b) {
    const c = {};
    for (const k in b) { if (k === '_rng') continue; c[k] = b[k]; }
    return JSON.parse(JSON.stringify(c));
  };

  /* rebuild a live battle (with rng) from a net snapshot — host only
     needs the rng; clients keep the plain object. Used if a client
     is promoted to host. */
  E.attachRng = function (b) { if (!b._rng) b._rng = new U.Rng((b.seed >>> 0) ^ 0x1a2b3c); return b; };

  /* expose a couple of read helpers the UI wants */
  E.aliveEnemies = aliveEnemies;
  E.alivePlayers = alivePlayers;
  E.aliveAllies = aliveAllies;
  E.playerById = playerById;

  DYA.piaEngine = E;
})();
