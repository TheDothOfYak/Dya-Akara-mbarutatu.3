/* ============================================================
   DYA'AKARA, in the world.
   The token game of the Mbaru Tatu, played for real: Torcain stands
   on the field and throws his tokens, and each one unfolds into a
   holographic creature — the truth of one individual, sung into
   stygian. The rules are the real Dya'Akara rules: this runs the
   very same deterministic match engine as the 2D game (js/engine/
   match.js) and draws it in 3D. Tokens never touch the living —
   not Torcain, not the folk watching, not the creatures nearby.
   ============================================================ */
import * as THREE from 'three';
import { toon, glowSprite } from './gfx.js';
import { buildPunk, buildEikar } from './actors.js';
import { buildRodak, buildKipsu, buildAlbali, buildTyndael, buildSruVorn, buildKofi } from './creatures.js';
import { buildKeilia } from './npcs.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
export const engineReady = () => !!(window.DYA && window.DYA.match && window.DYA.token && window.DYA.species);
const DY = () => window.DYA;

/* ---------------- scale: one setting per match ----------------
   metres per engine unit. The engine's field is 1600 × 1000. Every token
   keeps its size relative to the others; at Life-size the largest of each
   species stands at its true size. */
export const SCALES = [
  { id: 'small', name: 'Small', m: 0.02, desc: '32 × 20 m. Fits in a square; even a Skaar is knee-high.' },
  { id: 'field', name: 'Field', m: 0.05, desc: '80 × 50 m. Big tokens tower over you.' },
  { id: 'life', name: 'Life-size', m: 0.1, desc: '160 × 100 m. Every token at its true size. Needs room.' },
];
export const ELEMENT_COL = { Fti: '#f0f0f5', Su: '#3b9ae1', Eldi: '#e8842c', Ular: '#4caf50' };
export const ELEMENT_NAME = { Fti: 'Air', Su: 'Water', Eldi: 'Fire', Ular: 'Earth' };

/* ---------------- the collection ---------------- */
export function freshCollection() { return { tokens: {}, pouch: [], record: {}, wins: 0, losses: 0, played: 0, okid: false, seed: 1 }; }

/* how likely a minted token of each size class is to be kept — big tokens are rare */
const SIZE_KEEP = [1, 0.9, 0.42, 0.16, 0.05];
export function mintToken(speciesId, seed, opts = {}) {
  const U = DY().util, TK = DY().token;
  const rng = new U.Rng((seed >>> 0) || 1);
  let tok = null;
  for (let i = 0; i < 10; i++) {
    const t = TK.mint({ speciesId, rng, rarity: opts.rarity });
    if (!tok || t.sizeIdx < tok.sizeIdx) tok = t;
    if (rng.range(0, 1) < SIZE_KEEP[t.sizeIdx]) { tok = t; break; }
  }
  if (opts.name) tok.name = opts.name;
  if (opts.isSelf) { tok.isSelf = true; tok.nameLocked = true; }
  tok.rpg = true;
  return tok;
}
export function addToken(coll, tok, toPouch = true) {
  coll.tokens[tok.id] = tok;
  if (toPouch && coll.pouch.length < 25) coll.pouch.push(tok.id);
  return tok;
}
/* the tokens Tanoc has carried since Velki — a few found, a few "borrowed" */
export function starterCollection(seed) {
  const c = freshCollection();
  const sp = DY().species;
  const list = [['sword_eikar', { name: 'Torcain', isSelf: true }], ['wild_punk'], ['domestic_punk'], ['kipsu'], ['kipsu'], ['rodak'], ['albali_byrd'], ['raf_krabbi']];
  list.forEach(([id, o], i) => {
    const s = sp.get(id);
    addToken(c, mintToken(id, seed * 31 + i * 977, Object.assign({ rarity: s.rarity[0] }, o || {})));
  });
  return c;
}
export const tokenList = coll => Object.values(coll.tokens);

/* creature parts sung into tokens with an Okid'Relic */
export const SINGING = [
  { part: 'vine', species: 'wild_punk' },
  { part: 'shaving', species: 'domestic_punk' },
  { part: 'stem', species: 'malsti_punk' },
  { part: 'fluff', species: 'kipsu' },
  { part: 'oil', species: 'rodak' },
  { part: 'horn', species: 'albali_byrd' },
  { part: 'thorn', species: 'albali_villtur' },
  { part: 'ember', species: 'tyndael' },
  { part: 'tusk', species: 'sru_vorn' },
];
export const SING_COST = { ore: 1, shards: 20 };

/* ---------------- rivals: who will play you, and with what ---------------- */
export const RIVALS = {
  xilia: {
    venkin: { name: 'Venkin', skill: 0.45, size: 7, species: ['domestic_punk', 'wild_punk', 'kipsu', 'builder_keilia', 'rodak', 'stryx', 'ular_grothyn', 'kipsu'], intro: 'Dya’Akara? Right now? I’ve been waiting all WEEK. Pick a scale — I’ll take the red side.' },
    sefa: { name: 'Sefa', skill: 0.25, size: 5, species: ['kipsu', 'kipsu', 'wild_punk', 'albali_byrd', 'domestic_punk', 'mikolo_moko'], intro: 'I only have little ones. But they’re FAST.' },
    v4: { name: 'Bosk', skill: 0.55, size: 7, species: ['raf_krabbi', 'harkal', 'su_grothyn', 'albali_byrd', 'wild_punk', 'rodak', 'raf_krabbi', 'kuni_byrd_wild'], intro: 'Dockside rules: no crying, no take-backs.' },
  },
  leotik: {
    venkin: { name: 'Venkin', skill: 0.7, size: 9, species: ['domestic_punk', 'builder_keilia', 'sword_keilia', 'ular_grothyn', 'stryx', 'kipsu', 'tonguatjis', 'rodak', 'archer_keilia'], intro: 'Stranded on a whole new Tatu and you want to play? …Obviously yes.' },
    kesh: { name: 'Kesh', skill: 0.8, size: 8, species: ['malsti_punk', 'malsti_punk', 'rodak', 'tyndael', 'albali_villtur', 'spear_eikar', 'lutut', 'archer_eikar'], intro: 'The Duskareth play this too, you know. We just cheat better.' },
    ila: { name: 'Ila Vos', skill: 0.65, size: 8, species: ['makari_swarm', 'tonguatjis', 'albali_villtur', 'raf_krabbi', 'su_grothyn', 'harkal', 'chemist_eikar', 'eldi_grothyn'], intro: 'Everything I own is poisonous. My tokens too.' },
  },
};
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rivalPouch(region, id) {
  const R = RIVALS[region][id];
  const base = hashStr(region + ':' + id);
  return R.species.slice(0, R.size).map((sp, i) => mintToken(sp, base + i * 7919));
}

/* ================================================================
   3D models for every species — the RPG's own creatures where they
   exist, and simple sculpted stand-ins for the rest
   ================================================================ */
const mat = (c, o = {}) => toon(c, o);
function simple(build) {
  const root = new THREE.Group(); const parts = build(root) || {};
  let ph = Math.random() * 6;
  return {
    root,
    animate(dt, st) { ph += dt * (3 + st.speed * 2); if (parts.bob) parts.bob.position.y = parts.bobY + Math.sin(ph) * (st.speed > 0.3 ? 0.08 : 0.03); if (parts.spin) parts.spin.rotation.y += dt * (parts.spinRate || 1); if (parts.flap) parts.flap.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.sin(ph * 2.2) * 0.6; }); if (parts.anim) parts.anim(dt, st, ph); },
    flash() {},
  };
}
function rockLump(r, col) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mat(col)); m.scale.y = 0.75; return m; }
function quad(o) {
  // a generic four-legged body: Naga, Grothyn, Hvaleia, Tonguatjis, Harkal, Big Momma Kofi
  return simple(root => {
    const body = new THREE.Group(); body.position.y = o.h || 1; root.add(body);
    const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), mat(o.col)); torso.scale.set(o.w || 0.8, o.t || 0.6, o.l || 1.4); body.add(torso);
    if (o.shell) { const sh = new THREE.Mesh(new THREE.SphereGeometry(1.05, 14, 8, 0, TAU, 0, Math.PI / 2), mat(o.shell)); sh.scale.set((o.w || 0.8) * 1.05, (o.t || 0.6) * 1.4, (o.l || 1.4) * 0.95); body.add(sh); }
    for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, o.h || 1, 6), mat(o.leg || o.col)); l.position.set(x * (o.w || 0.8) * 0.7, (o.h || 1) / 2, z * (o.l || 1.4) * 0.55); root.add(l); }
    const heads = o.heads || 1;
    for (let i = 0; i < heads; i++) {
      const a = (i - (heads - 1) / 2) * 0.35;
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, o.neck || 0.6, 6), mat(o.col)); neck.position.set(Math.sin(a) * 0.4, (o.h || 1) + 0.3 + (o.neck || 0.6) / 2 - 0.3, (o.l || 1.4) * 0.85); neck.rotation.x = 0.7; neck.rotation.z = -a; root.add(neck);
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.6, 6), mat(o.head || o.col)); head.rotation.x = Math.PI / 2; head.position.set(Math.sin(a) * 0.6, (o.h || 1) + (o.neck || 0.6) * 0.7, (o.l || 1.4) * 0.85 + 0.55); root.add(head);
    }
    if (o.tail) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.2, 6), mat(o.col)); t.rotation.x = -Math.PI / 2 - 0.2; t.position.set(0, o.h || 1, -(o.l || 1.4) - 0.4); root.add(t); if (o.club) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), mat(o.club)); c.position.set(0, (o.h || 1) - 0.2, -(o.l || 1.4) - 1.0); root.add(c); } }
    if (o.glow) { const g = glowSprite(o.glow, 2.2, 0.35); g.position.y = o.h || 1; root.add(g); }
    return { bob: body, bobY: o.h || 1 };
  });
}
function bipedSmall(col, capCol) {
  return simple(root => {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.4, 4, 8), mat(col)); body.position.y = 0.6; root.add(body);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 6, 0, TAU, 0, Math.PI / 2), mat(capCol)); cap.position.y = 0.95; root.add(cap);
    return { bob: body, bobY: 0.6 };
  });
}
const EIKAR_LOOK = {
  sword_eikar: { skin: '#a8743e', cap: '#4a2a14', weapon: 'axe', emblem: 0xffd27a },
  spear_eikar: { skin: '#b8844a', cap: '#3a2a1a', weapon: 'spear', emblem: 0x9adfff },
  archer_eikar: { skin: '#9a6a3a', cap: '#2a3a1a', weapon: 'spear', emblem: 0x9aff9a },
  chemist_eikar: { skin: '#b07a48', cap: '#3a1a3a', weapon: 'axe', emblem: 0xc8a0ff },
};
export function speciesModel(id) {
  const sp = DY().species.get(id) || {};
  switch (id) {
    case 'wild_punk': return buildPunk(false);
    case 'domestic_punk': return buildPunk(false, { domestic: true, blanket: 0x8a2a3a });
    case 'malsti_punk': return buildPunk(true);
    case 'kipsu': return buildKipsu(0.75);
    case 'rodak': return buildRodak();
    case 'kofi': return buildKofi();
    case 'big_momma_kofi': { const k = buildKofi(); k.root.scale.setScalar(2.6); return k; }
    case 'albali_byrd': return buildAlbali(false);
    case 'albali_villtur': return buildAlbali(true);
    case 'kuni_byrd_wild': case 'kuni_byrd_ridden': { const b = buildAlbali(false); b.root.scale.setScalar(1.25); return b; }
    case 'tyndael': return buildTyndael();
    case 'sru_vorn': return buildSruVorn();
    case 'sword_eikar': case 'spear_eikar': case 'archer_eikar': case 'chemist_eikar': {
      const L = EIKAR_LOOK[id]; return buildEikar({ skin: L.skin, cap: L.cap, weapon: L.weapon, emblem: L.emblem, marking: 0xf3dca0, build: 1, leg: 0x4a2a14, foot: 0x2a1a0a, beltColor: 0x5a3420 });
    }
    case 'sword_keilia': case 'spear_keilia': case 'archer_keilia': case 'builder_keilia': return buildKeilia({ skin: 0xc8a070, hair: id === 'builder_keilia' ? 0x7a5232 : 0x4a2a1a });
    case 'karnen': return bipedSmall(0x9a8a6a, 0x5a4a3a);
    case 'uff': return bipedSmall(0xd8b8a0, 0xa07a6a);
    case 'ular_naga': return quad({ col: 0x5a7a3a, head: 0x4a6a2a, heads: 3, neck: 1.6, h: 1.3, l: 2.2, w: 1, tail: true, club: 0x8a8a6a });
    case 'su_naga': return quad({ col: 0x2a6a8a, head: 0x1a5a7a, heads: 3, neck: 1.8, h: 1.3, l: 2.3, w: 1, tail: true, glow: 0x6ad8ff });
    case 'hvaleia': return quad({ col: 0x3a7aa8, h: 1.4, l: 2.6, w: 1.2, t: 0.8, tail: true, club: 0x2a5a8a });
    case 'ular_grothyn': return quad({ col: 0x6a5a3a, shell: 0x5a7a3a, h: 0.6, l: 1.1, w: 1.0 });
    case 'su_grothyn': return quad({ col: 0x4a6a7a, shell: 0x3a8aa8, h: 0.6, l: 1.1, w: 1.0 });
    case 'eldi_grothyn': return quad({ col: 0x7a4a2a, shell: 0xc8602a, h: 0.6, l: 1.1, w: 1.0, glow: 0xff8a3a });
    case 'tonguatjis': return quad({ col: 0x6a6a4a, shell: 0x8a7a5a, h: 0.7, l: 1.4, w: 1.1, neck: 0.3 });
    case 'harkal': return quad({ col: 0x5a7a8a, h: 0.9, l: 1.5, w: 0.6, t: 0.5, tail: true });
    case 'stryx': return simple(root => {
      const rock = rockLump(0.9, 0x7d766a); rock.position.y = 0.7; root.add(rock);
      for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), new THREE.MeshBasicMaterial({ color: 0x9aff6a })); e.position.set(s * 0.25, 0.85, 0.75); root.add(e); }
      for (let i = 0; i < 4; i++) { const v = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.4, 5), mat(0x4d7a44)); const a = i / 4 * TAU; v.position.set(Math.cos(a) * 0.3, 1.8, Math.sin(a) * 0.3); v.rotation.set(Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5); root.add(v); }
      for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 5, 12, Math.PI * 1.4), mat(0x5a5248)); h.position.set(s * 0.6, 1.4, 0); h.rotation.y = Math.PI / 2; root.add(h); }
    });
    case 'gynge': return simple(root => { const r = rockLump(0.8, 0x6a6058); r.position.y = 0.45; root.add(r); const g = glowSprite(0xff8a3a, 0.9, 0.5); g.position.set(0, 0.25, 0.7); root.add(g); });
    case 'albali_aagac': return simple(root => { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 3, 8), mat(0x6a4a2a)); t.position.y = 1.5; root.add(t); const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8, 1), mat(0xd8e0a0)); c.position.y = 3.6; root.add(c); });
    case 'lutut': return simple(root => {
      const body = new THREE.Group(); body.position.y = 2.2; root.add(body);
      const t = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8), mat(0x4a3a5a)); t.scale.set(0.7, 0.6, 1.4); body.add(t);
      const wings = [];
      for (const s of [-1, 1]) { const piv = new THREE.Group(); body.add(piv); const w = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.6, 3), mat(0x6a4a8a)); w.rotation.z = s * Math.PI / 2; w.position.x = s * 1.4; w.scale.z = 0.15; piv.add(w); wings.push(piv); }
      return { bob: body, bobY: 2.2, flap: wings };
    });
    case 'rubbermcfly': return simple(root => {
      const body = new THREE.Group(); body.position.y = 1.2; root.add(body);
      body.add(new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), mat(0xffe08a)));
      const wings = [];
      for (const s of [-1, 1]) { const piv = new THREE.Group(); body.add(piv); const w = new THREE.Mesh(new THREE.CircleGeometry(0.3, 10), new THREE.MeshBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.6, side: THREE.DoubleSide })); w.position.x = s * 0.32; w.rotation.y = Math.PI / 2; piv.add(w); wings.push(piv); }
      const g = glowSprite(0xffe08a, 1.4, 0.6); body.add(g);
      return { bob: body, bobY: 1.2, flap: wings };
    });
    case 'makari_swarm': return simple(root => {
      const sw = new THREE.Group(); sw.position.y = 0.8; root.add(sw);
      for (let i = 0; i < 18; i++) { const b = glowSprite(i % 2 ? 0x9aff6a : 0xff9ad0, 0.35, 0.85); b.position.set((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 1.6); sw.add(b); }
      return { spin: sw, spinRate: 2 };
    });
    case 'mikolo_moko': return simple(root => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), mat(0xb89a6a)); b.position.y = 0.35; root.add(b); const t = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), mat(0x6a5a3a)); t.position.set(0, 0.4, -0.35); root.add(t); return { bob: b, bobY: 0.35 }; });
    case 'raf_krabbi': return simple(root => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), mat(0x3a8aa8)); b.scale.set(1.3, 0.5, 1); b.position.y = 0.35; root.add(b);
      for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mat(0x5aaac8)); c.scale.set(1, 0.7, 1.4); c.position.set(s * 0.55, 0.4, 0.35); root.add(c); }
      const g = glowSprite(0x9adfff, 0.9, 0.4); g.position.y = 0.5; root.add(g);
      return { bob: b, bobY: 0.35 };
    });
    default: {
      // fruits, fields and Relic shavings: small glowing things
      const col = { Fti: 0xf0f0f5, Su: 0x3b9ae1, Eldi: 0xe8842c, Ular: 0x4caf50 }[sp.element] || 0xd8c098;
      return simple(root => { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), mat(col, { emissive: col, emissiveIntensity: 0.3 })); b.position.y = 0.35; root.add(b); const g = glowSprite(col, 1, 0.5); g.position.y = 0.35; root.add(g); return { spin: b }; });
    }
  }
}

/* turn a model into a hologram: solid enough to read, washed with a faint
   holo-light, and edged in its team colour */
function hologram(model, teamCol) {
  const tc = new THREE.Color(teamCol), holo = new THREE.Color(0x9adfff);
  model.root.traverse(o => {
    if (o.isSprite) { o.material = o.material.clone(); o.material.opacity *= 0.3; return; }
    if (!o.isMesh || !o.material) return;
    const c = o.material.clone();
    if (o.name === 'outline') { c.color = tc.clone(); }
    else if (c.emissive) { c.emissive = c.emissive.clone().lerp(holo, 0.1); c.userData.baseEI = c.emissiveIntensity ?? 1; }
    o.material = c; o.castShadow = false;
  });
  return model;
}

/* measure a model's natural footprint radius once */
const natural = {};
function naturalRadius(id, model) {
  if (natural[id]) return natural[id];
  model.root.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(model.root), s = new THREE.Vector3(); b.getSize(s);
  return (natural[id] = Math.max(0.25, Math.max(s.x, s.z) / 2));
}
/* species' true size in metres (footprint radius at its largest size class) */
const LIFE_R = { kofi: 0.3, big_momma_kofi: 0.8, kipsu: 0.55, rodak: 0.7, wild_punk: 0.9, domestic_punk: 1.2, malsti_punk: 0.2, tyndael: 0.7, albali_byrd: 1.2, albali_villtur: 1.2, kuni_byrd_wild: 1.6, kuni_byrd_ridden: 1.6, sru_vorn: 2.6, ular_naga: 3.4, su_naga: 3.8, hvaleia: 3.6, lutut: 2.8, stryx: 1.1, gynge: 1.4, sword_eikar: 0.45, spear_eikar: 0.45, archer_eikar: 0.45, chemist_eikar: 0.45, sword_keilia: 0.8, spear_keilia: 0.8, archer_keilia: 0.8, builder_keilia: 0.85, karnen: 0.35, uff: 0.35, raf_krabbi: 0.45, harkal: 1.0, ular_grothyn: 1.1, su_grothyn: 1.1, eldi_grothyn: 1.1, tonguatjis: 1.4, makari_swarm: 0.9, mikolo_moko: 0.35, rubbermcfly: 0.3, albali_aagac: 2.2 };

/* ================================================================
   THE MATCH, in 3D
   ================================================================ */
export class DyaMatch3D {
  /* ctx: { scene, particles, sfx, toast, bark, playerPos(), handPos(), onEnd(result) }
     o:   { mode, scale, origin, yaw, planeY, myName, myPouch, rival:{name, skill, pouch, actorPos()}, terrain } */
  constructor(ctx, o) {
    this.ctx = ctx; this.o = o;
    this.m = o.scale.m;
    this.fwd = V3(Math.sin(o.yaw), 0, Math.cos(o.yaw));
    this.right = V3(Math.cos(o.yaw), 0, -Math.sin(o.yaw));
    const D = DY();
    const deep = t => JSON.parse(JSON.stringify(t));
    this.seed = (Math.random() * 1e9) >>> 0;
    const duel = o.mode === 'duel';
    this.M = new D.match.Match({
      seed: this.seed, mode: duel ? 'duel' : 'standard', terrain: o.terrain || 'plains',
      settings: { pulseInterval: 8, pulseAmount: 2 },
      teams: [
        { name: o.myName, controller: 'human', pouch: (duel ? o.myPouch.slice(0, 1) : o.myPouch).map(deep), color: '#d9b87a' },
        { name: o.rival.name, controller: 'ai', aiSkill: o.rival.skill, pouch: (duel ? o.rival.pouch.slice(0, 1) : o.rival.pouch).map(deep), color: '#b05a5a' },
      ],
    });
    this.M.headless = true;
    this.group = new THREE.Group(); ctx.scene.add(this.group);
    this.views = new Map(); this.projViews = new Map(); this.zoneViews = new Map(); this.structViews = new Map();
    this.seenEffects = new Set(); this.flights = [];
    this.sel = 0; this.slot = -1; this.lastPulse = 0; this.evIdx = 0; this.done = false;
    this.buildField();
    this.buildHud();
    this.seenEv = new WeakSet();
  }

  /* engine (x, y) → world, and back */
  toWorld(x, y, h = 0) {
    const dx = (x - 800) * this.m, dz = (y - 500) * this.m;
    return V3(this.o.origin.x + this.fwd.x * dx + this.right.x * dz, this.o.planeY + h, this.o.origin.z + this.fwd.z * dx + this.right.z * dz);
  }
  toEngine(p) {
    const d = V3(p.x - this.o.origin.x, 0, p.z - this.o.origin.z);
    return { x: d.dot(this.fwd) / this.m + 800, y: d.dot(this.right) / this.m + 500 };
  }
  inField(e) { return e.x >= 20 && e.x <= 1580 && e.y >= 20 && e.y <= 980; }

  buildField() {
    const W = 1600 * this.m, H = 1000 * this.m, g = this.group;
    const yaw = this.o.yaw;
    // the projected ground: a faint grid inside a glowing frame
    const grid = new THREE.GridHelper(1, 16, 0x9adfff, 0x9adfff);
    grid.material.transparent = true; grid.material.opacity = 0.12; grid.material.depthWrite = false;
    grid.scale.set(W, 1, H); grid.rotation.y = yaw; grid.position.set(this.o.origin.x, this.o.planeY + 0.04, this.o.origin.z); g.add(grid);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ color: 0x6ab8ff, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide }));
    plane.rotation.x = -Math.PI / 2; plane.rotation.z = yaw + Math.PI / 2; plane.position.set(this.o.origin.x, this.o.planeY + 0.03, this.o.origin.z); g.add(plane);
    const frame = [[20, 20], [1580, 20], [1580, 980], [20, 980], [20, 20]].map(([x, y]) => this.toWorld(x, y, 0.08));
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(frame), new THREE.LineBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.8 })));
    // the tether: past 80% of the way to the edge, tokens begin to fade
    const teth = [];
    for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU; teth.push(this.toWorld(800 + Math.cos(a) * 800 * 0.8, 500 + Math.sin(a) * 500 * 0.8, 0.07)); }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(teth), new THREE.LineDashedMaterial({ color: 0xffd27a, transparent: true, opacity: 0.35, dashSize: 0.6, gapSize: 0.4 })));
    // hoards and Relics
    this.relicViews = [];
    this.M.teams.forEach((T, i) => {
      const col = new THREE.Color(T.color);
      const c = this.toWorld(T.hoard.x, T.hoard.y, 0.1);
      const ring = new THREE.Mesh(new THREE.RingGeometry(70 * this.m * 0.92, 70 * this.m, 48), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.copy(c); g.add(ring);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(70 * this.m, 48), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.12, depthWrite: false }));
      disc.rotation.x = -Math.PI / 2; disc.position.copy(c); g.add(disc);
      const relic = new THREE.Group();
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(Math.max(0.18, 14 * this.m), 0), new THREE.MeshBasicMaterial({ color: col }));
      relic.add(gem); relic.add(glowSprite(T.color, Math.max(0.8, 60 * this.m), 0.7));
      g.add(relic); this.relicViews.push(relic);
    });
    // terrain props as holographic rocks and trees (they only dress the field)
    for (const p of this.M.props) {
      if (p.kind === 'grass') continue;
      const s = p.s * 22 * this.m;
      let mesh;
      if (p.kind === 'trees' || p.kind === 'firetrees') { mesh = new THREE.Mesh(new THREE.ConeGeometry(s * 0.8, s * 3, 7), new THREE.MeshBasicMaterial({ color: 0x5aa86a, transparent: true, opacity: 0.25, depthWrite: false })); mesh.position.copy(this.toWorld(p.x, p.y, s * 1.5)); }
      else { mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), new THREE.MeshBasicMaterial({ color: 0xa8b8c8, transparent: true, opacity: 0.22, depthWrite: false })); mesh.position.copy(this.toWorld(p.x, p.y, s * 0.4)); }
      g.add(mesh);
    }
    // aim marker
    this.aim = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.65, 32), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    this.aim.rotation.x = -Math.PI / 2; this.aim.visible = false; g.add(this.aim);
  }

  /* ---------------- HUD ---------------- */
  buildHud() {
    let el = document.getElementById('dya-hud');
    if (!el) { el = document.createElement('div'); el.id = 'dya-hud'; document.body.appendChild(el); }
    el.innerHTML = `<div class="dh-top"><div class="dh-title"></div><div class="dh-res"></div><div class="dh-pulse"><i></i></div></div>
      <div class="dh-feed"></div><div class="dh-slots"></div><div class="dh-pouch"></div>
      <div class="dh-help">Q / E choose a token · R ready it · 1–5 pick a readied token · Click throw · V overview · Esc concede</div>`;
    el.style.display = '';
    this.hud = el;
    this.hudKey = '';
  }
  hudRender() {
    const M = this.M, me = M.teams[0], op = M.teams[1];
    const scaleName = this.o.scale.name;
    const res = e => `<span class="dh-r" style="--c:${ELEMENT_COL[e]}"><b>${me.resources[e]}</b>${ELEMENT_NAME[e]}</span>`;
    const pouch = me.pouch;
    if (this.sel >= pouch.length) this.sel = 0;
    const cards = [];
    for (let k = -2; k <= 2; k++) {
      const i = (this.sel + k + pouch.length * 5) % pouch.length;
      const e = pouch[i]; if (!e) continue;
      const cost = DY().token.costVec(e.tok);
      const tax = e.deaths || 0;
      const cstr = Object.entries(cost).filter(([, v]) => v).map(([el2, v]) => `<i style="background:${ELEMENT_COL[el2]}"></i>${v}`).join(' ') + (tax ? ` <em>+${tax}</em>` : '');
      const st = e.state === 'pouch' ? '' : e.state === 'readied' ? 'readied' : e.state === 'played' ? 'on the field' : e.state;
      cards.push(`<div class="dh-card${k === 0 ? ' on' : ''}${e.state !== 'pouch' ? ' used' : ''}"><b>${esc(e.tok.name)}</b><small>${DY().species.SIZES[e.tok.sizeIdx]} · ${DY().species.RARITIES[e.tok.rarity]}</small><span>${cstr}</span>${st ? `<u>${st}</u>` : ''}</div>`);
    }
    const slots = me.readied.map((e, i) => `<div class="dh-slot${i === this.slot ? ' on' : ''}${e.readiedAtPulse === M.pulseIndex && M.mode !== 'hunt' ? ' wait' : ''}"><kbd>${i + 1}</kbd>${esc(e.tok.name)}</div>`).join('') || '<div class="dh-slot empty">Nothing readied — R</div>';
    const feed = M.events.slice(-3).map(ev => `<div>${esc(ev.msg)}</div>`).join('');
    const opTotal = op.resources.Fti + op.resources.Su + op.resources.Eldi + op.resources.Ular;
    const title = M.mode === 'duel' ? `Dya’Akara duel · ${esc(me.name)} vs ${esc(op.name)} · ${scaleName}` : `Dya’Akara · ${esc(me.name)} vs ${esc(op.name)} · ${scaleName} · their resources ${opTotal}`;
    const key = [title, ['Fti', 'Su', 'Eldi', 'Ular'].map(e => me.resources[e]).join(), cards.join(''), slots, feed].join('|');
    if (key !== this.hudKey) {
      this.hudKey = key;
      this.hud.querySelector('.dh-title').innerHTML = title;
      this.hud.querySelector('.dh-res').innerHTML = M.mode === 'duel' ? '' : ['Fti', 'Su', 'Eldi', 'Ular'].map(res).join('');
      this.hud.querySelector('.dh-pouch').innerHTML = M.mode === 'duel' ? '' : cards.join('');
      this.hud.querySelector('.dh-slots').innerHTML = M.mode === 'duel' ? '' : slots;
      this.hud.querySelector('.dh-feed').innerHTML = feed;
    }
    const pi = M.settings.pulseInterval || 8;
    const frac = M.mode === 'duel' ? 1 : 1 - Math.max(0, (M.nextPulseAt - M.time)) / pi;
    this.hud.querySelector('.dh-pulse i').style.width = (frac * 100).toFixed(1) + '%';
  }

  /* ---------------- input ---------------- */
  key(code) {
    const me = this.M.teams[0];
    if (this.M.mode === 'duel') return code === 'KeyQ' || code === 'KeyE' || code === 'KeyR' || /^Digit[1-5]$/.test(code);
    if (code === 'KeyQ') { this.sel = (this.sel - 1 + me.pouch.length) % me.pouch.length; return true; }
    if (code === 'KeyE') { this.sel = (this.sel + 1) % me.pouch.length; return true; }
    if (code === 'KeyR') { this.M.queueInput(0, { type: 'ready', pouchIdx: this.sel }); return true; }
    const n = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].indexOf(code);
    if (n >= 0) { this.slot = n < me.readied.length ? n : -1; return true; }
    return false;
  }
  /* throw the selected readied token at a point on the field */
  throwAt(point) {
    const me = this.M.teams[0];
    if (this.M.mode === 'duel') return;
    if (this.slot < 0 || !me.readied[this.slot]) { this.ctx.toast(me.readied.length ? 'Pick a readied token first (1–5).' : 'Ready a token first (R).', 1.6); return; }
    const entry = me.readied[this.slot];
    if (entry.readiedAtPulse === this.M.pulseIndex) { this.ctx.toast('It’s still waking — wait for the next pulse.', 1.6); return; }
    if (!point) { this.ctx.toast('Aim at the field.', 1.4); return; }
    const e = this.toEngine(point);
    if (!this.inField(e)) { this.ctx.toast('That’s outside the field.', 1.4); return; }
    const slot = this.slot; const tokId = entry.tok.id;
    this.flight(this.ctx.handPos(), point, '#d9b87a', () => {
      const idx = me.readied.findIndex(r => r.tok.id === tokId);
      if (idx >= 0) this.M.queueInput(0, { type: 'trigger', slot: idx, x: e.x, y: e.y });
    });
    this.slot = -1;
    this.ctx.sfx.blink && this.ctx.sfx.blink();
    return slot;
  }
  flight(from, to, col, land) {
    const disc = new THREE.Group();
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 16), new THREE.MeshBasicMaterial({ color: col }));
    disc.add(d); disc.add(glowSprite(col, 0.9, 0.8));
    disc.position.copy(from); this.group.add(disc);
    const dist = from.distanceTo(to);
    this.flights.push({ disc, from: from.clone(), to: to.clone(), t: 0, dur: Math.min(1.1, 0.35 + dist * 0.02), h: Math.min(6, 1 + dist * 0.25), land });
  }
  updateAim(point) {
    const ok = this.slot >= 0 && point && this.inField(this.toEngine(point));
    this.aim.visible = !!(this.slot >= 0 && point);
    if (point) { this.aim.position.set(point.x, this.o.planeY + 0.1, point.z); this.aim.material.color.set(ok ? 0xffd27a : 0xff5a5a); const s = Math.max(0.5, 30 * this.m); this.aim.scale.setScalar(s); }
  }

  /* ---------------- per frame ---------------- */
  update(dt, t) {
    const M = this.M;
    if (!M.over) M.step(dt);
    // the rival throws their tokens too
    for (const ev of M.events) {
      if (this.seenEv.has(ev)) continue;
      this.seenEv.add(ev);
      if (ev.kind === 'deploy' && ev.team === 1 && this.o.rival.actorPos) {
        const c = M.creatures.filter(c => c.team === 1).sort((a, b) => b.spawnTick - a.spawnTick)[0];
        if (c) this.flight(this.o.rival.actorPos(), this.toWorld(c.x, c.y, 0.3), '#b05a5a', () => {});
      }
      if (ev.kind === 'relic' && this.ctx.bark) this.ctx.bark(ev.msg);
    }
    if (M.pulseIndex !== this.lastPulse) {
      this.lastPulse = M.pulseIndex;
      const c = this.toWorld(800, 500, 0.2);
      this.ctx.particles.ring(c.x, c.y, c.z, 70, 800 * this.m * 0.5, { color: 0x9adfff, size: Math.max(0.3, 10 * this.m), life: 1.1, drag: 0.2 });
    }
    // creatures
    const live = new Set();
    for (const c of M.creatures) {
      live.add(c.id);
      let v = this.views.get(c.id);
      if (!v) { v = this.spawnView(c); this.views.set(c.id, v); }
      this.syncView(v, c, dt, t);
    }
    for (const [id, v] of this.views) if (!live.has(id) && !v.dying) { v.dying = 0.01; }
    for (const [id, v] of this.views) if (v.dying) { v.dying += dt; const k = Math.max(0, 1 - v.dying / 0.6); v.model.root.scale.setScalar(v.scale * k); if (k <= 0) { this.group.remove(v.wrap); this.views.delete(id); } }
    // relics
    M.relics.forEach((r, i) => {
      const view = this.relicViews[i]; if (!view) return;
      view.visible = !r.disabled && !r.captured;
      let p;
      if (r.carrier) { const cr = M.creatures.find(c => c.id === r.carrier || c === r.carrier); p = cr ? this.toWorld(cr.x, cr.y, Math.max(0.6, cr.radius * this.m * 2.6)) : this.toWorld(r.x, r.y, 0.5); }
      else p = this.toWorld(r.x, r.y, Math.max(0.4, 18 * this.m) + Math.sin(t * 2 + i) * 0.1);
      view.position.copy(p); view.rotation.y = t * 1.5;
    });
    // projectiles
    const pl = new Set();
    for (const p of M.projectiles) {
      pl.add(p);
      let v = this.projViews.get(p);
      if (!v) { v = glowSprite(p.type === 'jet' ? 0x6ad8ff : p.type === 'hanii' ? 0xffe08a : 0xffffff, Math.max(0.3, 10 * this.m), 0.9); this.group.add(v); this.projViews.set(p, v); }
      v.position.copy(this.toWorld(p.x, p.y, Math.max(0.4, 14 * this.m)));
    }
    for (const [p, v] of this.projViews) if (!pl.has(p)) { this.group.remove(v); this.projViews.delete(p); }
    // zones: fire patches, bogs, water, forest
    const zl = new Set();
    for (const z of M.zones) {
      zl.add(z);
      let v = this.zoneViews.get(z);
      if (!v) {
        const col = { fire: 0xff7a2a, bog: 0x8fbf3f, acid: 0x8fbf3f, water: 0x3b9ae1, forest: 0x2f6a3a }[z.type] || 0x9adfff;
        v = new THREE.Mesh(new THREE.CircleGeometry(z.r * this.m, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: z.type === 'fire' ? 0.45 : 0.25, depthWrite: false }));
        v.rotation.x = -Math.PI / 2; this.group.add(v); this.zoneViews.set(z, v);
      }
      v.position.copy(this.toWorld(z.x, z.y, 0.06));
      if (z.type === 'fire' && Math.random() < 0.3) { const q = this.toWorld(z.x + (Math.random() - 0.5) * z.r, z.y + (Math.random() - 0.5) * z.r, 0.1); this.ctx.particles.emit(q.x, q.y, q.z, { vy: 1.5, color: 0xff8a2a, size: Math.max(0.2, 8 * this.m), life: 0.6, speed: 0.5 }); }
    }
    for (const [z, v] of this.zoneViews) if (!zl.has(z)) { this.group.remove(v); this.zoneViews.delete(z); }
    // builder structures
    const sl = new Set();
    for (const s of M.structures) {
      if (s.hp <= 0) continue;
      sl.add(s);
      let v = this.structViews.get(s);
      if (!v) {
        const w = (s.w || 30) * this.m, h = (s.kind === 'tower' ? 60 : s.kind === 'hut' ? 34 : 22) * this.m, d = (s.h || s.d || 30) * this.m;
        v = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.2, w), Math.max(0.2, h), Math.max(0.2, d)), new THREE.MeshBasicMaterial({ color: new THREE.Color(M.teams[s.team] ? M.teams[s.team].color : '#cccccc'), transparent: true, opacity: 0.4, depthWrite: false }));
        v.rotation.y = this.o.yaw; this.group.add(v); this.structViews.set(s, v); v.userData.h = h;
      }
      v.position.copy(this.toWorld(s.x, s.y, v.userData.h / 2));
    }
    for (const [s, v] of this.structViews) if (!sl.has(s)) { this.group.remove(v); this.structViews.delete(s); }
    // effects → particles, once each
    for (const ef of M.effects) {
      if (this.seenEffects.has(ef)) continue;
      this.seenEffects.add(ef);
      const p = this.toWorld(ef.x, ef.y, Math.max(0.3, 12 * this.m));
      const col = { deploy: 0x9adfff, hit: 0xffffff, breath: 0xff8a2a, teleport: 0xb48aff, heal: 0x9aff9a, electric: 0x9adfff, screech: 0xffe08a, shurgredan: 0xffd27a, swarmBurst: 0x9aff6a, biolum: 0x68e0c8, breathSu: 0x6ad8ff }[ef.type] || 0xffffff;
      this.ctx.particles.burst(p.x, p.y, p.z, ef.type === 'hit' ? 6 : 16, { color: col, speed: Math.max(1.5, 60 * this.m), size: Math.max(0.15, 7 * this.m), life: 0.5, gravity: 2 });
    }
    if (this.seenEffects.size > 400) this.seenEffects = new Set(M.effects);
    // flying tokens
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const f = this.flights[i]; f.t += dt / f.dur;
      const k = Math.min(1, f.t);
      f.disc.position.lerpVectors(f.from, f.to, k); f.disc.position.y += Math.sin(k * Math.PI) * f.h;
      f.disc.rotation.x += dt * 14;
      if (k >= 1) { this.group.remove(f.disc); this.flights.splice(i, 1); this.ctx.particles.burst(f.to.x, f.to.y + 0.3, f.to.z, 22, { color: 0x9adfff, speed: 4, size: 0.35, life: 0.6, gravity: 1 }); f.land(); }
    }
    this.hudRender();
    if (M.over && !this.done) { this.done = true; setTimeout(() => this.ctx.onEnd(M.result, this), 1600); }
  }

  spawnView(c) {
    const model = hologram(speciesModel(c.speciesId), this.M.teams[c.team] ? this.M.teams[c.team].color : '#cccccc');
    const nat = naturalRadius(c.speciesId, model);
    const sp = c.sp;
    const rel = DY().species.SIZE_RADIUS[c.sizeIdx] / DY().species.SIZE_RADIUS[sp.size[1]];
    const life = LIFE_R[c.speciesId] || 0.6;
    const scale = (life / nat) * rel * (this.m / 0.1);
    model.root.scale.multiplyScalar(scale);
    const wrap = new THREE.Group(); wrap.add(model.root); this.group.add(wrap);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(this.M.teams[c.team] ? this.M.teams[c.team].color : '#ccc'), transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; ring.scale.setScalar(Math.max(0.25, c.radius * this.m)); wrap.add(ring);
    wrap.position.copy(this.toWorld(c.x, c.y)); wrap.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model.root);
    const top = Math.max(0.3, box.max.y - wrap.position.y);
    const mats = []; model.root.traverse(o => { if (o.isMesh && o.material) mats.push({ material: o.material, base: o.material.opacity, transparent: o.material.transparent }); });
    const bar = document.createElement('div'); bar.className = 'dh-hp'; bar.innerHTML = '<i></i>'; this.hud.appendChild(bar);
    const p0 = this.toWorld(c.x, c.y);
    this.ctx.particles.burst(p0.x, p0.y + 0.5, p0.z, 24, { color: 0x9adfff, speed: 3, size: 0.3, life: 0.6 });
    return { model, wrap, ring, bar, top, mats, scale: model.root.scale.x, last: { x: c.x, y: c.y }, yaw: c.team === 0 ? this.o.yaw : this.o.yaw + Math.PI, hit: null, atk: 0, flashT: 0 };
  }
  syncView(v, c, dt, t) {
    const p = this.toWorld(c.x, c.y);
    v.wrap.position.copy(p);
    const dx = c.x - v.last.x, dy = c.y - v.last.y;
    const moved = Math.hypot(dx, dy);
    if (moved > 0.2) {
      const d = this.fwd.clone().multiplyScalar(dx).addScaledVector(this.right, dy);
      v.yaw = Math.atan2(d.x, d.z);
    }
    const tgt = c.intent && c.intent.attackTarget != null ? this.M.creatures.find(o => o.id === c.intent.attackTarget || o === c.intent.attackTarget) : null;
    if (tgt && Math.hypot(tgt.x - c.x, tgt.y - c.y) < c.attackRange + c.radius + tgt.radius + 30) {
      const d = this.fwd.clone().multiplyScalar(tgt.x - c.x).addScaledVector(this.right, tgt.y - c.y); v.yaw = Math.atan2(d.x, d.z);
    }
    const cur = v.model.root.rotation.y;
    let diff = v.yaw - cur; while (diff > Math.PI) diff -= TAU; while (diff < -Math.PI) diff += TAU;
    v.model.root.rotation.y = cur + diff * Math.min(1, dt * 8);
    const speed = (moved * this.m / Math.max(dt, 1e-3)) / Math.max(0.2, v.scale);
    v.last = { x: c.x, y: c.y };
    if (c.lastHitTick !== v.hit) { v.hit = c.lastHitTick; v.flashT = 1; }
    v.flashT = Math.max(0, v.flashT - dt * 5);
    if (c.state === 'attack') v.atk = Math.min(1, v.atk + dt * 6); else v.atk = Math.max(0, v.atk - dt * 4);
    v.model.animate(dt, { speed: Math.min(8, speed), t: t + c.id, onGround: true, windup: c.state === 'attack' ? 0.3 : 0, attack: v.atk, swing: v.atk, talking: false });
    if (v.model.flash) v.model.flash(v.flashT * 0.8);
    // fading at the tether
    const fade = c.tetherFrac > 0 ? 1 - Math.min(1, c.tetherFrac) * 0.8 : 1;
    const flick = 0.85 + Math.sin(t * 9 + c.id) * 0.15;
    for (const o of v.mats) {
      const mt = o.material;
      if (mt.emissive && mt.userData.baseEI != null) mt.emissiveIntensity = mt.userData.baseEI * flick;
      if (fade < 0.99) { mt.transparent = true; mt.opacity = o.base * fade; } else if (!o.transparent && mt.transparent) { mt.transparent = false; mt.opacity = o.base; }
    }
    // health bar, floating above
    v.bar.dataset.x = p.x; v.bar.dataset.y = p.y + v.top + 0.3; v.bar.dataset.z = p.z;
    v.bar.firstChild.style.width = Math.max(0, c.hp / c.maxHp * 100) + '%';
    v.bar.style.borderColor = this.M.teams[c.team] ? this.M.teams[c.team].color : '#ccc';
    v.bar.style.display = c.dead ? 'none' : '';
  }
  /* project health bars to the screen */
  placeBars(camera) {
    const v3 = new THREE.Vector3();
    for (const [, v] of this.views) {
      if (!v.bar || v.dying) { if (v.bar) v.bar.style.display = 'none'; continue; }
      v3.set(+v.bar.dataset.x, +v.bar.dataset.y, +v.bar.dataset.z).project(camera);
      if (v3.z > 1) { v.bar.style.display = 'none'; continue; }
      v.bar.style.left = ((v3.x + 1) / 2 * innerWidth) + 'px'; v.bar.style.top = ((1 - v3.y) / 2 * innerHeight) + 'px';
    }
  }
  concede() { if (!this.M.over) this.M.applyInput(0, { type: 'concede' }); }
  dispose() {
    this.ctx.scene.remove(this.group);
    for (const [, v] of this.views) v.bar && v.bar.remove();
    if (this.hud) { this.hud.innerHTML = ''; this.hud.style.display = 'none'; }
  }
}
function esc(s) { return String(s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])); }
