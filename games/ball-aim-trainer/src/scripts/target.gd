class_name AimTarget
extends Node3D

const MAX_HEALTH := 4

var target_id: int = -1
var spawn_slot: int = -1
var spawned_at_ms: int = 0
var is_active := false
var target_scale := 1.0
var target_color := Color("34495e")
var health := MAX_HEALTH
var last_hit_zone := "body"

var _visual_root: Node3D
var _hit_areas: Array[Area3D] = []
var _visual_tween: Tween


func _ready() -> void:
	_build_humanoid()


func setup(id: int, color: Color) -> void:
	target_id = id
	target_color = color.darkened(0.35)
	_apply_character_colors()
	disable_immediately()


func set_target_scale(value: float) -> void:
	target_scale = clampf(value, 0.55, 1.55)
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
	_set_hit_areas_enabled(true)
	scale = Vector3.ONE * target_scale


func reserve_slot(slot: int) -> void:
	spawn_slot = slot


func mark_spawn_time() -> void:
	spawned_at_ms = Time.get_ticks_msec()


func register_weapon_hit(hit_zone: String, weapon_id: String) -> bool:
	if not is_active:
		return false
	last_hit_zone = hit_zone
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


func _build_humanoid() -> void:
	_visual_root = Node3D.new()
	_visual_root.name = "人物模型"
	add_child(_visual_root)
	_add_sphere_part("头部", Vector3(0, 1.68, 0), 0.20, "head", Color("d5a27e"))
	_add_box_part("躯干", Vector3(0, 1.15, 0), Vector3(0.58, 0.72, 0.30), "body", target_color)
	_add_box_part("左臂", Vector3(-0.39, 1.16, 0), Vector3(0.17, 0.72, 0.20), "limb", Color("293746"))
	_add_box_part("右臂", Vector3(0.39, 1.16, 0), Vector3(0.17, 0.72, 0.20), "limb", Color("293746"))
	_add_box_part("左腿", Vector3(-0.17, 0.46, 0), Vector3(0.23, 0.82, 0.25), "limb", Color("202a35"))
	_add_box_part("右腿", Vector3(0.17, 0.46, 0), Vector3(0.23, 0.82, 0.25), "limb", Color("202a35"))


func _add_sphere_part(part_name: String, part_position: Vector3, radius: float, hit_zone: String, color: Color) -> void:
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2.0
	mesh.radial_segments = 16
	mesh.rings = 8
	_add_mesh_with_outline(part_name, mesh, part_position, color)
	var shape := SphereShape3D.new()
	shape.radius = radius
	_add_hit_area(part_name, shape, part_position, hit_zone)


func _add_box_part(part_name: String, part_position: Vector3, part_size: Vector3, hit_zone: String, color: Color) -> void:
	var mesh := BoxMesh.new()
	mesh.size = part_size
	_add_mesh_with_outline(part_name, mesh, part_position, color)
	var shape := BoxShape3D.new()
	shape.size = part_size
	_add_hit_area(part_name, shape, part_position, hit_zone)


func _add_mesh_with_outline(part_name: String, part_mesh: Mesh, part_position: Vector3, color: Color) -> void:
	var base := MeshInstance3D.new()
	base.name = part_name
	base.mesh = part_mesh
	base.position = part_position
	base.material_override = _make_material(color)
	_visual_root.add_child(base)
	var outline := MeshInstance3D.new()
	outline.name = part_name + "_黄色描边"
	outline.mesh = part_mesh
	outline.position = part_position
	outline.scale = Vector3.ONE * 1.065
	var outline_material := _make_material(Color("ffd400"), true)
	outline_material.cull_mode = BaseMaterial3D.CULL_FRONT
	outline.material_override = outline_material
	_visual_root.add_child(outline)


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


func _make_material(color: Color, unshaded: bool = false) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.roughness = 0.78
	if unshaded:
		material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	return material


func _apply_character_colors() -> void:
	if not _visual_root:
		return
	var torso := _visual_root.get_node_or_null("躯干") as MeshInstance3D
	if torso:
		torso.material_override = _make_material(target_color)


func _set_hit_areas_enabled(enabled: bool) -> void:
	for area in _hit_areas:
		area.monitorable = enabled
		area.collision_layer = 2 if enabled else 0


func _flash_hit() -> void:
	if not _visual_root:
		return
	var tween := create_tween()
	tween.tween_property(_visual_root, "scale", Vector3.ONE * 1.06, 0.045)
	tween.tween_property(_visual_root, "scale", Vector3.ONE, 0.075)


func _play_fall() -> void:
	_kill_tween()
	_visual_tween = create_tween()
	_visual_tween.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	var fall_direction := -1.0 if target_id % 2 == 0 else 1.0
	_visual_tween.tween_property(self, "rotation:z", deg_to_rad(84.0) * fall_direction, 0.32)
	_visual_tween.parallel().tween_property(self, "position:y", global_position.y + 0.08, 0.32)
	_visual_tween.tween_interval(0.08)
	_visual_tween.tween_callback(func() -> void: visible = false)


func _kill_tween() -> void:
	if _visual_tween and _visual_tween.is_valid():
		_visual_tween.kill()
	_visual_tween = null
