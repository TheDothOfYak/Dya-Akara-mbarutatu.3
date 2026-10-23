/* ============================================================
   Difficulty, saving, and the Hurst upgrades bought with
   zikhron shards at a Nur Lantern.
   ============================================================ */

/* Easy: a story walk. Realistic: you will die, often — rest at the
   lanterns, learn the creatures, and come back for it another day. */
export const DIFFICULTY = {
  easy: {
    label: 'Easy', blurb: 'For the story. Forgiving foes, healing on the move, keep your shards when you fall.',
    enemyHp: 0.8, enemyDmg: 0.55, playerDmg: 1.25, bossHp: 0.8, windup: 1.25, aggro: 0.9,
    regen: 5, flasks: 5, flaskHeal: 60, flowerHeal: 40, flowerRegrow: 40,
    stamina: { attack: 0, heavy: 0, dodge: 18, sprint: 0, jump: 0 },
    dropShards: false, poisonDps: 2, respawnOnDeath: false, heatGain: 1.3,
    // how the wilds fight (enemies.js): how many of a pack come at you at once, how often the quick ones
    // sidestep a swing, and how sharp their eyes are
    packAttackers: 1, dodge: 0.5, sight: 0.85,
  },
  realistic: {
    label: 'Realistic', blurb: 'Pretty brutal. Every swing costs breath, nothing heals on its own, death drops your shards where you fell, and the wilds come back when you rest.',
    enemyHp: 1.5, enemyDmg: 1.9, playerDmg: 1.0, bossHp: 1.6, windup: 0.8, aggro: 1.25,
    regen: 0, flasks: 3, flaskHeal: 45, flowerHeal: 20, flowerRegrow: 0,
    stamina: { attack: 15, heavy: 24, dodge: 26, sprint: 16, jump: 10 },
    dropShards: true, poisonDps: 4.5, respawnOnDeath: true, heatGain: 0.85,
    packAttackers: 2, dodge: 1, sight: 1.15,
  },
};

/* what a Nur Lantern can strengthen — cost rises with each rank */
export const UPGRADES = [
  { id: 'vigor', name: 'Vigor', desc: '+15 maximum health', max: 8, base: 30, step: 22 },
  { id: 'edge', name: 'Edge of the axe', desc: '+12% axe damage', max: 8, base: 35, step: 25 },
  { id: 'breath', name: 'Breath', desc: '+18 stamina, quicker recovery', max: 6, base: 30, step: 22 },
  { id: 'duat', name: 'Duat mastery', desc: 'Duat Strike recovers faster and cuts deeper', max: 5, base: 45, step: 35 },
  { id: 'film', name: 'Albali film', desc: '+1 vial of healing film', max: 3, base: 60, step: 60 },
  { id: 'tukang', name: 'Tukang', desc: 'Heat builds faster and the Flare burns hotter', max: 4, base: 40, step: 35 },
];
export const upgradeCost = (u, rank) => u.base + u.step * rank;

const BASE = 'torcain-save-v2';
/* the save's shape. Bumping it no longer resets anyone: add a step to
   MIGRATIONS that carries a save from the old version to the new one,
   so a run that's twenty hours in survives every update. */
export const SAVE_V = 5;
/* the oldest save this build still reads (v3: the Beuhk prologue — runs from
   before it were reset, and stay that way) */
export const MIN_SAVE_V = 3;
/* MIGRATIONS[k] upgrades a save in place from version k to k + 1 */
const MIGRATIONS = {
  /* v4: Chapter I's two summers. A run already past them (into the Megla Aagac or
     beyond) skips them; a run still in Chapter I picks them up from the start. */
  3: s => { const f = s.flags = s.flags || {}; if (f.megla || f.ch2) f.ap = 9; },
  /* v5: Venkin and the amulet research slot in between the two summers' steps, so they renumber
     (a run already past a new step simply goes on without it) */
  4: s => { const f = s.flags = s.flags || {}; if (f.ap != null) f.ap = [0, 2, 4, 5, 7, 8, 10, 11, 13, 14][f.ap] ?? f.ap; },
};
/* a save brought up to this build's version, or null if it can't be read */
export function migrateSave(s) {
  if (!s || !s.v || s.v < MIN_SAVE_V || s.v > SAVE_V) return null;
  while (s.v < SAVE_V) { const step = MIGRATIONS[s.v]; if (!step) return null; step(s); s.v++; }
  return s;
}
/* each signed-in account keeps its own local copy; guests share one */
export const saveKey = accountId => accountId ? BASE + ':' + accountId : BASE;

export function freshSave(difficulty) {
  return {
    v: SAVE_V, difficulty, region: 'xilia', shards: 0, ups: {}, lantern: null, lit: {},
    flags: {}, cores: {}, chTime: {}, codex: {}, lost: null, time: 0, deaths: 0, kills: 0, cleared: {}, savedAt: 0,
    runId: Math.random().toString(36).slice(2, 10),
  };
}

export function loadSave(key = BASE) {
  try { return migrateSave(JSON.parse(localStorage.getItem(key) || 'null')); } catch (e) { return null; }
}
export function isOldSave(key = BASE) {
  try { const s = JSON.parse(localStorage.getItem(key) || 'null'); return !!(s && s.v && s.v < MIN_SAVE_V); } catch (e) { return false; }
}
export function writeSave(s, key = BASE) {
  s.savedAt = Date.now();
  try { localStorage.setItem(key, JSON.stringify(s)); return true; } catch (e) { return false; }
}
export function clearSave(key = BASE) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } }

/* two copies of the same run: keep the one further along (a stale device can't
   roll you back). Two different runs: the one saved most recently is the run
   you chose to keep playing. */
export function newer(a, b) {
  if (!a) return b; if (!b) return a;
  if (a.runId && a.runId === b.runId && Math.abs((a.time || 0) - (b.time || 0)) > 5) return (a.time || 0) > (b.time || 0) ? a : b;
  return (a.savedAt || 0) >= (b.savedAt || 0) ? a : b;
}

export function fmtTime(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

/* ---------------- the hour mark ----------------
   Young Tanoc's story, Velki to the final Sniller battle, is meant to run
   about 27 hours (see rpg/ROADMAP.md). Every chapter keeps its own clock
   in save.chTime so a playtest shows which parts run short or long. */
export const CHAPTERS = [
  ['velki', 'The Last Skyfall'],
  ['road', 'The Road North'],
  ['ch1', 'I · The Carpenter’s Apprentice'],
  ['ch2', 'II · The Megla Aagac'],
  ['token', 'The First Token'],
  ['after2', 'After the Megla Aagac'],
  ['torcain', 'Torcain’s Run (years later)'],
];
/* which chapter a run is in, read from its story flags */
export function chapterOf(f) {
  if (!f.young) return 'torcain';
  switch (f.pro) {
    case 'velki': return 'velki';
    case 'road': return 'road';
    case 'beuhk': return 'road';                    // days 5 and 6 of the road happen in Beuhk
    case 'megla': return 'ch2';
    case 'token': return 'token';
    default: return f.ch2 ? 'after2' : 'ch1';       // 'done': the crest is behind him, Chapter I (or after II)
  }
}
export function tickTime(s, dt) {
  s.time += dt;
  const ch = chapterOf(s.flags || {});
  s.chTime = s.chTime || {};
  s.chTime[ch] = (s.chTime[ch] || 0) + dt;
}
