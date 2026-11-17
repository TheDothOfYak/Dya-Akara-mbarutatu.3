class_name HuntRules
extends RefCounted
## Rules for hunting as yourself in the wilds. No nodes: the scene asks these
## functions what is allowed and what happens. No slots, levels, cooldowns or
## piece limits. Killing is never required. A hunt ends when you leave.

const UNIT := 0.06            # metres per creature size unit in the wilds
const DOWN_FRAC := 0.25       # a creature this hurt stops fighting and yields
const WEAPONS := {
	# min_speed: how fast the business end must move (weapons have real weight); cooldown between hits
	"blade": {"damage": 14.0, "min_speed": 2.2, "cooldown": 0.7, "reach": 0.9},
	"spear": {"damage": 18.0, "min_speed": 1.8, "cooldown": 0.9, "reach": 1.9, "thrust": true},
	"whip": {"damage": 8.0, "min_speed": 5.0, "cooldown": 0.8, "reach": 2.8, "stagger": 1.2},
	"bow": {"damage": 20.0, "min_speed": 0.0, "cooldown": 0.0, "reach": 0.0},
	"knife": {"damage": 6.0, "min_speed": 2.0, "cooldown": 0.5, "reach": 0.35},
}
const ARMOR := {"": {"block": 0.0, "tire": 1.0}, "light": {"block": 0.25, "tire": 1.15}, "heavy": {"block": 0.5, "tire": 1.5}}
const HUNGER_PER_MIN := 4.0   # the meters drain slowly while you are away
const TIRED_PER_MIN := 3.0

static func radius_m(c: Dictionary) -> float:
	return float(DyaEconomy.SIZE_RADIUS[int(c.tok.size_idx)]) * UNIT

static func new_hunt() -> Dictionary:
	return {"health": 100.0, "new_pieces": [], "run": {}, "collapsed": false}

## Per-creature state for this hunt only (what persists lives on the creature record).
static func run_state(hunt: Dictionary, c: Dictionary) -> Dictionary:
	if not hunt.run.has(c.id):
		hunt.run[c.id] = {"alerted": false, "hurt_by_you": false, "trapped": false, "downed": false}
	return hunt.run[c.id]

static func is_downed(c: Dictionary) -> bool:
	return c.alive and float(c.hp) <= float(c.tok.stats.hp) * DOWN_FRAC

## Would this individual attack you on sight? From its own temperament and its memory of you.
static func is_hostile(c: Dictionary, rs: Dictionary) -> bool:
	if not c.alive or is_downed(c) or rs.trapped:
		return false
	if rs.hurt_by_you:
		return true
	var sp := SpeciesDB.get_sp(c.species)
	var d := WildsSim.disposition(c)
	if d <= -0.4:
		return true
	if d >= 0.4:
		return false
	return (sp.tags.has("apex") and int(c.tok.behavior_value) > 500) or int(c.tok.behavior_value) > 900

static func weapon_hit(kind: String, speed: float, draw := 1.0) -> float:
	var w: Dictionary = WEAPONS.get(kind, {})
	if w.is_empty():
		return 2.0 if speed > 3.0 else 0.0 # anything thrown still stings a little
	if kind == "bow":
		return float(w.damage) * clampf(draw, 0.2, 1.0)
	if speed < float(w.min_speed):
		return 0.0
	return float(w.damage) * clampf(speed / float(w.min_speed), 1.0, 1.6)

## Hurt a creature. Returns what happened: "", "hurt", "downed" or "dead".
static func strike(hunt: Dictionary, c: Dictionary, damage: float) -> String:
	if damage <= 0.0 or not c.alive:
		return ""
	var rs := run_state(hunt, c)
	var was_down := is_downed(c)
	rs.hurt_by_you = true
	rs.alerted = true
	c.hp = max(0.0, float(c.hp) - damage)
	c.memory.hurt = int(c.memory.hurt) + 1
	if float(c.hp) <= 0.0:
		c.alive = false
		return "dead"
	if is_downed(c) and not was_down:
		rs.downed = true
		return "downed"
	return "hurt"

## Each kind of piece is taken its own way. Returns {ok, why, how}.
static func can_take(hunt: Dictionary, c: Dictionary, piece_def: Dictionary, kit: Dictionary) -> Dictionary:
	var rs := run_state(hunt, c)
	var method: String = piece_def.method
	if method == "pickup":
		return {"ok": false, "why": "This kind is shed. Look for it on the ground.", "how": ""}
	if not kit.get("knife", false):
		return {"ok": false, "why": "You need a knife.", "how": ""}
	var down: bool = is_downed(c) or not c.alive
	if method == "cut":
		if not down and not rs.trapped:
			return {"ok": false, "why": "It must be trapped or beaten before a %s can be cut." % piece_def.kind, "how": ""}
		return {"ok": true, "why": "", "how": "trapped" if rs.trapped and not rs.hurt_by_you else ("fought" if not c.alive else "spared")}
	# shave: comes off a living creature without harming it
	if not c.alive:
		return {"ok": false, "why": "A shaving must come from a living creature.", "how": ""}
	if rs.trapped and not rs.hurt_by_you:
		return {"ok": true, "why": "", "how": "trapped"}
	if down:
		return {"ok": true, "why": "", "how": "spared"}
	if not rs.alerted and not is_hostile(c, rs):
		return {"ok": true, "why": "", "how": "tracked"}
	return {"ok": false, "why": "It will not hold still. Calm it, trap it or beat it first.", "how": ""}

static func take(hunt: Dictionary, wilds: Dictionary, c: Dictionary, piece_def: Dictionary, kit: Dictionary) -> Dictionary:
	var a := can_take(hunt, c, piece_def, kit)
	if not a.ok:
		return {}
	var piece := WildsSim.take_piece(wilds, c, piece_def.kind, a.how, c.habitat)
	if a.how == "spared" or a.how == "tracked":
		c.memory.spared = int(c.memory.spared) + 1
	hunt.new_pieces.append(piece)
	return piece

static func pick_up_shed(hunt: Dictionary, wilds: Dictionary, shed: Dictionary) -> Dictionary:
	var piece := WildsSim.shed_piece(wilds, shed)
	hunt.new_pieces.append(piece)
	return piece

# ---------------------------------------------------------------- survival

## Drain hunger and tiredness. Meters run 100 (fine) to 0 (empty).
static func survive(data: Dictionary, minutes: float) -> void:
	var s: Dictionary = data.survival
	var tire: float = ARMOR.get(data.kit.get("armor", ""), ARMOR[""]).tire
	s.hunger = max(0.0, float(s.hunger) - HUNGER_PER_MIN * minutes)
	s.tired = max(0.0, float(s.tired) - TIRED_PER_MIN * minutes * tire)

## An empty meter makes you weaker and slower, not an instant failure.
static func move_penalty(data: Dictionary) -> float:
	var s: Dictionary = data.survival
	var m := 1.0
	if float(s.hunger) <= 0.0: m *= 0.7
	if float(s.tired) <= 0.0: m *= 0.7
	return m

static func strength(data: Dictionary) -> float:
	return move_penalty(data)

static func eat(data: Dictionary) -> bool:
	var s: Dictionary = data.survival
	if int(data.bag.get("meals", 0)) > 0:
		data.bag.meals = int(data.bag.meals) - 1
		s.hunger = min(100.0, float(s.hunger) + 70.0) # a cooked meal lasts longer
		return true
	if int(data.bag.get("food", 0)) > 0:
		data.bag.food = int(data.bag.food) - 1
		s.hunger = min(100.0, float(s.hunger) + 35.0)
		return true
	return false

static func cook(data: Dictionary) -> bool:
	if int(data.bag.get("food", 0)) <= 0:
		return false
	data.bag.food = int(data.bag.food) - 1
	data.bag.meals = int(data.bag.get("meals", 0)) + 1
	return true

## Sleep on a bedroll at camp: rest returns, a day passes in the wilds.
static func sleep(data: Dictionary) -> Array:
	data.survival.tired = 100.0
	data.survival.hunger = max(0.0, float(data.survival.hunger) - 15.0)
	return WildsSim.advance_day(data.wilds)

static func damage_to_player(data: Dictionary, raw: float, blocking: bool) -> float:
	var block: float = ARMOR.get(data.kit.get("armor", ""), ARMOR[""]).block
	var d := raw * (1.0 - block)
	if blocking:
		d *= 0.25
	return d

## Leaving ends the hunt, with or without a piece: what you carry reaches the workshop rack.
static func finish(data: Dictionary, hunt: Dictionary) -> int:
	var n: int = hunt.new_pieces.size()
	for p in hunt.new_pieces:
		data.pieces.append(p)
	hunt.new_pieces = []
	return n

## Beaten or collapsed: you wake in Sri'Ciakala without your food or the new
## materials you were carrying. Tokens are never lost this way.
static func fail(data: Dictionary, hunt: Dictionary) -> Dictionary:
	var lost := {"food": int(data.bag.get("food", 0)) + int(data.bag.get("meals", 0)), "pieces": hunt.new_pieces.size()}
	data.bag.food = 0
	data.bag.meals = 0
	hunt.new_pieces = []
	hunt.collapsed = true
	data.survival.hunger = 50.0
	data.survival.tired = 60.0
	return lost
