class_name PouchView
extends Node3D
## The pouch on your hip. You cannot see inside it: you rummage by feel. With a
## hand in the pouch, push the thumbstick left or right to move your fingers to
## another token (each gives a tick you can feel, stronger for bigger creatures),
## squeeze grip to pull that one out, or press B to tip all of them onto the table.
## Letting go of a token over the pouch puts it back.

signal dump_all()
signal took(index: int)

const ZONE := 0.17
var grab_radius := ZONE
var contents: Array = []   # pouch entry indices, in the order your fingers find them
var cursor := 0
var feel: Callable = Callable()        # index -> strength 0..1
var make_coin: Callable = Callable()   # index -> Node3D
var rig: XRRig
var _bag: MeshInstance3D
var _hands_in := {}

func _ready() -> void:
	_bag = WorldBuilder.ball(0.09, Vector3.ZERO, Color(0.42, 0.28, 0.16), self)
	_bag.scale = Vector3(1.0, 1.15, 0.8)
	WorldBuilder.cyl(0.05, 0.03, Vector3(0, 0.1, 0), Color(0.3, 0.2, 0.1), self)
	add_to_group("grabbable")

func attach(r: XRRig) -> void:
	rig = r
	for h in [r.left, r.right]:
		h.stick_flick.connect(_on_flick.bind(h))
		h.pressed.connect(_on_press.bind(h))

func set_contents(list: Array) -> void:
	contents = list.duplicate()
	# presentation-only shuffle: where things settle in a pocket is not a rule
	contents.shuffle()
	cursor = 0

func put_back(index: int) -> void:
	if not contents.has(index):
		contents.insert(cursor if cursor <= contents.size() else 0, index)

func remove(index: int) -> void:
	contents.erase(index)
	cursor = clampi(cursor, 0, max(0, contents.size() - 1))

func contains_point(p: Vector3) -> bool:
	return p.distance_to(global_position) < ZONE

func hand_inside(h: Hand) -> bool:
	return h.held == null and contains_point(h.global_position)

func _physics_process(_delta: float) -> void:
	if rig == null:
		return
	# ride on the hip: below the head, to the chosen side
	var head := rig.head_pos()
	var f := rig.head_forward()
	var right := f.cross(Vector3.UP).normalized()
	var side := -1.0 if Game.settings.left_handed else 1.0
	var floor_y := rig.global_position.y
	var hip_y := floor_y + (head.y - floor_y) * 0.58
	global_position = Vector3(head.x, hip_y, head.z) + right * 0.24 * side + f * 0.08
	for h in [rig.left, rig.right]:
		var inside := hand_inside(h)
		if inside and not _hands_in.has(h):
			_hands_in[h] = true
			h.stick_captured = true
			_tick(h)
		elif not inside and _hands_in.has(h):
			_hands_in.erase(h)
			if h.held == null:
				h.stick_captured = false

func _tick(h: Hand) -> void:
	if contents.is_empty():
		return
	var strength := 0.5
	if feel.is_valid():
		strength = feel.call(contents[cursor])
	h.rumble(0.15 + 0.6 * strength, 0.03 + 0.05 * strength)
	Game.sfx.play("tick", global_position)

func _on_flick(dir: Vector2, h: Hand) -> void:
	if not _hands_in.has(h) or contents.is_empty() or dir.x == 0.0:
		return
	cursor = posmod(cursor + int(dir.x), contents.size())
	_tick(h)

func _on_press(action: String, h: Hand) -> void:
	if action == "secondary" and _hands_in.has(h):
		dump_all.emit()

func on_grab(hand: Hand):
	if contents.is_empty() or not make_coin.is_valid():
		hand.rumble(0.1, 0.03)
		return null
	var idx: int = contents[cursor]
	contents.remove_at(cursor)
	cursor = clampi(cursor, 0, max(0, contents.size() - 1))
	var coin: Node3D = make_coin.call(idx)
	took.emit(idx)
	if coin != null and coin.has_method("on_grab"):
		coin.global_position = hand.global_position
		return coin.on_grab(hand)
	return coin
