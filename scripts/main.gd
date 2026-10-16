extends Node3D

# Coastline Godot prototype 0.1
# Lightweight procedural benchmark: street grid, collidable buildings, arcade car,
# follow camera, and touch controls. The original browser game remains untouched.

var car: CharacterBody3D
var camera: Camera3D
var speed := 0.0
var heading := 0.0
var controls := {"left": false, "right": false, "accelerate": false, "brake": false}
var speed_label: Label
var status_label: Label
var ui_layer: CanvasLayer

const MAX_FORWARD_SPEED := 23.0
const MAX_REVERSE_SPEED := 8.0
const ACCELERATION := 12.0
const BRAKE_POWER := 20.0
const DRAG := 5.0
const STEERING_RATE := 1.35

func _ready() -> void:
	_make_environment()
	_make_world()
	_make_coastal_slice()
	_make_car()
	_make_camera()
	_make_ui()

func _make_environment() -> void:
	var world_env := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	env.sky = Sky.new()
	env.sky.sky_material = ProceduralSkyMaterial.new()
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.68, 0.76, 0.86)
	env.ambient_light_energy = 0.7
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	world_env.environment = env
	add_child(world_env)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-48.0, -28.0, 0.0)
	sun.light_energy = 1.25
	sun.shadow_enabled = true
	add_child(sun)

func _material(color: Color, roughness: float = 0.9) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = roughness
	return mat

func _box(parent: Node3D, name: String, pos: Vector3, size: Vector3, mat: Material, solid: bool = false) -> Node3D:
	var mesh_node := MeshInstance3D.new()
	mesh_node.name = name
	var mesh := BoxMesh.new()
	mesh.size = size
	mesh_node.mesh = mesh
	mesh_node.material_override = mat
	mesh_node.position = pos
	parent.add_child(mesh_node)
	if solid:
		var body := StaticBody3D.new()
		body.name = name + "Collision"
		body.position = pos
		var shape_node := CollisionShape3D.new()
		var shape := BoxShape3D.new()
		shape.size = size
		shape_node.shape = shape
		body.add_child(shape_node)
		parent.add_child(body)
	return mesh_node

func _make_world() -> void:
	var grass := _material(Color(0.22, 0.36, 0.20))
	var asphalt := _material(Color(0.105, 0.12, 0.13))
	var concrete := _material(Color(0.56, 0.55, 0.50))
	var white := _material(Color(0.88, 0.86, 0.72))
	var yellow := _material(Color(0.95, 0.68, 0.16))
	_box(self, "Terrain", Vector3(0, -0.18, 0), Vector3(150, 0.3, 150), grass, true)
	_box(self, "NorthSouthRoad", Vector3(0, 0.005, 0), Vector3(10, 0.08, 150), asphalt)
	_box(self, "EastWestRoad", Vector3(0, 0.008, 0), Vector3(150, 0.085, 10), asphalt)
	for side in [-1.0, 1.0]:
		_box(self, "SidewalkNS", Vector3(side * 6.2, 0.11, 0), Vector3(2.3, 0.22, 150), concrete)
		_box(self, "SidewalkEW", Vector3(0, 0.11, side * 6.2), Vector3(150, 0.22, 2.3), concrete)
	for z in range(-70, 71, 8):
		if abs(z) > 7:
			_box(self, "CenterDash", Vector3(0, 0.06, float(z)), Vector3(0.12, 0.025, 3.5), yellow)
	for x in range(-70, 71, 8):
		if abs(x) > 7:
			_box(self, "CenterDash", Vector3(float(x), 0.06, 0), Vector3(3.5, 0.025, 0.12), yellow)
	for i in range(6):
		var offset := -4.0 + float(i) * 1.6
		_box(self, "CrosswalkNorth", Vector3(offset, 0.07, -6.0), Vector3(0.9, 0.025, 1.5), white)
		_box(self, "CrosswalkSouth", Vector3(offset, 0.07, 6.0), Vector3(0.9, 0.025, 1.5), white)
	var palettes := [
		_material(Color(0.68, 0.48, 0.34)), _material(Color(0.72, 0.69, 0.59)),
		_material(Color(0.40, 0.53, 0.57)), _material(Color(0.73, 0.72, 0.66)),
		_material(Color(0.52, 0.57, 0.43)), _material(Color(0.65, 0.43, 0.34))
	]
	for bx in range(-1, 2):
		for bz in range(-1, 2):
			if bx == 0 and bz == 0:
				continue
			var center := Vector3(float(bx) * 30.0, 0.0, float(bz) * 30.0)
			_make_building(center + Vector3(-7.5, 0, -7.5), Vector2(10, 11), 5.0 + float(posmod(bx * 3 + bz * 5 + 30, 4)) * 1.4, palettes[posmod(bx * 2 + bz + 12, palettes.size())])
			_make_building(center + Vector3(7.0, 0, 7.5), Vector2(10, 10), 4.0 + float(posmod(bx * 5 - bz * 2 + 30, 5)) * 1.1, palettes[posmod(bx + bz * 3 + 18, palettes.size())])
	for p in [Vector3(-13,0,-18), Vector3(14,0,-19), Vector3(-18,0,14), Vector3(19,0,16), Vector3(-13,0,43), Vector3(16,0,43), Vector3(43,0,-14), Vector3(44,0,14), Vector3(-44,0,-14), Vector3(-43,0,17)]:
		_make_tree(p)


# A deliberately small first art-directed region: one coastal edge, beach,
# shoreline rocks and palms. Keep the water beyond the playable ground so the
# slice feels like a place rather than an endless green test grid.
func _make_coastal_slice() -> void:
	var sand := _material(Color(0.76, 0.66, 0.46), 0.96)
	var wet_sand := _material(Color(0.57, 0.52, 0.40), 0.82)
	var ocean_mat := _material(Color(0.035, 0.29, 0.39), 0.22)
	ocean_mat.metallic = 0.08
	# The existing terrain ends at z=75; the beach fills its final 17 metres.
	_box(self, "CoastalDrySand", Vector3(0, -0.012, 66.5), Vector3(150, 0.035, 17), sand)
	_box(self, "WetShoreline", Vector3(0, -0.006, 74.2), Vector3(150, 0.025, 1.6), wet_sand)
	# Flat, inexpensive water is intentional for the first mobile performance pass.
	_box(self, "Ocean", Vector3(0, -0.025, 155), Vector3(320, 0.035, 162), ocean_mat)
	var rock_mats := [
		_material(Color(0.36, 0.39, 0.37), 0.95),
		_material(Color(0.47, 0.45, 0.40), 0.92)
	]
	for i in range(19):
		var x := -68.0 + float(i) * 7.5
		var rock := MeshInstance3D.new()
		rock.name = "ShoreRock"
		var mesh := SphereMesh.new()
		mesh.radius = 0.7 + float((i * 7) % 5) * 0.16
		mesh.height = mesh.radius * 1.25
		rock.mesh = mesh
		rock.material_override = rock_mats[i % rock_mats.size()]
		rock.scale = Vector3(1.35, 0.72, 0.9)
		rock.position = Vector3(x, 0.15, 73.3 - float(i % 3) * 0.55)
		add_child(rock)
	# A handful of palms give the beach a readable silhouette without a heavy
	# imported foliage pack. These are art placeholders to be replaced by licensed assets.
	for p in [Vector3(-48,0,62), Vector3(-25,0,60), Vector3(24,0,61), Vector3(48,0,63)]:
		_make_palm(p)

func _make_palm(pos: Vector3) -> void:
	var trunk_mat := _material(Color(0.42, 0.29, 0.16), 0.92)
	var leaf_mat := _material(Color(0.12, 0.31, 0.19), 0.86)
	var trunk := MeshInstance3D.new()
	var trunk_mesh := CylinderMesh.new()
	trunk_mesh.top_radius = 0.12
	trunk_mesh.bottom_radius = 0.22
	trunk_mesh.height = 4.1
	trunk.mesh = trunk_mesh
	trunk.material_override = trunk_mat
	trunk.position = pos + Vector3(0, 2.05, 0)
	trunk.rotation_degrees.z = -5.0
	add_child(trunk)
	for i in range(6):
		var angle := TAU * float(i) / 6.0
		var frond := MeshInstance3D.new()
		var frond_mesh := CylinderMesh.new()
		frond_mesh.top_radius = 0.025
		frond_mesh.bottom_radius = 0.13
		frond_mesh.height = 2.6
		frond.mesh = frond_mesh
		frond.material_override = leaf_mat
		frond.position = pos + Vector3(cos(angle) * 0.95, 4.05, sin(angle) * 0.95)
		frond.rotation = Vector3(0.25, angle, 1.05)
		add_child(frond)

func _make_building(center: Vector3, footprint: Vector2, height: float, facade: Material) -> void:
	var root := Node3D.new()
	root.name = "Building"
	root.position = Vector3(center.x, 0.0, center.z)
	add_child(root)
	_box(root, "Facade", Vector3(0, height * 0.5, 0), Vector3(footprint.x, height, footprint.y), facade, true)
	var glass := _material(Color(0.12, 0.28, 0.34), 0.3)
	var trim := _material(Color(0.88, 0.82, 0.65))
	for level in range(maxi(1, int(height / 2.1))):
		var y := 1.0 + float(level) * 2.0
		for col in range(3):
			var x := -footprint.x * 0.32 + float(col) * footprint.x * 0.32
			_box(root, "Window", Vector3(x, y, footprint.y * 0.501), Vector3(1.45, 0.95, 0.06), glass)
			_box(root, "WindowSill", Vector3(x, y - 0.53, footprint.y * 0.52), Vector3(1.55, 0.08, 0.09), trim)
	_box(root, "EntryDoor", Vector3(0, 1.0, footprint.y * 0.51), Vector3(0.9, 1.9, 0.07), glass)
	_box(root, "RoofEdge", Vector3(0, height + 0.12, 0), Vector3(footprint.x + 0.3, 0.24, footprint.y + 0.3), trim)

func _make_tree(pos: Vector3) -> void:
	var trunk_mat := _material(Color(0.28, 0.19, 0.12))
	var leaf_mat := _material(Color(0.12, 0.29, 0.15))
	var trunk := MeshInstance3D.new()
	var trunk_mesh := CylinderMesh.new()
	trunk_mesh.top_radius = 0.18
	trunk_mesh.bottom_radius = 0.26
	trunk_mesh.height = 2.2
	trunk.mesh = trunk_mesh
	trunk.material_override = trunk_mat
	trunk.position = pos + Vector3(0, 1.1, 0)
	add_child(trunk)
	var crown := MeshInstance3D.new()
	var crown_mesh := SphereMesh.new()
	crown_mesh.radius = 1.25
	crown_mesh.height = 2.4
	crown.mesh = crown_mesh
	crown.material_override = leaf_mat
	crown.position = pos + Vector3(0, 2.8, 0)
	add_child(crown)

func _make_car() -> void:
	car = CharacterBody3D.new()
	car.name = "PlayerCar"
	car.position = Vector3(0, 0.75, 18)
	add_child(car)
	var collision := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(1.8, 1.0, 3.7)
	collision.shape = shape
	car.add_child(collision)
	var paint := _material(Color(0.035, 0.12, 0.20), 0.26)
	var glass := _material(Color(0.06, 0.17, 0.22), 0.2)
	var rubber := _material(Color(0.035, 0.04, 0.045))
	var alloy := _material(Color(0.56, 0.59, 0.61), 0.28)
	_box(car, "Body", Vector3(0, 0.0, 0), Vector3(1.78, 0.48, 3.6), paint)
	_box(car, "Cabin", Vector3(0, 0.42, -0.18), Vector3(1.35, 0.52, 1.75), glass)
	_box(car, "Hood", Vector3(0, 0.22, -1.15), Vector3(1.52, 0.18, 1.0), paint)
	_box(car, "RearDeck", Vector3(0, 0.24, 1.25), Vector3(1.5, 0.16, 0.65), paint)
	for side in [-1.0, 1.0]:
		for z in [-1.18, 1.18]:
			var wheel := MeshInstance3D.new()
			var wheel_mesh := CylinderMesh.new()
			wheel_mesh.top_radius = 0.38
			wheel_mesh.bottom_radius = 0.38
			wheel_mesh.height = 0.22
			wheel.mesh = wheel_mesh
			wheel.material_override = rubber
			wheel.rotation_degrees.z = 90
			wheel.position = Vector3(side * 0.91, -0.12, z)
			car.add_child(wheel)
			var hub := MeshInstance3D.new()
			var hub_mesh := CylinderMesh.new()
			hub_mesh.top_radius = 0.19
			hub_mesh.bottom_radius = 0.19
			hub_mesh.height = 0.235
			hub.mesh = hub_mesh
			hub.material_override = alloy
			hub.rotation_degrees.z = 90
			hub.position = Vector3(side * 0.91, -0.12, z)
			car.add_child(hub)
		for z in [-1.72, 1.72]:
			_box(car, "Lamp", Vector3(side * 0.55, 0.03, z), Vector3(0.32, 0.13, 0.05), _material(Color(0.95, 0.86, 0.57), 0.3))

func _make_camera() -> void:
	camera = Camera3D.new()
	camera.name = "FollowCamera"
	camera.fov = 72.0
	add_child(camera)
	camera.current = true

func _make_ui() -> void:
	ui_layer = CanvasLayer.new()
	add_child(ui_layer)
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ui_layer.add_child(root)
	status_label = Label.new()
	status_label.text = "COASTLINE  •  GODOT PROTOTYPE"
	status_label.position = Vector2(16, 12)
	status_label.add_theme_font_size_override("font_size", 16)
	status_label.add_theme_color_override("font_color", Color(1, 1, 1))
	root.add_child(status_label)
	speed_label = Label.new()
	speed_label.text = "0 km/h"
	speed_label.position = Vector2(16, 36)
	speed_label.add_theme_font_size_override("font_size", 22)
	speed_label.add_theme_color_override("font_color", Color(1, 1, 1))
	root.add_child(speed_label)
	_add_touch_button(root, "◀", "left", 0.035, 0.78, 0.13, 0.94)
	_add_touch_button(root, "▶", "right", 0.17, 0.78, 0.265, 0.94)
	_add_touch_button(root, "BRAKE", "brake", 0.73, 0.79, 0.84, 0.94)
	_add_touch_button(root, "GAS ▲", "accelerate", 0.855, 0.75, 0.975, 0.94)
	var hint := Label.new()
	hint.text = "Touch controls • W/S + A/D also work"
	hint.anchor_left = 0.5
	hint.anchor_right = 0.5
	hint.anchor_top = 1.0
	hint.anchor_bottom = 1.0
	hint.offset_left = -170
	hint.offset_right = 170
	hint.offset_top = -28
	hint.offset_bottom = -6
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint.add_theme_font_size_override("font_size", 12)
	root.add_child(hint)

func _add_touch_button(root: Control, label_text: String, action: String, left: float, top: float, right: float, bottom: float) -> void:
	var button := Button.new()
	button.text = label_text
	button.anchor_left = left
	button.anchor_top = top
	button.anchor_right = right
	button.anchor_bottom = bottom
	button.offset_left = 0
	button.offset_top = 0
	button.offset_right = 0
	button.offset_bottom = 0
	button.focus_mode = Control.FOCUS_NONE
	button.add_theme_font_size_override("font_size", 19)
	button.add_theme_color_override("font_color", Color(1, 1, 1))
	button.add_theme_stylebox_override("normal", _button_style(Color(0.04, 0.08, 0.12, 0.78)))
	button.add_theme_stylebox_override("pressed", _button_style(Color(0.12, 0.36, 0.52, 0.95)))
	button.button_down.connect(func(): controls[action] = true)
	button.button_up.connect(func(): controls[action] = false)
	root.add_child(button)

func _button_style(color: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.corner_radius_top_left = 14
	style.corner_radius_top_right = 14
	style.corner_radius_bottom_left = 14
	style.corner_radius_bottom_right = 14
	style.border_width_left = 2
	style.border_width_right = 2
	style.border_width_top = 2
	style.border_width_bottom = 2
	style.border_color = Color(0.72, 0.82, 0.9, 0.85)
	return style

func _physics_process(delta: float) -> void:
	if car == null:
		return
	var accelerate := controls["accelerate"] or Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP)
	var brake := controls["brake"] or Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN)
	var left := controls["left"] or Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT)
	var right := controls["right"] or Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT)
	if accelerate:
		speed = move_toward(speed, MAX_FORWARD_SPEED, ACCELERATION * delta)
	elif brake:
		if speed > 0.8:
			speed = move_toward(speed, 0.0, BRAKE_POWER * delta)
		else:
			speed = move_toward(speed, -MAX_REVERSE_SPEED, ACCELERATION * 0.65 * delta)
	else:
		speed = move_toward(speed, 0.0, DRAG * delta)
	var steer := float(right) - float(left)
	var steering_strength := clampf(absf(speed) / 4.0, 0.15, 1.0)
	heading += steer * STEERING_RATE * steering_strength * delta * (1.0 if speed >= 0.0 else -1.0)
	car.rotation.y = heading
	car.velocity.x = sin(heading) * speed
	car.velocity.z = -cos(heading) * speed
	car.velocity.y = -9.8
	car.move_and_slide()
	speed_label.text = str(roundi(absf(speed) * 3.6)) + " km/h"
	_update_camera(delta)

func _update_camera(delta: float) -> void:
	var behind := Vector3(sin(heading) * 8.0, 4.0, cos(heading) * 8.0)
	var target_pos := car.global_position + behind
	camera.global_position = camera.global_position.lerp(target_pos, clampf(delta * 4.0, 0.0, 1.0))
	camera.look_at(car.global_position + Vector3(0, 1.0, 0), Vector3.UP)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode == KEY_R:
		car.position = Vector3(0, 0.75, 18)
		car.velocity = Vector3.ZERO
		heading = 0.0
		speed = 0.0
