© 2026 Isaac Flake. All Rights Reserved.

# Flake Games: rules for every session

## Copyright (always)
- Everything here is the original work of Isaac Flake. All rights reserved. See `LICENSE`.
- **Every new file you create** gets this line at the very top, in that file's comment style:
  `© <current year> Isaac Flake. All Rights Reserved.`
  - JS: `// © 2026 Isaac Flake. All Rights Reserved.` (after a `#!` shebang line if there is one)
  - CSS: `/* © 2026 Isaac Flake. All Rights Reserved. */`
  - HTML: `<!-- © 2026 Isaac Flake. All Rights Reserved. -->` right after `<!doctype html>`, plus
    `<meta name="copyright" content="© 2026 Isaac Flake. All Rights Reserved.">` after `<meta charset>`
  - Markdown: the plain line, then a blank line. SQL: `-- …`. YAML/Python/shell/robots.txt: `# …`
  - JSON can't hold comments, so leave JSON files as they are.
- Never remove or change an existing copyright line.
- Don't stamp third-party code (`rpg/vendor/`) or the site-verification file `d8ab721af4b7f70768e310ef0974b3e1.txt`.
- To catch anything missed, run `python3 tools/stamp_copyright.py` from the repo root. It skips files that already have the line.

## Where things are
- Each game folder has its own notes: `four-brothers-world-v3/CLAUDE.md`, `four-brothers-world-v2/CLAUDE.md`,
  `skaar-uverkhron/DESIGN.md`, `rpg/ROADMAP.md`.
- Tests: `npm test` (Node, no build step).
