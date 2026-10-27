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
  const wall = mat(0xe3ded1), floor = mat(0x9b7a54, .9), trim = mat(0x4a382d), wood = mat(0x91694a), fabric = mat(0x557c83), dark = mat(0x202a2d);
  const glass = mat(0x78aeb9, .2, .08, { transparent: true, opacity: .78 });
  const brass = mat(0xc38b3e, .34, .58), white = mat(0xf2eee5, .72), counter = mat(0xc5c5bd, .45), cabinet = mat(0x65766f, .6);
  const plantPot = mat(0x9b6544), leaves = mat(0x38704b, .95), bedFabric = mat(0x6d7890, .94);
  const warmLight = new THREE.MeshStandardMaterial({ color: 0xfff1ce, emissive: 0xffd98a, emissiveIntensity: .55, roughness: .35 });

  const addBox = (name, x, y, z, w, h, d, material, collider = false) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.name = name; mesh.position.set(x, y, z); mesh.castShadow = h > .25; mesh.receiveShadow = true; root.add(mesh);
    if (collider) colliders.push({ name, x, z, w, d });
    return mesh;
  };
  const addCylinder = (name, x, y, z, radius, height, material, collider = false) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 12), material);
    mesh.name = name; mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
    if (collider) colliders.push({ name, x, z, w: radius * 2, d: radius * 2 });
    return mesh;
  };
  const addInteraction = (id, label, x, z, radius, extra = {}) => interactions.push({ id, label, x, z, radius, ...extra });
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

  addBox('house-interior-floor', centerX, floorY - .08, centerZ, 18, .16, 26, floor);
  // A single lightweight line mesh gives the natural hardwood a staggered-plank finish.
  const plankLines = [];
  for (let i = 1; i < 18; i++) { const x = centerX - 9 + i; plankLines.push(x, floorY + .004, centerZ - 12.85, x, floorY + .004, centerZ + 12.85); }
  for (let row = 0; row < 8; row++) { const z = centerZ - 11.3 + row * 3.2; const offset = row % 2 ? 0 : .5; for (let col = 0; col < 4; col++) { const x = centerX - 8.5 + col * 4.5 + offset; plankLines.push(x, floorY + .004, z, Math.min(centerX + 8.8, x + 2.2), floorY + .004, z); } }
  const plankGeometry = new THREE.BufferGeometry(); plankGeometry.setAttribute('position', new THREE.Float32BufferAttribute(plankLines, 3));
  const plankSeams = new THREE.LineSegments(plankGeometry, new THREE.LineBasicMaterial({ color: 0x715338, transparent: true, opacity: .48 }));
  plankSeams.name = 'house-hardwood-plank-seams'; root.add(plankSeams);
  addBox('house-left-wall', centerX - 9, floorY + 2.65, centerZ, .3, 5.3, 26, wall, true);
  addBox('house-right-wall', centerX + 9, floorY + 2.65, centerZ, .3, 5.3, 26, wall, true);
  addBox('house-back-wall', centerX, floorY + 2.65, centerZ - 13, 18, 5.3, .3, wall, true);

  addBox('house-entry-wall-left', centerX - 5.45, floorY + 2.65, centerZ + 13, 7.1, 5.3, .3, wall, true);
  addBox('house-entry-wall-right', centerX + 5.45, floorY + 2.65, centerZ + 13, 7.1, 5.3, .3, wall, true);
  addBox('house-entry-lintel', centerX, floorY + 4.75, centerZ + 13, 3.8, 1.1, .3, wall);
  addBox('house-entry-jamb-left', centerX - 1.9, floorY + 2.1, centerZ + 12.82, .15, 4.2, .18, wood);
  addBox('house-entry-jamb-right', centerX + 1.9, floorY + 2.1, centerZ + 12.82, .15, 4.2, .18, wood);
  const openDoor = addBox('house-entry-open-door', centerX + 1.72, floorY + 2.05, centerZ + 13, 3.2, 4.05, .12, wood); openDoor.rotation.y = Math.PI / 2;
  addBox('house-entry-handle', centerX + 1.75, floorY + 2, centerZ + 14.25, .07, .28, .07, brass);
  addBox('house-entry-threshold', centerX, floorY + .04, centerZ + 12.82, 3.8, .08, .5, trim);
  addBox('house-ceiling', centerX, floorY + 5.35, centerZ, 18, .2, 26, mat(0xbab6aa));
  addBox('house-ceiling-light-main', centerX, floorY + 5.18, centerZ - 1, 3.4, .08, 1.2, warmLight);
  addBox('house-ceiling-light-hall', centerX, floorY + 5.18, centerZ + 4.8, 1.7, .08, .55, warmLight);

  // Open-plan kitchen/living/dining: the GLB reference uses clear room zoning,
  // built-in storage, layered countertop detail, and a compact central prep island.
  // Keep a generous central circulation lane from the entry to the living room.
  // Living room: one direct viewing axis from sofa through coffee table to TV.
  addBox('house-living-room-rug', centerX - 4.0, floorY + .025, centerZ - 2.0, 5.5, .05, 5.3, mat(0x607c7a, .99));
  addBox('house-sofa-base', centerX - 4.9, floorY + .55, centerZ - 2.0, 3.2, .62, 1.55, fabric);
  addBox('house-sofa-back', centerX - 4.9, floorY + 1.25, centerZ - 2.58, 3.2, .9, .32, fabric);
  for (const side of [-1, 1]) addBox(`house-sofa-arm-${side}`, centerX - 4.9 + side * 1.48, floorY + .95, centerZ - 2.0, .3, .8, 1.6, fabric);
  addBox('house-sofa-footprint', centerX - 4.9, floorY + .05, centerZ - 2.0, 3.8, .1, 2.15, trim, true);
  // Keep the coffee table fully inside the living zone, clear of the main walking lane.
  addBox('house-coffee-table-top', centerX - 2.55, floorY + .62, centerZ - 2.0, 2.0, .16, 1.15, wood);
  for (const x of [centerX - 3.25, centerX - 1.85]) for (const z of [centerZ - 2.42, centerZ - 1.58]) addBox('house-coffee-table-leg', x, floorY + .3, z, .1, .6, .1, trim);
  addBox('house-coffee-table-footprint', centerX - 2.55, floorY + .04, centerZ - 2.0, 2.35, .08, 1.45, trim, true);
  addBox('house-coffee-table-book', centerX - 2.55, floorY + .73, centerZ - 2.05, .65, .04, .42, mat(0xeee3cf));
  addBox('house-coffee-table-mug', centerX - 1.95, floorY + .78, centerZ - 1.72, .16, .14, .16, white);
  addBox('house-tv-console', centerX + 5.15, floorY + .45, centerZ - 2.0, 5.2, .75, 1.0, wood);
  addBox('house-tv-screen', centerX + 5.15, floorY + 2.0, centerZ - 2.0, 4.3, 2.15, .14, dark);
  addBox('house-tv-display', centerX + 5.15, floorY + 2.0, centerZ - 1.91, 4.02, 1.87, .035, mat(0x254b5a, .22, .2));
  addBox('house-tv-remote', centerX + 4.1, floorY + .86, centerZ - 1.72, .12, .04, .32, dark);
  addInteraction('tv', 'Use TV', centerX + 4.1, centerZ - 1.3, 2.2, { type: 'display' });

  // Dining and kitchen remain connected but do not occupy the walking corridor.
  // The living-room carpet is the home's only rug; dining and circulation areas stay hardwood.
  addBox('house-dining-table', centerX + 3.9, floorY + .92, centerZ + 5.2, 4.0, .16, 2.1, wood);
  addBox('house-dining-table-footprint', centerX + 3.9, floorY + .04, centerZ + 5.2, 4.6, .08, 2.8, trim, true);
  for (const [x, z] of [[2.25, 4.35], [5.55, 4.35], [2.25, 6.05], [5.55, 6.05]]) {
    addBox('house-dining-chair-seat', centerX + x, floorY + .52, centerZ + z, .78, .15, .78, fabric);
    addBox('house-dining-chair-back', centerX + x, floorY + 1.05, centerZ + z + (z < centerZ + 5 ? .34 : -.34), .78, .95, .14, wood);
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
  // Upper cabinetry, segmented cabinet fronts, and a compact island make the
  // kitchen read as a fitted American home rather than a few floating blocks.
  for (let i = 0; i < 5; i++) {
    const x = centerX - 7.25 + i * 1.22;
    addBox(`house-kitchen-upper-cabinet-${i}`, x, floorY + 3.0, centerZ + 9.72, 1.08, 1.05, .58, cabinet);
    addBox(`house-kitchen-upper-door-${i}`, x, floorY + 3.0, centerZ + 9.39, .94, .88, .045, white);
    addBox(`house-kitchen-upper-pull-${i}`, x + .34, floorY + 3.0, centerZ + 9.35, .045, .22, .035, brass);
    addBox(`house-kitchen-lower-door-${i}`, x, floorY + .75, centerZ + 8.43, 1.04, .82, .045, white);
  }
  addBox('house-kitchen-island-base', centerX - 3.05, floorY + .72, centerZ + 7.15, 3.55, 1.35, 1.35, cabinet, true);
  addBox('house-kitchen-island-countertop', centerX - 3.05, floorY + 1.43, centerZ + 7.15, 3.85, .16, 1.58, counter);
  addBox('house-kitchen-island-waterfall-end', centerX - 4.87, floorY + .75, centerZ + 7.15, .1, 1.28, 1.5, white);
  addBox('house-kitchen-island-fruit-bowl', centerX - 4.05, floorY + 1.56, centerZ + 7.15, .55, .12, .42, plantPot);
  for (const x of [centerX - 4.0, centerX - 2.1]) {
    addBox('house-kitchen-island-stool-seat', x, floorY + .78, centerZ + 6.02, .68, .16, .62, fabric);
    for (const dx of [-.22, .22]) for (const dz of [-.2, .2]) addBox('house-kitchen-island-stool-leg', x + dx, floorY + .38, centerZ + 6.02 + dz, .07, .76, .07, trim);
  }
  addBox('house-kitchen-pendant-rail', centerX - 3.05, floorY + 4.3, centerZ + 7.15, 3.0, .07, .08, dark);
  for (const x of [centerX - 3.9, centerX - 2.2]) {
    addCylinder('house-kitchen-pendant-drop', x, floorY + 3.95, centerZ + 7.15, .025, .65, brass);
    addCylinder('house-kitchen-pendant-shade', x, floorY + 3.62, centerZ + 7.15, .22, .16, warmLight);
  }

  // Enclosed bath/laundry zone at the rear-left, inspired by the reference model's
  // separate bathroom fixtures and stacked utility appliances. Wall gaps remain open.
  addBox('house-bathroom-partition-right', centerX - 1.95, floorY + 2.55, centerZ - 8.9, .22, 5.1, 7.2, wall, true);
  addBox('house-bathroom-partition-front-left', centerX - 6.95, floorY + 2.55, centerZ - 5.25, 3.0, 5.1, .22, wall, true);
  addBox('house-bathroom-partition-front-right', centerX - 3.0, floorY + 2.55, centerZ - 5.25, 2.05, 5.1, .22, wall, true);
  addBox('house-bathroom-door-frame-left', centerX - 5.15, floorY + 2.0, centerZ - 5.25, .12, 4.0, .18, trim);
  addBox('house-bathroom-door-frame-right', centerX - 3.75, floorY + 2.0, centerZ - 5.25, .12, 4.0, .18, trim);
  addBox('house-bathroom-door-leaf', centerX - 4.45, floorY + 1.98, centerZ - 5.18, 1.25, 3.82, .08, wood);
  addBox('house-bathroom-vanity', centerX - 2.9, floorY + .75, centerZ - 7.0, 1.2, 1.4, 1.0, wood, true);
  addBox('house-bathroom-vanity-top', centerX - 2.9, floorY + 1.5, centerZ - 7.0, 1.35, .12, 1.12, white);
  addBox('house-bathroom-sink-basin', centerX - 2.9, floorY + 1.59, centerZ - 7.0, .65, .08, .55, dark);
  addCylinder('house-bathroom-faucet', centerX - 2.9, floorY + 1.82, centerZ - 7.28, .035, .32, brass);
  addBox('house-bathroom-mirror-frame', centerX - 2.9, floorY + 2.75, centerZ - 7.48, 1.15, 1.35, .08, trim);
  addBox('house-bathroom-mirror', centerX - 2.9, floorY + 2.75, centerZ - 7.42, .98, 1.17, .035, glass);
  addBox('house-bathroom-toilet-tank', centerX - 7.15, floorY + .72, centerZ - 7.1, .72, 1.0, .48, white, true);
  addCylinder('house-bathroom-toilet-bowl', centerX - 7.15, floorY + .34, centerZ - 7.65, .42, .38, white, true);
  addBox('house-bathroom-shower-tray', centerX - 6.85, floorY + .12, centerZ - 10.6, 2.65, .2, 3.2, white, true);
  addBox('house-bathroom-shower-back-panel', centerX - 6.85, floorY + 1.75, centerZ - 12.05, 2.65, 3.2, .12, glass);
  addBox('house-bathroom-shower-side-panel', centerX - 8.12, floorY + 1.75, centerZ - 10.6, .12, 3.2, 2.9, glass);
  addCylinder('house-bathroom-shower-head', centerX - 7.8, floorY + 3.05, centerZ - 11.7, .11, .12, brass);
  addBox('house-laundry-washer', centerX - 3.05, floorY + .85, centerZ - 10.35, 1.2, 1.65, 1.25, white, true);
  addBox('house-laundry-washer-door', centerX - 3.05, floorY + .85, centerZ - 9.69, .72, .72, .08, glass);
  addBox('house-laundry-dryer', centerX - 3.05, floorY + 2.55, centerZ - 10.35, 1.2, 1.55, 1.25, white, true);
  addBox('house-laundry-dryer-door', centerX - 3.05, floorY + 2.55, centerZ - 9.69, .72, .72, .08, glass);
  addBox('house-bathroom-towel-rail', centerX - 5.2, floorY + 2.55, centerZ - 5.62, 1.0, .08, .08, brass);
  addBox('house-bathroom-towel', centerX - 5.2, floorY + 2.2, centerZ - 5.62, .7, .55, .05, white);
  addInteraction('bathroom', 'Use bathroom', centerX - 5.3, centerZ - 6.3, 2.0, { type: 'utility' });
  // Private bedroom at the back-right, accessed through a normal interior doorway.
  addBox('house-bedroom-wall-left', centerX + 1.2, floorY + 2.65, centerZ - 8.9, 5.9, 5.3, wall, true);
  addBox('house-bedroom-wall-back', centerX + 5.9, floorY + 2.65, centerZ - 9.0, 6.2, 5.3, .3, wall, true);
  addBox('house-bedroom-wall-right', centerX + 8.75, floorY + 2.65, centerZ - 6.0, .3, 5.3, wall, true);
  addBox('house-bedroom-wall-front', centerX + 5.7, floorY + 2.65, centerZ - 4.0, 6.3, 5.3, .3, wall, true);
  addInteriorDoor('house-bedroom-door', centerX + 4.2, centerZ - 4.0, 1.65);
  // Door leaf is visual only; the doorway itself is kept open for reliable movement.
  addBox('house-bedroom-bed-base', centerX + 4.8, floorY + .48, centerZ - 7.0, 4.1, .48, 2.35, wood);
  addBox('house-bedroom-mattress', centerX + 4.8, floorY + .82, centerZ - 7.0, 3.9, .28, bedFabric);
  addBox('house-bedroom-headboard', centerX + 4.8, floorY + 1.65, centerZ - 8.0, 4.0, 1.9, wood);
  addBox('house-bedroom-bed-footprint', centerX + 4.8, floorY + .04, centerZ - 7.0, 4.6, .08, 2.9, trim, true);
  for (const x of [3.0, 6.6]) {
    addBox('house-bedroom-nightstand', centerX + x, floorY + .55, centerZ - 7.0, .7, .9, .7, wood, true);
    addBox('house-bedroom-nightstand-lamp', centerX + x, floorY + 1.25, centerZ - 7.0, .24, .5, .24, warmLight);
  }
  addBox('house-bedroom-dresser', centerX + 7.3, floorY + .7, centerZ - 4.9, 1.1, 1.3, 2.2, wood, true);
  addBox('house-bedroom-wall-art', centerX + 7.0, floorY + 3.0, centerZ - 8.85, .08, 1.4, 2.0, mat(0x6b817b));
  addInteraction('bed', 'Rest at bed', centerX + 4.8, centerZ - 5.5, 2.1, { type: 'rest' });

  // Enclosed rear-wall closet: a defined back, side walls, sliding doors, and reachable wardrobe interaction.
  const closetWood = mat(0x8b6848, .86), closetDoor = mat(0xd6c4a9, .84);
  addBox('house-closet-back', centerX + 5.7, floorY + 1.95, centerZ - 11.65, 5.0, 3.7, .14, wall, true);
  addBox('house-closet-side-left', centerX + 3.2, floorY + 1.95, centerZ - 10.55, .14, 3.7, 2.1, wall, true);
  addBox('house-closet-side-right', centerX + 8.2, floorY + 1.95, centerZ - 10.55, .14, 3.7, 2.1, wall, true);
  addBox('house-closet-top-shelf', centerX + 5.7, floorY + 3.2, centerZ - 10.55, 4.7, .16, 1.8, closetWood);
  addBox('house-closet-rail', centerX + 5.7, floorY + 2.65, centerZ - 10.55, 4.25, .07, .07, brass);
  for (let i = 0; i < 6; i++) addBox(`house-closet-clothing-${i + 1}`, centerX + 3.95 + i * .7, floorY + 2.0, centerZ - 10.55, .34, 1.25, .08, [mat(0x263f68), mat(0x9c3f42), mat(0x4e7659), mat(0xc08c48), mat(0x66547f), mat(0xe1e0d9)][i]);
  addBox('house-closet-drawer-unit', centerX + 7.35, floorY + .7, centerZ - 10.15, 1.0, 1.3, .75, closetWood, true);
  addBox('house-closet-door-left', centerX + 4.5, floorY + 1.95, centerZ - 9.48, 2.35, 3.7, .08, closetDoor, true);
  addBox('house-closet-door-right', centerX + 6.9, floorY + 1.95, centerZ - 9.48, 2.35, 3.7, .08, closetDoor, true);
  addBox('house-closet-door-handle-left', centerX + 5.55, floorY + 1.95, centerZ - 9.39, .05, .35, .06, brass);
  addBox('house-closet-door-handle-right', centerX + 5.85, floorY + 1.95, centerZ - 9.39, .05, .35, .06, brass);
  addInteraction('wardrobe', 'Change clothes', centerX + 5.7, centerZ - 8.65, 2.0, { type: 'wardrobe', colors: ['#263f68', '#9c3f42', '#4e7659', '#c08c48', '#66547f', '#e1e0d9'] });

  for (const z of [-8.5, 1.0, 7.0]) addWindow('left', z);
  addWindow('right', -7.0, 2.1);
  for (const [i, x, z] of [[0, -7.3, -10.2], [1, 7.1, 8.9]]) {
    addBox(`house-plant-pot-${i}`, centerX + x, floorY + .35, centerZ + z, .55, .7, .55, plantPot);
    const plant = new THREE.Mesh(new THREE.SphereGeometry(.62, 8, 6), leaves);
    plant.name = `house-plant-leaves-${i}`; plant.position.set(centerX + x, floorY + 1.25, centerZ + z); plant.scale.set(.85, 1.2, .85); root.add(plant);
  }
  // Small home-office nook along the living-room side wall, using the reference
  // apartment's desk/monitor organization without crowding the central hallway.
  addBox('house-office-desk', centerX - 7.15, floorY + .95, centerZ + 2.1, 2.45, .14, 1.15, wood, true);
  addBox('house-office-desk-left-leg', centerX - 8.15, floorY + .45, centerZ + 2.1, .12, .9, 1.0, dark);
  addBox('house-office-desk-right-leg', centerX - 6.15, floorY + .45, centerZ + 2.1, .12, .9, 1.0, dark);
  addBox('house-office-monitor', centerX - 7.15, floorY + 1.75, centerZ + 1.82, 1.25, .78, .12, dark);
  addBox('house-office-screen', centerX - 7.15, floorY + 1.75, centerZ + 1.745, 1.08, .61, .025, mat(0x2f687a, .2, .15));
  addBox('house-office-keyboard', centerX - 7.15, floorY + 1.06, centerZ + 2.32, .72, .05, .25, white);
  addBox('house-office-chair-seat', centerX - 7.15, floorY + .58, centerZ + 3.2, .78, .14, .75, fabric);
  addBox('house-office-chair-back', centerX - 7.15, floorY + 1.12, centerZ + 3.52, .78, .9, .14, fabric);
  addBox('house-entry-bench', centerX - 6.8, floorY + .52, centerZ + 11.0, 2.8, .6, .55, wood, true);
  addBox('house-entry-coat-hooks', centerX - 6.8, floorY + 2.2, centerZ + 10.68, 2.6, .08, .12, brass);
  addBox('house-entry-shoe-tray', centerX - 5.9, floorY + .08, centerZ + 11.8, 1.5, .06, .65, dark);
  addBox('house-hall-console', centerX + 1.2, floorY + .55, centerZ + 1.5, .7, .9, 1.9, wood, true);
  addBox('house-hall-console-lamp', centerX + 1.2, floorY + 1.2, centerZ + 1.5, .22, .45, .22, warmLight);

  root.userData.coastlineColliders = colliders;
  root.userData.coastlineInteractionPoints = interactions;
  root.userData.coastlineHouseContract = {
    id: 'home-interior', threshold: { x: centerX, z: centerZ + 13, halfWidth: 1.8 }, returnToGarage: { x: centerX, z: centerZ + 10.5 },
    zones: ['entry', 'living', 'dining', 'kitchen', 'hall', 'bathroom', 'laundry', 'office', 'bedroom', 'closet'],
    wardrobe: { id: 'wardrobe', x: centerX + 5.7, z: centerZ - 8.65, radius: 2.0, clothingColors: ['#263f68', '#9c3f42', '#4e7659', '#c08c48', '#66547f', '#e1e0d9'] },
  };
  installHomeyWardrobeRuntime();
  return root;
}

const HOME_WARDROBE_COLORS = [
  { name: 'Ocean Blue', hex: '#263f68' }, { name: 'Coastal Red', hex: '#9c3f42' }, { name: 'Forest Green', hex: '#4e7659' },
  { name: 'Sandstone', hex: '#c08c48' }, { name: 'Harbor Purple', hex: '#66547f' }, { name: 'Classic White', hex: '#e1e0d9' },
];
const HOME_WARDROBE_STYLES = ['Everyday Tee', 'Polo', 'Light Jacket'];

function applyHomeWardrobeAppearance(player, choice) {
  if (!player) return false;
  player.coastlineClothing = { style: choice.style, color: choice.color };
  try { localStorage.setItem('coastlineHomeWardrobe', JSON.stringify(player.coastlineClothing)); } catch {}
  const avatar = window.__coastlineAvatar || window.__coastlinePlayer?.avatar || window.__coastlinePlayer?.g;
  if (!avatar?.traverse) return true;
  const color = new (window.THREE?.Color || class { constructor(hex) { this.hex = hex; } })(choice.color);
  let changed = 0;
  avatar.traverse(node => {
    if (!node.isMesh) return;
    const name = `${node.name || ''} ${node.material?.name || ''}`.toLowerCase();
    if (!/(shirt|jacket|hoodie|top|clothing|outfit)/.test(name)) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) if (material?.color?.set) { material.color.set(choice.color); changed++; }
    if (/jacket|hoodie/.test(name)) node.visible = choice.style !== 'Everyday Tee';
    if (/shirt|top|clothing|outfit/.test(name)) node.visible = choice.style === 'Everyday Tee' || choice.style === 'Polo';
  });
  player.coastlineClothingAppliedMaterialCount = changed;
  return true;
}

function openHomeWardrobeChooser(player) {
  const existing = document.getElementById('coastlineHomeWardrobe'); existing?.remove();
  let saved = null; try { saved = JSON.parse(localStorage.getItem('coastlineHomeWardrobe') || 'null'); } catch {}
  let selectedStyle = saved?.style || HOME_WARDROBE_STYLES[0];
  let selectedColor = HOME_WARDROBE_COLORS.find(c => c.hex === saved?.color) || HOME_WARDROBE_COLORS[0];
  const overlay = document.createElement('div'); overlay.id = 'coastlineHomeWardrobe'; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:2006;display:flex;align-items:center;justify-content:center;padding:18px;background:#02090edb;backdrop-filter:blur(8px);font-family:system-ui,sans-serif;color:#f4fbff';
  const panel = document.createElement('section'); panel.style.cssText = 'width:min(460px,100%);max-height:86vh;overflow:auto;border:1px solid #8be8ff55;border-radius:20px;background:linear-gradient(145deg,#18272c,#091316 70%);box-shadow:0 28px 90px #000b;padding:20px';
  panel.innerHTML = '<div style="font-size:11px;letter-spacing:.22em;color:#8be8ff;font-weight:800">HOMEY HOUSE • WARDROBE</div><h2 style="margin:5px 0 2px;font-size:24px">Change clothes</h2><div style="font-size:13px;color:#b6c6ce">Choose an everyday style and color.</div><div style="margin-top:18px;font-size:12px;color:#b6c6ce">STYLE</div><div id="homeWardrobeStyles" style="display:grid;grid-template-columns:1fr;gap:8px;margin-top:8px"></div><div style="margin-top:16px;font-size:12px;color:#b6c6ce">CLOTHING COLOR</div><div id="homeWardrobeColors" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px"></div><div style="display:flex;justify-content:flex-end;margin-top:20px"><button id="homeWardrobeClose" type="button" style="padding:11px 18px;border-radius:10px;border:1px solid #80e8ff;background:#7de4fa;color:#07141a;font-weight:900">Done</button></div>';
  overlay.appendChild(panel); document.body.appendChild(overlay);
  const render = () => {
    const styles = panel.querySelector('#homeWardrobeStyles'); styles.replaceChildren();
    for (const style of HOME_WARDROBE_STYLES) { const b = document.createElement('button'); b.type='button'; b.textContent=style; b.setAttribute('aria-pressed',String(style===selectedStyle)); b.style.cssText=`padding:11px;text-align:left;border-radius:10px;border:1px solid ${style===selectedStyle?'#8be8ff':'#3a505b'};background:${style===selectedStyle?'#17333e':'#0b171d'};color:#edf8fc;font-weight:700`; b.onclick=()=>{selectedStyle=style;render();}; styles.appendChild(b); }
    const colors = panel.querySelector('#homeWardrobeColors'); colors.replaceChildren();
    for (const color of HOME_WARDROBE_COLORS) { const b=document.createElement('button'); b.type='button'; b.setAttribute('aria-pressed',String(color.hex===selectedColor.hex)); b.style.cssText=`display:flex;align-items:center;gap:9px;text-align:left;padding:10px;border-radius:10px;border:1px solid ${color.hex===selectedColor.hex?'#8be8ff':'#3a505b'};background:${color.hex===selectedColor.hex?'#17333e':'#0b171d'};color:#edf8fc;font-weight:700`; const sw=document.createElement('span'); sw.style.cssText=`width:23px;height:23px;border-radius:50%;background:${color.hex};border:1px solid #ffffff77`; b.append(sw,document.createTextNode(color.name)); b.onclick=()=>{selectedColor=color;render();}; colors.appendChild(b); }
  };
  render();
  panel.querySelector('#homeWardrobeClose').onclick=()=>{applyHomeWardrobeAppearance(player,{style:selectedStyle,color:selectedColor.hex});overlay.remove();};
  overlay.onclick=e=>{if(e.target===overlay)overlay.remove();};
  return { close: () => overlay.remove() };
}

function installHomeyWardrobeRuntime() {
  if (typeof window === 'undefined' || window.__coastlineHomeWardrobeRuntimeInstalled) return;
  window.__coastlineHomeWardrobeRuntimeInstalled = true;
  window.__coastlineHomeWardrobe = { colors: HOME_WARDROBE_COLORS, styles: HOME_WARDROBE_STYLES, open: () => openHomeWardrobeChooser(window.__coastlinePlayer) };
  const button = document.createElement('button');
  button.id = 'coastlineHomeWardrobeUse'; button.type = 'button'; button.textContent = 'Change clothes'; button.hidden = true;
  button.style.cssText = 'position:fixed;left:50%;bottom:94px;transform:translateX(-50%);z-index:1900;padding:12px 18px;border-radius:12px;border:1px solid #8be8ff;background:#0b2029e8;color:#f4fbff;font:800 14px system-ui,sans-serif;box-shadow:0 8px 30px #0008';
  document.body.appendChild(button);
  button.addEventListener('click', () => openHomeWardrobeChooser(window.__coastlinePlayer));
  setInterval(() => {
    const player = window.__coastlinePlayer;
    const status = window.__coastlineTransitionTest?.status?.();
    const worldId = status?.activeWorldId || window.__coastlineActiveWorldId;
    const point = { x: 490.4, z: 494.55 };
    const near = worldId === 'home-interior' && player?.mode === 'walk' && Number.isFinite(player.x) && Number.isFinite(player.z) && Math.hypot(player.x-point.x, player.z-point.z) <= 2.4;
    button.hidden = !near;
  }, 150);
}
