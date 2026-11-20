'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {useAuth} from './auth-context';
import type {BagItem} from '@/lib/types';
type Store={bag:BagItem[];saved:string[];add:(id:string,sku:string,quantity:number)=>void;quantity:(sku:string,n:number)=>void;toggle:(id:string)=>void;clear:()=>void;consume:(items:BagItem[])=>void;ready:boolean};
const Context=createContext<Store|null>(null);
export function StoreProvider({children}:{children:React.ReactNode}){
 const auth=useAuth(),[savedOwner,setSavedOwner]=useState('guest');
 const [bag,setBag]=useState<BagItem[]>([]),[saved,setSaved]=useState<string[]>([]),[ready,setReady]=useState(false);
 useEffect(()=>{
  function load(){try{
   const rows=JSON.parse(localStorage.getItem('fieldwork.next.bag')||'[]');
   setSavedOwner(localStorage.getItem('fieldwork.saved.owner')||'guest');
   const favorites=JSON.parse(localStorage.getItem('fieldwork.next.saved')||'[]');
   if(Array.isArray(rows))setBag(rows.filter(x=>typeof x.id==='string'&&typeof x.sku==='string'&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=99));
   if(Array.isArray(favorites))setSaved(favorites.filter(x=>typeof x==='string'));
  }catch{}setReady(true);}
  load();window.addEventListener('storage',load);window.addEventListener('fieldwork:account-saved',load);return()=>{window.removeEventListener('storage',load);window.removeEventListener('fieldwork:account-saved',load);};
 },[]);
 function saveBag(rows:BagItem[]){setBag(rows);try{localStorage.setItem('fieldwork.next.bag',JSON.stringify(rows));}catch{}}
 function add(id:string,sku:string,quantity:number){
  if(!Number.isInteger(quantity)||quantity<1)return;
  const existing=bag.find(x=>x.sku===sku);
  saveBag(existing?bag.map(x=>x.sku===sku?{...x,quantity:Math.min(99,x.quantity+quantity)}:x):[...bag,{id,sku,quantity:Math.min(99,quantity)}]);
 }
 const visibleSaved=auth.ready&&(savedOwner===(auth.session?.user.id||'guest'))?saved:[];
 function toggle(id:string){if(!auth.ready||!auth.savedReady)return;const rows=visibleSaved.includes(id)?visibleSaved.filter(x=>x!==id):[...visibleSaved,id];setSavedOwner(auth.session?.user.id||'guest');setSaved(rows);try{localStorage.setItem('fieldwork.next.saved',JSON.stringify(rows));}catch{}window.dispatchEvent(new CustomEvent('fieldwork:saved-change',{detail:{id,saved:rows.includes(id)}}));}
 return <Context.Provider value={{bag,saved:visibleSaved,add,toggle,quantity:(sku,n)=>saveBag(bag.map(x=>x.sku===sku?{...x,quantity:Math.max(0,Math.min(99,n))}:x).filter(x=>x.quantity>0)),clear:()=>saveBag([]),consume:(items)=>saveBag(bag.map(row=>({...row,quantity:row.quantity-(items.find(i=>i.sku===row.sku)?.quantity||0)})).filter(row=>row.quantity>0)),ready:ready&&auth.ready&&auth.savedReady}}>{children}</Context.Provider>;
}
export const useStore=()=>useContext(Context)!;
