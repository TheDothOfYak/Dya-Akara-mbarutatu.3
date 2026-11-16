extends SceneTree
## Headless test runner:  godot --headless -s tests/run_tests.gd
## Exit code 0 = every test passed.

var fails := 0
var passes := 0

func ok(cond: bool, what: String) -> void:
	if cond:
		passes += 1
	else:
		fails += 1
		printerr("  FAIL: " + what)

func _init() -> void:
	var only := ""
	for a in OS.get_cmdline_user_args():
		only = a
	for t in ["test_rng", "test_economy", "test_tokens", "test_rules", "test_replay", "test_match_ends", "test_sandbox",
			"test_dropin", "test_save", "test_town", "test_workshop", "test_wilds", "test_net"]:
		if only != "" and t != only:
			continue
		if has_method(t):
			print("== " + t)
			call(t)
	print("\n%d checks passed, %d failed" % [passes, fails])
	quit(1 if fails > 0 else 0)

func make_cfg(seed_value: int, ai0 := true, n := 12) -> Dictionary:
	return {"seed": seed_value, "quiet": true, "teams": [
		{"name": "A", "controller": "ai" if ai0 else "human", "ai_skill": 0.8, "pouch": Starter.make_pouch(seed_value * 7 + 1, n)},
		{"name": "B", "controller": "ai", "ai_skill": 0.6, "pouch": Starter.make_pouch(seed_value * 7 + 2, n)}]}

func test_rng() -> void:
	var r := DyaRng.new(12345)
	var want := [0.9797282677609473, 0.3067522644996643, 0.484205421525985, 0.817934412509203, 0.5094283693470061]
	for w in want:
		ok(is_equal_approx(r.next(), w) and true, "mulberry32 matches the 2D game")
	var r2 := DyaRng.new(12345)
	ok(int(r2.next() * 4294967296.0) == 4207900869, "first value is bit-exact")
	ok(DyaRng.hash_str("abc") == 440920331, "FNV-1a hash matches (abc)")

func test_economy() -> void:
	ok(DyaEconomy.escalation_mult(0) == 1 and DyaEconomy.escalation_mult(600) == 2 and DyaEconomy.escalation_mult(900) == 3, "escalation 10/15 min")
	ok(DyaEconomy.escalation_mult(1200) == 4 and DyaEconomy.escalation_mult(1500) == 5, "escalation 20 min then +1 per 5")
	var v := DyaEconomy.combine_votes({}, {})
	ok(v.chaos_interval and v.chaos_amount, "default vote is chaos")
	v = DyaEconomy.combine_votes({"interval": 5, "amount": 1, "scale": 0}, {"interval": 15, "amount": 3, "scale": 4})
	ok(v.pulse_interval == 10 and v.pulse_amount == 2 and v.scale_idx == 2 and not v.chaos_interval, "votes meet in the middle")
	v = DyaEconomy.combine_votes({"interval": 0, "amount": 4}, {"interval": 8, "amount": 0})
	ok(v.pulse_interval == 8 and v.pulse_amount == 4 and not v.chaos_interval, "one chaos vote yields to the other player's value")

func test_tokens() -> void:
	var db := SpeciesDB.all()
	ok(db.size() >= 11, "creature folders load (%d)" % db.size())
	var rng := DyaRng.new(99)
	var seen := {}
	var dup := false
	for i in 300:
		var sp: Dictionary = db[db.keys()[i % db.size()]]
		var t := DyaToken.mint(sp, rng)
		var key := "%s/%d/%s/%d/%d" % [t.species, t.stats.hp, t.stats.dmg, t.stats.speed, t.behavior_value]
		if seen.has(key): dup = true
		seen[key] = true
		var cost: Dictionary = t.cost
		if DyaToken.cost_sum(cost) < 1 or DyaToken.cost_sum(cost) > 15 or cost[sp.element] < 1:
			ok(false, "cost in range for " + t.id)
	ok(not dup, "no two minted tokens share stats")
	var a := Starter.make_pouch(5, 25)
	var b := Starter.make_pouch(5, 25)
	ok(a.size() == 25 and var_to_bytes(a) == var_to_bytes(b), "pouch building is deterministic")

func test_rules() -> void:
	var db := SpeciesDB.all()
	var cfg := make_cfg(3, false)
	cfg.settings = {"chaos_interval": false, "chaos_amount": false, "pulse_interval": 2, "pulse_amount": 3}
	cfg.teams[1].controller = "human"
	var m := MatchSim.new(cfg, db)
	for i in 45: m.do_tick()
	var s0 := 0
	var s1 := 0
	for el in MatchSim.ELS:
		s0 += m.teams[0].resources[el]
		s1 += m.teams[1].resources[el]
	ok(m.pulse_index == 1 and s0 == 3 and s1 == 3, "both players get the same number per pulse")
	for i in 2000: m.do_tick()
	var e: Dictionary = m.teams[0].pouch[0]
	# spawn refused while unpaid
	m.queue_input(0, {"type": "throw", "i": 0, "x": 5000, "y": 500})
	m.do_tick()
	ok(e.state == "thrown", "an unpaid token can be thrown")
	ok(Vector2(e.x, e.y).distance_to(m.teams[0].hoard) <= float(e.sp.throw_reach) + 1.0, "throw is clamped to the creature's reach")
	m.queue_input(0, {"type": "spawn", "i": 0})
	m.do_tick()
	ok(e.state == "thrown" and m.creatures.is_empty(), "an unpaid token does not spawn")
	# partial payment, one jewel at a time
	var first := true
	for el in MatchSim.ELS:
		for k in e.cost[el]:
			m.queue_input(0, {"type": "pay", "i": 0, "el": el})
			m.do_tick()
			if first:
				first = false
				ok(not m.entry_paid(e) or DyaToken.cost_sum(e.cost) == 1, "partial payment is held on the token")
	ok(m.entry_paid(e), "token is paid in pieces")
	m.queue_input(0, {"type": "spawn", "i": 0})
	m.do_tick()
	ok(e.state == "field" and m.creatures.size() == 1, "a thrown, paid token spawns at once (no pulse wait)")
	# tether: beyond the ground edge by more than its tolerance, it dissolves
	var c: Dictionary = m.creatures[0]
	c.x = -c.tether_tol - 5.0
	m.do_tick()
	ok(c.dead and e.state == "pouch" and e.deaths == 1, "a creature past its tether dissolves and returns to the pouch")
	ok(m.entry_due(e) == DyaToken.cost_sum(e.cost) + 1, "replaying a defeated token costs +1")
	m.queue_input(1, {"type": "concede"})
	m.do_tick()
	ok(m.over and m.result.winner == 0 and m.result.how == "concede", "concede ends the match")

func _run_ai_match(seed_value: int, limit_ticks: int) -> MatchSim:
	var m := MatchSim.new(make_cfg(seed_value), SpeciesDB.all())
	while not m.over and m.tick < limit_ticks:
		m.do_tick()
	return m

func test_replay() -> void:
	var db := SpeciesDB.all()
	for seed_value in [11, 12]:
		var m := MatchSim.new(make_cfg(seed_value), db)
		var trace := []
		while not m.over and m.tick < 9000:
			m.do_tick()
			if m.tick % 50 == 0: trace.append(m.state_hash())
		var rep: Dictionary = bytes_to_var(var_to_bytes(m.serialize_replay())) # as if saved and loaded
		ok(rep.log.size() > 10, "input log recorded (%d inputs, %d creatures)" % [rep.log.size(), m.creatures.size()])
		var r := MatchSim.from_replay(rep, db)
		var trace2 := []
		while not r.over and r.tick < rep.final_tick:
			r.do_tick()
			if r.tick % 50 == 0: trace2.append(r.state_hash())
		ok(trace == trace2, "replay matches at every checkpoint (seed %d, %d checkpoints)" % [seed_value, trace.size()])
		ok(r.state_hash() == rep.final_hash and r.tick == rep.final_tick, "replay ends in the identical state")
		ok(r.result == m.result, "replay has the same result")
	var a := _run_ai_match(21, 3000)
	var b := _run_ai_match(21, 3000)
	ok(a.state_hash() == b.state_hash(), "same seed, same match")
	var c2 := _run_ai_match(22, 3000)
	ok(a.state_hash() != c2.state_hash(), "different seed, different match")

func test_match_ends() -> void:
	var ended := 0
	var total := 6
	var times := []
	for seed_value in range(31, 31 + total):
		var m := _run_ai_match(seed_value, 20 * 60 * 40)
		if m.over:
			ended += 1
			times.append("%s@%ds" % [m.result.how, int(m.result.time)])
		else:
			times.append("unfinished")
	print("   results: ", times)
	ok(ended == total, "every AI match reaches an ending (%d of %d)" % [ended, total])

func _export_glb(node: Node3D, path: String) -> bool:
	var doc := GLTFDocument.new()
	var st := GLTFState.new()
	if doc.append_from_scene(node, st) != OK:
		return false
	return doc.write_to_filesystem(st, path) == OK

func test_dropin() -> void:
	var checker = load("res://tools/check_creatures.gd")
	var rep: Dictionary = checker.run()
	ok(rep.broken == 0 and rep.total >= 11, "every creature folder passes the check script")
	# drop a real model into a scratch creature folder and check it
	var folder := "user://dropin_test/testbeast"
	DirAccess.make_dir_recursive_absolute(folder)
	var sp: Dictionary = SpeciesDB.get_sp("lutut").duplicate(true)
	sp.id = "testbeast"
	sp.erase("folder")
	sp.model = {"file": "model.glb", "scale": 1.0, "animations": {}}
	var f := FileAccess.open(folder + "/creature.json", FileAccess.WRITE)
	f.store_string(JSON.stringify(sp))
	f.close()
	var r: Dictionary = checker.check_folder(folder)
	ok(not r.broken and not r.uses_model and r.problems.size() == 1, "a named but missing model falls back to the placeholder, in plain words")
	var src := CreatureView.make(SpeciesDB.get_sp("lutut"))
	root.add_child(src)
	ok(_export_glb(src, folder + "/model.glb"), "placeholder exports as a GLB for the drop-in test")
	src.queue_free()
	r = checker.check_folder(folder)
	ok(r.uses_model, "a dropped-in GLB is picked up")
	var txt := "\n".join(r.problems)
	ok(txt.contains("animation") and txt.contains("Attachment point"), "missing animations and attachment points are reported")
	sp["folder"] = folder
	var v := CreatureView.make(sp)
	ok(not v.is_placeholder, "the creature view uses the dropped-in model with no code change")
	v.free()
	# a model over the triangle budget is called out
	var heavy := Node3D.new()
	var mi := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radial_segments = 128
	sm.rings = 64
	mi.mesh = sm
	heavy.add_child(mi)
	root.add_child(heavy)
	_export_glb(heavy, folder + "/model.glb")
	heavy.queue_free()
	r = checker.check_folder(folder)
	ok("\n".join(r.problems).contains("triangles"), "a model over the triangle budget is reported")
