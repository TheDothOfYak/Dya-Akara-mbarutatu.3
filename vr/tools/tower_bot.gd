extends Node
## Autoplay for the tower:  godot -- --scene=tower --autoplay --fresh --save=bot
## Uses the simulated hands: pull a coin from a tray into the pouch, wake a
## hologram, and start a two-token sandbox with the Duel option.

var scene
var ds: DesktopSim

func frames(n: int) -> void:
	for i in n:
		await get_tree().physics_frame

func _ready() -> void:
	ds = scene.rig.sim
	ds.scripted = true
	_run()

func _grab_tray_coin(skip := 0) -> TokenCoin:
	var keys: Array = scene.tray_coins.keys()
	var c: TokenCoin = scene.tray_coins[keys[skip]]
	ds.pose(1, c.global_position)
	await frames(3)
	ds.hand(1).set_button("grip", true)
	await frames(3)
	return ds.hand(1).held

func _run() -> void:
	await frames(5)
	var n0: int = Game.open_pouch().ids.size()
	var coin := await _grab_tray_coin()
	ds.pose(1, scene.pouch_node.global_position + Vector3(0, 0.05, 0))
	await frames(3)
	ds.hand(1).set_button("grip", false)
	await frames(5)
	print("TOWER pouch count %d -> %d" % [n0, Game.open_pouch().ids.size()])
	for k in 2:
		coin = await _grab_tray_coin(k)
		ds.pose(1, scene.rig.head_pos() + Vector3(0.1, -0.35, -0.45))
		await frames(3)
		ds.hand(1).set_button("primary", true)
		await frames(2)
		ds.hand(1).set_button("primary", false)
		await frames(3)
		var holo: bool = scene.hologram != null
		if holo:
			scene.hologram.duel.emit(coin.tok)
		await frames(3)
		ds.pose(1, Vector3(0.9, 1.3, 0.6))
		await frames(2)
		ds.hand(1).set_button("grip", false)
		await frames(5)
		print("TOWER hologram woke: ", holo)
	await get_tree().create_timer(6.0).timeout
	var sb = scene.sandbox
	print("TOWER sandbox creatures: ", sb.sim.creatures.size() if sb != null else -1, " tick ", sb.sim.tick if sb != null else 0)
	ds.unpose(1)
	ds.look(0.0, -0.45)
	await frames(3)
	if Game.args.has("shot"):
		await Shots.save(scene, Game.args.shot)
	get_tree().quit()
