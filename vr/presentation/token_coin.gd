class_name TokenCoin
extends Node3D
## A physical token: a coin you can hold, turn over, rub, throw and set down.
## Its cost and type are readable on its face: one jewel per resource owed, in
## the resource's colour and shape. Lit jewels are paid.

signal grabbed(coin: TokenCoin, hand: Hand)
signal let_go(coin: TokenCoin, hand: Hand, velocity: Vector3)
signal touched(coin: TokenCoin, hand: Hand)
signal lasered(coin: TokenCoin, hand: Hand)
signal flicked(coin: TokenCoin, el: String)
signal woke(coin: TokenCoin, hand: Hand)

const RADIUS := 0.022
const FLICK_EL := {Vector2(0, 1): "Fti", Vector2(1, 0): "Su", Vector2(0, -1): "Eldi", Vector2(-1, 0): "Ular"}

var tok: Dictionary
var sp: Dictionary
var index := -1
var grab_radius := 0.09
var touch_radius := 0.035
var holder: Hand = null
var mode := "loose"
var show_cost := true
var _jewels: Array = []
var _jewel_root: Node3D
var _beacon: MeshInstance3D = null
var _fly: Dictionary = {}

static func make(token: Dictionary, species: Dictionary, idx := -1, with_cost := true) -> TokenCoin:
	var c := TokenCoin.new()
	c.tok = token
	c.sp = species
	c.index = idx
	c.show_cost = with_cost
	c._build()
	return c

func _build() -> void:
	var el_col := Look.el_color(sp.element)
	var disc := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = RADIUS
	cm.bottom_radius = RADIUS
	cm.height = 0.004
	cm.radial_segments = 20
	disc.mesh = cm
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(sp.get("placeholder", {}).get("color", "#998866")).lerp(Color(0.8, 0.7, 0.4), 0.35)
	m.metallic = 0.6
	m.roughness = 0.45
	disc.material_override = m
	add_child(disc)
	var rim := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = RADIUS - 0.002
	tm.outer_radius = RADIUS + 0.0015
	tm.rings = 20
	tm.ring_segments = 6
	rim.mesh = tm
	var rm := StandardMaterial3D.new()
	rm.albedo_color = el_col
	rim.material_override = rm
	add_child(rim)
	# generated face: the creature's name, rarity and size (a drop-in face.png replaces it)
	var face_path: String = sp.get("folder", "") + "/face.png"
	if sp.has("folder") and ResourceLoader.exists(face_path):
		var spr := Sprite3D.new()
		spr.texture = load(face_path)
		spr.pixel_size = RADIUS * 1.6 / max(1, spr.texture.get_width())
		spr.rotation.x = -PI / 2
		spr.position.y = 0.0022
		add_child(spr)
	else:
		var l := Label3D.new()
		l.text = "%s\n%s %s" % [tok.get("name", sp.name), DyaEconomy.RARITIES[tok.rarity], DyaEconomy.SIZES[tok.size_idx]]
		l.pixel_size = 0.00012
		l.font_size = 40
		l.outline_size = 10
		l.rotation.x = -PI / 2
		l.position.y = 0.0024
		l.double_sided = false
		add_child(l)
	_jewel_root = Node3D.new()
	add_child(_jewel_root)
	add_to_group("grabbable")
	add_to_group("touchable")
	if show_cost:
		set_cost(tok.cost, {"Fti": 0, "Su": 0, "Eldi": 0, "Ular": 0}, 0, 0)

## Rebuild the jewels: one per resource owed; `extra` are the any-resource jewels after defeats.
func set_cost(cost: Dictionary, paid: Dictionary, extra: int, extra_paid: int) -> void:
	for j in _jewels:
		j.queue_free()
	_jewels.clear()
	var list := []
	for el in DyaEconomy.ELS:
		for k in int(cost[el]):
			list.append([el, k < int(paid[el])])
	for k in extra:
		list.append(["", k < extra_paid])
	var n := list.size()
	for i in n:
		var a: float = TAU * i / max(1, n) - PI / 2
		var j := Look.jewel(list[i][0], list[i][1])
		j.scale = Vector3.ONE * 0.0055
		j.position = Vector3(cos(a) * (RADIUS + 0.006), 0.002, sin(a) * (RADIUS + 0.006))
		_jewel_root.add_child(j)
		_jewels.append(j)

func on_grab(hand: Hand):
	if mode == "flying":
		return null
	holder = hand
	hand.stick_captured = true
	if not hand.stick_flick.is_connected(_on_flick):
		hand.stick_flick.connect(_on_flick)
	if not hand.pressed.is_connected(_on_press):
		hand.pressed.connect(_on_press)
	set_beacon(false)
	mode = "hand"
	grabbed.emit(self, hand)
	return self

func on_release(hand: Hand, velocity: Vector3) -> void:
	_unhook(hand)
	holder = null
	mode = "loose"
	let_go.emit(self, hand, velocity)

func _unhook(hand: Hand) -> void:
	hand.stick_captured = false
	if hand.stick_flick.is_connected(_on_flick):
		hand.stick_flick.disconnect(_on_flick)
	if hand.pressed.is_connected(_on_press):
		hand.pressed.disconnect(_on_press)

func _exit_tree() -> void:
	if not is_queued_for_deletion():
		return # only moving to another parent
	if holder != null and is_instance_valid(holder):
		_unhook(holder)
		if holder.held == self:
			holder.held = null

func _on_flick(dir: Vector2) -> void:
	if FLICK_EL.has(dir):
		flicked.emit(self, FLICK_EL[dir])

func _on_press(action: String) -> void:
	if action == "primary" and holder != null:
		woke.emit(self, holder)

func on_touch(hand: Hand) -> void:
	if hand != holder:
		touched.emit(self, hand)

func on_laser(hand: Hand) -> void:
	lasered.emit(self, hand)

## A light pillar over a coin lying on a big field, so it can be seen and pointed at.
func set_beacon(on: bool, height := 0.3) -> void:
	if on and _beacon == null:
		_beacon = MeshInstance3D.new()
		var cm := CylinderMesh.new()
		cm.top_radius = 0.004
		cm.bottom_radius = 0.004
		cm.height = 1.0
		_beacon.mesh = cm
		var m := StandardMaterial3D.new()
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		m.albedo_color = Color(1, 0.9, 0.5, 0.5)
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		_beacon.material_override = m
		add_child(_beacon)
	if _beacon != null:
		_beacon.visible = on
		_beacon.scale = Vector3(max(1.0, height * 2.0), height, max(1.0, height * 2.0))
		_beacon.position.y = height * 0.5
	if on: add_to_group("laser_target")
	elif is_in_group("laser_target"): remove_from_group("laser_target")

## Fly along an arc to `target` (world), then call `done`.
func fly_to(target: Vector3, seconds: float, arc: float, done: Callable = Callable()) -> void:
	mode = "flying"
	_fly = {"from": global_position, "to": target, "t": 0.0, "dur": max(0.05, seconds), "arc": arc, "done": done}

func _process(delta: float) -> void:
	if _fly.is_empty():
		return
	_fly.t += delta / _fly.dur
	var t: float = min(1.0, _fly.t)
	var p: Vector3 = _fly.from.lerp(_fly.to, t)
	p.y += sin(t * PI) * _fly.arc
	global_position = p
	rotate_object_local(Vector3.RIGHT, delta * 18.0)
	if t >= 1.0:
		var done: Callable = _fly.done
		_fly = {}
		mode = "loose"
		global_rotation = Vector3.ZERO
		if done.is_valid():
			done.call()
