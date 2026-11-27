// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 31: common ground mixed through every layer (new worlds).
//  * Patches of everyday ground break up each layer's stone so it never reads as one flat colour. They are of no
//    special use: they dig easily, drop themselves, and build.
//      New common blocks: Mud, Clay, Silt, Ash (plus the old Dirt, Gravel and Sea Sand).
//      Stalagmere's land: Dirt, Mud, Clay, Gravel      Coral: Sea Sand, Clay, Mud, Silt
//      Kelp:  Mud, Silt, Dirt, Clay                    Scald: Ash, Clay, Gravel, Mud
//      Bone:  Dirt, Clay, Gravel, Silt                 Void:  Mud, Clay, Silt, Ash
//    Each patch is a soft blob a few blocks across, only ever replacing the layer's own natural stone (never ore,
//    seals, structures or anything built), so the layer's rune progression stays as it was.
(function (RW) {
  'use strict';
  const R = RW.register, A = RW.art, L = RW.v3ringsLib, def = RW.WORLDS && RW.WORLDS.rock;
  if (!R || !def) return;
  function addTile(d) { if (RW.T[d.key] != null) return RW.T[d.key]; const id = RW.TILES.length; RW.TILES.push(Object.assign({}, d, { id })); RW.T[d.key] = id; return id; }
  const NEW = [
    ['v3c_mud', 'Mud', 'soil', ['#4a3a2e', '#5a4636', '#3a2c22'], 'Wet earth. Of no special use, but it builds.'],
    ['v3c_clay', 'Clay', 'sand', ['#9a6a52', '#ae7c62', '#7e5440'], 'Smooth, heavy clay. Of no special use, but it builds.'],
    ['v3c_silt', 'Silt', 'sand', ['#6e7a7c', '#808c8e', '#5a6466'], 'Fine grey sediment from old water. It builds.'],
    ['v3c_ash', 'Ash', 'pebble', ['#4a4446', '#5c5456', '#363032'], 'Grey ash from the vents. It builds.'],
  ];
  NEW.forEach(([key, name, tex, colors, desc]) => {
    addTile({ key, name, solid: true, hard: 1, time: 0.4, drop: key, colors, tex });
    R.item({ id: key, name, kind: 'place', place: key, stack: 99, icon: { s: 'block', a: colors[0], b: colors[2] }, desc });
  });
  if (A && A.buildTiles) { try { A.buildTiles(); } catch (e) { /* plain */ } }

  const MIX = { // by layer: 6 top, 5 coral, 4 kelp, 3 scald, 2 bone, 1 void
    6: ['dirt', 'v3c_mud', 'v3c_clay', 'gravel'], 5: ['seasand', 'v3c_clay', 'v3c_mud', 'v3c_silt'], 4: ['v3c_mud', 'v3c_silt', 'dirt', 'v3c_clay'],
    3: ['v3c_ash', 'v3c_clay', 'gravel', 'v3c_mud'], 2: ['dirt', 'v3c_clay', 'gravel', 'v3c_silt'], 1: ['v3c_mud', 'v3c_clay', 'v3c_silt', 'v3c_ash'],
  };
  function mix(out) {
    const W = out.W, H = out.H, fg = out.fg, m = out.meta, T = RW.T, seed = (m.seed || 1) + 1300, nz = (x, y, k) => RW.noise2(x, y, seed + k);
    const topNatural = new Set(['stone', 'deepstone', 'mossstone', 'lichenstone'].map((k) => T[k]).filter((v) => v != null));
    const ROCK = L.ROCK, mixIds = {}; Object.keys(MIX).forEach((j) => { mixIds[j] = MIX[j].map((k) => T[k]).filter((v) => v != null); });
    const avoid = [];
    (m.caverns || []).forEach((c) => { if (c.kind !== 'wild') avoid.push([c.cx - c.rx - 2, c.cy - c.ry - 2, c.cx + c.rx + 2, c.cy + c.ry + 2]); });
    (m.v3structs || []).forEach((q) => avoid.push([q.x - 1, q.y - 1, q.x + q.w + 1, q.y + q.h + 1]));
    (m.v3lairs || []).forEach((l) => avoid.push([l.x - l.rx - 2, l.y - l.ry - 2, l.x + l.rx + 2, l.y + l.ry + 2]));
    const blocked = (x, y) => avoid.some((q) => x >= q[0] && x <= q[2] && y >= q[1] && y <= q[3]);
    for (let y = 30; y < H - 4; y++) for (let x = 2; x < W - 2; x++) {
      const i = y * W + x, t = fg[i];
      let j;
      if (y < L.CUT) { if (!topNatural.has(t)) continue; j = 6; }
      else { const r = L.regionAt(x, y); if (r.seal || r.j < 1 || r.j > 5 || t !== ROCK[r.j]) continue; j = r.j; }
      const ids = mixIds[j]; if (!ids || !ids.length) continue;
      // four kinds, each its own blob pattern; most stone stays stone
      for (let k = 0; k < ids.length; k++) {
        const v = nz(x / (5 + k * 1.5) + k * 91, y / (4 + k) + j * 37, 40 + k);
        if (v > 0.84 - (k === 0 ? 0.02 : 0)) { if (!blocked(x, y)) fg[i] = ids[k]; break; }
      }
    }
  }
  const prevGen = def.generate;
  def.generate = function () {
    const out = prevGen.apply(this, arguments);
    try { if (out && out.meta && out.meta.v3rings && !(out.fg instanceof Uint8Array)) mix(out); } catch (e) { console.warn('v3 ground mix', e); }
    return out;
  };
})(window.RW);
