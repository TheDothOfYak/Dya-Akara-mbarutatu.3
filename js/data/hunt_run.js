/* ============================================================
   DYA'AKARA — data/hunt_run.js
   The HUNT — a run-based summoner mode (static design data).

   Single-player, run-based. A Hunter (locked to one element) enters a
   gauntlet of node battles across a hunting ground, spends Vaelk to
   summon beasts to their side, and runs the ground's great Quarry to
   ground. Defeat the Quarry and you claim a PIECE of it — carrying its
   EXACT stats — to sing true at the workbench. Lose a fight and the run
   ends. It is meant to be brutally hard.

   This file holds ONLY the data + pure helpers: the Vaelk resource, the
   Hunter roster (with Artifact Forms), the three hunting grounds, and
   their Quarry (final-boss) assignments. The run engine lives in
   core/hunt_run.js; the screens in ui/screens_hunt_run.js.
   ============================================================ */
(function () {
  'use strict';
  const SP = DYA.species;

  /* ================= VAELK ================= */
  /* A resource all its own, separate from a token's Fti/Su/Eldi/Ular ready
     cost. It is a Hunter's inner drive to call beasts to their side. Four
     elemental flavors; a Hunter generates and spends only their own. Plural
     uses the standard -ar rule: Vaelk → Vaelkar. Under the hood a run's
     Vaelk maps onto the match economy's resource pool, forced to a single
     element so the whole pool reads as one flavor. */
  const VAELK = {
    Fti:  { flavor: "Fti'Vaelk",  plural: "Fti'Vaelkar",  color: SP.ELEMENT_COLORS.Fti,  aspect: 'Air'  },
    Su:   { flavor: "Su'Vaelk",   plural: "Su'Vaelkar",   color: SP.ELEMENT_COLORS.Su,   aspect: 'Water' },
    Eldi: { flavor: "Eldi'Vaelk", plural: "Eldi'Vaelkar", color: SP.ELEMENT_COLORS.Eldi, aspect: 'Fire' },
    Ular: { flavor: "Ular'Vaelk", plural: "Ular'Vaelkar", color: SP.ELEMENT_COLORS.Ular, aspect: 'Earth' },
  };

  /* Deliberately punishing. A Hunt is not meant to be won on a first,
     under-levelled attempt. */
  const DEFAULTS = {
    vaelkRegen: 3,        // Vaelk gained each pulse/turn
    startVaelk: 3,        // Vaelk in hand at the top of a node
    pulseInterval: 8,     // seconds between Vaelk pulses
    heroHpMul: 2.0,       // the Hunter is durable, but killable
    nodeTimeLimit: 300,   // a node run-out (seconds) counts as a loss
    /* --- the Quarry is a monster --- */
    bossHpMul: 6.0,       // on top of a max-rarity mint: a vast health pool
    bossDmgMul: 1.7,      // and it hits far harder than its base form
    bossSizeIdx: 4,       // rendered at the largest size band
  };

  /* ================= HUNTERS ================= */
  /* Eight Hunters + one form-variant (Torcain, Tanoc's evolved form — it does
     NOT count against the eight). Each Hunter is locked to one element, which
     fixes its Vaelk flavor and its draft pool. `avatar` is the existing
     species whose locked behavior tree stands in as the Hunter's field unit
     and base attack (no new card-text — it reuses the standard creature AI).

     Artifact Forms: a Hunter may hold more than one form, each of which can
     change element (and therefore Vaelk flavor + draft pool), base ability,
     and starting summon pool. Torcain is Tanoc's post-Stamijan form and shows
     the system off: a wider, hybrid pool not locked to one element. */
  const HEROES = [
    /* ---- Ular ---- */
    {
      id: 'tanoc', name: 'Tanoc', origin: 'established', element: 'Ular',
      blurb: 'A brawler who learned the Urverk at Aakalay. Trades blows up close and calls the earth to his side.',
      forms: [
        { id: 'tanoc_base', name: 'Tanoc', element: 'Ular', avatar: 'sword_eikar',
          ability: 'Urverk Strike — a heavy melee brawler kit; wades in and holds the line.',
          unlock: 'start' },
        { id: 'torcain', name: 'Torcain', element: 'Ular', neutral: true, avatar: 'sword_keilia',
          ability: 'Stamijan Ascendant — Tanoc evolved. A wider, hybrid summon pool drawn from every element, not just Earth.',
          unlock: 'Unlocked after the Stamijan artifact — Tanoc’s evolved form.' },
      ],
    },
    {
      id: 'grael', name: 'Grael Kostyn', origin: 'original', element: 'Ular',
      blurb: 'A frontier spear-hand. (Placeholder name — swap freely.)',
      forms: [
        { id: 'grael_base', name: 'Grael Kostyn', element: 'Ular', avatar: 'spear_eikar',
          ability: 'Hanii Throw — a reach fighter who softens a target before the summons pile in.',
          unlock: 'start' },
      ],
    },
    /* ---- Eldi ---- */
    {
      id: 'buhkon', name: 'Buhkon Eldi', origin: 'established', element: 'Eldi',
      blurb: 'The Carpenter — calm, deliberate, a mentor. Builds his side up rather than rushing it down.',
      forms: [
        { id: 'buhkon_base', name: 'Buhkon Eldi', element: 'Eldi', avatar: 'eldi_grothyn',
          ability: 'Carpenter’s Patience — a steady Fire anchor; deliberate, hard to dislodge.',
          unlock: 'start' },
      ],
    },
    {
      id: 'torvek', name: 'Torvek Ashari', origin: 'original', element: 'Eldi',
      blurb: 'An ember-touched duelist. (Placeholder name — swap freely.)',
      forms: [
        { id: 'torvek_base', name: 'Torvek Ashari', element: 'Eldi', avatar: 'tyndael',
          ability: 'Flame Crown — burns down the front rank while the summons flank.',
          unlock: 'start' },
      ],
    },
    /* ---- Fti ---- */
    {
      id: 'kiet', name: 'Kiet', origin: 'established', element: 'Fti',
      blurb: "A theatrical Nekhic'Eik duelist — wind and showmanship. Darts, feints, and never stands still.",
      forms: [
        { id: 'kiet_base', name: 'Kiet', element: 'Fti', avatar: 'albali_byrd',
          ability: 'Nekhic Flourish — a fast Air skirmisher; hard to pin, quick to punish.',
          unlock: 'start' },
      ],
    },
    {
      id: 'rhaxel', name: 'Rhaxel Doon', origin: 'original', element: 'Fti',
      blurb: 'A high-country wind-rider. (Placeholder name — swap freely.)',
      forms: [
        { id: 'rhaxel_base', name: 'Rhaxel Doon', element: 'Fti', avatar: 'kuni_byrd_wild',
          ability: 'Stormwing — a diving Air attacker that opens the fight from above.',
          unlock: 'start' },
      ],
    },
    /* ---- Su ---- */
    {
      id: 'venkin', name: 'Venkin', origin: 'established', element: 'Su',
      blurb: 'Assigned to Water for now — no element is locked for them in lore yet. (Flag if this should be someone else.)',
      forms: [
        { id: 'venkin_base', name: 'Venkin', element: 'Su', avatar: 'harkal',
          ability: 'Tidecaller — a Water fighter who controls the near ground and calls the depths up.',
          unlock: 'start' },
      ],
    },
    {
      id: 'ilyn', name: 'Ilyn Maskar', origin: 'original', element: 'Su',
      blurb: 'A coastal reaver. (Placeholder name — swap freely.)',
      forms: [
        { id: 'ilyn_base', name: 'Ilyn Maskar', element: 'Su', avatar: 'raf_krabbi',
          ability: 'Shellbreaker — a hardy Water brawler; shrugs off the first blows and grinds forward.',
          unlock: 'start' },
      ],
    },
  ];

  /* ================= HUNTING GROUNDS ================= */
  /* Each ground is a string of node encounters: a run of ordinary battles,
     then the ground's great Quarry as the final node. The Quarry is built
     from an existing high-rarity/legendary roster creature — but scaled into
     a true boss (a vast health pool, harder hits, largest size) that summons
     minions each pulse, the Big Momma Kofi pattern scaled up. Beat it and you
     claim a PIECE of it carrying its exact stats. `enemyPool` seeds the
     ordinary nodes; the run engine scales rarity and count by node depth. */
  const PLANETS = [
    {
      id: 'velki', name: 'Velki', theme: 'Su',
      blurb: 'Drowned coasts and tide-caves. The water remembers everyone who wades in.',
      nodes: 5,
      enemyPool: ['raf_krabbi', 'harkal', 'su_grothyn', 'mirrordew', 'hvaleia'],
      guardian: {
        species: 'su_naga', rarity: 6, name: 'Vaelmyr, the Tidewyrm',
        blurb: 'A Su Naga swollen to legend in the deep — its first head near-unkillable, and it never stops calling the shoals.',
        summon: { species: 'harkal', rarity: 3, count: 3, everyPulses: 2, cap: 8 },
      },
    },
    {
      id: 'xikia', name: 'Xikia', theme: 'Ular',
      blurb: 'Highland shelves and lowland scrub. The ground itself is territorial here.',
      nodes: 5,
      enemyPool: ['wild_punk', 'kipsu', 'rodak', 'albali_aagac', 'stryx', 'makari_swarm'],
      guardian: {
        species: 'ular_naga', rarity: 6, name: 'Kravaxis, the Coil of Xikia',
        blurb: 'An Ular Naga that rules the shelves by dominance — it floods the field with swarms as it coils.',
        summon: { species: 'makari_swarm', rarity: 4, count: 3, everyPulses: 2, cap: 9 },
      },
    },
    {
      id: 'leotik', name: 'Leotik', theme: 'Fti',
      blurb: 'Frontier ridges and thin, fast air. Nothing up here holds still for long.',
      nodes: 5,
      enemyPool: ['albali_byrd', 'kuni_byrd_wild', 'lutut', 'malsti_punk', 'skith_grass'],
      guardian: {
        species: 'albali_villtur', rarity: 5, name: 'Skarn Vhal, the Frontier Wing',
        blurb: 'A five-horned Albali Villtur that owns the ridgeline — it keeps calling its flock down out of the wind.',
        summon: { species: 'kuni_byrd_wild', rarity: 4, count: 3, everyPulses: 2, cap: 7 },
      },
    },
  ];

  /* ================= PURE HELPERS ================= */

  function allForms() {
    const out = [];
    HEROES.forEach(h => (h.forms || []).forEach(f => out.push(Object.assign({ heroId: h.id, heroName: h.name, origin: h.origin }, f))));
    return out;
  }
  function getHero(id) { return HEROES.find(h => h.id === id) || null; }
  function getForm(formId) {
    for (const h of HEROES) { const f = (h.forms || []).find(x => x.id === formId); if (f) return Object.assign({ heroId: h.id, heroName: h.name }, f); }
    return null;
  }
  function getPlanet(id) { return PLANETS.find(p => p.id === id) || null; }
  function vaelkOf(element) { return VAELK[element] || VAELK.Ular; }

  /* A form's draftable pool = the Collection roster filtered to its element's
     affinity (primary OR secondary), keeping only creatures that actually
     fight. A neutral form (Torcain) draws from every element. Automatic
     curation — no separate card set to hand-author. */
  function draftPool(form) {
    const el = form.element;
    return SP.list.filter(sp => {
      if (!SP.canDuel(sp.id)) return false;
      if (sp.notCraftable) return false;
      if (sp.tags && sp.tags.indexOf('passive') >= 0) return false;
      if (form.neutral) return true;
      return sp.element === el || sp.element2 === el;
    }).map(sp => sp.id);
  }

  DYA.huntRunData = {
    VAELK, DEFAULTS, HEROES, PLANETS,
    allForms, getHero, getForm, getPlanet, vaelkOf, draftPool,
    ELEMENT_NAMES: SP.ELEMENT_NAMES,
  };
})();
