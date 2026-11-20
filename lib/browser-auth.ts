'use client';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
export type AuthConfig={configured:boolean;supabaseUrl:string;supabaseAnonKey:string;googleEnabled?:boolean};
let pending:Promise<{client:SupabaseClient;config:AuthConfig}>|undefined;
export function getBrowserAuth(){
 if(!pending)pending=(async()=>{
  const response=await fetch('/api/config',{cache:'no-store'}),config:AuthConfig=await response.json();
  if(!response.ok||!config.configured||!config.supabaseUrl||!config.supabaseAnonKey)throw Error('Customer sign-in is being prepared. Please try again later.');
  const client=createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{flowType:'pkce',detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
  return {client,config};
 })().catch(error=>{pending=undefined;throw error;});
 return pending;
}
export async function getBrowserClient(){return (await getBrowserAuth()).client;}
export async function accountRequest<T=any>(path:string,init:RequestInit={},client?:SupabaseClient,expectedUserId?:string):Promise<T>{
 const auth=client||await getBrowserClient();
 const {data,error}=await auth.auth.getSession();
 if(error||!data.session||(expectedUserId&&data.session.user.id!==expectedUserId))throw Object.assign(Error('Please sign in again.'),{status:401});
 const response=await fetch(path,{...init,cache:'no-store',keepalive:!!init.method&&init.method!=='GET',headers:{'Content-Type':'application/json',...init.headers,Authorization:'Bearer '+data.session.access_token}});
 const result=await response.json();if(!response.ok)throw Object.assign(Error(result.error||'Your account could not be loaded.'),{status:response.status});return result;
}
export function safeAccountNext(value:string|null){return value&&['/account','/checkout','/saved','/shop'].includes(value)?value:'/account';}
