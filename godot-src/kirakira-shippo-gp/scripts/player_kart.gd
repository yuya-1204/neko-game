extends CharacterBody3D

signal boost_triggered
signal recovered

const KartVisual = preload("res://scripts/kart_visual.gd")

var track_radius_x := 48.0
var track_radius_z := 30.0
var road_half_width := 7.0

var speed := 0.0
var steering_value := 0.0
var boost_timer := 0.0
var drift_charge := 0.0
var is_drifting := false
var offroad := false
var active := false
var auto_accelerate := true

var touch_left := false
var touch_right := false
var touch_brake := false
var touch_drift := false
var recover_cooldown := 0.0
var drift_was_held := false
var visual: Node3D


func _ready() -> void:
	var collision := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(1.55, 1.05, 2.40)
	collision.shape = shape
	collision.position = Vector3(0, 0.72, 0)
	add_child(collision)

	visual = KartVisual.new()
	add_child(visual)
	visual.build(Color("#ff765f"), Color("#ffe06b"), Color("#f39a43"))


func configure_track(radius_x: float, radius_z: float, half_width: float) -> void:
	track_radius_x = radius_x
	track_radius_z = radius_z
	road_half_width = half_width


func set_active(value: bool) -> void:
	active = value
	if not active:
		velocity = Vector3.ZERO


func reset_at(track_angle: float, lane_offset: float = 0.0) -> void:
	var center := _center_at(track_angle)
	var tangent := _tangent_at(track_angle)
	var outward := Vector3(tangent.z, 0, -tangent.x)
	global_position = center + outward * lane_offset
	global_position.y = 0.02
	rotation.y = atan2(tangent.x, tangent.z)
	speed = 0.0
	velocity = Vector3.ZERO
	boost_timer = 0.0
	drift_charge = 0.0
	is_drifting = false
	offroad = false


func _physics_process(delta: float) -> void:
	recover_cooldown = maxf(0.0, recover_cooldown - delta)
	if not active:
		if visual:
			visual.animate(0.0, 0.0, 0.0, delta)
		return

	var steer_input := _read_steering()
	var brake_held := _read_brake()
	var drift_held := _read_drift()
	var track_angle := get_track_angle()
	var center := _center_at(track_angle)
	var tangent := _tangent_at(track_angle)
	var distance_from_center := Vector2(global_position.x - center.x, global_position.z - center.z).length()
	offroad = distance_from_center > road_half_width

	var desired_yaw := atan2(tangent.x, tangent.z)
	var yaw_error := wrapf(desired_yaw - rotation.y, -PI, PI)
	var assist := 0.0
	if absf(steer_input) < 0.12:
		assist = clampf(yaw_error * (0.48 if offroad else 0.20), -0.58, 0.58)
	steering_value = clampf(steer_input + assist, -1.0, 1.0)

	var drift_possible := absf(steering_value) > 0.25 and speed > 9.5
	is_drifting = drift_held and drift_possible
	if is_drifting:
		drift_charge = minf(drift_charge + delta, 2.2)
	elif drift_was_held:
		if drift_charge >= 0.55:
			give_boost(clampf(0.62 + drift_charge * 0.23, 0.72, 1.18))
		drift_charge = 0.0
	elif not drift_held:
		drift_charge = maxf(0.0, drift_charge - delta * 2.5)
	drift_was_held = drift_held

	if boost_timer > 0.0:
		boost_timer = maxf(0.0, boost_timer - delta)

	var target_speed := 22.5 if auto_accelerate else 0.0
	if _read_accelerate():
		target_speed = 23.5
	if brake_held:
		target_speed = 4.0
	if offroad:
		target_speed = minf(target_speed, 13.5)
	if boost_timer > 0.0:
		target_speed = 28.5

	var acceleration := 10.5
	if target_speed < speed:
		acceleration = 19.0 if brake_held else 9.0
	speed = move_toward(speed, target_speed, acceleration * delta)

	var speed_ratio := clampf(speed / 23.0, 0.0, 1.0)
	var turn_rate := lerpf(1.95, 0.92, speed_ratio)
	if is_drifting:
		turn_rate *= 1.20
	rotation.y += steering_value * turn_rate * delta

	var forward := get_forward()
	var horizontal_velocity := Vector3(velocity.x, 0, velocity.z)
	var desired_velocity := forward * speed
	if is_drifting:
		var right := Vector3(forward.z, 0, -forward.x)
		desired_velocity += right * steering_value * speed * 0.16
	var grip := 2.7 if is_drifting else 7.8
	if offroad:
		grip = 5.8
	horizontal_velocity = horizontal_velocity.lerp(desired_velocity, clampf(grip * delta, 0.0, 1.0))
	velocity = horizontal_velocity
	move_and_slide()
	global_position.y = 0.02

	if distance_from_center > road_half_width + 13.0:
		recover_to_track()
	elif _recover_pressed() and recover_cooldown <= 0.0:
		recover_to_track()

	if visual:
		var glow := clampf(boost_timer / 0.8, 0.0, 1.0)
		visual.animate(speed, steering_value, glow, delta)


func give_boost(duration: float = 0.82) -> void:
	var was_inactive := boost_timer <= 0.03
	boost_timer = maxf(boost_timer, duration)
	speed = maxf(speed, 22.0)
	if was_inactive:
		boost_triggered.emit()


func recover_to_track() -> void:
	var angle := get_track_angle()
	var center := _center_at(angle)
	var tangent := _tangent_at(angle)
	global_position = center + Vector3(0, 0.02, 0)
	rotation.y = atan2(tangent.x, tangent.z)
	speed = minf(speed, 11.0)
	velocity = tangent * speed
	recover_cooldown = 1.0
	recovered.emit()


func set_touch_control(control: StringName, pressed: bool) -> void:
	match control:
		&"left":
			touch_left = pressed
		&"right":
			touch_right = pressed
		&"brake":
			touch_brake = pressed
		&"drift":
			touch_drift = pressed


func get_forward() -> Vector3:
	return Vector3(sin(rotation.y), 0, cos(rotation.y)).normalized()


func get_track_angle() -> float:
	var angle := atan2(global_position.z / track_radius_z, global_position.x / track_radius_x)
	return fposmod(angle, TAU)


func _center_at(angle: float) -> Vector3:
	return Vector3(track_radius_x * cos(angle), 0.0, track_radius_z * sin(angle))


func _tangent_at(angle: float) -> Vector3:
	return Vector3(-track_radius_x * sin(angle), 0.0, track_radius_z * cos(angle)).normalized()


func _read_steering() -> float:
	var keyboard := 0.0
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT) or touch_left:
		keyboard -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT) or touch_right:
		keyboard += 1.0
	var joy := 0.0
	if Input.get_connected_joypads().size() > 0:
		joy = Input.get_joy_axis(Input.get_connected_joypads()[0], JOY_AXIS_LEFT_X)
	return clampf(keyboard + joy, -1.0, 1.0)


func _read_accelerate() -> bool:
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
		return true
	if Input.get_connected_joypads().size() > 0:
		return Input.get_joy_axis(Input.get_connected_joypads()[0], JOY_AXIS_TRIGGER_RIGHT) > 0.20
	return false


func _read_brake() -> bool:
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN) or touch_brake:
		return true
	if Input.get_connected_joypads().size() > 0:
		return Input.get_joy_axis(Input.get_connected_joypads()[0], JOY_AXIS_TRIGGER_LEFT) > 0.20
	return false


func _read_drift() -> bool:
	if Input.is_key_pressed(KEY_SPACE) or touch_drift:
		return true
	if Input.get_connected_joypads().size() > 0:
		return Input.is_joy_button_pressed(Input.get_connected_joypads()[0], JOY_BUTTON_A)
	return false


func _recover_pressed() -> bool:
	if Input.is_key_pressed(KEY_R):
		return true
	if Input.get_connected_joypads().size() > 0:
		return Input.is_joy_button_pressed(Input.get_connected_joypads()[0], JOY_BUTTON_Y)
	return false
