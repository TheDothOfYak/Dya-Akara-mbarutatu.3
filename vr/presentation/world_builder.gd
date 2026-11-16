class_name WorldBuilder
extends RefCounted
## Small helpers for building low-poly placeholder scenery in code.

static func sky_environment(sky_col: Color, ground_col: Color) -> WorldEnvironment:
	var we := WorldEnvironment.new()
	var env := Environment.new()
	var sky := Sky.new()
	var mat := ProceduralSkyMaterial.new()
	mat.sky_top_color = sky_col.darkened(0.3)
	mat.sky_horizon_color = sky_col.lightened(0.3)
	mat.ground_horizon_color = ground_col.lightened(0.2)
	mat.ground_bottom_color = ground_col.darkened(0.3)
	sky.sky_material = mat
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.9
	we.environment = env
	return we

static func sun() -> DirectionalLight3D:
	var l := DirectionalLight3D.new()
	l.rotation_degrees = Vector3(-50, 35, 0)
	l.light_energy = 1.1
	return l

static func mat(col: Color, unshaded := false) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.roughness = 0.95
	if col.a < 1.0:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	if unshaded:
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	return m

static func ground(size: float, col: Color) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(size, size)
	mi.mesh = pm
	mi.material_override = mat(col)
	return mi

static func box(size: Vector3, pos: Vector3, col: Color, parent: Node = null) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.position = pos
	mi.material_override = mat(col)
	if parent != null:
		parent.add_child(mi)
	return mi

static func cyl(radius: float, height: float, pos: Vector3, col: Color, parent: Node = null, top_radius := -1.0) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.bottom_radius = radius
	cm.top_radius = radius if top_radius < 0.0 else top_radius
	cm.height = height
	cm.radial_segments = 12
	mi.mesh = cm
	mi.position = pos
	mi.material_override = mat(col)
	if parent != null:
		parent.add_child(mi)
	return mi

static func ball(radius: float, pos: Vector3, col: Color, parent: Node = null) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = radius
	sm.height = radius * 2.0
	sm.radial_segments = 12
	sm.rings = 6
	mi.mesh = sm
	mi.position = pos
	mi.material_override = mat(col)
	if parent != null:
		parent.add_child(mi)
	return mi

static func label(text: String, pos: Vector3, size := 0.002, parent: Node = null, billboard := true) -> Label3D:
	var l := Label3D.new()
	l.text = text
	l.pixel_size = size
	l.position = pos
	l.outline_size = 8
	if billboard:
		l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	if parent != null:
		parent.add_child(l)
	return l
