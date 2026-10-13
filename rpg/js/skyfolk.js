/* ============================================================
   THE FOLK OF THE SKY — Xwi (Angels) and Snillers — and the war
   they fought in the air above the last Skyfall.

   Neither one is ever quite solid. An Angel is a burning shape of
   light: veils of it for a robe, wings made of long soft feathers
   of glow, a face you can't look straight at. A Sniller is a
   storm-genie: a spinning funnel of grey wind below the waist, a
   torso of vine-like tendrils sweeping out into arms that end in
   more tendrils (never hands), one head, one cold teal eye. No
   ink lines on either: they're light and weather, not things.

   Both have setVis(v): at 0.1 you see colour and glow and motion
   and not much else; at 1 you see the whole of it. The sky war
   keeps them low, and now and then lets one through — a glimpse.
   ============================================================ */
import * as THREE from 'three';
import { toon, ramp, glowSprite } from './gfx.js';

const TAU = Math.PI * 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/* ---------------- soft textures ---------------- */
const TEX = {};
function canvasTex(key, w, h, draw) {
  if (TEX[key]) return TEX[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; TEX[key] = t; return t;
}
/* a long feather of light: bright along its shaft, fading to nothing at the edges and tip */
const featherTex = () => canvasTex('feather', 64, 256, (g, w, h) => {
  for (let y = 0; y < h; y++) {
    const k = y / h, width = Math.sin(Math.min(1, k * 1.2) * Math.PI * 0.5) * (1 - k * 0.55);
    const grd = g.createLinearGradient(0, 0, w, 0);
    const a = (1 - k) * 0.95;
    grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.5 - width * 0.45, 'rgba(255,255,255,0)');
    grd.addColorStop(0.5, `rgba(255,255,255,${a})`);
    grd.addColorStop(0.5 + width * 0.45, 'rgba(255,255,255,0)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, y, w, 1);
  }
});
/* a veil: bright at the top, falling away to nothing, with streaks */
const veilTex = () => canvasTex('veil', 128, 256, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, 'rgba(255,255,255,0.95)'); grd.addColorStop(0.45, 'rgba(255,255,255,0.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(0,0,0,${0.2 + Math.random() * 0.5})`; g.fillRect(Math.random() * w, h * 0.2 + Math.random() * h * 0.5, 2 + Math.random() * 5, h); }
});
/* storm streaks for a Sniller's funnel */
const swirlTex = () => {
  const t = canvasTex('swirl', 128, 256, (g, w, h) => {
    g.fillStyle = '#8fa2a8'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) {
      const y = Math.random() * h, ww = 20 + Math.random() * 70, hh = 2 + Math.random() * 6;
      g.fillStyle = Math.random() < 0.5 ? 'rgba(40,62,70,0.7)' : 'rgba(220,245,245,0.55)';
      for (const ox of [0, -w]) { g.save(); g.translate(Math.random() * w + ox, y); g.rotate(-0.42); g.fillRect(-ww / 2, -hh / 2, ww, hh); g.restore(); }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1); return t;
};
const noFog = s => { s.material.fog = false; return s; };
const add = (color, map, opacity = 1) => new THREE.MeshBasicMaterial({ color, map, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });

/* every model keeps a list of [material, its full opacity] so setVis can scale them */
function visKit() {
  const list = [];
  return {
    reg(m, base = m.opacity != null ? m.opacity : 1) { m.transparent = true; list.push([m, base]); return m; },
    set(v) { for (const [m, b] of list) { m.opacity = b * v; m.depthWrite = v > 0.97 && m.blending !== THREE.AdditiveBlending && b >= 0.9; m.visible = v > 0.01; } },
  };
}

/* ================================================================
   A Xwi: a tall burning shape of white and gold
   ================================================================ */
export function buildAngel(s = 1) {
  const g = new THREE.Group(), vis = visKit();
  const gold = 0xffe0a0, white = 0xfff6e4;
  // the robe: three veils of light, one inside the other, slowly turning
  const veils = [];
  for (let k = 0; k < 3; k++) {
    const prof = []; for (let i = 0; i <= 10; i++) { const y = i / 10; prof.push(new THREE.Vector2(0.18 + Math.pow(1 - y, 1.6) * (0.85 - k * 0.18), y * 3.4)); }
    const m = new THREE.Mesh(new THREE.LatheGeometry(prof, 18), vis.reg(add(k ? gold : white, veilTex(), 0.55 - k * 0.12)));
    m.rotation.x = Math.PI; m.position.y = 3.6; g.add(m); veils.push(m);   // bright at the shoulders, fading to the hem
  }
  // trailing streamers below
  const streamers = [];
  for (let k = 0; k < 6; k++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 2.6), vis.reg(add(gold, featherTex(), 0.55)));
    p.position.set(Math.cos(k) * 0.4, 0.2, Math.sin(k) * 0.3); p.rotation.z = Math.PI; g.add(p); streamers.push(p);
  }
  // the head: you can't look straight at it
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), vis.reg(add(white, null, 0.6))); face.position.y = 3.95; g.add(face);
  const faceGlow = noFog(glowSprite(0xfff4d0, 2.2, 0.95)); faceGlow.position.y = 3.95; g.add(faceGlow);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.035, 6, 32), vis.reg(add(0xffe08a, null, 0.85))); halo.rotation.x = Math.PI / 2.4; halo.position.y = 4.4; g.add(halo);
  // wings: fans of long feathers of light, nine a side
  const wings = [];
  for (const side of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(side * 0.25, 3.3, -0.25); g.add(piv);
    const feathers = [];
    for (let i = 0; i < 9; i++) {
      const len = 2.2 + Math.sin(i / 8 * Math.PI) * 2.4, f = new THREE.Mesh(new THREE.PlaneGeometry(0.75, len), vis.reg(add(i % 3 ? gold : white, featherTex(), 0.7)));
      f.geometry.translate(0, -len / 2, 0);   // pivot at the root
      const holder = new THREE.Group(); holder.rotation.z = side * (0.45 + i * 0.2) + Math.PI; holder.add(f); piv.add(holder);
      feathers.push(holder);
    }
    wings.push({ piv, feathers, side });
  }
  const glow = noFog(glowSprite(0xfff0c0, 7, 0.55)); glow.position.y = 2.6; g.add(glow);
  const core = noFog(glowSprite(0xffffff, 3, 0.8)); core.position.y = 3.1; g.add(core);
  g.scale.setScalar(s);
  let v = 1;
  g.userData = {
    wings, glow, halo, ph: Math.random() * TAU, kind: 'angel', color: 0xffe0a0,
    setVis(x) { v = x; vis.set(x); glow.material.opacity = 0.35 + 0.3 * x; core.material.opacity = 0.5 + 0.4 * x; faceGlow.material.opacity = 0.4 + 0.6 * x; },
  };
  g.userData.tick = (t, beat = 1) => {
    const ph = g.userData.ph, f = Math.sin(t * 2.6 * beat + ph);
    wings.forEach(w => {
      w.piv.rotation.y = w.side * (0.35 + f * 0.45); w.piv.rotation.x = -0.2 + f * 0.12;
      w.feathers.forEach((h, i) => { h.rotation.y = Math.sin(t * 3 + i * 0.6 + ph) * 0.12; });
    });
    veils.forEach((m, k) => { m.rotation.y = t * (0.25 + k * 0.2) * (k % 2 ? -1 : 1); m.scale.set(1 + Math.sin(t * 2 + k) * 0.05, 1, 1 + Math.cos(t * 2.3 + k) * 0.05); });
    streamers.forEach((p, k) => { p.rotation.x = Math.sin(t * 2.2 + k) * 0.35; p.rotation.y = t * 0.6 + k; });
    halo.rotation.z = t; core.material.opacity = (0.5 + 0.4 * v) * (0.85 + Math.sin(t * 9 + ph) * 0.15);
  };
  g.userData.setVis(1);
  return g;
}

/* ================================================================
   A Sniller: a storm-genie. No hard lines anywhere.
   ================================================================ */
function tendril(points, r0, r1, mat) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const geo = new THREE.TubeGeometry(curve, 18, 1, 6, false);
  const pos = geo.attributes.position, n = 19, ring = 7, c = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1), r = r0 + (r1 - r0) * k; curve.getPointAt(k, c);
    for (let j = 0; j < ring; j++) { const q = i * ring + j; pos.setXYZ(q, c.x + (pos.getX(q) - c.x) * r, c.y + (pos.getY(q) - c.y) * r, c.z + (pos.getZ(q) - c.z) * r); }
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}
export function buildSniller(s = 1) {
  const g = new THREE.Group(), vis = visKit();
  const teal = 0x6af0e0;
  const vine = vis.reg(toon(0x3a5a58, { emissive: 0x0a3a3a, emissiveIntensity: 0.55 }), 0.92);
  const vineFaint = vis.reg(add(0x2ad0c8, null, 0.22));
  // the tornado
  const fun = []; for (let i = 0; i <= 12; i++) { const k = i / 12; fun.push(new THREE.Vector2(0.12 + Math.pow(k, 1.7) * 1.05, k * 2.6)); }
  const funnelMat = vis.reg(new THREE.MeshToonMaterial({ color: 0xffffff, map: swirlTex(), gradientMap: ramp(), side: THREE.DoubleSide, emissive: 0x0e3036, emissiveIntensity: 0.45 }), 0.75);
  const funnel = new THREE.Mesh(new THREE.LatheGeometry(fun, 20), funnelMat); funnel.position.y = -0.4; g.add(funnel);
  const inner = new THREE.Mesh(new THREE.LatheGeometry(fun.map(q => new THREE.Vector2(q.x * 0.7, q.y)), 14), vis.reg(add(0x2ad0c8, null, 0.3))); inner.position.y = -0.4; g.add(inner);
  const rings = [], ringMat = vis.reg(add(0xcfeeee, null, 0.4));
  for (let i = 0; i < 6; i++) {
    const k = (i + 0.5) / 6, rr = 0.2 + Math.pow(k, 1.7) * 1.15;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.035 + k * 0.03, 4, 18, Math.PI * (1.1 + Math.random() * 0.6)), ringMat);
    ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.25; ring.position.y = -0.4 + k * 2.6; g.add(ring); rings.push(ring);
  }
  const grit = vis.reg(toon(0x4a5e66), 0.9), debris = [];
  for (let i = 0; i < 9; i++) { const d = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06 + Math.random() * 0.06, 0), grit); d.userData = { a: Math.random() * TAU, y: Math.random() * 2.2, r: 0.4 + Math.random() * 0.8, sp: 2 + Math.random() * 3 }; g.add(d); debris.push(d); }
  // the torso: vines out of the storm, sweeping to the shoulders
  const torso = new THREE.Group(); torso.position.y = 2.1; g.add(torso);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), vine); core.scale.set(1.1, 1.3, 0.7); core.position.y = 0.2; torso.add(core);
  for (let i = 0; i < 12; i++) {
    const side = i % 2 ? 1 : -1, o = (Math.floor(i / 2) / 5 - 0.5) * 0.6, z = ((i * 7) % 3 - 1) * 0.14;
    torso.add(tendril([[o * 0.5, -0.75, z], [o * 0.6, 0.0, z + 0.1], [o + side * 0.2, 0.6, z + 0.06], [side * (0.55 + Math.abs(o) * 0.4), 1.08, z], [side * 0.95, 1.22, z - 0.05]], 0.12, 0.07, i % 3 ? vine : vineFaint));
  }
  for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; torso.add(tendril([[Math.cos(a) * 0.22, 0.9, Math.sin(a) * 0.12], [Math.cos(a + 0.8) * 0.12, 1.3, Math.sin(a + 0.8) * 0.1], [Math.cos(a + 1.6) * 0.1, 1.6, Math.sin(a + 1.6) * 0.08]], 0.07, 0.05, vine)); }
  const puffs = [], puffMat = vis.reg(new THREE.MeshToonMaterial({ color: 0x7a8c92, gradientMap: ramp(), emissive: 0x0e2a30, emissiveIntensity: 0.35 }), 0.7);
  for (let k = 0; k < 9; k++) { const a = k / 9 * TAU, pf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25 + (k % 3) * 0.06, 2), puffMat); pf.userData.a = a; pf.position.set(Math.cos(a) * 0.95, -0.15 + (k % 2) * 0.12, Math.sin(a) * 0.95); torso.add(pf); puffs.push(pf); }
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * 0.95, 1.2, 0); torso.add(arm); arms.push(arm);
    for (let k = 0; k < 3; k++) { const tw = (k - 1) * 0.08; arm.add(tendril([[0, 0, tw], [side * 0.5, -0.05 + tw, 0.1], [side * 1.0, -0.35, -tw], [side * 1.35, -0.75 + tw, 0.05]], 0.1, 0.07, vine)); }
    const fray = new THREE.Group(); fray.position.set(side * 1.35, -0.75, 0.05); arm.add(fray);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6 - 0.5) * 1.6, len = 0.8 + Math.random() * 0.7;
      fray.add(tendril([[0, 0, 0], [side * 0.3, -0.25, Math.sin(a) * 0.2], [side * (0.45 + len * 0.3), -0.55 - len * 0.3, Math.sin(a) * 0.5], [side * (0.5 + len * 0.45), -0.7 - len * 0.6, Math.sin(a) * 0.75 + 0.1]], 0.06, 0.012, k % 2 ? vine : vineFaint));
    }
    arm.userData.fray = fray;
  }
  for (const side of [-1, 1]) {   // insubstantial armour: a faint plate of cold light on each shoulder
    const plate = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 6, 0, TAU, 0, Math.PI / 2.4), vis.reg(add(teal, null, 0.22)));
    plate.position.set(side * 0.85, 1.28, 0); plate.rotation.z = -side * 0.6; torso.add(plate);
  }
  const head = new THREE.Group(); head.position.y = 1.75; torso.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), vine); skull.scale.set(0.95, 1.15, 0.9); head.add(skull);
  for (let k = 0; k < 5; k++) { const a = (k / 4 - 0.5) * 1.4; head.add(tendril([[Math.sin(a) * 0.2, 0.3, -0.1], [Math.sin(a) * 0.35, 0.55, -0.45], [Math.sin(a) * 0.5, 0.45, -0.95], [Math.sin(a) * 0.6, 0.15, -1.35]], 0.07, 0.015, vineFaint)); }
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), new THREE.MeshBasicMaterial({ color: 0xd8fffa })); eye.scale.set(1.25, 0.8, 0.5); eye.position.set(0, 0.06, 0.37); head.add(eye);
  const eyeGlow = noFog(glowSprite(teal, 1.6, 0.9)); eyeGlow.position.copy(eye.position); head.add(eyeGlow);
  const glow = noFog(glowSprite(0x5af0e0, 6.5, 0.45)); glow.position.y = 2.2; g.add(glow);
  const storm = noFog(glowSprite(0x9ab8c0, 5, 0.3)); storm.position.y = 0.8; g.add(storm);
  g.scale.setScalar(s);
  let v = 1;
  g.userData = {
    gem: eye, body: funnel, tendrils: arms, glow, ph: Math.random() * TAU, kind: 'sniller', color: teal,
    setVis(x) { v = x; vis.set(x); glow.material.opacity = 0.35 + 0.25 * x; storm.material.opacity = 0.25 + 0.15 * x; eyeGlow.material.opacity = 0.6 + 0.4 * x; },
  };
  g.userData.tick = (t, beat = 1) => {
    const ph = g.userData.ph;
    funnelMat.map.offset.x = -t * 1.6; funnel.rotation.y = t * 0.6 * beat; inner.rotation.y = -t * 2.2;
    rings.forEach((r, i) => { r.rotation.z = t * (3 + i * 0.7); r.position.x = Math.sin(t * 3 + i) * 0.06 * i; });
    debris.forEach(d => { const u = d.userData; u.a += u.sp * 0.016; d.position.set(Math.cos(u.a) * u.r, -0.2 + u.y + Math.sin(t + u.a) * 0.2, Math.sin(u.a) * u.r); });
    funnel.position.x = Math.sin(t * 1.7 + ph) * 0.12; funnel.position.z = Math.cos(t * 1.3 + ph) * 0.12;
    torso.position.y = 2.1 + Math.sin(t * 1.4 + ph) * 0.1;
    arms.forEach((a, i) => { const sd = i ? 1 : -1; a.rotation.z = sd * (Math.sin(t * 1.1 + ph + i) * 0.22); a.rotation.y = Math.sin(t * 0.8 + i * 2) * 0.25; a.userData.fray.rotation.x = Math.sin(t * 2.3 + i) * 0.45; });
    head.rotation.y = Math.sin(t * 0.6 + ph) * 0.3;
    puffs.forEach((pf, k) => { const a = pf.userData.a + t * 1.8; pf.position.x = Math.cos(a) * 0.95; pf.position.z = Math.sin(a) * 0.95; pf.scale.setScalar(1 + Math.sin(t * 4 + k) * 0.12); });
    eyeGlow.material.opacity = (0.6 + 0.4 * v) * (0.8 + Math.sin(t * 6 + ph) * 0.2);
    glow.material.opacity = (0.35 + 0.25 * v) * (0.85 + Math.sin(t * 9 + ph) * 0.15);
  };
  g.userData.setVis(1);
  return g;
}

/* ================================================================
   THE SKY WAR: Angels and Snillers wheeling, darting, blinking in and
   out of the world. You mostly see light — gold and teal streaks,
   flashes, beams — and now and then the shape behind it.
   opts: { scene, particles, center: V3, spread: [x, y, z], count, size: [min, max],
           vis (base visibility, default 0.12), onBlink(pos), onStrike(pos) }
   ================================================================ */
export function createSkyWar(o) {
  const { scene, particles } = o, C = o.center.clone(), SP = o.spread || [140, 30, 100];
  const rnd = Math.random, base = o.vis ?? 0.12;
  const fighters = [], flashes = [], beams = [];
  const beamGeo = new THREE.CylinderGeometry(0.3, 0.3, 1, 6, 1, true); beamGeo.translate(0, 0.5, 0); beamGeo.rotateX(Math.PI / 2);
  const pick = () => V3(C.x + (rnd() - 0.5) * SP[0], C.y + (rnd() - 0.5) * SP[1], C.z + (rnd() - 0.5) * SP[2]);
  function flash(p, size, color, life = 0.5) {
    const s = glowSprite(color, 1, 1); s.material.fog = false; s.position.copy(p); scene.add(s); flashes.push({ s, size, life, t: 0 });
  }
  function beam(a, b, color) {
    const m = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    m.position.copy(a); m.lookAt(b); m.scale.set(1, 1, a.distanceTo(b)); scene.add(m); beams.push({ m, t: 0, life: 0.35 });
  }
  for (let i = 0; i < (o.count || 9); i++) {
    const angel = i % 2 === 0, sz = (o.size || [2.4, 3.6]), s = sz[0] + rnd() * (sz[1] - sz[0]);
    const m = angel ? buildAngel(s) : buildSniller(s);
    m.userData.setVis(base); scene.add(m);
    const home = pick();
    fighters.push({ m, angel, home, pos: home.clone(), vel: V3(), yaw: 0, roll: 0,
      fr: [0.3 + rnd() * 0.4, 0.4 + rnd() * 0.5, 0.25 + rnd() * 0.4], ph: [rnd() * TAU, rnd() * TAU, rnd() * TAU], amp: [10 + rnd() * 14, 4 + rnd() * 6, 8 + rnd() * 12],
      dash: null, dashCd: 1 + rnd() * 3, act: rnd() * 2, vis: base, glimpse: 0, glimpseCd: 2 + rnd() * 6, gone: 0 });
  }
  const tmp = V3(), want = V3();
  return {
    fighters, flash, beam,
    /* force one into full view for a while */
    reveal(f, dur = 1.2) { f.glimpse = dur; },
    update(dt, t, focus) {
      for (const f of fighters) {
        const m = f.m;
        if (f.gone > 0) {   // blinked out of the world
          f.gone -= dt;
          if (f.gone <= 0) { f.home.copy(pick()); f.pos.copy(f.home); m.visible = true; flash(V3(f.pos.x, f.pos.y + 6, f.pos.z), 24, f.angel ? 0xfff0c0 : 0x6af0e0, 0.45); o.onBlink && o.onBlink(f.pos); }
          continue;
        }
        // fluid flight: a slow wandering figure-eight around home, and every so often a dash to somewhere else
        f.dashCd -= dt;
        if (!f.dash && f.dashCd <= 0) { f.dash = { from: f.home.clone(), to: pick(), t: 0, dur: 0.6 + rnd() * 0.6 }; f.dashCd = 2 + rnd() * 4; }
        if (f.dash) { f.dash.t += dt; const k = Math.min(1, f.dash.t / f.dash.dur), e = k * k * (3 - 2 * k); f.home.lerpVectors(f.dash.from, f.dash.to, e); if (k >= 1) f.dash = null; }
        want.set(f.home.x + Math.sin(t * f.fr[0] + f.ph[0]) * f.amp[0], f.home.y + Math.sin(t * f.fr[1] + f.ph[1]) * f.amp[1], f.home.z + Math.sin(t * f.fr[2] * 2 + f.ph[2]) * f.amp[2] * 0.6);
        tmp.copy(f.pos); f.pos.lerp(want, 1 - Math.exp(-(f.dash ? 7 : 2.2) * dt));
        f.vel.copy(f.pos).sub(tmp).divideScalar(Math.max(dt, 1e-4));
        const sp = f.vel.length();
        if (sp > 0.5) {
          const ny = Math.atan2(f.vel.x, f.vel.z), dyaw = Math.atan2(Math.sin(ny - f.yaw), Math.cos(ny - f.yaw));
          f.yaw += dyaw * Math.min(1, dt * 4); f.roll += (-dyaw * 1.4 - f.roll) * Math.min(1, dt * 3);
        }
        m.position.copy(f.pos); m.rotation.set(Math.max(-0.5, Math.min(0.5, -f.vel.y * 0.02)) + Math.min(0.6, sp * 0.012), f.yaw, Math.max(-0.7, Math.min(0.7, f.roll)));
        m.userData.tick(t, 1 + Math.min(1.5, sp * 0.03));
        // colour, mostly: a streak of light behind each one
        const c = f.angel ? (rnd() < 0.5 ? 0xffe8a8 : 0xfff6e0) : (rnd() < 0.5 ? 0x5af0e0 : 0x9ab8c0);
        for (let k = 0; k < (f.dash ? 4 : 2); k++) particles.emit(f.pos.x + (rnd() - 0.5) * 2, f.pos.y + 3 + (rnd() - 0.5) * 4, f.pos.z + (rnd() - 0.5) * 2, { vx: -f.vel.x * 0.1, vy: (rnd() - 0.5) * 2, vz: -f.vel.z * 0.1, color: c, size: 1.4 + rnd() * 1.6, life: 0.7, drag: 1.5 });
        // a glimpse: now and then the shape comes through, and goes again
        f.glimpseCd -= dt;
        if (f.glimpseCd <= 0 && f.glimpse <= 0) { f.glimpseCd = 4 + rnd() * 8; if (rnd() < 0.45) f.glimpse = 0.5 + rnd() * 0.7; }
        if (f.glimpse > 0) f.glimpse -= dt;
        const wantVis = f.glimpse > 0 ? 0.92 : base;
        const was = f.vis; f.vis += (wantVis - f.vis) * Math.min(1, dt * (wantVis > f.vis ? 9 : 2.5));
        if (was < 0.5 && f.vis >= 0.5) flash(V3(f.pos.x, f.pos.y + 3, f.pos.z), 14, 0xffffff, 0.3);
        m.userData.setVis(f.vis);
        // fighting: blink out, or strike at a foe
        f.act -= dt;
        if (f.act <= 0) {
          f.act = 0.7 + rnd() * 2.4;
          if (rnd() < 0.35) {
            flash(V3(f.pos.x, f.pos.y + 4, f.pos.z), 22, f.angel ? 0xfff0c0 : 0x6af0e0, 0.4);
            particles.burst(f.pos.x, f.pos.y + 4, f.pos.z, 30, { color: f.angel ? 0xffe0a0 : 0x6af0e0, speed: 18, size: 1.4, life: 0.9, drag: 1 });
            m.visible = false; f.gone = 0.25 + rnd() * 1.2; o.onBlink && o.onBlink(f.pos);
          } else {
            const foe = fighters.find(q => q.angel !== f.angel && q.gone <= 0 && rnd() < 0.5) || fighters.find(q => q.angel !== f.angel && q.gone <= 0);
            if (foe) { const a = V3(f.pos.x, f.pos.y + 3.5, f.pos.z), b = V3(foe.pos.x, foe.pos.y + 3.5, foe.pos.z); beam(a, b, f.angel ? 0xffe8a8 : 0x5af0e0); flash(b, 14, 0xffffff, 0.3); o.onStrike && o.onStrike(b); }
          }
        }
      }
      for (let i = flashes.length - 1; i >= 0; i--) { const f = flashes[i]; f.t += dt; const k = f.t / f.life; f.s.scale.setScalar(f.size * (0.4 + k)); f.s.material.opacity = Math.max(0, 1 - k); if (k >= 1) { scene.remove(f.s); flashes.splice(i, 1); } }
      for (let i = beams.length - 1; i >= 0; i--) { const b = beams[i]; b.t += dt; b.m.material.opacity = Math.max(0, 0.9 * (1 - b.t / b.life)); if (b.t >= b.life) { scene.remove(b.m); b.m.material.dispose(); beams.splice(i, 1); } }
    },
    dispose() { for (const f of fighters) scene.remove(f.m); },
  };
}
