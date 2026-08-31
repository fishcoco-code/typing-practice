class_name TargetFragment
extends MeshInstance3D

var velocity := Vector3.ZERO
var spin := Vector3.ZERO
var lifetime := 0.0
var fragment_material: StandardMaterial3D


func configure() -> void:
	var box := BoxMesh.new()
	box.size = Vector3(0.24, 0.18, 0.12)
	fragment_material = StandardMaterial3D.new()
	fragment_material.roughness = 0.48
	fragment_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	box.material = fragment_material
	mesh = box
	cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	visible = false


func launch(origin: Vector3, color: Color, hit_direction: Vector3, random: RandomNumberGenerator) -> void:
	global_position = origin + Vector3(
		random.randf_range(-0.16, 0.16),
		random.randf_range(-0.16, 0.16),
		random.randf_range(-0.16, 0.16)
	)
	rotation = Vector3(
		random.randf_range(0.0, TAU),
		random.randf_range(0.0, TAU),
		random.randf_range(0.0, TAU)
	)
	scale = Vector3(
		random.randf_range(0.55, 1.25),
		random.randf_range(0.55, 1.35),
		random.randf_range(0.5, 1.15)
	)
	var scatter := Vector3(
		random.randf_range(-1.0, 1.0),
		random.randf_range(-0.2, 1.25),
		random.randf_range(-1.0, 1.0)
	).normalized()
	velocity = scatter * random.randf_range(2.2, 5.2) + hit_direction * random.randf_range(0.8, 2.0)
	spin = Vector3(
		random.randf_range(-9.0, 9.0),
		random.randf_range(-9.0, 9.0),
		random.randf_range(-9.0, 9.0)
	)
	lifetime = random.randf_range(0.75, 1.15)
	fragment_material.albedo_color = color
	fragment_material.emission_enabled = true
	fragment_material.emission = color.lerp(Color.WHITE, 0.08)
	fragment_material.emission_energy_multiplier = 0.35
	visible = true


func update_fragment(delta: float) -> void:
	if not visible:
		return
	lifetime -= delta
	if lifetime <= 0.0:
		visible = false
		return
	velocity.y -= 8.4 * delta
	global_position += velocity * delta
	rotation += spin * delta
	if global_position.y < 0.08:
		global_position.y = 0.08
		velocity.y = absf(velocity.y) * 0.28
		velocity.x *= 0.7
		velocity.z *= 0.7
	var color := fragment_material.albedo_color
	color.a = clampf(lifetime * 2.5, 0.0, 1.0)
	fragment_material.albedo_color = color


func stop() -> void:
	visible = false
	lifetime = 0.0
