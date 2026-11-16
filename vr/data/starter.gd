class_name Starter
extends RefCounted
## Data-layer helpers that build pouches and starting collections from the
## creature folders. Deterministic for a given seed.

## A mixed pouch of `n` freshly minted tokens. Sentient runners are included so
## a match can be won by carrying the Relic.
static func make_pouch(seed_value: int, n: int = DyaEconomy.POUCH_SIZE, owner: String = "") -> Array:
	var db := SpeciesDB.all()
	var rng := DyaRng.new(seed_value)
	var order := ["sword_eikar", "archer_eikar", "wild_punk", "spear_eikar", "tonguatjis", "kuni_byrd", "sword_eikar",
		"ular_naga", "archer_eikar", "sru_vorn", "spear_eikar", "lutut", "wild_punk", "hvaleia", "su_naga"]
	var out := []
	for i in n:
		var id: String = order[i % order.size()]
		if not db.has(id):
			id = db.keys()[i % db.size()]
		var opts := {}
		if owner != "":
			opts["origin"] = owner
		out.append(DyaToken.mint(db[id], rng, opts))
	return out
