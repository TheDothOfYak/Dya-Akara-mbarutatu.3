// © 2026 Isaac Flake. All Rights Reserved.
/* ============================================================
   LÚTUT RIDER — js/lr_tame3d.js
   The opening, in 3D: taming your Lútut.

   A wild Lútut lands in the downs. You creep up behind it (stand
   still whenever it looks round, or it screeches you back), leap on
   its back, and hold on while it bucks across the sky (lean against
   its rolls; grab on through its screeches and barrel rolls) until
   it tires, glides down, and is yours.

   It is played by Torcain's Run's own models: the Lútut from
   rpg/assets/models/lutut.glb (rpg/js/lutut3d.js) and an Eikar
   from rpg/js/actors.js, so they look the same as in the 3D game.

     import('./lr_tame3d.js').then(T => T.runTame({ kind, host, snd }))
       → Promise<{ result: 'tamed' | 'skipped', why? }>
   ============================================================ */
import * as THREE from 'three';
import { loadLutut, buildLututActor, LUTUT } from '../../../rpg/js/lutut3d.js';
import { buildEikar } from '../../../rpg/js/actors.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, r, dt) => a + (b - a) * (1 - Math.exp(-r * dt));
const dAng = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/* how hard each Lútut is to tame */
const HARD = { young: 1, adult: 1.3, old: 1.6 };
const VARIANT = { young: 'young', adult: 'adult', old: 'old' };
const NAME = { young: 'young Lútut', adult: 'grown Lútut', old: 'old Lútut' };

/* the downs: flat in the middle, rolling further out */
function groundH(x, z) {
  const d = Math.hypot(x, z), k = clamp((d - 45) / 60, 0, 1);
  return k * (6 * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017) + 3.5 * Math.sin(x * 0.05 + z * 0.043)) + 0.4 * Math.sin(x * 0.3) * Math.sin(z * 0.27);
}

function mulberry(a) { return () => { a = (a + 0x6D2B79F5) | 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function buildWorld(scene) {
  const rnd = mulberry(77);
  /* sky: a dome, dusk over the downs */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x3a5c9a) }, mid: { value: new THREE.Color(0xf0b070) }, low: { value: new THREE.Color(0xffd8a0) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 low; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.08 ? mix(mid, top, smoothstep(0.08, 0.6, h)) : mix(low, mid, smoothstep(-0.05, 0.08, h)); gl_FragColor = vec4(c, 1.0); }',
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat); scene.add(dome);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(30, 32), new THREE.MeshBasicMaterial({ color: 0xfff2c8, fog: false }));
  sun.position.set(-420, 120, -620); sun.lookAt(0, 0, 0); scene.add(sun);

  /* the ground */
  const G = new THREE.PlaneGeometry(700, 700, 140, 140); G.rotateX(-Math.PI / 2);
  const pos = G.attributes.position, cols = [];
  const cA = new THREE.Color(0x5f8a3a), cB = new THREE.Color(0x7aa848), cC = new THREE.Color(0x4a6a2e), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, groundH(x, z));
    const n = 0.5 + 0.5 * Math.sin(x * 0.11) * Math.cos(z * 0.13 + 2);
    tmp.copy(cA).lerp(n > 0.5 ? cB : cC, Math.abs(n - 0.5) * 1.6); cols.push(tmp.r, tmp.g, tmp.b);
  }
  G.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); G.computeVertexNormals();
  const ground = new THREE.Mesh(G, new THREE.MeshLambertMaterial({ vertexColors: true }));
  ground.receiveShadow = true; scene.add(ground);

  /* grass tufts */
  const tuft = new THREE.ConeGeometry(0.07, 0.32, 3); tuft.translate(0, 0.16, 0);
  const tufts = new THREE.InstancedMesh(tuft, new THREE.MeshLambertMaterial({ color: 0x86b852 }), 2600), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < 2600; i++) {
    const a = rnd() * TAU, r = 4 + Math.sqrt(rnd()) * 150, x = Math.cos(a) * r, z = Math.sin(a) * r;
    q.setFromAxisAngle(new THREE.Vector3(rnd() - 0.5, 0, rnd() - 0.5).normalize(), rnd() * 0.4); s.setScalar(0.6 + rnd() * 1.1);
    m.compose(p.set(x, groundH(x, z), z), q, s); tufts.setMatrixAt(i, m);
  }
  scene.add(tufts);

  /* standing stones with old chevrons, and trees round the edge */
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x8a8478 });
  for (let i = 0; i < 26; i++) {
    const a = rnd() * TAU, r = 26 + rnd() * 120, x = Math.cos(a) * r, z = Math.sin(a) * r, h = 1.5 + rnd() * 3;
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.45 + rnd() * 0.3, 0.75 + rnd() * 0.4, h, 6), stoneMat);
    st.position.set(x, groundH(x, z) + h / 2 - 0.2, z); st.rotation.set((rnd() - 0.5) * 0.25, rnd() * TAU, (rnd() - 0.5) * 0.25);
    st.castShadow = true; scene.add(st);
  }
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3e26 }), leafMat = new THREE.MeshLambertMaterial({ color: 0x3e6a30 }), leaf2 = new THREE.MeshLambertMaterial({ color: 0x4e7e3a });
  for (let i = 0; i < 60; i++) {
    const a = rnd() * TAU, r = 70 + rnd() * 160, x = Math.cos(a) * r, z = Math.sin(a) * r, h = 7 + rnd() * 9, y0 = groundH(x, z);
    const tree = new THREE.Group(); tree.position.set(x, y0, z);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, h, 7), trunkMat); tr.position.y = h / 2; tr.castShadow = true; tree.add(tr);
    for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(2 + rnd() * 1.8, 0), k % 2 ? leafMat : leaf2); c.position.set((rnd() - 0.5) * 3, h + (rnd() - 0.3) * 2.5, (rnd() - 0.5) * 3); c.castShadow = true; tree.add(c); }
    scene.add(tree);
  }
  /* the roost: a great hollow stump on the rise, lit windows */
  const roost = new THREE.Group(); roost.position.set(-30, groundH(-30, -70), -70);
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 8, 13, 14, 1, true), new THREE.MeshLambertMaterial({ color: 0x5a3a22, side: THREE.DoubleSide }));
  stump.position.y = 6.5; stump.castShadow = true; roost.add(stump);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 0.6, 14), new THREE.MeshLambertMaterial({ color: 0xa8804a })); lid.position.y = 13; roost.add(lid);
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffb860 });
  for (const [a, y] of [[0.3, 4], [0.9, 8], [-0.4, 9], [1.6, 5]]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.7, 10), winMat); w.position.set(Math.sin(a) * 7.3, y, Math.cos(a) * 7.3); w.lookAt(Math.sin(a) * 20, y, Math.cos(a) * 20); roost.add(w); }
  scene.add(roost);

  /* light: a low warm sun, a cool sky */
  /* the same lighting as Torcain's Run's open regions (rpg/js/main.js) */
  scene.add(new THREE.HemisphereLight(0xb8d0ff, 0xc0804e, 1.25));
  const rim = new THREE.DirectionalLight(0x9ab8ff, 0.55); rim.position.set(60, 40, -80); scene.add(rim);
  const dl = new THREE.DirectionalLight(0xffd4a0, 2.7); dl.position.set(-60, 50, -80);
  dl.castShadow = true; dl.shadow.mapSize.set(1024, 1024); dl.shadow.bias = -0.0008; dl.shadow.normalBias = 0.06; const sc = dl.shadow.camera; sc.left = sc.bottom = -45; sc.right = sc.top = 45; sc.near = 1; sc.far = 260;
  scene.add(dl); scene.add(dl.target);
  scene.fog = new THREE.Fog(0xe8c090, 90, 420);
  return { dl, dome };
}

/* ================= the HUD (DOM) ================= */
function hud(host) {
  host.innerHTML = `
    <canvas class="t3cv"></canvas>
    <div class="t3top"><div class="t3title"></div><div class="t3sub"></div></div>
    <div class="t3bars hidden">
      <div class="t3lab">Balance</div><div class="t3bal"><i class="t3zone"></i><i class="t3needle"></i></div>
      <div class="t3lab">Wildness</div><div class="t3wild"><i></i></div>
    </div>
    <div class="t3near hidden"><div class="t3lab">Closer</div><div class="t3prog"><i></i></div></div>
    <div class="t3msg"></div>
    <div class="t3pads">
      <button class="t3pad" data-k="left" type="button"><span>◀</span>LEAN<small>← / A</small></button>
      <button class="t3pad big" data-k="grab" type="button"><span>✊</span>GRAB<small>Space</small></button>
      <button class="t3pad" data-k="right" type="button"><span>▶</span>LEAN<small>→ / D</small></button>
    </div>
    <button class="t3skip" type="button">Skip ⏭</button>
    <div class="t3end hidden"></div>`;
  const q = s => host.querySelector(s);
  return { cv: q('.t3cv'), title: q('.t3title'), sub: q('.t3sub'), bars: q('.t3bars'), needle: q('.t3needle'), zone: q('.t3zone'), wild: q('.t3wild i'),
    near: q('.t3near'), prog: q('.t3prog i'), msg: q('.t3msg'), pads: q('.t3pads'), skip: q('.t3skip'), end: q('.t3end'),
    pad: k => q('.t3pad[data-k=' + k + ']') };
}

export async function runTame(opts = {}) {
  const kind = opts.kind || 'young', H = HARD[kind] || 1, snd = opts.snd || {};
  const host = opts.host;
  const U = hud(host);
  host.classList.remove('hidden');
  const say = (t, s) => { U.title.textContent = t || ''; U.sub.innerHTML = s || ''; };
  say('Loading…', '');

  /* ---------- the renderer ---------- */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: U.cv, antialias: true });
  } catch (e) { host.classList.add('hidden'); return { result: 'skipped', why: 'no 3D in this browser' }; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);
  const W0 = buildWorld(scene);
  /* light bouncing off the sky, so the Lútut's own materials (made for it, in Blender) read as they should */
  {
    const pm = new THREE.PMREMGenerator(renderer), skyOnly = new THREE.Scene();
    skyOnly.add(new THREE.Mesh(W0.dome.geometry, W0.dome.material));
    skyOnly.add(new THREE.Mesh(new THREE.CircleGeometry(900, 24).rotateX(-Math.PI / 2).translate(0, -40, 0), new THREE.MeshBasicMaterial({ color: 0x4a6a2e, side: THREE.DoubleSide })));
    scene.environment = pm.fromScene(skyOnly, 0.03).texture;
    scene.environmentIntensity = 1.1;
    pm.dispose();
  }
  function size() { const w = host.clientWidth || window.innerWidth, h = host.clientHeight || window.innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  size(); window.addEventListener('resize', size);

  /* ---------- the two of them ---------- */
  await loadLutut();
  const LA = buildLututActor({ variant: VARIANT[kind] }), L = LA.lutut;
  L.driven = true;
  LA.root.rotation.order = 'YXZ';
  scene.add(LA.root);
  const E = buildEikar({ skin: '#a8743e', cap: '#5a3a1e', marking: 0xffd27a, markColor: 0x2a1208, tunic: 0x3e6a5a, trim: 0xc8a050, weapon: 'none', satchel: false, flasks: false, build: 1, capTall: 0.62 });
  E.root.rotation.order = 'YXZ';
  scene.add(E.root);
  E.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const bodyC = () => { const cs = L.colliders(); let best = cs[0]; for (const c of cs) if (c.kind === 'body' && /mid/.test(c.name)) best = c; return best; };

  /* ---------- input ---------- */
  const keys = { left: false, right: false, grab: false };
  const KL = ['ArrowLeft', 'KeyA'], KR = ['ArrowRight', 'KeyD', 'ArrowUp', 'KeyW'], KG = ['Space', 'Enter'];
  const kd = e => { if (KL.includes(e.code)) keys.left = true; else if (KR.includes(e.code)) keys.right = true; else if (KG.includes(e.code)) keys.grab = true; else return; e.preventDefault(); };
  const ku = e => { if (KL.includes(e.code)) keys.left = false; if (KR.includes(e.code)) keys.right = false; if (KG.includes(e.code)) keys.grab = false; };
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
  const held = { left: 0, right: 0, grab: 0 };
  for (const k of ['left', 'right', 'grab']) {
    const el = U.pad(k);
    el.addEventListener('pointerdown', e => { e.preventDefault(); held[k]++; el.classList.add('down'); try { el.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } });
    const up = e => { e.preventDefault(); held[k] = Math.max(0, held[k] - 1); if (!held[k]) el.classList.remove('down'); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('contextmenu', e => e.preventDefault());
  }
  const inp = () => ({ left: keys.left || held.left > 0, right: keys.right || held.right > 0, grab: keys.grab || held.grab > 0 });

  /* ---------- the story ---------- */
  const S = {
    phase: 'arrive', t: 0, pt: 0,
    lp: new THREE.Vector3(30, 22, 10), lyaw: 0, lpitch: 0, lroll: 0, lspeed: 14,
    ep: new THREE.Vector3(0, 0, -24), eyaw: 0, espeed: 0,
    watch: 0, calmT: 3, look: 0, caught: 0, knock: 0,
    jumpT: 0, jumpFrom: null,
    flyA: 0, bal: 0, balV: 0, wild: 100, buck: null, buckT: 1.8, grabNeed: 0, thrownT: 0, rv: new THREE.Vector3(), bucksDone: 0,
    shake: 0, done: null, auto: !!opts.auto,
  };
  if (opts.expose) opts.expose(S);
  const LAND = new THREE.Vector3(0, 0, 0);
  const groundAt = v => groundH(v.x, v.z);
  function setPhase(p) { S.phase = p; S.pt = 0; if (U.msg) U.msg.className = 't3msg'; }
  const fwd = yaw => new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));

  let resolve; const finished = new Promise(r => { resolve = r; });
  let running = true;
  U.skip.onclick = () => finish({ result: 'skipped', why: 'skipped' });
  function finish(res) {
    if (!running) return; running = false;
    window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('resize', size);
    renderer.setAnimationLoop(null);
    renderer.dispose();
    host.classList.add('hidden'); host.innerHTML = '';
    resolve(res);
  }

  /* ---------- the bucks while you hold on ---------- */
  const BUCKS = ['roll', 'roll', 'swipe', 'swipe', 'screech', 'dive', 'barrel'];
  function newBuck() {
    let k = BUCKS[Math.floor(Math.random() * BUCKS.length)];
    if (S.bucksDone < 2) k = S.bucksDone ? 'swipe' : 'roll';           // the first two teach leaning
    if (S.bucksDone === 3) k = 'screech';                                 // then grabbing
    const side = Math.random() < 0.5 ? -1 : 1;
    S.buck = { k, side, t: 0, len: k === 'barrel' ? 1.5 : k === 'screech' ? 1.4 : k === 'dive' ? 2.2 : 1.1 };
    S.bucksDone++;
    if (k === 'swipe') L.play(side < 0 ? 'TailSwipeL' : 'TailSwipeR', 0.12);
    if (k === 'screech') { L.play('Screech', 0.12); snd.screech && snd.screech(); S.grabNeed = 1; }
    if (k === 'barrel') S.grabNeed = 1;
    if (k === 'dive') L.play('Dive', 0.2);
    const tip = { roll: side < 0 ? 'It rolls left: lean right!' : 'It rolls right: lean left!', swipe: 'Tail swipe!', screech: 'SCREECH! Hold GRAB!', dive: 'It dives!', barrel: 'Barrel roll! Hold GRAB!' };
    U.msg.textContent = tip[k]; U.msg.className = 't3msg show' + (S.grabNeed ? ' grab' : '');
  }

  /* ---------- one frame ---------- */
  const clock = new THREE.Clock();
  const camPos = new THREE.Vector3(40, 18, -40), camLook = new THREE.Vector3();
  function frame() {
    if (!running) return;
    const dt = opts.dt || Math.min(0.05, clock.getDelta());
    S.t += dt; S.pt += dt;
    const I = S.auto ? autoInput() : inp();
    const ph = S.phase;
    if (ph !== S.padsFor) {
      S.padsFor = ph;
      const riding = ph === 'takeoff' || ph === 'buck';
      U.pad('left').style.visibility = riding ? 'visible' : 'hidden';
      U.pad('right').innerHTML = riding ? '<span>▶</span>LEAN<small>→ / D</small>' : '<span>▶</span>CREEP<small>→ / D</small>';
      U.pad('right').style.visibility = ph === 'creep' || riding ? 'visible' : 'hidden';
      U.pad('grab').style.visibility = ph === 'creep' || riding ? 'visible' : 'hidden';
    }

    if (ph === 'arrive') {
      /* it circles in and lands, facing away from you */
      say('A wild ' + NAME[kind] + '…', 'It is coming down in the downs.');
      const T = 6.5;
      if (S.pt < T - 2.2) {
        const a = 1.2 + S.pt * 0.55, r = 34 - S.pt * 4;
        S.lp.set(Math.cos(a) * r, 20 - S.pt * 3, Math.sin(a) * r);
        S.lyaw = Math.atan2(-Math.sin(a), Math.cos(a)) ;
        L.play('Fly');
        S.lroll = damp(S.lroll, -0.35, 3, dt);
      } else {
        L.play('LandGlide');
        S.lp.lerp(LAND, 1 - Math.exp(-2.4 * dt)); S.lp.y = Math.max(groundAt(S.lp), lerp(S.lp.y, groundAt(S.lp), 1 - Math.exp(-3 * dt)));
        S.lyaw = damp(S.lyaw, 0, 3, dt); S.lroll = damp(S.lroll, 0, 3, dt);
      }
      if (S.pt > T) { L.play('Stand'); S.lp.copy(LAND); S.lyaw = 0; setPhase('creep'); }
      S.ep.set(0, groundH(0, -24), -24); S.eyaw = 0;
      E.animate(dt, { t: S.t, speed: 0, onGround: true });
    } else if (ph === 'creep') {
      /* it rests with its back to you; it looks round now and then. Move only while it isn't looking */
      say('Creep up on it', S.look > 0.5 ? '<b class="warn">It is looking! Stand still.</b>' : 'Hold <b>▶ / →</b> to creep closer. Freeze when it looks round.');
      U.near.classList.remove('hidden');
      const dist = S.ep.distanceTo(new THREE.Vector3(LAND.x, S.ep.y, LAND.z - 2.5 * L.k / 3.6));
      U.prog.style.width = clamp(100 - (dist - 2) / 22 * 100, 0, 100) + '%';
      const moving = I.right && S.knock <= 0;
      S.espeed = damp(S.espeed, moving ? 2.1 : 0, 10, dt);
      S.ep.z += S.espeed * dt; S.ep.y = groundH(S.ep.x, S.ep.z);
      /* its watching */
      if (S.watch > 0) {
        S.watch -= dt; S.look = damp(S.look, 1, 5, dt);
        if (S.espeed > 0.35 && S.look > 0.6) { S.caught += dt; if (S.caught > 0.18) caught(); }
        if (S.watch <= 0) { S.calmT = (2.2 + Math.random() * 2.4) / Math.sqrt(H); S.caught = 0; }
      } else {
        S.look = damp(S.look, 0, 4, dt); S.calmT -= dt;
        if (S.calmT <= 0) { S.watch = 1.4 + Math.random() * 1.2 * H; LA.flash(0.25); }
      }
      if (S.knock > 0) { S.knock -= dt; S.ep.z -= 5 * dt * (S.knock / 0.9); }
      S.lyaw = Math.PI * 0.62 * S.look * (S.watchSide || 1);          // turned to look back over its shoulder
      if (S.look < 0.05) S.watchSide = Math.random() < 0.5 ? -1 : 1;
      if (L.clip !== 'Screech' || L.done()) L.play(S.look > 0.3 ? 'Idle' : 'Stand');
      E.animate(dt, { t: S.t, speed: S.espeed, onGround: true });
      if (dist < 2.6) {
        U.msg.textContent = S.look > 0.3 ? 'Wait…' : 'Now! Press GRAB (Space) to leap on!'; U.msg.className = 't3msg show grab';
        if (I.grab && S.look < 0.3) { S.jumpFrom = S.ep.clone(); setPhase('jump'); U.near.classList.add('hidden'); U.msg.className = 't3msg'; snd.thud && snd.thud(4); }
      } else if (S.knock <= 0 && U.msg.classList.contains('grab')) U.msg.className = 't3msg';
    } else if (ph === 'jump') {
      /* the leap: up and onto its back */
      say('Hup!', '');
      const c = bodyC(), seat = c.p.clone().add(new THREE.Vector3(0, c.wr * 0.9, 0));
      const u = clamp(S.pt / 0.6, 0, 1);
      S.ep.lerpVectors(S.jumpFrom, seat, u); S.ep.y += Math.sin(u * Math.PI) * 2.2;
      E.animate(dt, { t: S.t, speed: 0, onGround: false });
      if (u >= 1) { setPhase('takeoff'); L.play('TakeOff', 0.15); snd.screech && snd.screech(); S.lyaw = 0; }
      L.play(L.clip === 'Stand' || L.clip === 'Idle' ? 'Hurt' : L.clip);
    } else if (ph === 'takeoff' || ph === 'buck') {
      /* it tries to throw you off */
      if (ph === 'takeoff') {
        say('Hold on!', 'Lean with <b>◀ / ▶</b> to keep your balance. <b>GRAB</b> through screeches and barrel rolls.');
        S.lp.y += dt * (2 + S.pt * 6); S.lp.z += dt * S.pt * 5;
        if (S.pt > 1.6) { setPhase('buck'); L.play('Fly'); S.flyA = Math.atan2(S.lp.z, S.lp.x); S.buckT = 1.2; }
      } else {
        say('Hold on!', '');
        /* the flight: a wide wandering loop round the downs */
        const R = 38, w = (S.lspeed * (S.buck && S.buck.k === 'dive' ? 1.5 : 1)) / R;
        S.flyA += w * dt;
        const a = S.flyA, hh = 16 + 5 * Math.sin(a * 2.3) - (S.buck && S.buck.k === 'dive' ? 9 * Math.sin(Math.PI * clamp(S.buck.t / S.buck.len, 0, 1)) : 0);
        const tgt = new THREE.Vector3(Math.cos(a) * R + 8 * Math.sin(a * 3), hh, Math.sin(a) * R);
        const prev = S.lp.clone();
        S.lp.lerp(tgt, 1 - Math.exp(-3 * dt));
        const d = S.lp.clone().sub(prev);
        if (d.lengthSq() > 1e-6) { S.lyaw = Math.atan2(d.x, d.z); S.lpitch = damp(S.lpitch, -Math.atan2(d.y, Math.hypot(d.x, d.z)), 4, dt); }
        /* bucks */
        let rollT = 0.35 * Math.sin(S.t * 1.7) * H;                       // it never flies quite level
        if (!S.buck) { S.buckT -= dt; if (S.buckT <= 0) newBuck(); }
        else {
          const B = S.buck, u = clamp(B.t / B.len, 0, 1); B.t += dt;
          if (B.k === 'roll') rollT = B.side * 1.05 * Math.sin(Math.PI * u) * Math.min(1.4, H);
          if (B.k === 'swipe') { rollT = -B.side * 0.7 * Math.sin(Math.PI * u); if (u < 0.3) S.balV += B.side * 2.6 * H * dt; }
          if (B.k === 'barrel') rollT = B.side * TAU * (u * u * (3 - 2 * u));
          if (B.k === 'screech' && u > 0.15 && u < 0.85) { S.shake = 0.6; if (!I.grab) S.balV += (Math.random() - 0.5) * 9 * H * dt + Math.sign(S.bal || 1) * 3 * H * dt; }
          if (B.k === 'barrel' && !I.grab && u > 0.2 && u < 0.8) S.balV += B.side * 7 * H * dt;
          if (u >= 1) { S.buck = null; S.buckT = (1.6 + Math.random() * 1.6) / Math.sqrt(H); S.grabNeed = 0; U.msg.className = 't3msg'; S.wild -= 4; if (L.clip !== 'Fly') L.play('Fly'); }
        }
        if (S.buck && S.buck.k === 'barrel') S.lroll = rollT; else S.lroll = damp(S.lroll, rollT, 5, dt);
      }
      /* your balance: the Lútut's roll pulls you to the low side; you lean against it */
      const lean = (I.left ? 1 : 0) - (I.right ? 1 : 0);              // the needle slides right: lean left to bring it back
      const pull = Math.sin(S.lroll) * 1.6 * (S.buck && S.buck.k === 'barrel' && I.grab ? 0.1 : 1);
      S.balV += (pull - lean * 2.4 - S.bal * 0.5) * dt + (Math.random() - 0.5) * 0.6 * H * dt;
      if (I.grab && !S.grabNeed) S.balV *= 0.9;                         // grabbing when you needn't: steady, but you can't lean
      S.balV *= Math.exp(-2.2 * dt);
      S.bal += S.balV * dt * 1.6;
      if (ph === 'buck') {
        const steady = Math.abs(S.bal) < 0.33 ? 1 : Math.abs(S.bal) < 0.66 ? 0.45 : 0;
        S.wild -= dt * (5.5 * steady) / H;
        if (S.wild <= 0) { S.wild = 0; setPhase('calm'); L.play('Glide'); U.msg.className = 't3msg'; snd.trick && snd.trick(); }
      }
      if (Math.abs(S.bal) >= 1) thrown();
      U.bars.classList.remove('hidden');
      U.needle.style.left = (50 + clamp(S.bal, -1, 1) * 50) + '%';
      U.needle.classList.toggle('bad', Math.abs(S.bal) > 0.66);
      U.wild.style.width = S.wild + '%';
      seatRider(dt, true);
    } else if (ph === 'thrown') {
      say('Thrown off!', 'It is still wild. Try again.');
      S.rv.y -= 9.8 * dt; S.ep.addScaledVector(S.rv, dt);
      const gy = groundAt(S.ep); if (S.ep.y < gy) { S.ep.y = gy; S.rv.multiplyScalar(0.3); S.rv.y = Math.abs(S.rv.y) * 0.2; }
      E.root.rotation.x += dt * 4;
      E.animate(dt, { t: S.t, speed: 0, onGround: S.ep.y <= gy + 0.05 });
      /* it swoops round and lands by you, to try again */
      S.lp.y = damp(S.lp.y, groundAt(S.lp) + 0.1, 0.8, dt); S.lroll = damp(S.lroll, 0, 3, dt); S.lpitch = damp(S.lpitch, 0, 3, dt);
      if (S.pt > 2.8) {
        E.root.rotation.x = 0;
        S.bal = 0; S.balV = 0; S.wild = Math.min(100, S.wild + 15); S.buck = null; S.grabNeed = 0;
        S.lp.set(S.ep.x + 3, groundAt(S.ep), S.ep.z); L.play('Stand');
        S.jumpFrom = S.ep.clone(); setPhase('jump');
      }
    } else if (ph === 'calm') {
      /* worn out, it glides down and lands: yours */
      say('It is calming…', '');
      S.lp.y = damp(S.lp.y, groundAt(S.lp) + 0.05, 0.9, dt);
      S.lp.addScaledVector(fwd(S.lyaw), dt * Math.max(2, 10 - S.pt * 2));
      S.lroll = damp(S.lroll, 0, 3, dt); S.lpitch = damp(S.lpitch, 0, 3, dt);
      if (S.lp.y - groundAt(S.lp) < 3 && L.clip !== 'LandGlide' && L.clip !== 'Stand') L.play('LandGlide');
      if (S.pt > 4.5 && L.clip !== 'Stand') L.play('Stand');
      seatRider(dt, false);
      if (S.pt > 5.2 && !S.done) {
        S.done = true;
        U.bars.classList.add('hidden'); U.pads.classList.add('hidden'); U.skip.classList.add('hidden');
        say('', '');
        U.end.innerHTML = '<h2>Tamed!</h2><p>This ' + NAME[kind] + ' will carry you now. It is yours.</p><button class="btn primary big t3go" type="button">To the roost</button>';
        U.end.classList.remove('hidden');
        U.end.querySelector('.t3go').onclick = () => finish({ result: 'tamed' });
        if (S.auto) setTimeout(() => finish({ result: 'tamed' }), 400);
      }
    }

    /* ---- place everything ---- */
    LA.root.position.copy(S.lp);
    LA.root.rotation.set(S.lpitch, S.lyaw, -S.lroll);
    LA.animate(dt, {});
    if (S.phase !== 'thrown') E.root.position.copy(S.ep);
    if (!['takeoff', 'buck', 'calm'].includes(S.phase) && S.phase !== 'thrown') E.root.rotation.set(0, S.phase === 'jump' ? S.lyaw : S.eyaw, 0);
    camera(dt);
    renderer.render(scene, cam);
  }

  function seatRider(dt, bucking) {
    LA.root.updateMatrixWorld(true);
    const c = bodyC();
    const up = new THREE.Vector3(0, 1, 0).applyEuler(LA.root.rotation);
    S.ep.copy(c.p).addScaledVector(up, c.wr * 0.92);
    E.root.position.copy(S.ep);
    E.root.rotation.set(S.lpitch, S.lyaw, -S.lroll - S.bal * 0.55);
    E.animate(dt, { t: S.t, speed: 0, onGround: true, ride: true, reins: true, rideRoll: -S.bal * 0.5, rideSpeed: bucking ? 8 : 2, rideBob: bucking ? 1 : 0.3 });
  }
  function caught() {
    S.caught = 0; S.watch = 0.2; S.knock = 0.9; S.shake = 0.5;
    L.play('Screech', 0.1); snd.screech && snd.screech();
    U.msg.textContent = 'It saw you! Stand still when it looks.'; U.msg.className = 't3msg show';
  }
  function thrown() {
    S.rv.copy(fwd(S.lyaw)).multiplyScalar(S.lspeed * 0.5); S.rv.x += Math.sign(S.bal) * 4; S.rv.y = 3;
    setPhase('thrown'); snd.end && snd.end();
    U.msg.className = 't3msg';
  }
  function camera(dt) {
    let want, look;
    const ph = S.phase;
    if (ph === 'arrive') { want = new THREE.Vector3(10, 4, -36); look = S.lp.clone(); }
    else if (ph === 'creep' || ph === 'jump') { want = S.ep.clone().add(new THREE.Vector3(1.6, 2.3, -4.6)); look = new THREE.Vector3(LAND.x, 1.5, LAND.z); }
    else if (ph === 'thrown') { want = S.ep.clone().add(new THREE.Vector3(6, 5, -8)); look = S.ep.clone(); }
    else {
      const f = fwd(S.lyaw);
      want = S.lp.clone().addScaledVector(f, -15 * L.k / 3.6).add(new THREE.Vector3(0, 6 * L.k / 3.6, 0));
      look = S.lp.clone().addScaledVector(f, 5).add(new THREE.Vector3(0, 1, 0));
      const gy = groundAt(want) + 1.2; if (want.y < gy) want.y = gy;
    }
    camPos.lerp(want, 1 - Math.exp(-(ph === 'buck' || ph === 'takeoff' ? 5 : 2.5) * dt));
    camLook.lerp(look, 1 - Math.exp(-6 * dt));
    S.shake = Math.max(0, S.shake - dt);
    cam.position.copy(camPos);
    if (S.shake) cam.position.add(new THREE.Vector3((Math.random() - 0.5) * S.shake * 0.5, (Math.random() - 0.5) * S.shake * 0.5, 0));
    cam.up.set(0, 1, 0);
    if (ph === 'buck') cam.up.applyAxisAngle(fwd(S.lyaw), clamp(-S.lroll * 0.25, -0.4, 0.4));
    cam.lookAt(camLook);
    W0.dl.position.copy(S.lp).add(new THREE.Vector3(-40, 50, -50)); W0.dl.target.position.copy(S.lp);
  }
  /* a rider who does it right (for the tests, and the "watch it" mode) */
  function autoInput() {
    const o = { left: false, right: false, grab: false };
    if (S.phase === 'creep') { o.right = S.look < 0.2 && S.watch <= 0; const d = S.ep.distanceTo(new THREE.Vector3(LAND.x, S.ep.y, LAND.z - 2.5 * L.k / 3.6)); if (d < 2.6 && S.look < 0.2) o.grab = true; }
    else if (S.phase === 'buck' || S.phase === 'takeoff') {
      if (S.grabNeed) o.grab = true;
      const want = S.bal + S.balV * 0.35;
      if (want > 0.1) o.left = true; else if (want < -0.1) o.right = true;
    }
    return o;
  }

  say('', '');
  renderer.setAnimationLoop(frame);
  return finished;
}
