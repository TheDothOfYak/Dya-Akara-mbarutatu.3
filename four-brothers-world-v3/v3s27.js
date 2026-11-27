// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 27: the mouse, and chains.
//  * Left click mines, swings and interacts: a door, lever, chest, waystone, rune or carving under the mouse is used,
//    a townsperson under the mouse is talked to, anything else is mined or hit. Holding a block doesn't stop you
//    mining any more (a new rock could not dig the dirt it started with while holding it).
//  * Right click: holding a block, a torch or a seed, it places it (hold to keep placing). Holding food or a crystal,
//    you eat it; armour or a trinket, you wear it; an item with its own use (RW.v3useItem), it does that. Anything
//    else, right click is your crystal magic: the rock's crystal slam, everyone else's spell.
//  * Chains: when a chain steps one block left or right, climbing follows it (you are moved onto the next length) so
//    you never have to jump across; the drawing joins the two lengths with a slanted link.
(function (RW) {
  'use strict';
  const P = RW.player, E = RW.ent, WD = RW.world, U = RW.ui, I = RW.input, TS = RW.TILE;
  if (!P || !I) return;

  // ---------------- the labels in Controls ----------------
  const label = (id, txt) => { const a = RW.ACTIONS.find((q) => q[0] === id); if (a) a[1] = txt; };
  label('attack', 'Mine, swing, shoot; use doors, chests and waystones; talk (left click)');
  label('use', 'Place blocks; eat, wear or use the held item; otherwise your crystal magic (right click)');
  label('interact', 'Talk, read carvings, use rifts and altars (also left click on them)');

  RW.v3useItem = RW.v3useItem || {}; // id -> function (item, mouse) returning true when used
  const placeable = (h) => !!(h && (h.kind === 'place' || h.kind === 'torch' || h.plant));
  const tileAt = (x, y) => RW.TILES[WD.get(x, y)] || {};
  const usable = (t) => !!(t.toggle || t.use || t.loot || t.storage || t.key === 'runestone' || t.key === 'runestone_lit');
  let leftLock = false, placeT = 0;

  function leftInteract(tx, ty, m, reach) {
    if (!reach) return false;
    const n = E.npcs.find((q) => m.x >= q.x - 4 && m.x <= q.x + q.w + 4 && m.y >= q.y - 6 && m.y <= q.y + q.h + 4);
    if (n && U.talk) { const pc = P.center(); if (Math.hypot(n.x + n.w / 2 - pc.x, n.y + n.h / 2 - pc.y) < 6 * TS) { U.talk(n); return true; } }
    const t = tileAt(tx, ty);
    if (usable(t) && P.useTile && P.useTile(tx, ty)) return true;
    if (t.read || t.altar || t.decor === 'rift') { P.interact(); return true; }
    if (P.useTile && !t.solid && P.useTile(tx, ty)) return true; // a pet, a fishing spot
    return false;
  }
  function rightUse(held, tx, ty, m, reach, dt, hit) {
    if (placeable(held)) {
      if (!hit && (placeT -= dt) > 0) return;
      placeT = 0.14;
      if (held.plant && held.kind !== 'place') { if (WD.get(tx, ty) === RW.T.air && WD.get(tx, ty + 1) === RW.T.soil && reach) P.tryPlant(tx, ty, held); return; }
      P.tryPlace(tx, ty, held, reach); return;
    }
    if (!hit) return;
    if (held && RW.v3useItem[held.id] && RW.v3useItem[held.id](held, m)) return;
    if (held && (held.kind === 'food' || held.kind === 'crystal')) { P.useItem(held); return; }
    if (held && held.kind === 'armor') { P.wear(held); U.renderInv && U.renderInv(); return; }
    // crystal magic
    if (P.species === 'rock') { if (P.rockSlam) P.rockSlam(); return; }
    if (P.spells && P.spells.length) { P.cast(m); return; }
    if (!P.flags.v3noMagicTip) { P.flags.v3noMagicTip = 1; U.toast('No crystal magic yet. Eat a crystal (right click it) to learn some.'); }
  }

  const baseActions = P.actions;
  P.actions = function (dt, m) {
    if (!m || (U.blocking && U.blocking())) return baseActions.apply(this, arguments);
    const held = P.held(), pc = P.center(), tx = Math.floor(m.x / TS), ty = Math.floor(m.y / TS);
    const reach = RW.dist(pc.x, pc.y, tx * TS + 8, ty * TS + 8) <= 5.2 * TS * P.scale();
    if (!I.act('attack')) leftLock = false;
    if (I.actHit('attack') && leftInteract(tx, ty, m, reach)) leftLock = true;
    if (I.act('use') || I.actHit('use')) rightUse(held, tx, ty, m, reach, dt || 0.016, I.actHit('use')); else placeT = 0;
    // the base: never sees the right button (handled above), never places on the left, and sees no left at all while
    // the press went to a door or a chest
    const oAct = I.act, oHit = I.actHit, oHeld = P.held;
    I.act = function (id) { if (id === 'use' || (id === 'attack' && leftLock)) return false; return oAct.apply(this, arguments); };
    I.actHit = function (id) { if (id === 'use' || (id === 'attack' && leftLock)) return false; return oHit.apply(this, arguments); };
    if (placeable(held)) P.held = () => null;
    try { return baseActions.apply(this, arguments); } finally { I.act = oAct; I.actHit = oHit; P.held = oHeld; }
  };

  // ---------------- chains that step sideways ----------------
  const climb = (x, y) => !!tileAt(x, y).climb;
  const baseUpd = P.update;
  P.update = function (dt) {
    if (!P.dead && !(U.blocking && U.blocking())) {
      const up = I.act('up') || I.act('jump'), down = I.act('down');
      if (up || down) {
        const c = P.center(), tx = Math.floor(c.x / TS), ty = Math.floor(c.y / TS), dy = up ? -1 : 1;
        // on a chain, and the chain goes on one block over: step onto it
        if (climb(tx, ty) && !climb(tx, ty + dy)) {
          for (const dx of [-1, 1]) if (climb(tx + dx, ty + dy) || (climb(tx + dx, ty) && climb(tx + dx, ty + dy * 2))) { P.x += (tx + dx) * TS + 8 - c.x; P.climbing = true; break; }
        } else if (!climb(tx, ty) && P.climbing) { // just slipped off the side of one
          for (const dx of [-1, 1]) if (climb(tx + dx, ty)) { P.x += (tx + dx) * TS + 8 - c.x; break; }
        }
      }
    }
    return baseUpd.apply(this, arguments);
  };
  const baseTiles = WD.drawTiles;
  WD.drawTiles = function (g, cam, vw, vh) {
    const r = baseTiles.apply(this, arguments);
    if (RW.v3zoom && RW.v3zoom.far()) return r;
    const x0 = Math.floor(cam.x / TS) - 1, x1 = Math.ceil((cam.x + vw) / TS) + 1, y0 = Math.floor(cam.y / TS) - 1, y1 = Math.ceil((cam.y + vh) / TS) + 1, ox = -Math.round(cam.x), oy = -Math.round(cam.y);
    const CH = RW.T.chain; if (CH == null) return r;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (WD.get(x, y) !== CH || WD.get(x, y + 1) === CH) continue;
      for (const dx of [-1, 1]) {
        if (WD.get(x + dx, y + 1) !== CH) continue;
        // a slanted link from the foot of this length to the head of the next
        const ax = x * TS + 8 + ox, ay = (y + 1) * TS - 3 + oy;
        for (let k = 0; k <= 8; k++) { const px = Math.round(ax + dx * k * 2), py = Math.round(ay + k * 0.6); g.fillStyle = k % 3 === 1 ? '#a8a8b2' : '#5a5a64'; g.fillRect(px - 1, py, 2, 2); }
      }
    }
    return r;
  };
})(window.RW);
