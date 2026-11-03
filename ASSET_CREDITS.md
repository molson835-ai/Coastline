# Asset credits

## RGSDev — Free Low Poly Vehicles Pack

- **Creator:** Raphael Gonçalves (Rgsdev)
- **Source:** Included `License.txt` in `assets/Free Low Poly Vehicles Pack by Rgsdev.zip`
- **License:** [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)
- **Use in Coastline Drive:** Replacement road-vehicle fleet and the public-works van. Models are loaded from the included FBX files, scaled and positioned for Coastline's vehicle roots, and may be adjusted for integration and performance.
- **Attribution:** The included license says credit is not required; this courtesy credit is retained for provenance.

## Grab3D — Cozy Character

- **Creator/source:** [Grab3D Character Mixer](https://grab3d.com/tools/character-mixer/)
- **Asset:** `assets/grab3d-cozy-character.glb`
- **License:** CC0 1.0 (public domain; attribution not required), as documented by Grab3D.
- **Use in Coastline Drive:** Player and pedestrian character replacement, including the public-works character. The skinned GLB includes `idle`, `walk`, `run`, `wave`, and `jump` clips. Coastline selects the available clips for movement and state.

## Retired Range Rover vehicle model (repository archive only)

- **Creator:** IvOfficial
- **Source:** https://poly.pizza/m/8zk4o6nALW
- **License:** [Creative Commons Attribution 3.0 (CC BY 3.0)](https://creativecommons.org/licenses/by/3.0/)
- **Status:** Kept in the repository as a legacy/rollback asset only; it is no longer included in the itch package or used by the active fleet replacement path.
- **Attribution note:** This entry is retained because the source asset remains in repository history and the assets directory. It must be credited if the legacy model is reintroduced in a release.

## Visthétique — Modern Apartment (candidate Homey House interior)

- **Creator:** Visthétique
- **Source:** https://sketchfab.com/3d-models/modern-apartment-1fbb649cd6624f2bb7b7d6e30c6533a5
- **License:** [Creative Commons Attribution 4.0 (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)
- **Status:** Candidate replacement for the procedural Homey house interior. The optimized mobile GLB has been prepared and structurally validated outside the repository; it is not yet wired into the runtime or included in the repository.
- **Optimization report:** Original 209,556,540 bytes; optimized candidate 47,528,304 bytes (77.3% smaller), with conservative mesh decimation, quantized positions/normals, 16-bit indices where valid, and 512-pixel JPEG textures. The optimized scene retains 241 meshes and 101 materials. Desktop parser/structure validation passed; browser rendering and Android performance remain unverified.
- **Attribution:** Credit Visthétique and link the source/license in any distribution of the optimized asset. This modified version is a derivative of the original CC BY 4.0 model.

## Jungle Jim — 3 Evil Rock Mountains with Cave (Stylized)

- **Creator:** Jungle Jim (@jungle_jim)
- **Source:** https://sketchfab.com/3d-models/3-evil-rock-mountains-with-cave-stylized-c41cba36d5dd48b1a07241c353689709
- **Asset:** `assets/3_evil_rock_mountains_with_cave_stylized.glb`
- **License:** Creative Commons Attribution (CC BY); retain this attribution with the distributed game asset.
- **Use in Coastline Drive:** Replacement Waterfront/Cave Island mountain formation. The runtime centers the formation on the existing cave threshold, points the cave mouth toward the Electric Lemonade side, and keeps movement governed by Coastline's explicit cave collider and CTM contracts rather than visual-mesh collision.

## Literock Studios — Warhorse Lite

- **Source:** [Warhorse Lite — Free Rigged & Animated 3D Horse](https://literock-studios.itch.io/warhorse-lite)
- **Local-only asset path:** `assets/animals/warhorse-lite.glb`, ignored by Git and supplied by the developer from the official creator download.
- **Runtime path:** `assets/animals/warhorse-lite.glb` in a locally generated itch package when the optional local GLB is present. The original ZIP, FBX, preview image, and standalone GLB are not committed to the public repository.
- **Validated rig/clips:** The downloaded GLB includes a skin, `saddle_socket`, and `canter_loop`, `idle_loop`, `rear`, and `walk_loop` clips.
- **License:** Free for commercial and personal games, no royalties. The creator prohibits standalone resale or redistribution of the asset itself. Do not publish the source archive or standalone model in the repository. Verify the creator's current terms before distribution.
- **Use in Coastline Drive:** Rideable mount. Coastline retains its own movement, collision, rider attachment, camera, and world-transition logic. Public CI and builds without the local licensed file use the lightweight procedural fallback.

## Innerscene — Ostrich (CC0)

- **Source:** [Innerscene Ostrich GLB](https://www.innerscene.com/tools/library/3d-parts/ostrich-a92752fd)
- **License:** CC0 public domain, including commercial use and modification.
- **Use in Coastline Drive:** Static GLB geometry used for ambient wildlife and as the visual body of a rideable mount. The supplied model has no skeleton or animation clips; Coastline adds movement state and a lightweight body bob, and does not claim it has the horse's leg animation.
- **Performance:** The model is loaded only when wildlife is initialized. Static meshes are grouped by material where supported to cut draw calls; the large source asset is not included in the service-worker's eager precache. The current branch fetches the original source model when no optimized local copy is present, so a local compressed copy remains the preferred release configuration.
