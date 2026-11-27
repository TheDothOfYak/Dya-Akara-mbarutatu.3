// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 20: the Leviathan as a pixel-art serpent, in four stages.
//  * Built like the big Terraria worms: a head, a chain of separate armoured segments and a tail, each its own
//    pixel sprite (shaded flat, outlined, lit from the upper left), turned to follow the body. Big and chunky:
//    one sprite pixel is PX world units (5: about seven of a hero's pixels). Everything a shade darker.
//  * Stage 4 is not only recoloured: jagged spikes burst out of every plate, molten cores show through the cracks,
//    the head grows tusks, a crown of horns and a cluster of eyes, the tail becomes a bone blade, it swells a little
//    and sheds embers.
//  * Four stages, each with its own colours: 1 teal plates studded with gems, 2 dark abyssal black and violet,
//    3 pale bone over black with cold teal eyes, 4 molten rage: black plates cracked with fire.
//  * Sprites are painted once per stage and size and cached, so drawing is just turned pictures.
//  * The Heart Chamber is pitch black (only your own light shows it), set here so it wins over the cave light.
(function (RW) {
  'use strict';
  const VA = RW.v3art, WD = RW.world;
  if (!VA || !RW.v3lev) return;
  const K = 3, PX = 5, NSEG = RW.v3lev.NSEG;
  const segR = (i) => (34 - 24 * Math.pow(i / NSEG, 1.3)) * K; // world units, same as the fight uses
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); c.ctx = c.getContext('2d'); c.ctx.imageSmoothingEnabled = true; return c; };
  const sh = (c, k) => RW.shade(c, k);

  // ---------------- the four looks ----------------
  const GEMS = ['#e0525a', '#4fa8f0', '#5fd98a', '#a86ef0', '#f2c94c', '#7fe3ff'];
  const THEMES = {
    1: { name: 'teal', plate: ['#101c1c', '#18292a', '#22393a', '#2f4d4c', '#436663', '#5e8479'], belly: ['#6e6a58', '#958e72', '#bcb290'], seam: '#5ec8b8', gems: ['#e8c040'], eye: '#f2c94c', mouth: ['#1a0c0c', '#5a2018'], teeth: ['#b8b098', '#ece6d0'], crest: ['#6a3420', '#a85a30', '#d08a50'], fin: ['#3a140a', '#7a3418', '#b0602e'] },
    2: { name: 'abyssal', plate: ['#06050b', '#0e0a18', '#171226', '#221a36', '#30244c', '#433262'], belly: ['#251e32', '#352c46', '#4a3e5e'], seam: '#8a5ad8', gems: ['#6c4aa8', '#9a74e0', '#4a3270'], eye: '#b08aff', mouth: ['#120818', '#3a1a5a'], teeth: ['#8a8298', '#c8c0d4'], crest: ['#6c4aa8', '#9a74e0', '#4a3270'], fin: ['#171226', '#30244c', '#6c4aa8'] },
    3: { name: 'bone', plate: ['#4e4838', '#6e6852', '#948c70', '#b8ae90', '#d8d0b4', '#f0ead4'], belly: ['#0a0a10', '#14141c', '#20202a'], seam: '#3ae0d0', gems: ['#3ae0d0', '#a8fff4'], eye: '#4cf0e0', mouth: ['#04040a', '#141420'], teeth: ['#d8d0b4', '#f0ead4'], crest: ['#b8ae90', '#d8d0b4', '#948c70'], fin: ['#0c0c12', '#20202a', '#6e6852'], dark: ['#040406', '#0a0a10', '#14141c'] },
    4: { name: 'rage', plate: ['#080404', '#140a0a', '#221010', '#321616', '#461e1c', '#5e2a24'], belly: ['#3a1c18', '#56281e', '#7a3a24'], seam: '#ff5a3a', gems: ['#ff5a3a', '#ffb070', '#ffe0a0'], eye: '#ff3a2a', mouth: ['#2a0604', '#ff6a2a'], teeth: ['#d8c8b0', '#fff0d8'], crest: ['#ff5a3a', '#ffb070', '#c83a20'], fin: ['#221010', '#461e1c', '#ff6a3a'], crack: ['#c83a20', '#ff6a3a', '#ffc070'] },
  };
  Object.keys(THEMES).forEach((k) => { const T = THEMES[k]; ['plate', 'belly', 'fin', 'teeth'].forEach((key) => { if (k === '1' && key === 'fin') return; /* the rust fins stay as they are */ T[key] = T[key].map((c) => sh(c, -0.28)); }); if (k !== '1') T.crest = T.crest.map((c) => sh(c, -0.2)); });
  Object.keys(THEMES).forEach((k) => { const T = THEMES[k]; T.gum = sh(T.mouth[1], 0.2); T.tongue = sh(T.mouth[1], 0.5); T.ridge = sh(T.mouth[0], 0.6); T.spit = sh(T.teeth[1], -0.1); });
  const palOf = (T) => ['#020204', '#ffffff', T.gum, T.tongue, T.ridge, T.spit].concat(T.plate, T.belly, T.gems, T.crest, T.fin, T.mouth, T.teeth, [T.seam, T.eye, sh(T.eye, 0.5)], T.dark || [], T.crack || []);

  // ---------------- painters (pixel units, facing right) ----------------
  function ellipse(g, x, y, rx, ry, col) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, 6.283); g.fill(); }
  function poly(g, pts, col) { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); }
  // one armoured segment; R is its radius in sprite pixels; v picks the extras on its back
  // a webbed fan: spines from a root, the skin between them, ragged at the ends. ang0..ang1 measured from the root
  function fan(g, x, y, ang0, ang1, n, L0, L1, T, rag) {
    const tips = []; for (let k = 0; k < n; k++) { const t = n > 1 ? k / (n - 1) : 0, an = ang0 + (ang1 - ang0) * t, L = L0 + (L1 - L0) * t * (1 - t) * 4 * (rag ? 0.85 + ((k * 37) % 10) / 33 : 1); tips.push([x + Math.cos(an) * L, y + Math.sin(an) * L]); }
    g.fillStyle = T.fin[1]; g.beginPath(); g.moveTo(x, y); tips.forEach(([tx, ty], k) => { if (k) { const p = tips[k - 1]; g.lineTo((p[0] + tx) / 2 + (x - (p[0] + tx) / 2) * 0.28, (p[1] + ty) / 2 + (y - (p[1] + ty) / 2) * 0.28); } g.lineTo(tx, ty); }); g.closePath(); g.fill(); // straight edges, a V notch between spines
    tips.forEach(([tx, ty], k) => { g.strokeStyle = k % 2 ? T.fin[2] : T.fin[0]; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(tx, ty); g.stroke(); });
  }
  // one length of the body: smooth and scaled, a pale belly, a tall webbed sail along the back
  function paintSeg(T, R, v, stage) {
    const low = stage === 4 ? 0.75 : 0.6, w = R * (stage === 4 ? 2.6 : 2.4) + 6, h = R * (3.8 + low) + 6, c = mk(w, h), g = c.ctx, cx = w / 2, cy = h - R * (1 + low) - 3;
    const P = T.plate, B = T.belly;
    if (stage === 4) { // jagged spikes bursting out of the top and bottom
      [[-0.55, -1, 1.0, -0.5], [0.05, -1, 1.35, -0.15], [0.55, -1, 0.9, 0.3], [-0.35, 1, 0.8, -0.4], [0.35, 1, 0.95, 0.35]].forEach(([u, side, len, lean]) => {
        const bx = cx + u * R, by = cy + side * R * 0.7, tx = bx + lean * R, ty = by + side * len * R;
        poly(g, [[bx - R * 0.16, by], [tx, ty], [bx + R * 0.16, by]], T.plate[0]); poly(g, [[bx - R * 0.05, by], [tx, ty], [bx + R * 0.16, by]], T.crack[0]);
      });
    }
    // the dorsal sail: spines leaning back toward the tail, ragged webbing, taller on some lengths
    const tall = v === 0 ? 2.5 : v === 1 ? 1.9 : 2.2;
    fan(g, cx + R * 0.35, cy - R * 0.55, -1.9, -2.75, 5, R * tall * 0.75, R * tall, T, true);
    // a ventral fin on some lengths
    if (v === 1) fan(g, cx + R * 0.2, cy + R * 0.6, 2.0, 2.7, 4, R * 0.7, R * 0.95, T, true);
    // body: angular armour, no round shapes. An eight-sided ring: a back plate, two flank plates, belly plates
    const oct = (k) => [[cx - R * 0.55 * k, cy - R * k], [cx + R * 0.55 * k, cy - R * k], [cx + R * k, cy - R * 0.45 * k], [cx + R * k, cy + R * 0.45 * k], [cx + R * 0.55 * k, cy + R * k], [cx - R * 0.55 * k, cy + R * k], [cx - R * k, cy + R * 0.45 * k], [cx - R * k, cy - R * 0.45 * k]];
    poly(g, oct(1), P[0]);
    poly(g, [[cx - R * 0.5, cy - R * 0.92], [cx + R * 0.5, cy - R * 0.92], [cx + R * 0.9, cy - R * 0.42], [cx - R * 0.9, cy - R * 0.42]], P[3]); // the back plate
    poly(g, [[cx - R * 0.4, cy - R * 0.92], [cx + R * 0.5, cy - R * 0.92], [cx + R * 0.6, cy - R * 0.8], [cx - R * 0.5, cy - R * 0.8]], P[4]); // its lit edge
    poly(g, [[cx - R * 0.92, cy - R * 0.36], [cx + R * 0.92, cy - R * 0.36], [cx + R * 0.92, cy + R * 0.36], [cx - R * 0.92, cy + R * 0.36]], P[2]); // the flank plate
    poly(g, [[cx - R * 0.92, cy - R * 0.36], [cx + R * 0.92, cy - R * 0.36], [cx + R * 0.92, cy - R * 0.24], [cx - R * 0.92, cy - R * 0.24]], P[3]);
    if (stage === 3) { poly(g, [[cx - R * 0.9, cy - R * 0.2], [cx + R * 0.9, cy - R * 0.2], [cx + R * 0.9, cy + R * 0.34], [cx - R * 0.9, cy + R * 0.34]], T.dark[1]); for (let k = 0; k < 3; k++) poly(g, [[cx - R * 0.6 + k * R * 0.45, cy - R * 0.3], [cx - R * 0.5 + k * R * 0.45, cy - R * 0.3], [cx - R * 0.4 + k * R * 0.45, cy + R * 0.3], [cx - R * 0.5 + k * R * 0.45, cy + R * 0.3]], T.plate[4]); }
    // belly plates, each its own block with a seam
    for (let k = 0; k < 3; k++) { const x0 = cx - R * 0.9 + k * R * 0.62; poly(g, [[x0, cy + R * 0.42], [x0 + R * 0.56, cy + R * 0.42], [x0 + R * 0.5 - (k === 2 ? R * 0.1 : 0), cy + R * 0.92], [x0 + R * 0.06 + (k === 0 ? R * 0.2 : 0), cy + R * 0.92]], B[1]); poly(g, [[x0, cy + R * 0.42], [x0 + R * 0.56, cy + R * 0.42], [x0 + R * 0.56, cy + R * 0.5], [x0, cy + R * 0.5]], B[2]); }
    // scale notches along the flank, angular
    for (let k = 0; k < 4; k++) { const x = cx - R * 0.7 + k * R * 0.45; poly(g, [[x, cy - R * 0.1], [x + R * 0.18, cy - R * 0.1], [x + R * 0.09, cy + R * 0.08]], P[1]); }
    // the plate seams (dark lines)
    g.fillStyle = P[0]; g.fillRect(cx - R * 0.95, cy - R * 0.42, R * 1.9, Math.max(1, R * 0.05)); g.fillRect(cx - R * 0.95, cy + R * 0.38, R * 1.9, Math.max(1, R * 0.05));
    if (stage === 2) for (let k = 0; k < 2; k++) { const gx = cx - R * 0.3 + k * R * 0.6, gy = cy - R * 0.62, sz = Math.max(1.2, R * 0.1); poly(g, [[gx, gy - sz], [gx + sz, gy], [gx, gy + sz], [gx - sz, gy]], T.gems[k % T.gems.length]); }
    if (stage === 4) {
      g.strokeStyle = T.crack[1]; g.lineWidth = Math.max(1, R * 0.06); g.beginPath(); g.moveTo(cx - R * 0.5, cy - R * 0.5); g.lineTo(cx - R * 0.15, cy - R * 0.1); g.lineTo(cx - R * 0.3, cy + R * 0.3); g.moveTo(cx + R * 0.2, cy - R * 0.7); g.lineTo(cx + R * 0.35, cy - R * 0.25); g.stroke();
      poly(g, [[cx - R * 0.3, cy - R * 0.15], [cx + R * 0.2, cy - R * 0.2], [cx + R * 0.25, cy + R * 0.2], [cx - R * 0.25, cy + R * 0.22]], T.crack[0]); poly(g, [[cx - R * 0.15, cy - R * 0.08], [cx + R * 0.1, cy - R * 0.1], [cx + R * 0.12, cy + R * 0.1], [cx - R * 0.12, cy + R * 0.12]], T.crack[1]);
    }
    g.save();
    // the seam
    g.fillStyle = T.seam; g.fillRect(cx - R * 0.92, cy + R * 0.12, R * 1.84, Math.max(1, R * 0.05));
    g.restore();
    VA.finish(c, palOf(T)); c.cy = cy; c.cx = cx; return c;
  }
  const SKULL = [
    '.........4.......4.....................................................',
    '..........5.......5.......5............................................',
    '..........45......45......45...........................................',
    '...........455.....55......5...........................................',
    '............500....000.....00..........................................',
    '1...........055555555555555555.........................................',
    '.4..........54344434443444344455..544444444444.........................',
    '.133......5544444444444444444444..43323332333244.......................',
    '..323...55443444344434443444344054332333233323334444...................',
    '..3123.544444444444444444444444043323332333233323200555................',
    '..12205444344434443444344434000233233323332333220.554445555............',
    '...1105444444444444440000000544.22333233322222..554444444445555........',
    '....1054344400000000054444443334.23322222......5444444444444440005.....',
    '......000000544444444333333133334.22.....pppppp5444444444440005002444..',
    '4333305444443313333331333333133334..pppeEepeep544444000000054423..4334.',
    '32212043133333313333331333333133334.ppppeepepp0000005444444333334.4333.',
    '12122043313333331333333133333313332.5444444444444444233323332300pp3333.',
    '.322104333133333313333331333333132..43333333333333113333333000544p3332.',
    '.111..033331333333133333313333332.54332333233323300011000002443333333..',
    '.....400333313333331333333133332..0000000000000004333333333.002333332..',
    '....422003333133333313333331300.433333333333333332222222222333.23332...',
    '...422120000000333333133000004042222222222222222222222222222221.233....',
    '..422110433333000000000043333203222222111111111111111111111111...22....',
    '..1211..322222233333333322222201111111.................................',
    '...11...11112222222222211111111........................................',
    '............11111111111................................................',
  ];
  // the head is pixel art (SKULL, 71 x 26), built from angular armour plates, each lit on its upper-left edges with a
  // dark seam where it meets the next: three gill fins, a crown with three spines, a grooved cheek plate, the jaw
  // muscle, a heavy brow over a slit eye, two snout plates with scars, a hooked tip with a flared nostril, the lip. The lower jaw,
  // its teeth, the fans, the tendrils and the inside of the mouth are added around it for each pose.
  // Facing right; jaw 0..5 from just parted (how it holds it) to gaping; sway 0/1 moves the fans and tendrils.
  function paintHead(T, R, jaw, stage, sway) {
    const W0 = 104, H0 = 76, c = mk(W0, H0), g = c.ctx, OX = 26, OY = 18, sw = sway ? 1 : -1;
    const P = T.plate, open = [0.06, 0.16, 0.28, 0.4, 0.52, 0.64][jaw] || 0.06;
    const col = { 0: sh(P[0], -0.3), 1: P[0], 2: P[1], 3: P[2], 4: P[3], 5: P[4], 6: P[5], b: T.belly[0], c: T.belly[1], e: T.eye, E: sh(T.eye, 0.6), p: '#020204', m: T.mouth[0], g: T.gum, t: T.teeth[1], u: T.teeth[0] };
    const px = (x, y, k) => { const cc = col[k] || k; g.fillStyle = cc; g.fillRect(x, y, 1, 1); };
    g.imageSmoothingEnabled = false;
    // fans: crown and cheek, swept back from behind the skull
    fan(g, OX + 8, OY + 8, -1.8 + sw * 0.05, -3.0 + sw * 0.08, 7, 16, 25 + sw, T, true);
    fan(g, OX + 4, OY + 17, -2.6 - sw * 0.06, 2.5 + sw * 0.06, 8, 13, 19 - sw, T, true);
    if (stage === 4) [[14, 2, -10, -14], [21, 1, -6, -17], [28, 3, -4, -12]].forEach(([x, y, dx, dy], k) => { g.fillStyle = k % 2 ? T.crack[0] : P[0]; g.beginPath(); g.moveTo(OX + x - 2, OY + y + 1); g.lineTo(OX + x + dx, OY + y + dy); g.lineTo(OX + x + 2, OY + y + 1); g.closePath(); g.fill(); });
    // the hinge of the jaw, and where the lips meet
    const hx = OX + 30, hy = OY + 22, lipY = OY + 22;
    // the inside of the mouth: dark, with the throat, ridges on the palate, and the tongue
    if (open > 0.1) {
      g.fillStyle = T.mouth[0]; g.beginPath(); g.moveTo(hx - 1, hy); g.lineTo(OX + 62, lipY); g.lineTo(hx + Math.cos(open) * 38, hy + Math.sin(open) * 38); g.closePath(); g.fill();
      poly(g, [[hx + 1, hy + 2 + open * 6], [hx + 6, hy - 1], [hx + 11, hy + 2 + open * 6], [hx + 6, hy + 3 + open * 13]], T.ridge);
      poly(g, [[hx + 3, hy + 2 + open * 6], [hx + 5, hy + 1], [hx + 7, hy + 2 + open * 6], [hx + 5, hy + 2 + open * 10]], T.mouth[1]);
      for (let k = 0; k < 5; k++) { const x = OX + 36 + k * 5; px(x, lipY + 1, T.ridge); px(x - 1, lipY + 2, T.ridge); }
    }
    // the lower jaw, drawn straight then turned about the hinge
    const J = mk(40, 26), jg = J.ctx; jg.imageSmoothingEnabled = false;
    const jcol = (x, y, k) => { jg.fillStyle = col[k] || k; jg.fillRect(x, y, 1, 1); };
    const JR = { 4: [1, 36, '5'], 5: [0, 37, '3'], 6: [0, 35, '0'], 7: [1, 32, 'b'], 8: [2, 26, 'b'], 9: [5, 18, '1'] };
    // crooked teeth pointing up, then the gum they sit in
    [[6, 2], [9, 1], [12, 3], [15, 1], [18, 2], [21, 4], [24, 1], [27, 2], [30, 1], [33, 3]].forEach(([x, L], k) => { for (let y = 0; y < L; y++) jcol(x, 3 - y, y === L - 1 ? 't' : 'u'); if (L >= 3) jcol(x + 1, 3, 'u'); });
    Object.keys(JR).forEach((r) => { const [a, b, k] = JR[r]; for (let x = a; x <= b; x++) jcol(x, +r, k); });
    for (let x = 5; x <= 34; x++) jcol(x, 4, 'g');
    for (let x = 14; x <= 30; x += 8) { jcol(x, 5, '0'); jcol(x + 1, 6, '0'); } // seams between the jaw plates
    jcol(36, 3, '4'); jcol(37, 3, '5'); jcol(37, 2, '5'); jcol(38, 1, '5'); // the chin, hooked up into a spike
    if (open > 0.1) for (let x = 5; x < 26; x++) jcol(x, 3 - (x > 16 ? 1 : 0) + (sway && x > 21 ? -1 : 0), x % 7 ? T.tongue : T.gum); // the tongue along the floor of the jaw
    for (let k = 0; k < 5; k++) { let x = 6 + k * 6, y = 10; const L = 8 + (k % 3) * 4; for (let i = 0; i < L; i++) { jcol(x, y + i, k % 2 ? T.fin[0] : P[1]); if (i % 3 === 2) x += ((i + k + sway) % 2 ? 1 : -1); } } // tendrils
    g.save(); g.translate(hx, hy); g.rotate(open); g.drawImage(J, -2, -5); g.restore();
    // upper teeth, crooked, hanging below the lip; two long fangs
    [[34, 2], [37, 1], [40, 3], [43, 1], [46, 5], [49, 2], [52, 1], [55, 3], [58, 4], [61, 1]].forEach(([x, L]) => { for (let y = 0; y < L; y++) px(OX + x, lipY + 1 + y, y === L - 1 ? 't' : 'u'); if (L >= 4) px(OX + x + 1, lipY + 1, 'u'); });
    // strings of spit when it gapes
    if (open > 0.3) for (let k = 0; k < 3; k++) { const x0 = OX + 38 + k * 7, y0 = lipY + 1, y1 = hy + Math.sin(open) * (x0 - hx) - 3; for (let y = y0; y < y1; y++) px(x0 + ((y + k + sway) % 4 === 0 ? 1 : 0), y, T.spit); }
    // the skull on top
    SKULL.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const k = row[x]; if (k !== '.') px(OX + x, OY + y, k); } });
    if (stage === 3) { for (const [x, y] of [[36, 13], [37, 15], [46, 15], [63, 16], [62, 17]]) px(OX + x, OY + y, 'p'); } // a bare skull: wider holes
    if (stage === 4) { // more eyes, cracks of fire
      for (const [x, y] of [[50, 16], [54, 15], [22, 9], [26, 11]]) { px(OX + x, OY + y, 'p'); px(OX + x + 1, OY + y, T.eye); px(OX + x + 2, OY + y, 'p'); }
      [[12, 8], [13, 9], [14, 10], [14, 11], [15, 12], [55, 17], [56, 18], [57, 18], [58, 19]].forEach(([x, y]) => px(OX + x, OY + y, T.crack[1]));
    }
    VA.finish(c, palOf(T).concat([sh(P[0], -0.3)])); c.cx = OX + 32; c.cy = OY + 15; return c;
  }
  function paintTail(T, R, stage) {
    const w = R * 4 + 8, h = R * 4 + 8, c = mk(w, h), g = c.ctx, cx = w - R - 4, cy = h / 2;
    if (stage === 4) { // a bone blade, hooked like a scythe, with torn fin rags
      poly(g, [[cx, cy - R * 0.4], [cx - R * 2.2, cy - R * 0.9], [cx - R * 3.4, cy - R * 0.2], [cx - R * 2.4, cy + R * 0.1], [cx, cy + R * 0.4]], T.teeth[0]);
      poly(g, [[cx, cy - R * 0.25], [cx - R * 2.2, cy - R * 0.7], [cx - R * 3.2, cy - R * 0.2], [cx - R * 2.2, cy - R * 0.2]], T.teeth[1]);
      poly(g, [[cx - R * 0.5, cy + R * 0.3], [cx - R * 1.6, cy + R * 1.4], [cx - R * 1.1, cy + R * 0.5]], T.fin[1]);
      ellipse(g, cx, cy, R * 0.9, R * 0.8, T.plate[2]); ellipse(g, cx, cy, R * 0.3, R * 0.25, T.crack[1]);
      VA.finish(c, palOf(T)); c.cx = cx; c.cy = cy; return c;
    }
    for (let k = -3; k <= 3; k++) { const a = Math.PI + k * 0.24, L = R * (3.2 - Math.abs(k) * 0.25); poly(g, [[cx, cy - R * 0.25], [cx + Math.cos(a - 0.1) * L, cy + Math.sin(a - 0.1) * L], [cx + Math.cos(a + 0.1) * L, cy + Math.sin(a + 0.1) * L], [cx, cy + R * 0.25]], k % 2 ? T.fin[1] : T.fin[0]); }
    for (let k = -3; k <= 3; k++) { const a = Math.PI + k * 0.24, L = R * (3.1 - Math.abs(k) * 0.25); g.strokeStyle = T.fin[2]; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); g.stroke(); }
    poly(g, [[cx - R * 0.9, cy - R * 0.4], [cx - R * 0.4, cy - R * 0.8], [cx + R * 0.5, cy - R * 0.8], [cx + R * 0.9, cy - R * 0.3], [cx + R * 0.9, cy + R * 0.3], [cx + R * 0.5, cy + R * 0.8], [cx - R * 0.4, cy + R * 0.8], [cx - R * 0.9, cy + R * 0.4]], T.plate[2]);
    poly(g, [[cx - R * 0.4, cy - R * 0.7], [cx + R * 0.5, cy - R * 0.7], [cx + R * 0.7, cy - R * 0.3], [cx - R * 0.5, cy - R * 0.3]], T.plate[3]);
    VA.finish(c, palOf(T)); c.cx = cx; c.cy = cy; return c;
  }
  // a big pectoral fin, hanging back and down from a segment
  function paintFin(T, R) {
    const w = R * 3 + 6, h = R * 2.2 + 6, c = mk(w, h), g = c.ctx, x0 = w - 4, y0 = 4;
    poly(g, [[x0, y0], [x0 - R * 2.8, y0 + R * 1.2], [x0 - R * 2.2, y0 + R * 1.9], [x0 - R * 1.2, y0 + R * 1.5], [x0 - R * 0.3, y0 + R * 0.7]], T.fin[1]);
    for (let k = 0; k < 5; k++) { g.strokeStyle = T.fin[2]; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 - R * (2.7 - k * 0.45), y0 + R * (1.3 + k * 0.1)); g.stroke(); }
    poly(g, [[x0, y0], [x0 - R * 2.8, y0 + R * 1.2], [x0 - R * 2.4, y0 + R * 1.25]], T.fin[0]);
    VA.finish(c, palOf(T)); c.ox = x0; c.oy = y0; return c;
  }

  // ---------------- cache ----------------
  const cache = new Map();
  function sprite(kind, stage, R, v) {
    const key = kind + stage + ':' + R + ':' + (v || 0); let c = cache.get(key); if (c) return c;
    const T = THEMES[stage] || THEMES[1];
    c = kind === 'seg' ? paintSeg(T, R, v, stage) : kind === 'head' ? paintHead(T, R, v % 10, stage, v >= 10 ? 1 : 0) : kind === 'tail' ? paintTail(T, R, stage) : paintFin(T, R);
    cache.set(key, c); return c;
  }
  const bucket = (r) => Math.max(3, Math.round(r / PX / 2) * 2); // segment radius in sprite pixels, in steps of 2

  // ---------------- drawing ----------------
  const stageOf = (b) => { const f = (b.fx || []).find((q) => q.type === 'v3stage'); return b.stage || (f && f.x) || (b.phase === 3 ? 4 : b.phase === 2 ? 2 : 1); };
  let swell = 1;
  function drawRot(g, img, x, y, ang, ax, ay, flip) {
    g.save(); g.translate(x, y); g.rotate(ang); if (flip) g.scale(1, -1); g.scale(PX * swell, PX * swell); g.drawImage(img, -ax, -ay); g.restore();
  }
  function draw(g, b, ox, oy, time) {
    if ((b.fx || []).some((f) => f.type === 'v3hide') && !b.dead) { if (RW.v3levFxDraw) try { RW.v3levFxDraw(g, b, ox, oy, time); } catch (e) { /* effects only */ } return; } // sunk into the dark: nothing to see
    const stage = stageOf(b); swell = stage === 4 ? 1.12 : 1; const dead = b.dead, dt0 = dead ? (b.deadT || 0) : 0, segs = b.segs, n = segs.length;
    const flash = b.hitT > 0 ? Math.min(1, b.hitT / 0.15) : 0;
    const h = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false;
    g.save(); if (dead) g.globalAlpha = Math.max(0, 1 - Math.max(0, dt0 - 1.8) / 1.6);
    const pos = (i) => {
      const s = i < 0 ? h : segs[i]; let x = s.x, y = s.y;
      if (dead && i >= 0) { const k = Math.max(0, dt0 - (n - i) * 0.05); x += Math.sin(i * 2.1) * k * 30 * K; y += k * k * 40 * K + Math.cos(i * 1.7) * k * 12 * K; }
      // a slow travelling ripple, for life
      if (!dead && i >= 2) { const prev = segs[i - 1], ax = s.x - prev.x, ay = s.y - prev.y, L = Math.hypot(ax, ay) || 1, wv = Math.sin(time * 3.4 - i * 0.45) * Math.min(5 * K, i * 0.4 * K); x -= (ay / L) * wv; y += (ax / L) * wv; }
      return { x, y };
    };
    const P = []; for (let i = -1; i < n; i++) P.push(pos(i));
    const angAt = (i) => { const a = P[i + 1], q = P[i]; return Math.atan2(q.y - a.y, q.x - a.x); }; // toward the head
    // tail fan
    { const i = n - 1, a = angAt(i), p = P[i + 1], R = bucket(segR(i) * 0.9), t = sprite('tail', stage, R);
      drawRot(g, t, p.x + ox, p.y + oy, a, t.cx, t.cy, Math.cos(a) < 0); }
    // segments, tail first so each one overlaps the one behind it
    for (let i = n - 1; i >= 0; i--) {
      const p = P[i + 1], a = angAt(i), R = bucket(segR(i)), v = i % 4 === 1 ? 1 : i % 2 === 0 ? 0 : 2, s = sprite('seg', stage, R, v), flip = Math.cos(a) < 0;
      drawRot(g, s, p.x + ox, p.y + oy, a, s.cx, s.cy, flip);
      if (i === 3 || i === 9) { const f = sprite('fin', stage, Math.round(R * 0.9)), row = Math.sin(time * 4 + i) * 0.18; drawRot(g, f, p.x + ox, p.y + oy, a + (flip ? -row : row), f.ox, f.oy - R * 0.3, flip); }
      if (flash) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.45 * flash; drawRot(g, s, p.x + ox, p.y + oy, a, s.cx, s.cy, flip); g.restore(); }
    }
    // head, jaw by the fight's state
    { const a = b.ang || 0, jaw = Math.max(0, Math.min(5, Math.round(((b.jaw || 0) - 0.08) / 0.11))), sway = Math.floor(time * 2.2) % 2, R = bucket(segR(0) * 1.15), s = sprite('head', stage, R, jaw + sway * 10), flip = Math.cos(a) < 0;
      const p = P[0]; drawRot(g, s, p.x + ox, p.y + oy, a, s.cx, s.cy, flip);
      if (flash) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.45 * flash; drawRot(g, s, p.x + ox, p.y + oy, a, s.cx, s.cy, flip); g.restore(); } }
    // the crystal shield: a shimmering pixel ring around every third plate
    if ((b.shield || (b.fx || []).some((f) => f.type === 'v3shield')) && !dead) {
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i += 3) { const p = P[i + 1], r = segR(i) * 1.25, a = 0.18 + 0.12 * Math.sin(time * 3 + i * 0.3); g.fillStyle = 'rgba(160,230,255,' + a.toFixed(3) + ')';
        for (let k = 0; k < 16; k++) { const an = k / 16 * 6.283 + time * 0.6; g.fillRect(Math.round(p.x + ox + Math.cos(an) * r) - PX, Math.round(p.y + oy + Math.sin(an) * r) - PX, PX * 2, PX * 2); } }
      g.globalCompositeOperation = 'source-over';
    }
    // stage 4 sheds embers from its cracks
    if (stage === 4 && !dead && RW.fx && Math.random() < 0.7) { const i = (Math.random() * n) | 0, p = P[i + 1]; RW.fx.spawn({ x: p.x + RW.rand(-20, 20), y: p.y + RW.rand(-20, 20), vx: RW.rand(-30, 30), vy: RW.rand(-80, -30), life: 0.9, color: RW.pick(THEMES[4].crack), add: true, kind: 'glow', size: 2 }); }
    if (RW.v3levFxDraw) try { RW.v3levFxDraw(g, b, ox, oy, time); } catch (e) { /* effects only */ }
    g.restore(); g.imageSmoothingEnabled = sm;
  }
  RW.v3levDraw = draw;

  // ---------------- the new moves' effects, in chunky pixels ----------------
  const blk = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x / PX) * PX, Math.round(y / PX) * PX, Math.max(PX, Math.round(w / PX) * PX), Math.max(PX, Math.round(h / PX) * PX)); };
  RW.v3levFxDraw = function (g, b, ox, oy, time) {
    const F = b.fx || [], get = (t) => F.find((f) => f.type === t), a = WD.meta && WD.meta.arena; if (!a) return;
    const TS = RW.TILE, cx = a.cx * TS + 8, cy = a.cy * TS + 8, rx = a.rx * TS, ry = a.ry * TS;
    const su = get('v3surge');
    if (su) { g.save(); g.globalCompositeOperation = 'lighter'; for (let k = 0; k < 46; k++) { const y = cy + (((k * 0.6180339) % 1) * 2 - 1) * ry * 0.9, sp = 700 + (k % 5) * 90, x = cx - rx + ((time * sp * su.x + k * 397) % (2 * rx) + 2 * rx) % (2 * rx); blk(g, x + ox, y + oy, 60 + (k % 3) * 30, PX, 'rgba(160,230,255,0.35)'); } g.restore(); }
    const ih = get('v3inhale');
    if (ih) { g.save(); g.globalCompositeOperation = 'lighter'; for (let k = 0; k < 28; k++) { const an = k * 2.399, fr = 1 - ((time * 1.4 + k / 28) % 1), r = 60 + fr * 900; blk(g, ih.x + Math.cos(an + fr) * r + ox, ih.y + Math.sin(an + fr) * r + oy, PX * 2, PX * 2, 'rgba(160,110,240,' + (0.25 + 0.5 * (1 - fr)).toFixed(2) + ')'); } g.restore(); }
    const wn = get('v3warn');
    if (wn) { const pulse = 0.4 + 0.4 * Math.sin(time * 12); for (let k = 0; k < 20; k++) { const an = k / 20 * 6.283, r = 70 + Math.sin(time * 6) * 10; blk(g, wn.x + Math.cos(an) * r + ox, wn.y - 10 + Math.sin(an) * r * 0.35 + oy, PX * 2, PX, 'rgba(255,60,60,' + pulse.toFixed(2) + ')'); } }
    const gp = get('v3grasp');
    if (gp) (gp.pts || []).forEach((q) => {
      if (gp.warn) { const al = 0.5 + 0.4 * Math.sin(time * 14); for (let k = -6; k <= 6; k++) blk(g, q.x + k * 7 + ox, q.y - 2 + ((k * 7) % 3) + oy, 7, PX, 'rgba(255,80,60,' + al.toFixed(2) + ')'); }
      else [[-26, 90], [0, 140], [24, 110]].forEach(([dx, hgt]) => { for (let yy = 0; yy < hgt; yy += PX) { const wdt = Math.max(PX, (1 - yy / hgt) * 26); blk(g, q.x + dx - wdt / 2 + ox, q.y - yy - PX + oy, wdt, PX, yy % (PX * 4) ? '#d8d0b4' : '#ada488'); } });
    });
    const lv = get('v3lava');
    if (lv) (lv.pools || []).forEach((q, i) => { if ((b.t || 0) < q.t0) return; for (let k = -8; k < 8; k++) { const fl = Math.sin(time * 9 + k * 1.7 + i) > 0.2; blk(g, q.x + k * PX * 2 + ox, q.y - PX * (fl ? 2 : 1) + oy, PX * 2, PX * (fl ? 2 : 1), fl ? '#ffb070' : '#ff5a3a'); } });
  };
  RW.v3levArt = { sprite, THEMES, PX, paintSeg, paintHead, paintTail, paintFin, stageOf };

  // ---------------- the chamber is pitch black (set after v3s6's cave light) ----------------
  const RDEF = RW.WORLDS && RW.WORLDS.rock;
  if (RDEF && RDEF.ambientAt) {
    const bAmb = RDEF.ambientAt;
    RDEF.ambientAt = function (x, y) {
      const c = WD.meta && WD.meta.arena;
      if (c && WD.def && WD.def.id === 'rock') { const dx = (x - c.cx) / (c.rx + 3), dy = (y - c.cy) / (c.ry + 3); if (dx * dx + dy * dy <= 1) return 0; }
      return bAmb.apply(this, arguments);
    };
  }
})(window.RW);
