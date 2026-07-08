# DYA'AKARA
### Token Game of the Mbaru Tatu

The full playable build of Dya'Akara, implemented from the **Master Design Document (Sessions 1–14)**. Zero dependencies, no build step — pure HTML/CSS/JavaScript.

---

## How to Play

**Option 1 — just open it:**
Open `index.html` in Chrome/Edge/Firefox. That's it.

**Option 2 — local server (recommended, avoids any file:// quirks):**
```bash
cd Dya-Akara-mbarutatu.3
python3 -m http.server 8000
# then visit http://localhost:8000
```

**GitHub Codespaces:** open this repo in a Codespace, run the server command above, and open the forwarded port.

Create an account (email/password — stored locally on your device), and the 14-step tutorial takes it from there: your first token is *you*, sung true as an Eikar. You'll finish the tutorial with exactly **13 tokens and 1,000 gold**, as designed.

**The Admin Panel** lives at `admin.html` — outside the game UI, as specified. First visit sets the admin password. You are the admin.

## Match Controls

| Input | Action |
|---|---|
| Mouse wheel over the card strip | Cycle through your pouch (9 cards visible, center highlighted) |
| Click a card | Centers **and readies** it (spends resources) |
| `SPACE` | Trigger readied slot 1 at the mouse cursor |
| `2` – `5` | Trigger readied slots 2–5 at the cursor |
| Drag a readied token onto the field | Trigger at that exact spot |
| `ESC` | Pause (real pause vs AI; cosmetic vs players, as designed) |

Win by getting the **Relic** to your hoard. Mikolo Moko and your sentient units will carry it; everything else on the field is either helping, hunting, or being spectacularly indifferent (looking at you, Uff).

## What's Implemented

Everything in the design document that can exist without a live backend or final art:

- **Match engine (Part III, VI, VII, VIII)** — deterministic fixed-timestep simulation; every launch creature's decision tree in priority order; per-individual trait variation; pulse system with voting + chaos mode; escalation at 10/15/20 min; tether fade at 80%/elimination at 100%; the exact draw rule; all key interaction rules (Kofi prey instinct, Tyndael tunnel vision, Naga dominance and first-head near-invincibility, Hvaleia jet size limits, Malsti Duat edge cases, ShurgrEdan retribution) and combo behaviors (riders, towers, Chemist supply lines, Ju + Sprengju Shaving).
- **Full token roster (Part IV, V)** — all launch tokens, each minted as a specific *individual* with a locked behavior value (weighted lifetime energy average), personality diamonds, Eikar/Keilia trait layers, and an auto-written backstory.
- **Duel mode** — pick/random/blind, anything wagered, no Guild cut, wagered tokens permanently lost.
- **Replays (Part XIV)** — stored as seed + input log, byte-identical playback, last 50 casual kept, tournament replays permanent.
- **Progression & economy (Part IX)** — exact XP bands, the full level-reward chest table with milestones, crafting costs, market tax by rarity, 75% Guild buyback, 50g listing fee, rentals at 25%→3%, titles with buffs (equipped-only), achievements, the complete 14-step tutorial.
- **Hunts (Part X)** — slots every 10 levels (expiring at the next band), the Track with narrator per creature (Noka for the ancients), 2 questions with the hidden ~5% temperament influence, encounter series, guaranteed piece + hidden performance-scored payouts, 1-Nurtui cooldowns.
- **Tournaments (Part XI)** — circuit browser, Guild-sealed vs player-run, brackets with all six tabs, ranked at Regional+, title selection per tier (Local auto → Planet pick-3-keep-1), leaderboards, seasons ended by admin-activated Interplanetary.
- **All UI screens (Part XII)** — built to the locked wireframes: Pia'don login shot, the 9-card token wheel (not radial), collection with collapsible pouch builder, torchlit stalls with the seller-only market average, the crafting ritual (skippable), circular minimap, spinning-coin loading screen with lore tips, the lot.
- **Social (Part XIII)** — friends/pending/blocked, follows (cap 100), notifications (dismissed = gone), quick-chat only in match, reports to the Guild, public bans with collection-only access, spectator mode with cosmetic reactions.
- **Admin panel (Part XVI)** — tournaments, bans/appeals, frozen-token review (cleared/corrected/deleted/penalized), market monitor, token spawning, announcements, trusted-seller grants, and the full **Dya'kukull tab** managing the 100 AI players who populate the market, stalls, queues, and brackets.
- **The Vakarborac** — the creature dictionary as an in-game field guide (main menu → 📖 Vakarborac): every species with living art, temperament, and field notes, organized in the dictionary's five volumes.

## Placeholder Art

Per the creator's direction, all creatures use **animated placeholder rigs**: a small four-legged animal for beasts, a small two-legged, two-armed acorn for humanoids — with species feature layers (extra heads for Naga, five horns for Albali Byrd, the flame crown for Tyndael, hair armor for Keilia…) so everything reads on the field. All animation states are in: idle, walk, run, attack, hit, death fade, dormant, plus signature specials (tongue strike, jet blast, screech, teleport, swarm thinning). Shader treatments per Part XIV: magical shimmer, per-creature bioluminescence (RubberMcFly only glows during the Sunear'Zikhron), tether fade, element-colored resource orbs.

**No music**, by design — the composer is handling that. The music channel exists in Settings and stays politely silent. Synthesized SFX are in (including the ShurgrEdan strike, with its own toggle).

## Firebase / Multiplayer

This build runs fully local: accounts, world, market, and the 100 Dya'kukull live in `localStorage` behind a storage adapter (`DYA.store` in `js/core/state.js`). "Online" opponents are the AI players — matchmaking, private rooms, and tournaments all work against them, and the engine is already deterministic lockstep (shared seed + input log, per Part XIV) so real networked play slots in without touching game logic.

**To go live later:** implement the three functions of `DYA.store` (`load`/`save`/`reset`) against Firestore, put Firebase Auth behind `G.createAccount`/`G.login`, and relay match inputs through a Realtime Database channel. The seams are marked in `state.js`.

## Deferred (matches Part XVII)

Sniller, Vyrenalur, Aerolhorn, Kalo'Eik variants, Api Buta, Expedition/Challenge modes, Pia'don-tier titles, replay share links, variable pouch sizes, the Gynge flip mechanic (no current token can trigger it), WebXR/mobile, and real cross-device multiplayer per above.

## Tests

```bash
node tests/test_engine.js   # headless: determinism, replay exactness, duel/hunt/standard resolution
```

---
*Launch design complete. The Guild is watching. Cordially.*
