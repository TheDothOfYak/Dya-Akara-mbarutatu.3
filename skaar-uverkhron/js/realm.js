/* ============================================================
   SKAAR UVERKHRON — js/realm.js
   The land as a war of ground: named territories, who holds
   them, what they yield, the caravans that carry it home, the
   bandits on the roads between, talking (parley) with anyone
   who can talk, pacts between rivals, mercenary bands, watch
   posts, keeps, travellers who found new places, neutral towns
   that grow on their own, and the land going wild.

   A territory belongs to whoever is the highest authority in it:
   towns, keeps, watch posts and armies standing there each count,
   and so do wild bands and independent towns and keeps. To take
   a territory your authority must be half again as large as
   everything that stands against you there; to keep it, it must
   be at least as large. Small bands in a corner do not stop a
   strong lord, but a real rival does.
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU, D = SU.data, S = SU.state, M = SU.make;
  const RL = SU.realm = {};
  const RU = () => SU.rules;

  /* ======================= numbers ======================= */
  const K = RL.K = {
    TOWN: 100, KEEP: 60, POST: 12, HOLD: 20,          // authority
    HERO: 15, HERO_MAX: 35, HERO_DIV: 600,
    BAND: 8, BAND_MAX: 25, BAND_DIV: 800,
    WILD: 6, WILD_MAX: 20, WILD_DIV: 700, WILD_REST: 0.3,
    TAKE: 1.5,                                        // to take ground: 1.5× everything against you
    CARAVAN_STEPS: 9, CARAVAN_DOWN: 2,                // tiles a day; days before a lost caravan is replaced
    POST_COST: { gold: 1500, wood: 5, stone: 5 },
    KEEP_COST: { gold: 2500, wood: 10, stone: 10 },
    TRUCE_DAYS: 12, ROADS_DAYS: 30,
  };
  RL.REGION_WORDS = {
    grass: ['Meadows', 'Downs', 'Vale', 'Leas', 'Fields', 'Greens'], dirt: ['Reach', 'Steppe', 'Flats', 'Barrens', 'Plain'],
    rough: ['Highs', 'Shelf', 'Uplands', 'Scarp', 'Heights'], snow: ['Whites', 'Frostmarch', 'Pale Heights', 'Snows'],
    swamp: ['Fen', 'Mire', 'Low Marsh', 'Sumps', 'Bog'], sand: ['Dunes', 'Strand', 'Sands', 'Shore'],
    ash: ['Cinders', 'Ashfeld', 'Burnt Lands', 'Embers'], dusk: ['Duskwaste', 'Gloaming', 'Dimlands'], moon: ['Moon'],
    forest: ['Woods', 'Weald', 'Holt', 'Forest', 'Thicket'], mountain: ['Crags', 'Peaks', 'Teeth', 'Spines'],
  };
  RL.PLACE_NAMES = ['Orrin', 'Vessa', 'Thren', 'Kessal', 'Lun', 'Quor', 'Ardeth', 'Miri', 'Usk', 'Nor', 'Hal', 'Bren', 'Esk', 'Tam', 'Sorrel', 'Pike', 'Odd', 'Lark', 'Thistle', 'Ferrow', 'Wend', 'Cobb', 'Hollin', 'Mirren', 'Quill', 'Ashby', 'Varn', 'Onnar', 'Dim', 'Kel', 'Ruun', 'Seld', 'Tor', 'Wyn', 'Yarra', 'Zell'];
  RL.FAMILIES = ['the House of Orrin', 'the Vessil family', 'the Keepers of Thren', 'the Lantern-Wardens', 'the Duskmoor clan', 'the Ashfeld family', 'the Sons of Quora', 'the Harrow kin', 'the Mirren house', 'the Brask family'];
  RL.KEEP_NAMES = ['Holdfast', 'Watch', 'Keep', 'Hold', 'Tower', 'Fort', 'Stead'];

  /* ======================= small helpers ======================= */
  function heap() {
    const h = [];
    return { get size() { return h.length; },
      push(f, i) { h.push([f, i]); let k = h.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (h[p][0] <= h[k][0]) break; [h[p], h[k]] = [h[k], h[p]]; k = p; } },
      pop() { const top = h[0], last = h.pop(); if (h.length) { h[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === k) break; [h[m], h[k]] = [h[k], h[m]]; k = m; } } return top; } };
  }
  RL.heap = heap;
  const landAt = (L, i) => { const T = D.TERRAIN[S.TCODES[L.t[i]]]; return !T.water && !T.void; };
  RL.id = (li, k) => li * 1000 + k;
  RL.region = (st, id) => id == null || id < 0 ? null : (st.regions && st.regions[Math.floor(id / 1000)] || [])[id % 1000] || null;
  RL.regionAt = function (st, li, x, y) {
    const L = st.layers[li]; if (!L || !L.reg || !S.inside(L, x, y)) return null;
    const k = L.reg[y * L.w + x]; return k ? st.regions[li][k - 1] : null;
  };
  RL.all = st => (st.regions || []).reduce((a, l) => a.concat(l), []);
  RL.regionsOf = (st, pi) => RL.all(st).filter(r => r.owner === pi);
  RL.friendly = (st, a, b) => a === b || (a >= 0 && b >= 0 && S.allies(st, a, b));

  /* ======================= making the territories ======================= */
  /* seeds: every town gets a territory of its own; then the farthest land from all seeds, until the world is shared out */
  RL.makeRegions = function (st) {
    const R = SU.makeRng((st.seed || 1) ^ 0x2f1a77);
    st.regions = [];
    const used = new Set();
    st.layers.forEach((L, li) => {
      const w = L.w, h = L.h, N = w * h; L.reg = new Uint8Array(N);
      const list = []; st.regions.push(list);
      let landN = 0; for (let i = 0; i < N; i++) if (landAt(L, i)) landN++;
      if (!landN) return;
      const seeds = [];
      if (li === 3) {
        /* the Kalo: every moon is a territory */
        const seen = new Uint8Array(N);
        for (let i = 0; i < N; i++) { if (seen[i] || !landAt(L, i)) continue;
          const comp = [], q = [i]; seen[i] = 1;
          while (q.length) { const j = q.pop(); comp.push(j); const x = j % w, y = (j / w) | 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (!S.inside(L, xx, yy)) continue; const k = yy * w + xx; if (!seen[k] && landAt(L, k)) { seen[k] = 1; q.push(k); } } }
          let sx = 0, sy = 0; comp.forEach(j => { sx += j % w; sy += (j / w) | 0; });
          const cx = Math.round(sx / comp.length), cy = Math.round(sy / comp.length);
          const best = comp.reduce((b, j) => { const d = Math.hypot(j % w - cx, ((j / w) | 0) - cy); return d < b[0] ? [d, j] : b; }, [1e9, comp[0]])[1];
          if (comp.length >= 6) seeds.push(best);
        }
      } else {
        Object.values(st.objects).forEach(o => { if (o.type === 'town' && o.layer === li && S.inside(L, o.x, o.y + 1)) seeds.push((o.y + 1) * w + o.x); });
        const want = SU.clamp(Math.round(landN / 112), 3, 60);
        let guard = 0;
        while (seeds.length < want && guard++ < want * 3) {
          let best = -1, bestD = -1;
          for (let k = 0; k < 500; k++) { const i = R.int(0, N - 1); if (!landAt(L, i) || L.ob[i] === S.OB.mountain) continue;
            const x = i % w, y = (i / w) | 0; let d = Math.min(x, y, w - 1 - x, h - 1 - y) * 0.6 + 6;
            seeds.forEach(s => { d = Math.min(d, Math.hypot(s % w - x, ((s / w) | 0) - y)); });
            if (d > bestD) { bestD = d; best = i; } }
          if (best < 0 || bestD < 4) break;
          seeds.push(best);
        }
      }
      /* grow them over the land: forests slow the growth and mountains slower still, so ranges become borders */
      const dist = new Float32Array(N).fill(Infinity), H = heap();
      seeds.forEach((s, k) => { dist[s] = 0; L.reg[s] = k + 1; H.push(0, s); });
      while (H.size) {
        const [d, i] = H.pop(); if (d > dist[i]) continue;
        const x = i % w, y = (i / w) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue;
          const xx = x + dx, yy = y + dy; if (!S.inside(L, xx, yy)) continue; const j = yy * w + xx; if (!landAt(L, j)) continue;
          const c = (L.ob[j] === S.OB.mountain ? 5 : L.ob[j] ? 1.8 : 1) * (dx && dy ? 1.41 : 1);
          if (d + c < dist[j]) { dist[j] = d + c; L.reg[j] = L.reg[i]; H.push(d + c, j); } }
      }
      /* islands no seed could walk to: the nearest territory across the water */
      for (let i = 0; i < N; i++) if (landAt(L, i) && !L.reg[i]) { const x = i % w, y = (i / w) | 0; let b = 0, bd = 1e9;
        seeds.forEach((s, k) => { const dd = Math.hypot(s % w - x, ((s / w) | 0) - y); if (dd < bd) { bd = dd; b = k + 1; } }); L.reg[i] = b; }
      /* the records */
      seeds.forEach((s, k) => {
        const counts = {}; let n = 0, forest = 0, mtn = 0, glow = 0;
        for (let i = 0; i < N; i++) if (L.reg[i] === k + 1) { n++; const t = S.TCODES[L.t[i]]; counts[t] = (counts[t] || 0) + 1;
          if (L.ob[i] === S.OB.mountain || L.ob[i] === S.OB.ridge) mtn++; else if (L.ob[i] === S.OB.tree || L.ob[i] === S.OB.pine || L.ob[i] === S.OB.glowtree) forest++; if (L.ob[i] === S.OB.glowtree) glow++; }
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        const kind = li === 3 ? 'moon' : mtn / n > 0.28 ? 'mountain' : forest / n > 0.32 ? 'forest' : top ? top[0] : 'grass';
        let name;
        if (li === 3) { const m = (st.moons || []).find(mm => Math.hypot(mm.x - s % w, mm.y - ((s / w) | 0)) <= (mm.r || 5) + 2); name = m ? m.name : 'A nameless moon'; }
        else { for (let t = 0; t < 30; t++) { const word = R.pick(RL.REGION_WORDS[kind] || RL.REGION_WORDS.grass);
            name = R.chance(0.35) ? 'the ' + word : R.pick(RL.PLACE_NAMES) + ' ' + word;
            if (!used.has(name)) break; } }
        used.add(name);
        const seat = seatNear(st, li, s % w, (s / w) | 0, k + 1);
        const r = { id: RL.id(li, k), li, k, name, x: seat[0], y: seat[1], owner: -1, size: n, kind,
          frac: { forest: forest / n, mtn: mtn / n, glow: glow / n, grass: ((counts.grass || 0) + (counts.dirt || 0)) / n, swamp: (counts.swamp || 0) / n, snow: (counts.snow || 0) / n, sand: ((counts.sand || 0) + (counts.ash || 0)) / n }, base: {} };
        r.base = baseYield(r, R);
        list.push(r);
      });
    });
    return st.regions;
  };
  function seatNear(st, li, x, y, k) {
    const L = st.layers[li];
    for (let rad = 0; rad < 12; rad++) for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue; const xx = x + dx, yy = y + dy;
      if (!S.inside(L, xx, yy) || L.reg[yy * L.w + xx] !== k) continue;
      if (S.passable(st, li, xx, yy)) return [xx, yy];
    }
    return [x, y];
  }
  /* what the land itself gives each day, before any mine: a little tax, food from the fields, wood from woods, stone from the hills.
     Some territories also give a little of a rare thing. */
  function baseYield(r, R) {
    const f = r.frac, y = {};
    y.gold = Math.min(260, 70 + Math.round(r.size * 0.9));
    const food = f.grass * 12 + f.swamp * 6; if (food >= 1) y.food = Math.round(food);
    if (f.forest > 0.12) y.wood = f.forest > 0.3 ? 2 : 1;
    if (f.mtn > 0.08 || r.kind === 'rough' || r.kind === 'snow') y.stone = f.mtn > 0.22 ? 2 : 1;
    if (r.kind === 'moon') { y.stygian = 0.4; y.gold = 150; return y; }
    if (R.chance(0.3)) { const rare = f.glow > 0.01 ? 'glowmoss' : f.swamp > 0.2 ? 'ngakara' : f.sand > 0.25 ? 'timber' : f.mtn > 0.15 || f.snow > 0.2 ? 'stygian' : R.pick(['glowmoss', 'timber', 'stygian']); y[rare] = 0.3; }
    return y;
  }
  /* a player's first territory gives the basics, and sometimes one rare thing */
  RL.homeYield = function (st, r, faction) {
    const R = SU.makeRng((st.seed || 1) + r.id * 31);
    r.base.gold = Math.max(r.base.gold || 0, 200); r.base.wood = Math.max(r.base.wood || 0, 2); r.base.stone = Math.max(r.base.stone || 0, 2); r.base.food = Math.max(r.base.food || 0, 10);
    ['stygian', 'ngakara', 'timber', 'glowmoss'].forEach(k => delete r.base[k]);
    if (R.chance(0.5)) r.base[faction === 'elsharyn' ? R.pick(['glowmoss', 'timber']) : R.pick(['stygian', 'ngakara'])] = 0.4;
  };

  /* everything set up once a map's objects are all placed (random maps and made maps alike) */
  RL.setup = function (st) {
    if (!st.regions || !st.layers[0].reg) RL.makeRegions(st);
    st.pacts = st.pacts || []; st.offers = st.offers || [];
    /* each player holds the territory of their first town */
    st.players.forEach((P, pi) => S.townsOf(st, pi).forEach(t => { const r = RL.regionAt(st, t.layer, t.x, t.y + 1) || RL.regionAt(st, t.layer, t.x, t.y); if (r) { r.owner = pi; if (t.id === P.startTown || S.townsOf(st, pi)[0] === t) RL.homeYield(st, r, P.faction); } }));
    RL.snapshotSketch(st);
    RL.syncPlaces(st);
  };
  /* the drawing everyone carries: the land as it was when the game began, and the places near towns */
  RL.snapshotSketch = function (st) {
    const towns = Object.values(st.objects).filter(o => o.type === 'town');
    const near = o => { const ts = towns.filter(t => t.layer === o.layer); return ts.length ? Math.min(...ts.map(t => Math.hypot(t.x - o.x, t.y - o.y))) : 99; };
    st.sketch = Object.values(st.objects).filter(o => !o.hidden && !o.buried && ['town', 'keep', 'village', 'urverk', 'mine', 'visit'].includes(o.type)).filter(o => {
      if (o.type === 'town') return true;
      const d = o.layer === 3 ? 8 : near(o);
      return o.type === 'urverk' ? d < 30 : o.type === 'keep' || o.type === 'village' ? d < 24 : d < 13;
    }).map(o => ({ t: o.type, l: o.layer, x: o.x, y: o.y, k: o.kind || null, n: o.name || null }));
  };

  /* ======================= authority and control ======================= */
  RL.armyWeight = function (st, a) {
    if (a.dead || a.temp || a.caravan) return 0;
    const pow = S.power(S.slotsOf(st, a), S.heroOf(st, a));
    /* wild bands hold the land; a guard keeps to what it guards, and counts for half */
    if (a.wild) { if (a.herd || a.mcfly || a.travellers) return 0; return (K.WILD + Math.min(K.WILD_MAX, pow / K.WILD_DIV)) * (a.guard ? 0.5 : 1); }
    return a.heroId ? K.HERO + Math.min(K.HERO_MAX, pow / K.HERO_DIV) : K.BAND + Math.min(K.BAND_MAX, pow / K.BAND_DIV);
  };
  RL.placeWeight = function (st, o) {
    if (o.gone) return 0;
    if (o.type === 'town') return K.TOWN + (o.pop || 0) / 20;
    if (o.type === 'keep') return K.KEEP + Math.min(20, S.power(o.garrison || []) / 1000);
    if (o.type === 'post') return K.POST;
    return 0;
  };
  /* who stands where: per territory, each player's authority, the independents', and the share of the independents bound by a treaty to each player */
  RL.tally = function (st) {
    const np = st.players.length, all = RL.all(st);
    all.forEach(r => { r._s = new Array(np).fill(0); r._n = 0; r._nf = new Array(np).fill(0); r._wild = 0; r._wl = []; });
    Object.values(st.objects).forEach(o => {
      const w = RL.placeWeight(st, o); if (!w) return;
      const r = RL.regionAt(st, o.layer, o.x, o.y + (o.type === 'town' ? 1 : 0)) || RL.regionAt(st, o.layer, o.x, o.y); if (!r) return;
      if (o.owner >= 0) r._s[o.owner] += w; else { r._n += w; st.players.forEach((P, pi) => { if (o.treaty && o.treaty[pi]) r._nf[pi] += w; }); }
    });
    Object.values(st.armies).forEach(a => {
      const w = RL.armyWeight(st, a); if (!w) return;
      const r = RL.regionAt(st, a.layer, a.x, a.y); if (!r) return;
      if (a.owner >= 0) r._s[a.owner] += w; else r._wl.push(w);
    });
    /* scattered wild things do not stand together: the biggest band counts in full, the rest for a little */
    all.forEach(r => { if (!r._wl.length) return; const mx = Math.max(...r._wl), sum = r._wl.reduce((t, v) => t + v, 0); r._wild = mx + K.WILD_REST * (sum - mx); r._n += r._wild; r._wl = null; });
    all.forEach(r => { if (r.owner >= 0 && st.players[r.owner] && st.players[r.owner].alive) r._s[r.owner] += K.HOLD; });
    return all;
  };
  /* everything against player pi in a territory: rivals who are not allies, and independents without a treaty */
  RL.against = function (st, r, pi) {
    let opp = r._n - (pi >= 0 ? r._nf[pi] : 0);
    r._s.forEach((s, q) => { if (q !== pi && s > 0 && !RL.friendly(st, q, pi)) opp += s; });
    return opp;
  };
  RL.update = function (st, quiet) {
    const all = RL.tally(st), changed = [];
    all.forEach(r => {
      const inc = r.owner >= 0 && st.players[r.owner] && st.players[r.owner].alive ? r.owner : -1;
      let owner = inc;
      if (inc >= 0 && !(r._s[inc] > 0 && r._s[inc] >= RL.against(st, r, inc))) owner = -1;
      /* a challenger with enough authority takes it */
      let best = -1, bestS = 0;
      r._s.forEach((s, pi) => { if (pi === owner || !st.players[pi].alive || s < 12) return; if (s >= K.TAKE * RL.against(st, r, pi) && s > bestS) { best = pi; bestS = s; } });
      if (best >= 0 && (owner < 0 || bestS > r._s[owner])) owner = best;
      if (owner !== r.owner) { changed.push({ r, from: r.owner, to: owner }); r.owner = owner; }
    });
    if (changed.length) RL.syncPlaces(st);
    changed.forEach(c => {
      if (quiet) return;
      if (c.to >= 0) S.log(st, st.players[c.to].name + ' now holds ' + c.r.name + '.', c.to);
      if (c.from >= 0) { S.log(st, st.players[c.from].name + ' has lost ' + c.r.name + '.', c.from); SU.emit('lost', { owner: c.from, what: c.r.name }); }
      SU.emit('region', c);
    });
    return changed;
  };
  /* mines and villages belong to whoever holds their territory */
  RL.syncPlaces = function (st) {
    Object.values(st.objects).forEach(o => { if (o.type !== 'mine' && o.type !== 'village') return; const r = RL.regionAt(st, o.layer, o.x, o.y + 1) || RL.regionAt(st, o.layer, o.x, o.y); o.owner = r ? r.owner : -1; });
  };
  /* which territories touch which (worked out once a game, not saved) */
  RL.neighbors = function (st, r) {
    if (!st._adj) {
      st._adj = {};
      st.layers.forEach((L, li) => { if (!L.reg) return; const w = L.w;
        for (let y = 0; y < L.h; y++) for (let x = 0; x < w; x++) { const a = L.reg[y * w + x]; if (!a) continue;
          [[1, 0], [0, 1], [1, 1], [-1, 1]].forEach(([dx, dy]) => { const xx = x + dx, yy = y + dy; if (!S.inside(L, xx, yy)) return; const b = L.reg[yy * w + xx]; if (!b || b === a) return;
            const ia = RL.id(li, a - 1), ib = RL.id(li, b - 1); (st._adj[ia] = st._adj[ia] || new Set()).add(ib); (st._adj[ib] = st._adj[ib] || new Set()).add(ia); }); } });
    }
    return [...(st._adj[r.id] || [])].map(id => RL.region(st, id)).filter(Boolean);
  };
  RL.wildIn = (st, r) => Object.values(st.armies).filter(a => a.wild && !a.dead && !a.herd && !a.mcfly && !a.travellers && RL.regionAt(st, a.layer, a.x, a.y) === r);
  /* a plain account of a territory, for the screens */
  RL.describe = function (st, r, pi) {
    RL.tally(st);
    const mine = r._s[pi] || 0, opp = RL.against(st, r, pi);
    const holder = r.owner >= 0 ? st.players[r.owner].name : 'nobody';
    let state;
    if (r.owner === pi) state = mine >= opp * K.TAKE ? 'Yours, and firmly held.' : 'Yours, but contested: you may lose it.';
    else if (mine > 0 && mine >= opp * K.TAKE) state = 'Yours by the end of the day, if nothing changes.';
    else if (mine > 0) state = 'You need ' + Math.ceil(opp * K.TAKE - mine) + ' more authority here to take it.';
    else state = r.owner >= 0 ? 'Held by ' + holder + '.' : (r._wild > 0 ? 'Wild land: creatures hold it.' : r._n > 0 ? 'Held by independent folk.' : 'Unclaimed.');
    return { mine: Math.round(mine), against: Math.round(opp), holder, state, wild: Math.round(r._wild) };
  };

  /* ======================= what a territory yields ======================= */
  RL.regionYield = function (st, r, newWeek) {
    const y = Object.assign({}, r.base);
    const storm = st.storm && st.storm.layer === r.li && Math.hypot(st.storm.x - r.x, st.storm.y - r.y) <= st.storm.r;
    Object.values(st.objects).forEach(o => {
      if (o.type !== 'mine' || o.gone) return; const rr = RL.regionAt(st, o.layer, o.x, o.y + 1) || RL.regionAt(st, o.layer, o.x, o.y); if (rr !== r) return;
      const Mi = D.MINES[o.kind]; let amt = Mi.amt;
      if (o.kind === 'ngakara') { if (!o.naga || !o.naga.alive || !newWeek) return; amt = o.naga.calm > 0 ? 2 : 1; if (o.naga.calm > 0) o.naga.calm--; }
      if (o.kind === 'food' && st.weekEvent === 'lean') amt /= 2; if (o.kind === 'food' && st.weekEvent === 'harvest') amt *= 1.33;
      if (o.harvest === st.day - 1) amt *= 2;
      y[Mi.res] = (y[Mi.res] || 0) + amt;
    });
    if (storm) Object.keys(y).forEach(k => y[k] /= 2);
    return y;
  };
  RL.townIn = (st, r, pi) => Object.values(st.objects).some(o => o.type === 'town' && o.owner === pi && !o.gone && (RL.regionAt(st, o.layer, o.x, o.y + 1) || RL.regionAt(st, o.layer, o.x, o.y)) === r);
  /* a day's goods from every territory a player holds: straight in where a town of theirs stands, by caravan elsewhere */
  RL.income = function (st, pi, newWeek) {
    const P = st.players[pi], got = {}; P._frac = P._frac || {};
    RL.regionsOf(st, pi).forEach(r => {
      const home = RL.townIn(st, r, pi), cv = r.cv && r.cv.owner === pi ? r.cv : null;
      if (!home && !(cv && cv._deliver)) return;
      Object.entries(RL.regionYield(st, r, newWeek)).forEach(([k, v]) => got[k] = (got[k] || 0) + v);
    });
    Object.entries(got).forEach(([k, v]) => { const t = v + (P._frac[k] || 0), whole = Math.floor(t); P._frac[k] = t - whole; P.res[k] = (P.res[k] || 0) + whole; });
    P.lastLand = got;
    return got;
  };
  /* what the land would give a day if every caravan came through (for the kingdom screen) */
  RL.wouldYield = function (st, pi) { const out = {}; RL.regionsOf(st, pi).forEach(r => Object.entries(RL.regionYield(st, r, false)).forEach(([k, v]) => out[k] = (out[k] || 0) + v)); return out; };

  /* ======================= caravans ======================= */
  /* the way home for a territory's goods: to the nearest town of yours on that world, or to an Urverk that leads to one */
  RL.route = function (st, r, pi) {
    const li = r.li, L = st.layers[li], w = L.w, N = w * L.h;
    const goals = new Map();
    S.townsOf(st, pi).forEach(t => { if (t.layer === li) goals.set(t.y * w + t.x, t.id); });
    if (!goals.size) Object.values(st.objects).forEach(o => { if (o.type !== 'urverk' || o.layer !== li || !o.triggerKnown) return; const d = st.objects[o.link]; if (d && S.townsOf(st, pi).some(t => t.layer === d.layer)) goals.set(o.y * w + o.x, o.id); });
    if (!goals.size) return null;
    const start = r.y * w + r.x, dist = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), H = heap();
    dist[start] = 0; H.push(0, start); let hit = -1, n = 0;
    while (H.size && n++ < 40000) {
      const [d, i] = H.pop(); if (d > dist[i]) continue; if (goals.has(i)) { hit = i; break; }
      const x = i % w, y = (i / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (!S.inside(L, xx, yy)) continue; const j = yy * w + xx;
        if (!goals.has(j) && !S.passable(st, li, xx, yy)) continue;
        const T = D.TERRAIN[S.TCODES[L.t[j]]]; const c = (L.road[j] ? 0.5 : T.cost / 100) * (dx && dy ? 1.41 : 1);
        if (d + c < dist[j]) { dist[j] = d + c; prev[j] = i; H.push(d + c, j); } }
    }
    if (hit < 0) return null;
    const path = []; for (let i = hit; i >= 0; i = prev[i]) { path.push(i); if (i === start) break; }
    path.reverse();
    return { tiles: path, to: goals.get(hit), days: Math.max(1, Math.ceil(dist[hit] / 14)) };
  };
  /* the territories a route crosses (not counting where it starts) */
  RL.routeRegions = function (st, li, tiles) {
    const L = st.layers[li], seen = new Set(), out = [];
    tiles.forEach(i => { const k = L.reg[i]; if (!k || seen.has(k)) return; seen.add(k); out.push(st.regions[li][k - 1]); });
    return out;
  };
  /* the chance a day that bandits fall on a caravan, and why */
  RL.routeRisk = function (st, r, pi) {
    const cv = r.cv; if (!cv || !cv.tiles) return { risk: 0, through: [] };
    let risk = 0; const through = [];
    RL.routeRegions(st, r.li, cv.tiles).forEach(q => {
      if (q === r) return;
      if (q.owner === pi || RL.friendly(st, q.owner, pi) || (q.owner >= 0 && RL.pact(st, pi, q.owner, 'roads'))) return;
      if (RL.postIn(st, q, pi)) { risk += 0.01; return; }
      RL.tally(st);
      let k = 0.05 + (q._wild > 0 ? 0.06 : 0) + (q.owner >= 0 ? 0.08 : 0);
      risk += k; through.push(q);
    });
    return { risk: Math.min(0.6, risk), through };
  };
  RL.postIn = (st, r, pi) => Object.values(st.objects).some(o => o.type === 'post' && o.owner === pi && !o.gone && RL.regionAt(st, o.layer, o.x, o.y) === r);
  function freeAlong(st, li, tiles, from) {
    const L = st.layers[li];
    for (let k = from; k < tiles.length - 1; k++) { const i = tiles[k], x = i % L.w, y = (i / L.w) | 0; if (!S.armyAt(st, li, x, y) && !S.objAt(st, li, x, y) && S.passable(st, li, x, y)) return k; }
    return -1;
  }
  RL.dropCaravan = function (st, r) {
    if (!r.cv) return; const a = r.cv.army && st.armies[r.cv.army];
    if (a && !a.dead) RU().removeArmy(st, a);
    r.cv = null;
  };
  /* once a day: every held territory away from a town sends its goods home; caravans form, walk, and are sometimes robbed */
  RL.caravanDay = function (st) {
    const R = SU.rng(st);
    RL.all(st).forEach(r => {
      const pi = r.owner;
      if (r.cv && r.cv.owner !== pi) RL.dropCaravan(st, r);
      if (pi < 0) return;
      if (RL.townIn(st, r, pi)) { if (r.cv) RL.dropCaravan(st, r); return; }
      if (!r.cv) r.cv = { owner: pi, army: null, down: 0 };
      const cv = r.cv; cv._deliver = false;
      let a = cv.army && st.armies[cv.army]; if (a && a.dead) a = null;
      /* a fresh route each week, or when the old one ends nowhere */
      if (!a && st.day >= (cv.down || 0)) {
        const rt = RL.route(st, r, pi);
        if (!rt) { cv.tiles = null; cv.noRoute = true; return; }
        cv.tiles = rt.tiles; cv.to = rt.to; cv.days = rt.days; cv.noRoute = false; cv.made = st.day;
        const k = freeAlong(st, r.li, cv.tiles, 0); if (k < 0) return;
        const L = st.layers[r.li], i = cv.tiles[k];
        a = M.army(st, pi, r.li, i % L.w, (i / L.w) | 0, null, [{ kind: 'stack', cr: 'dompunk', n: 6 + Math.floor(st.day / 10) }, null, null, null, null]);
        a.caravan = { rid: r.id }; a.at = k; a.dir = 1; cv.army = a.id;
      }
      if (!a) return;
      if (st.day - (cv.made || 0) >= 6) { const rt = RL.route(st, r, pi); if (rt) { cv.tiles = rt.tiles; cv.to = rt.to; cv.days = rt.days; cv.made = st.day; a.at = Math.min(a.at || 0, cv.tiles.length - 1); } }
      /* walk back and forth along the way */
      const L = st.layers[r.li], tiles = cv.tiles; if (!tiles || tiles.length < 2) { cv._deliver = true; return; }
      let at = SU.clamp(a.at || 0, 0, tiles.length - 1);
      for (let s = 0; s < K.CARAVAN_STEPS; s++) {
        let nx = at + (a.dir || 1);
        if (nx >= tiles.length - 1 || nx < 0) { a.dir = -(a.dir || 1); nx = at + a.dir; }
        if (nx < 0 || nx >= tiles.length - 1) break;
        const i = tiles[nx], x = i % L.w, y = (i / L.w) | 0;
        if (S.armyAt(st, r.li, x, y) || S.objAt(st, r.li, x, y) || !S.passable(st, r.li, x, y)) continue;
        a.face = x > a.x ? 1 : x < a.x ? -1 : a.face; S.moveArmyIndex(st, a, r.li, x, y); at = nx;
      }
      a.at = at;
      /* bandits on the way */
      const risk = RL.routeRisk(st, r, pi);
      cv.risk = risk.risk;
      if (risk.risk > 0 && R.chance(risk.risk)) {
        const band = 400 + st.day * 45, guard = S.power(a.slots);
        const lose = f => S.stacksIn(a.slots).forEach(s => s.n = Math.max(0, s.n - Math.ceil(s.n * f)));
        if (guard >= band * 1.3) { lose(0.1); S.log(st, 'Bandits fell on the caravan from ' + r.name + ', and its guards drove them off.', pi); cv._deliver = true; }
        else if (guard < band * 0.5) { S.log(st, 'Bandits took the caravan from ' + r.name + ' on the road through ' + (risk.through[0] ? risk.through[0].name : 'the wilds') + '. A new one sets out in ' + K.CARAVAN_DOWN + ' days.', pi); SU.emit('caravan', { owner: pi, region: r.name, lost: true });
          RU().removeArmy(st, a); cv.army = null; cv.down = st.day + K.CARAVAN_DOWN; }
        else { lose(0.4); S.log(st, 'Bandits robbed the caravan from ' + r.name + ' of a day’s goods.', pi); SU.emit('caravan', { owner: pi, region: r.name }); }
        if (S.isEmptySlots(a.slots) && !a.dead) { RU().removeArmy(st, a); cv.army = null; cv.down = st.day + K.CARAVAN_DOWN; }
        return;
      }
      cv._deliver = true;
    });
  };
  /* a caravan beaten in battle: the winner takes what it carried */
  RL.caravanLost = function (st, a, by, rep) {
    const r = a.caravan && RL.region(st, a.caravan.rid); if (!r) return;
    if (r.cv && r.cv.army === a.id) { r.cv.army = null; r.cv.down = st.day + K.CARAVAN_DOWN; }
    if (by >= 0 && st.players[by]) { const y = RL.regionYield(st, r, false), Q = st.players[by], took = {};
      Object.entries(y).forEach(([k, v]) => { const n = Math.floor(v * 2); if (n > 0) { Q.res[k] = (Q.res[k] || 0) + n; took[k] = n; } });
      if (rep) rep.plunder = took; S.log(st, Q.name + ' plundered a caravan from ' + r.name + '.', by); }
    S.log(st, 'The caravan from ' + r.name + ' was lost.', a.owner);
  };

  /* ======================= watch posts ======================= */
  RL.canPost = function (st, a) {
    const P = st.players[a.owner], r = RL.regionAt(st, a.layer, a.x, a.y);
    if (!r) return { ok: false, why: 'There is no land here to build on.' };
    if (RL.postIn(st, r, a.owner)) return { ok: false, why: 'You already keep a watch post in ' + r.name + '.' };
    if (!RU().afford(P, K.POST_COST)) return { ok: false, why: 'A watch post costs 1500 gold, 5 wood and 5 stone.', poor: true };
    const spot = RU().freeNear(st, a.layer, a.x, a.y); if (!spot || (spot[0] === a.x && spot[1] === a.y)) { const s2 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dy]) => [a.x + dx, a.y + dy]).find(([x, y]) => S.passable(st, a.layer, x, y) && !S.objAt(st, a.layer, x, y) && !S.armyAt(st, a.layer, x, y)); if (!s2) return { ok: false, why: 'There is no room here.' }; return { ok: true, spot: s2, r }; }
    return { ok: true, spot, r };
  };
  RL.buildPost = function (st, a) {
    const c = RL.canPost(st, a); if (!c.ok) return c;
    RU().pay(st.players[a.owner], K.POST_COST);
    const o = { id: SU.uid(st, 'o'), type: 'post', layer: a.layer, x: c.spot[0], y: c.spot[1], owner: a.owner, built: st.day };
    st.objects[o.id] = o; S.place(st, o); a.mp = Math.max(0, a.mp - 400);
    S.reveal(st, a.owner, a.layer, o.x, o.y, 5);
    S.log(st, st.players[a.owner].name + ' raised a watch post in ' + c.r.name + '.', a.owner);
    return { ok: true, obj: o, r: c.r };
  };

  /* ======================= who can talk ======================= */
  /* Dearcàn: heroes, captains, and the peoples (not beasts) */
  RL.dearcanSlots = function (slots) { if (S.captainsIn(slots).length) return true; return S.stacksIn(slots).some(s => s.n > 0 && D.CREATURES[s.cr] && D.CREATURES[s.cr].people); };
  RL.canSpeak = (st, a) => !!a && (!!a.heroId || RL.dearcanSlots(S.slotsOf(st, a)));
  RL.canHear = function (st, x) {
    if (!x) return false;
    if (x.type === 'town' || x.type === 'keep') return true;
    if (x.herd || x.mcfly) return false;
    return !!x.heroId || RL.dearcanSlots(S.slotsOf(st, x));
  };
  RL.canTalk = (st, a, x) => RL.canSpeak(st, a) && RL.canHear(st, x);
  const dipl = (st, a) => { const h = S.heroOf(st, a); return h ? S.skillVal(st, h, 'diplomacy') / 100 : 0; };
  /* how a band feels about a deal: your Diplomacy, how strong you look beside them, and a little luck */
  RL.mood = function (st, a, w) {
    const mine = S.power(S.slotsOf(st, a), S.heroOf(st, a)), theirs = Math.max(1, S.power(S.slotsOf(st, w), S.heroOf(st, w)));
    const ratio = mine / theirs;
    let p = 0.25 + dipl(st, a) + (ratio > 2 ? 0.3 : ratio > 1.2 ? 0.15 : ratio < 0.6 ? -0.15 : 0);
    if (S.captainsIn(S.slotsOf(st, a)).some(c => c.abil === 'charm')) p += 0.05;
    return SU.clamp(p, 0.05, 0.95);
  };
  RL.bandTerms = function (st, a, w) {
    const pow = Math.max(300, S.power(S.slotsOf(st, w)));
    const off = 1 - dipl(st, a) * 0.5, r50 = v => Math.max(50, Math.round(v * off / 50) * 50);
    const p = RL.mood(st, a, w);
    return {
      join: { fee: r50(pow / 6), pay: Math.max(20, Math.round(pow / 90 / 10) * 10), p: SU.clamp(p - (w.guard ? 0.1 : 0), 0.05, 0.95) },
      leave: { fee: r50(pow / 10), p: SU.clamp(p + 0.1, 0.05, 0.95) },
      pass: { fee: r50(pow / 25), p: SU.clamp(p + 0.25, 0.05, 0.97) },
    };
  };
  /* talk to a band: 'join' (as paid mercenaries), 'leave' (this land), 'pass' (let us by for a week) */
  RL.talkBand = function (st, a, w, kind) {
    const P = st.players[a.owner], R = SU.rng(st);
    w.talked = w.talked || {};
    if (w.talked[a.owner] === st.day) return { ok: false, why: 'They have heard you today. They will not talk again until tomorrow.' };
    const t = RL.bandTerms(st, a, w)[kind]; if (!t) return { ok: false };
    if (P.res.gold < t.fee) return { ok: false, why: 'They want ' + t.fee + ' gold, and you do not have it.', poor: true };
    w.talked[a.owner] = st.day;
    if (!R.chance(t.p)) return { ok: false, refused: true, why: kind === 'join' ? 'They laugh at the offer. They answer to no one.' : kind === 'leave' ? 'They will not be moved. This is their land.' : 'They will not let you by.' };
    P.res.gold -= t.fee;
    if (kind === 'join') {
      w.owner = a.owner; w.wild = false; w.guard = null; w.roam = false; w.merc = { pay: t.pay, since: st.day };
      w.mpMax = RU().mpMax(st, w); w.mp = 0;
      S.log(st, 'A band joined ' + P.name + ' as mercenaries, for ' + t.pay + ' gold a day.', a.owner);
      RL.update(st, true);
      return { ok: true, msg: 'They take your gold and your colours. They will fight for you as long as you pay them ' + t.pay + ' gold a day.' };
    }
    if (kind === 'leave') {
      const spot = RL.farSpot(st, w.layer, w.x, w.y);
      if (spot) { S.moveArmyIndex(st, w, w.layer, spot[0], spot[1]); w.home = { x: spot[0], y: spot[1] }; w.guard = null; } else RU().removeArmy(st, w);
      RL.update(st, true);
      return { ok: true, msg: 'They take the gold and go, to seek their fortune somewhere far from here.' };
    }
    w.passFor = w.passFor || {}; w.passFor[a.owner] = st.day + D.WEEK;
    return { ok: true, msg: 'They step aside. For a week, your armies may pass them by.' };
  };
  /* somewhere far away in land nobody holds, for a band that leaves */
  RL.farSpot = function (st, li, x, y) {
    const R = SU.rng(st), L = st.layers[li];
    for (let k = 0; k < 300; k++) { const xx = R.int(2, L.w - 3), yy = R.int(2, L.h - 3); if (Math.hypot(xx - x, yy - y) < 14) continue;
      const r = RL.regionAt(st, li, xx, yy); if (!r || r.owner >= 0) continue;
      if (S.passable(st, li, xx, yy) && !S.objAt(st, li, xx, yy) && !S.armyAt(st, li, xx, yy)) return [xx, yy]; }
    return null;
  };
  /* mercenaries are paid each day; unpaid, they go their own way */
  RL.payMercs = function (st, pi) {
    const P = st.players[pi]; const mercs = Object.values(st.armies).filter(a => !a.dead && a.owner === pi && a.merc);
    mercs.sort((p, q) => q.merc.pay - p.merc.pay).forEach(a => {
      if (P.res.gold >= a.merc.pay) { P.res.gold -= a.merc.pay; return; }
      a.owner = -1; a.wild = true; a.merc = null; a.home = { x: a.x, y: a.y }; a.roam = true;
      S.log(st, 'Unpaid, a mercenary band left ' + P.name + '’s service.', pi); SU.emit('lost', { owner: pi, what: 'a mercenary band (unpaid)' });
    });
  };

  /* ---------- towns and keeps that answer to no one ---------- */
  RL.rel = (o, pi) => (o.rel && o.rel[pi]) || 0;
  RL.townTerms = function (st, a, o) {
    const def = RU().townDefense(st, o), dp = def ? S.power(def.slots, def.hero) : 0, mine = S.power(S.slotsOf(st, a), S.heroOf(st, a));
    const rel = RL.rel(o, a.owner), d = dipl(st, a);
    return { rel: Math.round(rel), treaty: !!(o.treaty && o.treaty[a.owner]),
      canTreaty: rel >= 30 - d * 20, canJoin: rel >= 75 - d * 25 || (rel >= 45 - d * 15 && mine >= dp * 2.5), joinCost: o.type === 'keep' ? 1000 : 2500, giftStep: 1000 };
  };
  RL.talkTown = function (st, a, o, kind, amt) {
    const P = st.players[a.owner], pi = a.owner; o.rel = o.rel || {}; o.treaty = o.treaty || {};
    const T = RL.townTerms(st, a, o), d = dipl(st, a);
    if (kind === 'gift') { amt = Math.min(amt || 1000, P.res.gold); if (amt <= 0) return { ok: false, why: 'You have no gold to give.' };
      P.res.gold -= amt; o.rel[pi] = Math.min(100, RL.rel(o, pi) + amt / 40 * (1 + d)); return { ok: true, msg: 'They take the gift gladly. They think better of you now.' }; }
    if (kind === 'treaty') { if (!T.canTreaty) return { ok: false, why: 'They do not know you well enough for a treaty yet.' };
      o.treaty[pi] = st.day; S.log(st, P.name + ' made a treaty with ' + o.name + '.', pi); RL.update(st, true); return { ok: true, msg: 'A treaty of trade and friendship. Their land will not stand against yours, your caravans pass safely, and their trade brings you gold each day.' }; }
    if (kind === 'end') { delete o.treaty[pi]; o.rel[pi] = Math.max(0, RL.rel(o, pi) - 30); return { ok: true, msg: 'The treaty is ended.' }; }
    if (kind === 'join') { if (!T.canJoin) return { ok: false, why: 'They will not bow to you. Earn their trust first, or come with an army they cannot refuse.' };
      if (P.res.gold < T.joinCost) return { ok: false, why: 'Taking them in costs ' + T.joinCost + ' gold.', poor: true };
      P.res.gold -= T.joinCost; o.owner = pi; delete o.treaty[pi];
      if (o.type === 'town') { o.heroes = o.heroes || []; o.builtToday = 0; }
      S.log(st, o.name + ' joined ' + P.name + '’s kingdom.', pi); RL.update(st, true); RU().checkPlayers(st);
      return { ok: true, joined: true, msg: o.name + ' is yours now: its people, its walls and its garrison. You are their ruler.' }; }
    return { ok: false };
  };
  /* treaties pay a little each day, and friendship grows while they hold */
  RL.treatyDay = function (st) {
    Object.values(st.objects).forEach(o => { if ((o.type !== 'town' && o.type !== 'keep') || o.owner >= 0 || !o.treaty) return;
      Object.keys(o.treaty).forEach(k => { const pi = +k, P = st.players[pi]; if (!P || !P.alive) return;
        P.res.gold += o.type === 'town' ? 100 + Math.round((o.pop || 0) / 5) : 60; o.rel = o.rel || {}; o.rel[pi] = Math.min(100, RL.rel(o, pi) + 0.5); }); });
  };

  /* ---------- rivals: pacts and offers ---------- */
  RL.pact = (st, a, b, kind) => (st.pacts || []).find(p => p.kind === kind && p.until >= st.day && ((p.a === a && p.b === b) || (p.a === b && p.b === a))) || null;
  RL.atPeace = (st, a, b) => a >= 0 && b >= 0 && a !== b && !!RL.pact(st, a, b, 'truce');
  RL.kingdomPower = function (st, pi) {
    let p = 0; Object.values(st.armies).forEach(a => { if (!a.dead && a.owner === pi && !a.caravan) p += S.power(S.slotsOf(st, a), S.heroOf(st, a)); });
    S.townsOf(st, pi).forEach(t => { p += S.power(t.garrison); (t.heroes || []).forEach(id => { const h = st.heroes[id]; if (h) p += S.power(h.slots, h); }); });
    return p;
  };
  const value = res => Object.entries(res || {}).reduce((t, [k, v]) => t + (D.MARKET_VALUE[k] || 1) * v, 0);
  /* would a computer player take this offer? */
  RL.aiWould = function (st, o) {
    const me = st.players[o.to], them = o.from, myP = RL.kingdomPower(st, o.to), theirP = RL.kingdomPower(st, them);
    const R = SU.rng(st);
    switch (o.kind) {
      case 'truce': return myP < theirP * 0.95 || ((me.style === 'builder' || me.style === 'turtle') && R.chance(0.5)) || (myP < theirP * 1.3 && R.chance(0.3));
      case 'roads': return myP < theirP * 1.5 && R.chance(0.7);
      case 'trade': { const give = o.get || {}, get = o.give || {}; if (!Object.entries(give).every(([k, v]) => (me.res[k] || 0) >= v)) return false; return value(get) >= value(give) * 1.15; }
      case 'yield': return S.townsOf(st, o.to).length <= 1 && myP < theirP * 0.2;
    }
    return false;
  };
  /* make an offer to a rival. A computer answers at once; a person answers at the start of their turn */
  RL.offer = function (st, from, to, kind, terms) {
    const o = Object.assign({ id: SU.uid(st, 'q'), from, to, kind, day: st.day }, terms || {});
    if (kind === 'trade' && !Object.entries(o.give || {}).every(([k, v]) => (st.players[from].res[k] || 0) >= v)) return { ok: false, why: 'You do not have what you are offering.' };
    if (RL.pact(st, from, to, kind)) return { ok: false, why: 'You already have that pact.' };
    if (st.players[to].kind === 'ai') { const yes = RL.aiWould(st, o); if (yes) RL.accept(st, o); return { ok: true, answered: true, yes, msg: yes ? st.players[to].name + ' agrees.' : st.players[to].name + ' refuses.' }; }
    st.offers = (st.offers || []).filter(q => !(q.from === from && q.to === to && q.kind === kind)); st.offers.push(o);
    return { ok: true, answered: false, msg: 'Your envoy rides to ' + st.players[to].name + '. They will answer on their turn.' };
  };
  RL.accept = function (st, o) {
    const A = st.players[o.from], B = st.players[o.to];
    st.offers = (st.offers || []).filter(q => q.id !== o.id);
    if (o.kind === 'truce' || o.kind === 'roads') { st.pacts = (st.pacts || []).filter(p => p.until >= st.day); st.pacts.push({ a: o.from, b: o.to, kind: o.kind, until: st.day + (o.kind === 'truce' ? K.TRUCE_DAYS : K.ROADS_DAYS) });
      S.log(st, A.name + ' and ' + B.name + ' made ' + (o.kind === 'truce' ? 'a truce for ' + K.TRUCE_DAYS + ' days' : 'a pact of open roads for ' + K.ROADS_DAYS + ' days') + '.'); return { ok: true }; }
    if (o.kind === 'trade') { const okA = Object.entries(o.give || {}).every(([k, v]) => (A.res[k] || 0) >= v), okB = Object.entries(o.get || {}).every(([k, v]) => (B.res[k] || 0) >= v);
      if (!okA || !okB) return { ok: false, why: 'One side no longer has the goods.' };
      Object.entries(o.give || {}).forEach(([k, v]) => { A.res[k] -= v; B.res[k] = (B.res[k] || 0) + v; }); Object.entries(o.get || {}).forEach(([k, v]) => { B.res[k] -= v; A.res[k] = (A.res[k] || 0) + v; });
      S.log(st, A.name + ' and ' + B.name + ' traded.'); return { ok: true }; }
    if (o.kind === 'yield') {
      Object.values(st.objects).forEach(x => { if ((x.type === 'town' || x.type === 'keep' || x.type === 'post') && x.owner === o.to) x.owner = o.from; });
      Object.values(st.armies).forEach(a => { if (a.owner === o.to && !a.dead) { if (a.heroId) { const h = st.heroes[a.heroId]; if (h) { h.owner = o.from; } a.owner = o.from; } else a.owner = o.from; } });
      Object.values(st.heroes).forEach(h => { if (h.owner === o.to) h.owner = o.from; });
      B.alive = false; S.log(st, B.name + ' yielded everything to ' + A.name + '.'); RL.update(st, true); RU().checkPlayers(st); return { ok: true }; }
    return { ok: false };
  };
  RL.decline = function (st, o) { st.offers = (st.offers || []).filter(q => q.id !== o.id); S.log(st, st.players[o.to].name + ' refused ' + st.players[o.from].name + '’s offer.', o.from); };
  RL.offersFor = (st, pi) => (st.offers || []).filter(o => o.to === pi);

  /* ======================= the land changing ======================= */
  /* a free place for something with a body (a keep or a town) */
  RL.siteFree = function (st, li, x, y, foot) {
    const L = st.layers[li]; if (x < 3 || y < 4 || x > L.w - 4 || y > L.h - 4) return false;
    const cells = [[0, 0], [0, 1], [-1, 1], [1, 1]].concat(foot || []);
    for (const [dx, dy] of cells) { const xx = x + dx, yy = y + dy, i = yy * L.w + xx;
      if (!S.inside(L, xx, yy) || D.TERRAIN[S.TCODES[L.t[i]]].pass === false || L.ob[i] === S.OB.mountain || st._block[li][i] || st._occ[li][i] || S.armyAt(st, li, xx, yy)) return false; }
    return true;
  };
  RL.findSite = function (st, r, foot, R) {
    const L = st.layers[r.li];
    for (let k = 0; k < 220; k++) { const rad = 1 + k / 18, a = R.range(0, Math.PI * 2); const x = Math.round(r.x + Math.cos(a) * rad), y = Math.round(r.y + Math.sin(a) * rad);
      if (!S.inside(L, x, y) || L.reg[y * L.w + x] !== r.k + 1) continue; if (RL.siteFree(st, r.li, x, y, foot)) return [x, y]; }
    return null;
  };
  const KEEP_FOOT = [[-1, 0], [-1, -1], [0, -1]];
  RL.KEEP_FOOT = KEEP_FOOT;
  const TOWN_FOOT = [[-1, 0], [1, 0], [-1, -1], [0, -1], [1, -1], [-1, -2], [0, -2], [1, -2]];
  RL.placesIn = (st, r, types) => Object.values(st.objects).filter(o => !o.gone && types.includes(o.type) && (RL.regionAt(st, o.layer, o.x, o.y + (o.type === 'town' ? 1 : 0)) || RL.regionAt(st, o.layer, o.x, o.y)) === r);
  RL.makeKeep = function (st, li, x, y, owner, opts) {
    opts = opts || {}; const R = SU.rng(st);
    const L = st.layers[li];
    const o = { id: SU.uid(st, 'o'), type: 'keep', layer: li, x, y, owner, name: opts.name || (R.pick(RL.PLACE_NAMES) + ' ' + R.pick(RL.KEEP_NAMES)), family: opts.family || R.pick(RL.FAMILIES),
      built: ['fort1'], heroes: [], defender: null, garrison: opts.garrison || [null, null, null, null, null], rel: {}, treaty: {}, faction: opts.faction || 'duskareth', founded: st.day };
    S.footprint(o).forEach(([dx, dy]) => { const xx = x + dx, yy = y + dy; if (S.inside(L, xx, yy)) L.ob[yy * L.w + xx] = 0; });
    st.objects[o.id] = o; S.place(st, o);
    if (opts.power) { const g = M.wild(st, li, 0, 0, opts.power, { only: opts.only || ['velnur', 'ver', 'speareikar', 'malsti'] }); o.garrison = g.slots; delete st.armies[g.id]; if (st._armyAt[li].get(0) === g.id) st._armyAt[li].delete(0); }
    return o;
  };
  RL.makeTown = function (st, li, x, y, fac) {
    const R = SU.rng(st), t = M.town(st, li, x, y, -1, null, fac);
    t.built = ['hall1', fac === 'elsharyn' ? 'e1' : 'd1']; t.pop = 120; t.founded = st.day; t.rel = {}; t.treaty = {};
    const L = st.layers[li]; S.footprint(t).forEach(([dx, dy]) => { const xx = x + dx, yy = y + dy; if (S.inside(L, xx, yy)) L.ob[yy * L.w + xx] = 0; });
    S.place(st, t);
    return t;
  };
  /* travellers: wandering folk who walk to an empty place and found a keep or a town there */
  RL.spawnTravellers = function (st, li) {
    const R = SU.rng(st), L = st.layers[li];
    const empty = st.regions[li].filter(r => r.owner < 0 && !RL.placesIn(st, r, ['town', 'keep']).length);
    if (!empty.length) return null;
    const dest = R.pick(empty);
    /* they come in from the edge of the world, or off a road */
    let p = null; for (let k = 0; k < 200 && !p; k++) { const x = R.int(2, L.w - 3), y = R.int(2, L.h - 3); const r = RL.regionAt(st, li, x, y); if (!r || r === dest) continue; if (Math.hypot(x - dest.x, y - dest.y) < 10) continue; if (S.passable(st, li, x, y) && !S.objAt(st, li, x, y) && !S.armyAt(st, li, x, y)) p = [x, y]; }
    if (!p) return null;
    const fac = R.pick(['duskareth', 'elsharyn']);
    const g = M.wild(st, li, p[0], p[1], 900 + st.day * 30, { only: fac === 'elsharyn' ? ['speareikar'] : ['velnur'] });
    g.travellers = { dest: dest.id, fac, since: st.day }; g.roam = false; g.herd = false;
    S.log(st, 'Travellers are on the roads of ' + D.LAYERS[li].name + ', looking for a place to settle.');
    return g;
  };
  RL.travellerDay = function (st) {
    const R = SU.rng(st);
    Object.values(st.armies).forEach(a => {
      if (!a.travellers || a.dead) return;
      const dest = RL.region(st, a.travellers.dest);
      if (!dest || dest.owner >= 0 || RL.placesIn(st, dest, ['town', 'keep']).length || st.day - a.travellers.since > 40) {
        const empty = st.regions[a.layer].filter(r => r.owner < 0 && !RL.placesIn(st, r, ['town', 'keep']).length);
        if (!empty.length || st.day - a.travellers.since > 40) { RU().removeArmy(st, a); return; }
        a.travellers.dest = R.pick(empty).id; return;
      }
      if (RL.regionAt(st, a.layer, a.x, a.y) === dest && Math.hypot(a.x - dest.x, a.y - dest.y) < 6) { RL.settle(st, a, dest); return; }
      const p = RU().path(st, a, dest.x, dest.y, { seeAll: true, throughObjects: false });
      if (!p) { const s = RL.findSite(st, dest, TOWN_FOOT, R); if (!s) return; a.travellers.dest = dest.id; return; }
      for (let k = 0; k < Math.min(6, p.length - 1); k++) { const s = p[k]; if (S.armyAt(st, a.layer, s.x, s.y) || S.objAt(st, a.layer, s.x, s.y)) break; S.moveArmyIndex(st, a, a.layer, s.x, s.y); }
    });
  };
  /* where travellers stop: a new town if there is room and luck, otherwise a keep */
  RL.settle = function (st, a, r, owner) {
    const R = SU.rng(st), fac = a.travellers ? a.travellers.fac : 'duskareth';
    owner = owner == null ? -1 : owner;
    const asTown = owner < 0 && R.chance(0.4);
    const spot = RL.findSite(st, r, asTown ? TOWN_FOOT : KEEP_FOOT, R);
    if (!spot) { RU().removeArmy(st, a); return null; }
    const slots = a.slots; RU().removeArmy(st, a);
    let o;
    if (asTown && RL.siteFree(st, r.li, spot[0], spot[1], TOWN_FOOT)) { o = RL.makeTown(st, r.li, spot[0], spot[1], fac); o.garrison = slots; S.log(st, 'Travellers founded the town of ' + o.name + ' in ' + r.name + ' on ' + D.LAYERS[r.li].name + '.'); }
    else { o = RL.makeKeep(st, r.li, spot[0], spot[1], owner, { garrison: slots, faction: fac }); S.log(st, (owner >= 0 ? 'Settlers raised ' + o.name + ' for ' + st.players[owner].name : 'Travellers raised the keep of ' + o.name) + ' in ' + r.name + '.'); }
    RL.update(st, true);
    return o;
  };
  /* travellers met on the road: ask them to settle in one of your towns, or to raise a keep for you here */
  RL.talkTravellers = function (st, a, w, kind) {
    const P = st.players[a.owner];
    if (kind === 'town') { const t = RU().nearestHome(st, a.owner, a.layer, a.x, a.y); if (!t) return { ok: false, why: 'You have no town for them.' };
      const n = RU().welcome(t, 30 + Math.round(S.armySize(w.slots) / 2)); if (n <= 0) return { ok: false, why: t.name + ' has no room for them: build homes first.' };
      RU().removeArmy(st, w); S.log(st, n + ' travellers went to live in ' + t.name + '.', a.owner); return { ok: true, msg: n + ' of them set off for ' + t.name + ', to live there.' }; }
    if (kind === 'keep') { const r = RL.regionAt(st, w.layer, w.x, w.y); if (!r || r.owner !== a.owner) return { ok: false, why: 'They will only raise a keep for you in land you hold.' };
      if (!RU().afford(P, K.KEEP_COST)) return { ok: false, why: 'Raising a keep costs 2500 gold, 10 wood and 10 stone.', poor: true };
      RU().pay(P, K.KEEP_COST); const o = RL.settle(st, w, r, a.owner); if (!o) return { ok: false, why: 'There is no room for a keep here.' };
      return { ok: true, msg: 'They raise ' + o.name + ' for you, and keep it with their own spears.', obj: o }; }
    return { ok: false };
  };
  /* independent towns grow on their own: more people, new buildings (all the way), a stronger garrison */
  const BUILD_ORDER = ['tavern', 'fort1', 'd2', 'market', 'hall2', 'd3', 'd4', 'granary', 'fort2', 'd5', 'terraces', 'd6', 'hall3', 'd7', 'farms', 'fort3', 'hall4', 'terraces2', 'd8', 'hall5', 'd1u', 'd2u', 'd3u', 'd4u'];
  RL.growNeutral = function (st, t) {
    const fac = D.factionOf(t.faction), order = BUILD_ORDER.map(b => fac === 'elsharyn' ? b.replace(/^d(\d)(u?)$/, 'e$1$2') : b);
    t.pop = Math.min(Math.max(t.pop, 60) * 1.07 + 10, Math.max(RU().housing(t), t.pop));
    let n = t.pop > 600 ? 2 : 1;
    for (const b of order) { if (n <= 0) break; const B = D.BUILDINGS[b]; if (!B || RU().has(t, b)) continue;
      if (B.replaces && !RU().has(t, B.replaces)) continue; if ((B.req || []).some(q => !RU().has(t, q))) continue; if (B.pop && t.pop < B.pop) continue; if (B.faction && B.faction !== fac) continue; if (B.coast && !t.coast) continue;
      if (B.replaces) t.built = t.built.filter(x => x !== B.replaces); t.built.push(b); n--; }
    RU().townDwellings(t).forEach(d => { const C = D.CREATURES[d.base]; if (C.legendary) return; const g = Math.max(1, Math.round(C.grow * 0.5)); RU().addToSlots(st, t.garrison, d.up || d.base, g, null, { noCap: true }); });
  };
  /* once a month a family may raise a keep in land nobody holds */
  RL.familyKeeps = function (st) {
    const R = SU.rng(st);
    for (let li = 0; li < 3; li++) {
      const empty = (st.regions[li] || []).filter(r => r.owner < 0 && !RL.placesIn(st, r, ['town', 'keep']).length);
      if (!empty.length || !R.chance(0.5)) continue;
      const r = R.pick(empty), s = RL.findSite(st, r, KEEP_FOOT, R); if (!s) continue;
      const o = RL.makeKeep(st, li, s[0], s[1], -1, { power: 1800 + st.day * 70 });
      S.log(st, o.family.replace(/^the /, 'The ') + ' raised ' + o.name + ' in ' + r.name + ' on ' + D.LAYERS[li].name + '.');
    }
  };
  /* land nobody holds goes wild: creatures move in, and villages with nobody to keep them fall to ruin */
  RL.wildWeek = function (st) {
    const R = SU.rng(st); RL.tally(st);
    RL.all(st).forEach(r => {
      if (r.li === 3 || r.owner >= 0 || RL.placesIn(st, r, ['town', 'keep']).length) return;
      if (r._wild <= 0 && R.chance(0.2)) { const L = st.layers[r.li]; for (let k = 0; k < 60; k++) { const x = r.x + R.int(-5, 5), y = r.y + R.int(-5, 5);
          if (!S.inside(L, x, y) || L.reg[y * L.w + x] !== r.k + 1 || !S.passable(st, r.li, x, y) || S.objAt(st, r.li, x, y) || S.armyAt(st, r.li, x, y)) continue;
          M.wild(st, r.li, x, y, 1500 + st.day * 60, { roam: R.chance(0.4) }); break; } }
      if (r._wild > 0) RL.placesIn(st, r, ['village']).forEach(v => { if (R.chance(0.08)) { RL.toRuin(st, v); S.log(st, 'The village of ' + v.name + ' in ' + r.name + ', with nobody to keep it, has fallen to ruin.'); } });
    });
  };
  RL.toRuin = function (st, o) { o.type = 'ruin'; o.was = o.name; o.loot = { gold: 600 + SU.rng(st).int(0, 8) * 100 }; o.owner = -1; };
  /* a ruin's leavings, once */
  RL.searchRuin = function (st, a, o) {
    const P = st.players[a.owner];
    if (!o.loot) return { stop: true, msg: 'The ruin has been searched already. There is nothing left.' };
    const g = o.loot.gold || 0; P.res.gold += g; const extra = o.loot.res ? ' and ' + o.loot.amt + ' ' + D.RES_INFO[o.loot.res].name : '';
    if (o.loot.res) P.res[o.loot.res] = (P.res[o.loot.res] || 0) + o.loot.amt;
    o.loot = null; return { stop: true, msg: 'Among the stones: ' + g + ' gold' + extra + '.' };
  };

  /* ======================= the day ======================= */
  RL.day = function (st, newWeek, newMonth) {
    if (!st.regions) return;
    st.pacts = (st.pacts || []).filter(p => p.until >= st.day);
    st.offers = (st.offers || []).filter(o => st.day - o.day <= 3);
    RL.update(st);
    RL.caravanDay(st);
    RL.treatyDay(st);
    RL.travellerDay(st);
    if (newWeek) {
      Object.values(st.objects).forEach(o => { if (o.type === 'town' && o.owner < 0) RL.growNeutral(st, o); });
      const want = { S: 1, M: 1, L: 2, XL: 2, G: 3 }[st.setup.size] || 1;
      for (let li = 0; li < 3; li++) if (Object.values(st.armies).filter(a => a.travellers && !a.dead && a.layer === li).length < want && SU.rng(st).chance(0.45)) RL.spawnTravellers(st, li);
      RL.wildWeek(st);
    }
    if (newMonth) RL.familyKeeps(st);
  };
})(typeof window !== 'undefined' ? window : globalThis);
