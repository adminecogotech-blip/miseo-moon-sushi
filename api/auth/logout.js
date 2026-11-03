const { db, hash, cookie, clearCookie, ensureSchema, json, method } = require('../_auth');
module.exports = async function handler(req,res) {
 if (!method(req,res,'POST')) return;
 try { await ensureSchema(); const token=cookie(req,'miseo_session'); if(token) await db().query('DELETE FROM app_sessions WHERE token_hash=$1',[hash(token)]); clearCookie(res); return json(res,200,{ok:true}); }
 catch(e){ console.error('auth logout error:',e.message); clearCookie(res); return json(res,200,{ok:true}); }
};
