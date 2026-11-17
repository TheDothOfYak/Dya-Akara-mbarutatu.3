class_name Crafting
extends RefCounted
## Crafting rules (2D table): Okid and NgAkara by rarity. A token is crafted
## exactly as the creature was when the piece was taken; its behaviour value
## and background story are locked at crafting time.

const HOW_TEXT := {
	"tracked": "It was tracked to where it lived and the piece was taken without a fight.",
	"trapped": "It was caught in a trap and the piece was taken.",
	"fought": "It was fought, and the piece was taken from it.",
	"spared": "It was beaten and spared, and the piece was taken from the living creature.",
	"found": "The piece was found where the creature had shed it.",
	"shaved": "The piece was shaved from the living creature without harming it.",
}

static func cost(piece: Dictionary) -> Dictionary:
	var r: int = int(piece.tok.rarity)
	return {"rarity": r, "okid": int(DyaEconomy.CRAFT_COST[r][0]), "ngakara": int(DyaEconomy.CRAFT_COST[r][1])}

static func can_craft(data: Dictionary, piece: Dictionary) -> Dictionary:
	var c := cost(piece)
	var have_okid := int(data.okid[c.rarity])
	var have_ng := int(data.ngakara)
	c["have_okid"] = have_okid
	c["have_ngakara"] = have_ng
	c["ok"] = have_okid >= c.okid and have_ng >= c.ngakara
	return c

static func tag_text(data: Dictionary, piece: Dictionary) -> String:
	var c := can_craft(data, piece)
	var sp := SpeciesDB.get_sp(piece.species)
	return "%s\nbecomes: %s (%s %s)\n%s Okid %d/%d · NgAkara %d/%d\n%s" % [piece.kind.capitalize(), sp.name, DyaEconomy.RARITIES[c.rarity], DyaEconomy.SIZES[int(piece.tok.size_idx)],
		DyaEconomy.RARITIES[c.rarity], c.have_okid, c.okid, c.have_ngakara, c.ngakara, "Ready to craft" if c.ok else "Not enough materials"]

## The background story is written from the hunt: where, and how.
static func story(piece: Dictionary) -> String:
	var sp := SpeciesDB.get_sp(piece.species)
	return "This %s lived in the %s near Sri'Ciakala. %s The %s became this token." % [sp.name, TownData.HABITAT_NAMES.get(piece.place, piece.place),
		HOW_TEXT.get(piece.how, ""), piece.kind]

## Craft the token. Refused (returns {}) if materials are short.
static func craft(data: Dictionary, piece: Dictionary) -> Dictionary:
	var c := can_craft(data, piece)
	if not c.ok:
		return {}
	data.okid[c.rarity] = int(data.okid[c.rarity]) - c.okid
	data.ngakara = int(data.ngakara) - c.ngakara
	var tok: Dictionary = piece.tok.duplicate(true)
	tok.id = "tok_" + str(piece.id)
	tok["origin"] = "crafted"
	tok["story"] = story(piece)
	tok["crafted_from"] = piece.creature
	tok.cost = DyaToken.cost_vec(tok, SpeciesDB.get_sp(tok.species))
	data.pieces.erase(piece)
	data.shelf.erase(piece)
	data.collection.append(tok)
	return tok
