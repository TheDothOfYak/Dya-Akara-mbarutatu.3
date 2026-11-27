// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3: the small surprises. Pokeable things, secrets, rare events, keepsakes.
// Every surprise has an id in F.all; finding one writes it into the Field Journal.
(function () {
  'use strict';
  const V3 = window.V3, U = V3.util, P = V3.paint, W = V3.world, S = V3.sky, HS = V3.heroes, TAU = U.TAU;
  const INK = '#3b1f12';
  const F = (V3.fun = { found: new Set(), kept: new Set(), things: [], flags: {} });
  const PT = () => V3.party, A = () => V3.audio;
  const later = (fn, delay) => { const things = F.things; setTimeout(() => { if (F.things === things) fn(); }, delay); };

  F.all = [
    ['music', 'Singing Toadstools', 'West woods, a row of five caps', 'Each cap hums its own note when you poke it or land on it.'],
    ['tune', 'The Stump Tune', 'The carving on the stump shows which caps', 'Played the three notes on the stump. Something clicked inside.'],
    ['dandelion', 'Dandelion Ride', 'Bump a dandelion clock as the Fuzzy', 'The Fuzzy is light enough to ride a dandelion seed.'],
    ['owl', 'The Owl Who Says Who', 'A tall tree west of the village', 'Asleep all day. At night her eyes follow you.'],
    ['well', 'The Echo Well', 'Village well', 'It says hello back. Eventually something else comes up.'],
    ['wellfall', 'Rock Bottom', 'Lean on the well as the Rock', 'The Rock leaned in to look. Rocks should not lean.'],
    ['sock', 'Sock Hat', 'Run through the washing line', 'A sock landed on your head and you wore it with pride.'],
    ['sneeze', 'Pepperbloom', 'East edge of the village', 'A flower that sneezes on you. You sneezed back.'],
    ['beetle', 'Nobody Home', 'A stump with a tiny door', 'Knock three times. Somebody is, in fact, home.'],
    ['hatlegs', 'The Walking Hat', 'The scarecrow by the west gate', "Knock the scarecrow's hat off and watch it walk back."],
    ['fireflies', 'Firefly Parade', 'The woods at night, as the Ghost', 'Fireflies think the Ghost is the moon and follow him.'],
    ['star', 'Shooting Star', 'Look up at night', 'A star fell over Tuftwood. Wish made.'],
    ['rainbow', "Rainbow's End", 'East shore of the pond in a sun-shower', 'It ends in a pot of acorns. Of course it does.'],
    ['koi', 'Moon Koi', 'Mirror Pond at night', 'A glowing fish no bigger than a thumb. Show a brother.'],
    ['goldsnail', 'Golden Snail', 'Behind the bramble ring in the west woods', 'One snail in Tuftwood has a shell of gold. He is in no hurry.'],
    ['pondfloor', 'Bottom of the Pond', 'Only someone who sinks can walk down there', "The Rock can't swim. Turns out he doesn't need to."],
    ['shything', 'The Shy Thing', 'Eyes in a bush, east of the village', 'It hides from everyone. The Ghost is quiet enough to say hello.'],
    ['birdcap', 'Bird on a Cap', 'Stand very still as the Rock', "A bird decided the Rock's mushroom cap was a good perch."],
    ['chime', 'Wind Chime', 'Hanging on a cottage', 'It rings by itself when the wind picks up.'],
    ['ghostscript', 'Ghost Writing', 'Only the Ghost can see it', 'Old words on old stones, about the World Eaters.'],
    ['hearth', "Brothers' Hearth", 'The fire in the village', 'All four brothers by one fire. Everyone feels better.'],
    ['treebonk', 'Timber-headed', 'Stand in front of a tree when a warthog charges', 'The warthog met the tree. The tree won.'],
    ['hogram', 'Hog vs Tree', "Bring a warthog to Snagroot's glade", 'A charging warthog cracked a sap knot open for you.'],
    ['burp', 'Table Manners', 'A slime and an Eater Rock', 'The Eater Rock ate a slime and burped.'],
    ['spookbonk', 'Boo-nk', 'Say boo near a wall or water', 'A spooked creature ran straight into trouble.'],
    ['snailride', 'Worst Ride Ever', 'Possess a snail', 'The Ghost borrowed a snail. He regrets it.'],
    ['selfslap', 'Stop Hitting Yourself', 'Possess a stuck vine', 'Snagroot slapped his own knot. The Ghost was no help at all.'],
    ['decoy', 'Scarecrow Sprout', "Grow a stalk in Snagroot's reach", 'Snagroot grabbed the sproutstalk and missed you entirely.'],
    ['snagslam', 'Rattled', 'Slam the ground near Snagroot', 'One good slam and every vine went limp.'],
    ['hogwall', 'Battering Hog', 'Ride a warthog into a wall', 'A borrowed warthog makes a fine door-opener.'],
    ['twig', 'Too Heavy', 'The twig bridge over Root Hollow', 'The bridge held for three brothers. Not the fourth.'],
    ['rootnap', 'Taking Root', 'Stay tucked in as the Acorn', 'The Acorn put down roots for a minute and woke up fresher.'],
    ['echo', 'Echo... echo...', 'Say boo inside Root Hollow', 'The cave said boo back three times.'],
    ['frogleap', 'Frog Fountain', 'Slam near the pond', 'Every frog jumped at once.'],
    ['burrs', 'Hitchhikers', 'Dash through the burr bush as the Fuzzy', 'Three burr-bugs rode in your fur until you puffed them off.'],
    ['rift', 'A Tear in the Sky', 'All four brothers must touch the Brother Stone', 'Something enormous looked through. It was only a baby.'],
  ].map((a) => ({ id: a[0], name: a[1], hint: a[2], text: a[3] }));
  F.keepsakes = [
    ['humstone', 'Hum-stone', 'A pebble that hums the stump tune when you hold it.'], ['feather', 'Owl Feather', 'She let you keep one. Who? You.'],
    ['button', 'Lost Button', 'A frog brought it up from the well.'], ['boot', 'Old Boot', 'From the bottom of Mirror Pond. A minnow lived in it.'],
    ['shypebble', 'Shy Pebble', 'A gift from the Shy Thing. It is warm.'], ['heartknot', 'Heartknot Bud', "Old Snagroot's first blossom in years."],
    ['glowspore', 'Glowcap Spore', 'From the deep end of Root Hollow. A night light.'], ['goldshell', 'Gold Flake', 'The golden snail shed it on purpose. Probably.'],
    ['sock', 'Lucky Sock', "Old Tuft says keep it. He's been looking for an excuse."], ['shard', 'Brother Shard', 'A chip of the stone, warm on four sides.'],
    ['hat', 'Feathered Hat', "Tumble's price for five good stories."], ['amulet', 'Sun Amulet', "Tumble's price for fifteen."],
  ].map((a) => ({ id: a[0], name: a[1], text: a[2] }));
  const byId = {}; F.all.forEach((d) => (byId[d.id] = d));
  F.find = (id) => {
    if (F.found.has(id) || !byId[id]) return false;
    F.found.add(id); A().sfx('discover');
    V3.ui.toast('Discovered', byId[id].name, F.found.size + ' of ' + F.all.length);
    P.burst(PT().x, PT().y - 70, 10, { kind: 'star', col: '#ffe08a', speed: 160, r: 7, vy: -80, life: 0.9, layer: 1 });
    V3.bus.emit('discovered', id); V3.game.saveSoon(); return true;
  };
  F.keep = (id) => { if (F.kept.has(id)) return false; F.kept.add(id); const k = F.keepsakes.find((k) => k.id === id); A().sfx('keepsake'); V3.ui.toast('Keepsake', k.name, k.text); V3.game.saveSoon(); return true; };
  V3.bus.on('found', F.find);
  V3.bus.on('twigsnap', () => F.find('twig'));
  V3.bus.on('rooted', () => F.find('rootnap'));
  V3.bus.on('boo', (x, y) => { if (W.caveAt(x, y) > 0.5) { F.find('echo'); [0.35, 0.7, 1.05].forEach((d, i) => later(() => { P.say(x + (i - 1) * 160, y - 120 - i * 20, 'boo...', 'rgba(220,230,255,' + (0.8 - i * 0.2) + ')', 26 - i * 5); A().sfx('boo', { vol: 0.4 - i * 0.1, pitch: 0.9 }); }, d * 1000)); for (const c of V3.creatures.list) if (c.kind === 'bat' && c.hang) { c.hang = false; c.state = 'fly'; c.spooked = 2; } } });
  V3.bus.on('slam', (x) => {
    if (x > 6500 && x < 7850) { let n = 0; for (const c of V3.creatures.list) if (c.kind === 'frog' && c.grounded) { c.vy = -700 - U.rand(0, 200); c.vx = U.rand(-120, 120); c.grounded = false; n++; } if (n) { A().sfx('ribbit'); F.find('frogleap'); } }
    for (const t of V3.scenery.trees) if (Math.abs(t.x - x) < 240) { t.shake = 0.5; for (let i = 0; i < 8; i++) P.emit({ kind: 'leaf', x: t.x + U.rand(-90, 90), y: t.y - t.h + U.rand(-50, 50), vy: U.rand(30, 90), g: 50, windy: 60, col: U.pick(['#7cbf45', '#cfe86a']), life: 2.2, r: 8 }); }
    for (const th of F.things) if (th.kind === 'toad' && Math.abs(th.x - x) < 300) ring(th);
  });
  V3.bus.on('snagcalm', () => { F.keep('heartknot'); F.flags.snagCalm = true; V3.ui.banner('Old Snagroot is calm', 'He was only thirsty and grumpy. Now he is in bloom.'); });
  V3.bus.on('splash', (x, id) => { if (id === 'rock') F.flags.rockSwam = true; });

  // ================= placement =================
  const T = (kind, x, o) => { const t = Object.assign({ kind, x, y: W.groundY(x), t: 0, n: 0, wob: 0 }, o || {}); F.things.push(t); return t; };
  F.init = () => {
    F.things = [];
    [0, 1, 2, 3, 4].forEach((i) => T('toad', 2700 + i * 52, { note: i, s: 0.8 + ((i * 7) % 5) * 0.09 }));
    T('stump', 3000, { tune: [2, 0, 4] }); F.tuneBuf = [];
    [2200, 3160, 5820, 8260, 8760, 620].forEach((x) => T('dandelion', x, { full: true }));
    const ot = V3.scenery.owlTree; T('owl', ot.x + 6, { y: ot.y - ot.h * 0.52, spin: 0 });
    T('well', 4190); T('line', 4520, { w: 150, socks: 4 }); T('sneezer', 5085); T('door', 3250, {}); T('scarecrow', 3560, { hat: 0 });
    T('hearth', 4320); T('chime', 4775, { y: W.groundY(4620) - 152 }); T('burrbush', 3350); T('shy', 5150); T('boot', 7210); T('spore', 1240);
    T('script', 1700, { line: 'THE EATERS DO NOT DIE. THEY ONLY MOVE ON.' }); T('script', 6330, { line: 'WHERE AN EATER TURNS IN ITS SLEEP, A RIFT OPENS INTO THE DUAT.' }); T('script', 8520, { line: 'THE SMALL ONE IS CALLED APOPHIS. IT IS STILL HUNGRY.' });
    T('stone', 8900, { lit: {} }); T('rainbowend', 7850); T('portal', 4840);
    F.flies = []; const r = U.mulberry(88);
    for (let i = 0; i < 46; i++) { const hx = r() < 0.5 ? 1950 + r() * 1400 : 5250 + r() * 1300; F.flies.push({ hx, x: hx, y: W.groundY(hx) - 60 - r() * 180, ph: r() * 9, sp: 0.5 + r() }); }
    F.koi = { x: 7100, t: 0, on: false }; F.star = { t: 30, on: 0 }; F.bird = { on: 0 }; F.burrs = 0; F.sock = 0; F.flyNear = 0;
  };
  const ring = (th) => { th.wob = 0.5; A().note(th.note); P.emit({ kind: 'text', text: '♪', x: th.x, y: th.y - 60, vy: -50, vx: U.rand(-20, 20), col: ['#ff8fa3', '#ffd166', '#8ce99a', '#74c0fc', '#b197fc'][th.note], r: 26, life: 1.1 }); F.find('music'); F.tuneBuf.push(th.note); if (F.tuneBuf.length > 3) F.tuneBuf.shift(); const st = F.things.find((t) => t.kind === 'stump'); if (!F.found.has('tune') && F.tuneBuf.join() === st.tune.join()) { F.find('tune'); st.open = 1; later(() => F.keep('humstone'), 900); } };

  // ================= poking =================
  const pokeable = (t) => t.kind !== 'line' && t.kind !== 'burrbush' && t.kind !== 'rainbowend';
  // distance to the nearest pokeable prop (Infinity if none in reach); see N.dist
  F.pokeDist = () => { const p = PT(); let bd = Infinity; for (const t of F.things) { const d = U.dist(p.x, p.y - 30, t.x, t.y - 30); if (d < 95 && d < bd && pokeable(t)) bd = d; } return bd; };
  F.poke = () => {
    const p = PT(); let best = null, bd = 95;
    for (const t of F.things) { const d = U.dist(p.x, p.y - 30, t.x, t.y - 30); if (d < bd && pokeable(t)) { bd = d; best = t; } }
    const c = V3.creatures.nearest(p.x, p.y - 20, 70, (c) => c.critter || (c.kind === 'snag' && c.calm));
    if (c && !best) { if (c.kind === 'snag') return V3.creatures.sparPoke(p);
      if (c.golden) { F.find('goldsnail'); F.keep('goldshell'); } if (c.kind === 'snail') { c.hide = 2.5; F.flags.pokedSnail = (F.flags.pokedSnail || 0) + 1; P.say(c.x, c.y - 50, c.golden ? '...' : U.pick(['eep', 'excuse you', '!']), '#fff', 18); } else if (c.kind === 'frog') { c.vy = -620; c.vx = c.f * 200; c.grounded = false; A().sfx('ribbit'); } A().sfx('poke'); return true; }
    if (!best) return false;
    const t = best; t.n++; A().sfx('poke');
    switch (t.kind) {
      case 'toad': ring(t); break;
      case 'stump': P.say(t.x, t.y - 110, t.open ? 'click.' : 'three marks: tall, short, taller', '#ffe9c0', 20); break;
      case 'dandelion': puffDandelion(t); break;
      case 'owl': t.spin = 1; A().sfx('hoot'); P.say(t.x, t.y - 60, S.night > 0.5 ? 'Who?' : U.pick(['hoo... zzz', 'five more minutes', 'WHO. oh. you.']), '#fff3d0', 22); F.find('owl'); if (t.n === 3) F.keep('feather'); break;
      case 'well':
        if (p.id === 'rock' && !F.found.has('wellfall')) { p.frozen = 1.6; t.fall = 1.6; A().sfx('splash'); F.find('wellfall'); F.flags.fellInWell = true; P.say(t.x, t.y - 150, 'SPLOOSH', '#cfefff', 30); }
        else { P.say(t.x, t.y - 130, 'hello?', '#fff', 22); later(() => { P.say(t.x, t.y - 100, '...hello', 'rgba(210,235,255,.9)', 18); A().sfx('talk', { pitch: 0.6, vol: 0.4 }); }, 700); F.find('well'); if (t.n >= 3 && !F.kept.has('button')) { t.frog = 2.5; later(() => { A().sfx('ribbit'); F.keep('button'); }, 800); } }
        break;
      case 'sneezer': t.wob = 0.6; A().sfx('sneeze'); P.burst(t.x, t.y - 60, 26, { col: '#ffe27a', speed: 200, life: 0.9, r: 5, a: 0.8 }); later(() => { if (p.id !== 'ghost') { p.vy = -420; p.grounded = false; } P.say(p.x, p.y - 100, 'ACHOO!', '#fff', 30); A().sfx('sneeze', { pitch: 1.4 }); V3.game.shake(5); }, 550); F.find('sneeze'); break;
      case 'door': A().sfx('knock'); t.wob = 0.3; if (t.n % 3 === 1) P.say(t.x, t.y - 80, '...', '#fff', 22); else if (t.n % 3 === 2) P.say(t.x, t.y - 80, 'nobody home.', '#ffe9c0', 18); else { t.open = 2.4; P.say(t.x + 30, t.y - 86, U.pick(['WHAT.', 'we gave at the acorn drive.', 'I am NAPPING.']), '#ffe9c0', 22); F.find('beetle'); } break;
      case 'scarecrow': if (!t.hat) { t.hat = 0.01; t.hx = t.x + 70; A().sfx('thud', { vol: 0.5 }); P.say(t.x, t.y - 170, 'my hat!', '#ffe9c0', 20); } break;
      case 'hearth': p.healAll(); F.find('hearth'); F.rest = 3; A().sfx('heal'); P.say(t.x, t.y - 120, 'The brothers rest by the fire', '#ffe9c0', 22); if (S.night > 0.6) { V3.game.fade(() => S.setTime(0.27)); } V3.game.saveSoon(); break;
      case 'chime': t.wob = 1; [0, 2, 4].forEach((n, i) => later(() => A().sfx('chime', { pitch: 1 + n * 0.12 }), i * 120)); F.find('chime'); break;
      case 'shy': if (p.id === 'ghost' && p.solidT <= 0) { F.find('shything'); F.keep('shypebble'); P.say(t.x, t.y - 80, '...hi.', '#dfe8ff', 18); } break;
      case 'boot': if (p.id === 'rock' && !F.kept.has('boot')) { F.keep('boot'); F.find('pondfloor'); P.burst(t.x, t.y - 20, 10, { kind: 'ring', R: 8, col: '#d6f3ff', speed: 40, vy: -80, life: 1.2, r: 3 }); } break;
      case 'spore': F.keep('glowspore'); break;
      case 'script': if (p.id === 'ghost') { V3.ui.banner('Ghost writing', t.line); F.find('ghostscript'); A().sfx('rift', { vol: 0.4 }); } else P.say(t.x, t.y - 90, 'just an old stone', '#ddd', 18); break;
      case 'stone': P.say(t.x, t.y - 170, Object.keys(t.lit).length + ' of 4 brothers have touched it', '#ffe9c0', 20); break;
      case 'portal': V3.ui.banner('The town portal is asleep', 'In the full game it goes up to Cloudtop. Not in this sample.'); break;
    }
    return true;
  };
  const puffDandelion = (t) => {
    if (!t.full) return; t.full = false; t.regrow = 20; A().sfx('puff', { pitch: 1.4 });
    for (let i = 0; i < 18; i++) P.emit({ kind: 'fluff', x: t.x + U.rand(-14, 14), y: t.y - 78 + U.rand(-14, 14), vx: U.rand(-30, 60), vy: U.rand(-80, -20), windy: 160, col: '#ffffff', life: 3, r: 4.5, a: 0.9 });
    const p = PT(); if (p.id === 'fuzzy' && Math.abs(p.x - t.x) < 90) { p.vy = -760; p.grounded = false; p.puffs = 2; F.find('dandelion'); P.say(p.x, p.y - 100, 'wheee', '#fff', 22); }
  };

  // ================= update =================
  F.update = (dt) => {
    const p = PT(), night = S.night > 0.5;
    for (const t of F.things) {
      t.t += dt; t.wob = Math.max(0, t.wob - dt);
      const near = Math.abs(p.x - t.x) < 60 && Math.abs(p.y - t.y) < 70;
      if (t.kind === 'toad') { if (near && p.landed && p.id !== 'ghost' && t.wob <= 0) { ring(t); p.vy = -460; p.grounded = false; } }
      else if (t.kind === 'stump') { if (t.open > 0 && t.open < 1) t.open += dt; }
      else if (t.kind === 'dandelion') { if (!t.full && (t.regrow -= dt) <= 0) t.full = true; if (t.full && Math.abs(p.x - t.x) < 34 && Math.abs(p.y - 40 - (t.y - 70)) < 60 && p.id !== 'ghost' && (Math.abs(p.vx) > 100 || !p.grounded)) puffDandelion(t); }
      else if (t.kind === 'owl') { t.spin = Math.max(0, t.spin - dt * 1.4); if (night && p.id === 'ghost' && U.dist(p.x, p.y, t.x, t.y) < 110 && !t.who) { t.who = true; P.say(t.x, t.y - 60, 'Who?', '#fff3d0', 24); A().sfx('hoot'); F.find('owl'); } if (!night && U.chance(dt * 0.25) && Math.abs(p.x - t.x) < 500) P.say(t.x + 20, t.y - 50, 'z', '#dfe8ff', 18); }
      else if (t.kind === 'well') { if (t.fall > 0) { t.fall -= dt; if (t.fall <= 0) { p.x = t.x + 70; p.y = t.y - 140; p.vy = -200; P.burst(t.x, t.y - 80, 20, { kind: 'drop', col: '#d6f3ff', speed: 300, vy: -260, g: 900, r: 3 }); } else { p.x = t.x; p.y = t.y; p.vx = p.vy = 0; } p.hidden = t.fall > 0; } t.frog = Math.max(0, (t.frog || 0) - dt); }
      else if (t.kind === 'line') { if (t.socks > 1 && Math.abs(p.x - t.x) < t.w * 0.5 && p.y - p.h < t.y - 96 && p.y > t.y - 150 && Math.abs(p.vx) > 120 && F.sock <= 0 && p.id !== 'ghost') { t.socks--; F.sock = 40; F.find('sock'); F.keep('sock'); F.flags.sock = true; A().sfx('puff'); } }
      else if (t.kind === 'door') { t.open = Math.max(0, (t.open || 0) - dt); }
      else if (t.kind === 'scarecrow') { if (t.hat > 0) { t.hat += dt; if (t.hat > 2.2) { t.hx = U.approach(t.hx, t.x, 40 * dt); if (t.hat > 2.6 && !t.seen) { t.seen = true; F.find('hatlegs'); } if (Math.abs(t.hx - t.x) < 1) { t.hat = 0; t.seen = false; A().sfx('plop'); } } } }
      else if (t.kind === 'hearth') { if (U.chance(dt * 12)) P.emit({ x: t.x + U.rand(-10, 10), y: t.y - 18, vx: U.rand(-12, 12), vy: -70 - U.rand(0, 40), col: U.pick(['#ffd166', '#ff9f5a', '#ff6b4a']), life: 0.7, r: 6, kind: 'dot', a: 0.8 }); if (U.chance(dt * 1.5)) P.emit({ kind: 'spark', x: t.x, y: t.y - 30, vx: U.rand(-40, 40), vy: -160, col: '#ffe08a', life: 0.8, r: 3 }); }
      else if (t.kind === 'chime') { if (S.wind > 0.75 && U.chance(dt * 0.6)) { t.wob = 1; if (Math.abs(p.x - t.x) < 600) A().sfx('chime', { vol: 0.35, pitch: 1 + U.rand(0, 0.5) }); } }
      else if (t.kind === 'burrbush') { if (p.id === 'fuzzy' && near && Math.abs(p.vx) > 250 && !F.burrs) { F.burrs = 3; F.find('burrs'); A().sfx('poke'); P.say(p.x, p.y - 90, 'hitchhikers!', '#ffe9c0', 20); } }
      else if (t.kind === 'shy') { const d = U.dist(p.x, p.y, t.x, t.y - 40); t.hide = U.damp(t.hide || 0, d < 260 && !(p.id === 'ghost' && p.solidT <= 0) ? 1 : 0, 6, dt); }
      else if (t.kind === 'stone') {
        if (near && p.grounded && !t.lit[p.id] && p.id !== 'ghost' || (p.id === 'ghost' && U.dist(p.x, p.y, t.x, t.y - 40) < 70 && !t.lit.ghost)) { t.lit[p.id] = true; A().sfx('chime', { pitch: 0.7 + Object.keys(t.lit).length * 0.15 }); P.emit({ kind: 'ring', x: t.x, y: t.y - 60, R: 120, r: 6, col: '#ffe9a0', life: 0.6 }); P.say(t.x, t.y - 170, HS.info[p.id].name + ' touched the stone', '#ffe9c0', 22); V3.game.saveSoon(); if (Object.keys(t.lit).length === 4 && !F.found.has('rift')) V3.game.riftScene(t); }
      }
      else if (t.kind === 'rainbowend') { if (S.rainbow > 0.5) { if (U.chance(dt * 8)) P.emit({ kind: 'star', x: t.x + U.rand(-30, 30), y: t.y - U.rand(0, 200), vy: -30, col: U.pick(['#ff6b6b', '#ffe066', '#8ce99a', '#74c0fc']), life: 1, r: 6 }); if (Math.abs(p.x - t.x) < 50 && !t.done) { t.done = true; F.find('rainbow'); for (let i = 0; i < 26; i++) P.emit({ kind: 'dot', x: t.x + U.rand(-90, 90), y: t.y - 400 - U.rand(0, 200), vy: 200, g: 500, col: '#c9772f', life: 1.6, r: 8 }); A().sfx('seed'); } } else t.done = false; }
    }
    // burr-bugs ride in the fur until puffed off
    if (F.burrs && p.id === 'fuzzy' && p.puffing) { for (let i = 0; i < F.burrs; i++) P.emit({ kind: 'dot', x: p.x, y: p.y - 30, vx: U.rand(-200, 200), vy: -200, g: 700, col: '#7a8a3a', life: 1, r: 6 }); F.burrs = 0; P.say(p.x, p.y - 100, 'bye!', '#fff', 18); }
    F.sock = Math.max(0, F.sock - dt);
    // fireflies
    for (const f of F.flies) {
      f.ph += dt * f.sp; let tx = f.hx + Math.sin(f.ph) * 60, ty = W.groundY(f.hx) - 90 + Math.cos(f.ph * 1.3) * 50;
      if (night && p.id === 'ghost' && Math.abs(p.x - f.x) < 420) { const a = f.ph * 2; tx = p.x + Math.cos(a) * (50 + f.sp * 40); ty = p.y - 40 + Math.sin(a) * (40 + f.sp * 20); if (U.dist(p.x, p.y, f.x, f.y) < 120) { F.flyNear = (F.flyNear || 0) + dt; if (F.flyNear > 8) F.find('fireflies'); } }
      f.x = U.damp(f.x, tx, 1.2, dt); f.y = U.damp(f.y, ty, 1.2, dt);
    }
    // moon koi: sometimes, at night, near the middle of the pond
    F.koi.t += dt; if (night && !F.koi.on && U.chance(dt * 0.05)) { F.koi.on = true; F.koi.x = 6800; } if (F.koi.on) { F.koi.x += 34 * dt; if (F.koi.x > 7560 || !night) F.koi.on = false; if (Math.abs(p.x - F.koi.x) < 190 && Math.abs(p.y - 62) < 420) F.find('koi'); } // only counts when the koi is actually on screen
    // shooting star
    F.star.t -= dt; if (F.star.on > 0) F.star.on -= dt; else if (night && F.star.t <= 0) { F.star.on = 1.3; F.star.t = U.rand(50, 110); F.star.x = U.rand(0.2, 0.7); A().sfx('star'); if (W.caveAt(p.x, p.y) < 0.3) F.find('star'); } // no wish counted from inside Root Hollow, where the sky can't be seen
    // a bird picks the Rock's cap
    if (p.id === 'rock' && p.idle > 6 && S.night < 0.3 && S.rain < 0.2 && !p.rolling && W.caveAt(p.x, p.y) < 0.2) { F.bird.on = Math.min(F.bird.on + dt, 30); if (F.bird.on > 1.5) { F.find('birdcap'); if (U.chance(dt * 0.5)) { A().sfx('chime', { pitch: 2.2, vol: 0.3 }); P.emit({ kind: 'text', text: '♪', x: p.x + 20, y: p.y - 150, vy: -30, col: '#fff', r: 18, life: 1 }); } } } else if (F.bird.on > 0) { F.bird.on = 0; P.burst(p.x, p.y - 130, 5, { kind: 'leaf', col: '#6fa8dc', speed: 200, vy: -200, life: 0.6, r: 6 }); }
    F.rest = Math.max(0, (F.rest || 0) - dt);
    for (const pl of W.platforms) if (pl.regrow > 0 && (pl.regrow -= dt) <= 0) pl.gone = false;
  };

  // ================= drawing =================
  const post = (g, x, y, h, w) => { g.fillStyle = P.lin(g, x - w, 0, x + w, 0, [[0, '#b98458'], [1, '#6e452b']]); P.rr(g, x - w, y - h, w * 2, h + 4, w * 0.6); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke(); };
  const hat = (g, x, y, s) => { g.save(); g.translate(x, y); g.scale(s, s); g.beginPath(); g.ellipse(0, 0, 30, 8, -0.1, 0, TAU); g.fillStyle = '#3f8a3c'; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke(); g.beginPath(); g.moveTo(-17, -1); g.quadraticCurveTo(-14, -26, 2, -24); g.quadraticCurveTo(16, -22, 17, -3); g.closePath(); g.fillStyle = P.lin(g, -14, -24, 14, 0, [[0, '#6fbf5a'], [1, '#2f6e3a']]); g.fill(); g.stroke(); g.fillStyle = '#e2a93b'; g.fillRect(-16, -7, 33, 4.5); g.strokeStyle = '#fff'; g.lineWidth = 3.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(12, -8); g.quadraticCurveTo(26, -24, 20, -36); g.stroke(); g.restore(); };
  F.hat = hat;
  F.drawBack = (g, v) => {
    const p = PT(), ghost = p.id === 'ghost';
    for (const t of F.things) {
      if (t.x < v.x0 - 260 || t.x > v.x1 + 260) continue;
      const x = t.x, y = t.y, wob = Math.sin(t.wob * 30) * t.wob;
      switch (t.kind) {
        case 'toad': { const s = t.s, c = ['#ff8fa3', '#ffd166', '#8ce99a', '#74c0fc', '#b197fc'][t.note]; g.save(); g.translate(x, y + 4); g.scale(1 + wob * 0.3, 1 - wob * 0.4); g.fillStyle = '#fff1d6'; P.rr(g, -9 * s, -40 * s, 18 * s, 44 * s, 8); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke(); g.beginPath(); g.moveTo(-34 * s, -34 * s); g.quadraticCurveTo(-30 * s, -72 * s, 0, -72 * s); g.quadraticCurveTo(30 * s, -72 * s, 34 * s, -34 * s); g.quadraticCurveTo(0, -24 * s, -34 * s, -34 * s); g.closePath(); g.fillStyle = P.lin(g, -30, -72 * s, 30, -30 * s, [[0, U.mixHex(c, '#ffffff', 0.35)], [1, U.mixHex(c, '#3b1f12', 0.25)]]); g.fill(); g.stroke(); P.ell(g, -12 * s, -52 * s, 6 * s, 4.5 * s, '#fff7e8'); P.ell(g, 10 * s, -46 * s, 4.5 * s, 3.5 * s, '#fff7e8'); P.ell(g, 2 * s, -62 * s, 3.5 * s, 3 * s, '#fff7e8'); HS.eye(g, -6 * s, -18 * s, 3.4, 1); HS.eye(g, 6 * s, -18 * s, 3.4, 1); g.restore(); break; }
        case 'stump': { g.fillStyle = P.lin(g, x - 44, 0, x + 44, 0, [[0, '#c08752'], [1, '#6b4127']]); P.rr(g, x - 44, y - 58, 88, 64, 12); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(); P.ell(g, x, y - 58, 44, 11, '#e9c58d'); g.beginPath(); g.ellipse(x, y - 58, 44, 11, 0, 0, TAU); g.stroke(); g.beginPath(); g.ellipse(x, y - 58, 26, 6, 0, 0, TAU); g.lineWidth = 1.5; g.stroke(); t.tune.forEach((n, i) => { g.fillStyle = '#4a2f1e'; P.rr(g, x - 26 + i * 22, y - 12 - 6 - n * 6, 8, 6 + n * 6, 3); g.fill(); }); if (t.open) { g.globalCompositeOperation = 'lighter'; P.glow(g, x, y - 60, 50, '#ffe08a', 0.5); g.globalCompositeOperation = 'source-over'; } break; }
        case 'dandelion': { const sw = S.sway(x) * 10; g.strokeStyle = '#4f9a3c'; g.lineWidth = 3.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y + 2); g.quadraticCurveTo(x + sw * 0.4, y - 40, x + sw, y - 76); g.stroke(); if (t.full) { P.glow(g, x + sw, y - 80, 24, '#ffffff', 0.95); for (let i = 0; i < 12; i++) { const a = i * 0.52; g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x + sw, y - 80); g.lineTo(x + sw + Math.cos(a) * 20, y - 80 + Math.sin(a) * 20); g.stroke(); } } else P.ell(g, x + sw, y - 78, 4, 4, '#d9c36a'); break; }
        case 'owl': { g.save(); g.translate(x, y); P.ell(g, 0, 0, 30, 36, '#3a2418'); P.ball(g, 0, 2, 22, 27, '#d9b48a', '#a87c52', '#6b4a30'); g.strokeStyle = INK; g.lineWidth = 2.6; g.beginPath(); g.ellipse(0, 2, 22, 27, 0, 0, TAU); g.stroke(); g.save(); g.translate(0, -8); g.rotate(t.spin * TAU); for (const s of [-1, 1]) { P.ell(g, s * 9, 0, 9, 9, '#fff3d6'); g.beginPath(); g.arc(s * 9, 0, 9, 0, TAU); g.stroke(); const awake = S.night > 0.5 || t.spin > 0; if (awake) { const d = Math.atan2(p.y - 40 - y, p.x - x); P.ell(g, s * 9 + Math.cos(d) * 3, Math.sin(d) * 3, 4.5, 4.5, '#1c0e09'); P.ell(g, s * 9 + Math.cos(d) * 3 - 1.5, Math.sin(d) * 3 - 1.5, 1.4, 1.4, '#fff'); } else P.ink(g, [[s * 9 - 6, 0], [s * 9, 3], [s * 9 + 6, 0]], 2.4, '#2a140c'); } g.fillStyle = '#e2a93b'; g.beginPath(); g.moveTo(-4, 6); g.lineTo(0, 13); g.lineTo(4, 6); g.fill(); g.restore(); g.restore(); break; }
        case 'well': { g.fillStyle = P.lin(g, x - 50, 0, x + 50, 0, [[0, '#d8d2c8'], [1, '#7c746c']]); P.rr(g, x - 50, y - 56, 100, 62, 10); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(); for (let i = 0; i < 4; i++) { g.strokeStyle = 'rgba(60,50,46,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 50, y - 42 + i * 14); g.lineTo(x + 50, y - 42 + i * 14); g.stroke(); } P.ell(g, x, y - 56, 50, 12, '#24303a'); g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y - 56, 50, 12, 0, 0, TAU); g.stroke(); post(g, x - 46, y - 56, 90, 6); post(g, x + 46, y - 56, 90, 6); g.beginPath(); g.moveTo(x - 70, y - 140); g.lineTo(x, y - 190); g.lineTo(x + 70, y - 140); g.closePath(); g.fillStyle = P.lin(g, x - 60, y - 190, x + 60, y - 140, [[0, '#f6d27a'], [1, '#a66a2c']]); g.fill(); g.stroke(); if (t.frog > 0) { g.save(); g.translate(x, y - 62 - Math.sin(Math.min(1, (2.5 - t.frog) * 2) * Math.PI / 2) * 16); V3.creatures.drawOne(g, 'frog'); g.restore(); } break; }
        case 'line': { post(g, x - t.w / 2, y, 130, 5); post(g, x + t.w / 2, y, 130, 5); g.strokeStyle = '#6b4127'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - t.w / 2, y - 126); g.quadraticCurveTo(x, y - 108, x + t.w / 2, y - 126); g.stroke(); for (let i = 0; i < t.socks; i++) { const sx = x - t.w / 2 + 28 + i * 30, sy = y - 116 + Math.abs(i - 1.5) * -4, sw = S.sway(sx) * 0.3; g.save(); g.translate(sx, sy); g.rotate(sw); g.fillStyle = ['#ff8fa3', '#fff', '#74c0fc', '#ffd166'][i]; P.rr(g, -7, 0, 14, 26, 5); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.2; g.stroke(); P.rr(g, -7, 20, 20, 10, 5); g.fill(); g.stroke(); g.restore(); } break; }
        case 'sneezer': { const sw = S.sway(x) * 6 + wob * 30; g.strokeStyle = '#4f9a3c'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y + 2); g.quadraticCurveTo(x + sw * 0.5, y - 30, x + sw, y - 58); g.stroke(); for (let i = 0; i < 7; i++) P.ell(g, x + sw + Math.cos(i * 0.9) * 17, y - 62 + Math.sin(i * 0.9) * 17, 12, 8, '#ff9f5a', i * 0.9); P.ell(g, x + sw, y - 62, 13, 13, '#ffd166'); g.strokeStyle = INK; g.lineWidth = 2.2; g.beginPath(); g.arc(x + sw, y - 62, 13, 0, TAU); g.stroke(); HS.eye(g, x + sw - 5, y - 64, 3, t.wob > 0 ? 0 : 1); HS.eye(g, x + sw + 5, y - 64, 3, t.wob > 0 ? 0 : 1); break; }
        case 'door': { g.fillStyle = P.lin(g, x - 40, 0, x + 40, 0, [[0, '#c08752'], [1, '#6b4127']]); P.rr(g, x - 40 + wob * 20, y - 66, 80, 72, 14); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(); P.ell(g, x, y - 66, 40, 10, '#e9c58d'); g.beginPath(); g.ellipse(x, y - 66, 40, 10, 0, 0, TAU); g.stroke(); const op = t.open > 0 ? 1 : 0; g.fillStyle = op ? '#24130b' : '#d9694f'; g.beginPath(); g.moveTo(x - 11, y + 2); g.lineTo(x - 11, y - 20); g.arc(x, y - 20, 11, Math.PI, 0); g.lineTo(x + 11, y + 2); g.closePath(); g.fill(); g.lineWidth = 2.2; g.stroke(); if (op) { P.ell(g, x + 2, y - 12, 8, 9, '#2f3a5a'); HS.eye(g, x - 1, y - 15, 2.6, 1); HS.eye(g, x + 6, y - 15, 2.6, 1); } else P.ell(g, x + 6, y - 14, 1.6, 1.6, '#f6d36b'); break; }
        case 'scarecrow': { post(g, x, y, 150, 5); g.strokeStyle = '#8a5a34'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 56, y - 104); g.lineTo(x + 56, y - 104); g.stroke(); P.ball(g, x, y - 130, 26, 26, '#f3d9a4', '#d9b06a', '#a67c3e'); g.strokeStyle = INK; g.lineWidth = 2.6; g.beginPath(); g.arc(x, y - 130, 26, 0, TAU); g.stroke(); g.lineWidth = 2.4; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s * 9 - 4, y - 138); g.lineTo(x + s * 9 + 4, y - 130); g.moveTo(x + s * 9 + 4, y - 138); g.lineTo(x + s * 9 - 4, y - 130); g.stroke(); } P.ink(g, [[x - 10, y - 118], [x - 4, y - 114], [x + 3, y - 119], [x + 10, y - 114]], 2.2, INK); g.fillStyle = '#b5654a'; P.rr(g, x - 30, y - 104, 60, 58, 10); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke(); if (!t.hat) hat(g, x, y - 152, 1); else { const k = Math.min(1, t.hat / 0.5), hx = t.hat > 2.2 ? t.hx : U.lerp(x, x + 70, k), hy = t.hat > 2.2 ? y - 14 - Math.abs(Math.sin(t.hat * 14)) * 5 : U.lerp(y - 152, y - 10, k * k); if (t.hat > 2.2) { g.strokeStyle = INK; g.lineWidth = 2.6; const st = Math.sin(t.hat * 14) * 5; g.beginPath(); g.moveTo(hx - 8, hy + 4); g.lineTo(hx - 8 + st, y); g.moveTo(hx + 8, hy + 4); g.lineTo(hx + 8 - st, y); g.stroke(); } hat(g, hx, hy, 1); } break; }
        case 'hearth': { for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI; P.ball(g, x + Math.cos(a) * 38, y - 4 - Math.sin(a) * 3, 10, 8, '#d8d2c8', '#9b948c', '#6c655f'); } g.strokeStyle = '#6e452b'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 24, y - 4); g.lineTo(x + 20, y - 18); g.moveTo(x + 24, y - 4); g.lineTo(x - 20, y - 18); g.stroke(); g.globalCompositeOperation = 'lighter'; const fl = 1 + Math.sin(S.time * 13) * 0.08; P.glow(g, x, y - 30, 80 * fl, '#ff9f3a', 0.5); g.globalCompositeOperation = 'source-over'; for (const f of [[0, 44, '#ff7a3a'], [-8, 30, '#ffb13a'], [6, 22, '#ffe27a']]) { g.beginPath(); g.moveTo(x + f[0] - 14, y - 12); g.quadraticCurveTo(x + f[0] - 12 + Math.sin(S.time * 9 + f[1]) * 5, y - 12 - f[1] * 0.7, x + f[0] + Math.sin(S.time * 7 + f[1]) * 6, y - 12 - f[1] * fl); g.quadraticCurveTo(x + f[0] + 13, y - 12 - f[1] * 0.5, x + f[0] + 14, y - 12); g.fillStyle = f[2]; g.fill(); }
          // the brothers who are not out front sit by the fire
          let k = 0; for (const id of HS.order) { if (id === p.id) continue; const sx = x + [-104, -60, 112][k++]; g.save(); g.translate(sx, id === 'ghost' ? y - 6 : y); g.scale(0.92, 0.92); HS.shadow(g, 0, 0, 26, 0.2); HS.draw[id](g, { f: sx < x ? 1 : -1, turn: sx < x ? 0.8 : -0.8, walk: 0, sx: 1, sy: 1 + Math.sin(S.time * 2 + k) * 0.015, blink: (S.time + k * 1.3) % 4 > 3.85 ? 0 : 1, mood: 1, t: S.time + k, vx: 0, moving: 0, solid: true }); g.restore(); }
          break; }
        case 'chime': { const sw = S.sway(x) * 0.5 + wob * 0.6; g.strokeStyle = INK; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.save(); g.translate(x - 15 + i * 10, y); g.rotate(sw * (1 + i * 0.2)); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 14); g.stroke(); g.fillStyle = ['#ffd166', '#f6b160', '#ffe9a0', '#f6b160'][i]; P.rr(g, -3, 14, 6, 20 + i * 5, 3); g.fill(); g.stroke(); g.restore(); } g.fillStyle = '#8a5a34'; P.rr(g, x - 22, y - 5, 44, 7, 3); g.fill(); g.stroke(); break; }
        case 'burrbush': { for (let i = 0; i < 4; i++) { const bx = x - 40 + i * 27; P.ball(g, bx, y - 22, 22, 20, '#a9b85a', '#6f8a3a', '#3f5a2a'); g.strokeStyle = '#2a3d1e'; g.lineWidth = 2.4; g.beginPath(); g.arc(bx, y - 22, 21, 0, TAU); g.stroke(); } for (let i = 0; i < 7; i++) { const bx = x - 44 + i * 15, by = y - 20 - (i % 3) * 9; g.fillStyle = '#7a6a3a'; g.beginPath(); for (let j = 0; j < 10; j++) { const rr = j % 2 ? 3 : 7; g.lineTo(bx + Math.cos(j * 0.63) * rr, by + Math.sin(j * 0.63) * rr); } g.fill(); } break; }
        case 'shy': { P.ball(g, x - 26, y - 26, 34, 30, '#b9de62', '#5fa544', '#2f6e3c'); P.ball(g, x + 22, y - 22, 30, 26, '#b9de62', '#5fa544', '#2f6e3c'); g.strokeStyle = '#27533a'; g.lineWidth = 2.6; g.beginPath(); g.arc(x - 26, y - 26, 33, Math.PI, TAU); g.stroke(); const a = 1 - (t.hide || 0); if (a > 0.05) { g.globalAlpha = a; P.ell(g, x - 4, y - 26, 20, 12, '#1a2a1e'); HS.eye(g, x - 11, y - 27, 5, (S.time % 3) > 2.85 ? 0 : 1, '#bfffe0'); HS.eye(g, x + 3, y - 27, 5, (S.time % 3) > 2.85 ? 0 : 1, '#bfffe0'); g.globalAlpha = 1; } break; }
        case 'boot': { if (F.kept.has('boot')) break; g.save(); g.translate(x, y - 2); g.rotate(-0.3); g.fillStyle = '#7a5236'; P.rr(g, -10, -36, 20, 32, 6); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.4; g.stroke(); P.rr(g, -10, -12, 34, 14, 6); g.fill(); g.stroke(); g.restore(); break; }
        case 'spore': { if (F.kept.has('glowspore')) break; g.globalCompositeOperation = 'lighter'; P.glow(g, x, y - 30 + Math.sin(S.time * 2) * 5, 40, '#8fffe8', 0.6); g.globalCompositeOperation = 'source-over'; P.ell(g, x, y - 30 + Math.sin(S.time * 2) * 5, 7, 7, '#eafff9'); break; }
        case 'script': { g.save(); g.translate(x, y); g.beginPath(); g.moveTo(-34, 4); g.quadraticCurveTo(-36, -70, 0, -78); g.quadraticCurveTo(36, -70, 34, 4); g.closePath(); g.fillStyle = P.lin(g, -30, -78, 30, 0, [[0, '#cfc8be'], [1, '#6c655f']]); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(); P.ell(g, -10, -56, 10, 4, 'rgba(255,255,255,.3)', -0.3); if (ghost) { g.globalCompositeOperation = 'lighter'; P.glow(g, 0, -40, 70, '#9fb8ff', 0.4 + 0.15 * Math.sin(S.time * 3)); g.strokeStyle = '#dfe8ff'; g.lineWidth = 2.4; g.lineCap = 'round'; for (let r = 0; r < 4; r++) { g.beginPath(); for (let i = 0; i < 6; i++) { const gx = -20 + i * 8, gy = -62 + r * 13; g.moveTo(gx, gy + (U.hash(i + r * 7) > 0.5 ? 0 : 6)); g.lineTo(gx + 4, gy + (U.hash(i * 3 + r) > 0.5 ? 6 : 0)); } g.stroke(); } g.globalCompositeOperation = 'source-over'; } g.restore(); break; }
        case 'stone': { g.save(); g.translate(x, y); g.beginPath(); g.moveTo(-60, 6); g.lineTo(-46, -120); g.quadraticCurveTo(0, -160, 46, -120); g.lineTo(60, 6); g.closePath(); g.fillStyle = P.lin(g, -50, -150, 50, 0, [[0, '#d8d2c8'], [0.6, '#8f8880'], [1, '#5c5650']]); g.fill(); g.strokeStyle = INK; g.lineWidth = 3.5; g.stroke(); const cols = { fuzzy: '#f2a45a', rock: '#ffb13a', acorn: '#b5e06a', ghost: '#cfd8ff' }; HS.order.forEach((id, i) => { const gx = -27 + (i % 2) * 54, gy = -98 + Math.floor(i / 2) * 50, on = t.lit[id]; if (on) { g.globalCompositeOperation = 'lighter'; P.glow(g, gx, gy, 34, cols[id], 0.7); g.globalCompositeOperation = 'source-over'; } g.strokeStyle = on ? cols[id] : 'rgba(40,30,26,.55)'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); if (i === 0) { g.arc(gx, gy, 12, 0, TAU); for (let j = 0; j < 6; j++) { g.moveTo(gx + Math.cos(j) * 12, gy + Math.sin(j) * 12); g.lineTo(gx + Math.cos(j) * 17, gy + Math.sin(j) * 17); } } else if (i === 1) { g.rect(gx - 9, gy - 13, 18, 26); g.moveTo(gx - 13, gy - 13); g.lineTo(gx + 13, gy - 13); } else if (i === 2) { g.arc(gx, gy + 2, 11, 0, Math.PI); g.moveTo(gx - 13, gy); g.quadraticCurveTo(gx, gy - 18, gx + 13, gy); g.moveTo(gx, gy - 9); g.lineTo(gx + 3, gy - 16); } else { g.arc(gx, gy - 2, 11, Math.PI, 0); g.lineTo(gx + 11, gy + 12); g.lineTo(gx + 4, gy + 7); g.lineTo(gx, gy + 12); g.lineTo(gx - 4, gy + 7); g.lineTo(gx - 11, gy + 12); g.closePath(); } g.stroke(); }); g.restore(); break; }
        case 'portal': { g.save(); g.translate(x, y); g.strokeStyle = INK; g.lineWidth = 26; g.lineCap = 'butt'; g.beginPath(); g.moveTo(-44, 4); g.lineTo(-44, -90); g.arc(0, -90, 44, Math.PI, 0); g.lineTo(44, 4); g.stroke(); g.strokeStyle = '#9b948c'; g.lineWidth = 20; g.stroke(); g.fillStyle = 'rgba(60,50,120,.35)'; g.beginPath(); g.moveTo(-34, 4); g.lineTo(-34, -90); g.arc(0, -90, 34, Math.PI, 0); g.lineTo(34, 4); g.fill(); for (let i = 0; i < 5; i++) P.ell(g, Math.sin(S.time * 0.7 + i * 2) * 20, -30 - i * 18, 2, 2, 'rgba(220,210,255,.6)'); g.restore(); break; }
      }
    }
  };
  // things drawn over the water and the heroes: lily pads, fireflies, koi, hats, bird, the falling star
  F.drawOver = (g, v) => {
    const p = PT();
    for (const pl of W.platforms) { if (pl.kind !== 'pad' || pl.x2 < v.x0 || pl.x1 > v.x1) continue; const cx = (pl.x1 + pl.x2) / 2, b = Math.sin(S.time * 1.7 + cx) * 2; g.beginPath(); g.ellipse(cx, pl.y + 3 + b, 46, 11, 0, 0.3, TAU - 0.1); g.lineTo(cx, pl.y + 3 + b); g.closePath(); g.fillStyle = P.lin(g, 0, pl.y - 8, 0, pl.y + 14, [[0, '#a6dc68'], [1, '#3f8f48']]); g.fill(); g.strokeStyle = '#1e4d2e'; g.lineWidth = 2.4; g.stroke(); if ((cx | 0) % 3 === 0) { for (let i = 0; i < 6; i++) P.ell(g, cx - 14 + Math.cos(i * 1.05) * 7, pl.y - 3 + b + Math.sin(i * 1.05) * 4, 6, 3.5, '#ffd9e2', i * 1.05); P.ell(g, cx - 14, pl.y - 3 + b, 3.4, 2.4, '#ffd166'); } }
    if (S.night > 0.3) { g.globalCompositeOperation = 'lighter'; for (const f of F.flies) { if (f.x < v.x0 - 40 || f.x > v.x1 + 40) continue; const a = S.night * (0.45 + 0.55 * Math.sin(f.ph * 5)); P.glow(g, f.x, f.y, 13, '#e8ff8a', a); P.ell(g, f.x, f.y, 2, 2, 'rgba(255,255,220,' + a + ')'); } g.globalCompositeOperation = 'source-over'; }
    if (F.koi.on) { const kx = F.koi.x, ky = 62 + Math.sin(F.koi.t * 2) * 5; g.globalCompositeOperation = 'lighter'; P.glow(g, kx, ky, 34, '#aee8ff', 0.6); g.globalCompositeOperation = 'source-over'; P.ell(g, kx, ky, 11, 5, '#f4fbff'); g.fillStyle = '#ffb3c6'; g.beginPath(); g.moveTo(kx - 10, ky); g.lineTo(kx - 19, ky - 6 + Math.sin(F.koi.t * 9) * 3); g.lineTo(kx - 19, ky + 6 + Math.sin(F.koi.t * 9) * 3); g.fill(); P.ell(g, kx + 5, ky - 1, 1.3, 1.3, '#1c0e09'); P.ell(g, kx - 1, ky - 2, 3, 2, '#ff9f5a'); }
    // worn things
    if (!p.host) {
      const top = { fuzzy: 74, rock: 112, acorn: 96, ghost: 82 }[p.id] + (p.id === 'ghost' ? -Math.sin(p.st.t * 2.2) * 4 : 0);
      if (p.id === 'rock' && p.rolling) { /* nothing stays on a rolling rock */ }
      else if (F.sock > 0) { g.save(); g.translate(p.x + p.st.turn * 4, p.y - top + 6); g.rotate(-0.5 * p.f); g.fillStyle = '#ff8fa3'; P.rr(g, -7, -22, 14, 26, 5); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.2; g.stroke(); P.rr(g, -7, -24, 20, 10, 5); g.fill(); g.stroke(); g.restore(); }
      else if (F.kept.has('hat') && p.id !== 'acorn') hat(g, p.x + p.st.turn * 3, p.y - top + 8, 0.9);
      if (F.bird.on > 1.5 && p.id === 'rock') { const bx = p.x - 10, by = p.y - 116 + Math.abs(Math.sin(S.time * 3)) * -3; P.ball(g, bx, by, 10, 8.5, '#bfe0ff', '#6fa8dc', '#3d6ea8'); g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.ellipse(bx, by, 10, 8.5, 0, 0, TAU); g.stroke(); g.fillStyle = '#e2a93b'; g.beginPath(); g.moveTo(bx + 9, by - 2); g.lineTo(bx + 16, by); g.lineTo(bx + 9, by + 2); g.fill(); P.ell(g, bx + 4, by - 2, 1.6, 1.6, '#1c0e09'); g.fillStyle = '#3d6ea8'; g.beginPath(); g.moveTo(bx - 8, by); g.lineTo(bx - 18, by - 5); g.lineTo(bx - 16, by + 3); g.fill(); }
      if (F.burrs && p.id === 'fuzzy') for (let i = 0; i < F.burrs; i++) { const bx = p.x - 18 + i * 17, by = p.y - 62 + (i % 2) * 8 + Math.sin(S.time * 6 + i) * 1.5; P.ell(g, bx, by, 6.5, 6, '#8a9a3a'); g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); g.arc(bx, by, 6.3, 0, TAU); g.stroke(); P.ell(g, bx - 2, by - 1, 1.3, 1.3, '#1c0e09'); P.ell(g, bx + 2, by - 1, 1.3, 1.3, '#1c0e09'); }
    }
  };
  // screen-space sky extras
  F.drawSky = (g, vw, vh) => { if (F.star.on > 0) { const k = 1 - F.star.on / 1.3, x = vw * (F.star.x + k * 0.3), y = vh * (0.08 + k * 0.2); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,255,230,' + (1 - k) + ')'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 130, y - 86); g.stroke(); P.glow(g, x, y, 20, '#ffffff', 1 - k); g.globalCompositeOperation = 'source-over'; } };
  F.lights = (out) => {
    for (const t of F.things) { if (t.kind === 'hearth') out.push({ x: t.x, y: t.y - 30, r: 330 + Math.sin(S.time * 13) * 12, a: 0.95 }); else if (t.kind === 'spore' && !F.kept.has('glowspore')) out.push({ x: t.x, y: t.y - 30, r: 150, a: 0.8 }); else if (t.kind === 'stone') { const n = Object.keys(t.lit).length; if (n) out.push({ x: t.x, y: t.y - 70, r: 110 + n * 50, a: 0.8 }); } else if (t.kind === 'script' && PT().id === 'ghost') out.push({ x: t.x, y: t.y - 40, r: 140, a: 0.7 }); }
    if (S.night > 0.3) for (const f of F.flies) out.push({ x: f.x, y: f.y, r: 42, a: 0.5 });
    if (F.koi.on) out.push({ x: F.koi.x, y: 62, r: 120, a: 0.7 });
  };

  // ---------- ambient life (no discoveries here, just a living forest) ----------
  const baseInit = F.init, baseUpdate = F.update, baseOver = F.drawOver, baseSky = F.drawSky;
  F.init = () => {
    baseInit();
    const r = U.mulberry(404); F.flutter = [];
    const spots = V3.scenery.deco.filter((d) => d.t === 'flower');
    for (let i = 0; i < 26 && spots.length; i++) { const d = spots[Math.floor(r() * spots.length)]; F.flutter.push({ hx: d.x, x: d.x, y: d.y - 40, ph: r() * 9, sp: 0.7 + r() * 0.8, col: ['#ffd166', '#ff8fa3', '#9ad7ff', '#fff3e6', '#c9a0ff'][i % 5], rest: 0, scared: 0 }); }
    F.flock = { t: 20, on: 0, y: 0.2, n: 5 };
  };
  F.update = (dt) => {
    baseUpdate(dt);
    const p = PT(), day = S.night < 0.4 && S.rain < 0.3;
    for (const b of F.flutter) {
      b.ph += dt * b.sp; b.scared = Math.max(0, b.scared - dt);
      if (!day) { b.y = U.damp(b.y, W.groundY(b.x) - 8, 2, dt); continue; }
      if (U.dist(p.x, p.y - 30, b.x, b.y) < 90 && (Math.abs(p.vx) > 260 || p.dashT > 0)) b.scared = 1.5;
      // a butterfly will settle on a brother who stands still long enough
      const sit = p.idle > 3.5 && Math.abs(p.x - b.hx) < 260 && !p.host && p.id !== 'ghost' && b === F.flutter.find((q) => Math.abs(p.x - q.hx) < 260);
      const tx = sit ? p.x + 6 : b.hx + Math.sin(b.ph * 0.7) * 90 + (b.scared ? Math.sign(b.x - p.x) * 160 : 0);
      const ty = sit ? p.y - p.h - 12 : W.groundY(b.x) - 60 - Math.sin(b.ph * 1.3) * 34 - b.scared * 120;
      b.x = U.damp(b.x, tx, sit ? 3 : 1.4, dt); b.y = U.damp(b.y, ty + Math.sin(b.ph * 9) * 5, sit ? 3 : 2, dt); b.rest = sit && U.dist(b.x, b.y, tx, ty) < 14 ? 1 : 0;
    }
    F.flock.t -= dt; if (F.flock.on > 0) F.flock.on -= dt; else if (F.flock.t <= 0 && S.night < 0.5) { F.flock.on = 16; F.flock.t = U.rand(40, 90); F.flock.y = U.rand(0.1, 0.3); F.flock.n = 3 + Math.floor(U.rand(0, 5)); F.flock.dir = U.chance(0.5) ? 1 : -1; }
    // leaves let go in the wind; petals drift for good once Snagroot is in bloom
    const cx = V3.game.cam.x, z = W.zoneAt(cx).id;
    if ((z === 'woods' || z === 'glade' || z === 'hollow') && U.chance(dt * (0.5 + S.wind * 4))) { const t = V3.scenery.trees[Math.floor(U.rand(0, V3.scenery.trees.length))]; if (Math.abs(t.x - cx) < 800) P.emit({ kind: 'leaf', x: t.x + U.rand(-90, 90), y: t.y - t.h + U.rand(-40, 60), vx: U.rand(-10, 30), vy: U.rand(20, 50), g: 14, windy: 70, col: t.hue === 'pink' ? '#f59bb4' : t.hue === 'gold' ? '#f2b544' : U.pick(['#7cbf45', '#cfe86a']), life: 4.5, r: 7, a: 0.9 }); }
    if (F.flags.snagCalm && (z === 'glade' || z === 'village') && U.chance(dt * 2.2)) P.emit({ kind: 'leaf', x: cx + U.rand(-700, 700), y: V3.game.cam.y - 380, vx: U.rand(10, 50), vy: U.rand(30, 60), g: 8, windy: 60, col: U.pick(['#ffc2d0', '#ff9db5', '#ffe3ea']), life: 7, r: 6, a: 0.9, layer: 1 });
  };
  F.drawOver = (g, v) => {
    baseOver(g, v);
    for (const b of F.flutter) {
      if (b.x < v.x0 - 30 || b.x > v.x1 + 30) continue;
      const flap = b.rest ? 0.25 + Math.abs(Math.sin(b.ph * 2)) * 0.5 : Math.abs(Math.sin(b.ph * 16)), a = S.night > 0.4 || S.rain > 0.3 ? 0.15 : 1;
      g.save(); g.translate(b.x, b.y); g.rotate(Math.sin(b.ph * 2) * 0.3);
      for (const s of [-1, 1]) { g.save(); g.scale(s * (0.25 + flap * 0.75), 1); g.beginPath(); g.ellipse(6, -3, 7, 6, -0.4, 0, TAU); g.ellipse(5, 4, 5, 4, 0.5, 0, TAU); g.fillStyle = b.col; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.4; g.stroke(); g.restore(); }
      g.fillStyle = INK; P.rr(g, -1.3, -6, 2.6, 12, 1.3); g.fill(); g.restore();
    }
  };
  F.drawSky = (g, vw, vh) => {
    baseSky(g, vw, vh);
    if (F.flock.on > 0) {
      const k = 1 - F.flock.on / 16, d = F.flock.dir, x0 = d > 0 ? -80 + k * (vw + 160) : vw + 80 - k * (vw + 160);
      g.strokeStyle = 'rgba(46,36,56,.55)'; g.lineWidth = 2.2; g.lineCap = 'round';
      for (let i = 0; i < F.flock.n; i++) { const x = x0 - d * (i * 26 + (i % 2) * 8), y = vh * F.flock.y + (i % 3) * 14 + Math.sin(S.time * 2 + i) * 4, w = 7 + Math.sin(S.time * 9 + i * 2) * 3; g.beginPath(); g.moveTo(x - 9, y - w * 0.5); g.quadraticCurveTo(x - 4, y - w, x, y); g.quadraticCurveTo(x + 4, y - w, x + 9, y - w * 0.5); g.stroke(); }
    }
  };

})();
