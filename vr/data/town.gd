class_name TownData
extends RefCounted
## Data layer for Sri'Ciakala: the 100 Dya'kukull who live there, their
## collections, the market, wagers. Every player has their own copy of the
## town, saved in their local save file (Game.data.town). No runtime AI: all
## dialogue comes from written templates in data/dialogue.json.

const NPC_COUNT := 100
const PLAYER_STALLS := 12
const PERSONALITIES := ["quiet", "cheerful", "boastful", "busy", "gambler", "wary"]
const PLACES := ["home", "square", "tavern", "arena", "work", "shore"]
const HABITAT_NAMES := {"sea": "sea", "shore": "shore", "forest": "forest", "bog": "bog", "sky": "sky above the cliffs", "town": "town"}

# Dearcineon name syllables, as used by the 2D game's name generator (js/data/lore.js).
const SYL_A := ["Ka", "Ve", "Dra", "Nok", "Tha", "Vor", "El", "Ska", "Mal", "Ki", "Xa", "Leo", "Ula", "Su", "Fyr", "Nekh", "Tan", "Kel", "Ba", "Zik", "Ae", "Uv", "Stam", "Nael", "Ond", "Kip", "Har", "Gro", "Alb", "Kar"]
const SYL_B := ["ri", "lo", "va", "thy", "dor", "ka", "shi", "ren", "du", "na", "vek", "lin", "rak", "sti", "meil", "or", "an", "el", "ik", "os"]
const SYL_C := ["n", "x", "sh", "k", "th", "r", "l", "s", "v", ""]

static var _dialogue := {}
static var _stalls := {}

static func gen_name(rng: DyaRng) -> String:
	var n: String = rng.pick(SYL_A) + rng.pick(SYL_B)
	if rng.chance(0.5): n += rng.pick(SYL_C)
	if rng.chance(0.25): n += "’" + rng.pick(["Eik", "Vil", "Dor", "Kal", "Nov", "Ryn"])
	return n

static func stalls_cfg() -> Dictionary:
	if _stalls.is_empty():
		_stalls = JSON.parse_string(FileAccess.get_file_as_string("res://data/stalls.json"))
	return _stalls

static func dialogue() -> Dictionary:
	if _dialogue.is_empty():
		_dialogue = JSON.parse_string(FileAccess.get_file_as_string("res://data/dialogue.json"))
	return _dialogue

## Build a fresh town copy: 100 people, each with a home, a routine, a
## personality and a real collection.
static func generate(seed_value: int) -> Dictionary:
	var rng := DyaRng.new(seed_value ^ 0x51C1A)
	var db := SpeciesDB.all()
	var ids := SpeciesDB.ids()
	var npcs := []
	var used := {}
	for i in NPC_COUNT:
		var name := gen_name(rng)
		while used.has(name):
			name = gen_name(rng)
		used[name] = true
		var level: int = max(1, roundi(rng.gauss(14, 10)))
		var plays := rng.chance(0.85) # some live their lives away from the game entirely
		var personality: String = rng.pick(PERSONALITIES)
		var coll := []
		if plays:
			for k in rng.int_in(6, 12):
				var sp: Dictionary = db[rng.pick(ids)]
				coll.append(DyaToken.mint(sp, rng, {"origin": "npc"}))
		# a simple day: where they are in each of four parts of the day
		var routine := []
		for part in 4:
			if part == 3: routine.append("home")
			elif not plays: routine.append(rng.pick(["work", "home", "shore", "square"]))
			else: routine.append(rng.pick(["square", "square", "tavern", "arena", "work"] if personality != "gambler" else ["tavern", "tavern", "square"]))
		npcs.append({
			"id": "npc_%03d" % i, "name": name, "level": level, "plays": plays,
			"gold": roundi(200 + level * rng.range_f(80, 300)),
			"skill": clampf(rng.range_f(0.2, 1.0) + level / 100.0, 0.2, 1.2),
			"play_style": rng.pick(["aggressive", "defensive", "balanced", "greedy", "chaotic"]),
			"personality": personality,
			"wagers": plays and (personality == "gambler" or rng.chance(0.45)),
			"guide": rng.chance(0.35),
			"home": {"level": rng.int_in(0, 3), "angle": rng.range_f(0.0, TAU)},
			"routine": routine,
			"collection": coll,
			"merchant": plays and rng.chance(0.2),
			"met": 0, "wins": 0, "losses": 0,
			"votes": {"interval": 0, "amount": 0, "scale": rng.pick([0, 0, 1, 2])},
		})
	var town := {"seed": seed_value, "npcs": npcs, "listings": [], "my_listings": [], "day": 0, "clock": 0.3, "code": make_code(seed_value)}
	restock(town, rng)
	return town

static func make_code(seed_value: int) -> String:
	var chars := "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	var r := DyaRng.new(seed_value ^ 0xC0DE)
	var s := ""
	for i in 6:
		s += chars[r.int_in(0, chars.length() - 1)]
	return s

## The 12 player stalls show a rotating set of sellers.
static func restock(town: Dictionary, rng: DyaRng) -> void:
	town.listings = []
	var sellers := []
	for n in town.npcs:
		if n.merchant and n.collection.size() > 3:
			sellers.append(n)
	var stall := 0
	for n in sellers:
		if stall >= PLAYER_STALLS - 1: # one stall is kept for the player
			break
		for k in min(3, n.collection.size() - 3):
			var tok: Dictionary = n.collection[k]
			town.listings.append({"stall": stall, "seller": n.id, "tok_id": tok.id, "price": roundi(DyaEconomy.RARITY_VALUE[tok.rarity] * rng.range_f(0.8, 1.4))})
		stall += 1

static func npc_by_id(town: Dictionary, id: String) -> Dictionary:
	for n in town.npcs:
		if n.id == id:
			return n
	return {}

static func npc_token(npc: Dictionary, tok_id: String) -> Dictionary:
	for t in npc.collection:
		if t.id == tok_id:
			return t
	return {}

static func where_is(npc: Dictionary, clock: float) -> String:
	return npc.routine[clampi(int(clock * 4.0), 0, 3)]

static func line(key: String, fill: Dictionary = {}, pick := 0) -> String:
	var d := dialogue()
	var opts = d.get(key, [""])
	if opts is Dictionary:
		opts = opts.get(fill.get("personality", "quiet"), ["{name} nods."])
	var s: String = opts[pick % opts.size()]
	for k in fill:
		s = s.replace("{" + k + "}", str(fill[k]))
	return s

## A rumor comes from the persistent creature population of this town's wilds.
static func rumor(town: Dictionary, wilds: Dictionary, npc: Dictionary) -> Dictionary:
	var pop: Array = wilds.get("creatures", [])
	if pop.is_empty():
		return {"text": line("rumor_none"), "creature": {}}
	var c: Dictionary = pop[(DyaRng.hash_str(npc.id) + int(town.day)) % pop.size()]
	var sp := SpeciesDB.get_sp(c.species)
	return {"text": line("rumor", {"creature": sp.name, "place": HABITAT_NAMES.get(c.habitat, c.habitat)}, npc.met), "creature": c}

# ---------------------------------------------------------------- matches and wagers

## Ask an NPC for a game on the spot. Returns {ok, text, request}.
## `stake_id`: the id of your token to wager, or "" for a plain game.
static func ask_match(town: Dictionary, npc: Dictionary, my_pouch: Array, stake_id: String, return_to: String, seed_value: int, at_table := false) -> Dictionary:
	var fill := {"name": npc.name, "personality": npc.personality}
	if not npc.plays or npc.collection.is_empty():
		return {"ok": false, "text": line("away", fill)}
	var wager := {}
	if stake_id != "":
		if not npc.wagers:
			return {"ok": false, "text": line("wager_decline", fill, npc.met)}
		var mine := {}
		for t in my_pouch:
			if t.id == stake_id:
				mine = t
		if mine.is_empty():
			return {"ok": false, "text": line("wager_none", fill)}
		# the NPC stakes the token of theirs closest in rarity
		var best: Dictionary = npc.collection[0]
		for t in npc.collection:
			if absi(t.rarity - mine.rarity) < absi(best.rarity - mine.rarity):
				best = t
		wager = {"npc": npc.id, "mine": mine.id, "theirs": best.id,
			"text": "your %s against %s's %s" % [mine.name, npc.name, best.name]}
		fill["token"] = mine.name
		fill["stake"] = best.name
	elif npc.personality == "busy" and (npc.met % 3) == 2:
		return {"ok": false, "text": line("invite_decline", fill, npc.met)}
	var votes: Dictionary = npc.votes.duplicate()
	if at_table:
		votes.scale = 0 # a tavern game is a tabletop game
	var req := {"seed": seed_value, "pouch": my_pouch, "return_to": return_to, "npc": npc.id,
		"opponent": {"name": npc.name, "pouch": npc.collection.duplicate(), "ai_skill": min(1.0, npc.skill), "votes": votes}}
	if not wager.is_empty():
		req["wager"] = wager
	return {"ok": true, "text": line("wager_accept" if not wager.is_empty() else "invite_accept", fill, npc.met), "request": req}

## Settle a finished match against an NPC: rewards, records, and the wager.
## A won token leaves the NPC's collection and comes to you; a lost one goes
## into theirs. Nothing disappears into a void. Returns a short report.
static func settle(data: Dictionary, request: Dictionary, result: Dictionary) -> Dictionary:
	var town: Dictionary = data.town
	var npc := npc_by_id(town, request.get("npc", ""))
	var out := {"text": "", "won_token": {}, "lost_token": {}}
	if npc.is_empty():
		return out
	var rw: Dictionary = stalls_cfg().rewards
	var won: bool = result.winner == 0
	var lost: bool = result.winner == 1
	npc.met += 1
	if won:
		npc.losses += 1
		data.player.xp += int(rw.casual_win_xp)
		data.player.gold += int(rw.casual_win_gold)
	elif lost:
		npc.wins += 1
		data.player.xp += int(rw.casual_loss_xp)
		data.player.gold += int(rw.casual_loss_gold)
	var w: Dictionary = request.get("wager", {})
	if not w.is_empty():
		if won:
			var t := npc_token(npc, w.theirs)
			if not t.is_empty():
				npc.collection.erase(t)
				t["origin"] = "won from " + npc.name
				data.collection.append(t)
				out.won_token = t
				out.text = line("after_win", {"name": npc.name})
		elif lost:
			var mine := {}
			for t in data.collection:
				if t.id == w.mine:
					mine = t
			if not mine.is_empty():
				data.collection.erase(mine)
				for p in data.pouches:
					p.ids.erase(mine.id)
				data.showcase.erase(mine.id)
				npc.collection.append(mine)
				out.lost_token = mine
				out.text = line("after_loss", {"name": npc.name})
	return out

# ---------------------------------------------------------------- market (2D economy rules)

static func buy_listing(data: Dictionary, listing: Dictionary) -> String:
	var town: Dictionary = data.town
	var npc := npc_by_id(town, listing.seller)
	var tok := npc_token(npc, listing.tok_id)
	if tok.is_empty():
		return "That token is gone."
	if data.player.gold < listing.price:
		return "Not enough gold."
	data.player.gold -= int(listing.price)
	var tax: float = stalls_cfg().market_tax[tok.rarity]
	npc.gold += roundi(listing.price * (1.0 - tax)) # the seller pays the tax
	npc.collection.erase(tok)
	tok["origin"] = "bought from " + npc.name
	data.collection.append(tok)
	town.listings.erase(listing)
	return "Bought %s for %d gold." % [tok.name, listing.price]

static func buy_supply(data: Dictionary, item: Dictionary) -> String:
	if data.player.gold < item.price:
		return "Not enough gold."
	if item.has("kit") and data.kit.get(item.kit, false):
		return "You already have one."
	data.player.gold -= int(item.price)
	if item.has("kit"): data.kit[item.kit] = true
	elif item.has("kit_count"): data.kit[item.kit_count] = int(data.kit.get(item.kit_count, 0)) + 1
	elif item.has("bag"): data.bag[item.bag] = int(data.bag.get(item.bag, 0)) + int(item.amount)
	elif item.has("armor"): data.kit.armor = item.armor
	elif item.has("okid"): data.okid[int(item.okid)] += 1
	elif item.has("ngakara"): data.ngakara += int(item.ngakara)
	return "Bought %s." % item.name

## Sell to the Guild: 75% of the baseline value, no tax.
static func guild_buyback(data: Dictionary, tok_id: String) -> String:
	for t in data.collection:
		if t.id == tok_id:
			var g := roundi(DyaEconomy.RARITY_VALUE[t.rarity] * float(stalls_cfg().buyback_rate))
			data.collection.erase(t)
			for p in data.pouches: p.ids.erase(tok_id)
			data.showcase.erase(tok_id)
			data.player.gold += g
			return "The Guild paid %d gold for %s." % [g, t.name]
	return ""

## List one of your tokens at your stall (flat listing fee, as in 2D).
static func list_token(data: Dictionary, tok_id: String, price: int) -> String:
	var fee := int(stalls_cfg().listing_fee)
	if data.player.gold < fee:
		return "The listing fee is %d gold." % fee
	for t in data.collection:
		if t.id == tok_id:
			data.player.gold -= fee
			data.collection.erase(t)
			for p in data.pouches: p.ids.erase(tok_id)
			data.showcase.erase(tok_id)
			data.town.my_listings.append({"tok": t, "price": price})
			return "Listed %s for %d gold." % [t.name, price]
	return ""

## A new day: stalls rotate and NPC buyers may take your listings.
static func new_day(data: Dictionary) -> Array:
	var town: Dictionary = data.town
	town.day += 1
	var rng := DyaRng.new(int(town.seed) * 31 + int(town.day))
	var sold := []
	for l in town.my_listings.duplicate():
		if rng.chance(clampf(float(DyaEconomy.RARITY_VALUE[l.tok.rarity]) / max(1.0, float(l.price)) * 0.4, 0.05, 0.8)):
			var buyer: Dictionary = rng.pick(town.npcs)
			if buyer.plays and buyer.gold >= l.price:
				buyer.gold -= int(l.price)
				buyer.collection.append(l.tok)
				data.player.gold += roundi(l.price * (1.0 - float(stalls_cfg().market_tax[l.tok.rarity])))
				town.my_listings.erase(l)
				sold.append(l.tok.name)
	restock(town, rng)
	return sold
