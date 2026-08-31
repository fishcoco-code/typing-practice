class_name AimTarget
extends Node3D

const MAX_HEALTH := 4
const MODE_HUMANOID := "humanoid"
const MODE_BALL := "ball"
const BALL_COLOR := Color("ffd21f")
const SWAT_SCENE := preload("res://assets/characters/quaternius-modular-men/Swat.gltf")
const WORKER_SCENE := preload("res://assets/characters/quaternius-modular-men/Worker.gltf")
const HOODIE_SCENE := preload("res://assets/characters/quaternius-modular-men/Casual_Hoodie.gltf")

var target_id: int = -1
var spawn_slot: int = -1
var spawned_at_ms: int = 0
var is_active := false
var target_scale := 1.0
var target_color := Color("34495e")
var target_mode := MODE_HUMANOID
var health := MAX_HEALTH
var last_hit_zone := "body"

var _visual_root: Node3D
var _character: Node3D
var _animation_player: AnimationPlayer
var _hit_areas: Array[Area3D] = []
var _visual_tween: Tween


func _ready() -> void:
	_visual_root = Node3D.new()
	_visual_root.name = "人物模型"
	add_child(_visual_root)


func setup(id: int, color: Color, mode: String = MODE_HUMANOID) -> void:
	target_id = id
	configure_mode(mode, color)


func configure_mode(mode: String, humanoid_color: Color = Color("34495e")) -> void:
	var next_mode := MODE_BALL if mode == MODE_BALL else MODE_HUMANOID
	disable_immediately()
	_clear_visual_and_hit_areas()
	target_mode = next_mode
	if target_mode == MODE_BALL:
		target_color = BALL_COLOR
		_visual_root.name = "黄色小球模型"
		_create_ball()
		_build_ball_hit_area()
	else:
		target_color = humanoid_color
		_visual_root.name = "人物模型"
		_create_character()
		_build_humanoid_hit_areas()
	disable_immediately()


func set_target_scale(value: float) -> void:
	target_scale = clampf(value, 0.30, 2.00) if target_mode == MODE_BALL else clampf(value, 0.55, 1.55)
	if is_active:
		scale = Vector3.ONE * target_scale


func show_at(world_position: Vector3, slot: int, animate: bool = true) -> void:
	_kill_tween()
	global_position = world_position
	spawn_slot = slot
	spawned_at_ms = Time.get_ticks_msec()
	health = MAX_HEALTH
	is_active = true
	visible = true
	rotation = Vector3.ZERO
	_visual_root.position = Vector3.ZERO
	_visual_root.rotation = Vector3.ZERO
	_visual_root.scale = Vector3.ONE
	_set_hit_areas_enabled(true)
	scale = Vector3.ONE * target_scale
	_play_idle()


func reserve_slot(slot: int) -> void:
	spawn_slot = slot


func mark_spawn_time() -> void:
	spawned_at_ms = Time.get_ticks_msec()


func register_weapon_hit(hit_zone: String, weapon_id: String) -> bool:
	if not is_active:
		return false
	last_hit_zone = hit_zone
	if target_mode == MODE_BALL:
		health = 0
		is_active = false
		_set_hit_areas_enabled(false)
		_play_fall()
		return true
	var damage := 1
	if weapon_id == "sniper":
		damage = 2 if hit_zone == "limb" else MAX_HEALTH
	elif hit_zone == "head":
		damage = MAX_HEALTH
	health -= damage
	_flash_hit()
	if health > 0:
		return false
	is_active = false
	_set_hit_areas_enabled(false)
	_play_fall()
	return true


func disable_immediately() -> void:
	_kill_tween()
	is_active = false
	_set_hit_areas_enabled(false)
	visible = false
	rotation = Vector3.ZERO
	scale = Vector3.ONE * target_scale
	if _visual_root:
		_visual_root.position = Vector3.ZERO
		_visual_root.rotation = Vector3.ZERO
		_visual_root.scale = Vector3.ONE


func _create_character() -> void:
	var character_scenes: Array[PackedScene] = [SWAT_SCENE, WORKER_SCENE, HOODIE_SCENE]
	_character = character_scenes[target_id % character_scenes.size()].instantiate() as Node3D
	_character.name = ["特警", "工业工人", "连帽训练员"][target_id % 3]
	# Quaternius 人物默认面向 +Z；靶场玩家位于它们的 +Z 方向。
	_character.rotation_degrees.y = 0.0
	_visual_root.add_child(_character)
	_animation_player = _find_animation_player(_character)
	_apply_yellow_outline(_character)


func _create_ball() -> void:
	var ball := MeshInstance3D.new()
	ball.name = "黄色训练球"
	var sphere := SphereMesh.new()
	sphere.radius = 0.5
	sphere.height = 1.0
	sphere.radial_segments = 32
	sphere.rings = 18
	var material := StandardMaterial3D.new()
	material.resource_name = "高可见黄色球体"
	material.albedo_color = BALL_COLOR
	material.metallic = 0.08
	material.roughness = 0.24
	material.emission_enabled = true
	material.emission = Color("ffb900")
	material.emission_energy_multiplier = 0.22
	sphere.material = material
	ball.mesh = sphere
	ball.position = Vector3(0.0, 1.25, 0.0)
	ball.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	var outline := ShaderMaterial.new()
	var shader := Shader.new()
	shader.code = "shader_type spatial;\nrender_mode unshaded, cull_front;\nvoid vertex() { VERTEX += NORMAL * 0.025; }\nvoid fragment() { ALBEDO = vec3(0.20, 0.14, 0.01); }"
	outline.shader = shader
	ball.material_overlay = outline
	_visual_root.add_child(ball)
	_character = ball
	_animation_player = null


func _build_humanoid_hit_areas() -> void:
	_add_hit_sphere("头部", Vector3(0, 1.68, 0), 0.20, "head")
	_add_hit_box("胸腹", Vector3(0, 1.15, 0), Vector3(0.58, 0.72, 0.34), "body")
	_add_hit_box("左臂", Vector3(-0.39, 1.16, 0), Vector3(0.18, 0.74, 0.22), "limb")
	_add_hit_box("右臂", Vector3(0.39, 1.16, 0), Vector3(0.18, 0.74, 0.22), "limb")
	_add_hit_box("左腿", Vector3(-0.17, 0.46, 0), Vector3(0.24, 0.86, 0.28), "limb")
	_add_hit_box("右腿", Vector3(0.17, 0.46, 0), Vector3(0.24, 0.86, 0.28), "limb")


func _build_ball_hit_area() -> void:
	_add_hit_sphere("黄色小球", Vector3(0.0, 1.25, 0.0), 0.5, "body")


func _clear_visual_and_hit_areas() -> void:
	_animation_player = null
	_character = null
	if _visual_root:
		for child in _visual_root.get_children():
			_visual_root.remove_child(child)
			child.queue_free()
	for area in _hit_areas:
		area.collision_layer = 0
		area.monitorable = false
		if area.get_parent():
			area.get_parent().remove_child(area)
		area.queue_free()
	_hit_areas.clear()


func _add_hit_sphere(part_name: String, part_position: Vector3, radius: float, hit_zone: String) -> void:
	var shape := SphereShape3D.new()
	shape.radius = radius
	_add_hit_area(part_name, shape, part_position, hit_zone)


func _add_hit_box(part_name: String, part_position: Vector3, part_size: Vector3, hit_zone: String) -> void:
	var shape := BoxShape3D.new()
	shape.size = part_size
	_add_hit_area(part_name, shape, part_position, hit_zone)


func _add_hit_area(part_name: String, shape: Shape3D, part_position: Vector3, hit_zone: String) -> void:
	var area := Area3D.new()
	area.name = part_name + "判定"
	area.collision_layer = 2
	area.collision_mask = 0
	area.monitoring = false
	area.monitorable = true
	area.set_meta("target", self)
	area.set_meta("hit_zone", hit_zone)
	area.position = part_position
	var collision := CollisionShape3D.new()
	collision.shape = shape
	area.add_child(collision)
	add_child(area)
	_hit_areas.append(area)


func _find_animation_player(node: Node) -> AnimationPlayer:
	if node is AnimationPlayer:
		return node as AnimationPlayer
	for child in node.get_children():
		var found := _find_animation_player(child)
		if found:
			return found
	return null


func _apply_yellow_outline(node: Node) -> void:
	if node is MeshInstance3D:
		var outline := ShaderMaterial.new()
		outline.resource_name = "工业警示黄描边"
		var shader := Shader.new()
		shader.code = "shader_type spatial;\nrender_mode unshaded, cull_front;\nvoid vertex() { VERTEX += NORMAL * 0.014; }\nvoid fragment() { ALBEDO = vec3(1.0, 0.67, 0.05); EMISSION = vec3(1.0, 0.48, 0.015) * 0.75; }"
		outline.shader = shader
		(node as MeshInstance3D).material_overlay = outline
	for child in node.get_children():
		_apply_yellow_outline(child)


func _set_hit_areas_enabled(enabled: bool) -> void:
	for area in _hit_areas:
		area.monitorable = enabled
		area.collision_layer = 2 if enabled else 0


func _flash_hit() -> void:
	if not _visual_root:
		return
	var tween := create_tween()
	tween.tween_property(_visual_root, "scale", Vector3.ONE * 1.045, 0.04)
	tween.tween_property(_visual_root, "scale", Vector3.ONE, 0.07)


func _play_idle() -> void:
	if not _animation_player:
		return
	var idle_name := _find_animation_name("Idle_Neutral")
	if idle_name != StringName():
		_animation_player.play(idle_name)
		_animation_player.seek(fmod(float(target_id) * 0.37, 1.0), true)


func _play_fall() -> void:
	_kill_tween()
	if target_mode == MODE_BALL:
		_visual_tween = create_tween()
		_visual_tween.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		_visual_tween.tween_property(_visual_root, "scale", Vector3.ONE * 1.18, 0.055)
		_visual_tween.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
		_visual_tween.tween_property(_visual_root, "scale", Vector3.ZERO, 0.16)
		return
	# 素材自带的 Death 动画包含过强的根骨位移，会让人物钻入地面。
	# 以脚底为轴做向后倒地，保持身体完整可见，刷新时由 show_at 复位。
	if _animation_player:
		_animation_player.stop()
	_visual_tween = create_tween()
	_visual_tween.set_trans(Tween.TRANS_QUINT).set_ease(Tween.EASE_IN)
	_visual_tween.tween_property(_visual_root, "rotation:x", deg_to_rad(-84.0), 0.42)
	_visual_tween.parallel().tween_property(_visual_root, "position", Vector3(0.0, 0.025, -0.18), 0.42)


func _find_animation_name(suffix: String) -> StringName:
	if not _animation_player:
		return StringName()
	for animation_name in _animation_player.get_animation_list():
		if String(animation_name).ends_with(suffix):
			return animation_name
	return StringName()


func _kill_tween() -> void:
	if _visual_tween and _visual_tween.is_valid():
		_visual_tween.kill()
	_visual_tween = null
