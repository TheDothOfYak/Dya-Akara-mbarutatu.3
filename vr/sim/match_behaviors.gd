class_name MatchBehaviors
extends RefCounted
## Creature decision trees. Each living creature thinks every 6 ticks and writes
## an intent ({move, attack, z, ...}); MatchSim executes it. Seeded and
## deterministic: the only randomness is sim.rng.
##
## These are first-pass ports of the 2D trees (js/engine/behaviors.js), cut down
## to what each species' written rules say. Per-individual vars and the locked
## behaviour value (energy) shape every decision.

static func think(sim: MatchSim, c: Dictionary) -> void:
	# Tether sense: most creatures turn back before they dissolve.
	var turn_at := 0.85 if c.energy > 900 else 0.55
	if c.tether_frac > turn_at:
		c.intent = {"move": {"x": clampf(c.x, 80.0, MatchSim.W - 80.0), "y": clampf(c.y, 80.0, MatchSim.H - 80.0), "run": true}}
		return
	match c.sp.get("behavior", ""):
		"sword_unit": _unit(sim, c, false)
		"spear_unit": _unit(sim, c, true)
		"archer_unit": _archer(sim, c)
		"wild_punk": _wild_punk(sim, c)
		"sru_vorn": _sru_vorn(sim, c)
		"ular_naga": _ular_naga(sim, c)
		"su_naga": _su_naga(sim, c)
		"lutut": _lutut(sim, c)
		"kuni_byrd": _kuni_byrd(sim, c)
		"hvaleia": _hvaleia(sim, c)
		"tonguatjis": _tonguatjis(sim, c)
		_: _generic(sim, c)

# ---------------------------------------------------------------- helpers

static func _cd_ready(sim: MatchSim, c: Dictionary, key: String) -> bool:
	return sim.tick >= int(c.mem.get("cd_" + key, 0))

static func _cd_set(sim: MatchSim, c: Dictionary, key: String, seconds: float) -> void:
	c.mem["cd_" + key] = sim.tick + roundi(seconds / MatchSim.TICK)

static func _aggro(c: Dictionary) -> float:
	# energy 5..3000 -> 0.75..1.6 : hot truths look further for a fight
	return clampf(0.75 + c.energy / 1400.0, 0.75, 1.6)

static func _attack(c: Dictionary, target: Dictionary, extra: Dictionary = {}) -> void:
	c.intent["attack"] = target
	if c.flyer:
		c.intent["z"] = target.z
		c.intent["z_rate"] = float(extra.get("z_rate", 1.0))
	for k in extra:
		c.intent[k] = extra[k]

static func _wander(sim: MatchSim, c: Dictionary, cx: float, cy: float, r: float) -> void:
	if not c.mem.has("wx") or sim.tick >= int(c.mem.get("w_until", 0)) or Vector2(c.x, c.y).distance_to(Vector2(c.mem.wx, c.mem.wy)) < 12.0:
		c.mem["wx"] = clampf(cx + sim.rng.range_f(-r, r), 30.0, MatchSim.W - 30.0)
		c.mem["wy"] = clampf(cy + sim.rng.range_f(-r, r), 30.0, MatchSim.H - 30.0)
		c.mem["w_until"] = sim.tick + roundi(sim.rng.range_f(3.0, 7.0) / MatchSim.TICK)
	c.intent["move"] = {"x": c.mem.wx, "y": c.mem.wy, "run": false}

static func _fight_back(sim: MatchSim, c: Dictionary) -> bool:
	if sim.tick - c.last_hit_tick < 100 and c.last_attacker >= 0:
		var a = sim.creature_by_id(c.last_attacker)
		if a != null and a.team != c.team:
			_attack(c, a)
			return true
	return false

## The smart go for the Relic: take the rival's and run it home.
static func _relic_plan(sim: MatchSim, c: Dictionary) -> bool:
	if sim.mode != "standard":
		return false
	if c.carrying_relic:
		var home: Vector2 = sim.teams[c.team].hoard
		c.intent = {"move": {"x": home.x, "y": home.y, "run": true}}
		return true
	if c.hp < c.max_hp * 0.4 or sim.nearest_enemy(c, 160.0) != null:
		return false
	var rl = sim.enemy_relic(c.team)
	if rl == null or rl.captured or rl.carrier >= 0:
		return false
	var d := Vector2(c.x, c.y).distance_to(Vector2(rl.x, rl.y))
	c.intent["move"] = {"x": rl.x, "y": rl.y, "run": d < 260.0}
	if d < MatchSim.RELIC_PICK_R + c.radius:
		sim.pick_relic(c)
	return true

static func _thief_of(sim: MatchSim, team: int):
	var rl = sim.own_relic(team)
	if rl != null and rl.carrier >= 0:
		return sim.creature_by_id(rl.carrier)
	return null

static func _size_ok(c: Dictionary, o: Dictionary) -> bool:
	return float(o.size_idx + 1) >= float(c.vars.get("preyThreshold", 0.0))

# ---------------------------------------------------------------- sentient units

static func _unit(sim: MatchSim, c: Dictionary, spear: bool) -> void:
	if c.carrying_relic:
		_relic_plan(sim, c)
		return
	var thief = _thief_of(sim, c.team)
	if thief != null and sim.dist(c, thief) < 420.0:
		_attack(c, thief)
		return
	var foe = _pick_by_priority(sim, c, 240.0 * _aggro(c))
	if foe != null and (sim.dist(c, foe) < 160.0 or c.hp > c.max_hp * 0.4):
		if spear and _cd_ready(sim, c, "hanii") and sim.dist(c, foe) > c.attack_range + c.radius + foe.radius + 10.0 and sim.dist(c, foe) < float(c.vars.get("haniiRange", 100)) + 60.0:
			_cd_set(sim, c, "hanii", 6.0)
			sim.projectiles.append({"id": sim.id_counter, "x": c.x, "y": c.y, "z": c.radius, "target": foe.id, "team": c.team, "src": c.id,
				"dmg": c.dmg * 1.3 * float(c.vars.get("haniiAccuracy", 0.8)), "speed": 260.0, "kind": "hanii"})
			sim.id_counter += 1
			sim._ev("shoot", {"id": c.id, "target": foe.id})
		if foe.z <= MatchSim.MELEE_Z + c.radius:
			_attack(c, foe)
			return
	if _relic_plan(sim, c):
		return
	var eh: Vector2 = sim.teams[1 - c.team].hoard
	c.intent["move"] = {"x": eh.x, "y": eh.y, "run": false}

static func _pick_by_priority(sim: MatchSim, c: Dictionary, range_u: float):
	var pri: String = c.picks.get("targetPriority", "closest")
	var best = null
	var bs := -INF
	for o in sim.creatures:
		if o.dead or o.team == c.team:
			continue
		var d := sim.dist(c, o)
		if d > range_u:
			continue
		var s := -d
		if pri == "biggest threat": s = o.dmg * 20.0 - d
		elif pri == "weakest target": s = -o.hp * 2.0 - d
		if s > bs:
			bs = s
			best = o
	return best

static func _archer(sim: MatchSim, c: Dictionary) -> void:
	if c.carrying_relic:
		_relic_plan(sim, c)
		return
	var near = sim.nearest_enemy(c, 70.0, func(o): return o.z <= MatchSim.MELEE_Z)
	var foe = sim.nearest_enemy(c, c.attack_range + 120.0)
	if foe != null:
		var extra := {"ranged": true, "cd": 1.6 / float(c.vars.get("drawSpeed", 1.0)), "dmg_mul": float(c.vars.get("bowQuality", 1.0)) * (1.3 if foe.flyer or foe.sp.element == "Su" else 1.0)}
		if near != null and int(c.picks.get("movingShot", 0)) == 0:
			# allergic to close range: back off first
			var away := Vector2(c.x - near.x, c.y - near.y).normalized() * 120.0
			c.intent["move"] = {"x": clampf(c.x + away.x, 30.0, MatchSim.W - 30.0), "y": clampf(c.y + away.y, 30.0, MatchSim.H - 30.0), "run": true}
			return
		_attack(c, foe, extra)
		c.intent.erase("z")
		return
	if _relic_plan(sim, c):
		return
	var eh: Vector2 = sim.teams[1 - c.team].hoard
	c.intent["move"] = {"x": eh.x, "y": eh.y, "run": false}

# ---------------------------------------------------------------- creatures

static func _generic(sim: MatchSim, c: Dictionary) -> void:
	var foe = sim.nearest_enemy(c, 260.0 * _aggro(c))
	if foe != null:
		_attack(c, foe)
	else:
		_wander(sim, c, c.x, c.y, 120.0)

static func _wild_punk(sim: MatchSim, c: Dictionary) -> void:
	if not c.mem.has("hx"):
		c.mem["hx"] = c.x
		c.mem["hy"] = c.y
	# evasive: fights while fleeing when hurt
	if c.hp < c.max_hp * float(c.vars.get("aggressionThreshold", 0.5)) * 0.8:
		var near = sim.nearest_enemy(c, 140.0)
		if near != null:
			var away := Vector2(c.x - near.x, c.y - near.y).normalized() * 160.0
			c.intent["move"] = {"x": clampf(c.x + away.x, 30.0, MatchSim.W - 30.0), "y": clampf(c.y + away.y, 30.0, MatchSim.H - 30.0), "run": true}
			if sim.dist(c, near) < c.attack_range + c.radius + near.radius and near.z <= MatchSim.MELEE_Z + c.radius:
				c.intent["attack"] = near
				c.intent["kite"] = c.intent.move
			return
	var terr := float(c.vars.get("territory", 150)) * _aggro(c)
	var foe = sim.nearest_enemy(c, terr, func(o): return o.z <= MatchSim.MELEE_Z + c.radius and Vector2(o.x, o.y).distance_to(Vector2(c.mem.hx, c.mem.hy)) < terr * 1.5)
	if foe != null:
		_attack(c, foe)
	elif not _fight_back(sim, c):
		_wander(sim, c, c.mem.hx, c.mem.hy, terr * 0.5)

static func _sru_vorn(sim: MatchSim, c: Dictionary) -> void:
	if not c.mem.has("hx"):
		c.mem["hx"] = c.x
		c.mem["hy"] = c.y
	var terr := float(c.vars.get("territory", 200)) * _aggro(c)
	var prey = sim.nearest_enemy(c, terr, func(o): return _size_ok(c, o) and o.z <= MatchSim.MELEE_Z + c.radius)
	if prey != null:
		_attack(c, prey, {"dmg_mul": 1.0 + float(c.vars.get("acidPotency", 10)) / 60.0})
		return
	if _fight_back(sim, c):
		return
	# downtime: cultivate an acid bog near home
	if _cd_ready(sim, c, "bog") and sim.rng.chance(float(c.vars.get("bogActivity", 0.5)) * 0.15):
		_cd_set(sim, c, "bog", 14.0)
		sim.add_zone("bog", c.team, c.x + sim.rng.range_f(-60, 60), c.y + sim.rng.range_f(-60, 60), 46.0, 30.0, float(c.vars.get("acidPotency", 10)))
	c.intent["state"] = "idle"

static func _ular_naga(sim: MatchSim, c: Dictionary) -> void:
	# reckless when young: anything in range, no exceptions. Never goes for the Relic.
	var young: bool = c.age < 0.45
	var rng_u := (320.0 if young else 240.0) * _aggro(c)
	var foe = sim.nearest_enemy(c, rng_u, func(o): return o.z <= MatchSim.MELEE_Z + c.radius)
	if foe != null:
		_attack(c, foe, {"dmg_mul": 1.0 + 0.3 * (c.heads_left - 1), "cd": 1.1})
		return
	if _fight_back(sim, c):
		return
	if not c.mem.has("hx"):
		c.mem["hx"] = c.x
		c.mem["hy"] = c.y
	if young:
		var eh: Vector2 = sim.teams[1 - c.team].hoard
		_wander(sim, c, lerpf(c.x, eh.x, 0.3), lerpf(c.y, eh.y, 0.3), 160.0)
	else:
		_wander(sim, c, c.mem.hx, c.mem.hy, 120.0)

static func _su_naga(sim: MatchSim, c: Dictionary) -> void:
	# Reads the field: intercepts Relic carriers, then strikes whatever threatens
	# its side hardest. Never takes the Relic itself.
	var mul := {"dmg_mul": 1.0 + 0.3 * (c.heads_left - 1), "cd": 1.1}
	var thief = _thief_of(sim, c.team)
	if thief != null:
		_attack(c, thief, mul)
		return
	var own: Vector2 = sim.teams[c.team].hoard
	var best = null
	var bs := -INF
	var patience := float(c.vars.get("patience", 0.6))
	var watch := lerpf(520.0, 300.0, patience) * _aggro(c)
	for o in sim.creatures:
		if o.dead or o.team == c.team or o.z > MatchSim.MELEE_Z + c.radius:
			continue
		var d := sim.dist(c, o)
		if d > watch and Vector2(o.x, o.y).distance_to(own) > 420.0:
			continue
		var s: float = o.dmg * 18.0 * float(c.vars.get("tacticalIntelligence", 0.7)) - d - Vector2(o.x, o.y).distance_to(own) * 0.5
		if s > bs:
			bs = s
			best = o
	if best != null:
		_attack(c, best, mul)
		return
	if _fight_back(sim, c):
		return
	if c.age < 0.4:
		var eh: Vector2 = sim.teams[1 - c.team].hoard
		c.intent["move"] = {"x": eh.x, "y": eh.y, "run": false}
	else:
		c.intent["state"] = "idle"

static func _flyer_hunt(sim: MatchSim, c: Dictionary, prey, dive_mul: float, extra: Dictionary) -> void:
	var d := sim.dist(c, prey)
	if d > 170.0:
		c.intent["move"] = {"x": prey.x, "y": prey.y, "run": true}
		c.intent["z"] = max(prey.z, MatchSim.CRUISE_Z)
	else:
		extra["z_rate"] = dive_mul * 1.6
		if c.z - prey.z > 40.0:
			extra["dmg_mul"] = float(extra.get("dmg_mul", 1.0)) * (1.0 + 0.25 * dive_mul)
			c.mem["diving"] = true
		_attack(c, prey, extra)
		c.intent["move"] = {"x": prey.x, "y": prey.y, "run": true, "mul": dive_mul}

static func _lutut(sim: MatchSim, c: Dictionary) -> void:
	var prey = sim.nearest_enemy(c, 700.0 * _aggro(c), func(o): return _size_ok(c, o))
	if prey == null:
		prey = sim.nearest_enemy(c, 300.0 * _aggro(c))
	if prey != null:
		if _cd_ready(sim, c, "screech") and sim.dist(c, prey) < 260.0:
			_cd_set(sim, c, "screech", 12.0)
			var power := float(c.vars.get("screechPower", 2.5))
			if c.picks.get("screechType", "targeted") == "area":
				for o in sim.enemies_of(c.team):
					if sim.dist(c, o) < 200.0:
						sim.stun(o, power * 0.5)
			else:
				sim.stun(prey, power * 0.8)
			sim._ev("screech", {"id": c.id, "loud": true})
		_flyer_hunt(sim, c, prey, float(c.vars.get("diveSpeed", 1.5)), {})
		return
	_orbit(sim, c)

static func _kuni_byrd(sim: MatchSim, c: Dictionary) -> void:
	if sim.tick < int(c.mem.get("recover_until", 0)):
		_orbit(sim, c)
		return
	var prey = sim.nearest_enemy(c, 520.0 * _aggro(c), func(o): return _size_ok(c, o) and o.size_idx <= c.size_idx + 1)
	if prey == null and c.picks.get("huntingStyle", "") == "opportunist":
		prey = sim.nearest_enemy(c, 260.0)
	if prey == null and _fight_back(sim, c):
		return
	if prey != null:
		_flyer_hunt(sim, c, prey, float(c.vars.get("diveSpeed", 1.7)), {"dmg_mul": float(c.vars.get("talons", 1.2)), "cd": 1.2})
		# after a few strikes it climbs away to recover
		if c.state == "attack":
			c.mem["strikes"] = int(c.mem.get("strikes", 0)) + 1
			if c.mem.strikes >= 6:
				c.mem["strikes"] = 0
				c.mem["recover_until"] = sim.tick + roundi((4.0 - 3.0 * float(c.vars.get("recovery", 0.7))) / MatchSim.TICK)
		return
	_orbit(sim, c)

static func _orbit(sim: MatchSim, c: Dictionary) -> void:
	# circle wide over the field; flyers may pass over the crowd
	if not c.mem.has("orbit_a"):
		c.mem["orbit_a"] = sim.rng.range_f(0.0, TAU)
		c.mem["ox"] = clampf(c.x, 300.0, MatchSim.W - 300.0)
		c.mem["oy"] = clampf(c.y, 250.0, MatchSim.H - 250.0)
	c.mem.orbit_a = fmod(c.mem.orbit_a + 0.12, TAU)
	c.intent["move"] = {"x": c.mem.ox + cos(c.mem.orbit_a) * 300.0, "y": c.mem.oy + sin(c.mem.orbit_a) * 260.0, "run": false}
	c.intent["z"] = MatchSim.CRUISE_Z

static func _hvaleia(sim: MatchSim, c: Dictionary) -> void:
	# always moving, always hunting
	var jet_r := float(c.vars.get("jetRange", 110))
	if _cd_ready(sim, c, "jet"):
		var small = sim.nearest_enemy(c, jet_r + c.radius, func(o): return o.size_idx <= 1)
		if small != null:
			_cd_set(sim, c, "jet", max(2.5, 9.0 - float(c.vars.get("blowholes", 4))))
			var pot := float(c.vars.get("jetPotency", 8))
			sim.damage(small, pot, c)
			if not small.dead:
				sim.knockback(small, c.x, c.y, 40.0 + pot * 4.0)
				sim.stun(small, 1.2)
				if small.flyer:
					small.z = max(0.0, small.z - 60.0)
			sim._ev("jet", {"id": c.id, "target": small.id})
	var foe = sim.nearest_enemy(c, 900.0, func(o): return o.z <= MatchSim.MELEE_Z + c.radius)
	if foe != null:
		_attack(c, foe, {"dmg_mul": float(c.vars.get("clubSize", 1.0)), "cd": 1.3})
	else:
		_wander(sim, c, MatchSim.W * 0.5, MatchSim.H * 0.5, 380.0)

static func _tonguatjis(sim: MatchSim, c: Dictionary) -> void:
	# flees outright from any Lutut
	var lutut = sim.nearest_enemy(c, 260.0, func(o): return o.species == "lutut")
	if lutut != null:
		var away := Vector2(c.x - lutut.x, c.y - lutut.y).normalized() * 200.0
		c.intent["move"] = {"x": clampf(c.x + away.x, 30.0, MatchSim.W - 30.0), "y": clampf(c.y + away.y, 30.0, MatchSim.H - 30.0), "run": true}
		return
	var reach := float(c.vars.get("tongueLength", 130))
	if _cd_ready(sim, c, "tongue"):
		var small_only: bool = c.picks.get("sizePreference", "any") == "small"
		var prey = sim.nearest_enemy(c, reach + c.radius, func(o): return (o.flyer or o.sp.element == "Su" or o.sp.element == "Fti") and (not small_only or o.size_idx <= c.size_idx))
		if prey != null and prey.size_idx <= c.size_idx + 1:
			_cd_set(sim, c, "tongue", 7.0 / float(c.vars.get("tongueSpeed", 1.5)))
			# the tongue drags the catch to its jaws and grounds a flyer
			var dir := Vector2(prey.x - c.x, prey.y - c.y).normalized()
			prey.x = c.x + dir.x * (c.radius + prey.radius)
			prey.y = c.y + dir.y * (c.radius + prey.radius)
			prey.z = 0.0
			sim.stun(prey, 1.5)
			sim.damage(prey, c.dmg * float(c.vars.get("jawStrength", 1.4)), c)
			sim._ev("tongue", {"id": c.id, "target": prey.id})
			return
	var foe = sim.nearest_enemy(c, 110.0, func(o): return o.z <= MatchSim.MELEE_Z + c.radius)
	if foe != null:
		_attack(c, foe, {"dmg_mul": float(c.vars.get("jawStrength", 1.4)), "cd": 1.4})
	elif not _fight_back(sim, c):
		c.intent["state"] = "idle" # near-bottomless patience
