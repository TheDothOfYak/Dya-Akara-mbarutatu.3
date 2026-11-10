// 4 Brothers World V2 — part 26: chests for everyone, clean sky left of Tuftwood, and the Stormmark.
//  * Storage Chests can be made by hand from 8 planks (no Knapping Stone needed), and every hero gets one free
//    Storage Chest the first time they play after this update.
//  * The dark cave walls that hung in the open air on the slope left of Tuftwood are gone.
//  * The Stormmark: get struck by lightning and the storm lives in you for a while. Your eyes glow, a lightning
//    rune burns on your forehead, your Spark, Fire and Poison spells come out as Chain Lightning (rocks' slams throw
//    a lightning ring), and anything that touches you gets shocked, other players too. Thunderstorms strike heroes
//    who stand out in them now and then, or cast Rain on yourself and stand under your own Storm.
//    It is built on a small power system (RW.v2powers) so it can become a rune later.
(function (RW) {
  'use strict';
  const A = RW.art, E = RW.ent, P = RW.player, U = RW.ui, R = RW.register, TS = RW.TILE, WD = RW.world;
  if (!A || !E || !P || !WD) return;
  const clamp = RW.clamp;

  // ======================= 1. CHESTS =======================
  if (R && R.recipe && RW.ITEMS.storage_chest) R.recipe({ out: 'storage_chest', in: { planks: 8 } });
  function giftChest() {
    if (!P.flags || P.flags.gift_chest || !RW.ITEMS.storage_chest) return;
    P.flags.gift_chest = 1;
    if (P.add('storage_chest', 1) > 0) { E.pouches.push({ x: P.x + P.w / 2, y: P.y + P.h - 6, items: [{ id: 'storage_chest', n: 1 }] }); }
    setTimeout(() => U.toast('A gift: a Storage Chest! Put it down and press R to keep your things in it. You can make more from 8 planks.'), 6000);
    U.dirty && U.dirty(); RW.game && RW.game.saveSoon && RW.game.saveSoon();
  }

  // ======================= 2. NO CAVE WALLS IN THE OPEN AIR =======================
  // The Root Hollows' painted walls reached up past the ground on the slope left of Tuftwood (and made the sky
  // there think it was underground). Walls are made fresh each load, so this also fixes old worlds.
  const def = RW.WORLDS && RW.WORLDS.fuzzy;
  if (def) {
    const baseGen = def.generate;
    def.generate = function () {
      const gen = baseGen.apply(this, arguments);
      try {
        if (gen.W === 1200) {
          const cave = new Set(['rootw', 'stratw', 'basaltw', 'grottow', 'geodew'].map((k) => RW.W[k]).filter((v) => v != null));
          for (let x = 228; x <= 296; x++) {
            let top = 0; while (top < gen.H && !RW.TILES[gen.fg[top * gen.W + x]].solid) top++;
            for (let y = 0; y < top; y++) { const i = y * gen.W + x; if (cave.has(gen.bg[i])) gen.bg[i] = 0; }
          }
        }
      } catch (e) { console.warn('v2s26 walls', e); }
      return gen;
    };
  }

  // ======================= 3. POWERS =======================
  // A power is on for a while (or forever). Later a rune can call grant(id, { duration: Infinity }) or set innate.
  const PW = (RW.v2powers = {
    defs: {}, on: {},
    define(id, d) { this.defs[id] = d; return d; },
    has(id) { const d = this.defs[id]; return !!(this.on[id] || (d && d.innate && d.innate())); },
    left(id) { const o = this.on[id]; return o ? o.t : 0; },
    grant(id, o) {
      const d = this.defs[id]; if (!d) return; o = o || {};
      const was = !!this.on[id], dur = o.duration != null ? o.duration : d.duration;
      this.on[id] = { t: Math.max(dur, was ? this.on[id].t : 0), src: o.src || '' };
      if (!was && d.start) d.start(o); else if (was && d.renew) d.renew(o);
    },
    revoke(id, why) { const o = this.on[id]; if (!o) return; delete this.on[id]; const d = this.defs[id]; d && d.end && d.end(why); },
    tick(dt) {
      Object.keys(this.on).forEach((id) => { const o = this.on[id]; o.t -= dt; if (o.t <= 0) this.revoke(id, 'time'); });
      Object.keys(this.defs).forEach((id) => { if (this.has(id) && this.defs[id].tick) this.defs[id].tick(dt); });
    },
  });

  // ======================= 4. THE STORMMARK =======================
  const STORM = {
    duration: 180,                 // seconds (the trial version, before it is a rune)
    skyEvery: [7, 17], skyChance: 0.3, skyDmg: 8,
    touchDmg: 8, touchKnock: 6, touchCd: 0.7,
    peerDmg: 5, peerKb: 200,
    ringDmg: 14, ringR: 70,
    cyan: '#5ee6ff', rune: '#e8fdff', dark: '#241c3a',
  };
  RW.v2storm = STORM;
  const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const foes = () => E.enemies.concat(E.boss ? [E.boss] : []).filter((e) => e && !e.dead && !e.dummy && !e.friendly);
  const box = (e) => (e.hitbox ? e.hitbox() : { x: e.x, y: e.y, w: e.w, h: e.h });
  const hits = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const sparkAt = (x, y, n) => { for (let k = 0; k < n; k++) RW.fx.spawn({ x, y, vx: RW.rand(-60, 60), vy: RW.rand(-70, 20), life: 0.3, color: RW.pick(['#bff4ff', '#ffffff', STORM.cyan]), add: true, kind: 'spark' }); };

  PW.define('stormmark', {
    duration: STORM.duration,
    innate: () => !!(P.flags && P.flags.rune_storm),
    start() {
      U.banner('Stormmarked', 'The lightning lives in you now. Your spells come out as Chain Lightning, and anything that touches you gets a shock.');
      RW.audio.sfx('crystal'); U.dirty && U.dirty();
    },
    renew() { U.toast('The storm fills you up again.'); },
    end(why) { if (why !== 'death') U.toast('The storm in you fades. Your eyes stop glowing.'); U.dirty && U.dirty(); },
    tick: stormTick,
  });

  // getting struck by lightning (any kind) gives you the Stormmark
  const bHurt = P.hurt;
  P.hurt = function (d, dir, src) {
    const hpWas = P.hp, r = bHurt.apply(this, arguments);
    if (src === 'lightning' && !P.dead && P.hp < hpWas) PW.grant('stormmark', { src: 'lightning' });
    return r;
  };

  // thunderstorms strike heroes standing out in them now and then
  let skyT = 10;
  const surfaceSky = () => WD.def && (WD.def.sky === 'normal' || WD.def.sky == null) && WD.def.fixedDay == null;
  function skyStrike(dt) {
    const w = RW.v2weather; if (!w || P.dead || !RW.game || !RW.game.playing) return;
    if (w.kind !== 'storm' || w.bolts <= 0.5 || !surfaceSky() || !(RW.v2wind && RW.v2wind.outdoors())) { skyT = Math.max(skyT, 4); return; }
    if ((skyT -= dt) > 0) return;
    skyT = STORM.skyEvery[0] + Math.random() * (STORM.skyEvery[1] - STORM.skyEvery[0]);
    if (Math.random() > STORM.skyChance) return;
    const px = P.x + P.w / 2, py = P.y + 4;
    RW.fx.bolt(px + RW.rand(-40, 40), RW.cam.y - 10, px, py); RW.fx.element.lightning(px, py + 2, 1.2);
    RW.fx.flash('#e8f0ff', 0.35); RW.audio.sfx('lightning'); RW.fx.shake(4, 0.25);
    P.hurt(STORM.skyDmg, 0, 'lightning');
  }

  // shocking whatever touches you
  const lastZap = new WeakMap(), lastPeer = new Map();
  let netT = 0, labelT = 0;
  function stormTick(dt) {
    if (P.dead) { PW.revoke('stormmark', 'death'); return; }
    const now = performance.now() / 1000;
    const me = { x: P.x - 3, y: P.y - 3, w: P.w + 6, h: P.h + 6 }, pc = P.center();
    foes().forEach((e) => {
      if (!hits(me, box(e)) || now - (lastZap.get(e) || 0) < STORM.touchCd) return;
      lastZap.set(e, now); const c = E.center(e), dir = Math.sign(c.x - pc.x) || 1;
      RW.fx.bolt(pc.x, pc.y - 4, c.x, c.y); sparkAt(c.x, c.y, 5);
      E.damage(e, Math.round(STORM.touchDmg * P.dmgMul()), dir, STORM.touchKnock, false, '#bff4ff'); RW.audio.sfx('lightning');
    });
    const N = RW.net;
    if (N && N.transport && N.peers) {
      N.peers.forEach((p, key) => {
        const t = p.target; if (!t || t.dead || t.w !== WD.def.id) return;
        if (!hits(me, { x: p.x, y: p.y, w: 12, h: 28 }) || now - (lastPeer.get(key) || 0) < STORM.touchCd) return;
        lastPeer.set(key, now); const dir = Math.sign(p.x + 6 - pc.x) || 1;
        RW.fx.bolt(pc.x, pc.y - 4, p.x + 6, p.y + 14); sparkAt(p.x + 6, p.y + 14, 5); RW.audio.sfx('lightning');
        N.send({ k: 'v2zap', to: t.pid || key, w: WD.def.id, d: STORM.peerDmg, dir, kb: STORM.peerKb });
      });
      if ((netT -= dt) <= 0) { netT = 0.5; N.send({ k: 'v2pw', w: WD.def.id, x: Math.round(P.x), y: Math.round(P.y) }); }
    }
    if (Math.random() < dt * 3) sparkAt(pc.x + RW.rand(-6, 6), P.y + RW.rand(2, P.h), 1);
    if ((labelT -= dt) <= 0) { labelT = 1; U.dirty && U.dirty(); }
  }
  if (RW.net && RW.net.on) {
    RW.net.on('v2zap', (m) => {
      if (m.to !== RW.net.pid || m.w !== WD.def.id || P.dead) return;
      const dir = Math.sign(+m.dir) || 1, d = clamp(+m.d || 0, 0, 20), kb = clamp(+m.kb || 0, 0, 300);
      RW.fx.element.lightning(P.x + P.w / 2, P.y + P.h / 2, 0.8); RW.audio.sfx('lightning');
      P.hurt(d, dir, 'stormmark'); P.vx += dir * kb; P.vy = -kb * 0.6;
    });
    RW.net.on('v2pw', (m) => { if (m.w === WD.def.id && typeof m.x === 'number') peerPow.set(m.f, { x: m.x, y: m.y, at: performance.now() / 1000 }); });
  }
  const peerPow = new Map();
  const peerPowered = (p) => {
    const now = performance.now() / 1000; let on = false;
    peerPow.forEach((v, k) => { if (now - v.at > 1.5) peerPow.delete(k); else if (Math.abs(v.x - p.x) < 48 && Math.abs(v.y - p.y) < 48) on = true; });
    return on;
  };

  const bUpdate = P.update;
  P.update = function (dt) {
    const r = bUpdate.apply(this, arguments);
    try { giftChest(); skyStrike(dt); PW.tick(dt); } catch (e) { console.warn('v2s26', e); }
    return r;
  };

  // your spells come out as Chain Lightning (at the mana the spell would have cost)
  const CONVERT = { spark: 1, fire: 1, poison: 1 };
  const bCast = P.cast;
  P.cast = function (m) {
    if (!PW.has('stormmark')) return bCast.apply(this, arguments);
    if (P.species === 'rock') {
      const before = P.slamCd || 0, r = bCast.apply(this, arguments);
      if ((P.slamCd || 0) > before + 1) stormRing();
      return r;
    }
    const id = P.spells[P.spell], sp = RW.SPELLS[id], L = RW.SPELLS.lightning;
    if (!sp || !L || !CONVERT[id]) return bCast.apply(this, arguments);
    const keep = { mana: L.mana, cd: L.cd };
    P.spells[P.spell] = 'lightning'; L.mana = sp.mana; L.cd = sp.cd;
    try { return bCast.apply(this, arguments); } finally { P.spells[P.spell] = id; L.mana = keep.mana; L.cd = keep.cd; }
  };
  function stormRing() {
    const pc = P.center();
    RW.fx.ring(pc.x, pc.y, STORM.cyan, STORM.ringR, 0.4, 2); RW.audio.sfx('lightning'); RW.fx.flash('#bff4ff', 0.12);
    foes().forEach((e) => {
      const c = E.center(e); if (RW.dist(c.x, c.y, pc.x, pc.y) > STORM.ringR) return;
      RW.fx.bolt(pc.x, pc.y, c.x, c.y); E.damage(e, Math.round(STORM.ringDmg * P.dmgMul()), Math.sign(c.x - pc.x) || 1, 4, false, '#bff4ff');
    });
  }
  const bExtra = P.chipExtra;
  P.chipExtra = function () {
    const base = bExtra ? bExtra.apply(this, arguments) : '';
    if (!PW.has('stormmark')) return base;
    const t = PW.left('stormmark');
    return base + ' · Stormmarked' + (isFinite(t) && t > 0 ? ' ' + fmt(t) : '');
  };

  // ======================= 5. THE STORMMARKED LOOK =======================
  // glowing cyan eyes, a darker, stormier body (outlines kept), and a lightning rune on the forehead
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const CY = hex(STORM.cyan), RU = hex(STORM.rune), DK = hex(STORM.dark);
  const GLYPH = ['...#.', '..#..', '.###.', '..#..', '.#...'];
  const canMap = new WeakMap(), arrMap = new WeakMap();
  function scary(c) {
    if (!c || !c.width) return c;
    let o = canMap.get(c); if (o) return o;
    o = c;
    try {
      const w = c.width, h = c.height, src = c.getContext('2d').getImageData(0, 0, w, h).data;
      const al = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[(y * w + x) * 4 + 3]);
      const px = (x, y) => { const i = (y * w + x) * 4; return [src[i], src[i + 1], src[i + 2]]; };
      const lum = (p) => 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2];
      let x0 = w, x1 = -1, y0 = h, y1 = -1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (al(x, y) > 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      if (x1 < 0) { canMap.set(c, c); return c; }
      const bh = y1 - y0 + 1, K = (x, y) => y * w + x;
      const white = [];
      for (let y = y0; y < y0 + bh * 0.7; y++) for (let x = x0; x <= x1; x++) { if (al(x, y) < 200) continue; const p = px(x, y); if (p[0] >= 240 && p[1] >= 240 && p[2] >= 240) white.push([x, y]); }
      const eye = new Map();   // key -> core?
      const interior = (x, y) => al(x - 1, y) > 40 && al(x + 1, y) > 40 && al(x, y - 1) > 40 && al(x, y + 1) > 40;
      if (white.length && white.length <= 12) {
        white.forEach(([x, y]) => {
          eye.set(K(x, y), true);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy; if (al(nx, ny) < 200 || eye.has(K(nx, ny))) continue;
            const p = px(nx, ny), orange = p[0] > 200 && p[1] > 90 && p[1] < 190 && p[2] < 90;
            if (lum(p) < 60 || orange) eye.set(K(nx, ny), false);
          }
        });
      } else {
        // the ghost: a pale body with small dark eyes (no pure-white eye shine)
        const dark = [];
        for (let y = y0; y < y0 + bh * 0.5; y++) for (let x = x0; x <= x1; x++) if (al(x, y) > 200 && interior(x, y) && lum(px(x, y)) < 60) dark.push([x, y]);
        // the eyes are the highest dark spots (the mouth sits lower down)
        const dtop = Math.min(...dark.map((q) => q[1])), eyes = dark.filter((q) => q[1] <= dtop + 2);
        if (eyes.length && eyes.length <= 16) eyes.forEach(([x, y]) => eye.set(K(x, y), true));
      }
      const o2 = A.canvas(w, h), g = o2.ctx, img = g.createImageData(w, h), d = img.data;
      for (let i = 0; i < src.length; i++) d[i] = src[i];
      const set = (x, y, col, t, a) => { const i = K(x, y) * 4; for (let j = 0; j < 3; j++) d[i + j] = Math.round(d[i + j] + (col[j] - d[i + j]) * t); if (a != null) d[i + 3] = Math.max(d[i + 3], a); };
      // the body goes dark and stormy; the outline (dark pixels, or ones at the edge) stays
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (al(x, y) < 40 || eye.has(K(x, y))) continue;
        if (!interior(x, y)) { set(x, y, CY, 0.7); continue; }   // the outline glows cyan
        if (lum(px(x, y)) < 45) continue;
        set(x, y, DK, 0.38);
      }
      // a soft cyan glow just outside the outline
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (al(x, y) > 40) continue;
        let a = 0;
        if (al(x - 1, y) > 40 || al(x + 1, y) > 40 || al(x, y - 1) > 40 || al(x, y + 1) > 40) a = 120;
        else if (al(x - 1, y - 1) > 40 || al(x + 1, y - 1) > 40 || al(x - 1, y + 1) > 40 || al(x + 1, y + 1) > 40) a = 50;
        if (a) { const i = K(x, y) * 4; d[i] = CY[0]; d[i + 1] = CY[1]; d[i + 2] = CY[2]; d[i + 3] = Math.max(d[i + 3], a); }
      }
      if (eye.size) {
        let ex0 = w, ex1 = -1, ey0 = h;
        eye.forEach((core, k) => { const x = k % w, y = (k - x) / w; ex0 = Math.min(ex0, x); ex1 = Math.max(ex1, x); ey0 = Math.min(ey0, y); });
        // halo round the eyes
        eye.forEach((core, k) => {
          const x = k % w, y = (k - x) / w;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h || eye.has(K(nx, ny))) continue;
            if (al(nx, ny) > 40) set(nx, ny, CY, 0.55); else { const i = K(nx, ny) * 4; d[i] = CY[0]; d[i + 1] = CY[1]; d[i + 2] = CY[2]; d[i + 3] = Math.max(d[i + 3], 110); }
          }
        });
        eye.forEach((core, k) => { const x = k % w, y = (k - x) / w; set(x, y, core ? [255, 255, 255] : CY, 1, 255); });
        // the rune: centred over the eyes, its bottom row 4 px above them, only on the body
        // one eye showing (side view): the forehead is between the eye and the middle of the head
        const ecx = (ex0 + ex1) / 2, cx = Math.round(ex1 - ex0 < 5 ? (ecx + (x0 + x1) / 2) / 2 : ecx), top = ey0 - 4 - (GLYPH.length - 1), lit = new Set();
        GLYPH.forEach((row, ry) => { for (let rx = 0; rx < row.length; rx++) if (row[rx] === '#') { const x = cx - 2 + rx, y = top + ry; if (al(x, y) > 40) lit.add(K(x, y)); } });
        lit.forEach((k) => { const x = k % w, y = (k - x) / w; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { const nx = x + a, ny = y + b; if (al(nx, ny) > 40 && !lit.has(K(nx, ny)) && !eye.has(K(nx, ny))) set(nx, ny, CY, 0.6); }); });
        lit.forEach((k) => { const x = k % w, y = (k - x) / w; set(x, y, RU, 1); });
      }
      g.putImageData(img, 0, 0);
      o = o2; if (c.hand) o.hand = c.hand;
    } catch (e) { o = c; }
    canMap.set(c, o); return o;
  }
  let scaryOn = false;
  const bDressed = A.dressed;
  A.dressed = function () {
    const fr = bDressed.apply(this, arguments);
    if (!scaryOn || !Array.isArray(fr)) return fr;
    let o = arrMap.get(fr);
    if (!o) { o = fr.map((pair) => (Array.isArray(pair) ? pair.map(scary) : pair)); arrMap.set(fr, o); }
    return o;
  };
  RW.v2scary = scary;
  const bDraw = E.drawPlayer;
  E.drawPlayer = function (g, cam, p, look, opts) {
    const mine = !(opts && opts.name);
    scaryOn = mine ? PW.has('stormmark') : peerPowered(p);
    try { return bDraw.apply(this, arguments); } finally {
      if (scaryOn) {
        const sc = (opts && opts.scale) || 1, t = performance.now() / 1000, fl = 0.8 + 0.2 * Math.sin(t * 9) * Math.sin(t * 5.3);
        RW.fx.light(p.x + 6, p.y + 28 - 18 * sc, 0.25 * fl, 0.75 * fl, 1.0 * fl);
        try { crackle(g, cam, p, sc, (opts && opts.name) || '#me', t); } catch (e) { /* never stop the frame */ }
      }
      scaryOn = false;
    }
  };
  // lightning crackling round the hero: short jagged arcs that flick on and off, drawn pixel by pixel
  const arcSets = new Map();
  function crackle(g, cam, p, sc, key, t) {
    let set = arcSets.get(key); if (!set) { set = { arcs: [], last: t }; arcSets.set(key, set); }
    const dt = clamp(t - set.last, 0, 0.1); set.last = t;
    set.arcs = set.arcs.filter((a) => (a.life -= dt) > 0);
    if (set.arcs.length < 4 && Math.random() < dt * 14) {
      // start on an oval round the body and zigzag along it, a little outwards
      const a0 = Math.random() * Math.PI * 2, dirA = Math.random() < 0.5 ? -1 : 1, rx = 10 * sc, ry = 15 * sc, pts = [];
      let ang = a0, out = 0;
      for (let k = 0; k < 4 + Math.floor(Math.random() * 3); k++) {
        pts.push([Math.cos(ang) * (rx + out), Math.sin(ang) * (ry + out)]);
        ang += dirA * (0.2 + Math.random() * 0.2); out = 1 + (k % 2 ? 1 : -1) * RW.rand(2, 5);   // zigzag in and out
      }
      set.arcs.push({ pts, life: 0.08 + Math.random() * 0.12 });
    }
    const cx = Math.round(p.x + 6 - cam.x), cy = Math.round(p.y + 28 - 14 * sc - cam.y);
    set.arcs.forEach((a) => {
      const pix = [];
      for (let i = 1; i < a.pts.length; i++) {
        let [x0, y0] = a.pts[i - 1], [x1, y1] = a.pts[i]; x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
        for (let s = 0; s <= n; s++) pix.push([Math.round(x0 + (x1 - x0) * s / n), Math.round(y0 + (y1 - y0) * s / n)]);
      }
      g.globalAlpha = 0.35; g.fillStyle = STORM.cyan; pix.forEach(([x, y]) => g.fillRect(cx + x - 1, cy + y - 1, 3, 3));
      g.globalAlpha = 1; g.fillStyle = Math.random() < 0.5 ? '#ffffff' : '#bff4ff'; pix.forEach(([x, y]) => g.fillRect(cx + x, cy + y, 1, 1));
    });
    g.globalAlpha = 1;
  }
})(window.RW);
