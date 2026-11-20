import {getReceipt} from '@/lib/commerce';
import {fail} from '@/lib/http';
export const dynamic='force-dynamic';
export async function GET(_request:Request,context:{params:Promise<{token:string}>}){
 try{const {token}=await context.params;return Response.json(await getReceipt(token),{headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}catch(e){return fail(e);}
}
