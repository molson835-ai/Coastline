/**
 * Homey House Interior
 *
 * One compact but complete American home world. Visual meshes are deliberately
 * separate from simple movement colliders so decorative furniture cannot trap
 * the player on corners.
 */
export function buildHomeyHouseInterior(THREE, { centerX = 483, centerZ = 500, floorY = 7.49 } = {}) {
  const root = new THREE.Group();
  root.name = 'coastline-homey-house-interior';
  const colliders = [];
  const interactions = [];
  const mat = (color, roughness = .82, metalness = .02, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const wall = mat(0xe3ded1), floor = mat(0x786b5a, .95), trim = mat(0x4a382d), wood = mat(0x91694a), fabric = mat(0x557c83), dark = mat(0x202a2d);
  const glass = mat(0x78aeb9, .2, .08, { transparent: true, opacity: .78 });
  const brass = mat(0xc38b3e, .34, .58), white = mat(0xf2eee5, .72), counter = mat(0xc5c5bd, .45), cabinet = mat(0x65766f, .6);
  const plantPot = mat(0x9b6544), leaves = mat(0x38704b, .95), bedFabric = mat(0x6d7890, .94);
  const warmLight = new THREE.MeshStandardMaterial({ color: 0xfff1ce, emissive: 0xffd98a, emissiveIntensity: .55, roughness: .35 });

  const addBox = (name, x, y, z, w, h, d, material, collider = false) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = h > .25;
    mesh.receiveShadow = true;
    root.add(mesh);
    if (collider) colliders.push({ name, x, z, w, d });
    return mesh;
  };
  const addCylinder = (name, x, y, z, radius, height, material, collider = false) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 12), material);
    mesh.name = name; mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
    if (collider) colliders.push({ name, x, z, w: radius * 2, d: radius * 2 });
    return mesh;
  };
  const addInteraction = (id, label, x, z, radius, extra = {}) => {
    interactions.push({ id, label, x, z, radius, ...extra });
  };
  const addWindow = (side, z, width = 2.6) => {
    const x = centerX + (side === 'left' ? -8.78 : 8.78);
    addBox(`house-window-frame-${side}-${z}`, x, floorY + 3.05, centerZ + z, .1, 1.9, width + .3, trim);
    addBox(`house-window-glass-${side}-${z}`, x + (side === 'left' ? .07 : -.07), floorY + 3.05, centerZ + z, .06, 1.62, width, glass);
    addBox(`house-window-sill-${side}-${z}`, x + (side === 'left' ? .16 : -.16), floorY + 2.08, centerZ + z, .38, .08, width + .15, white);
    addBox(`house-window-top-trim-${side}-${z}`, x + (side === 'left' ? .16 : -.16), floorY + 4.02, centerZ + z, .38, .08, width + .15, white);
  };
  const addInteriorDoor = (name, x, z, width = 1.7) => {
    addBox(`${name}-frame-left`, x - width / 2, floorY + 2.1, z, .12, 4.2, .18, trim);
    addBox(`${name}-frame-right`, x + width / 2, floorY + 2.1, z, .12, 4.2, .18, trim);
    addBox(`${name}-header`, x, floorY + 4.2, z, width + .24, .16, .18, trim);
    addBox(`${name}-door`, x + width / 2 - .1, floorY + 2.05, z + .08, width - .12, 4.0, .1, wood);
    addBox(`${name}-handle`, x + width / 2 - .35, floorY + 2.05, z + .16, .08, .28, .08, brass);
  };

  // Envelope: simple perimeter colliders only. Furniture gets its own intentional footprints below.
  addBox('house-interior-floor', centerX, floorY - .08, centerZ, 18, .16, 26, floor);
  addBox('house-left-wall', centerX - 9, floorY + 2.65, centerZ, .3, 5.3, 26, wall, true);
  addBox('house-right-wall', centerX + 9, floorY + 2.65, centerZ, .3, 5.3, 26, wall, true);
  addBox('house-back-wall', centerX, floorY + 2.65, centerZ - 13, 18, 5.3, .3, wall, true);

  // Garage-side entry: wide, visually obvious American doorway.
  addBox('house-entry-wall-left', centerX - 5.45, floorY + 2.65, centerZ + 13, 7.1, 5.3, .3, wall, true);
  addBox('house-entry-wall-right', centerX + 5.45, floorY + 2.65, centerZ + 13, 7.1, 5.3, .3, wall, true);
  addBox('house-entry-lintel', centerX, floorY + 4.75, centerZ + 13, 3.8, 1.1, .3, wall);
  addBox('house-entry-jamb-left', centerX - 1.9, floorY + 2.1, centerZ + 12.82, .15, 4.2, .18, wood);
  addBox('house-entry-jamb-right', centerX + 1.9, floorY + 2.1, centerZ + 12.82, .15, 4.2, .18, wood);
  const openDoor = addBox('house-entry-open-door', centerX + 1.72, floorY + 2.05, centerZ + 13, 3.2, 4.05, .12, wood);
  openDoor.rotation.y = Math.PI / 2;
  addBox('house-entry-handle', centerX + 1.75, floorY + 2, centerZ + 14.25, .07, .28, .07, brass);
  addBox('house-entry-threshold', centerX, floorY + .04, centerZ + 12.82, 3.8, .08, .5, trim);

  addBox('house-ceiling', centerX, floorY + 5.35, centerZ, 18, .2, 26, mat(0xbab6aa));
  addBox('house-ceiling-light-main', centerX, floorY + 5.18, centerZ - 1, 3.4, .08, 1.2, warmLight);
  addBox('house-ceiling-light-hall', centerX, floorY + 5.18, centerZ + 4.8, 1.7, .08, .55, warmLight);

  // ---------------- Living room ----------------
  // Sofa, coffee table and TV share a direct viewing axis.
  addBox('house-living-room-rug', centerX - 3.25, floorY + .025, centerZ - 2.0, 6.8, .05, 6.8, mat(0x607c7a, .99));
  addBox('house-sofa-base', centerX - 4.9, floorY + .55, centerZ - 2.0, 3.2, .62, 1.55, fabric);
  addBox('house-sofa-back', centerX - 4.9, floorY + 1.25, centerZ - 2.58, 3.2, .9, .32, fabric);
  for (const side of [-1, 1]) addBox(`house-sofa-arm-${side}`, centerX - 4.9 + side * 1.48, floorY + .95, centerZ - 2.0, .3, .8, 1.6, fabric);
  addBox('house-sofa-footprint', centerX - 4.9, floorY + .05, centerZ - 2.0, 3.8, .1, 2.15, trim, true);

  addBox('house-coffee-table-top', centerX - 1.55, floorY + .62, centerZ - 2.0, 2.5, .16, 1.35, wood);
  for (const x of [centerX - 2.45, centerX - .65]) for (const z of [centerZ - 2.52, centerZ - 1.48]) addBox('house-coffee-table-leg', x, floorY + .3, z, .1, .6, .1, trim);
  addBox('house-coffee-table-footprint', centerX - 1.55, floorY + .04, centerZ - 2.0, 2.9, .08, 1.7, trim, true);
  addBox('house-coffee-table-book', centerX - 1.55, floorY + .73, centerZ - 2.05, .75, .04, .5, mat(0xeee3cf));
  addBox('house-coffee-table-mug', centerX - .72, floorY + .78, centerZ - 1.72, .16, .14, .16, white);

  addBox('house-tv-console', centerX + 5.15, floorY + .45, centerZ - 2.0, 5.2, .75, 1.0, wood);
  addBox('house-tv-screen', centerX + 5.15, floorY + 2.0, centerZ - 2.0, 4.3, 2.15, .14, dark);
  addBox('house-tv-display', centerX + 5.15, floorY + 2.0, centerZ - 1.91, 4.02, 1.87, .035, mat(0x254b5a, .22, .2));
  addBox('house-tv-remote', centerX + 4.1, floorY + .86, centerZ - 1.72, .12, .04, .32, dark);
  addInteraction('tv', 'Use TV', centerX + 4.1, centerZ - 1.3, 2.2, { type: 'display' });

  // ---------------- Dining + kitchen ----------------
  addBox('house-dining-rug', centerX + 4.0, floorY + .025, centerZ + 5.25, 6.2, .05, 4.3, mat(0x857866, .99));
  addBox('house-dining-table', centerX + 3.9, floorY + .92, centerZ + 5.2, 4.0, .16, 2.1, wood);
  addBox('house-dining-table-footprint', centerX + 3.9, floorY + .04, centerZ + 5.2, 4.6, .08, 2.8, trim, true);
  for (const [x, z, rot] of [[2.25, 4.35, 0], [5.55, 4.35, 0], [2.25, 6.05, Math.PI], [5.55, 6.05, Math.PI]]) {
    addBox('house-dining-chair-seat', centerX + x, floorY + .52, centerZ + z, .78, .15, .78, fabric);
    const back = addBox('house-dining-chair-back', centerX + x, floorY + 1.05, centerZ + z + (rot ? -.34 : .34), .78, .95, .14, wood); back.rotation.y = rot;
  }
  addBox('house-dining-bowl', centerX + 3.9, floorY + 1.05, centerZ + 5.2, .6, .12, .6, white);

  addBox('house-kitchen-counter', centerX - 4.8, floorY + 1.35, centerZ + 9.15, 6.2, .18, 1.5, counter);
  addBox('house-kitchen-cabinet', centerX - 4.8, floorY + .72, centerZ + 9.15, 6.0, 1.2, 1.35, cabinet);
  addBox('house-kitchen-backsplash', centerX - 4.8, floorY + 2.15, centerZ + 10, 6.0, 1.1, .08, glass);
  addBox('house-kitchen-sink', centerX - 5.8, floorY + 1.48, centerZ + 9.15, 1.15, .06, .75, dark);
  addCylinder('house-kitchen-faucet', centerX - 5.8, floorY + 1.82, centerZ + 9.0, .06, .55, brass);
  addBox('house-kitchen-stove', centerX - 2.75, floorY + 1.5, centerZ + 9.15, 1.15, .08, .85, dark);
  for (const x of [centerX - 3.05, centerX - 2.45]) for (const z of [centerZ + 8.95, centerZ + 9.35]) addCylinder('house-stove-burner', x, floorY + 1.57, z, .12, .03, trim);
  addBox('house-kitchen-fridge', centerX - 7.1, floorY + 2.0, centerZ + 6.8, 1.35, 4.0, 1.3, mat(0xbec7c8, .32, .22), true);
  addBox('house-kitchen-microwave', centerX - 1.7, floorY + 2.25, centerZ + 9.65, 1.0, .55, .65, dark);
  addBox('house-kitchen-cutting-board', centerX - 4.0, floorY + 1.48, centerZ + 9.15, .7, .05, .45, wood);
  addInteraction('fridge', 'Use refrigerator', centerX - 7.1, centerZ + 5.7, 2.0, { type: 'storage' });
  addInteraction('kitchen', 'Use kitchen', centerX - 4.8, centerZ + 9.0, 2.2, { type: 'utility' });

  // ---------------- Hallway + bedroom ----------------
  // A short hall keeps the bedroom private and gives the house a natural American floor plan.
  addBox('house-hall-runner', centerX, floorY + .025, centerZ + 3.9, 2.35, .05, 7.0, mat(0x9b8a74, .99));
  addInteriorDoor('house-bedroom-door', centerX + 4.2, centerZ - 7.0, 1.65);
  addBox('house-bedroom-wall-left', centerX + 1.2, floorY + 2.65, centerZ - 8.9, 5.9, 5.3, wall, true);
  addBox('house-bedroom-wall-back', centerX + 5.9, floorY + 2.65, centerZ - 9.0, 6.2, 5.3, wall, true);
  addBox('house-bedroom-wall-right', centerX + 8.75, floorY + 2.65, centerZ - 6.0, .3, 5.3, wall, true);
  addBox('house-bedroom-wall-front', centerX + 5.7, floorY + 2.65, centerZ - 4.0, 6.3, 5.3, wall, true);
  // Re-open the bedroom doorway in the front wall using jambs rather than a solid blocker.
  addBox('house-bedroom-doorway-left', centerX + 3.35, floorY + 2.1, centerZ - 4.0, .14, 4.2, .18, trim);
  addBox('house-bedroom-doorway-right', centerX + 5.05, floorY + 2.1, centerZ - 4.0, .14, 4.2, .18, trim);
  addBox('house-bedroom-doorway-header', centerX + 4.2, floorY + 4.2, centerZ - 4.0, 1.84, .16, .18, trim);
  const bedroomRug = addBox('house-bedroom-rug', centerX + 4.8, floorY + .025, centerZ - 7.0, 5.8, .05, 3.9, mat(0x817b86, .99));
  bedroomRug.rotation.y = 0;
  addBox('house-bedroom-bed-base', centerX + 4.8, floorY + .48, centerZ - 7.0, 4.1, .48, 2.35, wood);
  addBox('house-bedroom-mattress', centerX + 4.8, floorY + .82, centerZ - 7.0, 3.9, .28, bedFabric);
  addBox('house-bedroom-headboard', centerX + 4.8, floorY + 1.65, centerZ - 8.0, 4.0, 1.9, wood);
  addBox('house-bedroom-bed-footprint', centerX + 4.8, floorY + .04, centerZ - 7.0, 4.6, .08, 2.9, trim, true);
  for (const x of [3.0, 6.6]) {
    addBox('house-bedroom-nightstand', centerX + x, floorY + .55, centerZ - 7.0, .7, .9, .7, wood, true);
    addBox('house-bedroom-nightstand-lamp', centerX + x, floorY + 1.25, centerZ - 7.0, .24, .5, .24, warmLight);
  }
  addBox('house-bedroom-dresser', centerX + 7.3, floorY + .7, centerZ - 4.9, 1.1, 1.3, 2.2, wood, true);
  for (let i = 0; i < 3; i++) addBox('house-bedroom-dresser-pull', centerX + 6.72, floorY + .5 + i * .35, centerZ - 4.9, .08, .08, .22, brass);
  addBox('house-bedroom-wall-art', centerX + 7.0, floorY + 3.0, centerZ - 8.85, .08, 1.4, 2.0, mat(0x6b817b));
  addInteraction('bed', 'Rest at bed', centerX + 4.8, centerZ - 5.5, 2.1, { type: 'rest' });

  // Typical reach-in closet: hanging rail, shelf, drawers and visible clothing.
  addBox('house-closet-back', centerX + 8.1, floorY + 2.0, centerZ - 7.0, .16, 3.8, 3.4, wall);
  addBox('house-closet-top-shelf', centerX + 7.25, floorY + 3.35, centerZ - 7.0, .25, .18, 3.0, wood);
  addBox('house-closet-rail', centerX + 7.45, floorY + 2.75, centerZ - 7.0, .08, .08, 2.7, brass);
  for (let i = 0; i < 6; i++) {
    const clothing = addBox(`house-closet-clothing-${i + 1}`, centerX + 6.3 + i * .45, floorY + 2.05, centerZ - 7.0, .28, 1.25, .08,
      [mat(0x263f68), mat(0x9c3f42), mat(0x4e7659), mat(0xc08c48), mat(0x66547f), mat(0xe1e0d9)][i]);
    clothing.rotation.y = (i % 2 ? .035 : -.035);
  }
  addBox('house-closet-drawer-unit', centerX + 8.15, floorY + .8, centerZ - 8.15, 1.2, 1.4, 1.2, wood, true);
  addBox('house-closet-door-left', centerX + 6.65, floorY + 2.0, centerZ - 5.35, .08, 3.8, 2.7, mat(0xd6c4a9, .8));
  addBox('house-closet-door-right', centerX + 8.05, floorY + 2.0, centerZ - 5.35, .08, 3.8, 2.7, mat(0xd6c4a9, .8));
  addInteraction('wardrobe', 'Change clothes', centerX + 7.4, centerZ - 5.45, 2.2, { type: 'wardrobe', colors: ['#263f68', '#9c3f42', '#4e7659', '#c08c48', '#66547f', '#e1e0d9'] });

  // ---------------- Windows + lived-in details ----------------
  for (const z of [-8.5, 1.0, 7.0]) addWindow('left', z);
  addWindow('right', -7.0, 2.1);
  for (const [i, x, z] of [[0, -7.3, -10.2], [1, 7.1, 8.9]]) {
    addBox(`house-plant-pot-${i}`, centerX + x, floorY + .35, centerZ + z, .55, .7, .55, plantPot);
    const plant = new THREE.Mesh(new THREE.SphereGeometry(.62, 8, 6), leaves);
    plant.name = `house-plant-leaves-${i}`; plant.position.set(centerX + x, floorY + 1.25, centerZ + z); plant.scale.set(.85, 1.2, .85); root.add(plant);
  }
  addBox('house-entry-bench', centerX - 6.8, floorY + .52, centerZ + 11.0, 2.8, .6, .55, wood, true);
  addBox('house-entry-coat-hooks', centerX - 6.8, floorY + 2.2, centerZ + 10.68, 2.6, .08, .12, brass);
  addBox('house-entry-shoe-tray', centerX - 5.9, floorY + .08, centerZ + 11.8, 1.5, .06, .65, dark);
  addBox('house-hall-console', centerX + 1.2, floorY + .55, centerZ + 1.5, .7, .9, 1.9, wood, true);
  addBox('house-hall-console-lamp', centerX + 1.2, floorY + 1.2, centerZ + 1.5, .22, .45, .22, warmLight);

  root.userData.coastlineColliders = colliders;
  root.userData.coastlineInteractionPoints = interactions;
  root.userData.coastlineHouseContract = {
    id: 'home-interior',
    threshold: { x: centerX, z: centerZ + 13, halfWidth: 1.8 },
    returnToGarage: { x: centerX, z: centerZ + 10.5 },
    zones: ['entry', 'living', 'dining', 'kitchen', 'hall', 'bedroom', 'closet'],
    wardrobe: { id: 'wardrobe', x: centerX + 7.4, z: centerZ - 5.45, radius: 2.2, clothingColors: ['#263f68', '#9c3f42', '#4e7659', '#c08c48', '#66547f', '#e1e0d9'] },
  };
  return root;
}
