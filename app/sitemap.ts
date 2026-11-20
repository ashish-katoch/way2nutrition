import type {MetadataRoute} from 'next';
import {getProducts} from '@/lib/store';
export const dynamic='force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{const base=process.env.NEXT_PUBLIC_SITE_URL||'https://fieldwork-now-market.ashishkatoch71422779.chatgpt.site';const products=await getProducts();return [...['','/shop','/about','/help','/privacy'].map(path=>({url:base+path})),...products.map(p=>({url:base+'/product/'+encodeURIComponent(p.id)}))];}
