# Coastline Strategic Direction v1

**Date:** 2026-10-21  
**Status:** Design approved by project owner; implementation planning not yet authorized  
**Scope:** Long-term product/game architecture and content strategy

## 1. Product identity

Coastline is a family-friendly open-world **hybrid adventure** combining:

- driving as the foundational gameplay loop;
- exploration and environmental discovery;
- light life/progression systems;
- cinematic, movie-adventure moments;
- authored worlds connected through segmented loading.

The intended player experience is not simply waypoint-driven mission completion. Coastline should encourage players to notice things, become curious, investigate, interact, discover, and remember.

The game may evoke the feeling of classic adventure and time-travel/adventure cinema through original situations, environmental storytelling, visual jokes, mysteries, recurring characters, and cinematic reveals. It should not depend on copying protected characters or recreating copyrighted scenes.

## 2. Strategic decisions

### A. Core gameplay direction: Hybrid

Driving remains central, but exploration, characters, homes, discoveries, and adventure are first-class systems.

### B. Persistence: Layered

Coastline should progressively remember meaningful player state without requiring a fully simulated city. Persistence can begin with progression and important world state, then expand to NPC relationships, property history, discoveries, and changing locations where the payoff is noticeable.

### C. World architecture: Expandable authored worlds

The game should grow through intentionally authored worlds rather than one increasingly enormous map. Each world is bounded and optimized, with CTM responsible for controlled transitions and lifecycle management.

Representative future structure:

- World 1: Coastal City
- World 2: Island / Estate
- World 3: Mansion Interior
- World 4+: additional authored destinations as warranted

New worlds must remain affordable in memory, loading time, testing, and maintenance.

## 3. Coastline design principle

> **Make the player notice things.**
>
> Do not constantly tell the player where to go, what matters, and what happens next. Provide enough visual, audio, behavioral, and environmental clues that curiosity becomes a navigation system.

This principle should guide missions, NPCs, discoveries, UI, audio, world design, and future accessibility work.

## 4. Visual language

Coastline should establish a consistent visual language that helps players understand the world, including younger players, without relying on excessive UI.

### NPC importance cues

NPCs may communicate meaning through combinations of:

- clothing/material color;
- accessories;
- silhouette/shape;
- clothing or cleanliness state;
- animation and behavior;
- environmental positioning;
- optional symbols/icons;
- sound/dialogue cues.

Color must never be the sole required signal. Important meanings should have redundant visual/behavioral cues so color-blind players can understand them.

### Proposed semantic color families

These are semantic families, not locked RGB values:

| Family | Intended meaning |
|---|---|
| Blue | Normal / helpful |
| Green | Service / activity |
| Yellow | Important / attention |
| Orange | Special opportunity |
| Purple | Mystery / discovery |
| Red | Urgent / emergency |
| Gold/white | Rare / major |

The final palette must be validated for accessibility and visual cohesion with the game's cinematic rendering.

## 5. NPC state and asset strategy

NPC identity should not require a unique model for every gameplay role. A smaller library of high-quality base characters should support combinations of:

**base character → clothing variant → color/material variant → accessory → animation → state**

Potential state changes include:

- dirty → clean;
- wet → dry;
- injured → recovered;
- work clothes → casual;
- disguised → revealed;
- daytime → nighttime clothing.

### Example discovery mechanic

A player may encounter an apparently ordinary dirty NPC. Helping clean them can reveal a distinctive special color/accessory state, allowing the player to identify the NPC they were seeking without requiring a large quest marker or a separate character model.

This mechanic is representative of the broader design goal: **gameplay should sometimes emerge from observation and interaction rather than explicit UI instructions.**

## 6. NPC simulation tiers

To preserve performance while increasing perceived world life:

### Near player

Full simulation where warranted:
- animation;
- navigation;
- reactions;
- conversation;
- interaction;
- detailed appearance.

### Nearby but not directly important

Reduced simulation:
- lower update frequency;
- simplified behavior;
- reduced animation/AI cost.

### Far away

Statistical simulation:
- schedule/state representation;
- no expensive individual simulation unless required.

The objective is to make a smaller number of meaningful NPCs feel more alive than a large number of fully simulated but shallow NPCs.

## 7. Adventure and discovery system

Coastline should favor authored discoveries over generic icon collection.

Possible discovery ingredients:

- strange lights;
- unusual vehicles;
- abandoned buildings;
- hidden tunnels;
- old piers;
- storm drains;
- rooftops;
- boats;
- radio transmissions;
- unusual NPC behavior;
- objects whose significance becomes clear later.

Not every discovery needs to become a quest. Some discoveries may exist purely to reward curiosity or create memorable moments.

## 8. Cinematic / nostalgia layer

Coastline should support an original movie-adventure feeling through:

- cinematic reveals;
- mysteries;
- environmental storytelling;
- visual jokes;
- nostalgic genre references;
- recurring characters;
- surprising events;
- locations that become meaningful after investigation.

References should be transformed into original Coastline experiences rather than direct recreations.

## 9. Homes and physical progression

Homes should be part of player progression and persistent identity, not merely loading screens.

Possible progression:

**studio apartment → house → larger property → mansion → island estate**

Properties can physically display:

- achievements;
- certificates;
- photographs;
- discoveries;
- collectibles;
- vehicles;
- trophies;
- garden progress;
- future customization and pets.

The already approved Rooftop Studio Apartment remains a candidate early destination once CTM and CI gates are satisfied.

## 10. AI strategy

### Core rule

> **AI may provide variety and intelligence, but deterministic game systems own truth.**

### Deterministic game code owns

- money;
- inventory;
- progression;
- achievements;
- physics;
- collision;
- world transitions;
- save/load state;
- important NPC identity;
- mission completion;
- persistent world state.

### AI may eventually assist with

- constrained NPC conversational variation;
- personality expression;
- ambient dialogue;
- contextual dialogue;
- content ideation and development tooling;
- selecting authored encounters;
- future constrained director behavior.

Runtime cloud AI should not be a requirement for ordinary gameplay unless a later design explicitly proves that benefit outweighs reliability, latency, cost, privacy, and testing concerns.

## 11. Potential AI Director

A future constrained AI-assisted director may select from an approved library of deterministic authored events based on context such as:

- player location;
- time;
- weather;
- previous discoveries;
- recent activity;
- progression;
- NPC availability.

The director should choose among approved content rather than inventing or rewriting core game rules during play.

Example concept:

> Player has explored the marina for a while, it is sunset, and no recent event has occurred. The director selects an authored marina incident. The deterministic event system runs it.

This is a future exploration, not current implementation scope.

## 12. AI-assisted development pipeline

AI can provide leverage during development without becoming the game itself.

Potential uses:

- generate NPC archetype candidates from approved assets;
- generate family-friendly encounter ideas;
- generate dialogue variations subject to authored facts/personality constraints;
- identify combinations of existing assets that can produce more perceived variety;
- assist with structured world/event data preparation;
- assist with documentation and handoff recovery.

Human/project-owner review remains the acceptance gate for shipped content.

## 13. Quality and performance strategy

Coastline must not solve performance problems by applying a blanket visual downgrade.

Quality should be budgeted by distance, context, and asset importance.

Example tiers:

- very close: maximum visual quality;
- nearby: optimized quality;
- far: inexpensive representation;
- very far: simulation/state only.

The strategy should apply independently to:

- buildings;
- NPCs;
- vehicles;
- vegetation;
- shadows;
- animation;
- effects;
- textures;
- lighting.

Performance budgets should eventually become explicit per-world acceptance criteria, including frame time, memory, draw calls, texture memory, animation cost, and shadow cost where measurement is available.

## 14. World architecture and CTM relationship

CTM remains the architectural backbone for segmented worlds. It should own transition lifecycle concerns such as loading/unloading, player state handoff, spawn positioning, camera handoff, masking/fades, asset ownership, cleanup, failure recovery, and bounded transition telemetry.

CTM should not own gameplay logic.

World 2 should be the first major demonstration of this architecture, likely using an island reached by bridge/tunnel and eventually connecting to a mansion and interior World 3.

## 15. Explicit guardrails / deferrals

Do not pursue the following merely for feature volume:

- runtime AI owning game truth;
- endless procedural content;
- multiplayer;
- combat;
- massive quest trees;
- citywide fully simulated traffic;
- hundreds of unique NPC models;
- huge inventories;
- multiplayer housing;
- massive procedural world generation.

These may be reconsidered only if later evidence shows they materially improve Coastline's core identity.

## 16. Priority stack

### P0 — World 1 stability

- CI reliability;
- loading and runtime reliability;
- steering/input correctness;
- performance diagnosis;
- graphics fidelity;
- repeatable beta/release gate.

### P1 — CTM

- lifecycle verification;
- guarded integration;
- state handoff;
- loading/unloading;
- failure recovery;
- transition acceptance tests.

### P2 — Character foundation

- GLB player character;
- GLB NPC prototype;
- animation controller;
- NPC simulation tiers;
- visual-state/color system prototype;
- Android performance benchmark.

### P3 — Coastline visual language

- NPC colors and semantic states;
- symbols and accessibility redundancy;
- interaction cues;
- discovery cues;
- UI/audio reinforcement.

### P4 — World 2

- island;
- bridge/tunnel;
- mansion grounds;
- garage/front-door transition;
- CTM-driven world activation.

### P5 — Adventure/discovery

- environmental mysteries;
- authored encounters;
- cinematic moments;
- recurring characters;
- observation-driven gameplay.

### P6 — Living world

- NPC schedules;
- personalities;
- ambient conversations;
- relationships;
- layered memory.

### P7 — Homes/property progression

- apartment;
- house/property progression;
- achievement/gallery systems;
- persistent home state.

### P8 — Broader world systems

- weather;
- time of day;
- economy;
- vehicle progression;
- expanded persistence.

### P9 — AI augmentation

- constrained dialogue variation;
- content-development tools;
- encounter selection;
- possible constrained AI director.

These priorities are not a mandate to implement every item sequentially; they are a strategic dependency order. Stability and architecture must protect future content quality.

## 17. Implementation discipline

For architectural work, each major system must proceed through:

1. strategic/design discussion;
2. written specification;
3. self-review and owner review;
4. written implementation plan;
5. execution method selection;
6. implementation;
7. verification with exact commit/SHA and test evidence;
8. durable handoff documentation.

No feature should be declared complete based solely on intention or a passing subset of tests.

## 18. Durable handoff requirements

Important decisions, rejected approaches, failed experiments, test failures, performance findings, architectural constraints, and newly approved strategic ideas should be recorded in repository handoff documentation before a conversation ends when practical.

This is particularly important because Coastline is being developed across multiple conversations and the project owner wants seamless recovery when a chat reaches its usage limit.

## 19. Immediate execution boundary

This strategic direction does **not** authorize implementation of all listed future systems.

The immediate technical priority remains:

**World 1 stability → current CI/shard diagnosis → CTM verification → controlled character foundation → future World 2.**

New systems should not be allowed to destabilize the current playable beta.
