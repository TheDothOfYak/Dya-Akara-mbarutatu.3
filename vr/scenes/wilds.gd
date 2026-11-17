extends Node3D
## The wilds around Sri'Ciakala. You hunt as yourself: walk out, find a
## creature, and get a piece any way you can (pick up a shed scale, shave a
## calm creature, trap it, or fight it down and spare it). Weapons must be
## held and really swung. Hunger and tiredness drain while you are away.
## The hunt ends when you walk back through the gate.

var rig: XRRig
var hunt: Dictionary
var wilds: Dictionary
var beasts: Array = []
var sheds: Array = []
var traps: Array = []
var held_weapons: Array = []
var wrist: Label3D
var notice: Label3D
var belt: Node3D
var camp: Node3D = null
var sandbox: Sandbox = null
var _min_acc := 0.0
var guide_marker: MeshInstance3D = null

func _ready() -> void:
	Game.ensure_game()
	Wilds.ensure(Game.data)
	wilds = Game.data.wilds
	hunt = HuntRules.new_hunt()
	Art.light_scene(self, "morning")
	_build_land()
	rig = XRRig.new()
	add_child(rig)
	rig.place(Vector3(0, 0, 4), PI)
	Game.sfx.music("wilds")
	notice = WorldBuilder.label("", Vector3.ZERO, 0.0012, self)
	notice.visible = false
	wrist = WorldBuilder.label("", Vector3(0, 0.06, 0.05), 0.0005, rig.off_hand())
	_build_belt()
	for c in wilds.creatures:
		if c.alive:
			var b := Beast.new()
			b.scene = self
			b.c = c
			add_child(b)
			beasts.append(b)
	for s in wilds.sheds:
		var sn := ShedNode.new()
		sn.scene = self
		sn.shed = s
		sn.position = Vector3(float(s.x), 0.05, float(s.z))
		add_child(sn)
		sheds.append(sn)
	if Game.data.flags.has("guide_to"):
		var target := WildsSim.by_id(wilds, Game.data.flags.guide_to)
		if not target.is_empty():
			# the guide you paid marks the way to the creature
			guide_marker = WorldBuilder.cyl(0.15, 30.0, Vector3(float(target.x), 15, float(target.z)), Color(1, 0.9, 0.4, 0.4), self)
			say("%s leads you toward the %s." % [Game.data.flags.get("guide_name", "Your guide"), TownData.HABITAT_NAMES.get(target.habitat, "wilds")])
		Game.data.flags.erase("guide_to")
	if Game.args.has("autoplay"):
		var bot = load("res://tools/wilds_bot.gd").new()
		bot.scene = self
		add_child(bot)
	LookBot.maybe(self, rig)
	Shots.maybe(self)

# ---------------------------------------------------------------- the land

## The ground you walk on is level; the land rises beyond the hunting ground
## and falls away under the sea to the north.
static func land_h(x: float, z: float) -> float:
	var out := smoothstep(WildsSim.SIZE * 0.9, WildsSim.SIZE * 1.5, Vector2(x, z).length())
	var sea := smoothstep(-96.0, -125.0, z) * -1.4
	return out * (6.0 + Art.fbm2(x * 0.01, z * 0.01) * 38.0) + sea * (1.0 - out)

static func habitat_weight(k: String, x: float, z: float) -> float:
	var h: Dictionary = WildsSim.HABITATS[k]
	return smoothstep(float(h.r) * 1.15, float(h.r) * 0.6, Vector2(x - h.x, z - h.z).length())

static func land_col(x: float, z: float, y: float) -> Color:
	var c := Color(0.3, 0.5, 0.24).lerp(Color(0.46, 0.6, 0.28), Art.fbm2(x * 0.05, z * 0.05))
	c = c.lerp(Color(0.86, 0.78, 0.58), max(habitat_weight("shore", x, z), smoothstep(-80.0, -100.0, z)))
	c = c.lerp(Color(0.16, 0.34, 0.17), habitat_weight("forest", x, z) * 0.8)
	c = c.lerp(Color(0.27, 0.3, 0.17), habitat_weight("bog", x, z))
	c = c.lerp(Color(0.52, 0.5, 0.47), habitat_weight("sky", x, z) * 0.85)
	c = c.lerp(Color(0.5, 0.5, 0.5), smoothstep(14.0, 34.0, y))
	return c

func _build_land() -> void:
	add_child(Art.terrain(WildsSim.SIZE * 3.6, 130, land_h, land_col))
	add_child(Art.water(Vector2(WildsSim.SIZE * 3.6, 300), Vector3(0, -0.35, -245), Vector2(0, 1), -100.0))
	var rng := RandomNumberGenerator.new()
	rng.seed = int(wilds.seed)
	var f: Dictionary = WildsSim.HABITATS.forest
	for i in 90:
		var a := rng.randf() * TAU
		var d := sqrt(rng.randf()) * float(f.r) * 1.15
		Art.tree(self, Vector3(f.x + cos(a) * d, -0.2, f.z + sin(a) * d), rng.randf_range(8, 19), i, Color(0.05, 0.24, 0.12), Color(0.34, 0.62, 0.26))
	Art.motes(self, Vector3(f.x, 2.0, f.z), Vector3(f.r, 2.0, f.r), Color(0.8, 1.0, 0.5, 0.9), 160, 0.05)
	# the bog: still dark pools, reeds, low mist
	var b: Dictionary = WildsSim.HABITATS.bog
	for i in 26:
		var a2 := rng.randf() * TAU
		var d2 := sqrt(rng.randf()) * float(b.r)
		var pool := Art.add_mesh(self, Art.blob(i % 4, 0.25), Art.surface(Color(0.1, 0.16, 0.1, 0.82)), Vector3(b.x + cos(a2) * d2, 0.02, b.z + sin(a2) * d2), Vector3(rng.randf_range(2, 6), 0.03, rng.randf_range(2, 5)))
		pool.material_override.roughness = 0.05
		pool.material_override.metallic = 0.4
		if i % 3 == 0:
			Art.tree(self, pool.position + Vector3(rng.randf_range(-6, 6), -0.2, rng.randf_range(-6, 6)), rng.randf_range(5, 9), 200 + i, Color(0.16, 0.24, 0.12), Color(0.42, 0.48, 0.24))
	var in_bog := func(x: float, z: float) -> bool: return habitat_weight("bog", x, z) > 0.2
	Art.grass(self, 3500, Rect2(b.x - b.r, b.z - b.r, b.r * 2.0, b.r * 2.0), in_bog, land_h, Color(0.2, 0.26, 0.12), Color(0.62, 0.6, 0.32), 1.5, 21)
	Art.motes(self, Vector3(b.x, 0.5, b.z), Vector3(b.r, 0.5, b.r), Color(0.85, 0.92, 0.85, 0.25), 120, 0.9, 0.01)
	# the cliffs: tall weathered stone under the open sky where the flyers nest
	var s: Dictionary = WildsSim.HABITATS.sky
	for i in 34:
		var a3 := rng.randf() * TAU
		var d3 := sqrt(rng.randf()) * float(s.r) * 1.1
		var hgt := rng.randf_range(7, 30)
		var w := rng.randf_range(2.0, 6.5)
		Art.rock(self, Vector3(s.x + cos(a3) * d3, hgt * 0.42, s.z + sin(a3) * d3), Vector3(w, hgt * 0.6, w * rng.randf_range(0.7, 1.2)), i, Color(0.56, 0.54, 0.52).lerp(Color(0.66, 0.6, 0.52), rng.randf()))
	# the shore: boulders, driftwood, spray
	var sh: Dictionary = WildsSim.HABITATS.shore
	for i in 40:
		var x := rng.randf_range(-150, 150)
		var z := rng.randf_range(-104, -40)
		Art.rock(self, Vector3(x, land_h(x, z) + 0.1, z), Vector3(rng.randf_range(0.4, 2.4), rng.randf_range(0.3, 1.5), rng.randf_range(0.4, 2.2)), i, Color(0.6, 0.58, 0.54))
	Art.motes(self, Vector3(0, 0.7, -100), Vector3(160, 0.7, 6), Color(0.92, 0.98, 1.0, 0.6), 140, 0.06, 0.12)
	# meadow between the habitats
	var meadow := func(x: float, z: float) -> bool:
		return z > -84.0 and habitat_weight("bog", x, z) < 0.3 and habitat_weight("sky", x, z) < 0.5
	Art.grass(self, 8000, Rect2(-170, -84, 340, 260), meadow, land_h, Color(0.12, 0.34, 0.14), Color(0.4, 0.58, 0.27), 0.55, 31)
	Art.grass(self, 1200, Rect2(-150, -60, 300, 200), meadow, land_h, Color(0.2, 0.4, 0.2), Color(0.98, 0.78, 0.86), 0.34, 32)
	Art.grass(self, 1200, Rect2(-150, -60, 300, 200), meadow, land_h, Color(0.2, 0.4, 0.2), Color(0.72, 0.7, 1.0), 0.32, 33)
	for i in 30:
		var a4 := rng.randf() * TAU
		var d4 := rng.randf_range(20, 190)
		var p := Vector3(cos(a4) * d4, -0.2, sin(a4) * d4)
		if meadow.call(p.x, p.z) and habitat_weight("forest", p.x, p.z) < 0.2 and p.length() > 14.0:
			Art.tree(self, p, rng.randf_range(6, 12), 400 + i)
	# the gate back to town stands between the roots of one of the great trees
	var bark := Art.surface(Color(0.28, 0.23, 0.19), 0.3, 1.0)
	Art.ancient_tree(self, Vector3(0, 0, 22), 48.0, 4.4, 3, 0)
	for sx in [-1.0, 1.0]:
		Art.add_mesh(self, Art.tube([Vector3(sx * 2.4, -0.3, 6), Vector3(sx * 2.0, 2.2, 6), Vector3(sx * 0.9, 3.6, 6), Vector3(0, 3.9, 6)], [0.55, 0.45, 0.36, 0.3], 9, 0.25, int(sx) + 5), bark)
		Art.lantern(self, Vector3(sx * 1.5, 2.6, 5.6), Color(1.0, 0.74, 0.4), sx > 0.0)
	WorldBuilder.label("Sri'Ciakala\n(walk through to end the hunt)", Vector3(0, 4.6, 6), 0.006, self)

func _build_belt() -> void:
	# your kit rides on your belt: weapons on the left hip, tools and food on a small panel
	belt = Node3D.new()
	add_child(belt)
	var kit: Dictionary = Game.data.kit
	var i := 0
	for kind in ["blade", "spear", "bow", "whip", "knife"]:
		if kit.get(kind, false):
			var w := Weapon.new()
			w.scene = self
			w.kind = kind
			w.slot = Vector3(-0.3 - 0.07 * i, 0.0, 0.05 * i)
			belt.add_child(w)
			w.position = w.slot
			i += 1
	var menu := Node3D.new()
	menu.name = "menu"
	menu.position = Vector3(0.0, 0.12, -0.42)
	menu.scale = Vector3.ONE * 0.6
	belt.add_child(menu)
	menu.add_child(PanelButton.make("Eat", Vector3(-0.3, 0, 0), _eat, 0.17))
	menu.add_child(PanelButton.make("Trap", Vector3(-0.1, 0, 0), _place_trap, 0.17))
	menu.add_child(PanelButton.make("Bait", Vector3(0.1, 0, 0), _place_bait, 0.17))
	menu.add_child(PanelButton.make("Camp", Vector3(0.3, 0, 0), _make_camp, 0.17))

func say(text: String) -> void:
	notice.text = text
	notice.visible = true
	notice.global_position = rig.head_pos() + rig.head_forward() * 1.3 + Vector3(0, 0.2, 0)
	get_tree().create_timer(5.0).timeout.connect(func(): notice.visible = false)

# ---------------------------------------------------------------- survival, tools, camp

func _eat() -> void:
	say("You eat." if HuntRules.eat(Game.data) else "You have no food.")

func _feet() -> Vector3:
	var p := rig.head_pos() + rig.head_forward() * 1.2
	return Vector3(p.x, 0, p.z)

func _place_trap() -> void:
	if int(Game.data.kit.get("trap", 0)) <= 0:
		say("You have no trap.")
		return
	Game.data.kit.trap = int(Game.data.kit.trap) - 1
	var t := WorldBuilder.cyl(0.6, 0.05, _feet() + Vector3(0, 0.03, 0), Color(0.3, 0.3, 0.32), self)
	t.set_meta("kind", "trap")
	traps.append(t)
	say("Trap set.")

func _place_bait() -> void:
	if int(Game.data.kit.get("bait", 0)) <= 0:
		say("You have no bait.")
		return
	Game.data.kit.bait = int(Game.data.kit.bait) - 1
	var t := WorldBuilder.ball(0.15, _feet() + Vector3(0, 0.15, 0), Color(0.7, 0.3, 0.3), self)
	t.set_meta("kind", "bait")
	traps.append(t)
	say("Bait laid.")

func _make_camp() -> void:
	if camp != null:
		camp.queue_free()
	camp = Node3D.new()
	add_child(camp)
	camp.global_position = _feet()
	camp.rotation.y = atan2(-rig.head_forward().x, -rig.head_forward().z)
	WorldBuilder.box(Vector3(0.8, 0.06, 1.9), Vector3(-1.0, 0.03, 0), Color(0.5, 0.4, 0.3), camp) # bedroll
	WorldBuilder.cyl(0.3, 0.2, Vector3(0.6, 0.1, 0), Color(0.9, 0.5, 0.15), camp, 0.05)        # fire
	camp.add_child(PanelButton.make("Cook food", Vector3(0.6, 0.9, 0), func(): say("A meal is cooked." if HuntRules.cook(Game.data) else "Nothing to cook."), 0.3))
	camp.add_child(PanelButton.make("Sleep", Vector3(-1.0, 0.9, 0), _sleep, 0.3))
	camp.add_child(PanelButton.make("Token sandbox", Vector3(-0.2, 0.9, 0), _camp_sandbox, 0.3))
	say("Camp made.")

func _sleep() -> void:
	HuntRules.sleep(Game.data)
	Game.save_game()
	say("You sleep. A day passes in the wilds.")

## Tokens you carry are holograms out here: they only work in the sandbox.
func _camp_sandbox() -> void:
	if sandbox != null or camp == null:
		return
	var pouch := Game.pouch_tokens()
	if pouch.size() < 2:
		return
	sandbox = Sandbox.new()
	add_child(sandbox)
	sandbox.open(camp.global_position + Vector3(0, 0.5, 1.5), Vector3(1, 0, 0), 1.6)
	sandbox.slots = [pouch[0], pouch[1]]
	sandbox.reset()
	sandbox.closed.connect(func(): sandbox = null)

func blocking() -> bool:
	# hold a weapon up in front of you to block
	for w in held_weapons:
		if w.holder != null and w.global_position.y > rig.head_pos().y - 0.45:
			return true
	return false

func hurt_player(raw: float, from: Vector3) -> void:
	var d := HuntRules.damage_to_player(Game.data, raw, blocking())
	hunt.health = float(hunt.health) - d
	rig.left.rumble(0.9, 0.2)
	rig.right.rumble(0.9, 0.2)
	Game.sfx.play("hit", from)
	if float(hunt.health) <= 0.0:
		_fail("You were beaten.")

func _fail(why: String) -> void:
	var lost := HuntRules.fail(Game.data, hunt)
	Game.data.flags["wake_text"] = "%s You wake in Sri'Ciakala. Lost: %d food, %d new pieces. Your tokens are safe." % [why, lost.food, lost.pieces]
	Game.save_game()
	Game.goto("res://scenes/town.tscn")

func leave() -> void:
	var n := HuntRules.finish(Game.data, hunt)
	Game.data.flags["wake_text"] = "The hunt is over. You brought back %d piece%s. They are on the workshop rack." % [n, "" if n == 1 else "s"]
	Game.save_game()
	Game.goto("res://scenes/town.tscn")

func take_from(b, piece_def: Dictionary) -> void:
	var a := HuntRules.can_take(hunt, b.c, piece_def, Game.data.kit)
	if not a.ok:
		say(a.why)
		return
	var piece := HuntRules.take(hunt, wilds, b.c, piece_def, Game.data.kit)
	Game.sfx.play("coin", b.global_position)
	say("You took a %s from the %s. It is in your bag." % [piece.kind, SpeciesDB.get_sp(b.c.species).name])
	Game.save_game()

func _process(delta: float) -> void:
	# the belt follows your hips
	var head := rig.head_pos()
	var f := rig.head_forward()
	belt.global_position = Vector3(head.x, rig.global_position.y + (head.y - rig.global_position.y) * 0.6, head.z)
	belt.rotation.y = atan2(-f.x, -f.z)
	_min_acc += delta
	if _min_acc >= 2.0:
		HuntRules.survive(Game.data, _min_acc / 60.0)
		_min_acc = 0.0
		Game.move_penalty = HuntRules.move_penalty(Game.data)
		var s: Dictionary = Game.data.survival
		wrist.text = "Health %d\nHunger %d\nRest %d\nFood %d  Meals %d\nPieces %d" % [int(hunt.health), int(s.hunger), int(s.tired),
			int(Game.data.bag.get("food", 0)), int(Game.data.bag.get("meals", 0)), hunt.new_pieces.size()]
	if head.z > 6.0 and absf(head.x) < 1.6 and head.z < 8.0:
		set_process(false)
		leave()

func _exit_tree() -> void:
	Game.move_penalty = 1.0

# ---------------------------------------------------------------- creatures

class Beast:
	extends Node3D
	## One wild individual. Lightly simulated: it keeps to its territory,
	## remembers you, gives a clear tell before it strikes, and yields when beaten.
	var scene
	var c: Dictionary
	var view: CreatureView
	var radius := 1.0
	var touch_radius := 1.0
	var state := "roam"
	var _target: Vector3
	var _t := 0.0
	var _tell := 0.0
	var _stagger := 0.0
	var _hit_cd := 0.0
	var tag: Label3D
	var fly := false
	var alt := 0.0

	func _ready() -> void:
		var sp := SpeciesDB.get_sp(c.species)
		radius = HuntRules.radius_m(c)
		touch_radius = radius + 0.25
		view = CreatureView.make(sp, c.tok)
		view.scale = Vector3.ONE * radius
		add_child(view)
		fly = sp.tags.has("flyer")
		view.flying = fly
		position = Vector3(float(c.x), 0, float(c.z))
		_target = position
		tag = WorldBuilder.label("", Vector3(0, radius * 2.4 + 0.3, 0), 0.004, self)
		add_to_group("touchable")
		add_to_group("wild_beast")

	func body_center() -> Vector3:
		return global_position + Vector3(0, radius * 0.8, 0)

	func _process(delta: float) -> void:
		if not c.alive:
			view.set_state("death")
			tag.text = "Dead"
			return
		_hit_cd = max(0.0, _hit_cd - delta)
		var rs: Dictionary = HuntRules.run_state(scene.hunt, c)
		var head: Vector3 = scene.rig.head_pos()
		var flat := Vector3(head.x, 0, head.z)
		var me := Vector3(position.x, 0, position.z)
		var d := flat.distance_to(me)
		var speed := float(c.tok.stats.speed) * 0.05
		if d < 25.0 and not rs.get("seen", false):
			rs["seen"] = true
			c.memory.seen = int(c.memory.seen) + 1
		if HuntRules.is_downed(c):
			state = "yield"
		elif rs.trapped:
			state = "trapped"
		elif _stagger > 0.0:
			_stagger -= delta
			state = "stagger"
		elif HuntRules.is_hostile(c, rs) and d < 18.0 + radius:
			rs.alerted = true
			state = "attack"
		elif rs.alerted and not HuntRules.is_hostile(c, rs) and d < 10.0:
			state = "flee"
		else:
			state = "roam"
		tag.text = {"yield": "Beaten: it yields", "trapped": "Trapped", "attack": "", "flee": "", "roam": "", "stagger": ""}[state]
		# flyers rest on the ground part of the time; otherwise they circle above
		var want_alt := 0.0
		if fly and state == "roam" and fmod(_t * 0.05 + float(c.territory), 1.0) > 0.4:
			want_alt = 8.0
		alt = move_toward(alt, want_alt, delta * 4.0)
		position.y = alt
		_t += delta
		match state:
			"yield", "trapped", "stagger":
				view.set_state("hurt" if state != "trapped" else "idle")
			"attack":
				var reach := radius + 1.1
				if _tell > 0.0:
					# the tell: it rears back before the blow, so you can step away or block
					_tell -= delta
					view.set_state("attack")
					if _tell <= 0.0:
						if d < reach + 0.4:
							scene.hurt_player(float(c.tok.stats.dmg) * 0.4, body_center())
						_hit_cd = 1.6
				elif d > reach:
					_move_to(flat, speed * 1.3, delta)
				elif _hit_cd <= 0.0:
					_tell = 0.9
					Game.sfx.play("warn", body_center())
			"flee":
				_move_to(me + (me - flat).normalized() * 10.0, speed * 1.3, delta)
			_:
				if me.distance_to(_target) < 1.0 or fmod(_t, 17.0) < delta:
					_target = Vector3(float(c.home_x) + randf_range(-1, 1) * float(c.territory), 0, float(c.home_z) + randf_range(-1, 1) * float(c.territory))
				# bait draws it in; a trap under its feet holds it
				for t in scene.traps:
					if not is_instance_valid(t):
						continue
					if t.get_meta("kind") == "bait" and t.global_position.distance_to(me) < 40.0:
						_target = Vector3(t.global_position.x, 0, t.global_position.z)
						if t.global_position.distance_to(me) < radius + 0.5:
							c.memory.fed = int(c.memory.fed) + 1
							t.queue_free()
				_move_to(_target, speed * 0.5, delta)
		for t in scene.traps:
			if is_instance_valid(t) and t.get_meta("kind") == "trap" and not fly and Vector3(t.global_position.x, 0, t.global_position.z).distance_to(me) < radius + 0.4 and not rs.trapped:
				rs.trapped = true
				Game.sfx.play("land", global_position)
		c.x = position.x
		c.z = position.z

	func _move_to(p: Vector3, spd: float, delta: float) -> void:
		var to := Vector3(p.x - position.x, 0, p.z - position.z)
		if to.length() < 0.2:
			view.set_state("idle")
			return
		var step: Vector3 = to.normalized() * min(to.length(), spd * delta)
		position += step
		rotation.y = lerp_angle(rotation.y, atan2(-to.x, -to.z), min(1.0, delta * 5.0))
		view.set_state("run" if spd > 2.0 else "walk")

	## A weapon's business end reached this creature.
	func struck(kind: String, speed: float, draw := 1.0) -> void:
		if _hit_cd > 0.0 and kind != "bow":
			pass
		var dmg: float = HuntRules.weapon_hit(kind, speed, draw) * HuntRules.strength(Game.data)
		var what := HuntRules.strike(scene.hunt, c, dmg)
		if what == "":
			return
		view.flash_hurt()
		Game.sfx.play("hit", body_center())
		if HuntRules.WEAPONS.get(kind, {}).has("stagger"):
			_stagger = float(HuntRules.WEAPONS[kind].stagger)
		if what == "downed":
			scene.say("The %s is beaten and yields. You can take a piece, or leave it be." % SpeciesDB.get_sp(c.species).name)
		elif what == "dead":
			scene.say("The %s is dead." % SpeciesDB.get_sp(c.species).name)

	## Touching it with the knife in hand works the piece free.
	func on_touch(hand: Hand) -> void:
		var w = hand.held
		if w == null or not (w is Weapon) or w.kind != "knife":
			return
		var defs: Array = SpeciesDB.get_sp(c.species).get("pieces", [])
		var best := {}
		for p in defs:
			if p.method == "pickup":
				continue
			if HuntRules.can_take(scene.hunt, c, p, Game.data.kit).ok:
				best = p
				break
			if best.is_empty():
				best = p
		if not best.is_empty():
			scene.take_from(self, best)

class Weapon:
	extends Node3D
	## A held weapon. It must be swung: damage comes from how fast its
	## business end is really moving. Let go of anything and it is thrown.
	var scene
	var kind := "blade"
	var slot: Vector3
	var grab_radius := 0.12
	var holder: Hand = null
	var _tip_last: Vector3
	var _cd := 0.0
	var _fly := Vector3.ZERO
	var _flying := false
	var _draw_hand: Hand = null
	var _whip_tip: Vector3
	var tip_node: Node3D

	func _ready() -> void:
		var w: Dictionary = HuntRules.WEAPONS[kind]
		var reach: float = max(0.3, float(w.reach))
		tip_node = Node3D.new()
		add_child(tip_node)
		match kind:
			"blade":
				WorldBuilder.box(Vector3(0.04, 0.01, 0.8), Vector3(0, 0, -0.45), Color(0.8, 0.8, 0.85), self)
				tip_node.position = Vector3(0, 0, -0.85)
			"spear":
				WorldBuilder.box(Vector3(0.03, 0.03, 2.0), Vector3(0, 0, -0.9), Color(0.5, 0.36, 0.22), self)
				tip_node.position = Vector3(0, 0, -1.9)
			"knife":
				WorldBuilder.box(Vector3(0.025, 0.008, 0.2), Vector3(0, 0, -0.12), Color(0.8, 0.8, 0.85), self)
				tip_node.position = Vector3(0, 0, -0.2)
			"whip":
				WorldBuilder.box(Vector3(0.03, 0.03, 0.25), Vector3(0, 0, -0.1), Color(0.3, 0.2, 0.12), self)
				tip_node.top_level = true
				WorldBuilder.ball(0.03, Vector3.ZERO, Color(0.2, 0.14, 0.1), tip_node)
			"bow":
				WorldBuilder.box(Vector3(0.03, 1.2, 0.03), Vector3(0, 0, -0.05), Color(0.45, 0.3, 0.15), self)
		add_to_group("grabbable")
		_tip_last = tip_node.global_position
		_whip_tip = global_position

	func on_grab(hand: Hand):
		if _flying:
			_flying = false
		holder = hand
		if not scene.held_weapons.has(self):
			scene.held_weapons.append(self)
		if get_parent() != scene:
			var xf := global_transform
			get_parent().remove_child(self)
			scene.add_child(self)
			global_transform = xf
		return self

	func on_release(_hand: Hand, velocity: Vector3) -> void:
		holder = null
		scene.held_weapons.erase(self)
		if velocity.length() > 2.0:
			# anything you let go of can be thrown
			_fly = velocity
			_flying = true
		else:
			_return_to_belt()

	func _return_to_belt() -> void:
		_flying = false
		get_parent().remove_child(self)
		scene.belt.add_child(self)
		position = slot
		rotation = Vector3.ZERO

	func _physics_process(delta: float) -> void: # measured on the physics clock so a slow frame cannot hide a swing
		_cd = max(0.0, _cd - delta)
		if _flying:
			_fly.y -= 9.8 * delta
			global_position += _fly * delta
			for b in get_tree().get_nodes_in_group("wild_beast"):
				if b.body_center().distance_to(global_position) < b.radius + 0.2:
					b.struck("thrown" if kind != "spear" and kind != "knife" else kind, _fly.length())
					_return_to_belt()
					return
			if global_position.y < 0.0:
				_return_to_belt()
			return
		if holder == null:
			return
		if kind == "bow":
			_bow()
			return
		var tip: Vector3
		if kind == "whip":
			# the lash trails behind the hand and cracks when it snaps forward
			var want: Vector3 = global_position - global_transform.basis.z * 2.6
			_whip_tip = _whip_tip.lerp(want, min(1.0, delta * 9.0))
			tip_node.global_position = _whip_tip
			tip = _whip_tip
		else:
			tip = tip_node.global_position
		var v: Vector3 = (tip - _tip_last) / max(delta, 0.001)
		_tip_last = tip
		var speed: float = v.length()
		if HuntRules.WEAPONS[kind].get("thrust", false):
			speed = max(0.0, v.dot(-global_transform.basis.z)) # a spear must be thrust along its length
		if _cd > 0.0 or speed < float(HuntRules.WEAPONS[kind].min_speed):
			return
		for b in get_tree().get_nodes_in_group("wild_beast"):
			if b.c.alive and b.body_center().distance_to(tip) < b.radius + 0.15:
				_cd = float(HuntRules.WEAPONS[kind].cooldown)
				holder.rumble(0.8, 0.08)
				Game.sfx.play("whip" if kind == "whip" else "swing", tip)
				b.struck(kind, speed)
				return

	## Hold the bow in one hand; grip near it with the other, pull back, let go.
	func _bow() -> void:
		var rig: XRRig = scene.rig
		var other: Hand = rig.left if holder == rig.right else rig.right
		if _draw_hand == null:
			if other.is_down("grip") and other.held == null and other.global_position.distance_to(global_position) < 0.25:
				_draw_hand = other
			return
		var pull := clampf(_draw_hand.global_position.distance_to(global_position) / 0.6, 0.0, 1.0)
		if _draw_hand.is_down("grip"):
			if Engine.get_physics_frames() % 6 == 0:
				_draw_hand.rumble(0.2 + 0.5 * pull, 0.02)
			return
		var dir := (global_position - _draw_hand.global_position).normalized()
		_draw_hand = null
		if pull < 0.2:
			return
		var a := Arrow.new()
		a.scene = scene
		a.vel = dir * (12.0 + 30.0 * pull)
		a.draw = pull
		scene.add_child(a)
		a.global_position = global_position
		Game.sfx.play("throw", global_position)

class Arrow:
	extends Node3D
	var scene
	var vel: Vector3
	var draw := 1.0
	var _life := 4.0

	func _ready() -> void:
		WorldBuilder.box(Vector3(0.01, 0.01, 0.7), Vector3.ZERO, Color(0.9, 0.85, 0.7), self)

	func _process(delta: float) -> void:
		vel.y -= 9.8 * delta * 0.5
		global_position += vel * delta
		if vel.length() > 0.1:
			look_at(global_position + vel)
		_life -= delta
		for b in get_tree().get_nodes_in_group("wild_beast"):
			if b.c.alive and b.body_center().distance_to(global_position) < b.radius + 0.2:
				b.struck("bow", vel.length(), draw)
				queue_free()
				return
		if _life <= 0.0 or global_position.y < 0.0:
			queue_free()

class ShedNode:
	extends Node3D
	## A shed scale or feather lying on the ground. Just pick it up.
	var scene
	var shed: Dictionary
	var grab_radius := 0.35

	func _ready() -> void:
		var m := WorldBuilder.box(Vector3(0.12, 0.02, 0.07), Vector3.ZERO, Color(0.85, 0.85, 0.7), self)
		m.material_override.emission_enabled = true
		m.material_override.emission = Color(0.6, 0.6, 0.3)
		WorldBuilder.label(shed.kind, Vector3(0, 0.3, 0), 0.003, self)
		add_to_group("grabbable")

	func on_grab(hand: Hand):
		var piece := HuntRules.pick_up_shed(scene.hunt, scene.wilds, shed)
		hand.rumble(0.4, 0.05)
		Game.sfx.play("coin", global_position)
		scene.say("You picked up a %s. It is in your bag." % piece.kind)
		scene.sheds.erase(self)
		queue_free()
		return null
