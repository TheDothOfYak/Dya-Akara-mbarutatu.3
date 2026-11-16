class_name Shots
extends RefCounted
## Screenshot helper for checking scenes without a headset:
##   godot -- --shot=/path/out.png [--shot_after=2.0] [--quit]

static func maybe(node: Node) -> void:
	if not Game.args.has("shot"):
		return
	var after := float(Game.args.get("shot_after", "1.5"))
	node.get_tree().create_timer(after).timeout.connect(func(): save(node, Game.args.shot, Game.args.has("quit")))

static func save(node: Node, path: String, quit_after := false) -> void:
	await RenderingServer.frame_post_draw
	var img := node.get_viewport().get_texture().get_image()
	img.save_png(path)
	print("screenshot saved: ", path)
	if quit_after:
		node.get_tree().quit()
