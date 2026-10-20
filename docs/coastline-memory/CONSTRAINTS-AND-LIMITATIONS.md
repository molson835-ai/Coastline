# Coastline — Constraints and Limitations

## Hard constraints
- Free-build / low-cost.
- No surprise paid services, recurring infrastructure, hosted GPU, or paid API dependency.
- Phone viability is required.
- Near-field visual quality must be preserved or improved.
- Memory documentation must not be loaded by the game runtime.
- Do not store secrets, credentials, API keys, or private personal information here.

## Resource constraints
The project can be affected by limits on:
- ChatGPT/AI context and usage.
- GitHub Actions minutes and workflow concurrency.
- Vercel deployments/build resources.
- Cloudflare quotas where applicable.
- External API requests.
- Browser automation/session time.
- Mobile device GPU/CPU/memory.
- Model/tool call volume.

Exact provider limits can change. Do not hard-code a quota into the project unless it is verified and dated. Link to the current provider documentation from `RESEARCH-SOURCES.md` when a limit materially affects a decision.

## Operating rules for caps
1. Batch changes.
2. Run cheap/local tests before hosted tests.
3. Use focused CI during development.
4. Reserve broad browser regression for meaningful checkpoints.
5. Deploy only when a beta build provides meaningful validation.
6. Cache/reuse stable research.
7. Do not poll external services unnecessarily.
8. If a cap is reached, use a free/local fallback and document the workaround.

## Technical limitations
Browser/mobile rendering is more sensitive to draw calls, material switches, geometry count, overdraw, shadow passes, post-processing, texture memory, and visibility than the small JavaScript category timings seen in the current baseline. The current telemetry therefore points first toward renderer architecture.

## Cost gate for new technology
Before adding a service or technology, record:
- what problem it solves
- whether existing code can solve it
- free/free-tier status
- likely recurring cost
- lock-in risk
- local fallback
- measurable expected benefit

No paid adoption should occur silently.
