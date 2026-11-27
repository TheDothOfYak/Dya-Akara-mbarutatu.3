// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3: the main loop, the camera, saving, and the few scripted moments.
(function () {
  'use strict';
  const V3 = window.V3, U = V3.util, P = V3.paint, W = V3.world, S = V3.sky, SC = V3.scenery, HS = V3.heroes, PT = V3.party, C = V3.creatures, F = V3.fun, N = V3.npc, UI = V3.ui, I = V3.input, PL = V3.plants, TAU = U.TAU;
  const G = (V3.game = { state: 'title', ready: false, fps: 60, zoom: 1, vw: 1280, vh: 720, met: new Set(), plays: 0, time: 0 });
  const cam = (G.cam = { x: 6560, y: -190 });
  let canvas, ctx, dpr = 1, shake = 0, stop = 0, fadeT = 0, fadeFn = null, saveT = 20, last = 0, rift = null, hintSeen = {}, zone = null, amuletT = 0;

  G.shake = (n) => { shake = Math.max(shake, n); };
  G.hitStop = (t) => { stop = Math.max(stop, t); };
  G.fade = (fn) => { if (fadeT > 0) return; fadeT = 1; fadeFn = fn; };
  G.toScreen = (x, y) => [x - cam.x + G.vw / 2, y - cam.y + G.vh / 2];
  G.saveSoon = () => { saveT = Math.min(saveT, 1.5); };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    G.zoom = Math.min(w / (w < h ? 620 : 1040), h / 660); G.vw = w / G.zoom; G.vh = h / G.zoom;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    const s = Math.min(3, Math.max(1, G.zoom * dpr));
    if (Math.abs(s - P.S) > 0.15) { P.S = s; P.flush(); SC.flush(); }
  };

  // ---------- saving (own keys only; see save/save.js) ----------
  G.snapshot = () => ({
    hero: PT.id, x: Math.round(PT.x), y: Math.round(PT.y), hp: Object.assign({}, PT.hp), time: S.t, weather: S.weather,
    flags: Object.assign({}, F.flags), found: [...F.found], keepsakes: [...F.kept], npc: JSON.parse(JSON.stringify(N.mem)), met: [...G.met],
    walls: W.walls.filter((w) => w.broken).map((w) => w.id), stone: Object.keys((F.things.find((t) => t.kind === 'stone') || { lit: {} }).lit),
    snag: (() => { const s = C.list.find((c) => c.kind === 'snag'); return s ? { calm: s.calm, knots: s.knots } : null; })(), sent: C.sent, plays: G.plays,
  });
  const reset = () => {
    if (PT.host) PT.unpossess();
    PL.list.slice().forEach(PL.remove); PL.seeds.length = 0;
    W.walls.forEach((w) => (w.broken = false));
    for (const p of W.platforms) if (p.kind === 'twig') { p.gone = false; p.regrow = 0; }
    C.init(); F.init(); N.mem = {}; N.init(); F.found = new Set(); F.kept = new Set(); F.flags = {}; G.met = new Set();
    Object.assign(PT, { w: HS.info[PT.id].w, h: HS.info[PT.id].h, grounded: false, onPlat: null, landed: false, wasWater: false, invuln: 0, frozen: 0, idle: 0, charge: 0, full: false, puffs: 2, breath: 1.4, coyote: 0, dashT: 0, dashCd: 0, rolling: false, puffing: false, tucked: false, slamming: false, windup: 0, punchT: 0, tuckT: 0, rootT: 0, rootTick: 0, drill: false, seedCd: 0, booCd: 0, solidT: 0 });
    PT.healAll(); I.releaseAll(); UI.talking = null; UI.journal = false; UI.end = 0;
    rift = null; G.grace = 0; fadeT = 0; fadeFn = null; stop = 0; saveT = 20; amuletT = 0; hintSeen = {};
  };
  G.restore = (s) => {
    const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
    const array = (v) => Array.isArray(v) ? v : [];
    const counter = (v) => Number.isFinite(v) ? U.clamp(Math.floor(v), 0, Number.MAX_SAFE_INTEGER) : 0;
    if (!object(s)) return false;
    reset();
    for (const id of HS.order) if (object(s.hp) && Number.isFinite(s.hp[id])) PT.hp[id] = U.clamp(s.hp[id], 0, HS.info[id].hp);
    if (!HS.order.some(PT.alive)) PT.healAll();
    const hero = HS.order.includes(s.hero) ? s.hero : 'fuzzy';
    PT.swap(PT.alive(hero) ? hero : HS.order.find(PT.alive), true);
    const x = Number.isFinite(s.x) ? U.clamp(s.x, W.X0 + 60, W.X1 - 120) : W.SPAWN;
    let y = Number.isFinite(s.y) ? U.clamp(s.y, -W.X1, W.groundY(x)) : undefined;
    for (const sol of W.solids) if (y !== undefined && x + PT.w / 2 > sol.x && x - PT.w / 2 < sol.x + sol.w && y > sol.y && y - PT.h < sol.y + sol.h) y = sol.y;
    PT.teleport(x, y); PT.swapT = 0;
    S.setTime(Number.isFinite(s.time) ? s.time : 0.36); S.setWeather(['clear', 'breeze', 'rain', 'sunshower', 'fog'].includes(s.weather) ? s.weather : 'clear');
    const flags = object(s.flags) ? s.flags : {};
    for (const k of ['sock', 'fellInWell', 'snagCalm', 'rockSwam']) if (flags[k] === true) F.flags[k] = true;
    for (const k of ['pokedSnail', 'wiped']) if (counter(flags[k])) F.flags[k] = counter(flags[k]);
    F.found = new Set(array(s.found).filter((id) => F.all.some((d) => d.id === id)));
    F.kept = new Set(array(s.keepsakes).filter((id) => F.keepsakes.some((d) => d.id === id)));
    const npc = object(s.npc) ? s.npc : {};
    for (const n of N.list) {
      const m = object(npc[n.id]) ? npc[n.id] : {}, out = N.mem[n.id];
      out.talks = counter(m.talks); out.booed = counter(m.booed);
      if (object(m.met)) for (const id of HS.order) if (m.met[id] === true) out.met[id] = true;
      for (const k of ['sock', 'well', 'snail', 'booTold']) if (m[k] === true) out[k] = true;
    }
    G.met = new Set(array(s.met).filter((id) => typeof id === 'string' && Object.prototype.hasOwnProperty.call(C.DEF, id))); C.sent = counter(s.sent); G.plays = counter(s.plays);
    for (const w of W.walls) w.broken = array(s.walls).includes(w.id);
    const st = F.things.find((t) => t.kind === 'stone'); if (st) for (const id of array(s.stone)) if (HS.order.includes(id)) st.lit[id] = true;
    const sn = C.list.find((c) => c.kind === 'snag'), snag = object(s.snag) ? s.snag : {};
    if (sn) { sn.knots = Math.min(3, counter(snag.knots)); if (snag.calm === true || sn.knots === 3 || F.flags.snagCalm) { sn.calm = true; sn.knots = 3; sn.calmT = 9; sn.awake = true; F.flags.snagCalm = true; F.kept.add('heartknot'); } }
    if (F.found.has('tune')) F.kept.add('humstone');
    if (F.found.has('rift')) F.kept.add('shard');
    cam.x = PT.x; cam.y = PT.y - 120;
    if (st && Object.keys(st.lit).length === 4 && !F.found.has('rift')) G.riftScene(st);
    return true;
  };
  const save = () => { if (G.state === 'play' && !rift) V3.save.write(G.snapshot()); };

  // ---------- starting ----------
  const begin = () => { G.state = 'play'; G.ready = true; UI.zone(W.zoneAt(PT.x).name); V3.audio.init(); zone = null; };
  G.start = (heroId) => {
    reset();
    PT.swap(HS.order.includes(heroId) ? heroId : 'fuzzy', true); PT.swapT = 0; PT.teleport(W.SPAWN); S.setTime(0.36); S.setWeather('clear'); G.plays++;
    cam.x = PT.x; cam.y = PT.y - G.vh * 0.25; begin(); G.grace = 6;
    hintSeen = {}; UI.hintQ.length = 0; UI.hintT = 0;
    UI.hint('A / D to walk, Space to jump, E to poke things and talk. Press 1 2 3 4 to swap brothers: each one plays completely differently. Tab opens the journal.', 9);
    heroHint(PT.id);
  };
  G.continue = () => { const s = V3.save.load(); if (!G.restore(s)) return G.start(HS.order[UI.titleSel]); begin(); };
  G.wipe = () => { G.fade(() => { PT.healAll(); PT.swap('fuzzy', true); PT.teleport(W.SPAWN); S.setTime(0.27); UI.banner('The brothers wake by the hearth', 'Old Tuft carried all four of you home. He would like you to stop doing that.'); F.flags.wiped = (F.flags.wiped || 0) + 1; }); };

  // ---------- the rift: all four brothers have touched the stone ----------
  G.riftScene = (stone) => { rift = { t: 0, x: stone.x, y: stone.y - 400 }; PT.frozen = 9; V3.audio.sfx('rift'); V3.audio.music(null); };
  const updRift = (dt) => {
    rift.t += dt; PT.frozen = Math.max(PT.frozen, 0.2);
    if (rift.t > 1 && rift.t < 7) G.shake(2 + Math.sin(rift.t * 3) * 1.5);
    if (rift.t > 2.6 && !rift.b1) { rift.b1 = true; UI.banner('The sky tears', 'Something on the other side turns to look.'); V3.audio.sfx('hoot', { pitch: 0.25 }); }
    if (rift.t > 6.2 && !rift.b2) { rift.b2 = true; UI.banner('A World Eater', 'Only a baby. It has seen you now.'); }
    if (rift.t > 9) { rift = null; F.find('rift'); F.keep('shard'); UI.endCard(); zone = null; save(); }
  };
  const drawRift = (g) => {
    const t = rift.t, open = U.smooth((t - 0.6) / 2) * (1 - U.smooth((t - 7.6) / 1.2)), x = rift.x, y = rift.y;
    if (open <= 0) return;
    g.save(); g.translate(x, y); g.rotate(-0.25);
    g.globalCompositeOperation = 'lighter'; P.glow(g, 0, 0, 520 * open, '#7a3cff', 0.35); g.globalCompositeOperation = 'source-over';
    const w = 330 * open, h = 110 * open;
    const edge = () => { g.beginPath(); for (let i = 0; i <= 24; i++) { const a = (i / 24) * TAU, j = 1 + (U.hash(i * 3.1) - 0.5) * 0.35 + Math.sin(S.time * 3 + i) * 0.03; g.lineTo(Math.cos(a) * w * j, Math.sin(a) * h * j); } g.closePath(); };
    edge(); g.fillStyle = '#0b0618'; g.fill(); g.strokeStyle = '#c9a0ff'; g.lineWidth = 5; g.stroke();
    g.save(); edge(); g.clip();
    for (let i = 0; i < 30; i++) P.ell(g, (U.hash(i) - 0.5) * w * 2, (U.hash(i * 7) - 0.5) * h * 2, 1.6, 1.6, 'rgba(220,200,255,' + (0.4 + 0.4 * Math.sin(S.time * 2 + i)) + ')');
    // the eye
    const eo = U.smooth((t - 2.8) / 1) * (1 - U.smooth((t - 7) / 0.6)), blink = t > 5 && t < 5.25 ? 0.1 : 1;
    if (eo > 0) {
      const ew = w * 0.62, eh = h * 0.8 * eo * blink;
      g.beginPath(); g.moveTo(-ew, 0); g.quadraticCurveTo(0, -eh * 1.5, ew, 0); g.quadraticCurveTo(0, eh * 1.5, -ew, 0); g.closePath();
      const gr = g.createRadialGradient(0, 0, 4, 0, 0, ew); gr.addColorStop(0, '#ffe27a'); gr.addColorStop(0.35, '#ff8a2a'); gr.addColorStop(1, '#6a1010'); g.fillStyle = gr; g.fill();
      g.save(); g.clip(); const look = U.clamp((PT.x - x) / 400, -1, 1) * ew * 0.3; g.fillStyle = '#0b0204'; g.beginPath(); g.ellipse(look, 4, 13, eh * 1.2, 0, 0, TAU); g.fill(); P.ell(g, look - 30, -eh * 0.4, 14, 7, 'rgba(255,255,255,.5)'); g.restore();
      g.strokeStyle = '#2a0808'; g.lineWidth = 5; g.stroke();
    }
    g.restore(); g.restore();
  };

  // ---------- one step of the world ----------
  const HINTS = { tusks: 'Warthog tusks block the front. Stand by a tree and step aside when it charges, or get behind it.', eater: 'An Eater Rock only opens up to bite. Let it snap, then hit it while it chews (or slam it).', snag: "Old Snagroot's bark is too thick. Dodge a vine so it sticks in the dirt, hit the vine, then hit the glowing knot." };
  const WALLHINT = { fuzzy: 'Too thick to push through. The Fuzzy can float over: jump, puff twice, then hold K. Or try another brother.', rock: 'The Rock can smash this: hold K to roll and hit it at speed, or punch it with J.', acorn: 'The Acorn can grow a way over: J throws a seed. Climb the leaves and bounce on the bloom.', ghost: '' };
  V3.bus.on('hint', (k) => { if (!hintSeen[k]) { hintSeen[k] = 1; UI.hint(HINTS[k], 9); } });
  V3.bus.on('met', (k) => { if (!G.met.has(k)) { G.met.add(k); const c = C.list.find((c) => c.kind === k && !c.dead); if (c && !C.DEF[k].critter && k !== 'snag') P.say(c.x, c.y - c.h - 34, 'new journal note', '#ffe9a8', 17); } });
  const HEROHINT = {
    fuzzy: 'The Fuzzy: press Space again in the air to puff, and hold Space to glide. Run through grass to build static, then J to zap-dash. Hold K to float up.',
    rock: 'The Rock: hold K to curl up and roll. Slopes make him fast, and fast breaks things. J is a big slow punch; in the air, J is a slam. He sinks, and that is fine.',
    acorn: 'The Acorn: J throws a seed, and something grows where it lands. Climb the leaves, bounce on the bloom. Hold K to tuck into the cap.',
    ghost: 'The Ghost: W A S D to drift anywhere. Walls and creatures cannot touch him. J says BOO. K borrows the nearest creature.',
  };
  const heroHint = (id) => { if (G.state === 'play' && !hintSeen['hero' + id]) { hintSeen['hero' + id] = 1; UI.hint(HEROHINT[id], 10); } };
  V3.bus.on('swap', heroHint);
  V3.bus.on('snagwake', () => UI.banner('Old Snagroot', 'Grumpy since the dry spell. Watch where the vines point.'));
  V3.bus.on('weather', (k) => { if (G.state === 'play' && k === 'rain') UI.hint('Rain. The Acorn’s plants grow taller, snails hurry, and the pond gets loud.', 6); });

  const step = (dt) => {
    S.update(dt); UI.update(dt);
    if (I.hit('mute')) V3.audio.setMuted(!V3.audio.muted);
    if (G.state === 'title') {
      cam.x = U.damp(cam.x, 6560 + Math.sin(S.time * 0.1) * 260, 1, dt); cam.y = U.damp(cam.y, -190, 2, dt);
      if (I.hit('jump') || I.hit('poke') || I.hit('act')) G.start(HS.order[UI.titleSel]); else if (I.down.special && V3.save.has()) G.continue();
      F.update(dt); N.update(dt); C.update(dt); P.updateParts(dt, S.wind * 300); return;
    }
    if (I.hit('journal') || (UI.journal && I.hit('back'))) UI.toggleJournal();
    if (UI.journal || UI.end > 1) { P.updateParts(dt, S.wind * 300); return; }
    if (rift) updRift(dt);
    if (G.grace > 0) G.grace -= dt;
    // E: finish a line of talk, else the nearer of a villager and a prop, else a calm Snagroot (rematch), else a little poke
    const pokeNear = () => (N.dist() <= F.pokeDist() ? N.talk() || F.poke() : F.poke() || N.talk()) || C.sparPoke(PT);
    if (I.hit('poke')) { if (!UI.advance() && !pokeNear()) { V3.audio.sfx('poke', { vol: 0.4 }); P.emit({ kind: 'ring', x: PT.x + PT.f * 40, y: PT.y - 36, R: 22, r: 3, col: '#fff', life: 0.25 }); } }
    if (UI.talking) { I.pressed.act = I.pressed.special = I.pressed.jump = false; }
    PT.update(dt); PL.update(dt); C.update(dt); N.update(dt); F.update(dt);
    P.updateParts(dt, S.wind * 300);
    for (const t of SC.trees) if (t.shake > 0) t.shake -= dt;
    // wall hints, zone names, music
    if (PT.hitWall && WALLHINT[PT.id] && !hintSeen['wall' + PT.id]) for (const w of W.walls) if (!w.broken && Math.abs(w.x - PT.x) < 60) { hintSeen['wall' + PT.id] = 1; UI.hint(WALLHINT[PT.id], 9); }
    const z = W.zoneAt(PT.x), cave = W.caveAt(PT.x, PT.y);
    const zid = cave > 0.5 ? 'hollowcave' : z.id;
    if (zid !== zone) { zone = zid; if (zid !== 'hollowcave') UI.zone(z.name); V3.audio.music({ cliff: 'woods', hollow: 'woods', hollowcave: 'hollow', woods: 'woods', village: 'village', glade: 'glade', pond: 'pond', ridge: 'ridge' }[zid]); }
    V3.audio.ambience({ rain: S.rain * (1 - cave * 0.7), wind: U.clamp(S.wind + (z.id === 'ridge' ? 0.4 : 0), 0, 1) * (1 - cave), night: S.night * (1 - cave), cave });
    if (S.rain > 0.3 && U.chance(dt * 30 * S.rain)) { const rx = cam.x + U.rand(-G.vw / 2, G.vw / 2), w = W.waterAt(rx, 60); if (w || W.caveAt(rx, W.groundY(rx)) < 0.1) P.emit({ kind: 'ring', x: rx, y: w ? w.y : W.groundY(rx), R: w ? 14 : 8, r: 2, col: '#e6f3ff', life: 0.35, squash: 0.35, a: 0.7 }); }
    // the amulet mends you slowly in daylight
    if (F.kept.has('amulet') && S.night < 0.3 && (amuletT += dt) > 30) { amuletT = 0; PT.heal(PT.id, 1); }
    V3.story.tick && (G.time += dt) > 1 && (G.time = 0, V3.story.tick(G));
    // camera: eased, looks ahead a little
    const look = PT.f * 70 + U.clamp(PT.vx * 0.22, -130, 130);
    cam.x = U.damp(cam.x, U.clamp(PT.x + look, W.X0 + G.vw / 2 + 40, W.X1 - G.vw / 2 - 40), 4.5, dt);
    cam.y = U.damp(cam.y, PT.y - G.vh * 0.25 - (rift ? 90 : 0), PT.vy > 600 ? 9 : 3.5, dt);
    if ((saveT -= dt) <= 0) { saveT = 20; save(); }
    if (fadeT > 0) { const before = fadeT; fadeT -= dt * 1.2; if (before > 0.5 && fadeT <= 0.5 && fadeFn) { fadeFn(); fadeFn = null; cam.x = PT.x; cam.y = PT.y - 120; } }
  };

  // ---------- drawing ----------
  const lights = [];
  const render = () => {
    const g = ctx, vw = G.vw, vh = G.vh, sc = G.zoom * dpr;
    g.setTransform(sc, 0, 0, sc, 0, 0); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    const sx = shake > 0.2 ? U.rand(-shake, shake) : 0, sy = shake > 0.2 ? U.rand(-shake, shake) : 0;
    const cx = cam.x + sx, cy = cam.y + sy, c = { x: cx, y: cy };
    S.drawSky(g, c, vw, vh); F.drawSky(g, vw, vh);
    S.drawFar(g, c, vw, vh);
    const v = { x0: cx - vw / 2 - 20, x1: cx + vw / 2 + 20, y0: cy - vh / 2, y1: cy + vh / 2 + 20 };
    g.save(); g.translate(vw / 2 - cx, vh / 2 - cy);
    if (rift) drawRift(g);
    SC.drawBack(g, v); P.drawParts(g, -1); F.drawBack(g, v);
    SC.drawTerrain(g, v); SC.drawDeco(g, v); PL.draw(g);
    N.draw(g, v); C.draw(g, v); PT.draw(g);
    P.drawParts(g, 0); SC.drawGrass(g, v); SC.drawWater(g, v); F.drawOver(g, v); P.drawParts(g, 1);
    g.restore();
    SC.drawFront(g, c, vw, vh);
    S.drawShafts(g, c, vw, vh);
    lights.length = 0; PT.lights(lights); SC.lights(lights, v); F.lights(lights); C.lights(lights); N.lights(lights);
    S.drawLight(g, c, vw, vh, lights, (x, y) => [x - cx + vw / 2, y - cy + vh / 2]);
    S.drawWeather(g, c, vw, vh);
    // warm vignette and paper grain, so the whole picture sits on one page
    const vg = g.createRadialGradient(vw / 2, vh / 2, vh * 0.45, vw / 2, vh / 2, Math.max(vw, vh) * 0.75); vg.addColorStop(0, 'rgba(40,20,30,0)'); vg.addColorStop(1, 'rgba(40,20,30,.34)'); g.fillStyle = vg; g.fillRect(0, 0, vw, vh);
    g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 0.5; g.fillStyle = grainPat || (grainPat = g.createPattern(P.grain(), 'repeat')); g.fillRect(0, 0, vw, vh); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    UI.draw(g, vw, vh);
    if (fadeT > 0) { g.fillStyle = 'rgba(20,12,24,' + (1 - Math.abs(fadeT - 0.5) * 2) + ')'; g.fillRect(0, 0, vw, vh); }
  };
  let grainPat = null;

  const frame = (now) => {
    requestAnimationFrame(frame);
    let dt = Math.min(0.033, (now - last) / 1000 || 0.016); last = now;
    G.fps = U.lerp(G.fps, 1 / Math.max(dt, 0.001), 0.05);
    shake = Math.max(0, shake - dt * 40);
    if (stop > 0) { stop -= dt; dt = 0.0001; }
    try { step(dt); render(); } catch (e) { if (!G.err) { G.err = e; console.error(e); } }
    I.endFrame();
  };
  G.tick = (dt, n) => { for (let i = 0; i < (n || 1); i++) { step(dt); I.endFrame(); } }; // for tests

  const boot = () => {
    canvas = document.getElementById('game'); ctx = canvas.getContext('2d');
    resize(); addEventListener('resize', resize);
    SC.init(); C.init(); F.init(); N.init(); UI.bind(canvas);
    S.update(0.001);
    V3.bus.on('gesture', () => V3.audio.init());
    addEventListener('visibilitychange', () => { if (document.hidden) save(); });
    addEventListener('pagehide', save);
    requestAnimationFrame(frame);
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot); else boot();
  if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => (G.state === 'play' ? G.snapshot() : {}));
})();
