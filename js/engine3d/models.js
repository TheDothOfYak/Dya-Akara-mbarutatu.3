/* ============================================================
   DYA'AKARA — engine3d/models.js            (3D battle preview)
   Procedural 3D creature models, one builder per sprite rig.

   Every model is built in "r-units" (r = 1 is the creature's body
   radius), facing +X, standing on y = 0. The renderer scales and
   turns the root to place it on the field.

   Each model returns { root, update(st) } where st carries the
   live animation inputs (state, time, speed, alpha, shimmer…).
   Materials share per-creature uniforms so the design doc's
   shader treatments — magical shimmer, bioluminescence, tether
   fade, hit flash — run on the GPU.
   ============================================================ */
(function () {
  'use strict';
  if (!window.THREE) return;
  const THREE = window.THREE;
  const TAU = Math.PI * 2;
  const M3 = {};
  DYA.models3d = M3;

  /* ---------------- shared unit geometries ---------------- */
  const G = {};
  function geo(key, make) { return G[key] || (G[key] = make()); }
  const SPH = () => geo('sph', () => new THREE.SphereGeometry(1, 24, 16));
  const SPH_LO = () => geo('sphlo', () => new THREE.SphereGeometry(1, 12, 8));
  const HEMI = () => geo('hemi', () => new THREE.SphereGeometry(1, 24, 12, 0, TAU, 0, Math.PI / 2));
  const CYL = () => geo('cyl', () => new THREE.CylinderGeometry(1, 1, 1, 14));
  const CONE = () => geo('cone', () => { const g = new THREE.ConeGeometry(1, 1, 14); g.translate(0, 0.5, 0); return g; });
  const BOX = () => geo('box', () => new THREE.BoxGeometry(1, 1, 1));
  /* limb: a capsule hanging down from its pivot, total length 1 */
  const LIMB = () => geo('limb', () => { const g = new THREE.CapsuleGeometry(0.5, 1, 4, 10); g.scale(1, 0.5, 1); g.translate(0, -0.5, 0); return g; });
  /* bone: a capsule pointing up +Y from its pivot, length 1 */
  const BONE = () => geo('bone', () => { const g = new THREE.CapsuleGeometry(0.5, 1, 4, 10); g.scale(1, 0.5, 1); g.translate(0, 0.5, 0); return g; });

  function hash(n) { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); }

  /* ribbed pumpkin body (Punk family) */
  function pumpkinGeo(ribs) {
    return geo('pumpkin' + ribs, () => {
      const g = new THREE.SphereGeometry(1, 40, 24);
      const p = g.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const phi = Math.atan2(v.z, v.x);
        const lobe = 1 + 0.085 * Math.cos(ribs * phi);
        const pole = 1 - 0.18 * Math.pow(Math.abs(v.y), 6);
        v.x *= lobe * pole; v.z *= lobe * pole; v.y *= 0.82;
        p.setXYZ(i, v.x, v.y, v.z);
      }
      g.computeVertexNormals();
      return g;
    });
  }
  /* lumpy rock (Gynge, Stryx armor, field rocks) */
  function rockGeo(seed) {
    return geo('rock' + (seed % 6), () => {
      const g = new THREE.IcosahedronGeometry(1, 2);
      const p = g.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).normalize();
        const n = Math.sin(v.x * 3.1 + seed) * Math.cos(v.z * 2.7 + seed * 1.7) * 0.5 + Math.sin(v.y * 5.3 + seed * 0.3) * 0.25;
        const k = 1 + n * 0.22 + (hash(Math.round(v.x * 40) * 7 + Math.round(v.y * 40) * 13 + Math.round(v.z * 40) * 17 + seed) - 0.5) * 0.08;
        p.setXYZ(i, v.x * k, v.y * k, v.z * k);
      }
      g.computeVertexNormals();
      return g;
    });
  }
  M3.rockGeo = rockGeo;
  /* membrane wing in the XZ plane, span along +Z (root at origin) */
  function wingGeo(kind) {
    return geo('wing' + kind, () => {
      const s = new THREE.Shape();
      if (kind === 'bat') {
        s.moveTo(0.25, 0); s.lineTo(0.5, 0.35); s.lineTo(0.15, 1.05); s.quadraticCurveTo(0.02, 0.8, -0.2, 0.86);
        s.quadraticCurveTo(-0.22, 0.6, -0.42, 0.58); s.quadraticCurveTo(-0.34, 0.32, -0.45, 0.2); s.lineTo(-0.3, 0);
      } else if (kind === 'butterfly') {
        s.moveTo(0, 0); s.bezierCurveTo(0.7, 0.2, 0.8, 1.0, 0.25, 1.0); s.bezierCurveTo(0.05, 0.95, 0.0, 0.6, -0.05, 0.5);
        s.bezierCurveTo(-0.5, 0.9, -0.85, 0.55, -0.6, 0.3); s.bezierCurveTo(-0.45, 0.1, -0.2, 0.0, 0, 0);
      } else if (kind === 'petal') {
        s.moveTo(0, 0); s.bezierCurveTo(0.35, 0.25, 0.3, 0.8, 0, 1); s.bezierCurveTo(-0.3, 0.8, -0.35, 0.25, 0, 0);
      } else if (kind === 'fin') {
        s.moveTo(0.3, 0); s.quadraticCurveTo(0.1, 0.6, -0.35, 0.9); s.quadraticCurveTo(-0.3, 0.35, -0.45, 0); s.lineTo(0.3, 0);
      } else { /* feathered bird wing */
        s.moveTo(0.3, 0); s.quadraticCurveTo(0.42, 0.55, 0.1, 1.05); s.lineTo(-0.05, 0.92); s.lineTo(-0.16, 0.98);
        s.lineTo(-0.24, 0.82); s.lineTo(-0.36, 0.84); s.lineTo(-0.4, 0.62); s.lineTo(-0.5, 0.55); s.quadraticCurveTo(-0.45, 0.2, -0.3, 0);
      }
      const g = new THREE.ShapeGeometry(s, 12);
      g.rotateX(Math.PI / 2);
      return g;
    });
  }

  /* ---------------- per-creature kit (materials + uniforms) ---------------- */
  M3.time = { value: 0 };
  function Kit(sp) {
    this.sp = sp;
    this.mats = [];
    this.u = { uTime: M3.time, uShimmer: { value: 0 }, uFlash: { value: 0 } };
    this.glowMats = [];
  }
  Kit.prototype.mat = function (color, o) {
    o = o || {};
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color), roughness: o.rough != null ? o.rough : 0.72, metalness: o.metal || 0,
      flatShading: !!o.flat, transparent: true, side: o.side || THREE.FrontSide,
    });
    if (o.emissive) { m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = o.ei != null ? o.ei : 1; }
    if (o.opacity != null) m.userData.baseOpacity = o.opacity;
    if (o.glow) m.userData.ei = m.emissiveIntensity || 1;
    const u = this.u;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = u.uTime; sh.uniforms.uShimmer = u.uShimmer; sh.uniforms.uFlash = u.uFlash;
      sh.fragmentShader = 'uniform float uTime;\nuniform float uShimmer;\nuniform float uFlash;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', [
        '#include <emissivemap_fragment>',
        '{',
        '  float rim = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));',
        '  float sweep = sin(vViewPosition.x * 0.045 + vViewPosition.y * 0.03 + uTime * 1.4);',
        '  vec3 rb = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + uTime * 0.11 + rim * 0.6));',
        '  totalEmissiveRadiance += uShimmer * (pow(rim, 2.2) * 0.5 + 0.07 * max(sweep, 0.0)) * rb;',
        '  totalEmissiveRadiance += vec3(uFlash);',
        '}',
      ].join('\n'));
    };
    m.customProgramCacheKey = () => 'dyaShimmer';
    this.mats.push(m);
    if (o.glow) this.glowMats.push(m);
    return m;
  };
  /* simple mesh helper: unit geometry, scaled, positioned */
  function mesh(parent, g, m, sx, sy, sz, x, y, z) {
    const o = new THREE.Mesh(g, m);
    o.scale.set(sx, sy == null ? sx : sy, sz == null ? sx : sz);
    o.position.set(x || 0, y || 0, z || 0);
    o.castShadow = true;
    parent.add(o);
    return o;
  }
  function group(parent, x, y, z) {
    const g = new THREE.Group();
    g.position.set(x || 0, y || 0, z || 0);
    if (parent) parent.add(g);
    return g;
  }
  /* a limb hanging from a pivot: returns the pivot (rotate .z to swing fore/aft) */
  function limb(parent, x, y, z, len, thick, m) {
    const pv = group(parent, x, y, z);
    mesh(pv, LIMB(), m, thick, len, thick);
    return pv;
  }
  function eyes(parent, kit, x, y, z, size, opts) {
    opts = opts || {};
    const white = kit.mat(opts.white || '#f4efe2', { rough: 0.3 });
    const dark = kit.mat(opts.pupil || '#15110c', { rough: 0.2, emissive: opts.glow || null, ei: 0.9 });
    const sides = opts.single ? [0] : [-1, 1];
    for (const s of sides) {
      const e = mesh(parent, SPH_LO(), white, size, size, size, x, y, z * s);
      e.castShadow = false;
      const p = mesh(parent, SPH_LO(), dark, size * 0.55, size * (opts.slit ? 0.75 : 0.55), size * (opts.slit ? 0.22 : 0.55), x + size * 0.62, y, z * s);
      p.castShadow = false;
    }
  }
  function shadeHex(hex, amt) { return DYA.sprites.shade(hex, amt); }
  /* wings: folded back along the body on the ground, spread and flapping in the air */
  function foldWing(w, air, flap, t) {
    const a = w.air == null ? air : w.air + (air - w.air) * 0.08;
    w.air = a;
    w.g.rotation.y = -w.s * 1.3 * (1 - a);
    w.g.rotation.x = w.s * (flap * a + (0.12 + Math.sin(t * 2) * 0.02) * (1 - a));
  }

  /* ================================================================
     RIG BUILDERS — each returns { root, anim(st) }
     st: { state, t, speed (0..1+), attack (0..1 pulse), dormant, dead }
     ================================================================ */

  /* ---------- QUADRUPED (and its serpent / aquatic / shelled variants) ---------- */
  function buildQuad(sp, kit, st0) {
    const F = sp.features || {};
    const root = group(null);
    const body = group(root);
    const col = sp.color || '#8a6f4a', col2 = sp.color2 || shadeHex(col, -30);
    const skin = kit.mat(col, { flat: !!(F.rocky || F.carved || F.scaled), rough: F.scaled ? 0.55 : 0.75 });
    const dark = kit.mat(shadeHex(col, -35));
    const accent = kit.mat(col2, { emissive: F.biolum ? col2 : null, ei: 0.55, glow: F.biolum });
    const low = F.low, round = F.round;
    const bw = low ? 1.25 : 1.05, bh = low ? 0.55 : round ? 0.85 : 0.68, bd = low ? 0.85 : 0.72;
    const aquatic = F.aquatic, legless = F.legless || aquatic || F.stationary;
    const hover = F.hover;
    const legLen = legless ? 0 : (low ? 0.42 : 0.62);
    const torso = group(body, 0, legLen + bh * 0.85, 0);
    const parts = { legs: [], heads: [], tail: [], wings: [], fins: [] };

    if (F.shell) {
      /* shelled body: Grothyn & Tonguatjis — a domed carapace with ridged plates */
      const shellMat = kit.mat(col2 === col ? shadeHex(col, -20) : shadeHex(col, -8), { flat: true, rough: 0.6 });
      const sh = mesh(torso, HEMI(), shellMat, bw * 1.02, bh * 1.45, bd * 1.15, 0, -bh * 0.35, 0);
      const rim = kit.mat(shadeHex(col, -45));
      mesh(torso, CYL(), rim, bw * 1.05, 0.12, bd * 1.18, 0, -bh * 0.38, 0);
      const plate = kit.mat(shadeHex(col, 18), { flat: true });
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU;
        const p = mesh(torso, SPH_LO(), plate, 0.28, 0.1, 0.28, Math.cos(a) * bw * 0.55, bh * 0.75, Math.sin(a) * bd * 0.6);
        p.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
      }
      mesh(torso, SPH_LO(), plate, 0.32, 0.12, 0.32, 0, bh * 1.05, 0);
      parts.shell = sh;
      if (F.stalk) {
        /* Grothyn: a stalk eye and a single long vine weapon */
        const stalk = group(torso, bw * 0.35, bh * 0.9, 0);
        mesh(stalk, BONE(), kit.mat(col2), 0.08, 0.5, 0.08);
        mesh(stalk, SPH_LO(), kit.mat('#f4efe2'), 0.13, 0.13, 0.13, 0, 0.55, 0);
        mesh(stalk, SPH_LO(), kit.mat('#15110c'), 0.07, 0.07, 0.07, 0.09, 0.57, 0);
        parts.stalk = stalk;
        const vineMat = kit.mat(F.singleVine ? '#4d7a44' : col2);
        const vine = group(torso, bw * 0.95, -bh * 0.1, 0);
        const segs = [];
        let prev = vine;
        for (let i = 0; i < 6; i++) {
          const s = group(prev, i === 0 ? 0 : 0.32, 0, 0);
          const m = mesh(s, BONE(), vineMat, 0.09 - i * 0.008, 0.34, 0.09 - i * 0.008);
          m.rotation.z = -Math.PI / 2;
          segs.push(s); prev = s;
        }
        mesh(prev, SPH_LO(), kit.mat(shadeHex('#4d7a44', 30)), 0.11, 0.11, 0.11, 0.34, 0, 0);
        parts.vine = segs;
      }
    } else {
      const b = mesh(torso, SPH(), skin, bw, bh, bd);
      parts.bodyMesh = b;
      /* belly a shade lighter */
      mesh(torso, SPH(), kit.mat(shadeHex(col, 26)), bw * 0.85, bh * 0.55, bd * 0.8, 0, -bh * 0.42, 0).castShadow = false;
    }

    /* fur tufts (Sru Vorn) */
    if (F.fur) {
      const furMat = kit.mat(shadeHex(col, -18), { flat: true });
      for (let i = 0; i < 18; i++) {
        const a = (i / 17) * Math.PI;
        const m = mesh(torso, CONE(), furMat, 0.09, 0.32 + hash(i) * 0.12, 0.09, Math.cos(a) * bw * 0.85 - 0.05, Math.sin(a) * bh * 0.82, (hash(i + 3) - 0.5) * bd * 1.1);
        m.rotation.z = (Math.PI / 2 - a) * 0.9;
      }
    }
    /* scars (Harkal) */
    if (F.scars) {
      const sm = kit.mat(shadeHex(col, 50));
      for (let i = 0; i < 3; i++) { const m = mesh(torso, BOX(), sm, 0.05, bh * 0.9, 0.04, -0.3 + i * 0.3, 0.05, bd * 0.93); m.rotation.z = 0.35; m.castShadow = false; }
    }
    /* ridge spines down the back */
    if (F.ridge) {
      for (let i = -3; i <= 3; i++) {
        const m = mesh(torso, CONE(), accent, 0.11, 0.42 - Math.abs(i) * 0.06, 0.06, i * bw * 0.26, bh * 0.82 - Math.abs(i) * 0.04, 0);
        m.rotation.z = 0.25;
      }
    }
    /* blowholes (Hvaleia) */
    if (F.blowholes) {
      for (let i = 0; i < 3; i++) mesh(torso, CYL(), kit.mat('#0e1a24'), 0.07, 0.06, 0.07, bw * 0.15 - i * 0.22, bh * 0.98, (i - 1) * 0.12);
    }
    /* bioluminescent spots */
    if (F.biolum) {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 0.9 + 0.1;
        mesh(torso, SPH_LO(), accent, 0.07, 0.07, 0.07, (i / 9 - 0.5) * bw * 1.6, Math.sin(a) * bh * 0.55, bd * (i % 2 ? 0.86 : -0.86)).castShadow = false;
      }
    }

    /* ---- heads ---- */
    const headMat = kit.mat(shadeHex(col, 6), { flat: !!(F.rocky || F.carved) });
    function makeHead(parent, size, opts) {
      opts = opts || {};
      const h = group(parent);
      mesh(h, SPH(), headMat, size * 1.05, size * 0.8, size * 0.85);
      /* snout */
      mesh(h, SPH(), headMat, size * 0.75, size * 0.48, size * 0.6, size * 0.75, -size * 0.15, 0);
      const jaw = group(h, size * 0.25, -size * 0.35, 0);
      mesh(jaw, SPH(), kit.mat(shadeHex(col, -15)), size * (F.bigJaw ? 1.0 : 0.8), size * 0.25, size * 0.55, size * 0.5, -size * 0.05, 0);
      if (F.bigJaw || F.tusks || F.mouth) {
        const tooth = kit.mat('#efe9d8', { rough: 0.35 });
        for (let i = 0; i < 4; i++) { const tm = mesh(jaw, CONE(), tooth, size * 0.06, size * 0.22, size * 0.06, size * (0.45 + i * 0.12), 0.0, size * (i % 2 ? 0.28 : -0.28)); tm.castShadow = false; }
      }
      if (F.tusks) {
        const tusk = kit.mat('#efe6cf', { rough: 0.3 });
        for (const s of [-1, 1]) { const t = mesh(h, CONE(), tusk, size * 0.12, size * 0.85, size * 0.12, size * 0.9, -size * 0.35, s * size * 0.35); t.rotation.z = -1.1; t.rotation.x = s * -0.25; }
      }
      if (F.manyEyes) {
        for (let i = 0; i < 6; i++) {
          const a = (i / 5 - 0.5) * 2.4;
          eyes(h, kit, size * 0.55 * Math.cos(a) + size * 0.2, size * 0.25, size * 0.8 * Math.sin(a), size * 0.13, { single: true });
        }
      } else if (!opts.noEyes) {
        eyes(h, kit, size * 0.62, size * 0.28, size * 0.5, size * 0.2, { slit: F.scaled || F.serpent, glow: F.biolum ? col2 : null });
      }
      if (F.horns) {
        for (const s of [-1, 1]) { const hn = mesh(h, CONE(), kit.mat('#d8cfb8'), size * 0.12, size * 0.6, size * 0.12, -size * 0.2, size * 0.55, s * size * 0.4); hn.rotation.z = 0.6; hn.rotation.x = s * -0.3; }
      }
      if (F.ears) {
        for (const s of [-1, 1]) { const e = mesh(h, CONE(), headMat, size * 0.25, size * 0.6, size * 0.12, -size * 0.1, size * 0.55, s * size * 0.45); e.rotation.x = s * -0.35; }
      }
      h.userData.jaw = jaw;
      return h;
    }

    const headCount = F.heads ? Math.max(1, st0.heads || 1) : (F.noHead ? 0 : 1);
    function buildHeads(n) {
      for (const h of parts.heads) torso.remove(h.neck);
      parts.heads = [];
      if (F.noHead) return;
      if (F.heads) {
        /* serpent heads on long necks, fanned across the front */
        for (let i = 0; i < n; i++) {
          const fan = n === 1 ? 0 : (i / (n - 1) - 0.5) * Math.min(2.2, 0.62 * n);
          const neck = group(torso, bw * 0.7, bh * 0.25 + (i % 2) * 0.12, (n === 1 ? 0 : (i / (n - 1) - 0.5)) * bd * 1.2);
          neck.rotation.y = -fan;
          const segs = [];
          let prev = neck;
          for (let k = 0; k < 4; k++) {
            const s = group(prev, k === 0 ? 0 : 0.32, 0, 0);
            const m = mesh(s, SPH(), skin, 0.24 - k * 0.015, 0.22 - k * 0.015, 0.22 - k * 0.015, 0.16, 0, 0);
            m.scale.x = 0.3;
            s.rotation.z = k === 0 ? 0.75 : -0.12;
            segs.push(s); prev = s;
          }
          const hd = makeHead(prev, 0.32, {});
          hd.position.x = 0.42; hd.rotation.z = -0.35;
          if (i === 0 && n > 1) hd.scale.setScalar(1.18);  // the first head — near-invincible, and bigger
          parts.heads.push({ neck, segs, head: hd, fan });
        }
      } else {
        const neck = group(torso, bw * 0.82, bh * (low ? 0.2 : 0.45), 0);
        const hd = makeHead(neck, low ? 0.45 : 0.5, {});
        hd.position.x = low ? 0.3 : 0.25;
        parts.heads.push({ neck, segs: [], head: hd, fan: 0 });
      }
    }
    buildHeads(headCount);
    parts.headCount = headCount;

    /* ---- tail ---- */
    if (aquatic) {
      /* fish/whale fluke and side fins (§6: aquatic species never have legs) */
      const tail = group(torso, -bw * 0.9, 0, 0);
      const tailSeg = group(tail);
      mesh(tailSeg, SPH(), skin, 0.55, bh * 0.45, bd * 0.45, -0.35, 0, 0);
      const fluke = group(tailSeg, -0.8, 0, 0);
      const fm = kit.mat(shadeHex(col, -18), { side: THREE.DoubleSide });
      for (const s of [-1, 1]) { const f = mesh(fluke, wingGeo('fin'), fm, 0.6, 1, 0.6 * s); f.rotation.y = Math.PI / 2; f.rotation.z = 0; }
      if (F.clubTail) mesh(fluke, rockGeo(3), kit.mat(shadeHex(col, -40), { flat: true }), 0.32, 0.32, 0.32, -0.1, 0, 0);
      parts.tail = [tailSeg];
      for (const s of [-1, 1]) {
        const fin = group(torso, bw * 0.15, -bh * 0.35, s * bd * 0.8);
        mesh(fin, wingGeo('fin'), fm, 0.7, 1, 0.7 * s);
        parts.fins.push({ g: fin, s });
      }
      if (F.finned) { const df = mesh(torso, CONE(), fm, 0.2, 0.55, 0.05, -0.1, bh * 0.8, 0); df.rotation.z = 0.6; }
    } else if (F.clubTail || F.ballTail || F.serpent) {
      const tail = group(torso, -bw * 0.85, 0, 0);
      let prev = tail;
      const n = F.serpent ? 6 : 4;
      for (let i = 0; i < n; i++) {
        const s = group(prev, i === 0 ? 0 : -0.3, 0, 0);
        mesh(s, SPH(), skin, 0.2, (0.22 - i * 0.025) * (F.serpent ? 1.3 : 1), (0.22 - i * 0.025) * (F.serpent ? 1.3 : 1), -0.15, 0, 0);
        s.rotation.z = i === 0 ? -0.15 : 0.05;
        parts.tail.push(s); prev = s;
      }
      if (F.clubTail || F.ballTail) {
        const club = mesh(prev, SPH(), dark, 0.3, 0.3, 0.3, -0.45, 0, 0);
        const spikeM = kit.mat(shadeHex(col, -70));
        for (let i = 0; i < 10; i++) {
          const a = i / 10 * TAU, b2 = (i % 2) ? 0.6 : -0.6;
          const dir = new THREE.Vector3(Math.cos(a), Math.sin(a) * Math.cos(b2), Math.sin(b2)).normalize();
          const sk = mesh(prev, CONE(), spikeM, 0.06, 0.22, 0.06, -0.45 + dir.x * 0.25, dir.y * 0.25, dir.z * 0.25);
          sk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        }
        parts.club = club;
      }
    } else if (F.fluffTail) {
      const tail = group(torso, -bw * 0.9, bh * 0.2, 0);
      const tm = kit.mat(F.biolumTail ? col2 : shadeHex(col, 15), { emissive: F.biolumTail ? col2 : null, ei: 0.8, glow: F.biolumTail });
      mesh(tail, SPH(), tm, 0.55, 0.32, 0.32, -0.4, 0.15, 0);
      parts.tail = [tail];
    } else if (!round && !F.stationary && !F.shell) {
      const tail = group(torso, -bw * 0.9, bh * 0.1, 0);
      mesh(tail, BONE(), skin, 0.12, 0.7, 0.12).rotation.z = 1.9;
      parts.tail = [tail];
    }

    /* ---- legs ---- */
    if (!legless) {
      const legMat = kit.mat(shadeHex(col, -28));
      const xs = [bw * 0.5, bw * 0.5, -bw * 0.5, -bw * 0.5];
      const zs = [bd * 0.55, -bd * 0.55, bd * 0.55, -bd * 0.55];
      for (let i = 0; i < 4; i++) {
        const pv = limb(torso, xs[i], -bh * 0.45, zs[i], legLen + bh * 0.4, low ? 0.22 : 0.2, legMat);
        mesh(pv, SPH_LO(), legMat, 0.14, 0.08, 0.14, 0.05, -(legLen + bh * 0.4), 0);
        parts.legs.push(pv);
      }
    }

    /* ---- wings ---- */
    if (F.wings) {
      const wm = kit.mat(shadeHex(col, -25), { side: THREE.DoubleSide, rough: 0.8 });
      for (const s of [-1, 1]) {
        const w = group(torso, -0.05, bh * 0.6, s * bd * 0.5);
        mesh(w, wingGeo(F.carved ? 'bat' : 'bird'), wm, 1.4, 1, 1.5 * s);
        parts.wings.push({ g: w, s });
      }
    }
    /* tongue (Tonguatjis) */
    if (F.tongue && parts.heads[0]) {
      const tg = group(parts.heads[0].head.userData.jaw, 0.4, 0.05, 0);
      const tongue = mesh(tg, BONE(), kit.mat(col2, { rough: 0.3 }), 0.08, 1, 0.08);
      tongue.rotation.z = -Math.PI / 2;
      tg.scale.x = 0.01;
      parts.tongue = tg;
    }

    /* ---- animation ---- */
    function anim(st) {
      const t = st.t, mv = st.speed;
      const gaitRate = st.state === 'run' ? 13 : 8;
      const ph = t * gaitRate;
      /* rebuild serpent heads when one is lost or regrows */
      if (F.heads && st.heads && st.heads !== parts.headCount) { parts.headCount = st.heads; buildHeads(st.heads); }
      const dorm = st.dormant ? 1 : 0;
      torso.position.y = legLen + bh * 0.85 - dorm * bh * 0.6 + Math.sin(t * 2.2) * 0.02 + Math.abs(Math.sin(ph)) * 0.05 * mv;
      torso.rotation.z = Math.sin(ph) * 0.03 * mv;
      torso.position.x = st.attack * 0.25;
      parts.legs.forEach((l, i) => { l.rotation.z = Math.sin(ph + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.6 * mv; });
      parts.heads.forEach((h, i) => {
        h.neck.rotation.z = Math.sin(t * 1.6 + i * 1.3) * 0.08 + st.attack * -0.35;
        h.neck.rotation.y = -h.fan + Math.sin(t * 1.1 + i * 2.1) * 0.12;
        h.segs.forEach((s, k) => { if (k) s.rotation.z = -0.12 + Math.sin(t * 2 + i + k) * 0.06 - st.attack * 0.1; });
        const jaw = h.head.userData.jaw;
        if (jaw) jaw.rotation.z = -(st.attack * 0.6 + (st.state === 'special' ? 0.4 : 0));
      });
      parts.tail.forEach((s, k) => { s.rotation.y = Math.sin(t * (aquatic ? 5 : 3) - k * 0.7) * (aquatic ? 0.35 : 0.22) * (1 + mv); });
      if (parts.club && st.state === 'attack') parts.tail.forEach((s) => { s.rotation.y += Math.sin(t * 14) * 0.25; });
      parts.fins.forEach(f => { f.g.rotation.x = f.s * (0.3 + Math.sin(t * 6) * 0.25); });
      parts.wings.forEach(w => { foldWing(w, st.airborne ? 1 : 0, Math.sin(t * 9) * 0.8, t); });
      if (parts.tongue) parts.tongue.scale.x = Math.max(0.01, st.state === 'special' || st.attack > 0.3 ? 2.6 * Math.max(st.attack, 0.5) : 0.01);
      if (parts.vine) parts.vine.forEach((s, k) => { s.rotation.z = Math.sin(t * 2.4 + k * 0.8) * 0.25 + (st.attack > 0 ? -st.attack * 0.3 : 0.15); s.rotation.y = Math.sin(t * 1.3 + k) * 0.25; });
      if (parts.stalk) parts.stalk.rotation.z = Math.sin(t * 1.5) * 0.2;
      if (hover) torso.position.y += 0.15 + Math.sin(t * 3) * 0.06;
    }
    return { root, anim, height: legLen + bh * 2 };
  }

  /* ---------- PUNK (pumpkin body, vine legs and arms) ---------- */
  function buildPunk(sp, kit) {
    const F = sp.features || {}, P = sp.punk || { legs: 4, arms: 2, ribs: 6, bodyW: 1, bodyH: 0.85, legReach: 1, armReach: 1 };
    const root = group(null);
    const col = sp.color, col2 = sp.color2;
    const skin = kit.mat(col, { rough: 0.55, emissive: F.duat ? '#3a1e5a' : null, ei: 0.35 });
    const vineMat = kit.mat(col2, { rough: 0.8 });
    const legLen = 0.55 * P.legReach;
    const torso = group(root, 0, legLen + 0.78 * P.bodyH, 0);
    mesh(torso, pumpkinGeo(P.ribs * 2 || 10), skin, P.bodyW * 0.95, P.bodyH * 0.95, P.bodyW * 0.95);
    /* curled stem */
    const stem = mesh(torso, BONE(), kit.mat('#5a4a28'), 0.1, 0.32, 0.1, 0, P.bodyH * 0.7, 0);
    stem.rotation.z = -0.35;
    /* carved face — glowing eyes and a jagged grin on the front */
    const glow = kit.mat(F.duat ? '#c48ae8' : '#ffd24a', { emissive: F.duat ? '#c48ae8' : '#ffb03a', ei: 1.2, glow: true });
    for (const s of [-1, 1]) {
      const e = mesh(torso, CONE(), glow, 0.14, 0.2, 0.06, P.bodyW * 0.86, 0.12, s * 0.27);
      e.rotation.z = -Math.PI / 2; e.rotation.x = Math.PI; e.castShadow = false;
    }
    const mouth = mesh(torso, BOX(), glow, 0.06, 0.1, 0.5, P.bodyW * 0.88, -0.2, 0); mouth.castShadow = false;
    const legs = [], arms = [];
    for (let i = 0; i < P.legs; i++) {
      const a = (i / P.legs) * TAU + Math.PI / P.legs;
      const pv = limb(torso, Math.cos(a) * P.bodyW * 0.55, -P.bodyH * 0.55, Math.sin(a) * P.bodyW * 0.55, legLen + 0.3, 0.13, vineMat);
      pv.rotation.x = -Math.sin(a) * 0.35; pv.userData.a = a;
      legs.push(pv);
    }
    for (let i = 0; i < P.arms; i++) {
      const s = i % 2 ? 1 : -1;
      const pv = group(torso, P.bodyW * 0.25, 0.1 + Math.floor(i / 2) * 0.15, s * P.bodyW * 0.82);
      let prev = pv;
      const segs = [];
      for (let k = 0; k < 4; k++) {
        const sg = group(prev, k === 0 ? 0 : 0.26 * P.armReach, 0, 0);
        const m = mesh(sg, BONE(), vineMat, 0.07, 0.27 * P.armReach, 0.07);
        m.rotation.z = -Math.PI / 2;
        segs.push(sg); prev = sg;
      }
      /* leaf at the vine tip */
      const leaf = mesh(prev, wingGeo('petal'), kit.mat(shadeHex(col2, 25), { side: THREE.DoubleSide }), 0.22, 1, 0.22, 0.27 * P.armReach, 0, 0);
      leaf.rotation.y = Math.PI / 2;
      pv.rotation.y = -s * 0.9;
      arms.push({ pv, segs, s, i });
    }
    function anim(st) {
      const t = st.t, mv = st.speed, ph = t * (st.state === 'run' ? 13 : 8);
      torso.position.y = legLen + 0.78 * P.bodyH + Math.sin(t * 2.2) * 0.02 + Math.abs(Math.sin(ph)) * 0.08 * mv;
      torso.position.x = st.attack * 0.2;
      torso.rotation.x = Math.sin(ph * 0.5) * 0.05 * mv;
      legs.forEach((l, i) => { l.rotation.z = Math.sin(ph + i * Math.PI) * 0.55 * mv; });
      arms.forEach(a => {
        a.pv.rotation.z = Math.sin(t * 2 + a.i) * 0.2 + st.attack * 0.6;
        a.segs.forEach((s, k) => { if (k) { s.rotation.z = Math.sin(t * 3 + k + a.i) * 0.22 - st.attack * 0.25; s.rotation.y = a.s * Math.sin(t * 2.3 + k) * 0.2; } });
      });
    }
    return { root, anim, height: legLen + 1.6 * P.bodyH };
  }

  /* ---------- BIPED (Eikar / Keilia acorns, Uff, Karnen) ---------- */
  function buildBiped(sp, kit) {
    const F = sp.features || {};
    const root = group(null);
    const col = sp.color, col2 = sp.color2;
    const keilia = !!F.hairArmor;
    const uff = !!F.stalkLegs;
    const skin = kit.mat(col, { rough: 0.6 });
    const capMat = kit.mat(col2, { flat: true, rough: 0.9 });
    const limbMat = kit.mat(shadeHex(col, -30));
    const legLen = uff ? 1.0 : 0.5;
    const hips = group(root, 0, legLen, 0);
    const torso = group(hips, 0, 0, 0);
    const bodyH = keilia ? 0.75 : 0.65;
    let headY;
    if (uff) {
      /* Uff: a small seed body on stalk legs, a long neck and a striped head */
      mesh(torso, SPH(), skin, 0.35, 0.3, 0.3, 0, 0.25, 0);
      const neck = mesh(torso, BONE(), skin, 0.1, 0.8, 0.1, 0, 0.4, 0);
      neck.rotation.z = -0.15;
      headY = 1.3;
      const head = group(torso, 0.15, headY, 0);
      mesh(head, SPH(), skin, 0.42, 0.38, 0.38);
      const stripe = kit.mat(col2);
      for (let i = -1; i <= 1; i++) { const r = mesh(head, CYL(), stripe, 0.43 - Math.abs(i) * 0.08, 0.07, 0.43 - Math.abs(i) * 0.08, 0, i * 0.17, 0); r.rotation.z = 0.2; r.castShadow = false; }
      eyes(head, kit, 0.3, 0.05, 0.16, 0.1);
      torso.userData.head = head;
    } else {
      /* acorn body: an egg with the cap on top and a little stem */
      mesh(torso, SPH(), skin, 0.5 * (keilia ? 1.1 : 1), bodyH, 0.48 * (keilia ? 1.1 : 1), 0, bodyH * 0.95, 0);
      const head = group(torso, 0, bodyH * 1.45, 0);
      if (F.triangleHat) {
        /* Karnen: the triangular hat */
        mesh(head, CONE(), capMat, 0.68, 0.55, 0.68, 0, 0.05, 0);
      } else {
        mesh(head, HEMI(), capMat, 0.56 * (keilia ? 1.1 : 1), 0.38, 0.54 * (keilia ? 1.1 : 1), 0, 0.02, 0);
        mesh(head, CYL(), capMat, 0.57 * (keilia ? 1.1 : 1), 0.06, 0.55 * (keilia ? 1.1 : 1), 0, 0.02, 0);
        mesh(head, BONE(), kit.mat('#4a3520'), 0.06, 0.16, 0.06, 0, 0.36, 0);
      }
      eyes(head, kit, 0.4, -0.18, 0.17, 0.09);
      torso.userData.head = head;
      if (keilia) {
        /* Keilia hair armor: heavy braids draped from the cap */
        const hair = kit.mat(shadeHex(col2, -10), { flat: true });
        for (let i = 0; i < 9; i++) {
          const a = Math.PI * 0.55 + (i / 8) * Math.PI * 0.9;
          const br = mesh(head, LIMB(), hair, 0.1, 0.8, 0.1, Math.cos(a) * 0.48, 0, Math.sin(a) * 0.48);
          br.rotation.x = Math.sin(a) * 0.3; br.rotation.z = -Math.cos(a) * 0.3;
        }
        mesh(torso, CYL(), hair, 0.52, 0.18, 0.5, 0, bodyH * 0.7, 0);
      }
    }
    /* legs */
    const legs = [];
    for (const s of [-1, 1]) {
      const pv = limb(hips, 0, 0.05, s * (uff ? 0.15 : 0.22), legLen + 0.05, uff ? 0.06 : 0.18, limbMat);
      mesh(pv, SPH_LO(), limbMat, uff ? 0.1 : 0.16, 0.07, 0.12, 0.06, -legLen - 0.02, 0);
      legs.push(pv);
    }
    /* arms */
    const arms = [];
    for (const s of [-1, 1]) {
      const pv = group(torso, 0.05, uff ? 0.35 : bodyH * 1.15, s * (uff ? 0.32 : (keilia ? 0.55 : 0.5)));
      if (F.petalArms) {
        const pm = kit.mat(shadeHex(col, 20), { side: THREE.DoubleSide });
        const pt = mesh(pv, wingGeo('petal'), pm, 0.35, 1, 0.55 * s);
        pt.rotation.x = 0.2 * s;
      } else {
        mesh(pv, LIMB(), limbMat, 0.16, 0.55, 0.16);
      }
      arms.push({ pv, s });
    }
    /* weapon in the right hand */
    const hand = group(arms[1].pv, 0.05, -0.52, 0);
    hand.scale.setScalar(1.3);
    const steel = kit.mat('#c9ccd4', { metal: 0.7, rough: 0.3 });
    const wood = kit.mat('#6d4a2e');
    let weapon = F.weapon || null;
    if (weapon === 'sword') {
      mesh(hand, BOX(), steel, 0.08, 0.9, 0.04, 0, -0.45, 0).castShadow = true;
      mesh(hand, BOX(), kit.mat('#8a6f42', { metal: 0.4 }), 0.1, 0.05, 0.3, 0, 0.0, 0);
      if (keilia) hand.scale.setScalar(1.25);   // heavier Keilia blades
    } else if (weapon === 'spear') {
      mesh(hand, CYL(), wood, 0.035, 1.9, 0.035, 0, 0, 0).rotation.x = 0;
      const tip = mesh(hand, CONE(), steel, 0.07, 0.28, 0.07, 0, 0.95, 0);
      tip.castShadow = true;
      hand.rotation.z = -0.25;
    } else if (weapon === 'bow') {
      const bow = new THREE.Mesh(geo('bow', () => new THREE.TorusGeometry(0.55, 0.035, 6, 20, Math.PI)), wood);
      bow.rotation.z = -Math.PI / 2; bow.rotation.y = Math.PI / 2; bow.castShadow = true;
      hand.add(bow);
      mesh(hand, CYL(), kit.mat('#e8e0c8'), 0.008, 1.1, 0.008, 0, 0, 0);
      /* quiver on the back */
      const q = mesh(torso, CYL(), kit.mat('#5a3a20'), 0.12, 0.55, 0.12, -0.45, bodyH * 1.1, -0.1);
      q.rotation.z = 0.4;
    } else if (weapon === 'flask') {
      const fl = mesh(hand, SPH(), kit.mat('#c48ae8', { emissive: '#9d5ae0', ei: 0.9, glow: true, rough: 0.1 }), 0.16, 0.16, 0.16, 0, -0.12, 0);
      fl.castShadow = false;
      mesh(hand, CYL(), kit.mat('#d8e8f0', { rough: 0.1 }), 0.05, 0.14, 0.05, 0, 0.06, 0);
      /* satchel */
      mesh(torso, BOX(), kit.mat('#7a5a32'), 0.25, 0.25, 0.12, -0.15, bodyH * 0.8, -0.5);
    } else if (weapon === 'hammer') {
      mesh(hand, CYL(), wood, 0.04, 0.9, 0.04, 0, -0.3, 0);
      mesh(hand, BOX(), kit.mat('#7d7568', { metal: 0.5, rough: 0.5 }), 0.22, 0.2, 0.38, 0, -0.75, 0);
    }
    if (F.acorn && !weapon) weapon = null;
    function anim(st) {
      const t = st.t, mv = st.speed, ph = t * (st.state === 'run' ? 13 : 8);
      hips.position.y = legLen + Math.abs(Math.sin(ph)) * 0.08 * mv + Math.sin(t * 2.2) * 0.015;
      torso.rotation.z = -mv * 0.12 - st.attack * 0.2;
      legs.forEach((l, i) => { l.rotation.z = Math.sin(ph + i * Math.PI) * 0.7 * mv; });
      arms.forEach((a, i) => { a.pv.rotation.z = Math.sin(ph + i * Math.PI + Math.PI) * 0.5 * mv; a.pv.rotation.x = -a.s * 0.12; });
      /* weapon arm: swing / thrust / draw / throw / hammer */
      const atk = st.attack;
      const wa = arms[1].pv;
      if (weapon === 'sword' || weapon === 'hammer') wa.rotation.z = 1.4 * atk - (atk > 0 ? 0.3 : 0) + Math.sin(t * 1.7) * 0.05;
      else if (weapon === 'spear') wa.rotation.z = 0.9 + atk * 0.6;
      else if (weapon === 'bow') { wa.rotation.z = 1.45; arms[0].pv.rotation.z = 1.3 + atk * 0.2; }
      else if (weapon === 'flask') wa.rotation.z = 0.4 + atk * 1.4;
      if (torso.userData.head && uff) torso.userData.head.rotation.z = Math.sin(t * 1.3) * 0.2;
      /* Uff flails when things get close */
      if (uff && st.state === 'special') arms.forEach((a, i) => { a.pv.rotation.x = Math.sin(t * 18 + i * 3) * 1.2; });
    }
    return { root, anim, height: uff ? 1.9 : legLen + bodyH * 2 + 0.4 };
  }

  /* ---------- FLAME (Tyndael — living fire) ---------- */
  function buildFlame(sp, kit) {
    const root = group(null);
    const core = group(root, 0, 0.9, 0);
    const outer = kit.mat(sp.color, { emissive: sp.color, ei: 0.75, glow: true, rough: 1 });
    const inner = kit.mat(sp.color2, { emissive: sp.color2, ei: 0.9, glow: true, rough: 1 });
    const tongues = [];
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU;
      const c = mesh(core, CONE(), outer, 0.3, 1.1, 0.3, Math.cos(a) * 0.32, -0.4, Math.sin(a) * 0.32);
      c.castShadow = false; tongues.push(c);
    }
    const heart = mesh(core, SPH(), inner, 0.45, 0.6, 0.45, 0, 0, 0); heart.castShadow = false;
    const tip = mesh(core, CONE(), inner, 0.28, 1.0, 0.28, 0, 0.1, 0); tip.castShadow = false;
    /* fiery wings and a crown */
    const wm = kit.mat(sp.color, { emissive: sp.color, ei: 0.9, glow: true, side: THREE.DoubleSide });
    const wings = [];
    for (const s of [-1, 1]) { const w = group(core, -0.1, 0.25, s * 0.25); mesh(w, wingGeo('bird'), wm, 1.1, 1, 1.2 * s).castShadow = false; wings.push({ g: w, s }); }
    const crown = group(core, 0, 0.75, 0);
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; mesh(crown, CONE(), inner, 0.06, 0.28, 0.06, Math.cos(a) * 0.18, 0, Math.sin(a) * 0.18).castShadow = false; }
    const eyeM = kit.mat('#fff8e0', { emissive: '#ffffff', ei: 1 });
    for (const s of [-1, 1]) mesh(core, SPH_LO(), eyeM, 0.07, 0.09, 0.07, 0.38, 0.15, s * 0.14).castShadow = false;
    function anim(st) {
      const t = st.t, heat = st.heat != null ? st.heat : 1;
      core.position.y = 1.0 + Math.sin(t * 3) * 0.1;
      const hs = 0.8 + Math.min(1.5, heat) * 0.3;
      tongues.forEach((c, i) => { c.scale.y = (0.9 + Math.sin(t * 9 + i * 1.7) * 0.25) * hs; c.rotation.z = Math.sin(t * 5 + i) * 0.15; });
      tip.scale.y = 1 + Math.sin(t * 11) * 0.2;
      core.rotation.y = t * 0.6;
      wings.forEach(w => { w.g.rotation.x = w.s * (Math.sin(t * 9) * 0.6 - 0.1); });
      core.position.x = st.attack * 0.3;
    }
    return { root, anim, height: 2.2, emitsLight: sp.color };
  }

  /* ---------- SWARM (Makari) ---------- */
  function buildSwarm(sp, kit) {
    const root = group(null);
    const n = 36;
    const bug = kit.mat(sp.color, { emissive: sp.color2, ei: 0.3 });
    const im = new THREE.InstancedMesh(SPH_LO(), bug, n);
    im.castShadow = true;
    root.add(im);
    const seeds = [];
    for (let i = 0; i < n; i++) seeds.push([hash(i) * TAU, 0.3 + hash(i + 9) * 0.9, 0.4 + hash(i + 19) * 1.2, 2 + hash(i + 29) * 3]);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
    function anim(st) {
      const t = st.t, frac = st.swarmFrac != null ? st.swarmFrac : 1;
      const live = Math.max(3, Math.round(n * frac));
      im.count = live;
      for (let i = 0; i < live; i++) {
        const s = seeds[i];
        const a = s[0] + t * s[3] * (i % 2 ? 1 : -1);
        ps.set(Math.cos(a) * s[1] + st.attack * 0.4, s[2] + Math.sin(t * 4 + i) * 0.15, Math.sin(a) * s[1]);
        sc.setScalar(0.07);
        m4.compose(ps, q, sc);
        im.setMatrixAt(i, m4);
      }
      im.instanceMatrix.needsUpdate = true;
    }
    return { root, anim, height: 1.8 };
  }

  /* ---------- TREE (Albali Aagac — five healing horns) ---------- */
  function buildTree(sp, kit) {
    const root = group(null);
    const bark = kit.mat(sp.color2, { flat: true, rough: 0.95 });
    const leaf = kit.mat(sp.color, { flat: true });
    const trunk = mesh(root, CYL(), bark, 0.28, 1.6, 0.28, 0, 0.8, 0);
    trunk.scale.x = 0.3;
    const crown = group(root, 0, 1.9, 0);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU;
      mesh(crown, rockGeo(i), leaf, 0.6, 0.5, 0.6, Math.cos(a) * 0.5, (i % 2) * 0.25, Math.sin(a) * 0.5);
    }
    mesh(crown, rockGeo(7), leaf, 0.75, 0.6, 0.75, 0, 0.45, 0);
    const horn = kit.mat('#b03030', { rough: 0.4 });
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; const h = mesh(crown, CONE(), horn, 0.08, 0.45, 0.08, Math.cos(a) * 0.95, 0.2, Math.sin(a) * 0.95); h.rotation.z = -Math.cos(a) * 0.9; h.rotation.x = Math.sin(a) * 0.9; }
    /* exposed roots */
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.3; const r = mesh(root, LIMB(), bark, 0.12, 0.6, 0.12, Math.cos(a) * 0.15, 0.25, Math.sin(a) * 0.15); r.rotation.z = Math.cos(a) * 1.2; r.rotation.x = -Math.sin(a) * 1.2; }
    function anim(st) { crown.rotation.z = Math.sin(st.t * 0.9) * 0.04; crown.rotation.x = Math.sin(st.t * 0.7) * 0.03; }
    return { root, anim, height: 2.8 };
  }

  /* ---------- STRYX (stone-armored, vine limbs, rooted) ---------- */
  function buildStryx(sp, kit) {
    const root = group(null);
    const stone = kit.mat(sp.color, { flat: true, rough: 0.9 });
    const vine = kit.mat(sp.color2);
    const body = group(root, 0, 0.7, 0);
    mesh(body, rockGeo(1), stone, 0.75, 0.7, 0.7);
    mesh(body, rockGeo(2), stone, 0.4, 0.35, 0.4, 0.5, 0.5, 0.15);
    mesh(body, rockGeo(4), stone, 0.35, 0.3, 0.35, -0.4, 0.55, -0.2);
    eyes(body, kit, 0.62, 0.15, 0.22, 0.12, { glow: '#9be86a' });
    const limbs = [];
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU;
      const pv = group(body, Math.cos(a) * 0.55, -0.2, Math.sin(a) * 0.55);
      let prev = pv; const segs = [];
      for (let k = 0; k < 3; k++) { const s = group(prev, k ? 0.3 : 0, 0, 0); mesh(s, BONE(), vine, 0.07, 0.32, 0.07).rotation.z = -Math.PI / 2; segs.push(s); prev = s; }
      pv.rotation.y = -a; pv.rotation.z = -0.7;
      limbs.push(segs);
    }
    function anim(st) {
      limbs.forEach((segs, i) => segs.forEach((s, k) => { if (k) s.rotation.z = -0.3 + Math.sin(st.t * 2 + i + k) * 0.2 - st.attack * 0.4; }));
      body.position.y = 0.7 + Math.sin(st.t * 1.4) * 0.02;
    }
    return { root, anim, height: 1.6 };
  }

  /* ---------- KIPSU (small fox, biolum tail) ---------- */
  function buildKipsu(sp, kit, st0) {
    const s2 = Object.assign({}, sp, { features: Object.assign({}, sp.features, { ears: true, fluffTail: true }) });
    const q = buildQuad(s2, kit, st0);
    q.root.scale.set(1, 0.9, 0.85);
    return q;
  }

  /* ---------- MIKOLO MOKO (lean, snake-like relic thief) ---------- */
  function buildMikolo(sp, kit, st0) {
    const s2 = Object.assign({}, sp, { features: Object.assign({}, sp.features, { low: true, serpent: true }) });
    return buildQuad(s2, kit, st0);
  }

  /* ---------- GYNGE (living rock, cave mouth) ---------- */
  function buildGynge(sp, kit) {
    const root = group(null);
    const rock = kit.mat(sp.color, { flat: true, rough: 0.95 });
    const moss = kit.mat('#5a7a3a', { flat: true });
    const glow = kit.mat('#68e0c8', { emissive: '#68e0c8', ei: 1.2, glow: true });
    const base = group(root, 0, 0, 0);
    mesh(base, rockGeo(5), rock, 1.15, 0.6, 1.0, -0.1, 0.25, 0);
    const upper = group(base, 0.45, 0.45, 0);
    mesh(upper, rockGeo(2), rock, 0.95, 0.65, 0.9, -0.45, 0.25, 0);
    for (let i = 0; i < 5; i++) mesh(upper, rockGeo(i), moss, 0.25, 0.08, 0.25, -0.8 + i * 0.25, 0.75, (hash(i) - 0.5) * 0.7).castShadow = false;
    /* inner glow + teeth of the cave mouth */
    const throat = mesh(base, SPH(), glow, 0.5, 0.2, 0.55, 0.35, 0.45, 0); throat.castShadow = false;
    const tooth = kit.mat('#d8d0bc', { flat: true });
    for (let i = 0; i < 5; i++) { const t = mesh(upper, CONE(), tooth, 0.07, 0.22, 0.07, 0.1, -0.05, (i - 2) * 0.17); t.rotation.z = Math.PI; }
    for (let i = 0; i < 5; i++) mesh(base, CONE(), tooth, 0.07, 0.2, 0.07, 0.65, 0.5, (i - 2) * 0.17);
    const eyeM = kit.mat('#68e0c8', { emissive: '#68e0c8', ei: 1, glow: true });
    for (const s of [-1, 1]) mesh(upper, SPH_LO(), eyeM, 0.08, 0.05, 0.08, 0.25, 0.4, s * 0.3).castShadow = false;
    function anim(st) {
      const open = st.state === 'attack' ? 0.5 + st.attack * 0.4 : st.dormant ? 0 : 0.12 + Math.sin(st.t * 0.8) * 0.04;
      upper.rotation.z = open;
      base.position.y = st.dormant ? -0.25 : 0;
      throat.visible = !st.dormant;
    }
    return { root, anim, height: 1.4 };
  }

  /* ---------- HVALEIA (the many-eyed sky-whale) ---------- */
  function buildHvaleia(sp, kit, st0) {
    const s2 = Object.assign({}, sp, { features: Object.assign({}, sp.features, { hover: true }) });
    const q = buildQuad(s2, kit, st0);
    q.root.scale.set(1.25, 1, 1);
    return q;
  }

  /* ---------- LUTUT (apex aerial predator, carved stone pattern) ---------- */
  function buildLutut(sp, kit, st0) {
    const s2 = Object.assign({}, sp, { features: Object.assign({}, sp.features, { ridge: true }) });
    return buildQuad(s2, kit, st0);
  }

  /* ---------- BLOB (buds, fruits, field morsels) ---------- */
  function buildBlob(sp, kit) {
    const F = sp.features || {};
    const root = group(null);
    const glow = F.glow;
    const m = kit.mat(sp.color, { emissive: glow ? sp.color2 : null, ei: 0.45, glow, rough: 0.45 });
    const b = mesh(root, SPH(), m, 0.7, 0.65, 0.7, 0, 0.65, 0);
    mesh(root, BONE(), kit.mat('#5a7a3a'), 0.06, 0.25, 0.06, 0, 1.2, 0);
    const leafM = kit.mat('#7d9b4e', { side: THREE.DoubleSide });
    for (const s of [-1, 1]) { const l = mesh(root, wingGeo('petal'), leafM, 0.3, 1, 0.3 * s, 0, 1.3, 0); l.rotation.x = s * 0.6; }
    function anim(st) { b.scale.y = 0.65 + Math.sin(st.t * 2.5) * 0.03; }
    return { root, anim, height: 1.4 };
  }

  /* ---------- FIELD (Ju — carrots sitting in tilled soil) ---------- */
  function buildField(sp, kit) {
    const root = group(null);
    const soil = kit.mat('#5a4228', { flat: true, rough: 1 });
    mesh(root, CYL(), soil, 1.3, 0.12, 1.0, 0, 0.06, 0).castShadow = false;
    const carrot = kit.mat(sp.color);
    const tops = kit.mat(sp.color2);
    const tops3 = [];
    for (let i = 0; i < 9; i++) {
      const x = ((i % 3) - 1) * 0.7, z = (Math.floor(i / 3) - 1) * 0.55;
      const c = mesh(root, CONE(), carrot, 0.12, 0.25, 0.12, x, 0.1, z);
      const g = group(root, x, 0.35, z);
      for (let k = 0; k < 3; k++) { const l = mesh(g, CONE(), tops, 0.05, 0.35, 0.05); l.rotation.z = (k - 1) * 0.5; }
      tops3.push(g); c.castShadow = false;
    }
    function anim(st) { tops3.forEach((g, i) => { g.rotation.x = Math.sin(st.t * 1.5 + i) * 0.12; }); }
    return { root, anim, height: 0.8 };
  }

  /* ---------- RELIC SHARD (Sprengju shaving) ---------- */
  function buildRelicShard(sp, kit) {
    const root = group(null);
    const m = kit.mat(sp.color, { emissive: sp.color2, ei: 0.6, glow: true, rough: 0.2, metal: 0.3, flat: true });
    const c = new THREE.Mesh(geo('octa', () => new THREE.OctahedronGeometry(1, 0)), m);
    c.scale.set(0.35, 0.8, 0.35); c.castShadow = true; c.position.y = 1.0;
    root.add(c);
    function anim(st) { c.rotation.y = st.t * 1.4; c.position.y = 1.0 + Math.sin(st.t * 2) * 0.1; }
    return { root, anim, height: 1.8 };
  }

  /* ---------- CRAB (Raf Krabbi — electric charge always building) ---------- */
  function buildCrab(sp, kit) {
    const root = group(null);
    const plate = kit.mat(sp.color, { rough: 0.45, flat: true });
    const elec = kit.mat(sp.color2, { emissive: sp.color2, ei: 0.2, glow: true });
    const body = group(root, 0, 0.55, 0);
    mesh(body, SPH(), plate, 0.85, 0.38, 1.0);
    for (let i = 0; i < 3; i++) mesh(body, SPH_LO(), kit.mat(shadeHex(sp.color, -25), { flat: true }), 0.3, 0.12, 0.3, -0.3 + i * 0.3, 0.3, (i - 1) * 0.3);
    const sparks = [];
    for (let i = 0; i < 4; i++) { const s = mesh(body, SPH_LO(), elec, 0.07, 0.07, 0.07, -0.4 + i * 0.25, 0.4, (i % 2 ? 0.3 : -0.3)); s.castShadow = false; sparks.push(s); }
    /* eye stalks */
    for (const s of [-1, 1]) { mesh(body, BONE(), plate, 0.05, 0.3, 0.05, 0.6, 0.15, s * 0.22); mesh(body, SPH_LO(), kit.mat('#111'), 0.08, 0.08, 0.08, 0.6, 0.47, s * 0.22); }
    const legs = [];
    const legM = kit.mat(shadeHex(sp.color, -30));
    for (let i = 0; i < 6; i++) {
      const s = i < 3 ? -1 : 1, k = i % 3;
      const pv = group(body, 0.3 - k * 0.35, -0.1, s * 0.8);
      const m = mesh(pv, LIMB(), legM, 0.08, 0.7, 0.08);
      m.rotation.x = s * -0.9;
      legs.push({ pv, s, k });
    }
    const claws = [];
    for (const s of [-1, 1]) {
      const pv = group(body, 0.75, 0, s * 0.55);
      mesh(pv, BONE(), plate, 0.12, 0.5, 0.12).rotation.z = -1.2;
      const pincer = group(pv, 0.5, 0.18, 0);
      mesh(pincer, SPH(), plate, 0.32, 0.18, 0.18, 0.15, 0, 0);
      const top = group(pincer, 0.3, 0.06, 0);
      mesh(top, CONE(), plate, 0.08, 0.3, 0.08).rotation.z = -Math.PI / 2;
      claws.push({ pv, top, s });
    }
    function anim(st) {
      const t = st.t, mv = st.speed;
      body.position.y = 0.55 + Math.abs(Math.sin(t * 16)) * 0.04 * mv;
      legs.forEach(l => { l.pv.rotation.y = Math.sin(t * 16 + l.k * 2 + (l.s > 0 ? Math.PI : 0)) * 0.4 * mv; });
      claws.forEach(c => { c.top.rotation.z = 0.3 + Math.abs(Math.sin(t * (st.attack ? 14 : 2) + c.s)) * 0.5; c.pv.rotation.y = -c.s * (0.3 + st.attack * 0.4); });
      const ch = st.charged ? 1 : 0.2 + 0.2 * Math.sin(t * 6);
      elec.emissiveIntensity = 0.3 + ch * 1.6;
      sparks.forEach((s, i) => { s.visible = st.charged || Math.sin(t * 9 + i * 2) > 0.3; });
    }
    return { root, anim, height: 1.2 };
  }

  /* ---------- RUBBERMCFLY (butterfly; glows during the Sunear'Zikhron) ---------- */
  function buildMcFly(sp, kit) {
    const root = group(null);
    const body = group(root, 0, 1.2, 0);
    const bm = kit.mat(shadeHex(sp.color, -40));
    mesh(body, SPH(), bm, 0.5, 0.18, 0.18);
    mesh(body, SPH(), bm, 0.2, 0.18, 0.18, 0.5, 0.05, 0);
    mesh(body, CONE(), kit.mat('#e8b84a'), 0.06, 0.2, 0.06, 0.72, 0.02, 0).rotation.z = -Math.PI / 2;
    eyes(body, kit, 0.58, 0.12, 0.1, 0.06);
    const wm = kit.mat(sp.color, { side: THREE.DoubleSide, emissive: sp.color2, ei: 0.25, glow: true, rough: 0.5 });
    const wings = [];
    for (const s of [-1, 1]) { const w = group(body, 0, 0.05, s * 0.1); mesh(w, wingGeo('butterfly'), wm, 1.2, 1, 1.3 * s); wings.push({ g: w, s }); }
    for (const s of [-1, 1]) { const a = mesh(body, BONE(), bm, 0.02, 0.4, 0.02, 0.6, 0.1, s * 0.06); a.rotation.z = -0.5; a.rotation.x = s * 0.3; }
    function anim(st) {
      wings.forEach(w => { w.g.rotation.x = w.s * (0.2 + Math.sin(st.t * 10) * 0.9); });
      body.position.y = 1.2 + Math.sin(st.t * 3) * 0.12;
      wm.emissiveIntensity = st.biolum ? 1.1 : 0.15;
    }
    return { root, anim, height: 1.8 };
  }

  /* ---------- BIRD (Albali Byrd, Villtur, Kuni Byrd) ---------- */
  function buildBird(sp, kit) {
    const F = sp.features || {};
    const root = group(null);
    const col = sp.color, col2 = sp.color2;
    const feather = kit.mat(col, { rough: 0.85 });
    const dark = kit.mat(shadeHex(col, -30));
    const legLen = 0.55;
    const torso = group(root, 0, legLen + 0.45, 0);
    mesh(torso, SPH(), feather, 0.75, 0.48, 0.48);
    mesh(torso, SPH(), kit.mat(shadeHex(col, 25)), 0.6, 0.35, 0.4, 0.1, -0.12, 0).castShadow = false;
    const neck = group(torso, 0.55, 0.25, 0);
    const head = group(neck, 0.2, 0.3, 0);
    mesh(head, SPH(), feather, 0.3, 0.28, 0.26);
    const beak = mesh(head, CONE(), kit.mat('#e0b048', { rough: 0.4 }), 0.1, 0.38, 0.1, 0.22, -0.02, 0);
    beak.rotation.z = -Math.PI / 2;
    eyes(head, kit, 0.14, 0.08, 0.15, 0.07, { pupil: F.feral ? '#a01818' : '#15110c' });
    if (F.horns) {
      /* five red horns with their healing film */
      const hm = kit.mat(col2, { rough: 0.3, emissive: col2, ei: 0.25 });
      for (let i = 0; i < 5; i++) { const a = (i / 4 - 0.5) * 1.6; const h = mesh(head, CONE(), hm, 0.05, 0.32, 0.05, -0.05, 0.2, Math.sin(a) * 0.2); h.rotation.x = -a * 0.6; h.rotation.z = 0.5; }
    }
    if (sp.id === 'kuni_byrd_ridden') {
      /* saddle */
      mesh(torso, SPH(), kit.mat(col2), 0.3, 0.12, 0.42, -0.05, 0.4, 0);
    }
    const tail = group(torso, -0.7, 0.05, 0);
    for (let i = -2; i <= 2; i++) { const f = mesh(tail, wingGeo('petal'), kit.mat(shadeHex(col, -15), { side: THREE.DoubleSide }), 0.25, 1, 0.6); f.rotation.set(Math.PI / 2, 0, Math.PI / 2 + i * 0.22); }
    const wm = kit.mat(shadeHex(col, -10), { side: THREE.DoubleSide, rough: 0.85 });
    const wings = [];
    for (const s of [-1, 1]) { const w = group(torso, 0.05, 0.25, s * 0.35); mesh(w, wingGeo('bird'), wm, 1.3, 1, 1.8 * s); wings.push({ g: w, s }); }
    const legs = [];
    for (const s of [-1, 1]) {
      const pv = limb(torso, 0.05, -0.35, s * 0.18, legLen + 0.1, 0.07, kit.mat('#c8a048'));
      if (F.talons) for (let k = -1; k <= 1; k++) { const tl = mesh(pv, CONE(), dark, 0.03, 0.2, 0.03, 0.08, -legLen - 0.1, k * 0.06); tl.rotation.z = -1.4; }
      legs.push(pv);
    }
    function anim(st) {
      const t = st.t, mv = st.speed;
      const air = st.airborne;
      const flapRate = air ? 9 : 2.5;
      wings.forEach(w => { foldWing(w, air ? 1 : 0, Math.sin(t * flapRate) * 0.9, t); });
      legs.forEach((l, i) => { l.rotation.z = air ? 0.9 : Math.sin(t * 9 + i * Math.PI) * 0.6 * mv; });
      neck.rotation.z = Math.sin(t * 1.7) * 0.1 - st.attack * 0.5;
      torso.rotation.z = air ? -0.15 - st.attack * 0.5 : 0;
      torso.position.y = legLen + 0.45 + (air ? 0 : Math.abs(Math.sin(t * 9)) * 0.05 * mv);
    }
    return { root, anim, height: 1.6, flier: true };
  }

  /* ---------- COMPOSED (parts.js species: Kofi chick, Rodak lizard) ---------- */
  function buildComposed(sp, kit, st0) {
    const P = sp.parts || {};
    if (P.body === 'lizard') {
      const s2 = Object.assign({}, sp, { features: Object.assign({}, sp.features, { low: true, scaled: true }) });
      return buildQuad(s2, kit, st0);
    }
    /* chick-like: a soft round body, long ears, two little feet */
    const root = group(null);
    const fur = kit.mat(sp.color, { rough: 0.95 });
    const body = group(root, 0, 0.75, 0);
    mesh(body, SPH(), fur, 0.75 * (P.bodyW || 0.72) / 0.72, 0.7, 0.68);
    mesh(body, SPH(), kit.mat(shadeHex(sp.color, 28)), 0.5, 0.45, 0.5, 0.3, -0.1, 0).castShadow = false;
    eyes(body, kit, 0.55, 0.2, 0.25, 0.12);
    const ears = [];
    for (const s of [-1, 1]) { const e = group(body, 0.05, 0.55, s * 0.25); mesh(e, BONE(), fur, 0.14, 0.8, 0.08); e.rotation.x = s * -0.25; e.rotation.z = 0.35; ears.push(e); }
    const legs = [];
    for (const s of [-1, 1]) { const l = limb(body, 0.1, -0.55, s * 0.3, 0.22, 0.12, kit.mat(sp.color2)); legs.push(l); }
    function anim(st) {
      const t = st.t, mv = st.speed;
      body.position.y = 0.75 + Math.abs(Math.sin(t * 12)) * 0.25 * mv + Math.sin(t * 2.4) * 0.02;
      ears.forEach((e, i) => { e.rotation.z = 0.35 + Math.sin(t * 6 + i) * 0.15 * (0.3 + mv); });
      legs.forEach((l, i) => { l.rotation.z = Math.sin(t * 12 + i * Math.PI) * 0.7 * mv; });
    }
    return { root, anim, height: 1.9 };
  }

  const BUILDERS = {
    quad: buildQuad, punk: buildPunk, biped: buildBiped, flame: buildFlame, swarm: buildSwarm,
    tree: buildTree, stryx: buildStryx, kipsu: buildKipsu, mikolo: buildMikolo, gynge: buildGynge,
    hvaleia: buildHvaleia, lutut: buildLutut, blob: buildBlob, field: buildField, relic: buildRelicShard,
    crab: buildCrab, mcfly: buildMcFly, bird: buildBird, composed: buildComposed,
  };

  /* which creatures take to the air (display only — the sim is flat) */
  M3.isFlier = function (sp) {
    const F = sp.features || {};
    if (F.stationary || F.rooted || F.rootsOnDeploy) return false;
    return !!(F.wings || F.hover || sp.rig === 'mcfly' || sp.rig === 'flame');
  };

  /* build a full creature model: returns { root, kit, anim, height } */
  M3.build = function (sp, st0) {
    const kit = new Kit(sp);
    const fn = BUILDERS[sp.rig || 'quad'] || buildQuad;
    const m = fn(sp, kit, st0 || {});
    m.kit = kit;
    m.root.traverse(o => { if (o.isMesh) o.receiveShadow = false; });
    return m;
  };
  M3.Kit = Kit;
  M3.geo = { SPH, SPH_LO, HEMI, CYL, CONE, BOX, LIMB, BONE, wingGeo, rockGeo, pumpkinGeo };
  M3.mesh = mesh; M3.group = group;
})();
