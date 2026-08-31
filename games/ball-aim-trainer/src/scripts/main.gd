extends Node3D

enum GameState { READY, COUNTDOWN, PLAYING, RESULTS }

const TARGET_SCENE := preload("res://scenes/target.tscn")
const ACTIVE_TARGET_COUNT := 9
const SPAWN_SLOT_COUNT := 12
const ROUND_DURATION := 60.0
const RESPAWN_DELAY := 0.18
const MOUSE_SENSITIVITY := 0.0022
const MAX_YAW := deg_to_rad(58.0)
const MAX_PITCH := deg_to_rad(36.0)

const TARGET_COLORS := [
	Color("ff5b35"),
	Color("ff7a32"),
	Color("ff4d6d"),
	Color("ff6f3c"),
	Color("ff3f55"),
	Color("ff8f36"),
	Color("ff6542"),
	Color("ff4a3d"),
	Color("ff784f"),
]

var state: GameState = GameState.READY
var player_yaw: Node3D
var player_pitch: Node3D
var camera: Camera3D
var spawn_positions: Array[Vector3] = []
var targets: Array[AimTarget] = []
var occupied_slots: Dictionary = {}
var rng := RandomNumberGenerator.new()
var round_serial: int = 0

var time_remaining: float = ROUND_DURATION
var score: int = 0
var shots: int = 0
var hits: int = 0
var combo: int = 0
var best_combo: int = 0
var total_reaction_ms: int = 0
var best_reaction_ms: int = 0

var timer_label: Label
var score_label: Label
var accuracy_label: Label
var combo_label: Label
var countdown_label: Label
var start_panel: PanelContainer
var result_panel: PanelContainer
var result_stats_label: Label
var start_button: Button
var retry_button: Button
var crosshair: Control
var hit_audio: AudioStreamPlayer
var miss_audio: AudioStreamPlayer
var start_audio: AudioStreamPlayer


func _ready() -> void:
	rng.randomize()
	_create_world()
	_create_player()
	_create_spawn_slots()
	_create_targets()
	_create_audio()
	_create_ui()
	_prepare_ready_state()


func _process(delta: float) -> void:
	if state != GameState.PLAYING:
		return

	time_remaining = maxf(0.0, time_remaining - delta)
	_update_hud()
	if time_remaining <= 0.0:
		_finish_round()


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE:
			Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
			get_viewport().set_input_as_handled()
			return
		if event.keycode == KEY_R:
			_start_round()
			get_viewport().set_input_as_handled()
			return

	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		player_yaw.rotation.y = clampf(
			player_yaw.rotation.y - event.relative.x * MOUSE_SENSITIVITY,
			-MAX_YAW,
			MAX_YAW
		)
		player_pitch.rotation.x = clampf(
			player_pitch.rotation.x - event.relative.y * MOUSE_SENSITIVITY,
			-MAX_PITCH,
			MAX_PITCH
		)
		get_viewport().set_input_as_handled()
		return

	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		if state == GameState.PLAYING:
			if Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
				Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
			else:
				_shoot()
			get_viewport().set_input_as_handled()


func _create_world() -> void:
	var world_environment := WorldEnvironment.new()
	world_environment.name = "WorldEnvironment"
	var environment := Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = Color("070b17")
	environment.background_energy_multiplier = 0.8
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color("25345d")
	environment.ambient_light_energy = 0.45
	environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	world_environment.environment = environment
	add_child(world_environment)


func _create_player() -> void:
	player_yaw = Node3D.new()
	player_yaw.name = "PlayerYaw"
	add_child(player_yaw)

	player_pitch = Node3D.new()
	player_pitch.name = "PlayerPitch"
	player_yaw.add_child(player_pitch)

	camera = Camera3D.new()
	camera.name = "Camera3D"
	camera.current = true
	camera.fov = 72.0
	camera.near = 0.05
	camera.far = 40.0
	player_pitch.add_child(camera)


func _create_spawn_slots() -> void:
	var slots_root := Node3D.new()
	slots_root.name = "SpawnPoints"
	add_child(slots_root)

	var yaw_angles := [-42.0, -14.0, 14.0, 42.0]
	var pitch_angles := [22.0, 0.0, -22.0]
	var slot_index := 0

	for pitch_degrees in pitch_angles:
		for yaw_degrees in yaw_angles:
			var yaw_radians := deg_to_rad(yaw_degrees)
			var pitch_radians := deg_to_rad(pitch_degrees)
			var radius := 9.2 + float((slot_index * 7) % 4) * 0.55
			var direction := Vector3(
				sin(yaw_radians) * cos(pitch_radians),
				sin(pitch_radians),
				-cos(yaw_radians) * cos(pitch_radians)
			).normalized()
			var world_position := direction * radius

			var marker := Marker3D.new()
			marker.name = "SpawnPoint%02d" % (slot_index + 1)
			marker.position = world_position
			slots_root.add_child(marker)
			spawn_positions.append(world_position)
			slot_index += 1

	assert(spawn_positions.size() == SPAWN_SLOT_COUNT)


func _create_targets() -> void:
	var target_root := Node3D.new()
	target_root.name = "Targets"
	add_child(target_root)

	for index in range(ACTIVE_TARGET_COUNT):
		var target := TARGET_SCENE.instantiate() as AimTarget
		target.name = "Target%02d" % (index + 1)
		target_root.add_child(target)
		target.setup(index, TARGET_COLORS[index % TARGET_COLORS.size()])
		targets.append(target)


func _create_audio() -> void:
	hit_audio = AudioStreamPlayer.new()
	hit_audio.name = "HitAudio"
	hit_audio.stream = _make_tone(760.0, 1380.0, 0.075, 0.34)
	add_child(hit_audio)

	miss_audio = AudioStreamPlayer.new()
	miss_audio.name = "MissAudio"
	miss_audio.stream = _make_tone(210.0, 145.0, 0.055, 0.16)
	add_child(miss_audio)

	start_audio = AudioStreamPlayer.new()
	start_audio.name = "StartAudio"
	start_audio.stream = _make_tone(440.0, 660.0, 0.11, 0.24)
	add_child(start_audio)


func _create_ui() -> void:
	var canvas := CanvasLayer.new()
	canvas.name = "UI"
	add_child(canvas)

	var ui_root := Control.new()
	ui_root.name = "UIRoot"
	ui_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ui_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	canvas.add_child(ui_root)

	timer_label = _make_label(30, Color("f5f7ff"))
	timer_label.position = Vector2(28, 22)
	timer_label.size = Vector2(260, 48)
	ui_root.add_child(timer_label)

	score_label = _make_label(30, Color("f5f7ff"))
	score_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	score_label.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	score_label.position = Vector2(-320, 22)
	score_label.size = Vector2(292, 48)
	ui_root.add_child(score_label)

	accuracy_label = _make_label(18, Color("9daccc"))
	accuracy_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	accuracy_label.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	accuracy_label.position = Vector2(-320, 66)
	accuracy_label.size = Vector2(292, 34)
	ui_root.add_child(accuracy_label)

	combo_label = _make_label(24, Color("ff7955"))
	combo_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	combo_label.set_anchors_preset(Control.PRESET_CENTER_TOP)
	combo_label.position = Vector2(-130, 24)
	combo_label.size = Vector2(260, 42)
	ui_root.add_child(combo_label)

	countdown_label = _make_label(100, Color("ffffff"))
	countdown_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	countdown_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	countdown_label.set_anchors_preset(Control.PRESET_CENTER)
	countdown_label.position = Vector2(-160, -90)
	countdown_label.size = Vector2(320, 180)
	ui_root.add_child(countdown_label)

	crosshair = Control.new()
	crosshair.name = "Crosshair"
	crosshair.set_anchors_preset(Control.PRESET_CENTER)
	crosshair.position = Vector2(-12, -12)
	crosshair.size = Vector2(24, 24)
	crosshair.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui_root.add_child(crosshair)
	_add_crosshair_bar(crosshair, Vector2(10, 0), Vector2(4, 8))
	_add_crosshair_bar(crosshair, Vector2(10, 16), Vector2(4, 8))
	_add_crosshair_bar(crosshair, Vector2(0, 10), Vector2(8, 4))
	_add_crosshair_bar(crosshair, Vector2(16, 10), Vector2(8, 4))
	var crosshair_dot := ColorRect.new()
	crosshair_dot.color = Color("fff2e8")
	crosshair_dot.position = Vector2(10, 10)
	crosshair_dot.size = Vector2(4, 4)
	crosshair.add_child(crosshair_dot)

	start_panel = _create_center_panel(ui_root, Vector2(520, 360))
	var start_box := VBoxContainer.new()
	start_box.add_theme_constant_override("separation", 14)
	start_panel.add_child(start_box)
	_add_spacer(start_box, 10)
	var title := _make_label(42, Color("ffffff"))
	title.text = "BALL AIM"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	start_box.add_child(title)
	var subtitle := _make_label(18, Color("ff7a55"))
	subtitle.text = "60 SECOND DRILL  ·  9 TARGETS  ·  12 SPAWN POINTS"
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	start_box.add_child(subtitle)
	var instructions := _make_label(18, Color("aeb9d4"))
	instructions.text = "Aim with the mouse and click to shoot.\nTargets always move to a free random position."
	instructions.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	instructions.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	instructions.custom_minimum_size = Vector2(450, 70)
	start_box.add_child(instructions)
	start_button = _make_button("START DRILL")
	start_button.pressed.connect(_start_round)
	start_box.add_child(start_button)
	var controls := _make_label(14, Color("7785a6"))
	controls.text = "LEFT CLICK  SHOOT     ·     ESC  RELEASE MOUSE     ·     R  RESTART"
	controls.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	start_box.add_child(controls)

	result_panel = _create_center_panel(ui_root, Vector2(560, 440))
	var result_box := VBoxContainer.new()
	result_box.add_theme_constant_override("separation", 12)
	result_panel.add_child(result_box)
	_add_spacer(result_box, 4)
	var result_title := _make_label(36, Color("ffffff"))
	result_title.text = "DRILL COMPLETE"
	result_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	result_box.add_child(result_title)
	result_stats_label = _make_label(20, Color("dce3f5"))
	result_stats_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	result_stats_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	result_stats_label.custom_minimum_size = Vector2(500, 235)
	result_box.add_child(result_stats_label)
	retry_button = _make_button("RUN IT AGAIN")
	retry_button.pressed.connect(_start_round)
	result_box.add_child(retry_button)
	var license_note := _make_label(12, Color("64718f"))
	license_note.text = "Built with Godot Engine 4.7.2 · MIT License"
	license_note.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	result_box.add_child(license_note)


func _prepare_ready_state() -> void:
	state = GameState.READY
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	start_panel.visible = true
	result_panel.visible = false
	countdown_label.visible = false
	crosshair.visible = false
	timer_label.visible = false
	score_label.visible = false
	accuracy_label.visible = false
	combo_label.visible = false
	_reset_stats()
	_place_initial_targets()


func _start_round() -> void:
	round_serial += 1
	var serial := round_serial
	state = GameState.COUNTDOWN
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	start_panel.visible = false
	result_panel.visible = false
	crosshair.visible = false
	timer_label.visible = true
	score_label.visible = true
	accuracy_label.visible = true
	combo_label.visible = false
	countdown_label.visible = true
	_reset_stats()
	_place_initial_targets()
	_update_hud()

	for count in [3, 2, 1]:
		if serial != round_serial:
			return
		countdown_label.text = str(count)
		start_audio.play()
		await get_tree().create_timer(0.72).timeout

	if serial != round_serial:
		return
	countdown_label.text = "GO"
	start_audio.play()
	await get_tree().create_timer(0.35).timeout
	if serial != round_serial:
		return

	countdown_label.visible = false
	crosshair.visible = true
	state = GameState.PLAYING
	for target in targets:
		target.mark_spawn_time()


func _reset_stats() -> void:
	time_remaining = ROUND_DURATION
	score = 0
	shots = 0
	hits = 0
	combo = 0
	best_combo = 0
	total_reaction_ms = 0
	best_reaction_ms = 0


func _place_initial_targets() -> void:
	occupied_slots.clear()
	var available_slots: Array[int] = []
	for slot in range(SPAWN_SLOT_COUNT):
		available_slots.append(slot)
	_shuffle_with_rng(available_slots)

	for index in range(targets.size()):
		var target := targets[index]
		target.disable_immediately()
		var slot := available_slots[index]
		occupied_slots[slot] = target
		target.show_at(spawn_positions[slot], slot, true)


func _shoot() -> void:
	shots += 1
	var viewport_center := get_viewport().get_visible_rect().size * 0.5
	var ray_origin := camera.project_ray_origin(viewport_center)
	var ray_end := ray_origin + camera.project_ray_normal(viewport_center) * 50.0
	var query := PhysicsRayQueryParameters3D.create(ray_origin, ray_end, 2)
	query.collide_with_areas = true
	query.collide_with_bodies = false
	var hit_result := get_world_3d().direct_space_state.intersect_ray(query)

	if not hit_result.is_empty():
		var collider := hit_result.get("collider") as AimTarget
		if collider and collider.register_hit():
			_register_target_hit(collider)
			return

	combo = 0
	miss_audio.play()
	_update_hud()


func _register_target_hit(target: AimTarget) -> void:
	hits += 1
	combo += 1
	best_combo = maxi(best_combo, combo)
	var reaction_ms := maxi(0, Time.get_ticks_msec() - target.spawned_at_ms)
	total_reaction_ms += reaction_ms
	if best_reaction_ms == 0 or reaction_ms < best_reaction_ms:
		best_reaction_ms = reaction_ms
	score += 100 + mini(200, maxi(0, combo - 1) * 10)
	hit_audio.play()

	var old_slot := target.spawn_slot
	occupied_slots.erase(old_slot)
	var candidates: Array[int] = []
	for slot in range(SPAWN_SLOT_COUNT):
		if not occupied_slots.has(slot) and slot != old_slot:
			candidates.append(slot)
	if candidates.is_empty():
		candidates.append(old_slot)

	var new_slot := candidates[rng.randi_range(0, candidates.size() - 1)]
	occupied_slots[new_slot] = target
	target.reserve_slot(new_slot)
	var serial := round_serial
	_respawn_target(target, new_slot, serial)
	_update_hud()


func _respawn_target(target: AimTarget, slot: int, serial: int) -> void:
	await get_tree().create_timer(RESPAWN_DELAY).timeout
	if serial != round_serial or state != GameState.PLAYING:
		return
	target.show_at(spawn_positions[slot], slot, true)


func _finish_round() -> void:
	if state != GameState.PLAYING:
		return
	state = GameState.RESULTS
	round_serial += 1
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	crosshair.visible = false
	countdown_label.visible = false
	combo_label.visible = false
	for target in targets:
		target.disable_immediately()

	var accuracy := 0.0 if shots == 0 else float(hits) / float(shots) * 100.0
	var average_reaction := 0 if hits == 0 else total_reaction_ms / hits
	result_stats_label.text = (
		"SCORE     %06d\n\n" % score
		+ "HITS      %d / %d\n" % [hits, shots]
		+ "ACCURACY  %.1f%%\n" % accuracy
		+ "BEST RUN  x%d\n" % best_combo
		+ "AVG TIME  %d ms\n" % average_reaction
		+ "BEST TIME %d ms" % best_reaction_ms
	)
	result_panel.visible = true


func _update_hud() -> void:
	var accuracy := 0.0 if shots == 0 else float(hits) / float(shots) * 100.0
	timer_label.text = "TIME  %02d" % int(ceil(time_remaining))
	score_label.text = "SCORE  %06d" % score
	accuracy_label.text = "HITS %d/%d    ACC %.1f%%" % [hits, shots, accuracy]
	combo_label.text = "STREAK  x%d" % combo
	combo_label.visible = state == GameState.PLAYING and combo >= 2


func _shuffle_with_rng(values: Array[int]) -> void:
	for index in range(values.size() - 1, 0, -1):
		var swap_index := rng.randi_range(0, index)
		var temporary := values[index]
		values[index] = values[swap_index]
		values[swap_index] = temporary


func _make_label(font_size: int, color: Color) -> Label:
	var label := Label.new()
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.55))
	label.add_theme_constant_override("shadow_offset_x", 2)
	label.add_theme_constant_override("shadow_offset_y", 2)
	return label


func _make_button(text: String) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size = Vector2(0, 58)
	button.focus_mode = Control.FOCUS_ALL
	button.add_theme_font_size_override("font_size", 19)
	button.add_theme_color_override("font_color", Color("ffffff"))
	button.add_theme_color_override("font_hover_color", Color("ffffff"))
	button.add_theme_color_override("font_pressed_color", Color("ffffff"))

	var normal_style := StyleBoxFlat.new()
	normal_style.bg_color = Color("dd4d2d")
	normal_style.corner_radius_top_left = 8
	normal_style.corner_radius_top_right = 8
	normal_style.corner_radius_bottom_left = 8
	normal_style.corner_radius_bottom_right = 8
	var hover_style := normal_style.duplicate() as StyleBoxFlat
	hover_style.bg_color = Color("fa6541")
	var pressed_style := normal_style.duplicate() as StyleBoxFlat
	pressed_style.bg_color = Color("b73922")
	button.add_theme_stylebox_override("normal", normal_style)
	button.add_theme_stylebox_override("hover", hover_style)
	button.add_theme_stylebox_override("pressed", pressed_style)
	button.add_theme_stylebox_override("focus", hover_style)
	return button


func _create_center_panel(parent: Control, panel_size: Vector2) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_CENTER)
	panel.position = -panel_size * 0.5
	panel.size = panel_size
	panel.mouse_filter = Control.MOUSE_FILTER_STOP
	var panel_style := StyleBoxFlat.new()
	panel_style.bg_color = Color(0.035, 0.055, 0.11, 0.96)
	panel_style.border_color = Color(1.0, 0.32, 0.18, 0.65)
	panel_style.set_border_width_all(1)
	panel_style.set_corner_radius_all(16)
	panel_style.content_margin_left = 28
	panel_style.content_margin_right = 28
	panel_style.content_margin_top = 24
	panel_style.content_margin_bottom = 24
	panel.add_theme_stylebox_override("panel", panel_style)
	parent.add_child(panel)
	return panel


func _add_crosshair_bar(parent: Control, bar_position: Vector2, bar_size: Vector2) -> void:
	var bar := ColorRect.new()
	bar.color = Color("fff2e8")
	bar.position = bar_position
	bar.size = bar_size
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(bar)


func _add_spacer(parent: VBoxContainer, height: float) -> void:
	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(0, height)
	spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(spacer)


func _make_tone(start_frequency: float, end_frequency: float, duration: float, volume: float) -> AudioStreamWAV:
	var mix_rate := 22050
	var sample_count := int(duration * mix_rate)
	var audio_data := PackedByteArray()
	audio_data.resize(sample_count * 2)
	var phase := 0.0

	for index in range(sample_count):
		var progress := float(index) / float(maxi(1, sample_count - 1))
		var frequency := lerpf(start_frequency, end_frequency, progress)
		phase += TAU * frequency / float(mix_rate)
		var envelope := pow(1.0 - progress, 2.0)
		var sample := int(sin(phase) * 32767.0 * volume * envelope)
		audio_data[index * 2] = sample & 0xff
		audio_data[index * 2 + 1] = (sample >> 8) & 0xff

	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = mix_rate
	stream.stereo = false
	stream.data = audio_data
	return stream
