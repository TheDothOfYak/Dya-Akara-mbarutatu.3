// 4 Brothers World V2 — part 13: blocks that behave like what they're made of, and building in shapes.
//  1. Sand, snow and soul ash pour: knock out what's under them and they run down, sliding off edges into a pile.
//     Gravel drops straight down. Falling grains crush monsters they land on, but never fall into you (they wait).
//     Only blocks near something you dug or built move, so the worlds don't fall apart around you.
//  2. Blocks remember their cracks. Stop mining a block halfway and the cracks stay for half a minute, so you can
//     come back to it. (Mining is exactly as fast as before; you just don't lose what you'd done.)
//  3. Build in shapes. Press B to switch shape: one block, a row of 3, a column of 3, a 2x2 square, or steps.
//     A faint outline shows where the blocks will go. Each block in the shape uses one from your stack.
(function (RW) {
  'use strict';
  const P = RW.player, E = RW.ent, U = RW.ui, TS = RW.TILE, WD = RW.world;
  if (!P || !E || !WD || !RW.ACTIONS) return;
  const T = () => RW.T, tile = (x, y) => RW.TILES[WD.get(x, y)];
  const now = () => performance.now() / 1000;

  // ====================== 1. POURING SAND ======================
  const SLIDES = new Set(['sand', 'snow', 'ash']), DROPS = new Set(['gravel']);
  const loose = (x, y) => { const k = tile(x, y).key; return SLIDES.has(k) || DROPS.has(k); };
  const open = (x, y) => WD.inb(x, y) && (WD.get(x, y) === T().air || WD.get(x, y) === T().water);
  const Q = []; const queued = new Set(); let stepT = 0, sfxT = 0;
  const push = (x, y, ttl) => { if (ttl <= 0 || !WD.inb(x, y)) return; const k = x + ',' + y; if (queued.has(k)) return; queued.add(k); Q.push([x, y, ttl]); };
  const wakeAbove = (x, y, ttl) => { push(x, y - 1, ttl); push(x - 1, y - 1, ttl); push(x + 1, y - 1, ttl); };
  const cellBox = (x, y) => ({ x: x * TS, y: y * TS, w: TS, h: TS });
  const hits = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  // a grain can't move into you; moving into a monster hurts it instead
  function blockedBy(x, y) {
    const c = cellBox(x, y);
    if (!P.dead && hits(c, P)) return 'player';
    for (const e of E.enemies) {
      if (e.dead || e.dummy || e.friendly) continue;
      const hb = e.hitbox ? e.hitbox() : e; if (!hits(c, hb)) continue;
      if ((e.crushT || 0) < now()) { e.crushT = now() + 0.45; E.damage(e, 8, 0, 2, false, '#d8be86'); }
      return 'enemy';
    }
    return null;
  }
  function move(x, y, nx, ny) {
    const id = WD.get(x, y), into = WD.get(nx, ny);
    WD.setTile(nx, ny, id); WD.setTile(x, y, into === T().water ? T().water : T().air);
    if ((sfxT -= 1) <= 0) { sfxT = 6; RW.audio.sfx('place'); }
    if (Math.random() < 0.35) RW.fx.debris(nx * TS + 8, ny * TS + 4, RW.TILES[id].colors || ['#c8b898'], 1);
  }
  function step(x, y, ttl) {
    if (!loose(x, y)) return;
    const k = tile(x, y).key;
    let to = null;
    if (open(x, y + 1)) to = [x, y + 1];
    else if (SLIDES.has(k)) {
      const dirs = Math.random() < 0.5 ? [-1, 1] : [1, -1];
      for (const d of dirs) if (open(x + d, y) && open(x + d, y + 1)) { to = [x + d, y + 1]; break; }
    }
    if (!to) return;
    const who = blockedBy(to[0], to[1]);
    if (who) { push(x, y, who === 'player' ? ttl : ttl - 1); return; } // wait (on your head as long as you stand there) and try again
    move(x, y, to[0], to[1]);
    push(to[0], to[1], ttl - 1); wakeAbove(x, y, ttl - 1); push(x - 1, y, ttl - 1); push(x + 1, y, ttl - 1);
  }
  function runSand(dt) {
    if (!Q.length) return;
    stepT -= dt; if (stepT > 0) return; stepT = 0.045;
    const batch = Q.splice(0, 60); batch.forEach(([x, y]) => queued.delete(x + ',' + y));
    // bottom grains first, so a column pours like one stream
    batch.sort((a, b) => b[1] - a[1]).forEach(([x, y, ttl]) => step(x, y, ttl));
  }
  RW.v2sand = { push, wakeAbove, queue: Q };

  // ====================== 2. CRACKS THAT STAY ======================
  const CR = new Map(); // "x,y" -> { p, id, t }
  let last = null;
  const keep = (m) => { if (m && !m.locked && m.p > 0.04 && m.p < 1) CR.set(m.tx + ',' + m.ty, { p: m.p, id: WD.get(m.tx, m.ty), t: now() }); };
  const baseMine = P.mineTile;
  P.mineTile = function (tx, ty, dt) {
    const fresh = !P.mine || P.mine.tx !== tx || P.mine.ty !== ty;
    if (fresh && P.mine) keep(P.mine);
    const r = baseMine.apply(this, arguments);
    if (fresh && P.mine && P.mine.tx === tx && P.mine.ty === ty && !P.mine.locked) {
      const k = tx + ',' + ty, c = CR.get(k);
      if (c) { CR.delete(k); if (c.id === WD.get(tx, ty) && now() - c.t < 30) P.mine.p += c.p; }
    }
    return r;
  };

  // ====================== 3. SHAPES ======================
  if (!RW.ACTIONS.some((a) => a[0] === 'shape')) {
    const at = RW.ACTIONS.findIndex((a) => a[0] === 'vine' || a[0] === 'ability');
    RW.ACTIONS.splice(at + 1, 0, ['shape', 'Building shape: one block, row, column, square or steps', ['KeyB']]);
    if (!RW.binds.shape) RW.binds.shape = ['KeyB'];
  }
  const SHAPES = [
    { name: 'One block', cells: () => [[0, 0]] },
    { name: 'Row of 3', cells: () => [[0, 0], [-1, 0], [1, 0]] },
    { name: 'Column of 3', cells: () => [[0, 0], [0, -1], [0, -2]] },
    { name: '2x2 square', cells: (d) => [[0, 0], [d, 0], [0, -1], [d, -1]] },
    { name: 'Steps', cells: (d) => [[0, 0], [d, 0], [d, -1], [2 * d, 0], [2 * d, -1], [2 * d, -2]] },
  ];
  const shapeNo = () => ((P.flags && P.flags.shape) | 0) % SHAPES.length;
  const blockish = (it) => {
    if (!it || it.kind !== 'place') return false;
    const t = RW.TILES[T()[it.place]]; if (!t) return false;
    return (t.solid && !t.decor && !t.storage && !t.loot && !t.use && !t.station) || !!t.platform || !!t.climb;
  };
  const cellsAt = (tx, ty) => { const pc = P.center(), d = tx * TS + 8 >= pc.x ? 1 : -1; return SHAPES[shapeNo()].cells(d).map(([a, b]) => [tx + a, ty + b]); };

  const basePlace = P.tryPlace;
  P.tryPlace = function (tx, ty, item, reach) {
    if (!blockish(item) || shapeNo() === 0) { const r = basePlace.apply(this, arguments); push(tx, ty, 40); return r; }
    if (!reach) return;
    const ot = U.toast; let placed = 0, msg = null;
    U.toast = (m) => { msg = msg || m; };
    try {
      for (const [x, y] of cellsAt(tx, ty)) {
        if (P.count(item.id) <= 0) break;
        const before = WD.get(x, y); basePlace.call(this, x, y, item, true);
        if (WD.get(x, y) !== before) { placed++; push(x, y, 40); }
      }
    } finally { U.toast = ot; }
    if (!placed && msg) U.toast(msg);
  };

  // ====================== every frame ======================
  const baseBreak = P.breakTile;
  P.breakTile = function (tx, ty) { const r = baseBreak.apply(this, arguments); wakeAbove(tx, ty, 40); CR.delete(tx + ',' + ty); return r; };

  const baseUpd = P.update;
  P.update = function (dt) {
    const r = baseUpd.apply(this, arguments);
    const I = RW.input, typing = !!(U.blocking && U.blocking());
    if (!typing && I.actHit && I.actHit('shape')) {
      P.flags.shape = (shapeNo() + 1) % SHAPES.length;
      U.toast('Building shape: ' + SHAPES[P.flags.shape].name + '. Press B to change it.');
    }
    // a block you stopped mining keeps its cracks
    if (last && P.mine !== last && (!P.mine || P.mine.tx !== last.tx || P.mine.ty !== last.ty)) keep(last);
    last = P.mine || null;
    try { runSand(dt); } catch (e) { console.warn('sand', e); Q.length = 0; queued.clear(); }
    return r;
  };

  // a new world, or a reload: nothing is mid-fall and no cracks carry over
  const baseInit = WD.init;
  WD.init = function () { Q.length = 0; queued.clear(); CR.clear(); last = null; return baseInit.apply(this, arguments); };

  // ---- drawing: remembered cracks, and the shape outline ----
  const baseDraw = E.drawPlayer;
  E.drawPlayer = function (g, cam, p) {
    const r = baseDraw.apply(this, arguments);
    if (p !== P) return r;
    if (CR.size && RW.art.cracks) {
      const t = now();
      CR.forEach((c, k) => {
        const [x, y] = k.split(',').map(Number);
        if (t - c.t > 30 || c.id !== WD.get(x, y)) { CR.delete(k); return; }
        g.save(); g.globalAlpha = t - c.t > 25 ? (30 - (t - c.t)) / 5 : 1;
        g.drawImage(RW.art.cracks[Math.min(3, Math.floor(c.p * 4))], x * TS - cam.x, y * TS - cam.y); g.restore();
      });
    }
    const held = P.held && P.held();
    if (shapeNo() > 0 && blockish(held) && !P.dead && RW.mouseWorld) {
      const m = RW.mouseWorld(), tx = Math.floor(m.x / TS), ty = Math.floor(m.y / TS);
      g.save(); g.lineWidth = 1;
      cellsAt(tx, ty).forEach(([x, y], i) => {
        const free = (open(x, y) || tile(x, y).soft) && !(RW.TILES[T()[held.place]].solid && hits(cellBox(x, y), P));
        g.strokeStyle = free ? 'rgba(255,246,224,' + (i ? 0.45 : 0.75) + ')' : 'rgba(255,120,100,0.35)';
        g.strokeRect(Math.round(x * TS - cam.x) + 0.5, Math.round(y * TS - cam.y) + 0.5, TS - 1, TS - 1);
      });
      g.restore();
    }
    return r;
  };
})(window.RW);
