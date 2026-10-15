/* Coastline AI Runtime — deterministic, budgeted, browser-native.
 * The runtime observes and repairs safe invariants; it never executes generated code.
 * Procedural expansion is represented as validated world plans until a build pipeline
 * can test and promote them without disrupting the active player session.
 */
export class CoastlineAIRuntime {
  constructor({ THREE, scene, renderer, camera, getPlayer, getMode, getTraffic, getNPCs }) {
    Object.assign(this, { THREE, scene, renderer, camera, getPlayer, getMode, getTraffic, getNPCs });
    this.startedAt = performance.now();
    this.lastHealthAt = 0;
    this.lastPerfAt = performance.now();
    this.frameTimes = [];
    this.fps = 0;
    this.frameMs = 0;
    this.events = [];
    this.counts = { repairs: 0, warnings: 0, checks: 0 };
    this.stage = 'RUNTIME ONLINE';
    this.enabled = true;
    this.panel = null;
    this.keys = new Set();
    this.lastTraffic = new WeakMap();
    this.worldPlans = [];
    this.buildId = 'AI-RUNTIME-0.2.0';
    this.worker = null;
    this.workerSeq = 0;
    this.lastWorkerAt = 0;
    this.workerStatus = 'STARTING';
    this.budget = { aiHz: 8, maxActiveNPCs: 48, maxTrafficUpdates: 28, worldBuildsPerTick: 1, quality: 'BALANCED' };
    this.lastWorkerSummary = { cells: 0, near: 0, mid: 0, far: 0, traffic: 0 };
    this.startWorker();
    this.makePanel();
    this.bindKeys();
    this.log('info', 'AI runtime online; safe checks enabled.');
  }
  startWorker() {
    if (typeof Worker === 'undefined') { this.workerStatus = 'FALLBACK'; this.log('warn', 'Web Worker unavailable; using local diagnostics.'); return; }
    try {
      this.worker = new Worker(new URL('./coastline-ai-worker.js', import.meta.url), { type: 'module' });
      this.worker.onmessage = e => {
        const result = e.data || {};
        if (result.type === 'COASTLINE_AI_ERROR') { this.workerStatus = 'ERROR'; this.log('error', 'AI worker tick failed', result.message); return; }
        if (result.type !== 'COASTLINE_AI_TICK_RESULT') return;
        this.workerStatus = 'ONLINE';
        this.budget = result.budget || this.budget;
        this.lastWorkerSummary = result.summary || this.lastWorkerSummary;
        const known = new Set(this.worldPlans.map(p => p.key));
        for (const cell of result.cells || []) {
          if (!known.has(cell.key) && this.worldPlans.length < 48) {
            this.worldPlans.push({ ...cell, status: 'PLANNED' });
            known.add(cell.key);
          }
        }
        if (this.panel?.classList.contains('open')) this.renderPanel();
      };
      this.worker.onerror = e => { this.workerStatus = 'ERROR'; this.log('error', 'AI worker unavailable', e.message || 'worker error'); };
    } catch (e) {
      this.workerStatus = 'FALLBACK';
      this.log('warn', 'AI worker could not start; local runtime remains active.', e.message);
    }
  }
  sendWorkerTick(now) {
    if (!this.worker || now - this.lastWorkerAt < 1000) return;
    this.lastWorkerAt = now;
    const raw = this.getPlayer?.();
    const p = raw?.position || raw || { x: 0, z: 0 };
    const traffic = (this.getTraffic?.() || []).slice(0, 200).map((entry, i) => {
      const obj = entry?.group || entry;
      return { id: i, x: obj?.position?.x || 0, z: obj?.position?.z || 0, stalled: (entry?.stallTicks || 0) >= 4 };
    });
    try {
      this.worker.postMessage({ type: 'TICK', seq: ++this.workerSeq, player: { x: p.x || 0, z: p.z || 0 }, fps: this.fps || 60, traffic });
    } catch (e) { this.log('warn', 'Could not send simulation snapshot to AI worker.', e.message); }
  }
  makePanel() {
    const style = document.createElement('style');
    style.textContent = `
      #coastAI{position:fixed;z-index:80;top:12px;right:12px;width:min(390px,calc(100vw - 24px));max-height:75vh;overflow:auto;
      display:none;background:rgba(5,12,20,.94);color:#d9f4ff;border:1px solid rgba(117,205,255,.42);border-radius:10px;
      padding:12px;font:12px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;box-shadow:0 12px 50px #0009;backdrop-filter:blur(12px)}
      #coastAI.open{display:block}#coastAI .aihead{display:flex;justify-content:space-between;align-items:center;font-weight:800;letter-spacing:.12em;color:#8be4ff}
      #coastAI .aigrid{display:grid;grid-template-columns:1fr auto;gap:3px 12px;margin:10px 0}
      #coastAI .aival{color:#fff;text-align:right}#coastAI .aibar{height:4px;background:#1b2b39;border-radius:8px;overflow:hidden;margin:8px 0}
      #coastAI .aibar i{display:block;height:100%;width:0;background:#58d9ff}#coastAI .ailog{white-space:pre-wrap;color:#b7c6d4;max-height:150px;overflow:auto}
      #coastAI button{background:#172a3a;color:#e8f9ff;border:1px solid #3b647d;border-radius:5px;padding:6px 9px;margin:3px 4px 3px 0}
      #coastAI .aihint{color:#8fa9bb;font-size:10px}
    `;
    document.head.appendChild(style);
    const el = document.createElement('section');
    el.id = 'coastAI';
    el.innerHTML = '<div class="aihead"><span>COASTLINE // AI OPS</span><span id="coastAIState">ONLINE</span></div><div class="aibar"><i id="coastAIBar"></i></div><div class="aigrid" id="coastAIGrid"></div><div><button id="coastAICopy">COPY DIAGNOSTICS</button><button id="coastAIReset">CLEAR LOG</button></div><div class="ailog" id="coastAILog"></div><div class="aihint">F3 or ~ toggles this panel. Runtime recovery is limited to validated safe actions.</div>';
    document.body.appendChild(el);
    this.panel = el;
    el.querySelector('#coastAICopy').addEventListener('click', () => {
      const text = this.report();
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => this.log('info', 'Diagnostics copied.')).catch(() => this.downloadReport(text));
      else this.downloadReport(text);
    });
    el.querySelector('#coastAIReset').addEventListener('click', () => { this.events.length = 0; this.renderPanel(); });
  }
  bindKeys() {
    addEventListener('keydown', e => {
      if (e.repeat) return;
      if (e.key === 'F3' || e.key === '~' || e.code === 'Backquote') {
        e.preventDefault(); this.panel.classList.toggle('open'); this.renderPanel();
      }
    });
  }
  downloadReport(text) {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'coastline-diagnostics.txt'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  log(level, message, detail = '') {
    this.events.unshift({ time: new Date().toISOString(), level, message, detail: String(detail).slice(0, 240) });
    this.events.length = Math.min(this.events.length, 30);
    if (level === 'warn' || level === 'error') this.counts.warnings++;
    if (this.panel?.classList.contains('open')) this.renderPanel();
  }
  update(dt, now = performance.now()) {
    if (!this.enabled) return;
    this.frameTimes.push(dt * 1000);
    if (this.frameTimes.length > 90) this.frameTimes.shift();
    if (now - this.lastPerfAt >= 1000) {
      const avg = this.frameTimes.reduce((a, b) => a + b, 0) / Math.max(1, this.frameTimes.length);
      this.frameMs = avg;
      this.fps = avg > 0 ? 1000 / avg : 0;
      this.lastPerfAt = now;
    }
    if (now - this.lastHealthAt >= 1500) {
      this.lastHealthAt = now;
      this.healthSweep();
      this.inspectTraffic();
      this.sendWorkerTick(now);
      this.planWorldGrowth();
      this.renderPanel();
    }
  }
  finiteVector(v) { return !!v && Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z); }
  repairTransform(obj, label) {
    if (!obj || !this.finiteVector(obj.position)) return false;
    if (!this.finiteVector(obj.rotation) || !this.finiteVector(obj.scale)) {
      obj.rotation.set(0, 0, 0); obj.scale.set(1, 1, 1);
      this.counts.repairs++; this.log('warn', 'Repaired invalid transform', label); return true;
    }
    if (Math.abs(obj.position.x) > 10000 || Math.abs(obj.position.z) > 10000 || Math.abs(obj.position.y) > 10000) {
      obj.position.set(0, 3.2, 160);
      this.counts.repairs++; this.log('warn', 'Repositioned out-of-bounds entity', label); return true;
    }
    return false;
  }
  healthSweep() {
    this.counts.checks++;
    const player = this.getPlayer?.();
    if (player) this.repairTransform(player, 'player');
    let inspected = 0;
    this.scene.traverse(obj => {
      if (inspected >= 650) return;
      if (obj.isMesh || obj.isGroup) {
        inspected++;
        if (!this.finiteVector(obj.position) || !this.finiteVector(obj.scale) || !this.finiteVector(obj.rotation)) {
          // A broken child transform is hidden instead of propagating invalid matrices to the renderer.
          obj.visible = false;
          this.counts.repairs++;
          this.log('error', 'Hid object with non-finite transform', obj.name || obj.type || 'unnamed');
        } else if (Math.abs(obj.position.x) > 10000 || Math.abs(obj.position.z) > 10000 || Math.abs(obj.position.y) > 10000) {
          obj.visible = false;
          this.counts.repairs++;
          this.log('warn', 'Hid out-of-bounds object', obj.name || obj.type || 'unnamed');
        }
      }
    });
    const gl = this.renderer?.getContext?.();
    if (gl && gl.isContextLost?.()) this.log('error', 'WebGL context lost', 'Reload may be required by the browser.');
    if (this.fps > 0 && this.fps < 22) this.log('warn', 'Low frame rate detected', Math.round(this.fps) + ' FPS average');
  }
  inspectTraffic() {
    const fleet = this.getTraffic?.() || [];
    for (const entry of fleet) {
      const obj = entry?.group || entry;
      if (!obj?.position) continue;
      const old = this.lastTraffic.get(obj);
      if (old) {
        const dx = obj.position.x - old.x, dz = obj.position.z - old.z;
        const moved = Math.hypot(dx, dz);
        if (moved < 0.015 && Math.abs(entry.speed || 0) > 0.5) {
          entry.stallTicks = (entry.stallTicks || 0) + 1;
          if (entry.stallTicks === 4) this.log('warn', 'Traffic vehicle may be stalled', obj.name || 'traffic vehicle');
        } else entry.stallTicks = 0;
      }
      this.lastTraffic.set(obj, { x: obj.position.x, z: obj.position.z });
    }
  }
  planWorldGrowth() {
    // Queue bounded, seedable expansion intents; actual geometry is only promoted by a validator.
    // Keeping plans separate from live scene mutation prevents half-built districts entering gameplay.
    const player = this.getPlayer?.();
    if (!player) return;
    const gx = Math.round(player.position.x / 400), gz = Math.round(player.position.z / 400);
    const key = gx + ':' + gz;
    if (!this.worldPlans.some(p => p.key === key) && this.worldPlans.length < 48) {
      const seed = ((gx * 73856093) ^ (gz * 19349663) ^ 0xC0A57) >>> 0;
      this.worldPlans.push({ key, seed, district: this.districtType(seed), status: 'PLANNED', x: gx * 400, z: gz * 400 });
      this.log('info', 'World director planned district cell', key + ' · ' + this.worldPlans[this.worldPlans.length - 1].district);
    }
  }
  districtType(seed) {
    return ['WATERFRONT', 'DOWNTOWN', 'RESIDENTIAL', 'INDUSTRIAL', 'PARKLAND', 'RETAIL'][seed % 6];
  }
  npcCount() { const value = this.getNPCs?.(); return Array.isArray(value) ? value.length : (Number(value) || 0); }
  report() {
    const info = this.renderer?.getContext?.();
    let gpu = 'unavailable';
    try { gpu = info?.getParameter(info.RENDERER) || 'browser-managed'; } catch {}
    return JSON.stringify({
      build: this.buildId, stage: this.stage, workerStatus: this.workerStatus, adaptiveBudget: this.budget, worldSummary: this.lastWorkerSummary, uptimeSeconds: Math.round((performance.now() - this.startedAt) / 1000),
      fps: Math.round(this.fps), averageFrameMs: Math.round(this.frameMs * 10) / 10,
      mode: this.getMode?.() || 'unknown', traffic: (this.getTraffic?.() || []).length,
      npcCount: this.npcCount(), sceneChildren: this.scene?.children?.length || 0,
      districtPlans: this.worldPlans, repairs: this.counts.repairs, warnings: this.counts.warnings,
      checks: this.counts.checks, webglContextLost: !!info?.isContextLost?.(), renderer: gpu,
      recentEvents: this.events.slice(0, 20)
    }, null, 2);
  }
  renderPanel() {
    if (!this.panel) return;
    const player = this.getPlayer?.();
    const rows = [
      ['BUILD', this.buildId], ['RUNTIME', this.stage], ['AI WORKER', this.workerStatus], ['QUALITY BUDGET', this.budget.quality], ['AI TICK TARGET', this.budget.aiHz + ' Hz'], ['DISTRICT CELLS', this.lastWorkerSummary.cells], ['FPS', this.fps ? Math.round(this.fps) : 'sampling…'],
      ['FRAME', this.frameMs ? this.frameMs.toFixed(1) + ' ms' : 'sampling…'],
      ['MODE', this.getMode?.() || 'unknown'], ['TRAFFIC', (this.getTraffic?.() || []).length],
      ['NPCs', this.npcCount()], ['DISTRICT PLANS', this.worldPlans.length],
      ['HEALTH CHECKS', this.counts.checks], ['SAFE REPAIRS', this.counts.repairs], ['WARNINGS', this.counts.warnings],
      ['PLAYER', player && this.finiteVector(player.position) ? [player.position.x, player.position.y, player.position.z].map(n => n.toFixed(1)).join(', ') : 'unavailable']
    ];
    this.panel.querySelector('#coastAIGrid').innerHTML = rows.map(([k,v]) => '<span>' + k + '</span><span class="aival">' + String(v).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])) + '</span>').join('');
    this.panel.querySelector('#coastAIBar').style.width = Math.min(100, this.fps / 60 * 100) + '%';
    this.panel.querySelector('#coastAIState').textContent = this.fps && this.fps < 22 ? 'THROTTLE NEEDED' : 'ONLINE';
    this.panel.querySelector('#coastAILog').textContent = this.events.slice(0, 12).map(e => '[' + e.level.toUpperCase() + '] ' + e.message + (e.detail ? ' — ' + e.detail : '')).join('\n') || 'No runtime events yet.';
  }
}
