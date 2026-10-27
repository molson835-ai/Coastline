# Coastline Homey Adventure + Dynamic Proximity Camera Implementation Plan

Approved implementation plan for the next consolidated PR.

## Scope
1. Establish feature branch from merged #129 main head and baseline checks.
2. Expand Homey procedural interior and test walkability/bounds/transitions.
3. Implement dynamic proximity/occlusion camera with smoothing, hysteresis, tight-space detection, open-area restore, and CTM reset; add focused browser tests.
4. Add rope-bridge side collision aligned to deck/sag and test both edges/landings/CTM.
5. Terminate City roads naturally, align visual/collision/navigation endpoints, add landscape edges, and test no perimeter loop.
6. Audit actual wardrobe character/accessory assets, expose supported options, preserve CTM, and test selection matrix.
7. Implement CTM-confirmed Electric Lemonade cave: exact sign, 10 CB atomic purchase, real darkness, bounded player glow/light, five-minute on-foot rocket boots, expiry/reset/transition-safe behavior, and focused tests.
8. Restrict contextual Use/Action to valid nearby interactions and test radius/world/mode changes.
9. Correct underlying left/right vehicle steering for keyboard/touch/controller without affecting walking/camera; test forward/reverse/all shared vehicle types.
10. Normalize limo scale and complete pending City/island landscape-edge details while preserving scenery and future-island quality rules.
11. Run focused tests plus available graphics/engine/package/Babylon/gameplay checks, diagnose failures, perform Android-sized visual acceptance, update handoff with exact evidence, request review, and do not merge without authorization.

## Global constraints
- No missions or landmark discovery messages.
- Apartment GLB remains reference-only: never load/package/cache the three-part runtime chunks.
- Preserve CTM vehicle/character/appearance persistence and paint/material separation.
- Lemonade costs exactly 10 CB; rocket boots affect on-foot movement only and expire after exactly 5 minutes.
- No hidden global dungeon light or invisible City perimeter blocker.
- City/Homey retain intended full scenery; future islands retain rendering quality but remain empty beyond terrain/basic coverage until designed.
- Optimize without intentionally reducing visual quality.
- Never claim tests or PR completion without current-head evidence.
