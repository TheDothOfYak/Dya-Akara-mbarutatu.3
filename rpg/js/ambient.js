/* ============================================================
   AMBIENT — the great ones you only ever see from far away.
   - The AEROLHORN: every so often, vast and slow, crossing the sky
     a long way off — the shape Noka wears, tendrils trailing.
   - The GREAT NEKH'VORRAN: once in a long while, far across the land,
     something huge arcs up out of the ground and goes back down.
   - The VYRENALUR: on the Carpenter's land only, deep in the forest
     across the lake, and only at night — light and shadow among the
     trunks. Come near and it is somewhere else.
   None of them fight. They are just there, and the world is bigger
   for it. The models live in creatures2.js and load on their own.
   ============================================================ */
import * as THREE from 'three';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const noFog = root => root.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.fog = false; }); });

export function createAmbient(ctx) {
  const { scene, world, region, particles } = ctx;
  let C = null;
  import('./creatures2.js').then(m => { C = m; }).catch(() => { /* not there yet: the sky stays empty */ });
  const seen = ctx.seen ? ctx.seen() : {};

  /* ---------------- the Aerolhorn ---------------- */
  let aero = null, aeroT = 90 + Math.random() * 150;
  function startAero(focus) {
    const a = C.buildAerolhorn({ seed: Math.floor(Math.random() * 999) }); noFog(a.root); scene.add(a.root);
    const ang = Math.random() * TAU, dist = 1100 + Math.random() * 500, alt = 320 + Math.random() * 220;
    const from = V3(focus.x + Math.cos(ang) * dist, alt, focus.z + Math.sin(ang) * dist);
    const dir = V3(-Math.cos(ang + (Math.random() - 0.5) * 1.2), 0, -Math.sin(ang + (Math.random() - 0.5) * 1.2)).normalize();
    aero = { a, pos: from, dir, t: 0, life: 70 + Math.random() * 30, speed: 34 + Math.random() * 12 };
    if (!seen.aero && ctx.bark) { seen.aero = true; ctx.persist && ctx.persist(); setTimeout(() => ctx.bark('tale', 'Something vast is crossing the sky, very high and very far — wings, and long tendrils trailing under it. Then the cloud has it.', 6), 4000); }
  }
  /* ---------------- the Nekh'Vorran ---------------- */
  let worm = null, wormT = 240 + Math.random() * 300;
  const wormOk = region === 'leotik' || region === 'aakalay' || region === 'xilia';
  function startWorm(focus) {
    for (let i = 0; i < 20; i++) {
      const ang = Math.random() * TAU, dist = 380 + Math.random() * 320, x = focus.x + Math.cos(ang) * dist, z = focus.z + Math.sin(ang) * dist;
      if (world.water && world.water.isWater(x, z)) continue;
      const a = C.buildNekhVorran({ seed: Math.floor(Math.random() * 999) }); scene.add(a.root);
      worm = { a, x, z, g: world.heightAt(x, z), yaw: Math.random() * TAU, t: 0, life: 18 };
      if (!seen.worm && ctx.bark) { seen.worm = true; ctx.persist && ctx.persist(); setTimeout(() => ctx.bark('tale', 'Far off, the ground opens and something enormous arcs up out of it — ringed, ancient — and goes back down. The earth hums for a long time after.', 6), 2500); }
      ctx.sfx && ctx.sfx.roar && ctx.sfx.roar();
      return;
    }
  }
  /* ---------------- the Vyrenalur ---------------- */
  let vyr = null;
  const VYR_SPOTS = [V3(-1040, 0, 60), V3(-1010, 0, -120), V3(-1060, 0, 220), V3(-980, 0, 320)];
  let vyrI = Math.floor(Math.random() * VYR_SPOTS.length);

  function update(dt, t, focus, night) {
    if (!C || ctx.inside && ctx.inside()) { if (vyr) vyr.a.root.visible = false; return; }
    // the Aerolhorn
    aeroT -= dt;
    if (!aero && aeroT <= 0 && C.buildAerolhorn) { startAero(focus); aeroT = 240 + Math.random() * 300; }
    if (aero) {
      aero.t += dt; aero.pos.addScaledVector(aero.dir, aero.speed * dt);
      const k = Math.min(1, aero.t / 6) * Math.min(1, (aero.life - aero.t) / 6);
      aero.a.root.position.copy(aero.pos); aero.a.root.position.y += Math.sin(aero.t * 0.15) * 20;
      aero.a.root.rotation.y = Math.atan2(aero.dir.x, aero.dir.z);
      aero.a.root.visible = k > 0.01;
      aero.a.animate(dt, { speed: aero.speed, t, airborne: true, reach: 0.15 });
      if (aero.a.glow) aero.a.glow(night);
      if (aero.t > aero.life) { scene.remove(aero.a.root); aero = null; }
    }
    // the Nekh'Vorran
    if (wormOk && C.buildNekhVorran) {
      wormT -= dt;
      if (!worm && wormT <= 0) { startWorm(focus); wormT = 420 + Math.random() * 480; }
      if (worm) {
        worm.t += dt; const k = worm.t / worm.life;
        // up out of the ground in a great arc, along, and back down
        const rise = Math.sin(Math.min(1, k) * Math.PI);
        worm.a.root.position.set(worm.x + Math.sin(worm.yaw) * (k - 0.5) * 120, worm.g - 40 + rise * 46, worm.z + Math.cos(worm.yaw) * (k - 0.5) * 120);
        worm.a.root.rotation.set(-Math.cos(Math.min(1, k) * Math.PI) * 0.9, worm.yaw, 0);
        worm.a.animate(dt, { speed: 10, t, airborne: false });
        if (worm.a.glow) worm.a.glow(night);
        if (particles && Math.random() < 0.8 && rise > 0.05) particles.emit(worm.x + (Math.random() - 0.5) * 30, worm.g + Math.random() * 6, worm.z + (Math.random() - 0.5) * 30, { vx: (Math.random() - 0.5) * 6, vy: 4 + Math.random() * 6, vz: (Math.random() - 0.5) * 6, color: 0x9a8a72, size: 2.5, life: 2.5, gravity: -3 });
        if (worm.t > worm.life) { scene.remove(worm.a.root); worm = null; }
      }
    }
    // the Vyrenalur: night only, deep in the far forest, never where you are
    if (region === 'property' && C.buildVyrenalur) {
      if (!vyr) { vyr = { a: C.buildVyrenalur({ seed: 3 }), fade: 0 }; scene.add(vyr.a.root); }
      const sp = VYR_SPOTS[vyrI], d = Math.hypot(focus.x - sp.x, focus.z - sp.z);
      const want = night > 0.55 && d > 45 ? 1 : 0;
      vyr.fade += (want - vyr.fade) * Math.min(1, dt * (want ? 0.4 : 3));
      if (d < 45 && vyr.fade < 0.05) { vyrI = (vyrI + 1 + Math.floor(Math.random() * (VYR_SPOTS.length - 1))) % VYR_SPOTS.length; }
      vyr.a.root.visible = vyr.fade > 0.02;
      if (vyr.a.root.visible) {
        vyr.a.root.position.set(sp.x, world.heightAt(sp.x, sp.z), sp.z);
        vyr.a.root.rotation.y = Math.atan2(focus.x - sp.x, focus.z - sp.z);
        vyr.a.animate(dt, { speed: 0, t, fade: 1 - vyr.fade });
        if (vyr.a.glow) vyr.a.glow(night);
        if (!seen.vyr && d < 220 && ctx.bark) { seen.vyr = true; ctx.persist && ctx.persist(); ctx.bark('tale', 'Across the trees, deep in: light and shadow in the shape of something old, watching. When you look straight at it, it is only the trunks.', 6); }
      }
    }
  }
  return { update };
}
