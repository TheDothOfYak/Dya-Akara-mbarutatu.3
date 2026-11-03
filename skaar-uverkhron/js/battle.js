/* ============================================================
   SKAAR UVERKHRON — js/battle.js
   The battle engine (no drawing here).

   A hex field, 19 × 13, attacker on the left. Each squadron
   stands in a little group with its captain in front. Stacks of
   the same creature in one squadron fight as one. Turn order is
   by speed, changed by each stack's morale and the army's
   Cunning. The hero does not fight: they direct, and sing.
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU, D = SU.data, S = SU.state, RU = SU.rules, M = SU.make, HX = SU.hex;
  const B_ = SU.battle = {};
  B_.COLS = 19; B_.ROWS = 13;
  const key = (c, r) => c + ',' + r;

  /* ======================= setting up ======================= */
  /* side spec: { owner, army (map army or null), hero, slots, town, label } */
  B_.create = function (st, atk, def, opts) {
    opts = opts || {};
    const R = SU.rng(st);
    const L = st.layers[opts.layer != null ? opts.layer : (atk.army ? atk.army.layer : 0)];
    const lx = opts.x != null ? opts.x : (def.army ? def.army.x : atk.army ? atk.army.x : 0), ly = opts.y != null ? opts.y : (def.army ? def.army.y : atk.army ? atk.army.y : 0);
    const terr = S.inside(L, lx, ly) ? S.terrainAt(L, lx, ly) : 'grass';
    const B = {
      cols: B_.COLS, rows: B_.ROWS, terrain: terr, el: (D.TERRAIN[terr] || D.TERRAIN.grass).el,
      layer: opts.layer != null ? opts.layer : (atk.army ? atk.army.layer : 0), x: lx, y: ly,
      sides: [mkSide(st, atk, 0), mkSide(st, def, 1)], units: [], obstacles: new Set(), round: 0, queue: [], active: null,
      log: [], over: null, siege: null, nextUid: 1, fallenCaps: [], stolen: [0, 0], killedMcfly: [false, false],
      inEye: RU.inEye(st, opts.layer != null ? opts.layer : (atk.army ? atk.army.layer : 0), lx, ly), anim: [],
    };
    if (opts.town) setupSiege(st, B, opts.town);
    deploy(st, B, 0, atk.slots, atk.hero);
    deploy(st, B, 1, def.slots, def.hero);
    if (opts.extraDefSlots) deploy(st, B, 1, opts.extraDefSlots, def.hero, true);
    /* scatter a few rocks and trees, away from where anyone stands */
    const nob = B.siege ? 3 : R.int(3, 7);
    for (let k = 0; k < nob * 4 && B.obstacles.size < nob; k++) {
      const c = R.int(4, B.cols - 5), r = R.int(1, B.rows - 2);
      if (!unitAt(B, c, r) && !(B.siege && B.siege.cells.has(key(c, r)))) B.obstacles.add(key(c, r));
    }
    B.obstacleKind = { grass: 'tree', dirt: 'rock', rough: 'rock', sand: 'cactus', snow: 'pine', swamp: 'reeds', ash: 'deadtree', dusk: 'shard', moon: 'crystal', water: 'rock' }[terr] || 'rock';
    nextRound(st, B);
    return B;
  };
  function mkSide(st, spec, idx) {
    const h = spec.hero || null;
    return { idx, owner: spec.owner, armyId: spec.army ? spec.army.id : null, heroId: h ? h.id : null, label: spec.label || (h ? h.name : 'Wild creatures'),
      ai: spec.ai != null ? spec.ai : (spec.owner < 0 || (st.players[spec.owner] && st.players[spec.owner].kind === 'ai')),
      sung: false, hushed: 0, slots: spec.slots, townId: spec.town ? spec.town.id : null, hungry: spec.owner >= 0 && st.players[spec.owner].hungry > 0,
      cunning: h ? S.heroStat(st, h, 'Cunning') : 0, sanctum: !!(spec.town && RU.has(spec.town, 'sanctum') && idx === 1),
      power0: spec.army ? (spec.army.power0 || 0) : 0, naelstInArmy: S.captainsIn(spec.slots).some(c => c.rank === 'naelst') };
  }
  function setupSiege(st, B, town) {
    const lvl = town.built.reduce((m, b) => Math.max(m, D.BUILDINGS[b].walls || 0), 0);
    if (!lvl) return;
    const wc = B.cols - 6, cells = new Map(), mid = B.rows >> 1;
    for (let r = 0; r < B.rows; r++) cells.set(key(wc + (r & 1 ? 0 : 0), r), { c: wc, r, hp: 2 + lvl * 2, max: 2 + lvl * 2, gate: r === mid });
    const towers = [{ c: wc + 1, r: mid - 4 }, { c: wc + 1, r: mid + 4 }, { c: wc + 2, r: mid }].slice(0, lvl === 1 ? 0 : lvl === 2 ? 1 : 3);
    B.siege = { town: town.id, level: lvl, wc, cells, towers: towers.map(t => ({ c: t.c, r: t.r, hp: 1 })) };
  }
  function deploy(st, B, side, slots, hero, extra) {
    const groups = [];
    (slots || []).forEach((s, si) => { if (!s) return;
      if (s.kind === 'stack') { if (s.n > 0) groups.push({ si, cap: null, stacks: [{ ref: s, path: [si] }], slot: s }); }
      else if (s.kind === 'cap') groups.push({ si, cap: s.cap, slot: s, stacks: s.stacks.map((x, k) => x && x.n > 0 ? { ref: x, path: [si, k] } : null).filter(Boolean), reserve: (s.reserve || []).filter(x => x && x.n > 0) });
    });
    const tactics = hero ? S.skillVal(st, hero, 'tactics') : 0;
    const n = groups.length; if (!n) return;
    const dir = side === 0 ? 1 : -1;
    const front = side === 0 ? 3 + Math.min(2, tactics >> 1) : (B.siege ? B.cols - 4 : B.cols - 4 - Math.min(2, tactics >> 1));
    const usedRows = extra ? B.rows : B.rows;
    groups.forEach((g, gi) => {
      const rowC = SU.clamp(Math.round((gi + 0.5) * usedRows / n - 0.5), 1, B.rows - 2);
      const squad = 'q' + side + (extra ? 'x' : '') + gi;
      g.squad = squad;
      /* captain in front */
      if (g.cap) addUnit(st, B, side, { kind: 'cap', cap: g.cap, path: [g.si], squad, hero, extra }, front + (extra ? -dir : 0), rowC);
      /* stacks of the same creature in one squadron fight as one */
      const merged = {};
      g.stacks.forEach(s => { (merged[s.ref.cr] = merged[s.ref.cr] || []).push(s); });
      const kinds = Object.keys(merged);
      const spots = [[0, 0], [0, -1], [0, 1], [-1, 0], [-1, -2], [-1, 2], [0, -2], [0, 2]];
      kinds.forEach((cr, k) => {
        const [dc, dr] = spots[k % spots.length];
        const c = front - dir * (1 + (g.cap ? 1 : 0) + (k > 2 ? 1 : 0)) + dc * dir, r = SU.clamp(rowC + dr, 0, B.rows - 1);
        addUnit(st, B, side, { kind: 'stack', cr, parts: merged[cr], squad, cap: g.cap, hero, extra }, c, r);
      });
      if (g.reserve && g.reserve.length) B.reserves = (B.reserves || []).concat(g.reserve.map(x => ({ side, squad, ref: x, path: [g.si, 'r'], hero, cap: g.cap })));
    });
  }
  function addUnit(st, B, side, o, c, r) {
    const spot = freeSpotNear(B, c, r, o.kind === 'stack' ? B_.shapeOf(D.CREATURES[o.cr]) : [1, 1], side);
    if (!spot) return null;
    const u = { uid: B.nextUid++, side, kind: o.kind, squad: o.squad, c: spot[0], r: spot[1], done: false, waited: false, defending: false, retaliated: 0, fx: {}, firstStrike: true, firstHit: 0 };
    const sd = B.sides[side];
    if (o.kind === 'cap') {
      const cap = o.cap, capt = o.hero ? S.skill(st, o.hero, 'captaincy') : 0;
      Object.assign(u, { cap, name: cap.name, abil: [], shape: [1, 1], n: 1, hp: cap.hp, hpTop: cap.hp, startN: 1, atk: cap.atk + capt, def: cap.def + capt, dmg: [4 + cap.level, 7 + cap.level * 2], spd: D.CAPTAIN_BASE.spd + (cap.abil === 'vanguard' ? 2 : 0), size: 1, path: o.path, people: cap.people, morale: SU.clamp(60 + (cap.morale || 0) * 5 + (cap.elite ? 15 : 0), 0, 100) });
    } else {
      const c = D.CREATURES[o.cr];
      const n = o.parts ? o.parts.reduce((t, p) => t + p.ref.n, 0) : o.n;
      let hp = c.hp;
      if (o.hero && !c.people && !c.wild) hp = Math.round(hp * (1 + S.skillVal(st, o.hero, 'beasts') / 100));
      if (o.cap && o.cap.abil === 'beastwarden' && !c.people) hp = Math.round(hp * 1.1);
      const capBonus = o.cap ? { atk: o.cap.abil === 'drillmaster' ? 1 : 0, def: o.cap.abil === 'shieldbearer' ? 1 : 0 } : { atk: 0, def: 0 };
      const grief = o.parts ? Math.max(...o.parts.map(p => p.ref.grief || 0)) : 0;
      const morale = RU.stackMorale(st, { grief }, o.cap, o.hero, { hungry: sd.hungry, fed: !sd.hungry && sd.owner >= 0, sanctum: sd.sanctum });
      Object.assign(u, { cr: o.cr, name: c.plural, n, hp, hpTop: hp, startN: n, atk: c.atk + capBonus.atk, def: c.def + capBonus.def, dmg: c.dmg, spd: c.spd + (o.cap && o.cap.abil === 'vanguard' ? 1 : 0),
        size: c.size || 1, shape: B_.shapeOf(c), ranged: !!c.ranged, shots: c.shots || 0, fly: !!(c.fly || (c.abil || []).includes('blink') || (c.abil || []).includes('burrow')), abil: c.abil || [], parts: o.parts, morale, temp: !!o.temp });
    }
    u.capId = o.cap ? o.cap.id : null;
    B.units.push(u);
    return u;
  }
  function freeSpotNear(B, c, r, shape, side) {
    for (let d = 0; d < 10; d++) for (let dr = -d; dr <= d; dr++) for (let dc = -d; dc <= d; dc++) {
      if (Math.max(Math.abs(dc), Math.abs(dr)) !== d) continue;
      const cc = c + dc, rr = r + dr; if (fits(B, cc, rr, shape, side, null)) return [cc, rr];
    }
    return null;
  }
  /* footprints: [hexes along the row, rows]. The head is at (c,r); the body runs back
     toward its own side, and down. A Harkal is 2×1, a Lutut 2×2, the Nekh'Vorran 6×2. */
  B_.shapeOf = C => C.shape || (C.size === 2 ? [2, 1] : [1, 1]);
  function shapeCells(shape, side, c, r) {
    const dir = side === 0 ? -1 : 1, out = [];
    for (let k = 0; k < shape[1]; k++) for (let j = 0; j < shape[0]; j++) out.push([c + dir * j, r + k]);
    return out;
  }
  B_.tail = (u, c, r) => [c + (u.side === 0 ? -1 : 1), r];
  function cellsOf(u, c, r) { c = c == null ? u.c : c; r = r == null ? u.r : r; return shapeCells(u.shape || [1, 1], u.side, c, r); }
  B_.cellsOf = cellsOf;
  function inField(B, c, r) { return c >= 0 && r >= 0 && c < B.cols && r < B.rows; }
  function blockedCell(B, c, r, side, flying) {
    if (!inField(B, c, r)) return true;
    if (B.obstacles.has(key(c, r))) return true;
    if (B.siege) { const w = B.siege.cells.get(key(c, r)); if (w && w.hp > 0 && !(w.gate && side === 1)) return true; if (B.siege.towers.some(t => t.c === c && t.r === r)) return true; }
    return false;
  }
  function fits(B, c, r, shape, side, self, flying) {
    if (!Array.isArray(shape)) shape = shape === 2 ? [2, 1] : [1, 1];
    for (const [cc, rr] of shapeCells(shape, side, c, r)) { if (blockedCell(B, cc, rr, side, flying)) return false; const o = unitAt(B, cc, rr); if (o && o !== self) return false; }
    return true;
  }
  function unitAt(B, c, r) { for (const u of B.units) { if (u.n <= 0) continue; for (const [cc, rr] of cellsOf(u)) if (cc === c && rr === r) return u; } return null; }
  B_.unitAt = unitAt;
  B_.alive = B => B.units.filter(u => u.n > 0);

  /* ======================= turn order ======================= */
  B_.initiative = function (B, u) {
    const sd = B.sides[u.side];
    let i = u.spd + Math.floor(sd.cunning / 3) + (u.fx.quick ? 2 : 0) - (u.fx.slow ? 2 : 0) + (sd.sanctum ? 1 : 0) - B_.moraleSlow(u);
    return i;
  };
  function nextRound(st, B) {
    B.round++;
    B.sides.forEach(s => { s.sung = false; if (s.hushed > 0) s.hushed--; });
    B.units.forEach(u => {
      if (u.n <= 0) return; u.done = false; u.waited = false; u.defending = false; u.retaliated = 0; u.firstHit = 0;
      ['quick', 'slow', 'dim'].forEach(k => { if (u.fx[k] > 0) u.fx[k]--; });
      if (u.fx.shroud) u.fx.shroud = 0;
    });
    const R = SU.rng(st);
    B.queue = B_.alive(B).map(u => u.uid);
    const ini = {}; B.queue.forEach(id => ini[id] = B_.initiative(B, B.units.find(x => x.uid === id)) + R.next() * 0.5);
    B.queue.sort((a, b) => ini[b] - ini[a]);
    say(B, '— Round ' + B.round + ' —');
    /* towers shoot */
    if (B.siege) B.siege.towers.forEach(t => { if (t.hp > 0) towerShoot(st, B, t); });
    advance(st, B);
  }
  function advance(st, B) {
    if (checkOver(st, B)) return;
    while (B.queue.length) {
      const id = B.queue.shift(); const u = B.units.find(x => x.uid === id);
      if (!u || u.n <= 0) continue;
      /* burning */
      if (u.fx.burn) { const d = u.fx.burn; u.fx.burn = 0; applyDamage(st, B, null, u, d, 'burns'); if (u.n <= 0) { if (checkOver(st, B)) return; continue; } }
      if (u.fx.stun) { u.fx.stun = 0; say(B, u.name + ' are stunned and lose their turn.'); continue; }
      if (u.fx.confused) { u.fx.confused = 0; say(B, u.name + ' are confused and lose their turn.'); continue; }
      if (u.kind === 'stack' && u.morale != null && u.morale < 25 && SU.rng(st).chance((25 - u.morale) / 50)) { say(B, 'The ' + u.name + ' freeze in fear.'); B.anim.push({ kind: 'luck', uid: u.uid }); continue; }
      B.active = u.uid;
      /* the Xiw'Eik sing their chaos */
      if (u.abil && u.abil.includes('chaos') && SU.rng(st).chance(0.3)) chaosSong(st, B, u);
      /* captains with Songkeeper sometimes sing Mend over their squadron */
      if (u.kind === 'cap' && u.cap.abil === 'songkeeper' && SU.rng(st).chance(0.25)) { const t = B_.alive(B).filter(x => x.squad === u.squad && x.kind === 'stack' && (x.n < x.startN || x.hpTop < x.hp)); if (t.length) { heal(B, t[0], 25 + u.cap.level * 10); say(B, u.name + ' sings Mend over the ' + t[0].name + '.'); } }
      if (u.n <= 0) continue;
      return;
    }
    nextRound(st, B);
  }
  function checkOver(st, B) {
    if (B.over) return true;
    const a = B_.alive(B);
    const s0 = a.some(u => u.side === 0 && !u.temp), s1 = a.some(u => u.side === 1 && !u.temp);
    if (!s0 || !s1) { B.over = { winner: s0 ? 0 : 1 }; B.active = null; say(B, (s0 ? B.sides[0].label : B.sides[1].label) + (s0 ? (B.sides[0].heroId ? ' wins' : ' win') : (B.sides[1].heroId ? ' wins' : ' win')) + ' the battle.'); return true; }
    if (B.round > 60) { B.over = { winner: 1, timeout: true }; B.active = null; say(B, 'The battle drags on until the attackers give up.'); return true; }
    return false;
  }
  B_.activeUnit = B => B.units.find(u => u.uid === B.active) || null;
  /* morale (0–100, 60 steady): low morale slows a stack, and very low can freeze it */
  B_.moraleSlow = u => { const m = u.morale == null ? 60 : u.morale; return m < 20 ? 2 : m < 35 ? 1 : 0; };
  B_.moraleWord = m => m >= 90 ? 'fearless' : m >= 75 ? 'eager' : m >= 55 ? 'steady' : m >= 35 ? 'uneasy' : m >= 20 ? 'shaken' : 'broken';

  /* ======================= movement ======================= */
  /* every head-cell the unit can reach this turn → {c,r,d} */
  B_.reach = function (B, u) {
    const sp = Math.max(1, u.spd + (u.fx.quick ? 2 : 0) - (u.fx.slow ? 2 : 0) - B_.moraleSlow(u));
    const out = new Map(); out.set(key(u.c, u.r), { c: u.c, r: u.r, d: 0 });
    if (u.fly) {
      for (let r = 0; r < B.rows; r++) for (let c = 0; c < B.cols; c++) { const d = HX.dist(u.c, u.r, c, r); if (d <= sp && fits(B, c, r, u.shape, u.side, u, true)) out.set(key(c, r), { c, r, d }); }
      return out;
    }
    const q = [[u.c, u.r, 0]];
    while (q.length) {
      const [c, r, d] = q.shift(); if (d >= sp) continue;
      for (const [nc, nr] of HX.neighbors(c, r)) {
        const k = key(nc, nr); if (out.has(k)) continue;
        if (!fits(B, nc, nr, u.shape, u.side, u)) continue;
        out.set(k, { c: nc, r: nr, d: d + 1 });
        /* stop next to an enemy: you can't walk past them */
        const zoc = HX.neighbors(nc, nr).some(([a, b]) => { const o = unitAt(B, a, b); return o && o.side !== u.side; });
        if (!zoc) q.push([nc, nr, d + 1]);
      }
    }
    return out;
  };
  B_.adjacent = function (a, b) { for (const [c1, r1] of cellsOf(a)) for (const [c2, r2] of cellsOf(b)) if (HX.dist(c1, r1, c2, r2) === 1) return true; return false; };
  function adjacentAt(u, c, r, t) { for (const [c1, r1] of cellsOf(u, c, r)) for (const [c2, r2] of cellsOf(t)) if (HX.dist(c1, r1, c2, r2) === 1) return true; return false; }
  B_.enemyAdjacent = (B, u) => B_.alive(B).some(o => o.side !== u.side && B_.adjacent(u, o));
  B_.canShoot = (B, u) => u.ranged && u.shots > 0 && !B_.enemyAdjacent(B, u);
  /* where the unit could stand to strike target t this turn (cells it can reach that touch t) */
  B_.attackSpots = function (B, u, t, reach) {
    reach = reach || B_.reach(B, u);
    const spots = [];
    reach.forEach(v => { if (adjacentAt(u, v.c, v.r, t)) spots.push(v); });
    return spots.sort((a, b) => a.d - b.d);
  };

  /* ======================= actions ======================= */
  /* act: {type:'move',c,r} | {type:'attack',target,c,r} | {type:'shoot',target} | {type:'wait'} | {type:'defend'}
          {type:'shift', target, c, r} | {type:'wall', c, r} | {type:'boulder', c, r} */
  B_.act = function (st, B, act) {
    const u = B_.activeUnit(B); if (!u || B.over) return { ok: false };
    const R = SU.rng(st);
    const res = { ok: true };
    if (act.type === 'wait') { if (u.waited) return { ok: false, why: 'Already waited.' }; u.waited = true; B.queue.push(u.uid); say(B, u.name + ' wait.'); }
    else if (act.type === 'defend') { u.defending = true; say(B, u.name + ' defend.'); }
    else if (act.type === 'move') {
      const reach = B_.reach(B, u); const v = reach.get(key(act.c, act.r)); if (!v) return { ok: false, why: 'Too far.' };
      B.anim.push({ kind: 'move', uid: u.uid, from: [u.c, u.r], to: [act.c, act.r], fly: u.fly });
      u.c = act.c; u.r = act.r; badLuckStep(st, B, u);
    }
    else if (act.type === 'attack') {
      const t = act.target; if (!t || t.n <= 0 || t.side === u.side) return { ok: false };
      if (!B_.adjacent(u, t) || (act.c != null && (act.c !== u.c || act.r !== u.r))) {
        const reach = B_.reach(B, u); const v = act.c != null ? reach.get(key(act.c, act.r)) : B_.attackSpots(B, u, t, reach)[0];
        if (!v || !adjacentAt(u, v.c, v.r, t)) return { ok: false, why: 'Cannot reach.' };
        if (v.c !== u.c || v.r !== u.r) { B.anim.push({ kind: 'move', uid: u.uid, from: [u.c, u.r], to: [v.c, v.r], fly: u.fly }); u.c = v.c; u.r = v.r; badLuckStep(st, B, u); if (u.n <= 0) { endTurn(st, B); return res; } }
      }
      strike(st, B, u, t, false);
      if (t.n > 0 && u.n > 0 && (t.retaliated === 0 || (t.abil && t.abil.includes('guard'))) && !t.fx.stun) { t.retaliated++; strike(st, B, t, u, false, true); }
    }
    else if (act.type === 'shoot') {
      const t = act.target; if (!B_.canShoot(B, u) || !t || t.n <= 0 || t.side === u.side) return { ok: false };
      if (t.fx.shroud) return { ok: false, why: 'That stack is shrouded.' };
      u.shots--; strike(st, B, u, t, true);
      const rel = u.abil.includes('release2') ? 0.22 : u.abil.includes('release') ? 0.12 : 0;
      if (rel && R.chance(rel)) releaseFromDuat(st, B, u);
    }
    else if (act.type === 'shift') {
      if (!B_.canShift(B, u)) return { ok: false };
      const t = act.target; if (!t || t.side !== u.side || t.shape[0] * t.shape[1] !== 1 || t === u) return { ok: false };
      if (HX.dist(u.c, u.r, act.c, act.r) > u.spd || !fits(B, act.c, act.r, [1, 1], t.side, t)) return { ok: false, why: 'Out of reach.' };
      B.anim.push({ kind: 'blink', uid: t.uid, from: [t.c, t.r], to: [act.c, act.r] });
      t.c = act.c; t.r = act.r; say(B, 'The Kalo’Eik shift the ' + t.name + ' through the Duat.');
    }
    else if (act.type === 'wall' || act.type === 'boulder') {
      const w = B.siege && B.siege.cells.get(key(act.c, act.r)); if (!w || w.hp <= 0) return { ok: false };
      if (act.type === 'wall' && !cellsOf(u).some(([c, r]) => HX.dist(c, r, w.c, w.r) === 1)) return { ok: false, why: 'Not next to the wall.' };
      if (act.type === 'boulder' && !u.abil.includes('boulder')) return { ok: false };
      const sd = B.sides[u.side], hero = sd.heroId && st.heroes[sd.heroId];
      let dmg = act.type === 'boulder' ? 2 : 1; if (hero && R.chance(S.skillVal(st, hero, 'siege') / 200)) dmg++;
      w.hp = Math.max(0, w.hp - dmg);
      B.anim.push({ kind: act.type, uid: u.uid, to: [w.c, w.r] });
      say(B, u.name + (act.type === 'boulder' ? ' hurl a boulder at ' : ' batter ') + (w.gate ? 'the gate' : 'the wall') + (w.hp ? '.' : ' — it falls!'));
    }
    else return { ok: false };
    endTurn(st, B);
    return res;
  };
  B_.canShift = (B, u) => u.cr === 'kaloeik' && B.units.some(x => x.side === u.side && x.kind === 'cap' && x.cap.rank === 'naelst' && x.n > 0) || (u.cr === 'kaloeik' && B.sides[u.side].naelstInArmy);
  function endTurn(st, B) { const u = B_.activeUnit(B); if (u) u.done = true; B.active = null; advance(st, B); }
  function badLuckStep(st, B, u) {
    const sd = B.sides[u.side]; const luck = sideLuck(st, B, sd, u);
    if (u.kind === 'stack' && u.n > 3 && luck < 0 && SU.rng(st).chance(-luck * 0.04)) { const k = Math.max(1, Math.round(u.n * 0.05)); u.n -= k; say(B, 'Bad luck! ' + k + ' ' + u.name + ' trip and fall on their own blades.'); }
  }
  function sideLuck(st, B, sd, u) {
    const hero = sd.heroId && st.heroes[sd.heroId]; let l = 0;
    if (hero) l += S.skillVal(st, hero, 'fortune') + S.relicMod(st, hero, 'luck');
    const cap = u && u.capId && B.units.find(x => x.kind === 'cap' && x.cap.id === u.capId && x.n > 0);
    if (cap) l += (cap.cap.luck || 0) + (cap.cap.abil === 'charm' ? 1 : 0);
    if (sd.armyId && st.armies[sd.armyId] && st.armies[sd.armyId].cursed) l -= 1;
    return SU.clamp(l, -3, 3);
  }

  /* ======================= damage ======================= */
  B_.estimate = function (st, B, a, t, ranged) { return damage(st, B, a, t, ranged, true); };
  function damage(st, B, a, t, ranged, avgOnly) {
    const R = SU.rng(st);
    const sa = B.sides[a.side], sdf = B.sides[t.side];
    const ha = sa.heroId && st.heroes[sa.heroId], ht = sdf.heroId && st.heroes[sdf.heroId];
    let A = a.atk + (ha ? S.heroStat(st, ha, 'Strength') : 0) + (a.cr && D.CREATURES[a.cr].el === B.el ? 1 : 0) + (a.fx.comfort ? 2 : 0);
    let Df = t.def + (ht ? S.heroStat(st, ht, 'Defense') : 0) + (t.cr && D.CREATURES[t.cr].el === B.el ? 1 : 0) + (t.fx.comfort ? 2 : 0);
    if (t.defending) Df = Math.round(Df * 1.3);
    if (B.siege && t.side === 1 && t.c > B.siege.wc && ranged && a.side === 0) Df += 3;
    const f = A >= Df ? Math.min(3, 1 + 0.05 * (A - Df)) : Math.max(0.3, 1 - 0.025 * (Df - A));
    const [mn, mx] = a.dmg;
    /* morale skews each blow toward the top (high) or bottom (low) of its damage range */
    const mor = a.morale == null ? 60 : a.morale, bias = (mor - 60) / 40;
    const k = bias >= 0 ? 1 / (1 + bias * 1.5) : 1 + -bias * 1.5;      // roll^k
    let base;
    if (avgOnly) base = a.n * (mn + (mx - mn) / (k + 1));
    else if (a.n <= 12) { base = 0; for (let i = 0; i < a.n; i++) base += mn + (mx - mn) * Math.pow(R.next(), k); }
    else base = a.n * (mn + (mx - mn) / (k + 1) * R.range(0.85, 1.15));
    let d = base * f;
    if (ha) d *= 1 + (ranged ? S.skillVal(st, ha, 'marks') + S.relicMod(st, ha, 'rangedPct') : S.skillVal(st, ha, 'drill')) / 100;
    if (ha && ha.spec && a.cr && (a.cr === ha.spec.cr || D.CREATURES[a.cr].up === ha.spec.cr || D.CREATURES[ha.spec.cr] && D.CREATURES[ha.spec.cr].up === a.cr)) d *= 1 + ha.spec.pct / 100;
    if (ranged && a.fx.dim) d *= 0.6;
    if (ranged) { const dist = Math.min(...cellsOf(a).flatMap(([c1, r1]) => cellsOf(t).map(([c2, r2]) => HX.dist(c1, r1, c2, r2))));
      if (dist === 2) d *= 2; else if (dist > 10) d *= 0.5; }
    if (a.abil && a.abil.includes('frenzy')) d *= 1 + 0.5 * (1 - a.n / Math.max(1, a.startN)) + (a.abil.includes('scars') ? 0.1 : 0);
    if (a.abil && a.abil.includes('dive') && a.firstStrike) d *= 1.5;
    if (ht) d *= 1 - S.skillVal(st, ht, 'shieldwall') / 100;
    if (t.abil && t.abil.includes('scars')) d *= 0.85;
    if (t.abil && t.abil.includes('firsthead') && !t.firstHit) d *= 0.5;
    return Math.max(1, Math.round(d));
  }
  function strike(st, B, a, t, ranged, retaliation) {
    const R = SU.rng(st);
    B.anim.push({ kind: ranged ? 'shoot' : 'hit', uid: a.uid, target: t.uid, cr: a.cr });
    if (t.abil && t.abil.includes('dodge') && R.chance(0.2)) { say(B, 'The ' + t.name + ' slip aside: ' + a.name + ' miss.'); a.firstStrike = false; return; }
    let d = damage(st, B, a, t, ranged);
    /* good luck: fewer of them die */
    const luck = sideLuck(st, B, B.sides[t.side], t);
    if (luck > 0 && R.chance(luck * 0.08)) { d = Math.round(d * 0.5); say(B, 'Good luck! The ' + t.name + ' are spared the worst of it.'); B.anim.push({ kind: 'luck', uid: t.uid }); }
    const killed = applyDamage(st, B, a, t, d, ranged ? 'shoot' : (retaliation ? 'strike back at' : 'strike'));
    t.firstHit = 1;
    if (a.abil) {
      if ((a.abil.includes('thief') || a.abil.includes('thief2')) && !retaliation) steal(st, B, a, t, d);
      if (a.abil.includes('burn') && t.n > 0) t.fx.burn = Math.round(d * 0.15);
      if (a.abil.includes('dread') && t.n > 0) { t.morale = Math.max(0, (t.morale == null ? 60 : t.morale) - 10); }
      if (a.abil.includes('heads') && !retaliation) { const other = B_.alive(B).find(o => o.side === t.side && o !== t && B_.adjacent(a, o)); if (other) applyDamage(st, B, a, other, Math.round(d * 0.5), 'bite'); }
      if (a.abil.includes('screech') && a.firstStrike && t.n > 0 && R.chance(0.35)) { t.fx.stun = 1; say(B, 'The Lutut’s screech stuns the ' + t.name + '!'); }
      if (a.abil.includes('devour')) heal(B, a, Math.round(d * 0.25));
    }
    a.firstStrike = false;
    return killed;
  }
  function applyDamage(st, B, a, t, d, verb) {
    let left = d, killed = 0;
    while (left > 0 && t.n > 0) { if (left >= t.hpTop) { left -= t.hpTop; t.n--; killed++; t.hpTop = t.hp; } else { t.hpTop -= left; left = 0; } }
    B.anim.push({ kind: 'dmg', uid: t.uid, amount: d, killed });
    say(B, (a ? a.name + ' ' + verb + ' the ' + t.name : 'The ' + t.name + ' ' + verb) + ' for ' + d + (killed ? '. ' + killed + ' fall.' : '.'));
    if (t.n <= 0) unitFell(st, B, t, a);
    return killed;
  }
  function unitFell(st, B, t, a) {
    t.n = 0;
    if (t.cr === 'mcfly' && a) { B.killedMcfly[a.side] = true; say(B, 'A RubberMcFly is killed. That is very bad luck.'); }
    if (t.kind === 'cap') {
      say(B, 'Captain ' + t.name + ' has fallen! Their squadron loses heart.');
      B.units.forEach(x => { if (x.squad === t.squad && x.n > 0) x.morale = Math.max(0, (x.morale == null ? 60 : x.morale) - 20); });
      B.fallenCaps.push({ side: t.side, cap: t.cap, path: t.path, ward: !!t.fx.ward });
    } else if (B.reserves) {
      /* a reservist captain's reserve steps in */
      const i = B.reserves.findIndex(r => r.side === t.side && r.squad === t.squad && !r.used);
      if (i >= 0) { const r = B.reserves[i]; r.used = true;
        const u = addUnit(st, B, t.side, { kind: 'stack', cr: r.ref.cr, parts: [{ ref: r.ref, path: r.path }], squad: r.squad, cap: r.cap, hero: r.hero }, t.c, t.r);
        if (u) { say(B, 'The reserve ' + u.name + ' step in.'); B.queue.push(u.uid); } }
    }
  }
  function heal(B, u, amount) {
    if (u.kind === 'cap') { u.hpTop = Math.min(u.hp, u.hpTop + amount); return; }
    let left = amount;
    const room = u.hp - u.hpTop; const h1 = Math.min(room, left); u.hpTop += h1; left -= h1;
    while (left >= u.hp && u.n < u.startN) { u.n++; left -= u.hp; }
  }
  function steal(st, B, a, t, d) {
    const victim = B.sides[t.side].owner, thief = B.sides[a.side].owner;
    let amt = Math.round(d * (a.abil.includes('thief2') ? 2 : 1) * 1.5);
    if (victim >= 0) amt = Math.min(amt, st.players[victim].res.gold);
    if (amt <= 0) return;
    if (victim >= 0) st.players[victim].res.gold -= amt;
    if (thief >= 0) st.players[thief].res.gold += amt;
    B.stolen[a.side] += amt;
    say(B, 'The ' + a.name + ' make off with ' + amt + ' gold.');
  }
  function releaseFromDuat(st, B, u) {
    const n = Math.max(2, Math.round(u.n * 0.5));
    const spot = freeSpotNear(B, u.c + (u.side === 0 ? 1 : -1), u.r, [1, 1], u.side);
    if (!spot) return;
    const t = addUnit(st, B, u.side, { kind: 'stack', cr: 'malsti', parts: null, squad: u.squad, cap: null, temp: true }, spot[0], spot[1]);
    if (t) { t.n = n; t.startN = n; t.temp = true; t.parts = null; B.queue.push(t.uid); B.anim.push({ kind: 'blink', uid: t.uid, to: [t.c, t.r] }); say(B, 'The scream tears the Duat open: ' + n + ' Malsti Punks tumble out!'); }
  }
  function chaosSong(st, B, u) {
    const R = SU.rng(st), kind = R.weighted(D.CHAOS, k => k === 'backfire' ? 0.6 : 2);
    const foes = B_.alive(B).filter(x => x.side !== u.side), friends = B_.alive(B).filter(x => x.side === u.side);
    const f = R.pick(foes), g = R.pick(friends); if (!f) return;
    B.anim.push({ kind: 'chaos', uid: u.uid });
    if (kind === 'confuse') { f.fx.confused = 1; say(B, 'The Xiw’Eik sing chaos: the ' + f.name + ' are confused.'); }
    else if (kind === 'slow') { f.fx.slow = 2; say(B, 'The Xiw’Eik sing chaos: the ' + f.name + ' are slowed.'); }
    else if (kind === 'hasten') { g.fx.quick = 2; say(B, 'The Xiw’Eik sing chaos: the ' + g.name + ' are hastened.'); }
    else if (kind === 'scorch') applyDamage(st, B, null, f, Math.round(u.n * 6), 'are scorched by a song of chaos');
    else applyDamage(st, B, null, g, Math.round(u.n * 3), 'are caught in their own song of chaos');
  }
  function towerShoot(st, B, t) {
    const foes = B_.alive(B).filter(x => x.side === 0); if (!foes.length) return;
    const tg = foes.sort((a, b) => (b.n * (b.dmg[0] + b.dmg[1])) - (a.n * (a.dmg[0] + a.dmg[1])))[0];
    const hero = B.sides[1].heroId && st.heroes[B.sides[1].heroId];
    const d = Math.round((14 + B.siege.level * 6 + B.round * 2) * (1 + (hero ? S.skillVal(st, hero, 'siege') / 100 : 0)));
    B.anim.push({ kind: 'tower', from: [t.c, t.r], target: tg.uid });
    applyDamage(st, B, null, tg, d, 'are shot from the towers');
  }

  /* ======================= songs ======================= */
  B_.songPower = function (st, h, sid) {
    const sc = S.skill(st, h, 'songcraft');
    let p = 10 + sc * 8 + S.heroStat(st, h, 'Zikhron') * 2;
    if (['duatstep', 'dusklash', 'tide', 'nekhcall'].includes(sid)) p *= 1 + S.skillVal(st, h, 'duatcraft') / 200;
    return Math.round(p);
  };
  B_.canSingNow = function (st, B, side) {
    const sd = B.sides[side], h = sd.heroId && st.heroes[sd.heroId];
    const u = B_.activeUnit(B);
    return !!(h && u && u.side === side && !sd.sung && !sd.hushed && h.songs.length);
  };
  /* sing: {song, target (unit), c, r} */
  B_.sing = function (st, B, side, song, target, c, r) {
    const sd = B.sides[side], h = st.heroes[sd.heroId], S_ = D.SONGS[song];
    if (!B_.canSingNow(st, B, side) || !h.songs.includes(song) || S_.where !== 'battle') return { ok: false };
    if (h.breath < S_.breath) return { ok: false, why: 'Not enough Breath.' };
    const P = B_.songPower(st, h, song);
    const allies = B_.alive(B).filter(x => x.side === side), foes = B_.alive(B).filter(x => x.side !== side);
    const need = S_.target;
    if ((need === 'ally' || need === 'allyMove') && (!target || target.side !== side)) return { ok: false, why: 'Choose one of your stacks.' };
    if ((need === 'enemy' || need === 'enemyArea') && (!target || target.side === side)) return { ok: false, why: 'Choose an enemy stack.' };
    if (need === 'captain' && (!target || target.kind !== 'cap' || target.side !== side)) return { ok: false, why: 'Choose one of your captains.' };
    switch (song) {
      case 'mend': heal(B, target, P * 3); break;
      case 'rally': target.morale = Math.min(100, (target.morale == null ? 60 : target.morale) + 15 + (P > 40 ? 10 : 0)); break;
      case 'quickstep': target.fx.quick = 3; break;
      case 'dimsight': target.fx.dim = 3; break;
      case 'shroud': target.fx.shroud = 1; break;
      case 'hush': B.sides[1 - side].hushed = 2; break;
      case 'comfort': target.fx.comfort = 1; break;
      case 'weight': target.fx.slow = 3; break;
      case 'duatstep': if (c == null || !fits(B, c, r, target.shape, target.side, target)) return { ok: false, why: 'Choose an empty spot.' }; B.anim.push({ kind: 'blink', uid: target.uid, from: [target.c, target.r], to: [c, r] }); target.c = c; target.r = r; break;
      case 'ward': target.fx.ward = 1; break;
      case 'dusklash': applyDamage(st, B, null, target, P * 3, 'are lashed by shadow'); break;
      case 'massrally': allies.forEach(u => u.morale = Math.min(100, (u.morale == null ? 60 : u.morale) + 12)); break;
      case 'tide': foes.filter(u => u === target || B_.adjacent(u, target)).forEach(u => applyDamage(st, B, null, u, P * 2, 'are swept by the Tide of Shadows')); break;
      case 'massmend': allies.forEach(u => heal(B, u, P * 2)); break;
      case 'nekhcall': foes.filter(u => u === target || B_.adjacent(u, target)).forEach(u => applyDamage(st, B, null, u, P * 4, 'are swallowed by the ground')); break;
      default: return { ok: false };
    }
    h.breath -= S_.breath; sd.sung = true;
    B.anim.push({ kind: 'song', song, target: target ? target.uid : null, side });
    say(B, h.name + ' sings ' + S_.name + (target ? ' over the ' + target.name : '') + '.');
    checkOver(st, B);
    if (!B.active && !B.over) advance(st, B);
    return { ok: true };
  };

  /* ======================= surrender ======================= */
  B_.surrenderCost = function (st, B, side) {
    let g = 0; B_.alive(B).filter(u => u.side === side && u.kind === 'stack' && !u.temp).forEach(u => g += u.n * (D.CREATURES[u.cr].cost.gold || 100));
    return Math.max(500, Math.round(g * 0.5));
  };
  B_.surrender = function (st, B, side, cost) {
    const P = st.players[B.sides[side].owner];
    if (!P || P.res.gold < cost) return { ok: false, why: 'Not enough gold.' };
    P.res.gold -= cost; const other = B.sides[1 - side].owner; if (other >= 0) st.players[other].res.gold += cost;
    B.over = { winner: 1 - side, surrendered: side, cost }; B.active = null;
    say(B, B.sides[side].label + ' surrender, paying ' + cost + ' gold.');
    return { ok: true };
  };

  /* ======================= the computer's moves ======================= */
  B_.aiMove = function (st, B) {
    const u = B_.activeUnit(B); if (!u) return null;
    const side = u.side, foes = B_.alive(B).filter(x => x.side !== side);
    const sd = B.sides[side], h = sd.heroId && st.heroes[sd.heroId];
    /* sing first if there's a good song */
    if (h && B_.canSingNow(st, B, side)) {
      const pick = aiSong(st, B, side, h);
      if (pick) { const r = B_.sing(st, B, side, pick.song, pick.target); if (r.ok && !B.over && B_.activeUnit(B) === u) return B_.aiMove(st, B); }
    }
    const val = t => (t.n * (t.dmg[0] + t.dmg[1]) * (t.ranged ? 1.5 : 1) + (t.kind === 'cap' ? 300 : 0)) * (t.cr === 'mcfly' ? 0.05 : 1);
    if (B_.canShoot(B, u)) {
      const tg = foes.filter(t => !t.fx.shroud).sort((a, b) => val(b) * Math.min(1, B_.estimate(st, B, u, b, true) / (b.hp * b.n)) - val(a) * Math.min(1, B_.estimate(st, B, u, a, true) / (a.hp * a.n)))[0];
      if (tg) return B_.act(st, B, { type: 'shoot', target: tg });
    }
    /* siege: knock down the wall when it is in the way */
    if (B.siege && side === 0 && !u.fly) {
      if (u.abil.includes('boulder')) { const w = [...B.siege.cells.values()].filter(w => w.hp > 0).sort((a, b) => (b.gate ? 1 : 0) - (a.gate ? 1 : 0))[0]; if (w && R0(st) < 0.5) return B_.act(st, B, { type: 'boulder', c: w.c, r: w.r }); }
      const breached = [...B.siege.cells.values()].some(w => w.hp <= 0);
      if (!breached) {
        const w = [...B.siege.cells.values()].filter(w => w.hp > 0).sort((a, b) => HX.dist(u.c, u.r, a.c, a.r) - HX.dist(u.c, u.r, b.c, b.r))[0];
        if (w && cellsOf(u).some(([c, r]) => HX.dist(c, r, w.c, w.r) === 1)) return B_.act(st, B, { type: 'wall', c: w.c, r: w.r });
        if (w) { const reach = B_.reach(B, u); let best = null, bd = 1e9; reach.forEach(v => { const d = HX.dist(v.c, v.r, w.c, w.r); if (d < bd) { bd = d; best = v; } }); if (best && (best.c !== u.c || best.r !== u.r)) return B_.act(st, B, { type: 'move', c: best.c, r: best.r }); }
      }
    }
    const reach = B_.reach(B, u);
    let best = null, bestV = -1;
    foes.forEach(t => {
      const spots = B_.attackSpots(B, u, t, reach); if (!spots.length) return;
      const v = val(t) * Math.min(1.2, B_.estimate(st, B, u, t, false) / (t.hp * t.n)) + 1;
      if (v > bestV) { bestV = v; best = { t, s: spots[0] }; }
    });
    if (best) return B_.act(st, B, { type: 'attack', target: best.t, c: best.s.c, r: best.s.r });
    /* ranged units with no shots left, or far from everyone: close in */
    if (u.ranged && u.shots > 0) return B_.act(st, B, { type: 'defend' });
    let tgt = null, td = 1e9; foes.forEach(t => { const d = HX.dist(u.c, u.r, t.c, t.r); if (d < td) { td = d; tgt = t; } });
    if (tgt) { let bv = null, bd = 1e9; reach.forEach(v => { const d = HX.dist(v.c, v.r, tgt.c, tgt.r); if (d < bd) { bd = d; bv = v; } });
      if (bv && (bv.c !== u.c || bv.r !== u.r)) return B_.act(st, B, { type: 'move', c: bv.c, r: bv.r }); }
    return B_.act(st, B, { type: 'defend' });
  };
  function R0(st) { return SU.rng(st).next(); }
  function aiSong(st, B, side, h) {
    const has = s => h.songs.includes(s) && h.breath >= D.SONGS[s].breath && RU.canSing(st, h, s);
    const allies = B_.alive(B).filter(x => x.side === side && x.kind === 'stack'), foes = B_.alive(B).filter(x => x.side !== side);
    const hurt = allies.filter(u => u.n < u.startN * 0.7).sort((a, b) => b.hp * (b.startN - b.n) - a.hp * (a.startN - a.n))[0];
    const big = foes.slice().sort((a, b) => b.n * b.hp - a.n * a.hp)[0];
    if (has('massmend') && allies.filter(u => u.n < u.startN * 0.7).length >= 2) return { song: 'massmend' };
    if (has('nekhcall') && big) return { song: 'nekhcall', target: big };
    if (has('tide') && big) return { song: 'tide', target: big };
    if (hurt && has('mend')) return { song: 'mend', target: hurt };
    if (has('dusklash') && big) return { song: 'dusklash', target: big };
    if (B.round === 1 && has('massrally')) return { song: 'massrally' };
    const rangedFoe = foes.find(u => u.ranged && u.shots > 0);
    if (rangedFoe && has('dimsight')) return { song: 'dimsight', target: rangedFoe };
    if (B.round === 1 && has('quickstep') && allies[0]) return { song: 'quickstep', target: allies.sort((a, b) => b.n * b.hp - a.n * a.hp)[0] };
    return null;
  }
  /* run a whole battle with the computer on both sides (no person involved) */
  B_.autoRun = function (st, B) { let n = 0; while (!B.over && n++ < 4000) { if (!B.active) break; B_.aiMove(st, B); } if (!B.over) B.over = { winner: 1, timeout: true }; return B.over; };

  function say(B, t) { B.log.push(t); if (B.log.length > 200) B.log.shift(); }

  /* ======================= after the battle ======================= */
  /* write the survivors back into the armies, hand out XP and cores. Returns a report. */
  B_.finish = function (st, B, ctx) {
    ctx = ctx || {};
    const R = SU.rng(st), win = B.over.winner, lose = 1 - win;
    const rep = { winner: win, xp: 0, cores: [], capCores: [], lost: [[], []], heroDied: null, unlocked: false, stolen: B.stolen.slice(), surrendered: B.over.surrendered != null };
    const sideArmy = i => B.sides[i].armyId && st.armies[B.sides[i].armyId];
    const sideHero = i => B.sides[i].heroId && st.heroes[B.sides[i].heroId];
    /* creatures: survivors back into their stacks, in proportion */
    B.units.forEach(u => {
      if (u.kind !== 'stack' || !u.parts || u.temp) return;
      const tot = u.parts.reduce((t, p) => t + p.ref.n, 0);
      let left = u.n;
      /* mending: some of the winner's fallen recover */
      if (u.side === win) { const h = sideHero(win); if (h) left = Math.min(tot, left + Math.floor((tot - u.n) * S.skillVal(st, h, 'mending') / 100)); }
      if (u.cr === 'uff' && u.side === win) left = Math.min(tot, left + Math.floor((tot - u.n) * 0.2));
      const lost = tot - left; if (lost > 0) rep.lost[u.side].push({ cr: u.cr, n: lost });
      u.parts.forEach((p, k) => {
        const share = k === u.parts.length - 1 ? left : Math.round(left * p.ref.n / Math.max(1, tot));
        const before = p.ref.n; p.ref.n = Math.max(0, share); left -= p.ref.n;
        /* a fallen Nekh'Vorran frees its castle to call another */
        if (p.ref.cr === 'nekh' && p.ref.n === 0 && p.ref.home && st.objects[p.ref.home]) st.objects[p.ref.home].nekhCount = 0;
        const frac = before ? 1 - p.ref.n / before : 0;
        if (frac > 0.5) p.ref.grief = 2; else if (frac > 0.25) p.ref.grief = Math.max(p.ref.grief || 0, 1);
      });
    });
    /* XP for the winning hero: for creatures and squadrons beaten, not for heroes */
    const loserHadHero = !!B.sides[lose].heroId;
    let xp = 0; rep.lost[lose].forEach(l => xp += l.n * D.CREATURES[l.cr].hp);
    B.fallenCaps.forEach(f => { if (f.side === lose) xp += 100 * (f.cap.level || 1); });
    if (loserHadHero && !rep.surrendered) xp = Math.round(xp * 0.5);
    const wh = sideHero(win);
    if (wh) { rep.levelUps = RU.giveXp(st, wh, xp); rep.xp = xp; }
    /* fallen captains: their squadrons lose their leader; their cores go to the victor */
    const capCore = (f) => {
      if (f.ward) return;
      const core = M.captainCore(st, f.cap);
      rep.capCores.push(core.id);
      giveCoreTo(st, B, win, core, rep);
    };
    let wildCoreGiven = false;
    const wildStrong = i => B.sides[i].owner < 0 && B.sides[i].power0 > 15000;
    const loserCapCore = (f) => {
      if (f.side === lose && !wildCoreGiven && wildStrong(lose)) { wildCoreGiven = true; const c = M.wildCore(st, B.sides[lose].power0); giveCoreTo(st, B, win, c, rep); rep.cores.push(c.id); return; }
      capCore(f);
    };
    B.fallenCaps.forEach(f => { removeCaptain(st, B.sides[f.side].slots, f.cap.id); loserCapCore(f); });
    /* the loser */
    if (!rep.surrendered) {
      const la = sideArmy(lose), lh = sideHero(lose);
      /* every captain still standing on the losing side is lost too */
      S.captainsIn(B.sides[lose].slots).forEach(cap => loserCapCore({ side: lose, cap }));
      if (lh) { const k = RU.killHero(st, lh, B.layer, B.x, B.y, B.sides[win].owner, wh); rep.heroDied = lh.name; rep.cores.push(k.core.id); if (!k.taken) rep.coreDropped = true; }
      if (la) RU.removeArmy(st, la);
      if (B.sides[lose].townId) {
        const t = st.objects[B.sides[lose].townId];
        if (t) { t.garrison = [null, null, null, null, null]; if (lose === 1 && B.sides[win].owner >= 0 && sideArmy(win)) { RU.captureTown(st, t, B.sides[win].owner); const wa = sideArmy(win); S.moveArmyIndex(st, wa, t.layer, t.x, t.y); rep.captured = t.name; } }
      }
    } else {
      /* surrender: the hero and their army go home */
      const la = sideArmy(lose); if (la) { const t = S.townsOf(st, la.owner)[0]; if (t && la.heroId) { RU.stationHero(st, la, t); } else if (la) { RU.removeArmy(st, la); } }
    }
    /* tidy the winner's slots: empty stacks go */
    cleanSlots(B.sides[win].slots);
    const wa = sideArmy(win);
    if (wa && !wa.heroId && !wa.wild && !S.captainsIn(wa.slots).length) { rep.scattered = true; RU.removeArmy(st, wa); }
    if (wa && S.isEmptySlots(S.slotsOf(st, wa)) && !wa.heroId) RU.removeArmy(st, wa);
    /* the eye of the storm */
    if (B.inEye && B.sides[win].owner >= 0) {
      const P = st.players[B.sides[win].owner];
      P.stormWins = (P.stormWins || 0) + 1; rep.eyeWins = P.stormWins;
      if (!P.unlocked.includes('nekh')) { P.unlocked.push('nekh'); rep.unlocked = 'nekh'; S.log(st, P.name + ' won a battle in the eye of the Sunear’Zikhron. The Nekh’Vorran answers.', P.idx); }
    }
    if (B.killedMcfly[win] && wa) { wa.cursed = 1; wa.cursedUntil = st.day + 6; rep.cursed = true; }
    /* clearing wild creatures near a family's Urverk earns their respect: they let you pass free */
    if (B.sides[win].owner >= 0 && B.sides[lose].owner < 0 && !rep.surrendered) {
      Object.values(st.objects).forEach(o => { if (o.type === 'urverk' && o.toll && o.toll.alive && o.layer === B.layer && Math.hypot(o.x - B.x, o.y - B.y) <= 5 && !o.toll.respect[B.sides[win].owner]) {
        o.toll.respect[B.sides[win].owner] = 1; const l = st.objects[o.link]; if (l && l.toll) l.toll.respect[B.sides[win].owner] = 1; rep.respect = o.toll.family; } });
    }
    /* temporary armies (from the Duat) vanish */
    B.sides.forEach(s => { const a = s.armyId && st.armies[s.armyId]; if (a && a.temp) delete st.armies[a.id]; });
    RU.checkPlayers(st);
    return rep;
  };
  function giveCoreTo(st, B, side, core, rep) {
    const h = B.sides[side].heroId && st.heroes[B.sides[side].heroId];
    if (h && !h.dead) { if (core.kind === 'captain') h.cores.push(core.id); else RU.takeCore(st, h, core.id); return; }
    const spot = RU.freeNear(st, B.layer, B.x, B.y);
    if (spot) { const o = { id: SU.uid(st, 'o'), type: 'core', layer: B.layer, x: spot[0], y: spot[1], core: core.id }; st.objects[o.id] = o; S.place(st, o); }
  }
  function removeCaptain(st, slots, capId) {
    if (!slots) return;
    const i = slots.findIndex(s => s && s.kind === 'cap' && s.cap.id === capId); if (i < 0) return;
    const s = slots[i]; const stacks = s.stacks.concat(s.reserve || []).filter(x => x && x.n > 0);
    slots[i] = null;
    /* without a captain, a slot holds one stack; the rest find room or scatter */
    stacks.sort((a, b) => b.n * D.CREATURES[b.cr].hp - a.n * D.CREATURES[a.cr].hp);
    stacks.forEach((x, k) => { if (k === 0 && !slots[i]) { slots[i] = { kind: 'stack', cr: x.cr, n: x.n, grief: x.grief }; return; } RU.addToSlots(st, slots, x.cr, x.n, null, { noCap: true }); });
  }
  function cleanSlots(slots) {
    if (!slots) return;
    slots.forEach((s, i) => { if (!s) return; if (s.kind === 'stack' && s.n <= 0) slots[i] = null; else if (s.kind === 'cap') { s.stacks = s.stacks.filter(x => x && x.n > 0); s.reserve = (s.reserve || []).filter(x => x && x.n > 0); } });
  }
  B_._cleanSlots = cleanSlots;
})(typeof window !== 'undefined' ? window : globalThis);
