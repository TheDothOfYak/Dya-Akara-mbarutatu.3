/* ============================================================
   Bounty boards: short, repeatable hunts posted by the folk of
   Xilia and the Leotik camp. One bounty at a time; finish it at
   any board for shards and experience, then take another.
   ============================================================ */

/* what each board asks for: [kill-key, how many, base shards, base xp, who posted it] */
const POOLS = {
  xilia: [
    ['punk', 4, 50, 90, 'Teodr — they trample the Ju'],
    ['rodak', 3, 70, 120, 'the night watch'],
    ['kipsu', 3, 60, 100, 'Hemla — “they took my float”'],
    ['tyndael', 2, 60, 110, 'Bosk — singed eyebrows'],
    ['malsti', 4, 70, 120, 'Lirra — Duat seedlings by the hideout road'],
  ],
  leotik: [
    ['albali', 3, 90, 160, 'Ila Vos — green film samples'],
    ['rodak', 4, 100, 170, 'Venkin — the pups are frightened'],
    ['tyndael', 4, 100, 170, 'Duro — embers for the cauldron'],
    ['malsti', 5, 90, 160, 'Kesh — Duat seedlings'],
    ['punk', 5, 90, 150, 'the camp cook'],
  ],
};
export const hasBoard = region => !!POOLS[region];

/* three offers that stay put until you take one (seeded by how many you've done) */
export function offers(region, done) {
  const pool = POOLS[region] || [];
  const out = [];
  let seed = (done * 7919 + region.length * 31) >>> 0;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const picks = pool.map((p, i) => [rnd(), i]).sort((a, b) => a[0] - b[0]).slice(0, 3).map(([, i]) => pool[i]);
  const tier = 1 + Math.min(4, Math.floor(done / 3)) * 0.25;   // the more you take, the more they pay — and ask
  for (const [kind, n, shards, xp, from] of picks) {
    const extra = Math.floor(done / 4);
    out.push({ kind, n: n + extra, shards: Math.round(shards * tier), xp: Math.round(xp * tier), from });
  }
  return out;
}

export function bountyProgress(b, save) {
  if (!b) return 0;
  return Math.min(b.n, Math.max(0, ((save.killsBy || {})[b.kind] || 0) - b.start));
}
