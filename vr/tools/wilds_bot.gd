extends Node
## Autoplay for the wilds:  godot -- --scene=wilds --autoplay --fresh --save=bot
## Walks to a creature, swings the blade until it yields, works a piece free
## with the knife, and walks back through the gate.

var scene
var ds: DesktopSim

func frames(n: int) -> void:
	for i in n:
		await get_tree().physics_frame

func _grab(i: int, kind: String) -> void:
	for w in scene.belt.get_children():
		if w is Node3D and w.get("kind") == kind:
			ds.pose(i, w.global_position)
			await frames(3)
			ds.hand(i).set_button("grip", true)
			await frames(3)

func _ready() -> void:
	ds = scene.rig.sim
	ds.scripted = true
	Game.args.erase("autoplay") # one scene per run
	await frames(5)
	var b = null
	for x in scene.beasts:
		if x.c.species == "sru_vorn":
			b = x
			break
	var before: Dictionary = b.c.tok.duplicate(true)
	print("WILDS creatures: %d, sheds: %d, target: %s hp %d" % [scene.beasts.size(), scene.sheds.size(), b.c.id, int(b.c.hp)])
	await _grab(1, "blade")
	await _grab(0, "knife")
	print("WILDS holding: ", ds.hand(1).held != null, " ", ds.hand(0).held != null)
	var swings := 0
	while not HuntRules.is_downed(b.c) and b.c.alive and swings < 400 and float(scene.hunt.health) > 0.0:
		# keep close to it (walking is covered elsewhere), then swing: the blade must really move
		var side: Vector3 = b.global_position + Vector3(b.radius + 0.9, 0, 0)
		scene.rig.place(side, PI / 2)
		var c: Vector3 = b.body_center()
		var up := Vector3(0, 0.5, 0)
		ds.pose(1, c + Vector3(b.radius + 0.6, 0.9, 0), Vector3(-1, -0.2, 0))
		await frames(2)
		ds.pose(1, c + Vector3(b.radius + 0.5, -0.1, 0), Vector3(-1, -0.6, 0))
		await frames(2)
		swings += 1
		if swings == 12 and Game.args.has("shot"):
			await Shots.save(scene, Game.args.shot)
	print("WILDS after %d swings: hp %d, downed %s, my health %d" % [swings, int(b.c.hp), HuntRules.is_downed(b.c), int(scene.hunt.health)])
	# knife to the beaten creature
	ds.pose(0, b.body_center(), Vector3(1, 0, 0))
	await frames(4)
	print("WILDS pieces in bag: ", scene.hunt.new_pieces.size())
	var piece: Dictionary = scene.hunt.new_pieces[0] if not scene.hunt.new_pieces.is_empty() else {}
	var n0: int = Game.data.pieces.size()
	var tree := get_tree()
	get_parent().remove_child(self)
	tree.root.add_child(self) # outlive the walk back to town
	scene.rig.place(Vector3(0, 0, 7.0), 0.0)
	await frames(30)
	var ok: bool = not piece.is_empty() and Game.data.pieces.size() == n0 + 1 and piece.tok.species == before.species
	if ok:
		Game.data.okid[int(piece.tok.rarity)] = 99
		Game.data.ngakara = 99
		var tok := Crafting.craft(Game.data, piece)
		ok = tok.species == before.species and tok.vars == before.vars and tok.behavior_value == before.behavior_value and tok.age == before.age and tok.size_idx == before.size_idx
		print("WILDS token: %s, how: %s, story: %s" % [tok.name, piece.how, tok.story])
	print("WILDS HUNT ", "OK: piece carried home and the token matches the creature" if ok else "FAILED")
	get_tree().quit()
