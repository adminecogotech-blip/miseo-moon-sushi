const test = require('node:test');
const assert = require('node:assert/strict');
const {validateTarget} = require('./preview-safety.cjs');
const base = 'https://miseo-moon-sushi-git-feat-production-parity-r-615461-evoluateam.vercel.app';
const health = {environment:'preview',database:'connected',databaseName:'moon_fish_preview_tests',gitBranch:'feat/production-parity-readiness',revision:'reviewed-sha'};
test('E2E target gate rejects production, wrong database, branch and stale revision',()=>{
 assert.doesNotThrow(()=>validateTarget(base,health,'reviewed-sha'));
 for (const override of [{environment:'production'},{databaseName:'miseo_moon_sushi'},{gitBranch:'main'},{revision:'old'},{database:'unavailable'}]) {
  assert.throws(()=>validateTarget(base,{...health,...override},'reviewed-sha'));
 }
 for (const url of ['https://miseo-moon-sushi.vercel.app',base+'/other',base.replace('https:','http:'),'https://username@'+new URL(base).hostname]) assert.throws(()=>validateTarget(url,health,'reviewed-sha'));
 assert.throws(()=>validateTarget(base,health,''));
});
