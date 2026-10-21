# Coastline Home 1 — Rooftop Studio Apartment Design

**Status:** Design for review  
**Date:** 2026-10-21  
**Branch:** `coastline-home1-rooftop-studio-spec-v1`  
**Parent:** CTM branch head `295b9e9d3e8c4f53398b2d87109423c62e1c9f8c`

## 1. Purpose

Home 1 is Coastline's first persistent residential destination and the reference implementation for future interiors. It should feel like a real, desirable rooftop studio while remaining a small, bounded world that can receive substantially more visual detail than the outdoor city without increasing World 1's active runtime burden.

The home is also the first physical achievement hub: certificates earned through qualifying Coastline events are displayed on a dedicated wall rather than existing only as an abstract menu statistic.

## 2. Player-facing identity

### Exterior

- A distinctive 3–5 story apartment building should be immediately recognizable from the surrounding streets.
- A large, highly visible **APARTMENTS** sign is a defining visual feature.
- The building should have a stronger silhouette, facade treatment, entrance treatment, and rooftop profile than neighboring non-enterable buildings.
- The entrance should read as an intentional destination without relying on landmark-discovery popups.
- Only the required destination path should be interactive; surrounding apartments remain visual/non-enterable unless a future feature explicitly promotes them.

### Interior

The studio should read as a believable, lived-in apartment rather than a game-development test room. The target layout is compact and efficient:

- Entry zone.
- Bed/sleeping area.
- Living area with couch and TV.
- Kitchen run.
- Small dining/work table.
- Bathroom.
- Dedicated certificate/achievement wall.
- Exterior rooftop-access door.

The exact dimensions may adapt to the selected licensed asset, but the functional relationships should remain stable.

### Rooftop patio and garden

A small private rooftop area is attached to the studio through the rooftop-access door.

Target contents:

- Safe parapet/fence.
- Planter boxes and garden plants.
- Small seating area.
- Table.
- Outdoor lighting.
- City/coastal skyline view appropriate to the final placement.
- Optional later additions such as grill, decorative planters, or interactive gardening.

The rooftop is deliberately small so high-detail vegetation, props, lighting, and environmental storytelling can be used without expanding the active world substantially.

## 3. Certificate / achievement system

The certificate wall is a physical presentation layer for persistent player achievements.

Initial architecture should support:

- A stable achievement/certificate identifier.
- Earned/not-earned state.
- Display ordering.
- Certificate title and short description.
- Optional date or completion metadata.
- A visual placeholder for certificates not yet earned, if desired by the final UX.
- Re-entry persistence through the existing player-state architecture.

The first implementation should avoid creating a second incompatible persistence system. The certificate display should consume an authoritative achievement/player-state source and render the physical wall from that state.

## 4. CTM/world boundary

Home 1 should be implemented as a distinct CTM destination world/segment, not as a permanently active room inside World 1.

Planned conceptual route:

`World 1 apartment entrance/elevator → CTM → Home 1 studio → rooftop patio`

The exact entrance mechanism may be an apartment elevator or another masked gate, but it must use the existing CTM lifecycle rather than introducing a parallel transition system.

Future destinations should be able to reuse the same pattern:

- Rooftop/elevator → another residence.
- Doorman interaction → another residence.
- Mansion garage/front door → World 3 interior.

Home 1 is therefore a destination-world reference implementation, not a special-case loader.

## 5. Asset strategy

### Preferred approach

Use a high-quality, license-compatible GLB/glTF architectural asset or modular environment kit as the starting point, then customize it for Coastline.

Three.js officially recommends glTF/GLB for runtime 3D delivery; GLB is therefore the preferred runtime packaging format when the source asset supports it.

Asset selection must satisfy:

1. Commercial/game distribution rights suitable for Coastline.
2. Permission to modify/remix the asset.
3. No attribution or redistribution restriction that conflicts with the intended release, unless explicitly documented and acceptable.
4. Reasonable mesh/material/texture complexity for a bounded mobile-friendly world.
5. Ability to separate exterior, interior, rooftop, and reusable props where practical.

Poly Haven assets are an especially strong source for supporting materials, props, HDRIs, and environmental pieces because its assets are CC0 and explicitly permitted for commercial use. They should complement—not dictate—the apartment's distinctive architecture.

### Do not do

- Do not download an entire prebuilt game and retrofit it wholesale.
- Do not select an asset solely because it looks good in a static render while ignoring runtime geometry/material cost.
- Do not lower Coastline's global visual quality to make a poor asset fit.
- Do not commit third-party assets until their exact license is recorded.

## 6. Performance architecture

Home 1 is intentionally a small, high-detail world.

Optimization should come from bounded scope and ownership rather than visible degradation:

- Keep World 1 systems unloaded/inactive while Home 1 is authoritative.
- Keep the Home 1 playable footprint compact.
- Prefer reusable instanced props where appropriate.
- Avoid unnecessary animated systems and NPC simulation inside the apartment.
- Keep collision geometry simpler than render geometry where practical.
- Use compressed/optimized GLB assets where the visual result remains equivalent.
- Load only the assets required by Home 1 and its immediate transition path.
- Dispose only resources owned by the destination factory/instance, consistent with the CTM Three.js loader contract.

Visual quality targets apply to close-range authored detail. Performance improvements must not silently reduce resolution, shadows, materials, lighting quality, or near-field detail.

## 7. Interaction model

Initial Home 1 interactions should be deliberately limited and polished:

- Enter/exit home through CTM transition.
- Open/use rooftop door.
- Inspect/display certificate wall.
- Optional later interaction with garden objects.

Furniture should initially be environmental unless an interaction materially improves the experience without creating unnecessary runtime complexity.

## 8. Visual hierarchy

The apartment should communicate importance in three layers:

1. **Street:** large APARTMENTS sign + distinctive facade/entrance.
2. **Interior:** recognizable studio layout + certificate wall.
3. **Rooftop:** private garden/patio + skyline view.

The building itself should be discoverable through visual design, not through a popup or forced mission.

## 9. Reuse requirements

The architecture should make later residential destinations cheaper to build.

Future homes should be able to reuse:

- CTM destination registration.
- Player-state handoff.
- Achievement/certificate data source.
- Door/elevator transition contracts.
- Asset ownership/disposal conventions.
- World-boundary configuration.
- Interior interaction framework.
- Rooftop/garden prop patterns where appropriate.

Home 1-specific art and layout must remain data/content rather than being embedded into CTM itself.

## 10. Acceptance criteria for implementation

Home 1 should not be considered complete until all of the following are demonstrated:

- The exterior is visually distinguishable from ordinary apartment buildings and has a prominent APARTMENTS sign.
- The player can enter Home 1 through CTM and return to World 1 without losing player state.
- The studio contains the agreed functional layout and certificate wall.
- Earned certificates persist and render correctly after re-entry.
- The rooftop door transitions between studio and rooftop patio without introducing a parallel transition system.
- Rooftop garden/patio is visually detailed and bounded.
- Home 1 does not keep World 1's full gameplay simulation active unnecessarily.
- Destination resources are disposed according to the CTM ownership contract.
- Automated CTM tests and relevant browser smoke coverage pass on the exact implementation SHA.
- A representative-device playtest is performed before making claims about Android performance or controls.

## 11. Explicit non-goals for Home 1 v1

- No full apartment-building simulation.
- No resident NPC population.
- No mission system required solely to enter the apartment.
- No new transition framework outside CTM.
- No global renderer downgrade for Home 1.
- No requirement to build World 2's island/mansion before Home 1 is validated.
- No production promotion or CTM PR merge as part of this design stage.

## 12. Dependency gate

Implementation must wait until the current CTM lifecycle/browser acceptance work is green on an exact SHA. Once the design is approved, the next process stage is a written implementation plan; implementation itself remains gated by that plan's approval.

## 13. Research basis

- Three.js recommends glTF/GLB for runtime 3D delivery and provides `GLTFLoader` for glTF 2.0 assets.
- Poly Haven states that its HDRIs, textures, and 3D models are CC0 and may be used commercially, including redistribution as part of a product, subject to its site terms.
