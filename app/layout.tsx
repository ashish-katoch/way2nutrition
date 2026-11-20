import type {Metadata} from 'next';
import {AuthProvider} from '@/components/auth-context';
import {StoreProvider} from '@/components/store-context';
import SiteShell from '@/components/site-shell';
import './globals.css';
import './product-detail.css';
import './account.css';
const siteUrl=process.env.NEXT_PUBLIC_SITE_URL||'https://fieldwork-now-market.ashishkatoch71422779.chatgpt.site';
export const metadata:Metadata={metadataBase:new URL(siteUrl),title:{default:'Way2Nutrition | NOW Vitamins & Supplements',template:'%s | Way2Nutrition'},description:'Explore NOW vitamins, minerals and everyday health supplements for men and women at Way2Nutrition. Compare formulas and find your daily essentials.',applicationName:'Way2Nutrition',openGraph:{type:'website',locale:'en_IN',siteName:'Way2Nutrition',title:'Way2Nutrition | Everyday wellness',description:'Discover NOW vitamins, minerals and everyday adult supplements.'},twitter:{card:'summary_large_image',title:'Way2Nutrition | Everyday wellness',images:['/opengraph-image']},robots:{index:true,follow:true}};

export default function Layout({children}:{children:React.ReactNode}){
 return <html lang="en"><body><AuthProvider><StoreProvider><SiteShell>{children}</SiteShell></StoreProvider></AuthProvider></body></html>;
}
