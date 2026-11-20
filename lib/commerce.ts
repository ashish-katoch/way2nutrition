import 'server-only';
import { randomUUID } from 'node:crypto';
import { CommerceError, commerceRpc, serviceDb } from './db';
import { createRazorpayOrder, paymentsReady, reconcileGatewayOrder } from './payments';

export type CheckoutCustomer = {name:string;email:string;phone:string;address:{line1:string;line2?:string;city:string;state:string;postal_code:string;country:string}};
export type CheckoutInput = {items:{sku:string;quantity:number}[];requestId:string;userId?:string|null;customer:CheckoutCustomer};
type Reservation = {id:string;receipt_token:string;razorpay_order_id:string|null;amount_minor:number;currency:'INR';expires_at:string};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function trimmed(value:unknown,max:number,field:string):string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\x00-\x1f]/.test(value)) throw new CommerceError(400,'Check your '+field+'.');
  return value.trim();
}

function customerDetails(value:CheckoutCustomer) {
  const address = value?.address;
  const email = trimmed(value?.email,254,'email address').toLowerCase();
  const phone = trimmed(value?.phone,25,'phone number');
  const postal = trimmed(address?.postal_code,6,'PIN code');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new CommerceError(400,'Enter a valid email address.');
  if (!/^(?:\+91|91)?[6-9]\d{9}$/.test(phone.replace(/[\s()-]/g,''))) throw new CommerceError(400,'Enter a valid Indian mobile number.');
  if (address.country !== 'IN' || !/^[1-9]\d{5}$/.test(postal)) throw new CommerceError(400,'Enter a valid Indian delivery address and PIN code.');
  return {name:trimmed(value.name,120,'name'),email,phone,address:{
    line1:trimmed(address.line1,200,'street address'),line2:address.line2 ? trimmed(address.line2,200,'address') : '',
    city:trimmed(address.city,100,'city'),state:trimmed(address.state,100,'state'),postal_code:postal,country:'IN'
  }};
}

export async function releaseExpiredReservations() {
  return commerceRpc<number>('expire_reservations',{p_limit:100});
}

export async function beginCheckout(input:CheckoutInput) {
  if (!paymentsReady()) throw new CommerceError(503,'Payments are currently unavailable.');
  if (!input || !uuid.test(input.requestId) || !Array.isArray(input.items) || !input.items.length || input.items.length>50) throw new CommerceError(400,'Check the items in your bag.');
  const items = input.items.map(item => {
    if (!item || typeof item.sku !== 'string' || !item.sku.length || item.sku.length>128 || !Number.isInteger(item.quantity) || item.quantity<1 || item.quantity>99) throw new CommerceError(400,'Check the items in your bag.');
    return {sku:item.sku,quantity:item.quantity};
  });
  const customer = customerDetails(input.customer);
  await releaseExpiredReservations();
  let order = await commerceRpc<Reservation>('reserve_checkout',{p_request:input.requestId,p_user:input.userId ?? null,p_customer:customer,p_items:items});
  const lease = randomUUID();
  if (!order.razorpay_order_id) {
    order = await commerceRpc<Reservation>('claim_gateway',{p_id:order.id,p_lease:lease});
    if (!order.razorpay_order_id) {
      const remote = await createRazorpayOrder({amount:order.amount_minor,currency:order.currency,receipt:order.id});
      order = await commerceRpc<Reservation>('attach_gateway',{p_id:order.id,p_lease:lease,p_gateway:remote.id});
    }
  }
  return {orderId:order.id,receiptToken:order.receipt_token,expiresAt:order.expires_at,keyId:process.env.RAZORPAY_KEY_ID!,
    razorpayOrder:{id:order.razorpay_order_id!,amount:order.amount_minor,currency:order.currency}};
}

export async function getReceipt(token:string) {
  if (!uuid.test(token)) throw new CommerceError(404,'Order not found.');
  const lookup = await serviceDb().from('orders').select('status,razorpay_order_id').eq('receipt_token',token).maybeSingle();
  if(lookup.error) throw new CommerceError(503,'Order lookup is unavailable.');
  if(!lookup.data) throw new CommerceError(404,'Order not found.');
  if(lookup.data.status==='reserved' && lookup.data.razorpay_order_id) await reconcileGatewayOrder(lookup.data.razorpay_order_id);
  await releaseExpiredReservations();
  const {data,error} = await serviceDb().from('orders').select('id,status,fulfillment_status,currency,amount_minor,items,created_at,tracking_number').eq('receipt_token',token).maybeSingle();
  if (error) throw new CommerceError(503,'Order lookup is unavailable.');
  if (!data) throw new CommerceError(404,'Order not found.');
  return data;
}
