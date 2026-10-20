# Coastline — Research Sources

This is the durable source index. It records useful websites already used for Coastline research plus the role each source played. It is intentionally curated rather than a browsing-history dump.

## Previously used / high-value technical sources

### Three.js — BatchedMesh documentation
URL: https://threejs.org/docs/pages/BatchedMesh.html
Category: Rendering / batching
Used for: Understanding `BatchedMesh` and draw-call reduction for many different geometries sharing compatible materials.
Coastline relevance: High. Candidate for static environment batching after the render-object census.
Cost: Public documentation; no paid service required.

### Three.js — WebGPU examples
URL: https://threejs.org/examples/?q=webgpu#webgpu_instance
Category: Rendering / WebGPU / instancing
Used for: Reviewing modern GPU-oriented rendering and instancing patterns.
Coastline relevance: Medium/high as future research; not a reason to rewrite the current renderer without measured benefit.
Cost: Public/open-source ecosystem.

### Unreal Engine — World Partition
URL: https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partition-in-unreal-engine
Category: World streaming
Used for: Research into cell-based world streaming and loading/unloading around streaming sources.
Coastline relevance: High. Supports the cell-based visibility/streaming direction.
Cost: Public documentation; Unreal itself is not a required Coastline dependency.

### Unreal Engine — Hierarchical Level of Detail
URL: https://dev.epicgames.com/documentation/en-us/unreal-engine/hierarchical-level-of-detail-in-unreal-engine
Category: HLOD / world rendering
Used for: Understanding detailed -> merged/proxy -> distant world representations.
Coastline relevance: High. Direct architectural inspiration for Coastline HLOD.
Cost: Public documentation; concept can be implemented with current project tools.

### Unreal Engine — Level Streaming
URL: https://dev.epicgames.com/documentation/en-us/unreal-engine/level-streaming-in-unreal-engine
Category: World transitions / asynchronous loading
Used for: Official explanation of loading and unloading levels asynchronously and changing visibility to create large worlds that feel continuous.
Coastline relevance: High. Informs a hybrid transition model: pre-load the destination, show it only when ready, then retire the old world.
Cost: Public documentation; Unreal is a reference, not a required dependency.

### Three.js — Cleanup guide
URL: https://threejs.org/manual/pages/cleanup.html
Category: Resource lifecycle / world unloading
Used for: Tracking and disposing objects, geometries, materials and textures when no longer needed.
Coastline relevance: Critical. Three.js GPU resources are not automatically released merely because a scene is removed; the framework must own resource lifetimes and avoid disposing shared assets still in use.
Cost: Public documentation; no paid service required.

### Three.js — How to dispose of objects
URL: https://threejs.org/manual/pages/how-to-dispose-of-objects.html
Category: GPU memory / resource lifecycle
Used for: Identifying explicit disposal needs for geometries, materials, textures, render targets and skeletons.
Coastline relevance: Critical for repeated world transitions on mobile, preventing GPU memory accumulation and stale resource references.
Cost: Public documentation; no paid service required.

### Three.js — GLTFLoader
URL: https://threejs.org/docs/pages/GLTFLoader.html
Category: Asset loading / glTF
Used for: Asynchronous glTF asset loading, load progress and error handling.
Coastline relevance: High. Useful for loading a destination world and its required assets before activating the transition.
Cost: Public documentation; no paid service required.

## Project/service references

### GitHub
URL: https://github.com/
Category: Source control / CI
Used for: Coastline repository, branches, pull requests, tests, project memory, and GitHub Actions.
Cost: Existing free-tier workflow; verify current limits before relying on a specific quota.

### Vercel
URL: https://vercel.com/
Category: Deployment
Used for: Coastline browser beta deployments.
Cost: Existing service; do not assume current free-tier limits are permanent. Verify provider documentation before making quota-sensitive decisions.

### Cloudflare
URL: https://www.cloudflare.com/
Category: Infrastructure / networking / optional future services
Used for: Evaluating free-first infrastructure options when appropriate.
Cost: Existing/free options vary by product; verify before adoption.

### itch.io
URL: https://itch.io/
Category: Distribution
Used for: Coastline game distribution/testing.
Cost: Existing distribution target; verify current policies before adding paid services.

## Research policy
1. Check this file before repeating research.
2. Prefer official/primary sources for technical facts.
3. Add a source only when it materially improves Coastline understanding or supports a decision.
4. Record the conclusion, not large copied passages.
5. Record whether a technology is free/free-tier compatible, optional, or likely to create recurring cost.
6. When a source becomes obsolete, mark it rather than silently deleting its historical relevance.
7. New AI agents are encouraged to add useful new research here when existing sources are insufficient.

## Research backlog
Potential future research topics:
- Three.js/WebGPU renderer migration economics and mobile browser support.
- Occlusion culling options compatible with the current renderer.
- GPU-driven rendering approaches that can remain free/local.
- Mobile-friendly shadow and reflection strategies.
- Texture compression and GPU memory strategies for browser delivery.
- HLOD generation approaches that can run locally or in free CI.
- Publicly documented optimization techniques from additional high-end open-world/driving engines.
