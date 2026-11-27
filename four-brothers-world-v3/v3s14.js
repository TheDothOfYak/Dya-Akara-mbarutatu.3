// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 14: characters and worlds, like Terraria.
//  * Play opens a character list (as many as you like; make, pick or delete), then a world list (make one with a name,
//    pick or delete). Any character can play in any world. A world is a whole save: every planet, its bosses, its
//    building, its Rock World layout. A character always arrives on its own home planet; beat it to travel on, as before.
//  * Saves are kept apart by key: the hero save (`save_rock`, backups) gets "@c<id>", world things (edits, explored map,
//    bosses, the Rock World seed, the Duat, chests, dens, clams, scribbles) get "@w<id>". Lists: `v3_chars`, `v3_worlds`;
//    current picks: `v3_curchar`, `v3_curworld`. The old single save and world become the first character and world.
(function (RW) {
  'use strict';
  const S = RW.store, P = RW.player, U = RW.ui, N = RW.net, A = RW.art;
  if (!S || S.__v3slots) return;
  const raw = { get: S.get.bind(S), set: S.set.bind(S) };
  const WORLDK = /^(edits_|explored_|bossdead_|chests_|mother_|clam_|cl_scrib_)|^(v2_rockseed|duatunlock)$/;
  const CHARK = /^(save_rock$|save_backup_)/;
  let curW = raw.get('v3_curworld', null), curC = raw.get('v3_curchar', null);
  const map = (k) => (typeof k !== 'string' ? k : WORLDK.test(k) ? k + '@w' + (curW || 'none') : CHARK.test(k) ? k + '@c' + (curC || 'none') : k);
  const rm = (k) => { try { localStorage.removeItem('rw3_' + k); } catch (e) { /* fine */ } };
  const allKeys = () => { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('rw3_') === 0) out.push(k.slice(4)); } } catch (e) { /* fine */ } return out; };
  const uid = (p) => p + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);

  // ---- the old single save becomes character 1 and world 1 ----
  if (!raw.get('v3_chars', null)) {
    const chars = []; const old = raw.get('save_rock', null);
    if (old && old.look) { const id = 'c1'; raw.set('save_rock@c' + id, old); chars.push({ id, name: old.name || 'Hero', species: old.species || 'rock', look: old.look, at: old.savedAt || Date.now() }); curC = id; }
    raw.set('v3_chars', chars); raw.set('v3_curchar', curC);
  }
  if (!raw.get('v3_worlds', null)) {
    const worlds = []; const legacy = allKeys().filter((k) => WORLDK.test(k) && k.indexOf('@') < 0);
    if (legacy.length) { const id = 'w1'; legacy.forEach((k) => raw.set(k + '@w' + id, raw.get(k, null))); worlds.push({ id, name: 'My First World', at: Date.now() }); curW = id; }
    raw.set('v3_worlds', worlds); raw.set('v3_curworld', curW);
  }
  S.get = (k, d) => raw.get(map(k), d);
  S.set = (k, v) => raw.set(map(k), v);
  S.__v3slots = true;
  const chars = () => raw.get('v3_chars', []) || [], worlds = () => raw.get('v3_worlds', []) || [];
  const setChars = (l) => raw.set('v3_chars', l), setWorlds = (l) => raw.set('v3_worlds', l);

  // world-level state read once at load: read it again for the world in use
  function reloadWorldState() {
    const DS = RW.duatState; if (DS) { Object.keys(DS).forEach((k) => delete DS[k]); Object.assign(DS, S.get('duatunlock', {}) || {}); }
    if (RW.state && RW.state.bosses) Object.keys(RW.WORLDS).forEach((id) => { RW.state.bosses[id] = !!S.get((N && N.key ? N.key('bossdead_' + id) : 'bossdead_' + id), false); });
  }
  try { reloadWorldState(); } catch (e) { /* the game state is not made yet; play() reads it again */ }
  // the hero save keeps the character list's name and look up to date
  if (N && N.save) { const bs = N.save; N.save = function (data) { if (curC && data) { const l = chars(), c = l.find((q) => q.id === curC); if (c) { c.name = data.name; c.species = data.species; c.look = data.look; c.at = Date.now(); setChars(l); } } return bs.apply(this, arguments); }; }
  if (N && N.loadSave) N.loadSave = async function () { return curC ? S.get('save_rock', null) : null; };

  // ---------------- the screens ----------------
  const css = document.createElement('style');
  css.textContent = `#v3sel { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; background: rgba(8,6,12,.82); }
  #v3sel.hide { display: none; } #v3sel .box { width: min(720px, 94vw); max-height: 88vh; overflow: auto; background: #16131f; border: 2px solid #4a4060; padding: 18px 20px; font-family: inherit; color: #e8e0d0; }
  #v3sel h2 { margin: 0 0 4px; font-size: 26px; } #v3sel .sub { opacity: .7; margin-bottom: 12px; }
  #v3sel .v3row { display: flex; align-items: center; gap: 12px; padding: 8px; margin: 6px 0; background: #1e1a2a; border: 2px solid #2e2840; cursor: pointer; }
  #v3sel .v3row:hover, #v3sel .v3row.on { border-color: #8a7ac8; } #v3sel .v3row canvas { width: 48px; height: 60px; image-rendering: pixelated; background: #120f18; }
  #v3sel .v3row .nm { font-size: 20px; } #v3sel .v3row .meta { opacity: .65; font-size: 15px; } #v3sel .v3row .grow { flex: 1; }
  #v3sel .v3bar { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; } #v3sel input { font: inherit; font-size: 18px; padding: 6px 8px; background: #0e0c14; color: #e8e0d0; border: 2px solid #4a4060; }
  #v3sel .del { margin-left: auto; } #v3sel .empty { opacity: .6; padding: 10px; }`;
  document.head.appendChild(css);
  const box = document.createElement('div'); box.id = 'v3sel'; box.className = 'hide'; document.body.appendChild(box);
  const el = (t, cls, txt) => { const e = document.createElement(t); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const btn = (txt, cls, fn) => { const b = el('button', 'btn ' + (cls || ''), txt); b.type = 'button'; b.onclick = (e) => { e.stopPropagation(); RW.audio && RW.audio.sfx('ui'); fn(); }; return b; };
  const SPN = { rock: 'Rock', fuzzy: 'Fuzzy', acorn: 'Acorn', ghost: 'Ghost' };
  const close = () => box.classList.add('hide');
  function portrait(c) { const cv = el('canvas'); cv.width = 24; cv.height = 30; try { const fr = A.dressed(c.species || 'rock', c.look)[0][0], g = cv.getContext('2d'); g.imageSmoothingEnabled = false; const s = Math.min(24 / fr.width, 30 / fr.height); g.drawImage(fr, (24 - fr.width * s) / 2, 30 - fr.height * s, fr.width * s, fr.height * s); } catch (e) { /* no picture */ } return cv; }

  function charScreen() {
    box.innerHTML = ''; box.classList.remove('hide'); const b = el('div', 'box'); box.append(b);
    b.append(el('h2', null, 'Choose a character'), el('div', 'sub', 'Any character can play in any world. Each one arrives on its own home planet.'));
    const l = chars().sort((a, c) => (c.at || 0) - (a.at || 0));
    if (!l.length) b.append(el('div', 'empty', 'No characters yet. Make one!'));
    l.forEach((c) => {
      const r = el('div', 'v3row' + (c.id === curC ? ' on' : '')); r.append(portrait(c));
      const t = el('div', 'v3grow'); t.append(el('div', 'nm', c.name || 'Hero'), el('div', 'meta', SPN[c.species] || c.species)); r.append(t);
      r.append(btn('Delete', 'small del', () => { if (!confirm('Delete ' + (c.name || 'this character') + ' for good?')) return; setChars(chars().filter((q) => q.id !== c.id)); allKeys().filter((k) => k.endsWith('@c' + c.id)).forEach(rm); if (curC === c.id) { curC = null; raw.set('v3_curchar', null); } charScreen(); }));
      r.onclick = () => pickChar(c.id);
      b.append(r);
    });
    const bar = el('div', 'v3bar'); bar.append(btn('Create a new character', 'primary', newChar), btn('Back', '', () => { close(); })); b.append(bar);
  }
  async function pickChar(id) {
    curC = id; raw.set('v3_curchar', id);
    const s = S.get('save_rock', null); if (s && s.look) { RW.game.load(s); RW.game.hasSave = true; }
    worldScreen();
  }
  function newChar() {
    close(); creating = true;
    curC = uid('c'); raw.set('v3_curchar', curC);
    U.showCreator(true);
  }
  let creating = false, chosen = false;
  // a freshly made character goes on to the world list instead of straight into play
  const G0 = () => RW.game;
  (function hook() {
    const G = G0(); if (!G || !G.start || !G.newCharacter || !U.showTitle) { setTimeout(hook, 30); return; }
    const baseStart = G.start;
    G.start = async function () {
      if (!chosen && !window.__v3direct) {
        if (creating) { creating = false; const l = chars(); if (!l.find((q) => q.id === curC)) { l.push({ id: curC, name: P.name, species: P.species, look: P.look, at: Date.now() }); setChars(l); } RW.store.set('save_rock', Object.assign(G.snapshot(), { savedAt: Date.now() })); }
        document.getElementById('creator') && document.getElementById('creator').classList.add('hidden-ui');
        worldScreen(); return;
      }
      chosen = false; return baseStart.apply(this, arguments);
    };
    const baseTitle = U.showTitle;
    U.showTitle = function () {
      const r = baseTitle.apply(this, arguments);
      const pb = document.getElementById('b-play'), nb = document.getElementById('b-new');
      if (pb) { pb.textContent = 'Play'; pb.onclick = () => { RW.audio && RW.audio.start && RW.audio.start(); charScreen(); }; }
      if (nb) nb.style.display = 'none';
      return r;
    };
    if (document.getElementById('title') && !document.getElementById('title').classList.contains('hidden-ui')) U.showTitle(G.hasSave);
    // the old "new hero = new world" rule is gone: you pick a world now
    const bn = G.newCharacter; G.newCharacter = function () { const keep = RW.store.get('v2_rockseed', 0); const r = bn.apply(this, arguments); if (keep) RW.store.set('v2_rockseed', keep); RW.v3reinit = false; return r; };
  })();

  const NAME_A = ['Deep', 'Old', 'Hollow', 'Glimmer', 'Ember', 'Moss', 'Stone', 'Silver', 'Quiet', 'Lantern', 'Gem', 'Echo'];
  const NAME_B = ['reach', 'hold', 'fall', 'vale', 'spire', 'haven', 'deep', 'light', 'stead', 'mere', 'crown', 'wood'];
  function worldScreen() {
    box.innerHTML = ''; box.classList.remove('hide'); const b = el('div', 'box'); box.append(b);
    const c = chars().find((q) => q.id === curC);
    b.append(el('h2', null, 'Choose a world'), el('div', 'sub', (c ? (c.name || 'Your hero') + ' will start on the ' + (SPN[c.species] || '') + ' home planet. ' : '') + 'A world holds every planet, its bosses and everything built there.'));
    const l = worlds().sort((a, q) => (q.at || 0) - (a.at || 0));
    if (!l.length) b.append(el('div', 'empty', 'No worlds yet. Make one below.'));
    l.forEach((w) => {
      const r = el('div', 'v3row' + (w.id === curW ? ' on' : '')); const t = el('div', 'v3grow');
      const beaten = Object.keys(RW.WORLDS).filter((id) => raw.get('bossdead_' + id + '@w' + w.id, false)).map((id) => RW.WORLDS[id].name || id);
      t.append(el('div', 'nm', w.name), el('div', 'meta', beaten.length ? 'Beaten: ' + beaten.join(', ') : 'No bosses beaten yet')); r.append(t);
      r.append(btn('Delete', 'small del', () => { if (!confirm('Delete the world "' + w.name + '" and everything built in it?')) return; setWorlds(worlds().filter((q) => q.id !== w.id)); allKeys().filter((k) => k.endsWith('@w' + w.id)).forEach(rm); if (curW === w.id) { curW = null; raw.set('v3_curworld', null); } worldScreen(); }));
      r.onclick = () => play(w.id);
      b.append(r);
    });
    const mk = el('div', 'v3bar'); const inp = el('input'); inp.placeholder = 'New world name'; inp.maxLength = 28; inp.value = RW.pick(NAME_A) + RW.pick(NAME_B);
    mk.append(inp, btn('Random name', 'small', () => { inp.value = RW.pick(NAME_A) + RW.pick(NAME_B); }), btn('Create world', 'primary', () => {
      const id = uid('w'), name = (inp.value || '').trim().slice(0, 28) || RW.pick(NAME_A) + RW.pick(NAME_B);
      const l2 = worlds(); l2.push({ id, name, at: Date.now() }); setWorlds(l2);
      raw.set('v2_rockseed@w' + id, 1 + Math.floor(Math.random() * 2147483000));
      play(id);
    }));
    b.append(mk);
    const bar = el('div', 'v3bar'); bar.append(btn('Back to characters', '', charScreen)); b.append(bar);
  }
  async function play(wid) {
    if (!curC || !chars().find((q) => q.id === curC)) { charScreen(); return; }
    const G = G0(); close();
    // positions are kept per world
    const prevW = curW; if (P.pos) { P.v3posBy = P.v3posBy || {}; if (prevW) P.v3posBy[prevW] = P.pos; }
    curW = wid; raw.set('v3_curworld', wid); const l = worlds(), w = l.find((q) => q.id === wid); if (w) { w.at = Date.now(); setWorlds(l); }
    try { reloadWorldState(); } catch (e) { /* the game state is not made yet; play() reads it again */ }
    const s = S.get('save_rock', null); if (s && s.look) G.load(s);
    P.pos = (P.v3posBy && P.v3posBy[wid]) || (s && s.v3posBy && s.v3posBy[wid]) || {};
    // a character always arrives on its home planet in a world it hasn't been to; otherwise where it left off
    const been = s && s.v3been && s.v3been[wid];
    P.world = been && P.world && RW.WORLDS[P.world] && (RW.state.bosses[P.startWorld] || P.world === P.startWorld) ? P.world : P.startWorld || (RW.HEROES[P.species] || {}).start || 'fuzzy';
    P.v3been = Object.assign({}, (s && s.v3been) || {}, { [wid]: 1 });
    await G.enterWorld(P.world);
    chosen = true; await G.start();
    U.banner && U.banner(w ? w.name : 'World', (P.name || 'Your hero') + ' arrives.');
  }
  // remember per-world positions and visits in the hero save
  const G1 = () => RW.game;
  (function hookSnap() {
    const G = G1(); if (!G || !G.snapshot || !G.load) { setTimeout(hookSnap, 30); return; }
    const bSnap = G.snapshot; G.snapshot = function () { const s = bSnap.apply(this, arguments); P.v3posBy = P.v3posBy || {}; if (curW) P.v3posBy[curW] = s.pos; s.v3posBy = P.v3posBy; s.v3been = P.v3been || {}; return s; };
    const bLoad = G.load; G.load = function (s) { const r = bLoad.apply(this, arguments); P.v3posBy = (s && s.v3posBy) || {}; P.v3been = (s && s.v3been) || {}; return r; };
  })();
  RW.v3slots = { charScreen, worldScreen, get char() { return curC; }, get world() { return curW; } };
})(window.RW);
