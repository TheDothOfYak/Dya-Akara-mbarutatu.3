# © 2026 Isaac Flake. All Rights Reserved.
"""Adds the copyright notice to the top of every file Isaac Flake owns in this repo.

Run from the repo root:  python3 tools/stamp_copyright.py
Safe to run again: files that already carry the notice are left alone.
Third-party code (rpg/vendor), JSON, images and the site-verification file are skipped.
"""
import subprocess, sys

NOTICE = "© 2026 Isaac Flake. All Rights Reserved."
SKIP_PREFIXES = ("rpg/vendor/",)
SKIP_FILES = {"d8ab721af4b7f70768e310ef0974b3e1.txt", ".nojekyll"}

STYLES = {
    ".js": "// {}", ".css": "/* {} */", ".sql": "-- {}", ".py": "# {}",
    ".yml": "# {}", ".yaml": "# {}", ".sh": "# {}", ".txt": "# {}",
    ".gitignore": "# {}", ".md": "{}", ".html": "<!-- {} -->", ".xml": "<!-- {} -->",
}


def style_for(path):
    name = path.rsplit("/", 1)[-1]
    if name == ".gitignore":
        return STYLES[".gitignore"]
    if "." not in name:
        return None
    return STYLES.get("." + name.rsplit(".", 1)[-1].lower())


def stamp(path):
    fmt = style_for(path)
    if not fmt or path in SKIP_FILES or path.startswith(SKIP_PREFIXES):
        return False
    with open(path, encoding="utf-8", newline="") as f:
        text = f.read()
    if NOTICE in text[:600]:
        return False
    nl = "\r\n" if "\r\n" in text[:2000] else "\n"
    line = fmt.format(NOTICE)
    bom = ""
    if text.startswith("﻿"):
        bom, text = "﻿", text[1:]
    lines = text.split(nl)
    at = 0
    low = lines[0].lower() if lines else ""
    # Keep these lines first: shebang, <!doctype>, <?xml ?>, YAML front matter is not used here.
    if low.startswith("#!") or low.startswith("<!doctype") or low.startswith("<?xml"):
        at = 1
    if path.endswith(".md"):
        line = line + nl  # blank line after so it renders as its own paragraph
    lines.insert(at, line)
    out = bom + nl.join(lines)
    # HTML: also add a machine-readable copyright meta tag, right after <meta charset> (or <head>)
    if path.endswith(".html") and 'name="copyright"' not in out:
        low = out.lower()
        i = low.find("<meta charset")
        j = low.find(">", i) + 1 if i != -1 else (low.find("<head>") + len("<head>") if "<head>" in low else -1)
        if j > 0:
            out = out[:j] + nl + f'<meta name="copyright" content="{NOTICE}">' + out[j:]
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(out)
    return True


def main():
    files = subprocess.run(["git", "ls-files"], capture_output=True, text=True, check=True).stdout.split("\n")
    n = sum(stamp(p) for p in files if p)
    print(f"stamped {n} files")


if __name__ == "__main__":
    sys.exit(main())
