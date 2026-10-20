# Coastline — Gameplay Systems

## Sandbox
Mega Patch 2 uses a clean sandbox while preserving higher-level systems internally.

Suppressed in normal sandbox:
- missions
- mission objectives/rewards
- replayability encounter cues/spawning
- landmark discovery popups/rewards
- unnecessary activity notifications

These systems should remain architecturally intact for later reactivation.

## Player/vehicle
The game should start with the player already in the authoritative starter vehicle, parked directly outside the garage. Starter cash is $10,000.

Steering must have one command path:
- A / left touch = LEFT
- D / right touch = RIGHT
- progressive/time-held steering remains
- keyboard and touch feed the same underlying command

## Garage
Garage interaction is vehicle-only.
- In vehicle + near garage: show `ENTER GARAGE`.
- On foot: no garage interaction.
- Approaching the garage on foot should do nothing.
- Entering garage takes the current vehicle directly into upgrade/customization.
- Garage is visually prominent and positioned toward a curb/corner with frontage clear enough to read.
- Only the intended garage/service building is accessible for now.

## Character
Required behavior includes:
- crouch animation/blend
- walk transitions
- jump and landing
- smooth camera transitions

## Collisions
Collision proxies are expected for buildings, stop signs, traffic lights, poles, and garage. Render meshes and collision proxies should be separable.

## UI
Transient task/notification messages should show, remain readable for roughly 2–4 seconds, fade, and disappear. They may reappear when meaningful progress/pickup events occur.

## Audio
Audio should be profiled as a controlled variable because a previous test showed sound activation coinciding with a large lag increase. Avoid treating audio as the root cause without fresh measurement.
