import {processWebhook} from '@/lib/payments';
import {fail,reject} from '@/lib/http';
export async function POST(request:Request){
 try{const raw=await request.text();if(raw.length>250000)reject(413,'Event too large.');
 return Response.json(await processWebhook(raw,request.headers.get('x-razorpay-signature')||'',request.headers.get('x-razorpay-event-id')));}catch(e){return fail(e);}
}
