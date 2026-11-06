const assert = require('node:assert/strict');
const PREVIEW_HOST = 'miseo-moon-sushi-git-feat-production-parity-r-615461-evoluateam.vercel.app';
function validateTarget(base, health, revision) {
 const url = new URL(base);
 assert.equal(url.protocol, 'https:');
 assert.equal(url.hostname, PREVIEW_HOST, 'Only the authorized Preview alias is allowed');
 assert.equal(url.origin, base, 'Preview URL must be an origin without credentials or path');
 if (!health) return;
 assert.equal(health.environment, 'preview');
 assert.equal(health.database, 'connected');
 assert.equal(health.databaseName, 'moon_fish_preview_tests', 'Refusing a database outside isolated QA');
 assert.equal(health.gitBranch, 'feat/production-parity-readiness');
 assert.ok(revision, 'EXPECTED_REVISION is required');
 assert.equal(health.revision, revision, 'Preview must match the exact commit under test');
}
module.exports = { validateTarget };
