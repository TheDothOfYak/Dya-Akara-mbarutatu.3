/* ============================================================
   STRYX PILOT — js/sp_battle.js
   Boarding battles, in the spirit of the old hero-strategy games:
   the two decks side by side with open sky between them (except
   where the gangplanks and vines reach across), crews fighting as
   stacks (a kind of fighter and how many of them), each stack
   taking its turn by speed, striking back once a round, waiting,
   defending, shooting. Your Stryx is rooted in the pilot stump, so
   it never sets foot on the deck: like a hero of old it gives one
   order a round instead (lash, rally, seed flare, sail gust,
   binding roots), paid for with its will. The pirate captain has
   tricks of their own.

   No drawing here: the battle screen (sp_battle_view.js) shows it.
   Runs in node too (tests/test_stryx_pilot.js).

   Hexes: COLS × ROWS, "odd-r" (odd rows sit half a hex right).
   Side 'A' is yours (the left deck), side 'B' theirs (the right).
   ============================================================ */
(function (root) {
  'use strict';
  const SP = root.SP;
  const COLS = 13, ROWS = 7, GAPCOL = 6;
  const B = SP.Battle = { COLS, ROWS };

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const key = (c, r) => c + ',' + r;
  B.key = key;
  /* neighbours of a hex in odd-r layout */
  B.neighbours = function (c, r) {
    const odd = r & 1;
    const d = odd ? [[1, 0], [-1, 0], [0, -1], [1, -1], [0, 1], [1, 1]] : [[1, 0], [-1, 0], [-1, -1], [0, -1], [-1, 1], [0, 1]];
    return d.map(([dc, dr]) => [c + dc, r + dr]).filter(([x, y]) => x >= 0 && y >= 0 && x < COLS && y < ROWS);
  };
  function cube(c, r) { const x = c - (r - (r & 1)) / 2, z = r; return [x, -x - z, z]; }
  B.dist = function (a, b) { const p = cube(a[0], a[1]), q = cube(b[0], b[1]); return Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2])); };

  /* ================= setting up ================= */
  /* o: { mine: [{type,n}], theirs: [{type,n}], parts, seed, captainName } */
  B.create = function (o) {
    const r = rng(o.seed || 1);
    const S = { cells: {}, units: [], round: 0, queue: [], waited: [], turn: null, events: [], winner: null, r,
      parts: o.parts || { vines: 1, seed: 1 }, will: 0, maxWill: 0, castThisRound: false, captOrdered: false, start: {}, surrendered: false, joiners: null, captainName: o.captainName || 'the captain', nextId: 1 };
    S.maxWill = S.will = SP.WILL(S.parts);
    /* the decks: rounded hulls, a mast on each, a few crates; open sky between except where the planks and vines cross */
    for (let c = 0; c < COLS; c++) for (let rr = 0; rr < ROWS; rr++) {
      let t = 'deck';
      if (c === GAPCOL) t = 'gap';
      const edge = (rr === 0 || rr === ROWS - 1);
      if (edge && (c === 0 || c === COLS - 1 || c === GAPCOL - 1 || c === GAPCOL + 1)) t = 'gap';
      S.cells[key(c, rr)] = { c, r: rr, t };
    }
    const planks = [2, 4]; if (r() < 0.6) planks.push(r() < 0.5 ? 1 : 5);
    planks.forEach(rr => { S.cells[key(GAPCOL, rr)].t = 'plank'; });
    S.cells[key(3, 3)].t = 'mast'; S.cells[key(9, 3)].t = 'mast';
    const crate = (c0, c1) => { for (let tries = 0; tries < 20; tries++) { const c = c0 + Math.floor(r() * (c1 - c0 + 1)), rr = 1 + Math.floor(r() * (ROWS - 2)); const k = key(c, rr); if (S.cells[k].t === 'deck') { S.cells[k].t = 'crate'; return; } } };
    crate(2, 4); crate(2, 4); crate(8, 10); crate(8, 10);
    /* the crews */
    const place = (list, side) => {
      const cols = side === 'A' ? [1, 0, 2] : [COLS - 2, COLS - 1, COLS - 3];
      const rows = [3, 1, 5, 2, 4, 0, 6];
      let i = 0;
      list.filter(s => s && s.n > 0 && SP.UNITS[s.type]).forEach(s => {
        let spot = null;
        for (let k = i; k < 40 && !spot; k++) {
          const c = cols[Math.floor(k / rows.length) % cols.length], rr = rows[k % rows.length];
          const cell = S.cells[key(c, rr)];
          if (cell.t === 'deck' && !S.units.some(u => u.alive && u.c === c && u.r === rr)) { spot = [c, rr]; i = k + 1; }
        }
        if (!spot) return;
        const T = SP.UNITS[s.type];
        S.units.push({ id: S.nextId++, side, type: s.type, n: s.n, n0: s.n, hp: T.hp, c: spot[0], r: spot[1], shots: T.shots || 0, spdBonus: 0, rootT: 0, retaliated: false, defending: false, alive: true, escort: !!s.escort, morale: false });
      });
    };
    place(o.mine, 'A'); place(o.theirs, 'B');
    S.start.A = B.strength(S, 'A'); S.start.B = B.strength(S, 'B');
    B.newRound(S);
    return S;
  };
  B.unit = (S, id) => S.units.find(u => u.id === id);
  B.at = (S, c, r) => S.units.find(u => u.alive && u.c === c && u.r === r) || null;
  B.T = u => SP.UNITS[u.type];
  B.hpTotal = u => u.alive ? (u.n - 1) * B.T(u).hp + u.hp : 0;
  B.strength = (S, side) => S.units.filter(u => u.side === side && u.alive).reduce((s, u) => s + B.hpTotal(u), 0);
  B.speed = u => B.T(u).spd + u.spdBonus;
  function ev(S, e) { S.events.push(e); }

  /* ================= whose turn ================= */
  B.newRound = function (S) {
    S.round++;
    S.units.forEach(u => { u.retaliated = false; u.defending = false; u.waitedThisRound = false; });
    S.castThisRound = false; S.captOrdered = false;
    const alive = S.units.filter(u => u.alive);
    alive.sort((a, b) => B.speed(b) - B.speed(a) || (a.side === 'A' ? -1 : 1) - (b.side === 'A' ? -1 : 1) || a.id - b.id);
    S.queue = alive.map(u => u.id); S.waited = [];
    ev(S, { t: 'round', n: S.round });
    /* a beaten crew may strike its colours */
    if (!S.winner && S.round > 1 && !S.surrendered && B.strength(S, 'B') < S.start.B * 0.25 && B.strength(S, 'A') > B.strength(S, 'B') * 2.5) {
      S.surrendered = true; S.winner = 'A';
      /* some of the beaten crew offer to sign on with you */
      const best = S.units.filter(u => u.side === 'B' && u.alive && !B.T(u).captain).sort((a, b) => B.hpTotal(b) - B.hpTotal(a))[0];
      if (best) S.joiners = { type: best.type, n: Math.max(1, Math.ceil(best.n / 2)) };
      ev(S, { t: 'surrender' });
      return;
    }
    B.advance(S);
  };
  B.advance = function (S) {
    if (S.winner) return;
    const done = side => !S.units.some(u => u.side === side && u.alive);
    if (done('B')) { S.winner = 'A'; ev(S, { t: 'win', side: 'A' }); return; }
    if (done('A')) { S.winner = 'B'; ev(S, { t: 'win', side: 'B' }); return; }
    let id = null;
    while (S.queue.length && !id) { const k = S.queue.shift(); const u = B.unit(S, k); if (u && u.alive) id = k; }
    while (!id && S.waited.length) { const k = S.waited.shift(); const u = B.unit(S, k); if (u && u.alive) id = k; }
    if (!id) { B.newRound(S); return; }
    S.turn = id;
    const u = B.unit(S, id);
    if (u.rootT > 0) u.rootT--;
    ev(S, { t: 'turn', id });
  };
  /* after a stack acts: good morale may give it another go */
  function endTurn(S, u, mayMorale) {
    if (S.winner) return;
    if (mayMorale && u.alive && !S.winner) {
      const chance = u.morale ? 1 : (u.side === 'A' ? 0.07 : 0.04);
      if (S.r() < chance) { u.morale = false; ev(S, { t: 'morale', id: u.id }); S.turn = u.id; return; }
    }
    B.advance(S);
  }

  /* ================= where a stack can go ================= */
  B.passable = function (S, c, r, u) {
    const cell = S.cells[key(c, r)];
    if (!cell) return false;
    if (cell.t === 'mast' || cell.t === 'crate') return false;
    if (cell.t === 'gap' && !B.T(u).swing) return false;
    return true;
  };
  B.standable = (S, c, r, u) => { const cell = S.cells[key(c, r)]; return cell && (cell.t === 'deck' || cell.t === 'plank') && !B.at(S, c, r); };
  /* every hex this stack can reach this turn: key → { d, from } */
  B.reach = function (S, u) {
    const out = {}; out[key(u.c, u.r)] = { d: 0, from: null, c: u.c, r: u.r };
    if (u.rootT > 0) return out;
    const sp = B.speed(u), swing = !!B.T(u).swing;
    const q = [[u.c, u.r]];
    while (q.length) {
      const [c, r] = q.shift(), cur = out[key(c, r)];
      if (cur.d >= sp) continue;
      B.neighbours(c, r).forEach(([x, y]) => {
        const k = key(x, y);
        if (out[k] || !B.passable(S, x, y, u)) return;
        const occ = B.at(S, x, y);
        if (occ && !swing) return;
        out[k] = { d: cur.d + 1, from: key(c, r), c: x, r: y };
        q.push([x, y]);
      });
    }
    /* only hexes it can actually end on */
    Object.keys(out).forEach(k => { const o = out[k]; if (o.d > 0 && !B.standable(S, o.c, o.r, u)) o.through = true; });
    return out;
  };
  B.path = function (reach, c, r) { const p = []; let k = key(c, r); while (k && reach[k]) { const o = reach[k]; p.unshift([o.c, o.r]); k = o.from; } return p; };
  B.adjacentEnemy = (S, u) => B.neighbours(u.c, u.r).some(([x, y]) => { const o = B.at(S, x, y); return o && o.side !== u.side; });
  B.canShoot = (S, u) => u.shots > 0 && !B.adjacentEnemy(S, u);
  /* everything the stack whose turn it is may do */
  B.options = function (S, u) {
    const reach = B.reach(S, u);
    const moves = Object.values(reach).filter(o => o.d > 0 && !o.through);
    const attacks = [];
    S.units.filter(e => e.alive && e.side !== u.side).forEach(e => {
      B.neighbours(e.c, e.r).forEach(([x, y]) => {
        const o = reach[key(x, y)];
        if (o && !o.through) attacks.push({ target: e.id, from: [x, y], d: o.d });
      });
    });
    const shots = B.canShoot(S, u) ? S.units.filter(e => e.alive && e.side !== u.side).map(e => e.id) : [];
    return { reach, moves, attacks, shots };
  };

  /* ================= hitting ================= */
  B.expected = function (S, a, d, ranged) {
    const A = B.T(a), D = B.T(d);
    const avg = (A.dmg[0] + A.dmg[1]) / 2 * a.n;
    return Math.round(avg * B.mult(S, a, d, ranged));
  };
  B.mult = function (S, a, d, ranged) {
    const A = B.T(a), D = B.T(d);
    const def = D.def * (d.defending ? 1.3 : 1);
    const diff = A.atk - def;
    let m = diff >= 0 ? Math.min(4, 1 + diff * 0.05) : Math.max(0.3, 1 - (-diff) * 0.025);
    if (ranged && !A.duat && B.dist([a.c, a.r], [d.c, d.r]) > 7) m *= 0.5;
    if (!ranged && A.shots && !ranged) m *= 0.5;          // a shooter forced to fight hand to hand
    if (d.defending && D.brace) m *= 0.5;
    return m;
  };
  function roll(S, a) { const T = B.T(a); if (a.n <= 12) { let s = 0; for (let i = 0; i < a.n; i++) s += T.dmg[0] + Math.floor(S.r() * (T.dmg[1] - T.dmg[0] + 1)); return s; } return Math.round(a.n * (T.dmg[0] + S.r() * (T.dmg[1] - T.dmg[0]))); }
  /* damage into a stack: whole fighters fall, the top one is hurt */
  B.harm = function (S, d, dmg) {
    const T = B.T(d);
    let left = Math.max(0, Math.round(dmg)), kills = 0;
    while (left > 0 && d.n > 0) {
      if (left >= d.hp) { left -= d.hp; d.n--; kills++; d.hp = T.hp; }
      else { d.hp -= left; left = 0; }
    }
    if (d.n <= 0) { d.alive = false; d.n = 0; ev(S, { t: 'death', id: d.id }); }
    return kills;
  };
  function strike(S, a, d, ranged, retaliation) {
    const A = B.T(a), D = B.T(d);
    if (ranged && D.ethereal && S.r() < 0.5) { ev(S, { t: 'miss', att: a.id, def: d.id, ranged }); return; }
    let dmg = roll(S, a) * B.mult(S, a, d, ranged);
    const lucky = S.r() < 0.08;
    if (lucky) dmg *= 2;
    const kills = B.harm(S, d, dmg);
    ev(S, { t: 'hit', att: a.id, def: d.id, dmg: Math.round(dmg), kills, ranged: !!ranged, lucky, retaliation: !!retaliation });
  }
  /* a melee attack, with the defender striking back once a round */
  function melee(S, a, d) {
    const A = B.T(a), D = B.T(d);
    const canRet = () => d.alive && a.alive && !d.retaliated && !A.noRetaliate;
    if (D.firstStrike && canRet()) { d.retaliated = true; strike(S, d, a, false, true); }
    if (a.alive) strike(S, a, d, false, false);
    if (canRet()) { d.retaliated = true; strike(S, d, a, false, true); }
    if (A.twoAttacks && a.alive && d.alive) strike(S, a, d, false, false);
  }

  /* ================= actions ================= */
  function moveTo(S, u, c, r) {
    if (u.c === c && u.r === r) return true;
    const reach = B.reach(S, u), o = reach[key(c, r)];
    if (!o || o.through) return false;
    ev(S, { t: 'move', id: u.id, path: B.path(reach, c, r) });
    u.c = c; u.r = r;
    return true;
  }
  B.act = function (S, a) {
    const u = B.unit(S, S.turn);
    if (!u || S.winner) return false;
    if (a.t === 'move') { if (!moveTo(S, u, a.c, a.r)) return false; endTurn(S, u, true); return true; }
    if (a.t === 'attack') {
      const d = B.unit(S, a.target);
      if (!d || !d.alive || d.side === u.side) return false;
      if (B.dist([a.c, a.r], [d.c, d.r]) !== 1) return false;
      if (!moveTo(S, u, a.c, a.r)) return false;
      melee(S, u, d); endTurn(S, u, true); return true;
    }
    if (a.t === 'shoot') {
      const d = B.unit(S, a.target);
      if (!d || !d.alive || !B.canShoot(S, u)) return false;
      u.shots--; strike(S, u, d, true, false); endTurn(S, u, true); return true;
    }
    if (a.t === 'defend') { u.defending = true; ev(S, { t: 'defend', id: u.id }); endTurn(S, u, false); return true; }
    if (a.t === 'wait') {
      if (u.waitedThisRound) return false;
      u.waitedThisRound = true; S.waited.unshift(u.id); ev(S, { t: 'wait', id: u.id }); B.advance(S); return true;
    }
    return false;
  };
  /* your Stryx's orders (once a round, on one of your stacks' turns) */
  B.canCast = (S, o) => !S.winner && !S.castThisRound && S.will >= o.will && B.unit(S, S.turn) && B.unit(S, S.turn).side === 'A';
  B.cast = function (S, id, targetId) {
    const o = SP.ORDERS.find(x => x.id === id), t = B.unit(S, targetId);
    if (!o || !t || !t.alive || !B.canCast(S, o)) return false;
    if (o.target === 'enemy' && t.side !== 'B') return false;
    if (o.target === 'ally' && t.side !== 'A') return false;
    const pw = o.power(S.parts);
    S.will -= o.will; S.castThisRound = true;
    const hit = [];
    if (id === 'lash') hit.push([t, B.harm(S, t, pw)]);
    if (id === 'flare') { [t].concat(B.neighbours(t.c, t.r).map(([x, y]) => B.at(S, x, y)).filter(Boolean)).forEach(v => hit.push([v, B.harm(S, v, pw)])); }
    if (id === 'rally') {
      const T = B.T(t); let heal = pw * 3;
      const top = Math.min(heal, T.hp - t.hp); t.hp += top; heal -= top;
      while (heal >= T.hp && t.n < t.n0) { t.n++; heal -= T.hp; }
      t.morale = true;
    }
    if (id === 'gust') t.spdBonus = Math.ceil(B.T(t).spd * 0.5);
    if (id === 'roots') t.rootT = 2;
    ev(S, { t: 'cast', order: id, target: t.id, hits: hit.map(([v, k]) => ({ id: v.id, kills: k })) });
    const u = B.unit(S, S.turn);
    if (S.units.filter(v => v.side === 'B' && v.alive).length === 0 || (u && !u.alive)) B.advance(S);
    return true;
  };
  B.retreat = function (S) { if (S.winner) return; S.winner = 'B'; S.fled = true; ev(S, { t: 'fled' }); };

  /* ================= the enemy's mind (and yours, on auto) ================= */
  const threat = u => { const T = B.T(u); return (T.dmg[0] + T.dmg[1]) / 2 * u.n * (1 + T.atk * 0.05) * (T.shots && u.shots ? 1.4 : 1); };
  B.think = function (S) {
    const u = B.unit(S, S.turn);
    if (!u || S.winner) return null;
    const foes = S.units.filter(e => e.alive && e.side !== u.side);
    /* the captain's trick, now and then */
    const capt = S.units.find(v => v.alive && v.side === 'B' && B.T(v).captain);
    if (u.side === 'B' && capt && !S.captOrdered && S.r() < 0.35) {
      S.captOrdered = true;
      if (S.r() < 0.6) {
        const tg = foes.slice().sort(() => S.r() - 0.5).slice(0, 3);
        const hits = tg.map(v => ({ id: v.id, kills: B.harm(S, v, 4 + S.round) }));
        ev(S, { t: 'captain', order: 'storm', hits });
        if (!S.units.some(v => v.side === 'A' && v.alive)) { B.advance(S); return { t: 'none' }; }
      } else {
        const weak = foes.slice().sort((a, b) => B.hpTotal(a) - B.hpTotal(b))[0];
        const spot = weak && B.neighbours(weak.c, weak.r).find(([x, y]) => B.standable(S, x, y, u));
        if (spot && !B.T(u).captain) { ev(S, { t: 'captain', order: 'step', id: u.id, to: spot }); u.c = spot[0]; u.r = spot[1]; }
      }
    }
    const opt = B.options(S, u);
    /* shoot the most dangerous thing it can */
    if (opt.shots.length) {
      let best = null, bs = -1;
      opt.shots.forEach(id => { const e = B.unit(S, id); const exp = B.expected(S, u, e, true); const s = Math.min(exp, B.hpTotal(e)) * threat(e) / Math.max(1, B.hpTotal(e)); if (s > bs) { bs = s; best = id; } });
      return { t: 'shoot', target: best };
    }
    /* or get stuck in where it pays best */
    let best = null, bs = -1e9;
    opt.attacks.forEach(at => {
      const e = B.unit(S, at.target);
      const dealt = Math.min(B.expected(S, u, e, false), B.hpTotal(e));
      const back = B.T(u).noRetaliate || e.retaliated ? 0 : B.expected(S, e, u, false) * 0.5;
      const s = dealt * threat(e) / Math.max(1, B.hpTotal(e)) - back * 0.4 - at.d * 0.01;
      if (s > bs) { bs = s; best = at; }
    });
    if (best) return { t: 'attack', target: best.target, c: best.from[0], r: best.from[1] };
    /* nothing in reach: close the distance (shooters with no shots left, too) */
    let mv = null, md = 1e9;
    const nearest = c => Math.min.apply(null, foes.map(e => B.dist(c, [e.c, e.r])));
    opt.moves.forEach(o => { const d = nearest([o.c, o.r]) + o.d * 0.001; if (d < md) { md = d; mv = o; } });
    if (mv && md < nearest([u.c, u.r])) return { t: 'move', c: mv.c, r: mv.r };
    return { t: 'defend' };
  };
  B.aiStep = function (S) { const a = B.think(S); if (!a || a.t === 'none') return false; if (!B.act(S, a)) B.act(S, { t: 'defend' }); return true; };
  /* fight a whole battle with both sides thinking for themselves (tests, and "auto") */
  B.autoplay = function (S, maxSteps) { let n = 0; while (!S.winner && n++ < (maxSteps || 2000)) B.aiStep(S); return S; };

  /* ================= who is aboard a pirate ship ================= */
  /* a crew sized by the ship, your rank, and whether it is a wanted captain's */
  B.pirateCrew = function (faction, kind, rank, seed, wanted) {
    const r = rng(seed || 1), F = SP.FACTIONS[faction] || SP.FACTIONS.dusk, K = SP.SHIPKINDS[kind] || SP.SHIPKINDS.sloop;
    const budget = ({ sloop: 105, brig: 165, cutter: 150, galleon: 250 }[kind] || 110) * (1 + rank * 0.4) * (wanted ? 1.45 : 1);
    const out = [];
    const nStacks = Math.min(K.crew, F.units.length + 1);
    const captain = wanted || kind === 'galleon';
    let left = budget - (captain ? SP.UNITS.captain.hp : 0);
    const off = Math.floor(r() * F.units.length);
    for (let i = 0; i < nStacks; i++) {
      const type = F.units[(i + off) % F.units.length];
      const share = left / (nStacks - i) * (0.8 + r() * 0.4);
      const n = Math.max(1, Math.round(share / SP.UNITS[type].hp));
      left -= n * SP.UNITS[type].hp;
      const same = out.find(s => s.type === type);
      if (same) same.n += n; else out.push({ type, n });
    }
    if (captain) out.push({ type: 'captain', n: 1 });
    return out;
  };
  /* what your own crew is worth in a fight (for warnings before you board) */
  B.power = list => (list || []).reduce((s, x) => { const T = SP.UNITS[x.type]; return s + (T ? x.n * T.hp * (1 + T.atk * 0.04) * ((T.dmg[0] + T.dmg[1]) / 2) : 0); }, 0);

  /* ================= after the battle ================= */
  /* what is left of your crew, as stacks to keep */
  B.survivors = (S, side) => S.units.filter(u => u.side === (side || 'A') && u.alive && !u.escort).map(u => ({ type: u.type, n: u.n }));
})(typeof window !== 'undefined' ? window : globalThis);
