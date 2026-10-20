# Coastline — Research

## Transferable principles
### Three.js / browser rendering
- Instancing and batching can reduce draw-call overhead when many objects share compatible resources.
- BatchedMesh is useful when different geometries can share a material while being submitted efficiently.
- WebGPU is a possible future direction, but migration should be justified by measurable benefit and browser compatibility; it is not a reason to rewrite the renderer prematurely.

### High-end open-world architecture
Repeated principles found in public technical material include:
- hierarchical world representation
- cell-based streaming
- HLOD for distant static content
- instancing/batching
- visibility/occlusion management
- LOD based on distance and importance
- shared resources
- separating collision/interaction representation from render representation

### Coastline application
Use these principles to reduce renderer work while preserving near-field quality. Do not copy proprietary game code; adapt public architectural concepts to Three.js/browser/mobile constraints.

## Cost/free-tier notes
Three.js documentation and Unreal documentation are public references. Using the concepts does not require paid infrastructure. WebGPU adoption, hosted rendering, commercial asset services, and cloud GPU services should be treated separately and cost-gated.

See `RESEARCH-SOURCES.md` for direct links and source metadata.
