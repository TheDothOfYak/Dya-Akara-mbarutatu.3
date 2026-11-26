// 4 Brothers World V2 — part 27: golden boss chests.
//  * A big golden chest stands near every world boss (by the place its rift opens). It is sealed until that boss
//    has been beaten. Each hero can open it once, and it holds much better things than the boss drops:
//    a whole Legendary Key, a Gold Crystal, Star Embers, bars of that world's best metal, a pile of rupees, and a
//    legendary staff you don't have yet. Later worlds give more.
//  * A silver chest waits in each scorpion den's chamber, by the Mother Scorpion's hoard. It opens once each time
//    you beat her (she comes back after 20 minutes), with good things, though not as good as a golden chest.
(function (RW) {
  'use strict';
  const A = RW.art, E = RW.ent, P = RW.player, U = RW.ui, TS = RW.TILE, WD = RW.world;
  if (!A || !E || !P || !WD || !RW.WORLDS) return;

  // ======================= 1. THE TILES =======================
  // The chest is two tiles wide: the left tile draws the whole chest, the right one only fills the space.
  const addTile = (d) => { if (RW.T[d.key] != null) return RW.T[d.key]; const id = RW.TILES.length; RW.TILES.push(Object.assign({}, d, { id })); RW.T[d.key] = id; return id; };
  const GC = addTile({ key: 'goldchest', name: 'Golden Boss Chest', solid: true, hard: 99, time: 99, decor: 'goldchest', light: [1.0, 0.8, 0.3] });
  const GR = addTile({ key: 'goldchestr', name: 'Golden Boss Chest', solid: true, hard: 99, time: 99, decor: 'goldchestr' });
  const SC = addTile({ key: 'silverchest', name: 'Silver Chest', solid: true, hard: 99, time: 99, decor: 'silverchest', light: [0.7, 0.8, 0.95] });
  const SR = addTile({ key: 'silverchestr', name: 'Silver Chest', solid: true, hard: 99, time: 99, decor: 'goldchestr' });

  // ======================= 2. WHAT'S INSIDE =======================
  // by world (its order: fuzzy 0, acorn 1, rock 2, ghost 3, duat 4)
  const BARS = [['bronze_bar', 6], ['platinum_bar', 5], ['platinum_bar', 6, 'stygian_bar', 2], ['stygian_bar', 6], ['soulsteel_bar', 6]];
  const STAFFS = ['ember_staff', 'tide_staff', 'wisp_staff'];
  const opened = (wid) => !!(P.flags && P.flags['goldchest_' + wid]);
  const beaten = (wid) => !!((RW.state && RW.state.bosses && RW.state.bosses[wid]) || (P.flags && P.flags['boss_' + wid]));
  const bossName = (def) => { const s = def.boss && RW.SPECIES[def.boss.species]; return (s && s.name) || 'the boss'; };

  function openGold(tx, ty) {
    const def = WD.def, wid = def.id;
    if (!beaten(wid)) { U.toast('A golden chest, sealed shut with old gold. Beat ' + bossName(def) + ' and it will open.'); RW.audio.sfx('deny'); return; }
    if (opened(wid)) { U.toast('You have already emptied this golden chest.'); return; }
    P.flags['goldchest_' + wid] = 1;
    const ord = Math.max(0, Math.min(4, def.order || 0)), x = tx * TS + 16, y = ty * TS - 4;
    const give = (id, n) => { if (n > 0 && RW.ITEMS[id]) E.dropItem(id, n, x + RW.rand(-6, 6), y); };
    const got = [];
    give('legend_key', 1); got.push('a Legendary Key');
    give('crystal_gold', ord >= 3 ? 2 : 1); got.push('Gold Crystal');
    give('star_ember', RW.randi(2, 3) + (ord >= 2 ? 1 : 0)); got.push('Star Embers');
    const b = BARS[ord]; give(b[0], b[1]); if (b[2]) give(b[2], b[3]);
    got.push(RW.ITEMS[b[0]] ? RW.ITEMS[b[0]].name + 's' : 'bars');
    give('crystal_purple', 1); give('key_fragment', RW.randi(1, 2));
    const left = STAFFS.filter((id) => RW.ITEMS[id] && !P.has(id) && !(P.flags.gotStaff && P.flags.gotStaff[id]));
    const prize = left.length ? RW.pick(left) : null;
    if (prize) { give(prize, 1); P.flags.gotStaff = Object.assign({}, P.flags.gotStaff, { [prize]: 1 }); }
    give('coin', RW.randi(150, 220) + ord * 60 + (prize ? 0 : 100));
    RW.fx.burst(x, y, ['#ffe08a', '#ffffff', '#f2c94c', '#ff9a3a'], 60, 170, { add: true, kind: 'glow', grav: -40 });
    RW.fx.ring(x, y + 8, '#ffe08a', 30, 0.5, 2); RW.fx.flash('#fff0b0', 0.25); RW.fx.shake(5, 0.5); RW.audio.sfx('crystal');
    U.banner('Golden chest!', 'Inside: ' + (prize ? 'the ' + RW.ITEMS[prize].name + ', ' : '') + got.join(', ') + ' and a big pile of rupees.');
    RW.game.saveSoon();
  }
  // ---- silver chests in the scorpion dens: one opening for each time you beat that den's Mother ----
  const denAt = (tx) => ((WD.meta && WD.meta.dens) || []).find((d) => tx >= d.x0 - 2 && tx <= d.x1 + 2);
  const kills = (id) => (P.flags && P.flags['mkill_' + id]) || 0;
  const silverUsed = (id) => (P.flags && P.flags['silver_' + id]) || 0;
  const silverReady = (id) => kills(id) > silverUsed(id);
  function openSilver(tx, ty) {
    const dn = denAt(tx); if (!dn) return;
    if (!silverReady(dn.id)) {
      U.toast(kills(dn.id) ? 'The silver chest is empty. Beat the Mother Scorpion again when she comes back, and it fills up.' : 'A silver chest, locked tight. Beat the Mother Scorpion and it will open.');
      RW.audio.sfx('deny'); return;
    }
    P.flags['silver_' + dn.id] = silverUsed(dn.id) + 1;
    const x = tx * TS + 16, y = ty * TS - 4, jungle = dn.kind === 'jungle';
    const give = (id, n) => { if (n > 0 && RW.ITEMS[id]) E.dropItem(id, n, x + RW.rand(-6, 6), y); };
    give('key_fragment', 2); give('star_ember', 1); give('crystal_purple', 1);
    give(RW.pick(['crystal_red', 'crystal_blue', 'crystal_green']), 1);
    give(jungle ? 'platinum_bar' : 'bronze_bar', jungle ? 3 : 4);
    give('mother_carapace', 1);
    const key = Math.random() < 0.25; if (key) give('legend_key', 1);
    give('coin', RW.randi(80, 120) + (jungle ? 40 : 0));
    RW.fx.burst(x, y, ['#e8f0ff', '#ffffff', '#a8b0bc', '#8ac0ff'], 40, 150, { add: true, kind: 'glow', grav: -40 });
    RW.fx.ring(x, y + 8, '#d8ecff', 24, 0.45, 2); RW.fx.shake(3, 0.35); RW.audio.sfx('crystal');
    U.banner('Silver chest!', 'Inside: Key Fragments, a Star Ember, crystals, ' + (jungle ? 'platinum' : 'bronze') + ' bars, a Mother\'s Carapace' + (key ? ', a whole Legendary Key' : '') + ' and rupees.');
    RW.game.saveSoon();
  }
  // count each Mother you beat (whoever's game it is)
  const bKill = E.kill;
  E.kill = function (e) {
    if (e && e.sp === 'scorp_mother' && e.denId && !e._v2counted) { e._v2counted = true; P.flags['mkill_' + e.denId] = kills(e.denId) + 1; setTimeout(() => U.toast('The silver chest in her chamber can be opened now.'), 3500); }
    return bKill.apply(this, arguments);
  };
  // the chest's left tile, from either half
  const chestAt = (x, y) => { const t = WD.get(x, y); return t === GC || t === SC ? [x, y] : t === GR || t === SR ? [x - 1, y] : null; };
  const openAt = (x, y) => (WD.get(x, y) === SC ? openSilver(x, y) : openGold(x, y));
  const baseMine = P.mineTile;
  P.mineTile = function (tx, ty) {
    const c = chestAt(tx, ty);
    if (c) { const t = performance.now(); if (!P._gcT || t - P._gcT > 600) { P._gcT = t; openAt(c[0], c[1]); } P.mine = null; return; }
    return baseMine.apply(this, arguments);
  };
  const baseInteract = P.interact;
  P.interact = function () {
    const c = P.center(), tx = Math.floor(c.x / TS), ty = Math.floor(c.y / TS);
    for (let y = ty - 2; y <= ty + 2; y++) for (let x = tx - 2; x <= tx + 2; x++) { const h = chestAt(x, y); if (h) { openAt(h[0], h[1]); return; } }
    return baseInteract.apply(this, arguments);
  };

  // ======================= 3. WHERE THEY GO =======================
  // on the floor a few steps from where the boss's rift opens, the same place every time
  function place(def, gen) {
    const M = gen.meta || {}, r = M.riftAt;
    const Wd = gen.W, Hd = gen.H, fg = gen.fg, T = RW.T;
    const at = (x, y) => (x < 0 || y < 0 || x >= Wd || y >= Hd ? T.bedrock : fg[y * Wd + x]);
    const solid = (x, y) => !!RW.TILES[at(x, y)].solid;
    const free = (x, y) => at(x, y) === T.air || at(x, y) === T.water;   // the Leviathan's chest sits on the sea floor
    const roomy = (x, y) => free(x, y) && free(x + 1, y) && free(x, y - 1) && free(x + 1, y - 1) && solid(x, y + 1) && solid(x + 1, y + 1);
    // silver chests: on the chamber floor of each scorpion den, on the other side from the Mother's hoard
    (M.dens || []).forEach((dn) => {
      for (const dx of [-10, -8, -12, -6, -14, -4, 4, 6]) for (let dy = -3; dy <= 4; dy++) {
        const x = dn.x + dx, y = dn.y + dy;
        if (roomy(x, y) && at(x - 1, y) !== T.woodchest) { fg[y * Wd + x] = SC; fg[y * Wd + x + 1] = SR; dn.silver = { x, y }; return; }
      }
    });
    if (!def.boss || !r) return;
    const ok = (x, y) => roomy(x, y) && Math.abs(x - r.x) >= 3;
    // close by first; the Leviathan's underwater bowl needs a wider look down to its floor
    const DX = [6, -7, 8, -9, 5, -6, 10, -11, 4, -5, 12, -13, 14, -15, 3, -4];
    for (const [dxs, y0, y1] of [[DX, -6, 10], [DX.concat([18, -19, 22, -23, 26, -27, 30, -31]), -6, 45]]) {
      for (const dx of dxs) for (let dy = y0; dy <= y1; dy++) {
        const x = r.x + dx, y = r.y + dy;
        if (ok(x, y)) { fg[y * Wd + x] = GC; fg[y * Wd + x + 1] = GR; M.goldChest = { x, y }; return; }
      }
    }
  }
  Object.values(RW.WORLDS).forEach((def) => {
    if (!def || !def.generate || def._v2gold) return; def._v2gold = true;
    const base = def.generate;
    def.generate = function () { const gen = base.apply(this, arguments); try { place(def, gen); } catch (e) { console.warn('golden chest', e); } return gen; };
  });

  // ======================= 4. THE LOOK =======================
  // a wide chest of beaten gold with a domed lid, darker gold panels, rivets and a red jewel lock.
  // Shut and dull-glinting while sealed; once you've opened it the lid stands up and it glows inside.
  const GOLD = { ol: '#3a2410', dk: '#9a6a1c', md: '#d8a032', gd: '#f2c94c', hi: '#fff0a8', gem: '#e8303e', gemhi: '#ff9aa0', in: '#2a1608', glow: '#ffe08a' };
  // silver: cool steel with a blue jewel
  const SILVER = { ol: '#24262e', dk: '#6a7280', md: '#a8b0bc', gd: '#d4dae2', hi: '#ffffff', gem: '#3a8aff', gemhi: '#a8d0ff', in: '#1a1c22', glow: '#d8ecff' };
  function drawChest(g, sx, sy, time, x, open, pal) {
    const C = pal || GOLD;
    const R = (c, a, b, w, h) => { g.fillStyle = c; g.fillRect(sx + a, sy + b, w, h); };
    // the chest is 30 px wide and 22 tall, its bottom on the tile's bottom
    const L = 1, B = 16;   // left edge, bottom y
    // body
    R(C.ol, L, B - 11, 30, 11); R(C.md, L + 1, B - 10, 28, 9); R(C.dk, L + 1, B - 2, 28, 1);
    R(C.gd, L + 3, B - 9, 7, 6); R(C.gd, L + 20, B - 9, 7, 6);                 // panels
    R(C.hi, L + 3, B - 9, 7, 1); R(C.hi, L + 20, B - 9, 7, 1);
    R(C.dk, L + 11, B - 10, 1, 9); R(C.dk, L + 18, B - 10, 1, 9);              // bands
    [[L + 2, B - 3], [L + 27, B - 3], [L + 2, B - 9], [L + 27, B - 9]].forEach(([a, b]) => R(C.hi, a, b, 1, 1));
    if (!open) {
      // domed lid
      R(C.ol, L, B - 18, 30, 7); R(C.ol, L + 2, B - 20, 26, 2); R(C.ol, L + 5, B - 21, 20, 1);
      R(C.md, L + 1, B - 17, 28, 5); R(C.md, L + 3, B - 19, 24, 2); R(C.gd, L + 6, B - 20, 18, 1);
      R(C.hi, L + 3, B - 19, 24, 1); R(C.hi, L + 1, B - 17, 2, 1);
      R(C.dk, L + 1, B - 12, 28, 1);
      R(C.dk, L + 11, B - 19, 1, 7); R(C.dk, L + 18, B - 19, 1, 7);
      // the lock: a red jewel on a gold plate across the seam
      R(C.ol, L + 12, B - 14, 6, 6); R(C.gd, L + 13, B - 13, 4, 4); R(C.gem, L + 14, B - 12, 2, 2); R(C.gemhi, L + 14, B - 12, 1, 1);
    } else {
      // the lid stands open behind, the inside glows
      R(C.ol, L + 1, B - 22, 28, 10); R(C.dk, L + 2, B - 21, 26, 8); R(C.md, L + 3, B - 20, 24, 2);
      R(C.ol, L, B - 12, 30, 2); R(C.in, L + 1, B - 12, 28, 2);
      const fl = 0.6 + 0.4 * Math.sin(time * 4 + x);
      g.globalAlpha = 0.5 + 0.4 * fl; R(C.glow, L + 3, B - 13, 24, 1); g.globalAlpha = 1;
      R(C.ol, L + 12, B - 10, 6, 4); R(C.gd, L + 13, B - 9, 4, 2); R(C.gem, L + 14, B - 9, 2, 1);
    }
    // a glint runs across the gold now and then
    const gl = (time * 0.6 + x * 0.13) % 3;
    if (gl < 1) { const gx = Math.round(L + 2 + gl * 26); g.fillStyle = '#ffffff'; g.fillRect(sx + gx, sy + B - (open ? 10 : 19), 1, 2); }
  }
  RW.v2drawGoldChest = drawChest;   // for previews
  RW.v2drawSilverChest = (g, sx, sy, time, x, open) => drawChest(g, sx, sy, time, x, open, SILVER);
  const baseDecor = A.drawDecor;
  A.drawDecor = function (g, t, sx, sy, time, stage, x, y) {
    if (t.decor === 'goldchestr') return;
    if (t.decor === 'silverchest') {
      const dn = denAt(x), ready = dn && silverReady(dn.id), open = dn && !ready && silverUsed(dn.id) > 0;
      drawChest(g, sx, sy, time, x, open, SILVER);
      if (ready && Math.random() < 0.04) RW.fx.spawn({ x: x * TS + 4 + Math.random() * 24, y: y * TS - 4, vy: -22, life: 0.9, color: RW.pick(['#d8ecff', '#ffffff']), add: true, kind: 'glow' });
      return;
    }
    if (t.decor !== 'goldchest') return baseDecor.apply(this, arguments);
    const wid = WD.def && WD.def.id, open = opened(wid);
    drawChest(g, sx, sy, time, x, open);
    if (beaten(wid) && !open && Math.random() < 0.05) RW.fx.spawn({ x: x * TS + 4 + Math.random() * 24, y: y * TS - 4, vy: -24, life: 1, color: RW.pick(['#ffe08a', '#ffffff']), add: true, kind: 'glow' });
    if (open && Math.random() < 0.03) RW.fx.spawn({ x: x * TS + 6 + Math.random() * 20, y: y * TS + 2, vy: -18, life: 0.8, color: '#ffe08a', add: true, kind: 'glow' });
  };
})(window.RW);
