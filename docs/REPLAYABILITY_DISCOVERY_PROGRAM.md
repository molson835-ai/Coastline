# Coastline — Replayability & Discovery Program

## Design principle
Make the player curious, then reward their interpretation and choices. Avoid turning the world into a checklist. Coastline uses original content and systems inspired by broad design lessons—not copied missions, dialogue, characters, maps, or assets from other games.

## Research synthesis
- **Curiosity-driven progression:** GDC's *Sparking Curiosity-Driven Exploration Through Narrative in Outer Wilds* frames the design goals as inspiring curiosity, facilitating exploration, and rewarding discovery. https://www.gdcvault.com/play/1027368/Independent-Games-Summit-Sparking-Curiosity
- **Emergent narrative without huge content costs:** GDC's *The Future Is Now — Emergent Narrative Without Ridiculous Tech* argues that replayable stories can come from clever recombination and design rather than waiting for advanced AI. https://www.gdcvault.com/play/1015053/The-Future-Is-Now-Emergent
- **Environmental storytelling:** GDC's *What Happened Here? Environmental Storytelling* describes spaces and environmental reactions as narrative clues the player interprets. https://www.gdcvault.com/play/1012696/What-Happened-Here-Environmental
- **Guided freedom:** GDC's 2026 *Clues and Camping in Ghost of Yōtei* describes a hidden event-deck approach that can deliver authored nudges without forcing a single route. https://schedule.gdconf.com/session/clues-and-camping-in-a-non-linear-open-world/915147
- **Layered content recombination:** Ubisoft's account of the *Mario + Rabbids Sparks of Hope* layered-battle system emphasizes authored modules assembled under rules to create variety while preserving quality. https://news.ubisoft.com/en-gb/article/3NxX4lLLU7pkebcFDaoOen/gdc-2023-how-mario-rabbids-sparks-of-hope-improved-procedural-generation-with-layered-battles

## Implemented foundation in this branch
- `replayability-engine.js`: seeded randomness, memory adapter, sparse contextual encounter director, mystery-stage progression, rumors, and design rules.
- `living-world.js`: exports `createLivingWorldReplayability()` as the single adapter surface for the game shell; keeps gameplay decisions out of the render loop.
- `coastline-sw.js`: cache v3 includes replayability module for repeat-load efficiency.
- `tests/replayability-engine.spec.mjs`: tests deterministic selection, memory snapshots, mystery advancement, rumors, and encounter filtering.
- `package.json`: runs replayability unit tests in the main test pipeline.

## Encounter design rules
1. Quiet stretches are intentional. Don't trigger something every few seconds.
2. Context matters: time, weather, area, speed, discovery history, and cooldown.
3. Suspense needs uncertainty, not constant danger or cheap jump scares.
4. Every mystery clue should be fair in hindsight and point toward another observation or location.
5. Discoveries can reward knowledge, shortcuts, rare encounters, routes, challenges, and relationships—not just currency.
6. Repeatable events recombine a small authored library with seeded variation; one-off signature secrets remain hand-authored.
7. Player memory is serializable through `snapshot()` but persistence is owned by the host game/save layer.
8. Do not mark a secret as discovered merely because an encounter was offered; require a meaningful player action.

## Phased integration
### A — System foundation (current)
Pure deterministic modules, memory interface, event director, clue and rumor templates, automated unit tests, cache integration.

### B — First playable secrets
Wire the adapter to the game shell's player position/time/weather and existing HUD event surface. Add 3 discoverable micro-mysteries in the Douglassville-inspired map, one hidden road, one environmental clue chain, and one late-night encounter. Save discoveries between sessions only after testing the game's save model.

### C — Systemic encounters
Add roadside assistance, suspicious-but-not-always-dangerous vehicles, wildlife crossings, abandoned cars, spontaneous races, and traffic incidents. Give each event cooldowns and fair contextual cues.

### D — Persistent world memory
NPC familiarity, follow-up encounters, rumor history, discovered shortcuts, and consequence flags. Use bounded snapshots and versioned saves.

### E — Replayability pass
Seeded scenario combinations, rarity tuning, anti-repetition rules, first-hour onboarding, and tests that verify quiet intervals and meaningful outcomes.

## Performance constraints
- No per-frame procedural story generation.
- Evaluate event candidates only on a bounded cadence or at world events.
- Cap encounter candidates and memory history.
- Use stable seeds to make bugs reproducible.
- Keep distant world actors on cheap simulation tiers.
- Load and cache modules as static assets.

## Launch gate
This branch is a development integration, not a live release. Before merging: run engine/unit tests and Playwright browser tests, check service-worker install/cache behavior, verify the live site after deployment, and confirm that new modules are actually called by the game shell. Do not call the replayability system fully playable until Phase B is integrated.