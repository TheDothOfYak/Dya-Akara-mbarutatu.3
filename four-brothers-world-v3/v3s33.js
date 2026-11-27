// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 33: more shipwrecks in the sea at the top, your own waystone, and layer events.
//  * The sea over Rock World (new worlds) now holds two big wrecks (two decks, two masts, a captain's chest and a hold
//    chest) and five more small ones, on top of the old three. Their chests carry Coral-layer loot: coralite, pieces of
//    the Coral set, pearls and sea glass, coins and sometimes a Portkey.
//  * Waystone Arch: an expensive kit (forge) you set down (right click) where there is room; it builds an arch that
//    works like any other waystone (woken already, on the map).
//  * Events, about every 10-15 minutes in the layer you are in:
//      Tremor: the ground shakes, rocks fall from the roof, and new veins of the layer's ore crack open nearby.
//      Dark tide: the light drains away for a minute and a half, the dark creeps in, and rare dark things come out
//      (tough, but they carry boss ore, ember stars and radiant glowstones).
(function (RW) {
  'use strict';
  const P = RW.player, E = RW.ent, WD = RW.world, U = RW.ui, R = RW.register, A = RW.art, TS = RW.TILE;
  const L = RW.v3ringsLib, def = RW.WORLDS && RW.WORLDS.rock;
  if (!P || !WD || !R || !def) return;
  function addTile(d) { if (RW.T[d.key] != null) return RW.T[d.key]; const id = RW.TILES.length; RW.TILES.push(Object.assign({}, d, { id })); RW.T[d.key] = id; return id; }
  const ok = (rows) => rows.filter((r) => r[0] && RW.ITEMS[r[0]]);

  // ---------------- wrecks ----------------
  const WRECKC = addTile({ key: 'v3c_wreck', name: "Captain's Chest", solid: true, hard: 1, time: 1.0, decor: 'chest', chest: 'keep', loot: 'v3wreck' });
  if (A.buildTiles) { try { A.buildTiles(); } catch (e) { /* plain */ } }
  Object.defineProperty(RW.LOOT, 'v3wreck', { configurable: true, enumerable: true, get: () => { const S = RW.v3ringItems && RW.v3ringItems.SETS && RW.v3ringItems.SETS[0]; return ok([['coin', 40, 120, 1], ['coralite_bar', 2, 5, 0.8], ['coralite_ore', 6, 12, 0.6], [S && S.melee[0], 1, 1, 0.12], [S && S.bow[0], 1, 1, 0.1], [S && S.helm[0], 1, 1, 0.12], [S && S.mail[0], 1, 1, 0.1], ['v3_portkey', 1, 2, 0.4], ['v3m_pearlstone', 3, 6, 0.6], ['v3m_seaglass', 2, 5, 0.5], ['ship_plank', 4, 10, 0.8], ['glow_bright_cyan', 1, 1, 0.15]]); } });
  function wrecks(out) {
    const W = out.W, fg = out.fg, bg = out.bg, m = out.meta, T = RW.T, WL = RW.W, SEA = (m.layout && m.layout.SEA) || 70, seed = (m.seed || 1) + 1500;
    const hh = (a, b, k) => RW.hash2(a, b, seed + k);
    const floorAt = (x) => { let y = SEA; while (y < 300 && (fg[y * W + x] === T.water || fg[y * W + x] === T.air)) y++; return y; };
    const set = (x, y, t) => { if (x > 1 && x < W - 2) fg[y * W + x] = t; }, setb = (x, y, w) => { if (x > 1 && x < W - 2 && w != null) bg[y * W + x] = w; };
    const taken = ((m.secrets || []).filter((q) => q.kind === 'wreck')).map((q) => q.x);
    const pick = (half) => { for (let a = 0; a < 200; a++) { const x = Math.round(40 + hh(a, half, 1) * (W - 80)); if (taken.every((t) => Math.abs(t - x) > half + 24)) { taken.push(x); return x; } } return null; };
    const hull = (wx, Lw, Hh, decks) => {
      const f = floorAt(wx), tilt = hh(wx, 0, 2) < 0.5 ? 1 : -1;
      for (let y = f - Hh; y <= f + 1; y++) for (let x = wx - (Lw >> 1); x <= wx + (Lw >> 1); x++) {
        const dy = y - (f - Hh), inset = Math.max(0, dy - Hh + 4) * 1.5, xl = wx - (Lw >> 1) + inset, xr = wx + (Lw >> 1) - inset, yy = y; void tilt;
        if (x < xl || x > xr) continue;
        const edge = y === f + 1 || x <= xl + 1 || x >= xr - 1 || (y === f - Hh && hh(x, y, 3) < 0.55) || (decks > 1 && y === f - (Hh >> 1) && hh(x, y, 4) < 0.8);
        set(Math.round(x), yy, edge && hh(x, y, 7) > 0.16 ? T.shipplank : T.water); setb(Math.round(x), yy, WL.ship);
      }
      return f;
    };
    // two big wrecks
    for (let k = 0; k < 2; k++) {
      const wx = pick(24); if (wx == null) continue;
      const f = hull(wx, 44, 13, 2);
      for (const mx of [wx - 8, wx + 9]) { const top = f - 13 - 14 - (mx > wx ? 4 : 0); for (let y = top; y < f - 13; y++) set(mx, y, T.shipplank); for (let x = mx - 3; x <= mx + 3; x++) if (hh(x, top, 9) < 0.7) set(x, top + 3, T.shipplank); } // masts and yards
      set(wx + 12, f, WRECKC); set(wx - 4, f - 7, WRECKC); set(wx + 3, f, T.shipchest);
      (m.secrets = m.secrets || []).push({ x: wx, y: f, kind: 'wreck' });
    }
    // five more small ones
    for (let k = 0; k < 5; k++) {
      const wx = pick(12); if (wx == null) continue;
      const f = hull(wx, 20, 7, 1);
      for (let y = f - 7 - 9; y < f - 7; y++) set(wx - 3, y, T.shipplank);
      set(wx + 3, f, WRECKC); (m.secrets = m.secrets || []).push({ x: wx, y: f, kind: 'wreck' });
    }
  }

  // ---------------- your own waystone ----------------
  R.item({ id: 'v3_waystone_kit', name: 'Waystone Arch', kind: 'material', stack: 1, icon: { s: 'slab', a: '#7a8098', b: '#3a3e4e' }, desc: 'Set it down (right click) where there is room, 5 wide and 9 tall, on solid ground. It builds a waystone you can travel to from any other.' });
  R.recipes([{ out: 'v3_waystone_kit', in: { coralite_bar: 10, verdigrite_bar: 6, fangstone: 3, v3_portkey: 2 }, at: 'forge' }]);
  const wkey = () => 'v3waysx@w' + ((RW.v3slots && RW.v3slots.world) || 'none');
  RW.v3useItem = RW.v3useItem || {};
  RW.v3useItem.v3_waystone_kit = (it, m) => {
    if (!WD.def || WD.def.id !== 'rock' || !(WD.meta && WD.meta.v3ways)) { U.toast('It only takes root in Rock World.'); return true; }
    const T = RW.T, gx = Math.floor((m ? m.x : P.x) / TS), fy = Math.floor((m ? m.y : P.y + P.h) / TS) + 1;
    let floor = fy; while (floor < fy + 6 && !RW.TILES[WD.get(gx, floor)].solid) floor++;
    for (let dx = -2; dx <= 2; dx++) { if (!RW.TILES[WD.get(gx + dx, floor)].solid) { U.toast('It needs solid ground 5 blocks wide.'); return true; } for (let k = 1; k <= 8; k++) { const t = WD.get(gx + dx, floor - k); if (t !== T.air && t !== T.water) { U.toast('There isn\'t room here: it needs 5 wide and 9 tall.'); return true; } } }
    for (let k = 1; k <= 6; k++) { WD.setTile(gx - 2, floor - k, T.v3waystone); WD.setTile(gx + 2, floor - k, T.v3waystone); for (const dx of [-1, 0, 1]) WD.setTile(gx + dx, floor - k, T.v3waygate); }
    for (let dx = -2; dx <= 2; dx++) WD.setTile(gx + dx, floor - 7, T.v3waystone); WD.setTile(gx, floor - 8, T.v3waystone);
    const list = RW.store.get(wkey(), []), id = 100 + list.length, w = { id, name: 'Your Waystone ' + (list.length + 1), x: gx, y: floor };
    list.push(w); RW.store.set(wkey(), list); WD.meta.v3ways.push(w); if (RW.v3ways) RW.v3ways.wake(id);
    P.remove('v3_waystone_kit', 1); U.renderInv && U.renderInv(); U.banner && U.banner(w.name, 'It stands. Travel to it from any woken waystone through the map.');
    return true;
  };
  const baseInit = WD.init;
  WD.init = function () { const r = baseInit.apply(this, arguments); try { if (WD.def && WD.def.id === 'rock' && WD.meta && WD.meta.v3ways) RW.store.get(wkey(), []).forEach((w) => { if (!WD.meta.v3ways.some((q) => q.id === w.id)) WD.meta.v3ways.push(w); }); } catch (e) { /* none */ } return r; };

  const prevGen = def.generate;
  def.generate = function () {
    const out = prevGen.apply(this, arguments);
    try { if (out && out.meta && out.meta.v3rings && !(out.fg instanceof Uint8Array)) wrecks(out); } catch (e) { console.warn('v3 wrecks', e); }
    return out;
  };

  // ---------------- events ----------------
  // the dark things of a dark tide
  if (RW.SPECIES.creepy_fish && !RW.SPECIES.v3_darkling) R.species(Object.assign({}, RW.SPECIES.creepy_fish, { id: 'v3_darkling', name: 'Tide Darkling', hp: 900, dmg: 26, spawn: null, drops: [['star_ember', 0.6, 1, 2], ['glow_radiant_violet', 0.08, 1, 1], ['fangstone', 0.15, 1, 1], ['leafscale', 0.12, 1, 1], ['magmashell', 0.1, 1, 1], ['gravesteel', 0.08, 1, 1]], blurb: 'Something that only swims up when the dark tide comes. It carries things from deeper down.' }));
  const ORE_T = () => { const T = RW.T; return [T.iron, T.bronze, T.platinum, T.v3coralite, T.v3verdigrite, T.v3cindrite, T.v3fossilite, T.v3nullstone]; };
  let nextEv = 600 + Math.random() * 300, ev = null;
  const layerHere = () => { const c = P.center(), tx = c.x / TS, ty = c.y / TS; if (L && WD.meta && WD.meta.v3rings && ty >= L.CUT) { const r = L.regionAt(tx, ty); return r.j; } return 6; };
  function tremor() {
    const c = P.center(), tx = Math.floor(c.x / TS), ty = Math.floor(c.y / TS), j = layerHere(), T = RW.T;
    U.banner && U.banner('Tremor!', 'The ground shakes. Rocks fall, and new veins crack open nearby.'); RW.fx.shake(10, 3);
    const ore = j >= 1 && j <= 5 && L ? L.ORE[j] : ty > 300 ? T.platinum : ty > 200 ? T.bronze : T.iron;
    const rock = j >= 1 && j <= 5 && L ? L.ROCK[j] : null;
    let made = 0;
    for (let a = 0; a < 200 && made < 4; a++) {
      const x = tx + Math.round((Math.random() - 0.5) * 60), y = ty + Math.round((Math.random() - 0.5) * 40), t = WD.get(x, y), d = RW.TILES[t];
      if (!d || !d.solid || d.decor || (rock != null ? t !== rock : !(t === T.stone || t === T.deepstone))) continue;
      for (let k = 0; k < 7; k++) { const xx = x + Math.round((Math.random() - 0.5) * 4), yy = y + Math.round((Math.random() - 0.5) * 3), q = WD.get(xx, yy); if (rock != null ? q === rock : (q === T.stone || q === T.deepstone)) WD.setTile(xx, yy, ore); }
      made++; RW.fx.burst(x * TS + 8, y * TS + 8, ['#ffd860', '#ffffff'], 14, 80, { add: true, kind: 'glow', life: 1.2 });
    }
    return { kind: 'tremor', t: 20 };
  }
  function darkTide() {
    U.banner && U.banner('A dark tide', 'The light drains away. Something rare swims up from below.'); RW.fx.flash('#000000', 0.4);
    const c = P.center();
    for (let k = 0; k < 2; k++) { const e = RW.SPECIES.v3_darkling && E.spawnEnemy('v3_darkling', c.x + (k ? 1 : -1) * RW.rand(160, 260), c.y - RW.rand(40, 120)); if (e) { e.provoked = true; e.v3dark = true; } }
    return { kind: 'dark', t: 90 };
  }
  const baseUpd = P.update;
  P.update = function (dt) {
    const r = baseUpd.apply(this, arguments);
    if (!WD.def || WD.def.id !== 'rock' || P.dead || !(RW.game && RW.game.playing)) return r;
    if (ev) {
      ev.t -= dt;
      if (ev.kind === 'tremor') { if (Math.random() < dt * 3) { const c = P.center(); E.shots.push({ x: c.x + RW.rand(-220, 220), y: c.y - 220, vx: 0, vy: 60, grav: 500, life: 3, owner: 'e', dmg: 10, kind: 'rain', color: RW.pick(['#6a6660', '#8a847a', '#4a4640']) }); } RW.fx.shake(2, 0.1); }
      if (ev.t <= 0) { if (ev.kind === 'dark') U.toast('The dark tide ebbs.'); ev = null; }
    } else if ((nextEv -= dt) <= 0) {
      nextEv = 600 + Math.random() * 300;
      const c = P.center(); if (c.y / TS > 75) ev = Math.random() < 0.5 ? tremor() : darkTide(); // only underground
    }
    return r;
  };
  // the dark tide: the light drains away
  const baseAmb = def.ambientAt;
  def.ambientAt = function () { const a = baseAmb.apply(this, arguments); return ev && ev.kind === 'dark' ? a * 0.25 : a; };
  const baseOver = RW.fx.drawOver;
  RW.fx.drawOver = function (g, cam) {
    const r = baseOver.apply(this, arguments);
    if (ev && ev.kind === 'dark') { const k = Math.min(1, Math.min(ev.t, 90 - ev.t) / 4); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(8,4,20,' + (0.35 * k).toFixed(3) + ')'; g.fillRect(0, 0, g.canvas.width, g.canvas.height); g.restore(); }
    return r;
  };
  RW.v3events = { tremor: () => (ev = tremor()), darkTide: () => (ev = darkTide()), get current() { return ev; } };
})(window.RW);
