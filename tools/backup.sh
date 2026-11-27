#!/usr/bin/env bash
# © 2026 Isaac Flake. All Rights Reserved.
# Makes a dated, exportable backup of this whole repo, with its full history.
#   bash tools/backup.sh            -> backups/flake-games-backup-YYYY-MM-DD.zip
# Inside the zip:
#   repo.bundle      every branch, tag and commit with its date (the dated proof). Restore with:
#                    git clone --mirror repo.bundle flake-games.git   (every branch)
#                    git clone repo.bundle flake-games                (just the main files)
#   source.zip       the files as they are on the current commit, ready to open
#   history.txt      every commit: hash, date, author, message
#   SHA256SUMS.txt   fingerprints, so you can show the files were never changed
#   README.txt       what all this is and how to restore it
# Keep copies in at least two places (a USB drive and a cloud drive), and email one to yourself.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
day=$(date -u +%Y-%m-%d)
name="flake-games-backup-$day"
out="backups/$name"
rm -rf "$out"; mkdir -p "$out"
# the full history, not just recent commits: older commits are the oldest dated proof
if [ "$(git rev-parse --is-shallow-repository)" = "true" ]; then git fetch --unshallow --tags --quiet origin '+refs/heads/*:refs/remotes/origin/*'; fi
git fetch --tags --quiet origin '+refs/heads/*:refs/remotes/origin/*' 2>/dev/null || echo "note: could not reach GitHub, backing up what is here"
git bundle create "$out/repo.bundle" --all --quiet 2>/dev/null || git bundle create "$out/repo.bundle" --all
git bundle verify "$out/repo.bundle" >/dev/null 2>&1
git archive --format=zip -o "$out/source.zip" HEAD
git log --all --date=iso-strict --pretty='%H  %ad  %an  %s' > "$out/history.txt"
cat > "$out/README.txt" <<TXT
© 2026 Isaac Flake. All Rights Reserved.

Flake Games backup, made $(date -u +"%Y-%m-%d %H:%M UTC").
Latest commit: $(git log -1 --date=iso-strict --pretty='%H  %ad  %s')
Commits in history: $(git rev-list --all --count)  (first: $(git log --all --reverse --date=short --pretty=%ad | head -1))

repo.bundle    The whole repository with its full dated history. Restore it with:
                   git clone --mirror repo.bundle flake-games.git   (every branch)
                 git clone repo.bundle flake-games                (just the files, to open)
source.zip     The files on the latest commit.
history.txt    Every commit with its date and message: a record of when each piece was made.
SHA256SUMS.txt Fingerprints of the files above. Check them with: sha256sum -c SHA256SUMS.txt

Everything in this backup is the original work of Isaac Flake. No license is granted.
TXT
(cd "$out" && sha256sum repo.bundle source.zip history.txt README.txt > SHA256SUMS.txt)
(cd backups && rm -f "$name.zip" && zip -qr "$name.zip" "$name")
rm -rf "$out"
echo "backup ready: backups/$name.zip ($(du -h "backups/$name.zip" | cut -f1))"
