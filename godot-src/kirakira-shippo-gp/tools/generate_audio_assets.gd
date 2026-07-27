extends SceneTree

const RaceAudioFactory = preload("res://scripts/race_audio_factory.gd")


func _init() -> void:
	var output_dir := ProjectSettings.globalize_path("res://assets/audio")
	var directory_error := DirAccess.make_dir_recursive_absolute(output_dir)
	if directory_error not in [OK, ERR_ALREADY_EXISTS]:
		push_error("Could not create audio output directory: %s" % directory_error)
		quit(1)
		return

	var streams := {
		"res://assets/audio/race_bgm.res": RaceAudioFactory.make_bgm(),
		"res://assets/audio/drift_loop.res": RaceAudioFactory.make_drift_loop(),
		"res://assets/audio/turbo.res": RaceAudioFactory.make_turbo(),
	}
	for path in streams:
		var save_error := ResourceSaver.save(streams[path], path)
		if save_error != OK:
			push_error("Could not save %s: %s" % [path, save_error])
			quit(1)
			return
		print("Saved ", path)
	quit()
