/* ============================================================
   CINE — the moments you only watch. Letterbox bars slide in,
   the camera moves on its own along a list of shots, and the
   words come up as subtitles over the picture instead of on a
   black screen. Any key / click skips to the next shot.

   A shot:
     { dur,                                  seconds
       from: { p:[x,y,z], l:[x,y,z] },        camera position and look-at at the start
       to:   { p, l },                        … and at the end (eased between)
       cam(k, t) -> { p, l },                 or drive it yourself (k: 0..1 through the shot)
       fov, fovTo,                            optional lens change
       caption: 'text' | ['a', 'b'],         subtitles (several split the shot evenly)
       ease: 'inout' | 'out' | 'linear',
       onStart(), onTick(k, dt), onEnd() }
   ============================================================ */
import * as THREE from 'three';

const ease = {
  linear: k => k,
  out: k => 1 - Math.pow(1 - k, 3),
  in: k => k * k * k,
  inout: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
};
const V = a => (a && a.isVector3 ? a.clone() : new THREE.Vector3(a[0], a[1], a[2]));

let styled = false;
function style() {
  if (styled) return; styled = true;
  const s = document.createElement('style');
  s.textContent = `
  .cine-bar{position:fixed;left:0;right:0;height:11vh;background:#000;z-index:28;pointer-events:none;transition:transform .9s cubic-bezier(.2,.8,.2,1)}
  .cine-bar.top{top:0;transform:translateY(-100%)} .cine-bar.bot{bottom:0;transform:translateY(100%)}
  .cine-on .cine-bar{transform:none}
  .cine-cap{position:fixed;left:50%;bottom:13.5vh;transform:translateX(-50%);width:min(860px,88vw);text-align:center;z-index:29;pointer-events:none;
    font-family:var(--body,Georgia,serif);font-size:clamp(17px,2.1vw,25px);line-height:1.45;color:#f6ead2;text-shadow:0 2px 10px #000,0 0 2px #000;opacity:0;transition:opacity .8s}
  .cine-cap.show{opacity:1}
  .cine-skip{position:fixed;right:22px;bottom:calc(11vh + 10px);z-index:29;font-family:var(--display,Georgia);font-size:11px;letter-spacing:.2em;color:rgba(240,225,200,.55);opacity:0;transition:opacity .6s;pointer-events:none}
  .cine-on .cine-skip{opacity:1}
  body.cine-on #hud,body.cine-on #toast,body.cine-on #location,body.cine-on #hint{opacity:0!important;transition:opacity .6s} body:not(.cine-on) #hud{transition:opacity .6s}
  body.cine-on #dialog{z-index:30;bottom:calc(11vh + 14px)} body.cine-on #bark{z-index:30}`;
  document.head.appendChild(s);
  for (const c of ['top', 'bot']) { const d = document.createElement('div'); d.className = 'cine-bar ' + c; document.body.appendChild(d); }
  const cap = document.createElement('div'); cap.className = 'cine-cap'; cap.id = 'cine-cap'; document.body.appendChild(cap);
  const sk = document.createElement('div'); sk.className = 'cine-skip'; sk.textContent = 'SPACE / CLICK ▸▸'; document.body.appendChild(sk);
}

export function createCine(camera) {
  style();
  const cap = document.getElementById('cine-cap');
  let shots = null, i = -1, t = 0, done = null, capI = -1, baseFov = camera.fov, lastT = 0;
  const P = new THREE.Vector3(), L = new THREE.Vector3(), curP = new THREE.Vector3(), curL = new THREE.Vector3();

  function bars(on) { document.body.classList.toggle('cine-on', !!on); }
  let capTok = 0;
  function caption(text) {
    const tok = ++capTok;
    cap.classList.remove('show');
    if (!text) return;
    setTimeout(() => { if (tok !== capTok) return; cap.textContent = text; cap.classList.add('show'); }, cap.textContent ? 350 : 0);
  }
  function startShot() {
    const s = shots[i]; t = 0; capI = -1;
    if (s.from) { s._fp = V(s.from.p); s._fl = V(s.from.l); s._tp = V((s.to || s.from).p); s._tl = V((s.to || s.from).l); }
    if (s.onStart) s.onStart();
  }
  function next() {
    if (!shots) return;
    const prev = shots[i]; if (prev && prev.onEnd) prev.onEnd();
    i++;
    if (i >= shots.length) { const cb = done; stop(); cb && cb(); return; }
    startShot();
  }
  function stop() {
    shots = null; i = -1; caption(null); bars(false);
    camera.fov = baseFov; camera.updateProjectionMatrix();
    setTimeout(() => { if (!shots && !cap.classList.contains('show')) cap.textContent = ''; }, 900);
  }
  return {
    get active() { return !!shots; },
    play(list, cb, opts = {}) { baseFov = camera.fov; lastT = 0; shots = list; i = -1; done = cb; bars(opts.bars !== false); next(); },
    skip() { if (shots) next(); },
    stop,
    bars, caption,
    /* call every frame; returns true while it is driving the camera */
    update(gameDt) {
      if (!shots) return false;
      // real time, so a slow machine sees the same film, just with fewer frames
      const now = performance.now(), dt = Math.min(0.1, lastT ? (now - lastT) / 1000 : gameDt); lastT = now;
      const s = shots[i]; t += dt;
      const k = Math.min(1, t / s.dur), e = (ease[s.ease || 'inout'])(k);
      if (s.cam) { const r = s.cam(k, t); P.copy(r.p.isVector3 ? r.p : V(r.p)); L.copy(r.l.isVector3 ? r.l : V(r.l)); }
      else if (s._fp) { P.lerpVectors(s._fp, s._tp, e); L.lerpVectors(s._fl, s._tl, e); }
      // the first frame of a shot cuts; after that the camera glides
      if (t <= dt + 1e-6) { curP.copy(P); curL.copy(L); } else { const a = 1 - Math.exp(-10 * dt); curP.lerp(P, a); curL.lerp(L, a); }
      camera.position.copy(curP); camera.lookAt(curL);
      if (s.fov) { camera.fov = s.fovTo ? s.fov + (s.fovTo - s.fov) * e : s.fov; camera.updateProjectionMatrix(); }
      const caps = s.caption ? (Array.isArray(s.caption) ? s.caption : [s.caption]) : [];
      const ci = caps.length ? Math.min(caps.length - 1, Math.floor(k * caps.length)) : -1;
      if (ci !== capI) { capI = ci; caption(ci >= 0 ? caps[ci] : null); }
      if (s.onTick) s.onTick(k, dt);
      if (shots === null) return true;   // onTick may have ended it
      if (t >= s.dur) next();
      return true;
    },
  };
}
