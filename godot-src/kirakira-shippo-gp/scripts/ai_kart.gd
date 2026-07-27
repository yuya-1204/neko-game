extends Node3D

const KartVisual = preload("res://scripts/kart_visual.gd")
const TOTAL_LAPS := 3.0

var course
var lane_offset := 0.0
var base_speed := 20.0
var speed := 0.0
var race_distance := 0.0
var active := false
var finished := false
var finish_time := 0.0
var visual: Node3D
var personality_phase := 0.0


func setup(
		course_data,
		start_progress: float,
		lane: float,
		pace: float,
		body_color: Color,
		accent_color: Color,
		cat_color: Color,
		phase: float
	) -> void:
	course = course_data
	race_distance = start_progress
	lane_offset = lane
	base_speed = pace
	personality_phase = phase
	visual = KartVisual.new()
	add_child(visual)
	visual.build(body_color, accent_color, cat_color)
	_update_transform(0.0)


func configure_track(course_data) -> void:
	course = course_data


func reset_to(start_progress: float) -> void:
	race_distance = start_progress
	speed = 0.0
	finished = false
	finish_time = 0.0
	active = false
	_update_transform(0.0)


func set_active(value: bool) -> void:
	active = value


func update_race(delta: float, player_distance: float, elapsed: float) -> void:
	if not active or finished:
		if visual:
			visual.animate(speed, 0.0, 0.0, delta)
		return

	var curve_slowdown: float = clampf(course.curvature_at(race_distance) * 42.0, 0.0, 2.8)
	var target := base_speed - curve_slowdown
	var gap_meters: float = (player_distance - race_distance) * course.main_length
	if gap_meters > 15.0:
		target *= 1.045
	elif gap_meters < -12.0:
		target *= 0.975
	target += sin(elapsed * 0.72 + personality_phase) * 0.55
	speed = move_toward(speed, target, delta * 7.0)

	race_distance += speed * delta / maxf(course.main_length, 1.0)
	if race_distance >= TOTAL_LAPS:
		finished = true
		active = false
		finish_time = elapsed
	_update_transform(delta)


func _update_transform(delta: float) -> void:
	var center: Vector3 = course.point_at(race_distance)
	var tangent: Vector3 = course.tangent_at(race_distance)
	var outward := Vector3(tangent.z, 0.0, -tangent.x)
	var lane_wave := sin(race_distance * TAU * 2.0 + personality_phase) * 0.45
	global_position = center + outward * (lane_offset + lane_wave)
	global_position.y = 0.02
	rotation.y = atan2(tangent.x, tangent.z)
	if visual:
		var steer_visual := sin(race_distance * TAU + personality_phase) * 0.35
		visual.animate(speed, steer_visual, 0.0, delta)
