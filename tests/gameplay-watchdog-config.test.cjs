const fs = require('node:fs');
const assert = require('node:assert/strict');

const workflow = fs.readFileSync('.github/workflows/gameplay-watchdog.yml', 'utf8');

assert.match(
  workflow,
  /group:\s*coastline-gameplay-watchdog-\$\{\{\s*github\.head_ref\s*\|\|\s*github\.ref_name\s*\}\}/,
  'the watchdog concurrency group must use the PR head branch (or push ref name) so push and pull-request events share one group'
);
assert.doesNotMatch(
  workflow,
  /group:\s*coastline-gameplay-watchdog-\$\{\{\s*github\.ref\s*\}\}/,
  'the watchdog must not key concurrency directly on github.ref because push and pull-request refs can differ for the same branch'
);

console.log('gameplay watchdog concurrency contract: PASS');
