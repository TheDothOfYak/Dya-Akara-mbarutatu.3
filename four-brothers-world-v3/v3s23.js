// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3 — part 23: what the rings give you.
//  * Each ring's ground ore smelts into bars at a forge (4 ore to a bar). Each ring boss drops its own ore:
//    Fangstone (Grindmaw), Leafscale (Frondwraith), Magmashell (Scaldjaw), Gravesteel (the Gravekeeper). The Hollow
//    Dark has only Nullstone. Runes 9 to 13 are carved from these (v2s15).
//  * A set for every ring, made at a forge from that ring's bars and its boss ore: a melee weapon, a bow, a magic
//    staff, a helm and body armour. Each set is stronger than the last and weaker than the Leviathan's own drops.
//  * The Chillshell Charm (a trinket) keeps the Scald Vents' hot water off you; so does the full Scald set.
//  * The rings' stone blocks can be picked up and built with.
(function (RW) {
  'use strict';
  const R = RW.register;
  if (!R || !RW.ITEMS) return;
  const item = (o) => R.item(Object.assign({ stack: 99 }, o));
  const W = (o) => R.item(Object.assign({ kind: 'weapon', stack: 1, power: 1, knock: 4 }, o));
  const AR = (o) => R.item(Object.assign({ kind: 'armor', stack: 1 }, o));

  // ---------------- blocks you can carry ----------------
  [['v3reefrock', 'Reef Rock', '#56646a', '#2e3840'], ['v3coral', 'Living Coral', '#f09070', '#8a3a30'], ['v3kelprock', 'Kelp Slate', '#3e4e40', '#222c24'],
    ['v3basalt', 'Scald Basalt', '#2c2628', '#141012'], ['v3fossil', 'Fossil Stone', '#8a8472', '#4e4a42'], ['v3voidrock', 'Void Stone', '#16121e', '#06050a']]
    .forEach(([id, name, a, b]) => item({ id, name, kind: 'place', place: id, icon: { s: 'block', a, b }, desc: 'Stone from the rings around the Heart Chamber. Building block.' }));

  // ---------------- ores, bars, boss ores ----------------
  const RINGS = [
    { k: 'coralite', name: 'Coralite', col: '#f08a6a', dark: '#8a3a30', ring: 'the Coral Caverns', boss: 'fangstone', bossName: 'Fangstone', bossFrom: 'Grindmaw', bossIcon: 'fang' },
    { k: 'verdigrite', name: 'Verdigrite', col: '#5ad8a0', dark: '#1e5a3a', ring: 'the Kelp Grottos', boss: 'leafscale', bossName: 'Leafscale', bossFrom: 'the Frondwraith', bossIcon: 'scale' },
    { k: 'cindrite', name: 'Cindrite', col: '#ff8a3a', dark: '#6a1e10', ring: 'the Scald Vents', boss: 'magmashell', bossName: 'Magmashell', bossFrom: 'Scaldjaw', bossIcon: 'scale' },
    { k: 'fossilite', name: 'Fossilite', col: '#e8e0b0', dark: '#6a665a', ring: 'the Boneyard Hollows', boss: 'gravesteel', bossName: 'Gravesteel', bossFrom: 'the Gravekeeper', bossIcon: 'bar' },
    { k: 'nullstone', name: 'Nullstone', col: '#7a5ad8', dark: '#16121e', ring: 'the Hollow Dark', boss: null },
  ];
  RINGS.forEach((r) => {
    item({ id: r.k + '_ore', name: r.name + ' Ore', kind: 'material', icon: { s: 'ore', a: r.col, b: r.dark }, desc: 'Mined in ' + r.ring + '. Smelt 4 into a bar at a forge.' });
    item({ id: r.k + '_bar', name: r.name + ' Bar', kind: 'material', icon: { s: 'bar', a: r.col, b: r.dark }, desc: 'For ' + r.name + ' gear and the rune keeper.' });
    RW.register.recipe({ out: r.k + '_bar', in: { [r.k + '_ore']: 4 }, at: 'forge' });
    if (r.boss) item({ id: r.boss, name: r.bossName, kind: 'material', icon: { s: r.bossIcon, a: r.col, b: '#f0ead4' }, desc: 'Dropped by ' + r.bossFrom + '. The rune keeper carves the next rune from it.' });
  });

  // ---------------- the five sets ----------------
  const SETS = [
    { bar: 'coralite_bar', ore: 'fangstone', col: '#f08a6a', dk: '#8a3a30', glow: '#ffc0a0', melee: ['reefcleaver', 'Reefcleaver', 'sword', 85], bow: ['riptide_bow', 'Riptide Bow', 75], staff: ['brine_staff', 'Brine Staff', 52, 'shards'], helm: ['reef_helm', 'Reefguard Helm', 6], mail: ['reef_mail', 'Reefguard Mail', 8], n: [8, 2] },
    { bar: 'verdigrite_bar', ore: 'leafscale', col: '#5ad8a0', dk: '#1e5a3a', glow: '#b0ffd8', melee: ['frondscythe', 'Frondscythe', 'axe', 104], bow: ['kelpstring_bow', 'Kelpstring Bow', 92], staff: ['spore_staff', 'Spore Staff', 64, 'poison'], helm: ['frond_helm', 'Frondweave Hood', 7], mail: ['frond_mail', 'Frondweave Coat', 9], n: [10, 3] },
    { bar: 'cindrite_bar', ore: 'magmashell', col: '#ff8a3a', dk: '#6a1e10', glow: '#ffd0a0', melee: ['ventbreaker', 'Ventbreaker', 'hammer', 126], bow: ['cinder_bow', 'Cinder Bow', 110], staff: ['magma_wand', 'Magma Wand', 76, 'fire'], helm: ['scald_helm', 'Scald Helm', 8], mail: ['scald_mail', 'Scald Mail', 10], n: [12, 3] },
    { bar: 'fossilite_bar', ore: 'gravesteel', col: '#e8e0b0', dk: '#6a665a', glow: '#fff8d8', melee: ['gravecleaver', 'Gravecleaver', 'sword', 148], bow: ['ossified_bow', 'Ossified Bow', 130], staff: ['lich_lantern', 'Lich Lantern', 90, 'lightning'], helm: ['grave_helm', 'Grave Helm', 9], mail: ['grave_mail', 'Grave Mail', 11], n: [14, 4] },
    { bar: 'nullstone_bar', ore: null, col: '#7a5ad8', dk: '#16121e', glow: '#c0a8ff', melee: ['nullblade', 'Nullblade', 'sword', 172], bow: ['void_longbow', 'Void Longbow', 152], staff: ['abyss_orb', 'Abyss Orb', 104, 'lightning'], helm: ['null_helm', 'Null Helm', 10], mail: ['null_mail', 'Null Mail', 12], n: [16, 0] },
  ];
  SETS.forEach((S, i) => {
    const ring = RINGS[i], need = (n, k) => Object.assign({ [S.bar]: n }, S.ore && k ? { [S.ore]: k } : {});
    const [mid, mname, ms, mdmg] = S.melee;
    W({ id: mid, name: mname, tier: 'ring' + (i + 1), dmg: mdmg, spd: ms === 'hammer' ? 0.62 : 0.42, knock: ms === 'hammer' ? 14 : 7, reach: ms === 'hammer' ? 32 : 30, icon: { s: ms, a: S.col, b: S.dk }, desc: 'Forged from ' + ring.name + '. Made in ' + ring.ring + '.' });
    const [bid, bname, bdmg] = S.bow;
    W({ id: bid, name: bname, tier: 'ring' + (i + 1), dmg: bdmg, spd: 0.4, knock: 3, ranged: { kind: 'arrow', spd: 520 + i * 30, grav: 160 }, icon: { s: 'bow', a: S.col, b: S.dk }, desc: 'A bow strung in ' + ring.ring + '.' });
    const [sid, sname, sdmg, sfx] = S.staff;
    W({ id: sid, name: sname, tier: 'ring' + (i + 1), dmg: sdmg, spd: 0.45, knock: 3, fx: sfx, ranged: { kind: 'spark', spd: 460 + i * 20, grav: 0 }, icon: { s: 'staff', a: S.dk, b: S.col }, desc: 'Magic of ' + ring.ring + '. Every swing throws a bolt.' });
    const [hid, hname, hdef] = S.helm, [aid, aname, adef] = S.mail;
    AR({ id: hid, name: hname, slot: 'head', def: hdef, tint: S.dk, glow: S.glow, icon: { s: 'helm', a: S.col, b: S.dk } });
    AR({ id: aid, name: aname, slot: 'body', def: adef, tint: S.dk, glow: S.glow, icon: { s: 'chest', a: S.col, b: S.dk } });
    const [bn, on] = S.n;
    [[mid, bn, on], [bid, bn, on], [sid, bn, on], [hid, Math.round(bn * 0.8), Math.max(0, on - 1)], [aid, Math.round(bn * 1.2), on]].forEach(([out, b, o]) => RW.register.recipe({ out, in: need(b, o), at: 'forge' }));
  });
  if (RW.ITEMS.scald_helm) RW.ITEMS.scald_helm.desc = 'Wear with the Scald Mail and the hot water of the Scald Vents cannot hurt you.';
  if (RW.ITEMS.scald_mail) RW.ITEMS.scald_mail.desc = 'Wear with the Scald Helm and the hot water of the Scald Vents cannot hurt you.';

  // ---------------- the Chillshell Charm ----------------
  R.item({ id: 't_chill', name: 'Chillshell Charm', kind: 'armor', slot: 'trinket', def: 0, stack: 1, v3trinket: true, icon: { s: 'v3glow', a: '#7ab8e8', b: 'dim' }, desc: 'Trinket (wear it: right-click). A cold shell from the Kelp Grottos: the scalding water of the Scald Vents cannot hurt you. (Superheated rock still burns.)' });
  RW.register.recipe({ out: 't_chill', in: { verdigrite_bar: 6, leafscale: 2 }, at: 'forge' });
  if (RW.v3lore) Object.assign(RW.v3lore, { t_chill: 'It is always cold, even in the hands of something that was born boiling.' });

  RW.v3ringItems = { RINGS, SETS };
})(window.RW);
