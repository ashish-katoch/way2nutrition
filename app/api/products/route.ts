import {getProducts,isConfigured} from '@/lib/store';
import {fail} from '@/lib/http';
export const dynamic='force-dynamic';
export async function GET(){try{return Response.json({products:await getProducts(),demo:!isConfigured()},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
