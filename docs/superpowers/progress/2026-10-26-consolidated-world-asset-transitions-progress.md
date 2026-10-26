# SDD ledger — plan: docs/superpowers/plans/2026-10-26-consolidated-world-asset-transitions.md

Pre-flight: Task 1 produces the world/render contract consumed by Tasks 2–7. CTM already exposes resident world ids and lifecycle state; implementation will extend that contract without replacing CTM.

Ruling: Execute inline using the approved plan — no subagent tool is available in this session; this preserves the user's one-PR constraint while following the plan task-by-task.

Task 1: RED test added in `tests/consolidated-world-contract.spec.mjs`; expected to fail until `getWorldDefinition()`/`getWorldDefinitions()` and world contract handling are implemented.
