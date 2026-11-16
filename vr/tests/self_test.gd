extends Node
## Tests that need the running game (saves, town, workshop, wilds):
##   godot --headless -- --selftest
## Uses its own save file so a real save is never touched.

var fails := 0
var passes := 0

func ok(cond: bool, what: String) -> void:
	if cond: passes += 1
	else:
		fails += 1
		printerr("  FAIL: " + what)

func _ready() -> void:
	Game.save_name = "selftest"
	for t in ["test_save", "test_town", "test_workshop", "test_wilds", "test_net"]:
		if has_method(t):
			print("== " + t)
			await call(t)
	print("\n%d checks passed, %d failed" % [passes, fails])
	get_tree().quit(1 if fails > 0 else 0)

func test_save() -> void:
	Game.new_game(42)
	ok(Game.data.collection.size() == 32 and Game.open_pouch().ids.size() == 20, "a new game has a collection and a pouch")
	var spare: String = ""
	for t in Game.data.collection:
		if Game.token_place(t.id) == "tray":
			spare = t.id
			break
	ok(Game.add_to_pouch(spare) and Game.open_pouch().ids.size() == 21, "dropping a token in the pouch raises the live count")
	var show: String = ""
	for t in Game.data.collection:
		if Game.token_place(t.id) == "tray":
			show = t.id
			break
	Game.data.showcase.append(show)
	Game.data.open_pouch = 1
	Game.add_to_pouch(Game.data.collection[31].id)
	Game.save_game()
	var before := var_to_bytes(Game.data)
	Game.data = {}
	ok(Game.load_game(), "the save file loads")
	ok(var_to_bytes(Game.data) == before, "collection, pouches and showcase persist exactly")
	ok(Game.token_place(spare) == "pouch:0" and Game.token_place(show) == "showcase" and Game.data.open_pouch == 1, "every token is where it was left")
	Game.data.open_pouch = 0
	for t in Game.data.collection:
		if Game.open_pouch().ids.size() >= 25: break
		Game.add_to_pouch(t.id)
	var extra := ""
	for t in Game.data.collection:
		if Game.token_place(t.id) != "pouch:0":
			extra = t.id
	ok(Game.open_pouch().ids.size() == 25 and not Game.add_to_pouch(extra), "a pouch holds exactly 25")
