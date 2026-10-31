// 4 Brothers World V2 — part 11: every hero mines in his own way.
// Only how mining LOOKS changes. The time a block takes, what can be mined with what, stamina and drops are exactly
// as before (this file never touches P.mine's progress).
//   Fuzzy: sucks the block in, hard. A stream of bits pours from the block into his mouth and he swells as he pulls.
//   Acorn: headbutts it, over and over.
//   Rock:  punches it with his stone fist.
//   Ghost: his arm goes see-through, slides into the block, then turns solid inside it (and the block cracks).
(function (RW) {
  'use strict';
  const P = RW.player, E = RW.ent, A = RW.art, TS = RW.TILE;
  if (!P || !E || !A) return;

  const now = () => (RW.game && RW.game.time) || performance.now() / 1000;
  const mining = () => !!(P.mine && !P.mine.locked && RW.input.act('attack') && !P.dead && !(P.vine && P.vine.state === 'on'));
  const PERIOD = { fuzzy: 0.5, acorn: 0.32, rock: 0.32, ghost: 0.64 };
  const ease = (k) => 1 - Math.pow(1 - k, 3);
  const blockCols = () => { const t = RW.world.tile(P.mine.tx, P.mine.ty); return t.colors || [t.crystal || '#a0a0a0']; };

  // a spout of bits pulled out of the block into the fuzzy's mouth
  let suckT = 0;
  const baseUpdate = P.update;
  P.update = function (dt) {
    const out = baseUpdate.apply(this, arguments);
    if (P.species === 'fuzzy' && mining()) {
      suckT -= dt;
      if (suckT <= 0) {
        suckT = 0.03; const cols = blockCols(), bx = P.mine.tx * TS + 8, by = P.mine.ty * TS + 8, mx = P.x + P.w / 2 + (P.face || 1) * 6, my = P.y + 16;
        const sx = bx + RW.rand(-7, 7), sy = by + RW.rand(-7, 7), life = 0.22;
        RW.fx.spawn({ x: sx, y: sy, vx: (mx - sx) / life, vy: (my - sy) / life, life, color: RW.pick(cols), size: 2 });
        if (Math.random() < 0.4) RW.fx.spawn({ x: sx, y: sy, vx: (mx - sx) / life, vy: (my - sy) / life, life, color: '#fff6e0', add: true, kind: 'glow' });
      }
    }
    return out;
  };

  const baseDraw = E.drawPlayer;
  E.drawPlayer = function (g, cam, p, look, opts) {
    if (p !== P || !opts || !mining()) return baseDraw.apply(this, arguments);
    const sp = opts.species, per = PERIOD[sp]; if (!per) return baseDraw.apply(this, arguments);
    const k = (now() % per) / per, bx = P.mine.tx * TS + 8, by = P.mine.ty * TS + 8;
    const cx = P.x + P.w / 2, cy = P.y + P.h / 2; let dx = bx - cx, dy = by - cy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const face = bx >= cx ? 1 : -1;
    // the hero faces the block, holds no tool, and isn't in the swing pose
    const q = Object.assign({}, p, { face, anim: P.ground ? 0 : 5 });
    const o = Object.assign({}, opts, { item: null, swing: 0 });

    if (sp === 'acorn') {
      // a headbutt: a quick lunge at the block, a beat against it, then back
      const lunge = k < 0.35 ? ease(k / 0.35) : k < 0.5 ? 1 : 1 - (k - 0.5) / 0.5;
      const reach = Math.max(0, Math.min(24, d - 12));
      q.x += dx * reach * lunge; q.y += Math.min(0, dy) * reach * lunge * 0.6; q.anim = P.ground ? 2 : 5;
      // he tips forward into the hit, pivoting on his feet
      const px = Math.round(q.x + P.w / 2 - cam.x), py = Math.round(q.y + P.h - cam.y);
      g.save(); g.translate(px, py); g.rotate(face * 0.45 * lunge * (dy < -0.6 ? -0.5 : 1)); g.translate(-px, -py);
      let out; try { out = baseDraw.call(this, g, cam, q, look, o); } finally { g.restore(); }
      if (k > 0.33 && k < 0.45) { g.fillStyle = 'rgba(255,240,200,0.8)'; const ix = Math.round(bx - dx * 8 - cam.x), iy = Math.round(by - dy * 8 - 2 - cam.y); [[-3, 0], [3, 0], [0, -3], [0, 3]].forEach(([a, b]) => g.fillRect(ix + a, iy + b, 1, 1)); }
      return out;
    }
    if (sp === 'fuzzy') {
      // sucking hard: he swells a little on each pull, and a funnel of air runs from the block to his mouth
      o.scale = (opts.scale || 1) * (1 + 0.1 * Math.sin(k * Math.PI));
      const out = baseDraw.call(this, g, cam, q, look, o);
      const mx = cx + face * 6, my = P.y + 16;
      g.save(); g.globalAlpha = 0.45; g.strokeStyle = '#fff6e0'; g.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const ph = (k + i / 3) % 1; g.beginPath();
        for (let s = 0; s <= 10; s++) { const f = s / 10, w = (1 - f) * 6 * Math.sin(f * 9 + ph * 6.28 + i * 2); const x = bx + (mx - bx) * f - dy * w, y = by + (my - by) * f + dx * w; if (s) g.lineTo(x - cam.x, y - cam.y); else g.moveTo(x - cam.x, y - cam.y); }
        g.stroke();
      }
      g.restore();
      return out;
    }
    if (sp === 'rock') {
      // a punch: the stone fist shoots out to the block and pulls back
      const out = baseDraw.call(this, g, cam, q, look, o);
      const C = A.rockColors ? A.rockColors(look || A.DEFAULT_LOOK) : { base: '#8a8478', dark: '#5a544c', light: '#aaa498' };
      const sx = cx + face * 6, sy = P.y + 14, punch = k < 0.3 ? ease(k / 0.3) : k < 0.45 ? 1 : 1 - (k - 0.45) / 0.55;
      const reach = Math.max(4, d - 6) * punch, fx = sx + dx * reach, fy = sy + dy * reach;
      g.strokeStyle = C.dark; g.lineWidth = 5; g.beginPath(); g.moveTo(sx - cam.x, sy - cam.y); g.lineTo(fx - cam.x, fy - cam.y); g.stroke();
      g.strokeStyle = C.base; g.lineWidth = 3; g.beginPath(); g.moveTo(sx - cam.x, sy - cam.y); g.lineTo(fx - cam.x, fy - cam.y); g.stroke();
      const X = Math.round(fx - cam.x) - 4, Y = Math.round(fy - cam.y) - 4;
      g.fillStyle = '#141218'; g.fillRect(X - 1, Y - 1, 10, 10); g.fillStyle = C.base; g.fillRect(X, Y, 8, 8);
      g.fillStyle = C.light; g.fillRect(X, Y, 8, 2); g.fillStyle = C.dark; g.fillRect(X, Y + 6, 8, 2); g.fillRect(X + (face > 0 ? 5 : 1), Y + 2, 2, 4); // knuckles
      if (punch > 0.95) { g.fillStyle = 'rgba(255,240,200,0.85)'; [[-5, -3], [5, -4], [-4, 5], [6, 4]].forEach(([a, b]) => g.fillRect(Math.round(fx - cam.x) + a, Math.round(fy - cam.y) + b, 2, 1)); }
      return out;
    }
    if (sp === 'ghost') {
      // the arm goes see-through, slides into the block, then turns solid inside it
      const out = baseDraw.call(this, g, cam, q, look, o);
      const sheet = (RW.SHEETS && look && RW.SHEETS[look.sheet]) || '#e4e8f4';
      const slide = k < 0.55 ? ease(k / 0.55) : 1, solid = k >= 0.55 && k < 0.85;
      const sx = cx + face * 7, sy = P.y + 15, len = (d - 2) * slide;
      g.save(); g.globalAlpha = solid ? 1 : 0.32;
      for (let s = 0; s <= len; s += 3) { const x = sx + dx * s, y = sy + dy * s, r = s > len - 4 ? 3 : 2; g.fillStyle = RW.shade(sheet, s > len - 4 ? 0.1 : -0.05); g.beginPath(); g.arc(x - cam.x, y - cam.y, r, 0, 6.28); g.fill(); }
      g.restore();
      if (solid && k < 0.62) { g.fillStyle = 'rgba(220,230,255,0.9)'; [[-6, 0], [6, 0], [0, -6], [0, 6], [-4, -4], [4, 4]].forEach(([a, b]) => g.fillRect(Math.round(bx - cam.x) + a, Math.round(by - cam.y) + b, 1, 1)); }
      return out;
    }
    return baseDraw.apply(this, arguments);
  };
})(window.RW);
