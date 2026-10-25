// Coastline Hero Vehicle v22 — single-shell hero vehicle, white paint by default.
// Replaces the starter vehicle's prototype meshes instead of layering a second car on top.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const INST = Symbol('c22i');
const DONE = Symbol('c22d');
let used = false;

const D = {
  L: 187.6 * 0.0254,
  W: 73.9 * 0.0254,
  H: 55.4 * 0.0254,
  WB: 107.1 * 0.0254,
  T: 62.5 * 0.0254
};
const PAINT = 0xf0f2f3;

const mat = (color, metal = 0.2, rough = 0.3, coat = 0) =>
  new THREE.MeshPhysicalMaterial({
    color, metalness: metal, roughness: rough, clearcoat: coat,
    clearcoatRoughness: 0.07, envMapIntensity: 1.5
  });
const glass = () => new THREE.MeshPhysicalMaterial({
  color: 0x081218, metalness: 0.05, roughness: 0.05,
  transmission: 0.15, transparent: true, opacity: 0.95,
  ior: 1.5, clearcoat: 0.9, envMapIntensity: 1.3
});
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d, 4, 3, 4);

function bodyGeometry() {
  const Z = 72, R = 36, positions = [], uvs = [], indices = [];
  for (let i = 0; i <= Z; i++) {
    const t = i / Z, z = -D.L / 2 + t * D.L;
    const front = Math.min(1, t / 0.16);
    const rear = Math.min(1, (1 - t) / 0.17);
    const width = D.W / 2 * (0.90 + 0.10 * rear) * Math.sin(Math.PI * Math.min(1, t * 1.1));
    const centerY = 0.55 + 0.08 * (1 - front) + 0.04 * rear;
    const height = 0.52 + 0.15 * (front * 0.55 + rear * 0.45);
    for (let j = 0; j < R; j++) {
      const a = j / R * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      const x = width * ca * (1 + 0.06 * (1 - Math.abs(sa)));
      let y = centerY + height * 0.5 * sa;
      if (y < 0.38) y = 0.38 + (y - 0.38) * 0.22;
      positions.push(x, y, z);
      uvs.push(t, j / R);
    }
  }
  for (let i = 0; i < Z; i++) for (let j = 0; j < R; j++) {
    const a = i * R + j, b = i * R + (j + 1) % R;
    const c = (i + 1) * R + (j + 1) % R, d = (i + 1) * R + j;
    indices.push(a, b, d, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function cabinGeometry() {
  const Z = 28, X = 14, positions = [], uvs = [], indices = [];
  for (let i = 0; i <= Z; i++) {
    const t = i / Z, z = -0.78 + 1.62 * t;
    const y = 1.03 + 0.36 * Math.sin(Math.PI * t);
    const width = D.W * 0.34 * (0.98 - 0.1 * Math.sin(Math.PI * t));
    for (let j = 0; j <= X; j++) {
      const v = j / X;
      positions.push(-width + 2 * width * v, y + 0.04 * Math.sin(Math.PI * v), z);
      uvs.push(v, t);
    }
  }
  for (let i = 0; i < Z; i++) for (let j = 0; j < X; j++) {
    const a = i * (X + 1) + j, b = a + 1, c = a + X + 2, d = a + X + 1;
    indices.push(a, b, d, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function add(group, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], name = '') {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;
  if (name) mesh.name = name;
  mesh.userData.coastlineHeroVehicle = true;
  group.add(mesh);
  return mesh;
}

function createWheels(group) {
  const tires = [];
  const tireMaterial = mat(0x07090b, 0, 0.9);
  const chrome = mat(0xbcc4c8, 0.96, 0.13, 0.25);
  const brake = mat(0xb20f18, 0.15, 0.2, 0.5);
  const radius = 0.225;
  for (const x of [-D.T / 2, D.T / 2]) for (const z of [-D.WB / 2, D.WB / 2]) {
    tires.push(add(group, new THREE.CylinderGeometry(radius, radius, 0.20, 48, 2),
      tireMaterial, [x, 0.43, z], [0, 0, Math.PI / 2], 'hero-tire'));
    add(group, new THREE.TorusGeometry(radius * 0.73, 0.026, 12, 48),
      chrome, [x, 0.43, z], [0, Math.PI / 2, 0], 'hero-wheel-trim');
    add(group, new THREE.CylinderGeometry(radius * 0.57, radius * 0.57, 0.21, 40, 2),
      chrome, [x, 0.43, z], [0, 0, Math.PI / 2], 'hero-rim');
    add(group, new THREE.CylinderGeometry(radius * 0.3, radius * 0.3, 0.22, 32, 2),
      brake, [x, 0.43, z], [0, 0, Math.PI / 2], 'hero-brake');
  }
  return tires;
}

function buildHero(group) {
  // Keep references to the existing simple vehicle meshes so they can be removed
  // after their damage/paint references are redirected to the hero model.
  const superseded = [...group.children];
  const visual = new THREE.Group();
  visual.name = 'coastline-hero-white-single-shell';
  group.add(visual);

  const paint = mat(PAINT, 0.72, 0.17, 0.95);
  const glassMaterial = glass();
  const black = mat(0x080b0d, 0.7, 0.28);
  const chrome = mat(0xbcc4c8, 0.96, 0.13, 0.25);
  const head = mat(0xf4fbff, 0.06, 0.12, 0.7);
  const tail = mat(0xa4141d, 0.06, 0.12, 0.7);
  const parts = {};

  parts.body = add(visual, bodyGeometry(), paint, [0, 0, 0], [0, 0, 0], 'hero-body');
  parts.cab = add(visual, cabinGeometry(), glassMaterial, [0, 0.05, -0.02], [0, 0, 0], 'hero-cabin');
  parts.roof = add(visual, box(D.W * 0.7, 0.065, 1.54), paint, [0, 1.42, -0.02], [0, 0, 0], 'hero-roof');
  parts.hood = add(visual, box(D.W * 0.56, 0.035, 0.86), paint, [0, 0.86, 1.04], [0, 0, 0], 'hero-hood');
  parts.trunk = add(visual, box(D.W * 0.52, 0.035, 0.48), paint, [0, 0.84, -1.72], [0, 0, 0], 'hero-trunk');

  const front = D.L / 2, rear = -D.L / 2;
  parts.frontBumper = add(visual, box(D.W * 0.72, 0.25, 0.10), black,
    [0, 0.66, front + 0.01], [0, 0, 0], 'hero-front-bumper');
  add(visual, box(D.W * 0.57, 0.075, 0.025), chrome,
    [0, 0.67, front + 0.07], [0, 0, 0], 'hero-front-trim');
  for (const x of [-D.W * 0.31, D.W * 0.31]) {
    add(visual, new THREE.CylinderGeometry(0.085, 0.085, 0.045, 40), head,
      [x, 0.78, front + 0.063], [Math.PI / 2, 0, 0], 'hero-headlight');
    add(visual, new THREE.TorusGeometry(0.105, 0.018, 10, 40), chrome,
      [x, 0.78, front + 0.09], [Math.PI / 2, 0, 0], 'hero-headlight-trim');
  }
  parts.rearBumper = add(visual, box(D.W * 0.73, 0.23, 0.09), black,
    [0, 0.69, rear - 0.02], [0, 0, 0], 'hero-rear-bumper');
  for (const x of [-D.W * 0.29, D.W * 0.29]) for (let k = 0; k < 3; k++) {
    add(visual, box(0.07, 0.105, 0.025), tail,
      [x + k * (x < 0 ? -0.07 : 0.07), 0.75, rear - 0.07], [0, 0, 0], 'hero-tail-light');
  }
  add(visual, box(D.W * 0.34, 0.055, 0.03), chrome,
    [0, 0.64, rear - 0.07], [0, 0, 0], 'hero-rear-trim');
  for (const side of [-1, 1]) {
    add(visual, new THREE.BoxGeometry(0.035, 0.018, 0.13), chrome,
      [side * D.W * 0.505, 1, 0.1], [0, 0, 0], 'hero-mirror-arm');
    add(visual, new THREE.BoxGeometry(0.045, 0.09, 0.48), black,
      [side * D.W * 0.505, 0.69, -0.52], [0, 0, 0], 'hero-side-trim');
  }
  parts.wheels = createWheels(visual);

  // The superseded meshes were unique per vehicle. Remove them from the scene
  // graph and release their geometry buffers; shared materials are not disposed.
  for (const child of superseded) {
    group.remove(child);
    child.traverse?.(node => {
      if (node.isMesh) node.geometry?.dispose?.();
    });
  }

  parts.visualRoot = visual;
  group.userData.coastlineHeroVehicle = {
    version: 22,
    vehicle: '2008-era American muscle coupe',
    paintColor: 'white',
    singleShell: true,
    supersededMeshCount: superseded.length,
    parts
  };
  return parts;
}

function looksLikeVehicleMesh(object) {
  const p = object?.geometry?.parameters;
  if (!p) return false;
  const width = +p.width || 0, height = +p.height || 0, depth = +p.depth || 0;
  return width > 1.4 && width < 2.7 && depth > 3.4 && depth < 6.3 && height > 0.35 && height < 1.1;
}

function hook() {
  const prototype = THREE.Group.prototype;
  if (prototype.__coastlineHeroV22) return;
  prototype.__coastlineHeroV22 = true;
  const addOriginal = prototype.add;
  prototype.add = function (...objects) {
    const result = addOriginal.apply(this, objects);
    if (!this[DONE] && !this.userData?.coastlineHeroVehicle &&
        (objects.some(object => object?.isMesh && looksLikeVehicleMesh(object)) ||
         /vehicle|car|traffic/i.test(this.name || '')) && !used) {
      used = true;
      setTimeout(() => enhanceCar(this), 0);
    }
    return result;
  };
}

export function enhanceCar(group) {
  if (!group) return null;
  if (group[DONE]) return group.userData?.coastlineHeroVehicle?.parts || null;
  group[DONE] = true;
  return buildHero(group);
}

export function installVehicleVisualEnhancer() {
  if (globalThis[INST]) return;
  globalThis[INST] = true;
  hook();
  globalThis.__coastlineHeroVehicleVisuals = {
    version: 22,
    installed: true,
    vehicleStudy: '2008-era American muscle coupe',
    paintColor: 'white',
    replacesSupersededMeshes: true
  };
}

installVehicleVisualEnhancer();
