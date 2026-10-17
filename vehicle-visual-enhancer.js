// Coastline hero-vehicle rendering pass.
// This layer upgrades the existing gameplay car without changing physics, dimensions, input, or collision.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const installed = Symbol('coastlineHeroVisualsInstalled');
const enhanced = Symbol('coastlineHeroVisualsEnhanced');
const mat = (color, roughness, metalness, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
const physical = (color, roughness, metalness, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness, metalness, clearcoat: .72, clearcoatRoughness: .12, ...extra });

function add(group, geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true; mesh.receiveShadow = true;
  group.add(mesh); return mesh;
}

function enhanceCar(group) {
  if (!group || group[enhanced]) return;
  group[enhanced] = true;
  const detail = new THREE.Group(); detail.name = 'coastline-hero-vehicle-details'; group.add(detail);
  const paint = physical(0x167e99, .18, .8);
  const paintDark = physical(0x0e566b, .22, .74);
  const carbon = physical(0x101419, .28, .72);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x102832, roughness: .07, metalness: .2, transmission: .2, transparent: true, opacity: .9, clearcoat: .9, clearcoatRoughness: .06, ior: 1.48 });
  const rubber = mat(0x090c0f, .84, .06);
  const trim = mat(0x161b1f, .28, .76);
  const chrome = mat(0xc3c9cc, .13, .96);
  const brake = mat(0xc92b2b, .25, .68);
  const lamp = new THREE.MeshStandardMaterial({ color: 0xf4f7ff, emissive: 0x9bc9ff, emissiveIntensity: 3.0, roughness: .1, metalness: .08 });
  const tail = new THREE.MeshStandardMaterial({ color: 0x9c1722, emissive: 0x70060b, emissiveIntensity: 2.6, roughness: .14, metalness: .08 });
  const amber = new THREE.MeshStandardMaterial({ color: 0xffa43d, emissive: 0xff6a16, emissiveIntensity: 1.6 });

  // Body sculpting: hood, shoulder, roof and lower aero surfaces.
  add(detail, new THREE.BoxGeometry(1.9, .08, 1.18), paint, 0, .94, 1.03);
  add(detail, new THREE.BoxGeometry(1.76, .055, .9), paintDark, 0, .985, .94);
  for (const x of [-.82, .82]) add(detail, new THREE.BoxGeometry(.055, .035, 3.05), chrome, x, 1.03, .05);
  add(detail, new THREE.BoxGeometry(1.72, .48, 1.92), paintDark, 0, 1.13, -.25);
  add(detail, new THREE.BoxGeometry(1.54, .31, .72), glass, 0, 1.29, .31);
  add(detail, new THREE.BoxGeometry(1.5, .29, .76), glass, 0, 1.29, -.72);
  for (const x of [-.77, .77]) add(detail, new THREE.BoxGeometry(.045, .34, 1.48), trim, x, 1.3, -.2);
  add(detail, new THREE.BoxGeometry(1.55, .045, .06), chrome, 0, 1.11, .72);
  add(detail, new THREE.BoxGeometry(1.66, .07, .32), carbon, 0, .38, 1.88);
  add(detail, new THREE.BoxGeometry(1.7, .06, .34), carbon, 0, .38, -1.9);

  // Front fascia, grille and lighting.
  add(detail, new THREE.BoxGeometry(1.25, .24, .055), trim, 0, .68, 2.17);
  add(detail, new THREE.BoxGeometry(1.02, .11, .035), chrome, 0, .69, 2.205);
  add(detail, new THREE.BoxGeometry(1.42, .075, .08), paintDark, 0, .46, 2.19);
  for (const x of [-.58, .58]) add(detail, new THREE.BoxGeometry(.38, .15, .035), lamp, x, .73, 2.21);
  for (const x of [-.84, .84]) add(detail, new THREE.BoxGeometry(.12, .09, .04), amber, x, .59, 2.2);
  const leftBeam = new THREE.SpotLight(0xddeeff, 18, 34, Math.PI / 9, .48, 1.35);
  const rightBeam = new THREE.SpotLight(0xddeeff, 18, 34, Math.PI / 9, .48, 1.35);
  leftBeam.position.set(-.58, .72, 2.2); rightBeam.position.set(.58, .72, 2.2);
  const leftTarget = new THREE.Object3D(); const rightTarget = new THREE.Object3D();
  leftTarget.position.set(-.58, .48, 13); rightTarget.position.set(.58, .48, 13);
  detail.add(leftTarget, rightTarget); leftBeam.target = leftTarget; rightBeam.target = rightTarget; detail.add(leftBeam, rightBeam);

  // Rear fascia and lamps.
  add(detail, new THREE.BoxGeometry(1.68, .12, .08), paintDark, 0, .66, -2.18);
  for (const x of [-.66, .66]) add(detail, new THREE.BoxGeometry(.48, .15, .035), tail, x, .75, -2.22);
  add(detail, new THREE.BoxGeometry(1.15, .07, .045), chrome, 0, .49, -2.22);
  const leftTail = new THREE.PointLight(0xff1b22, 1.8, 5); const rightTail = new THREE.PointLight(0xff1b22, 1.8, 5);
  leftTail.position.set(-.66, .76, -2.24); rightTail.position.set(.66, .76, -2.24); detail.add(leftTail, rightTail);

  // Mirrors, handles and side skirts.
  for (const x of [-1.12, 1.12]) {
    add(detail, new THREE.BoxGeometry(.2, .11, .3), paint, x, 1.12, .72, 0, 0, x > 0 ? -.08 : .08);
    add(detail, new THREE.BoxGeometry(.1, .035, .18), glass, x * 1.005, 1.12, .72);
    add(detail, new THREE.BoxGeometry(.08, .045, .25), chrome, x * 1.025, .91, -.45);
    add(detail, new THREE.BoxGeometry(.12, .08, 2.3), paintDark, x * 1.01, .48, -.02);
  }
  for (const z of [.42, -.5]) add(detail, new THREE.BoxGeometry(1.65, .035, .045), trim, 0, .94, z);

  // Wheel wells and four multi-layer wheels.
  const wheelPositions = [[-1.08, -1.32], [1.08, -1.32], [-1.08, 1.32], [1.08, 1.32]];
  for (const [x, z] of wheelPositions) {
    add(detail, new THREE.TorusGeometry(.47, .065, 12, 28, Math.PI), paintDark, x, .48, z, 0, Math.PI / 2, Math.PI / 2);
    add(detail, new THREE.CylinderGeometry(.39, .39, .24, 28), rubber, x, .47, z, 0, 0, Math.PI / 2);
    add(detail, new THREE.TorusGeometry(.285, .065, 10, 28), trim, x, .47, z, 0, Math.PI / 2, 0);
    add(detail, new THREE.CylinderGeometry(.205, .205, .255, 24), chrome, x, .47, z, 0, 0, Math.PI / 2);
    add(detail, new THREE.CylinderGeometry(.11, .11, .265, 20), brake, x, .47, z, 0, 0, Math.PI / 2);
    add(detail, new THREE.CylinderGeometry(.07, .07, .275, 16), trim, x, .47, z, 0, 0, Math.PI / 2);
    for (let spoke = 0; spoke < 5; spoke++) add(detail, new THREE.BoxGeometry(.025, .16, .055), chrome, x, .47, z, 0, 0, spoke * Math.PI / 5);
  }

  add(detail, new THREE.BoxGeometry(1.72, .055, 3.62), rubber, 0, .27, 0);
  detail.traverse(o => { if (!o.isMesh) return; o.userData.coastlineHeroDetail = true; o.castShadow = true; o.receiveShadow = true; });
  group.userData.coastlineHeroVisuals = 'v2';
}

function looksLikePlayerCar(child) {
  const p = child?.geometry?.parameters; if (!p) return false;
  const w = Number(p.width), h = Number(p.height), d = Number(p.depth);
  return (Math.abs(w - 2.12) < .03 && Math.abs(h - .62) < .03 && Math.abs(d - 4.35) < .05) || (Math.abs(w - 2.05) < .03 && Math.abs(h - .62) < .03 && Math.abs(d - 4.35) < .05);
}

export function installVehicleVisualEnhancer() {
  if (globalThis[installed]) return;
  globalThis[installed] = true;
  const originalAdd = THREE.Group.prototype.add;
  THREE.Group.prototype.add = function (...objects) {
    const result = originalAdd.apply(this, objects);
    if (!this[enhanced] && objects.some(looksLikePlayerCar)) enhanceCar(this);
    return result;
  };
  globalThis.__coastlineHeroVehicleVisuals = { version: 2, enhanceCar };
}
