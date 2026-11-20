(() => {
  const usd = new Intl.NumberFormat('en-US', {style:'currency', currency:'INR'});
  const element = (tag, css, text) => {
    const el = document.createElement(tag);
    if (css) el.className = css;
    if (text) el.textContent = text;
    return el;
  };
  const productLink = (product, variant) =>
    '#/product/' + encodeURIComponent(product.id) + (variant?.sku ? '?sku=' + encodeURIComponent(variant.sku) : '');

  function packshot(product) {
    const frame = element('div', 'es-frame');
    if (product.image) {
      const img = element('img', 'es-pack');
      img.alt = product.name;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = product.image;
      img.addEventListener('error', () => frame.replaceChildren(element('span', 'es-no-image', product.category)));
      frame.append(img);
    } else frame.append(element('span', 'es-no-image', product.category));
    return frame;
  }

  function quickView(product, trigger, container) {
    const dialog = element('dialog', 'es-dialog');
    const panel = element('div', 'es-dialog-body');
    const details = element('div', 'es-dialog-details');
    const title = element('h2', '', product.name);
    title.id = 'es-active-product';
    dialog.setAttribute('aria-labelledby', title.id);
    const close = element('button', 'es-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close quick view');
    close.addEventListener('click', () => dialog.close());
    details.append(element('small', 'es-kicker', product.category), title);
    if (product.description) details.append(element('p', 'es-description', product.description));
    const variants = product.variants || [];
    const prices = element('ul', 'es-variant-list');
    for (const variant of variants) {
      const row = element('li');
      const link = element('a');
      link.href = productLink(product, variant);
      link.append(element('span', '', variant.size || variant.sku),
        element('strong', '', Number.isFinite(variant.price) ? usd.format(variant.price) : 'Price unavailable'));
      link.addEventListener('click', () => dialog.close());
      row.append(link);
      prices.append(row);
    }
    if (variants.length) details.append(prices);
    const link = element('a', 'es-details-link', 'View product details ↗');
    link.href = productLink(product);
    link.addEventListener('click', () => dialog.close());
    details.append(link);
    panel.append(packshot(product), details, close);
    dialog.append(panel);
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => {
      dialog.remove();
      if (trigger.isConnected) trigger.focus({preventScroll:true});
    }, {once:true});
    container.append(dialog);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else {dialog.remove(); location.hash = productLink(product);}
  }

  function card(product, index, grid) {
    const article = element('article', 'es-card' + (index === 0 ? ' es-feature' : ''));
    const scene = element('div', 'es-scene');
    const imageLink = element('a', 'es-picture');
    imageLink.href = productLink(product);
    imageLink.setAttribute('aria-label', 'View ' + product.name);
    imageLink.append(packshot(product));
    const quick = element('button', 'es-quick', 'Quick view');
    quick.type = 'button';
    quick.setAttribute('aria-haspopup', 'dialog');
    quick.setAttribute('aria-label', 'Quick view of ' + product.name);
    quick.addEventListener('click', () => quickView(product, quick, grid));
    scene.append(imageLink, quick);
    const copy = element('div', 'es-copy');
    const title = element('h3', 'es-name');
    const titleLink = element('a', '', product.name);
    titleLink.href = productLink(product);
    title.append(titleLink);
    copy.append(element('small', 'es-kicker', product.category), title);
    if (!index && product.description) copy.append(element('p', 'es-description', product.description));
    const variant = product.variants?.find(v => Number.isFinite(v.price)) || product.variants?.[0];
    const price = variant?.price ?? product.price;
    const buy = element('a', 'es-buy');
    buy.href = productLink(product, variant);
    buy.setAttribute('aria-label', 'View ' + product.name + (variant?.size ? ', ' + variant.size : ''));
    buy.append(element('strong', '', Number.isFinite(price) ? usd.format(price) : 'Price unavailable'));
    if (variant?.size) buy.append(element('span', 'es-size', variant.size));
    const arrow = element('span', 'es-open', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    buy.append(arrow);
    copy.append(buy);
    article.append(scene, copy);
    return article;
  }

  window.renderEditorialShelf = (grid, products) => {
    grid.classList.add('es-grid');
    grid.replaceChildren(...products.slice(0, 3).map((p, i) => card(p, i, grid)));
  };
})();
