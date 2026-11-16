class_name Look
extends RefCounted
## Shared looks: resource colours and shapes. Colour is never the only signal:
## every resource also has its own shape, and colourblind mode swaps the palette.

const CB := {"Fti": "#f0e442", "Su": "#0072b2", "Eldi": "#d55e00", "Ular": "#009e73"}
static var _meshes := {}

static func el_color(el: String) -> Color:
	if Game.settings.colorblind:
		return Color(CB.get(el, "#999999"))
	return Color(DyaEconomy.ELEMENT_COLORS.get(el, "#999999"))

## Fti = diamond, Su = sphere, Eldi = pyramid, Ular = cube. Unit size 1.
static func el_mesh(el: String) -> Mesh:
	if _meshes.has(el):
		return _meshes[el]
	var m: Mesh
	match el:
		"Fti":
			var s := SphereMesh.new()
			s.radius = 0.5; s.height = 1.3; s.radial_segments = 4; s.rings = 1
			m = s
		"Su":
			var s2 := SphereMesh.new()
			s2.radius = 0.5; s2.height = 1.0; s2.radial_segments = 10; s2.rings = 5
			m = s2
		"Eldi":
			var c := CylinderMesh.new()
			c.top_radius = 0.0; c.bottom_radius = 0.6; c.height = 1.0; c.radial_segments = 4
			m = c
		_:
			var b := BoxMesh.new()
			b.size = Vector3.ONE * 0.85
			m = b
	_meshes[el] = m
	return m

static func jewel(el: String, lit: bool) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = el_mesh(el) if el != "" else el_mesh("Su")
	mi.material_override = jewel_mat(el, lit)
	return mi

static func jewel_mat(el: String, lit: bool) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	var col := el_color(el) if el != "" else Color(0.6, 0.6, 0.6)
	m.albedo_color = col if lit else col.darkened(0.65)
	if lit:
		m.emission_enabled = true
		m.emission = col
		m.emission_energy_multiplier = 1.5
	return m
