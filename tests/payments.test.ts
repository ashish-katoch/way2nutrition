import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { registerHooks } from 'node:module';

// Next resolves its "server-only" marker and extensionless TypeScript imports at build time.
const hooks = registerHooks({resolve(specifier,context,next) {
  if (specifier === 'server-only') return next('next/dist/compiled/server-only/empty.js',context);
  if (context.parentURL?.includes('/lib/') && /^\.\/(db|payments)$/.test(specifier)) return next(specifier + '.ts',context);
  return next(specifier,context);
}});
const payments = await import(new URL('../lib/payments.ts',import.meta.url).href) as typeof import('../lib/payments');
const commerce = await import(new URL('../lib/commerce.ts',import.meta.url).href) as typeof import('../lib/commerce');
const originalFetch = globalThis.fetch;
const keys = ['STORE_MODE','RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'] as const;
const previous = Object.fromEntries(keys.map(key=>[key,process.env[key]]));
Object.assign(process.env,{STORE_MODE:'demo',RAZORPAY_KEY_ID:'rzp_test_fixture',RAZORPAY_KEY_SECRET:'test-password',RAZORPAY_WEBHOOK_SECRET:'test-webhook',SUPABASE_URL:'https://db.example.test',SUPABASE_SERVICE_ROLE_KEY:'fixture'});
after(() => {
  hooks.deregister();
  globalThis.fetch=originalFetch;
  for (const key of keys) if(previous[key] === undefined) delete process.env[key]; else process.env[key]=previous[key];
});
test('live keys require explicit live mode',() => {
  process.env.RAZORPAY_KEY_ID='rzp_live_fixture';
  assert.equal(payments.paymentsReady(),false);
  process.env.STORE_MODE='live';
  assert.equal(payments.paymentsReady(),true);
  process.env.STORE_MODE='demo';
  process.env.RAZORPAY_KEY_ID='rzp_test_fixture';
  assert.equal(payments.paymentsReady(),true);
});
test('payment signature binds both provider identifiers',() => {
  const signature=createHmac('sha256','test-password').update('order_Test|pay_Test').digest('hex');
  assert.equal(payments.verifyPaymentSignature('order_Test','pay_Test',signature),true);
  assert.equal(payments.verifyPaymentSignature('order_Test','pay_Other',signature),false);
  assert.equal(payments.verifyPaymentSignature('order_Test','pay_Test','invalid'),false);
});
test('webhook validates original bytes before any mutation',async () => {
  const raw='{"event":"ignored"}';
  const sign=createHmac('sha256','test-webhook').update(raw).digest('hex');
  assert.deepEqual(await payments.processWebhook(raw,sign),{received:true});
  await assert.rejects(payments.processWebhook(raw+' ',sign),/signature/);
});
test('gateway recovers existing order by exact receipt and validates amount',async () => {
  let calls=0;
  const order={id:'order_fixture',currency:'INR',amount:19900,receipt:'receipt123'};
  globalThis.fetch=async (url,init)=>{
    calls++;
    assert.equal(init?.method,undefined);
    assert.ok(String(url).endsWith('receipt=receipt123'));
    return Response.json({items:[order]});
  };
  assert.deepEqual(await payments.createRazorpayOrder(order),order);
  assert.equal(calls,1);
  await assert.rejects(payments.createRazorpayOrder({...order,amount:900}),/do not match/);
});
test('validate cart and delivery before reserving stock', async () => {
  let calls=0;
  globalThis.fetch=async ()=>{calls++;throw new Error('Unexpected network request');};
  const input={requestId:crypto.randomUUID(),items:[{sku:'A',quantity:1}],customer:{name:'Guest',email:'guest@example.test',phone:'919876543210',address:{line1:'123 Example',city:'Delhi',state:'Delhi',postal_code:'invalid',country:'IN'}}};
  await assert.rejects(commerce.beginCheckout(input),/PIN code/);
  await assert.rejects(commerce.beginCheckout({...input,items:[{sku:'A',quantity:0}]}),/bag/);
  assert.equal(calls,0);
});
test('receipt reconciliation records only a captured payment belonging to the order',async()=>{
  const urls:string[]=[];
  globalThis.fetch=async(url,init)=>{
    urls.push(String(url));
    if(String(url).includes('api.razorpay.com')) return Response.json({items:[
      {id:'pay_wrong',order_id:'order_other',status:'captured',amount:49900,currency:'INR'},
      {id:'pay_waiting',order_id:'order_fixture',status:'authorized',amount:49900,currency:'INR'},
      {id:'pay_correct',order_id:'order_fixture',status:'captured',amount:49900,currency:'INR'}
    ]});
    assert.ok(String(url).endsWith('/rest/v1/rpc/record_capture'));
    assert.deepEqual(JSON.parse(String(init?.body)),{p_gateway:'order_fixture',p_payment:'pay_correct',p_amount:49900,p_currency:'INR',p_event:'reconcile:pay_correct'});
    return Response.json('paid');
  };
  await payments.reconcileGatewayOrder('order_fixture');
  assert.equal(urls.length,2);
});
test('uncaptured payment remains pending without changing order state',async()=>{
 let calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json({items:[{id:'pay_waiting',order_id:'order_fixture',status:'authorized',amount:49900,currency:'INR'}]});};
 await payments.reconcileGatewayOrder('order_fixture');
 assert.equal(calls,1);
});
