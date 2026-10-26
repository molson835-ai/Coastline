import { readFile } from 'node:fs/promises';
import { inflateRawSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const zipPath = 'assets/Free Low Poly Vehicles Pack by Rgsdev.zip';
const characterPath = 'assets/grab3d-cozy-character.glb';
const archive = await readFile(path.join(root, zipPath));
let eocd = -1;
for (let i = archive.length - 22; i >= Math.max(0, archive.length - 65557); i--) {
  if (archive.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
}
if (eocd < 0) throw new Error('Vehicle pack ZIP end-of-central-directory record was not found.');
const count = archive.readUInt16LE(eocd + 10);
const centralOffset = archive.readUInt32LE(eocd + 16);
const entries = [];
let offset = centralOffset;
for (let i = 0; i < count; i++) {
  if (archive.readUInt32LE(offset) !== 0x02014b50) throw new Error('Invalid ZIP central directory entry at ' + offset);
  const method = archive.readUInt16LE(offset + 10);
  const compressedSize = archive.readUInt32LE(offset + 20);
  const uncompressedSize = archive.readUInt32LE(offset + 24);
  const nameLength = archive.readUInt16LE(offset + 28);
  const extraLength = archive.readUInt16LE(offset + 30);
  const commentLength = archive.readUInt16LE(offset + 32);
  const localOffset = archive.readUInt32LE(offset + 42);
  const name = archive.toString('utf8', offset + 46, offset + 46 + nameLength);
  entries.push({ name, method, compressedSize, uncompressedSize, localOffset });
  offset += 46 + nameLength + extraLength + commentLength;
}
const readEntry = entry => {
  const local = entry.localOffset;
  if (archive.readUInt32LE(local) !== 0x04034b50) throw new Error('Invalid local ZIP header: ' + entry.name);
  const nameLength = archive.readUInt16LE(local + 26);
  const extraLength = archive.readUInt16LE(local + 28);
  const start = local + 30 + nameLength + extraLength;
  const data = archive.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return data;
  if (entry.method === 8) return inflateRawSync(data);
  throw new Error('Unsupported ZIP compression method ' + entry.method + ' for ' + entry.name);
};
const models = entries.filter(e => /\.(glb|gltf|fbx|obj|blend)$/i.test(e.name));
const licenses = entries.filter(e => /(license|licence|readme|attribution|credits|copyright|terms)/i.test(e.name));
const licenseTexts = licenses.filter(e => /\.(txt|md|json|html)$/i.test(e.name)).map(e => ({ name:e.name, text:readEntry(e).toString('utf8') }));
const glbDetails = [];
for (const entry of entries.filter(e => /\.glb$/i.test(e.name))) {
  const bytes = readEntry(entry);
  if (bytes.length < 20 || bytes.toString('ascii',0,4) !== 'glTF') {
    glbDetails.push({ name:entry.name, valid:false, error:'Invalid GLB header' }); continue;
  }
  const jsonLength = bytes.readUInt32LE(12);
  if (bytes.toString('ascii',16,20) !== 'JSON' || 20 + jsonLength > bytes.length) {
    glbDetails.push({ name:entry.name, valid:false, error:'Invalid GLB JSON chunk' }); continue;
  }
  try {
    const gltf = JSON.parse(bytes.toString('utf8',20,20+jsonLength).trim());
    glbDetails.push({ name:entry.name,valid:true,bytes:bytes.length,meshes:gltf.meshes?.length??0,nodes:gltf.nodes?.length??0,skins:gltf.skins?.length??0,animations:(gltf.animations??[]).map(a=>a.name||'(unnamed)'),materials:gltf.materials?.length??0 });
  } catch(error) { glbDetails.push({ name:entry.name,valid:false,error:error.message }); }
}
const characterBytes = await readFile(path.join(root,characterPath));
if (characterBytes.toString('ascii',0,4) !== 'glTF') throw new Error('Cozy character asset is not a GLB file.');
const charJsonLength = characterBytes.readUInt32LE(12);
const charJson = JSON.parse(characterBytes.toString('utf8',20,20+charJsonLength).trim());
const character = { file:characterPath,bytes:characterBytes.length,meshes:charJson.meshes?.length??0,nodes:charJson.nodes?.length??0,skins:charJson.skins?.length??0,animations:(charJson.animations??[]).map(a=>a.name||'(unnamed)'),materials:charJson.materials?.length??0 };
const individualVehicleFiles = entries.filter(e => /\/[^/]+\/[^/]+\.fbx$/i.test(e.name));
const requiredVehicleModels = ['Sedan','SUV','Van'];
const missingVehicleModels = requiredVehicleModels.filter(name => !individualVehicleFiles.some(e => e.name.toLowerCase().endsWith('/'+name.toLowerCase()+'/'+name.toLowerCase()+'.fbx')));
if (individualVehicleFiles.length < 10 || missingVehicleModels.length) throw new Error('Vehicle pack is missing expected individual FBX models: '+missingVehicleModels.join(', '));
if (!licenseTexts.some(item => /CC0/i.test(item.text))) throw new Error('Vehicle pack does not include a readable CC0 license file.');
if (!['idle','walk','run'].every(name => (character.animations||[]).some(clip=>clip.toLowerCase()===name))) throw new Error('Cozy character is missing required idle/walk/run animation clips.');
if (glbDetails.some(model=>!model.valid)) throw new Error('At least one vehicle GLB failed structural validation.');
console.log(JSON.stringify({archive:zipPath,archiveBytes:archive.length,entryCount:entries.length,entries:entries.map(e=>({name:e.name,bytes:e.uncompressedSize})),models,licenseAndReadmeFiles:licenses.map(e=>({name:e.name,bytes:e.uncompressedSize})),licenseTexts,glbDetails,character},null,2));
