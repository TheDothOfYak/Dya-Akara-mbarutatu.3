/* ============================================================
   DYA'AKARA — engine/match.js
   The deterministic match engine.

   - Fixed timestep (20 ticks/sec), all randomness from the match
     seed → identical outcomes on every client & in replays.
   - Replays = seed + input log (design doc Part XIV).
   - Standard match: pulses, Relic capture, tether, escalation.
   - Duel mode: 1v1 tokens, no resources/pulse/Relic, no draws.
   - Hunt mode: encounter objectives against wild creatures.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util, SP = DYA.species, EC = DYA.economy, BV = DYA.behaviors, TK = DYA.token;

  const TICK = 1 / 20;
  const WORLD = { w: 1600, h: 1000 };
  const HOARD_R = 70;
  const RELIC_PICK_R = 26;
  const ELS = ['Fti', 'Su', 'Eldi', 'Ular'];

  function startVec(n) {
    const v = { Fti: 0, Su: 0, Eldi: 0, Ular: 0 };
    for (let i = 0; i < n; i++) v[ELS[i % 4]]++;
    return v;
  }
  function resTotal(v) { return v.Fti + v.Su + v.Eldi + v.Ular; }
  function canAfford(v, cost) { return ELS.every(e => v[e] >= (cost[e] || 0)); }
  function payCost(v, cost) { ELS.forEach(e => { v[e] -= (cost[e] || 0); }); }
  function mostAbundant(v) { return ELS.slice().sort((a, b) => v[b] - v[a])[0]; }

  function Match(cfg) {
    const M = this;
    M.cfg = cfg;
    M.mode = cfg.mode || 'standard';
    M.seed = cfg.seed >>> 0;
    M.rng = new U.Rng(M.seed);
    M.tick = 0;
    M.time = 0;
    M.over = false;
    M.result = null;
    M.paused = false;
    M.world = WORLD;
    M.terrain = DYA.lore.TERRAIN_SETS.find(t => t.id === (cfg.terrain || 'plains')) || DYA.lore.TERRAIN_SETS[0];
    M.settings = Object.assign({ pulseInterval: 8, pulseAmount: 2, chaos: false }, cfg.settings || {});
    M.creatures = [];
    M.projectiles = [];
    M.effects = [];
    M.structures = [];
    M.zones = [];          // bogs, fire patches
    M.remnants = [];
    M.pickups = []; /* field morsels: Karnen food, chemist pieces */       // crushed makari etc.
    M.orbs = [];           // resource orb visuals
    M.pendingSpawns = [];  // uff respawns etc.
    M.inputQueue = [];
    M.log = [];            // full input log for replay
    M.pulseIndex = 0;
    M.nextPulseAt = M.settings.pulseInterval;
    M.pulseElement = 'Ular';
    M.lastCombatTick = 0;
    M.events = [];         // UI-facing event feed
    M.idCounter = 1;

    /* teams */
    M.teams = cfg.teams.map((t, i) => ({
      idx: i,
      name: t.name,
      accId: t.accId || null,
      controller: t.controller,             // 'human' | 'ai' | 'replay' | 'wild'
      seal: t.seal || null,
      aiSkill: t.aiSkill || 0.6,
      color: i === 0 ? '#d9b87a' : '#b05a5a',
      hoard: i === 0 ? { x: 240, y: WORLD.h / 2 } : { x: WORLD.w - 240, y: WORLD.h / 2 },
      resources: startVec(t.startResources || 0),
      pouch: (t.pouch || []).map(tok => ({ tok, state: 'pouch', readiedAtPulse: -1, deaths: 0 })),
      readied: [],                          // pouch entries, max 5
      stats: { tokensPlayed: [], eliminations: 0, relicCaptured: false, relicMethod: null, resourcesEarned: 0, stolen: 0, combos: {} },
      aiMem: { nextThink: 2 + i },
      aiRng: new U.Rng((cfg.seed >>> 0) ^ ((i + 1) * 0x9E3779B9)),
    }));

    /* Dual relics (July update §1): each side keeps its own relic in its
       hoard; you win by carrying the OPPONENT'S relic home. */
    M.relics = M.teams.map((T2, i) => ({
      ownerTeam: i, x: T2.hoard.x, y: T2.hoard.y - 26,
      homeX: T2.hoard.x, homeY: T2.hoard.y - 26,
      carrier: null, carrierTeam: null, captured: false, disabled: false,
    }));

    /* terrain features → obstacles & water zones (visual + light gameplay: bogs/water flags) */
    M.props = [];
    (function genTerrain() {
      const trng = new U.Rng(M.seed ^ 0x7E44);
      const feats = M.terrain.features || [];
      const n = 14;
      for (let i = 0; i < n; i++) {
        const x = trng.range(240, WORLD.w - 240), y = trng.range(90, WORLD.h - 90);
        if (Math.abs(x - WORLD.w / 2) < 130 && Math.abs(y - WORLD.h / 2) < 130) continue;
        const kind = trng.pick(feats.length ? feats : ['rocks']);
        M.props.push({ kind, x, y, s: trng.range(0.7, 1.5), seed: trng.int(0, 999) });
      }
      if (M.terrain.water) {
        M.zones.push({ type: 'water', x: WORLD.w / 2, y: WORLD.h - 140, r: 260, team: -1 });
        M.zones.push({ type: 'water', x: WORLD.w / 2 - 380, y: 160, r: 180, team: -1 });
      }
      /* organizer-placed terrain tokens (July update §15) */
      (cfg.terrainTokens || []).forEach((tt, i) => {
        const tx = WORLD.w / 2 + (i === 0 ? -1 : 1) * trng.range(80, 260);
        const ty = trng.range(WORLD.h * 0.3, WORLD.h * 0.7);
        if (tt === 'forest') M.zones.push({ type: 'forest', x: tx, y: ty, r: 120, team: -1 });
        else if (tt === 'water') M.zones.push({ type: 'water', x: tx, y: ty, r: 130, team: -1 });
      });
    })();

    /* duel mode: spawn both tokens immediately, no economy */
    if (M.mode === 'duel') {
      M.teams.forEach((t, i) => {
        const entry = t.pouch[0];
        if (entry) M.spawnFromToken(entry.tok, i, i === 0 ? WORLD.w * 0.35 : WORLD.w * 0.65, WORLD.h / 2);
      });
    }

    /* hunt/duel: no relics on the field */
    if (M.mode === 'hunt' || M.mode === 'duel') { M.relics.forEach(r => { r.captured = true; r.disabled = true; }); }

    /* hunt mode: spawn wild side */
    if (M.mode === 'hunt' && cfg.hunt) {
      cfg.hunt.enemies.forEach((e, i) => {
        const tok = e.tok || TK.mint({ speciesId: e.speciesId, rng: M.rng, rarity: e.rarity });
        const cx = WORLD.w * 0.72 + M.rng.range(-90, 90), cy = WORLD.h / 2 + M.rng.range(-190, 190);
        const c = M.spawnFromToken(tok, 1, cx, cy);
        if (e.boss) { c.isBoss = true; c.maxHp *= 1.6; c.hp = c.maxHp; }
      });
      M.teams[1].controller = 'wild';
    }
  }

  /* ================= CREATURES ================= */

  Match.prototype.spawnFromToken = function (tok, teamIdx, x, y) {
    const M = this;
    const sp = SP.get(tok.speciesId);
    const sizeIdx = tok.sizeIdx;
    const mul = sp.statMul || { hp: 1, dmg: 1, speed: 1 };
    const heads = tok.picks && tok.picks.headCount ? tok.picks.headCount : (sp.features.heads ? sp.features.heads[0] : 1);
    const c = {
      id: M.idCounter++,
      tokId: tok.id, tokName: tok.name, tok,
      speciesId: sp.id, sp,
      team: teamIdx,
      x: U.clamp(x, 20, WORLD.w - 20), y: U.clamp(y, 20, WORLD.h - 20),
      homeX: x, homeY: y,
      facing: teamIdx === 0 ? 1 : -1,
      sizeIdx,
      radius: SP.SIZE_RADIUS[sizeIdx] * (sp.rig === 'field' ? 1.6 : 1),
      maxHp: tok.stats.hp, hp: tok.stats.hp,
      dmg: tok.stats.dmg,
      speed: tok.stats.speed,
      attackRange: sp.attackRange || 20,
      attackCd: 0,
      state: 'idle', stateTick: 0,
      vars: Object.assign({}, tok.vars), picks: tok.picks || {},
      diamonds: tok.diamonds || {},
      tokAge: tok.age || 0.5,
      mem: {},
      buffs: [],
      tetherFrac: 0,
      matchXp: 0, growthPulses: 0,
      dead: false, deadTick: 0,
      spawnTick: M.tick, spawnTime: M.time,
      lastHitTick: null, lastAttacker: null,
      stunnedUntil: 0,
      carryingRelic: false,
      phase: sp.behavior === 'big_momma_kofi' ? 'breeding' : null,
      headCount: heads, headsLeft: heads,
      quiver: tok.vars && tok.vars.quiver ? Math.round(tok.vars.quiver) : 0,
      heat: tok.vars && tok.vars.heat != null ? tok.vars.heat : 0,
      frenzy: 0,
      onTower: null,
      camoUntil: 0,
      intent: {},
      animPhase: (M.idCounter * 0.61803) % 1 * 6.28,
    };
    /* the player's own Eikar — the token of THEM — reads the field and
       sounds the horn on its own; it is exactly as smart as its keeper */
    c.isCommander = !!(tok.isSelf || (tok.isStarter && sp.eikarLayer));

    /* life-history quirks (Part V): each individual's lived experience,
       applied as real field effects. Stat-shaping ones land here; the
       situational ones are read during the sim. All deterministic. */
    c.quirks = {};
    (TK.quirks ? TK.quirks(tok) : []).forEach(qid => { c.quirks[qid] = true; });
    if (c.quirks.heavy_boned) { c.maxHp = Math.round(c.maxHp * 1.18); c.hp = c.maxHp; c.speed = Math.round(c.speed * 0.9); }
    if (c.quirks.swift_blood) { c.speed = Math.round(c.speed * 1.15); c.maxHp = Math.max(2, Math.round(c.maxHp * 0.92)); c.hp = c.maxHp; }
    if (c.quirks.keen_eye) c.attackRange = Math.round(c.attackRange * 1.15);
    if (c.quirks.long_wind) {
      if (c.vars.breathRange) c.vars.breathRange *= 1.2;
      else if (c.vars.vineLength) c.vars.vineLength *= 1.2;
      else if (c.vars.reach) c.vars.reach *= 1.2;
      else c.attackRange = Math.round(c.attackRange * 1.1);
    }
    if (c.quirks.hoard_sense && c.vars.stealRate) c.vars.stealRate *= 1.25;

    /* rooted species anchor where they land */
    if (sp.features.rootsOnDeploy || sp.features.stationary || sp.features.rooted || sp.rig === 'field' || sp.rig === 'tree' || sp.rig === 'relic') {
      c.rooted = true;
    }
    if (sp.behavior === 'gynge') c.state = 'dormant';
    if ((sp.features.rider || sp.tags.includes('mount')) && M.teams[teamIdx] && M.teams[teamIdx].stats) M.teams[teamIdx].stats.combos['Rider on the field'] = true;
    M.creatures.push(c);
    M.addEffect('deploy', x, y, { r: c.radius });
    return c;
  };


  /* ================= INPUTS ================= */
  /* input: {type:'ready', pouchIdx} | {type:'trigger', slot, x, y} |
            {type:'feed', creatureId} | {type:'chat', msg} | {type:'concede'} */
  Match.prototype.queueInput = function (team, input) {
    this.inputQueue.push({ tick: this.tick + 1, team, input });
  };

  Match.prototype.applyInput = function (team, input) {
    const M = this, T = M.teams[team];
    if (input.type === 'ready') {
      const entry = T.pouch[input.pouchIdx];
      if (!entry || entry.state !== 'pouch') return;
      if (T.readied.length >= 5) { M.uiEvent(team, 'deny', 'Ready panel is full (5 slots).'); return; }
      const cost = Object.assign({}, TK.costVec(entry.tok));
      /* additional cost (July update §1): +1 per prior defeat, any resource */
      const tax = entry.deaths || 0;
      if (tax > 0) {
        const taxRes = input.taxRes && ELS.includes(input.taxRes) ? input.taxRes : mostAbundant(T.resources);
        cost[taxRes] = (cost[taxRes] || 0) + tax;
      }
      if (!canAfford(T.resources, cost)) { M.uiEvent(team, 'deny', 'Not enough resources' + (tax ? ' (additional cost +' + tax + ')' : '') + '.'); return; }
      payCost(T.resources, cost);
      entry.state = 'readied';
      entry.readiedAtPulse = M.pulseIndex;
      T.readied.push(entry);
      M.uiEvent(team, 'ready', entry.tok.name + ' readied' + (tax ? ' (additional cost +' + tax + ')' : '') + '.');
    } else if (input.type === 'trigger') {
      const entry = T.readied[input.slot];
      if (!entry) return;
      if (entry.readiedAtPulse === M.pulseIndex) { M.uiEvent(team, 'deny', 'Cannot trigger in the same pulse it was readied.'); return; }
      let x = input.x, y = input.y;
      const eh = M.teams[1 - team].hoard;
      if (U.dist(x, y, eh.x, eh.y) < 130) { const a = Math.atan2(y - eh.y, x - eh.x); x = eh.x + Math.cos(a) * 130; y = eh.y + Math.sin(a) * 130; }
      T.readied.splice(input.slot, 1);
      entry.state = 'played';
      T.stats.tokensPlayed.push(entry.tok.speciesId);
      M.spawnFromToken(entry.tok, team, x, y);
      M.uiEvent(team, 'deploy', entry.tok.name + ' takes the field!');
    } else if (input.type === 'feed') {
      const c = M.creatures.find(cr => cr.id === input.creatureId);
      if (c && (c.speciesId === 'kuni_byrd_wild' || c.speciesId === 'kuni_byrd_ridden')) {
        c.mem.fedUntil = M.tick + Math.round((6 + (c.vars.foodMotivation || 0.5) * 8) / TICK);
      }
    } else if (input.type === 'concede') {
      M.finish(1 - team, 'concede');
    } else if (input.type === 'chat') {
      M.uiEvent(team, 'chat', input.msg);
    }
  };

  /* ================= MAIN STEP ================= */
  Match.prototype.step = function (dtReal) {
    const M = this;
    if (M.over || M.paused) return;
    M.acc = (M.acc || 0) + Math.min(dtReal, 0.25);
    while (M.acc >= TICK) {
      M.acc -= TICK;
      M.doTick();
      if (M.over) break;
    }
  };

  Match.prototype.doTick = function () {
    const M = this;
    M.tick++;
    M.time = M.tick * TICK;

    /* inputs scheduled for this tick */
    for (let i = 0; i < M.inputQueue.length; i++) {
      const q = M.inputQueue[i];
      if (q.tick <= M.tick) {
        M.log.push({ t: M.tick, team: q.team, i: q.input });
        M.applyInput(q.team, q.input);
        M.inputQueue.splice(i, 1); i--;
      }
    }

    /* replay input feed */
    if (M.cfg.replayLog) {
      while (M.replayPtr === undefined && (M.replayPtr = 0) === 0) { /* init */ }
      while (M.replayPtr < M.cfg.replayLog.length && M.cfg.replayLog[M.replayPtr].t <= M.tick) {
        const e = M.cfg.replayLog[M.replayPtr];
        M.applyInput(e.team, e.i);
        M.replayPtr++;
      }
    }

    /* pulses (standard + hunt) */
    if (M.mode !== 'duel' && M.time >= M.nextPulseAt) M.doPulse();

    /* AI controllers */
    M.teams.forEach(T => { if (T.controller === 'ai' && !M.cfg.replayLog) M.aiThink(T); });

    /* creature decisions (staggered) */
    const api = M.api();
    for (const c of M.creatures) {
      if (c.dead) continue;
      if (c.stunnedUntil > M.tick) { c.state = 'hit'; continue; }
      if ((M.tick + c.id) % 6 === 0) {
        c.intent = {};
        /* Duel: creatures ALWAYS fight — pursue to elimination, no idling (§1) */
        if (M.mode === 'duel') {
          const foe = api.nearestEnemy(c, 99999);
          if (foe) api.attack(c, foe, false, true, (c.vars.breathRange || c.sp.behavior === 'grothyn' || c.headCount > 1));
        } else {
          const b = BV[c.sp.behavior];
          if (b) { api._c = c; b(c, api); }
        }
        /* hunt drive: hunter-side creatures press toward the quarry when idle */
        if (M.mode === 'hunt' && c.team === 0 && !c.rooted && !c.intent.attackTarget &&
            !c.sp.tags.includes('passive') && c.sp.behavior !== 'kofi' && c.sp.behavior !== 'chemist' && c.sp.behavior !== 'karnen') {
          const quarry = api.nearestEnemy(c, 3000);
          if (quarry && U.dist(c.x, c.y, quarry.x, quarry.y) > 150) {
            c.intent.move = { x: quarry.x, y: quarry.y, run: false };
          }
        }
        /* hunt hunger: if the field goes quiet too long, the wild side hunts the hunters —
           and a starving beast eats whatever it reaches, prey threshold or not */
        if (M.mode === 'hunt' && c.team === 1 && !c.rooted && (M.tick - M.lastCombatTick) > 600 && !c.intent.attackTarget) {
          const prey = api.nearestEnemy(c, 3000);
          if (prey) {
            if (U.dist(c.x, c.y, prey.x, prey.y) < 220) c.intent.attackTarget = prey;
            else c.intent.move = { x: prey.x, y: prey.y, run: false };
          }
        }
      }
      M.execIntent(c);
    }

    /* projectiles */
    M.stepProjectiles();
    /* zones: bogs slow/damage, fire burns */
    M.stepZones();
    /* structures/buffs/regen/tether */
    M.stepMisc();

    /* win conditions */
    M.checkEnd();
  };

  /* ================= PULSES & RESOURCES ================= */
  /* The Sunear'Zikhron — the perpetual memory storm — passes overhead
     during the last minute of every five. Pure functions of match time,
     so the lockstep sim and every replay agree on the weather. */
  Match.prototype.zikhron = function () { return Math.floor(this.time / 60) % 5 === 4; };
  Match.prototype.zikFrac = function () {
    const t = this.time % 300; /* storm occupies 240–300s of each cycle */
    if (t < 240) return 0;
    return Math.max(0, Math.min(1, (t - 240) / 6, (300 - t) / 6));
  };

  Match.prototype.doPulse = function () {
    const M = this;
    M.pulseIndex++;
    /* hoard-sense quirk: every 4th pulse a living hoarder sniffs out +1 extra */
    for (const c of M.creatures) {
      if (c.dead || !c.quirks || !c.quirks.hoard_sense) continue;
      c.mem.hoardPulses = (c.mem.hoardPulses || 0) + 1;
      if (c.mem.hoardPulses % 4 === 0 && M.teams[c.team] && M.teams[c.team].resources) {
        M.teams[c.team].resources[ELS[M.rng.int(0, 3)]] += 1;
        M.addEffect('steal', c.x, c.y - c.radius, {});
      }
    }
    const esc = EC.escalationMult(M.time);
    /* escalation announcements at 10/15/20+ min */
    if (esc !== M.lastEsc) {
      M.lastEsc = esc;
      if (esc > 1) M.uiEvent(-1, 'event', 'ESCALATION ×' + esc + ' — resources per pulse multiplied.');
    }
    /* the Sunear'Zikhron passes overhead every fifth minute */
    const zik = M.zikhron();
    if (zik && !M.zikNoted) {
      M.zikNoted = true;
      M.uiEvent(-1, 'event', 'The Sunear’Zikhron passes overhead — McFlies glow, memories surge, the storm feeds the pulse.');
      if (!M.headless) DYA.audio.play('zikhron');
    }
    if (!zik && M.zikNoted) { M.zikNoted = false; M.uiEvent(-1, 'event', 'The Sunear’Zikhron moves on.'); }
    let interval = M.settings.pulseInterval, amount = M.settings.pulseAmount;
    if (M.settings.chaos) { interval = M.rng.pick(EC.PULSE_INTERVALS); amount = M.rng.pick(EC.PULSE_AMOUNTS); }
    M.nextPulseAt = M.time + interval;
    M.pulseElement = M.rng.pick(SP.ELEMENTS);
    M.teams.forEach(T => {
      if (T.controller === 'wild') return;
      /* four resources: each pulse distributes randomly among Fti/Su/Eldi/Ular */
      const units = [];
      for (let i = 0; i < amount * esc; i++) units.push(M.rng.pick(ELS));
      /* Karnen harvest (random types), RubberMcFly (its own truth's type), Stryx absorb */
      M.creatures.forEach(c => {
        if (c.dead || c.team !== T.idx) return;
        if (c.speciesId === 'karnen') {
          const n = Math.round(c.vars.harvestOutput * c.vars.workEthic);
          for (let i = 0; i < n; i++) units.push(M.rng.pick(ELS));
          /* farmers: every second pulse they also set out FOOD — a morsel
             any creature may claim, and smart ones may carry to another */
          c.mem.farmPulses = (c.mem.farmPulses || 0) + 1;
          if (c.mem.farmPulses % 2 === 0 && M.pickups.filter(pk => !pk.carrier).length < 12) {
            M.pickups.push({ id: M.idCounter++, kind: 'food', x: c.x + M.rng.range(-34, 34), y: c.y + M.rng.range(-30, 30), potency: 0.25, bornTick: M.tick, carrier: null });
          }
        }
        if (c.speciesId === 'rubbermcfly') {
          /* vital to guiding and strengthening the storm — while the
             Sunear'Zikhron passes, each glowing McFly yields one extra */
          const n = Math.round(c.vars.resourceCount) + (zik ? 1 : 0);
          const multi = c.picks.resourceTypes === 'multi';
          if (!c.mem.mcflyEl) c.mem.mcflyEl = M.rng.pick(ELS);
          for (let i = 0; i < n; i++) units.push(multi ? M.rng.pick(ELS) : c.mem.mcflyEl);
        }
        if (c.speciesId === 'stryx' && c.vars.absorbRate > 0.2) units.push('Ular');
      });
      units.forEach(el => { T.resources[el]++; });
      T.stats.resourcesEarned += units.length;
      /* orb visuals near hoard, colored by resource type */
      units.slice(0, 6).forEach(el => {
        M.orbs.push({ x: T.hoard.x + M.rng.range(-50, 50), y: T.hoard.y + M.rng.range(-50, 50), el, t0: M.time, team: T.idx });
      });
    });

    /* growth milestones (July update §2): Naga regrowth/new heads on
       pulse-count thresholds set by the pulse interval */
    const growEvery = interval >= 4 ? 3 : interval === 3 ? 4 : interval === 2 ? 5 : 6;
    M.creatures.forEach(c => {
      if (c.dead || (c.speciesId !== 'ular_naga' && c.speciesId !== 'su_naga')) return;
      c.growthPulses = (c.growthPulses || 0) + 1;
      if (c.growthPulses >= growEvery) {
        c.growthPulses = 0;
        if (c.headsLeft < c.headCount) {
          c.headsLeft++;
          c.hp = Math.min(c.maxHp, c.hp + c.maxHp * 0.12);
          M.addEffect('headLost', c.x, c.y - c.radius, {});
          M.uiEvent(-1, 'event', c.tokName + ' regrows a head.');
        } else if (c.headCount < 5) {
          c.headCount++; c.headsLeft++;
          c.maxHp = Math.round(c.maxHp * 1.08); c.hp = Math.min(c.maxHp, c.hp + c.maxHp * 0.1);
          M.addEffect('headLost', c.x, c.y - c.radius, {});
          M.uiEvent(-1, 'event', c.tokName + ' grows a NEW head!');
        }
      }
    });
    if (M.orbs.length > 40) M.orbs.splice(0, M.orbs.length - 40);

    /* pulse-driven creature systems */
    M.creatures.forEach(c => {
      if (c.dead) return;
      /* Big Momma Kofi spawning */
      if (c.speciesId === 'big_momma_kofi' && c.phase !== 'mobile') {
        const kofiTok = TK.mint({ speciesId: 'kofi', rng: M.rng });
        kofiTok.vars.vigor = c.vars.kofiQuality;
        const k = M.spawnFromToken(kofiTok, c.team, c.x + M.rng.range(-30, 30), c.y + M.rng.range(-30, 30));
        k.isKofiSpawn = true;
      }
      /* Sprengju Relic Shaving conversion */
      if (c.speciesId === 'sprengju_shaving') {
        const jus = M.creatures.filter(o => !o.dead && o.speciesId === 'ju_field' && U.dist(c.x, c.y, o.x, o.y) < c.vars.conversionRange);
        if (jus.length) {
          const convertN = Math.round(2 * M.settings.pulseAmount * c.vars.efficiency);
          if (convertN > 0 && M.teams[c.team]) M.teams[c.team].stats.combos['Ju Field awakened'] = true;
          for (let i = 0; i < convertN; i++) {
            const host = M.rng.pick(jus);
            if ((host.mem.juLeft == null ? (host.mem.juLeft = Math.round(host.vars.fieldSize || 8)) : host.mem.juLeft) <= 0) continue;
            host.mem.juLeft--;
            const spTok = TK.mint({ speciesId: 'sprengju', rng: M.rng });
            M.spawnFromToken(spTok, c.team, host.x + M.rng.range(-40, 40), host.y + M.rng.range(-30, 30));
          }
        }
      }
    });

    /* pending respawns measured in pulses (Uff) */
    M.pendingSpawns.forEach(p => p.pulsesLeft--);

    if (DYA.audio && !M.headless) DYA.audio.play('pulse');
  };

  /* ================= INTENT EXECUTION ================= */
  Match.prototype.execIntent = function (c) {
    const M = this, it = c.intent;
    if (c.attackCd > 0) c.attackCd -= TICK;
    /* buffs expire */
    c.buffs = c.buffs.filter(b => b.until > M.tick);
    const buffMul = (k) => c.buffs.reduce((m, b) => m * (b[k] || 1), 1);

    /* Tyndael heat decay & effects */
    if (c.speciesId === 'tyndael') {
      c.heat = Math.max(0.05, c.heat - TICK * 0.008 / Math.max(0.2, c.vars.flameSustain));
      if (M.tick % 20 === 0 && c.heat > 0.6) {
        // flame spread — being near a high-heat Tyndael is dangerous
        M.creatures.forEach(o => { if (!o.dead && o !== c && U.dist(c.x, c.y, o.x, o.y) < 46) M.damage(o, 1.5, c, { noAnim: true }); });
      }
    }
    if (c.frenzy > 0) c.frenzy = Math.max(0, c.frenzy - TICK * 0.05);

    /* movement */
    if (it.move && !c.rooted && !(c.onTower)) {
      let sp = c.speed * (it.move.run ? 1.45 : 1) * buffMul('speedMul');
      if (c.carryingRelic) {
        sp *= c.sp.tags.includes('thief') ? (c.vars.carrySpeed || 0.2) / 1.5 * 5 : 0.45;
        if (c.quirks && c.quirks.relic_runner) sp *= 1.2;
      }
      if (c.speciesId === 'mikolo_moko' && !c.carryingRelic) sp *= c.vars.sprint || 1.3;
      if (c.speciesId === 'tyndael') sp *= 0.7 + c.heat * 0.6;
      if (c.speciesId === 'harkal') sp *= 1 + c.frenzy * 0.4;
      const inBog = M.zones.some(z => z.type === 'bog' && z.team !== c.team && U.dist(c.x, c.y, z.x, z.y) < z.r);
      if (inBog && !c.sp.tags.includes('flyer') && !(c.quirks && c.quirks.bog_raised)) sp *= 0.45;
      /* water pools: aquatic/flying pass freely, ground-only creatures slow (§15) */
      const inWater = M.zones.some(z => z.type === 'water' && U.dist(c.x, c.y, z.x, z.y) < z.r);
      if (inWater && !c.sp.tags.includes('flyer') && !c.sp.tags.includes('su') && c.sp.element !== 'Su' && !(c.quirks && c.quirks.water_raised)) sp *= 0.55;
      const dx = it.move.x - c.x, dy = it.move.y - c.y;
      const d = Math.hypot(dx, dy);
      if (d > 3) {
        c.x += dx / d * sp * TICK;
        c.y += dy / d * sp * TICK;
        c.x = U.clamp(c.x, 14, WORLD.w - 14); c.y = U.clamp(c.y, 14, WORLD.h - 14);
        c.facing = dx >= 0 ? 1 : -1;
        c.state = it.move.run ? 'run' : 'walk';
      } else c.state = 'idle';
    } else if (!it.attackTarget) {
      if (it.state) c.state = it.state;
      else if (c.state !== 'dormant' && c.state !== 'special') c.state = 'idle';
    }

    /* attack */
    if (it.attackTarget && !it.attackTarget.dead) {
      const t = it.attackTarget;
      const d = U.dist(c.x, c.y, t.x, t.y);
      const range = c.attackRange + c.radius + t.radius;
      if (d <= range) {
        c.state = 'attack';
        c.facing = t.x >= c.x ? 1 : -1;
        if (c.attackCd <= 0) {
          c.attackCd = 1 / ((c.vars.tongueSpeed || 1) * (c.speciesId === 'harkal' ? 1 + c.frenzy : 1) * buffMul('atkSpeedMul'));
          let dmg = c.dmg * buffMul('dmgMul') * (it.dmgMul || 1) * (1 + Math.min(0.2, Math.floor((c.matchXp || 0) / 100) * 0.02)) * M.quirkDmgMul(c);
          if (c.speciesId === 'tyndael') dmg *= 0.7 + c.heat * 0.7;
          if (it.useBreath && c.headsLeft > 1) dmg *= 1.25; // multi-head strike
          M.damage(t, dmg, c);
          /* electric discharge */
          if (c.sp.features.electric) {
            c.mem.charge = (c.mem.charge || 0);
            if (c.mem.charge >= 1) {
              c.mem.charge = 0;
              M.addEffect('electric', t.x, t.y, {});
              M.creatures.forEach(o => { if (!o.dead && o.team !== c.team && U.dist(t.x, t.y, o.x, o.y) < 50) M.damage(o, c.vars.electricPotency, c); });
            }
          }
          if (c.speciesId === 'harkal') c.frenzy = Math.min(1, c.frenzy + 0.15);
          if (c.speciesId === 'tyndael') c.heat = Math.min(1, c.heat + 0.05);
        }
      } else if (!c.rooted) {
        // close the distance
        let sp = c.speed * (it.rush ? 1.5 : 1.15) * buffMul('speedMul');
        if (c.speciesId === 'tyndael') sp *= 0.7 + c.heat * 0.6;
        c.x += (t.x - c.x) / d * sp * TICK;
        c.y += (t.y - c.y) / d * sp * TICK;
        c.facing = t.x >= c.x ? 1 : -1;
        c.state = it.rush ? 'run' : 'walk';
      } else {
        c.state = 'idle'; // rooted and out of reach: wait
      }
    }

    /* electric charge build */
    if (c.sp.features.electric) c.mem.charge = Math.min(1, (c.mem.charge || 0) + TICK / (c.vars.chargeTime || 10));

    /* domestic punk passive water breath — generates Su resource on its own rhythm */
    if ((c.speciesId === 'domestic_punk' || (c.speciesId === 'wild_punk' && c.picks.hasBreath)) && M.mode !== 'duel') {
      c.mem.breathAt = c.mem.breathAt == null ? M.time + (c.vars.breathCooldown || 12) : c.mem.breathAt;
      if (M.time >= c.mem.breathAt) {
        c.mem.breathAt = M.time + (c.vars.breathCooldown || 12);
        const tier = c.picks.breathTier || 1;
        c.mem.breathAcc = (c.mem.breathAcc || 0) + tier * 0.5;
        if (c.mem.breathAcc >= 1) { c.mem.breathAcc -= 1; M.teams[c.team].resources.Su++; }
        M.addEffect('breathSu', c.x, c.y - c.radius, {});
      }
    }

    /* iron gut quirk: wounds close strangely fast */
    if (c.quirks && c.quirks.iron_gut && c.hp > 0 && c.hp < c.maxHp && M.tick % 20 === 0) {
      c.hp = Math.min(c.maxHp, c.hp + Math.max(0.3, c.maxHp * 0.0035));
    }

    /* rock thrower quirk: grabs loose stone and hurls it at the nearest enemy */
    if (c.quirks && c.quirks.rock_thrower && c.stunnedUntil <= M.tick) {
      if (c.mem.rockAt == null) c.mem.rockAt = M.time + 4;
      if (M.time >= c.mem.rockAt) {
        let best = null, bd = 260;
        for (const o of M.creatures) {
          if (o.dead || o.team === c.team || o.sp.rig === 'relic') continue;
          const d2 = U.dist(c.x, c.y, o.x, o.y);
          if (d2 < bd && d2 > c.attackRange + c.radius) { bd = d2; best = o; }
        }
        if (best) {
          c.mem.rockAt = M.time + 7;
          c.facing = best.x >= c.x ? 1 : -1;
          M.addEffect('rock', c.x, c.y - c.radius * 0.6, { tx: best.x, ty: best.y - best.radius * 0.4 });
          M.damage(best, 4 + c.dmg * 0.5, c, { noAnim: true });
          if (!best.dead) best.stunnedUntil = Math.max(best.stunnedUntil, M.tick + Math.round(0.4 / TICK));
        } else {
          c.mem.rockAt = M.time + 2; /* nothing in range — check again soon */
        }
      }
    }

    /* chemist Eikar: every so often they lob a piece of SOMETHING onto the
       field — a random buff for whatever token grabs it first, either team */
    if (c.sp.behavior === 'chemist' && !c.dead) {
      if (c.mem.chemAt == null) c.mem.chemAt = M.time + 10;
      if (M.time >= c.mem.chemAt) {
        c.mem.chemAt = M.time + 14;
        if (M.pickups.filter(pk => !pk.carrier).length < 12) {
          M.pickups.push({ id: M.idCounter++, kind: 'chem', x: c.x + M.rng.range(-110, 110), y: c.y + M.rng.range(-90, 90), potency: M.rng.range(0.25, 0.5), bornTick: M.tick, carrier: null });
          M.addEffect('rock', c.x, c.y - c.radius * 0.6, { tx: M.pickups[M.pickups.length - 1].x, ty: M.pickups[M.pickups.length - 1].y });
        }
      }
    }

    /* sprengju & buff-fruit consumption: any non-passive creature stepping on
       one eats it — the fruits belong to NOBODY, first come first served */
    if (!c.sp.tags.includes('passive') && !c.rooted && M.tick % 10 === 0) {
      const spj = M.creatures.find(o => !o.dead && (o.speciesId === 'sprengju' || o.sp.features.fruit) && U.dist(c.x, c.y, o.x, o.y) < c.radius + 12);
      if (spj) {
        spj.dead = true; spj.deadTick = M.tick;
        const pot = spj.vars.potency || 0.3;
        const fruit = spj.sp.features.fruit;
        if (!fruit) { /* classic sprengju: everything at once */
          c.buffs.push({ dmgMul: 1 + pot, speedMul: 1 + pot * 0.5, until: M.tick + Math.round(10 / TICK) });
          c.hp = Math.min(c.maxHp, c.hp + c.maxHp * pot * 0.3);
        } else if (fruit === 'strike') c.buffs.push({ dmgMul: 1 + pot * 1.4, until: M.tick + Math.round(12 / TICK) });
        else if (fruit === 'pace') c.buffs.push({ speedMul: 1 + pot * 1.3, until: M.tick + Math.round(12 / TICK) });
        else if (fruit === 'mend') c.hp = Math.min(c.maxHp, c.hp + c.maxHp * (0.2 + pot * 0.5));
        else if (fruit === 'guard') c.buffs.push({ armorMul: Math.max(0.55, 1 - pot * 1.2), until: M.tick + Math.round(12 / TICK) });
        M.addEffect('buff', c.x, c.y, {});
        if (fruit) M.uiEvent(-1, 'event', c.tokName + ' devours the ' + spj.sp.name + '.');
      }
    }

    /* field morsels: eat when hungry; the smart carry food to others.
       Smart creatures never abandon a fight to fetch — that lives in their
       behavior trees as a lowest-priority errand. */
    if (!c.sp.tags.includes('passive') && M.tick % 10 === 0 && M.pickups.length) {
      const smart = !!(c.sp.eikarLayer || c.sp.keiliaLayer || c.sp.behavior === 'karnen' || c.speciesId === 'su_naga' || (c.vars.intelligence || 0) > 0.75);
      const carried = M.pickups.find(pk => pk.carrier === c.id);
      if (carried) {
        carried.x = c.x; carried.y = c.y - c.radius - 10;
        /* feed a wounded ally — mounts first (an Eikar feeds its Byrd) */
        let target = null;
        for (const o of M.creatures) {
          if (o.dead || o === c || o.team !== c.team || o.hp >= o.maxHp * 0.7) continue;
          if (U.dist(c.x, c.y, o.x, o.y) > 70) continue;
          if (!target || (o.sp.tags.includes('mount') && !target.sp.tags.includes('mount'))) target = o;
        }
        if (target) {
          M.pickups = M.pickups.filter(pk => pk !== carried);
          target.hp = Math.min(target.maxHp, target.hp + target.maxHp * carried.potency);
          M.addEffect('heal', target.x, target.y, {});
          M.uiEvent(-1, 'event', c.tokName + ' feeds ' + target.tokName + '.');
        } else if (c.hp < c.maxHp * 0.6) { /* its own need outgrew its patience */
          M.pickups = M.pickups.filter(pk => pk !== carried);
          c.hp = Math.min(c.maxHp, c.hp + c.maxHp * carried.potency);
          M.addEffect('heal', c.x, c.y, {});
        }
      } else {
        const pk = M.pickups.find(pk2 => !pk2.carrier && U.dist(c.x, c.y, pk2.x, pk2.y) < c.radius + 14);
        if (pk) {
          if (pk.kind === 'chem') {
            /* a piece of something — random boon for whoever grabbed it */
            M.pickups = M.pickups.filter(pk2 => pk2 !== pk);
            const roll = M.rng.pick(['strike', 'pace', 'guard', 'mend']);
            if (roll === 'strike') c.buffs.push({ dmgMul: 1 + pk.potency * 1.4, until: M.tick + Math.round(12 / TICK) });
            else if (roll === 'pace') c.buffs.push({ speedMul: 1 + pk.potency * 1.2, until: M.tick + Math.round(12 / TICK) });
            else if (roll === 'guard') c.buffs.push({ armorMul: Math.max(0.55, 1 - pk.potency), until: M.tick + Math.round(12 / TICK) });
            else c.hp = Math.min(c.maxHp, c.hp + c.maxHp * pk.potency);
            M.addEffect('buff', c.x, c.y, {});
            M.uiEvent(-1, 'event', c.tokName + ' grabs the chemist\u2019s piece — ' + roll + '!');
          } else if (c.hp < c.maxHp * 0.8) {
            /* hungry enough to eat it on the spot */
            M.pickups = M.pickups.filter(pk2 => pk2 !== pk);
            c.hp = Math.min(c.maxHp, c.hp + c.maxHp * pk.potency);
            M.addEffect('heal', c.x, c.y, {});
          } else if (smart) {
            pk.carrier = c.id; /* carry it for someone who needs it */
          }
        }
      }
    }

    /* makari swarm: proportional damage & aura attack handled via normal attack; swarmFrac for renderer */
    if (c.speciesId === 'makari_swarm') {
      c.swarmFrac = c.hp / c.maxHp;
      c.dmg = c.tok.stats.dmg * Math.max(0.15, c.swarmFrac);
    }

    /* carried relic follows its carrier */
    if (c.carryingRelic) {
      const rl = M.relics.find(r => r.carrier === c.id);
      if (rl) { rl.x = c.x; rl.y = c.y - c.radius - 6; }
    }
  };

  /* situational damage multiplier from life-history quirks —
     plus the seed races' memory surge while the storm passes */
  Match.prototype.quirkDmgMul = function (c) {
    const M = this, q = c.quirks;
    let m = 1;
    /* Eikar/Keilia are immortal through memory: while the Sunear'Zikhron
       is overhead their zikhron strength becomes strike (up to +20%) */
    if (c.tok && c.tok.layer && c.tok.layer.zikhron && M.zikhron()) {
      m *= 1 + 0.2 * Math.min(1, c.tok.layer.zikhron);
    }
    if (!q) return m;
    if (q.storm_born && M.zikhron()) m *= 1.25; /* Sunear'Zikhron overhead */
    if (q.early_riser && M.time < 60) m *= 1.15;
    if (q.slow_burner && M.time > 300) m *= 1.15;
    if (q.cornered_fighter && c.hp < c.maxHp * 0.5) m *= 1.12;
    if (q.vengeful && c.mem.vengeUntil && M.time < c.mem.vengeUntil) m *= 1.3;
    if (q.pack_raised || q.loner) {
      let allies = 0;
      for (const o of M.creatures) {
        if (o.dead || o === c || o.team !== c.team) continue;
        if (U.dist(c.x, c.y, o.x, o.y) < (q.loner ? 200 : 160)) { allies++; if (allies >= 2) break; }
      }
      if (q.pack_raised) m *= 1 + 0.08 * allies;
      if (q.loner && allies === 0) m *= 1.18;
    }
    if (q.forest_reared && M.zones.some(z => z.type === 'forest' && U.dist(c.x, c.y, z.x, z.y) < z.r)) m *= 1.12;
    if (q.shore_reared && M.zones.some(z => z.type === 'water' && U.dist(c.x, c.y, z.x, z.y) < z.r)) m *= 1.12;
    return m;
  };

  /* ================= DAMAGE & DEATH ================= */
  Match.prototype.damage = function (t, amount, source, opts) {
    const M = this;
    if (t.dead || M.over) return;
    opts = opts || {};
    M.lastCombatTick = M.tick;

    /* mitigations */
    let dmg = amount;
    if (t.vars.plateThickness) dmg /= t.vars.plateThickness;
    if (t.vars.shellDurability) dmg /= t.vars.shellDurability;
    if (t.vars.scarToughness) dmg *= 1 - t.vars.scarToughness * 0.5;
    if (t.vars.hairArmor && source && source.x < t.x === (t.facing > 0)) dmg *= 1 - t.vars.hairArmor; // back armor
    if (t.onTower) dmg *= 0.7;
    /* guard buffs (Stonefruit, chemist pieces) */
    for (const b of t.buffs) { if (b.armorMul && b.until > M.tick) dmg *= b.armorMul; }
    /* defensive life-history quirks */
    if (t.quirks) {
      if (t.quirks.thick_hide) dmg = Math.max(0.2, dmg - 1);
      if (t.quirks.scarred_survivor && t.hp < t.maxHp * 0.3) dmg *= 0.85;
    }
    /* naga first head: near-invincible absorb */
    if ((t.speciesId === 'ular_naga' || t.speciesId === 'su_naga')) {
      const firstHeadPortion = t.maxHp * 0.55;
      if (t.hp <= firstHeadPortion || t.headCount === 1) dmg *= 0.16;
    }
    dmg = Math.max(0.2, dmg);
    t.hp -= dmg;
    /* in-match XP (§2): damage dealt + damage absorbed */
    if (source && !source.dead) source.matchXp = (source.matchXp || 0) + dmg * 0.5;
    t.matchXp = (t.matchXp || 0) + dmg * 0.25;
    t.lastHitTick = M.tick;
    t.lastAttacker = source || null;
    if (t.state !== 'attack') t.state = 'hit';
    if (!opts.noAnim) M.addEffect('hit', t.x, t.y - t.radius * 0.4, { big: dmg > 20 });
    if (!M.headless) DYA.audio.play(dmg > 20 ? 'bigHit' : 'hit');

    /* albali film — applies to attacker on contact */
    if (t.sp.features.horns && source && !source.dead && U.dist(t.x, t.y, source.x, source.y) < t.attackRange + t.radius + source.radius + 8) {
      const film = t.vars.filmPotency || 0;
      if (film > 0 && !opts.film) M.damage(source, film * 0.4, t, { film: true, noAnim: true });
    }
    /* harkal frenzy on damage taken */
    if (t.speciesId === 'harkal') t.frenzy = Math.min(1, t.frenzy + 0.2);
    /* skittish quirk: the first bad wound triggers a burst of speed */
    if (t.quirks && t.quirks.skittish && !t.mem.skitDone && t.hp > 0 && t.hp < t.maxHp * 0.5) {
      t.mem.skitDone = true;
      t.buffs.push({ speedMul: 1.45, until: M.tick + Math.round(3 / TICK) });
      M.addEffect('buff', t.x, t.y, {});
    }

    /* naga head loss */
    if ((t.speciesId === 'ular_naga' || t.speciesId === 'su_naga') && t.headCount > 1) {
      const nonFirstPool = t.maxHp * 0.45;
      const perHead = nonFirstPool / (t.headCount - 1);
      const lost = Math.min(t.headCount - 1, Math.floor((t.maxHp - Math.max(t.hp, t.maxHp * 0.55)) / perHead));
      const newLeft = t.headCount - lost;
      if (newLeft < t.headsLeft) { t.headsLeft = newLeft; M.addEffect('headLost', t.x, t.y - t.radius, {}); M.uiEvent(-1, 'event', t.tokName + ' loses a head — it keeps fighting.'); }
    }

    if (t.hp <= 0) M.kill(t, source, 'combat');
  };

  Match.prototype.kill = function (c, source, cause) {
    const M = this;
    if (c.dead) return;
    c.dead = true; c.deadTick = M.tick; c.state = 'death';
    if (!M.headless) DYA.audio.play('death');
    if (source && source.team !== c.team && M.teams[source.team]) M.teams[source.team].stats.eliminations++;
    if (source && !source.dead) source.matchXp = (source.matchXp || 0) + 25; // kill XP (§2)

    /* feeding: a predator eats what it kills — the meal closes wounds,
       and a Naga's feeding hurries the growth of its next head */
    if (source && !source.dead && cause === 'combat' && source.team !== c.team &&
        (source.sp.tags.includes('carnivore') || source.sp.tags.includes('omnivore')) &&
        !c.sp.tags.includes('inert') && !c.sp.features.fruit && c.speciesId !== 'sprengju') {
      source.hp = Math.min(source.maxHp, source.hp + Math.min(source.maxHp * 0.25, c.maxHp * 0.12));
      M.addEffect('heal', source.x, source.y, {});
      if (source.speciesId === 'ular_naga' || source.speciesId === 'su_naga') {
        source.growthPulses = (source.growthPulses || 0) + 2; /* a good meal feeds the next head */
      }
    }

    /* vengeful quirk: nearby allies of the fallen enter a brief fury */
    for (const o of M.creatures) {
      if (o.dead || o === c || o.team !== c.team) continue;
      if (o.quirks && o.quirks.vengeful && U.dist(o.x, o.y, c.x, c.y) < 180) {
        o.mem.vengeUntil = M.time + 6;
        M.addEffect('buff', o.x, o.y, {});
      }
    }

    /* relic drop */
    if (c.carryingRelic) {
      c.carryingRelic = false;
      const rl = M.relics.find(r => r.carrier === c.id);
      if (rl) {
        rl.carrier = null; rl.carrierTeam = null;
        rl.x = c.x; rl.y = c.y;
        M.uiEvent(-1, 'relic', (rl.ownerTeam === 0 ? 'Your' : 'Their') + ' Relic is dropped!');
      }
      if (!M.headless) DYA.audio.play('relicDrop');
    }

    /* additional cost (§1): a defeated token returns to the pouch; replaying it
       costs +1 resource per prior defeat. Uff excepted while self-respawning. */
    if (M.mode === 'standard' && M.teams[c.team] && M.teams[c.team].controller !== 'wild' &&
        !c.isKofiSpawn && c.speciesId !== 'kofi' && c.speciesId !== 'sprengju' &&
        !(c.speciesId === 'uff' && cause !== 'retribution')) {
      const entry = M.teams[c.team].pouch.find(e => e.tok.id === c.tokId);
      if (entry && entry.state === 'played') {
        entry.state = 'pouch';
        entry.deaths = (entry.deaths || 0) + 1;
        entry.readiedAtPulse = -1;
      }
    }

    /* ShurgrEdan retribution — direct kill of a RubberMcFly */
    if (c.speciesId === 'rubbermcfly' && cause === 'combat' && source && !source.dead) {
      M.addEffect('shurgredan', source.x, source.y, { killer: source.id });
      M.uiEvent(-1, 'event', 'THE SHURGREDAN ANSWERS. ' + source.tokName + ' is struck from the field.');
      if (!M.headless) DYA.audio.play('shurgrEdan');
      M.retributionFlag = true;
      setTimeoutTick(M, 24, () => { if (!source.dead) M.kill(source, null, 'retribution'); });
    }

    /* makari remnants for chemists */
    if (c.speciesId === 'makari_swarm') {
      M.remnants.push({ x: c.x, y: c.y, potency: c.vars.crushPotency || 0.3, at: M.tick });
    }

    /* Uff respawn from same spot */
    if (c.speciesId === 'uff' && cause !== 'retribution') {
      const pulses = { Slow: 4, Standard: 3, Fast: 2 }[c.picks.respawnTier] || 3;
      M.pendingSpawns.push({ tok: c.tok, team: c.team, x: c.homeX, y: c.homeY, pulsesLeft: pulses });
      M.addEffect('plant', c.homeX, c.homeY, {});
    }

    /* tower collapse frees archer */
    if (c.onTower) c.onTower = null;
  };

  function setTimeoutTick(M, ticks, fn) {
    M._timeouts = M._timeouts || [];
    M._timeouts.push({ at: M.tick + ticks, fn });
  }

  /* ================= PROJECTILES / ZONES / MISC ================= */
  Match.prototype.stepProjectiles = function () {
    const M = this;
    for (let i = M.projectiles.length - 1; i >= 0; i--) {
      const p = M.projectiles[i];
      p.x += p.vx * TICK; p.y += p.vy * TICK; p.life -= TICK;
      let hit = false;
      for (const c of M.creatures) {
        if (c.dead || c.team === p.team) continue;
        if (U.dist(p.x, p.y, c.x, c.y) < c.radius + 5) {
          M.damage(c, p.dmg, p.source);
          if (p.type === 'jet' && c.sizeIdx <= 1) {
            /* knockback + stun — smalls only */
            const a = Math.atan2(c.y - p.y0, c.x - p.x0);
            c.x += Math.cos(a) * 46; c.y += Math.sin(a) * 46;
            c.stunnedUntil = M.tick + Math.round(0.8 / TICK);
          }
          hit = true; break;
        }
      }
      if (hit || p.life <= 0 || p.x < 0 || p.x > WORLD.w || p.y < 0 || p.y > WORLD.h) M.projectiles.splice(i, 1);
    }
    /* timeout callbacks */
    if (M._timeouts) {
      for (let i = M._timeouts.length - 1; i >= 0; i--) {
        if (M._timeouts[i].at <= M.tick) { M._timeouts[i].fn(); M._timeouts.splice(i, 1); }
      }
    }
  };

  Match.prototype.stepZones = function () {
    const M = this;
    if (M.tick % 10 !== 0) return;
    M.zones.forEach(z => {
      if (z.type === 'bog') {
        M.creatures.forEach(c => {
          if (!c.dead && c.team !== z.team && !c.sp.tags.includes('flyer') && U.dist(c.x, c.y, z.x, z.y) < z.r) {
            M.damage(c, z.potency * 0.5, z.owner && !z.owner.dead ? z.owner : null, { noAnim: true });
          }
        });
      } else if (z.type === 'fire') {
        z.life -= 0.5;
        M.creatures.forEach(c => {
          if (!c.dead && U.dist(c.x, c.y, z.x, z.y) < z.r && c.speciesId !== 'tyndael') {
            M.damage(c, 1.2, z.owner && !z.owner.dead ? z.owner : null, { noAnim: true });
          }
        });
      }
    });
    M.zones = M.zones.filter(z => z.type !== 'fire' || z.life > 0);
  };

  Match.prototype.stepMisc = function () {
    const M = this;
    /* border tether (§1): the arena border IS the tether. Creatures fade in
       the outer band (80% of the way from arena center) and are eliminated
       at the border itself. */
    for (const c of M.creatures) {
      if (c.dead) continue;
      const nx = Math.abs(c.x - WORLD.w / 2) / (WORLD.w / 2 - 14);
      const ny = Math.abs(c.y - WORLD.h / 2) / (WORLD.h / 2 - 14);
      c.tetherFrac = Math.max(nx, ny);
      if (c.tetherFrac >= 0.995 && !c.rooted) { M.kill(c, null, 'tether'); M.uiEvent(-1, 'event', c.tokName + ' faded at the arena border.'); continue; }
      /* rodak-style regen intent */
      if (c.mem.regen && c.hp < c.maxHp) { c.hp = Math.min(c.maxHp, c.hp + c.mem.regen * 2 * TICK); }
      /* separation (cheap, every 4 ticks) */
      if ((M.tick + c.id) % 4 === 0 && !c.rooted) {
        for (const o of M.creatures) {
          if (o === c || o.dead || o.rooted) continue;
          const d = U.dist(c.x, c.y, o.x, o.y), min = (c.radius + o.radius) * 0.8;
          if (d < min && d > 0.01) {
            const push = (min - d) / 2;
            c.x = U.clamp(c.x + (c.x - o.x) / d * push, 14, WORLD.w - 14);
            c.y = U.clamp(c.y + (c.y - o.y) / d * push, 14, WORLD.h - 14);
          }
        }
      }
    }
    /* uff respawns */
    for (let i = M.pendingSpawns.length - 1; i >= 0; i--) {
      const p = M.pendingSpawns[i];
      if (p.pulsesLeft <= 0) {
        const tok2 = TK.mint({ speciesId: p.tok.speciesId, rng: M.rng });
        tok2.name = p.tok.name; tok2.vars = p.tok.vars; tok2.picks = p.tok.picks; tok2.stats = p.tok.stats; tok2.sizeIdx = p.tok.sizeIdx;
        M.spawnFromToken(tok2, p.team, p.x, p.y);
        M.pendingSpawns.splice(i, 1);
      }
    }
    /* the living horn: each fielded commander (the player's self-Eikar)
       evaluates the field every few seconds and rallies the side (§ fun pass).
       Reads sim state only — deterministic in lockstep and replays. */
    if (M.mode === 'standard' && M.tick % 120 === 0) {
      for (const cm of M.creatures) {
        if (cm.dead || !cm.isCommander) continue;
        const myRelic = M.relics.find(r => r.ownerTeam === cm.team);
        const foeRelic = M.relics.find(r => r.ownerTeam !== cm.team);
        let call = null;
        if (myRelic && myRelic.carrier != null && myRelic.carrierTeam !== cm.team) {
          call = 'INTERCEPT THE THIEF';
          for (const o of M.creatures) {
            if (o.dead || o.team !== cm.team || o === cm || o.rooted) continue;
            if (U.dist(cm.x, cm.y, o.x, o.y) < 340) o.buffs.push({ speedMul: 1.28, until: M.tick + Math.round(4.5 / TICK) });
          }
        } else if (foeRelic && !foeRelic.carrier && !foeRelic.captured && !foeRelic.disabled &&
                   M.creatures.some(o => !o.dead && o.team === cm.team && U.dist(o.x, o.y, foeRelic.x, foeRelic.y) < 380)) {
          call = 'PRESS FOR THE RELIC';
          for (const o of M.creatures) {
            if (o.dead || o.team !== cm.team || o.rooted) continue;
            if (U.dist(o.x, o.y, foeRelic.x, foeRelic.y) < 380) o.buffs.push({ speedMul: 1.15, dmgMul: 1.05, until: M.tick + Math.round(4.5 / TICK) });
          }
        } else {
          const hoard = M.teams[cm.team] && M.teams[cm.team].hoard;
          if (hoard && M.creatures.some(o => !o.dead && o.team !== cm.team && !o.sp.tags.includes('passive') && U.dist(o.x, o.y, hoard.x, hoard.y) < 240)) {
            call = 'HOLD THE HOARD';
            for (const o of M.creatures) {
              if (o.dead || o.team !== cm.team) continue;
              if (U.dist(o.x, o.y, hoard.x, hoard.y) < 300) o.buffs.push({ dmgMul: 1.2, until: M.tick + Math.round(4.5 / TICK) });
            }
          }
        }
        if (call && cm.mem.lastCall !== call && M.tick - (cm.mem.lastCallTick || -9999) > 240) {
          cm.mem.lastCall = call; cm.mem.lastCallTick = M.tick;
          M.uiEvent(-1, 'event', '📯 ' + cm.tokName + ' sounds the horn — ' + call + '!');
          M.addEffect('buff', cm.x, cm.y, {});
          if (!M.headless && cm.team === 0) DYA.audio.play('horn');
        }
        if (!call) cm.mem.lastCall = null;
      }
    }

    /* relic capture + defensive recovery */
    if (M.mode === 'standard' && M.tick % 5 === 0) {
      for (const rl of M.relics) {
        if (rl.disabled || rl.captured) continue;
        if (rl.carrier != null) {
          const car = M.creatures.find(cr => cr.id === rl.carrier);
          if (car && !car.dead) {
            const own = M.teams[car.team].hoard;
            if (U.dist(car.x, car.y, own.x, own.y) < HOARD_R) {
              rl.captured = true; rl.x = own.x; rl.y = own.y - 26;
              car.carryingRelic = false; rl.carrier = null;
              car.matchXp = (car.matchXp || 0) + 40;
              M.teams[car.team].stats.relicCaptured = true;
              M.teams[car.team].stats.relicMethod = 'Carried home by ' + car.tokName;
              M.uiEvent(-1, 'relic', car.tokName + ' delivers the enemy Relic!');
            }
          }
        } else {
          /* a dropped relic touched by its owners returns home */
          const atHome = Math.abs(rl.x - rl.homeX) < 4 && Math.abs(rl.y - rl.homeY) < 4;
          if (!atHome) {
            const defender = M.creatures.find(cr => !cr.dead && cr.team === rl.ownerTeam && !cr.sp.tags.includes('inert') && U.dist(cr.x, cr.y, rl.x, rl.y) < RELIC_PICK_R + cr.radius);
            if (defender) {
              rl.x = rl.homeX; rl.y = rl.homeY;
              defender.matchXp = (defender.matchXp || 0) + 20;
              M.uiEvent(-1, 'relic', defender.tokName + ' returns the Relic home!');
            }
          }
        }
      }
    }

    /* dead cleanup after fade */
    if (M.tick % 40 === 0) {
      M.creatures.forEach(c => { if (c.dead && M.tick - c.deadTick >= 60) M.recordTokenXp(c); });
      M.creatures = M.creatures.filter(c => !c.dead || M.tick - c.deadTick < 60);
      M.remnants = M.remnants.filter(r => M.tick - r.at < 1200);
      /* unclaimed morsels spoil after 90s; carried ones keep */
      M.pickups = M.pickups.filter(pk => pk.carrier != null ? M.creatures.some(o => !o.dead && o.id === pk.carrier) : M.tick - pk.bornTick < 1800);
    }
  };

  /* ================= END CONDITIONS ================= */
  Match.prototype.checkEnd = function () {
    const M = this;
    if (M.over) return;

    if (M.mode === 'duel') {
      const alive0 = M.creatures.some(c => !c.dead && c.team === 0);
      const alive1 = M.creatures.some(c => !c.dead && c.team === 1);
      if (!alive0 && !alive1) { M.finish(M.rng.chance(0.5) ? 0 : 1, 'duel'); return; } // no draws possible
      if (!alive0) { M.finish(1, 'duel'); return; }
      if (!alive1) { M.finish(0, 'duel'); return; }
      return;
    }

    if (M.mode === 'hunt') {
      const bossAlive = M.creatures.some(c => !c.dead && c.team === 1);
      if (!bossAlive) { M.finish(0, 'hunt'); return; }
      const T = M.teams[0];
      /* flora and other passives don't keep a hunt alive — a lone stonefruit
         is not a hunter */
      const anyAlive = M.creatures.some(c => !c.dead && c.team === 0 && !c.sp.tags.includes('passive'));
      const anyLeft = T.pouch.some(e => e.state === 'pouch') || T.readied.length > 0;
      if (!anyAlive && !anyLeft && M.time > 20) { M.finish(1, 'hunt'); return; }
      return;
    }

    /* standard: win = the opponent's relic sits in your hoard (all of them
       in multiplayer; in 1v1 that is the single enemy relic) */
    for (const rl of M.relics) {
      if (rl.captured && !rl.disabled) {
        const winner = 1 - rl.ownerTeam;
        M.finish(winner, 'relic');
        return;
      }
    }
    /* draw: both pouches empty AND all field creatures semi-idle 5 straight minutes */
    const bothEmpty = M.teams.every(T => T.controller === 'wild' || (!T.pouch.some(e => e.state === 'pouch') && !T.readied.length));
    if (bothEmpty && (M.tick - M.lastCombatTick) > Math.round(300 / TICK)) {
      M.finish(-1, 'draw');
    }
  };

  /* accumulate a creature's in-match XP/growth against its source token
     (plain bookkeeping — no RNG, no effect on the sim) */
  Match.prototype.recordTokenXp = function (c) {
    const M = this;
    if (!c.tokId) return;
    /* only pouch tokens persist — engine-minted spawns (kofi, sprengju,
       uff respawn copies, wild enemies) carry wall-clock ids and stay ephemeral */
    const T = M.teams[c.team];
    if (!T || !T.pouch.some(e => e.tok.id === c.tokId)) return;
    M.tokenXp = M.tokenXp || {};
    const e = M.tokenXp[c.tokId] = M.tokenXp[c.tokId] || { xp: 0, heads: 0, team: c.team };
    e.xp += Math.round(c.matchXp || 0);
    e.heads = Math.max(e.heads, c.headCount || 1);
    c.matchXp = 0;
  };

  Match.prototype.finish = function (winnerIdx, how) {
    const M = this;
    M.over = true;
    M.creatures.forEach(c => M.recordTokenXp(c));
    M.result = {
      winner: winnerIdx, how,
      duration: M.time,
      stats: M.teams.map(T => T.stats),
      tokenXp: M.tokenXp || {},
    };
    if (M.onFinish) M.onFinish(M.result);
  };

  /* ================= UI EVENTS ================= */
  /* segment vs forest-zone circles: forest patches block ranged targeting */
  Match.prototype.losBlocked = function (x1, y1, x2, y2) {
    for (const z of this.zones) {
      if (z.type !== 'forest') continue;
      const dx = x2 - x1, dy = y2 - y1;
      const len2 = dx * dx + dy * dy;
      if (len2 < 1) continue;
      let t = ((z.x - x1) * dx + (z.y - y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = x1 + t * dx, py = y1 + t * dy;
      if (U.dist(px, py, z.x, z.y) < z.r * 0.85) return true;
    }
    return false;
  };

  Match.prototype.uiEvent = function (team, kind, msg) {
    this.events.push({ tick: this.tick, team, kind, msg });
    if (this.events.length > 30) this.events.shift();
  };
  Match.prototype.addEffect = function (type, x, y, data) {
    this.effects.push(Object.assign({ type, x, y, t0: this.time, dur: ({ shurgredan: 2.4, deploy: 0.8, swarmBurst: 1, electric: 0.5, screech: 0.9, teleport: 0.55, plant: 1.2, heal: 0.8, buff: 0.8, hit: 0.3, headLost: 1, breathSu: 0.9, biolum: 1.2, breath: 0.5, dive: 0.5 })[type] || 0.6 }, data || {}));
    if (this.effects.length > 80) this.effects.shift();
  };

  /* ================= BEHAVIOR API ================= */
  Match.prototype.api = function () {
    const M = this;
    if (M._api) return M._api;
    const api = {
      get rng() { return M.rng; },
      get tick() { return M.tick; },
      get time() { return M.time; },
      dist: (a, b) => U.dist(a.x, a.y, b.x, b.y),
      byId: (id) => M.creatures.find(c => c.id === id),
      creaturesOf: (spid) => M.creatures.filter(c => c.speciesId === spid && !c.dead),
      /* dual relics: 'the relic' from a creature's point of view is the
         ENEMY's relic (the thing it can steal). */
      relic: (team) => {
        const t = team != null ? team : (api._c ? api._c.team : 0);
        return M.relics.find(r => r.ownerTeam !== t && !r.disabled) || { x: WORLD.w / 2, y: WORLD.h / 2, captured: true, disabled: true, carrier: null };
      },
      ownRelic: (team) => M.relics.find(r => r.ownerTeam === team && !r.disabled) || null,
      losBlocked: (x1, y1, x2, y2) => M.losBlocked(x1, y1, x2, y2),
      ownHoard: (team) => M.teams[team] ? M.teams[team].hoard : M.teams[0].hoard,
      enemyHoard: (team) => M.teams[1 - team] ? M.teams[1 - team].hoard : M.teams[0].hoard,
      teamRes: (team) => M.teams[team].resources,
      structuresOf: (team, type) => M.structures.filter(s => s.team === team && (!type || s.type === type) && s.hp > 0),
      makariRemnants: () => M.remnants,
      inBog: (c) => M.zones.some(z => z.type === 'bog' && z.team !== c.team && U.dist(c.x, c.y, z.x, z.y) < z.r),
      inWater: (c) => M.zones.some(z => z.type === 'water' && U.dist(c.x, c.y, z.x, z.y) < z.r),
      nearestPickup: (c, range) => {
        let best = null, bd = range || 200;
        for (const pk of M.pickups) {
          if (pk.carrier != null) continue;
          const d = U.dist(c.x, c.y, pk.x, pk.y);
          if (d < bd) { bd = d; best = pk; }
        }
        return best;
      },
      offCooldown: (c, key) => !c.mem['cd_' + key] || c.mem['cd_' + key] <= M.tick,

      enemiesNear(c, range) {
        return M.creatures.filter(o => !o.dead && o.team !== c.team && o.team !== -1 &&
          !(o.camoUntil > M.tick && U.dist(c.x, c.y, o.x, o.y) > 34) &&
          U.dist(c.x, c.y, o.x, o.y) < range && !o.sp.tags.includes('inert'));
      },
      alliesNear(c, range) {
        return M.creatures.filter(o => !o.dead && o !== c && o.team === c.team && U.dist(c.x, c.y, o.x, o.y) < range);
      },
      allCreaturesNear(c, range) {
        return M.creatures.filter(o => !o.dead && o !== c && U.dist(c.x, c.y, o.x, o.y) < range);
      },
      nearestEnemy(c, range, filter) {
        let best = null, bd = 1e9;
        for (const o of M.creatures) {
          if (o.dead || o.team === c.team || o.team === -1) continue;
          if (o.sp && o.sp.tags.includes('inert')) continue;
          if (o.camoUntil > M.tick && U.dist(c.x, c.y, o.x, o.y) > 34) continue;
          if (filter && !filter(o)) continue;
          const d = U.dist(c.x, c.y, o.x, o.y);
          if (d < range && d < bd) { bd = d; best = o; }
        }
        return best;
      },

      /* movement intents */
      moveToward(c, x, y, run) { c.intent.move = { x, y, run: !!run }; },
      moveAway(c, x, y, run) {
        const a = Math.atan2(c.y - y, c.x - x);
        c.intent.move = {
          x: U.clamp(c.x + Math.cos(a) * 120, 90, WORLD.w - 90),
          y: U.clamp(c.y + Math.sin(a) * 120, 90, WORLD.h - 90),
          run: !!run,
        };
      },
      hold(c) { c.intent.state = 'idle'; },
      lazyHold(c) { c.intent.state = 'idle'; },
      guard(c) { c.intent.state = 'idle'; },
      guardPost(c) {
        /* the smart don't stand around: with nothing better to do — and ONLY
           then — they stroll to a nearby morsel. They never abandon a fight
           for food; this is the lowest branch of every tree that reaches it. */
        const smart = !!(c.sp.eikarLayer || c.sp.keiliaLayer || c.sp.behavior === 'karnen' || c.speciesId === 'su_naga' || (c.vars.intelligence || 0) > 0.75);
        if (smart && !c.rooted && !M._api.nearestEnemy(c, 220) &&
            !M.pickups.some(pk => pk.carrier === c.id)) {
          const pk = M._api.nearestPickup(c, 200);
          if (pk) { c.intent.move = { x: pk.x, y: pk.y, run: false }; return; }
        }
        c.intent.state = 'idle';
      },
      sleep(c) { c.intent.state = 'dormant'; },
      wake(c) { if (c.state === 'dormant') c.state = 'idle'; },
      shellUp(c) { c.intent.state = 'dormant'; },
      posture(c, target) { c.intent.state = 'special'; c.facing = target.x >= c.x ? 1 : -1; },
      patrol(c, radius) {
        if (!c.mem.patrolTarget || U.dist(c.x, c.y, c.mem.patrolTarget.x, c.mem.patrolTarget.y) < 12) {
          c.mem.patrolTarget = { x: c.homeX + M.rng.range(-radius, radius), y: c.homeY + M.rng.range(-radius, radius) };
        }
        c.intent.move = { x: c.mem.patrolTarget.x, y: c.mem.patrolTarget.y, run: false };
      },
      forage(c) {
        if (!c.mem.forageTarget || U.dist(c.x, c.y, c.mem.forageTarget.x, c.mem.forageTarget.y) < 14) {
          c.mem.forageTarget = { x: U.clamp(c.x + M.rng.range(-160, 160), 90, WORLD.w - 90), y: U.clamp(c.y + M.rng.range(-160, 160), 90, WORLD.h - 90) };
        }
        c.intent.move = { x: c.mem.forageTarget.x, y: c.mem.forageTarget.y, run: false };
      },
      wanderCurious(c) { api.forage(c); },
      circle(c) {
        const a = (M.time * 0.35 + c.id) % (Math.PI * 2);
        c.intent.move = { x: c.homeX + Math.cos(a) * 130, y: c.homeY + Math.sin(a) * 90, run: false };
      },
      lurk(c, near) {
        c.intent.move = { x: near.x + Math.cos(c.id) * 80, y: near.y + Math.sin(c.id) * 80, run: false };
        c.camoUntil = M.tick + 30;
      },

      /* combat intents */
      attack(c, target, whileRetreat, rush, useBreath, dmgMul) {
        c.intent.attackTarget = target;
        c.intent.rush = !!rush;
        c.intent.useBreath = !!useBreath;
        c.intent.dmgMul = dmgMul || 1;
        if (useBreath && api.offCooldown(c, 'breath') && U.dist(c.x, c.y, target.x, target.y) < (c.vars.breathRange || 90) + c.radius) {
          api.breath(c, target);
        }
      },
      breath(c, target) {
        if (!api.offCooldown(c, 'breath')) return;
        c.mem.cd_breath = M.tick + Math.round((c.vars.breathCooldown || 4) / TICK);
        c.state = 'special';
        M.addEffect('breath', c.x, c.y, { tx: target.x, ty: target.y, el: c.sp.element });
        const range = (c.vars.breathRange || 90) + c.radius;
        if (U.dist(c.x, c.y, target.x, target.y) <= range + target.radius) {
          M.damage(target, c.dmg * 1.3, c);
        }
        if (c.speciesId === 'tyndael') {
          M.zones.push({ type: 'fire', x: target.x, y: target.y, r: 34, life: 6, owner: c });
          c.heat = Math.min(1, c.heat + 0.08);
        }
      },
      screech(c, target) {
        c.mem.cd_screech = M.tick + Math.round(9 / TICK);
        c.state = 'special';
        M.addEffect('screech', c.x, c.y, {});
        if (!M.headless) DYA.audio.play('screech');
        const power = c.vars.screechPower || 2;
        if (c.picks.screechType === 'area') {
          M.creatures.forEach(o => { if (!o.dead && o.team !== c.team && U.dist(c.x, c.y, o.x, o.y) < 160) o.stunnedUntil = M.tick + Math.round(power * 0.7 / TICK); });
        } else {
          target.stunnedUntil = M.tick + Math.round(power / TICK);
        }
      },
      jetBlast(c, targets) {
        c.mem.cd_jet = M.tick + Math.round(5 / TICK);
        c.state = 'special';
        const holes = Math.round(c.vars.blowholes || 3);
        targets.slice(0, holes).forEach(t => {
          const a = Math.atan2(t.y - c.y, t.x - c.x);
          M.projectiles.push({ x: c.x, y: c.y - c.radius, x0: c.x, y0: c.y, vx: Math.cos(a) * 320, vy: Math.sin(a) * 320, team: c.team, dmg: c.vars.jetPotency || 6, type: 'jet', life: (c.vars.jetRange || 120) / 320, source: c });
        });
      },
      tongueStrike(c, target) {
        c.state = 'special';
        c.facing = target.x >= c.x ? 1 : -1;
        M.addEffect('tongue', c.x, c.y, { tx: target.x, ty: target.y });
        if (c.attackCd <= 0) {
          c.attackCd = 1.4 / (c.vars.tongueSpeed || 1);
          M.damage(target, c.dmg * (c.vars.jawStrength || 1.2), c);
          if (c.picks.postCatch === 'knockdown') target.stunnedUntil = M.tick + Math.round(0.7 / TICK);
        }
        // tongue can be severed by big hits — tracked on damage in mem
        if (target.dmg > 18 && M.rng.chance(0.02)) { c.mem.tongueSevered = true; M.uiEvent(-1, 'event', c.tokName + '’s tongue is severed! Snap-only from here.'); }
      },
      shoot(c, target) {
        if (c.attackCd > 0) return;
        if (M.losBlocked(c.x, c.y, target.x, target.y)) return; // forest blocks the shot (§15)
        c.state = 'attack';
        c.facing = target.x >= c.x ? 1 : -1;
        c.attackCd = 1.6 / (c.vars.drawSpeed || 1);
        c.quiver--;
        const lead = 0.35;
        const tx = target.x + (target.intent && target.intent.move ? (target.intent.move.x - target.x) * lead * 0.1 : 0);
        const a = Math.atan2(target.y - c.y, tx - c.x);
        const rangeMul = c.onTower ? 1.3 : 1;
        const airBonus = (target.sp.tags.includes('flyer') || target.element === 'Su') ? 1.35 : 1;
        M.projectiles.push({ x: c.x, y: c.y - c.radius, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, team: c.team, dmg: c.dmg * (c.vars.bowQuality || 1) * airBonus, type: 'arrow', life: (c.attackRange * rangeMul) / 420, source: c });
      },
      throwHanii(c, target) {
        c.mem.cd_hanii = M.tick + Math.round(7 / TICK);
        c.state = 'special';
        const a = Math.atan2(target.y - c.y, target.x - c.x);
        M.projectiles.push({ x: c.x, y: c.y - c.radius, vx: Math.cos(a) * 360, vy: Math.sin(a) * 360, team: c.team, dmg: c.dmg * 1.6 * (c.vars.haniiAccuracy || 0.8), type: 'hanii', life: (c.vars.haniiRange || 100) / 360, source: c });
      },
      dive(c, target) {
        c.intent.attackTarget = target; c.intent.rush = true; c.intent.dmgMul = c.vars.diveSpeed || 1.5;
        if (U.dist(c.x, c.y, target.x, target.y) > 60) M.addEffect('dive', c.x, c.y, { tx: target.x, ty: target.y });
      },
      grabDrop(c, target) {
        c.mem.cd_grab = M.tick + Math.round(10 / TICK);
        c.state = 'special';
        M.damage(target, c.dmg * 1.2, c);
        target.x += M.rng.range(-70, 70); target.y += M.rng.range(-70, 70);
        target.stunnedUntil = M.tick + Math.round(1 / TICK);
        M.addEffect('dive', c.x, c.y, { tx: target.x, ty: target.y });
      },
      flail(c) {
        c.intent.state = 'special'; c.state = 'special';
        if (c.attackCd <= 0) {
          c.attackCd = 0.8;
          M.creatures.forEach(o => {
            if (!o.dead && o !== c && U.dist(c.x, c.y, o.x, o.y) < (c.vars.reach || 26) + c.radius + o.radius) {
              M.damage(o, c.vars.spikeDamage || 3, c);
            }
          });
        }
      },
      regen(c, rate) { c.mem.regen = rate; },
      camo(c) { c.camoUntil = M.tick + Math.round(((c.vars.camo || 0.5) * 4) / TICK); },
      seekHeat(c) {
        const fire = M.zones.find(z => z.type === 'fire');
        if (fire) { c.intent.move = { x: fire.x, y: fire.y, run: true }; if (U.dist(c.x, c.y, fire.x, fire.y) < fire.r) c.heat = Math.min(1, c.heat + TICK * 0.5); }
        else { c.heat = Math.min(1, c.heat + TICK * (c.vars.flameRegen || 0.4) * 0.3); api.patrol(c, 60); }
      },
      burnGround(c) {
        api.patrol(c, 120);
        if (M.rng.chance(0.05)) M.zones.push({ type: 'fire', x: c.x, y: c.y, r: 26, life: 4, owner: c });
      },
      buildBog(c) {
        if (M.zones.filter(z => z.type === 'bog' && z.owner === c).length >= 3) return;
        M.zones.push({ type: 'bog', x: c.x + M.rng.range(-70, 70), y: c.y + M.rng.range(-70, 70), r: 44, team: c.team, potency: (c.vars.acidPotency || 8) * (c.mem.chemistAcid ? 1.5 : 1), owner: c });
        M.addEffect('bogForm', c.x, c.y, {});
      },
      biolumFlash(c) {
        M.addEffect('biolum', c.x, c.y, { col: '#68e0e8' });
        const foe = api.nearestEnemy(c, 220);
        if (foe && M.rng.chance(c.vars.deception || 0.4)) {
          foe.mem.forageTarget = { x: c.x + M.rng.range(-150, 150), y: c.y + M.rng.range(-150, 150) };
        }
      },

      /* relic (steals the ENEMY relic only) */
      pickRelic(c) {
        const rl = M.relics.find(r => r.ownerTeam !== c.team && !r.disabled && !r.captured && r.carrier == null);
        if (!rl) return;
        if (U.dist(c.x, c.y, rl.x, rl.y) > RELIC_PICK_R + c.radius) return;
        rl.carrier = c.id; rl.carrierTeam = c.team;
        c.carryingRelic = true;
        c.matchXp = (c.matchXp || 0) + 15;
        M.uiEvent(-1, 'relic', c.tokName + ' grabs ' + (rl.ownerTeam === 0 ? 'YOUR' : 'the enemy') + ' Relic!');
        if (!M.headless) DYA.audio.play('relicPick');
      },
      dropRelic(c) {
        if (!c.carryingRelic) return;
        const rl = M.relics.find(r => r.carrier === c.id);
        c.carryingRelic = false;
        if (rl) { rl.carrier = null; rl.carrierTeam = null; rl.x = c.x; rl.y = c.y; }
      },

      /* malsti duat */
      canTeleport(c) {
        if (c.carryingRelic) return false; // full stop, no exception
        return api.offCooldown(c, 'tp');
      },
      teleport(c, x, y) {
        c.mem.cd_tp = M.tick + Math.round((c.vars.teleportCooldown || 6) / TICK);
        const prec = c.vars.precision || 0.8;
        x += M.rng.range(-1, 1) * (1 - prec) * 90;
        y += M.rng.range(-1, 1) * (1 - prec) * 90;
        const range = c.vars.teleportRange || 200;
        const d = U.dist(c.x, c.y, x, y);
        if (d > range) { const a = Math.atan2(y - c.y, x - c.x); x = c.x + Math.cos(a) * range; y = c.y + Math.sin(a) * range; }
        // cannot land in an occupied space → displaced to nearest open position
        for (const o of M.creatures) {
          if (!o.dead && U.dist(x, y, o.x, o.y) < o.radius + c.radius) { x += o.radius + c.radius; break; }
        }
        M.addEffect('teleport', c.x, c.y, {});
        c.x = U.clamp(x, 20, WORLD.w - 20); c.y = U.clamp(y, 20, WORLD.h - 20);
        M.addEffect('teleport', c.x, c.y, {});
        if (!M.headless) DYA.audio.play('teleport');
      },
      stealResource(c) {
        const T = M.teams[1 - c.team];
        if (T && resTotal(T.resources) >= 1 && (M.tick % 20 === 0)) {
          const el = mostAbundant(T.resources);
          T.resources[el] -= 1;
          c.mem.stolenVec = c.mem.stolenVec || { Fti: 0, Su: 0, Eldi: 0, Ular: 0 };
          c.mem.stolenVec[el]++;
          c.mem.stolen = (c.mem.stolen || 0) + 1;
          M.teams[c.team].stats.stolen++;
          M.addEffect('steal', c.x, c.y, {});
        }
        c.intent.state = 'special';
      },
      depositStolen(c) {
        if (c.mem.stolenVec) ELS.forEach(e => { M.teams[c.team].resources[e] += c.mem.stolenVec[e]; });
        c.mem.stolenVec = null; c.mem.stolen = 0;
      },

      /* support */
      heal(c, ally) {
        c.mem.cd_heal = M.tick + Math.round((c.vars.healCooldown || 6) / TICK);
        c.state = 'special';
        ally.hp = Math.min(ally.maxHp, ally.hp + (c.vars.healPower || 8) * 3);
        M.addEffect('heal', ally.x, ally.y, {});
      },
      buff(c, ally) {
        c.mem.cd_buff = M.tick + Math.round(8 / TICK);
        c.state = 'special';
        const pot = (c.vars.buffPotency || 0.2) * (c.mem.makariPower ? 1.5 : 1);
        const dur = (c.vars.buffDuration || 8) * (c.mem.makariPower ? 1.4 : 1);
        ally.buffs.push({ dmgMul: 1 + pot, speedMul: 1 + pot * 0.4, until: M.tick + Math.round(dur / TICK) });
        if (c.mem.makariPower) c.mem.makariPower--;
        M.addEffect('buff', ally.x, ally.y, {});
      },
      collectMakari(c, remnant) {
        if (M.teams[c.team]) M.teams[c.team].stats.combos['Crushed Makari harvest'] = true;
        const i = M.remnants.indexOf(remnant);
        if (i >= 0) {
          M.remnants.splice(i, 1);
          c.mem.makariPower = (c.mem.makariPower || 0) + 2;
          c.state = 'special';
        }
      },
      supplyAcid(c, vorn) {
        if (M.teams[c.team]) M.teams[c.team].stats.combos['Chemist acid supply'] = true;
        vorn.mem.chemistAcid = true;
        c.state = 'special';
        M.addEffect('buff', vorn.x, vorn.y, {});
      },
      resupply(c, archer) {
        archer.quiver = Math.round(archer.vars.quiver || 20);
        c.state = 'special';
      },

      /* construction */
      startBuild(c, type) {
        const own = M.teams[c.team].hoard;
        const dir = M.teams[1 - c.team] ? Math.sign(M.teams[1 - c.team].hoard.x - own.x) : 1;
        let x, y;
        if (type === 'tower') { x = own.x + dir * 220 + M.rng.range(-30, 30); y = own.y + M.rng.range(-160, 160); }
        else { x = own.x + dir * 150; y = own.y + M.rng.range(-120, 120); }
        c.mem.building = { type, x, y, progress: 0 };
      },
      continueBuild(c) {
        const b = c.mem.building;
        if (!b) return;
        if (U.dist(c.x, c.y, b.x, b.y) > 26) { c.intent.move = { x: b.x, y: b.y, run: false }; return; }
        c.state = 'special';
        b.progress += (c.vars.buildSpeed || 1) * TICK * 0.2;
        if (b.progress >= 1) {
          const q = b.type === 'tower' ? (c.vars.towerQuality || 1) : (c.vars.structureQuality || 1);
          M.structures.push({ id: 'st' + (M.idCounter++), type: b.type, team: c.team, x: b.x, y: b.y, hp: 120 * q, maxHp: 120 * q, occupant: null, quality: q });
          M.uiEvent(c.team, 'event', c.tokName + ' completes a ' + b.type + '.');
          c.mem.building = null;
        }
      },
      repair(c, s) { c.state = 'special'; s.hp = Math.min(s.maxHp, s.hp + (c.vars.repairSpeed || 1) * 8 * TICK); },
      demolish(c, s) {
        c.state = 'attack';
        if (c.attackCd <= 0) { c.attackCd = 1; s.hp -= c.dmg * 1.5; if (s.hp <= 0) { M.structures = M.structures.filter(x => x !== s); } }
      },
      mountTower(c, s) {
        s.occupant = c.id; c.onTower = s.id; c.x = s.x; c.y = s.y - 16;
        if (M.teams[c.team]) M.teams[c.team].stats.combos['Builder’s tower manned'] = true;
      },

      addEffect: (type, x, y, data) => M.addEffect(type, x, y, data),
    };
    M._api = api;
    return api;
  };

  /* ================= AI OPPONENT CONTROLLER ================= */
  Match.prototype.aiThink = function (T) {
    const M = this;
    if (M.time < T.aiMem.nextThink) return;
    const skill = T.aiSkill;
    T.aiMem.nextThink = M.time + U.lerp(6, 1.6, Math.min(1, skill)) + T.aiRng.range(0, 2);

    const myCreatures = M.creatures.filter(c => !c.dead && c.team === T.idx);
    const enemyCreatures = M.creatures.filter(c => !c.dead && c.team === 1 - T.idx);
    const own = T.hoard, enemy = M.teams[1 - T.idx].hoard;

    /* 1. trigger readied tokens (readied in a previous pulse) */
    const triggerable = T.readied.map((e, i) => ({ e, i })).filter(x => x.e.readiedAtPulse < M.pulseIndex);
    if (triggerable.length) {
      const pick = triggerable[0];
      let x, y;
      const sp = SP.get(pick.e.tok.speciesId);
      const myRelic = M.relics.find(r => r.ownerTeam === T.idx);
      const enemyRelic = M.relics.find(r => r.ownerTeam !== T.idx);
      const enemyHasMine = myRelic && myRelic.carrier != null;
      const enemyRelicFree = enemyRelic && enemyRelic.carrier == null && !enemyRelic.captured;
      if (M.mode === 'hunt' && enemyCreatures.length) {
        const q = enemyCreatures.find(e => e.isBoss) || enemyCreatures[0];
        x = q.x + T.aiRng.range(-160, 160); y = q.y + T.aiRng.range(-160, 160);
      } else if (enemyHasMine && T.aiRng.chance(0.4 + skill * 0.4)) {
        x = myRelic.x + T.aiRng.range(-40, 40); y = myRelic.y + T.aiRng.range(-40, 40); // intercept the thief
      } else if (enemyRelicFree && (sp.tags.includes('thief') || (sp.tags.includes('sentient') && T.aiRng.chance(skill * 0.7)))) {
        x = enemyRelic.homeX + T.aiRng.range(-140, 140); y = enemyRelic.homeY + T.aiRng.range(-140, 140); // raid their hoard
      } else if (sp.tags.includes('stationary') || sp.behavior === 'archer_unit' || sp.behavior === 'grothyn') {
        x = own.x + (enemy.x - own.x) * 0.28 + T.aiRng.range(-60, 60); y = own.y + T.aiRng.range(-200, 200); // defensive line
      } else if (enemyCreatures.length && T.aiRng.chance(0.5)) {
        const target = T.aiRng.pick(enemyCreatures);
        x = target.x + T.aiRng.range(-70, 70); y = target.y + T.aiRng.range(-70, 70); // contest
      } else {
        x = own.x + (enemy.x - own.x) * T.aiRng.range(0.3, 0.65); y = T.aiRng.range(200, WORLD.h - 200);
      }
      M.queueInput(T.idx, { type: 'trigger', slot: pick.i, x: U.clamp(x, 40, WORLD.w - 40), y: U.clamp(y, 40, WORLD.h - 40) });
      return;
    }

    /* 2. ready affordable tokens (vector costs + additional cost) */
    if (T.readied.length < (skill > 0.7 ? 2 : 1) + 1) {
      const affordable = T.pouch.map((e, i) => ({ e, i }))
        .filter(x => {
          if (x.e.state !== 'pouch') return false;
          const cost = Object.assign({}, TK.costVec(x.e.tok));
          const tax = x.e.deaths || 0;
          if (tax > 0) { const el = mostAbundant(T.resources); cost[el] = (cost[el] || 0) + tax; }
          return canAfford(T.resources, cost);
        });
      if (affordable.length) {
        let choice;
        if (T.aiRng.chance(skill)) {
          /* smart-ish: prefer counter picks & relic runners */
          const needRunner = !myCreatures.some(c => c.sp.tags.includes('thief') || c.sp.tags.includes('sentient'));
          const runners = affordable.filter(x => SP.get(x.e.tok.speciesId).tags.includes('thief') || SP.get(x.e.tok.speciesId).tags.includes('sentient'));
          const heavies = affordable.filter(x => SP.get(x.e.tok.speciesId).tags.includes('apex'));
          if (needRunner && runners.length) choice = T.aiRng.pick(runners);
          else if (enemyCreatures.length > myCreatures.length && heavies.length) choice = T.aiRng.pick(heavies);
          else choice = affordable.sort((a, b) => b.e.tok.rarity - a.e.tok.rarity)[0];
        } else {
          choice = T.aiRng.pick(affordable);
        }
        M.queueInput(T.idx, { type: 'ready', pouchIdx: choice.i, taxRes: mostAbundant(T.resources) });
      }
    }
  };

  /* ================= REPLAY SERIALIZATION ================= */
  Match.prototype.serializeReplay = function () {
    const M = this;
    return {
      at: Date.now(),
      seed: M.seed,
      mode: M.mode,
      terrain: M.terrain.id,
      settings: M.settings,
      teams: M.teams.map(T => ({
        name: T.name,
        controller: T.controller === 'human' ? 'replay' : 'replay',
        aiSkill: T.aiSkill,
        pouch: T.pouch.map(e => e.tok),
      })),
      hunt: M.cfg.hunt || null,
      log: M.log,
      result: M.result,
    };
  };
  Match.fromReplay = function (rep) {
    return new Match({
      seed: rep.seed, mode: rep.mode, terrain: rep.terrain, settings: rep.settings,
      teams: rep.teams.map(t => ({ name: t.name, controller: 'replay', aiSkill: t.aiSkill, pouch: t.pouch })),
      hunt: rep.hunt,
      replayLog: rep.log,
    });
  };

  DYA.match = { Match, TICK, WORLD, HOARD_R };
})();
