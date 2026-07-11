# DYA'AKARA
### Token Game of the Mbaru Tatu

The full playable build of Dya'Akara, implemented from the **Master Design Document (Sessions 1–14)**. Zero dependencies, no build step — pure HTML/CSS/JavaScript.

---

## How to Play

**Option 1 — just open it:**
Open `index.html` in Chrome/Edge/Firefox. That's it.

**Option 2 — local server (recommended, avoids any file:// quirks):**
```bash
npm run dev          # serves on http://localhost:8000
# or, with no node at all:
python3 -m http.server 8000
```

**GitHub Codespaces:** open this repo in a Codespace, run `npm run dev`, and open the forwarded port 8000 when it pops up.

**Free permanent hosting:** this project is set up for GitHub Pages. After the workflow runs from the main branch, the game will be available at `https://<your-username>.github.io/Dya-Akara-mbarutatu.3/`.

Create an account (email/password — cross-device when online is configured, otherwise stored locally on your device), and the 14-step tutorial takes it from there: your first token is *you*, sung true as an Eikar. You'll finish the tutorial with exactly **13 tokens and 1,000 gold**, as designed.

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
- **Full token roster (Part IV, V)** — all launch tokens, each minted as a specific *individual* with a locked behavior value (weighted lifetime energy average), personality diamonds, Eikar/Keilia trait layers, an auto-written backstory, life-history quirks with real field effects (25 in the pool), and a unique **physique**: every individual wears its own coat shade, build, and identifying markings (spots, dorsal stripe, facial blaze, pale feet) on the field and on its card.
- **Duel mode** — pick/random/blind, anything wagered, no Guild cut, wagered tokens permanently lost. Random assignment and Dya'kukull opponents only ever field tokens that actually fight (no fruit, relic shavings, or Ju Fields). The only draw a duel allows is a RubberMcFly in play; on a draw nobody wins, all wagers return to their owners, and the match reward is split evenly.
- **Replays (Part XIV)** — stored as seed + input log, byte-identical playback, last 50 casual kept, tournament replays permanent.
- **Progression & economy (Part IX)** — exact XP bands, the full level-reward chest table with milestones, crafting costs, market tax by rarity, 75% Guild buyback, 50g listing fee, rentals at 25%→3%, titles with buffs (equipped-only), achievements, the complete 14-step tutorial.
- **Hunts (Part X)** — slots every 10 levels (expiring at the next band), the Track with narrator per creature (Noka for the ancients), 2 questions with the hidden ~5% temperament influence, encounter series, guaranteed piece + hidden performance-scored payouts, 1-Nurtui cooldowns.
- **Tournaments (Part XI)** — circuit browser, Guild-sealed vs player-run, brackets with all six tabs, ranked at Regional+, title selection per tier (Local auto → Planet pick-3-keep-1), leaderboards, seasons ended by admin-activated Interplanetary.
- **All UI screens (Part XII)** — built to the locked wireframes: Pia'don login shot, the 9-card token wheel (not radial), collection with collapsible pouch builder, torchlit stalls with the seller-only market average, the crafting ritual (skippable), circular minimap, spinning-coin loading screen with lore tips, the lot.
- **Social (Part XIII)** — friends/pending/blocked, follows (cap 100), notifications (dismissed = gone), quick-chat only in match, reports to the Guild, public bans with collection-only access, spectator mode with cosmetic reactions.
- **Admin panel (Part XVI)** — tournaments, bans/appeals, frozen-token review (cleared/corrected/deleted/penalized), market monitor (local AND the shared online market), token spawning, announcements, trusted-seller grants, and the full **Dya'kukull tab** managing the 100 AI players who populate the market, stalls, queues, and brackets — now with global AI tuning dials, bulk operations, and per-AI collection management.
- **Live game editing from the admin panel** — every species is fully editable (stats, rarity/size bands, elements, behavior tree, per-individual trait ranges, dictionary text, and the sprite itself: rig, colors, feature layers, or an uploaded image with live animated preview; clone species into new ones), all game text (lore tips, story fragments, quick chat, plus game-wide exact-match UI string replacement), every balance/economy table, and the AI tuning dials. Edits are stored as overrides (`js/core/mods.js`), apply instantly, survive world resets, and — when online is configured — push to Supabase so **every player's game adopts them within a minute**.
- **The Vakarborac** — the creature dictionary as an in-game field guide (main menu → 📖 Vakarborac): every species with living art, temperament, and field notes, organized in the dictionary's five volumes.

## Placeholder Art

Per the creator's direction, all creatures use **animated placeholder rigs**: a small four-legged animal for beasts, a small two-legged, two-armed acorn for humanoids — with species feature layers (extra heads for Naga, five horns for Albali Byrd, the flame crown for Tyndael, hair armor for Keilia…) so everything reads on the field. All animation states are in: idle, walk, run, attack, hit, death fade, dormant, plus signature specials (tongue strike, jet blast, screech, teleport, swarm thinning). Shader treatments per Part XIV: magical shimmer, per-creature bioluminescence (RubberMcFly only glows during the Sunear'Zikhron), tether fade, element-colored resource orbs.

**No music**, by design — the composer is handling that. The music channel exists in Settings and stays politely silent. Synthesized SFX are in (including the ShurgrEdan strike, with its own toggle).

## Online Play (real cross-device multiplayer)

The game now has a real online layer — see **[ONLINE_SETUP.md](ONLINE_SETUP.md)** for the 10-minute setup. It runs on a free Supabase project (Firebase, if you use it, only *hosts the files* — it does not make the game online by itself):

- **Cross-device accounts — log in anywhere** — a player's whole save (collection, gold, level, friends, settings, achievements) is keyed to their email and lives in a `dya_accounts` table, not just one browser's `localStorage`. Log in with the same email+password on any computer — home, work, a phone browser — and pick up exactly where you left off. Bans travel the same way, enforced the moment you log in anywhere. (`js/core/account_cloud.js`.)
- **Cross-device friends** — every player gets a permanent 6-character **friend code** (shown at the top of the Friends screen once online). Exchange codes, send/accept requests, and see each other's live online status from any two computers. (`js/core/online.js`, plain REST, polled every 15s.)
- **Cross-device private matches** — Play → Private Match: one player opens a room and shares a 5-letter code, the other joins with it. Both computers run the identical deterministic simulation and exchange only inputs (lockstep over a Supabase Realtime channel, ~500ms input delay, desync detector included). (`js/core/netplay.js`.)
- **The shared player market — real buy & sell, no duplicates** — list a token to the online market and every player sees it; the full token travels with the listing. Buying is an **atomic conditional update**: exactly one buyer can ever win a token, and the moment they do it leaves the market for everyone else. The seller's device collects the proceeds (minus the Guild tax) on its next sync. Cancelling and admin pulls return the token home. (`js/core/market_online.js`.)
- **Admin edits broadcast to all players** — the admin panel's creature/text/balance/AI edits push to a `dya_config` row that every game polls (`js/core/mods.js`). The Admin Panel can also look up and manage any player's cloud account, even one it's never locally seen.
- Configure once in `js/config.js` (bakes it into the deployment), or per-browser in-game via **Friends → Set up online play**. If you set up Supabase before this update, re-run `supabase/schema.sql` once — it's idempotent and just adds the new tables.
- ⚠ Same open-policy security model as the rest of this online layer (see [ONLINE_SETUP.md](ONLINE_SETUP.md#a-note-on-security)): fine for a game shared among people you trust, not equivalent to real per-account authentication.

Without online configured, everything still runs fully local exactly as before: accounts, world, the local Dya'kukull stalls, and the 100 Dya'kukull live in `localStorage` behind a storage adapter (`DYA.store` in `js/core/state.js`). Matchmaking, duels, and tournaments are always played against the AI populace, which stays a per-browser simulation even with online configured — it's world flavor, not portable player data.

## Deferred (matches Part XVII)

Sniller, Vyrenalur, Aerolhorn, Kalo'Eik variants, Api Buta, Expedition/Challenge modes, Pia'don-tier titles, replay share links, variable pouch sizes, the Gynge flip mechanic (no current token can trigger it), WebXR/mobile, online matchmaking/tournaments (online play currently covers friends, private matches + the shared market), and cross-device negotiation/offers on online listings (online listings are instant-buy; haggling stays on the local stalls).

## Tests

```bash
npm test                          # runs all four suites below
node tests/test_engine.js         # headless: determinism, replay exactness, duel/hunt/standard resolution, duel tie rules
node tests/test_netplay.js        # lockstep netplay: two simulated machines must stay tick-identical
node tests/test_mods_market.js    # admin live-edit overrides + shared market: atomic buys, no token duplicates
node tests/test_cloud_accounts.js # cross-device accounts: same login from a fresh "device", bans travel, offline fallback intact
```

---
*Launch design complete. The Guild is watching. Cordially.*
