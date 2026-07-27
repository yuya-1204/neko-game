extends SceneTree


var failures: Array[String] = []


func _init() -> void:
	call_deferred("_run")


func _run() -> void:
	var scene := load("res://main.tscn") as PackedScene
	var game = scene.instantiate()
	root.add_child(game)
	await process_frame
	await process_frame

	_expect(game.state == game.RaceState.TITLE, "The operation guide must appear before the race starts.")
	_expect(game.title_overlay.visible, "The operation guide must be visible after loading.")
	_expect(not game.countdown_label.visible, "The countdown must stay hidden until Start is pressed.")
	_expect(not game.player.active, "The kart must stay inactive on the operation guide.")
	_expect(game.stage_buttons.size() == 3, "The operation guide must offer three stages.")
	_expect(game.selected_stage == 0, "The simple course must be selected first.")
	_expect(game.course.stage_id == 0, "The first stage must use the simple course.")
	_expect(game.course.branches.is_empty(), "The simple course must not have a branch.")
	_expect(game.left_steering_area.mouse_filter == Control.MOUSE_FILTER_IGNORE, "Left steering visual must not consume touches.")
	_expect(game.right_steering_area.mouse_filter == Control.MOUSE_FILTER_IGNORE, "Right steering visual must not consume touches.")
	_expect(game.left_drift_area.mouse_filter == Control.MOUSE_FILTER_IGNORE, "Left drift visual must not consume touches.")
	_expect(game.right_drift_area.mouse_filter == Control.MOUSE_FILTER_IGNORE, "Right drift visual must not consume touches.")

	_send_touch(game, 0, Vector2(900, 300), true)
	_expect(not game.player.touch_right, "The operation guide must block steering before Start.")
	_send_touch(game, 0, Vector2(900, 300), false)

	game.stage_buttons[1].pressed.emit()
	_expect(game.selected_stage == 1, "The second stage must be selectable.")
	_expect(game.course.stage_id == 1, "The second stage must use the gourd course.")
	_expect(game.course.stage_name == "ひょうたんコース", "The second stage must be labeled as the gourd course.")
	_expect(game.course.branches.is_empty(), "The gourd course must remain a single loop.")
	_expect(game.state == game.RaceState.TITLE, "Selecting a stage must not start the race.")
	_expect(game.player.course == game.course, "The player must use the selected course model.")
	for ai in game.ai_karts:
		_expect(ai.course == game.course, "Every AI kart must use the selected course model.")

	game.stage_buttons[2].pressed.emit()
	_expect(game.selected_stage == 2, "The third stage must be selectable.")
	_expect(game.course.stage_id == 2, "The third stage must use the branching course.")
	_expect(game.course.branches.size() == 1, "The third stage must have a selectable branch.")
	var obstacle_count := 0
	for node in game.stage_root.get_children():
		if node is StaticBody3D and node.name.begins_with("Obstacle"):
			obstacle_count += 1
			_expect(
				node.find_child("*", true, false) != null,
				"Every obstacle must have visible or collision children."
			)
			var collision_shapes: Array[Node] = node.find_children(
				"*",
				"CollisionShape3D",
				true,
				false
			)
			_expect(collision_shapes.size() == 1, "Every obstacle must have one collision shape.")
	_expect(obstacle_count >= 4, "The third stage must contain visible collision obstacles.")
	var ground_material := game.get_node("GrassGround").material_override as StandardMaterial3D
	var ground_color: Color = ground_material.albedo_color
	_expect(
		ground_color.r > ground_color.g
		and ground_color.g > ground_color.b
		and ground_color.r - ground_color.g < 0.16,
		"The course ground must use a balanced brown palette rather than strong red."
	)

	game.start_button.pressed.emit()
	_expect(game.state == game.RaceState.COUNTDOWN, "Start must begin the countdown.")
	_expect(not game.title_overlay.visible, "The operation guide must close after Start.")
	_expect(game.countdown_label.visible, "The countdown must appear after Start.")

	_send_touch(game, 1, Vector2(900, 300), true)
	_send_touch(game, 2, Vector2(100, 620), true)
	_expect(game.player.touch_right, "Right steering must stay pressed.")
	_expect(not game.player.touch_left, "Right steering must not activate left steering.")
	_expect(game.player.touch_drift_left, "Left drift must work while right steering is held.")
	_expect(game.player._read_drift(), "Right steering plus the opposite left drift button must enable drift.")
	_expect(game.active_touches.size() == 2, "Two fingers must be tracked independently.")

	_send_touch(game, 2, Vector2(100, 620), false)
	_expect(game.player.touch_right, "Releasing drift must not release right steering.")
	_expect(not game.player.touch_drift_left, "Released drift must clear.")
	_send_touch(game, 1, Vector2(900, 300), false)
	_expect(not game.player.touch_right, "Released right steering must clear.")

	_send_touch(game, 3, Vector2(300, 300), true)
	_send_touch(game, 4, Vector2(1100, 620), true)
	_expect(game.player.touch_left, "Left steering must stay pressed.")
	_expect(not game.player.touch_right, "Left steering must not activate right steering.")
	_expect(game.player.touch_drift_right, "Right drift must work while left steering is held.")
	_expect(game.player._read_drift(), "Left steering plus the opposite right drift button must enable drift.")
	_send_touch(game, 4, Vector2(1100, 620), false)
	_send_touch(game, 3, Vector2(300, 300), false)

	_send_touch(game, 6, Vector2(900, 300), true)
	_send_touch(game, 7, Vector2(1100, 620), true)
	_expect(not game.player._read_drift(), "Right steering plus the same-side drift button must not enable drift.")
	_send_touch(game, 7, Vector2(1100, 620), false)
	_send_touch(game, 6, Vector2(900, 300), false)

	_send_touch(game, 8, Vector2(300, 300), true)
	_send_touch(game, 9, Vector2(100, 620), true)
	_expect(not game.player._read_drift(), "Left steering plus the same-side drift button must not enable drift.")
	_send_touch(game, 9, Vector2(100, 620), false)
	_send_touch(game, 8, Vector2(300, 300), false)

	_send_touch(game, 5, Vector2(1100, 40), true)
	_expect(not game.player.touch_left and not game.player.touch_right, "Top-right buttons must not steer.")
	_send_touch(game, 5, Vector2(1100, 40), false)

	game.player.reset_at(0.0)
	game.player.set_active(true)
	var initial_right_rotation: float = game.player.rotation.y
	game.player.set_touch_control(&"right", true)
	game.player._physics_process(0.1)
	_expect(
		wrapf(game.player.rotation.y - initial_right_rotation, -PI, PI) < 0.0,
		"Right input must rotate the kart toward screen-right."
	)
	game.player.set_touch_control(&"right", false)

	game.player.reset_at(0.0)
	game.player.set_active(true)
	var initial_left_rotation: float = game.player.rotation.y
	game.player.set_touch_control(&"left", true)
	game.player._physics_process(0.1)
	_expect(
		wrapf(game.player.rotation.y - initial_left_rotation, -PI, PI) > 0.0,
		"Left input must rotate the kart toward screen-left."
	)
	game.player.set_touch_control(&"left", false)

	_expect(game.music_player.stream != null, "BGM must be assigned.")
	_expect(game.drift_player.stream != null, "Drift sound must be assigned.")
	_expect(game.turbo_player.stream != null, "Turbo sound must be assigned.")
	_expect(game.music_player.stream.loop_mode != AudioStreamWAV.LOOP_DISABLED, "BGM must loop.")
	_expect(game.drift_player.stream.loop_mode != AudioStreamWAV.LOOP_DISABLED, "Drift sound must loop.")
	_expect(game.audio_unlocked, "Pressing Start must unlock browser audio.")
	game._update_audio_state()
	_expect(game.music_player.playing, "BGM must play continuously after audio is unlocked.")
	game._toggle_sound()
	_expect(not game.sound_enabled, "The sound button must turn all audio off.")
	_expect(not game.music_player.playing, "Muting must stop the BGM.")
	_expect(not game.drift_player.playing, "Muting must stop the drift sound.")
	_expect(not game.turbo_player.playing, "Muting must stop the turbo sound.")
	game._toggle_sound()
	_expect(game.sound_enabled, "The sound button must turn audio back on.")
	_expect(game.music_player.playing, "Unmuting must resume the BGM.")

	game.free()
	game = null
	scene = null
	await process_frame
	await process_frame

	if failures.is_empty():
		print("PASS: operation guide, three stages, mobile controls, and audio resources")
		quit(0)
	else:
		for failure in failures:
			push_error(failure)
		quit(1)


func _send_touch(game, index: int, position: Vector2, pressed: bool) -> void:
	var event := InputEventScreenTouch.new()
	event.index = index
	event.position = position
	event.pressed = pressed
	game._input(event)


func _expect(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
