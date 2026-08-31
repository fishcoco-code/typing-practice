extends SceneTree

var failed := false


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	var main_scene := load("res://scenes/main.tscn") as PackedScene
	var game := main_scene.instantiate()
	root.add_child(game)
	await process_frame
	game.sound_enabled = false
	game._set_training_mode("humanoid", false)

	_check(game.spawn_positions.size() == 12, "应存在 12 个刷新点")
	_check(game.targets.size() == 9, "应同时存在 9 个人形靶")
	_check(game.occupied_slots.size() == 9, "9 个刷新点应被占用")
	_check(_all_target_slots_unique(game), "初始刷新点不能重复")
	_check(game.weapon_models.size() == 3, "应加载三把武器模型")
	_check(game.weapon_models.has("rifle") and game.weapon_models.has("pistol") and game.weapon_models.has("sniper"), "武器模型键应完整")
	_check(game.player_body != null, "应创建可移动人物")
	_check(game.scope_overlay != null, "狙击镜界面应创建")
	_check(is_equal_approx(game._movement_spread_degrees(0.0, false), 0.0), "静止时散布应为零")
	_check(game._movement_spread_degrees(5.0, false) > 0.0, "移动时应增加散布")
	_check(game._movement_spread_degrees(5.0, true) < game._movement_spread_degrees(5.0, false), "蹲下移动散布应更小")

	game.is_crouching = true
	game._update_crouch(1.0)
	_check(is_equal_approx(game.player_capsule.height, 1.2), "蹲下应降低碰撞体")
	_check(is_equal_approx(game.current_camera_height, 1.05), "蹲下应降低镜头")
	game._reset_player()

	game._on_setting_changed("ball_distance", 40.0)
	_check(is_equal_approx(game.spawn_positions[0].z, -43.0), "距离设置应重建人形靶位置")
	game._on_setting_changed("ball_diameter", 0.75)
	_check(is_equal_approx(game.targets[0].target_scale, 0.75), "人物大小设置应缩放模型和碰撞区")
	game._on_setting_changed("round_duration", 30.0)
	game._reset_stats()
	_check(is_equal_approx(game.time_remaining, 30.0), "一局时长应控制计时器")
	game._on_setting_changed("red_dot_size", 14.0)
	_check(is_equal_approx(game.red_dot.dot_diameter, 14.0), "红点大小设置应立即生效")
	game._reset_settings()

	var rifle_base_scale: Vector3 = game.weapon_base_scales["rifle"]
	game._set_training_mode("ball", false)
	_check(game._is_ball_mode(), "应能切换到固定射球模式")
	_check(not game.arms_container.visible, "固定射球模式应隐藏手臂")
	_check(game._get_movement_input() == Vector2.ZERO, "固定射球模式应锁定人物移动")
	_check(game.weapon_models["rifle"].scale.is_equal_approx(rifle_base_scale * 1.42), "固定射球模式应放大枪身")
	_check(game.targets[0].target_mode == "ball", "固定射球模式应使用球体目标")
	_check(game.targets[0].target_color.is_equal_approx(Color("ffd21f")), "训练小球应为黄色")
	var ball_target: AimTarget = game.targets[0]
	ball_target.show_at(game.spawn_positions[ball_target.spawn_slot], ball_target.spawn_slot, false)
	_check(ball_target.register_weapon_hit("body", "rifle"), "黄色小球应命中一枪后消失")
	game._set_training_mode("humanoid", false)
	_check(game.arms_container.visible, "人物移动模式应恢复手臂")
	_check(game.weapon_models["rifle"].scale.is_equal_approx(rifle_base_scale), "人物移动模式应恢复枪身大小")

	var shots_before_fire: int = game.shots
	game._switch_weapon("rifle")
	game._shoot()
	_check(game.shots == shots_before_fire + 1, "步枪应发射一发")
	_check(is_equal_approx(game.fire_cooldown, 0.095), "步枪应使用自动射击间隔")
	game._switch_weapon("pistol")
	game.fire_cooldown = 0.0
	game._shoot()
	_check(is_equal_approx(game.fire_cooldown, 0.22), "手枪应使用点射间隔")
	game._switch_weapon("sniper")
	game.fire_cooldown = 0.0
	game._shoot()
	_check(game.sniper_bolting, "狙击枪开火后应进入拉栓状态")
	game.sniper_bolting = false

	game.round_serial += 1
	game.state = 2
	game._switch_weapon("sniper")
	game._set_scope(true)
	_check(game.scope_active and is_equal_approx(game.camera.fov, 24.0), "狙击枪应开启三倍镜")
	game._switch_weapon("rifle")
	_check(not game.scope_active and is_equal_approx(game.camera.fov, 72.0), "切换武器应退出瞄准镜")
	game.shots = 1
	var target: AimTarget = game.targets[0]
	target.show_at(game.spawn_positions[target.spawn_slot], target.spawn_slot, false)
	_check(not target.register_weapon_hit("body", "rifle"), "步枪命中身体一枪不应倒地")
	_check(not target.register_weapon_hit("body", "rifle"), "步枪命中身体两枪不应倒地")
	_check(not target.register_weapon_hit("body", "rifle"), "步枪命中身体三枪不应倒地")
	_check(target.register_weapon_hit("body", "rifle"), "步枪命中身体四枪应倒地")
	var old_slot: int = target.spawn_slot
	game._register_target_hit(target, "body", true)
	_check(game.hits == 1, "命中计数应增加")
	_check(game.occupied_slots.size() == 9, "倒地后应立即预留新刷新点")
	_check(target.spawn_slot != old_slot, "倒地后不应立即回到原刷新点")
	_check(_all_target_slots_unique(game), "预留刷新点不能重复")

	var head_target: AimTarget = game.targets[1]
	head_target.show_at(game.spawn_positions[head_target.spawn_slot], head_target.spawn_slot, false)
	_check(head_target.register_weapon_hit("head", "pistol"), "手枪爆头应一枪倒地")
	var limb_target: AimTarget = game.targets[2]
	limb_target.show_at(game.spawn_positions[limb_target.spawn_slot], limb_target.spawn_slot, false)
	_check(not limb_target.register_weapon_hit("limb", "sniper"), "狙击枪命中四肢一枪不应倒地")
	_check(limb_target.register_weapon_hit("limb", "sniper"), "狙击枪命中四肢两枪应倒地")

	await create_timer(0.7).timeout
	_check(target.is_active, "倒地目标应在延迟后刷新")
	for player in game.weapon_audio_players.values():
		(player as AudioStreamPlayer).stop()
	game.bolt_audio.stop()
	game.break_audio.stop()
	game.hit_audio.stop()
	game.miss_audio.stop()
	game.start_audio.stop()
	game.queue_free()
	await process_frame

	if failed:
		quit(1)
	else:
		print("射击训练场自动测试通过")
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
	push_error("自动测试：" + message)
