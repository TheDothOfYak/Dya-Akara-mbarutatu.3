/* ============================================================
   ALCHEMY on the Carpenter's land: his still in the yard, what
   brewing wants (well water, honey from the hives, glowcaps off
   the lakeshore, storm-glass), and the side quests nobody hands
   you — you come across something out on the land (a jar in the
   reeds, a satchel under the dock, a tree the sky came down on)
   and it opens up from there.

   An easy brew just works. A tricky or a hard one is a test of a
   steady hand at the still: stir when the needle is in the green.
   main.js gives this its hands (ctx) and asks it for prompts,
   map marks, and to brew.
   ============================================================ */
import * as THREE from 'three';
import { toon, glowSprite, addOutline } from './gfx.js';
import { ITEMS, BREWS, hasAll, takeAll } from './items.js';
import { QUESTS } from './quests.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;

/* what you find, and what Tanoc makes of it */
const FINDS = {
  jar: [['tale', 'Half sunk in the reeds: an old stoppered jar, full of something dried and pale. On the label, in Buhkon’s square hand: “Glowcaps. For the dark. Two caps to a flask of well water — steep, don’t boil.”'], ['tale', 'The fresh ones grow along the lakeshore. You can see them from here, at dusk: little lights in the grass.']],
  satchel: [['tale', 'Snagged on a pile under the old dock: a leather satchel, green with lake-weed. Inside, wrapped in oilcloth, a notebook — a herbalist’s, by the drawings. Three pages have been torn out.'], ['tale', 'On the last page, in a hurried hand: “Storm coming. Hid the good ones where I’ll find them again: under the red stone on the far shore; at the top of the lookout rocks; in the old hollow ash in the south vale.”']],
  tree: [['tale', 'A tree on the High Meadow, split from crown to root and burned black — and round its roots the sand has melted into glass. It still crackles. Something about it makes the amulets in the bag hum.'], ['tale', 'He works a shard loose. It bites his fingers with a little blue spark. A scorch runs off through the grass to the north, the way the storm went. Where it came down once, it came down again.'], ['tanoc', '(The well water turned like a storm round the amulet. …What would it do round this? Storm-glass, well water, honey to hold it, ore to weigh it down. Three shards, to be sure. And a very steady hand.)']],
};
const PAGE_LINES = [
  [['tale', 'Under the red stone, folded small and dry: a page of brews. One of them is ringed twice.']],
  [['tale', 'Wedged in a crack at the very top of the lookout rocks, weighted with a pebble: the second page. A sketch of the storm, coming in over the lake.']],
  [['tale', 'In the hollow of the old ash, in a tin: the third page. “Fortune draught,” it begins. “For a long road and a light purse.”']],
];
const SHARD_LINES = [
  [['tale', 'Here — a second scar in the earth, glass in the bottom of it. He pries a shard out. It’s warm.']],
  [['tale', 'At the Warden’s feet, a third patch of glass where the sky touched down. The last shard comes away singing.']],
];

export function createAlchemy(ctx) {
  const { scene, world, SAVE } = ctx;
  const F = SAVE.flags, picked = SAVE.picked || (SAVE.picked = {});
  const counters = SAVE.counters || (SAVE.counters = {});
  const H = (x, z) => world.heightAt(x, z);
  const wet = (x, z) => world.water && world.water.isWater(x, z);
  /* the nearest open dry ground to (x, z) — nothing built or grown there to stand you off it — walking out in a widening ring */
  const open = (x, z) => { const q = { x, y: H(x, z), z }; world.col.resolve(q, 2.5, 1.8); return q.x === x && q.z === z; };
  function land(x, z) {
    for (let r = 0; r < 90; r += 2) for (let k = 0; k < (r ? 12 : 1); k++) {
      const a = k / 12 * TAU, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (!wet(px, pz) && (!world.water || H(px, pz) > world.water.level + 0.25) && open(px, pz)) return V3(px, H(px, pz), pz);
    }
    return V3(x, H(x, z), z);
  }
  const knows = () => BREWS.some(r => F['learn_' + r.out]);
  const yard = world.yard || world.SITES.yard;
  const S = world.SITES || {};

  /* ---------------- the still, in the yard ---------------- */
  const still = (() => {
    let at = null;
    for (const [dx, dz] of [[-12, -10], [-14, 4], [-10, 12], [12, 10], [-18, -2]]) {
      const x = yard.x + dx, z = yard.z + dz, h = H(x, z);
      if (world.col.ground(x, z, h + 0.4) <= h + 0.3 && world.col.ground(x + 1.5, z, h + 0.4) <= h + 0.3 && world.col.ground(x - 1.5, z, h + 0.4) <= h + 0.3) { at = V3(x, h, z); break; }
    }
    at = at || V3(yard.x - 12, H(yard.x - 12, yard.z - 10), yard.z - 10);
    const g = new THREE.Group(); g.position.copy(at); g.rotation.y = Math.atan2(yard.x - at.x, yard.z - at.z); scene.add(g);
    const wood = toon(0x7a5232), copper = toon(0xc87a3a, { emissive: 0x4a1a08, emissiveIntensity: 0.3 }), glass = toon(0x9adfe0, { emissive: 0x2a8a8a, emissiveIntensity: 0.35 });
    const part = (geo, mat, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.castShadow = true; addOutline(m, 0.02); g.add(m); return m; };
    part(new THREE.BoxGeometry(2.6, 0.12, 1.1), wood, 0, 0.92, 0);
    for (const [x, z] of [[-1.15, -0.45], [1.15, -0.45], [-1.15, 0.45], [1.15, 0.45]]) part(new THREE.BoxGeometry(0.12, 0.9, 0.12), wood, x, 0.45, z);
    part(new THREE.CylinderGeometry(0.2, 0.26, 0.3, 8), toon(0x5a5a5a), -0.7, 1.12, 0);
    part(new THREE.SphereGeometry(0.42, 12, 9), copper, -0.7, 1.55, 0);
    part(new THREE.CylinderGeometry(0.05, 0.12, 0.5, 6), copper, -0.7, 2.05, 0);
    part(new THREE.CylinderGeometry(0.035, 0.035, 1.0, 6), copper, -0.2, 2.05, 0, 0, -1.2);
    part(new THREE.TorusGeometry(0.22, 0.04, 6, 14), copper, 0.35, 1.55, 0, Math.PI / 2);
    part(new THREE.SphereGeometry(0.2, 10, 8), glass, 0.75, 1.2, 0.1);
    part(new THREE.CylinderGeometry(0.07, 0.09, 0.3, 8), glass, 1.05, 1.13, -0.25);
    part(new THREE.CylinderGeometry(0.06, 0.08, 0.24, 8), toon(0xc8a040), 1.1, 1.1, 0.25);
    const fire = glowSprite(0xff8a3a, 0.9, 0.85); fire.position.set(-0.7, 1.05, 0); g.add(fire);
    const brewGlow = glowSprite(0x9affe0, 1.2, 0.5); brewGlow.position.set(0.75, 1.25, 0.1); g.add(brewGlow);
    world.col.add(at.x, at.z, 1.35, 0.6, g.rotation.y, at.y - 1, at.y + 1);
    return { pos: at, fire, brewGlow };
  })();

  /* ---------------- glowcaps on the lakeshore, a jar in the reeds ---------------- */
  const lake = world.water && world.water.lakes && world.water.lakes[0];
  const shoreAt = a => {
    if (!lake) return land(yard.x - 40, yard.z);
    let r = 0.6; for (; r < 1.6; r += 0.02) { const x = lake.x + Math.cos(a) * lake.rx * r, z = lake.z + Math.sin(a) * lake.rz * r; if (!wet(x, z) && H(x, z) > world.water.level + 0.3) break; }
    const x = lake.x + Math.cos(a) * lake.rx * (r + 0.02), z = lake.z + Math.sin(a) * lake.rz * (r + 0.02);
    return land(x, z);
  };
  const capMat = new THREE.MeshToonMaterial({ color: 0x6ae8ff, emissive: 0x2ad0ff, emissiveIntensity: 0.6 });
  const caps = [];
  const toYard = lake ? Math.atan2(yard.z - lake.z, yard.x - lake.x) : 0;
  for (let i = 0; i < 7; i++) {
    const p = shoreAt(toYard + 0.5 + i * 0.75), g = new THREE.Group(); g.position.copy(p); scene.add(g);
    for (let k = 0; k < 4; k++) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16 + k * 0.03, 8, 5, 0, TAU, 0, Math.PI / 2), capMat), stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.24, 5), toon(0xe8e0d0));
      const ox = Math.cos(k * 2.1) * 0.35, oz = Math.sin(k * 2.1) * 0.35; cap.position.set(ox, 0.24, oz); stem.position.set(ox, 0.12, oz); g.add(cap, stem);
    }
    const gl = glowSprite(0x6ae8ff, 1.6, 0.6); gl.position.y = 0.4; g.add(gl);
    caps.push({ pos: p, g, gl, ready: true, t: 0 });
  }
  const jar = (() => {
    const p = shoreAt(toYard - 0.35), g = new THREE.Group(); g.position.copy(p); g.rotation.z = 0.5; scene.add(g);
    const j = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.42, 10), new THREE.MeshToonMaterial({ color: 0xbfe8e0, transparent: true, opacity: 0.6 })); j.position.y = 0.2; g.add(j);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 10), toon(0x8a5a36)); lid.position.y = 0.45; g.add(lid);
    const gl = glowSprite(0xbfffe8, 1.4, 0.45); gl.position.y = 0.3; g.add(gl);
    for (let k = 0; k < 7; k++) { const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.4, 4), toon(0x6a8a3a)); reed.position.set(Math.cos(k) * 0.5, 0.6, Math.sin(k * 1.7) * 0.5); reed.rotation.z = (k % 3 - 1) * 0.15; scene.add(reed); reed.position.add(p); }
    return { pos: p, g };
  })();

  /* ---------------- under the dock: the satchel; and where its pages went ---------------- */
  const sparkle = (p, col = 0xffe8a0) => { const gl = glowSprite(col, 1.8, 0.7); gl.position.copy(p).setY(p.y + 0.6); scene.add(gl); return gl; };
  const satchel = (() => {
    const d = world.dockPoint || V3(S.dock.x, 0, S.dock.z), p = land(d.x + 3, d.z + 6), g = new THREE.Group(); g.position.copy(p); scene.add(g);
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.25), toon(0x5a6a3a)); bag.position.y = 0.2; bag.rotation.y = 0.6; addOutline(bag, 0.02); g.add(bag);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.3), toon(0x4a5a2a)); flap.position.y = 0.42; flap.rotation.y = 0.6; g.add(flap);
    return { pos: p, g, gl: sparkle(p, 0xd8f0a0) };
  })();
  const pageSpots = [
    S.farshore ? land(S.farshore.x + 18, S.farshore.z - 6) : null,
    world.kuniPerch ? V3(world.kuniPerch.x, world.kuniPerch.y, world.kuniPerch.z) : null,
    land(80, 600),
  ];
  const pages = pageSpots.map((p, i) => {
    if (!p) return null;
    const g = new THREE.Group(); g.position.copy(p); scene.add(g);
    if (i === 0) { const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), toon(0xa84a3a)); st.scale.y = 0.6; st.position.y = 0.3; addOutline(st, 0.03); g.add(st); }
    if (i === 2) { const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 4.5, 9, 1, true), toon(0x6a5a4a, { side: THREE.DoubleSide })); ash.position.y = 2.2; addOutline(ash, 0.03); g.add(ash); world.col.add(p.x, p.z, 0.9, 0.9, 0, p.y - 1, p.y + 4.5); }
    const pg = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), toon(0xf4ecd8, { side: THREE.DoubleSide })); pg.position.set(i === 2 ? 0 : 0.6, i === 2 ? 1.0 : 0.25, i === 2 ? 0.95 : 0); pg.rotation.x = -1.2; g.add(pg);
    const gl = sparkle(i === 2 ? p.clone().setY(p.y + 0.5).add(V3(0, 0, 0.9)) : p.clone().add(V3(0.6, 0, 0)));
    return { pos: i === 2 ? p.clone().add(V3(0, 0, 1.4)) : p, g, gl, i };
  });

  /* ---------------- the storm: a struck tree on the High Meadow, and two more places it came down ---------------- */
  const glassMat = new THREE.MeshToonMaterial({ color: 0x8adfff, emissive: 0x3aa8ff, emissiveIntensity: 0.7 });
  const glassPatch = (p, n = 7, R = 0.6) => {
    const g = new THREE.Group(); g.position.copy(p); scene.add(g);
    for (let k = 0; k < n; k++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.3 + (k % 3) * 0.12, 0), glassMat); const a = k / n * TAU, r = R + (k % 2) * 0.6; s.position.set(Math.cos(a) * r, 0.2, Math.sin(a) * r); s.scale.y = 1.9; s.rotation.set(k, k * 2, 0.3); addOutline(s, 0.02); g.add(s); }
    const scorch = new THREE.Mesh(new THREE.CircleGeometry(2.2, 16), new THREE.MeshBasicMaterial({ color: 0x1a1410, transparent: true, opacity: 0.55, depthWrite: false })); scorch.rotation.x = -Math.PI / 2; scorch.position.y = 0.05; g.add(scorch);
    const gl = glowSprite(0x7ac8ff, 2.6, 0.6); gl.position.y = 0.6; g.add(gl);
    return { g, gl };
  };
  const tree = (() => {
    const p = land(420, 380), pt = glassPatch(p, 12, 1.2), bark = toon(0x2a2220);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 7, 8), bark); trunk.position.y = 3.5; trunk.rotation.z = 0.08; addOutline(trunk, 0.04); pt.g.add(trunk);
    const split = new THREE.Mesh(new THREE.BoxGeometry(0.12, 6, 0.9), new THREE.MeshBasicMaterial({ color: 0x7ac8ff })); split.position.y = 3.6; pt.g.add(split);
    for (let k = 0; k < 4; k++) { const br = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, 3, 5), bark); br.position.set(Math.cos(k * 1.7) * 0.9, 6 + k * 0.3, Math.sin(k * 1.7) * 0.9); br.rotation.set(Math.sin(k) * 0.9, 0, Math.cos(k * 1.7) * 0.9); pt.g.add(br); }
    world.col.add(p.x, p.z, 0.7, 0.7, 0, p.y - 1, p.y + 7);
    return { pos: p, ...pt, regrow: 0 };
  })();
  const shardSpots = [land(-200, -640), S.warden ? land(S.warden.x + 60, S.warden.z + 60) : land(-400, -300)];
  const shards = shardSpots.map((p, i) => ({ pos: p, i, ...glassPatch(p, 5) }));
  let ambush = null;   // the Rodak that have made the second scorch their den

  const active = q => SAVE.quests[q] === 'active';
  const done = q => SAVE.quests[q] === 'done';
  function startFound(qid, lines, then) {
    ctx.dialog(lines, () => {
      SAVE.quests[qid] = 'active'; ctx.sfx.core(); ctx.toast(`New side quest: ${QUESTS[qid].name}${QUESTS[qid].hard ? ' (hard)' : ''}`, 3.5);
      if (then) then(); ctx.persist(); ctx.setObjective();
    });
  }
  function bump(qid, key) {
    counters[qid] = (counters[qid] || 0) + 1;
    if (key) picked[key] = true;
    ctx.persist();
    if (counters[qid] >= QUESTS[qid].goal.n) ctx.finishFound(qid);
  }

  /* ---------------- the steady hand: stir when the needle's in the green ---------------- */
  let game = null;
  function steadyHand(level, name, cb) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(10,6,4,.55);font-family:inherit';
    el.innerHTML = `<div style="background:#2a1c12;border:2px solid #c8a060;border-radius:10px;padding:18px 22px;width:min(420px,92vw);color:#f3e6c8;text-align:center;box-shadow:0 8px 30px #000a">
      <div style="font-size:18px;margin-bottom:4px">Brewing: <b>${name}</b></div>
      <div style="font-size:13px;opacity:.8;margin-bottom:12px">${level > 1 ? 'A lively still — the sweet spot won’t sit still either.' : 'Keep the still steady.'} Stir when the needle is in the green: <b>Space</b>, <b>E</b> or click. Three good stirs. Two slips and it spoils. <b>Esc</b> to stop (you keep what you put in).</div>
      <div data-bar style="position:relative;height:26px;border-radius:13px;background:#4a2a1a;overflow:hidden;cursor:pointer;border:1px solid #8a6040">
        <div data-zone style="position:absolute;top:0;bottom:0;background:#5ac86a;opacity:.85"></div>
        <div data-needle style="position:absolute;top:-3px;bottom:-3px;width:4px;background:#fff;box-shadow:0 0 6px #fff"></div>
      </div>
      <div data-score style="margin-top:10px;font-size:15px"></div></div>`;
    document.body.appendChild(el);
    const zoneEl = el.querySelector('[data-zone]'), needle = el.querySelector('[data-needle]'), score = el.querySelector('[data-score]');
    const g = { t: 0, x: 0, dir: 1, hits: 0, slips: 0, w: level > 1 ? 0.14 : 0.22, z0: 0, speed: level > 1 ? 1.5 : 1.0, over: false };
    const place = () => { g.z0 = 0.1 + Math.random() * (0.8 - g.w); zoneEl.style.left = g.z0 * 100 + '%'; zoneEl.style.width = g.w * 100 + '%'; };
    const show = () => { score.innerHTML = `${'🟢'.repeat(g.hits)}${'⚪'.repeat(3 - g.hits)} &nbsp; slips: ${'❌'.repeat(g.slips)}${'·'.repeat(2 - g.slips)}`; };
    place(); show();
    const end = ok => {
      if (g.over) return; g.over = true; game = null;
      removeEventListener('keydown', key, true);
      setTimeout(() => { el.remove(); cb(ok); }, ok === null ? 0 : 450);
    };
    const stir = () => {
      if (g.over) return;
      if (g.x >= g.z0 && g.x <= g.z0 + g.w) { g.hits++; ctx.sfx.ui(); zoneEl.style.background = '#9affa0'; setTimeout(() => { zoneEl.style.background = '#5ac86a'; }, 120); if (level > 1) { place(); g.speed *= 1.12; } }
      else { g.slips++; ctx.sfx.hurt ? ctx.sfx.hurt() : ctx.sfx.ui(); }
      show();
      if (g.hits >= 3) { score.innerHTML += '<br><b style="color:#9affa0">It takes!</b>'; end(true); }
      else if (g.slips >= 2) { score.innerHTML += '<br><b style="color:#ff9a6a">It boils over — spoiled.</b>'; end(false); }
    };
    function key(e) {
      if (e.code === 'Space' || e.code === 'KeyE') { e.preventDefault(); e.stopPropagation(); if (!e.repeat) stir(); }
      else if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); end(null); }
    }
    addEventListener('keydown', key, true);
    el.querySelector('[data-bar]').onclick = e => { e.stopPropagation(); stir(); };
    let last = performance.now();
    const frame = now => {
      if (g.over) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      g.x += g.dir * g.speed * dt; if (g.x > 1) { g.x = 1; g.dir = -1; } if (g.x < 0) { g.x = 0; g.dir = 1; }
      needle.style.left = `calc(${g.x * 100}% - 2px)`;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    game = g;
  }

  /* brew (or make) one of `out` at the still: easy ones at once, the rest after the steady hand */
  function brew(out, then) {
    const r = BREWS.find(b => b.out === out);
    if (!r || !F['learn_' + out] || !hasAll(SAVE.inv, r.need) || game) return;
    const finish = ok => {
      if (ok === null) { then && then(); return; }
      if (!takeAll(SAVE.inv, r.need)) { then && then(); return; }
      ctx.particles.burst(still.pos.x, still.pos.y + 1.6, still.pos.z, ok ? 30 : 20, { color: ok ? 0x9affe0 : 0x6a6a6a, speed: 3, size: 0.4, life: 1, gravity: -2 });
      if (!ok) { ctx.toast(`${ITEMS[out].name} — spoiled. The ingredients are gone.`, 3); ctx.persist(); then && then(); return; }
      ctx.invAdd(SAVE.inv, out, 1); ctx.lootToast(out, 1); ctx.sfx.heal(); ctx.xp(r.hard === 2 ? 60 : r.hard ? 25 : 10);
      F['brewed_' + out] = (F['brewed_' + out] || 0) + 1;
      if (out === 'pt_glow' && active('q_glow')) bump('q_glow');
      if (out === 'pt_storm' && active('q_storm') && (counters.q_storm || 0) >= 3) bump('q_storm');
      ctx.onBrewed && ctx.onBrewed(out);
      ctx.persist(); then && then();
    };
    if (r.hard) steadyHand(r.hard, ITEMS[out].name, finish); else finish(true);
  }

  /* ---------------- E-prompts ---------------- */
  let honeyT = 0;
  function interactables(P) {
    const out = [], near = (p, d = 30) => Math.abs(p.x - P.pos.x) < d && Math.abs(p.z - P.pos.z) < d;
    const at = p => V3(p.x, p.y + 1, p.z);
    if (near(still.pos)) out.push({ pos: at(still.pos), label: knows() ? 'Brew at the Carpenter’s still' : 'Look at the copper still', act: () => knows() ? ctx.openBook('brew') : ctx.dialog([['tale', 'Copper, glass and a little fire-pit, on a bench by itself. Everything smells faintly of Zahreh and smoke.'], ['tanoc', '(Buhkon’s. He’s never said what for.)']]), far: 3 });
    if (knows() && world.places) {
      const w = world.places.well; if (w && near(w)) out.push({ pos: V3(w.x, H(w.x, w.z) + 1, w.z), label: 'Fill three flasks at the well', act: () => { ctx.invAdd(SAVE.inv, 'wellwater', 3); ctx.lootToast('wellwater', 3); ctx.sfx.ui(); ctx.persist(); ctx.setObjective(); }, far: 3.2 });
      const hv = world.places.hives; if (hv && near(hv)) out.push({ pos: V3(hv.x, H(hv.x, hv.z) + 1, hv.z), label: honeyT > 0 ? 'The hives <small>(the bees need a while)</small>' : 'Take a honeycomb from the hives', act: () => { if (honeyT > 0) { ctx.toast('The bees are cross. Give them a while.', 2); return; } honeyT = 90; ctx.invAdd(SAVE.inv, 'honey', 1); ctx.lootToast('honey', 1); ctx.sfx.ui(); ctx.persist(); ctx.setObjective(); }, far: 3.5 });
    }
    for (const c of caps) if (c.ready && near(c.pos, 12)) out.push({ pos: at(c.pos), label: 'Pick the glowcaps', act: () => { c.ready = false; c.t = 240; c.g.visible = false; ctx.invAdd(SAVE.inv, 'glowcap', 2); ctx.lootToast('glowcap', 2); ctx.sfx.ui(); ctx.persist(); ctx.setObjective(); }, far: 2.4 });
    // the finds
    if (!SAVE.quests.q_glow && near(jar.pos, 10)) out.push({ pos: at(jar.pos), label: 'Something glinting in the reeds', act: () => startFound('q_glow', FINDS.jar, () => { F.learn_pt_glow = true; ctx.toast('Brew learned: Glowcap tonic', 3); }), far: 2.6 });
    if (!SAVE.quests.q_satchel && near(satchel.pos, 10)) out.push({ pos: at(satchel.pos), label: 'Something caught under the dock', act: () => startFound('q_satchel', FINDS.satchel), far: 2.8 });
    if (active('q_satchel')) for (const pg of pages) if (pg && !picked['satpage' + pg.i] && near(pg.pos, 10)) out.push({ pos: at(pg.pos), label: 'A folded page', act: () => ctx.dialog(PAGE_LINES[pg.i], () => { bump('q_satchel', 'satpage' + pg.i); ctx.setObjective(); }), far: 2.8 });
    if (near(tree.pos, 12)) {
      if (!SAVE.quests.q_storm) out.push({ pos: at(tree.pos), label: 'The tree the sky came down on', act: () => startFound('q_storm', FINDS.tree, () => { ctx.invAdd(SAVE.inv, 'stormglass', 1); ctx.lootToast('stormglass', 1); counters.q_storm = 1; picked.storm0 = true; F.learn_pt_storm = true; ctx.toast('Brew learned: Storm in a bottle — the hardest there is', 3.5); }), far: 3.4 });
      else if (done('q_storm') && tree.regrow <= 0) out.push({ pos: at(tree.pos), label: 'Pry a shard of storm-glass loose', act: () => { tree.regrow = 300; ctx.invAdd(SAVE.inv, 'stormglass', 1); ctx.lootToast('stormglass', 1); ctx.sfx.ui(); ctx.persist(); }, far: 3.4 });
    }
    if (active('q_storm')) for (const s of shards) if (!picked['storm' + (s.i + 1)] && near(s.pos, 12)) {
      const guarded = s.i === 0 && ambush && ambush.some(e => !e.dead && !e.gone);
      out.push({ pos: at(s.pos), label: guarded ? 'Storm-glass <small>(drive the Rodak off first)</small>' : 'Pry the storm-glass loose', act: () => { if (guarded) { ctx.toast('Not with the Rodak snapping at you.', 2); return; } ctx.dialog(SHARD_LINES[s.i], () => { ctx.invAdd(SAVE.inv, 'stormglass', 1); ctx.lootToast('stormglass', 1); bump('q_storm', 'storm' + (s.i + 1)); if ((counters.q_storm || 0) >= 3) ctx.toast('Three shards. Now the still — and a very steady hand.', 4); ctx.setObjective(); }); }, far: 3 });
    }
    return out;
  }

  /* ---------------- per frame ---------------- */
  function update(dt, t, P, night = 0) {
    if (honeyT > 0) honeyT -= dt;
    if (tree.regrow > 0) tree.regrow -= dt;
    still.fire.scale.setScalar(0.9 + Math.sin(t * 11) * 0.08);
    still.brewGlow.material.opacity = 0.35 + Math.sin(t * 2) * 0.15;
    for (const c of caps) {
      if (!c.ready) { c.t -= dt; if (c.t <= 0) { c.ready = true; c.g.visible = true; } }
      c.gl.material.opacity = 0.25 + night * 0.55 + Math.sin(t * 1.5 + c.pos.x) * 0.08;
    }
    capMat.emissiveIntensity = 0.3 + night * 0.9;
    jar.g.visible = !SAVE.quests.q_glow;
    satchel.g.visible = satchel.gl.visible = !SAVE.quests.q_satchel;
    for (const pg of pages) if (pg) pg.g.visible = pg.gl.visible = active('q_satchel') && !picked['satpage' + pg.i];
    const stormOn = active('q_storm');
    for (const s of shards) { s.g.visible = stormOn && !picked['storm' + (s.i + 1)]; s.gl.material.opacity = 0.4 + Math.random() * 0.4; }
    tree.gl.material.opacity = (done('q_storm') && tree.regrow > 0) ? 0.2 : 0.4 + Math.random() * 0.4;
    // the second scorch: Rodak have made it their den
    const s0 = shards[0];
    if (stormOn && !picked.storm1 && !ambush && Math.hypot(P.pos.x - s0.pos.x, P.pos.z - s0.pos.z) < 26) {
      ambush = [];
      for (let k = 0; k < 3; k++) { const a = k / 3 * TAU, e = ctx.spawnFoe('rodak', s0.pos.x + Math.cos(a) * 7, s0.pos.z + Math.sin(a) * 7); if (e) ambush.push(e); }
      ctx.bark('tale', 'Rodak — three of them, nosing round the glass. They don’t mean to share it.', 3.5);
    }
  }

  /* where the map should point, for the quests found out here */
  function markers() {
    const m = [];
    if (active('q_glow')) for (const c of caps) if (c.ready) m.push({ x: c.pos.x, z: c.pos.z, ch: '✦', col: '#6ae8ff', size: 12 });
    if (active('q_satchel')) for (const pg of pages) if (pg && !picked['satpage' + pg.i]) m.push({ x: pg.pos.x, z: pg.pos.z, ch: '✦', col: '#ff9ad0', size: 15, label: 'A page' });
    if (active('q_storm')) {
      for (const s of shards) if (!picked['storm' + (s.i + 1)]) m.push({ x: s.pos.x, z: s.pos.z, ch: '✦', col: '#7ac8ff', size: 15, label: 'Storm-glass' });
      if ((counters.q_storm || 0) >= 3) m.push({ x: still.pos.x, z: still.pos.z, ch: '⚗', col: '#9affe0', size: 16, label: 'The still' });
    }
    if (knows()) m.push({ x: still.pos.x, z: still.pos.z, ch: '⚗', col: '#9affe0', size: 14 });
    return m;
  }

  return { still: still.pos, brew, interactables, update, markers, get busy() { return !!game; }, debug: { jar, satchel, pages, tree, shards, caps, steadyHand } };
}
