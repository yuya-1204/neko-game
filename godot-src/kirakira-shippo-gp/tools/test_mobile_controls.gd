extends SceneTree


var failures: Array[String] = []


func _init() -> void:
	call_deferred("_run")


func _run() -> void:
	var scene := load("res://main.tscn") as PackedScene
	var game = scene.instantiate()
	root.add_child(game)
	await process_frame

	_expect(game.state != game.RaceState.TITLE, "The race should auto-start.")
	_expect(game.left_steering_area.mouse_filter == Control.MOUSE_FILTER_IGNORE, "Left steering visual must not consume touches.")
	_expect(game.right_steering_area.mouse_filter == Control.MOUSE_FILTER_IGNORE, "Right steering visual must not consume touches.")
	_expect(game.left_drift_area.mouse_filter == Control.MOUSE_FILTER_IGNORE, "Left drift visual must not consume touches.")
	_expect(game.right_drift_area.mouse_filter == Control.MOUSE_FILTER_IGNORE, "Right drift visual must not consume touches.")

	_send_touch(game, 1, Vector2(900, 300), true)
	_send_touch(game, 2, Vector2(100, 620), true)
	_expect(game.player.touch_right, "Right steering must stay pressed.")
	_expect(not game.player.touch_left, "Right steering must not activate left steering.")
	_expect(game.player.touch_drift_left, "Left drift must work while right steering is held.")
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
	_send_touch(game, 4, Vector2(1100, 620), false)
	_send_touch(game, 3, Vector2(300, 300), false)

	_send_touch(game, 5, Vector2(1100, 40), true)
	_expect(not game.player.touch_left and not game.player.touch_right, "Top-right buttons must not steer.")
	_send_touch(game, 5, Vector2(1100, 40), false)

	game.player.reset_at(0.0)
	game.player.set_active(true)
	game.player.set_touch_control(&"right", true)
	game.player._physics_process(0.1)
	_expect(game.player.rotation.y < 0.0, "Right input must rotate the kart toward screen-right.")
	game.player.set_touch_control(&"right", false)

	game.player.reset_at(0.0)
	game.player.set_active(true)
	game.player.set_touch_control(&"left", true)
	game.player._physics_process(0.1)
	_expect(game.player.rotation.y > 0.0, "Left input must rotate the kart toward screen-left.")
	game.player.set_touch_control(&"left", false)

	_expect(game.music_player.stream != null, "BGM must be assigned.")
	_expect(game.drift_player.stream != null, "Drift sound must be assigned.")
	_expect(game.turbo_player.stream != null, "Turbo sound must be assigned.")
	_expect(game.music_player.stream.loop_mode != AudioStreamWAV.LOOP_DISABLED, "BGM must loop.")
	_expect(game.drift_player.stream.loop_mode != AudioStreamWAV.LOOP_DISABLED, "Drift sound must loop.")

	game.queue_free()
	await process_frame

	if failures.is_empty():
		print("PASS: mobile controls, auto-start, and audio resources")
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
