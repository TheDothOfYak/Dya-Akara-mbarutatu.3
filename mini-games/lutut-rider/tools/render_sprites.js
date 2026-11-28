#!/usr/bin/env node
// © 2026 Isaac Flake. All Rights Reserved.
/* Renders Lútut Rider's model sprites: the real 3D Lútut and Eikar, side on, inked.
     node mini-games/lutut-rider/tools/render_sprites.js
   Writes mini-games/lutut-rider/img/model/<name>.png, img/model/frames.json and img/model/frames.js.
   Needs Playwright with Chromium. The pages are served from the repo by Playwright itself
   (no web server); WebGL runs on the software renderer, so no graphics card is needed. */
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..', '..', '..');
const OUT = path.join(__dirname, '..', 'img', 'model');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.glb': 'model/gltf-binary', '.json': 'application/json' };

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 900, height: 700 } });
  await p.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.hostname !== 'sprites.local') return route.abort();
    const f = path.join(ROOT, decodeURIComponent(u.pathname));
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) return route.fulfill({ status: 404, body: 'not found' });
    route.fulfill({ status: 200, contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  p.on('pageerror', e => console.error('page:', e.message));
  await p.goto('http://sprites.local/mini-games/lutut-rider/tools/render_sprites.html');
  await p.waitForFunction(() => window.__done || window.__error, null, { timeout: 240000 });
  const err = await p.evaluate(() => window.__error);
  if (err) { console.error(err); process.exit(1); }
  const out = await p.evaluate(() => window.__done);
  fs.mkdirSync(OUT, { recursive: true });
  const meta = { ppm: out.ppm, yaw: out.yaw, lutut: {}, eikar: {} };
  for (const group of ['lutut', 'eikar']) for (const [name, f] of Object.entries(out[group])) {
    const file = group + '_' + name + '.png';
    fs.writeFileSync(path.join(OUT, file), Buffer.from(f.png.split(',')[1], 'base64'));
    const { png, ...rest } = f; meta[group][name] = Object.assign({ file }, rest);
  }
  fs.writeFileSync(path.join(OUT, 'frames.json'), JSON.stringify(meta, null, 1));
  fs.writeFileSync(path.join(OUT, 'frames.js'), '// © 2026 Isaac Flake. All Rights Reserved.\n// Made by tools/render_sprites.js: where things are in each model sprite (pixels).\nwindow.LR_MODEL_FRAMES = ' + JSON.stringify(meta) + ';\n');
  console.log('wrote', Object.keys(meta.lutut).length + Object.keys(meta.eikar).length, 'frames to', path.relative(ROOT, OUT));
  await b.close();
})();
