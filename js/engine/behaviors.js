/* ============================================================
   DYA'AKARA — engine/behaviors.js
   Creature decision trees (Master Design Doc, Part VI).
   Every creature evaluates its tree in priority order on each
   decision tick. Per-individual variables (token traits) modify
   thresholds and outputs — never the tree structure itself.

   Each behavior: fn(c, api) → sets c's intent via api calls.
   ============================================================ */
(function () {
  'use strict';
  const B = {};

  /* ---------- shared helpers ---------- */
  function threat(c, o) {
    // rough threat score of o against c
    return (o.sizeIdx + 1) * (1 + o.dmg / 20) / (c.sizeIdx + 1);
  }
  function preyInstinctTarget(c, api) {
    // Part VII: every carnivore/omnivore chases spawned Kofi, any team
    if (!c.sp.tags.includes('carnivore') && !c.sp.tags.includes('omnivore')) return null;
    if (c.vars.preyThreshold && c.vars.preyThreshold > 1.6 && api.rng.chance(0.6)) return null; // high-selectivity predators may resist
    const kofis = api.creaturesOf('kofi').filter(k => !k.dead && api.dist(c, k) < 260);
    if (!kofis.length) return null;
    kofis.sort((a, b) => api.dist(c, a) - api.dist(c, b));
    return kofis[0];
  }
  function fleeThreats(c, api, range) {
    const threats = api.enemiesNear(c, range || 140).filter(o => threat(c, o) > 1.1);
    if (!threats.length) return false;
    let fx = 0, fy = 0;
    threats.forEach(o => { fx += c.x - o.x; fy += c.y - o.y; });
    api.moveToward(c, c.x + fx, c.y + fy, true);
    return true;
  }
  function attackedRecently(c, api) { return c.lastHitTick != null && api.tick - c.lastHitTick < 60; }

  /* ================= PUNK FAMILY ================= */

  B.domestic_punk = function (c, api) {
    // passive water breath: handled by engine (breathTier pulses Su resource)
    const attacker = attackedRecently(c, api) && c.lastAttacker && !c.lastAttacker.dead ? c.lastAttacker : null;
    if (attacker && api.dist(c, attacker) < c.vars.vineLength * 1.4) { api.attack(c, attacker); return; }
    const near = api.nearestEnemy(c, c.vars.vineLength);
    if (near) {
      if (threat(c, near) > (1.6 - c.vars.aggressionThreshold)) { api.attack(c, near); return; } // aggression threshold crossed
      api.guard(c); return; // defensive posture, vine ready — does not strike first
    }
    // packmate/bonded under attack nearby → interpose
    const ally = api.alliesNear(c, 200).find(a => attackedRecently(a, api) && a.lastAttacker && !a.lastAttacker.dead);
    if (ally) {
      const th = ally.lastAttacker;
      api.moveToward(c, (ally.x + th.x) / 2, (ally.y + th.y) / 2, true);
      if (api.dist(c, th) < c.vars.vineLength) api.attack(c, th);
      return;
    }
    const spotted = api.nearestEnemy(c, 220);
    if (spotted && c.vars.aggressionThreshold > 0.65) { api.moveToward(c, spotted.x, spotted.y, false); return; }
    // follow/stay near bonded tokens, patrol loosely
    const friend = api.alliesNear(c, 400).filter(a => a.sp.tags.includes('sentient'))[0];
    if (friend && api.dist(c, friend) > 90) { api.moveToward(c, friend.x, friend.y, false); return; }
    api.patrol(c, 60);
  };

  B.wild_punk = function (c, api) {
    const inTerritory = api.dist(c, { x: c.homeX, y: c.homeY }) < c.vars.territory;
    const attacker = attackedRecently(c, api) && c.lastAttacker && !c.lastAttacker.dead ? c.lastAttacker : null;
    if (attacker) {
      if (!inTerritory || threat(c, attacker) > 1.8) { fleeThreats(c, api, 240); return; } // flee, no engagement
      // fight while fleeing — vine-strike while retreating, always moving
      api.moveAway(c, attacker.x, attacker.y, true);
      if (api.dist(c, attacker) < c.vars.vineLength * 1.3) api.attack(c, attacker, true);
      return;
    }
    const intruder = api.nearestEnemy(c, c.vars.territory);
    if (inTerritory && intruder) {
      if (threat(c, intruder) > 1.8) { fleeThreats(c, api, 300); return; }
      if (!c.mem.warned || api.tick - c.mem.warned > 100) { c.mem.warned = api.tick; api.posture(c, intruder); return; } // warn first
      api.attack(c, intruder, true); // strike once and retreat
      api.moveAway(c, intruder.x, intruder.y, true);
      return;
    }
    const smaller = api.nearestEnemy(c, 120, o => o.sizeIdx < c.sizeIdx);
    if (smaller) { api.attack(c, smaller); return; } // hoarder instinct — drive it off
    api.forage(c); // never idle
  };

  B.malsti_punk = function (c, api) {
    const hoard = api.enemyHoard(c.team);
    // imprint target threatened → only override
    const imprint = c.mem.imprintId != null ? api.byId(c.mem.imprintId) : null;
    if (imprint && !imprint.dead && attackedRecently(imprint, api)) {
      api.moveToward(c, imprint.x, imprint.y, true);
      const th = imprint.lastAttacker;
      if (th && !th.dead && api.dist(c, th) < 50) api.attack(c, th);
      return;
    }
    // threatened by Vel or larger → teleport away
    const bigThreat = api.enemiesNear(c, 70).find(o => o.sizeIdx >= 2);
    if (bigThreat && api.canTeleport(c)) { api.teleport(c, hoard.x + api.rng.range(-120, 120), hoard.y + api.rng.range(-120, 120)); return; }
    // carrying stolen resources → stash / deposit
    if (c.mem.stolen > 0 && c.mem.stolen >= c.vars.duatCapacity) {
      const own = api.ownHoard(c.team);
      api.moveToward(c, own.x, own.y, true);
      if (api.dist(c, own) < 60) { api.depositStolen(c); }
      return;
    }
    // at enemy hoard → steal + disrupt
    if (api.dist(c, hoard) < 90) {
      api.stealResource(c);
      const guard = api.nearestEnemy(c, 90);
      if (guard && guard.sizeIdx <= 1) api.attack(c, guard);
      return;
    }
    // enemy hoard in range → go straight to it (primary objective)
    api.moveToward(c, hoard.x, hoard.y, true);
    // harass litk/mael creatures en route
    const small = api.nearestEnemy(c, 60, o => o.sizeIdx <= 1);
    if (small) api.attack(c, small);
  };

  /* ================= CREATURES ================= */

  B.gynge = function (c, api) {
    const aware = api.enemiesNear(c, c.vars.awarenessRadius).concat(api.alliesNear(c, c.vars.awarenessRadius * 0.5));
    if (!aware.length) { api.sleep(c); return; } // return to dormant
    api.wake(c);
    const prey = api.nearestEnemy(c, c.attackRange, o => o.sizeIdx <= c.sizeIdx - 1);
    if (prey) { api.attack(c, prey); return; } // open mouth and strike
    api.guard(c);
  };

  B.kofi = function (c, api) {
    if (fleeThreats(c, api, 160)) return;
    api.forage(c);
  };

  B.big_momma_kofi = function (c, api) {
    if (c.phase !== 'mobile') {
      // breeding phase: stationary; engine spawns a Kofi per pulse; absorbs damage, never fights
      api.hold(c);
      if (api.time - c.spawnTime > c.vars.breedingDuration) { c.phase = 'mobile'; }
      return;
    }
    if (fleeThreats(c, api, 200)) return; // mobile: flees, never fights
    api.forage(c);
  };

  B.stryx = function (c, api) {
    // rooted at deployment; engine handles nutrient absorption per pulse
    const inRange = api.nearestEnemy(c, c.vars.reach);
    if (inRange && threat(c, inRange) > (1.5 - c.vars.territorialAggression)) {
      if (c.picks.vineCapability !== 'nothing') { api.attack(c, inRange); return; }
    }
    const watching = api.enemiesNear(c, 160).length;
    if (watching) { api.guard(c); return; }
    api.sleep(c);
  };

  B.rodak = function (c, api) {
    // pack retreats and recovers when injured
    if (c.hp < c.maxHp * 0.6) {
      c.mem.recovering = true;
    }
    if (c.mem.recovering) {
      if (c.hp >= c.maxHp * 0.95) { c.mem.recovering = false; }
      else { fleeThreats(c, api, 400) || api.moveToward(c, c.homeX, c.homeY, true); api.regen(c, c.vars.recovery); return; }
    }
    if (attackedRecently(c, api)) { fleeThreats(c, api, 400); return; } // anything aggressive → retreat immediately
    // near-death creature within detection range → converge (regardless of team)
    const dying = api.allCreaturesNear(c, c.vars.detectRange).find(o => o !== c && !o.dead && o.hp < o.maxHp * c.vars.preyThreshold);
    if (dying) { api.attack(c, dying); return; }
    const passive = api.nearestEnemy(c, c.vars.detectRange * 0.7, o => (o.sp.tags.includes('passive') || o.sp.behavior === 'kofi' || o.sp.behavior === 'mikolo_moko') && o.dmg < 4);
    if (passive) { api.attack(c, passive); return; }
    api.patrol(c, 80);
  };

  B.inert = function (c, api) { api.hold(c); };

  B.albali_byrd = function (c, api) {
    const tree = api.creaturesOf('albali_aagac').find(t => t.team === c.team && !t.dead);
    const guardPos = tree ? { x: tree.x, y: tree.y } : api.ownHoard(c.team); // hoard = home tree by default
    // Fti Naga heightened alert — no Fti Naga token at launch, the fear waits.
    const attacker = attackedRecently(c, api) && c.lastAttacker && !c.lastAttacker.dead ? c.lastAttacker : null;
    if (attacker) { api.attack(c, attacker); return; } // horn strike, film applies on contact
    const intruder = api.nearestEnemy(c, 170);
    if (intruder) {
      const d = api.dist(intruder, guardPos);
      if (d < 200) {
        if (threat(c, intruder) > 1.2 || intruder.sizeIdx >= c.sizeIdx) { api.attack(c, intruder); return; }
        if (!c.mem.postured || api.tick - c.mem.postured > 120) { c.mem.postured = api.tick; api.posture(c, intruder); return; }
        api.attack(c, intruder); return;
      }
    }
    if (api.dist(c, guardPos) > 70) { api.moveToward(c, guardPos.x, guardPos.y, false); return; }
    api.guard(c); // calm
  };

  B.albali_villtur = function (c, api) {
    const target = api.nearestEnemy(c, 260);
    if (target) { api.attack(c, target); return; }
    api.patrol(c, 140);
  };

  B.sru_vorn = function (c, api) {
    // being attacked → swat the attacker, prey threshold or not
    if (attackedRecently(c, api) && c.lastAttacker && !c.lastAttacker.dead) { api.attack(c, c.lastAttacker, false, true); return; }
    // prey in bog trap → close and finish
    const trapped = api.nearestEnemy(c, c.vars.territory, o => api.inBog(o));
    if (trapped) { api.attack(c, trapped); return; }
    const prey = api.nearestEnemy(c, c.vars.territory, o => o.sizeIdx + 1 >= c.vars.preyThreshold);
    if (prey) {
      c.mem.chaseStart = c.mem.chaseStart || api.time;
      if (api.time - c.mem.chaseStart < c.vars.patience) { api.attack(c, prey, false, true); return; } // ambush burst
      c.mem.chaseStart = null; // patience expired
    } else c.mem.chaseStart = null;
    const overwhelming = api.enemiesNear(c, 120).filter(o => threat(c, o) > 1.8);
    if (overwhelming.length) { api.moveToward(c, c.homeX, c.homeY, false); return; } // calculated retreat into bog
    // downtime: cultivate bog traps
    if (api.rng.chance(0.02 * c.vars.bogActivity)) api.buildBog(c);
    api.lazyHold(c);
  };

  B.ular_naga = function (c, api) {
    // another Ular Naga → dominance assessment
    const rival = api.creaturesOf('ular_naga').find(o => o !== c && !o.dead);
    if (rival) {
      const myDom = c.vars.dominance * (c.headsLeft || 1) * (c.sizeIdx + 1);
      const theirDom = rival.vars.dominance * (rival.headsLeft || 1) * (rival.sizeIdx + 1);
      if (myDom < theirDom * 0.95 && api.dist(c, rival) < 260) { api.moveAway(c, rival.x, rival.y, false); c.mem.yielding = true; return; }
    }
    const targets = api.allCreaturesNear(c, 200 + c.sizeIdx * 30).filter(o => o !== c && !o.dead && o.speciesId !== 'ular_naga');
    if (targets.length) {
      // tactical intelligence chooses nearest vs most threatening
      targets.sort((a, b) => c.vars.tacticalIntelligence > 0.5
        ? threat(c, b) - threat(c, a)
        : api.dist(c, a) - api.dist(c, b));
      api.attack(c, targets[0], false, false, true); // may use breath
      return;
    }
    api.patrol(c, 40 + c.sizeIdx * 15); // increasingly territorial with age
  };

  B.kipsu = function (c, api) {
    // Vyrenalur override would go here — no Vyrenalur token exists at launch.
    const packmates = api.alliesNear(c, 300).filter(o => o.speciesId === 'kipsu');
    const packTh = packmates.find(p => attackedRecently(p, api) && p.lastAttacker && !p.lastAttacker.dead);
    if (packTh) { api.attack(c, packTh.lastAttacker); return; } // pack aggression
    if (attackedRecently(c, api)) {
      if (c.vars.confidence + c.sizeIdx * 0.15 > 0.75 && c.lastAttacker && !c.lastAttacker.dead) { api.attack(c, c.lastAttacker); return; } // bold ones hold ground
      fleeThreats(c, api, 220); return;
    }
    const sep = packmates[0];
    if (sep && api.dist(c, sep) > 160) { api.moveToward(c, sep.x, sep.y, false); return; }
    const small = api.nearestEnemy(c, 100, o => o.sizeIdx < c.sizeIdx && o.dmg < 5);
    if (small && c.vars.troublemaker > 0.5) { api.attack(c, small); return; } // bother it
    api.wanderCurious(c);
  };

  B.rubbermcfly = function (c, api) {
    api.forage(c); // wanders freely. no reaction to anything, ever.
    // resource generation & retribution handled by engine
  };

  B.lutut = function (c, api) {
    const juvenile = c.picks.stage === 'juvenile';
    if (juvenile) {
      const prey = api.nearestEnemy(c, 200, o => o.sizeIdx <= 1);
      if (prey) { api.attack(c, prey); return; }
      if (fleeThreats(c, api, 160)) return;
      api.patrol(c, 100); return;
    }
    // flying adult
    const rivalLutut = api.creaturesOf('lutut').find(o => o !== c && !o.dead);
    const prey = api.nearestEnemy(c, 320, o => o.sizeIdx + 1 >= c.vars.preyThreshold && o.speciesId !== 'lutut');
    if (rivalLutut && prey && api.dist(rivalLutut, prey) < 220) { api.attack(c, rivalLutut); return; } // compete, usually to the death
    if (prey) {
      if (!prey.stunnedUntil || prey.stunnedUntil < api.tick) {
        if (api.offCooldown(c, 'screech')) { api.screech(c, prey); return; }
      }
      api.attack(c, prey, false, true); // dive and close
      return;
    }
    if (attackedRecently(c, api) && c.lastAttacker && !c.lastAttacker.dead) {
      if (api.offCooldown(c, 'screech')) api.screech(c, c.lastAttacker);
      api.moveAway(c, c.lastAttacker.x, c.lastAttacker.y, true);
      return;
    }
    api.circle(c); // patrol at altitude
  };

  B.hvaleia = function (c, api) {
    const smalls = api.enemiesNear(c, c.vars.jetRange).filter(o => o.sizeIdx <= 1);
    if (smalls.length && api.offCooldown(c, 'jet')) { api.jetBlast(c, smalls); return; }
    const big = api.nearestEnemy(c, 180, o => o.sizeIdx >= 2);
    if (big) { api.attack(c, big); return; } // tail club
    const pod = api.alliesNear(c, 400).filter(o => o.speciesId === 'hvaleia');
    const anyPrey = api.nearestEnemy(c, 420);
    if (anyPrey) {
      if (pod.length && c.vars.tacticalIntelligence > 0.5) {
        // coordinate: approach from opposite side
        api.moveToward(c, anyPrey.x + (c.x > anyPrey.x ? 80 : -80), anyPrey.y, false);
      } else api.moveToward(c, anyPrey.x, anyPrey.y, false);
      return;
    }
    api.patrol(c, 160); // always moving, never idle
  };

  B.grothyn = function (c, api) {
    // elemental temperament modifies step-1 threshold only
    const thresholds = { ular_grothyn: 0.5, su_grothyn: 0.85, eldi_grothyn: 0.15 };
    const thr = thresholds[c.speciesId] != null ? thresholds[c.speciesId] : 0.5;
    if (attackedRecently(c, api) && c.lastAttacker && !c.lastAttacker.dead) { api.breath(c, c.lastAttacker); return; }
    const preyClose = api.nearestEnemy(c, c.vars.reach);
    if (preyClose) { api.attack(c, preyClose); api.breath(c, preyClose); return; } // vine AND breath simultaneously
    const preyFar = api.nearestEnemy(c, c.vars.detectRange);
    if (preyFar) {
      // provocation threshold: Eldi fires readily at anything detected, Su waits until truly provoked
      if (api.rng.chance(1 - thr) && api.offCooldown(c, 'breath')) { api.breath(c, preyFar); return; }
      api.guard(c); return; // wait
    }
    api.sleep(c);
  };

  B.makari_swarm = function (c, api) {
    if (!c.mem.exploded) { c.mem.exploded = true; api.addEffect('swarmBurst', c.x, c.y); }
    const zone = c.vars.territory;
    const inZone = api.allCreaturesNear(c, zone).filter(o => o !== c && !o.dead && !o.sp.tags.includes('swarm'));
    if (inZone.length) { api.attack(c, inZone[0]); return; } // friendlies included, no exceptions
    const chased = c.mem.chasing != null ? api.byId(c.mem.chasing) : null;
    if (chased && !chased.dead && api.dist({ x: c.homeX, y: c.homeY }, chased) < zone + c.vars.aggressionRadius) {
      api.attack(c, chased); return; // chase up to aggression radius
    }
    c.mem.chasing = null;
    if (api.dist(c, { x: c.homeX, y: c.homeY }) > 20) { api.moveToward(c, c.homeX, c.homeY, false); return; } // return to zone
    api.hold(c);
  };

  B.tonguatjis = function (c, api) {
    // Lutut on field → evasive priority overrides everything
    const lutut = api.creaturesOf('lutut').find(o => !o.dead && o.picks.stage !== 'juvenile');
    if (lutut && api.dist(c, lutut) < 350) { api.moveAway(c, lutut.x, lutut.y, true); return; }
    if (c.mem.tongueSevered) {
      // snap-only defensive mode
      const inJaw = api.nearestEnemy(c, 34);
      if (inJaw) { api.attack(c, inJaw); return; }
      api.shellUp(c); return;
    }
    const preferred = api.nearestEnemy(c, c.vars.tongueLength, o => o.element === 'Fti' || o.element === 'Su' || o.sp.tags.includes('flyer'));
    if (preferred) { api.tongueStrike(c, preferred); return; }
    const any = api.nearestEnemy(c, c.vars.tongueLength);
    if (any) { api.tongueStrike(c, any); return; }
    const tracked = api.nearestEnemy(c, 300);
    if (tracked) {
      c.mem.trackStart = c.mem.trackStart || api.time;
      if (api.time - c.mem.trackStart < c.vars.patience) { api.moveToward(c, tracked.x, tracked.y, false); return; }
      c.mem.trackStart = null;
    }
    api.hold(c);
  };

  B.mikolo_moko = function (c, api) {
    const relic = api.relic(c.team);
    const own = api.ownHoard(c.team);
    if (c.carryingRelic) {
      // most direct route home; decoy misdirection while chased
      const chasers = api.enemiesNear(c, 120);
      let tx = own.x, ty = own.y;
      if (chasers.length) {
        const zig = Math.sin(api.time * (2 + c.vars.decoy * 3)) * 60 * c.vars.decoy;
        tx += zig; ty += -zig;
      }
      api.moveToward(c, tx, ty, false); // carry speed enforced by engine
      return;
    }
    if (attackedRecently(c, api)) { api.camo(c); fleeThreats(c, api, 200); return; } // camo + flee, never engage
    if (relic.carrier && relic.carrierTeam !== c.team) {
      // relic grabbed by enemy → follow and wait for drop
      api.moveToward(c, relic.x + 50, relic.y + 30, false);
      return;
    }
    // our own relic stolen → run it down (defense duty)
    const ours = api.ownRelic(c.team);
    if (ours && ours.carrier != null) {
      api.moveToward(c, ours.x, ours.y, true);
      return;
    }
    if (!relic.carrier && !relic.captured) {
      const guards = api.enemiesNear({ x: relic.x, y: relic.y, team: c.team }, 110).length;
      if (guards <= 1) { // unguarded or lightly guarded → sprint to it
        api.moveToward(c, relic.x, relic.y, true);
        if (api.dist(c, relic) < 24) api.pickRelic(c);
        return;
      }
      // heavily guarded → wait, per-individual patience
      c.mem.waitStart = c.mem.waitStart || api.time;
      if (api.time - c.mem.waitStart > c.vars.patience) { c.mem.waitStart = null; api.moveToward(c, relic.x, relic.y, true); return; }
      api.lurk(c, relic); return;
    }
    api.patrol(c, 90); // patrol near relic position
  };

  B.tyndael = function (c, api) {
    // Su Naga or heavy Su terrain → evade (the only override)
    const suNaga = api.creaturesOf('su_naga').find(o => !o.dead);
    if (suNaga && api.dist(c, suNaga) < 300) { api.moveAway(c, suNaga.x, suNaga.y, true); return; }
    if (api.inWater(c)) { api.moveToward(c, c.homeX, c.homeY, true); return; }
    if (attackedRecently(c, api) && c.lastAttacker && !c.lastAttacker.dead) { api.breath(c, c.lastAttacker); return; }
    // forest/nature priority — hard tunnel vision
    const forest = api.nearestEnemy(c, 500, o => o.sp.tags.includes('forest') || o.speciesId === 'karnen');
    if (forest) { api.attack(c, forest, false, false, true); return; }
    if (c.heat < 0.35) { api.seekHeat(c); return; }
    const flammable = api.nearestEnemy(c, 340, o => !o.sp.tags.includes('fire'));
    if (flammable) { api.attack(c, flammable, false, false, true); return; }
    api.burnGround(c); // never fully idle
  };

  B.raf_krabbi = function (c, api) {
    // shared-combat betrayal
    const otherKrab = api.creaturesOf('raf_krabbi').find(o => o !== c && !o.dead);
    if (otherKrab && c.mem.sharedFight && !api.enemiesNear(c, 200).length) { api.attack(c, otherKrab); return; }
    const target = api.nearestEnemy(c, c.vars.aggressionRange);
    if (target) {
      if (otherKrab && api.dist(otherKrab, target) < 100) c.mem.sharedFight = true;
      api.attack(c, target); // charge it immediately, no assessment
      return;
    }
    const anything = api.allCreaturesNear(c, 400).filter(o => o !== c && !o.dead && o.team !== c.team)[0];
    if (anything) { api.moveToward(c, anything.x, anything.y, true); return; }
    api.patrol(c, 120);
  };

  B.su_naga = function (c, api) {
    const young = c.tokAge < 0.4;
    // enemy moving the relic → intercept the carrier
    const relic = api.relic();
    if (relic.carrier && relic.carrierTeam !== c.team) {
      const carrier = api.byId(relic.carrier);
      if (carrier) { api.attack(c, carrier, false, false, true); return; }
    }
    // solitary preference vs other Su Naga
    const otherSu = api.creaturesOf('su_naga').find(o => o !== c && !o.dead);
    if (otherSu && otherSu.team === c.team && api.dist(c, otherSu) < 200) { api.moveAway(c, otherSu.x, otherSu.y, false); return; }
    if (otherSu && otherSu.team !== c.team) {
      const mine = (c.headsLeft || 2) * (c.sizeIdx + 1), theirs = (otherSu.headsLeft || 2) * (otherSu.sizeIdx + 1);
      if (mine >= theirs || young) { api.attack(c, otherSu, false, false, true); return; }
      api.moveAway(c, otherSu.x, otherSu.y, false); return;
    }
    if (young) {
      const near = api.nearestEnemy(c, 300);
      if (near) { api.attack(c, near, false, false, true); return; } // reckless while young
    }
    // strategic: target whatever hurts allied position most
    const allies = api.alliesNear(c, 600);
    let best = null, bestScore = 0;
    api.enemiesNear(c, 450).forEach(o => {
      const s = o.dmg * (1 + o.sizeIdx * 0.4) + (allies.some(a => a.lastAttacker === o) ? 30 : 0);
      if (s > bestScore) { bestScore = s; best = o; }
    });
    if (best && (bestScore > 14 || c.vars.patience < 0.5)) { api.attack(c, best, false, false, true); return; }
    // bioluminescent deception — misdirect nearest enemy
    if (api.rng.chance(0.05 * c.vars.deception)) api.biolumFlash(c);
    api.patrol(c, 70); // tactical patience — does not rush in
  };

  B.harkal = function (c, api) {
    const other = api.creaturesOf('harkal').find(o => o !== c && !o.dead);
    // joins the fight it's involved in first; afterwards turns on the other Harkal
    if (other && c.mem.foughtTogether && !api.enemiesNear(c, 260).length) { api.attack(c, other); return; }
    let target = api.nearestEnemy(c, 280, o => o.speciesId !== 'harkal');
    if (target && threat(c, target) > 3 && api.enemiesNear(c, 280).length > 1) {
      target = api.enemiesNear(c, 280).filter(o => o.speciesId !== 'harkal').sort((a, b) => api.dist(c, a) - api.dist(c, b))[1] || target; // too big → next nearest
    }
    if (target) {
      if (other && api.dist(other, target) < 150) c.mem.foughtTogether = true;
      api.attack(c, target, false, c.frenzy > 0.5); // frenzy = speed
      return;
    }
    const nearest = api.allCreaturesNear(c, 600).filter(o => o !== c && !o.dead && o.team !== c.team)[0];
    if (nearest) { api.moveToward(c, nearest.x, nearest.y, true); return; } // relentless
    api.patrol(c, 150);
  };

  B.uff = function (c, api) {
    const close = api.allCreaturesNear(c, c.vars.reach + 14).filter(o => o !== c && !o.dead);
    if (close.length && api.rng.chance(c.vars.reactionSpeed)) { api.flail(c); return; }
    api.forage(c); // wander. no goals. never purposeful.
  };

  /* ================= SENTIENT UNITS ================= */

  function sentientCommon(c, api) {
    // relic-carrying: run the stolen enemy relic home
    const relic = api.relic(c.team);
    if (c.carryingRelic) {
      const own = api.ownHoard(c.team);
      api.moveToward(c, own.x, own.y, false);
      return true;
    }
    // our own relic was stolen → highest duty is getting it back
    const ours = api.ownRelic(c.team);
    if (ours && (ours.carrier != null || (Math.abs(ours.x - ours.homeX) > 6 && !ours.captured))) {
      api.moveToward(c, ours.x, ours.y, true);
      return true;
    }
    // raid the enemy relic — but weigh field state first (§8): commit only
    // when healthy, not embattled, and the target isn't a deathtrap
    if (relic && !relic.carrier && !relic.captured && !relic.disabled) {
      const d = api.dist(c, relic);
      // within arm's reach: grab it no matter what — hesitation kills
      if (d < 80) {
        api.moveToward(c, relic.x, relic.y, true);
        if (d < 24 + c.radius) api.pickRelic(c);
        return true;
      }
      const lateGame = api.time > 480; // escalation era: caution stops paying
      if (!lateGame) {
        if (api.enemiesNear(c, 140).length) return false;         // in a fight — deal with it
        if (c.hp < c.maxHp * 0.45) return false;                   // too hurt to run the gauntlet
        const guards = api.enemiesNear({ x: relic.x, y: relic.y, team: c.team }, 130).length;
        const backup = api.alliesNear(c, 220).filter(a => a.dmg > 4).length;
        if (guards >= 2 && backup === 0) { api.guardPost(c); return false; } // suicide run — wait for support
      }
      api.moveToward(c, relic.x, relic.y, d < 260);
      if (d < 24 + c.radius) api.pickRelic(c);
      return true;
    }
    return false;
  }

  B.sword_unit = function (c, api) {
    if (sentientCommon(c, api)) return;
    const targets = api.enemiesNear(c, 240);
    if (targets.length) {
      let t0;
      if (c.picks.targetPriority === 'biggest threat') t0 = targets.sort((a, b) => threat(c, b) - threat(c, a))[0];
      else if (c.picks.targetPriority === 'weakest target') t0 = targets.sort((a, b) => a.hp - b.hp)[0];
      else t0 = targets.sort((a, b) => api.dist(c, a) - api.dist(c, b))[0];
      // ally falling → loyalty may redirect
      const falling = api.alliesNear(c, 180).find(a => a.hp < a.maxHp * 0.3 && attackedRecently(a, api));
      if (falling && c.vars.loyaltyToUnit > 0.6 && falling.lastAttacker && !falling.lastAttacker.dead) t0 = falling.lastAttacker;
      api.attack(c, t0);
      return;
    }
    // formation: hold near allied units
    const unit = api.alliesNear(c, 300).filter(a => a.sp.tags.includes('sentient'));
    if (unit.length && c.vars.formationDiscipline > 0.5) {
      const cx = unit.reduce((s, a) => s + a.x, c.x) / (unit.length + 1);
      const cy = unit.reduce((s, a) => s + a.y, c.y) / (unit.length + 1);
      if (api.dist(c, { x: cx, y: cy }) > 60) { api.moveToward(c, cx, cy, false); return; }
    }
    api.guardPost(c);
  };

  B.spear_unit = function (c, api) {
    if (sentientCommon(c, api)) return;
    // mounted creature in range → target the rider (anti-mount)
    const mount = api.nearestEnemy(c, c.attackRange + 30, o => o.sp.features && (o.sp.features.rider || o.hasRider));
    if (mount) { api.attack(c, mount, false, false, false, c.vars.antiMount); return; }
    // Hanii throw at range
    const far = api.nearestEnemy(c, c.vars.haniiRange, o => api.dist(c, o) > c.attackRange + 10);
    if (far && api.offCooldown(c, 'hanii')) { api.throwHanii(c, far); return; }
    const near = api.nearestEnemy(c, 200);
    if (near) { api.attack(c, near); return; }
    const ally = api.alliesNear(c, 220).find(a => attackedRecently(a, api) && a.lastAttacker && !a.lastAttacker.dead);
    if (ally) { api.attack(c, ally.lastAttacker); return; } // higher assist baseline
    const unit = api.alliesNear(c, 320).filter(a => a.sp.tags.includes('sentient'));
    if (unit.length) { const u = unit[0]; if (api.dist(c, u) > 70) { api.moveToward(c, u.x, u.y, false); return; } }
    api.guardPost(c);
  };

  B.archer_unit = function (c, api) {
    // tower relocation
    const tower = api.structuresOf(c.team, 'tower').find(s => !s.occupant || s.occupant === c.id);
    if (tower && !c.onTower) { api.moveToward(c, tower.x, tower.y, false); if (api.dist(c, tower) < 20) api.mountTower(c, tower); return; }
    // evade close range at all costs
    const closeThreat = api.nearestEnemy(c, 60);
    if (closeThreat && !c.onTower) {
      if (api.enemiesNear(c, 40).length) { api.attack(c, closeThreat); return; } // cornered — secondary weapon
      api.moveAway(c, closeThreat.x, closeThreat.y, true); return;
    }
    // prioritize flyers and Su creatures
    let target = api.nearestEnemy(c, c.attackRange, o => (o.sp.tags.includes('flyer') || o.element === 'Su') && !api.losBlocked(c.x, c.y, o.x, o.y));
    if (!target) target = api.nearestEnemy(c, c.attackRange, o => !api.losBlocked(c.x, c.y, o.x, o.y));
    if (target) {
      if (c.quiver <= 0) { api.hold(c); return; } // out of arrows (Karnen refills)
      api.shoot(c, target);
      return;
    }
    // tactical positioning (§8): stand behind the nearest allied frontliner
    const tank = api.alliesNear(c, 400).filter(a => a.dmg > 6 && !a.rooted && !a.sp.tags.includes('passive'))
      .sort((a, b) => api.dist(c, a) - api.dist(c, b))[0];
    if (tank) {
      const own = api.ownHoard(c.team);
      const a = Math.atan2(tank.y - own.y, tank.x - own.x);
      const px = tank.x - Math.cos(a) * 90, py = tank.y - Math.sin(a) * 90;
      if (api.dist(c, { x: px, y: py }) > 30) { api.moveToward(c, px, py, false); return; }
      api.guard(c); return;
    }
    // no frontline yet: hold a vantage in our half
    if (!c.mem.vantage) {
      const own = api.ownHoard(c.team);
      c.mem.vantage = { x: own.x + (api.enemyHoard(c.team).x - own.x) * 0.3 + api.rng.range(-60, 60), y: c.y + api.rng.range(-80, 80) };
    }
    if (api.dist(c, c.mem.vantage) > 20) { api.moveToward(c, c.mem.vantage.x, c.mem.vantage.y, false); return; }
    api.guard(c);
  };

  B.chemist = function (c, api) {
    if (fleeThreats(c, api, 70)) return; // never engage; reposition to safe range
    // critically injured ally → heal (first priority when urgent)
    const hurt = api.alliesNear(c, c.vars.seekRange).filter(a => a !== c && a.hp < a.maxHp * 0.55).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (hurt && api.offCooldown(c, 'heal')) {
      if (api.dist(c, hurt) > 46) { api.moveToward(c, hurt.x, hurt.y, true); return; }
      api.heal(c, hurt); return;
    }
    // makari collection
    const remnant = api.makariRemnants().sort((a, b) => api.dist(c, a) - api.dist(c, b))[0];
    if (remnant && api.dist(c, remnant) < c.vars.seekRange) {
      if (api.dist(c, remnant) > 20) { api.moveToward(c, remnant.x, remnant.y, false); return; }
      api.collectMakari(c, remnant); return;
    }
    // supply acid to allied Sru Vorn
    const vorn = api.alliesNear(c, c.vars.seekRange).find(a => a.speciesId === 'sru_vorn' && !a.mem.chemistAcid);
    if (vorn) {
      if (api.dist(c, vorn) > 50) { api.moveToward(c, vorn.x, vorn.y, false); return; }
      api.supplyAcid(c, vorn); return;
    }
    // buff most strategic ally
    const buffable = api.alliesNear(c, 120).filter(a => a !== c && !a.buffedUntil || (a.buffedUntil || 0) < api.tick);
    if (buffable.length && api.offCooldown(c, 'buff')) {
      const best = buffable.sort((a, b) => b.dmg - a.dmg)[0];
      api.buff(c, best); return;
    }
    // move toward position of highest future utility (allied center of mass)
    const allies = api.alliesNear(c, 700).filter(a => a !== c);
    if (allies.length) {
      const cx = allies.reduce((s, a) => s + a.x, 0) / allies.length;
      const cy = allies.reduce((s, a) => s + a.y, 0) / allies.length;
      if (api.dist(c, { x: cx, y: cy }) > 90) { api.moveToward(c, cx, cy, false); return; }
    }
    api.guard(c);
  };

  B.builder = function (c, api) {
    if (c.mem.building) {
      api.continueBuild(c);
      return;
    }
    // forced into combat → brawl as last resort
    const cornered = api.enemiesNear(c, 40);
    if (cornered.length) { api.attack(c, cornered[0]); return; }
    if (fleeThreats(c, api, 60)) return;
    // tower first priority: build whenever the team fields ranged allies (or
    // any Eikar at all) and has no tower yet — Eikar garrison and shoot from it
    const rangedAlly = api.alliesNear(c, 1200).find(a => a.sp.behavior === 'archer_unit' || a.sp.tags.includes('eikar'));
    const haveTower = api.structuresOf(c.team, 'tower').length;
    if (!haveTower && (rangedAlly || true)) { api.startBuild(c, 'tower'); return; }
    // enemy pressure at key position → wall
    const own = api.ownHoard(c.team);
    const pressure = api.enemiesNear({ x: own.x, y: own.y, team: c.team }, 260).length;
    if (pressure && api.structuresOf(c.team, 'wall').length < 3) { api.startBuild(c, 'wall'); return; }
    // repair damaged allied structure
    const damaged = api.structuresOf(c.team).find(s => s.hp < s.maxHp * 0.7);
    if (damaged) {
      if (api.dist(c, damaged) > 30) { api.moveToward(c, damaged.x, damaged.y, false); return; }
      api.repair(c, damaged); return;
    }
    // siege: demolish enemy structures
    const enemyStruct = api.structuresOf(1 - c.team)[0];
    if (enemyStruct && c.picks.siegeProficiency) {
      if (api.dist(c, enemyStruct) > 60) { api.moveToward(c, enemyStruct.x, enemyStruct.y, false); return; }
      api.demolish(c, enemyStruct); return;
    }
    // read the field: move toward best construction position
    api.moveToward(c, own.x + (api.enemyHoard(c.team).x - own.x) * 0.25, own.y, false);
  };

  B.karnen = function (c, api) {
    // flee any threat (brave ones hold slightly longer)
    const th = api.nearestEnemy(c, 90 + c.vars.bravery * -50);
    if (th) { fleeThreats(c, api, 160); return; }
    // supply archers
    const archer = api.alliesNear(c, 400).find(a => a.sp.behavior === 'archer_unit' && a.quiver < 8);
    if (archer) {
      if (api.dist(c, archer) > 26) { api.moveToward(c, archer.x, archer.y, false); return; }
      api.resupply(c, archer); return;
    }
    // harvest near friendly position — engine grants bonus resources per pulse while alive
    const allies = api.alliesNear(c, 300);
    if (allies.length && api.dist(c, allies[0]) > 140) { api.moveToward(c, allies[0].x, allies[0].y, false); return; }
    api.forage(c); // never idle
  };

  /* Ju / Sprengju */
  B.ju_field = function (c, api) { api.hold(c); };
  B.sprengju = function (c, api) { api.hold(c); };
  B.sprengju_shaving = function (c, api) { api.hold(c); }; // conversion handled on pulse

  /* Kuni Byrd */
  B.kuni_byrd = function (c, api) {
    // fed by player → temporarily redirected
    if (c.mem.fedUntil && api.tick < c.mem.fedUntil) { api.circle(c); return; }
    // nest/territory threatened
    const nestTh = api.enemiesNear({ x: c.homeX, y: c.homeY, team: c.team }, 150)[0];
    if (nestTh && c.vars.nestDefence > 0.5) { api.attack(c, nestTh, false, true); return; }
    // rival byrd competition
    const rival = api.creaturesOf('kuni_byrd_wild').concat(api.creaturesOf('kuni_byrd_ridden')).find(o => o !== c && !o.dead && o.team !== c.team);
    const prey = api.nearestEnemy(c, 350, o => o.sizeIdx + 1 >= c.vars.preyThreshold - 1 && !o.sp.tags.includes('flyer'));
    if (rival && prey && api.dist(rival, prey) < 200) { api.attack(c, rival); return; }
    if (prey) {
      const guarded = api.enemiesNear(prey, 90).length > 1;
      if (guarded && c.picks.huntingStyle === 'patient stalker') { api.circle(c); return; } // wait for a gap
      api.dive(c, prey);
      return;
    }
    // grab-and-drop smaller creatures
    const small = api.nearestEnemy(c, 200, o => o.sizeIdx <= c.sizeIdx - 2);
    if (small && api.offCooldown(c, 'grab')) { api.grabDrop(c, small); return; }
    const bigThreat = api.enemiesNear(c, 100).find(o => threat(c, o) > 1.5);
    if (bigThreat) { api.moveAway(c, bigThreat.x, bigThreat.y, true); return; } // reposition to altitude
    api.circle(c);
  };
  B.kuni_byrd_ridden = function (c, api) {
    // rider under attack → protection instinct (rider is part of this token)
    if (attackedRecently(c, api) && c.vars.riderProtection > 0.6 && c.lastAttacker && !c.lastAttacker.dead) {
      api.attack(c, c.lastAttacker, false, true);
      return;
    }
    // rider command layer: prefer strategic targets (relic carriers, supports) per command responsiveness
    const relic = api.relic();
    if (relic.carrier && relic.carrierTeam !== c.team && c.vars.commandResponse > 0.4) {
      const carrier = api.byId(relic.carrier);
      if (carrier) { api.dive(c, carrier); return; }
    }
    const support = api.nearestEnemy(c, 320, o => o.sp.behavior === 'chemist' || o.sp.behavior === 'archer_unit');
    if (support && c.vars.commandResponse > 0.55) { api.dive(c, support); return; }
    B.kuni_byrd(c, api); // default to wild tree
  };

  DYA.behaviors = B;
})();
