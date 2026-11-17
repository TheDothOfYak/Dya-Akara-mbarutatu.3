class_name ArenaView
extends Node3D
## Shows a match (live or replay) at any scale. The node's own transform maps
## simulation units to the world: local x = sim x, local y = altitude,
## local z = sim y. Scale is visual only; the rules never see it.
##
## Terrain is a hologram laid over the real surroundings. The border is only an
## outline on the ground: no wall, no ceiling.

const TERRAINS := {
	"plains": {"ground": Color(0.45, 0.62, 0.35, 0.55), "prop": "bush", "count": 26},
	"forest": {"ground": Color(0.22, 0.42, 0.25, 0.55), "prop": "tree", "count": 60},
	"mountain": {"ground": Color(0.5, 0.5, 0.52, 0.55), "prop": "spire", "count": 34},
	"desert": {"ground": Color(0.8, 0.68, 0.42, 0.55), "prop": "dune", "count": 28},
}

var sim: MatchSim
var unit := 0.01 # metres per simulation unit
var views := {}       # creature id -> CreatureView
var relic_nodes := []
var horde_nodes := []
var orb_nodes := [[], []]
var proj_nodes := {}
var zone_nodes := {}
var orbs_above: Array = [] # big matches: your resources also float above you
var player_team := 0
var bare := false # sandbox and desk holograms: no hordes, props or stands
var fx_root: Node3D
var _t := 0.0
var _edge: Node3D
var _edge_alpha := 0.0

## origin: world position of `anchor_sim` (a sim x,y point); forward: world direction of sim +x.
func setup(match_sim: MatchSim, origin: Vector3, forward: Vector3, metres_per_unit: float, anchor_sim: Vector2, terrain_id: String) -> void:
	sim = match_sim
	unit = metres_per_unit
	forward.y = 0
	forward = forward.normalized()
	var right := forward.cross(Vector3.UP).normalized()
	var b := Basis(forward * unit, Vector3.UP * unit, right * unit)
	global_transform = Transform3D(b, origin - b * Vector3(anchor_sim.x, 0, anchor_sim.y))
	fx_root = Node3D.new()
	add_child(fx_root)
	if bare:
		var g := MeshInstance3D.new()
		var pm := PlaneMesh.new()
		pm.size = Vector2(MatchSim.W, MatchSim.H)
		g.mesh = pm
		g.position = Vector3(MatchSim.W * 0.5, 0.5, MatchSim.H * 0.5)
		g.material_override = _holo(Color(0.4, 0.7, 0.9, 0.25))
		add_child(g)
		_build_edge()
		return
	_build_terrain(terrain_id)
	_build_edge()
	_build_hordes()
	if unit * MatchSim.W >= 40.0:
		_build_stands()

func to_world(x: float, y: float, z := 0.0) -> Vector3:
	return global_transform * Vector3(x, z, y)

func to_sim(world: Vector3) -> Vector2:
	var l := global_transform.affine_inverse() * world
	return Vector2(l.x, l.z)

func floor_y() -> float:
	return global_position.y

# ---------------------------------------------------------------- scenery

func _holo(col: Color) -> Material:
	return Art.hologram(col)

func _build_terrain(id: String) -> void:
	var t: Dictionary = TERRAINS.get(id, TERRAINS.plains)
	# the terrain covers the arena and goes beyond it
	var g := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(MatchSim.W * 1.8, MatchSim.H * 2.0)
	g.mesh = pm
	g.position = Vector3(MatchSim.W * 0.5, 0.5, MatchSim.H * 0.5)
	g.material_override = _holo(t.ground)
	add_child(g)
	var rng := RandomNumberGenerator.new() # scenery only, never rules
	rng.seed = sim.seed_value
	var col: Color = t.ground
	var pm_trunk := _holo(Color(0.4, 0.28, 0.18, 0.7))
	var pm_leaf := _holo(Color(col.r * 0.7, col.g * 1.1, col.b * 0.7, 0.7))
	var pm_rock := _holo(Color(0.55, 0.55, 0.58, 0.75))
	for i in int(t.count):
		var x := rng.randf_range(-MatchSim.W * 0.35, MatchSim.W * 1.35)
		var y := rng.randf_range(-MatchSim.H * 0.45, MatchSim.H * 1.45)
		var inside := x > 0 and x < MatchSim.W and y > 0 and y < MatchSim.H
		# keep the hordes and the middle lane readable
		if inside and (absf(y - MatchSim.H * 0.5) < 120.0 or rng.randf() < 0.5):
			continue
		var s := rng.randf_range(0.7, 1.4)
		match t.prop:
			"tree":
				_prop(_cyl_mesh(8, 8, 60), pm_trunk, Vector3(x, 30 * s, y), Vector3.ONE * s)
				_prop(_cyl_mesh(0, 34, 90), pm_leaf, Vector3(x, 95 * s, y), Vector3.ONE * s)
			"bush":
				_prop(_ball_mesh(16), pm_leaf, Vector3(x, 8 * s, y), Vector3(1.4, 0.8, 1.4) * s)
			"spire":
				# cliffs rise around the outside; some creatures perch on them
				var h := (220.0 if not inside else 60.0) * s
				_prop(_cyl_mesh(6, 36, h), pm_rock, Vector3(x, h * 0.5, y), Vector3.ONE)
			"dune":
				_prop(_ball_mesh(60), pm_leaf if false else _holo(Color(0.85, 0.74, 0.5, 0.7)), Vector3(x, 0, y), Vector3(1.6, 0.25, 1.0) * s)

func _cyl_mesh(top: float, bottom: float, h: float) -> CylinderMesh:
	var c := CylinderMesh.new()
	c.top_radius = top
	c.bottom_radius = bottom
	c.height = h
	c.radial_segments = 6
	c.rings = 1
	return c

func _ball_mesh(r: float) -> SphereMesh:
	var s := SphereMesh.new()
	s.radius = r
	s.height = r * 2.0
	s.radial_segments = 8
	s.rings = 4
	return s

func _prop(mesh: Mesh, mat: Material, pos: Vector3, scl: Vector3) -> void:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = pos
	mi.scale = scl
	add_child(mi)

func _build_edge() -> void:
	_edge = Node3D.new()
	add_child(_edge)
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = Color(0.7, 0.95, 1.0, 0.0)
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	var th := 5.0
	for seg in [[Vector3(MatchSim.W * 0.5, 1, 0), Vector3(MatchSim.W, 1.5, th)], [Vector3(MatchSim.W * 0.5, 1, MatchSim.H), Vector3(MatchSim.W, 1.5, th)],
			[Vector3(0, 1, MatchSim.H * 0.5), Vector3(th, 1.5, MatchSim.H)], [Vector3(MatchSim.W, 1, MatchSim.H * 0.5), Vector3(th, 1.5, MatchSim.H)]]:
		var mi := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = seg[1]
		mi.mesh = bm
		mi.position = seg[0]
		mi.material_override = m
		_edge.add_child(mi)
	_edge.set_meta("mat", m)

func _build_hordes() -> void:
	for T in sim.teams:
		var h := Node3D.new()
		h.position = Vector3(T.hoard.x, 0, T.hoard.y)
		add_child(h)
		var col := Color(0.85, 0.72, 0.48) if T.idx == 0 else Color(0.7, 0.36, 0.36)
		WorldBuilder.cyl(40.0, 6.0, Vector3(0, 3, 0), col, h)
		for k in 3:
			var ring := MeshInstance3D.new()
			var tm := TorusMesh.new()
			tm.inner_radius = 44.0 + k * 9.0
			tm.outer_radius = 50.0 + k * 9.0
			tm.rings = 24
			tm.ring_segments = 5
			ring.mesh = tm
			ring.position.y = 3.0
			ring.material_override = WorldBuilder.mat(col.darkened(0.15 + 0.12 * k))
			h.add_child(ring)
		var glow := OmniLight3D.new()
		glow.position.y = 30.0
		glow.omni_range = 160.0
		glow.light_energy = 0.0
		glow.light_color = col
		h.add_child(glow)
		h.set_meta("glow", glow)
		horde_nodes.append(h)
	for rl in sim.relics:
		# The Relic: a floating stone of constant size above the horde centre.
		var stone := MeshInstance3D.new()
		var sm := SphereMesh.new()
		sm.radius = 11.0
		sm.height = 30.0
		sm.radial_segments = 6
		sm.rings = 3
		stone.mesh = sm
		var m := StandardMaterial3D.new()
		m.albedo_color = Color(0.9, 0.85, 0.6) if rl.owner == 0 else Color(0.9, 0.55, 0.5)
		m.emission_enabled = true
		m.emission = m.albedo_color
		m.emission_energy_multiplier = 0.6
		stone.material_override = m
		add_child(stone)
		relic_nodes.append(stone)

func _build_stands() -> void:
	# Big arenas: the stadium and its crowd are real and stay where they are.
	var crowd := MultiMesh.new()
	crowd.transform_format = MultiMesh.TRANSFORM_3D
	var cap := CapsuleMesh.new()
	cap.radius = 0.22 / unit
	cap.height = 1.1 / unit
	cap.radial_segments = 5
	cap.rings = 2
	crowd.mesh = cap
	var rows := 5
	var per := 60
	crowd.instance_count = rows * per * 2
	var n := 0
	for side in 2:
		var z0: float = -260.0 if side == 0 else MatchSim.H + 260.0
		var dirz := -1.0 if side == 0 else 1.0
		for r in rows:
			var step_h: float = (1.0 + r * 0.9) / unit
			var depth: float = (1.2 * r) / unit
			WorldBuilder.box(Vector3(MatchSim.W * 1.1, 0.9 / unit, 1.2 / unit), Vector3(MatchSim.W * 0.5, step_h - 0.6 / unit, z0 + dirz * depth), Color(0.45, 0.42, 0.4), self)
			for i in per:
				var x := MatchSim.W * (-0.05 + 1.1 * (i + 0.5) / per)
				crowd.set_instance_transform(n, Transform3D(Basis(), Vector3(x, step_h + 0.5 / unit, z0 + dirz * depth)))
				n += 1
	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = crowd
	mmi.material_override = WorldBuilder.mat(Color(0.55, 0.5, 0.6))
	add_child(mmi)
	var murmur := AudioStreamPlayer.new()
	murmur.stream = Game.sfx.sounds["crowd"]
	murmur.bus = "Crowd"
	murmur.volume_db = -18.0
	murmur.autoplay = true
	add_child(murmur)

# ---------------------------------------------------------------- live sync

func show_edge() -> void:
	_edge_alpha = 0.001

func set_result_glow(winner: int) -> void:
	for i in horde_nodes.size():
		var glow: OmniLight3D = horde_nodes[i].get_meta("glow")
		glow.light_energy = 3.0 if i == winner else 0.0
		for ch in horde_nodes[i].get_children():
			if ch is MeshInstance3D and i != winner and winner >= 0:
				ch.material_override.albedo_color = ch.material_override.albedo_color.darkened(0.6)

func _process(delta: float) -> void:
	if sim == null:
		return
	_t += delta
	if _edge_alpha > 0.0 and _edge_alpha < 0.55:
		_edge_alpha = min(0.55, _edge_alpha + delta * 0.5)
		_edge.get_meta("mat").albedo_color.a = _edge_alpha
	_sync_creatures(delta)
	_sync_relics()
	_sync_orbs()
	_sync_projectiles()
	_sync_zones()

func _sync_creatures(delta: float) -> void:
	var head := Vector3.ZERO
	if Game.rig != null:
		head = Game.rig.head_pos()
	var seen := {}
	for c in sim.creatures:
		if c.removed:
			continue
		var v: CreatureView = views.get(c.id)
		if c.dead:
			if v != null:
				v.set_state("death")
				if sim.tick - c.dead_tick > 30:
					v.queue_free()
					views.erase(c.id)
				else:
					seen[c.id] = true
			continue
		seen[c.id] = true
		if v == null:
			v = CreatureView.make(c.sp, c.tok)
			v.scale = Vector3.ONE * c.radius
			v.position = Vector3(c.x, c.z, c.y)
			v.flying = c.flyer
			# team marker: a ring on the ground in the horde's colour
			var ring := MeshInstance3D.new()
			var tm := TorusMesh.new()
			tm.inner_radius = 1.05
			tm.outer_radius = 1.2
			tm.rings = 16
			tm.ring_segments = 4
			ring.mesh = tm
			ring.material_override = WorldBuilder.mat(Color(0.95, 0.8, 0.4) if c.team == 0 else Color(0.9, 0.35, 0.35), true)
			ring.name = "team_ring"
			v.add_child(ring)
			add_child(v)
			views[c.id] = v
		var target := Vector3(c.x, c.z, c.y)
		v.position = v.position.lerp(target, min(1.0, delta * 12.0))
		var ring_n: Node3D = v.get_node("team_ring")
		ring_n.position.y = (0.05 - c.z / c.radius) if c.flyer else 0.05
		var f: Vector2 = c.facing
		var want := atan2(-f.x, -f.y)
		v.rotation.y = lerp_angle(v.rotation.y, want, min(1.0, delta * 8.0))
		v.set_state(c.state)
		if c.naga:
			v.set_heads(c.heads_left)
		# dissolve as the tether strains; ghost when close to your head so nothing blocks your view
		var near_head: bool = Game.rig != null and v.global_position.distance_to(head) < 0.55 + c.radius * unit
		if near_head:
			v.set_fade(0.2)
		elif c.tether_frac > 0.4:
			v.set_fade(clampf(1.0 - (c.tether_frac - 0.4) / 0.6, 0.08, 1.0))
		else:
			v.set_fade(1.0)
	for id in views.keys():
		if not seen.has(id):
			views[id].queue_free()
			views.erase(id)

func _sync_relics() -> void:
	for i in sim.relics.size():
		var rl: Dictionary = sim.relics[i]
		var n: MeshInstance3D = relic_nodes[i]
		var h := 62.0
		if rl.carrier >= 0:
			var car = sim.creature_by_id(rl.carrier)
			if car != null:
				h = car.z + car.radius * 2.2 + 12.0
		n.position = n.position.lerp(Vector3(rl.x, h + sin(_t * 1.5 + i) * 3.0, rl.y + 26.0 if rl.carrier < 0 and Vector2(rl.x, rl.y).distance_to(Vector2(rl.home_x, rl.home_y)) < 1.0 else rl.y), 0.3)
		n.rotation.y = _t * 0.6

## Resources hover in and around the horde, in their colour and shape.
func _sync_orbs() -> void:
	for T in sim.teams:
		var list: Array = orb_nodes[T.idx]
		var want := []
		for el in MatchSim.ELS:
			for k in min(12, int(T.resources[el])):
				want.append(el)
		while list.size() > want.size():
			list.pop_back().queue_free()
		for i in want.size():
			if i >= list.size():
				var mi := MeshInstance3D.new()
				add_child(mi)
				mi.set_meta("el", "")
				list.append(mi)
			var o: MeshInstance3D = list[i]
			if o.get_meta("el") != want[i]:
				o.set_meta("el", want[i])
				o.mesh = Look.el_mesh(want[i])
				o.material_override = Look.jewel_mat(want[i], true)
			var a: float = _t * 0.5 + TAU * i / max(1, want.size())
			var r := 70.0 + 14.0 * (i % 3)
			o.position = Vector3(T.hoard.x + cos(a) * r, 28.0 + 10.0 * (i % 4) + sin(_t * 2.0 + i) * 3.0, T.hoard.y + sin(a) * r)
			o.scale = Vector3.ONE * 9.0
	# big matches: your resources also float above you for the crowd
	if unit * MatchSim.W >= 40.0 and Game.rig != null:
		var mine: Array = orb_nodes[player_team]
		while orbs_above.size() > mine.size():
			orbs_above.pop_back().queue_free()
		for i in mine.size():
			if i >= orbs_above.size():
				var mi2 := MeshInstance3D.new()
				mi2.top_level = true
				add_child(mi2)
				orbs_above.append(mi2)
			var o2: MeshInstance3D = orbs_above[i]
			o2.mesh = mine[i].mesh
			o2.material_override = mine[i].material_override
			var a2: float = _t * 0.6 + TAU * i / max(1, mine.size())
			o2.global_position = Game.rig.head_pos() + Vector3(cos(a2) * 0.5, 0.9, sin(a2) * 0.5)
			o2.scale = Vector3.ONE * 0.12

func _sync_projectiles() -> void:
	var seen := {}
	for p in sim.projectiles:
		seen[p.id] = true
		var n: Node3D = proj_nodes.get(p.id)
		if n == null:
			n = WorldBuilder.box(Vector3(3, 3, 14), Vector3.ZERO, Color(0.95, 0.9, 0.7), self)
			proj_nodes[p.id] = n
		n.position = Vector3(p.x, p.z, p.y)
	for id in proj_nodes.keys():
		if not seen.has(id):
			proj_nodes[id].queue_free()
			proj_nodes.erase(id)

func _sync_zones() -> void:
	var seen := {}
	for z in sim.zones:
		seen[z.id] = true
		if not zone_nodes.has(z.id):
			var n := WorldBuilder.cyl(z.r, 2.0, Vector3(z.x, 1.5, z.y), Color(0.55, 0.75, 0.25, 0.5), self)
			zone_nodes[z.id] = n
	for id in zone_nodes.keys():
		if not seen.has(id):
			zone_nodes[id].queue_free()
			zone_nodes.erase(id)

## A short puff at a sim position (spawn, hit, death, pulse).
func puff(x: float, y: float, z: float, col: Color, size: float) -> void:
	var n := WorldBuilder.ball(1.0, Vector3(x, z, y), Color(col.r, col.g, col.b, 0.7), fx_root)
	n.material_override.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	n.scale = Vector3.ONE * size * 0.3
	var tw := n.create_tween().set_parallel(true)
	tw.tween_property(n, "scale", Vector3.ONE * size, 0.35)
	tw.tween_property(n.material_override, "albedo_color:a", 0.0, 0.35)
	tw.chain().tween_callback(n.queue_free)
