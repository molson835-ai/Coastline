/* Coastline Live World Director
 * Deterministic daily/weekly activity rotation. Local-first and safe: no remote code,
 * no network dependency, and no changes to the active world graph.
 */
export class CoastlineLiveOps {
  constructor({ getPlayer, getMode, getSpeed, getRegion, onNotice = () => {} }) {
    Object.assign(this, { getPlayer, getMode, getSpeed, getRegion, onNotice });
    this.completed = new Set();
    this.active = null;
    this.credits = 0;
    this.xp = 0;
    this.lastPosition = null;
    this.distance = 0;
    this.startedAt = 0;
    this.lastHudAt = 0;
    this.dayKey = this.getDayKey();
    this.events = this.makeRotation(this.dayKey);
    this.loadProgress();
    this.makeUI();
    this.bindKeys();
    this.onNotice('LIVE WORLD DIRECTOR ONLINE · FRESH ACTIVITIES ROTATE DAILY');
  }
  getDayKey() {
    const d = new Date();
    return d.getUTCFullYear() * 1000 + Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000);
  }
  loadProgress() {
    try {
      const raw = localStorage.getItem('coastline-live-ops-v1');
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || saved.version !== 1) return;
      this.credits = Number.isFinite(saved.credits) ? Math.max(0, Math.floor(saved.credits)) : 0;
      this.xp = Number.isFinite(saved.xp) ? Math.max(0, Math.floor(saved.xp)) : 0;
      this.completed = new Set(Array.isArray(saved.completed) ? saved.completed.filter(k => typeof k === 'string').slice(-500) : []);
    } catch (_) {
      // Private browsing or storage restrictions must never prevent the game from starting.
    }
  }
  saveProgress() {
    try {
      localStorage.setItem('coastline-live-ops-v1', JSON.stringify({
        version: 1,
        credits: this.credits,
        xp: this.xp,
        completed: Array.from(this.completed).slice(-500)
      }));
    } catch (_) {
      // Progress still works for the current session if storage is unavailable.
    }
  }
  makeRotation(day) {
    const catalog = [
      { id:'coastal-sprint', name:'Coastal Sprint', type:'distance', target:850, reward:450, xp:120, tag:'TIME TRIAL', description:'Cover ground quickly. Keep the route flowing and stay in control.' },
      { id:'smooth-operator', name:'Smooth Operator', type:'cruise', target:700, reward:380, xp:100, tag:'CLEAN DRIVE', description:'Complete a calm cruise without pushing into high speed.' },
      { id:'redline-window', name:'Redline Window', type:'speed', target:105, reward:520, xp:140, tag:'SPEED CHALLENGE', description:'Reach 105 on the speed readout to complete the burst.' },
      { id:'city-explorer', name:'City Explorer', type:'regions', target:3, reward:400, xp:110, tag:'DISCOVERY', description:'Visit three different districts on foot or behind the wheel.' },
      { id:'long-haul', name:'Long Haul', type:'distance', target:1250, reward:650, xp:180, tag:'ROAD TRIP', description:'Travel farther and discover how the city connects.' },
      { id:'ev-efficiency', name:'Efficiency Run', type:'cruise', target:950, reward:560, xp:160, tag:'ECO DRIVE', description:'Build distance while keeping your speed readout below 70.' },
      { id:'district-dash', name:'District Dash', type:'regions', target:4, reward:700, xp:200, tag:'CITY CIRCUIT', description:'Cross four districts in a single free-roam session.' },
      { id:'velocity-check', name:'Velocity Check', type:'speed', target:125, reward:750, xp:220, tag:'HIGH SPEED', description:'Reach a speed readout of 125. Find a long clear stretch.' }
    ];
    const seed = Math.abs(Number(day) || 1);
    const offset = seed % catalog.length;
    const ordered = catalog.slice(offset).concat(catalog.slice(0, offset));
    const picked = ordered.slice(0, 3).map((e, i) => ({ ...e, key: String(day) + '-' + e.id, slot: i + 1 }));
    return picked;
  }
  makeUI() {
    const style = document.createElement('style');
    style.textContent = `
      #coastLiveOps{position:fixed;z-index:18;left:12px;top:92px;width:min(360px,calc(100vw - 24px));max-height:68vh;overflow:auto;display:none;padding:14px;border:1px solid #f3c18c66;border-radius:14px;background:linear-gradient(145deg,#0b1b27f5,#10101af5);color:#f2f5f6;box-shadow:0 18px 60px #0009;backdrop-filter:blur(14px);font:12px/1.45 system-ui,sans-serif}
      #coastLiveOps.open{display:block}#coastLiveOps .lo-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px}
      #coastLiveOps .lo-title{font-size:14px;font-weight:900;letter-spacing:.13em}#coastLiveOps .lo-sub{color:#c4cdd3;font-size:10px;margin-bottom:10px}
      #coastLiveOps .lo-card{border:1px solid #ffffff20;border-radius:10px;padding:10px;margin:8px 0;background:#ffffff08}
      #coastLiveOps .lo-card h4{margin:0 0 4px;font-size:13px}#coastLiveOps .lo-card p{margin:0 0 8px;color:#c0ccd2;font-size:11px}
      #coastLiveOps .lo-tag{font-size:9px;letter-spacing:.12em;color:#efc18f;font-weight:800}
      #coastLiveOps button{background:#273a46;color:#fff;border:1px solid #ffffff35;border-radius:7px;padding:7px 10px;font-weight:800;cursor:pointer}
      #coastLiveOps .lo-start{background:#8d5b36;border-color:#e8bd8f66}#coastLiveOps .lo-stats{display:flex;gap:12px;color:#f1c18b;font-size:10px;margin:8px 0}
      #coastLiveHud{position:fixed;z-index:7;left:12px;bottom:14px;max-width:min(350px,calc(100vw - 24px));padding:9px 12px;border-radius:10px;background:#07131de8;border:1px solid #efbd8066;color:#fff;display:none;pointer-events:none;font:11px/1.4 system-ui,sans-serif;box-shadow:0 8px 28px #0006}
      #coastLiveHud strong{color:#f2c08a;letter-spacing:.08em}#coastLiveHud .lo-progress{height:4px;background:#ffffff22;border-radius:8px;overflow:hidden;margin-top:6px}#coastLiveHud .lo-progress i{display:block;height:100%;background:#efbd80;width:0}
      @media(max-width:700px){#coastLiveOps{top:70px;left:8px;width:calc(100vw - 44px)}#coastLiveHud{bottom:80px;left:8px}}
    `;
    document.head.appendChild(style);
    this.panel = document.createElement('section');
    this.panel.id = 'coastLiveOps';
    this.panel.innerHTML = '<div class="lo-head"><div class="lo-title">COASTLINE / LIVE WORLD</div><button id="loClose">CLOSE ✕</button></div><div class="lo-sub" id="loDay"></div><div class="lo-stats" id="loStats"></div><div id="loCards"></div><div class="lo-sub">Daily rotation is generated locally. Online events and remote content updates can be connected later.</div>';
    document.body.appendChild(this.panel);
    this.hud = document.createElement('div');
    this.hud.id = 'coastLiveHud';
    document.body.appendChild(this.hud);
    this.panel.querySelector('#loClose').addEventListener('click', () => this.toggle(false));
    this.render();
  }
  bindKeys() {
    addEventListener('keydown', e => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'KeyJ' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) {
        e.preventDefault(); this.toggle();
      }
    });
  }
  toggle(force) {
    const open = typeof force === 'boolean' ? force : !this.panel.classList.contains('open');
    this.panel.classList.toggle('open', open);
    if (open) this.render();
  }
  render() {
    if (!this.panel) return;
    this.panel.querySelector('#loDay').textContent = 'ROTATING ACTIVITIES · UTC DAY ' + this.dayKey + ' · PRESS J TO OPEN';
    this.panel.querySelector('#loStats').textContent = 'CREDITS  ' + this.credits + '     XP  ' + this.xp + '     COMPLETED  ' + this.completed.size;
    const cards = this.events.map(e => {
      const done = this.completed.has(e.key), active = this.active?.key === e.key;
      const goal = e.type === 'distance' ? e.target + ' m travelled' : e.type === 'cruise' ? e.target + ' m under speed 70' : e.type === 'speed' ? 'Reach speed ' + e.target : 'Visit ' + e.target + ' districts';
      return '<article class="lo-card"><div class="lo-tag">' + e.tag + (done ? ' · COMPLETE' : active ? ' · ACTIVE' : '') + '</div><h4>' + e.name + '</h4><p>' + e.description + '</p><div class="lo-sub">GOAL: ' + goal + ' · REWARD: ' + e.reward + ' CREDITS / ' + e.xp + ' XP</div><button class="lo-start" data-event="' + e.key + '" ' + (done || active ? 'disabled' : '') + '>' + (done ? 'COMPLETED' : active ? 'IN PROGRESS' : 'START ACTIVITY') + '</button></article>';
    }).join('');
    this.panel.querySelector('#loCards').innerHTML = cards;
    this.panel.querySelectorAll('[data-event]').forEach(btn => btn.addEventListener('click', () => this.start(btn.dataset.event)));
  }
  start(key) {
    const event = this.events.find(e => e.key === key);
    if (!event || this.completed.has(key)) return;
    this.active = { ...event, progress: 0, regions: new Set(), lastRegion: null, bestSpeed: 0 };
    this.distance = 0;
    const p = this.getPlayer?.();
    this.lastPosition = p ? { x:p.x, z:p.z } : null;
    this.startedAt = performance.now();
    this.hud.style.display = 'block';
    this.onNotice('ACTIVITY STARTED · ' + event.name);
    this.toggle(false);
    this.renderHud();
  }
  update() {
    const day = this.getDayKey();
    if (day !== this.dayKey) { this.dayKey = day; this.events = this.makeRotation(day); this.active = null; this.lastPosition = null; this.render(); }
    const event = this.active;
    if (!event) return;
    const p = this.getPlayer?.();
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.z)) return;
    const region = this.getRegion?.() || 'UNKNOWN';
    if (event.type === 'regions' && region !== event.lastRegion) { event.regions.add(region); event.lastRegion = region; event.progress = event.regions.size; }
    if (event.type === 'speed') {
      event.bestSpeed = Math.max(event.bestSpeed, Number(this.getSpeed?.()) || 0);
      event.progress = event.bestSpeed;
    } else {
      if (this.lastPosition) {
        const d = Math.hypot(p.x - this.lastPosition.x, p.z - this.lastPosition.z);
        if (d < 10) this.distance += d;
      }
      this.lastPosition = { x:p.x, z:p.z };
      if (event.type === 'distance') event.progress = this.distance;
      if (event.type === 'cruise' && (Number(this.getSpeed?.()) || 0) <= 70) event.progress = this.distance;
    }
    if (event.type === 'cruise' && (Number(this.getSpeed?.()) || 0) > 70) this.lastPosition = { x:p.x, z:p.z };
    if (event.progress >= event.target) this.complete();
    else if (performance.now() - this.lastHudAt > 200) { this.lastHudAt = performance.now(); this.renderHud(); }
  }
  complete() {
    const e = this.active;
    if (!e) return;
    this.completed.add(e.key); this.credits += e.reward; this.xp += e.xp;
    this.saveProgress();
    this.onNotice('ACTIVITY COMPLETE · +' + e.reward + ' CREDITS · +' + e.xp + ' XP');
    this.active = null; this.lastPosition = null; this.hud.style.display = 'none'; this.render();
  }
  renderHud() {
    const e = this.active;
    if (!e) return;
    const p = Math.min(100, Math.max(0, e.progress / e.target * 100));
    const current = e.type === 'speed' ? Math.round(e.progress) + ' / ' + e.target : Math.round(e.progress) + ' / ' + e.target;
    this.hud.innerHTML = '<strong>' + e.name.toUpperCase() + '</strong><div>' + current + (e.type === 'regions' ? ' DISTRICTS' : e.type === 'speed' ? ' SPEED' : ' METERS') + '</div><div class="lo-progress"><i style="width:' + p + '%"></i></div>';
  }
}
