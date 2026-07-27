extends Node3D

const KartVisual = preload("res://scripts/kart_visual.gd")

var track_radius_x := 48.0
var track_radius_z := 30.0
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
		radius_x: float,
		radius_z: float,
		start_angle: float,
		lane: float,
		pace: float,
		body_color: Color,
		accent_color: Color,
		cat_color: Color,
		phase: float
	) -> void:
	track_radius_x = radius_x
	track_radius_z = radius_z
	race_distance = start_angle
	lane_offset = lane
	base_speed = pace
	personality_phase = phase
	visual = KartVisual.new()
	add_child(visual)
	visual.build(body_color, accent_color, cat_color)
	_update_transform(0.0)


func reset_to(start_angle: float) -> void:
	race_distance = start_angle
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

	var angle := race_distance
	var curve_slowdown := absf(cos(angle)) * 1.7
	var target := base_speed - curve_slowdown
	var gap := player_distance - race_distance
	if gap > 0.75:
		target *= 1.045
	elif gap < -0.55:
		target *= 0.975
	target += sin(elapsed * 0.72 + personality_phase) * 0.55
	speed = move_toward(speed, target, delta * 7.0)

	var derivative_length := Vector2(
		track_radius_x * sin(angle),
		track_radius_z * cos(angle)
	).length()
	race_distance += speed * delta / maxf(derivative_length, 1.0)
	if race_distance >= TAU * 3.0:
		finished = true
		active = false
		finish_time = elapsed
	_update_transform(delta)


func _update_transform(delta: float) -> void:
	var angle := race_distance
	var center := Vector3(track_radius_x * cos(angle), 0.0, track_radius_z * sin(angle))
	var tangent := Vector3(-track_radius_x * sin(angle), 0.0, track_radius_z * cos(angle)).normalized()
	var outward := Vector3(tangent.z, 0.0, -tangent.x)
	var lane_wave := sin(angle * 2.0 + personality_phase) * 0.45
	global_position = center + outward * (lane_offset + lane_wave)
	global_position.y = 0.02
	rotation.y = atan2(tangent.x, tangent.z)
	if visual:
		var steer_visual := sin(angle + personality_phase) * 0.35
		visual.animate(speed, steer_visual, 0.0, delta)
