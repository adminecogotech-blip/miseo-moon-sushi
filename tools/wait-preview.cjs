const {validateTarget} = require('../tests/preview-safety.cjs');
const base = process.env.BASE_URL;
validateTarget(base);
(async () => {
 for (let attempt = 0; attempt < 90; attempt++) {
  try {
   const response = await fetch(base+'/api/health', {redirect:'error',signal:AbortSignal.timeout(10000)});
   if (response.ok) {
    validateTarget(base,await response.json(),process.env.EXPECTED_REVISION);
    console.log('Exact commit and isolated Preview database verified.');
    return;
   }
  } catch { /* The alias may still point at an older deployment. Never print response bodies. */ }
  await new Promise(resolve=>setTimeout(resolve,5000));
 }
 throw new Error('Expected commit on isolated Preview unavailable; no operational mutations sent.');
})().catch(error=>{console.error(error.message);process.exitCode=1});
