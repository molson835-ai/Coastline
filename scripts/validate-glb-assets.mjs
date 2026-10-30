#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import validator from 'gltf-validator';

const ignored = new Set(['.git', 'node_modules', 'dist', 'build', 'playwright-report', 'test-results']);
const roots = ['assets', 'models', 'public'];
const files = [];

async function walk(dir) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); }
  catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.assets') continue;
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.glb')) files.push(full);
  }
}

for (const root of roots) await walk(root);
if (files.length === 0) {
  console.log('GLB validation: no .glb files found in assets/, models/, or public/.');
  process.exit(0);
}

let errors = 0;
let warnings = 0;
for (const file of files.sort()) {
  const bytes = new Uint8Array(await fs.readFile(file));
  const report = await validator.validateBytes(bytes, {
    uri: path.relative(process.cwd(), file).replaceAll(path.sep, '/'),
    format: 'glb'
  });
  const issues = report.issues ?? {};
  const fileErrors = issues.numErrors ?? 0;
  const fileWarnings = issues.numWarnings ?? 0;
  errors += fileErrors;
  warnings += fileWarnings;
  console.log(`${file}: ${fileErrors} error(s), ${fileWarnings} warning(s)`);
  for (const message of report.issues?.messages ?? []) {
    if (message.severity === 0 || message.severity === 1) {
      console.log(`  [${message.severity === 0 ? 'ERROR' : 'WARNING'}] ${message.message}`);
    }
  }
}
console.log(`GLB validation summary: ${files.length} file(s), ${errors} error(s), ${warnings} warning(s).`);
if (errors > 0) process.exitCode = 1;
