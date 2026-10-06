/* ============================================================
   Growing stronger: experience and levels, a perk tree in three
   branches, and the spells Torcain learns along the way.
   ============================================================ */

export const xpForLevel = lvl => Math.round(90 * Math.pow(lvl, 1.55));   // xp needed to go from lvl to lvl+1

export const PERKS = [
  /* the Axe */
  { id: 'heavy', tree: 'Axe', name: 'Heavy Hands', desc: '+15% axe damage.', req: null },
  { id: 'iron', tree: 'Axe', name: 'Iron Breath', desc: 'Swings and rolls cost 30% less stamina.', req: 'heavy' },
  { id: 'whirl', tree: 'Axe', name: 'Whirlwind', desc: 'The third strike of a combo hits all around you.', req: 'heavy' },
  { id: 'exec', tree: 'Axe', name: 'Executioner', desc: '+50% damage to stunned or paralysed foes.', req: 'whirl' },
  /* the Duat */
  { id: 'seam', tree: 'Duat', name: 'Quick Seam', desc: 'Spells recover 20% faster.', req: null },
  { id: 'deep', tree: 'Duat', name: 'Deep Seam', desc: 'Duat Strike hits 30% harder.', req: 'seam' },
  { id: 'echo', tree: 'Duat', name: 'Echo', desc: 'Duat Strike leaps to a second foe nearby.', req: 'deep' },
  { id: 'bond', tree: 'Duat', name: 'Kalo Bond', desc: 'Phorus’s tide-bolts hit 50% harder and come faster.', req: 'seam' },
  /* Survival */
  { id: 'forager', tree: 'Survival', name: 'Forager', desc: 'Gather twice as many materials.', req: null },
  { id: 'shell', tree: 'Survival', name: 'Thick Shell', desc: 'Take 10% less damage.', req: 'forager' },
  { id: 'wind', tree: 'Survival', name: 'Second Wind', desc: 'Every foe you fell heals you a little.', req: 'shell' },
  { id: 'glider', tree: 'Survival', name: 'Sky Sailor', desc: 'Glide faster, and gliding costs no stamina.', req: 'forager' },
];

/* learnable spells, cast with 1–4 */
export const SPELLS = {
  pull: { key: '1', name: 'Duat Pull', icon: '🌀', cd: 8, desc: 'Reach through the Duat and drag a foe to your feet, stunned.' },
  gust: { key: '2', name: 'Fti Gust', icon: '🌬', cd: 6, desc: 'A blast of wind that hurls foes back — or lifts you higher while gliding.' },
  quake: { key: '3', name: 'Ular Quake', icon: '⛰', cd: 12, desc: 'Slam the earth: everything near you is knocked down.' },
  ward: { key: '4', name: 'Nur Ward', icon: '🛡', cd: 22, desc: 'Phorus wraps you in Nur-light that soaks up the next 60 damage.' },
};
export const SPELL_ORDER = ['pull', 'gust', 'quake', 'ward'];

export function freshSkills() { return { lvl: 1, xp: 0, points: 0, perks: {}, spells: {} }; }

/* returns how many levels were gained */
export function gainXp(sk, n) {
  sk.xp += n;
  let up = 0;
  while (sk.xp >= xpForLevel(sk.lvl)) { sk.xp -= xpForLevel(sk.lvl); sk.lvl++; sk.points++; up++; }
  return up;
}
export const canTake = (sk, p) => !sk.perks[p.id] && sk.points > 0 && (!p.req || sk.perks[p.req]);
