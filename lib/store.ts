import { createClient } from '@supabase/supabase-js';
import { sampleProducts } from './sample';
import type { Product } from './types';

export function isConfigured() {
 return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
export async function getProducts(): Promise<Product[]> {
 if(!isConfigured()) return sampleProducts;
 const db=createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_ANON_KEY!,{auth:{persistSession:false}});
 const {data,error}=await db.from('products').select('id,name,category,description,image_url,published,product_variants(sku,size,price_minor,currency,stock,enabled,image_url)').eq('published',true).order('name');
 if(error) throw new Error('Unable to load the product catalog.');
 return (data||[]).map(({product_variants,...product})=>({...product,variants:product_variants.filter((v: {enabled:boolean})=>v.enabled)})) as Product[];
}
