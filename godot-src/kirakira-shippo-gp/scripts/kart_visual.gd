extends Node3D

var wheels: Array[MeshInstance3D] = []
var body_material: StandardMaterial3D
var accent_material: StandardMaterial3D
var tail: MeshInstance3D


func build(body_color: Color, accent_color: Color, cat_color: Color) -> void:
	body_material = _material(body_color, 0.42)
	accent_material = _material(accent_color, 0.34)

	_add_box("Body", Vector3(1.65, 0.42, 2.65), Vector3(0, 0.62, 0), body_material)
	_add_box("Nose", Vector3(1.45, 0.28, 0.68), Vector3(0, 0.82, 0.94), accent_material)
	_add_box("Cabin", Vector3(1.24, 0.52, 0.88), Vector3(0, 1.03, -0.27), body_material)
	_add_box("RearBumper", Vector3(1.78, 0.20, 0.30), Vector3(0, 0.48, -1.35), accent_material)
	_add_box("FrontBumper", Vector3(1.78, 0.18, 0.25), Vector3(0, 0.44, 1.37), accent_material)

	var glass_material := _material(Color(0.52, 0.87, 1.0), 0.16)
	glass_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	glass_material.albedo_color.a = 0.82
	_add_box("Windshield", Vector3(1.05, 0.34, 0.08), Vector3(0, 1.17, 0.19), glass_material)

	var tire_material := _material(Color(0.08, 0.09, 0.12), 0.82)
	var hub_material := _material(accent_color.lightened(0.15), 0.26)
	for x in [-0.92, 0.92]:
		for z in [-0.86, 0.86]:
			var wheel := MeshInstance3D.new()
			wheel.name = "Wheel"
			var wheel_mesh := CylinderMesh.new()
			wheel_mesh.top_radius = 0.34
			wheel_mesh.bottom_radius = 0.34
			wheel_mesh.height = 0.26
			wheel_mesh.radial_segments = 16
			wheel.mesh = wheel_mesh
			wheel.material_override = tire_material
			wheel.position = Vector3(x, 0.43, z)
			wheel.rotation_degrees = Vector3(0, 0, 90)
			add_child(wheel)
			wheels.append(wheel)

			var hub := MeshInstance3D.new()
			var hub_mesh := CylinderMesh.new()
			hub_mesh.top_radius = 0.15
			hub_mesh.bottom_radius = 0.15
			hub_mesh.height = 0.28
			hub_mesh.radial_segments = 12
			hub.mesh = hub_mesh
			hub.material_override = hub_material
			hub.position = Vector3(x, 0.43, z)
			hub.rotation_degrees = Vector3(0, 0, 90)
			add_child(hub)

	var cat_material := _material(cat_color, 0.55)
	var muzzle_material := _material(Color(1.0, 0.91, 0.78), 0.62)
	var dark_material := _material(Color(0.12, 0.10, 0.15), 0.72)
	_add_sphere("DriverHead", Vector3(0.72, 0.66, 0.66), Vector3(0, 1.52, -0.28), cat_material)
	_add_cone("EarLeft", 0.27, 0.48, Vector3(-0.29, 1.98, -0.26), cat_material)
	_add_cone("EarRight", 0.27, 0.48, Vector3(0.29, 1.98, -0.26), cat_material)
	_add_sphere("Muzzle", Vector3(0.48, 0.26, 0.20), Vector3(0, 1.43, 0.33), muzzle_material)
	_add_sphere("EyeLeft", Vector3(0.10, 0.13, 0.09), Vector3(-0.19, 1.61, 0.35), dark_material)
	_add_sphere("EyeRight", Vector3(0.10, 0.13, 0.09), Vector3(0.19, 1.61, 0.35), dark_material)
	_add_sphere("Nose", Vector3(0.10, 0.08, 0.08), Vector3(0, 1.43, 0.46), dark_material)

	tail = MeshInstance3D.new()
	tail.name = "Tail"
	var tail_mesh := TorusMesh.new()
	tail_mesh.inner_radius = 0.28
	tail_mesh.outer_radius = 0.42
	tail_mesh.rings = 12
	tail_mesh.ring_segments = 8
	tail.mesh = tail_mesh
	tail.material_override = cat_material
	tail.position = Vector3(0.68, 1.25, -0.95)
	tail.rotation_degrees = Vector3(90, 15, 0)
	tail.scale = Vector3(0.68, 0.68, 0.68)
	add_child(tail)


func animate(speed: float, steering: float, boost_strength: float, delta: float) -> void:
	var spin := speed * delta * 2.8
	for wheel in wheels:
		wheel.rotate_x(spin)
	if tail:
		tail.rotation_degrees.y = 15.0 + sin(Time.get_ticks_msec() * 0.008) * (7.0 + speed * 0.12)
	rotation_degrees.z = lerpf(rotation_degrees.z, -steering * minf(speed * 0.35, 9.0), delta * 7.0)
	var glow := clampf(boost_strength, 0.0, 1.0)
	body_material.emission_enabled = glow > 0.01
	body_material.emission = body_material.albedo_color.lightened(0.32)
	body_material.emission_energy_multiplier = glow * 0.8


func _add_box(node_name: String, size: Vector3, pos: Vector3, material: Material) -> MeshInstance3D:
	var instance := MeshInstance3D.new()
	instance.name = node_name
	var box := BoxMesh.new()
	box.size = size
	instance.mesh = box
	instance.material_override = material
	instance.position = pos
	add_child(instance)
	return instance


func _add_sphere(node_name: String, scale_value: Vector3, pos: Vector3, material: Material) -> MeshInstance3D:
	var instance := MeshInstance3D.new()
	instance.name = node_name
	var sphere := SphereMesh.new()
	sphere.radius = 0.5
	sphere.height = 1.0
	sphere.radial_segments = 16
	sphere.rings = 8
	instance.mesh = sphere
	instance.material_override = material
	instance.position = pos
	instance.scale = scale_value
	add_child(instance)
	return instance


func _add_cone(node_name: String, radius: float, height: float, pos: Vector3, material: Material) -> MeshInstance3D:
	var instance := MeshInstance3D.new()
	instance.name = node_name
	var cone := CylinderMesh.new()
	cone.top_radius = 0.0
	cone.bottom_radius = radius
	cone.height = height
	cone.radial_segments = 12
	instance.mesh = cone
	instance.material_override = material
	instance.position = pos
	add_child(instance)
	return instance


func _material(color: Color, roughness: float) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.roughness = roughness
	return material
