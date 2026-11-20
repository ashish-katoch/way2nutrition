import {customerUser,accountError,privateHeaders} from '@/lib/customer';
import {serviceDb} from '@/lib/db';
import {fail} from '@/lib/http';
export async function GET(request:Request){try{
 const user=await customerUser(request);
 const {data,error}=await serviceDb().from('orders').select('id,created_at,status,fulfillment_status,items,amount_minor,currency,tracking_number,receipt_token').eq('user_id',user!.id).order('created_at',{ascending:false}).limit(100);
 accountError(error);return Response.json({orders:data||[]},{headers:privateHeaders});
}catch(e){return fail(e);}}
