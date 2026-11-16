extends SceneTree
## Drop-in check:  godot --headless -s tools/check_creatures.gd [-- creature_id]
##
## Looks at every creature folder (or just one) and reports each problem in
## plain words: data file, triangle budget, texture size, scale, missing
## animations, missing attachment points. Anything missing falls back to the
## placeholder, so the game always runs. Exit code 1 only when a folder's data
## file is unusable.

const TRI_BUDGET := 10000
const TEX_MAX := 1024
const REQUIRED := ["id", "name", "element", "rarity", "size", "stat_mul", "attack_range", "behavior", "tags", "tether", "throw_reach"]

func _init() -> void:
	var only := ""
	for a in OS.get_cmdline_user_args():
		only = a
	var report := run(only)
	for line in report.lines:
		print(line)
	print("\n%d creature folders checked: %d ready, %d using placeholders, %d with problems, %d broken." % [
		report.total, report.real, report.placeholder, report.warned, report.broken])
	quit(1 if report.broken > 0 else 0)

static func run(only := "") -> Dictionary:
	var out := {"lines": [], "total": 0, "real": 0, "placeholder": 0, "warned": 0, "broken": 0, "by_id": {}}
	var d := DirAccess.open(SpeciesDB.ROOT)
	if d == null:
		out.lines.append("No creature folder found at " + SpeciesDB.ROOT)
		out.broken = 1
		return out
	var names := d.get_directories()
	names.sort()
	for n in names:
		if only != "" and n != only:
			continue
		out.total += 1
		var r := check_folder("%s/%s" % [SpeciesDB.ROOT, n])
		out.by_id[n] = r
		var status := "OK"
		if r.broken:
			status = "BROKEN"
			out.broken += 1
		elif not r.problems.is_empty():
			status = "PROBLEMS"
			out.warned += 1
		if not r.broken:
			if r.uses_model: out.real += 1
			else: out.placeholder += 1
		out.lines.append("[%s] %s — %s" % [status, n, "real model" if r.uses_model else "placeholder"])
		for p in r.problems:
			out.lines.append("    - " + p)
		for p in r.notes:
			out.lines.append("    . " + p)
	return out

static func check_folder(folder: String) -> Dictionary:
	var r := {"broken": false, "uses_model": false, "problems": [], "notes": []}
	var path := folder + "/creature.json"
	if not FileAccess.file_exists(path):
		r.broken = true
		r.problems.append("There is no creature.json data file in this folder.")
		return r
	var sp = JSON.parse_string(FileAccess.get_file_as_string(path))
	if typeof(sp) != TYPE_DICTIONARY:
		r.broken = true
		r.problems.append("creature.json could not be read. Check it for a missing comma or bracket.")
		return r
	for k in REQUIRED:
		if not sp.has(k):
			r.broken = true
			r.problems.append("creature.json is missing \"%s\"." % k)
	if r.broken:
		return r
	if sp.id != folder.get_file():
		r.problems.append("The id in creature.json (\"%s\") does not match the folder name (\"%s\")." % [sp.id, folder.get_file()])
	if not DyaEconomy.ELS.has(sp.element):
		r.problems.append("Element \"%s\" is not one of Fti, Su, Eldi, Ular." % sp.element)
	var song: Dictionary = sp.get("song", {})
	if song.get("file", "") == "" or not FileAccess.file_exists(folder + "/" + song.get("file", "")):
		r.notes.append("No song file yet. A placeholder song is used in crafting.")
	sp["folder"] = folder
	var file: String = sp.get("model", {}).get("file", "")
	if file == "":
		r.notes.append("No model file yet. The generated placeholder is used.")
		return r
	if not FileAccess.file_exists(folder + "/" + file):
		r.problems.append("The model file \"%s\" named in creature.json is not in the folder. The placeholder is used." % file)
		return r
	var model := CreatureView.load_model(sp)
	if model == null:
		r.problems.append("The model file \"%s\" could not be loaded (glTF or GLB is expected). The placeholder is used." % file)
		return r
	r.uses_model = true
	var tris := CreatureView.count_triangles(model)
	if tris > TRI_BUDGET:
		r.problems.append("The model has %d triangles. The budget is about %d. Ask for a lower-detail version." % [tris, TRI_BUDGET])
	else:
		r.notes.append("%d triangles (budget %d)." % [tris, TRI_BUDGET])
	var big := _largest_texture(model)
	if big > TEX_MAX:
		r.problems.append("A texture is %d pixels wide. Keep textures at %d or smaller." % [big, TEX_MAX])
	var box := _bounds(model, Transform3D())
	var s := float(sp.get("model", {}).get("scale", 1.0))
	var extent: float = max(box.size.x, box.size.z) * 0.5 * s
	if extent < 0.5 or extent > 2.0:
		var fix: float = 1.0 / max(0.0001, max(box.size.x, box.size.z) * 0.5)
		r.problems.append("The model is the wrong size: it is %.2f units across at scale %.2f, and it should be about 1 unit from center to edge. Set \"scale\" to about %.3f." % [extent, s, fix])
	var ap := CreatureView._find_anim_player(model)
	var amap: Dictionary = sp.get("model", {}).get("animations", {})
	for a in CreatureView.REQUIRED_ANIMS + (["fly"] if sp.tags.has("flyer") else []):
		var mapped: String = amap.get(a, "")
		if ap == null or mapped == "" or not ap.has_animation(mapped):
			r.problems.append("No \"%s\" animation is mapped. The placeholder motion is used for it." % a)
	if ap != null and amap.is_empty():
		r.notes.append("Animations found in the file: " + ", ".join(ap.get_animation_list()))
	var at: Dictionary = sp.get("attachments", {})
	for k in CreatureView.ATTACH_POINTS:
		if not (at.get(k) is Array and at[k].size() == 3):
			r.problems.append("Attachment point \"%s\" is not set. A default position is used." % k)
	model.free()
	return r

static func _largest_texture(n: Node) -> int:
	var big := 0
	if n is MeshInstance3D and n.mesh != null:
		for s in n.mesh.get_surface_count():
			var m: Material = n.get_active_material(s)
			if m is BaseMaterial3D:
				for t in [m.albedo_texture, m.normal_texture, m.emission_texture, m.roughness_texture]:
					if t != null:
						big = max(big, t.get_width())
	for ch in n.get_children():
		big = max(big, _largest_texture(ch))
	return big

static func _bounds(n: Node, xf: Transform3D) -> AABB:
	var box := AABB()
	var first := true
	var here := xf
	if n is Node3D:
		here = xf * n.transform
	if n is MeshInstance3D and n.mesh != null:
		box = here * n.mesh.get_aabb()
		first = false
	for ch in n.get_children():
		var b := _bounds(ch, here)
		if b.size == Vector3.ZERO:
			continue
		if first:
			box = b
			first = false
		else:
			box = box.merge(b)
	return box
