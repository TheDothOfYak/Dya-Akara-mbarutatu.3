// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3: sky, day and night, weather, far parallax, and the light/dark overlay.
(function () {
  'use strict';
  const V3 = window.V3, U = V3.util, P = V3.paint, TAU = U.TAU;
  const S = (V3.sky = {});
  S.dayLen = 480;           // real seconds per day, same as V2
  S.t = 0.36;               // 0 midnight, 0.25 sunrise, 0.5 noon, 0.75 sunset
  S.time = 0;               // seconds since start (drives sway and drift)
  S.weather = 'clear'; S.rain = 0; S.fog = 0; S.wind = 0.2; S.windBase = 0.2; S.rainbow = 0;
  S.night = 0; S.nextWeather = 80;
  const WX = { clear: { rain: 0, fog: 0, wind: 0.15 }, breeze: { rain: 0, fog: 0, wind: 0.7 }, rain: { rain: 1, fog: 0.15, wind: 0.5 }, sunshower: { rain: 0.45, fog: 0, wind: 0.3 }, fog: { rain: 0, fog: 1, wind: 0.05 } };
  S.setTime = (t) => { S.t = ((t % 1) + 1) % 1; };
  S.setWeather = (k) => { if (Object.prototype.hasOwnProperty.call(WX, k)) { S.weather = k; S.nextWeather = U.rand(80, 150); V3.bus.emit('weather', k); } };

  const TOP = [[0, '#0a0f2e'], [0.19, '#141a44'], [0.25, '#3c4f8c'], [0.31, '#4a97d4'], [0.5, '#3b97dc'], [0.67, '#4b8fcf'], [0.74, '#5d4c92'], [0.8, '#211b4c'], [1, '#0a0f2e']];
  const MID = [[0, '#141c48'], [0.19, '#2a2a5e'], [0.25, '#c08aa0'], [0.31, '#8fd0ee'], [0.5, '#86cdf0'], [0.67, '#a9cfe0'], [0.74, '#e07f8a'], [0.8, '#3a2c66'], [1, '#141c48']];
  const BOT = [[0, '#1d2756'], [0.19, '#3e3a6c'], [0.25, '#ffb37c'], [0.31, '#d6f0ee'], [0.5, '#dff5f2'], [0.67, '#fbe2ae'], [0.74, '#ff9a6e'], [0.8, '#57407a'], [1, '#1d2756']];
  S.pal = {};

  S.update = (dt) => {
    S.time += dt; S.t = (S.t + dt / S.dayLen) % 1;
    const t = S.t;
    S.night = t < 0.18 || t > 0.84 ? 1 : t < 0.29 ? 1 - U.smooth((t - 0.18) / 0.11) : t > 0.72 ? U.smooth((t - 0.72) / 0.12) : 0;
    S.gold = Math.max(0, 1 - Math.abs(t - 0.27) / 0.07, 1 - Math.abs(t - 0.735) / 0.075); // dawn and dusk warmth
    const w = WX[S.weather];
    S.rain = U.damp(S.rain, w.rain, 0.5, dt); S.fog = U.damp(S.fog, w.fog + (t > 0.2 && t < 0.3 ? 0.35 : 0), 0.3, dt);
    S.windBase = U.damp(S.windBase, w.wind, 0.4, dt);
    S.wind = S.windBase * (0.55 + U.noise(S.time * 0.23) * 0.9) + 0.05;
    S.rainbow = U.damp(S.rainbow, S.weather === 'sunshower' && S.night < 0.3 ? 1 : 0, 0.25, dt);
    if (!V3.TEST) { S.nextWeather -= dt; if (S.nextWeather <= 0) { const bag = ['clear', 'clear', 'clear', 'breeze', 'breeze', 'breeze', 'rain', 'rain', 'sunshower', 'fog']; let k = U.pick(bag); if (k === S.weather) k = U.pick(bag); S.setWeather(k); } }
    const grey = S.rain * 0.55 + S.fog * 0.3;
    S.pal.top = U.mixHex(U.rampHex(TOP, t), S.night > 0.5 ? '#161a30' : '#77838f', grey);
    S.pal.mid = U.mixHex(U.rampHex(MID, t), S.night > 0.5 ? '#20243c' : '#a3adb3', grey);
    S.pal.bot = U.mixHex(U.rampHex(BOT, t), S.night > 0.5 ? '#2a2e46' : '#c6ced0', grey);
  };
  // ramp returning hex (so it can be mixed again)
  U.rampHex = (stops, t) => {
    let c = stops[stops.length - 1][1], a = c, k = 0;
    for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) { a = stops[i - 1][1]; c = stops[i][1]; k = (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0] || 1); break; }
    const m = U.mixA(a, c, k); return '#' + m.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  };
  U.mixHex = (a, b, t) => { const m = U.mixA(a, b, t); return '#' + m.map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''); };
  // sway of foliage at world x: -1..1
  S.sway = (x, k) => (Math.sin(S.time * (1.3 + S.wind) - x * 0.011 + (k || 0)) * 0.6 + (U.noise(S.time * 0.9 + x * 0.004) - 0.5)) * (0.25 + S.wind);

  const stars = []; { const r = U.mulberry(5); for (let i = 0; i < 150; i++) stars.push([r(), r() * 0.75, 0.6 + r() * 1.6, r() * TAU]); }
  const clouds = []; { const r = U.mulberry(9); for (let i = 0; i < 9; i++) clouds.push({ x: r() * 2600, y: 40 + r() * 230, s: 0.6 + r() * 1.1, v: 4 + r() * 8, k: i % 3 }); }
  const cloudSpr = (k) => P.sprite('cloud' + k, [-170, -70, 170, 60], (g) => {
    const r = U.mulberry(40 + k);
    for (let i = 0; i < 9; i++) { const x = -110 + r() * 220, y = -10 + r() * 30, rr = 34 + r() * 40; P.glow(g, x, y - rr * 0.2, rr * 1.25, '#ffffff', 0.85); }
    for (let i = 0; i < 6; i++) P.glow(g, -100 + r() * 200, 22 + r() * 14, 46, '#9fb4d8', 0.35);
  });

  S.drawSky = (g, cam, vw, vh) => {
    const p = S.pal;
    g.fillStyle = P.lin(g, 0, 0, 0, vh, [[0, p.top], [0.55, p.mid], [1, p.bot]]); g.fillRect(0, 0, vw, vh);
    // stars
    if (S.night > 0.05) {
      g.fillStyle = '#fff';
      for (const s of stars) { g.globalAlpha = S.night * (0.45 + 0.55 * Math.sin(S.time * 1.3 + s[3])) * (1 - S.rain * 0.8); g.beginPath(); g.arc(s[0] * vw, s[1] * vh, s[2], 0, TAU); g.fill(); }
      g.globalAlpha = 1;
    }
    // sun and moon ride one big arc
    const ang = (S.t - 0.25) * TAU, cx = vw / 2, cy = vh * 0.86, rx = vw * 0.46, ry = vh * 0.7;
    const sx = cx - Math.cos(ang) * rx, sy = cy - Math.sin(ang) * ry;
    S.sunX = sx; S.sunY = sy;
    if (sy < vh) {
      const warm = U.mixHex('#fff6d0', '#ffb070', S.gold);
      P.glow(g, sx, sy, 260, warm, 0.35 * (1 - S.rain * 0.7)); P.glow(g, sx, sy, 90, warm, 0.9 * (1 - S.rain * 0.6)); P.ell(g, sx, sy, 34, 34, '#fffbe8');
    }
    const mx = cx + Math.cos(ang) * rx, my = cy + Math.sin(ang) * ry;
    if (my < vh) {
      g.globalAlpha = Math.min(1, S.night + 0.25);
      P.glow(g, mx, my, 160, '#b8c8ff', 0.3); P.ell(g, mx, my, 30, 30, '#f4f1e0'); P.ell(g, mx - 9, my - 7, 7, 6, '#d9d6c6'); P.ell(g, mx + 10, my + 6, 5, 5, '#d9d6c6'); P.ell(g, mx + 2, my + 13, 3, 3, '#d9d6c6');
      g.globalAlpha = 1;
    }
    // Cloudtop, far above the forest (it is there in V2 too; here you can only see it)
    const ctx0 = vw * 0.62 - cam.x * 0.03, cty = vh * 0.2 - cam.y * 0.02;
    g.globalAlpha = 0.8 - S.night * 0.5; P.put(g, cloudtopSpr(), ctx0, cty, 0, 0.8, 0.8); g.globalAlpha = 1;
    // drifting clouds
    for (const c of clouds) {
      const x = ((c.x + S.time * c.v * (0.4 + S.wind) - cam.x * 0.06) % (vw + 500) + vw + 500) % (vw + 500) - 250;
      g.globalAlpha = (0.75 - S.night * 0.5) * (0.6 + S.rain * 0.4);
      P.put(g, cloudSpr(c.k), x, c.y - cam.y * 0.04, 0, c.s, c.s);
    }
    g.globalAlpha = 1;
    if (S.gold > 0.02) { g.globalAlpha = S.gold * 0.35; g.fillStyle = P.lin(g, 0, vh * 0.3, 0, vh, [[0, 'rgba(255,160,90,0)'], [1, 'rgba(255,150,90,1)']]); g.fillRect(0, 0, vw, vh); g.globalAlpha = 1; }
    if (S.rainbow > 0.02) {
      const cols = ['#ff6b6b', '#ffa94d', '#ffe066', '#8ce99a', '#74c0fc', '#b197fc'];
      g.lineWidth = 9;
      cols.forEach((c, i) => { g.strokeStyle = c; g.globalAlpha = S.rainbow * 0.33; g.beginPath(); g.arc(vw * 0.58 - cam.x * 0.02, vh * 0.92, vh * 0.62 - i * 9, Math.PI, TAU); g.stroke(); });
      g.globalAlpha = 1;
    }
  };
  const cloudtopSpr = () => P.sprite('cloudtop', [-260, -110, 260, 70], (g) => {
    const r = U.mulberry(3);
    for (let i = 0; i < 12; i++) P.glow(g, -190 + r() * 380, 34 + r() * 16, 44 + r() * 20, '#8fa6cc', 0.7);
    for (let i = 0; i < 16; i++) P.glow(g, -200 + r() * 400, 8 + r() * 24, 46 + r() * 26, '#ffffff', 1);
    // tiny pink town on top
    for (let i = 0; i < 6; i++) { const x = -78 + i * 28 + r() * 8, h = 10 + r() * 14; g.fillStyle = i % 2 ? '#f2b6c6' : '#f7d0b0'; g.fillRect(x, -10 - h, 11, h + 10); g.fillStyle = '#d98aa4'; g.beginPath(); g.moveTo(x - 2, -10 - h); g.lineTo(x + 5.5, -20 - h); g.lineTo(x + 13, -10 - h); g.fill(); }
    for (let i = 0; i < 12; i++) P.glow(g, -200 + r() * 400, 2 + r() * 14, 30, '#ffffff', 1);
  });

  // ---- far parallax: peaks, three ranges of hills with pom trees, mist between
  const LAYERS = [
    { f: 0.06, base: 0.60, amp: 150, sc: 900, col: '#7f9fc4', peaks: true },
    { f: 0.14, base: 0.66, amp: 90, sc: 520, col: '#5f9a8e', trees: 0.5 },
    { f: 0.26, base: 0.74, amp: 70, sc: 380, col: '#3f8468', trees: 0.8 },
    { f: 0.42, base: 0.82, amp: 60, sc: 300, col: '#2f6e50', trees: 1.15 },
  ];
  S.drawFar = (g, cam, vw, vh) => {
    const haze = S.pal.bot;
    LAYERS.forEach((L, li) => {
      const ox = cam.x * L.f, oy = -cam.y * L.f * 0.5;
      const dim = U.mixHex(L.col, '#141b3a', S.night * 0.75);
      const col = U.mix(dim, haze, 0.6 - li * 0.15 + S.fog * 0.2);
      const hy = (wx) => vh * L.base + oy - (U.fbm(wx / L.sc + li * 31) - 0.35) * L.amp * (L.peaks ? 2.2 : 1) - (L.peaks ? Math.max(0, (wx - 1200) / 12) * 0.6 : 0);
      g.fillStyle = col; g.beginPath(); g.moveTo(0, vh);
      for (let sx = 0; sx <= vw + 16; sx += 16) g.lineTo(sx, hy(sx + ox));
      g.lineTo(vw, vh); g.fill();
      if (L.peaks) { // snow on the Tall Peaks
        g.fillStyle = U.rgba('#ffffff', 0.5 - S.night * 0.3);
        for (let sx = 0; sx <= vw; sx += 16) { const y = hy(sx + ox); if (y < vh * 0.47) { g.beginPath(); g.ellipse(sx, y + 5, 14, 7, 0, 0, TAU); g.fill(); } }
      }
      if (L.trees) {
        const gap = 70 * L.trees, start = Math.floor(ox / gap) - 1;
        for (let i = start; i < start + vw / gap + 3; i++) {
          const wx = i * gap + U.hash(i * 3.1 + li) * gap * 0.8, sx = wx - ox, y = hy(wx) + 6;
          const h = (40 + U.hash(i * 7.7 + li * 5) * 50) * L.trees, r = h * 0.42;
          g.fillStyle = col; g.fillRect(sx - h * 0.05, y - h * 0.6, h * 0.1, h * 0.6);
          g.beginPath(); g.arc(sx, y - h * 0.75, r, 0, TAU); g.arc(sx - r * 0.7, y - h * 0.55, r * 0.7, 0, TAU); g.arc(sx + r * 0.7, y - h * 0.58, r * 0.66, 0, TAU); g.fill();
          g.fillStyle = U.rgba('#ffffff', 0.07 * (1 - S.night)); g.beginPath(); g.arc(sx - r * 0.25, y - h * 0.85, r * 0.62, 0, TAU); g.fill();
        }
      }
      // mist sitting in front of this range
      g.fillStyle = P.lin(g, 0, vh * (L.base - 0.05), 0, vh, [[0, U.rgba(haze, 0)], [1, U.rgba(haze, 0.22 + S.fog * 0.3)]]);
      g.fillRect(0, vh * (L.base - 0.05), vw, vh);
    });
  };

  // ---- darkness overlay with light holes. lights = [{x, y, r, a}] in world units.
  let lc = null, lg = null;
  S.drawLight = (g, cam, vw, vh, lights, toScreen) => {
    const dark = S.night * 0.74 + S.rain * 0.1;
    const cv = V3.world.caveAt(cam.x, cam.y + 80) > 0 || (cam.x > 500 && cam.x < 2400);
    if (dark < 0.02 && !cv) return;
    const q = 4, w = Math.ceil(vw / q), h = Math.ceil(vh / q);
    if (!lc || lc.width !== w || lc.height !== h) { lc = document.createElement('canvas'); lc.width = w; lc.height = h; lg = lc.getContext('2d'); }
    lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, w, h);
    lg.scale(1 / q, 1 / q);
    lg.fillStyle = U.rgba('#0a1136', dark); lg.fillRect(0, 0, vw, vh);
    if (cv) { // the cave under the shelf is dark even at noon
      const a = toScreen(900, 62), b = toScreen(1930, 520);
      const gr = lg.createLinearGradient(a[0], 0, b[0], 0); gr.addColorStop(0, 'rgba(8,10,30,0)'); gr.addColorStop(0.2, 'rgba(8,10,30,.84)'); gr.addColorStop(0.78, 'rgba(8,10,30,.84)'); gr.addColorStop(1, 'rgba(8,10,30,0)');
      lg.fillStyle = gr; lg.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
    }
    lg.globalCompositeOperation = 'destination-out';
    for (const L of lights) {
      const s = toScreen(L.x, L.y); if (s[0] < -L.r || s[0] > vw + L.r) continue;
      const gr = lg.createRadialGradient(s[0], s[1], 0, s[0], s[1], L.r);
      gr.addColorStop(0, 'rgba(0,0,0,' + (L.a || 0.9) + ')'); gr.addColorStop(0.5, 'rgba(0,0,0,' + (L.a || 0.9) * 0.5 + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      lg.fillStyle = gr; lg.beginPath(); lg.arc(s[0], s[1], L.r, 0, TAU); lg.fill();
    }
    g.imageSmoothingEnabled = true; g.drawImage(lc, 0, 0, vw, vh);
  };

  // ---- rain, fog, sun shafts; all in screen space
  const drops = []; { const r = U.mulberry(21); for (let i = 0; i < 260; i++) drops.push([r(), r(), 0.6 + r() * 0.8]); }
  const fogSpr = () => P.sprite('fog', [-400, -90, 400, 90], (g) => { const r = U.mulberry(8); for (let i = 0; i < 16; i++) P.glow(g, -300 + r() * 600, -20 + r() * 40, 70 + r() * 30, '#ffffff', 0.55); });
  S.drawShafts = (g, cam, vw, vh) => {
    const a = (1 - S.night) * (1 - S.rain) * (0.5 + S.gold * 0.8) * 0.11;
    if (a < 0.01) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    const lean = (S.sunX - vw / 2) / vw;
    for (let i = 0; i < 6; i++) {
      const x = ((i * 370 - cam.x * 0.5) % (vw + 400) + vw + 400) % (vw + 400) - 200, w = 50 + (i % 3) * 34;
      g.globalAlpha = a * (0.6 + 0.4 * Math.sin(S.time * 0.4 + i * 2));
      const gr = g.createLinearGradient(0, 0, 0, vh * 0.9); gr.addColorStop(0, 'rgba(255,240,190,1)'); gr.addColorStop(1, 'rgba(255,240,190,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(x + lean * 300, -10); g.lineTo(x + w + lean * 300, -10); g.lineTo(x + w * 2.2 - lean * 500, vh * 0.9); g.lineTo(x - w - lean * 500, vh * 0.9); g.fill();
    }
    g.restore();
  };
  S.drawWeather = (g, cam, vw, vh) => {
    if (S.fog > 0.03) {
      const f = fogSpr();
      for (let i = 0; i < 7; i++) {
        const x = ((i * 310 + S.time * (6 + i * 2) - cam.x * (0.7 + i * 0.07)) % (vw + 800) + vw + 800) % (vw + 800) - 400;
        P.put(g, f, x, vh * (0.5 + (i % 4) * 0.13), 0, 1.5, 1.2, S.fog * 0.34);
      }
    }
    if (S.rain > 0.03) {
      const n = Math.floor(drops.length * S.rain), lean = S.wind * 110;
      g.strokeStyle = 'rgba(214,232,255,.5)'; g.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const d = drops[i], sp = 900 * d[2];
        const y = ((d[1] * vh + S.time * sp) % (vh + 60)) - 30, x = (((d[0] * (vw + 300) + S.time * lean * 6 * d[2] - cam.x * 0.9 * d[2]) % (vw + 300)) + vw + 300) % (vw + 300) - 150;
        g.lineWidth = 1.1 * d[2]; g.beginPath(); g.moveTo(x, y); g.lineTo(x - lean * 0.12, y - 22 * d[2]); g.stroke();
      }
    }
  };
})();
