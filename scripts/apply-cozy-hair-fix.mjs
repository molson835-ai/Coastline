import { readFile, writeFile } from 'node:fs/promises';

const interiorPath = 'coastline-homey-house-interior.js';
const regressionPath = 'tests/coastline-homey-quality-regressions.spec.mjs';

const newHair = `function applyWardrobeHair(THREE,actorRoot,appearance) {
  if(!actorRoot||!THREE)return;
  const old=actorRoot.getObjectByName('coastline-wardrobe-hair-overlay');
  if(old)disposeWardrobeOverlay(old);
  if(appearance.accessories.hat)return;
  const head=actorRoot.getObjectByName('head');if(!head?.add)return;
  // The Cozy export is a single skinned character with its original hair in the GLB.
  // Keep that authored hair when "original" is selected. Procedural styles are only
  // overlays, and their fit is calibrated from the actual head-weighted bounds of
  // assets/grab3d-cozy-character.glb (head radius ~= X .235 / Z .212 in head space).
  const hairStyle=appearance.hairStyle;
  if(hairStyle==='original')return;
  const group=new THREE.Group();group.name='coastline-wardrobe-hair-overlay';
  const material=new THREE.MeshStandardMaterial({color:appearance.hairColor,roughness:.87,metalness:0});
  const sphere=(name,x,y,z,sx,sy,sz)=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),material);mesh.name='coastline-wardrobe-hair-'+name;mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh};
  // These dimensions deliberately sit just outside the authored head shell. The old
  // .18 cap was smaller than the Cozy head (.235 X / .212 Z), so the scalp disappeared
  // behind the head mesh and long hair appeared to originate inside the skull/neck.
  const cap=()=>sphere('cap',0,.235,0,.245,.14,.222);
  if(hairStyle==='short'){
    cap();sphere('side-left',-.225,.115,0,.055,.15,.13);sphere('side-right',.225,.115,0,.055,.15,.13);
  }else if(hairStyle==='spiky'){
    cap();
    for(const [x,y,z,sx,sy,sz] of [[-.11,.34,0,.05,.12,.05],[-.035,.36,.02,.052,.14,.052],[.04,.34,0,.047,.12,.047],[.11,.32,-.015,.045,.1,.045],[0,.33,-.075,.048,.11,.048]]){
      const spike=new THREE.Mesh(new THREE.ConeGeometry(1,1.35,6),material);spike.name='coastline-wardrobe-hair-spike';spike.position.set(x,y,z);spike.scale.set(sx,sy,sz);spike.castShadow=true;group.add(spike);
    }
  }else if(hairStyle==='curly'){
    cap();for(let i=0;i<12;i++){const angle=i*Math.PI*2/12,radius=.205;sphere('curl',Math.cos(angle)*radius,.23+(i%3)*.012,Math.sin(angle)*radius,.055,.054,.055);}
  }else if(hairStyle==='bob'){
    cap();sphere('bob-left',-.225,.07,0,.055,.22,.135);sphere('bob-right',.225,.07,0,.055,.22,.135);sphere('bob-back',0,.04,-.195,.17,.15,.055);
  }else if(hairStyle==='long'){
    cap();sphere('long-left',-.225,.075,-.015,.06,.28,.12);sphere('long-right',.225,.075,-.015,.06,.28,.12);sphere('long-back',0,.075,-.205,.16,.28,.065);
  }else if(hairStyle==='ponytail'){
    cap();sphere('ponytail-tie',0,.24,-.22,.065,.065,.065);sphere('ponytail',0,.02,-.25,.065,.22,.075);sphere('ponytail-tip',0,-.15,-.26,.06,.075,.07);
  }else if(hairStyle==='bun'){
    cap();sphere('bun',0,.35,-.055,.095,.09,.095);sphere('bun-base',0,.28,-.04,.07,.05,.07);
  }
  head.add(group);actorRoot.userData.coastlineWardrobeHairStyle=appearance.hairStyle;
}
`;

const interior = await readFile(interiorPath, 'utf8');
const start = interior.indexOf('function applyWardrobeHair(');
const end = interior.indexOf('function applyWardrobeBodyProfile(', start);
if (start < 0 || end < 0) throw new Error('Unable to locate wardrobe hair function');
await writeFile(interiorPath, interior.slice(0, start) + newHair + interior.slice(end));

const regression = await readFile(regressionPath, 'utf8');
const regressionLines = regression.split('\n');
const updated = [];
for (const line of regressionLines) {
  if (line.includes('hairStyle=appearance\\.hairStyle')) {
    updated.push("  assert.match(interior, /const hairStyle=appearance\\.hairStyle;\\s*if\\(hairStyle==='original'\\)return;/, 'original GLB hair is preserved instead of replaced by a fallback overlay');");
  } else if (line.includes("sphere\\('cap'")) {
    updated.push("  assert.match(interior, /sphere\\('cap',0,\\.235,0,\\.245,\\.14,\\.222\\)/, 'procedural scalp overlay is sized to the Cozy head bounds');");
  } else if (line.includes("long-back'")) {
    updated.push("  assert.match(interior, /long-left',-\\.225,\\.075,-\\.015,\\.06,\\.28,\\.12/, 'long hair sides sit outside the head perimeter');");
    updated.push("  assert.match(interior, /long-back',0,\\.075,-\\.205,\\.16,\\.28,\\.065/, 'long hair back panel starts behind the head instead of inside the neck');");
  } else {
    updated.push(line);
  }
}
await writeFile(regressionPath, updated.join('\n'));

await writeFile('tests/coastline-cozy-hair-fit.spec.mjs', `import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url));

function parseGlb(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const length = view.getUint32(8, true);
  let offset = 12;
  let json = null;
  let bin = null;
  while (offset < length) {
    const chunkLength = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const data = buffer.subarray(offset + 8, offset + 8 + chunkLength);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(data));
    if (type === 0x004e4942) bin = data;
    offset += 8 + chunkLength;
  }
  return { json, bin };
}

function readAccessor(gltf, bin, index) {
  const accessor = gltf.accessors[index];
  const view = gltf.bufferViews[accessor.bufferView];
  const component = { 5126: ['f', 4], 5121: ['B', 1], 5123: ['H', 2] }[accessor.componentType];
  const count = accessor.type === 'VEC3' ? 3 : 4;
  const stride = view.byteStride || count * component[1];
  const base = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  const dataView = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const values = [];
  for (let i = 0; i < accessor.count; i++) {
    const row = [];
    for (let c = 0; c < count; c++) {
      const at = base + i * stride + c * component[1];
      row.push(component[0] === 'f' ? dataView.getFloat32(at, true) : component[0] === 'B' ? bin[at] : dataView.getUint16(at, true));
    }
    values.push(row);
  }
  return values;
}

test('Cozy hair fit uses the authored GLB head proportions and preserves original hair', async () => {
  const source = await read('coastline-homey-house-interior.js').then(b => b.toString('utf8'));
  const glb = parseGlb(await read('assets/grab3d-cozy-character.glb'));
  assert.ok(glb.json?.skins?.length === 1, 'Cozy asset should remain a single skinned character export');
  const joints = glb.json.skins[0].joints;
  const headNode = joints.find(j => glb.json.nodes[j]?.name === 'head');
  assert.ok(Number.isInteger(headNode), 'Cozy GLB must expose a head joint');
  const headIndex = joints.indexOf(headNode);
  const character = glb.json.meshes.find(mesh => mesh.name === 'character');
  const skinPrimitive = character.primitives.find(p => glb.json.materials[p.material]?.name === 'skin');
  const positions = readAccessor(glb.json, glb.bin, skinPrimitive.attributes.POSITION);
  const skinJoints = readAccessor(glb.json, glb.bin, skinPrimitive.attributes.JOINTS_0);
  const skinWeights = readAccessor(glb.json, glb.bin, skinPrimitive.attributes.WEIGHTS_0);
  const headVertices = positions.filter((_, i) => skinJoints[i].reduce((sum, joint, k) => sum + (joint === headIndex ? skinWeights[i][k] : 0), 0) >= 0.5);
  const xRadius = Math.max(...headVertices.map(v => Math.abs(v[0])));
  const zRadius = Math.max(...headVertices.map(v => Math.abs(v[2])));
  assert.ok(xRadius >= 0.23 && xRadius <= 0.24, `unexpected authored head X radius: ${xRadius}`);
  assert.ok(zRadius >= 0.21 && zRadius <= 0.22, `unexpected authored head Z radius: ${zRadius}`);

  assert.match(source, /const hairStyle=appearance\\.hairStyle;\\s*if\\(hairStyle==='original'\\)return;/, 'original GLB hair must not be replaced by procedural fallback');
  const cap = source.match(/sphere\\('cap',0,\\.235,0,(\\.\\d+),(\\.\\d+),(\\.\\d+)\\)/);
  assert.ok(cap, 'calibrated hair cap is missing');
  assert.ok(Number(cap[1]) > xRadius, 'hair cap must clear the authored head width');
  assert.ok(Number(cap[3]) > zRadius, 'hair cap must clear the authored head depth');
  assert.match(source, /long-left',-\\.225,\\.075,-\\.015,\\.06,\\.28,\\.12/);
  assert.match(source, /long-back',0,\\.075,-\\.205,\\.16,\\.28,\\.065/);
});
`);
