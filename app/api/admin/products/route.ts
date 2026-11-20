import {requireAdmin} from '@/lib/admin';
import {fail,readJSON,sameOrigin} from '@/lib/http';
import {validateProduct} from '@/lib/validation';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{const db=await requireAdmin(request);const {data,error}=await db.from('products').select('*,product_variants(*)').order('name');if(error)throw error;
 return Response.json({products:(data||[]).map(({product_variants,...p})=>({...p,variants:product_variants}))},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}
}
export async function POST(request:Request){
 try{sameOrigin(request);const db=await requireAdmin(request);const payload=validateProduct(await readJSON(request));
 const exists=await db.from('products').select('id').eq('id',payload.id).maybeSingle();if(exists.data)return Response.json({error:'A product with this ID already exists.'},{status:409});
 const {error}=await db.rpc('admin_save_product',{payload});if(error)throw error;return Response.json({product:payload},{status:201});}catch(e){return fail(e);}
}
