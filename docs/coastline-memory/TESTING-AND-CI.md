# Coastline — Testing and CI

## Local test commands
From `package.json`:
- `npm run test:gameplay`
- `npm run test:engine`
- `npm run test:systems`
- `npm run test:vehicle`
- `npm run test:fidelity`
- `npm run test:adaptive-budget`
- `npm run test:vehicle-glb-fleet`
- `npm run test:mega-patch2`
- `npm test`
- `npm run package:itch`

## Focused development strategy
Use the narrowest deterministic test that answers the current question. Use the full suite at meaningful checkpoints rather than after every tiny change.

## Mega Patch 2 gates
The major gates cover sandbox/gameplay foundation, vehicle/controls, renderer performance architecture, and world/physics/visual regression.

## Diagnostics workflow
`beta-diagnostics.yml` is diagnostic-only. It was changed to be bounded, focused on the Mega Patch 2 core browser suite, capture failures, upload artifacts, and avoid repository mutation. A previous broad diagnostics run timed out after 15 minutes and then failed trying to commit a missing report; this was corrected.

## Testing lessons
- Behavioral vehicle tests are preferred over fixed array indexes.
- Visibility tests should assert candidate correctness rather than implementation-specific iteration counts unless the count is itself the requirement.
- A CI timeout does not by itself mean the game crashed.
- Do not treat a diagnostic workflow as a release gate unless its role is explicitly changed.

## Free-tier strategy
- Local tests first.
- Focused CI second.
- Full browser regression at meaningful checkpoints.
- One consolidated beta deployment after a coherent batch.
- Avoid polling workflow state repeatedly when a single final status is enough.

## Verification rule
Never report a change as passing without fresh test output or an authoritative verification result.
