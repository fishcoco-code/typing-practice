class_name AimTarget
extends Area3D

var target_id: int = -1
var spawn_slot: int = -1
var spawned_at_ms: int = 0
var is_active: bool = false

@onready var mesh_instance: MeshInstance3D = $Mesh

var _visual_tween: Tween


func setup(id: int, color: Color) -> void:
	target_id = id
	var source_material := mesh_instance.get_active_material(0)
	var target_material := source_material.duplicate() as StandardMaterial3D
	target_material.albedo_color = color
	target_material.emission = color.lerp(Color.WHITE, 0.12)
	mesh_instance.material_override = target_material
	disable_immediately()


func show_at(world_position: Vector3, slot: int, animate: bool = true) -> void:
	_kill_tween()
	global_position = world_position
	spawn_slot = slot
	spawned_at_ms = Time.get_ticks_msec()
	is_active = true
	visible = true
	monitoring = true
	rotation = Vector3.ZERO

	if animate:
		scale = Vector3.ONE * 0.08
		_visual_tween = create_tween()
		_visual_tween.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		_visual_tween.tween_property(self, "scale", Vector3.ONE, 0.2)
	else:
		scale = Vector3.ONE


func reserve_slot(slot: int) -> void:
	spawn_slot = slot


func mark_spawn_time() -> void:
	spawned_at_ms = Time.get_ticks_msec()


func register_hit() -> bool:
	if not is_active:
		return false

	is_active = false
	monitoring = false
	_kill_tween()
	_visual_tween = create_tween()
	_visual_tween.set_parallel(true)
	_visual_tween.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	_visual_tween.tween_property(self, "scale", Vector3.ONE * 0.03, 0.12)
	_visual_tween.tween_property(self, "rotation", Vector3(0.7, 1.2, 0.4), 0.12)
	_visual_tween.set_parallel(false)
	_visual_tween.tween_callback(func() -> void: visible = false)
	return true


func disable_immediately() -> void:
	_kill_tween()
	is_active = false
	monitoring = false
	visible = false
	scale = Vector3.ONE


func _kill_tween() -> void:
	if _visual_tween and _visual_tween.is_valid():
		_visual_tween.kill()
	_visual_tween = null
