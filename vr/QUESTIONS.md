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
