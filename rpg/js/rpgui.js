/* ============================================================
   The big book of Torcain: gear, pack, skills, quests and the
   map — plus the trader's mat, the smith's cauldron and the
   cookfire. One panel, many pages.
   ============================================================ */
import { ITEMS, RECIPES, FORGE, SHOP, count, hasAll, needText } from './items.js';
import { PERKS, SPELLS, SPELL_ORDER, xpForLevel, canTake } from './skills.js';
import { QUESTS, questProgress } from './quests.js';

const esc = s => String(s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

export function createRpgUI(api) {
  const $ = id => document.getElementById(id);
  const root = $('rpg'), body = $('rbody'), tabs = $('rtabs');
  let page = 'gear', mapCanvas = null;

  const TABS = [['gear', 'Gear'], ['pack', 'Pack'], ['skills', 'Skills'], ['quests', 'Quests'], ['map', 'Map']];

  function open(p) {
    page = p || page;
    root.classList.remove('hidden');
    render();
  }
  function close() { root.classList.add('hidden'); api.onClose(); }
  $('rclose').onclick = close;

  function render() {
    const tabbed = TABS.some(t => t[0] === page);
    tabs.innerHTML = tabbed ? TABS.map(([id, label]) => `<button class="rtab${id === page ? ' on' : ''}" data-t="${id}">${label}</button>`).join('') : '';
    tabs.querySelectorAll('button').forEach(b => { b.onclick = () => { page = b.dataset.t; render(); }; });
    const S = api.save(), inv = S.inv, sk = S.skills;
    const shards = `<span class="rshards"><i class="shard"></i>${api.shards()}</span>`;
    let h = '';
    if (page === 'gear') {
      const fx = api.fx();
      const axes = Object.keys(inv.items).filter(k => ITEMS[k] && ITEMS[k].kind === 'axe');
      const trink = Object.keys(inv.items).filter(k => ITEMS[k] && ITEMS[k].kind === 'trinket');
      h += `<h3>Torcain · level ${sk.lvl}</h3><div class="rstats">
        <span>Health <b>${Math.round(api.player().maxHp)}</b></span><span>Stamina <b>${Math.round(api.player().stamMax)}</b></span>
        <span>Damage <b>×${(fx.dmg * api.perkDmg()).toFixed(2)}</b></span><span>Hurst seeds <b>${S.seeds || 0}</b></span>${shards}</div>`;
      h += `<h3>Axe</h3><div class="rgrid">` + axes.map(k => card(k, inv.axe === k ? 'Wielding' : 'Wield', inv.axe === k ? null : `equip:${k}`)).join('') + `</div>`;
      h += `<h3>Trinkets <small>(wear two)</small></h3><div class="rgrid">` + (trink.length ? trink.map(k => {
        const on = inv.trinkets.includes(k);
        return card(k, on ? 'Take off' : 'Wear', on ? `untrinket:${k}` : `trinket:${k}`, on);
      }).join('') : '<p class="rmuted">No trinkets yet. Chests, quests and traders have them.</p>') + `</div>`;
      const buffs = Object.entries(inv.buffs || {}).filter(([, u]) => u > S.time);
      if (buffs.length) h += `<h3>Meal boons</h3><p>` + buffs.map(([id, u]) => `${ITEMS[id].icon} ${ITEMS[id].name} — ${Math.ceil((u - S.time) / 60)} min`).join(' · ') + `</p>`;
    } else if (page === 'pack') {
      const groups = [['meal', 'Meals'], ['mat', 'Materials'], ['key', 'Other']];
      h += `<div class="rstats">${shards}</div>`;
      for (const [kind, label] of groups) {
        const ids = Object.keys(inv.items).filter(k => ITEMS[k] && ITEMS[k].kind === kind);
        if (!ids.length) continue;
        h += `<h3>${label}</h3><div class="rgrid">` + ids.map(k => card(k, kind === 'meal' ? 'Eat' : kind === 'key' ? 'Read' : null, kind === 'meal' ? `use:${k}` : kind === 'key' ? `use:${k}` : null)).join('') + `</div>`;
      }
      if (!Object.keys(inv.items).some(k => ITEMS[k] && ITEMS[k].kind !== 'axe' && ITEMS[k].kind !== 'trinket')) h += '<p class="rmuted">Your pack is empty. Gather ore, bark and stone in the wilds; creatures drop all sorts.</p>';
    } else if (page === 'skills') {
      const need = xpForLevel(sk.lvl);
      h += `<h3>Level ${sk.lvl} <small>${sk.xp} / ${need} xp · ${sk.points} perk point${sk.points === 1 ? '' : 's'} to spend</small></h3>
        <div class="xpbar"><i style="width:${Math.min(100, sk.xp / need * 100)}%"></i></div>`;
      for (const tree of ['Axe', 'Duat', 'Survival']) {
        h += `<h3>${tree}</h3><div class="rperks">` + PERKS.filter(p => p.tree === tree).map(p => {
          const have = sk.perks[p.id], ok = canTake(sk, p);
          return `<div class="rperk${have ? ' have' : ''}"><b>${p.name}</b><small>${p.desc}${p.req ? ` <em>(needs ${PERKS.find(q => q.id === p.req).name})</em>` : ''}</small>
            ${have ? '<span class="rk">✓</span>' : `<button class="btn small" ${ok ? '' : 'disabled'} data-a="perk:${p.id}">Learn</button>`}</div>`;
        }).join('') + `</div>`;
      }
      h += `<h3>Spells</h3><div class="rperks">` + SPELL_ORDER.map(id => {
        const sp = SPELLS[id], have = sk.spells[id];
        return `<div class="rperk${have ? ' have' : ''}"><b>${sp.icon} ${sp.name} <kbd>${sp.key}</kbd></b><small>${have ? sp.desc : 'Not yet learned. Quests and trials teach spells.'}</small></div>`;
      }).join('') + `</div>`;
    } else if (page === 'quests') {
      const act = Object.entries(S.quests || {}).filter(([, st]) => st === 'active');
      const done = Object.entries(S.quests || {}).filter(([, st]) => st === 'done');
      h += `<h3>Story</h3><p>${esc(api.mainObjective())}</p>`;
      h += `<h3>Side quests</h3>` + (act.length ? act.map(([id]) => {
        const q = QUESTS[id], p = questProgress(id, q, S, inv);
        return `<div class="rquest"><b>${q.name}</b> <small>from ${esc(api.npcName(q.giver))} · ${q.region === 'leotik' ? 'Leotik' : q.region === 'xilia' ? 'Xilia' : 'Aakalay'}</small><p>${q.desc}</p>${goalText(id, q, S, inv)}<div class="xpbar"><i style="width:${p * 100}%"></i></div></div>`;
      }).join('') : '<p class="rmuted">No side quests. Talk to the folk at the camp.</p>');
      if (done.length) h += `<h3>Finished</h3><p class="rmuted">` + done.map(([id]) => QUESTS[id].name).join(' · ') + `</p>`;
    } else if (page === 'map') {
      h += `<p class="rmuted" style="text-align:center">Click a lit Nur Lantern to travel there. ◆ objective · ✦ quest · ◉ lantern · ▲ trial · ⌂ camp</p><div class="rmapwrap"><canvas id="rmap" width="620" height="620"></canvas></div>`;
    } else if (page === 'shop') {
      const stock = SHOP[api.region()];
      h += `<h3>Hemla’s mat <small>buy</small></h3><div class="rstats">${shards}</div><div class="rgrid">` + stock.map(k => card(k, `Buy · ${price(k)} ◆`, api.shards() >= price(k) ? `buy:${k}` : null)).join('') + `</div>`;
      const sellable = Object.keys(inv.items).filter(k => ITEMS[k] && (ITEMS[k].kind === 'mat' || ITEMS[k].kind === 'meal' || (ITEMS[k].kind === 'trinket' && !inv.trinkets.includes(k)) || (ITEMS[k].kind === 'axe' && k !== inv.axe && k !== 'axe_tanoc')));
      h += `<h3>Sell</h3><div class="rgrid">` + (sellable.length ? sellable.map(k => card(k, `Sell · ${Math.max(1, Math.round(ITEMS[k].value * 0.5))} ◆`, `sell:${k}`)).join('') : '<p class="rmuted">Nothing to sell.</p>') + `</div>`;
    } else if (page === 'forge') {
      h += `<h3>Duro’s cauldron <small>forge</small></h3><div class="rstats">${shards}</div><div class="rgrid">` + FORGE.map(r => {
        const owned = count(inv, r.out) > 0, locked = r.out === 'axe_tusk' && !(S.flags || {}).forge_tusk;
        const ok = !owned && !locked && hasAll(inv, r.need) && api.shards() >= r.shards;
        return card(r.out, owned ? 'Owned' : locked ? 'Duro needs a tusk first' : `Forge · ${r.shards} ◆`, ok ? `forge:${r.out}` : null, false, `${needText(r.need)} + ${r.shards} shards`);
      }).join('') + `</div>`;
    } else if (page === 'cook') {
      h += `<h3>The cookfire <small>cook</small></h3><div class="rgrid">` + RECIPES.filter(r => r.out !== 'tea' || (S.flags || {}).recipe_tea).map(r => {
        const ok = hasAll(inv, r.need);
        return card(r.out, 'Cook', ok ? `cook:${r.out}` : null, false, needText(r.need));
      }).join('') + `</div>`;
    }
    body.innerHTML = h;
    body.querySelectorAll('[data-a]').forEach(b => {
      b.onclick = () => { const [act, arg] = b.dataset.a.split(':'); api.act(act, arg); render(); };
    });
    if (page === 'map') drawMap();
  }

  function price(k) { return Math.max(2, Math.round(ITEMS[k].value * (api.region() === 'leotik' ? 1.4 : api.region() === 'xilia' ? 1.0 : 1.2))); }
  function card(k, label, action, on, extra) {
    const it = ITEMS[k]; if (!it) return '';
    const n = count(api.save().inv, k);
    return `<div class="rcard${on ? ' on' : ''}"><div class="ri">${it.icon}</div><div class="rt"><b>${it.name}${n > 1 ? ` <span class="rn">×${n}</span>` : ''}</b><small>${it.desc}${extra ? `<br><em>${extra}</em>` : ''}</small></div>
      ${label ? `<button class="btn small" ${action ? `data-a="${action}"` : 'disabled'}>${label}</button>` : ''}</div>`;
  }
  function goalText(id, q, S, inv) {
    const g = q.goal;
    if (g.type === 'items') return '<p class="rgoal">' + Object.entries(g.need).map(([k, n]) => `${ITEMS[k].icon} ${Math.min(n, count(inv, k))}/${n} ${ITEMS[k].name}`).join(' · ') + '</p>';
    if (g.type === 'count') return `<p class="rgoal">${Math.min(g.n, (S.counters || {})[g.counter] || 0)} / ${g.n}</p>`;
    if (g.type === 'kills') return `<p class="rgoal">${Math.min(g.n, Math.max(0, ((S.killsBy || {})[g.kind] || 0) - ((S.qstart || {})[id] || 0)))} / ${g.n}</p>`;
    return '';
  }

  /* ---------------- the map ---------------- */
  let mapBase = null, mapScale = 1, mapHits = [];
  function paintBase() {
    const W = 310, c = document.createElement('canvas'); c.width = c.height = W;
    const g = c.getContext('2d'), img = g.createImageData(W, W), world = api.world();
    const span = 440; mapScale = 620 / span; const base = W / span;
    for (let py = 0; py < W; py++) for (let px = 0; px < W; px++) {
      const x = px / base - span / 2, z = py / base - span / 2;
      const R = world.edgeRadius(x, z), r = Math.hypot(x, z), i = (py * W + px) * 4;
      if (r > R) { img.data[i] = 20; img.data[i + 1] = 28; img.data[i + 2] = 48; img.data[i + 3] = 255; continue; }
      const h = world.heightAt(x, z);
      const hz = world.hazards.some(b => Math.hypot(x - b.x, z - b.z) < b.r);
      let col = api.region() === 'leotik' ? [52, 96, 58] : [168, 160, 88];
      if (hz) col = [140, 200, 60];
      const shade = 0.75 + Math.max(-0.3, Math.min(0.35, h * 0.025));
      const edge = r > R - 4 ? 0.6 : 1;
      img.data[i] = col[0] * shade * edge; img.data[i + 1] = col[1] * shade * edge; img.data[i + 2] = col[2] * shade * edge; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    mapBase = c;
  }
  function drawMap() {
    const cv = $('rmap'); if (!cv) return;
    if (!mapBase) paintBase();
    const g = cv.getContext('2d'), W = cv.width;
    g.imageSmoothingEnabled = true; g.drawImage(mapBase, 0, 0, W, W);
    const P = (x, z) => [(x + 220) * mapScale, (z + 220) * mapScale];
    mapHits = [];
    const mark = (x, z, ch, col, size = 16, label) => {
      const [px, py] = P(x, z);
      g.font = `${size}px Georgia`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#000'; g.fillText(ch, px + 1, py + 1); g.fillStyle = col; g.fillText(ch, px, py);
      if (label) { g.font = '11px Georgia'; g.fillStyle = '#f4e6c6'; g.fillText(label, px, py + 13); }
    };
    for (const m of api.mapMarkers()) {
      mark(m.x, m.z, m.ch, m.col, m.size, m.label);
      if (m.travel) mapHits.push({ ...m, px: P(m.x, m.z) });
    }
    const pl = api.player();
    const [px, py] = P(pl.pos.x, pl.pos.z);
    g.save(); g.translate(px, py); g.rotate(-pl.yaw + Math.PI);
    g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -10); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.stroke(); g.fill();
    g.restore();
    cv.onclick = ev => {
      const r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) * W / r.width, y = (ev.clientY - r.top) * W / r.height;
      const hit = mapHits.find(h => Math.hypot(h.px[0] - x, h.px[1] - y) < 14);
      if (hit) api.travel(hit.travel);
    };
  }

  return { open, close, render, isOpen: () => !root.classList.contains('hidden'), page: () => page };
}
