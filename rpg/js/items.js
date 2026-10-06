/* ============================================================
   Things you carry: materials gathered from the wilds and from
   the creatures you fell, meals cooked at a fire, axes forged
   in a fire-tree cauldron, and small relics worn as trinkets.
   ============================================================ */

export const ITEMS = {
  /* ---- materials ---- */
  vine: { name: 'Punk vine', kind: 'mat', icon: '🌿', value: 3, desc: 'Tough, springy vine from a Punk’s legs.' },
  oil: { name: 'Rodak oil', kind: 'mat', icon: '🫗', value: 6, desc: 'Dark and slick. Burns hot.' },
  fluff: { name: 'Kipsu fluff', kind: 'mat', icon: '☁', value: 5, desc: 'Shed tail-fluff. Kipsu drop it everywhere.' },
  horn: { name: 'Albali horn', kind: 'mat', icon: '🦴', value: 12, desc: 'A broken horn, still filmed. Alchemists pay well.' },
  thorn: { name: 'Toxic horn', kind: 'mat', icon: '🧪', value: 14, desc: 'A Villtur Albali horn. The film has turned green.' },
  ore: { name: 'Stygian ore', kind: 'mat', icon: '💎', value: 10, desc: 'Raw soul-iron, cold and faintly humming.' },
  bark: { name: 'Fire-tree bark', kind: 'mat', icon: '🪵', value: 4, desc: 'Fire never harms it. Good for building and for forging.' },
  stone: { name: 'Cut stone', kind: 'mat', icon: '🧱', value: 2, desc: 'Squared stone from the ruins.' },
  petal: { name: 'Zahreh petal', kind: 'mat', icon: '🌸', value: 4, desc: 'Sweet, and a little healing. Cooks well.' },
  moss: { name: 'Bog moss', kind: 'mat', icon: '🍀', value: 6, desc: 'It soaks up acid. Bitter.' },
  seed: { name: 'Fire seed', kind: 'mat', icon: '🔥', value: 25, desc: 'A seed of an Eldi Aagac. Hot to the touch.' },
  ember: { name: 'Tyndael ember', kind: 'mat', icon: '✴', value: 9, desc: 'Still glowing.' },
  tusk: { name: 'Sru Vorn tusk', kind: 'mat', icon: '🦷', value: 60, desc: 'Long as your arm. Acid-etched.' },
  knife: { name: 'Duat knife', kind: 'mat', icon: '🗡', value: 20, desc: 'A Vel’s throwing knife. It shivers when you hold it.' },

  /* ---- meals (eat for a while-lasting boon) ---- */
  salad: { name: 'Zahreh salad', kind: 'meal', icon: '🥗', value: 12, desc: 'Heals 50 at once.', heal: 50 },
  stew: { name: 'Punk-vine stew', kind: 'meal', icon: '🍲', value: 18, desc: 'Stamina returns 40% faster for 3 minutes.', buff: { stamRegen: 1.4 }, dur: 180, heal: 15 },
  skewer: { name: 'Rodak skewer', kind: 'meal', icon: '🍢', value: 22, desc: '+15% damage for 3 minutes.', buff: { dmg: 1.15 }, dur: 180, heal: 15 },
  broth: { name: 'Fire-seed broth', kind: 'meal', icon: '🍵', value: 40, desc: 'Heat builds twice as fast for 3 minutes.', buff: { heat: 2 }, dur: 180, heal: 20 },
  tea: { name: 'Antidote tea', kind: 'meal', icon: '🫖', value: 30, desc: 'No poison can touch you for 4 minutes.', buff: { antidote: 1 }, dur: 240, heal: 10 },
  roast: { name: 'Ember roast', kind: 'meal', icon: '🍖', value: 30, desc: 'Take 15% less damage for 3 minutes.', buff: { armor: 0.85 }, dur: 180, heal: 25 },

  /* ---- axes ---- */
  axe_tanoc: { name: 'Tanoc’s axe', kind: 'axe', icon: '🪓', value: 0, dmg: 1.0, desc: 'The axe Torcain has always carried.' },
  axe_smith: { name: 'Smith’s axe', kind: 'axe', icon: '🪓', value: 120, dmg: 1.18, desc: 'Fire-tree haft, honest steel. +18% damage.' },
  axe_fire: { name: 'Kindled axe', kind: 'axe', icon: '🔥', value: 240, dmg: 1.28, burn: true, desc: '+28% damage. Strikes set foes smouldering.', color: 0xff7a2a },
  axe_styg: { name: 'Stygian cleaver', kind: 'axe', icon: '⚔', value: 400, dmg: 1.42, duatCd: 1.2, desc: '+42% damage. The Duat answers it faster.', color: 0x9a5aff },
  axe_tusk: { name: 'Tusk cleaver', kind: 'axe', icon: '🦷', value: 700, dmg: 1.65, stagger: 1.5, desc: '+65% damage. Staggers even big things.', color: 0xb0ff4a },

  /* ---- trinkets (wear two) ---- */
  t_kipsu: { name: 'Kipsu charm', kind: 'trinket', icon: '🐾', value: 80, desc: '+25% shards from every foe.', perk: { shards: 1.25 } },
  t_feather: { name: 'Albali feather', kind: 'trinket', icon: '🪶', value: 90, desc: 'Glide farther and slower.', perk: { glide: 1 } },
  t_seed: { name: 'Ember seed', kind: 'trinket', icon: '🌰', value: 90, desc: 'Heat builds 30% faster.', perk: { heat: 1.3 } },
  t_breath: { name: 'Breath stone', kind: 'trinket', icon: '🪨', value: 100, desc: 'Stamina returns 25% faster.', perk: { stamRegen: 1.25 } },
  t_ring: { name: 'Hurst ring', kind: 'trinket', icon: '💍', value: 140, desc: '+25 maximum health.', perk: { hp: 25 } },
  t_ver: { name: 'Ver’s eye', kind: 'trinket', icon: '👁', value: 160, desc: 'Spells recover 20% faster.', perk: { cd: 0.8 } },

  /* ---- key items ---- */
  k_scroll_pull: { name: 'Scroll: Duat Pull', kind: 'key', icon: '📜', value: 0, desc: 'Read it to learn a spell.' },
};

/* cooking at a fire: [ingredients] → meal */
export const RECIPES = [
  { out: 'salad', need: { petal: 2 } },
  { out: 'stew', need: { vine: 2, petal: 1 } },
  { out: 'skewer', need: { oil: 1, vine: 1 } },
  { out: 'roast', need: { ember: 1, oil: 1 } },
  { out: 'broth', need: { seed: 1, petal: 1 } },
  { out: 'tea', need: { moss: 2, thorn: 1 } },
];

/* forging at the smith: shards + materials → axe */
export const FORGE = [
  { out: 'axe_smith', shards: 60, need: { bark: 3, ore: 2 } },
  { out: 'axe_fire', shards: 150, need: { bark: 4, seed: 1, ember: 2 } },
  { out: 'axe_styg', shards: 260, need: { ore: 6, knife: 2 } },
  { out: 'axe_tusk', shards: 400, need: { tusk: 1, ore: 4, oil: 3 } },
];

/* what the trader keeps on her mat (price in shards) */
export const SHOP = {
  xilia: ['salad', 'stew', 'petal', 'vine', 'bark', 'ore', 't_breath', 't_seed'],
  aakalay: [],
  leotik: ['salad', 'stew', 'tea', 'moss', 'ore', 'seed', 't_ring', 't_ver'],
};

/* what each creature leaves behind: [item, chance, count] */
export const LOOT = {
  punk: [['vine', 0.7, 1], ['petal', 0.15, 1]],
  malsti: [['vine', 0.3, 1], ['ore', 0.12, 1]],
  rodak: [['oil', 0.75, 1]],
  kipsu: [['fluff', 0.8, 1]],
  kipsu_f: [['fluff', 0.8, 1]],
  punk_d: [['vine', 0.8, 2]],
  albali: [['horn', 0.5, 1]],
  albali_t: [['thorn', 0.6, 1]],
  vel: [['knife', 1, 1], ['ore', 0.6, 2]],
  tyndael: [['ember', 0.7, 1]],
  sruvorn: [['tusk', 1, 1], ['oil', 1, 3]],
};

export function count(inv, id) { return inv.items[id] || 0; }
export function add(inv, id, n = 1) { inv.items[id] = (inv.items[id] || 0) + n; }
export function take(inv, id, n = 1) {
  if ((inv.items[id] || 0) < n) return false;
  inv.items[id] -= n; if (inv.items[id] <= 0) delete inv.items[id];
  return true;
}
export function hasAll(inv, need) { return Object.entries(need).every(([k, n]) => count(inv, k) >= n); }
export function takeAll(inv, need) { if (!hasAll(inv, need)) return false; for (const [k, n] of Object.entries(need)) take(inv, k, n); return true; }
export const needText = need => Object.entries(need).map(([k, n]) => `${n} ${ITEMS[k].name}`).join(', ');

export function freshInventory() {
  return { items: { axe_tanoc: 1, salad: 1 }, axe: 'axe_tanoc', trinkets: [], buffs: {} };
}

/* the combined effect of what you wear and what you've eaten */
export function effects(inv, now) {
  const fx = { dmg: 1, heat: 1, stamRegen: 1, armor: 1, cd: 1, shards: 1, hp: 0, glide: 0, antidote: 0, burn: false, duatCd: 0, stagger: 1 };
  const axe = ITEMS[inv.axe] || ITEMS.axe_tanoc;
  fx.dmg *= axe.dmg || 1; if (axe.burn) fx.burn = true; fx.duatCd += axe.duatCd || 0; fx.stagger *= axe.stagger || 1;
  for (const t of inv.trinkets) {
    const p = (ITEMS[t] || {}).perk || {};
    for (const [k, v] of Object.entries(p)) {
      if (k === 'hp' || k === 'glide') fx[k] += v; else fx[k] *= v;
    }
  }
  for (const [id, until] of Object.entries(inv.buffs || {})) {
    if (until < now) { delete inv.buffs[id]; continue; }
    const b = (ITEMS[id] || {}).buff || {};
    for (const [k, v] of Object.entries(b)) { if (k === 'antidote') fx.antidote = 1; else fx[k] *= v; }
  }
  return fx;
}
