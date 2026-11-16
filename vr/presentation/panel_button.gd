class_name PanelButton
extends Node3D
## A physical button: press it with a fingertip, or point the laser at it and press A.

var touch_radius := 0.05
var action: Callable
var label: Label3D
var _plate: MeshInstance3D
var _cool := 0.0
static var _last_press_ms := 0 # one press at a time across all buttons, so a passing hand cannot hit two

static func make(text: String, pos: Vector3, on_press: Callable, width := 0.18, text_size := 0.0011) -> PanelButton:
	var b := PanelButton.new()
	b.position = pos
	b.action = on_press
	b._plate = WorldBuilder.box(Vector3(width, 0.06, 0.02), Vector3.ZERO, Color(0.25, 0.3, 0.4), b)
	b.label = WorldBuilder.label(text, Vector3(0, 0, 0.012), text_size, b, false)
	b.touch_radius = max(0.045, width * 0.4)
	b.add_to_group("touchable")
	b.add_to_group("laser_target")
	return b

func set_text(t: String) -> void:
	label.text = t

func _process(delta: float) -> void:
	_cool = max(0.0, _cool - delta)

func press(hand: Hand = null) -> void:
	if _cool > 0.0 or Time.get_ticks_msec() - _last_press_ms < 350:
		return
	_cool = 0.4
	_last_press_ms = Time.get_ticks_msec()
	if hand != null:
		hand.rumble(0.4, 0.04)
	Game.sfx.play("tick", global_position)
	if action.is_valid():
		action.call()

func on_touch(hand: Hand) -> void:
	press(hand)

func on_laser(hand: Hand) -> void:
	press(hand)
