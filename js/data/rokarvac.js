// © 2026 Isaac Flake. All Rights Reserved.
/* ============================================================
   FLAKE GAMES — data/rokarvac.js
   The Rokarvac (Dearcineon: journal, story, writing book): what
   is known of the Pia'don system, sorted by where it belongs.
   It used to live inside Dya'Akara (the world codex and the
   Vakarborac); now it opens from the home page by clicking a
   world in the sky (rokarvac.html).

   Each world: { id, name, kind, sub, intro, chapters, creatures, later }
     chapters   [{ title, intro, entries:[{name, sub, body}], glossary, sky }]
                built from DYA.lore.WORLD, so the words stay in one place
     creatures  [[section title, [species ids from js/data/species.js]]]
     later      creatures and peoples that await a future volume
   Whatever belongs to no one world, or that we're not sure of,
   goes to Pia'don's star.
   ============================================================ */
(function () {
  'use strict';
  const L = DYA.lore;
  const W = L.WORLD || [];
  const ch = id => W.find(c => c.id === id) || { title: id, intro: '', entries: [] };
  const entry = (chId, name) => (ch(chId).entries || []).find(e => e.name === name);
  /* a chapter, keeping only the named entries (all of them when names is left out) */
  function chapter(id, names, extra) {
    const c = ch(id);
    return Object.assign({
      id, title: c.title, intro: c.intro, glossary: c.glossary,
      entries: names ? names.map(n => entry(id, n)).filter(Boolean) : (c.entries || []).slice(),
    }, extra || {});
  }
  const PIADON = entry('tatu', 'Pia’don') || { body: '' };

  const WORLDS = [
    {
      id: 'mbaru', name: 'The Mbaru Tatu', kind: 'Three Tatu and their Kalo',
      sub: 'Velki · Xikia · Leotik',
      intro: 'The home of the Eikar and the Keilia, of the token game and the Dya Guild, and of nearly every creature set down in the Vakarborac.',
      notes: true,       // the field notes (DYA.lore.TIPS)
      tellings: true,    // the Legend of Aakalay, the short film
      chapters: [
        chapter('tatu', ['Velki', 'Xikia', 'Leotik', 'The Kalo'], { sky: true }),
        chapter('elements'),
        chapter('peoples', ['Eikar', 'Keilia', 'Kalo’Eik'], { intro: ch('peoples').intro }),
        chapter('factions'),
        chapter('storm'),
        chapter('token'),
        chapter('words'),
      ],
      creatures: [
        ['I. Apex Hunters & Great Beasts', ['su_naga', 'ular_naga', 'sru_vorn', 'hvaleia', 'lutut', 'harkal']],
        ['II. Forest, Field & Shell-Kin', ['domestic_punk', 'wild_punk', 'malsti_punk', 'stryx', 'albali_aagac', 'albali_bud', 'albali_fruit', 'albali_byrd', 'albali_villtur', 'ular_grothyn', 'su_grothyn', 'eldi_grothyn', 'tonguatjis', 'tyndael']],
        ['III. Small Folk & Curiosities', ['rubbermcfly', 'kipsu', 'gynge', 'kofi', 'big_momma_kofi', 'rodak', 'mikolo_moko', 'raf_krabbi', 'uff', 'makari_swarm', 'ju_field', 'sprengju', 'sprengju_shaving']],
        ['IV. Workers & Riders', ['chemist_eikar', 'sword_eikar', 'spear_eikar', 'archer_eikar', 'sword_keilia', 'spear_keilia', 'archer_keilia', 'builder_keilia', 'kuni_byrd_wild', 'kuni_byrd_ridden']],
      ],
      later: [
        { name: 'The Kalo’Eik', body: 'The moon-folk of Bolo Kalo. Await a future volume.' },
      ],
    },
    {
      id: 'katkan', name: 'Katkan', kind: 'A world of Pia’don',
      sub: 'The world of the Fuzzies',
      intro: 'Katkan shares Pia’don’s star with the Mbaru Tatu. It is the world of the Fuzzies.',
      chapters: [{ title: 'Katkan', entries: [{ name: 'Katkan', sub: 'The world of the Fuzzies', body: 'One of the other worlds that share Pia’don’s star with the Mbaru Tatu. Little more of it is written down yet.' }] }],
      creatures: [],
      later: [{ name: 'The Fuzzies of Katkan', body: 'Await a future volume.' }],
    },
    {
      id: 'oskerarean', name: 'Oskerarean', kind: 'A world of Pia’don',
      sub: 'The sub-corporeal world of the Ghosties',
      intro: 'Oskerarean is the sub-corporeal world of the Ghosties. True Raw Stygian comes from there.',
      chapters: [{ title: 'Oskerarean', entries: [{ name: 'Oskerarean', sub: 'The world of the Ghosties', body: 'The sub-corporeal world of the Ghosties, where True Raw Stygian comes from. One of the worlds that share Pia’don’s star with the Mbaru Tatu.' }] }],
      creatures: [],
      later: [{ name: 'The Ghosties of Oskerarean', body: 'Await a future volume.' }],
    },
    {
      id: 'sukryulndael', name: 'Su’Kryulndael', kind: 'A world of Pia’don',
      sub: 'A waterworld',
      intro: 'Su’Kryulndael is a waterworld, with massive caverns beneath.',
      chapters: [{ title: 'Su’Kryulndael', entries: [{ name: 'Su’Kryulndael', sub: 'A waterworld', body: 'A waterworld with massive caverns beneath. One of the worlds that share Pia’don’s star with the Mbaru Tatu.' }] }],
      creatures: [],
      later: [],
    },
    {
      id: 'piadon', name: 'Pia’don', kind: 'The star and its system',
      sub: 'What belongs to no one world',
      intro: 'Pia’don’s star, and everything that belongs to the whole system rather than to any one world, or that no one is sure of yet.',
      chapters: [
        { title: 'Pia’don', entries: [
          Object.assign({}, PIADON, { name: 'Pia’don', sub: 'The solar system' }),
          entry('peoples', 'Xwi & Xiw'),
          Object.assign({}, entry('peoples', 'Karnen') || {}, { sub: 'People, not beasts · from the planet Trianu' }),
        ].filter(e => e && e.body) },
      ],
      creatures: [
        ['From Trianu', ['karnen']],
      ],
      later: [
        { name: 'The Vyrenalur', body: 'Rarely seen. The Elsha’ryn follow it.' },
        { name: 'The Aerolhorn', body: 'Not seen in a very long time. The SkarValorin follow it.' },
        { name: 'The Sniller', body: 'Each one is designed personally, never given a generic baseline. Cursed into amulets by the Xwi after the last Sniller Burst.' },
      ],
    },
  ];

  /* the species each world keeps, for finding a creature's home */
  function homeOf(speciesId) {
    const w = WORLDS.find(x => x.creatures.some(([, ids]) => ids.indexOf(speciesId) >= 0));
    return w ? w.id : 'piadon';
  }

  DYA.rokarvac = { WORLDS, homeOf, world: id => WORLDS.find(w => w.id === id) };
})();
