export function createRenderCuller({
  getPlayerPosition,
  entries,
  intervalMs = 200,
  hysteresis = 20
}) {
  if (typeof getPlayerPosition !== 'function') throw new TypeError('getPlayerPosition must be a function');
  if (!Array.isArray(entries) && typeof entries !== 'function') throw new TypeError('entries must be an array or function');

  const states = new Map();
  let lastUpdateAt = -Infinity;
  let updateCount = 0;
  let lastSnapshot = { updateCount, visibleDetail: 0, visibleProxy: 0, culled: 0, byKind: {} };

  function chooseTier(entry, distance, previousTier) {
    if (entry.alwaysVisible?.()) return entry.detailRoot ? 'detail' : (entry.proxyRoot ? 'proxy' : 'hidden');
    const detailDistance = Math.max(0, entry.detailDistance ?? entry.renderDistance ?? 0);
    const renderDistance = Math.max(detailDistance, entry.renderDistance ?? detailDistance);
    const hasProxy = !!entry.proxyRoot;

    if (previousTier === 'detail') {
      if (distance <= detailDistance + hysteresis) return 'detail';
      if (hasProxy && distance <= renderDistance + hysteresis) return 'proxy';
      return 'hidden';
    }
    if (previousTier === 'proxy') {
      if (distance < detailDistance - hysteresis) return 'detail';
      if (distance <= renderDistance + hysteresis) return 'proxy';
      return 'hidden';
    }
    if (distance < detailDistance - hysteresis) return 'detail';
    if (hasProxy && distance < renderDistance - hysteresis) return 'proxy';
    return 'hidden';
  }

  function update(now, force = false) {
    if (!force && now - lastUpdateAt < intervalMs) return lastSnapshot;
    lastUpdateAt = now;
    updateCount += 1;

    const player = getPlayerPosition() || { x: 0, z: 0 };
    const px = Number.isFinite(player.x) ? player.x : 0;
    const pz = Number.isFinite(player.z) ? player.z : 0;
    const counts = { visibleDetail: 0, visibleProxy: 0, culled: 0, byKind: {} };

    for (const entry of (typeof entries === 'function' ? entries() : entries)) {
      if (!entry?.detailRoot || !entry.id) continue;
      const pos = entry.getPosition?.() || entry.position || { x: 0, z: 0 };
      const x = Number.isFinite(pos.x) ? pos.x : 0;
      const z = Number.isFinite(pos.z) ? pos.z : 0;
      const distance = Math.hypot(x - px, z - pz);
      const tier = chooseTier(entry, distance, states.get(entry.id) || 'detail');
      states.set(entry.id, tier);
      entry.detailRoot.visible = tier === 'detail';
      if (entry.proxyRoot) entry.proxyRoot.visible = tier === 'proxy';

      const kind = entry.kind || 'other';
      counts.byKind[kind] ||= { detail: 0, proxy: 0, hidden: 0 };
      counts.byKind[kind][tier] += 1;
      if (tier === 'detail') counts.visibleDetail += 1;
      else if (tier === 'proxy') counts.visibleProxy += 1;
      else counts.culled += 1;
    }

    lastSnapshot = { updateCount, ...counts };
    return lastSnapshot;
  }

  function snapshot() {
    return { ...lastSnapshot, byKind: Object.fromEntries(Object.entries(lastSnapshot.byKind).map(([kind, counts]) => [kind, { ...counts }])) };
  }

  return { update, snapshot };
}
