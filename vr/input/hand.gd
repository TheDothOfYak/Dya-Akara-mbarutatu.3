class_name Hand
extends Node3D
## One hand, whichever device drives it: an XRController3D in a headset or the
## desktop simulator. Everything else in the game talks to hands only through
## this class, so every action has a controller path and a simulator path.
##
## Actions: "grip", "trigger", "primary" (A / X), "secondary" (B / Y).
## Groups it interacts with:
##   grabbable     on_grab(hand) -> Node3D or null, on_release(hand, velocity)
##   touchable     on_touch(hand)
##   laser_target  on_laser(hand)

signal pressed(action: String)
signal released(action: String)
signal stick_flick(dir: Vector2)

var is_left := false
var buttons := {}
var stick := Vector2.ZERO
var controller: XRController3D = null
var held: Node3D = null
var velocity := Vector3.ZERO
var throw_override := Vector3.ZERO # the simulator may supply a throw
var laser_on := false
var enabled := true

var _last_pos := Vector3.ZERO
var _touching := {}
var _flicked := false
var _laser: MeshInstance3D
var _mesh: MeshInstance3D

func _ready() -> void:
	_mesh = MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(0.07, 0.03, 0.11)
	_mesh.mesh = bm
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.85, 0.75, 0.6)
	_mesh.material_override = mat
	add_child(_mesh)
	_laser = MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 0.002
	cm.bottom_radius = 0.002
	cm.height = 1.0
	_laser.mesh = cm
	var lm := StandardMaterial3D.new()
	lm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	lm.albedo_color = Color(0.5, 0.9, 1.0)
	_laser.material_override = lm
	_laser.visible = false
	add_child(_laser)
	_last_pos = global_position

func is_down(action: String) -> bool:
	return buttons.get(action, false)

func set_button(action: String, down: bool) -> void:
	if buttons.get(action, false) == down:
		return
	buttons[action] = down
	if not enabled:
		return
	if down:
		pressed.emit(action)
		if action == "grip": _try_grab()
		elif action == "primary" and laser_on: _fire_laser()
	else:
		released.emit(action)
		if action == "grip": _release()

func set_stick(v: Vector2) -> void:
	stick = v
	if v.length() > 0.7:
		if not _flicked:
			_flicked = true
			var d := Vector2(signf(v.x), 0) if absf(v.x) > absf(v.y) else Vector2(0, signf(v.y))
			stick_flick.emit(d)
	elif v.length() < 0.3:
		_flicked = false

func rumble(amplitude: float, seconds: float) -> void:
	if controller != null:
		controller.trigger_haptic_pulse("haptic", 0.0, clampf(amplitude, 0.0, 1.0), seconds, 0.0)
	Game.haptic_log.append({"left": is_left, "amp": amplitude, "sec": seconds})
	if Game.haptic_log.size() > 64:
		Game.haptic_log.pop_front()

func tip() -> Vector3:
	return global_position - global_transform.basis.z * 0.06

func _physics_process(delta: float) -> void:
	var p := global_position
	if delta > 0.0:
		velocity = velocity.lerp((p - _last_pos) / delta, 0.5)
	_last_pos = p
	if held != null and is_instance_valid(held):
		held.global_transform = Transform3D(global_transform.basis.orthonormalized(), p - global_transform.basis.z * 0.05)
	elif held != null:
		held = null
	laser_on = enabled and held == null and is_down("grip") and is_down("trigger")
	_laser.visible = laser_on
	if laser_on:
		var hit := _laser_pick()
		var length := 30.0
		if hit != null:
			length = global_position.distance_to(hit.global_position)
		_laser.scale = Vector3(1, length, 1)
		_laser.position = Vector3(0, 0, -length * 0.5)
		_laser.rotation = Vector3(PI * 0.5, 0, 0)
	if enabled:
		_check_touch()

func _try_grab() -> void:
	if held != null or is_down("trigger") and false:
		return
	var best: Node3D = null
	var bd := INF
	for g in get_tree().get_nodes_in_group("grabbable"):
		if not g.is_visible_in_tree():
			continue
		var r: float = g.get("grab_radius") if g.get("grab_radius") != null else 0.1
		var d: float = g.global_position.distance_to(global_position)
		if d < r and d < bd:
			bd = d
			best = g
	if best != null:
		var got = best.on_grab(self)
		if got != null:
			held = got

func _release() -> void:
	if held == null:
		return
	var h := held
	held = null
	var v := throw_override if throw_override != Vector3.ZERO else velocity
	throw_override = Vector3.ZERO
	if is_instance_valid(h) and h.has_method("on_release"):
		h.on_release(self, v)

func _laser_pick() -> Node3D:
	var origin := global_position
	var dir := -global_transform.basis.z.normalized()
	var best: Node3D = null
	var ba := deg_to_rad(7.0) # forgiving cone
	for t in get_tree().get_nodes_in_group("laser_target"):
		if not t.is_visible_in_tree():
			continue
		var to: Vector3 = t.global_position - origin
		if to.length() < 0.05:
			continue
		var ang := dir.angle_to(to.normalized())
		if ang < ba:
			ba = ang
			best = t
	return best

func _fire_laser() -> void:
	var t := _laser_pick()
	if t != null:
		rumble(0.4, 0.05)
		t.on_laser(self)

func _check_touch() -> void:
	var p := tip()
	for t in get_tree().get_nodes_in_group("touchable"):
		if not t.is_visible_in_tree() or t == held:
			_touching.erase(t)
			continue
		var r: float = t.get("touch_radius") if t.get("touch_radius") != null else 0.03
		var inside: bool = t.global_position.distance_to(p) < r
		if inside and not _touching.has(t):
			_touching[t] = true
			t.on_touch(self)
		elif not inside and _touching.has(t):
			_touching.erase(t)
	for k in _touching.keys():
		if not is_instance_valid(k):
			_touching.erase(k)
