import 'server-only';
import {serviceDb,CommerceError} from './db';
export async function customerUser(request:Request,optional=false){
 const authorization=request.headers.get('authorization');
 if(!authorization&&optional)return null;
 const token=authorization?.match(/^Bearer ([^\s]+)$/)?.[1];
 if(!token)throw new CommerceError(401,'Sign in to continue.');
 const {data,error}=await serviceDb().auth.getUser(token);
 if(error||!data.user)throw new CommerceError(401,'Your session has expired. Please sign in again.');
 return data.user;
}
export function accountError(error:{code?:string;message?:string}|null){
 if(!error)return;
 if(['42P01','PGRST205'].includes(error.code||''))throw new CommerceError(409,'Customer account storage is being prepared. Please try again after setup.');
 throw new CommerceError(503,'Your account could not be loaded. Please try again.');
}
export const privateHeaders={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
