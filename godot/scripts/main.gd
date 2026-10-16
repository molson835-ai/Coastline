extends Node3D

const VEHICLE_SCRIPT = preload("res://scripts/player_vehicle.gd")
var vehicle: CharacterBody3D
var follow_camera: Camera3D
var status_label: Label3D

func _ready() -> void:
    _build_environment()
    _build_road_grid()
    _build_vegetation()
    _build_vehicle()
    _build_hud()

func _process(delta: float) -> void:
    if is_instance_valid(vehicle) and is_instance_valid(follow_camera):
        var offset := Vector3(0.0, 4.2, 8.5).rotated(Vector3.UP, vehicle.rotation.y)
        follow_camera.global_position = follow_camera.global_position.lerp(vehicle.global_position + offset, 1.0 - exp(-5.0 * delta))
        follow_camera.look_at(vehicle.global_position + Vector3(0.0, 1.0, 0.0), Vector3.UP)
    if is_instance_valid(status_label) and is_instance_valid(vehicle):
        status_label.text = "COASTLINE DRIVE  |  %03d km/h\nWASD / arrows • controller" % int(absf(vehicle.speed) * 3.6)

func _build_environment() -> void:
    var world := WorldEnvironment.new()
    var environment := Environment.new()
    environment.background_mode = Environment.BG_SKY
    environment.sky = Sky.new()
    environment.sky.sky_material = ProceduralSkyMaterial.new()
    environment.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
    environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
    world.environment = environment
    add_child(world)

    var sun := DirectionalLight3D.new()
    sun.rotation_degrees = Vector3(-38.0, -28.0, 0.0)
    sun.light_energy = 1.25
    sun.shadow_enabled = true
    add_child(sun)

    var ground := MeshInstance3D.new()
    var plane := PlaneMesh.new()
    plane.size = Vector2(1400.0, 1400.0)
    ground.mesh = plane
    ground.position.y = -0.12
    ground.material_override = _material(Color(0.24, 0.37, 0.24), 1.0)
    add_child(ground)

    var body := StaticBody3D.new()
    var collision := CollisionShape3D.new()
    var shape := BoxShape3D.new()
    shape.size = Vector3(1400.0, 0.2, 1400.0)
    collision.shape = shape
    collision.position.y = -0.12
    body.add_child(collision)
    add_child(body)

func _build_road_grid() -> void:
    for axis in ["x", "z"]:
        for lane_index in range(-3, 4):
            var road := MeshInstance3D.new()
            var road_mesh := BoxMesh.new()
            road_mesh.size = Vector3(1400.0, 0.08, 13.0) if axis == "x" else Vector3(13.0, 0.08, 1400.0)
            road.mesh = road_mesh
            road.position = Vector3(0.0, -0.015, lane_index * 180.0) if axis == "x" else Vector3(lane_index * 180.0, -0.015, 0.0)
            road.material_override = _material(Color(0.105, 0.12, 0.13), 0.95)
            add_child(road)

            var marking := MeshInstance3D.new()
            var marking_mesh := BoxMesh.new()
            marking_mesh.size = Vector3(1400.0, 0.025, 0.16) if axis == "x" else Vector3(0.16, 0.025, 1400.0)
            marking.mesh = marking_mesh
            marking.position = road.position + Vector3(0.0, 0.055, 0.0)
            marking.material_override = _material(Color(0.88, 0.78, 0.48), 0.8)
            add_child(marking)

func _build_vegetation() -> void:
    var rng := RandomNumberGenerator.new()
    rng.seed = 20261015
    for i in range(180):
        var x := rng.randf_range(-620.0, 620.0)
        var z := rng.randf_range(-620.0, 620.0)
        if _near_road(x, z):
            continue
        var tree := Node3D.new()
        tree.position = Vector3(x, 0.0, z)

        var trunk := MeshInstance3D.new()
        var trunk_mesh := CylinderMesh.new()
        trunk_mesh.top_radius = 0.16
        trunk_mesh.bottom_radius = 0.24
        trunk_mesh.height = rng.randf_range(1.6, 2.8)
        trunk.mesh = trunk_mesh
        trunk.position.y = trunk_mesh.height * 0.5
        trunk.material_override = _material(Color(0.28, 0.18, 0.11), 1.0)
        tree.add_child(trunk)

        var crown := MeshInstance3D.new()
        var crown_mesh := SphereMesh.new()
        var crown_scale := rng.randf_range(1.1, 2.0)
        crown_mesh.radius = crown_scale
        crown_mesh.height = crown_scale * 2.0
        crown.mesh = crown_mesh
        crown.position.y = trunk_mesh.height + crown_scale * 0.55
        crown.material_override = _material(Color(0.12, rng.randf_range(0.25, 0.39), 0.17), 1.0)
        tree.add_child(crown)
        add_child(tree)

func _build_vehicle() -> void:
    vehicle = CharacterBody3D.new()
    vehicle.name = "PlayerVehicle"
    vehicle.set_script(VEHICLE_SCRIPT)
    vehicle.position = Vector3(0.0, 1.1, 0.0)

    var collider := CollisionShape3D.new()
    var shape := BoxShape3D.new()
    shape.size = Vector3(1.9, 1.1, 4.0)
    collider.shape = shape
    collider.position.y = 0.55
    vehicle.add_child(collider)

    var body := MeshInstance3D.new()
    var body_mesh := BoxMesh.new()
    body_mesh.size = Vector3(1.9, 0.75, 4.0)
    body.mesh = body_mesh
    body.position.y = 0.65
    body.material_override = _material(Color(0.045, 0.12, 0.19), 0.28, 0.55)
    vehicle.add_child(body)

    var cabin := MeshInstance3D.new()
    var cabin_mesh := BoxMesh.new()
    cabin_mesh.size = Vector3(1.48, 0.7, 1.8)
    cabin.mesh = cabin_mesh
    cabin.position = Vector3(0.0, 1.28, -0.15)
    cabin.material_override = _material(Color(0.12, 0.22, 0.27), 0.18, 0.35)
    vehicle.add_child(cabin)

    for x in [-0.98, 0.98]:
        for z in [-1.25, 1.25]:
            var wheel := MeshInstance3D.new()
            var wheel_mesh := CylinderMesh.new()
            wheel_mesh.top_radius = 0.39
            wheel_mesh.bottom_radius = 0.39
            wheel_mesh.height = 0.24
            wheel.mesh = wheel_mesh
            wheel.rotation.z = PI * 0.5
            wheel.position = Vector3(x, 0.38, z)
            wheel.material_override = _material(Color(0.035, 0.04, 0.045), 0.95)
            vehicle.add_child(wheel)

    add_child(vehicle)
    follow_camera = Camera3D.new()
    follow_camera.name = "ChaseCamera"
    follow_camera.current = true
    follow_camera.fov = 72.0
    vehicle.add_child(follow_camera)
    follow_camera.position = Vector3(0.0, 5.0, 10.0)

func _build_hud() -> void:
    status_label = Label3D.new()
    status_label.name = "DriveStatus"
    status_label.position = Vector3(-5.0, 3.0, -7.0)
    status_label.font_size = 32
    status_label.pixel_size = 0.003
    status_label.modulate = Color(0.95, 0.97, 1.0)
    vehicle.add_child(status_label)

func _near_road(x: float, z: float) -> bool:
    return absf(x - roundf(x / 180.0) * 180.0) < 12.0 or absf(z - roundf(z / 180.0) * 180.0) < 12.0

func _material(color: Color, roughness: float, metallic: float = 0.0) -> StandardMaterial3D:
    var mat := StandardMaterial3D.new()
    mat.albedo_color = color
    mat.roughness = roughness
    mat.metallic = metallic
    return mat
