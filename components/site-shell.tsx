'use client';
import {usePathname} from 'next/navigation';
import Header from './header';
import Footer from './footer';
import ScrollMotion from './scroll-motion';
export default function SiteShell({children}:{children:React.ReactNode}){
 const path=usePathname();
 const admin=path.startsWith('/admin');
 if(path==='/')return <>{children}</>;
 return <><ScrollMotion/>{!admin&&<Header/>}<main id="main">{children}</main>{!admin&&<Footer/>}</>;
}
