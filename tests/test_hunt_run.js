/* Headless test for the HUNT (run-based summoner):
   - static data integrity (hunters, forms, grounds, Vaelk flavors)
   - pure run logic (start, draft pool filtering, node building, resolution)
   - the Quarry: a scaled boss + an EXACT-STATS piece reward that reproduces it
   - the 'huntrun' match mode end-to-end in the engine */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

global.window = global;
global.document = { createElement: () => ({ getContext: () => null, style: {}, addEventListener: () => {} }), addEventListener: () => {} };
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const files = [
  'js/core/util.js', 'js/core/audio.js', 'js/data/species.js', 'js/data/economy.js',
  'js/data/lore.js', 'js/core/token.js', 'js/engine/behaviors.js', 'js/engine/match.js',
  'js/data/hunt_run.js', 'js/core/hunt_run.js',
];
for (const f of files) {
  try { eval(fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n//# sourceURL=' + f); }
  catch (e) { console.error('LOAD FAIL', f, e.message, e.stack.split('\n')[1]); process.exit(1); }
}
const DYAG = global.DYA;
DYAG.state = { me: { huntRun: null, pieces: [] }, save: () => {} };

const ED = DYAG.huntRunData, E = DYAG.huntRun, SP = DYAG.species, U = DYAG.util, TK = DYAG.token;
let fails = 0;
function ok(cond, msg) { console.log((cond ? '  PASS ' : '  FAIL ') + msg); if (!cond) fails++; }

/* ================= 1. DATA ================= */
console.log('\n[1] Static data');
ok(ED.HEROES.length === 8, 'exactly 8 hunters (Torcain is a form, not a slot)');
ok(ED.getForm('torcain') && ED.getForm('torcain').neutral === true, 'Torcain form is neutral/hybrid');
ok(ED.allForms().length === 9, '9 forms across 8 hunters');
['Fti', 'Su', 'Eldi', 'Ular'].forEach(el => {
  const v = ED.vaelkOf(el);
  ok(v && /Vaelkar$/.test(v.plural), el + " Vaelk plural uses -ar (" + v.plural + ')');
});
ok(ED.PLANETS.length === 3, '3 hunting grounds');
let gOk = true;
ED.PLANETS.forEach(p => { const g = SP.get(p.guardian.species); if (!g || g.rarity[1] < 4) gOk = false; if (!SP.get(p.guardian.summon.species)) gOk = false; });
ok(gOk, 'each ground Quarry is a real high-rarity species with a real summon');

/* ================= 2. DRAFT POOL ================= */
console.log('\n[2] Draft pool = element affinity');
const kiet = ED.getForm('kiet_base');
const fti = ED.draftPool(kiet);
ok(fti.length > 0 && fti.every(id => { const s = SP.get(id); return s.element === 'Fti' || s.element2 === 'Fti'; }), 'Fti hunter drafts only Fti-affinity beasts');
ok(ED.draftPool(ED.getForm('torcain')).length > fti.length, 'neutral (Torcain) pool is wider');

/* ================= 3. RUN LOGIC ================= */
console.log('\n[3] Run progression');
const run = E.start('kiet_base', 'leotik', { rng: new U.Rng(12345) });
ok(run && run.element === 'Fti' && run.hero.huntRunHero, 'run started, hunter avatar minted');
ok(run.pendingDraft && run.pendingDraft.options.length === 3, 'starting draft offers 3');
const dTok = run.pendingDraft.options[0];
const off = ['Su', 'Eldi', 'Ular'].reduce((s, e) => s + (dTok.cost[e] || 0), 0);
ok(dTok.cost.Fti > 0 && off === 0, 'a drafted beast costs only Fti\'Vaelk');
E.applyDraft(run, dTok);
ok(run.deck.length === 1 && DYAG.state.me.huntRun === run, 'draft added; run persisted on me.huntRun');
const n0 = E.buildNode(run, new U.Rng(1));
ok(!n0.guardian && n0.enemies.length >= 2, 'ordinary node is a beast pack (2+ enemies)');

/* ================= 4. THE QUARRY + EXACT-STATS PIECE ================= */
console.log('\n[4] Quarry boss + exact-stats reward');
run.nodeIdx = run.nodes - 1;
const qNode = E.buildNode(run);
ok(qNode.guardian && qNode.hadBoss && qNode.enemies[0].boss && qNode.enemies[0].guardian, 'final node is the Quarry (boss + summon)');
ok(qNode.spec && qNode.enemies[0].tok, 'Quarry node carries an exact spec + pre-minted token');
/* boss is genuinely monstrous vs a plain mint of the same species */
const baseline = TK.mint({ speciesId: qNode.spec.speciesId, rng: new U.Rng(7), rarity: qNode.spec.rarity });
ok(qNode.spec.stats.hp > baseline.stats.hp * 3, 'Quarry HP is vastly inflated (very hard) — ' + qNode.spec.stats.hp + ' vs base ' + baseline.stats.hp);
ok(qNode.spec.sizeIdx === ED.DEFAULTS.bossSizeIdx, 'Quarry is rendered at the largest size band');

/* launchNode stashes bossSpec; simulate a guardian win → piece granted */
run.bossSpec = qNode.spec;
DYAG.state.me.pieces = [];
const ev = E.resolveNode(run, true);
ok(ev.type === 'cleared' && run.cleared, 'defeating the Quarry clears the ground');
const piece = DYAG.state.me.pieces[0];
ok(piece && piece.spec && piece.from.indexOf('Quarry') >= 0, 'a Quarry piece was granted');
ok(piece.spec.stats.hp === qNode.spec.stats.hp && piece.spec.stats.dmg === qNode.spec.stats.dmg, 'the piece carries the Quarry\'s exact stats');
/* crafting the piece (via mintSpec) reproduces the boss verbatim */
const crafted = TK.mintSpec(piece.spec, { rng: new U.Rng(99) });
ok(crafted.stats.hp === piece.spec.stats.hp && crafted.stats.dmg === piece.spec.stats.dmg && crafted.stats.speed === piece.spec.stats.speed, 'sung-true token has the Quarry\'s EXACT stats');
ok(crafted.sizeIdx === piece.spec.sizeIdx && crafted.name === piece.spec.name, 'sung-true token matches the Quarry\'s size and name');

/* a lost fight ends the run */
const lr = E.start('venkin_base', 'velki', { rng: new U.Rng(3) });
ok(E.resolveNode(lr, false).type === 'lost' && lr.ended, 'losing a fight ends the run');

/* ================= 5. ENGINE: a 'huntrun' Quarry match ================= */
console.log('\n[5] Hunt combat in the engine');
function runQuarryMatch(seed, timeLimit) {
  const r2 = new U.Rng(seed);
  const hrun = E.start('tanoc_base', 'xikia', { rng: r2 });
  hrun.nodeIdx = hrun.nodes - 1;
  const node = E.buildNode(hrun);
  const hero = DYAG.token.mint({ speciesId: 'sword_eikar', rng: r2, rarity: 4 });
  const deck = ['spear_eikar', 'archer_eikar', 'sword_keilia'].map(id => E.makeDeckToken(id, 'Ular', r2));
  const pouch = deck.map((t, i) => ({ ...JSON.parse(JSON.stringify(t)), id: 'd' + i, costLocked: true }));
  const m = new DYAG.match.Match({
    seed, mode: 'huntrun', terrain: 'forest',
    settings: { pulseInterval: 4, pulseAmount: 3, chaos: false },
    teams: [
      { name: 'Hunter', controller: 'ai', aiSkill: 0.9, pouch },
      { name: node.name, controller: 'wild', pouch: [] },
    ],
    hunt: { enemies: node.enemies },
    huntrun: { element: 'Ular', hero, startPool: 3, heroHpMul: 2.0, timeLimit },
  });
  m.headless = true;
  let ticks = 0;
  while (!m.over && ticks < (timeLimit + 20) * 20) { m.doTick(); ticks++; }
  return { m: m, spec: node.spec };
}
const { m: mg, spec } = runQuarryMatch(8888, 90);
ok(mg.over, 'Quarry match terminates');
ok(mg.huntrunHadBoss === true, 'flagged as a boss fight');
const bossC = mg.creatures.find(c => c.isBoss);
ok(bossC && bossC.tok.stats.hp === spec.stats.hp, 'the fielded Quarry uses EXACTLY the spec base stats — ' + (bossC && bossC.tok.stats.hp) + ' == ' + spec.stats.hp);
ok(bossC && bossC.maxHp >= spec.stats.hp && spec.stats.hp > 800, 'the Quarry is monstrous (base ' + spec.stats.hp + ', field maxHp ' + (bossC && bossC.maxHp) + ')');
/* a crafted copy of this exact Quarry fields identically: same base stats + same quirks */
const copy = TK.mintSpec(spec, { rng: new U.Rng(1) });
ok(copy.stats.hp === spec.stats.hp && JSON.stringify(copy.quirks) === JSON.stringify(spec.quirks), 'a sung-true copy reproduces the Quarry\'s stats AND quirks (fields identically)');
ok(mg.creatures.some(c => c.isGuardianMinion), 'the Quarry summoned minions');
ok(mg.teams[0].resources.Fti === 0 && mg.teams[0].resources.Su === 0, 'single-flavor Vaelk economy');
ok(mg.result.winner === 0 || mg.result.winner === 1, 'resolves to a definite win or loss');

/* determinism */
const a = runQuarryMatch(4242, 80).m, b = runQuarryMatch(4242, 80).m;
ok(a.tick === b.tick && a.result.winner === b.result.winner, 'same seed → identical hunt match');

console.log('\n' + (fails === 0 ? 'ALL HUNT TESTS PASSED' : fails + ' HUNT TEST(S) FAILED'));
process.exit(fails === 0 ? 0 : 1);
