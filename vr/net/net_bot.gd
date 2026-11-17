extends Node
## Headless network check:
##   godot --headless -- --net=host            (plays side 1)
##   godot --headless -- --net=join            (plays side 2, joins 127.0.0.1)
##   godot --headless -- --net=spectate        (watches from the stands)
## Each prints NET RESULT with the final state hash; all must match.

var net: NetSession
var role := "host"

func _ready() -> void:
	role = Game.args.net
	Game.save_name = "net_" + role
	Game.new_game(11 if role == "host" else 22)
	var code: String = Game.args.get("code", "ABC234")
	net = NetSession.new()
	net.name = "Net"
	get_tree().root.add_child.call_deferred(net)
	await get_tree().process_frame
	await get_tree().process_frame
	net.status.connect(func(t): print("NET[%s] %s" % [role, t]))
	var pouch := Game.pouch_tokens().slice(0, 12)
	var votes := {"interval": 5, "amount": 3, "scale": 2} if role == "host" else {"interval": 0, "amount": 5, "scale": 4}
	if role == "host":
		Engine.time_scale = float(Game.args.get("speed", "8"))
		print("NET[host] listen: ", net.host(code, "Host", pouch, votes, int(Game.args.get("port", str(NetSession.PORT)))))
	else:
		net.join(Game.args.get("addr", "127.0.0.1"), Game.args.get("try_code", code), "Friend" if role == "join" else "Watcher", pouch, votes, role == "spectate", int(Game.args.get("port", str(NetSession.PORT))))
	var waited := 0.0
	while net.sim == null:
		await get_tree().create_timer(0.2).timeout
		waited += 0.2
		if net.refused != "":
			print("NET[%s] REFUSED: %s" % [role, net.refused])
			get_tree().quit(2)
			return
		if waited > 60.0:
			print("NET[%s] no match" % role)
			get_tree().quit(1)
			return
	print("NET[%s] team %d, my pouch is my own: %s, settings %s" % [role, net.my_team, str(net.my_team < 0 or net.sim.teams[net.my_team].pouch[0].tok.id == pouch[0].id), str(net.sim.settings)])
	while not net.sim.over and net.sim.tick < 30000:
		net.pump(get_process_delta_time())
		if net.my_team >= 0:
			var T: Dictionary = net.sim.teams[net.my_team]
			MatchAI.think(net.sim, T, func(_tm, inp): net.send_input(inp))
		await get_tree().process_frame
	# let the last frames reach everyone before leaving
	for i in 60:
		net.pump(0.0)
		await get_tree().process_frame
	print("NET RESULT %s tick=%d winner=%d how=%s hash=%d desync=%s inputs=%d" % [role, net.sim.tick, net.sim.result.get("winner", -9), net.sim.result.get("how", "?"), net.sim.state_hash(), str(net.desync), net.sim.log.size()])
	get_tree().quit(0)
