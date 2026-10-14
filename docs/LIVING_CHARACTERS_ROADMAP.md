# Coastline Living Characters & Next-Generation World Systems

## North star

Coastline should feel like a place that continues to have a life when the player is not looking. NPCs should have agency, but the world must remain legible, fair, testable, and fast. We should create the *experience* of a deeply simulated world without requiring every person to run an expensive language model.

This is a design and engineering program, not a claim that every system below is already implemented. The prototype currently adds deterministic NPC roles, bounded needs and episodic memory, event reactions, story-arc stage definitions, serialized snapshots, and a per-step actor budget. Rendering, route navigation, full dialogue, and in-world job animations still need integration.

## Research principles

- **Generative Agents (Park et al., UIST 2023):** believable agents combine observations, memory, reflection, and planning. Coastline borrows the architecture lesson—not the requirement to run an LLM continuously. Paper: https://doi.org/10.1145/3586183.3606763
- **Free-Range AI: Creating Compelling Characters for Open World Games (GDC):** open worlds need ambient AI and systemic gameplay that still support authored narrative and scale. https://gdcvault.com/play/1020573/Free-Range-AI-Creating-Compelling
- **Utility AI / behavior architecture:** use simple state machines for simple jobs, utility-style priority scoring for competing needs, and multi-step plans only where they add visible value. Keep decisions inspectable and reproducible.
- **Event-driven simulation:** react to meaningful world events rather than polling every NPC every render frame. Use behavioral LOD and deterministic simulation steps.

## Prototype implementation

- `npc-agency-engine.js` defines public-works, paramedic, sanitation, mechanic, resident, and suspicious-driver roles with schedules and goals.
- NPCs have needs, traits, relationships, bounded episodic memories, current action, flags, and optional personal story arcs.
- Published events can alter NPC behavior and advance story stages; examples include outages, emergencies, breakdowns, debts, player help, and suspicious night sightings.
- `step()` has a configurable actor cap. Snapshots are serializable and restore agent state.
- The system is deterministic from seed and context, with no required runtime model/API key.
- Tests exercise role schedules, event response, relationship changes, story advancement, memory caps, and bounded actor processing.

## Design rules

1. **World truth before dialogue.** A character's actions, job, location, and memory must be consistent before a generated line is allowed to describe them.
2. **No omniscience.** Characters react only to events they witness, hear about, or can reasonably infer.
3. **Consequences propagate through systems.** A broken signal can delay traffic; traffic can contribute to a crash; the crash can dispatch a paramedic; the mechanic may later see a damaged vehicle.
4. **Quiet is a feature.** Do not generate drama constantly. Normal work and ordinary routines make exceptional events matter.
5. **Stories are interruptible.** The player may help, ignore, misunderstand, or revisit a thread later. Avoid mandatory quest chains.
6. **Consequences are reversible when appropriate.** Repairs, rest, apologies, and changed routines can reduce danger; do not trap the world in a permanent failure spiral.
7. **Save facts, not every simulation tick.** Persist meaningful memories, relationships, flags, and arc stages; recompute ordinary schedules.
8. **Deterministic by default.** Every bug report should be reproducible with a seed and event history.
9. **Behavioral LOD.** Nearby important characters get detailed decisions; distant agents advance in coarse time steps; background populations can be summarized.
10. **Never make the player wait for AI.** No network calls or language-model inference in the render loop. Optional generative dialogue can be asynchronous and must have a deterministic authored fallback.

## High-potential differentiators

### 1. Causal civic simulation

City workers, sanitation crews, utility staff, mechanics, emergency responders, traffic, and residents share world state. Work completed changes actual systems: repaired signals improve traffic flow; a cleaned road clears a hazard; a power outage changes lighting; emergency response time affects recovery. This turns routine jobs into visible world transformation.

### 2. Character-driven quest emergence

Quest opportunities arise from needs, relationships, secrets, mistakes, and conflicting goals—not only from icons above heads. A mechanic's overdue bill, a paramedic's exhaustion, or a worker's delayed repair can create a situation the player discovers naturally. Authored arc stages ensure the story remains coherent even as triggers emerge.

### 3. A world that remembers places

Track durable, localized changes: tire marks after a chase, a repaired guardrail, a memorial after a serious incident, a shortcut worn into grass, a storefront that changes hands. Place memory makes return visits emotionally and spatially meaningful. Use a strict cap and chunk-based persistence.

### 4. Rumor propagation with imperfect knowledge

NPCs pass on only what they saw or heard. Rumors can be incomplete, delayed, biased, or wrong. The player can compare accounts, check evidence, and change what the community believes. Keep provenance attached to each rumor so the system can explain why an NPC believes it.

### 5. Ecosystem and human schedules that influence each other

Wildlife activity, weather, traffic, waste, noise, and construction interact. A blocked culvert may flood a trail; wildlife moves away from noise; a sanitation delay attracts animals; residents report a hazard. Start with a few causal links and make them observable rather than simulating everything.

### 6. Adaptive world pressure, not rubber-banding

The world responds to demonstrated player behavior without secretly cheating. Repeated reckless driving increases witness reports and repair costs; careful driving can earn trust; helping emergency services may unlock access or local knowledge. Make every reaction traceable to a witnessed action or established rule.

### 7. Optional generative dialogue, grounded by simulation

If we later add a hosted or local language model, it should only verbalize a structured state: identity, witnessed facts, current goals, relationship, and permitted knowledge. It cannot invent inventory, change mission state, or override simulation rules. Cache and validate responses; always provide an authored fallback. Keep the base game playable without any model service.

## Phased delivery

- **Phase A — Current prototype:** data model, deterministic schedules, event hooks, bounded memory, story arcs, tests.
- **Phase B — One visible vertical slice:** one public-works NPC, one mechanic, one paramedic; real locations and basic movement/animations; outage → repair delay → traffic consequence → response.
- **Phase C — Player interaction:** talk/help/ignore/return, relationship deltas, arc-state UI, durable save data.
- **Phase D — City simulation:** sanitation routes, work vehicles, local traffic effects, weather and wildlife links.
- **Phase E — Community memory:** rumor graph, place scars, persistent repairs, consequences across sessions.
- **Phase F — Optional dialogue intelligence:** only after deterministic behaviors, memory privacy, latency, cost, and fallback behavior are tested.

## Launch criteria for this system

- Unit tests pass and deterministic replay matches for a fixed seed.
- The NPC actor budget is respected under load.
- NPCs do not teleport or perform impossible movement; the engine owns pathfinding and collision.
- Event consequences are visible and explainable.
- Memory and save payloads remain bounded and versioned.
- A browser smoke test confirms no errors or frame-loop regressions.
- No external AI service is required for the shipped baseline.
