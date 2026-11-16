class_name HordeToken
extends Node3D
## A horde token with its three rings: time between pulses, resources per pulse,
## and arena scale. Turn a ring by tapping its bead (one step) or by gripping
## the bead and dragging it round. A ring at the bottom means chaos (the
## default). Tap two horde tokens together to link them.

signal changed()

const RING_OPTS := [[0, 2, 5, 8, 10, 15], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4]]
const RING_NAMES := ["Pulse every", "Per pulse", "Scale"]
const RING_R := [0.045, 0.063, 0.081]

var grab_radius := 0.09
var idx := [0, 0, 0]
var locked := false
var color := Color(0.85, 0.72, 0.48)
var beads: Array = []
var label: Label3D
var holder: Hand = null

func _ready() -> void:
	WorldBuilder.cyl(0.04, 0.008, Vector3.ZERO, color, self)
	for k in 3:
		var ring := MeshInstance3D.new()
		var tm := TorusMesh.new()
		tm.inner_radius = RING_R[k] - 0.004
		tm.outer_radius = RING_R[k] + 0.004
		tm.rings = 24
		tm.ring_segments = 6
		ring.mesh = tm
		ring.material_override = WorldBuilder.mat(color.darkened(0.15 + 0.12 * k))
		add_child(ring)
		var bead := RingBead.new()
		bead.token = self
		bead.ring = k
		add_child(bead)
		beads.append(bead)
	label = WorldBuilder.label("", Vector3(0, 0.07, 0), 0.0006, self)
	add_to_group("grabbable")
	_refresh()

func votes() -> Dictionary:
	return {"interval": RING_OPTS[0][idx[0]], "amount": RING_OPTS[1][idx[1]], "scale": idx[2]}

func set_votes(v: Dictionary) -> void:
	idx[0] = max(0, RING_OPTS[0].find(int(v.get("interval", 0))))
	idx[1] = max(0, RING_OPTS[1].find(int(v.get("amount", 0))))
	idx[2] = clampi(int(v.get("scale", 0)), 0, 4)
	_refresh()

func step_ring(k: int, by := 1) -> void:
	if locked:
		return
	idx[k] = posmod(idx[k] + by, RING_OPTS[k].size())
	_refresh()
	Game.sfx.play("tick", global_position)
	changed.emit()

func set_ring_from_angle(k: int, angle: float) -> void:
	if locked:
		return
	var n: int = RING_OPTS[k].size()
	var i := posmod(roundi(angle / TAU * n), n)
	if i != idx[k]:
		idx[k] = i
		_refresh()
		Game.sfx.play("tick", global_position)
		changed.emit()

func _refresh() -> void:
	for k in 3:
		# index 0 sits at the bottom of the token (toward the holder)
		var a: float = TAU * idx[k] / RING_OPTS[k].size()
		beads[k].position = Vector3(sin(a) * RING_R[k], 0.006, cos(a) * RING_R[k])
	var a_txt := "chaos" if idx[0] == 0 else "%d s" % RING_OPTS[0][idx[0]]
	var b_txt := "chaos" if idx[1] == 0 else str(RING_OPTS[1][idx[1]])
	label.text = "Pulse every: %s\nPer pulse: %s\nScale: %s" % [a_txt, b_txt, DyaEconomy.SCALE_NAMES[idx[2]]]

func on_grab(hand: Hand):
	holder = hand
	return self

func on_release(_hand: Hand, _velocity: Vector3) -> void:
	holder = null

class RingBead:
	extends Node3D
	var token: HordeToken
	var ring := 0
	var touch_radius := 0.009
	var grab_radius := 0.02
	var drag: Hand = null

	func _ready() -> void:
		WorldBuilder.ball(0.008, Vector3.ZERO, Color(1.0, 0.95, 0.7), self)
		add_to_group("touchable")
		add_to_group("grabbable")

	func on_touch(hand: Hand) -> void:
		if hand != token.holder and not hand.is_down("grip"):
			token.step_ring(ring)

	func on_grab(hand: Hand):
		if hand == token.holder:
			return null
		drag = hand
		return null

	func _process(_delta: float) -> void:
		if drag == null:
			return
		if not drag.is_down("grip"):
			drag = null
			return
		var local := token.to_local(drag.global_position)
		token.set_ring_from_angle(ring, atan2(local.x, local.z))
