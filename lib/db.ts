import 'server-only';
import { createClient } from '@supabase/supabase-js';

export function serviceDb() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new CommerceError(503, 'The store database is unavailable.');
  return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
}

export class CommerceError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function commerceRpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const {data,error} = await serviceDb().rpc(name,args);
  if (error) {
    if (error.code === 'P0001') throw new CommerceError(409, error.message);
    console.error('Commerce database error',name,error.code);
    throw new CommerceError(503, 'The store could not save this request. Please retry.');
  }
  return data as T;
}
