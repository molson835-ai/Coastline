# Cave, CTM, Mount, and Character Polish

Date: 2026-10-29
Status: Implementation scope for the next PR
Target branch: `feat/cave-ctm-mount-character-polish`
Base: `main` after merged PR #135

## Non-negotiable sequencing

1. Reorient and relocate the complete Cave Island formation first. The cave mouth must face the same side as the lemonade stand.
2. Remove the unwanted Cave Island road and boardwalk; correct visible-rock collision and eliminate stray invisible barriers.
3. Only after the cave geometry and threshold are in their final position, repair and verify the CTM trigger/return lifecycle.
4. Build the cavern labyrinth and then add rocket boots inside it. Do not implement or tune the rocket boots against the old threshold coordinates.
5. Upgrade horse/ostrich mounting and animation behavior, convertible driver visibility, and character head/hair appearance.
6. Correct mobile/keyboard steering mappings and add a joystick-vs-button control evaluation.
7. Fix Homey CTM destination heading so the character exits facing away from the portal and continues in the intended travel direction.
8. Run targeted tests, full automated checks, package smoke test, then request a real Android playtest. Do not merge or deploy without explicit authorization.

## Cave Island geometry and collision

- Rotate/reorient the full cave formation, not just its entrance mesh, so the mouth faces the lemonade-stand side.
- Preserve authored approach routes and the lemonade stand; remove the odd road and boardwalk from Cave Island.
- Ensure visible rock surfaces block player movement where they appear solid.
- Remove stale or oversized invisible collision volumes around the cave; do not fix this by globally disabling collision.
- Add regression coverage for approach from the intended side, passage through the entrance, collision with solid stone, and movement through legitimate open paths.
- Confirm collision shapes align with the rotated visual formation and remain valid after world activation.

## CTM and cavern labyrinth

- Keep CTM as the sole world-transition authority.
- Move the cave threshold only after geometry is finalized; then align trigger volume, approach direction, destination spawn, return point, and world IDs.
- Cover repeated entry/exit, rapid re-entry, failed load/recovery, spawn placement, and player/vehicle state preservation.
- For Homey Island transitions, calculate destination heading from the destination portal's outward direction (or a clearly authored destination heading), not by blindly reusing the entry heading. After crossing, the character must face away from the CTM and continue along the path away from it. Verify both entering and returning, walking forward/backward, and garage/interior transitions as applicable.
- Create a meaningfully sized connected cavern labyrinth with multiple routes, bends, branches, dead ends, landmarks, and a reliable exit. Keep it navigable and visually legible without discovery popups or missions.
- Implement rocket boots only after the relocated threshold is working. Ensure activation, duration/state, movement, landing, cave collision, and world exit are handled safely.

## Mobile driving controls research and acceptance

- Current issue: left/right steering remains reversed. Fix the underlying input-to-steering mapping first, rather than masking it with a cosmetic UI change.
- Research indicates analog steering is common for driving games, but virtual joysticks have no tactile feedback and can be harder to use precisely. Apple recommends a horizontal thumbstick or D-pad for steering, with acceleration/braking on separate controls; Microsoft guidance stresses accessible thumb placement, responsive press states, and testing relative versus absolute joystick behavior.
- Implement a free, lightweight virtual horizontal steering joystick as a candidate option, with distinct accelerator and brake/reverse buttons. Keep keyboard steering mappings correct and consistent.
- Compare it against corrected left/right buttons on the actual Android browser build. If practical, provide a small in-game control preference (joystick/buttons); otherwise test both in a temporary/dev-only mode and select the more reliable default based on real-device results.
- Steering joystick should use horizontal axis only; add a dead zone, smooth proportional steering, speed-aware steering sensitivity, return-to-center, pointer/touch cancellation, multi-touch-safe handling, and release-on-blur/visibility-change so steering never sticks.
- Do not bind vertical joystick movement to acceleration/braking. Keep forward/reverse separate, and verify left means left, right means right, both when moving forward and reversing.
- Preserve keyboard and any gamepad controls; do not add paid libraries/plugins.

## Rideable wildlife

- Inspect the supplied `Warhorse_Lite_v1.0.0.zip` before integration. It contains `Warhorse_Lite.glb`, `Warhorse_Lite.fbx`, README, license, and preview.
- GLB metadata inspection found one skin, 41 nodes, and four animation clips: `canter_loop`, `idle_loop`, `rear`, and `walk_loop`. The rig includes `saddle_socket` and stirrup nodes.
- Follow the included license: the asset may be packaged in the game, but must not be redistributed as a standalone asset or asset pack. Credit “Warhorse by Literock Studios” is appreciated but not required. Do not include the ZIP as a distributable game asset.
- Use suitable idle/walk/canter clips based on movement speed, and keep rider attachment stable at the saddle socket. Test mounting/dismounting and transitions.
- Inspect ostrich rig/animations separately. Reuse mount-state and rider-attachment logic, but only use animation retargeting or procedural gait logic compatible with the ostrich skeleton.
- Compare model scale and collision capsule so the horse feels substantial without breaking road/door clearance.

## Convertible seating and character head

- Identify vehicle body/open-roof metadata or vehicle-specific seat/camera configuration. Keep the driver head visible in convertibles while preserving proper enclosed-car seating.
- Inspect the character GLB and current helmet toggle/material/visibility logic. The Warhorse ZIP contains no character hair or helmet assets, so it cannot by itself fix the bald head.
- Prefer an already included compatible hair/head asset or a free, license-verified asset; otherwise create a simple compatible procedural hairstyle/head covering. Do not spend money or paid generation credits.
- Test helmet on/off, hair visibility, head transforms, camera clipping, convertible and enclosed vehicles, and world transitions.

## Verification gates

- Add focused deterministic tests for cave geometry orientation/configuration, rock collision and barrier cleanup, threshold/CTM round trips, labyrinth connectivity/exit, and rocket boots after threshold relocation.
- Add asset contract checks for Warhorse animation names, saddle socket, license/packaging restrictions, and compatible ostrich mount behavior.
- Add browser regressions for convertible head visibility, helmet/hair toggle, correct steering polarity, joystick pointer/touch lifecycle, and Homey destination heading away from CTM.
- Run engine/system/gameplay tests, Babylon preview validation, graphics-quality guard, HTML5 package build and smoke test.
- Clearly report automated results separately from the Android playtest; desktop CI is not proof of mobile acceptance.
- Keep all tools/assets free. Do not merge or deploy without explicit user authorization.
