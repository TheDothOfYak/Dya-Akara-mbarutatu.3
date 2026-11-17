extends Node
## Autoplay for the town:  godot -- --scene=town --autoplay --fresh --save=bot
## Walks up to a townsperson, talks by touch, and asks for a wagered game.

var scene
var ds: DesktopSim

func frames(n: int) -> void:
	for i in n:
		await get_tree().physics_frame

func _press(text_start: String) -> bool:
	for b in scene.panel._buttons:
		if b.label.text.begins_with(text_start):
			var bp: Vector3 = b.global_position
			var bz: Vector3 = b.global_transform.basis.z
			ds.pose(1, bp + bz * 0.3, -bz)
			await frames(30)
			ds.pose(1, bp + bz * 0.06, -bz)
			await frames(4)
			ds.pose(1, bp + bz * 0.3, -bz)
			await frames(4)
			return true
	return false

func _ready() -> void:
	ds = scene.rig.sim
	ds.scripted = true
	Game.args.erase("autoplay") # one scene per run
	await frames(5)
	print("TOWN people out: %d of %d, stalls: %d, listings: %d" % [scene.figures.size(), scene.town.npcs.size(), scene.stall_nodes.size(), scene.town.listings.size()])
	var fig = null
	for f in scene.figures:
		if f.npc.plays and f.npc.wagers:
			fig = f
			break
	scene.rig.place(fig.global_position + Vector3(0, 0, 0.9), 0.0)
	await frames(3)
	ds.pose(1, fig.global_position + Vector3(0, 0.2, 0.1))
	await frames(4)
	ds.pose(1, scene.rig.head_pos() + Vector3(0.3, -0.5, 0))
	await frames(3)
	print("TOWN talking: ", scene.panel.visible, " / ", scene.panel.text_label.text)
	if Game.args.has("shot"):
		ds.unpose(1)
		await frames(3)
		await Shots.save(scene, Game.args.shot)
	await _press("Wager")
	print("TOWN answer: ", scene.panel.text_label.text)
	var started := await _press("Start")
	await frames(20)
	print("TOWN match requested: ", started, " wager: ", Game.match_request.get("wager", {}).get("text", ""))
	get_tree().quit()
