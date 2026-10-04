/* ============================================================
   DYA'AKARA — engine3d/viewer3d.js          (3D battle preview)
   The token detail page's 3D viewer: the token's own battle model
   (same rig, same coat drift, same shimmer) on a pedestal you can
   spin, tilt and zoom, with pose buttons to watch it idle, walk,
   run, attack, use its special, take a hit, or fly.

   DYA.viewer3d.mount(container, tok) → { dispose() } or null when
   3D isn't available (the caller keeps its 2D turntable).
   ============================================================ */
(function () {
  'use strict';
  if (!window.THREE || !DYA.models3d) return;
  const THREE = window.THREE;
  const M3 = DYA.models3d, SP = DYA.species, SPR = DYA.sprites;
  const TAU = Math.PI * 2;

  function available() {
    if (DYA.render && DYA.render.want3D && !DYA.render.want3D()) return false;
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
    catch (e) { return false; }
  }

  /* the individual's own coat (the same drift the battle renderer applies) */
  function lookFor(tok) {
    const sp0 = SP.get(tok.speciesId);
    const indiv = DYA.token && DYA.token.physique ? DYA.token.physique(tok) : null;
    let sp = sp0;
    if (indiv && (indiv.hue || indiv.light)) {
      sp = Object.assign({}, sp0, {
        color: sp0.color ? SPR.hueShift(sp0.color, indiv.hue, indiv.light) : sp0.color,
        color2: sp0.color2 ? SPR.hueShift(sp0.color2, indiv.hue * 0.7, indiv.light * 0.6) : sp0.color2,
      });
    }
    return { sp, sp0, build: indiv && indiv.build ? indiv.build : 1 };
  }

  function btnCss(on) {
    return 'padding:4px 9px;font-size:12px;border-radius:14px;cursor:pointer;border:1px solid ' + (on ? '#d9b23a' : '#6a5a3e') +
      ';background:' + (on ? 'rgba(217,178,58,0.88)' : 'rgba(20,16,11,0.72)') + ';color:' + (on ? '#1a140c' : '#f0e2c0') + ';';
  }

  function mount(container, tok) {
    if (!available()) return null;
    const look = lookFor(tok);
    const sp = look.sp, F = sp.features || {};
    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab;display:block;';
    container.appendChild(cv);
    let gl;
    try { gl = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); }
    catch (e) { cv.remove(); return null; }
    gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(32, 1, 0.05, 200);

    /* studio light: soft sky fill, warm key with shadow, cool rim from behind */
    scene.add(new THREE.HemisphereLight(0xd8e4ff, 0x3a2e20, 0.5));
    const key = new THREE.DirectionalLight(0xfff0d8, 1.0);
    key.position.set(4, 7, 5); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 25 });
    key.shadow.bias = -0.002;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fd8ff, 0.7);
    rim.position.set(-5, 4, -6);
    scene.add(rim);
    try {
      const pm = new THREE.PMREMGenerator(gl);
      const es = new THREE.Scene();
      es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 24, 12), new THREE.ShaderMaterial({
        side: THREE.BackSide,
        vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = mix(vec3(0.16,0.12,0.08), vec3(0.42,0.46,0.52), smoothstep(-0.3, 0.8, h)); gl_FragColor = vec4(c, 1.0); }',
      })));
      scene.environment = pm.fromScene(es, 0.04).texture;
      pm.dispose();
    } catch (e) { /* optional */ }

    /* pedestal: a carved stone drum with a gold rim and the Okid glow */
    const ped = new THREE.Group(); scene.add(ped);
    const stone = new THREE.MeshStandardMaterial({ color: 0x3e362e, roughness: 0.95, flatShading: true, envMapIntensity: 0.4 });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.0, 0.3, 48), stone);
    top.position.y = -0.15; top.receiveShadow = true; ped.add(top);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.25, 0.35, 48), new THREE.MeshStandardMaterial({ color: 0x2c261f, roughness: 0.95, flatShading: true, envMapIntensity: 0.4 }));
    base.position.y = -0.47; base.receiveShadow = true; ped.add(base);
    const gold = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.035, 8, 72), new THREE.MeshStandardMaterial({ color: 0xd9b23a, metalness: 0.8, roughness: 0.3 }));
    gold.rotation.x = Math.PI / 2; gold.position.y = 0.0; ped.add(gold);
    const elCol = SP.ELEMENT_COLORS[look.sp0.element] || '#68e0e8';
    const glowRing = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.6, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(elCol), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    glowRing.rotation.x = -Math.PI / 2; glowRing.position.y = 0.01; ped.add(glowRing);
    /* engraved rune ticks around the rim */
    const tickM = new THREE.MeshBasicMaterial({ color: 0xd9b87a, transparent: true, opacity: 0.6 });
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * TAU, tk = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.16), tickM);
      tk.position.set(Math.cos(a) * 1.75, 0.01, Math.sin(a) * 1.75); tk.rotation.y = -a; ped.add(tk);
    }

    /* the creature itself — the exact battle model */
    const model = M3.build(sp, { heads: tok.picks && tok.picks.headCount ? tok.picks.headCount : (F.heads ? F.heads[0] : 1) });
    const holder = new THREE.Group(); scene.add(holder);
    const scaler = new THREE.Group(); holder.add(scaler); scaler.add(model.root);
    model.root.traverse(o => { if (o.isMesh || o.isInstancedMesh) o.castShadow = true; });
    /* frame it: measure the model's bounds and fit it to the pedestal */
    const box = new THREE.Box3().setFromObject(model.root);
    const size = box.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.z * 0.9, size.y * 0.8, 0.5);
    const fit = 2.9 / span;
    scaler.scale.setScalar(fit);
    const height = size.y * fit;
    const centerX = (box.min.x + box.max.x) / 2 * fit;
    scaler.position.x = -centerX * 0;   // turntable spins about the creature's own feet
    const glow = (F.biolum || F.biolumTail || F.glow || model.emitsLight) ? (function () {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), color: new THREE.Color(model.emitsLight || sp.color2 || '#68e0e8'), blending: THREE.AdditiveBlending, transparent: true, opacity: 0.35, depthWrite: false }));
      s.scale.set(4, 4, 1); s.position.y = height * 0.45; holder.add(s);
      return s;
    })() : null;

    /* summon: the Okid coin spins down and the creature grows out of it */
    const coin = new THREE.Group(); scene.add(coin);
    const coinM = new THREE.MeshStandardMaterial({ color: 0xc9a052, metalness: 0.85, roughness: 0.3, emissive: 0x3a2a08 });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.07, 40), coinM);
    disc.rotation.x = Math.PI / 2; coin.add(disc);
    const gem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 24), new THREE.MeshStandardMaterial({ color: new THREE.Color(elCol), emissive: new THREE.Color(elCol), emissiveIntensity: 0.9 }));
    gem.rotation.x = Math.PI / 2; coin.add(gem);

    /* ---------- controls: drag to spin / tilt, wheel or pinch to zoom ---------- */
    const view = { yaw: 0.6, pitch: 0.26, dist: 9, auto: true, spinV: 0 };
    const ptrs = new Map();
    let last = null, pinch0 = 0, lastTap = 0;
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      last = [e.clientX, e.clientY];
      if (ptrs.size === 2) { const v = [...ptrs.values()]; pinch0 = Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]); }
      view.auto = false; setAutoBtn();
      cv.style.cursor = 'grabbing';
      const now = performance.now();
      if (now - lastTap < 300) { Object.assign(view, { yaw: 0.6, pitch: 0.26, dist: 9 }); }
      lastTap = now;
    });
    cv.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptrs.size === 2) {
        const v = [...ptrs.values()], d = Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]);
        if (pinch0) view.dist = Math.max(3.2, Math.min(14, view.dist * pinch0 / d));
        pinch0 = d;
        return;
      }
      const dx = e.clientX - last[0], dy = e.clientY - last[1];
      last = [e.clientX, e.clientY];
      view.yaw -= dx * 0.01; view.spinV = -dx * 0.01;
      view.pitch = Math.max(-0.05, Math.min(1.35, view.pitch + dy * 0.006));
    });
    const up = (e) => { ptrs.delete(e.pointerId); pinch0 = 0; cv.style.cursor = 'grab'; };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); view.dist = Math.max(3.2, Math.min(14, view.dist * Math.exp(e.deltaY * 0.0012))); }, { passive: false });

    /* ---------- pose bar ---------- */
    const bar = document.createElement('div');
    bar.style.cssText = 'position:absolute;left:50%;bottom:14px;transform:translateX(-50%);z-index:3;display:flex;gap:5px;flex-wrap:wrap;justify-content:center;max-width:94%;';
    const poses = [['idle', 'Idle'], ['walk', 'Walk'], ['run', 'Run'], ['attack', 'Attack'], ['special', 'Special'], ['hit', 'Hit']];
    if (M3.isFlier(look.sp0)) poses.push(['fly', 'Fly']);
    let pose = 'idle', poseT = 0;
    const poseBtns = {};
    poses.forEach(([id, label]) => {
      const b = document.createElement('button');
      b.textContent = label; b.style.cssText = btnCss(id === pose);
      b.addEventListener('click', (e) => { e.stopPropagation(); pose = id; poseT = 0; for (const k in poseBtns) poseBtns[k].style.cssText = btnCss(k === pose); });
      poseBtns[id] = b; bar.appendChild(b);
    });
    const autoBtn = document.createElement('button');
    function setAutoBtn() { autoBtn.textContent = view.auto ? '⟳ Spinning' : '⟳ Spin'; autoBtn.style.cssText = btnCss(view.auto); }
    autoBtn.addEventListener('click', (e) => { e.stopPropagation(); view.auto = !view.auto; setAutoBtn(); });
    setAutoBtn();
    bar.appendChild(autoBtn);
    container.appendChild(bar);
    const hint = document.createElement('div');
    hint.textContent = 'Drag to turn · scroll or pinch to zoom · double-tap to reset';
    hint.style.cssText = 'position:absolute;top:16px;right:16px;z-index:3;font:12px system-ui,sans-serif;color:rgba(240,226,192,0.55);pointer-events:none;text-align:right;';
    container.appendChild(hint);

    /* ---------- loop ---------- */
    let raf = 0, prev = performance.now(), t = 0, dead = false, w0 = 0, h0 = 0;
    const kit = model.kit;
    kit.glowMats.forEach(m => { m.emissiveIntensity = m.userData.ei || 1; });
    function frame(now) {
      if (dead) return;
      if (!cv.isConnected) { dispose(); return; }
      const dt = Math.min(0.1, (now - prev) / 1000); prev = now; t += dt; poseT += dt;
      const w = container.clientWidth || 1, h = container.clientHeight || 1;
      if (w !== w0 || h !== h0) { w0 = w; h0 = h; gl.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
      if (view.auto) view.yaw += dt * 0.45;
      else if (Math.abs(view.spinV) > 0.0005 && !ptrs.size) { view.yaw += view.spinV; view.spinV *= 0.92; }
      /* tall frames (phones) back the camera off so the creature still fits */
      const aspectK = cam.aspect < 1 ? 1 / Math.max(0.55, cam.aspect) : 1;
      const d = view.dist * aspectK, ty = Math.max(0.6, height * 0.45);
      cam.position.set(Math.sin(view.yaw) * Math.cos(view.pitch) * d, ty + Math.sin(view.pitch) * d, Math.cos(view.yaw) * Math.cos(view.pitch) * d);
      cam.lookAt(0, ty * 0.9, 0);
      M3.time.value = t;
      /* summon intro: coin falls and spins, then the creature grows out of it */
      const intro = Math.min(1, t / 1.1);
      coin.visible = intro < 0.75;
      coin.position.y = 2.6 * Math.max(0, 1 - intro / 0.55) + 0.06;
      coin.rotation.y = t * 9;
      coin.scale.setScalar(intro > 0.55 ? Math.max(0.01, 1 - (intro - 0.55) / 0.2) : 1);
      const ga = Math.max(0, Math.min(1, (t - 0.55) / 0.55));
      const grow = ga >= 1 ? 1 : Math.max(0.001, 1 + 2.70158 * Math.pow(ga - 1, 3) + 1.70158 * Math.pow(ga - 1, 2));
      glowRing.material.opacity = 0.16 + 0.07 * Math.sin(t * 2) + (1 - ga) * 0.35;
      /* pose → the same animation inputs the battle renderer feeds the rig */
      const moving = pose === 'walk' || pose === 'run' || pose === 'fly';
      const flier = pose === 'fly';
      const st = {
        state: pose === 'fly' ? 'walk' : pose, t, speed: pose === 'walk' ? 0.7 : pose === 'run' ? 1.35 : flier ? 1 : 0,
        attack: pose === 'attack' ? Math.max(0, Math.sin(t * 12)) : 0,
        dormant: false, dead: false, airborne: flier, heads: tok.picks && tok.picks.headCount, heat: 1, swarmFrac: 1,
        charged: pose === 'special' || pose === 'attack', biolum: true, hasRider: false,
      };
      if (st.state === 'run' && !moving) st.state = 'idle';
      model.anim(st);
      /* walking in place: a gentle bob so the gait reads on the turntable */
      const alt = flier ? 0.9 + Math.sin(t * 2.2) * 0.12 : 0;
      scaler.position.y = alt;
      scaler.scale.setScalar(fit * grow);
      kit.u.uShimmer.value = 0.22 * (Math.sin(t * 0.7) > 0.985 ? 1.8 : 1);
      kit.u.uFlash.value = pose === 'hit' ? Math.max(0, Math.sin(poseT * 8)) * 0.35 : 0;
      if (pose === 'hit') { const k = Math.max(0, Math.sin(poseT * 8)); scaler.scale.set(fit * (1 + 0.06 * k), fit * (1 - 0.1 * k), fit * (1 + 0.06 * k)); }
      if (glow) { glow.material.opacity = 0.3 + 0.08 * Math.sin(t * 2); glow.position.y = alt + height * 0.45; }
      gl.render(scene, cam);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function dispose() {
      if (dead) return;
      dead = true;
      cancelAnimationFrame(raf);
      scene.traverse(o => {
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
      });
      [ped, coin].forEach(g => g.traverse(o => { if (o.geometry) o.geometry.dispose(); }));
      if (scene.environment) scene.environment.dispose();
      gl.dispose();
      try { gl.forceContextLoss(); } catch (e) { /* ignore */ }
      cv.remove(); bar.remove(); hint.remove();
    }
    return { dispose };
  }

  DYA.viewer3d = { mount, available };
})();
