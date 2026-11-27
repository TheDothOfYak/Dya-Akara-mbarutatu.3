// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 10: the Leviathan's loot.
//  * Beat the Leviathan: one of seven abyssal drops at random (2 melee, 2 bows, 2 magic, 1 healing tome). The first time:
//    a Krait Pearl (a pet sea krait) and a Radiant Glowstone too. Sometimes a Leviathan Fang trinket.
//  * Each drowned soul always drops its core. Core + Abyssite bars at a forge = Ossuary Anchor, Silent Fathom, Veilstaff,
//    Soulbound Lantern.
//  * Once it's beaten, Abyssite veins open in the Heart Chamber walls (ore -> bars -> helm, mail, pickaxe, Abyssal Glowstone).
//  * The Leviathan Altar in the chamber: use it with a Gemscale to call the Leviathan back for a rematch.
//  * Every special is passive. Drops are about 40% stronger than the old legendaries.
//  * Twelve trinkets; three trinket slots (v3s7), no doubles. Effects live here.
(function (RW) {
  'use strict';
  const E = RW.ent, P = RW.player, WD = RW.world, U = RW.ui, N = RW.net, A = RW.art, R = RW.register, TS = RW.TILE;
  if (!E || !P || !WD || !U) return;
  const now = () => performance.now() / 1000;
  const LEV = 'gemscale_leviathan';
  const inRock = () => WD.def && WD.def.id === 'rock';
  const pc = () => ({ x: P.x + P.w / 2, y: P.y + P.h / 2 });
  const worn = (id) => { const a = P.armor || {}; return a.trinket === id || a.trinket2 === id || a.trinket3 === id; };

  // ================================ ITEMS ================================
  const Wp = (o) => R.item(Object.assign({ kind: 'weapon', stack: 1, tier: 'legendary', power: 1, knock: 6, v3loot: true }, o));
  Wp({ id: 'riftreaper', name: 'Riftreaper', dmg: 190, spd: 0.5, knock: 9, reach: 44, icon: { s: 'axe', a: '#46287a', b: '#857e66' }, desc: 'Leviathan drop. A spine-bone scythe. 190 damage, a wide sweep. Passive: every hit tears the water, and the tear cuts again for half damage a moment later.' });
  Wp({ id: 'trenchfall', name: 'Trenchfall', dmg: 260, spd: 0.75, knock: 26, reach: 34, icon: { s: 'hammer', a: '#2a2540', b: '#1f8a8a' }, desc: 'Leviathan drop. An abyss-stone warhammer. 260 damage, slow. Passive: every 4th hit sends a pressure wave along the floor that knocks monsters down.' });
  Wp({ id: 'gravewake', name: 'Gravewake', dmg: 160, spd: 0.6, v3shot: 'harpoon', icon: { s: 'spear', a: '#857e66', b: '#2a2540' }, desc: 'Leviathan drop. A harpoon gun. 160 damage. Passive: small monsters you hit are reeled in to you; hit a big one and you are pulled to it.' });
  Wp({ id: 'wraithstring', name: 'Wraithstring', dmg: 95, spd: 0.3, v3shot: 'wraith', icon: { s: 'bow', a: '#98a6b0', b: '#2a2540' }, desc: 'Leviathan drop. A soul bow. 95 damage; its ghost arrows fly through walls. Passive: a kill frees a soul arrow that hunts the next monster.' });
  Wp({ id: 'drowneye', name: 'Eye of the Drowned King', dmg: 28, spd: 0.55, v3shot: 'beam', icon: { s: 'staff', a: '#1f8a8a', b: '#2a2540' }, desc: 'Leviathan drop. A staff with the Leviathan\'s eye. A dark beam that follows your mouse, 28 damage a tick. Passive: monsters in the beam take 20% more damage from everyone for 3 seconds.' });
  Wp({ id: 'codex', name: 'The Sunken Codex', dmg: 120, spd: 0.8, v3shot: 'tentacle', icon: { s: 'book', a: '#46287a', b: '#22181c' }, desc: 'Leviathan drop. A drowned tome. Shadow tentacles rise where you point, 120 damage, and hold monsters still. Passive: every 3rd cast grabs everything nearby.' });
  R.item({ id: 'tidetome', name: 'Tome of the Ebbing Tide', kind: 'armor', slot: 'trinket', def: 0, stack: 1, v3trinket: true, icon: { s: 'book', a: '#2a7a5e', b: '#0e3028' }, desc: 'Leviathan drop. A healing trinket: wear it. You and every friend within 15 blocks heal 2% of your health each second.' });
  Wp({ id: 'ossuary', name: 'Ossuary Anchor', dmg: 240, spd: 0.7, knock: 18, reach: 40, icon: { s: 'hammer', a: '#33244a', b: '#857e66' }, desc: 'Knight Core + Abyssite. A huge anchor on a spine chain. 240 damage. Passive: each swing drags nearby monsters in, and a hit pins them to the floor for 1 second.' });
  Wp({ id: 'silentfathom', name: 'Silent Fathom', dmg: 110, spd: 0.35, v3shot: 'bolt', icon: { s: 'bow', a: '#d8d0b4', b: '#33244a' }, desc: 'Archer Core + Abyssite. A horn crossbow. 110 damage. Passive: bolts pierce every monster in a line, each one hit adds 15% damage to the next.' });
  Wp({ id: 'veilstaff', name: 'Veilstaff', dmg: 85, spd: 0.35, v3shot: 'mist', icon: { s: 'staff', a: '#585a68', b: '#33244a' }, desc: 'Mage Core + Abyssite. Mist bolts, 85 damage, that blind (monsters miss 30% of their hits on you) and slow. Passive: a kill raises a mist wraith that fights for you for 8 seconds.' });
  Wp({ id: 'soullantern', name: 'Soulbound Lantern', dmg: 0, spd: 0.4, v3lantern: true, icon: { s: 'lantern', a: '#2a7a5e', b: '#33244a' }, desc: 'Healer Core + Abyssite. Click to link your soul to another player, anywhere in the world (click again for the next player, or to unlink). While linked, you share each other\'s damage, and all of it is cut by 50%.' });
  const GLOWC = { riftreaper: '#9a74e0', trenchfall: '#4cc4b8', gravewake: '#4cc4b8', wraithstring: '#d0dce0', drowneye: '#8af0e0', codex: '#9a74e0', tidetome: '#5ab894', ossuary: '#e0703a', silentfathom: '#7ab8e8', veilstaff: '#b8bccc', soullantern: '#5ab894' };
  Object.keys(GLOWC).forEach((id) => { if (RW.ITEMS[id]) RW.ITEMS[id].v3glowc = GLOWC[id]; });
  const MATS = [
    { id: 'core_knight', name: 'Knight Core', desc: 'A dark crystal with a burning skull inside. Always dropped by the Drowned Knight. With Abyssite bars at a forge: the Ossuary Anchor.' },
    { id: 'core_archer', name: 'Archer Core', desc: 'Two cold eyes watch from inside it. Always dropped by the Drowned Archer. With Abyssite bars at a forge: Silent Fathom.' },
    { id: 'core_mage', name: 'Mage Core', desc: 'An empty hood, leaking mist. Always dropped by the Drowned Mage. With Abyssite bars at a forge: the Veilstaff.' },
    { id: 'core_healer', name: 'Healer Core', desc: 'A sleeping drowned face. Always dropped by the Drowned Healer. With Abyssite bars at a forge: the Soulbound Lantern.' },
    { id: 'abyssite_ore', name: 'Abyssite Ore', desc: 'Black ore with dark violet crystals. Its veins open in the Heart Chamber once the Leviathan is beaten. Needs a Stygian pick or better. Four make a bar at a forge.' },
    { id: 'abyssite_bar', name: 'Abyssite Bar', desc: 'Better than platinum. For Abyssite gear and the Leviathan\'s core weapons.' },
  ];
  MATS.forEach((m) => R.item(Object.assign({ kind: 'material', icon: { s: 'ore', a: '#6c4aa8', b: '#16121e' } }, m)));
  R.item({ id: 'abyssite_helm', name: 'Abyssite Helm', kind: 'armor', slot: 'head', def: 8, tint: '#33244a', glow: '#6c4aa8', icon: { s: 'helm', a: '#4a3270', b: '#16121e' }, desc: 'Better than platinum, better than stygian. Armour 8.' });
  R.item({ id: 'abyssite_mail', name: 'Abyssite Mail', kind: 'armor', slot: 'body', def: 12, tint: '#33244a', glow: '#6c4aa8', icon: { s: 'chest', a: '#4a3270', b: '#16121e' }, desc: 'Better than platinum, better than stygian. Armour 12.' });
  Wp({ id: 'abyssite_pick', name: 'Abyssite Pickaxe', tier: 'abyssite', power: 9, dmg: 24, spd: 0.22, knock: 2, v3loot: false, icon: { s: 'pick', a: '#4a3270', b: '#36262a' }, desc: 'Mines anything, faster than any other pick.' });
  R.item({ id: 'krait_pearl', name: 'Krait Pearl', kind: 'crystal', stack: 1, v3pet: true, icon: { s: 'pearl', a: '#1f8a8a', b: '#16141e' }, desc: 'From the Leviathan, the first time you beat it. Hold it and right-click to call your pet sea krait, or to send it home. It just follows you.' });
  const TR = [
    ['t_fang', 'Leviathan Fang', 'Combat: +15% damage. Sometimes dropped by the Leviathan.'],
    ['t_eye', 'Hunter\'s Eye', 'Combat: +10% chance of a critical hit. Found in chests deep underground.'],
    ['t_coil', 'Clockwork Coil', 'Combat: attack 12% faster. Sold by traders (Cubert in Stalagmere).'],
    ['t_shell', 'Shellguard Charm', 'Defence: take 10% less damage. Crafted at a forge.'],
    ['t_anchor', 'Anchor Weight', 'Defence: no knockback. Found in chests.'],
    ['t_thorn', 'Thornshell', 'Defence: monsters that hit you up close take 20% of the hit back. Sold by traders.'],
    ['t_gill', 'Gill Charm', 'Movement: your breath lasts 3 times longer underwater. Crafted at a forge.'],
    ['t_fin', 'Fin Anklet', 'Movement: swim 30% faster. Found in chests.'],
    ['t_feather', 'Updraft Feather', 'Movement: jump higher. Sold by traders.'],
    ['t_lens', 'Prospector\'s Lens', 'Utility: mine 20% faster. Crafted at a forge.'],
    ['t_pebble', 'Lucky Pebble', 'Utility: 15% chance that a monster drops something extra. Found in chests.'],
    ['t_magnet', 'Magnet Stone', 'Utility: pick things up from 3 times farther. Sold by traders.'],
  ];
  TR.forEach(([id, name, d]) => R.item({ id, name, kind: 'armor', slot: 'trinket', def: 0, stack: 1, v3trinket: true, icon: { s: 'v3glow', a: '#5a5288', b: 'dim' }, desc: 'Trinket (wear it: right-click). ' + d }));
  R.recipes([
    { out: 'abyssite_bar', in: { abyssite_ore: 4 }, at: 'forge' },
    { out: 'abyssite_helm', in: { abyssite_bar: 9, leviathan_scale: 1 }, at: 'forge' },
    { out: 'abyssite_mail', in: { abyssite_bar: 14, leviathan_scale: 2 }, at: 'forge' },
    { out: 'abyssite_pick', in: { abyssite_bar: 10, stygian_bar: 2 }, at: 'forge' },
    { out: 'ossuary', in: { core_knight: 1, abyssite_bar: 8 }, at: 'forge' },
    { out: 'silentfathom', in: { core_archer: 1, abyssite_bar: 8 }, at: 'forge' },
    { out: 'veilstaff', in: { core_mage: 1, abyssite_bar: 8 }, at: 'forge' },
    { out: 'soullantern', in: { core_healer: 1, abyssite_bar: 8 }, at: 'forge' },
    { out: 't_shell', in: { iron_bar: 6, crystal_dust: 6 }, at: 'forge' },
    { out: 't_gill', in: { platinum_bar: 2, cave_moss: 6 }, at: 'forge' },
    { out: 't_lens', in: { bronze_bar: 4, crystal_dust: 8 }, at: 'forge' },
  ].filter((r) => Object.keys(r.in).every((k) => RW.ITEMS[k])));
  // chests and traders
  const addLoot = (t, row) => { if (RW.LOOT[t]) RW.LOOT[t].push(row); };
  ['chest', 'ship', 'vault', 'keep', 'cache'].forEach((t) => { addLoot(t, ['t_anchor', 1, 1, 0.04]); addLoot(t, ['t_fin', 1, 1, 0.04]); addLoot(t, ['t_pebble', 1, 1, 0.04]); });
  ['vault', 'cache', 'den'].forEach((t) => addLoot(t, ['t_eye', 1, 1, 0.08]));
  if (RW.TRADES) RW.TRADES.push(
    { give: { coin: 140 }, get: ['t_coil', 1], note: 'Attack a little faster.' }, { give: { coin: 140 }, get: ['t_thorn', 1], note: 'Bite back.' },
    { give: { coin: 110 }, get: ['t_feather', 1], note: 'Jump higher.' }, { give: { coin: 90 }, get: ['t_magnet', 1], note: 'Pick things up from farther.' });

  // ================================ PASSIVES & SHOTS ================================
  const Q = (E.v3shots = []);      // our own projectiles
  const FX = (E.v3fx = []);        // tears, waves, tentacles, beams (drawn)
  const allies = (E.v3allies = []);
  const foes = () => E.enemies.filter((e) => !e.dead && !e.friendly && !e.dummy).concat(E.boss && !E.boss.dead ? [E.boss] : []);
  const boxOf = (e) => (e.sp === LEV ? { x: e.x, y: e.y, w: e.w, h: e.h } : e.hitbox ? e.hitbox() : e);
  function touches(e, x, y, r) {
    if (e.sp === LEV && e.segs) { const h = { x: e.x + e.w / 2, y: e.y + e.h / 2 }; if (Math.hypot(h.x - x, h.y - y) < 34 + r) return true; for (let i = 0; i < e.segs.length; i += 2) { const s = e.segs[i]; if (Math.hypot(s.x - x, s.y - y) < 34 - 24 * Math.pow(i / e.segs.length, 1.3) + r) return true; } return false; }
    const b = boxOf(e); return x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h;
  }
  const big = (e) => e.isBoss || e.sp === LEV || e.w * e.h > 900;
  const hit = (e, d, col) => { if (!e || e.dead) return false; const c = Math.random() < 0.06; E.damage(e, Math.round(d * P.dmgMul() * (c ? 1.8 : 1) * (0.9 + Math.random() * 0.2)), Math.sign((e.x + e.w / 2) - pc().x) || 1, 4, c, col); return e.dead || e.hp <= 0; };
  const solidAt = (x, y) => WD.solid(Math.floor(x / TS), Math.floor(y / TS));
  const mouseAng = () => { const c = pc(), m = RW.mouseWorld(); return Math.atan2(m.y - c.y, m.x - c.x); };
  const nearestFoe = (x, y, max, not) => { let best = null, bd = max; foes().forEach((e) => { if (not && not.has(e)) return; const b = boxOf(e), d = Math.hypot(b.x + b.w / 2 - x, b.y + b.h / 2 - y); if (d < bd) { bd = d; best = e; } }); return best; };
  let codexN = 0, trenchN = 0;

  // ---- firing ----
  const baseSwing = P.startSwing;
  P.startSwing = function () {
    const h = P.held();
    if (h && h.v3lantern) { if (!(P.swingT > 0)) { P.swingT = P.swingDur = h.spd; lanternClick(); } return; }
    if (!h || !h.v3shot) { const r = baseSwing.apply(this, arguments); if (h && h.id === 'ossuary' && P.swingT > 0) drag(); return r; }
    if (P.swingT > 0) return;
    if (!P.tire(3 + h.dmg / 25)) return;
    const dur = h.spd * (worn('t_coil') ? 1 / 1.12 : 1); P.swingT = dur; P.swingDur = dur; P.swingHit = new Set();
    const c = pc(), a = mouseAng();
    if (h.v3shot === 'harpoon') { Q.push({ k: 'harpoon', x: c.x, y: c.y - 4, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, life: 0.8, dmg: h.dmg }); RW.audio.sfx('bow'); }
    else if (h.v3shot === 'wraith') { Q.push({ k: 'wraith', x: c.x, y: c.y - 4, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, life: 1.4, dmg: h.dmg }); RW.audio.sfx('bow'); }
    else if (h.v3shot === 'bolt') { Q.push({ k: 'bolt', x: c.x, y: c.y - 4, vx: Math.cos(a) * 720, vy: Math.sin(a) * 720, life: 0.9, dmg: h.dmg, hits: new Set(), mul: 1 }); RW.audio.sfx('bow'); }
    else if (h.v3shot === 'mist') { Q.push({ k: 'mist', x: c.x, y: c.y - 4, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, life: 1.3, dmg: h.dmg }); RW.audio.sfx('crystal'); }
    else if (h.v3shot === 'beam') { FX.push({ k: 'beam', t: 0, d: 0.5, tick: 0, dmg: h.dmg }); RW.audio.sfx('crystal'); }
    else if (h.v3shot === 'tentacle') {
      codexN++; const m = RW.mouseWorld(), dd = Math.min(220, Math.hypot(m.x - c.x, m.y - c.y)), tx = c.x + Math.cos(a) * dd, ty = c.y + Math.sin(a) * dd, wide = codexN % 3 === 0;
      const grabbed = foes().filter((e) => touches(e, wide ? c.x : tx, wide ? c.y : ty, wide ? 130 : 34));
      grabbed.forEach((e) => { hit(e, h.dmg, '#9a74e0'); if (!big(e)) { e.v3hold = 1.6; e.v3hx = e.x; e.v3hy = e.y; } FX.push({ k: 'tent', e, t: 0, d: 1.6 }); });
      if (!grabbed.length) FX.push({ k: 'tent', x: tx, y: ty, t: 0, d: 0.8 });
      if (wide) RW.fx.ring && RW.fx.ring(c.x, c.y, '#6a44b0', 130, 0.5, 2);
      RW.audio.sfx('poison');
    }
    RW.net && RW.net.send && RW.net.send({ k: 'v3swing', it: h.id, a });
  };
  // the anchor drags monsters in as it swings
  function drag() { const c = pc(); foes().forEach((e) => { if (big(e)) return; const b = boxOf(e), dx = c.x - (b.x + b.w / 2), dy = c.y - (b.y + b.h / 2), d = Math.hypot(dx, dy); if (d < 100 && d > 10) { e.vx += dx / d * 260; e.vy += dy / d * 120; } }); }
  // melee passives: hits made during a swing
  const baseHits = P.swingHits;
  P.swingHits = function () {
    const before = new Set(P.swingHit || []); const r = baseHits.apply(this, arguments); const h = P.held(); if (!h || !P.swingHit) return r;
    const fresh = [...P.swingHit].filter((e) => !before.has(e)); if (!fresh.length) return r;
    if (h.id === 'riftreaper') fresh.forEach((e) => FX.push({ k: 'tear', e, t: 0, d: 0.4, dmg: h.dmg * 0.5 }));
    if (h.id === 'ossuary') fresh.forEach((e) => { if (!big(e)) { e.v3hold = 1; e.v3hx = e.x; e.v3hy = e.y; } });
    if (h.id === 'trenchfall' && !P.swingHit.__v3c) { P.swingHit.__v3c = 1; trenchN++; if (trenchN % 4 === 0) { const c = pc(); FX.push({ k: 'wave', x: c.x, y: P.y + P.h - 2, dir: P.face, t: 0, d: 0.7, hit: new Set(), dmg: 150 }); RW.fx.shake(4, 0.3); RW.audio.sfx('break'); } }
    return r;
  };
  const baseBox = P.swingBox;
  P.swingBox = function () { const b = baseBox.apply(this, arguments); const h = P.held(); if (h && h.id === 'riftreaper') { b.y -= 12; b.h += 22; } return b; };

  // ---- each frame ----
  const baseShots = E.updateShots;
  let wasGround = true, healT = 0;
  E.updateShots = function (dt) {
    const r = baseShots.apply(this, arguments);
    try { tick(dt); } catch (e) { console.error(e); }
    return r;
  };
  function tick(dt) {
    const c = pc();
    const hh = P.held && P.held(); if (hh && hh.v3glowc && !P.dead && RW.game && RW.game.playing) {
      const hx = c.x + P.face * 9, hy = c.y - 6; RW.fx.light && RW.fx.light(hx, hy, 0.2, 0.2, 0.25);
      if (Math.random() < dt * 22) RW.fx.spawn({ x: hx + RW.rand(-6, 6), y: hy + RW.rand(-10, 4), vx: RW.rand(-10, 10), vy: RW.rand(-30, -10), life: 0.7, color: Math.random() < 0.3 ? '#ffffff' : hh.v3glowc, add: true, kind: 'glow', size: Math.random() < 0.3 ? 2 : 1 });
      if (P.swingT > 0 && Math.random() < dt * 60) RW.fx.spawn({ x: hx + P.face * RW.rand(4, 22), y: hy + RW.rand(-16, 12), vx: P.face * RW.rand(20, 80), vy: RW.rand(-40, 20), life: 0.45, color: hh.v3glowc, add: true, kind: 'glow', size: 2 });
    }
    for (let i = Q.length - 1; i >= 0; i--) {
      const s = Q[i]; s.life -= dt; s.t = (s.t || 0) + dt;
      if (s.k === 'seek' && s.tg && !s.tg.dead) { const b = boxOf(s.tg), a = Math.atan2(b.y + b.h / 2 - s.y, b.x + b.w / 2 - s.x), v = 520; s.vx = RW.lerp(s.vx, Math.cos(a) * v, Math.min(1, dt * 8)); s.vy = RW.lerp(s.vy, Math.sin(a) * v, Math.min(1, dt * 8)); }
      const steps = 3; let gone = false;
      for (let k = 0; k < steps && !gone; k++) {
        s.x += s.vx * dt / steps; s.y += s.vy * dt / steps;
        if (s.k !== 'wraith' && s.k !== 'seek' && solidAt(s.x, s.y)) { gone = true; if (s.k === 'harpoon') RW.fx.burst(s.x, s.y, '#ada488', 5, 60); break; }
        for (const e of foes()) {
          if (!touches(e, s.x, s.y, 3)) continue;
          if (s.k === 'bolt') { if (s.hits.has(e)) continue; s.hits.add(e); hit(e, s.dmg * s.mul, '#c8ecff'); s.mul *= 1.15; RW.fx.burst(s.x, s.y, ['#c8ecff', '#ffffff'], 5, 80, { add: true, kind: 'spark' }); continue; }
          const killed = hit(e, s.dmg, s.k === 'mist' ? '#b8bccc' : s.k === 'harpoon' ? '#ada488' : '#f0f6fa');
          if (s.k === 'harpoon') { if (!big(e) && !killed) e.v3reel = 0.45; else if (big(e)) { const a = Math.atan2(s.y - c.y, s.x - c.x); P.vx += Math.cos(a) * 420; P.vy = Math.min(P.vy, Math.sin(a) * 420 - 120); } }
          if (s.k === 'mist') { e.v3blind = 3; e.v3slow = 3; if (killed) wraith(e); }
          if ((s.k === 'wraith' || s.k === 'seek') && killed) { const n = nearestFoe(s.x, s.y, 320, new Set([e])); if (n) Q.push({ k: 'seek', x: s.x, y: s.y, vx: s.vx * 0.3, vy: -120, life: 1.6, dmg: s.dmg, tg: n }); }
          gone = true; break;
        }
      }
      if (gone || s.life <= 0) Q.splice(i, 1);
    }
    for (let i = FX.length - 1; i >= 0; i--) {
      const f = FX[i]; f.t += dt;
      if (f.k === 'tear' && !f.done && f.t > 0.3) { f.done = 1; if (f.e && !f.e.dead) hit(f.e, f.dmg / P.dmgMul(), '#9a74e0'); }
      if (f.k === 'wave') { f.x += f.dir * 340 * dt; foes().forEach((e) => { if (f.hit.has(e) || !touches(e, f.x, f.y - 10, 12)) return; f.hit.add(e); hit(e, f.dmg, '#4cc4b8'); if (!big(e)) { e.vy = -260; e.vx += f.dir * 140; } }); if (Math.random() < 0.7) RW.fx.burst(f.x, f.y, ['#4cc4b8', '#145a62'], 2, 80, { grav: 300 }); }
      if (f.k === 'beam') {
        f.tick -= dt; const a = mouseAng(); let L = 0; const step = 4;
        while (L < 280 && !solidAt(c.x + Math.cos(a) * L, c.y - 4 + Math.sin(a) * L)) L += step;
        f.a = a; f.L = L;
        if (f.tick <= 0) { f.tick = 0.09; foes().forEach((e) => { for (let l = 0; l < L; l += 10) { if (touches(e, c.x + Math.cos(a) * l, c.y - 4 + Math.sin(a) * l, 3)) { hit(e, f.dmg, '#4cc4b8'); e.v3mark = 3; break; } } }); }
      }
      if (f.t >= f.d) FX.splice(i, 1);
    }
    // monster states set by the passives
    E.enemies.forEach((e) => {
      if (e.v3hold > 0) { e.v3hold -= dt; e.x = e.v3hx; e.y = e.v3hy; e.vx = 0; e.vy = 0; }
      if (e.v3reel > 0) { e.v3reel -= dt; const b = boxOf(e), dx = c.x - (b.x + b.w / 2), dy = c.y - (b.y + b.h / 2), d = Math.hypot(dx, dy); if (d > 18) { e.x += dx / d * 520 * dt; e.y += dy / d * 520 * dt; } }
      if (e.v3slow > 0) { e.v3slow -= dt; e.x -= (e.vx || 0) * dt * 0.5; }
      if (e.v3blind > 0) e.v3blind -= dt;
      if (e.v3mark > 0) e.v3mark -= dt;
    });
    if (E.boss && E.boss.v3mark > 0) E.boss.v3mark -= dt;
    // mist wraiths
    for (let i = allies.length - 1; i >= 0; i--) {
      const w = allies[i]; w.t += dt; w.cd -= dt;
      const tg = nearestFoe(w.x, w.y, 300);
      const tx = tg ? boxOf(tg).x + boxOf(tg).w / 2 : c.x - P.face * 20, ty = tg ? boxOf(tg).y + boxOf(tg).h / 2 : c.y - 24;
      const a = Math.atan2(ty - w.y, tx - w.x), d = Math.hypot(tx - w.x, ty - w.y); w.x += Math.cos(a) * Math.min(d, 200 * dt); w.y += Math.sin(a) * Math.min(d, 200 * dt) + Math.sin(w.t * 5) * 0.3;
      if (tg && d < 20 && w.cd <= 0) { w.cd = 0.6; hit(tg, 40, '#b8bccc'); }
      if (w.t > 8) allies.splice(i, 1);
    }
    // trinkets that work every frame
    P.maxBreath = worn('t_gill') ? 30 : 10;
    if (wasGround && !P.ground && P.vy < -120 && P.vy > -176 && worn('t_feather')) P.vy *= 1.22;
    wasGround = P.ground;
    if (worn('tidetome') && !P.dead && (healT -= dt) <= 0) { healT = 1; tideHeal(); }
  }
  function wraith(e) { const b = boxOf(e); allies.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, t: 0, cd: 0.3 }); RW.fx.burst(b.x + b.w / 2, b.y + b.h / 2, ['#b8bccc', '#80849a'], 12, 60, { add: true, kind: 'glow' }); }
  // marked monsters take more from everyone; hunter's eye crits; blinded monsters miss
  const baseDamage = E.damage;
  E.damage = function (e, d, dir, knock, crit, color) {
    if (e && e.v3mark > 0) d = Math.round(d * 1.2);
    if (e && !crit && worn('t_eye') && Math.random() < 0.1) { d = Math.round(d * 1.8); crit = true; }
    return baseDamage.call(this, e, d, dir, knock, crit, color);
  };
  const baseHurt = P.hurt;
  let sharing = false;
  P.hurt = function (d, dir, src) {
    if (P.dead || P.invulnT > 0) return baseHurt.apply(this, arguments);
    const c = pc();
    if (E.enemies.some((e) => e.v3blind > 0 && Math.hypot(e.x + e.w / 2 - c.x, e.y + e.h / 2 - c.y) < 80) && Math.random() < 0.3) { RW.fx.text(c.x, P.y - 4, 'Miss', '#b8bccc'); P.invulnT = 0.25; return; }
    if (worn('t_shell')) d *= 0.9;
    if (!sharing && P.v3link && linkPeer()) { d *= 0.5; const half = d / 2; d -= half; N.send({ k: 'v3share', to: P.v3link, d: Math.round(half * 10) / 10 }); }
    const vx = P.vx, vy = P.vy, hp = P.hp;
    const r = baseHurt.call(this, Math.max(1, d), dir, src);
    if (worn('t_anchor')) { P.vx = vx; P.vy = vy; }
    if (worn('t_thorn') && P.hp < hp) { const e = nearestFoe(c.x, c.y, 46); if (e) E.damage(e, Math.max(1, Math.round((hp - P.hp) * 0.2)), Math.sign(e.x - c.x) || 1, 2, false, '#c8a070'); }
    return r;
  };
  const baseMul = P.dmgMul; P.dmgMul = function () { return baseMul.apply(this, arguments) * (worn('t_fang') ? 1.15 : 1); };
  const baseMine = P.mineMul; P.mineMul = function () { return baseMine.apply(this, arguments) * (worn('t_lens') ? 1.2 : 1); };
  const baseMM = P.moveMul; P.moveMul = function () { const m = baseMM ? baseMM.apply(this, arguments) : 1; return worn('t_fin') && WD.isWaterAt(P.x + 6, P.y + 10) ? m * 1.3 : m; };
  // the coil: every swing a little faster (shots set their own speed above)
  const baseSwing2 = P.startSwing;
  P.startSwing = function () { const was = P.swingT; const r = baseSwing2.apply(this, arguments); const h = P.held(); if (worn('t_coil') && P.swingT > 0 && P.swingT !== was && !(h && h.v3shot)) { P.swingT /= 1.12; P.swingDur /= 1.12; } return r; };
  // the magnet pulls drops in from farther
  const baseDrops = E.updateDrops;
  E.updateDrops = function (dt) { if (worn('t_magnet')) { const c = pc(); E.drops.forEach((d) => { const dd = Math.hypot(d.x - c.x, d.y - c.y); if (dd > 40 && dd < 156 && d.t > Math.max(0.35, d.hold || 0)) { d.x += (c.x - d.x) / dd * 240 * dt; d.y += (c.y - d.y) / dd * 240 * dt; d.vy = 0; } }); } return baseDrops.apply(this, arguments); };
  // the pebble: sometimes a monster drops one more thing
  const baseKill = E.kill;
  E.kill = function (e) { const r = baseKill.apply(this, arguments); try { const sp = e && RW.SPECIES[e.sp]; if (sp && worn('t_pebble') && sp.drops && sp.drops.length && Math.random() < 0.15) { const dr = RW.pick(sp.drops); if (RW.ITEMS[dr[0]]) E.dropItem(dr[0], 1, e.x + e.w / 2, e.y); } } catch (x) { } return r; };

  // ---- the tide tome: heal yourself and friends near you ----
  function tideHeal() {
    P.hp = Math.min(P.maxHp(), P.hp + P.maxHp() * 0.02);
    if (N && N.peers && N.transport) N.peers.forEach((p, key) => { const t = p.target; if (!t || t.dead || t.w !== WD.def.id) return; if (Math.hypot(p.x - P.x, p.y - P.y) < 15 * TS) N.send({ k: 'v3heal', to: t.pid || key }); });
    if (Math.random() < 0.5) RW.fx.burst(P.x + 6, P.y + 6, ['#5ab894', '#c0f8dc'], 3, 30, { add: true, kind: 'glow', grav: -40 });
  }
  if (N && N.on) {
    N.on('v3heal', (m) => { if (m.to !== N.pid || P.dead) return; P.hp = Math.min(P.maxHp(), P.hp + P.maxHp() * 0.02); if (Math.random() < 0.4) RW.fx.burst(P.x + 6, P.y + 6, ['#5ab894', '#c0f8dc'], 3, 30, { add: true, kind: 'glow', grav: -40 }); });
    // ---- the soulbound lantern ----
    N.on('v3link', (m) => { if (m.to !== N.pid) return; if (m.on) { P.v3link = m.f; U.toast((m.n || 'A player') + ' bound their soul to yours. You share each other\'s damage, halved.'); } else if (P.v3link === m.f) { P.v3link = null; U.toast('The soul link broke.'); } });
    N.on('v3share', (m) => { if (m.to !== N.pid || P.dead) return; sharing = true; try { P.invulnT = 0; P.hurt(Math.max(1, +m.d || 1), 0, 'soul link'); } finally { sharing = false; } });
    N.on('left', (m) => { if (P.v3link && (m.pid === P.v3link)) { P.v3link = null; U.toast('Your soul link faded: they left.'); } });
  }
  function peersList() { const out = []; if (N && N.peers) N.peers.forEach((p, key) => { const t = p.target; if (t) out.push({ pid: t.pid || key, name: String(t.n || 'Player').slice(0, 20) }); }); return out; }
  function linkPeer() { return peersList().find((p) => p.pid === P.v3link); }
  function lanternClick() {
    const L = peersList();
    if (!L.length) { U.toast('No other players are here to link with. Host a room or join one first.'); RW.audio.sfx('deny'); return; }
    const i = L.findIndex((p) => p.pid === P.v3link), next = i + 1 < L.length ? L[i + 1] : null;
    if (P.v3link) N.send({ k: 'v3link', to: P.v3link, on: 0 });
    P.v3link = next ? next.pid : null;
    if (next) { N.send({ k: 'v3link', to: next.pid, on: 1, n: P.name }); U.toast('Your soul is bound to ' + next.name + '. Click again for the next player, or to unlink.'); RW.audio.sfx('crystal'); RW.fx.burst(P.x + 6, P.y + 6, ['#5ab894', '#c0f8dc'], 14, 80, { add: true, kind: 'glow' }); }
    else U.toast('You unbound your soul.');
  }

  // ================================ DRAWING ================================
  const baseWater = WD.drawWater;
  WD.drawWater = function (g, cam, vw, vh, time) {
    const r = baseWater.apply(this, arguments);
    const ox = -Math.round(cam.x), oy = -Math.round(cam.y);
    const draw = (q) => drawShots(q, ox, oy, time), glow = (q) => drawGlow(q, ox, oy, time);
    if (RW.v3pix) { RW.v3pix(g, draw); RW.v3pix(g, glow, { add: true, soft: true }); } else { draw(g); glow(g); }
    return r;
  };
  function drawShots(g, ox, oy, time) {
    const c = pc();
    Q.forEach((s) => {
      const a = Math.atan2(s.vy, s.vx), x = s.x + ox, y = s.y + oy;
      g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(a);
      if (s.k === 'harpoon') { g.fillStyle = '#5e5848'; g.fillRect(-10, -1, 10, 2); g.fillStyle = '#d8d0b4'; g.beginPath(); g.moveTo(0, -3); g.lineTo(6, 0); g.lineTo(0, 3); g.fill(); }
      else if (s.k === 'bolt') { g.fillStyle = '#ada488'; g.fillRect(-9, -1, 9, 2); g.fillStyle = '#c8ecff'; g.fillRect(0, -1, 3, 2); }
      g.restore();
      if (s.k === 'harpoon') { g.strokeStyle = '#1f8a8a'; g.lineWidth = 1; g.beginPath(); g.moveTo(c.x + ox, c.y - 4 + oy); g.quadraticCurveTo((c.x + s.x) / 2 + ox, (c.y + s.y) / 2 + oy + 10, x, y); g.stroke(); }
    });
    FX.forEach((f) => {
      if (f.k === 'tent') {
        const b = f.e ? boxOf(f.e) : null, x = b ? b.x + b.w / 2 : f.x, y = b ? b.y + b.h : f.y, rise = Math.min(1, f.t / 0.2) * (1 - Math.max(0, (f.t - f.d + 0.3) / 0.3));
        for (let k = -1; k <= 1; k++) { g.strokeStyle = k ? '#46287a' : '#6a44b0'; g.lineWidth = 3 - Math.abs(k); g.beginPath(); g.moveTo(x + k * 6 + ox, y + 4 + oy); g.bezierCurveTo(x + k * 10 + Math.sin(time * 6 + k) * 4 + ox, y - 10 * rise + oy, x - k * 4 + ox, y - 22 * rise + oy, x + k * 2 + Math.sin(time * 5 + k) * 3 + ox, y - 30 * rise + oy); g.stroke(); }
      }
      if (f.k === 'wave') { const x = f.x + ox, y = f.y + oy; g.fillStyle = '#145a62'; for (let k = 0; k < 5; k++) g.fillRect(Math.round(x - f.dir * k * 5), Math.round(y - 12 + k * 2), 4, 12 - k * 2); }
    });
    allies.forEach((w) => { const x = Math.round(w.x + ox), y = Math.round(w.y + oy); g.fillStyle = '#3a3a46'; g.beginPath(); g.moveTo(x - 6, y + 9); g.quadraticCurveTo(x - 6, y - 8, x, y - 9); g.quadraticCurveTo(x + 6, y - 8, x + 6, y + 9); g.fill(); g.fillStyle = '#000'; g.fillRect(x - 2, y - 5, 4, 4); g.fillStyle = '#c8ccdc'; g.fillRect(x - 2, y - 4, 1, 1); g.fillRect(x + 1, y - 4, 1, 1); });
  }
  function drawGlow(g, ox, oy, time) {
    const c = pc();
    Q.forEach((s) => {
      const x = s.x + ox, y = s.y + oy, col = s.k === 'mist' ? 'rgba(184,188,204,' : s.k === 'bolt' ? 'rgba(200,236,255,' : s.k === 'harpoon' ? 'rgba(76,196,184,' : 'rgba(240,246,250,';
      const r = s.k === 'mist' ? 7 : s.k === 'harpoon' ? 3 : 5; const gr = g.createRadialGradient(x, y, 0, x, y, r * 2); gr.addColorStop(0, col + '0.95)'); gr.addColorStop(1, col + '0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 2, 0, 6.283); g.fill();
      if (s.k === 'wraith' || s.k === 'seek' || s.k === 'mist') { g.strokeStyle = col + '0.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x - s.vx * 0.03, y - s.vy * 0.03); g.stroke(); }
    });
    FX.forEach((f) => {
      if (f.k === 'beam' && f.L) { const x0 = c.x + ox, y0 = c.y - 4 + oy, x1 = x0 + Math.cos(f.a) * f.L, y1 = y0 + Math.sin(f.a) * f.L, w = 3 + Math.sin(time * 40) * 1;
        g.strokeStyle = 'rgba(20,90,98,0.9)'; g.lineWidth = w + 4; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.strokeStyle = 'rgba(184,255,240,0.9)'; g.lineWidth = Math.max(1, w - 2); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
      if (f.k === 'tear' && f.e) { const b = boxOf(f.e), x = b.x + b.w / 2 + ox, y = b.y + b.h / 2 + oy, k = f.t < 0.3 ? f.t / 0.3 : 1 - (f.t - 0.3) / 0.1;
        g.strokeStyle = 'rgba(154,116,224,' + Math.max(0, k) + ')'; g.lineWidth = f.t > 0.3 ? 3 : 1; g.beginPath(); g.moveTo(x - 10, y - 10); g.lineTo(x + 10, y + 10); g.stroke(); }
    });
    allies.forEach((w) => { const x = w.x + ox, y = w.y + oy, gr = g.createRadialGradient(x, y, 0, x, y, 14); gr.addColorStop(0, 'rgba(184,188,204,0.5)'); gr.addColorStop(1, 'rgba(184,188,204,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 14, 0, 6.283); g.fill(); });
    if (P.v3link && linkPeer()) { const x = c.x + ox, y = c.y + oy; g.strokeStyle = 'rgba(90,184,148,' + (0.35 + 0.2 * Math.sin(time * 4)) + ')'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 14, 0, 6.283); g.stroke(); }
  }

  // ================================ ABYSSITE VEINS, THE ALTAR ================================
  const addTile = (d) => { if (RW.T[d.key] != null) return RW.T[d.key]; const id = RW.TILES.length; RW.TILES.push(Object.assign({}, d, { id })); RW.T[d.key] = id; return id; };
  const T_ABY = addTile({ key: 'abyssite', name: 'Abyssite Ore', solid: true, hard: 7, time: 2.6, drop: 'abyssite_ore', colors: ['#16121e', '#1e1828', '#100c16'], tex: 'ore', ore: '#6c4aa8', light: [0.22, 0.12, 0.4] });
  const T_ALT = addTile({ key: 'levaltar', name: 'Leviathan Altar', hard: 99, decor: 'levaltar', use: 'levaltar', light: [0.1, 0.4, 0.42], lockedMsg: 'The Leviathan Altar. Press R beside it holding a Gemscale to call the Leviathan back.' });
  if (A.buildTiles && A.tiles && !A.tiles[T_ABY]) { try { A.buildTiles(); } catch (e) { } }
  A.decorExtra.levaltar = function (g, t, x, y) { const art = RW.v3art && RW.v3art.paint('lev_altar'); if (art) g.drawImage(art, x - 8, y - 16, 32, 32); };
  // the altar stands on the chamber floor
  const def = RW.WORLDS && RW.WORLDS.rock;
  if (def) {
    const baseGen = def.generate;
    def.generate = function () {
      const out = baseGen.apply(this, arguments);
      try {
        const m = out.meta, a = m.arena, W = out.W, at = (x, y) => out.fg[y * W + x];
        if (a) { const x = Math.round(a.cx); let y = Math.round(a.cy); while (y < out.H - 2 && !RW.TILES[at(x, y + 1)].solid) y++; if (!RW.TILES[at(x, y)].solid) { out.fg[y * W + x] = T_ALT; m.v3altar = { x, y }; } }
      } catch (e) { console.error(e); }
      return out;
    };
  }
  function veins() {
    const m = WD.meta, a = m && m.arena; if (!a) return;
    let n = 0; const rnd = (k) => RW.hash2(k, 77, (m.v3veinRound || 0) + 3);
    for (let k = 0; k < 900 && n < 34; k++) {
      const an = rnd(k) * 6.283, rr = 1.02 + rnd(k + 1000) * 0.12, x = Math.round(a.cx + Math.cos(an) * a.rx * rr), y = Math.round(a.cy + Math.sin(an) * a.ry * rr);
      const id = WD.get(x, y), t = RW.TILES[id]; if (!t || !t.solid || t.chest || t.decor || (t.hard || 0) >= 7 || id === T_ABY) continue;
      if (RW.v2placed && RW.v2placed.has && RW.v2placed.has(x + ',' + y)) continue;
      WD.setTile(x, y, T_ABY); n++;
      for (let j = 0; j < 2; j++) { const x2 = x + (rnd(k * 7 + j) < 0.5 ? -1 : 1), y2 = y + (rnd(k * 9 + j) < 0.5 ? 0 : 1), t2 = RW.TILES[WD.get(x2, y2)]; if (t2 && t2.solid && !t2.chest && !t2.decor && (t2.hard || 0) < 7) { WD.setTile(x2, y2, T_ABY); n++; } }
    }
    m.v3veinRound = (m.v3veinRound || 0) + 1;
  }
  E.useHandlers.levaltar = function () {
    if (!inRock()) return;
    if (!RW.state.bosses.rock) { U.toast('The altar is cold. The Leviathan still lives somewhere in this chamber.'); return; }
    if (E.boss) { U.toast('The Leviathan is already here!'); return; }
    if (!P.has('leviathan_scale', 1)) { U.toast('The altar wants a Gemscale. Lay one on it to call the Leviathan back.'); RW.audio.sfx('deny'); return; }
    P.remove('leviathan_scale', 1); rematch(true);
  };
  function rematch(mine) {
    RW.state.bosses.rock = false; RW.v3rematch = true;
    RW.fx.shake(6, 1.5); RW.fx.flash('#0c3a40', 0.6); RW.audio.sfx('roar');
    U.banner('The altar drinks the Gemscale', 'Something enormous stirs below the water...');
    if (mine && N && N.send) N.send({ k: 'v3rematch' });
    setTimeout(() => { E.maybeSpawnBoss && E.maybeSpawnBoss(); }, 1200);
  }
  if (N && N.on) N.on('v3rematch', () => { if (inRock() && !E.boss) rematch(false); });

  // ================================ THE KILL ================================
  const DROPS = ['riftreaper', 'trenchfall', 'gravewake', 'wraithstring', 'drowneye', 'codex', 'tidetome'];
  const baseDeath = E.bossDeath;
  E.bossDeath = function (b) {
    const isLev = b && b.sp === LEV && inRock();
    const c = isLev ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : null;
    const r = baseDeath.apply(this, arguments);
    if (isLev) {
      const give = (id, n) => E.dropItem(id, n || 1, c.x + RW.rand(-20, 20), c.y - 20);
      const prize = RW.pick(DROPS); give(prize);
      const first = !P.flags.v3levFirst; P.flags.v3levFirst = 1; P.flags.v3levKills = (P.flags.v3levKills || 0) + 1;
      if (first) { give('krait_pearl'); give('glow_radiant_' + RW.pick(['amber', 'cyan', 'green', 'violet', 'white', 'ember'])); }
      if (Math.random() < 0.25) give('t_fang');
      setTimeout(() => { U.banner('The Leviathan sinks', 'It dropped ' + RW.ITEMS[prize].name + (first ? ', a Krait Pearl and a Radiant Glowstone' : '') + '. Abyssite veins glow in the chamber walls.'); }, 2800);
      setTimeout(() => { if (inRock()) veins(); }, 2600);
      RW.v3rematch = false;
    }
    return r;
  };

  // ================================ THE PET KRAIT ================================
  const baseUse = P.useItem;
  P.useItem = function (it) {
    if (it && it.v3pet) { P.flags.v3pet = !P.flags.v3pet; U.toast(P.flags.v3pet ? 'Your sea krait slips out of the pearl.' : 'Your sea krait curls back into the pearl.'); RW.audio.sfx('crystal'); RW.game.saveSoon(); return; }
    return baseUse.apply(this, arguments);
  };
  const pets = new Map(); // key -> { pts }
  const petBody = (st, x, y, dt) => { if (!st.pts) { st.pts = []; for (let k = 0; k < 16; k++) st.pts.push({ x, y }); } const h = st.pts[0]; h.x = RW.lerp(h.x, x, Math.min(1, dt * 4)); h.y = RW.lerp(h.y, y, Math.min(1, dt * 4)); for (let k = 1; k < st.pts.length; k++) { const p = st.pts[k], q = st.pts[k - 1], dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy) || 1; if (d > 2.6) { p.x = q.x + dx / d * 2.6; p.y = q.y + dy / d * 2.6; } } };
  let lastT = now(), petSent = null;
  function drawPet(g, st, ox, oy, time) {
    const pts = st.pts; if (!pts) return;
    for (let k = pts.length - 1; k >= 0; k--) { const p = pts[k], r = Math.max(1, 2.6 - k * 0.1), x = Math.round(p.x + ox + Math.sin(time * 4 + k * 0.6) * 0.6), y = Math.round(p.y + oy); g.fillStyle = '#0a0810'; g.beginPath(); g.arc(x, y, r + 1, 0, 6.283); g.fill(); g.fillStyle = Math.floor(k / 2) % 2 ? '#1f6a70' : '#16141e'; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); }
    const t = pts[pts.length - 1], h = pts[0], a = Math.atan2(h.y - pts[1].y, h.x - pts[1].x);
    g.fillStyle = '#1f8a8a'; g.beginPath(); g.moveTo(t.x + ox, t.y + oy); g.lineTo(t.x + ox - 4, t.y + oy - 3); g.lineTo(t.x + ox - 3, t.y + oy + 3); g.fill();
    const hx = Math.round(h.x + ox), hy = Math.round(h.y + oy); g.fillStyle = '#0a0810'; g.beginPath(); g.arc(hx, hy, 4, 0, 6.283); g.fill(); g.fillStyle = '#16141e'; g.beginPath(); g.arc(hx, hy, 3, 0, 6.283); g.fill();
    g.fillStyle = '#4cc4b8'; g.fillRect(Math.round(hx + Math.cos(a) * 1.5), Math.round(hy - 1), 1, 1); g.fillStyle = '#1f8a8a'; g.fillRect(hx - 1, hy - 5, 2, 2);
  }
  const baseWater2 = WD.drawWater;
  WD.drawWater = function (g, cam, vw, vh, time) {
    const r = baseWater2.apply(this, arguments);
    const t = now(), dt = Math.min(0.05, t - lastT); lastT = t;
    const ox = -Math.round(cam.x), oy = -Math.round(cam.y);
    const list = [];
    if (P.flags && P.flags.v3pet && P.has('krait_pearl') && !P.dead) { const st = pets.get('me') || {}; pets.set('me', st); petBody(st, P.x + 6 - P.face * 14, P.y + 2 + Math.sin(t * 2) * 3, dt); list.push(st); } else pets.delete('me');
    if (N && N.peers) N.peers.forEach((p, key) => { const st = pets.get(key); if (!st || !st.on || !p.target || p.target.w !== WD.def.id) return; petBody(st, p.x + 6 - (p.target.f || 1) * 14, p.y + 2 + Math.sin(t * 2) * 3, dt); list.push(st); });
    if (list.length) { const fn = (q) => list.forEach((st) => drawPet(q, st, ox, oy, time)); if (RW.v3pix) RW.v3pix(g, fn); else fn(g); }
    return r;
  };
  if (N && N.on) {
    setInterval(() => { if (!N.transport) return; const on = !!(P.flags && P.flags.v3pet && P.has('krait_pearl')); if (on !== petSent || Math.random() < 0.3) { petSent = on; N.send({ k: 'v3pet', on }); } }, 2000);
    N.on('v3pet', (m) => { if (typeof m.f !== 'string') return; const st = pets.get(m.f) || {}; st.on = !!m.on; pets.set(m.f, st); });
    N.on('left', (m) => pets.delete(m.pid));
  }
  RW.v3loot = { DROPS, veins, rematch };
})(window.RW);
