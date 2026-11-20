import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {SupabaseClient} from '@supabase/supabase-js';
const {accountRequest}=await import(new URL('../lib/browser-auth.ts',import.meta.url).href) as typeof import('../lib/browser-auth');

test('queued account requests cannot run with a replacement customer session',async()=>{
 const client={auth:{getSession:async()=>({data:{session:{user:{id:'customer-b'},access_token:'fixture'}},error:null})}} as unknown as SupabaseClient;
 const original=globalThis.fetch;let sent=false;
 globalThis.fetch=async()=>{sent=true;return Response.json({});};
 try{
  await assert.rejects(accountRequest('/api/account/saved',{method:'POST',body:'{}'},client,'customer-a'),/sign in again/i);
  assert.equal(sent,false);
 }finally{globalThis.fetch=original;}
});
