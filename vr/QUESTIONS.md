# QUESTIONS for Yak

Where a rule was not written down, the plainest option was chosen so the build could keep moving. Each choice is listed here so Yak can confirm or change it. Nothing here is lore.

## Open items from the brief (logged, not decided)

1. **In-VR friend invites.** Proposed: a minimal wrist menu with a friend list and an invite button.
2. **Ocean creatures.** Are PUkuk and the other ocean creatures tokens at launch? They have no data folders yet.
3. **Dearcineon names** for working terms: pouch, desk, trays, table, hooks, browse panel, sandbox.
4. **Supply-stall prices** for weapons, food, armor and potions.
5. **Special-hunt loss rules.** What can be lost beyond food and new materials?

## Choices made in Milestone 0

6. **Which creatures are in the first build.** The seven launch creatures (Su Naga, Sru Vorn, Lutut, Hvaleia, Ular Naga, Tonguatjis, Kuni Byrd) plus four from the 2D roster so a match can be won by carrying the Relic: Sword Eikar, Spear Eikar, Archer Eikar and Wild Punk. Should the rest of the 2D roster come across, and in what order?
7. **Who carries the Relic.** Only sentient units (the Eikar) go for the Relic. The 2D code also let the Su Naga carry it, but its written rule says it "never takes the Relic itself", so the written rule was followed.
8. **Ring votes when only one player votes chaos.** A dial is chaos only when both players leave that ring at the bottom. If one player sets a value, that value is used. If both set values, the middle is used (as in 2D).
9. **Scale ring steps.** Five steps: Tabletop (1.6 m wide), Large table, Person-sized (16 m), Courtyard, Life-size (160 m). With two votes the middle step wins, rounding toward the smaller.
10. **Tether numbers.** Each creature has a tolerance past the ground edge before it dissolves (walkers 80 to 160 units, flyers 380 to 420). These are first guesses in each `creature.json`.
11. **Throw reach numbers.** Each creature has a reach from its horde (600 to 760 units of the 1600-unit field). First guesses, in each `creature.json`.
12. **Picking a thrown coin back up.** A thrown, unspawned coin can be walked out to and picked up again. Resources already rubbed into it stay on it.
13. **Unpaying.** Resources rubbed into a token cannot be taken back out.
14. **Nagas' first head.** "Near-invincible" is modelled as: once a Naga is down to its last head, it takes 40% damage.

## Choices made in Milestone 1

15. **Rubbing with a controller.** While holding a token, flick the thumbstick toward a resource (up Fti, right Su, down Eldi, left Ular), or touch the coin with your other hand to pay the next jewel you can afford. Is that close enough to "rub your thumb over the jewel" until hand tracking exists?
16. **Rummaging by feel.** With a hand in the pouch, the thumbstick moves your fingers from token to token, and each gives a tick that is stronger for bigger creatures. Grip pulls it out. Should other things be felt too (rarity, element)?
17. **Pulling all tokens out.** Pressing B with a hand in the pouch tips every token onto your table.
18. **A token let go of in mid-air** (not thrown, not over the table) drops back into the pouch so it cannot be lost.
19. **The table** appears in every match, not only big ones, so there is always somewhere to set tokens down.
20. **Scale ring default.** With the scale ring at the bottom the match is Tabletop.
21. **Throw reach on big fields.** A real throw of about 4 m counts as the creature's full reach; the coin is carried the rest of the way.
22. **AI first move.** The AI opponent waits 20 seconds before its first move in a casual match.
23. **Match length.** Relic runs end AI matches in one to two minutes. Is that the intended pace, or should Relic carriers be slower or hordes further apart?

## Choices made in Milestone 2

24. **Starting collection.** A new player gets 32 tokens (a mix of all 11 creatures) and a first pouch of 20. What should a new player really start with?
25. **Search on the browse panel.** With no keyboard, a "Kind" button steps through creature kinds in place of typed search.
26. **Saved pouches.** Three pouches to start. Touching one on its hook puts it on the desk as the open pouch.
27. **Display cases.** Eight cases up the stair, one token each.
28. **True size.** Life-size is 0.1 m per simulation unit, so the largest creatures (Skaar) are about 7.6 m across.

## Choices made in Milestone 3

29. **NPC names.** Generated with the 2D game's Dearcineon name generator, one town seed per player. Should the 100 Dya'kukull instead be the exact same named people in every player's town?
30. **All dialogue lines** in `data/dialogue.json` are Proposed placeholders for Yak to replace. Personal lines per NPC are not written.
31. **Personalities** are working labels (quiet, cheerful, boastful, busy, gambler, wary) used only to pick a greeting.
32. **Who wagers.** Gamblers always; others about 45% of the time. About 15% of townspeople do not play at all.
33. **What an NPC stakes.** The token of theirs closest in rarity to yours.
34. **Casual rewards.** Win 30 XP and 25 gold, loss 10 XP and 5 gold (in `data/stalls.json`). What are the real numbers?
35. **Supply prices and guide fee** (40 gold) are placeholders in `data/stalls.json`.
36. **Your listing price** defaults to the 2D baseline value for the rarity. There is no price slider yet.
37. **Length of a day.** 24 minutes of play.
