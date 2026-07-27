extends SceneTree


const RaceCourseScript = preload("res://scripts/race_course.gd")

var failures: Array[String] = []


func _init() -> void:
	call_deferred("_run")


func _run() -> void:
	var course = RaceCourseScript.new()

	course.configure(0)
	_expect(course.stage_id == 0, "Stage 1 must configure the simple course.")
	_expect(course.main_points.size() == course.MAIN_SAMPLE_COUNT, "Every course must have stable equal-distance samples.")
	_expect(course.main_length > 200.0, "The simple course must have a valid lap length.")
	_expect(course.branches.is_empty(), "Stage 1 must have no branch.")
	_expect(course.point_at(0.0).distance_to(Vector3(48.0, 0.0, 0.0)) < 0.5, "Stage 1 must preserve the original oval start.")

	course.configure(1)
	_expect(course.stage_id == 1, "Stage 2 must configure the gourd course.")
	_expect(course.stage_name == "ひょうたんコース", "Stage 2 must have the gourd name.")
	_expect(course.main_points.size() == course.MAIN_SAMPLE_COUNT, "The gourd course must be fully sampled.")
	_expect(course.branches.is_empty(), "Stage 2 must remain one closed loop.")
	var gourd_bounds := _bounds(course.main_points)
	_expect(float(gourd_bounds["width"]) > float(gourd_bounds["depth"]) * 1.8, "The gourd must have two broad horizontal lobes.")
	var center_top := _highest_z_near_x(course.main_points, 3.0)
	var lobe_top := _highest_z_in_x_band(course.main_points, 14.0, 34.0)
	_expect(lobe_top > center_top + 1.0, "The gourd course must have a visible center waist.")

	course.configure(2)
	_expect(course.stage_id == 2, "Stage 3 must configure the branching course.")
	_expect(course.branches.size() == 1, "Stage 3 must expose one alternate route.")
	var branch: Dictionary = course.branches[0]
	_expect(float(branch["race_start"]) < float(branch["race_end"]), "The branch must map forward through race progress.")
	_expect((branch["points"] as PackedVector3Array).size() == course.BRANCH_SAMPLE_COUNT, "The branch must have stable samples.")
	_expect(
		course.branch_point(0, 0.0).distance_to(course.point_at(float(branch["race_start"]))) < 0.1,
		"The branch must begin exactly at the fork on the main route."
	)
	_expect(
		course.branch_point(0, 1.0).distance_to(course.point_at(float(branch["race_end"]))) < 0.1,
		"The branch must end exactly at the merge on the main route."
	)
	var branch_midpoint: Vector3 = course.branch_point(0, 0.5)
	var nearest: Dictionary = course.nearest_drive_path(branch_midpoint, 1)
	_expect(int(nearest["path_id"]) == 1, "A kart on the alternate route must be recognized as being on the branch.")
	_expect(float(nearest["progress"]) > float(branch["race_start"]), "Branch progress must advance from the fork.")
	_expect(float(nearest["progress"]) < float(branch["race_end"]), "Branch progress must merge before the branch endpoint.")
	_expect(float(nearest["distance"]) < 0.1, "The branch centerline must be treated as on-road.")

	if failures.is_empty():
		print("PASS: all three course geometries and the selectable branch")
		quit(0)
	else:
		for failure in failures:
			push_error(failure)
		quit(1)


func _bounds(points: PackedVector3Array) -> Dictionary:
	var min_x := INF
	var max_x := -INF
	var min_z := INF
	var max_z := -INF
	for point in points:
		min_x = minf(min_x, point.x)
		max_x = maxf(max_x, point.x)
		min_z = minf(min_z, point.z)
		max_z = maxf(max_z, point.z)
	return {"width": max_x - min_x, "depth": max_z - min_z}


func _highest_z_near_x(points: PackedVector3Array, x_limit: float) -> float:
	var highest := -INF
	for point in points:
		if absf(point.x) <= x_limit:
			highest = maxf(highest, point.z)
	return highest


func _highest_z_in_x_band(
		points: PackedVector3Array,
		min_abs_x: float,
		max_abs_x: float
	) -> float:
	var highest := -INF
	for point in points:
		var absolute_x := absf(point.x)
		if absolute_x >= min_abs_x and absolute_x <= max_abs_x:
			highest = maxf(highest, point.z)
	return highest


func _expect(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
