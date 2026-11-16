class_name MatchSim
extends RefCounted
## The deterministic match simulation. Rules only: no nodes, no rendering, no
## input devices, no clocks. Ported from the 2D engine (js/engine/match.js) with
## the VR rule changes from the design document (section 2).
##
## - Fixed timestep (20 ticks a second). All randomness comes from the match seed.
## - Every input goes through queue_input() and is written to the input log.
##   A replay is the seed, the setup and that log, and reproduces the match exactly.
## - Positions are in simulation units on a 1600 x 1000 field; `z` is altitude.
##   The voted arena scale is visual only and never enters the rules.

const TICK := 0.05
const W := 1600.0
const H := 1000.0
const HOARD_R := 70.0
const RELIC_PICK_R := 26.0
const HOARD_KEEPOUT := 130.0
const CRUISE_Z := 120.0
const MELEE_Z := 34.0
const ELS := ["Fti", "Su", "Eldi", "Ular"]
const HOARDS := [Vector2(240, 500), Vector2(1360, 500)]

var cfg: Dictionary
var mode := "standard" # "standard" | "sandbox"
var seed_value: int
var rng: DyaRng
var species: Dictionary
var settings: Dictionary
var tick := 0
var time := 0.0
var over := false
var result := {}
var paused := false

var teams: Array = []
var creatures: Array = []
var projectiles: Array = []
var zones: Array = []
var relics: Array = []
var events: Array = [] # presentation feed; never read by the rules
var log: Array = []
var input_queue: Array = []
var replay_log: Array = []
var is_replay := false
var replay_ptr := 0

var pulse_index := 0
var next_pulse_at := 0.0
var last_pulse := {}
var last_combat_tick := 0
var last_esc := 1
var id_counter := 1
var seq_counter := 0
var _acc := 0.0

func _init(config: Dictionary, species_db: Dictionary) -> void:
	cfg = config
	species = species_db
	mode = cfg.get("mode", "standard")
	seed_value = int(cfg.get("seed", 1)) & 0xFFFFFFFF
	rng = DyaRng.new(seed_value)
	settings = {"pulse_interval": 8, "pulse_amount": 2, "chaos_interval": true, "chaos_amount": true, "scale": 0.01}
	settings.merge(cfg.get("settings", {}), true)
	if cfg.has("replay_log"):
		is_replay = true
		replay_log = cfg.replay_log
	var tcfg: Array = cfg.get("teams", [])
	for i in tcfg.size():
		var t: Dictionary = tcfg[i]
		var res := {"Fti": 0, "Su": 0, "Eldi": 0, "Ular": 0}
		for k in int(t.get("start_resources", 0)):
			res[ELS[k % 4]] += 1
		var pouch := []
		for tok in t.get("pouch", []):
			var sp: Dictionary = species[tok.species]
			pouch.append({"tok": tok, "sp": sp, "state": "pouch", "cost": DyaToken.cost_vec(tok, sp),
				"paid": {"Fti": 0, "Su": 0, "Eldi": 0, "Ular": 0}, "extra_paid": 0, "deaths": 0, "x": 0.0, "y": 0.0})
		teams.append({
			"idx": i, "name": t.get("name", "Player %d" % (i + 1)), "controller": t.get("controller", "human"),
			"ai_skill": float(t.get("ai_skill", 0.6)), "hoard": HOARDS[i], "resources": res, "pouch": pouch,
			"stats": {"played": [], "eliminations": 0, "earned": 0, "relic_method": ""},
			"ai": {"next_think": 2.0 + i + float(t.get("ai_warmup", 0.0)), "focus": -1},
			"ai_rng": DyaRng.new(seed_value ^ ((i + 1) * 0x9E3779B9)),
		})
	if mode == "standard":
		for i in teams.size():
			var h: Vector2 = teams[i].hoard
			relics.append({"owner": i, "x": h.x, "y": h.y - 26.0, "home_x": h.x, "home_y": h.y - 26.0,
				"carrier": -1, "carrier_team": -1, "captured": false, "captured_by": -1})
		next_pulse_at = float(rng.pick(DyaEconomy.PULSE_INTERVALS)) if settings.chaos_interval else float(settings.pulse_interval)

# ---------------------------------------------------------------- inputs

## Inputs (all plain dictionaries so they serialise into the log):
##   {type="pay", i, el}        rub one jewel: spend one resource toward pouch token i
##   {type="throw", i, x, y}    the coin lands on the field (it may be unpaid)
##   {type="recall", i}         walk out and pick the coin back up
##   {type="spawn", i}          laser-point and press: a thrown, fully paid token comes alive
##   {type="concede"}
## Sandbox only:
##   {type="sb_place", i, team, x, y} {type="sb_move", id, x, y} {type="sb_hold", id, on} {type="sb_remove", id}
func queue_input(team: int, input: Dictionary) -> void:
	if is_replay or over:
		return
	seq_counter += 1
	input = input.duplicate()
	for k in ["x", "y"]:
		if input.has(k):
			input[k] = roundf(float(input[k])) # whole units keep saved logs exact
	input_queue.append({"tick": tick + 1, "team": team, "input": input, "seq": seq_counter})

func entry_paid(e: Dictionary) -> bool:
	for el in ELS:
		if e.paid[el] < e.cost[el]:
			return false
	return e.extra_paid >= e.deaths

func entry_due(e: Dictionary) -> int:
	var n: int = e.deaths - e.extra_paid
	for el in ELS:
		n += e.cost[el] - e.paid[el]
	return n

func clamp_throw(team: int, sp: Dictionary, x: float, y: float) -> Vector2:
	var p := Vector2(clampf(x, 20.0, W - 20.0), clampf(y, 20.0, H - 20.0))
	var own: Vector2 = teams[team].hoard
	var reach := float(sp.get("throw_reach", 650))
	if p.distance_to(own) > reach:
		p = own + (p - own).normalized() * reach
	for t in teams:
		if t.idx == team:
			continue
		var eh: Vector2 = t.hoard
		if p.distance_to(eh) < HOARD_KEEPOUT:
			var dir := (p - eh).normalized() if p.distance_to(eh) > 0.001 else Vector2(-1, 0)
			p = eh + dir * HOARD_KEEPOUT
	return p

func _apply_input(team: int, input: Dictionary) -> void:
	var T: Dictionary = teams[team]
	var type: String = input.get("type", "")
	if type == "concede":
		_finish(1 - team, "concede")
		return
	if type.begins_with("sb_"):
		_apply_sandbox(team, input)
		return
	var i := int(input.get("i", -1))
	if i < 0 or i >= T.pouch.size():
		return
	var e: Dictionary = T.pouch[i]
	match type:
		"pay":
			if e.state == "field":
				return
			var el: String = input.get("el", "")
			if not ELS.has(el) or T.resources[el] <= 0:
				_ev("deny", {"team": team, "i": i, "why": "no_resource"})
				return
			if e.paid[el] < e.cost[el]:
				e.paid[el] += 1
			elif e.extra_paid < e.deaths:
				e.extra_paid += 1 # additional cost after a defeat: any resource
			else:
				_ev("deny", {"team": team, "i": i, "why": "not_needed"})
				return
			T.resources[el] -= 1
			_ev("pay", {"team": team, "i": i, "el": el, "done": entry_paid(e)})
		"throw":
			if e.state != "pouch":
				return
			var p := clamp_throw(team, e.sp, float(input.get("x", 0.0)), float(input.get("y", 0.0)))
			e.state = "thrown"
			e.x = p.x
			e.y = p.y
			_ev("throw", {"team": team, "i": i, "x": p.x, "y": p.y})
		"recall":
			if e.state != "thrown":
				return
			e.state = "pouch"
			_ev("recall", {"team": team, "i": i})
		"spawn":
			if e.state != "thrown":
				return
			if not entry_paid(e):
				_ev("deny", {"team": team, "i": i, "why": "unpaid"})
				return
			e.state = "field"
			T.stats.played.append(e.tok.species)
			var c := spawn_creature(e.tok, e.sp, team, e.x, e.y)
			c.entry = i
			_ev("deploy", {"team": team, "i": i, "id": c.id})

func _apply_sandbox(team: int, input: Dictionary) -> void:
	if mode != "sandbox":
		return
	match input.type:
		"sb_place":
			var side := int(input.get("team", team))
			var T: Dictionary = teams[side]
			var i := int(input.i)
			if i < 0 or i >= T.pouch.size() or T.pouch[i].state == "field":
				return
			var e: Dictionary = T.pouch[i]
			e.state = "field"
			var c := spawn_creature(e.tok, e.sp, side, float(input.x), float(input.y))
			c.entry = i
			_ev("deploy", {"team": side, "i": i, "id": c.id})
		"sb_move":
			var c = creature_by_id(int(input.id))
			if c != null:
				c.x = float(input.x)
				c.y = float(input.y)
				c.intent = {}
		"sb_hold":
			var c = creature_by_id(int(input.id))
			if c != null:
				c.held = bool(input.on)
		"sb_remove":
			var c = creature_by_id(int(input.id))
			if c != null:
				c.dead = true
				c.dead_tick = tick
				c.removed = true
				if c.entry >= 0:
					teams[c.team].pouch[c.entry].state = "pouch"
				_ev("remove", {"id": c.id})

# ---------------------------------------------------------------- stepping

## Advance by real time. Presentation calls this every frame.
func step(dt: float) -> void:
	if over or paused:
		return
	_acc += min(dt, 0.25)
	while _acc >= TICK:
		_acc -= TICK
		do_tick()
		if over:
			break

func do_tick() -> void:
	if over:
		return
	tick += 1
	time = tick * TICK

	if not input_queue.is_empty():
		var due := []
		var keep := []
		for q in input_queue:
			if q.tick <= tick:
				due.append(q)
			else:
				keep.append(q)
		input_queue = keep
		due.sort_custom(func(a, b):
			if a.tick != b.tick: return a.tick < b.tick
			if a.team != b.team: return a.team < b.team
			return a.seq < b.seq)
		for q in due:
			log.append({"t": tick, "team": q.team, "i": q.input})
			_apply_input(q.team, q.input)
			if over:
				return
	if is_replay:
		while replay_ptr < replay_log.size() and int(replay_log[replay_ptr].t) <= tick:
			var r: Dictionary = replay_log[replay_ptr]
			replay_ptr += 1
			_apply_input(int(r.team), r.i)
			if over:
				return

	if mode == "standard" and time >= next_pulse_at:
		_do_pulse()

	if mode == "standard" and not is_replay:
		for T in teams:
			if T.controller == "ai":
				MatchAI.think(self, T)

	for c in creatures:
		if c.dead or c.held:
			continue
		if c.stunned_until > tick:
			c.state = "hurt"
			if c.carrying_relic:
				_drop_relic(c, "stun")
			continue
		if (tick + c.id) % 6 == 0:
			c.intent = {}
			MatchBehaviors.think(self, c)
		_exec_intent(c)

	_step_projectiles()
	_step_zones()
	_step_misc()
	_check_end()

func _do_pulse() -> void:
	pulse_index += 1
	var esc := DyaEconomy.escalation_mult(time)
	if esc != last_esc:
		last_esc = esc
		_ev("escalation", {"mult": esc})
	var interval: int = settings.pulse_interval
	var amount: int = settings.pulse_amount
	if settings.chaos_interval:
		interval = rng.pick(DyaEconomy.PULSE_INTERVALS)
	if settings.chaos_amount:
		amount = rng.pick(DyaEconomy.PULSE_AMOUNTS)
	next_pulse_at = time + interval
	# Both players always get the same number, but not always the same types.
	var n := amount * esc
	var gained := []
	for T in teams:
		var units := []
		for k in n:
			units.append(rng.pick(ELS))
		for el in units:
			T.resources[el] += 1
		T.stats.earned += units.size()
		gained.append(units)
	last_pulse = {"index": pulse_index, "amount": n, "esc": esc}
	_ev("pulse", {"index": pulse_index, "units": gained, "esc": esc})
	# Naga growth on pulse-count milestones (2D July update).
	var grow_every := 3 if interval >= 4 else (4 if interval == 3 else (5 if interval == 2 else 6))
	for c in creatures:
		if c.dead or not c.naga:
			continue
		c.growth_pulses += 1
		if c.growth_pulses >= grow_every:
			c.growth_pulses = 0
			if c.heads_left < c.head_count:
				c.heads_left += 1
				c.hp = min(c.max_hp, c.hp + c.max_hp * 0.12)
				_ev("head", {"id": c.id, "heads": c.heads_left})
			elif c.head_count < 5:
				c.head_count += 1
				c.heads_left += 1
				c.max_hp = roundf(c.max_hp * 1.08)
				c.hp = min(c.max_hp, c.hp + c.max_hp * 0.1)
				_ev("head", {"id": c.id, "heads": c.heads_left})

# ---------------------------------------------------------------- creatures

func spawn_creature(tok: Dictionary, sp: Dictionary, team: int, x: float, y: float) -> Dictionary:
	var size_idx: int = tok.size_idx
	var tags: Array = sp.get("tags", [])
	var heads := int(tok.picks.get("headCount", 1))
	var flyer := tags.has("flyer")
	var c := {
		"id": id_counter, "tok": tok, "sp": sp, "species": sp.id, "name": tok.name, "team": team,
		"x": x, "y": y, "z": CRUISE_Z if flyer else 0.0, "facing": Vector2(1 if team == 0 else -1, 0),
		"size_idx": size_idx, "radius": float(DyaEconomy.SIZE_RADIUS[size_idx]),
		"max_hp": float(tok.stats.hp), "hp": float(tok.stats.hp), "dmg": float(tok.stats.dmg),
		"speed": float(tok.stats.speed), "attack_range": float(sp.get("attack_range", 20)),
		"attack_cd": 0.0, "state": "idle", "vars": tok.vars, "picks": tok.picks, "mem": {},
		"energy": int(tok.behavior_value), "age": float(tok.age),
		"dead": false, "dead_tick": 0, "removed": false, "held": false, "spawn_tick": tick,
		"stunned_until": 0, "carrying_relic": false, "last_attacker": -1, "last_hit_tick": -9999,
		"flyer": flyer, "naga": tags.has("naga"), "sentient": tags.has("sentient"), "tags": tags,
		"head_count": heads, "heads_left": heads, "growth_pulses": 0,
		"tether_tol": float(sp.get("tether", 120)), "tether_frac": 0.0,
		"slow_until": 0, "entry": -1, "intent": {},
	}
	id_counter += 1
	creatures.append(c)
	return c

func creature_by_id(id: int):
	for c in creatures:
		if c.id == id and not c.dead:
			return c
	return null

func dist(a: Dictionary, b: Dictionary) -> float:
	return Vector2(a.x, a.y).distance_to(Vector2(b.x, b.y))

func hostile(c: Dictionary, o: Dictionary) -> bool:
	return c.team != o.team

## Nearest living enemy within `range_u` that passes `pred` (optional).
func nearest_enemy(c: Dictionary, range_u: float, pred: Callable = Callable()):
	var best = null
	var bd := range_u
	for o in creatures:
		if o.dead or o.team == c.team:
			continue
		if pred.is_valid() and not pred.call(o):
			continue
		var d := dist(c, o)
		if d < bd:
			bd = d
			best = o
	return best

func enemies_of(team: int) -> Array:
	var out := []
	for o in creatures:
		if not o.dead and o.team != team:
			out.append(o)
	return out

func allies_of(team: int) -> Array:
	var out := []
	for o in creatures:
		if not o.dead and o.team == team:
			out.append(o)
	return out

func _exec_intent(c: Dictionary) -> void:
	var it: Dictionary = c.intent
	if c.attack_cd > 0.0:
		c.attack_cd -= TICK
	var target = it.get("attack")
	if target != null and target.dead:
		target = null
	# altitude: flyers cruise unless the brain asks for another height
	if c.flyer:
		var want_z: float = it.get("z", CRUISE_Z)
		var rate: float = 140.0 * float(it.get("z_rate", 1.0)) * TICK
		c.z = move_toward(c.z, want_z, rate)
	var move = it.get("move")
	if target != null:
		var d := dist(c, target)
		var reach: float = c.attack_range + c.radius + target.radius
		var dz: float = abs(c.z - target.z)
		var can_reach_z: bool = dz <= MELEE_Z + c.radius or bool(it.get("ranged", false))
		if d <= reach and can_reach_z:
			c.state = "attack"
			_face(c, target.x - c.x, target.y - c.y)
			if c.attack_cd <= 0.0:
				c.attack_cd = float(it.get("cd", 1.0))
				if it.get("ranged", false):
					projectiles.append({"id": id_counter, "x": c.x, "y": c.y, "z": c.z + c.radius, "target": target.id,
						"team": c.team, "src": c.id, "dmg": c.dmg * float(it.get("dmg_mul", 1.0)), "speed": 320.0, "kind": it.get("proj", "arrow")})
					id_counter += 1
					_ev("shoot", {"id": c.id, "target": target.id})
				else:
					damage(target, c.dmg * float(it.get("dmg_mul", 1.0)), c)
					_ev("attack", {"id": c.id, "target": target.id})
			move = null
			if it.has("kite"):
				move = it.kite
		elif move == null:
			move = {"x": target.x, "y": target.y, "run": true}
	if move != null and c.speed > 0.0:
		var sp: float = c.speed * (1.45 if move.get("run", false) else 1.0) * float(move.get("mul", 1.0))
		if c.carrying_relic:
			sp *= 0.45
		if c.slow_until > tick:
			sp *= 0.45
		var dx: float = move.x - c.x
		var dy: float = move.y - c.y
		var d2 := sqrt(dx * dx + dy * dy)
		if d2 > 3.0:
			c.x += dx / d2 * sp * TICK
			c.y += dy / d2 * sp * TICK
			_face(c, dx, dy)
			if target == null or c.state != "attack":
				c.state = "run" if move.get("run", false) else "walk"
		elif target == null:
			c.state = "idle"
	elif target == null:
		c.state = it.get("state", "idle")

func _face(c: Dictionary, dx: float, dy: float) -> void:
	if abs(dx) + abs(dy) > 0.001:
		c.facing = Vector2(dx, dy).normalized()

func damage(t: Dictionary, amount: float, source, opts: Dictionary = {}) -> void:
	if t.dead or amount <= 0.0:
		return
	if t.species == "tonguatjis":
		amount /= float(t.vars.get("shellDurability", 1.0))
	if t.naga:
		# The first head is near-invincible: once the others are gone, blows land soft.
		if t.heads_left <= 1:
			amount *= 0.4
	t.hp -= amount
	last_combat_tick = tick
	t.last_hit_tick = tick
	if source != null:
		t.last_attacker = source.id
	if t.naga and t.heads_left > 1:
		var per: float = t.max_hp / float(t.head_count)
		var should: int = max(1, ceili(t.hp / per))
		if should < t.heads_left:
			t.heads_left = should
			_ev("head", {"id": t.id, "heads": t.heads_left})
	_ev("hit", {"id": t.id, "amount": amount, "src": source.id if source != null else -1})
	if t.hp <= 0.0:
		kill(t, source, opts.get("cause", "combat"))

func kill(c: Dictionary, source, cause: String) -> void:
	if c.dead:
		return
	c.dead = true
	c.dead_tick = tick
	c.state = "death"
	if source != null and source.team != c.team:
		teams[source.team].stats.eliminations += 1
		# feeding: a predator eats what it kills
		if not source.dead and cause == "combat" and source.tags.has("carnivore"):
			source.hp = min(source.max_hp, source.hp + min(source.max_hp * 0.25, c.max_hp * 0.12))
			if source.naga:
				source.growth_pulses += 2
	_drop_relic(c, "death")
	# A defeated token returns to the pouch; playing it again costs +1 per defeat.
	if mode == "standard" and c.entry >= 0:
		var e: Dictionary = teams[c.team].pouch[c.entry]
		e.state = "pouch"
		e.deaths += 1
		e.extra_paid = 0
		e.paid = {"Fti": 0, "Su": 0, "Eldi": 0, "Ular": 0}
	_ev("death", {"id": c.id, "cause": cause, "team": c.team, "i": c.entry})

func stun(c: Dictionary, seconds: float) -> void:
	c.stunned_until = max(c.stunned_until, tick + roundi(seconds / TICK))

func knockback(c: Dictionary, from_x: float, from_y: float, amount: float) -> void:
	var v := Vector2(c.x - from_x, c.y - from_y)
	if v.length() < 0.001:
		v = Vector2(1, 0)
	v = v.normalized() * amount
	c.x += v.x
	c.y += v.y

func add_zone(kind: String, team: int, x: float, y: float, r: float, seconds: float, potency: float) -> void:
	zones.append({"id": id_counter, "kind": kind, "team": team, "x": x, "y": y, "r": r, "until": tick + roundi(seconds / TICK), "potency": potency})
	id_counter += 1
	_ev("zone", {"kind": kind, "x": x, "y": y, "r": r})

func _step_projectiles() -> void:
	var keep := []
	for p in projectiles:
		var t = creature_by_id(p.target)
		if t == null:
			continue
		var to := Vector3(t.x - p.x, t.y - p.y, t.z - p.z)
		var d := to.length()
		var stepd: float = p.speed * TICK
		if d <= stepd + t.radius:
			damage(t, p.dmg, creature_by_id(p.src))
			continue
		to = to / d * stepd
		p.x += to.x
		p.y += to.y
		p.z += to.z
		keep.append(p)
	projectiles = keep

func _step_zones() -> void:
	if zones.is_empty():
		return
	var keep := []
	for z in zones:
		if z.until <= tick:
			continue
		keep.append(z)
		if z.kind == "bog":
			for c in creatures:
				if c.dead or c.team == z.team or c.flyer and c.z > MELEE_Z:
					continue
				if Vector2(c.x, c.y).distance_to(Vector2(z.x, z.y)) < z.r:
					c.slow_until = tick + 10
					if tick % 20 == 0:
						damage(c, z.potency * 0.25, null, {"cause": "bog"})
	zones = keep

func tether_out(x: float, y: float) -> float:
	var dx: float = max(0.0, max(-x, x - W))
	var dy: float = max(0.0, max(-y, y - H))
	return sqrt(dx * dx + dy * dy)

func _step_misc() -> void:
	# Tether: the border is the arena edge on the ground. Each creature has its own
	# tolerance and dissolves if it strays too far beyond it.
	for c in creatures:
		if c.dead:
			continue
		c.tether_frac = tether_out(c.x, c.y) / max(1.0, c.tether_tol)
		if c.tether_frac >= 1.0:
			kill(c, null, "tether")
	if mode != "standard":
		return
	for rl in relics:
		if rl.captured:
			continue
		if rl.carrier >= 0:
			var car = creature_by_id(rl.carrier)
			if car == null:
				rl.carrier = -1
				rl.carrier_team = -1
				continue
			rl.x = car.x
			rl.y = car.y
			var home: Vector2 = teams[car.team].hoard
			if Vector2(car.x, car.y).distance_to(home) < HOARD_R:
				rl.captured = true
				rl.captured_by = car.team
				rl.carrier = -1
				car.carrying_relic = false
				teams[car.team].stats.relic_method = "Carried home by " + car.name
				_ev("relic_captured", {"team": car.team, "id": car.id})
		else:
			# defensive recovery: a dropped Relic goes home when its own side reaches it
			if Vector2(rl.x, rl.y).distance_to(Vector2(rl.home_x, rl.home_y)) > 1.0:
				for c in creatures:
					if c.dead or c.team != rl.owner or c.z > MELEE_Z:
						continue
					if Vector2(c.x, c.y).distance_to(Vector2(rl.x, rl.y)) < RELIC_PICK_R + c.radius:
						rl.x = rl.home_x
						rl.y = rl.home_y
						_ev("relic_returned", {"team": rl.owner})
						break

func enemy_relic(team: int):
	for rl in relics:
		if rl.owner != team:
			return rl
	return null

func own_relic(team: int):
	for rl in relics:
		if rl.owner == team:
			return rl
	return null

func pick_relic(c: Dictionary) -> bool:
	var rl = enemy_relic(c.team)
	if rl == null or rl.captured or rl.carrier >= 0 or c.carrying_relic:
		return false
	if Vector2(c.x, c.y).distance_to(Vector2(rl.x, rl.y)) > RELIC_PICK_R + c.radius:
		return false
	rl.carrier = c.id
	rl.carrier_team = c.team
	c.carrying_relic = true
	_ev("relic_taken", {"team": c.team, "id": c.id})
	return true

func _drop_relic(c: Dictionary, cause: String) -> void:
	if not c.carrying_relic:
		return
	c.carrying_relic = false
	for rl in relics:
		if rl.carrier == c.id:
			rl.carrier = -1
			rl.carrier_team = -1
			rl.x = c.x
			rl.y = c.y
			_ev("relic_dropped", {"team": c.team, "cause": cause})

func _check_end() -> void:
	if over or mode != "standard":
		return
	for rl in relics:
		if rl.captured:
			_finish(rl.captured_by, "relic")
			return
	# draw: every token is on the field and nothing has fought for five minutes
	var all_out := true
	for T in teams:
		for e in T.pouch:
			if e.state != "field":
				all_out = false
	if all_out and (tick - last_combat_tick) > roundi(300.0 / TICK):
		_finish(-1, "draw")
		return
	var cap := float(cfg.get("time_limit", 0.0))
	if cap > 0.0 and time >= cap:
		_finish(-1, "time")

func _finish(winner: int, how: String) -> void:
	if over:
		return
	over = true
	result = {"winner": winner, "how": how, "tick": tick, "time": time}
	_ev("end", result.duplicate())

func _ev(kind: String, data: Dictionary = {}) -> void:
	if cfg.get("quiet", false):
		return
	data["kind"] = kind
	data["t"] = tick
	events.append(data)

# ---------------------------------------------------------------- replay

## A hash of everything the rules care about. Two runs of the same match must
## agree on this at every tick.
func state_hash() -> int:
	var a := PackedFloat64Array()
	a.append(tick)
	a.append(rng.a)
	a.append(pulse_index)
	a.append(next_pulse_at)
	for T in teams:
		for el in ELS:
			a.append(T.resources[el])
		for e in T.pouch:
			a.append(e.state.hash())
			a.append(e.deaths)
			a.append(e.extra_paid)
			for el in ELS:
				a.append(e.paid[el])
			a.append(e.x)
			a.append(e.y)
	for c in creatures:
		a.append(c.id); a.append(c.x); a.append(c.y); a.append(c.z); a.append(c.hp)
		a.append(1.0 if c.dead else 0.0); a.append(c.attack_cd); a.append(c.stunned_until); a.append(c.heads_left)
	for rl in relics:
		a.append(rl.x); a.append(rl.y); a.append(rl.carrier); a.append(1.0 if rl.captured else 0.0)
	for p in projectiles:
		a.append(p.x); a.append(p.y); a.append(p.z)
	a.append(1.0 if over else 0.0)
	return hash(a.to_byte_array())

func serialize_replay() -> Dictionary:
	var tc := []
	for T in teams:
		var toks := []
		for e in T.pouch:
			toks.append(e.tok)
		tc.append({"name": T.name, "controller": T.controller, "ai_skill": T.ai_skill, "pouch": toks})  # warm-up needs no saving: AI inputs are in the log
	return {"version": 1, "mode": mode, "seed": seed_value, "settings": settings.duplicate(), "teams": tc,
		"time_limit": cfg.get("time_limit", 0.0), "terrain": cfg.get("terrain", "plains"),
		"log": log.duplicate(true), "final_tick": tick, "final_hash": state_hash(), "result": result.duplicate()}

static func from_replay(rep: Dictionary, species_db: Dictionary) -> MatchSim:
	var c := {"mode": rep.get("mode", "standard"), "seed": int(rep.seed), "settings": rep.settings, "teams": rep.teams,
		"time_limit": rep.get("time_limit", 0.0), "terrain": rep.get("terrain", "plains"), "replay_log": rep.log}
	return MatchSim.new(c, species_db)

## Run a replay to its end without rendering. Returns the final state hash.
func run_to_end(final_tick: int) -> int:
	while not over and tick < final_tick:
		do_tick()
	return state_hash()
