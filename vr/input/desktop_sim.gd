class_name DesktopSim
extends Node
## Desktop XR simulator: stands in for a headset and two controllers.
##
##   Mouse (click to capture)  look          W A S D   left stick (walk)
##   Q / E                     right stick (turn)
##   Tab                       switch the active hand
##   Left mouse / Right mouse  trigger / grip on the active hand
##   F / G                     primary (A) / secondary (B) on the active hand
##   Hold Alt + mouse / wheel  move the active hand (wheel = nearer / farther)
##   1 2 3 4                   thumbstick flick up / right / down / left on the active hand
##   R                         put the hands back
##   Releasing grip throws along the view when the hand is not already moving.
##
## Scripts (tests, autoplay) can drive the same hands with pose() and tap().

var rig: XRRig
var hands := []
var active := 1 # right
var offsets := [Vector3(-0.22, -0.28, -0.42), Vector3(0.22, -0.28, -0.42)]
var free_pose := [null, null] # global transforms set by scripts
var pitch := 0.0
var captured := false
var scripted := false

func make_hand(is_left: bool) -> Hand:
	var holder := Node3D.new()
	rig.add_child(holder)
	var h := Hand.new()
	h.is_left = is_left
	holder.add_child(h)
	hands.append(h)
	return h

func hand(i: int) -> Hand:
	return hands[i]

## Script API: put a hand at a world position, aiming along `forward`.
func pose(i: int, pos: Vector3, forward: Vector3 = Vector3.ZERO) -> void:
	var b := Basis()
	if forward.length() > 0.001:
		var up := Vector3.UP if absf(forward.normalized().dot(Vector3.UP)) < 0.98 else Vector3.FORWARD
		b = Basis.looking_at(forward.normalized(), up)
	else:
		b = rig.camera.global_transform.basis
	free_pose[i] = Transform3D(b, pos)
	_apply()

func unpose(i: int) -> void:
	free_pose[i] = null

func look(yaw: float, pitch_angle: float) -> void:
	rig.rotation.y = yaw
	pitch = pitch_angle
	rig.camera.rotation = Vector3(pitch, 0, 0)

func _apply() -> void:
	for i in 2:
		var holder: Node3D = hands[i].get_parent()
		if free_pose[i] != null:
			holder.global_transform = free_pose[i]
		else:
			holder.global_transform = rig.camera.global_transform * Transform3D(Basis(), offsets[i])

func _physics_process(_delta: float) -> void:
	if not scripted:
		var mv := Vector2.ZERO
		if Input.is_key_pressed(KEY_W): mv.y += 1
		if Input.is_key_pressed(KEY_S): mv.y -= 1
		if Input.is_key_pressed(KEY_D): mv.x += 1
		if Input.is_key_pressed(KEY_A): mv.x -= 1
		var tv := Vector2.ZERO
		if Input.is_key_pressed(KEY_E): tv.x += 1
		if Input.is_key_pressed(KEY_Q): tv.x -= 1
		var flick := Vector2.ZERO
		if Input.is_key_pressed(KEY_1): flick = Vector2(0, 1)
		elif Input.is_key_pressed(KEY_2): flick = Vector2(1, 0)
		elif Input.is_key_pressed(KEY_3): flick = Vector2(0, -1)
		elif Input.is_key_pressed(KEY_4): flick = Vector2(-1, 0)
		var lh: Hand = rig.off_hand()
		var rh: Hand = rig.dominant()
		for h in hands:
			var v := Vector2.ZERO
			if h == lh: v += mv
			if h == rh: v += tv
			if h == hands[active] and flick != Vector2.ZERO: v = flick
			h.set_stick(v)
	_apply()

func _unhandled_input(ev: InputEvent) -> void:
	if scripted:
		return
	var h: Hand = hands[active]
	if ev is InputEventMouseButton:
		if ev.pressed and not captured:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
			captured = true
			return
		if ev.button_index == MOUSE_BUTTON_LEFT: h.set_button("trigger", ev.pressed)
		elif ev.button_index == MOUSE_BUTTON_RIGHT:
			if not ev.pressed and h.held != null and h.velocity.length() < 0.5:
				var f := -rig.camera.global_transform.basis.z
				h.throw_override = (f + Vector3.UP * 0.35).normalized() * 4.5
			h.set_button("grip", ev.pressed)
		elif ev.button_index == MOUSE_BUTTON_WHEEL_UP and ev.pressed: offsets[active].z -= 0.03
		elif ev.button_index == MOUSE_BUTTON_WHEEL_DOWN and ev.pressed: offsets[active].z += 0.03
	elif ev is InputEventMouseMotion and captured:
		if Input.is_key_pressed(KEY_ALT):
			offsets[active] += Vector3(ev.relative.x, -ev.relative.y, 0) * 0.0015
		else:
			rig.rotate_y(-ev.relative.x * 0.003)
			pitch = clampf(pitch - ev.relative.y * 0.003, -1.4, 1.4)
			rig.camera.rotation = Vector3(pitch, 0, 0)
	elif ev is InputEventKey and not ev.echo:
		match ev.keycode:
			KEY_TAB:
				if ev.pressed: active = 1 - active
			KEY_F: h.set_button("primary", ev.pressed)
			KEY_G: h.set_button("secondary", ev.pressed)
			KEY_R:
				if ev.pressed: offsets = [Vector3(-0.22, -0.28, -0.42), Vector3(0.22, -0.28, -0.42)]
			KEY_ESCAPE:
				if ev.pressed:
					Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
					captured = false
