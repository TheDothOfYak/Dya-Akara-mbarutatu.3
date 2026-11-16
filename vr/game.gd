extends Node
## Autoload. Holds settings, the local save, the current player rig and scene
## changes. No cloud dependency: everything lives in local files.

const SETTINGS_PATH := "user://settings.cfg"

var rig: XRRig = null
var haptic_log: Array = []
var move_penalty := 1.0 # hunger and tiredness slow you in the wilds
var args := {}
var sfx: Sfx
var match_request := {}
var last_match := {}

var settings := {
	"locomotion": "smooth", # or "teleport"
	"turn": "snap",         # or "smooth"
	"vignette": false,
	"seated": false,
	"left_handed": false,
	"colorblind": false,
	"loud_limiter": true,
	"strike_audio": true,   # ShurgrEdan strike toggle, as in 2D
	"vol_master": 1.0, "vol_music": 0.7, "vol_sfx": 1.0, "vol_crowd": 0.6,
	"mute_music": false, "mute_sfx": false,
}

func _enter_tree() -> void:
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=")
		args[kv[0]] = kv[1] if kv.size() > 1 else "1"
	load_settings()

func _ready() -> void:
	sfx = Sfx.new()
	add_child(sfx)

func load_settings() -> void:
	var cf := ConfigFile.new()
	if cf.load(SETTINGS_PATH) == OK:
		for k in settings:
			settings[k] = cf.get_value("settings", k, settings[k])

func save_settings() -> void:
	var cf := ConfigFile.new()
	for k in settings:
		cf.set_value("settings", k, settings[k])
	cf.save(SETTINGS_PATH)

func goto(scene_path: String) -> void:
	get_tree().change_scene_to_file.call_deferred(scene_path)
