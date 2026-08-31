extends SceneTree

var failed := false


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	var main_scene := load("res://scenes/main.tscn") as PackedScene
	var game := main_scene.instantiate()
	root.add_child(game)
	await process_frame

	_check(game.spawn_positions.size() == 12, "expected 12 spawn positions")
	_check(game.targets.size() == 9, "expected 9 pooled targets")
	_check(game.occupied_slots.size() == 9, "expected 9 occupied slots")
	_check(_all_target_slots_unique(game), "initial target slots must be unique")

	game.round_serial += 1
	game.state = 2
	game.shots = 1
	var target = game.targets[0]
	var old_slot: int = target.spawn_slot
	_check(target.register_hit(), "active target should accept a hit")
	game._register_target_hit(target)

	_check(game.hits == 1, "hit counter should increment")
	_check(game.score == 100, "first hit should award 100 points")
	_check(game.combo == 1, "first hit should start a streak")
	_check(game.occupied_slots.size() == 9, "a respawn slot should be reserved immediately")
	_check(target.spawn_slot != old_slot, "target should not respawn in the slot it just left")
	_check(_all_target_slots_unique(game), "reserved target slots must remain unique")

	await create_timer(0.3).timeout
	_check(target.is_active, "target should reactivate after respawn delay")
	_check(target.visible, "respawned target should be visible")

	if failed:
		quit(1)
	else:
		print("BALL_AIM_SELF_TEST_PASS")
		quit(0)


func _all_target_slots_unique(game: Node) -> bool:
	var used_slots: Dictionary = {}
	for target in game.targets:
		if used_slots.has(target.spawn_slot):
			return false
		used_slots[target.spawn_slot] = true
	return used_slots.size() == game.targets.size()


func _check(condition: bool, message: String) -> void:
	if condition:
		return
	failed = true
	push_error("SELF TEST: " + message)
