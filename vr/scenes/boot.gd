extends Node
## Entry point. Starts in the tower unless a scene is named:
##   godot -- --scene=match   (main | match | tower | town | workshop | wilds)

const SCENES := {"main": "res://scenes/main.tscn", "match": "res://scenes/match.tscn", "tower": "res://scenes/tower.tscn",
	"town": "res://scenes/town.tscn", "workshop": "res://scenes/workshop.tscn", "wilds": "res://scenes/wilds.tscn",
	"replay": "res://scenes/replay.tscn"}
const DEFAULT_ORDER := ["tower", "match", "main"]

func _ready() -> void:
	if Game.args.has("compile_check"):
		# load every script so parse errors show up:  godot --headless -- --compile_check
		var bad := 0
		for p in _walk("res://"):
			var sc = load(p)
			if sc == null or (sc is GDScript and not sc.can_instantiate()):
				bad += 1
				print("BAD: ", p)
		print("compile check done, %d bad" % bad)
		get_tree().quit(1 if bad > 0 else 0)
		return
	if Game.args.has("selftest"):
		var st = load("res://tests/self_test.gd").new()
		add_child(st)
		return
	var want: String = Game.args.get("scene", "")
	if want == "" or not SCENES.has(want) or not ResourceLoader.exists(SCENES[want]):
		want = ""
		for s in DEFAULT_ORDER:
			if ResourceLoader.exists(SCENES[s]):
				want = s
				break
	Game.goto(SCENES[want])

func _walk(dir: String) -> Array:
	var out := []
	var d := DirAccess.open(dir)
	for f in d.get_files():
		if f.ends_with(".gd"):
			out.append(dir.path_join(f))
	for sub in d.get_directories():
		if not sub.begins_with("."):
			out.append_array(_walk(dir.path_join(sub)))
	return out
