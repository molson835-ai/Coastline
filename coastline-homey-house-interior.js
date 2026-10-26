/** A compact, self-contained house interior streamed through Coastline's CTM. */
export function buildHomeyHouseInterior(THREE, { centerX = 483, centerZ = 500, floorY = 7.49 } = {}) {
  const root = new THREE.Group();
  root.name = 'coastline-homey-house-interior';
  const colliders = [];
  const mat = (color, roughness = .82, metalness = .02) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const wall = mat(0xe3ded1), floor = mat(0x786b5a, .95), trim = mat(0x4a382d), wood = mat(0x91694a), fabric = mat(0x557c83), dark = mat(0x202a2d), glass = new THREE.MeshStandardMaterial({ color: 0x6aa8b6, roughness: .2, metalness: .08, transparent: true, opacity: .78 });
  const addBox = (name, x, y, z, w, h, d, material, collider = false) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.name = name; mesh.position.set(x, y, z); mesh.castShadow = h > .3; mesh.receiveShadow = true; root.add(mesh);
    if (collider) colliders.push({ name, x, z, w, d });
    return mesh;
  };
  addBox('house-interior-floor', centerX, floorY - .08, centerZ, 18, .16, 26, floor);
  addBox('house-left-wall', centerX - 9, floorY + 2.65, centerZ, .3, 5.3, 26, wall, true);
  addBox('house-right-wall', centerX + 9, floorY + 2.65, centerZ, .3, 5.3, 26, wall, true);
  addBox('house-back-wall', centerX, floorY + 2.65, centerZ - 13, 18, 5.3, .3, wall, true);
  // The garage entry is a real open doorway at the +Z end, wide enough for the on-foot avatar.
  addBox('house-entry-wall-left', centerX - 5.45, floorY + 2.65, centerZ + 13, 7.1, 5.3, .3, wall, true);
  addBox('house-entry-wall-right', centerX + 5.45, floorY + 2.65, centerZ + 13, 7.1, 5.3, .3, wall, true);
  addBox('house-entry-lintel', centerX, floorY + 4.75, centerZ + 13, 3.8, 1.1, .3, wall);
  addBox('house-entry-jamb-left', centerX - 1.9, floorY + 2.1, centerZ + 12.82, .15, 4.2, .18, wood);
  addBox('house-entry-jamb-right', centerX + 1.9, floorY + 2.1, centerZ + 12.82, .15, 4.2, .18, wood);
  const openDoor = addBox('house-entry-open-door', centerX + 1.72, floorY + 2.05, centerZ + 13, 3.2, 4.05, .12, wood);
  openDoor.rotation.y = Math.PI / 2;
  addBox('house-entry-handle', centerX + 1.75, floorY + 2, centerZ + 14.25, .07, .28, .07, dark);
  addBox('house-ceiling', centerX, floorY + 5.35, centerZ, 18, .2, 26, mat(0xbab6aa));
  addBox('house-ceiling-light', centerX, floorY + 5.18, centerZ - 1, 3.4, .08, 1.2, new THREE.MeshStandardMaterial({ color: 0xfff1ce, emissive: 0xffd98a, emissiveIntensity: .55, roughness: .35 }));
  // Living area: rug, sofa, coffee table, television and low media cabinet.
  addBox('house-living-room-rug', centerX - 3.6, floorY + .025, centerZ - 1.5, 7.4, .05, 7.8, mat(0x607c7a, .99));
  addBox('house-sofa-base', centerX - 4.7, floorY + .55, centerZ - 3.8, 3.4, .62, 1.45, fabric);
  addBox('house-sofa-back', centerX - 4.7, floorY + 1.25, centerZ - 4.35, 3.4, .9, .32, fabric);
  for (const side of [-1, 1]) addBox('house-sofa-arm-' + side, centerX - 4.7 + side * 1.58, floorY + .95, centerZ - 3.8, .3, .8, 1.5, fabric);
  addBox('house-coffee-table-top', centerX - 1.6, floorY + .62, centerZ - 1.4, 2.8, .16, 1.5, wood);
  for (const x of [-2.65, -.55]) for (const z of [-1.9, -.9]) addBox('house-coffee-table-leg', centerX + x, floorY + .3, centerZ + z, .1, .6, .1, trim);
  addBox('house-tv-console', centerX + 5.8, floorY + .45, centerZ - 2.2, 4.6, .75, 1.0, wood);
  addBox('house-tv-screen', centerX + 5.8, floorY + 1.75, centerZ - 2.75, 4.0, 2.1, .14, dark);
  addBox('house-tv-display', centerX + 5.8, floorY + 1.75, centerZ - 2.66, 3.72, 1.82, .035, mat(0x254b5a, .22, .2));
  // Dining table and chairs.
  addBox('house-dining-table', centerX + 3.8, floorY + .92, centerZ + 5.1, 4.1, .16, 2.2, wood);
  for (const x of [2.2, 5.4]) for (const z of [4.25, 5.95]) {
    addBox('house-dining-chair-seat', centerX + x, floorY + .52, centerZ + z, .85, .15, .85, fabric);
    addBox('house-dining-chair-back', centerX + x, floorY + 1.05, centerZ + z + .34, .85, .95, .14, wood);
  }
  // Kitchen counter and cabinet run on the back-left side.
  addBox('house-kitchen-counter', centerX - 4.8, floorY + 1.35, centerZ + 9.2, 6.2, .18, 1.5, mat(0xc5c5bd, .45));
  addBox('house-kitchen-cabinet', centerX - 4.8, floorY + .72, centerZ + 9.2, 6.0, 1.2, 1.35, mat(0x65766f, .6));
  addBox('house-kitchen-backsplash', centerX - 4.8, floorY + 2.15, centerZ + 10, 6.0, 1.1, .08, glass);
  addBox('house-kitchen-fridge', centerX - 7.1, floorY + 2.0, centerZ + 6.8, 1.35, 4.0, 1.3, mat(0xbec7c8, .32, .22));
  // Warm timber trim and windows give the room a finished, lived-in feel.
  for (const z of [-7, 1, 8]) {
    addBox('house-window-frame', centerX - 8.78, floorY + 3.1, centerZ + z, .08, 1.7, 2.7, trim);
    addBox('house-window-glass', centerX - 8.72, floorY + 3.1, centerZ + z, .06, 1.48, 2.45, glass);
  }
  const plantPot = mat(0x9b6544), leaves = mat(0x38704b, .95);
  for (const [i, x, z] of [[0, -7.3, -10.5], [1, 7.2, 9.5]]) {
    addBox('house-plant-pot-' + i, centerX + x, floorY + .35, centerZ + z, .55, .7, .55, plantPot);
    const plant = new THREE.Mesh(new THREE.SphereGeometry(.62, 8, 6), leaves);
    plant.name = 'house-plant-leaves-' + i; plant.position.set(centerX + x, floorY + 1.25, centerZ + z); plant.scale.set(.85, 1.2, .85); root.add(plant);
  }
  root.userData.coastlineColliders = colliders;
  root.userData.coastlineHouseContract = { id: 'home-interior', threshold: { x: centerX, z: centerZ + 13, halfWidth: 1.8 }, returnToGarage: { x: centerX, z: centerZ + 10.5 } };
  return root;
}
