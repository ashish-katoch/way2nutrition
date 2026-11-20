(() => {
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const overlay=document.createElementNS('http://www.w3.org/2000/svg','svg');
  overlay.setAttribute('class','scroll-shape-overlay');
  overlay.setAttribute('aria-hidden','true');
  overlay.setAttribute('preserveAspectRatio','none');
  const top=document.createElementNS(overlay.namespaceURI,'path');
  const bottom=document.createElementNS(overlay.namespaceURI,'path');
  overlay.append(top,bottom);document.body.append(overlay);
  let frame=0,lastY=scrollY,lastTime=performance.now(),speed=0,amount=0;
  let width=innerWidth,height=innerHeight,blocks=[];
  function collect(){
    blocks=Array.from(document.querySelectorAll('#app .nature-hero,#app .about-cover,#app .collection-scenes a,#app .config-visual,#app .about-product'));
  }
  function clear(){
    overlay.style.opacity='0';
    document.documentElement.style.setProperty('--scroll-bend','0');
    blocks.forEach(block=>block.style.removeProperty('clip-path'));
  }
  function draw(now){
    frame=0;
    const idle=now-lastTime>70;
    if(idle)speed*=.82;
    const target=preference.matches?0:Math.min(Math.abs(speed)*.11,innerWidth<700?20:40);
    amount+=(target-amount)*.16;
    if(amount<.08 && target<.08){amount=0;clear();return;}
    const header=document.querySelector('.mast').getBoundingClientRect();
    const edge=Math.max(0,header.bottom);
    overlay.style.opacity='1';
    overlay.setAttribute('viewBox','0 0 '+width+' '+height);
    top.setAttribute('d','M0 '+edge+'H'+width+'Q'+width/2+' '+(edge+amount*2)+' 0 '+edge+'Z');
    bottom.setAttribute('d','M0 '+height+'H'+width+'Q'+width/2+' '+(height-amount*2)+' 0 '+height+'Z');
    document.documentElement.style.setProperty('--scroll-bend',String(Math.min(amount/40,1)));
    for(const block of blocks){
      const rect=block.getBoundingClientRect();
      if(rect.bottom<0||rect.top>height)continue;
      const curve=Math.min(amount*.42,rect.height*.055);
      const points=[];
      for(let i=0;i<=16;i++){
        const x=i/16;points.push((x*100)+'% '+(4*x*(1-x)*curve)+'px');
      }
      for(let i=16;i>=0;i--){
        const x=i/16;points.push((x*100)+'% calc(100% - '+(4*x*(1-x)*curve)+'px)');
      }
      block.style.clipPath='polygon('+points.join(',')+')';
    }
    frame=requestAnimationFrame(draw);
  }
  function scroll(){
    const now=performance.now(),elapsed=Math.min(Math.max(now-lastTime,8),40);
    speed=Math.min(Math.abs(scrollY-lastY)/elapsed*16,600);
    lastY=scrollY;lastTime=now;
    if(!preference.matches&&!frame)frame=requestAnimationFrame(draw);
  }
  window.addEventListener('scroll',scroll,{passive:true});
  window.addEventListener('resize',()=>{width=innerWidth;height=innerHeight;});
  preference.addEventListener('change',()=>{cancelAnimationFrame(frame);frame=0;amount=speed=0;clear();});
  const observer=new MutationObserver(collect);
  observer.observe(document.getElementById('app'),{childList:true,subtree:true});
  collect();
})();
