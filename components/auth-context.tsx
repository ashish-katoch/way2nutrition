'use client';
import {createContext,useContext,useEffect,useRef,useState} from 'react';
import type {Session,SupabaseClient} from '@supabase/supabase-js';
import {getBrowserAuth,accountRequest,type AuthConfig} from '@/lib/browser-auth';
type AuthState={client:SupabaseClient|null;session:Session|null;ready:boolean;savedReady:boolean;config:AuthConfig|null;error:string;syncError:string;signOut:()=>Promise<void>};
declare global{interface Window{Way2NutritionUserId?:string|null;Way2NutritionSavedReady?:boolean;}}
const Context=createContext<AuthState|null>(null);
const ids=(key:string):string[]=>{try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?[...new Set(value.filter(v=>typeof v==='string'))].slice(0,100):[];}catch{return [];}};
function pendingSaved(uid:string):Record<string,boolean>{try{const value=JSON.parse(localStorage.getItem('fieldwork.saved.pending.'+uid)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).filter(([id,state])=>id.length<=100&&typeof state==='boolean')) as Record<string,boolean>:{};}catch{return {};}}
function rememberSaved(uid:string,id:string,state:boolean|null){try{const pending=pendingSaved(uid);if(state===null)delete pending[id];else pending[id]=state;localStorage.setItem('fieldwork.saved.pending.'+uid,JSON.stringify(pending));}catch{}}
function pendingRecent(uid:string):string|null{try{const value=JSON.parse(sessionStorage.getItem('fieldwork.pending-recent')||'null');return value?.owner===uid&&typeof value.id==='string'&&Date.now()-value.time<120000?value.id:null;}catch{return null;}}
function clearRecent(uid:string,id:string){try{if(pendingRecent(uid)===id)sessionStorage.removeItem('fieldwork.pending-recent');}catch{}}
function publishSaved(value:string[],owner:string){try{localStorage.setItem('fieldwork.next.saved',JSON.stringify(value));localStorage.setItem('fieldwork.saved.owner',owner);}catch{}window.dispatchEvent(new Event('fieldwork:account-saved'));}
export function AuthProvider({children}:{children:React.ReactNode}){
 const [client,setClient]=useState<SupabaseClient|null>(null),[session,setSession]=useState<Session|null>(null),[ready,setReady]=useState(false),[savedReady,setSavedReady]=useState(false),[config,setConfig]=useState<AuthConfig|null>(null),[error,setError]=useState(''),[syncError,setSyncError]=useState('');
 const current=useRef<Session|null>(null),queue=useRef<Promise<unknown>>(Promise.resolve()),savedInit=useRef<Promise<unknown>>(Promise.resolve()),pendingView=useRef<string|null>(null);
 function markSavedReady(value:boolean){window.Way2NutritionSavedReady=value;setSavedReady(value);window.dispatchEvent(new Event('fieldwork:saved-ready'));}
 useEffect(()=>{window.Way2NutritionSavedReady=false;let active=true,unsubscribe:(()=>void)|undefined;
  getBrowserAuth().then(({client,config})=>{
   if(!active)return;setClient(client);setConfig(config);
   const sub=client.auth.onAuthStateChange((_event,next)=>{if(active){current.current=next;window.Way2NutritionUserId=next?.user.id||null;setSession(next);setReady(true);}});unsubscribe=()=>sub.data.subscription.unsubscribe();
   client.auth.getSession().then(({data})=>{if(active){current.current=data.session;window.Way2NutritionUserId=data.session?.user.id||null;setSession(data.session);setReady(true);}});
  }).catch(e=>{if(active){setError(e.message);setReady(true);}});
  return()=>{active=false;unsubscribe?.();};
 },[]);
 useEffect(()=>{
  if(!ready)return;let active=true;setSyncError('');markSavedReady(false);
  let owner='guest';try{owner=localStorage.getItem('fieldwork.saved.owner')||'guest';}catch{}
  const guest=owner==='guest'?ids('fieldwork.next.saved'):ids('fieldwork.guest.saved');
  if(owner==='guest'){try{localStorage.setItem('fieldwork.guest.saved',JSON.stringify(guest));}catch{}}
  const uid=session?.user.id;
  if(!uid||!client){pendingView.current=null;publishSaved(guest,'guest');markSavedReady(true);savedInit.current=Promise.resolve();return;}
  publishSaved([],uid);
  const pendingRecentId=pendingView.current||pendingRecent(uid);
  if(pendingRecentId){const id=pendingRecentId;pendingView.current=null;accountRequest('/api/account/recent',{method:'POST',body:JSON.stringify({id})},client,uid).then(()=>clearRecent(uid,id)).catch(e=>{if(active)setSyncError(e.message);});}
  const initialize=async()=>{
   // Guest favorites stay on this device; account favorites are loaded only from that account.
   for(const [id,saved] of Object.entries(pendingSaved(uid))){
    try{await accountRequest('/api/account/saved',{method:'POST',body:JSON.stringify({id,saved})},client,uid);if(pendingSaved(uid)[id]===saved)rememberSaved(uid,id,null);}
    catch(e){if((e as {status?:number}).status===404)rememberSaved(uid,id,null);else throw e;}
   }
   const result=await accountRequest<{ids:string[]}>('/api/account/saved',{},client,uid);
   if(active&&current.current?.user.id===uid){publishSaved(result.ids,uid);markSavedReady(true);}
  };
  savedInit.current=initialize().catch(e=>{if(active){setSyncError(e.message);markSavedReady(true);}});
  return()=>{active=false;};
 },[ready,client,session?.user.id]);
 useEffect(()=>{
  const toggle=(event:Event)=>{
   const detail=(event as CustomEvent).detail;
   if(!detail||typeof detail.id!=='string'||typeof detail.saved!=='boolean')return;
   const uid=current.current?.user.id;
   if(!uid){try{if(localStorage.getItem('fieldwork.saved.owner')==='guest')localStorage.setItem('fieldwork.guest.saved',JSON.stringify(ids('fieldwork.next.saved')));}catch{}return;}
   rememberSaved(uid,detail.id,detail.saved);
   queue.current=queue.current.catch(()=>{}).then(async()=>{
    await savedInit.current;
    if(current.current?.user.id!==uid)return;
    await accountRequest('/api/account/saved',{method:'POST',body:JSON.stringify(detail)},undefined,uid);
    if(pendingSaved(uid)[detail.id]===detail.saved)rememberSaved(uid,detail.id,null);
    const result=await accountRequest<{ids:string[]}>('/api/account/saved',{},undefined,uid);
    if(current.current?.user.id===uid){publishSaved(result.ids,uid);setSyncError('');}
   }).catch(e=>setSyncError(e.message));
  };
  const viewed=(event:Event)=>{
   const id=(event as CustomEvent).detail?.id;if(typeof id!=='string')return;
   pendingView.current=id;
   let owner=current.current?.user.id;try{owner=owner||localStorage.getItem('fieldwork.saved.owner')||undefined;if(owner&&owner!=='guest')sessionStorage.setItem('fieldwork.pending-recent',JSON.stringify({owner,id,time:Date.now()}));}catch{}
   if(current.current){const uid=current.current.user.id;pendingView.current=null;accountRequest('/api/account/recent',{method:'POST',body:JSON.stringify({id})},undefined,uid).then(()=>clearRecent(uid,id)).catch(e=>setSyncError(e.message));}
  };
  window.addEventListener('fieldwork:saved-change',toggle);window.addEventListener('fieldwork:product-view',viewed);
  return()=>{window.removeEventListener('fieldwork:saved-change',toggle);window.removeEventListener('fieldwork:product-view',viewed);};
 },[]);
 async function signOut(){if(!client)return;const result=await client.auth.signOut({scope:'local'});if(result.error)throw result.error;current.current=null;window.Way2NutritionUserId=null;pendingView.current=null;publishSaved(ids('fieldwork.guest.saved'),'guest');setSession(null);}
 return <Context.Provider value={{client,session,ready,savedReady,config,error,syncError,signOut}}>{children}</Context.Provider>;
}
export function useAuth(){return useContext(Context)!;}
