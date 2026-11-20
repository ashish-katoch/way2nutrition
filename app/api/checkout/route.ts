import {customerUser} from '@/lib/customer';
import {beginCheckout} from '@/lib/commerce';
import {fail,readJSON,sameOrigin} from '@/lib/http';
export async function POST(request:Request){
 try{sameOrigin(request);const body=await readJSON(request);const user=await customerUser(request,true);return Response.json(await beginCheckout({requestId:body.requestId,items:body.items,customer:body.customer,userId:user?.id||null}),{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}
}
