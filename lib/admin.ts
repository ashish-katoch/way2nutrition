import { serviceDb } from './db';
import { reject } from './http';
export async function requireAdmin(request:Request) {
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!token)reject(401,'Sign in to continue.');
 const db=serviceDb();
 const {data,error}=await db.auth.getUser(token);
 if(error||!data.user)reject(401,'Your session has expired.');
 const result=await db.from('admin_users').select('user_id').eq('user_id',data.user.id).maybeSingle();
 if(result.error||!result.data)reject(403,'Administrator access required.');
 return db;
}
