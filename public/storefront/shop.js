(() => {
  'use strict';
  const PAGE_SIZE = 24;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const attr = escape;
  const enc = encodeURIComponent;
  const money = n => typeof n === 'number' && Number.isFinite(n) ? new Intl.NumberFormat('en-US',{style:'currency',currency:'INR'}).format(n) : 'Price unavailable';
  const productHref = id => '#/product/' + enc(id);
  const priceOf = p => p.price ?? p.variants?.find(v => v.price != null)?.price;
  const icon = name => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ({heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',arrow:'M4 12h15m-6-6 6 6-6 6',search:'M20 20l-5-5m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0'}[name]) + '"/></svg>';
  let dataPromise;
  async function catalog() {
    if (!dataPromise) dataPromise = fetch('/api/products').then(async r => {
      if (!r.ok) throw Error('Catalog unavailable');
      const result = await r.json();
      let products=result.products;
      if(result.demo){try{const saved=JSON.parse(localStorage.getItem('fieldwork.demo.products')||'null');if(Array.isArray(saved))products=saved;}catch{}}
      if (!Array.isArray(products)) throw Error('Catalog unavailable');
      return products.filter(p=>p.published).map(p=>({...p,image:p.image_url,url:p.source_url,variants:p.variants.filter(v=>v.enabled).map(v=>({...v,price:v.price_minor/100,image:v.image_url||p.image_url})),price:p.variants.find(v=>v.enabled)?.price_minor/100}));
    }).catch(error => { dataPromise = null; throw error; });
    return dataPromise;
  }
  const storeKey = key => 'fieldwork.next.' + key;
  const memory = new Map();
  function read(key, fallback) {
    try { const value = localStorage.getItem(storeKey(key)); return value ? JSON.parse(value) : memory.get(key) ?? fallback; }
    catch { return memory.get(key) ?? fallback; }
  }
  function write(key, value) {
    memory.set(key,value);
    try { localStorage.setItem(storeKey(key),JSON.stringify(value)); } catch {}
    window.dispatchEvent(new Event('fieldwork:change'));
  }
  function list(key) { const value = read(key,[]); return Array.isArray(value) ? value : []; }
  const bag = () => list('bag').filter(v => v && typeof v.id === 'string' && typeof v.sku === 'string' && Number.isInteger(v.quantity) && v.quantity > 0 && v.quantity <= 99);
  const saved = () => {let owner='guest';try{owner=localStorage.getItem('fieldwork.saved.owner')||'guest';}catch{}if(owner!=='guest'&&owner!==window.Way2NutritionUserId)return [];return list('saved').filter(v=>typeof v==='string');};
  const isSaved = id => saved().includes(String(id));
  function toggleSave(id) {id=String(id);if(!window.Way2NutritionSavedReady)return isSaved(id);const next=isSaved(id)?saved().filter(x=>x!==id):[...saved(),id];write('saved',next);const state=next.includes(id);window.dispatchEvent(new CustomEvent('fieldwork:saved-change',{detail:{id,saved:state}}));return state;}
  function add(id,sku,quantity=1) {
    if (!id || !sku || !Number.isInteger(quantity) || quantity < 1) return;
    const entries = bag(), match = entries.find(i => i.id === String(id) && i.sku === String(sku));
    if (match) match.quantity = Math.min(99,match.quantity + quantity);
    else entries.push({id:String(id),sku:String(sku),quantity:Math.min(99,quantity)});
    write('bag',entries);
  }
  const bagCount = () => bag().reduce((sum, i) => sum + i.quantity,0);
  function setBagQuantity(id,sku,quantity) {
    const rows=bag().map(item=>item.id===id && item.sku===sku?{...item,quantity}:item).filter(item=>item.quantity>0);
    write('bag',rows);
    if (/^#\/(bag|checkout)(?:[?]|$)/.test(location.hash)) renderShop();
  }
  window.Way2NutritionShop = {catalog,bag,setBagQuantity,bagCount,savedCount:() => saved().length,toggleSave,isSaved,add};
  window.addEventListener('storage',e => {if (!e.key || e.key.startsWith('fieldwork.')) {window.dispatchEvent(new Event('fieldwork:change')); if (/^#\/(bag|saved|checkout)(?:[?]|$)/.test(location.hash)) renderShop();}});
  const app = () => document.getElementById('app');
  const route = () => {const hash=location.hash.slice(1), pos=hash.indexOf('?');return {path:pos<0?hash:hash.slice(0,pos),params:new URLSearchParams(pos<0?'':hash.slice(pos+1))};};
  const routeWith = (changes,base=route()) => {const params=new URLSearchParams(base.params); for (const [k,v] of Object.entries(changes)) { if (v==null || v==='') params.delete(k); else params.set(k,v); } const q=params.toString();return '#'+base.path+(q?'?'+q:'');};
  const button = (label, href, quiet=false) => '<a class="'+(quiet?'fw-quiet':'fw-action')+'" href="'+attr(href)+'">'+escape(label)+(quiet?'':icon('arrow'))+'</a>';
  const crumbs = links => '<nav class="fw-path" aria-label="Breadcrumb"><a href="#/">Home</a>'+links.map(([title,url])=>' <span aria-hidden="true">/</span> '+(url?'<a href="'+attr(url)+'">'+escape(title)+'</a>':'<span aria-current="page">'+escape(title)+'</span>')).join('')+'</nav>';
  const title = (label,count='') => '<div class="fw-intro"><h1 class="fw-heading">'+escape(label)+'</h1><span class="fw-count">'+escape(count)+'</span></div>';
  const empty = (heading,copy,label='Explore products',href='#/shop') => '<section class="fw-empty"><h2 class="fw-title">'+escape(heading)+'</h2><p>'+escape(copy)+'</p>'+button(label,href)+'</section>';
  const shell = content => '<section class="fw-screen"><div class="fw-inner">'+content+'</div></section>';
  function image(src,name,lazy=true) {
    if (!src || !/^(https?:\/\/|\.?\/?[a-z\d_%+-])/i.test(src)) return '<span class="fw-placeholder" aria-hidden="true">NOW®</span>';
    return '<img src="'+attr(src)+'" alt="'+attr(name)+'" '+(lazy?'loading="lazy" ':'')+'decoding="async">';
  }
  document.addEventListener('error', e => {
    const el=e.target; if (el instanceof HTMLImageElement && el.closest('.fw-screen')) {const span=document.createElement('span');span.className='fw-placeholder';span.textContent='NOW®';el.replaceWith(span);}
  },true);
  const saveButton = p => '<button type="button" class="fw-save" data-save="'+attr(p.id)+'" aria-label="'+attr('Save '+p.name)+'" aria-pressed="'+isSaved(p.id)+'" '+(!window.Way2NutritionSavedReady?'disabled':'')+'>'+icon('heart')+'</button>';
  function card(p) { const link=productHref(p.id);return '<article class="fw-card">'+saveButton(p)+'<a class="fw-tile" href="'+attr(link)+'" aria-label="'+attr(p.name)+'">'+image(p.image,p.name)+'</a><small>'+escape(p.category)+'</small><h3><a href="'+attr(link)+'">'+escape(p.name)+'</a></h3><span class="fw-money">'+(new Set(p.variants.map(v=>v.price).filter(n=>n!=null)).size>1?'From ':'')+money(priceOf(p))+'</span></article>'; }
  const grid = products => '<div class="fw-grid">'+products.map(card).join('')+'</div>';
  function listing(data,params) {
    const categories=[...new Set(data.map(p=>p.category).filter(Boolean))].sort();
    const category=params.get('category')||'', q=(params.get('q')||'').trim(), sort=params.get('sort')||'featured';
    let rows=data.filter(p => (!category || p.category.toLowerCase()===category.toLowerCase()) && (!q || [p.name,p.category,p.description,...(p.variants||[]).map(v=>v.sku)].join(' ').toLowerCase().includes(q.toLowerCase())));
    if (sort==='az') rows.sort((a,b)=>a.name.localeCompare(b.name));
    if (sort==='low' || sort==='high') rows.sort((a,b)=> {const x=priceOf(a), y=priceOf(b);return x==null?Number(y!=null):y==null?-1:(x-y)*(sort==='low'?1:-1);});
    const pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE)), page=Math.max(1,Math.min(pages,parseInt(params.get('page'),10)||1));
    const option=(value,text,current)=>'<option value="'+attr(value)+'"'+(value.toLowerCase()===current.toLowerCase()?' selected':'')+'>'+escape(text)+'</option>';
    const tools='<div class="fw-toolbar"><form class="fw-search" role="search" data-search>'+icon('search')+'<input type="search" name="q" value="'+attr(q)+'" placeholder="Search products" aria-label="Search products"><button type="submit" aria-label="Submit search">'+icon('arrow')+'</button></form><div class="fw-tools"><label class="fw-select"><span class="fw-hidden">Category</span><select data-filter="category">'+option('','All categories',category)+categories.map(c=>option(c,c,category)).join('')+'</select></label><label class="fw-select"><span class="fw-hidden">Sort products</span><select data-filter="sort">'+[['featured','Featured'],['low','Price: low to high'],['high','Price: high to low'],['az','Name: A–Z']].map(([v,l])=>option(v,l,sort)).join('')+'</select></label></div></div>';
    const chips=[['q',q],['category',category]].filter(([,v])=>v).map(([k,v])=>'<a class="fw-chip" aria-label="'+attr('Remove filter '+v)+'" href="'+attr(routeWith({[k]:null,page:null}))+'">'+escape(v)+' ×</a>').join('');
    const pagination=pages>1?'<nav class="fw-pages" aria-label="Catalog pages">'+(page>1?button('Previous',routeWith({page:page-1}),true):'')+'<span>Page '+page+' of '+pages+'</span>'+(page<pages?button('Next',routeWith({page:page+1}),true):'')+'</nav>':'';
    return crumbs([['Shop']])+title(q?'Search results':category||'Shop all products',rows.length+' products')+tools+chips+(rows.length?grid(rows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE))+pagination:empty('No products found','Try another name or choose a different category.','Clear filters','#/shop'));
  }
  function quantity(count,kind,index='',max=99) {return '<div class="fw-qty" aria-label="Quantity"><button data-qty="-1" data-kind="'+kind+'" data-index="'+index+'" aria-label="Decrease quantity" '+(count<=1?'disabled':'')+'>−</button><span>'+count+'</span><button data-qty="1" data-kind="'+kind+'" data-index="'+index+'" aria-label="Increase quantity" '+(count>=max?'disabled':'')+'>+</button></div>';}
  let detailState={};
  function detail(p,data) {
    const variants=p.variants||[],v=variants.find(x=>String(x.sku)===detailState.sku)||variants[0],price=v?v.price:p.price;
    const available=!!v&&price>0&&(v.stock==null||v.stock>0),maxQty=Math.max(1,Math.min(99,v?.stock??99));
    detailState.qty=Math.min(detailState.qty||1,maxQty);
    const demo=p.id.startsWith('sample-'),photo=v?.image||p.image,shortDescription=demo&&p.description?.startsWith('Demonstration product')?'A sample listing to explore your store. Final product information will be added before selling.':p.description;
    const chevron='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m6 9 6 6 6-6"/></svg>';
    const official=/^https:\/\/(www\.)?nowfoods\.com\//i.test(p.url||'')?'<a class="pdp-text-link" target="_blank" rel="noopener noreferrer" href="'+attr(p.url)+'">Manufacturer information '+icon('arrow')+'</a>':'';
    const details=(label,body,open=false)=>'<details'+(open?' open':'')+'><summary>'+label+chevron+'</summary><div class="pdp-accordion-content">'+body+'</div></details>';
    const related=[...data.filter(x=>x.category===p.category&&x.id!==p.id),...data.filter(x=>x.category!==p.category&&x.id!==p.id)].slice(0,3);
    return crumbs([['Shop','#/shop'],[p.category,'#/shop?category='+enc(p.category)],[p.name]])+
    '<div class="fw-product pdp-layout"><div class="pdp-gallery"><div class="pdp-stage" data-view="product"><span class="pdp-view-caption">NOW collection <span>01 / 02</span></span>'+image(photo,p.name,false)+saveButton(p)+'<span class="pdp-image-note">'+(demo?'Sample listing · illustrative packaging':'Product packaging')+'</span></div><div class="pdp-gallery-controls" aria-label="Product image views"><button class="pdp-thumb" data-gallery="product" aria-pressed="true">'+image(photo,'',false)+'<span>Product view</span></button><button class="pdp-thumb" data-gallery="label" aria-pressed="false">'+image(photo,'',false)+'<span>Label close-up</span></button><span class="pdp-gallery-hint">Take a closer look.</span></div></div>'+
    '<section class="fw-detail pdp-info"><div class="pdp-kicker">'+escape(p.category)+(demo?'<span class="pdp-demo">Sample product</span>':'')+'</div><h1 class="fw-title pdp-title">'+escape(p.name)+'</h1>'+(shortDescription?'<p class="pdp-description">'+escape(shortDescription)+'</p>':'')+
    '<div class="pdp-price-row"><span class="fw-price pdp-price">'+money(price)+'</span><span class="pdp-availability '+(!available?'unavailable':'')+'">'+(available?'In stock':'Currently unavailable')+'</span></div><div class="pdp-purchase">'+
    (variants.length?'<fieldset class="fw-variants pdp-variants"><legend>Select your pack</legend>'+variants.map(item=>'<button class="pdp-variant" data-variant="'+attr(item.sku)+'" aria-pressed="'+(item===v)+'"><strong>'+escape(item.size||item.sku)+'</strong><span>'+money(item.price)+'</span></button>').join('')+'</fieldset>':'')+
    '<div class="fw-buy pdp-buy">'+quantity(detailState.qty,'detail','',maxQty)+'<button class="fw-action pdp-add" data-add '+(!available?'disabled':'')+'>Add to bag '+icon('arrow')+'</button></div><div class="fw-status pdp-status" role="status" data-status></div><a class="pdp-policy" href="/help">Delivery & returns '+icon('arrow')+'</a></div>'+
    '<div class="pdp-accordions">'+details('Product details','<p>'+escape(p.description||'Product details are being prepared.')+'</p><dl class="pdp-specs"><div><dt>Selected pack</dt><dd>'+escape(v?.size||'Unavailable')+'</dd></div><div><dt>Item reference</dt><dd>'+escape(v?.sku||'—')+'</dd></div></dl>',true)+
    details('Ingredients & directions','<p>'+(demo?'The final ingredient list, Supplement Facts, and directions will be added with the actual product label.':'Check the product label for the complete ingredient list, Supplement Facts, and directions.')+'</p>'+official)+
    details('Delivery & returns','<p>Review the store’s current delivery information and return terms before ordering.</p><a class="pdp-text-link" href="/help">Visit customer care '+icon('arrow')+'</a>')+'</div></section></div>'+
    (related.length?'<section class="fw-related pdp-related"><div class="pdp-related-heading"><span class="fw-eyebrow">Explore the collection</span><h2 class="fw-title">More for your everyday.</h2></div>'+grid(related)+'</section>':'');
  }
  function bagRows(data) {return bag().map((item,index)=>{const p=data.find(p=>String(p.id)===item.id),v=p?.variants?.find(v=>String(v.sku)===item.sku);return {item,index,p,v};});}
  function subtotal(rows) {return rows.reduce((n,{item,v})=>n+(v?.price||0)*item.quantity,0);}
  function bagPage(data) {
    const rows=bagRows(data), available=rows.every(({v})=>v?.price>0);
    let html=crumbs([['Bag']])+title('Your bag',bagCount()+' '+(bagCount()===1?'item':'items'));
    if (!rows.length) return html+empty('Your bag is empty.','Find your next everyday essential in the catalog.');
    return html+'<div class="fw-layout"><div class="fw-lines">'+rows.map(({item,index,p,v})=>'<article class="fw-line"><a class="fw-tile" href="'+attr(p?productHref(p.id):'#/shop')+'">'+image(v?.image||p?.image,p?.name||'Unavailable item')+'</a><div><h3><a href="'+attr(p?productHref(p.id):'#/shop')+'">'+escape(p?.name||'Unavailable product')+'</a></h3><p>'+escape(v?.size||item.sku)+'</p>'+quantity(item.quantity,'bag',index)+'</div><div><strong>'+money(v?.price!=null?v.price*item.quantity:null)+'</strong><button class="fw-remove" data-remove="'+index+'">Remove</button></div></article>').join('')+'</div><aside class="fw-summary"><h2>Order summary</h2><div class="fw-row"><span>Subtotal</span><strong>'+money(subtotal(rows))+'</strong></div><hr><p>Delivery is included. Displayed prices include applicable tax.</p>'+(available?button('Review checkout','#/checkout'):'<p class="fw-note">Remove unavailable items to continue.</p>')+'</aside></div>';
  }
  async function api(path,init={}) {
    const response=await fetch(path,{...init,cache:'no-store',headers:{Accept:'application/json',...(init.headers||{})}});
    let result;try {result=await response.json();} catch {throw Error('The store service is unavailable. Please try again later.');}
    if (!response.ok) {const error=Error(typeof result.error==='string'?result.error:'Unable to complete the request.');error.status=response.status;throw error;}
    return result;
  }
  async function checkout(data) {
    const rows=bagRows(data);
    let html=crumbs([['Bag','#/bag'],['Checkout']])+title('Checkout');
    if (!rows.length) return html+empty('Your bag is empty.','Add a product to begin checkout.');
    const valid=rows.every(({v})=>v?.price>0);
    let enabled=false,failed=false;
    try {enabled=(await api('/api/commerce')).checkoutEnabled===true;} catch {failed=true;}
    let note=valid?(failed?'Checkout is temporarily unavailable. Your items are saved in your bag.':enabled?'Continue to secure checkout to enter your shipping address, review the final total, and pay.':'This store is preparing to accept orders. Your items are saved in your bag.'):'Your bag contains an unavailable item. Return to your bag to update it.';
    return html+'<div class="checkout-progress" aria-label="Checkout steps"><span aria-current="step">Review your bag</span><span>Contact & delivery</span><span>Payment</span></div><div class="checkout-layout"><div class="checkout-main"><section class="checkout-card"><div class="checkout-card-head"><div><p class="fw-eyebrow">Your selection</p><h2>Ready for your routine.</h2></div><a class="fw-link" href="#/bag">Edit bag</a></div><div class="checkout-products">'+rows.map(({item,p,v})=>'<article class="checkout-product"><a class="checkout-image" href="'+attr(p?productHref(p.id):'#/shop')+'">'+image(v?.image||p?.image,p?.name||'Unavailable item')+'</a><div><a class="checkout-product-title" href="'+attr(p?productHref(p.id):'#/shop')+'">'+escape(p?.name||'Unavailable item')+'</a><p>'+escape(v?.size||item.sku)+'</p><span>Quantity '+item.quantity+'</span></div><strong>'+money(v?.price!=null?v.price*item.quantity:null)+'</strong></article>').join('')+'</div></section><section class="checkout-next"><div><span class="checkout-step-icon">'+icon('arrow')+'</span><h2>Contact & delivery</h2><p>Enter your email and delivery address in Stripe Checkout. Available shipping options and costs appear there before payment.</p></div><div><span class="checkout-step-icon">'+icon('arrow')+'</span><h2>Payment</h2><p>Review the complete total, including shipping and applicable tax, then pay through Stripe’s secure payment form.</p></div></section><a class="fw-link checkout-help" href="#/help">Questions about your order? Visit customer care ↗</a></div><aside class="checkout-order"><p class="fw-eyebrow">Order summary</p><h2>Your everyday essentials.</h2><div class="fw-row"><span>Items ('+bagCount()+')</span><strong>'+money(subtotal(rows))+'</strong></div><div class="fw-row"><span>Shipping</span><span>At next step</span></div><div class="fw-row"><span>Tax</span><span>Calculated at checkout</span></div><div class="checkout-total"><span>Subtotal <small>USD</small></span><strong>'+money(subtotal(rows))+'</strong></div><p class="checkout-total-note">Final total is shown before payment.</p><p class="'+(valid&&enabled?'checkout-ready':'fw-note')+'">'+escape(note)+'</p><button class="fw-action" data-pay '+(!enabled||!valid?'disabled':'')+'>Continue to delivery '+icon('arrow')+'</button><div class="fw-status" role="status" data-status></div><div class="checkout-provider">Secure checkout powered by Stripe</div><a class="fw-link" href="#/privacy">Shopping privacy</a></aside></div>';

  }
  function sessionRead(key){try{return JSON.parse(sessionStorage.getItem(storeKey(key))||'null');}catch{return null;}}
  function sessionWrite(key,value){try{sessionStorage.setItem(storeKey(key),JSON.stringify(value));}catch{}}
  async function startCheckout(el) {
    el.disabled=true;const status=app().querySelector('[data-status]');status.textContent='Opening checkout…';
    const items=bag(), fingerprint=JSON.stringify(items);
    let pending=sessionRead('checkout');
    if (!pending || pending.fingerprint!==fingerprint) pending={fingerprint,requestId:crypto.randomUUID(),items};
    sessionWrite('checkout',pending);
    try {
      const result=await api('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items,requestId:pending.requestId})});
      const url=new URL(result.url);
      if (url.protocol!=='https:' || url.hostname!=='checkout.stripe.com') throw Error('Secure checkout is unavailable.');
      const sessionId=result.sessionId || url.pathname.split('/').find(x=>x.startsWith('cs_'));
      if(sessionId) sessionWrite('checkout',{...pending,sessionId});
      location.assign(url.href);
    } catch(error) {if(error.status===409)sessionWrite('checkout',null);status.textContent=error.message;el.disabled=false;}
  }
  function clearCompletedBag(sessionId) {
    const pending=sessionRead('checkout');
    if (!pending || pending.sessionId!==sessionId || !Array.isArray(pending.items)) return;
    const remaining=bag().map(i=>{const ordered=pending.items.find(o=>o.id===i.id && o.sku===i.sku);return {...i,quantity:i.quantity-(ordered?.quantity||0)};}).filter(i=>i.quantity>0);
    sessionWrite('checkout',null);write('bag',remaining);
  }
  async function orderPage(sessionId) {
    const crumbsHtml=crumbs([['Order']]);
    if (!sessionId) return crumbsHtml+empty('Order link required.','Open the order link from your checkout confirmation.','Return to bag','#/bag');
    let order;
    try {order=await api('/api/order?session='+enc(sessionId));}
    catch(error) {return crumbsHtml+title('Order status')+'<p role="alert">'+escape(error.message)+'</p><button class="fw-quiet" data-retry>Try again</button>';}
    const paid=order.status==='paid', expired=order.status==='expired';
    if (paid) clearCompletedBag(sessionId);
    if (expired && sessionRead('checkout')?.sessionId===sessionId) sessionWrite('checkout',null);
    return crumbsHtml+title(paid?'Order confirmed':expired?'Checkout expired':'Payment processing')+'<div class="fw-layout"><section class="fw-info"><h2>'+escape(paid?'Thank you for your order.':expired?'Start a new checkout.':'Checking your payment.')+'</h2><p>'+escape(paid?'Your payment has been received. Save this page to check your order.':expired?'Your checkout session has expired. You can start again from your bag.':'Your payment is awaiting confirmation. Refresh this page to check again.')+'</p>'+(paid?button('Continue shopping','#/shop'):expired?button('Return to bag','#/bag'):'<button class="fw-action" data-retry>Refresh status</button>')+'</section><aside class="fw-summary"><h2>Order details</h2><p>'+escape(order.id||'')+'</p><ul class="fw-check-list">'+(order.items||[]).map(i=>'<li><span>'+escape(i.name)+' × '+escape(i.quantity)+'</span><strong>'+money(i.price*i.quantity)+'</strong></li>').join('')+'</ul><div class="fw-row"><span>Total</span><strong>'+money(order.total)+'</strong></div></aside></div>';
  }
  async function helpPage() {
    let info={};
    try {info=await api('/api/store-info');}catch{}
    const email=typeof info.supportEmail==='string' && /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(info.supportEmail)?info.supportEmail:'';
    const support=email?'<p>For help with a purchase, include your order reference when you <a class="fw-link" href="mailto:'+attr(enc(email).replace('%40','@'))+'">email '+escape(info.merchantName||'customer support')+'</a>.</p>':'<p>Keep your confirmation link for order details. The store has yet to publish a customer support address.</p>';
    const faqs=[
      ['Where can I find ingredients and directions?','Each product page links to its manufacturer information. Check the label for the exact size or formulation you plan to buy.'],
      ['How do I save a product?','Select the heart on any product. Your saved products and bag are kept in this browser.'],
      ['Shipping and delivery',info.shippingPolicy||'Shipping options and costs appear in secure checkout when ordering is open. The store has yet to publish delivery time estimates.'],
      ['Returns and refunds',info.returnPolicy||'The store has yet to publish its return policy. Check here for return eligibility and instructions before ordering.'],
      ['How can I check my order?','Use the confirmation link from your completed checkout to view your payment status and order total.'],
      ['Why is checkout unavailable?','Ordering becomes available when the store opens payments. You can keep items in your bag and return to checkout later.']
    ];
    return crumbs([['Help']])+title('Shopping help')+'<section class="fw-info"><h2>Order support</h2>'+support+faqs.map(([q,a],i)=>'<details '+(i===0?'open':'')+'><summary>'+escape(q)+'</summary><p>'+escape(a)+'</p></details>').join('')+'<a class="fw-link fw-back" href="#/shop">Browse products</a></section>';
  }
  let currentProducts=[], revision=0, currentPath='';
  async function renderShop() {
    const {path,params}=route(), marker=++revision,target=app(), original=location.hash;
    if(!target || path==='/' || path==='')return;
    if(['/checkout','/help','/privacy'].includes(path)){location.href=path;return;}
    if(path==='/admin'){location.href='/admin';return;}
    const detailKey = path + (params.get("sku") || "");
    if(detailKey!==currentPath){currentPath=detailKey;detailState={qty:1,sku:params.get("sku")};}
    const stillCurrent=()=>marker===revision && location.hash===original;
    let page='',label='Shop';
    try {
      if(path==='/help'){label='Shopping help';page=await helpPage();}
      else if(path==='/order' || path.startsWith('/order/')) {label='Order status';page=await orderPage(params.get('session')||path.slice(7));}
      else {
        if (!currentProducts.length)target.innerHTML=shell('<p role="status">Loading products…</p>');
        currentProducts=await catalog();
        if (!stillCurrent())return;
        if(path==='/shop') page=listing(currentProducts,params);
        else if(path.startsWith('/product/')){
          const id=decodeURIComponent(path.slice(9)),p=currentProducts.find(p=>String(p.id)===id);
          if(p) {label=p.name;page=detail(p,currentProducts);}
          else page=empty('Product unavailable.','Browse the catalog to find another product.');
        } else if(path==='/saved'){
          label='Saved products';const favorites=currentProducts.filter(p=>isSaved(p.id));
          page=crumbs([['Saved']])+title(label,favorites.length+' products')+(favorites.length?grid(favorites):empty('Save your favorites.','Select the heart on a product to keep it here for later.'));
        } else if(path==='/bag'){label='Your bag';page=bagPage(currentProducts);}
        else if(path==='/checkout'){label='Checkout';page=await checkout(currentProducts);}
        else {label='Page unavailable';page=empty('Page unavailable.','Return to the catalog to continue shopping.');}
      }
    } catch {page='<section class="fw-empty"><h1 class="fw-title">Unable to load this page.</h1><p>Please try again.</p><button class="fw-action" data-retry>Retry</button></section>';}
    if(stillCurrent()){target.innerHTML=shell(page);document.title=label+' · Way2Nutrition';if(path.startsWith('/product/')&&currentProducts.some(p=>p.id===decodeURIComponent(path.slice(9))))window.dispatchEvent(new CustomEvent('fieldwork:product-view',{detail:{id:decodeURIComponent(path.slice(9))}}));}
  }
  window.renderShop=renderShop;
  window.addEventListener('fieldwork:saved-ready',()=>document.querySelectorAll('[data-save]').forEach(button=>button.disabled=!window.Way2NutritionSavedReady));
  window.addEventListener('fieldwork:account-saved',()=>{window.dispatchEvent(new Event('fieldwork:change'));if(location.hash.split('?')[0]==='#/saved')renderShop();else document.querySelectorAll('[data-save]').forEach(button=>button.setAttribute('aria-pressed',String(isSaved(button.dataset.save))));});
  document.addEventListener('submit',e=>{
    const form=e.target.closest('form[data-search]');if(!form)return;
    e.preventDefault();location.hash=routeWith({q:new FormData(form).get('q').trim(),page:null});
  });
  document.addEventListener('change',e=>{
    if(e.target.matches('.fw-screen [data-filter]'))location.hash=routeWith({[e.target.dataset.filter]:e.target.value,page:null});
  });
  document.addEventListener('click',async e=>{
    const el=e.target.closest('.fw-screen button');if(!el || el.disabled)return;
    const d=el.dataset, {path}=route();
    if(d.gallery!=null){
      const gallery=el.closest('.pdp-gallery'),stage=gallery.querySelector('.pdp-stage');stage.dataset.view=d.gallery;
      stage.querySelector('.pdp-view-caption span').textContent=d.gallery==='label'?'02 / 02':'01 / 02';
      gallery.querySelectorAll('[data-gallery]').forEach(b=>b.setAttribute('aria-pressed',String(b===el)));
    } else if(d.save!=null) {
      const state=toggleSave(d.save); el.setAttribute('aria-pressed',String(state));
      if(path==='/saved')await renderShop();
    } else if(d.variant!=null) {
      detailState.sku=d.variant;await renderShop();
      Array.from(app().querySelectorAll('[data-variant]')).find(b=>b.dataset.variant===d.variant)?.focus({preventScroll:true});
    } else if(d.qty!=null) {
      if(d.kind==='detail'){
        const {path}=route(),product=currentProducts.find(p=>p.id===decodeURIComponent(path.slice(9))),selected=product?.variants?.find(v=>v.sku===detailState.sku)||product?.variants?.[0],limit=Math.max(1,Math.min(99,selected?.stock??99));
        detailState.qty=Math.max(1,Math.min(limit,detailState.qty+Number(d.qty)));
        const box=el.closest('.fw-qty');box.querySelector('span').textContent=detailState.qty;box.firstElementChild.disabled=detailState.qty<=1;box.lastElementChild.disabled=detailState.qty>=limit;
      }else{const rows=bag(),row=rows[Number(d.index)];if(row){row.quantity=Math.max(1,Math.min(99,row.quantity+Number(d.qty)));write('bag',rows);await renderShop();app().querySelector('[data-index="'+d.index+'"][data-qty="'+d.qty+'"]')?.focus({preventScroll:true});}}
    } else if(d.remove!=null){const rows=bag();rows.splice(Number(d.remove),1);write('bag',rows);await renderShop();}
    else if(d.add!=null){const id=decodeURIComponent(path.slice(9)),p=currentProducts.find(p=>String(p.id)===id),v=p?.variants?.find(v=>String(v.sku)===detailState.sku)||p?.variants?.[0];if(v?.price>0&&(v.stock==null||v.stock>=detailState.qty)){add(id,v.sku,detailState.qty);app().querySelector('[data-status]').innerHTML='Added to your bag. <a href="#/bag">View bag</a>';}}
    else if(d.pay!=null) await startCheckout(el);
    else if(d.retry!=null) await renderShop();
  });
})();
