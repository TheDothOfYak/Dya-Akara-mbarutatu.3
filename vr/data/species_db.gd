class_name SpeciesDB
extends RefCounted
## Data layer: loads every creature folder under res://data/creatures.
## One folder per creature: creature.json (+ optional model.glb, face.png, song.ogg).

const ROOT := "res://data/creatures"

static var _cache: Dictionary = {}

static func all() -> Dictionary:
	if _cache.is_empty():
		_cache = load_all()
	return _cache

static func get_sp(id: String) -> Dictionary:
	return all().get(id, {})

static func ids() -> Array:
	var a := all().keys()
	a.sort()
	return a

static func load_all() -> Dictionary:
	var out := {}
	var d := DirAccess.open(ROOT)
	if d == null:
		push_error("No creature data folder at " + ROOT)
		return out
	var names := d.get_directories()
	names.sort()
	for n in names:
		var p := "%s/%s/creature.json" % [ROOT, n]
		if not FileAccess.file_exists(p):
			continue
		var parsed = JSON.parse_string(FileAccess.get_file_as_string(p))
		if typeof(parsed) != TYPE_DICTIONARY:
			push_error("Bad creature data: " + p)
			continue
		parsed["folder"] = "%s/%s" % [ROOT, n]
		_normalize(parsed)
		out[parsed.id] = parsed
	return out

## JSON numbers arrive as floats; the simulation wants ints where the 2D game had ints.
static func _normalize(sp: Dictionary) -> void:
	sp.rarity = [int(sp.rarity[0]), int(sp.rarity[1])]
	sp.size = [int(sp.size[0]), int(sp.size[1])]
	if not sp.has("element2"):
		sp["element2"] = null
