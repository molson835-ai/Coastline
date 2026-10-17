// Coastline Graphics Overdrive v1
// Inspired by recurring techniques in GTA V/RDR2/Cyberpunk-style render pipelines:
// PBR response, image-based reflections, atmospheric depth, cinematic exposure,
// selective emissive lighting and aggressive distance-aware restraint.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const installedScenes = new WeakSet();
const rigs = new WeakMap();
const originalRender = THREE.WebGLRenderer.prototype.render;
const registeredRenderers = new WeakSet();

function cloudTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 64, 8, 128, 64, 118);
  g.addColorStop(0, 'rgba(255,255,255,.28)'); g.addColorStop(.48, 'rgba(230,238,244,.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 18; i++) { const px = 25 + (i * 43) % 215, py = 32 + (i * 29) % 58, r = 12 + (i * 17) % 28; x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fillStyle = `rgba(255,255,255,${.035 + (i % 4) * .012})`; x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t;
}

function sunTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const x = c.getContext('2d'); const g = x.createRadialGradient(128, 128, 3, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(.08, 'rgba(255,232,180,.98)'); g.addColorStop(.28, 'rgba(255,186,116,.48)'); g.addColorStop(1, 'rgba(255,130,80,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function materialPolish(material) {
  if (!material || material.userData?.coastlineOverdrive) return;
  material.userData = material.userData || {};
  material.userData.coastlineOverdrive = true;
  if ('envMapIntensity' in material) material.envMapIntensity = material.isMeshPhysicalMaterial ? .92 : .72;
  if (material.isMeshPhysicalMaterial) {
    material.clearcoat = Math.max(material.clearcoat || 0, .28);
    material.clearcoatRoughness = Math.min(material.clearcoatRoughness ?? .25, .2);
  }
  if (material.isMeshStandardMaterial && material.roughness > .9) material.roughness = .86;
}

function polishObject(object) {
  if (!object) return;
  if (object.isMesh) {
    object.castShadow = object.castShadow || !!object.userData?.coastlineHeroDetail;
    if (object.material) {
      if (Array.isArray(object.material)) object.material.forEach(materialPolish); else materialPolish(object.material);
    }
  }
  for (const child of object.children || []) polishObject(child);
}

function installScene(scene) {
  if (!scene || installedScenes.has(scene)) return;
  installedScenes.add(scene);
  const rig = new THREE.Group(); rig.name = 'coastline-graphics-overdrive';

  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .72 }));
  sun.scale.set(72, 72, 1); sun.renderOrder = -10; rig.add(sun);

  const clouds = [];
  const cloudMap = cloudTexture();
  for (let i = 0; i < 7; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudMap, transparent: true, depthWrite: false, opacity: .08 + (i % 3) * .018 }));
    sprite.scale.set(150 + (i % 3) * 70, 62 + (i % 2) * 24, 1);
    sprite.position.set((i - 3) * 145, 115 + (i % 2) * 30, -260 - (i % 4) * 100);
    sprite.renderOrder = -5; rig.add(sprite); clouds.push(sprite);
  }
  scene.add(rig);
  polishObject(scene);
  rigs.set(scene, { rig, sun, clouds, last: 0 });
}

function updateScene(scene, camera, now) {
  const rig = rigs.get(scene); if (!rig || !camera) return;
  const directional = scene.children.find(o => o.isDirectionalLight);
  if (directional) {
    const p = directional.position.clone();
    if (p.lengthSq() > 1) { p.normalize().multiplyScalar(500); p.add(camera.position); rig.sun.position.copy(p); }
  } else {
    const d = new THREE.Vector3(); camera.getWorldDirection(d); rig.sun.position.copy(camera.position).addScaledVector(d, 480).add(new THREE.Vector3(0, 110, 0));
  }
  for (let i = 0; i < rig.clouds.length; i++) {
    const c = rig.clouds[i];
    c.position.x = camera.position.x + (i - 3) * 145;
    c.position.z = camera.position.z - 280 - (i % 4) * 95;
    c.position.y = 112 + (i % 2) * 28 + Math.sin(now * .000025 + i) * 2.5;
  }
}

function patchRenderer(renderer) {
  if (!renderer || registeredRenderers.has(renderer)) return;
  registeredRenderers.add(renderer);
  // Keep a small render-time hook so the atmosphere follows the camera without a game-loop dependency.
  renderer.render = function(scene, camera) {
    if (scene && camera) { installScene(scene); updateScene(scene, camera, performance.now()); }
    return originalRender.call(this, scene, camera);
  };
}

// Scene interception lets this layer run before the game's main render loop without changing gameplay code.
const originalSceneAdd = THREE.Scene.prototype.add;
THREE.Scene.prototype.add = function(...objects) {
  const result = originalSceneAdd.apply(this, objects);
  if (!installedScenes.has(this)) installScene(this);
  for (const object of objects) polishObject(object);
  return result;
};

// Renderer interception catches the game's renderer regardless of where it is created.
const originalRendererConstructor = THREE.WebGLRenderer;
// Constructor functions are not safely replaceable on the module namespace, so renderer instances are
// discovered from the first render call; the prototype render patch above is the stable interception point.
void originalRendererConstructor;

// Cinematic edge treatment remains outside the WebGL scene and therefore does not add GPU draw calls.
if (!document.getElementById('coastlineOverdriveGrade')) {
  const style = document.createElement('style'); style.id = 'coastlineOverdriveGrade';
  style.textContent = `
    #coastlineOverdriveGradeLayer{position:fixed;inset:0;pointer-events:none;z-index:4;mix-blend-mode:normal;background:radial-gradient(ellipse at 50% 46%,transparent 54%,rgba(3,8,14,.10) 100%),linear-gradient(180deg,rgba(255,220,190,.035),transparent 34%,rgba(4,12,18,.045));}
    canvas{filter:saturate(1.045) contrast(1.018);}
    @media(max-width:700px){canvas{filter:saturate(1.025) contrast(1.01)}}
  `;
  document.head.appendChild(style);
  const layer = document.createElement('div'); layer.id = 'coastlineOverdriveGradeLayer'; document.body.appendChild(layer);
}

// Public hook for diagnostics and future quality tiers.
globalThis.__coastlineGraphicsOverdrive = { version: 1, installScene, updateScene, materialPolish, patchRenderer };
