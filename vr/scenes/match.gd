extends Node3D
## The match, played with your hands.
##
## Setup: turn the rings on your horde token to vote, then tap it against your
## opponent's token to link. The terrain hologram, both hordes, the ground-edge
## outline and the Relics appear.
## Play: rummage in the pouch on your hip, rub a token's jewels to pay in
## pieces, throw the coin onto the field, then hold grip + trigger for the
## laser, point at the coin and press A to bring the creature to life.
##
## Game.match_request (all optional):
##   seed, terrain, opponent {name, pouch, ai_skill, votes}, pouch (your tokens),
##   tournament {votes, terrain}, wager {...}, return_to (scene path), auto_link

const MATCH_SCENE := "res://scenes/match.tscn"

var req: Dictionary
var rig: XRRig
var sim: MatchSim = null
var arena: ArenaView = null
var pouch: PouchView
var phase := "setup"
var my_token: HordeToken
var their_token: HordeToken
var opponent_fig: Node3D
var hint: Label3D
var table: Node3D
var coins := {}        # pouch index -> TokenCoin (your tokens that are out of the pouch)
var enemy_coins := {}  # pouch index -> Node3D
var where := {}        # pouch index -> "pouch" | "hand" | "table" | "flying" | "field" | "alive"
var table_slots := {}
var result_panel: Node3D = null
var votes := {}
var my_pouch: Array
var bot = null

func _ready() -> void:
	req = Game.match_request.duplicate()
	if not req.has("seed"):
		req["seed"] = int(Game.args.get("seed", str(randi() % 1000000 + 1)))
	if not req.has("pouch"):
		req["pouch"] = Starter.make_pouch(int(req.seed) * 7 + 1, 12)
	if not req.has("opponent"):
		req["opponent"] = {"name": "Practice opponent", "pouch": Starter.make_pouch(int(req.seed) * 7 + 2, 12), "ai_skill": 0.6, "votes": {}}
	my_pouch = req.pouch
	add_child(WorldBuilder.sky_environment(Color(0.5, 0.66, 0.88), Color(0.32, 0.38, 0.32)))
	add_child(WorldBuilder.sun())
	add_child(WorldBuilder.ground(600.0, Color(0.3, 0.36, 0.3)))
	rig = XRRig.new()
	add_child(rig)
	rig.place(Vector3.ZERO, 0.0)
	Game.sfx.music("match")
	_build_setup()
	if Game.args.has("autoplay"):
		bot = load("res://tools/match_bot.gd").new()
		bot.scene = self
		add_child(bot)
	Shots.maybe(self)

# ---------------------------------------------------------------- setup

func _build_setup() -> void:
	var f := rig.head_forward()
	var right := f.cross(Vector3.UP)
	var base := Vector3(0, rig.global_position.y, 0)
	# the opponent stands facing you, holding their horde token out
	opponent_fig = Node3D.new()
	opponent_fig.position = base + f * 1.5
	add_child(opponent_fig)
	WorldBuilder.cyl(0.2, 1.3, Vector3(0, 0.65, 0), Color(0.5, 0.35, 0.3), opponent_fig)
	WorldBuilder.ball(0.13, Vector3(0, 1.48, 0), Color(0.8, 0.65, 0.5), opponent_fig)
	WorldBuilder.label(str(req.opponent.name), Vector3(0, 1.8, 0), 0.003, opponent_fig)
	their_token = HordeToken.new()
	their_token.color = Color(0.7, 0.36, 0.36)
	add_child(their_token)
	their_token.global_position = base + f * 0.95 + Vector3(0, 1.15, 0)
	their_token.locked = true
	their_token.remove_from_group("grabbable")
	their_token.set_votes(req.opponent.get("votes", {}))
	my_token = HordeToken.new()
	add_child(my_token)
	my_token.global_position = base + f * 0.45 + right * 0.12 + Vector3(0, 1.05, 0)
	if req.has("tournament"):
		# a tournament sets the scale and settings; this replaces the vote
		my_token.set_votes(req.tournament.get("votes", {}))
		their_token.set_votes(req.tournament.get("votes", {}))
		my_token.locked = true
	hint = WorldBuilder.label("", base + f * 1.0 + Vector3(0, 1.72, 0), 0.0009, self)
	hint.text = "Turn the rings on your horde token to vote.\nTap it against your opponent's token to link."
	if req.has("wager"):
		hint.text += "\nWager: " + str(req.wager.get("text", ""))

func _physics_process(_delta: float) -> void:
	if phase == "setup":
		if my_token.global_position.distance_to(their_token.global_position) < 0.1 or req.get("auto_link", false):
			_link()

func _link() -> void:
	phase = "linking"
	votes = DyaEconomy.combine_votes(my_token.votes(), their_token.votes())
	Game.sfx.play("link", my_token.global_position, true)
	rig.left.rumble(0.6, 0.25)
	rig.right.rumble(0.6, 0.25)
	for h in [rig.left, rig.right]:
		if h.held == my_token:
			h.held = null
	var terrain: String = req.get("tournament", {}).get("terrain", req.get("terrain", "plains"))
	var cfg := {"seed": int(req.seed), "terrain": terrain,
		"settings": {"pulse_interval": votes.pulse_interval, "pulse_amount": votes.pulse_amount,
			"chaos_interval": votes.chaos_interval, "chaos_amount": votes.chaos_amount, "scale": votes.scale},
		"teams": [
			{"name": "You", "controller": "human", "pouch": my_pouch},
			{"name": req.opponent.name, "controller": "ai", "ai_skill": req.opponent.get("ai_skill", 0.6),
				"ai_warmup": req.opponent.get("ai_warmup", 20.0), "pouch": req.opponent.pouch}]}
	sim = MatchSim.new(cfg, SpeciesDB.all())
	# The magic settles the field around the fixed horde spots: yours lands just in front of you.
	var f := rig.head_forward()
	var scale: float = votes.scale
	var small := MatchSim.W * scale <= 5.0
	var floor_h := rig.global_position.y + (0.78 if small else 0.0)
	var head := rig.head_pos()
	var origin := Vector3(head.x, floor_h, head.z) + f * (0.5 if small else 1.2)
	arena = ArenaView.new()
	add_child(arena)
	arena.setup(sim, origin, f, scale, MatchSim.HOARDS[0], terrain)
	arena.show_edge()
	if small:
		# a plain stand under a table-sized field
		var c := arena.to_world(MatchSim.W * 0.5, MatchSim.H * 0.5)
		var stand := WorldBuilder.box(Vector3(MatchSim.W * scale * 1.1, 0.04, MatchSim.H * scale * 1.15), c - Vector3(0, 0.03, 0), Color(0.35, 0.27, 0.2), self)
		stand.rotation.y = atan2(-f.z, f.x)
		WorldBuilder.cyl(0.05, floor_h - rig.global_position.y, Vector3(c.x, rig.global_position.y + (floor_h - rig.global_position.y) * 0.5, c.z), Color(0.3, 0.23, 0.17), self)
	my_token.visible = false
	their_token.visible = false
	my_token.remove_from_group("grabbable")
	opponent_fig.global_position = arena.to_world(MatchSim.HOARDS[1].x + 90.0, MatchSim.HOARDS[1].y)
	opponent_fig.global_position.y = rig.global_position.y
	opponent_fig.visible = not small
	_build_table(f)
	pouch = PouchView.new()
	add_child(pouch)
	pouch.attach(rig)
	pouch.make_coin = _coin_from_pouch
	pouch.feel = func(i): return float(my_pouch[i].size_idx) / 4.0
	pouch.dump_all.connect(_dump_all)
	var all := []
	for i in my_pouch.size():
		all.append(i)
		where[i] = "pouch"
	pouch.set_contents(all)
	hint.text = "Pouch on your hip: grip to pull a token.\nRub its jewels (thumbstick, or touch with the other hand) to pay.\nThrow it, then hold grip + trigger, point and press A."
	hint.pixel_size = 0.0007
	hint.global_position = table.to_global(Vector3(0, 1.15, 0))
	get_tree().create_timer(60.0).timeout.connect(func(): hint.visible = false)
	if req.has("card"):
		_show_cards()
	phase = "play"

func _build_table(f: Vector3) -> void:
	# A table behind your horde, for tokens you have pulled out or readied but not thrown.
	var right := f.cross(Vector3.UP)
	var side := 1.0 if Game.settings.left_handed else -1.0
	table = Node3D.new()
	add_child(table)
	var head := rig.head_pos()
	table.global_position = Vector3(head.x, rig.global_position.y, head.z) + right * 0.55 * side - f * 0.1
	table.rotation.y = atan2(-f.z, f.x) - PI / 2
	WorldBuilder.box(Vector3(0.5, 0.03, 0.4), Vector3(0, 0.8, 0), Color(0.4, 0.3, 0.2), table)
	WorldBuilder.cyl(0.03, 0.8, Vector3(0, 0.4, 0), Color(0.3, 0.22, 0.15), table)

## Tournament cards: each player's details and every creature in their pouch with key info.
## Casual matches have no cards.
func _show_cards() -> void:
	var c: Dictionary = req.card
	var lines := ["%s\n%s · %s · %s · level %d %s" % [req.tournament.get("name", "Tournament"), c.name, c.planet, c.rank, int(c.level), c.get("title", "")]]
	for t in my_pouch:
		lines.append("%s · %s · %s · cost %d" % [t.name, t.element, DyaEconomy.SIZES[t.size_idx], DyaToken.cost_sum(t.cost)])
	var l := WorldBuilder.label("\n".join(lines), table.to_global(Vector3(-0.1, 0.95, 0.15)), 0.00035, self, false)
	l.rotation.y = table.rotation.y
	var o: Dictionary = req.opponent
	var lines2 := ["%s · Xikia · level %d" % [o.name, int(o.get("level", 1))]]
	for t in o.pouch:
		lines2.append("%s · %s · %s · cost %d" % [t.name, t.element, DyaEconomy.SIZES[t.size_idx], DyaToken.cost_sum(t.cost)])
	var l2 := WorldBuilder.label("\n".join(lines2), table.to_global(Vector3(0.18, 0.95, 0.15)), 0.00035, self, false)
	l2.rotation.y = table.rotation.y

# ---------------------------------------------------------------- tokens in your hands

func _new_coin(i: int) -> TokenCoin:
	var e: Dictionary = sim.teams[0].pouch[i]
	var c := TokenCoin.make(e.tok, e.sp, i)
	add_child(c)
	c.set_cost(e.cost, e.paid, e.deaths, e.extra_paid)
	c.grabbed.connect(_coin_grabbed)
	c.let_go.connect(_coin_released)
	c.touched.connect(_coin_touched)
	c.flicked.connect(_coin_flicked)
	c.lasered.connect(_coin_lasered)
	coins[i] = c
	return c

func _coin_from_pouch(i: int) -> Node3D:
	where[i] = "hand"
	return _new_coin(i)

func _dump_all() -> void:
	for i in pouch.contents.duplicate():
		pouch.remove(i)
		var c := _new_coin(i)
		_rest_on_table(c)
	Game.sfx.play("coin", pouch.global_position)

func _rest_on_table(c: TokenCoin) -> void:
	var slot := 0
	while table_slots.has(slot):
		slot += 1
	table_slots[slot] = c.index
	where[c.index] = "table"
	c.mode = "table"
	c.global_transform = Transform3D(Basis(), table.to_global(Vector3(-0.2 + 0.05 * (slot % 9), 0.82, -0.15 + 0.06 * int(slot / 9.0))))

func _free_slot(i: int) -> void:
	for k in table_slots.keys():
		if table_slots[k] == i:
			table_slots.erase(k)

func _coin_grabbed(c: TokenCoin, _hand: Hand) -> void:
	_free_slot(c.index)
	if where.get(c.index) == "field":
		# walked onto the field and picked the coin back up
		sim.queue_input(0, {"type": "recall", "i": c.index})
	where[c.index] = "hand"

func _coin_released(c: TokenCoin, hand: Hand, velocity: Vector3) -> void:
	var i := c.index
	if pouch.contains_point(c.global_position):
		_back_to_pouch(i)
		return
	var near_table := c.global_position.distance_to(table.to_global(Vector3(0, 0.85, 0))) < 0.4
	if velocity.length() > 1.2 and not near_table:
		_throw(c, hand, velocity)
	elif near_table:
		_rest_on_table(c)
	else:
		_back_to_pouch(i) # a token let go of in mid-air drops back into the pouch

func _back_to_pouch(i: int) -> void:
	if coins.has(i):
		coins[i].queue_free()
		coins.erase(i)
	_free_slot(i)
	where[i] = "pouch"
	pouch.put_back(i)

## Physics-based throw with forgiving aim: where the coin would land, carried
## further on big fields so reach scales with the arena.
func predict_landing(from: Vector3, velocity: Vector3, sp: Dictionary) -> Vector2:
	var y0 := arena.floor_y()
	var g := 9.8
	var vy := velocity.y
	var disc: float = vy * vy + 2.0 * g * max(0.0, from.y - y0)
	var t := (vy + sqrt(disc)) / g
	var horiz := Vector3(velocity.x, 0, velocity.z) * t
	var reach_m: float = float(sp.get("throw_reach", 650)) * arena.unit
	var natural := 4.0
	if reach_m > natural:
		horiz *= reach_m / natural
	return arena.to_sim(Vector3(from.x, y0, from.z) + horiz)

func _throw(c: TokenCoin, hand: Hand, velocity: Vector3) -> void:
	var i := c.index
	var land := predict_landing(c.global_position, velocity, c.sp)
	var p := sim.clamp_throw(0, c.sp, land.x, land.y)
	sim.queue_input(0, {"type": "throw", "i": i, "x": p.x, "y": p.y})
	where[i] = "flying"
	hand.rumble(0.5, 0.04) # the click as the coin leaves your hand
	Game.sfx.play("throw", c.global_position)
	var target := arena.to_world(roundf(p.x), roundf(p.y)) + Vector3(0, 0.004, 0)
	var dist := c.global_position.distance_to(target)
	c.fly_to(target, clampf(dist / 9.0, 0.25, 1.4), max(0.15, dist * 0.2), func():
		if where.get(i) == "flying":
			where[i] = "field"
			c.mode = "field"
			c.set_beacon(true, clampf(arena.unit * 60.0, 0.05, 6.0))
			Game.sfx.play("land", target, false, arena.unit * 100.0)
			rig.left.rumble(0.3, 0.06)
			rig.right.rumble(0.3, 0.06))

func _pay(i: int, el: String) -> void:
	sim.queue_input(0, {"type": "pay", "i": i, "el": el})

func _coin_flicked(c: TokenCoin, el: String) -> void:
	_pay(c.index, el)

## A touch from the other hand rubs the next jewel you can afford.
func _coin_touched(c: TokenCoin, _hand: Hand) -> void:
	var e: Dictionary = sim.teams[0].pouch[c.index]
	var res: Dictionary = sim.teams[0].resources
	for el in MatchSim.ELS:
		if e.paid[el] < e.cost[el] and res[el] > 0:
			_pay(c.index, el)
			return
	if e.extra_paid < e.deaths:
		for el in MatchSim.ELS:
			if res[el] > 0:
				_pay(c.index, el)
				return
	_pay(c.index, MatchSim.ELS[0]) # nothing to pay with: the simulation answers with a refusal

func _coin_lasered(c: TokenCoin, _hand: Hand) -> void:
	if where.get(c.index) == "field":
		sim.queue_input(0, {"type": "spawn", "i": c.index})

# ---------------------------------------------------------------- the match itself

func _process(delta: float) -> void:
	if sim == null or phase == "end_shown":
		return
	sim.step(delta)
	for ev in sim.events:
		_on_event(ev)
	sim.events.clear()

func _holding_hand(i: int) -> Hand:
	for h in [rig.left, rig.right]:
		if coins.has(i) and h.held == coins[i]:
			return h
	return null

func _on_event(ev: Dictionary) -> void:
	var u := arena.unit * 100.0
	match ev.kind:
		"pulse":
			# no timer: you feel the pulse as new resources appear, with a tone and a ripple
			var layer: int = clampi(int(ev.esc), 1, 4)
			Game.sfx.play("pulse" if layer == 1 else "pulse%d" % layer, null, true)
			rig.left.rumble(0.25, 0.12)
			rig.right.rumble(0.25, 0.12)
			var h: Vector2 = sim.teams[0].hoard
			arena.puff(h.x, h.y, 40.0, Color(0.8, 0.95, 1.0), 110.0)
		"escalation":
			Game.sfx.music("escalation")
		"pay":
			if ev.team == 0 and coins.has(ev.i):
				var e: Dictionary = sim.teams[0].pouch[ev.i]
				coins[ev.i].set_cost(e.cost, e.paid, e.deaths, e.extra_paid)
				var hh := _holding_hand(ev.i)
				if hh != null:
					hh.rumble(0.7 if ev.done else 0.45, 0.12 if ev.done else 0.05)
				Game.sfx.play("paid" if ev.done else "pay", coins[ev.i].global_position)
		"deny":
			if ev.team == 0:
				Game.sfx.play("deny")
				var hh2 := _holding_hand(ev.i)
				if hh2 != null:
					hh2.rumble(0.15, 0.03)
		"throw":
			if ev.team == 1:
				var e2: Dictionary = sim.teams[1].pouch[ev.i]
				var ec := TokenCoin.make(e2.tok, e2.sp, ev.i, false)
				ec.remove_from_group("grabbable")
				ec.remove_from_group("touchable")
				add_child(ec)
				ec.global_position = arena.to_world(sim.teams[1].hoard.x, sim.teams[1].hoard.y, 40.0)
				ec.fly_to(arena.to_world(ev.x, ev.y) + Vector3(0, 0.004, 0), 0.6, max(0.1, arena.unit * 120.0))
				enemy_coins[ev.i] = ec
			elif coins.has(ev.i):
				# settle exactly where the rules put it
				var c: TokenCoin = coins[ev.i]
				if c.mode != "flying":
					c.global_position = arena.to_world(ev.x, ev.y) + Vector3(0, 0.004, 0)
		"recall":
			pass
		"deploy":
			var cr = sim.creature_by_id(ev.id)
			if ev.team == 0:
				if coins.has(ev.i):
					coins[ev.i].queue_free()
					coins.erase(ev.i)
				where[ev.i] = "alive"
			elif enemy_coins.has(ev.i):
				enemy_coins[ev.i].queue_free()
				enemy_coins.erase(ev.i)
			if cr != null:
				arena.puff(cr.x, cr.y, cr.z + cr.radius, Look.el_color(cr.sp.element), cr.radius * 3.0)
				Game.sfx.play("spawn", arena.to_world(cr.x, cr.y, cr.z), true, u)
		"hit":
			var t = sim.creature_by_id(ev.id)
			if t != null:
				if arena.views.has(t.id):
					arena.views[t.id].flash_hurt()
				arena.puff(t.x, t.y, t.z + t.radius, Color(1, 0.9, 0.8), t.radius * 1.2)
				if sim.tick % 3 == 0:
					Game.sfx.play("hit", arena.to_world(t.x, t.y, t.z), false, u)
		"death":
			for c2 in sim.creatures:
				if c2.id == ev.id:
					arena.puff(c2.x, c2.y, c2.z + c2.radius, Color(0.7, 0.7, 0.9), c2.radius * 3.5)
					Game.sfx.play("death", arena.to_world(c2.x, c2.y, c2.z), false, u)
			if ev.team == 0 and int(ev.i) >= 0 and where.get(ev.i) == "alive":
				# a defeated token returns to the pouch
				where[ev.i] = "pouch"
				pouch.put_back(ev.i)
		"screech":
			var s = sim.creature_by_id(ev.id)
			if s != null:
				Game.sfx.play("screech", arena.to_world(s.x, s.y, s.z), false, u, true)
		"relic_taken", "relic_dropped", "relic_returned", "relic_captured":
			Game.sfx.play("relic", null, true)
		"end":
			_show_result(ev)

func _show_result(res: Dictionary) -> void:
	phase = "end"
	var won: bool = res.winner == 0
	var draw: bool = res.winner < 0
	arena.set_result_glow(res.winner)
	Game.sfx.play("win" if won else "lose", null, true)
	Game.sfx.music("victory" if won else "defeat")
	# save the replay: seed + setup + input log
	var rep := sim.serialize_replay()
	DirAccess.make_dir_recursive_absolute("user://replays")
	var f := FileAccess.open("user://replays/last.replay", FileAccess.WRITE)
	if f != null:
		f.store_var(rep)
		f.close()
	Game.last_match = {"result": res.duplicate(), "request": req, "replay": rep, "stats": sim.teams[0].stats.duplicate(true)}
	var T: Dictionary = sim.teams[0]
	result_panel = Node3D.new()
	add_child(result_panel)
	var fwd := rig.head_forward()
	result_panel.global_position = rig.head_pos() + fwd * 1.1 + Vector3(0, -0.1, 0)
	var how := {"relic": "Relic carried home", "concede": "Conceded", "draw": "Draw", "time": "Time"}
	var txt := "%s\n%s  ·  %d:%02d\n\nTokens played: %d\nEliminations: %d\nResources earned: %d" % [
		"DRAW" if draw else ("VICTORY" if won else "DEFEAT"), how.get(res.how, res.how), int(res.time) / 60, int(res.time) % 60,
		T.stats.played.size(), T.stats.eliminations, T.stats.earned]
	if T.stats.relic_method != "":
		txt += "\n" + T.stats.relic_method
	if req.has("wager"):
		txt += "\n\nWager: " + str(req.wager.get("text", ""))
	WorldBuilder.label(txt, Vector3.ZERO, 0.0016, result_panel)
	var btn := PanelButton.make("Leave", Vector3(0, -0.28, 0), _leave)
	result_panel.add_child(btn)
	hint.visible = false
	if won:
		# rewards drop into a pouch beside your horde
		var h := arena.to_world(T.hoard.x - 70.0, T.hoard.y + 70.0)
		WorldBuilder.ball(0.06, h + Vector3(0, 0.06, 0), Color(0.5, 0.35, 0.2), self)

func _leave() -> void:
	Game.goto(req.get("return_to", MATCH_SCENE))
