'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {accountRequest,getBrowserClient} from '@/lib/browser-auth';
import {useAuth} from './auth-context';
import {useStore} from './store-context';
import {price,useProducts} from './products';
type RazorpayResponse={razorpay_order_id:string;razorpay_payment_id:string;razorpay_signature:string};
type RazorpayOptions={key:string;order_id:string;amount:number;currency:string;name:string;prefill:{name:string;email:string;contact:string};handler:(response:RazorpayResponse)=>void;modal:{ondismiss:()=>void}};
declare global {interface Window{Razorpay:new(options:RazorpayOptions)=>{open:()=>void};}}
async function request(path:string,body?:unknown){
 const headers:Record<string,string>={'Content-Type':'application/json'};
 if(path==='/api/checkout'){const auth=await getBrowserClient();const {data}=await auth.auth.getSession();if(data.session)headers.Authorization='Bearer '+data.session.access_token;}
 const r=await fetch(path,body?{method:'POST',headers,body:JSON.stringify(body)}:{cache:'no-store'});
 const data=await r.json();if(!r.ok)throw Error(data.error||'Unable to complete checkout.');return data;
}
let razorpayPromise:Promise<void>|undefined;
function loadRazorpay(){
 if(window.Razorpay)return Promise.resolve();
 if(!razorpayPromise)razorpayPromise=new Promise<void>((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';
  script.onload=()=>resolve();script.onerror=()=>{razorpayPromise=undefined;script.remove();reject(Error('Payment form could not load. Please retry.'));};document.body.append(script);
 });
 return razorpayPromise;
}
export default function Checkout(){
 const auth=useAuth();
 const store=useStore(),{products,error,loading}=useProducts(),router=useRouter(),form=useRef<HTMLFormElement>(null);
 const [enabled,setEnabled]=useState(false),[configured,setConfigured]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
 const pending=useRef<{fingerprint:string;id:string}|undefined>(undefined);
 useEffect(()=>{request('/api/config').then(c=>{setEnabled(c.checkoutEnabled);setConfigured(c.configured);}).catch(()=>setStatus('Checkout settings could not load.'));},[]);
 const rows=store.bag.map(item=>({item,product:products.find(p=>p.id===item.id),variant:products.find(p=>p.id===item.id)?.variants.find(v=>v.sku===item.sku)}));
 const total=rows.reduce((sum,{variant,item})=>sum+(variant?.price_minor||0)*item.quantity,0);
 const valid=rows.length>0&&rows.every(({variant,item})=>variant&&variant.enabled&&variant.price_minor>0&&variant.stock>=item.quantity);
 useEffect(()=>{
  if(!auth.session||loading||!form.current)return;let active=true;
  accountRequest<{profile:{full_name?:string;phone?:string;address?:Record<string,string>}|null}>('/api/account/profile').then(({profile})=>{
   if(!active||!form.current)return;
   const values:Record<string,string>={email:auth.session!.user.email||'',name:profile?.full_name||auth.session!.user.user_metadata?.display_name||'',phone:profile?.phone||'',...(profile?.address||{})};
   for(const [key,value] of Object.entries(values)){const input=form.current.elements.namedItem(key);if(input instanceof HTMLInputElement&&!input.value)input.value=value;}
  }).catch(()=>{});
  return()=>{active=false;};
 },[auth.session?.user.id,loading,rows.length]);

 async function pay(e:React.FormEvent){
  e.preventDefault();if(!form.current||!form.current.reportValidity())return;
  setBusy(true);setStatus('Preparing your order…');
  const values=new FormData(form.current);
  const value=(key:string)=>String(values.get(key)||'').trim();
  const customer={email:value('email'),name:value('name'),phone:value('phone'),address:{line1:value('line1'),line2:value('line2'),city:value('city'),state:value('state'),postal_code:value('postal_code'),country:'IN'}};
  const items=store.bag.map(({sku,quantity})=>({sku,quantity}));
  const fingerprint=JSON.stringify({items,customer});
  if(pending.current?.fingerprint!==fingerprint)pending.current={fingerprint,id:crypto.randomUUID()};
  try{
   await loadRazorpay();
   const order=await request('/api/checkout',{requestId:pending.current.id,items,customer});
   sessionStorage.setItem('fieldwork.order.'+order.receiptToken,JSON.stringify(store.bag));
   const options:RazorpayOptions={
    key:order.keyId,order_id:order.razorpayOrder.id,amount:order.razorpayOrder.amount,currency:order.razorpayOrder.currency,name:'Way2Nutrition',
    prefill:{email:customer.email,name:customer.name,contact:customer.phone},
    handler:async response=>{
     try{await request('/api/payments/verify',{...response,receiptToken:order.receiptToken});router.push('/order/'+order.receiptToken);}
     catch{setStatus('We are checking your payment. Open order status before paying again.');router.push('/order/'+order.receiptToken);}
    },
    modal:{ondismiss:()=>{setBusy(false);setStatus('Payment window closed. Your bag is saved.');}}
   };
   new window.Razorpay(options).open();setStatus('Complete payment in the secure Razorpay window.');
  }catch(e){setStatus(e instanceof Error?e.message:'Checkout unavailable.');setBusy(false);pending.current=undefined;}
 }
 return <section className="page"><div className="page-heading"><div className="eyebrow">Your order</div><h1>Almost yours.</h1></div>{loading?<p>Loading checkout…</p>:error?<p role="alert">{error}</p>:!rows.length?<div className="empty"><h2>Your bag is empty.</h2><Link href="/shop" className="button">Explore products ↗</Link></div>:<form ref={form} onSubmit={pay} className="checkout-layout"><div><section className="checkout-card"><div className="eyebrow">Contact & delivery</div>{auth.session?<p className="small-note">This order will appear in your account history.</p>:<p className="small-note"><Link href="/account/login?next=/checkout">Sign in</Link> to save this order to your account, or continue as a guest.</p>}<h2>Where should it go?</h2><div className="field-grid"><label>Email<input required type="email" name="email" autoComplete="email" maxLength={254}/></label><label>Full name<input required name="name" autoComplete="name" maxLength={120}/></label><label>Phone<input required type="tel" name="phone" autoComplete="tel" pattern="[+0-9 ()-]{8,20}" maxLength={20}/></label><label>Country<input value="India" readOnly aria-label="Delivery country"/></label><label className="wide">Address<input required name="line1" autoComplete="address-line1" maxLength={200}/></label><label className="wide">Apartment or landmark (optional)<input name="line2" autoComplete="address-line2" maxLength={200}/></label><label>City<input required name="city" autoComplete="address-level2" maxLength={100}/></label><label>State<input required name="state" autoComplete="address-level1" maxLength={100}/></label><label>PIN code<input required name="postal_code" autoComplete="postal-code" pattern="[0-9]{6}" maxLength={6}/></label></div></section><p className="small-note">Your delivery details are used to fulfill your order. <Link href="/privacy">Shopping privacy</Link></p></div><aside className="summary"><h2>Your everyday essentials.</h2>{rows.map(({item,product,variant})=><div className="checkout-line" key={item.sku}><img src={product?.image_url} alt=""/><span>{product?.name}<small>{variant?.size} · Qty {item.quantity}</small></span><strong>{price((variant?.price_minor||0)*item.quantity)}</strong></div>)}<div className="summary-total"><span>Items subtotal</span><strong>{price(total)}</strong></div><p>Delivery is included. Displayed prices include applicable tax. Your final total is verified securely before payment.</p>{!enabled&&<p className="notice-box">{configured?'Payments are being configured.':'Demo store. Connect Supabase and Razorpay to test checkout.'}</p>}{!valid&&<p role="alert">A product is unavailable or its quantity exceeds available stock. <Link href="/bag">Update your bag</Link>.</p>}<button className="button" disabled={!enabled||!valid||busy} type="submit">{busy?'Preparing payment…':'Continue to secure payment'}</button><p role="status" className="status">{status}</p><small>Payments powered by Razorpay</small></aside></form>}</section>;
}
