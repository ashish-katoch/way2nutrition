'use client';

import { useEffect, useState } from 'react';
import {getBrowserClient} from '@/lib/browser-auth';
import './admin.css';

const categories = ['Vitamins', 'Minerals', 'Men’s formulas', 'Women’s formulas', 'Other supplements'];
const fulfillmentStates = ['unfulfilled', 'processing', 'shipped', 'delivered'];
const rupees = minor => new Intl.NumberFormat('en-IN', {style:'currency',currency:'INR'}).format(Number(minor || 0) / 100);
const variant = () => ({_rowKey:crypto.randomUUID(), sku:'', size:'', price_minor:0, currency:'INR', stock:0, enabled:false, image_url:''});
const product = () => ({id:'', name:'', category:'Vitamins', description:'', image_url:'', source_url:'', published:false, variants:[variant()]});
const formatDate = value => value ? new Date(value).toLocaleString('en-IN', {dateStyle:'medium',timeStyle:'short'}) : '—';

async function request(path, token, method='GET', data, signal) {
  if(token==='demo-local'){
    const key='fieldwork.demo.products';
    let products;
    try{products=JSON.parse(localStorage.getItem(key)||'null');}catch{}
    if(!Array.isArray(products)){
      const response=await fetch('/api/products',{cache:'no-store'});
      const result=await response.json();
      if(!response.ok||result.demo!==true)throw Error('Demo mode is unavailable when a real store is connected.');
      products=result.products;
    }
    if(path==='/api/admin/orders')return {orders:[]};
    if(path==='/api/admin/upload')throw Error('Image uploads need R2. In this demo, enter an existing HTTPS image URL instead.');
    if(method==='GET')return {products};
    if(method==='POST'&&products.some(p=>p.id===data.id))throw Error('That product ID already exists.');
    for(const v of data.variants){
      if(products.some(p=>p.id!==data.id&&p.variants.some(old=>old.sku===v.sku)))throw Error('That SKU already belongs to another product.');
    }
    const next=method==='POST'?[...products,data]:products.map(p=>p.id===data.id?data:p);
    localStorage.setItem(key,JSON.stringify(next));
    return {saved:true};
  }
  const headers = {Accept:'application/json'};
  if (token) headers.Authorization = 'Bearer ' + token;
  const form = typeof FormData !== 'undefined' && data instanceof FormData;
  if (data && !form) headers['Content-Type'] = 'application/json';
  const response = await fetch(path, {method, headers, body:data ? form ? data : JSON.stringify(data) : undefined, cache:'no-store',signal});
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(typeof result.error === 'string' ? result.error : 'Unable to complete the request.');
    error.status = response.status;
    throw error;
  }
  return result;
}

function SignIn({client}) {
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);setError('');
    try {
      const result = await client.auth.signInWithPassword({email:String(form.get('email')).trim(),password:String(form.get('password'))});
      if (result.error) throw result.error;
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <section className="ad-login"><span className="ad-kicker">Merchant access</span><h1>Store sign in</h1>
    <form onSubmit={submit}><label>Email address<input type="email" name="email" autoComplete="username" required /></label>
    <label>Password<input type="password" name="password" autoComplete="current-password" required /></label>
    <button className="ad-primary" disabled={busy}>{busy?'Signing in…':'Sign in'}</button>
    {error && <p role="alert" className="ad-error">{error}</p>}</form></section>;
}

function ProductEditor({initial, isNew, token, onSaved, onClose}) {
  const [draft,setDraft] = useState(() => ({...product(), ...initial, variants:(initial.variants || []).map(v => ({...variant(), ...v}))}));
  const [busy,setBusy] = useState('');
  const [error,setError] = useState('');
  const set = (key,value) => setDraft(previous => ({...previous,[key]:value}));
  const editVariant = (index,key,value) => setDraft(previous => ({...previous, variants:previous.variants.map((v,i) => i===index ? {...v,[key]:value} : v)}));
  async function upload(event) {
    const file=event.target.files?.[0];
    if (!file) return;
    event.target.value='';
    setBusy('upload');setError('');
    try {
      const form = new FormData();form.append('file',file);
      const {url} = await request('/api/admin/upload',token,'POST',form);
      if (!url) throw Error('The upload returned no image URL.');
      set('image_url',url);
    } catch (e) {setError(e.message);}
    finally {setBusy('');}
  }
  async function submit(event) {
    event.preventDefault();setError('');
    const payload = {...draft,id:draft.id.trim(),name:draft.name.trim(),category:draft.category.trim(),variants:draft.variants.map(({_rowKey,...v}) => ({...v,sku:v.sku.trim(),size:v.size.trim(),price_minor:Number(v.price_minor),stock:Number(v.stock),original_stock:initial.variants?.find(old=>old.sku===v.sku)?.stock ?? null,currency:'INR'}))};
    if (!payload.variants.length) {setError('Add a pack size before saving.');return;}
    if (new Set(payload.variants.map(v=>v.sku)).size !== payload.variants.length) {setError('Each pack size needs a unique SKU.');return;}
    if (payload.variants.some(v => v.enabled && v.price_minor<=0)) {setError('Enter a positive INR price for every enabled pack size.');return;}
    setBusy('save');
    try {
      await request(isNew?'/api/admin/products':'/api/admin/products/'+encodeURIComponent(payload.id),token,isNew?'POST':'PUT',payload);
      onSaved(payload);
    } catch (e) {setError(e.message);setBusy('');}
  }
  return <section className="ad-editor"><div className="ad-editor-head"><div><span className="ad-kicker">Catalog</span><h2>{isNew?'New product':initial.name}</h2></div>
    <button className="ad-outline" onClick={onClose} disabled={!!busy}>Back to products</button></div>
    <form onSubmit={submit}><fieldset disabled={!!busy} className="ad-fields"><legend>Product information</legend>
      <div className="ad-form-grid">
        <label>Product name<input value={draft.name} required onChange={e=>set('name',e.target.value)} /></label>
        <label>Product ID<input value={draft.id} required disabled={!isNew} pattern="[a-z0-9][a-z0-9-]*" title="Lowercase letters, numbers and hyphens" onChange={e=>set('id',e.target.value)} /></label>
        <label>Category<input list="admin-categories" required value={draft.category} onChange={e=>set('category',e.target.value)} /><datalist id="admin-categories">{categories.map(c=><option key={c} value={c}/>)}</datalist></label>
        <label>Manufacturer page<input type="url" value={draft.source_url || ''} onChange={e=>set('source_url',e.target.value)} /></label>
      </div>
      <label>Description<textarea rows="3" value={draft.description || ''} onChange={e=>set('description',e.target.value)} /></label>
      <div className="ad-image-row">{draft.image_url && <img src={draft.image_url} alt={draft.name || 'Product preview'} />}
        <div><label>Product image URL<input value={draft.image_url || ''} onChange={e=>set('image_url',e.target.value)} /></label>
        <label>Upload product image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} /></label></div></div>
      <label className="ad-switch"><input type="checkbox" checked={!!draft.published} onChange={e=>set('published',e.target.checked)} /> Publish in storefront</label>
    </fieldset>
    <fieldset disabled={!!busy} className="ad-fields"><legend>Pack sizes and inventory</legend>
      {draft.variants.map((v,i)=><div className="ad-variant" key={v._rowKey}>
        <div className="ad-form-grid"><label>SKU<input value={v.sku} required onChange={e=>editVariant(i,'sku',e.target.value)} /></label>
        <label>Pack size<input value={v.size} required onChange={e=>editVariant(i,'size',e.target.value)} /></label>
        <label>Price (INR)<input type="number" min="0" max="21474836.47" step="0.01" required defaultValue={Number(v.price_minor)/100} onChange={e=>editVariant(i,'price_minor',Math.round(Number(e.target.value)*100))} /></label>
        <label>Available stock<input type="number" min="0" step="1" required value={v.stock} onChange={e=>editVariant(i,'stock',e.target.value)} /></label></div>
        <div className="ad-between"><label className="ad-switch"><input type="checkbox" checked={!!v.enabled} onChange={e=>editVariant(i,'enabled',e.target.checked)} /> Enable for sale</label>
          <button type="button" className="ad-text" disabled={draft.variants.length===1} onClick={()=>set('variants',draft.variants.filter((_,idx)=>idx!==i))}>Remove pack</button></div>
      </div>)}
      <button type="button" className="ad-outline" onClick={()=>set('variants',[...draft.variants,variant()])}>Add pack size</button>
    </fieldset>
    {error && <p role="alert" className="ad-error">{error}</p>}
    <div className="ad-bottom"><button className="ad-primary" disabled={!!busy}>{busy==='save'?'Saving…':busy==='upload'?'Uploading…':'Save product'}</button></div></form>
  </section>;
}

function ProductTable({products,onEdit,onCreate}) {
  const [query,setQuery] = useState('');
  const [page,setPage] = useState(1);
  const rows = products.filter(p => [p.name,p.id,p.category,...(p.variants||[]).map(v=>v.sku)].join(' ').toLowerCase().includes(query.toLowerCase()));
  const pages = Math.max(1,Math.ceil(rows.length/20));
  const current = Math.min(page,pages);
  return <><div className="ad-heading"><div><span className="ad-kicker">Catalog</span><h1>Products</h1></div><button className="ad-primary" onClick={onCreate}>Add product</button></div>
    <div className="ad-filters"><input aria-label="Search products" type="search" placeholder="Search products or SKU" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}} /><span>{rows.length} products</span></div>
    <div className="ad-scroll"><table><thead><tr><th>Product</th><th>Inventory</th><th>Status</th><th><span className="ad-sr">Actions</span></th></tr></thead>
    <tbody>{rows.slice((current-1)*20,current*20).map(p=><tr key={p.id}><td><button className="ad-item" onClick={()=>onEdit(p)}>{p.image_url && <img src={p.image_url} alt="" loading="lazy"/>}<span><strong>{p.name}</strong><small>{p.category}</small></span></button></td>
       <td>{(p.variants||[]).reduce((sum,v)=>sum+Number(v.stock||0),0)} units<small>{(p.variants||[]).length} pack sizes</small></td>
       <td><span className={'ad-status '+(p.published?'ad-green':'')}>{p.published?'Published':'Hidden'}</span></td><td><button className="ad-text" onClick={()=>onEdit(p)}>Edit</button></td></tr>)}</tbody></table></div>
    {!rows.length && <p className="ad-empty">No products match this view.</p>}
    {pages>1 && <div className="ad-pagination"><button className="ad-outline" disabled={current===1} onClick={()=>setPage(current-1)}>Previous</button><span>{current} / {pages}</span><button className="ad-outline" disabled={current===pages} onClick={()=>setPage(current+1)}>Next</button></div>}</>;
}

function Orders({orders,token,onUpdate}) {
  const [busy,setBusy] = useState(''), [error,setError] = useState('');
  const [filter,setFilter] = useState('');
  const filtered = orders.filter(o=>!filter || o.fulfillment_status===filter);
  async function update(id,status) {
    setBusy(id);setError('');
    try {await request('/api/admin/orders',token,'PATCH',{id,fulfillment_status:status});onUpdate(id,status);}
    catch(e){setError(e.message);}finally{setBusy('');}
  }
  return <><div className="ad-heading"><div><span className="ad-kicker">Sales</span><h1>Orders</h1></div></div>
    <div className="ad-filters"><select aria-label="Filter orders by fulfillment" value={filter} onChange={e=>setFilter(e.target.value)}><option value="">All fulfillment states</option>{fulfillmentStates.map(s=><option key={s} value={s}>{s}</option>)}</select><span>{filtered.length} orders</span></div>
    {error && <p role="alert" className="ad-error">{error}</p>}
    {filtered.map(order=>{
      const c=order.customer||{}, address=c.address || c.shipping_address || {};
      const delivery = typeof address==='string'?address:[address.line1,address.line2,address.city,address.state,address.postal_code||address.pincode,address.country].filter(Boolean).join(', ');
      return <details className="ad-order" key={order.id}><summary><div><strong>{c.name || 'Order '+String(order.id).slice(0,8)}</strong><small>{formatDate(order.created_at)}</small></div><div><span className={'ad-status '+(order.status==='paid'?'ad-green':'')}>{order.status}</span><strong>{rupees(order.total_minor??order.amount_minor)}</strong></div></summary>
        <div className="ad-order-body"><div><h3>Delivery</h3><p>{[c.name,c.email,c.phone,delivery].filter(Boolean).join('\n') || 'No customer information recorded.'}</p><small>Order {order.id}</small></div>
        <div><h3>Items</h3><ul>{(order.items||[]).map((item,i)=><li key={i}>{item.quantity} × {item.name} {item.size && '· '+item.size}</li>)}</ul>
        <label>Fulfillment<select value={order.fulfillment_status} disabled={!!busy||order.status!=='paid'} onChange={e=>update(order.id,e.target.value)}>{fulfillmentStates.map(s=><option value={s} key={s}>{s}</option>)}</select></label></div></div>
      </details>;})}
    {!filtered.length && <p className="ad-empty">No orders in this view.</p>}</>;
}

function Dashboard({token,signOut}) {
  const [tab,setTab] = useState('products'), [products,setProducts] = useState([]), [orders,setOrders] = useState([]);
  const [editor,setEditor] = useState(null), [loading,setLoading] = useState(true), [error,setError] = useState(''), [message,setMessage] = useState(''), [reload,setReload] = useState(0);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');
    request('/api/admin/'+tab,token,'GET',undefined,controller.signal).then(data=>{
      if(controller.signal.aborted)return;
      if(tab==='products')setProducts(data.products||[]);else setOrders(data.orders||[]);
    }).catch(e=>{if(!controller.signal.aborted)setError(e.status===403?'This account does not have store administrator access.':e.message);})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[tab,token,reload]);
  function changeTab(next){setTab(next);setEditor(null);setMessage('');}
  return <><nav className="ad-tabs" aria-label="Store management"><button aria-pressed={tab==='products'} onClick={()=>changeTab('products')}>Products</button>
    <button aria-pressed={tab==='orders'} onClick={()=>changeTab('orders')}>Orders</button><button onClick={signOut}>{token==='demo-local'?'Reset demo products':'Sign out'}</button></nav>
    {message && <p className="ad-success" role="status">{message}</p>}
    {loading?<p role="status" className="ad-empty">Loading {tab}…</p>:error?<div className="ad-empty"><p role="alert">{error}</p><button className="ad-outline" onClick={()=>setReload(n=>n+1)}>Retry</button></div>:editor?
    <ProductEditor initial={editor.initial} isNew={editor.isNew} token={token} onClose={()=>setEditor(null)} onSaved={p=>{setMessage(p.name+' saved.');setEditor(null);setReload(n=>n+1);}}/>:
    tab==='products'?<ProductTable products={products} onEdit={p=>{setMessage('');setEditor({initial:p,isNew:false});}} onCreate={()=>{setMessage('');setEditor({initial:product(),isNew:true});}}/>:
    <Orders orders={orders} token={token} onUpdate={(id,status)=>setOrders(previous=>previous.map(o=>o.id===id?{...o,fulfillment_status:status}:o))}/>}</>;
}

export default function AdminPage() {
  const [client,setClient] = useState(null), [session,setSession] = useState(null), [loading,setLoading] = useState(true), [error,setError] = useState(''), [demo,setDemo] = useState(false);
  useEffect(()=>{
    let active=true,subscription;
    async function initialize(){
      try {
        const cfg=await request('/api/config');
        if(!cfg.configured){if(active){setDemo(true);setLoading(false);}return;}
        if(!cfg.supabaseUrl || !cfg.supabaseAnonKey)throw Error('Merchant sign-in configuration is incomplete.');
        const authClient=await getBrowserClient();
        if(!active)return;
        setClient(authClient);
        subscription=authClient.auth.onAuthStateChange((_event,next)=>{if(active){setSession(next);setLoading(false);}}).data.subscription;
      }catch(e){if(active){setError(e.message);setLoading(false);}}
    }
    initialize();return()=>{active=false;subscription?.unsubscribe();};
  },[]);
  async function signOut(){if(demo){localStorage.removeItem('fieldwork.demo.products');location.reload();return;}const {error}=await client.auth.signOut({scope:'local'});if(error)setError(error.message);else setSession(null);}
  return <section className="ad-shell"><header className="ad-header"><a href="/" className="ad-brand">Way2Nutrition</a><span>Merchant studio</span><a href="/" className="ad-store">View storefront ↗</a></header>
    <div className="ad-content">{demo&&<aside className="ad-demo-notice"><strong>Sample product studio</strong><p>Demo mode · Changes are saved only in this browser and appear in your storefront preview. Connect Supabase for secure sign-in, shared inventory and real orders. Payments remain disabled.</p><a href="/">Preview storefront ↗</a></aside>}{loading?<p role="status">Loading merchant studio…</p>:error?<section className="ad-login"><h1>Merchant access</h1><p role="alert">{error}</p><button className="ad-outline" onClick={()=>location.reload()}>Retry</button></section>:demo?<Dashboard token="demo-local" signOut={signOut}/>:session?
    <Dashboard token={session.access_token} signOut={signOut}/>:<SignIn client={client}/>}</div></section>;
}
