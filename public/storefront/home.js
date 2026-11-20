(() => {
  const app = document.querySelector('#app');
  const categories = ['Vitamins', 'Minerals', 'Men’s formulas', 'Women’s formulas', 'Other supplements'];
  const icon = paths => '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
  document.querySelector('#searchBtn').innerHTML = icon('<circle cx="10.5" cy="10.5" r="6.7"/><path d="m16 16 5 5"/>');
  document.querySelector('#heart').innerHTML = icon('<path d="M20.3 4.9a5.2 5.2 0 0 0-7.3 0L12 6l-1-1.1a5.2 5.2 0 0 0-7.3 7.4L12 20.5l8.3-8.2a5.2 5.2 0 0 0 0-7.4Z"/>');
  document.querySelector('#bagIcon').innerHTML = icon('<path d="M5 8h14l1 13H4L5 8Z"/><path d="M8.5 9V6a3.5 3.5 0 0 1 7 0v3"/>');
  const catURL = name => '#/shop?category=' + encodeURIComponent(name);
  const catLinks = categories.map(c => '<a href="' + catURL(c) + '">' + c + '<span>↗</span></a>');
  const nav = document.querySelector('#collectionNav'), search = document.querySelector('#searchBox');
  const closePanels = () => {
    nav.hidden = search.hidden = true;
    document.body.classList.remove('full-menu-open');
    app.inert=false;document.querySelector('footer').inert=false;
    document.getElementById('mobileNav').textContent='☰';
    document.getElementById('mobileNav').setAttribute('aria-label','Open navigation');
    for (const id of ['collectionsBtn','mobileNav','searchBtn']) document.getElementById(id).setAttribute('aria-expanded','false');
  };
  for (const id of ['collectionsBtn','mobileNav','searchBtn']) document.getElementById(id).onclick = () => {
    const panel = id === 'searchBtn' ? search : nav;
    const open = panel.hidden;
    closePanels();
    if (!open) return;
    panel.hidden = false;
    panel.style.top=document.querySelector('.mast').getBoundingClientRect().bottom+'px';
    document.getElementById(id).setAttribute('aria-expanded','true');
    if(id==='mobileNav'){document.getElementById(id).textContent='×';document.getElementById(id).setAttribute('aria-label','Close navigation');}
    if (panel === nav) {
      document.body.classList.add('full-menu-open');
      app.inert=true;document.querySelector('footer').inert=true;
      nav.innerHTML='<div class="full-menu-label">Explore Way2Nutrition</div><div class="full-menu-primary"><a href="#/">Home</a><a href="#/shop">Shop all</a><a href="#/about">About us</a><a href="#/help">Customer care</a></div><div class="full-menu-secondary"><span>Collections</span>'+catLinks.join('')+'<span>Your market</span><a href="/account">My account</a><a href="#/saved">Saved products</a><a href="#/bag">Your bag</a><a href="/privacy">Privacy</a><a href="/admin">Manage store</a></div>';
    }
    else document.querySelector('#query').focus();
  };
  document.addEventListener('keydown', e => { if(e.key === 'Escape') { const trigger = document.querySelector('.mast [aria-expanded="true"]'); closePanels(); trigger?.focus(); }});
  document.addEventListener('click', e => { if(!e.target.closest('.mast,.navpanel') || e.target.closest('.navpanel a')) closePanels(); });
  search.onsubmit = e => { e.preventDefault(); const value = document.querySelector('#query').value.trim(); if(value){ location.hash = '/shop?q=' + encodeURIComponent(value); closePanels(); }};
  const updateCount = () => document.getElementById('bagCount').textContent = window.Way2NutritionShop?.bagCount() || 0;
  window.addEventListener('fieldwork:change', updateCount);
  let featureId = 'vitamin-c-1000-sustained-release-tablets';
  let featureURL = '#/product/' + featureId;
  const bottle = '/assets/products/206.webp';
  const directory = '<section class="selection visual-collections"><div class="sectionhead"><h2>Explore your essentials.</h2></div><div class="collection-scenes">'+categories.map((c,i)=>'<a href="'+catURL(c)+'"><img class="collection-bg" src="/assets/'+(i%2?'citrus.jpg':'botanical.jpg')+'" alt="" loading="lazy"><img class="collection-bottle" src="/assets/products/'+(i%2?'256':'206')+'.webp" alt="" loading="lazy"><span>'+c+' ↗</span></a>').join('')+'</div></section>';
  const hero = `<section class="nature-hero"><img class="nature-background" src="/assets/botanical.jpg" alt="" fetchpriority="high">
    <div class="nature-copy"><div class="overline">Way2Nutrition · The NOW collection</div><h1>Good nature.<br><em>Every day.</em></h1><p>Discover NOW vitamins, minerals, and everyday supplements for men and women.</p><a class="pill" href="#/shop">Explore the collection ↗</a></div>
    <a class="nature-main" href="${featureURL}"><img src="/assets/bottles/c-1000-100-tablets.webp" alt="NOW Vitamin C-1000, 100 tablets"><span>Explore Vitamin C-1000 ↗</span></a>
    <div class="nature-note">An independent shop.<br>A whole world of NOW.</div></section>`;
  const shelf = `<section class="selection shelf"><div class="sectionhead"><h2>The supplement shelf</h2><a class="textlink" href="#/shop" id="rangeLink">Shop all ↗</a></div>
    <div class="range-buttons" aria-label="Featured product collections"><button aria-pressed="true" data-range="Featured">Featured</button><button aria-pressed="false" data-range="Men’s formulas">Men’s formulas</button><button aria-pressed="false" data-range="Women’s formulas">Women’s formulas</button></div>
    <div id="homegrid" class="homegrid" aria-live="polite"></div></section>`;
  const story = `<section id="formulaStory" class="formula-story"><div class="story-poster"><span class="overline">Formula spotlight · Vitamin C-1000</span><h2>Read the<br><i>label.</i></h2><img src="${bottle}" loading="lazy" alt="NOW Vitamin C-1000 bottle"></div>
    <div class="story-chapters"><article><small>Ingredient</small><h3>1,000 mg</h3><p>Each tablet supplies one gram of vitamin C as ascorbic acid. The amount on the label refers to a single tablet.</p></article>
    <article><small>Botanical ingredient</small><h3>Rose hips</h3><p>Each serving also contains 25 mg of rose hips powder from the fruit of Rosa canina.</p></article>
    <article><small>Tablet design</small><h3>Sustained release</h3><p>NOW designed this tablet to release vitamin C over time. The manufacturer lists it as vegan and gluten free.</p><a class="textlink" href="${featureURL}">View product details ↗</a></article></div></section>`;
  const compare = `<section class="selection bottle-config"><div class="config-visual"><img id="configBottle" src="/assets/bottles/c-1000-60-tablets.webp" alt="NOW Vitamin C-1000, 60 tablets"></div><div class="config-copy"><div class="overline">Vitamin C-1000 · Sustained release</div><h2>A bottle that<br>fits your routine.</h2><p>Choose your count. Each tablet contains the same 1,000 mg vitamin C formula with rose hips.</p><div id="sizeCards" aria-label="Bottle size"></div><div id="configPrice" aria-live="polite"></div><a id="configCTA" class="pill" href="${featureURL}">View selected bottle ↗</a></div></section>`;
  const trust = '<section class="selection transparency"><h2>Know what you’re choosing.</h2><div><article><h3>NOW products</h3><p>Way2Nutrition is an independent retailer of NOW supplements. Product formulations and packaging come from NOW.</p></article><article><h3>Label first</h3><p>Product pages link to manufacturer ingredients, directions, and allergen information.</p></article><article><h3>Your selection</h3><p>Compare bottle counts, check the selected size, and save products for later.</p></article></div></section>';
  const guide = `<section class="selection readguide"><h2>Supplement questions</h2><div><details open><summary>Where can I check ingredients?</summary><p>Open a product and follow its manufacturer information link for the full ingredient list, allergen information, and directions for that formula.</p></details><details><summary>Does bottle count mean serving size?</summary><p>Bottle count tells you how many tablets or capsules are inside. Serving size is the amount listed on the Supplement Facts label. For this C-1000 formula, one tablet is one serving.</p></details><details><summary>How do I compare products later?</summary><p>Use the heart on a product card to save it. Open the heart in the navigation to revisit your selection on this device.</p></details></div></section>`;
  const home = hero + shelf + story + compare + directory + trust + guide;
  const usd = new Intl.NumberFormat('en-US',{style:'currency',currency:'INR'});
  async function fillEdit() {
    const grid = document.querySelector('#homegrid');
    try {
      const items = await window.Way2NutritionShop.catalog();
      if (!grid.isConnected) return;
      const feature = items.find(p=>p.id===featureId)||items.find(p=>/vitamin c/i.test(p.name));
      if(feature){const prior=featureURL;featureId=feature.id;featureURL='#/product/'+featureId;for(const link of app.querySelectorAll('a'))if(link.getAttribute('href')===prior||link.getAttribute('href')==='#/product/vitamin-c-1000-sustained-release-tablets')link.setAttribute('href',featureURL);}
      function renderRange(range) {
        const list = range==='Featured' ? items.slice(0,4) : items.filter(p=>p.category===range && p.image).slice(0,4);
        window.renderEditorialShelf(grid,list);
        const all=document.querySelector('#rangeLink');all.href=range==='Featured'?'#/shop':catURL(range);
        all.textContent=range==='Featured'?'Shop all ↗':'Shop '+range.toLowerCase()+' ↗';
      }
      document.querySelector('.range-buttons').onclick=e=>{
        const button=e.target.closest('[data-range]');if(!button)return;
        for(const other of button.parentNode.children)other.setAttribute('aria-pressed',String(other===button));
        renderRange(button.dataset.range);
      };
      renderRange('Featured');
      const sizes=document.querySelector('#sizeCards');
      const updateBottle = v => {
        const count=parseInt(v.size,10);
        const image=document.querySelector('#configBottle');
        image.src='/assets/bottles/c-1000-'+count+'-tablets.webp';
        image.alt='NOW Vitamin C-1000, '+v.size;
        document.querySelector('#configPrice').textContent=usd.format(v.price)+' · '+usd.format(v.price/count)+' per tablet';
        document.querySelector('#configCTA').href=featureURL+'?sku='+encodeURIComponent(v.sku);
        for(const button of sizes.children)button.setAttribute('aria-pressed',String(button.dataset.sku===v.sku));
      };
      if(!feature?.variants?.length){document.querySelector('.bottle-config').hidden=true;return;}
      for(const v of feature.variants) {
        const button=document.createElement('button');button.textContent=v.size;button.dataset.sku=v.sku;
        button.onclick=()=>updateBottle(v);sizes.append(button);
      }
      updateBottle(feature.variants[0]);
    } catch {grid.textContent='The collection is temporarily unavailable.';}
  }
  let stopScene;
  function route(){
    stopScene?.();
    closePanels();updateCount();const hash=location.hash.split('?')[0];
    if(!hash || hash==='#/' || hash==='#') { document.title='Way2Nutrition — The NOW Market';app.innerHTML=home;stopScene=window.startNatureMotion(app);fillEdit(); }
    else if(hash==='#/about') {
      document.title='Our market — Way2Nutrition';
      app.innerHTML=`<section class="about-cover"><img src="/assets/botanical.jpg" alt="Botanical leaves and rose hips on natural stone"><div><span class="overline">Meet Way2Nutrition</span><h1>A considered<br><i>everyday.</i></h1><p>An independent shop for the NOW supplements you make part of your routine.</p><a class="pill" href="#/shop">Discover the collection ↗</a></div></section>
      <section class="about-intro selection"><span class="overline">Our market</span><h2>Room to explore.<br>Details to decide.</h2><p>Way2Nutrition brings adult vitamins, minerals, and supplements from NOW into one place. Explore the range, compare bottle sizes, and take time to read about each formula.</p></section>
      <section class="about-pair"><div class="about-product"><img src="/assets/products/256.webp" alt="NOW Magnesium Glycinate tablets" loading="lazy"></div><div><span class="overline">The products</span><h2>Made by NOW.<br>Selected by you.</h2><p>NOW manufactures the supplements. Way2Nutrition is your independent shopping destination. Each product page connects you to the manufacturer’s ingredient information and directions.</p><a class="textlink" href="#/shop">Find your next essential ↗</a></div></section>
      <section class="selection about-values"><article><h3>Explore the range</h3><p>Browse vitamins, minerals, and formulas for men and women.</p></article><article><h3>Check the details</h3><p>Compare the selected bottle count and price before adding it to your bag.</p></article><article><h3>Keep your favorites</h3><p>Save products in this browser and revisit them when you’re ready.</p></article></section>`+directory;
    }
    else if(hash==='#/privacy') { location.href='/privacy';return; }
    else window.renderShop();
    window.scrollTo(0,0);
  }
  window.addEventListener('hashchange', () => { route(); app.focus({preventScroll:true}); });
  route();
})();
