'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {price} from './products';
import {useStore} from './store-context';
type ReceiptData={id:string;status:string;fulfillment_status:string;amount_minor:number;items:{sku:string;name:string;size:string;quantity:number;unit_price_minor:number}[];tracking_number?:string};
export default function Receipt({token}:{token:string}){
 const [receipt,setReceipt]=useState<ReceiptData>(),[error,setError]=useState(''),[tick,setTick]=useState(0),store=useStore();
 useEffect(()=>{const abort=new AbortController();fetch('/api/orders/'+encodeURIComponent(token),{signal:abort.signal,cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error);setReceipt(data);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>abort.abort();},[token,tick]);
 useEffect(()=>{
  if(receipt?.status!=='paid'||!store.ready)return;
  const key='fieldwork.order.'+token;let ordered;
  try{ordered=JSON.parse(sessionStorage.getItem(key)||'null');}catch{}
  if(Array.isArray(ordered)){
   // Remove only quantities from this checkout, preserving items added later.
   sessionStorage.removeItem(key);
   store.consume(ordered);
  }
 },[receipt?.status,store.ready]); // The session marker makes payment reconciliation idempotent.
 return <section className="page"><div className="page-heading"><div className="eyebrow">Order status</div><h1>{receipt?.status==='paid'?'Thank you.':receipt?.status==='expired'?'Checkout expired.':'Your order.'}</h1></div>{error?<div role="alert"><p>{error}</p><button className="button" onClick={()=>{setError('');setTick(tick+1);}}>Refresh status</button></div>:!receipt?<p>Checking your order…</p>:<div className="bag-layout"><section className="checkout-card"><h2>{receipt.status==='paid'?'Payment received.':receipt.status==='expired'?'Return to your bag to start again.':'Payment is awaiting confirmation.'}</h2><p>Order {receipt.id}</p><p>Fulfillment · {receipt.fulfillment_status}</p>{receipt.tracking_number&&<p>Tracking reference · {receipt.tracking_number}</p>}{receipt.status!=='paid'&&<button className="button" onClick={()=>setTick(tick+1)}>Refresh status</button>}<p>Keep this private link to check your order.</p><Link href="/shop">Continue shopping ↗</Link></section><aside className="summary"><h2>Order details.</h2>{receipt.items.map(item=><div key={item.sku}><span>{item.name} · {item.size} × {item.quantity}</span><strong>{price(item.unit_price_minor*item.quantity)}</strong></div>)}<div className="summary-total"><span>Total</span><strong>{price(receipt.amount_minor)}</strong></div></aside></div>}</section>;
}
