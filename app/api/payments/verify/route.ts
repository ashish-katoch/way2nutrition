import {confirmRazorpayPayment} from '@/lib/payments';
import {fail,readJSON,sameOrigin} from '@/lib/http';
export async function POST(request:Request){
 try{sameOrigin(request);const body=await readJSON(request);return Response.json(await confirmRazorpayPayment(body.razorpay_order_id,body.razorpay_payment_id,body.razorpay_signature));}catch(e){return fail(e);}
}
