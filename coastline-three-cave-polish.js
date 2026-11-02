/**
 * Three-cave polish: keep the approved formation facing the lemonade side,
 * remove the over-blocking side-cavern maze walls, and keep a long open path.
 * Also keeps the existing rocket-boots pickup reachable in the center cavern.
 */
function removeBlockedSideMaze(root) {
  const colliders = root?.userData?.coastlineColliders;
  for (const id of ['left', 'right']) {
    const group = root?.getObjectByName?.(`coastline-three-cave-${id}-labyrinth-walls`);
    group?.parent?.remove(group);
    if (Array.isArray(colliders)) {
      for (let i = colliders.length - 1; i >= 0; i--) {
        if (String(colliders[i]?.name || '').startsWith(`coastline-three-cave-${id}-labyrinth`)) colliders.splice(i, 1);
      }
    }
  }
  if (Array.isArray(colliders)) window.__coastlineActiveWorldColliders = colliders;
}

function buildOpenTunnelRibs(root, THREE) {
  if (!root?.getObjectByName || !THREE || root.getObjectByName('coastline-three-cave-open-tunnel-ribs')) return;
  const group = new THREE.Group();
  group.name = 'coastline-three-cave-open-tunnel-ribs';
  const material = new THREE.MeshStandardMaterial({ color: 0x4a4b43, roughness: 1 });
  const geometry = new THREE.DodecahedronGeometry(1, 1);
  const colliders = root.userData.coastlineColliders || (root.userData.coastlineColliders = []);
  for (const id of ['left', 'right']) {
    const cx = id === 'left' ? 510 : 530;
    for (let i = 0; i < 8; i++) {
      const z = 554 + i * 13.5;
      const side = i % 2 ? -1 : 1;
      const x = cx + side * 3.25;
      const rock = new THREE.Mesh(geometry, material);
      rock.name = `coastline-three-cave-${id}-open-rib-${i + 1}`;
      rock.position.set(x, 1.4, z);
      rock.scale.set(1.0, 1.7, 1.0);
      rock.castShadow = rock.receiveShadow = true;
      group.add(rock);
      colliders.push({ name: rock.name + '-collision', x, z, w: 1.35, d: 2.1 });
    }
  }
  root.add(group);
  window.__coastlineActiveWorldColliders = colliders;
}

function ensureRocketBootsReachable(root, THREE) {
  if (!root?.traverse || !THREE) return;
  const colliders = root.userData?.coastlineColliders;
  if (Array.isArray(colliders)) {
    // Clear only blockers crossing the short route from the center threshold to
    // the existing gameplay pickup at x=524,z=568. Keep cave perimeter collision.
    for (let i = colliders.length - 1; i >= 0; i--) {
      const c = colliders[i];
      if (!c || !Number.isFinite(c.x) || !Number.isFinite(c.z)) continue;
      const inPickupCorridor = c.x >= 516 && c.x <= 528 && c.z >= 548 && c.z <= 568;
      const isPerimeter = /cavern-(outer-wall|divider|rear)$/.test(String(c.name || ''));
      if (inPickupCorridor && !isPerimeter) colliders.splice(i, 1);
    }
    window.__coastlineActiveWorldColliders = colliders;
  }

  if (root.getObjectByName('coastline-rocket-boots-visible-pickup')) return;
  const boots = new THREE.Group();
  boots.name = 'coastline-rocket-boots-visible-pickup';
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: .45, metalness: .35 });
  const glowMat = new THREE.MeshStandardMaterial({ color: 0x55ddff, emissive: 0x55ddff, emissiveIntensity: 2.5, roughness: .35 });
  for (const side of [-1, 1]) {
    const boot = new THREE.Mesh(new THREE.BoxGeometry(.8, .55, 1.55), bodyMat);
    boot.position.set(524 + side * .62, 1.0, 568);
    boot.rotation.y = side * .08;
    boots.add(boot);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(.16, .24, .55, 10), glowMat);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(524 + side * .62, .78, 568.72);
    boots.add(nozzle);
  }
  const marker = new THREE.Mesh(new THREE.TorusGeometry(1.15, .08, 8, 32), glowMat);
  marker.rotation.x = -Math.PI / 2;
  marker.position.set(524, .08, 568);
  boots.add(marker);
  root.add(boots);
}

function maintainCavePolish() {
  const root = window.__coastlineActiveWorldRoot || window.__coastlineRegionRoot;
  const THREE = window.__coastlineThree;
  if (!root || !THREE) return;

  const world = window.__coastlineActiveWorldId;
  if (world === 'waterfront') {
    const cave = root.userData?.coastlineReplacementCave;
    if (cave && !cave.userData.coastlineLemonadeFacingFixed) {
      // The supplied GLB's authored forward axis is opposite the Waterfront
      // lemonade side. Rotate the complete approved formation 180 degrees.
      cave.rotation.y += Math.PI;
      cave.userData.coastlineLemonadeFacingFixed = true;
      cave.updateMatrixWorld(true);
    }
  }

  if (world === 'electric-lemonade-dungeon') {
    removeBlockedSideMaze(root);
    buildOpenTunnelRibs(root, THREE);
    ensureRocketBootsReachable(root, THREE);
  }
}

if (typeof window !== 'undefined') {
  window.__coastlineThreeCavePolishUpdate = maintainCavePolish;
  const timer = window.setInterval(maintainCavePolish, 100);
  window.addEventListener('beforeunload', () => window.clearInterval(timer), { once: true });
}
