import 'server-only';
import { createHmac, timingSafeEqual, createHash } from 'node:crypto';
import { CommerceError, commerceRpc, serviceDb } from './db';

export function paymentsReady() {
  const key = process.env.RAZORPAY_KEY_ID || '';
  const modeOK = key.startsWith('rzp_test_') || (key.startsWith('rzp_live_') && process.env.STORE_MODE === 'live');
  return Boolean(modeOK && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET &&
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

type RazorpayOrder = {id:string; amount:number; currency:string; receipt:string};
type RazorpayPayment = {id:string; order_id:string; status:string; amount:number; currency:string};

async function razorpay<T>(path:string, init:RequestInit = {}):Promise<T> {
  if (!paymentsReady()) throw new CommerceError(503,'Payments are currently unavailable.');
  const credentials = Buffer.from(process.env.RAZORPAY_KEY_ID + ':' + process.env.RAZORPAY_KEY_SECRET).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/' + path,{
    ...init, cache:'no-store', signal:AbortSignal.timeout(10000),
    headers:{authorization:'Basic ' + credentials,'Content-Type':'application/json'}
  });
  if (!res.ok) throw new CommerceError(502,'Payment provider unavailable. Please retry.');
  return res.json() as Promise<T>;
}

export async function createRazorpayOrder(input:{amount:number;currency:string;receipt:string}):Promise<RazorpayOrder> {
  const matches = await razorpay<{items:RazorpayOrder[]}>('orders?count=100&receipt=' + encodeURIComponent(input.receipt));
  const existing = matches.items.find(item => item.receipt === input.receipt);
  const order = existing || await razorpay<RazorpayOrder>('orders',{method:'POST',body:JSON.stringify(input)});
  if (order.receipt !== input.receipt || order.currency !== input.currency || order.amount !== input.amount || !/^order_[a-zA-Z0-9]+$/.test(order.id)) {
    throw new CommerceError(502,'Payment order details do not match this checkout.');
  }
  return order;
}

function validHmac(payload:string, signature:string, secret:string | undefined): boolean {
  if (!secret || typeof signature !== 'string' || !/^[a-fA-F0-9]{64}$/.test(signature)) return false;
  const expected = createHmac('sha256',secret).update(payload).digest();
  return timingSafeEqual(Buffer.from(signature,'hex'),expected);
}

export function verifyPaymentSignature(orderId:string,paymentId:string,signature:string) {
  return validHmac(orderId + '|' + paymentId,signature,process.env.RAZORPAY_KEY_SECRET);
}

async function recordPayment(payment:RazorpayPayment,eventId:string) {
  if (!/^order_[a-zA-Z0-9]+$/.test(payment.order_id) || !/^pay_[a-zA-Z0-9]+$/.test(payment.id) ||
      !Number.isSafeInteger(payment.amount) || payment.amount <= 0 || payment.status !== 'captured') {
    throw new CommerceError(400,'Invalid payment details.');
  }
  return commerceRpc<'paid'|'payment_review'>('record_capture',{
    p_gateway:payment.order_id,p_payment:payment.id,p_amount:payment.amount,p_currency:payment.currency,p_event:eventId
  });
}

export async function confirmRazorpayPayment(orderId:string,paymentId:string,signature:string) {
  if (!/^order_[a-zA-Z0-9]+$/.test(orderId) || !/^pay_[a-zA-Z0-9]+$/.test(paymentId)) throw new CommerceError(400,'Invalid payment reference.');
  const {data,error} = await serviceDb().from('orders').select('razorpay_order_id').eq('razorpay_order_id',orderId).maybeSingle();
  if(error) throw new CommerceError(503,'Order lookup is unavailable.');
  if (!data || !verifyPaymentSignature(data.razorpay_order_id,paymentId,signature)) throw new CommerceError(400,'Payment could not be verified.');
  const payment = await razorpay<RazorpayPayment>('payments/' + paymentId);
  if (payment.id !== paymentId || payment.order_id !== orderId) throw new CommerceError(400,'Payment could not be verified.');
  if (payment.status === 'authorized' || payment.status === 'created') return {status:'pending' as const};
  if (payment.status !== 'captured') throw new CommerceError(409,'This payment was not captured.');
  return {status:await recordPayment(payment,'confirm:' + paymentId)};
}

export async function processWebhook(rawBody:string,signature:string,eventId?:string|null) {
  if (!validHmac(rawBody,signature,process.env.RAZORPAY_WEBHOOK_SECRET)) throw new CommerceError(400,'Invalid webhook signature.');
  let event;
  try { event = JSON.parse(rawBody); } catch { throw new CommerceError(400,'Invalid event.'); }
  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const payment = event.payload?.payment?.entity;
    if (!payment) throw new CommerceError(400,'Missing payment details.');
    if (eventId && eventId.length > 192) throw new CommerceError(400,'Invalid event reference.');
    await recordPayment(payment,'event:' + (eventId || createHash('sha256').update(rawBody).digest('hex')));
  }
  return {received:true};
}

// Receipt possession permits reconciliation, never trusting browser payment state.
export async function reconcileGatewayOrder(orderId:string) {
  if (!/^order_[a-zA-Z0-9]+$/.test(orderId)) return;
  const result = await razorpay<{items:RazorpayPayment[]}>('orders/'+orderId+'/payments');
  const payment = result.items.find(p=>p.order_id===orderId && p.status==='captured');
  if(payment) await recordPayment(payment,'reconcile:'+payment.id);
}
