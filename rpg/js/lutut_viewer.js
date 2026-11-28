// © 2026 Isaac Flake. All Rights Reserved.
/* ============================================================
   The Lútut, in the Rokarvac: a page in the journal where you can
   turn the creature round in your hands and watch everything it
   does — hover, fly, glide, walk, take off, land (gliding in or
   barrelling), dive, suck, the tail blows, the screech, hurt and
   death — by day or by night, young, grown or old.
   It has its own small renderer, made when the page opens and
   thrown away when it closes, so it costs nothing the rest of the time.
   ============================================================ */
import * as THREE from 'three';
import { buildLututActor, lututLoaded, LUTUT } from './lutut3d.js';

const GROUPS = [
  ['In the air', [['Idle', 'Hover'], ['Fly', 'Fly'], ['Glide', 'Glide']]],
  ['On the ground', [['Stand', 'Stand'], ['Walk', 'Walk'], ['TakeOff', 'Take off'], ['LandGlide', 'Glide in'], ['LandBarrel', 'Barrel in']]],
  ['When it hunts', [['Dive', 'Dive'], ['Suck', 'Suck'], ['TailSmack', 'Tail, under'], ['TailSwipeL', 'Tail, left'], ['TailSwipeR', 'Tail, right'], ['TailSmackUp', 'Tail, over'], ['Screech', 'Screech']]],
  ['', [['Hurt', 'Hurt'], ['Death', 'Death']]],
];
const AFTER = { TakeOff: 'Fly', LandGlide: 'Stand', LandBarrel: 'Stand', Death: null };
const LABEL = {}; GROUPS.forEach(g => g[1].forEach(([c, l]) => { LABEL[c] = l; }));
export const LUTUT_NOTE = 'A Prince Rupert’s drop given wings. The front of it is all mouth — a ring of teeth that never closes. It doesn’t bite: it sucks things in. It screeches before it stoops, and the screech stuns. The spiked ball on its tail is for whatever gets under it, beside it, or above it.';

export function createLututViewer(host, onBack) {
  let R = null;   // everything that exists only while the page is open

  function build() {
    host.innerHTML = '';
    const head = document.createElement('div'); head.className = 'lv-head';
    head.innerHTML = '<h3>The Lútut</h3><p class="lv-note"></p>';
    head.querySelector('.lv-note').textContent = LUTUT_NOTE;
    const stage = document.createElement('div'); stage.className = 'lv-stage';
    stage.style.cssText = 'position:relative;height:min(46vh,400px);min-height:240px;overflow:hidden';   // a fixed box: the picture never sizes it
    const status = document.createElement('div'); status.className = 'lv-status';
    const hint = document.createElement('div'); hint.className = 'lv-hint'; hint.textContent = 'Drag to turn · scroll to zoom';
    stage.append(status, hint);
    const clips = document.createElement('div'); clips.className = 'lv-clips';
    clips.innerHTML = GROUPS.map(([g, cl]) => `<div class="lv-grp"><span>${g}</span>${cl.map(([c, l]) => `<button class="btn ghost lv-b" data-c="${c}">${l}</button>`).join('')}</div>`).join('');
    const opts = document.createElement('div'); opts.className = 'lv-opts';
    opts.innerHTML = '<label><input type="checkbox" class="lv-spin" checked> Turn slowly</label><label><input type="checkbox" class="lv-night"> Night</label>'
      + '<label>Age <select class="lv-age"><option value="young">Young</option><option value="adult" selected>Grown</option><option value="old">Old</option></select></label>'
      + '<button class="btn lv-back">Back to the Rokarvac</button>';
    host.append(head, stage, clips, opts);
    return { stage, status, clips, opts };
  }

  function open() {
    if (R) return;
    const ui = build();
    if (!lututLoaded()) { ui.status.textContent = 'The Lútut’s model hasn’t loaded.'; wire(ui, null); return; }
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none';
    ui.stage.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
    const hemi = new THREE.HemisphereLight(0xb8b0d8, 0x1a1418, 1.2); scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff1dc, 2.6); key.position.set(-6, 9, 8); scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fb4ff, 1.4); rim.position.set(6, 5, -8); scene.add(rim);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(9, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    R = { renderer, scene, cam, hemi, key, rim, ui, actor: null, clip: 'Idle', yaw: -0.7, pitch: 0.22, dist: 21, raf: 0, last: performance.now(), drag: null };
    setActor('adult');
    const size = () => { const w = ui.stage.clientWidth || 600, h = ui.stage.clientHeight || 340; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    R.ro = new ResizeObserver(size); R.ro.observe(ui.stage); size();
    // drag to turn, scroll to zoom
    const cv = renderer.domElement;
    cv.addEventListener('pointerdown', e => { R.drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => { if (!R || !R.drag) return; R.yaw -= (e.clientX - R.drag.x) * 0.008; R.pitch = Math.max(-0.2, Math.min(1.2, R.pitch + (e.clientY - R.drag.y) * 0.006)); R.drag = { x: e.clientX, y: e.clientY }; });
    cv.addEventListener('pointerup', () => { if (R) R.drag = null; });
    cv.addEventListener('wheel', e => { e.preventDefault(); e.stopPropagation(); R.dist = Math.max(8, Math.min(40, R.dist * (e.deltaY > 0 ? 1.08 : 0.93))); }, { passive: false });
    wire(ui, R);
    const tick = (now) => {
      if (!R) return;
      const dt = Math.min(0.1, (now - R.last) / 1000); R.last = now;
      if (ui.opts.querySelector('.lv-spin').checked && !R.drag) R.yaw += dt * 0.3;
      const L = R.actor.lutut;
      if (L.done()) { const nx = R.clip in AFTER ? AFTER[R.clip] : 'Idle'; if (nx) play(nx); }
      const night = ui.opts.querySelector('.lv-night').checked;
      R.actor.glow(night ? 1 : 0); R.actor.animate(dt, {});
      const tgt = new THREE.Vector3(0, 0.55 * L.k + R.lift, 0);
      cam.position.set(tgt.x + Math.sin(R.yaw) * Math.cos(R.pitch) * R.dist, tgt.y + Math.sin(R.pitch) * R.dist, tgt.z + Math.cos(R.yaw) * Math.cos(R.pitch) * R.dist);
      cam.lookAt(tgt);
      renderer.render(scene, cam);
      R.raf = requestAnimationFrame(tick);
    };
    R.raf = requestAnimationFrame(tick);
  }

  function setActor(variant) {
    if (R.actor) R.scene.remove(R.actor.root);
    const a = buildLututActor({ variant }); a.lutut.driven = true; R.scene.add(a.root); R.actor = a;
    R.lift = 0.2 * a.lutut.k;   // it hovers a little above the shadow
    a.root.position.y = R.lift;
    play(R.clip && !LUTUT.ONCE.has(R.clip) ? R.clip : 'Idle');
  }
  function play(name) {
    if (!R || !R.actor) return;
    R.clip = name; R.actor.lutut.play(name, 0.25);
    R.ui.status.innerHTML = 'Playing <b></b>'; R.ui.status.querySelector('b').textContent = LABEL[name] || name;
    R.ui.clips.querySelectorAll('.lv-b').forEach(b => b.classList.toggle('on', b.dataset.c === name));
  }
  function wire(ui, live) {
    ui.opts.querySelector('.lv-back').onclick = () => { close(); onBack && onBack(); };
    if (!live) return;
    ui.clips.onclick = e => { const b = e.target.closest('.lv-b'); if (b) play(b.dataset.c); };
    ui.opts.querySelector('.lv-night').onchange = e => { const n = e.target.checked; R.hemi.intensity = n ? 0.15 : 1.2; R.key.intensity = n ? 0.2 : 2.6; R.rim.intensity = n ? 0.35 : 1.4; ui.stage.classList.toggle('night', n); };
    ui.opts.querySelector('.lv-age').onchange = e => setActor(e.target.value);
  }

  function close() {
    if (!R) { host.innerHTML = ''; return; }
    cancelAnimationFrame(R.raf); R.ro && R.ro.disconnect();
    // only the viewer's own renderer goes: the Lútut's meshes are shared with the ones in the world
    R.renderer.dispose(); R.renderer.forceContextLoss && R.renderer.forceContextLoss();
    R = null; host.innerHTML = '';
  }
  return { open, close, isOpen: () => !!R };
}
