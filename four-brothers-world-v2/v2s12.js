// 4 Brothers World V2 — part 12: fewer recipes, and Recipe Squares teach the rest.
// You start knowing only the basics (wood, flint, stone and iron gear, building blocks, stations, bars, food).
// Everything else is in eight sets, and each Recipe Square you read teaches the next one:
//   bronze gear → monster weapons I → platinum gear → monster weapons II → stygian gear → monster weapons III
//   → soulsteel gear → old secrets.
// The crafting list only shows what you know, plus a line saying how many recipes are left to find.
// The Stone Club recipe is gone (the Stone Hammer and Stone Sword cover it); any you have still work.
(function (RW) {
  'use strict';
  const P = RW.player, U = RW.ui;
  if (!P || !U || !U.renderCraft) return;

  // the four metal sets reuse the flags the old squares set, so a square you already read still counts
  const SETS = [
    { flag: 'learn_bronze', name: 'bronze tools, weapons and armour', ids: ['bronze_pick', 'bronze_warhammer', 'bronze_greataxe', 'bronze_sword', 'bronze_bow', 'bronze_helm', 'bronze_mail'] },
    { flag: 'learn_m1', name: 'the first monster weapons (Venomspine Mace, Venom Spear, Thornlash Bow, Shockshell Club, Thornroot Spear, Scute Mail)', ids: ['venomspine_mace', 'venom_spear', 'thornlash_bow', 'shockshell_club', 'thornroot_spear', 'scute_mail'], tier: 'iron' },
    { flag: 'learn_platinum', name: 'platinum tools, weapons and armour', ids: ['platinum_pick', 'platinum_maul', 'platinum_sword', 'platinum_spear', 'platinum_bow', 'platinum_helm', 'platinum_mail'] },
    { flag: 'learn_m2', name: 'more monster weapons (Emberstone Maul, Sunfire Sword, Emberwood Bow, Hvaleia Bow, Livingwood Mail)', ids: ['emberstone_maul', 'sunfire_sword', 'emberwood_bow', 'hvaleia_bow', 'livingwood_mail'], tier: 'bronze' },
    { flag: 'learn_stygian', name: 'stygian tools, weapons and armour', ids: ['stygian_pick', 'stygian_cleaver', 'stygian_sword', 'stygian_bow', 'stygian_helm', 'stygian_mail'] },
    { flag: 'learn_m3', name: 'storm weapons (Stormglass Axe, Stormtusk Spear, Lütut Lance, Stormbark Staff)', ids: ['stormglass_axe', 'stormtusk_spear', 'lutut_lance', 'stormbark_staff'], tier: 'platinum' },
    { flag: 'learn_soulsteel', name: 'soulsteel weapons', ids: ['soulsteel_greatsword', 'soulsteel_bow', 'soulsteel_hammer'] },
    { flag: 'learn_m4', name: 'the old secrets (Mirrorblade, Gnarlroot Staff)', ids: ['mirrorblade', 'gnarl_staff'], tier: 'soulsteel' },
  ];
  const SET_OF = {};
  SETS.forEach((s) => s.ids.forEach((id) => { SET_OF[id] = s; }));
  const CUT = ['stone_club'];

  // ---- the recipe list itself ----
  for (let i = RW.RECIPES.length - 1; i >= 0; i--) if (CUT.includes(RW.RECIPES[i].out)) RW.RECIPES.splice(i, 1);
  const flags = () => P.flags || (P.flags = {});
  const knows = (r) => { const s = SET_OF[r.out]; return !s || !!flags()[s.flag]; };
  RW.v2knowsRecipe = knows;
  const nextSet = () => SETS.find((s) => !flags()[s.flag]);

  // saves from before this change: you keep the monster weapons you've already been making
  function migrate() {
    const f = flags(); if (f.rec2) return; f.rec2 = 1;
    const owns = (ids) => ids.some((id) => P.count && P.count(id) > 0);
    const next = { iron: 'learn_bronze', bronze: 'learn_platinum', platinum: 'learn_stygian', soulsteel: 'learn_soulsteel' };
    SETS.forEach((s) => { if (s.tier && !f[s.flag] && (owns(s.ids) || (next[s.tier] && f[next[s.tier]] && s.tier !== 'soulsteel'))) f[s.flag] = 1; });
  }
  const safeMigrate = () => { try { migrate(); } catch (e) { console.warn('recipes', e); } };
  const baseUpd = P.update;
  P.update = function () { if (!flags().rec2) safeMigrate(); return baseUpd.apply(this, arguments); };

  // ---- the crafting list only shows what you know ----
  const baseRender = U.renderCraft;
  U.renderCraft = function () {
    safeMigrate();
    const all = RW.RECIPES, known = all.filter(knows), left = all.length - known.length;
    RW.RECIPES = known;
    let out;
    try { out = baseRender.apply(this, arguments); } finally { RW.RECIPES = all; }
    const list = document.querySelector('#rlist');
    if (list && left > 0) {
      const d = document.createElement('div'); d.className = 'label';
      d.textContent = left + ' more recipe' + (left > 1 ? 's' : '') + ' to learn. Each Recipe Square you read teaches the next set. Find them in chests, from elites and bosses, or buy one from Tumble.';
      list.append(d);
    }
    return out;
  };
  const baseCraft = U.craft;
  U.craft = function (r) { if (r && !knows(r)) { U.toast('You haven\'t learned that recipe yet.'); return; } return baseCraft.apply(this, arguments); };

  // ---- reading a square teaches the next set ----
  if (RW.ITEMS.recipe_square) RW.ITEMS.recipe_square.desc = 'An old carved square. Right-click to read it and learn the next set of recipes: new metal gear, or weapons made from monster parts.';
  const baseUse = P.useItem;
  P.useItem = function (it) {
    if (!it || it.v2use !== 'square') return baseUse.apply(this, arguments);
    safeMigrate();
    const s = nextSet(), c = P.center();
    if (!s) { P.remove(it.id, 1); P.add('coin', 40); U.toast('You already know every recipe. The square crumbles into 40 coins.'); return; }
    flags()[s.flag] = 1; P.remove(it.id, 1);
    RW.fx.burst(c.x, c.y - 8, ['#f2c94c', '#ffffff', '#c8b48a'], 20, 80, { add: true, kind: 'glow', grav: -30 }); RW.audio.sfx('crystal');
    const n = SETS.filter((x) => !flags()[x.flag]).length;
    U.banner('Recipe Square', 'You learned ' + s.name + '.' + (n ? ' ' + n + ' more set' + (n > 1 ? 's' : '') + ' to find.' : ' That was the last one.'));
    U.dirty(); RW.game.saveSoon();
  };

  // there are twice as many sets as before, so squares turn up a bit more often in chests
  const ch = RW.LOOT && RW.LOOT.chest;
  if (ch) ch.forEach((e) => { if (e[0] === 'recipe_square' && e[3] < 0.26) e[3] = 0.26; });

  // the guides mention that monster weapons have to be learned first
  ['GUIDE_TIPS', 'FUZZY_TIPS', 'GHOST_TIPS', 'ACORN_TIPS', 'DUAT_TIPS'].forEach((k) => (RW[k] || []).forEach((tip) => {
    if (typeof tip.say === 'string' && /Monster parts make the best weapons|Plain weapons get you only so far/.test(tip.say) && !/Recipe Square/.test(tip.say))
      tip.say = tip.say.replace(/ Ask me for the full list anytime\.$/, '') + ' You\'ll need a Recipe Square to learn them first.';
  }));
})(window.RW);
