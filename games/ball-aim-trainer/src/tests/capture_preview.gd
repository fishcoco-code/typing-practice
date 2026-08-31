extends SceneTree

func _initialize() -> void:
	call_deferred("_capture")

func _capture() -> void:
	var game := (load("res://scenes/main.tscn") as PackedScene).instantiate()
	root.add_child(game)
	await process_frame
	game.state = 2
	game.start_panel.visible = false
	game.result_panel.visible = false
	game.red_dot.visible = true
	game.weapon_label.visible = true
	game.weapon_pivot.visible = true
	game._reset_player()
	var requested_weapon := "rifle"
	if not OS.get_cmdline_user_args().is_empty():
		requested_weapon = OS.get_cmdline_user_args()[0]
	game._switch_weapon(requested_weapon)
	if OS.get_cmdline_user_args().size() > 1 and OS.get_cmdline_user_args()[1] == "flash":
		game.muzzle_flash.visible = true
		game.muzzle_sparks.visible = true
	game._place_initial_targets()
	game._update_hud()
	await create_timer(0.5).timeout
	await process_frame
	var image := root.get_viewport().get_texture().get_image()
	image.save_png("res://tests/preview.png")
	quit()
