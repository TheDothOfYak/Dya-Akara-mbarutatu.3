class_name Sandbox
extends Node3D
## The practice sandbox. Works anywhere: on the desk, outside the tower, at a
## tavern table, at camp. Two of your own tokens, or one against an AI.
## Normal creature rules, no resources, no costs, nothing wagered. Pick up and
## move a creature at will (it freezes while held), swap in another token,
## pause, or reset to run the same fight again. Everything here is a hologram.

signal closed()

var width_m := 0.8
var slots := [{}, {}]      # the two tokens (team 0 and team 1)
var spots := [Vector2(520, 500), Vector2(1080, 500)]
var sim: MatchSim = null
var arena: ArenaView = null
var paused := false
var seed_value := 77
var handles := {}
var _origin: Vector3
var _forward: Vector3
var _buttons: Node3D
var _pause_btn: PanelButton
var status: Label3D

## center: world position of the middle of the field; forward: direction of the field's long axis.
func open(center: Vector3, forward: Vector3, width: float = 0.8) -> void:
	width_m = width
	_origin = center
	_forward = forward
	_buttons = Node3D.new()
	add_child(_buttons)
	var right := forward.cross(Vector3.UP).normalized()
	_buttons.global_position = center + right * (width * 0.36) + Vector3(0, 0.05, 0)
	_buttons.rotation.y = atan2(right.x, right.z)
	var s: float = clampf(width / 0.8, 0.8, 3.0)
	_buttons.scale = Vector3.ONE * s
	_pause_btn = PanelButton.make("Pause", Vector3(-0.2, 0, 0), toggle_pause, 0.16)
	_buttons.add_child(_pause_btn)
	_buttons.add_child(PanelButton.make("Reset", Vector3(0, 0, 0), reset, 0.16))
	_buttons.add_child(PanelButton.make("Close", Vector3(0.2, 0, 0), close, 0.16))
	status = WorldBuilder.label("Sandbox: add two tokens (wake one and press Duel, or drop a coin here).", Vector3(0, 0.09, 0), 0.0007, _buttons)
	reset()

func field_contains(world: Vector3) -> bool:
	if arena == null:
		return false
	var p := arena.to_sim(world)
	return p.x > -100 and p.x < MatchSim.W + 100 and p.y > -100 and p.y < MatchSim.H + 100 and absf(world.y - _origin.y) < 0.5 + width_m

## Put a token in. Fills the first empty side, else replaces the side nearest `near` (or side 2).
func add_token(tok: Dictionary, near = null) -> void:
	var side := 0
	if slots[0].is_empty():
		side = 0
	elif slots[1].is_empty():
		side = 1
	elif near != null and arena != null:
		side = 0 if arena.to_sim(near).x < MatchSim.W * 0.5 else 1
	else:
		side = 1
	slots[side] = tok
	reset()

func toggle_pause() -> void:
	paused = not paused
	_pause_btn.set_text("Resume" if paused else "Pause")

## Rebuild the scene from the two tokens. The same seed gives the same fight.
func reset() -> void:
	if arena != null:
		arena.queue_free()
	for h in handles.values():
		h.queue_free()
	handles.clear()
	var db := SpeciesDB.all()
	var cfg := {"seed": seed_value, "mode": "sandbox", "teams": [
		{"name": "Left", "pouch": [slots[0]] if not slots[0].is_empty() else []},
		{"name": "Right", "pouch": [slots[1]] if not slots[1].is_empty() else []}]}
	sim = MatchSim.new(cfg, db)
	for side in 2:
		if not slots[side].is_empty():
			sim.queue_input(side, {"type": "sb_place", "i": 0, "team": side, "x": spots[side].x, "y": spots[side].y})
	arena = ArenaView.new()
	arena.bare = true
	add_child(arena)
	arena.setup(sim, _origin, _forward, width_m / MatchSim.W, Vector2(MatchSim.W * 0.5, MatchSim.H * 0.5), "")
	arena.show_edge()
	paused = false
	if _pause_btn != null:
		_pause_btn.set_text("Pause")
	_update_status()

func _update_status() -> void:
	var names := []
	for s in slots:
		names.append(s.get("name", "empty") if not s.is_empty() else "empty")
	status.text = "Sandbox: %s  vs  %s" % names

func close() -> void:
	closed.emit()
	queue_free()

func _process(delta: float) -> void:
	if sim == null:
		return
	if not paused:
		sim.step(delta)
	for ev in sim.events:
		if ev.kind == "hit":
			var t = sim.creature_by_id(ev.id)
			if t != null:
				arena.puff(t.x, t.y, t.z + t.radius, Color(1, 0.9, 0.8), t.radius * 1.2)
				if arena.views.has(t.id):
					arena.views[t.id].flash_hurt()
		elif ev.kind == "deploy":
			var c = sim.creature_by_id(ev.id)
			if c != null:
				arena.puff(c.x, c.y, c.z + c.radius, Look.el_color(c.sp.element), c.radius * 3.0)
	sim.events.clear()
	# a grab handle on every living creature
	for c in sim.creatures:
		if c.dead:
			if handles.has(c.id):
				handles[c.id].queue_free()
				handles.erase(c.id)
			continue
		var h: Handle = handles.get(c.id)
		if h == null:
			h = Handle.new()
			h.box = self
			h.cid = c.id
			h.grab_radius = max(0.06, c.radius * arena.unit * 1.5)
			add_child(h)
			handles[c.id] = h
		if h.holder == null:
			h.global_position = arena.to_world(c.x, c.y, c.z + c.radius)
		else:
			var p := arena.to_sim(h.global_position)
			sim._apply_input(c.team, {"type": "sb_move", "id": c.id, "x": p.x, "y": p.y}) # works while paused too

class Handle:
	extends Node3D
	var box: Sandbox
	var cid := 0
	var grab_radius := 0.08
	var holder: Hand = null

	func _ready() -> void:
		add_to_group("grabbable")

	func on_grab(hand: Hand):
		holder = hand
		box.sim._apply_input(0, {"type": "sb_hold", "id": cid, "on": true})
		return self

	func on_release(_hand: Hand, _velocity: Vector3) -> void:
		holder = null
		box.sim._apply_input(0, {"type": "sb_hold", "id": cid, "on": false})
