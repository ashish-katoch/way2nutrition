'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import {useStore} from './store-context';
import Icon from './icon';
import BagDrawer from './bag-drawer';
export default function Header(){
 const path=usePathname(),store=useStore(),[menu,setMenu]=useState(false),[paper,setPaper]=useState(false);
 const nav=useRef<HTMLDialogElement>(null);
 useEffect(()=>{setMenu(false);nav.current?.close();},[path]);
 useEffect(()=>{const update=()=>setPaper((path!=='/'&&path!=='/about')||scrollY>420);update();window.addEventListener('scroll',update,{passive:true});return()=>window.removeEventListener('scroll',update);},[path]);
 function toggle(){if(menu)nav.current?.close();else nav.current?.showModal();setMenu(!menu);}
 return <>
 <a className="skip" href="#main">Skip to content</a>
 <header className={'header '+(paper?'paper':'')+(menu?' menu-open':'')}>
  <Link className="logo" href="/">Way2Nutrition<span>✳</span></Link>
  <div className="header-actions"><Link href="/shop" aria-label="Search products"><Icon name="search"/></Link><Link href="/saved" aria-label="Saved products"><Icon name="heart"/></Link><Link href="/account" aria-label="Your account"><Icon name="user"/></Link><BagDrawer/><button onClick={toggle} aria-label={menu?'Close navigation':'Open navigation'} aria-expanded={menu}><Icon name={menu?'close':'menu'}/></button></div>
 </header>
 <dialog ref={nav} className="menu-panel" onCancel={()=>setMenu(false)}><button className="menu-close" aria-label="Close navigation" onClick={toggle}><Icon name="close"/></button><div className="menu-inside"><small>EXPLORE WAY2NUTRITION</small><nav>{[['/','Home'],['/shop','Shop all'],['/about','About us'],['/help','Customer care']].map(([href,label])=><Link href={href} key={href} onClick={()=>{setMenu(false);nav.current?.close();}}>{label}</Link>)}</nav><div className="menu-collections"><small>COLLECTIONS</small>{['Vitamins','Minerals','Men’s formulas','Women’s formulas','Other supplements'].map(c=><Link key={c} href={'/shop?category='+encodeURIComponent(c)} onClick={()=>{setMenu(false);nav.current?.close();}}>{c}<Icon name="arrow"/></Link>)}<Link href="/admin">Manage store</Link></div></div></dialog>
 </>;
}
