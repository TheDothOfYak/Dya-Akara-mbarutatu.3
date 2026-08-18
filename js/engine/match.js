/* ============================================================
   DYA'AKARA — engine/match.js
   The deterministic match engine.

   - Fixed timestep (20 ticks/sec), all randomness from the match
     seed → identical outcomes on every client & in replays.
   - Replays = seed + input log (design doc Part XIV).
   - Standard match: pulses, Relic capture, tether, escalation.
   - Duel mode: 1v1 tokens, no resources/pulse/Relic. The only
     possible draw is a RubberMcFly in play (ShurgrEdan retribution
     taking both sides down, or a McFly standoff).
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
        /* admin-authored exact overrides (Admin → Hunts → encounter enemies):
           size, precise hp/dmg/speed, behavior value, name, and individual
           variables all come straight off the Hunt definition so the quarry
           fights exactly as designed rather than as a random roll. */
        if (e.sizeIdx != null) tok.sizeIdx = U.clamp(e.sizeIdx | 0, 0, 4);
        if (e.name) tok.name = e.name;
        if (e.element) tok.element = e.element;
        if (e.behaviorValue != null) tok.behaviorValue = e.behaviorValue;
        if (e.vars && typeof e.vars === 'object') tok.vars = Object.assign({}, tok.vars, e.vars);
        /* trait picks (headCount for Nagas, vine behavior, breath tier, target
           priority…) — applied BEFORE spawn so head count etc. take effect */
        if (e.picks && typeof e.picks === 'object') tok.picks = Object.assign({}, tok.picks, e.picks);
        if (e.stats && typeof e.stats === 'object') {
          tok.stats = Object.assign({}, tok.stats);
          if (e.stats.hp != null) tok.stats.hp = Math.max(1, e.stats.hp);
          if (e.stats.dmg != null) tok.stats.dmg = Math.max(0, e.stats.dmg);
          if (e.stats.speed != null) tok.stats.speed = Math.max(0, e.stats.speed);
        }
        const cx = WORLD.w * 0.72 + M.rng.range(-90, 90), cy = WORLD.h / 2 + M.rng.range(-190, 190);
        const c = M.spawnFromToken(tok, 1, cx, cy);
        /* per-creature behavior-tree override (utterly unique quarry) */
        if (e.behavior && BV[e.behavior]) c.behaviorOverride = e.behavior;
        /* a boss gets the classic 1.6× health bump ONLY when the author left
           the health at default — an explicit exact HP override is honored as-is */
        if (e.boss) { c.isBoss = true; if (!(e.stats && e.stats.hp != null)) { c.maxHp *= 1.6; c.hp = c.maxHp; } }
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
      fortifiedUntil: 0,
      intent: {},
      animPhase: (M.idCounter * 0.61803) % 1 * 6.28,
    };
    /* the player's own Eikar — the token of THEM — reads the field and
       sounds the horn on its own; it is exactly as smart as its keeper */
    c.isCommander = !!(tok.isSelf || (tok.isStarter && sp.eikarLayer));

    /* ------- MOUNT + RIDER (an Eikar/Keilia mounts it on the field) -------
       A creature tagged "mount" (the Domestic Punk, the Kuni Byrd) is rideable
       but spawns RIDERLESS — it fights its own wild brain until a friendly
       Eikar or Keilia physically reaches it and climbs on (see M.updateMounting).
       The rider does NOT vanish: it rides along, drawn on the mount's back, and
       keeps fighting with its OWN weapon (an Archer keeps shooting, a Spear
       throws its Hanii) on top of the mount's attacks — which is why a mounted
       pair is so strong. The mount also grows tougher, faster, and hits harder,
       and the bond deepens the longer they ride (M.mountRider / M.applyMountStats).
       The rider can't be struck directly while up there; if the mount falls it's
       thrown clear and fights on foot (M.dismountRider). */
    c.mountable = !!(sp.tags && sp.tags.includes('mount'));
    c.hasRider = false;
    c.riderUnit = null;
    c.riderProtect = 0;
    if (c.mountable) {
      c.riderlessBehavior = sp.riderlessBehavior || sp.behavior;
      c.riddenBehavior = sp.riddenBehavior || 'mounted_eikar';
      /* remember the on-foot baseline so mount boosts + bond stay reversible */
      c.mountBaseHp = c.maxHp; c.mountBaseDmg = c.dmg; c.mountBaseRange = c.attackRange; c.mountBaseSpeed = c.speed;
      c.bond = 0; c.bondTick = 0;
    }

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
    /* a per-token behavior tree the admin designed onto this individual
       (TK.mintSpec) — honored whenever the token is fielded, not just when
       it's spawned as a hunt enemy */
    if (tok.behavior && BV[tok.behavior]) c.behaviorOverride = tok.behavior;
    M.creatures.push(c);
    M.addEffect('deploy', x, y, { r: c.radius });
    return c;
  };


  /* ================= INPUTS ================= */
  /* input: {type:'ready', pouchIdx} | {type:'trigger', slot, x, y} |
            {type:'feed', creatureId} | {type:'chat', msg} | {type:'concede'} */
  /* atTick/seq are used by networked lockstep play: inputs are scheduled
     a fixed delay ahead and applied in (tick, team, seq) order so both
     clients simulate identically regardless of message arrival order. */
  Match.prototype.queueInput = function (team, input, atTick, seq) {
    this.inputQueue.push({ tick: atTick != null ? atTick : this.tick + 1, team, input, seq: seq || 0 });
  };

  Match.prototype.applyInput = function (team, input) {
    const M = this, T = M.teams[team];
    if (input.type === 'ready') {
      const entry = T.pouch[input.pouchIdx];
      if (!entry || entry.state !== 'pouch') return;
      if (T.readied.length >= 5) { M.uiEvent(team, 'deny', 'Ready panel is full (5 slots).'); return; }
      /* Hunts: the party you bring is yours to deploy freely — no resource
         cost, and no re-ready tax for prior defeats. Standard/duel matches
         keep the economy (base cost + additional cost per prior defeat). */
      if (M.mode !== 'hunt') {
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
      } else {
        entry.state = 'readied';
        entry.readiedAtPulse = M.pulseIndex;
        T.readied.push(entry);
        M.uiEvent(team, 'ready', entry.tok.name + ' readied.');
      }
    } else if (input.type === 'trigger') {
      const entry = T.readied[input.slot];
      if (!entry) return;
      /* Hunts: deploy your party whenever you like — no same-pulse hold. */
      if (M.mode !== 'hunt' && entry.readiedAtPulse === M.pulseIndex) { M.uiEvent(team, 'deny', 'Cannot trigger in the same pulse it was readied.'); return; }
      let x = input.x, y = input.y;
      const eh = M.teams[1 - team].hoard;
      if (U.dist(x, y, eh.x, eh.y) < 130) { const a = Math.atan2(y - eh.y, x - eh.x); x = eh.x + Math.cos(a) * 130; y = eh.y + Math.sin(a) * 130; }
      /* a completed enemy wall ring seals the ground inside it — you cannot
         deploy there. A Malsti Punk is the exception: it blinks in through the
         Duat. Anyone else is nudged out to just beyond the nearest wall. */
      if (entry.tok.speciesId !== 'malsti_punk') {
        const enc = M.wallEnclosure(1 - team);
        if (enc && x > enc.minX && x < enc.maxX && y > enc.minY && y < enc.maxY) {
          const dl = x - enc.minX, dr = enc.maxX - x, dt = y - enc.minY, db = enc.maxY - y, mn = Math.min(dl, dr, dt, db);
          if (mn === dl) x = enc.minX - 16; else if (mn === dr) x = enc.maxX + 16; else if (mn === dt) y = enc.minY - 16; else y = enc.maxY + 16;
          x = U.clamp(x, 20, WORLD.w - 20); y = U.clamp(y, 20, WORLD.h - 20);
          M.uiEvent(team, 'deny', 'Their walls seal the ground — deploy pushed outside.');
        }
      }
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

    /* inputs scheduled for this tick — applied in deterministic
       (tick, team, seq) order so lockstep clients always agree */
    if (M.inputQueue.length) {
      const due = [];
      for (let i = 0; i < M.inputQueue.length; i++) {
        if (M.inputQueue[i].tick <= M.tick) { due.push(M.inputQueue[i]); M.inputQueue.splice(i, 1); i--; }
      }
      if (due.length) {
        due.sort((a, b) => (a.tick - b.tick) || (a.team - b.team) || ((a.seq || 0) - (b.seq || 0)));
        for (const q of due) {
          M.log.push({ t: M.tick, team: q.team, i: q.input });
          M.applyInput(q.team, q.input);
        }
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
      /* A rider up on a mount still runs its OWN brain here — an Archer keeps
         shooting, a Spear keeps throwing — but its self-movement is suppressed
         in execIntent (it rides where the mount takes it, position synced in
         M.updateMounting). It just can't be targeted or move on its own. */
      if (c.stunnedUntil > M.tick) { c.state = 'hit'; if (c.carryingRelic) M.dropRelic(c, 'stun'); continue; }
      if ((M.tick + c.id) % 6 === 0) {
        c.intent = {};
        /* a hunt creature may be given a different decision tree than its
           species' default (Admin → Hunts → creature "Behavior tree"); a
           mount fights its ridden brain while carrying a rider, its riderless
           brain otherwise */
        const b = BV[c.behaviorOverride || (c.mountable ? (c.riderUnit ? c.riddenBehavior : c.riderlessBehavior) : null) || c.sp.behavior];
        if (b) { api._c = c; b(c, api); }
        /* a fighting flyer that a tower is shooting turns and presses the tower
           (the siege loop wears it down while the flyer is on top of it) */
        if (c.mem.towerAggro && (M.tick - (c.mem.towerAggroAt || 0)) < Math.round(5 / TICK)) {
          const tw = M.structures.find(s2 => s2.id === c.mem.towerAggro && s2.hp > 0);
          if (tw) c.intent = { move: { x: tw.x, y: tw.y, run: true }, state: 'attack' };
          else c.mem.towerAggro = null;
        }
        /* Duel: creatures ALWAYS fight — pursue to elimination, no idling (§1).
           We still run the species brain above so every ability (screech,
           jet, breath, tongue, hanii…) fires in duels too; we only force the
           creature onto the nearest foe when its brain produced no attack or
           ability this tick, so a duel can never stall on patrol/forage/flee. */
        if (M.mode === 'duel') {
          const acting = c.state === 'special' || c.state === 'attack' || c.intent.state === 'special' || !!c.intent.attackTarget;
          if (!acting) {
            const foe = api.nearestEnemy(c, 99999);
            if (foe) api.attack(c, foe, false, true, (c.vars.breathRange || c.sp.behavior === 'grothyn' || c.headCount > 1));
          }
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

    /* Eikar mount up, and let a riding bond deepen over time */
    M.updateMounting();

    /* projectiles */
    M.stepProjectiles();
    /* zones: bogs slow/damage, fire burns */
    M.stepZones();
    /* structures/buffs/regen/tether */
    M.stepMisc();

    /* win conditions */
    M.checkEnd();
  };

  /* ================= MOUNTING (Eikar rides a mount) =================
     A free Eikar/Keilia walks up to a friendly, unmounted "mount"-tagged
     creature and climbs on. The pair then fights as one, grows stronger the
     longer they ride, and the rider is thrown clear if the mount falls.
     Deterministic (position + distance only) so lockstep netplay and replays
     stay byte-identical. */
  Match.prototype.updateMounting = function () {
    const M = this;
    /* 1) keep each rider glued to its mount, and let the bond deepen */
    for (const c of M.creatures) {
      if (c.dead || !c.riderUnit) continue;
      const e = c.riderUnit;
      if (e.dead) { M.dismountRider(c, false); continue; }
      e.x = c.x; e.y = c.y; e.facing = c.facing; e.rideR = c.radius;   // the rider travels with the mount (its shots fire from up there)
      if (M.tick - c.bondTick >= Math.round(1 / TICK) && (c.bond || 0) < 8) {
        c.bondTick = M.tick; c.bond = (c.bond || 0) + 1;
        M.applyMountStats(c);
        M.addEffect('buff', c.x, c.y - c.radius, {});
        if (c.bond === 8) M.uiEvent(-1, 'event', (c.tokName || 'The pair') + ' and ' + (e.tokName || 'its rider') + ' are fully bonded — they fight as one.');
      }
    }
    /* 2) a free Eikar/Keilia seeks the nearest unmounted friendly mount */
    let mounts = null;
    for (const e of M.creatures) {
      if (e.dead || e.riding || e.mountable) continue;
      if (e.onTower || e.inHut) continue;   // a garrisoned archer never climbs down to go mount something
      if (e.sp.behavior === 'builder') continue;   // a Builder never mounts up — it stays on the works
      if (!(e.sp.eikarLayer || e.sp.keiliaLayer) || e.rooted) continue;
      if (mounts === null) mounts = M.creatures.filter(c => c.mountable && !c.dead && !c.riderUnit);
      if (!mounts.length) break;
      let best = null, bd = 1e9;
      for (const c of mounts) {
        if (c.riderUnit || c.team !== e.team) continue;
        const d = U.dist(e.x, e.y, c.x, c.y);
        if (d < bd) { bd = d; best = c; }
      }
      if (!best) continue;
      if (bd <= e.radius + best.radius + 12) { M.mountRider(e, best); continue; }
      if (bd > 460) continue;                                    // too far — fight on foot
      if (e.intent && e.intent.attackTarget) continue;           // committed to a strike
      if (e.state === 'attack' || e.state === 'special') continue;
      /* no enemy right on top of it → close the distance and mount */
      let threatened = false;
      for (const o of M.creatures) { if (!o.dead && o.team !== e.team && o.team !== -1 && U.dist(e.x, e.y, o.x, o.y) < 120) { threatened = true; break; } }
      if (threatened) continue;
      const dx = best.x - e.x, dy = best.y - e.y, d = Math.hypot(dx, dy) || 1;
      const step = e.speed * (bd > 130 ? 1.35 : 1) * TICK;
      e.x = U.clamp(e.x + dx / d * step, 14, WORLD.w - 14);
      e.y = U.clamp(e.y + dy / d * step, 14, WORLD.h - 14);
      e.facing = dx >= 0 ? 1 : -1;
      e.state = 'run';
    }
  };

  /* mount + bond → tougher, harder-hitting, and FASTER. The rider fights with
     its own weapon on top of this (so we don't fold the rider's damage in — that
     would double-count it). All scaled off the on-foot baseline so it reverts
     cleanly when the rider dismounts. */
  Match.prototype.applyMountStats = function (c) {
    const e = c.riderUnit; if (!e) return;
    const bond = c.bond || 0;
    const newMax = Math.round(c.mountBaseHp * (1.15 + bond * 0.02));   // up to ~+31% hp
    c.hp = Math.min(newMax, c.hp + Math.max(0, newMax - c.maxHp));     // gain the delta only
    c.maxHp = newMax;
    c.dmg = Math.round(c.mountBaseDmg * (1.15 + bond * 0.05) * 10) / 10;  // the mount's own bite — up to ~+55%
    c.speed = Math.round(c.mountBaseSpeed * (1.18 + bond * 0.03));        // carrying a rider spurs it faster — up to ~+42%
    c.attackRange = c.mountBaseRange;
    c.riderProtect = U.clamp((c.vars.riderProtection != null ? c.vars.riderProtection : 0.15) + (e.sp.keiliaLayer ? 0.05 : 0) + bond * 0.012, 0.08, 0.5);
  };

  Match.prototype.mountRider = function (e, c) {
    const M = this;
    if (!e || !c || c.riderUnit || e.riding || c.dead || e.dead) return;
    c.riderUnit = e; c.hasRider = true;
    e.riding = true; e.mountedOn = c.id; e.mountedAt = M.tick; e.rideR = c.radius; e.intent = {};
    c.bond = 0; c.bondTick = M.tick;
    M.applyMountStats(c);
    if (M.teams[c.team] && M.teams[c.team].stats) M.teams[c.team].stats.combos['Eikar mounts up'] = true;
    M.addEffect('deploy', c.x, c.y, { r: c.radius });
    M.uiEvent(-1, 'event', (e.tokName || 'An Eikar') + ' mounts ' + (c.tokName || 'the mount') + ' — they ride as one.');
  };

  Match.prototype.dismountRider = function (c, thrown) {
    const M = this;
    const e = c.riderUnit;
    c.riderUnit = null; c.hasRider = false; c.riderProtect = 0; c.bond = 0;
    /* the mount reverts to its on-foot strength */
    c.maxHp = c.mountBaseHp; if (c.hp > c.maxHp) c.hp = c.maxHp;
    c.dmg = c.mountBaseDmg; c.attackRange = c.mountBaseRange; c.speed = c.mountBaseSpeed;
    if (!e) return;
    e.riding = false; e.mountedOn = null; e.rideR = 0;
    if (thrown && !e.dead) {
      /* the mount fell — the rider is thrown clear and fights on foot, shaken */
      e.x = U.clamp(c.x + 14, 14, WORLD.w - 14); e.y = c.y; e.state = 'hit'; e.intent = {};
      if (e.hp > e.maxHp * 0.5) e.hp = Math.round(e.maxHp * 0.5);
      M.addEffect('deploy', e.x, e.y, { r: e.radius });
      M.uiEvent(-1, 'event', (e.tokName || 'The rider') + ' is thrown clear and fights on.');
    }
  };

  /* ================= FORTIFICATIONS (Keilia Builder) =================
     The whole plan is dimensioned off the BEST builder on the field: tower
     size, garrison capacity, ranges, and structure health all scale with it.
     Stages: tower 1 → two wall-towers + the wall between → tower 2 → the
     Builder’s Hut behind the hoard. With 2+ spearmen the plan adds a third,
     cone-ranged tower and a full wall ring. */
  Match.prototype.structuresList = function (team) { return this.structures.filter(s => s.team === team && s.hp > 0); };

  Match.prototype.bestBuilder = function (team) {
    let best = null, bestScore = -1;
    for (const c of this.creatures) {
      if (c.dead || c.team !== team || c.sp.behavior !== 'builder') continue;
      const v = c.vars || {};
      const score = (v.towerQuality || 1) * (v.structureQuality || 1) * (1 + (c.sizeIdx || 0) * 0.15);
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return best;
  };

  /* dimension the fortifications off the best builder */
  Match.prototype.builderSpec = function (team) {
    const b = this.bestBuilder(team);
    const v = b ? (b.vars || {}) : {};
    const q = v.towerQuality || 1, sq = v.structureQuality || 1, size = b ? (b.sizeIdx || 2) : 2;
    /* CLOSE (2.5×) range — the current tower footprint, ~80, variable 30–100.
       FAR (1.5×) range is 3× the close range. */
    const close = U.clamp(Math.round(46 + q * 30 + size * 4), 30, 100);
    const far = close * 3;
    const capacity = U.clamp(1 + Math.floor((close - 40) / 28), 1, 3);
    const towerHp = Math.round(120 * sq * (1 + capacity * 0.3));
    const wallHp = Math.round(180 * sq);
    const wallTowerDmg = Math.round(3 + sq * 4 + q * 3);
    const wallTowerHp = Math.round(110 * sq);
    const radius = 22 + capacity * 6 + Math.round((close - 60) * 0.12);
    return { q, sq, size, close, far, capacity, towerHp, wallHp, wallTowerDmg, wallTowerHp, radius,
      trapped: !!(b && b.picks && b.picks.trapIntegration) };
  };

  /* clock-face geometry around the hoard, oriented so 3 o’clock faces the enemy */
  Match.prototype._clock = function (team, hour, r) {
    const own = this.teams[team].hoard;
    const foe = this.teams[1 - team] ? this.teams[1 - team].hoard : own;
    const dir = Math.sign(foe.x - own.x) || 1;
    const ang = (hour / 12) * Math.PI * 2;      // from 12 o’clock, clockwise
    let dx = Math.sin(ang) * r, dy = -Math.cos(ang) * r;
    if (dir < 0) dx = -dx;                        // mirror so 3 o’clock always faces the foe
    return { x: U.clamp(own.x + dx, 30, WORLD.w - 30), y: U.clamp(own.y + dy, 30, WORLD.h - 30) };
  };

  /* the ordered blueprint list (roles are stable so structures/claims line up).
     Two main towers sit BEHIND a battlemented front wall; that wall runs
     wall–tower–wall–tower–wall between them, with the wall-towers spaced well
     apart. The rear cone tower + the full wall ring only unlock once the works
     have been upgraded to Level 2. */
  Match.prototype.builderBlueprints = function (team) {
    const sp = this.builderSpec(team);
    const own = this.teams[team].hoard;
    const foe = this.teams[1 - team] ? this.teams[1 - team].hoard : own;
    const dir = Math.sign(foe.x - own.x) || 1;
    const R = 96 + sp.radius;
    const level = this.fortLevel(team);
    const spearmen = this.creatures.filter(c => !c.dead && c.team === team && c.sp.behavior === 'spear_unit').length;
    const cx = v => U.clamp(v, 34, WORLD.w - 34), cy = v => U.clamp(v, 44, WORLD.h - 44);
    const towerX = cx(own.x + dir * R);          // main towers — a little back, inside the wall
    const frontX = cx(own.x + dir * (R + 50));   // the front wall line, out toward the enemy
    const bp = [];
    /* stage 1 — tower one (lower front) */
    bp.push({ role: 'tower1', kind: 'tower', x: towerX, y: cy(own.y + 122), spec: sp });
    /* stage 2 — the front wall line: wall · wall-tower · wall · wall-tower · wall */
    [-120, -60, 0, 60, 120].forEach((oy, i) => {
      const y = cy(own.y + oy);
      if (i % 2 === 1) bp.push({ role: 'wallTower' + i, kind: 'wallTower', x: frontX, y, spec: sp });
      else bp.push({ role: 'wall' + i, kind: 'wall', x: frontX, y, spec: sp, extra: { trapped: sp.trapped, vertical: true } });
    });
    /* stage 3 — tower two (upper front) */
    bp.push({ role: 'tower2', kind: 'tower', x: towerX, y: cy(own.y - 122), spec: sp });
    /* stage 4 — the Builder's Hut, behind the hoard */
    bp.push({ role: 'hut', kind: 'hut', x: cx(own.x - dir * (R + 34)), y: own.y, spec: sp });
    /* Level 2 + 2 spearmen: a rear cone tower + a CLOSED wall ring around the
       hoard. The front edge already exists (stage 2); here we lay the back edge
       and the top/bottom edges, overlapping at the corners so the square seals
       with no gaps — the enemy then cannot deploy inside it. */
    if (level >= 2 && spearmen >= 2) {
      const coneX = cx(own.x - dir * (R + 16)), coneY = own.y;
      const coneDir = dir > 0 ? 0 : Math.PI;      // apex at the tower, opening toward the enemy / field centre
      bp.push({ role: 'towerCone', kind: 'cone', x: coneX, y: coneY, spec: Object.assign({}, sp, { coneDir, coneHalf: Math.PI / 5, coneRange: sp.far }) });
      const xL = own.x - dir * (R + 50), xR = own.x + dir * (R + 50), yT = own.y - 150, yB = own.y + 150;
      const line = (role, x1, y1, x2, y2, vertical) => {
        const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 60));
        for (let i = 0; i <= n; i++) { const t = i / n; bp.push({ role: role + i, kind: 'wall', x: cx(x1 + (x2 - x1) * t), y: cy(y1 + (y2 - y1) * t), spec: sp, extra: { trapped: sp.trapped, vertical } }); }
      };
      line('ringBack', xL, yT, xL, yB, true);     // rear edge (vertical)
      line('ringTop', xL, yT, xR, yT, false);      // top edge (horizontal)
      line('ringBot', xL, yB, xR, yB, false);      // bottom edge (horizontal)
    }
    return bp;
  };

  Match.prototype.raiseStructure = function (c, bp) {
    const M = this, sp = bp.spec || M.builderSpec(c.team);
    const q = (c.vars && c.vars.structureQuality) || 1;
    const foe = M.teams[1 - c.team] ? M.teams[1 - c.team].hoard : M.teams[c.team].hoard;
    const s = { id: 'st' + (M.idCounter++), type: bp.kind === 'wall' ? 'wall' : bp.kind === 'ward' ? 'ward' : 'tower',
      kind: bp.kind, role: bp.role, team: c.team, x: bp.x, y: bp.y, occupants: [], quality: q, upgraded: false, powerMul: 1, fireCd: 0,
      face: Math.sign(foe.x - bp.x) || 1 };
    if (bp.kind === 'wall') {
      const vert = !bp.extra || bp.extra.vertical !== false;   // front/back walls run vertically; ring sides horizontally
      s.w = vert ? 24 : 84; s.h = vert ? 84 : 24; s.vertical = vert;
      s.trapped = !!(bp.extra && bp.extra.trapped); s.trapCd = 0; s.hp = s.maxHp = sp.wallHp;
    } else if (bp.kind === 'ward') {
      s.radius = 66; s.hp = s.maxHp = Math.round(110 * q);
    } else if (bp.kind === 'wallTower') {
      s.w = 26; s.h = 46; s.capacity = 0; s.baseDmg = sp.wallTowerDmg; s.range = 50; s.close = 50; s.far = 50;
      s.hp = s.maxHp = sp.wallTowerHp;
    } else if (bp.kind === 'hut') {
      s.w = 54; s.h = 44; s.capacity = 99; s.isHut = true; s.level = 1; s.hp = s.maxHp = Math.round(220 * q);
    } else { /* tower / cone — manned */
      s.w = 30 + sp.capacity * 4; s.h = 52; s.capacity = sp.capacity; s.close = sp.close; s.far = sp.far; s.radius = sp.radius;
      s.hp = s.maxHp = sp.towerHp;
      if (bp.kind === 'cone') { s.coneDir = sp.coneDir; s.coneHalf = sp.coneHalf; s.coneRange = sp.coneRange; s.far = sp.coneRange; }
    }
    M.structures.push(s);
    /* if the works are already Level 2, anything raised later comes up upgraded */
    if (M.fortLevel(c.team) === 2) M.upgradeOne(s);
    const label = s.isHut ? 'Builder’s Hut' : s.kind === 'wallTower' ? 'wall-tower' : s.kind === 'cone' ? 'cone tower' : s.type;
    M.uiEvent(c.team, 'event', c.tokName + ' completes a ' + label + (s.trapped ? ' (spiked)' : '') + '.');
    return s;
  };

  /* free any garrisoned archers when a tower collapses — and turn out any
     builders sheltering in a Hut that is torn down, so they never get stranded */
  Match.prototype.freeOccupants = function (s) {
    if (s.occupants && s.occupants.length) {
      for (const id of s.occupants) {
        const o = this.creatures.find(cc => cc.id === id && !cc.dead);
        if (o) { o.onTower = null; o.mem.vantage = null; }
      }
      s.occupants = [];
    }
    if (s.isHut) {
      for (const o of this.creatures) {
        if (!o.dead && o.inHut === s.id) { o.inHut = null; o.mem.hutSincePulse = null; }
      }
    }
  };

  /* current fortification level of a team: Level 2 once the Hut is a Stronghold */
  Match.prototype.fortLevel = function (team) {
    const h = this.structures.find(s => s.team === team && s.isHut && s.hp > 0);
    return (h && h.level >= 2) ? 2 : 1;
  };
  /* a builder has sheltered a full pulse in the Hut → upgrading is unlocked */
  Match.prototype.upgradeReady = function (team) { return !!(this.teams[team] && this.teams[team].upgradeUnlocked); };

  /* a tower just shot this creature — if it's a fighting flyer, it may wheel
     around and attack the tower that's shooting it ("some flying creatures") */
  Match.prototype.markTowerAggro = function (c, s) {
    if (!c || c.dead || !c.sp.tags.includes('flyer')) return;
    if (c.sp.tags.includes('passive') || c.dmg <= 4) return;
    c.mem.towerAggro = s.id; c.mem.towerAggroAt = this.tick;
  };

  /* element mix of a team's STARTING POUCH — the Malsti Punk reads this and
     steals the colours the enemy leans on (a green-heavy pouch loses Ular most) */
  Match.prototype.pouchElementWeights = function (team) {
    const T = this.teams[team], w = { Fti: 0, Su: 0, Eldi: 0, Ular: 0 };
    if (T && T.pouch) for (const e of T.pouch) { const el = e.tok && e.tok.element; if (w[el] != null) w[el]++; }
    if (!ELS.some(e => w[e] > 0)) ELS.forEach(e => w[e] = 1);
    return w;
  };

  /* The wall ring seals the hoard ONLY when it is 100% complete — any gap (an
     unbuilt or destroyed segment) breaks the seal. We prove completeness by a
     flood-fill from the hoard over a fine grid: if the fill can leak out to the
     surrounding border, the ring is open; if it is fully contained by walls,
     it's sealed and we return the enclosed interior box. Returns null when open.
     Used to forbid the enemy from deploying inside a finished fortress. */
  Match.prototype.wallEnclosure = function (team) {
    const own = this.teams[team] && this.teams[team].hoard;
    if (!own) return null;
    const walls = this.structures.filter(s => s.team === team && s.type === 'wall' && s.hp > 0);
    if (walls.length < 6) return null;                 // not enough for a ring
    /* the barrier is walls PLUS the towers/wall-towers/hut that sit in the line
       and fill its gaps — all of them seal the ground the enemy can deploy on */
    const solids = this.structures.filter(s => s.team === team && s.hp > 0 && s.w && s.h &&
      (s.type === 'wall' || s.kind === 'tower' || s.kind === 'cone' || s.kind === 'wallTower' || s.isHut));
    /* region = barrier bounding box + margin (the border must lie outside every piece) */
    let minX = own.x, maxX = own.x, minY = own.y, maxY = own.y;
    for (const w of solids) { minX = Math.min(minX, w.x - w.w / 2); maxX = Math.max(maxX, w.x + w.w / 2); minY = Math.min(minY, w.y - w.h / 2); maxY = Math.max(maxY, w.y + w.h / 2); }
    const margin = 40; minX -= margin; maxX += margin; minY -= margin; maxY += margin;
    const cell = 12;
    const cols = Math.ceil((maxX - minX) / cell), rows = Math.ceil((maxY - minY) / cell);
    if (cols < 4 || rows < 4 || cols * rows > 40000) return null;
    const blocked = (cxi, cyi) => {
      const x = minX + cxi * cell + cell / 2, y = minY + cyi * cell + cell / 2;
      for (const w of solids) if (Math.abs(x - w.x) <= w.w / 2 + 1 && Math.abs(y - w.y) <= w.h / 2 + 1) return true;
      return false;
    };
    const startX = Math.floor((own.x - minX) / cell), startY = Math.floor((own.y - minY) / cell);
    if (startX < 0 || startY < 0 || startX >= cols || startY >= rows || blocked(startX, startY)) return null;
    const seen = new Uint8Array(cols * rows);
    const stack = [[startX, startY]]; seen[startY * cols + startX] = 1;
    let leak = false, bMinX = own.x, bMaxX = own.x, bMinY = own.y, bMaxY = own.y;
    while (stack.length) {
      const cur = stack.pop(), cxi = cur[0], cyi = cur[1];
      const wx = minX + cxi * cell + cell / 2, wy = minY + cyi * cell + cell / 2;
      if (wx < bMinX) bMinX = wx; if (wx > bMaxX) bMaxX = wx; if (wy < bMinY) bMinY = wy; if (wy > bMaxY) bMaxY = wy;
      const nb = [[cxi + 1, cyi], [cxi - 1, cyi], [cxi, cyi + 1], [cxi, cyi - 1]];
      for (let k = 0; k < 4; k++) {
        const nx = nb[k][0], ny = nb[k][1];
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) { leak = true; continue; }   // reached the border → gap
        const idx = ny * cols + nx;
        if (seen[idx]) continue;
        seen[idx] = 1;
        if (blocked(nx, ny)) continue;
        stack.push([nx, ny]);
      }
    }
    if (leak) return null;                             // the fill escaped — the ring is not 100% closed
    return { minX: bMinX - cell, maxX: bMaxX + cell, minY: bMinY - cell, maxY: bMaxY + cell };
  };
  Match.prototype.pendingUpgrades = function (team) {
    return this.structures.filter(s => s.team === team && s.hp > 0 && !s.upgraded && !s.isHut && s.type !== 'ward');
  };

  /* upgrade ONE structure (this is the job a builder completes over build-time):
     towers ×2 power & range and ×3 hp; walls ×4 hp; wall-towers ×2 power & range
     and ×3 hp. When the last one is done, the Hut advances to Level 2. */
  Match.prototype.upgradeOne = function (s) {
    if (!s || s.hp <= 0 || s.upgraded || s.isHut || s.type === 'ward') return false;
    s.upgraded = true;
    if (s.type === 'wall') { s.maxHp *= 4; s.hp = s.maxHp; }
    else if (s.kind === 'wallTower') { s.powerMul = 2; s.baseDmg *= 2; s.range *= 2; s.close = s.range; s.far = s.range; s.maxHp *= 3; s.hp = s.maxHp; }
    else { s.powerMul = 2; s.close *= 2; s.far *= 2; if (s.coneRange) s.coneRange *= 2; s.maxHp *= 3; s.hp = s.maxHp; }
    this.addEffect('buff', s.x, s.y - 10, { big: true });
    if (!this.pendingUpgrades(s.team).length) {
      const hut = this.structures.find(x => x.team === s.team && x.isHut && x.hp > 0);
      if (hut && hut.level !== 2) { hut.level = 2; this.uiEvent(s.team, 'event', 'The Builder’s Hut is raised to a Stronghold — the works stand at Level 2.'); }
    }
    return true;
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
    /* hoard-sense quirk: every 4th pulse a living hoarder sniffs out +1 extra
       (hunts don't run a resource economy, so no sniff bonus there) */
    if (M.mode !== 'hunt') for (const c of M.creatures) {
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
        /* RubberMcFly — and now ANY creature a designer has given a
           resourceCount (Admin → Creatures → "Resources generated per pulse")
           — produces resources for its team each pulse. The McFly still gets
           its Sunear'Zikhron bonus; other generators get the +1 only if tagged
           "generator". A "multi" resourceTypes pick spreads across all four
           elements, otherwise it yields its own element/truth. */
        if (c.speciesId === 'rubbermcfly' || (c.vars.resourceCount > 0 && c.speciesId !== 'karnen')) {
          const isMcfly = c.speciesId === 'rubbermcfly';
          const bonus = (zik && (isMcfly || (c.sp.tags && c.sp.tags.includes('generator')))) ? 1 : 0;
          const n = Math.round(c.vars.resourceCount || 0) + bonus;
          const multi = c.picks.resourceTypes === 'multi';
          if (!c.mem.genEl) c.mem.genEl = (c.sp.element && ELS.includes(c.sp.element)) ? c.sp.element : M.rng.pick(ELS);
          for (let i = 0; i < n; i++) units.push(multi ? M.rng.pick(ELS) : c.mem.genEl);
        }
        if (c.speciesId === 'stryx' && c.vars.absorbRate > 0.2) units.push('Ular');
      });
      /* Hunts: the pulse still ticks (for time-based abilities) but grants no
         team resources — your party deploys for free, so there's no economy. */
      if (M.mode !== 'hunt') {
        units.forEach(el => { T.resources[el]++; });
        T.stats.resourcesEarned += units.length;
        /* orb visuals near hoard, colored by resource type */
        units.slice(0, 6).forEach(el => {
          M.orbs.push({ x: T.hoard.x + M.rng.range(-50, 50), y: T.hoard.y + M.rng.range(-50, 50), el, t0: M.time, team: T.idx });
        });
      }
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

    /* movement (a mounted rider doesn't move on its own — it rides where the
       mount takes it; M.updateMounting keeps it glued to the mount) */
    if (it.move && !c.rooted && !(c.onTower) && !c.inHut && !c.riding) {
      let sp = c.speed * (it.move.run ? 1.45 : 1) * buffMul('speedMul');
      if (c.carryingRelic || (c.riderUnit && c.riderUnit.carryingRelic)) {
        sp *= c.sp.tags.includes('thief') ? (c.vars.carrySpeed || 0.2) / 1.5 * 5 : 0.45;   // a laden mount is slowed too
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
          let dmg = c.dmg * buffMul('dmgMul') * (it.dmgMul || 1) * (1 + Math.min(0.2, Math.floor((c.matchXp || 0) / 100) * 0.02)) * M.quirkDmgMul(c, t);
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
      const smart = !!(c.sp.eikarLayer || c.sp.keiliaLayer || c.hasRider || c.sp.behavior === 'karnen' || c.speciesId === 'su_naga' || (c.vars.intelligence || 0) > 0.75);
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
  Match.prototype.quirkDmgMul = function (c, target) {
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
    if (q.giant_slayer && target && target.sizeIdx > c.sizeIdx) m *= 1.18;
    if (q.home_guard && U.dist(c.x, c.y, M.teams[c.team].hoard.x, M.teams[c.team].hoard.y) < 320) m *= 1.15;
    if (q.duelist) {
      let foes = 0;
      for (const o of M.creatures) {
        if (o.dead || o.team === c.team || o.sp.tags.includes('passive')) continue;
        if (U.dist(c.x, c.y, o.x, o.y) < 220) { foes++; if (foes >= 2) break; }
      }
      m *= foes === 1 ? 1.15 : foes >= 2 ? 0.95 : 1; /* sharp alone, sloppy in a brawl */
    }
    return m;
  };

  /* ================= DAMAGE & DEATH ================= */
  Match.prototype.damage = function (t, amount, source, opts) {
    const M = this;
    if (t.dead || M.over) return;
    /* a rider up on its mount cannot be struck directly — blows land on the
       mount (whose riderProtect already softens them) */
    if (t.riding) return;
    /* an archer garrisoned inside a tower — or a builder sheltering in the Hut —
       cannot be struck at all; the structure must be destroyed first (occupants
       are freed when it collapses) */
    if (t.onTower || t.inHut) return;
    opts = opts || {};
    /* dodge — a Malsti Punk (80%) or Wild Punk weaves/blinks aside and takes
       nothing. Read the token's rolled stat, but fall back to a species floor
       so Punks minted BEFORE the dodge stat existed still dodge. Deterministic
       via the match rng (lockstep-safe). */
    let dodge = t.vars.dodge;
    if (dodge == null) dodge = t.speciesId === 'malsti_punk' ? 0.8 : t.speciesId === 'wild_punk' ? 0.4 : 0;
    if (t.speciesId === 'malsti_punk' && dodge < 0.8) dodge = 0.8;   // Malsti is always 80%
    if (dodge > 0 && M.rng.next() < dodge) {
      if (!opts.noAnim) M.addEffect('teleport', t.x, t.y - t.radius * 0.3, {});
      return;
    }
    M.lastCombatTick = M.tick;

    /* mitigations */
    let dmg = amount;
    if (t.vars.plateThickness) dmg /= t.vars.plateThickness;
    if (t.vars.shellDurability) dmg /= t.vars.shellDurability;
    if (t.vars.scarToughness) dmg *= 1 - t.vars.scarToughness * 0.5;
    if (t.vars.hairArmor && source && source.x < t.x === (t.facing > 0)) dmg *= 1 - t.vars.hairArmor; // back armor
    if (t.fortifiedUntil > M.tick) dmg *= 0.85;   // sheltered near a friendly tower
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
    /* a rider shields its mount from part of every blow */
    if (t.hasRider && t.riderProtect) dmg *= (1 - t.riderProtect);
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

    /* a heavy blow — 45%+ of max HP in one hit — jars a carried relic loose.
       (A killing blow drops it via kill(); this covers survivors.) */
    if (t.carryingRelic && t.hp > 0 && dmg >= t.maxHp * 0.45) M.dropRelic(t, 'hit');

    if (t.hp <= 0) M.kill(t, source, 'combat');
  };

  /* Release a carried relic where the carrier stands. Triggered on the
     carrier's death, a heavy blow (≥45% of max HP in one hit), or being
     stunned. Returns true if a relic was actually dropped. */
  Match.prototype.dropRelic = function (c, cause) {
    const M = this;
    if (!c.carryingRelic) return false;
    c.carryingRelic = false;
    const rl = M.relics.find(r => r.carrier === c.id);
    if (rl) {
      rl.carrier = null; rl.carrierTeam = null;
      rl.x = c.x; rl.y = c.y;
      const whose = rl.ownerTeam === 0 ? 'Your' : 'Their';
      const how = cause === 'stun' ? ' — ' + c.tokName + ' is stunned!'
        : cause === 'hit' ? ' — ' + c.tokName + ' reels from the blow!'
        : '';
      M.uiEvent(-1, 'relic', whose + ' Relic is dropped!' + how);
    }
    if (!M.headless) DYA.audio.play('relicDrop');
    return true;
  };

  Match.prototype.kill = function (c, source, cause) {
    const M = this;
    if (c.dead) return;
    c.dead = true; c.deadTick = M.tick; c.state = 'death';
    /* a mount that falls throws its rider clear; a rider that somehow dies
       frees its mount back to fighting on foot */
    if (c.riderUnit) M.dismountRider(c, true);
    if (c.mountedOn != null) { const mt = M.creatures.find(o => o.id === c.mountedOn); if (mt && mt.riderUnit === c) M.dismountRider(mt, false); }
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
    M.dropRelic(c, 'death');

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
    /* HUNT permadeath: a token that falls on the hunt is gone — it does not
       return to the pouch (no replay) and is reported so the hunt roster can
       retire it for the rest of the pursuit. */
    if (M.mode === 'hunt' && M.teams[c.team] && M.teams[c.team].controller !== 'wild' &&
        !c.isKofiSpawn && c.speciesId !== 'kofi' && c.speciesId !== 'sprengju') {
      const entry = M.teams[c.team].pouch.find(e => e.tok.id === c.tokId);
      if (entry) entry.state = 'dead';
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
      if (c.dead || c.riding) continue;   // a mounted rider rides with its mount — not tethered/separated on its own
      const nx = Math.abs(c.x - WORLD.w / 2) / (WORLD.w / 2 - 14);
      const ny = Math.abs(c.y - WORLD.h / 2) / (WORLD.h / 2 - 14);
      c.tetherFrac = Math.max(nx, ny);
      if (c.tetherFrac >= 0.995 && !c.rooted) { M.kill(c, null, 'tether'); M.uiEvent(-1, 'event', c.tokName + ' faded at the arena border.'); continue; }
      /* rodak-style regen intent */
      if (c.mem.regen && c.hp < c.maxHp) { c.hp = Math.min(c.maxHp, c.hp + c.mem.regen * 2 * TICK); }
      /* separation (cheap, every 4 ticks) */
      if ((M.tick + c.id) % 4 === 0 && !c.rooted) {
        for (const o of M.creatures) {
          if (o === c || o.dead || o.rooted || o.riding) continue;
          const d = U.dist(c.x, c.y, o.x, o.y), min = (c.radius + o.radius) * 0.8;
          if (d < min && d > 0.01) {
            const push = (min - d) / 2;
            c.x = U.clamp(c.x + (c.x - o.x) / d * push, 14, WORLD.w - 14);
            c.y = U.clamp(c.y + (c.y - o.y) / d * push, 14, WORLD.h - 14);
          }
        }
      }
    }

    /* ===== fortifications: walls block, towers garrison & fire, wards guard ===== */
    if (M.structures.length) {
      for (const s of M.structures) {
        if (s.hp <= 0) continue;
        if (s.type === 'wall') {
          const hw = (s.w || 22) / 2, hh = (s.h || 64) / 2;
          for (const c of M.creatures) {
            if (c.dead || c.team === s.team || c.rooted || c.onTower || c.inHut) continue;
            if (c.sp.tags.includes('flyer') || (c.sp.features && c.sp.features.hover)) continue; // flyers pass over
            if (c.speciesId === 'malsti_punk') {   // a Malsti Punk blinks through the wall via the Duat
              if (Math.abs(c.x - s.x) < hw + c.radius && Math.abs(c.y - s.y) < hh + c.radius && M.tick % 12 === 0) M.addEffect('teleport', c.x, c.y, {});
              continue;
            }
            const dx = c.x - s.x, dy = c.y - s.y;
            const px = (hw + c.radius) - Math.abs(dx), py = (hh + c.radius) - Math.abs(dy);
            if (px > 0 && py > 0) {                 // overlapping — shove out the short axis
              if (px < py) c.x = s.x + (dx < 0 ? -1 : 1) * (hw + c.radius);
              else c.y = s.y + (dy < 0 ? -1 : 1) * (hh + c.radius);
              c.x = U.clamp(c.x, 14, WORLD.w - 14); c.y = U.clamp(c.y, 14, WORLD.h - 14);
              if (s.trapped && M.tick >= (s.trapCd || 0)) {   // spiked wall: punish the presser
                s.trapCd = M.tick + Math.round(1.2 / TICK);
                c.hp -= 5 * (s.quality || 1) * (s.upgraded ? 1.5 : 1);
                c.buffs.push({ speedMul: 0.5, until: M.tick + Math.round(1.4 / TICK) });
                M.addEffect('hit', c.x, c.y, {});
                if (c.hp <= 0) M.kill(c, null, 'trap');
              }
              /* pressed against an enemy wall → it hacks at it to break through
                 (a real attack, not just the passive siege), unless it's hauling
                 the relic home — then it just gets shoved and slips around */
              if (c.dmg > 0 && !c.sp.tags.includes('passive') && !c.carryingRelic) {
                c.state = 'attack'; if (c.intent) c.intent.state = 'attack';
                c.facing = s.x >= c.x ? 1 : -1;
                if (c.attackCd <= 0) {
                  c.attackCd = 1 / ((c.vars && c.vars.tongueSpeed) || 1);
                  s.hp -= c.dmg * 1.3;
                  M.addEffect('hit', s.x + M.rng.range(-6, 6), s.y + M.rng.range(-6, 6), {});
                  if (s.hp <= 0) { s.hp = 0; M.freeOccupants(s); M.uiEvent(-1, 'event', 'A wall is breached.'); }
                }
              }
            }
          }
        } else if (s.kind === 'tower' || s.kind === 'cone') {
          /* keep garrisoned archers glued to the tower, and drop any that died
             or were freed; friendly shelter aura + camo reveal around it */
          if (s.occupants && s.occupants.length) {
            s.occupants = s.occupants.filter(id => {
              const o = M.creatures.find(cc => cc.id === id);
              if (!o || o.dead || o.onTower !== s.id) { if (o && o.onTower === s.id) o.onTower = null; return false; }
              return true;
            });
            s.occupants.forEach((id, i) => {
              const o = M.creatures.find(cc => cc.id === id);
              if (o) { o.x = s.x + (i - ((s.capacity - 1) / 2)) * 12; o.y = s.y - 18; }
            });
          }
          const aura = (s.radius || 40) + 46;
          for (const c of M.creatures) {
            if (c.dead) continue;
            const d = U.dist(c.x, c.y, s.x, s.y);
            if (d > aura) continue;
            if (c.team === s.team) c.fortifiedUntil = M.tick + 3;
            else if (c.camoUntil > M.tick && ((c.vars.camo || c.vars.stealth || 0) < 0.5)) c.camoUntil = M.tick;   // elevated sight only pierces light camo (<50)
          }
        } else if (s.kind === 'wallTower') {
          /* unmanned wall-tower: auto-fires base damage at the nearest foe in range */
          if (s.fireCd > 0) s.fireCd -= TICK;
          else {
            let best = null, bd = (s.range || 50) + 1;
            for (const c of M.creatures) {
              if (c.dead || c.team === s.team || c.onTower || c.riding || c.inHut) continue;
              const d = U.dist(s.x, s.y, c.x, c.y);
              if (d < bd && !M.losBlocked(s.x, s.y, c.x, c.y, s.team)) { bd = d; best = c; }
            }
            if (best) {
              s.fireCd = 1.3;
              const a = Math.atan2(best.y - s.y, best.x - s.x);
              M.projectiles.push({ x: s.x, y: s.y - 10, vx: Math.cos(a) * 440, vy: Math.sin(a) * 440, team: s.team, dmg: s.baseDmg || 5, type: 'arrow', life: (s.range || 50) / 440 + 0.05, source: null });
              M.markTowerAggro(best, s);   // a fighting flyer may turn and attack the tower shooting it
            }
          }
        }
        /* structures under siege: enemies pressed against them wear them down.
           The Hut and manned towers must be broken to reach who’s inside. */
        const reach = (s.radius || Math.max(s.w || 22, s.h || 40) / 2);
        let siege = 0;
        for (const c of M.creatures) {
          if (c.dead || c.team === s.team || c.onTower || c.inHut || c.sp.tags.includes('passive') || c.dmg <= 0) continue;
          if (U.dist(c.x, c.y, s.x, s.y) < reach + c.radius + 6) siege += c.dmg;
        }
        if (siege > 0) { s.hp -= siege * TICK * 0.5; if (s.hp <= 0) { s.hp = 0; M.freeOccupants(s); M.uiEvent(-1, 'event', 'A ' + (s.isHut ? 'Builder’s Hut' : s.kind === 'wallTower' ? 'wall-tower' : 'tower') + ' is torn down.'); } }
      }
      /* once a builder has sheltered in the Hut for a full pulse, upgrading is
         unlocked — the builders then sally out and upgrade each structure over
         build-time (handled in the Builder behavior), not instantly */
      for (const c of M.creatures) {
        if (c.dead || !c.inHut || c.sp.behavior !== 'builder') continue;
        if (c.mem.hutSincePulse != null && M.pulseIndex > c.mem.hutSincePulse && M.teams[c.team]) M.teams[c.team].upgradeUnlocked = true;
      }
      M.structures.forEach(s => { if (s.hp <= 0) M.freeOccupants(s); });
      M.structures = M.structures.filter(s => s.hp > 0);
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
      /* a pending ShurgrEdan strike (RubberMcFly retribution) must land
         before the duel can be called — it can turn a win into the tie */
      if (M._timeouts && M._timeouts.length) return;
      const alive0 = M.creatures.some(c => !c.dead && c.team === 0);
      const alive1 = M.creatures.some(c => !c.dead && c.team === 1);
      /* the ONLY tie a duel allows: a RubberMcFly was in play */
      const mcflyInPlay = M.teams.some(T => T.pouch.some(e => e.tok && e.tok.speciesId === 'rubbermcfly'));
      if (!alive0 && !alive1) {
        if (mcflyInPlay) { M.finish(-1, 'draw'); return; }
        M.finish(M.rng.chance(0.5) ? 0 : 1, 'duel'); // photo finish — the seed decides, never a draw
        return;
      }
      if (!alive0) { M.finish(1, 'duel'); return; }
      if (!alive1) { M.finish(0, 'duel'); return; }
      /* stalemate guard: two tokens that cannot reach or hurt each other
         (deliberate Pick-mode fruit, rooted standoffs) would otherwise
         stand forever. After 90s without combat the Guild calls it on
         condition — unless a RubberMcFly is in play, which is the one
         legal draw. */
      if (M.time > 90 && (M.tick - M.lastCombatTick) > Math.round(90 / TICK)) {
        if (mcflyInPlay) { M.finish(-1, 'draw'); return; }
        const frac = (team) => M.creatures.filter(c => !c.dead && c.team === team)
          .reduce((s, c) => s + c.hp / Math.max(1, c.maxHp), 0);
        const f0 = frac(0), f1 = frac(1);
        M.finish(f0 === f1 ? (M.rng.chance(0.5) ? 0 : 1) : (f0 > f1 ? 0 : 1), 'condition');
        return;
      }
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
    /* hunt roster bookkeeping: which of the player's (team 0) tokens fell and
       which are still standing — by token id, for cross-encounter permadeath */
    const t0 = M.teams[0];
    if (t0 && t0.pouch) {
      M.result.playerDeadTokIds = t0.pouch.filter(e => e.state === 'dead').map(e => e.tok.id);
      M.result.playerAliveTokIds = t0.pouch.filter(e => e.state !== 'dead').map(e => e.tok.id);
    }
    if (M.onFinish) M.onFinish(M.result);
  };

  /* ================= UI EVENTS ================= */
  /* segment vs forest-zone circles: forest patches block ranged targeting */
  Match.prototype.losBlocked = function (x1, y1, x2, y2, team) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    const nearest = (cx, cy) => { if (len2 < 1) return { x: x1, y: y1 }; let t = ((cx - x1) * dx + (cy - y1) * dy) / len2; t = Math.max(0, Math.min(1, t)); return { x: x1 + t * dx, y: y1 + t * dy }; };
    for (const z of this.zones) {
      if (z.type !== 'forest') continue;
      const p = nearest(z.x, z.y);
      if (U.dist(p.x, p.y, z.x, z.y) < z.r * 0.85) return true;
    }
    /* enemy walls give cover — a shot is blocked if it crosses one (own walls
       never block your own shooters) */
    if (team != null && this.structures) {
      for (const s of this.structures) {
        if (s.type !== 'wall' || s.hp <= 0 || s.team === team) continue;
        const p = nearest(s.x, s.y);
        if (Math.abs(p.x - s.x) < (s.w || 22) / 2 + 4 && Math.abs(p.y - s.y) < (s.h || 64) / 2 + 4) return true;
      }
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
      creaturesOf: (spid) => M.creatures.filter(c => c.speciesId === spid && !c.dead && !c.riding),
      /* dual relics: 'the relic' from a creature's point of view is the
         ENEMY's relic (the thing it can steal). */
      relic: (team) => {
        const t = team != null ? team : (api._c ? api._c.team : 0);
        return M.relics.find(r => r.ownerTeam !== t && !r.disabled) || { x: WORLD.w / 2, y: WORLD.h / 2, captured: true, disabled: true, carrier: null };
      },
      ownRelic: (team) => M.relics.find(r => r.ownerTeam === team && !r.disabled) || null,
      losBlocked: (x1, y1, x2, y2, team) => M.losBlocked(x1, y1, x2, y2, team),
      ownHoard: (team) => M.teams[team] ? M.teams[team].hoard : M.teams[0].hoard,
      enemyHoard: (team) => M.teams[1 - team] ? M.teams[1 - team].hoard : M.teams[0].hoard,
      teamRes: (team) => M.teams[team].resources,
      structuresOf: (team, type) => M.structures.filter(s => s.team === team && (!type || s.type === type) && s.hp > 0),
      rolesInProgress: (team) => M.creatures.filter(o => !o.dead && o.team === team && o.mem.building && o.mem.building.bp).map(o => o.mem.building.bp.role),
      storm: () => M.zikhron(),
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
        return M.creatures.filter(o => !o.dead && !o.riding && !o.onTower && !o.inHut && o.team !== c.team && o.team !== -1 &&
          !(o.camoUntil > M.tick && U.dist(c.x, c.y, o.x, o.y) > 34) &&
          U.dist(c.x, c.y, o.x, o.y) < range && !o.sp.tags.includes('inert'));
      },
      alliesNear(c, range) {
        return M.creatures.filter(o => !o.dead && !o.riding && o !== c && o.team === c.team && U.dist(c.x, c.y, o.x, o.y) < range);
      },
      allCreaturesNear(c, range) {
        return M.creatures.filter(o => !o.dead && !o.riding && o !== c && U.dist(c.x, c.y, o.x, o.y) < range);
      },
      nearestEnemy(c, range, filter) {
        let best = null, bd = 1e9;
        for (const o of M.creatures) {
          if (o.dead || o.riding || o.onTower || o.inHut || o.team === c.team || o.team === -1) continue;
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
        const smart = !!(c.sp.eikarLayer || c.sp.keiliaLayer || c.hasRider || c.sp.behavior === 'karnen' || c.speciesId === 'su_naga' || (c.vars.intelligence || 0) > 0.75);
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
        if (M.losBlocked(c.x, c.y, target.x, target.y, c.team)) return; // forest & enemy walls block the shot (§15)
        /* garrisoned in a tower: damage scales with the tower’s range bands —
           2.5× within CLOSE range, 1.5× within FAR range (3× close), and a cone
           tower can only fire within its forward arc. Upgrades double the power. */
        let towerMul = 1, reach = c.attackRange;
        if (c.onTower) {
          const tw = M.structures.find(s => s.id === c.onTower && s.hp > 0);
          if (tw) {
            const d = U.dist(tw.x, tw.y, target.x, target.y);
            if (tw.coneHalf != null) {
              const ang = Math.atan2(target.y - tw.y, target.x - tw.x);
              let diff = Math.abs(((ang - tw.coneDir + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
              if (diff > tw.coneHalf || d > (tw.coneRange || tw.far)) return;   // outside the cone
              towerMul = 2.5 * (tw.powerMul || 1); reach = tw.coneRange || tw.far;
            } else {
              if (d > tw.far) return;
              towerMul = (d <= tw.close ? 2.5 : 1.5) * (tw.powerMul || 1);
              reach = tw.far;
            }
          }
        }
        c.state = 'attack';
        c.facing = target.x >= c.x ? 1 : -1;
        const inTower = !!c.onTower;
        c.attackCd = (1.6 / (c.vars.drawSpeed || 1)) * (inTower ? 0.82 : 1);   // slightly faster fire from a tower
        if (!inTower) c.quiver--;                                              // a garrisoned archer never runs dry
        /* tower archers are more accurate: faster arrows and better target lead */
        const projSpeed = inTower ? 640 : 460, leadK = inTower ? 0.32 : 0.1;
        const mv = target.intent && target.intent.move;
        const tx = target.x + (mv ? (mv.x - target.x) * leadK : 0);
        const ty = target.y + (mv ? (mv.y - target.y) * leadK : 0);
        const a = Math.atan2(ty - c.y, tx - c.x);
        const airBonus = (target.sp.tags.includes('flyer') || target.element === 'Su') ? 1.35 : 1;
        M.projectiles.push({ x: c.x, y: c.y - c.radius, vx: Math.cos(a) * projSpeed, vy: Math.sin(a) * projSpeed, team: c.team, dmg: c.dmg * (c.vars.bowQuality || 1) * airBonus * towerMul, type: 'arrow', life: reach / projSpeed + 0.05, source: c });
        if (inTower && target.sp.tags.includes('flyer')) { const tw = M.structures.find(s => s.id === c.onTower && s.hp > 0); if (tw) M.markTowerAggro(target, tw); }
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
        /* a standing Relic Ward seals the relic — break it first */
        const ward = M.structures.find(s => s.type === 'ward' && s.team === rl.ownerTeam && s.hp > 0 && U.dist(s.x, s.y, rl.x, rl.y) < (s.radius || 66) + 30);
        if (ward) { if (c.team === 0 || M.tick % 40 === 0) M.uiEvent(c.team, 'deny', 'The Relic Ward holds — break it first.'); return; }
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
      /* the Duat raid: grabbing costs no time — the Malsti snatches a whole
         Duat-load at once (up to its varying capacity), weighted toward the
         colours the enemy's starting pouch leans on, then books it home. */
      stealResource(c) {
        c.intent.state = 'special';
        const T = M.teams[1 - c.team];
        if (!T || resTotal(T.resources) < 1) return;
        const cap = Math.max(1, Math.round(c.vars.duatCapacity || 4));
        const w = M.pouchElementWeights(1 - c.team);
        let grabbed = 0;
        while ((c.mem.stolen || 0) < cap && resTotal(T.resources) >= 1) {
          let tot = 0; const wt = ELS.map(e => { const v = T.resources[e] > 0 ? (w[e] || 0.001) : 0; tot += v; return v; });
          if (tot <= 0) break;
          let r = M.rng.next() * tot, el = ELS[0];
          for (let i = 0; i < ELS.length; i++) { r -= wt[i]; if (r <= 0) { el = ELS[i]; break; } }
          T.resources[el] -= 1;
          c.mem.stolenVec = c.mem.stolenVec || { Fti: 0, Su: 0, Eldi: 0, Ular: 0 };
          c.mem.stolenVec[el]++; c.mem.stolen = (c.mem.stolen || 0) + 1;
          M.teams[c.team].stats.stolen++; grabbed++;
        }
        if (grabbed) M.addEffect('steal', c.x, c.y, {});
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

      /* construction — the Builder’s fortification plan (roles, geometry and
         per-structure specs) is computed by M.builderBlueprints from the BEST
         builder on the field. A builder claims the next unbuilt blueprint and
         raises it here; walls, towers (manned), wall-towers (auto-firing),
         the cone tower and the Builder’s Hut are all realized by kind. */
      builderBlueprints: (team) => M.builderBlueprints(team),
      startBuild(c, bp) {
        if (M.mode === 'duel') return;   // no base-building in a 1v1 duel — the builder brawls instead
        /* legacy string form (only the Relic Ward still uses it) */
        if (typeof bp === 'string') {
          if (bp !== 'ward') return;
          const rl = M.relics.find(r => r.ownerTeam === c.team && !r.disabled);
          const own = M.teams[c.team].hoard;
          bp = { role: 'ward', kind: 'ward', x: rl ? rl.x : own.x, y: rl ? rl.y : own.y, spec: {} };
        }
        c.mem.building = { bp, progress: 0 };
      },
      continueBuild(c) {
        const b = c.mem.building;
        if (!b) return;
        const bp = b.bp;
        /* an upgrade job tracks the live structure (and takes the same build-time) */
        let tx = bp.x, ty = bp.y;
        if (bp.kind === 'upgrade') {
          const st = M.structures.find(s => s.id === bp.targetId && s.hp > 0);
          if (!st || st.upgraded) { c.mem.building = null; return; }
          tx = st.x; ty = st.y;
        }
        if (U.dist(c.x, c.y, tx, ty) > 40) { c.intent.move = { x: tx, y: ty, run: true }; return; }
        /* swing the hammer while working (state 'attack' animates the swing;
           it.state persists it across the decision window) */
        c.state = 'attack'; c.intent.state = 'attack'; c.facing = tx >= c.x ? 1 : -1;
        /* extra builders on the same job speed it up */
        const helpers = M.creatures.filter(o => !o.dead && o.team === c.team && o.mem.building && o.mem.building.bp && o.mem.building.bp.role === bp.role).length;
        b.progress += (c.vars.buildSpeed || 1) * TICK * (1 + 0.6 * (helpers - 1));
        if (M.tick % 7 === 0) M.addEffect('buff', tx + M.rng.range(-8, 8), ty - 6, {});   // hammer sparks
        if (b.progress >= 1) {
          if (bp.kind === 'upgrade') { const st = M.structures.find(s => s.id === bp.targetId && s.hp > 0); if (st) M.upgradeOne(st); }
          else if (!M.structures.some(s => s.team === c.team && s.role === bp.role && s.hp > 0)) M.raiseStructure(c, bp);
          c.mem.building = null;
        }
      },
      /* start a timed upgrade job on a specific structure (same duration as a build) */
      startUpgrade(c, s) { if (M.mode === 'duel') return; c.mem.building = { bp: { role: 'up:' + s.role, kind: 'upgrade', targetId: s.id, x: s.x, y: s.y }, progress: 0 }; },
      /* repair is HAMMER-WORK, not a heal: the builder swings on a cadence and
         each blow mends a chunk, so it reads exactly like building */
      repair(c, s) {
        c.state = 'attack'; c.intent.state = 'attack'; c.facing = s.x >= c.x ? 1 : -1;
        if (c.attackCd <= 0) {
          c.attackCd = 0.7 / (c.vars.buildSpeed || 1);
          s.hp = Math.min(s.maxHp, s.hp + (c.vars.repairSpeed || 1) * 18);
          M.addEffect('buff', s.x + M.rng.range(-8, 8), s.y - 6, {});   // spark on each blow
        }
      },
      demolish(c, s) {
        c.state = 'attack';
        if (c.attackCd <= 0) { c.attackCd = 1; s.hp -= c.dmg * 1.5; if (s.hp <= 0) { M.freeOccupants(s); M.structures = M.structures.filter(x => x !== s); } }
      },
      /* an archer garrisons a manned tower (up to its capacity); it is then
         untargetable and shoots with the tower’s range/damage multipliers */
      mountTower(c, s) {
        s.occupants = s.occupants || [];
        if (s.occupants.length >= (s.capacity || 1) || s.occupants.includes(c.id)) return;
        s.occupants.push(c.id);
        c.onTower = s.id;
        c.quiver = Math.max(c.quiver || 0, Math.round((c.vars && c.vars.quiver) || 20));   // the tower keeps the garrison supplied
        const slot = s.occupants.length - 1, spread = (slot - ((s.capacity - 1) / 2)) * 12;
        c.x = s.x + spread; c.y = s.y - 18;
        if (M.teams[c.team]) M.teams[c.team].stats.combos['Builder’s tower manned'] = true;
      },
      towerFull: (team) => M.structuresList(team).filter(s => (s.kind === 'tower' || s.kind === 'cone') && (s.occupants ? s.occupants.length : 0) < (s.capacity || 1)),
      /* the Builder’s Hut: a builder shelters inside, sallies out to repair when
         the threat clears, and — after a full pulse inside — upgrades everything */
      enterHut(c, hut) {
        c.inHut = hut.id; c.onTower = null;
        c.x = hut.x; c.y = hut.y;
        if (c.mem.hutSincePulse == null) c.mem.hutSincePulse = M.pulseIndex;
        if (M.teams[c.team]) M.teams[c.team].stats.combos['Builder’s Hut raised'] = true;
      },
      leaveHut(c) { c.inHut = null; c.mem.hutSincePulse = null; },
      fortLevel: (team) => M.fortLevel(team),
      upgradeReady: (team) => M.upgradeReady(team),
      pendingUpgrades: (team) => M.pendingUpgrades(team),

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

    /* ---------- read the field ---------- */
    const myCreatures = M.creatures.filter(c => !c.dead && c.team === T.idx);
    const enemyCreatures = M.creatures.filter(c => !c.dead && c.team === 1 - T.idx);
    const own = T.hoard, enemy = M.teams[1 - T.idx].hoard;
    const myRelic = M.relics.find(r => r.ownerTeam === T.idx);
    const enemyRelic = M.relics.find(r => r.ownerTeam !== T.idx);
    /* the thief: an enemy creature carrying MY relic home */
    const thief = myRelic && myRelic.carrier != null ? M.creatures.find(c => c.id === myRelic.carrier && !c.dead) : null;
    /* my carrier: my creature hauling THEIR relic toward my hoard */
    const myCarrier = enemyRelic && enemyRelic.carrier != null ? M.creatures.find(c => c.id === enemyRelic.carrier && !c.dead && c.team === T.idx) : null;
    const enemyRelicFree = enemyRelic && enemyRelic.carrier == null && !enemyRelic.captured && !enemyRelic.disabled;
    const relicDropped = myRelic && !myRelic.disabled && myRelic.carrier == null && U.dist(myRelic.x, myRelic.y, myRelic.homeX, myRelic.homeY) > 40;
    const hoardThreats = enemyCreatures.filter(c => U.dist(c.x, c.y, own.x, own.y) < 360);
    const homeGuards = myCreatures.filter(c => U.dist(c.x, c.y, own.x, own.y) < 360);
    const fielded = (c) => !c.sp.tags.includes('passive') && c.sp.attackRange > 0;
    const fighters = myCreatures.filter(fielded);
    const isRunnerSp = (sp) => sp.tags.includes('thief') || sp.tags.includes('sentient');
    const haveRunner = myCreatures.some(c => isRunnerSp(c.sp));
    /* how thick is the guard around their relic? Runners are wasted
       against a wall — count before committing one */
    const relicGuards = enemyRelic ? enemyCreatures.filter(c => fielded(c) && U.dist(c.x, c.y, enemyRelic.homeX, enemyRelic.homeY) < 260).length : 9;
    const runnerInHand = T.readied.some(e => isRunnerSp(SP.get(e.tok.speciesId)));
    const urgent = !!thief || hoardThreats.length > homeGuards.length;

    /* skilled keepers read the field faster — and snap to attention the
       moment their relic starts moving */
    const base = U.lerp(6, 1.6, Math.min(1, skill)) + T.aiRng.range(0, 2);
    T.aiMem.nextThink = M.time + (urgent ? base * 0.45 : base);
    /* placement discipline: sloppy hands scatter, good hands are exact */
    const jit = U.lerp(150, 45, Math.min(1, skill));
    const passiveSp = (sp) => sp.tags.includes('passive') || !sp.attackRange;

    /* ---------- 1. trigger a readied token where it matters ---------- */
    const triggerable = T.readied.map((e, i) => ({ e, i })).filter(x => x.e.readiedAtPulse < M.pulseIndex);
    if (triggerable.length) {
      /* choose the token best suited to the moment, not just the oldest */
      const suit = (x) => {
        const sp = SP.get(x.e.tok.speciesId);
        let s = T.aiRng.range(0, 1);
        if (thief && !passiveSp(sp)) s += (x.e.tok.stats.speed || 40) / 30;       // interceptors want legs
        /* a runner shines against a thin guard; against a wall, send
           fighters first and keep the runner in hand */
        if (enemyRelicFree && isRunnerSp(sp)) s += relicGuards <= 1 ? 3 : 0.5;
        if (enemyRelicFree && runnerInHand && relicGuards >= 2 && !passiveSp(sp) && !isRunnerSp(sp)) s += 1.4;
        if (hoardThreats.length && (sp.tags.includes('apex') || sp.statMul.dmg >= 1.3)) s += 1.6;
        if (sp.behavior === 'sprengju' && fighters.length) s += 1.2;              // a fruit is only worth placing beside a fighter
        if (passiveSp(sp) && (thief || hoardThreats.length)) s -= 2;              // no fruit in a crisis
        return s;
      };
      const pick = triggerable.sort((a, b) => suit(b) - suit(a))[0];
      const sp = SP.get(pick.e.tok.speciesId);
      let x, y;
      if (M.mode === 'hunt' && enemyCreatures.length) {
        const q = enemyCreatures.find(e => e.isBoss) || enemyCreatures[0];
        x = q.x + T.aiRng.range(-160, 160); y = q.y + T.aiRng.range(-160, 160);
      } else if (thief && !passiveSp(sp) && T.aiRng.chance(0.45 + skill * 0.45)) {
        /* cut the thief off AHEAD, on its road home — not where it was */
        const lead = U.lerp(0.15, 0.45, Math.min(1, skill));
        x = thief.x + (enemy.x - thief.x) * lead + T.aiRng.range(-jit * 0.5, jit * 0.5);
        y = thief.y + (enemy.y - thief.y) * lead + T.aiRng.range(-jit * 0.5, jit * 0.5);
      } else if (relicDropped && !passiveSp(sp) && T.aiRng.chance(0.35 + skill * 0.4)) {
        x = myRelic.x + T.aiRng.range(-50, 50); y = myRelic.y + T.aiRng.range(-50, 50); // stand over the dropped relic
      } else if (hoardThreats.length > homeGuards.length && !passiveSp(sp)) {
        const t2 = T.aiRng.pick(hoardThreats);
        x = own.x + (t2.x - own.x) * 0.5 + T.aiRng.range(-jit * 0.6, jit * 0.6);   // meet raiders halfway
        y = own.y + (t2.y - own.y) * 0.5 + T.aiRng.range(-jit * 0.6, jit * 0.6);
      } else if (myCarrier && !passiveSp(sp) && T.aiRng.chance(skill * 0.75)) {
        x = myCarrier.x + (own.x - myCarrier.x) * 0.3 + T.aiRng.range(-70, 70);    // screen the carrier's road home
        y = myCarrier.y + (own.y - myCarrier.y) * 0.3 + T.aiRng.range(-70, 70);
      } else if (enemyRelicFree && isRunnerSp(sp) && (relicGuards <= 1 || T.aiRng.chance(0.3))) {
        x = enemyRelic.homeX + T.aiRng.range(-jit, jit); y = enemyRelic.homeY + T.aiRng.range(-jit, jit); // the guard is thin — raid NOW
      } else if (enemyRelicFree && !passiveSp(sp) && homeGuards.length > 0 && T.aiRng.chance(skill * 0.5) &&
                 (runnerInHand && relicGuards >= 2 ||
                  myCreatures.some(c => isRunnerSp(c.sp) && U.dist(c.x, c.y, enemyRelic.homeX, enemyRelic.homeY) < 430))) {
        /* muscle for the raid: a runner is poised (in hand or at their
           gates) but the guard is thick — send fighters to crack it.
           Never strips the last guard off the home hoard. */
        x = enemyRelic.homeX + T.aiRng.range(-170, 170); y = enemyRelic.homeY + T.aiRng.range(-170, 170);
      } else if (!passiveSp(sp) && homeGuards.length === 0 && myCreatures.length >= 2 && T.aiRng.chance(skill * 0.5)) {
        /* an empty hoard is a free steal — keep a garrison */
        x = own.x + T.aiRng.range(60, 150) * (enemy.x > own.x ? 1 : -1); y = own.y + T.aiRng.range(-120, 120);
      } else if (sp.behavior === 'sprengju' && fighters.length) {
        /* buffs land beside the biggest friendly bruiser */
        const champ = fighters.sort((a, b) => (b.hp * b.dmg) - (a.hp * a.dmg))[0];
        x = champ.x + T.aiRng.range(-36, 36); y = champ.y + T.aiRng.range(-36, 36);
      } else if (sp.id === 'sprengju_shaving' && myCreatures.some(c => c.speciesId === 'ju_field')) {
        const ju = myCreatures.find(c => c.speciesId === 'ju_field');
        x = ju.x + T.aiRng.range(-40, 40); y = ju.y + T.aiRng.range(-40, 40);      // wake the Ju Field
      } else if (sp.id === 'ju_field' && myCreatures.some(c => c.speciesId === 'sprengju_shaving')) {
        const sh = myCreatures.find(c => c.speciesId === 'sprengju_shaving');
        x = sh.x + T.aiRng.range(-40, 40); y = sh.y + T.aiRng.range(-40, 40);
      } else if (sp.tags.includes('stationary') || sp.behavior === 'archer_unit' || sp.behavior === 'grothyn') {
        x = own.x + (enemy.x - own.x) * 0.28 + T.aiRng.range(-60, 60); y = own.y + T.aiRng.range(-200, 200); // defensive line
      } else if (enemyCreatures.length && T.aiRng.chance(0.5)) {
        const target = T.aiRng.pick(enemyCreatures);
        x = target.x + T.aiRng.range(-70, 70); y = target.y + T.aiRng.range(-70, 70); // contest
      } else {
        /* advance — good keepers push the relic lane, not the wings */
        x = own.x + (enemy.x - own.x) * T.aiRng.range(0.3, 0.65);
        y = U.lerp(T.aiRng.range(200, WORLD.h - 200), WORLD.h / 2 + T.aiRng.range(-160, 160), Math.min(1, skill));
      }
      M.queueInput(T.idx, { type: 'trigger', slot: pick.i, x: U.clamp(x, 40, WORLD.w - 40), y: U.clamp(y, 40, WORLD.h - 40) });
      /* a crisis gets both hands: skilled keepers slam a second token
         down in the same breath when the relic or hoard is in danger */
      if (urgent && skill > 0.75 && triggerable.length > 1) {
        const second = triggerable.filter(x => x !== pick && !passiveSp(SP.get(x.e.tok.speciesId)))
          .sort((a, b) => suit(b) - suit(a))[0];
        if (second) {
          const tx = thief ? thief.x : (hoardThreats[0] ? own.x + (hoardThreats[0].x - own.x) * 0.5 : own.x + 120);
          const ty = thief ? thief.y : (hoardThreats[0] ? own.y + (hoardThreats[0].y - own.y) * 0.5 : own.y);
          /* slots shift after the first trigger applies — queued same tick,
             applied in seq order, so adjust the index for the removal */
          const slot2 = second.i > pick.i ? second.i - 1 : second.i;
          M.queueInput(T.idx, { type: 'trigger', slot: slot2, x: U.clamp(tx + T.aiRng.range(-60, 60), 40, WORLD.w - 40), y: U.clamp(ty + T.aiRng.range(-60, 60), 40, WORLD.h - 40) });
        }
      }
      /* no early return — a sharp keeper readies the next token the same breath */
    }

    /* ---------- 2. ready the token the situation asks for ---------- */
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
        const pouchHas = (id) => T.pouch.some(e => e.state === 'pouch' && e.tok.speciesId === id);
        const fieldHas = (id) => myCreatures.some(c => c.speciesId === id);
        const need = (x) => {
          const sp = SP.get(x.e.tok.speciesId);
          let s = 2 + x.e.tok.rarity * 0.5 + T.aiRng.range(0, 1.5);
          if (passiveSp(sp)) {
            s -= 3; /* a non-fighter is dead weight… */
            if (sp.behavior === 'sprengju' && fighters.length) s += 3.4;                     // …unless it feeds a fighter
            if (sp.id === 'sprengju_shaving' && (fieldHas('ju_field') || pouchHas('ju_field'))) s += 4.2; // …or wakes a Ju Field
            if (sp.id === 'ju_field' && (fieldHas('sprengju_shaving') || pouchHas('sprengju_shaving'))) s += 4.2;
            if (sp.id === 'karnen') s += 2.6;                                                // …or works the economy
            if (sp.id === 'rubbermcfly') s += 1.6;                                           // …or hums out resources
          }
          if ((sp.tags.includes('thief') || sp.tags.includes('sentient')) && enemyRelicFree) s += haveRunner ? 1.4 : 3.5; /* sentients raid in numbers */
          if ((sp.tags.includes('apex') || sp.statMul.dmg >= 1.4) && (hoardThreats.length || enemyCreatures.length > myCreatures.length)) s += 2.6;
          if (sp.tags.includes('stationary') && hoardThreats.length) s += 1.4;
          if (thief && !passiveSp(sp) && (x.e.tok.stats.speed || 0) > 50) s += 1.8;          // legs for the chase
          if ((x.e.deaths || 0) > 1) s -= x.e.deaths * 0.6;                                  // stop feeding a dying horse
          return s;
        };
        const ranked = affordable.map(x => ({ x, s: need(x) })).sort((a, b) => b.s - a.s);
        /* patience: a good keeper saves toward a heavy hitter instead of
           spending every pulse on chaff — never while under attack */
        if (skill > 0.6 && !urgent && ranked[0].s < 4.2 && T.aiRng.chance((skill - 0.6) * 1.1)) {
          const total = resTotal(T.resources);
          const heavy = T.pouch.some(e => {
            if (e.state !== 'pouch' || e.tok.rarity < 3) return false;
            const c = TK.costVec(e.tok);
            const missing = ELS.reduce((s2, el) => s2 + Math.max(0, (c[el] || 0) - T.resources[el]), 0);
            return missing > 0 && missing <= Math.max(2, (M.settings.pulseAmount || 2));
          });
          if (heavy && total < 14) return; /* hold the purse one pulse */
        }
        const choice = T.aiRng.chance(Math.min(0.92, 0.25 + skill * 0.6)) ? ranked[0].x : T.aiRng.pick(affordable);
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
