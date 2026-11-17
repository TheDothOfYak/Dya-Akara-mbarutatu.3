extends Node3D
## Milestone 0 scene: an empty room that runs in the headset or the desktop
## simulator, with every creature's placeholder lined up for inspection.

func _ready() -> void:
	Art.light_scene(self, "day")
	Art.backdrop(self, 2, 9.0)
	var rig := XRRig.new()
	add_child(rig)
	rig.place(Vector3(0, 0, 3.2), 0.0)
	var db := SpeciesDB.all()
	var i := 0
	var rng := DyaRng.new(4)
	for id in SpeciesDB.ids():
		var tok := DyaToken.mint(db[id], rng)
		var v := CreatureView.make(db[id], tok)
		var r: float = DyaEconomy.SIZE_RADIUS[tok.size_idx] * 0.012
		v.scale = Vector3.ONE * r
		v.position = Vector3((i - (db.size() - 1) * 0.5) * 0.85, 0.0, -0.4 - 0.5 * (i % 2))
		v.rotation.y = PI
		v.flying = db[id].tags.has("flyer")
		if v.flying:
			v.position.y = 0.8
		v.set_state(["idle", "walk", "attack"][i % 3])
		add_child(v)
		var lab := Label3D.new()
		lab.text = db[id].name
		lab.pixel_size = 0.002
		lab.position = v.position + Vector3(0, 0.05 if not v.flying else -0.25, 0.3)
		lab.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		add_child(lab)
		i += 1
	Shots.maybe(self)
