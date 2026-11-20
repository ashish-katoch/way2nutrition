'use client';
import {useEffect,useRef} from 'react';
import {markup} from './restored-markup';
const styles=['style','shop','glass','shelf','nature','pages','experience','footer','icons','checkout','scroll-shape','full-menu','responsive-v3'];
const scripts=['shop','glass','shelf','nature','experience','home','newsletter','icons','scroll-shape','header-tone'];
export default function RestoredStorefront(){
 const started=useRef(false);
 useEffect(()=>{
  if(started.current)return;
  started.current=true;
  document.body.classList.add('original-storefront');
  (async()=>{for(const name of scripts){await new Promise<void>((resolve,reject)=>{
   const script=document.createElement('script');script.src='/storefront/'+name+'.js'+(name==='home'?'?v=account-1':name==='shop'?'?v=account-1':'');script.async=false;
   script.onload=()=>resolve();script.onerror=()=>reject(new Error('Could not load '+name));document.body.append(script);
  });}})().catch(()=>{const app=document.getElementById('app');if(app&&!app.childNodes.length)app.textContent='The storefront could not load. Please refresh the page.';});
 },[]);
 return <>{styles.map(name=><link key={name} rel="stylesheet" href={'/storefront/'+name+'.css'}/>)}<div dangerouslySetInnerHTML={{__html:markup}}/></>;
}
