extends Node3D

const PlayerKart = preload("res://scripts/player_kart.gd")
const AIKart = preload("res://scripts/ai_kart.gd")
const RaceCourse = preload("res://scripts/race_course.gd")
const UI_FONT = preload("res://assets/fonts/KosugiMaru-Regular.ttf")
const RACE_BGM = preload("res://assets/audio/race_bgm.res")
const DRIFT_LOOP = preload("res://assets/audio/drift_loop.res")
const TURBO_SOUND = preload("res://assets/audio/turbo.res")

const CHECKPOINT_COUNT := 8
const TOTAL_LAPS := 3
const LEFT_DRIFT_RECT := Rect2(28, 560, 250, 132)
const RIGHT_DRIFT_RECT := Rect2(1002, 560, 250, 132)
const TOP_RIGHT_CONTROLS_RECT := Rect2(1038, 8, 234, 154)

enum RaceState {
	TITLE,
	COUNTDOWN,
	RACING,
	FINISHED,
}

var state := RaceState.TITLE
var selected_stage := 0
var course
var stage_root: Node3D
var player
var ai_karts: Array[Node3D] = []
var camera: Camera3D
var camera_target_position := Vector3.ZERO

var elapsed_time := 0.0
var completed_laps := 0
var next_checkpoint := 1
var player_progress := 0.0
var final_place := 1
var countdown_time := 0.0
var countdown_last_number := 4
var go_message_timer := 0.0
var reverse_timer := 0.0
var boost_pad_cooldown := 0.0
var collected_count := 0
var best_time := 0.0
var best_times: Array[float] = [0.0, 0.0, 0.0]

var sparkles: Array[Dictionary] = []
var boost_pads: Array[Dictionary] = []

var canvas: CanvasLayer
var title_overlay: ColorRect
var finish_overlay: ColorRect
var countdown_label: Label
var position_label: Label
var stage_hud_label: Label
var lap_label: Label
var time_label: Label
var speed_label: Label
var sparkle_label: Label
var message_label: Label
var drift_label: Label
var finish_title: Label
var finish_detail: Label
var best_label: Label
var stage_description_label: Label
var stage_buttons: Array[Button] = []
var start_button: Button
var mute_button: Button
var left_steering_area: PanelContainer
var right_steering_area: PanelContainer
var left_drift_area: Button
var right_drift_area: Button
var active_touches: Dictionary = {}
var audio_unlocked := false

var sound_enabled := true
var beep_player: AudioStreamPlayer
var beep_generator: AudioStreamGenerator
var music_player: AudioStreamPlayer
var drift_player: AudioStreamPlayer
var turbo_player: AudioStreamPlayer


func _ready() -> void:
	_load_best_time()
	_build_environment()
	course = RaceCourse.new()
	course.configure(selected_stage)
	_build_stage_world()
	_build_racers()
	_build_camera()
	_build_audio()
	_build_ui()
	_reset_race()


func _process(delta: float) -> void:
	_animate_world(delta)
	_update_camera(delta)
	boost_pad_cooldown = maxf(0.0, boost_pad_cooldown - delta)
	go_message_timer = maxf(0.0, go_message_timer - delta)

	match state:
		RaceState.COUNTDOWN:
			_update_countdown(delta)
		RaceState.RACING:
			_update_race(delta)
		RaceState.FINISHED:
			for ai in ai_karts:
				ai.update_race(delta, player_progress, elapsed_time)
			_update_hud()
	_update_audio_state()


func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed:
			audio_unlocked = true
		if event.pressed and state in [RaceState.COUNTDOWN, RaceState.RACING]:
			var role := _touch_role_for_position(event.position)
			if role != &"":
				active_touches[event.index] = role
			else:
				active_touches.erase(event.index)
		else:
			active_touches.erase(event.index)
		_sync_touch_controls()
	elif event is InputEventScreenDrag and active_touches.has(event.index):
		var role := _touch_role_for_position(event.position)
		if role == &"":
			active_touches.erase(event.index)
		else:
			active_touches[event.index] = role
		_sync_touch_controls()
	elif event is InputEventMouseButton and event.pressed:
		audio_unlocked = true
	elif event is InputEventKey and event.pressed:
		audio_unlocked = true


func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		_clear_touch_controls()


func _exit_tree() -> void:
	for audio_player in [beep_player, music_player, drift_player, turbo_player]:
		if audio_player:
			audio_player.stop()


func _build_environment() -> void:
	var world_environment := WorldEnvironment.new()
	world_environment.name = "WorldEnvironment"
	var environment := Environment.new()
	environment.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var sky_material := ProceduralSkyMaterial.new()
	sky_material.sky_top_color = Color("#5b514c")
	sky_material.sky_horizon_color = Color("#9a806c")
	sky_material.ground_horizon_color = Color("#786858")
	sky_material.ground_bottom_color = Color("#39322e")
	sky_material.sun_angle_max = 18.0
	sky.sky_material = sky_material
	environment.sky = sky
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color("#e0d7cc")
	environment.ambient_light_energy = 0.68
	environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	environment.fog_enabled = true
	environment.fog_light_color = Color("#6b6056")
	environment.fog_density = 0.0015
	world_environment.environment = environment
	add_child(world_environment)

	var sun := DirectionalLight3D.new()
	sun.name = "Sun"
	sun.rotation_degrees = Vector3(-52, -28, 0)
	sun.light_color = Color("#fff0dd")
	sun.light_energy = 1.05
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 120.0
	add_child(sun)

	var ground := MeshInstance3D.new()
	ground.name = "GrassGround"
	var ground_mesh := PlaneMesh.new()
	ground_mesh.size = Vector2(160, 120)
	ground.mesh = ground_mesh
	ground.material_override = _material(Color("#665744"), 0.97)
	ground.position.y = -0.05
	add_child(ground)


func _build_stage_world() -> void:
	if stage_root:
		remove_child(stage_root)
		stage_root.free()
	stage_root = Node3D.new()
	stage_root.name = "StageWorld"
	add_child(stage_root)
	boost_pads.clear()
	sparkles.clear()
	_build_track()
	_build_decorations()
	if selected_stage == 2:
		_build_stage_three_obstacles()


func _build_track() -> void:
	_add_road_path(
		course.main_points,
		true,
		course.road_half_width,
		"MainRoad",
		Color("#485364"),
		0.060
	)
	_add_curbs_for_path(
		course.main_points,
		true,
		course.road_half_width,
		"Main",
		0
	)
	for branch_index in range(course.branches.size()):
		var branch: Dictionary = course.branches[branch_index]
		var points := branch["points"] as PackedVector3Array
		var half_width := float(branch["road_half_width"])
		_add_road_path(
			points,
			false,
			half_width,
			"BranchRoad%d" % (branch_index + 1),
			Color("#526273"),
			0.072
		)
		_add_curbs_for_path(
			points,
			false,
			half_width,
			"Branch%d" % (branch_index + 1),
			5
		)

	_build_start_line()
	_build_boost_pads()
	_build_sparkles()
	if selected_stage == 2:
		_build_branch_sign()


func _add_road_path(
		points: PackedVector3Array,
		closed: bool,
		half_width: float,
		road_name: String,
		color: Color,
		height: float
	) -> void:
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	var segment_count := points.size() if closed else points.size() - 1
	for i in range(segment_count):
		var next_index := (i + 1) % points.size()
		var center0 := points[i]
		var center1 := points[next_index]
		var tangent0 := _path_tangent_at_index(points, i, closed)
		var tangent1 := _path_tangent_at_index(points, next_index, closed)
		var outward0 := Vector3(tangent0.z, 0.0, -tangent0.x)
		var outward1 := Vector3(tangent1.z, 0.0, -tangent1.x)
		var inner0 := center0 - outward0 * half_width
		var outer0 := center0 + outward0 * half_width
		var inner1 := center1 - outward1 * half_width
		var outer1 := center1 + outward1 * half_width
		inner0.y = height
		outer0.y = height
		inner1.y = height
		outer1.y = height
		_surface_vertex(surface, inner0, Vector2(0, float(i) / 8.0))
		_surface_vertex(surface, outer0, Vector2(1, float(i) / 8.0))
		_surface_vertex(surface, outer1, Vector2(1, float(i + 1) / 8.0))
		_surface_vertex(surface, inner0, Vector2(0, float(i) / 8.0))
		_surface_vertex(surface, outer1, Vector2(1, float(i + 1) / 8.0))
		_surface_vertex(surface, inner1, Vector2(0, float(i + 1) / 8.0))
	var road := MeshInstance3D.new()
	road.name = road_name
	road.mesh = surface.commit()
	var road_material := _material(color, 0.92)
	road_material.metallic = 0.05
	road.material_override = road_material
	stage_root.add_child(road)


func _add_curbs_for_path(
		points: PackedVector3Array,
		closed: bool,
		half_width: float,
		prefix: String,
		end_skip: int
	) -> void:
	var segment_count := points.size() if closed else points.size() - 1
	var start_index := 0 if closed else end_skip
	var end_index := segment_count if closed else segment_count - end_skip
	for i in range(start_index, end_index, 2):
		var center := points[i]
		var tangent := _path_tangent_at_index(points, i, closed)
		var outward := Vector3(tangent.z, 0.0, -tangent.x)
		var curb_color := Color("#fff5df") if (i / 2) % 2 == 0 else Color("#ff6671")
		var skip_inner_curb := false
		if prefix == "Main" and selected_stage == 2:
			var path_progress := float(i) / float(points.size())
			for branch_join in [0.13, 0.38]:
				if absf(wrapf(path_progress - branch_join, -0.5, 0.5)) < 0.045:
					skip_inner_curb = true
		if not skip_inner_curb:
			_add_box_mesh(
				prefix + "InnerCurb",
				Vector3(0.55, 0.18, 2.05),
				center - outward * (half_width + 0.12) + Vector3.UP * 0.12,
				curb_color,
				atan2(tangent.x, tangent.z)
			)
		_add_box_mesh(
			prefix + "OuterCurb",
			Vector3(0.55, 0.18, 2.05),
			center + outward * (half_width + 0.12) + Vector3.UP * 0.12,
			curb_color,
			atan2(tangent.x, tangent.z)
		)


func _path_tangent_at_index(
		points: PackedVector3Array,
		index: int,
		closed: bool
	) -> Vector3:
	if points.size() < 2:
		return Vector3.FORWARD
	var before_index := index - 1
	var after_index := index + 1
	if closed:
		before_index = posmod(before_index, points.size())
		after_index = posmod(after_index, points.size())
	else:
		before_index = maxi(before_index, 0)
		after_index = mini(after_index, points.size() - 1)
	return (points[after_index] - points[before_index]).normalized()


func _build_start_line() -> void:
	var center: Vector3 = course.point_at(0.0)
	var outward: Vector3 = course.outward_at(0.0)
	var tangent: Vector3 = course.tangent_at(0.0)
	for i in range(10):
		var offset: float = (float(i) - 4.5) * (course.road_half_width * 2.0 / 10.0)
		var color := Color.WHITE if i % 2 == 0 else Color("#202735")
		_add_box_mesh(
			"StartTile",
			Vector3(course.road_half_width * 2.0 / 10.0, 0.035, 1.25),
			center + outward * offset + Vector3.UP * 0.105,
			color,
			atan2(tangent.x, tangent.z)
		)

	var left_pos: Vector3 = center - outward * (course.road_half_width + 1.2)
	var right_pos: Vector3 = center + outward * (course.road_half_width + 1.2)
	var yaw := atan2(tangent.x, tangent.z)
	_add_box_mesh("StartPost", Vector3(0.7, 5.2, 0.7), left_pos + Vector3.UP * 2.6, Color("#7046d9"), yaw)
	_add_box_mesh("StartPost", Vector3(0.7, 5.2, 0.7), right_pos + Vector3.UP * 2.6, Color("#7046d9"), yaw)
	_add_box_mesh(
		"StartBanner",
		Vector3(course.road_half_width * 2.0 + 3.0, 1.0, 0.6),
		center + Vector3.UP * 5.0,
		Color("#ffe067"),
		yaw
	)
	var label := Label3D.new()
	label.text = "START!"
	label.font_size = 84
	label.outline_size = 12
	label.modulate = Color("#4f3193")
	label.position = center + Vector3.UP * 5.02 - tangent * 0.34
	label.rotation.y = yaw + PI
	label.no_depth_test = true
	stage_root.add_child(label)


func _build_boost_pads() -> void:
	var main_progresses := [0.11, 0.34, 0.59, 0.82]
	if selected_stage == 2:
		main_progresses = [0.47, 0.67, 0.88]
	for progress in main_progresses:
		var center: Vector3 = course.point_at(float(progress))
		var tangent: Vector3 = course.tangent_at(float(progress))
		var outward: Vector3 = course.outward_at(float(progress))
		var lane := sin(float(progress) * TAU * 3.0) * 2.1
		_add_boost_pad(center, tangent, outward, lane)
	if selected_stage == 2 and not course.branches.is_empty():
		var branch_progress := 0.56
		var center: Vector3 = course.branch_point(0, branch_progress)
		var tangent: Vector3 = course.branch_tangent(0, branch_progress)
		var outward := Vector3(tangent.z, 0.0, -tangent.x)
		_add_boost_pad(center, tangent, outward, 0.0)


func _add_boost_pad(
		center: Vector3,
		tangent: Vector3,
		outward: Vector3,
		lane: float
	) -> void:
	var pos := center + outward * lane + Vector3.UP * 0.12
	var pad := _add_box_mesh(
		"BoostPad",
		Vector3(3.2, 0.08, 4.4),
		pos,
		Color("#4ee9e6"),
		atan2(tangent.x, tangent.z)
	)
	var material := pad.material_override as StandardMaterial3D
	material.emission_enabled = true
	material.emission = Color("#20fff4")
	material.emission_energy_multiplier = 1.4
	boost_pads.append({"node": pad, "position": pos})


func _build_sparkles() -> void:
	var main_count := 16 if selected_stage == 2 else 20
	for i in range(main_count):
		var progress := fposmod(0.05 + float(i) / float(main_count), 1.0)
		var center: Vector3 = course.point_at(progress)
		var outward: Vector3 = course.outward_at(progress)
		var lane := sin(float(i) * 1.73) * 3.5
		_add_sparkle(center + outward * lane + Vector3.UP * 1.05)
	if selected_stage == 2 and not course.branches.is_empty():
		for i in range(4):
			var local_progress := 0.22 + float(i) * 0.19
			var center: Vector3 = course.branch_point(0, local_progress)
			var tangent: Vector3 = course.branch_tangent(0, local_progress)
			var outward := Vector3(tangent.z, 0.0, -tangent.x)
			var lane := -2.5 if i % 2 == 0 else 2.5
			_add_sparkle(center + outward * lane + Vector3.UP * 1.05)


func _add_sparkle(pos: Vector3) -> void:
	var holder := Node3D.new()
	holder.name = "Kirari"
	holder.position = pos
	var ring := MeshInstance3D.new()
	var ring_mesh := TorusMesh.new()
	ring_mesh.inner_radius = 0.20
	ring_mesh.outer_radius = 0.46
	ring_mesh.rings = 10
	ring_mesh.ring_segments = 8
	ring.mesh = ring_mesh
	var sparkle_material := _material(Color("#fff47a"), 0.20)
	sparkle_material.emission_enabled = true
	sparkle_material.emission = Color("#fff15c")
	sparkle_material.emission_energy_multiplier = 1.5
	ring.material_override = sparkle_material
	ring.rotation_degrees.x = 90
	holder.add_child(ring)
	var core := MeshInstance3D.new()
	var core_mesh := SphereMesh.new()
	core_mesh.radius = 0.18
	core_mesh.height = 0.36
	core.mesh = core_mesh
	core.material_override = sparkle_material
	holder.add_child(core)
	stage_root.add_child(holder)
	sparkles.append({"node": holder, "position": pos, "taken": false})


func _build_decorations() -> void:
	if selected_stage == 0:
		_add_pond(Vector3.ZERO, 14.0)
		_build_windmill(Vector3(0, 0.15, 0))
	elif selected_stage == 1:
		_add_pond(Vector3.ZERO, 9.0)
		_build_windmill(Vector3(0, 0.15, 0))
	else:
		_add_pond(Vector3(4, 0, -8), 7.5)

	var tree_count := 26 if selected_stage == 2 else 32
	for i in range(tree_count):
		var progress := fposmod(0.015 + float(i) / float(tree_count), 1.0)
		var radius_extra := 9.0 + float((i * 7) % 7) * 0.72
		var center: Vector3 = course.point_at(progress)
		var pos: Vector3 = center + course.outward_at(progress) * (course.road_half_width + radius_extra)
		_add_tree(pos, 0.78 + float(i % 4) * 0.10, i)

	if selected_stage != 2:
		for i in range(9):
			var progress := fposmod(float(i) / 9.0 + 0.08, 1.0)
			var center: Vector3 = course.point_at(progress)
			var pos: Vector3 = center - course.outward_at(progress) * (course.road_half_width + 4.8)
			if pos.length() > 16.0:
				_add_tree(pos, 0.65 + float(i % 3) * 0.08, i + 40)

	for i in range(14):
		var progress := fposmod(float(i) / 14.0 + 0.04, 1.0)
		var center: Vector3 = course.point_at(progress)
		var pos: Vector3 = center + course.outward_at(progress) * (course.road_half_width + 2.9)
		_add_flower_patch(pos, i)

	for i in range(8):
		var progress := fposmod(float(i) / 8.0 + 0.055, 1.0)
		var center: Vector3 = course.point_at(progress)
		var pos: Vector3 = center + course.outward_at(progress) * (course.road_half_width + 21.0)
		_add_hill(pos, 5.0 + float(i % 3), i)


func _add_pond(pos: Vector3, radius: float) -> void:
	var pond := MeshInstance3D.new()
	pond.name = "Pond"
	var pond_mesh := CylinderMesh.new()
	pond_mesh.top_radius = radius
	pond_mesh.bottom_radius = radius + 0.5
	pond_mesh.height = 0.12
	pond_mesh.radial_segments = 48
	pond.mesh = pond_mesh
	var water_material := _material(Color("#286b78"), 0.18)
	water_material.metallic = 0.12
	pond.material_override = water_material
	pond.position = pos + Vector3.UP * 0.01
	stage_root.add_child(pond)


func _build_branch_sign() -> void:
	var branch: Dictionary = course.branches[0]
	var race_start := float(branch["race_start"])
	var fork_position: Vector3 = course.point_at(race_start)
	var sign := Label3D.new()
	sign.name = "BranchSign"
	sign.text = "わかれみち！\n青い道は 近道"
	sign.font = UI_FONT
	sign.font_size = 56
	sign.outline_size = 12
	sign.modulate = Color("#fff3a6")
	sign.position = fork_position + Vector3.UP * 3.6
	sign.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	sign.no_depth_test = true
	stage_root.add_child(sign)

	for local_progress in [0.07, 0.13, 0.19]:
		var center: Vector3 = course.branch_point(0, float(local_progress))
		var tangent: Vector3 = course.branch_tangent(0, float(local_progress))
		_add_box_mesh(
			"BranchGuide",
			Vector3(3.8, 0.055, 0.75),
			center + Vector3.UP * 0.135,
			Color("#69d8ee"),
			atan2(tangent.x, tangent.z)
		)


func _build_stage_three_obstacles() -> void:
	var branch_specs := [
		{"progress": 0.30, "lane": -2.5},
		{"progress": 0.53, "lane": 2.4},
		{"progress": 0.76, "lane": -2.1},
	]
	for spec_index in range(branch_specs.size()):
		var spec: Dictionary = branch_specs[spec_index]
		var progress := float(spec["progress"])
		var center: Vector3 = course.branch_point(0, progress)
		var tangent: Vector3 = course.branch_tangent(0, progress)
		var outward := Vector3(tangent.z, 0.0, -tangent.x)
		_add_obstacle(
			center + outward * float(spec["lane"]),
			tangent,
			Color("#bd6b35"),
			"ObstacleShortcut%d" % (spec_index + 1)
		)

	var main_progress := 0.64
	var main_center: Vector3 = course.point_at(main_progress)
	var main_tangent: Vector3 = course.tangent_at(main_progress)
	_add_obstacle(
		main_center + course.outward_at(main_progress) * 3.6,
		main_tangent,
		Color("#9b633d"),
		"ObstacleOuterRoute"
	)


func _add_obstacle(
		pos: Vector3,
		tangent: Vector3,
		color: Color,
		obstacle_name: String
	) -> void:
	var body := StaticBody3D.new()
	body.name = obstacle_name
	body.position = pos
	body.rotation.y = atan2(tangent.x, tangent.z)

	var size := Vector3(2.5, 1.55, 1.7)
	var mesh := _create_box_instance(size, color)
	mesh.position.y = size.y * 0.5
	body.add_child(mesh)
	var stripe := _create_box_instance(
		Vector3(size.x + 0.05, 0.24, size.z + 0.05),
		Color("#ffe58a")
	)
	stripe.position.y = size.y * 0.62
	body.add_child(stripe)

	var collision := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	collision.shape = shape
	collision.position.y = size.y * 0.5
	body.add_child(collision)
	stage_root.add_child(body)


func _build_windmill(pos: Vector3) -> void:
	var tower := MeshInstance3D.new()
	tower.name = "WindmillTower"
	var tower_mesh := CylinderMesh.new()
	tower_mesh.top_radius = 1.25
	tower_mesh.bottom_radius = 2.1
	tower_mesh.height = 8.0
	tower_mesh.radial_segments = 16
	tower.mesh = tower_mesh
	tower.material_override = _material(Color("#fff0d2"), 0.82)
	tower.position = pos + Vector3.UP * 4.0
	stage_root.add_child(tower)

	var roof := MeshInstance3D.new()
	var roof_mesh := CylinderMesh.new()
	roof_mesh.top_radius = 0.0
	roof_mesh.bottom_radius = 2.0
	roof_mesh.height = 2.2
	roof_mesh.radial_segments = 16
	roof.mesh = roof_mesh
	roof.material_override = _material(Color("#e65d67"), 0.65)
	roof.position = pos + Vector3.UP * 8.3
	stage_root.add_child(roof)

	var rotor := Node3D.new()
	rotor.name = "WindmillRotor"
	rotor.position = pos + Vector3(0, 6.5, 1.45)
	rotor.set_meta("rotates", true)
	for i in range(4):
		var blade := _create_box_instance(
			Vector3(0.42, 4.8, 0.20),
			Color("#f9dc73")
		)
		blade.position.y = 2.1
		blade.rotation_degrees.z = float(i) * 90.0
		rotor.add_child(blade)
	var hub := MeshInstance3D.new()
	var hub_mesh := SphereMesh.new()
	hub_mesh.radius = 0.55
	hub_mesh.height = 1.1
	hub.mesh = hub_mesh
	hub.material_override = _material(Color("#7e4a2e"), 0.72)
	rotor.add_child(hub)
	stage_root.add_child(rotor)


func _add_tree(pos: Vector3, tree_scale: float, variant: int) -> void:
	var tree := Node3D.new()
	tree.name = "Tree"
	tree.position = pos
	tree.scale = Vector3.ONE * tree_scale
	var trunk := MeshInstance3D.new()
	var trunk_mesh := CylinderMesh.new()
	trunk_mesh.top_radius = 0.25
	trunk_mesh.bottom_radius = 0.36
	trunk_mesh.height = 2.7
	trunk_mesh.radial_segments = 8
	trunk.mesh = trunk_mesh
	trunk.material_override = _material(Color("#815036"), 0.92)
	trunk.position.y = 1.35
	tree.add_child(trunk)
	var crown := MeshInstance3D.new()
	var crown_mesh := SphereMesh.new()
	crown_mesh.radius = 1.6
	crown_mesh.height = 3.1
	crown_mesh.radial_segments = 12
	crown_mesh.rings = 6
	crown.mesh = crown_mesh
	var green := Color("#3f9f59") if variant % 3 else Color("#65b94d")
	crown.material_override = _material(green, 0.88)
	crown.position = Vector3(0, 3.2, 0)
	crown.scale = Vector3(1.0, 0.86, 1.0)
	tree.add_child(crown)
	stage_root.add_child(tree)


func _add_flower_patch(pos: Vector3, variant: int) -> void:
	var colors := [Color("#ff7fa0"), Color("#ffd45e"), Color("#a983ff"), Color("#fff5ef")]
	var material := _material(colors[variant % colors.size()], 0.70)
	for j in range(4):
		var flower := MeshInstance3D.new()
		var flower_mesh := SphereMesh.new()
		flower_mesh.radius = 0.22
		flower_mesh.height = 0.34
		flower_mesh.radial_segments = 8
		flower_mesh.rings = 4
		flower.mesh = flower_mesh
		flower.material_override = material
		flower.position = pos + Vector3(
			sin(float(j) * 1.9) * 0.9,
			0.24,
			cos(float(j) * 1.7) * 0.9
		)
		stage_root.add_child(flower)


func _add_hill(pos: Vector3, size: float, variant: int) -> void:
	var hill := MeshInstance3D.new()
	hill.name = "Hill"
	var mesh := SphereMesh.new()
	mesh.radius = size
	mesh.height = size * 1.25
	mesh.radial_segments = 16
	mesh.rings = 8
	hill.mesh = mesh
	hill.material_override = _material(
		Color("#7a5942") if variant % 2 else Color("#4a3328"),
		0.98
	)
	hill.position = pos - Vector3.UP * (size * 0.32)
	hill.scale = Vector3(1.4, 0.72, 1.0)
	stage_root.add_child(hill)


func _build_racers() -> void:
	player = PlayerKart.new()
	player.name = "PlayerKart"
	add_child(player)
	player.configure_track(course)
	player.boost_triggered.connect(_on_player_boost)
	player.drift_boost_triggered.connect(_on_drift_boost)
	player.recovered.connect(_on_player_recovered)
	player.obstacle_hit.connect(_on_obstacle_hit)

	var ai_settings := [
		{
			"start": -0.010,
			"lane": -2.2,
			"speed": 20.2,
			"body": Color("#6d8cff"),
			"accent": Color("#f7ec72"),
			"cat": Color("#f7f2e9"),
			"phase": 0.6,
		},
		{
			"start": -0.021,
			"lane": 2.0,
			"speed": 19.8,
			"body": Color("#8bd06d"),
			"accent": Color("#fff2ad"),
			"cat": Color("#46424d"),
			"phase": 2.2,
		},
		{
			"start": -0.032,
			"lane": 0.0,
			"speed": 20.5,
			"body": Color("#b774e8"),
			"accent": Color("#74e4df"),
			"cat": Color("#dc9252"),
			"phase": 4.1,
		},
	]
	for i in range(ai_settings.size()):
		var data: Dictionary = ai_settings[i]
		var ai = AIKart.new()
		ai.name = "AIKart%d" % (i + 1)
		add_child(ai)
		ai.setup(
			course,
			data["start"],
			data["lane"],
			data["speed"],
			data["body"],
			data["accent"],
			data["cat"],
			data["phase"]
		)
		ai_karts.append(ai)


func _build_camera() -> void:
	camera = Camera3D.new()
	camera.name = "FollowCamera"
	camera.current = true
	camera.fov = 68.0
	camera.near = 0.12
	camera.far = 240.0
	add_child(camera)
	camera.global_position = Vector3(39, 7, -10)


func _build_audio() -> void:
	beep_generator = AudioStreamGenerator.new()
	beep_generator.mix_rate = 44100.0
	beep_generator.buffer_length = 0.45
	beep_player = AudioStreamPlayer.new()
	beep_player.name = "SynthEffects"
	beep_player.stream = beep_generator
	beep_player.playback_type = AudioServer.PLAYBACK_TYPE_STREAM
	beep_player.volume_db = -9.0
	add_child(beep_player)

	music_player = AudioStreamPlayer.new()
	music_player.name = "RaceBGM"
	music_player.stream = RACE_BGM
	music_player.volume_db = -15.0
	add_child(music_player)

	drift_player = AudioStreamPlayer.new()
	drift_player.name = "DriftSound"
	drift_player.stream = DRIFT_LOOP
	drift_player.volume_db = -11.0
	add_child(drift_player)

	turbo_player = AudioStreamPlayer.new()
	turbo_player.name = "TurboSound"
	turbo_player.stream = TURBO_SOUND
	turbo_player.volume_db = -5.0
	add_child(turbo_player)

func _build_ui() -> void:
	canvas = CanvasLayer.new()
	canvas.name = "UI"
	add_child(canvas)
	var root := Control.new()
	root.name = "UIRoot"
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var ui_theme := Theme.new()
	ui_theme.default_font = UI_FONT
	root.theme = ui_theme
	canvas.add_child(root)

	var hud_panel := PanelContainer.new()
	hud_panel.position = Vector2(18, 18)
	hud_panel.custom_minimum_size = Vector2(302, 176)
	hud_panel.add_theme_stylebox_override("panel", _panel_style(Color(0.08, 0.12, 0.22, 0.83), Color("#7ee8ff")))
	root.add_child(hud_panel)
	var hud_box := VBoxContainer.new()
	hud_box.add_theme_constant_override("separation", 2)
	hud_panel.add_child(hud_box)
	stage_hud_label = _make_label("コース1 シンプル", 19, Color("#ffd6b3"))
	lap_label = _make_label("ラップ 1 / 3", 26, Color.WHITE)
	time_label = _make_label("タイム 00:00.00", 24, Color("#dffcff"))
	speed_label = _make_label("スピード 0 km/h", 22, Color("#ffe681"))
	sparkle_label = _make_label("キラリ 0 / 20", 22, Color("#fff39c"))
	hud_box.add_child(stage_hud_label)
	hud_box.add_child(lap_label)
	hud_box.add_child(time_label)
	hud_box.add_child(speed_label)
	hud_box.add_child(sparkle_label)

	position_label = _make_label("1 / 4", 52, Color("#fff28b"))
	position_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	position_label.position = Vector2(520, 18)
	position_label.size = Vector2(240, 76)
	position_label.add_theme_color_override("font_outline_color", Color("#56378f"))
	position_label.add_theme_constant_override("outline_size", 12)
	root.add_child(position_label)

	message_label = _make_label("", 32, Color.WHITE)
	message_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	message_label.position = Vector2(390, 105)
	message_label.size = Vector2(500, 56)
	message_label.add_theme_color_override("font_outline_color", Color("#452d6e"))
	message_label.add_theme_constant_override("outline_size", 10)
	root.add_child(message_label)

	drift_label = _make_label("", 25, Color("#73fff4"))
	drift_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	drift_label.position = Vector2(440, 615)
	drift_label.size = Vector2(400, 50)
	drift_label.add_theme_color_override("font_outline_color", Color("#173c50"))
	drift_label.add_theme_constant_override("outline_size", 8)
	root.add_child(drift_label)

	mute_button = _make_button("おと：オン", Vector2(220, 88), Color("#63558f"), 24)
	mute_button.position = Vector2(1042, 18)
	mute_button.z_index = 120
	mute_button.pressed.connect(_toggle_sound)
	root.add_child(mute_button)
	var recover_button := _make_button("コースにもどる", Vector2(210, 58), Color("#397e91"), 20)
	recover_button.position = Vector2(1052, 88)
	recover_button.z_index = 30
	recover_button.pressed.connect(_recover_player)
	root.add_child(recover_button)

	_build_touch_controls(root)
	_build_title_overlay(root)
	_build_finish_overlay(root)

	countdown_label = _make_label("", 116, Color("#fff076"))
	countdown_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	countdown_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	countdown_label.position = Vector2(390, 210)
	countdown_label.size = Vector2(500, 260)
	countdown_label.add_theme_color_override("font_outline_color", Color("#5b3f91"))
	countdown_label.add_theme_constant_override("outline_size", 20)
	countdown_label.z_index = 40
	countdown_label.visible = false
	root.add_child(countdown_label)


func _build_touch_controls(root: Control) -> void:
	left_steering_area = _make_steering_area("←", Color(0.72, 0.18, 0.18, 0.035))
	left_steering_area.position = Vector2.ZERO
	left_steering_area.size = Vector2(640, 720)
	left_steering_area.z_index = -1
	root.add_child(left_steering_area)

	right_steering_area = _make_steering_area("→", Color(0.35, 0.12, 0.08, 0.045))
	right_steering_area.position = Vector2(640, 0)
	right_steering_area.size = Vector2(640, 720)
	right_steering_area.z_index = -1
	root.add_child(right_steering_area)

	left_drift_area = _make_drift_area(Color("#a83d63"))
	left_drift_area.position = LEFT_DRIFT_RECT.position
	left_drift_area.size = LEFT_DRIFT_RECT.size
	left_drift_area.z_index = 30
	root.add_child(left_drift_area)

	right_drift_area = _make_drift_area(Color("#7b3fa4"))
	right_drift_area.position = RIGHT_DRIFT_RECT.position
	right_drift_area.size = RIGHT_DRIFT_RECT.size
	right_drift_area.z_index = 30
	root.add_child(right_drift_area)


func _build_title_overlay(root: Control) -> void:
	title_overlay = ColorRect.new()
	title_overlay.name = "TitleOverlay"
	title_overlay.color = Color(0.10, 0.06, 0.05, 0.76)
	title_overlay.z_index = 100
	title_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.add_child(title_overlay)
	var panel := PanelContainer.new()
	panel.position = Vector2(40, 25)
	panel.custom_minimum_size = Vector2(1200, 670)
	panel.add_theme_stylebox_override("panel", _panel_style(Color("#fff8ed"), Color("#e3a958"), 28))
	title_overlay.add_child(panel)
	var box := VBoxContainer.new()
	box.alignment = BoxContainer.ALIGNMENT_CENTER
	box.add_theme_constant_override("separation", 7)
	panel.add_child(box)
	var title := _make_label("あそびかた と コースえらび", 42, Color("#643f99"))
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_color_override("font_outline_color", Color("#fff0a6"))
	title.add_theme_constant_override("outline_size", 9)
	box.add_child(title)
	var subtitle := _make_label("キラキラしっぽグランプリ　｜　3しゅう・じどうアクセル", 25, Color("#4d6572"))
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(subtitle)
	var instructions := _make_label(
		"左半分のどこでも おすと左へ　　右半分のどこでも おすと右へ\n"
		+ "右へドリフト：右半分をおしたまま＋左下　　左へ：左半分＋右下",
		28,
		Color("#6b536f")
	)
	instructions.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(instructions)
	var choose_label := _make_label("コースを えらぼう", 29, Color("#9a542f"))
	choose_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(choose_label)

	var stage_row := HBoxContainer.new()
	stage_row.alignment = BoxContainer.ALIGNMENT_CENTER
	stage_row.add_theme_constant_override("separation", 18)
	box.add_child(stage_row)
	stage_buttons.clear()
	for stage_index in range(3):
		var stage_button := _make_button(
			_stage_button_text(stage_index, false),
			Vector2(340, 134),
			Color("#8c6ab2"),
			28
		)
		stage_button.name = "StageButton%d" % (stage_index + 1)
		stage_button.pressed.connect(_select_stage.bind(stage_index))
		stage_row.add_child(stage_button)
		stage_buttons.append(stage_button)

	stage_description_label = _make_label("", 24, Color("#765844"))
	stage_description_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(stage_description_label)
	start_button = _make_button(
		"このコースで レーススタート！",
		Vector2(500, 94),
		Color("#e76155"),
		31
	)
	start_button.name = "RaceStartButton"
	start_button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	start_button.pressed.connect(_start_selected_stage)
	box.add_child(start_button)
	best_label = _make_label("", 21, Color("#8a6b4d"))
	best_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(best_label)
	var note := _make_label(
		"スマホは横向きがおすすめ　　PC：左右 / A D　　ドリフト：Space",
		20,
		Color("#847a72")
	)
	note.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(note)
	_refresh_stage_selection_ui()


func _build_finish_overlay(root: Control) -> void:
	finish_overlay = ColorRect.new()
	finish_overlay.name = "FinishOverlay"
	finish_overlay.color = Color(0.05, 0.08, 0.18, 0.72)
	finish_overlay.z_index = 100
	finish_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	finish_overlay.visible = false
	root.add_child(finish_overlay)
	var panel := PanelContainer.new()
	panel.position = Vector2(330, 130)
	panel.custom_minimum_size = Vector2(620, 460)
	panel.add_theme_stylebox_override("panel", _panel_style(Color("#fffaf0"), Color("#ffe063"), 30))
	finish_overlay.add_child(panel)
	var box := VBoxContainer.new()
	box.alignment = BoxContainer.ALIGNMENT_CENTER
	box.add_theme_constant_override("separation", 17)
	panel.add_child(box)
	finish_title = _make_label("ゴール！", 60, Color("#6844a4"))
	finish_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(finish_title)
	finish_detail = _make_label("", 27, Color("#614e62"))
	finish_detail.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(finish_detail)
	var celebrate := _make_label("さいごまで走れたね！", 28, Color("#d0664f"))
	celebrate.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(celebrate)
	var again_button := _make_button("同じコースでもう一度", Vector2(380, 72), Color("#ef7272"), 26)
	again_button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	again_button.pressed.connect(_restart_from_finish)
	box.add_child(again_button)
	var title_button := _make_button("操作説明・コース選択へ", Vector2(340, 62), Color("#66839d"), 22)
	title_button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	title_button.pressed.connect(_return_to_title)
	box.add_child(title_button)


func _reset_race() -> void:
	_clear_touch_controls()
	state = RaceState.TITLE
	elapsed_time = 0.0
	completed_laps = 0
	next_checkpoint = 1
	player_progress = 0.0
	final_place = 1
	countdown_time = 0.0
	reverse_timer = 0.0
	boost_pad_cooldown = 0.0
	collected_count = 0
	best_time = best_times[selected_stage]
	player.reset_at(0.0, 0.0)
	player.set_active(false)
	for i in range(ai_karts.size()):
		var starts := [-0.010, -0.021, -0.032]
		ai_karts[i].reset_to(starts[i])
	for item in sparkles:
		item["taken"] = false
		(item["node"] as Node3D).visible = true
	title_overlay.visible = true
	finish_overlay.visible = false
	countdown_label.visible = false
	message_label.text = ""
	drift_label.text = ""
	_refresh_stage_selection_ui()
	_update_hud()


func _select_stage(stage_index: int) -> void:
	if state != RaceState.TITLE:
		return
	stage_index = clampi(stage_index, 0, 2)
	if selected_stage != stage_index:
		selected_stage = stage_index
		course.configure(selected_stage)
		_build_stage_world()
		player.configure_track(course)
		for ai in ai_karts:
			ai.configure_track(course)
		_reset_race()
	else:
		_refresh_stage_selection_ui()


func _start_selected_stage() -> void:
	if state != RaceState.TITLE:
		return
	audio_unlocked = true
	_reset_for_countdown()
	_start_race()


func _stage_button_text(stage_index: int, selected: bool) -> String:
	var labels := [
		"1 シンプル\nはじめて向け",
		"2 ひょうたん\nくねくねカーブ",
		"3 わかれみち\n障害物に挑戦",
	]
	return labels[stage_index] + ("\nえらんだよ ✓" if selected else "\nタッチして選ぶ")


func _refresh_stage_selection_ui() -> void:
	if stage_description_label:
		var descriptions := [
			"大きなカーブ中心のシンプルなコース。まずはここから！",
			"中央がくびれた、ひょうたん型のくねくねコース。",
			"外回りか近道を選べるコース。近道には障害物！",
		]
		stage_description_label.text = descriptions[selected_stage]
	if best_label:
		best_time = best_times[selected_stage]
		best_label.text = (
			"%s のベスト：%s"
			% [
				course.stage_name,
				_format_time(best_time) if best_time > 0.0 else "まだありません",
			]
		)
	for index in range(stage_buttons.size()):
		var button := stage_buttons[index]
		var is_selected := index == selected_stage
		var color := Color("#d45d4f") if is_selected else Color("#7f6a9f")
		button.text = _stage_button_text(index, is_selected)
		button.add_theme_stylebox_override("normal", _button_style(color))
		button.add_theme_stylebox_override("hover", _button_style(color.lightened(0.08)))
		button.add_theme_stylebox_override("pressed", _button_style(color.darkened(0.10)))
		button.add_theme_color_override(
			"font_color",
			Color("#fff4b0") if is_selected else Color.WHITE
		)


func _start_race() -> void:
	_clear_touch_controls()
	title_overlay.visible = false
	finish_overlay.visible = false
	state = RaceState.COUNTDOWN
	countdown_time = 3.0
	countdown_last_number = 4
	countdown_label.visible = true
	countdown_label.text = "3"
	player.set_active(false)
	for ai in ai_karts:
		ai.set_active(false)


func _update_countdown(delta: float) -> void:
	countdown_time -= delta
	var number := int(ceil(maxf(countdown_time, 0.0)))
	if number > 0:
		countdown_label.text = str(number)
		if number != countdown_last_number:
			countdown_last_number = number
			_beep(470.0 + float(3 - number) * 70.0, 0.10, 0.34)
	else:
		countdown_label.text = "GO!"
		_beep(760.0, 0.20, 0.40)
		state = RaceState.RACING
		go_message_timer = 0.75
		player.set_active(true)
		for ai in ai_karts:
			ai.set_active(true)


func _update_race(delta: float) -> void:
	elapsed_time += delta
	if go_message_timer <= 0.0:
		countdown_label.visible = false
	for ai in ai_karts:
		ai.update_race(delta, player_progress, elapsed_time)
	_update_player_progress(delta)
	_update_collectibles(delta)
	_update_boost_pads()
	_update_ranking()
	_update_hud()


func _update_player_progress(delta: float) -> void:
	var lap_progress: float = player.get_track_progress()
	var previous_progress := fposmod(player_progress, 1.0)
	var progress_step := wrapf(lap_progress - previous_progress, -0.5, 0.5)
	player_progress += progress_step
	var sector := int(floor(lap_progress * float(CHECKPOINT_COUNT))) % CHECKPOINT_COUNT
	if sector == next_checkpoint:
		if next_checkpoint == 0:
			completed_laps += 1
			next_checkpoint = 1
			if completed_laps >= TOTAL_LAPS:
				_finish_race()
				return
			message_label.text = "%dしゅう目 クリア！" % completed_laps
			_beep(700.0, 0.18, 0.34)
		else:
			next_checkpoint = (next_checkpoint + 1) % CHECKPOINT_COUNT
	var tangent: Vector3 = player.get_course_tangent()
	var facing_forward: float = player.get_forward().dot(tangent)
	if facing_forward < -0.20 and player.speed > 5.0:
		reverse_timer += delta
	else:
		reverse_timer = maxf(0.0, reverse_timer - delta * 2.0)
	if reverse_timer > 1.5:
		message_label.text = "はんたいだよ"
	elif player.offroad:
		message_label.text = "コースへ ゆっくりもどろう"
	elif go_message_timer <= 0.0 and not message_label.text.contains("しゅう目"):
		message_label.text = ""
	if message_label.text.contains("しゅう目") and int(elapsed_time * 2.0) % 5 == 0:
		message_label.text = ""


func _update_collectibles(delta: float) -> void:
	for item in sparkles:
		if item["taken"]:
			continue
		var node := item["node"] as Node3D
		node.rotate_y(delta * 2.2)
		node.position.y = float(item["position"].y) + sin(elapsed_time * 3.0 + node.position.x) * 0.12
		if player.global_position.distance_to(node.global_position) < 2.1:
			item["taken"] = true
			node.visible = false
			collected_count += 1
			player.give_boost(0.18)
			_beep(900.0 + float(collected_count % 5) * 80.0, 0.07, 0.24)


func _update_boost_pads() -> void:
	if boost_pad_cooldown > 0.0:
		return
	for pad in boost_pads:
		var pos: Vector3 = pad["position"]
		if player.global_position.distance_to(pos) < 2.7:
			player.give_boost(0.95)
			boost_pad_cooldown = 1.1
			message_label.text = "ターボ！"
			return


func _update_ranking() -> void:
	var place := 1
	for ai in ai_karts:
		if ai.race_distance > player_progress:
			place += 1
	final_place = place


func _finish_race() -> void:
	_clear_touch_controls()
	state = RaceState.FINISHED
	player.set_active(false)
	_update_ranking()
	final_place = clampi(final_place, 1, 4)
	if best_time <= 0.0 or elapsed_time < best_time:
		best_time = elapsed_time
		best_times[selected_stage] = best_time
		_save_best_time()
	finish_title.text = "ゴール！ %dい！" % final_place
	finish_detail.text = (
		"%s\nタイム　%s\nキラリ　%d / %d\nベスト　%s"
		% [
			course.stage_name,
			_format_time(elapsed_time),
			collected_count,
			sparkles.size(),
			_format_time(best_time),
		]
	)
	finish_overlay.visible = true
	countdown_label.visible = false
	_beep(820.0, 0.34, 0.44)


func _update_hud() -> void:
	var shown_lap := mini(completed_laps + 1, TOTAL_LAPS)
	stage_hud_label.text = "コース%d　%s" % [selected_stage + 1, course.stage_name]
	lap_label.text = "ラップ %d / %d" % [shown_lap, TOTAL_LAPS]
	time_label.text = "タイム " + _format_time(elapsed_time)
	speed_label.text = "スピード %d km/h" % int(player.speed * 3.6)
	sparkle_label.text = "キラリ %d / %d" % [collected_count, sparkles.size()]
	position_label.text = "%d / 4" % final_place
	if player.is_drifting:
		var charge := clampf(player.drift_charge / 1.4, 0.0, 1.0)
		drift_label.text = "ドリフト " + "★".repeat(1 + int(charge * 2.0))
	elif player.boost_timer > 0.0:
		drift_label.text = "ミニターボ！"
	else:
		drift_label.text = ""


func _update_camera(delta: float) -> void:
	if not player or not camera:
		return
	var forward: Vector3 = player.get_forward()
	var target: Vector3 = player.global_position + forward * 3.6 + Vector3.UP * 1.6
	var desired: Vector3 = player.global_position - forward * 9.2 + Vector3.UP * 5.1
	var smooth := 1.0 - exp(-delta * 6.0)
	camera.global_position = camera.global_position.lerp(desired, smooth)
	camera_target_position = camera_target_position.lerp(target, smooth)
	camera.look_at(camera_target_position, Vector3.UP)
	camera.fov = lerpf(camera.fov, 75.0 if player.boost_timer > 0.0 else 68.0, delta * 4.0)


func _animate_world(delta: float) -> void:
	if stage_root:
		for child in stage_root.get_children():
			if child is Node3D and child.has_meta("rotates"):
				child.rotate_z(delta * 0.48)
	for pad in boost_pads:
		var node := pad["node"] as MeshInstance3D
		node.scale.y = 1.0 + sin(Time.get_ticks_msec() * 0.006 + node.position.x) * 0.10


func _touch_role_for_position(position: Vector2) -> StringName:
	if position.x < 0.0 or position.x > 1280.0 or position.y < 0.0 or position.y > 720.0:
		return &""
	if LEFT_DRIFT_RECT.has_point(position):
		return &"drift_left"
	if RIGHT_DRIFT_RECT.has_point(position):
		return &"drift_right"
	if TOP_RIGHT_CONTROLS_RECT.has_point(position):
		return &""
	return &"left" if position.x < 640.0 else &"right"


func _sync_touch_controls() -> void:
	var left_pressed := false
	var right_pressed := false
	var left_drift_pressed := false
	var right_drift_pressed := false
	for role in active_touches.values():
		match role:
			&"left":
				left_pressed = true
			&"right":
				right_pressed = true
			&"drift_left":
				left_drift_pressed = true
			&"drift_right":
				right_drift_pressed = true
	if player:
		player.set_touch_control(&"left", left_pressed)
		player.set_touch_control(&"right", right_pressed)
		player.set_touch_control(&"drift_left", left_drift_pressed)
		player.set_touch_control(&"drift_right", right_drift_pressed)
	if left_steering_area:
		left_steering_area.modulate = Color("#ffd4d4") if left_pressed else Color.WHITE
	if right_steering_area:
		right_steering_area.modulate = Color("#ffd8c8") if right_pressed else Color.WHITE
	if left_drift_area:
		left_drift_area.modulate = Color("#ffd4ea") if left_drift_pressed else Color.WHITE
	if right_drift_area:
		right_drift_area.modulate = Color("#ead5ff") if right_drift_pressed else Color.WHITE


func _clear_touch_controls() -> void:
	active_touches.clear()
	_sync_touch_controls()


func _recover_player() -> void:
	if player and state in [RaceState.COUNTDOWN, RaceState.RACING]:
		player.recover_to_track()


func _restart_from_finish() -> void:
	_reset_for_countdown()
	_start_race()


func _return_to_title() -> void:
	_reset_race()


func _reset_for_countdown() -> void:
	_clear_touch_controls()
	elapsed_time = 0.0
	completed_laps = 0
	next_checkpoint = 1
	player_progress = 0.0
	final_place = 1
	reverse_timer = 0.0
	boost_pad_cooldown = 0.0
	collected_count = 0
	player.reset_at(0.0, 0.0)
	for i in range(ai_karts.size()):
		var starts := [-0.010, -0.021, -0.032]
		ai_karts[i].reset_to(starts[i])
	for item in sparkles:
		item["taken"] = false
		(item["node"] as Node3D).visible = true
	finish_overlay.visible = false
	message_label.text = ""
	drift_label.text = ""
	_update_hud()


func _toggle_sound() -> void:
	sound_enabled = not sound_enabled
	if sound_enabled:
		mute_button.text = "おと：オン"
		mute_button.add_theme_color_override("font_color", Color("#fff7bf"))
		audio_unlocked = true
		music_player.play()
		_beep(660.0, 0.13, 0.35)
	else:
		mute_button.text = "おと：オフ"
		mute_button.add_theme_color_override("font_color", Color.WHITE)
		beep_player.stop()
		music_player.stop()
		drift_player.stop()
		turbo_player.stop()


func _update_audio_state() -> void:
	if not sound_enabled:
		return
	if not audio_unlocked:
		return
	if music_player and not music_player.playing:
		music_player.play()
	var should_play_drift: bool = (
		state == RaceState.RACING
		and player
		and player.is_drifting
	)
	if should_play_drift:
		if not drift_player.playing:
			drift_player.play()
		var charge: float = clampf(player.drift_charge / 1.8, 0.0, 1.0)
		drift_player.pitch_scale = lerpf(0.92, 1.16, charge)
		drift_player.volume_db = lerpf(-12.0, -7.5, charge)
	elif drift_player and drift_player.playing:
		drift_player.stop()


func _on_player_boost() -> void:
	_beep(620.0, 0.11, 0.25)


func _on_drift_boost() -> void:
	if not sound_enabled:
		return
	beep_player.stop()
	drift_player.stop()
	turbo_player.stop()
	turbo_player.play()


func _on_player_recovered() -> void:
	if state == RaceState.RACING:
		message_label.text = "コースにもどったよ"
		_beep(390.0, 0.10, 0.22)


func _on_obstacle_hit() -> void:
	if state == RaceState.RACING:
		message_label.text = "しょうがいぶつ！"
		_beep(210.0, 0.16, 0.30)


func _beep(frequency: float, duration: float, volume: float) -> void:
	if not sound_enabled or not audio_unlocked or not beep_player:
		return
	beep_player.stop()
	beep_player.play()
	var playback := beep_player.get_stream_playback() as AudioStreamGeneratorPlayback
	if playback == null:
		return
	var frames := int(beep_generator.mix_rate * duration)
	for i in range(frames):
		var t := float(i) / beep_generator.mix_rate
		var envelope := 1.0 - float(i) / float(frames)
		var sample := sin(TAU * frequency * t) * volume * envelope
		playback.push_frame(Vector2(sample, sample))


func _load_best_time() -> void:
	var config := ConfigFile.new()
	if config.load("user://kirakira_shippo_settings.cfg") == OK:
		var legacy_best := float(config.get_value("records", "best_time", 0.0))
		for index in range(3):
			var fallback := legacy_best if index == 0 else 0.0
			best_times[index] = float(
				config.get_value(
					"records",
					"best_time_stage_%d" % (index + 1),
					fallback
				)
			)
	best_time = best_times[selected_stage]
	sound_enabled = true


func _save_best_time() -> void:
	var config := ConfigFile.new()
	for index in range(3):
		config.set_value(
			"records",
			"best_time_stage_%d" % (index + 1),
			best_times[index]
		)
	config.set_value("records", "best_time", best_times[0])
	config.save("user://kirakira_shippo_settings.cfg")


func _format_time(seconds: float) -> String:
	var minutes := int(seconds) / 60
	var whole_seconds := int(seconds) % 60
	var hundredths := int(seconds * 100.0) % 100
	return "%02d:%02d.%02d" % [minutes, whole_seconds, hundredths]


func _surface_vertex(surface: SurfaceTool, vertex: Vector3, uv: Vector2) -> void:
	surface.set_normal(Vector3.UP)
	surface.set_uv(uv)
	surface.add_vertex(vertex)


func _add_box_mesh(
		node_name: String,
		size: Vector3,
		pos: Vector3,
		color: Color,
		yaw: float
	) -> MeshInstance3D:
	var instance := _create_box_instance(size, color)
	instance.name = node_name
	instance.position = pos
	instance.rotation.y = yaw
	stage_root.add_child(instance)
	return instance


func _create_box_instance(size: Vector3, color: Color) -> MeshInstance3D:
	var instance := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	instance.mesh = mesh
	instance.material_override = _material(color, 0.72)
	return instance


func _material(color: Color, roughness: float) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.roughness = roughness
	return material


func _make_label(text_value: String, font_size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = text_value
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	return label


func _make_button(
		text_value: String,
		minimum_size: Vector2,
		color: Color,
		font_size: int
	) -> Button:
	var button := Button.new()
	button.text = text_value
	button.custom_minimum_size = minimum_size
	button.add_theme_font_size_override("font_size", font_size)
	button.add_theme_color_override("font_color", Color.WHITE)
	button.add_theme_color_override("font_hover_color", Color.WHITE)
	button.add_theme_color_override("font_pressed_color", Color("#fff4b0"))
	button.add_theme_stylebox_override("normal", _button_style(color))
	button.add_theme_stylebox_override("hover", _button_style(color.lightened(0.10)))
	button.add_theme_stylebox_override("pressed", _button_style(color.darkened(0.10)))
	button.focus_mode = Control.FOCUS_NONE
	return button


func _make_steering_area(symbol: String, tint: Color) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var style := StyleBoxFlat.new()
	style.bg_color = tint
	style.border_width_left = 1
	style.border_width_right = 1
	style.border_color = Color(1.0, 0.86, 0.82, 0.08)
	panel.add_theme_stylebox_override("panel", style)
	var label := _make_label(symbol, 108, Color(1.0, 0.92, 0.88, 0.17))
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	label.add_theme_color_override("font_outline_color", Color(0.18, 0.04, 0.03, 0.24))
	label.add_theme_constant_override("outline_size", 6)
	panel.add_child(label)
	return panel


func _make_drift_area(color: Color) -> Button:
	var button := _make_button("ドリフト", Vector2(250, 132), color, 29)
	button.mouse_filter = Control.MOUSE_FILTER_IGNORE
	button.add_theme_color_override("font_outline_color", Color(0.12, 0.03, 0.12, 0.50))
	button.add_theme_constant_override("outline_size", 5)
	return button


func _button_style(color: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.corner_radius_top_left = 18
	style.corner_radius_top_right = 18
	style.corner_radius_bottom_left = 18
	style.corner_radius_bottom_right = 18
	style.border_width_left = 3
	style.border_width_top = 3
	style.border_width_right = 3
	style.border_width_bottom = 3
	style.border_color = color.lightened(0.23)
	style.shadow_color = Color(0.04, 0.05, 0.12, 0.35)
	style.shadow_size = 7
	style.content_margin_left = 12
	style.content_margin_right = 12
	style.content_margin_top = 8
	style.content_margin_bottom = 8
	return style


func _panel_style(
		color: Color,
		border_color: Color,
		radius: int = 20
	) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.corner_radius_top_left = radius
	style.corner_radius_top_right = radius
	style.corner_radius_bottom_left = radius
	style.corner_radius_bottom_right = radius
	style.border_width_left = 4
	style.border_width_top = 4
	style.border_width_right = 4
	style.border_width_bottom = 4
	style.border_color = border_color
	style.shadow_color = Color(0.02, 0.04, 0.10, 0.35)
	style.shadow_size = 12
	style.content_margin_left = 24
	style.content_margin_right = 24
	style.content_margin_top = 20
	style.content_margin_bottom = 20
	return style
