import {after,test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const hooks=registerHooks({resolve(specifier,context,next){
 if(specifier==='server-only')return next('next/dist/compiled/server-only/empty.js',context);
 if(specifier.startsWith('@/lib/'))return next(new URL('../lib/'+specifier.slice(6)+'.ts',import.meta.url).href,context);
 if(context.parentURL?.includes('/lib/')&&/^\.\/(db|http)$/.test(specifier))return next(specifier+'.ts',context);
 return next(specifier,context);
}});
const originalFetch=globalThis.fetch,previous={url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY};
process.env.SUPABASE_URL='https://account-tests.example.test';process.env.SUPABASE_SERVICE_ROLE_KEY='fixture';
const customer=await import(new URL('../lib/customer.ts',import.meta.url).href) as typeof import('../lib/customer');
const orders=await import(new URL('../app/api/account/orders/route.ts',import.meta.url).href) as typeof import('../app/api/account/orders/route');
const saved=await import(new URL('../app/api/account/saved/route.ts',import.meta.url).href) as typeof import('../app/api/account/saved/route');
const uid='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const user={id:uid,aud:'authenticated',role:'authenticated',email:'fixture@example.invalid',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
after(()=>{hooks.deregister();globalThis.fetch=originalFetch;if(previous.url===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=previous.url;if(previous.key===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=previous.key;});
test('guest checkout remains anonymous and malformed bearer tokens are rejected',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Unexpected network');};
 assert.equal(await customer.customerUser(new Request('https://store.test/api/checkout'),true),null);
 await assert.rejects(customer.customerUser(new Request('https://store.test/api/account/orders',{headers:{Authorization:'Basic anything'}})),/Sign in/);
 assert.equal(calls,0);
});
test('order history always filters by the verified user, ignoring requested identity',async()=>{
 let calls=0;globalThis.fetch=async(input)=>{const url=new URL(String(input));calls++;if(url.pathname==='/auth/v1/user')return Response.json(user);
 assert.equal(url.pathname,'/rest/v1/orders');assert.equal(url.searchParams.get('user_id'),'eq.'+uid);return Response.json([]);};
 const response=await orders.GET(new Request('https://store.test/api/account/orders?user_id='+other,{headers:{Authorization:'Bearer fixture-token'}}));
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{orders:[]});assert.equal(calls,2);
});
test('saved products use verified ownership and cannot accept another user ID',async()=>{
 let written:any;globalThis.fetch=async(input,init)=>{const url=new URL(String(input));if(url.pathname==='/auth/v1/user')return Response.json(user);if(url.pathname==='/rest/v1/products')return Response.json({id:'sample-vitamin-c'});assert.equal(url.pathname,'/rest/v1/customer_saved_products');written=JSON.parse(String(init?.body));return new Response(null,{status:201});};
 const response=await saved.POST(new Request('https://store.test/api/account/saved',{method:'POST',headers:{Authorization:'Bearer fixture-token','Content-Type':'application/json',Origin:'https://store.test'},body:JSON.stringify({id:'sample-vitamin-c',saved:true,user_id:other})}));
 assert.equal(response.status,200);assert.equal(written.user_id,uid);assert.equal(written.product_id,'sample-vitamin-c');
});
test('cross-origin account mutations are rejected before accessing Supabase',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Unexpected network');};
 const response=await saved.POST(new Request('https://store.test/api/account/saved',{method:'POST',headers:{Origin:'https://other.test','Content-Type':'application/json'},body:'{}'}));
 assert.equal(response.status,403);assert.equal(calls,0);
});

test('origin check accepts the public Host when a local framework uses its canonical internal URL',async()=>{
 const http=await import(new URL('../lib/http.ts',import.meta.url).href) as typeof import('../lib/http');
 assert.doesNotThrow(()=>http.sameOrigin(new Request('http://localhost:3000/api/account/saved',{headers:{Host:'127.0.0.1:3000',Origin:'http://127.0.0.1:3000','x-forwarded-proto':'http'}})));
 assert.throws(()=>http.sameOrigin(new Request('https://store.test/api/account/saved',{headers:{Host:'store.test',Origin:'https://other.test'}})),/Open this store/);
});
