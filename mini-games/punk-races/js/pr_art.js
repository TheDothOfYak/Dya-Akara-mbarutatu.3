/* ============================================================
   PUNK RACES — js/pr_art.js
   Drawing the race, painted rather than drawn: a sky for each time
   of day, mountains and hills in layers of haze, trees with lit
   canopies and bark you could touch, grass that moves, water that
   reflects, chasms of real rock, and the Punks themselves (a ribbed
   pumpkin with no eyes and no mouth, leafy vines growing from the
   top round the stem) with their Eikar riders, scarves streaming.
   Things that glow (the sun, fruit, lanterns, sparks, embers,
   fireflies) bloom through js/flake/canvas_fx.js.

   Most of the work is done once per race (A.prepare): the textures,
   the far layers, the clouds and the tree crowns are painted into
   off-screen canvases, and each frame just puts them in place.
   ============================================================ */
(function () {
  'use strict';
  const PR = window.PR, FX = window.FX;
  const A = PR.art = {};
  const TAU = Math.PI * 2;
  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

  /* ---------------- the look of each track ---------------- */
  A.THEMES = {
    farm: { sky: ['#5f9fd8', '#a9d2ee', '#f6e6be'], mtn: ['#7d93b4', '#a9b9cf'], hill: '#7f9e5c', hillTree: '#5f8448', near: '#466a30',
      ground: '#7a5434', dirt: ['#6e4a2c', '#8a6040', '#5a3a22'], grass: ['#6aa83e', '#8cc452', '#a8d86a'], trunk: '#6e4a2a', bark: ['#5a3a20', '#7a5634', '#3e2814'],
      leaf: ['#2f6a2c', '#4a8a3a', '#6aa84a', '#a6d870'], water: ['#6aa8d8', '#2a5a8a'], shape: 'round', fruit: '#f2a234', flowers: ['#ffffff', '#ffd84a', '#ff8aa0', '#b08aff'], rock: '#8a8478', ambient: 'petals', snow: false },
    forest: { sky: ['#4f8cc4', '#9cc6e0', '#e0ecd2'], mtn: ['#6a8aa0', '#98b2c0'], hill: '#5a7c4a', hillTree: '#3e6236', near: '#2e4a26',
      ground: '#5a4026', dirt: ['#4e3420', '#6a4a2e', '#3a2616'], grass: ['#4e8a32', '#6aa83e', '#8cc452'], trunk: '#5a3c22', bark: ['#4a2e18', '#6a4a2c', '#2e1c0e'],
      leaf: ['#1f4e22', '#2f6a2c', '#4a8a3a', '#8ac25a'], water: ['#5a98c0', '#1e4a6e'], shape: 'round', fruit: '#f2a234', flowers: ['#ffffff', '#ffe080'], rock: '#7a766c', ambient: 'leaves', snow: true },
    river: { sky: ['#6aaee0', '#b6dcf2', '#f0f6f4'], mtn: ['#7a98b0', '#b4c8d4'], hill: '#5a8068', hillTree: '#2e5a44', near: '#1e3e30',
      ground: '#5a4a38', dirt: ['#4e4030', '#6a5844', '#3a2e22'], grass: ['#5a904a', '#74aa5a', '#94c470'], trunk: '#4e3a26', bark: ['#3e2c1a', '#5e4a32', '#2a1c10'],
      leaf: ['#173e2c', '#244e36', '#2f6a44', '#5a9a6a'], water: ['#7ac0e8', '#1e5a8a'], shape: 'pine', fruit: '#f2a234', flowers: ['#ffffff', '#a0d0ff'], rock: '#8a8a84', ambient: 'leaves', snow: true },
    mist: { sky: ['#7e8a96', '#b4bcc4', '#dde2e6'], mtn: ['#9aa4ae', '#c4cad0'], hill: '#7a8682', hillTree: '#5a6a66', near: '#3a4644',
      ground: '#4a4e44', dirt: ['#3e423a', '#545a4e', '#2e322a'], grass: ['#5a6e54', '#6e8268', '#8a9a80'], trunk: '#3e3a36', bark: ['#2e2a26', '#4e4a44', '#1e1a16'],
      leaf: ['#2e4040', '#3e5050', '#4e6262', '#7a9090'], water: ['#8aa4b4', '#3a5464'], shape: 'pine', fruit: '#f0b040', flowers: ['#e8eef0'], rock: '#8a8e8c', ambient: 'motes', snow: true },
    spires: { sky: ['#4a7ccc', '#9cbce6', '#f6dcb0'], mtn: ['#8a7a9a', '#b8a8b8'], hill: '#8a7a6a', hillTree: '#4a6a3e', near: '#3a4a2e',
      ground: '#6a5a48', dirt: ['#5a4a3a', '#7a6650', '#3e3228'], grass: ['#6a8a3e', '#86a44e', '#a2bc62'], trunk: '#5a3a26', bark: ['#4a2e1c', '#6e4c32', '#2e1c10'],
      leaf: ['#1f4a2a', '#2f5e34', '#4a7a44', '#8aae62'], water: ['#5a8ac0', '#1e3e6e'], shape: 'spire', fruit: '#f2a234', flowers: ['#ffd84a', '#ffffff'], rock: '#9a8a7a', ambient: 'leaves', snow: true },
    ash: { sky: ['#1a1218', '#4a2420', '#c8643a'], mtn: ['#3a2426', '#5a3430'], hill: '#2e2224', hillTree: '#1a1414', near: '#120c0c',
      ground: '#241c1a', dirt: ['#1e1614', '#2e2420', '#120c0a'], grass: ['#3a2e26', '#4a3a30', '#5a463a'], trunk: '#1a1412', bark: ['#120c0a', '#2a201c', '#080404'],
      leaf: ['#2a1e18', '#3a2a22', '#4a342a', '#6a4a3a'], water: ['#ffb040', '#c83a10'], shape: 'dead', fruit: '#ffd040', flowers: [], rock: '#3a302c', ambient: 'embers', snow: false, lava: true },
    jungle: { sky: ['#3a8a7a', '#8ac4a6', '#e0eea8'], mtn: ['#4a7a6a', '#7aa490'], hill: '#3a6a46', hillTree: '#1f4e2e', near: '#123a1e',
      ground: '#3a4224', dirt: ['#2e3420', '#444c2e', '#1e2414'], grass: ['#3e7a2a', '#5a9a32', '#82bc44'], trunk: '#4a3a22', bark: ['#3a2a16', '#5a4628', '#22180c'],
      leaf: ['#0f4a22', '#1f6a32', '#3a8a3a', '#8ad04a'], water: ['#5a9a7a', '#1a4a3a'], shape: 'jungle', fruit: '#ff6aa0', flowers: ['#ff5a8a', '#ffd040', '#c060ff'], rock: '#5a6050', ambient: 'motes', snow: false },
    fair: { sky: ['#5ea4e8', '#a6d0f4', '#ffe8c0'], mtn: ['#8a9ab8', '#b8c4d4'], hill: '#88a060', hillTree: '#5a8448', near: '#4a6a30',
      ground: '#7a5434', dirt: ['#6e4a2c', '#8a6040', '#5a3a22'], grass: ['#6aa83e', '#8cc452', '#a8d86a'], trunk: '#6e4a2a', bark: ['#5a3a20', '#7a5634', '#3e2814'],
      leaf: ['#2f6a2c', '#4a8a3a', '#6aa84a', '#a6d870'], water: ['#6aa8d8', '#2a5a8a'], shape: 'round', fruit: '#f2a234', flowers: ['#ffffff', '#ffd84a', '#ff6a6a', '#6ab0ff'], rock: '#8a8478', ambient: 'confetti', snow: false, fair: true },
  };
  /* the time of day: where the light comes from, and what colour it is */
  A.MOODS = {
    dawn: { sky: ['#3a4a8c', '#d08aa0', '#ffd2a0'], sun: [0.16, 0.6], sunCol: '#ffd0a0', light: '#ffb890', grade: ['#ff9a78', 'soft-light', 0.28], shafts: 0.1, dark: 0.05, hazeCol: '#f0c0b0' },
    day: { sky: null, sun: [0.8, 0.16], sunCol: '#fff4d0', light: '#fff2c8', grade: ['#ffe8b8', 'soft-light', 0.14], shafts: 0.07, dark: 0, hazeCol: null },
    dusk: { sky: ['#2a2860', '#b45a5a', '#ffb050'], sun: [0.84, 0.64], sunCol: '#ffb060', light: '#ff9a50', grade: ['#ff7a40', 'soft-light', 0.34], shafts: 0.14, dark: 0.12, hazeCol: '#e0906a' },
    night: { sky: ['#04071a', '#0e1838', '#24305a'], sun: [0.76, 0.16], moon: true, sunCol: '#dfe8ff', light: '#9ab0ff', grade: ['#3848a8', 'multiply', 0.36], shafts: 0.025, dark: 0.34, hazeCol: '#2a3460' },
  };

  /* ---------------- particles ---------------- */
  const parts = [];
  A.parts = parts;
  function emit(x, y, n, o) {
    for (let i = 0; i < n; i++) {
      const a = (o.ang != null ? o.ang : -Math.PI / 2) + (Math.random() - 0.5) * (o.spread == null ? 2.5 : o.spread);
      const sp = (o.sp || 120) * (0.35 + Math.random() * 0.9);
      parts.push({ x: x + (o.jx ? (Math.random() - 0.5) * o.jx : 0), y: y + (o.jy ? (Math.random() - 0.5) * o.jy : 0), vx: Math.cos(a) * sp + (o.vx || 0), vy: Math.sin(a) * sp + (o.vy || 0),
        life: (o.life || 0.6) * (0.7 + Math.random() * 0.6), age: 0, r: (o.r || 3) * (0.6 + Math.random() * 0.8), col: o.col || '#fff', g: o.g == null ? 400 : o.g,
        kind: o.kind || 'dot', rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 10, drag: o.drag == null ? 1.5 : o.drag });
    }
  }
  A.event = function (e, th) {
    th = th || A.THEMES.farm;
    switch (e.t) {
      case 'land': emit(e.x, e.y, 6, { col: FX.rgba(th.dirt[1], 0.7), sp: 90, r: 5, life: 0.5, kind: 'puff', g: -20 }); break;
      case 'thud': emit(e.x, e.y, 16, { col: FX.rgba(th.dirt[1], 0.8), sp: 200, r: 7, life: 0.7, kind: 'puff', g: -10 }); emit(e.x, e.y, 8, { col: th.dirt[2], sp: 260, r: 2.5, life: 0.6, kind: 'dot' }); break;
      case 'botch': emit(e.x, e.y, 20, { col: FX.rgba(th.dirt[1], 0.8), sp: 220, r: 8, life: 0.8, kind: 'puff', g: -10 }); emit(e.x, e.y - 30, 6, { col: '#fff6b0', sp: 90, r: 3, life: 0.9, g: 0, kind: 'star' }); break;
      case 'jump': emit(e.x, e.y + PR.PUNK_R, 5, { col: th.grass[1], sp: 90, r: 3, kind: 'leaf', life: 0.6 }); break;
      case 'splash': emit(e.x, e.y, 26, { col: th.lava ? '#ffc060' : 'rgba(220,240,255,.9)', sp: 300, r: 3.5, life: 0.8, kind: th.lava ? 'spark' : 'drop', ang: -Math.PI / 2, spread: 1.6 }); emit(e.x, e.y, 1, { col: 'rgba(255,255,255,.6)', sp: 0, r: 30, life: 0.6, g: 0, kind: 'ring' }); break;
      case 'paddle': emit(e.x, e.y, 2, { col: th.lava ? '#ffb040' : 'rgba(230,245,255,.8)', sp: 70, r: 2.5, life: 0.4, kind: th.lava ? 'spark' : 'drop' }); break;
      case 'clean': emit(e.x, e.y, 14, { col: '#fff3a0', sp: 180, r: 2.5, g: 0, life: 0.55, kind: 'spark' }); emit(e.x, e.y, 1, { col: 'rgba(255,240,160,.8)', sp: 0, r: 40, life: 0.4, g: 0, kind: 'ring' }); break;
      case 'fruit': emit(e.x, e.y, 22, { col: th.fruit, sp: 220, r: 3, g: 0, life: 0.7, kind: 'spark' }); emit(e.x, e.y, 1, { col: FX.rgba(th.fruit, 0.9), sp: 0, r: 50, life: 0.5, g: 0, kind: 'ring' }); break;
      case 'boost': emit(e.x, e.y, 30, { col: '#ffe08a', sp: 280, r: 3, g: 0, ang: Math.PI, spread: 1.0, life: 0.7, kind: 'spark' }); break;
      case 'fall': emit(e.x, e.y, 14, { col: FX.rgba(th.dirt[1], 0.8), sp: 140, r: 7, life: 0.9, kind: 'puff', g: -10 }); break;
      case 'thorns': emit(e.x, e.y, 2, { col: th.leaf[1], sp: 80, r: 3, life: 0.5, kind: 'leaf' }); break;
      case 'venom': emit(e.x, e.y, 2, { col: '#b8f050', sp: 50, r: 3, g: -80, life: 0.9, kind: 'spark' }); break;
      case 'steam': emit(e.x, e.y, 2, { col: 'rgba(255,245,235,.55)', sp: 80, r: 12, g: -220, life: 1.0, kind: 'puff' }); break;
      case 'vine': emit(e.x, e.y, 7, { col: th.leaf[2], sp: 100, r: 4, g: 160, life: 0.9, kind: 'leaf' }); break;
      case 'snap': emit(e.x, e.y, 12, { col: '#8a7a68', sp: 220, r: 3, g: 600, life: 1.0, kind: 'chip' }); emit(e.x, e.y, 5, { col: '#9a9080', sp: 120, r: 5, g: 200, life: 1.4, kind: 'leaf' }); break;
      case 'trick': emit(e.x, e.y, 16 + Math.min(4, e.combo || 1) * 4, { col: e.combo > 1 ? '#a8f0ff' : '#fff3a0', sp: 220, r: 3, g: 0, life: 0.6, kind: 'spark' }); emit(e.x, e.y, 1, { col: 'rgba(200,240,255,.8)', sp: 0, r: 46, life: 0.45, g: 0, kind: 'ring' }); break;
      case 'bump': emit(e.x, e.y, 8, { col: '#fff6c0', sp: 160, r: 3, g: 0, life: 0.5, kind: 'star' }); break;
      case 'finish': for (let k = 0; k < 4; k++) emit(e.x, e.y - 40, 14, { col: ['#ff6a5a', '#ffd84a', '#5ad0ff', '#9aff6a'][k], sp: 340, r: 3.5, g: 320, life: 1.6, kind: 'confetti' }); break;
    }
  };
  A.stepParts = function (dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.age += dt;
      if (p.age > p.life) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - p.drag * dt; p.rot += p.vr * dt;
      if (p.kind === 'leaf' || p.kind === 'petal' || p.kind === 'confetti') { p.vx += Math.sin(p.age * 4 + p.rot) * 40 * dt; }
    }
    if (parts.length > 900) parts.splice(0, parts.length - 900);
  };

  /* ---------------- the camera ---------------- */
  A.camera = { x: 0, y: 0, z: 1 };
  A.resetCamera = function (u) { A.camera.x = u.x; A.camera.y = u.y; A.camera.z = 1; };
  A.indexCourse = function (course) {
    const by = {};
    course.anchors.forEach(a => { if (a.tree >= 0) (by[a.tree] = by[a.tree] || []).push(a); });
    course._tips = by;
    A._prepared = null;
  };

  /* ================= painting things once ================= */
  const glow = new FX.Glow();
  let P = null;          // what was painted for this race
  function moodOf(race) {
    const m = (race.course && race.course.mood) || { time: 'day', weather: 'clear' };
    return { m, M: A.MOODS[m.time] || A.MOODS.day };
  }
  function skyOf(th, M, m) {
    let s = M.sky ? M.sky.map((c, i) => FX.mix(c, th.sky[i], 0.22)) : th.sky.slice();
    if (th.lava && M.sky) s = M.sky.map((c, i) => FX.mix(c, th.sky[i], 0.55));
    if (m.weather === 'rain') s = s.map(c => FX.mix(c, '#5a6470', 0.5));
    return s;
  }
  function pat(ctx, P, name) { const k = '_pat_' + name; return P[k] || (P[k] = ctx.createPattern(P[name], 'repeat')); }
  A.prepare = function (race, W, H) {
    const th = A.THEMES[race.track.theme] || A.THEMES.farm;
    const { m, M } = moodOf(race);
    const key = race.track.id + '|' + m.time + '|' + m.weather + '|' + Math.round(W) + 'x' + Math.round(H);
    if (P && P.key === key && P.race === race) return P;
    const seed = race.track.seed;
    P = { key, race, th, M, m, sky: skyOf(th, M, m) };
    const haze = M.hazeCol || P.sky[2];
    const darken = c => FX.mix(c, '#0a1030', M.dark);

    /* textures */
    P.dirt = FX.texture(192, seed, (x, y, n, f) => {
      const k = f(x * 2, y * 2);
      const c = FX.hex(n > 0.58 ? th.dirt[1] : n < 0.4 ? th.dirt[2] : th.dirt[0]);
      const v = 0.82 + k * 0.36 + (hash(x * 999 + y * 7) - 0.5) * 0.08;
      return [c[0] * v, c[1] * v, c[2] * v];
    }, 6);
    P.bark = FX.texture(128, seed + 9, (x, y, n, f) => {
      /* long furrows down the trunk */
      const fur = Math.abs(Math.sin((x * 9 + f(x, y * 0.25) * 2.2) * Math.PI));
      const c = FX.hex(fur < 0.25 ? th.bark[2] : n > 0.55 ? th.bark[1] : th.bark[0]);
      const v = 0.85 + n * 0.3;
      return [c[0] * v, c[1] * v, c[2] * v];
    }, 4);
    P.rockTex = FX.texture(128, seed + 21, (x, y, n, f) => {
      const strata = Math.sin((y * 10 + f(x, y) * 3) * Math.PI) * 0.5 + 0.5;
      const c = FX.hex(th.rock); const v = 0.45 + strata * 0.25 + n * 0.35;
      return [c[0] * v, c[1] * v, c[2] * v];
    }, 4);

    /* the far layers, each a strip that tiles side to side */
    const TW = Math.max(1600, Math.ceil(W * 1.6));
    const tile = (h, paint) => { const c = FX.canvas(TW, h); paint(c.getContext('2d'), TW, h); return c; };
    const wav = (x, list) => list.reduce((s, w) => s + Math.sin(x / TW * TAU * w[0] + w[1]) * w[2], 0);
    const rr = PR.rng(seed + 77);
    const mk = (n, amp) => Array.from({ length: n }, (_, i) => [1 + i * 2 + Math.floor(rr() * 3), rr() * TAU, amp / (i + 1)]);
    const mtnW = mk(5, 1), hillW = mk(4, 1);
    const LH = Math.ceil(H * 0.8);
    /* mountains */
    P.far = tile(LH, (g, w, h) => {
      /* sharp peaks: ridged waves, plus a little broken detail */
      const peak = x => mtnW.reduce((s2, w2, i) => s2 + Math.pow(1 - Math.abs(Math.sin(x / TW * Math.PI * w2[0] + w2[1])), 2.2) * w2[2] * (i ? 0.8 : 1.2), 0);
      const ridge = x => h * 0.5 - peak(x) * h * 0.3 - Math.sin(x * 0.09) * 2 - Math.sin(x * 0.23 + 1) * 1.5;
      const grd = g.createLinearGradient(0, h * 0.1, 0, h);
      grd.addColorStop(0, darken(FX.mix(th.mtn[0], haze, 0.15))); grd.addColorStop(0.7, darken(FX.mix(th.mtn[1], haze, 0.5))); grd.addColorStop(1, darken(haze));
      g.fillStyle = grd; g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 4) g.lineTo(x, ridge(x));
      g.lineTo(w, h); g.closePath(); g.fill();
      /* lit faces and shadowed faces on the slopes */
      g.save(); g.clip();
      for (let x = 0; x < w; x += 3) {
        const y0 = ridge(x), slope = ridge(x + 3) - y0;
        g.fillStyle = slope > 0 ? 'rgba(0,0,20,.10)' : FX.rgba(M.light, 0.07);
        g.fillRect(x, y0, 3, h * 0.4);
      }
      if (th.snow) {
        /* snow on the peaks: above a line, lighter */
        g.save(); g.beginPath(); g.moveTo(0, 0);
        for (let x = 0; x <= w; x += 4) g.lineTo(x, h * 0.26 + Math.sin(x * 0.03) * 6);
        g.lineTo(w, 0); g.closePath(); g.clip();
        g.fillStyle = darken(FX.mix('#f4f8ff', haze, 0.2)); g.beginPath(); g.moveTo(0, h);
        for (let x = 0; x <= w; x += 4) g.lineTo(x, ridge(x)); g.lineTo(w, h); g.closePath(); g.fill();
        g.restore();
      }
      const hz = g.createLinearGradient(0, h * 0.35, 0, h * 0.75);
      hz.addColorStop(0, FX.rgba(darken(haze), 0)); hz.addColorStop(1, FX.rgba(darken(haze), 0.85));
      g.fillStyle = hz; g.fillRect(0, 0, w, h);
      g.restore();
    });
    /* hills with a line of trees on them */
    P.mid = tile(LH, (g, w, h) => {
      const top = x => h * 0.55 - wav(x, hillW) * h * 0.08;
      const col = darken(FX.mix(th.hill, haze, 0.35));
      const tcol = darken(FX.mix(th.hillTree, haze, 0.3));
      g.fillStyle = col; g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 6) g.lineTo(x, top(x)); g.lineTo(w, h); g.closePath(); g.fill();
      /* the tree line */
      g.fillStyle = tcol;
      for (let x = -20; x < w + 20; x += 9 + hash(x) * 14) {
        const y = top(x) + 4, s = 10 + hash(x * 3.1) * 16;
        if (th.shape === 'pine' || th.shape === 'spire') { g.beginPath(); g.moveTo(x - s * 0.45, y); g.lineTo(x, y - s * 2.4); g.lineTo(x + s * 0.45, y); g.fill(); }
        else if (th.shape === 'dead') { g.fillRect(x, y - s * 2, 2, s * 2); g.fillRect(x - s * 0.4, y - s * 1.5, s * 0.8, 1.5); }
        else { g.beginPath(); g.arc(x, y - s * 0.8, s, 0, TAU); g.arc(x + s * 0.7, y - s * 0.5, s * 0.75, 0, TAU); g.fill(); }
      }
      /* sunlit tops of the hills */
      g.strokeStyle = FX.rgba(M.light, 0.12); g.lineWidth = 3; g.beginPath();
      for (let x = 0; x <= w; x += 6) g.lineTo(x, top(x) + 2); g.stroke();
      if (th.fair) {
        for (let i = 0; i < 9; i++) {
          const x = (i + 0.5) * w / 9, y = top(x) + 8, ht = 40 + hash(i) * 26, c = ['#c84a3a', '#e8c04a', '#4a7ac8', '#5aa85a'][i % 4];
          g.fillStyle = darken(FX.mix(c, haze, 0.3)); g.beginPath(); g.moveTo(x - 34, y); g.lineTo(x, y - ht); g.lineTo(x + 34, y); g.fill();
          g.fillStyle = darken(FX.mix('#ffffff', haze, 0.35)); g.beginPath(); g.moveTo(x - 11, y); g.lineTo(x, y - ht); g.lineTo(x + 11, y); g.fill();
        }
      }
      const hz = g.createLinearGradient(0, h * 0.5, 0, h);
      hz.addColorStop(0, FX.rgba(darken(haze), 0.1)); hz.addColorStop(1, FX.rgba(darken(haze), 0.55));
      g.fillStyle = hz; g.fillRect(0, h * 0.4, w, h);
    });
    /* big soft trees close behind the course */
    P.near = tile(LH, (g, w, h) => {
      const col = darken(FX.mix(th.near, haze, 0.18));
      g.fillStyle = col;
      for (let i = 0; i < 9; i++) {
        const x = (i + hash(i + seed) * 0.6) * w / 9, base = h * 0.75, tall = h * (0.35 + hash(i * 5 + seed) * 0.2);
        g.fillRect(x - 7, base - tall, 14, tall + 40);
        if (th.shape === 'pine' || th.shape === 'spire') { for (let k = 0; k < 5; k++) { const yy = base - tall + k * tall * 0.16, ww = 22 + k * 14; g.beginPath(); g.moveTo(x - ww, yy + 46); g.lineTo(x, yy - 20); g.lineTo(x + ww, yy + 46); g.fill(); } }
        else if (th.shape !== 'dead') { for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(x + (hash(i * 9 + k) - 0.5) * 120, base - tall + hash(i * 7 + k) * 60, 40 + hash(k + i) * 30, 0, TAU); g.fill(); } }
        else { g.lineWidth = 3; g.strokeStyle = col; for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (hash(i + k * 3) - 0.5) * 2.2; g.beginPath(); g.moveTo(x, base - tall + 30); g.lineTo(x + Math.cos(a) * 70, base - tall + 30 + Math.sin(a) * 70); g.stroke(); } }
      }
      g.fillRect(0, h * 0.74, w, h);
    });
    /* clouds, lit from the sun's side */
    P.clouds = [];
    const lightTop = th.lava ? (M.moon ? '#4a2c2c' : '#8a4a3a') : M.moon ? '#5a6890' : m.weather === 'rain' ? '#a8b0b8' : FX.mix('#ffffff', M.light, 0.25);
    const shadowBot = th.lava ? '#1a0e0e' : M.moon ? '#141a34' : m.weather === 'rain' ? '#4a5260' : FX.mix(P.sky[1], '#5a5a80', 0.45);
    for (let i = 0; i < 6; i++) {
      const cw = 420 + hash(i + seed) * 300, ch = 160;
      const c = FX.canvas(cw, ch), g = c.getContext('2d');
      const puffs = 14 + Math.floor(hash(i * 3) * 8);
      for (let k = 0; k < puffs; k++) {
        const px = cw * (0.15 + hash(i * 31 + k) * 0.7), py = ch * (0.45 + (hash(i * 17 + k) - 0.5) * 0.35), pr = 26 + hash(i * 13 + k) * 40 * (1 - Math.abs(px / cw - 0.5));
        const gg = g.createRadialGradient(px - pr * 0.25, py - pr * 0.45, pr * 0.1, px, py, pr);
        gg.addColorStop(0, FX.rgba(lightTop, 0.95)); gg.addColorStop(0.7, FX.rgba(FX.mix(lightTop, shadowBot, 0.5), 0.85)); gg.addColorStop(1, FX.rgba(shadowBot, 0));
        g.fillStyle = gg; g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
      }
      P.clouds.push(c);
    }
    /* tree crowns: a handful of painted ones, reused */
    P.crowns = [];
    if (th.shape !== 'dead') for (let i = 0; i < 8; i++) P.crowns.push(paintCrown(th, M, seed * 7 + i, i));
    /* stars at night */
    P.stars = [];
    if (M.moon) for (let i = 0; i < 160; i++) P.stars.push([hash(i * 3.7), hash(i * 9.1) * 0.6, 0.4 + hash(i * 1.3) * 1.4, hash(i)]);
    return P;
  };

  /* one tree crown, painted leaf cluster by leaf cluster and lit from the upper left */
  function paintCrown(th, M, seed, idx) {
    const r = PR.rng(seed);
    const W = 360, H = th.shape === 'spire' ? 380 : th.shape === 'pine' ? 360 : 300;
    const c = FX.canvas(W, H), g = c.getContext('2d');
    const L = th.leaf.map(x => FX.mix(x, '#0a1030', M.dark * 0.8));
    const light = M.light;
    if (th.shape === 'pine') {
      /* tiers of needles, darker inside, lit on the top edge */
      const tiers = 7;
      for (let t = 0; t < tiers; t++) {
        const y = 30 + t * (H - 70) / tiers, w = 30 + t * 21;
        for (let k = 0; k < 2; k++) {
          const gg = g.createLinearGradient(0, y - 20, 0, y + 50);
          gg.addColorStop(0, k ? L[2] : L[1]); gg.addColorStop(1, L[0]);
          g.fillStyle = gg;
          g.beginPath(); g.moveTo(W / 2 - w - k * 6, y + 52);
          for (let s = 0; s <= 10; s++) { const xx = W / 2 - w + (2 * w) * s / 10; g.lineTo(xx + (r() - 0.5) * 6, y + 52 - Math.sin(s / 10 * Math.PI) * 6 + (s % 2 ? 8 : 0)); }
          g.lineTo(W / 2, y - 22); g.closePath(); g.fill();
        }
        /* needle strokes */
        g.strokeStyle = FX.rgba(L[3], 0.35); g.lineWidth = 1.2;
        for (let k = 0; k < 26; k++) { const xx = W / 2 + (r() - 0.5) * w * 1.6, yy = y + r() * 40; g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + (xx < W / 2 ? -6 : 6), yy + 9); g.stroke(); }
        g.fillStyle = FX.rgba(light, 0.16);
        g.beginPath(); g.moveTo(W / 2, y - 20); g.lineTo(W / 2 - w * 0.9, y + 44); g.lineTo(W / 2 - w * 0.6, y + 46); g.closePath(); g.fill();
      }
      return c;
    }
    if (th.shape === 'jungle') {
      /* big broad leaves fanning out */
      const n = 26;
      for (let k = 0; k < n; k++) {
        const a = -Math.PI / 2 + (r() - 0.5) * 3.2, len = 70 + r() * 80;
        const bx = W / 2 + (r() - 0.5) * 60, by = H * 0.55 + (r() - 0.5) * 40;
        const col = L[Math.min(3, Math.floor(r() * 3) + (a < -Math.PI / 2 ? 1 : 0))];
        FX.leaf(g, bx, by, a, len, col, FX.rgba(L[0], 0.6));
      }
      for (let k = 0; k < 14; k++) FX.orb(g, W / 2 + (r() - 0.5) * 220, H * 0.35 + r() * 120, 30, L[0], 0.25);
      /* hanging lianas */
      g.strokeStyle = L[0]; g.lineWidth = 2;
      for (let k = 0; k < 5; k++) { const x = W * 0.25 + r() * W * 0.5; g.beginPath(); g.moveTo(x, H * 0.55); g.quadraticCurveTo(x + 8, H * 0.8, x - 4, H - 4); g.stroke(); for (let j = 0; j < 4; j++) FX.leaf(g, x + 2, H * 0.6 + j * 26, Math.PI * 0.4, 12, L[2]); }
      return c;
    }
    /* round crowns (and tall spire crowns): many clusters, dark at the back, lit at the front-left */
    const tall = th.shape === 'spire';
    const clusters = [];
    const n = tall ? 34 : 30;
    for (let k = 0; k < n; k++) {
      const u = r(), v = r();
      const x = W / 2 + (u - 0.5) * (tall ? 190 : 260) * (1 - Math.abs(v - 0.5) * 0.5);
      const y = (tall ? 40 + v * (H - 90) : 50 + v * (H - 110));
      const rad = (tall ? 34 : 40) + r() * 30;
      clusters.push({ x, y, rad, depth: r() });
    }
    clusters.sort((a, b) => a.depth - b.depth);
    clusters.forEach(cl => {
      const lit = Math.max(0, Math.min(1, 0.65 - (cl.x - W / 2) / 260 - (cl.y - H / 2) / 300 + cl.depth * 0.5));
      const base = lit > 0.66 ? L[2] : lit > 0.33 ? L[1] : L[0];
      const gg = g.createRadialGradient(cl.x - cl.rad * 0.35, cl.y - cl.rad * 0.4, cl.rad * 0.1, cl.x, cl.y, cl.rad);
      gg.addColorStop(0, FX.mix(base, L[3], 0.25 * lit)); gg.addColorStop(0.75, base); gg.addColorStop(1, FX.mix(base, L[0], 0.6));
      g.fillStyle = gg;
      /* a lumpy outline instead of a circle */
      g.beginPath();
      /* a soft scalloped edge: little bumps of leaves all the way round */
      const bumps = 9 + Math.floor(r() * 4), ph = r() * TAU;
      g.moveTo(cl.x + cl.rad, cl.y);
      for (let s = 1; s <= 48; s++) { const a = s / 48 * TAU, k = cl.rad * (0.9 + Math.abs(Math.sin(a * bumps / 2 + ph)) * 0.1); g.lineTo(cl.x + Math.cos(a) * k, cl.y + Math.sin(a) * k); }
      g.closePath(); g.fill();
      /* dark gaps between clusters, on the shadow side */
      g.strokeStyle = FX.rgba(L[0], 0.35); g.lineWidth = 3;
      g.beginPath(); g.arc(cl.x, cl.y, cl.rad * 0.92, 0.2, 1.9); g.stroke();
      /* leaf flecks on the lit side */
      for (let f = 0; f < 18; f++) {
        const a = -2.4 + r() * 1.8, d = cl.rad * (0.3 + r() * 0.65);
        FX.leaf(g, cl.x + Math.cos(a) * d, cl.y + Math.sin(a) * d, a + (r() - 0.5), 7 + r() * 7, FX.rgba(lit > 0.5 ? L[3] : L[2], 0.55 + lit * 0.35));
      }
    });
    /* shade underneath, where the crown meets the trunk */
    const sh = g.createLinearGradient(0, H * 0.45, 0, H);
    sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,10,0,.35)');
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = sh; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    return c;
  }

  /* ================= each frame ================= */
  A.draw = function (ctx, W, H, race, focus, now, opts) {
    opts = opts || {};
    const Pp = A.prepare(race, W, H);
    const th = Pp.th, M = Pp.M, m = Pp.m;
    const c = race.course, cam = A.camera;
    glow.resize(W, H);
    const gl = glow.begin();

    /* the camera leads the Punk, and pulls back with speed */
    const sp = Math.hypot(focus.vx, focus.vy);
    const zBase = Math.min(Math.max(W / 1500, W / 1100), H / 760) * 1.05;
    const zT = zBase * (1 - Math.min(0.22, sp / 5200));
    cam.z += (zT - cam.z) * 0.04;
    const lead = Math.max(-80, Math.min(260, focus.vx * 0.32));
    cam.x += (focus.x + lead - cam.x) * 0.12;
    const yT = Math.min(focus.y, c.surface(focus.x) - 120) - 40;
    cam.y += (yT - cam.y) * 0.08;
    const z = cam.z;
    const ox = W * 0.38 - cam.x * z, oy = H * (H > W ? 0.66 : 0.58) - cam.y * z;
    const x0 = cam.x - (W * 0.38) / z - 260, x1 = cam.x + (W * 0.62) / z + 260;
    const sunX = W * M.sun[0], sunY = H * M.sun[1];

    /* ---- the sky ---- */
    const sg = ctx.createLinearGradient(0, 0, 0, H * 0.85);
    sg.addColorStop(0, Pp.sky[0]); sg.addColorStop(0.55, Pp.sky[1]); sg.addColorStop(1, Pp.sky[2]);
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
    Pp.stars.forEach(s => {
      const tw = 0.5 + 0.5 * Math.sin(now * (1 + s[3] * 2) + s[3] * 30);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + tw * 0.6) + ')';
      ctx.fillRect(s[0] * W, s[1] * H, s[2], s[2]);
    });
    /* the sun (or Velki's moonlight) */
    if (m.weather !== 'rain') {
      const sr = Math.min(W, H) * (M.moon ? 0.045 : 0.055);
      FX.orb(ctx, sunX, sunY, sr * 6, M.sunCol, M.moon ? 0.15 : 0.28);
      ctx.fillStyle = M.moon ? '#eef2ff' : FX.mix(M.sunCol, '#ffffff', 0.6);
      ctx.beginPath(); ctx.arc(sunX, sunY, sr, 0, TAU); ctx.fill();
      if (M.moon) { ctx.fillStyle = 'rgba(120,130,170,.35)'; ctx.beginPath(); ctx.arc(sunX - sr * 0.3, sunY - sr * 0.2, sr * 0.25, 0, TAU); ctx.arc(sunX + sr * 0.35, sunY + sr * 0.3, sr * 0.18, 0, TAU); ctx.fill(); }
      FX.orb(gl, sunX, sunY, sr * 2.2, M.sunCol, M.moon ? 0.35 : 0.55);
    }
    /* Xikia's sister worlds, pale in the sky */
    if (!M.moon) { ctx.fillStyle = 'rgba(235,230,255,.3)'; ctx.beginPath(); ctx.arc(W * 0.22, H * 0.13, Math.min(W, H) * 0.03, 0, TAU); ctx.fill(); }
    /* clouds */
    Pp.clouds.forEach((cl, i) => {
      const span = W + 900;
      const px = ((hash(i + 3) * span - cam.x * 0.05 * z - now * (5 + hash(i) * 8)) % span + span) % span - 450;
      const py = H * (0.04 + hash(i + 11) * 0.24);
      const s = 0.6 + hash(i * 5) * 0.6;
      ctx.globalAlpha = th.lava ? 0.45 : m.weather === 'rain' ? 0.95 : 0.85;
      ctx.drawImage(cl, px, py, cl.width * s, cl.height * s);
    });
    ctx.globalAlpha = 1;
    if (m.weather === 'rain') { ctx.fillStyle = 'rgba(60,66,80,.25)'; ctx.fillRect(0, 0, W, H * 0.4); }

    /* ---- the far layers, in parallax ---- */
    const layer = (img, k, yFrac) => {
      const w = img.width, h = img.height;
      const off = ((-cam.x * z * k) % w + w) % w;
      const y = H * yFrac - (cam.y - 400) * z * k * 0.5;
      for (let x = off - w; x < W; x += w) ctx.drawImage(img, x, y, w, h);
    };
    layer(Pp.far, 0.06, 0.08);
    layer(Pp.mid, 0.16, 0.12);
    layer(Pp.near, 0.32, 0.2);
    /* the haze where the land meets the air */
    const hz = ctx.createLinearGradient(0, H * 0.3, 0, H);
    hz.addColorStop(0, FX.rgba(M.hazeCol || Pp.sky[2], 0)); hz.addColorStop(1, FX.rgba(M.hazeCol || Pp.sky[2], 0.18));
    ctx.fillStyle = hz; ctx.fillRect(0, 0, W, H);

    /* ================= the world ================= */
    ctx.save(); ctx.translate(ox, oy); ctx.scale(z, z);
    gl.save(); gl.translate(ox, oy); gl.scale(z, z);
    const view = { x0, x1, z, now, th, M, m, gl, Pp, c, race };

    drawGaps(ctx, view);
    /* trees */
    for (let i = 0; i < c.trees.length; i++) { const t = c.trees[i]; if (t.x > x0 - 400 && t.x < x1 + 400) drawTree(ctx, t, i, view); }
    c.anchors.forEach(a => { if (a.root && a.x > x0 && a.x < x1) drawRoot(ctx, a, view); });
    drawGround(ctx, view);
    drawHazards(ctx, view);
    drawLines(ctx, view);
    drawFruit(ctx, view, focus);

    /* a ghost of your best run (time trials) */
    if (opts.ghost && race.t > 0) {
      const i = Math.min(opts.ghost.length / 2 - 1, Math.floor(race.t * 20)) * 2;
      if (i >= 0) {
        ctx.globalAlpha = 0.35;
        drawPunk(ctx, gl, { id: '_ghost', x: opts.ghost[i], y: opts.ghost[i + 1], vx: 300, vy: 0, mode: 'air', coat: 'pale', hat: '#ffffff', spin: race.t * 6, anchor: null, boostT: 0, flipA: 0 }, view, false, true);
        ctx.globalAlpha = 1;
      }
    }
    /* where your vine would go */
    if (opts.aim && focus.mode !== 'swing' && !focus.finished) {
      const a = PR.pickAnchor(c, focus);
      if (a) {
        const pulse = 0.6 + Math.sin(now * 8) * 0.4;
        ctx.strokeStyle = 'rgba(255,250,190,' + (0.45 + pulse * 0.4) + ')'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(a.x, a.y, 15 + pulse * 5, 0, TAU); ctx.stroke();
        ctx.setLineDash([6, 8]); ctx.strokeStyle = 'rgba(255,250,190,.25)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(focus.x, focus.y - 24); ctx.lineTo(a.x, a.y); ctx.stroke(); ctx.setLineDash([]);
        FX.orb(gl, a.x, a.y, 26, a.brittle ? '#ffb080' : '#fff6b0', 0.45);
      }
    }
    /* the runners, the one you follow on top */
    race.runners.slice().sort((a, b) => (a === focus) - (b === focus)).forEach(u => drawPunk(ctx, gl, u, view, u === focus));
    /* the release gauge: while you swing, the arc is the clean-release window and the needle is where you are heading */
    if (opts.aim && focus.mode === 'swing' && !focus.finished) {
      const cx = focus.x, cy = focus.y - 10, rr = 74;
      const a0 = -PR.CLEAN[1] * Math.PI / 180, a1 = -PR.CLEAN[0] * Math.PI / 180;
      const head = Math.atan2(focus.vy, focus.vx), sp2 = Math.hypot(focus.vx, focus.vy);
      const inWin = focus.vx > 0 && head > a0 && head < a1 && sp2 > 360;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(cx, cy, rr, a0, a1); ctx.stroke();
      ctx.strokeStyle = inWin ? 'rgba(255,230,110,.95)' : 'rgba(170,240,150,.55)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, rr, a0, a1); ctx.stroke();
      if (inWin) FX.orb(gl, cx + Math.cos(head) * rr, cy + Math.sin(head) * rr, 40, '#ffe070', 0.8);
      if (sp2 > 60) {
        ctx.strokeStyle = inWin ? '#fff6c0' : 'rgba(255,255,255,.7)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(head) * (rr - 14), cy + Math.sin(head) * (rr - 14)); ctx.lineTo(cx + Math.cos(head) * (rr + 12), cy + Math.sin(head) * (rr + 12)); ctx.stroke();
      }
      if (inWin) { ctx.font = 'bold 14px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff6c0'; ctx.fillText('let go!', cx + rr * 0.75, cy - rr * 0.95); }
    }
    drawParts(ctx, gl, view);
    ambient(view, focus);
    gl.restore();
    ctx.restore();

    /* ---- in front of everything: dark ferns and grass close to the eye ---- */
    if (!A.lowFx) drawForeground(ctx, W, H, cam, z, view);
    /* ---- weather ---- */
    if (m.weather === 'rain') rain(ctx, W, H, now, cam, z);
    if (m.wind) windLines(ctx, W, H, now, m.wind);
    /* ---- light ---- */
    if (m.weather !== 'rain' && M.shafts > 0 && !A.lowFx) FX.shafts(ctx, W, H, sunX, sunY, M.light, M.shafts, now, 7);
    glow.end(ctx, M.moon ? 1.0 : 0.7);
    if (c.fog) {
      const fg = ctx.createLinearGradient(W * 0.42, 0, W, 0);
      const fc = M.moon ? '#3a4260' : '#d8dee4';
      fg.addColorStop(0, FX.rgba(fc, 0)); fg.addColorStop(0.55, FX.rgba(fc, 0.72)); fg.addColorStop(1, FX.rgba(fc, 0.95));
      ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = FX.rgba(fc, 0.12); ctx.fillRect(0, 0, W, H);
    }
    if (!A.lowFx) {
      FX.grade(ctx, W, H, M.grade[0], M.grade[1], M.grade[2]);
      if (th.lava) FX.grade(ctx, W, H, '#ff6a2a', 'soft-light', 0.18);
      if (m.weather !== 'rain' && !M.moon && M.sun[1] < 0.5) FX.flare(ctx, W, H, sunX, sunY, M.sunCol, 0.35);
    } else if (M.dark) { ctx.fillStyle = FX.rgba('#101840', M.dark * 0.5); ctx.fillRect(0, 0, W, H); }
    FX.vignette(ctx, W, H, M.moon ? 0.6 : 0.38);
    return { z, ox, oy };
  };

  /* ---------------- gaps: water, lava, or a drop into the dark ---------------- */
  function drawGaps(ctx, v) {
    const { c, th, now, gl } = v;
    c.gaps.forEach(gp => {
      if (gp.x1 < v.x0 || gp.x0 > v.x1) return;
      const surf = Math.max(c.surface(gp.x0), c.surface(gp.x1));
      const wy = surf + 30;
      if (gp.kind === 'water') {
        const wg = ctx.createLinearGradient(0, wy, 0, wy + 420);
        wg.addColorStop(0, th.water[0]); wg.addColorStop(1, th.water[1]);
        ctx.fillStyle = wg; ctx.fillRect(gp.x0 - 2, wy, gp.x1 - gp.x0 + 4, 900);
        if (th.lava) {
          for (let x = gp.x0; x < gp.x1; x += 34) FX.orb(gl, x + 17, wy + 10, 60, '#ff8a30', 0.55);
          ctx.fillStyle = 'rgba(255,230,140,.6)';
          for (let k = 0; k < 10; k++) { const x = gp.x0 + hash(k + gp.x0) * (gp.x1 - gp.x0), y = wy + 6 + ((now * 20 + k * 30) % 80); ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill(); }
        } else {
          /* the sky in the water, and light dancing on it */
          const rg = ctx.createLinearGradient(0, wy, 0, wy + 80);
          rg.addColorStop(0, FX.rgba(v.Pp.sky[2], 0.55)); rg.addColorStop(1, FX.rgba(v.Pp.sky[2], 0));
          ctx.fillStyle = rg; ctx.fillRect(gp.x0, wy, gp.x1 - gp.x0, 80);
          ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2;
          for (let k = 0; k < (gp.x1 - gp.x0) / 18; k++) {
            const x = gp.x0 + ((k * 37 + now * 30 * (k % 2 ? 1 : -1)) % (gp.x1 - gp.x0) + (gp.x1 - gp.x0)) % (gp.x1 - gp.x0);
            const y = wy + 8 + (k * 13) % 60;
            ctx.globalAlpha = 0.25 + 0.3 * Math.sin(now * 2 + k);
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10 + (k % 3) * 6, y); ctx.stroke();
          }
          ctx.globalAlpha = 1;
          if (th.shape === 'jungle' || th.shape === 'pine') {
            for (let k = 0; k < 4; k++) { const x = gp.x0 + 40 + hash(k + gp.x0 * 0.1) * (gp.x1 - gp.x0 - 80); ctx.fillStyle = '#3a7a3a'; ctx.beginPath(); ctx.ellipse(x, wy + 3, 16, 5, 0, 0.3, TAU - 0.3); ctx.lineTo(x, wy + 3); ctx.fill(); if (k % 2 && th.flowers.length) { ctx.fillStyle = th.flowers[0]; ctx.beginPath(); ctx.arc(x + 4, wy, 4, 0, TAU); ctx.fill(); } }
          }
          /* the surface line */
          ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2.5; ctx.beginPath();
          for (let x = gp.x0; x <= gp.x1; x += 10) ctx.lineTo(x, wy + Math.sin(x * 0.045 + now * 2.6) * 3);
          ctx.stroke();
        }
      } else {
        /* a chasm: rock walls going down into the dark */
        const dg = ctx.createLinearGradient(0, surf, 0, surf + 600);
        dg.addColorStop(0, th.lava ? '#3a1810' : '#1a1612'); dg.addColorStop(0.6, th.lava ? '#5a200c' : '#060504'); dg.addColorStop(1, th.lava ? '#ff6010' : '#000');
        ctx.fillStyle = dg; ctx.fillRect(gp.x0 - 2, surf, gp.x1 - gp.x0 + 4, 1200);
        if (th.lava) FX.orb(gl, (gp.x0 + gp.x1) / 2, surf + 640, (gp.x1 - gp.x0) * 0.8, '#ff6a1a', 0.6);
        const rpat = pat(ctx, v.Pp, 'rockTex');
        [[gp.x0, 1], [gp.x1, -1]].forEach(([ex, dir]) => {
          ctx.fillStyle = rpat;
          ctx.beginPath(); ctx.moveTo(ex - dir * 4, c.surface(ex) - 2);
          for (let y = 0; y <= 900; y += 40) ctx.lineTo(ex + dir * (8 + hash(ex + y) * 34 + y * 0.03), c.surface(ex) + y);
          ctx.lineTo(ex - dir * 4, c.surface(ex) + 900); ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
          ctx.strokeStyle = FX.rgba(v.M.light, 0.18); ctx.lineWidth = 2; ctx.stroke();
        });
        /* mist rising out of it */
        for (let k = 0; k < 3; k++) {
          const x = gp.x0 + (gp.x1 - gp.x0) * (0.2 + k * 0.3), y = surf + 160 + Math.sin(now * 0.5 + k) * 20;
          const mg = ctx.createRadialGradient(x, y, 0, x, y, 120);
          mg.addColorStop(0, th.lava ? 'rgba(255,140,60,.18)' : 'rgba(200,210,220,.12)'); mg.addColorStop(1, 'rgba(200,210,220,0)');
          ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(x, y, 120, 0, TAU); ctx.fill();
        }
      }
    });
  }

  /* ---------------- a tree ---------------- */
  function drawTree(ctx, t, i, v) {
    const { th, now, gl, Pp, M, m } = v;
    const sway = Math.sin(now * 0.8 + i) * 3 + (m.wind ? Math.sin(now * 2 + i) * 4 * Math.sign(m.wind) : 0);
    const topX = t.x + t.lean + sway;
    const w = 18 + t.H * 0.03;
    /* the trunk: bark texture, then light on one side and shade on the other */
    const trunk = new Path2D();
    trunk.moveTo(t.x - w * 1.25, t.base + 8);
    trunk.quadraticCurveTo(t.x - w * 0.9, t.base - 20, t.x - w, t.base - 50);
    trunk.quadraticCurveTo(t.x + t.lean * 0.3 - w * 0.75, (t.base + t.top) / 2, topX - w * 0.38, t.top + 50);
    trunk.lineTo(topX + w * 0.38, t.top + 50);
    trunk.quadraticCurveTo(t.x + t.lean * 0.3 + w * 0.75, (t.base + t.top) / 2, t.x + w, t.base - 50);
    trunk.quadraticCurveTo(t.x + w * 0.9, t.base - 20, t.x + w * 1.25, t.base + 8);
    trunk.closePath();
    ctx.fillStyle = pat(ctx, Pp, 'bark'); ctx.fill(trunk);
    const lg = ctx.createLinearGradient(t.x - w, 0, t.x + w, 0);
    const litLeft = M.sun[0] < 0.5;
    lg.addColorStop(litLeft ? 0 : 1, FX.rgba(M.light, 0.22)); lg.addColorStop(0.5, 'rgba(0,0,0,0)'); lg.addColorStop(litLeft ? 1 : 0, 'rgba(0,0,10,.45)');
    ctx.fillStyle = lg; ctx.fill(trunk);
    if (M.dark) { ctx.fillStyle = FX.rgba('#0a1030', M.dark * 0.7); ctx.fill(trunk); }
    /* moss up one side */
    if (th.shape === 'round' || th.shape === 'jungle' || th.shape === 'spire') {
      ctx.fillStyle = FX.rgba(th.leaf[1], 0.35);
      for (let k = 0; k < 5; k++) { const yy = t.base - 30 - k * 26 - hash(i + k) * 20; ctx.beginPath(); ctx.ellipse(t.x - w * 0.6 + hash(i * 3 + k) * 6, yy, 6, 14, 0.2, 0, TAU); ctx.fill(); }
    }
    /* roots and grass where it meets the ground */
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(t.x, t.base + 6, w * 2.4, 9, 0, 0, TAU); ctx.fill();
    /* embers in a burnt trunk */
    if (th.lava) {
      gl.strokeStyle = 'rgba(255,140,40,.9)'; gl.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,150,60,' + (0.55 + Math.sin(now * 3 + i) * 0.3) + ')'; ctx.lineWidth = 1.8;
      for (let k = 0; k < 3; k++) {
        const yy = t.base - 40 - hash(i + k) * (t.H - 120);
        const path = () => { const p = new Path2D(); p.moveTo(t.x - 6, yy); p.lineTo(t.x + 2, yy - 12); p.lineTo(t.x - 3, yy - 26); p.lineTo(t.x + 5, yy - 38); return p; };
        ctx.stroke(path()); gl.stroke(path());
      }
    }

    const tips = (v.c._tips && v.c._tips[i]) || [];

    /* the crown */
    if (th.shape === 'dead') {
      ctx.strokeStyle = th.trunk; ctx.lineCap = 'round';
      for (let k = 0; k < 7; k++) {
        const ang = -Math.PI / 2 + (hash(i * 10 + k) - 0.5) * 2.4, len = 50 + hash(i * 7 + k) * 80;
        const bx = topX, by = t.top + 40 + k * 12;
        const pts = FX.quad(bx, by, bx + Math.cos(ang) * len * 0.5 + 10, by + Math.sin(ang) * len * 0.5, bx + Math.cos(ang) * len, by + Math.sin(ang) * len, 6);
        ctx.fillStyle = th.trunk; FX.ribbon(ctx, pts, 7, 1.5);
      }
      for (let k = 0; k < 4; k++) { const ex = topX + (hash(i + k) - 0.5) * 60, ey = t.top + 50 + hash(i * 3 + k) * 90; FX.orb(gl, ex, ey, 10, '#ff8a3a', 0.5 + Math.sin(now * 5 + k + i) * 0.4); ctx.fillStyle = '#ffb060'; ctx.fillRect(ex - 1.5, ey - 1.5, 3, 3); }
    } else {
      const cr = Pp.crowns[Math.floor(hash(i + 0.5) * Pp.crowns.length)];
      const s = (th.shape === 'spire' ? 1.0 : 0.9) * (0.82 + hash(i * 3.3) * 0.2);
      const flip = hash(i * 7.7) > 0.5;
      ctx.save(); ctx.translate(topX, t.top + (th.shape === 'pine' ? 130 : 95)); if (flip) ctx.scale(-1, 1);
      ctx.rotate(sway * 0.004);
      ctx.drawImage(cr, -cr.width / 2 * s, -cr.height * 0.72 * s, cr.width * s, cr.height * s);
      ctx.restore();
    }
    /* the branches a vine can catch: drawn over the leaves, reaching out past the crown,
       each ending in a tuft with a pale ring so you can see it coming and time the swing.
       Brittle ones are grey, bare and cracked; a snapped one is a broken stub. */
    tips.forEach(a => {
      const broken = a.brokenUntil && a.brokenUntil > v.race.t;
      const ax = a.x + sway * 0.6, ay = a.y;
      const sx = topX + (a.x > t.x ? 8 : -8), sy = Math.max(t.top + 120, ay + 30);
      const ex = broken ? sx + (ax - sx) * 0.35 : ax, ey = broken ? sy + (ay - sy) * 0.35 : ay;
      const pts = FX.quad(sx, sy, sx + (ex - sx) * 0.55, Math.min(sy, ey) - 26, ex, ey, 12);
      const wood = a.brittle ? '#8a8076' : FX.mix(th.trunk, '#0a1030', M.dark * 0.6);
      ctx.fillStyle = 'rgba(0,0,0,.28)'; FX.ribbon(ctx, pts.map(p => [p[0] + 2, p[1] + 4]), 16, broken ? 8 : 5);
      ctx.fillStyle = wood; FX.ribbon(ctx, pts, 15, broken ? 8 : 5);
      ctx.fillStyle = FX.rgba(a.brittle ? '#d8d0c4' : M.light, a.brittle ? 0.35 : 0.22); FX.ribbon(ctx, pts.map(p => [p[0], p[1] - 3]), 5, 1.4);
      /* a twig or two off the limb */
      for (let k = 4; k <= 8; k += 4) {
        const p = pts[k], dir = a.x > t.x ? 1 : -1;
        ctx.strokeStyle = wood; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + dir * 10, p[1] - 16 - hash(a.x + k) * 8); ctx.stroke();
        if (!a.brittle && th.shape !== 'dead') FX.leaf(ctx, p[0] + dir * 10, p[1] - 18, -Math.PI / 2 + dir * 0.5, 11, th.leaf[2], FX.rgba(th.leaf[0], 0.5));
      }
      if (broken) {
        ctx.fillStyle = '#c8b89a'; ctx.beginPath(); ctx.arc(ex, ey, 4, 0, TAU); ctx.fill();
        return;
      }
      if (a.brittle) {
        ctx.strokeStyle = '#8a8076'; ctx.lineWidth = 2.5;
        for (let k = 0; k < 4; k++) { const an = -Math.PI / 2 + (k - 1.5) * 0.6; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + Math.cos(an) * 18, ay + Math.sin(an) * 18); ctx.stroke(); }
        ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax - 22, ay - 6); ctx.lineTo(ax - 15, ay + 1); ctx.lineTo(ax - 9, ay - 6); ctx.lineTo(ax - 4, ay + 1); ctx.stroke();
        ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(255,170,120,.75)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(ax, ay, 17, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        return;
      }
      /* the tuft at the tip, hanging a little */
      if (th.shape === 'dead') { ctx.fillStyle = '#3a2a22'; ctx.beginPath(); ctx.arc(ax, ay, 8, 0, TAU); ctx.fill(); }
      else for (let k = 0; k < 9; k++) {
        const an = Math.PI / 2 + (k - 4) * 0.42 + Math.sin(now * 2 + k + a.x) * 0.08;
        FX.leaf(ctx, ax, ay, an, 15 + hash(k + a.y) * 7, k % 2 ? th.leaf[2] : th.leaf[1], FX.rgba(th.leaf[0], 0.5));
      }
      /* the knot where a vine takes hold, and its ring */
      ctx.fillStyle = FX.shade(wood, 0.2); ctx.beginPath(); ctx.arc(ax, ay, 5.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,250,215,.8)'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(ax, ay, 17, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(ax, ay, 19.5, 0, TAU); ctx.stroke();
      FX.orb(gl, ax, ay, 22, '#fff6c8', 0.25);
    });
    /* lanterns hung in the trees after dark */
    if ((M.moon || v.m.time === 'dusk') && hash(i * 1.9) > 0.55 && tips[0]) {
      const a = tips[0], lx = (topX + a.x) / 2, ly = Math.min(a.y, t.top + 70) + 10;
      const swing = Math.sin(now * 1.6 + i) * 0.15;
      const bx = lx + Math.sin(swing) * 26, by = ly + Math.cos(swing) * 26;
      ctx.strokeStyle = '#2a1e14'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(bx, by); ctx.stroke();
      ctx.fillStyle = '#3a2414'; ctx.fillRect(bx - 6, by - 2, 12, 3); ctx.fillRect(bx - 6, by + 14, 12, 3);
      ctx.fillStyle = '#ffd890'; ctx.fillRect(bx - 5, by + 1, 10, 13);
      FX.orb(gl, bx, by + 7, 70, '#ffb050', 0.9);
      FX.orb(ctx, bx, by + 7, 90, '#ffb050', 0.18);
    }
  }
  function drawRoot(ctx, a, v) {
    const { th, now } = v;
    const sw = Math.sin(now + a.x) * 6;
    const pts = FX.quad(a.x, a.y - 300, a.x + 14 + sw, a.y - 140, a.x + sw * 0.5, a.y, 12);
    ctx.fillStyle = th.trunk; FX.ribbon(ctx, pts, 10, 4);
    for (let k = 2; k < 12; k += 2) FX.leaf(ctx, pts[k][0], pts[k][1], k % 4 ? 0.4 : Math.PI - 0.4, 12, th.leaf[2]);
    ctx.fillStyle = th.leaf[1]; ctx.beginPath(); ctx.arc(a.x + sw * 0.5, a.y, 10, 0, TAU); ctx.fill();
  }

  /* ---------------- the ground ---------------- */
  function drawGround(ctx, v) {
    const { c, th, now, Pp, M, m } = v;
    const STEPX = 12;
    const path = new Path2D();
    let open = false, firstX = 0;
    for (let x = Math.floor(v.x0 / STEPX) * STEPX; x <= v.x1; x += STEPX) {
      const s = c.groundAt(x);
      if (s == null) { if (open) { path.lineTo(x - STEPX, s2(x - STEPX) + 2000); path.lineTo(firstX, s2(firstX) + 2000); path.closePath(); open = false; } continue; }
      if (!open) { path.moveTo(x, s); open = true; firstX = x; } else path.lineTo(x, s);
    }
    function s2(x) { return c.surface(x); }
    if (open) { path.lineTo(v.x1, s2(v.x1) + 2000); path.lineTo(firstX, s2(firstX) + 2000); path.closePath(); }
    ctx.fillStyle = pat(ctx, Pp, 'dirt'); ctx.fill(path);
    /* darker as it goes down; shade under the turf */
    ctx.save(); ctx.clip(path);
    const top = c.surface(v.x0 + (v.x1 - v.x0) * 0.4);
    const dg = ctx.createLinearGradient(0, top, 0, top + 500);
    dg.addColorStop(0, 'rgba(0,0,0,0)'); dg.addColorStop(1, 'rgba(0,0,10,.55)');
    ctx.fillStyle = dg; ctx.fillRect(v.x0, top - 200, v.x1 - v.x0, 1400);
    if (M.dark) { ctx.fillStyle = FX.rgba('#0a1030', M.dark * 0.8); ctx.fillRect(v.x0, top - 400, v.x1 - v.x0, 2000); }
    /* stones */
    for (let x = Math.floor(v.x0 / 41) * 41; x <= v.x1; x += 41) {
      const s = c.groundAt(x); if (s == null) continue;
      const h1 = hash(x * 0.37), h2 = hash(x * 0.71);
      const sx = x + h2 * 20, sy = s + 40 + h1 * 160, rr = 5 + h2 * 9;
      ctx.fillStyle = FX.mix(th.rock, '#000000', 0.25 + h1 * 0.3);
      ctx.beginPath(); ctx.ellipse(sx, sy, rr, rr * 0.65, h1, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.ellipse(sx - rr * 0.25, sy - rr * 0.25, rr * 0.45, rr * 0.25, h1, 0, TAU); ctx.fill();
    }
    ctx.restore();
    /* the turf: a band of grass along the top, lit on its upper edge */
    const turf = [];
    for (let x = Math.floor(v.x0 / STEPX) * STEPX; x <= v.x1; x += STEPX) { const s = c.groundAt(x); turf.push(s == null ? null : [x, s]); }
    const runs = []; let cur = [];
    turf.forEach(p => { if (p) cur.push(p); else if (cur.length) { runs.push(cur); cur = []; } }); if (cur.length) runs.push(cur);
    const turfCol = FX.mix(th.grass[0], '#0a1030', M.dark * 0.7);
    runs.forEach(rn => {
      if (rn.length < 2) return;
      ctx.fillStyle = turfCol; FX.ribbon(ctx, rn.map(p => [p[0], p[1] + 7]), 18, 18);
      ctx.fillStyle = FX.rgba('#000000', 0.18); FX.ribbon(ctx, rn.map(p => [p[0], p[1] + 18]), 6, 6);
      ctx.fillStyle = FX.rgba(FX.mix(th.grass[2], M.light, 0.3), 0.6); FX.ribbon(ctx, rn.map(p => [p[0], p[1] - 1]), 3, 3);
    });
    /* hazard patches recolour the turf */
    c.zones.forEach(zn => {
      if (zn.x1 < v.x0 || zn.x0 > v.x1) return;
      const pts = []; for (let x = zn.x0; x <= zn.x1; x += 10) pts.push([x, c.surface(x) + 6]);
      ctx.fillStyle = zn.kind === 'venom' ? '#3a2a40' : zn.kind === 'vent' ? '#3a2e2a' : '#2e3a1a';
      FX.ribbon(ctx, pts, 20, 20);
    });
    /* grass blades and flowers, swaying */
    const wind = (m.wind || 0) * 0.04;
    const cols = th.grass.map(g => FX.mix(g, '#0a1030', M.dark * 0.7));
    for (let ci = 0; ci < 3; ci++) {
      ctx.strokeStyle = cols[ci]; ctx.lineWidth = ci === 2 ? 1.6 : 2.2; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let x = Math.floor(v.x0 / 6) * 6; x <= v.x1; x += 6) {
        if (Math.floor(hash(x * 0.13) * 3) !== ci) continue;
        const s = c.groundAt(x); if (s == null) continue;
        const zn = c.zoneAt(x); if (zn) continue;
        const h = 9 + hash(x * 0.71) * 16, bend = Math.sin(now * 2.2 + x * 0.02) * 3 + wind * 4;
        ctx.moveTo(x, s + 2); ctx.quadraticCurveTo(x + bend * 0.5, s - h * 0.5, x + bend, s - h);
      }
      ctx.stroke();
    }
    if (th.flowers.length) {
      for (let x = Math.floor(v.x0 / 23) * 23; x <= v.x1; x += 23) {
        if (hash(x * 0.29) > 0.3) continue;
        const s = c.groundAt(x); if (s == null || c.zoneAt(x)) continue;
        const h = 14 + hash(x) * 10, bend = Math.sin(now * 2 + x * 0.02) * 3;
        const col = th.flowers[Math.floor(hash(x * 1.7) * th.flowers.length)];
        ctx.strokeStyle = cols[0]; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, s); ctx.lineTo(x + bend, s - h); ctx.stroke();
        ctx.fillStyle = FX.mix(col, '#0a1030', M.dark * 0.6);
        for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; ctx.beginPath(); ctx.arc(x + bend + Math.cos(a) * 3, s - h + Math.sin(a) * 3, 2.4, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#ffe070'; ctx.beginPath(); ctx.arc(x + bend, s - h, 1.6, 0, TAU); ctx.fill();
      }
    }
    /* puddles in the rain */
    if (m.weather === 'rain') {
      for (let x = Math.floor(v.x0 / 170) * 170; x <= v.x1; x += 170) {
        if (hash(x * 0.17) > 0.5) continue;
        const s = c.groundAt(x); if (s == null) continue;
        ctx.fillStyle = FX.rgba(v.Pp.sky[2], 0.45); ctx.beginPath(); ctx.ellipse(x, s + 3, 30 + hash(x) * 20, 4, 0, 0, TAU); ctx.fill();
        const rp = (now * 1.5 + hash(x)) % 1;
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * (1 - rp)) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x + 6, s + 3, 4 + rp * 16, 1 + rp * 2.5, 0, 0, TAU); ctx.stroke();
      }
    }
  }

  /* ---------------- thorns, venom bogs, geysers ---------------- */
  function drawHazards(ctx, v) {
    const { c, now, gl, race } = v;
    c.zones.forEach(zn => {
      if (zn.x1 < v.x0 || zn.x0 > v.x1) return;
      if (zn.kind === 'thorns') {
        for (let x = zn.x0 + 6; x < zn.x1; x += 16) {
          const s = c.surface(x), h = hash(x);
          const pts = FX.quad(x, s + 2, x + 14, s - 40 - h * 24, x + 30, s - 8, 8);
          ctx.fillStyle = '#2a3a14'; FX.ribbon(ctx, pts, 4, 1.5);
          ctx.fillStyle = '#c8d0a0';
          for (let k = 2; k < 8; k += 2) { const p = pts[k]; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] - 3, p[1] - 7); ctx.lineTo(p[0] + 2, p[1] - 1); ctx.fill(); }
          if (h > 0.6) { ctx.fillStyle = '#8a1a3a'; ctx.beginPath(); ctx.arc(pts[5][0], pts[5][1] - 4, 3.5, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(pts[5][0] - 1, pts[5][1] - 5, 1.2, 0, TAU); ctx.fill(); }
        }
      } else if (zn.kind === 'venom') {
        for (let x = zn.x0 + 14; x < zn.x1; x += 34) {
          const s = c.surface(x), h = hash(x);
          const pg = ctx.createRadialGradient(x, s + 3, 2, x, s + 3, 26);
          pg.addColorStop(0, '#9a40b0'); pg.addColorStop(1, '#3a1a40');
          ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(x, s + 4, 26, 7, 0, 0, TAU); ctx.fill();
          FX.orb(gl, x, s, 38, '#b0f040', 0.25 + 0.15 * Math.sin(now * 2 + h * 9));
          const bp = (now * 0.8 + h) % 1;
          ctx.fillStyle = 'rgba(200,250,110,' + (0.8 * (1 - bp)) + ')'; ctx.beginPath(); ctx.arc(x + (h - 0.5) * 20, s - bp * 40, 3 + bp * 3, 0, TAU); ctx.fill();
          /* venomous plants */
          if (h > 0.5) { ctx.fillStyle = '#5a2a6a'; for (let k = 0; k < 4; k++) FX.leaf(ctx, x - 8, s, -Math.PI / 2 + (k - 1.5) * 0.4, 22, '#6a3a80', '#2a1030'); ctx.fillStyle = '#e0ff60'; ctx.beginPath(); ctx.arc(x - 8, s - 22, 3, 0, TAU); ctx.fill(); FX.orb(gl, x - 8, s - 22, 14, '#e0ff60', 0.8); }
        }
      }
    });
    c.geysers.forEach(gz => {
      if (gz.x < v.x0 || gz.x > v.x1) return;
      const s = c.surface(gz.x), on = PR.geyserOn(gz, race.t);
      /* the vent: a crusted rock cone */
      const cg = ctx.createLinearGradient(gz.x - 40, 0, gz.x + 40, 0);
      cg.addColorStop(0, '#4a3a30'); cg.addColorStop(0.5, '#6a564a'); cg.addColorStop(1, '#2a201c');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(gz.x - 46, s + 6); ctx.lineTo(gz.x - 16, s - 22); ctx.lineTo(gz.x + 16, s - 22); ctx.lineTo(gz.x + 46, s + 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = on ? '#ffc070' : '#7a3a22'; ctx.beginPath(); ctx.ellipse(gz.x, s - 22, 16, 5, 0, 0, TAU); ctx.fill();
      FX.orb(gl, gz.x, s - 22, on ? 70 : 30, '#ff8a30', on ? 0.9 : 0.4);
      if (on) {
        for (let k = 0; k < 14; k++) {
          const ph = ((now * 1.6 + k / 14) % 1), yy = s - 22 - ph * 720;
          const rr = 16 + ph * 70;
          const pg = ctx.createRadialGradient(gz.x, yy, 0, gz.x, yy, rr);
          pg.addColorStop(0, 'rgba(255,246,236,' + (0.55 * (1 - ph)) + ')'); pg.addColorStop(1, 'rgba(255,246,236,0)');
          ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(gz.x + Math.sin(k * 3 + now * 3) * 12 * ph, yy, rr, 0, TAU); ctx.fill();
        }
      } else if (Math.sin(now * 14 + gz.x) > 0.7) emit(gz.x, s - 26, 1, { col: 'rgba(255,240,230,.4)', sp: 30, r: 8, g: -80, life: 1, kind: 'puff' });
    });
  }

  /* ---------------- the start and finish ---------------- */
  function drawLines(ctx, v) {
    const { c, now, M, th, gl } = v;
    const gate = (x, label, col) => {
      if (x < v.x0 - 300 || x > v.x1 + 300) return;
      const s = c.surface(x);
      /* posts */
      [x - 6, x + 166].forEach(px => { const pg = ctx.createLinearGradient(px - 5, 0, px + 7, 0); pg.addColorStop(0, '#7a5a36'); pg.addColorStop(1, '#3a2814'); ctx.fillStyle = pg; ctx.fillRect(px - 5, s - 280, 12, 284); });
      /* a banner that ripples */
      for (let k = 0; k < 16; k++) {
        const wv = Math.sin(now * 3 + k * 0.6) * 4;
        ctx.fillStyle = k % 2 ? '#f4ece0' : col;
        ctx.beginPath(); ctx.moveTo(x + k * 10.5, s - 276 + wv); ctx.lineTo(x + (k + 1) * 10.5, s - 276 + Math.sin(now * 3 + (k + 1) * 0.6) * 4); ctx.lineTo(x + (k + 1) * 10.5, s - 244 + Math.sin(now * 3 + (k + 1) * 0.6) * 4); ctx.lineTo(x + k * 10.5, s - 244 + wv); ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(x, s - 248, 168, 4);
      ctx.fillStyle = '#2a1a10'; ctx.font = 'bold 22px Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillStyle = FX.mix('#fff4d8', '#0a1030', M.dark); ctx.fillText(label, x + 80, s - 290);
      /* bunting */
      ctx.strokeStyle = '#3a2814'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 6, s - 230); ctx.quadraticCurveTo(x + 80, s - 200, x + 166, s - 230); ctx.stroke();
      for (let k = 1; k < 9; k++) { const t = k / 9, bx = x - 6 + 172 * t, by = s - 230 + Math.sin(t * Math.PI) * 30; ctx.fillStyle = ['#e84a3a', '#f0c040', '#4a90d8', '#5ab05a'][k % 4]; ctx.beginPath(); ctx.moveTo(bx - 6, by); ctx.lineTo(bx + 6, by); ctx.lineTo(bx, by + 14 + Math.sin(now * 4 + k) * 2); ctx.fill(); }
      /* torches by night */
      if (M.moon || v.m.time === 'dusk') [x - 6, x + 166].forEach(px => { const fl = 0.8 + Math.sin(now * 13 + px) * 0.2; ctx.fillStyle = '#ffd070'; ctx.beginPath(); ctx.ellipse(px + 1, s - 290, 6, 11 * fl, 0, 0, TAU); ctx.fill(); FX.orb(gl, px + 1, s - 290, 80, '#ffa040', 0.9 * fl); });
      /* a crowd */
      if (label === 'FINISH' || th.fair) crowd(ctx, x - 300, x + 480, s, v);
    };
    gate(c.startX + 40, 'START', '#3a8a3a');
    gate(c.finish, 'FINISH', '#c8302a');
  }
  function crowd(ctx, xa, xb, s, v) {
    const { now, M } = v;
    for (let x = xa; x < xb; x += 17) {
      if (x > xa + 280 && x < xa + 470) continue;     // the track itself
      const h = hash(x * 0.3), y = v.c.surface(x) + 2;
      const bob = Math.abs(Math.sin(now * 6 + h * 20)) * 4 * (h > 0.4 ? 1 : 0.3);
      const body = FX.mix(['#7a4a3a', '#3a5a7a', '#5a7a3a', '#7a6a3a', '#6a3a6a'][Math.floor(h * 5)], '#0a1030', M.dark);
      const skin = FX.mix('#9a7a50', '#0a1030', M.dark);
      ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(x, y - 18 - bob, 7, 13, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(x, y - 36 - bob, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = FX.mix(['#6a4a24', '#4a3a2a', '#8a6a3a'][Math.floor(h * 3)], '#0a1030', M.dark);
      ctx.beginPath(); ctx.ellipse(x, y - 40 - bob, 8.5, 5, 0, Math.PI, TAU); ctx.fill();
      if (h > 0.7) { ctx.strokeStyle = skin; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + 5, y - 26 - bob); ctx.lineTo(x + 10, y - 44 - bob - Math.sin(now * 8 + h) * 4); ctx.stroke(); }
    }
  }

  /* ---------------- Ju fruit ---------------- */
  function drawFruit(ctx, v, focus) {
    const { c, now, th, gl } = v;
    c.fruit.forEach(f => {
      if (f.x < v.x0 || f.x > v.x1 || focus.fruit[f.id]) return;
      const bob = Math.sin(now * 3 + f.id) * 5, y = f.y + bob;
      FX.orb(gl, f.x, y, 34, th.fruit, 0.6);
      ctx.strokeStyle = '#3a5a22'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(f.x, y - 12); ctx.quadraticCurveTo(f.x + 3, y - 40, f.x - 2, y - 70); ctx.stroke();
      const fg = ctx.createRadialGradient(f.x - 4, y - 4, 1, f.x, y, 12);
      fg.addColorStop(0, FX.mix(th.fruit, '#ffffff', 0.55)); fg.addColorStop(0.6, th.fruit); fg.addColorStop(1, FX.mix(th.fruit, '#000000', 0.4));
      ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(f.x, y, 11, 12.5, 0, 0, TAU); ctx.fill();
      FX.leaf(ctx, f.x, y - 11, -0.7, 12, '#4a8a3a', '#2a5a22');
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(f.x - 4, y - 5, 3, 2, -0.6, 0, TAU); ctx.fill();
      const tw = (now * 1.3 + f.id * 0.37) % 1;
      if (tw < 0.25) { const k = Math.sin(tw / 0.25 * Math.PI); gl.fillStyle = 'rgba(255,255,230,' + k + ')'; gl.fillRect(f.x + 8 - 1, y - 14 - 9 * k, 2, 18 * k); gl.fillRect(f.x + 8 - 9 * k, y - 14 - 1, 18 * k, 2); }
    });
  }

  /* ================= a Punk and its rider ================= */
  const VIS = {};            // per-runner things that lag behind: the rider's scarf, the vine-legs
  A.VIS = VIS;
  const RIDER_COL = { me: '#3a6aa8', tessa: '#8a3a2a', oddo: '#4a4a2a', sefi: '#2a6a7a', brakk: '#6a5a2a', neka: '#2a5a3a', lun: '#3a3a6a', ama: '#a8702a', _ghost: '#ffffff' };
  function drawPunk(ctx, gl, u, v, focus, ghost) {
    const { th, now, M } = v;
    const coat = PR.COATS[u.coat] || PR.COATS.orange;
    const R0 = PR.PUNK_R, BIG = 1.4, R = R0 * BIG;
    const cx = u.x, cy = u.y - (BIG - 1) * R0;
    const run = u.mode === 'ground', swing = u.mode === 'swing', swim = u.mode === 'swim';
    const vx = u.vx || 0, vy = u.vy || 0, speed = Math.hypot(vx, vy);
    const vis = VIS[u.id] || (VIS[u.id] = { scarf: [], legs: [] });
    const dark = M.dark;
    const tint = col => dark ? FX.mix(col, '#0a1030', dark * 0.75) : col;

    /* a soft shadow on the ground below, smaller the higher it flies */
    const gs = v.c.groundAt(u.x);
    if (gs != null && !swim) {
      const h = Math.max(0, gs - (u.y + R0));
      const k = Math.max(0.15, 1 - h / 400);
      ctx.fillStyle = 'rgba(0,0,0,' + (0.28 * k) + ')';
      ctx.beginPath(); ctx.ellipse(cx, gs + 2, R * 1.2 * (0.6 + k * 0.4), R * 0.22 * k, 0, 0, TAU); ctx.fill();
    }
    /* speed: a few faint copies trailing behind */
    if (speed > 650 && !ghost) {
      for (let k = 1; k <= 3; k++) {
        ctx.fillStyle = FX.rgba(coat.rind, 0.12 / k);
        ctx.beginPath(); ctx.ellipse(cx - vx * 0.018 * k, cy - vy * 0.018 * k, R * 0.95, R * 0.85, 0, 0, TAU); ctx.fill();
      }
    }
    if (u.boostT > 0) {
      const bg = ctx.createLinearGradient(cx, 0, cx - R * 5, 0);
      bg.addColorStop(0, 'rgba(255,220,120,.6)'); bg.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(cx - R * 2.2, cy, R * 2.6, R * 0.55, Math.atan2(vy, vx) * 0.5, 0, TAU); ctx.fill();
      FX.orb(gl, cx - R, cy, R * 2.4, '#ffd070', 0.45);
    }
    /* slipstream lines */
    if (u.draft && !ghost) {
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.5;
      for (let k = 0; k < 4; k++) { const yy = cy - R + k * R * 0.6, ph = (now * 4 + k * 0.3) % 1; ctx.beginPath(); ctx.moveTo(cx + R * (1.5 - ph * 3), yy); ctx.lineTo(cx + R * (0.6 - ph * 3), yy); ctx.stroke(); }
    }

    const tilt = Math.max(-0.5, Math.min(0.5, vy / 1600));
    const bounce = run ? Math.abs(Math.sin(u.spin * 3)) * 4 : 0;
    const swingRot = swing && u.anchor ? Math.atan2(u.x - u.anchor.x, u.anchor.y - u.y) * -0.25 : 0;
    const rot = tilt + swingRot + (u.flipA || 0);
    const topX = cx + Math.sin(rot) * R * 0.9, topY = cy - bounce - Math.cos(rot) * R * 0.9;

    /* the vine-legs: 7 leafy vines from the top, round the stem, draping down */
    const vineDark = tint(FX.shade(coat.vine, -0.25)), vineLit = tint(FX.shade(coat.vine, 0.25));
    for (let k = 0; k < 7; k++) {
      const side = k < 3 ? -1 : k > 3 ? 1 : (k % 2 ? 1 : -1), j = Math.abs(k - 3);
      const ph = u.spin * 3 + k * 1.05;
      let fx, fy;
      if (run) { fx = cx + Math.sin(ph) * R * 1.0 + (k - 3) * R * 0.22; fy = cy + R0 + Math.min(0, Math.cos(ph)) * R * 0.4; }
      else if (swim) { fx = cx + Math.sin(now * 6 + k) * R * 0.9; fy = cy + R * 0.85; }
      else if (swing) { fx = cx + side * R * (0.5 + j * 0.2) - vx * 0.02; fy = cy + R * (1.05 + j * 0.12); }
      else { fx = cx - vx * 0.045 + side * R * 0.3 * (j + 1) * 0.7; fy = cy + R * (0.75 + j * 0.16) - vy * 0.025; }
      if (u.flipA) { const a = u.flipA; const dx = fx - cx, dy = fy - cy; fx = cx + dx * Math.cos(a) - dy * Math.sin(a); fy = cy + dx * Math.sin(a) + dy * Math.cos(a); }
      /* each vine lags behind a little, like something with weight */
      const L = vis.legs[k] || (vis.legs[k] = [fx, fy]);
      L[0] += (fx - L[0]) * 0.35; L[1] += (fy - L[1]) * 0.35;
      const sx = topX + side * R * 0.12, sy = topY + R * 0.12;
      const mx = (sx + L[0]) / 2 + side * R * 1.1 * Math.cos(rot), my = (sy + L[1]) / 2 - R * 0.6 + side * R * 0.3 * Math.sin(rot);
      const pts = FX.quad(sx, sy, mx, my, L[0], L[1], 9);
      ctx.fillStyle = k % 2 ? vineDark : tint(coat.vine);
      FX.ribbon(ctx, pts, 6.5 - j * 0.6, 1.8);
      ctx.fillStyle = FX.rgba(vineLit, 0.6); FX.ribbon(ctx, pts.map(p => [p[0] - 1, p[1] - 1]), 2, 0.6);
      /* a leaf or two on each */
      FX.leaf(ctx, pts[4][0], pts[4][1], (side > 0 ? -0.4 : Math.PI + 0.4) + Math.sin(now * 3 + k) * 0.2, 10, tint(FX.shade(coat.vine, 0.15)), vineDark);
      /* a curled tip */
      ctx.strokeStyle = vineDark; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(L[0] + side * 3, L[1], 3.5, 0, TAU * 0.8); ctx.stroke();
    }
    /* the swinging vine to its branch */
    if (swing && u.anchor) {
      const ax = u.anchor.x, ay = u.anchor.y;
      const d = Math.hypot(ax - topX, ay - topY);
      const sag = Math.max(0, u.len - d) * 0.5;
      const pts = FX.quad(topX, topY, (ax + topX) / 2 + sag * 0.3, (ay + topY) / 2 + sag, ax, ay, 14);
      ctx.fillStyle = tint(coat.vine); FX.ribbon(ctx, pts, 7, 4);
      ctx.fillStyle = FX.rgba(vineLit, 0.7); FX.ribbon(ctx, pts.map(p => [p[0] - 1.2, p[1] - 1]), 2, 1);
      for (let k = 3; k < 13; k += 3) FX.leaf(ctx, pts[k][0], pts[k][1], (k % 2 ? 0.6 : -2.4) + Math.sin(now * 5 + k) * 0.15, 11, tint(FX.shade(coat.vine, 0.2)), vineDark);
      /* where it wraps the branch */
      ctx.strokeStyle = vineDark; ctx.lineWidth = 3;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(ax + (k - 1) * 4, ay, 4, 7, 0.3, 0, TAU); ctx.stroke(); }
      if (u.anchor.brittle) { ctx.strokeStyle = 'rgba(255,200,150,' + (0.5 + Math.sin(now * 30) * 0.5) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax - 10, ay - 6); ctx.lineTo(ax - 3, ay + 2); ctx.lineTo(ax + 4, ay - 5); ctx.stroke(); }
    }

    /* the pumpkin: ribbed, lit from the sun's side, no eyes and no mouth */
    ctx.save();
    ctx.translate(cx, cy - bounce); ctx.rotate(rot);
    const lightX = M.sun[0] < 0.5 ? -1 : 1;
    const rind = tint(coat.rind), rib = tint(coat.rib);
    const bodyG = ctx.createRadialGradient(lightX * R * 0.35, -R * 0.45, R * 0.1, 0, 0, R * 1.15);
    bodyG.addColorStop(0, FX.shade(rind, 0.3)); bodyG.addColorStop(0.55, rind); bodyG.addColorStop(1, FX.shade(rib, -0.3));
    ctx.fillStyle = bodyG;
    ctx.beginPath(); ctx.ellipse(0, 0, R * 1.02, R * 0.88, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, R * 1.02, R * 0.88, 0, 0, TAU); ctx.clip();
    /* ribs: each lobe has its own soft light and a dark crease beside it */
    [-0.78, -0.42, -0.08, 0.26, 0.6].forEach((o, k) => {
      const rx = o * R + R * 0.17;
      const lg = ctx.createLinearGradient(rx - R * 0.2, 0, rx + R * 0.2, 0);
      lg.addColorStop(0, FX.rgba(FX.shade(rib, -0.3), 0.4)); lg.addColorStop(0.35, FX.rgba(rind, 0)); lg.addColorStop(0.6, FX.rgba(FX.shade(rind, 0.22), 0.16 + (lightX * o < 0 ? 0.1 : 0))); lg.addColorStop(1, FX.rgba(rind, 0));
      ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(rx, 0, R * 0.22, R * 0.92, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = FX.rgba(FX.shade(rib, -0.4), 0.42); ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(o * R, -R * 0.86); ctx.quadraticCurveTo(o * R * 1.18, 0, o * R, R * 0.86); ctx.stroke();
    });
    if (u.coat === 'striped') { ctx.strokeStyle = FX.rgba(rib, 0.9); ctx.lineWidth = 4; [-0.6, 0, 0.6].forEach(o => { ctx.beginPath(); ctx.moveTo(o * R, -R * 0.86); ctx.quadraticCurveTo(o * R * 1.2, 0, o * R, R * 0.86); ctx.stroke(); }); }
    if (u.coat === 'ember' || u.coat === 'night') {
      const ec = u.coat === 'ember' ? '#ffc050' : '#a080ff';
      ctx.strokeStyle = FX.rgba(ec, 0.6 + Math.sin(now * 5) * 0.3); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-R * 0.5, -R * 0.3); ctx.lineTo(-R * 0.2, R * 0.05); ctx.lineTo(R * 0.15, -R * 0.15); ctx.lineTo(R * 0.4, R * 0.25); ctx.stroke();
    }
    /* bottom in shadow, rim light on the sun side */
    const ao = ctx.createLinearGradient(0, R * 0.1, 0, R * 0.9);
    ao.addColorStop(0, 'rgba(0,0,0,0)'); ao.addColorStop(1, 'rgba(0,0,0,.35)');
    ctx.fillStyle = ao; ctx.fillRect(-R * 1.1, -R, R * 2.2, R * 2);
    ctx.restore();
    ctx.strokeStyle = FX.rgba(M.light, 0.55); ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.ellipse(0, 0, R * 1.0, R * 0.86, 0, lightX < 0 ? Math.PI * 0.95 : -Math.PI * 0.45, lightX < 0 ? Math.PI * 1.45 : Math.PI * 0.05); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(lightX * R * 0.42, -R * 0.5, R * 0.2, R * 0.1, lightX * -0.5, 0, TAU); ctx.fill();
    if (u.coat === 'ember' || u.coat === 'night') { gl.save(); gl.translate(cx, cy); FX.orb(gl, 0, 0, R * 1.2, u.coat === 'ember' ? '#ff8a30' : '#8a60ff', 0.3); gl.restore(); }
    /* the stem, curved and ridged (the saddle's pommel) */
    const stG = ctx.createLinearGradient(-R * 0.15, -R * 1.3, R * 0.25, -R * 0.8);
    stG.addColorStop(0, tint(FX.shade(coat.stem, 0.25))); stG.addColorStop(1, tint(FX.shade(coat.stem, -0.25)));
    ctx.fillStyle = stG;
    ctx.beginPath(); ctx.moveTo(-R * 0.13, -R * 0.8); ctx.quadraticCurveTo(-R * 0.08, -R * 1.25, R * 0.22, -R * 1.34); ctx.lineTo(R * 0.27, -R * 1.2); ctx.quadraticCurveTo(R * 0.08, -R * 1.12, R * 0.13, -R * 0.8); ctx.closePath(); ctx.fill();
    /* the saddle blanket, striped, with tassels */
    const hat = u.hat || '#6a5a2a';
    ctx.fillStyle = tint(hat);
    ctx.beginPath(); ctx.ellipse(-R * 0.18, -R * 0.78, R * 0.58, R * 0.17, -0.1, 0, TAU); ctx.fill();
    ctx.strokeStyle = tint(FX.shade(hat, 0.4)); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(-R * 0.18, -R * 0.78, R * 0.46, R * 0.11, -0.1, 0, TAU); ctx.stroke();
    ctx.fillStyle = tint(FX.shade(hat, -0.3));
    [-0.7, 0.35].forEach(o => { ctx.beginPath(); ctx.moveTo(o * R, -R * 0.72); ctx.lineTo(o * R - 2, -R * 0.5 + Math.sin(now * 8 + o) * 2); ctx.lineTo(o * R + 2, -R * 0.5 + Math.sin(now * 8 + o) * 2); ctx.fill(); });

    /* the rider: a little Eikar leaning into it */
    const lean = Math.max(-0.4, Math.min(0.6, vx / 1500));
    ctx.save();
    ctx.translate(-R * 0.25, -R * 0.95); ctx.rotate(lean);
    const tunic = tint(RIDER_COL[u.id] || '#5a4a6a');
    const skin = tint('#9a7448'), skinD = tint('#6a4e2e');
    /* legs over the blanket */
    ctx.strokeStyle = tint(FX.shade(RIDER_COL[u.id] || '#5a4a6a', -0.3)); ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -R * 0.2); ctx.lineTo(R * 0.22, R * 0.05); ctx.lineTo(R * 0.18, R * 0.2); ctx.stroke();
    /* body */
    const tg = ctx.createLinearGradient(-R * 0.2, 0, R * 0.2, 0);
    tg.addColorStop(0, FX.shade(tunic, lightX < 0 ? 0.2 : -0.25)); tg.addColorStop(1, FX.shade(tunic, lightX < 0 ? -0.25 : 0.2));
    ctx.fillStyle = tg; ctx.beginPath(); ctx.ellipse(0, -R * 0.38, R * 0.22, R * 0.33, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = tint('#3a2414'); ctx.fillRect(-R * 0.2, -R * 0.24, R * 0.4, R * 0.06);    // belt
    /* the scarf, streaming behind */
    const neckX = cx + Math.cos(rot) * (-R * 0.25) - Math.sin(rot) * (-R * 0.95 - R * 0.62), neckY = cy - bounce + Math.sin(rot) * (-R * 0.25) + Math.cos(rot) * (-R * 0.95 - R * 0.62);
    if (!vis.scarf.length) for (let k = 0; k < 7; k++) vis.scarf.push([neckX - k * 6, neckY]);
    vis.scarf[0] = [neckX, neckY];
    for (let k = 1; k < vis.scarf.length; k++) {
      const p = vis.scarf[k], q = vis.scarf[k - 1];
      p[0] += (q[0] - p[0]) * 0.45 - vx * 0.004 - 0.6; p[1] += (q[1] - p[1]) * 0.45 + 0.8 + Math.sin(now * 9 + k) * 0.6;
      const dx = p[0] - q[0], dy = p[1] - q[1], d = Math.hypot(dx, dy) || 1;
      if (d > 7) { p[0] = q[0] + dx / d * 7; p[1] = q[1] + dy / d * 7; }
    }
    ctx.restore(); ctx.restore();
    ctx.fillStyle = tint(FX.shade(RIDER_COL[u.id] || '#c84a3a', 0.35));
    FX.ribbon(ctx, vis.scarf, 6, 2.5);
    ctx.save(); ctx.translate(cx, cy - bounce); ctx.rotate(rot); ctx.translate(-R * 0.25, -R * 0.95); ctx.rotate(lean);
    /* arm to the stem */
    ctx.strokeStyle = skin; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(R * 0.05, -R * 0.5); ctx.quadraticCurveTo(R * 0.3, -R * 0.4, R * 0.42, -R * 0.22); ctx.stroke();
    /* head: acorn-skinned, one bright eye, the marking beneath it */
    const hg = ctx.createRadialGradient(R * 0.02, -R * 0.86, R * 0.02, R * 0.05, -R * 0.78, R * 0.22);
    hg.addColorStop(0, FX.shade(skin, 0.2)); hg.addColorStop(1, skinD);
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(R * 0.05, -R * 0.8, R * 0.21, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a0e06'; ctx.beginPath(); ctx.ellipse(R * 0.15, -R * 0.82, R * 0.04, R * 0.05, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(R * 0.16, -R * 0.84, R * 0.015, 0, TAU); ctx.fill();
    ctx.strokeStyle = tint('#4a2a12'); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(R * 0.1, -R * 0.74); ctx.quadraticCurveTo(R * 0.15, -R * 0.71, R * 0.2, -R * 0.74); ctx.stroke();
    /* the Aagac: an acorn cap with its little scales and a stalk */
    const capC = tint(hat);
    const cg = ctx.createLinearGradient(0, -R * 1.12, 0, -R * 0.88);
    cg.addColorStop(0, FX.shade(capC, 0.25)); cg.addColorStop(1, FX.shade(capC, -0.3));
    ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(R * 0.04, -R * 0.94, R * 0.29, R * 0.19, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = FX.rgba(FX.shade(capC, -0.45), 0.8); ctx.lineWidth = 0.9;
    for (let row = 0; row < 3; row++) for (let k = -3; k <= 3; k++) {
      const yy = -R * (0.96 + row * 0.055), xx = R * (0.04 + k * 0.075 * (1 - row * 0.22) + (row % 2) * 0.035);
      ctx.beginPath(); ctx.arc(xx, yy, R * 0.035, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
    }
    ctx.fillStyle = FX.shade(capC, -0.2); ctx.fillRect(R * 0.02, -R * 1.2, R * 0.05, R * 0.1);
    ctx.fillStyle = FX.rgba(M.light, 0.35); ctx.beginPath(); ctx.ellipse(R * (lightX < 0 ? -0.08 : 0.16), -R * 1.04, R * 0.08, R * 0.03, 0, 0, TAU); ctx.fill();
    ctx.restore();

    /* names over rivals */
    if (!focus && u.rider && !ghost) {
      ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillText(u.rider, cx + 1, cy - R * 2.15 + 1);
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText(u.rider, cx, cy - R * 2.15);
    }
  }
  A.drawPunk = (ctx, u, SX, SY, z, now, th, focus) => {
    /* the old signature, kept for callers that draw a lone Punk */
    ctx.save(); ctx.translate(SX(0), SY(0)); ctx.scale(z, z);
    drawPunk(ctx, glow.ctx, u, { th: th || A.THEMES.farm, now, M: A.MOODS.day, c: { groundAt: () => null } }, focus, true);
    ctx.restore();
  };

  /* ---------------- particles, and the air full of things ---------------- */
  function drawParts(ctx, gl, v) {
    parts.forEach(p => {
      const a = Math.max(0, 1 - p.age / p.life);
      if (p.kind === 'spark' || p.kind === 'ember' || p.kind === 'firefly') {
        const r = p.r * (p.kind === 'firefly' ? 1 : 0.6 + a * 0.6);
        gl.globalAlpha = a * (p.kind === 'firefly' ? 0.5 + 0.5 * Math.sin(p.age * 6 + p.rot) : 1);
        FX.orb(gl, p.x, p.y, r * 3.2, p.col.charAt(0) === '#' ? p.col : '#ffe080', p.kind === 'spark' ? 0.5 : 0.8);
        gl.globalAlpha = 1;
        ctx.globalAlpha = a; ctx.fillStyle = p.col.charAt(0) === '#' ? FX.shade(p.col, 0.4) : p.col;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
      } else if (p.kind === 'leaf' || p.kind === 'petal') {
        ctx.globalAlpha = Math.min(1, a * 2);
        FX.leaf(ctx, p.x, p.y, p.rot, p.r * 3, p.col);
      } else if (p.kind === 'confetti') {
        ctx.globalAlpha = Math.min(1, a * 2); ctx.fillStyle = p.col;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r * Math.abs(Math.cos(p.age * 9)) + 0.5); ctx.restore();
      } else if (p.kind === 'chip') {
        ctx.globalAlpha = a; ctx.fillStyle = p.col;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.r * 1.5, -p.r * 0.4, p.r * 3, p.r * 0.8); ctx.restore();
      } else if (p.kind === 'ring') {
        ctx.globalAlpha = a; ctx.strokeStyle = p.col; ctx.lineWidth = 3 * a;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1.6 - a), 0, TAU); ctx.stroke();
      } else if (p.kind === 'star') {
        ctx.globalAlpha = a; ctx.fillStyle = p.col;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? p.r * 0.45 : p.r * 1.3; ctx.lineTo(Math.cos(k / 10 * TAU) * rr, Math.sin(k / 10 * TAU) * rr); } ctx.fill(); ctx.restore();
        FX.orb(gl, p.x, p.y, p.r * 3, '#fff0a0', a * 0.5);
      } else if (p.kind === 'drop') {
        ctx.globalAlpha = a; ctx.strokeStyle = p.col; ctx.lineWidth = p.r * 0.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02); ctx.stroke();
      } else if (p.kind === 'puff') {
        const r = p.r * (1 + (1 - a) * 2.2);
        ctx.globalAlpha = a * 0.9;
        const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        pg.addColorStop(0, p.col); pg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
      } else {
        ctx.globalAlpha = a; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      }
    });
    ctx.globalAlpha = 1; gl.globalAlpha = 1;
  }
  let ambT = 0;
  function ambient(v, focus) {
    ambT += 1;
    const { th, M, m } = v;
    const x = v.x0 + Math.random() * (v.x1 - v.x0), y = focus.y - 500 + Math.random() * 700;
    let kind = th.ambient;
    if (M.moon && th.ambient !== 'embers') kind = 'fireflies';
    if (m.weather === 'rain') return;
    if (ambT % 3) return;
    if (kind === 'petals') emit(x, y - 200, 1, { col: ['#ffd0e0', '#fff4f8', '#ffe8a0'][ambT % 3], sp: 30, r: 2.2, g: 30, life: 6, kind: 'petal', drag: 0.3, vx: (m.wind || -20) * 0.6 });
    else if (kind === 'leaves') emit(x, y - 200, 1, { col: [th.leaf[2], th.leaf[3], '#c8a040'][ambT % 3], sp: 30, r: 2.6, g: 40, life: 6, kind: 'leaf', drag: 0.3, vx: (m.wind || -15) * 0.6 });
    else if (kind === 'embers') emit(x, v.c.surface(x), 1, { col: '#ff9a40', sp: 40, r: 1.6, g: -60, life: 3.5, kind: 'ember', drag: 0.2, vx: m.wind || 0 });
    else if (kind === 'fireflies') { if (ambT % 6 === 0) emit(x, v.c.surface(x) - 30 - Math.random() * 160, 1, { col: '#d8ff70', sp: 20, r: 1.8, g: 0, life: 5, kind: 'firefly', drag: 0.1 }); }
    else if (kind === 'motes') emit(x, y, 1, { col: 'rgba(255,255,240,.55)', sp: 10, r: 1.4, g: -4, life: 5, kind: 'dot', drag: 0.1 });
    else if (kind === 'confetti' && ambT % 9 === 0) emit(x, y - 300, 1, { col: ['#ff6a5a', '#ffd84a', '#5ad0ff', '#9aff6a'][ambT % 4], sp: 30, r: 2.6, g: 50, life: 6, kind: 'confetti', drag: 0.4 });
  }

  /* ---------------- in front of the camera ---------------- */
  function drawForeground(ctx, W, H, cam, z, v) {
    const { th, M, now, m } = v;
    if (th.lava) return;
    const k = 1.35, span = 3200;
    const col = FX.mix(th.near, '#000000', 0.45 + M.dark * 0.35);
    ctx.save(); ctx.globalAlpha = 0.88;
    for (let i = 0; i < 5; i++) {
      const wx = i * span / 5 + hash(i) * 300;
      const sx = ((wx - cam.x * z * k) % span + span) % span - 300;
      const base = H + 20, h = H * (0.13 + hash(i * 3) * 0.08);
      const sway = Math.sin(now * 0.9 + i) * 0.04 + (m.wind ? Math.sign(m.wind) * 0.06 : 0);
      if (th.shape === 'pine') {
        /* tall grass stems */
        ctx.strokeStyle = col; ctx.lineCap = 'round';
        for (let j = 0; j < 9; j++) { ctx.lineWidth = 3 - j * 0.15; const hh = h * (0.6 + hash(i + j) * 0.6); ctx.beginPath(); ctx.moveTo(sx + j * 9, base); ctx.quadraticCurveTo(sx + j * 9 + 10, base - hh * 0.6, sx + j * 9 + 22 + Math.sin(now + j) * 4, base - hh); ctx.stroke(); }
      } else {
        /* a fern: arching fronds with leaflets down both sides */
        for (let j = 0; j < 4; j++) {
          const ang = -Math.PI / 2 + (j - 1.5) * 0.45 + sway, len = h * (0.9 + hash(i * 7 + j) * 0.5);
          const ex = sx + Math.cos(ang) * len, ey = base + Math.sin(ang) * len;
          const pts = FX.quad(sx, base, sx + Math.cos(ang) * len * 0.5 + (j - 1.5) * 20, base + Math.sin(ang) * len * 0.7, ex + (j - 1.5) * 26, ey + len * 0.2, 12);
          ctx.fillStyle = col; FX.ribbon(ctx, pts, 4, 1);
          for (let q = 1; q < 12; q++) {
            const p0 = pts[q], p1 = pts[q + 1] || pts[q], da = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
            const ll = len * 0.17 * (1 - q / 13);
            FX.leaf(ctx, p0[0], p0[1], da - 1.1, ll, col); FX.leaf(ctx, p0[0], p0[1], da + 1.1, ll, col);
          }
        }
      }
    }
    ctx.restore();
  }
  const drops = Array.from({ length: 220 }, (_, i) => [hash(i * 1.3), hash(i * 7.1), 0.6 + hash(i * 3.3) * 0.8]);
  function rain(ctx, W, H, now, cam, z) {
    ctx.strokeStyle = 'rgba(200,215,235,.42)'; ctx.lineWidth = 1.2; ctx.beginPath();
    drops.forEach(d => {
      const x = ((d[0] * W * 1.3 - cam.x * z * 0.9 * d[2] - now * 120) % (W * 1.3) + W * 1.3) % (W * 1.3) - W * 0.15;
      const y = (d[1] * H + now * 900 * d[2]) % H;
      ctx.moveTo(x, y); ctx.lineTo(x - 5 * d[2], y + 18 * d[2]);
    });
    ctx.stroke();
    ctx.fillStyle = 'rgba(40,50,70,.12)'; ctx.fillRect(0, 0, W, H);
  }
  function windLines(ctx, W, H, now, wind) {
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5;
    const dir = Math.sign(wind);
    for (let i = 0; i < 14; i++) {
      const y = hash(i * 5) * H * 0.85, ph = ((now * 0.6 * (1 + hash(i)) + hash(i * 3)) % 1);
      const x = dir > 0 ? ph * W * 1.4 - W * 0.2 : W * 1.2 - ph * W * 1.4;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + dir * 60, y - 6, x + dir * 130, y + Math.sin(i) * 4); ctx.stroke();
    }
  }

  /* ---------------- a portrait for the stable ---------------- */
  A.portrait = function (canvas, punk, hat) {
    const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
    const th = A.THEMES.farm, M = A.MOODS.day;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#4a6a8a'); bg.addColorStop(0.6, '#8aa86a'); bg.addColorStop(1, '#3a5a22');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    /* soft out-of-focus lights behind */
    for (let i = 0; i < 9; i++) FX.orb(ctx, hash(i + 1) * W, hash(i * 3 + 1) * H * 0.6, W * (0.08 + hash(i) * 0.1), i % 2 ? '#fff0c0' : '#c0e8a0', 0.35);
    ctx.fillStyle = '#4a7a2a'; ctx.beginPath(); ctx.ellipse(W / 2, H * 0.92, W * 0.7, H * 0.18, 0, 0, TAU); ctx.fill();
    const z = H / 120;
    ctx.save(); ctx.translate(W / 2, H * 0.68); ctx.scale(z, z);
    const id = '_portrait_' + punk.coat + (hat || '');
    delete VIS[id];
    const u = { id, x: 0, y: 0, vx: 0, vy: 0, mode: 'ground', coat: punk.coat, hat: hat || '#6a5a2a', spin: 0.3, boostT: 0, flipA: 0 };
    const view = { th, now: 0, M, c: { groundAt: () => PR.PUNK_R } };
    const scratch = FX.canvas(4, 4).getContext('2d');
    for (let k = 0; k < 8; k++) drawPunk(scratch, scratch, u, view, true, true);     // let the scarf and vines settle, off-screen
    drawPunk(ctx, scratch, u, view, true, true);
    ctx.restore();
    FX.vignette(ctx, W, H, 0.35);
  };
  A.lighten = (hex, k) => FX.shade(hex, k);
})();
