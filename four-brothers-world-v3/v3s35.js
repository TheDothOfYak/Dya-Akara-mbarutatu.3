// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 35: floating islands, sea plants everywhere, a brewing cauldron and potions.
//  * Floating islands (new worlds): every loose chunk of rock left floating in the caves and the water layers (the old
//    little rock ledges too) is rebuilt as an island that is wide on top and tapers smoothly to a point underneath (one
//    step at most per row, so it reads as slopes), made of the layer's own rock with dirt, clay, the layer's common
//    ground and a little ore, soil on top, roots hanging from below. Mostly 8-14 wide, a few big ones 20-30 wide.
//  * Sea plants on every flooded floor (and mosses on flooded ceilings), themed per layer:
//      Sea at the top: kelp, sea grass, sea lettuce · Coral: fan coral, sponges, anemones · Kelp: giant kelp,
//      bladderwrack, meadow grass · Scald: ember weed, ash tubes, smoker moss · Bone: bone coral, marrow lilies,
//      grave moss · Void: null fronds, star polyps, drift moss · everywhere: shells, starfish, glow bulbs.
//    Harvest them (left click) for brewing.
//  * Brewing Cauldron (stone 20 + iron bar 3 + glow mushroom 2, by hand; one stands by Slagg's forge in Stalagmere).
//    Eight potions, 5 minutes each. Drinking the same one again adds 5 more minutes; different ones run together.
//    Active potions show under your health (`P.flags.v3buffs` {id: seconds}). `RW.v3buff(id)` says if one is on.
(function (RW) {
  'use strict';
  const P = RW.player, WD = RW.world, U = RW.ui, R = RW.register, A = RW.art, VA = RW.v3art, TS = RW.TILE;
  const L = RW.v3ringsLib, def = RW.WORLDS && RW.WORLDS.rock;
  if (!P || !WD || !R || !def || !L) return;
  function addTile(d) { if (RW.T[d.key] != null) return RW.T[d.key]; const id = RW.TILES.length; RW.TILES.push(Object.assign({}, d, { id })); RW.T[d.key] = id; return id; }
  const item = (o) => R.item(o);

  // ============================ plants ============================
  // [key, name, style, mount, colours [base, hi, dark], light, icon shape]
  const PLANTS = {
    6: [['seagrass', 'Sea Grass', 'grass', 'floor', ['#3e8a4a', '#6ac070', '#1e4e2a'], null, 'kelp'], ['sealettuce', 'Sea Lettuce', 'leafy', 'floor', ['#5ab84a', '#9ae07a', '#2a6a2a'], null, 'moss']],
    5: [['fancoral', 'Fan Coral', 'fan', 'floor', ['#e0607a', '#ff9aaa', '#8a2a40'], null, 'coral'], ['sponge', 'Tube Sponge', 'tube', 'floor', ['#e8a040', '#ffd080', '#8a5018'], null, 'coral'], ['anemone', 'Anemone', 'anemone', 'floor', ['#c050c0', '#f090f0', '#6a206a'], [0.06, 0.02, 0.06], 'coral']],
    4: [['giantkelp', 'Giant Kelp', 'stalk', 'floor', ['#6a8a2a', '#a0c050', '#3a4e14'], null, 'kelp'], ['bladderwrack', 'Bladderwrack', 'bladder', 'floor', ['#8a7a2a', '#c0b050', '#4a3e12'], null, 'kelp'], ['meadowgrass', 'Meadow Grass', 'grass', 'floor', ['#4aa060', '#80d890', '#205a30'], null, 'kelp']],
    3: [['emberweed', 'Ember Weed', 'grass', 'floor', ['#e05a20', '#ffb050', '#7a2008'], [0.22, 0.08, 0.02], 'kelp'], ['ashtube', 'Ash Tube', 'tube', 'floor', ['#6a6466', '#9a9496', '#2e2a2c'], null, 'coral'], ['smokermoss', 'Smoker Moss', 'moss', 'ceil', ['#3a3030', '#e07030', '#1a1414'], [0.08, 0.03, 0], 'moss']],
    2: [['bonecoral', 'Bone Coral', 'fan', 'floor', ['#d8d0b0', '#f4f0e0', '#8a8470'], null, 'coral'], ['marrowlily', 'Marrow Lily', 'lily', 'floor', ['#f0e0c0', '#fffff0', '#8a7a5a'], [0.16, 0.15, 0.1], 'sprout'], ['gravemoss', 'Grave Moss', 'moss', 'ceil', ['#5a6a50', '#8a9a78', '#2a3226'], null, 'moss']],
    1: [['nullfrond', 'Null Frond', 'frond', 'floor', ['#6a4ab0', '#a888f0', '#2e1e5a'], [0.05, 0.02, 0.1], 'kelp'], ['starpolyp', 'Star Polyp', 'polyp', 'floor', ['#b0a0ff', '#ffffff', '#4a3a8a'], [0.1, 0.1, 0.2], 'crystal'], ['driftmoss', 'Drift Moss', 'moss', 'ceil', ['#4a3a6a', '#8a78c0', '#1e1630'], null, 'moss']],
    x: [['shells', 'Shells', 'shells', 'floor', ['#e8d8c8', '#fff4ea', '#9a8070'], null, 'shard'], ['starfish', 'Starfish', 'star', 'floor', ['#e87a40', '#ffb070', '#8a3a18'], null, 'shard'], ['glowbulb', 'Glow Bulb', 'bulb', 'floor', ['#5ae0c0', '#d0fff4', '#1e6a5a'], [0.1, 0.32, 0.28], 'mushroom']],
  };
  const PT = {}; // key -> tile id
  Object.keys(PLANTS).forEach((j) => PLANTS[j].forEach(([k, name, style, mount, col, light, ic]) => {
    const key = 'v3p_' + k;
    PT[k] = addTile({ key, name, solid: false, hard: 0, time: 0.1, drop: key, decor: 'v3plant', v3plant: style, v3pc: col, v3mount: mount, soft: true, light: light || undefined });
    item({ id: key, name, kind: 'material', icon: { s: ic, a: col[0], b: col[2] }, desc: 'A sea plant' + (j === 'x' ? ' found in every layer' : '') + '. Brew it into potions at a Brewing Cauldron.' });
  }));
  const ROOTS = addTile({ key: 'v3p_roots', name: 'Island Roots', solid: false, hard: 0, time: 0.15, drop: ['wood', 0, 1], climb: true, decor: 'v3plant', v3plant: 'roots', v3pc: ['#6a4a2e', '#9a7048', '#3a2618'], soft: true });
  const CAUL = addTile({ key: 'v3cauldron', name: 'Brewing Cauldron', solid: false, hard: 1, time: 0.6, drop: 'v3cauldron', decor: 'v3plant', v3plant: 'cauldron', v3pc: ['#3a3640', '#6a6672', '#1a181e'], station: 'v3brew', light: [0.08, 0.2, 0.12] });
  item({ id: 'v3cauldron', name: 'Brewing Cauldron', kind: 'place', place: 'v3cauldron', icon: { s: 'lantern', a: '#3a3640', b: '#5ae08a' }, desc: 'Brew potions from sea plants. Stand near it to brew.' });
  R.recipes([{ out: 'v3cauldron', in: { stone: 20, iron_bar: 3, glow_mushroom: 2 }, at: null }]);
  if (A.buildTiles) { try { A.buildTiles(); } catch (e) { /* plain */ } }

  // ---- plant pictures (16x16, made once per tile) ----
  function sprite(t) {
    if (t.__v3spr) return t.__v3spr;
    const c = document.createElement('canvas'); c.width = 16; c.height = 16; const g = c.getContext('2d');
    const [B, H, D] = t.v3pc; let s = t.id * 7919 + 17; const rnd = () => { s = (s * 16807) % 2147483647; return (s & 0xffff) / 0xffff; };
    const px = (x, y, col) => { if (x >= 0 && x < 16 && y >= 0 && y < 16) { g.fillStyle = col; g.fillRect(x | 0, y | 0, 1, 1); } };
    const vline = (x, y0, y1, col) => { for (let y = y0; y <= y1; y++) px(x, y, col); };
    switch (t.v3plant) {
      case 'grass': for (let k = 0; k < 6; k++) { const x = 1 + k * 2.6 + rnd(), h = 6 + Math.floor(rnd() * 8), lean = rnd() < 0.5 ? -1 : 1; for (let y = 0; y < h; y++) { const xx = x + (y > h * 0.6 ? lean : 0); px(xx, 15 - y, y > h - 2 ? H : y < 2 ? D : B); } } break;
      case 'leafy': for (let k = 0; k < 18; k++) { const x = 2 + rnd() * 12, y = 9 + rnd() * 6; px(x, y, k % 3 ? B : H); px(x + 1, y, B); } for (let x = 2; x < 14; x++) px(x, 15, D); px(5, 8, H); px(10, 9, H); break;
      case 'fan': { vline(8, 11, 15, D); const br = (x, y, dx, n) => { for (let i = 0; i < n; i++) { x += dx * (rnd() < 0.6 ? 1 : 0); y -= 1; px(x, y, i > n - 2 ? H : B); if (rnd() < 0.3) br(x, y, -dx, Math.max(1, n - i - 2)); } }; br(8, 11, -1, 8); br(8, 11, 1, 8); br(8, 11, 0, 9); break; }
      case 'tube': for (let k = 0; k < 3; k++) { const x = 2 + k * 4 + Math.floor(rnd() * 2), h = 5 + Math.floor(rnd() * 8); for (let y = 0; y < h; y++) { px(x, 15 - y, D); px(x + 1, 15 - y, B); px(x + 2, 15 - y, y % 3 ? B : H); } px(x + 1, 15 - h, '#140e10'); px(x, 15 - h, H); px(x + 2, 15 - h, H); } break;
      case 'anemone': { for (let x = 4; x < 12; x++) for (let y = 11; y < 16; y++) px(x, y, y === 11 ? H : (x + y) % 4 ? B : D); for (let k = 0; k < 7; k++) { const x = 4 + k * 1.2, h = 3 + Math.floor(rnd() * 4); for (let y = 0; y < h; y++) px(x + (y > 1 ? (k < 3 ? -1 : k > 4 ? 1 : 0) : 0), 10 - y, y === h - 1 ? '#fff0ff' : H); } break; }
      case 'stalk': { vline(8, 0, 15, D); vline(7, 0, 15, B); for (let y = 1; y < 15; y += 3) { const side = (y / 3) % 2 ? 1 : -1; for (let k = 1; k < 5; k++) px(8 + side * k, y + (k > 2 ? 1 : 0), k === 4 ? H : B); if (rnd() < 0.5) px(8 + side, y + 1, '#c0d060'); } break; }
      case 'bladder': { const fork = (x, y, n, dx) => { for (let i = 0; i < n; i++) { y--; x += i % 2 ? dx : 0; px(x, y, B); if (rnd() < 0.35) { px(x + 1, y, H); px(x + 1, y - 1, H); } } return [x, y]; }; const [ax, ay] = fork(7, 16, 6, 0); fork(ax, ay, 6, -1); fork(ax, ay, 6, 1); break; }
      case 'moss': for (let k = 0; k < 8; k++) { const x = k * 2 + Math.floor(rnd() * 2), h = 3 + Math.floor(rnd() * 11); for (let y = 0; y < h; y++) px(x, y, y === h - 1 && rnd() < 0.6 ? H : y < 2 ? D : B); } break;
      case 'lily': { vline(8, 7, 15, '#5a6a40'); px(7, 12, '#7a8a50'); px(9, 10, '#7a8a50'); for (let x = 5; x < 12; x++) for (let y = 3; y < 7; y++) if (Math.abs(x - 8) <= 7 - y || y < 5) px(x, y, y === 3 || x === 5 || x === 11 ? H : B); px(8, 7, H); px(6, 2, H); px(10, 2, H); px(8, 5, '#ffffe0'); break; }
      case 'frond': { let x = 6; for (let y = 15; y > 0; y--) { x += Math.sin(y * 0.5) * 0.7; px(x, y, D); px(x + 1, y, B); if (y % 2) px(x + 2, y, H); if (y % 3 === 0) { px(x - 1, y, B); px(x - 2, y - 1, B); } } break; }
      case 'polyp': for (let k = 0; k < 5; k++) { const x = 2 + k * 3, h = 2 + Math.floor(rnd() * 6); vline(x, 16 - h, 15, D); const y = 15 - h; px(x, y, '#ffffff'); px(x - 1, y, B); px(x + 1, y, B); px(x, y - 1, B); px(x, y + 1, H); } break;
      case 'shells': for (let k = 0; k < 3; k++) { const x = 1 + k * 5 + Math.floor(rnd() * 2); for (let y = 0; y < 3; y++) for (let i = 0; i < 4 - y; i++) px(x + i + (y > 0 ? 0 : 0), 15 - y, (i + y) % 2 ? H : B); px(x + 1, 15, D); } break;
      case 'star': { const cx = 8, cy = 13; for (let a = 0; a < 5; a++) { const an = -Math.PI / 2 + a * 1.2566; for (let r = 0; r < 4; r++) px(cx + Math.cos(an) * r, cy + Math.sin(an) * r * 0.6, r === 3 ? H : B); } px(cx, cy, D); break; }
      case 'bulb': for (let k = 0; k < 3; k++) { const x = 3 + k * 4 + Math.floor(rnd() * 2), h = 4 + Math.floor(rnd() * 7); vline(x, 16 - h, 15, D); const y = 15 - h; px(x - 1, y, B); px(x + 1, y, B); px(x, y - 1, B); px(x, y + 1, B); px(x, y, H); } break;
      case 'roots': for (let k = 0; k < 4; k++) { let x = 1 + k * 4 + rnd() * 2; const len = 9 + Math.floor(rnd() * 8); for (let y = 0; y < len; y++) { x += (rnd() - 0.5) * 0.9; px(x, y, y > len - 3 ? H : k % 2 ? B : D); if (rnd() < 0.12) { px(x + 1, y + 1, B); px(x + 2, y + 2, H); } } } break;
      case 'cauldron': {
        for (let x = 2; x < 14; x++) for (let y = 6; y < 15; y++) { const e = Math.abs(x - 7.5) + Math.max(0, y - 11) * 1.2; if (e <= 6.5) px(x, y, x < 5 ? H : x > 11 ? D : B); }
        for (let x = 1; x < 15; x++) px(x, 6, H); for (let x = 3; x < 13; x++) px(x, 7, '#3ae08a'); px(5, 5, '#8affc0'); px(9, 4, '#8affc0'); px(11, 5, '#3ae08a'); px(3, 15, D); px(12, 15, D);
        break;
      }
    }
    t.__v3spr = c; return c;
  }
  // sea plants hanging from a roof or an island sit in water too: let the water be drawn over them
  const baseWater = WD.drawWater;
  WD.drawWater = function (g, cam, vw, vh) {
    const fg = WD.fg, W = WD.W, Tw = RW.T.water, TL = RW.TILES, sw = [];
    if (fg && WD.def && WD.def.id === 'rock' && cam) {
      const tx0 = Math.max(1, Math.floor(cam.x / TS) - 1), ty0 = Math.max(1, Math.floor(cam.y / TS) - 1), tx1 = Math.min(W - 2, Math.ceil((cam.x + vw) / TS) + 1), ty1 = Math.min(WD.H - 2, Math.ceil((cam.y + vh) / TS) + 1);
      for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) { const i = y * W + x, t = TL[fg[i]]; if (t && t.v3plant && t.v3plant !== 'cauldron' && (fg[i - 1] === Tw || fg[i + 1] === Tw || fg[i + W] === Tw || fg[i - W] === Tw || (TL[fg[i + W]] && TL[fg[i + W]].v3plant))) sw.push(i, fg[i]); }
      for (let k = 0; k < sw.length; k += 2) fg[sw[k]] = Tw;
    }
    try { return baseWater.apply(this, arguments); } finally { for (let k = 0; k < sw.length; k += 2) fg[sw[k]] = sw[k + 1]; }
  };
  const baseDecor = A.drawDecor;
  A.drawDecor = function (g, t, sx, sy) { if (t && t.v3plant) { g.drawImage(sprite(t), sx, sy); return; } return baseDecor.apply(this, arguments); };

  // ============================ potions ============================
  const POT = [
    { id: 'v3pot_sea', name: 'Sea Draught', col: '#3aa0e0', in: { v3p_seagrass: 3, v3p_sealettuce: 2, v3p_shells: 1 }, say: '+30% speed in water' },
    { id: 'v3pot_coral', name: 'Coralhide Potion', col: '#e0607a', in: { v3p_fancoral: 2, v3p_sponge: 2, v3p_anemone: 1 }, say: '+6 armour' },
    { id: 'v3pot_kelp', name: 'Kelpstride Potion', col: '#6ac050', in: { v3p_bladderwrack: 3, v3p_meadowgrass: 2 }, say: '+15% speed' },
    { id: 'v3pot_heat', name: 'Heatproof Tonic', col: '#ff8a30', in: { v3p_ashtube: 2, v3p_smokermoss: 2, v3p_emberweed: 1 }, say: 'hot water and vents don\'t burn you' },
    { id: 'v3pot_marrow', name: 'Marrow Fury', col: '#f0e0b0', in: { v3p_bonecoral: 2, v3p_marrowlily: 2, v3p_gravemoss: 1 }, say: '+15% damage' },
    { id: 'v3pot_anchor', name: 'Anchor Draught', col: '#8a68e0', in: { v3p_nullfrond: 2, v3p_driftmoss: 2, v3p_starpolyp: 1 }, say: 'void currents can\'t pull you' },
    { id: 'v3pot_lumen', name: 'Lumen Brew', col: '#5ae0c0', in: { v3p_glowbulb: 3, v3p_sealettuce: 1 }, say: 'you glow' },
    { id: 'v3pot_delver', name: 'Delver\'s Brew', col: '#d0b040', in: { v3p_giantkelp: 2, v3p_starfish: 1, v3p_glowbulb: 1 }, say: '+25% mining speed' },
  ];
  const DUR = 300;
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join(''); };
  POT.forEach((p) => {
    item({ id: p.id, name: p.name, kind: 'material', stack: 30, icon: { s: 'gland', a: p.col, b: shade(p.col, 0.5) }, desc: 'Potion (right-click to drink): ' + p.say + ' for 5 minutes. Drinking another adds 5 more minutes.' });
    R.recipes([{ out: p.id, in: p.in, at: 'v3brew' }]);
    if (VA && VA.painters) VA.painters[p.id] = { pal: ['#141018', '#e8f4ff', '#a8c0d8', '#6a7a90', '#8a6040', '#c09060', p.col, shade(p.col, 0.6), shade(p.col, 1.35)], fn(g) {
      const C = p.col;
      g.fillStyle = '#141018'; g.beginPath(); g.arc(24, 31, 14, 0, 6.283); g.fill(); g.fillRect(18, 7, 12, 14);
      g.fillStyle = '#6a7a90'; g.beginPath(); g.arc(24, 31, 12, 0, 6.283); g.fill(); g.fillRect(20, 9, 8, 12);
      g.fillStyle = shade(C, 0.6); g.beginPath(); g.arc(24, 31, 10.5, 0, 6.283); g.fill();
      g.fillStyle = C; g.beginPath(); g.arc(24, 32, 9.5, Math.PI * 1.05, Math.PI * 1.95, true); g.fill(); g.fillRect(14.5, 29, 19, 3);
      g.fillStyle = shade(C, 1.35); g.fillRect(16, 28, 16, 2); g.fillRect(27, 34, 3, 3);
      g.fillStyle = '#e8f4ff'; g.fillRect(17, 23, 3, 6); g.fillRect(21, 11, 2, 8);
      g.fillStyle = '#8a6040'; g.fillRect(19, 3, 10, 6); g.fillStyle = '#c09060'; g.fillRect(19, 3, 10, 2);
    } };
    RW.v3useItem = RW.v3useItem || {};
    RW.v3useItem[p.id] = () => {
      const b = (P.flags.v3buffs = P.flags.v3buffs || {}); b[p.id] = (b[p.id] || 0) + DUR;
      P.remove(p.id, 1); RW.audio.sfx('eat'); const c = P.center(); RW.fx.burst(c.x, c.y, [p.col, '#ffffff'], 14, 70, { add: true, kind: 'glow', life: 0.8 });
      U.toast(p.name + ': ' + p.say + ' (' + fmt(b[p.id]) + ').'); U.renderInv && U.renderInv(); drawHud(true); return true;
    };
  });
  const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const on = (k) => { const b = P.flags && P.flags.v3buffs; return !!(b && b['v3pot_' + k] > 0); };
  RW.v3buff = on;

  const bDmg = P.dmgMul; P.dmgMul = function () { return bDmg.apply(this, arguments) * (on('marrow') ? 1.15 : 1); };
  const bDef = P.defense; P.defense = function () { return bDef.apply(this, arguments) + (on('coral') ? 6 : 0); };
  const bSpd = P.spdMul; P.spdMul = function () { return bSpd.apply(this, arguments) * (1 + (on('kelp') ? 0.15 : 0) + (on('sea') && P.water ? 0.3 : 0)); };
  const bMine = P.mineMul; P.mineMul = function () { return bMine.apply(this, arguments) * (on('delver') ? 1.25 : 1); };
  const bLight = WD.computeLight;
  WD.computeLight = function (tx0, ty0, tw, th, extra) { if (Array.isArray(extra) && on('lumen') && !P.dead && RW.game && RW.game.playing) extra.push({ x: P.x + 6, y: P.y + 10, r: 0.35, g: 0.9, b: 0.8, v3: true }); return bLight.apply(this, arguments); };

  // the row of potions under your health
  const st = document.createElement('style');
  st.textContent = '#v3buffs{position:fixed;left:22px;top:76px;display:flex;flex-wrap:wrap;gap:4px;max-width:300px;pointer-events:none;z-index:5;font:11px monospace}#v3buffs span{padding:2px 6px;background:rgba(14,12,20,.8);border:1px solid;color:#eee}';
  document.head.appendChild(st);
  let hud = null, hudT = 0;
  function drawHud(force) {
    if (!hud) { hud = document.createElement('div'); hud.id = 'v3buffs'; document.body.appendChild(hud); }
    const b = (P.flags && P.flags.v3buffs) || {}, live = RW.game && RW.game.playing;
    const html = live ? POT.filter((p) => b[p.id] > 0).map((p) => '<span style="border-color:' + p.col + '">' + p.name.replace(/ (Potion|Draught|Brew|Tonic)$/, '') + ' ' + fmt(b[p.id]) + '</span>').join('') : '';
    if (force || hud.innerHTML !== html) hud.innerHTML = html;
  }
  const bUpd = P.update;
  P.update = function (dt) {
    const r = bUpd.apply(this, arguments);
    const b = P.flags && P.flags.v3buffs;
    if (b) Object.keys(b).forEach((k) => { b[k] -= dt; if (b[k] <= 0) { delete b[k]; const p = POT.find((q) => q.id === k); if (p) U.toast(p.name + ' has worn off.'); } });
    if ((hudT -= dt) <= 0) { hudT = 0.5; drawHud(); }
    return r;
  };

  // ============================ world: islands and plants ============================
  const MIX = { 6: ['dirt', 'v3c_mud', 'v3c_clay', 'gravel'], 5: ['seasand', 'v3c_clay', 'v3c_mud', 'v3c_silt'], 4: ['v3c_mud', 'v3c_silt', 'dirt', 'v3c_clay'], 3: ['v3c_ash', 'v3c_clay', 'gravel', 'v3c_mud'], 2: ['dirt', 'v3c_clay', 'gravel', 'v3c_silt'], 1: ['v3c_mud', 'v3c_clay', 'v3c_silt', 'v3c_ash'] };
  const NATTEX = new Set(['rough', 'layer', 'sand', 'soil', 'soil2', 'pebble', 'nodule', 'spire', 'facet']);
  function build(out) {
    const W = out.W, H = out.H, fg = out.fg, m = out.meta, T = RW.T, TL = RW.TILES, seed = (m.seed || 1) + 1700;
    const hh = (a, b, k) => RW.hash2(a, b, seed + k), nz = (x, y, k) => RW.noise2(x, y, seed + k);
    const get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? T.stone : fg[y * W + x]);
    const isOpen = (t) => t === T.water || t === T.air;
    const natural = (t) => { const d = TL[t]; return !!(d && d.solid && !d.decor && !d.platform && !d.loot && !d.chest && !d.station && (d.ore || NATTEX.has(d.tex)) && !/^v3(ruin|vault|seal|way|k_)|^ship/.test(d.key)); };
    const ground = (t) => { const d = TL[t]; return natural(t) || !!(d && d.solid && !d.decor && (d.tex === 'bone' || d.tex === 'ore') && (d.hard || 0) < 50); };
    const jAt = (x, y) => (y < L.TOP[0] ? 6 : L.regionAt(x, y).j);
    const CH = L.TOP[5]; // the Heart Chamber stays as it is
    // places to leave alone
    const boxes = [];
    (m.v3structs || []).forEach((s) => boxes.push([s.x0 != null ? s.x0 : s.x - 14, s.y0 != null ? s.y0 : s.y - 10, s.x1 != null ? s.x1 : s.x + 14, s.y1 != null ? s.y1 : s.y + 10]));
    (m.v3lairs || []).forEach((l) => boxes.push([l.x - l.rx - 4, l.y - l.ry - 4, l.x + l.rx + 4, l.y + l.ry + 4]));
    (m.v3ways || []).forEach((w) => boxes.push([w.x - 16, w.y - 14, w.x + 16, w.y + 4]));
    (m.caverns || []).forEach((c) => { if (c.x0 != null) boxes.push([c.x0 - 4, c.y0 - 4, c.x1 + 4, c.y1 + 4]); else if (c.x != null) boxes.push([c.x - (c.rx || 40) - 4, c.y - (c.ry || 30) - 4, c.x + (c.rx || 40) + 4, c.y + (c.ry || 30) + 4]); });
    (m.towns || []).forEach((t) => { if (t.x != null) boxes.push([t.x - 70, (t.y || 0) - 70, t.x + 70, (t.y || 0) + 40]); });
    if (m.v3shaft) boxes.push([m.v3shaft.x - 6, m.v3shaft.y0 || 0, m.v3shaft.x + 6, m.v3shaft.y1 || H]);
    const blocked = (x, y) => boxes.some((b) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]);

    // ---- 1. find what floats ----
    const seen = new Uint8Array(W * H), q = new Int32Array(W * H), chunks = [];
    for (let y = 135; y < CH; y++) for (let x = 2; x < W - 2; x++) {
      const i0 = y * W + x; if (seen[i0] || !natural(fg[i0])) continue;
      let n = 0, h = 0, floats = true, sx = 0, sy = 0; q[n++] = i0; seen[i0] = 1;
      while (h < n) {
        const i = q[h++], cx = i % W, cy = (i / W) | 0; sx += cx; sy += cy;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = cx + dx, yy = cy + dy; if (xx < 1 || yy < 1 || xx >= W - 1 || yy >= H - 1) { floats = false; continue; }
          const j = yy * W + xx, t = fg[j];
          if (natural(t)) { if (!seen[j]) { seen[j] = 1; q[n++] = j; } } else if (TL[t] && TL[t].solid) floats = false;
        }
      }
      if (floats && n <= 220) { const cx = Math.round(sx / n), cy = Math.round(sy / n); if (!blocked(cx, cy)) chunks.push({ cells: Array.from(q.subarray(0, n)), cx, cy, n }); }
    }

    // ---- 2. an island: wide on top, tapering smoothly to a point ----
    function shape(Wd, k) {
      const rows = [], half = Wd / 2, Hd = Math.max(5, Wd * 0.8); let l = Math.floor(half), r = Math.ceil(half) - 1, yr = 0;
      rows.push([l - 1, r - 1]);
      while (l >= 0 && r >= 0 && yr < 40) {
        yr++; const tgt = half * (1 - Math.pow(Math.min(1, yr / Hd), 2));
        if (l > tgt + (hh(k, yr, 31) - 0.5) * 1.2) l--; if (r > tgt + (hh(k, yr, 32) - 0.5) * 1.2) r--;
        if (l < 0 || r < 0) break; rows.push([l, r]);
        if (l === 0 && r === 0) break;
      }
      return rows; // [left reach, right reach] for each row from the top
    }
    const fits = (x0, y0, rows) => { for (let k = -2; k <= rows.length + 1; k++) { const rw = rows[Math.max(0, Math.min(rows.length - 1, k))]; for (let x = x0 - rw[0] - 2; x <= x0 + rw[1] + 2; x++) { const t = get(x, y0 + k); if (!isOpen(t) && !(TL[t] && TL[t].v3plant)) return false; if (blocked(x, y0 + k)) return false; } } return true; };
    const made = [];
    function place(x0, y0, rows) {
      const j = jAt(x0, y0), rock = j === 6 ? T.stone : L.ROCK[j], ore = j === 6 ? T.iron : L.ORE[j], mix = (MIX[j] || []).map((k) => T[k]).filter((v) => v != null);
      const soil = [T.dirt, T.v3c_clay].concat(mix).filter((v) => v != null);
      rows.forEach(([l, r], k) => { for (let x = x0 - l; x <= x0 + r; x++) {
        const y = y0 + k, n = nz(x * 0.22, y * 0.22, 33) - 0.5, dd = k - (n > 0.1 ? 1 : 0); let t;
        if (dd < 1) t = soil[Math.floor(hh(x, y, 34) * 2)]; // dirt and clay on top
        else if (n > 0.2) t = T.v3c_clay != null ? T.v3c_clay : T.dirt;
        else if (n < -0.22) t = T.dirt;
        else if (nz(x * 0.3, y * 0.3, 35) > 0.74) t = mix[Math.floor(hh(x, y, 36) * mix.length)] || rock;
        else t = rock;
        if (k > 1 && hh(x, y, 37) < 0.045 && ore != null) t = ore;
        fg[y * W + x] = t;
      } });
      // roots under it
      rows.forEach(([l, r], k) => { for (let x = x0 - l; x <= x0 + r; x++) { const y = y0 + k; if (!isOpen(get(x, y + 1)) || hh(x, y, 38) > 0.4) continue; const len = 1 + Math.floor(hh(x, y, 39) * 4); for (let d = 1; d <= len && isOpen(get(x, y + d)); d++) fg[(y + d) * W + x] = ROOTS; } });
      made.push({ x: x0, y: y0, w: rows[0][0] + rows[0][1] + 1, h: rows.length });
    }
    const sizeFor = (k) => (hh(k, 0, 40) < 0.18 ? 20 + Math.floor(hh(k, 1, 41) * 11) : 8 + Math.floor(hh(k, 1, 42) * 7));
    chunks.forEach((c, k) => {
      const old = c.cells.map((i) => fg[i]), fill = (i) => { const x = i % W, y = (i / W) | 0; return [get(x - 1, y), get(x + 1, y), get(x, y - 1), get(x, y + 1)].some((t) => t === T.water) ? T.water : T.air; };
      c.cells.forEach((i) => { fg[i] = fill(i); });
      for (let Wd = sizeFor(k); Wd >= 6; Wd -= 3) { const rows = shape(Wd, k + Wd * 31), y0 = c.cy - Math.floor(rows.length * 0.3); if (fits(c.cx, y0, rows)) { place(c.cx, y0, rows); return; } }
      c.cells.forEach((i, n) => { fg[i] = old[n]; }); // no room for an island: leave the chunk as it was
    });
    // a few more, bigger ones, in open water in every layer
    for (let b = 0; b < 5; b++) {
      const y0 = L.TOP[b] + 8, y1 = (b < 4 ? L.TOP[b + 1] : L.TOP[5]) - 14; let n = 0;
      for (let a = 0; a < 1600 && n < 5; a++) {
        const x = Math.round(20 + hh(b, a, 43) * (W - 40)), y = Math.round(y0 + hh(b, a, 44) * (y1 - y0)), k = 500 + b * 1000 + a;
        if (made.some((q) => Math.abs(q.x - x) < 40 && Math.abs(q.y - y) < 25)) continue;
        for (let Wd = (n < 3 ? 20 + Math.floor(hh(k, 2, 45) * 11) : 10 + Math.floor(hh(k, 2, 46) * 6)); Wd >= 10; Wd -= 3) { const rows = shape(Wd, k); if (fits(x, y, rows)) { place(x, y, rows); n++; break; } }
      }
    }
    m.v3islands = made;

    // ---- 3. sea plants on every flooded floor, mosses on flooded ceilings ----
    const P6 = (j) => PLANTS[j] || PLANTS[6];
    for (let y = (m.layout && m.layout.SEA) || 70; y < CH; y++) for (let x = 2; x < W - 2; x++) {
      const i = y * W + x; if (fg[i] !== T.water) continue;
      const below = fg[i + W], above = fg[i - W], j = jAt(x, y), list = P6(j);
      if (TL[below] && TL[below].solid && !TL[below].platform && ground(below)) {
        if (blocked(x, y)) continue;
        const h = hh(x, y, 50);
        if (h < 0.05) { // tall kelp stands
          const giant = j === 4 && PT.giantkelp != null, len = giant ? 4 + Math.floor(hh(x, y, 51) * 8) : 2 + Math.floor(hh(x, y, 51) * 5), tt = giant ? PT.giantkelp : T.kelp;
          if (j === 6 || j === 4) { for (let d = 0; d < len && fg[(y - d) * W + x] === T.water && fg[(y - d - 1) * W + x] === T.water; d++) fg[(y - d) * W + x] = tt; continue; }
        }
        if (h < 0.34) { const fl = list.filter((p) => p[3] === 'floor'); const p = fl[Math.floor(hh(x, y, 52) * fl.length)]; if (p) fg[i] = PT[p[0]]; }
        else if (h < 0.37) fg[i] = PT.shells; else if (h < 0.39) fg[i] = PT.starfish; else if (h < 0.41) fg[i] = PT.glowbulb;
      } else if (TL[above] && TL[above].solid && ground(above)) {
        if (blocked(x, y)) continue;
        const cl = list.filter((p) => p[3] === 'ceil'); if (cl.length && hh(x, y, 53) < 0.3) fg[i] = PT[cl[Math.floor(hh(x, y, 54) * cl.length)][0]];
      }
    }

    // ---- 4. a cauldron by Slagg's forge ----
    for (let y = 130; y < L.TOP[0]; y++) for (let x = 2; x < W - 2; x++) if (fg[y * W + x] === T.forge) {
      for (const dx of [-2, 2, -3, 3]) { const xx = x + dx, t = fg[y * W + xx], bl = TL[fg[(y + 1) * W + xx]]; if ((t === T.air) && bl && bl.solid) { fg[y * W + xx] = CAUL; m.v3cauldron = { x: xx, y }; return; } }
    }
  }
  const prevGen = def.generate;
  def.generate = function () {
    const out = prevGen.apply(this, arguments);
    try { if (out && out.meta && out.meta.v3rings && !(out.fg instanceof Uint8Array)) build(out); } catch (e) { console.warn('v3 islands', e); }
    return out;
  };
  RW.v3sea = { PLANTS, PT, POT, CAUL, drawHud };
})(window.RW);
