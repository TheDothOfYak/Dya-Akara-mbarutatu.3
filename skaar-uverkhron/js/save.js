/* ============================================================
   SKAAR UVERKHRON — js/save.js
   Saving and loading: in this browser, and on your Flake Games
   account (dya_config rows 'su:<account id>:<slot>').
   ============================================================ */
(function (root) {
  'use strict';
  const SU = root.SU, S = SU.state;
  const SV = SU.save = {};
  const LKEY = 'su_save_';

  /* what the save screen shows without opening the save: the map, the players, the day */
  function info(st) {
    const towns = pi => Object.values(st.objects).filter(o => o.type === 'town' && o.owner === pi).length;
    const heroes = pi => Object.values(st.heroes).filter(h => h.owner === pi && !h.dead).length;
    let thumb = null;
    try { if (typeof document !== 'undefined' && SU.mapView && SU.mapView.thumb) { const me = st.players.findIndex(p => p.kind === 'human'); const li = me >= 0 && st.players[me].startLayer != null ? st.players[me].startLayer : 0; thumb = SU.mapView.thumb(st, li, 144, 108).toDataURL('image/jpeg', 0.72); } } catch (e) { thumb = null; }
    return { map: st.setup.mapName || (st.mapId ? st.setup.name : 'A random map'), size: st.setup.size, difficulty: st.setup.difficulty || 'captain', win: (st.setup.win && st.setup.win.kind) || 'conquer', seed: st.seed, current: st.current,
      players: st.players.map((p, i) => ({ name: p.name, kind: p.kind, color: p.color, alive: p.alive, towns: towns(i), heroes: heroes(i), ai: p.ai })), thumb };
  }
  SV.info = info;
  function meta(st, name) { return { v: S.VERSION, name: name || st.setup.name || 'A game', day: st.day, players: st.players.map(p => ({ name: p.name, kind: p.kind, color: p.color })), at: Date.now(), online: st.online ? st.online.code : null, info: info(st) }; }
  SV.account = () => (root.FLAKE && root.FLAKE.session && root.FLAKE.session()) || null;
  SV.cloudOk = () => !!(root.FLAKE && root.FLAKE.configured && root.FLAKE.configured() && SV.account());

  SV.saveLocal = function (st, slot, name) {
    const data = S.serialize(st);
    const rec = Object.assign(meta(st, name), { data });
    try { localStorage.setItem(LKEY + slot, JSON.stringify(rec)); return true; }
    catch (e) { /* full: drop the oldest numbered save and try once more */
      try { const list = SV.listLocal().filter(s => s.slot !== 'auto').sort((a, b) => a.at - b.at); if (list[0]) localStorage.removeItem(LKEY + list[0].slot); localStorage.setItem(LKEY + slot, JSON.stringify(rec)); return true; } catch (e2) { return false; }
    }
  };
  SV.listLocal = function () {
    const out = [];
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k || !k.startsWith(LKEY)) continue; try { const r = JSON.parse(localStorage.getItem(k)); out.push({ slot: k.slice(LKEY.length), name: r.name, day: r.day, at: r.at, players: r.players, info: r.info || null, where: 'local', v: r.v || 1 }); } catch (e) {} } } catch (e) {}
    return out.sort((a, b) => b.at - a.at);
  };
  SV.loadLocal = function (slot) { try { const r = JSON.parse(localStorage.getItem(LKEY + slot)); return r ? S.deserialize(r.data) : null; } catch (e) { console.error(e); return null; } };
  /* saves from before the land was shared into territories are gone: they cannot be played on */
  SV.dropOld = function () { SV.listLocal().filter(s => (s.v || 1) < S.VERSION).forEach(s => SV.deleteLocal(s.slot)); };
  SV.deleteLocal = function (slot) { try { localStorage.removeItem(LKEY + slot); } catch (e) {} };

  /* ---------- on the account ---------- */
  SV.saveCloud = async function (st, slot, name) {
    if (!SV.cloudOk()) return false;
    const acc = SV.account();
    const rec = Object.assign(meta(st, name), { data: S.serialize(st) });
    await root.FLAKE.rest('POST', 'dya_config?on_conflict=key', { key: 'su:' + acc.id + ':' + slot, value: rec, updated_at: new Date().toISOString() }, 'resolution=merge-duplicates');
    return true;
  };
  SV.listCloud = async function () {
    if (!SV.cloudOk()) return [];
    const acc = SV.account();
    const rows = await root.FLAKE.rest('GET', 'dya_config?select=key,updated_at,name:value->>name,day:value->>day,info:value->info&key=like.' + encodeURIComponent('su:' + acc.id + ':*'));
    return (rows || []).map(r => ({ slot: r.key.split(':').slice(2).join(':'), name: r.name, day: +r.day, at: Date.parse(r.updated_at), info: r.info || null, where: 'cloud' })).sort((a, b) => b.at - a.at);
  };
  SV.loadCloud = async function (slot) {
    const acc = SV.account();
    const rows = await root.FLAKE.rest('GET', 'dya_config?select=value&key=eq.' + encodeURIComponent('su:' + acc.id + ':' + slot));
    return rows && rows[0] ? S.deserialize(rows[0].value.data) : null;
  };
  SV.deleteCloud = async function (slot) { const acc = SV.account(); await root.FLAKE.rest('DELETE', 'dya_config?key=eq.' + encodeURIComponent('su:' + acc.id + ':' + slot)); };

  /* the autosave at the start of each human turn: here, and on the account */
  SV.autosave = function (st) {
    if (st.online) return;   /* online games live in their room */
    SV.saveLocal(st, 'auto', (st.setup.name || 'A game') + ' (autosave)');
    if (SV.cloudOk()) SV.saveCloud(st, 'auto', (st.setup.name || 'A game') + ' (autosave)').catch(() => {});
  };
})(typeof window !== 'undefined' ? window : globalThis);
