/* Headless test for Expedition Mode (Roguelike Summoner):
   - static data integrity (heroes, forms, planets, Vaelk flavors)
   - pure run logic (start, draft pool filtering, node building, resolution)
   - the 'expedition' match mode end-to-end in the engine (hero on field,
     single-flavor Vaelk economy, Guardian summons, win/lose + termination) */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

global.window = global;
global.document = { createElement: () => ({ getContext: () => null, style: {}, addEventListener: () => {} }), addEventListener: () => {} };
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const files = [
  'js/core/util.js', 'js/core/audio.js', 'js/data/species.js', 'js/data/economy.js',
  'js/data/lore.js', 'js/core/token.js', 'js/engine/behaviors.js', 'js/engine/match.js',
  'js/data/expedition.js', 'js/core/expedition.js',
];
for (const f of files) {
  try { eval(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f); }
  catch (e) { console.error('LOAD FAIL', f, e.message, e.stack.split('\n')[1]); process.exit(1); }
}
const DYAG = global.DYA;
/* minimal state stub so the run engine can persist the active run */
DYAG.state = { me: { expedition: null }, save: () => {} };

const ED = DYAG.expeditionData, E = DYAG.expedition, SP = DYAG.species, U = DYAG.util;
let fails = 0;
function ok(cond, msg) { console.log((cond ? '  PASS ' : '  FAIL ') + msg); if (!cond) fails++; }

/* ================= 1. DATA INTEGRITY ================= */
console.log('\n[1] Static data');
ok(ED.HEROES.length === 8, 'exactly 8 heroes (Torcain is a form, not a slot) — got ' + ED.HEROES.length);
const tanoc = ED.getHero('tanoc');
ok(tanoc && tanoc.forms.length === 2, 'Tanoc has 2 forms (base + Torcain)');
const torcain = ED.getForm('torcain');
ok(torcain && torcain.neutral === true, 'Torcain form is neutral/hybrid');
ok(ED.allForms().length === 9, '9 forms total across 8 heroes');
/* every form maps to a real, fightable avatar species */
let avatarsOk = true, elemsOk = true;
ED.allForms().forEach(f => {
  const sp = SP.get(f.avatar);
  if (!sp || !SP.canDuel(f.avatar)) avatarsOk = false;
  if (['Fti', 'Su', 'Eldi', 'Ular'].indexOf(f.element) < 0) elemsOk = false;
});
ok(avatarsOk, 'every form avatar is a real fightable species');
ok(elemsOk, 'every form has a valid Vaelk element');
/* one established + one original hero per element */
const els = ['Fti', 'Su', 'Eldi', 'Ular'];
els.forEach(el => {
  const inEl = ED.HEROES.filter(h => h.element === el);
  ok(inEl.length === 2 && inEl.some(h => h.origin === 'established') && inEl.some(h => h.origin === 'original'),
    el + ': one established + one original hero');
});
/* Vaelk flavors present, plural uses -ar */
els.forEach(el => {
  const v = ED.vaelkOf(el);
  ok(v && /Vaelk$/.test(v.flavor) && /Vaelkar$/.test(v.plural), el + " Vaelk flavor + -ar plural (" + (v && v.plural) + ')');
});
/* planets + guardians from existing high-rarity roster */
ok(ED.PLANETS.length === 3, '3 planets (Velki/Xikia/Leotik)');
let guardiansOk = true;
ED.PLANETS.forEach(p => {
  const g = SP.get(p.guardian.species);
  if (!g || g.rarity[1] < 4) guardiansOk = false;                 // legendary-tier
  if (!SP.get(p.guardian.summon.species)) guardiansOk = false;    // summon species real
  if (!p.enemyPool.every(id => SP.get(id))) guardiansOk = false;  // pool species real
});
ok(guardiansOk, 'each planet Guardian is a real high-rarity species with a real summon + enemy pool');

/* ================= 2. DRAFT POOL FILTERING ================= */
console.log('\n[2] Draft pool = element affinity');
const kietForm = ED.getForm('kiet_base'); // Fti
const ftiPool = ED.draftPool(kietForm);
ok(ftiPool.length > 0, 'Fti hero has a non-empty draft pool');
ok(ftiPool.every(id => { const s = SP.get(id); return s.element === 'Fti' || s.element2 === 'Fti'; }), 'Fti pool is only Fti-affinity creatures');
const neutralPool = ED.draftPool(torcain);
ok(neutralPool.length > ftiPool.length, 'neutral (Torcain) pool is wider than a single-element pool');
ok(neutralPool.some(id => SP.get(id).element === 'Su') && neutralPool.some(id => SP.get(id).element === 'Ular'), 'neutral pool spans multiple elements');

/* ================= 3. RUN LOGIC ================= */
console.log('\n[3] Run progression (pure)');
const rng = new U.Rng(12345);
const run = E.start('kiet_base', 'leotik', { rng });
ok(run && run.element === 'Fti', 'run started, hero locked to Fti');
ok(run.hero && run.hero.expeditionHero, 'hero avatar token minted');
ok(run.pendingDraft && run.pendingDraft.options.length === 3, 'starting draft offers 3 creatures');
/* draft tokens cost only the hero flavor (single-flavor Vaelk) */
const draftTok = run.pendingDraft.options[0];
const offFlavor = ['Fti', 'Su', 'Eldi', 'Ular'].filter(e => e !== 'Fti').reduce((s, e) => s + (draftTok.cost[e] || 0), 0);
ok(draftTok.cost.Fti > 0 && offFlavor === 0, 'a drafted creature costs only Fti\'Vaelk (single flavor)');
E.applyDraft(run, draftTok);
ok(run.deck.length === 1 && !run.pendingDraft, 'draft added to deck, draft cleared');
ok(DYAG.state.me.expedition === run, 'active run persisted on the player');

/* ordinary node vs guardian node */
const n0 = E.buildNode(run, new U.Rng(1));
ok(!n0.guardian && n0.enemies.length >= 1, 'node 1 is an ordinary encounter');
run.nodeIdx = run.nodes - 1;
const ng = E.buildNode(run, new U.Rng(1));
ok(ng.guardian && ng.hadBoss && ng.enemies[0].boss && ng.enemies[0].guardian, 'final node is the Guardian (boss + summon config)');
run.nodeIdx = 0;

/* resolution: win advances + offers a draft; win-on-guardian clears; loss ends */
const winEv = E.resolveNode(run, true, new U.Rng(2));
ok(winEv.type === 'draft' && run.nodeIdx === 1 && run.pendingDraft, 'winning an ordinary node advances and offers a draft');
const lossRun = E.start('venkin_base', 'velki', { rng: new U.Rng(7) });
const lossEv = E.resolveNode(lossRun, false);
ok(lossEv.type === 'lost' && lossRun.ended && lossRun.result === 'lost', 'losing a fight ends the run');
const clrRun = E.start('tanoc_base', 'xikia', { rng: new U.Rng(9) });
clrRun.nodeIdx = clrRun.nodes - 1;
const clrEv = E.resolveNode(clrRun, true);
ok(clrEv.type === 'cleared' && clrRun.cleared, 'defeating the Guardian clears the planet');

/* ================= 4. ENGINE: an 'expedition' match ================= */
console.log('\n[4] Expedition combat in the engine');
function runExpeditionMatch(node, seed, timeLimit) {
  const r2 = new U.Rng(seed);
  const hero = DYAG.token.mint({ speciesId: 'sword_eikar', rng: r2, rarity: 4 });
  const deck = ['spear_eikar', 'archer_eikar', 'sword_eikar', 'kipsu'].map(id => E.makeDeckToken(id, 'Ular', r2));
  /* deterministic pouch ids so identical seeds produce byte-identical results */
  const pouch = deck.map((t, i) => ({ ...JSON.parse(JSON.stringify(t)), id: 'exp_deck_' + i, costLocked: true }));
  const m = new DYAG.match.Match({
    seed, mode: 'expedition', terrain: 'forest',
    settings: { pulseInterval: 4, pulseAmount: 3, chaos: false },
    teams: [
      { name: 'Hero', controller: 'ai', aiSkill: 0.9, pouch },
      { name: node.name, controller: 'wild', pouch: [] },
    ],
    hunt: { enemies: node.enemies },
    expedition: { element: 'Ular', hero, startPool: 3, heroHpMul: 2.4, timeLimit },
  });
  m.headless = true;
  let ticks = 0;
  while (!m.over && ticks < (timeLimit + 20) * 20) { m.doTick(); ticks++; }
  return m;
}
/* ordinary node — a strong deck should clear it and win */
const ordNode = { guardian: false, hadBoss: false, name: 'Xikia scrub', enemies: [{ speciesId: 'wild_punk', rarity: 2 }, { speciesId: 'kipsu', rarity: 2 }] };
const mo = runExpeditionMatch(ordNode, 4242, 200);
ok(mo.over, 'ordinary expedition node terminates');
ok(mo.expeditionElement === 'Ular', 'match locked to the hero Vaelk flavor');
ok(mo.teams[0].resources.Fti === 0 && mo.teams[0].resources.Su === 0 && mo.teams[0].resources.Eldi === 0, 'only Ular\'Vaelk ever accrued (single flavor)');
ok(mo.expeditionHasHero === true, 'the hero took the field');
ok(mo.result.winner === 0, 'a strong deck clears the ordinary node (win)');

/* guardian node — verify the Guardian summons minions each pulse */
const planet = ED.getPlanet('xikia');
const gNode = { guardian: true, hadBoss: true, name: planet.guardian.name, enemies: [{ speciesId: planet.guardian.species, rarity: planet.guardian.rarity, boss: true, guardian: planet.guardian.summon }] };
const mg = runExpeditionMatch(gNode, 8888, 120);
ok(mg.over, 'guardian expedition node terminates (by defeat or overtime)');
ok(mg.expeditionHadBoss === true, 'guardian node flagged as a boss fight');
ok(mg.creatures.some(c => c.isGuardian), 'the Guardian is on the field');
ok(mg.creatures.some(c => c.isGuardianMinion), 'the Guardian summoned minions (Big Momma Kofi pattern, scaled up)');
ok(mg.result.winner === 0 || mg.result.winner === 1, 'guardian node resolves to a definite win or loss');

/* ================= 5. DETERMINISM (unchanged guarantee) ================= */
console.log('\n[5] Determinism');
const a = runExpeditionMatch(ordNode, 4242, 200), b = runExpeditionMatch(ordNode, 4242, 200);
ok(a.tick === b.tick && a.result.winner === b.result.winner && a.result.how === b.result.how && Math.abs(a.time - b.time) < 1e-9,
  'same seed → identical expedition match (tick ' + a.tick + ', winner ' + a.result.winner + ')');

console.log('\n' + (fails === 0 ? 'ALL EXPEDITION TESTS PASSED' : fails + ' EXPEDITION TEST(S) FAILED'));
process.exit(fails === 0 ? 0 : 1);
