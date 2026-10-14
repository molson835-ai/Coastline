// A first visible, causal NPC slice: a public-works technician repairs a traffic signal.
import { createNpcAgency } from './npc-agency-engine.js';
import { createSocialRumorEngine } from './social-rumor-engine.js';

export function createNpcWorldSlice({ THREE, scene, groundY, trafficSignalHeads, toast, getPlayer }) {
  const target = [...trafficSignalHeads].sort((a, b) => Math.hypot(a.x - 10.5, a.z - 10.5) - Math.hypot(b.x - 10.5, b.z - 10.5))[0];
  if (!target) return { update() {}, snapshot: () => ({ version: 1, available: false }) };

  const tx = target.x, tz = target.z;
  let savedState = null;
  try { savedState = JSON.parse(localStorage.getItem('coastline-npc-world-slice-v1') || 'null'); } catch {}
  const agency = createNpcAgency({
    seed: 'coastline-douglassville-public-works-v1',
    initialState: savedState?.agency ?? {},
    definitions: [{
      id: 'town-tech-01', name: 'Mara Ellis', role: 'publicWorks', arcId: 'signalOutage',
      x: tx, z: tz, home: 'northside', workplace: 'public-works-depot',
      traits: { conscientiousness: 0.91, sociability: 0.57, courage: 0.73 },
      needs: { purpose: 0.76, safety: 0.12, rest: 0.28, belonging: 0.34 }
    }]
  });

  const rumorEngine = createSocialRumorEngine({
    seed: 'coastline-main-street-rumors-v1',
    initialState: savedState?.rumors ?? {},
    people: [
      { id: 'town-tech-01', name: 'Mara Ellis', region: 'main-street', accuracy: 0.96, sociability: 0.66, ties: { 'diner-regular': 0.82, 'radio-dispatcher': 0.9, 'local-mechanic': 0.74 } },
      { id: 'diner-regular', name: 'Diner regular', region: 'main-street', accuracy: 0.57, sociability: 0.94, ties: { 'radio-dispatcher': 0.92, 'local-mechanic': 0.86 } },
      { id: 'radio-dispatcher', name: 'Radio dispatcher', region: 'main-street', accuracy: 0.99, sociability: 0.82, ties: { 'local-mechanic': 0.84 } },
      { id: 'local-mechanic', name: 'Local mechanic', region: 'main-street', accuracy: 0.7, sociability: 0.78 },
      { id: 'creek-resident', name: 'Creek-road resident', region: 'creek-road', accuracy: 0.63, sociability: 0.88 }
    ]
  });

  const materials = {
    hiVis: new THREE.MeshStandardMaterial({ color: 0xf0b92d, roughness: 0.84 }),
    navy: new THREE.MeshStandardMaterial({ color: 0x263747, roughness: 0.9 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xb97e5b, roughness: 0.92 }),
    helmet: new THREE.MeshStandardMaterial({ color: 0xf6c943, roughness: 0.62 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x65737b, metalness: 0.58, roughness: 0.4 }),
    van: new THREE.MeshStandardMaterial({ color: 0xe7e9e3, roughness: 0.7 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x176c9c, roughness: 0.62 }),
    tire: new THREE.MeshStandardMaterial({ color: 0x202428, roughness: 0.96 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x9dc8d2, roughness: 0.24, metalness: 0.12 }),
    tool: new THREE.MeshStandardMaterial({ color: 0x3b4145, metalness: 0.45, roughness: 0.56 })
  };
  const van = new THREE.Group();
  const vanBody = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.25, 4.25), materials.van);
  vanBody.position.y = 1.05; van.add(vanBody);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.12, 1.0, 1.35), materials.van);
  cab.position.set(0, 1.72, 1.12); van.add(cab);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.82, .58, .045), materials.glass);
  windshield.position.set(0, 1.78, 1.81); van.add(windshield);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.32, .2, 4.28), materials.blue);
  stripe.position.y = 1.13; van.add(stripe);
  for (const x of [-1.12, 1.12]) for (const z of [-1.35, 1.35]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.39, .39, .19, 12), materials.tire);
    wheel.rotation.z = Math.PI / 2; wheel.position.set(x, .42, z); van.add(wheel);
  }
  van.position.set(tx + 5.8, groundY(tx + 5.8, tz + 5.8), tz + 5.8);
  van.rotation.y = Math.PI * .25;
  scene.add(van);

  const worker = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(.48, .62, .3), materials.hiVis);
  torso.position.y = 1.32; worker.add(torso);
  const legs = [];
  for (const x of [-.14, .14]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(.15, .55, .17), materials.navy);
    leg.position.set(x, .55, 0); worker.add(leg); legs.push(leg);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(.19, 10, 8), materials.skin);
  head.position.y = 1.83; worker.add(head);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(.225, 10, 6), materials.helmet);
  helmet.scale.y = .5; helmet.position.y = 2.0; worker.add(helmet);
  const arm = new THREE.Group(); arm.position.set(.28, 1.52, 0);
  const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(.065, .34, 3, 6), materials.hiVis);
  upperArm.rotation.z = -.5; upperArm.position.set(.06, -.15, 0); arm.add(upperArm);
  const wrench = new THREE.Mesh(new THREE.BoxGeometry(.075, .55, .075), materials.tool);
  wrench.position.set(.1, -.43, .05); wrench.rotation.z = -.28; arm.add(wrench); worker.add(arm);
  worker.position.set(tx + 2.3, groundY(tx + 2.3, tz + 1.4), tz + 1.4);
  worker.rotation.y = Math.PI * .72; scene.add(worker);

  let phase = savedState?.phase === 'complete' ? 'complete' : 'idle', phaseStarted = 0, lastDecision = 0, toastShown = false;
  function persistStory() {
    try { localStorage.setItem('coastline-npc-world-slice-v1', JSON.stringify({ version: 1, phase, agency: agency.snapshot(), rumors: rumorEngine.snapshot() })); } catch {}
  }
  const start = time => {
    phase = 'repairing'; phaseStarted = time;
    agency.publishEvent({ type: 'signal_outage', targetNpc: 'town-tech-01', location: 'Main Street', time: time / 1000 });
    rumorEngine.observe({ topic: 'signalOutage', personId: 'town-tech-01', time: time / 1000, confidence: 0.95, evidence: 'direct', location: 'Main Street' });
    if (!toastShown) { toast('PUBLIC WORKS · Mara is responding to a signal fault on Main Street.'); toastShown = true; }
  };
  function setSignalFault(faulted) {
    for (const bulb of target.bulbs) bulb.mesh.visible = !faulted;
  }
  function update(dt, now) {
    if (!Number.isFinite(now)) return;
    const player = getPlayer?.();
    if (phase === 'idle' && player && Math.hypot(player.x - tx, player.z - tz) < 48) start(now);
    if (phase === 'repairing') {
      const elapsed = (now - phaseStarted) / 1000;
      const bob = Math.sin(now * .006) * .025;
      worker.position.y = groundY(worker.position.x, worker.position.z) + bob;
      arm.rotation.x = Math.sin(now * .007) * .12;
      arm.rotation.z = -.18 + Math.sin(now * .009) * .22;
      legs[0].rotation.x = Math.sin(now * .008) * .04;
      legs[1].rotation.x = -legs[0].rotation.x;
      setSignalFault(true);
      if (now - lastDecision > 2500) {
        lastDecision = now;
        const hour = (Math.floor(now / 60000) % 24);
        agency.step({ time: now / 1000, hour, deltaHours: .02, maxAgents: 1 });
      }
      if (elapsed > 13) {
        agency.publishEvent({ type: 'parts_arrived', targetNpc: 'town-tech-01', location: 'Main Street', time: now / 1000 });
        phase = 'complete';
        setSignalFault(false);
        for (let i = 0; i < 8; i++) rumorEngine.step({ time: now / 1000 + i * 31, maxTransfers: 4 });
        persistStory();
        const rumorState = rumorEngine.snapshot();
        const knownBy = rumorState.people.filter(person => person.knowledge.signalOutage).length;
        toast(knownBy > 1 ? 'MAIN STREET · Signal restored. Word is spreading through town—details may change as people retell it.' : 'MAIN STREET · Signal restored. Mara logs the repair and heads back to her route.');
      }
    } else if (phase === 'complete') {
      worker.rotation.y = Math.PI * .72 + Math.sin(now * .001) * .035;
      worker.position.y = groundY(worker.position.x, worker.position.z) + Math.sin(now * .003) * .018;
      if (now - lastDecision > 12000) {
        lastDecision = now;
        agency.step({ time: now / 1000, hour: Math.floor(now / 60000) % 24, deltaHours: .08, maxAgents: 1 });
      }
    }
  }
  return Object.freeze({
    update,
    snapshot: () => ({ version: 1, phase, phaseStarted, target: { x: tx, z: tz }, agency: agency.snapshot(), rumors: rumorEngine.snapshot(), npc: agency.agent('town-tech-01') })
  });
}
