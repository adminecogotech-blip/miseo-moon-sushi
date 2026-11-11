const {randomBytes,createCipheriv,createDecipheriv}=require('node:crypto');
function key(){
 const value=Buffer.from(process.env.MISEO_CONNECTIONS_KEY||'','base64');
 if(value.length!==32)throw Object.assign(new Error('Chave de proteção indisponível neste ambiente.'),{status:503});
 return value;
}
function seal(provider,field,value){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);
 cipher.setAAD(Buffer.from(provider+'/'+field));
 const data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
 return [iv,cipher.getAuthTag(),data].map(x=>x.toString('base64')).join('.');
}
function reveal(provider,field,record){
 if(!record?.[field])return process.env[field];
 const [iv,tag,data]=record[field].split('.').map(x=>Buffer.from(x,'base64'));
 const cipher=createDecipheriv('aes-256-gcm',key(),iv);
 cipher.setAAD(Buffer.from(provider+'/'+field));cipher.setAuthTag(tag);
 return Buffer.concat([cipher.update(data),cipher.final()]).toString('utf8');
}
module.exports={seal,reveal,ready:()=>Buffer.from(process.env.MISEO_CONNECTIONS_KEY||'','base64').length===32};
