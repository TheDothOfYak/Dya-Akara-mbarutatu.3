extends Node3D
## Friends: host your town or join a friend's by town code. Each visitor
## brings their own tower and collection (their own pouch). Turn the rings on
## your horde token here to vote before the match. You can also watch a match
## from the stands.

const KEYS := "ABCDEFGHJKLMNPQRSTUVWXYZ23456789."
var rig: XRRig
var token: HordeToken
var info: Label3D
var field := "address"
var address := "127.0.0.1"
var code := ""
var net: NetSession = null

func _ready() -> void:
	Game.ensure_game()
	add_child(WorldBuilder.sky_environment(Color(0.45, 0.6, 0.85), Color(0.3, 0.36, 0.3)))
	add_child(WorldBuilder.sun())
	add_child(WorldBuilder.ground(60.0, Color(0.34, 0.4, 0.32)))
	rig = XRRig.new()
	add_child(rig)
	rig.place(Vector3(0, 0, 0.9), 0.0)
	token = HordeToken.new()
	token.position = Vector3(-0.45, 1.0, 0.25)
	add_child(token)
	WorldBuilder.cyl(0.05, 0.98, Vector3(-0.45, 0.49, 0.25), Color(0.35, 0.27, 0.2), self)
	var board := Node3D.new()
	board.position = Vector3(0, 1.3, 0)
	add_child(board)
	info = WorldBuilder.label("", Vector3(0, 0.42, 0), 0.0011, board, false)
	for i in KEYS.length():
		var ch := KEYS[i]
		board.add_child(PanelButton.make(ch, Vector3(-0.3 + 0.075 * (i % 9), 0.2 - 0.075 * int(i / 9.0), 0), _key.bind(ch), 0.065, 0.0012))
	board.add_child(PanelButton.make("Erase", Vector3(0.3, -0.03, 0), _erase, 0.14, 0.0009))
	board.add_child(PanelButton.make("Field: address / code", Vector3(-0.1, -0.13, 0), _switch, 0.4, 0.0009))
	board.add_child(PanelButton.make("Host my town", Vector3(-0.27, -0.22, 0), _host, 0.26, 0.0009))
	board.add_child(PanelButton.make("Join a friend", Vector3(0.0, -0.22, 0), func(): _join(false), 0.26, 0.0009))
	board.add_child(PanelButton.make("Watch", Vector3(0.24, -0.22, 0), func(): _join(true), 0.2, 0.0009))
	board.add_child(PanelButton.make("Back to town", Vector3(0, -0.31, 0), _back, 0.3, 0.0009))
	_show("")
	Shots.maybe(self)

func _show(status: String) -> void:
	var ips := []
	for a in IP.get_local_addresses():
		if a.count(".") == 3 and not a.begins_with("127."):
			ips.append(a)
	info.text = "Your town code: %s   Your address: %s\nJoin address: %s%s\nJoin code: %s%s\n%s" % [Game.data.town.code, ", ".join(ips) if not ips.is_empty() else "unknown",
		address, "  <" if field == "address" else "", code, "  <" if field == "code" else "", status]

func _key(ch: String) -> void:
	if field == "address": address += ch
	elif code.length() < 6: code += ch
	_show("")

func _erase() -> void:
	if field == "address": address = address.left(address.length() - 1)
	else: code = code.left(code.length() - 1)
	_show("")

func _switch() -> void:
	field = "code" if field == "address" else "address"
	_show("")

func _session() -> NetSession:
	if net != null:
		net.close()
		net.queue_free()
	net = NetSession.new()
	net.name = "Net"
	get_tree().root.add_child(net)
	net.status.connect(_show)
	net.match_started.connect(_started)
	return net

func _host() -> void:
	var err := _session().host(Game.data.town.code, Game.data.player.name, Game.pouch_tokens(), token.votes())
	if err != OK:
		_show("Could not open the town to visitors.")

func _join(spectator: bool) -> void:
	_session().join(address, code, Game.data.player.name, Game.pouch_tokens(), token.votes(), spectator)

func _started() -> void:
	Game.net = net
	Game.match_request = {"net": true, "return_to": "res://scenes/town.tscn"}
	Game.goto("res://scenes/match.tscn")

func _back() -> void:
	if net != null:
		net.close()
		net.queue_free()
	Game.goto("res://scenes/town.tscn")

func _process(delta: float) -> void:
	if net != null and net.sim == null:
		net.pump(delta)
