import {requireAdmin} from '@/lib/admin';
import {fail,readJSON,sameOrigin,reject} from '@/lib/http';
import {validateProduct} from '@/lib/validation';
export async function PUT(request:Request,context:{params:Promise<{id:string}>}){
 try{sameOrigin(request);const db=await requireAdmin(request);const {id}=await context.params;const payload=validateProduct(await readJSON(request));if(id!==payload.id)reject(400,'Product IDs cannot be changed.');
 const {data,error:findError}=await db.from('products').select('id').eq('id',id).maybeSingle();if(findError)throw findError;if(!data)reject(404,'Product not found.');
 const {error}=await db.rpc('admin_save_product',{payload});if(error)throw error;return Response.json({product:payload});}catch(e){return fail(e);}
}
