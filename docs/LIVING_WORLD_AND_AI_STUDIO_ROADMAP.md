# Coastline Living World and Autonomous Studio Roadmap

## Vision

Coastline should feel like a place that continues to have a life beyond the player's steering wheel: residents go somewhere for a reason, wildlife responds to its habitat and danger, traffic navigates a connected road network, and stories grow from places and events. The game remains browser-first, lightweight, and playable without accounts or paid runtime services.

This roadmap is an engineering guide, not a claim that every system below already exists. Existing features and in-flight pull requests must be inspected before work begins.

## A. The autonomous development studio

The repository's `.github/AI_DEV_PROMPT.md` defines seven coordinated review roles: creative direction, gameplay/simulation, narrative, research, QA, performance, and release engineering.

A real scheduled AI coding loop requires a model credential or an explicitly available no-cost model backend. The current `.github/workflows/ai-continuous-dev.yml` is intentionally manual-only and expects `OPENAI_API_KEY`. Do not enable scheduled model runs or silently incur API charges without an owner-approved no-cost backend. The free baseline can still run browser regression tests, collect diagnostics, and report failures through GitHub Actions.

The developer agent must not push directly to `main`, merge PRs, deploy unreviewed code, or claim work/test results it did not perform.

## B. Living-world simulation layers

### 1. Authoritative world clock
- A single simulation clock drives time-of-day, resident schedules, wildlife activity, traffic density, weather changes and event cooldowns.
- Use a capped simulation delta after tab suspension; never try to simulate every missed frame.
- Seed initial world state so a reported scenario can be reproduced.

### 2. Agent decision layer
Each resident, traffic vehicle and wildlife agent should have a small state record:
- stable ID and type/species;
- current goal and state;
- position/heading and current destination;
- perception range and recent relevant observations;
- cooldowns and stuck/recovery timer;
- optional compact memory/event references.

Use utility scoring or bounded state machines/behavior trees for goal selection, then execute movement through existing movement/collision systems. Decision logic should be staggered across frames rather than evaluated for every entity every render frame.

### 3. Residents with purpose
- Routine templates: work, commute, shop, socialize, exercise, relax, go home and sleep.
- Destination selection should use real reachable locations and sidewalks/road crossings where implemented.
- Personalities influence preferences and dialogue tone, not physics or world authority.
- Encounters create a small event record: who, where, what happened and when.
- Named residents can recur in missions, rumors and local events; avoid repetitive dialogue through cooldowns and event history.

### 4. Wildlife with ecological rules
- Species profiles define habitat, preferred activity, speed, perception, fear response and daily activity window.
- Herbivores forage and flee; predators investigate/hunt only within bounded rules; birds flock and disperse.
- Roadside crossings are uncommon, visible, and reactive to vehicle approach. Animals should not teleport through vehicles or solid obstacles.
- Nearby wildlife receives detailed movement; distant populations use cheap coarse updates. Avoid adding large numbers of individual meshes without instancing or distance culling.

### 5. Traffic and intersections
- Represent roads and intersections as a navigable graph or explicit lane/route data rather than unrelated axis checks.
- Traffic follows route waypoints, yields/brakes at conflicts, respects signal phases, recovers from blocked paths and despawns safely outside active regions.
- Test steering direction, reversing, collision response, junction turns, stuck recovery and player avoidance.

### 6. Emergent story director
- The director selects from authored event templates using world state, location, time, weather, player progress and cooldowns.
- Examples: a harbor festival, wildlife crossing warning, roadwork detour, a resident's delivery request, a storm changing a scenic route, or a garage discount tied to a local event.
- Events must have clear player-facing feedback, consequences/rewards, and a fallback if a referenced NPC or destination is unavailable.
- Keep main driving uninterrupted; offer optional objectives and let the player ignore them.

### 7. World continuity and saves
- Persist player progression, discovered landmarks, mission outcomes, selected vehicle and a bounded set of world-event/NPC memory records using local browser storage where appropriate.
- Version the save schema and tolerate corrupt/old saves by recovering safely.
- On return, apply bounded elapsed-time updates for schedules, weather and event summaries. Do not claim server-like persistence when the tab is closed.

## C. Testing and observability

Every major system should expose a small deterministic test API or pure functions where appropriate. Add Playwright tests for:
- boot with no uncaught errors;
- all primary controls and reset/recovery;
- NPC state transitions and stuck recovery;
- wildlife threat response and safe road crossings;
- traffic intersection turning and collision avoidance;
- time/weather transitions and event cooldowns;
- save/load and old-save recovery;
- mobile viewport resize and performance guardrails.

Automated tests are not a replacement for a real visual playtest. Capture errors, failed requests, FPS/frame-time, entity counts and recent gameplay events when diagnosing issues. Avoid recording personal data.

## D. Implementation order

1. Protect the working build and make the current feature branch/PR order clear.
2. Establish deterministic simulation primitives: clock, seeded randomness, bounded decision scheduler, event log and recovery helpers.
3. Expand the existing traffic/intersection system and test turns, signals and obstacle recovery.
4. Upgrade residents from short behavior loops into schedules, reachable destinations and compact encounter memories.
5. Expand wildlife with species profiles, habitat/time preferences, flight response and road-crossing safety.
6. Add the story director, recurring characters, event cooldowns and location-aware mission chains.
7. Add versioned local persistence and bounded offline catch-up.
8. Profile and optimize the active world, then add further map regions and streaming.

Work in small reviewable PRs. Do not attempt to ship all layers in one change.

## E. Research inspiration

Useful concepts to evaluate (not copy wholesale):
- Utility AI and behavior-tree/state-machine hybrids for low-cost, inspectable decisions.
- Hierarchical simulation: detailed agents near the player, coarse population/ecology updates at a distance.
- Deterministic simulation plus model-assisted high-level intent, with a deterministic fallback.
- Event sourcing for compact world history and explainable emergent stories.

Research links and source-specific implementation decisions belong in the relevant PR, so the guidance stays current and verifiable.
