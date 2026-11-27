// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3: HUD, speech, the Field Journal (a lined notebook page, like the paper the brothers were first drawn on),
// the title screen and touch controls. All drawn on the canvas in screen units.
(function () {
  'use strict';
  const V3 = window.V3, U = V3.util, P = V3.paint, W = V3.world, S = V3.sky, HS = V3.heroes, I = V3.input, TAU = U.TAU;
  const INK = '#3b1f12', FONT = 'Gaegu, "Comic Sans MS", cursive';
  const UI = (V3.ui = { toasts: [], bannerT: 0, talking: null, journal: false, page: 0, scroll: 0, hintT: 0, zoneT: 0, titleSel: 0, end: 0, touch: false, hits: [] });
  const PT = () => V3.party, F = () => V3.fun, A = () => V3.audio;
  const font = (g, px, w) => { g.font = (w || 700) + ' ' + px + 'px ' + FONT; };
  const wrap = (g, text, maxW) => { const words = String(text).split(' '), out = []; let line = ''; for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; } if (line) out.push(line); return out; };
  const outlined = (g, text, x, y, fill, lw) => { g.lineJoin = 'round'; g.lineWidth = lw || 5; g.strokeStyle = 'rgba(46,26,16,.85)'; g.strokeText(text, x, y); g.fillStyle = fill || '#fff8e6'; g.fillText(text, x, y); };

  UI.toast = (kicker, title, sub) => { UI.toasts.push({ kicker, title, sub, t: 0 }); if (UI.toasts.length > 2) UI.toasts.shift(); };
  UI.banner = (title, sub) => { UI.bTitle = title; UI.bSub = sub || ''; UI.bannerT = 5; };
  UI.hintQ = [];
  UI.hint = (text, secs) => { if (UI.hintText === text && UI.hintT > 0) return; if (UI.hintT > 1 && UI.hintQ.length < 3) { if (!UI.hintQ.some((q) => q[0] === text)) UI.hintQ.push([text, secs]); return; } UI.hintText = text; UI.hintT = secs || 6; };
  UI.zone = (name) => { UI.zoneName = name; UI.zoneT = 3.5; };
  UI.speak = (npc, lines) => { if (!lines.length) return; UI.talking = { npc, lines, i: 0, t: 0 }; A().sfx('talk'); };
  UI.advance = () => { const t = UI.talking; if (!t) return false; if (t.t < 0.25) return true; t.i++; t.t = 0; if (t.i >= t.lines.length) UI.talking = null; else A().sfx('talk', { pitch: 0.9 + (t.i % 3) * 0.1 }); return true; };
  UI.toggleJournal = () => { UI.journal = !UI.journal; UI.scroll = 0; A().sfx('page'); };
  UI.endCard = () => { UI.end = 0.01; };

  UI.update = (dt) => {
    for (const t of UI.toasts) t.t += dt; UI.toasts = UI.toasts.filter((t) => t.t < 5);
    UI.bannerT -= dt; UI.hintT -= dt; UI.zoneT -= dt;
    if (UI.hintT <= 0 && UI.hintQ.length) { const q = UI.hintQ.shift(); UI.hintText = q[0]; UI.hintT = q[1] || 6; }
    if (UI.talking) { UI.talking.t += dt; if (Math.abs(UI.talking.npc.x - PT().x) > 260) UI.talking = null; }
    if (UI.end > 0) UI.end += dt;
    if (UI.journal) {
      if (I.hit('right')) { UI.page = (UI.page + 1) % 4; UI.scroll = 0; A().sfx('page'); } if (I.hit('left')) { UI.page = (UI.page + 3) % 4; UI.scroll = 0; A().sfx('page'); }
      if (I.down.down) UI.scroll += 500 * dt; if (I.down.up) UI.scroll = Math.max(0, UI.scroll - 500 * dt);
    }
  };

  // ---------- HUD ----------
  const TOKEN = { fuzzy: '#e9a868', rock: '#b9b2a8', acorn: '#8fd060', ghost: '#e4ebff' };
  const token = (g, id, x, y, full) => {
    g.globalAlpha = full ? 1 : 0.28;
    if (id === 'fuzzy') { g.fillStyle = TOKEN.fuzzy; g.beginPath(); for (let i = 0; i < 14; i++) { const rr = i % 2 ? 9.5 : 6; g.lineTo(x + Math.cos(i * TAU / 14) * rr, y + Math.sin(i * TAU / 14) * rr); } g.closePath(); g.fill(); }
    else if (id === 'rock') { P.rr(g, x - 8, y - 7, 16, 14, 5); g.fillStyle = TOKEN.rock; g.fill(); }
    else if (id === 'acorn') { g.beginPath(); g.moveTo(x - 9, y + 4); g.quadraticCurveTo(x - 2, y - 12, x + 9, y - 6); g.quadraticCurveTo(x + 4, y + 10, x - 9, y + 4); g.fillStyle = TOKEN.acorn; g.fill(); }
    else { g.beginPath(); g.arc(x, y - 1, 8, Math.PI, 0); g.lineTo(x + 8, y + 8); g.lineTo(x + 3, y + 4); g.lineTo(x, y + 8); g.lineTo(x - 3, y + 4); g.lineTo(x - 8, y + 8); g.closePath(); g.fillStyle = TOKEN.ghost; g.fill(); }
    g.strokeStyle = INK; g.lineWidth = 2.2; g.lineJoin = 'round'; g.stroke(); g.globalAlpha = 1;
  };
  const portrait = (g, id, x, y, r, active, alive) => {
    P.ell(g, x, y + 3, r + 3, r + 3, 'rgba(40,20,10,.3)');
    P.ell(g, x, y, r + 3, r + 3, active ? '#ffe9a8' : '#e9d9b8'); P.ell(g, x, y, r, r, P.lin(g, x, y - r, x, y + r, [[0, '#bfe6ee'], [1, '#8fd08a']]));
    g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
    const sc = r / 46, off = { fuzzy: 30, rock: 44, acorn: 34, ghost: 34 }[id];
    g.translate(x, y + off * sc * 1.1); g.scale(sc * 1.05, sc * 1.05); if (!alive) g.globalAlpha = 0.35;
    HS.draw[id](g, { f: 1, turn: 0, walk: 0, sx: 1, sy: 1, blink: alive ? 1 : 0, mood: alive ? 1 : 0, t: S.time, vx: 0, moving: 0, solid: true });
    g.restore();
    g.strokeStyle = INK; g.lineWidth = active ? 3.4 : 2.6; g.beginPath(); g.arc(x, y, r + 3, 0, TAU); g.stroke();
  };
  const drawHud = (g, vw, vh) => {
    const p = PT(); UI.hits = [];
    // the sprig the brothers hang from
    const x0 = 30, y0 = 46;
    g.strokeStyle = INK; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0 - 16, y0 + 10); g.bezierCurveTo(x0 + 60, y0 - 26, x0 + 200, y0 + 22, x0 + 300, y0 - 12); g.stroke(); g.strokeStyle = '#9a6238'; g.lineWidth = 5; g.stroke();
    let x = x0 + 30;
    HS.order.forEach((id, i) => {
      const act = id === p.id, r = act ? 34 : 24, cx = x + r, cy = y0 + (act ? 26 : 18) + Math.sin(S.time * 1.5 + i) * 1.5;
      g.strokeStyle = '#5f8a3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, y0 - 4); g.lineTo(cx, cy - r); g.stroke();
      portrait(g, id, cx, cy, r, act, p.alive(id));
      font(g, 15); g.textAlign = 'center'; P.ell(g, cx + r * 0.78, cy + r * 0.78, 10, 10, '#fff8e6'); g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.arc(cx + r * 0.78, cy + r * 0.78, 10, 0, TAU); g.stroke(); g.fillStyle = INK; g.fillText(i + 1, cx + r * 0.78, cy + r * 0.78 + 5);
      UI.hits.push({ x: cx, y: cy, r: r + 6, fn: () => p.swap(id) });
      if (act) { // his own kind of health, hanging underneath
        const n = HS.info[id].hp; for (let k = 0; k < n; k++) token(g, id, cx - (n - 1) * 11 + k * 22, cy + r + 20, k < p.hp[id]);
        if (id === 'fuzzy') { g.strokeStyle = 'rgba(46,26,16,.5)'; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, r + 8, -Math.PI / 2, -Math.PI / 2 + TAU); g.stroke(); g.strokeStyle = p.charge >= 1 ? '#fff3a0' : '#ffc24a'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, r + 8, -Math.PI / 2, -Math.PI / 2 + TAU * p.charge); g.stroke(); }
        if (id === 'ghost' && p.host) { g.strokeStyle = '#cfd8ff'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, r + 8, -Math.PI / 2, -Math.PI / 2 + TAU * (p.hostT / 7)); g.stroke(); }
      }
      x += r * 2 + 16;
    });
    // what this brother does, in his own words
    const inf = HS.info[p.id]; font(g, 19); g.textAlign = 'left';
    const keys = UI.touch ? '' : p.host ? 'K  let go      J / Space  use the borrowed body' : 'J  ' + inf.act + '      K  ' + inf.sp + (p.id === 'fuzzy' ? '      hold Space  glide' : p.id === 'ghost' ? '      W / S  drift up and down' : p.id === 'rock' ? '      (or hold S)' : '      W / S + J  aim');
    if (keys) outlined(g, keys, 30, y0 + 122, '#fff8e6', 4);
    // sun dial: a little arc with the sun or moon riding it
    const dx = vw - 150, dy = 58; g.strokeStyle = 'rgba(46,26,16,.55)'; g.lineWidth = 5; g.beginPath(); g.arc(dx, dy, 34, Math.PI, 0); g.stroke(); g.strokeStyle = '#fff8e6'; g.lineWidth = 2.5; g.stroke();
    const dayPart = S.t >= 0.25 && S.t < 0.75, k = dayPart ? (S.t - 0.25) / 0.5 : ((S.t + 0.25) % 1) / 0.5, a = Math.PI + k * Math.PI, sx = dx + Math.cos(a) * 34, sy = dy + Math.sin(a) * 34;
    if (dayPart) { P.glow(g, sx, sy, 20, '#ffe08a', 0.7); P.ell(g, sx, sy, 9, 9, '#fff3b0'); } else { P.ell(g, sx, sy, 9, 9, '#f4f1e0'); P.ell(g, sx + 4, sy - 2, 7.5, 7.5, U.rgba('#232a55', 0.9)); }
    g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.arc(sx, sy, 9, 0, TAU); g.stroke();
    font(g, 16); g.textAlign = 'center'; outlined(g, { clear: 'fair', breeze: 'breezy', rain: 'rain', sunshower: 'sun-shower', fog: 'mist' }[S.weather], dx, dy + 20, '#fff8e6', 4);
    // journal and sound, drawn as little things rather than buttons
    const jx = vw - 62, jy = 50; g.save(); g.translate(jx, jy); g.rotate(-0.08); g.fillStyle = '#c0563f'; P.rr(g, -19, -23, 38, 46, 5); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.8; g.stroke(); g.fillStyle = '#fbf7ea'; P.rr(g, -13, -17, 29, 40, 3); g.fill(); g.stroke(); g.strokeStyle = '#9bb7d6'; g.lineWidth = 1.4; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-8, -8 + i * 8); g.lineTo(11, -8 + i * 8); g.stroke(); } g.restore();
    font(g, 14); outlined(g, UI.touch ? 'journal' : 'Tab', jx, jy + 44, '#fff8e6', 4);
    font(g, 13); outlined(g, F().found.size + '/' + F().all.length, jx, jy + 60, '#ffe9a8', 4);
    UI.hits.push({ x: jx, y: jy, r: 32, fn: UI.toggleJournal });
    const mx = vw - 62, my = 136; g.fillStyle = '#fff8e6'; g.strokeStyle = INK; g.lineWidth = 2.4; g.beginPath(); g.moveTo(mx - 10, my - 5); g.lineTo(mx - 3, my - 5); g.lineTo(mx + 5, my - 12); g.lineTo(mx + 5, my + 12); g.lineTo(mx - 3, my + 5); g.lineTo(mx - 10, my + 5); g.closePath(); g.fill(); g.stroke();
    if (A().muted) { g.strokeStyle = '#d9694f'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(mx - 13, my - 13); g.lineTo(mx + 13, my + 13); g.stroke(); } else { g.beginPath(); g.arc(mx + 6, my, 8, -0.8, 0.8); g.stroke(); }
    UI.hits.push({ x: mx, y: my, r: 22, fn: () => A().setMuted(!A().muted) });
  };

  // ---------- speech ----------
  const drawSpeech = (g, vw, vh) => {
    const t = UI.talking; if (!t) return;
    const s = V3.game.toScreen(t.npc.x, t.npc.y - (t.npc.robe ? 190 : 140)), text = t.lines[t.i];
    font(g, 24, 400); const maxW = Math.min(420, vw - 60), ls = wrap(g, text, maxW - 36), w = Math.min(maxW, Math.max(190, ...ls.map((l) => g.measureText(l).width + 40))), h = ls.length * 28 + 54;
    const x = U.clamp(s[0] - w / 2, 16, vw - w - 16), y = Math.max(16, s[1] - h), k = U.smooth(Math.min(1, t.t / 0.18));
    g.save(); g.translate(x + w / 2, y + h); g.scale(0.85 + k * 0.15, 0.85 + k * 0.15); g.translate(-(x + w / 2), -(y + h));
    g.fillStyle = 'rgba(40,20,10,.25)'; P.rr(g, x + 3, y + 6, w, h, 20); g.fill();
    g.fillStyle = '#fff8e6'; P.rr(g, x, y, w, h, 20); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
    g.beginPath(); const tx = U.clamp(s[0], x + 30, x + w - 30); g.moveTo(tx - 12, y + h - 1); g.lineTo(tx, y + h + 18); g.lineTo(tx + 12, y + h - 1); g.fillStyle = '#fff8e6'; g.fill(); g.strokeStyle = INK; g.beginPath(); g.moveTo(tx - 12, y + h); g.lineTo(tx, y + h + 18); g.lineTo(tx + 12, y + h); g.stroke();
    font(g, 17); g.textAlign = 'left'; g.fillStyle = '#b5563a'; g.fillText(t.npc.name, x + 18, y + 24);
    font(g, 24, 400); g.fillStyle = INK; const shown = Math.floor(t.t * 60); let c = 0;
    ls.forEach((l, i) => { const part = l.slice(0, Math.max(0, shown - c)); c += l.length; g.fillText(part, x + 18, y + 50 + i * 28); });
    font(g, 14); g.textAlign = 'right'; g.fillStyle = '#9a7a5a'; g.fillText((t.i + 1) + '/' + t.lines.length + (UI.touch ? '  tap' : '  E'), x + w - 14, y + h - 10);
    g.restore();
  };

  // ---------- the Field Journal ----------
  const NOTES = { slime: 'Hops at you. Squashes down flat just before it jumps.', warthog: 'Tusks block the front. Make it miss into a tree, then go for the back.', bat: 'Sleeps upside down by day. Folds its wings just before it dives.', eater: 'Looks like a stone, but it blinks. Only soft while it is chewing.', snag: 'Wait for a vine to stick in the dirt. Hit the vine, then the glowing knot. Three knots.', snail: 'On his way somewhere. Do not poke.', frog: 'Sings. Jumps when startled. All of them, at once.' };
  const TABS = ['Brothers', 'Surprises', 'Keepsakes', 'Creatures'];
  const drawJournal = (g, vw, vh) => {
    g.fillStyle = 'rgba(20,14,10,.55)'; g.fillRect(0, 0, vw, vh);
    const w = Math.min(860, vw - 36), h = vh - 60, x = (vw - w) / 2, y = 30;
    g.save(); g.translate(vw / 2, vh / 2); g.rotate(-0.008); g.translate(-vw / 2, -vh / 2);
    g.fillStyle = 'rgba(0,0,0,.3)'; P.rr(g, x + 6, y + 9, w, h, 8); g.fill();
    g.fillStyle = '#fbf7ea'; P.rr(g, x, y, w, h, 8); g.fill();
    g.save(); P.rr(g, x, y, w, h, 8); g.clip();
    g.strokeStyle = '#b9cfe6'; g.lineWidth = 1.3; for (let ly = y + 92; ly < y + h; ly += 30) { g.beginPath(); g.moveTo(x, ly); g.lineTo(x + w, ly); g.stroke(); }
    g.strokeStyle = '#ef9a9a'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(x + 64, y); g.lineTo(x + 64, y + h); g.stroke();
    for (const hy of [0.18, 0.5, 0.82]) { P.ell(g, x + 30, y + h * hy, 9, 9, 'rgba(20,14,10,.5)'); }
    // tabs along the top, like sticky notes
    font(g, 22); g.textAlign = 'center';
    TABS.forEach((t, i) => { const tw = Math.min(150, (w - 100) / 4), tx = x + 82 + i * (tw + 6), on = i === UI.page; g.fillStyle = on ? '#ffe27a' : ['#ffd0c2', '#cdeac0', '#cfe0f6', '#e6d3f3'][i]; g.save(); g.translate(tx + tw / 2, y + 30); g.rotate((i - 1.5) * 0.012); P.rr(g, -tw / 2, -18, tw, on ? 44 : 36, 4); g.fill(); g.fillStyle = INK; g.fillText(t, 0, 8); g.restore(); UI.hits.push({ x: tx + tw / 2, y: y + 30, r: tw / 2, fn: () => { UI.page = i; UI.scroll = 0; A().sfx('page'); } }); });
    const cx = x + 84, cw = w - 110; let cy = y + 114 - UI.scroll;
    g.textAlign = 'left'; g.fillStyle = INK;
    const head = (t) => { font(g, 34); g.fillStyle = INK; g.fillText(t, cx, cy); cy += 34; };
    const para = (t, px, col) => { font(g, px || 21, 400); g.fillStyle = col || '#4a3526'; for (const l of wrap(g, t, cw)) { g.fillText(l, cx, cy); cy += (px || 21) + 6; } };
    if (UI.page === 0) {
      head('The Four Brothers'); para('They travel together. Press 1, 2, 3 or 4 (or tap a face) to change who is out front.'); cy += 10;
      const how = { fuzzy: ['Light as lint: two extra puffs in the air, and hold jump to glide. Wind and updrafts carry him. He floats on water.', 'Scurrying through grass builds static (the ring round his face). J is a zap-dash in any direction; a full ring chains lightning.', 'Hold K to puff up and float.'], rock: ['Heavy. Barely jumps, never gets knocked back, sinks in water and simply walks along the bottom.', 'Hold K (or S) to curl up and roll. Slopes give speed; speed breaks walls and bowls creatures over.', 'J is a slow, huge punch. In the air, J is a slam that shakes everything nearby.'], acorn: ['J throws a seed (hold W or S to aim high or low). On soil it grows a sproutstalk to climb, with a bouncy bloom on top.', 'A seed on a creature roots it to the spot. A seed on water grows a lily raft. Three plants at a time; rain makes them taller.', 'Hold K to tuck into the cap: a well-timed tuck bounces attacks back. Tucked in the air he drills down. Stay tucked to take root and heal.'], ghost: ['Drifts freely and passes through thin walls, branches and creatures. Nothing can touch him while he is wispy.', 'J says BOO: creatures panic and run into things. He is solid for a moment afterwards.', 'K borrows the nearest creature: ride a warthog, bounce a slime, fly a bat. He also sees what the others cannot.'] };
      for (const id of HS.order) {
        const py = cy + 34; if (py > y - 80 && py < y + h + 80) portrait(g, id, cx + 36, py, 32, id === PT().id, PT().alive(id));
        const sx = cx; g.save(); g.translate(86, 0); font(g, 27); g.fillStyle = '#b5563a'; g.fillText(HS.info[id].name, cx, cy + 4); cy += 30; const oldcw = cw; how[id].forEach((t) => { font(g, 19, 400); g.fillStyle = '#4a3526'; for (const l of wrap(g, t, oldcw - 90)) { g.fillText(l, cx, cy); cy += 24; } }); g.restore(); cy += 18;
      }
      para('E pokes things and talks to people. Tab closes this book.', 18, '#7a6a5a');
    } else if (UI.page === 1) {
      head('Surprises  ' + F().found.size + ' of ' + F().all.length); para('Small things worth showing a brother. The ones you have not found yet only give a hint.', 18, '#7a6a5a'); cy += 6;
      for (const d of F().all) { const got = F().found.has(d.id); font(g, 24); g.fillStyle = got ? INK : '#a89a8a'; g.fillText((got ? '✓ ' : '?  ') + (got ? d.name : '. . . . .'), cx, cy); cy += 24; font(g, 18, 400); g.fillStyle = got ? '#4a3526' : '#8a7a6a'; for (const l of wrap(g, got ? d.text : 'Hint: ' + d.hint, cw - 30)) { g.fillText(l, cx + 30, cy); cy += 22; } cy += 8; }
    } else if (UI.page === 2) {
      head('Keepsakes  ' + F().kept.size + ' of ' + F().keepsakes.length); para('No coins, no ores. Just things people and places gave you.', 18, '#7a6a5a'); cy += 8;
      for (const k of F().keepsakes) { const got = F().kept.has(k.id); g.strokeStyle = got ? '#b5563a' : '#c9bca8'; g.lineWidth = 2.6; g.beginPath(); g.arc(cx + 14, cy - 6, 12, 0, TAU); g.stroke(); if (got) { g.fillStyle = '#ffe27a'; g.fill(); g.stroke(); } font(g, 24); g.fillStyle = got ? INK : '#a89a8a'; g.fillText(got ? k.name : '. . . . .', cx + 38, cy); cy += 24; if (got) { font(g, 18, 400); g.fillStyle = '#4a3526'; for (const l of wrap(g, k.text, cw - 40)) { g.fillText(l, cx + 38, cy); cy += 22; } } cy += 10; }
    } else {
      head('Creatures'); para('Notes get written the first time you meet one. Sent packing so far: ' + V3.creatures.sent + '.', 18, '#7a6a5a'); cy += 10;
      for (const kind of Object.keys(NOTES)) {
        const met = V3.game.met.has(kind);
        if (met && kind !== 'snag' && cy > y - 40 && cy < y + h + 40) { g.save(); g.translate(cx + 40, cy + 34); g.scale(0.85, 0.85); V3.creatures.drawOne(g, kind, kind === 'bat' ? { anim: 0.2, fly: true } : {}); g.restore(); }
        font(g, 25); g.fillStyle = met ? '#b5563a' : '#a89a8a'; g.fillText(met ? V3.creatures.DEF[kind].name : '? ? ?', cx + 96, cy + 4); cy += 26;
        font(g, 19, 400); g.fillStyle = '#4a3526'; if (met) for (const l of wrap(g, NOTES[kind], cw - 100)) { g.fillText(l, cx + 96, cy); cy += 23; } cy += met ? 26 : 12;
      }
    }
    UI.maxScroll = Math.max(0, cy + UI.scroll - (y + h) + 30); UI.scroll = Math.min(UI.scroll, UI.maxScroll);
    g.restore(); g.strokeStyle = 'rgba(60,40,30,.5)'; g.lineWidth = 2; P.rr(g, x, y, w, h, 8); g.stroke();
    g.fillStyle = '#fbf7ea'; g.fillRect(x + 66, y + h - 30, w - 70, 26);
    font(g, 16); g.textAlign = 'right'; g.fillStyle = '#9a8a7a'; g.fillText(UI.touch ? 'drag to scroll   tap outside to close' : 'A / D  turn page     W / S  scroll     Tab  close', x + w - 16, y + h - 12);
    g.restore();
    UI.hits.push({ x: -1, y: -1, r: 0, outside: [x, y, w, h], fn: UI.toggleJournal });
  };

  // ---------- title ----------
  const drawTitle = (g, vw, vh) => {
    g.fillStyle = P.lin(g, 0, 0, 0, vh, [[0, 'rgba(20,30,40,.25)'], [0.5, 'rgba(20,30,40,0)'], [1, 'rgba(20,14,10,.55)']]); g.fillRect(0, 0, vw, vh);
    g.textAlign = 'center';
    const ty = vh * 0.2;
    font(g, Math.min(96, vw * 0.105)); outlined(g, '4 Brothers World', vw / 2, ty, '#fff3d0', 12);
    font(g, 30); outlined(g, 'Tuftwood', vw / 2, ty + 44, '#ffd27a', 6);
    // pick who walks out first
    const gap = Math.min(170, (vw - 40) / 4), bx = vw / 2 - gap * 1.5, by = vh * 0.62;
    if (I.hit('right')) { UI.titleSel = (UI.titleSel + 1) % 4; A().sfx('page'); } if (I.hit('left')) { UI.titleSel = (UI.titleSel + 3) % 4; A().sfx('page'); }
    HS.order.forEach((id, i) => {
      const x = bx + i * gap, on = i === UI.titleSel, s = on ? 1.5 : 1.1;
      if (on) { g.globalCompositeOperation = 'lighter'; P.glow(g, x, by - 50, 110, '#ffe9a0', 0.5); g.globalCompositeOperation = 'source-over'; }
      g.save(); g.translate(x, by + (id === 'ghost' ? -8 : 0)); g.scale(s, s); HS.shadow(g, 0, 0, 30, 0.3);
      HS.draw[id](g, { f: 1, turn: 0, walk: on ? S.time * 9 : 0, sx: 1, sy: 1 + (on ? Math.abs(Math.sin(S.time * 4)) * 0.04 : 0), blink: (S.time + i) % 3.4 > 3.25 ? 0 : 1, mood: 1, t: S.time + i, vx: 0, moving: on ? 1 : 0, solid: true });
      g.restore();
      font(g, on ? 28 : 21); outlined(g, HS.info[id].name, x, by + 44, on ? '#fff3d0' : '#e6d6b8', 5);
      UI.hits.push({ x, y: by - 50, r: gap / 2, fn: () => { if (UI.titleSel === i) V3.game.start(id); else { UI.titleSel = i; A().sfx('page'); } } });
    });
    font(g, 23, 400); outlined(g, HS.info[HS.order[UI.titleSel]].tag, vw / 2, by + 86, '#fff8e6', 5);
    const blink = 0.6 + 0.4 * Math.sin(S.time * 4); g.globalAlpha = blink; font(g, 26);
    outlined(g, UI.touch ? 'tap again to begin' : 'A / D to choose     Space to begin', vw / 2, by + 132, '#ffe9a8', 5); g.globalAlpha = 1;
    if (V3.save.has()) { font(g, 22); outlined(g, UI.touch ? 'tap here to continue your saved walk' : 'C  continue your saved walk', vw / 2, by + 168, '#bfe6ff', 5); UI.hits.push({ x: vw / 2, y: by + 162, r: 150, ry: 18, fn: () => V3.game.continue() }); }
    font(g, 15, 400); outlined(g, 'A 4 Brothers minigame. Saves are kept in this browser.', vw / 2, vh - 18, '#e6d6b8', 4);
  };

  // ---------- touch ----------
  const pads = {};
  const btns = (vw, vh) => [{ k: 'jump', x: vw - 86, y: vh - 96, r: 46, l: 'jump' }, { k: 'act', x: vw - 190, y: vh - 70, r: 40, l: 'J' }, { k: 'special', x: vw - 112, y: vh - 198, r: 38, l: 'K' }, { k: 'poke', x: vw - 214, y: vh - 162, r: 32, l: 'E' }];
  const stick = { id: null, x: 0, y: 0, dx: 0, dy: 0 };
  const drawTouch = (g, vw, vh) => {
    for (const b of btns(vw, vh)) { g.fillStyle = I.down[b.k] ? 'rgba(255,240,200,.55)' : 'rgba(255,248,230,.28)'; g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill(); g.strokeStyle = 'rgba(46,26,16,.6)'; g.lineWidth = 3; g.stroke(); font(g, 20); g.textAlign = 'center'; g.fillStyle = 'rgba(46,26,16,.8)'; g.fillText(b.l, b.x, b.y + 7); }
    const sx = stick.id !== null ? stick.x : 110, sy = stick.id !== null ? stick.y : vh - 120;
    g.fillStyle = 'rgba(255,248,230,.2)'; g.beginPath(); g.arc(sx, sy, 62, 0, TAU); g.fill(); g.strokeStyle = 'rgba(46,26,16,.5)'; g.lineWidth = 3; g.stroke();
    g.fillStyle = 'rgba(255,248,230,.55)'; g.beginPath(); g.arc(sx + stick.dx * 40, sy + stick.dy * 40, 28, 0, TAU); g.fill(); g.stroke();
  };
  UI.bind = (canvas) => {
    const pos = (e) => { const r = canvas.getBoundingClientRect(), z = V3.game.zoom; return [(e.clientX - r.left) / z, (e.clientY - r.top) / z]; };
    canvas.addEventListener('pointerdown', (e) => {
      const [x, y] = pos(e), vw = V3.game.vw, vh = V3.game.vh; if (e.pointerType === 'touch') UI.touch = true;
      A().init(); canvas.focus(); if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
      for (let i = UI.hits.length - 1; i >= 0; i--) { const h = UI.hits[i]; if (h.outside) { const o = h.outside; if (x < o[0] || x > o[0] + o[2] || y < o[1] || y > o[1] + o[3]) { h.fn(); return; } continue; } if (Math.abs(x - h.x) < h.r && Math.abs(y - h.y) < (h.ry || h.r)) { h.fn(); return; } }
      if (UI.journal) { pads[e.pointerId] = { scroll: y }; return; }
      if (V3.game.state !== 'play') return;
      if (UI.talking) { UI.advance(); return; }
      if (!UI.touch) return;
      for (const b of btns(vw, vh)) if (U.dist(x, y, b.x, b.y) < b.r + 10) { pads[e.pointerId] = b.k; I.set(b.k, true); return; }
      if (x < vw * 0.5) { stick.id = e.pointerId; stick.x = x; stick.y = y; stick.dx = stick.dy = 0; }
    });
    canvas.addEventListener('pointermove', (e) => {
      const [x, y] = pos(e); const pd = pads[e.pointerId];
      if (pd && pd.scroll !== undefined) { UI.scroll = U.clamp(UI.scroll + (pd.scroll - y), 0, UI.maxScroll || 0); pd.scroll = y; return; }
      if (e.pointerId !== stick.id) return;
      const dx = (x - stick.x) / 50, dy = (y - stick.y) / 50, l = Math.hypot(dx, dy) || 1, k = Math.min(1, l); stick.dx = dx / l * k; stick.dy = dy / l * k;
      I.set('left', stick.dx < -0.35); I.set('right', stick.dx > 0.35); I.set('up', stick.dy < -0.5); I.set('down', stick.dy > 0.5);
    });
    const up = (e) => { const k = pads[e.pointerId]; delete pads[e.pointerId]; if (typeof k === 'string') I.set(k, Object.values(pads).includes(k)); if (e.pointerId === stick.id) { stick.id = null; stick.dx = stick.dy = 0; ['left', 'right', 'up', 'down'].forEach((d) => I.set(d, false)); } };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('lostpointercapture', up);
    addEventListener('blur', () => { for (const id in pads) delete pads[id]; stick.id = null; stick.dx = stick.dy = 0; });
  };

  // ---------- everything ----------
  UI.draw = (g, vw, vh) => {
    UI.hits = [];
    if (V3.game.state === 'title') { drawTitle(g, vw, vh); return; }
    drawHud(g, vw, vh);
    if (UI.touch && !UI.journal) drawTouch(g, vw, vh);
    g.textAlign = 'center';
    if (UI.zoneT > 0) { g.globalAlpha = U.clamp(UI.zoneT, 0, 1) * U.clamp((3.5 - UI.zoneT) * 3, 0, 1); font(g, 46); outlined(g, UI.zoneName, vw / 2, vh * 0.2, '#fff3d0', 8); g.globalAlpha = 1; }
    if (UI.bannerT > 0) { g.globalAlpha = U.clamp(UI.bannerT, 0, 1) * U.clamp((5 - UI.bannerT) * 3, 0, 1); font(g, 42); outlined(g, UI.bTitle, vw / 2, vh * 0.3, '#ffe9a8', 8); font(g, 24, 400); wrap(g, UI.bSub, Math.min(640, vw - 40)).forEach((l, i) => outlined(g, l, vw / 2, vh * 0.3 + 36 + i * 28, '#fff8e6', 5)); g.globalAlpha = 1; }
    if (UI.hintT > 0 && !UI.talking) { g.globalAlpha = U.clamp(UI.hintT, 0, 1); font(g, 22, 400); const ls = wrap(g, UI.hintText, Math.min(620, vw - 60)), w = Math.max(...ls.map((l) => g.measureText(l).width)) + 44, h = ls.length * 26 + 22, x = vw / 2 - w / 2, y = vh - (UI.touch ? 260 : 26) - h; g.fillStyle = 'rgba(255,248,230,.94)'; P.rr(g, x, y, w, h, 16); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke(); g.fillStyle = INK; ls.forEach((l, i) => g.fillText(l, vw / 2, y + 30 + i * 26)); g.globalAlpha = 1; }
    // discoveries arrive as torn slips of notebook paper
    UI.toasts.forEach((t, i) => {
      const k = U.smooth(Math.min(1, t.t / 0.3)) * U.clamp((5 - t.t) * 2, 0, 1), w = Math.min(300, vw - 40), x = vw - (w + 18) * k, y = 176 + i * 92;
      g.save(); g.translate(x + w / 2, y + 40); g.rotate(0.02 - i * 0.015); g.fillStyle = 'rgba(0,0,0,.25)'; P.rr(g, -w / 2 + 4, -36, w, 80, 6); g.fill(); g.fillStyle = '#fbf7ea'; P.rr(g, -w / 2, -40, w, 80, 6); g.fill();
      g.strokeStyle = '#b9cfe6'; g.lineWidth = 1.2; for (let l = -14; l < 40; l += 22) { g.beginPath(); g.moveTo(-w / 2, l); g.lineTo(w / 2, l); g.stroke(); } g.strokeStyle = '#ef9a9a'; g.beginPath(); g.moveTo(-w / 2 + 26, -40); g.lineTo(-w / 2 + 26, 40); g.stroke();
      g.textAlign = 'left'; font(g, 16); g.fillStyle = '#b5563a'; g.fillText(t.kicker, -w / 2 + 36, -18); font(g, 26); g.fillStyle = INK; g.fillText(t.title, -w / 2 + 36, 6); font(g, 15, 400); g.fillStyle = '#6a5a4a'; g.fillText(wrap(g, t.sub || '', w - 50)[0] || '', -w / 2 + 36, 28); g.restore();
    });
    drawSpeech(g, vw, vh);
    if (UI.journal) drawJournal(g, vw, vh);
    if (UI.end > 0) {
      const a = U.clamp((UI.end - 1) / 1.5, 0, 1); g.fillStyle = 'rgba(16,12,30,' + a * 0.78 + ')'; g.fillRect(0, 0, vw, vh); g.globalAlpha = a; g.textAlign = 'center';
      font(g, 58); outlined(g, 'The end', vw / 2, vh * 0.3, '#ffe9a8', 9);
      font(g, 25, 400); ['The baby World Eater has seen the brothers.', 'In the full game, the rifts open from here: Tanglehold, Cloudtop, the Duat.', '', 'You found ' + F().found.size + ' of ' + F().all.length + ' surprises and ' + F().kept.size + ' of ' + F().keepsakes.length + ' keepsakes.', 'Tuftwood is still yours to wander.'].forEach((l, i) => outlined(g, l, vw / 2, vh * 0.42 + i * 36, '#fff8e6', 5));
      font(g, 24); if (UI.end > 3) { outlined(g, UI.touch ? 'tap to keep exploring' : 'Space to keep exploring', vw / 2, vh * 0.78, '#bfe6ff', 5); UI.hits.push({ x: vw / 2, y: vh / 2, r: 9999, fn: () => { UI.end = 0; } }); if (I.hit('jump') || I.hit('poke')) UI.end = 0; }
      g.globalAlpha = 1;
    }
  };
})();
