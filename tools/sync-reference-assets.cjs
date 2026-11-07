const fs = require('node:fs');
const reference = fs.readFileSync('docs/reference/MISEO_MVP_com_manual_integrado.html','utf8');
const rule = reference.match(/\.login-hero\{[^}]+\}/)[0];
const image = rule.match(/data:(image\/[^;]+);base64,([^"')\s]+)/);
if (!image || image[1] !== 'image/webp') throw new Error('Approved kitchen WebP not found');
fs.mkdirSync('assets',{recursive:true});
fs.writeFileSync('assets/reference-kitchen.webp',Buffer.from(image[2],'base64'));
