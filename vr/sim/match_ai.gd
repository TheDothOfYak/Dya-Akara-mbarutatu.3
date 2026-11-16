class_name MatchAI
extends RefCounted
## The AI opponent. It plays through the same inputs as a person (pay, throw,
## spawn), so its moves land in the input log and replay exactly. Ported from
## aiThink in the 2D engine, reshaped for the VR flow: pay in pieces, throw,
## then spawn at any time.

static func think(sim: MatchSim, T: Dictionary) -> void:
	if sim.time < T.ai.next_think:
		return
	var skill: float = T.ai_skill
	var rng: DyaRng = T.ai_rng
	var team: int = T.idx
	var own: Vector2 = T.hoard
	var enemy: Vector2 = sim.teams[1 - team].hoard
	var mine := sim.allies_of(team)
	var foes := sim.enemies_of(team)
	var my_relic = sim.own_relic(team)
	var their_relic = sim.enemy_relic(team)
	var thief = null
	if my_relic != null and my_relic.carrier >= 0:
		thief = sim.creature_by_id(my_relic.carrier)
	var my_carrier = null
	if their_relic != null and their_relic.carrier >= 0:
		my_carrier = sim.creature_by_id(their_relic.carrier)
	var relic_free: bool = their_relic != null and their_relic.carrier < 0 and not their_relic.captured
	var relic_dropped: bool = my_relic != null and my_relic.carrier < 0 and Vector2(my_relic.x, my_relic.y).distance_to(Vector2(my_relic.home_x, my_relic.home_y)) > 40.0
	var threats := []
	for c in foes:
		if Vector2(c.x, c.y).distance_to(own) < 360.0:
			threats.append(c)
	var guards := 0
	for c in mine:
		if Vector2(c.x, c.y).distance_to(own) < 360.0:
			guards += 1
	var relic_guards := 0
	if their_relic != null:
		for c in foes:
			if Vector2(c.x, c.y).distance_to(Vector2(their_relic.home_x, their_relic.home_y)) < 260.0:
				relic_guards += 1
	var urgent: bool = thief != null or threats.size() > guards
	var base: float = lerpf(6.0, 1.6, min(1.0, skill)) + rng.range_f(0.0, 2.0)
	T.ai.next_think = sim.time + (base * 0.45 if urgent else base)
	var jit: float = lerpf(150.0, 45.0, min(1.0, skill))

	# 1. bring every thrown, fully paid coin to life
	for i in T.pouch.size():
		var e: Dictionary = T.pouch[i]
		if e.state == "thrown" and sim.entry_paid(e):
			sim.queue_input(team, {"type": "spawn", "i": i})

	# 2. choose which token to work on
	var focus: int = T.ai.focus
	if focus < 0 or T.pouch[focus].state != "pouch":
		focus = -1
		var bs := -INF
		for i in T.pouch.size():
			var e: Dictionary = T.pouch[i]
			if e.state != "pouch":
				continue
			var sp: Dictionary = e.sp
			var runner: bool = sp.tags.has("sentient")
			var s := rng.range_f(0.0, 1.0) - sim.entry_due(e) * 0.12
			if thief != null: s += float(e.tok.stats.speed) / 30.0
			if relic_free and runner: s += 3.0 if relic_guards <= 1 else 0.5
			if not threats.is_empty() and (sp.tags.has("apex") or float(sp.stat_mul.dmg) >= 1.3): s += 1.6
			if e.deaths > 1: s -= e.deaths * 0.6
			if s > bs:
				bs = s
				focus = i
		T.ai.focus = focus
	if focus < 0:
		return

	# 3. rub the jewels: pay what it can, in pieces
	var e: Dictionary = T.pouch[focus]
	var have: Dictionary = T.resources.duplicate()
	var due := 0
	for el in MatchSim.ELS:
		var need: int = e.cost[el] - e.paid[el]
		var n: int = min(need, have[el])
		for k in n:
			sim.queue_input(team, {"type": "pay", "i": focus, "el": el})
		have[el] -= n
		due += need - n
	var extra: int = e.deaths - e.extra_paid
	while extra > 0 and due == 0:
		var best := ""
		for el in MatchSim.ELS:
			if have[el] > 0 and (best == "" or have[el] > have[best]):
				best = el
		if best == "":
			break
		sim.queue_input(team, {"type": "pay", "i": focus, "el": best})
		have[best] -= 1
		extra -= 1
	if due > 0 or extra > 0:
		return

	# 4. fully paid: throw it where it matters (it spawns on the next think)
	var sp: Dictionary = e.sp
	var p: Vector2
	if thief != null and rng.chance(0.45 + skill * 0.45):
		var lead: float = lerpf(0.15, 0.45, min(1.0, skill))
		p = Vector2(thief.x + (enemy.x - thief.x) * lead, thief.y + (enemy.y - thief.y) * lead) + Vector2(rng.range_f(-jit, jit), rng.range_f(-jit, jit)) * 0.5
	elif relic_dropped and rng.chance(0.35 + skill * 0.4):
		p = Vector2(my_relic.x + rng.range_f(-50, 50), my_relic.y + rng.range_f(-50, 50))
	elif threats.size() > guards:
		var t2: Dictionary = rng.pick(threats)
		p = Vector2(own.x + (t2.x - own.x) * 0.5, own.y + (t2.y - own.y) * 0.5) + Vector2(rng.range_f(-jit, jit), rng.range_f(-jit, jit)) * 0.6
	elif my_carrier != null and rng.chance(skill * 0.75):
		p = Vector2(my_carrier.x + (own.x - my_carrier.x) * 0.3 + rng.range_f(-70, 70), my_carrier.y + (own.y - my_carrier.y) * 0.3 + rng.range_f(-70, 70))
	elif relic_free and sp.tags.has("sentient"):
		p = Vector2(their_relic.x, their_relic.y) + Vector2(rng.range_f(-jit, jit), rng.range_f(-jit, jit))
	else:
		var f: float = lerpf(0.25, 0.5, min(1.0, skill)) + rng.range_f(-0.08, 0.12)
		p = own + (enemy - own) * f + Vector2(rng.range_f(-jit, jit), rng.range_f(-jit * 2.0, jit * 2.0))
	sim.queue_input(team, {"type": "throw", "i": focus, "x": p.x, "y": p.y})
	T.ai.focus = -1
