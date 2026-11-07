// 4 Brothers World V2 — part 25: weather, sunrises and sunsets, a kinder wind, rupees, and the Curlmanes again.
//  * Weather comes and goes: clear skies, drifting clouds, rain showers, thunderstorms with lightning, morning fog,
//    and snow up on the peaks. Everyone in a world sees the same weather.
//  * Sunrise and sunset paint the sky: warm glows round the sun, clouds lit gold and pink from below.
//  * The wind blows hard only high up. On the ground it hardly pushes you, but leaves, petals, seeds, sand and
//    snow blow along low over the ground.
//  * Trees stand on the ground (their roots reach into it), instead of hovering a hair above it.
//  * Broodwings are a little tougher.
//  * Money is rupees: green is 1, blue is 5, red is 20. Bigger monsters drop more.
//  * The Curlmanes of the Woolly Highlands are redrawn closer to McKay's drawings.
(function (RW) {
  'use strict';
  const A = RW.art, D = A.drawers, E = RW.ent, P = RW.player, U = RW.ui, R = RW.register, TS = RW.TILE, WD = RW.world;
  if (!A || !E || !P || !WD) return;
  const { px } = A; const mk = A.canvas;
  const H2 = RW.hash2, clamp = RW.clamp, mix = RW.mix;
  const surfaceSky = () => WD.def && (WD.def.sky === 'normal' || WD.def.sky == null) && WD.def.fixedDay == null;
  // ======================= 1. WEATHER =======================
  // The weather changes every two and a half minutes, picked from the clock so every player in a world shares it,
  // and fades from one kind to the next.
  const SLOT = 150;
  const KINDS = ['clear', 'clear', 'clear', 'clouds', 'clouds', 'rain', 'rain', 'storm', 'fog', 'clear', 'clouds', 'clear'];
  const LOOK = { clear: { cover: 0.15, rain: 0, dark: 0, fog: 0 }, clouds: { cover: 0.55, rain: 0, dark: 0.05, fog: 0 }, rain: { cover: 0.85, rain: 0.6, dark: 0.18, fog: 0.08 }, storm: { cover: 1, rain: 1, dark: 0.32, fog: 0.05, bolts: 1 }, fog: { cover: 0.4, rain: 0, dark: 0.06, fog: 0.6 } };
  const kindAt = (slot) => KINDS[Math.floor(H2(slot, 7, 2501) * KINDS.length)];
  const W8 = { cover: 0, rain: 0, dark: 0, fog: 0, bolts: 0, kind: 'clear' };
  RW.v2weather = W8;
  function weatherNow() {
    const s = Date.now() / 1000 / SLOT, slot = Math.floor(s), f = clamp((s - slot) * SLOT / 25, 0, 1);   // 25 s to change over
    const a = LOOK[kindAt(slot - 1)], b = LOOK[kindAt(slot)];
    ['cover', 'rain', 'dark', 'fog'].forEach((k) => { W8[k] = a[k] + (b[k] - a[k]) * f; });
    W8.bolts = (b.bolts || 0) * f; W8.kind = kindAt(slot);
    return W8;
  }
  RW.v2setWeather = (k) => { KINDS.fill(k); };   // for testing

  // ======================= 2. SUNRISE, SUNSET =======================
  // the game object is made after the modules load, so the sky is hooked on the first frame
  let skyHooked = false;
  function hookSky() {
    const G = RW.game; if (skyHooked || !G || !G.sky) return; skyHooked = true;
    const baseSky = G.sky;
    G.sky = function () { return warmSky(baseSky.apply(this, arguments)); };
  }
  function warmSky(sk) {
    if (!surfaceSky() || sk.ghost) return sk;
    const w = weatherNow();
    // how much of a sunrise or sunset there is: strongest with the sun right on the horizon
    const glow = Math.exp(-(((sk.sun - 0.04) / 0.2) ** 2)), morning = sk.t < 0.5;
    sk.glow = glow; sk.morning = morning;
    const warmTop = morning ? '#46508e' : '#3a2a68', warmBot = morning ? '#ffb48a' : '#ff8448', warmMid = morning ? '#f49ab0' : '#e0607a';
    sk.mid = mix(sk.bottom, warmMid, glow * 0.9);
    sk.top = mix(sk.top, warmTop, glow * 0.75); sk.bottom = mix(sk.bottom, warmBot, glow * 0.9);
    // clouds and rain grey the sky and dim the day
    const grey = w.cover * 0.55 + w.dark;
    sk.top = mix(sk.top, sk.night ? '#0c0e18' : '#5a6270', clamp(grey * 0.7, 0, 0.8)); sk.bottom = mix(sk.bottom, sk.night ? '#14182a' : '#8a929e', clamp(grey * 0.6, 0, 0.75));
    sk.light = Math.max(0.14, sk.light * (1 - w.dark));
    return sk;
  }
  // the sun's place on screen (as the base game draws it)
  const sunAt = (sk, vw, seaY) => [vw * (0.15 + sk.t * 1.4 % 1 * 0.7), seaY - 30 - sk.sun * 70];
  // clouds: soft puffy banks that drift with the wind, coloured by the time of day
  const clouds = [];
  for (let i = 0; i < 14; i++) clouds.push({ x: H2(i, 1, 2511) * 2400, y: 0.08 + H2(i, 2, 2512) * 0.5, s: 0.6 + H2(i, 3, 2513) * 0.9, k: H2(i, 4, 2514), par: 0.05 + H2(i, 5, 2515) * 0.12 });
  const cloudCache = new Map();
  function cloudImg(i, s) {
    const key = i + ',' + Math.round(s * 10); let c = cloudCache.get(key); if (c) return c;
    const Wc = Math.round(150 * s), Hc = Math.round(52 * s); c = mk(Wc, Hc); const g = c.ctx;
    const puffs = []; for (let k = 0; k < 9; k++) { const u = k / 8; puffs.push([Wc * (0.12 + u * 0.76), Hc * (0.62 - Math.sin(u * Math.PI) * 0.28) + (H2(i, k, 2516) - 0.5) * 6 * s, (11 + Math.sin(u * Math.PI) * 13 + H2(k, i, 2517) * 6) * s]); }
    // shade: 0 underside .. 2 sunlit top
    const img = g.createImageData(Wc, Hc), d = img.data;
    for (let y = 0; y < Hc; y++) for (let x = 0; x < Wc; x++) {
      let best = -1, rel = 0; for (const [cx, cy, r] of puffs) { const q = 1 - Math.hypot(x - cx, (y - cy) * 1.25) / r; if (q > best) { best = q; rel = (y - cy) / r; } }
      if (best <= 0 || y > Hc * 0.82) continue;
      // each puff is lit on top and shaded underneath; the whole bank darkens towards its flat bottom
      const lv = rel < -0.3 && y < Hc * 0.6 ? 2 : rel < 0.25 && y < Hc * 0.7 ? 1 : 0; const o = (y * Wc + x) * 4; d[o] = lv; d[o + 3] = best < 0.08 ? 150 : 255;
    }
    g.putImageData(img, 0, 0); c.lv = img; cloudCache.set(key, c); return c;
  }
  const tinted = new Map();
  function cloudTint(i, s, cols) {   // the cloud in three colours (underside, middle, top)
    const key = i + ',' + Math.round(s * 10) + ',' + cols.join(); let c = tinted.get(key); if (c) return c;
    if (tinted.size > 400) tinted.clear();
    const src = cloudImg(i, s), Wc = src.width, Hc = src.height; c = mk(Wc, Hc); const img = c.ctx.createImageData(Wc, Hc), d = img.data, s0 = src.lv.data;
    const rgb = cols.map((h) => RW.hexToRgb(h));
    for (let k = 0; k < d.length; k += 4) { if (!s0[k + 3]) continue; const q = rgb[s0[k]]; d[k] = q[0]; d[k + 1] = q[1]; d[k + 2] = q[2]; d[k + 3] = s0[k + 3]; }
    c.ctx.putImageData(img, 0, 0); tinted.set(key, c); return c;
  }
  const q = (h) => { const [r, g, b] = RW.hexToRgb(h); return '#' + [r, g, b].map((v) => Math.round(v / 24) * 24).map((v) => Math.min(255, v).toString(16).padStart(2, '0')).join(''); };   // fewer distinct tints, so they cache
  function drawSkyExtras(g, cam, vw, vh, sk) {
    const seaY = Math.min(vh, WD.def.sea * TS - cam.y); if (seaY < -20) return;
    const w = W8, glow = sk.glow || 0, day = clamp((sk.sun + 0.2) * 1.6, 0, 1);
    // a warm band along the horizon, and a big glow round the low sun
    if (glow > 0.03) {
      const gr = g.createLinearGradient(0, seaY - 220, 0, seaY + 10);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.55, sk.morning ? `rgba(255,150,170,${0.28 * glow})` : `rgba(240,90,110,${0.3 * glow})`); gr.addColorStop(1, sk.morning ? `rgba(255,214,150,${0.55 * glow})` : `rgba(255,150,60,${0.6 * glow})`);
      g.fillStyle = gr; g.fillRect(0, seaY - 220, vw, 240);
      const [sx, sy] = sunAt(sk, vw, seaY), rg = g.createRadialGradient(sx, sy, 6, sx, sy, 190);
      rg.addColorStop(0, `rgba(255,236,190,${0.75 * glow * (1 - w.cover * 0.6)})`); rg.addColorStop(0.25, `rgba(255,170,90,${0.45 * glow})`); rg.addColorStop(1, 'rgba(255,120,80,0)');
      g.fillStyle = rg; g.fillRect(sx - 200, sy - 200, 400, 400);
      // the sun itself, big and red-gold near the horizon
      if (sk.sun > -0.12) { const r = 14 + glow * 6; g.fillStyle = sk.morning ? '#ffe2a8' : '#ffb070'; g.beginPath(); g.arc(sx, sy, r, 0, 6.29); g.fill(); g.fillStyle = 'rgba(255,255,230,0.6)'; g.beginPath(); g.arc(sx - r * 0.2, sy - r * 0.2, r * 0.55, 0, 6.29); g.fill(); }
    }
    // clouds
    const wind = RW.v2wind ? RW.v2wind.now() : 0.4, t = Date.now() / 1000, n = Math.round(3 + w.cover * 11);
    let under, midc, top;
    if (sk.night) { under = '#1e2234'; midc = '#2a3046'; top = '#3a4260'; }
    else { under = mix('#c8d0dc', sk.morning ? '#f08a8a' : '#e0604a', glow); midc = mix('#e4eaf2', sk.morning ? '#ffb89a' : '#ff9858', glow); top = mix('#ffffff', '#fff0c8', glow * 0.8); }
    const storm = clamp(w.dark * 2.2, 0, 1); under = mix(under, sk.night ? '#14161e' : '#5a606c', storm); midc = mix(midc, sk.night ? '#1c2030' : '#7a808c', storm); top = mix(top, sk.night ? '#262a3c' : '#9aa0aa', storm * 0.8);
    if (!sk.night && day < 0.4 && glow < 0.3) { under = mix(under, '#3a3c58', 0.5); midc = mix(midc, '#5a5a7a', 0.4); }
    const cols = [q(under), q(midc), q(top)];
    for (let i = 0; i < n; i++) {
      const c = clouds[i], img = cloudTint(i, c.s * (0.8 + w.cover * 0.5), cols);
      const span = vw + 600, x = ((c.x + t * 6 * (0.4 + Math.abs(wind)) * Math.sign(wind || 1) - cam.x * c.par) % span + span) % span - 300;
      const y = Math.round(seaY * c.y - 40 - cam.y * c.par * 0.2);
      g.globalAlpha = 0.55 + w.cover * 0.4; g.drawImage(img, Math.round(x), y); g.globalAlpha = 1;
    }
  }
  const bHills = WD.drawHills;
  WD.drawHills = function (g, cam, vw, vh, sky) {
    hookSky();
    try { if (surfaceSky() && !WD.backdropUnder && sky && !sky.ghost) drawSkyExtras(g, cam, vw, vh, sky); } catch (e) { /* never stop the frame */ }
    return bHills.apply(this, arguments);
  };

  // ======================= 3. RAIN, SNOW, FOG, LIGHTNING =======================
  const drops = []; let boltT = 4, bolt = null, sky0 = null;
  const groundY = (x) => { const tx = Math.floor(x / TS); return WD.skyTop && tx >= 0 && tx < WD.W ? WD.skyTop[tx] * TS : 1e9; };
  const snowyAt = (x, y) => { const z = WD.zoneAt ? WD.zoneAt(Math.floor(x / TS), Math.floor(y / TS)) : ''; return (z === 'mountains' && y / TS < 80) || (WD.def.id !== 'fuzzy' && false); };
  const bW = WD.drawWater;
  WD.drawWater = function (g, cam, vw, vh, time) {
    const r = bW.apply(this, arguments);
    try {
      if (!surfaceSky() || WD.backdropUnder) { drops.length = 0; return r; }
      const w = W8, wind = RW.v2wind ? RW.v2wind.now() : 0.3, dt = 1 / 60;
      // fog: a soft white haze lying on the ground (always a little at dawn)
      const sk = (RW.game && RW.game.skyNow) || {}, dawnFog = sk.t > 0.2 && sk.t < 0.32 ? Math.sin((sk.t - 0.2) / 0.12 * Math.PI) * 0.35 : 0, fog = Math.max(w.fog, dawnFog);
      if (fog > 0.02) {
        for (let x = 0; x < vw; x += 8) { const gy = groundY(cam.x + x) - cam.y; if (gy > vh + 60 || gy < -60) continue; const h = 50 + Math.sin((cam.x + x) / 90 + time * 0.2) * 14;
          const gr = g.createLinearGradient(0, gy - h, 0, gy + 4); gr.addColorStop(0, 'rgba(230,236,240,0)'); gr.addColorStop(1, `rgba(230,236,240,${0.55 * fog})`); g.fillStyle = gr; g.fillRect(x, gy - h, 8, h + 4); }
      }
      // rain (or snow up high)
      const want = Math.round(w.rain * 240);
      while (drops.length < want) drops.push({ x: cam.x + Math.random() * (vw + 200) - 100 - wind * 120, y: cam.y - Math.random() * vh, v: 380 + Math.random() * 160, snow: false });
      if (drops.length > want) drops.length = want;
      g.lineWidth = 1;
      drops.forEach((d) => {
        d.snow = snowyAt(d.x, cam.y + vh / 2);
        if (d.snow) { d.y += 60 * dt; d.x += (wind * 40 + Math.sin(time * 2 + d.v) * 20) * dt; } else { d.y += d.v * dt; d.x += wind * 110 * dt; }
        const gy = groundY(d.x);
        if (d.y > gy || d.y > cam.y + vh + 20 || d.x < cam.x - 140 || d.x > cam.x + vw + 140) {
          if (d.y > gy && gy < cam.y + vh && !d.snow && Math.random() < 0.5) RW.fx.spawn({ x: d.x, y: gy - 1, vx: RW.rand(-25, 25), vy: -RW.rand(20, 50), life: 0.25, color: '#cfe4f4', size: 1, grav: 400 });
          d.x = cam.x + Math.random() * (vw + 200) - 100 - wind * 120; d.y = cam.y - 10 - Math.random() * 60; return;
        }
        const x = Math.round(d.x - cam.x), y = Math.round(d.y - cam.y);
        if (d.snow) { g.fillStyle = '#ffffff'; g.fillRect(x, y, 2, 2); }
        else { g.strokeStyle = 'rgba(190,214,236,0.55)'; g.beginPath(); g.moveTo(x + 0.5, y); g.lineTo(x + 0.5 - wind * 3, y - 7); g.stroke(); }
      });
      // thunderstorms: lightning across the sky now and then
      if (w.bolts > 0.5 && (boltT -= dt) <= 0) {
        boltT = 5 + Math.random() * 9; const bx = Math.random() * vw, pts = [[bx, -10]]; let x = bx, y = -10; const gy = Math.min(vh, groundY(cam.x + bx) - cam.y);
        while (y < gy) { y += 10 + Math.random() * 16; x += RW.rand(-14, 14); pts.push([x, Math.min(y, gy)]); }
        bolt = { pts, t: 0.35 }; RW.fx.flash('#e8f0ff', 0.35); setTimeout(() => RW.audio.sfx('slam'), 400 + Math.random() * 900);
      }
    } catch (e) { /* never stop the frame */ }
    return r;
  };
  const bOver = RW.fx.drawOver;
  RW.fx.drawOver = function (g, cam, time) {
    const r = bOver.apply(this, arguments);
    if (bolt && bolt.t > 0) { bolt.t -= 1 / 60; g.save(); g.globalAlpha = clamp(bolt.t / 0.2, 0, 1);
      [[3, 'rgba(160,190,255,0.5)'], [1, '#ffffff']].forEach(([lw, c]) => { g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); bolt.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); });
      g.restore(); }
    return r;
  };
  // ======================= 4. A KINDER WIND =======================
  // v2s17's wind shoves the fuzzy around. Now it only blows hard high up: on the ground and in an ordinary jump it
  // barely touches him, and it builds the higher he is above the ground below.
  {
    const v17push = () => {
      if (!RW.v2wind || P.species !== 'fuzzy' || P.dead || P.water || P.climbing || (P.vine && P.vine.state === 'on') || (P.cloud && P.cloud.on) || !RW.v2wind.outdoors()) return 0;
      const t = RW.v2runes ? RW.v2runes.tier() : 0, hold = 1 - Math.min(0.5, t * 0.07), puffed = P.puff ? P.puff.size : 0;
      return RW.v2wind.now() * (P.ground ? 15 : 50 + 40 * puffed) * hold;
    };
    const heightAbove = () => { const tx = Math.floor((P.x + P.w / 2) / TS); let ty = Math.floor((P.y + P.h) / TS), n = 0; while (n < 30 && !RW.TILES[WD.get(tx, ty)].solid && WD.get(tx, ty) !== RW.T.water) { ty++; n++; } return n; };
    const bMove = E.move;
    E.move = function (o, dt) {
      if (o !== P) return bMove.apply(this, arguments);
      const wv = v17push(); if (!wv) return bMove.apply(this, arguments);
      const k = P.ground ? 0 : Math.pow(clamp((heightAbove() - 4) / 12, 0, 1), 1.4), corr = wv * (1 - k);
      o.vx -= corr; const res = bMove.apply(this, arguments); o.vx += corr; return res;
    };
  }
  // ======================= 5. THINGS BLOWING ALONG THE GROUND =======================
  // leaves in the forest, petals in the village and jungle, seeds and wool tufts in the highlands, sand in the desert,
  // snow on the peaks: a few at a time, low over the ground, going with the wind
  const MOTE = {
    forest: ['leaf', 'leaf', 'seed'], village: ['petal', 'leaf', 'seed'], jungle: ['petal', 'leaf', 'leaf'], deepjungle: ['leaf', 'petal'], jvillage: ['petal', 'leaf'],
    desert: ['sand', 'sand', 'sand'], mountains: ['snow', 'seed'], highlands: ['seed', 'wool', 'seed'], ocean: ['sand'],
  };
  const LEAFC = ['#4f9e3a', '#7cc452', '#c8a040', '#d0702a', '#a8c84a'], PETAL = ['#ff9ac0', '#ffd0e0', '#f8f0a0', '#e8a0ff'];
  const motes = [];
  const bW2 = WD.drawWater;
  WD.drawWater = function (g, cam, vw, vh, time) {
    const r = bW2.apply(this, arguments);
    try {
      if (!surfaceSky() || WD.backdropUnder) { motes.length = 0; return r; }
      const wind = RW.v2wind ? RW.v2wind.now() : 0.4, dt = 1 / 60, want = Math.round(14 + Math.abs(wind) * 26 - W8.rain * 10);
      if (motes.length < want && Math.random() < 0.5) {
        const wx = cam.x + (wind > 0 ? -20 + Math.random() * vw * 0.6 : vw * 0.4 + Math.random() * vw * 0.6), gy = WD.skyTop ? WD.skyTop[clamp(Math.floor(wx / TS), 0, WD.W - 1)] * TS : 0;
        if (gy > cam.y && gy < cam.y + vh + 40) {
          const z = WD.zoneAt(Math.floor(wx / TS), Math.floor(gy / TS) - 1), kinds = MOTE[z] || ['leaf', 'seed'], k = kinds[Math.floor(Math.random() * kinds.length)];
          motes.push({ x: wx, y: gy - 3 - Math.random() * 30, k, life: 4 + Math.random() * 5, ph: Math.random() * 6, c: k === 'leaf' ? RW.pick(LEAFC) : k === 'petal' ? RW.pick(PETAL) : k === 'sand' ? RW.pick(['#e8d0a0', '#d8bc88', '#f4e4c0']) : '#ffffff', v: 0.6 + Math.random() * 0.8 });
        }
      }
      for (let i = motes.length - 1; i >= 0; i--) {
        const m = motes[i]; m.life -= dt; m.ph += dt * (m.k === 'leaf' || m.k === 'petal' ? 5 : 2);
        const sp = (m.k === 'sand' ? 90 : m.k === 'seed' || m.k === 'wool' ? 35 : 55) * (0.35 + Math.abs(wind)) * m.v * (Math.sign(wind) || 1);
        m.x += sp * dt; m.y += (Math.sin(m.ph) * (m.k === 'sand' ? 6 : 16) + (m.k === 'snow' ? 8 : m.k === 'seed' ? -2 : 4)) * dt;
        const gy = WD.skyTop ? WD.skyTop[clamp(Math.floor(m.x / TS), 0, WD.W - 1)] * TS : 1e9;
        if (m.y > gy - 2) m.y = gy - 2 - Math.random() * 3;
        if (m.life <= 0 || m.x < cam.x - 60 || m.x > cam.x + vw + 60) { motes.splice(i, 1); continue; }
        const x = Math.round(m.x - cam.x), y = Math.round(m.y - cam.y), a = Math.min(1, m.life, 1);
        g.globalAlpha = a; g.fillStyle = m.c;
        if (m.k === 'leaf') { const f = Math.sin(m.ph) > 0; g.fillRect(x, y, f ? 3 : 2, f ? 2 : 3); g.fillStyle = RW.shade(m.c, -0.25); g.fillRect(x + (f ? 2 : 1), y + 1, 1, 1); }
        else if (m.k === 'petal') { g.fillRect(x, y, Math.sin(m.ph) > 0 ? 2 : 1, 1); g.fillRect(x + 1, y + 1, 1, 1); }
        else if (m.k === 'seed') { g.fillRect(x, y, 1, 1); g.globalAlpha = a * 0.6; g.fillRect(x - 1, y - 1, 3, 1); g.fillRect(x, y - 2, 1, 1); }
        else if (m.k === 'wool') { g.fillStyle = '#f0e2c8'; g.fillRect(x, y, 2, 2); g.fillRect(x + 1, y - 1, 1, 1); }
        else if (m.k === 'snow') g.fillRect(x, y, 2, 2);
        else { g.globalAlpha = a * 0.7; g.fillRect(x, y, 4, 1); g.fillRect(x + 5, y + 1, 2, 1); }
      }
      g.globalAlpha = 1;
    } catch (e) { /* never stop the frame */ }
    return r;
  };
  // ======================= 6. TREES STAND ON THE GROUND =======================
  // The ground's top edge is uneven and outlined, which left a hairline gap under every trunk. After the blocks are
  // drawn, each trunk's roots are drawn reaching a few pixels down into the ground under it.
  {
    const ROOTD = ['#3e2a1a', '#4e3622', '#62452c', '#7a5836'], ROOTP = ['#8e8a7e', '#a6a296', '#bab6aa', '#cecabe'];
    const bTiles = WD.drawTiles;
    WD.drawTiles = function (g, cam, vw, vh, time) {
      const r = bTiles.apply(this, arguments);
      try {
        const TL = RW.TILES, tx0 = Math.floor(cam.x / TS), ty0 = Math.floor(cam.y / TS), tx1 = Math.ceil((cam.x + vw) / TS), ty1 = Math.ceil((cam.y + vh) / TS), ox = -Math.round(cam.x), oy = -Math.round(cam.y);
        for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
          const t = TL[WD.get(x, y)]; if (t.decor !== 'trunk' || !t.tree) continue;
          const b = TL[WD.get(x, y + 1)]; if (!b.solid || b.decor === 'trunk' || TL[WD.get(x - 1, y)].decor === 'trunk' || TL[WD.get(x + 1, y)].decor === 'trunk') continue;
          const C = t.pale ? ROOTP : ROOTD, sx = x * TS + ox, sy = (y + 1) * TS + oy;
          // a root foot 14 wide at the top, spreading roots that sink into the soil
          for (let i = 1; i < 15; i++) { const d = Math.abs(i - 7.5), depth = Math.max(1, Math.round(3.4 - d * 0.42 + (H2(x * 16 + i, y, 2601) > 0.7 ? 1 : 0))); for (let j = 0; j < depth; j++) px(g, sx + i, sy + j, C[clamp(3 - j - (d > 5 ? 1 : 0) - (i > 9 ? 1 : 0), 0, 3)]); }
          px(g, sx, sy + 1, C[0]); px(g, sx + 15, sy + 1, C[0]);
        }
      } catch (e) { /* never stop the frame */ }
      return r;
    };
  }

  // ======================= 7. BROODWINGS =======================
  { const s = RW.SPECIES.cbat_brood; if (s) { s.hp = 115; s.dmg = 16; s.speed = 95; } }

  // ======================= 8. RUPEES =======================
  // Money is still counted the same way under the hood ('coin'), so prices and saves don't change; it just drops,
  // shows and is called rupees. A green rupee is 1, blue is 5, red is 20.
  {
    const I = A.iconExtra;
    I.rupee = (g, a, b) => {
      const S = [[6, 1, 4], [5, 2, 6], [4, 3, 8], [4, 4, 8], [4, 5, 8], [4, 6, 8], [4, 7, 8], [4, 8, 8], [4, 9, 8], [4, 10, 8], [4, 11, 8], [5, 12, 6], [6, 13, 4]];
      S.forEach(([x0, y, w]) => { for (let i = 0; i < w; i++) { const x = x0 + i; px(g, x, y, i === 0 || i === w - 1 || y === 1 || y === 13 ? b : x < 7 ? a : RW.shade(a, -0.18)); } });
      for (let y = 4; y <= 10; y++) px(g, 7, y, RW.shade(a, 0.25)); px(g, 6, 4, '#ffffff'); px(g, 6, 5, '#ffffff'); px(g, 5, 4, RW.shade(a, 0.4));
    };
    const RUP = [['rupee_r', 'Red Rupee', 20, '#e8404a', '#7a1420'], ['rupee_b', 'Blue Rupee', 5, '#3a8ef0', '#163e86'], ['rupee_g', 'Green Rupee', 1, '#3ec85a', '#14602a']];
    R.items(RUP.map(([id, name, v, a, b]) => ({ id, name, kind: 'material', stack: 99999, icon: { s: 'rupee', a, b }, desc: 'Worth ' + v + (v === 1 ? ' rupee.' : ' rupees.') })));
    const VAL = { rupee_r: 20, rupee_b: 5, rupee_g: 1 };
    if (RW.ITEMS.coin) { Object.assign(RW.ITEMS.coin, { name: 'Rupees', icon: { s: 'rupee', a: '#3ec85a', b: '#14602a' }, desc: 'Money. Green rupees are worth 1, blue 5 and red 20. Monsters drop them (bigger monsters drop more), chests hold them, and Tumble the travelling trader takes them.' }); if (A.icons) delete A.icons.coin; }
    // picking one up adds its worth
    const bAdd = P.add;
    P.add = function (id, n) { if (VAL[id]) { bAdd.call(this, 'coin', (n || 1) * VAL[id]); return 0; } return bAdd.apply(this, arguments); };
    // when a monster dies, bigger ones are worth more
    let killing = null;
    const bKill = E.kill;
    E.kill = function (e) { killing = e; try { return bKill.apply(this, arguments); } finally { killing = null; } };
    const bDrop = E.dropItem;
    E.dropItem = function (id, n, x, y, o) {
      if (id !== 'coin' || !(n > 0)) return bDrop.apply(this, arguments);
      const e = killing, sp = e && RW.SPECIES[e.sp];
      if (sp && !sp.boss && !sp.elite && !e.isBoss && sp.role === 'enemy') { const hp = e.maxhp || sp.hp || 20, size = clamp(Math.sqrt((e.w || 16) * (e.h || 16)) / 24, 0.7, 4); n = Math.max(1, Math.round(hp / 12 * size * (0.8 + Math.random() * 0.4))); }
      // pay it out in rupees: reds, then blues, then greens
      let left = Math.round(n); const out = [];
      while (left >= 20 && out.length < 14) { out.push('rupee_r'); left -= 20; }
      while (left >= 5 && out.length < 18) { out.push('rupee_b'); left -= 5; }
      while (left >= 1 && out.length < 24) { out.push('rupee_g'); left -= 1; }
      if (left > 0) out.push(...Array(Math.floor(left / 20)).fill('rupee_r'));
      out.forEach((rid) => bDrop.call(this, rid, 1, x, y, o));
    };
    // everywhere the game says "coins", say "rupees"
    const swap = (s) => s.replace(/\bcoins\b/g, 'rupees').replace(/\bCoins\b/g, 'Rupees').replace(/\bcoin\b/g, 'rupee').replace(/\bCoin\b/g, 'Rupee').replace(/● (\d)/g, '◆ $1');
    const fixNode = (n) => { if (n.nodeType === 3) { if (/[Cc]oin|● \d/.test(n.nodeValue)) n.nodeValue = swap(n.nodeValue); } else if (n.nodeType === 1 && n.tagName !== 'SCRIPT' && n.tagName !== 'STYLE') n.childNodes.forEach(fixNode); };
    try {
      const mo = new MutationObserver((list) => list.forEach((m) => { if (m.type === 'characterData') fixNode(m.target); else m.addedNodes.forEach(fixNode); }));
      const start = () => { fixNode(document.body); mo.observe(document.body, { childList: true, subtree: true, characterData: true }); };
      if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
    } catch (e) { /* no observer: the words just stay */ }
    // the rupee counter is green-gem coloured
    const st = document.createElement('style'); st.textContent = '#v2coins{color:#7ff09a}'; document.head.appendChild(st);
  }
})(window.RW);
