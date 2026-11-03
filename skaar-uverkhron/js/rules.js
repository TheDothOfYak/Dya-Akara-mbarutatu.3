/* ============================================================
   SKAAR UVERKHRON — js/rules.js
   The adventure-map rules: movement and paths, visiting things,
   towns and recruiting, the tavern and training halls, memory
   cores and the Kahizecvar, Urverk crossings, the storm, and the
   turn of the days.

   Anything that needs a decision returns { need: ... } and the
   caller (the screen, or the computer player) answers it.
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU, D = SU.data, S = SU.state, M = SU.make;
  const R_ = SU.rules = {};

  /* ======================= army numbers ======================= */
  R_.capCapacity = function (st, cap, hero) {
    if (cap.elite) return 1;   /* the peerless lead one stack, and only one */
    let c = cap.capacity || 2;
    if (hero) c += S.skillVal(st, hero, 'captaincy');
    return Math.min(c, 5);
  };
  R_.capUsed = cap => (cap.stacks || []).reduce((t, s) => t + (s ? (D.CREATURES[s.cr].capSlots || 1) : 0), 0);
  R_.slowest = function (slots) {
    let m = 99; S.stacksIn(slots).forEach(s => { if (s.n > 0) m = Math.min(m, D.CREATURES[s.cr].spd); });
    S.captainsIn(slots).forEach(c => m = Math.min(m, D.CAPTAIN_BASE.spd + 2));
    return m === 99 ? 6 : m;
  };
  R_.mpMax = function (st, a) {
    const h = S.heroOf(st, a), slots = S.slotsOf(st, a);
    let mp = 1100 + R_.slowest(slots) * 45;
    if (h) mp += S.heroStat(st, h, 'Stride') * 90, mp *= 1 + S.skillVal(st, h, 'wayfind') / 100;
    if (!h) { const cap = S.captainsIn(slots)[0]; if (cap && cap.abil === 'duatwalker') mp *= 1.15; }
    if (R_.mounted(st, a)) mp *= 1.25;
    if (a.boat) mp = 1500 * (1 + (h ? S.skillVal(st, h, 'seafaring') / 100 : 0));
    return Math.round(mp);
  };
  /* punk mounts (for travel only: nobody rides them into battle) */
  R_.mountsOf = (st, a) => a.heroId ? (st.heroes[a.heroId].mounts || 0) : (a.mounts || 0);
  R_.mounted = (st, a) => { const n = S.stacksIn(S.slotsOf(st, a)).filter(x => x.n > 0).length; return n > 0 && R_.mountsOf(st, a) >= n; };
  R_.addMounts = (st, a, k) => { if (a.heroId) st.heroes[a.heroId].mounts = (st.heroes[a.heroId].mounts || 0) + k; else a.mounts = (a.mounts || 0) + k; };
  R_.MOUNT_COST = 120;
  R_.sight = function (st, a) {
    const h = S.heroOf(st, a); let r = 5;
    if (h) r += S.skillVal(st, h, 'scouting') + S.relicMod(st, h, 'sight');
    else { const cap = S.captainsIn(S.slotsOf(st, a))[0]; if (cap && cap.abil === 'scout') r += 3; r -= 1; }
    return r;
  };
  R_.canFly = function (st, a) {
    const slots = S.slotsOf(st, a), stacks = S.stacksIn(slots).filter(s => s.n > 0);
    if (!stacks.length || !stacks.every(s => D.CREATURES[s.cr].fly)) return false;
    const h = S.heroOf(st, a);
    return h ? h.mount === 'kuni' : S.captainsIn(slots).every(c => c.fly);
  };

  /* ======================= paths ======================= */
  R_.stepCost = function (st, a, layer, x0, y0, x1, y1, opts) {
    const L = st.layers[layer], i = y1 * L.w + x1, diag = x0 !== x1 && y0 !== y1;
    let c;
    if (a.boat) c = 100;
    else if (L.road[i] && L.road[y0 * L.w + x0]) c = D.ROAD_COST;
    else {
      const tt = S.TCODES[L.t[i]], td = D.TERRAIN[tt];
      c = td.cost;
      if (tt === 'dusk') c = 100;
      if (a.pathsong === st.day) c = Math.min(c, 100);
    }
    if (R_.inStorm(st, layer, x1, y1)) c *= 1.5;
    return Math.round(diag ? c * 1.41 : c);
  };
  /* A* from the army to (tx,ty). The goal may be an object or army (you stop on it). */
  R_.path = function (st, a, tx, ty, popts) {
    const layer = a.layer, L = st.layers[layer], w = L.w;
    if (!S.inside(L, tx, ty)) return null;
    const fly = R_.canFly(st, a), boat = a.boat, P = st.players[a.owner];
    const goal = ty * w + tx, start = a.y * w + a.x;
    const goalObj = S.objAt(st, layer, tx, ty), goalArmy = S.armyAt(st, layer, tx, ty);
    const ok = (x, y) => {
      const i = y * w + x;
      if (P && !P.explored[layer][i] && i !== goal) return false;
      if (i === goal) {
        if (goalObj || goalArmy) return true;
        if (boat) return S.passable(st, layer, x, y, { boat: true }) || S.passable(st, layer, x, y);
        return S.passable(st, layer, x, y, { fly }) || (!fly && boatAt(st, layer, x, y));
      }
      if (S.objAt(st, layer, x, y)) return false;
      const ar = S.armyAt(st, layer, x, y); if (ar && !(popts && popts.throughWild && ar.wild)) return false;
      if (popts && popts.avoid && popts.avoid(x, y)) return false;
      return boat ? S.passable(st, layer, x, y, { boat: true }) : S.passable(st, layer, x, y, { fly });
    };
    if (!ok(tx, ty)) return null;
    const g = new Float32Array(w * L.h).fill(Infinity), prev = new Int32Array(w * L.h).fill(-1);
    g[start] = 0;
    const heap = [[0, start]];
    const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    let n = 0;
    while (heap.length && n++ < 60000) {
      const [, i] = pop(); if (i === goal) break;
      const x = i % w, y = (i / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const xx = x + dx, yy = y + dy;
        if (!S.inside(L, xx, yy) || !ok(xx, yy)) continue;
        const j = yy * w + xx; const ng = g[i] + R_.stepCost(st, a, layer, x, y, xx, yy);
        if (ng < g[j]) { g[j] = ng; prev[j] = i; push(ng + Math.max(Math.abs(tx - xx), Math.abs(ty - yy)) * 70, j); }
      }
    }
    if (prev[goal] < 0 && goal !== start) return null;
    const out = []; for (let i = goal; i !== start && i >= 0; i = prev[i]) out.push({ x: i % w, y: (i / w) | 0, g: g[i] });
    out.reverse();
    return out;
  };
  function boatAt(st, layer, x, y) { const o = S.objAt(st, layer, x, y); return o && o.type === 'boat'; }

  /* ======================= stepping ======================= */
  /* move one tile along a path. Returns {moved, stop, event} */
  R_.step = function (st, a, nx, ny) {
    const cost = R_.stepCost(st, a, a.layer, a.x, a.y, nx, ny);
    if (a.mp < cost && a.mp < a.mpMax) return { moved: false, stop: true, why: 'tired' };
    const obj = S.objAt(st, a.layer, nx, ny), other = S.armyAt(st, a.layer, nx, ny);
    a.face = nx > a.x ? 1 : nx < a.x ? -1 : a.face;
    /* bumping into something: visit it without stepping (except towns, which you enter) */
    if (other && other.id !== a.id) {
      a.mp = Math.max(0, a.mp - cost);
      if (other.owner === a.owner) return { moved: false, stop: true, event: { kind: 'meet', other } };
      if (other.owner >= 0 && S.allies(st, a.owner, other.owner)) return { moved: false, stop: true };
      if (other.wild && other.herd) return { moved: false, stop: true, event: { kind: 'herd', other } };
      return { moved: false, stop: true, event: { kind: 'battle', attacker: a, defender: other } };
    }
    if (obj && obj.type !== 'town' && obj.type !== 'boat') {
      a.mp = Math.max(0, a.mp - cost);
      if (obj.type === 'urverk') return { moved: false, stop: true, event: { kind: 'urverk', obj } };
      if (obj.type === 'mine' && obj.owner !== a.owner) { R_.flagMine(st, obj, a.owner); return { moved: false, stop: true, event: { kind: 'flagged', obj } }; }
      return R_.visit(st, a, obj);
    }
    if (obj && obj.type === 'town') {
      if (obj.owner !== a.owner && !(obj.owner >= 0 && S.allies(st, obj.owner, a.owner))) {
        a.mp = Math.max(0, a.mp - cost);
        if (!a.heroId) return { moved: false, stop: true, msg: 'A squadron without a hero cannot take a town.' };
        if (obj.sealed > 0) return { moved: false, stop: true, msg: obj.name + ' is sealed by a song. Nobody can attack it for ' + SU.plural(obj.sealed, 'more day') + '.' };
        const defenders = R_.townDefense(st, obj);
        if (!defenders) { R_.captureTown(st, obj, a.owner); moveTo(st, a, nx, ny, cost); return { moved: true, stop: true, event: { kind: 'captured', obj } }; }
        return { moved: false, stop: true, event: { kind: 'siege', attacker: a, town: obj } };
      }
    }
    /* boats */
    if (!a.boat && obj && obj.type === 'boat') { S.unplace(st, obj); delete st.objects[obj.id]; a.boat = true; moveTo(st, a, nx, ny, cost); a.mp = 0; return { moved: true, stop: true, msg: 'All aboard.' }; }
    if (a.boat && D.TERRAIN[S.terrainAt(st.layers[a.layer], nx, ny)].pass !== false && !D.TERRAIN[S.terrainAt(st.layers[a.layer], nx, ny)].water) {
      const boat = { id: SU.uid(st, 'o'), type: 'boat', layer: a.layer, x: a.x, y: a.y, owner: a.owner };
      a.boat = false; moveTo(st, a, nx, ny, cost); a.mp = 0;
      st.objects[boat.id] = boat; S.place(st, boat);
      return { moved: true, stop: true, msg: 'Ashore.' };
    }
    moveTo(st, a, nx, ny, cost);
    if (obj && obj.type === 'town') {
      if (a.corral && obj.owner === a.owner) { obj.punks = (obj.punks || 0) + a.corral.n; S.log(st, 'The farmers of ' + obj.name + ' take in ' + a.corral.n + ' ' + D.CREATURES[a.corral.cr].plural + '.', a.owner); a.corral = null; }
      return { moved: true, stop: true, event: { kind: 'town', obj } };
    }
    /* bad luck: some of a stack trip and fall on their own swords */
    const luck = R_.armyLuck(st, a);
    if (luck < 0 && SU.rng(st).chance(-luck * 0.012)) {
      const st_ = S.stacksIn(S.slotsOf(st, a)).filter(s => s.n > 3); if (st_.length) { const s = SU.rng(st).pick(st_); const lost = Math.max(1, Math.round(s.n * 0.04)); s.n -= lost; S.log(st, 'Bad luck: ' + lost + ' ' + D.CREATURES[s.cr].plural + ' tripped and fell on their own blades.', a.owner); }
    }
    /* guards: stepping next to a wild group that guards something starts a fight */
    const guard = adjacentGuard(st, a);
    if (guard) return { moved: true, stop: true, event: { kind: 'battle', attacker: guard, defender: a, ambush: true } };
    return { moved: true };
  };
  function moveTo(st, a, x, y, cost) {
    a.mp = Math.max(0, a.mp - cost);
    S.moveArmyIndex(st, a, a.layer, x, y);
    S.reveal(st, a.owner, a.layer, x, y, R_.sight(st, a));
  }
  R_.guardNear = function (st, layer, x, y) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; const o = S.armyAt(st, layer, x + dx, y + dy);
      if (o && o.wild && !o.herd && o.guard && !o.dead) return o;
    }
    return null;
  };
  function adjacentGuard(st, a) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; const o = S.armyAt(st, a.layer, a.x + dx, a.y + dy);
      if (o && o.wild && !o.herd && o.guard && !o.dead) return o;
    }
    return null;
  }

  /* ======================= visiting ======================= */
  R_.flagMine = function (st, o, owner) {
    const prev = o.owner; o.owner = owner;
    if (owner >= 0) S.log(st, st.players[owner].name + ' took the ' + D.MINES[o.kind].name + '.', owner);
    if (prev >= 0 && prev !== owner) SU.emit('lost', { owner: prev, what: D.MINES[o.kind].name });
  };
  R_.visit = function (st, a, o) {
    const h = S.heroOf(st, a), P = st.players[a.owner], R = SU.rng(st);
    const plunder = 1 + S.skillVal(st, h, 'plunder') / 100;
    const gone = () => { o.gone = true; S.unplace(st, o); delete st.objects[o.id]; };
    switch (o.type) {
      case 'pile': {
        const amt = Math.round(o.amt * plunder); P.res[o.res] += amt; gone();
        return { stop: true, msg: 'Found ' + amt + ' ' + D.RES_INFO[o.res].name + '.', res: o.res };
      }
      case 'chest':
        if (!h) { const g = Math.round(o.gold * plunder); P.res.gold += g; gone(); return { stop: true, msg: 'The squadron opens the chest: ' + g + ' gold.' }; }
        return { stop: true, need: 'chest', obj: o };
      case 'relic':
        if (!h) return { stop: true, msg: 'A squadron has no pockets for a Relic. A hero must come for it.' };
        R_.giveRelic(st, h, o.relic); gone();
        return { stop: true, msg: h.name + ' found ' + D.RELICS[o.relic].name + '.', relic: o.relic };
      case 'scroll':
        if (!h) return { stop: true, msg: 'Only a hero can carry a song scroll.' };
        if (R_.learnSong(st, h, o.song)) { gone(); return { stop: true, msg: h.name + ' learned the song ' + D.SONGS[o.song].name + '.' }; }
        return { stop: true, msg: 'A scroll of ' + D.SONGS[o.song].name + ' (tier ' + D.SONGS[o.song].tier + '). ' + h.name + ' needs Songcraft ' + D.SONGS[o.song].tier + ' to learn it.' };
      case 'core':
        if (!h) return { stop: true, msg: 'A memory core. A squadron cannot pick it up: a hero must.' };
        R_.takeCore(st, h, o.core); gone();
        return { stop: true, msg: h.name + ' took up the memory core of ' + st.cores[o.core].name + '.', core: o.core };
      case 'visit': return visitPlace(st, a, h, P, o, R);
      case 'vision':
        if (!h) return { stop: true, msg: 'Something of the worm lies here. Only a hero can carry it.' };
        R_.giveRelic(st, h, 'nekhprint'); gone(); if (st.players[o.seer]) st.players[o.seer].vision = null;
        return { stop: true, msg: h.name + ' has found the Rokarvac of the Nekh! Carry it into a town to build the Nekh Hollow there.', relic: 'nekhprint' };
    }
    return { stop: true };
  };
  function visitPlace(st, a, h, P, o, R) {
    const V = D.VISIT[o.kind]; const key = h ? h.id : a.id;
    if (V.stat) {
      if (!h) return { stop: true, msg: V.name + ': only a hero can learn here.' };
      if (o.visited[h.id]) return { stop: true, msg: h.name + ' has already been to the ' + V.name + '.' };
      o.visited[h.id] = 1; h.stats[V.stat]++;
      return { stop: true, msg: V.name + ': ' + h.name + ' gains +1 ' + V.stat + '.' };
    }
    if (V.xp) {
      if (!h) return { stop: true, msg: V.name + ': only a hero can learn here.' };
      if (o.visited[h.id]) return { stop: true, msg: h.name + ' has already been to the ' + V.name + '.' };
      o.visited[h.id] = 1; R_.giveXp(st, h, V.xp); if (V.breath) h.breath = M.breathMax(st, h);
      return { stop: true, msg: V.name + ': ' + h.name + ' gains ' + V.xp + ' experience' + (V.breath ? ' and breathes deep.' : '.') };
    }
    switch (o.kind) {
      case 'tower': S.reveal(st, a.owner, a.layer, o.x, o.y, 16); return { stop: true, msg: 'From the Watchtower you can see a long way.' };
      case 'spring': {
        const wk = S.cal(st.day).weekAbs; if (!h) return { stop: true, msg: 'The spring sings, but no one here can use Breath.' };
        if (o.visited[h.id] === wk) return { stop: true, msg: 'The spring is quiet. Come back next week.' };
        o.visited[h.id] = wk; h.breath = M.breathMax(st, h); return { stop: true, msg: h.name + '’s Breath is full.' };
      }
      case 'camp': {
        const wk = S.cal(st.day).weekAbs; if (o.visited.wk === wk) return { stop: true, msg: 'The wanderers have moved on. More may come next week.' };
        o.visited.wk = wk; const n = R.int(4, 10) + Math.floor(st.day / 6);
        return { stop: true, need: 'join', offer: { cr: R.pick(['velnur', 'ver', 'velnur']), n }, obj: o };
      }
      case 'songstone':
        if (!h) return { stop: true, msg: 'A Song Stone. Only a hero can learn from it.' };
        if (R_.learnSong(st, h, o.song)) return { stop: true, msg: h.name + ' learns ' + D.SONGS[o.song].name + ' from the stone.' };
        return { stop: true, msg: 'The stone holds ' + D.SONGS[o.song].name + ' (tier ' + D.SONGS[o.song].tier + '). ' + (S.skill(st, h, 'songcraft') ? 'Your Songcraft is not high enough yet.' : 'Only a hero with Songcraft can learn it.') };
      case 'seer': return { stop: true, need: 'quest', obj: o };
      case 'trainer': {
        if (!h) return { stop: true, msg: 'The trainer only teaches heroes.' };
        const wk = S.cal(st.day).weekAbs; if (o.visited[h.id] === wk) return { stop: true, msg: 'The trainer has taught you all they can this week.' };
        return { stop: true, need: 'trainer', obj: o };
      }
      case 'tavern': return { stop: true, need: 'tavern', obj: o };
      case 'fair': return { stop: true, need: 'fair', obj: o };
      case 'shipyard': return { stop: true, need: 'shipyard', obj: o };
      case 'shrine':
        if (!h) return { stop: true, msg: 'The Kalo of the shrine will speak only with a hero.' };
        return { stop: true, need: 'shrine', obj: o };
      case 'aerie':
        if (!h) return { stop: true, msg: 'Kuni Byrds wheel overhead. Only a hero could hope to ride one.' };
        if (o.taken) return { stop: true, msg: 'The aerie is empty now.' };
        if (S.skill(st, h, 'beasts') < 3) return { stop: true, msg: 'The Kuni Byrds will not let ' + h.name + ' near. It takes Beastmastery 3 to win one.' };
        return { stop: true, need: 'aerie', obj: o };
    }
    return { stop: true };
  }

  /* ======================= relics, songs, cores ======================= */
  R_.giveRelic = function (st, h, rid) {
    const r = D.RELICS[rid]; const slots = r.slot === 'ring' ? ['ring', 'ring2'] : r.slot === 'misc' ? ['misc', 'misc2', 'misc3'] : [r.slot];
    const free = slots.find(s => !h.relics[s]);
    if (free) h.relics[free] = rid; else (h.pack = h.pack || []).push(rid);
    h.breath = Math.min(h.breath, M.breathMax(st, h));
  };
  R_.equip = function (st, h, rid, fromPack) {
    const r = D.RELICS[rid]; const slots = r.slot === 'ring' ? ['ring', 'ring2'] : r.slot === 'misc' ? ['misc', 'misc2', 'misc3'] : [r.slot];
    const slot = slots.find(s => !h.relics[s]) || slots[0];
    const old = h.relics[slot]; h.relics[slot] = rid;
    h.pack = (h.pack || []).filter((x, i) => !(x === rid && i === h.pack.indexOf(rid)));
    if (old) h.pack.push(old);
  };
  R_.unequip = function (st, h, slot) { const r = h.relics[slot]; if (!r) return; delete h.relics[slot]; (h.pack = h.pack || []).push(r); };
  R_.canSing = (st, h, sid) => S.skill(st, h, 'songcraft') >= D.SONGS[sid].tier;
  R_.learnSong = function (st, h, sid) { if (!R_.canSing(st, h, sid)) return false; if (!h.songs.includes(sid)) h.songs.push(sid); return true; };
  R_.takeCore = function (st, h, cid) {
    const core = st.cores[cid]; if (!core) return;
    if (core.kind === 'hero') { M.drawOffer(st, core, h); (core.songs || []).forEach(s => R_.learnSong(st, h, s)); }
    if (core.kind === 'hero' && h.pouch.length < 3) h.pouch.push(cid); else h.cores.push(cid);
  };
  R_.setCoreActive = function (st, h, cid, picks) { const c = st.cores[cid]; if (!c || picks.length > 2) return; c.active = picks.slice(0, 2); };
  R_.swapCore = function (st, h, cid) {   // move between the pouch and the carried cores
    if (h.pouch.includes(cid)) { h.pouch = h.pouch.filter(x => x !== cid); h.cores.push(cid); }
    else if (h.pouch.length < 3) { h.cores = h.cores.filter(x => x !== cid); h.pouch.push(cid); }
  };
  R_.kahizCost = h => { const m = Math.pow(2, h.kahizCount || 0); const c = { gold: 5000 * m }; D.RES.forEach(r => { if (r !== 'gold') c[r] = 10 * m; }); return c; };
  R_.kahizecvar = function (st, h, shrine, cid, picks) {
    const P = st.players[h.owner], cost = R_.kahizCost(h), core = st.cores[cid];
    if (!core || core.kind !== 'hero' || !h.pouch.includes(cid)) return { ok: false, why: 'Choose a core from the pouch.' };
    if (shrine.visited[h.id] === 'kahiz') return { ok: false, why: 'You have already done the Kahizecvar at this shrine.' };
    if (!R_.afford(P, cost)) return { ok: false, why: 'Not enough to pay for the Kahizecvar.' };
    if (picks.length !== Math.min(3, core.offer.length)) return { ok: false, why: 'Choose 3 skills.' };
    R_.pay(P, cost);
    picks.forEach(i => { const s = core.offer[i]; h.skills[s.id] = Math.max(h.skills[s.id] || 0, s.lv); });
    h.pouch = h.pouch.filter(x => x !== cid); delete st.cores[cid];
    h.kahizCount = (h.kahizCount || 0) + 1; shrine.visited[h.id] = 'kahiz';
    h.breath = Math.min(h.breath, M.breathMax(st, h));
    S.log(st, h.name + ' merged with a memory core in the Kahizecvar at ' + (shrine.moon || 'a Kalo Shrine') + '.', h.owner);
    return { ok: true };
  };
  /* the Kalo who keep a shrine sometimes want something done first */
  R_.shrineQuest = function (st, shrine, h) {
    if (shrine.quest === undefined || shrine.quest === null) {
      const R = SU.rng(st);
      shrine.quest = R.chance(0.55) ? (R.chance(0.5) ? { kind: 'bring', res: R.pick(['glowmoss', 'timber', 'ngakara']), amt: R.int(4, 8) } : { kind: 'gold', amt: R.pick([3000, 4000, 5000]) }) : false;
    }
    return shrine.quest;
  };

  /* ======================= towns ======================= */
  R_.afford = (P, cost) => Object.entries(cost || {}).every(([k, v]) => (P.res[k] || 0) >= v);
  R_.pay = (P, cost) => Object.entries(cost || {}).forEach(([k, v]) => P.res[k] -= v);
  R_.has = (t, bid) => t.built.includes(bid) || Object.values(D.BUILDINGS).some(b => b.replaces === bid && R_.has(t, b.id));
  R_.housing = t => t.built.reduce((s, b) => s + (D.BUILDINGS[b].housing || 0), 0);
  R_.buildsPerDay = function (st, t) {
    let n = 1; if (t.pop >= 900) n++;
    const keilia = (t.heroes || []).map(id => st.heroes[id]).filter(h => h && h.people === 'keilia').length;
    if (keilia >= 2 && t.pop >= 500) n++;
    return n;
  };
  R_.canBuild = function (st, t, bid) {
    const b = D.BUILDINGS[bid], P = st.players[t.owner];
    if (t.built.includes(bid)) return { ok: false, why: 'Built.' };
    if (b.replaces && !t.built.includes(b.replaces) && !R_.has(t, b.replaces)) return { ok: false, why: 'Needs ' + D.BUILDINGS[b.replaces].name + ' first.' };
    if (Object.values(D.BUILDINGS).some(x => x.replaces === bid && R_.has(t, x.id))) return { ok: false, why: 'Built.' };
    for (const r of (b.req || [])) if (!R_.has(t, r)) return { ok: false, why: 'Needs ' + D.BUILDINGS[r].name + '.' };
    if (['d3', 'd4', 'd5', 'd6'].includes(bid) && !R_.has(t, 'fort1')) return { ok: false, why: 'Needs walls.' };
    if (b.pop && t.pop < b.pop) return { ok: false, why: 'Needs ' + b.pop + ' people (the town has ' + Math.floor(t.pop) + ').' };
    if (b.coast && !t.coast) return { ok: false, why: 'This town is not by the water.' };
    if (b.unlock && !R_.blueprintHere(st, t)) return { ok: false, why: 'A hero must bring the Rokarvac of the Nekh into this town. End a turn in the eye of the Sunear’Zikhron for a vision of where it lies.' };
    const small = b.small;
    const limit = R_.buildsPerDay(st, t) + (small && !t.smallToday ? 1 : 0);
    if (t.builtToday >= limit) return { ok: false, why: 'Already built today.' };
    if (!R_.afford(P, b.cost)) return { ok: false, why: 'Not enough resources.', poor: true };
    return { ok: true };
  };
  R_.build = function (st, t, bid) {
    const chk = R_.canBuild(st, t, bid); if (!chk.ok) return chk;
    const b = D.BUILDINGS[bid], P = st.players[t.owner];
    R_.pay(P, b.cost);
    if (b.replaces) t.built = t.built.filter(x => x !== b.replaces);
    t.built.push(bid);
    if (b.small && !t.smallToday && t.builtToday >= R_.buildsPerDay(st, t)) t.smallToday = 1; else t.builtToday++;
    if (b.dwell && b.dwell !== 'nekh') t.avail[b.dwell] = (t.avail[b.dwell] || 0) + D.CREATURES[b.dwell].grow;
    if (bid === 'd9' && !t.nekhCount) t.avail.nekh = 1;
    S.log(st, t.name + ' built the ' + b.name + '.', t.owner);
    return { ok: true };
  };
  /* which creature a dwelling sells: its upgraded form if that's built */
  R_.dwellingCreature = function (t, tier) {
    const base = D.DUSK_LINEUP[tier - 1];
    const up = D.CREATURES[base].up;
    return { base, up: up && Object.values(D.BUILDINGS).some(b => b.dwellUp === up && t.built.includes(b.id)) ? up : null };
  };
  R_.townDwellings = function (t) {
    const out = [];
    D.DUSK_LINEUP.forEach((cr, i) => { const b = Object.values(D.BUILDINGS).find(b => b.dwell === cr); if (b && t.built.includes(b.id)) out.push({ tier: i + 1, base: cr, up: R_.dwellingCreature(t, i + 1).up, bid: b.id }); });
    return out;
  };
  R_.recruitCost = function (cr, n) { const c = D.CREATURES[cr].cost, o = {}; Object.entries(c).forEach(([k, v]) => o[k] = v * n); return o; };
  R_.maxRecruit = function (st, t, cr, base) {
    const P = st.players[t.owner], c = D.CREATURES[cr];
    let n = t.avail[base] || 0;
    Object.entries(c.cost).forEach(([k, v]) => n = Math.min(n, Math.floor((P.res[k] || 0) / v)));
    if (c.pop) n = Math.min(n, Math.floor(t.pop - 40));
    if (cr === 'nekh') n = Math.min(n, t.nekhCount ? 0 : 1);
    return Math.max(0, n);
  };
  /* put n of a creature into a set of slots: join a matching single stack, else a free slot.
     A captain's squadron takes the creature too if it has room. Returns true if placed. */
  R_.addToSlots = function (st, slots, cr, n, hero, opts) {
    const c = D.CREATURES[cr];
    if (c.legendary) { const has = S.stacksIn(slots).some(s => D.CREATURES[s.cr].legendary && s.n > 0); if (has) return false; }
    for (const s of slots) if (s && s.kind === 'stack' && s.cr === cr) { s.n += n; return true; }
    if (!c.legendary && !(opts && opts.noCap)) for (const s of slots) if (s && s.kind === 'cap') { for (const x of s.stacks) if (x && x.cr === cr) { x.n += n; return true; } }
    const i = slots.findIndex(s => !s);
    if (i >= 0) { slots[i] = { kind: 'stack', cr, n: c.legendary ? 1 : n }; return true; }
    if (!c.legendary) for (const s of slots) if (s && s.kind === 'cap' && R_.capUsed(s.cap ? s : s) + (c.capSlots || 1) <= R_.capCapacity(st, s.cap, hero)) { s.stacks.push({ cr, n }); return true; }
    return false;
  };
  R_.recruit = function (st, t, cr, base, n, slots, hero) {
    const P = st.players[t.owner]; n = Math.min(n, R_.maxRecruit(st, t, cr, base)); if (n <= 0) return { ok: false, why: 'None to recruit.' };
    const tmp = SU.deep(slots);
    if (!R_.addToSlots(st, tmp, cr, n, hero)) return { ok: false, why: 'No room: free a slot first.' };
    R_.pay(P, R_.recruitCost(cr, n));
    t.avail[base] -= n; if (D.CREATURES[cr].pop) t.pop -= n;
    slots.splice(0, slots.length, ...tmp);
    if (cr === 'nekh') { t.nekhCount = 1; S.stacksIn(slots).forEach(x => { if (x.cr === 'nekh' && !x.home) x.home = t.id; }); }
    return { ok: true, n };
  };
  R_.upgradeStack = function (st, t, stack) {
    const c = D.CREATURES[stack.cr]; if (!c.up) return { ok: false };
    if (!Object.values(D.BUILDINGS).some(b => b.dwellUp === c.up && t.built.includes(b.id))) return { ok: false, why: 'Build the upgrade first.' };
    const up = D.CREATURES[c.up], P = st.players[t.owner], cost = {};
    Object.entries(up.cost).forEach(([k, v]) => cost[k] = (v - (c.cost[k] || 0)) * stack.n);
    if (!R_.afford(P, cost)) return { ok: false, why: 'Not enough to upgrade them all.', cost };
    R_.pay(P, cost); stack.cr = c.up; return { ok: true };
  };
  R_.townIncome = function (st, t) {
    const hall = R_.has(t, 'hall3') ? 3 : R_.has(t, 'hall2') ? 2 : 1;
    const r = { gold: 0, food: 8 + hall * 4 };
    t.built.forEach(b => { const B = D.BUILDINGS[b]; if (B.gold) r.gold += B.gold; if (B.food) r.food += B.food * (st.weekEvent === 'harvest' ? 1.33 : st.weekEvent === 'lean' ? 0.5 : 1); if (B.res) Object.entries(B.res).forEach(([k, v]) => r[k] = (r[k] || 0) + v); });
    r.gold += Math.floor(t.pop * 0.8);
    return r;
  };
  R_.townDefense = function (st, t) {
    const h = t.defender && st.heroes[t.defender];
    const any = S.armySize(t.garrison) > 0 || S.captainsIn(t.garrison).length > 0 || (h && !S.isEmptySlots(h.slots));
    return any ? { hero: h || null, slots: t.garrison } : null;
  };
  R_.captureTown = function (st, t, owner) {
    const prev = t.owner; t.owner = owner;
    /* heroes stationed inside are lost with the town */
    (t.heroes || []).forEach(id => { const h = st.heroes[id]; if (h && !h.dead && h.owner !== owner) R_.killHero(st, h, t.layer, t.x, t.y + 1, owner); });
    t.heroes = []; t.defender = null; t.garrison = [null, null, null, null, null];
    S.log(st, (owner >= 0 ? st.players[owner].name : 'The wilds') + ' took ' + t.name + '.', owner);
    if (prev >= 0) SU.emit('lost', { owner: prev, what: t.name });
    R_.checkPlayers(st);
  };

  /* ---------- the tavern ---------- */
  R_.refreshTavern = function (st, P) {
    const R = SU.rng(st);
    P.tavern.heroes = (P.tavern.heroes || []).filter(id => st.heroes[id] && st.heroes[id].owner === -1).slice(0, 1);
    while (P.tavern.heroes.length < 3) { const h = M.hero(st, { owner: -1 }); P.tavern.heroes.push(h.id); }
    P.tavern.captains = [];
    for (let i = 0; i < 4; i++) P.tavern.captains.push(M.captain(st, { level: R.int(1, 1 + Math.floor(st.day / 18)) }));
  };
  /* every hero comes with a captain and a few troops of their own */
  R_.retinue = function (st, h) {
    if (S.stacksIn(h.slots).length) return;
    const R = SU.rng(st), cap = M.captain(st, {});
    h.slots[0] = M.capSlot(cap, [{ cr: 'malsti', n: R.int(10, 16) }]);
    if (!h.slots[1]) h.slots[1] = { kind: 'stack', cr: 'velnur', n: R.int(3, 6) };
  };
  R_.hireHero = function (st, P, t, hid) {
    const h = st.heroes[hid];
    if (!h || h.owner !== -1) return { ok: false };
    if (!R_.afford(P, { gold: M.heroCost })) return { ok: false, why: 'A hero costs ' + M.heroCost + ' gold.' };
    R_.pay(P, { gold: M.heroCost });
    h.owner = P.idx; P.tavern.heroes = P.tavern.heroes.filter(x => x !== hid);
    t.heroes.push(hid); if (!t.defender) t.defender = hid;
    h.breath = M.breathMax(st, h);
    R_.retinue(st, h);
    S.log(st, P.name + ' hired ' + h.name + '.', P.idx);
    return { ok: true, hero: h };
  };
  R_.hireCaptain = function (st, P, t, idx, slots) {
    const c = P.tavern.captains[idx]; if (!c) return { ok: false };
    const cost = M.captainCost(c);
    if (!R_.afford(P, { gold: cost })) return { ok: false, why: 'This captain asks ' + cost + ' gold.' };
    const i = slots.findIndex(s => !s); if (i < 0) return { ok: false, why: 'No free slot for the captain.' };
    R_.pay(P, { gold: cost }); slots[i] = M.capSlot(c, []); P.tavern.captains.splice(idx, 1);
    return { ok: true };
  };
  /* a captain made from a captain core, at a town with a Memory Vault */
  R_.captainFromCore = function (st, P, t, cid, slots) {
    const core = st.cores[cid]; if (!core || core.kind !== 'captain') return { ok: false };
    if (!R_.has(t, 'vault')) return { ok: false, why: 'Needs a Memory Vault.' };
    const i = slots.findIndex(s => !s); if (i < 0) return { ok: false, why: 'No free slot.' };
    const cost = { gold: 400 + core.captain.level * 150 };
    if (!R_.afford(P, cost)) return { ok: false, why: 'Not enough gold.' };
    R_.pay(P, cost);
    const cap = SU.deep(core.captain); cap.id = SU.uid(st, 'c'); cap.name = SU.rng(st).pick(D.NAMES[cap.people] || D.NAMES.eikar) + ', who remembers ' + core.name;
    slots[i] = M.capSlot(cap, []);
    P.vault = P.vault.filter(x => x !== cid); delete st.cores[cid];
    return { ok: true };
  };

  /* ---------- training halls ---------- */
  /* a basic skill is cheap to learn: the halls want heroes on the road */
  R_.trainCost = h => 100;
  R_.trainOffer = function (st, t, h, bid) {
    const B = D.BUILDINGS[bid]; if (!B.teaches || !t.built.includes(bid)) return null;
    if (Object.keys(h.skills).length >= 5) return null;
    if (h.trainOffer && h.trainOffer.hall === bid && h.trainOffer.town === t.id) return h.trainOffer.opts;
    const R = SU.rng(st);
    const cands = B.teaches.map(id => {
      if (id === h.base && (h.skills[id] || 0) === 1) return { id, lv: 2 };
      if (h.skills[id]) return null;
      return { id, lv: 1 };
    }).filter(Boolean);
    R.shuffle(cands);
    const opts = cands.slice(0, 2);
    h.trainOffer = { hall: bid, town: t.id, opts };
    return opts;
  };
  R_.train = function (st, t, h, opt) {
    const P = st.players[h.owner], cost = R_.trainCost(h);
    if (h.trainedToday >= 2) return { ok: false, why: 'A hero can learn only two skills a day.' };
    if (Object.keys(h.skills).length >= 5) return { ok: false, why: 'This hero has all five basic skills.' };
    if (!R_.afford(P, { gold: cost })) return { ok: false, why: 'Training costs ' + cost + ' gold.' };
    R_.pay(P, { gold: cost });
    h.skills[opt.id] = Math.max(h.skills[opt.id] || 0, opt.lv);
    if (opt.id === 'songcraft' && !h.songs.length) h.songs.push('mend');
    h.trainedToday++; h.trainOffer = null;
    h.breath = M.breathMax(st, h);
    return { ok: true };
  };
  R_.readyToLeave = h => Object.keys(h.skills).length >= 5;
  R_.learnTownSongs = function (st, t, h) {
    const tier = Math.max(0, ...t.built.map(b => D.BUILDINGS[b].songTier || 0));
    if (!tier) return [];
    const learned = [];
    /* each town offers a fixed set of songs per tier */
    if (!t.songs) { const R = SU.rng(st); t.songs = {}; for (let k = 1; k <= 5; k++) { const pool = R.shuffle(D.SONG_IDS.filter(s => D.SONGS[s].tier === k)); t.songs[k] = pool.slice(0, k <= 2 ? 4 : 3); } }
    for (let k = 1; k <= tier; k++) (t.songs[k] || []).forEach(s => { if (!h.songs.includes(s) && R_.learnSong(st, h, s)) learned.push(s); });
    return learned;
  };

  /* ---------- heroes in and out of towns ---------- */
  R_.stationHero = function (st, a, t) {   // a hero army in a town goes inside
    const h = S.heroOf(st, a); if (!h) return;
    t.heroes.push(h.id); if (!t.defender) t.defender = h.id;
    a.dead = true; S.moveArmyIndex(st, a, a.layer, a.x, a.y); delete st.armies[a.id];
  };
  R_.sendOut = function (st, t, h) {
    if (!R_.readyToLeave(h)) return { ok: false, why: h.name + ' must learn all five basic skills at the training halls before leaving town.' };
    if (S.fieldHeroes(st, h.owner).length >= D.MAX_FIELD_HEROES) return { ok: false, why: 'Only ' + D.MAX_FIELD_HEROES + ' heroes can be out on the map at once.' };
    let spot = [t.x, t.y];
    if (S.armyAt(st, t.layer, t.x, t.y)) { spot = R_.freeNear(st, t.layer, t.x, t.y + 1); if (!spot) return { ok: false, why: 'There is no room outside the gate.' }; }
    t.heroes = t.heroes.filter(x => x !== h.id); if (t.defender === h.id) t.defender = t.heroes[0] || null;
    const a = M.army(st, h.owner, t.layer, spot[0], spot[1], h.id);
    a.mpMax = R_.mpMax(st, a); a.mp = h.leftToday ? 0 : a.mpMax;
    return { ok: true, army: a };
  };
  R_.sendSquadron = function (st, t, slotIdx) {   // a captain's squadron leaves the garrison on its own
    const s = t.garrison[slotIdx]; if (!s || s.kind !== 'cap') return { ok: false, why: 'Only a squadron with a captain can go out without a hero.' };
    let spot = [t.x, t.y];
    if (S.armyAt(st, t.layer, t.x, t.y)) { spot = R_.freeNear(st, t.layer, t.x, t.y + 1); if (!spot) return { ok: false, why: 'There is no room outside the gate.' }; }
    t.garrison[slotIdx] = null;
    const a = M.army(st, t.owner, t.layer, spot[0], spot[1], null, [s, null, null, null, null]);
    a.mpMax = R_.mpMax(st, a); a.mp = a.mpMax;
    return { ok: true, army: a };
  };

  /* ======================= morale, luck, food ======================= */
  /* morale is out of 100; 60 is a steady stack */
  R_.stackMorale = function (st, stack, cap, hero, ctx) {
    let m = 60;
    if (hero) m += S.skillVal(st, hero, 'hearten') + S.relicMod(st, hero, 'morale');
    if (cap) m += (cap.morale || 0) * 5 + (cap.abil === 'banner' ? 10 : 0);
    if (ctx && ctx.hungry) m -= 20; else if (ctx && ctx.fed) m += 5;
    m -= (stack.grief || 0) * 10;
    if (ctx && ctx.sanctum) m += 15;
    return SU.clamp(Math.round(m), 0, 100);
  };
  R_.armyLuck = function (st, a) {
    const h = S.heroOf(st, a); let l = 0;
    if (h) l += S.skillVal(st, h, 'fortune') + S.relicMod(st, h, 'luck');
    S.captainsIn(S.slotsOf(st, a)).forEach(c => l = Math.max(l, (c.luck || 0) + (c.abil === 'charm' ? 1 : 0) + (h ? S.skillVal(st, h, 'fortune') : 0)));
    if (a.cursed) l -= a.cursed;
    return SU.clamp(l, -3, 3);
  };
  R_.dailyFood = function (st, slots, hero) {
    let f = 0;
    (slots || []).forEach(s => { if (!s) return;
      const mul = s.kind === 'cap' && s.cap.abil === 'quartermaster' ? 0.67 : 1;
      (s.kind === 'stack' ? [s] : s.stacks.concat(s.reserve || [])).forEach(x => { if (x) f += x.n * D.CREATURES[x.cr].food * mul / D.WEEK; });
      if (s.kind === 'cap') f += 0.3; });
    if (hero) f *= (1 - S.skillVal(st, hero, 'provision') / 100) * (1 + S.relicMod(st, hero, 'foodPct') / 100);
    return f;
  };

  /* ======================= Urverk ======================= */
  R_.urverkOpen = function (st, o, day) {
    day = day || st.day;
    if (o.kind === 'kalo' && st.weekEvent === 'dance') return true;
    if (!o.window) return true;
    const w = o.window, d = (day - 1) % w.period;
    return ((d - w.from + w.period) % w.period) < w.len;
  };
  R_.urverkNext = function (st, o) { if (R_.urverkOpen(st, o)) return 0; for (let k = 1; k < 200; k++) if (R_.urverkOpen(st, o, st.day + k)) return k; return -1; };
  R_.urverkOpenFor = function (st, o) { if (!R_.urverkOpen(st, o)) return 0; const w = o.window; if (!w) return Infinity; let k = 0; while (R_.urverkOpen(st, o, st.day + k + 1) && k < 100) k++; return k + 1; };
  /* cross an Urverk. choice: 'pay' | 'respect' | 'attack' for tolls */
  R_.crossUrverk = function (st, a, o, choice) {
    const P = st.players[a.owner], h = S.heroOf(st, a), R = SU.rng(st);
    if (!o.triggerKnown) return { ok: false, msg: 'Nobody left alive knows the trigger of this Urverk. It is dead until someone finds it again.' };
    if (!R_.urverkOpen(st, o)) { const n = R_.urverkNext(st, o); return { ok: false, msg: 'This Urverk is closed. ' + (n > 0 ? 'It opens in ' + SU.plural(n, 'day') + '.' : '') }; }
    const dest = st.objects[o.link]; if (!dest) return { ok: false, msg: 'This Urverk leads nowhere.' };
    if (o.toll && o.toll.alive && !(o.toll.respect[a.owner])) {
      const price = Math.round(o.toll.gold * (1 - S.skillVal(st, h, 'diplomacy') / 100));
      if (!choice) return { need: 'toll', obj: o, price };
      if (choice === 'pay') { if (P.res.gold < price) return { ok: false, msg: 'Not enough gold for the toll.' }; P.res.gold -= price; o.toll.paid = (o.toll.paid || {}); o.toll.paid[a.owner] = (o.toll.paid[a.owner] || 0) + 1; if (o.toll.paid[a.owner] >= 3) { o.toll.respect[a.owner] = 1; const d = st.objects[o.link]; if (d && d.toll) d.toll.respect[a.owner] = 1; } }
      else if (choice === 'attack') return { need: 'tollfight', obj: o };
      else return { ok: false };
    }
    /* the crossing */
    let msg = '';
    if (o.danger || o.kind === 'danger') {
      let risk = o.danger || 0.25;
      const safe = S.skillVal(st, h, 'duatcraft') / 100 + S.relicMod(st, h, 'duatSafe') / 100 + (S.captainsIn(S.slotsOf(st, a)).some(c => c.abil === 'duatwalker') ? 0.25 : 0);
      risk *= (1 - SU.clamp(safe, 0, 0.9)) * 0.5;   /* the Duskareth know the Duat better than anyone */
      if (R.chance(risk)) {
        const roll = R.next();
        if (roll < 0.4) { let lost = 0; S.stacksIn(S.slotsOf(st, a)).forEach(s => { const k = Math.floor(s.n * R.range(0.05, 0.2)); s.n -= k; lost += k; }); msg = 'The Duat pulled at you on the way through: ' + lost + ' were lost in the dark.'; }
        else if (roll < 0.75) { const p = randomLand(st, dest.layer); if (p) { arrive(st, a, dest.layer, p[0], p[1]); a.mp = 0; return { ok: true, msg: 'The crossing went wrong. You come out of the Duat somewhere else entirely.' }; } }
        else {
          arrive(st, a, dest.layer, dest.x, dest.y + 1); a.mp = 0;
          const g = R_.tempWild(st, a, 1000 + st.day * 160, ['malsti', 'velnur', 'ver', 'harkal', 'kaloeik']);
          return { ok: true, msg: 'A rogue band of Duskareth waits in the Duat.', event: { kind: 'battle', attacker: g, defender: a, ambush: true, temp: true } };
        }
      }
    }
    arrive(st, a, dest.layer, dest.x, dest.y + 1);
    a.mp = Math.max(0, a.mp - 300);
    if (!P.knownUrverk.includes(o.id)) P.knownUrverk.push(o.id);
    if (!P.knownUrverk.includes(dest.id)) P.knownUrverk.push(dest.id);
    return { ok: true, msg: msg || ('Through the Duat to ' + D.LAYERS[dest.layer].name + '.') };
  };
  /* a wild group that exists only for one fight (not standing on the map) */
  R_.tempWild = function (st, a, pow, only) {
    const L = st.layers[a.layer], key = a.y * L.w + a.x;
    const g = M.wild(st, a.layer, a.x, a.y, pow, { only });
    st._armyAt[a.layer].set(key, a.id);
    g.temp = true; g.x = -50; g.y = -50;
    return g;
  };
  function arrive(st, a, layer, x, y) {
    const spot = R_.freeNear(st, layer, x, y) || [x, y];
    S.moveArmyIndex(st, a, layer, spot[0], spot[1]);
    S.reveal(st, a.owner, layer, spot[0], spot[1], R_.sight(st, a));
  }
  R_.freeNear = function (st, layer, x, y) {
    for (let r = 0; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const xx = x + dx, yy = y + dy; if (S.passable(st, layer, xx, yy) && !S.objAt(st, layer, xx, yy) && !S.armyAt(st, layer, xx, yy)) return [xx, yy];
    }
    return null;
  };
  function randomLand(st, layer) { const L = st.layers[layer], R = SU.rng(st); for (let k = 0; k < 500; k++) { const x = R.int(1, L.w - 2), y = R.int(1, L.h - 2); if (S.passable(st, layer, x, y) && !S.objAt(st, layer, x, y) && !S.armyAt(st, layer, x, y)) return [x, y]; } return null; }
  R_.randomLand = randomLand;

  /* ======================= the storm ======================= */
  const CELL = 6;
  R_.newStorm = function (st) {
    const R = SU.rng(st), layer = R.int(0, 2), L = st.layers[layer];
    const p = randomLand(st, layer) || [L.w >> 1, L.h >> 1];
    const s = { layer, x: p[0], y: p[1], r: Math.max(5, Math.round(L.w / 9)), eye: 1.6, dx: R.range(-1, 1), dy: R.range(-1, 1), covered: [] };
    s.covered = st.layers.map(L2 => new Array(Math.ceil(L2.w / CELL) * Math.ceil(L2.h / CELL)).fill(0));
    markCovered(st, s);
    return s;
  };
  function markCovered(st, s) {
    const L = st.layers[s.layer], cw = Math.ceil(L.w / CELL);
    for (let y = Math.max(0, s.y - s.r); y < Math.min(L.h, s.y + s.r); y += 2) for (let x = Math.max(0, s.x - s.r); x < Math.min(L.w, s.x + s.r); x += 2)
      if (Math.hypot(x - s.x, y - s.y) <= s.r) s.covered[s.layer][((y / CELL) | 0) * cw + ((x / CELL) | 0)] = 1;
  }
  R_.inStorm = (st, layer, x, y) => { const s = st.storm; return !!s && s.layer === layer && Math.hypot(x - s.x, y - s.y) <= s.r; };
  R_.inEye = (st, layer, x, y) => { const s = st.storm; return !!s && s.layer === layer && Math.hypot(x - s.x, y - s.y) <= s.eye; };
  R_.moveStorm = function (st) {
    const s = st.storm, R = SU.rng(st), L = st.layers[s.layer], cw = Math.ceil(L.w / CELL), ch = Math.ceil(L.h / CELL);
    /* which land cells it has not yet touched */
    const todo = [];
    for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
      if (s.covered[s.layer][cy * cw + cx]) continue;
      const x = Math.min(L.w - 1, cx * CELL + 3), y = Math.min(L.h - 1, cy * CELL + 3);
      if (D.TERRAIN[S.terrainAt(L, x, y)].pass !== false) todo.push([x, y]);
    }
    if (!todo.length) {
      /* it has touched all of this Tatu: through the Duat to the next */
      s.covered[s.layer] = s.covered[s.layer].map(() => 0);
      const nl = R.pick([0, 1, 2].filter(l => l !== s.layer));
      const p = randomLand(st, nl) || [st.layers[nl].w >> 1, st.layers[nl].h >> 1];
      S.log(st, 'The Sunear’Zikhron has touched every part of ' + D.LAYERS[s.layer].name + ' and passes through the Duat to ' + D.LAYERS[nl].name + '.');
      s.layer = nl; s.x = p[0]; s.y = p[1]; s.r = Math.max(5, Math.round(st.layers[nl].w / 9));
      markCovered(st, s); return;
    }
    /* the storm breathes: its size, eye and speed wander, middling most often, extremes sometimes */
    const bell = () => (R.next() + R.next() + R.next()) / 3;
    const base = Math.max(5, Math.round(L.w / 9));
    s.r = Math.max(3, Math.round(SU.lerp(s.r, base * (0.45 + 1.3 * bell()), 0.5)));
    s.eye = Math.round(SU.lerp(s.eye || 1.6, 1 + 2 * bell(), 0.5) * 10) / 10;
    const steps = (st.weekEvent === 'surge' ? 2 : 1) * (bell() > 0.75 ? 2 : 1);
    for (let k = 0; k < steps; k++) {
      /* drift toward the nearest untouched land, wandering as it goes */
      let best = todo[0], bd = 1e9; todo.forEach(p => { const d = Math.hypot(p[0] - s.x, p[1] - s.y) + R.range(0, 10); if (d < bd) { bd = d; best = p; } });
      const ang = Math.atan2(best[1] - s.y, best[0] - s.x) + R.range(-0.9, 0.9);
      s.dx = s.dx * 0.5 + Math.cos(ang) * 0.5; s.dy = s.dy * 0.5 + Math.sin(ang) * 0.5;
      const len = Math.hypot(s.dx, s.dy) || 1, sp = R.range(2, 4);
      s.x = SU.clamp(Math.round(s.x + s.dx / len * sp), 2, L.w - 3); s.y = SU.clamp(Math.round(s.y + s.dy / len * sp), 2, L.h - 3);
      markCovered(st, s);
    }
  };
  R_.stormDay = function (st) {
    const s = st.storm, R = SU.rng(st);
    R_.moveStorm(st);
    /* heroes in the storm breathe it in; buried memory cores are washed out of the ground */
    Object.values(st.armies).forEach(a => { const h = S.heroOf(st, a); if (h && !a.dead && R_.inStorm(st, a.layer, a.x, a.y)) h.breath = M.breathMax(st, h); });
    Object.values(st.objects).forEach(o => { if (o.hidden && R_.inStorm(st, o.layer, o.x, o.y)) { o.hidden = false; S.log(st, 'The Sunear’Zikhron uncovers a memory core on ' + D.LAYERS[o.layer].name + '.'); } });
    /* the fog comes back where it rages */
    st.players.forEach((P, pi) => {
      const L = st.layers[s.layer], E = P.explored[s.layer];
      for (let y = Math.max(0, s.y - s.r); y <= Math.min(L.h - 1, s.y + s.r); y++) for (let x = Math.max(0, s.x - s.r); x <= Math.min(L.w - 1, s.x + s.r); x++)
        if (Math.hypot(x - s.x, y - s.y) <= s.r - 1) E[y * L.w + x] = 0;
      R_.revealAll(st, pi);
    });
    /* RubberMcFly gather in it */
    const want = st.weekEvent === 'swarm' ? 6 : 3;
    const have = Object.values(st.armies).filter(a => !a.dead && a.mcfly && a.layer === s.layer).length;
    for (let k = have; k < want; k++) { const a = R.range(0, Math.PI * 2), d = R.range(1, s.r - 1); const x = Math.round(s.x + Math.cos(a) * d), y = Math.round(s.y + Math.sin(a) * d);
      if (S.passable(st, s.layer, x, y) && !S.objAt(st, s.layer, x, y) && !S.armyAt(st, s.layer, x, y)) { const g = M.wild(st, s.layer, x, y, 300 + R.int(0, 400), { cr: 'mcfly', stacks: 1 }); g.mcfly = true; g.herd = false; } }
    /* and leave when it goes */
    Object.values(st.armies).forEach(a => { if (a.mcfly && !a.dead && !R_.inStorm(st, a.layer, a.x, a.y)) { a.dead = true; S.moveArmyIndex(st, a, a.layer, a.x, a.y); delete st.armies[a.id]; } });
  };
  R_.revealAll = function (st, pi) {
    Object.values(st.armies).forEach(a => { if (!a.dead && a.owner === pi) S.reveal(st, pi, a.layer, a.x, a.y, R_.sight(st, a)); });
    S.townsOf(st, pi).forEach(t => S.reveal(st, pi, t.layer, t.x, t.y, 6));
    Object.values(st.objects).forEach(o => { if (o.type === 'mine' && o.owner === pi) S.reveal(st, pi, o.layer, o.x, o.y, 3); });
  };

  /* ======================= heroes: xp and death ======================= */
  R_.giveXp = function (st, h, xp) {
    if (!h || h.dead) return [];
    xp = Math.round(xp * (1 + S.skillVal(st, h, 'learning') / 100));
    h.xp += xp; const ups = [];
    while (h.xp >= S.xpFor(h.level + 1)) {
      h.level++;
      /* choose one of two stats, and one of two of the hero's own skills, to raise */
      const R = SU.rng(st), stats = R.shuffle(D.STATS.slice()).slice(0, 2);
      const own = Object.keys(h.skills).filter(id => h.skills[id] < 5);
      R.shuffle(own);
      const choice = own.slice(0, 2);
      h.levelUps.push({ level: h.level, stats, choice });
      ups.push({ level: h.level, stats, choice });
    }
    if (ups.length) h.breath = Math.min(M.breathMax(st, h), h.breath + 5);
    return ups;
  };
  R_.resolveLevelUp = function (st, h, skillId, stat) {
    const u = h.levelUps.shift(); if (!u) return;
    const sts = u.stats || [u.stat]; const sp = stat && sts.includes(stat) ? stat : sts[0]; if (sp) h.stats[sp]++;
    const id = skillId && u.choice.includes(skillId) ? skillId : u.choice[0];
    if (id) h.skills[id] = Math.min(5, (h.skills[id] || 0) + 1);
    h.breath = Math.min(h.breath, M.breathMax(st, h));
  };
  /* a hero falls: gone for good, leaving a memory core where they fell */
  R_.killHero = function (st, h, layer, x, y, takerOwner, takerHero) {
    if (R_.carries(h, 'nekhprint')) {
      Object.keys(h.relics).forEach(k => { if (h.relics[k] === 'nekhprint') delete h.relics[k]; }); h.pack = (h.pack || []).filter(r => r !== 'nekhprint');
      if (takerHero && !takerHero.dead) R_.giveRelic(st, takerHero, 'nekhprint');
      else { const p = R_.freeNear(st, layer, x, y); if (p) { const o = { id: SU.uid(st, 'o'), type: 'relic', layer, x: p[0], y: p[1], relic: 'nekhprint' }; st.objects[o.id] = o; S.place(st, o); } }
    }
    h.dead = true; h.owner = -2;
    const core = M.heroCore(st, h);
    if (takerHero && !takerHero.dead) { R_.takeCore(st, takerHero, core.id); return { core, taken: true }; }
    const spot = R_.freeNear(st, layer, x, y);
    if (spot) { const o = { id: SU.uid(st, 'o'), type: 'core', layer, x: spot[0], y: spot[1], core: core.id }; st.objects[o.id] = o; S.place(st, o); }
    return { core, taken: false };
  };
  R_.removeArmy = function (st, a) { a.dead = true; const L = st.layers[a.layer]; if (L && st._armyAt[a.layer].get(a.y * L.w + a.x) === a.id) st._armyAt[a.layer].delete(a.y * L.w + a.x); delete st.armies[a.id]; };

  /* ======================= players ======================= */
  /* a town's people, one day: about 3% a week, up to 10% with food to spare, fewer when hungry */
  R_.popDay = function (st, P, t, nTowns) {
    const room = R_.housing(t) - t.pop;
    const spare = Math.max(0, (P.lastFoodIn || 0) - (P.lastEat || 0)) / Math.max(1, nTowns || 1);
    let grow = P.hungry ? -t.pop * 0.04 : t.pop * (0.03 + SU.clamp(spare / 60, 0, 0.07));
    if (st.weekEvent === 'wanderers') grow += t.pop * 0.1;
    grow = Math.min(grow, Math.max(0, room)) / D.WEEK + (t.popFrac || 0);
    const whole = grow >= 0 ? Math.floor(grow) : Math.ceil(grow);
    t.popFrac = grow - whole;
    t.pop = SU.clamp(Math.round(t.pop + whole), 60, Math.max(R_.housing(t), t.pop));
    t.popChange = whole;
    return whole;
  };
  R_.checkPlayers = function (st) {
    st.players.forEach((P, pi) => {
      if (!P.alive) return;
      const towns = S.townsOf(st, pi).length, heroes = Object.values(st.heroes).filter(h => h.owner === pi && !h.dead).length;
      const armies = Object.values(st.armies).filter(a => !a.dead && a.owner === pi).length;
      if (!towns && !armies && !heroes) { P.alive = false; S.log(st, P.name + ' has been defeated.', pi); }
    });
    const alive = st.players.filter(P => P.alive);
    const teams = new Set(alive.map(P => P.team ? 't' + P.team : 'p' + P.idx));
    const win = (pi, how) => { if (st.over) return; const P = st.players[pi]; const mates = alive.filter(Q => Q.idx === pi || (P.team && Q.team === P.team)); st.over = { winners: mates.map(Q => Q.idx), day: st.day, how }; SU.emit('gameover', st.over); };
    if (teams.size <= 1 && !st.over) { st.over = { winners: alive.map(P => P.idx), day: st.day, how: 'conquer' }; SU.emit('gameover', st.over); return; }
    /* every person is out: the game ends, even if computer players are still fighting each other */
    if (!st.over && st.players.some(P => P.kind === 'human') && !alive.some(P => P.kind === 'human')) { st.over = { winners: alive.map(P => P.idx), day: st.day, how: 'conquer', fallen: true }; SU.emit('gameover', st.over); return; }
    const W = st.setup.win || { kind: 'conquer' };
    if (W.kind === 'prophecy') { const P = alive.find(P => (P.stormWins || 0) >= (W.n || 3)); if (P) win(P.idx, 'prophecy'); }
    if (W.kind === 'gold') { const P = alive.find(P => P.res.gold >= (W.gold || 200000)); if (P) win(P.idx, 'gold'); }
    if (W.kind === 'town') { const t = st.objects[W.town]; if (t && t.owner >= 0) { if (t.heldBy !== t.owner) { t.heldBy = t.owner; t.heldSince = st.day; } else if (st.day - t.heldSince >= D.WEEK) win(t.owner, 'town'); } }
  };

  /* ======================= the turn and the day ======================= */
  R_.startTurn = function (st) {
    const P = S.cur(st);
    Object.values(st.armies).forEach(a => { if (a.owner === st.current && !a.dead && a._newDay !== st.day) { a._newDay = st.day; a.mpMax = R_.mpMax(st, a); a.mp = a.mpMax; } });
    R_.revealAll(st, st.current);
    if (!P.tavern.heroes.length) R_.refreshTavern(st, P);
    st.turnSeq++;
    SU.emit('turn', { player: st.current });
  };
  /* end a turn with a hero in the eye of the storm and you are given a vision */
  R_.eyeVision = function (st, pi) {
    const P = st.players[pi]; if (!P || P.vision) return null;
    if (Object.values(st.heroes).some(h => h.owner === pi && !h.dead && R_.carries(h, 'nekhprint'))) return null;
    const a = Object.values(st.armies).find(x => !x.dead && x.owner === pi && x.heroId && R_.inEye(st, x.layer, x.x, x.y)); if (!a) return null;
    const R = SU.rng(st);
    for (let k = 0; k < 300; k++) {
      const li = R.int(0, 2), p = randomLand(st, li); if (!p) continue;
      if (S.townsOf(st, pi).some(t => t.layer === li && Math.hypot(t.x - p[0], t.y - p[1]) < 14)) continue;
      if (!S.passable(st, li, p[0], p[1] + 1)) continue;
      const o = { id: SU.uid(st, 'o'), type: 'vision', layer: li, x: p[0], y: p[1], seer: pi };
      st.objects[o.id] = o; S.place(st, o);
      const g = M.wild(st, li, p[0], p[1] + 1, 9000 + st.day * 450, { only: ['harkal', 'kaloeik', 'tyndael', 'xiweik', 'ularnaga', 'lutut'] }); g.guard = o.id;
      if (S.armyAt(st, li, p[0], p[1] + 1) !== g) { const q = R_.freeNear(st, li, p[0], p[1] + 1); if (q) S.moveArmyIndex(st, g, li, q[0], q[1]); }
      P.vision = o.id;
      S.reveal(st, pi, li, p[0], p[1], 3);
      S.log(st, P.name + ' was given a vision in the eye of the storm.', pi);
      SU.emit('vision', { owner: pi, obj: o });
      return o;
    }
    return null;
  };
  R_.carries = (h, rid) => !!h && (Object.values(h.relics || {}).includes(rid) || (h.pack || []).includes(rid));
  /* is the worm's Rokarvac in this town right now (with a hero at the gate or inside)? */
  R_.blueprintHere = function (st, t) {
    const hs = (t.heroes || []).map(id => st.heroes[id]);
    const a = S.armyAt(st, t.layer, t.x, t.y); if (a && a.owner === t.owner) hs.push(S.heroOf(st, a));
    return hs.some(h => R_.carries(h, 'nekhprint'));
  };
  R_.endTurn = function (st) {
    R_.eyeVision(st, st.current);
    const n = st.players.length;
    let next = st.current;
    for (let k = 0; k < n; k++) {
      next = (next + 1) % n;
      if (next === 0) R_.newDay(st);
      if (st.players[next].alive) break;
    }
    st.current = next;
    R_.startTurn(st);
  };
  R_.newDay = function (st) {
    st.day++;
    const cal = S.cal(st.day), R = SU.rng(st);
    const newWeek = cal.dow === 1, newMonth = cal.week === 1 && newWeek;
    if (newMonth) st.monthEvent = R.pick(D.MONTH_EVENTS).id;
    if (newWeek) st.weekEvent = st.day <= 7 ? 'none' : R.pick(D.WEEK_EVENTS).id;
    if (st.storm) R_.stormDay(st);
    st.players.forEach((P, pi) => {
      if (!P.alive) return;
      const towns = S.townsOf(st, pi);
      /* income */
      const food0 = P.res.food;
      towns.forEach(t => { const inc = R_.townIncome(st, t); Object.entries(inc).forEach(([k, v]) => P.res[k] += v); t.builtToday = 0; t.smallToday = 0; if (t.sealed > 0) t.sealed--; });
      Object.values(st.objects).forEach(o => { if (o.type !== 'mine' || o.owner !== pi) return; const Mi = D.MINES[o.kind];
        let amt = Mi.amt; if (o.kind === 'food' && st.weekEvent === 'lean') amt /= 2; if (o.kind === 'food' && st.weekEvent === 'harvest') amt *= 1.33;
        if (R_.inStorm(st, o.layer, o.x, o.y)) amt /= 2; if (o.harvest === st.day - 1) amt *= 2;
        if (o.kind === 'ngakara') { if (!o.naga || !o.naga.alive) return; if (newWeek) { P.res.ngakara += o.naga.calm > 0 ? 2 : 1; if (o.naga.calm > 0) o.naga.calm--; } return; }
        if (!D.RES_INFO[Mi.res].common && cal.dow !== 1) { P.res[Mi.res] += 0; if ((st.day + o.x) % 2 === 0) P.res[Mi.res] += amt; return; }
        P.res[Mi.res] += Math.round(amt); });
      const heroes = Object.values(st.heroes).filter(h => h.owner === pi && !h.dead);
      heroes.forEach(h => { P.res.gold += S.skillVal(st, h, 'steward') + S.relicMod(st, h, 'goldDay'); if (newWeek) P.res.stygian += S.skillVal(st, h, 'stygiancraft'); h.trainedToday = 0; h.leftToday = 0; });
      /* food: armies and towns eat */
      let eat = 0;
      Object.values(st.armies).forEach(a => { if (a.dead || a.owner !== pi) return; eat += R_.dailyFood(st, S.slotsOf(st, a), S.heroOf(st, a)); });
      towns.forEach(t => { eat += R_.dailyFood(st, t.garrison) + t.pop * 0.01; (t.heroes || []).forEach(id => eat += R_.dailyFood(st, st.heroes[id].slots, st.heroes[id])); });
      P.lastFoodIn = P.res.food - food0; P.res.food -= eat; P.lastEat = eat;
      if (P.res.food < 0) {
        P.res.food = 0; P.hungry = (P.hungry || 0) + 1;
        if (P.hungry >= 3) { /* desertion (the great beasts stay) */ Object.values(st.armies).forEach(a => { if (a.owner === pi && !a.dead) { S.stacksIn(S.slotsOf(st, a)).forEach(s => { if (!D.CREATURES[s.cr].legendary) s.n -= Math.ceil(s.n * 0.05); }); if (SU.battle) SU.battle._cleanSlots(S.slotsOf(st, a)); } }); S.log(st, 'Hunger: some of ' + P.name + '’s troops have deserted.', pi); }
      } else P.hungry = 0;
      /* breath, and food refills it */
      heroes.forEach(h => { const mx = M.breathMax(st, h); const inTown = (S.heroLocation(st, h).town); let gain = inTown ? mx : Math.ceil(mx * 0.12) + (P.hungry ? 0 : 1); if (st.weekEvent === 'song') gain *= 2; h.breath = Math.min(mx, h.breath + gain); });
      /* grief fades */
      Object.values(st.armies).forEach(a => { if (a.owner === pi && !a.dead) S.stacksIn(S.slotsOf(st, a)).forEach(s => { if (s.grief && R.chance(0.25)) s.grief--; }); });
      /* weekly: growth, people, the tavern */
      if (newWeek) towns.forEach(t => {
        const fort = t.built.reduce((g, b) => Math.max(g, D.BUILDINGS[b].growth || 0), 0);
        R_.townDwellings(t).forEach(d => { const c = D.CREATURES[d.base]; if (d.base === 'nekh') { if (!t.nekhCount) t.avail.nekh = 1; return; }
          let g = Math.round(c.grow * (1 + fort / 100)); if (st.weekEvent === 'breed' && d.base === 'malsti') g *= 2; if (st.monthEvent === 'plenty' && newMonth) g *= 2;
          if (c.tier >= 8) g = c.grow;   /* the top of the town: one a week, whatever the walls or the month */
          t.avail[d.base] = (t.avail[d.base] || 0) + g; });
        /* the farmers' paddock: corralled punks breed a little */
        if (t.punks > 0 && R_.has(t, 'granary')) t.punks = Math.round(t.punks * 1.1);
      });
      /* daily: people come and go a little every day; only food to spare brings more */
      towns.forEach(t => R_.popDay(st, P, t, towns.length));
      if (newWeek) R_.refreshTavern(st, P);
      if (!towns.length) { P.daysWithoutTown = (P.daysWithoutTown || 0) + 1; if (P.daysWithoutTown >= 7 && P.alive) { P.alive = false; S.log(st, P.name + ' held no town for a week and is out of the game.', pi);
        Object.values(st.armies).forEach(a => { if (a.owner === pi) R_.removeArmy(st, a); }); } }
      else P.daysWithoutTown = 0;
    });
    /* the wilds: groups grow each week, herds and roamers wander */
    if (newWeek) Object.values(st.armies).forEach(a => { if (!a.wild || a.dead || a.mcfly) return;
      const mul = st.monthEvent === 'migration' && newMonth ? 2 : 1.06;
      /* wild groups grow, but never past three times their first size */
      if (a.power0 && S.power(a.slots) > a.power0 * 3) return;
      S.stacksIn(a.slots).forEach(s => s.n = Math.ceil(s.n * mul)); });
    R_.wildDay(st);
    R_.checkPlayers(st);
    SU.emit('day', { day: st.day, newWeek, newMonth });
  };
  /* wild groups: roamers wander; groups near undefended mines take them back */
  R_.wildDay = function (st) {
    const R = SU.rng(st);
    Object.values(st.armies).forEach(a => {
      if (!a.wild || a.dead || a.guard || a.temp) return;
      if (!a.roam && !a.herd && !a.mcfly) {
        /* any wild group may retake an unguarded mine it can see */
        if (R.chance(0.15)) { const m = Object.values(st.objects).find(o => o.type === 'mine' && o.layer === a.layer && o.owner >= 0 && Math.hypot(o.x - a.x, o.y - a.y) < 5 && !S.armyAt(st, o.layer, o.x, o.y + 1));
          if (m) { m.owner = -1; S.log(st, 'Wild creatures overran the ' + D.MINES[m.kind].name + '.'); SU.emit('lost', { owner: -1, what: D.MINES[m.kind].name }); } }
        return;
      }
      for (let k = 0; k < (a.mcfly ? 3 : 2); k++) {
        const dx = R.int(-1, 1), dy = R.int(-1, 1); const x = a.x + dx, y = a.y + dy;
        if (Math.hypot(x - a.home.x, y - a.home.y) > 6 && !a.mcfly) continue;
        if (!S.passable(st, a.layer, x, y) || S.objAt(st, a.layer, x, y) || S.armyAt(st, a.layer, x, y)) continue;
        S.moveArmyIndex(st, a, a.layer, x, y);
        /* a roamer next to an unguarded mine overruns it */
        Object.values(st.objects).forEach(o => { if (o.type === 'mine' && o.layer === a.layer && o.owner >= 0 && Math.abs(o.x - x) <= 1 && Math.abs(o.y - y) <= 1 && !a.herd && !a.mcfly) {
          const guard = S.armyAt(st, o.layer, o.x, o.y + 1);
          if (!guard || (guard.owner !== o.owner) || R.chance(0.1)) { o.owner = -1; S.log(st, 'Wild creatures overran the ' + D.MINES[o.kind].name + '.'); } } });
      }
    });
  };

  /* ======================= market ======================= */
  R_.tradeRate = function (st, P, from, to) {
    const markets = S.townsOf(st, P.idx).filter(t => R_.has(t, 'market')).length;
    const eff = Math.min(0.85, 0.35 + markets * 0.1) * (S.isMarketDay(st) ? 1.15 : 1);
    return (D.MARKET_VALUE[from] / D.MARKET_VALUE[to]) * eff;
  };
  R_.trade = function (st, P, from, to, amount) {
    if ((P.res[from] || 0) < amount || amount <= 0) return { ok: false };
    const get = Math.floor(amount * R_.tradeRate(st, P, from, to));
    if (get <= 0) return { ok: false, why: 'Too little to trade.' };
    P.res[from] -= amount; P.res[to] += get; return { ok: true, get };
  };
  /* travelling sellers on market day */
  R_.marketOffers = function (st, t) {
    const wk = S.cal(st.day).weekAbs;
    if (t._offerWeek === wk && t._offers) return t._offers;
    const R = SU.makeRng(st.seed + wk * 131 + t.x * 7 + t.y);
    const half = st.monthEvent === 'guild' ? 0.5 : 1;
    const offers = [];
    const rr = R.pick(D.RELIC_IDS.filter(r => D.RELICS[r].rare !== 'skaar'));
    offers.push({ kind: 'relic', relic: rr, cost: { gold: Math.round(({ common: 1500, rare: 3500, great: 7000 })[D.RELICS[rr].rare] * half) } });
    const sg = R.pick(D.SONG_IDS.filter(s => D.SONGS[s].tier <= 3));
    offers.push({ kind: 'song', song: sg, cost: { gold: Math.round(D.SONGS[sg].tier * 900 * half) } });
    const res = R.pick(['stygian', 'ngakara', 'timber', 'glowmoss']);
    offers.push({ kind: 'res', res, amt: 5, cost: { gold: Math.round(1800 * half) } });
    offers.push({ kind: 'creature', cr: R.pick(['velnur', 'ver', 'harkal']), n: R.int(5, 10), cost: { gold: Math.round(600 * half) } });
    /* travelling folk from outside the Duskareth */
    const outsider = R.pick(['wildpunk', 'dompunk', 'uff', 'naga', 'ularnaga']), oc = D.CREATURES[outsider];
    offers.push({ kind: 'creature', cr: outsider, n: Math.max(1, Math.round(R.int(18, 30) * 10 / (oc.hp * 0.6 + 4))), cost: { gold: Math.round((oc.tier * 350 + 300) * half) } });
    offers.push({ kind: 'captain', cap: M.captain(st, { level: R.int(1, 2 + Math.floor(st.day / 20)), people: R.pick(['eikar', 'keilia', 'kaloeik', 'karnen']) }), cost: { gold: Math.round(1500 * half) } });
    t._offerWeek = wk; t._offers = offers;
    return offers;
  };
})(typeof window !== 'undefined' ? window : globalThis);
