import type {MetadataRoute} from 'next';
export default function robots():MetadataRoute.Robots{const base=process.env.NEXT_PUBLIC_SITE_URL||'https://fieldwork-now-market.ashishkatoch71422779.chatgpt.site';return {rules:{userAgent:'*',allow:'/',disallow:['/api/','/admin','/account','/checkout','/order/','/auth/','/bag','/saved']},sitemap:base+'/sitemap.xml'};}
