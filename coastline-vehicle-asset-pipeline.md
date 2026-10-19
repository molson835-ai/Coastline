# Coastline high-resolution vehicle asset pipeline

## Goal
Create original, realistic production vehicle assets without copying proprietary CAD, meshes, textures, logos, or game assets.

## Target representation
- Authored GLB/glTF 2.0 asset.
- LOD0: hero-quality exterior/interior, physically based materials.
- LOD1: gameplay-quality exterior with reduced interior detail.
- LOD2: traffic-quality simplified mesh.
- LOD3: distant silhouette/instanced proxy.
- Separate material channels: base color, normal, roughness, metalness, AO and emissive where useful.
- Automotive paint uses clearcoat and environment reflections.
- Glass remains physically separate from opaque body panels.
- Wheels, lights and trim use reusable material families.

## Compression
- Meshopt or Draco for geometry delivery.
- KTX2/Basis for GPU-friendly textures.
- sRGB only for color textures; linear/no-color-space handling for data maps.

## 2008-era muscle coupe study
Use public dimensional/design references only. Treat the current procedural vehicle as a study, not an exact manufacturer CAD clone. Dimensions currently target approximately 187.6 in length, 73.9–74 in width, 107.1 in wheelbase and roughly 55 in height.

## Runtime policy
- Hero vehicle alone receives LOD0.
- Nearby traffic uses LOD1/LOD2.
- Distant traffic uses LOD3/instancing.
- Asset loading is asynchronous and cell-aware.
- Never block first frame on high-resolution vehicle downloads.
- Keep a procedural fallback if an asset fails to load.
