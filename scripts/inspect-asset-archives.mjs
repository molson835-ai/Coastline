import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const archives = [
  'assets/Free Low Poly Vehicles Pack by Rgsdev.zip',
];

function inspectZip(buffer, archiveName) {
  const min = Math.max(0, buffer.length - 0x10015);
  let eocd = -1;
  for (let p = buffer.length - 22; p >= min; p--) {
    if (p >= 0 && buffer.readUInt32LE(p) === 0x06054b50) { eocd = p; break; }
  }
  if (eocd < 0) throw new Error(archiveName + ': ZIP end-of-central-directory record missing');
  const count = buffer.readUInt16LE(eocd + 10);
  const directorySize = buffer.readUInt32LE(eocd + 12);
  const directoryOffset = buffer.readUInt32LE(eocd + 16);
  if (directoryOffset + directorySize > buffer.length) throw new Error(archiveName + ': central directory is out of bounds');
  const entries = [];
  let cursor = directoryOffset;
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error(archiveName + ': malformed central directory entry #' + index);
    }
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const crc32 = buffer.readUInt32LE(cursor + 16).toString(16).padStart(8, '0');
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const size = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.toString('utf8', cursor + 46, cursor + 46 + nameLength);
    const ext = path.extname(name).toLowerCase() || (name.endsWith('/') ? '[directory]' : '[no extension]');
    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(archiveName + ': invalid local header for ' + name);
    }
    entries.push({ name, ext, size, compressedSize, method, crc32, flags, localOffset });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  if (entries.length !== count) throw new Error(archiveName + ': expected ' + count + ' entries, parsed ' + entries.length);
  const totals = {};
  for (const entry of entries) {
    totals[entry.ext] ??= { files: 0, bytes: 0 };
    totals[entry.ext].files++;
    totals[entry.ext].bytes += entry.size;
  }
  console.log('\n=== ZIP AUDIT: ' + archiveName + ' ===');
  console.log(JSON.stringify({ entryCount: entries.length, archiveBytes: buffer.length, extensionSummary: totals }, null, 2));
  for (const entry of entries) {
    console.log([
      entry.name,
      'uncompressed=' + entry.size,
      'compressed=' + entry.compressedSize,
      'method=' + entry.method,
      'crc32=' + entry.crc32,
    ].join(' | '));
  }
  return entries;
}

for (const archive of archives) {
  const buffer = await readFile(path.join(root, archive));
  const entries = inspectZip(buffer, archive);
  const invalid = entries.filter(entry => entry.name.endsWith('/') ? false : entry.localOffset + 30 > buffer.length);
  if (invalid.length) throw new Error(archive + ': invalid local entry header(s): ' + invalid.map(e => e.name).join(', '));
}
console.log('\nAsset archive audit complete: all entries enumerated and local ZIP headers validated.');
