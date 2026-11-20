import {requireAdmin} from '@/lib/admin';
import {fail,readJSON,sameOrigin,reject} from '@/lib/http';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{const db=await requireAdmin(request);const {data,error}=await db.from('orders').select('id,created_at,status,fulfillment_status,currency,amount_minor,customer,items,tracking_number').order('created_at',{ascending:false}).limit(200);if(error)throw error;
 return Response.json({orders:(data||[]).map(o=>({...o,total_minor:o.amount_minor}))},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}
}
export async function PATCH(request:Request){
 try{sameOrigin(request);const db=await requireAdmin(request);const body=await readJSON(request);
 if(!['unfulfilled','processing','shipped','delivered'].includes(body.fulfillment_status))reject(400,'Choose a valid fulfillment status.');
 const tracking_number=typeof body.tracking_number==='string'?body.tracking_number.trim().slice(0,150):'';
 const {data,error}=await db.from('orders').update({fulfillment_status:body.fulfillment_status,tracking_number}).eq('id',body.id).eq('status','paid').select('id').maybeSingle();if(error)throw error;if(!data)reject(409,'Only paid orders can be fulfilled.');
 return Response.json({updated:true});}catch(e){return fail(e);}
}
