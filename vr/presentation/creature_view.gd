class_name CreatureView
extends Node3D
## Shows one creature. Loads whatever its folder holds: a real model if one was
## dropped in and passes the check, otherwise a placeholder built from simple
## shapes. One unit of local space = the creature's body radius.
##
## Animation states: idle, walk, run, attack, hurt, death, fly.
## Attachment points (Node3D children of `attach`): eyes, mouth, hands, relic_mount.

const REQUIRED_ANIMS := ["idle", "walk", "attack", "hurt"]
const ATTACH_POINTS := ["eyes", "mouth", "hands", "relic_mount"]

var sp: Dictionary
var tok: Dictionary = {}
var state := "idle"
var flying := false
var ghost := false
var is_placeholder := true
var attach := {}
var body: Node3D
var anim_player: AnimationPlayer = null
var anim_map := {}
var _t := 0.0
var _parts := {}
var _mats: Array = []
var _attack_t := 0.0
var _hurt_t := 0.0
var _heads := 1

static func make(species: Dictionary, token: Dictionary = {}) -> CreatureView:
	var v := CreatureView.new()
	v.sp = species
	v.tok = token
	v._build()
	return v

func _build() -> void:
	_heads = int(tok.get("picks", {}).get("headCount", 1)) if not tok.is_empty() else 1
	var model := load_model(sp)
	if model != null:
		is_placeholder = false
		body = model
		add_child(body)
		var s := float(sp.get("model", {}).get("scale", 1.0))
		body.scale = Vector3.ONE * s
		anim_player = _find_anim_player(body)
		anim_map = sp.get("model", {}).get("animations", {})
	else:
		body = Node3D.new()
		add_child(body)
		_build_placeholder()
	_build_attachments()
	_t = float(hash(tok.get("id", sp.id)) % 1000) * 0.01

## Returns the dropped-in model for a creature, or null to use the placeholder.
static func load_model(species: Dictionary) -> Node3D:
	var file: String = species.get("model", {}).get("file", "")
	if file == "":
		return null
	var path: String = species.folder + "/" + file
	if ResourceLoader.exists(path):
		var res = load(path)
		if res is PackedScene:
			return res.instantiate()
	if FileAccess.file_exists(path):
		var doc := GLTFDocument.new()
		var st := GLTFState.new()
		if doc.append_from_file(path, st) == OK:
			var n := doc.generate_scene(st)
			if n is Node3D:
				return n
	return null

static func _find_anim_player(n: Node) -> AnimationPlayer:
	if n is AnimationPlayer:
		return n
	for ch in n.get_children():
		var r := _find_anim_player(ch)
		if r != null:
			return r
	return null

func _build_attachments() -> void:
	var pts: Dictionary = sp.get("attachments", {})
	var defaults := {"eyes": Vector3(0, 1.0, -0.8), "mouth": Vector3(0, 0.8, -1.0), "hands": Vector3(0.5, 0.7, -0.5), "relic_mount": Vector3(0, 1.5, 0)}
	for k in ATTACH_POINTS:
		var n := Node3D.new()
		n.name = k
		var p = pts.get(k)
		n.position = Vector3(p[0], p[1], p[2]) if p is Array and p.size() == 3 else defaults[k]
		add_child(n)
		attach[k] = n

# ---------------------------------------------------------------- placeholder

func _mat(col: Color, glow := false) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.roughness = 0.9
	if glow:
		m.emission_enabled = true
		m.emission = col
		m.emission_energy_multiplier = 1.2
	_mats.append(m)
	return m

func _part(name_: String, mesh: Mesh, mat: Material, pos: Vector3, scl := Vector3.ONE, rot := Vector3.ZERO, parent: Node3D = null) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = pos
	mi.scale = scl
	mi.rotation = rot
	(parent if parent != null else body).add_child(mi)
	_parts[name_] = mi
	return mi

static var _sphere: SphereMesh
static var _box: BoxMesh
static var _cone: CylinderMesh
static var _cyl: CylinderMesh

static func _prims() -> void:
	if _sphere != null:
		return
	_sphere = SphereMesh.new(); _sphere.radius = 0.5; _sphere.height = 1.0; _sphere.radial_segments = 10; _sphere.rings = 6
	_box = BoxMesh.new()
	_cone = CylinderMesh.new(); _cone.top_radius = 0.0; _cone.bottom_radius = 0.5; _cone.height = 1.0; _cone.radial_segments = 8
	_cyl = CylinderMesh.new(); _cyl.top_radius = 0.5; _cyl.bottom_radius = 0.5; _cyl.height = 1.0; _cyl.radial_segments = 8

func _build_placeholder() -> void:
	_prims()
	var ph: Dictionary = sp.get("placeholder", {})
	var c1 := Color(ph.get("color", "#888888"))
	var c2 := Color(ph.get("color2", "#444444"))
	var feats: Array = ph.get("features", [])
	var m1 := _mat(c1)
	var m2 := _mat(c2, feats.has("glow"))
	var eye := _mat(Color(0.05, 0.05, 0.05))
	match ph.get("body", "quad"):
		"biped":
			_part("torso", _sphere, m1, Vector3(0, 0.9, 0), Vector3(0.9, 1.1, 0.8))
			_part("cap", _sphere, m2, Vector3(0, 1.5, 0), Vector3(1.0, 0.5, 1.0))
			_part("leg_l", _cyl, m2, Vector3(-0.25, 0.25, 0), Vector3(0.22, 0.5, 0.22))
			_part("leg_r", _cyl, m2, Vector3(0.25, 0.25, 0), Vector3(0.22, 0.5, 0.22))
			var arm := _part("arm", _cyl, m1, Vector3(0.55, 0.95, -0.15), Vector3(0.16, 0.6, 0.16), Vector3(-0.9, 0, 0))
			var wm := _mat(Color(0.75, 0.75, 0.8))
			if feats.has("sword"): _part("weapon", _box, wm, Vector3(0, 1.4, 0), Vector3(0.5, 3.0, 0.3), Vector3.ZERO, arm)
			elif feats.has("spear"): _part("weapon", _cyl, wm, Vector3(0, 1.6, 0), Vector3(0.3, 5.0, 0.3), Vector3.ZERO, arm)
			elif feats.has("bow"): _part("weapon", _box, _mat(Color(0.45, 0.3, 0.15)), Vector3(0, 1.0, 0), Vector3(0.3, 0.3, 3.2), Vector3.ZERO, arm)
			_part("eye_l", _sphere, eye, Vector3(-0.2, 1.15, -0.36), Vector3.ONE * 0.12)
			_part("eye_r", _sphere, eye, Vector3(0.2, 1.15, -0.36), Vector3.ONE * 0.12)
		"serpent":
			for i in 5:
				_part("seg%d" % i, _sphere, m1, Vector3(0, 0.35, 0.45 * i - 0.2), Vector3.ONE * (0.75 - i * 0.09))
				if feats.has("ridge"):
					_part("ridge%d" % i, _cone, m2, Vector3(0, 0.75 - i * 0.05, 0.45 * i - 0.2), Vector3(0.12, 0.3, 0.3))
			var n: int = max(1, _heads)
			for h in n:
				var a := (h - (n - 1) * 0.5) * 0.45
				var neck := Node3D.new()
				neck.position = Vector3(0, 0.5, -0.4)
				neck.rotation = Vector3(0, -a, 0)
				body.add_child(neck)
				_parts["neck%d" % h] = neck
				_part("neckm%d" % h, _cyl, m1, Vector3(0, 0.45, -0.25), Vector3(0.28, 1.1, 0.28), Vector3(-0.5, 0, 0), neck)
				_part("head%d" % h, _sphere, m2 if feats.has("glow") else m1, Vector3(0, 1.0, -0.6), Vector3(0.42, 0.36, 0.6), Vector3.ZERO, neck)
			if feats.has("club_tail"):
				_part("club", _sphere, m2, Vector3(0, 0.3, 2.0), Vector3.ONE * 0.45)
		"bird":
			_part("torso", _sphere, m1, Vector3(0, 0.6, 0), Vector3(0.7, 0.6, 1.3))
			_part("head", _sphere, m1, Vector3(0, 0.85, -0.75), Vector3(0.45, 0.4, 0.5 if not feats.has("big_jaw") else 0.8))
			_part("beak", _cone, m2, Vector3(0, 0.8, -1.15), Vector3(0.18, 0.4, 0.18), Vector3(-PI / 2, 0, 0))
			_part("wing_l", _box, m2, Vector3(-0.9, 0.7, 0), Vector3(1.6, 0.06, 0.8))
			_part("wing_r", _box, m2, Vector3(0.9, 0.7, 0), Vector3(1.6, 0.06, 0.8))
			_part("tail", _box, m2, Vector3(0, 0.6, 0.9), Vector3(0.4, 0.05, 0.6))
			_part("eye_l", _sphere, eye, Vector3(-0.17, 0.95, -0.9), Vector3.ONE * 0.09)
			_part("eye_r", _sphere, eye, Vector3(0.17, 0.95, -0.9), Vector3.ONE * 0.09)
		"whale":
			_part("torso", _sphere, m1, Vector3(0, 0.6, 0), Vector3(1.1, 0.9, 2.2))
			_part("belly", _sphere, m2, Vector3(0, 0.4, 0), Vector3(1.0, 0.6, 1.9))
			for i in 4:
				_part("blow%d" % i, _cyl, m2, Vector3(0, 1.05, -0.5 + i * 0.3), Vector3(0.12, 0.12, 0.12))
				_part("eye%d" % i, _sphere, eye, Vector3(0.5 if i % 2 == 0 else -0.5, 0.7, -0.8 + i * 0.15), Vector3.ONE * 0.09)
			_part("club", _sphere, m2, Vector3(0, 0.5, 1.5), Vector3.ONE * 0.55)
		"punk":
			_part("torso", _sphere, m1, Vector3(0, 0.75, 0), Vector3(1.2, 0.95, 1.2))
			_part("stem", _cyl, m2, Vector3(0, 1.3, 0), Vector3(0.15, 0.3, 0.15))
			for i in 4:
				var a2 := PI * 0.25 + i * PI * 0.5
				_part("leg%d" % i, _cyl, m2, Vector3(cos(a2) * 0.55, 0.2, sin(a2) * 0.55), Vector3(0.14, 0.5, 0.14), Vector3(0, 0, cos(a2) * 0.4))
			_part("vine_l", _cyl, m2, Vector3(-0.7, 0.8, -0.3), Vector3(0.08, 1.0, 0.08), Vector3(-1.1, 0, 0.4))
			_part("vine_r", _cyl, m2, Vector3(0.7, 0.8, -0.3), Vector3(0.08, 1.0, 0.08), Vector3(-1.1, 0, -0.4))
			_part("eye_l", _sphere, eye, Vector3(-0.22, 0.85, -0.55), Vector3.ONE * 0.12)
			_part("eye_r", _sphere, eye, Vector3(0.22, 0.85, -0.55), Vector3.ONE * 0.12)
		_: # quad
			var low := feats.has("low")
			var hgt := 0.45 if low else 0.7
			_part("torso", _sphere, m1, Vector3(0, hgt, 0), Vector3(0.95, 0.6 if low else 0.75, 1.6))
			_part("head", _sphere, m1, Vector3(0, hgt + 0.1, -0.95), Vector3(0.6, 0.5, 0.65))
			for i in 4:
				var lx := -0.4 if i % 2 == 0 else 0.4
				var lz := -0.5 if i < 2 else 0.5
				_part("leg%d" % i, _cyl, m2, Vector3(lx, hgt * 0.45, lz), Vector3(0.2, hgt * 0.9, 0.2))
			if feats.has("shell"):
				_part("shell", _sphere, m2, Vector3(0, hgt + 0.25, 0.1), Vector3(1.15, 0.7, 1.5))
			if feats.has("tusks"):
				_part("tusk_l", _cone, _mat(Color(0.9, 0.88, 0.8)), Vector3(-0.22, hgt, -1.3), Vector3(0.1, 0.45, 0.1), Vector3(-1.9, 0, 0))
				_part("tusk_r", _cone, _mat(Color(0.9, 0.88, 0.8)), Vector3(0.22, hgt, -1.3), Vector3(0.1, 0.45, 0.1), Vector3(-1.9, 0, 0))
			if feats.has("ball_tail"):
				_part("club", _sphere, m2, Vector3(0, hgt, 1.2), Vector3.ONE * 0.4)
			if feats.has("tongue"):
				_part("tongue", _cyl, m2, Vector3(0, hgt, -1.35), Vector3(0.08, 0.3, 0.08), Vector3(PI / 2, 0, 0))
			_part("eye_l", _sphere, eye, Vector3(-0.2, hgt + 0.25, -1.2), Vector3.ONE * 0.1)
			_part("eye_r", _sphere, eye, Vector3(0.2, hgt + 0.25, -1.2), Vector3.ONE * 0.1)

## Number of triangles in the placeholder (used by the check script's report).
func triangle_count() -> int:
	return count_triangles(self)

static func count_triangles(n: Node) -> int:
	var total := 0
	if n is MeshInstance3D and n.mesh != null:
		for s in n.mesh.get_surface_count():
			var arr: Array = n.mesh.surface_get_arrays(s)
			if arr[Mesh.ARRAY_INDEX] != null and arr[Mesh.ARRAY_INDEX].size() > 0:
				total += arr[Mesh.ARRAY_INDEX].size() / 3
			elif arr[Mesh.ARRAY_VERTEX] != null:
				total += arr[Mesh.ARRAY_VERTEX].size() / 3
	for ch in n.get_children():
		total += count_triangles(ch)
	return total

# ---------------------------------------------------------------- animation

func set_state(s: String) -> void:
	if s == state:
		return
	if s == "attack": _attack_t = 0.0
	if s == "hurt": _hurt_t = 0.3
	state = s
	if anim_player != null:
		var want: String = anim_map.get(s, anim_map.get("walk" if s == "run" else "idle", ""))
		if want != "" and anim_player.has_animation(want):
			anim_player.play(want)

func flash_hurt() -> void:
	_hurt_t = 0.3

func set_heads(n: int) -> void:
	for h in 8:
		if _parts.has("neck%d" % h):
			_parts["neck%d" % h].visible = h < n

func set_ghost(on: bool, alpha := 0.25) -> void:
	if on == ghost:
		return
	ghost = on
	for m in _mats:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA if on else BaseMaterial3D.TRANSPARENCY_DISABLED
		m.albedo_color.a = alpha if on else 1.0

func set_fade(a: float) -> void:
	for m in _mats:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA if a < 0.99 else BaseMaterial3D.TRANSPARENCY_DISABLED
		m.albedo_color.a = a

func _process(delta: float) -> void:
	_t += delta
	if _hurt_t > 0.0:
		_hurt_t -= delta
	# The placeholder animation also covers any state a real model is missing.
	var has_real: bool = anim_player != null and anim_map.has(state)
	if has_real:
		return
	var bob := 0.0
	var lean := 0.0
	var speed := 0.0
	match state:
		"walk": speed = 7.0
		"run": speed = 12.0
		"attack":
			_attack_t += delta
			lean = -sin(min(_attack_t * 6.0, PI)) * 0.35
			if _attack_t > 1.0: _attack_t = 0.0
		"death":
			body.rotation.z = move_toward(body.rotation.z, PI * 0.5, delta * 4.0)
			return
		_: bob = sin(_t * 2.0) * 0.03
	if speed > 0.0:
		bob = absf(sin(_t * speed)) * 0.08
	if flying:
		bob += sin(_t * 3.0) * 0.1
		for k in ["wing_l", "wing_r"]:
			if _parts.has(k):
				_parts[k].rotation.z = sin(_t * 9.0) * 0.6 * (1.0 if k == "wing_l" else -1.0)
	for i in 4:
		var k := "leg%d" % i
		if _parts.has(k) and speed > 0.0:
			_parts[k].rotation.x = sin(_t * speed + (PI if i % 3 == 0 else 0.0)) * 0.5
	for k in ["leg_l", "leg_r"]:
		if _parts.has(k):
			_parts[k].rotation.x = (sin(_t * speed) * 0.6 * (1.0 if k == "leg_l" else -1.0)) if speed > 0.0 else 0.0
	for h in 6:
		var k := "neck%d" % h
		if _parts.has(k):
			_parts[k].rotation.x = sin(_t * 1.7 + h * 1.3) * 0.12 + lean * 1.5
	body.position.y = bob
	body.rotation.x = lean + (sin(_t * 40.0) * 0.08 if _hurt_t > 0.0 else 0.0)
	body.rotation.z = 0.0
