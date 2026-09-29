/* ============================================================
   DYA'AKARA — ui/screens_world.js
   The Rokarvac of the Mbaru Tatu — a primer on the worlds the
   token game is played in: the three Tatu and their Kalo, the
   elements and directions, the peoples, the Skaar Uverkhron,
   the Sunear'Zikhron, the token game itself, and Dearcineon.
   Content lives in DYA.lore.WORLD (data/lore.js).
   ============================================================ */
(function () {
  'use strict';
  const U = DYA.util, UI = DYA.ui, L = DYA.lore;
  let lastChapter = null;   // survives UI.refreshCurrent, which re-enters without params

  UI.register('world', {
    enter(root, params) {
      const chapters = L.WORLD || [];
      let current = (params && params.chapter) || lastChapter || (chapters[0] && chapters[0].id);

      const scr = U.el('div', { cls: 'screen' });
      scr.appendChild(UI.topbar({ title: 'The Mbaru Tatu' }));
      const page = U.el('div', { cls: 'page' });
      const head = U.el('div', { cls: 'page-head' });
      head.appendChild(U.el('div', { cls: 'back-arrow', text: '‹', onclick: () => UI.show('menu') }));
      head.appendChild(U.el('h2', { text: 'The Rokarvac of the Mbaru Tatu' }));
      page.appendChild(head);

      const tabs = U.el('div', { cls: 'tabs world-tabs' });
      page.appendChild(tabs);
      const body = U.el('div', { cls: 'page-body world-body' });
      page.appendChild(body);
      scr.appendChild(page);
      root.appendChild(scr);

      chapters.forEach(ch => {
        const tab = U.el('div', { cls: 'tab' + (ch.id === current ? ' active' : ''), text: ch.title });
        tab.onclick = () => {
          current = lastChapter = ch.id;
          U.qsa('.tab', tabs).forEach(x => x.classList.remove('active'));
          tab.classList.add('active');
          DYA.audio.play('click');
          render();
        };
        tabs.appendChild(tab);
      });

      function render() {
        const ch = chapters.find(c => c.id === current) || chapters[0];
        body.innerHTML = '';
        if (!ch) return;

        if (ch.id === 'tatu') {
          const sky = U.el('div', { cls: 'world-sky' });
          const cv = U.el('canvas', { 'aria-label': 'Velki at the centre, Xikia and Leotik circling it, each with its Kalo' });
          sky.appendChild(cv);
          body.appendChild(sky);
          DYA.mbaruSky.mount(cv, { cx: 0.5, cy: 0.54, labels: 'full', maxR: 44, sun: [0.9, 0.16] });
        }

        body.appendChild(U.el('p', { cls: 'world-intro', text: ch.intro }));

        if (ch.glossary) {
          const grid = U.el('div', { cls: 'world-glossary' });
          ch.glossary.forEach(([word, meaning]) => {
            grid.appendChild(U.el('div', { cls: 'wg-row' }, [
              U.el('span', { cls: 'wg-word', text: word }),
              U.el('span', { cls: 'wg-mean', text: meaning }),
            ]));
          });
          body.appendChild(grid);
        }

        const grid = U.el('div', { cls: 'world-grid' });
        (ch.entries || []).forEach(e => {
          const card = U.el('div', { cls: 'world-card' + (ch.id === 'elements' ? ' el-card el-' + e.name.split(' ')[0] : '') });
          card.appendChild(U.el('div', { cls: 'wc-name', text: e.name }));
          if (e.sub) card.appendChild(U.el('div', { cls: 'wc-sub', text: e.sub }));
          card.appendChild(U.el('div', { cls: 'wc-body', text: e.body }));
          grid.appendChild(card);
        });
        body.appendChild(grid);

        /* next chapter */
        const idx = chapters.indexOf(ch);
        if (idx < chapters.length - 1) {
          const nx = chapters[idx + 1];
          body.appendChild(U.el('div', { cls: 'center mt' }, [
            U.el('button', { cls: 'btn ghost', text: 'Next — ' + nx.title + ' ›', onclick: () => {
              U.qsa('.tab', tabs)[idx + 1].click();
              body.scrollTop = 0;
            } }),
          ]));
        } else {
          body.appendChild(U.el('div', { cls: 'center mt' }, [
            U.el('button', { cls: 'btn ghost', text: '📖 Open the Vakarborac — the creatures', onclick: () => UI.show('compendium') }),
          ]));
        }
      }
      render();
    },
  });
})();
