const TEXTURE_SLOTS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap', 'aoMap', 'displacementMap', 'envMap', 'lightMap', 'bumpMap'];

function visit(root, callback) {
  if (!root) return;
  if (typeof root.traverse === 'function') {
    root.traverse(callback);
    return;
  }
  const stack = [root];
  while (stack.length) {
    const object = stack.pop();
    callback(object);
    if (Array.isArray(object?.children)) stack.push(...object.children);
  }
}

function effectivelyVisible(object, stopAt) {
  for (let current = object; current; current = current.parent) {
    if (current.visible === false) return false;
    if (current === stopAt) return true;
  }
  return false;
}

function materialsOf(material) {
  return Array.isArray(material) ? material.filter(Boolean) : material ? [material] : [];
}

function textureIsUnloaded(texture) {
  if (!texture) return false;
  const image = texture.image ?? texture.source?.data;
  if (!image) return true;
  if (image.complete === false) return true;
  if (image.complete === true && 'naturalWidth' in image && image.naturalWidth === 0) return true;
  if ('width' in image && image.width === 0) return true;
  if ('height' in image && image.height === 0) return true;
  return false;
}

function check(id, label, status, detail) {
  return { id, label, status, detail };
}

export function createCoastlineWorldHealth({
  scene,
  worldRoot,
  renderer,
  camera,
  worldModel = null,
  eventTarget = null,
  assetFailures: initialAssetFailures = [],
  minimums = {},
} = {}) {
  const assetFailures = [...initialAssetFailures];
  const limits = {
    roads: Number.isFinite(minimums.roads) ? minimums.roads : 1,
    buildings: Number.isFinite(minimums.buildings) ? minimums.buildings : 1,
    terrain: Number.isFinite(minimums.terrain) ? minimums.terrain : 1,
  };

  const onResourceError = event => {
    const target = event?.target;
    const url = target?.currentSrc || target?.src || target?.href;
    if (!url) return;
    const tag = String(target?.tagName || '').toLowerCase();
    if (!['img', 'script', 'link', 'audio', 'video', 'source'].includes(tag)) return;
    if (assetFailures.some(item => item.url === url)) return;
    assetFailures.push({ url: String(url), tag, message: 'Resource load error' });
  };
  eventTarget?.addEventListener?.('error', onResourceError, true);

  function scan() {
    const objects = [];
    visit(worldRoot, object => objects.push(object));
    const meshes = objects.filter(object => object?.isMesh || object?.isInstancedMesh);
    const visibleMeshes = meshes.filter(object => effectivelyVisible(object, worldRoot));
    const taggedCount = (tag, visibleOnly = false) => objects.filter(object =>
      object?.userData?.[tag] && (!visibleOnly || effectivelyVisible(object, worldRoot))
    ).length;

    const roads = taggedCount('coastlineRoadLayer');
    const visibleRoads = taggedCount('coastlineRoadLayer', true);
    const buildings = taggedCount('coastlineBuilding');
    const visibleBuildings = taggedCount('coastlineBuilding', true);
    const terrain = taggedCount('coastlineTerrainLayer');
    const visibleTerrain = taggedCount('coastlineTerrainLayer', true);

    let materialCount = 0;
    let missingMaterialCount = 0;
    let textureCount = 0;
    let unloadedTextureCount = 0;
    for (const mesh of meshes) {
      const materials = materialsOf(mesh.material);
      if (!materials.length) missingMaterialCount += 1;
      for (const material of materials) {
        materialCount += 1;
        for (const slot of TEXTURE_SLOTS) {
          const texture = material?.[slot];
          if (!texture) continue;
          textureCount += 1;
          if (textureIsUnloaded(texture)) unloadedTextureCount += 1;
        }
      }
    }

    const rootAttached = Boolean(scene && worldRoot && worldRoot.parent === scene);
    const rootVisible = Boolean(worldRoot && worldRoot.visible !== false);
    let webglContext = null;
    let contextAvailable = false;
    let contextLost = false;
    try {
      webglContext = renderer?.getContext?.() || null;
      contextAvailable = Boolean(webglContext);
      contextLost = Boolean(webglContext?.isContextLost?.());
    } catch {
      contextAvailable = false;
    }

    const cameraValid = Boolean(
      camera &&
      Number.isFinite(camera.near) && camera.near > 0 &&
      Number.isFinite(camera.far) && camera.far > camera.near &&
      Number.isFinite(camera.position?.x) &&
      Number.isFinite(camera.position?.y) &&
      Number.isFinite(camera.position?.z)
    );

    let lightCount = 0;
    if (scene) visit(scene, object => { if (object?.isLight) lightCount += 1; });
    const checks = [
      check('city-root', 'City root attached and visible',
        rootAttached && rootVisible ? 'healthy' : 'failed',
        { attachedToScene: rootAttached, visible: rootVisible }),
      check('roads', 'Road geometry',
        roads >= limits.roads && visibleRoads > 0 ? 'healthy' : 'failed',
        { total: roads, visible: visibleRoads, minimum: limits.roads }),
      check('buildings', 'Building geometry',
        buildings >= limits.buildings && visibleBuildings > 0 ? 'healthy' : 'failed',
        { total: buildings, visible: visibleBuildings, minimum: limits.buildings }),
      check('terrain', 'Terrain geometry',
        terrain >= limits.terrain && visibleTerrain > 0 ? 'healthy' : 'failed',
        { total: terrain, visible: visibleTerrain, minimum: limits.terrain }),
      check('webgl-context', 'WebGL context',
        contextAvailable && !contextLost ? 'healthy' : 'failed',
        { available: contextAvailable, lost: contextLost }),
      check('renderer-canvas', 'Renderer canvas',
        renderer?.domElement && renderer.domElement.isConnected !== false ? 'healthy' : 'failed',
        { present: Boolean(renderer?.domElement), connected: renderer?.domElement?.isConnected ?? null }),
      check('camera', 'Camera projection and position',
        cameraValid ? 'healthy' : 'failed',
        camera ? { near: camera.near, far: camera.far, position: camera.position } : null),
      check('lighting', 'Scene lighting',
        lightCount > 0 ? 'healthy' : 'warning', { lights: lightCount }),
      check('materials', 'Mesh materials',
        missingMaterialCount === 0 ? 'healthy' : 'warning',
        { meshes: meshes.length, materials: materialCount, meshesWithoutMaterial: missingMaterialCount }),
      check('textures', 'Material textures',
        unloadedTextureCount === 0 ? 'healthy' : 'warning',
        { referenced: textureCount, unloaded: unloadedTextureCount }),
      check('asset-requests', 'Asset request failures',
        assetFailures.length === 0 ? 'healthy' : 'warning',
        { failures: assetFailures.length }),
    ];

    const failed = checks.filter(item => item.status === 'failed').length;
    const warnings = checks.filter(item => item.status === 'warning').length;
    const renderInfo = renderer?.info || {};
    const report = {
      schema: 'coastline-world-health/v1',
      capturedAt: new Date().toISOString(),
      status: failed ? 'failed' : warnings ? 'degraded' : 'healthy',
      summary: { passed: checks.filter(item => item.status === 'healthy').length, warnings, failed },
      world: {
        id: worldRoot?.name || 'unknown',
        attachedToScene: rootAttached,
        visible: rootVisible,
        objects: objects.length,
        meshes: meshes.length,
        visibleMeshes: visibleMeshes.length,
        roads, visibleRoads,
        buildings, visibleBuildings,
        terrain, visibleTerrain,
        modelCitySize: worldModel?.citySize ?? null,
      },
      renderer: {
        canvasPresent: Boolean(renderer?.domElement),
        canvasConnected: renderer?.domElement?.isConnected ?? null,
        contextAvailable,
        contextLost,
        outputColorSpace: renderer?.outputColorSpace ?? null,
        toneMapping: renderer?.toneMapping ?? null,
        pixelRatio: renderer?.getPixelRatio?.() ?? null,
        shadowMapEnabled: renderer?.shadowMap?.enabled ?? null,
        drawCalls: renderInfo.render?.calls ?? null,
        triangles: renderInfo.render?.triangles ?? null,
        geometries: renderInfo.memory?.geometries ?? null,
        textures: renderInfo.memory?.textures ?? null,
      },
      camera: {
        valid: cameraValid,
        near: camera?.near ?? null,
        far: camera?.far ?? null,
        position: camera?.position ? {
          x: camera.position.x, y: camera.position.y, z: camera.position.z,
        } : null,
      },
      materials: { count: materialCount, meshesWithoutMaterial: missingMaterialCount, textures: textureCount, unloadedTextures: unloadedTextureCount },
      assets: { failures: assetFailures.slice() },
      checks,
    };
    return report;
  }

  function report() {
    const snapshot = scan();
    return JSON.stringify(snapshot, null, 2);
  }

  function mountPanel(documentRef = globalThis.document) {
    if (!documentRef?.createElement || documentRef.getElementById('coastline-world-health-panel')) return null;
    const panel = documentRef.createElement('details');
    panel.id = 'coastline-world-health-panel';
    panel.style.cssText = 'position:fixed;z-index:100000;top:8px;right:8px;max-width:min(390px,calc(100vw - 16px));max-height:65vh;overflow:auto;padding:8px 10px;border:1px solid #75d8e6;border-radius:8px;background:rgba(4,17,25,.94);color:#e8fbff;font:12px/1.4 ui-monospace,monospace;box-shadow:0 4px 20px #0008';
    const summary = documentRef.createElement('summary');
    summary.textContent = 'Coastline World Health — run scan';
    summary.style.cssText = 'cursor:pointer;font-weight:700';
    const refresh = documentRef.createElement('button');
    refresh.type = 'button';
    refresh.textContent = 'Rescan';
    refresh.style.cssText = 'margin:8px 0;padding:5px 9px;border:1px solid #75d8e6;border-radius:5px;background:#123441;color:#fff';
    const output = documentRef.createElement('pre');
    output.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;margin:0;font:inherit';
    const update = () => {
      const snapshot = scan();
      summary.textContent = `Coastline World Health — ${snapshot.status.toUpperCase()} (${snapshot.summary.failed} failed, ${snapshot.summary.warnings} warnings)`;
      output.textContent = JSON.stringify(snapshot, null, 2);
    };
    refresh.addEventListener('click', update);
    panel.append(summary, refresh, output);
    documentRef.body?.append(panel);
    update();
    return panel;
  }

  return { scan, report, mountPanel, dispose() { eventTarget?.removeEventListener?.('error', onResourceError, true); } };
}

export function installCoastlineWorldHealth(options = {}) {
  const targetWindow = options.windowRef || globalThis.window;
  if (!targetWindow) return null;
  const health = createCoastlineWorldHealth({ ...options, eventTarget: options.eventTarget || targetWindow });
  targetWindow.__coastlineWorldHealth = health;
  targetWindow.__coastlineWorldHealthSnapshot = health.scan();
  if (new URLSearchParams(targetWindow.location?.search || '').get('worldHealth') === '1') {
    health.mountPanel(targetWindow.document);
  }
  return health;
}
