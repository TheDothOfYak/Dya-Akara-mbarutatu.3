class_name XRRig
extends XROrigin3D
## The player: head and two hands. Uses OpenXR when a headset is present and
## falls back to the desktop simulator (keyboard + mouse) when it is not, so
## every milestone can be run and checked on a normal computer.
##
## Comfort options come from Game.settings: smooth walk (default) or teleport,
## snap or smooth turn, vignette, seated height offset, handedness.

var camera: XRCamera3D
var left: Hand
var right: Hand
var using_xr := false
var sim: DesktopSim = null
var move_enabled := true
var speed_scale := 1.0
var _vignette: MeshInstance3D
var _snap_ready := true
var _vig := 0.0
var _tp_marker: MeshInstance3D

func _ready() -> void:
	camera = XRCamera3D.new()
	camera.position = Vector3(0, 1.65, 0)
	camera.near = 0.03
	camera.far = 600.0
	add_child(camera)
	var xr := XRServer.find_interface("OpenXR")
	using_xr = xr != null and xr.is_initialized()
	if using_xr:
		DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
		get_viewport().use_xr = true
		left = _make_xr_hand(true)
		right = _make_xr_hand(false)
	else:
		sim = DesktopSim.new()
		sim.rig = self
		add_child(sim)
		left = sim.make_hand(true)
		right = sim.make_hand(false)
	_build_vignette()
	_tp_marker = MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.18
	tm.outer_radius = 0.22
	_tp_marker.mesh = tm
	_tp_marker.visible = false
	_tp_marker.top_level = true
	add_child(_tp_marker)
	Game.rig = self

func dominant() -> Hand:
	return left if Game.settings.left_handed else right

func off_hand() -> Hand:
	return right if Game.settings.left_handed else left

func head_pos() -> Vector3:
	return camera.global_position

## Flat forward direction of the head.
func head_forward() -> Vector3:
	var f := -camera.global_transform.basis.z
	f.y = 0
	return f.normalized() if f.length() > 0.01 else Vector3.FORWARD

func _make_xr_hand(is_left: bool) -> Hand:
	var c := XRController3D.new()
	c.tracker = &"left_hand" if is_left else &"right_hand"
	c.pose = &"grip"
	add_child(c)
	var h := Hand.new()
	h.is_left = is_left
	h.controller = c
	c.add_child(h)
	var map := {"grip_click": "grip", "trigger_click": "trigger", "ax_button": "primary", "by_button": "secondary"}
	c.button_pressed.connect(func(n): if map.has(n): h.set_button(map[n], true))
	c.button_released.connect(func(n): if map.has(n): h.set_button(map[n], false))
	c.input_vector2_changed.connect(func(n, v): if n == "primary": h.set_stick(v))
	return h

func _build_vignette() -> void:
	_vignette = MeshInstance3D.new()
	var q := QuadMesh.new()
	q.size = Vector2(2, 2)
	_vignette.mesh = q
	var sh := Shader.new()
	sh.code = "shader_type spatial; render_mode unshaded, depth_test_disabled, cull_disabled; uniform float amount = 0.0;\nvoid vertex(){ POSITION = vec4(VERTEX.xy, 1.0, 1.0); }\nvoid fragment(){ float d = length(UV - vec2(0.5)) * 2.0; ALBEDO = vec3(0.0); ALPHA = smoothstep(1.15 - amount * 0.6, 1.3 - amount * 0.45, d) * step(0.001, amount); }"
	var m := ShaderMaterial.new()
	m.shader = sh
	m.render_priority = 100
	_vignette.material_override = m
	_vignette.extra_cull_margin = 16384.0
	camera.add_child(_vignette)

func _physics_process(delta: float) -> void:
	if not move_enabled:
		_vignette.material_override.set_shader_parameter("amount", 0.0)
		return
	var st: Dictionary = Game.settings
	var mv := Vector2.ZERO if off_hand().stick_captured else off_hand().stick
	var tv := Vector2.ZERO if dominant().stick_captured else dominant().stick
	var moving := false
	if st.locomotion == "smooth":
		if mv.length() > 0.15:
			var f := head_forward()
			var r := f.cross(Vector3.UP)
			global_position += (f * mv.y + r * mv.x) * 2.2 * speed_scale * Game.move_penalty * delta
			moving = true
	else:
		# teleport: push the stick forward to aim, let go to jump
		if mv.y > 0.6:
			var f2 := -off_hand().global_transform.basis.z
			var o := off_hand().global_position
			var t := 0.0
			if f2.y < -0.05:
				t = clampf((o.y - global_position.y) / -f2.y, 0.0, 8.0)
			else:
				t = 6.0
			var p := o + f2 * t
			p.y = global_position.y
			_tp_marker.global_position = p
			_tp_marker.visible = true
		elif _tp_marker.visible:
			_tp_marker.visible = false
			var head_off := camera.global_position - global_position
			head_off.y = 0
			global_position = _tp_marker.global_position - head_off
	if st.turn == "snap":
		if absf(tv.x) > 0.7 and _snap_ready:
			_snap_ready = false
			_turn(-signf(tv.x) * deg_to_rad(30.0))
		elif absf(tv.x) < 0.3:
			_snap_ready = true
	elif absf(tv.x) > 0.15:
		_turn(-tv.x * deg_to_rad(90.0) * delta)
		moving = true
	var want := 1.0 if (moving and st.vignette) else 0.0
	_vig = move_toward(_vig, want, delta * 4.0)
	_vignette.material_override.set_shader_parameter("amount", _vig)

func _turn(angle: float) -> void:
	var pivot := camera.global_position
	var t := global_transform
	t.origin -= pivot
	t = t.rotated(Vector3.UP, angle)
	t.origin += pivot
	global_transform = t

## Stand the player so their head is at `pos` (floor height) facing `yaw`.
func place(pos: Vector3, yaw: float) -> void:
	rotation = Vector3(0, yaw, 0)
	var head_off := camera.global_position - global_position
	head_off.y = 0
	global_position = pos - head_off
	if not using_xr:
		camera.position.y = 1.2 if Game.settings.seated else 1.65
	elif Game.settings.seated:
		global_position.y = pos.y + 0.45
