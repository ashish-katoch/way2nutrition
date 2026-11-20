import {readFile,readdir,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {dirname,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const target=join(root,'../dist/server');
const types={'.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.html':'text/html; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.woff2':'font/woff2'};
const assets={};
async function walk(dir,rel=''){
 for(const entry of await readdir(join(dir,rel),{withFileTypes:true})){
  const path=join(rel,entry.name);
  if(entry.isDirectory())await walk(dir,path);
  else if(entry.isFile())assets['/'+path]=[types[extname(path)]||'application/octet-stream',(await readFile(join(dir,path))).toString('base64')];
 }
}
await walk(join(root,'.open-next/assets'));
await mkdir(target,{recursive:true});
await copyFile(join(root,'.worker-bundle/worker.js'),join(target,'next-worker.js'));
await writeFile(join(target,'index.js'),`import worker from './next-worker.js';
const assets=${JSON.stringify(assets)};
function asset(request){
 const url=new URL(typeof request==='string'?request:request.url);
 const found=assets[url.pathname];
 if(!found)return new Response('Not found',{status:404});
 const method=typeof request==='string'?'GET':request.method;
 const bytes=Uint8Array.from(atob(found[1]),c=>c.charCodeAt(0));
 return new Response(method==='HEAD'?null:bytes,{headers:{'Content-Type':found[0],'Cache-Control':url.pathname.startsWith('/_next/static/')?'public,max-age=31536000,immutable':'public,max-age=3600','X-Content-Type-Options':'nosniff'}});
}
export default {async fetch(request,env,ctx){
 const path=new URL(request.url).pathname;
 if((request.method==='GET'||request.method==='HEAD')&&assets[path])return asset(request);
 return worker.fetch(request,{...env,ASSETS:{fetch:async(request,init)=>asset(typeof request==='string'||request instanceof URL?new Request(request,init):request)}},ctx);
}};
`);
console.log('Packaged Next.js Worker with',Object.keys(assets).length,'embedded static assets.');
