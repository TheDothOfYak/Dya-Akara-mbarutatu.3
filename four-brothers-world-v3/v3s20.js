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
    1: { name: 'teal', plate: ['#0b1f26', '#123440', '#1b4b5a', '#256777', '#3a8792', '#5ba7a8'], belly: ['#5d8c88', '#83b2a8', '#b4dccf'], seam: '#6ee6ff', gems: GEMS, eye: '#f2c94c', mouth: ['#24123a', '#52288a'], teeth: ['#b8b098', '#ece6d0'], crest: GEMS, fin: ['#1b4b5a', '#3a8792', '#7fd8e0'] },
    2: { name: 'abyssal', plate: ['#06050b', '#0e0a18', '#171226', '#221a36', '#30244c', '#433262'], belly: ['#251e32', '#352c46', '#4a3e5e'], seam: '#8a5ad8', gems: ['#6c4aa8', '#9a74e0', '#4a3270'], eye: '#b08aff', mouth: ['#120818', '#3a1a5a'], teeth: ['#8a8298', '#c8c0d4'], crest: ['#6c4aa8', '#9a74e0', '#4a3270'], fin: ['#171226', '#30244c', '#6c4aa8'] },
    3: { name: 'bone', plate: ['#4e4838', '#6e6852', '#948c70', '#b8ae90', '#d8d0b4', '#f0ead4'], belly: ['#0a0a10', '#14141c', '#20202a'], seam: '#3ae0d0', gems: ['#3ae0d0', '#a8fff4'], eye: '#4cf0e0', mouth: ['#04040a', '#141420'], teeth: ['#d8d0b4', '#f0ead4'], crest: ['#b8ae90', '#d8d0b4', '#948c70'], fin: ['#0c0c12', '#20202a', '#6e6852'], dark: ['#040406', '#0a0a10', '#14141c'] },
    4: { name: 'rage', plate: ['#080404', '#140a0a', '#221010', '#321616', '#461e1c', '#5e2a24'], belly: ['#3a1c18', '#56281e', '#7a3a24'], seam: '#ff5a3a', gems: ['#ff5a3a', '#ffb070', '#ffe0a0'], eye: '#ff3a2a', mouth: ['#2a0604', '#ff6a2a'], teeth: ['#d8c8b0', '#fff0d8'], crest: ['#ff5a3a', '#ffb070', '#c83a20'], fin: ['#221010', '#461e1c', '#ff6a3a'], crack: ['#c83a20', '#ff6a3a', '#ffc070'] },
  };
  Object.keys(THEMES).forEach((k) => { const T = THEMES[k]; ['plate', 'belly', 'fin', 'teeth'].forEach((key) => { T[key] = T[key].map((c) => sh(c, -0.28)); }); if (k !== '1') T.crest = T.crest.map((c) => sh(c, -0.2)); });
  const palOf = (T) => ['#020204', '#ffffff'].concat(T.plate, T.belly, T.gems, T.crest, T.fin, T.mouth, T.teeth, [T.seam, T.eye, sh(T.eye, 0.5)], T.dark || [], T.crack || []);

  // ---------------- painters (pixel units, facing right) ----------------
  function ellipse(g, x, y, rx, ry, col) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, 6.283); g.fill(); }
  function poly(g, pts, col) { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); }
  // one armoured segment; R is its radius in sprite pixels; v picks the extras on its back
  function paintSeg(T, R, v, stage) {
    const low = stage === 4 ? 0.75 : 0.42, w = R * (stage === 4 ? 2.2 : 1.7) + 6, h = R * (2.72 + low) + 6, c = mk(w, h), g = c.ctx, cx = w / 2, cy = h - R * (1 + low) - 3;
    if (stage === 4) { // jagged spikes bursting out of the top and bottom, before the body so their roots are hidden
      [[-0.55, -1, 1.0, -0.5], [0.05, -1, 1.35, -0.15], [0.55, -1, 0.9, 0.3], [-0.35, 1, 0.8, -0.4], [0.35, 1, 0.95, 0.35]].forEach(([u, side, len, lean]) => {
        const bx = cx + u * R, by = cy + side * R * 0.7, tx = bx + lean * R, ty = by + side * len * R;
        poly(g, [[bx - R * 0.16, by], [tx, ty], [bx + R * 0.16, by]], T.plate[0]); poly(g, [[bx - R * 0.05, by], [tx, ty], [bx + R * 0.16, by]], T.crack[0]);
      });
    }
    const P = T.plate, B = T.belly;
    // the dorsal piece first, so the body overlaps its root
    if (stage === 4) { /* the spikes stand in for the back pieces */ }
    else if (v === 0) { // a crystal / bone spine
      const col = T.crest[(R | 0) % T.crest.length], hh = R * 1.05;
      poly(g, [[cx - R * 0.32, cy - R * 0.7], [cx + R * 0.12, cy - R * 0.62 - hh], [cx + R * 0.3, cy - R * 0.72]], sh(col, -0.4));
      poly(g, [[cx - R * 0.12, cy - R * 0.72], [cx + R * 0.12, cy - R * 0.62 - hh], [cx + R * 0.3, cy - R * 0.72]], col);
      poly(g, [[cx + R * 0.02, cy - R * 0.8], [cx + R * 0.12, cy - R * 0.62 - hh], [cx + R * 0.08, cy - R * 0.84]], sh(col, 0.5));
    } else if (v === 1) { // a ragged dorsal fin
      poly(g, [[cx - R * 0.6, cy - R * 0.6], [cx - R * 0.2, cy - R * 1.35], [cx + R * 0.1, cy - R * 1.0], [cx + R * 0.4, cy - R * 1.2], [cx + R * 0.55, cy - R * 0.62]], T.fin[1]);
      for (let k = 0; k < 4; k++) { g.strokeStyle = T.fin[2]; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - R * 0.4 + k * R * 0.28, cy - R * 0.7); g.lineTo(cx - R * 0.25 + k * R * 0.22, cy - R * 1.2); g.stroke(); }
    } else { // a pair of hooked back spikes
      [[-0.3, 0.75], [0.25, 0.95]].forEach(([u, L]) => poly(g, [[cx + R * (u - 0.18), cy - R * 0.72], [cx + R * (u - 0.35), cy - R * (0.72 + L)], [cx + R * (u + 0.18), cy - R * 0.75]], T.crest[(R | 0) % T.crest.length]));
    }
    if (stage !== 4) for (const u of [-0.35, 0.3]) poly(g, [[cx + R * (u - 0.14), cy + R * 0.8], [cx + R * (u - 0.3), cy + R * 1.3], [cx + R * (u + 0.14), cy + R * 0.85]], T.crest[0]); // belly spikes
    // body: a fat armoured ring
    ellipse(g, cx, cy, R * 0.8, R, P[1]);
    ellipse(g, cx + R * 0.04, cy - R * 0.08, R * 0.72, R * 0.88, P[2]);
    ellipse(g, cx + R * 0.1, cy - R * 0.3, R * 0.56, R * 0.56, P[3]);
    ellipse(g, cx + R * 0.16, cy - R * 0.44, R * 0.34, R * 0.3, P[4]);
    if (stage === 3) { ellipse(g, cx + R * 0.05, cy + R * 0.15, R * 0.62, R * 0.55, T.dark[1]); }
    // belly plates
    g.save(); g.beginPath(); g.ellipse(cx, cy, R * 0.8, R, 0, 0, 6.283); g.clip();
    g.fillStyle = B[1]; g.fillRect(cx - R, cy + R * 0.38, R * 2, R);
    g.fillStyle = B[2]; g.fillRect(cx - R, cy + R * 0.38, R * 2, Math.max(1, R * 0.1));
    for (let k = 0; k < 3; k++) { g.fillStyle = B[0]; g.fillRect(cx - R, cy + R * (0.56 + k * 0.16), R * 2, Math.max(1, R * 0.05)); }
    // the plate's back edge: a dark crescent so the segments read as overlapping armour
    g.strokeStyle = P[0]; g.lineWidth = Math.max(1, R * 0.12); g.beginPath(); g.ellipse(cx - R * 0.72, cy, R * 0.5, R * 1.1, 0, -1.2, 1.2); g.stroke();
    g.strokeStyle = P[5]; g.lineWidth = Math.max(1, R * 0.06); g.beginPath(); g.ellipse(cx + R * 0.66, cy, R * 0.3, R * 0.95, 0, -1.1, 0.3); g.stroke();
    // stage marks
    if (stage === 1 || stage === 2) { // gem studs in a row along the back
      for (let k = 0; k < 3; k++) { const gx = cx - R * 0.4 + k * R * 0.4, gy = cy - R * 0.55 + (k % 2) * R * 0.1, s = Math.max(1.2, R * 0.12), col = T.gems[((R | 0) + k) % T.gems.length];
        poly(g, [[gx, gy - s], [gx + s, gy], [gx, gy + s], [gx - s, gy]], col); g.fillStyle = '#ffffff'; g.fillRect(Math.round(gx - s * 0.3), Math.round(gy - s * 0.5), 1, 1); }
    } else if (stage === 3) { // ribs showing through
      for (let k = 0; k < 3; k++) { g.strokeStyle = T.plate[4]; g.lineWidth = Math.max(1, R * 0.08); g.beginPath(); g.arc(cx - R * 0.35 + k * R * 0.35, cy + R * 0.05, R * 0.55, -2.4, -0.7); g.stroke(); }
    } else if (stage === 4) { // glowing cracks
      g.strokeStyle = T.crack[1]; g.lineWidth = Math.max(1, R * 0.06); g.beginPath(); g.moveTo(cx - R * 0.5, cy - R * 0.5); g.lineTo(cx - R * 0.15, cy - R * 0.1); g.lineTo(cx - R * 0.3, cy + R * 0.3); g.moveTo(cx + R * 0.2, cy - R * 0.7); g.lineTo(cx + R * 0.35, cy - R * 0.25); g.lineTo(cx + R * 0.15, cy + R * 0.05); g.stroke();
      g.strokeStyle = T.crack[2]; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - R * 0.45, cy - R * 0.45); g.lineTo(cx - R * 0.17, cy - R * 0.12); g.stroke();
    }
    if (stage === 4) { // a molten core showing through a hole torn in the plate
      ellipse(g, cx - R * 0.05, cy + R * 0.02, R * 0.3, R * 0.24, T.crack[0]); ellipse(g, cx - R * 0.05, cy + R * 0.02, R * 0.2, R * 0.15, T.crack[1]); ellipse(g, cx - R * 0.08, cy - R * 0.01, R * 0.09, R * 0.07, T.crack[2]);
      poly(g, [[cx + R * 0.5, cy - R * 0.9], [cx + R * 0.85, cy - R * 0.55], [cx + R * 0.55, cy - R * 0.5]], '#020204'); // a bite out of the plate
    }
    // the glowing seam along the flank
    g.fillStyle = T.seam; g.fillRect(cx - R * 0.8, cy + R * 0.1, R * 1.6, Math.max(1, R * 0.07));
    g.restore();
    VA.finish(c, palOf(T)); c.cy = cy; c.cx = cx; return c;
  }
  // a curved horn: thick at the root (bx, by), sweeping back by (dx, dy) with a bend
  function horn(g, bx, by, dx, dy, thick, bend, col, tip) {
    const mx = bx + dx * 0.5 + bend * dy * 0.3, my = by + dy * 0.5 - bend * dx * 0.3;
    g.fillStyle = col; g.beginPath(); g.moveTo(bx - thick * 0.5, by + thick * 0.2); g.quadraticCurveTo(mx - thick * 0.3, my, bx + dx, by + dy); g.quadraticCurveTo(mx + thick * 0.4, my + thick * 0.2, bx + thick * 0.6, by - thick * 0.1); g.closePath(); g.fill();
    if (tip) { g.strokeStyle = tip; g.lineWidth = Math.max(1, thick * 0.18); g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(mx, my - thick * 0.15, bx + dx, by + dy); g.stroke(); }
  }
  // the head: a dragon's. Facing right; jaw 0 = just parted (how it holds it), 1 = open, 2 = gaping
  function paintHead(T, R, jaw, stage) {
    const w = R * 5.6 + 8, h = R * 5 + 8, c = mk(w, h), g = c.ctx, cx = R * 2.2 + 4, cy = h * 0.52;
    const P = T.plate, open = [0.1, 0.34, 0.62][jaw], hornC = stage === 3 ? T.plate[4] : stage === 4 ? T.plate[1] : T.teeth[0];
    // the neck frill: a fan of long spines behind the skull, webbed
    for (let k = 0; k < 4; k++) { const an = -2.4 + k * 0.42, L = R * (1.6 + (k % 2) * 0.6); poly(g, [[cx - R * 0.8, cy - R * 0.2], [cx - R * 0.8 + Math.cos(an) * L, cy - R * 0.2 + Math.sin(an) * L], [cx - R * 0.8 + Math.cos(an + 0.22) * L * 0.75, cy - R * 0.2 + Math.sin(an + 0.22) * L * 0.75]], k % 2 ? T.fin[1] : T.fin[0]); }
    for (let k = 0; k < 4; k++) { const an = -2.4 + k * 0.42, L = R * (1.6 + (k % 2) * 0.6); g.strokeStyle = hornC; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - R * 0.8, cy - R * 0.2); g.lineTo(cx - R * 0.8 + Math.cos(an) * L, cy - R * 0.2 + Math.sin(an) * L); g.stroke(); }
    // two great horns sweeping back from the crown, a smaller pair under them
    horn(g, cx - R * 0.1, cy - R * 0.85, -R * 2.3, -R * 1.1, R * 0.42, 0.5, hornC, sh(hornC, 0.35));
    horn(g, cx + R * 0.25, cy - R * 0.8, -R * 1.6, -R * 1.35, R * 0.3, 0.4, sh(hornC, -0.15), null);
    if (stage === 4) for (let k = 0; k < 4; k++) horn(g, cx + R * (0.4 + k * 0.35), cy - R * 0.82, -R * 0.4, -R * (0.9 + (k % 2) * 0.5), R * 0.16, 0.2, k % 2 ? T.crack[0] : T.plate[0], null);
    // the mouth's dark inside, a glow down the throat
    poly(g, [[cx - R * 0.45, cy + R * 0.08], [cx + R * 3.1, cy - R * 0.02], [cx + R * 2.85, cy + R * (0.12 + open * 1.7)], [cx - R * 0.1, cy + R * (0.32 + open)]], T.mouth[0]);
    if (open > 0.2) ellipse(g, cx + R * 0.2, cy + R * (0.2 + open * 0.5), R * 0.35, R * open * 0.4, T.mouth[1]);
    // lower jaw with crooked teeth and a beard of spikes under the chin
    const LT = [0.22, 0.4, 0.18, 0.5, 0.26, 0.34, 0.16, 0.44, 0.24];
    g.save(); g.translate(cx - R * 0.4, cy + R * 0.12); g.rotate(open);
    LT.forEach((L, k) => { const x = R * (0.75 + k * 0.27); poly(g, [[x - R * 0.07, R * 0.02], [x + R * 0.03, -R * L], [x + R * 0.08, R * 0.02]], k % 3 ? T.teeth[1] : T.teeth[0]); });
    for (let k = 0; k < 3; k++) { const x = R * (0.4 + k * 0.6); poly(g, [[x - R * 0.12, R * 0.5], [x - R * 0.35, R * (0.95 + (k % 2) * 0.35)], [x + R * 0.1, R * 0.55]], k % 2 ? hornC : sh(hornC, -0.2)); }
    poly(g, [[0, -R * 0.1], [R * 2.9, -R * 0.02], [R * 3.2, R * 0.14], [R * 2.5, R * 0.48], [R * 0.8, R * 0.66], [-R * 0.35, R * 0.42]], P[1]);
    poly(g, [[R * 0.3, R * 0.4], [R * 2.4, R * 0.3], [R * 2.0, R * 0.55], [R * 0.6, R * 0.62]], T.belly[0]);
    poly(g, [[R * 0.2, -R * 0.06], [R * 2.75, R * 0.0], [R * 2.6, R * 0.08], [R * 0.3, R * 0.04]], P[3]);
    g.restore();
    // upper teeth of every length; two long fangs hang past the lower jaw
    const UT = [0.3, 0.16, 0.46, 0.2, 0.72, 0.24, 0.34, 0.14, 0.6, 0.2, 0.28, 0.18];
    UT.forEach((L, k) => { const x = cx + R * (0.05 + k * 0.25), y = cy + R * 0.06; poly(g, [[x - R * 0.06, y], [x - R * 0.01, y + R * L], [x + R * 0.09, y]], L > 0.5 ? T.teeth[1] : k % 2 ? T.teeth[0] : T.teeth[1]); });
    // the skull: long and wedge-shaped, a ridged snout ending in a hooked tip with a nose horn
    poly(g, [[cx - R * 1.15, cy - R * 0.15], [cx - R * 0.8, cy - R * 0.85], [cx + R * 0.5, cy - R * 0.95], [cx + R * 1.3, cy - R * 0.7], [cx + R * 2.3, cy - R * 0.5], [cx + R * 3.0, cy - R * 0.32], [cx + R * 3.35, cy + R * 0.02], [cx + R * 3.05, cy + R * 0.14], [cx + R * 0.2, cy + R * 0.14], [cx - R * 0.95, cy + R * 0.45]], P[1]);
    poly(g, [[cx - R * 0.8, cy - R * 0.72], [cx + R * 0.5, cy - R * 0.84], [cx + R * 1.3, cy - R * 0.6], [cx + R * 2.9, cy - R * 0.3], [cx + R * 0.6, cy - R * 0.3], [cx - R * 0.6, cy - R * 0.25]], P[2]);
    // the snout ridge: a row of small spikes running down to the nose horn
    for (let k = 0; k < 3; k++) { const x = cx + R * (1.4 + k * 0.5), y = cy - R * (0.64 - k * 0.1); poly(g, [[x - R * 0.12, y + R * 0.04], [x - R * 0.02, y - R * (0.22 - k * 0.02)], [x + R * 0.12, y + R * 0.04]], hornC); }
    poly(g, [[cx + R * 2.85, cy - R * 0.3], [cx + R * 3.0, cy - R * 0.85], [cx + R * 3.15, cy - R * 0.26]], hornC);
    // scales: little dark arcs over the plates
    for (let k = 0; k < 9; k++) { const x = cx + R * (-0.5 + (k % 5) * 0.42 + (k > 4 ? 0.2 : 0)), y = cy - R * (k > 4 ? 0.35 : 0.58); g.strokeStyle = P[0]; g.lineWidth = 1; g.beginPath(); g.arc(x, y, R * 0.12, 0.2, 2.9); g.stroke(); }
    // cheek spikes, pointing back
    [[-0.6, 0.15, 1.0]].forEach(([u, v, L]) => poly(g, [[cx + R * u, cy + R * (v - 0.1)], [cx + R * (u - L), cy + R * (v + 0.15)], [cx + R * u, cy + R * (v + 0.12)]], sh(hornC, -0.1)));
    // gill slits
    for (let k = 0; k < 3; k++) poly(g, [[cx - R * (0.55 - k * 0.2), cy - R * 0.12], [cx - R * (0.48 - k * 0.2), cy - R * 0.12], [cx - R * (0.5 - k * 0.2), cy + R * 0.3], [cx - R * (0.58 - k * 0.2), cy + R * 0.3]], P[0]);
    if (stage === 3) ellipse(g, cx + R * 2.0, cy - R * 0.15, R * 0.3, R * 0.1, T.dark[0]); // a hollow in the bare skull
    // a deep socket under a heavy spiked brow; a narrow burning eye
    ellipse(g, cx + R * 0.95, cy - R * 0.38, R * 0.34, R * 0.2, '#020204');
    poly(g, [[cx + R * 0.7, cy - R * 0.36], [cx + R * 1.25, cy - R * 0.42], [cx + R * 1.2, cy - R * 0.3], [cx + R * 0.75, cy - R * 0.3]], T.eye);
    g.fillStyle = sh(T.eye, 0.6); g.fillRect(Math.round(cx + R * 1.05), Math.round(cy - R * 0.4), 1, 1);
    g.fillStyle = '#020204'; g.fillRect(Math.round(cx + R * 0.95), Math.round(cy - R * 0.44), 1, Math.max(1, Math.round(R * 0.16)));
    poly(g, [[cx + R * 0.3, cy - R * 0.75], [cx + R * 1.55, cy - R * 0.52], [cx + R * 1.35, cy - R * 0.36], [cx + R * 0.95, cy - R * 0.46], [cx + R * 0.4, cy - R * 0.55]], P[0]);
    poly(g, [[cx + R * 0.35, cy - R * 0.76], [cx + R * 1.5, cy - R * 0.55], [cx + R * 1.45, cy - R * 0.5], [cx + R * 0.38, cy - R * 0.68]], P[2]);
    if (stage === 4) {
      poly(g, [[cx + R * 0.15, cy + R * 0.12], [cx + R * 0.55, cy + R * 0.85], [cx + R * 0.95, cy + R * 1.15], [cx + R * 0.7, cy + R * 0.8], [cx + R * 0.38, cy + R * 0.1]], T.teeth[1]); // a curved tusk
      [[1.7, -0.3, 0.08], [1.95, -0.2, 0.07], [0.35, -0.48, 0.08], [1.45, -0.12, 0.06]].forEach(([u, v, r]) => { ellipse(g, cx + R * u, cy + R * v, R * r * 1.5, R * r, '#020204'); ellipse(g, cx + R * u, cy + R * v, R * r, R * r * 0.6, T.eye); });
      g.strokeStyle = T.crack[1]; g.lineWidth = Math.max(1, R * 0.07); g.beginPath(); g.moveTo(cx - R * 0.4, cy - R * 0.6); g.lineTo(cx + R * 0.3, cy - R * 0.3); g.lineTo(cx + R * 0.1, cy); g.moveTo(cx + R * 2.1, cy - R * 0.45); g.lineTo(cx + R * 2.4, cy - R * 0.15); g.stroke();
    }
    // nostrils at the hooked tip
    poly(g, [[cx + R * 2.75, cy - R * 0.2], [cx + R * 3.0, cy - R * 0.14], [cx + R * 2.98, cy - R * 0.1], [cx + R * 2.75, cy - R * 0.15]], '#020204');
    VA.finish(c, palOf(T)); c.cx = cx; c.cy = cy; return c;
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
    ellipse(g, cx, cy, R * 0.9, R * 0.8, T.plate[2]); ellipse(g, cx + R * 0.1, cy - R * 0.2, R * 0.5, R * 0.4, T.plate[3]);
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
    c = kind === 'seg' ? paintSeg(T, R, v, stage) : kind === 'head' ? paintHead(T, R, v, stage) : kind === 'tail' ? paintTail(T, R, stage) : paintFin(T, R);
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
    { const a = b.ang || 0, jaw = (b.jaw || 0) < 0.15 ? 0 : (b.jaw || 0) < 0.42 ? 1 : 2, R = bucket(segR(0) * 1.15), s = sprite('head', stage, R, jaw), flip = Math.cos(a) < 0;
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
