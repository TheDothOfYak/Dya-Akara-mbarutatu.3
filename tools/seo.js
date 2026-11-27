#!/usr/bin/env node
// © 2026 Isaac Flake. All Rights Reserved.
/* Search-engine tags for every page, plus robots.txt and sitemap.xml.

     node tools/seo.js

   Rewrites the block between <!-- seo --> and <!-- /seo --> in each page's <head>
   (adding it after <title> the first time), and writes robots.txt and sitemap.xml
   at the site root. Run it again after adding a game or moving the site.

   SITE is the address search engines should treat as home. Change it here if the
   site moves (say to a custom domain), then re-run. */
'use strict';
const fs = require('fs');
const path = require('path');

const SITE = 'https://dyaakara-yak.web.app/';
const ROOT = path.join(__dirname, '..');
const STUDIO = 'Flake Games';
const ALT_STUDIO = ['Flake', 'FlakeGames'];

/* the catalogue (the hub's own list is js/flake/account.js; keep the two in step) */
const GAMES = [
  { id: 'hub', file: 'index.html', name: STUDIO, alt: ALT_STUDIO,
    title: 'Flake Games — Dya’Akara, Torcain’s Run, The 4 Brothers Worlds and more',
    desc: 'Flake Games: free browser games set in the worlds of the Pia’don system and the Mbaru Tatu — Dya’Akara, Torcain’s Run, The 4 Brothers Worlds, Skaar Uverkhron, Little Dungeon, Punk Races and Stryx Pilot.',
    img: 'img/icon-512.png', priority: '1.0' },
  { id: 'game', file: 'dya-akara.html', name: 'Dya’Akara', alt: ['Dya\'Akara', 'Dya\'akara', 'Dyaakara', 'Dya Akara', 'Dya-Akara'],
    title: 'Dya’Akara — the token game of the Mbaru Tatu | Flake Games',
    desc: 'Dya’Akara (Dyaakara): the token game of the Mbaru Tatu. Every token is a living creature: build your pouch, battle in the arena, craft and trade on the Guild Market and climb the ranked seasons. Free in your browser, by Flake Games.',
    genre: ['Strategy', 'Card game'], img: 'img/previews/game.jpg', priority: '0.9' },
  { id: 'rpg', file: 'rpg/index.html', name: 'Torcain’s Run', alt: ['Torcain\'s Run', 'Torcains Run', 'Torcain Run'],
    title: 'Torcain’s Run — a 3D adventure across the Mbaru Tatu | Flake Games',
    desc: 'Torcain’s Run: a 3D action RPG across the Mbaru Tatu, the world of Dya’Akara. Climb the home trees, fight Snillers and explore Aakalay, Leotik and Velki. Free in your browser, by Flake Games.',
    genre: ['Action RPG', 'Adventure'], img: 'img/previews/rpg.jpg', priority: '0.9' },
  { id: '4bw', file: 'four-brothers-world/index.html', name: 'The 4 Brothers Worlds', alt: ['4 Brothers World', 'The 4 Brothers World', 'Four Brothers Worlds', '4BW'],
    title: 'The 4 Brothers Worlds — dig, build and explore together | Flake Games',
    desc: 'The 4 Brothers Worlds: a 2D pixel open-world platformer. Four worlds, four heroes, one Duat. Dig, build and explore solo or together with a room code. Free in your browser, by Flake Games.',
    genre: ['Platformer', 'Sandbox'], img: 'img/previews/4bw.jpg', priority: '0.8' },
  { id: '4bw2', file: 'four-brothers-world-v2/index.html', name: 'The 4 Brothers Worlds V2', alt: ['4 Brothers World V2', '4 Brothers World 2'],
    title: 'The 4 Brothers Worlds V2 — preview | Flake Games',
    desc: 'The 4 Brothers Worlds V2 preview: new hero magic, legendary chests and more in the 2D pixel open-world platformer from Flake Games.',
    genre: ['Platformer', 'Sandbox'], img: 'img/previews/4bw.jpg', priority: '0.6' },
  { id: '4bw3', file: 'four-brothers-world-v3/index.html', name: 'The 4 Brothers Worlds V3', alt: ['4 Brothers World V3', '4 Brothers World 3'],
    title: 'The 4 Brothers Worlds V3 | Flake Games',
    desc: 'The 4 Brothers Worlds V3: a vast Rock World that is different every time, a massive Leviathan with shield phases, sharper pixels, and all four worlds of the 2D pixel open-world platformer from Flake Games.',
    genre: ['Platformer', 'Sandbox'], img: 'img/previews/4bw.jpg', priority: '0.6' },
  { id: 'su', file: 'skaar-uverkhron/index.html', name: 'Skaar Uverkhron', alt: ['Skaar', 'Uverkhron'],
    title: 'Skaar Uverkhron — strategy across the three Tatu | Flake Games',
    desc: 'Skaar Uverkhron: a turn-based strategy game across the three Tatu of the Mbaru Tatu, the world of Dya’Akara. Free in your browser, by Flake Games.',
    genre: ['Strategy'], img: 'img/previews/su.jpg', priority: '0.8' },
  { id: 'ld', file: 'mini-games/little-dungeon/index.html', name: 'Little Dungeon', alt: [],
    title: 'Little Dungeon — a tiny card-battling dungeon crawl | Flake Games',
    desc: 'Little Dungeon: a tiny card-battling dungeon crawl. A free mini game from Flake Games, the makers of Dya’Akara.',
    genre: ['Card game', 'Roguelike'], img: 'img/previews/ld.jpg', priority: '0.7' },
  { id: 'pr', file: 'mini-games/punk-races/index.html', name: 'Punk Races', alt: [],
    title: 'Punk Races — swing tree to tree for the purse | Flake Games',
    desc: 'Punk Races: swing a Punk tree to tree for the purse. A free mini game from Flake Games, the makers of Dya’Akara.',
    genre: ['Racing', 'Arcade'], img: 'img/previews/pr.jpg', priority: '0.7' },
  { id: 'sp', file: 'mini-games/stryx-pilot/index.html', name: 'Stryx Pilot', alt: [],
    title: 'Stryx Pilot — fly cargo between the three Tatu | Flake Games',
    desc: 'Stryx Pilot: fly cargo and folk between the three Tatu. A free mini game from Flake Games, the makers of Dya’Akara.',
    genre: ['Flight', 'Arcade'], img: 'img/previews/sp.jpg', priority: '0.7' },
];

/* pages that should stay out of search results */
const HIDDEN = ['admin.html', 'four-brothers-world/The 4 Brothers Worlds v1.1.html', 'tools/creature-composer.html', 'tools/sprite-designer.html'];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const url = file => SITE + file.replace(/(^|\/)index\.html$/, '$1').split('/').map(encodeURIComponent).join('/');   // rpg/index.html → rpg/
const studioLd = { '@type': 'Organization', name: STUDIO, alternateName: ALT_STUDIO, url: SITE, logo: SITE + 'img/icon-512.png' };

function gameLd(g) {
  return { '@type': 'VideoGame', name: g.name, alternateName: g.alt, url: url(g.file), description: g.desc, image: SITE + g.img,
    genre: g.genre, gamePlatform: 'Web browser', applicationCategory: 'Game', operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, publisher: studioLd, author: studioLd };
}

function block(g) {
  const ld = g.id === 'hub'
    ? { '@context': 'https://schema.org', '@graph': [
        { '@type': 'WebSite', name: STUDIO, alternateName: ALT_STUDIO, url: SITE, publisher: studioLd },
        studioLd,
        { '@type': 'ItemList', name: 'Flake Games', itemListElement: GAMES.filter(x => x.id !== 'hub').map((x, i) => ({ '@type': 'ListItem', position: i + 1, item: gameLd(x) })) },
      ] }
    : Object.assign({ '@context': 'https://schema.org' }, gameLd(g));
  const keys = [g.name, ...g.alt, STUDIO, 'Dya’Akara', 'Dyaakara', 'Mbaru Tatu', 'browser game', 'free online game'];
  return [
    '<!-- seo: written by tools/seo.js -->',
    `<meta name="description" content="${esc(g.desc)}">`,
    `<meta name="keywords" content="${esc([...new Set(keys)].join(', '))}">`,
    `<link rel="canonical" href="${esc(url(g.file))}">`,
    `<meta property="og:site_name" content="${STUDIO}">`,
    `<meta property="og:type" content="${g.id === 'hub' ? 'website' : 'game'}">`,
    `<meta property="og:title" content="${esc(g.title)}">`,
    `<meta property="og:description" content="${esc(g.desc)}">`,
    `<meta property="og:url" content="${esc(url(g.file))}">`,
    `<meta property="og:image" content="${esc(SITE + g.img)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`,
    '<!-- /seo -->',
  ].join('\n');
}

function inject(file, title, body) {
  const p = path.join(ROOT, file);
  let s = fs.readFileSync(p, 'utf8');
  if (title) s = s.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  s = s.replace(/\n?<!-- seo[^>]*-->[\s\S]*?<!-- \/seo -->/, '');
  if (body.includes('name="description"')) s = s.replace(/[ \t]*<meta name="description"[^>]*>\n?/g, '');   // an older one would compete with ours
  // the title and our tags belong in <head>, near the top (some pages had the title down in <body>)
  const t = (s.match(/<title>[\s\S]*?<\/title>/) || [''])[0];
  s = s.replace(/[ \t]*<title>[\s\S]*?<\/title>\n?/, '');
  const at = /<meta charset[^>]*>\n?/i.test(s) ? /(<meta charset[^>]*>\n?)/i : /(<head[^>]*>\n?)/i;
  s = s.replace(at, `$1${t}\n${body}\n`);
  fs.writeFileSync(p, s);
}

for (const g of GAMES) inject(g.file, g.title, block(g));
for (const f of HIDDEN) inject(f, null, '<!-- seo: written by tools/seo.js -->\n<meta name="robots" content="noindex">\n<!-- /seo -->');

const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<!-- © 2026 Isaac Flake. All Rights Reserved. -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  GAMES.map(g => `  <url><loc>${esc(url(g.file))}</loc><lastmod>${today}</lastmod><priority>${g.priority}</priority></url>`).join('\n') +
  '\n</urlset>\n');
fs.writeFileSync(path.join(ROOT, 'robots.txt'),
  '# © 2026 Isaac Flake. All Rights Reserved.\nUser-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /tests/\nDisallow: /tools/\nDisallow: /supabase/\n\n' + `Sitemap: ${SITE}sitemap.xml\n`);

console.log(`seo: ${GAMES.length} pages tagged, ${HIDDEN.length} kept out of search, sitemap.xml and robots.txt written for ${SITE}`);
