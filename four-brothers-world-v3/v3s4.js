// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 4: the Gemscale Leviathan, remade.
//  * A massive sea serpent, about 140 blocks long, that coils through the flooded Heart Chamber. Its body is armoured
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
  const LEV = 'gemscale_leviathan';
  const BASE_HP = 40000, NSEG = 100, GAP = 22;
  // McKay: three times bigger, chunky pixels. The body is simulated at full size (GAPW apart, K times the radii);
  // it is drawn at the old size inside a frame scaled by K, onto a layer of PX-unit pixels.
  const K = 3, KS = 2, GAPW = GAP * K, PX = 1.5;
  const GEMS = ['#e0525a', '#4fa8f0', '#5fd98a', '#a86ef0', '#f2c94c', '#7fe3ff'];
  const now = () => performance.now() / 1000;
  const inRock = () => WD.def && WD.def.id === 'rock';
  const segR = (i) => 34 - 24 * Math.pow(i / NSEG, 1.3); // 34 at the neck, 10 at the tail

  // ================================= species =================================
  const sp = RW.SPECIES[LEV];
  if (sp) Object.assign(sp, { w: 68 * K, h: 68 * K, hp: BASE_HP, dmg: 26, speed: 200, blurb: 'A serpent as long as a town, armoured in gem-studded plates. It guards the Elder Crystals in the flooded Heart Chamber. Twice it hides behind a crystal shield and sends out its guardians: break them all to reach it again.' });
  const GCLASS = {
    v3g_ruby: { gem: 0, cls: 'knight', name: 'Ruby Knight', blurb: 'A crystal knight with a kite shield and a burning blade. Slashes up close, charges behind its shield and sends a wave of crystal flame along the ground.' },
    v3g_sapphire: { gem: 1, cls: 'archer', name: 'Sapphire Archer', blurb: 'A hooded crystal archer. Keeps its distance, looses arrows, rains a volley from above and fires a piercing frost arrow that slows you.' },
    v3g_emerald: { gem: 2, cls: 'healer', name: 'Emerald Healer', blurb: 'A haloed crystal healer. It never attacks, and it cannot heal the Leviathan, but it mends the other guardians and wards them. It hides at the back: get to it first.' },
    v3g_amethyst: { gem: 3, cls: 'mage', name: 'Amethyst Mage', blurb: 'A crystal mage with a floating staff. Throws arcane bolts, calls chain lightning, blinks beside you and bursts into a ring of orbs.' },
  };
  const isGuard = (e) => !!(e && GCLASS[e.sp]);
  Object.keys(GCLASS).forEach((id) => RW.register.species({ id, type: 'monsters', name: GCLASS[id].name, world: 'rock', role: 'enemy', status: 'active', art: { draw: 'v3guardian_' + GCLASS[id].cls },
    w: 22, h: 32, hp: 400, dmg: 16, speed: GCLASS[id].cls === 'knight' ? 95 : 80, behavior: 'v3guardian', drops: [['crystal_dust', 0.8, 1, 3], ['leviathan_scale', 0.4, 1, 2]], blurb: GCLASS[id].blurb }));

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
    b.v3 = true; b.customDraw = true; b.w = 68 * K; b.h = 68 * K; b.engaged = true;
    b.ang = -Math.PI / 2; const hx = a.cx + (Math.random() - 0.5) * a.rx * 0.6, hy = a.cy + a.ry + 60 * K;
    b.x = hx - b.w / 2; b.y = hy - b.h / 2;
    b.segs = []; for (let i = 0; i < NSEG; i++) b.segs.push({ x: hx, y: hy + GAPW * (i + 1) });
    b.faces = []; b.state = 'emerge'; b.st = 2.6; b.phase = 1; b.stage = 1; b.shield = 0; b.shieldsDone = 0; b.fx = [];
    b.nFight = 1; b.maxhp = b.hp = BASE_HP; b.scaleT = 0;
    b.hitbox = () => segHitbox(b);
    refill();
  }
  function segHitbox(b) {
    const pc = { x: P.x + 6, y: P.y + 14 }, h = head(b); let best = h, r = 32 * K, bd = Math.hypot(pc.x - h.x, pc.y - h.y);
    (b.segs || []).forEach((s, i) => { const d = Math.hypot(pc.x - s.x, pc.y - s.y); if (d < bd) { bd = d; best = s; r = segR(i) * K + 2; } });
    return { x: best.x - r, y: best.y - r, w: r * 2, h: r * 2 };
  }
  function follow(b) { let x0 = b.x + b.w / 2, y0 = b.y + b.h / 2; for (const s of b.segs) { const dx = s.x - x0, dy = s.y - y0, d = Math.hypot(dx, dy) || 1; s.x = x0 + dx / d * GAPW; s.y = y0 + dy / d * GAPW; x0 = s.x; y0 = s.y; } }
  function steer(b, dt, tx, ty, speed, turn) {
    speed *= KS; const h = head(b); const want = Math.atan2(ty - h.y, tx - h.x); let da = want - b.ang;
    while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    b.ang += RW.clamp(da, -turn * dt, turn * dt);
    let nx = h.x + Math.cos(b.ang) * speed * dt, ny = h.y + Math.sin(b.ang) * speed * dt;
    if (b.state !== 'emerge' && b.state !== 'dying') { const q = clampArena(nx, ny, 34 * K); if (q.x !== nx || q.y !== ny) { nx = RW.lerp(nx, q.x, 0.5); ny = RW.lerp(ny, q.y, 0.5); } }
    b.vx = (nx - h.x) / Math.max(dt, 1e-4); b.vy = (ny - h.y) / Math.max(dt, 1e-4);
    b.x = nx - b.w / 2; b.y = ny - b.h / 2; b.face = Math.cos(b.ang) >= 0 ? 1 : -1;
    follow(b);
  }
  const fast = (b) => (b.phase === 3 ? 1.35 : b.stage === 3 ? 1.25 : b.phase === 2 ? 1.15 : 1);
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
  function mouth(b) { const h = head(b); return { x: h.x + Math.cos(b.ang) * 40 * K, y: h.y + Math.sin(b.ang) * 40 * K }; }
  function roar(b, txt) {
    clearMoves(b); b.state = 'roar'; b.st = 0; fx(b, 'v3roar', { x: Math.round(head(b).x), y: Math.round(head(b).y) });
    RW.audio.sfx('roar'); RW.fx.shake(9, 1.1); if (txt) U.toast(txt);
  }
  function startShield(b, n) {
    b.shield = n; roar(b, b.shieldsDone === 0 ? 'The Leviathan raises a crystal shield! Break its four Crystal Guardians to bring it down.' : 'The shield is back, and its guardians are stronger. Break all four!');
    fx(b, 'v3shield', { x: 1 });
    const hp = Math.round(400 * (1 + 0.25 * Math.max(0, b.nFight - 1)) * (b.shieldsDone ? 1.3 : 1));
    ['v3g_ruby', 'v3g_sapphire', 'v3g_amethyst', 'v3g_emerald'].forEach((id, k) => {
      const fs = fighters(), who = fs.length ? fs[k % fs.length] : { x: head(b).x, y: head(b).y };
      const ang = (k / 4) * Math.PI * 2 + Math.random() * 0.4, back = id === 'v3g_emerald' ? 380 : 240;
      const p = clampArena(who.x + Math.cos(ang) * back, who.y + Math.sin(ang) * back * 0.6, 40);
      const e = E.spawnEnemy(id, p.x - 14, p.y - 27); e.hp = e.maxhp = hp; e.provoked = true;
      RW.fx.burst(p.x, p.y, [GEMS[GCLASS[id].gem], '#ffffff'], 24, 140, { add: true, kind: 'glow', life: 0.8 });
    });
  }
  const guardsLeft = () => E.enemies.filter((e) => isGuard(e) && !e.dead).length;

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
    if (!b.shield && b.shieldsDone === 0 && frac <= 0.75) startShield(b, 4);
    else if (!b.shield && b.shieldsDone === 1 && b.stage === 2 && frac <= 0.5) { // stage 3: it tears off its dark plates down to the bone
      b.stage = 3; fx(b, 'v3stage', { x: 3 }); roar(b, 'The Leviathan tears off its plates. Bone and black underneath, and its eyes burn cold.'); RW.fx.flash('#3ae0d0', 0.25);
    }
    else if (!b.shield && b.shieldsDone === 1 && frac <= 0.25) startShield(b, 4);
    if (b.shield && b.state !== 'roar' && guardsLeft() === 0) {
      b.shield = 0; b.shieldsDone++; fx(b, 'v3shield', null);
      b.phase = b.shieldsDone === 1 ? 2 : 3; b.stage = b.shieldsDone === 1 ? 2 : 4; fx(b, 'v3stage', { x: b.stage });
      roar(b, b.phase === 2 ? 'The shield shatters! The Leviathan\'s plates turn black as the abyss.' : 'The shield shatters, and the Leviathan goes mad with rage! Fire splits its plates.');
      RW.fx.flash(b.phase === 3 ? '#ff2a3a' : '#c8a6ff', 0.3);
      if (b.phase === 3) fx(b, 'v3rage', { x: 1 });
    }
    if (Math.random() < dt * 14) { const s = RW.pick(b.segs); RW.fx.spawn({ x: s.x + RW.rand(-8, 8), y: s.y + RW.rand(-8, 8), vy: -14, life: 0.7, color: b.phase === 3 ? RW.pick(['#ff5a3a', '#ffb070']) : RW.pick(GEMS), add: true, kind: 'glow' }); }

    switch (b.state) {
      case 'emerge':
        steer(b, dt, h.x, a.cy - 20 * K, 150, 1.2);
        if (b.st > 1.2 && !b.did) { b.did = 1; fx(b, 'v3roar', { x: Math.round(h.x), y: Math.round(h.y) }); RW.audio.sfx('roar'); RW.fx.shake(8, 1.2); }
        if (b.st > 2.6) { b.state = 'cruise'; b.st = 0; b.dur = 1.6; }
        break;
      case 'roar':
        steer(b, dt, h.x + Math.cos(b.ang) * 30 * K, h.y - 30 * K, 40, 2);
        if (b.st > 1.6) { fx(b, 'v3roar', null); b.state = 'cruise'; b.st = 0; b.dur = 1; }
        break;
      case 'cruise': {
        b.oa = (b.oa || 0) + dt * 0.9 * F;
        const R = (b.shield ? 360 : 240) * K;
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
        steer(b, dt, tg.x + (h.x < tg.x ? -260 : 260) * K, tg.y - 40 * K, 120, 2.5);
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
          fx(b, 'v3beam', { ax: Math.round(m.x), ay: Math.round(m.y), bx: Math.round(m.x + Math.cos(b.aim) * 1100 * K), by: Math.round(m.y + Math.sin(b.aim) * 1100 * K), warn: 1 });
          if (!b.k) { b.k = 1; RW.audio.sfx('crystal'); }
        } else if (b.st < charge + fire * sweeps) {
          const u = ((b.st - charge) % fire) / fire, sw = Math.floor((b.st - charge) / fire) % 2 ? -1 : 1;
          const ang = b.aim + b.sweepDir * sw * (u - 0.5) * 1.15;
          b.ang = ang; steer(b, dt, h.x - Math.cos(ang) * 10, h.y - Math.sin(ang) * 10, 10, 0); b.ang = ang;
          fx(b, 'v3beam', { ax: Math.round(m.x), ay: Math.round(m.y), bx: Math.round(m.x + Math.cos(ang) * 1100 * K), by: Math.round(m.y + Math.sin(ang) * 1100 * K), warn: 0 });
          if (b.k === 1) { b.k = 2; RW.audio.sfx('lightning'); RW.fx.shake(4, fire * sweeps); }
        } else { fx(b, 'v3beam', null); b.state = 'cruise'; b.st = 0; b.dur = 1.2; }
        break;
      }
      case 'whirl': {
        if (!b.did) { b.did = 1; const p = clampArena(tg.x, tg.y, 90 * K); b.vx0 = p.x; b.vy0 = p.y; b.oa = Math.atan2(h.y - p.y, h.x - p.x); }
        const dur = 4.6;
        if (b.st < dur) {
          b.oa += dt * 2.2 * F; steer(b, dt, b.vx0 + Math.cos(b.oa) * 140 * K, b.vy0 + Math.sin(b.oa) * 110 * K, 320 * F, 4);
          fx(b, 'v3vortex', { x: Math.round(b.vx0), y: Math.round(b.vy0), ax: Math.round(Math.min(1, b.st / 0.8) * 100) });
        } else if (b.st < dur + 0.9) { fx(b, 'v3vortex', null); steer(b, dt, b.vx0, b.vy0, 600 * F, 2.5); }
        else { b.state = 'cruise'; b.st = 0; b.dur = 1.4; }
        break;
      }
      case 'coil': {
        if (!b.did) { b.did = 1; b.vx0 = tg.x; b.vy0 = tg.y; b.oa = Math.atan2(h.y - tg.y, h.x - tg.x); }
        const dur = 3.4 / F, r = RW.lerp(280, 84, Math.min(1, b.st / dur)) * K;
        if (b.st < dur) {
          b.oa += dt * (440 * F * KS) / r; steer(b, dt, b.vx0 + Math.cos(b.oa) * r, b.vy0 + Math.sin(b.oa) * r, 440 * F, 7);
          fx(b, 'v3coil', { x: Math.round(b.vx0), y: Math.round(b.vy0), ax: Math.round(r) });
        } else if (!b.k) { b.k = 1; fx(b, 'v3coil', { x: Math.round(b.vx0), y: Math.round(b.vy0), ax: 60 * K, warn: 2 }); RW.fx.shake(10, 0.5); RW.audio.sfx('slam'); }
        else if (b.st > dur + 0.5) { fx(b, 'v3coil', null); b.state = 'cruise'; b.st = 0; b.dur = 1.6; }
        else { b.oa += dt * 3; steer(b, dt, b.vx0 + Math.cos(b.oa) * 84 * K, b.vy0 + Math.sin(b.oa) * 84 * K, 300, 7); }
        break;
      }
      case 'collapse': {
        const roofY = a.cy - a.ry + 30 * K;
        if (!b.did) { steer(b, dt, tg.x, roofY, 520 * F, 3); if (h.y < roofY + 30 * K || b.st > 1.8) { b.did = 1; b.st = 0; RW.fx.shake(12, 0.9); RW.audio.sfx('slam'); RW.fx.ring(h.x, h.y - 20, '#c8b898', 140, 0.6, 3);
          const spikes = (WD.meta.roofSpikes || []).filter((s) => Math.abs(s.x * TS - tg.x) < 26 * TS);
          const n = Math.min(spikes.length, b.phase === 3 ? 16 : b.phase === 2 ? 12 : 9);
          spikes.sort(() => Math.random() - 0.5).slice(0, n).forEach((s, i) => E.shots.push({ x: s.x * TS + 8 + RW.rand(-6, 6), y: s.y * TS + 4, vx: 0, vy: 40, life: 5, owner: 'e', dmg: 22, kind: 'rain', grav: 520, warn: 0.7 + i * 0.06, color: RW.pick(['#c8a6ff', '#7fe3ff', '#e8e0ff']) }));
          for (let k = 0; k < 6; k++) E.shots.push({ x: tg.x + RW.rand(-180, 180), y: roofY - 20, vx: 0, vy: 40, life: 5, owner: 'e', dmg: 18, kind: 'rain', grav: 520, warn: 0.9 + k * 0.1, color: '#c8b898' });
        } }
        else { steer(b, dt, h.x + Math.cos(b.ang) * 40 * K, h.y + 60 * K, 160, 2); if (b.st > 1.3) { b.state = 'cruise'; b.st = 0; b.dur = 1.5; } }
        break;
      }
      case 'tail': {
        steer(b, dt, tg.x + (h.x < tg.x ? -200 : 200) * K, tg.y + 60 * K, 260 * F, 3);
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
        steer(b, dt, tg.x, tg.y - 120 * K, 150, 2);
        if (!b.did) { b.did = 1; for (let k = 0; k < 3 + b.phase; k++) { const e = E.spawnEnemy(k % 2 ? 'spiky_fish' : 'creepy_fish', h.x + RW.rand(-80, 80) * K, h.y + RW.rand(-40, 40) * K); RW.fx.burst(e.x, e.y, '#a86ef0', 12, 80, { add: true, kind: 'glow' }); } RW.audio.sfx('roar'); }
        if (b.st > 1.2) { b.state = 'cruise'; b.st = 0; b.dur = 2; }
        break;
      default: b.state = 'cruise'; b.st = 0;
    }
    b.frame = Math.floor(b.t * 6) % 2;
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
      if (Math.hypot(pc.x - qx, pc.y - qy) < 15 * K) { beamCd = 0.3; P.hurt(b.phase === 3 ? 18 : 14, Math.sign(pc.x - qx) || 1, 'beam'); RW.fx.burst(pc.x, pc.y, ['#ffffff', '#ff9ad0', '#9ad8ff'], 6, 80, { add: true, kind: 'glow' }); }
    }
    const vt = getFx(b, 'v3vortex');
    if (vt) {
      const dx = vt.x - pc.x, dy = vt.y - pc.y, d = Math.hypot(dx, dy) || 1, k = (vt.ax || 100) / 100;
      if (d < 420 * K) { const pull = Math.min(300, 52000 * K / (d + 60 * K)) * k; P.vx += (dx / d) * pull * dt * 2.2 + (-dy / d) * pull * dt * 1.2; P.vy += (dy / d) * pull * dt * 2.2 + (dx / d) * pull * dt * 1.2; }
      if (d < 34 * K && vortCd <= 0) { vortCd = 0.45; P.hurt(11, 1, 'whirlpool'); }
    }
    const co = getFx(b, 'v3coil');
    if (co && co.warn === 2 && !crushDone.has(co)) { crushDone.add(co); if (Math.hypot(pc.x - co.x, pc.y - co.y) < 110 * K) { P.hurt(b.phase === 3 ? 55 : 42, Math.sign(pc.x - co.x) || 1, 'coil'); P.vy = -260; } }
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
    if (!b.segs) { b.segs = []; for (let i = 0; i < NSEG; i++) b.segs.push({ x: h.x, y: h.y + GAPW * (i + 1) }); b.ang = -Math.PI / 2; }
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
    if (isGuard(e) && e.ward > 0) { if (!e._wT || now() - e._wT > 0.4) { e._wT = now(); RW.fx.text(e.x + 11, e.y - 6, 'Warded', '#c8ffd8'); RW.audio.sfx('crystal'); } return; }
    if (e && e.sp === LEV && inRock() && (e.shield || getFx(e, 'v3shield'))) {
      if (!e._shT || now() - e._shT > 0.4) { e._shT = now(); const h = head(e); RW.fx.text(h.x, h.y - 40, 'Shielded', '#c8f0ff'); RW.fx.burst(h.x, h.y, ['#c8f0ff', '#ffffff'], 6, 90, { add: true, kind: 'glow', life: 0.3 }); RW.audio.sfx('crystal'); }
      return;
    }
    return baseDamage.apply(this, arguments);
  };

  // ---- guardians ----
  // ---- guardians: four classes ----
  const act = (e, k, t) => { e.act = k; e.actT = t; e.actD = t; };
  E.behaviors.v3guardian = function (e, dt, sp2) {
    const G = GCLASS[e.sp]; if (!G) return;
    const pc = P.center(), c = { x: e.x + e.w / 2, y: e.y + e.h / 2 }, d = RW.dist(pc.x, pc.y, c.x, c.y), toP = Math.atan2(pc.y - c.y, pc.x - c.x);
    e.t += dt; e.actT = Math.max(0, (e.actT || 0) - dt); if (!e.actT) e.act = null;
    e.cdA = (e.cdA == null ? 1 + Math.random() : e.cdA) - dt; e.cd1 = (e.cd1 == null ? 3 + Math.random() * 2 : e.cd1) - dt; e.cd2 = (e.cd2 == null ? 5 + Math.random() * 3 : e.cd2) - dt;
    e.ward = Math.max(0, (e.ward || 0) - dt);
    let want = 0, tx = pc.x, ty = pc.y - 6, spd = sp2.speed;
    if (G.cls === 'knight') want = 20; else if (G.cls === 'archer') want = 200; else if (G.cls === 'mage') want = 150;
    if (G.cls === 'healer') { // behind the others, away from you
      const mates = E.enemies.filter((o) => isGuard(o) && o !== e && !o.dead);
      const mx = mates.length ? mates.reduce((s2, o) => s2 + o.x, 0) / mates.length : c.x, my = mates.length ? mates.reduce((s2, o) => s2 + o.y, 0) / mates.length : c.y;
      const ax = mx - pc.x, ay = my - pc.y, L = Math.hypot(ax, ay) || 1;
      tx = mx + ax / L * 140; ty = my + ay / L * 80; if (d < 150) { tx = c.x - Math.cos(toP) * 200; ty = c.y - Math.sin(toP) * 120; spd *= 1.6; }
    }
    if (e.dash > 0) { e.dash -= dt; e.vx = Math.cos(e.dashA) * 380; e.vy = Math.sin(e.dashA) * 380; if (d < 26 && !e.dashHit && !P.dead) { e.dashHit = 1; P.hurt(22, Math.sign(pc.x - c.x) || 1, 'shield charge'); P.vx += Math.cos(e.dashA) * 240; P.vy -= 120; } }
    else {
      let vxT, vyT;
      if (G.cls === 'healer') { const a2 = Math.atan2(ty - c.y, tx - c.x), dd = Math.hypot(tx - c.x, ty - c.y); vxT = Math.cos(a2) * spd * Math.min(1, dd / 40); vyT = Math.sin(a2) * spd * Math.min(1, dd / 40); }
      else { const k = d > want + 20 ? 1 : d < want - 20 ? -0.7 : 0; vxT = Math.cos(toP) * spd * k + (G.cls !== 'knight' ? Math.cos(toP + 1.57) * 30 * Math.sin(e.t * 0.8) : 0); vyT = Math.sin(toP) * spd * k; }
      e.vx = RW.lerp(e.vx, vxT, dt * 2.5); e.vy = RW.lerp(e.vy, vyT + Math.sin(e.t * 2.4) * 16, dt * 2.5);
    }
    E.move(e, dt, {});
    e.face = pc.x >= c.x ? 1 : -1; e.frame = Math.floor(e.t * 4) % 2;
    const near = d < 420 && !P.dead, col = GEMS[G.gem];
    if (G.cls === 'knight') {
      if (near && d < 36 && e.cdA <= 0) { e.cdA = 1.1; act(e, 'slash', 0.35); setTimeout(() => { if (!e.dead && RW.dist(P.center().x, P.center().y, e.x + 11, e.y + 16) < 40) P.hurt(18, e.face, 'crystal blade'); }, 150); RW.audio.sfx('swing'); }
      else if (near && d > 60 && d < 240 && e.cd1 <= 0) { e.cd1 = 6.5; act(e, 'charge', 0.6); e.dash = 0.55; e.dashA = toP; e.dashHit = 0; RW.audio.sfx('roar'); }
      else if (near && d < 170 && e.cd2 <= 0) { e.cd2 = 8; act(e, 'cleave', 0.6); setTimeout(() => { if (e.dead) return; for (let k = 0; k < 7; k++) E.shots.push({ x: e.x + 11 + e.face * 10, y: e.y + 26 - k * 0.5, vx: e.face * (200 + k * 18), vy: (k - 3) * 6, life: 1.6, owner: 'e', dmg: 14, kind: 'fire', color: '#ff7a2e' }); RW.fx.shake(3, 0.2); RW.audio.sfx('fire'); }, 300); }
    } else if (G.cls === 'archer') {
      if (near && e.cd2 <= 0) { e.cd2 = 6; act(e, 'frost', 0.6); setTimeout(() => { if (e.dead) return; const a2 = Math.atan2(P.center().y - c.y, P.center().x - c.x); E.shots.push({ x: c.x, y: c.y, vx: Math.cos(a2) * 520, vy: Math.sin(a2) * 520, life: 1.8, owner: 'e', dmg: 14, kind: 'bshard', color: '#bfeaff', frost: 1 }); RW.audio.sfx('bow'); }, 450); }
      else if (near && e.cd1 <= 0) { e.cd1 = 7; act(e, 'volley', 0.7); for (let k = 0; k < 7; k++) E.shots.push({ x: pc.x + RW.rand(-90, 90), y: pc.y - 190, vx: 0, vy: 320, life: 2, owner: 'e', dmg: 10, kind: 'rain', warn: 0.6 + k * 0.08, color: '#bfe8ff' }); RW.audio.sfx('bow'); }
      else if (near && e.cdA <= 0) { e.cdA = 1.5; act(e, 'shoot', 0.4); E.shots.push({ x: c.x, y: c.y, vx: Math.cos(toP) * 340, vy: Math.sin(toP) * 340, life: 2, owner: 'e', dmg: 12, kind: 'arrow', color: '#bfe8ff' }); RW.audio.sfx('bow'); }
    } else if (G.cls === 'mage') {
      if (near && e.cd2 <= 0 && e.blink == null) { e.cd2 = 9; act(e, 'blink', 0.8); const a2 = Math.random() * 6.28; RW.fx.burst(c.x, c.y, [col, '#ffffff'], 16, 120, { add: true, kind: 'glow' }); e.x = pc.x + Math.cos(a2) * 90 - 11; e.y = pc.y + Math.sin(a2) * 60 - 16; RW.fx.burst(e.x + 11, e.y + 16, [col, '#ffffff'], 16, 120, { add: true, kind: 'glow' }); e.blink = 0.45; }
      else if (near && e.cd1 <= 0) { e.cd1 = 7; act(e, 'chain', 0.9); e.chainT = 0.6; }
      else if (near && e.cdA <= 0) { e.cdA = 1.6; act(e, 'bolt', 0.4); E.shots.push({ x: c.x, y: c.y, vx: Math.cos(toP) * 210, vy: Math.sin(toP) * 210, life: 2.6, owner: 'e', dmg: 12, kind: 'orb', color: col }); RW.audio.sfx('crystal'); }
      if (e.blink != null) { e.blink -= dt; if (e.blink <= 0) { e.blink = null; for (let k = 0; k < 10; k++) E.shots.push({ x: e.x + 11, y: e.y + 16, vx: Math.cos(k * 0.628) * 170, vy: Math.sin(k * 0.628) * 170, life: 2, owner: 'e', dmg: 10, kind: 'orb', color: col }); RW.audio.sfx('crystal'); } }
      if (e.chainT != null) { e.chainT -= dt; if (Math.random() < 0.5) RW.fx.bolt(c.x, c.y - 8, pc.x + RW.rand(-30, 30), pc.y + RW.rand(-30, 30), '#c8a6ff'); if (e.chainT <= 0) { e.chainT = null; for (let k = -1; k <= 1; k++) E.shots.push({ x: c.x, y: c.y - 8, vx: Math.cos(toP + k * 0.12) * 650, vy: Math.sin(toP + k * 0.12) * 650, life: 0.8, owner: 'e', dmg: 15, kind: 'spark', color: '#e8d8ff' }); RW.fx.bolt(c.x, c.y - 8, pc.x, pc.y, '#c8a6ff'); RW.audio.sfx('lightning'); } }
    } else if (G.cls === 'healer') {
      const mates = E.enemies.filter((o) => isGuard(o) && o !== e && !o.dead);
      if (e.cd1 <= 0 && mates.some((o) => o.hp < o.maxhp * 0.9)) { e.cd1 = 5; act(e, 'heal', 0.8); mates.forEach((o) => { if (RW.dist(o.x, o.y, e.x, e.y) < 340) { const h = Math.round(o.maxhp * 0.22); o.hp = Math.min(o.maxhp, o.hp + h); RW.fx.text(o.x + 11, o.y - 4, '+' + h, '#8dff8a'); RW.fx.burst(o.x + 11, o.y + 16, ['#8dff8a', '#e8ffe0'], 10, 60, { add: true, kind: 'glow' }); } }); RW.fx.ring(c.x, c.y, '#8dff8a', 340, 0.7, 2); RW.audio.sfx('crystal'); }
      else if (e.cd2 <= 0 && mates.length) { e.cd2 = 9; act(e, 'ward', 0.8); const o = mates.slice().sort((a2, b2) => a2.hp / a2.maxhp - b2.hp / b2.maxhp)[0]; o.ward = 4; RW.fx.burst(o.x + 11, o.y + 16, ['#c8ffd8', '#ffffff'], 14, 90, { add: true, kind: 'glow' }); RW.audio.sfx('crystal'); }
    }
    RW.fx.light(c.x, c.y, G.gem === 0 ? 0.5 : 0.25, G.gem === 2 ? 0.5 : 0.3, G.gem === 1 || G.gem === 3 ? 0.55 : 0.25);
  };
  // frost arrows slow you; wards stop hits
  P.v3slowT = 0;
  const baseShots = E.updateShots;
  E.updateShots = function (dt) {
    P.v3slowT = Math.max(0, P.v3slowT - dt);
    if (!P.dead) E.shots.forEach((s) => { if (s.frost && s.owner === 'e' && !(s.warn > 0) && Math.abs(s.x - (P.x + P.w / 2)) < P.w / 2 + 3 && Math.abs(s.y - (P.y + P.h / 2)) < P.h / 2 + 3) { if (P.v3slowT <= 0) U.toast('Frost! You are slowed.'); P.v3slowT = 2.5; } });
    return baseShots.apply(this, arguments);
  };
  const baseMM = P.moveMul;
  P.moveMul = function () { const m = baseMM ? baseMM.apply(this, arguments) : 1; return P.v3slowT > 0 ? m * 0.55 : m; };

  // ================================= drawing =================================
  const baseWater = WD.drawWater;
  WD.drawWater = function (g, cam, vw, vh, time) {
    const r = baseWater.apply(this, arguments);
    if (!inRock()) return r;
    const ox = -Math.round(cam.x), oy = -Math.round(cam.y);
    const b = E.boss;
    const all = (q) => { E.enemies.forEach((e) => { if (isGuard(e)) { e.customDraw = true; drawGuardian(q, e.x + ox + e.w / 2, e.y + oy + e.h / 2, e, time); } }); };
    if (RW.v3pix) RW.v3pix(g, all); else all(g);
    if (b && b.sp === LEV && b.segs) {
      if (RW.v3levDraw) { // v3s20: pixel sprites, head + segments + tail; then its effects on a chunky layer
        const jt = jawFor(b, time); b.jaw = RW.lerp(b.jaw || 0, jt, 0.2);
        RW.v3levDraw(g, b, ox, oy, time);
        chunky(g, (q) => { const B = small(b); drawFx(q, B, ox / K, oy / K, time, true); drawFx(q, B, ox / K, oy / K, time, false); });
      } else chunky(g, (q) => { const B = small(b); drawFx(q, B, ox / K, oy / K, time, true); drawLev(q, B, ox / K, oy / K, time); drawFx(q, B, ox / K, oy / K, time, false); b.jaw = B.jaw; });
    }
    // the serpent passes behind you, never over you
    if (b && b.sp === LEV && lastMe && RW.game && RW.game.playing && !P.dead) { redraw = true; try { E.drawPlayer.apply(E, lastMe); } finally { redraw = false; } }
    return r;
  };
  // how far the jaw opens for what it is doing (the old drawing worked this out itself)
  function jawFor(b, time) {
    const st = b.state || '';
    return st === 'roar' || st === 'emerge' ? 0.62 : (st === 'charge' || st === 'frenzy') ? (b.did ? 0.5 : 0.25 + 0.15 * Math.sin(time * 18)) : st === 'beam' ? 0.42 : st === 'whirl' ? 0.35 : st === 'barrage' ? 0.3 + 0.2 * Math.max(0, Math.sin(time * 9)) : 0.08;
  }
  // the serpent as the drawing code knows it: everything divided by K (drawn inside a frame scaled by K)
  function small(b) {
    const B = Object.create(b);
    B.x = b.x / K; B.y = b.y / K; B.w = b.w / K; B.h = b.h / K; B.jaw = b.jaw;
    B.segs = (b.segs || []).map((s) => ({ x: s.x / K, y: s.y / K }));
    B.fx = (b.fx || []).map((f) => {
      const o = Object.assign({}, f);
      if (f.type === 'v3beam') { o.ax = f.ax / K; o.ay = f.ay / K; o.bx = f.bx / K; o.by = f.by / K; }
      else if (f.x > 5 || f.y > 5) { o.x = f.x / K; o.y = f.y / K; if (f.type === 'v3coil') o.ax = f.ax / K; }
      return o;
    });
    return B;
  }
  // chunky pixels: drawn onto a layer of PX-unit pixels, colours stepped into flat bands, a dark outline round it
  // its own small palette, like every other sprite: teal plates, pale belly, gems, bone teeth, a violet mouth, rage reds
  const QPAL = ['#03050a', '#0a1a20', '#12303a', '#1c4a58', '#2a6676', '#3f8690', '#5fa6a4', '#86c4b8', '#b4e0d4', '#e0f6f0', '#ffffff',
    '#20101a', '#3a1a22', '#5a2630', '#7a3438', '#9a5a50', '#c08870', '#ff5a3a', '#ffb070',
    '#e0525a', '#8a2a32', '#4fa8f0', '#22507a', '#5fd98a', '#2a7a4a', '#a86ef0', '#5a3290', '#f2c94c', '#8a6a1c', '#7fe3ff', '#2a8aa8',
    '#f0ecd8', '#b8b098', '#3a2460', '#6a3aa8', '#ff9ad0', '#c8f0ff'];
  const QP = []; QPAL.forEach((h) => { const n = parseInt(h.slice(1), 16); QP.push(n >> 16, (n >> 8) & 255, n & 255); });
  const QC = new Map();
  let lay = null;
  function chunky(g, fn) {
    const v = RW.view, W = Math.ceil(v.w / PX) + 2, H = Math.ceil(v.h / PX) + 2;
    if (!lay || lay.width !== W || lay.height !== H) { lay = document.createElement('canvas'); lay.width = W; lay.height = H; lay.ctx = lay.getContext('2d', { willReadFrequently: true }); }
    const o = lay.ctx; o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, W, H); o.setTransform(K / PX, 0, 0, K / PX, 0, 0);
    try { fn(o); } catch (e) { console.warn('leviathan layer', e); }
    o.setTransform(1, 0, 0, 1, 0, 0);
    const img = o.getImageData(0, 0, W, H), d = img.data, n = W * H, solid = new Uint8Array(n);
    for (let i = 0, j = 0; j < n; i += 4, j++) {
      if (d[i + 3] < 100) { d[i + 3] = 0; continue; }
      d[i + 3] = 255; solid[j] = 1;
      const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]; let q = QC.get(key);
      if (q === undefined) { let bd = 1e9; q = 0; for (let k = 0; k < QP.length; k += 3) { const dr = d[i] - QP[k], dg = d[i + 1] - QP[k + 1], db = d[i + 2] - QP[k + 2], dd = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11; if (dd < bd) { bd = dd; q = k; } } if (QC.size > 60000) QC.clear(); QC.set(key, q); }
      d[i] = QP[q]; d[i + 1] = QP[q + 1]; d[i + 2] = QP[q + 2];
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const j = y * W + x; if (solid[j]) continue;
      if ((x > 0 && solid[j - 1]) || (x < W - 1 && solid[j + 1]) || (y > 0 && solid[j - W]) || (y < H - 1 && solid[j + W])) { const i = j * 4; d[i] = 3; d[i + 1] = 5; d[i + 2] = 9; d[i + 3] = 255; }
    }
    o.putImageData(img, 0, 0);
    g.save(); g.imageSmoothingEnabled = false; g.drawImage(lay, 0, 0, W * PX, H * PX); g.restore();
  }
  // the Heart Chamber is pitch black: you see the Leviathan only in your own light
  const RDEF = RW.WORLDS && RW.WORLDS.rock;
  if (RDEF && RDEF.ambientAt) {
    const bAmb = RDEF.ambientAt;
    RDEF.ambientAt = function (x, y) { const c = C(); if (c && inRock()) { const dx = (x - c.cx) / (c.rx + 3), dy = (y - c.cy) / (c.ry + 3); if (dx * dx + dy * dy <= 1) return 0; } return bAmb.apply(this, arguments); };
  }
  let lastMe = null, redraw = false;
  const baseDPme = E.drawPlayer;
  E.drawPlayer = function (g, cam, p) { if (p && (p === P || (p.x === P.x && p.y === P.y)) && !redraw) lastMe = Array.from(arguments); return baseDPme.apply(this, arguments); };
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
    if (shield) drawShield(g, b, pts, ox, oy, time);
  }
  function drawHead(g, b, x, y, ang, jaw, time, rage, flash) {
    const f = Math.cos(ang) >= 0 ? 1 : -1;
    g.save(); g.translate(x, y); g.rotate(ang); if (f < 0) g.scale(1, -1); g.scale(1.22, 1.22);
    const top = rage ? '#3a1820' : '#16343f', mid = rage ? '#5c2430' : '#25596a', bel = rage ? '#a87060' : '#8fc4bc';
    const ja = jaw * 1.05;
    // lower jaw (drawn first, it hangs under)
    g.save(); g.translate(-8, 6); g.rotate(ja); g.scale(1.35, 1.45); // a big, heavy lower jaw
    g.fillStyle = '#05070c'; g.beginPath(); g.moveTo(-14, -6); g.lineTo(52, 0); g.lineTo(48, 7); g.lineTo(-12, 14); g.closePath(); g.fill();
    g.fillStyle = bel; g.beginPath(); g.moveTo(-12, -4); g.lineTo(50, 1); g.lineTo(46, 6); g.lineTo(-10, 12); g.closePath(); g.fill();
    g.fillStyle = '#f4efe2'; for (let k = 0; k < 7; k++) { const tx = 4 + k * 6.5; if (k % 2 === 0) { g.beginPath(); g.moveTo(tx + 1, -1); g.lineTo(tx + 2.6, -10); g.lineTo(tx + 4.2, -1); g.fill(); } g.beginPath(); g.moveTo(tx, -1 - k * 0.05); g.lineTo(tx + 2.4, -7 + (k % 2)); g.lineTo(tx + 4.2, -0.6); g.fill(); }
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
    E.enemies.forEach((e) => { if (!isGuard(e) || e.dead) return; const gm = GCLASS[e.sp].gem; const ex = e.x + e.w / 2, ey = e.y + e.h / 2; g.strokeStyle = 'rgba(' + (gm === 0 ? '255,120,130' : gm === 1 ? '120,190,255' : gm === 2 ? '120,240,160' : '200,150,255') + ',' + (0.3 + 0.2 * Math.sin(time * 8 + ex)) + ')'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(ex + ox, ey + oy); const mx = (ex + h.x) / 2 + Math.sin(time * 3) * 20, my = (ey + h.y) / 2 - 30; g.quadraticCurveTo(mx + ox, my + oy, h.x + ox, h.y + oy); g.stroke(); });
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
  // the four guardians: a ruby knight, a sapphire archer, an amethyst mage, an emerald healer, cut from crystal
  function facet(g, pts, col) { g.fillStyle = '#05070c'; g.beginPath(); pts.forEach(([a, b2], i) => (i ? g.lineTo(a, b2) : g.moveTo(a, b2))); g.closePath(); g.lineWidth = 2; g.strokeStyle = '#05070c'; g.stroke(); g.fill();
    const cx = pts.reduce((s2, p) => s2 + p[0], 0) / pts.length, cy = pts.reduce((s2, p) => s2 + p[1], 0) / pts.length;
    for (let i = 0; i < pts.length; i++) { const p1 = pts[i], p2 = pts[(i + 1) % pts.length]; g.fillStyle = i % 3 === 0 ? shade(col, 0.4) : i % 3 === 1 ? col : shade(col, -0.25); g.beginPath(); g.moveTo(cx, cy); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.fill(); } }
  function glowDot(g, x, y, r, col) { g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.35, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.restore(); }
  function drawGuardian(g, x, y, e, time) {
    if (RW.v3soul) return RW.v3soul(g, x, y, e, time);
    const G = GCLASS[e.sp] || GCLASS.v3g_ruby, gc = GEMS[G.gem], dk = shade(gc, -0.55), lt = shade(gc, 0.45);
    const t = e.t || time || 0, bob = Math.sin(t * 2.4) * 1.5, f = e.face || 1, a = e.act, u = e.actT && e.actD ? 1 - e.actT / e.actD : 0;
    g.save(); g.translate(Math.round(x), Math.round(y + bob)); g.scale(f, 1);
    if (e.ward > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(180,255,200,' + (0.4 + 0.25 * Math.sin(t * 8)) + ')'; g.lineWidth = 1.5; g.beginPath(); for (let k = 0; k <= 6; k++) { const an = k / 6 * 6.283 + t; const xx = Math.cos(an) * 20, yy = Math.sin(an) * 22; k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); g.restore(); }
    if (G.cls === 'knight') {
      // legs, crystal plate body, helm with a glowing visor, a kite shield in front, a burning blade behind
      g.fillStyle = dk; g.fillRect(-6, 9, 5, 7); g.fillRect(2, 9, 5, 7);
      const sw = a === 'slash' ? -2.4 + u * 3.6 : a === 'cleave' ? -1.8 + u * 2.6 : -0.9;
      g.save(); g.translate(-5, -2); g.rotate(sw); g.fillStyle = '#05070c'; g.fillRect(-1.5, -22, 4, 22); g.fillStyle = '#ffb070'; g.fillRect(-0.5, -21, 2, 19); g.fillStyle = '#ff6a3a'; g.fillRect(-0.5, -21, 1, 19); g.fillStyle = dk; g.fillRect(-4, -2, 9, 2); g.restore();
      if (a === 'slash' || a === 'cleave') glowDot(g, -5 + Math.cos(sw - 1.57) * 18, -2 + Math.sin(sw - 1.57) * 18, 7, 'rgba(255,140,60,0.6)');
      facet(g, [[0, -9], [9, -5], [8, 8], [0, 11], [-8, 8], [-9, -5]], gc);
      facet(g, [[0, -19], [6, -15], [6, -9], [0, -7], [-6, -9], [-6, -15]], shade(gc, -0.1));
      g.fillStyle = '#05070c'; g.fillRect(-4, -14, 9, 2); g.fillRect(0, -14, 2, 5); glowDot(g, 2, -13, 4, 'rgba(255,170,120,0.8)');
      const sx = a === 'charge' ? 11 : 8;
      facet(g, [[sx, -7], [sx + 6, -5], [sx + 6, 4], [sx + 3, 10], [sx, 4]], lt); g.fillStyle = gc; g.fillRect(sx + 2, -3, 2, 6);
      if (a === 'charge') glowDot(g, sx + 5, 0, 10, 'rgba(255,200,160,0.5)');
    } else if (G.cls === 'archer') {
      // hooded cloak, two glowing eyes in the hood, a crystal bow held out front, a quiver of shards
      facet(g, [[0, -19], [7, -10], [9, 14], [-9, 14], [-7, -10]], shade(gc, -0.15));
      g.fillStyle = '#05070c'; g.beginPath(); g.moveTo(0, -15); g.lineTo(5, -8); g.lineTo(-4, -8); g.fill();
      glowDot(g, 1, -10, 3, 'rgba(190,235,255,0.9)'); glowDot(g, -2, -10, 2.5, 'rgba(190,235,255,0.7)');
      g.fillStyle = dk; for (let k = 0; k < 3; k++) g.fillRect(-9 + k * 2, -12 - k, 1.5, 9); g.fillStyle = lt; for (let k = 0; k < 3; k++) g.fillRect(-9 + k * 2, -13 - k, 1.5, 2);
      const pull = a === 'shoot' || a === 'frost' ? Math.min(1, u * 2) : a === 'volley' ? 0.6 : 0, bx = 11;
      g.strokeStyle = '#05070c'; g.lineWidth = 3; g.beginPath(); g.arc(bx - 6, -2, 11, -1.1, 1.1); g.stroke(); g.strokeStyle = lt; g.lineWidth = 1.5; g.beginPath(); g.arc(bx - 6, -2, 11, -1.1, 1.1); g.stroke();
      g.strokeStyle = 'rgba(230,250,255,0.85)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(bx - 6 + Math.cos(-1.1) * 11, -2 + Math.sin(-1.1) * 11); g.lineTo(bx - 1 - pull * 7, -2); g.lineTo(bx - 6 + Math.cos(1.1) * 11, -2 + Math.sin(1.1) * 11); g.stroke();
      if (pull) { g.fillStyle = a === 'frost' ? '#e8faff' : lt; g.fillRect(bx - 2 - pull * 7, -2.5, 12, 1.5); if (a === 'frost') glowDot(g, bx + 10, -2, 6, 'rgba(190,240,255,0.8)'); }
      if (a === 'volley') { g.fillStyle = lt; g.save(); g.rotate(-1.2); g.fillRect(4, -1, 14, 1.5); g.restore(); }
    } else if (G.cls === 'mage') {
      // a tall pointed hood, a flared robe, a floating staff with an orb, runes when casting
      facet(g, [[0, -8], [8, -2], [11, 15], [-11, 15], [-8, -2]], shade(gc, -0.1));
      facet(g, [[1, -28], [6, -12], [6, -7], [-6, -7], [-6, -12]], gc);
      g.fillStyle = '#05070c'; g.fillRect(-3, -12, 8, 4); glowDot(g, 2, -10, 3.5, 'rgba(230,200,255,0.9)');
      const lift = a ? -3 : 0, sx = 11;
      g.fillStyle = '#05070c'; g.fillRect(sx - 1, -14 + lift, 3, 30); g.fillStyle = dk; g.fillRect(sx, -13 + lift, 1.5, 28);
      glowDot(g, sx + 0.5, -17 + lift, a ? 9 : 6, 'rgba(200,150,255,0.8)'); g.fillStyle = lt; g.beginPath(); g.arc(sx + 0.5, -17 + lift, 3, 0, 6.283); g.fill();
      if (a === 'chain' || a === 'blink' || a === 'bolt') { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(210,170,255,0.7)'; g.lineWidth = 1; for (let k = 0; k < 6; k++) { const an = k / 6 * 6.283 + t * 3; g.strokeRect(Math.cos(an) * 16 - 1.5, Math.sin(an) * 16 - 1.5, 3, 3); } g.restore(); }
    } else {
      // the healer: a halo, a soft robe, a staff topped with a crystal flower, a green aura when it heals
      if (a === 'heal' || a === 'ward') glowDot(g, 0, 0, 26 * (0.6 + u * 0.6), 'rgba(140,255,160,0.35)');
      facet(g, [[0, -9], [8, -3], [10, 15], [-10, 15], [-8, -3]], lt);
      facet(g, [[0, -19], [5, -15], [5, -9], [0, -7], [-5, -9], [-5, -15]], gc);
      g.fillStyle = '#05070c'; g.fillRect(-1, -14, 2, 1); g.fillRect(2, -14, 2, 1);
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(220,255,200,' + (0.6 + 0.3 * Math.sin(t * 3)) + ')'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(0, -23, 7, 2.2, 0, 0, 6.283); g.stroke(); g.restore();
      const sx = 10; g.fillStyle = '#05070c'; g.fillRect(sx - 1, -12, 3, 28); g.fillStyle = shade('#c8a070', -0.1); g.fillRect(sx, -11, 1.5, 26);
      for (let k = 0; k < 4; k++) { const an = k * 1.57 + t; g.fillStyle = k % 2 ? gc : lt; g.beginPath(); g.ellipse(sx + 0.5 + Math.cos(an) * 3, -15 + Math.sin(an) * 3, 2.2, 1.2, an, 0, 6.283); g.fill(); }
      glowDot(g, sx + 0.5, -15, 6, 'rgba(160,255,170,0.8)');
    }
    if (e.hitT > 0) { g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(-11, -24, 22, 40); }
    g.restore();
    if (e.showBar > 0 && e.hp < e.maxhp) { g.fillStyle = '#0c0a10'; g.fillRect(x - 12, y - 32, 24, 3); g.fillStyle = gc; g.fillRect(x - 12, y - 32, 24 * Math.max(0, e.hp / e.maxhp), 3); }
  }

  // field guide pictures, drawn from the same code
  const D = A.drawers || (A.drawers = {});
  Object.keys(GCLASS).forEach((id) => { D['v3guardian_' + GCLASS[id].cls] = function () { return [0, 1].map((k) => { const c = document.createElement('canvas'); c.width = 40; c.height = 50; const g = c.getContext('2d'); drawGuardian(g, 20, 28, { sp: id, t: k * 0.6, face: 1 }, 0); return c; }); }; });
  D.v3leviathan = function () {
    const c = document.createElement('canvas'); c.width = 180; c.height = 70; const g = c.getContext('2d');
    const b = { x: 140, y: 6, w: 68, h: 68, ang: 0.15, segs: [], phase: 1, state: 'roar', jaw: 0.5, t: 0 };
    for (let i = 0; i < NSEG; i++) b.segs.push({ x: 170 - (i + 1) * 4.6, y: 40 + Math.sin(i * 0.45) * 8 });
    g.save(); g.scale(0.24, 0.24); g.translate(-30, 40); try { drawLev(g, Object.assign(b, { x: 140 / 0.24 - 400, y: 30, segs: b.segs.map((s, i) => ({ x: 560 - (i + 1) * 20, y: 150 + Math.sin(i * 0.4) * 30 })) }), 0, 0, 1.2); } catch (e) { /* picture only */ } g.restore();
    return [c];
  };
  if (sp) { sp.art = { draw: 'v3leviathan' }; if (A._spCache) delete A._spCache[LEV]; }
  RW.v3lev = { drawLev, drawGuardian, drawFx, initBoss, NSEG, GAP, GCLASS };
})(window.RW);
