/* ============================================================
   The big book of Torcain: gear, pack, skills, quests and the
   map — plus the trader's mat, the smith's cauldron and the
   cookfire. One panel, many pages.
   ============================================================ */
import { ITEMS, RECIPES, FORGE, SHOP, BINDABLE_RELICS, ARMS, bindId, count, hasAll, needText } from './items.js';
import { PERKS, SPELLS, SPELL_ORDER, xpForLevel, canTake } from './skills.js';
import { QUESTS, JOBS, questProgress } from './quests.js';

const esc = s => String(s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

export function createRpgUI(api) {
  const $ = id => document.getElementById(id);
  const root = $('rpg'), body = $('rbody'), tabs = $('rtabs');
  let page = 'gear', mapCanvas = null;

  const TABS = [['gear', 'Gear'], ['pack', 'Pack'], ['skills', 'Skills'], ['quests', 'Quests'], ['beasts', 'Beasts'], ['tokens', 'Tokens'], ['map', 'Map']];

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
      const axes = Object.keys(inv.items).filter(k => ITEMS[k] && ITEMS[k].kind === 'weapon' && (S.arms || {})[ITEMS[k].arm || 'axe']);
      const trink = Object.keys(inv.items).filter(k => ITEMS[k] && ITEMS[k].kind === 'trinket');
      h += `<h3>${api.who ? api.who() : 'Torcain'} · level ${sk.lvl}</h3><div class="rstats">
        <span>Health <b>${Math.round(api.player().maxHp)}</b></span><span>Stamina <b>${Math.round(api.player().stamMax)}</b></span>
        <span>Damage <b>×${(fx.dmg * api.perkDmg()).toFixed(2)}</b></span><span>Hurst seeds <b>${S.seeds || 0}</b></span>${shards}</div>`;
      const sl = api.slots && api.slots();
      if (sl) {
        h += `<h3>Quick slots <small>press the key in play — Q and 1–6</small></h3><div class="rslots">` + sl.keys.map(k => `<label class="rslot"><kbd>${k.label}</kbd><select data-slot="${k.code}"><option value="">— empty —</option>` +
          sl.choices.map(c => `<option value="${c.id}"${c.id === k.id ? ' selected' : ''}>${c.icon} ${esc(c.name)} · ${c.kind}</option>`).join('') + `</select></label>`).join('') + `</div>`;
        // relics and spells go on the quick slots the same way: a card each, and a button for every slot
        const slotBtns = id => sl.keys.map(k => `<button class="btn small${k.id === id ? ' on' : ''}" data-a="slot:${k.code}=${id}">${k.label}</button>`).join(' ');
        const onSlot = id => { const k = sl.keys.find(q => q.id === id); return k ? ` · on <b>${k.label}</b>` : ''; };
        if (sl.relics.length) h += `<h3>Relics</h3><div class="rgrid">` + sl.relics.map(r => card(r.id, null, null, !!onSlot(r.id), r.known ? 'Trigger found — put it on any quick slot' + onSlot(r.id) + ': ' + slotBtns(r.id) : 'Trigger not yet found. Listen to it.')).join('') + `</div>`;
        if (sl.spells && sl.spells.length) h += `<h3>Spells</h3><div class="rgrid">` + sl.spells.map(sp => `<div class="rcard${onSlot(sp.id) ? ' on' : ''}"><div class="ri">${sp.icon}</div><div class="rt"><b>${esc(sp.name)}</b><small>${esc(sp.desc)} <span class="rmuted">(${sp.cd}s to recover)</span><br><em>Put it on any quick slot${onSlot(sp.id)}: ${slotBtns(sp.id)}</em></small></div></div>`).join('') + `</div>`;
      }
      // what he wears: a cloak, the body, the hands, the feet
      if (api.wear) {
        const W = api.wear();
        const relicTag = k => ITEMS[k].relicArmor ? ` <em class="rrelic" style="color:#${(ITEMS[k].glow ?? 0xc89aff).toString(16).padStart(6, '0')}">✦ Relic armor</em>` : '';
        h += `<h3>Wearing <small>a cloak (the one you glide with), the body, the hands, the feet</small></h3><div class="rwear">` + W.map(w => `<div class="rslotw"><kbd>${w.label}</kbd> ${w.on ? `${ITEMS[w.on].icon} <b>${esc(ITEMS[w.on].name)}</b>${relicTag(w.on)} <button class="btn small" data-a="unwear:${w.slot}">Take off</button>` : '<span class="rmuted">— nothing —</span>'}</div>`).join('') + `</div>`;
        const spare = W.flatMap(w => w.have.filter(k => k !== w.on));
        if (spare.length) h += `<div class="rgrid">` + spare.map(k => card(k, 'Wear', `wear:${k}`, false, `${ITEMS[k].slot[0].toUpperCase() + ITEMS[k].slot.slice(1)}${ITEMS[k].relicArmor ? ' · ✦ Relic armor' : ''}`)).join('') + `</div>`;
      }
      // every kind of weapon he's learned, and the kinds still to learn (each on a quest)
      const learned = Object.keys(ARMS).filter(c => (S.arms || {})[c]);
      h += `<h3>Weapons <small>${learned.length} of ${Object.keys(ARMS).length} kinds learned — wield whichever you like</small></h3><div class="rgrid">` + axes.map(k => card(k, inv.axe === k ? 'Wielding' : 'Wield', inv.axe === k ? null : `equip:${k}`, inv.axe === k, `${ARMS[ITEMS[k].arm || 'axe'].icon} ${ARMS[ITEMS[k].arm || 'axe'].name} · ${ARMS[ITEMS[k].arm || 'axe'].note}`)).join('') + `</div>`;
      const unlearned = Object.keys(ARMS).filter(c => !(S.arms || {})[c]);
      if (unlearned.length) h += `<p class="rmuted">Still to learn: ` + unlearned.map(c => { const a = ARMS[c], j = JOBS[a.job]; return `${a.icon} <b>${a.name}</b> <small>(${j ? `the Carpenter’s job board: “${esc(j.name)}”` : esc(a.teach || '')})</small>`; }).join(' · ') + `</p>`;
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
        h += `<h3>${label}</h3><div class="rgrid">` + ids.map(k => card(k, kind === 'meal' ? 'Eat' : ITEMS[k].read ? 'Read' : null, kind === 'meal' || ITEMS[k].read ? `use:${k}` : null)).join('') + `</div>`;
      }
      if (!Object.keys(inv.items).some(k => ITEMS[k] && ITEMS[k].kind !== 'weapon' && ITEMS[k].kind !== 'trinket')) h += '<p class="rmuted">Your pack is empty. Gather ore, bark and stone in the wilds; creatures drop all sorts.</p>';
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
        return `<div class="rperk${have ? ' have' : ''}"><b>${sp.icon} ${sp.name}</b><small>${have ? sp.desc + ' <em>Put it on a quick slot under Gear, the same as a Relic.</em>' : 'Not yet learned. Quests and trials teach spells.'}</small></div>`;
      }).join('') + `</div>`;
    } else if (page === 'quests') {
      const act = Object.entries(S.quests || {}).filter(([, st]) => st === 'active');
      const done = Object.entries(S.quests || {}).filter(([, st]) => st === 'done');
      h += `<h3>Story</h3><p>${esc(api.mainObjective())}</p>`;
      h += `<h3>Side quests</h3>` + (act.length ? act.map(([id]) => {
        const q = QUESTS[id], p = questProgress(id, q, S, inv);
        return `<div class="rquest"><b>${q.name}</b> <small>from ${esc(api.npcName(q.giver))} · ${q.region === 'leotik' ? 'Leotik' : q.region === 'xilia' ? 'Beuhk' : 'Aakalay'}</small><p>${q.desc}</p>${goalText(id, q, S, inv)}<div class="xpbar"><i style="width:${p * 100}%"></i></div></div>`;
      }).join('') : '<p class="rmuted">No side quests. Talk to people — anyone might need a hand.</p>');
      const b = api.bounty();
      h += `<h3>Bounty</h3>` + (b ? `<div class="rquest"><b>Hunt ${b.n} ${esc(b.name)}</b> <small>posted by ${esc(b.from)} · ${b.shards} shards</small><p class="rgoal">${Math.min(b.got, b.n)} / ${b.n}${b.got >= b.n ? ' — claim it at any bounty board' : ''}</p><div class="xpbar"><i style="width:${Math.min(1, b.got / b.n) * 100}%"></i></div></div>` : '<p class="rmuted">No bounty taken. Boards in Beuhk and the Leotik camp post hunts.</p>');
      if (done.length) h += `<h3>Finished</h3><p class="rmuted">` + done.map(([id]) => QUESTS[id].name).join(' · ') + `</p>`;
    } else if (page === 'beasts') {
      const list = api.beasts();
      h += `<p class="rmuted">Hunt enough of a creature and Torcain has <b>studied</b> it: +15% damage against its kind.</p><div class="rperks">` + list.map(b => b.seen
        ? `<div class="rperk${b.studied ? ' have' : ''}"><b>${esc(b.name)}</b><small>${b.lore}<br><em>${b.kills} felled · ${b.studied ? 'studied ✓' : `study at ${b.at}`}</em></small></div>`
        : `<div class="rperk"><b>???</b><small class="rmuted">Not yet met.</small></div>`).join('') + `</div>`;
    } else if (page === 'tokens') {
      const d = api.dya();
      if (!d) h += '<p class="rmuted">The Dya’Akara engine didn’t load.</p>';
      else {
        h += `<h3>Dya’Akara <small>${d.record}</small></h3><p class="rmuted">Your pouch holds up to 25 tokens (${d.pouch.length}/25). Challenge Venkin, Sefa or Bosk in Beuhk — or anyone at the Leotik camp who plays.</p>`;
        h += `<div class="rgrid">` + d.tokens.map(t => {
          const inP = d.pouch.includes(t.id);
          const cost = Object.entries(t.cost).filter(([, v]) => v).map(([e, v]) => `<i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${d.ecol[e]};margin:0 2px 0 5px"></i>${v}`).join('');
          return `<div class="rcard${inP ? ' on' : ''}"><div class="ri" style="color:${d.ecol[t.element] || '#fff'}">◈</div><div class="rt"><b>${esc(t.name)}</b><small>${esc(t.species)} · ${t.size} · ${t.rarity}<br>HP ${t.hp} · DMG ${t.dmg} · SPD ${t.speed}${t.quirks ? ' · ' + esc(t.quirks) : ''}<br>Cost ${cost}</small></div>
            <button class="btn small" data-a="pouch:${t.id}">${inP ? 'In pouch ✓' : 'Add to pouch'}</button></div>`;
        }).join('') + `</div>`;
        h += `<h3>Sing a token <small>${d.okid ? 'with your Okid’Relic' : 'Buhkon can show you how'}</small></h3>`;
        h += d.okid ? `<p class="rmuted">A piece of a creature, a lump of stygian ore and ${d.singCost} shards. Big tokens are rare — most songs come out small.</p><div class="rgrid">` + d.singing.map(r => card(r.part, `Sing a ${esc(r.name)}`, r.ok ? `sing:${r.part}` : null, false, `${r.have} in pack · + 1 Stygian ore`)).join('') + `</div>` : '<p class="rmuted">Talk to Buhkon in Beuhk about singing tokens.</p>';
      }
    } else if (page === 'map') {
      h += `<p class="rmuted" style="text-align:center">Click a lit Nur Lantern to travel there. ◆ objective · ✦ quest · ◉ lantern · ▲ trial · ⌂ camp</p><div class="rmapwrap"><canvas id="rmap" width="620" height="620"></canvas></div>`;
    } else if (page === 'shop') {
      const stock = SHOP[api.region()];
      h += `<h3>Hemla’s mat <small>buy</small></h3><div class="rstats">${shards}</div><div class="rgrid">` + stock.map(k => card(k, `Buy · ${price(k)} ◆`, api.shards() >= price(k) ? `buy:${k}` : null)).join('') + `</div>`;
      const sellable = Object.keys(inv.items).filter(k => ITEMS[k] && ITEMS[k].kind !== 'key' && (ITEMS[k].kind === 'mat' || ITEMS[k].kind === 'meal' || (ITEMS[k].kind === 'trinket' && !inv.trinkets.includes(k)) || (ITEMS[k].kind === 'weapon' && k !== inv.axe && k !== 'axe_tanoc' && ITEMS[k].value > 0)));
      h += `<h3>Sell</h3><div class="rgrid">` + (sellable.length ? sellable.map(k => card(k, `Sell · ${Math.max(1, Math.round(ITEMS[k].value * 0.5))} ◆`, `sell:${k}`)).join('') : '<p class="rmuted">Nothing to sell.</p>') + `</div>`;
    } else if (page === 'forge') {
      h += `<h3>Duro’s cauldron <small>forge</small></h3><div class="rstats">${shards}</div><div class="rgrid">` + FORGE.map(r => {
        const arm = ITEMS[r.out].kind === 'weapon' && ITEMS[r.out].arm;
        if (arm && !(S.arms || {})[arm]) return '';   // (only weapons of a kind he's learned)
        const owned = count(inv, r.out) > 0, later = r.later && !(api.later && api.later()), locked = (r.out === 'axe_tusk' && !(S.flags || {}).forge_tusk) || later;
        const ok = !owned && !locked && hasAll(inv, r.need) && api.shards() >= r.shards;
        if (later) return `<div class="rcard"><div class="ri">✦</div><div class="rt"><b>Relic armor</b><small>“A Hurst in the metal? Not until you’ve seen what one can do, boy. Ask me again after the Megla.”</small></div></div>`;
        return card(r.out, owned ? 'Owned' : locked ? 'Duro needs a tusk first' : `Forge · ${r.shards} ◆`, ok ? `forge:${r.out}` : null, false, `${needText(r.need)} + ${r.shards} shards${ITEMS[r.out].relicArmor ? ' · ✦ Relic armor' : ''}`);
      }).join('') + `</div>`;
    } else if (page === 'bind') {
      // the Carpenter's bench: a Relic's Hurst into something you wear
      const relics = Object.keys(BINDABLE_RELICS).filter(id => count(inv, id) > 0 && (!api.relicReady || api.relicReady(id)));
      const pieces = Object.keys(inv.items).filter(k => ITEMS[k] && ITEMS[k].kind === 'wear' && !ITEMS[k].relicArmor && k !== 'w_coat' && count(inv, k) > 0);
      h += `<h3>Buhkon’s bench <small>bind a Relic into what you wear</small></h3><p class="rmuted">The Relic goes into the piece for good — its Hurst settles in the cloth or the metal, and anything it could do on a quick slot it still does, from there. One lump of Stygian ore to seat it. (You have ${count(inv, 'ore')}.)</p>`;
      if (!relics.length) h += '<p class="rmuted">You’ve no Relic he can bind — one whose trigger you’ve found: the fire-stone, the humming stone, or a Gynge chip.</p>';
      else if (!pieces.length) h += '<p class="rmuted">Nothing to bind it into: bring him a cloak, a jerkin, gloves or boots.</p>';
      else for (const r of relics) {
        const R = BINDABLE_RELICS[r];
        h += `<h3>${ITEMS[r].icon} ${esc(ITEMS[r].name)} <small>— ${R.note}</small></h3><div class="rgrid">` + pieces.map(k => { const out = bindId(r, k); return ITEMS[out] ? card(out, 'Bind', count(inv, 'ore') > 0 ? `bind:${r}=${k}` : null, false, `Gives up: ${ITEMS[k].name} + ${ITEMS[r].name} + 1 Stygian ore`) : ''; }).join('') + `</div>`;
      }
    } else if (page === 'cook') {
      h += `<h3>The cookfire <small>cook</small></h3><div class="rgrid">` + RECIPES.filter(r => (r.out !== 'tea' || (S.flags || {}).recipe_tea) && (r.out !== 'bun' || (S.flags || {}).recipe_bun)).map(r => {
        const ok = hasAll(inv, r.need);
        return card(r.out, 'Cook', ok ? `cook:${r.out}` : null, false, needText(r.need));
      }).join('') + `</div>`;
    }
    body.innerHTML = h;
    body.querySelectorAll('[data-a]').forEach(b => {
      b.onclick = () => { const i = b.dataset.a.indexOf(':'); api.act(b.dataset.a.slice(0, i), b.dataset.a.slice(i + 1)); render(); };
    });
    body.querySelectorAll('select[data-slot]').forEach(sel => { sel.onchange = () => { api.act('slot', sel.dataset.slot + '=' + sel.value); render(); }; });
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
    if (g.type === 'uniques') return `<p class="rgoal">${g.ids.filter(id => (S.cleared || {})[id]).length} / ${g.ids.length}</p>`;
    if (g.type === 'lit') return `<p class="rgoal">${Object.keys(S.lit || {}).filter(k => k.startsWith(g.prefix)).length} / ${g.n} lanterns awake</p>`;
    if (g.type === 'kills') return `<p class="rgoal">${Math.min(g.n, Math.max(0, ((S.killsBy || {})[g.kind] || 0) - ((S.qstart || {})[id] || 0)))} / ${g.n}</p>`;
    return '';
  }

  /* ---------------- the map ---------------- */
  let mapBase = null, mapScale = 1, mapHits = [];
  function paintBase() {
    const W = 310, c = document.createElement('canvas'); c.width = c.height = W;
    const g = c.getContext('2d'), img = g.createImageData(W, W), world = api.world();
    const M = world.map || { cx: 0, cz: 0, span: 440 };
    const span = M.span; mapScale = 620 / span; const base = W / span;
    for (let py = 0; py < W; py++) for (let px = 0; px < W; px++) {
      const x = M.cx + px / base - span / 2, z = M.cz + py / base - span / 2;
      const R = world.edgeRadius(x, z), r = Math.hypot(x, z), i = (py * W + px) * 4;
      if (r > R) { img.data[i] = 20; img.data[i + 1] = 28; img.data[i + 2] = 48; img.data[i + 3] = 255; continue; }
      const h = world.heightAt(x, z);
      const hz = world.hazards.some(b => Math.hypot(x - b.x, z - b.z) < b.r);
      let col = api.region() === 'leotik' ? [52, 96, 58] : [168, 160, 88];
      if (hz) col = [140, 200, 60];
      if (world.water && world.water.isWater && world.water.isWater(x, z)) col = [70, 120, 170];
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
    const M = api.world().map || { cx: 0, cz: 0, span: 440 };
    const P = (x, z) => [(x - M.cx + M.span / 2) * mapScale, (z - M.cz + M.span / 2) * mapScale];
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
