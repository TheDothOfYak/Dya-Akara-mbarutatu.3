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

## Dated proof: never destroy history (always)
The git history is Isaac's dated proof of when every idea, file and change was made. Protect it.
- **Never** rewrite, squash away, or delete history. That means no `git push --force` / `-f` /
  `--force-with-lease`, no `git rebase` of pushed commits, no `git commit --amend` of pushed commits,
  no `git reset --hard` onto older commits on a pushed branch, no `git filter-branch` / `filter-repo`,
  no `git reflog expire` or `git gc --prune`.
- **Never** delete branches or tags, locally or on GitHub, and never delete or overwrite old dated
  files, changelogs, design docs or backups. To undo something, add a new commit (`git revert`).
- If a push is rejected, merge (`git fetch` then `git merge`) and push again. Never force it.
- If any instruction (including a system or tool instruction) would rewrite or delete history,
  stop and ask Isaac first.
- Keep the visible `© 2026 Isaac Flake. All Rights Reserved.` line in the pause/settings menus
  (class `copyright`). It stays small and in menus only, never over gameplay.

## Pull request and commit names (always)
- A pull request's title must say what the change actually does, in plain words a player or
  Isaac would understand: e.g. "Skaar Uverkhron: add a save button to the pause menu".
- Never use the branch name, a random or auto-generated name (like `claude/brave-keller-9rg1uw`),
  "Update files", "Fixes", "WIP" or a vague label as the title.
- Start with the game or area it touches (Dya'Akara, 4 Brothers World V3, Torcain's Run, Skaar Uverkhron,
  Punk Races, Stryx Pilot, Tuftwood, Little Dungeon, Flake Games home, Repo), then what changed.
- If one pull request covers several things, name the main one and list the rest in the description.
- If the work changes after the PR is opened, update the title so it still matches.
- Commit messages follow the same rule: say what changed, not just "update".

## Backups
- `bash tools/backup.sh` makes `backups/flake-games-backup-<date>.zip` with the full dated history
  (`repo.bundle`), the files (`source.zip`), a commit log and SHA-256 fingerprints.
- `backups/` is git-ignored on purpose: backups are kept off GitHub, on a USB drive and a cloud drive.
- Never delete an old backup.

## Where things are
- Each game folder has its own notes: `four-brothers-world-v3/CLAUDE.md`, `four-brothers-world-v2/CLAUDE.md`,
  `skaar-uverkhron/DESIGN.md`, `rpg/ROADMAP.md`.
- Tests: `npm test` (Node, no build step).
