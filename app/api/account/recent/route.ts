import {customerUser,accountError,privateHeaders} from '@/lib/customer';
import {serviceDb} from '@/lib/db';
import {fail,readJSON,sameOrigin,reject} from '@/lib/http';
export async function GET(request:Request){try{
 const user=await customerUser(request);const {data,error}=await serviceDb().from('customer_recent_products').select('product_id,viewed_at').eq('user_id',user!.id).order('viewed_at',{ascending:false}).limit(20);
 accountError(error);return Response.json({recent:data||[]},{headers:privateHeaders});
}catch(e){return fail(e);}}
export async function POST(request:Request){try{
 sameOrigin(request);const user=await customerUser(request),body=await readJSON(request);
 if(typeof body.id!=='string'||body.id.length>100)reject(400,'Choose a valid product.');
 const db=serviceDb(),lookup=await db.from('products').select('id').eq('id',body.id).eq('published',true).maybeSingle();accountError(lookup.error);if(!lookup.data)reject(404,'Product unavailable.');
 const {error}=await db.from('customer_recent_products').upsert({user_id:user!.id,product_id:body.id,viewed_at:new Date().toISOString()},{onConflict:'user_id,product_id'});accountError(error);
 return Response.json({recorded:true},{headers:privateHeaders});
}catch(e){return fail(e);}}
