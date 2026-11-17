extends Node
## Autoplay for the workshop:  godot -- --scene=workshop --autoplay --fresh --save=bot
## Does the whole ritual with the simulated hands.

var scene
var ds: DesktopSim

func frames(n: int) -> void:
	for i in n:
		await get_tree().physics_frame

func _ready() -> void:
	ds = scene.rig.sim
	ds.scripted = true
	Game.args.erase("autoplay") # one scene per run
	await frames(5)
	var n0: int = Game.data.collection.size()
	var p = scene.piece_nodes[0]
	print("WORKSHOP piece: ", p.piece.kind, " of ", p.piece.species, " / ", Crafting.can_craft(Game.data, p.piece))
	var h := ds.hand(1)
	ds.pose(1, p.global_position); await frames(3)
	h.set_button("grip", true); await frames(3)
	ds.pose(1, scene.pour_spot.global_position + Vector3(0, 0.05, 0)); await frames(3)
	h.set_button("grip", false); await frames(3)
	print("WORKSHOP step: ", scene.step)
	ds.pose(1, scene.vial.global_position); await frames(3)
	h.set_button("grip", true); await frames(3)
	# tilt the vial over the piece: the hand rolls so the vial's up points sideways and down
	var above: Vector3 = scene.current.global_position + Vector3(0, 0.15, 0)
	ds.free_pose[1] = Transform3D(Basis(Vector3(0, 0, 1), 2.2), above)
	await get_tree().create_timer(3.2).timeout
	if Game.args.has("shot"):
		ds.look(0.0, -0.5)
		await frames(2)
		await Shots.save(scene, Game.args.shot)
	h.set_button("grip", false); await frames(3)
	print("WORKSHOP poured: ", scene.poured, " step: ", scene.step)
	ds.pose(1, scene.current.global_position); await frames(3)
	h.set_button("grip", true); await frames(3)
	ds.pose(1, scene.relic.global_position + Vector3(0, 0.06, 0)); await frames(3)
	h.set_button("grip", false); await frames(3)
	print("WORKSHOP step: ", scene.step)
	ds.pose(1, scene.lid.global_position + Vector3(0, 0.02, 0.05), Vector3(0, 0, -1)); await frames(4)
	ds.pose(1, scene.rig.head_pos() + Vector3(0.25, -0.4, -0.3)); await frames(3)
	print("WORKSHOP step: ", scene.step)
	await get_tree().create_timer(6.0).timeout
	print("WORKSHOP collection %d -> %d, token: %s, in hand: %s" % [n0, Game.data.collection.size(), scene.last_token.get("name", "none"), str(h.held != null)])
	get_tree().quit()
