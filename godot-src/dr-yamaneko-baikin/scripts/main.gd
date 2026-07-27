extends Node3D

enum ScreenState {
	AUDIO_GATE,
	TITLE,
	MAP,
	BRIEF,
	PLAYING,
	PAUSED,
	RESULT,
	GAME_OVER,
	ENDING,
	SETTINGS
}

const SAVE_PATH := "user://dr_yamaneko_save.json"
const VOICE_MANIFEST := "res://assets/voice/voice_manifest.json"
const DR_IMAGE := "res://assets/images/dr_yamaneko.jpg"
const FONT_PATH := "res://assets/fonts/KosugiMaru-Regular.ttf"
const MAX_ACTIVE_ENEMIES := 6

const STAGES := [
	{
		"title": "手あらいラボ",
		"number": "01",
		"tag": "HAND WASH LAB",
		"goal": "かくれた バイキンを 10たい ピカピカにしよう！",
		"lesson": "せっけんで、ゆびの あいだまで ていねいに あらおうね。",
		"count": 10,
		"intro": ["ST1_001", "ST1_002"],
		"start_voice": ["ST1_003"],
		"hint": "ST1_004",
		"clear": ["ST1_005", "ST1_006"],
		"sky": "#073C4A",
		"floor": "#B8F4E7",
		"accent": "#20D7B0"
	},
	{
		"title": "はみがき洞窟",
		"number": "02",
		"tag": "TOOTH CAVE",
		"goal": "ひかる よごれを 6こ みつけて きれいにしよう！",
		"lesson": "はぶらしを ちいさく うごかして、おくばまで みがこうね。",
		"count": 6,
		"intro": ["ST2_001", "ST2_002"],
		"start_voice": ["ST2_003"],
		"hint": "ST2_004",
		"clear": ["ST2_005", "ST2_006"],
		"sky": "#102B52",
		"floor": "#F7F0D7",
		"accent": "#70D6FF"
	},
	{
		"title": "おさらピカピカ工場",
		"number": "03",
		"tag": "DISH FACTORY",
		"goal": "よごれた おさらだけを 12まい あらおう！",
		"lesson": "おうちの ひとと、せんざいで あらって よく すすごうね。",
		"count": 12,
		"intro": ["ST3_001", "ST3_002", "ST3_003"],
		"start_voice": [],
		"hint": "ST3_005",
		"clear": ["ST3_006", "ST3_007"],
		"sky": "#122A35",
		"floor": "#9EE7E5",
		"accent": "#FFB84D"
	},
	{
		"title": "おなかフローラガーデン",
		"number": "04",
		"tag": "FLORA GARDEN",
		"goal": "みかたの きんを まもって、いたずらきんを 8たい きれいにしよう！",
		"lesson": "おなかには、からだを たすける きんも いるよ。",
		"count": 8,
		"intro": ["ST4_001", "ST4_002"],
		"start_voice": ["ST4_003", "ST4_004"],
		"hint": "ST4_006",
		"clear": ["ST4_007", "ST4_008"],
		"sky": "#193A34",
		"floor": "#B7E58C",
		"accent": "#9A7BFF"
	},
	{
		"title": "バイキン大王の秘密基地",
		"number": "05",
		"tag": "FINAL BASE",
		"goal": "4つの よごれコアと バイキン大王を ピカピカにしよう！",
		"lesson": "まいにちの 手あらい、歯みがき、きれいな おさらを たいせつに。",
		"count": 5,
		"intro": ["ST5_001", "ST5_002"],
		"start_voice": ["ST5_003"],
		"hint": "ST5_005",
		"clear": ["ST5_007", "ST5_008"],
		"sky": "#070D2B",
		"floor": "#18274C",
		"accent": "#22E4FF"
	}
]

var rng := RandomNumberGenerator.new()
var game_font: Font
var state := ScreenState.AUDIO_GATE
var current_stage := 0
var stars := 3
var cleaned_count := 0
var target_total := 0
var wrong_hits := 0
var combo := 0
var sparkle_gauge := 0.0
var fever_time := 0.0
var stage_elapsed := 0.0
var last_action_time := 0.0
var hint_played := false
var damage_cooldown := 0.0
var shot_cooldown := 0.0
var fire_held := false
var audio_unlocked := false
var orientation_blocked := false
var resume_after_orientation := false
var settings_from_pause := false
var voice_generation := 0

var save_data := {
	"version": 1,
	"unlocked": 0,
	"medals": [0, 0, 0, 0, 0],
	"tutorial_done": false,
	"voice": true,
	"bgm": true,
	"reduced_motion": false
}

var world_root: Node3D
var stage_root: Node3D
var player: CharacterBody3D
var camera: Camera3D
var environment: Environment
var yaw := 0.0
var pitch := -0.05
var move_vector := Vector2.ZERO
var move_touch_id := -1
var look_touch_id := -1
var move_origin := Vector2.ZERO
var targets: Array[Dictionary] = []
var pending_spawns: Array[Dictionary] = []
var boss_spawned := false
var material_cache := {}

var ui_root: Control
var audio_gate: Control
var title_screen: Control
var map_screen: Control
var brief_screen: Control
var settings_screen: Control
var result_screen: Control
var game_over_screen: Control
var ending_screen: Control
var pause_screen: Control
var confirm_screen: Control
var orientation_guard: Control
var countdown_overlay: Control
var hud: Control

var title_continue_button: Button
var map_stage_row: HBoxContainer
var brief_number: Label
var brief_title: Label
var brief_tag: Label
var brief_goal: Label
var brief_start_button: Button
var settings_voice_button: Button
var settings_bgm_button: Button
var settings_motion_button: Button
var result_title: Label
var result_medals: Label
var result_lesson: Label
var result_next_button: Button
var confirm_label: Label
var confirm_action: Callable

var hud_stage: Label
var hud_stars: Label
var hud_remaining: Label
var hud_gauge: ProgressBar
var reticle: Label
var caption_panel: Panel
var caption_label: Label
var caption_timer := 0.0
var joystick_base: Panel
var joystick_knob: Panel
var fire_button: Button
var countdown_label: Label

var voice_catalog := {}
var voice_queue: Array[String] = []
var voice_player: AudioStreamPlayer
var bgm_player: AudioStreamPlayer
var sfx_players: Array[AudioStreamPlayer] = []
var shot_sound: AudioStreamWAV
var hit_sound: AudioStreamWAV
var clean_sound: AudioStreamWAV
var hurt_sound: AudioStreamWAV
var click_sound: AudioStreamWAV


func _ready() -> void:
	rng.randomize()
	game_font = load(FONT_PATH)
	_load_voice_catalog()
	_load_save()
	_create_audio()
	_create_world()
	_create_ui()
	get_viewport().size_changed.connect(_on_viewport_resized)
	_show_audio_gate()
	_on_viewport_resized()


func _process(delta: float) -> void:
	if caption_timer > 0.0:
		caption_timer -= delta
		if caption_timer <= 0.0 and not voice_player.playing and voice_queue.is_empty():
			caption_panel.visible = false

	if state != ScreenState.PLAYING or orientation_blocked:
		return

	stage_elapsed += delta
	damage_cooldown = maxf(0.0, damage_cooldown - delta)
	shot_cooldown = maxf(0.0, shot_cooldown - delta)
	fever_time = maxf(0.0, fever_time - delta)
	if fever_time <= 0.0 and sparkle_gauge >= 100.0:
		sparkle_gauge = 0.0
	_update_gauge()

	if fire_held and shot_cooldown <= 0.0:
		_shoot_once()
		shot_cooldown = 0.075 if fever_time > 0.0 else 0.13

	_update_targets(delta)
	_check_player_damage()
	_update_reticle()

	if not hint_played and stage_elapsed - last_action_time > 12.0:
		hint_played = true
		_queue_voices([str(STAGES[current_stage]["hint"])], false)


func _physics_process(_delta: float) -> void:
	if state != ScreenState.PLAYING or orientation_blocked:
		if is_instance_valid(player):
			player.velocity = Vector3.ZERO
		return

	var keyboard := Vector2.ZERO
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		keyboard.x -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		keyboard.x += 1.0
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
		keyboard.y -= 1.0
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		keyboard.y += 1.0
	if keyboard.length() > 1.0:
		keyboard = keyboard.normalized()

	var input_vector := move_vector if move_vector.length() > 0.05 else keyboard
	var forward := -player.global_transform.basis.z
	forward.y = 0.0
	forward = forward.normalized()
	var right := player.global_transform.basis.x
	right.y = 0.0
	right = right.normalized()
	var direction := right * input_vector.x + forward * -input_vector.y
	if direction.length() > 1.0:
		direction = direction.normalized()

	player.velocity.x = direction.x * 5.2
	player.velocity.z = direction.z * 5.2
	player.velocity.y = -0.5
	player.move_and_slide()
	player.position.x = clampf(player.position.x, -12.8, 12.8)
	player.position.z = clampf(player.position.z, -10.8, 10.8)


func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE:
			if state == ScreenState.PLAYING:
				_pause_game()
			elif state == ScreenState.PAUSED:
				_resume_countdown()
		elif state in [ScreenState.MAP, ScreenState.BRIEF, ScreenState.SETTINGS]:
				_show_title()
		if event.keycode == KEY_SPACE and state == ScreenState.PLAYING:
			fire_held = true
	if event is InputEventKey and not event.pressed and event.keycode == KEY_SPACE:
		fire_held = false

	if state != ScreenState.PLAYING or orientation_blocked:
		return

	if event is InputEventMouseMotion and Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT):
		_apply_look_delta(event.relative)
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if not fire_button.get_global_rect().has_point(event.position):
			fire_held = event.pressed

	if event is InputEventScreenTouch:
		var viewport_size := get_viewport().get_visible_rect().size
		if event.pressed:
			if fire_button.get_global_rect().has_point(event.position):
				return
			if event.position.x < viewport_size.x * 0.42 and event.position.y > viewport_size.y * 0.43 and move_touch_id < 0:
				move_touch_id = event.index
				move_origin = event.position
				_update_joystick(event.position)
			elif event.position.x > viewport_size.x * 0.38 and look_touch_id < 0:
				look_touch_id = event.index
		else:
			if event.index == move_touch_id:
				move_touch_id = -1
				move_vector = Vector2.ZERO
				_reset_joystick()
			if event.index == look_touch_id:
				look_touch_id = -1
	elif event is InputEventScreenDrag:
		if event.index == move_touch_id:
			_update_joystick(event.position)
		elif event.index == look_touch_id:
			_apply_look_delta(event.relative)


func _notification(what: int) -> void:
	if what in [NOTIFICATION_APPLICATION_FOCUS_OUT, NOTIFICATION_APPLICATION_PAUSED]:
		if state == ScreenState.PLAYING:
			_pause_game()


func _load_voice_catalog() -> void:
	if not FileAccess.file_exists(VOICE_MANIFEST):
		return
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(VOICE_MANIFEST))
	if parsed is Array:
		for item in parsed:
			if item is Dictionary and item.has("id"):
				voice_catalog[str(item["id"])] = item


func _load_save() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(SAVE_PATH))
	if parsed is not Dictionary:
		return
	for key in save_data.keys():
		if parsed.has(key):
			save_data[key] = parsed[key]
	if save_data["medals"] is not Array or save_data["medals"].size() != 5:
		save_data["medals"] = [0, 0, 0, 0, 0]
	save_data["unlocked"] = clampi(int(save_data["unlocked"]), 0, 4)


func _save_progress() -> bool:
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		_queue_voices(["CMN_021"])
		return false
	file.store_string(JSON.stringify(save_data))
	file.close()
	return true


func _create_audio() -> void:
	voice_player = AudioStreamPlayer.new()
	voice_player.name = "Voice"
	add_child(voice_player)
	voice_player.finished.connect(_play_next_voice)

	bgm_player = AudioStreamPlayer.new()
	bgm_player.name = "BGM"
	bgm_player.volume_db = -18.0
	bgm_player.stream = _make_bgm()
	add_child(bgm_player)

	for i in range(4):
		var player_node := AudioStreamPlayer.new()
		player_node.name = "SFX%d" % i
		player_node.volume_db = -8.0
		add_child(player_node)
		sfx_players.append(player_node)

	shot_sound = _make_tone(620.0, 0.10, 0.18, 920.0)
	hit_sound = _make_tone(760.0, 0.12, 0.20, 1140.0)
	clean_sound = _make_chime([784.0, 988.0, 1318.0], 0.13, 0.22)
	hurt_sound = _make_tone(240.0, 0.24, 0.18, 180.0)
	click_sound = _make_tone(520.0, 0.07, 0.13, 660.0)


func _make_tone(start_hz: float, duration: float, volume: float, end_hz: float) -> AudioStreamWAV:
	var rate := 22050
	var count := int(rate * duration)
	var bytes := PackedByteArray()
	bytes.resize(count * 2)
	for i in range(count):
		var t := float(i) / float(rate)
		var p := float(i) / float(maxi(1, count - 1))
		var hz := lerpf(start_hz, end_hz, p)
		var envelope := sin(PI * p)
		var sample := int(sin(TAU * hz * t) * 32767.0 * volume * envelope)
		bytes.encode_s16(i * 2, sample)
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = rate
	stream.stereo = false
	stream.data = bytes
	return stream


func _make_chime(notes: Array, note_duration: float, volume: float) -> AudioStreamWAV:
	var rate := 22050
	var count := int(rate * note_duration * notes.size())
	var bytes := PackedByteArray()
	bytes.resize(count * 2)
	for i in range(count):
		var note_index := mini(int(float(i) / (rate * note_duration)), notes.size() - 1)
		var local_index := i - int(note_index * rate * note_duration)
		var p := float(local_index) / float(rate * note_duration)
		var envelope := exp(-3.2 * p) * minf(1.0, p * 18.0)
		var sample := int(sin(TAU * float(notes[note_index]) * float(i) / float(rate)) * 32767.0 * volume * envelope)
		bytes.encode_s16(i * 2, sample)
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = rate
	stream.stereo = false
	stream.data = bytes
	return stream


func _make_bgm() -> AudioStreamWAV:
	var rate := 22050
	var duration := 8.0
	var count := int(rate * duration)
	var notes := [261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 293.66, 392.00]
	var bytes := PackedByteArray()
	bytes.resize(count * 2)
	for i in range(count):
		var t := float(i) / float(rate)
		var beat := int(t * 2.0) % notes.size()
		var phase := fmod(t * 2.0, 1.0)
		var env := 0.35 + 0.65 * exp(-4.0 * phase)
		var base := sin(TAU * float(notes[beat]) * t)
		var pad := sin(TAU * float(notes[beat]) * 0.5 * t) * 0.35
		var sample := int((base + pad) * 32767.0 * 0.075 * env)
		bytes.encode_s16(i * 2, sample)
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = rate
	stream.stereo = false
	stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
	stream.loop_begin = 0
	stream.loop_end = count
	stream.data = bytes
	return stream


func _play_sfx(stream: AudioStream) -> void:
	if not audio_unlocked:
		return
	for player_node in sfx_players:
		if not player_node.playing:
			player_node.stream = stream
			player_node.play()
			return
	sfx_players[0].stream = stream
	sfx_players[0].play()


func _queue_voices(ids: Array, clear_existing: bool = true) -> void:
	voice_generation += 1
	if clear_existing:
		voice_queue.clear()
		voice_player.stop()
	for id_value in ids:
		var id := str(id_value)
		if voice_catalog.has(id):
			voice_queue.append(id)
	if not voice_player.playing:
		_play_next_voice()


func _play_next_voice() -> void:
	if voice_queue.is_empty():
		if bool(save_data["bgm"]) and bgm_player.playing:
			bgm_player.volume_db = -18.0
		return
	var id: String = voice_queue.pop_front()
	var entry: Dictionary = voice_catalog[id]
	_show_caption(str(entry.get("text", "")), 5.0)
	if not audio_unlocked or not bool(save_data["voice"]):
		var generation_at_start := voice_generation
		get_tree().create_timer(2.6).timeout.connect(func():
			if generation_at_start == voice_generation:
				_play_next_voice()
		)
		return
	var file_path := str(entry.get("file", ""))
	if not ResourceLoader.exists(file_path):
		_play_next_voice()
		return
	if bool(save_data["bgm"]) and bgm_player.playing:
		bgm_player.volume_db = -25.0
	voice_player.stream = load(file_path)
	voice_player.play()


func _create_world() -> void:
	world_root = Node3D.new()
	world_root.name = "World"
	add_child(world_root)

	var world_environment := WorldEnvironment.new()
	environment = Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = Color("#073C4A")
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color("#D8FFF5")
	environment.ambient_light_energy = 0.78
	environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	world_environment.environment = environment
	world_root.add_child(world_environment)

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-55.0, -35.0, 0.0)
	sun.light_color = Color("#FFF4D6")
	sun.light_energy = 0.82
	sun.shadow_enabled = false
	world_root.add_child(sun)

	stage_root = Node3D.new()
	stage_root.name = "Stage"
	world_root.add_child(stage_root)

	player = CharacterBody3D.new()
	player.name = "PlayerRig"
	player.collision_layer = 1
	player.collision_mask = 1
	world_root.add_child(player)

	var player_shape := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.42
	capsule.height = 1.7
	player_shape.shape = capsule
	player_shape.position.y = 0.85
	player.add_child(player_shape)

	camera = Camera3D.new()
	camera.name = "Camera"
	camera.position = Vector3(0.0, 1.55, 0.0)
	camera.fov = 68.0
	camera.current = true
	player.add_child(camera)

	_add_blaster_visual()
	world_root.visible = false


func _add_blaster_visual() -> void:
	var body_mesh := MeshInstance3D.new()
	var body_box := BoxMesh.new()
	body_box.size = Vector3(0.28, 0.26, 0.72)
	body_mesh.mesh = body_box
	body_mesh.position = Vector3(0.46, -0.36, -0.83)
	body_mesh.rotation_degrees = Vector3(-12.0, -8.0, 0.0)
	body_mesh.material_override = _material("#13B99A", 0.15)
	camera.add_child(body_mesh)

	var nozzle := MeshInstance3D.new()
	var nozzle_mesh := CylinderMesh.new()
	nozzle_mesh.top_radius = 0.12
	nozzle_mesh.bottom_radius = 0.16
	nozzle_mesh.height = 0.48
	nozzle_mesh.radial_segments = 12
	nozzle.mesh = nozzle_mesh
	nozzle.position = Vector3(0.46, -0.30, -1.18)
	nozzle.rotation_degrees.x = 90.0
	nozzle.material_override = _material("#FFB44A", 0.2)
	camera.add_child(nozzle)


func _create_ui() -> void:
	ui_root = Control.new()
	ui_root.name = "UI"
	ui_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ui_root.theme = Theme.new()
	ui_root.theme.default_font = game_font
	ui_root.theme.default_font_size = 24
	add_child(ui_root)

	audio_gate = _build_audio_gate()
	title_screen = _build_title_screen()
	map_screen = _build_map_screen()
	brief_screen = _build_brief_screen()
	settings_screen = _build_settings_screen()
	result_screen = _build_result_screen()
	game_over_screen = _build_game_over_screen()
	ending_screen = _build_ending_screen()
	hud = _build_hud()
	pause_screen = _build_pause_screen()
	confirm_screen = _build_confirm_screen()
	countdown_overlay = _build_countdown()
	orientation_guard = _build_orientation_guard()


func _new_screen(color: Color) -> ColorRect:
	var screen := ColorRect.new()
	screen.color = color
	screen.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	screen.visible = false
	ui_root.add_child(screen)
	return screen


func _add_bubble_decor(parent: Control, count: int = 18) -> void:
	for i in range(count):
		var bubble := Panel.new()
		var diameter := rng.randf_range(20.0, 92.0)
		bubble.position = Vector2(rng.randf_range(0.0, 1220.0), rng.randf_range(0.0, 680.0))
		bubble.size = Vector2(diameter, diameter)
		bubble.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var style := StyleBoxFlat.new()
		style.bg_color = Color(0.55, 1.0, 0.94, rng.randf_range(0.04, 0.13))
		style.border_color = Color(0.8, 1.0, 1.0, 0.2)
		style.set_border_width_all(2)
		style.set_corner_radius_all(999)
		bubble.add_theme_stylebox_override("panel", style)
		parent.add_child(bubble)


func _make_button(text_value: String, color: Color = Color("#0DBA93"), minimum := Vector2(250, 64)) -> Button:
	var button := Button.new()
	button.text = text_value
	button.custom_minimum_size = minimum
	button.focus_mode = Control.FOCUS_NONE
	button.add_theme_font_size_override("font_size", 25)
	button.add_theme_color_override("font_color", Color.WHITE)
	button.add_theme_color_override("font_hover_color", Color.WHITE)
	button.add_theme_color_override("font_pressed_color", Color.WHITE)
	var normal := StyleBoxFlat.new()
	normal.bg_color = color
	normal.set_corner_radius_all(20)
	normal.shadow_color = Color(0.0, 0.0, 0.0, 0.24)
	normal.shadow_size = 7
	normal.shadow_offset = Vector2(0, 5)
	normal.content_margin_left = 20
	normal.content_margin_right = 20
	var hover := normal.duplicate()
	hover.bg_color = color.lightened(0.08)
	var pressed := normal.duplicate()
	pressed.bg_color = color.darkened(0.10)
	pressed.shadow_size = 2
	pressed.shadow_offset = Vector2(0, 2)
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", pressed)
	button.add_theme_stylebox_override("focus", normal)
	button.pressed.connect(func(): _play_sfx(click_sound))
	return button


func _make_label(text_value: String, font_size: int, color := Color.WHITE) -> Label:
	var label := Label.new()
	label.text = text_value
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return label


func _make_dr_texture() -> TextureRect:
	var texture_rect := TextureRect.new()
	var atlas_texture := AtlasTexture.new()
	atlas_texture.atlas = load(DR_IMAGE)
	atlas_texture.region = Rect2(135, 15, 755, 735)
	texture_rect.texture = atlas_texture
	texture_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	texture_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	texture_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return texture_rect


func _make_card(minimum := Vector2(720, 460), color := Color(0.03, 0.16, 0.19, 0.96)) -> PanelContainer:
	var card := PanelContainer.new()
	card.custom_minimum_size = minimum
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.border_color = Color(0.42, 1.0, 0.85, 0.32)
	style.set_border_width_all(2)
	style.set_corner_radius_all(30)
	style.shadow_color = Color(0.0, 0.0, 0.0, 0.28)
	style.shadow_size = 18
	style.content_margin_left = 34
	style.content_margin_right = 34
	style.content_margin_top = 26
	style.content_margin_bottom = 26
	card.add_theme_stylebox_override("panel", style)
	return card


func _build_audio_gate() -> Control:
	var screen := _new_screen(Color("#061F28"))
	_add_bubble_decor(screen, 24)
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	screen.add_child(center)
	var card := _make_card(Vector2(980, 580), Color(0.025, 0.17, 0.20, 0.97))
	center.add_child(card)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 34)
	card.add_child(row)
	var portrait := _make_dr_texture()
	portrait.custom_minimum_size = Vector2(390, 470)
	row.add_child(portrait)
	var content := VBoxContainer.new()
	content.custom_minimum_size = Vector2(480, 0)
	content.alignment = BoxContainer.ALIGNMENT_CENTER
	content.add_theme_constant_override("separation", 16)
	row.add_child(content)
	var eyebrow := _make_label("5つの世界を ピカピカに！", 24, Color("#72F8DB"))
	content.add_child(eyebrow)
	var title := _make_label("Dr.やまねこの\nバイキン退治\nだいさくせん！", 47)
	title.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.45))
	title.add_theme_constant_override("shadow_offset_x", 3)
	title.add_theme_constant_override("shadow_offset_y", 4)
	content.add_child(title)
	var note := _make_label("よこ画面・おとが でるよ", 22, Color("#C9FDF2"))
	content.add_child(note)
	var start := _make_button("タップして スタート", Color("#FF9D3D"), Vector2(430, 78))
	start.pressed.connect(_unlock_audio)
	content.add_child(start)
	var small := _make_label("iPhone・iPad Safari対応", 17, Color("#8ECFC4"))
	content.add_child(small)
	return screen


func _build_title_screen() -> Control:
	var screen := _new_screen(Color("#062832"))
	_add_bubble_decor(screen, 20)
	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 70)
	margin.add_theme_constant_override("margin_right", 70)
	margin.add_theme_constant_override("margin_top", 42)
	margin.add_theme_constant_override("margin_bottom", 42)
	screen.add_child(margin)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 48)
	margin.add_child(row)
	var portrait_card := _make_card(Vector2(470, 610), Color(1.0, 1.0, 1.0, 0.97))
	row.add_child(portrait_card)
	var portrait := _make_dr_texture()
	portrait.custom_minimum_size = Vector2(410, 550)
	portrait_card.add_child(portrait)
	var content := VBoxContainer.new()
	content.custom_minimum_size = Vector2(610, 0)
	content.alignment = BoxContainer.ALIGNMENT_CENTER
	content.add_theme_constant_override("separation", 15)
	row.add_child(content)
	var tag := _make_label("CLEAN UP ARENA", 22, Color("#62F4D4"))
	content.add_child(tag)
	var title := _make_label("Dr.やまねこの\nバイキン退治\nだいさくせん！", 48)
	content.add_child(title)
	var subtitle := _make_label("あわブラスターで 5つのステージへ！", 22, Color("#BEEDE4"))
	content.add_child(subtitle)
	var start := _make_button("はじめから", Color("#FF9D3D"), Vector2(470, 66))
	start.pressed.connect(_on_new_game)
	content.add_child(start)
	title_continue_button = _make_button("つづきから", Color("#11B892"), Vector2(470, 66))
	title_continue_button.pressed.connect(_show_map)
	content.add_child(title_continue_button)
	var settings := _make_button("せってい・クレジット", Color("#315E72"), Vector2(470, 58))
	settings.pressed.connect(func(): _show_settings(false))
	content.add_child(settings)
	var foot := _make_label("音声：VOICEVOX:ずんだもん", 16, Color("#82BDB3"))
	content.add_child(foot)
	return screen


func _build_map_screen() -> Control:
	var screen := _new_screen(Color("#082E38"))
	_add_bubble_decor(screen, 18)
	var column := VBoxContainer.new()
	column.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	column.offset_left = 44
	column.offset_right = -44
	column.offset_top = 38
	column.offset_bottom = -34
	column.alignment = BoxContainer.ALIGNMENT_CENTER
	column.add_theme_constant_override("separation", 20)
	screen.add_child(column)
	column.add_child(_make_label("5つの ピカピカステージ", 42))
	column.add_child(_make_label("あそぶ ステージを えらんでね", 22, Color("#BEEDE4")))
	map_stage_row = HBoxContainer.new()
	map_stage_row.alignment = BoxContainer.ALIGNMENT_CENTER
	map_stage_row.add_theme_constant_override("separation", 12)
	map_stage_row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(map_stage_row)
	var back := _make_button("タイトルへ もどる", Color("#315E72"), Vector2(320, 58))
	back.pressed.connect(_show_title)
	column.add_child(back)
	return screen


func _build_brief_screen() -> Control:
	var screen := _new_screen(Color("#062832"))
	_add_bubble_decor(screen, 18)
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	screen.add_child(center)
	var card := _make_card(Vector2(960, 570))
	center.add_child(card)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 34)
	card.add_child(row)
	var left := VBoxContainer.new()
	left.custom_minimum_size = Vector2(260, 0)
	left.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_child(left)
	brief_number = _make_label("01", 112, Color("#68F3D5"))
	left.add_child(brief_number)
	brief_tag = _make_label("HAND WASH LAB", 20, Color("#9BD9CF"))
	left.add_child(brief_tag)
	var right := VBoxContainer.new()
	right.custom_minimum_size = Vector2(590, 0)
	right.alignment = BoxContainer.ALIGNMENT_CENTER
	right.add_theme_constant_override("separation", 18)
	row.add_child(right)
	brief_title = _make_label("", 45)
	right.add_child(brief_title)
	brief_goal = _make_label("", 29, Color("#D8FFF8"))
	brief_goal.custom_minimum_size.y = 128
	right.add_child(brief_goal)
	var replay := _make_button("Dr.やまねこの せつめいを きく", Color("#315E72"), Vector2(520, 58))
	replay.pressed.connect(_replay_brief_voice)
	right.add_child(replay)
	brief_start_button = _make_button("しゅっぱつ！", Color("#FF9D3D"), Vector2(520, 76))
	brief_start_button.pressed.connect(_start_stage)
	right.add_child(brief_start_button)
	var back := _make_button("ステージを えらぶ", Color("#244A5B"), Vector2(520, 52))
	back.pressed.connect(_show_map)
	right.add_child(back)
	return screen


func _build_settings_screen() -> Control:
	var screen := _new_screen(Color("#082B35"))
	_add_bubble_decor(screen, 16)
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	screen.add_child(center)
	var card := _make_card(Vector2(850, 620))
	center.add_child(card)
	var column := VBoxContainer.new()
	column.alignment = BoxContainer.ALIGNMENT_CENTER
	column.add_theme_constant_override("separation", 13)
	card.add_child(column)
	column.add_child(_make_label("せってい", 42))
	settings_voice_button = _make_button("", Color("#0DBA93"), Vector2(600, 58))
	settings_voice_button.pressed.connect(_toggle_voice)
	column.add_child(settings_voice_button)
	settings_bgm_button = _make_button("", Color("#0DBA93"), Vector2(600, 58))
	settings_bgm_button.pressed.connect(_toggle_bgm)
	column.add_child(settings_bgm_button)
	settings_motion_button = _make_button("", Color("#315E72"), Vector2(600, 58))
	settings_motion_button.pressed.connect(_toggle_motion)
	column.add_child(settings_motion_button)
	var replay := _make_button("Dr.やまねこの こえを ためす", Color("#FF9D3D"), Vector2(600, 58))
	replay.pressed.connect(func(): _queue_voices(["CMN_003"]))
	column.add_child(replay)
	var credit := _make_label("音声：VOICEVOX:ずんだもん\n使用エンジン：Godot Engine\n記録は このブラウザーの中だけに ほぞんされます。\n一般的な衛生習慣の紹介であり、診断・治療を目的としません。", 18, Color("#BEEDE4"))
	credit.custom_minimum_size.y = 120
	column.add_child(credit)
	var back := _make_button("もどる", Color("#244A5B"), Vector2(600, 54))
	back.pressed.connect(_close_settings)
	column.add_child(back)
	return screen


func _build_result_screen() -> Control:
	var screen := _new_screen(Color(0.01, 0.08, 0.10, 0.82))
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	screen.add_child(center)
	var card := _make_card(Vector2(790, 575), Color(0.02, 0.22, 0.20, 0.98))
	center.add_child(card)
	var column := VBoxContainer.new()
	column.alignment = BoxContainer.ALIGNMENT_CENTER
	column.add_theme_constant_override("separation", 14)
	card.add_child(column)
	result_title = _make_label("ピカピカ！ だいせいこう！", 45, Color("#FFF5AF"))
	column.add_child(result_title)
	result_medals = _make_label("Dr.メダル\n● ● ●", 55, Color("#FFD35A"))
	column.add_child(result_medals)
	result_lesson = _make_label("", 25, Color("#D9FFF5"))
	result_lesson.custom_minimum_size.y = 100
	column.add_child(result_lesson)
	result_next_button = _make_button("つぎへ", Color("#FF9D3D"), Vector2(520, 68))
	result_next_button.pressed.connect(_result_next)
	column.add_child(result_next_button)
	var map_button := _make_button("ステージを えらぶ", Color("#315E72"), Vector2(520, 54))
	map_button.pressed.connect(_show_map)
	column.add_child(map_button)
	return screen


func _build_game_over_screen() -> Control:
	var screen := _new_screen(Color(0.02, 0.08, 0.11, 0.88))
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	screen.add_child(center)
	var card := _make_card(Vector2(720, 490), Color(0.03, 0.19, 0.22, 0.98))
	center.add_child(card)
	var column := VBoxContainer.new()
	column.alignment = BoxContainer.ALIGNMENT_CENTER
	column.add_theme_constant_override("separation", 18)
	card.add_child(column)
	column.add_child(_make_label("だいじょうぶ！", 48, Color("#FFF1AA")))
	column.add_child(_make_label("つぎは きっと うまくいくよ。\nゆっくり もういちど やってみよう。", 26, Color("#D7FFF6")))
	var continue_button := _make_button("つづきから", Color("#0DBA93"), Vector2(520, 70))
	continue_button.pressed.connect(func(): _show_brief(current_stage))
	column.add_child(continue_button)
	var restart_button := _make_button("はじめから", Color("#315E72"), Vector2(520, 62))
	restart_button.pressed.connect(func(): _confirm_start_over())
	column.add_child(restart_button)
	return screen


func _build_ending_screen() -> Control:
	var screen := _new_screen(Color("#062832"))
	_add_bubble_decor(screen, 28)
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	screen.add_child(center)
	var card := _make_card(Vector2(1050, 610), Color(0.02, 0.20, 0.19, 0.98))
	center.add_child(card)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 34)
	card.add_child(row)
	var portrait := _make_dr_texture()
	portrait.custom_minimum_size = Vector2(390, 510)
	row.add_child(portrait)
	var column := VBoxContainer.new()
	column.custom_minimum_size = Vector2(540, 0)
	column.alignment = BoxContainer.ALIGNMENT_CENTER
	column.add_theme_constant_override("separation", 18)
	row.add_child(column)
	column.add_child(_make_label("ぜんステージ\nピカピカ！", 55, Color("#FFF5A6")))
	column.add_child(_make_label("手あらい　歯みがき　おさら\nおなかの菌　まいにちの習慣", 25, Color("#CFFFF4")))
	var map_button := _make_button("ステージを えらぶ", Color("#FF9D3D"), Vector2(480, 68))
	map_button.pressed.connect(_show_map)
	column.add_child(map_button)
	var title_button := _make_button("タイトルへ", Color("#315E72"), Vector2(480, 56))
	title_button.pressed.connect(_show_title)
	column.add_child(title_button)
	return screen


func _build_hud() -> Control:
	var layer := Control.new()
	layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.visible = false
	ui_root.add_child(layer)

	var top_panel := PanelContainer.new()
	top_panel.position = Vector2(34, 24)
	top_panel.size = Vector2(1212, 76)
	top_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var top_style := StyleBoxFlat.new()
	top_style.bg_color = Color(0.015, 0.11, 0.14, 0.84)
	top_style.set_corner_radius_all(22)
	top_style.border_color = Color(0.5, 1.0, 0.9, 0.20)
	top_style.set_border_width_all(2)
	top_style.content_margin_left = 24
	top_style.content_margin_right = 18
	top_panel.add_theme_stylebox_override("panel", top_style)
	layer.add_child(top_panel)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 22)
	top_panel.add_child(row)
	hud_stars = _make_label("げんき ● ● ●", 25, Color("#FFD85A"))
	hud_stars.custom_minimum_size.x = 260
	row.add_child(hud_stars)
	hud_stage = _make_label("01 手あらいラボ", 24)
	hud_stage.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(hud_stage)
	hud_remaining = _make_label("のこり 10", 25, Color("#73F6DB"))
	hud_remaining.custom_minimum_size.x = 190
	row.add_child(hud_remaining)
	var pause_button := _make_button("Ⅱ", Color("#315E72"), Vector2(68, 56))
	pause_button.add_theme_font_size_override("font_size", 27)
	pause_button.mouse_filter = Control.MOUSE_FILTER_STOP
	pause_button.pressed.connect(_pause_game)
	row.add_child(pause_button)

	hud_gauge = ProgressBar.new()
	hud_gauge.position = Vector2(390, 106)
	hud_gauge.size = Vector2(500, 22)
	hud_gauge.min_value = 0
	hud_gauge.max_value = 100
	hud_gauge.show_percentage = false
	var gauge_bg := StyleBoxFlat.new()
	gauge_bg.bg_color = Color(0.0, 0.0, 0.0, 0.35)
	gauge_bg.set_corner_radius_all(999)
	var gauge_fill := StyleBoxFlat.new()
	gauge_fill.bg_color = Color("#38F1C7")
	gauge_fill.set_corner_radius_all(999)
	hud_gauge.add_theme_stylebox_override("background", gauge_bg)
	hud_gauge.add_theme_stylebox_override("fill", gauge_fill)
	layer.add_child(hud_gauge)

	reticle = _make_label("＋", 52, Color("#DFFFF7"))
	reticle.position = Vector2(600, 304)
	reticle.size = Vector2(80, 80)
	reticle.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(reticle)

	joystick_base = Panel.new()
	joystick_base.position = Vector2(64, 472)
	joystick_base.size = Vector2(176, 176)
	joystick_base.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var joy_style := StyleBoxFlat.new()
	joy_style.bg_color = Color(0.04, 0.20, 0.23, 0.62)
	joy_style.border_color = Color(0.62, 1.0, 0.91, 0.44)
	joy_style.set_border_width_all(4)
	joy_style.set_corner_radius_all(999)
	joystick_base.add_theme_stylebox_override("panel", joy_style)
	layer.add_child(joystick_base)
	joystick_knob = Panel.new()
	joystick_knob.position = Vector2(48, 48)
	joystick_knob.size = Vector2(80, 80)
	joystick_knob.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var knob_style := StyleBoxFlat.new()
	knob_style.bg_color = Color("#45DDBD")
	knob_style.set_corner_radius_all(999)
	knob_style.shadow_color = Color(0, 0, 0, 0.3)
	knob_style.shadow_size = 7
	joystick_knob.add_theme_stylebox_override("panel", knob_style)
	joystick_base.add_child(joystick_knob)

	fire_button = _make_button("あわ\n●", Color("#FF9D3D"), Vector2(178, 178))
	fire_button.position = Vector2(1034, 472)
	fire_button.size = Vector2(178, 178)
	fire_button.add_theme_font_size_override("font_size", 31)
	fire_button.button_down.connect(func(): fire_held = true)
	fire_button.button_up.connect(func(): fire_held = false)
	layer.add_child(fire_button)

	caption_panel = Panel.new()
	caption_panel.position = Vector2(286, 545)
	caption_panel.size = Vector2(708, 112)
	caption_panel.mouse_filter = Control.MOUSE_FILTER_STOP
	var caption_style := StyleBoxFlat.new()
	caption_style.bg_color = Color(0.02, 0.12, 0.15, 0.93)
	caption_style.border_color = Color("#54E7C7")
	caption_style.set_border_width_all(2)
	caption_style.set_corner_radius_all(22)
	caption_panel.add_theme_stylebox_override("panel", caption_style)
	layer.add_child(caption_panel)
	var portrait := _make_dr_texture()
	portrait.position = Vector2(8, 7)
	portrait.size = Vector2(98, 98)
	portrait.mouse_filter = Control.MOUSE_FILTER_IGNORE
	caption_panel.add_child(portrait)
	caption_label = _make_label("", 22)
	caption_label.position = Vector2(112, 10)
	caption_label.size = Vector2(580, 92)
	caption_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	caption_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	caption_panel.add_child(caption_label)
	caption_panel.gui_input.connect(func(event: InputEvent):
		if event is InputEventMouseButton and event.pressed:
			_replay_last_caption()
		elif event is InputEventScreenTouch and event.pressed:
			_replay_last_caption()
	)
	caption_panel.visible = false
	return layer


func _build_pause_screen() -> Control:
	var screen := _new_screen(Color(0.01, 0.06, 0.08, 0.86))
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	screen.add_child(center)
	var card := _make_card(Vector2(620, 520))
	center.add_child(card)
	var column := VBoxContainer.new()
	column.alignment = BoxContainer.ALIGNMENT_CENTER
	column.add_theme_constant_override("separation", 17)
	card.add_child(column)
	column.add_child(_make_label("ひとやすみ", 46))
	var resume := _make_button("つづける", Color("#0DBA93"), Vector2(460, 68))
	resume.pressed.connect(_resume_countdown)
	column.add_child(resume)
	var retry := _make_button("このステージを やりなおす", Color("#FF9D3D"), Vector2(460, 58))
	retry.pressed.connect(func(): _show_brief(current_stage))
	column.add_child(retry)
	var settings := _make_button("せってい", Color("#315E72"), Vector2(460, 58))
	settings.pressed.connect(func(): _show_settings(true))
	column.add_child(settings)
	var title := _make_button("タイトルへ", Color("#244A5B"), Vector2(460, 54))
	title.pressed.connect(_show_title)
	column.add_child(title)
	return screen


func _build_confirm_screen() -> Control:
	var screen := _new_screen(Color(0.0, 0.04, 0.05, 0.88))
	screen.z_index = 50
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	screen.add_child(center)
	var card := _make_card(Vector2(700, 400))
	center.add_child(card)
	var column := VBoxContainer.new()
	column.alignment = BoxContainer.ALIGNMENT_CENTER
	column.add_theme_constant_override("separation", 24)
	card.add_child(column)
	confirm_label = _make_label("", 29)
	confirm_label.custom_minimum_size.y = 150
	column.add_child(confirm_label)
	var yes := _make_button("はじめる", Color("#FF9D3D"), Vector2(480, 64))
	yes.pressed.connect(_accept_confirm)
	column.add_child(yes)
	var no := _make_button("やめる", Color("#315E72"), Vector2(480, 56))
	no.pressed.connect(func(): confirm_screen.visible = false)
	column.add_child(no)
	return screen


func _build_countdown() -> Control:
	var screen := _new_screen(Color(0.0, 0.03, 0.04, 0.50))
	screen.z_index = 45
	countdown_label = _make_label("3", 150, Color("#FFF3A0"))
	countdown_label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	screen.add_child(countdown_label)
	return screen


func _build_orientation_guard() -> Control:
	var screen := _new_screen(Color("#062832"))
	screen.z_index = 100
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	screen.add_child(center)
	var card := _make_card(Vector2(600, 520))
	center.add_child(card)
	var column := VBoxContainer.new()
	column.alignment = BoxContainer.ALIGNMENT_CENTER
	column.add_theme_constant_override("separation", 22)
	card.add_child(column)
	column.add_child(_make_label("↻", 130, Color("#6FF3D6")))
	column.add_child(_make_label("スマホを\nよこに してね！", 46))
	column.add_child(_make_label("よこ向きに なると つづけられるよ", 21, Color("#BEEDE4")))
	return screen


func _hide_main_screens() -> void:
	for screen in [audio_gate, title_screen, map_screen, brief_screen, settings_screen, result_screen, game_over_screen, ending_screen, pause_screen]:
		screen.visible = false


func _show_audio_gate() -> void:
	_hide_main_screens()
	audio_gate.visible = true
	hud.visible = false
	world_root.visible = false
	state = ScreenState.AUDIO_GATE


func _unlock_audio() -> void:
	audio_unlocked = true
	if bool(save_data["bgm"]):
		bgm_player.play()
	_show_title()
	_queue_voices(["CMN_002", "CMN_003", "CMN_004"])


func _show_title() -> void:
	fire_held = false
	_hide_main_screens()
	confirm_screen.visible = false
	countdown_overlay.visible = false
	title_screen.visible = true
	hud.visible = false
	world_root.visible = false
	state = ScreenState.TITLE
	title_continue_button.visible = int(save_data["unlocked"]) > 0 or int(save_data["medals"][0]) > 0
	title_continue_button.text = "つづきから　ステージ %d" % (int(save_data["unlocked"]) + 1)


func _on_new_game() -> void:
	if int(save_data["unlocked"]) > 0 or int(save_data["medals"][0]) > 0:
		_confirm_start_over()
	else:
		_show_brief(0)


func _confirm_start_over() -> void:
	confirm_label.text = "ステージ1から はじめる？\nいちばん よかった Dr.メダルは のこるよ。"
	confirm_action = Callable(self, "_start_over")
	confirm_screen.visible = true


func _accept_confirm() -> void:
	confirm_screen.visible = false
	if confirm_action.is_valid():
		confirm_action.call()


func _start_over() -> void:
	save_data["unlocked"] = 0
	_save_progress()
	_show_brief(0)


func _show_map() -> void:
	fire_held = false
	_hide_main_screens()
	map_screen.visible = true
	hud.visible = false
	world_root.visible = false
	state = ScreenState.MAP
	for child in map_stage_row.get_children():
		child.queue_free()
	for i in range(STAGES.size()):
		var stage: Dictionary = STAGES[i]
		var unlocked := i <= int(save_data["unlocked"])
		var medal_count := int(save_data["medals"][i])
		var medal_text := ""
		for m in range(3):
			medal_text += "●" if m < medal_count else "○"
		var text_value := "%s\n%s\n%s\n%s" % [
			str(stage["number"]),
			str(stage["title"]),
			medal_text if unlocked else "🔒",
			"あそべる" if unlocked else "まだ ひみつ"
		]
		var stage_button := _make_button(text_value, Color(str(stage["accent"])) if unlocked else Color("#304B55"), Vector2(220, 330))
		stage_button.add_theme_font_size_override("font_size", 21)
		stage_button.disabled = not unlocked
		stage_button.pressed.connect(_show_brief.bind(i))
		map_stage_row.add_child(stage_button)


func _show_brief(stage_index: int) -> void:
	current_stage = clampi(stage_index, 0, STAGES.size() - 1)
	fire_held = false
	_hide_main_screens()
	brief_screen.visible = true
	hud.visible = false
	world_root.visible = false
	state = ScreenState.BRIEF
	var stage: Dictionary = STAGES[current_stage]
	brief_number.text = str(stage["number"])
	brief_number.add_theme_color_override("font_color", Color(str(stage["accent"])))
	brief_title.text = str(stage["title"])
	brief_tag.text = str(stage["tag"])
	brief_goal.text = str(stage["goal"])
	_queue_voices(stage["intro"])


func _replay_brief_voice() -> void:
	_queue_voices(STAGES[current_stage]["intro"])


func _start_stage() -> void:
	_setup_stage(current_stage)
	_hide_main_screens()
	hud.visible = true
	world_root.visible = true
	state = ScreenState.PLAYING
	last_action_time = 0.0
	_queue_voices(STAGES[current_stage]["start_voice"])
	if current_stage == 0 and not bool(save_data["tutorial_done"]):
		save_data["tutorial_done"] = true
		_save_progress()
		_queue_voices(["CMN_006", "CMN_007", "CMN_008", "CMN_009"])


func _pause_game() -> void:
	if state != ScreenState.PLAYING:
		return
	fire_held = false
	state = ScreenState.PAUSED
	pause_screen.visible = true
	_queue_voices(["CMN_017"])


func _resume_countdown() -> void:
	if orientation_blocked:
		return
	pause_screen.visible = false
	countdown_overlay.visible = true
	for number in [3, 2, 1]:
		countdown_label.text = str(number)
		await get_tree().create_timer(0.55).timeout
	countdown_label.text = "スタート！"
	await get_tree().create_timer(0.35).timeout
	countdown_overlay.visible = false
	state = ScreenState.PLAYING
	damage_cooldown = maxf(damage_cooldown, 1.0)


func _show_settings(from_pause: bool) -> void:
	settings_from_pause = from_pause
	_hide_main_screens()
	settings_screen.visible = true
	hud.visible = false
	if not from_pause:
		world_root.visible = false
	state = ScreenState.SETTINGS
	_refresh_settings_buttons()


func _close_settings() -> void:
	if settings_from_pause:
		settings_screen.visible = false
		pause_screen.visible = true
		hud.visible = true
		world_root.visible = true
		state = ScreenState.PAUSED
	else:
		_show_title()


func _refresh_settings_buttons() -> void:
	settings_voice_button.text = "こえ　　%s" % ("オン" if bool(save_data["voice"]) else "オフ")
	settings_bgm_button.text = "BGM　　%s" % ("オン" if bool(save_data["bgm"]) else "オフ")
	settings_motion_button.text = "えんしゅつ　　%s" % ("ひかえめ" if bool(save_data["reduced_motion"]) else "ふつう")


func _toggle_voice() -> void:
	save_data["voice"] = not bool(save_data["voice"])
	_refresh_settings_buttons()
	_save_progress()
	if bool(save_data["voice"]):
		_queue_voices(["CMN_003"])


func _toggle_bgm() -> void:
	save_data["bgm"] = not bool(save_data["bgm"])
	if bool(save_data["bgm"]) and audio_unlocked:
		bgm_player.play()
	else:
		bgm_player.stop()
	_refresh_settings_buttons()
	_save_progress()


func _toggle_motion() -> void:
	save_data["reduced_motion"] = not bool(save_data["reduced_motion"])
	_refresh_settings_buttons()
	_save_progress()


func _show_game_over() -> void:
	state = ScreenState.GAME_OVER
	fire_held = false
	game_over_screen.visible = true
	_queue_voices(["CMN_018"])


func _complete_stage() -> void:
	if state != ScreenState.PLAYING:
		return
	state = ScreenState.RESULT
	fire_held = false
	var medal := 1
	if stars >= 2:
		medal += 1
	if wrong_hits == 0:
		medal += 1
	save_data["medals"][current_stage] = maxi(int(save_data["medals"][current_stage]), medal)
	if current_stage < STAGES.size() - 1:
		save_data["unlocked"] = maxi(int(save_data["unlocked"]), current_stage + 1)
	_save_progress()
	result_title.text = "ピカピカ！ %s クリア！" % str(STAGES[current_stage]["title"])
	var dots := ""
	for i in range(3):
		dots += "●  " if i < medal else "○  "
	result_medals.text = "Dr.メダル\n" + dots
	result_lesson.text = str(STAGES[current_stage]["lesson"])
	result_next_button.text = "エンディングへ" if current_stage == STAGES.size() - 1 else "つぎの ステージへ"
	result_screen.visible = true
	_queue_voices(STAGES[current_stage]["clear"])


func _result_next() -> void:
	if current_stage >= STAGES.size() - 1:
		_show_ending()
	else:
		_show_brief(current_stage + 1)


func _show_ending() -> void:
	_hide_main_screens()
	hud.visible = false
	world_root.visible = false
	ending_screen.visible = true
	state = ScreenState.ENDING
	_queue_voices(["END_001", "END_002", "END_003"])


func _show_caption(text_value: String, duration: float = 4.0) -> void:
	if text_value.is_empty():
		return
	caption_label.text = text_value
	caption_panel.visible = true
	caption_timer = duration


func _replay_last_caption() -> void:
	if voice_player.stream != null and bool(save_data["voice"]) and audio_unlocked:
		voice_player.play()


func _on_viewport_resized() -> void:
	var size := get_viewport().get_visible_rect().size
	var portrait := size.y > size.x
	if portrait and not orientation_blocked:
		orientation_blocked = true
		orientation_guard.visible = true
		if state == ScreenState.PLAYING:
			state = ScreenState.PAUSED
			resume_after_orientation = true
		if audio_unlocked:
			_queue_voices(["CMN_005"], false)
	elif not portrait and orientation_blocked:
		orientation_blocked = false
		orientation_guard.visible = false
		if resume_after_orientation:
			resume_after_orientation = false
			_resume_countdown()


func _apply_look_delta(delta_value: Vector2) -> void:
	yaw -= delta_value.x * 0.0042
	pitch -= delta_value.y * 0.0032
	pitch = clampf(pitch, -0.45, 0.32)
	player.rotation.y = yaw
	camera.rotation.x = pitch


func _update_joystick(position_value: Vector2) -> void:
	var delta_value := position_value - move_origin
	var max_distance := 66.0
	if delta_value.length() > max_distance:
		delta_value = delta_value.normalized() * max_distance
	move_vector = delta_value / max_distance
	joystick_knob.position = Vector2(48, 48) + delta_value


func _reset_joystick() -> void:
	joystick_knob.position = Vector2(48, 48)


func _setup_stage(stage_index: int) -> void:
	for child in stage_root.get_children():
		stage_root.remove_child(child)
		child.free()
	targets.clear()
	pending_spawns.clear()
	material_cache.clear()
	current_stage = stage_index
	stars = 3
	cleaned_count = 0
	target_total = int(STAGES[stage_index]["count"])
	wrong_hits = 0
	combo = 0
	sparkle_gauge = 0.0
	fever_time = 0.0
	stage_elapsed = 0.0
	last_action_time = 0.0
	hint_played = false
	damage_cooldown = 2.0
	boss_spawned = false
	player.position = Vector3(0.0, 0.1, 9.0)
	yaw = 0.0
	pitch = -0.05
	player.rotation = Vector3(0, yaw, 0)
	camera.rotation.x = pitch
	environment.background_color = Color(str(STAGES[stage_index]["sky"]))
	_build_arena_base(Color(str(STAGES[stage_index]["floor"])), Color(str(STAGES[stage_index]["accent"])))
	match stage_index:
		0:
			_build_stage_one()
		1:
			_build_stage_two()
		2:
			_build_stage_three()
		3:
			_build_stage_four()
		4:
			_build_stage_five()
	_spawn_from_queue()
	_refresh_hud()


func _build_arena_base(floor_color: Color, accent_color: Color) -> void:
	_add_box(Vector3(0, -0.35, 0), Vector3(28, 0.7, 24), floor_color, true)
	_add_box(Vector3(0, 1.0, -12.0), Vector3(28, 2.0, 0.6), accent_color.darkened(0.35), true)
	_add_box(Vector3(-14.0, 1.0, 0), Vector3(0.6, 2.0, 24), accent_color.darkened(0.25), true)
	_add_box(Vector3(14.0, 1.0, 0), Vector3(0.6, 2.0, 24), accent_color.darkened(0.25), true)
	_add_box(Vector3(0, 1.0, 12.0), Vector3(28, 2.0, 0.6), accent_color.darkened(0.35), true)
	for i in range(20):
		var sphere := MeshInstance3D.new()
		var mesh := SphereMesh.new()
		var radius := rng.randf_range(0.08, 0.28)
		mesh.radius = radius
		mesh.height = radius * 2.0
		mesh.radial_segments = 10
		mesh.rings = 6
		sphere.mesh = mesh
		sphere.position = Vector3(rng.randf_range(-12, 12), rng.randf_range(1.0, 5.5), rng.randf_range(-10, 10))
		sphere.material_override = _material("#B9FFF1", 0.1, 0.34)
		stage_root.add_child(sphere)


func _build_stage_one() -> void:
	_add_box(Vector3(0, 0.35, -7.6), Vector3(17, 0.7, 3.4), Color("#F7FFFC"), false)
	for i in range(5):
		_add_box(Vector3(-6.4 + i * 3.2, 1.3 + absf(2.0 - i) * 0.15, -9.1), Vector3(2.2, 2.2 + (i % 2) * 0.6, 3.7), Color("#FFF8E8"), false)
	for i in range(10):
		var x := -9.0 + float(i % 5) * 4.5
		var z := -7.8 + float(i / 5) * 6.7
		pending_spawns.append(_target_spec(Vector3(x, 1.2, z), "#7A54F5" if i % 2 == 0 else "#FF6F91", "enemy", 4, "wander", 1.0))


func _build_stage_two() -> void:
	for i in range(9):
		var x := -10.0 + float(i % 5) * 5.0
		var z := -8.0 + float(i / 5) * 8.0
		_add_cylinder(Vector3(x, 1.2, z), 1.3, 2.4, Color("#FFFDF4"), false)
		var cap := MeshInstance3D.new()
		var cap_mesh := SphereMesh.new()
		cap_mesh.radius = 1.35
		cap_mesh.height = 1.2
		cap_mesh.radial_segments = 16
		cap_mesh.rings = 8
		cap.mesh = cap_mesh
		cap.position = Vector3(x, 2.3, z)
		cap.material_override = _material("#F7F1DF", 0.05)
		stage_root.add_child(cap)
	var positions := [
		Vector3(-8, 1.5, -8), Vector3(-3, 1.4, -6), Vector3(4, 1.8, -8),
		Vector3(8, 1.5, -2), Vector3(-6, 1.3, 1), Vector3(3, 1.6, 2)
	]
	for position_value in positions:
		pending_spawns.append(_target_spec(position_value, "#FFB54A", "enemy", 7, "orbit", 0.9))


func _build_stage_three() -> void:
	for lane in range(3):
		_add_box(Vector3(0, 0.3, -7.2 + lane * 4.3), Vector3(24, 0.55, 2.3), Color("#244D58"), false, 0.08)
		for marker in range(8):
			_add_box(Vector3(-10.5 + marker * 3.0, 0.61, -7.2 + lane * 4.3), Vector3(1.6, 0.05, 1.8), Color("#59D7D2"), false, 0.12)
	for i in range(12):
		var lane := i % 3
		var spec := _target_spec(Vector3(7.0 + float(i / 3) * 3.1, 1.0, -7.2 + lane * 4.3), "#FF6A59", "enemy", 4, "conveyor", 0.85, "plate")
		spec["speed"] = 1.35 + lane * 0.18
		pending_spawns.append(spec)
	for i in range(4):
		var lane := i % 3
		var friend_spec := _target_spec(Vector3(9.5 - i * 4.3, 1.0, -7.2 + lane * 4.3), "#E8FAFF", "friend_plate", 99, "conveyor", 0.85, "plate")
		friend_spec["speed"] = 1.1 + lane * 0.16
		_spawn_target(friend_spec)


func _build_stage_four() -> void:
	for i in range(14):
		var x := rng.randf_range(-11.0, 11.0)
		var z := rng.randf_range(-9.0, 6.0)
		_add_cylinder(Vector3(x, 0.6, z), rng.randf_range(0.18, 0.38), rng.randf_range(0.8, 1.7), Color("#59A56E"), false)
		var blossom := MeshInstance3D.new()
		var blossom_mesh := SphereMesh.new()
		blossom_mesh.radius = rng.randf_range(0.3, 0.62)
		blossom_mesh.height = blossom_mesh.radius * 1.5
		blossom_mesh.radial_segments = 10
		blossom_mesh.rings = 6
		blossom.mesh = blossom_mesh
		blossom.position = Vector3(x, 1.5, z)
		blossom.material_override = _material("#E7A5FF" if i % 2 else "#7CF0BD", 0.08)
		stage_root.add_child(blossom)
	for i in range(8):
		var angle := TAU * float(i) / 8.0
		var position_value := Vector3(cos(angle) * 8.0, 1.35, -2.0 + sin(angle) * 6.0)
		pending_spawns.append(_target_spec(position_value, "#6366F1", "enemy", 5, "orbit", 1.0))
	for i in range(4):
		var angle := TAU * float(i) / 4.0 + 0.7
		var friend_spec := _target_spec(Vector3(cos(angle) * 5.0, 1.2, -1.0 + sin(angle) * 4.0), "#54D68B", "friend_germ", 99, "orbit", 1.0)
		_spawn_target(friend_spec)


func _build_stage_five() -> void:
	for i in range(8):
		var angle := TAU * float(i) / 8.0
		_add_box(Vector3(cos(angle) * 10.0, 2.2, -2.0 + sin(angle) * 8.0), Vector3(1.1, 4.4, 1.1), Color("#1ED4F2"), false, 0.6)
	_add_box(Vector3(0, 0.45, -4), Vector3(11, 0.9, 8), Color("#101B3B"), false, 0.12)
	for i in range(4):
		var angle := TAU * float(i) / 4.0 + PI * 0.25
		var spec := _target_spec(Vector3(cos(angle) * 6.0, 1.6, -3.0 + sin(angle) * 4.5), "#FF4FA1", "core", 8, "static", 1.1)
		pending_spawns.append(spec)


func _target_spec(position_value: Vector3, color_hex: String, kind: String, health: int, motion: String, scale_value: float, shape_value: String = "sphere") -> Dictionary:
	return {
		"position": position_value,
		"color": color_hex,
		"kind": kind,
		"health": health,
		"max_health": health,
		"motion": motion,
		"scale": scale_value,
		"shape": shape_value,
		"speed": rng.randf_range(0.7, 1.25),
		"phase": rng.randf_range(0.0, TAU)
	}


func _spawn_from_queue() -> void:
	if state == ScreenState.RESULT or state == ScreenState.GAME_OVER:
		return
	var active := 0
	for target in targets:
		if not bool(target.get("dead", false)) and str(target.get("kind", "")) in ["enemy", "core", "boss"]:
			active += 1
	while active < MAX_ACTIVE_ENEMIES and not pending_spawns.is_empty():
		_spawn_target(pending_spawns.pop_front())
		active += 1


func _spawn_target(spec: Dictionary) -> void:
	var area := Area3D.new()
	area.name = "Cleanable_%s" % str(spec["kind"])
	area.collision_layer = 2
	area.collision_mask = 0
	area.position = spec["position"]
	stage_root.add_child(area)

	var scale_value := float(spec["scale"])
	var mesh_instance := MeshInstance3D.new()
	if str(spec["shape"]) == "plate":
		var plate_mesh := CylinderMesh.new()
		plate_mesh.top_radius = 0.85 * scale_value
		plate_mesh.bottom_radius = 0.85 * scale_value
		plate_mesh.height = 0.20
		plate_mesh.radial_segments = 20
		mesh_instance.mesh = plate_mesh
	else:
		var sphere_mesh := SphereMesh.new()
		sphere_mesh.radius = 0.72 * scale_value
		sphere_mesh.height = 1.44 * scale_value
		sphere_mesh.radial_segments = 16
		sphere_mesh.rings = 9
		mesh_instance.mesh = sphere_mesh
	mesh_instance.material_override = _material(str(spec["color"]), 0.18)
	area.add_child(mesh_instance)
	_add_target_face_mesh(area, scale_value, str(spec["kind"]))

	var collision := CollisionShape3D.new()
	var sphere_shape := SphereShape3D.new()
	sphere_shape.radius = 0.82 * scale_value
	collision.shape = sphere_shape
	area.add_child(collision)

	var face := Label3D.new()
	var kind := str(spec["kind"])
	face.text = ""
	face.font = game_font
	face.font_size = 62
	face.pixel_size = 0.010
	face.outline_size = 10
	face.modulate = Color("#152A34")
	face.outline_modulate = Color(1, 1, 1, 0.76)
	face.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	face.no_depth_test = true
	face.position = Vector3(0, 0.08, 0)
	area.add_child(face)

	var badge := Label3D.new()
	badge.text = "▲" if kind in ["enemy", "core", "boss"] else "◆"
	badge.font = game_font
	badge.font_size = 54
	badge.pixel_size = 0.010
	badge.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	badge.no_depth_test = true
	badge.modulate = Color("#FFD85A") if kind in ["enemy", "core", "boss"] else Color("#E9FFF7")
	badge.position = Vector3(0, 1.0 * scale_value, 0)
	area.add_child(badge)

	var target := spec.duplicate(true)
	target["node"] = area
	target["mesh"] = mesh_instance
	target["face"] = face
	target["badge"] = badge
	target["base_position"] = area.position
	target["dead"] = false
	target["hit_flash"] = 0.0
	targets.append(target)


func _add_target_face_mesh(parent: Node3D, scale_value: float, kind: String) -> void:
	var face_z := 0.67 * scale_value
	for side in [-1.0, 1.0]:
		var eye_white := MeshInstance3D.new()
		var eye_mesh := SphereMesh.new()
		eye_mesh.radius = 0.17 * scale_value
		eye_mesh.height = 0.34 * scale_value
		eye_mesh.radial_segments = 12
		eye_mesh.rings = 7
		eye_white.mesh = eye_mesh
		eye_white.position = Vector3(side * 0.24 * scale_value, 0.16 * scale_value, face_z)
		eye_white.material_override = _material("#FFFFFF", 0.02)
		parent.add_child(eye_white)

		var pupil := MeshInstance3D.new()
		var pupil_mesh := SphereMesh.new()
		pupil_mesh.radius = 0.085 * scale_value
		pupil_mesh.height = 0.17 * scale_value
		pupil_mesh.radial_segments = 10
		pupil_mesh.rings = 6
		pupil.mesh = pupil_mesh
		pupil.position = Vector3(side * 0.24 * scale_value, 0.14 * scale_value, face_z + 0.14 * scale_value)
		pupil.material_override = _material("#132C35", 0.02)
		parent.add_child(pupil)

	var mouth := MeshInstance3D.new()
	var mouth_mesh := SphereMesh.new()
	mouth_mesh.radius = 0.15 * scale_value
	mouth_mesh.height = 0.30 * scale_value
	mouth_mesh.radial_segments = 12
	mouth_mesh.rings = 7
	mouth.mesh = mouth_mesh
	mouth.position = Vector3(0, -0.20 * scale_value, face_z + 0.08 * scale_value)
	mouth.scale = Vector3(1.0, 0.42, 0.35)
	mouth.material_override = _material("#713349" if kind in ["enemy", "core", "boss"] else "#185B48", 0.02)
	parent.add_child(mouth)

	if kind in ["enemy", "core", "boss"]:
		for side in [-1.0, 1.0]:
			var brow := MeshInstance3D.new()
			var brow_mesh := BoxMesh.new()
			brow_mesh.size = Vector3(0.25 * scale_value, 0.055 * scale_value, 0.055 * scale_value)
			brow.mesh = brow_mesh
			brow.position = Vector3(side * 0.23 * scale_value, 0.40 * scale_value, face_z + 0.14 * scale_value)
			brow.rotation.z = side * 0.18
			brow.material_override = _material("#43263C", 0.02)
			parent.add_child(brow)


func _update_targets(delta: float) -> void:
	var now := float(Time.get_ticks_msec()) / 1000.0
	for target in targets:
		if bool(target.get("dead", false)):
			continue
		var node := target.get("node") as Node3D
		if not is_instance_valid(node):
			continue
		var motion := str(target["motion"])
		var base: Vector3 = target["base_position"]
		var phase := float(target["phase"])
		var speed := float(target["speed"])
		match motion:
			"wander":
				node.position = base + Vector3(sin(now * speed + phase) * 1.15, sin(now * 1.8 + phase) * 0.22, cos(now * speed * 0.8 + phase) * 0.75)
			"orbit":
				node.position = base + Vector3(cos(now * speed + phase) * 1.05, sin(now * 1.6 + phase) * 0.25, sin(now * speed + phase) * 1.05)
			"conveyor":
				node.position.x -= speed * delta * 2.0
				if node.position.x < -11.5:
					node.position.x = 11.5
			"boss":
				node.position.y = base.y + sin(now * 1.4) * 0.35
				node.rotation.y += delta * 0.35
			"static":
				node.rotation.y += delta * 0.22


func _find_aim_target() -> Dictionary:
	var origin := camera.global_position
	var forward := -camera.global_transform.basis.z
	var best_enemy: Dictionary = {}
	var best_enemy_angle := deg_to_rad(13.0)
	var best_friend: Dictionary = {}
	var best_friend_angle := deg_to_rad(5.5)
	for target in targets:
		if bool(target.get("dead", false)):
			continue
		var node := target.get("node") as Node3D
		if not is_instance_valid(node):
			continue
		var direction := (node.global_position - origin).normalized()
		var angle := acos(clampf(forward.dot(direction), -1.0, 1.0))
		var kind := str(target["kind"])
		if kind in ["enemy", "core", "boss"] and angle < best_enemy_angle:
			best_enemy_angle = angle
			best_enemy = target
		elif kind in ["friend_germ", "friend_plate"] and angle < best_friend_angle:
			best_friend_angle = angle
			best_friend = target
	return best_enemy if not best_enemy.is_empty() else best_friend


func _update_reticle() -> void:
	var target := _find_aim_target()
	if target.is_empty():
		reticle.text = "＋"
		reticle.add_theme_color_override("font_color", Color("#DFFFF7"))
	elif str(target["kind"]) in ["friend_germ", "friend_plate"]:
		reticle.text = "◇"
		reticle.add_theme_color_override("font_color", Color("#8FFFCB"))
	else:
		reticle.text = "◎"
		reticle.add_theme_color_override("font_color", Color("#FFD85A"))


func _shoot_once() -> void:
	last_action_time = stage_elapsed
	hint_played = false
	_play_sfx(shot_sound)
	var target := _find_aim_target()
	var hit_point := camera.global_position + (-camera.global_transform.basis.z * 14.0)
	if not target.is_empty():
		var node := target.get("node") as Node3D
		if is_instance_valid(node):
			hit_point = node.global_position
		var kind := str(target["kind"])
		if kind in ["friend_germ", "friend_plate"]:
			_wrong_target(target)
		else:
			_damage_target(target, 2 if fever_time > 0.0 else 1)
	_spawn_bubble(hit_point)


func _wrong_target(target: Dictionary) -> void:
	wrong_hits += 1
	combo = 0
	var id := "ST4_005" if str(target["kind"]) == "friend_germ" else "ST3_004"
	if stage_elapsed - float(target.get("last_warning", -99.0)) > 3.0:
		target["last_warning"] = stage_elapsed
		_queue_voices([id], false)
	var node := target.get("node") as Node3D
	if is_instance_valid(node) and not bool(save_data["reduced_motion"]):
		var tween := create_tween()
		tween.tween_property(node, "scale", Vector3.ONE * 1.12, 0.08)
		tween.tween_property(node, "scale", Vector3.ONE, 0.12)


func _damage_target(target: Dictionary, amount: int) -> void:
	target["health"] = int(target["health"]) - amount
	_play_sfx(hit_sound)
	var node := target.get("node") as Node3D
	if is_instance_valid(node) and not bool(save_data["reduced_motion"]):
		var tween := create_tween()
		tween.tween_property(node, "scale", Vector3.ONE * 1.08, 0.06)
		tween.tween_property(node, "scale", Vector3.ONE, 0.08)
	if int(target["health"]) <= 0:
		_clean_target(target)


func _clean_target(target: Dictionary) -> void:
	if bool(target.get("dead", false)):
		return
	target["dead"] = true
	var node := target.get("node") as Area3D
	if not is_instance_valid(node):
		return
	node.collision_layer = 0
	var face := target.get("face") as Label3D
	if is_instance_valid(face):
		face.text = "＞﹏＜"
	cleaned_count += 1
	combo += 1
	sparkle_gauge = minf(100.0, sparkle_gauge + 18.0)
	_play_sfx(clean_sound)
	_refresh_hud()
	if combo == 2:
		_queue_voices(["CMN_011"], false)
	elif combo == 4:
		_queue_voices(["CMN_012"], false)
	if sparkle_gauge >= 100.0 and fever_time <= 0.0:
		fever_time = 6.0
		_queue_voices(["CMN_015", "CMN_016"], false)

	if not bool(save_data["reduced_motion"]):
		var tween := create_tween()
		tween.tween_property(node, "scale", Vector3.ONE * 1.35, 0.13)
		tween.tween_callback(func():
			if is_instance_valid(face):
				face.text = "◕‿◕"
		)
		tween.tween_property(node, "scale", Vector3.ZERO, 0.34)
		tween.tween_callback(node.queue_free)
	else:
		node.queue_free()

	if current_stage == 4 and cleaned_count == 4 and not boss_spawned:
		boss_spawned = true
		_queue_voices(["ST5_004"], false)
		var boss := _target_spec(Vector3(0, 2.4, -5.0), "#A855F7", "boss", 20, "boss", 2.25)
		_spawn_target(boss)
	else:
		get_tree().create_timer(0.45).timeout.connect(_spawn_from_queue)

	if cleaned_count >= target_total:
		get_tree().create_timer(0.85).timeout.connect(_complete_stage)


func _spawn_bubble(hit_point: Vector3) -> void:
	var bubble := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = 0.12 if fever_time <= 0.0 else 0.22
	mesh.height = mesh.radius * 2.0
	mesh.radial_segments = 10
	mesh.rings = 6
	bubble.mesh = mesh
	bubble.material_override = _material("#B9FFF1", 0.45, 0.68)
	world_root.add_child(bubble)
	bubble.global_position = camera.global_position + (-camera.global_transform.basis.z * 0.8) + camera.global_transform.basis.x * 0.28
	var tween := create_tween()
	tween.tween_property(bubble, "global_position", hit_point, 0.16)
	tween.parallel().tween_property(bubble, "scale", Vector3.ONE * (1.8 if fever_time > 0.0 else 1.2), 0.16)
	tween.tween_property(bubble, "scale", Vector3.ZERO, 0.12)
	tween.tween_callback(bubble.queue_free)


func _check_player_damage() -> void:
	if damage_cooldown > 0.0:
		return
	for target in targets:
		if bool(target.get("dead", false)) or str(target.get("kind", "")) not in ["enemy", "boss"]:
			continue
		var node := target.get("node") as Node3D
		if not is_instance_valid(node):
			continue
		var danger_distance := 1.35 + float(target.get("scale", 1.0)) * 0.45
		if player.global_position.distance_to(node.global_position) < danger_distance:
			_lose_star()
			var away := (node.global_position - player.global_position).normalized()
			node.position += away * 2.4
			return


func _lose_star() -> void:
	if damage_cooldown > 0.0 or state != ScreenState.PLAYING:
		return
	damage_cooldown = 2.0
	stars -= 1
	combo = 0
	_play_sfx(hurt_sound)
	_refresh_hud()
	if stars <= 0:
		_show_game_over()
	elif stars == 1:
		_queue_voices(["CMN_014"])
	else:
		_queue_voices(["CMN_013"])


func _refresh_hud() -> void:
	var dots := ""
	for i in range(3):
		dots += "● " if i < stars else "○ "
	hud_stars.text = "げんき " + dots
	hud_stage.text = "%s  %s" % [str(STAGES[current_stage]["number"]), str(STAGES[current_stage]["title"])]
	hud_remaining.text = "のこり %d" % maxi(0, target_total - cleaned_count)
	_update_gauge()


func _update_gauge() -> void:
	hud_gauge.value = 100.0 if fever_time > 0.0 else sparkle_gauge
	hud_gauge.modulate = Color("#FFF278") if fever_time > 0.0 else Color.WHITE


func _add_box(position_value: Vector3, size_value: Vector3, color_value: Color, collidable: bool, emission_value: float = 0.0) -> Node3D:
	var parent_node: Node3D
	if collidable:
		var body := StaticBody3D.new()
		body.collision_layer = 1
		body.collision_mask = 1
		parent_node = body
	else:
		parent_node = Node3D.new()
	parent_node.position = position_value
	stage_root.add_child(parent_node)
	var mesh_instance := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size_value
	mesh_instance.mesh = mesh
	mesh_instance.material_override = _material(color_value.to_html(), emission_value)
	parent_node.add_child(mesh_instance)
	if collidable:
		var collision := CollisionShape3D.new()
		var shape := BoxShape3D.new()
		shape.size = size_value
		collision.shape = shape
		parent_node.add_child(collision)
	return parent_node


func _add_cylinder(position_value: Vector3, radius: float, height: float, color_value: Color, collidable: bool) -> Node3D:
	var parent_node: Node3D
	if collidable:
		parent_node = StaticBody3D.new()
		(parent_node as StaticBody3D).collision_layer = 1
	else:
		parent_node = Node3D.new()
	parent_node.position = position_value
	stage_root.add_child(parent_node)
	var mesh_instance := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = 16
	mesh_instance.mesh = mesh
	mesh_instance.material_override = _material(color_value.to_html(), 0.04)
	parent_node.add_child(mesh_instance)
	if collidable:
		var collision := CollisionShape3D.new()
		var shape := CylinderShape3D.new()
		shape.radius = radius
		shape.height = height
		collision.shape = shape
		parent_node.add_child(collision)
	return parent_node


func _material(color_hex: String, emission_value: float = 0.0, alpha: float = 1.0) -> StandardMaterial3D:
	var key := "%s|%.2f|%.2f" % [color_hex, emission_value, alpha]
	if material_cache.has(key):
		return material_cache[key]
	var material := StandardMaterial3D.new()
	var color_value := Color(color_hex)
	color_value.a = alpha
	material.albedo_color = color_value
	material.roughness = 0.46
	if emission_value > 0.0:
		material.emission_enabled = true
		material.emission = Color(color_hex)
		material.emission_energy_multiplier = emission_value
	if alpha < 1.0:
		material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	material_cache[key] = material
	return material
