// 4 Brothers World V3 — part 4: the Gemscale Leviathan, remade.
//  * A massive sea serpent, about 48 blocks long, that coils through the flooded Heart Chamber. Its body is armoured
//    plates over a glowing seam, with a crest of gem crystals down its back, swept crystal horns, a jaw full of teeth and
//    a tail fan of crystal. Every part moves: the body ripples, the fins row, the jaw opens to roar, bite and fire.
//  * 12,000 health, plus 30% for every extra player inside the chamber (checked as people come and go).
//  * Shield phases: at 70% and at 30% it raises a crystal shield and calls Crystal Guardians out of the chamber walls
//    (4, then 6). The shield holds until every guardian is broken. After the second shield it is enraged: red eyes,
//    cracked glowing scales, faster, and it chains its attacks.
//  * Attacks: lunge and bite (it pulls back first), crystal barrage (fans, then spirals), the prism laser (a thin
//    aiming line, then a sweeping beam), the whirlpool (pulls you toward its jaws), coil and crush (it rings you and
//    squeezes: swim out through the gap before it closes), stalactite collapse (it rams the roof: watch for the marks),
//    tail slam (a ring of shards), and it calls fish. Enraged, it adds double lunges and a double beam sweep.
//  * In a room, one player runs it and the others see the same fight: its state, the beam, whirlpool, coil and shield
//    travel with the boss, and each player is hurt by them on their own screen.
//  * The chamber always fills back up with water when the fight starts.
(function (RW) {
  'use strict';
  const E = RW.ent, P = RW.player, WD = RW.world, A = RW.art, U = RW.ui, N = RW.net, TS = RW.TILE;
  if (!E || !P || !WD || !A) return;
  const LEV = 'gemscale_leviathan', GUARD = 'v3_guardian';
  const BASE_HP = 12000, NSEG = 34, GAP = 22;
  const GEMS = ['#e0525a', '#4fa8f0', '#5fd98a', '#a86ef0', '#f2c94c', '#7fe3ff'];
  const now = () => performance.now() / 1000;
  const inRock = () => WD.def && WD.def.id === 'rock';
  const segR = (i) => 30 - 21 * Math.pow(i / NSEG, 1.15); // 30 at the neck, 9 at the tail

  // ================================= species =================================
  const sp = RW.SPECIES[LEV];
  if (sp) Object.assign(sp, { w: 68, h: 68, hp: BASE_HP, dmg: 26, speed: 200, blurb: 'A serpent as long as a town, armoured in gem-studded plates. It guards the Elder Crystals in the flooded Heart Chamber. Twice it hides behind a crystal shield and sends out its guardians: break them all to reach it again.' });
  RW.register.species({ id: GUARD, type: 'monsters', name: 'Crystal Guardian', world: 'rock', role: 'enemy', status: 'active', art: { draw: 'v3guardian' },
    w: 22, h: 30, hp: 320, dmg: 16, speed: 70, behavior: 'v3guardian', drops: [['crystal_dust', 0.8, 1, 3], ['leviathan_scale', 0.4, 1, 2]],
    blurb: 'Gem golems the Leviathan calls out of the chamber walls. While any of them stands, its crystal shield holds.' });

  // ================================= state helpers =================================
  const C = () => WD.meta && WD.meta.arena;
  const arenaPx = () => { const c = C(); return { cx: c.cx * TS + 8, cy: c.cy * TS + 8, rx: c.rx * TS, ry: c.ry * TS }; };
  const inArena = (x, y, k) => { const a = arenaPx(); const dx = (x - a.cx) / (a.rx * (k || 1)), dy = (y - a.cy) / (a.ry * (k || 1)); return dx * dx + dy * dy <= 1; };
  const clampArena = (x, y, m) => { const a = arenaPx(); const rx = a.rx - m, ry = a.ry - m; let dx = (x - a.cx) / rx, dy = (y - a.cy) / ry; const d = Math.hypot(dx, dy); if (d > 1) { dx /= d; dy /= d; } return { x: a.cx + dx * rx, y: a.cy + dy * ry }; };
  const head = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
  function players() {
    const out = [];
    if (!P.dead && RW.game && RW.game.playing) out.push({ me: true, x: P.x + 6, y: P.y + 14 });
    if (N && N.peers) N.peers.forEach((p) => { const t = p.target; if (t && t.w === 'rock' && !t.dead) out.push({ me: false, x: p.x + 6, y: p.y + 14 }); });
    return out;
  }
  const fighters = () => players().filter((p) => inArena(p.x, p.y, 1.05));
  function target(b) { const h = head(b); let best = null, bd = 1e9; fighters().forEach((p) => { const d = Math.hypot(p.x - h.x, p.y - h.y); if (d < bd) { bd = d; best = p; } }); return best || players()[0] || { x: h.x, y: h.y }; }
  const fx = (b, type, o) => { b.fx = (b.fx || []).filter((f) => f.type !== type); if (o) b.fx.push(Object.assign({ type, t: 0 }, o)); };
  const getFx = (b, type) => (b.fx || []).find((f) => f.type === type);

  // keep the chamber flooded: every open cell in it is water again when the fight starts
  function refill() {
    const c = C(); if (!c) return; const T = RW.T;
    for (let y = c.cy - c.ry - 2; y <= c.cy + c.ry + 2; y++) for (let x = c.cx - c.rx - 2; x <= c.cx + c.rx + 2; x++) {
      const dx = (x - c.cx) / c.rx, dy = (y - c.cy) / c.ry; if (dx * dx + dy * dy > 0.97 || !WD.inb(x, y)) continue;
      const i = WD.idx(x, y); if (WD.fg[i] === T.air) WD.fg[i] = T.water;
    }
    WD.dirtySky = true;
  }

  // ================================= the fight =================================
  function initBoss(b) {
    const a = arenaPx();
    b.v3 = true; b.customDraw = true; b.w = 68; b.h = 68; b.engaged = true;
    b.ang = -Math.PI / 2; const hx = a.cx + (Math.random() - 0.5) * a.rx * 0.6, hy = a.cy + a.ry + 60;
    b.x = hx - b.w / 2; b.y = hy - b.h / 2;
    b.segs = []; for (let i = 0; i < NSEG; i++) b.segs.push({ x: hx, y: hy + GAP * (i + 1) });
    b.faces = []; b.state = 'emerge'; b.st = 2.6; b.phase = 1; b.shield = 0; b.shieldsDone = 0; b.fx = [];
    b.nFight = 1; b.maxhp = b.hp = BASE_HP; b.scaleT = 0;
    b.hitbox = () => segHitbox(b);
    refill();
  }
  function segHitbox(b) {
    const pc = { x: P.x + 6, y: P.y + 14 }, h = head(b); let best = h, r = 32, bd = Math.hypot(pc.x - h.x, pc.y - h.y);
    (b.segs || []).forEach((s, i) => { const d = Math.hypot(pc.x - s.x, pc.y - s.y); if (d < bd) { bd = d; best = s; r = segR(i) + 2; } });
    return { x: best.x - r, y: best.y - r, w: r * 2, h: r * 2 };
  }
  function follow(b) { let x0 = b.x + b.w / 2, y0 = b.y + b.h / 2; for (const s of b.segs) { const dx = s.x - x0, dy = s.y - y0, d = Math.hypot(dx, dy) || 1; s.x = x0 + dx / d * GAP; s.y = y0 + dy / d * GAP; x0 = s.x; y0 = s.y; } }
  function steer(b, dt, tx, ty, speed, turn) {
    const h = head(b); const want = Math.atan2(ty - h.y, tx - h.x); let da = want - b.ang;
    while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    b.ang += RW.clamp(da, -turn * dt, turn * dt);
    let nx = h.x + Math.cos(b.ang) * speed * dt, ny = h.y + Math.sin(b.ang) * speed * dt;
    if (b.state !== 'emerge' && b.state !== 'dying') { const q = clampArena(nx, ny, 34); if (q.x !== nx || q.y !== ny) { nx = RW.lerp(nx, q.x, 0.5); ny = RW.lerp(ny, q.y, 0.5); } }
    b.vx = (nx - h.x) / Math.max(dt, 1e-4); b.vy = (ny - h.y) / Math.max(dt, 1e-4);
    b.x = nx - b.w / 2; b.y = ny - b.h / 2; b.face = Math.cos(b.ang) >= 0 ? 1 : -1;
    follow(b);
  }
  const fast = (b) => (b.phase === 3 ? 1.35 : b.phase === 2 ? 1.15 : 1);
  function pick(b) {
    const P1 = [['charge', 3], ['barrage', 3], ['beam', 2], ['collapse', 2], ['whirl', 1], ['coil', 1], ['summon', 1], ['tail', 1]];
    const P2 = [['charge', 3], ['barrage', 2], ['beam', 3], ['collapse', 2], ['whirl', 2], ['coil', 2], ['summon', 1], ['tail', 2]];
    const P3 = [['charge', 3], ['frenzy', 2], ['barrage', 2], ['beam', 3], ['collapse', 2], ['whirl', 2], ['coil', 3], ['tail', 2]];
    const SH = [['barrage', 3], ['collapse', 2], ['tail', 2], ['cruise', 2]];
    const L = b.shield ? SH : b.phase === 3 ? P3 : b.phase === 2 ? P2 : P1;
    let tot = 0; L.forEach(([k, w]) => { if (k !== b.last) tot += w; });
    let r = Math.random() * tot; let s = L[0][0];
    for (const [k, w] of L) { if (k === b.last) continue; r -= w; if (r <= 0) { s = k; break; } }
    b.last = s; b.state = s; b.st = 0; b.did = 0; b.k = 0; clearMoves(b);
  }
  function clearMoves(b) { ['v3beam', 'v3vortex', 'v3coil', 'v3slam'].forEach((t) => fx(b, t, null)); }
  const shard = (x, y, a, v, dmg, col) => E.shots.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 3.2, owner: 'e', dmg, kind: 'bshard', color: col || RW.pick(GEMS) });
  function mouth(b) { const h = head(b); return { x: h.x + Math.cos(b.ang) * 40, y: h.y + Math.sin(b.ang) * 40 }; }
  function roar(b, txt) {
    clearMoves(b); b.state = 'roar'; b.st = 0; fx(b, 'v3roar', { x: Math.round(head(b).x), y: Math.round(head(b).y) });
    RW.audio.sfx('roar'); RW.fx.shake(9, 1.1); if (txt) U.toast(txt);
  }
  function startShield(b, n) {
    b.shield = n; roar(b, n === 4 ? 'The Leviathan raises a crystal shield! Break the Crystal Guardians to bring it down.' : 'The shield is back, and stronger. Break every guardian!');
    fx(b, 'v3shield', { x: 1 });
    const a = arenaPx(), hp = Math.round(RW.SPECIES[GUARD].hp * (1 + 0.3 * Math.max(0, b.nFight - 1)) * (n === 6 ? 1.3 : 1));
    for (let k = 0; k < n; k++) {
      const fs = fighters(), who = fs.length ? fs[k % fs.length] : { x: head(b).x, y: head(b).y };
      const ang = (k / n) * Math.PI * 2 + Math.random() * 0.4;
      const p = clampArena(who.x + Math.cos(ang) * 260, who.y + Math.sin(ang) * 160, 40);
      const e = E.spawnEnemy(GUARD, p.x - 11, p.y - 15); e.hp = e.maxhp = hp; e.gem = k % 4; e.provoked = true;
      RW.fx.burst(p.x, p.y, [GEMS[k % 4], '#ffffff'], 24, 140, { add: true, kind: 'glow', life: 0.8 });
    }
  }
  const guardsLeft = () => E.enemies.filter((e) => e.sp === GUARD && !e.dead).length;

  function ai(b, dt) {
    const a = arenaPx(), h = head(b), tg = target(b), F = fast(b);
    b.t = (b.t || 0) + dt; b.st += dt; b.hitT -= dt;
    (b.fx || []).forEach((f) => { f.t += dt; });
    // more fighters, more health (keeps the same share of health left)
    if ((b.scaleT -= dt) <= 0) {
      b.scaleT = 3; const n = Math.max(1, fighters().length);
      if (n !== b.nFight) { const frac = b.hp / b.maxhp; b.nFight = n; b.maxhp = Math.round(BASE_HP * (1 + 0.3 * (n - 1))); b.hp = Math.max(1, Math.round(b.maxhp * frac)); }
    }
    // shields and phases
    const frac = b.hp / b.maxhp;
    if (!b.shield && b.shieldsDone === 0 && frac <= 0.7) startShield(b, 4);
    else if (!b.shield && b.shieldsDone === 1 && frac <= 0.3) startShield(b, 6);
    if (b.shield && b.state !== 'roar' && guardsLeft() === 0) {
      b.shield = 0; b.shieldsDone++; fx(b, 'v3shield', null);
      b.phase = b.shieldsDone === 1 ? 2 : 3;
      roar(b, b.phase === 2 ? 'The shield shatters! The Leviathan\'s crystals blaze.' : 'The shield shatters, and the Leviathan goes mad with rage!');
      RW.fx.flash(b.phase === 3 ? '#ff2a3a' : '#c8a6ff', 0.3);
      if (b.phase === 3) fx(b, 'v3rage', { x: 1 });
    }
    if (Math.random() < dt * 14) { const s = RW.pick(b.segs); RW.fx.spawn({ x: s.x + RW.rand(-8, 8), y: s.y + RW.rand(-8, 8), vy: -14, life: 0.7, color: b.phase === 3 ? RW.pick(['#ff5a3a', '#ffb070']) : RW.pick(GEMS), add: true, kind: 'glow' }); }

    switch (b.state) {
      case 'emerge':
        steer(b, dt, h.x, a.cy - 20, 150, 1.2);
        if (b.st > 1.2 && !b.did) { b.did = 1; fx(b, 'v3roar', { x: Math.round(h.x), y: Math.round(h.y) }); RW.audio.sfx('roar'); RW.fx.shake(8, 1.2); }
        if (b.st > 2.6) { b.state = 'cruise'; b.st = 0; b.dur = 1.6; }
        break;
      case 'roar':
        steer(b, dt, h.x + Math.cos(b.ang) * 30, h.y - 30, 40, 2);
        if (b.st > 1.6) { fx(b, 'v3roar', null); b.state = 'cruise'; b.st = 0; b.dur = 1; }
        break;
      case 'cruise': {
        b.oa = (b.oa || 0) + dt * 0.9 * F;
        const R = b.shield ? 360 : 240;
        steer(b, dt, tg.x + Math.cos(b.oa) * R, tg.y + Math.sin(b.oa) * R * 0.5, 230 * F, 2.4);
        if (b.st > (b.dur || 1.8) / F) pick(b);
        break;
      }
      case 'charge': case 'frenzy': {
        const n = b.state === 'frenzy' ? 3 : 1;
        if (b.k < n) {
          if (!b.did) { // pull back, jaw open, eyes flare
            steer(b, dt, tg.x, tg.y, 50, 3);
            if (b.st > (b.state === 'frenzy' && b.k ? 0.35 : 0.85) / F) { b.did = 1; b.st = 0; RW.audio.sfx('roar'); }
          } else {
            steer(b, dt, tg.x, tg.y, 640 * F, 1.1);
            if (Math.random() < dt * 40) RW.fx.spawn({ x: h.x, y: h.y, vx: -b.vx * 0.08, vy: -b.vy * 0.08, life: 0.6, color: '#e8faff', add: true, kind: 'bubble' });
            if (b.st > 0.95) { b.k++; b.did = 0; b.st = 0; }
          }
        } else { b.state = 'cruise'; b.st = 0; b.dur = 1.3; }
        break;
      }
      case 'barrage': {
        steer(b, dt, tg.x + (h.x < tg.x ? -260 : 260), tg.y - 40, 120, 2.5);
        const vol = b.phase === 3 ? 4 : 3;
        if (b.st > 0.5 + b.k * 0.42 && b.k < vol) {
          const m = mouth(b), a0 = Math.atan2(tg.y - m.y, tg.x - m.x);
          if (b.phase >= 2 && b.k === vol - 1) { for (let i = 0; i < 18; i++) shard(m.x, m.y, a0 + i * (Math.PI * 2 / 18) + b.t, 220, 12); }
          else { const nn = 7 + b.k * 2; for (let i = 0; i < nn; i++) shard(m.x, m.y, a0 + (i - (nn - 1) / 2) * 0.11, 270 + b.phase * 20, 12); }
          RW.audio.sfx('crystal'); b.k++;
        }
        if (b.st > 0.5 + vol * 0.42 + 0.5) { b.state = 'cruise'; b.st = 0; b.dur = 1.4; }
        break;
      }
      case 'beam': {
        const m = mouth(b);
        if (!b.did) { b.aim = Math.atan2(tg.y - m.y, tg.x - m.x); b.did = 1; b.sweepDir = Math.random() < 0.5 ? 1 : -1; }
        const charge = 1.25 / F, fire = 2.2, sweeps = b.phase === 3 ? 2 : 1;
        if (b.st < charge) {
          steer(b, dt, h.x, h.y, 20, 0); // hold still, the head turns to aim
          let want = Math.atan2(tg.y - m.y, tg.x - m.x), da = want - b.aim; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; b.aim += RW.clamp(da, -1.6 * dt, 1.6 * dt);
          b.ang = b.aim;
          fx(b, 'v3beam', { ax: Math.round(m.x), ay: Math.round(m.y), bx: Math.round(m.x + Math.cos(b.aim) * 1100), by: Math.round(m.y + Math.sin(b.aim) * 1100), warn: 1 });
          if (!b.k) { b.k = 1; RW.audio.sfx('crystal'); }
        } else if (b.st < charge + fire * sweeps) {
          const u = ((b.st - charge) % fire) / fire, sw = Math.floor((b.st - charge) / fire) % 2 ? -1 : 1;
          const ang = b.aim + b.sweepDir * sw * (u - 0.5) * 1.15;
          b.ang = ang; steer(b, dt, h.x - Math.cos(ang) * 10, h.y - Math.sin(ang) * 10, 10, 0); b.ang = ang;
          fx(b, 'v3beam', { ax: Math.round(m.x), ay: Math.round(m.y), bx: Math.round(m.x + Math.cos(ang) * 1100), by: Math.round(m.y + Math.sin(ang) * 1100), warn: 0 });
          if (b.k === 1) { b.k = 2; RW.audio.sfx('lightning'); RW.fx.shake(4, fire * sweeps); }
        } else { fx(b, 'v3beam', null); b.state = 'cruise'; b.st = 0; b.dur = 1.2; }
        break;
      }
      case 'whirl': {
        if (!b.did) { b.did = 1; const p = clampArena(tg.x, tg.y, 90); b.vx0 = p.x; b.vy0 = p.y; b.oa = Math.atan2(h.y - p.y, h.x - p.x); }
        const dur = 4.6;
        if (b.st < dur) {
          b.oa += dt * 2.2 * F; steer(b, dt, b.vx0 + Math.cos(b.oa) * 140, b.vy0 + Math.sin(b.oa) * 110, 320 * F, 4);
          fx(b, 'v3vortex', { x: Math.round(b.vx0), y: Math.round(b.vy0), ax: Math.round(Math.min(1, b.st / 0.8) * 100) });
        } else if (b.st < dur + 0.9) { fx(b, 'v3vortex', null); steer(b, dt, b.vx0, b.vy0, 600 * F, 2.5); }
        else { b.state = 'cruise'; b.st = 0; b.dur = 1.4; }
        break;
      }
      case 'coil': {
        if (!b.did) { b.did = 1; b.vx0 = tg.x; b.vy0 = tg.y; b.oa = Math.atan2(h.y - tg.y, h.x - tg.x); }
        const dur = 3.4 / F, r = RW.lerp(280, 84, Math.min(1, b.st / dur));
        if (b.st < dur) {
          b.oa += dt * (440 * F) / r; steer(b, dt, b.vx0 + Math.cos(b.oa) * r, b.vy0 + Math.sin(b.oa) * r, 440 * F, 7);
          fx(b, 'v3coil', { x: Math.round(b.vx0), y: Math.round(b.vy0), ax: Math.round(r) });
        } else if (!b.k) { b.k = 1; fx(b, 'v3coil', { x: Math.round(b.vx0), y: Math.round(b.vy0), ax: 60, warn: 2 }); RW.fx.shake(10, 0.5); RW.audio.sfx('slam'); }
        else if (b.st > dur + 0.5) { fx(b, 'v3coil', null); b.state = 'cruise'; b.st = 0; b.dur = 1.6; }
        else { b.oa += dt * 3; steer(b, dt, b.vx0 + Math.cos(b.oa) * 84, b.vy0 + Math.sin(b.oa) * 84, 300, 7); }
        break;
      }
      case 'collapse': {
        const roofY = a.cy - a.ry + 30;
        if (!b.did) { steer(b, dt, tg.x, roofY, 520 * F, 3); if (h.y < roofY + 30 || b.st > 1.8) { b.did = 1; b.st = 0; RW.fx.shake(12, 0.9); RW.audio.sfx('slam'); RW.fx.ring(h.x, h.y - 20, '#c8b898', 140, 0.6, 3);
          const spikes = (WD.meta.roofSpikes || []).filter((s) => Math.abs(s.x * TS - tg.x) < 26 * TS);
          const n = Math.min(spikes.length, b.phase === 3 ? 16 : b.phase === 2 ? 12 : 9);
          spikes.sort(() => Math.random() - 0.5).slice(0, n).forEach((s, i) => E.shots.push({ x: s.x * TS + 8 + RW.rand(-6, 6), y: s.y * TS + 4, vx: 0, vy: 40, life: 5, owner: 'e', dmg: 22, kind: 'rain', grav: 520, warn: 0.7 + i * 0.06, color: RW.pick(['#c8a6ff', '#7fe3ff', '#e8e0ff']) }));
          for (let k = 0; k < 6; k++) E.shots.push({ x: tg.x + RW.rand(-180, 180), y: roofY - 20, vx: 0, vy: 40, life: 5, owner: 'e', dmg: 18, kind: 'rain', grav: 520, warn: 0.9 + k * 0.1, color: '#c8b898' });
        } }
        else { steer(b, dt, h.x + Math.cos(b.ang) * 40, h.y + 60, 160, 2); if (b.st > 1.3) { b.state = 'cruise'; b.st = 0; b.dur = 1.5; } }
        break;
      }
      case 'tail': {
        steer(b, dt, tg.x + (h.x < tg.x ? -200 : 200), tg.y + 60, 260 * F, 3);
        if (b.st > 0.9 && !b.did) {
          b.did = 1; const t = b.segs[b.segs.length - 1];
          fx(b, 'v3slam', { x: Math.round(t.x), y: Math.round(t.y) });
          const n = b.phase === 3 ? 26 : 18; for (let i = 0; i < n; i++) shard(t.x, t.y, i * Math.PI * 2 / n, 200, 13, '#bfeaff');
          RW.fx.shake(7, 0.4); RW.audio.sfx('slam');
        }
        if (b.st > 1.8) { fx(b, 'v3slam', null); b.state = 'cruise'; b.st = 0; b.dur = 1.3; }
        break;
      }
      case 'summon':
        steer(b, dt, tg.x, tg.y - 120, 150, 2);
        if (!b.did) { b.did = 1; for (let k = 0; k < 3 + b.phase; k++) { const e = E.spawnEnemy(k % 2 ? 'spiky_fish' : 'creepy_fish', h.x + RW.rand(-80, 80), h.y + RW.rand(-40, 40)); RW.fx.burst(e.x, e.y, '#a86ef0', 12, 80, { add: true, kind: 'glow' }); } RW.audio.sfx('roar'); }
        if (b.st > 1.2) { b.state = 'cruise'; b.st = 0; b.dur = 2; }
        break;
      default: b.state = 'cruise'; b.st = 0;
    }
    b.frame = Math.floor(b.t * 6) % 2;
    RW.fx.light(h.x, h.y, b.phase === 3 ? 0.8 : 0.5, b.phase === 3 ? 0.25 : 0.4, b.phase === 3 ? 0.25 : 0.8);
  }

  // ---- what every player feels from the boss's effects (their own hero, on their own screen) ----
  let beamCd = 0, vortCd = 0, crushDone = new WeakSet();
  function feel(b, dt) {
    if (P.dead || !(RW.game && RW.game.playing)) return;
    const pc = { x: P.x + 6, y: P.y + 14 }; beamCd -= dt; vortCd -= dt;
    const bm = getFx(b, 'v3beam');
    if (bm && !bm.warn && beamCd <= 0) {
      const dx = bm.bx - bm.ax, dy = bm.by - bm.ay, L2 = dx * dx + dy * dy, t = RW.clamp(((pc.x - bm.ax) * dx + (pc.y - bm.ay) * dy) / L2, 0, 1);
      const qx = bm.ax + dx * t, qy = bm.ay + dy * t;
      if (Math.hypot(pc.x - qx, pc.y - qy) < 15) { beamCd = 0.3; P.hurt(b.phase === 3 ? 18 : 14, Math.sign(pc.x - qx) || 1, 'beam'); RW.fx.burst(pc.x, pc.y, ['#ffffff', '#ff9ad0', '#9ad8ff'], 6, 80, { add: true, kind: 'glow' }); }
    }
    const vt = getFx(b, 'v3vortex');
    if (vt) {
      const dx = vt.x - pc.x, dy = vt.y - pc.y, d = Math.hypot(dx, dy) || 1, k = (vt.ax || 100) / 100;
      if (d < 420) { const pull = Math.min(300, 52000 / (d + 60)) * k; P.vx += (dx / d) * pull * dt * 2.2 + (-dy / d) * pull * dt * 1.2; P.vy += (dy / d) * pull * dt * 2.2 + (dx / d) * pull * dt * 1.2; }
      if (d < 34 && vortCd <= 0) { vortCd = 0.45; P.hurt(11, 1, 'whirlpool'); }
    }
    const co = getFx(b, 'v3coil');
    if (co && co.warn === 2 && !crushDone.has(co)) { crushDone.add(co); if (Math.hypot(pc.x - co.x, pc.y - co.y) < 110) { P.hurt(b.phase === 3 ? 55 : 42, Math.sign(pc.x - co.x) || 1, 'coil'); P.vy = -260; } }
  }

  // ================================= hooks =================================
  const baseMaybe = E.maybeSpawnBoss;
  E.maybeSpawnBoss = function () {
    const had = E.boss; const r = baseMaybe.apply(this, arguments);
    if (!had && E.boss && E.boss.sp === LEV && inRock() && !E.boss.mirror) initBoss(E.boss);
    return r;
  };
  const baseUp = E.updateBoss;
  E.updateBoss = function (dt) {
    const b = E.boss;
    if (!b || b.sp !== LEV || !inRock()) return baseUp.apply(this, arguments);
    if (b.mirror || (N && N.transport && RW.sync && !RW.sync.auth)) {
      const r = baseUp.apply(this, arguments);
      const B2 = E.boss; if (B2 && B2.sp === LEV) mirror(B2, dt);
      return r;
    }
    if (!b.v3) initBoss(b);
    if (b.dead) { b.deadT = (b.deadT || 0) + dt; return; }
    ai(b, dt); feel(b, dt);
    // touching any part of it hurts
    if (!P.dead && E.overlap(segHitbox(b), P)) P.hurt(RW.SPECIES[LEV].dmg * (b.phase === 3 ? 1.3 : 1), Math.sign(P.x - head(b).x) || 1, 'leviathan');
  };
  // someone else runs the fight: rebuild the body behind the head we're sent, play the effects
  function mirror(b, dt) {
    b.customDraw = true; b.t = (b.t || 0) + dt;
    const h = head(b);
    if (!b.segs) { b.segs = []; for (let i = 0; i < NSEG; i++) b.segs.push({ x: h.x, y: h.y + GAP * (i + 1) }); b.ang = -Math.PI / 2; }
    if (b.lh) { const dx = h.x - b.lh.x, dy = h.y - b.lh.y; if (dx * dx + dy * dy > 0.5) { let want = Math.atan2(dy, dx), da = want - b.ang; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; b.ang += da * Math.min(1, dt * 10); } }
    const bm = (b.fx || []).find((f) => f.type === 'v3beam'); if (bm) b.ang = Math.atan2(bm.by - bm.ay, bm.bx - bm.ax);
    b.lh = h; follow(b);
    b.hitbox = () => segHitbox(b);
    b.phase = getFx(b, 'v3rage') ? 3 : b.phase || 1;
    feel(b, dt);
  }
  // the shield: hits glance off
  const baseDamage = E.damage;
  E.damage = function (e, d) {
    if (e && e.sp === LEV && inRock() && (e.shield || getFx(e, 'v3shield'))) {
      if (!e._shT || now() - e._shT > 0.4) { e._shT = now(); const h = head(e); RW.fx.text(h.x, h.y - 40, 'Shielded', '#c8f0ff'); RW.fx.burst(h.x, h.y, ['#c8f0ff', '#ffffff'], 6, 90, { add: true, kind: 'glow', life: 0.3 }); RW.audio.sfx('crystal'); }
      return;
    }
    return baseDamage.apply(this, arguments);
  };

  // ---- guardians ----
  E.behaviors.v3guardian = function (e, dt, sp2) {
    const pc = P.center(), c = { x: e.x + e.w / 2, y: e.y + e.h / 2 }, d = RW.dist(pc.x, pc.y, c.x, c.y);
    e.t += dt; e.ct = (e.ct || 2 + Math.random() * 2) - dt;
    const want = d > 46 ? 1 : -0.4;
    e.vx = RW.lerp(e.vx, (pc.x - c.x) / (d || 1) * sp2.speed * want, dt * 2.5);
    e.vy = RW.lerp(e.vy, (pc.y - 6 - c.y) / (d || 1) * sp2.speed * want + Math.sin(e.t * 2.4) * 18, dt * 2.5);
    E.move(e, dt, {});
    e.face = pc.x >= c.x ? 1 : -1; e.frame = Math.floor(e.t * 4) % 2;
    if (e.ct <= 0 && d < 260) { e.ct = 2.6; const a = Math.atan2(pc.y - c.y, pc.x - c.x); for (let k = -1; k <= 1; k++) shard(c.x, c.y, a + k * 0.2, 210, 10, GEMS[e.gem || 0]); RW.audio.sfx('crystal'); e.punch = 0.3; }
    if (d < 22 && !P.dead) { P.hurt(sp2.dmg, Math.sign(pc.x - c.x) || 1, GUARD); e.punch = 0.3; }
    e.punch = Math.max(0, (e.punch || 0) - dt);
    RW.fx.light(c.x, c.y, 0.3, 0.3, 0.5);
  };

  // ================================= drawing =================================
  const baseWater = WD.drawWater;
  WD.drawWater = function (g, cam, vw, vh, time) {
    const r = baseWater.apply(this, arguments);
    if (!inRock()) return r;
    const ox = -Math.round(cam.x), oy = -Math.round(cam.y);
    E.enemies.forEach((e) => { if (e.sp === GUARD) { e.customDraw = true; drawGuardian(g, e.x + ox + e.w / 2, e.y + oy + e.h / 2, e, time); } });
    const b = E.boss;
    if (b && b.sp === LEV && b.segs) { drawFx(g, b, ox, oy, time, true); drawLev(g, b, ox, oy, time); drawFx(g, b, ox, oy, time, false); }
    return r;
  };
  const baseOver = RW.fx.drawOver;
  RW.fx.drawOver = function (g) { const r = baseOver.apply(this, arguments); const b = E.boss; if (inRock() && b && b.sp === LEV) drawShieldText(g, b); return r; };

  function shade(c, k) { return RW.shade(c, k); }
  // the serpent, tail first so the head is on top
  function drawLev(g, b, ox, oy, time) {
    const rage = b.phase === 3, shield = b.shield || getFx(b, 'v3shield'), dead = b.dead, dt0 = dead ? (b.deadT || 0) : 0;
    const flash = b.hitT > 0 ? Math.min(1, b.hitT / 0.15) : 0;
    const h = head(b), segs = b.segs, n = segs.length;
    const st = b.state || '';
    // jaw: open for roars, lunges, the beam and the bite at the end of a charge
    const jawT = st === 'roar' || st === 'emerge' ? 0.62 : (st === 'charge' || st === 'frenzy') ? (b.did ? 0.5 : 0.25 + 0.15 * Math.sin(time * 18)) : st === 'beam' ? 0.42 : st === 'whirl' ? 0.35 : st === 'barrage' ? 0.3 + 0.2 * Math.max(0, Math.sin(time * 9)) : 0.08 + 0.05 * Math.sin(time * 2.2);
    b.jaw = RW.lerp(b.jaw || 0, jawT, 0.2);
    // positions with a travelling ripple (looks only)
    const pts = [{ x: h.x, y: h.y, r: 32 }];
    for (let i = 0; i < n; i++) {
      const s = segs[i], p = i ? segs[i - 1] : h, ax = s.x - p.x, ay = s.y - p.y, L = Math.hypot(ax, ay) || 1;
      const amp = Math.min(7, i * 0.45) * (dead ? 0.3 : 1), w = Math.sin(time * 4.2 - i * 0.5) * amp;
      let x = s.x - (ay / L) * w, y = s.y + (ax / L) * w;
      if (dead) { const k = Math.max(0, dt0 - (n - i) * 0.05); x += Math.sin(i * 2.1) * k * 30; y += k * k * 40 + Math.cos(i * 1.7) * k * 12; }
      pts.push({ x, y, r: segR(i) });
    }
    const X = (x) => Math.round((x + ox) * 4) / 4, Y = (y) => Math.round((y + oy) * 4) / 4;
    const dorsal = (i) => { const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(pts.length - 1, i + 1)]; let nx = -(p1.y - p0.y), ny = p1.x - p0.x; const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L; if (ny > 0) { nx = -nx; ny = -ny; } return { nx, ny, tx: (p1.x - p0.x) / (Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1), ty: (p1.y - p0.y) / (Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1) }; };
    g.save();
    if (dead) g.globalAlpha = Math.max(0, 1 - Math.max(0, dt0 - 1.8) / 1.6);
    // --- tail fan ---
    { const t = pts[pts.length - 1], q = pts[pts.length - 3], a = Math.atan2(t.y - q.y, t.x - q.x), fl = Math.sin(time * 5) * 0.35;
      g.save(); g.translate(X(t.x), Y(t.y)); g.rotate(a);
      for (let k = -3; k <= 3; k++) { const aa = k * 0.22 + fl * 0.5; g.fillStyle = k % 2 ? 'rgba(127,227,255,0.55)' : 'rgba(168,110,240,0.55)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(aa) * 54, Math.sin(aa) * 54 - 4); g.lineTo(Math.cos(aa + 0.12) * 60, Math.sin(aa + 0.12) * 60); g.closePath(); g.fill(); }
      g.strokeStyle = 'rgba(230,250,255,0.6)'; g.lineWidth = 0.75; for (let k = -3; k <= 3; k++) { const aa = k * 0.22 + fl * 0.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(aa) * 56, Math.sin(aa) * 56); g.stroke(); }
      g.restore(); }
    // --- body: an outline pass, then the plates, then the glowing seam ---
    g.fillStyle = '#05070c';
    for (let i = pts.length - 1; i >= 1; i--) { const p = pts[i]; g.beginPath(); g.arc(X(p.x), Y(p.y), p.r + 2.5, 0, 6.283); g.fill(); }
    for (let i = pts.length - 1; i >= 1; i--) {
      const p = pts[i], d = dorsal(i), k = i / pts.length;
      const top = rage ? '#3a1a22' : '#173843', mid = rage ? '#5a2630' : '#24596a', bel = rage ? '#9a6a60' : '#7fb6b0';
      const gr = g.createLinearGradient(X(p.x + d.nx * p.r), Y(p.y + d.ny * p.r), X(p.x - d.nx * p.r), Y(p.y - d.ny * p.r));
      gr.addColorStop(0, shade(top, -0.15)); gr.addColorStop(0.45, mid); gr.addColorStop(0.8, shade(bel, -0.1)); gr.addColorStop(1, bel);
      g.fillStyle = gr; g.beginPath(); g.arc(X(p.x), Y(p.y), p.r, 0, 6.283); g.fill();
      // plate edge: a darker crescent at the back of each segment, so the plates read as overlapping armour
      g.strokeStyle = 'rgba(4,10,16,0.55)'; g.lineWidth = 1.5; g.beginPath(); g.arc(X(p.x), Y(p.y), p.r * 0.92, Math.atan2(-d.ty, -d.tx) - 1.2, Math.atan2(-d.ty, -d.tx) + 1.2); g.stroke();
      // belly scutes
      g.strokeStyle = rage ? 'rgba(255,190,160,0.35)' : 'rgba(220,250,240,0.35)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(X(p.x - d.nx * p.r * 0.55 - d.tx * p.r * 0.4), Y(p.y - d.ny * p.r * 0.55 - d.ty * p.r * 0.4)); g.lineTo(X(p.x - d.nx * p.r * 0.85), Y(p.y - d.ny * p.r * 0.85)); g.lineTo(X(p.x - d.nx * p.r * 0.55 + d.tx * p.r * 0.4), Y(p.y - d.ny * p.r * 0.55 + d.ty * p.r * 0.4)); g.stroke();
      // gem scales scattered over the back
      for (let s = 0; s < 3; s++) {
        const u = (s - 1) * 0.45, v = 0.35 + 0.18 * ((i + s) % 2), gx = p.x + d.nx * p.r * v + d.tx * p.r * u, gy = p.y + d.ny * p.r * v + d.ty * p.r * u, gc = GEMS[(i * 3 + s) % GEMS.length], sz = 1.6 + p.r * 0.06;
        g.fillStyle = shade(gc, -0.35); g.beginPath(); g.moveTo(X(gx), Y(gy - sz - 0.6)); g.lineTo(X(gx + sz + 0.6), Y(gy)); g.lineTo(X(gx), Y(gy + sz + 0.6)); g.lineTo(X(gx - sz - 0.6), Y(gy)); g.fill();
        g.fillStyle = gc; g.beginPath(); g.moveTo(X(gx), Y(gy - sz)); g.lineTo(X(gx + sz), Y(gy)); g.lineTo(X(gx), Y(gy + sz)); g.lineTo(X(gx - sz), Y(gy)); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(X(gx - sz * 0.4), Y(gy - sz * 0.5), 0.75, 0.75);
      }
      // rage: the plates crack and glow
      if (rage && i % 2 === 0) { g.strokeStyle = 'rgba(255,110,60,' + (0.5 + 0.4 * Math.sin(time * 6 + i)) + ')'; g.lineWidth = 1; g.beginPath(); g.moveTo(X(p.x + d.nx * p.r * 0.2), Y(p.y + d.ny * p.r * 0.2)); g.lineTo(X(p.x + d.nx * p.r * 0.6 + d.tx * 4), Y(p.y + d.ny * p.r * 0.6 + d.ty * 4)); g.lineTo(X(p.x + d.nx * p.r * 0.75 - d.tx * 3), Y(p.y + d.ny * p.r * 0.75 - d.ty * 3)); g.stroke(); }
      if (flash) { g.fillStyle = 'rgba(255,255,255,' + (0.55 * flash) + ')'; g.beginPath(); g.arc(X(p.x), Y(p.y), p.r, 0, 6.283); g.fill(); }
    }
    // the glowing lateral seam
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = rage ? 'rgba(255,90,60,0.55)' : 'rgba(110,230,255,0.45)'; g.lineWidth = 2; g.beginPath();
    for (let i = 1; i < pts.length; i++) { const p = pts[i], d = dorsal(i), o = p.r * 0.05; if (i === 1) g.moveTo(X(p.x + d.nx * o), Y(p.y + d.ny * o)); else g.lineTo(X(p.x + d.nx * o), Y(p.y + d.ny * o)); }
    g.stroke();
    for (let i = 2; i < pts.length; i += 3) { const p = pts[i], pulse = 0.5 + 0.5 * Math.sin(time * 3 - i * 0.4); g.fillStyle = rage ? 'rgba(255,120,70,' + (0.25 + 0.35 * pulse) + ')' : 'rgba(150,240,255,' + (0.2 + 0.3 * pulse) + ')'; g.beginPath(); g.arc(X(p.x), Y(p.y), 2.2, 0, 6.283); g.fill(); }
    g.globalCompositeOperation = 'source-over';
    // the dorsal crest: a crystal on every other plate, pulsing
    for (let i = pts.length - 2; i >= 2; i -= 2) {
      const p = pts[i], d = dorsal(i), gc = rage ? (i % 4 ? '#ff6a3a' : '#ffb070') : GEMS[(i / 2) % GEMS.length | 0];
      const len = 8 + p.r * 0.55 + Math.sin(time * 2 + i) * 1.2, wd = 2.5 + p.r * 0.12;
      const bx2 = p.x + d.nx * p.r * 0.8, by2 = p.y + d.ny * p.r * 0.8, tx2 = bx2 + d.nx * len - d.tx * len * 0.35, ty2 = by2 + d.ny * len - d.ty * len * 0.35;
      g.fillStyle = shade(gc, -0.45); g.beginPath(); g.moveTo(X(bx2 - d.tx * wd), Y(by2 - d.ty * wd)); g.lineTo(X(tx2), Y(ty2)); g.lineTo(X(bx2 + d.tx * wd), Y(by2 + d.ty * wd)); g.fill();
      g.fillStyle = gc; g.beginPath(); g.moveTo(X(bx2 - d.tx * wd * 0.2), Y(by2 - d.ty * wd * 0.2)); g.lineTo(X(tx2), Y(ty2)); g.lineTo(X(bx2 + d.tx * wd), Y(by2 + d.ty * wd)); g.fill();
      g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,255,255,' + (0.25 + 0.25 * Math.sin(time * 4 + i)) + ')'; g.beginPath(); g.moveTo(X(bx2), Y(by2)); g.lineTo(X(tx2), Y(ty2)); g.lineTo(X(bx2 + d.tx * wd * 0.5), Y(by2 + d.ty * wd * 0.5)); g.fill(); g.globalCompositeOperation = 'source-over';
    }
    // pectoral fins, rowing
    [2, 6].forEach((i, k) => {
      if (!pts[i + 1]) return;
      const p = pts[i], d = dorsal(i), row = Math.sin(time * 4.5 + k * 1.3) * 0.5;
      const ang = Math.atan2(-d.ny, -d.nx) + 0.6 * (k ? 1 : 1) + row, L2 = k ? 34 : 44;
      g.save(); g.translate(X(p.x - d.nx * p.r * 0.5), Y(p.y - d.ny * p.r * 0.5)); g.rotate(ang);
      g.fillStyle = rage ? 'rgba(160,60,60,0.75)' : 'rgba(40,110,130,0.8)'; g.beginPath(); g.moveTo(0, -5); g.quadraticCurveTo(L2 * 0.6, -14, L2, 2); g.quadraticCurveTo(L2 * 0.5, 6, 0, 5); g.fill();
      g.strokeStyle = 'rgba(200,250,255,0.45)'; g.lineWidth = 0.75; for (let r2 = 0; r2 < 4; r2++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(L2 * (0.6 + r2 * 0.12), -10 + r2 * 4); g.stroke(); }
      g.restore();
    });
    // --- the head ---
    drawHead(g, b, X(h.x), Y(h.y), b.ang, b.jaw, time, rage, flash);
    g.restore();
    // lights along the body
    for (let i = 0; i < pts.length; i += 3) RW.fx.light(pts[i].x, pts[i].y, rage ? 0.75 : 0.42, rage ? 0.28 : 0.6, rage ? 0.2 : 0.75);
    if (shield) drawShield(g, b, pts, ox, oy, time);
  }
  function drawHead(g, b, x, y, ang, jaw, time, rage, flash) {
    const f = Math.cos(ang) >= 0 ? 1 : -1;
    g.save(); g.translate(x, y); g.rotate(ang); if (f < 0) g.scale(1, -1);
    const top = rage ? '#3a1820' : '#16343f', mid = rage ? '#5c2430' : '#25596a', bel = rage ? '#a87060' : '#8fc4bc';
    const ja = jaw * 0.9;
    // lower jaw (drawn first, it hangs under)
    g.save(); g.translate(-6, 6); g.rotate(ja);
    g.fillStyle = '#05070c'; g.beginPath(); g.moveTo(-14, -6); g.lineTo(52, 0); g.lineTo(48, 7); g.lineTo(-12, 14); g.closePath(); g.fill();
    g.fillStyle = bel; g.beginPath(); g.moveTo(-12, -4); g.lineTo(50, 1); g.lineTo(46, 6); g.lineTo(-10, 12); g.closePath(); g.fill();
    g.fillStyle = '#f4efe2'; for (let k = 0; k < 7; k++) { const tx = 4 + k * 6.5; g.beginPath(); g.moveTo(tx, -1 - k * 0.05); g.lineTo(tx + 2.4, -7 + (k % 2)); g.lineTo(tx + 4.2, -0.6); g.fill(); }
    g.restore();
    // the mouth's glow
    if (jaw > 0.15) { g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(18, 6, 2, 18, 6, 30); gl.addColorStop(0, rage ? 'rgba(255,90,40,0.9)' : b.state === 'beam' ? 'rgba(255,255,255,0.95)' : 'rgba(190,120,255,0.8)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.beginPath(); g.arc(18, 6, 30, 0, 6.283); g.fill(); g.globalCompositeOperation = 'source-over'; }
    // skull and upper jaw
    g.fillStyle = '#05070c'; g.beginPath(); g.moveTo(-34, -8); g.quadraticCurveTo(-20, -34, 14, -24); g.lineTo(58, -6); g.lineTo(60, 2); g.lineTo(10, 6); g.quadraticCurveTo(-24, 18, -36, 8); g.closePath(); g.fill();
    const gr = g.createLinearGradient(0, -30, 0, 8); gr.addColorStop(0, shade(top, -0.2)); gr.addColorStop(0.55, mid); gr.addColorStop(1, bel);
    g.fillStyle = gr; g.beginPath(); g.moveTo(-32, -8); g.quadraticCurveTo(-19, -31, 14, -22); g.lineTo(56, -5); g.lineTo(57, 1); g.lineTo(10, 4); g.quadraticCurveTo(-22, 15, -33, 6); g.closePath(); g.fill();
    // upper teeth
    g.fillStyle = '#f4efe2'; for (let k = 0; k < 8; k++) { const tx = 10 + k * 5.6; g.beginPath(); g.moveTo(tx, 2.2 - k * 0.3); g.lineTo(tx + 2, 8.5 - (k % 2) * 1.5); g.lineTo(tx + 3.8, 1.8 - k * 0.3); g.fill(); }
    // armoured brow plates and snout ridges
    g.strokeStyle = 'rgba(4,10,16,0.6)'; g.lineWidth = 1.2;
    [[-20, -20, 4, -21], [4, -21, 26, -15], [26, -15, 48, -7]].forEach(([a1, b1, a2, b2]) => { g.beginPath(); g.moveTo(a1, b1); g.quadraticCurveTo((a1 + a2) / 2, b1 - 5, a2, b2); g.stroke(); });
    g.strokeStyle = 'rgba(200,250,240,0.25)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-26, -14); g.quadraticCurveTo(10, -26, 52, -4); g.stroke();
    // nostril and gill frills
    g.fillStyle = '#05070c'; g.beginPath(); g.ellipse(48, -5, 2, 1, 0.3, 0, 6.283); g.fill();
    for (let k = 0; k < 4; k++) { const fl = Math.sin(time * 6 + k) * 2; g.fillStyle = rage ? 'rgba(255,120,90,0.6)' : 'rgba(110,220,230,0.55)'; g.beginPath(); g.moveTo(-28 + k * 3, -2 + k * 2); g.quadraticCurveTo(-44 - k * 2, -6 + k * 5 + fl, -40 - k * 3, 6 + k * 4 + fl); g.lineTo(-27 + k * 3, 4 + k * 2); g.fill(); }
    // swept crystal horns
    [[-14, -24, -58, -44, '#c8a6ff'], [-4, -24, -42, -52, '#7fe3ff']].forEach(([x0, y0, x1, y1, c], k) => {
      const cc = rage ? (k ? '#ff9a5a' : '#ff5a3a') : c;
      g.fillStyle = shade(cc, -0.45); g.beginPath(); g.moveTo(x0 - 4, y0 + 2); g.lineTo(x1, y1); g.lineTo(x0 + 6, y0 + 1); g.fill();
      g.fillStyle = cc; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x0 + 6, y0 + 1); g.fill();
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x0 + 2, y0); g.lineTo(x1, y1); g.stroke(); g.globalCompositeOperation = 'source-over';
    });
    // the eye: a burning slit
    const eyeCol = rage ? '#ff2a2a' : (b.state === 'charge' || b.state === 'frenzy') && !b.did ? '#ffffff' : '#f2e27a';
    g.globalCompositeOperation = 'lighter'; const eg = g.createRadialGradient(14, -13, 0, 14, -13, 12); eg.addColorStop(0, rage ? 'rgba(255,60,40,0.9)' : 'rgba(255,240,150,0.7)'); eg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = eg; g.beginPath(); g.arc(14, -13, 12, 0, 6.283); g.fill(); g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#05070c'; g.beginPath(); g.ellipse(14, -13, 6, 3.6, -0.18, 0, 6.283); g.fill();
    g.fillStyle = eyeCol; g.beginPath(); g.ellipse(14, -13, 5, 2.8, -0.18, 0, 6.283); g.fill();
    g.fillStyle = '#05070c'; g.beginPath(); g.ellipse(15, -13, 1, 2.6, 0, 0, 6.283); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(11.5, -14.5, 1.2, 1.2);
    if (flash) { g.globalAlpha = 0.6 * flash; g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-32, -8); g.quadraticCurveTo(-19, -31, 14, -22); g.lineTo(56, -5); g.lineTo(57, 1); g.lineTo(10, 4); g.quadraticCurveTo(-22, 15, -33, 6); g.fill(); g.globalAlpha = 1; }
    g.restore();
  }
  function drawShield(g, b, pts, ox, oy, time) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < pts.length; i += 2) { const p = pts[i], r = (i ? p.r : 36) + 7 + Math.sin(time * 3 + i) * 1.5; g.strokeStyle = 'rgba(160,230,255,' + (0.18 + 0.12 * Math.sin(time * 4 - i * 0.6)) + ')'; g.lineWidth = 1.5; g.beginPath(); for (let k = 0; k <= 6; k++) { const a = k / 6 * 6.283 + time * 0.6; const xx = p.x + ox + Math.cos(a) * r, yy = p.y + oy + Math.sin(a) * r; if (k) g.lineTo(xx, yy); else g.moveTo(xx, yy); } g.stroke(); }
    // tethers to the guardians
    const h = head(b);
    E.enemies.forEach((e) => { if (e.sp !== GUARD || e.dead) return; const ex = e.x + e.w / 2, ey = e.y + e.h / 2; g.strokeStyle = 'rgba(' + (e.gem === 0 ? '255,120,130' : e.gem === 1 ? '120,190,255' : e.gem === 2 ? '120,240,160' : '200,150,255') + ',' + (0.3 + 0.2 * Math.sin(time * 8 + ex)) + ')'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(ex + ox, ey + oy); const mx = (ex + h.x) / 2 + Math.sin(time * 3) * 20, my = (ey + h.y) / 2 - 30; g.quadraticCurveTo(mx + ox, my + oy, h.x + ox, h.y + oy); g.stroke(); });
    g.restore();
  }
  function drawFx(g, b, ox, oy, time, under) {
    (b.fx || []).forEach((f) => {
      if (f.type === 'v3vortex' && under) {
        const k = (f.ax || 100) / 100; g.save(); g.translate(f.x + ox, f.y + oy); g.globalCompositeOperation = 'lighter';
        for (let arm = 0; arm < 5; arm++) { g.strokeStyle = 'rgba(170,230,255,' + 0.35 * k + ')'; g.lineWidth = 1.5; g.beginPath(); for (let s = 0; s < 40; s++) { const r = s * 5 * k, a = arm * 1.2566 + s * 0.22 - time * 4; const xx = Math.cos(a) * r, yy = Math.sin(a) * r * 0.8; if (s) g.lineTo(xx, yy); else g.moveTo(xx, yy); } g.stroke(); }
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, 60); gr.addColorStop(0, 'rgba(20,10,40,0.0)'); gr.addColorStop(0.3, 'rgba(120,200,255,' + 0.25 * k + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 60, 0, 6.283); g.fill();
        g.restore();
        if (Math.random() < 0.6) RW.fx.spawn({ x: f.x + RW.rand(-160, 160), y: f.y + RW.rand(-120, 120), vx: 0, vy: 0, life: 0.9, color: '#e8faff', kind: 'bubble', add: true });
      }
      if (f.type === 'v3coil' && under) { g.save(); g.setLineDash([6, 5]); g.lineDashOffset = -time * 30; g.strokeStyle = f.warn === 2 ? 'rgba(255,80,80,0.9)' : 'rgba(255,200,120,' + (0.35 + 0.25 * Math.sin(time * 10)) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(f.x + ox, f.y + oy, Math.max(20, (f.ax || 100) - 20), 0, 6.283); g.stroke(); g.restore(); }
      if (f.type === 'v3beam' && !under) {
        g.save();
        if (f.warn) { g.strokeStyle = 'rgba(255,255,255,' + (0.3 + 0.3 * Math.sin(time * 30)) + ')'; g.lineWidth = 1; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(f.ax + ox, f.ay + oy); g.lineTo(f.bx + ox, f.by + oy); g.stroke(); }
        else {
          g.globalCompositeOperation = 'lighter';
          const cols = ['rgba(255,80,110,0.35)', 'rgba(255,200,80,0.35)', 'rgba(110,255,160,0.35)', 'rgba(90,170,255,0.4)', 'rgba(200,120,255,0.4)'];
          const ang = Math.atan2(f.by - f.ay, f.bx - f.ax), nx = -Math.sin(ang), ny = Math.cos(ang), wob = Math.sin(time * 40) * 1.5;
          cols.forEach((c, i) => { const o = (i - 2) * 3 + wob * (i % 2 ? 1 : -1); g.strokeStyle = c; g.lineWidth = 8; g.beginPath(); g.moveTo(f.ax + ox + nx * o, f.ay + oy + ny * o); g.lineTo(f.bx + ox + nx * o, f.by + oy + ny * o); g.stroke(); });
          g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 5; g.beginPath(); g.moveTo(f.ax + ox, f.ay + oy); g.lineTo(f.bx + ox, f.by + oy); g.stroke();
          for (let s = 0; s < 6; s++) { const u = Math.random(); RW.fx.spawn({ x: f.ax + (f.bx - f.ax) * u, y: f.ay + (f.by - f.ay) * u, vx: RW.rand(-30, 30), vy: RW.rand(-30, 30), life: 0.3, color: RW.pick(['#ffffff', '#ff9ad0', '#9ad8ff', '#ffe08a']), add: true, kind: 'glow' }); }
          for (let s = 0; s < 8; s++) RW.fx.light(f.ax + (f.bx - f.ax) * s / 8, f.ay + (f.by - f.ay) * s / 8, 0.6, 0.55, 0.7);
        }
        g.restore();
      }
      if (f.type === 'v3roar' && !under) { const u = (f.t * 1.4) % 1; g.save(); g.strokeStyle = 'rgba(220,240,255,' + (1 - u) * 0.6 + ')'; g.lineWidth = 3; g.beginPath(); g.arc(f.x + ox, f.y + oy, 30 + u * 220, 0, 6.283); g.stroke(); g.restore(); }
      if (f.type === 'v3slam' && !under) { const u = Math.min(1, f.t * 1.6); g.save(); g.strokeStyle = 'rgba(190,234,255,' + (1 - u) * 0.8 + ')'; g.lineWidth = 4; g.beginPath(); g.arc(f.x + ox, f.y + oy, 10 + u * 180, 0, 6.283); g.stroke(); g.restore(); }
    });
  }
  function drawShieldText(g, b) {
    if (!(b.shield || getFx(b, 'v3shield')) || b.dead) return;
    const n = guardsLeft(), v = RW.view; g.save(); g.font = '10px VT323, monospace'; g.textAlign = 'center';
    const s = 'SHIELDED · break the Crystal Guardians' + (n ? ' (' + n + ' left)' : '');
    g.fillStyle = '#0c0a10'; g.fillText(s, v.w / 2 + 1, 75); g.fillStyle = '#c8f0ff'; g.fillText(s, v.w / 2, 74); g.restore();
  }
  // a Crystal Guardian: a faceted gem golem with an eye of light, crystal fists orbiting it
  function drawGuardian(g, x, y, e, time) {
    const gc = GEMS[e.gem || 0], dk = shade(gc, -0.55), lt = shade(gc, 0.45), bob = Math.sin((e.t || 0) * 2.4) * 1.5, f = e.face || 1;
    const hit = e.hitT > 0; g.save(); g.translate(x, y + bob);
    if (e.dead) g.globalAlpha = 0.4;
    // orbiting fists
    const pu = e.punch > 0 ? 1 - e.punch / 0.3 : 0;
    [0, 1].forEach((k) => { const a = (e.t || 0) * 2 + k * Math.PI; const r = 14 + (k === 0 ? Math.sin(pu * Math.PI) * 10 : 0); const fx2 = Math.cos(a) * r * (k === 0 && pu ? f : 1), fy2 = Math.sin(a) * 6 + 2; if (Math.sin(a) < 0) return; g.fillStyle = dk; g.beginPath(); g.moveTo(fx2, fy2 - 5); g.lineTo(fx2 + 4, fy2); g.lineTo(fx2, fy2 + 5); g.lineTo(fx2 - 4, fy2); g.fill(); g.fillStyle = gc; g.beginPath(); g.moveTo(fx2, fy2 - 4); g.lineTo(fx2 + 3, fy2); g.lineTo(fx2, fy2 + 3); g.fill(); });
    // body facets
    const body = [[0, -17], [9, -9], [11, 4], [5, 16], [-5, 16], [-11, 4], [-9, -9]];
    g.fillStyle = '#05070c'; g.beginPath(); body.forEach(([a, b2], i) => { const xx = a * 1.12, yy = b2 * 1.08; if (i) g.lineTo(xx, yy); else g.moveTo(xx, yy); }); g.fill();
    for (let i = 0; i < body.length; i++) { const p1 = body[i], p2 = body[(i + 1) % body.length]; g.fillStyle = i % 3 === 0 ? lt : i % 3 === 1 ? gc : shade(gc, -0.25); g.beginPath(); g.moveTo(0, 0); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.6; body.forEach(([a, b2]) => { g.beginPath(); g.moveTo(0, 0); g.lineTo(a, b2); g.stroke(); });
    // the eye
    g.globalCompositeOperation = 'lighter'; const eg = g.createRadialGradient(f * 2, -5, 0, f * 2, -5, 8); eg.addColorStop(0, 'rgba(255,255,255,0.95)'); eg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = eg; g.beginPath(); g.arc(f * 2, -5, 8, 0, 6.283); g.fill(); g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(f * 2, -5, 2.6, 1.6, 0, 0, 6.283); g.fill(); g.fillStyle = '#05070c'; g.fillRect(f * 2 + f * 0.6 - 0.5, -6, 1, 2);
    [0, 1].forEach((k) => { const a = (e.t || 0) * 2 + k * Math.PI; const r = 14 + (k === 0 ? Math.sin(pu * Math.PI) * 10 : 0); const fx2 = Math.cos(a) * r * (k === 0 && pu ? f : 1), fy2 = Math.sin(a) * 6 + 2; if (Math.sin(a) >= 0) return; g.fillStyle = dk; g.beginPath(); g.moveTo(fx2, fy2 - 5); g.lineTo(fx2 + 4, fy2); g.lineTo(fx2, fy2 + 5); g.lineTo(fx2 - 4, fy2); g.fill(); g.fillStyle = gc; g.beginPath(); g.moveTo(fx2, fy2 - 4); g.lineTo(fx2 + 3, fy2); g.lineTo(fx2, fy2 + 3); g.fill(); });
    if (hit) { g.globalAlpha = 0.6; g.fillStyle = '#ffffff'; g.beginPath(); body.forEach(([a, b2], i) => { if (i) g.lineTo(a, b2); else g.moveTo(a, b2); }); g.fill(); }
    g.restore();
    if (e.showBar > 0 && e.hp < e.maxhp) { g.fillStyle = '#0c0a10'; g.fillRect(x - 12, y - 26, 24, 3); g.fillStyle = gc; g.fillRect(x - 12, y - 26, 24 * Math.max(0, e.hp / e.maxhp), 3); }
  }

  // field guide pictures, drawn from the same code
  const D = A.drawers || (A.drawers = {});
  D.v3guardian = function () { return [0, 1].map((k) => { const c = document.createElement('canvas'); c.width = 34; c.height = 40; const g = c.getContext('2d'); drawGuardian(g, 17, 21, { t: k * 0.6, face: 1, gem: 1 }, 0); return c; }); };
  D.v3leviathan = function () {
    const c = document.createElement('canvas'); c.width = 180; c.height = 70; const g = c.getContext('2d');
    const b = { x: 140, y: 6, w: 68, h: 68, ang: 0.15, segs: [], phase: 1, state: 'roar', jaw: 0.5, t: 0 };
    for (let i = 0; i < NSEG; i++) b.segs.push({ x: 170 - (i + 1) * 4.6, y: 40 + Math.sin(i * 0.45) * 8 });
    g.save(); g.scale(0.24, 0.24); g.translate(-30, 40); try { drawLev(g, Object.assign(b, { x: 140 / 0.24 - 400, y: 30, segs: b.segs.map((s, i) => ({ x: 560 - (i + 1) * 20, y: 150 + Math.sin(i * 0.4) * 30 })) }), 0, 0, 1.2); } catch (e) { /* picture only */ } g.restore();
    return [c];
  };
  if (sp) { sp.art = { draw: 'v3leviathan' }; if (A._spCache) delete A._spCache[LEV]; }
  RW.v3lev = { drawLev, drawGuardian, drawFx, initBoss, NSEG, GAP };
})(window.RW);
