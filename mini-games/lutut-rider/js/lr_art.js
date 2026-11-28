// © 2026 Isaac Flake. All Rights Reserved.
/* ============================================================
   LÚTUT RIDER — js/lr_art.js
   Drawing a ride the 4 Brothers Worlds way: chunky pixel art.

   Everything is drawn one art pixel at a time into a small buffer
   (APM art pixels to the metre, the scale of the 4 Brothers Lútut
   sprite), then scaled up to the screen with no smoothing, so every
   pixel stays square and sharp. The world snaps to that pixel grid.

   The Lútut is the 4 Brothers Worlds sprite (img/fbw_lutut_*.png,
   copied from art/lutut/sprites/): side on, facing right, frames
   for flying (wings up, wings down), walking, resting, sucking and
   its tail moves. The Eikar, the prey, stones, trees, teeth, sky and
   land are pixel sprites drawn here in the same manner: a dark
   outline, two or three flat tones, a lighter top edge, speckled
   dirt, a thin bright grass line.
   ============================================================ */
(function () {
  'use strict';
  const LR = window.LR;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const A = LR.art = {};
  const APM = A.APM = 9.6;                // art pixels to the metre (a grown Lútut's sprite at 1:1)
  const OUT = '#1a1420';                  // the outline every sprite has

  /* ---------------- colour ---------------- */
  const hx = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const toHex = c => '#' + c.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const x = hx(a), y = hx(b); return toHex([0, 1, 2].map(i => x[i] + (y[i] - x[i]) * t)); };
  const shade = (h, k) => (k >= 0 ? mix(h, '#ffffff', k) : mix(h, '#000000', -k));
  A.mix = mix;
  const rnd = seed => LR.rng(seed);
  const can = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };

  /* a sprite from rows of letters, each letter a colour from the palette ('.' is clear) */
  function sprite(rows, pal) {
    const w = Math.max(...rows.map(r => r.length)), h = rows.length, [c, g] = can(w, h);
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const k = r[x]; if (k !== '.' && pal[k]) { g.fillStyle = pal[k]; g.fillRect(x, y, 1, 1); } } });
    return c;
  }
  const disc = (g, cx, cy, r, col) => { g.fillStyle = col; for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.6)); g.fillRect(cx - w, cy + dy, w * 2 + 1, 1); } };

  /* ================= the Lútut: the 4 Brothers Worlds frames ================= */
  const FRAMES = ['fly_up', 'fly_down', 'walk0', 'walk1', 'rest', 'suck', 'swipe', 'tail'];
  const SRC = {}, BASE = (document.currentScript && document.currentScript.src || '').replace(/js\/lr_art\.js.*$/, '');
  FRAMES.forEach(f => { const im = new Image(); im.src = BASE + 'img/fbw_lutut_' + f + '.png'; SRC[f] = im; });
  const ANCHOR = [42, 28];      // the body's middle, in the 62 x 47 frame
  /* where the rider sits in each frame: on the top of the back (measured from the sprites) */
  const SEATS = { fly_up: [35, 20], fly_down: [38, 22], walk0: [40, 19], walk1: [40, 19], rest: [40, 19], suck: [36, 21], swipe: [40, 17], tail: [38, 15] };
  const scaled = {};
  /* a frame at another size (a young one is smaller, an old one bigger), kept crisp: alpha cut back to on/off */
  function frameAt(name, scale) {
    const im = SRC[name];
    if (!im.complete || !im.naturalWidth) return null;
    if (Math.abs(scale - 1) < 0.02) return im;
    const key = name + ':' + scale.toFixed(2);
    if (scaled[key]) return scaled[key];
    const w = Math.round(im.naturalWidth * scale), h = Math.round(im.naturalHeight * scale), [c, g] = can(w, h);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h), p = d.data;
    for (let i = 3; i < p.length; i += 4) p[i] = p[i] > 110 ? 255 : 0;
    g.putImageData(d, 0, 0);
    return (scaled[key] = c);
  }

  /* ================= the Eikar, sat astride (facing right) ================= */
  const EPAL = { o: OUT, c: '#6a4826', C: '#8e6638', s: '#b07a40', d: '#8a5a2c', e: '#140c06', m: '#f0e0b0', r: '#c8503a', R: '#e8705a', T: '#3e6a5a', t: '#2e5044', L: '#3a3424' };
  const EIKAR = [
    ['....oooo....', '...oCCCCo...', '..oCcCcCco..', '..oooooooo..', '...ossssso..', '...ossmseo..', 'Rr.oddssso..', '.rRroodso...', '..rooTTToo..', '...oTTTTsso.', '...oTtTTo...', '...oLLLo....', '...oLLLo....', '....oLo.....', '....oo......'],
    ['....oooo....', '...oCCCCo...', '..oCcCcCco..', '..oooooooo..', 'r..ossssso..', 'Rr.ossmseo..', '.rRoddssso..', '..rroodso...', '...ooTTToo..', '...oTTTTsso.', '...oTtTTo...', '...oLLLo....', '...oLLLo....', '....oLo.....', '....oo......'],
  ].map(r => sprite(r, EPAL));
  const EIKAR_FALL = sprite(['...oooo...', '..osssseo.', '..ossmsso.', '..ooddsoo.', '.oTTTTTTo.', 'osoTTTToso', 'o.oTtTTo.o', '..oLLoLLo.', '..oLo.oLo.', '..oo...oo.'], EPAL);
  const CAP = sprite(['..oooo..', '.oCCCCo.', 'oCcCcCco', 'oooooooo'], EPAL);
  const EIKAR_ANCHOR = [5, 11];       // the hips: the legs hang down the Lútut's side

  /* ================= prey ================= */
  const PPAL = { o: OUT, B: '#8a7a62', b: '#6a5c48', l: '#a8987a', E: '#100c08', W: '#e8e0ee', w: '#b8aec8', y: '#f0d870', S: '#7a6e4a', s: '#5a5038', h: '#9a8e62', G: '#2e4434', g: '#4a6a4a', Y: '#e8e080' };
  const PREY = {
    hopper: [
      sprite(['......o.o.', '.....olol.', '..ooolBBo.', '.oBBBBBEBo', 'oBBBBBBBBo', 'oBbBBBBBo.', '.oobooob..', '..oo..oo..'], PPAL),
      sprite(['.......o.o', '......olol', '..oooolBBo', '.oBBBBBBEo', 'oBBBBBBBo.', 'obbBBBBo..', 'oo.oooo...', 'o.........'], PPAL),
    ],
    byrd: [
      sprite(['..o.......', '.owo......', '.owwo..y.y', '.owWWo.yy.', 'oWWWWWWWEo', '.ooWWWWoo.', '...oooo...'], PPAL),
      sprite(['..........', '.......y.y', '.ooo...yy.', 'oWWWWWWWEo', '.owwWWWoo.', '.oww.ooo..', '..oo......'], PPAL),
    ],
    shellback: [
      sprite(['.....oooooooo.....', '...oohShhShhSoo...', '..ohSSsSSsSSsShoo.', '.ohSSsSSsSSsSSSSoo', '.oSSsSSsSSsSSSSSsEo', 'oossssssssssssssso.', '.o.so.so...so.so..', '..oo..oo...oo..oo.'], PPAL),
      sprite(['.....oooooooo.....', '...oohShhShhSoo...', '..ohSSsSSsSSsShoo.', '.ohSSsSSsSSsSSSSoo', '.oSSsSSsSSsSSSSSsEo', 'oossssssssssssssso.', '..os.os...os.os...', '..oo..oo...oo..oo.'], PPAL),
    ],
    eel: [
      sprite(['..oo.....ooo..', '.oGGo...oGGGo.', 'oGggGoooGgggGo', 'o.oGGGGGGoooYo', '....ooooo...o.'], PPAL),
      sprite(['.........ooo..', 'ooo.....oGGGo.', 'oGGooooGGgggGo', '.oggGGGGGoooYo', '..ooooooo...o.'], PPAL),
    ],
  };
  const PREY_SIZE = { hopper: [5, 8], byrd: [5, 3], shellback: [9, 8], eel: [7, 2] };   // its anchor: feet (or middle) in the sprite

  /* teeth, by what they are worth */
  const TPAL = c => ({ o: OUT, t: c, T: shade(c, 0.4) });
  const TOOTH = {};
  for (const [v, c] of [[1, '#ece6d4'], [5, '#e8a860'], [25, '#ffd040'], [100, '#c090ff']]) TOOTH[v] = sprite(['.ooooo.', 'oTTttto', 'oTtttto', '.ottto.', '.ottto.', '..oto..', '...o...'], TPAL(c));

  /* ================= the camera ================= */
  A.makeView = () => ({ k: 18, cx: 0, cy: 0, shake: 0, W: 1, H: 1 });
  A.follow = function (view, run, W, H, dt, snap) {
    view.W = W; view.H = H;
    const gh = run.land.h(run.x), hag = Math.max(0, run.y - gh);
    const v = Math.hypot(run.vx, run.vy);
    const span = clamp(Math.max(18 + v * 0.42, hag * 1.4 + 14), 18, 110);
    const k = Math.min(Math.sqrt(W * H) * 0.92 / span, H / (hag * 1.3 + 12));
    const ahead = clamp(run.vx, -10, 40) * 0.45;
    const cx = run.x + ahead + W * 0.12 / k;
    const cy = lerp(run.y, gh, clamp(hag / (span * 0.9), 0, 0.5)) + span * 0.06;
    const s = snap ? 1 : 1 - Math.exp(-dt * 4);
    view.k = lerp(view.k, k, snap ? 1 : 1 - Math.exp(-dt * 1.6));
    view.cx = lerp(view.cx, cx, s); view.cy = lerp(view.cy, cy, s);
    view.shake = Math.max(0, view.shake - dt * 2.5);
  };

  /* ================= bits that fly ================= */
  A.fx = [];
  A.burst = function (kind, x, y, n, o) {
    o = o || {};
    for (let i = 0; i < n; i++) {
      const a = (o.dir != null ? o.dir : Math.PI / 2) + (Math.random() - 0.5) * (o.spread || 2.4), s = (o.speed || 6) * (0.4 + Math.random() * 0.8);
      A.fx.push({ kind, x, y, vx: Math.cos(a) * s + (o.vx || 0), vy: Math.sin(a) * s + (o.vy || 0), life: (o.life || 0.9) * (0.6 + Math.random() * 0.6), age: 0,
        size: (o.size || 0.25) * (0.6 + Math.random() * 0.8), col: o.col || '#ffffff', g: o.g != null ? o.g : 1 });
    }
  };
  A.popText = [];
  A.pop = (text, x, y, col) => A.popText.push({ text, x, y, col: col || '#fff2c0', age: 0 });
  function stepFx(dt, land) {
    for (const p of A.fx) {
      p.age += dt; p.vy -= 9.8 * p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.g && land && p.y < land.h(p.x)) { p.y = land.h(p.x); p.vy *= -0.3; p.vx *= 0.6; }
    }
    A.fx = A.fx.filter(p => p.age < p.life);
    for (const p of A.popText) { p.age += dt; p.y += dt * 2.2; }
    A.popText = A.popText.filter(p => p.age < 1.2);
  }

  /* ================= textures, made once per region ================= */
  const TEX = {};
  function textures(S) {
    if (TEX[S.id]) return TEX[S.id];
    const r = rnd(S.seed + 5);
    /* a 16 x 16 block of dirt: flat soil, lighter and darker grains, a few blue-grey stones */
    const [dirt, g] = can(16, 16);
    g.fillStyle = S.soil; g.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 26; i++) { g.fillStyle = r() < 0.5 ? shade(S.soil, 0.12) : shade(S.soil, -0.18); g.fillRect((r() * 16) | 0, (r() * 16) | 0, 1, 1); }
    for (let i = 0; i < 4; i++) { const x = (r() * 15) | 0, y = (r() * 15) | 0; g.fillStyle = '#7c7c8e'; g.fillRect(x, y, 2, 1); g.fillStyle = '#5c5c6e'; g.fillRect(x, y + 1, 2, 1); }
    return (TEX[S.id] = { dirt });
  }

  /* ================= one frame ================= */
  let buf = null, bg = null, bw = 0, bh = 0;
  A.frame = function (ctx, view, run, t, dt, anim, opts) {
    const S = run.stage, v = view, W = v.W, H = v.H;
    stepFx(dt, run.land);
    /* screen pixels per art pixel, in eighths, so the buffer is only remade when the zoom really changes */
    const s = Math.max(1, Math.round(v.k / APM * 8) / 8);
    const nw = Math.ceil(W / s) + 2, nh = Math.ceil(H / s) + 2;
    if (!buf || nw !== bw || nh !== bh) { [buf, bg] = can(nw, nh); bw = nw; bh = nh; }
    const g = bg;
    g.imageSmoothingEnabled = false;
    const sh = v.shake ? Math.round((Math.random() - 0.5) * v.shake * 5) : 0, sv = v.shake ? Math.round((Math.random() - 0.5) * v.shake * 5) : 0;
    const ox = (bw >> 1) + sh, oy = (bh >> 1) + sv;
    const BX = x => Math.round((x - v.cx) * APM) + ox, BY = y => oy - Math.round((y - v.cy) * APM);
    const x0 = v.cx - ox / APM - 2, x1 = v.cx + (bw - ox) / APM + 2;
    const segs = run.land.segsIn(x0 - 20, x1 + 20);

    sky(g, S, v, t);
    farHills(g, S, v, 0.12, S.far, 0.55, 46, S.seed + 101);
    farHills(g, S, v, 0.3, mix(S.mid, S.far, 0.4), 0.68, 34, S.seed + 202);
    farHills(g, S, v, 0.55, S.mid, 0.8, 24, S.seed + 303);
    thermals(g, run, segs, BX, BY, t);
    for (const sg of segs) for (const o of sg.trees) tree(g, S, o, BX, BY, t);
    ground(g, run, S, v, BX, BY, x0, x1, segs, t);
    roost(g, run.land, BX, BY);
    const labels = markers(g, run, BX, BY, x0, x1);
    for (const sg of segs) for (const o of sg.rocks) stone(g, o, BX, BY, S);
    const val = LR.toothValue(run.dist);
    for (const sg of segs) for (const tt of sg.teeth) if (!tt.got) { const im = TOOTH[val]; g.drawImage(im, BX(tt.x) - 3, BY(tt.y) - 3 + Math.round(Math.sin(t * 3 + tt.x) * 0.8)); }
    for (const sg of segs) for (const p of sg.prey) prey(g, p, BX, BY, t);

    /* the Lútut and its rider */
    const st = lututState(run, anim, dt);
    drawLutut(g, run, st, BX(run.x), BY(run.y), anim, t);
    if (run.rider) {
      const R = run.rider;
      g.save(); g.translate(BX(R.x), BY(R.y)); g.rotate(-Math.round(R.rot / (Math.PI / 4)) * (Math.PI / 4)); g.drawImage(EIKAR_FALL, -5, -9); g.restore();
      g.drawImage(CAP, BX(R.hat.x) - 4, BY(R.hat.y) - 3);
    }
    /* bits flying: plain square pixels */
    for (const p of A.fx) {
      const a = 1 - p.age / p.life, n = Math.max(1, Math.round(p.size * APM * (p.kind === 'dust' ? 1 + (1 - a) : 1)));
      g.globalAlpha = p.kind === 'dust' ? clamp(a, 0, 0.8) : 1; g.fillStyle = p.col;
      g.fillRect(BX(p.x) - (n >> 1), BY(p.y) - (n >> 1), n, n);
    }
    g.globalAlpha = 1;
    if (S.night) { g.fillStyle = 'rgba(14,10,30,' + S.night * 0.3 + ')'; g.fillRect(0, 0, bw, bh); }

    /* up to the screen, every pixel square */
    ctx.imageSmoothingEnabled = false;
    const sx = Math.round(W / 2 - (bw >> 1) * s), sy = Math.round(H / 2 - (bh >> 1) * s);
    ctx.drawImage(buf, 0, 0, bw, bh, sx, sy, bw * s, bh * s);

    /* words on top, in a blocky face */
    ctx.textAlign = 'center';
    ctx.font = '700 ' + Math.max(11, Math.round(s * 4.2)) + 'px "Courier New", monospace';
    for (const L of labels) { ctx.fillStyle = '#1a1420'; ctx.fillText(L.text, sx + L.x * s + 2, sy + L.y * s + 2); ctx.fillStyle = L.col; ctx.fillText(L.text, sx + L.x * s, sy + L.y * s); }
    ctx.font = '700 ' + Math.max(14, Math.round(s * 5)) + 'px "Courier New", monospace';
    for (const p of A.popText) {
      ctx.globalAlpha = clamp(1.4 - p.age, 0, 1);
      const px = sx + BX(p.x) * s, py = sy + BY(p.y) * s;
      ctx.fillStyle = '#1a1420'; ctx.fillText(p.text, px + 2, py + 2); ctx.fillStyle = p.col; ctx.fillText(p.text, px, py);
    }
    ctx.globalAlpha = 1;
    return st;
  };

  /* ---------------- sky ---------------- */
  function sky(g, S, v, t) {
    /* flat bands of colour, top to bottom */
    const N = 10;
    for (let i = 0; i < N; i++) { g.fillStyle = mix(S.sky[0], S.sky[1], i / (N - 1)); g.fillRect(0, Math.floor(bh * i / N * 0.85), bw, Math.ceil(bh / N) + 2); }
    g.fillStyle = S.sky[1]; g.fillRect(0, Math.floor(bh * 0.85), bw, bh);
    if (S.night) {
      for (let i = 0; i < 90; i++) {
        const x = Math.floor(((LR.hash(91, i) * 1.6 * bw - v.cx * 0.5) % bw + bw) % bw), y = Math.floor(LR.hash(93, i) * bh * 0.6);
        g.fillStyle = LR.hash(97, i) > 0.85 ? '#ffffff' : 'rgba(255,255,255,0.6)'; g.fillRect(x, y, 1, 1);
      }
    }
    /* the sun, or a pale moon with its dark side and craters */
    const mx = Math.floor(bw * 0.78), my = Math.floor(bh * 0.2), mr = Math.max(8, Math.round(bh * 0.07));
    if (S.night) {
      disc(g, mx, my, mr, '#c8c8dc'); disc(g, mx + Math.round(mr * 0.55), my - 1, mr, '#0e0c1e');
      g.fillStyle = '#9a9ab8'; for (const [a, b, r] of [[-0.4, -0.3, 2], [-0.1, 0.35, 3], [-0.55, 0.3, 1]]) disc(g, mx + Math.round(a * mr), my + Math.round(b * mr), r, '#9a9ab8');
    } else {
      disc(g, mx, my, mr + 3, mix(S.sky[1], '#fff6d8', 0.35)); disc(g, mx, my, mr, '#fff4d0'); disc(g, mx - 2, my - 2, Math.round(mr * 0.5), '#fffbe8');
    }
    /* blocky clouds drifting by */
    for (let i = 0; i < 7; i++) {
      const span = bw + 120, cx = Math.floor(((LR.hash(61, i) * span - v.cx * 0.8 - t * 3) % span + span) % span) - 60, cy = Math.floor(bh * (0.08 + LR.hash(63, i) * 0.3)), w = 18 + Math.floor(LR.hash(67, i) * 30);
      const top = S.night ? 'rgba(170,170,210,0.22)' : 'rgba(255,255,255,0.85)', low = S.night ? 'rgba(120,120,170,0.2)' : mix(S.sky[1], '#ffffff', 0.45);
      g.fillStyle = low; g.fillRect(cx, cy + 4, w, 4); g.fillRect(cx + 4, cy + 8, w - 10, 2);
      g.fillStyle = top; g.fillRect(cx + 3, cy, w - 8, 4); g.fillRect(cx + 8, cy - 3, Math.floor(w * 0.4), 3); g.fillRect(cx + 1, cy + 3, w - 2, 2);
    }
  }
  /* a far range: stepped columns, a lighter row along the top */
  function farHills(g, S, v, par, col, base, amp, seed) {
    const step = 2, top = shade(col, 0.1);
    for (let x = 0; x < bw; x += step) {
      const u = (x + v.cx * APM * par) / 90;
      const n = 0.62 * LR.noise(seed, u) + 0.28 * LR.noise(seed + 5, u * 2.7) + 0.1 * LR.noise(seed + 9, u * 8);
      const y = Math.floor(bh * base - (n * 0.5 + 0.5) * amp - (v.cy * APM * par * 0.15));
      g.fillStyle = col; g.fillRect(x, y, step, bh - y);
      g.fillStyle = top; g.fillRect(x, y, step, 1);
    }
  }
  function thermals(g, run, segs, BX, BY, t) {
    g.fillStyle = 'rgba(255,240,210,0.35)';
    for (const sg of segs) for (const th of sg.thermals) {
      const gy = run.land.h(th.x);
      for (let i = 0; i < 14; i++) { const ph = (t * 0.45 + LR.hash(th.x | 0, i)) % 1, x = th.x + (LR.hash(i, th.x | 0) - 0.5) * th.w * 1.4; g.fillRect(BX(x), BY(gy + ph * 45), 1, 2); }
    }
  }

  /* ---------------- the land ---------------- */
  function ground(g, run, S, v, BX, BY, x0, x1, segs, t) {
    const land = run.land, T = textures(S);
    const pat = g.createPattern(T.dirt, 'repeat');
    const ox = BX(0), oy = BY(0);
    if (pat.setTransform) pat.setTransform(new DOMMatrix([1, 0, 0, 1, ox, oy]));
    const grass = S.grass, dark = S.ground;
    for (let px = 0; px < bw; px++) {
      const wx = v.cx + (px - (bw >> 1)) / APM;
      const top = BY(land.h(wx));
      if (top >= bh) continue;
      g.fillStyle = pat; g.fillRect(px, top + 3, 1, bh - top - 3);
      /* darker the deeper it goes, in steps */
      for (let d = 0; d < 4; d++) { const y = top + 36 + d * 26; if (y >= bh) break; g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(px, y, 1, bh - y); }
      if (land.cutAt(wx)) continue;
      g.fillStyle = grass; g.fillRect(px, top, 1, 2);
      g.fillStyle = dark; g.fillRect(px, top + 2, 1, 1);
      /* a tuft, here and there, nodding in the wind */
      const col = Math.floor(wx * APM);
      const hh = LR.hash(S.seed, col);
      if (hh < 0.22) { g.fillStyle = hh < 0.07 ? shade(grass, 0.2) : grass; g.fillRect(px + (hh < 0.11 && Math.sin(t * 2 + col) > 0.6 ? 1 : 0), top - 1 - (hh < 0.08 ? 1 : 0), 1, 1 + (hh < 0.08 ? 1 : 0)); }
      else if (hh > 0.985) { g.fillStyle = ['#e8d050', '#e86a8a', '#f0f0f0'][col % 3]; g.fillRect(px, top - 2, 1, 1); g.fillStyle = dark; g.fillRect(px, top - 1, 1, 1); }
    }
    /* chasms fall away into the dark; pools are black water */
    for (const sg of segs) {
      const c = sg.cut; if (!c) continue;
      const a = BX(c.a - 2.5), b = BX(c.b + 2.5), top = BY(c.rim);
      if (c.kind === 'chasm') {
        for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(8,6,12,' + (0.18 + i * 0.14) + ')'; g.fillRect(a, top + 6 + i * 8, b - a, bh); }
      } else {
        g.fillStyle = '#16243a'; g.fillRect(a, top, b - a, BY(c.rim - c.depth) - top + 2);
        g.fillStyle = '#24405e'; g.fillRect(a, top, b - a, 2);
        g.fillStyle = '#6a90b8';
        for (let i = 0; i < 5; i++) { const w = 3 + (i % 3), x = a + Math.floor(((LR.hash(i, c.a | 0) * (b - a) + t * 6 * (i % 2 ? 1 : -1)) % (b - a) + (b - a)) % (b - a)); g.fillRect(x, top + 1 + (i % 2) * 3, w, 1); }
      }
    }
  }
  /* the roost: a hollow stump on the ledge, warm windows, a banner */
  function roost(g, land, BX, BY) {
    const x = BX(-9), y = BY(land.H0);
    if (x < -80 || x > bw + 80) return;
    const w = 44, h = 50;
    g.fillStyle = OUT; g.fillRect(x - w / 2 - 1, y - h - 1, w + 2, h + 1);
    g.fillStyle = '#6a4428'; g.fillRect(x - w / 2, y - h, w, h);
    g.fillStyle = '#5a3820'; for (let i = -w / 2 + 3; i < w / 2; i += 6) g.fillRect(x + i, y - h, 2, h);
    g.fillStyle = '#8a6038'; g.fillRect(x - w / 2, y - h, w, 3);
    g.fillStyle = '#c8a060'; g.fillRect(x - w / 2 + 2, y - h - 4, w - 4, 4); g.fillStyle = OUT; g.fillRect(x - w / 2 + 2, y - h - 5, w - 4, 1);
    g.fillStyle = OUT; g.fillRect(x - 6, y - 22, 12, 22); g.fillStyle = '#20140c'; g.fillRect(x - 5, y - 21, 10, 21);
    g.fillStyle = '#ffc060'; g.fillRect(x - 17, y - 34, 6, 6); g.fillRect(x + 11, y - 30, 6, 6);
    g.fillStyle = '#ffe2a0'; g.fillRect(x - 16, y - 33, 2, 2); g.fillRect(x + 12, y - 29, 2, 2);
    g.fillStyle = OUT; g.fillRect(x + 28, y - 40, 2, 40);
    g.fillStyle = '#c04830'; g.fillRect(x + 30, y - 40, 14, 4); g.fillRect(x + 30, y - 36, 10, 4); g.fillRect(x + 30, y - 32, 5, 2);
  }
  /* way stones every 250 m, and a flag at your best */
  function markers(g, run, BX, BY, x0, x1) {
    const out = [], land = run.land;
    for (let m = Math.ceil(x0 / 250) * 250; m < x1; m += 250) {
      if (m <= 0) continue;
      const x = BX(m), y = BY(land.h(m));
      g.fillStyle = OUT; g.fillRect(x - 4, y - 18, 9, 19);
      g.fillStyle = '#8a8478'; g.fillRect(x - 3, y - 17, 7, 18); g.fillStyle = '#a8a294'; g.fillRect(x - 3, y - 17, 1, 18); g.fillRect(x - 3, y - 17, 7, 1);
      g.fillStyle = '#5a564c'; g.fillRect(x - 1, y - 12, 3, 1); g.fillRect(x - 2, y - 11, 1, 1); g.fillRect(x + 2, y - 11, 1, 1);
      out.push({ text: m + 'm', x, y: y - 22, col: '#fff4d0' });
    }
    if (run.best > 30 && run.best > x0 && run.best < x1) {
      const x = BX(run.best), y = BY(land.h(run.best));
      g.fillStyle = OUT; g.fillRect(x - 1, y - 36, 3, 36); g.fillStyle = '#e8e0d0'; g.fillRect(x, y - 35, 1, 35);
      g.fillStyle = OUT; g.fillRect(x + 1, y - 36, 18, 12); g.fillStyle = '#f0c860'; g.fillRect(x + 2, y - 35, 16, 10); g.fillStyle = '#c89a30'; g.fillRect(x + 2, y - 27, 16, 2);
      out.push({ text: 'BEST', x: x + 10, y: y - 40, col: '#ffe27a' });
    }
    return out;
  }

  /* ---------------- stones and trees ---------------- */
  function stone(g, o, BX, BY, S) {
    const x = BX(o.x), y = BY(o.y), w = Math.max(5, Math.round(o.w * APM)), h = Math.max(6, Math.round(o.h * APM)), r = rnd(o.seed);
    if (o.broken) {
      for (let i = 0; i < 5; i++) { const rx = x - (w >> 1) + Math.floor(r() * w), rw = 2 + Math.floor(r() * 3); g.fillStyle = OUT; g.fillRect(rx - 1, y - 3, rw + 2, 3); g.fillStyle = '#7a7466'; g.fillRect(rx, y - 2, rw, 2); }
      return;
    }
    const lean = Math.round((LR.hash(o.seed, 9) - 0.5) * 3);
    for (let i = 0; i < h; i++) {
      const u = i / h, half = Math.round((w / 2) * (u > 0.82 ? 1 - (u - 0.82) * 3.2 : 1 - u * 0.18)), sx = x - half + Math.round(lean * u);
      g.fillStyle = OUT; g.fillRect(sx - 1, y - i - 1, half * 2 + 2, 1);
    }
    for (let i = 0; i < h - 1; i++) {
      const u = i / h, half = Math.round((w / 2) * (u > 0.82 ? 1 - (u - 0.82) * 3.2 : 1 - u * 0.18)) - 1, sx = x - half + Math.round(lean * u);
      if (half < 0) continue;
      g.fillStyle = '#8a8478'; g.fillRect(sx, y - i - 1, half * 2 + 1, 1);
      g.fillStyle = '#a8a294'; g.fillRect(sx, y - i - 1, 1, 1);
      g.fillStyle = '#6a6458'; g.fillRect(sx + half * 2, y - i - 1, 1, 1);
    }
    /* the old carved chevrons */
    g.fillStyle = '#5a564c';
    for (let c = 4; c < h - 4; c += 5) { const cx = x + Math.round(lean * c / h); g.fillRect(cx - 2, y - c, 1, 1); g.fillRect(cx - 1, y - c - 1, 1, 1); g.fillRect(cx, y - c - 2, 1, 1); g.fillRect(cx + 1, y - c - 1, 1, 1); g.fillRect(cx + 2, y - c, 1, 1); }
    g.fillStyle = S.grass; g.fillRect(x - (w >> 1) + 1, y - h + 1, Math.max(2, w >> 2), 1);
  }
  function tree(g, S, o, BX, BY, t) {
    const x = BX(o.x), y = BY(o.y), th = Math.round(o.h * APM), tw = Math.max(4, Math.round(o.w * APM));
    const marsh = S.id === 'marsh', bark = marsh ? '#3a2e24' : '#6a4a2c', barkD = marsh ? '#2a2018' : '#4e3620';
    if (o.broken) {
      g.fillStyle = OUT; g.fillRect(x - (tw >> 1) - 1, y - 9, tw + 2, 9);
      g.fillStyle = bark; g.fillRect(x - (tw >> 1), y - 8, tw, 8);
      g.fillStyle = '#c8a070'; g.fillRect(x - (tw >> 1), y - 9, tw, 1); g.fillRect(x - 1, y - 11, 2, 2);
      return;
    }
    const trunkH = Math.round(th * 0.7);
    g.fillStyle = OUT; g.fillRect(x - (tw >> 1) - 1, y - trunkH, tw + 2, trunkH);
    g.fillStyle = bark; g.fillRect(x - (tw >> 1), y - trunkH, tw, trunkH);
    g.fillStyle = barkD; for (let i = 3; i < trunkH; i += 5) g.fillRect(x - (tw >> 1) + ((i >> 2) % 2), y - i, 1, 2);
    g.fillStyle = shade(bark, 0.18); g.fillRect(x - (tw >> 1), y - trunkH, 1, trunkH);
    /* the canopy: round masses, outlined, a lighter top */
    const leaf = marsh ? '#2e4a34' : S.id === 'canyon' ? '#7a7a3a' : '#3e7a34', r0 = Math.max(6, Math.round(th * 0.2)), sway = Math.round(Math.sin(t * 0.8 + o.seed) * 0.8);
    const blobs = [[0, -trunkH - r0 * 0.4, r0], [-r0 * 0.8, -trunkH + r0 * 0.15, r0 * 0.75], [r0 * 0.85, -trunkH + r0 * 0.1, r0 * 0.72], [0, -trunkH - r0 * 1.1, r0 * 0.7]];
    for (const [bx, by, r] of blobs) disc(g, x + Math.round(bx) + sway, y + Math.round(by), Math.round(r) + 1, OUT);
    for (const [bx, by, r] of blobs) disc(g, x + Math.round(bx) + sway, y + Math.round(by), Math.round(r), leaf);
    for (const [bx, by, r] of blobs) disc(g, x + Math.round(bx - r * 0.25) + sway, y + Math.round(by - r * 0.3), Math.round(r * 0.5), shade(leaf, 0.14));
    if (marsh) { g.fillStyle = '#4a6a4a'; for (let i = 0; i < 6; i++) { const sx = x + Math.round((LR.hash(o.seed, i) - 0.5) * r0 * 2.4); g.fillRect(sx, y - trunkH + 2, 1, 6 + (i % 3) * 3); } }
  }

  /* ---------------- prey ---------------- */
  function prey(g, p, BX, BY, t) {
    if (p.eaten || (p.kind === 'eel' && !p.up)) return;
    const fr = PREY[p.kind], a = PREY_SIZE[p.kind];
    let f = 0;
    if (p.kind === 'hopper') f = p.gr ? 0 : 1;
    else if (p.kind === 'byrd') f = Math.sin(t * 14 + p.ph * 3) > 0 ? 0 : 1;
    else f = Math.floor(t * 4 + p.x) % 2;
    g.drawImage(fr[f], BX(p.x) - a[0], BY(p.y) - a[1]);
  }

  /* ---------------- the Lútut ---------------- */
  function lututState(run, anim, dt) {
    const v = Math.hypot(run.vx, run.vy);
    anim.t += dt;
    if (run.over === 'shattered' || run.over === 'sank' || run.over === 'fell' || run.over === 'hungry') return 'rest';
    if (run.suckT > 0) return 'suck';
    if (run.numb > 0.4) return 'swipe';
    if (run.grounded) { anim.walk = (anim.walk || 0) + v * dt; return v > 1 ? (Math.floor(anim.walk / 0.9) % 2 ? 'walk1' : 'walk0') : 'rest'; }
    if (run.tucking) return 'rest';
    if (run.beating) return Math.floor(anim.t * 6) % 2 ? 'fly_up' : 'fly_down';
    return 'fly_down';
  }
  A.lututState = lututState;
  function drawLutut(g, run, st, x, y, anim, t) {
    const sc = run.st.scale, im = frameAt(st, sc);
    const step = Math.PI / 24, ang = Math.round(run.ang / step) * step;    // turned in 7.5° steps, so the pixels don't swim
    g.save(); g.translate(x, y); g.rotate(-ang);
    if (run.over === 'shattered' || run.over === 'sank' || run.over === 'fell') g.globalAlpha = 0.85;
    if (im) g.drawImage(im, -Math.round(ANCHOR[0] * sc), -Math.round(ANCHOR[1] * sc));
    else { g.fillStyle = '#2b2535'; g.fillRect(-14, -8, 28, 16); }
    g.globalAlpha = 1;
    /* cracks along the tail: pale pixel zigzags */
    g.fillStyle = '#f0e8ff';
    for (let c = 0; c < run.cracks; c++) { const cx = Math.round((-14 - c * 6) * sc); g.fillRect(cx, -1, 1, 1); g.fillRect(cx + 1, 0, 1, 1); g.fillRect(cx, 1, 1, 1); g.fillRect(cx + 1, 2, 1, 1); }
    /* the Byrd's sting: cold sparks on the wings */
    if (run.numb > 0) { g.fillStyle = '#c8e8ff'; for (let i = 0; i < 6; i++) { const a = t * 4 + i * 1.1; g.fillRect(Math.round(-6 + Math.cos(a) * 9 * sc), Math.round(-12 + Math.sin(a * 1.3) * 5 * sc), 1, 1); } }
    /* the rider, sat on its back */
    if (!run.rider) {
      const e = EIKAR[Math.floor(t * (3 + Math.hypot(run.vx, run.vy) * 0.3)) % 2];
      const lean = run.tucking ? 2 : run.grounded ? 0 : 1;
      const SEAT = SEATS[st] || SEATS.rest;
      g.drawImage(e, Math.round((SEAT[0] - ANCHOR[0]) * sc) - EIKAR_ANCHOR[0] + lean, Math.round((SEAT[1] - ANCHOR[1]) * sc) - EIKAR_ANCHOR[1]);
    }
    g.restore();
  }

  /* a still portrait of a Lútut and its rider, for the roost: three screen pixels to the art pixel */
  A.portrait = function (canvas, kind, t) {
    const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height, K = LR.KINDS[kind];
    ctx.clearRect(0, 0, W, H);
    const [c, g] = can(Math.ceil(W / 3), Math.ceil(H / 3));
    const im = frameAt('walk0', K.scale);
    const draw = () => {
      const im2 = frameAt('walk0', K.scale);
      if (!im2) return false;
      const cx = Math.round(c.width * 0.58), cy = Math.round(c.height * 0.6);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(cx - Math.round(26 * K.scale), cy + Math.round(11 * K.scale), Math.round(48 * K.scale), 2);
      g.drawImage(im2, cx - Math.round(ANCHOR[0] * K.scale), cy - Math.round(ANCHOR[1] * K.scale));
      g.drawImage(EIKAR[0], cx + Math.round((SEATS.walk0[0] - ANCHOR[0]) * K.scale) - EIKAR_ANCHOR[0], cy + Math.round((SEATS.walk0[1] - ANCHOR[1]) * K.scale) - EIKAR_ANCHOR[1]);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(c, 0, 0, c.width * 3, c.height * 3);
      return true;
    };
    if (!im || !draw()) SRC.walk0.addEventListener('load', () => draw(), { once: true });
  };
})();
