extends Node3D

enum GameState { READY, COUNTDOWN, PLAYING, RESULTS }

const TARGET_SCENE := preload("res://scenes/target.tscn")
const ARMS_SCENE := preload("res://assets/viewmodel/wrad-arms/arms.glb")
const RIFLE_SCENE := preload("res://assets/weapons/styloo/ak47.glb")
const PISTOL_SCENE := preload("res://assets/weapons/styloo/pew.glb")
const SNIPER_SCENE := preload("res://assets/weapons/styloo/awp.glb")
const AMMO_BOX_SCENE := preload("res://assets/weapons/styloo/ammobox_low.glb")
const INDUSTRIAL_BUILDING_A := preload("res://assets/environment/kenney-industrial/building-a.glb")
const INDUSTRIAL_BUILDING_D := preload("res://assets/environment/kenney-industrial/building-d.glb")
const INDUSTRIAL_BUILDING_H := preload("res://assets/environment/kenney-industrial/building-h.glb")
const INDUSTRIAL_BUILDING_M := preload("res://assets/environment/kenney-industrial/building-m.glb")
const INDUSTRIAL_BUILDING_Q := preload("res://assets/environment/kenney-industrial/building-q.glb")
const SHIPPING_CONTAINER_A := preload("res://assets/environment/kenney-industrial/shipping-container-a.glb")
const SHIPPING_CONTAINER_B := preload("res://assets/environment/kenney-industrial/shipping-container-b.glb")
const INDUSTRIAL_TANK := preload("res://assets/environment/kenney-industrial/detail-tank-large.glb")
const WATER_TOWER := preload("res://assets/environment/kenney-industrial/water-tower.glb")
const WINDMILL := preload("res://assets/environment/kenney-industrial/windmill-low.glb")
const SOLAR_PANELS := preload("res://assets/environment/kenney-industrial/solar-panel-landscape-group.glb")
const CHALKBOARD_SCENE := preload("res://assets/environment/polyhaven/standing_chalkboard_01/standing_chalkboard_01_1k.gltf")
const INDUSTRIAL_SKY := preload("res://assets/environment/polyhaven/industrial_sunset_02_puresky_1k.hdr")
const CONCRETE_ALBEDO := preload("res://assets/environment/polyhaven/hangar_concrete_floor_diff_1k.jpg")
const CONCRETE_NORMAL := preload("res://assets/environment/polyhaven/hangar_concrete_floor_nor_gl_1k.jpg")
const CONCRETE_ROUGHNESS := preload("res://assets/environment/polyhaven/hangar_concrete_floor_rough_1k.jpg")
const RIFLE_AUDIO := preload("res://assets/audio/weapons/rifle_fire.wav")
const PISTOL_AUDIO := preload("res://assets/audio/weapons/pistol_fire.wav")
const SNIPER_AUDIO := preload("res://assets/audio/weapons/sniper_fire.wav")
const BOLT_AUDIO := preload("res://assets/audio/weapons/bolt_action.wav")
const CHINESE_FONT := preload("res://assets/fonts/NotoSansSC.ttf")
const FRAGMENT_SCRIPT := preload("res://scripts/target_fragment.gd")
const SCOPE_OVERLAY_SCRIPT := preload("res://scripts/scope_overlay.gd")
const MODE_HUMANOID := "humanoid"
const MODE_BALL := "ball"
const BALL_TARGET_COLOR := Color("ffd21f")
const BALL_WEAPON_SCALE_MULTIPLIER := 1.42
const BALL_GRID_X := [-6.0, 0.0, 6.0]
const BALL_GRID_Y := [-0.60, 1.80, 4.20, 6.60]
const ACTIVE_TARGET_COUNT := 9
const SPAWN_SLOT_COUNT := 12
const RESPAWN_DELAY := 0.55
const MOUSE_SENSITIVITY := 0.0022
const MAX_PITCH := deg_to_rad(72.0)
const BASE_TARGET_SIZE := 1.0
const SETTINGS_PATH := "user://ball_aim_settings.cfg"
const DEFAULT_BALL_DISTANCE := 30.0
const DEFAULT_BALL_DIAMETER := 1.0
const DEFAULT_ROUND_DURATION := 60.0
const DEFAULT_RED_DOT_SIZE := 8.0
const WEAPON_BASE_POSITION := Vector3(0.23, -0.20, -0.36)
const WEAPON_BASE_ROTATION := Vector3(deg_to_rad(-2.0), deg_to_rad(-1.5), deg_to_rad(-1.0))
const STANDING_HEIGHT := 1.8
const CROUCH_HEIGHT := 1.2
const STANDING_CAMERA_HEIGHT := 1.65
const CROUCH_CAMERA_HEIGHT := 1.05
const PLAYER_RADIUS := 0.35
const WALK_SPEED := 5.3
const CROUCH_SPEED := 2.35
const MOVE_ACCELERATION := 18.0
const COUNTER_STRAFE_DECELERATION := 30.0
const MAX_MOVE_SPREAD_DEGREES := 3.2
const FRAGMENT_POOL_SIZE := 72

const TARGET_COLORS := [
	Color("ff5b35"), Color("ff7a32"), Color("ff315f"),
	Color("ff6f3c"), Color("ff204e"), Color("ff8f36"),
	Color("ff6542"), Color("ff3a31"), Color("ff784f"),
]

var state: GameState = GameState.READY
var player_body: CharacterBody3D
var player_collision: CollisionShape3D
var player_capsule: CapsuleShape3D
var player_yaw: Node3D
var player_pitch: Node3D
var camera: Camera3D
var weapon_pivot: Node3D
var arms_container: Node3D
var muzzle_flash: MeshInstance3D
var muzzle_sparks: Node3D
var arms_animation_player: AnimationPlayer
var weapon_models: Dictionary = {}
var weapon_base_scales: Dictionary = {}
var weapon_audio_players: Dictionary = {}
var bolt_audio: AudioStreamPlayer
var spawn_offsets: Array[Vector3] = []
var spawn_positions: Array[Vector3] = []
var spawn_markers: Array[Marker3D] = []
var targets: Array[AimTarget] = []
var occupied_slots: Dictionary = {}
var rng := RandomNumberGenerator.new()
var round_serial := 0

var ball_distance := DEFAULT_BALL_DISTANCE
var ball_diameter := DEFAULT_BALL_DIAMETER
var round_duration := DEFAULT_ROUND_DURATION
var red_dot_size := DEFAULT_RED_DOT_SIZE
var training_mode := MODE_HUMANOID

var time_remaining := DEFAULT_ROUND_DURATION
var score := 0
var shots := 0
var hits := 0
var combo := 0
var best_combo := 0
var total_reaction_ms := 0
var best_reaction_ms := 0
var weapon_sway := Vector2.ZERO
var weapon_recoil := 0.0
var fire_cooldown := 0.0
var trigger_held := false
var current_weapon := "rifle"
var sniper_bolting := false
var scope_active := false
var is_crouching := false
var current_camera_height := STANDING_CAMERA_HEIGHT
var current_move_spread := 0.0
var fragment_pool: Array[TargetFragment] = []
var sound_enabled := true

var timer_label: Label
var score_label: Label
var accuracy_label: Label
var combo_label: Label
var weapon_label: Label
var countdown_label: Label
var start_panel: PanelContainer
var result_panel: PanelContainer
var result_stats_label: Label
var red_dot: RedDot
var hit_audio: AudioStreamPlayer
var miss_audio: AudioStreamPlayer
var start_audio: AudioStreamPlayer
var break_audio: AudioStreamPlayer
var setting_value_labels: Dictionary = {}
var setting_sliders: Dictionary = {}
var setting_name_labels: Dictionary = {}
var mode_buttons: Dictionary = {}
var settings_summary_label: Label
var instructions_label: Label
var controls_label: Label
var scope_overlay: Control


func _ready() -> void:
	rng.randomize()
	_load_settings()
	_create_world()
	_create_player()
	_create_spawn_slots()
	_create_targets()
	_create_fragment_pool()
	_create_audio()
	_create_ui()
	_apply_training_mode(false)
	_apply_settings(false)
	_prepare_ready_state()


func _process(delta: float) -> void:
	_update_weapon(delta)
	_update_fragments(delta)
	if state != GameState.PLAYING:
		return
	fire_cooldown = maxf(0.0, fire_cooldown - delta)
	if trigger_held and current_weapon == "rifle" and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED and fire_cooldown <= 0.0:
		_shoot()
	time_remaining = maxf(0.0, time_remaining - delta)
	_update_hud()
	if time_remaining <= 0.0:
		_finish_round()


func _physics_process(delta: float) -> void:
	if not player_body:
		return
	var input_vector := Vector2.ZERO
	if state == GameState.PLAYING and not _is_ball_mode():
		input_vector = _get_movement_input()
		is_crouching = Input.is_key_pressed(KEY_CTRL) or Input.is_key_pressed(KEY_C)
	else:
		is_crouching = false
	var move_speed := CROUCH_SPEED if is_crouching else WALK_SPEED
	var forward := -player_yaw.global_basis.z
	var right := player_yaw.global_basis.x
	forward.y = 0.0
	right.y = 0.0
	var desired_direction := (right.normalized() * input_vector.x + forward.normalized() * input_vector.y).normalized()
	var desired_velocity := desired_direction * move_speed
	var acceleration := MOVE_ACCELERATION if desired_direction != Vector3.ZERO else COUNTER_STRAFE_DECELERATION
	player_body.velocity.x = move_toward(player_body.velocity.x, desired_velocity.x, acceleration * delta)
	player_body.velocity.z = move_toward(player_body.velocity.z, desired_velocity.z, acceleration * delta)
	if not player_body.is_on_floor():
		player_body.velocity.y -= 18.0 * delta
	else:
		player_body.velocity.y = -0.5
	player_body.move_and_slide()
	_update_crouch(delta)
	var horizontal_speed := Vector2(player_body.velocity.x, player_body.velocity.z).length()
	current_move_spread = _movement_spread_degrees(horizontal_speed, is_crouching)


func _get_movement_input() -> Vector2:
	if _is_ball_mode():
		return Vector2.ZERO
	var result := Vector2.ZERO
	if Input.is_key_pressed(KEY_A): result.x -= 1.0
	if Input.is_key_pressed(KEY_D): result.x += 1.0
	if Input.is_key_pressed(KEY_W): result.y += 1.0
	if Input.is_key_pressed(KEY_S): result.y -= 1.0
	return result.normalized()


func _update_crouch(delta: float) -> void:
	var target_height := CROUCH_HEIGHT if is_crouching else STANDING_HEIGHT
	var target_camera_height := CROUCH_CAMERA_HEIGHT if is_crouching else STANDING_CAMERA_HEIGHT
	player_capsule.height = move_toward(player_capsule.height, target_height, delta * 4.8)
	player_collision.position.y = player_capsule.height * 0.5
	current_camera_height = move_toward(current_camera_height, target_camera_height, delta * 3.8)
	player_yaw.position.y = current_camera_height


func _movement_spread_degrees(horizontal_speed: float, crouching: bool) -> float:
	if horizontal_speed < 0.12:
		return 0.0
	var speed_ratio := clampf(horizontal_speed / WALK_SPEED, 0.0, 1.0)
	var crouch_multiplier := 0.58 if crouching else 1.0
	return MAX_MOVE_SPREAD_DEGREES * speed_ratio * crouch_multiplier


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE:
			trigger_held = false
			Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
			get_viewport().set_input_as_handled()
			return
		if event.keycode == KEY_R:
			_start_round()
			get_viewport().set_input_as_handled()
			return
		if event.keycode in [KEY_1, KEY_2, KEY_3]:
			var weapon_ids := {KEY_1: "rifle", KEY_2: "pistol", KEY_3: "sniper"}
			_switch_weapon(weapon_ids[event.keycode])
			get_viewport().set_input_as_handled()
			return

	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		player_yaw.rotation.y -= event.relative.x * MOUSE_SENSITIVITY
		player_pitch.rotation.x = clampf(player_pitch.rotation.x - event.relative.y * MOUSE_SENSITIVITY, -MAX_PITCH, MAX_PITCH)
		weapon_sway = (weapon_sway + Vector2(event.relative.x, event.relative.y) * 0.00055).limit_length(0.035)
		get_viewport().set_input_as_handled()
		return

	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if state == GameState.PLAYING:
			if event.pressed and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
				Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
				trigger_held = false
			else:
				trigger_held = event.pressed
				if event.pressed and fire_cooldown <= 0.0:
					_shoot()
			get_viewport().set_input_as_handled()
		return

	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_RIGHT:
		if state == GameState.PLAYING and current_weapon == "sniper":
			if event.pressed:
				_set_scope(not scope_active)
			get_viewport().set_input_as_handled()


func _create_world() -> void:
	var world_environment := WorldEnvironment.new()
	world_environment.name = "WorldEnvironment"
	var environment := Environment.new()
	var panorama_material := PanoramaSkyMaterial.new()
	panorama_material.panorama = INDUSTRIAL_SKY
	var sky := Sky.new()
	sky.sky_material = panorama_material
	environment.sky = sky
	environment.sky_rotation = Vector3(0.0, deg_to_rad(180.0), 0.0)
	environment.background_mode = Environment.BG_SKY
	environment.background_energy_multiplier = 0.48
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	environment.ambient_light_energy = 0.46
	environment.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	environment.fog_enabled = false
	world_environment.environment = environment
	add_child(world_environment)

	var room := Node3D.new()
	room.name = "工业射击训练场"
	add_child(room)
	_add_concrete_floor(room)

	var building_scenes: Array[PackedScene] = [INDUSTRIAL_BUILDING_A, INDUSTRIAL_BUILDING_D, INDUSTRIAL_BUILDING_H, INDUSTRIAL_BUILDING_M, INDUSTRIAL_BUILDING_Q]
	var building_layout := [
		[Vector3(-27.0, 0.0, -8.0), 90.0, 5.2], [Vector3(27.0, 0.0, -13.0), -90.0, 4.8],
		[Vector3(-29.0, 0.0, -31.0), 90.0, 5.4], [Vector3(29.0, 0.0, -37.0), -90.0, 5.0],
		[Vector3(-28.0, 0.0, -58.0), 90.0, 5.3], [Vector3(28.0, 0.0, -61.0), -90.0, 5.1],
		[Vector3(-15.0, 0.0, -76.0), 180.0, 5.4], [Vector3(15.0, 0.0, -76.0), 180.0, 5.4],
	]
	for index in range(building_layout.size()):
		var entry: Array = building_layout[index]
		_add_environment_model(room, "工业建筑%02d" % (index + 1), building_scenes[index % building_scenes.size()], entry[0], entry[1], entry[2])
		_add_world_collision_box(room, "工业建筑碰撞%02d" % (index + 1), Vector3(9.0, 9.0, 9.0), entry[0] + Vector3(0, 4.5, 0))

	_add_environment_model(room, "左侧集装箱", SHIPPING_CONTAINER_A, Vector3(-17.0, 0.0, -20.0), 6.0, 3.0)
	_add_environment_model(room, "右侧集装箱", SHIPPING_CONTAINER_B, Vector3(18.0, 0.0, -45.0), -8.0, 3.0)
	_add_world_collision_box(room, "左侧集装箱碰撞", Vector3(4.2, 3.9, 9.1), Vector3(-17.0, 1.95, -20.0))
	_add_world_collision_box(room, "右侧集装箱碰撞", Vector3(4.2, 3.9, 9.1), Vector3(18.0, 1.95, -45.0))
	_add_environment_model(room, "工业储罐", INDUSTRIAL_TANK, Vector3(-21.0, 0.0, -48.0), 0.0, 4.5)
	_add_environment_model(room, "水塔", WATER_TOWER, Vector3(22.0, 0.0, -66.0), 0.0, 5.8)
	_add_environment_model(room, "风力机", WINDMILL, Vector3(-24.0, 0.0, -68.0), 18.0, 6.5)
	_add_environment_model(room, "太阳能板", SOLAR_PANELS, Vector3(18.0, 0.0, -7.0), -18.0, 3.6)
	_add_environment_model(room, "训练说明牌", CHALKBOARD_SCENE, Vector3(-12.5, 0.0, -5.8), 22.0, 1.15)
	for index in range(5):
		_add_environment_model(room, "弹药箱%02d" % (index + 1), AMMO_BOX_SCENE, Vector3(-14.0 + index * 7.0, 0.18, -63.0), 12.0 * index, 1.3)

	for z in range(-70, 1, 10):
		_add_room_box(room, "训练区警示线", Vector3(34.0, 0.018, 0.10), Vector3(0.0, 0.018, float(z)), Color("e5a72f"))

	var key_light := DirectionalLight3D.new()
	key_light.name = "KeyLight"
	key_light.rotation_degrees = Vector3(-38.0, -48.0, 0.0)
	key_light.light_color = Color("ffd5a2")
	key_light.light_energy = 0.68
	key_light.shadow_enabled = true
	key_light.directional_shadow_max_distance = 90.0
	room.add_child(key_light)
	var fill_light := OmniLight3D.new()
	fill_light.name = "FillLight"
	fill_light.position = Vector3(-8.0, 10.0, -24.0)
	fill_light.light_color = Color("b9d3e8")
	fill_light.light_energy = 0.85
	fill_light.omni_range = 55.0
	room.add_child(fill_light)


func _add_concrete_floor(parent: Node3D) -> void:
	var floor_mesh := MeshInstance3D.new()
	floor_mesh.name = "机库混凝土地面"
	var mesh := PlaneMesh.new()
	mesh.size = Vector2(120.0, 120.0)
	mesh.subdivide_width = 1
	mesh.subdivide_depth = 1
	var material := StandardMaterial3D.new()
	material.albedo_texture = CONCRETE_ALBEDO
	material.normal_enabled = true
	material.normal_texture = CONCRETE_NORMAL
	material.roughness_texture = CONCRETE_ROUGHNESS
	material.roughness = 0.92
	material.uv1_scale = Vector3(18.0, 18.0, 18.0)
	mesh.material = material
	floor_mesh.mesh = mesh
	floor_mesh.position = Vector3(0.0, 0.0, -30.0)
	parent.add_child(floor_mesh)
	_add_world_collision_box(parent, "地面碰撞", Vector3(120.0, 0.25, 120.0), Vector3(0.0, -0.125, -30.0))


func _add_environment_model(parent: Node3D, node_name: String, packed_scene: PackedScene, model_position: Vector3, rotation_y_degrees: float, model_scale: float) -> Node3D:
	var model := packed_scene.instantiate() as Node3D
	model.name = node_name
	model.position = model_position
	model.rotation_degrees.y = rotation_y_degrees
	model.scale = Vector3.ONE * model_scale
	parent.add_child(model)
	return model


func _add_world_collision_box(parent: Node3D, node_name: String, box_size: Vector3, box_position: Vector3) -> void:
	var static_body := StaticBody3D.new()
	static_body.name = node_name
	static_body.position = box_position
	var collision_shape := CollisionShape3D.new()
	var box_shape := BoxShape3D.new()
	box_shape.size = box_size
	collision_shape.shape = box_shape
	static_body.add_child(collision_shape)
	parent.add_child(static_body)


func _add_room_box(parent: Node3D, node_name: String, box_size: Vector3, box_position: Vector3, color: Color, collidable: bool = false) -> void:
	var mesh_instance := MeshInstance3D.new()
	mesh_instance.name = node_name
	var mesh := BoxMesh.new()
	mesh.size = box_size
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.roughness = 0.88
	mesh.material = material
	mesh_instance.mesh = mesh
	mesh_instance.position = box_position
	parent.add_child(mesh_instance)
	if collidable:
		var static_body := StaticBody3D.new()
		static_body.name = node_name + "Collision"
		static_body.position = box_position
		var collision_shape := CollisionShape3D.new()
		var box_shape := BoxShape3D.new()
		box_shape.size = box_size
		collision_shape.shape = box_shape
		static_body.add_child(collision_shape)
		parent.add_child(static_body)


func _create_player() -> void:
	player_body = CharacterBody3D.new()
	player_body.name = "PlayerBody"
	player_body.floor_snap_length = 0.25
	player_body.safe_margin = 0.04
	add_child(player_body)
	player_collision = CollisionShape3D.new()
	player_collision.name = "PlayerCollision"
	player_capsule = CapsuleShape3D.new()
	player_capsule.radius = PLAYER_RADIUS
	player_capsule.height = STANDING_HEIGHT
	player_collision.shape = player_capsule
	player_collision.position.y = STANDING_HEIGHT * 0.5
	player_body.add_child(player_collision)
	player_yaw = Node3D.new()
	player_yaw.name = "PlayerYaw"
	player_yaw.position.y = STANDING_CAMERA_HEIGHT
	player_body.add_child(player_yaw)
	player_pitch = Node3D.new()
	player_pitch.name = "PlayerPitch"
	player_yaw.add_child(player_pitch)
	camera = Camera3D.new()
	camera.name = "Camera3D"
	camera.current = true
	camera.fov = 72.0
	camera.near = 0.025
	camera.far = 80.0
	player_pitch.add_child(camera)

	weapon_pivot = Node3D.new()
	weapon_pivot.name = "WeaponPivot"
	weapon_pivot.position = WEAPON_BASE_POSITION
	weapon_pivot.rotation = WEAPON_BASE_ROTATION
	camera.add_child(weapon_pivot)
	arms_container = Node3D.new()
	arms_container.name = "ArmsContainer"
	weapon_pivot.add_child(arms_container)
	var arms_root := ARMS_SCENE.instantiate()
	arms_root.name = "FPSArms"
	arms_root.position = Vector3(0.08, -0.045, -0.20)
	arms_root.rotation_degrees = Vector3(0.0, 180.0, 0.0)
	arms_root.scale = Vector3.ONE * 0.038
	arms_container.add_child(arms_root)
	_apply_tactical_glove_material(arms_root)
	_create_tactical_sleeves()
	_create_weapon_model("rifle", RIFLE_SCENE, Vector3(0.12, -0.04, -0.24), Vector3(0.0, 90.0, 0.0), 1.0)
	_create_weapon_model("pistol", PISTOL_SCENE, Vector3(0.12, -0.03, -0.22), Vector3(0.0, 90.0, 0.0), 1.65)
	_create_weapon_model("sniper", SNIPER_SCENE, Vector3(0.12, -0.05, -0.25), Vector3(0.0, 90.0, 0.0), 0.72)
	arms_animation_player = arms_root.get_node_or_null("AnimationPlayer") as AnimationPlayer
	muzzle_flash = MeshInstance3D.new()
	muzzle_flash.name = "MuzzleFlash"
	var flash_mesh := SphereMesh.new()
	flash_mesh.radius = 0.065
	flash_mesh.height = 0.18
	flash_mesh.radial_segments = 8
	flash_mesh.rings = 4
	var flash_material := StandardMaterial3D.new()
	flash_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	flash_material.albedo_color = Color("ffdd75")
	flash_material.emission_enabled = true
	flash_material.emission = Color("ff7a24")
	flash_material.emission_energy_multiplier = 3.0
	flash_mesh.material = flash_material
	muzzle_flash.mesh = flash_mesh
	muzzle_flash.position = _weapon_muzzle_position(current_weapon)
	muzzle_flash.visible = false
	weapon_pivot.add_child(muzzle_flash)
	muzzle_sparks = Node3D.new()
	muzzle_sparks.name = "MuzzleSparks"
	muzzle_sparks.position = muzzle_flash.position
	muzzle_sparks.visible = false
	weapon_pivot.add_child(muzzle_sparks)
	for index in range(6):
		var spark := MeshInstance3D.new()
		var spark_mesh := BoxMesh.new()
		spark_mesh.size = Vector3(0.012, 0.13, 0.012)
		var spark_material := StandardMaterial3D.new()
		spark_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		spark_material.albedo_color = Color("ffd45f")
		spark_material.emission_enabled = true
		spark_material.emission = Color("ff7a1a")
		spark_material.emission_energy_multiplier = 4.0
		spark_mesh.material = spark_material
		spark.mesh = spark_mesh
		spark.rotation.z = TAU * float(index) / 6.0
		spark.position = Vector3(cos(spark.rotation.z), sin(spark.rotation.z), 0.0) * 0.065
		muzzle_sparks.add_child(spark)
	_switch_weapon("rifle")


func _create_tactical_sleeves() -> void:
	var sleeve_material := StandardMaterial3D.new()
	sleeve_material.resource_name = "深蓝战术布料"
	sleeve_material.albedo_color = Color("26394a")
	sleeve_material.roughness = 0.94
	sleeve_material.metallic = 0.0
	_add_sleeve_segment("左战术袖", Vector3(-0.11, -0.43, -0.01), Vector3(-0.015, -0.12, -0.36), 0.105, 0.072, sleeve_material)
	_add_sleeve_segment("右战术袖", Vector3(0.34, -0.42, -0.01), Vector3(0.205, -0.105, -0.35), 0.11, 0.07, sleeve_material)

	var cuff_material := sleeve_material.duplicate() as StandardMaterial3D
	cuff_material.resource_name = "黑色战术袖口"
	cuff_material.albedo_color = Color("0b1117")
	_add_sleeve_segment("左袖口", Vector3(-0.027, -0.145, -0.333), Vector3(-0.006, -0.09, -0.395), 0.076, 0.064, cuff_material)
	_add_sleeve_segment("右袖口", Vector3(0.225, -0.147, -0.315), Vector3(0.195, -0.087, -0.382), 0.076, 0.062, cuff_material)


func _apply_tactical_glove_material(node: Node) -> void:
	if node is MeshInstance3D:
		var glove_material := StandardMaterial3D.new()
		glove_material.resource_name = "黑色战术手套"
		glove_material.albedo_color = Color("111820")
		glove_material.roughness = 0.88
		(node as MeshInstance3D).material_override = glove_material
	for child in node.get_children():
		_apply_tactical_glove_material(child)


func _add_sleeve_segment(segment_name: String, from_position: Vector3, to_position: Vector3, shoulder_radius: float, wrist_radius: float, material: Material) -> void:
	var direction := to_position - from_position
	var sleeve := MeshInstance3D.new()
	sleeve.name = segment_name
	var sleeve_mesh := CylinderMesh.new()
	sleeve_mesh.height = direction.length()
	sleeve_mesh.bottom_radius = shoulder_radius
	sleeve_mesh.top_radius = wrist_radius
	sleeve_mesh.radial_segments = 16
	sleeve_mesh.rings = 3
	sleeve_mesh.material = material
	sleeve.mesh = sleeve_mesh
	sleeve.position = (from_position + to_position) * 0.5
	sleeve.quaternion = Quaternion(Vector3.UP, direction.normalized())
	arms_container.add_child(sleeve)


func _create_weapon_model(weapon_id: String, packed_scene: PackedScene, model_position: Vector3, model_rotation_degrees: Vector3, model_scale: float) -> void:
	var model := packed_scene.instantiate() as Node3D
	model.name = weapon_id
	model.position = model_position
	model.rotation_degrees = model_rotation_degrees
	model.scale = Vector3.ONE * model_scale
	weapon_pivot.add_child(model)
	weapon_models[weapon_id] = model
	weapon_base_scales[weapon_id] = model.scale


func _weapon_muzzle_position(weapon_id: String) -> Vector3:
	match weapon_id:
		"pistol": return Vector3(0.12, -0.03, -0.48)
		"sniper": return Vector3(0.12, -0.05, -1.08)
		_: return Vector3(0.12, -0.04, -0.91)


func _create_spawn_slots() -> void:
	var slots_root := Node3D.new()
	slots_root.name = "SpawnPoints"
	add_child(slots_root)
	var x_offsets := [-9.0, -3.0, 3.0, 9.0]
	var depth_offsets := [-3.0, 0.0, 3.0]
	var slot_index := 0
	for depth_offset in depth_offsets:
		for x_offset in x_offsets:
			spawn_offsets.append(Vector3(x_offset, 0.0, depth_offset))
			var marker := Marker3D.new()
			marker.name = "SpawnPoint%02d" % (slot_index + 1)
			slots_root.add_child(marker)
			spawn_markers.append(marker)
			spawn_positions.append(Vector3.ZERO)
			slot_index += 1
	_rebuild_spawn_positions()
	assert(spawn_positions.size() == SPAWN_SLOT_COUNT)


func _rebuild_spawn_positions() -> void:
	for index in range(spawn_offsets.size()):
		var offset := spawn_offsets[index]
		var world_position: Vector3
		if _is_ball_mode():
			var column := index % BALL_GRID_X.size()
			var row := index / BALL_GRID_X.size()
			# 固定射球模式使用正对玩家的竖直靶面：X/Y 展开，Z 完全一致。
			world_position = Vector3(BALL_GRID_X[column], BALL_GRID_Y[row], -ball_distance)
		else:
			world_position = Vector3(offset.x, 0.0, -ball_distance + offset.z)
		spawn_positions[index] = world_position
		if index < spawn_markers.size():
			spawn_markers[index].position = world_position
	for target in targets:
		if target.spawn_slot >= 0 and target.spawn_slot < spawn_positions.size():
			target.global_position = spawn_positions[target.spawn_slot]


func _create_targets() -> void:
	var target_root := Node3D.new()
	target_root.name = "Targets"
	add_child(target_root)
	for index in range(ACTIVE_TARGET_COUNT):
		var target := TARGET_SCENE.instantiate() as AimTarget
		target.name = "Target%02d" % (index + 1)
		target_root.add_child(target)
		target.setup(index, TARGET_COLORS[index % TARGET_COLORS.size()], training_mode)
		targets.append(target)


func _create_fragment_pool() -> void:
	var fragment_root := Node3D.new()
	fragment_root.name = "TargetFragments"
	add_child(fragment_root)
	for index in range(FRAGMENT_POOL_SIZE):
		var fragment := FRAGMENT_SCRIPT.new() as TargetFragment
		fragment.name = "Fragment%02d" % (index + 1)
		fragment_root.add_child(fragment)
		fragment.configure()
		fragment_pool.append(fragment)


func _update_fragments(delta: float) -> void:
	for fragment in fragment_pool:
		fragment.update_fragment(delta)


func _spawn_target_fragments(origin: Vector3, color: Color, hit_direction: Vector3) -> void:
	var spawned := 0
	for fragment in fragment_pool:
		if not fragment.visible:
			fragment.launch(origin, color, hit_direction, rng)
			spawned += 1
			if spawned >= 9:
				break


func _create_audio() -> void:
	for weapon_id in ["rifle", "pistol", "sniper"]:
		var player := AudioStreamPlayer.new()
		player.name = weapon_id + "_开火声"
		player.stream = {"rifle": RIFLE_AUDIO, "pistol": PISTOL_AUDIO, "sniper": SNIPER_AUDIO}[weapon_id]
		player.volume_db = 5.0
		player.max_polyphony = 8
		add_child(player)
		weapon_audio_players[weapon_id] = player
	bolt_audio = AudioStreamPlayer.new()
	bolt_audio.name = "狙击枪拉栓声"
	bolt_audio.stream = BOLT_AUDIO
	bolt_audio.volume_db = 3.0
	add_child(bolt_audio)
	hit_audio = AudioStreamPlayer.new()
	hit_audio.name = "HitAudio"
	hit_audio.stream = _make_tone(760.0, 1380.0, 0.075, 0.34)
	add_child(hit_audio)
	break_audio = AudioStreamPlayer.new()
	break_audio.name = "倒地重音"
	break_audio.stream = _make_body_fall_sound()
	break_audio.volume_db = 1.5
	break_audio.max_polyphony = 6
	add_child(break_audio)
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
	var chinese_theme := Theme.new()
	chinese_theme.default_font = CHINESE_FONT
	ui_root.theme = chinese_theme
	canvas.add_child(ui_root)
	timer_label = _add_hud_label(ui_root, Vector2(28, 22), Vector2(260, 48), 30, Color.WHITE)
	var stats_box := VBoxContainer.new()
	stats_box.add_theme_constant_override("separation", -4)
	ui_root.add_child(stats_box)
	stats_box.anchor_left = 1.0
	stats_box.anchor_right = 1.0
	stats_box.offset_left = -320.0
	stats_box.offset_right = -28.0
	stats_box.offset_top = 22.0
	stats_box.offset_bottom = 100.0
	score_label = _make_label(30, Color.WHITE)
	score_label.custom_minimum_size = Vector2(292, 48)
	score_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	stats_box.add_child(score_label)
	accuracy_label = _make_label(18, Color("e0e5e8"))
	accuracy_label.custom_minimum_size = Vector2(292, 34)
	accuracy_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	stats_box.add_child(accuracy_label)
	combo_label = _add_hud_label(ui_root, Vector2(-130, 24), Vector2(260, 42), 24, Color("ffd23f"))
	combo_label.anchor_left = 0.5
	combo_label.anchor_right = 0.5
	combo_label.offset_left = -130.0
	combo_label.offset_right = 130.0
	combo_label.offset_top = 24.0
	combo_label.offset_bottom = 66.0
	combo_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	weapon_label = _add_hud_label(ui_root, Vector2.ZERO, Vector2(360, 46), 22, Color.WHITE)
	weapon_label.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	weapon_label.offset_left = 28.0
	weapon_label.offset_right = 500.0
	weapon_label.offset_top = -66.0
	weapon_label.offset_bottom = -20.0
	weapon_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	countdown_label = _add_hud_label(ui_root, Vector2(-160, -90), Vector2(320, 180), 100, Color("ffd23f"))
	countdown_label.anchor_left = 0.5
	countdown_label.anchor_right = 0.5
	countdown_label.anchor_top = 0.5
	countdown_label.anchor_bottom = 0.5
	countdown_label.offset_left = -160.0
	countdown_label.offset_right = 160.0
	countdown_label.offset_top = -90.0
	countdown_label.offset_bottom = 90.0
	countdown_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	countdown_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	red_dot = RedDot.new()
	red_dot.name = "RedDot"
	red_dot.set_anchors_preset(Control.PRESET_CENTER)
	red_dot.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui_root.add_child(red_dot)
	scope_overlay = SCOPE_OVERLAY_SCRIPT.new()
	scope_overlay.name = "三倍瞄准镜"
	scope_overlay.visible = false
	ui_root.add_child(scope_overlay)
	_update_red_dot()
	_create_start_panel(ui_root)
	_create_result_panel(ui_root)


func _add_hud_label(parent: Control, position_value: Vector2, size_value: Vector2, font_size: int, color: Color) -> Label:
	var label := _make_label(font_size, color)
	label.position = position_value
	label.size = size_value
	parent.add_child(label)
	return label


func _create_start_panel(ui_root: Control) -> void:
	start_panel = _create_center_panel(ui_root, Vector2(660, 704))
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	start_panel.add_child(box)
	var title := _make_label(38, Color.WHITE)
	title.text = "工业射击训练场"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(title)
	settings_summary_label = _make_label(15, Color("ffd23f"))
	settings_summary_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(settings_summary_label)
	instructions_label = _make_label(15, Color("c3cad3"))
	instructions_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(instructions_label)
	var mode_row := HBoxContainer.new()
	mode_row.add_theme_constant_override("separation", 10)
	box.add_child(mode_row)
	var mode_title := _make_label(16, Color("dfe5eb"))
	mode_title.text = "训练模式"
	mode_title.custom_minimum_size = Vector2(112, 44)
	mode_title.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	mode_row.add_child(mode_title)
	var mode_group := ButtonGroup.new()
	mode_group.allow_unpress = false
	var humanoid_button := _make_mode_button("人物移动", mode_group)
	humanoid_button.pressed.connect(func() -> void: _set_training_mode(MODE_HUMANOID))
	mode_row.add_child(humanoid_button)
	mode_buttons[MODE_HUMANOID] = humanoid_button
	var ball_button := _make_mode_button("固定射球", mode_group)
	ball_button.pressed.connect(func() -> void: _set_training_mode(MODE_BALL))
	mode_row.add_child(ball_button)
	mode_buttons[MODE_BALL] = ball_button
	box.add_child(HSeparator.new())
	var settings_title := _make_label(18, Color.WHITE)
	settings_title.text = "训练参数（对局开始后锁定）"
	box.add_child(settings_title)
	var grid := GridContainer.new()
	grid.columns = 3
	grid.add_theme_constant_override("h_separation", 16)
	grid.add_theme_constant_override("v_separation", 10)
	box.add_child(grid)
	_add_setting_row(grid, "ball_distance", "目标距离", 20.0, 50.0, 1.0, ball_distance)
	_add_setting_row(grid, "ball_diameter", "人物大小", 0.55, 1.55, 0.05, ball_diameter)
	_add_setting_row(grid, "round_duration", "一局时长", 15.0, 180.0, 15.0, round_duration)
	_add_setting_row(grid, "red_dot_size", "红点大小", 4.0, 20.0, 1.0, red_dot_size)
	var reset_button := _make_secondary_button("恢复默认参数")
	reset_button.custom_minimum_size.y = 42
	reset_button.pressed.connect(_reset_settings)
	box.add_child(reset_button)
	var start_button := _make_button("开始训练")
	start_button.pressed.connect(_start_round)
	box.add_child(start_button)
	controls_label = _make_label(13, Color("89939f"))
	controls_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	controls_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	box.add_child(controls_label)


func _create_result_panel(ui_root: Control) -> void:
	result_panel = _create_center_panel(ui_root, Vector2(580, 560))
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 10)
	result_panel.add_child(box)
	var title := _make_label(34, Color.WHITE)
	title.text = "训练结束"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(title)
	result_stats_label = _make_label(18, Color("e3e8ee"))
	result_stats_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	result_stats_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	result_stats_label.custom_minimum_size = Vector2(520, 330)
	box.add_child(result_stats_label)
	var retry_button := _make_button("使用相同参数再来一局")
	retry_button.pressed.connect(_start_round)
	box.add_child(retry_button)
	var edit_button := _make_secondary_button("调整训练参数")
	edit_button.pressed.connect(_show_settings)
	box.add_child(edit_button)
	var license_note := _make_label(11, Color("89939f"))
	license_note.text = "Godot 4.7.2 · 场景、人物、武器、天空与纹理均使用 CC0 素材"
	license_note.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(license_note)


func _add_setting_row(grid: GridContainer, key: String, label_text: String, minimum: float, maximum: float, step: float, value: float) -> void:
	var label := _make_label(16, Color("dfe5eb"))
	label.text = label_text
	label.custom_minimum_size = Vector2(112, 38)
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	grid.add_child(label)
	setting_name_labels[key] = label
	var slider := HSlider.new()
	slider.min_value = minimum
	slider.max_value = maximum
	slider.step = step
	slider.value = value
	slider.custom_minimum_size = Vector2(330, 38)
	slider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.add_child(slider)
	var value_label := _make_label(15, Color("ffd23f"))
	value_label.custom_minimum_size = Vector2(110, 38)
	value_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	value_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	grid.add_child(value_label)
	setting_sliders[key] = slider
	setting_value_labels[key] = value_label
	slider.value_changed.connect(func(new_value: float) -> void: _on_setting_changed(key, new_value))


func _on_setting_changed(key: String, value: float) -> void:
	match key:
		"ball_distance": ball_distance = value
		"ball_diameter": ball_diameter = value
		"round_duration": round_duration = value
		"red_dot_size": red_dot_size = value
	_apply_settings(true)


func _set_training_mode(mode: String, save: bool = true) -> void:
	if mode not in [MODE_HUMANOID, MODE_BALL]:
		return
	training_mode = mode
	_apply_training_mode(save)
	_reset_player()
	if state == GameState.READY and not spawn_positions.is_empty():
		_place_initial_targets()


func _apply_training_mode(save: bool = true) -> void:
	var ball_mode := _is_ball_mode()
	if arms_container:
		arms_container.visible = not ball_mode
	for weapon_id in weapon_models:
		var model := weapon_models[weapon_id] as Node3D
		var base_scale := weapon_base_scales.get(weapon_id, Vector3.ONE) as Vector3
		model.scale = base_scale * (BALL_WEAPON_SCALE_MULTIPLIER if ball_mode else 1.0)
	for target in targets:
		var humanoid_color: Color = TARGET_COLORS[target.target_id % TARGET_COLORS.size()]
		if target.target_mode != training_mode:
			target.configure_mode(training_mode, humanoid_color)
	_rebuild_spawn_positions()
	if setting_name_labels.has("ball_diameter"):
		(setting_name_labels["ball_diameter"] as Label).text = "小球大小" if ball_mode else "人物大小"
	if instructions_label:
		instructions_label.text = (
			"固定站位 · 黄色小球纵向靶面平铺 · 命中即刷新"
			if ball_mode
			else "CS 风格移动 · 9 个人形靶 · 12 个随机刷新点"
		)
	if controls_label:
		controls_label.text = (
			"鼠标瞄准 · 人物位置锁定 · 1突击步枪 2手枪 3狙击枪 · 右键开镜 · R重开"
			if ball_mode
			else "WASD 移动 · CTRL/C 蹲下 · 1突击步枪 2手枪 3狙击枪 · 右键开镜 · R重开"
		)
	for mode_id in mode_buttons:
		(mode_buttons[mode_id] as Button).set_pressed_no_signal(mode_id == training_mode)
	_update_setting_readouts()
	if save:
		_save_settings()


func _is_ball_mode() -> bool:
	return training_mode == MODE_BALL


func _apply_settings(save: bool = true) -> void:
	_rebuild_spawn_positions()
	for target in targets:
		target.set_target_scale(ball_diameter / BASE_TARGET_SIZE)
	_update_red_dot()
	_update_setting_readouts()
	if save:
		_save_settings()


func _update_setting_readouts() -> void:
	if setting_value_labels.has("ball_distance"):
		setting_value_labels["ball_distance"].text = "%.1f m" % ball_distance
		setting_value_labels["ball_diameter"].text = "%.2f m" % ball_diameter
		setting_value_labels["round_duration"].text = "%d 秒" % int(round_duration)
		setting_value_labels["red_dot_size"].text = "%d 像素" % int(red_dot_size)
	if settings_summary_label:
		var target_name := "小球" if _is_ball_mode() else "人物"
		settings_summary_label.text = "%d 秒 · 距离 %.1f 米 · %s %.2f 倍 · 红点 %d 像素" % [int(round_duration), ball_distance, target_name, ball_diameter, int(red_dot_size)]


func _update_red_dot() -> void:
	if not red_dot:
		return
	red_dot.set_dot_diameter(red_dot_size)


func _reset_settings() -> void:
	ball_distance = DEFAULT_BALL_DISTANCE
	ball_diameter = DEFAULT_BALL_DIAMETER
	round_duration = DEFAULT_ROUND_DURATION
	red_dot_size = DEFAULT_RED_DOT_SIZE
	for key in setting_sliders:
		var value: float = get(key)
		setting_sliders[key].set_value_no_signal(value)
	_apply_settings(true)


func _load_settings() -> void:
	var config := ConfigFile.new()
	if config.load(SETTINGS_PATH) != OK:
		return
	var settings_version := int(config.get_value("training", "version", 1))
	var saved_distance := float(config.get_value("training", "ball_distance", DEFAULT_BALL_DISTANCE))
	if settings_version < 2:
		saved_distance += 20.0
	ball_distance = clampf(saved_distance, 20.0, 50.0)
	ball_diameter = clampf(float(config.get_value("training", "ball_diameter", DEFAULT_BALL_DIAMETER)), 0.55, 1.55)
	round_duration = clampf(float(config.get_value("training", "round_duration", DEFAULT_ROUND_DURATION)), 15.0, 180.0)
	red_dot_size = clampf(float(config.get_value("training", "red_dot_size", DEFAULT_RED_DOT_SIZE)), 4.0, 20.0)
	var saved_mode := str(config.get_value("training", "training_mode", MODE_HUMANOID))
	training_mode = saved_mode if saved_mode in [MODE_HUMANOID, MODE_BALL] else MODE_HUMANOID


func _save_settings() -> void:
	var config := ConfigFile.new()
	config.set_value("training", "version", 3)
	config.set_value("training", "ball_distance", ball_distance)
	config.set_value("training", "ball_diameter", ball_diameter)
	config.set_value("training", "round_duration", round_duration)
	config.set_value("training", "red_dot_size", red_dot_size)
	config.set_value("training", "training_mode", training_mode)
	config.save(SETTINGS_PATH)


func _prepare_ready_state() -> void:
	state = GameState.READY
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	start_panel.visible = true
	result_panel.visible = false
	countdown_label.visible = false
	red_dot.visible = false
	timer_label.visible = false
	score_label.visible = false
	accuracy_label.visible = false
	combo_label.visible = false
	weapon_label.visible = false
	_set_scope(false)
	_reset_stats()
	_reset_player()
	_place_initial_targets()


func _show_settings() -> void:
	state = GameState.READY
	trigger_held = false
	start_panel.visible = true
	result_panel.visible = false
	_reset_player()
	_place_initial_targets()


func _start_round() -> void:
	round_serial += 1
	var serial := round_serial
	state = GameState.COUNTDOWN
	trigger_held = false
	fire_cooldown = 0.0
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	start_panel.visible = false
	result_panel.visible = false
	red_dot.visible = false
	timer_label.visible = true
	score_label.visible = true
	accuracy_label.visible = true
	combo_label.visible = false
	countdown_label.visible = true
	_reset_stats()
	_reset_player()
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
	countdown_label.text = "开始"
	start_audio.play()
	await get_tree().create_timer(0.35).timeout
	if serial != round_serial:
		return
	countdown_label.visible = false
	red_dot.visible = true
	weapon_label.visible = true
	state = GameState.PLAYING
	for target in targets:
		target.mark_spawn_time()


func _reset_stats() -> void:
	time_remaining = round_duration
	score = 0
	shots = 0
	hits = 0
	combo = 0
	best_combo = 0
	total_reaction_ms = 0
	best_reaction_ms = 0


func _reset_player() -> void:
	if not player_body:
		return
	player_body.global_position = Vector3.ZERO
	player_body.velocity = Vector3.ZERO
	player_yaw.rotation = Vector3.ZERO
	player_pitch.rotation = Vector3.ZERO
	is_crouching = false
	current_camera_height = STANDING_CAMERA_HEIGHT
	player_yaw.position.y = current_camera_height
	player_capsule.height = STANDING_HEIGHT
	player_collision.position.y = STANDING_HEIGHT * 0.5


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
	if sniper_bolting:
		return
	fire_cooldown = _weapon_fire_interval(current_weapon)
	shots += 1
	var movement_ratio := clampf(current_move_spread / MAX_MOVE_SPREAD_DEGREES, 0.0, 1.0)
	var recoil_strength := _weapon_recoil_strength(current_weapon)
	weapon_recoil = minf(weapon_recoil + recoil_strength, 0.24)
	if current_move_spread > 0.01:
		var upward_kick := current_move_spread * rng.randf_range(0.16, 0.32) * _weapon_spread_multiplier(current_weapon)
		var sideways_kick := current_move_spread * rng.randf_range(-0.22, 0.22) * _weapon_spread_multiplier(current_weapon)
		player_pitch.rotation.x = clampf(
			player_pitch.rotation.x - deg_to_rad(upward_kick),
			-MAX_PITCH,
			MAX_PITCH
		)
		player_yaw.rotation.y += deg_to_rad(sideways_kick)
	_flash_muzzle()
	if sound_enabled and weapon_audio_players.has(current_weapon):
		(weapon_audio_players[current_weapon] as AudioStreamPlayer).play()
	var viewport_center := get_viewport().get_visible_rect().size * 0.5
	var ray_origin := camera.project_ray_origin(viewport_center)
	var ray_direction := camera.project_ray_normal(viewport_center)
	if current_move_spread > 0.01:
		var effective_spread := current_move_spread * _weapon_spread_multiplier(current_weapon)
		var spread_radius := tan(deg_to_rad(effective_spread)) * sqrt(rng.randf())
		var spread_angle := rng.randf_range(0.0, TAU)
		ray_direction = (
			ray_direction
			+ camera.global_basis.x * cos(spread_angle) * spread_radius
			+ camera.global_basis.y * sin(spread_angle) * spread_radius
		).normalized()
	var ray_end := ray_origin + ray_direction * 80.0
	var query := PhysicsRayQueryParameters3D.create(ray_origin, ray_end, 3)
	query.exclude = [player_body.get_rid()]
	query.collide_with_areas = true
	query.collide_with_bodies = true
	var hit_result := get_world_3d().direct_space_state.intersect_ray(query)
	if not hit_result.is_empty():
		var collider := hit_result.get("collider") as Area3D
		var target := collider.get_meta("target", null) as AimTarget if collider else null
		if target and target.is_active:
			var hit_zone := str(collider.get_meta("hit_zone", "body"))
			var killed := target.register_weapon_hit(hit_zone, current_weapon)
			_register_target_hit(target, hit_zone, killed, hit_result.get("position", target.global_position), ray_direction)
			if current_weapon == "sniper":
				_cycle_sniper_bolt()
			return
	combo = 0
	if sound_enabled:
		miss_audio.play()
	if current_weapon == "sniper":
		_cycle_sniper_bolt()
	_update_hud()


func _flash_muzzle() -> void:
	muzzle_flash.position = _weapon_muzzle_position(current_weapon)
	muzzle_sparks.position = muzzle_flash.position
	muzzle_flash.visible = true
	muzzle_sparks.visible = true
	var flash_serial := shots
	await get_tree().create_timer(0.045).timeout
	if flash_serial == shots:
		muzzle_flash.visible = false
		muzzle_sparks.visible = false


func _weapon_fire_interval(weapon_id: String) -> float:
	match weapon_id:
		"pistol": return 0.22
		"sniper": return 1.35
		_: return 0.095


func _weapon_recoil_strength(weapon_id: String) -> float:
	match weapon_id:
		"pistol": return 0.075
		"sniper": return 0.16
		_: return 0.045


func _weapon_spread_multiplier(weapon_id: String) -> float:
	match weapon_id:
		"pistol": return 0.72
		"sniper": return 1.15
		_: return 1.0


func _switch_weapon(weapon_id: String) -> void:
	if not weapon_models.has(weapon_id):
		return
	trigger_held = false
	_set_scope(false)
	current_weapon = weapon_id
	for id in weapon_models:
		(weapon_models[id] as Node3D).visible = id == current_weapon
	if muzzle_flash:
		muzzle_flash.position = _weapon_muzzle_position(current_weapon)
	if muzzle_sparks:
		muzzle_sparks.position = _weapon_muzzle_position(current_weapon)
	_update_weapon_label()


func _update_weapon_label() -> void:
	if not weapon_label:
		return
	var names := {"rifle": "1  突击步枪｜自动", "pistol": "2  格洛克风格手枪｜点射", "sniper": "3  AWP 风格狙击枪｜拉栓·三倍镜"}
	weapon_label.text = names.get(current_weapon, "")


func _set_scope(enabled: bool) -> void:
	scope_active = enabled and current_weapon == "sniper" and state == GameState.PLAYING
	if camera:
		camera.fov = 24.0 if scope_active else 72.0
	if weapon_pivot:
		weapon_pivot.visible = not scope_active
	if scope_overlay:
		scope_overlay.visible = scope_active
	if red_dot:
		red_dot.visible = state == GameState.PLAYING and not scope_active


func _cycle_sniper_bolt() -> void:
	if sniper_bolting:
		return
	sniper_bolting = true
	await get_tree().create_timer(0.34).timeout
	if sound_enabled:
		bolt_audio.play()
	var kick_tween := create_tween()
	kick_tween.tween_property(weapon_pivot, "rotation:z", deg_to_rad(5.5), 0.10)
	kick_tween.tween_property(weapon_pivot, "rotation:z", WEAPON_BASE_ROTATION.z, 0.18)
	await get_tree().create_timer(0.74).timeout
	sniper_bolting = false


func _update_weapon(delta: float) -> void:
	if not weapon_pivot:
		return
	weapon_sway = weapon_sway.lerp(Vector2.ZERO, minf(1.0, delta * 9.0))
	weapon_recoil = move_toward(weapon_recoil, 0.0, delta * 0.42)
	var horizontal_speed := 0.0
	if player_body:
		horizontal_speed = Vector2(player_body.velocity.x, player_body.velocity.z).length()
	var move_ratio := clampf(horizontal_speed / WALK_SPEED, 0.0, 1.0)
	var bob_time := Time.get_ticks_msec() * 0.009
	var bob := Vector2(sin(bob_time) * 0.012, absf(cos(bob_time)) * 0.009) * move_ratio
	var idle := sin(Time.get_ticks_msec() * 0.0017) * 0.003 if state == GameState.PLAYING else 0.0
	var target_position := WEAPON_BASE_POSITION + Vector3(weapon_sway.x + bob.x, -weapon_sway.y + idle - bob.y, weapon_recoil)
	weapon_pivot.position = weapon_pivot.position.lerp(target_position, minf(1.0, delta * 18.0))
	var target_rotation := WEAPON_BASE_ROTATION + Vector3(-weapon_sway.y * 0.7 - weapon_recoil * 0.9, -weapon_sway.x * 0.8, -weapon_sway.x * 0.5 - bob.x * 0.5)
	weapon_pivot.rotation = weapon_pivot.rotation.lerp(target_rotation, minf(1.0, delta * 14.0))


func _register_target_hit(target: AimTarget, hit_zone: String, killed: bool, hit_position: Vector3 = Vector3.ZERO, hit_direction: Vector3 = Vector3.FORWARD) -> void:
	hits += 1
	combo += 1
	best_combo = maxi(best_combo, combo)
	var reaction_ms := maxi(0, Time.get_ticks_msec() - target.spawned_at_ms)
	total_reaction_ms += reaction_ms
	if best_reaction_ms == 0 or reaction_ms < best_reaction_ms:
		best_reaction_ms = reaction_ms
	var zone_score := {"head": 120, "body": 55, "limb": 35}.get(hit_zone, 40) as int
	score += zone_score + mini(120, maxi(0, combo - 1) * 5)
	if sound_enabled:
		if killed:
			break_audio.play()
		else:
			hit_audio.play()
	if not killed:
		_update_hud()
		return
	if _is_ball_mode():
		_spawn_target_fragments(hit_position, BALL_TARGET_COLOR, hit_direction)
	score += 100
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
	_respawn_target(target, new_slot, round_serial)
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
	trigger_held = false
	round_serial += 1
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	red_dot.visible = false
	weapon_label.visible = false
	_set_scope(false)
	countdown_label.visible = false
	combo_label.visible = false
	for target in targets:
		target.disable_immediately()
	var accuracy := 0.0 if shots == 0 else float(hits) / float(shots) * 100.0
	var average_reaction := 0 if hits == 0 else total_reaction_ms / hits
	var mode_name := "固定射球" if _is_ball_mode() else "人物移动"
	var target_name := "小球" if _is_ball_mode() else "人物"
	result_stats_label.text = (
		"得分  %06d\n\n" % score
		+ "命中  %d / %d     命中率  %.1f%%\n" % [hits, shots, accuracy]
		+ "最佳连中  x%d\n平均反应  %d 毫秒     最快  %d 毫秒\n\n" % [best_combo, average_reaction, best_reaction_ms]
		+ "本局参数｜%s\n距离 %.1f 米 · %s %.2f 倍 · %d 秒 · 红点 %d 像素" % [mode_name, ball_distance, target_name, ball_diameter, int(round_duration), int(red_dot_size)]
	)
	result_panel.visible = true


func _update_hud() -> void:
	var accuracy := 0.0 if shots == 0 else float(hits) / float(shots) * 100.0
	var movement_status := "固定站位" if _is_ball_mode() else ("稳定" if current_move_spread <= 0.01 else "移动散布 %.1f°" % current_move_spread)
	if is_crouching:
		movement_status += "｜蹲下"
	timer_label.text = "时间  %02d" % int(ceil(time_remaining))
	score_label.text = "得分  %06d" % score
	accuracy_label.text = "命中 %d/%d  命中率 %.1f%%  %s" % [hits, shots, accuracy, movement_status]
	combo_label.text = "连续命中  x%d" % combo
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
	label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.72))
	label.add_theme_constant_override("shadow_offset_x", 2)
	label.add_theme_constant_override("shadow_offset_y", 2)
	return label


func _make_button(text: String) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size = Vector2(0, 54)
	button.add_theme_font_size_override("font_size", 18)
	button.add_theme_color_override("font_color", Color.WHITE)
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color("d98d20")
	normal.set_corner_radius_all(8)
	var hover := normal.duplicate() as StyleBoxFlat
	hover.bg_color = Color("f0aa35")
	var pressed := normal.duplicate() as StyleBoxFlat
	pressed.bg_color = Color("ad6913")
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", pressed)
	button.add_theme_stylebox_override("focus", hover)
	return button


func _make_secondary_button(text: String) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size = Vector2(0, 48)
	button.add_theme_font_size_override("font_size", 16)
	button.add_theme_color_override("font_color", Color("dce3ea"))
	var style := StyleBoxFlat.new()
	style.bg_color = Color("303943")
	style.border_color = Color("7c858b")
	style.set_border_width_all(1)
	style.set_corner_radius_all(8)
	button.add_theme_stylebox_override("normal", style)
	var hover := style.duplicate() as StyleBoxFlat
	hover.bg_color = Color("414c57")
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("focus", hover)
	return button


func _make_mode_button(text: String, group: ButtonGroup) -> Button:
	var button := _make_secondary_button(text)
	button.toggle_mode = true
	button.button_group = group
	button.custom_minimum_size = Vector2(0, 44)
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var selected := StyleBoxFlat.new()
	selected.bg_color = Color("b8791f")
	selected.border_color = Color("ffd23f")
	selected.set_border_width_all(2)
	selected.set_corner_radius_all(8)
	button.add_theme_stylebox_override("pressed", selected)
	button.add_theme_stylebox_override("hover_pressed", selected)
	return button


func _create_center_panel(parent: Control, panel_size: Vector2) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_CENTER)
	panel.position = -panel_size * 0.5
	panel.size = panel_size
	panel.mouse_filter = Control.MOUSE_FILTER_STOP
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.075, 0.09, 0.105, 0.965)
	style.border_color = Color("d98d20")
	style.set_border_width_all(1)
	style.set_corner_radius_all(16)
	style.content_margin_left = 28
	style.content_margin_right = 28
	style.content_margin_top = 22
	style.content_margin_bottom = 20
	panel.add_theme_stylebox_override("panel", style)
	parent.add_child(panel)
	return panel


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


func _make_body_fall_sound() -> AudioStreamWAV:
	var mix_rate := 44100
	var duration := 0.24
	var sample_count := int(duration * mix_rate)
	var audio_data := PackedByteArray()
	audio_data.resize(sample_count * 2)
	var sound_rng := RandomNumberGenerator.new()
	sound_rng.seed = 82471
	for index in range(sample_count):
		var time := float(index) / float(mix_rate)
		var progress := time / duration
		var envelope := pow(1.0 - progress, 4.2)
		var noise := sound_rng.randf_range(-1.0, 1.0)
		var low_thump := sin(TAU * 74.0 * time) * 0.62 + sin(TAU * 118.0 * time) * 0.22
		var cloth_impact := noise * 0.16 * pow(1.0 - progress, 7.0)
		var value := (low_thump + cloth_impact) * envelope
		var sample := int(clampf(value, -1.0, 1.0) * 32767.0)
		audio_data[index * 2] = sample & 0xff
		audio_data[index * 2 + 1] = (sample >> 8) & 0xff
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = mix_rate
	stream.stereo = false
	stream.data = audio_data
	return stream
