class_name DyaToken
extends RefCounted
## Token minting and cost, ported from the 2D game (js/core/token.js).
## A token is exactly one individual creature. No two share stats.

const COST_W := {"hp": 0.40, "dmg": 0.35, "speed": 0.25}
const COST_SCALE := 12.0
const COST_FLOOR := 3.3
const COST_MAX := 15

static func mint(sp: Dictionary, rng: DyaRng, opts: Dictionary = {}) -> Dictionary:
	var rarity: int = opts.get("rarity", rng.int_in(sp.rarity[0], sp.rarity[1]))
	rarity = clampi(rarity, 0, 6)
	var size_idx: int = opts.get("size_idx", rng.int_in(sp.size[0], sp.size[1]))
	# Behaviour value: the weighted lifetime energy average, locked at crafting.
	var energy: int = roundi(max(5.0, rng.gauss(400.0, 300.0)))
	var acquisition := rng.range_f(0.5, 3.0) if rng.chance(0.3) else rng.range_f(0.9, 1.1)
	energy = roundi(energy * (0.95 + 0.05 * acquisition))
	energy = clampi(energy, 5, 3000)
	var age := rng.range_f(0.1, 1.0)
	var combat_exp := rng.range_f(0.0, 1.0)
	var pain_tolerance := rng.range_f(0.2, 1.0)
	var vars := {}
	for k in sp.get("vars", {}):
		var r: Array = sp.vars[k]
		vars[k] = roundf(rng.range_f(r[0], r[1]) * 100.0) / 100.0
	var picks := {}
	for k in sp.get("picks", {}):
		picks[k] = rng.pick(sp.picks[k])
	var mul: Dictionary = sp.get("stat_mul", {"hp": 1.0, "dmg": 1.0, "speed": 1.0})
	var vigor: float = clampf(rng.gauss(1.0, 0.14), 0.66, 1.5)
	var ferocity: float = clampf(rng.gauss(1.0, 0.14), 0.66, 1.5)
	var gait: float = clampf(rng.gauss(1.0, 0.09), 0.78, 1.28)
	var outlier := ""
	if rng.chance(0.08):
		outlier = "prodigy" if rng.chance(0.5) else "runt"
	if outlier == "prodigy":
		vigor *= 1.18; ferocity *= 1.18
	if outlier == "runt":
		vigor *= 0.82; ferocity *= 0.85; gait *= 1.08
	# Anything the caller already knows about the living creature overrides the roll
	# (a hunted creature's token is exactly that creature).
	if opts.has("age"): age = opts.age
	if opts.has("combat_exp"): combat_exp = opts.combat_exp
	if opts.has("energy"): energy = opts.energy
	if opts.has("vars"): vars = opts.vars.duplicate()
	if opts.has("picks"): picks = opts.picks.duplicate()
	var hp: int = max(2, roundi(DyaEconomy.SIZE_HP[size_idx] * mul.hp * (0.75 + age * 0.5) * (1.0 + rarity * 0.06) * vigor))
	var dmg: float = max(0.5, roundf(DyaEconomy.SIZE_DMG[size_idx] * mul.dmg * (0.8 + combat_exp * 0.5) * (1.0 + rarity * 0.05) * ferocity * 10.0) / 10.0)
	var speed: int = roundi(DyaEconomy.SIZE_SPEED[size_idx] * mul.speed * rng.range_f(0.9, 1.12) * gait)
	if opts.has("stats"):
		hp = opts.stats.hp; dmg = opts.stats.dmg; speed = opts.stats.speed
	var id: String = opts.get("id", "tok_%08x%08x" % [int(rng.next() * 4294967296.0), int(rng.next() * 4294967296.0)])
	var tok := {
		"id": id, "species": sp.id, "name": opts.get("name", sp.name),
		"rarity": rarity, "size_idx": size_idx, "element": sp.element,
		"behavior_value": energy, "story": opts.get("story", ""),
		"age": snappedf(age, 0.01), "combat_exp": snappedf(combat_exp, 0.01),
		"pain_tolerance": snappedf(pain_tolerance, 0.01),
		"vars": vars, "picks": picks, "outlier": outlier,
		"stats": {"hp": hp, "dmg": dmg, "speed": speed},
		"origin": opts.get("origin", "starter"),
	}
	tok["cost"] = cost_vec(tok, sp)
	return tok

static func stat_power(stats: Dictionary) -> float:
	return COST_W.hp * (stats.hp / 480.0) + COST_W.dmg * (stats.dmg / 34.0) + COST_W.speed * (stats.speed / 58.0)

static func cost_total(stats: Dictionary) -> int:
	return clampi(roundi(stat_power(stats) * COST_SCALE - COST_FLOOR), 1, COST_MAX)

## Resource cost vector, derived live from the token's stats; the spill into
## off-elements is deterministic per token id.
static func cost_vec(tok: Dictionary, sp: Dictionary) -> Dictionary:
	var rng := DyaRng.new(DyaRng.hash_str(str(tok.id) + "::cost"))
	var total := cost_total(tok.stats)
	var v := {"Fti": 0, "Su": 0, "Eldi": 0, "Ular": 0}
	var e2 = sp.get("element2")
	var others := []
	for e in DyaEconomy.ELS:
		if e != sp.element and e != e2:
			others.append(e)
	var left := total
	v[sp.element] = max(1, ceili(total * 0.55))
	left -= v[sp.element]
	if e2 != null and left > 0:
		var s: int = min(left, max(1, roundi(total * 0.25)))
		v[e2] += s
		left -= s
	while left > 0:
		v[rng.pick(others)] += 1
		left -= 1
	return v

static func cost_sum(v: Dictionary) -> int:
	return v.Fti + v.Su + v.Eldi + v.Ular

static func temper_text(tok: Dictionary) -> String:
	var b: int = tok.behavior_value
	if b > 1200: return "Volatile — its truth runs hot; expect aggression beyond its species baseline."
	if b > 700: return "Spirited — noticeably more forward than most of its kind."
	if b > 300: return "True to its kind — behaves close to the species baseline."
	if b > 120: return "Settled — calmer and more measured than most of its kind."
	return "Still — unusually calm for its kind."

static func label(tok: Dictionary) -> String:
	return "%s · %s · %s" % [tok.name, DyaEconomy.RARITIES[tok.rarity], DyaEconomy.SIZES[tok.size_idx]]
