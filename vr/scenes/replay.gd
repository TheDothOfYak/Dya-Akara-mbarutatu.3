extends Node3D
## Watch a replay as a hologram at any scale: on a stand in front of you or
## as big as an arena. Walk around it freely, pause, rewind. A replay is the
## seed, the setup and the input log, so it plays back exactly.

var rig: XRRig
var rep: Dictionary
var sim: MatchSim
var arena: ArenaView = null
var scale_idx := 0
var paused := false
var info: Label3D
var center := Vector3(0, 0.8, -1.2)

func _ready() -> void:
	Art.light_scene(self, "dusk")
	Art.backdrop(self, 9, 200.0, -0.02, true, 24)
	rig = XRRig.new()
	add_child(rig)
	rig.place(Vector3(0, 0, 0.4), 0.0)
	var path: String = Game.args.get("replay", "user://replays/last.replay")
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		WorldBuilder.label("No replay saved yet.", Vector3(0, 1.5, -1), 0.003, self)
		return
	rep = f.get_var()
	f.close()
	var bar := Node3D.new()
	bar.position = Vector3(0, 1.0, -0.25)
	add_child(bar)
	bar.add_child(PanelButton.make("Pause", Vector3(-0.4, 0, 0), func(): paused = not paused, 0.18))
	bar.add_child(PanelButton.make("Back 10 s", Vector3(-0.2, 0, 0), func(): seek(sim.tick - 200), 0.18))
	bar.add_child(PanelButton.make("Smaller", Vector3(0.0, 0, 0), func(): set_scale_idx(scale_idx - 1), 0.18))
	bar.add_child(PanelButton.make("Bigger", Vector3(0.2, 0, 0), func(): set_scale_idx(scale_idx + 1), 0.18))
	bar.add_child(PanelButton.make("Leave", Vector3(0.4, 0, 0), func(): Game.goto(Game.data.get("flags", {}).get("replay_return", "res://scenes/tower.tscn")), 0.18))
	info = WorldBuilder.label("", Vector3(0, 0.1, 0), 0.0009, bar)
	seek(0)
	LookBot.maybe(self, rig)
	Shots.maybe(self)

## Rewind (or jump) by replaying from the start up to `tick`: exact every time.
func seek(tick: int) -> void:
	sim = MatchSim.from_replay(rep, SpeciesDB.all())
	sim.cfg["quiet"] = true
	while sim.tick < max(0, tick) and not sim.over:
		sim.do_tick()
	sim.cfg["quiet"] = false
	_rebuild()

func set_scale_idx(i: int) -> void:
	scale_idx = clampi(i, 0, DyaEconomy.SCALES.size() - 1)
	_rebuild()

func _rebuild() -> void:
	if arena != null:
		arena.queue_free()
	arena = ArenaView.new()
	add_child(arena)
	var unit: float = DyaEconomy.SCALES[scale_idx]
	var small := MatchSim.W * unit <= 5.0
	# small holograms float at table height; big ones lie on the ground around you
	var c := Vector3(center.x, 0.8 if small else 0.0, center.z - (MatchSim.H * unit * 0.5 if not small else 0.0))
	arena.setup(sim, c, Vector3(1, 0, 0), unit, Vector2(MatchSim.W * 0.5, MatchSim.H * 0.5), rep.get("terrain", "plains"))
	arena.show_edge()

func _process(delta: float) -> void:
	if sim == null:
		return
	if not paused and sim.tick < int(rep.final_tick):
		sim.step(delta)
	sim.events.clear()
	info.text = "%s  %d:%02d of %d:%02d   %s vs %s   scale: %s%s" % ["Paused" if paused else "Playing", int(sim.time) / 60, int(sim.time) % 60,
		int(rep.final_tick * MatchSim.TICK) / 60, int(rep.final_tick * MatchSim.TICK) % 60, rep.teams[0].name, rep.teams[1].name, DyaEconomy.SCALE_NAMES[scale_idx],
		"   exact: %s" % str(sim.state_hash() == int(rep.final_hash)) if sim.tick >= int(rep.final_tick) or sim.over else ""]
