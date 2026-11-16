#!/usr/bin/env python3
"""One-off helper that wrote the first creature folders from the 2D species
table (js/data/species.js). The JSON files are now the source of truth; edit
them directly. Kept only as a record of where the numbers came from."""
import json, os, sys
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "creatures")
ANIMS = ["idle", "walk", "attack", "hurt"]
def c(id, name, family, element, rarity, size, mul, rng, behavior, tags, vars, picks, desc, temper, special,
      body, color, color2, feats, habitat, tether, reach, pieces, element2=None, launch=True, extra=None):
    d = {
        "id": id, "name": name, "family": family, "element": element, "element2": element2,
        "rarity": rarity, "size": size, "stat_mul": mul, "attack_range": rng,
        "behavior": behavior, "tags": tags, "vars": vars, "picks": picks,
        "desc": desc, "temperament": temper, "special": special,
        "tether": tether, "throw_reach": reach,
        "habitat": habitat, "wild": launch, "pieces": pieces,
        "song": {"placeholder": True, "notes": [], "file": ""},
        "placeholder": {"body": body, "color": color, "color2": color2, "features": feats},
        "model": {"file": "", "scale": 1.0, "animations": {}},
        "attachments": {},
    }
    if extra: d.update(extra)
    os.makedirs(os.path.join(OUT, id), exist_ok=True)
    with open(os.path.join(OUT, id, "creature.json"), "w") as f:
        json.dump(d, f, indent=1, ensure_ascii=False); f.write("\n")

PK = lambda kind, method: {"kind": kind, "method": method}
c("su_naga", "Su Naga", "Naga", "Su", [4, 6], [3, 4], {"hp": 1.9, "dmg": 1.5, "speed": 0.85}, 55, "su_naga",
  ["su", "carnivore", "apex", "naga", "biolum"],
  {"tacticalIntelligence": [0.5, 1], "breathStamina": [4, 9], "patience": [0.3, 1], "deception": [0.2, 1], "biolumControl": [0.3, 1]},
  {"headCount": [2, 2, 3, 3, 4, 5]},
  "A massive multi-headed sea serpent, ridged along its back and bioluminescent — light it uses both to speak and to deceive. Its electric-blue blood is NgAkara, the namesake material of Dya’Akara.",
  "A strategic apex predator, calculated and patient. \"The Su Naga is calm — that is the most dangerous version of it.\"",
  "First head near-invincible. Reads the field and strikes whatever threatens its side hardest; intercepts Relic carriers but never takes the Relic itself. Young Su Naga are reckless — patience comes with age.",
  "serpent", "#2a6f8f", "#68e0e8", ["heads", "ridge", "glow"], "sea", 160, 620,
  [PK("shed scale", "pickup"), PK("tooth", "cut")])
c("ular_naga", "Ular Naga", "Naga", "Ular", [2, 6], [2, 4], {"hp": 1.6, "dmg": 1.4, "speed": 0.9}, 48, "ular_naga",
  ["carnivore", "apex", "naga"],
  {"tacticalIntelligence": [0.1, 0.9], "breathStamina": [3, 8], "headRegrow": [0, 0.5], "dominance": [0.2, 1]},
  {"headCount": [1, 2, 2, 3, 3, 4, 5]},
  "A multi-headed serpent of the earth, scaled and armored, with a spiked club tail. New heads grow as the old prove their strength.",
  "Reckless and indiscriminate when young — it attacks anything in range without exception. With age it grows territorial and calculating.",
  "Its first head is near-invincible for the life of the token. Each head fights independently. Never goes for the Relic.",
  "serpent", "#57713d", "#3c4f2a", ["heads", "ridge", "club_tail"], "forest", 140, 640,
  [PK("shed scale", "pickup"), PK("tooth", "cut")])
c("sru_vorn", "Sru Vorn", "Creature", "Ular", [4, 6], [3, 4], {"hp": 1.7, "dmg": 1.5, "speed": 0.85}, 42, "sru_vorn",
  ["carnivore", "ambush", "apex"],
  {"acidPotency": [6, 18], "preyThreshold": [1, 2.4], "territory": [140, 260], "patience": [4, 14], "bogActivity": [0.3, 1]},
  {"preservation": [0, 0, 1]},
  "A heavy, low lizard with matted fur like armor, curved tusks, a spiked ball-tail, and acid saliva.",
  "Lazy until prey above a certain size wanders near — then it explodes from cover. Territorial by choice, not by limitation.",
  "Cultivates acid bog traps (Awvadhi) during downtime. Only hunts prey above its threshold size — smaller creatures are beneath its notice.",
  "quad", "#6b5b45", "#8fbf3f", ["tusks", "ball_tail", "low"], "bog", 110, 600,
  [PK("tusk", "cut"), PK("matted fur", "shave")], element2="Su")
c("lutut", "Lutut", "Creature", "Fti", [3, 6], [3, 4], {"hp": 1.4, "dmg": 1.6, "speed": 1.2}, 40, "lutut",
  ["flyer", "carnivore", "apex"],
  {"screechPower": [1.5, 4], "preyThreshold": [1.4, 2.6], "diveSpeed": [1.2, 1.9], "landSpeed": [0.6, 1]},
  {"screechType": ["targeted", "targeted", "targeted", "area"]},
  "A vast flying predator marked with stone-carving-like patterns that deepen with age, and jaws built for processing meat.",
  "Reckless and relentless — the apex predator of apex predators, hunting Ular Naga and other great beasts as prey.",
  "Screech stuns prey from altitude before the dive.",
  "bird", "#6d6a80", "#44415c", ["wings", "big_jaw"], "sky", 420, 700,
  [PK("shed feather", "pickup"), PK("claw", "cut")])
c("hvaleia", "Hvaleia", "Creature", "Su", [4, 6], [3, 4], {"hp": 2.1, "dmg": 1.3, "speed": 0.8}, 46, "hvaleia",
  ["su", "carnivore", "apex", "tank"],
  {"blowholes": [2, 6], "jetPotency": [4, 12], "clubSize": [0.8, 1.5], "tacticalIntelligence": [0.3, 1], "jetRange": [80, 150]},
  {"toxicJets": [0, 0, 0, 1]},
  "An enormous, many-eyed hunter of the open water and the air above it, with a row of blowholes and a heavy clubbed tail.",
  "Always moving, always hunting — calculated and confident. Its all-around vision means it can never be caught by surprise.",
  "Jets knock back and stun small creatures (Litk/Mael only — larger creatures shrug them off). Tail club answers everything else.",
  "whale", "#33658a", "#1e3f57", ["blowholes", "club_tail", "many_eyes"], "sea", 150, 600,
  [PK("bone", "cut"), PK("shed scale", "pickup")])
c("tonguatjis", "Tonguatjis", "Creature", "Ular", [2, 5], [2, 3], {"hp": 1.6, "dmg": 1.25, "speed": 0.7}, 30, "tonguatjis",
  ["ambush", "carnivore", "shell"],
  {"tongueLength": [90, 180], "tongueSpeed": [1, 2], "patience": [4, 16], "jawStrength": [1, 1.8], "shellDurability": [1, 1.6]},
  {"postCatch": ["eat", "store", "knockdown"], "sizePreference": ["small", "any"]},
  "A great shelled, snapping-jawed creature of the deep forest, known for a tongue many times longer than its body.",
  "A slow crawler with near-bottomless patience — it waits for flying or water-bound prey to pass within range of that tongue.",
  "Prefers Fti and Su targets. Flees outright from any Lutut.",
  "quad", "#4f6b3a", "#d46a6a", ["shell", "tongue", "low"], "forest", 90, 620,
  [PK("shell shaving", "shave"), PK("tooth", "cut")])
c("kuni_byrd", "Kuni Byrd", "Kuni Byrd", "Fti", [3, 5], [2, 3], {"hp": 1.15, "dmg": 1.45, "speed": 1.3}, 36, "kuni_byrd",
  ["flyer", "carnivore", "ambush"],
  {"diveSpeed": [1.4, 2], "talons": [1, 1.6], "preyThreshold": [0.8, 2], "nestDefence": [0.3, 1], "recovery": [0.4, 1], "stealth": [0.2, 0.9], "carryCapacity": [1, 2]},
  {"huntingStyle": ["dive bomber", "patient stalker", "opportunist"]},
  "A great aerial predator — an apex ambush hunter that dives from altitude onto prey below.",
  "Solitary, fiercely territorial, protective of its nest.",
  "Dive from altitude is its primary weapon.",
  "bird", "#8a6d3b", "#d9c27a", ["wings", "talons"], "sky", 380, 720,
  [PK("shed feather", "pickup"), PK("claw", "cut")])
EIK = ["sentient", "eikar"]
c("sword_eikar", "Sword Eikar", "Eikar", "Ular", [1, 5], [1, 1], {"hp": 1.0, "dmg": 1.2, "speed": 1.0}, 22, "sword_unit", EIK,
  {"bladeQuality": [0.6, 1.4], "formationDiscipline": [0.2, 1], "stamina": [0.6, 1.2], "loyaltyToUnit": [0.3, 1]},
  {"fightingStyle": ["aggressive brawler", "defensive counter-fighter", "technical precision"], "targetPriority": ["biggest threat", "weakest target", "closest"]},
  "A frontline Eikar combatant — acorn-capped, blade in hand, Relics woven into the way they fight.",
  "Aggressive or defensive by individual; formation-capable, dangerous alone.",
  "Fighting style, blade quality, and formation discipline vary per individual.",
  "biped", "#c8a05c", "#6d4a2e", ["acorn", "sword"], "town", 80, 760, [], launch=False)
c("spear_eikar", "Spear Eikar", "Eikar", "Ular", [1, 5], [1, 1], {"hp": 1.0, "dmg": 1.1, "speed": 1.0}, 34, "spear_unit", EIK,
  {"haniiRange": [70, 130], "haniiAccuracy": [0.5, 1], "packSynergy": [0.3, 1], "antiMount": [1.2, 1.8], "formationDiscipline": [0.3, 1]},
  {"targetPriority": ["biggest threat", "closest"]},
  "An Eikar unit fighter with the long Hanii spear.",
  "Best in formation; holds the edge of its weapon’s range.",
  "Longer reach. Can throw the Hanii at range.",
  "biped", "#c8a05c", "#6d4a2e", ["acorn", "spear"], "town", 80, 760, [], launch=False)
c("archer_eikar", "Archer Eikar", "Eikar", "Ular", [1, 5], [1, 1], {"hp": 0.8, "dmg": 1.0, "speed": 1.0}, 170, "archer_unit", EIK,
  {"bowQuality": [0.7, 1.4], "drawSpeed": [0.7, 1.4], "quiver": [14, 30], "positionalAwareness": [0.3, 1], "calm": [0.3, 1]},
  {"arrowType": ["broadhead", "bodkin", "barbed"], "movingShot": [0, 0, 0, 0, 1]},
  "A positional Eikar shooter. Find a vantage. Hold it. Pick targets carefully.",
  "Calm, patient, and allergic to close range.",
  "Natural advantage against flyers and Su creatures.",
  "biped", "#c8a05c", "#6d4a2e", ["acorn", "bow"], "town", 80, 760, [], launch=False)
c("wild_punk", "Wild Punk", "Punk Family", "Ular", [1, 3], [1, 1], {"hp": 0.9, "dmg": 1.05, "speed": 1.3}, 60, "wild_punk",
  ["forest", "herbivore"],
  {"vineLength": [40, 80], "territory": [90, 200], "aggressionThreshold": [0.3, 0.7], "breathCooldown": [14, 24], "dodge": [0.25, 0.5]},
  {"vineBehavior": ["grab", "smash", "throw"]},
  "A faster, leaner cousin of the Domestic Punk — same pumpkin-and-vine family, grown wild.",
  "Territorial and evasive — it would rather fight while fleeing than ever stand its ground.",
  "Hoarder instinct: opportunistically grabs anything smaller that wanders too close.",
  "punk", "#b8641f", "#2e5c2a", ["vines"], "forest", 100, 740, [PK("vine cutting", "cut")], launch=False,
  extra={"wild": True})
print("wrote creature folders")
