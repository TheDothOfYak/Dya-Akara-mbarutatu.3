/* ============================================================
   DYA'AKARA — engine3d/render3d.js          (3D battle preview)
   A full 3D renderer for matches, built on three.js.

   It is a drop-in twin of engine/render.js: same constructor
   (canvas, match), same draw(dt) / toWorld / toScreen /
   drawMinimap, so the match screens and the simulation are
   untouched — the battle simply plays out in 3D. The sim stays
   flat (x, y); here world x → X, world y → Z, and height is Y.

   Switch:  ?2d=1 on the URL forces the classic 2D renderer,
            ?3d=1 forces 3D. The in-match camera panel also has
            a 2D/3D toggle (remembered per browser).
   Camera:  right-drag orbit · wheel zoom · middle-drag (or
            shift + right-drag) pan · Q / E rotate · two-finger
            pinch / twist on touch.
   ============================================================ */
(function () {
  'use strict';
  if (!window.THREE || !DYA.render || !DYA.models3d) return;
  const THREE = window.THREE;
  const U = DYA.util, SPR = DYA.sprites, SP = DYA.species, M3 = DYA.models3d;
  const TAU = Math.PI * 2;
  const Renderer2D = DYA.render.Renderer;
  const MODE_KEY = 'dya.renderMode';

  /* ---------------- which renderer? ---------------- */
  function want3D() {
    let q = null;
    try { q = new URLSearchParams(location.search); } catch (e) { /* ignore */ }
    if (q && q.has('2d')) return false;
    if (q && q.has('3d')) return true;
    try { const v = localStorage.getItem(MODE_KEY); if (v) return v !== '2d'; } catch (e) { /* ignore */ }
    return true;
  }
  let glOK = null;
  function webglOK() {
    if (glOK == null) {
      try { const c = document.createElement('canvas'); glOK = !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
      catch (e) { glOK = false; }
    }
    return glOK;
  }

  function settings() {
    const me = DYA.state && DYA.state.me;
    return (me && me.settings && me.settings.display) || { quality: 'high', particles: true, bioluminescence: true, holographic: true, colorblind: false };
  }
  function col(hex) { return new THREE.Color(hex); }
  function shade(hex, amt) { return SPR.shade(hex, amt); }
  function hash(n) { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); }

  /* soft radial glow texture shared by every glow sprite */
  let glowTex = null;
  function glowTexture() {
    if (glowTex) return glowTex;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    gr.addColorStop(0.6, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    glowTex = new THREE.CanvasTexture(c);
    return glowTex;
  }
  function glowSprite(color, size, opacity) {
    const m = new THREE.SpriteMaterial({ map: glowTexture(), color: col(color), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: opacity == null ? 1 : opacity });
    const s = new THREE.Sprite(m);
    s.scale.set(size, size, 1);
    return s;
  }
  function basic(color, o) {
    o = o || {};
    return new THREE.MeshBasicMaterial({ color: col(color), transparent: true, opacity: o.opacity == null ? 1 : o.opacity, side: o.side || THREE.FrontSide, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !o.add && !o.noDepth });
  }
  function std(color, o) {
    o = o || {};
    const m = new THREE.MeshStandardMaterial({ color: col(color), roughness: o.rough != null ? o.rough : 0.85, metalness: o.metal || 0, flatShading: !!o.flat, side: o.side || THREE.FrontSide });
    if (o.emissive) { m.emissive = col(o.emissive); m.emissiveIntensity = o.ei == null ? 1 : o.ei; }
    if (o.opacity != null) { m.transparent = true; m.opacity = o.opacity; }
    return m;
  }
  const GEO = M3.geo;
  function mesh(parent, g, m, sx, sy, sz, x, y, z, shadow) {
    const o = new THREE.Mesh(g, m);
    o.scale.set(sx, sy == null ? sx : sy, sz == null ? sx : sz);
    o.position.set(x || 0, y || 0, z || 0);
    o.castShadow = shadow !== false; o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  /* flat geometry lying on the ground (XZ), double-sided */
  const ringGeoCache = {};
  function ringGeo(inner, segs) {
    const k = inner + ':' + (segs || 48);
    if (!ringGeoCache[k]) { const g = new THREE.RingGeometry(inner, 1, segs || 48); g.rotateX(-Math.PI / 2); ringGeoCache[k] = g; }
    return ringGeoCache[k];
  }
  let discG = null;
  function discGeo() { if (!discG) { discG = new THREE.CircleGeometry(1, 40); discG.rotateX(-Math.PI / 2); } return discG; }

  /* dispose everything under an object that it owns (shared geometry is kept) */
  const SHARED_GEOS = new Set();
  function disposeTree(obj) {
    obj.traverse(o => {
      if (o.geometry && o.userData.ownGeo) o.geometry.dispose();
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach(m => { if (!m.userData.shared) m.dispose(); });
      }
    });
    if (obj.parent) obj.parent.remove(obj);
  }

  /* ================================================================
     RENDERER
     ================================================================ */
  function Renderer3D(canvas, match) {
    const R = this;
    R.is3D = true;
    R.canvas = canvas;
    R.match = match;
    R.t = 0;
    R.frame = 0;
    R.gl = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    R.gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    R.gl.shadowMap.enabled = settings().quality !== 'low';
    R.gl.shadowMap.type = THREE.PCFSoftShadowMap;
    R.scene = new THREE.Scene();
    R.camera = new THREE.PerspectiveCamera(34, 1, 10, 16000);
    const W = match.world.w, H = match.world.h;
    R.cam = { yaw: 0, pitch: 0.92, zoom: 1, tx: W / 2, tz: H / 2 + 20, fit: 1800, fitKey: '' };
    R.objs = { creatures: new Map(), structures: new Map(), zones: new Map(), relics: new Map(), pickups: new Map(), orbs: new Map(), proj: new Map(), fx: new Map(), remnants: new Map() };
    R.ray = new THREE.Raycaster();
    R.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    R.v3 = new THREE.Vector3();
    R.keys = {};
    R.buildWorld();
    R.bindControls();
    /* dispose the GL context once the match screen is gone */
    R.watch = setInterval(() => { if (!canvas.isConnected) R.dispose(); }, 1500);
  }
  const P3 = Renderer3D.prototype;

  /* ---------------- static world: sky, ground, arena, lights, props ---------------- */
  P3.buildWorld = function () {
    const R = this, M = R.match, S = R.scene, T = M.terrain;
    const W = M.world.w, H = M.world.h;
    const sky = SKIES[T.id] || SKIES.plains;
    R.sky = sky;

    /* sky dome: a vertical gradient */
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: col(sky.top) }, mid: { value: col(sky.horizon) }, bot: { value: col(sky.bottom) }, zik: { value: 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform float zik; varying vec3 vP; void main(){ float h = normalize(vP - cameraPosition).y; vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.55)) : mix(mid, bot, pow(-h, 0.4)); c = mix(c, vec3(0.32,0.82,0.86), zik * 0.35 * (1.0 - abs(h))); gl_FragColor = vec4(c, 1.0); }',
    });
    R.skyMat = skyMat;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(12000, 32, 16), skyMat);
    dome.position.set(W / 2, 0, H / 2);
    S.add(dome);
    S.fog = new THREE.Fog(col(sky.horizon), 4200, 11000);

    /* lights */
    R.hemi = new THREE.HemisphereLight(col(sky.hemiSky), col(sky.hemiGround), 0.55);
    S.add(R.hemi);
    const sun = new THREE.DirectionalLight(col(sky.sun), 0.9);
    sun.position.set(W / 2 - 700, 1500, H / 2 + 650);
    sun.target.position.set(W / 2, 0, H / 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -1150; sc.right = 1150; sc.top = 950; sc.bottom = -950; sc.near = 200; sc.far = 3600;
    sun.shadow.bias = -0.0006;
    S.add(sun); S.add(sun.target);
    R.sun = sun;

    /* the playing field — painted ground texture in sim coordinates */
    const tex = new THREE.CanvasTexture(paintGround(M));
    tex.anisotropy = 4;
    const field = new THREE.Mesh(new THREE.PlaneGeometry(W, H, 1, 1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    field.rotation.x = -Math.PI / 2;
    field.position.set(W / 2, 0, H / 2);
    field.receiveShadow = true;
    S.add(field);

    /* surrounding land beyond the arena */
    const outer = new THREE.Mesh(new THREE.CircleGeometry(9000, 64), new THREE.MeshStandardMaterial({ color: col(shade(T.ground, -22)), roughness: 1 }));
    outer.rotation.x = -Math.PI / 2;
    outer.position.set(W / 2, -1.5, H / 2);
    outer.receiveShadow = true;
    S.add(outer);
    R.buildArenaFrame();
    R.buildSurroundings();
    R.buildProps();
    R.buildHoards();
    R.buildMotes();
  };

  /* per-terrain sky palettes */
  const SKIES = {
    plains: { top: '#3d6fa8', horizon: '#c9d8d0', bottom: '#4a5236', hemiSky: '#cfe2ff', hemiGround: '#5d5a3a', sun: '#fff1d6' },
    forest: { top: '#2f5a7a', horizon: '#a9c4b0', bottom: '#2c3a24', hemiSky: '#c4dccc', hemiGround: '#3a4a2a', sun: '#ffefcf' },
    mountain: { top: '#48607e', horizon: '#c4c8cc', bottom: '#45413c', hemiSky: '#d6dcea', hemiGround: '#55504a', sun: '#fff4e2' },
    desert: { top: '#4a7ab8', horizon: '#f0d9a8', bottom: '#8a7048', hemiSky: '#fff0d2', hemiGround: '#8a7046', sun: '#fff0cc' },
    ocean: { top: '#2f6a9a', horizon: '#bfe0e8', bottom: '#2a5a6a', hemiSky: '#d2ecff', hemiGround: '#3a6a6a', sun: '#fff6e2' },
    eldi_aagac: { top: '#3a2a3a', horizon: '#d8875a', bottom: '#3a2620', hemiSky: '#ffc8a0', hemiGround: '#4a2a20', sun: '#ffc890' },
    elsharyn: { top: '#16263a', horizon: '#4a8a8a', bottom: '#1c2a28', hemiSky: '#9ae8e0', hemiGround: '#2a3a36', sun: '#d8fff6' },
    arpeggio: { top: '#4a6a9a', horizon: '#e8d8b8', bottom: '#6a5a40', hemiSky: '#fff2dc', hemiGround: '#6a5a40', sun: '#fff0d0' },
    spire_cliffs: { top: '#2a2a48', horizon: '#9a8aa8', bottom: '#2a2830', hemiSky: '#d8cce8', hemiGround: '#44404a', sun: '#ffe8f0' },
  };

  /* ground texture: gradient, mottling, fine grain, faint arena markings */
  function paintGround(M) {
    const W = M.world.w, H = M.world.h, T = M.terrain;
    const sc = 1.25;
    const c = document.createElement('canvas'); c.width = Math.round(W * sc); c.height = Math.round(H * sc);
    const g = c.getContext('2d');
    g.scale(sc, sc);
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, shade(T.ground, 8)); gr.addColorStop(1, shade(T.ground, -10));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const rng = new U.Rng(M.seed ^ 0x51);
    for (let i = 0; i < 90; i++) {
      const x = rng.next() * W, y = rng.next() * H, r = 18 + rng.next() * 80;
      g.fillStyle = (i % 3 ? T.accent : shade(T.ground, -18)) + '2a';
      g.beginPath(); g.ellipse(x, y, r, r * (0.5 + rng.next() * 0.4), rng.next() * 3, 0, TAU); g.fill();
    }
    /* fine grain */
    for (let i = 0; i < 9000; i++) {
      const x = rng.next() * W, y = rng.next() * H;
      g.fillStyle = rng.next() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';
      g.fillRect(x, y, 1.6, 1.6);
    }
    /* worn paths between the hoards */
    g.strokeStyle = shade(T.ground, 18) + '30'; g.lineWidth = 46; g.lineCap = 'round';
    g.beginPath(); g.moveTo(140, H / 2); g.bezierCurveTo(W * 0.35, H * 0.38, W * 0.65, H * 0.62, W - 140, H / 2); g.stroke();
    /* arena markings: center circle + midline, very faint */
    g.strokeStyle = 'rgba(255,240,210,0.12)'; g.lineWidth = 3;
    g.beginPath(); g.arc(W / 2, H / 2, 120, 0, TAU); g.stroke();
    g.setLineDash([18, 14]);
    g.beginPath(); g.moveTo(W / 2, 30); g.lineTo(W / 2, H - 30); g.stroke();
    g.setLineDash([]);
    /* soft dark vignette at the field edge */
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.28)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    return c;
  }

  /* the arena wall, corner towers with braziers, and team banners */
  P3.buildArenaFrame = function () {
    const R = this, M = R.match, S = R.scene, W = M.world.w, H = M.world.h;
    const frame = new THREE.Group(); S.add(frame);
    const stone = std('#6e655a', { flat: true, rough: 0.95 });
    const capStone = std('#857b6c', { flat: true, rough: 0.9 });
    const pad = 26, wh = 30, th = 26;
    const walls = [
      [W / 2, -pad, W + pad * 2 + th, th], [W / 2, H + pad, W + pad * 2 + th, th],
      [-pad, H / 2, th, H + pad * 2], [W + pad, H / 2, th, H + pad * 2],
    ];
    for (const [x, z, sx, sz] of walls) {
      mesh(frame, GEO.BOX(), stone, sx, wh, sz, x, wh / 2, z);
      mesh(frame, GEO.BOX(), capStone, sx + 6, 5, sz + 6, x, wh + 2.5, z);
    }
    R.braziers = [];
    const corners = [[-pad, -pad], [W + pad, -pad], [-pad, H + pad], [W + pad, H + pad], [W / 2, -pad], [W / 2, H + pad]];
    corners.forEach(([x, z], i) => {
      const big = i < 4;
      const hgt = big ? 90 : 60;
      mesh(frame, GEO.CYL(), stone, big ? 30 : 20, hgt, big ? 30 : 20, x, hgt / 2, z);
      mesh(frame, GEO.CYL(), capStone, big ? 36 : 25, 8, big ? 36 : 25, x, hgt + 4, z);
      /* brazier fire */
      const fire = mesh(frame, GEO.CONE(), basic('#ff9a2a', { add: true, opacity: 0.8 }), big ? 13 : 9, big ? 30 : 20, big ? 13 : 9, x, hgt + 8, z, false);
      const gl = glowSprite('#ff8a2a', big ? 70 : 48, 0.5);
      gl.position.set(x, hgt + 22, z);
      frame.add(gl);
      R.braziers.push({ fire, gl, seed: i });
    });
    /* team banners along the walls behind each hoard */
    M.teams.forEach((Tm, i) => {
      if (Tm.controller === 'wild' || !Tm.hoard) return;
      const hx = Tm.hoard.x, hz = Tm.hoard.y;
      /* nearest wall point */
      const cands = [[hx, -pad], [hx, H + pad], [-pad, hz], [W + pad, hz]];
      let best = cands[0], bd = 1e9;
      for (const c of cands) { const d = Math.hypot(c[0] - hx, c[1] - hz); if (d < bd) { bd = d; best = c; } }
      for (const off of [-70, 70]) {
        const along = best[0] === hx ? [off, 0] : [0, off];
        const x = best[0] + along[0], z = best[1] + along[1];
        mesh(frame, GEO.CYL(), std('#4a3520'), 2.5, 110, 2.5, x, 55, z);
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(30, 56, 4, 6), std(Tm.color, { side: THREE.DoubleSide, rough: 0.9 }));
        cloth.userData.ownGeo = true;
        cloth.position.set(x, 76, z);
        if (best[0] === hx) cloth.position.x += 16; else { cloth.rotation.y = Math.PI / 2; cloth.position.z += 16; }
        cloth.castShadow = true;
        frame.add(cloth);
        (R.flags = R.flags || []).push(cloth);
      }
    });
  };

  /* far scenery: stands with a crowd on three sides, hills and terrain dressing */
  P3.buildSurroundings = function () {
    const R = this, M = R.match, S = R.scene, W = M.world.w, H = M.world.h, T = M.terrain;
    const rng = new U.Rng((M.seed || 1) ^ 0x7a11);
    const stand = std('#6e6456', { flat: true });
    const stand2 = std('#5c5448', { flat: true });
    const tiers = 5, step = 26, rise = 18;
    const seats = [];
    function standRow(cx, cz, len, along, out) {
      for (let k = 0; k < tiers; k++) {
        const d = 70 + k * step, h = 10 + k * rise;
        const x = cx + out[0] * d, z = cz + out[1] * d;
        mesh(S, GEO.BOX(), k % 2 ? stand : stand2, along[0] ? len : step, h, along[0] ? step : len, x, h / 2, z);
        for (let s = -len / 2 + 10; s < len / 2 - 10; s += 13) {
          if (rng.next() < 0.18) continue;
          seats.push([x + along[0] * s + (rng.next() - 0.5) * 4, h + 7, z + along[1] * s + (rng.next() - 0.5) * 4]);
        }
      }
    }
    standRow(W / 2, -26, W - 140, [1, 0], [0, -1]);
    standRow(-26, H / 2, H - 120, [0, 1], [-1, 0]);
    standRow(W + 26, H / 2, H - 120, [0, 1], [1, 0]);
    /* the crowd: one instanced mesh, gently bouncing */
    const n = seats.length;
    const crowdGeo = new THREE.CapsuleGeometry(3.2, 5, 2, 6);
    const crowd = new THREE.InstancedMesh(crowdGeo, std('#ffffff', { rough: 0.9 }), n);
    const m4 = new THREE.Matrix4();
    const palette = ['#c14953', '#3b6ea8', '#d9b23a', '#4caf50', '#8a6f42', '#a87ac8', '#e8e0c8', '#5a4a3a', '#d97c2b'];
    seats.forEach((p, i) => { m4.makeTranslation(p[0], p[1], p[2]); crowd.setMatrixAt(i, m4); crowd.setColorAt(i, col(palette[Math.floor(rng.next() * palette.length)])); });
    crowd.castShadow = false;
    S.add(crowd);
    R.crowd = { mesh: crowd, seats };
    /* hills and terrain dressing beyond the arena */
    const hillMat = std(shade(T.ground, -28), { flat: true, rough: 1 });
    const accentMat = std(shade(T.accent, -10), { flat: true });
    for (let i = 0; i < 26; i++) {
      const a = rng.next() * TAU, d = 1250 + rng.next() * 1600;
      const x = W / 2 + Math.cos(a) * d * 1.2, z = H / 2 + Math.sin(a) * d;
      const s = 200 + rng.next() * 380;
      const kind = T.id === 'mountain' || T.id === 'spire_cliffs' ? 'peak' : T.id === 'desert' ? 'dune' : 'hill';
      if (kind === 'peak') mesh(S, GEO.CONE(), hillMat, s * 0.8, s * (1.2 + rng.next()), s * 0.8, x, -5, z, false);
      else mesh(S, GEO.SPH_LO(), hillMat, s, s * (kind === 'dune' ? 0.18 : 0.35), s * 0.8, x, 0, z, false);
    }
    /* a ring of treeline / rocks between stands and hills */
    const treeTerr = { forest: 1, elsharyn: 1, eldi_aagac: 1, plains: 0.4, ocean: 0.2, arpeggio: 0.2 };
    const tf = treeTerr[T.id] || 0;
    const trunk = std('#4a3520'), leaf = std(shade(T.accent, -12), { flat: true });
    for (let i = 0; i < 140; i++) {
      const a = rng.next() * TAU, d = 950 + rng.next() * 500;
      const x = W / 2 + Math.cos(a) * d * 1.15, z = H / 2 + Math.sin(a) * d * 0.95;
      if (rng.next() < tf) {
        const s = 1.3 + rng.next() * 1.4;
        mesh(S, GEO.CYL(), trunk, 5 * s, 30 * s, 5 * s, x, 15 * s, z, false);
        mesh(S, GEO.CONE(), leaf, 24 * s, 60 * s, 24 * s, x, 22 * s, z, false);
      } else if (rng.next() < 0.5) {
        const s = 14 + rng.next() * 30;
        mesh(S, M3.geo.rockGeo(i), hillMat, s, s * 0.7, s, x, s * 0.2, z, false);
      }
    }
  };

  /* terrain props — trees, rocks, spires, pillars, banners, dunes, grass, embers */
  P3.buildProps = function () {
    const R = this, M = R.match, S = R.scene, T = M.terrain;
    if (R.propGroup) disposeTree(R.propGroup);
    const grp = new THREE.Group(); S.add(grp);
    R.propGroup = grp; R.propCount = M.props.length; R.swayers = []; R.emberSets = [];
    const trunk = std('#4a3520'), leafA = std(shade(T.accent, -6), { flat: true }), leafB = std(shade(T.accent, 12), { flat: true });
    const rock = std(shade(T.ground, -30), { flat: true, rough: 1 }), rockB = std(shade(T.ground, -12), { flat: true });
    const grass = std(shade(T.accent, 14), { side: THREE.DoubleSide });
    for (const p of M.props) {
      const s = p.s, g = new THREE.Group();
      g.position.set(p.x, 0, p.y);
      g.rotation.y = (p.seed % 628) / 100;
      switch (p.kind) {
        case 'trees': {
          mesh(g, GEO.CYL(), trunk, 5 * s, 34 * s, 5 * s, 0, 17 * s, 0);
          const crown = new THREE.Group(); crown.position.y = 34 * s; g.add(crown);
          mesh(crown, M3.geo.rockGeo(p.seed), leafA, 24 * s, 22 * s, 24 * s, 0, 4 * s, 0);
          mesh(crown, M3.geo.rockGeo(p.seed + 1), leafB, 15 * s, 14 * s, 15 * s, -8 * s, 18 * s, 4 * s);
          R.swayers.push({ o: crown, seed: p.seed, amp: 0.04 });
          break;
        }
        case 'firetrees': {
          mesh(g, GEO.CYL(), std('#3d2a20'), 6 * s, 40 * s, 6 * s, 0, 20 * s, 0);
          const crown = new THREE.Group(); crown.position.y = 40 * s; g.add(crown);
          mesh(crown, M3.geo.rockGeo(p.seed), std('#e8842c', { emissive: '#e8642c', ei: 0.7, flat: true }), 22 * s, 20 * s, 22 * s, 0, 4 * s, 0);
          mesh(crown, M3.geo.rockGeo(p.seed + 2), std('#ffd24a', { emissive: '#ffb03a', ei: 0.8, flat: true }), 12 * s, 11 * s, 12 * s, 6 * s, 16 * s, 0);
          const gl = glowSprite('#ff9a3a', 90 * s, 0.45); gl.position.y = 46 * s; g.add(gl);
          R.swayers.push({ o: crown, seed: p.seed, amp: 0.07, glow: gl });
          break;
        }
        case 'glowmoss': {
          const m = mesh(g, discGeo(), basic('#68e0c8', { opacity: 0.55, add: true }), 18 * s, 1, 10 * s, 0, 0.6, 0, false);
          R.swayers.push({ o: m, seed: p.seed, pulse: true });
          for (let i = 0; i < 5; i++) mesh(g, GEO.SPH_LO(), std('#68e0c8', { emissive: '#68e0c8', ei: 0.9 }), 2.5 * s, 2 * s, 2.5 * s, (hash(i + p.seed) - 0.5) * 24 * s, 1.5, (hash(i + p.seed + 7) - 0.5) * 12 * s, false);
          break;
        }
        case 'rocks': case 'cliffs': {
          const big = p.kind === 'cliffs' ? 1.6 : 1;
          mesh(g, M3.geo.rockGeo(p.seed), rock, 17 * s * big, 13 * s * big, 14 * s * big, 0, 5 * s * big, 0);
          mesh(g, M3.geo.rockGeo(p.seed + 3), rockB, 9 * s * big, 8 * s * big, 9 * s * big, 12 * s, 3 * s, 7 * s);
          break;
        }
        case 'spires': {
          mesh(g, GEO.CONE(), std(shade(T.accent, -20), { flat: true }), 12 * s, 85 * s, 12 * s, 0, 0, 0);
          mesh(g, GEO.CONE(), std(shade(T.accent, -32), { flat: true }), 7 * s, 45 * s, 7 * s, 10 * s, 0, 6 * s);
          break;
        }
        case 'pillars': {
          const pm = std(shade(T.accent, 8), { flat: true });
          mesh(g, GEO.CYL(), pm, 8 * s, 60 * s, 8 * s, 0, 30 * s, 0);
          mesh(g, GEO.BOX(), pm, 22 * s, 7 * s, 22 * s, 0, 63 * s, 0);
          mesh(g, GEO.BOX(), pm, 20 * s, 5 * s, 20 * s, 0, 2.5 * s, 0);
          break;
        }
        case 'banners': {
          mesh(g, GEO.CYL(), trunk, 1.6 * s, 60 * s, 1.6 * s, 0, 30 * s, 0);
          const cloth = new THREE.Mesh(new THREE.PlaneGeometry(18 * s, 26 * s, 3, 4), std(['#8a1c1c', '#31576b', '#43572f'][p.seed % 3], { side: THREE.DoubleSide }));
          cloth.userData.ownGeo = true;
          cloth.position.set(9 * s, 46 * s, 0); cloth.castShadow = true;
          g.add(cloth);
          R.swayers.push({ o: cloth, seed: p.seed, flag: true });
          break;
        }
        case 'dunes': {
          mesh(g, GEO.SPH_LO(), std(shade(T.ground, 10), { flat: true }), 36 * s, 7 * s, 14 * s, 0, 0, 0, false);
          break;
        }
        case 'grass': {
          for (let i = 0; i < 7; i++) {
            const b = mesh(g, GEO.CONE(), grass, 1.4, (9 + hash(i + p.seed) * 6) * s, 1.4, (i - 3) * 3 * s, 0, (hash(i * 3 + p.seed) - 0.5) * 8, false);
            b.rotation.z = (hash(i + p.seed * 2) - 0.5) * 0.5;
          }
          R.swayers.push({ o: g, seed: p.seed, amp: 0.05, grass: true });
          break;
        }
        case 'embers': {
          const pts = [];
          for (let i = 0; i < 6; i++) { const e = glowSprite('#ffb03a', 6, 0.9); g.add(e); pts.push(e); }
          R.emberSets.push({ pts, seed: p.seed });
          break;
        }
        default: break;
      }
      grp.add(g);
    }
  };

  /* team hoards — a ring, a treasure chest, a coin pile and a glow */
  P3.buildHoards = function () {
    const R = this, M = R.match, S = R.scene;
    R.hoards = [];
    M.teams.forEach((Tm, i) => {
      if (Tm.controller === 'wild' || !Tm.hoard) return;
      const g = new THREE.Group(); g.position.set(Tm.hoard.x, 0, Tm.hoard.y); S.add(g);
      mesh(g, discGeo(), basic(Tm.color, { opacity: 0.12 }), 70, 1, 52, 0, 0.5, 0, false);
      mesh(g, ringGeo(0.94, 64), basic(Tm.color, { opacity: 0.55, side: THREE.DoubleSide }), 70, 1, 52, 0, 0.7, 0, false);
      const wood = std('#6d4a2e'), band = std('#d9b23a', { metal: 0.6, rough: 0.35 });
      mesh(g, GEO.BOX(), wood, 30, 16, 20, 0, 8, 0);
      const lid = mesh(g, GEO.CYL(), wood, 10, 30, 10, 0, 16, 0); lid.rotation.z = Math.PI / 2; lid.scale.set(10, 30, 10);
      mesh(g, GEO.BOX(), band, 31, 3, 21, 0, 9, 0);
      mesh(g, GEO.BOX(), band, 4, 6, 21.5, 0, 12, 0);
      const gold = std('#e8c25a', { metal: 0.7, rough: 0.3, emissive: '#5a4210', ei: 0.4 });
      for (let k = 0; k < 18; k++) {
        const a = hash(k + i * 31) * TAU, d = 16 + hash(k + 5) * 16;
        const c = mesh(g, GEO.CYL(), gold, 3.6, 1.2, 3.6, Math.cos(a) * d, 0.8 + hash(k) * 3, Math.sin(a) * d * 0.8, false);
        c.rotation.set(hash(k + 1) * 0.6, 0, hash(k + 2) * 0.6);
      }
      const gl = glowSprite(Tm.color, 150, 0.32); gl.position.y = 18; g.add(gl);
      R.hoards.push({ g, gl, team: i });
    });
  };

  /* Sunear'Zikhron memory motes (shown only while the storm passes) */
  P3.buildMotes = function () {
    const R = this, M = R.match;
    const n = 220, pos = new Float32Array(n * 3);
    R.moteSeeds = [];
    for (let i = 0; i < n; i++) R.moteSeeds.push([hash(i) * M.world.w, 20 + hash(i + 3) * 160, hash(i + 7) * M.world.h, 30 + hash(i + 11) * 70]);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: col('#b4f0f4'), size: 7, map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    R.motes = new THREE.Points(g, m);
    R.motes.frustumCulled = false;
    R.scene.add(R.motes);
  };

  /* ================================================================
     CAMERA
     ================================================================ */
  P3.camPose = function (dist) {
    const c = this.cam, cp = Math.cos(c.pitch);
    return [c.tx + Math.sin(c.yaw) * cp * dist, Math.sin(c.pitch) * dist, c.tz + Math.cos(c.yaw) * cp * dist];
  };
  /* distance at which the whole field fits the view (leaving room for the HUD) */
  P3.fitDistance = function () {
    const R = this, c = R.cam, M = R.match, cam = R.camera;
    const key = [c.yaw.toFixed(3), c.pitch.toFixed(3), cam.aspect.toFixed(3), c.tx | 0, c.tz | 0].join('|');
    if (key === c.fitKey) return c.fit;
    const W = M.world.w, H = M.world.h;
    const pts = [[0, 0], [W, 0], [0, H], [W, H], [W / 2, 0], [W / 2, H], [0, H / 2], [W, H / 2]];
    let lo = 300, hi = 9000;
    for (let it = 0; it < 22; it++) {
      const mid = (lo + hi) / 2;
      const p = R.camPose(mid);
      cam.position.set(p[0], p[1], p[2]); cam.lookAt(c.tx, 0, c.tz); cam.updateMatrixWorld();
      let ok = true;
      for (const q of pts) {
        R.v3.set(q[0], 0, q[1]).project(cam);
        if (R.v3.z > 1 || Math.abs(R.v3.x) > 0.97 || R.v3.y > 0.9 || R.v3.y < -0.74) { ok = false; break; }
      }
      if (ok) hi = mid; else lo = mid;
    }
    c.fit = hi; c.fitKey = key;
    return hi;
  };
  P3.updateCamera = function (dt) {
    const R = this, c = R.cam;
    if (R.keys.q) c.yaw -= dt * 1.2;
    if (R.keys.e) c.yaw += dt * 1.2;
    /* fit uses the centred target so zoom stays stable while panning */
    const ctx = c.tx, ctz = c.tz;
    c.tx = R.match.world.w / 2; c.tz = R.match.world.h / 2 + 20;
    const fit = R.fitDistance();
    c.tx = ctx; c.tz = ctz;
    const dist = fit * c.zoom;
    const p = R.camPose(dist);
    const shake = R.shake > 0 ? R.shake : 0;
    R.camera.position.set(p[0] + (Math.random() - 0.5) * shake, p[1] + (Math.random() - 0.5) * shake, p[2]);
    R.camera.lookAt(c.tx, 0, c.tz);
    R.camera.updateMatrixWorld();
    if (R.shake > 0) R.shake = Math.max(0, R.shake - dt * 30);
  };
  P3.resetView = function (top) {
    const c = this.cam, M = this.match;
    c.yaw = 0; c.pitch = top ? 1.45 : 0.92; c.zoom = 1; c.tx = M.world.w / 2; c.tz = M.world.h / 2 + 20;
  };

  P3.bindControls = function () {
    const R = this, cv = R.canvas, c = R.cam;
    let drag = null;
    const onDown = (e) => {
      if (e.button === 2 || e.button === 1) {
        e.preventDefault();
        drag = { x: e.clientX, y: e.clientY, pan: e.button === 1 || e.shiftKey };
      }
    };
    const onMove = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      if (drag.pan) {
        const k = R.cam.fit * c.zoom * 0.0012;
        const sy = Math.sin(c.yaw), cy = Math.cos(c.yaw);
        c.tx -= (dx * cy + dy * sy) * k;
        c.tz -= (-dx * sy + dy * cy) * k;
        const M = R.match;
        c.tx = Math.max(-200, Math.min(M.world.w + 200, c.tx));
        c.tz = Math.max(-200, Math.min(M.world.h + 200, c.tz));
      } else {
        c.yaw -= dx * 0.006;
        c.pitch = Math.max(0.32, Math.min(1.5, c.pitch + dy * 0.004));
      }
    };
    const onUp = () => { drag = null; };
    const onWheel = (e) => {
      e.preventDefault();
      c.zoom = Math.max(0.28, Math.min(1.7, c.zoom * Math.exp(e.deltaY * 0.0011)));
    };
    const onCtx = (e) => e.preventDefault();
    /* two-finger touch: pinch to zoom, twist / sideways drag to orbit */
    const touches = new Map();
    let pinch = null;
    const tDown = (e) => { if (e.pointerType !== 'touch') return; touches.set(e.pointerId, [e.clientX, e.clientY]); if (touches.size === 2) pinch = snap(); };
    const tMove = (e) => {
      if (e.pointerType !== 'touch' || !touches.has(e.pointerId)) return;
      touches.set(e.pointerId, [e.clientX, e.clientY]);
      if (touches.size === 2 && pinch) {
        const s = snap();
        c.zoom = Math.max(0.28, Math.min(1.7, c.zoom * pinch.d / Math.max(10, s.d)));
        c.yaw -= (s.mx - pinch.mx) * 0.006;
        c.pitch = Math.max(0.32, Math.min(1.5, c.pitch + (s.my - pinch.my) * 0.004));
        pinch = s;
      }
    };
    const tUp = (e) => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; };
    function snap() {
      const v = [...touches.values()];
      return { d: Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]), mx: (v[0][0] + v[1][0]) / 2, my: (v[0][1] + v[1][1]) / 2 };
    }
    const kDown = (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = (e.key || '').toLowerCase();
      if (k === 'q' || k === 'e') R.keys[k] = true;
    };
    const kUp = (e) => { const k = (e.key || '').toLowerCase(); if (k === 'q' || k === 'e') R.keys[k] = false; };
    cv.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    cv.addEventListener('wheel', onWheel, { passive: false });
    cv.addEventListener('contextmenu', onCtx);
    cv.addEventListener('pointerdown', tDown);
    cv.addEventListener('pointermove', tMove);
    window.addEventListener('pointerup', tUp);
    window.addEventListener('pointercancel', tUp);
    document.addEventListener('keydown', kDown);
    document.addEventListener('keyup', kUp);
    R.unbind = () => {
      cv.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      cv.removeEventListener('wheel', onWheel);
      cv.removeEventListener('contextmenu', onCtx);
      cv.removeEventListener('pointerdown', tDown);
      cv.removeEventListener('pointermove', tMove);
      window.removeEventListener('pointerup', tUp);
      window.removeEventListener('pointercancel', tUp);
      document.removeEventListener('keydown', kDown);
      document.removeEventListener('keyup', kUp);
    };
  };

  /* small camera panel over the field */
  P3.ensureUi = function () {
    const R = this, cv = R.canvas, par = cv.parentNode;
    if (!par) return;
    if (!R.overlay || R.overlay.parentNode !== par) {
      R.overlay = document.createElement('canvas');
      R.overlay.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
      par.insertBefore(R.overlay, cv.nextSibling);
      R.octx = R.overlay.getContext('2d');
    }
    if (!R.panel || R.panel.parentNode !== par) {
      const p = document.createElement('div');
      p.className = 'cam3d-panel';
      p.style.cssText = 'position:absolute;left:14px;top:96px;z-index:30;display:flex;flex-direction:column;gap:4px;';
      const mk = (txt, title, fn) => {
        const b = document.createElement('button');
        b.className = 'btn small ghost'; b.textContent = txt; b.title = title;
        b.style.cssText = 'min-width:38px;padding:4px 6px;font-size:13px;color:#f0e2c0;background:rgba(20,16,11,0.72);border:1px solid #6a5a3e;border-radius:6px;cursor:pointer;';
        b.addEventListener('click', (e) => { e.stopPropagation(); fn(); b.blur(); });
        p.appendChild(b);
        return b;
      };
      mk('⟲', 'Rotate left (Q) — or right-drag the field', () => { R.cam.yaw -= Math.PI / 4; });
      mk('⟳', 'Rotate right (E)', () => { R.cam.yaw += Math.PI / 4; });
      mk('⊕', 'Zoom in (mouse wheel)', () => { R.cam.zoom = Math.max(0.28, R.cam.zoom * 0.8); });
      mk('⊖', 'Zoom out', () => { R.cam.zoom = Math.min(1.7, R.cam.zoom * 1.25); });
      mk('⌂', 'Reset view', () => R.resetView(false));
      mk('▦', "Bird's-eye view", () => R.resetView(true));
      mk('2D', 'Use the classic 2D battle view from the next match', () => {
        try { localStorage.setItem(MODE_KEY, '2d'); } catch (e) { /* ignore */ }
        if (DYA.ui && DYA.ui.toast) DYA.ui.toast({ title: '2D view next match', body: 'The classic 2D battle view will be used from your next match. Add ?3d=1 to the address, or use the 3D button there, to come back.', icon: '🗺' });
      });
      par.appendChild(p);
      R.panel = p;
    }
  };

  P3.dispose = function () {
    const R = this;
    if (R.disposed) return;
    R.disposed = true;
    clearInterval(R.watch);
    if (R.unbind) R.unbind();
    if (R.panel) R.panel.remove();
    if (R.overlay) R.overlay.remove();
    R.scene.traverse(o => {
      if (o.geometry && o.userData.ownGeo) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
    });
    R.gl.dispose();
    try { R.gl.forceContextLoss(); } catch (e) { /* ignore */ }
  };

  /* ================================================================
     COORDINATES
     ================================================================ */
  P3.resize = function () {
    const R = this, cv = R.canvas;
    const w = cv.clientWidth || 1, h = cv.clientHeight || 1;
    if (R.w !== w || R.h !== h) {
      R.w = w; R.h = h;
      R.gl.setSize(w, h, false);
      R.camera.aspect = w / h;
      R.camera.updateProjectionMatrix();
    }
    if (R.overlay) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (R.overlay.width !== Math.round(w * dpr)) { R.overlay.width = Math.round(w * dpr); R.overlay.height = Math.round(h * dpr); }
      R.dpr = dpr;
    }
  };
  P3.toWorld = function (px, py) {
    const R = this, M = R.match;
    if (!R.w) R.resize();
    R.updateCamera(0);
    const nd = new THREE.Vector2(px / R.w * 2 - 1, -(py / R.h) * 2 + 1);
    R.ray.setFromCamera(nd, R.camera);
    const hit = R.ray.ray.intersectPlane(R.groundPlane, R.v3);
    if (!hit) return { x: M.world.w / 2, y: 0 };
    return { x: Math.max(0, Math.min(M.world.w, hit.x)), y: Math.max(0, Math.min(M.world.h, hit.z)) };
  };
  P3.toScreen = function (wx, wy, hgt) {
    const R = this;
    R.v3.set(wx, hgt || 0, wy).project(R.camera);
    return { x: (R.v3.x + 1) / 2 * R.w, y: (1 - R.v3.y) / 2 * R.h, behind: R.v3.z > 1 };
  };
  P3.drawMinimap = function (ctx2, size) {
    Renderer2D.prototype.drawMinimap.call(this, ctx2, size);
    /* show which way the camera is looking */
    const c = this.cam;
    ctx2.save();
    ctx2.translate(size / 2, size / 2);
    ctx2.rotate(-c.yaw);
    ctx2.fillStyle = 'rgba(255,240,210,0.65)';
    ctx2.beginPath(); ctx2.moveTo(0, size / 2 - 4); ctx2.lineTo(-5, size / 2 - 13); ctx2.lineTo(5, size / 2 - 13); ctx2.closePath(); ctx2.fill();
    ctx2.restore();
  };

  /* generic keyed sync: create missing, update live, remove stale */
  P3.sync = function (map, list, keyOf, create, update) {
    const R = this, fr = R.frame;
    for (const it of list) {
      const k = keyOf ? keyOf(it) : it;
      let o = map.get(k);
      if (!o) { o = create.call(R, it); if (!o) continue; map.set(k, o); }
      o.seen = fr;
      if (update) update.call(R, o, it);
    }
    for (const [k, o] of map) {
      if (o.seen !== fr) { if (o.dispose) o.dispose(); else disposeTree(o.obj); map.delete(k); }
    }
  };

  /* ================================================================
     DRAW
     ================================================================ */
  P3.draw = function (dt) {
    const R = this, M = R.match;
    if (R.disposed) return;
    R.ensureUi();
    R.t += dt; R.frame++;
    M3.time.value = R.t;
    R.dset = settings();
    R.resize();
    R.updateCamera(dt);
    const t = R.t;

    /* Sunear'Zikhron: the memory storm tints the world cyan */
    const zf = M.zikFrac ? M.zikFrac() : (Math.floor(M.time / 60) % 5 === 4 ? 1 : 0);
    R.zf = zf;
    R.skyMat.uniforms.zik.value = zf;
    R.motes.material.opacity = 0.75 * zf;
    if (zf > 0) {
      const pa = R.motes.geometry.attributes.position;
      R.moteSeeds.forEach((s, i) => { pa.setXYZ(i, (s[0] + t * s[3]) % M.world.w, s[1] + Math.sin(t * 1.3 + i) * 10, s[2] + Math.sin(t * 0.7 + i) * 20); });
      pa.needsUpdate = true;
    }
    R.hemi.intensity = 0.55 + zf * 0.15;
    R.hemi.color.set(R.sky.hemiSky).lerp(col('#7fe8f0'), zf * 0.45);

    /* animated scenery */
    for (const b of R.braziers) { b.fire.scale.y = (b.fire.userData.base || (b.fire.userData.base = b.fire.scale.y)) * (0.85 + Math.sin(t * 9 + b.seed) * 0.15); b.gl.material.opacity = 0.42 + Math.sin(t * 7 + b.seed * 2) * 0.1; }
    if (R.flags) R.flags.forEach((f, i) => wave(f, t, i));
    for (const s of R.swayers) {
      if (s.flag) wave(s.o, t, s.seed);
      else if (s.pulse) s.o.material.opacity = 0.35 + 0.25 * Math.sin(t * 2 + s.seed);
      else { s.o.rotation.z = Math.sin(t * 0.9 + s.seed) * s.amp; if (s.glow) s.glow.material.opacity = 0.35 + Math.sin(t * 5 + s.seed) * 0.1; }
    }
    for (const e of R.emberSets) e.pts.forEach((p, i) => { const h = (t * 14 + i * 12 + e.seed) % 46; p.position.set(Math.sin(t + i * 2) * 8, h, Math.cos(t * 0.7 + i) * 6); p.material.opacity = 0.9 * (1 - h / 46); });
    if (R.crowd) {
      /* the crowd bounces — harder while a fight is on */
      const fights = M.creatures.reduce((n, c) => n + (!c.dead && c.state === 'attack' ? 1 : 0), 0);
      const energy = Math.min(1, 0.15 + fights * 0.08);
      const m4 = R._m4 || (R._m4 = new THREE.Matrix4());
      R.crowd.seats.forEach((p, i) => { m4.makeTranslation(p[0], p[1] + Math.max(0, Math.sin(t * (6 + (i % 5)) + i)) * 3.5 * energy, p[2]); R.crowd.mesh.setMatrixAt(i, m4); });
      R.crowd.mesh.instanceMatrix.needsUpdate = true;
    }
    for (const h of R.hoards) h.gl.material.opacity = 0.26 + Math.sin(t * 1.8 + h.team) * 0.06;
    if (M.props.length !== R.propCount) R.buildProps();

    R.syncZones(t);
    R.syncStructures(t);
    R.syncRelics(t);
    R.syncPickups(t);
    R.syncOrbs(t);
    R.syncRemnants();
    R.syncCreatures(dt, t);
    R.syncProjectiles();
    R.syncEffects(t);

    R.gl.render(R.scene, R.camera);
    R.drawOverlay();
  };

  function wave(cloth, t, seed) {
    const p = cloth.geometry.attributes.position;
    if (!cloth.userData.base) cloth.userData.base = Float32Array.from(p.array);
    const b = cloth.userData.base, w = cloth.geometry.parameters.width;
    for (let i = 0; i < p.count; i++) {
      const x = b[i * 3], y = b[i * 3 + 1];
      const k = (x + w / 2) / w;
      p.setZ(i, Math.sin(t * 3 + x * 0.25 + y * 0.08 + seed) * 3.2 * k);
    }
    p.needsUpdate = true;
    cloth.geometry.computeVertexNormals();
  }

  /* ---------------- zones: water, forest, bog, fire ---------------- */
  P3.syncZones = function (t) {
    const R = this, M = R.match;
    R.sync(R.objs.zones, M.zones, null, function (z) {
      const g = new THREE.Group(); g.position.set(z.x, 0, z.y); R.scene.add(g);
      const o = { obj: g, z, parts: [] };
      if (z.type === 'water') {
        const water = std('#2f86c8', { opacity: 0.82, rough: 0.12, metal: 0.25, emissive: '#0d3a5a', ei: 0.35 });
        mesh(g, discGeo(), std('#c8b98a', { rough: 1 }), z.r * 1.06, 1, z.r * 0.76, 0, 0.4, 0, false);
        o.surface = mesh(g, discGeo(), water, z.r, 1, z.r * 0.7, 0, 1.2, 0, false);
        for (let i = 0; i < 3; i++) o.parts.push(mesh(g, ringGeo(0.96), basic('#bfe8ff', { opacity: 0.25, side: THREE.DoubleSide }), z.r * 0.5, 1, z.r * 0.35, 0, 1.6, 0, false));
      } else if (z.type === 'forest') {
        mesh(g, discGeo(), basic('#3c5530', { opacity: 0.7 }), z.r, 1, z.r * 0.8, 0, 0.5, 0, false);
        const trunk = std('#4a3520'), leaf = std('#3c5530', { flat: true }), leaf2 = std('#4f6b3c', { flat: true });
        for (let i = 0; i < 7; i++) {
          const a = i / 7 * TAU, tx = Math.cos(a) * z.r * 0.55, tz = Math.sin(a) * z.r * 0.45;
          mesh(g, GEO.CYL(), trunk, 4, 26, 4, tx, 13, tz);
          mesh(g, GEO.CONE(), i % 2 ? leaf : leaf2, 17 + (i % 3) * 3, 46, 17 + (i % 3) * 3, tx, 18, tz);
        }
      } else if (z.type === 'bog') {
        mesh(g, discGeo(), std('#6d8a2e', { opacity: 0.75, rough: 0.3, emissive: '#3a5a10', ei: 0.4 }), z.r, 1, z.r * 0.72, 0, 0.9, 0, false);
        const bub = std('#a8d05a', { opacity: 0.85, rough: 0.2 });
        for (let i = 0; i < 5; i++) o.parts.push(mesh(g, GEO.SPH_LO(), bub, 4, 4, 4, 0, 1, 0, false));
      } else if (z.type === 'fire') {
        mesh(g, discGeo(), basic('#e8842c', { opacity: 0.55, add: true }), z.r, 1, z.r, 0, 0.8, 0, false);
        const fm = basic('#ffb03a', { add: true, opacity: 0.85 });
        for (let i = 0; i < 6; i++) o.parts.push(mesh(g, GEO.CONE(), fm, 5, 18, 5, Math.cos(i) * z.r * 0.45, 0, Math.sin(i * 1.7) * z.r * 0.45, false));
        o.glow = glowSprite('#ff8a2a', z.r * 3.2, 0.6); o.glow.position.y = 14; g.add(o.glow);
      }
      return o;
    }, function (o, z) {
      if (z.type === 'water') {
        o.parts.forEach((r, i) => { const k = 0.4 + 0.2 * i + Math.sin(t * 1.5 + i) * 0.04; r.scale.set(z.r * k, 1, z.r * k * 0.7); r.material.opacity = 0.22 + 0.08 * Math.sin(t * 2 + i); });
        o.surface.material.emissiveIntensity = 0.3 + Math.sin(t * 1.2) * 0.08;
      } else if (z.type === 'bog') {
        o.parts.forEach((b, i) => { const k = (t * 0.6 + i * 0.2) % 1; b.position.set(Math.sin(i * 2.4 + t * 0.8) * z.r * 0.5, 1 + k * 4, Math.cos(i * 1.9 + t * 0.6) * z.r * 0.35); b.scale.setScalar(2 + k * 4); b.material.opacity = 0.85 * (1 - k); });
      } else if (z.type === 'fire') {
        o.parts.forEach((f, i) => { f.scale.y = 14 + Math.sin(t * 10 + i * 1.3) * 7; });
        o.glow.material.opacity = 0.45 + Math.sin(t * 8) * 0.12;
      }
    });
  };

  /* ---------------- structures: towers, walls, huts, wards ---------------- */
  P3.syncStructures = function (t) {
    const R = this, M = R.match;
    R.sync(R.objs.structures, M.structures, s => s.id + ':' + (s.upgraded ? 1 : 0) + ':' + (s.level || 0) + ':' + (s.capacity || 0), function (s) {
      return R.buildStructure(s);
    }, function (o, s) {
      if (o.pips) {
        const manned = Math.max(s.occupants ? s.occupants.length : 0, s.permManned || 0);
        o.pips.forEach((p, i) => { p.material.color.set(i < manned ? o.teamCol : '#3a3229'); });
      }
      if (o.flags) o.flags.forEach((f, i) => wave(f, t, i + s.x));
      if (o.ward) { o.ward.rotation.y = t * 0.4; o.dome.scale.setScalar(o.rr * (1 + Math.sin(t * 3) * 0.04)); }
      o.top = o.topH;
      o.s = s;
    });
  };
  P3.buildStructure = function (s) {
    const R = this, M = R.match;
    const g = new THREE.Group(); g.position.set(s.x, 0, s.y); R.scene.add(g);
    const teamCol = M.teams[s.team] ? M.teams[s.team].color : '#999999';
    const o = { obj: g, teamCol, topH: 40 };
    const up = s.upgraded;
    const lite = std(up ? '#a8987a' : '#7d6b55', { flat: true }), dark = std(up ? '#857350' : '#5d4f40', { flat: true });
    const trim = std('#d9b23a', { metal: 0.6, rough: 0.35 });
    const flag = (x, y, z, h) => {
      mesh(g, GEO.CYL(), std('#4a3520'), 1.2, h, 1.2, x, y + h / 2, z);
      const cl = new THREE.Mesh(new THREE.PlaneGeometry(14, 8, 3, 2), std(teamCol, { side: THREE.DoubleSide }));
      cl.userData.ownGeo = true; cl.position.set(x + 7, y + h - 5, z); cl.castShadow = true; g.add(cl);
      (o.flags = o.flags || []).push(cl);
    };
    if (s.kind === 'tower' || s.kind === 'cone') {
      const cap = s.capacity || 1;
      const bw = 16 + cap * 6, bh = 55 + cap * 10;
      /* range bands on the ground */
      if (s.kind === 'cone') {
        const cr = s.coneRange || s.far || 120, ch = s.coneHalf || 0.6, cd = s.coneDir || 0;
        const sg = new THREE.CircleGeometry(1, 32, -cd - ch, ch * 2); sg.rotateX(-Math.PI / 2);
        const sec = new THREE.Mesh(sg, basic(teamCol, { opacity: 0.12, side: THREE.DoubleSide }));
        sec.userData.ownGeo = true; sec.scale.set(cr, 1, cr); sec.position.y = 0.8; g.add(sec);
      } else {
        mesh(g, ringGeo(0.985, 72), basic(teamCol, { opacity: 0.16, side: THREE.DoubleSide }), s.far || 240, 1, s.far || 240, 0, 0.6, 0, false);
        mesh(g, ringGeo(0.97, 64), basic(teamCol, { opacity: up ? 0.3 : 0.22, side: THREE.DoubleSide }), s.close || 80, 1, s.close || 80, 0, 0.7, 0, false);
      }
      mesh(g, GEO.BOX(), dark, bw + 8, 8, bw + 8, 0, 4, 0);
      mesh(g, GEO.BOX(), lite, bw, bh, bw, 0, bh / 2, 0);
      let deck = bh;
      if (up) {
        mesh(g, GEO.BOX(), dark, bw + 14, 10, bw + 14, 0, bh + 5, 0);
        mesh(g, GEO.BOX(), lite, bw - 4, 22, bw - 4, 0, bh + 21, 0);
        mesh(g, GEO.BOX(), trim, bw + 15, 2, bw + 15, 0, bh + 10, 0);
        deck = bh + 32;
      } else {
        mesh(g, GEO.BOX(), dark, bw + 10, 8, bw + 10, 0, bh + 4, 0);
        deck = bh + 8;
      }
      /* crenellations */
      const cw = up ? bw - 4 : bw + 10, n = Math.max(2, Math.round(cw / 9));
      for (let i = 0; i < n; i++) {
        const u = -cw / 2 + (i + 0.5) * cw / n;
        for (const [x, z] of [[u, cw / 2], [u, -cw / 2], [cw / 2, u], [-cw / 2, u]]) mesh(g, GEO.BOX(), dark, 4, 6, 4, x, deck + 3, z);
      }
      /* windows / arrow slits */
      for (const a of [0, 1, 2, 3]) { const sl = mesh(g, GEO.BOX(), std('#1e1812'), 2.5, 10, 0.5, 0, bh * 0.6, 0, false); sl.position.x = Math.cos(a * Math.PI / 2) * (bw / 2 + 0.3); sl.position.z = Math.sin(a * Math.PI / 2) * (bw / 2 + 0.3); sl.rotation.y = a * Math.PI / 2 + Math.PI / 2; }
      /* garrison pips — one per seated archer */
      o.pips = [];
      for (let i = 0; i < cap; i++) o.pips.push(mesh(g, GEO.SPH_LO(), std('#3a3229', { emissive: '#000000' }), 3, 3, 3, -((cap - 1) * 5) + i * 10, deck + 9, 0, false));
      flag(bw / 2 - 2, deck, 0, 20);
      if (up) flag(-bw / 2 + 2, deck, 0, 20);
      o.topH = deck + 28;
    } else if (s.kind === 'wallTower') {
      const th = up ? 52 : 40;
      mesh(g, ringGeo(0.97, 48), basic(teamCol, { opacity: 0.14, side: THREE.DoubleSide }), s.range || 50, 1, s.range || 50, 0, 0.6, 0, false);
      mesh(g, GEO.BOX(), lite, 20, th, 20, 0, th / 2, 0);
      for (let i = -1; i <= 1; i++) for (const z of [-8, 8]) mesh(g, GEO.BOX(), dark, 5, 6, 5, i * 7.5, th + 3, z);
      mesh(g, GEO.BOX(), std(teamCol), 1, 12, 2.5, 10.2, th * 0.6, 0, false);
      if (up) { mesh(g, GEO.BOX(), trim, 21, 2, 21, 0, th - 1, 0); flag(8, th, 0, 14); }
      o.topH = th + 14;
    } else if (s.isHut) {
      const lvl2 = s.level >= 2;
      if (lvl2) {
        const st = std('#8a8274', { flat: true }), st2 = std('#6a6458', { flat: true });
        mesh(g, GEO.BOX(), st, 60, 36, 44, 0, 18, 0);
        for (let i = 0; i < 6; i++) for (const z of [-20, 20]) mesh(g, GEO.BOX(), st2, 7, 7, 5, -25 + i * 10, 39.5, z);
        mesh(g, GEO.BOX(), std('#2c2419'), 0.5, 20, 14, 30.2, 10, 0, false);
        mesh(g, GEO.BOX(), trim, 61, 2, 45, 0, 34, 0);
        flag(0, 36, 0, 26);
        o.topH = 66;
      } else {
        const wood = std('#6e5a3f', { flat: true }), wood2 = std('#5a4a34', { flat: true });
        mesh(g, GEO.BOX(), wood2, 48, 26, 36, 0, 13, 0);
        const roofG = new THREE.CylinderGeometry(1, 1, 1, 3); roofG.rotateZ(Math.PI / 2);
        const roof = new THREE.Mesh(roofG, wood); roof.userData.ownGeo = true;
        roof.scale.set(54, 18, 26); roof.position.y = 33; roof.rotation.x = Math.PI / 6 * 3; roof.castShadow = true; g.add(roof);
        mesh(g, GEO.BOX(), std('#2c2419'), 0.5, 18, 12, 24.2, 9, 0, false);
        flag(0, 42, 0, 12);
        o.topH = 58;
      }
    } else if (s.type === 'wall') {
      const vert = s.vertical !== false, face = s.face || 1;
      const sx = s.w || 24, sz = s.h || 84, hgt = up ? 46 : 38;
      const blocks = std(up ? '#b7b0a0' : '#8a8377', { flat: true });
      mesh(g, GEO.BOX(), blocks, sx, hgt, sz, 0, hgt / 2, 0);
      /* coursing lines */
      const line = std('#4a443b');
      for (let k = 1; k < 4; k++) mesh(g, GEO.BOX(), line, sx + 0.6, 0.8, sz + 0.6, 0, hgt * k / 4, 0, false);
      /* merlons along the enemy-facing edge */
      const mer = std(up ? '#c9c2b2' : '#9a9387', { flat: true });
      const len = vert ? sz : sx;
      const n = Math.max(3, Math.round(len / 14));
      for (let i = 0; i < n; i++) {
        const u = -len / 2 + (i + 0.5) * len / n;
        if (vert) mesh(g, GEO.BOX(), mer, 7, 9, len / n * 0.55, face * (sx / 2 - 3.5), hgt + 4.5, u);
        else mesh(g, GEO.BOX(), mer, len / n * 0.55, 9, 7, u, hgt + 4.5, face * (sz / 2 - 3.5));
      }
      if (vert) mesh(g, GEO.BOX(), std(teamCol), 1, hgt * 0.5, sz, face * (sx / 2 + 0.3), hgt * 0.55, 0, false);
      else mesh(g, GEO.BOX(), std(teamCol), sx, hgt * 0.5, 1, 0, hgt * 0.55, face * (sz / 2 + 0.3), false);
      if (up) mesh(g, GEO.BOX(), trim, sx + 1, 2, sz + 1, 0, hgt, 0, false);
      if (s.trapped) {
        const spike = std('#c9ccd4', { metal: 0.6, rough: 0.3 });
        for (let i = -1; i <= 1; i++) {
          const sp = mesh(g, GEO.CONE(), spike, 2.5, 10, 2.5, vert ? face * sx / 2 : i * sx * 0.3, 10, vert ? i * sz * 0.3 : face * sz / 2);
          if (vert) sp.rotation.z = -face * Math.PI / 2; else sp.rotation.x = face * Math.PI / 2;
        }
      }
      o.topH = hgt + 14;
    } else if (s.type === 'ward') {
      const rr = s.radius || 66;
      o.rr = rr;
      o.dome = mesh(g, GEO.HEMI(), new THREE.MeshStandardMaterial({ color: col(teamCol), transparent: true, opacity: 0.13, emissive: col(teamCol), emissiveIntensity: 0.4, depthWrite: false, side: THREE.DoubleSide }), rr, rr, rr, 0, 0, 0, false);
      o.ward = new THREE.Group(); g.add(o.ward);
      mesh(o.ward, ringGeo(0.95, 64), basic(teamCol, { opacity: 0.8, side: THREE.DoubleSide }), rr, 1, rr, 0, 1, 0, false);
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; const r = mesh(o.ward, GEO.BOX(), basic(teamCol, { opacity: 0.9 }), 3, 2, rr * 0.12, Math.cos(a) * rr * 0.9, 1.2, Math.sin(a) * rr * 0.9, false); r.rotation.y = -a; }
      o.topH = rr + 8;
    } else {
      mesh(g, GEO.BOX(), lite, 20, 20, 20, 0, 10, 0);
      o.topH = 30;
    }
    return o;
  };

  /* ---------------- relics, morsels, orbs, remnants ---------------- */
  P3.syncRelics = function (t) {
    const R = this, M = R.match;
    const live = (M.relics || []).filter(r => !r.disabled && !r.captured);
    R.sync(R.objs.relics, live, null, function (rl) {
      const g = new THREE.Group(); R.scene.add(g);
      const own = M.teams[rl.ownerTeam] ? M.teams[rl.ownerTeam].color : '#cbb8f0';
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: col('#cbb8f0'), emissive: col(own), emissiveIntensity: 0.55, roughness: 0.15, metalness: 0.3, flatShading: true }));
      crystal.userData.ownGeo = true; crystal.scale.set(9, 16, 9); crystal.castShadow = true;
      g.add(crystal);
      const inner = mesh(g, GEO.SPH_LO(), basic('#ffffff', { opacity: 0.8, add: true }), 3, 3, 3, 0, 0, 0, false);
      const gl = glowSprite('#b48aff', 90, 0.7); g.add(gl);
      const beam = mesh(g, GEO.CYL(), basic(own, { opacity: 0.09, add: true }), 2, 140, 2, 0, 70, 0, false);
      return { obj: g, crystal, gl, beam, inner };
    }, function (o, rl) {
      const carried = !!rl.carrier;
      const bob = carried ? 0 : Math.sin(t * 2) * 4;
      let y = 26 + bob;
      if (carried) {
        const cc = R.objs.creatures.get(rl.carrier.id != null ? rl.carrier.id : rl.carrier);
        y = cc ? cc.topY + 14 : 40;
      }
      o.obj.position.set(rl.x, y, rl.y);
      o.crystal.rotation.y = t * 1.3;
      o.beam.position.y = -y + 70; o.beam.visible = !carried;
      o.gl.material.opacity = 0.55 + Math.sin(t * 3) * 0.15;
    });
  };
  P3.syncPickups = function (t) {
    const R = this, M = R.match;
    R.sync(R.objs.pickups, M.pickups || [], null, function (pk) {
      const g = new THREE.Group(); R.scene.add(g);
      if (pk.kind === 'food') {
        mesh(g, GEO.SPH_LO(), std('#8a6b3a'), 7, 4.5, 5, 0, 4, 0);
        mesh(g, GEO.SPH_LO(), std('#a8c46a'), 4, 2, 3, 3, 8, -1);
      } else {
        mesh(g, GEO.SPH(), std('#e8d4f8', { emissive: '#c48ae8', ei: 1 }), 3.5, 3.5, 3.5, 0, 8, 0, false);
        const gl = glowSprite('#c48ae8', 34, 0.8); gl.position.y = 8; g.add(gl);
      }
      return { obj: g };
    }, function (o, pk) {
      o.obj.position.set(pk.x, Math.sin(t * 2.4 + pk.id) * 2, pk.y);
      o.obj.rotation.y = t + pk.id;
    });
  };
  P3.syncOrbs = function (t) {
    const R = this, M = R.match;
    const live = M.orbs.filter(o => M.time - o.t0 <= 3);
    R.sync(R.objs.orbs, live, null, function (ob) {
      const c = SP.ELEMENT_COLORS[ob.el] || '#ffffff';
      const g = new THREE.Group(); R.scene.add(g);
      const core = mesh(g, GEO.SPH_LO(), basic('#ffffff', { opacity: 1 }), 3, 3, 3, 0, 0, 0, false);
      const gl = glowSprite(c, 30, 1); g.add(gl);
      return { obj: g, core, gl };
    }, function (o, ob) {
      const age = M.time - ob.t0, a = Math.max(0, 1 - age / 3), pulse = 1 + Math.sin(age * 9) * 0.18;
      o.obj.position.set(ob.x, 8 + age * 14, ob.y);
      o.gl.scale.set(28 * pulse, 28 * pulse, 1);
      o.gl.material.opacity = a; o.core.material.opacity = a;
    });
  };
  P3.syncRemnants = function () {
    const R = this, M = R.match;
    R.sync(R.objs.remnants, M.remnants || [], null, function (r) {
      const g = new THREE.Group(); g.position.set(r.x, 0, r.y); R.scene.add(g);
      const m = std('#c2b23a', { flat: true });
      for (let i = 0; i < 5; i++) mesh(g, GEO.SPH_LO(), m, 1.8, 1.2, 1.8, Math.sin(i * 2.1) * 8, 1, Math.cos(i * 1.3) * 6, false);
      return { obj: g };
    });
  };

  /* ---------------- creatures ---------------- */
  P3.creatureLook = function (c) {
    const indiv = c.tok && DYA.token && DYA.token.physique ? DYA.token.physique(c.tok) : null;
    let sp = c.sp;
    if (indiv && (indiv.hue || indiv.light)) {
      sp = Object.assign({}, sp, {
        color: sp.color ? SPR.hueShift(sp.color, indiv.hue, indiv.light) : sp.color,
        color2: sp.color2 ? SPR.hueShift(sp.color2, indiv.hue * 0.7, indiv.light * 0.6) : sp.color2,
      });
    }
    return { sp, build: indiv && indiv.build ? indiv.build : 1 };
  };
  P3.makeCreature = function (c) {
    const R = this, M = R.match;
    const look = R.creatureLook(c);
    const model = M3.build(look.sp, { heads: c.headsLeft });
    const holder = new THREE.Group();
    const scaler = new THREE.Group();
    holder.add(scaler); scaler.add(model.root);
    R.scene.add(holder);
    const teamCol = M.mode === 'hunt' && c.team === 1 ? '#9c3a3a' : (M.teams[c.team] ? M.teams[c.team].color : '#cccccc');
    /* team ring on the ground under the creature */
    const ring = new THREE.Mesh(ringGeo(0.8, 40), basic(teamCol, { opacity: 0.6, side: THREE.DoubleSide }));
    ring.position.y = 0.9;
    holder.add(ring);
    const shadowDisc = new THREE.Mesh(discGeo(), basic('#000000', { opacity: 0.22, noDepth: true }));
    shadowDisc.position.y = 0.5;
    holder.add(shadowDisc);
    const F = c.sp.features || {};
    let glow = null;
    if (F.biolum || F.biolumTail || F.glow || c.speciesId === 'rubbermcfly' || model.emitsLight) {
      glow = glowSprite(model.emitsLight || c.sp.color2 || '#68e0e8', 1, 0.5);
      holder.add(glow);
    }
    const r = c.radius * 1.45 * look.build;
    const o = {
      obj: holder, scaler, model, ring, shadowDisc, glow, speciesId: c.speciesId,
      heading: c.facing < 0 ? Math.PI : 0, px: c.x, py: c.y, mv: 0, alt: 0, alpha: -1,
      r, shimmerK: 0.16 + hash(c.id) * 0.16, flier: M3.isFlier(c.sp), topY: r * model.height,
      dispose() { model.kit.mats.forEach(m => m.dispose()); disposeTree(holder); },
    };
    return o;
  };
  P3.syncCreatures = function (dt, t) {
    const R = this, M = R.match, dset = R.dset;
    const zik = R.zf > 0.5;
    /* rebuild a creature whose species changed under it (Ju → Sprengju…) */
    for (const c of M.creatures) { const o = R.objs.creatures.get(c.id); if (o && o.speciesId !== c.speciesId) { o.dispose(); R.objs.creatures.delete(c.id); } }
    R.sync(R.objs.creatures, M.creatures, c => c.id, P3.makeCreature, function (o, c) {
      const hidden = c.inHut || c.onTower;
      o.obj.visible = !hidden;
      if (hidden) { o.px = c.x; o.py = c.y; return; }
      /* motion → heading + gait speed */
      const dx = c.x - o.px, dz = c.y - o.py;
      const d = Math.hypot(dx, dz);
      const sp = dt > 0 ? d / dt : 0;
      if (d > 0.05 && d < 200) o.heading = turn(o.heading, Math.atan2(-dz, dx), dt * 9);
      else {
        const fx = Math.cos(o.heading);
        if ((c.facing > 0 && fx < -0.15) || (c.facing < 0 && fx > 0.15)) o.heading = turn(o.heading, Math.PI - o.heading, dt * 8);
      }
      o.px = c.x; o.py = c.y;
      const targetMv = d > 200 ? 0 : Math.min(1.4, sp / 55);
      o.mv += (targetMv - o.mv) * Math.min(1, dt * 8);

      /* alpha: death fade, tether fade (80%→100%), camouflage */
      let alpha = 1;
      if (c.dead) alpha = Math.max(0, 1 - (M.tick - c.deadTick) / 50);
      else if (c.tetherFrac > 0.8) alpha = Math.max(0.12, 1 - (c.tetherFrac - 0.8) / 0.2);
      if (c.camoUntil > M.tick) alpha *= 0.35;
      if (Math.abs(alpha - o.alpha) > 0.01) {
        o.alpha = alpha;
        o.model.kit.mats.forEach(m => { m.opacity = alpha * (m.userData.baseOpacity || 1); });
        o.ring.material.opacity = 0.6 * alpha; o.shadowDisc.material.opacity = 0.22 * alpha;
        const cast = alpha > 0.5;
        o.model.root.traverse(n => { if (n.isMesh || n.isInstancedMesh) n.castShadow = cast; });
      }
      o.obj.visible = alpha > 0.01;

      /* altitude: fliers take to the air when moving, dive to strike */
      const F = c.sp.features || {};
      const state = c.dead ? 'death' : c.state;
      let altT = 0;
      if (o.flier && !c.dead) {
        if (F.hover) altT = o.r * 0.6;
        else altT = (o.mv > 0.15 || state === 'special') ? o.r * 2.2 : 0;
        if (state === 'attack') altT = Math.min(altT, o.r * 0.5);
      }
      o.alt += (altT - o.alt) * Math.min(1, dt * 3);
      let y = o.alt, s = o.r;
      /* a mounted rider sits on its mount's back */
      if (c.riding && c.mountedOn != null) {
        const mo = R.objs.creatures.get(c.mountedOn);
        const p = Math.max(0, Math.min(1, (M.tick - (c.mountedAt || 0)) / 7));
        const ease = 1 - (1 - p) * (1 - p);
        if (mo) y = mo.alt + mo.r * mo.model.height * 0.78 * ease + Math.sin(p * Math.PI) * mo.r * 0.4;
        s = o.r * 0.82;
        if (mo) o.heading = mo.heading;
      }
      o.obj.position.set(c.x, 0, c.y);
      o.scaler.position.y = y;
      o.scaler.scale.setScalar(s);
      o.scaler.rotation.y = o.heading;
      o.topY = y + s * o.model.height;
      /* death: topple and sink */
      if (c.dead) {
        const k = Math.min(1, (M.tick - c.deadTick) / 14);
        o.scaler.rotation.x = 0; o.scaler.rotation.z = 0;
        o.model.root.rotation.x = k * 1.35;
        o.model.root.position.y = -k * 0.3;
      }
      o.ring.scale.set(o.r * 1.1, 1, o.r * 1.1);
      o.ring.visible = !c.dead && !c.riding;
      o.shadowDisc.scale.set(o.r * 0.95, 1, o.r * 0.95);
      o.shadowDisc.visible = o.alt > 3;

      /* shader treatments: magical shimmer + gentle flicker, hit flash */
      const kit = o.model.kit;
      let shim = dset.holographic && !c.dead ? o.shimmerK : 0;
      if (Math.sin(t * 0.7 + (c.animPhase || 0) * 13) > 0.985) shim *= 1.8;
      kit.u.uShimmer.value = shim;
      kit.u.uFlash.value = state === 'hit' ? 0.25 + 0.15 * Math.sin(t * 30) : 0;
      /* bioluminescence */
      const biolumOn = dset.bioluminescence && ((F.biolum && c.speciesId !== 'rubbermcfly') || F.biolumTail || (c.speciesId === 'rubbermcfly' && zik) || F.glow);
      kit.glowMats.forEach(m => { m.emissiveIntensity = (biolumOn || o.model.emitsLight) ? (m.userData.ei || 1) * (0.85 + 0.15 * Math.sin(t * 2 + c.id)) : 0.08; });
      if (o.glow) {
        o.glow.visible = (biolumOn || !!o.model.emitsLight) && !c.dead;
        o.glow.position.y = y + s * o.model.height * 0.45;
        o.glow.scale.setScalar(s * (o.model.emitsLight ? 3.2 : 3.2));
        o.glow.material.opacity = (o.model.emitsLight ? 0.4 : 0.35) * alpha;
      }
      /* drive the rig */
      const atk = state === 'attack' ? Math.max(0, Math.sin((t + (c.animPhase || 0)) * 12)) : 0;
      o.model.anim({
        state, t: t + (c.animPhase || 0), speed: c.dead ? 0 : o.mv, attack: atk,
        dormant: state === 'dormant', dead: c.dead, airborne: o.alt > o.r * 0.6,
        heads: c.headsLeft, heat: c.heat, swarmFrac: c.swarmFrac, charged: c.mem && c.mem.charge >= 1,
        biolum: biolumOn, hasRider: !!c.hasRider && !c.riderUnit,
      });
      o.c = c;
    });
  };
  function turn(a, b, k) {
    let d = ((b - a) % TAU + TAU * 1.5) % TAU - Math.PI;
    return a + d * Math.min(1, k);
  }

  /* ---------------- projectiles ---------------- */
  P3.syncProjectiles = function () {
    const R = this, M = R.match;
    R.sync(R.objs.proj, M.projectiles, null, function (p) {
      const g = new THREE.Group(); R.scene.add(g);
      if (p.type === 'arrow' || p.type === 'hanii') {
        const shaft = mesh(g, GEO.CYL(), std(p.type === 'hanii' ? '#c9ccd4' : '#8a6f4a'), p.type === 'hanii' ? 1.3 : 0.8, 18, p.type === 'hanii' ? 1.3 : 0.8, 0, 0, 0);
        shaft.rotation.z = Math.PI / 2;
        const tip = mesh(g, GEO.CONE(), std('#c9ccd4', { metal: 0.6, rough: 0.3 }), 2, 5, 2, 9, 0, 0);
        tip.rotation.z = -Math.PI / 2;
        if (p.type === 'arrow') for (const s of [-1, 1]) { const f = mesh(g, GEO.BOX(), std('#e8e0c8'), 4, 0.3, 2.5, -8, 0, s * 1.2, false); f.rotation.x = s * 0.4; }
      } else {
        mesh(g, GEO.SPH(), std('#bfe8ff', { opacity: 0.8, emissive: '#3b9ae1', ei: 0.6, rough: 0.1 }), 6, 6, 6, 0, 0, 0, false);
        const gl = glowSprite('#7ec8ff', 34, 0.7); g.add(gl);
      }
      return { obj: g, x0: p.x, y0: p.y };
    }, function (o, p) {
      /* a gentle arc between launch and the end of the flight */
      const travelled = Math.hypot(p.x - o.x0, p.y - o.y0);
      const total = travelled + Math.max(0, p.life) * Math.hypot(p.vx, p.vy);
      const f = total > 0 ? travelled / total : 0;
      o.obj.position.set(p.x, 16 + Math.sin(f * Math.PI) * Math.min(60, total * 0.12), p.y);
      o.obj.rotation.y = Math.atan2(-p.vy, p.vx);
      o.obj.rotation.z = (0.5 - f) * 0.5;
    });
  };

  /* ---------------- effects ---------------- */
  P3.syncEffects = function (t) {
    const R = this, M = R.match;
    const live = M.effects.filter(e => M.time - e.t0 <= e.dur);
    R.sync(R.objs.fx, live, null, function (e) { return R.makeFx(e); }, function (o, e) {
      const f = Math.max(0, Math.min(1, (M.time - e.t0) / e.dur));
      if (o.update) o.update(f, t);
    });
  };
  P3.makeFx = function (e) {
    const R = this, M = R.match, S = R.scene;
    const g = new THREE.Group(); g.position.set(e.x, 0, e.y); S.add(g);
    const o = { obj: g };
    const fade = (m, a) => { m.opacity = a; };
    switch (e.type) {
      case 'deploy': {
        const ring = mesh(g, ringGeo(0.85), basic('#d9b87a', { side: THREE.DoubleSide, add: true }), 1, 1, 1, 0, 1, 0, false);
        const coin = new THREE.Group(); g.add(coin);
        const cm = std('#c9a052', { metal: 0.8, rough: 0.3, emissive: '#5a4010', ei: 0.4 });
        const disc = mesh(coin, GEO.CYL(), cm, 9, 2, 9, 0, 0, 0); disc.rotation.x = Math.PI / 2;
        mesh(coin, GEO.CYL(), std('#68e0e8', { emissive: '#68e0e8', ei: 1 }), 4, 2.4, 4, 0, 0, 0, false).rotation.x = Math.PI / 2;
        const flash = glowSprite('#ffe8b0', 90, 0.9); flash.position.y = 12; g.add(flash);
        const pillar = mesh(g, GEO.CYL(), basic('#ffe8b0', { add: true, opacity: 0.3 }), 8, 120, 8, 0, 60, 0, false);
        R.shake = Math.max(R.shake || 0, 1.5);
        o.update = (f, t) => {
          const rr = 20 + f * 45; ring.scale.set(rr, 1, rr); fade(ring.material, 1 - f);
          coin.visible = f < 0.5; coin.position.y = 70 * (0.5 - f) * 2 + 6; coin.rotation.y = t * 10;
          flash.material.opacity = f < 0.5 ? f * 1.4 : (1 - f) * 1.4;
          pillar.material.opacity = 0.28 * (1 - f); pillar.scale.x = pillar.scale.z = 10 * (1 - f * 0.7);
        };
        break;
      }
      case 'rock': {
        const rk = mesh(g, M3.geo.rockGeo(3), std('#8d8578', { flat: true }), 5, 4.5, 5, 0, 0, 0);
        g.position.set(0, 0, 0);
        o.update = (f) => {
          rk.position.set(e.x + (e.tx - e.x) * f, 10 + Math.sin(f * Math.PI) * 70, e.y + (e.ty - e.y) * f);
          rk.rotation.set(f * 9, f * 6, 0);
        };
        break;
      }
      case 'hit': {
        const n = e.big ? 9 : 5, sp = [];
        const m = basic('#fff0c8', { add: true });
        for (let i = 0; i < n; i++) sp.push(mesh(g, GEO.SPH_LO(), m, 1.5, 1.5, 1.5, 0, 14, 0, false));
        const gl = glowSprite('#fff0c8', e.big ? 50 : 30, 0.9); gl.position.y = 14; g.add(gl);
        if (e.big) R.shake = Math.max(R.shake || 0, 3);
        o.update = (f) => {
          sp.forEach((s, i) => { const a = i / n * TAU + e.x, d = f * (e.big ? 30 : 16); s.position.set(Math.cos(a) * d, 14 + Math.sin(f * Math.PI) * 10 + (i % 3) * 3 * f, Math.sin(a) * d); s.scale.setScalar((e.big ? 2.6 : 1.7) * (1 - f)); });
          fade(m, 1 - f); gl.material.opacity = 0.9 * (1 - f);
        };
        break;
      }
      case 'breath': {
        const c = SP.ELEMENT_COLORS[e.el] || '#e8842c';
        const len = Math.max(10, U.dist(e.x, e.y, e.tx, e.ty));
        const cg = new THREE.ConeGeometry(1, 1, 18, 1, true); cg.translate(0, -0.5, 0); cg.rotateZ(Math.PI / 2);
        const cone = new THREE.Mesh(cg, basic(c, { add: true, opacity: 0.7, side: THREE.DoubleSide }));
        cone.userData.ownGeo = true;
        cone.position.y = 20; cone.rotation.y = Math.atan2(-(e.ty - e.y), e.tx - e.x);
        g.add(cone);
        const gl = glowSprite(c, 60, 0.8); gl.position.set(e.tx - e.x, 18, e.ty - e.y); g.add(gl);
        o.update = (f) => {
          cone.scale.set(len, 14 + f * 12, 14 + f * 12);
          cone.position.x = 0;
          fade(cone.material, (1 - f) * 0.65); gl.material.opacity = (1 - f) * 0.8;
        };
        break;
      }
      case 'screech': {
        const rings = [];
        for (let i = 0; i < 3; i++) { const tor = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 6, 40), basic('#ffe88a', { add: true })); tor.userData.ownGeo = true; tor.rotation.x = Math.PI / 2; tor.position.y = 24; g.add(tor); rings.push(tor); }
        o.update = (f) => { rings.forEach((r, i) => { const rr = (f * 130 + i * 18) % 150 + 4; r.scale.setScalar(rr); r.position.y = 24 + i * 4; fade(r.material, (1 - f) * 0.9); }); };
        break;
      }
      case 'teleport': {
        const ring = mesh(g, ringGeo(0.8), basic('#9a6af8', { add: true, side: THREE.DoubleSide }), 1, 1, 1, 0, 2, 0, false);
        const orb = mesh(g, GEO.SPH(), basic('#241733', { opacity: 0.85 }), 1, 1, 1, 0, 14, 0, false);
        const col1 = mesh(g, GEO.CYL(), basic('#7a4ae8', { add: true, opacity: 0.6 }), 8, 60, 8, 0, 30, 0, false);
        o.update = (f) => { const rr = 6 + f * 30; ring.scale.set(rr, 1, rr); fade(ring.material, 1 - f); orb.scale.setScalar(12 * (1 - f)); col1.scale.x = col1.scale.z = 8 * (1 - f); fade(col1.material, 0.6 * (1 - f)); };
        break;
      }
      case 'shurgredan': {
        /* the sky answers: a massive claw of light */
        const ms = basic('#fff3c8', { add: true });
        const claws = [];
        for (let i = -1; i <= 1; i++) { const b = mesh(g, GEO.BOX(), ms, 14, 900, 6, i * 30, 450, 0, false); b.rotation.z = i * 0.18 + 0.08; claws.push(b); }
        const gl = glowSprite('#ffd890', 380, 1); gl.position.y = 20; g.add(gl);
        R.shake = Math.max(R.shake || 0, 10);
        o.update = (f) => { const a = f < 0.2 ? f * 5 : (1 - f); fade(ms, a); gl.material.opacity = a; };
        break;
      }
      case 'heal': {
        const m = basic('#7ae88a', { add: true });
        const crosses = [];
        for (let i = 0; i < 4; i++) { const cr = new THREE.Group(); mesh(cr, GEO.BOX(), m, 2, 7, 2, 0, 0, 0, false); mesh(cr, GEO.BOX(), m, 7, 2, 2, 0, 0, 0, false); g.add(cr); crosses.push(cr); }
        o.update = (f, t) => { crosses.forEach((c, i) => { const a = i * TAU / 4 + t; c.position.set(Math.cos(a) * 14, 12 + f * 30, Math.sin(a) * 10); c.rotation.y = -a; }); fade(m, 1 - f); };
        break;
      }
      case 'buff': {
        const ring = mesh(g, ringGeo(0.86), basic('#e8d24a', { add: true, side: THREE.DoubleSide }), 1, 1, 1, 0, 2, 0, false);
        const ring2 = mesh(g, ringGeo(0.9), basic('#e8d24a', { add: true, side: THREE.DoubleSide }), 1, 1, 1, 0, 2, 0, false);
        o.update = (f) => { const rr = 16 + f * 14; ring.scale.set(rr, 1, rr); ring.position.y = 2 + f * 20; ring2.scale.set(rr * 0.7, 1, rr * 0.7); ring2.position.y = 2 + f * 34; fade(ring.material, 1 - f); fade(ring2.material, (1 - f) * 0.7); };
        break;
      }
      case 'tongue': {
        const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 14, 0), new THREE.Vector3((e.tx - e.x) / 2, 40, (e.ty - e.y) / 2), new THREE.Vector3(e.tx - e.x, 10, e.ty - e.y));
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 2.2, 6), std('#d46a6a', { opacity: 1, rough: 0.3 }));
        tube.userData.ownGeo = true; g.add(tube);
        o.update = (f) => { tube.material.opacity = 1 - f; };
        break;
      }
      case 'dive': {
        const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 120, 0), new THREE.Vector3(e.tx - e.x, 6, e.ty - e.y)]);
        const ln = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true }));
        ln.userData.ownGeo = true; g.add(ln);
        o.update = (f) => { ln.material.opacity = (1 - f) * 0.6; };
        break;
      }
      case 'electric': {
        const n = 5, pts = new Float32Array(n * 4 * 3);
        const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
        const ln = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: col('#7ec8e3'), transparent: true, blending: THREE.AdditiveBlending }));
        ln.userData.ownGeo = true; ln.frustumCulled = false; g.add(ln);
        const gl = glowSprite('#7ec8e3', 60, 0.9); gl.position.y = 12; g.add(gl);
        o.update = (f, t) => {
          let k = 0;
          for (let i = 0; i < n; i++) {
            const a = i * TAU / n + t * 3;
            let x = 0, y = 12, z = 0;
            for (let s = 0; s < 2; s++) {
              const nx = x + Math.cos(a) * 12 + Math.sin(t * 40 + i + s) * 6, ny = y + Math.sin(t * 33 + i * 2) * 6, nz = z + Math.sin(a) * 12 + Math.cos(t * 37 + i * 2) * 6;
              pts[k++] = x; pts[k++] = y; pts[k++] = z; pts[k++] = nx; pts[k++] = ny; pts[k++] = nz;
              x = nx; y = ny; z = nz;
            }
          }
          lg.attributes.position.needsUpdate = true;
          ln.material.opacity = 1 - f; gl.material.opacity = 0.9 * (1 - f);
        };
        break;
      }
      case 'swarmBurst': {
        const m = basic('#c2b23a', {});
        const bits = [];
        for (let i = 0; i < 14; i++) bits.push(mesh(g, GEO.SPH_LO(), m, 2, 2, 2, 0, 10, 0, false));
        o.update = (f) => { bits.forEach((b, i) => { const a = i / 14 * TAU, d = f * 80; b.position.set(Math.cos(a) * d, 10 + Math.sin(f * Math.PI) * 20 + (i % 3) * 4, Math.sin(a) * d * 0.7); }); fade(m, 1 - f); };
        break;
      }
      case 'plant': {
        const m = std('#8bc46a', { opacity: 1 });
        const st = mesh(g, GEO.CONE(), m, 2, 1, 2, 0, 0, 0, false);
        o.update = (f) => { st.scale.y = 4 + f * 18; m.opacity = 1 - f * 0.8; };
        break;
      }
      case 'bogForm': {
        const ring = mesh(g, ringGeo(0.9), basic('#8fbf3f', { side: THREE.DoubleSide }), 1, 1, 1, 0, 2, 0, false);
        o.update = (f) => { ring.scale.set(Math.max(1, f * 46), 1, Math.max(1, f * 32)); fade(ring.material, 1 - f); };
        break;
      }
      case 'steal': {
        const gm = std('#e8c25a', { emissive: '#d9b87a', ei: 0.8, metal: 0.6 });
        const coin = mesh(g, GEO.CYL(), gm, 4, 1.2, 4, 0, 10, 0, false);
        const gl = glowSprite('#d9b87a', 26, 0.8); g.add(gl);
        o.update = (f, t) => { coin.position.y = 10 + f * 30; coin.rotation.x = t * 8; gm.opacity = 1 - f; gm.transparent = true; gl.position.y = coin.position.y; gl.material.opacity = 0.8 * (1 - f); };
        break;
      }
      case 'biolum': {
        const ring = mesh(g, ringGeo(0.9), basic(e.col || '#68e0e8', { add: true, side: THREE.DoubleSide }), 1, 1, 1, 0, 3, 0, false);
        const gl = glowSprite(e.col || '#68e0e8', 80, 0.6); gl.position.y = 14; g.add(gl);
        o.update = (f) => { const rr = 10 + f * 60; ring.scale.set(rr, 1, rr); fade(ring.material, 1 - f); gl.material.opacity = 0.6 * (1 - f); };
        break;
      }
      case 'breathSu': {
        const m = std('#3b9ae1', { opacity: 0.85, rough: 0.1, emissive: '#1a5a8a', ei: 0.5 });
        const bubs = [];
        for (let i = 0; i < 4; i++) bubs.push(mesh(g, GEO.SPH_LO(), m, 3, 3, 3, i * 5 - 7, 10, 0, false));
        o.update = (f) => { bubs.forEach((b, i) => { b.position.y = 10 + f * 26 + i * 4; b.scale.setScalar(3.2 - f * 2); }); m.opacity = 0.85 * (1 - f); };
        break;
      }
      case 'headLost': {
        const gl = glowSprite('#ffffff', 50, 1); g.add(gl);
        o.update = (f) => { gl.position.y = 30 + f * 40; gl.material.opacity = 1 - f; gl.scale.setScalar(30 + f * 40); };
        break;
      }
      default: {
        const gl = glowSprite('#ffffff', 30, 0.6); gl.position.y = 10; g.add(gl);
        o.update = (f) => { gl.material.opacity = 0.6 * (1 - f); };
      }
    }
    return o;
  };

  /* ---------------- 2D overlay: hp bars, names, markers ---------------- */
  P3.drawOverlay = function () {
    const R = this, M = R.match, g = R.octx, dset = R.dset;
    if (!g) return;
    const dpr = R.dpr || 1;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, R.overlay.width, R.overlay.height);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* hoard name plates */
    g.font = '600 13px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    M.teams.forEach(Tm => {
      if (Tm.controller === 'wild' || !Tm.name || !Tm.hoard) return;
      const p = R.toScreen(Tm.hoard.x, Tm.hoard.y, 64);
      if (p.behind) return;
      const tw = g.measureText(Tm.name).width;
      g.fillStyle = 'rgba(12,10,16,0.62)'; g.fillRect(p.x - tw / 2 - 7, p.y - 10, tw + 14, 20);
      g.strokeStyle = Tm.color + 'aa'; g.lineWidth = 1.5; g.strokeRect(p.x - tw / 2 - 7, p.y - 10, tw + 14, 20);
      g.fillStyle = Tm.color; g.fillText(Tm.name, p.x, p.y);
    });
    /* creatures: hp, boss skull, relic marker, stun stars */
    const pxPerUnit = R.h / (2 * Math.tan(R.camera.fov * Math.PI / 360));
    for (const [, o] of R.objs.creatures) {
      const c = o.c;
      if (!c || !o.obj.visible || c.dead) continue;
      const p = R.toScreen(c.x, c.y, o.topY + 6);
      if (p.behind) continue;
      const dist = R.camera.position.distanceTo(R.v3.set(c.x, o.topY, c.y));
      const scr = o.r * pxPerUnit / dist;
      if (!c.riding && c.hp < c.maxHp && !c.sp.tags.includes('inert')) {
        const bw = Math.max(20, Math.min(70, scr * 2.2)), frac = Math.max(0, c.hp / c.maxHp);
        g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(p.x - bw / 2 - 1, p.y - 1, bw + 2, 6);
        g.fillStyle = dset.colorblind ? (frac > 0.4 ? '#3ba7e1' : '#e8d24a') : (frac > 0.55 ? '#5aba5a' : frac > 0.25 ? '#d9b23a' : '#c14953');
        g.fillRect(p.x - bw / 2, p.y, bw * frac, 4);
      }
      if (c.isBoss) { g.fillStyle = '#fff'; g.font = 'bold 15px serif'; g.fillText('☠', p.x, p.y - 12); g.font = '600 13px system-ui, sans-serif'; }
      if (c.stunnedUntil > M.tick) {
        g.fillStyle = '#ffe88a';
        for (let i = 0; i < 3; i++) { const a = R.t * 4 + i * TAU / 3; g.beginPath(); g.arc(p.x + Math.cos(a) * 12, p.y - 8 + Math.sin(a) * 4, 2.2, 0, TAU); g.fill(); }
      }
    }
    /* structure hp */
    for (const [, o] of R.objs.structures) {
      const s = o.s;
      if (!s || s.hp >= s.maxHp) continue;
      const p = R.toScreen(s.x, s.y, o.topH);
      if (p.behind) continue;
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(p.x - 18, p.y - 1, 36, 5);
      g.fillStyle = '#d9b23a'; g.fillRect(p.x - 17, p.y, 34 * Math.max(0, s.hp / s.maxHp), 3);
    }
  };

  /* ================================================================
     SWITCH — the match screens call `new DYA.render.Renderer(...)`
     ================================================================ */
  function Renderer(canvas, match) {
    if (want3D() && webglOK()) {
      try { return new Renderer3D(canvas, match); }
      catch (e) { console.warn('[3D] falling back to the 2D renderer:', e); }
    }
    const r2 = new Renderer2D(canvas, match);
    if (webglOK()) offer3D(canvas);
    return r2;
  }
  /* in 2D mode, a small button to switch back to the 3D view */
  function offer3D(canvas) {
    const par = canvas.parentNode;
    if (!par) return;
    const b = document.createElement('button');
    b.className = 'btn small ghost'; b.textContent = '3D'; b.title = 'Use the 3D battle view from the next match';
    b.style.cssText = 'position:absolute;left:14px;top:96px;z-index:30;min-width:38px;padding:4px 6px;font-size:13px;color:#f0e2c0;background:rgba(20,16,11,0.72);border:1px solid #6a5a3e;border-radius:6px;cursor:pointer;';
    b.addEventListener('click', (e) => {
      e.stopPropagation(); b.blur();
      try { localStorage.setItem(MODE_KEY, '3d'); } catch (err) { /* ignore */ }
      if (DYA.ui && DYA.ui.toast) DYA.ui.toast({ title: '3D view next match', body: 'Battles will play out in 3D from your next match.', icon: '🧊' });
    });
    par.appendChild(b);
  }
  Renderer.prototype = Renderer2D.prototype;
  DYA.render.Renderer = Renderer;
  DYA.render.Renderer2D = Renderer2D;
  DYA.render.Renderer3D = Renderer3D;
  DYA.render.want3D = want3D;
  DYA.render.setMode = function (mode) { try { localStorage.setItem(MODE_KEY, mode); } catch (e) { /* ignore */ } };
})();
