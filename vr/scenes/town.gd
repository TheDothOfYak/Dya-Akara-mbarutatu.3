extends Node3D
## Sri'Ciakala, on Xikia: the market square with its 16 stalls, the tavern,
## and the 100 Dya'kukull who live here. Talk to anyone. Ask for a game on the
## spot, sit down at a tavern table, wager a token, ask for rumors, hire a
## guide, buy at the stalls. This is your own copy of the town.

const SELF := "res://scenes/town.tscn"
const STALL_R := 9.0

var rig: XRRig
var town: Dictionary
var figures: Array = []
var panel: DialoguePanel
var wrist: Label3D
var stall_nodes: Array = []
var stake_idx := 0
var sandbox: Sandbox = null
var tavern_pos := Vector3(17, 0, 0)
var notice: Label3D
var _clock_acc := 0.0

func _ready() -> void:
	Game.ensure_game()
	town = Game.data.town
	add_child(WorldBuilder.sky_environment(Color(0.45, 0.68, 0.9), Color(0.3, 0.42, 0.4)))
	add_child(WorldBuilder.sun())
	add_child(WorldBuilder.ground(400.0, Color(0.36, 0.44, 0.34)))
	_build_village()
	rig = XRRig.new()
	add_child(rig)
	var start := Vector3(0, 0, 5.0)
	if Game.data.flags.has("town_pos"):
		start = Game.data.flags.town_pos
	rig.place(start, 0.0)
	Game.sfx.music("town")
	panel = DialoguePanel.new()
	panel.visible = false
	add_child(panel)
	notice = WorldBuilder.label("", Vector3.ZERO, 0.0012, self)
	notice.visible = false
	wrist = WorldBuilder.label("", Vector3(0, 0.05, 0.05), 0.0005, rig.off_hand())
	_build_stalls()
	_build_tavern()
	_build_signs()
	_spawn_people()
	_settle_last_match()
	_update_wrist()
	if Game.args.has("autoplay"):
		var bot = load("res://tools/town_bot.gd").new()
		bot.scene = self
		add_child(bot)
	Shots.maybe(self)

# ---------------------------------------------------------------- the place

func _build_village() -> void:
	# the village grows out of massive ancient trees, on several levels
	var rng := RandomNumberGenerator.new()
	rng.seed = int(town.seed)
	for i in 7:
		var a := TAU * i / 7.0 + 0.3
		var r := 26.0 + rng.randf_range(0, 6)
		var p := Vector3(cos(a) * r, 0, sin(a) * r)
		WorldBuilder.cyl(3.2, 34.0, p + Vector3(0, 17, 0), Color(0.36, 0.26, 0.18), self, 2.2)
		WorldBuilder.ball(11.0, p + Vector3(0, 36, 0), Color(0.2, 0.42, 0.24), self)
		for lvl in 4:
			# homes spread across the tree levels
			var plat := WorldBuilder.cyl(5.5, 0.3, p + Vector3(0, 4.0 + lvl * 6.0, 0), Color(0.45, 0.35, 0.25), self)
			plat.name = "level_%d_%d" % [i, lvl]
			for h in 3:
				var ha := a + h * 2.1 + lvl
				WorldBuilder.box(Vector3(1.6, 1.6, 1.6), p + Vector3(cos(ha) * 4.0, 5.0 + lvl * 6.0, sin(ha) * 4.0), Color(0.6, 0.5, 0.38), self)
	# the sea beside the town, and the castle on the hill above
	var sea := WorldBuilder.box(Vector3(400, 0.2, 160), Vector3(0, 0.05, -120), Color(0.2, 0.45, 0.65, 0.85), self)
	sea.name = "sea"
	WorldBuilder.cyl(30.0, 26.0, Vector3(90, 13, 60), Color(0.4, 0.46, 0.36), self, 14.0)
	WorldBuilder.box(Vector3(10, 9, 10), Vector3(90, 30, 60), Color(0.62, 0.6, 0.58), self)
	# the square
	WorldBuilder.cyl(13.0, 0.06, Vector3(0, 0.03, 0), Color(0.55, 0.5, 0.42), self)

func _stall_pos(i: int) -> Vector3:
	var a := TAU * i / 16.0
	return Vector3(cos(a) * STALL_R, 0, sin(a) * STALL_R)

func _build_stalls() -> void:
	var cfg := TownData.stalls_cfg()
	for i in 16:
		var s := Node3D.new()
		s.position = _stall_pos(i)
		s.rotation.y = -TAU * i / 16.0 - PI / 2 # counters face the middle of the square
		add_child(s)
		stall_nodes.append(s)
		var col := Color(0.55, 0.3, 0.25) if i < 4 else Color(0.3, 0.4, 0.55)
		if i == 15: col = Color(0.75, 0.62, 0.3)
		WorldBuilder.box(Vector3(1.8, 0.9, 0.6), Vector3(0, 0.45, 0), Color(0.45, 0.34, 0.24), s)
		WorldBuilder.box(Vector3(2.1, 0.08, 1.2), Vector3(0, 2.2, -0.2), col, s)
		for x in [-0.95, 0.95]:
			WorldBuilder.box(Vector3(0.08, 2.2, 0.08), Vector3(x, 1.1, -0.6), Color(0.35, 0.26, 0.18), s)
	_fill_stalls()

func _fill_stalls() -> void:
	var cfg := TownData.stalls_cfg()
	for i in 16:
		var s: Node3D = stall_nodes[i]
		if s.has_node("wares"):
			s.get_node("wares").free()
		var wares := Node3D.new()
		wares.name = "wares"
		s.add_child(wares)
		if i < 4:
			var st: Dictionary = cfg.supply[i]
			WorldBuilder.label(st.stall, Vector3(0, 2.0, 0.3), 0.003, wares, false)
			var k := 0
			for item in st.items:
				var b := PanelButton.make("%s  %d g" % [item.name, item.price], Vector3(-0.6 + 0.6 * (k % 3), 1.0 + 0.09 * int(k / 3.0), 0.32), _buy_supply.bind(item), 0.5, 0.0009)
				wares.add_child(b)
				k += 1
		elif i == 15:
			WorldBuilder.label("Your stall", Vector3(0, 2.0, 0.3), 0.003, wares, false)
			wares.add_child(PanelButton.make("List pouch token", Vector3(-0.5, 1.0, 0.32), _list_stake, 0.45, 0.0009))
			wares.add_child(PanelButton.make("Sell to the Guild", Vector3(0.05, 1.0, 0.32), _sell_stake, 0.45, 0.0009))
			wares.add_child(PanelButton.make("Next token", Vector3(0.6, 1.0, 0.32), _next_stake, 0.45, 0.0009))
			var txt := "Listings: %d" % town.my_listings.size()
			for l in town.my_listings:
				txt += "\n%s  %d g" % [l.tok.name, l.price]
			WorldBuilder.label(txt, Vector3(0, 1.45, 0.3), 0.0012, wares, false)
		else:
			var mine := []
			for l in town.listings:
				if int(l.stall) == i - 4:
					mine.append(l)
			if mine.is_empty():
				WorldBuilder.label("Empty stall", Vector3(0, 2.0, 0.3), 0.002, wares, false)
				continue
			var seller := TownData.npc_by_id(town, mine[0].seller)
			WorldBuilder.label(seller.name + "’s Stall", Vector3(0, 2.0, 0.3), 0.003, wares, false)
			var k2 := 0
			for l in mine:
				var tok := TownData.npc_token(seller, l.tok_id)
				if tok.is_empty():
					continue
				# each listing is the physical token with its price shown
				var coin := TokenCoin.make(tok, SpeciesDB.get_sp(tok.species))
				coin.remove_from_group("grabbable")
				coin.remove_from_group("touchable")
				coin.scale = Vector3.ONE * 2.0
				coin.position = Vector3(-0.55 + 0.55 * k2, 0.93, 0.1)
				wares.add_child(coin)
				wares.add_child(PanelButton.make("%s  %d g" % [tok.name, l.price], Vector3(-0.55 + 0.55 * k2, 1.08, 0.32), _buy_listing.bind(l), 0.5, 0.0008))
				k2 += 1

func _build_tavern() -> void:
	WorldBuilder.cyl(6.0, 0.08, tavern_pos + Vector3(0, 0.04, 0), Color(0.5, 0.38, 0.28), self)
	WorldBuilder.label("Tavern", tavern_pos + Vector3(0, 3.2, 0), 0.008, self)
	WorldBuilder.box(Vector3(10, 0.2, 10), tavern_pos + Vector3(0, 2.9, 0), Color(0.42, 0.3, 0.22), self)
	for x in [-4.6, 4.6]:
		for z in [-4.6, 4.6]:
			WorldBuilder.box(Vector3(0.3, 2.9, 0.3), tavern_pos + Vector3(x, 1.45, z), Color(0.35, 0.25, 0.18), self)
	for i in 4:
		var tp := tavern_pos + Vector3(-2.2 + 4.4 * (i % 2), 0, -2.0 + 4.0 * int(i / 2.0))
		WorldBuilder.cyl(0.6, 0.05, tp + Vector3(0, 0.75, 0), Color(0.45, 0.33, 0.22), self)
		WorldBuilder.cyl(0.07, 0.75, tp + Vector3(0, 0.375, 0), Color(0.35, 0.25, 0.18), self)
	var b := PanelButton.make("Sandbox against an AI", tavern_pos + Vector3(0, 1.3, 4.4), _tavern_sandbox, 0.45, 0.001)
	b.rotation.y = PI
	add_child(b)

func _build_signs() -> void:
	var signs := [["Your tower", Vector3(-5, 1.3, 13), "res://scenes/tower.tscn"], ["Workshop", Vector3(0, 1.3, 14), "res://scenes/workshop.tscn"],
		["Gate to the wilds", Vector3(5, 1.3, 13), "res://scenes/wilds.tscn"]]
	for s in signs:
		var b := PanelButton.make(s[0], s[1], _go.bind(s[2]), 0.5, 0.0014)
		b.rotation.y = PI
		add_child(b)
		WorldBuilder.box(Vector3(0.1, 1.3, 0.1), s[1] - Vector3(0, 0.68, 0), Color(0.35, 0.26, 0.18), self)
	var ab := PanelButton.make("Arena gate: tournament match", Vector3(-10, 1.3, 11), _arena_match, 0.7, 0.0012)
	ab.rotation.y = PI * 0.8
	add_child(ab)
	var rb := PanelButton.make("Watch last replay", Vector3(-10, 1.2, 11), _watch_replay, 0.7, 0.0012)
	rb.rotation.y = PI * 0.8
	add_child(rb)
	var mb := PanelButton.make("Friends: host or join by town code", Vector3(10, 1.3, 11), func(): _go("res://scenes/lobby.tscn"), 0.8, 0.0012)
	mb.rotation.y = -PI * 0.8
	add_child(mb)

func _go(path: String) -> void:
	if ResourceLoader.exists(path):
		_remember_pos()
		Game.save_game()
		Game.goto(path)
	else:
		_say("That way is not open yet.")

func _remember_pos() -> void:
	var p := rig.head_pos()
	Game.data.flags["town_pos"] = Vector3(p.x, 0, p.z)

# ---------------------------------------------------------------- people

func _spot_for(npc: Dictionary, place: String, idx: int) -> Vector3:
	var h := DyaRng.new(DyaRng.hash_str(npc.id) + idx)
	match place:
		"square":
			var a := h.range_f(0, TAU)
			return Vector3(cos(a), 0, sin(a)) * h.range_f(1.5, 7.0)
		"tavern":
			return tavern_pos + Vector3(-2.2 + 4.4 * (idx % 2) + h.range_f(-0.9, 0.9), 0, -2.0 + 4.0 * (int(idx / 2.0) % 2) + h.range_f(-0.9, 0.9))
		"arena":
			return Vector3(-11 + h.range_f(-2, 2), 0, 9 + h.range_f(-2, 2))
		_:
			return Vector3(h.range_f(-14, 14), 0, 16 + h.range_f(0, 5))

func _spawn_people() -> void:
	for f in figures:
		f.queue_free()
	figures.clear()
	var shown := 0
	var counts := {}
	for npc in town.npcs:
		var place := TownData.where_is(npc, float(town.clock))
		if not ["square", "tavern", "arena", "work"].has(place) or shown >= 40:
			continue # at home on the tree levels, or out by the shore
		var n: int = counts.get(place, 0)
		counts[place] = n + 1
		var fig := NpcFigure.new()
		fig.town_scene = self
		fig.npc = npc
		fig.place = place
		fig.position = _spot_for(npc, place, n)
		add_child(fig)
		figures.append(fig)
		shown += 1

func talk(npc: Dictionary, at: Vector3, at_table: bool) -> void:
	_remember_pos()
	var fill := {"name": npc.name, "personality": npc.personality}
	var pouch := Game.pouch_tokens()
	stake_idx = clampi(stake_idx, 0, max(0, pouch.size() - 1))
	var stake_name: String = pouch[stake_idx].name if not pouch.is_empty() else "nothing"
	var choices := [
		["Ask for a game", _ask.bind(npc, false, at, at_table)],
		["Wager: " + stake_name, _ask.bind(npc, true, at, at_table)],
		["Any rumors?", _rumor.bind(npc, at, at_table)],
		["Hire as a guide", _guide.bind(npc, at, at_table)],
		["Stake another token", func(): _next_stake(); talk(npc, at, at_table)],
		["Goodbye", func(): panel.visible = false]]
	panel.visible = true
	panel.show_text(TownData.line("greeting", fill, npc.met), choices)
	panel.face_player(at)

func _ask(npc: Dictionary, wager: bool, at: Vector3, at_table: bool) -> void:
	var pouch := Game.pouch_tokens()
	if pouch.is_empty():
		panel.show_text("Your open pouch is empty.", [["Goodbye", func(): panel.visible = false]])
		return
	var stake_id: String = pouch[stake_idx].id if wager else ""
	var ans: Dictionary = TownData.ask_match(town, npc, pouch, stake_id, SELF, int(town.seed) + int(town.day) * 131 + npc.met * 17 + DyaRng.hash_str(npc.id) % 9973, at_table)
	if not ans.ok:
		panel.show_text(ans.text, [["Back", talk.bind(npc, at, at_table)], ["Goodbye", func(): panel.visible = false]])
		return
	panel.show_text(ans.text, [["Start", _start_match.bind(ans.request)], ["Not now", func(): panel.visible = false]])

func _start_match(req: Dictionary) -> void:
	Game.match_request = req
	Game.data.flags["pending_match"] = true
	Game.save_game()
	Game.goto("res://scenes/match.tscn")

func _rumor(npc: Dictionary, at: Vector3, at_table: bool) -> void:
	Wilds.ensure(Game.data)
	var r: Dictionary = TownData.rumor(town, Game.data.wilds, npc)
	panel.show_text(r.text, [["Back", talk.bind(npc, at, at_table)], ["Goodbye", func(): panel.visible = false]])

func _guide(npc: Dictionary, at: Vector3, at_table: bool) -> void:
	Wilds.ensure(Game.data)
	var fee := int(TownData.stalls_cfg().guide_fee)
	var r: Dictionary = TownData.rumor(town, Game.data.wilds, npc)
	var back := [["Back", talk.bind(npc, at, at_table)], ["Goodbye", func(): panel.visible = false]]
	if not npc.guide or r.creature.is_empty():
		panel.show_text(TownData.line("guide_refuse"), back)
		return
	var sp := SpeciesDB.get_sp(r.creature.species)
	var offer := TownData.line("guide_offer", {"creature": sp.name, "place": TownData.HABITAT_NAMES.get(r.creature.habitat, ""), "fee": fee})
	panel.show_text(offer, [["Pay %d gold and go" % fee, func():
		if Game.data.player.gold < fee:
			panel.show_text(TownData.line("guide_poor", {"fee": fee}), back)
			return
		Game.data.player.gold -= fee
		npc.gold += fee
		Game.data.flags["guide_to"] = r.creature.id
		Game.data.flags["guide_name"] = npc.name
		_go("res://scenes/wilds.tscn")], ["Back", talk.bind(npc, at, at_table)]])

func _settle_last_match() -> void:
	if not Game.data.flags.get("pending_match", false):
		return
	Game.data.flags.erase("pending_match")
	var lm: Dictionary = Game.last_match
	if lm.is_empty() or not lm.request.has("npc"):
		return
	var rep: Dictionary = TownData.settle(Game.data, lm.request, lm.result)
	Game.last_match = {}
	Game.save_game()
	var txt := "Match settled."
	if not rep.won_token.is_empty(): txt = "%s\nYou won %s. It is in your tower." % [rep.text, rep.won_token.name]
	elif not rep.lost_token.is_empty(): txt = "%s\nYou lost %s." % [rep.text, rep.lost_token.name]
	_say(txt)

func _say(text: String) -> void:
	notice.text = text
	notice.visible = true
	notice.global_position = rig.head_pos() + rig.head_forward() * 1.2 + Vector3(0, 0.15, 0)
	get_tree().create_timer(6.0).timeout.connect(func(): notice.visible = false)

# ---------------------------------------------------------------- market

func _update_wrist() -> void:
	wrist.text = "%d gold\nTown code %s\nDay %d" % [Game.data.player.gold, town.code, int(town.day) + 1]

func _buy_supply(item: Dictionary) -> void:
	_say(TownData.buy_supply(Game.data, item))
	Game.sfx.play("coin")
	_after_trade()

func _buy_listing(l: Dictionary) -> void:
	_say(TownData.buy_listing(Game.data, l))
	Game.sfx.play("coin")
	_after_trade()

func _stake_tok() -> Dictionary:
	var pouch := Game.pouch_tokens()
	if pouch.is_empty():
		return {}
	stake_idx = clampi(stake_idx, 0, pouch.size() - 1)
	return pouch[stake_idx]

func _next_stake() -> void:
	var pouch := Game.pouch_tokens()
	if not pouch.is_empty():
		stake_idx = (stake_idx + 1) % pouch.size()
		_say("Chosen token: " + pouch[stake_idx].name)

func _list_stake() -> void:
	var t := _stake_tok()
	if not t.is_empty():
		_say(TownData.list_token(Game.data, t.id, int(DyaEconomy.RARITY_VALUE[t.rarity])))
		_after_trade()

func _sell_stake() -> void:
	var t := _stake_tok()
	if not t.is_empty():
		_say(TownData.guild_buyback(Game.data, t.id))
		_after_trade()

func _after_trade() -> void:
	Game.save_game()
	_fill_stalls()
	_update_wrist()

# ---------------------------------------------------------------- arena gate, tavern sandbox, replay

func _arena_match() -> void:
	var pouch := Game.pouch_tokens()
	var best := {}
	for n in town.npcs:
		if n.plays and (best.is_empty() or n.level > best.level):
			best = n
	if pouch.is_empty() or best.is_empty():
		return
	_remember_pos()
	var p: Dictionary = Game.data.player
	Game.match_request = {"seed": int(town.seed) + int(town.day) * 7 + 3, "pouch": pouch, "return_to": SELF, "npc": best.id,
		"opponent": {"name": best.name, "pouch": best.collection.duplicate(), "ai_skill": min(1.0, best.skill), "votes": {"scale": 3}, "level": best.level},
		"tournament": {"name": "Sri'Ciakala village arena", "votes": {"interval": 8, "amount": 2, "scale": 3}, "terrain": "forest"},
		"card": {"name": p.name, "planet": "Xikia", "rank": "Unranked", "level": p.level, "title": ""}}
	Game.data.flags["pending_match"] = true
	Game.save_game()
	Game.goto("res://scenes/match.tscn")

func _tavern_sandbox() -> void:
	if sandbox != null:
		return
	var pouch := Game.pouch_tokens()
	if pouch.is_empty():
		return
	var foe := {}
	for n in town.npcs:
		if n.plays and TownData.where_is(n, float(town.clock)) == "tavern":
			foe = n
			break
	if foe.is_empty():
		for n in town.npcs:
			if n.plays:
				foe = n
				break
	sandbox = Sandbox.new()
	add_child(sandbox)
	sandbox.open(tavern_pos + Vector3(-2.2, 0.8, -2.0), Vector3(1, 0, 0), 1.0)
	sandbox.slots = [pouch[stake_idx % pouch.size()], foe.collection[0]]
	sandbox.reset()
	sandbox.closed.connect(func(): sandbox = null)

func _watch_replay() -> void:
	if FileAccess.file_exists("user://replays/last.replay") and ResourceLoader.exists("res://scenes/replay.tscn"):
		_remember_pos()
		Game.data.flags["replay_return"] = SELF
		Game.goto("res://scenes/replay.tscn")
	else:
		_say("No replay saved yet.")

func _process(delta: float) -> void:
	# the day passes: 24 minutes of play is one day
	_clock_acc += delta
	if _clock_acc > 10.0:
		var before := int(float(town.clock) * 4.0)
		town.clock = float(town.clock) + _clock_acc / 1440.0
		_clock_acc = 0.0
		if float(town.clock) >= 1.0:
			town.clock = 0.0
			var sold := TownData.new_day(Game.data)
			if not sold.is_empty():
				_say("Sold at your stall: " + ", ".join(sold))
			_fill_stalls()
		if int(float(town.clock) * 4.0) != before and not panel.visible:
			_spawn_people()
		_update_wrist()

class NpcFigure:
	extends Node3D
	## One townsperson. Touch them, or point the laser and press A, to talk.
	var town_scene
	var npc: Dictionary
	var place := "square"
	var touch_radius := 0.45
	var _home: Vector3
	var _target: Vector3
	var _wait := 0.0

	func _ready() -> void:
		var h := DyaRng.new(DyaRng.hash_str(npc.id))
		var col := Color.from_hsv(h.next(), 0.35, 0.7)
		WorldBuilder.cyl(0.2, 1.25, Vector3(0, 0.63, 0), col, self, 0.14)
		WorldBuilder.ball(0.13, Vector3(0, 1.42, 0), Color(0.82, 0.68, 0.52), self)
		WorldBuilder.label(npc.name, Vector3(0, 1.72, 0), 0.0022, self)
		var grab := Node3D.new() # the touch point is at chest height
		add_to_group("touchable")
		add_to_group("laser_target")
		_home = position
		_target = position
		_wait = h.range_f(1, 8)

	func _process(delta: float) -> void:
		if place != "square" or town_scene.panel.visible:
			return
		# light routine: stroll around the square between pauses
		_wait -= delta
		if _wait <= 0.0:
			_target = _home + Vector3(randf_range(-2.5, 2.5), 0, randf_range(-2.5, 2.5))
			_wait = randf_range(5, 14)
		var to := _target - position
		if to.length() > 0.1:
			position += to.normalized() * min(to.length(), 0.8 * delta)

	func on_touch(hand: Hand) -> void:
		hand.rumble(0.3, 0.04)
		town_scene.talk(npc, global_position, place == "tavern")

	func on_laser(hand: Hand) -> void:
		on_touch(hand)
