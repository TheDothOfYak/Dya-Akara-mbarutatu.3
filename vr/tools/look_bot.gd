class_name LookBot
extends Node
## Takes a picture of a scene from a chosen spot:
##   godot -- --scene=town --look=x,y,z,yaw_deg,pitch_deg --shot=out.png
static func maybe(scene: Node, rig: XRRig) -> void:
	if not Game.args.has("look") or rig.sim == null:
		return
	var v: PackedStringArray = Game.args.look.split(",")
	rig.sim.scripted = true
	rig.place(Vector3(float(v[0]), 0, float(v[2])), deg_to_rad(float(v[3])))
	rig.global_position.y = float(v[1])
	rig.sim.look(deg_to_rad(float(v[3])), deg_to_rad(float(v[4])))
	rig.sim.offsets = [Vector3(-0.3, -0.9, -0.3), Vector3(0.3, -0.9, -0.3)]
	scene.get_tree().create_timer(float(Game.args.get("shot_after", "1.5")) + 1.0).timeout.connect(func(): scene.get_tree().quit())
