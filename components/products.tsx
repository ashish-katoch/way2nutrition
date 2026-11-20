'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import type {Product} from '@/lib/types';
import {useStore} from './store-context';
import Icon from './icon';
export const price=(minor:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(minor/100);
export function useProducts(){
 const [products,setProducts]=useState<Product[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{const abort=new AbortController();fetch('/api/products',{signal:abort.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error);let products=data.products;if(data.demo){try{const saved=JSON.parse(localStorage.getItem('fieldwork.demo.products')||'null');if(Array.isArray(saved))products=saved.filter(p=>p.published).map(p=>({...p,variants:p.variants.filter((v:{enabled:boolean})=>v.enabled)}));}catch{}}setProducts(products);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>setLoading(false));return()=>abort.abort();},[]);
 return {products,error,loading};
}
export function ProductCard({product}:{product:Product}){
 const store=useStore();const v=product.variants.find(v=>v.enabled);
 return <article className="product-card"><Link className="product-photo" href={'/product/'+product.id}><img src={product.image_url} alt={product.name} loading="lazy"/></Link><button className={'save '+(store.saved.includes(product.id)?'selected':'')} disabled={!store.ready} aria-label={'Save '+product.name} aria-pressed={store.saved.includes(product.id)} onClick={()=>store.toggle(product.id)}><Icon name="heart"/></button><small>{product.category}</small><h3><Link href={'/product/'+product.id}>{product.name}</Link></h3><div className="card-price"><span>{v?price(v.price_minor):'Unavailable'}</span><span>{v?.size}</span></div></article>;
}
export function Catalog({savedOnly=false,initialCategory=''}:{savedOnly?:boolean;initialCategory?:string}){
 const {products,error,loading}=useProducts(),store=useStore();
 const [q,setQ]=useState(''),[category,setCategory]=useState(initialCategory),[sort,setSort]=useState('featured');
 useEffect(()=>setCategory(initialCategory),[initialCategory]);
 let filtered=products.filter(p=>(!savedOnly||store.saved.includes(p.id))&&(!category||p.category===category)&&[p.name,p.description,p.category].join(' ').toLowerCase().includes(q.toLowerCase()));
 if(sort==='az')filtered.sort((a,b)=>a.name.localeCompare(b.name));
 if(sort==='low')filtered.sort((a,b)=>(a.variants[0]?.price_minor||0)-(b.variants[0]?.price_minor||0));
 return <section className="page"><div className="page-heading"><div className="eyebrow">{savedOnly?'Your collection':'The NOW market'}</div><h1>{savedOnly?'Saved for later.':'Find your everyday.'}</h1><p>{filtered.length} products</p></div><div className="filters"><label><span className="sr">Search products</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products"/></label><label><span className="sr">Category</span><select value={category} onChange={e=>setCategory(e.target.value)}><option value="">All categories</option>{[...new Set(products.map(p=>p.category))].map(c=><option key={c}>{c}</option>)}</select></label><label><span className="sr">Sort</span><select value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Featured</option><option value="az">Name A–Z</option><option value="low">Price low to high</option></select></label></div>{error?<p role="alert">{error}</p>:loading?<p role="status">Loading the collection…</p>:<div className="product-grid">{filtered.map(p=><ProductCard product={p} key={p.id}/>)}</div>}{!loading&&!filtered.length&&<p>No products found. Try another search.</p>}</section>;
}
