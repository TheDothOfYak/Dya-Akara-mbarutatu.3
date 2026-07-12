/* ============================================================
   DYA'AKARA — ui/screens_compendium.js
   The Vakarborac — a field guide to the Dearcàn of the Mbaru
   Tatu, compiled for the Dya'Elkarg. Libraries and schools keep
   educational sets; this is yours.
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util, G = DYA.state, UI = DYA.ui, SP = DYA.species;

  const SECTIONS = [
    ['I. Apex Hunters & Great Beasts', ['su_naga', 'ular_naga', 'sru_vorn', 'hvaleia', 'lutut', 'harkal']],
    ['II. Forest, Field & Shell-Kin', ['domestic_punk', 'wild_punk', 'malsti_punk', 'stryx', 'albali_aagac', 'albali_bud', 'albali_fruit', 'albali_byrd', 'albali_villtur', 'ular_grothyn', 'su_grothyn', 'eldi_grothyn', 'tonguatjis', 'tyndael']],
    ['III. Small Folk & Curiosities', ['rubbermcfly', 'kipsu', 'gynge', 'kofi', 'big_momma_kofi', 'rodak', 'mikolo_moko', 'raf_krabbi', 'uff', 'makari_swarm', 'ju_field', 'sprengju', 'sprengju_shaving']],
    ['IV. Workers & Riders', ['karnen', 'chemist_eikar', 'sword_eikar', 'spear_eikar', 'archer_eikar', 'sword_keilia', 'spear_keilia', 'archer_keilia', 'builder_keilia', 'kuni_byrd_wild', 'kuni_byrd_ridden']],
  ];

  UI.register('compendium', {
    enter(root) {
      const me = G.me;
      const scr = U.el('div', { cls: 'screen' });
      scr.appendChild(UI.topbar({ title: 'The Vakarborac' }));
      const page = U.el('div', { cls: 'page' });
      const head = U.el('div', { cls: 'page-head' });
      head.appendChild(U.el('div', { cls: 'back-arrow', text: '‹', onclick: () => UI.show('menu') }));
      head.appendChild(U.el('h2', { text: 'The Vakarborac' }));
      head.appendChild(U.el('div', { cls: 'muted small', text: 'A field guide to the Dearcàn of Velki, Xikia, and Leotik — compiled for the Dya’Elkarg.' }));
      const search = U.el('input', { cls: 'txt', style: 'max-width:220px', placeholder: '🔎 Find a creature…' });
      head.appendChild(U.el('div', { cls: 'spacer' }));
      head.appendChild(search);
      page.appendChild(head);
      const body = U.el('div', { cls: 'page-body', style: 'max-width:980px;width:100%;margin:0 auto' });
      page.appendChild(body);
      scr.appendChild(page);
      root.appendChild(scr);

      function ownedCount(spid) {
        return Object.values(me.tokens).filter(t => t.speciesId === spid).length;
      }

      function render() {
        body.innerHTML = '';
        const q = search.value.trim().toLowerCase();
        body.appendChild(U.el('p', { cls: 'muted small mb', html: '<i>“From the smallest carrot-fields of the Ju to the great Su Naga of the deep.” A note on size: Litk → Mael → Vel → Skor → Skaar, varying widely between individuals. A note on terrain: no creature is ever weak to a terrain — comfort is a preference, never a vulnerability.</i>' }));
        SECTIONS.forEach(([title, ids]) => {
          const shown = ids.filter(id => {
            const sp = SP.get(id);
            return sp && (!q || sp.name.toLowerCase().includes(q) || sp.desc.toLowerCase().includes(q));
          });
          if (!shown.length) return;
          body.appendChild(U.el('h3', { cls: 'gold mb mt', text: title }));
          shown.forEach(id => {
            const sp = SP.get(id);
            const owned = ownedCount(id);
            const row = U.el('div', { cls: 'panel mb', style: 'display:flex;gap:18px;align-items:flex-start' });
            const artCol = U.el('div', { style: 'flex-shrink:0;text-align:center' });
            artCol.appendChild(UI.tokenArt(id, 110, 'idle', sp.features.heads ? sp.features.heads[1] : undefined));
            artCol.appendChild(U.el('div', { cls: 'small muted', text: SP.SIZES[sp.size[0]] + (sp.size[1] > sp.size[0] ? '–' + SP.SIZES[sp.size[1]] : '') }));
            row.appendChild(artCol);
            const info = U.el('div', { cls: 'flex1' });
            const nameRow = U.el('div', { cls: 'flex' });
            nameRow.appendChild(U.el('b', { cls: 'gold', style: 'font-size:17px', text: sp.name }));
            nameRow.appendChild(U.el('span', { cls: 'type-badge el-' + sp.element, style: 'border-color:currentColor', text: sp.element + (sp.element2 ? '/' + sp.element2 : '') }));
            nameRow.appendChild(U.el('span', { cls: 'type-badge r' + sp.rarity[0], style: 'border-color:currentColor', text: SP.RARITIES[sp.rarity[0]] + (sp.rarity[1] > sp.rarity[0] ? '–' + SP.RARITIES[sp.rarity[1]] : '') }));
            if (DYA.mods && DYA.mods.availableHunts().some(h => h.speciesId === id)) nameRow.appendChild(U.el('span', { cls: 'pill', text: '🏹 Huntable' }));
            if (owned) nameRow.appendChild(U.el('span', { cls: 'pill gold', text: '✓ ' + owned + ' in collection' }));
            info.appendChild(nameRow);
            info.appendChild(U.el('div', { cls: 'small mt', html: '<span class="muted">Description —</span> ' + U.esc(sp.desc) }));
            info.appendChild(U.el('div', { cls: 'small mt', html: '<span class="muted">Temperament —</span> ' + U.esc(sp.temperament) }));
            if (sp.special) info.appendChild(U.el('div', { cls: 'small mt', html: '<span class="muted">Notes —</span> ' + U.esc(sp.special) }));
            row.appendChild(info);
            body.appendChild(row);
          });
        });
        /* future volumes */
        if (!q) {
          body.appendChild(U.el('h3', { cls: 'gold mb mt', text: 'V. Legends, Ancients & Far Worlds' }));
          body.appendChild(U.el('div', { cls: 'panel mb', style: 'opacity:.65' }, [
            U.el('div', { html: '<b class="gold">Vyrenalur · Aerolhorn · Sniller · the Kalo’Eik · the Fuzzies of Katkan · the Ghosties of Oskerarean</b><br><span class="small muted">Await future volumes. The Vyrenalur is rarely seen; the Aerolhorn has not been seen in a very long time; each Sniller is designed personally, never given a generic baseline. Noka knows more, and speaks in riddles.</span>' }),
          ]));
          body.appendChild(U.el('p', { cls: 'muted small center mt', text: '— End of Volume One —' }));
        }
      }
      search.oninput = render;
      render();
    },
  });
})();
