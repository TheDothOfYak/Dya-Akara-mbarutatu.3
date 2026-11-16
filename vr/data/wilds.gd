class_name Wilds
extends RefCounted
## Data layer for the wilds around Sri'Ciakala: a persistent population of
## unique individual creatures, saved with the town copy.

static func ensure(data: Dictionary) -> void:
	if data.get("wilds", {}).is_empty():
		data.wilds = WildsSim.generate(int(data.seed))
