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

func test_town() -> void:
	Game.new_game(42)
	Game.ensure_town()
	var town: Dictionary = Game.data.town
	ok(town.npcs.size() == 100, "100 people live in the town")
	var names := {}
	var players := 0
	var with_coll := 0
	for n in town.npcs:
		names[n.name] = true
		if n.plays: players += 1
		if n.collection.size() >= 6: with_coll += 1
	ok(names.size() == 100 and players > 60 and players < 100 and with_coll == players, "each has a name; most play and own a real collection; some do not play")
	ok(var_to_bytes(TownData.generate(42)) == var_to_bytes(TownData.generate(42)), "the town is the same for the same seed")
	ok(town.listings.size() > 0 and town.code.length() == 6, "player stalls are stocked and the town has a code")
	# ask a willing NPC on the spot, with a wager
	var npc := {}
	var unwilling := {}
	for n in town.npcs:
		if n.plays and n.wagers and npc.is_empty(): npc = n
		if n.plays and not n.wagers and unwilling.is_empty(): unwilling = n
	var pouch := Game.pouch_tokens()
	var stake: Dictionary = pouch[0]
	var no: Dictionary = TownData.ask_match(town, unwilling, pouch, stake.id, "res://scenes/town.tscn", 5)
	ok(not no.ok and no.text != "", "an NPC who does not wager says so")
	var ans: Dictionary = TownData.ask_match(town, npc, pouch, stake.id, "res://scenes/town.tscn", 5)
	ok(ans.ok and ans.request.has("wager"), "a willing NPC accepts the wager on the spot")
	var req: Dictionary = ans.request
	# play it (both sides driven by the AI here so the test needs no hands)
	var res := {}
	var seed_try := 5
	while res.is_empty() or res.winner != 0:
		var m := MatchSim.new({"seed": seed_try, "quiet": true, "teams": [
			{"name": "You", "controller": "ai", "ai_skill": 1.0, "pouch": req.pouch},
			{"name": req.opponent.name, "controller": "ai", "ai_skill": 0.2, "ai_warmup": 60.0, "pouch": req.opponent.pouch}]}, SpeciesDB.all())
		while not m.over and m.tick < 40000: m.do_tick()
		res = m.result
		seed_try += 1
		if seed_try > 12: break
	ok(not res.is_empty() and res.winner == 0, "the match is played to an end")
	var n0: int = Game.data.collection.size()
	var c0: int = npc.collection.size()
	var gold0: int = Game.data.player.gold
	var rep: Dictionary = TownData.settle(Game.data, req, res)
	ok(Game.data.collection.size() == n0 + 1 and npc.collection.size() == c0 - 1 and rep.won_token.id == req.wager.theirs, "winning moves the NPC's staked token into your collection")
	ok(Game.data.player.gold > gold0 and npc.losses == 1, "casual rewards and records are kept")
	# and losing a wager
	var ans2: Dictionary = TownData.ask_match(town, npc, pouch, stake.id, "res://scenes/town.tscn", 6)
	n0 = Game.data.collection.size()
	c0 = npc.collection.size()
	TownData.settle(Game.data, ans2.request, {"winner": 1, "how": "relic"})
	ok(Game.data.collection.size() == n0 - 1 and npc.collection.size() == c0 + 1 and Game.token_by_id(stake.id).is_empty() and not Game.open_pouch().ids.has(stake.id), "losing sends your token to the NPC for good")
	Game.save_game()
	var before := var_to_bytes(Game.data)
	Game.data = {}
	Game.load_game()
	ok(var_to_bytes(Game.data) == before, "NPC collections persist")
	# market
	var l: Dictionary = Game.data.town.listings[0]
	Game.data.player.gold = 100000
	n0 = Game.data.collection.size()
	TownData.buy_listing(Game.data, l)
	ok(Game.data.collection.size() == n0 + 1 and Game.data.player.gold == 100000 - int(l.price), "buy now hands over the gold and the token")
	var item: Dictionary = TownData.stalls_cfg().supply[0].items[3]
	TownData.buy_supply(Game.data, item)
	ok(Game.data.kit.whip == true, "the weapons stall sells a whip")
	ok(TownData.stalls_cfg().supply.size() == 4, "four town stalls: weapons, food, armor, potions and misc")
	ok(TownData.line("rumor", {"creature": "Lutut", "place": "sky"}).contains("Lutut"), "rumor templates fill in from creature data")
