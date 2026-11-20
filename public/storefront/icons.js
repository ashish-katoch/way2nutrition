(() => {
  const paths = {
    '⌄':'m6 9 6 6 6-6', '↗':'M5 19 19 5M5 5h14v14',
    '→':'M4 12h16m-6-6 6 6-6 6', '↓':'M12 4v16m-6-6 6 6 6-6',
    '☰':'M4 6h16M4 12h16M4 18h16', '×':'m6 6 12 12M6 18 18 6',
    '−':'M5 12h14', '+':'M5 12h14M12 5v14', 'Ⅱ':'M8 5v14M16 5v14',
    '▶':'m8 4 12 8-12 8Z'
  };
  function icon(symbol) {
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24');
    svg.setAttribute('class','ui-icon');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('focusable','false');
    const path=document.createElementNS(svg.namespaceURI,'path');
    path.setAttribute('d',paths[symbol]);svg.append(path);
    return svg;
  }
  function replace(root) {
    if(root.nodeType!==1 || root.closest('svg,script,style'))return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const texts=[];
    while(walker.nextNode())texts.push(walker.currentNode);
    for(const node of texts){
      const parent=node.parentElement;
      if(!parent || parent.closest('script,style,svg') || !parent.closest('a,button,.es-open'))continue;
      const text=node.nodeValue;
      const matches=[...text.matchAll(/[⌄↗→↓☰×−+Ⅱ▶]/g)];
      if(!matches.length)continue;
      // Plus/minus are controls only. Preserve punctuation in product and order text.
      const chosen=matches.filter(m=>!['+','−','×'].includes(m[0]) || text.trim()===m[0]);
      if(!chosen.length)continue;
      const fragment=document.createDocumentFragment();let start=0;
      for(const match of chosen){
        fragment.append(document.createTextNode(text.slice(start,match.index)),icon(match[0]));
        start=match.index+match[0].length;
      }
      fragment.append(document.createTextNode(text.slice(start)));node.replaceWith(fragment);
    }
  }
  const observer=new MutationObserver(records=>{
    const roots=new Set();
    for(const record of records){
      if(record.type==='characterData')roots.add(record.target.parentElement);
      for(const node of record.addedNodes){
        if(node.nodeType===1 && node.localName!=='svg')roots.add(node);
        if(node.nodeType===3 && /[⌄↗→↓☰×−+Ⅱ▶]/.test(node.nodeValue))roots.add(record.target);
      }
    }
    roots.forEach(root=>{if(root?.isConnected)replace(root);});
  });
  replace(document.body);
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});
})();
