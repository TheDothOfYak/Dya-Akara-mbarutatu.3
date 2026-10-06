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
  },
  realistic: {
    label: 'Realistic', blurb: 'Pretty brutal. Every swing costs breath, nothing heals on its own, death drops your shards where you fell, and the wilds come back when you rest.',
    enemyHp: 1.5, enemyDmg: 1.9, playerDmg: 1.0, bossHp: 1.6, windup: 0.8, aggro: 1.25,
    regen: 0, flasks: 3, flaskHeal: 45, flowerHeal: 20, flowerRegrow: 0,
    stamina: { attack: 15, heavy: 24, dodge: 26, sprint: 16, jump: 10 },
    dropShards: true, poisonDps: 4.5, respawnOnDeath: true, heatGain: 0.85,
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
/* each signed-in account keeps its own local copy; guests share one */
export const saveKey = accountId => accountId ? BASE + ':' + accountId : BASE;

export function freshSave(difficulty) {
  return {
    v: 2, difficulty, region: 'xilia', shards: 0, ups: {}, lantern: null, lit: {},
    flags: {}, cores: {}, codex: {}, lost: null, time: 0, deaths: 0, kills: 0, cleared: {}, savedAt: 0,
    runId: Math.random().toString(36).slice(2, 10),
  };
}

export function loadSave(key = BASE) {
  try { const s = JSON.parse(localStorage.getItem(key) || 'null'); return s && s.v === 2 ? s : null; } catch (e) { return null; }
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
