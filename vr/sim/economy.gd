class_name DyaEconomy
extends RefCounted
## Economy tables ported from the 2D game (js/data/economy.js, js/data/species.js).

const ELS := ["Fti", "Su", "Eldi", "Ular"]
const RARITIES := ["Buri", "Tui", "Stamijan", "Naelst", "Onnar", "Elster", "Torcain"]
const RARITY_COST := [1, 2, 3, 5, 8, 12, 20]
const RARITY_VALUE := [40, 90, 200, 450, 1000, 2400, 6000]
const SIZES := ["Litk", "Mael", "Vel", "Skor", "Skaar"]
const SIZE_HP := [30, 60, 130, 260, 480]
const SIZE_DMG := [4, 7, 13, 22, 34]
const SIZE_RADIUS := [9, 13, 19, 27, 38]
const SIZE_SPEED := [58, 52, 46, 38, 30]
const ELEMENT_COLORS := {"Fti": "#f0f0f5", "Su": "#3b9ae1", "Eldi": "#e8842c", "Ular": "#4caf50"}
## Colour is never the only signal: each resource also has a shape.
const ELEMENT_SHAPES := {"Fti": "diamond", "Su": "sphere", "Eldi": "pyramid", "Ular": "cube"}

const PULSE_INTERVALS := [2, 5, 8, 10, 15]
const PULSE_AMOUNTS := [1, 2, 3, 4, 5]
## Arena scale ring, in metres per simulation unit. The field is 1600 x 1000
## units, so 0.001 is a 1.6 m tabletop and 0.1 is a 160 m life-size arena.
const SCALES := [0.001, 0.003, 0.01, 0.03, 0.1]
const SCALE_NAMES := ["Tabletop", "Large table", "Person-sized", "Courtyard", "Life-size"]
const POUCH_SIZE := 25

## Okid and NgAkara per rarity.
const CRAFT_COST := [[1, 1], [1, 2], [2, 3], [3, 5], [5, 8], [8, 12], [15, 20]]

static func escalation_mult(elapsed_sec: float) -> int:
	if elapsed_sec < 600.0: return 1
	if elapsed_sec < 900.0: return 2
	if elapsed_sec < 1200.0: return 3
	return 4 + int(floor((elapsed_sec - 1200.0) / 300.0))

static func _nearest(v: float, arr: Array):
	var best = arr[0]
	var bd := INF
	for o in arr:
		var d: float = abs(o - v)
		if d < bd:
			bd = d
			best = o
	return best

## Combine two horde-token ring votes into the match settings (the middle
## ground, as in the 2D game). A ring vote of 0 means "at the bottom" = chaos.
## A dial is chaos only when BOTH players leave it at the bottom; if only one
## does, the other player's value stands.
static func combine_votes(a: Dictionary, b: Dictionary) -> Dictionary:
	var out := {}
	var ai: int = a.get("interval", 0)
	var bi: int = b.get("interval", 0)
	var aa: int = a.get("amount", 0)
	var ba: int = b.get("amount", 0)
	out["chaos_interval"] = ai == 0 and bi == 0
	out["chaos_amount"] = aa == 0 and ba == 0
	out["pulse_interval"] = 8 if out["chaos_interval"] else _nearest((ai + bi) / 2.0 if ai > 0 and bi > 0 else float(max(ai, bi)), PULSE_INTERVALS)
	out["pulse_amount"] = 2 if out["chaos_amount"] else _nearest((aa + ba) / 2.0 if aa > 0 and ba > 0 else float(max(aa, ba)), PULSE_AMOUNTS)
	var sa: int = clampi(a.get("scale", 0), 0, SCALES.size() - 1)
	var sb: int = clampi(b.get("scale", 0), 0, SCALES.size() - 1)
	out["scale_idx"] = int(floor((sa + sb) / 2.0))
	out["scale"] = SCALES[out["scale_idx"]]
	return out
