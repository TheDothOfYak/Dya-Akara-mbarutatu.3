/* ============================================================
   An Eldi Ship — a mature fire tree (Eldi Aagac) hollowed out
   into a hull. Fire never harms the wood; a living seed in the
   stern pushes it through the sky; a Stryx grown in the pilot
   stump flies it. Solar sails catch the light of Pia'don.
   ============================================================ */
import * as THREE from 'three';
import { toon, ramp, glowSprite, outlineAll } from './gfx.js';
import { mulberry32 } from './util.js';

function barkTextures() {
  const W = 256, H = 512;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const e = document.createElement('canvas'); e.width = W; e.height = H;
  const g = c.getContext('2d'), ge = e.getContext('2d');
  const rng = mulberry32(5);
  g.fillStyle = '#6b2f1e'; g.fillRect(0, 0, W, H);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) {
    const x = rng() * W, w = 2 + rng() * 7;
    g.fillStyle = rng() < 0.5 ? 'rgba(40,14,8,0.55)' : 'rgba(150,72,40,0.45)';
    g.fillRect(x, 0, w, H);
  }
  // ember seams that glow along the grain
  for (let i = 0; i < 16; i++) {
    let x = rng() * W, y = rng() * H;
    ge.strokeStyle = rng() < 0.5 ? '#ff8a2a' : '#ffc14a'; ge.lineWidth = 1.5 + rng() * 1.5;
    ge.beginPath(); ge.moveTo(x, y);
    for (let k = 0; k < 8; k++) { x += (rng() - 0.5) * 10; y += 8 + rng() * 16; ge.lineTo(x, y); }
    ge.stroke();
    g.strokeStyle = '#3a1208'; g.lineWidth = 3; g.stroke();
  }
  const map = new THREE.CanvasTexture(c), em = new THREE.CanvasTexture(e);
  map.colorSpace = em.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = em.wrapS = em.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 1); em.repeat.set(3, 1);
  return { map, em };
}

function sailGeometry(w, h, curve) {
  const g = new THREE.PlaneGeometry(w, h, 10, 8);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, curve * (1 - (x / (w / 2)) ** 2) * (0.6 + 0.4 * (1 - Math.abs(y) / (h / 2))));
  }
  g.computeVertexNormals();
  return g;
}

let TEX = null;

export function buildEldiShip(opts = {}) {
  const S = opts.scale || 1;
  if (!TEX) TEX = barkTextures();
  const grp = new THREE.Group();
  const body = new THREE.Group(); grp.add(body);

  const bark = new THREE.MeshToonMaterial({ color: 0xffffff, map: TEX.map, emissive: 0xffffff, emissiveMap: TEX.em, emissiveIntensity: 1.4, gradientMap: ramp() });

  // hull: a tapering log, scaled flat-ish
  const prof = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20, r = Math.sin(Math.PI * Math.pow(t, 0.85)) * 3.6 + (t > 0.9 ? 0 : 0.1);
    prof.push(new THREE.Vector2(Math.max(0.05, r), (t - 0.5) * 26));
  }
  const hullGeo = new THREE.LatheGeometry(prof, 28);
  const hull = new THREE.Mesh(hullGeo, bark);
  hull.rotation.x = Math.PI / 2; hull.scale.set(1, 1, 0.78);
  body.add(hull);

  const plank = toon(0xa8774a);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.35, 19), plank);
  deck.position.y = 1.75; body.add(deck);
  // gunwale rails
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 17), toon(0x5a2a18));
    rail.position.set(s * 2.75, 2.2, 0); body.add(rail);
  }
  // raised quarterdeck at the stern
  const qd = new THREE.Mesh(new THREE.BoxGeometry(5, 1.1, 5), plank);
  qd.position.set(0, 2.3, 7); body.add(qd);

  // root tendrils curling off the bow like a figurehead
  const rootMat = toon(0x4e2216);
  for (let k = 0; k < 3; k++) {
    const pts = [new THREE.Vector3(0, 1 + k * 0.3, -12), new THREE.Vector3((k - 1) * 1.2, 2.5 + k, -15), new THREE.Vector3((k - 1) * 2.2, 5 + k * 0.6, -16.5), new THREE.Vector3((k - 1) * 1.4, 6.5 + k * 0.4, -15)];
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.32 - k * 0.06, 6), rootMat);
    body.add(tube);
  }

  // masts and solar sails
  const mastMat = toon(0x4a2414);
  const sailMat = new THREE.MeshBasicMaterial({ color: 0xffc56a, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
  const sails = [];
  [[-3.5, 15, 7.5], [3.2, 12, 6]].forEach(([z, h, w]) => {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, h, 8), mastMat);
    mast.position.set(0, 1.8 + h / 2, z); body.add(mast);
    for (let k = 0; k < 2; k++) {
      const sh = h * 0.36, sy = 1.8 + h * (0.42 + k * 0.38);
      const sail = new THREE.Mesh(sailGeometry(w * (1 - k * 0.25), sh, 1.2), sailMat);
      sail.position.set(0, sy, z + 0.3); sail.userData.noOutline = true;
      body.add(sail); sails.push(sail);
      const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, w * (1 - k * 0.25) + 0.6, 6), mastMat);
      yard.rotation.z = Math.PI / 2; yard.position.set(0, sy + sh / 2, z + 0.2); body.add(yard);
    }
  });
  // wing sails reaching out sideways
  for (const s of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(8, 1.2); shape.quadraticCurveTo(6, -2.5, 0, -3.4); shape.lineTo(0, 0);
    const wing = new THREE.Mesh(new THREE.ShapeGeometry(shape, 10), sailMat);
    wing.rotation.x = -Math.PI / 2; wing.rotation.z = s < 0 ? Math.PI : 0;
    wing.position.set(s * 2.6, 2.1, 1.5); wing.scale.y = s;
    wing.userData.noOutline = true; wing.userData.side = s;
    body.add(wing); sails.push(wing);
    const spar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 8.2, 6), mastMat);
    spar.rotation.z = Math.PI / 2; spar.position.set(s * 6.6, 2.15, 1.5); body.add(spar);
  }

  // a crown of fire-leaves atop the main mast — the tree is still alive
  const leafMat = new THREE.MeshToonMaterial({ color: 0xff7a2a, emissive: 0xff4a10, emissiveIntensity: 0.7, gradientMap: ramp() });
  const rng = mulberry32(11);
  for (let i = 0; i < 9; i++) {
    const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7 + rng() * 0.6, 0), leafMat);
    l.position.set((rng() - 0.5) * 2.4, 17.4 + rng() * 1.6, -3.5 + (rng() - 0.5) * 2.4);
    body.add(l);
  }

  // the seed engine in the stern
  const seed = new THREE.Mesh(new THREE.SphereGeometry(1.5, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
  seed.position.set(0, 1.2, 13.2); seed.userData.noOutline = true; body.add(seed);
  const seedGlow = glowSprite(0xff9a3a, 9, 0.9); seedGlow.position.copy(seed.position); body.add(seedGlow);
  const seedRing = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.28, 8, 24), mastMat);
  seedRing.position.copy(seed.position); body.add(seedRing);

  // pilot stump and the Stryx grown in it
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 1.2, 9), toon(0x5b3220));
  stump.position.set(0, 3.4, 8.2); body.add(stump);
  const stryx = new THREE.Group();
  const sBody = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.4, 7), toon(0x6e8a3a)); sBody.position.y = 0.7; stryx.add(sBody);
  const sHead = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), toon(0x7d9c44)); sHead.position.y = 1.55; stryx.add(sHead);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 5), toon(0xd8b060)); beak.rotation.x = -Math.PI / 2; beak.position.set(0, 1.5, -0.5); stryx.add(beak);
  for (const s of [-1, 1]) { const eye = glowSprite(0xbfffd0, 0.35); eye.position.set(s * 0.17, 1.62, -0.36); stryx.add(eye); }
  stryx.position.set(0, 4, 8.2); body.add(stryx);
  // ship's wheel
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.08, 6, 16), mastMat);
  wheel.position.set(0, 4.2, 7.4); body.add(wheel);

  // lanterns hanging along the rails
  const lanterns = [];
  for (const z of [-7, -1, 5]) for (const s of [-1, 1]) {
    const l = glowSprite(0xffb050, 1.6); l.position.set(s * 2.8, 3.1, z); body.add(l); lanterns.push(l);
  }

  // rigging
  const rig = [];
  [[-3.5, 16.5], [3.2, 13.5]].forEach(([z, top]) => {
    for (const s of [-1, 1]) { rig.push(0, top, z, s * 2.7, 2.4, z - 3, 0, top, z, s * 2.7, 2.4, z + 3); }
  });
  rig.push(0, 16.5, -3.5, 0, 6.5, -15, 0, 16.5, -3.5, 0, 13.5, 3.2, 0, 13.5, 3.2, 0, 4, 9);
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rig, 3));
  body.add(new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x2a1408 })));

  outlineAll(body, 0.05);
  body.traverse(o => { if (o.isMesh && o.name !== 'outline' && !o.userData.noOutline) { o.castShadow = true; o.receiveShadow = true; } });
  grp.scale.setScalar(S);

  return {
    group: grp,
    deckHeight: 1.92 * S,
    update(t, dt, particles) {
      body.position.y = Math.sin(t * 0.9) * 0.35;
      body.rotation.z = Math.sin(t * 0.7) * 0.025;
      body.rotation.x = Math.sin(t * 0.55) * 0.012;
      const f = 0.85 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.07;
      seedGlow.scale.setScalar(9 * f); seed.scale.setScalar(0.95 + f * 0.05);
      sails.forEach((s, i) => { s.scale.z = s.userData.side ? 1 : 1 + Math.sin(t * 1.6 + i) * 0.12; });
      lanterns.forEach((l, i) => l.material.opacity = 0.75 + Math.sin(t * 5 + i * 1.7) * 0.2);
      stryx.rotation.y = Math.sin(t * 0.6) * 0.5; sHead.rotation.z = Math.sin(t * 1.3) * 0.15;
      if (particles && Math.random() < 0.7) {
        const wp = seed.getWorldPosition(new THREE.Vector3());
        const back = new THREE.Vector3(0, 0, 1).applyQuaternion(grp.quaternion);
        particles.emit(wp.x + back.x * 1.5 * S, wp.y, wp.z + back.z * 1.5 * S, {
          vx: back.x * 6 + (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.3) * 1.2, vz: back.z * 6 + (Math.random() - 0.5) * 1.5,
          color: Math.random() < 0.5 ? 0xff8a30 : 0xffd070, size: 1.2 * S, life: 1.2, drag: 0.6,
        });
      }
    },
  };
}
