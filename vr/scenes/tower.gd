extends Node3D
## The tower: the player's home. The whole collection sits on and around the
## desk in element trays. Display cases on the stair hold showpieces. A flat
## browse panel floats in front of you. The open pouch sits on the desk with a
## live count out of 25; saved pouches hang on hooks. Grab a token for the
## physical coin, press A to wake its hologram, and run a practice sandbox.

const TRAY_ORDER := ["Su", "Eldi", "Fti", "Ular"]
const CASE_SLOTS := 8

var rig: XRRig
var desk: Node3D
var trays := {}
var tray_coins := {}     # token id -> TokenCoin (in trays and showcase)
var loose := {}          # token id -> TokenCoin out of its place (held or floating)
var pouch_node: Node3D
var pouch_label: Label3D
var tags: Array = []
var hooks: Array = []
var case_slots: Array = []
var panel: BrowsePanel
var hologram: TokenHologram = null
var sandbox: Sandbox = null
var bot = null

func _ready() -> void:
	Game.ensure_game()
	Art.light_scene(self, "dusk")
	Art.backdrop(self, 7, 30.0, -42.0, true, 60)
	_build_room()
	rig = XRRig.new()
	add_child(rig)
	rig.place(Vector3(0, 0, 0.75), 0.0)
	Game.sfx.music("tower")
	_build_desk()
	_build_hooks()
	_build_cases()
	_build_doors()
	panel = BrowsePanel.new()
	panel.tokens_source = func(): return Game.data.collection
	panel.position = Vector3(-0.95, 1.35, -0.35)
	panel.rotation.y = 0.75
	add_child(panel)
	panel.picked.connect(_panel_picked)
	refresh()
	if Game.args.has("autoplay"):
		bot = load("res://tools/tower_bot.gd").new()
		bot.scene = self
		add_child(bot)
	LookBot.maybe(self, rig)
	Shots.maybe(self)

# ---------------------------------------------------------------- the room

func _build_room() -> void:
	var floor_m := Art.surface(Color(0.4, 0.34, 0.29), 1.2)
	WorldBuilder.cyl(4.3, 0.2, Vector3(0, -0.1, 0), Color.WHITE, self).material_override = floor_m
	WorldBuilder.cyl(4.6, 44.0, Vector3(0, -22.2, 0), Color(0.5, 0.48, 0.46), self, 4.4) # the tower itself, down to the ground
	for i in 12: # floorboards
		WorldBuilder.box(Vector3(8.4, 0.012, 0.03), Vector3(0, 0.006, -3.8 + i * 0.7), Color(0.3, 0.22, 0.16), self)
	# round stone wall, open to the sky above and to the sea on the north side
	var stone := [Art.surface(Color(0.56, 0.54, 0.52), 0.5), Art.surface(Color(0.5, 0.48, 0.47), 0.5)]
	for i in 24:
		var a := TAU * i / 24.0
		var open_side: bool = sin(a) < -0.55 # north: a balcony
		var hgt := 1.0 if open_side else 3.6
		var seg := WorldBuilder.box(Vector3(1.14, hgt, 0.28), Vector3(cos(a) * 4.2, hgt * 0.5, sin(a) * 4.2), Color.WHITE, self)
		seg.material_override = stone[i % 2]
		seg.rotation.y = -a + PI / 2
		if not open_side:
			WorldBuilder.box(Vector3(0.5, 0.5, 0.3), Vector3(cos(a) * 4.2, 3.85, sin(a) * 4.2), Color.WHITE, self).material_override = stone[(i + 1) % 2]
			if i % 3 == 0:
				Art.lantern(self, Vector3(cos(a) * 3.85, 2.4, sin(a) * 3.85), Color(1.0, 0.72, 0.38), i % 6 == 0, 0.12)
	WorldBuilder.cyl(1.7, 0.02, Vector3(0, 0.012, 0.9), Color(0.5, 0.2, 0.22), self)   # rug
	WorldBuilder.cyl(1.3, 0.022, Vector3(0, 0.014, 0.9), Color(0.75, 0.6, 0.35), self)
	for k in 3: # shelves of books by the wall
		WorldBuilder.box(Vector3(1.6, 0.05, 0.32), Vector3(-2.9, 0.5 + k * 0.5, 2.3), Color(0.36, 0.27, 0.19), self).rotation.y = 0.9
		for bk in 9:
			var col := Color.from_hsv(fmod(0.07 * bk + k * 0.31, 1.0), 0.45, 0.55)
			var book := WorldBuilder.box(Vector3(0.07, 0.3, 0.22), Vector3(-2.9, 0.68 + k * 0.5, 2.3) + Vector3(cos(-0.9), 0, sin(-0.9)) * (bk * 0.16 - 0.65), col, self)
			book.rotation.y = 0.9
	var lamp := OmniLight3D.new()
	lamp.position = Vector3(0, 2.5, 0.2)
	lamp.omni_range = 9.0
	lamp.light_energy = 1.3
	lamp.light_color = Color(1.0, 0.9, 0.78)
	lamp.shadow_enabled = true
	add_child(lamp)
	Art.lantern(self, Vector3(0, 2.9, 1.6), Color(1.0, 0.8, 0.5), false, 0.1)
	Art.motes(self, Vector3(0, 1.6, 0), Vector3(3, 1.4, 3), Color(1.0, 0.9, 0.7, 0.5), 40, 0.012, 0.01)

func _build_desk() -> void:
	desk = Node3D.new()
	desk.position = Vector3(0, 0, -0.1)
	add_child(desk)
	WorldBuilder.box(Vector3(1.9, 0.05, 0.85), Vector3(0, 0.76, 0), Color(0.36, 0.3, 0.25), desk)
	Art.lantern(desk, Vector3(-0.86, 0.86, 0.32), Color(1.0, 0.82, 0.5), false, 0.05)
	Art.lantern(desk, Vector3(0.86, 0.86, -0.34), Color(1.0, 0.82, 0.5), false, 0.05)
	for x in [-0.85, 0.85]:
		for z in [-0.35, 0.35]:
			WorldBuilder.box(Vector3(0.07, 0.75, 0.07), Vector3(x, 0.375, z), Color(0.33, 0.24, 0.16), desk)
	# four element trays along the back of the desk
	for i in TRAY_ORDER.size():
		var el: String = TRAY_ORDER[i]
		var tray := Node3D.new()
		tray.position = Vector3(-0.66 + 0.44 * i, 0.79, -0.22)
		desk.add_child(tray)
		WorldBuilder.box(Vector3(0.4, 0.012, 0.3), Vector3(0, 0, 0), Look.el_color(el).darkened(0.5), tray)
		var lab := WorldBuilder.label(el, Vector3(0, 0.02, -0.17), 0.0009, tray, false)
		lab.rotation.x = -0.9
		lab.modulate = Look.el_color(el)
		trays[el] = tray
	# the open pouch
	pouch_node = Node3D.new()
	pouch_node.position = Vector3(0.62, 0.79, 0.2)
	desk.add_child(pouch_node)
	var bag := WorldBuilder.cyl(0.09, 0.07, Vector3(0, 0.035, 0), Color(0.45, 0.3, 0.17), pouch_node, 0.11)
	bag.name = "bag"
	pouch_label = WorldBuilder.label("", Vector3(0, 0.13, 0), 0.001, pouch_node)

func _build_hooks() -> void:
	# saved pouches hang from hooks on the wall to the right of the desk
	for i in Game.data.pouches.size():
		var h := Hook.new()
		h.tower = self
		h.index = i
		h.position = Vector3(1.75, 1.35 - 0.0 * i, -0.9 + 0.42 * i)
		h.rotation.y = -PI / 2
		add_child(h)
		hooks.append(h)

func _build_cases() -> void:
	# display cases climb the spiral stair along the wall
	for i in CASE_SLOTS:
		var a := PI * 0.62 + i * 0.2
		var r := 3.5
		var y := 0.15 + i * 0.22
		var step := WorldBuilder.box(Vector3(0.9, 0.08, 0.6), Vector3(cos(a) * r, y, sin(a) * r), Color(0.4, 0.33, 0.27), self)
		step.rotation.y = -a
		var slot := Node3D.new()
		slot.position = Vector3(cos(a) * (r + 0.35), y + 0.75, sin(a) * (r + 0.35))
		add_child(slot)
		WorldBuilder.box(Vector3(0.14, 0.7, 0.14), slot.position - Vector3(0, 0.4, 0), Color(0.3, 0.26, 0.22), self)
		var glass := WorldBuilder.box(Vector3(0.16, 0.16, 0.16), Vector3(0, 0.04, 0), Color(0.7, 0.85, 0.95, 0.18), slot)
		glass.name = "glass"
		case_slots.append(slot)

func _build_doors() -> void:
	var post := Node3D.new()
	post.position = Vector3(1.1, 1.2, 1.9)
	post.rotation.y = PI
	add_child(post)
	WorldBuilder.label("Leave the tower", Vector3(0, 0.3, 0), 0.0012, post, false)
	post.add_child(PanelButton.make("Practice match", Vector3(0, 0.2, 0), _practice_match, 0.3))
	post.add_child(PanelButton.make("Town", Vector3(0, 0.12, 0), func(): _go("res://scenes/town.tscn"), 0.3))
	post.add_child(PanelButton.make("Workshop", Vector3(0, 0.04, 0), func(): _go("res://scenes/workshop.tscn"), 0.3))
	post.add_child(PanelButton.make("The wilds", Vector3(0, -0.04, 0), func(): _go("res://scenes/wilds.tscn"), 0.3))
	post.add_child(PanelButton.make("Sandbox on the desk", Vector3(0, -0.14, 0), open_sandbox, 0.3))

func _go(path: String) -> void:
	if ResourceLoader.exists(path):
		Game.save_game()
		Game.goto(path)

func _practice_match() -> void:
	var toks := Game.pouch_tokens()
	if toks.is_empty():
		return
	Game.save_game()
	Game.match_request = {"pouch": toks, "return_to": "res://scenes/tower.tscn"}
	Game.goto("res://scenes/match.tscn")

# ---------------------------------------------------------------- laying out the collection

## Rebuild every coin, tag and count from the save data.
func refresh() -> void:
	for c in tray_coins.values():
		if is_instance_valid(c):
			c.queue_free()
	tray_coins.clear()
	for t in tags:
		t.queue_free()
	tags.clear()
	var per_tray := {}
	var sorted: Array = Game.data.collection.duplicate()
	sorted.sort_custom(func(a, b): return a.name < b.name if a.name != b.name else a.id < b.id)
	for tok in sorted:
		if loose.has(tok.id):
			continue
		var place := Game.token_place(tok.id)
		if place == "tray":
			var n: int = per_tray.get(tok.element, 0)
			per_tray[tok.element] = n + 1
			var c := _make_coin(tok)
			var tray: Node3D = trays[tok.element]
			tray.add_child(c)
			# coins are small: a tray holds many, stacked in layers
			var layer := int(n / 30.0)
			var k := n % 30
			c.position = Vector3(-0.16 + 0.064 * (k % 6), 0.012 + layer * 0.006, -0.11 + 0.055 * int(k / 6.0))
			tray_coins[tok.id] = c
		elif place == "showcase":
			var si: int = Game.data.showcase.find(tok.id)
			if si < case_slots.size():
				var c2 := _make_coin(tok)
				case_slots[si].add_child(c2)
				c2.position = Vector3(0, 0.03, 0)
				c2.rotation.x = PI / 2 # stood up to show its face
				tray_coins[tok.id] = c2
	# the open pouch: live count out of 25 and one tag per token
	var p := Game.open_pouch()
	pouch_label.text = "%s\n%d / %d" % [p.name, p.ids.size(), DyaEconomy.POUCH_SIZE]
	var i := 0
	for id in p.ids:
		var tok2 := Game.token_by_id(id)
		if tok2.is_empty():
			continue
		var tag := Tag.new()
		tag.tower = self
		tag.tok = tok2
		pouch_node.add_child(tag)
		tag.position = Vector3(-0.19 + 0.095 * (i % 5), 0.2 + 0.035 * int(i / 5.0), 0)
		tags.append(tag)
		i += 1
	for h in hooks:
		h.refresh()
	if panel != null:
		panel.refresh()

func _make_coin(tok: Dictionary) -> TokenCoin:
	var c := TokenCoin.make(tok, SpeciesDB.get_sp(tok.species))
	c.let_go.connect(_coin_released)
	c.grabbed.connect(_coin_grabbed)
	c.woke.connect(_coin_woke)
	return c

func _coin_grabbed(c: TokenCoin, _hand: Hand) -> void:
	var id: String = c.tok.id
	if tray_coins.get(id) == c:
		tray_coins.erase(id)
		Game.take_from_everywhere(id) # out of its case or tray while it is in your hand
	loose[id] = c
	if c.get_parent() != self:
		var xf := c.global_transform
		c.get_parent().remove_child(c)
		add_child(c)
		c.global_transform = xf
	_dirty()

func _coin_released(c: TokenCoin, _hand: Hand, _velocity: Vector3) -> void:
	var id: String = c.tok.id
	var p := c.global_position
	loose.erase(id)
	if hologram != null and hologram.coin == c:
		if hologram._free:
			hologram.coin = c # stays until put to sleep
		_close_hologram()
	if sandbox != null and sandbox.field_contains(p):
		sandbox.add_token(c.tok, p)          # swap it into the sandbox; the coin goes home
	elif p.distance_to(pouch_node.global_position) < 0.2:
		if not Game.add_to_pouch(id):
			Game.sfx.play("deny")           # the pouch is full at 25
		else:
			Game.sfx.play("coin", p)
	else:
		var placed := false
		for i in case_slots.size():
			if p.distance_to(case_slots[i].global_position) < 0.22 and Game.data.showcase.size() < CASE_SLOTS:
				Game.take_from_everywhere(id)
				Game.data.showcase.append(id)
				placed = true
				break
		if not placed:
			Game.take_from_everywhere(id)   # back to its element tray
	c.queue_free()
	Game.save_game()
	refresh()

func _dirty() -> void:
	Game.save_game()
	refresh()

## A token chosen on the browse panel lifts out of its tray and floats to your hand.
func _panel_picked(tok: Dictionary, hand: Hand) -> void:
	var id: String = tok.id
	if loose.has(id):
		return
	var c: TokenCoin = tray_coins.get(id)
	var from: Vector3
	if c != null:
		from = c.global_position
		tray_coins.erase(id)
		c.queue_free()
	else:
		from = pouch_node.global_position
	Game.take_from_everywhere(id)
	var nc := _make_coin(tok)
	add_child(nc)
	nc.global_position = from
	loose[id] = nc
	var target := hand.global_position + Vector3(0, 0.07, 0)
	nc.fly_to(target, 0.7, 0.15)
	_dirty()

func take_from_tag(tok: Dictionary, hand: Hand) -> Node3D:
	Game.take_from_everywhere(tok.id)
	var c := _make_coin(tok)
	add_child(c)
	c.global_position = hand.global_position
	loose[tok.id] = c
	_dirty.call_deferred()
	return c.on_grab(hand)

func select_pouch(i: int) -> void:
	Game.data.open_pouch = i
	Game.sfx.play("coin", pouch_node.global_position)
	_dirty()

# ---------------------------------------------------------------- inspecting and the sandbox

func _coin_woke(c: TokenCoin, _hand: Hand) -> void:
	if hologram != null:
		var same := hologram.coin == c
		_close_hologram()
		if same:
			return
	hologram = TokenHologram.wake(c.tok, c.sp, c)
	add_child(hologram)
	hologram.duel.connect(_duel)
	Game.sfx.play("spawn", c.global_position)

func _close_hologram() -> void:
	if hologram != null:
		hologram.queue_free()
		hologram = null

func open_sandbox() -> void:
	if sandbox != null:
		return
	sandbox = Sandbox.new()
	add_child(sandbox)
	sandbox.open(desk.to_global(Vector3(-0.1, 0.8, 0.2)), Vector3(1, 0, 0), 0.8)
	sandbox.closed.connect(func(): sandbox = null)

## The Duel option beside an awake hologram puts that token in the sandbox.
func _duel(tok: Dictionary) -> void:
	open_sandbox()
	sandbox.add_token(tok)

# ---------------------------------------------------------------- small parts

class Tag:
	extends Node3D
	## One token in the open pouch: a small tag with its cost and element. Grip it to pull the coin out.
	var tower
	var tok: Dictionary
	var grab_radius := 0.035

	func _ready() -> void:
		var col := Look.el_color(tok.element)
		WorldBuilder.box(Vector3(0.088, 0.03, 0.003), Vector3.ZERO, col.darkened(0.5), self)
		var j := Look.jewel(tok.element, true)
		j.scale = Vector3.ONE * 0.012
		j.position = Vector3(-0.034, 0, 0.004)
		add_child(j)
		WorldBuilder.label("%s  %d" % [tok.name.left(11), DyaToken.cost_sum(tok.cost)], Vector3(0.008, 0, 0.003), 0.00035, self, false)
		add_to_group("grabbable")

	func on_grab(hand: Hand):
		return tower.take_from_tag(tok, hand)

class Hook:
	extends Node3D
	## A saved pouch hanging on its hook. Touch it (or laser + A) to make it the open pouch on the desk.
	var tower
	var index := 0
	var touch_radius := 0.09
	var bag: MeshInstance3D
	var lab: Label3D

	func _ready() -> void:
		WorldBuilder.cyl(0.01, 0.1, Vector3(0, 0.16, -0.05), Color(0.2, 0.2, 0.2), self)
		bag = WorldBuilder.ball(0.08, Vector3.ZERO, Color(0.45, 0.3, 0.17), self)
		lab = WorldBuilder.label("", Vector3(0, -0.14, 0), 0.0008, self)
		add_to_group("touchable")
		add_to_group("laser_target")

	func refresh() -> void:
		var p: Dictionary = Game.data.pouches[index]
		var is_open: bool = Game.data.open_pouch == index
		bag.visible = not is_open
		lab.text = "%s\n%s" % [p.name, "on the desk" if is_open else "%d / %d" % [p.ids.size(), DyaEconomy.POUCH_SIZE]]

	func on_touch(hand: Hand) -> void:
		if Game.data.open_pouch != index:
			hand.rumble(0.4, 0.05)
			tower.select_pouch(index)

	func on_laser(hand: Hand) -> void:
		on_touch(hand)
