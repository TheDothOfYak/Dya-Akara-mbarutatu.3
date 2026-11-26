// V2: town portals. Every world has one beside where you arrive. Use it (R or right-click) to see where the other
// players in your room are, in any world, and step out right next to one of them.
(function (RW) {
  const A = RW.art, E = RW.ent, U = RW.ui, P = RW.player, N = RW.net, TS = RW.TILE;

  // ---- the portal block ----
  if (RW.T.townportal == null) {
    const id = RW.TILES.length;
    RW.TILES.push({ id, key: 'townportal', name: 'Town Portal', decor: 'townportal', use: 'townportal', hard: 99, light: [0.55, 0.4, 0.95], lockedMsg: 'A town portal. Press R beside it to meet up with the other players.' });
    RW.T.townportal = id;
  }
  const TP = RW.T.townportal;
  const baseDecor = A.drawDecor;
  A.drawDecor = function (g, t, sx, sy, time, stage, x, y) {
    if (t.decor !== 'townportal') return baseDecor.apply(this, arguments);
    // a stone arch two blocks tall, standing on this block, with a swirl of light inside
    const top = sy - 18;
    g.fillStyle = '#4a4652'; g.fillRect(sx - 2, top + 4, 4, 30); g.fillRect(sx + 14, top + 4, 4, 30);
    g.fillRect(sx - 1, top + 1, 18, 4); g.fillRect(sx + 2, top - 1, 12, 3);
    g.fillStyle = '#6a6672'; g.fillRect(sx - 2, top + 4, 1, 30); g.fillRect(sx + 14, top + 4, 1, 30); g.fillRect(sx + 2, top - 1, 12, 1);
    g.fillStyle = '#2a1a4a'; g.fillRect(sx + 2, top + 5, 12, 29);
    for (let k = 0; k < 10; k++) {
      const a = time * 2.2 + k * 0.63, r = 2 + (k % 5) * 1.1;
      g.fillStyle = k % 3 ? '#9b6cff' : k % 2 ? '#7fe3ff' : '#ffffff';
      g.fillRect(Math.round(sx + 8 + Math.cos(a) * r - 1), Math.round(top + 19 + Math.sin(a) * r * 2.2), 2, 2);
    }
    g.fillStyle = '#f2c94c'; g.fillRect(sx + 7, top + 1, 2, 2);
    if (Math.random() < 0.03) RW.fx.spawn({ x: x * TS + 8 + RW.rand(-5, 5), y: y * TS - 4, vy: -25, life: 0.9, color: RW.pick(['#c8a6ff', '#7fe3ff']), add: true, kind: 'glow' });
  };

  // ---- one in every world, a few steps from where you arrive ----
  const placePortal = (def, gen) => {
    const Wd = gen.W, Hd = gen.H, fg = gen.fg, T = RW.T, sp = def.spawn; if (!Wd || !fg || !sp) return;
    const solid = (x, y) => x < 0 || y < 0 || x >= Wd || y >= Hd || !!RW.TILES[fg[y * Wd + x]].solid;
    const free = (x, y) => !solid(x, y) && fg[y * Wd + x] !== T.water && fg[y * Wd + x] !== T.lava && fg[y * Wd + x] !== T.legendchest;
    for (const dx of [-4, -5, -6, -3, -8, 4, 5, -10, 10]) {
      const x = sp.x + dx; let y = sp.y - 3;
      while (y < Hd - 1 && !solid(x, y + 1)) y++;
      if (Math.abs(y - sp.y) > 6 || !free(x, y) || !free(x, y - 1) || !free(x, y - 2)) continue;
      fg[y * Wd + x] = TP; gen.meta = gen.meta || {}; gen.meta.portal = { x, y }; return;
    }
  };
  Object.values(RW.WORLDS).forEach((def) => {
    if (!def || !def.generate || def._v2portal) return; def._v2portal = true;
    const base = def.generate;
    def.generate = function () { const gen = base.apply(this, arguments); try { placePortal(def, gen); } catch (e) { console.warn('town portal', e); } return gen; };
  });

  // ---- who is in the room, and where ----
  const friends = () => {
    const out = []; if (!N || !N.peers) return out;
    N.peers.forEach((p, key) => { const t = p.target; if (!t || t.pid === N.pid) return; out.push({ key, name: String(t.n || 'A friend').slice(0, 24), sp: t.sp, w: t.w, x: t.x, y: t.y, dead: !!t.dead }); });
    return out;
  };
  const heroName = (sp) => ({ fuzzy: 'Fuzzy', rock: 'Rock', acorn: 'Acorn', ghost: 'Ghost' }[sp] || '');
  const worldName = (w) => (RW.WORLDS[w] ? RW.WORLDS[w].name : 'somewhere');
  const clearAt = (x, y) => !RW.world.solid(Math.floor((x + 6) / TS), Math.floor((y + 4) / TS)) && !RW.world.solid(Math.floor((x + 6) / TS), Math.floor((y + 24) / TS));

  async function meet(key) {
    const p = N.peers.get(key); if (!p || !p.target) { U.toast('They left the room.'); return; }
    const name = String(p.target.n || 'your friend');
    if (p.target.w !== RW.world.def.id) await RW.game.travel(p.target.w);
    const t = (N.peers.get(key) || {}).target || p.target; // where they are now
    for (const dx of [18, -18, 32, -32, 0]) { const x = t.x + dx, y = t.y; if (clearAt(x, y)) { P.x = x; P.y = y; break; } }
    P.vx = P.vy = 0; P.invulnT = Math.max(P.invulnT || 0, 1.5); P.face = t.x > P.x ? 1 : -1;
    RW.cam.x = P.x - RW.view.w / 2; RW.cam.y = P.y - RW.view.h / 2;
    if (E.buddy) { E.buddy.x = P.x - 16; E.buddy.y = P.y; }
    if (E.pet) { E.pet.x = P.x + 14; E.pet.y = P.y; }
    RW.audio.sfx('rift'); RW.fx.flash && RW.fx.flash('#c8a6ff', 0.5); RW.fx.ring(P.x + P.w / 2, P.y + P.h / 2, '#c8a6ff', 50, 0.6, 2);
    U.toast('You step out of the portal next to ' + name + '.'); RW.game.saveSoon();
  }

  function openPortal() {
    U.openModal('pick');
    document.getElementById('pick-label').textContent = 'Town Portal';
    document.getElementById('pick-title').textContent = 'Meet up with another player';
    const box = document.getElementById('picklist'); box.innerHTML = '';
    const list = friends();
    if (!list.length) {
      const d = document.createElement('div'); d.className = 'label';
      d.textContent = 'Nobody else is in your room right now. Host a game or join one with a room code from the title screen, then come back to any town portal to jump to your friends.';
      box.append(d); RW.audio.sfx('deny'); return;
    }
    list.forEach((f) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small primary';
      b.textContent = f.name + (heroName(f.sp) ? ' (' + heroName(f.sp) + ')' : '') + ': ' + (f.w === RW.world.def.id ? 'in this world' : 'in ' + worldName(f.w)) + (f.dead ? ', knocked out' : '');
      b.onclick = () => { U.closeModal(); meet(f.key); };
      box.append(b);
    });
    RW.audio.sfx('rift');
  }
  E.useHandlers = E.useHandlers || {};
  E.useHandlers.townportal = () => openPortal();
  const nearPortal = () => { const c = P.center(), tx = Math.floor(c.x / TS), ty = Math.floor(c.y / TS); for (let y = ty - 2; y <= ty + 2; y++) for (let x = tx - 2; x <= tx + 2; x++) if (RW.world.get(x, y) === TP) return true; return false; };
  const baseInteract = P.interact;
  P.interact = function () { if (nearPortal()) { openPortal(); return; } return baseInteract.apply(this, arguments); };
  const baseMine = P.mineTile;
  P.mineTile = function (tx, ty) { if (RW.world.get(tx, ty) === TP) { P.mine = null; return; } return baseMine.apply(this, arguments); };

  // the first time you're near one in each world, say what it's for
  const told = new Set(); let tT = 0;
  const baseUpd = E.updateEnemies;
  E.updateEnemies = function (dt) {
    const r = baseUpd.apply(this, arguments);
    if ((tT -= dt) <= 0) {
      tT = 1; const m = RW.world.meta && RW.world.meta.portal, w = RW.world.def && RW.world.def.id;
      if (m && w && !told.has(w) && RW.dist(P.x, P.y, m.x * TS, m.y * TS) < 6 * TS) { told.add(w); U.toast('A town portal. Press R beside it to jump to the other players in your room, in any world.'); }
    }
    return r;
  };
})(window.RW);
