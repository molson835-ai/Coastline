# Coastline social world systems

Coastline is moving from scripted encounters toward a world whose people have partial information, local relationships, and behavior histories.

## Systems now in the feature branch

### Living character agency
NPCs have a role, schedule, needs, bounded episodic memory, relationships, and optional story arcs. The simulation is deterministic and event-driven; rendering does not trigger language-model calls.

### Social knowledge
`social-rumor-engine.js` separates what happened from what each person knows. A direct observation creates a rumor with evidence and confidence. Sharing requires a social connection and the same local region. A retelling may reduce confidence or distort the claim according to the speaker's accuracy and relationship strength. Work per simulation step is bounded.

### Regional conduct
`player-reputation-engine.js` stores regional behavior history. Collisions and completed local jobs influence standing; unwitnessed events carry less weight and old behavior decays. It is not a global morality score: the player's standing can differ from one neighborhood to another.

### Visible causal example
The public-works NPC slice uses the Main Street signal repair as a concrete event chain. The player approaches, a signal fault becomes visible, Mara repairs it, the event enters the social knowledge model, and the completed story/rumor state persists across reloads.

## Guardrails
- No NPC knows an event simply because it exists in global state.
- Every social spread step has a caller-controlled transfer budget.
- Histories and memories have caps.
- Seeds and serialized snapshots make systems reproducible and testable.
- Rendering, simulation, persistence, and optional future dialogue generation remain separate layers.

## Next vertical slices
1. Let player actions produce witnessed evidence rather than only a reputation score.
2. Add one paramedic dispatch with a route, response delay, and traffic consequence.
3. Give the sanitation route a persistent state that changes street cleanliness.
4. Add NPC-to-NPC relationships and dialogue choices that depend on what each character actually knows.
5. Validate performance with dozens of simulated agents while rendering only nearby high-detail actors.

These are prototypes in the PR branch until tests pass, the PR is merged, and the deployed site is verified.
