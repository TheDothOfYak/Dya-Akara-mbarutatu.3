class_name WildsSim
extends RefCounted
## The wilds: a persistent population of unique individuals, lightly simulated.
## Each creature IS a token-shaped record (the same fields a token has), so a
## token crafted from a piece is exactly the creature as it was when the piece
## was taken. Deterministic for a given seed and day.

const SIZE := 220.0 # the region runs from -SIZE to +SIZE metres around the town gate
## Habitat centres (x, z in metres) and radius. The town gate is at the origin.
const HABITATS := {
	"shore": {"x": 0.0, "z": -70.0, "r": 45.0},
	"sea": {"x": 0.0, "z": -150.0, "r": 60.0},
	"forest": {"x": 120.0, "z": 30.0, "r": 70.0},
	"bog": {"x": -120.0, "z": 30.0, "r": 60.0},
	"sky": {"x": 0.0, "z": 130.0, "r": 70.0},
}
const PER_SPECIES := 3

static func generate(seed_value: int) -> Dictionary:
	var rng := DyaRng.new(seed_value ^ 0x77A1D5)
	var w := {"seed": seed_value, "day": 0, "next_id": 1, "creatures": [], "sheds": []}
	for id in SpeciesDB.ids():
		var sp := SpeciesDB.get_sp(id)
		if not sp.get("wild", false):
			continue
		for k in PER_SPECIES:
			w.creatures.append(_born(w, sp, rng, rng.range_f(0.15, 0.95)))
	return w

static func _born(w: Dictionary, sp: Dictionary, rng: DyaRng, age: float) -> Dictionary:
	var hab: String = sp.get("habitat", "forest")
	if not HABITATS.has(hab):
		hab = "forest"
	var h: Dictionary = HABITATS[hab]
	var a := rng.range_f(0.0, TAU)
	var d := rng.range_f(0.0, h.r * 0.8)
	var id := "wild_%04d" % int(w.next_id)
	w.next_id = int(w.next_id) + 1
	var tok := DyaToken.mint(sp, rng, {"id": id, "age": age, "origin": "wild"})
	return {"id": id, "species": sp.id, "habitat": hab, "tok": tok, "born_day": int(w.day),
		"home_x": h.x + cos(a) * d, "home_z": h.z + sin(a) * d, "x": h.x + cos(a) * d, "z": h.z + sin(a) * d,
		"territory": rng.range_f(18.0, 40.0), "hp": float(tok.stats.hp), "alive": true, "taken": 0,
		"memory": {"seen": 0, "hurt": 0, "spared": 0, "fed": 0}}

static func by_id(w: Dictionary, id: String) -> Dictionary:
	for c in w.creatures:
		if c.id == id:
			return c
	return {}

## How this individual feels about you, from its memory: -1 hostile .. +1 at ease.
static func disposition(c: Dictionary) -> float:
	var m: Dictionary = c.memory
	return clampf((int(m.spared) + int(m.fed) * 2 - int(m.hurt) * 2) * 0.2, -1.0, 1.0)

## Recompute an individual's stats from what it is now (age, experience).
static func refresh_stats(c: Dictionary) -> void:
	var sp := SpeciesDB.get_sp(c.species)
	var t: Dictionary = c.tok
	var base := DyaToken.mint(sp, DyaRng.new(DyaRng.hash_str(c.id)), {"id": c.id, "age": t.age, "combat_exp": t.combat_exp,
		"energy": t.behavior_value, "vars": t.vars, "picks": t.picks, "rarity": t.rarity, "size_idx": t.size_idx})
	t.stats = base.stats
	t.stats.hp = max(2, int(t.stats.hp) - int(c.taken)) # every piece taken is a little less of it
	t.cost = DyaToken.cost_vec(t, sp)

## One day passes: creatures age and roam, memories fade, the old die and new ones are born or move in.
static func advance_day(w: Dictionary) -> Array:
	w.day = int(w.day) + 1
	var rng := DyaRng.new(int(w.seed) * 131 + int(w.day))
	var news := []
	for i in w.creatures.size():
		var c: Dictionary = w.creatures[i]
		var sp := SpeciesDB.get_sp(c.species)
		if not c.alive or float(c.tok.age) >= 1.0:
			var nb := _born(w, sp, rng, rng.range_f(0.1, 0.3))
			w.creatures[i] = nb
			news.append(nb.id)
			continue
		c.tok.age = min(1.0, roundf((float(c.tok.age) + 0.004) * 1000.0) / 1000.0)
		c.x = float(c.home_x) + rng.range_f(-1.0, 1.0) * float(c.territory)
		c.z = float(c.home_z) + rng.range_f(-1.0, 1.0) * float(c.territory)
		c.hp = min(float(c.tok.stats.hp), float(c.hp) + float(c.tok.stats.hp) * 0.25)
		for k in ["seen", "hurt", "spared", "fed"]:
			if int(c.memory[k]) > 0 and rng.chance(0.1):
				c.memory[k] = int(c.memory[k]) - 1
		refresh_stats(c)
	# shed pieces lie on the ground for a while
	var keep := []
	for s in w.sheds:
		if int(w.day) - int(s.day) < 6:
			keep.append(s)
	w.sheds = keep
	for c in w.creatures:
		for p in SpeciesDB.get_sp(c.species).get("pieces", []):
			if p.method == "pickup" and rng.chance(0.25):
				w.sheds.append({"creature": c.id, "kind": p.kind, "x": float(c.x) + rng.range_f(-6, 6), "z": float(c.z) + rng.range_f(-6, 6), "day": int(w.day),
					"tok": c.tok.duplicate(true)})
	return news

## Take a piece from a creature: the piece carries the creature exactly as it is now.
## how: "tracked" | "trapped" | "fought" | "spared" | "found"
static func take_piece(w: Dictionary, c: Dictionary, kind: String, how: String, place: String) -> Dictionary:
	var piece := {"id": "piece_%s_%d_%d" % [c.id, int(w.day), int(c.taken)], "creature": c.id, "species": c.species, "kind": kind,
		"how": how, "place": place, "day": int(w.day), "tok": c.tok.duplicate(true)}
	c.taken = int(c.taken) + 1
	c.tok.combat_exp = min(1.0, roundf((float(c.tok.combat_exp) + 0.01) * 100.0) / 100.0)
	refresh_stats(c)
	return piece

static func shed_piece(w: Dictionary, shed: Dictionary) -> Dictionary:
	w.sheds.erase(shed)
	return {"id": "piece_%s_%d_shed_%d" % [shed.creature, int(shed.day), int(shed.x * 10)], "creature": shed.creature, "species": shed.tok.species, "kind": shed.kind,
		"how": "found", "place": place_name(float(shed.x), float(shed.z)), "day": int(shed.day), "tok": shed.tok}

static func place_name(x: float, z: float) -> String:
	var best := "wilds"
	var bd := INF
	for k in HABITATS:
		var h: Dictionary = HABITATS[k]
		var d := Vector2(x - h.x, z - h.z).length() - float(h.r)
		if d < bd:
			bd = d
			best = k
	return best
