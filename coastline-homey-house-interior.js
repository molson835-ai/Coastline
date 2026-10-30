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
    const x = centerX + (side === 'left' ? -10.78 : 10.78);
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

  addBox('house-interior-floor', centerX, floorY - .08, centerZ, 22, .16, 26, floor);
  // A single lightweight line mesh gives the natural hardwood a staggered-plank finish.
  const plankLines = [];
  for (let i = 1; i < 22; i++) { const x = centerX - 11 + i; plankLines.push(x, floorY + .004, centerZ - 12.85, x, floorY + .004, centerZ + 12.85); }
  for (let row = 0; row < 8; row++) { const z = centerZ - 11.3 + row * 3.2; const offset = row % 2 ? 0 : .5; for (let col = 0; col < 5; col++) { const x = centerX - 10.5 + col * 4.2 + offset; plankLines.push(x, floorY + .004, z, Math.min(centerX + 8.8, x + 2.2), floorY + .004, z); } }
  const plankGeometry = new THREE.BufferGeometry(); plankGeometry.setAttribute('position', new THREE.Float32BufferAttribute(plankLines, 3));
  const plankSeams = new THREE.LineSegments(plankGeometry, new THREE.LineBasicMaterial({ color: 0x715338, transparent: true, opacity: .48 }));
  plankSeams.name = 'house-hardwood-plank-seams'; root.add(plankSeams);
  addBox('house-left-wall', centerX - 11, floorY + 2.65, centerZ, .3, 5.3, 26, wall, true);
  addBox('house-right-wall', centerX + 11, floorY + 2.65, centerZ, .3, 5.3, 26, wall, true);
  addBox('house-back-wall', centerX, floorY + 2.65, centerZ - 13, 22, 5.3, .3, wall, true);

  addBox('house-entry-wall-left', centerX - 6.45, floorY + 2.65, centerZ + 13, 9.1, 5.3, .3, wall, true);
  addBox('house-entry-wall-right', centerX + 6.45, floorY + 2.65, centerZ + 13, 9.1, 5.3, .3, wall, true);
  addBox('house-entry-lintel', centerX, floorY + 4.75, centerZ + 13, 3.8, 1.1, .3, wall);
  addBox('house-entry-jamb-left', centerX - 1.9, floorY + 2.1, centerZ + 12.82, .15, 4.2, .18, wood);
  addBox('house-entry-jamb-right', centerX + 1.9, floorY + 2.1, centerZ + 12.82, .15, 4.2, .18, wood);
  const openDoor = addBox('house-entry-open-door', centerX + 1.72, floorY + 2.05, centerZ + 13, 3.2, 4.05, .12, wood); openDoor.rotation.y = Math.PI / 2;
  addBox('house-entry-handle', centerX + 1.75, floorY + 2, centerZ + 14.25, .07, .28, .07, brass);
  addBox('house-entry-threshold', centerX, floorY + .04, centerZ + 12.82, 3.8, .08, .5, trim);
  addBox('house-ceiling', centerX, floorY + 5.35, centerZ, 22, .2, 26, mat(0xbab6aa));
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
  // Flush-mount the TV on the east wall, outside the hall leading to the closet.
  addBox('house-tv-console', centerX + 9.55, floorY + .45, centerZ - 2.0, .72, .75, 5.2, wood, true);
  addBox('house-tv-screen', centerX + 9.2, floorY + 2.0, centerZ - 2.0, .14, 2.15, 4.3, dark);
  addBox('house-tv-display', centerX + 9.11, floorY + 2.0, centerZ - 2.0, .035, 1.87, 4.02, mat(0x254b5a, .22, .2));
  addBox('house-tv-remote', centerX + 9.0, floorY + .86, centerZ - 1.72, .12, .04, .32, dark);
  addInteraction('tv', 'Use TV', centerX + 8.2, centerZ - 2.0, 2.2, { type: 'display' });

  // Dining and kitchen remain connected but do not occupy the walking corridor.
  // The living-room carpet is the home's only rug; dining and circulation areas stay hardwood.
  // Compact east-side dining nook keeps a direct entry-to-hall route open.
  addBox('house-dining-table', centerX + 8.0, floorY + .92, centerZ + 5.0, 2.55, .16, 1.6, wood);
  addBox('house-dining-table-footprint', centerX + 8.0, floorY + .04, centerZ + 5.0, 3.0, .08, 2.15, trim, true);
  for (const [x, z] of [[6.5, 4.1], [9.5, 4.1], [6.5, 5.9], [9.5, 5.9]]) {
    addBox('house-dining-chair-seat', centerX + x, floorY + .52, centerZ + z, .62, .15, .62, fabric);
    addBox('house-dining-chair-back', centerX + x, floorY + 1.02, centerZ + z + (z < centerZ + 5 ? .28 : -.28), .62, .9, .13, wood);
  }
  addBox('house-dining-bowl', centerX + 8.0, floorY + 1.05, centerZ + 5.0, .42, .12, .42, white);
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
  addBox('house-bedroom-wall-left', centerX + 1.2, floorY + 2.65, centerZ - 8.9, .3, 5.3, 26, wall, true);
  addBox('house-bedroom-wall-back', centerX + 5.9, floorY + 2.65, centerZ - 9.0, 6.2, 5.3, .3, wall, true);
  addBox('house-bedroom-wall-right', centerX + 8.75, floorY + 2.65, centerZ - 6.0, .3, 5.3, wall, true);
  // Split the bedroom front wall around the doorway so the room is genuinely walkable.
  addBox('house-bedroom-wall-front-left', centerX + 2.85, floorY + 2.65, centerZ - 4.0, .5, 5.3, .3, wall, true);
  // The widened bedroom doorway aligns with the route to the walk-in closet.
  addBox('house-bedroom-wall-front-right', centerX + 7.45, floorY + 2.65, centerZ - 4.0, 2.6, 5.3, .3, wall, true);
  addInteriorDoor('house-bedroom-door', centerX + 4.2, centerZ - 4.0, 2.0);
  // Door leaf is visual only; the doorway itself is kept open for reliable movement.
  // Keep the bed on the east side and orient its long edge north/south.
  // The previous bed-footprint collider cut across the only path from the doorway to the closet.
  addBox('house-bedroom-bed-base', centerX + 7.3, floorY + .48, centerZ - 5.8, 2.3, .48, 3.6, wood);
  addBox('house-bedroom-mattress', centerX + 7.3, floorY + .82, centerZ - 5.8, 2.15, .28, 3.5, bedFabric);
  addBox('house-bedroom-headboard', centerX + 7.3, floorY + 1.65, centerZ - 7.25, 2.3, 1.9, .18, wood);
  addBox('house-bedroom-bed-footprint', centerX + 7.3, floorY + .04, centerZ - 5.8, 2.55, .08, 4.0, trim, true);
  // A compact bedside table sits beside the foot of the bed rather than in the closet route.
  addBox('house-bedroom-nightstand', centerX + 5.3, floorY + .55, centerZ - 3.2, .7, .9, .7, wood, true);
  addBox('house-bedroom-nightstand-lamp', centerX + 5.3, floorY + 1.25, centerZ - 3.2, .24, .5, .24, warmLight);
  addBox('house-bedroom-dresser', centerX + 7.5, floorY + .7, centerZ - 2.5, 1.1, 1.3, .9, wood, true);
  addBox('house-bedroom-wall-art', centerX + 7.0, floorY + 3.0, centerZ - 8.85, .08, 1.4, 2.0, mat(0x6b817b));
  addInteraction('bed', 'Rest at bed', centerX + 6.6, centerZ - 5.8, 2.1, { type: 'rest' });

  // Wider walk-in closet with a clear, usable opening into the bedroom.
  const closetWood = mat(0x8b6848, .86), closetDoor = mat(0xd6c4a9, .84);
  addBox('house-closet-back', centerX + 4.9, floorY + 1.95, centerZ - 8.82, 4.6, 3.7, .14, wall, true);
  addBox('house-closet-side-left', centerX + 2.6, floorY + 1.95, centerZ - 8.12, .14, 3.7, 1.4, wall, true);
  addBox('house-closet-side-right', centerX + 7.2, floorY + 1.95, centerZ - 8.12, .14, 3.7, 1.4, wall, true);
  addBox('house-closet-top-shelf', centerX + 4.9, floorY + 3.2, centerZ - 8.15, 4.35, .16, 1.25, closetWood);
  addBox('house-closet-rail', centerX + 4.9, floorY + 2.65, centerZ - 8.15, 3.8, .07, .07, brass);
  const closetGarmentColors = [mat(0x263f68), mat(0x9c3f42), mat(0x4e7659), mat(0xc08c48), mat(0x66547f)];
  for (let i = 0; i < closetGarmentColors.length; i++) {
    addBox('house-closet-clothing-' + (i + 1), centerX + 3.35 + i * .72, floorY + 2.0, centerZ - 8.15, .32, 1.25, .08, closetGarmentColors[i]);
  }
  addBox('house-closet-drawer-unit', centerX + 6.45, floorY + .7, centerZ - 8.15, .82, 1.3, .7, closetWood, true);
  const closetLeftDoor = addBox('house-closet-door-left', centerX + 3.7, floorY + 1.95, centerZ - 7.45, 1.55, 3.7, .08, closetDoor, false);
  const closetRightDoor = addBox('house-closet-door-right', centerX + 6.1, floorY + 1.95, centerZ - 7.45, 1.55, 3.7, .08, closetDoor, false);
  closetLeftDoor.rotation.y = -Math.PI / 2;
  closetRightDoor.rotation.y = Math.PI / 2;
  addBox('house-closet-door-handle-left', centerX + 4.0, floorY + 1.95, centerZ - 7.36, .05, .35, .06, brass);
  addBox('house-closet-door-handle-right', centerX + 5.8, floorY + 1.95, centerZ - 7.36, .05, .35, .06, brass);
  addInteraction('wardrobe', 'Change clothes', centerX + 4.9, centerZ - 6.2, 2.2, { type: 'wardrobe' });

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
  // Hall console and lamp are pushed against the east wall, not into the walkway.
  addBox('house-hall-console', centerX + 9.55, floorY + .55, centerZ + 1.5, .58, .9, 1.35, wood, true);
  addBox('house-hall-console-lamp', centerX + 9.55, floorY + 1.2, centerZ + 1.5, .22, .45, .22, warmLight);

  root.userData.coastlineColliders = colliders;
  root.userData.coastlineInteractionPoints = interactions;
  root.userData.coastlineHouseContract = {
    id: 'home-interior', threshold: { x: centerX, z: centerZ + 13, halfWidth: 1.8 }, returnToGarage: { x: centerX, z: centerZ + 10.5 },
    zones: ['entry', 'living', 'dining', 'kitchen', 'hall', 'bathroom', 'laundry', 'office', 'bedroom', 'closet'],
    wardrobe: { id: 'wardrobe', x: centerX + 4.9, z: centerZ - 6.2, radius: 2.2, clothingColors: ['#263f68', '#9c3f42', '#4e7659', '#c08c48', '#66547f', '#e1e0d9'] },
  };
  if (typeof window !== 'undefined') window.__coastlineHomeyHouseContract = root.userData.coastlineHouseContract;
  installHomeyWardrobeRuntime();
  return root;
}

const HOME_WARDROBE_PALETTES = {
  clothing: [
    { name:'Ocean Blue', hex:'#263f68' }, { name:'Coastal Red', hex:'#9c3f42' },
    { name:'Forest Green', hex:'#4e7659' }, { name:'Sandstone', hex:'#c08c48' },
    { name:'Harbor Purple', hex:'#66547f' }, { name:'Classic White', hex:'#e1e0d9' },
    { name:'Midnight Black', hex:'#20252b' }, { name:'Lagoon Teal', hex:'#287b80' },
    { name:'Sunset Orange', hex:'#d86b35' }, { name:'Rose', hex:'#b45d79' },
  ],
  hair: [
    { name:'Black', hex:'#211b19' }, { name:'Dark Brown', hex:'#513427' },
    { name:'Chestnut', hex:'#874d2d' }, { name:'Blond', hex:'#d3ad62' },
    { name:'Silver', hex:'#b9c1c6' }, { name:'Auburn', hex:'#9f3d29' },
    { name:'Blue', hex:'#365d8a' }, { name:'Purple', hex:'#725080' },
  ],
  skin: [
    { name:'Porcelain', hex:'#f2d6c2' }, { name:'Light', hex:'#e1b894' },
    { name:'Medium', hex:'#c98f67' }, { name:'Warm Brown', hex:'#9b6344' },
    { name:'Deep Brown', hex:'#68412f' }, { name:'Espresso', hex:'#472c24' },
  ],
  eyes: [
    { name:'Brown', hex:'#67422c' }, { name:'Blue', hex:'#4b8cb4' },
    { name:'Green', hex:'#4e8b69' }, { name:'Gray', hex:'#9caeb8' },
  ],
};
const HOME_WARDROBE_CHANNELS = [
  { id:'topColor', label:'Shirt / top', palette:'clothing' },
  { id:'bottomColor', label:'Pants / bottom', palette:'clothing' },
  { id:'shoesColor', label:'Shoes', palette:'clothing' },
  { id:'hairColor', label:'Hair color', palette:'hair' },
  { id:'skinColor', label:'Skin tone', palette:'skin' },
  { id:'eyeColor', label:'Eye color', palette:'eyes' },
  { id:'hatColor', label:'Hat color', palette:'clothing' },
  { id:'backpackColor', label:'Backpack color', palette:'clothing' },
];
const HOME_WARDROBE_HAIR_STYLES = [
  { value:'original', label:'Original GLB hair' }, { value:'short', label:'Short' },
  { value:'spiky', label:'Spiky' }, { value:'curly', label:'Curly' }, { value:'bob', label:'Bob' },
  { value:'long', label:'Long' }, { value:'ponytail', label:'Ponytail' }, { value:'bun', label:'Bun' },
];
const HOME_WARDROBE_BODY_SHAPES = [
  { value:'classic', label:'Classic' }, { value:'slim', label:'Slim' }, { value:'chubby', label:'Chubby' },
];
const HOME_WARDROBE_PRESENTATIONS = [
  { value:'androgynous', label:'Androgynous' }, { value:'masculine', label:'Masculine' }, { value:'feminine', label:'Feminine' },
];
const HOME_WARDROBE_ACCESSORIES = [{ id:'hat', label:'Hat' }, { id:'backpack', label:'Backpack' }];
const HOME_WARDROBE_DEFAULTS = Object.freeze({
  color:'#263f68', topColor:'#263f68', bottomColor:'#263f68', shoesColor:'#e1e0d9',
  hairColor:'#513427', skinColor:'#c98f67', eyeColor:'#67422c', hatColor:'#263f68',
  backpackColor:'#4e7659', hairStyle:'original', bodyShape:'classic', presentation:'androgynous',
  accessories:Object.freeze({ hat:true, backpack:true }),
});
function paletteHas(name,value){return(HOME_WARDROBE_PALETTES[name]||[]).some(option=>option.hex===value)}
function normalizeHomeWardrobeChoice(choice={}) {
  const legacy=paletteHas('clothing',choice.color)?choice.color:null;
  const color=(key,palette,fallback)=>{const value=choice[key]??(legacy&&['topColor','bottomColor','shoesColor'].includes(key)?legacy:null);return paletteHas(palette,value)?value:fallback};
  const option=(list,value,fallback)=>list.some(item=>item.value===value)?value:fallback;
  return {
    color:color('topColor','clothing',HOME_WARDROBE_DEFAULTS.topColor),
    topColor:color('topColor','clothing',HOME_WARDROBE_DEFAULTS.topColor),
    bottomColor:color('bottomColor','clothing',HOME_WARDROBE_DEFAULTS.bottomColor),
    shoesColor:color('shoesColor','clothing',HOME_WARDROBE_DEFAULTS.shoesColor),
    hairColor:color('hairColor','hair',HOME_WARDROBE_DEFAULTS.hairColor),
    skinColor:color('skinColor','skin',HOME_WARDROBE_DEFAULTS.skinColor),
    eyeColor:color('eyeColor','eyes',HOME_WARDROBE_DEFAULTS.eyeColor),
    hatColor:color('hatColor','clothing',HOME_WARDROBE_DEFAULTS.hatColor),
    backpackColor:color('backpackColor','clothing',HOME_WARDROBE_DEFAULTS.backpackColor),
    hairStyle:option(HOME_WARDROBE_HAIR_STYLES,choice.hairStyle,HOME_WARDROBE_DEFAULTS.hairStyle),
    bodyShape:option(HOME_WARDROBE_BODY_SHAPES,choice.bodyShape,HOME_WARDROBE_DEFAULTS.bodyShape),
    presentation:option(HOME_WARDROBE_PRESENTATIONS,choice.presentation,HOME_WARDROBE_DEFAULTS.presentation),
    accessories:{hat:choice.accessories?.hat!==false,backpack:choice.accessories?.backpack!==false},
  };
}
function wardrobeMaterialChannel(name) {
  const key=String(name||'').toLowerCase().replace(/\s+/g,'_');
  if(/^(top_|body_secondary$)/.test(key))return'topColor';
  if(/^bottom_/.test(key))return'bottomColor';
  if(/^shoes_/.test(key))return'shoesColor';
  if(/^hair(?:_|$)/.test(key))return'hairColor';
  if(/^(skin(?:_|$)|hand[lr]_)/.test(key))return'skinColor';
  if(/^eyes?(?:_|$)/.test(key))return'eyeColor';
  if(/^hat_/.test(key))return'hatColor';
  if(/^back_/.test(key))return'backpackColor';
  return null;
}
function disposeWardrobeOverlay(group) {
  if(!group)return;
  group.traverse(node=>{node.geometry?.dispose?.();const mats=Array.isArray(node.material)?node.material:(node.material?[node.material]:[]);for(const mat of mats)mat?.dispose?.();});
  group.parent?.remove(group);
}
function applyWardrobeHair(THREE,actorRoot,appearance) {
  if(!actorRoot||!THREE)return;
  const old=actorRoot.getObjectByName('coastline-wardrobe-hair-overlay');
  if(old)disposeWardrobeOverlay(old);
  if(appearance.accessories.hat)return;
  const head=actorRoot.getObjectByName('head');if(!head?.add)return;
  // The Cozy export is a single skinned character with its original hair in the GLB.
  // Keep that authored hair when "original" is selected. Procedural styles are only overlays.
  const hairStyle=appearance.hairStyle;
  const group=new THREE.Group();group.name='coastline-wardrobe-hair-overlay';
  const material=new THREE.MeshStandardMaterial({color:appearance.hairColor,roughness:.87,metalness:0});
  const sphere=(name,x,y,z,sx,sy,sz)=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),material);mesh.name='coastline-wardrobe-hair-'+name;mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh};
  // Cozy head-weighted bounds are approximately X .235 / Z .212 in head space.
  // Widen the scalp cap by another 10% and add it as a subtle crown fill for the
  // authored "original" hairstyle, whose scalp currently shows through near the top.
  // Keep the head/bones unchanged so facial proportions and skinning remain stable.
  const cap=()=>sphere('cap',0,.235,0,.27,.14,.244);
  if(hairStyle==='original'){
    cap();
  }else if(hairStyle==='short'){
    cap();sphere('side-left',-.225,.115,0,.055,.15,.13);sphere('side-right',.225,.115,0,.055,.15,.13);
  }else if(hairStyle==='spiky'){
    cap();
    for(const [x,y,z,sx,sy,sz] of [[-.11,.34,0,.05,.12,.05],[-.035,.36,.02,.052,.14,.052],[.04,.34,0,.047,.12,.047],[.11,.32,-.015,.045,.1,.045],[0,.33,-.075,.048,.11,.048]]){
      const spike=new THREE.Mesh(new THREE.ConeGeometry(1,1.35,6),material);spike.name='coastline-wardrobe-hair-spike';spike.position.set(x,y,z);spike.scale.set(sx,sy,sz);spike.castShadow=true;group.add(spike);
    }
  }else if(hairStyle==='curly'){
    cap();for(let i=0;i<12;i++){const angle=i*Math.PI*2/12,radius=.205;sphere('curl',Math.cos(angle)*radius,.23+(i%3)*.012,Math.sin(angle)*radius,.055,.054,.055);}
  }else if(hairStyle==='bob'){
    cap();sphere('bob-left',-.225,.07,0,.055,.22,.135);sphere('bob-right',.225,.07,0,.055,.22,.135);sphere('bob-back',0,.04,-.195,.17,.15,.055);
  }else if(hairStyle==='long'){
    cap();sphere('long-left',-.225,.075,-.015,.06,.28,.12);sphere('long-right',.225,.075,-.015,.06,.28,.12);sphere('long-back',0,.075,-.205,.16,.28,.065);
  }else if(hairStyle==='ponytail'){
    cap();sphere('ponytail-tie',0,.24,-.22,.065,.065,.065);sphere('ponytail',0,.02,-.25,.065,.22,.075);sphere('ponytail-tip',0,-.15,-.26,.06,.075,.07);
  }else if(hairStyle==='bun'){
    cap();sphere('bun',0,.35,-.055,.095,.09,.095);sphere('bun-base',0,.28,-.04,.07,.05,.07);
  }
  head.add(group);actorRoot.userData.coastlineWardrobeHairStyle=appearance.hairStyle;
}
function applyWardrobeBodyProfile(THREE,actorRoot,appearance) {
  if(!THREE||!actorRoot)return;
  const shape=appearance.bodyShape==='slim'?{spine:.94,chest:.92,hips:.94,upperLeg:.96}:appearance.bodyShape==='chubby'?{spine:1.07,chest:1.12,hips:1.1,upperLeg:1.05}:{spine:1,chest:1,hips:1,upperLeg:1};
  const presentation=appearance.presentation==='masculine'?{chest:1.07,shoulders:1.08,hips:.97}:appearance.presentation==='feminine'?{chest:.96,shoulders:.94,hips:1.06}:{chest:1,shoulders:1,hips:1};
  actorRoot.traverse(node=>{
    if(!node.isBone)return;
    if(!node.userData.coastlineWardrobeBaseScale)node.userData.coastlineWardrobeBaseScale=node.scale.clone();
    const name=String(node.name||'').toLowerCase();let x=1;
    if(name==='spine')x=shape.spine;
    else if(name==='chest')x=shape.chest*presentation.chest;
    else if(name==='hips')x=shape.hips*presentation.hips;
    else if(name.startsWith('shoulder.'))x=presentation.shoulders;
    else if(name.startsWith('upperleg.'))x=shape.upperLeg;
    node.scale.copy(node.userData.coastlineWardrobeBaseScale).multiply(new THREE.Vector3(x,1,1));
  });
}
function applyWardrobeHeadwear(THREE,actorRoot,appearance) {
  if(!actorRoot||!THREE)return;
  const old=actorRoot.getObjectByName('coastline-wardrobe-headwear-overlay');
  if(old)disposeWardrobeOverlay(old);
  if(!appearance.accessories.hat)return;
  const head=actorRoot.getObjectByName('head');if(!head?.add)return;
  const group=new THREE.Group();group.name='coastline-wardrobe-headwear-overlay';
  const shellMat=new THREE.MeshStandardMaterial({color:appearance.hatColor,roughness:.72,metalness:.08});
  const shell=new THREE.Mesh(new THREE.SphereGeometry(.19,18,12,0,Math.PI*2,0,Math.PI*.62),shellMat);
  shell.name='coastline-wardrobe-headwear-shell';shell.position.set(0,.18,0);shell.scale.set(1,1.05,1);shell.castShadow=true;group.add(shell);
  const rim=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.035,18),shellMat);
  rim.name='coastline-wardrobe-headwear-rim';rim.position.set(0,.11,0);rim.castShadow=true;group.add(rim);
  head.add(group);
}
function applyHomeWardrobeAppearance(player,choice={}) {
  if(!player)return false;
  const appearance=normalizeHomeWardrobeChoice(choice);
  player.coastlineClothing=appearance;player.coastlineAppearance=appearance;
  try{localStorage.setItem('coastlineHomeWardrobe',JSON.stringify(appearance));}catch{}
  const avatar=window.__coastlineAvatar||window.__coastlinePlayerAvatar||window.__coastlinePlayer?.avatar||window.__coastlinePlayer?.g;
  if(!avatar?.traverse){window.__coastlineWardrobeApplyPending=true;return true;}
  const THREE=window.__coastlineThree,actorRoot=avatar.userData?.cozyActor?.root;
  let changed=0;
  avatar.traverse(node=>{
    if(!node.isMesh)return;
    if(!node.userData.coastlineWardrobePrepared){
      node.userData.coastlineWardrobeOriginalVisible=node.visible;
      node.userData.coastlineWardrobeOriginalGroups=node.geometry?.groups?.map(group=>({...group}))||[];
      if(node.geometry&&node.userData.coastlineWardrobeOriginalGroups.length)node.geometry=node.geometry.clone();
      node.material=Array.isArray(node.material)?node.material.map(mat=>mat?.clone?.()||mat):(node.material?.clone?.()||node.material);
      node.userData.coastlineWardrobePrepared=true;
    }
    const materials=Array.isArray(node.material)?node.material:[node.material];
    for(const mat of materials){
      if(!mat?.color?.set)continue;
      const channel=wardrobeMaterialChannel(mat.name||node.name);
      if(channel){mat.color.set(appearance[channel]);mat.needsUpdate=true;changed++;}
    }
    const groups=node.userData.coastlineWardrobeOriginalGroups||[];
    if(groups.length&&materials.length>1){
      node.geometry.clearGroups();
      for(const group of groups){
        const name=String(materials[group.materialIndex]?.name||'').toLowerCase();
        const hiddenAccessory=(name.startsWith('hat_')&&!appearance.accessories.hat)||(name.startsWith('back_')&&!appearance.accessories.backpack);
        const hiddenHair=appearance.hairStyle!=='original'&&name==='hair';
        if(!hiddenAccessory&&!hiddenHair)node.geometry.addGroup(group.start,group.count,group.materialIndex);
      }
      node.visible=node.userData.coastlineWardrobeOriginalVisible!==false;
    }else{
      const names=materials.map(mat=>String(mat?.name||'').toLowerCase());
      const onlyHat=names.length>0&&names.every(name=>name.startsWith('hat_'));
      const onlyBackpack=names.length>0&&names.every(name=>name.startsWith('back_'));
      node.visible=node.userData.coastlineWardrobeOriginalVisible!==false&&!(onlyHat&&!appearance.accessories.hat)&&!(onlyBackpack&&!appearance.accessories.backpack)&&!(names.length===1&&names[0]==='hair'&&appearance.hairStyle!=='original');
    }
  });
  if(actorRoot){applyWardrobeBodyProfile(THREE,actorRoot,appearance);applyWardrobeHair(THREE,actorRoot,appearance);applyWardrobeHeadwear(THREE,actorRoot,appearance);}
  else window.__coastlineWardrobeApplyPending=true;
  player.coastlineClothingAppliedMaterialCount=changed;
  player.coastlineClothingAppliedChannels=HOME_WARDROBE_CHANNELS.map(channel=>channel.id);
  window.__coastlineWardrobeApplyPending=false;
  window.dispatchEvent?.(new CustomEvent('coastline:wardrobe-applied',{detail:{changed,appearance}}));
  return true;
}
function openHomeWardrobeChooser(player) {
  document.getElementById('coastlineHomeWardrobe')?.remove();
  let saved=null;try{saved=JSON.parse(localStorage.getItem('coastlineHomeWardrobe')||'null');}catch{}
  let appearance=normalizeHomeWardrobeChoice(saved||player?.coastlineClothing||{});
  const overlay=document.createElement('div');overlay.id='coastlineHomeWardrobe';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Character appearance');
  overlay.style.cssText='position:fixed;inset:0;z-index:2006;display:flex;align-items:center;justify-content:center;padding:10px;background:#02090edb;backdrop-filter:blur(8px);font-family:system-ui,sans-serif;color:#f4fbff';
  const panel=document.createElement('section');panel.style.cssText='width:min(520px,100%);max-height:92vh;overflow:auto;border:1px solid #8be8ff55;border-radius:18px;background:linear-gradient(145deg,#18272c,#091316 70%);box-shadow:0 28px 90px #000b;padding:16px';
  const heading=document.createElement('div');heading.innerHTML='<div style="font-size:11px;letter-spacing:.2em;color:#8be8ff;font-weight:800">HOMEY HOUSE • WARDROBE</div><h2 style="margin:5px 0 2px;font-size:23px">Character appearance</h2>';panel.appendChild(heading);
  const note=document.createElement('p');note.textContent='Changes apply to the visible character immediately and save on this device. This installed GLB is one Cozy export: hair presets are in-game overlays and body/presentation choices adjust proportions. Additional exported GLB variants are needed for all separate modular meshes.';note.style.cssText='margin:8px 0 12px;font-size:12px;line-height:1.45;color:#b6c6ce';panel.appendChild(note);
  const controls=document.createElement('div');controls.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px';panel.appendChild(controls);
  const selects={};
  const addSelect=(id,label,options)=>{
    const labelNode=document.createElement('label');labelNode.style.cssText='display:flex;flex-direction:column;gap:5px;font-size:12px;color:#b8cbd2;font-weight:800';labelNode.appendChild(document.createTextNode(label));
    const select=document.createElement('select');select.dataset.wardrobeChannel=id;select.style.cssText='width:100%;min-height:40px;padding:8px;border-radius:9px;border:1px solid #3a505b;background:#0b171d;color:#edf8fc;font:700 13px system-ui,sans-serif';
    for(const option of options){const element=document.createElement('option');element.value=option.value??option.hex;element.textContent=option.label??option.name;select.appendChild(element);}
    labelNode.appendChild(select);controls.appendChild(labelNode);selects[id]=select;return select;
  };
  for(const channel of HOME_WARDROBE_CHANNELS){
    const select=addSelect(channel.id,channel.label,HOME_WARDROBE_PALETTES[channel.palette]);select.value=appearance[channel.id];
    select.addEventListener('change',()=>{appearance=normalizeHomeWardrobeChoice({...appearance,[channel.id]:select.value});saveAndApply();});
  }
  const hairSelect=addSelect('hairStyle','Hair style',HOME_WARDROBE_HAIR_STYLES);hairSelect.value=appearance.hairStyle;
  hairSelect.addEventListener('change',()=>{appearance=normalizeHomeWardrobeChoice({...appearance,hairStyle:hairSelect.value,accessories:{...appearance.accessories,hat:false}});saveAndApply();});
  const bodySelect=addSelect('bodyShape','Body shape',HOME_WARDROBE_BODY_SHAPES);bodySelect.value=appearance.bodyShape;
  bodySelect.addEventListener('change',()=>{appearance=normalizeHomeWardrobeChoice({...appearance,bodyShape:bodySelect.value});saveAndApply();});
  const presentationSelect=addSelect('presentation','Gender presentation',HOME_WARDROBE_PRESENTATIONS);presentationSelect.value=appearance.presentation;
  presentationSelect.addEventListener('change',()=>{
    const value=presentationSelect.value,defaultHair={masculine:'short',feminine:'long',androgynous:'curly'};
    appearance=normalizeHomeWardrobeChoice({...appearance,presentation:value,hairStyle:defaultHair[value]||appearance.hairStyle,accessories:{...appearance.accessories,hat:false}});
    saveAndApply();
  });
  const accessoryTitle=document.createElement('div');accessoryTitle.textContent='ACCESSORIES';accessoryTitle.style.cssText='margin-top:14px;font-size:12px;letter-spacing:.08em;color:#b8cbd2;font-weight:900';panel.appendChild(accessoryTitle);
  const accessories=document.createElement('div');accessories.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px';panel.appendChild(accessories);
  const accessoryRenderers={};
  for(const accessory of HOME_WARDROBE_ACCESSORIES){
    const button=document.createElement('button');button.type='button';button.setAttribute('aria-pressed',String(appearance.accessories[accessory.id]));button.style.cssText='padding:11px;text-align:left;border-radius:10px;border:1px solid #3a505b;background:#0b171d;color:#edf8fc;font-weight:800';
    const render=()=>{const enabled=appearance.accessories[accessory.id];button.textContent=(enabled?'✓  ':'○  ')+accessory.label;button.setAttribute('aria-pressed',String(enabled));button.style.borderColor=enabled?'#8be8ff':'#3a505b';button.style.background=enabled?'#17333e':'#0b171d';};
    button.addEventListener('click',()=>{appearance=normalizeHomeWardrobeChoice({...appearance,accessories:{...appearance.accessories,[accessory.id]:!appearance.accessories[accessory.id]}});render();saveAndApply();});
    render();accessoryRenderers[accessory.id]=render;accessories.appendChild(button);
  }
  const status=document.createElement('p');status.id='homeWardrobeApplyStatus';status.setAttribute('role','status');status.textContent='Choose a setting to apply it now.';status.style.cssText='min-height:18px;margin:11px 0 0;font-size:12px;color:#94dced';panel.appendChild(status);
  const footer=document.createElement('div');footer.style.cssText='display:flex;justify-content:flex-end;gap:8px;margin-top:12px';
  const reset=document.createElement('button');reset.type='button';reset.textContent='Reset';reset.style.cssText='padding:10px 15px;border-radius:9px;border:1px solid #3a505b;background:#13252b;color:#edf8fc;font-weight:900';
  reset.addEventListener('click',()=>{appearance=normalizeHomeWardrobeChoice(HOME_WARDROBE_DEFAULTS);for(const channel of HOME_WARDROBE_CHANNELS)selects[channel.id].value=appearance[channel.id];hairSelect.value=appearance.hairStyle;bodySelect.value=appearance.bodyShape;presentationSelect.value=appearance.presentation;for(const render of Object.values(accessoryRenderers))render();saveAndApply();});
  const close=document.createElement('button');close.type='button';close.textContent='Done';close.style.cssText='padding:10px 17px;border-radius:9px;border:1px solid #80e8ff;background:#7de4fa;color:#07141a;font-weight:900';
  close.addEventListener('click',()=>{saveAndApply();overlay.remove();});
  footer.append(reset,close);panel.appendChild(footer);overlay.appendChild(panel);document.body.appendChild(overlay);
  function saveAndApply(){for(const channel of HOME_WARDROBE_CHANNELS)if(selects[channel.id].value!==appearance[channel.id])selects[channel.id].value=appearance[channel.id];hairSelect.value=appearance.hairStyle;bodySelect.value=appearance.bodyShape;presentationSelect.value=appearance.presentation;for(const render of Object.values(accessoryRenderers))render();applyHomeWardrobeAppearance(player||window.__coastlinePlayer,appearance);status.textContent='Appearance applied and saved.';}
  overlay.addEventListener('click',event=>{if(event.target===overlay)overlay.remove();});
  return{close:()=>overlay.remove(),apply:()=>saveAndApply()};
}
function installHomeyWardrobeRuntime(){
  if(typeof window==='undefined'||window.__coastlineHomeWardrobeRuntimeInstalled)return;
  window.__coastlineHomeWardrobeRuntimeInstalled=true;
  const applySaved=()=>{let saved=null;try{saved=JSON.parse(localStorage.getItem('coastlineHomeWardrobe')||'null');}catch{}return saved?applyHomeWardrobeAppearance(window.__coastlinePlayer,saved):false;};
  window.__coastlineHomeWardrobe={colors:HOME_WARDROBE_PALETTES,channels:HOME_WARDROBE_CHANNELS,hairStyles:HOME_WARDROBE_HAIR_STYLES,bodyShapes:HOME_WARDROBE_BODY_SHAPES,presentations:HOME_WARDROBE_PRESENTATIONS,accessories:HOME_WARDROBE_ACCESSORIES,apply:choice=>applyHomeWardrobeAppearance(window.__coastlinePlayer,choice),applySaved,open:()=>openHomeWardrobeChooser(window.__coastlinePlayer)};
  const button=document.createElement('button');button.id='coastlineHomeWardrobeUse';button.type='button';button.textContent='Change clothes';button.hidden=true;
  button.style.cssText='position:fixed;left:50%;bottom:94px;transform:translateX(-50%);z-index:1900;padding:12px 18px;border-radius:12px;border:1px solid #8be8ff;background:#0b2029e8;color:#f4fbff;font:800 14px system-ui,sans-serif;box-shadow:0 8px 30px #0008';
  document.body.appendChild(button);button.addEventListener('click',()=>openHomeWardrobeChooser(window.__coastlinePlayer));applySaved();
  setInterval(()=>{const player=window.__coastlinePlayer,status=window.__coastlineTransitionTest?.status?.(),worldId=status?.activeWorldId||window.__coastlineActiveWorldId,contract=window.__coastlineHomeyHouseContract,point=contract?.wardrobe||{x:487.9,z:493.8,radius:2.2};const near=worldId==='home-interior'&&player?.mode==='walk'&&Number.isFinite(player.x)&&Number.isFinite(player.z)&&Math.hypot(player.x-point.x,player.z-point.z)<=(point.radius||2.2);button.hidden=!near;},150);
}
