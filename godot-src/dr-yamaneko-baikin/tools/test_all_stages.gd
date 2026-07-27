extends SceneTree


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	var packed_scene := load("res://main.tscn") as PackedScene
	if packed_scene == null:
		push_error("QA: main.tscn could not be loaded")
		quit(1)
		return

	var game := packed_scene.instantiate()
	root.add_child(game)
	await process_frame

	var expected_targets := [10, 6, 12, 8, 5]
	var expected_initial_targets := [10, 6, 12, 8, 4]
	var expected_friends := [0, 0, 4, 4, 0]
	var failed := false

	for stage_index in range(5):
		game.call("_setup_stage", stage_index)
		await process_frame

		var total_configured := int(game.target_total)
		var spawned_total: int = game.targets.size()
		var pending_total: int = game.pending_spawns.size()
		var enemy_total := 0
		var friend_total := 0
		for target in game.targets:
			var kind := str(target.get("kind", ""))
			if kind in ["enemy", "core", "boss"]:
				enemy_total += 1
			elif kind in ["friend_plate", "friend_germ"]:
				friend_total += 1

		var available_targets: int = enemy_total + pending_total
		var stage_ok: bool = (
			total_configured == expected_targets[stage_index]
			and available_targets == expected_initial_targets[stage_index]
			and friend_total == expected_friends[stage_index]
		)
		if not stage_ok:
			failed = true

		print(
			"QA_STAGE_%d configured=%d spawned=%d enemies=%d pending=%d friends=%d ok=%s"
			% [
				stage_index + 1,
				total_configured,
				spawned_total,
				enemy_total,
				pending_total,
				friend_total,
				str(stage_ok)
			]
		)

		if stage_index == 4:
			var core_targets: Array = game.targets.filter(
				func(target: Dictionary) -> bool:
					return str(target.get("kind", "")) == "core"
			)
			for core in core_targets:
				game.call("_clean_target", core)
			await process_frame

			var boss_total := 0
			for target in game.targets:
				if str(target.get("kind", "")) == "boss":
					boss_total += 1
			var boss_ok: bool = bool(game.boss_spawned) and boss_total == 1
			if not boss_ok:
				failed = true
			print(
				"QA_STAGE_5_BOSS spawned=%s boss_count=%d ok=%s"
				% [str(game.boss_spawned), boss_total, str(boss_ok)]
			)

	game.queue_free()
	await process_frame
	quit(1 if failed else 0)
