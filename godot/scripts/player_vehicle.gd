extends CharacterBody3D
class_name CoastlineTestVehicle

@export var acceleration: float = 18.0
@export var reverse_acceleration: float = 12.0
@export var max_forward_speed: float = 32.0
@export var max_reverse_speed: float = 10.0
@export var steering_rate: float = 1.65
@export var drag: float = 5.0

var speed: float = 0.0

func _physics_process(delta: float) -> void:
    var throttle := Input.get_axis("drive_reverse", "drive_forward")
    var steering := Input.get_axis("steer_left", "steer_right")

    if throttle > 0.0:
        speed = minf(speed + acceleration * throttle * delta, max_forward_speed)
    elif throttle < 0.0:
        speed = maxf(speed + reverse_acceleration * throttle * delta, -max_reverse_speed)
    else:
        speed = move_toward(speed, 0.0, drag * delta)

    if absf(speed) > 0.15:
        rotate_y(-steering * steering_rate * delta * clampf(absf(speed) / 7.0, 0.2, 1.0) * signf(speed))

    var forward := -global_transform.basis.z
    velocity.x = forward.x * speed
    velocity.z = forward.z * speed
    velocity.y -= 24.0 * delta
    move_and_slide()
    if is_on_floor() and velocity.y < 0.0:
        velocity.y = -0.5
