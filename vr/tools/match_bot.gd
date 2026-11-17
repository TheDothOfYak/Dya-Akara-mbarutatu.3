extends Node
## Autoplay: plays a whole match through the real input layer (the simulated
## hands), the same way a person would: link the hordes, pull tokens from the
## pouch, rub the jewels, throw, laser-point and press A. Used to check the
## Milestone 1 gate without a headset.
##
##   godot -- --autoplay [--seed=N] [--speed=4] [--shot=out.png]
##
## Prints AUTOPLAY RESULT and REPLAY EXACT / REPLAY MISMATCH, then quits.

var scene
var ds: DesktopSim
var rig: XRRig
var R := 1 # right hand index in the simulator
var L := 0
var stats := {"pulled": 0, "paid": 0, "thrown": 0, "spawned": 0, "put_back": 0}

func _ready() -> void:
	rig = scene.rig
	ds = rig.sim
	if ds == null:
		push_error("autoplay needs the desktop simulator")
		return
	ds.scripted = true
	Engine.time_scale = float(Game.args.get("speed", "4"))
	_run()

func wait(sec: float) -> void:
	await get_tree().create_timer(sec, true, true).timeout

func frames(n: int) -> void:
	for i in n:
		await get_tree().physics_frame

func _run() -> void:
	await frames(5)
	# --- setup: turn a ring, grab my horde token, tap it on theirs
	var tok: HordeToken = scene.my_token
	if scene.net != null:
		while scene.phase != "play":
			await frames(2)
		await _after_link()
		return
	if Game.args.has("scale"):
		for k in int(Game.args.scale):
			ds.pose(L, tok.beads[2].global_position + Vector3(0, 0.0, 0.06), Vector3.FORWARD)
			await frames(3)
			ds.pose(L, tok.global_position + Vector3(-0.3, 0.1, 0.2), Vector3.FORWARD)
			await frames(3)
	ds.pose(R, tok.global_position)
	await frames(3)
	ds.hand(R).set_button("grip", true)
	await frames(3)
	ds.pose(R, scene.their_token.global_position + Vector3(0, 0, 0.04))
	await frames(6)
	ds.hand(R).set_button("grip", false)
	await frames(10)
	await _after_link()

func _after_link() -> void:
	if scene.phase != "play":
		print("AUTOPLAY FAILED: hordes did not link")
		get_tree().quit(1)
		return
	print("AUTOPLAY linked: ", scene.votes)
	ds.look(rig.rotation.y, float(Game.args.get("pitch", "-0.5")))
	if Game.args.has("shot_setup"):
		await wait(1.0)
		await Shots.save(scene, Game.args.shot_setup)
	var sim: MatchSim = scene.sim
	var shot_done := false
	var guard := 0
	while not sim.over and guard < 4000:
		guard += 1
		await wait(0.4)
		if scene.me < 0:
			continue
		if sim.over:
			break
		# spawn anything of mine lying on the field, fully paid: laser + A
		var acted := false
		for i in scene.coins.keys():
			if scene.where.get(i) == "field" and sim.entry_paid(sim.teams[scene.me].pouch[i]):
				await _laser_spawn(scene.coins[i])
				acted = true
				break
		if acted:
			continue
		var total := 0
		for el in MatchSim.ELS:
			total += sim.teams[scene.me].resources[el]
		if total < 3 or scene.pouch.contents.is_empty():
			continue
		await _play_one()
		if not shot_done and Game.args.has("shot_play") and sim.creatures.size() >= 3:
			shot_done = true
			ds.unpose(R)
			ds.unpose(L)
			await frames(3)
			await Shots.save(scene, Game.args.shot_play)
	await wait(1.5)
	print("AUTOPLAY RESULT: ", sim.result, " hands: ", stats, " creatures: ", sim.creatures.size(), " haptics: ", Game.haptic_log.size())
	var rep: Dictionary = Game.last_match.get("replay", {})
	var ok := false
	if not rep.is_empty():
		var f := FileAccess.open("user://replays/last.replay", FileAccess.READ)
		var loaded: Dictionary = f.get_var()
		f.close()
		var r := MatchSim.from_replay(loaded, SpeciesDB.all())
		var h := r.run_to_end(int(loaded.final_tick))
		ok = h == sim.state_hash() and h == int(loaded.final_hash) and r.result == sim.result
	print("REPLAY EXACT" if ok else "REPLAY MISMATCH")
	if scene.net != null:
		print("NET RESULT view tick=%d winner=%d hash=%d desync=%s me=%d" % [sim.tick, sim.result.get("winner", -9), sim.state_hash(), str(scene.net.desync), scene.me])
	if Game.args.has("shot"):
		ds.unpose(R)
		ds.unpose(L)
		await frames(3)
		await Shots.save(scene, Game.args.shot)
	get_tree().quit(0 if ok and sim.over else 1)

## Rummage, pull a token, pay what we can; throw it if it is paid, else put it back.
func _play_one() -> void:
	var sim: MatchSim = scene.sim
	var hand := ds.hand(R)
	ds.pose(R, scene.pouch.global_position)
	await frames(3)
	# feel around: move the fingers along a few tokens
	for k in (stats.pulled % 3):
		hand.set_stick(Vector2(1, 0))
		await frames(2)
		hand.set_stick(Vector2.ZERO)
		await frames(2)
	hand.set_button("grip", true)
	await frames(3)
	var coin = hand.held
	if coin == null:
		hand.set_button("grip", false)
		return
	stats.pulled += 1
	ds.pose(R, rig.head_pos() + rig.head_forward() * 0.4 + Vector3(0.15, -0.3, 0))
	await frames(3)
	# rub the jewels: flick the stick toward each resource we still owe and have
	var e: Dictionary = sim.teams[scene.me].pouch[coin.index]
	var dirs := {"Fti": Vector2(0, 1), "Su": Vector2(1, 0), "Eldi": Vector2(0, -1), "Ular": Vector2(-1, 0)}
	for pass_n in 20:
		var did := false
		for el in MatchSim.ELS:
			if e.paid[el] < e.cost[el] and sim.teams[scene.me].resources[el] > 0:
				hand.set_stick(dirs[el])
				await frames(2)
				hand.set_stick(Vector2.ZERO)
				await frames(3)
				stats.paid += 1
				did = true
				break
		if not did:
			if e.extra_paid < e.deaths and not _owes_typed(e):
				for el in MatchSim.ELS:
					if sim.teams[scene.me].resources[el] > 0:
						hand.set_stick(dirs[el])
						await frames(2)
						hand.set_stick(Vector2.ZERO)
						await frames(3)
						did = true
						break
			if not did:
				break
	if not sim.entry_paid(e):
		# not ready: put it back in the pouch
		ds.pose(R, scene.pouch.global_position)
		await frames(3)
		hand.set_button("grip", false)
		await frames(3)
		stats.put_back += 1
		ds.unpose(R)
		await wait(1.0)
		return
	# throw: a real arm swing is a release with velocity
	var arena: ArenaView = scene.arena
	var enemy: Vector2 = sim.teams[1 - scene.me].hoard
	var own: Vector2 = sim.teams[scene.me].hoard
	var want := own + (enemy - own) * (0.55 if e.sp.tags.has("sentient") else 0.3) + Vector2(0, (stats.thrown % 5 - 2) * 70.0)
	var target := arena.to_world(want.x, want.y)
	var from: Vector3 = hand.global_position
	var flat := Vector3(target.x - from.x, 0, target.z - from.z)
	var reach_m: float = float(e.sp.throw_reach) * arena.unit
	var dist: float = flat.length() / max(1.0, reach_m / 4.0)
	var tt := 0.6
	var v := flat.normalized() * (dist / tt)
	v.y = (0.5 * 9.8 * tt * tt - max(0.0, from.y - arena.floor_y())) / tt
	if v.length() < 1.3:
		v = v.normalized() * 1.4
	hand.throw_override = v
	hand.set_button("grip", false)
	stats.thrown += 1
	await wait(1.6)
	if scene.coins.has(coin.index) and scene.where.get(coin.index) == "field":
		await _laser_spawn(scene.coins[coin.index])
	ds.unpose(R)

func _owes_typed(e: Dictionary) -> bool:
	for el in MatchSim.ELS:
		if e.paid[el] < e.cost[el]:
			return true
	return false

## Hold two buttons for the laser, point at the coin, press A.
func _laser_spawn(coin: Node3D) -> void:
	var hand := ds.hand(R)
	var from := rig.head_pos() + Vector3(0.2, -0.3, 0)
	ds.pose(R, from, coin.global_position - from)
	await frames(2)
	hand.set_button("grip", true)
	hand.set_button("trigger", true)
	await frames(3)
	hand.set_button("primary", true)
	await frames(2)
	hand.set_button("primary", false)
	hand.set_button("grip", false)
	hand.set_button("trigger", false)
	await frames(4)
	stats.spawned += 1
