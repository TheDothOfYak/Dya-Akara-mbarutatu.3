extends Node3D
## The workshop: hands-on crafting. Pick a piece from the rack, pour NgAkara
## along its veins, seat it in the Okid'Relic, close it; the creature's song
## plays, runes circle, and the finished token lands in your hand. The ritual
## can be skipped. Singing is not required (no microphone).

var rig: XRRig
var rack: Node3D
var bench: Node3D
var pour_spot: Node3D
var relic: Node3D
var lid: Node3D
var vial: Vial
var okid_label: Label3D
var hint: Label3D
var piece_nodes: Array = []
var current: PieceNode = null
var step := "pick" # pick -> pour -> seat -> close -> song -> done
var poured := 0.0
var song_player: AudioStreamPlayer3D
var runes: Array = []
var last_token := {}
var _song_t := 0.0

func _ready() -> void:
	Game.ensure_game()
	add_child(WorldBuilder.sky_environment(Color(0.4, 0.5, 0.65), Color(0.25, 0.22, 0.2)))
	add_child(WorldBuilder.sun())
	WorldBuilder.box(Vector3(8, 0.1, 8), Vector3(0, -0.05, 0), Color(0.36, 0.29, 0.23), self)
	for w in [[Vector3(0, 1.5, -3), Vector3(8, 3, 0.2)], [Vector3(-4, 1.5, 0), Vector3(0.2, 3, 8)], [Vector3(4, 1.5, 0), Vector3(0.2, 3, 8)]]:
		WorldBuilder.box(w[1], w[0], Color(0.5, 0.44, 0.38), self)
	var lamp := OmniLight3D.new()
	lamp.position = Vector3(0, 2.4, -0.5)
	lamp.omni_range = 8.0
	add_child(lamp)
	rig = XRRig.new()
	add_child(rig)
	rig.place(Vector3(0, 0, 0.55), 0.0)
	Game.sfx.music("tower")
	_build_bench()
	_build_rack()
	song_player = AudioStreamPlayer3D.new()
	song_player.bus = "Priority"
	relic.add_child(song_player)
	var post := Node3D.new()
	post.position = Vector3(1.6, 1.2, 1.2)
	post.rotation.y = PI
	add_child(post)
	post.add_child(PanelButton.make("Back to town", Vector3(0, 0.1, 0), func(): _leave("res://scenes/town.tscn"), 0.3))
	post.add_child(PanelButton.make("To the tower", Vector3(0, 0, 0), func(): _leave("res://scenes/tower.tscn"), 0.3))
	_set_step("pick")
	if Game.args.has("autoplay"):
		var bot = load("res://tools/workshop_bot.gd").new()
		bot.scene = self
		add_child(bot)
	Shots.maybe(self)

func _leave(path: String) -> void:
	Game.save_game()
	Game.goto(path)

func _build_bench() -> void:
	bench = Node3D.new()
	bench.position = Vector3(0, 0, -0.25)
	add_child(bench)
	WorldBuilder.box(Vector3(1.8, 0.06, 0.7), Vector3(0, 0.8, 0), Color(0.42, 0.31, 0.21), bench)
	for x in [-0.8, 0.8]:
		WorldBuilder.box(Vector3(0.08, 0.8, 0.6), Vector3(x, 0.4, 0), Color(0.33, 0.24, 0.16), bench)
	# where the piece lies while you pour
	pour_spot = Node3D.new()
	pour_spot.position = Vector3(-0.15, 0.84, 0.05)
	bench.add_child(pour_spot)
	WorldBuilder.cyl(0.09, 0.008, Vector3.ZERO, Color(0.25, 0.25, 0.3), pour_spot)
	# the Okid'Relic: an open shell the piece is seated in, with a lid
	relic = Node3D.new()
	relic.position = Vector3(0.3, 0.84, 0.05)
	bench.add_child(relic)
	WorldBuilder.cyl(0.08, 0.05, Vector3(0, 0.025, 0), Color(0.62, 0.58, 0.5), relic, 0.1)
	lid = Lid.new()
	lid.shop = self
	lid.position = Vector3(0.16, 0.03, 0)
	relic.add_child(lid)
	# your materials: Okid stacked on the bench, NgAkara in its vial
	okid_label = WorldBuilder.label("", Vector3(-0.7, 1.0, -0.2), 0.0008, bench)
	vial = Vial.new()
	vial.shop = self
	vial.home = Vector3(-0.45, 0.9, 0.1)
	vial.position = vial.home
	bench.add_child(vial)
	hint = WorldBuilder.label("", Vector3(0, 1.5, -0.3), 0.0011, bench)
	bench.add_child(PanelButton.make("Skip the ritual", Vector3(0.7, 0.9, 0.2), skip, 0.26, 0.0009))
	bench.add_child(PanelButton.make("Shelve this piece", Vector3(0.7, 0.98, 0.2), shelve, 0.26, 0.0009))
	_refresh_materials()

func _refresh_materials() -> void:
	var parts := []
	for r in 7:
		if int(Game.data.okid[r]) > 0:
			parts.append("%s ×%d" % [DyaEconomy.RARITIES[r], int(Game.data.okid[r])])
	okid_label.text = "Okid: %s\nNgAkara: %d" % [", ".join(parts) if not parts.is_empty() else "none", int(Game.data.ngakara)]
	vial.set_level(int(Game.data.ngakara))
	for p in piece_nodes:
		if is_instance_valid(p):
			p.tag.text = Crafting.tag_text(Game.data, p.piece)

func _build_rack() -> void:
	rack = Node3D.new()
	rack.position = Vector3(-1.3, 0, -0.9)
	rack.rotation.y = 0.6
	add_child(rack)
	WorldBuilder.box(Vector3(1.2, 1.5, 0.08), Vector3(0, 0.95, -0.06), Color(0.36, 0.27, 0.19), rack)
	var i := 0
	for p in Game.data.pieces + Game.data.shelf:
		var n := PieceNode.new()
		n.shop = self
		n.piece = p
		n.home = Vector3(-0.42 + 0.42 * (i % 3), 1.45 - 0.42 * int(i / 3.0), 0.05)
		n.position = n.home
		rack.add_child(n)
		piece_nodes.append(n)
		i += 1
	if i == 0:
		WorldBuilder.label("The rack is empty.\nBring a piece back from a hunt.", Vector3(0, 1.2, 0.05), 0.0012, rack, false)

func _set_step(s: String) -> void:
	step = s
	var txt := {"pick": "Pick a piece from the rack and lay it on the dark plate.",
		"pour": "Tilt the NgAkara vial and pour along the veins of the piece.",
		"seat": "Set the piece into the Okid'Relic.", "close": "Close the Okid'Relic (touch the lid).",
		"song": "The creature's song plays.", "done": "The token is yours. It is also in your tower."}
	hint.text = txt.get(s, "")

# ---------------------------------------------------------------- the ritual

func piece_released(n: PieceNode) -> void:
	var p := n.global_position
	if p.distance_to(pour_spot.global_position) < 0.18 and (step == "pick" or step == "pour"):
		if current != null and current != n:
			current.go_home()
		current = n
		n.rest_at(pour_spot, Vector3(0, 0.02, 0))
		poured = n.fill
		_set_step("pour" if poured < 1.0 else "seat")
	elif p.distance_to(relic.global_position) < 0.18 and n == current and step == "seat":
		n.rest_at(relic, Vector3(0, 0.05, 0))
		_set_step("close")
	else:
		if n == current and step != "song":
			current = null
			_set_step("pick")
		n.go_home()

## Called while the vial is tilted over the piece.
func pour(delta: float) -> void:
	if step != "pour" or current == null:
		return
	var c := Crafting.can_craft(Game.data, current.piece)
	if not c.ok:
		hint.text = "The piece will not take the fluid: not enough materials.\n" + Crafting.tag_text(Game.data, current.piece)
		return
	poured = min(1.0, poured + delta / 2.5)
	current.set_fill(poured)
	if poured >= 1.0:
		Game.sfx.play("paid", current.global_position)
		_set_step("seat")

func close_relic() -> void:
	if step != "close" or current == null:
		return
	lid.position = Vector3(0, 0.07, 0)
	Game.sfx.play("land", relic.global_position)
	_set_step("song")
	_song_t = 0.0
	song_player.stream = Game.sfx.song_for(SpeciesDB.get_sp(current.piece.species))
	song_player.play()
	for i in 8:
		var r := WorldBuilder.box(Vector3(0.012, 0.03, 0.004), Vector3.ZERO, Color(0.4, 0.85, 1.0), relic)
		r.material_override.emission_enabled = true
		r.material_override.emission = Color(0.4, 0.85, 1.0)
		runes.append(r)

func skip() -> void:
	if current == null or step == "song" or step == "done":
		return
	_finish()

## Proposed: a shelf for pieces you are not ready to craft.
func shelve() -> void:
	if current == null or step == "song":
		return
	var p: Dictionary = current.piece
	if Game.data.pieces.has(p):
		Game.data.pieces.erase(p)
		Game.data.shelf.append(p)
	current.go_home()
	current = null
	_set_step("pick")
	Game.save_game()

func _finish() -> void:
	var tok := Crafting.craft(Game.data, current.piece)
	for r in runes:
		r.queue_free()
	runes.clear()
	song_player.stop()
	lid.position = Vector3(0.16, 0.03, 0)
	if tok.is_empty():
		hint.text = "Crafting refused: not enough materials.\n" + Crafting.tag_text(Game.data, current.piece)
		current.go_home()
		current = null
		step = "pick"
		return
	last_token = tok
	piece_nodes.erase(current)
	current.queue_free()
	current = null
	Game.save_game()
	_refresh_materials()
	# the finished token lands in your hand
	var coin := TokenCoin.make(tok, SpeciesDB.get_sp(tok.species))
	add_child(coin)
	coin.global_position = relic.global_position + Vector3(0, 0.1, 0)
	var hand := rig.dominant()
	coin.fly_to(hand.global_position + Vector3(0, 0.04, 0), 0.8, 0.2, func():
		if hand.held == null:
			hand.held = coin.on_grab(hand))
	coin.let_go.connect(func(c, _h, _v): c.queue_free()) # set it down and it goes to your tower
	hand.rumble(0.6, 0.2)
	Game.sfx.play("win", null, true)
	_set_step("done")
	get_tree().create_timer(4.0).timeout.connect(func(): if step == "done": _set_step("pick"))

func _process(delta: float) -> void:
	if step == "song":
		_song_t += delta
		for i in runes.size():
			var a := _song_t * 2.0 + TAU * i / runes.size()
			runes[i].position = Vector3(cos(a) * 0.14, 0.1 + sin(_song_t * 3.0 + i) * 0.02, sin(a) * 0.14)
		if _song_t > 4.0:
			_finish()

class PieceNode:
	extends Node3D
	## A piece brought back from a hunt. Its tag shows what it becomes and what it costs.
	var shop
	var piece: Dictionary
	var home: Vector3
	var grab_radius := 0.1
	var fill := 0.0
	var tag: Label3D
	var _veins: MeshInstance3D

	func _ready() -> void:
		var sp := SpeciesDB.get_sp(piece.species)
		var m := WorldBuilder.box(Vector3(0.09, 0.025, 0.05), Vector3.ZERO, Color(sp.placeholder.color).lightened(0.2), self)
		m.rotation.y = 0.4
		_veins = WorldBuilder.box(Vector3(0.08, 0.004, 0.012), Vector3(0, 0.015, 0), Color(0.15, 0.2, 0.3), self)
		_veins.rotation.y = 0.4
		tag = WorldBuilder.label(Crafting.tag_text(Game.data, piece), Vector3(0, -0.12, 0.01), 0.0006, self)
		add_to_group("grabbable")

	func set_fill(f: float) -> void:
		fill = f
		# electric-blue fluid sets along the veins as it meets the air
		var col := Color(0.15, 0.2, 0.3).lerp(Color(0.2, 0.75, 1.0), f)
		_veins.material_override.albedo_color = col
		_veins.material_override.emission_enabled = f > 0.0
		_veins.material_override.emission = col
		_veins.scale = Vector3(1, 1.0 + f, 1.0 + f * 2.0)

	func on_grab(hand: Hand):
		if shop.step == "song":
			return null
		tag.visible = false
		var xf := global_transform
		get_parent().remove_child(self)
		shop.add_child(self)
		global_transform = xf
		return self

	func on_release(_hand: Hand, _velocity: Vector3) -> void:
		shop.piece_released(self)

	func rest_at(parent: Node3D, offset: Vector3) -> void:
		get_parent().remove_child(self)
		parent.add_child(self)
		position = offset
		rotation = Vector3.ZERO

	func go_home() -> void:
		get_parent().remove_child(self)
		shop.rack.add_child(self)
		position = home
		rotation = Vector3.ZERO
		tag.visible = true

class Vial:
	extends Node3D
	## The NgAkara vial. Hold it over the piece and tilt it to pour.
	var shop
	var home: Vector3
	var grab_radius := 0.09
	var holder: Hand = null
	var _fluid: MeshInstance3D
	var _stream: MeshInstance3D
	var level := 0

	func _ready() -> void:
		WorldBuilder.cyl(0.022, 0.09, Vector3.ZERO, Color(0.8, 0.9, 1.0, 0.35), self)
		_fluid = WorldBuilder.cyl(0.018, 0.07, Vector3(0, -0.008, 0), Color(0.2, 0.75, 1.0), self)
		_fluid.material_override.emission_enabled = true
		_fluid.material_override.emission = Color(0.2, 0.75, 1.0)
		_stream = WorldBuilder.cyl(0.004, 0.2, Vector3.ZERO, Color(0.2, 0.75, 1.0), self)
		_stream.top_level = true
		_stream.visible = false
		add_to_group("grabbable")

	func set_level(n: int) -> void:
		level = n
		_fluid.visible = n > 0 # short of NgAkara: the bottle is visibly empty

	func on_grab(hand: Hand):
		holder = hand
		return self

	func on_release(_hand: Hand, _velocity: Vector3) -> void:
		holder = null
		position = home
		rotation = Vector3.ZERO
		_stream.visible = false

	func _process(delta: float) -> void:
		if holder == null:
			return
		var tilted: bool = global_transform.basis.y.normalized().dot(Vector3.UP) < 0.45 and level > 0
		_stream.visible = tilted
		if not tilted:
			return
		_stream.global_position = global_position - Vector3(0, 0.1, 0)
		_stream.global_rotation = Vector3.ZERO
		if shop.current != null:
			var d := Vector2(global_position.x - shop.current.global_position.x, global_position.z - shop.current.global_position.z).length()
			if d < 0.16 and global_position.y > shop.current.global_position.y:
				shop.pour(delta)
				if Engine.get_physics_frames() % 20 == 0:
					Game.sfx.play("pour", global_position)

class Lid:
	extends Node3D
	var shop
	var touch_radius := 0.07

	func _ready() -> void:
		WorldBuilder.cyl(0.1, 0.02, Vector3.ZERO, Color(0.55, 0.52, 0.45), self)
		add_to_group("touchable")
		add_to_group("laser_target")

	func on_touch(_hand: Hand) -> void:
		shop.close_relic()

	func on_laser(hand: Hand) -> void:
		on_touch(hand)
