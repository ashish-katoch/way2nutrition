import {customerUser,accountError,privateHeaders} from '@/lib/customer';
import {serviceDb} from '@/lib/db';
import {fail,readJSON,sameOrigin,reject} from '@/lib/http';
export async function GET(request:Request){try{
 const user=await customerUser(request);const {data,error}=await serviceDb().from('customer_saved_products').select('product_id').eq('user_id',user!.id).limit(100);
 accountError(error);return Response.json({ids:(data||[]).map(row=>row.product_id)},{headers:privateHeaders});
}catch(e){return fail(e);}}
export async function POST(request:Request){try{
 sameOrigin(request);const user=await customerUser(request),body=await readJSON(request);
 if(typeof body.id!=='string'||body.id.length>100||typeof body.saved!=='boolean')reject(400,'Choose a valid product.');
 const db=serviceDb();
 if(body.saved){
  const {data,error}=await db.from('products').select('id').eq('id',body.id).eq('published',true).maybeSingle();accountError(error);if(!data)reject(404,'Product unavailable.');
  const result=await db.from('customer_saved_products').upsert({user_id:user!.id,product_id:body.id},{onConflict:'user_id,product_id',ignoreDuplicates:true});accountError(result.error);
 }else{const {error}=await db.from('customer_saved_products').delete().eq('user_id',user!.id).eq('product_id',body.id);accountError(error);}
 return Response.json({saved:body.saved},{headers:privateHeaders});
}catch(e){return fail(e);}}
export async function PUT(request:Request){try{
 sameOrigin(request);const user=await customerUser(request),body=await readJSON(request);
 if(!Array.isArray(body.ids)||body.ids.length>100||body.ids.some((id:unknown)=>typeof id!=='string'||id.length>100))reject(400,'Check your saved products.');
 if(!body.ids.length)return Response.json({merged:true},{headers:privateHeaders});
 const db=serviceDb(),lookup=await db.from('products').select('id').in('id',[...new Set(body.ids)]).eq('published',true);accountError(lookup.error);
 if(lookup.data?.length){const result=await db.from('customer_saved_products').upsert(lookup.data.map(p=>({user_id:user!.id,product_id:p.id})),{onConflict:'user_id,product_id',ignoreDuplicates:true});accountError(result.error);}
 return Response.json({merged:true},{headers:privateHeaders});
}catch(e){return fail(e);}}
