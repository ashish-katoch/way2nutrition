'use client';
import Link from 'next/link';
import {useStore} from './store-context';
import {useProducts,price} from './products';
export default function Bag(){
 const store=useStore(),{products,error,loading}=useProducts();
 const rows=store.bag.map(item=>({item,product:products.find(p=>p.id===item.id),variant:products.find(p=>p.id===item.id)?.variants.find(v=>v.sku===item.sku)}));
 const total=rows.reduce((sum,{item,variant})=>sum+(variant?.price_minor||0)*item.quantity,0);
 return <section className="page"><div className="page-heading"><div className="eyebrow">Your collection</div><h1>Your bag.</h1></div>{error?<p role="alert">{error}</p>:loading?<p>Loading your bag…</p>:!rows.length?<div className="empty"><h2>A little room for wellness.</h2><Link className="button" href="/shop">Explore supplements ↗</Link></div>:<div className="bag-layout"><div>{rows.map(({item,product,variant})=><article className="bag-line" key={item.sku}><img src={product?.image_url} alt={product?.name||'Unavailable product'}/><div><Link href={'/product/'+item.id}>{product?.name||'Unavailable product'}</Link><p>{variant?.size||item.sku}</p><label>Quantity<input aria-label={'Quantity for '+product?.name} type="number" min="1" max="99" value={item.quantity} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>0)store.quantity(item.sku,n);}}/></label><button onClick={()=>store.quantity(item.sku,0)}>Remove</button></div><strong>{variant?price(variant.price_minor*item.quantity):'Unavailable'}</strong></article>)}</div><aside className="summary"><h2>Order summary.</h2><div><span>Subtotal</span><strong>{price(total)}</strong></div><p>Delivery is included. Displayed prices include applicable tax. Your final total is verified securely before payment.</p><Link className="button" href="/checkout">Review checkout ↗</Link></aside></div>}</section>;
}
