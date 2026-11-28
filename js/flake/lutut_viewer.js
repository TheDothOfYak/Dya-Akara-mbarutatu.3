// © 2026 Isaac Flake. All Rights Reserved.
/* ============================================================
   FLAKE GAMES — js/flake/lutut_viewer.js
   The Lútut in the Rokarvac (rokarvac.html). One stage, and a
   button for how it looks in each game:

   - Auto: the full 3D file (art/lutut, game copy at
     rpg/assets/models/lutut.glb) with every one of its clips,
     the age variants and the low-detail mesh. Drag to turn it,
     wheel or pinch to zoom.
   - Torcain's Run: the same model, flying its rounds the way it
     does in the game (fly, glide, screech with the throat lit, dive).
   - Dya'Akara and Little Dungeon: the 2D drawing both share
     (js/engine/looks/lutut.js), through the Dya'Akara sprite engine.
   - Skaar Uverkhron: its own drawing (skaar-uverkhron/js/art.js).
   - Stryx Pilot: seen from above, as you meet it in the sky
     (mini-games/stryx-pilot/js/sp_art.js).
   - The 4 Brothers Worlds: its pixel sprite (img/rokarvac/, taken
     from four-brothers-world-v3/v2.js, where it is drawn).

   Each game's code is loaded only when its button is pressed.
   mountLutut(host) builds it all inside host and returns { stop }.
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL = 'rpg/assets/models/lutut.glb';
const CLIPS = ['Idle', 'Fly', 'Glide', 'Stand', 'Walk', 'TakeOff', 'LandGlide', 'LandBarrel', 'Dive', 'Suck', 'TailSmack', 'TailSmackUp', 'TailSwipeL', 'TailSwipeR', 'Screech', 'Hurt', 'Death'];
const CLIP_NAMES = { TakeOff: 'Take off', LandGlide: 'Land (glide)', LandBarrel: 'Land (barrel roll)', TailSmack: 'Tail smack', TailSmackUp: 'Tail smack up', TailSwipeL: 'Tail swipe left', TailSwipeR: 'Tail swipe right' };
const VARIANTS = { young: { scale: 0.72, tint: 1.15, glow: 0.85 }, adult: { scale: 1, tint: 1, glow: 1 }, old: { scale: 1.15, tint: 0.85, glow: 1 } };
const ONCE = new Set(['TakeOff', 'LandGlide', 'LandBarrel', 'Suck', 'Dive', 'TailSmack', 'TailSmackUp', 'TailSwipeL', 'TailSwipeR', 'Screech', 'Hurt', 'Death']);

export const MODES = [
  { id: 'auto', name: 'Auto · full 3D', note: 'The whole 3D file: 41,000 triangles, 52 bones and all 17 of its movements. Drag to turn it, scroll or pinch to zoom.' },
  { id: 'rpg', name: 'Torcain’s Run', note: 'In Torcain’s Run every Lútut is this same model, flying its rounds: it circles, glides, screeches with its throat lit red, and dives.' },
  { id: 'dya', name: 'Dya’Akara', note: 'Dya’Akara draws it in 2D, side on. Hover, fly, suck, screech, rest and fall are the token’s states.' },
  { id: 'ld', name: 'Little Dungeon', note: 'Little Dungeon uses the same 2D drawing as Dya’Akara.' },
  { id: 'su', name: 'Skaar Uverkhron', note: 'Skaar Uverkhron’s own painted Lutut, the Duskareth’s tier-eight creature from the Lutut Crags.' },
  { id: 'sp', name: 'Stryx Pilot', note: 'In Stryx Pilot you meet it from above, in the sky around Leotik: flying, screeching, and diving at your ship.' },
  { id: 'fbw', name: '4 Brothers Worlds', note: 'The pixel Lütut of the 4 Brothers Worlds, an elite on the Ghost World. Shown at four times its size.' },
];

/* ---------- loading each game's drawing code, once ---------- */
const loaded = {};
function script(src) {
  return loaded[src] || (loaded[src] = new Promise((ok, no) => {
    const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('could not load ' + src));
    document.head.appendChild(s);
  }));
}
async function scripts(list) { for (const s of list) await script(s); }
const NEED = {
  su: ['skaar-uverkhron/js/core.js', 'skaar-uverkhron/js/data.js', 'skaar-uverkhron/js/art.js'],
  sp: ['js/flake/canvas_fx.js', 'mini-games/stryx-pilot/js/sp_data.js', 'mini-games/stryx-pilot/js/sp_art.js'],
};

/* ---------- the 3D model, loaded once ---------- */
let gltfP = null;
const loadModel = () => gltfP || (gltfP = new GLTFLoader().loadAsync(MODEL));

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

export function mountLutut(host, opts = {}) {
  host.innerHTML = '';
  const bar = el('div', 'lv-modes'); bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', 'How it looks in each game');
  const stage = el('div', 'lv-stage');
  const cv3 = el('canvas', 'lv-3d'), cv2 = el('canvas', 'lv-2d');
  cv3.setAttribute('aria-label', 'The Lútut in 3D'); cv2.setAttribute('aria-label', 'The Lútut as the game draws it');
  const status = el('div', 'lv-status');
  stage.append(cv3, cv2, status);
  const ctrl = el('div', 'lv-ctrl');
  const note = el('p', 'lv-note');
  host.append(bar, stage, ctrl, note);

  let mode = null, alive = true, raf = 0;
  const buttons = {};
  MODES.forEach(m => {
    const b = el('button', 'lv-mode', m.name); b.type = 'button'; b.setAttribute('role', 'tab');
    b.onclick = () => setMode(m.id);
    bar.appendChild(b); buttons[m.id] = b;
  });

  /* ================= 3D ================= */
  let R = null;   // renderer state, made on first use
  function make3D() {
    if (R) return R;
    const renderer = new THREE.WebGLRenderer({ canvas: cv3, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(32, 1, 0.05, 200);
    const hemi = new THREE.HemisphereLight(0xcfd8ff, 0x2a2018, 1.1); scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff0d8, 2.4); key.position.set(3, 5, 4); scene.add(key);
    const rim = new THREE.DirectionalLight(0xa890ff, 1.6); rim.position.set(-4, 2, -5); scene.add(rim);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(4, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32 }));
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    R = { renderer, scene, cam, hemi, key, rim, ground, model: null, mixer: null, acts: {}, cur: null, curName: '', skins: [], throats: [], lods: [[], []], variant: 'adult', lod: 0,
      yaw: 0.7, pitch: 0.12, dist: 4.8, auto: true, throatK: 0, clock: new THREE.Clock(), script: null, scriptT: 0 };
    /* drag to turn, wheel or pinch to zoom */
    const pts = new Map(); let pinch0 = 0, dist0 = 0;
    cv3.addEventListener('pointerdown', e => { pts.set(e.pointerId, [e.clientX, e.clientY]); cv3.setPointerCapture(e.pointerId); R.auto = false; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); dist0 = R.dist; } });
    cv3.addEventListener('pointermove', e => {
      const p = pts.get(e.pointerId); if (!p) return;
      if (pts.size === 1) { R.yaw -= (e.clientX - p[0]) * 0.01; R.pitch = Math.max(-0.5, Math.min(1.2, R.pitch + (e.clientY - p[1]) * 0.008)); }
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2 && pinch0) { const [a, b] = [...pts.values()]; R.dist = Math.max(2.5, Math.min(16, dist0 * pinch0 / Math.max(10, Math.hypot(a[0] - b[0], a[1] - b[1])))); }
    });
    const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch0 = 0; };
    cv3.addEventListener('pointerup', up); cv3.addEventListener('pointercancel', up);
    cv3.addEventListener('wheel', e => { e.preventDefault(); R.dist = Math.max(2.5, Math.min(16, R.dist * (1 + Math.sign(e.deltaY) * 0.1))); }, { passive: false });
    return R;
  }

  async function ensureModel() {
    make3D();
    if (R.model) return;
    status.textContent = 'Loading the 3D Lútut…'; status.hidden = false;
    let gltf;
    try { gltf = await loadModel(); } catch (e) { status.textContent = 'The 3D model could not be loaded.'; throw e; }
    status.hidden = true;
    const model = gltf.scene; R.model = model; R.gltf = gltf;
    model.traverse(o => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      let lod = 0; for (let q = o; q; q = q.parent) if (/LOD1/.test(q.name)) lod = 1;
      R.lods[lod].push(o);
      const m = o.material.clone(); o.material = m;
      if (/Throat/.test(m.name)) { m.emissiveIntensity = 0; R.throats.push(m); }
      else { m.userData.col0 = m.color.clone(); R.skins.push(m); }
    });
    R.scene.add(model);
    R.mixer = new THREE.AnimationMixer(model);
    gltf.animations.forEach(c => { R.acts[c.name] = R.mixer.clipAction(c); });
    setVariant(R.variant); setLod(0);
  }
  function setLod(i) { R.lod = i; R.lods[0].forEach(o => { o.visible = i === 0; }); R.lods[1].forEach(o => { o.visible = i === 1; }); }
  function setVariant(v) {
    R.variant = v; const V = VARIANTS[v];
    R.model.scale.setScalar(V.scale);
    R.skins.forEach(m => { m.color.copy(m.userData.col0).multiplyScalar(V.tint); m.emissiveIntensity = Math.min(0.95, V.glow * 0.8); });
  }
  function play(name, fade = 0.25) {
    const A = R.acts[name]; if (!A) return;
    const once = ONCE.has(name);
    A.reset(); A.enabled = true; A.setEffectiveWeight(1);
    A.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); A.clampWhenFinished = once;
    A.play(); if (R.cur && R.cur !== A) R.cur.crossFadeTo(A, fade, false);
    R.cur = A; R.curName = name;
  }
  const clipDone = () => R.cur && ONCE.has(R.curName) && R.cur.time >= R.cur.getClip().duration - 1e-3;

  /* Torcain's Run: its rounds in the sky */
  const ROUNDS = [['Fly', 3.2], ['Glide', 2.4], ['Fly', 1.6], ['Screech', 0], ['Fly', 1.4], ['Dive', 0], ['Fly', 2], ['TailSmack', 0], ['Glide', 2]];
  function nextRound() { R.scriptI = ((R.scriptI == null ? -1 : R.scriptI) + 1) % ROUNDS.length; const [n, d] = ROUNDS[R.scriptI]; play(n, 0.35); R.scriptT = d; }

  function frame3D(dt, t) {
    const w = cv3.clientWidth, h = cv3.clientHeight;
    if (w && h && (cv3.width !== Math.round(w * R.renderer.getPixelRatio()) || cv3.height !== Math.round(h * R.renderer.getPixelRatio()))) { R.renderer.setSize(w, h, false); R.cam.aspect = w / h; R.cam.updateProjectionMatrix(); }
    if (R.mixer) {
      if (mode === 'rpg') {
        R.scriptT -= dt;
        if (ONCE.has(R.curName) ? clipDone() : R.scriptT <= 0) nextRound();
      } else if (clipDone() && R.loopOnce) { play(R.curName, 0.1); }
      R.mixer.update(dt);
      const want = R.curName === 'Screech' && R.cur ? Math.sin(Math.PI * Math.max(0, Math.min(1, (R.cur.time / R.cur.getClip().duration - 0.12) / 0.72))) : 0;
      R.throatK += (want - R.throatK) * (1 - Math.exp(-10 * dt));
      R.throats.forEach(m => { m.emissiveIntensity = R.throatK * 2.2; });
    }
    if (R.auto) R.yaw += dt * (mode === 'rpg' ? 0.12 : 0.25);
    const ty = mode === 'rpg' ? 1.3 : 0.6;
    R.cam.position.set(Math.sin(R.yaw) * Math.cos(R.pitch) * R.dist, ty + Math.sin(R.pitch) * R.dist, Math.cos(R.yaw) * Math.cos(R.pitch) * R.dist);
    R.cam.lookAt(0, ty, 0);
    R.ground.visible = mode !== 'rpg';
    if (R.model) R.model.position.y = mode === 'rpg' ? 0.9 + Math.sin(t * 0.9) * 0.15 : 0;
    R.renderer.render(R.scene, R.cam);
  }

  function controls3D() {
    ctrl.innerHTML = '';
    if (mode !== 'auto') return;
    const row = el('div', 'lv-chips'); row.setAttribute('aria-label', 'Movements');
    CLIPS.forEach(n => {
      const b = el('button', 'chip' + (R.curName === n ? ' on' : ''), CLIP_NAMES[n] || n); b.type = 'button';
      b.onclick = () => { play(n); R.loopOnce = true; controls3D(); };
      row.appendChild(b);
    });
    const row2 = el('div', 'lv-chips');
    Object.keys(VARIANTS).forEach(v => {
      const b = el('button', 'chip' + (R.variant === v ? ' on' : ''), v[0].toUpperCase() + v.slice(1)); b.type = 'button';
      b.onclick = () => { setVariant(v); controls3D(); };
      row2.appendChild(b);
    });
    const lod = el('button', 'chip' + (R.lod ? ' on' : ''), 'Low detail (far away)'); lod.type = 'button';
    lod.onclick = () => { setLod(R.lod ? 0 : 1); controls3D(); };
    row2.appendChild(lod);
    const turn = el('button', 'chip' + (R.auto ? ' on' : ''), 'Turn slowly'); turn.type = 'button';
    turn.onclick = () => { R.auto = !R.auto; controls3D(); };
    row2.appendChild(turn);
    ctrl.append(row, row2);
  }

  /* ================= 2D ================= */
  const S2 = { state: 'idle', t: 0, ph: Math.random() * 6, imgs: null };
  function chips2D(states) {
    ctrl.innerHTML = '';
    const row = el('div', 'lv-chips');
    states.forEach(([id, name]) => {
      const b = el('button', 'chip' + (S2.state === id ? ' on' : ''), name); b.type = 'button';
      b.onclick = () => { S2.state = id; S2.t0 = S2.t; chips2D(states); };
      row.appendChild(b);
    });
    ctrl.appendChild(row);
  }
  function size2D() {
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv2.clientWidth, h = cv2.clientHeight;
    if (cv2.width !== Math.round(w * dpr) || cv2.height !== Math.round(h * dpr)) { cv2.width = Math.round(w * dpr); cv2.height = Math.round(h * dpr); }
    const ctx = cv2.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    return [ctx, w, h];
  }
  function frame2D(dt) {
    S2.t += dt;
    const [ctx, w, h] = size2D(); if (!w || !h || S2.ready !== mode) return;
    const t = S2.t, sinceSet = t - (S2.t0 || 0);
    if (mode === 'dya' || mode === 'ld') {
      const sp = DYA.species.get('lutut'), SPR = DYA.sprites;
      ctx.save(); ctx.translate(w / 2, h * 0.62);
      SPR.draw(ctx, { sp, r: Math.min(w, h) * 0.2, state: S2.state, t, phase: S2.ph, facing: 1, alpha: 1, shimmer: true, biolum: true, heat: 0.7 });
      ctx.restore();
    } else if (mode === 'su') {
      const pose = S2.state === 'attack' ? 'attack' : S2.state === 'hit' ? 'hit' : 'idle';
      window.SU.art.creature(ctx, 'lutut', w / 2, h * 0.8, Math.min(w, h) * 0.34, { t, f: 1, pose, poseT: (sinceSet % 1.2) / 1.2, flash: pose === 'hit' ? Math.max(0, 1 - (sinceSet % 1.2) * 2) : 0 });
    } else if (mode === 'sp') {
      const glow = S2.glow || (S2.glow = document.createElement('canvas'));
      if (glow.width !== cv2.width || glow.height !== cv2.height) { glow.width = cv2.width; glow.height = cv2.height; }
      const gl = glow.getContext('2d'); gl.setTransform(cv2.width / w, 0, 0, cv2.height / h, 0, 0); gl.clearRect(0, 0, w, h);
      /* a slow circle across the sky, seen from above */
      const k = Math.min(w, h) / 280, a = t * 0.35;
      const st = S2.state;
      const l = { x: 0, y: 0, vx: -Math.sin(a), vy: Math.cos(a), state: st === 'idle' ? 'fly' : st, ph: S2.ph, t: 1.1 - ((sinceSet * 0.6) % 1.1) };
      ctx.save(); ctx.translate(w / 2 + Math.cos(a) * 60 * k, h / 2 + Math.sin(a) * 40 * k); ctx.scale(k, k);
      gl.save(); gl.translate(w / 2 + Math.cos(a) * 60 * k, h / 2 + Math.sin(a) * 40 * k); gl.scale(k, k);
      window.SP.art.drawLutut(ctx, gl, l, t);
      gl.restore(); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(glow, 0, 0); ctx.restore();
    } else if (mode === 'fbw' && S2.imgs) {
      const img = S2.imgs[Math.floor(t * 4) % 2];
      if (img.complete && img.naturalWidth) {
        const sc = Math.max(2, Math.floor(Math.min(w / img.naturalWidth, h / img.naturalHeight) * 0.55));
        ctx.imageSmoothingEnabled = false;
        const iw = img.naturalWidth * sc, ih = img.naturalHeight * sc, bob = Math.round(Math.sin(t * 3) * 2) * sc;
        ctx.save();
        if (S2.state === 'left') { ctx.translate(w, 0); ctx.scale(-1, 1); }
        ctx.drawImage(img, Math.round((w - iw) / 2), Math.round((h - ih) / 2) + bob, iw, ih);
        ctx.restore();
      }
    }
  }

  /* ================= switching ================= */
  async function setMode(id) {
    if (id === mode) return;
    mode = id;
    Object.keys(buttons).forEach(k => { buttons[k].classList.toggle('on', k === id); buttons[k].setAttribute('aria-selected', k === id ? 'true' : 'false'); });
    note.textContent = (MODES.find(m => m.id === id) || {}).note || '';
    const is3D = id === 'auto' || id === 'rpg';
    cv3.hidden = !is3D; cv2.hidden = is3D; status.hidden = true; ctrl.innerHTML = '';
    stage.dataset.mode = id;
    try {
      if (is3D) {
        await ensureModel(); if (mode !== id) return;
        if (id === 'rpg') { R.scriptI = -1; R.auto = true; R.dist = 6; R.pitch = 0.05; nextRound(); }
        else { R.dist = 4.8; R.pitch = 0.12; play('Idle'); R.loopOnce = true; }
        controls3D();
      } else {
        S2.state = 'idle'; S2.t0 = 0; S2.ready = null;
        if (NEED[id]) { status.textContent = 'Loading…'; status.hidden = false; await scripts(NEED[id]); status.hidden = true; if (mode !== id) return; }
        if (id === 'dya' || id === 'ld') chips2D([['idle', 'Hover'], ['walk', 'Fly'], ['attack', 'Suck'], ['special', 'Screech'], ['dormant', 'Rest'], ['death', 'Fall']]);
        else if (id === 'su') chips2D([['idle', 'Idle'], ['attack', 'Attack'], ['hit', 'Struck']]);
        else if (id === 'sp') { S2.state = 'fly'; chips2D([['fly', 'Fly'], ['screech', 'Screech'], ['dive', 'Dive']]); }
        else if (id === 'fbw') {
          S2.imgs = S2.imgs || [0, 1].map(i => { const im = new Image(); im.src = 'img/rokarvac/lutut-4bw-' + i + '.png'; return im; });
          S2.state = 'right'; chips2D([['right', 'Facing right'], ['left', 'Facing left']]);
        }
        S2.ready = id;
      }
    } catch (e) {
      status.textContent = 'This look could not be loaded here. ' + (e && e.message ? '(' + e.message + ')' : ''); status.hidden = false;
      console.warn('[lutut viewer]', e);
    }
  }

  let last = performance.now();
  function tick(now) {
    if (!alive) return;
    if (!host.isConnected) { stop(); return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    try {
      if ((mode === 'auto' || mode === 'rpg') && R) frame3D(dt, now / 1000);
      else if (mode && !cv2.hidden) frame2D(dt);
    } catch (e) { console.warn('[lutut viewer]', e); }
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    alive = false; cancelAnimationFrame(raf);
    if (R) { R.renderer.dispose(); R.renderer.forceContextLoss && R.renderer.forceContextLoss(); }
  }
  setMode(opts.mode || 'auto');
  raf = requestAnimationFrame(tick);
  return { stop, setMode };
}
