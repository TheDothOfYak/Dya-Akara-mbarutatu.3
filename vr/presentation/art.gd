class_name Art
extends RefCounted
## The look of the world, generated in code so it costs nothing to ship and
## can be replaced piece by piece with real art later.
##
## - The sky over Xikia: Pia'don's light, drifting cloud, and the other Tatu
##   hanging in it (Velki huge and close, Leotik small, Xikia's little Kalo).
## - Soft light with shadows, haze toward the horizon, bloom on anything lit.
## - Surfaces with grain instead of flat colour; foliage and grass that move.
## - Rolling land, living water, ancient trees, rock, lanterns, drifting motes.

# ---------------------------------------------------------------- sky and light

const SKY_SHADER := """
shader_type sky;
uniform vec3 top_col : source_color = vec3(0.16, 0.36, 0.72);
uniform vec3 horizon_col : source_color = vec3(0.78, 0.86, 0.95);
uniform vec3 ground_col : source_color = vec3(0.25, 0.32, 0.3);
uniform vec3 sun_col : source_color = vec3(1.0, 0.86, 0.62);
uniform float cloud_cover = 0.45;
uniform float stars = 0.0;
uniform vec3 velki_dir = vec3(0.22, 0.46, -0.86);
uniform float velki_size = 0.3;
uniform vec3 leotik_dir = vec3(-0.6, 0.3, -0.74);
uniform float leotik_size = 0.055;
uniform vec3 kalo_dir = vec3(0.2, 0.62, 0.3);
uniform float kalo_size = 0.022;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
	vec2 i = floor(p); vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
	float v = 0.0; float a = 0.5;
	for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.0, 9.0); a *= 0.5; }
	return v;
}
// a world hanging in the sky: oceans, land, cloud, a lit side and a soft rim of air
vec4 world(vec3 d, vec3 dir, float size, vec3 sea, vec3 land, vec3 land2, float seed, vec3 sun) {
	dir = normalize(dir);
	vec3 rx = normalize(cross(vec3(0.0, 1.0, 0.0), dir));
	vec3 ry = cross(dir, rx);
	vec2 q = vec2(dot(d, rx), dot(d, ry)) / size;
	float r = length(q);
	if (dot(d, dir) < 0.0 || r > 1.12) return vec4(0.0);
	float inside = smoothstep(1.0, 0.985, r);
	vec3 n = vec3(q, sqrt(max(0.0, 1.0 - min(r, 1.0) * min(r, 1.0))));
	vec2 uv = n.xy / (1.0 + n.z) * 2.2 + seed;
	float l = fbm(uv * 2.3);
	vec3 c = mix(sea, mix(land, land2, fbm(uv * 5.0 + 3.0)), smoothstep(0.5, 0.56, l));
	c = mix(c, vec3(0.95), smoothstep(0.55, 0.8, fbm(uv * 3.1 + 40.0)) * 0.7);
	vec3 ls = normalize(vec3(dot(sun, rx), dot(sun, ry), dot(sun, dir) + 0.6));
	float lit = smoothstep(-0.25, 0.6, dot(n, ls));
	c *= mix(0.12, 1.05, lit);
	float rim = smoothstep(0.75, 1.0, r) * inside;
	c += vec3(0.5, 0.7, 1.0) * rim * 0.35 * lit;
	float halo = smoothstep(1.12, 1.0, r) * (1.0 - inside) * 0.25;
	return vec4(c, max(inside * mix(0.35, 0.92, lit), halo));
}
void sky() {
	vec3 d = normalize(EYEDIR);
	vec3 sun = normalize(LIGHT0_DIRECTION);
	float h = d.y;
	vec3 col = mix(horizon_col, top_col, pow(clamp(h, 0.0, 1.0), 0.42));
	float sd = max(dot(d, sun), 0.0);
	col += sun_col * (pow(sd, 6.0) * 0.22 + pow(sd, 64.0) * 0.35);
	col = mix(col, sun_col, pow(1.0 - clamp(h, 0.0, 1.0), 6.0) * pow(sd, 2.0) * 0.55);
	if (stars > 0.0) {
		vec2 sp = d.xz / (abs(d.y) + 0.35) * 160.0;
		vec2 cell = floor(sp);
		float pick = step(0.985, hash(cell));
		float tw = 0.6 + 0.4 * sin(TIME * 2.0 + hash(cell + 3.0) * 40.0);
		float s = pick * smoothstep(0.42, 0.0, length(fract(sp) - 0.5)) * smoothstep(0.0, 0.3, h) * tw;
		col += vec3(s) * stars * (0.5 + hash(cell + 7.0));
	}
	vec4 w = world(d, velki_dir, velki_size, vec3(0.13, 0.33, 0.62), vec3(0.3, 0.5, 0.27), vec3(0.62, 0.56, 0.4), 3.0, sun);
	col = mix(col, mix(w.rgb, col, 0.28), w.a);
	w = world(d, leotik_dir, leotik_size, vec3(0.2, 0.26, 0.36), vec3(0.5, 0.26, 0.16), vec3(0.3, 0.34, 0.2), 11.0, sun);
	col = mix(col, mix(w.rgb, col, 0.25), w.a);
	w = world(d, kalo_dir, kalo_size, vec3(0.7, 0.68, 0.76), vec3(0.6, 0.58, 0.66), vec3(0.8, 0.78, 0.84), 23.0, sun);
	col = mix(col, mix(w.rgb, col, 0.2), w.a);
	col += sun_col * smoothstep(0.9993, 0.9997, sd) * 3.0;
	// drifting cloud, lit warm on the sunward side
	if (h > -0.02) {
		vec2 cuv = d.xz / (h + 0.16) * 0.55 + vec2(TIME * 0.006, TIME * 0.002);
		float c = fbm(cuv);
		float m = smoothstep(1.0 - cloud_cover, 1.0 - cloud_cover + 0.28, c) * smoothstep(-0.02, 0.14, h);
		float shade = fbm(cuv + sun.xz * 0.12);
		vec3 cc = mix(vec3(0.62, 0.66, 0.76), vec3(1.0, 0.98, 0.95), smoothstep(0.3, 0.75, c - (shade - c) * 2.0));
		cc = mix(cc, sun_col, pow(sd, 3.0) * 0.4);
		col = mix(col, cc, m * 0.88);
	}
	if (h < 0.0) col = mix(col, ground_col, smoothstep(0.0, -0.08, h));
	COLOR = col;
}
"""

const PRESETS := {
	"day": {"top": Color(0.13, 0.36, 0.74), "horizon": Color(0.74, 0.86, 0.96), "sun": Color(1.0, 0.9, 0.7), "sun_rot": Vector3(-42, -150, 0), "energy": 1.0, "cloud": 0.46, "stars": 0.0, "fog": Color(0.72, 0.82, 0.92), "fog_d": 0.0016, "ambient": 0.6},
	"golden": {"top": Color(0.2, 0.33, 0.66), "horizon": Color(1.0, 0.76, 0.5), "sun": Color(1.0, 0.72, 0.42), "sun_rot": Vector3(-20, -128, 0), "energy": 1.0, "cloud": 0.5, "stars": 0.0, "fog": Color(0.95, 0.74, 0.56), "fog_d": 0.0022, "ambient": 0.85},
	"dusk": {"top": Color(0.07, 0.09, 0.26), "horizon": Color(0.74, 0.42, 0.44), "sun": Color(1.0, 0.56, 0.4), "sun_rot": Vector3(-7, -140, 0), "energy": 0.7, "cloud": 0.42, "stars": 0.9, "fog": Color(0.42, 0.32, 0.46), "fog_d": 0.002, "ambient": 0.6},
	"morning": {"top": Color(0.2, 0.46, 0.8), "horizon": Color(0.86, 0.9, 0.9), "sun": Color(1.0, 0.94, 0.8), "sun_rot": Vector3(-34, 60, 0), "energy": 1.0, "cloud": 0.4, "stars": 0.0, "fog": Color(0.62, 0.76, 0.9), "fog_d": 0.0011, "ambient": 0.62},
}

static var _sky_shader: Shader

## Sky, haze, bloom and tone for a scene. Add the result to the scene.
static func sky(preset: String = "day") -> WorldEnvironment:
	var p: Dictionary = PRESETS.get(preset, PRESETS.day)
	if _sky_shader == null:
		_sky_shader = Shader.new()
		_sky_shader.code = SKY_SHADER
	var m := ShaderMaterial.new()
	m.shader = _sky_shader
	m.set_shader_parameter("top_col", p.top)
	m.set_shader_parameter("horizon_col", p.horizon)
	m.set_shader_parameter("ground_col", (p.fog as Color).darkened(0.35))
	m.set_shader_parameter("sun_col", p.sun)
	m.set_shader_parameter("cloud_cover", p.cloud)
	m.set_shader_parameter("stars", p.stars)
	var s := Sky.new()
	s.sky_material = m
	s.radiance_size = Sky.RADIANCE_SIZE_64
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	env.sky = s
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = p.ambient
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_white = 4.0
	env.fog_enabled = true
	env.fog_light_color = p.fog
	env.fog_density = p.fog_d
	env.fog_sky_affect = 0.0
	env.glow_enabled = true
	env.glow_intensity = 0.28
	env.glow_bloom = 0.02
	env.glow_hdr_threshold = 1.25
	env.adjustment_enabled = true
	env.adjustment_saturation = 1.0
	env.adjustment_contrast = 1.04
	var we := WorldEnvironment.new()
	we.environment = env
	return we

static func sun(preset: String = "day") -> DirectionalLight3D:
	var p: Dictionary = PRESETS.get(preset, PRESETS.day)
	var l := DirectionalLight3D.new()
	l.rotation_degrees = p.sun_rot
	l.light_color = p.sun
	l.light_energy = p.energy
	l.shadow_enabled = true
	l.shadow_blur = 1.5
	l.shadow_opacity = 0.62
	l.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_2_SPLITS
	l.directional_shadow_max_distance = 70.0
	return l

## Sky + sun in one call.
static func light_scene(node: Node, preset: String = "day") -> void:
	node.add_child(sky(preset))
	node.add_child(sun(preset))

# ---------------------------------------------------------------- surfaces

static var _grain: ImageTexture

## A soft tiling grain laid over every surface so nothing is a flat colour.
static func grain() -> ImageTexture:
	if _grain != null:
		return _grain
	var n := 128
	var img := Image.create(n, n, true, Image.FORMAT_RGB8)
	for y in n:
		for x in n:
			var u := float(x) / n * TAU
			var v := float(y) / n * TAU
			var a := sin(u * 3.0 + sin(v * 2.0) * 1.7) * 0.5 + sin(v * 5.0 + sin(u * 3.0) * 1.3) * 0.3 + sin((u + v) * 9.0) * 0.12 + sin(u * 17.0) * sin(v * 13.0) * 0.1
			var g := clampf(0.86 + a * 0.13, 0.0, 1.0)
			img.set_pixel(x, y, Color(g, g, g))
	img.generate_mipmaps()
	_grain = ImageTexture.create_from_image(img)
	return _grain

## The standard surface: grain, a soft rim of sky light, gentle roughness.
static func surface(col: Color, grain_scale := 0.6, rough := 0.9) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.roughness = rough
	if col.a < 1.0:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	else:
		m.albedo_texture = grain()
		m.uv1_triplanar = true
		m.uv1_world_triplanar = true
		m.uv1_scale = Vector3.ONE * grain_scale
		m.rim_enabled = true
		m.rim = 0.35
		m.rim_tint = 0.6
	return m

static func glow(col: Color, energy := 2.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = col
	m.emission_enabled = true
	m.emission = col
	m.emission_energy_multiplier = energy
	return m

const FOLIAGE_SHADER := """
shader_type spatial;
render_mode cull_disabled, diffuse_burley;
uniform vec3 col_low : source_color = vec3(0.1, 0.3, 0.14);
uniform vec3 col_high : source_color = vec3(0.45, 0.72, 0.3);
uniform float sway = 0.25;
uniform float height = 1.0;
varying float hgt;
varying vec3 wp;
void vertex() {
	hgt = clamp(VERTEX.y / height * 0.5 + 0.5, 0.0, 1.0);
	wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	float w = sin(TIME * 1.3 + wp.x * 0.35 + wp.z * 0.27) + sin(TIME * 2.1 + wp.z * 0.6) * 0.5;
	VERTEX.x += w * sway * hgt * 0.5;
	VERTEX.z += cos(TIME * 1.1 + wp.x * 0.4) * sway * hgt * 0.35;
}
void fragment() {
	float n = fract(sin(dot(floor(wp.xz * 3.0) + floor(wp.y * 3.0), vec2(12.9898, 78.233))) * 43758.5453);
	ALBEDO = mix(col_low, col_high, hgt * 0.8 + n * 0.2);
	ROUGHNESS = 0.85;
	BACKLIGHT = col_high * 0.22;
	RIM = 0.15;
}
"""
static var _foliage_shader: Shader

## Leaves and grass: a colour that brightens toward the tips, and a slow sway in the wind.
static func foliage(low: Color, high: Color, sway := 0.25, height := 1.0) -> ShaderMaterial:
	if _foliage_shader == null:
		_foliage_shader = Shader.new()
		_foliage_shader.code = FOLIAGE_SHADER
	var m := ShaderMaterial.new()
	m.shader = _foliage_shader
	m.set_shader_parameter("col_low", low)
	m.set_shader_parameter("col_high", high)
	m.set_shader_parameter("sway", sway)
	m.set_shader_parameter("height", height)
	return m

const WATER_SHADER := """
shader_type spatial;
render_mode cull_disabled;
uniform vec3 deep : source_color = vec3(0.03, 0.2, 0.36);
uniform vec3 shallow : source_color = vec3(0.2, 0.66, 0.68);
uniform vec3 foam : source_color = vec3(0.95, 0.98, 1.0);
uniform vec2 shore_dir = vec2(0.0, 1.0);
uniform float shore_at = 0.0;
varying vec3 wp;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
	vec2 i = floor(p); vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float waves(vec2 p) {
	return sin(p.x * 0.35 + TIME * 0.9) * 0.5 + sin(p.y * 0.5 - TIME * 0.7 + p.x * 0.2) * 0.35 + noise(p * 0.8 + TIME * 0.3) * 0.5;
}
void vertex() {
	wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	VERTEX.y += waves(wp.xz) * 0.12;
}
void fragment() {
	float e = 0.4;
	float h0 = waves(wp.xz);
	vec3 n = normalize(vec3(h0 - waves(wp.xz + vec2(e, 0.0)), 1.6, h0 - waves(wp.xz + vec2(0.0, e))));
	NORMAL = normalize((VIEW_MATRIX * vec4(n, 0.0)).xyz);
	float away = clamp((shore_at - dot(wp.xz, shore_dir)) / 60.0, 0.0, 1.0);
	float fres = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 3.0);
	vec3 c = mix(shallow, deep, smoothstep(0.0, 0.7, away));
	float surf = smoothstep(0.06, 0.0, away) * (0.5 + 0.5 * sin(away * 220.0 - TIME * 1.6 + noise(wp.xz * 0.6) * 5.0));
	float sparkle = step(0.965, noise(wp.xz * 5.0 + TIME * 0.9)) * 0.5;
	ALBEDO = mix(c, foam, clamp(surf + sparkle * 0.4, 0.0, 1.0));
	ROUGHNESS = 0.08;
	METALLIC = 0.2;
	SPECULAR = 0.9;
	EMISSION = vec3(0.5, 0.75, 0.9) * fres * 0.25;
	ALPHA = mix(0.72, 0.96, smoothstep(0.0, 0.25, away));
}
"""
static var _water_shader: Shader

## Living water. `shore_dir` points from the sea toward the land; water turns
## shallow and foams where dot(position.xz, shore_dir) reaches `shore_at`.
static func water(size: Vector2, pos: Vector3, shore_dir := Vector2(0, 1), shore_at := 0.0) -> MeshInstance3D:
	if _water_shader == null:
		_water_shader = Shader.new()
		_water_shader.code = WATER_SHADER
	var mi := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = size
	pm.subdivide_width = 48
	pm.subdivide_depth = 48
	mi.mesh = pm
	var m := ShaderMaterial.new()
	m.shader = _water_shader
	m.set_shader_parameter("shore_dir", shore_dir)
	m.set_shader_parameter("shore_at", shore_at)
	mi.material_override = m
	mi.position = pos
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return mi

const HOLO_SHADER := """
shader_type spatial;
render_mode cull_disabled, unshaded, depth_draw_never;
uniform vec4 tint : source_color = vec4(0.4, 0.8, 0.6, 0.5);
varying vec3 wp;
void vertex() { wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; }
void fragment() {
	float fres = pow(1.0 - abs(dot(NORMAL, VIEW)), 2.0);
	float line = 0.75 + 0.25 * sin(wp.y * 260.0 + TIME * 3.0);
	float shimmer = 0.9 + 0.1 * sin(TIME * 1.7 + wp.x * 9.0 + wp.z * 7.0);
	ALBEDO = tint.rgb * (0.75 + fres * 0.9) * line * shimmer;
	ALPHA = clamp(tint.a * (0.7 + fres * 0.8), 0.0, 1.0);
}
"""
static var _holo_shader: Shader

## Hologram look for match terrain: a soft tint, bright edges, a faint moving scanline.
static func hologram(tint: Color) -> ShaderMaterial:
	if _holo_shader == null:
		_holo_shader = Shader.new()
		_holo_shader.code = HOLO_SHADER
	var m := ShaderMaterial.new()
	m.shader = _holo_shader
	m.set_shader_parameter("tint", tint)
	return m

# ---------------------------------------------------------------- shapes

static func _h3(p: Vector3) -> float:
	return fposmod(sin(p.x * 12.9898 + p.y * 78.233 + p.z * 37.719) * 43758.5453, 1.0)

static func n3(p: Vector3) -> float:
	var i := p.floor()
	var f := p - i
	f = f * f * (Vector3.ONE * 3.0 - f * 2.0)
	var a := lerpf(lerpf(_h3(i), _h3(i + Vector3(1, 0, 0)), f.x), lerpf(_h3(i + Vector3(0, 1, 0)), _h3(i + Vector3(1, 1, 0)), f.x), f.y)
	var b := lerpf(lerpf(_h3(i + Vector3(0, 0, 1)), _h3(i + Vector3(1, 0, 1)), f.x), lerpf(_h3(i + Vector3(0, 1, 1)), _h3(i + Vector3(1, 1, 1)), f.x), f.y)
	return lerpf(a, b, f.z)

static func n2(x: float, z: float) -> float:
	return n3(Vector3(x, 0.37, z))

static func fbm2(x: float, z: float) -> float:
	return n2(x, z) * 0.55 + n2(x * 2.1 + 7.0, z * 2.1 + 3.0) * 0.3 + n2(x * 4.3 + 1.0, z * 4.3 + 9.0) * 0.15

static var _blobs := {}

## A lumpy rounded form (canopy clump, boulder). Cached by seed; unit radius about 1.
static func blob(seed_n: int, lump := 0.3, detail := 1.6) -> ArrayMesh:
	var key := "%d/%.2f/%.2f" % [seed_n, lump, detail]
	if _blobs.has(key):
		return _blobs[key]
	var sm := SphereMesh.new()
	sm.radius = 1.0
	sm.height = 2.0
	sm.radial_segments = 14
	sm.rings = 8
	var arr := sm.get_mesh_arrays()
	var verts: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
	var norms: PackedVector3Array = arr[Mesh.ARRAY_NORMAL]
	var off := Vector3(seed_n * 3.7, seed_n * 1.3, seed_n * 5.1)
	for i in verts.size():
		var d := verts[i].normalized()
		var k := 1.0 + (n3(d * detail + off) - 0.5) * 2.0 * lump + (n3(d * detail * 2.7 + off) - 0.5) * lump * 0.6
		verts[i] = d * k
		norms[i] = d
	arr[Mesh.ARRAY_VERTEX] = verts
	arr[Mesh.ARRAY_NORMAL] = norms
	var st := SurfaceTool.new()
	var am := ArrayMesh.new()
	am.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
	st.create_from(am, 0)
	st.generate_normals()
	var out := st.commit()
	_blobs[key] = out
	return out

## A curved, tapering tube through `points` (trunks, roots, branches, ropes).
static func tube(points: Array, radii: Array, sides := 8, wobble := 0.0, seed_n := 0) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rings := []
	var up := Vector3.UP
	for i in points.size():
		var p: Vector3 = points[i]
		var dir: Vector3
		if i == 0: dir = (points[1] - p).normalized()
		elif i == points.size() - 1: dir = (p - points[i - 1]).normalized()
		else: dir = (points[i + 1] - points[i - 1]).normalized()
		var side := dir.cross(up)
		if side.length() < 0.01:
			side = dir.cross(Vector3.RIGHT)
		side = side.normalized()
		var fwd := side.cross(dir).normalized()
		var ring := []
		for k in sides:
			var a := TAU * k / sides
			var r: float = radii[i]
			if wobble > 0.0:
				r *= 1.0 + (n3(Vector3(cos(a) * 1.5 + seed_n, float(i) * 0.7, sin(a) * 1.5)) - 0.5) * wobble
			ring.append(p + (side * cos(a) + fwd * sin(a)) * r)
		rings.append(ring)
	for i in rings.size() - 1:
		for k in sides:
			var k2 := (k + 1) % sides
			var a: Vector3 = rings[i][k]
			var b: Vector3 = rings[i][k2]
			var c: Vector3 = rings[i + 1][k]
			var d: Vector3 = rings[i + 1][k2]
			st.add_vertex(a); st.add_vertex(c); st.add_vertex(b)
			st.add_vertex(b); st.add_vertex(c); st.add_vertex(d)
	st.generate_normals()
	return st.commit()

static func add_mesh(parent: Node, mesh: Mesh, mat: Material, pos := Vector3.ZERO, scl := Vector3.ONE, rot := Vector3.ZERO) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = pos
	mi.scale = scl
	mi.rotation = rot
	parent.add_child(mi)
	return mi

## Rolling land as one mesh. height_fn(x, z) -> y ; color_fn(x, z, y) -> Color.
static func terrain(size: float, cells: int, height_fn: Callable, color_fn: Callable) -> MeshInstance3D:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var n := cells + 1
	var hs := PackedFloat32Array()
	hs.resize(n * n)
	var step := size / cells
	for j in n:
		for i in n:
			hs[j * n + i] = height_fn.call(-size * 0.5 + i * step, -size * 0.5 + j * step)
	for j in cells:
		for i in cells:
			var x0 := -size * 0.5 + i * step
			var z0 := -size * 0.5 + j * step
			var quad := [[i, j], [i + 1, j], [i, j + 1], [i + 1, j], [i + 1, j + 1], [i, j + 1]]
			for q in quad:
				var x: float = -size * 0.5 + q[0] * step
				var z: float = -size * 0.5 + q[1] * step
				var y := hs[q[1] * n + q[0]]
				st.set_color(color_fn.call(x, z, y))
				st.add_vertex(Vector3(x, y, z))
	st.generate_normals()
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	var m := surface(Color.WHITE, 0.25, 0.95)
	m.vertex_color_use_as_albedo = true
	m.rim_enabled = false
	mi.material_override = m
	return mi

## Blades of grass over an area, swaying. where_fn(x, z) -> bool picks the spots.
static func grass(parent: Node, count: int, area: Rect2, where_fn: Callable, height_fn: Callable, low := Color(0.16, 0.4, 0.16), high := Color(0.6, 0.82, 0.36), blade := 0.5, seed_n := 1) -> void:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var tr := RandomNumberGenerator.new()
	tr.seed = 99
	for k in 9: # a tuft: blades fanning out from one root, each leaning its own way
		var a := TAU * k / 9.0 + tr.randf() * 0.5
		var root := Vector3(cos(a), 0, sin(a)) * tr.randf_range(0.02, 0.2)
		var w := Vector3(-sin(a), 0, cos(a)) * 0.03
		var tip := root * tr.randf_range(1.5, 3.2) + Vector3(0, tr.randf_range(0.55, 1.0), 0)
		st.set_normal(Vector3.UP); st.add_vertex(root - w)
		st.set_normal(Vector3.UP); st.add_vertex(root + w)
		st.set_normal(Vector3.UP); st.add_vertex(tip)
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = st.commit()
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_n
	var xf := []
	var tries := 0
	while xf.size() < count and tries < count * 6:
		tries += 1
		var x := rng.randf_range(area.position.x, area.end.x)
		var z := rng.randf_range(area.position.y, area.end.y)
		if not where_fn.call(x, z):
			continue
		var s := blade * rng.randf_range(0.6, 1.5)
		xf.append(Transform3D(Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(s, s, s)), Vector3(x, height_fn.call(x, z), z)))
	mm.instance_count = xf.size()
	for i in xf.size():
		mm.set_instance_transform(i, xf[i])
	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = mm
	mmi.material_override = foliage(low, high, 0.12, 1.0)
	mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mmi)

## Slow drifting lights or specks: fireflies, pollen, sea spray, embers.
static func motes(parent: Node, pos: Vector3, extent: Vector3, col: Color, amount := 60, size := 0.035, rise := 0.05) -> CPUParticles3D:
	var p := CPUParticles3D.new()
	p.amount = amount
	p.lifetime = 9.0
	p.preprocess = 9.0
	p.emission_shape = CPUParticles3D.EMISSION_SHAPE_BOX
	p.emission_box_extents = extent
	p.gravity = Vector3(0, rise, 0)
	p.initial_velocity_min = 0.03
	p.initial_velocity_max = 0.18
	p.spread = 180.0
	p.scale_amount_min = 0.5
	p.scale_amount_max = 1.4
	var q := QuadMesh.new()
	q.size = Vector2(size, size)
	p.mesh = q
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	m.albedo_color = col
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.emission_enabled = true
	m.emission = col
	m.emission_energy_multiplier = 2.5
	p.material_override = m
	var g := Gradient.new()
	g.set_color(0, Color(col.r, col.g, col.b, 0.0))
	g.add_point(0.25, col)
	g.add_point(0.75, col)
	g.set_color(g.get_point_count() - 1, Color(col.r, col.g, col.b, 0.0))
	p.color_ramp = g
	p.position = pos
	p.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(p)
	return p

## A hanging lantern: a warm glowing shade. `lit` adds a real light (use sparingly).
static func lantern(parent: Node, pos: Vector3, col := Color(1.0, 0.72, 0.36), lit := false, size := 0.16) -> Node3D:
	var n := Node3D.new()
	n.position = pos
	parent.add_child(n)
	add_mesh(n, blob(3, 0.05), glow(col, 1.6), Vector3.ZERO, Vector3(size, size * 1.25, size))
	var cap := CylinderMesh.new()
	cap.top_radius = size * 0.35
	cap.bottom_radius = size * 0.8
	cap.height = size * 0.35
	add_mesh(n, cap, surface(Color(0.25, 0.17, 0.1)), Vector3(0, size * 1.25, 0))
	if lit:
		var l := OmniLight3D.new()
		l.light_color = col
		l.light_energy = 1.4
		l.omni_range = 7.0
		l.omni_attenuation = 1.6
		n.add_child(l)
	return n

## A string of small lanterns sagging between two points.
static func lantern_string(parent: Node, a: Vector3, b: Vector3, count := 7, sag := 0.8) -> void:
	var pts := []
	var rr := []
	var cols := [Color(1.0, 0.72, 0.36), Color(1.0, 0.5, 0.4), Color(0.55, 0.85, 1.0), Color(0.75, 1.0, 0.6)]
	for i in 13:
		var t := i / 12.0
		pts.append(a.lerp(b, t) - Vector3(0, sin(t * PI) * sag, 0))
		rr.append(0.012)
	add_mesh(parent, tube(pts, rr, 4), surface(Color(0.2, 0.15, 0.1)))
	for i in count:
		var t2 := (i + 0.5) / count
		lantern(parent, a.lerp(b, t2) - Vector3(0, sin(t2 * PI) * sag + 0.16, 0), cols[i % cols.size()], false, 0.1)

## A weathered boulder.
static func rock(parent: Node, pos: Vector3, size: Vector3, seed_n := 1, col := Color(0.5, 0.5, 0.52)) -> MeshInstance3D:
	var mi := add_mesh(parent, blob(seed_n % 5 + 10, 0.32, 1.3), surface(col, 0.35, 1.0), pos, size)
	mi.rotation.y = seed_n * 1.7
	return mi

## A woodland tree: bent trunk, a few boughs, clumps of moving leaf.
static func tree(parent: Node, pos: Vector3, height := 8.0, seed_n := 1, leaf_low := Color(0.08, 0.3, 0.14), leaf_high := Color(0.4, 0.7, 0.28)) -> Node3D:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_n
	var n := Node3D.new()
	n.position = pos
	n.rotation.y = rng.randf() * TAU
	parent.add_child(n)
	var bark := surface(Color(0.3, 0.21, 0.14).lerp(Color(0.42, 0.34, 0.26), rng.randf()), 1.4, 1.0)
	var r0 := height * 0.055
	var lean := Vector3(rng.randf_range(-0.12, 0.12), 0, rng.randf_range(-0.12, 0.12)) * height
	var pts := []
	var rr := []
	for i in 6:
		var t := i / 5.0
		pts.append(Vector3(0, height * 0.72 * t, 0) + lean * t * t)
		rr.append(r0 * lerpf(1.7, 0.45, pow(t, 0.6)))
	add_mesh(n, tube(pts, rr, 7, 0.25, seed_n), bark)
	var top: Vector3 = pts[5]
	var leaf := foliage(leaf_low, leaf_high, 0.14, height * 0.3)
	for i in 5:
		var a := TAU * i / 5.0 + rng.randf()
		var o := Vector3(cos(a), rng.randf_range(-0.15, 0.5), sin(a)) * height * rng.randf_range(0.1, 0.24)
		var s := height * rng.randf_range(0.16, 0.26)
		add_mesh(n, blob(i % 4, 0.34), leaf, top + o + Vector3(0, height * 0.08, 0), Vector3(s, s * 0.72, s))
	add_mesh(n, blob(2, 0.34), leaf, top + Vector3(0, height * 0.2, 0), Vector3.ONE * height * 0.2)
	return n

## One of the massive ancient trees Sri'Ciakala grows out of: a vast trunk,
## great roots arching to the ground, heavy boughs and a layered crown.
## Returns the node; "levels" metadata lists the heights where platforms sit.
static func ancient_tree(parent: Node, pos: Vector3, height := 46.0, girth := 4.2, seed_n := 1, levels := 4) -> Node3D:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_n * 977 + 13
	var n := Node3D.new()
	n.position = pos
	parent.add_child(n)
	var bark := surface(Color(0.3, 0.25, 0.21).lerp(Color(0.38, 0.33, 0.28), rng.randf()), 0.22, 1.0)
	var bark2 := surface(Color(0.25, 0.21, 0.18), 0.3, 1.0)
	var pts := []
	var rr := []
	var lean := Vector3(rng.randf_range(-1, 1), 0, rng.randf_range(-1, 1)) * 2.5
	for i in 9:
		var t := i / 8.0
		pts.append(Vector3(0, height * 0.7 * t - 0.5, 0) + lean * t * t + Vector3(sin(t * 5.0 + seed_n), 0, cos(t * 4.0 + seed_n)) * 0.5)
		rr.append(girth * lerpf(1.55, 0.5, pow(t, 0.5)))
	add_mesh(n, tube(pts, rr, 14, 0.22, seed_n), bark)
	# great roots: they arch out and down into the ground like buttresses
	var roots := 7 + seed_n % 3
	for i in roots:
		var a := TAU * i / roots + rng.randf_range(-0.2, 0.2)
		var reach := girth * rng.randf_range(2.6, 4.4)
		var d := Vector3(cos(a), 0, sin(a))
		var rp := []
		var rw := []
		for k in 11:
			var t2 := k / 10.0
			rp.append(d * (girth * 0.9 + reach * t2) + Vector3(0, lerpf(girth * 1.5, -0.6, pow(t2, 0.55)) + sin(t2 * PI) * girth * 0.5, 0) + d.cross(Vector3.UP) * sin(t2 * 3.0 + i) * 0.8)
			rw.append(girth * lerpf(0.5, 0.12, t2))
		add_mesh(n, tube(rp, rw, 10, 0.3, seed_n + i), bark2)
	# boughs and the crown
	var top: Vector3 = pts[8]
	var leaf_a := foliage(Color(0.05, 0.24, 0.13), Color(0.3, 0.6, 0.26), 0.35, height * 0.2)
	var leaf_b := foliage(Color(0.08, 0.3, 0.16), Color(0.5, 0.74, 0.32), 0.35, height * 0.2)
	var boughs := 7
	for i in boughs:
		var a2 := TAU * i / boughs + rng.randf_range(-0.3, 0.3)
		var d2 := Vector3(cos(a2), 0, sin(a2))
		var start: Vector3 = pts[5 + i % 3]
		var out := height * rng.randf_range(0.26, 0.42)
		var bp := []
		var bw := []
		for k in 5:
			var t3 := k / 4.0
			bp.append(start + d2 * out * t3 + Vector3(0, out * 0.5 * sin(t3 * PI * 0.6), 0))
			bw.append(girth * lerpf(0.42, 0.1, t3))
		add_mesh(n, tube(bp, bw, 7, 0.2, seed_n + i * 3), bark)
		var tip: Vector3 = bp[4]
		for k in 3:
			var s := height * rng.randf_range(0.13, 0.2)
			add_mesh(n, blob((i + k) % 4, 0.36), leaf_a if (i + k) % 2 == 0 else leaf_b, tip + Vector3(rng.randf_range(-1, 1), rng.randf_range(-0.2, 0.7), rng.randf_range(-1, 1)) * s * 0.7, Vector3(s, s * 0.62, s))
	for k in 5:
		var s2 := height * rng.randf_range(0.16, 0.24)
		add_mesh(n, blob(k % 4, 0.36), leaf_b if k % 2 == 0 else leaf_a, top + Vector3(rng.randf_range(-1, 1) * s2 * 0.6, height * 0.1 + k * 1.2, rng.randf_range(-1, 1) * s2 * 0.6), Vector3(s2, s2 * 0.62, s2))
	var lv := []
	for i in levels:
		lv.append(6.0 + i * 5.5)
	n.set_meta("levels", lv)
	n.set_meta("girth", girth)
	return n

## A round village home with a thatched cone roof, a door and lit windows.
static func hut(parent: Node, pos: Vector3, face: float, size := 1.5, seed_n := 1) -> Node3D:
	var n := Node3D.new()
	n.position = pos
	n.rotation.y = face
	parent.add_child(n)
	var walls := [Color(0.8, 0.72, 0.56), Color(0.74, 0.62, 0.48), Color(0.84, 0.78, 0.66), Color(0.7, 0.58, 0.5)]
	var roofs := [Color(0.5, 0.36, 0.2), Color(0.4, 0.3, 0.22), Color(0.56, 0.3, 0.22), Color(0.3, 0.38, 0.3)]
	var body := CylinderMesh.new()
	body.top_radius = size * 0.92
	body.bottom_radius = size
	body.height = size * 1.3
	body.radial_segments = 12
	add_mesh(n, body, surface(walls[seed_n % 4], 1.2), Vector3(0, size * 0.65, 0))
	var roof := CylinderMesh.new()
	roof.top_radius = 0.02
	roof.bottom_radius = size * 1.35
	roof.height = size * 1.2
	roof.radial_segments = 12
	add_mesh(n, roof, surface(roofs[seed_n % 4], 2.5, 1.0), Vector3(0, size * 1.9, 0))
	var door := BoxMesh.new()
	door.size = Vector3(size * 0.45, size * 0.85, 0.08)
	add_mesh(n, door, surface(Color(0.3, 0.2, 0.12), 2.0), Vector3(0, size * 0.43, size * 0.97))
	var win := BoxMesh.new()
	win.size = Vector3(size * 0.3, size * 0.3, 0.06)
	for a in [0.9, -0.9]:
		add_mesh(n, win, glow(Color(1.0, 0.78, 0.42), 1.8), Vector3(sin(a) * size * 0.96, size * 0.8, cos(a) * size * 0.96), Vector3.ONE, Vector3(0, a, 0))
	return n

## A deck ringing a great trunk, with posts and a rail.
static func deck(parent: Node, pos: Vector3, inner: float, outer: float, seed_n := 1) -> void:
	var wood := surface(Color(0.46, 0.41, 0.35), 1.6)
	var dark := surface(Color(0.28, 0.24, 0.2), 1.6)
	var d := CylinderMesh.new()
	d.top_radius = outer
	d.bottom_radius = outer * 0.94
	d.height = 0.28
	d.radial_segments = 20
	add_mesh(parent, d, wood, pos)
	var posts := 16
	var ring := []
	var rw := []
	for i in posts + 1:
		var a := TAU * i / posts
		var p := pos + Vector3(cos(a) * outer * 0.97, 0, sin(a) * outer * 0.97)
		if i < posts:
			var pm := BoxMesh.new()
			pm.size = Vector3(0.12, 1.0, 0.12)
			add_mesh(parent, pm, dark, p + Vector3(0, 0.6, 0))
		ring.append(p + Vector3(0, 1.05, 0))
		rw.append(0.05)
	add_mesh(parent, tube(ring, rw, 5), dark)
	# braces from the trunk
	for i in 6:
		var a2 := TAU * i / 6.0 + seed_n
		var from := pos + Vector3(cos(a2) * inner * 0.8, -2.2, sin(a2) * inner * 0.8)
		var to := pos + Vector3(cos(a2) * outer * 0.8, -0.1, sin(a2) * outer * 0.8)
		add_mesh(parent, tube([from, from.lerp(to, 0.5) + Vector3(0, -0.2, 0), to], [0.14, 0.12, 0.1], 5), dark)

## A hanging rope bridge between two points.
static func bridge(parent: Node, a: Vector3, b: Vector3, sag := 1.2) -> void:
	var wood := surface(Color(0.46, 0.35, 0.24), 1.6)
	var rope := surface(Color(0.6, 0.5, 0.36), 2.0)
	var dir := (b - a)
	var flat := Vector3(dir.x, 0, dir.z).normalized()
	var side := flat.cross(Vector3.UP) * 0.7
	var n := int(max(6.0, dir.length() / 0.55))
	var plank := BoxMesh.new()
	plank.size = Vector3(1.4, 0.06, 0.42)
	var l := []
	var r := []
	var w := []
	for i in n + 1:
		var t := float(i) / n
		var p := a.lerp(b, t) - Vector3(0, sin(t * PI) * sag, 0)
		var mi := add_mesh(parent, plank, wood, p)
		mi.rotation.y = atan2(flat.x, flat.z) + PI / 2
		l.append(p + side + Vector3(0, 1.0, 0))
		r.append(p - side + Vector3(0, 1.0, 0))
		w.append(0.035)
	add_mesh(parent, tube(l, w, 4), rope)
	add_mesh(parent, tube(r, w, 4), rope)

## A market awning: a striped cloth roof that sags between its poles.
static func awning(parent: Node, pos: Vector3, size: Vector2, col_a: Color, col_b: Color) -> void:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var nx := 10
	var nz := 4
	for i in nx:
		for j in nz:
			var c := col_a if i % 2 == 0 else col_b
			var quad := [[i, j], [i + 1, j], [i, j + 1], [i + 1, j], [i + 1, j + 1], [i, j + 1]]
			for q in quad:
				var u: float = float(q[0]) / nx
				var v: float = float(q[1]) / nz
				st.set_color(c)
				st.add_vertex(Vector3((u - 0.5) * size.x, -sin(u * PI) * 0.12 - v * 0.55 + sin(v * PI) * 0.1, (v - 0.5) * size.y))
	st.generate_normals()
	var m := surface(Color.WHITE, 3.0, 1.0)
	m.vertex_color_use_as_albedo = true
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	add_mesh(parent, st.commit(), m, pos)

## A pennant on a pole.
static func banner(parent: Node, pos: Vector3, height: float, col: Color) -> void:
	var pole := CylinderMesh.new()
	pole.top_radius = 0.04
	pole.bottom_radius = 0.05
	pole.height = height
	add_mesh(parent, pole, surface(Color(0.3, 0.22, 0.15)), pos + Vector3(0, height * 0.5, 0))
	var q := QuadMesh.new()
	q.size = Vector2(height * 0.3, height * 0.42)
	q.subdivide_width = 6
	var mi := add_mesh(parent, q, foliage(col.darkened(0.25), col, 0.5, height * 0.3), pos + Vector3(height * 0.16, height * 0.76, 0))
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

## A stretch of Xikia countryside to stand in: level ground around you, rolling
## meadow and woodland beyond, the sea to the north. For scenes that are not
## a place of their own (matches, the lobby, replays).
static func backdrop(parent: Node, seed_n := 1, flat_r := 16.0, y := 0.0, sea := true, trees := 46) -> Node3D:
	var root := Node3D.new()
	root.position.y = y
	parent.add_child(root)
	var hf := func(x: float, z: float) -> float:
		var out := smoothstep(flat_r, flat_r * 3.5, Vector2(x, z).length())
		var s := smoothstep(-70.0, -110.0, z) * -5.0 if sea else 0.0
		return out * ((fbm2(x * 0.018 + seed_n, z * 0.018) - 0.4) * 16.0 + s)
	var cf := func(x: float, z: float, h: float) -> Color:
		var c := Color(0.28, 0.48, 0.23).lerp(Color(0.46, 0.6, 0.28), fbm2(x * 0.06, z * 0.06 + seed_n))
		c = c.lerp(Color(0.86, 0.78, 0.58), smoothstep(-0.8, -2.6, h))
		return c
	root.add_child(terrain(520.0, 110, hf, cf))
	if sea:
		root.add_child(water(Vector2(520, 300), Vector3(0, -1.9, -235), Vector2(0, 1), -92.0))
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_n * 31 + 7
	for i in trees:
		var a := rng.randf() * TAU
		var d := rng.randf_range(flat_r * 1.6, 170.0)
		var p := Vector3(cos(a) * d, 0, sin(a) * d)
		p.y = hf.call(p.x, p.z) - 0.2
		if p.y < -0.8:
			continue
		tree(root, p, rng.randf_range(7, 16), seed_n * 100 + i)
	for i in 3:
		var a2 := 0.9 + i * 2.2 + seed_n
		var p2 := Vector3(cos(a2) * 95.0, 0, sin(a2) * 95.0 + 30.0)
		p2.y = hf.call(p2.x, p2.z)
		ancient_tree(root, p2, 50.0, 4.4, seed_n + i, 0)
	var ok := func(x: float, z: float) -> bool: return Vector2(x, z).length() > flat_r * 0.55 and hf.call(x, z) > -0.6
	grass(root, 9000, Rect2(-70, -70, 140, 140), ok, hf, Color(0.12, 0.34, 0.14), Color(0.4, 0.58, 0.27), 0.5, seed_n)
	grass(root, 700, Rect2(-60, -60, 120, 120), ok, hf, Color(0.2, 0.4, 0.2), Color(1.0, 0.8, 0.86), 0.3, seed_n + 1)
	motes(root, Vector3(0, 2.0, 0), Vector3(30, 2.0, 30), Color(1.0, 0.96, 0.75, 0.7), 90, 0.03)
	return root
