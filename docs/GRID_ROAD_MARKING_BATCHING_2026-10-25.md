# Grid road-marking batching — 2026-10-25

## Scope

This draft change is stacked on PR #105 (which is stacked on #104). It targets repeated static road-marking meshes in the current grid-road layer. It does not merge or deploy anything.

## Changes

- Replaces individually created grid lane dashes with one InstancedMesh using shared dash geometry/material.
- Replaces individually created grid edge lines with one InstancedMesh.
- Disables shadow casting and receiving on these flat static markings; they do not need to cast shadows, and their visual color/placement remains.
- Removes the second, offset set of outer grid-edge lines, leaving the batched road-edge markings as the single grid-edge treatment.
- Keeps grid road surfaces and regional curved-road geometry intact. This is not yet a full road-intersection/topology repair; the separate regional network still needs an overlap/footprint audit before the island layout is reworked.

## Why

The previous grid road helpers emitted a separate mesh for each center dash and edge line. At seven roads per axis, that produced hundreds of separate static marking meshes. Instancing preserves the repeated visual details while substantially reducing the number of draw submissions for those markings.

## Verification

- Added tests/road-marking-batching.spec.cjs to verify the marking builder uses instancing, does not create per-marking meshes, and the redundant outer-edge loops stay removed.
- The test is included in npm run test:engine.
- CI/browser tests and an Android before/after capture are still required before claiming a measured frame-time improvement.
- The road-overlap cleanup and tropical island redesign remain separate follow-up work; this patch does not claim to fix all road overlaps, crosswalk placement, or old regional geography.

## Guardrails

- Draft PR only; no merge or production deployment.
- Keep detailed nearby world geometry and gameplay behavior.
- Compare the same phone, route, graphics settings, and run duration; record average/p95 frame time, draw calls, triangles, heap, and errors.
