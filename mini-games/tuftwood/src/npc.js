// © 2026 Isaac Flake. All Rights Reserved.
// 4 Brothers World V3: the villagers. They talk differently to each brother and remember what you did.
(function () {
  'use strict';
  const V3 = window.V3, U = V3.util, P = V3.paint, W = V3.world, S = V3.sky, HS = V3.heroes, TAU = U.TAU;
  const INK = '#3b1f12';
  const N = (V3.npc = { list: [], mem: {} });
  const PT = () => V3.party, F = () => V3.fun, A = () => V3.audio;

  N.init = () => {
    N.list = [
      { id: 'tuft', name: 'Old Tuft', x: 3940, cols: ['#d9d4cc', '#a8a29a', '#6e6862'], s: 1.02, sleepy: true, scarf: '#d9694f' },
      { id: 'burr', name: 'Burr', x: 3800, cols: ['#f2a45a', '#d97a2c', '#8f4a18'], s: 0.7, kid: true, home: 3800 },
      { id: 'tumble', name: 'Tumble', x: 4700, cols: ['#e9cf9a', '#c9a060', '#8a6a34'], s: 0.95, hat: true, pack: true },
      { id: 'keeper', name: 'The Rune Keeper', x: 4905, robe: true },
    ];
    for (const n of N.list) { n.y = W.groundY(n.x); n.f = -1; n.t = U.rand(0, 5); n.vy = 0; n.hop = 0; N.mem[n.id] = N.mem[n.id] || { talks: 0, met: {} }; }
  };
  V3.bus.on('boo', (x) => { const b = N.list.find((n) => n.id === 'burr'); if (b && Math.abs(b.x - x) < 220) { b.hop = 1; N.mem.burr.booed = (N.mem.burr.booed || 0) + 1; P.say(b.x, b.y - 80, 'EEK!', '#fff', 24); } });

  // what each villager says, given who is asking and what has happened
  const lines = (n, hero) => {
    const m = N.mem[n.id], fl = F().flags, found = F().found, first = !m.met[hero], L = [];
    if (n.id === 'tuft') {
      if (m.talks === 0) L.push('There you are, all four of you! Well. One at a time. However it is you do that.');
      if (fl.sock && !m.sock) { m.sock = true; L.push("That's my sock on your head.", "...Keep it. It suits you."); }
      if (fl.fellInWell && !m.well) { m.well = true; L.push('I TOLD your brother not to lean on the well.'); }
      if ((fl.pokedSnail || 0) >= 2 && !m.snail) { m.snail = true; L.push("And stop poking Gerald. He's walking to the well. He'll get there Thursday."); }
      if (found.has('rift')) L.push('A baby one, you say. Then somewhere there is a mother.', "Rest by the fire. I'll put the kettle on.");
      else if (fl.snagCalm) L.push('You calmed him! Look at those blossoms.', 'The Rune Keeper has been asking for you. Something about the stone up on Windy Ridge.');
      else {
        if (first) L.push({ fuzzy: "Your fur's standing on end again. Been tearing through the grass?", rock: "Morning, lad. Mind the twig bridge. It wasn't built for you.", acorn: 'Plant me something nice by the door, would you?', ghost: 'Brr. I always know when it is you.' }[hero]);
        L.push('Old Snagroot is snatching hats again on the east path.', "Don't hurt him. He is only thirsty and cross.", 'Watch his vines. When one sticks in the dirt, that is your moment.');
      }
    } else if (n.id === 'burr') {
      if (m.booed && !m.booTold) { m.booTold = true; L.push('You said BOO at me. That was mean.', 'Do it again.'); }
      else if (first) L.push({ fuzzy: 'Do the zappy thing! Run in the grass first, then DO IT!', rock: 'Can I ride on your cap? Please? I weigh nothing.', acorn: 'Grow a tall one! Taller! I want to see Cloudtop!', ghost: "I'm not scared of you. (He is a little scared of you.)" }[hero]);
      else L.push(U.pick(['The toadstools in the west woods sing if you poke them.', 'There is a snail with a GOLD shell. I saw it. Nobody believes me.', 'The owl says who. I say Burr. She never remembers.', 'Something lives in the bush east of here. It only looks at me when I am not looking.', 'If you stand by a tree, the warthogs bonk into it. It is the funniest thing in the world.']));
    } else if (n.id === 'tumble') {
      const c = found.size;
      if (m.talks === 0) L.push("Tumble's the name. I don't take coin.", 'I trade in stories. Find things worth telling and come back.');
      if (c >= 5 && !F().kept.has('hat')) { L.push(c + ' stories! A deal is a deal. The hat is yours.'); setTimeout(() => { if (N.mem[n.id] === m) F().keep('hat'); }, 400); }
      else if (c >= 15 && !F().kept.has('amulet')) { L.push(c + ' stories. You have earned the Sun Amulet.', 'It keeps a little of the hearth with you. You will mend slowly in daylight.'); setTimeout(() => { if (N.mem[n.id] === m) F().keep('amulet'); }, 400); }
      else if (c < 5) L.push('You have ' + c + (c === 1 ? ' story. ' : ' stories. ') + (5 - c) + ' more and my feathered hat is yours.');
      else if (c < 15) L.push(c + ' stories so far. Bring me fifteen and we will talk about the amulet.');
      else L.push('You have seen ' + c + ' of ' + F().all.length + ' things. I have been here forty years and seen nine.');
    } else if (n.id === 'keeper') {
      if (found.has('rift')) L.push('That was a World Eater. A small one.', 'They do not die. They do not stop. They turn in their sleep and worlds crack.', 'This is where your story starts, brothers.', '(That is the end of the sample. Tuftwood is still yours to wander.)');
      else if (fl.snagCalm) L.push('The old tree is at peace. Good.', 'Now take all four of you to the Brother Stone on Windy Ridge, east past the pond.', 'Each brother must touch it. Then look up.');
      else { if (first) L.push(hero === 'ghost' ? 'You can see the old writing, pale one. Read every stone you find.' : 'There is writing in this forest only your pale brother can read.'); L.push('Four brothers. One stone. It has waited a long time.', 'First, the tree. A forest with an angry heart cannot listen.'); }
    }
    m.met[hero] = true; m.talks++;
    return L;
  };
  const npcDist = (n, p) => Math.abs(n.x - p.x) + Math.abs(n.y - p.y) * 0.5;
  // distance to the nearest villager you could talk to (Infinity if none), so E can pick the closer of a villager and a prop
  N.dist = () => { const p = PT(); let bd = Infinity; for (const n of N.list) { const d = npcDist(n, p); if (d < 110 && d < bd) bd = d; } return bd; };
  N.talk = () => {
    const p = PT(); let best = null, bd = 110;
    for (const n of N.list) { const d = npcDist(n, p); if (d < bd) { bd = d; best = n; } }
    if (!best) return false;
    best.f = p.x < best.x ? -1 : 1; V3.ui.speak(best, lines(best, p.id)); V3.game.saveSoon(); return true;
  };
  N.update = (dt) => {
    const p = PT();
    for (const n of N.list) {
      n.t += dt; const near = Math.abs(p.x - n.x) < 300;
      if (near) n.f = p.x < n.x ? -1 : 1;
      n.prompt = Math.abs(p.x - n.x) < 110 && Math.abs(p.y - n.y) < 120 && !V3.ui.talking;
      if (n.kid) { // Burr trots after whoever is passing, then wanders home
        const goal = near && Math.abs(p.x - n.home) < 420 ? p.x - Math.sign(p.x - n.x) * 90 : n.home + Math.sin(n.t * 0.3) * 60;
        const d = goal - n.x; n.vx = Math.abs(d) > 14 ? Math.sign(d) * 130 : 0; n.x += n.vx * dt; if (n.vx) n.f = Math.sign(n.vx);
        if (n.hop > 0) { n.hop -= dt * 2; }
        n.y = W.groundY(n.x);
      }
    }
  };
  N.draw = (g, v) => {
    for (const n of N.list) {
      if (n.x < v.x0 - 150 || n.x > v.x1 + 150) continue;
      HS.shadow(g, n.x, n.y, 30 * (n.s || 1), 0.24);
      g.save(); g.translate(n.x, n.y - (n.hop > 0 ? Math.sin(n.hop * Math.PI) * 50 : 0));
      if (n.robe) drawKeeper(g, n);
      else {
        g.scale(n.s, n.s);
        if (n.pack) { g.fillStyle = P.lin(g, -50, -70, -20, -20, [[0, '#c9a060'], [1, '#7a5230']]); P.rr(g, -n.f * 34 - 20, -78, 40, 50, 10); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.8; g.stroke(); g.fillStyle = '#e9c58d'; P.rr(g, -n.f * 34 - 14, -84, 28, 12, 6); g.fill(); g.stroke(); }
        HS.draw.fuzzy(g, { f: n.f, turn: n.f * 0.8, walk: n.t * (n.vx ? 9 : 0), sx: 1, sy: 1 + Math.sin(n.t * 2) * 0.015, blink: n.sleepy ? ((n.t % 5) > 4.2 ? 0 : 0.55) : (n.t % 3.3) > 3.15 ? 0 : 1, mood: 1, t: n.t, vx: n.vx || 0, moving: n.vx ? 1 : 0, cols: n.cols });
        if (n.scarf) { g.strokeStyle = INK; g.lineWidth = 13; g.lineCap = 'round'; g.beginPath(); g.moveTo(-28, -20); g.quadraticCurveTo(0, -8, 28, -20); g.stroke(); g.strokeStyle = n.scarf; g.lineWidth = 9; g.stroke(); g.fillStyle = n.scarf; P.rr(g, n.f * -22 - 6, -18, 12, 26, 4); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.4; g.stroke(); }
        if (n.hat) V3.fun.hat(g, n.f * 3, -72, 1);
      }
      g.restore();
      if (n.prompt) { const by = n.y - (n.robe ? 150 : 110 * (n.s || 1)) + Math.sin(S.time * 4) * 3; g.fillStyle = '#fff8e6'; P.rr(g, n.x - 15, by - 15, 30, 28, 9); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke(); g.fillStyle = INK; g.font = '700 20px Gaegu, cursive'; g.textAlign = 'center'; g.fillText('E', n.x, by + 6); }
    }
  };
  const drawKeeper = (g, n) => {
    const sw = Math.sin(n.t * 1.4) * 2;
    // staff
    g.strokeStyle = INK; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(n.f * 34, 2); g.lineTo(n.f * 36, -150); g.stroke(); g.strokeStyle = '#9a6238'; g.lineWidth = 5; g.stroke();
    g.globalCompositeOperation = 'lighter'; P.glow(g, n.f * 36, -158, 34, '#9fb8ff', 0.6 + Math.sin(n.t * 3) * 0.2); g.globalCompositeOperation = 'source-over';
    g.save(); g.translate(n.f * 36, -158); g.rotate(n.t); g.fillStyle = '#dfe8ff'; g.beginPath(); for (let i = 0; i < 4; i++) g.lineTo(Math.cos(i * TAU / 4) * 10, Math.sin(i * TAU / 4) * 10); g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.closePath(); g.stroke(); g.restore();
    // robe
    g.beginPath(); g.moveTo(-36, 4); g.bezierCurveTo(-34, -60, -30, -100, -20, -118); g.quadraticCurveTo(0, -150 + sw, 20, -118); g.bezierCurveTo(30, -100, 34, -60, 36, 4); g.quadraticCurveTo(18, 10, 0, 4); g.quadraticCurveTo(-18, 10, -36, 4); g.closePath();
    g.fillStyle = P.lin(g, -34, -120, 34, 0, [[0, '#5a5aa0'], [0.5, '#35356e'], [1, '#1c1c44']]); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
    for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(230,220,255,.8)'; g.beginPath(); const sx = -18 + i * 9, sy = -30 - (i % 2) * 18; for (let j = 0; j < 8; j++) { const rr = j % 2 ? 1.4 : 3.6; g.lineTo(sx + Math.cos(j * TAU / 8) * rr, sy + Math.sin(j * TAU / 8) * rr); } g.fill(); }
    // the hood's shadow, and two patient eyes
    P.ell(g, n.f * 3, -106, 17, 15, '#0e0e24');
    g.globalCompositeOperation = 'lighter'; P.glow(g, n.f * 3 - 6, -106, 9, '#bcd0ff', 0.9); P.glow(g, n.f * 3 + 7, -106, 9, '#bcd0ff', 0.9); g.globalCompositeOperation = 'source-over';
    P.ell(g, n.f * 3 - 6, -106, 3, (n.t % 4) > 3.8 ? 0.6 : 3.4, '#f4f7ff'); P.ell(g, n.f * 3 + 7, -106, 3, (n.t % 4) > 3.8 ? 0.6 : 3.4, '#f4f7ff');
  };
  N.lights = (out) => { const k = N.list.find((n) => n.robe); if (k) out.push({ x: k.x + k.f * 36, y: k.y - 158, r: 170, a: 0.8 }); };
})();
