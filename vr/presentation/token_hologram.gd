class_name TokenHologram
extends Node3D
## The hologram that wakes when you press A while holding a token. The creature
## rises from your palm as a small shimmering figure with its info floating
## around it. Pull your hands apart (grip with the other hand) to blow it up to
## true size and walk around it. A Duel option sits next to it.

signal duel(tok: Dictionary)

const MINI := 0.045         # metres per creature-radius when miniature
const TRUE_UNIT := 0.1      # life-size metres per simulation unit

var tok: Dictionary
var sp: Dictionary
var coin: Node3D
var view: CreatureView
var info_root: Node3D
var size_now := MINI
var _pull_d0 := 0.0
var _pull_s0 := 0.0
var _free := false # true once it has been blown up and set down

static func wake(token: Dictionary, species: Dictionary, on_coin: Node3D) -> TokenHologram:
	var h := TokenHologram.new()
	h.tok = token
	h.sp = species
	h.coin = on_coin
	h.top_level = true
	h._build()
	return h

func _build() -> void:
	view = CreatureView.make(sp, tok)
	view.flying = sp.tags.has("flyer")
	add_child(view)
	view.set_fade(0.82)
	var glow := OmniLight3D.new()
	glow.light_color = Look.el_color(sp.element)
	glow.omni_range = 0.4
	glow.light_energy = 0.6
	add_child(glow)
	info_root = Node3D.new()
	add_child(info_root)
	var cost: Dictionary = tok.cost
	var parts := []
	for el in DyaEconomy.ELS:
		if cost[el] > 0:
			parts.append("%d %s" % [cost[el], el])
	var left := "%s\n%s · %s · %s\nCost: %s\nHealth %d · Strike %s · Speed %d" % [
		tok.get("name", sp.name), sp.element, DyaEconomy.RARITIES[tok.rarity], DyaEconomy.SIZES[tok.size_idx],
		" · ".join(parts), tok.stats.hp, str(tok.stats.dmg), tok.stats.speed]
	var l1 := WorldBuilder.label(left, Vector3(-0.17, 0.1, 0), 0.00045, info_root)
	l1.modulate = Look.el_color(sp.element).lightened(0.4)
	var right := "Temperament\n%s\n\n%s\n\nSpecial rules\n%s" % [_wrap(sp.get("temperament", ""), 38), _wrap(DyaToken.temper_text(tok), 38), _wrap(sp.get("special", ""), 38)]
	WorldBuilder.label(right, Vector3(0.19, 0.1, 0), 0.00038, info_root)
	var story: String = tok.get("story", "")
	var below := _wrap(sp.get("desc", ""), 60) + ("\n\nBackground\n" + _wrap(story, 60) if story != "" else "")
	WorldBuilder.label(below, Vector3(0, 0.235, 0), 0.00036, info_root)
	var b := PanelButton.make("Duel", Vector3(0, -0.035, 0.07), func(): duel.emit(tok), 0.08, 0.0008)
	b.scale = Vector3.ONE * 0.6
	info_root.add_child(b)
	_apply_size()

static func _wrap(text: String, width: int) -> String:
	var out := ""
	var line := ""
	for w in text.split(" "):
		if line.length() + w.length() + 1 > width:
			out += line + "\n"
			line = w
		else:
			line = w if line == "" else line + " " + w
	return out + line

func true_size() -> float:
	return float(DyaEconomy.SIZE_RADIUS[tok.size_idx]) * TRUE_UNIT

func _apply_size() -> void:
	view.scale = Vector3.ONE * size_now
	if view.flying:
		view.position.y = size_now * 1.2

func _process(_delta: float) -> void:
	if not is_instance_valid(coin):
		queue_free()
		return
	var rig: XRRig = Game.rig
	var holder: Hand = coin.get("holder")
	if not _free:
		global_position = coin.global_position + Vector3(0, 0.03, 0)
	# face the info toward the player
	if rig != null:
		var to := rig.head_pos() - global_position
		to.y = 0
		if to.length() > 0.05:
			info_root.global_rotation = Vector3(0, atan2(to.x, to.z), 0)
			if not _free:
				view.rotation.y = atan2(to.x, to.z) + PI
	if rig == null or holder == null:
		_pull_d0 = 0.0
		return
	var other: Hand = rig.left if holder == rig.right else rig.right
	if other.is_down("grip") and other.held == null:
		var d := other.global_position.distance_to(holder.global_position)
		if _pull_d0 == 0.0:
			_pull_d0 = max(0.05, d)
			_pull_s0 = size_now
		size_now = clampf(_pull_s0 * pow(d / _pull_d0, 3.0), MINI, true_size())
		_apply_size()
		if size_now > MINI * 2.5 and not _free:
			# big enough to stand on the floor and be walked around
			_free = true
			global_position = Vector3(global_position.x, rig.global_position.y, global_position.z) + rig.head_forward() * (size_now * 1.5)
			info_root.position = Vector3(0, 1.0, 0)
			info_root.scale = Vector3.ONE * 2.5
	else:
		_pull_d0 = 0.0
