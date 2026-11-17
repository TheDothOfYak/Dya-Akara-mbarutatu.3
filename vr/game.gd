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

# ---------------------------------------------------------------- local save

const SAVE_VERSION := 1
var data := {}
var save_name := "save"

func save_path() -> String:
	return "user://%s.dat" % save_name

func new_game(seed_value: int = 0) -> void:
	if seed_value == 0:
		seed_value = int(Time.get_unix_time_from_system()) % 1000000 + 1
	var collection := Starter.make_pouch(seed_value, 32)
	var ids := []
	for i in 20:
		ids.append(collection[i].id)
	data = {
		"version": SAVE_VERSION, "seed": seed_value,
		"player": {"name": "Player", "gold": 300, "xp": 0, "level": 1},
		"collection": collection,
		"pouches": [{"name": "Pouch 1", "ids": ids}, {"name": "Pouch 2", "ids": []}, {"name": "Pouch 3", "ids": []}],
		"open_pouch": 0,
		"showcase": [],
		"okid": [3, 2, 1, 0, 0, 0, 0], "ngakara": 8,
		"pieces": [], "shelf": [],
		"bag": {"food": 3, "meals": 0, "materials": []},
		"kit": {"blade": true, "spear": false, "bow": false, "whip": false, "knife": true, "rope": false, "trap": 0, "bait": 0, "armor": ""},
		"town": {}, "wilds": {}, "flags": {},
	}

func load_game() -> bool:
	if not FileAccess.file_exists(save_path()):
		return false
	var f := FileAccess.open(save_path(), FileAccess.READ)
	if f == null:
		return false
	var d = f.get_var()
	f.close()
	if typeof(d) != TYPE_DICTIONARY or not d.has("collection"):
		return false
	data = d
	return true

func save_game() -> void:
	if data.is_empty():
		return
	var f := FileAccess.open(save_path(), FileAccess.WRITE)
	if f != null:
		f.store_var(data)
		f.close()

## Make sure a save is loaded (creating a new one the first time).
func ensure_game() -> void:
	if not data.is_empty():
		return
	if args.has("save"):
		save_name = args.save
	if args.has("fresh") or not load_game():
		new_game(int(args.get("seed", "0")))
		save_game()
	ensure_town()

func ensure_town() -> void:
	if data.get("town", {}).is_empty():
		data.town = TownData.generate(int(data.seed))
		Wilds.ensure(data)
		if data.pieces.is_empty() and not data.wilds.creatures.is_empty() and not data.flags.has("starter_piece"):
			# one found piece so the crafting ritual can be tried before the first hunt
			var c: Dictionary = data.wilds.creatures[0]
			for cr in data.wilds.creatures:
				if int(cr.tok.rarity) < int(c.tok.rarity):
					c = cr
			data.pieces.append(WildsSim.take_piece(data.wilds, c, SpeciesDB.get_sp(c.species).pieces[0].kind, "found", c.habitat))
			data.flags["starter_piece"] = true
			data.okid[int(c.tok.rarity)] = max(int(data.okid[int(c.tok.rarity)]), int(DyaEconomy.CRAFT_COST[int(c.tok.rarity)][0]))
			data.ngakara = max(int(data.ngakara), int(DyaEconomy.CRAFT_COST[int(c.tok.rarity)][1]))
		save_game()

func token_by_id(id: String) -> Dictionary:
	for t in data.collection:
		if t.id == id:
			return t
	return {}

func open_pouch() -> Dictionary:
	return data.pouches[data.open_pouch]

func pouch_tokens(idx: int = -1) -> Array:
	var p: Dictionary = data.pouches[data.open_pouch if idx < 0 else idx]
	var out := []
	for id in p.ids:
		var t := token_by_id(id)
		if not t.is_empty():
			out.append(t)
	return out

## Where a token is: "pouch:<n>", "showcase" or "tray".
func token_place(id: String) -> String:
	for i in data.pouches.size():
		if data.pouches[i].ids.has(id):
			return "pouch:%d" % i
	if data.showcase.has(id):
		return "showcase"
	return "tray"

func take_from_everywhere(id: String) -> void:
	for p in data.pouches:
		p.ids.erase(id)
	data.showcase.erase(id)

func add_to_pouch(id: String, idx: int = -1) -> bool:
	var p: Dictionary = data.pouches[data.open_pouch if idx < 0 else idx]
	if p.ids.size() >= DyaEconomy.POUCH_SIZE or p.ids.has(id):
		return false
	take_from_everywhere(id)
	p.ids.append(id)
	return true

func add_token(tok: Dictionary) -> void:
	data.collection.append(tok)

func remove_token(id: String) -> Dictionary:
	take_from_everywhere(id)
	for i in data.collection.size():
		if data.collection[i].id == id:
			var t: Dictionary = data.collection[i]
			data.collection.remove_at(i)
			return t
	return {}

func goto(scene_path: String) -> void:
	get_tree().change_scene_to_file.call_deferred(scene_path)
