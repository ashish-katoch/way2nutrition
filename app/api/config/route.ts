import { paymentsReady } from '@/lib/payments';
import { isConfigured } from '@/lib/store';
export const dynamic='force-dynamic';
export async function GET(){
 let googleEnabled=false;
 if(isConfigured())try{
  const response=await fetch(process.env.SUPABASE_URL+'/auth/v1/settings',{headers:{apikey:process.env.SUPABASE_ANON_KEY!},cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(response.ok)googleEnabled=(await response.json()).external?.google===true;
 }catch{}

 return Response.json({configured:isConfigured(),googleEnabled,supabaseUrl:process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'',supabaseAnonKey:process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'',storeMode:process.env.STORE_MODE||'demo',checkoutEnabled:paymentsReady()},{headers:{'Cache-Control':'no-store'}});
}
