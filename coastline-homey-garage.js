const GARAGE_COLORS = Object.freeze([
  { name: 'Midnight Black', hex: '#151a20' },
  { name: 'Pearl White', hex: '#e9e8e2' },
  { name: 'Ocean Blue', hex: '#197aab' },
  { name: 'Coastal Teal', hex: '#168b87' },
  { name: 'Sunset Orange', hex: '#ed762d' },
  { name: 'Racing Red', hex: '#b92d35' },
  { name: 'Silver Metallic', hex: '#9ca7af' },
  { name: 'Forest Green', hex: '#326b4b' },
]);

export function buildHomeyGarageInterior(THREE, { centerX = 483, centerZ = 500, floorY = 0 } = {}) {
  const root = new THREE.Group();
  root.name = 'coastline-homey-garage-interior';
  const colliders = [];
  const mat = (color, roughness = .55, metalness = .08, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const floorMat = mat(0x38434a, .22, .32);
  const wallMat = mat(0x26323a, .76, .18);
  const trimMat = mat(0x111a20, .4, .35);
  const cabinetMat = mat(0x374650, .45, .25);
  const warmWood = mat(0x916443, .62, .08);
  const ledMat = new THREE.MeshStandardMaterial({ color: 0xe7fbff, emissive: 0x9deaff, emissiveIntensity: 2.2, roughness: .25 });
  const amberMat = new THREE.MeshStandardMaterial({ color: 0xffc879, emissive: 0xff9e43, emissiveIntensity: 1.35, roughness: .3 });
  const addBox = (name, x, y, z, w, h, d, material, collider = false) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = h > .25;
    root.add(mesh);
    if (collider) colliders.push({ name, x, z, w, d });
    return mesh;
  };
  // Interior is aligned to Homey Island's existing open bay (front at z = centerZ - 12).
  addBox('garage-showroom-epoxy-floor', centerX, floorY + .08, centerZ + 1, 13.2, .16, 24, floorMat);
  addBox('garage-left-wall', centerX - 6.9, floorY + 2.7, centerZ + 1, .3, 5.4, 24, wallMat, true);
  addBox('garage-right-wall', centerX + 6.9, floorY + 2.7, centerZ + 1, .3, 5.4, 24, wallMat, true);
  addBox('garage-rear-wall', centerX, floorY + 2.7, centerZ + 13, 13.8, 5.4, .3, wallMat, true);
  addBox('garage-ceiling', centerX, floorY + 5.45, centerZ + 1, 13.8, .25, 24.5, trimMat);
  addBox('garage-entry-header', centerX, floorY + 5.05, centerZ - 11, 13.8, .45, .55, trimMat);
  // Six crisp luminous ceiling strips and a warm perimeter accent keep the bay premium without heavy lighting.
  for (let i = 0; i < 3; i++) {
    const x = centerX - 4 + i * 4;
    addBox(`garage-led-ceiling-strip-${i + 1}`, x, floorY + 5.28, centerZ + 1, .16, .035, 19.5, ledMat);
  }
  for (const side of [-1, 1]) {
    addBox(`garage-warm-perimeter-light-${side}`, centerX + side * 6.3, floorY + 4.85, centerZ + 1, .08, .06, 20, amberMat);
  }
  // Collector-style wall cabinets, slatwall and a service bench.
  addBox('garage-workbench', centerX + 4.95, floorY + 1.05, centerZ + 7.5, 2.7, .18, 5.6, warmWood);
  addBox('garage-tool-wall', centerX + 6.45, floorY + 2.65, centerZ + 7.5, .12, 2.9, 5.8, trimMat);
  for (let i = 0; i < 5; i++) {
    addBox(`garage-tool-slat-${i + 1}`, centerX + 6.36, floorY + 1.55 + i * .48, centerZ + 5.2, .08, .035, 4.7, cabinetMat);
  }
  for (let i = 0; i < 3; i++) {
    addBox(`garage-upper-cabinet-${i + 1}`, centerX + 4.95, floorY + 3.55, centerZ + 5.5 + i * 1.85, 2.55, 1.0, 1.45, cabinetMat);
    addBox(`garage-cabinet-handle-${i + 1}`, centerX + 3.63, floorY + 3.55, centerZ + 5.5 + i * 1.85, .06, .22, .12, ledMat);
  }
  // Low-profile lift pads and wheel guides frame the drive-out position.
  for (const x of [centerX - 3.4, centerX + 3.4]) {
    for (const z of [centerZ - 1.4, centerZ + 5.8]) {
      addBox(`garage-lift-pad-${x}-${z}`, x, floorY + .19, z, .8, .22, 1.8, trimMat);
    }
  }
  addBox('garage-drive-out-guide-left', centerX - 4.2, floorY + .105, centerZ + 1.6, .08, .05, 8.8, amberMat);
  addBox('garage-drive-out-guide-right', centerX + 4.2, floorY + .105, centerZ + 1.6, .08, .05, 8.8, amberMat);
  // A physical, illuminated key board is mounted on the right-hand wall.
  addBox('garage-key-board-frame', centerX + 6.45, floorY + 2.65, centerZ + 1.0, .2, 2.5, 3.5, warmWood);
  addBox('garage-key-board-face', centerX + 6.32, floorY + 2.65, centerZ + 1.0, .12, 2.25, 3.25, cabinetMat);
  addBox('garage-key-board-title-plate', centerX + 6.22, floorY + 3.45, centerZ + 1.0, .08, .34, 2.7, amberMat);
  for (let i = 0; i < 8; i++) {
    const row = Math.floor(i / 4), col = i % 4;
    const z = centerZ + .15 + col * .55;
    const y = floorY + 2.8 - row * .78;
    addBox(`garage-key-hook-${i + 1}`, centerX + 6.15, y, z, .16, .12, .12, ledMat);
    addBox(`garage-key-fob-${i + 1}`, centerX + 6.02, y - .17, z, .1, .25, .16, amberMat);
  }
  // A discreet wall-mounted badge adds a premium workshop identity.
  addBox('garage-brand-plaque', centerX - 6.68, floorY + 3.9, centerZ - 4.5, .08, .8, 3.2, amberMat);
  root.userData.coastlineColliders = colliders;
  root.userData.coastlineGarageContract = {
    id: 'homey-garage',
    threshold: { x: centerX, z: centerZ - 12, halfWidth: 5.8 },
    board: { x: centerX + 4.7, z: centerZ + 1 },
    driveOut: { x: centerX, y: floorY, z: centerZ + 1, rotationY: Math.PI },
    returnOutside: { x: centerX, y: floorY, z: centerZ - 16, rotationY: Math.PI },
  };
  return root;
}

export function openGarageVehicleChooser({ vehicles, currentVehicle, onConfirm, onCancel = () => {} }) {
  const existing = document.getElementById('coastlineGarageChooser');
  existing?.remove();
  const available = [...new Set((vehicles || [])
    .filter(v => v?.kind === 'car' && v.rgsdevModelName && v.g && v !== currentVehicle)
    .map(v => v.rgsdevModelName))].sort();
  if (currentVehicle?.rgsdevModelName) available.unshift(currentVehicle.rgsdevModelName);
  const models = [...new Set(available)];
  if (!models.length) models.push('SUV');
  const overlay = document.createElement('div');
  overlay.id = 'coastlineGarageChooser';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Choose your vehicle and paint');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:2005;display:flex;align-items:center;justify-content:center;padding:18px;background:#02090edb;backdrop-filter:blur(8px);pointer-events:auto;font-family:system-ui,sans-serif;color:#f4fbff';
  const panel = document.createElement('section');
  panel.style.cssText = 'width:min(520px,100%);max-height:86vh;overflow:auto;border:1px solid #8be8ff55;border-radius:20px;background:linear-gradient(145deg,#17262f,#081319 70%);box-shadow:0 28px 90px #000b;padding:20px';
  panel.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><div><div style="font-size:11px;letter-spacing:.22em;color:#8be8ff;font-weight:800">HOMEY ISLAND • MOTOR CLUB</div><h2 style="margin:5px 0 2px;font-size:24px">Your next ride</h2><div style="font-size:13px;color:#b6c6ce">Pick a model, then choose its finish.</div></div><div style="font-size:30px">🔑</div></div><label for="garageModel" style="display:block;margin-top:18px;font-size:12px;color:#b6c6ce">VEHICLE MODEL</label><select id="garageModel" style="width:100%;margin-top:6px;padding:12px;border-radius:10px;background:#0a171e;color:#f4fbff;border:1px solid #55717e;font-size:15px"></select><div style="margin-top:16px;font-size:12px;color:#b6c6ce">PAINT COLOR</div><div id="garageColors" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px"></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px"><button id="garageCancel" type="button" style="padding:11px 16px;border-radius:10px;border:1px solid #71818a;background:#15242c;color:#e6edf0;font-weight:700">Cancel</button><button id="garageConfirm" type="button" style="padding:11px 16px;border-radius:10px;border:1px solid #80e8ff;background:#7de4fa;color:#07141a;font-weight:900">Swap vehicle</button></div>';
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  const modelSelect = panel.querySelector('#garageModel');
  for (const model of models) {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model.replace(/[-_]/g, ' ');
    modelSelect.appendChild(option);
  }
  const colorsRoot = panel.querySelector('#garageColors');
  let selectedColor = GARAGE_COLORS[2];
  const renderColors = () => {
    colorsRoot.replaceChildren();
    for (const color of GARAGE_COLORS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-pressed', String(color.hex === selectedColor.hex));
      button.style.cssText = `display:flex;align-items:center;gap:9px;text-align:left;padding:10px;border-radius:10px;border:1px solid ${color.hex === selectedColor.hex ? '#8be8ff' : '#3a505b'};background:${color.hex === selectedColor.hex ? '#17333e' : '#0b171d'};color:#edf8fc;font-size:12px;font-weight:700`;
      const swatch = document.createElement('span');
      swatch.style.cssText = `width:23px;height:23px;flex:0 0 23px;border-radius:50%;background:${color.hex};border:1px solid #ffffff77;box-shadow:inset 0 0 5px #0007`;
      button.append(swatch, document.createTextNode(color.name));
      button.addEventListener('click', () => { selectedColor = color; renderColors(); });
      colorsRoot.appendChild(button);
    }
  };
  renderColors();
  panel.querySelector('#garageCancel').addEventListener('click', () => { overlay.remove(); onCancel(); });
  panel.querySelector('#garageConfirm').addEventListener('click', () => {
    const choice = { model: modelSelect.value, color: { ...selectedColor } };
    overlay.remove();
    onConfirm(choice);
  });
  overlay.addEventListener('click', event => { if (event.target === overlay) { overlay.remove(); onCancel(); } });
  panel.querySelector('#garageModel').focus();
  return { close: () => overlay.remove(), models };
}

export function didCrossGarageThreshold(previous, current, { x, z, halfWidth = 5.8, direction = 'in' } = {}) {
  if (!previous || !current || ![previous.x, previous.z, current.x, current.z, current.heading, x, z].every(Number.isFinite)) return false;
  if (Math.abs(previous.x - x) > halfWidth || Math.abs(current.x - x) > halfWidth) return false;
  if (direction === 'in') return previous.z < z && current.z >= z && Math.cos(current.heading) > .45;
  if (direction === 'out') return previous.z > z && current.z <= z && Math.cos(current.heading) < -.45;
  return false;
}

export function canUseGarageKeyBoard({ worldId, mode, player, board, maxDistance = 8.5 } = {}) {
  if (worldId !== 'homey-garage' || mode !== 'walk' || !player || !board) return false;
  if (![player.x, player.z, board.x, board.z].every(Number.isFinite)) return false;
  return Math.hypot(player.x - board.x, player.z - board.z) <= maxDistance;
}

export const HOMEY_GARAGE_PAINT_COLORS = GARAGE_COLORS;
