class_name NetSession
extends Node
## Multiplayer for one match. Host-authoritative and deterministic: every
## machine runs the same simulation, and only inputs cross the network. The
## host stamps each input with the tick it applies on and sends one frame per
## tick; nobody simulates past the last frame they hold. A hash check catches
## any drift. A town code is the password to the host's town.
##
## Players bring their own pouch from their own collection. Spectators receive
## the same frames, watch from the stands and can send nothing.

signal match_started()
signal status(text: String)

const PORT := 24545
const RECONNECT_SECONDS := 10.0

var is_host := false
var code := ""
var sim: MatchSim = null
var my_team := -1
var my_info := {}
var confirmed := 0
var players := {}      # peer id -> {name, pouch, votes, team}
var spectators: Array = []
var cfg := {}
var frames_log: Array = []
var desync := false
var refused := ""
var _pending: Array = []
var _acc := 0.0
var _seq := 0
var _expect := {}
var _dropped := {}     # team -> seconds left to reconnect
var _server_lost := -1.0

func host(town_code: String, my_name: String, my_pouch: Array, my_votes: Dictionary, port: int = PORT) -> int:
	var peer := ENetMultiplayerPeer.new()
	var err := peer.create_server(port, 8)
	if err != OK:
		return err
	multiplayer.multiplayer_peer = peer
	is_host = true
	code = town_code
	players[1] = {"name": my_name, "pouch": my_pouch, "votes": my_votes, "team": 0}
	multiplayer.peer_disconnected.connect(_peer_left)
	status.emit("Hosting. Town code %s. Waiting for a friend." % code)
	return OK

func join(address: String, town_code: String, my_name: String, my_pouch: Array, my_votes: Dictionary, spectator := false, port: int = PORT) -> int:
	var peer := ENetMultiplayerPeer.new()
	var err := peer.create_client(address, port)
	if err != OK:
		return err
	multiplayer.multiplayer_peer = peer
	code = town_code
	my_info = {"name": my_name, "pouch": my_pouch, "votes": my_votes, "spectator": spectator}
	multiplayer.connected_to_server.connect(func():
		hello.rpc_id(1, code, my_name, var_to_bytes(my_pouch), my_votes, spectator))
	multiplayer.connection_failed.connect(func(): status.emit("Could not reach that town."))
	multiplayer.server_disconnected.connect(func(): _server_lost = RECONNECT_SECONDS)
	status.emit("Joining %s..." % address)
	return OK

func close() -> void:
	if multiplayer.multiplayer_peer != null:
		multiplayer.multiplayer_peer.close()
	multiplayer.multiplayer_peer = null

@rpc("any_peer", "call_remote", "reliable")
func hello(town_code: String, pname: String, pouch_bytes: PackedByteArray, votes: Dictionary, spectator: bool) -> void:
	if not is_host:
		return
	var id := multiplayer.get_remote_sender_id()
	if town_code != code:
		refuse.rpc_id(id, "That is not this town's code.")
		return
	if spectator:
		spectators.append(id)
		if sim != null:
			begin.rpc_id(id, var_to_bytes(cfg), -1, var_to_bytes(frames_log))
		return
	# a dropped player coming back within the grace time takes their side again
	for team in _dropped.keys():
		for pid in players.keys():
			if players[pid].team == team and players[pid].name == pname:
				var info: Dictionary = players[pid]
				players.erase(pid)
				players[id] = info
				_dropped.erase(team)
				begin.rpc_id(id, var_to_bytes(cfg), team, var_to_bytes(frames_log))
				return
	if players.size() >= 2 or sim != null:
		refuse.rpc_id(id, "A match is already under way here. You can watch from the stands.")
		return
	var pouch = bytes_to_var(pouch_bytes)
	if typeof(pouch) != TYPE_ARRAY or pouch.is_empty() or pouch.size() > DyaEconomy.POUCH_SIZE:
		refuse.rpc_id(id, "That pouch cannot be used.")
		return
	players[id] = {"name": pname, "pouch": pouch, "votes": votes, "team": 1}
	_start()

func _start() -> void:
	var a := {}
	var b := {}
	for pid in players:
		if players[pid].team == 0: a = players[pid]
		else: b = players[pid]
	var v := DyaEconomy.combine_votes(a.votes, b.votes)
	cfg = {"seed": randi() % 1000000 + 1, "terrain": "plains",
		"settings": {"pulse_interval": v.pulse_interval, "pulse_amount": v.pulse_amount, "chaos_interval": v.chaos_interval, "chaos_amount": v.chaos_amount, "scale": v.scale},
		"teams": [{"name": a.name, "controller": "human", "pouch": a.pouch}, {"name": b.name, "controller": "human", "pouch": b.pouch}]}
	var bytes := var_to_bytes(cfg)
	for pid in players:
		if pid != 1:
			begin.rpc_id(pid, bytes, players[pid].team, PackedByteArray())
	for sid in spectators:
		begin.rpc_id(sid, bytes, -1, PackedByteArray())
	_begin_local(cfg, 0, [])

@rpc("authority", "call_remote", "reliable")
func begin(cfg_bytes: PackedByteArray, team: int, backlog: PackedByteArray) -> void:
	var frames := []
	if backlog.size() > 0:
		frames = bytes_to_var(backlog)
	_begin_local(bytes_to_var(cfg_bytes), team, frames)

func _begin_local(config: Dictionary, team: int, backlog: Array) -> void:
	cfg = config
	my_team = team
	sim = MatchSim.new(cfg, SpeciesDB.all())
	confirmed = 0
	for f in backlog:
		_take_frame(f)
	status.emit("Match found: %s against %s." % [cfg.teams[0].name, cfg.teams[1].name])
	match_started.emit()

@rpc("authority", "call_remote", "reliable")
func refuse(why: String) -> void:
	refused = why
	status.emit(why)
	close()

## Send one of your inputs. Spectators can send nothing.
func send_input(input: Dictionary) -> void:
	if sim == null or my_team < 0:
		return
	if is_host:
		_pending.append([my_team, input])
	elif multiplayer.multiplayer_peer != null and multiplayer.multiplayer_peer.get_connection_status() == MultiplayerPeer.CONNECTION_CONNECTED:
		client_input.rpc_id(1, input)

@rpc("any_peer", "call_remote", "reliable")
func client_input(input: Dictionary) -> void:
	if not is_host:
		return
	var id := multiplayer.get_remote_sender_id()
	if players.has(id) and typeof(input) == TYPE_DICTIONARY:
		_pending.append([players[id].team, input])

@rpc("authority", "call_remote", "reliable")
func frame(bytes: PackedByteArray) -> void:
	_take_frame(bytes_to_var(bytes))

func _take_frame(f: Dictionary) -> void:
	for i in f.ins:
		sim.schedule_input(int(i[0]), i[1], int(f.t), int(i[2]))
	if f.has("hash"):
		_expect[int(f.t)] = int(f.hash)
	confirmed = int(f.t)

## Advance the match. The match scene calls this every frame instead of sim.step().
func pump(delta: float) -> void:
	if sim == null:
		return
	if is_host:
		for team in _dropped.keys():
			_dropped[team] -= delta
			if _dropped[team] <= 0.0:
				_dropped.erase(team)
				_pending.append([team, {"type": "concede"}]) # the remaining player takes the win
		_acc += min(delta, 0.25)
		while _acc >= MatchSim.TICK and not sim.over:
			_acc -= MatchSim.TICK
			var t := sim.tick + 1
			var ins := []
			for p in _pending:
				_seq += 1
				ins.append([p[0], p[1], _seq])
				sim.schedule_input(p[0], p[1], t, _seq)
			_pending = []
			sim.do_tick()
			var f := {"t": t, "ins": ins}
			if t % 100 == 0 or sim.over:
				f["hash"] = sim.state_hash()
			frames_log.append(f)
			frame.rpc(var_to_bytes(f))
	else:
		var n := 0
		while sim.tick < confirmed and not sim.over and n < 40:
			sim.do_tick()
			n += 1
			if _expect.has(sim.tick):
				if _expect[sim.tick] != sim.state_hash():
					desync = true
					status.emit("The two games no longer agree.")
				_expect.erase(sim.tick)
		if _server_lost >= 0.0 and not sim.over:
			_server_lost -= delta
			if _server_lost < 0.0 and my_team >= 0:
				sim._finish(my_team, "disconnect")

func _peer_left(id: int) -> void:
	spectators.erase(id)
	if players.has(id) and sim != null and not sim.over:
		_dropped[players[id].team] = RECONNECT_SECONDS # 10 seconds to reconnect
		status.emit("%s dropped. Waiting 10 seconds." % players[id].name)
