# Going Online — the honest 10-minute guide

**Read this first:** having a Firebase project and a `firebase.json` in the repo does **not**
make the game online. Firebase here only *hosts the files* (like GitHub Pages does). Every
computer that opens the game still keeps its own private world in its own browser storage —
which is why you and your friend could type codes at each other all day and never connect.

The game's real online features (cross-device **friends**, cross-device **private
matches**, the **shared player market**, and the **admin panel's live game edits**) run on
a free **Supabase** project. One of you sets it up once; then it works for everyone who
plays your deployment.

> **Already set up from an earlier version?** Just re-run `supabase/schema.sql` (Step 2) —
> every statement is idempotent, so it only adds the two new tables (`dya_listings` for the
> shared market, `dya_config` for admin edits) and leaves your existing data alone.

---

## Step 1 — Create the Supabase project (one person, once)

1. Go to <https://supabase.com>, sign up (free), and click **New project**.
2. Name it anything (e.g. `dya-akara`), pick a region near you, set any database password
   (you won't need it again for this), and create the project.
3. Wait a minute for it to finish provisioning.

## Step 2 — Create the game's tables

1. In the Supabase dashboard, open **SQL Editor → New query**.
2. Open the file **`supabase/schema.sql`** from this repository, copy ALL of it, paste it
   into the query window, and press **Run**.
3. You should see "Success. No rows returned". Done — the tables exist.

## Step 3 — Get your two magic values

In the dashboard go to **Settings → API** (or "Project Settings → API keys"):

- **Project URL** — looks like `https://abcdefghij.supabase.co`
- **anon public key** — a long string starting with `eyJ…`
  (use the *anon public* key — NEVER the `service_role` key)

## Step 4 — Put the values into the game

Two ways — pick either:

**A. In-game (fastest — do this on EACH computer):**
1. Open the game → log in → **Friends**.
2. Click **🌐 Set up online play**.
3. Paste the Project URL and the anon key → **Connect**.
4. You'll see `✓ Connected` and the Friends screen now shows **your friend code**.

**B. Baked into the deployment (once, for everybody):**
1. Edit `js/config.js` and fill in:
   ```js
   url: 'https://YOURPROJECT.supabase.co',
   anonKey: 'eyJ…',
   ```
2. Commit and redeploy (GitHub Pages / Firebase Hosting). Everyone who loads the site is
   online automatically.

## Step 5 — Add each other

1. Each player opens **Friends** — a 6-character **friend code** is shown at the top
   (e.g. `K7WMPQ`). This code is permanent for that account on that device.
2. Player A tells Player B their code (or vice versa).
3. Player B types the code into the **Add friend** box → **Add friend**.
4. Player A opens **Friends → Pending** and clicks **Accept** (requests also pop up as
   notifications; the list refreshes itself every ~15 seconds).
5. You now see each other under **🌐 ONLINE FRIENDS**, with live online/away/offline status.

## Step 6 — Play each other (cross-device private match)

1. Either player: **Play → Private Match → Open a room** → pick a pouch.
   A 5-letter **room code** appears (e.g. `TRK4Q`).
2. Tell the other player the code.
3. Other player: **Play → Private Match → Join room** → enter the code → pick a pouch.
4. The match starts on both computers simultaneously — same field, same creatures, live.
   Quick-chat works across the wire. Pausing is cosmetic in online matches.

### Good to know about online matches

- The engine runs deterministic lockstep: both computers simulate the identical match and
  only exchange your clicks (~500 ms input delay by design — this game is about placing
  tokens, not twitch aiming, so it feels fine).
- **Use the same browser on both computers** (Chrome↔Chrome is ideal). Different browsers
  can disagree on floating-point trigonometry; the game detects this and warns you if it
  ever happens.
- If your friend disconnects, you can claim the victory or wait for them.
- Duels, tournaments and the matchmaking queue still run against the Dya'kukull (the 100
  AI players) — online play covers **friends**, **private matches**, and the **shared
  market**.

## The shared market (real buy & sell)

Once online is configured, **Market → My Stall → ＋ New listing** offers a destination:

- **🌐 Online market** — the listing goes into the shared `dya_listings` table and appears
  in every player's Market → Browse (marked `🌐 PLAYER`). The full token travels with the
  listing. **Every token is one of a kind**: buying is an atomic database update that only
  succeeds while the listing is still active, so exactly one buyer ever wins it. Everyone
  else is told the token has left the market. While listed, the token is escrowed out of
  your collection; the sale proceeds (minus the Guild's rarity tax) arrive on your next
  sync, within ~20 seconds.
- **🏪 Local stalls** — the old behavior: your own world's Dya'kukull market, offers and
  negotiation included.

## Admin edits reach every player

The Admin Panel (`admin.html`) can edit creatures (stats, behaviors, sprites), all game
text, balance tables, and AI tuning. With online configured, every save is pushed to the
`dya_config` table and **every player's game adopts the newest revision within a minute** —
no redeploy needed. Note: if two players are mid-**online match** when an edit lands, their
games could momentarily disagree about creature stats; the desync detector will catch it.
Prefer pushing balance changes when no one is mid-match.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Connected to Supabase, but the game tables are missing" | You skipped Step 2 — run `supabase/schema.sql` in the SQL Editor. |
| "Supabase rejected the key" | You pasted the wrong key. Use the **anon public** key from Settings → API. |
| Friend code box says "Not found" | Codes are 6 characters, no zeros/ones (to avoid look-alikes). Ask your friend to re-read theirs from THEIR Friends screen. Both of you must have finished Step 4. |
| "No host answered on that code" | The host's room closed (they left the screen) or the code was mistyped. Room codes are 5 letters and single-use. |
| Room won't open: "Is Realtime enabled…" | In Supabase: Project Settings → API → make sure Realtime is enabled (it is by default on new projects). |

## A note on security

The included SQL policies are **open**: anyone who has your site's anon key can read/write
the friends tables. For a game shared among friends this is fine — but don't store secrets
in it, and don't publish the URL/key anywhere you wouldn't publish the game itself.

Accounts also stay **local to each device** (the online identity rides on top of them).
Optional Supabase email/password login exists behind `useAuth: true` in `js/config.js` for
later, but you don't need it.
