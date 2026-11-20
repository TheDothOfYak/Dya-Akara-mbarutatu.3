/* Torcain's Run smoke test: loads the RPG in a headless browser into each region (and the prologue scenes), plays
   a few seconds, and reports any script error. No server needed: files are served straight from the repository.
   Needs Playwright with a Chromium (npm i -D playwright && npx playwright install chromium), then:
     node tools/rpg-smoke.js            every scene
     node tools/rpg-smoke.js xilia      just one (xilia, property, aakalay, leotik, velki, market, escape)
   The account gate is skipped and saves are faked in localStorage; nothing is sent anywhere. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DONE = { xtalked: true, pro: 'done', arrivedA: true, arrivedL: true, talked: true };
const SCENES = {
  xilia: { flags: DONE }, property: { region: 'property', flags: DONE }, aakalay: { region: 'aakalay', flags: DONE }, leotik: { region: 'leotik', flags: DONE },
  velki: null, market: { flags: { young: true, pro: 'road', roadAt: 'market' } }, escape: { flags: { young: true, pro: 'road', roadAt: 'escape' } },
};
const TYPES = { html: 'text/html', js: 'application/javascript', json: 'application/json', css: 'text/css', jpg: 'image/jpeg', png: 'image/png', glb: 'model/gltf-binary', webmanifest: 'application/json' };
(async () => {
  const pick = process.argv.slice(2), names = pick.length ? pick : Object.keys(SCENES);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let bad = 0;
  for (const name of names) {
    const p = await b.newPage({ viewport: { width: 640, height: 360 } }), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errs.push(m.text().slice(0, 300)); });
    await p.route('http://rpg.local/**', r => {
      const f = path.join(ROOT, decodeURIComponent(new URL(r.request().url()).pathname));
      try {
        let body = fs.readFileSync(f);
        if (f.endsWith(path.join('js', 'flake', 'account.js'))) body = Buffer.from(body + '\n;FLAKE.gate=()=>Promise.resolve(null);');
        if (f.endsWith(path.join('rpg', 'js', 'main.js'))) body = Buffer.from(String(body).replace("samples: matchMedia('(pointer: coarse)').matches ? 2 : 4", 'samples: 0'));   // (multisampling leaks in the software renderer)
        r.fulfill({ body, contentType: TYPES[f.split('.').pop()] || 'application/octet-stream' });
      } catch (e) { r.fulfill({ status: 404, body: '' }); }
    });
    await p.route(/supabase|googleapis|gstatic/, r => r.abort());
    const save = SCENES[name];
    await p.addInitScript(s => { if (s) localStorage.setItem('torcain-save-v2', JSON.stringify(Object.assign({ v: 5, difficulty: 'easy', region: 'xilia', shards: 0, ups: {}, lantern: null, lit: {}, flags: {}, cores: {}, chTime: {}, codex: {}, lost: null, time: 0, deaths: 0, kills: 0, cleared: {}, savedAt: Date.now(), runId: 'smoke' }, s))); }, save);
    await p.goto('http://rpg.local/rpg/index.html');
    const ok = await p.waitForFunction(() => window.__torcain, null, { timeout: 120000 }).then(() => true, () => false);
    if (ok) {
      await p.evaluate(v => { if (v) { document.getElementById('btn-begin').click(); document.getElementById('d-easy').click(); } else document.getElementById('btn-continue').click(); }, !save);
      await p.waitForTimeout(8000);
    } else errs.push('the game never finished loading');
    const mode = ok ? await p.evaluate(() => window.__torcain.G.mode).catch(() => '?') : '-';
    console.log(`${errs.length ? 'FAIL' : 'ok  '} ${name.padEnd(9)} mode=${mode}${errs.length ? '\n     ' + errs.slice(0, 5).join('\n     ') : ''}`);
    if (errs.length) bad++;
    await p.close();
  }
  await b.close();
  process.exit(bad ? 1 : 0);
})();
