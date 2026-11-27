// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 19: the Leviathan's and Abyssite's gear, dressed up for no reason but to look good.
//  * Tiny decorations painted onto every Leviathan drop, core craft, caged core, Abyssite piece, the altar, the pearl
//    and the fang: barnacles, little skulls, runes, chains, hanging charms and cracked gems.
//  * A line of grim legend under each one's tooltip.
//  * Each weapon has its own kill effect, its own hit sound, a shake (and on big kills a flash), and a small idle
//    animation while you just hold it (drips, wisps, embers, a blinking eye...).
(function (RW) {
  'use strict';
  const VA = RW.v3art, E = RW.ent, P = RW.player, U = RW.ui;
  if (!VA || !E || !P) return;

  // ============================ 1. decorations ============================
  const BON = ['#3e3a30', '#5e5848', '#857e66', '#ada488', '#d8d0b4'];
  const BLK = ['#0e0c16', '#1a1726', '#2a2540', '#3e3860', '#5a5288'];
  const VIO = ['#46287a', '#6a44b0', '#9a74e0', '#d4c0ff'];
  const TEA = ['#145a62', '#1f8a8a', '#4cc4b8', '#b8fff0'];
  const GHO = ['#98a6b0', '#c4d0d8', '#f0f6fa'];
  const EMB = ['#6a1e14', '#9a3220', '#d0603a', '#ffb080'];
  const ICE = ['#1a4868', '#2e70a0', '#62a8d8', '#c8ecff'];
  const HEA = ['#185040', '#2a7a5e', '#5ab894', '#c0f8dc'];
  const RUST = ['#3a2a20', '#5a3e2a'];
  const DPAL = [].concat(BON, BLK, VIO, TEA, GHO, EMB, ICE, HEA, RUST, ['#0a0810', '#ffffff']);
  const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const circ = (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); };
  // a little skull: bone dome, two dark eyes, a jaw
  function skull(g, x, y, s) {
    s = s || 1;
    circ(g, x, y, 2.8 * s, BON[3]); rect(g, x - 2 * s, y + 1.4 * s, 4 * s, 2.2 * s, BON[2]);
    rect(g, x - 1.8 * s, y - 0.6 * s, 1.4 * s, 1.6 * s, BLK[0]); rect(g, x + 0.5 * s, y - 0.6 * s, 1.4 * s, 1.6 * s, BLK[0]);
    rect(g, x - 1.2 * s, y + 2.6 * s, 0.8, 1, BON[1]); rect(g, x + 0.4 * s, y + 2.6 * s, 0.8, 1, BON[1]);
    rect(g, x - 1.6 * s, y - 2.4 * s, 2, 1, BON[4]);
  }
  // a barnacle: a pale cone with a dark mouth
  function barnacle(g, x, y, r) { r = r || 2.2; circ(g, x, y, r, BON[2]); circ(g, x - 0.5, y - 0.5, r * 0.6, BON[4]); rect(g, x - 0.6, y - 0.4, 1.4, 1.2, BLK[1]); }
  // a chain: links alternating light and dark from one point to another
  function chain(g, x0, y0, x1, y1) {
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 2.4));
    for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; g.fillStyle = i % 2 ? BLK[4] : BLK[2]; g.fillRect(Math.round(x - 1), Math.round(y - 1), 2, 2); }
  }
  // a charm on a string: a cord, then a bead, gem or tooth
  function charm(g, x, y, len, cols, kind) {
    g.strokeStyle = BON[1]; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + len); g.stroke();
    const by = y + len + 2;
    if (kind === 'tooth') { g.fillStyle = BON[3]; g.beginPath(); g.moveTo(x - 1.8, by - 1.5); g.lineTo(x + 1.8, by - 1.5); g.lineTo(x, by + 3.5); g.fill(); return; }
    if (kind === 'skull') { skull(g, x, by + 1, 0.8); return; }
    circ(g, x, by, 2.4, cols[0]); circ(g, x - 0.4, by - 0.4, 1.5, cols[1]); rect(g, x - 1, by - 1.4, 1, 1, cols[2] || '#ffffff');
  }
  // a cracked gem: a little diamond with a dark crack through it
  function gem(g, x, y, cols, r) {
    r = r || 3; g.fillStyle = cols[0]; g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.8, y); g.lineTo(x, y + r); g.lineTo(x - r * 0.8, y); g.fill();
    g.fillStyle = cols[2]; g.beginPath(); g.moveTo(x, y - r); g.lineTo(x - r * 0.8, y); g.lineTo(x, y); g.fill();
    g.strokeStyle = BLK[0]; g.lineWidth = 0.9; g.beginPath(); g.moveTo(x - 1, y - r + 1); g.lineTo(x + 0.6, y); g.lineTo(x - 0.4, y + r - 1); g.stroke();
  }
  // a rune: one of a few little glyphs, cut in light
  const GLYPH = [[[0, 0, 0, 4], [0, 0, 2, 1], [0, 2, 2, 3]], [[1, 0, 1, 4], [0, 1, 2, 3]], [[0, 0, 2, 4], [2, 0, 0, 4]], [[0, 4, 1, 0], [1, 0, 2, 4], [0.5, 2, 1.5, 2]], [[0, 0, 2, 0], [1, 0, 1, 4], [0, 4, 2, 4]]];
  function rune(g, x, y, col, k) { g.strokeStyle = col; g.lineWidth = 1.1; g.lineCap = 'square'; g.beginPath(); GLYPH[(k || 0) % GLYPH.length].forEach(([a, b, c, d]) => { g.moveTo(x + a, y + b); g.lineTo(x + c, y + d); }); g.stroke(); }
  function runes(g, pts, col) { pts.forEach(([x, y], i) => rune(g, x, y, col, i)); }

  const D = {
    riftreaper(g) { skull(g, 12, 42); barnacle(g, 22, 35); barnacle(g, 27, 31, 1.8); charm(g, 33, 26, 7, VIO, 'gem'); gem(g, 41, 15, VIO, 2.6); runes(g, [[16, 22], [24, 17]], VIO[3]); },
    trenchfall(g) { barnacle(g, 13, 37); barnacle(g, 18, 32, 1.8); chain(g, 24, 25, 21, 34); charm(g, 21, 34, 1, BON, 'skull'); rune(g, 10, 40, TEA[3], 2); },
    gravewake(g) { charm(g, 31, 23, 6, BON, 'skull'); barnacle(g, 35, 17); barnacle(g, 41, 14, 1.8); barnacle(g, 9, 37, 1.8); gem(g, 18, 31, TEA, 2.4); },
    wraithstring(g) { charm(g, 33, 30, 6, GHO, 'gem'); barnacle(g, 17, 9, 1.8); barnacle(g, 36, 43, 1.8); runes(g, [[21, 13], [28, 38]], GHO[2]); },
    drowneye(g) { charm(g, 30, 17, 6, TEA, 'gem'); charm(g, 35, 20, 5, BON, 'tooth'); barnacle(g, 15, 36); barnacle(g, 21, 31, 1.8); chain(g, 25, 26, 29, 22); },
    codex(g) { barnacle(g, 11, 11); barnacle(g, 37, 38, 1.8); skull(g, 13, 37, 0.9); runes(g, [[15, 17], [15, 24], [32, 14]], VIO[3]); charm(g, 24, 41, 2, VIO, 'gem'); },
    tidetome(g) { barnacle(g, 15, 8, 1.8); barnacle(g, 39, 41, 1.8); runes(g, [[17, 36], [34, 9]], TEA[3]); gem(g, 41, 24, HEA, 2.4); },
    ossuary(g) { barnacle(g, 14, 40); barnacle(g, 42, 40); gem(g, 19, 20, VIO, 2.4); gem(g, 41, 20, VIO, 2.4); rune(g, 27, 11, EMB[3], 3); chain(g, 46, 24, 44, 32); },
    silentfathom(g) { charm(g, 24, 29, 6, ICE, 'gem'); barnacle(g, 36, 20); barnacle(g, 12, 34, 1.8); runes(g, [[30, 12]], ICE[3]); skull(g, 42, 40, 0.8); },
    veilstaff(g) { charm(g, 34, 18, 7, BON, 'tooth'); charm(g, 40, 20, 6, GHO, 'gem'); barnacle(g, 15, 37); barnacle(g, 21, 31, 1.8); runes(g, [[11, 38]], GHO[2]); },
    soullantern(g) { skull(g, 27, 3, 0.8); barnacle(g, 17, 31, 1.8); barnacle(g, 37, 15, 1.8); runes(g, [[21, 9], [32, 9]], HEA[3]); charm(g, 18, 18, 5, HEA, 'gem'); },
    core_knight(g) { cage(g, EMB); }, core_archer(g) { cage(g, ICE); }, core_mage(g) { cage(g, GHO); }, core_healer(g) { cage(g, HEA); },
    abyssite_ore(g) { skull(g, 17, 30, 0.9); g.strokeStyle = BLK[0]; g.lineWidth = 1; g.beginPath(); g.moveTo(30, 12); g.lineTo(27, 19); g.lineTo(31, 24); g.stroke(); gem(g, 34, 33, VIO, 2.2); barnacle(g, 12, 18, 1.6); },
    abyssite_bar(g) { skull(g, 23, 21, 0.8); runes(g, [[11, 28], [19, 28], [27, 28]], VIO[3]); g.strokeStyle = BLK[0]; g.lineWidth = 1; g.beginPath(); g.moveTo(34, 18); g.lineTo(36, 24); g.stroke(); },
    abyssite_helm(g) { gem(g, 24, 15, VIO, 2.6); runes(g, [[14, 22], [32, 22]], VIO[3]); barnacle(g, 9, 13, 1.6); chain(g, 40, 12, 42, 22); charm(g, 42, 22, 2, BON, 'tooth'); },
    abyssite_mail(g) { skull(g, 24, 15, 0.9); runes(g, [[11, 13], [35, 13]], VIO[3]); chain(g, 12, 33, 36, 33); gem(g, 24, 33, VIO, 2.2); },
    abyssite_pick(g) { gem(g, 33, 13, VIO, 2.4); runes(g, [[14, 36], [20, 30]], VIO[3]); charm(g, 27, 25, 5, BON, 'skull'); },
    glow_abyssal(g) { skull(g, 24, 15, 0.8); runes(g, [[11, 26], [34, 26], [23, 40]], VIO[3]); },
    lev_altar(g) { skull(g, 17, 37); skull(g, 38, 37); runes(g, [[12, 31], [21, 31], [31, 31], [40, 31]], TEA[3]); barnacle(g, 20, 27, 1.6); barnacle(g, 33, 27, 1.6); },
    krait_pearl(g) { barnacle(g, 13, 30, 1.8); barnacle(g, 38, 21, 1.8); rune(g, 22, 40, TEA[3], 1); },
    t_fang(g) { charm(g, 17, 5, 2, EMB, 'gem'); charm(g, 31, 5, 2, BON, 'tooth'); g.strokeStyle = BLK[0]; g.lineWidth = 1; g.beginPath(); g.moveTo(22, 20); g.lineTo(25, 27); g.lineTo(23, 33); g.stroke(); },
    chest_abyssal_chest(g) { skull(g, 24, 29, 0.9); runes(g, [[10, 14], [36, 14]], VIO[3]); barnacle(g, 9, 40, 1.6); barnacle(g, 40, 40, 1.6); },
  };
  // the caged cores: a tag hanging off the cage, barnacles on its foot, runes round its top ring
  function cage(g, cols) { charm(g, 37, 14, 6, cols, 'gem'); barnacle(g, 14, 40, 1.8); barnacle(g, 34, 41, 1.6); runes(g, [[18, 8], [28, 8]], cols[3] || cols[2]); }
  // the repainted Abyssite pickaxe (v3s18) is 32 across: a cracked gem in its socket, runes on the haft, a skull charm
  RW.v3pickDeco = { pal: DPAL, abyssite_pick(g) { gem(g, 18, 14, VIO, 2.4); runes(g, [[4, 24], [8, 20]], VIO[3]); charm(g, 12, 20, 3, BON, 'skull'); } };
  Object.keys(D).forEach((id) => { const p = VA.painters[id]; if (p) { p.deco = D[id]; p.decoPal = DPAL; } });
  if (VA.clear) VA.clear();
  if (RW.v3pixClear) RW.v3pixClear(); else Object.keys(RW.art.icons || {}).forEach((k) => delete RW.art.icons[k]);

  // ============================ 2. legends ============================
  const LORE = {
    riftreaper: 'Carved from the spine of the thing that ate the first moon. It still remembers the taste.',
    trenchfall: 'Forged at the bottom of the trench, where nothing should be able to swing a hammer.',
    gravewake: 'Every harpoon it fires drags something back with it. Not always what you aimed at.',
    wraithstring: 'Strung with the last breath of a drowned queen. On quiet nights it hums her lullaby.',
    drowneye: 'The Leviathan saw the shell crack with this eye. It has not blinked since.',
    codex: 'Its pages are wet and the ink never dries. Something inside keeps writing.',
    tidetome: 'Every tide that ever turned is written here, and every one of them will turn again.',
    ossuary: 'It held a sunken warship in place for a thousand years. The crew are still aboard.',
    silentfathom: 'No bolt it fires has ever made a sound. Neither have its victims.',
    veilstaff: 'The hood was never empty. You just cannot see who is wearing it.',
    soullantern: 'Whatever burns inside was once someone. It is grateful for the company.',
    core_knight: 'A knight swore to guard the Leviathan forever. Forever turned out to be very long.',
    core_archer: 'Those two eyes never stopped looking for a target. Do not stand in front of the cage.',
    core_mage: 'The mage left her body behind, but her hood would not let go of her.',
    core_healer: 'It sleeps. If it wakes, it will ask where everyone went.',
    abyssite_ore: 'Black stone that grew in the dark around the Leviathan\'s heartbeat.',
    abyssite_bar: 'Smelted cold. Abyssite has never once been warm.',
    abyssite_helm: 'Its horns were grown, not forged. Nobody knows what from.',
    abyssite_mail: 'The skull on the chest was the smith\'s. He asked for it to be there.',
    abyssite_pick: 'It broke the shell open once. It would like to do it again.',
    glow_abyssal: 'A light that makes the dark around it darker.',
    krait_pearl: 'The little krait was born the day the Leviathan fell. It has never left the pearl.',
    t_fang: 'Pulled from the Leviathan\'s jaw. It grows back. The jaw, not the fang.',
    abyssal_chest: 'Whatever you put in, something else is already in there with it.',
  };
  RW.v3lore = LORE;
  if (U && U.tipFor) {
    const st = document.createElement('style');
    st.textContent = '#tooltip i.v3lore { color: #a89ac8; font-style: italic; opacity: .9; margin-top: 4px; border-top: 1px solid rgba(168,154,200,.25); padding-top: 4px; }';
    document.head.appendChild(st);
    const baseTip = U.tipFor;
    U.tipFor = function (it) {
      const r = baseTip.apply(this, arguments);
      const t = document.getElementById('tooltip'); if (!t || !it) return r;
      // trinkets are not body armour: say what they are
      if (it.slot && /^trinket/.test(it.slot)) t.querySelectorAll('i').forEach((i) => { if (/^Body armor · armor/.test(i.textContent)) i.textContent = 'Trinket · right-click to wear'; });
      const lore = LORE[it.id]; if (lore) { const i = document.createElement('i'); i.className = 'v3lore'; i.textContent = '"' + lore + '"'; t.appendChild(i); }
      return r;
    };
  }

  // ============================ 3. kill effects, hit sounds, shake and flash ============================
  const AU = RW.audio;
  function sfx(fn) { try { if (!AU || !AU.ctx || AU.muted || !AU.sfxGain) return; fn(AU.ctx, AU.sfxGain, AU.ctx.currentTime); } catch (e) { /* no sound */ } }
  function tone(c, out, t, f0, f1, dur, type, vol) { const o = c.createOscillator(), gn = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(gn); gn.connect(out); o.start(t); o.stop(t + dur + 0.02); }
  function hiss(c, out, t, dur, freq, q, vol) { if (!AU.noiseBuf) return; const s = c.createBufferSource(), f = c.createBiquadFilter(), gn = c.createGain(); s.buffer = AU.noiseBuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(f); f.connect(gn); gn.connect(out); s.start(t); s.stop(t + dur); }
  const SOUND = {
    reap: (c, o, t) => { hiss(c, o, t, 0.16, 3200, 2, 0.25); tone(c, o, t, 520, 180, 0.18, 'sawtooth', 0.05); },
    crush: (c, o, t) => { tone(c, o, t, 90, 40, 0.3, 'triangle', 0.3); hiss(c, o, t, 0.2, 400, 1, 0.35); },
    thunk: (c, o, t) => { tone(c, o, t, 160, 70, 0.14, 'square', 0.1); hiss(c, o, t + 0.02, 0.12, 900, 2, 0.2); },
    wail: (c, o, t) => { tone(c, o, t, 880, 620, 0.3, 'sine', 0.06); tone(c, o, t + 0.03, 1320, 900, 0.25, 'sine', 0.03); },
    zap: (c, o, t) => { tone(c, o, t, 1400, 300, 0.12, 'square', 0.05); hiss(c, o, t, 0.08, 5000, 3, 0.12); },
    squelch: (c, o, t) => { hiss(c, o, t, 0.18, 300, 4, 0.3); tone(c, o, t, 140, 60, 0.15, 'sine', 0.12); },
    clang: (c, o, t) => { tone(c, o, t, 330, 300, 0.4, 'triangle', 0.14); tone(c, o, t, 495, 470, 0.3, 'sine', 0.06); hiss(c, o, t, 0.1, 2000, 1, 0.2); },
    tick: (c, o, t) => { tone(c, o, t, 2400, 1800, 0.06, 'square', 0.04); hiss(c, o, t, 0.06, 7000, 4, 0.12); },
    hush: (c, o, t) => { hiss(c, o, t, 0.35, 1200, 0.6, 0.18); },
    chip: (c, o, t) => { tone(c, o, t, 700, 500, 0.08, 'square', 0.06); hiss(c, o, t, 0.06, 3000, 2, 0.15); },
    knell: (c, o, t) => { tone(c, o, t, 110, 100, 0.9, 'sine', 0.2); tone(c, o, t, 220, 205, 0.7, 'triangle', 0.06); },
  };
  const at = (e) => ({ x: e.x + (e.w || 12) / 2, y: e.y + (e.h || 12) / 2 });
  const spawn = (o) => RW.fx.spawn(o);
  const R = (a, b) => a + Math.random() * (b - a);
  const KILL = {
    souls(x, y, w) { for (let i = 0; i < 7; i++) spawn({ x: x + R(-6, 6), y: y + R(-6, 6), vx: R(-14, 14), vy: R(-70, -35), life: R(0.9, 1.4), color: RW.pick(w.cols), add: true, kind: 'glow', size: 2, drag: 0.97 }); RW.fx.ring(x, y, w.cols[0], 22, 0.4, 2); },
    quake(x, y, w) { RW.fx.ring(x, y, w.cols[0], 36, 0.45, 3); RW.fx.ring(x, y, w.cols[1], 22, 0.3, 2); RW.fx.debris(x, y, ['#2a2540', '#3e3860', '#857e66'], 14); },
    ink(x, y, w) { RW.fx.burst(x, y, ['#0e0c16', '#1a1726', w.cols[0]], 22, 90, { grav: 120, life: 0.9, size: 2 }); },
    ghost(x, y, w) { spawn({ x, y, vx: 0, vy: -26, life: 1.6, color: '#f0f6fa', add: true, kind: 'glow', size: 4, drag: 0.99 }); RW.fx.burst(x, y, w.cols, 10, 40, { add: true, kind: 'glow', life: 1 }); },
    eyeflash(x, y, w) { RW.fx.ring(x, y, w.cols[0], 30, 0.35, 2); RW.fx.ring(x, y, '#ffffff', 12, 0.2, 1); RW.fx.burst(x, y, w.cols, 12, 120, { add: true, kind: 'glow' }); },
    tentacles(x, y, w) { for (let k = 0; k < 6; k++) { const a = k * 1.047 + R(-0.2, 0.2); for (let j = 1; j < 6; j++) spawn({ x: x + Math.cos(a) * j * 4, y: y + Math.sin(a) * j * 4, vx: Math.cos(a) * 10, vy: Math.sin(a) * 10 + j * 2, life: 0.5 + j * 0.08, color: j % 2 ? w.cols[0] : '#1a1726', size: 2 }); } },
    embers(x, y, w) { RW.fx.burst(x, y, w.cols, 18, 110, { grav: -40, add: true, kind: 'glow', life: 1 }); RW.fx.debris(x, y, ['#d8d0b4', '#ada488'], 8); },
    shatter(x, y, w) { for (let i = 0; i < 14; i++) { const a = R(0, 6.28), s = R(60, 160); spawn({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: R(0.4, 0.7), color: RW.pick(w.cols.concat(['#ffffff'])), size: 2, grav: 200 }); } },
    mist(x, y, w) { for (let i = 0; i < 12; i++) spawn({ x: x + R(-8, 8), y: y + R(-8, 8), vx: R(-20, 20), vy: R(-20, 5), life: R(1, 1.6), color: RW.pick(w.cols), add: true, kind: 'glow', size: 3, drag: 0.95 }); },
    shards(x, y, w) { RW.fx.burst(x, y, w.cols, 16, 130, { grav: 260, life: 0.7, size: 2 }); },
  };
  const FXW = {
    riftreaper: { hit: 'reap', kill: 'souls', cols: VIO.slice(1), shake: [2.5, 0.14], idle: 'wisp', tip: [0.2, 0.5] },
    trenchfall: { hit: 'crush', kill: 'quake', cols: TEA.slice(1), shake: [4, 0.2], big: true, idle: 'bubble', tip: [0.7, 0.25] },
    gravewake: { hit: 'thunk', kill: 'ink', cols: TEA.slice(1), shake: [1.5, 0.1], idle: 'drip', tip: [0.9, 0.3] },
    wraithstring: { hit: 'wail', kill: 'ghost', cols: GHO, shake: [1, 0.08], idle: 'mist', tip: [0.5, 0.15] },
    drowneye: { hit: 'zap', kill: 'eyeflash', cols: TEA.slice(1), shake: [1, 0.08], idle: 'blink', tip: [0.8, 0.17] },
    codex: { hit: 'squelch', kill: 'tentacles', cols: VIO.slice(1), shake: [1.5, 0.1], idle: 'runes', tip: [0.5, 0.45] },
    ossuary: { hit: 'clang', kill: 'embers', cols: EMB.slice(1), shake: [4, 0.22], big: true, idle: 'ember', tip: [0.6, 0.6] },
    silentfathom: { hit: 'tick', kill: 'shatter', cols: ICE.slice(1), shake: [1, 0.06], idle: 'frost', tip: [0.75, 0.3] },
    veilstaff: { hit: 'hush', kill: 'mist', cols: GHO, shake: [1, 0.08], idle: 'mist', tip: [0.82, 0.2] },
    soullantern: { hit: 'hush', kill: 'souls', cols: HEA.slice(1), shake: [0, 0], idle: 'souls', tip: [0.55, 0.5] },
    abyssite_pick: { hit: 'chip', kill: 'shards', cols: VIO.slice(1), shake: [1.5, 0.1], idle: 'spark', tip: [0.75, 0.25] },
  };
  RW.v3loreFx = FXW;
  let lastSnd = 0;
  const baseDamage = E.damage;
  E.damage = function (e, d) {
    const h = P.held && P.held(), w = h && FXW[h.id];
    if (!w || !e || e.dead || P.dead) return baseDamage.apply(this, arguments);
    const c = at(e), near = Math.hypot(c.x - (P.x + P.w / 2), c.y - (P.y + P.h / 2)) < 520;
    const r = baseDamage.apply(this, arguments);
    if (!near) return r;
    const now = performance.now();
    if (now - lastSnd > 70) { lastSnd = now; const s = SOUND[w.hit]; if (s) sfx(s); }
    if (w.shake[0]) RW.fx.shake(w.shake[0], w.shake[1]);
    if (e.dead || e.hp <= 0) {
      try { KILL[w.kill](c.x, c.y, w); } catch (er) { /* skip */ }
      sfx(SOUND.knell);
      if (w.big || (e.maxhp || 0) >= 300) { RW.fx.flash(w.cols[1] || '#ffffff', 0.12); RW.fx.shake(w.big ? 5 : 3, 0.3); }
    }
    return r;
  };

  // ============================ 4. idle in hand ============================
  // the held picture's tip is found where it is drawn, then turned back into a place in the world
  const tipAt = new WeakMap();
  const baseDP = E.drawPlayer;
  E.drawPlayer = function (g, cam, p, look, opts) {
    const w = opts && opts.item && FXW[opts.item];
    if (!w || !g.getTransform || !cam) return baseDP.apply(this, arguments);
    const M0 = g.getTransform(), raw = g.drawImage; let found = null;
    g.drawImage = function (img, x, y, ww, hh) {
      if (!found && arguments.length === 5 && img && img.__iconId === opts.item) {
        const pt = this.getTransform().transformPoint(new DOMPoint(x + w.tip[0] * ww, y + w.tip[1] * hh));
        const q = M0.inverse().transformPoint(pt); found = { x: q.x + cam.x, y: q.y + cam.y };
      }
      return raw.apply(this, arguments);
    };
    try { return baseDP.apply(this, arguments); } finally { g.drawImage = raw; if (found && p) tipAt.set(p, found); }
  };
  let idleT = 0;
  const IDLE = {
    wisp: (t, w) => spawn({ x: t.x + R(-2, 2), y: t.y + R(-2, 2), vx: R(-6, 6), vy: R(-22, -10), life: 0.9, color: RW.pick(w.cols), add: true, kind: 'glow', size: 1 }),
    bubble: (t) => spawn({ x: t.x + R(-3, 3), y: t.y, vx: R(-4, 4), vy: R(-30, -18), life: 1.1, color: '#b8fff0', size: 1, drag: 0.99 }),
    drip: (t, w) => spawn({ x: t.x, y: t.y + 1, vx: 0, vy: 6, grav: 260, life: 0.7, color: RW.pick([w.cols[0], '#7ab8d8']), size: 1 }),
    mist: (t, w) => spawn({ x: t.x + R(-3, 3), y: t.y + R(-2, 2), vx: R(-8, 8), vy: R(-6, 4), life: 1.3, color: RW.pick(w.cols), add: true, kind: 'glow', size: 2, drag: 0.94 }),
    blink: (t, w, now) => { if ((now / 1000) % 2.6 < 0.12) RW.fx.ring(t.x, t.y, w.cols[2] || '#ffffff', 5, 0.18, 1); else if (Math.random() < 0.4) spawn({ x: t.x + R(-2, 2), y: t.y + R(-2, 2), life: 0.3, color: '#ffffff', add: true, kind: 'glow', size: 1 }); },
    runes: (t, w) => RW.fx.text(t.x + R(-6, 6), t.y - 4, RW.pick(['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᛉ', 'ᛟ']), w.cols[1]),
    ember: (t, w) => spawn({ x: t.x + R(-3, 3), y: t.y, vx: R(-8, 8), vy: R(-40, -20), life: 0.8, color: RW.pick(w.cols), add: true, kind: 'glow', size: 1 }),
    frost: (t, w) => spawn({ x: t.x + R(-4, 4), y: t.y + R(-3, 3), vx: R(-3, 3), vy: R(4, 12), life: 0.9, color: RW.pick(w.cols.concat(['#ffffff'])), size: 1 }),
    souls: (t, w) => spawn({ x: t.x + R(-2, 2), y: t.y + R(-2, 2), vx: R(-10, 10), vy: R(-14, -4), life: 1.2, color: RW.pick(w.cols), add: true, kind: 'glow', size: 2, drag: 0.96 }),
    spark: (t, w) => spawn({ x: t.x, y: t.y, vx: R(-30, 30), vy: R(-40, -10), grav: 200, life: 0.4, color: RW.pick(w.cols), add: true, kind: 'glow', size: 1 }),
  };
  const RATE = { wisp: 6, bubble: 2.5, drip: 1.6, mist: 3, blink: 6, runes: 0.7, ember: 5, frost: 3, souls: 3, spark: 1.2 };
  const baseUpd = E.update || null;
  function idle(dt) {
    const h = P.held && P.held(), w = h && FXW[h.id];
    if (!w || P.dead || !(RW.game && RW.game.playing) || P.swingT > 0) return;
    const t = tipAt.get(P); if (!t) return;
    idleT += dt * (RATE[w.idle] || 2);
    while (idleT >= 1) { idleT -= 1; try { IDLE[w.idle](t, w, performance.now()); } catch (e) { /* skip */ } }
  }
  const baseUpdP = P.update;
  P.update = function (dt) { const r = baseUpdP.apply(this, arguments); idle(dt || 0.016); return r; };
  void baseUpd;
})(window.RW);
