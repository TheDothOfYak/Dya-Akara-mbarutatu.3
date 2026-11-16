class_name DialoguePanel
extends Node3D
## A floating panel of written dialogue with a few choices. No runtime AI.

var text_label: Label3D
var _buttons: Array = []

func _ready() -> void:
	WorldBuilder.box(Vector3(0.62, 0.2, 0.01), Vector3(0, 0.1, -0.012), Color(0.1, 0.12, 0.18, 0.9), self)
	text_label = WorldBuilder.label("", Vector3(0, 0.1, 0), 0.00075, self, false)
	text_label.width = 760
	text_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART

## choices: [[text, Callable], ...]
func show_text(text: String, choices: Array) -> void:
	text_label.text = text
	for b in _buttons:
		b.queue_free()
	_buttons.clear()
	for i in choices.size():
		var col := i % 2
		var row := int(i / 2.0)
		var b := PanelButton.make(choices[i][0], Vector3(-0.16 + 0.32 * col, -0.05 - 0.075 * row, 0), choices[i][1], 0.3, 0.0008)
		add_child(b)
		_buttons.append(b)

## Stand the panel in front of the player, facing them.
func face_player(at: Vector3) -> void:
	var rig: XRRig = Game.rig
	var head := rig.head_pos()
	var to := at - head
	to.y = 0
	var d := to.normalized() if to.length() > 0.1 else rig.head_forward()
	global_position = head + d * 0.75 + Vector3(0, -0.25, 0)
	rotation.y = atan2(-d.x, -d.z)
