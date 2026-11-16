class_name BrowsePanel
extends Node3D
## The flat browse panel: the 2D collection screen floating in front of you.
## Element filters, a species filter, sorting and two view modes. Press a row
## and that token lifts out of its tray and floats to your hand.

signal picked(tok: Dictionary, hand: Hand)

const ROWS := {"list": 7, "grid": 14}
var tokens_source: Callable   # -> Array of tokens
var element := ""
var species := ""
var sort_by := "name"
var mode := "list"
var page := 0
var rows: Array = []
var _title: Label3D
var _rows_root: Node3D
var _filter_btns := {}
var _species_btn: PanelButton
var _sort_btn: PanelButton
var _mode_btn: PanelButton

func _ready() -> void:
	WorldBuilder.box(Vector3(0.72, 0.5, 0.01), Vector3(0, 0, -0.012), Color(0.12, 0.14, 0.2, 0.9), self)
	_title = WorldBuilder.label("Collection", Vector3(0, 0.22, 0), 0.0009, self, false)
	var x := -0.29
	for el in ["", "Su", "Eldi", "Fti", "Ular"]:
		var b := PanelButton.make("All" if el == "" else el, Vector3(x, 0.165, 0), _set_element.bind(el), 0.1, 0.0008)
		b.scale = Vector3.ONE * 0.7
		add_child(b)
		_filter_btns[el] = b
		x += 0.085
	_species_btn = PanelButton.make("Kind: any", Vector3(0.2, 0.165, 0), _next_species, 0.26, 0.0007)
	_species_btn.scale = Vector3.ONE * 0.7
	add_child(_species_btn)
	_sort_btn = PanelButton.make("Sort: name", Vector3(-0.25, -0.215, 0), _next_sort, 0.2, 0.0007)
	_sort_btn.scale = Vector3.ONE * 0.7
	add_child(_sort_btn)
	_mode_btn = PanelButton.make("View: list", Vector3(-0.09, -0.215, 0), _next_mode, 0.2, 0.0007)
	_mode_btn.scale = Vector3.ONE * 0.7
	add_child(_mode_btn)
	var prev := PanelButton.make("<", Vector3(0.16, -0.215, 0), func(): _turn(-1), 0.08, 0.001)
	prev.scale = Vector3.ONE * 0.7
	add_child(prev)
	var next := PanelButton.make(">", Vector3(0.27, -0.215, 0), func(): _turn(1), 0.08, 0.001)
	next.scale = Vector3.ONE * 0.7
	add_child(next)
	_rows_root = Node3D.new()
	add_child(_rows_root)
	refresh()

func filtered() -> Array:
	var out := []
	if not tokens_source.is_valid():
		return out
	for t in tokens_source.call():
		if element != "" and t.element != element:
			continue
		if species != "" and t.species != species:
			continue
		out.append(t)
	out.sort_custom(func(a, b):
		if sort_by == "rarity" and a.rarity != b.rarity: return a.rarity > b.rarity
		if sort_by == "cost":
			var ca := DyaToken.cost_sum(a.cost)
			var cb := DyaToken.cost_sum(b.cost)
			if ca != cb: return ca < cb
		if a.name != b.name: return a.name < b.name
		return a.id < b.id)
	return out

func refresh() -> void:
	for r in rows:
		r.queue_free()
	rows.clear()
	var list := filtered()
	var per: int = ROWS[mode]
	var pages: int = max(1, ceili(list.size() / float(per)))
	page = clampi(page, 0, pages - 1)
	_title.text = "Collection · %d tokens · page %d of %d" % [list.size(), page + 1, pages]
	for i in per:
		var k := page * per + i
		if k >= list.size():
			break
		var t: Dictionary = list[k]
		var text: String
		var pos: Vector3
		var width := 0.62
		if mode == "list":
			var cost: Dictionary = t.cost
			var parts := []
			for el in DyaEconomy.ELS:
				if cost[el] > 0:
					parts.append("%d %s" % [cost[el], el])
			text = "%s · %s · %s · %s · %s" % [t.name, t.element, DyaEconomy.RARITIES[t.rarity], DyaEconomy.SIZES[t.size_idx], " ".join(parts)]
			pos = Vector3(0, 0.105 - i * 0.045, 0)
		else:
			text = "%s (%s)" % [t.name, DyaEconomy.RARITIES[t.rarity]]
			pos = Vector3(-0.16 + 0.32 * (i % 2), 0.105 - int(i / 2.0) * 0.045, 0)
			width = 0.3
		var row := Row.new()
		row.panel = self
		row.tok = t
		row.position = pos
		row.touch_radius = 0.022
		WorldBuilder.box(Vector3(width, 0.038, 0.004), Vector3.ZERO, Look.el_color(t.element).darkened(0.55), row)
		WorldBuilder.label(text, Vector3(0, 0, 0.004), 0.00045, row, false)
		_rows_root.add_child(row)
		rows.append(row)

func _set_element(el: String) -> void:
	element = el
	page = 0
	refresh()

func _next_species() -> void:
	var ids := [""]
	for t in tokens_source.call():
		if not ids.has(t.species):
			ids.append(t.species)
	species = ids[(ids.find(species) + 1) % ids.size()]
	_species_btn.set_text("Kind: " + (SpeciesDB.get_sp(species).get("name", "any") if species != "" else "any"))
	page = 0
	refresh()

func _next_sort() -> void:
	var opts := ["name", "rarity", "cost"]
	sort_by = opts[(opts.find(sort_by) + 1) % opts.size()]
	_sort_btn.set_text("Sort: " + sort_by)
	refresh()

func _next_mode() -> void:
	mode = "grid" if mode == "list" else "list"
	_mode_btn.set_text("View: " + mode)
	page = 0
	refresh()

func _turn(by: int) -> void:
	page += by
	refresh()

class Row:
	extends Node3D
	var panel: BrowsePanel
	var tok: Dictionary
	var touch_radius := 0.022
	var _cool := 0.0

	func _ready() -> void:
		add_to_group("touchable")
		add_to_group("laser_target")

	func _process(delta: float) -> void:
		_cool = max(0.0, _cool - delta)

	func on_touch(hand: Hand) -> void:
		if _cool > 0.0:
			return
		_cool = 0.5
		hand.rumble(0.4, 0.04)
		panel.picked.emit(tok, hand)

	func on_laser(hand: Hand) -> void:
		on_touch(hand)
