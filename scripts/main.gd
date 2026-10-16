extends Node3D

func _ready() -> void:
	var camera := Camera3D.new()
	camera.position = Vector3(0, 2.5, 6)
	camera.look_at_from_position(camera.position, Vector3.ZERO)
	add_child(camera)
	camera.current = true

	var light := DirectionalLight3D.new()
	light.rotation_degrees = Vector3(-45, -25, 0)
	light.light_energy = 1.0
	add_child(light)

	var ground := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = Vector3(12, 0.2, 12)
	ground.mesh = mesh
	ground.position.y = -0.1
	ground.material_override = _material(Color(0.25, 0.42, 0.22))
	add_child(ground)

	var label := Label.new()
	label.text = "COASTLINE\nGodot Android test OK"
	label.position = Vector2(32, 32)
	label.add_theme_font_size_override("font_size", 28)
	add_child(label)

func _material(color: Color) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	return material
