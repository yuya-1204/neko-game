class_name RaceCourse
extends RefCounted

## Procedural, planar course geometry shared by track rendering, racers, and
## race-progress logic. Progress values are normalized to one lap (0.0..1.0).

const RAW_SAMPLE_COUNT := 768
const MAIN_SAMPLE_COUNT := 192
const BRANCH_SAMPLE_COUNT := 72
const PATH_SWITCH_HYSTERESIS := 1.25
const SAMPLE_TANGENT_DISTANCE := 0.75

var stage_id := 0
var stage_name := "シンプルコース"
var road_half_width := 7.0
var main_points := PackedVector3Array()
var branches: Array[Dictionary] = []
var main_length := 0.0

var _main_cumulative := PackedFloat32Array()


func configure(new_stage_id: int) -> void:
	stage_id = clampi(new_stage_id, 0, 2)
	branches.clear()

	var raw_main := PackedVector3Array()
	match stage_id:
		0:
			stage_name = "シンプルコース"
			road_half_width = 7.0
			raw_main = _make_oval_raw(48.0, 30.0)
		1:
			stage_name = "ひょうたんコース"
			road_half_width = 6.7
			raw_main = _make_gourd_raw()
		2:
			stage_name = "わかれみちコース"
			road_half_width = 7.0
			raw_main = _make_stage_three_raw()

	main_points = _resample_closed(raw_main, MAIN_SAMPLE_COUNT)
	var main_metrics := _closed_metrics(main_points)
	_main_cumulative = main_metrics["cumulative"] as PackedFloat32Array
	main_length = float(main_metrics["length"])

	if stage_id == 2:
		_build_stage_three_branch()


func point_at(progress: float) -> Vector3:
	if main_points.is_empty() or main_length <= 0.0:
		return Vector3.ZERO
	return _sample_closed(
		main_points,
		_main_cumulative,
		main_length,
		fposmod(progress, 1.0)
	)


func tangent_at(progress: float) -> Vector3:
	if main_length <= 0.0:
		return Vector3.FORWARD
	var half_step := SAMPLE_TANGENT_DISTANCE / main_length
	var before := point_at(progress - half_step)
	var after := point_at(progress + half_step)
	var tangent := after - before
	tangent.y = 0.0
	if tangent.length_squared() <= 0.000001:
		return Vector3.FORWARD
	return tangent.normalized()


func outward_at(progress: float) -> Vector3:
	var tangent := tangent_at(progress)
	return Vector3(tangent.z, 0.0, -tangent.x).normalized()


func nearest_drive_path(
	position: Vector3,
	preferred_path: int = -1
	) -> Dictionary:
	if main_points.is_empty():
		return _empty_nearest_result(position)

	var candidates: Array[Dictionary] = []
	candidates.append(
		_nearest_on_closed(
			position,
			main_points,
			_main_cumulative,
			main_length,
			0
		)
	)
	for branch_index in range(branches.size()):
		var branch: Dictionary = branches[branch_index]
		candidates.append(
			_nearest_on_open(
				position,
				branch["points"] as PackedVector3Array,
				branch["cumulative"] as PackedFloat32Array,
				float(branch["length"]),
				branch_index + 1,
				float(branch["race_start"]),
				float(branch["race_end"])
			)
		)

	var best: Dictionary = candidates[0]
	var preferred := {}
	for candidate in candidates:
		if float(candidate["_distance_squared"]) < float(best["_distance_squared"]):
			best = candidate
		if int(candidate["path_id"]) == preferred_path:
			preferred = candidate

	if not preferred.is_empty():
		var best_distance := sqrt(float(best["_distance_squared"]))
		var preferred_distance := sqrt(float(preferred["_distance_squared"]))
		if preferred_distance <= best_distance + PATH_SWITCH_HYSTERESIS:
			best = preferred

	best.erase("_distance_squared")
	return best


func branch_point(branch_index: int, local_progress: float) -> Vector3:
	if branch_index < 0 or branch_index >= branches.size():
		return Vector3.ZERO
	var branch: Dictionary = branches[branch_index]
	return _sample_open(
		branch["points"] as PackedVector3Array,
		branch["cumulative"] as PackedFloat32Array,
		float(branch["length"]),
		clampf(local_progress, 0.0, 1.0)
	)


func branch_tangent(branch_index: int, local_progress: float) -> Vector3:
	if branch_index < 0 or branch_index >= branches.size():
		return Vector3.FORWARD
	var branch: Dictionary = branches[branch_index]
	var branch_length := float(branch["length"])
	if branch_length <= 0.0:
		return Vector3.FORWARD
	var half_step := SAMPLE_TANGENT_DISTANCE / branch_length
	var before := branch_point(branch_index, local_progress - half_step)
	var after := branch_point(branch_index, local_progress + half_step)
	var tangent := after - before
	tangent.y = 0.0
	if tangent.length_squared() <= 0.000001:
		return Vector3.FORWARD
	return tangent.normalized()


func curvature_at(progress: float) -> float:
	if main_length <= 0.0:
		return 0.0
	var sample_distance := 2.0
	var step := sample_distance / main_length
	var before := tangent_at(progress - step)
	var after := tangent_at(progress + step)
	var turn_angle := acos(clampf(before.dot(after), -1.0, 1.0))
	return turn_angle / (sample_distance * 2.0)


func _make_oval_raw(radius_x: float, radius_z: float) -> PackedVector3Array:
	var raw := PackedVector3Array()
	raw.resize(RAW_SAMPLE_COUNT)
	for index in range(RAW_SAMPLE_COUNT):
		var angle := TAU * float(index) / float(RAW_SAMPLE_COUNT)
		raw[index] = Vector3(
			radius_x * cos(angle),
			0.0,
			radius_z * sin(angle)
		)
	return raw


func _make_gourd_raw() -> PackedVector3Array:
	var raw := PackedVector3Array()
	raw.resize(RAW_SAMPLE_COUNT)
	for index in range(RAW_SAMPLE_COUNT):
		var angle := TAU * float(index) / float(RAW_SAMPLE_COUNT)
		# A positive polar radius creates two broad lobes and a generous waist,
		# while remaining a single, non-self-intersecting closed curve.
		var radius := 40.0 + 14.0 * cos(angle * 2.0)
		raw[index] = Vector3(
			radius * cos(angle),
			0.0,
			radius * 0.78 * sin(angle)
		)
	return raw


func _make_stage_three_raw() -> PackedVector3Array:
	var raw := PackedVector3Array()
	raw.resize(RAW_SAMPLE_COUNT)
	for index in range(RAW_SAMPLE_COUNT):
		var angle := TAU * float(index) / float(RAW_SAMPLE_COUNT)
		# The small harmonics make the outer route recognizable without
		# compromising the clear fork and merge on its northern side.
		var radius_x := 50.0 + 2.2 * sin(angle * 3.0)
		var radius_z := 31.0 + 1.4 * cos(angle * 2.0)
		raw[index] = Vector3(
			radius_x * cos(angle),
			0.0,
			radius_z * sin(angle)
		)
	return raw


func _build_stage_three_branch() -> void:
	const RACE_START := 0.13
	const RACE_END := 0.38
	var start := point_at(RACE_START)
	var finish := point_at(RACE_END)
	var start_tangent := tangent_at(RACE_START)
	var finish_tangent := tangent_at(RACE_END)
	var start_inward := -outward_at(RACE_START)
	var finish_inward := -outward_at(RACE_END)
	var control_one := start + start_tangent * 9.0 + start_inward * 23.0
	var control_two := finish - finish_tangent * 9.0 + finish_inward * 23.0

	var raw_branch := PackedVector3Array()
	raw_branch.resize(RAW_SAMPLE_COUNT / 4)
	for index in range(raw_branch.size()):
		var amount := float(index) / float(raw_branch.size() - 1)
		raw_branch[index] = _cubic_bezier(
			start,
			control_one,
			control_two,
			finish,
			amount
		)

	var branch_points := _resample_open(raw_branch, BRANCH_SAMPLE_COUNT)
	var branch_metrics := _open_metrics(branch_points)
	branches.append(
		{
			"points": branch_points,
			"cumulative": branch_metrics["cumulative"],
			"length": branch_metrics["length"],
			"race_start": RACE_START,
			"race_end": RACE_END,
			"road_half_width": 6.2,
		}
	)


func _resample_closed(
	raw_points: PackedVector3Array,
	sample_count: int
	) -> PackedVector3Array:
	var result := PackedVector3Array()
	if raw_points.size() < 2 or sample_count < 3:
		return result
	var metrics := _closed_metrics(raw_points)
	var cumulative := metrics["cumulative"] as PackedFloat32Array
	var length := float(metrics["length"])
	result.resize(sample_count)
	for index in range(sample_count):
		result[index] = _sample_closed(
			raw_points,
			cumulative,
			length,
			float(index) / float(sample_count)
		)
	return result


func _resample_open(
	raw_points: PackedVector3Array,
	sample_count: int
	) -> PackedVector3Array:
	var result := PackedVector3Array()
	if raw_points.size() < 2 or sample_count < 2:
		return result
	var metrics := _open_metrics(raw_points)
	var cumulative := metrics["cumulative"] as PackedFloat32Array
	var length := float(metrics["length"])
	result.resize(sample_count)
	for index in range(sample_count):
		result[index] = _sample_open(
			raw_points,
			cumulative,
			length,
			float(index) / float(sample_count - 1)
		)
	return result


func _closed_metrics(points: PackedVector3Array) -> Dictionary:
	var cumulative := PackedFloat32Array()
	cumulative.resize(points.size() + 1)
	var length := 0.0
	cumulative[0] = 0.0
	for index in range(points.size()):
		length += points[index].distance_to(points[(index + 1) % points.size()])
		cumulative[index + 1] = length
	return {"cumulative": cumulative, "length": length}


func _open_metrics(points: PackedVector3Array) -> Dictionary:
	var cumulative := PackedFloat32Array()
	cumulative.resize(points.size())
	var length := 0.0
	if points.is_empty():
		return {"cumulative": cumulative, "length": length}
	cumulative[0] = 0.0
	for index in range(points.size() - 1):
		length += points[index].distance_to(points[index + 1])
		cumulative[index + 1] = length
	return {"cumulative": cumulative, "length": length}


func _sample_closed(
	points: PackedVector3Array,
	cumulative: PackedFloat32Array,
	length: float,
	progress: float
	) -> Vector3:
	if points.is_empty() or length <= 0.0:
		return Vector3.ZERO
	var target := fposmod(progress, 1.0) * length
	var segment := _find_segment(cumulative, target)
	var segment_start := float(cumulative[segment])
	var segment_length := float(cumulative[segment + 1]) - segment_start
	var amount := 0.0
	if segment_length > 0.000001:
		amount = (target - segment_start) / segment_length
	return points[segment].lerp(points[(segment + 1) % points.size()], amount)


func _sample_open(
	points: PackedVector3Array,
	cumulative: PackedFloat32Array,
	length: float,
	progress: float
	) -> Vector3:
	if points.is_empty() or length <= 0.0:
		return Vector3.ZERO
	if progress <= 0.0:
		return points[0]
	if progress >= 1.0:
		return points[points.size() - 1]
	var target := progress * length
	var segment := _find_segment(cumulative, target)
	segment = mini(segment, points.size() - 2)
	var segment_start := float(cumulative[segment])
	var segment_length := float(cumulative[segment + 1]) - segment_start
	var amount := 0.0
	if segment_length > 0.000001:
		amount = (target - segment_start) / segment_length
	return points[segment].lerp(points[segment + 1], amount)


func _find_segment(cumulative: PackedFloat32Array, target: float) -> int:
	var low := 0
	var high := cumulative.size() - 2
	while low < high:
		var middle := (low + high + 1) / 2
		if float(cumulative[middle]) <= target:
			low = middle
		else:
			high = middle - 1
	return low


func _nearest_on_closed(
	position: Vector3,
	points: PackedVector3Array,
	cumulative: PackedFloat32Array,
	length: float,
	path_id: int
	) -> Dictionary:
	var best_squared := INF
	var best_position := points[0]
	var best_progress := 0.0
	var best_tangent := Vector3.FORWARD
	for index in range(points.size()):
		var start := points[index]
		var finish := points[(index + 1) % points.size()]
		var projection := _project_to_segment(position, start, finish)
		var projected := projection["position"] as Vector3
		var distance_squared := _planar_distance_squared(position, projected)
		if distance_squared < best_squared:
			best_squared = distance_squared
			best_position = projected
			var amount := float(projection["amount"])
			var segment_distance := float(cumulative[index + 1]) - float(cumulative[index])
			best_progress = (
				float(cumulative[index]) + segment_distance * amount
			) / length
			best_tangent = (finish - start).normalized()
	return {
		"position": best_position,
		"tangent": best_tangent,
		"distance": sqrt(best_squared),
		"progress": fposmod(best_progress, 1.0),
		"path_id": path_id,
		"local_progress": fposmod(best_progress, 1.0),
		"_distance_squared": best_squared,
	}


func _nearest_on_open(
	position: Vector3,
	points: PackedVector3Array,
	cumulative: PackedFloat32Array,
	length: float,
	path_id: int,
	race_start: float,
	race_end: float
	) -> Dictionary:
	var best_squared := INF
	var best_position := points[0]
	var best_local_progress := 0.0
	var best_tangent := Vector3.FORWARD
	for index in range(points.size() - 1):
		var start := points[index]
		var finish := points[index + 1]
		var projection := _project_to_segment(position, start, finish)
		var projected := projection["position"] as Vector3
		var distance_squared := _planar_distance_squared(position, projected)
		if distance_squared < best_squared:
			best_squared = distance_squared
			best_position = projected
			var amount := float(projection["amount"])
			var segment_distance := float(cumulative[index + 1]) - float(cumulative[index])
			best_local_progress = (
				float(cumulative[index]) + segment_distance * amount
			) / length
			best_tangent = (finish - start).normalized()
	var race_span := fposmod(race_end - race_start, 1.0)
	var race_progress := fposmod(
		race_start + race_span * best_local_progress,
		1.0
	)
	return {
		"position": best_position,
		"tangent": best_tangent,
		"distance": sqrt(best_squared),
		"progress": race_progress,
		"path_id": path_id,
		"local_progress": best_local_progress,
		"_distance_squared": best_squared,
	}


func _project_to_segment(
	position: Vector3,
	start: Vector3,
	finish: Vector3
	) -> Dictionary:
	var flat_position := Vector3(position.x, 0.0, position.z)
	var flat_start := Vector3(start.x, 0.0, start.z)
	var flat_finish := Vector3(finish.x, 0.0, finish.z)
	var segment := flat_finish - flat_start
	var length_squared := segment.length_squared()
	var amount := 0.0
	if length_squared > 0.000001:
		amount = clampf(
			(flat_position - flat_start).dot(segment) / length_squared,
			0.0,
			1.0
		)
	return {
		"position": flat_start.lerp(flat_finish, amount),
		"amount": amount,
	}


func _planar_distance_squared(first: Vector3, second: Vector3) -> float:
	var delta := Vector2(first.x - second.x, first.z - second.z)
	return delta.length_squared()


func _cubic_bezier(
	start: Vector3,
	control_one: Vector3,
	control_two: Vector3,
	finish: Vector3,
	amount: float
	) -> Vector3:
	var inverse := 1.0 - amount
	return (
		start * inverse * inverse * inverse
		+ control_one * 3.0 * inverse * inverse * amount
		+ control_two * 3.0 * inverse * amount * amount
		+ finish * amount * amount * amount
	)


func _empty_nearest_result(position: Vector3) -> Dictionary:
	return {
		"position": Vector3(position.x, 0.0, position.z),
		"tangent": Vector3.FORWARD,
		"distance": INF,
		"progress": 0.0,
		"path_id": -1,
		"local_progress": 0.0,
	}
