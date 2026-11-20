(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const shop = window.Way2NutritionShop;
  const make = (tag, css, text) => {
    const node=document.createElement(tag);
    if(css)node.className=css;
    if(text)node.textContent=text;
    return node;
  };
  const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'INR'}).format(value);
  const drawer=make('dialog','bag-drawer');
  drawer.setAttribute('aria-label','Your shopping bag');
  document.body.append(drawer);
  let data=[], revision=0;
  function closeBag() {drawer.close();}
  async function renderBag() {
    const current=++revision;
    const hadFocus=drawer.querySelector(':focus')?.dataset.control;
    drawer.replaceChildren();
    const top=make('div','drawer-top');
    const heading=make('h2','', 'Your bag');
    const close=make('button','drawer-close','×');
    close.setAttribute('aria-label','Close shopping bag');
    close.onclick=closeBag;
    top.append(heading,close);drawer.append(top);
    try {
      data=await shop.catalog();
      if(current!==revision)return;
      const lines=make('div','drawer-lines');
      let total=0, valid=true;
      const bag=shop.bag();
      if(!bag.length){
        const empty=make('div','drawer-empty');
        empty.append(make('h3','','A little room for wellness.'),make('p','','Explore the NOW collection and find your everyday essentials.'));
        const browse=make('a','pill','Explore supplements ↗');browse.href='#/shop';browse.onclick=closeBag;
        empty.append(browse);lines.append(empty);
      }
      for(const item of bag){
        const product=data.find(p=>p.id===item.id);
        const variant=product?.variants.find(v=>v.sku===item.sku);
        valid=valid && Boolean(variant?.price>0);
        total+=(variant?.price||0)*item.quantity;
        const row=make('article','drawer-line');
        const image=new Image();image.src=product?.image||'';image.alt=product?.name||'Unavailable product';
        const body=make('div','drawer-detail');
        const link=make('a','',product?.name||'Unavailable product');link.href='#/product/'+encodeURIComponent(item.id);link.onclick=closeBag;
        body.append(link,make('p','',variant?.size||item.sku));
        const controls=make('div','drawer-quantity');
        for(const [label,delta] of [['−',-1],['+',1]]){
          const button=make('button','',label);
          button.setAttribute('aria-label',(delta<0?'Decrease':'Increase')+' '+(product?.name||'item')+' quantity');
          button.dataset.control=item.id+item.sku+delta;
          button.disabled=delta>0&&item.quantity>=99;
          button.onclick=()=>shop.setBagQuantity(item.id,item.sku,Math.max(0,Math.min(99,item.quantity+delta)));
          controls.append(button);
          if(delta<0)controls.append(make('span','',String(item.quantity)));
        }
        const remove=make('button','drawer-remove','Remove');remove.onclick=()=>shop.setBagQuantity(item.id,item.sku,0);
        body.append(controls,remove);
        row.append(image,body,make('strong','',variant?.price?money(variant.price*item.quantity):'Unavailable'));
        lines.append(row);
      }
      drawer.append(lines);
      if(bag.length){
        const summary=make('div','drawer-summary');
        const subtotal=make('div','drawer-subtotal');subtotal.append(make('span','','Subtotal'),make('strong','',money(total)));
        summary.append(subtotal,make('p','','Shipping and taxes are calculated at checkout.'));
        const cta=make('a','pill',valid?'Review checkout ↗':'Update your bag ↗');cta.href=valid?'#/checkout':'#/bag';cta.onclick=closeBag;
        const view=make('a','drawer-view','View full bag');view.href='#/bag';view.onclick=closeBag;
        summary.append(cta,view);drawer.append(summary);
      }
      const recommendations=make('section','drawer-recommendations');
      recommendations.append(make('h3','','From the collection'));
      const grid=make('div','drawer-rec-grid');
      for(const product of data.filter(p=>p.image&&p.variants.some(v=>v.price>0)&&!bag.some(i=>i.id===p.id)).slice(0,2)){
        const card=make('article');
        const link=make('a');link.href='#/product/'+product.id;link.onclick=closeBag;
        const image=new Image();image.src=product.image;image.alt='';image.loading='lazy';
        link.append(image,make('span','',product.name));
        const variant=product.variants.find(v=>v.price>0);
        const add=make('button','', 'Add '+variant.size+' · '+money(variant.price));
        add.onclick=()=>shop.add(product.id,variant.sku,1);
        card.append(link,add);grid.append(card);
      }
      recommendations.append(grid);drawer.append(recommendations);
      if(drawer.open && !drawer.contains(document.activeElement)){
        const target=Array.from(drawer.querySelectorAll('[data-control]')).find(n=>n.dataset.control===hadFocus);
        (target||close).focus({preventScroll:true});
      }
    } catch {
      drawer.append(make('p','drawer-empty','Your bag could not load. Please close it and try again.'));
    }
  }
  document.addEventListener('click',event=>{
    if(event.target.closest('.baglink')){
      event.preventDefault();
      document.getElementById('collectionNav').hidden=true;
      document.body.classList.remove('full-menu-open');
      document.querySelector('#app').inert=false;document.querySelector('footer').inert=false;
      document.getElementById('mobileNav').setAttribute('aria-expanded','false');
      document.getElementById('mobileNav').textContent='☰';
      document.getElementById('collectionsBtn').setAttribute('aria-expanded','false');
      renderBag();drawer.showModal();
    }
  });
  drawer.addEventListener('click',event=>{
    const rect=drawer.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeBag();
  });
  window.addEventListener('fieldwork:change',()=>{if(drawer.open)renderBag();});
  window.addEventListener('hashchange',()=>{if(drawer.open)closeBag();});

  // Let the opening curtain reveal the loaded homepage without waiting on catalog requests.
  const homeRoute=!location.hash||location.hash==='#/'||location.hash==='#';
  if(homeRoute&&!reduce.matches){
    const intro=make('div','opening-curtain');
    intro.innerHTML='<span class="opening-brand">Way2Nutrition<span>✳</span></span><div class="opening-products"><img src="/assets/products/206.webp" alt=""><img src="/assets/products/256.webp" alt=""><img src="/assets/products/314.webp" alt=""></div><span class="opening-note">The NOW collection</span><button type="button">Skip introduction ↗</button>';
    intro.setAttribute('aria-label','Introducing Way2Nutrition');
    document.body.append(intro);
    let closed=false;
    function finish(){
      if(closed)return;closed=true;
      intro.classList.add('opening-finished');
      document.body.classList.add('opening-complete');
      setTimeout(()=>intro.remove(),750);
    }
    intro.querySelector('button').onclick=finish;
    setTimeout(finish,1850);
  }

  let observer, scrollCleanup;
  function watchPage(){
    observer?.disconnect();scrollCleanup?.();
    const targets=document.querySelectorAll('#app .sectionhead,#app .transparency article,#app .about-values article,#app .collection-scenes a');
    observer=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting){
        entry.target.classList.add('reveal-visible');observer.unobserve(entry.target);
      }
    },{threshold:.08});
    targets.forEach((target,index)=>{
      if(!reduce.matches){target.classList.add('reveal-ready');target.style.setProperty('--reveal-delay',(index%3)*70+'ms');observer.observe(target);}
    });
    const hero=document.querySelector('.nature-hero');
    if(hero&&!reduce.matches){
      let frame=0;
      const update=()=>{
        frame=0;const rect=hero.getBoundingClientRect();
        const progress=Math.max(0,Math.min(1,-rect.top/hero.offsetHeight));
        hero.style.setProperty('--hero-scroll',progress);
      };
      const scroll=()=>{if(!frame)frame=requestAnimationFrame(update);};
      window.addEventListener('scroll',scroll,{passive:true});update();
      scrollCleanup=()=>{window.removeEventListener('scroll',scroll);cancelAnimationFrame(frame);};
    }
  }
  window.addEventListener('hashchange',()=>requestAnimationFrame(watchPage));
  window.addEventListener('DOMContentLoaded',watchPage);
})();
