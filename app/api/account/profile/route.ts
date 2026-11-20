import {customerUser,accountError,privateHeaders} from '@/lib/customer';
import {serviceDb} from '@/lib/db';
import {fail,readJSON,sameOrigin,reject} from '@/lib/http';
export async function GET(request:Request){try{
 const user=await customerUser(request);const {data,error}=await serviceDb().from('customer_profiles').select('full_name,phone,address').eq('user_id',user!.id).maybeSingle();accountError(error);
 return Response.json({profile:data},{headers:privateHeaders});
}catch(e){return fail(e);}}
export async function PUT(request:Request){try{
 sameOrigin(request);const user=await customerUser(request),body=await readJSON(request);
 const text=(value:unknown,max:number)=>{if(typeof value!=='string'||value.length>max||/[\x00-\x1f]/.test(value))reject(400,'Check your profile details.');return value.trim();};
 const full_name=text(body.full_name,120),phone=text(body.phone,25),a=body.address;
 if(!a||typeof a!=='object')reject(400,'Check your address.');
 const address={line1:text(a.line1,200),line2:text(a.line2||'',200),city:text(a.city,100),state:text(a.state,100),postal_code:text(a.postal_code,6),country:'IN'};
 if(!full_name||!address.line1||!address.city||!address.state||!/^[1-9]\d{5}$/.test(address.postal_code)||!/^(?:\+91|91)?[6-9]\d{9}$/.test(phone.replace(/[\s()-]/g,'')))reject(400,'Enter your name, Indian mobile number and complete delivery address.');
 const {error}=await serviceDb().from('customer_profiles').upsert({user_id:user!.id,full_name,phone,address,updated_at:new Date().toISOString()});accountError(error);
 return Response.json({saved:true},{headers:privateHeaders});
}catch(e){return fail(e);}}
