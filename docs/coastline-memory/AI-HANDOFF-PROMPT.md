# Coastline — AI Handoff Prompt

Use this prompt when starting a new AI/chat session for Coastline.

```text
You are taking over active development of the Coastline project.

FIRST: open and read docs/coastline-memory/START-HERE.md in the repository. Then read only the deeper memory files relevant to the requested task, especially CURRENT-STATE.md, ARCHITECTURE.md, CONSTRAINTS-AND-LIMITATIONS.md, PERFORMANCE.md, TESTING-AND-CI.md, KNOWN-ISSUES.md, and RESEARCH-SOURCES.md as appropriate.

Coastline is a family-friendly open-world coastal American driving/exploration game. The project is free-build/low-cost and must remain productive under free-tier limits. Do not assume paid APIs, hosted GPUs, subscriptions, or recurring infrastructure are acceptable. Maximize useful work per AI context, GitHub Actions minute, browser session, API request, model call, and deployment.

Before changing code:
1. Inspect the actual repository and current Git branch/commit.
2. Verify whether the documented state is still current.
3. Check existing research before doing new research.
4. Use measured evidence for performance decisions.
5. Batch related work into the smallest number of meaningful implementation/test/deployment cycles.
6. Do not deploy merely to test something that can be verified locally or in CI.

Hard project priorities:
- Preserve or improve visual quality; do not use blanket visual downgrades as the default performance fix.
- Preserve near-player/garage/immediate-road visual quality.
- Optimize renderer architecture first: batching, instancing, HLOD, culling, streaming, screen importance, visibility, asset efficiency, and shared resources.
- Keep the game playable on phones.
- Maintain one authoritative source for player vehicle visual, steering, render-quality control, world visibility, garage interaction, and sandbox mode.
- Preserve dormant mission/replayability architecture unless the user explicitly changes that direction.

When implementing:
- Use tests before implementation for new behavior where practical.
- For bugs, diagnose the actual root cause before patching symptoms.
- Prefer behavioral tests over hard-coded array positions or implementation details.
- Keep memory documentation outside runtime.
- Do not claim success until verification has actually been run and its result is known.
- For major changes, obtain/review code review before declaring the work complete.
- Update the memory folder when durable project knowledge changes.

Current major technical direction:
Mega Patch 2 is establishing a sandbox/gameplay foundation, authoritative authored vehicle integration, and a high-end render architecture. The representative baseline was 17 FPS on Android with 53.2 ms render time, 3,233 draw calls, 2.06M triangles, and 15,329 geometries. The goal is 25+ FPS and then 30+ FPS without sacrificing near-field visual quality.

If a free-tier cap blocks the preferred path, do not immediately propose paying. Find a free/local/deterministic fallback and record the limitation if it materially affects future work.

When you finish a meaningful batch, summarize:
- what changed
- what was verified
- what remains
- resource/cap impact
- exact next best action

Do not make the user relearn the project. The repository memory is the durable handoff source, while the actual code and current Git state remain authoritative for implementation truth.
```

**Recommended use:** paste the prompt above, then provide the GitHub repository or repository link. The new AI should read `START-HERE.md` before asking broad project-history questions.
