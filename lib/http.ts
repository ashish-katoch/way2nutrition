export function fail(error:unknown) {
 const message=error instanceof Error?error.message:'The request could not be completed.';
 const status=typeof error==='object'&&error&&'status' in error?Number(error.status):500;
 if(status>=500) console.error('Store request failed',message);
 return Response.json({error:status>=500?'The service is unavailable. Please try again.':message},{status,headers:{'Cache-Control':'no-store'}});
}
export function reject(status:number,message:string):never {throw Object.assign(new Error(message),{status});}
export function sameOrigin(request:Request) {
 const value=request.headers.get('Origin');if(!value)return;
 const target=new URL(request.url);
 const host=request.headers.get('host')||target.host;
 const protocol=(request.headers.get('x-forwarded-proto')?.split(',')[0].trim()||target.protocol.replace(':',''))+':';
 try{const origin=new URL(value);if(origin.origin==='null'||origin.host!==host||origin.protocol!==protocol)reject(403,'Open this store to continue.');}
 catch{reject(403,'Open this store to continue.');}
}
export async function readJSON(request:Request) {
 if(!request.headers.get('content-type')?.includes('application/json'))reject(415,'JSON is required.');
 const text=await request.text();if(text.length>65536)reject(413,'Request too large.');
 try{return JSON.parse(text);}catch{reject(400,'Invalid request.');}
}
