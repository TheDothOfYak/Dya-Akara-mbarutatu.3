class_name Sfx
extends Node
## Audio engine. Every sound is a placeholder tone generated in code until real
## audio exists. Spatial playback, priority mixing (the pulse and spawns always
## cut through), a loud-event limiter, and adaptive placeholder music.

const RATE := 22050
var sounds := {}
var music_tracks := {}
var _music_a: AudioStreamPlayer
var _music_b: AudioStreamPlayer
var _music_ctx := ""
var _duck_until := 0.0
var played_log: Array = [] # last few sound names, for tests and debugging

func _ready() -> void:
	_setup_buses()
	_build_sounds()
	_music_a = AudioStreamPlayer.new()
	_music_a.bus = "Music"
	add_child(_music_a)
	_music_b = AudioStreamPlayer.new()
	_music_b.bus = "Music"
	add_child(_music_b)
	apply_volumes()

func _setup_buses() -> void:
	for n in ["Music", "SFX", "Crowd", "Priority"]:
		if AudioServer.get_bus_index(n) < 0:
			AudioServer.add_bus()
			var i := AudioServer.bus_count - 1
			AudioServer.set_bus_name(i, n)
			AudioServer.set_bus_send(i, "Master")
	# loud-event limiter: a cap on sudden loudness
	var lim := AudioEffectLimiter.new()
	lim.ceiling_db = -6.0
	lim.threshold_db = -12.0
	AudioServer.add_bus_effect(0, lim)

func apply_volumes() -> void:
	var s: Dictionary = Game.settings
	AudioServer.set_bus_volume_db(0, linear_to_db(max(0.0001, s.vol_master)))
	AudioServer.set_bus_volume_db(AudioServer.get_bus_index("Music"), linear_to_db(max(0.0001, s.vol_music)))
	AudioServer.set_bus_volume_db(AudioServer.get_bus_index("SFX"), linear_to_db(max(0.0001, s.vol_sfx)))
	AudioServer.set_bus_volume_db(AudioServer.get_bus_index("Crowd"), linear_to_db(max(0.0001, s.vol_crowd)))
	AudioServer.set_bus_mute(AudioServer.get_bus_index("Music"), s.mute_music)
	AudioServer.set_bus_mute(AudioServer.get_bus_index("SFX"), s.mute_sfx)
	AudioServer.set_bus_effect_enabled(0, 0, s.loud_limiter)

## partials: [[freq, amp], ...]; decay in 1/seconds; noise 0..1
static func tone(seconds: float, partials: Array, decay: float, noise := 0.0, sweep := 0.0, loop := false) -> AudioStreamWAV:
	var n := int(seconds * RATE)
	var data := PackedByteArray()
	data.resize(n * 2)
	var seed_n := 12345
	for i in n:
		var t := float(i) / RATE
		var v := 0.0
		for p in partials:
			v += sin(TAU * (p[0] + sweep * t) * t) * p[1]
		if noise > 0.0:
			seed_n = (seed_n * 1103515245 + 12345) & 0x7fffffff
			v += (float(seed_n) / 0x7fffffff * 2.0 - 1.0) * noise
		var env := exp(-decay * t) if not loop else 1.0
		env *= min(1.0, t * 200.0)
		if not loop:
			env *= min(1.0, (seconds - t) * 100.0)
		data.encode_s16(i * 2, int(clampf(v * env, -1.0, 1.0) * 30000.0))
	var w := AudioStreamWAV.new()
	w.format = AudioStreamWAV.FORMAT_16_BITS
	w.mix_rate = RATE
	w.data = data
	if loop:
		w.loop_mode = AudioStreamWAV.LOOP_FORWARD
		w.loop_end = n
	return w

func _build_sounds() -> void:
	sounds["pulse"] = tone(1.2, [[392.0, 0.35], [588.0, 0.2]], 3.0)
	sounds["pulse2"] = tone(1.2, [[392.0, 0.3], [588.0, 0.2], [784.0, 0.18]], 3.0)
	sounds["pulse3"] = tone(1.3, [[392.0, 0.28], [588.0, 0.18], [784.0, 0.16], [988.0, 0.14]], 2.6)
	sounds["pulse4"] = tone(1.4, [[392.0, 0.25], [588.0, 0.17], [784.0, 0.15], [988.0, 0.13], [1176.0, 0.12]], 2.4)
	sounds["pay"] = tone(0.12, [[880.0, 0.4]], 22.0)
	sounds["paid"] = tone(0.4, [[880.0, 0.3], [1320.0, 0.25]], 8.0)
	sounds["deny"] = tone(0.18, [[160.0, 0.45]], 14.0)
	sounds["throw"] = tone(0.25, [], 10.0, 0.35)
	sounds["land"] = tone(0.2, [[110.0, 0.6]], 18.0, 0.1)
	sounds["spawn"] = tone(0.5, [[330.0, 0.35]], 5.0, 0.0, 500.0)
	sounds["hit"] = tone(0.1, [[200.0, 0.4]], 30.0, 0.25)
	sounds["death"] = tone(0.5, [[220.0, 0.4]], 6.0, 0.05, -180.0)
	sounds["relic"] = tone(0.6, [[523.0, 0.3], [659.0, 0.25], [784.0, 0.2]], 4.0)
	sounds["link"] = tone(0.9, [[262.0, 0.3], [392.0, 0.25], [523.0, 0.2]], 3.0)
	sounds["tick"] = tone(0.04, [[1200.0, 0.3]], 60.0)
	sounds["win"] = tone(1.6, [[523.0, 0.3], [659.0, 0.25], [784.0, 0.25], [1046.0, 0.15]], 1.8)
	sounds["lose"] = tone(1.6, [[196.0, 0.35], [233.0, 0.3]], 1.8, 0.0, -30.0)
	sounds["screech"] = tone(0.7, [[1800.0, 0.5], [2300.0, 0.4]], 3.0, 0.2, -600.0)
	sounds["warn"] = tone(0.15, [[660.0, 0.2]], 16.0)
	sounds["pour"] = tone(0.5, [], 2.0, 0.2)
	sounds["swing"] = tone(0.18, [], 12.0, 0.3)
	sounds["whip"] = tone(0.08, [], 40.0, 0.8)
	sounds["coin"] = tone(0.25, [[2100.0, 0.25], [3150.0, 0.15]], 12.0)
	sounds["crowd"] = tone(2.0, [], 0.0, 0.12, 0.0, true)
	# placeholder music: quiet looping stems until Yak's music is ready
	music_tracks["town"] = tone(4.0, [[196.0, 0.1], [294.0, 0.07], [392.0, 0.05]], 0.0, 0.0, 0.0, true)
	music_tracks["wilds"] = tone(4.0, [[147.0, 0.1], [220.0, 0.06], [330.0, 0.04]], 0.0, 0.01, 0.0, true)
	music_tracks["tower"] = tone(4.0, [[220.0, 0.08], [330.0, 0.06], [440.0, 0.04]], 0.0, 0.0, 0.0, true)
	music_tracks["match"] = tone(4.0, [[110.0, 0.12], [165.0, 0.08], [220.0, 0.05]], 0.0, 0.0, 0.0, true)
	music_tracks["escalation"] = tone(4.0, [[110.0, 0.12], [165.0, 0.08], [233.0, 0.07], [277.0, 0.05]], 0.0, 0.0, 0.0, true)
	music_tracks["victory"] = tone(4.0, [[262.0, 0.1], [330.0, 0.08], [392.0, 0.07]], 0.0, 0.0, 0.0, true)
	music_tracks["defeat"] = tone(4.0, [[131.0, 0.12], [156.0, 0.08]], 0.0, 0.0, 0.0, true)

## A creature's song: its own file if the folder has one, else a placeholder
## melody derived from the creature's name (stable for that creature).
func song_for(sp: Dictionary) -> AudioStream:
	var f: String = sp.get("song", {}).get("file", "")
	if f != "" and ResourceLoader.exists(sp.folder + "/" + f):
		return load(sp.folder + "/" + f)
	var scale := [262.0, 294.0, 330.0, 392.0, 440.0, 523.0]
	var h := DyaRng.new(DyaRng.hash_str(sp.id))
	var n := RATE * 4
	var data := PackedByteArray()
	data.resize(n * 2)
	var notes := []
	for i in 8:
		notes.append(h.pick(scale))
	for i in n:
		var t := float(i) / RATE
		var k := int(t * 2.0) % 8
		var lt := fmod(t, 0.5)
		var v: float = sin(TAU * float(notes[k]) * t) * 0.3 * exp(-4.0 * lt) * min(1.0, lt * 100.0)
		data.encode_s16(i * 2, int(v * 30000.0))
	var w := AudioStreamWAV.new()
	w.format = AudioStreamWAV.FORMAT_16_BITS
	w.mix_rate = RATE
	w.data = data
	return w

## Play a sound. `at` (a world position) makes it spatial. Priority sounds duck
## everything else so they always cut through. `unit` scales falloff to the arena.
func play(sname: String, at = null, priority := false, unit := 1.0, loud := false) -> void:
	played_log.append(sname)
	if played_log.size() > 40:
		played_log.pop_front()
	if not sounds.has(sname):
		return
	if loud and sname == "screech" and not Game.settings.strike_audio:
		return
	var p
	if at == null:
		p = AudioStreamPlayer.new()
	else:
		p = AudioStreamPlayer3D.new()
		p.unit_size = clampf(3.0 * unit, 0.5, 60.0)
		p.max_distance = 400.0
	p.stream = sounds[sname]
	p.bus = "Priority" if priority else "SFX"
	add_child(p)
	if at != null:
		p.global_position = at
	p.finished.connect(p.queue_free)
	if loud:
		# a short directional warning cue comes first
		var w: Node = AudioStreamPlayer3D.new() if at != null else AudioStreamPlayer.new()
		w.stream = sounds["warn"]
		w.bus = "SFX"
		add_child(w)
		if at != null:
			w.global_position = at
		w.finished.connect(w.queue_free)
		w.play()
		get_tree().create_timer(0.25).timeout.connect(func(): if is_instance_valid(p): p.play())
	else:
		p.play()
	if priority:
		_duck_until = Time.get_ticks_msec() / 1000.0 + sounds[sname].get_length()

func _process(_delta: float) -> void:
	var duck := Time.get_ticks_msec() / 1000.0 < _duck_until
	var s: Dictionary = Game.settings
	var i := AudioServer.get_bus_index("SFX")
	var want := linear_to_db(max(0.0001, s.vol_sfx)) - (9.0 if duck else 0.0)
	AudioServer.set_bus_volume_db(i, lerpf(AudioServer.get_bus_volume_db(i), want, 0.2))
	i = AudioServer.get_bus_index("Crowd")
	want = linear_to_db(max(0.0001, s.vol_crowd)) - (9.0 if duck else 0.0)
	AudioServer.set_bus_volume_db(i, lerpf(AudioServer.get_bus_volume_db(i), want, 0.2))

## Adaptive music: crossfade to the stem for this context.
func music(ctx: String) -> void:
	if ctx == _music_ctx or not music_tracks.has(ctx):
		return
	_music_ctx = ctx
	var from := _music_a if _music_a.playing else _music_b
	var to := _music_b if from == _music_a else _music_a
	to.stream = music_tracks[ctx]
	to.volume_db = -40.0
	to.play()
	var tw := create_tween().set_parallel(true)
	tw.tween_property(to, "volume_db", -8.0, 1.5)
	tw.tween_property(from, "volume_db", -40.0, 1.5)
	tw.chain().tween_callback(from.stop)
