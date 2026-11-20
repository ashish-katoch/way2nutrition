window.startNatureMotion = function(root) {
  const section=root.querySelector('.formula-story');
  const poster=section.querySelector('.story-poster');
  const image=poster.querySelector('img');
  const chapters=Array.from(section.querySelectorAll('.story-chapters article'));
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const sources=[
    ['/assets/bottles/c-1000-100-tablets.webp','NOW Vitamin C-1000 bottle'],
    ['/assets/botanical.jpg','Rose hips botanical still life'],
    ['/assets/bottles/c-1000-tablet-size.webp','NOW manufacturer tablet size chart']
  ];
  sources.forEach(([src])=>{const preload=new Image();preload.src=src;});
  let active=-1,frame=0;
  function update(){
    frame=0;
    const compact=innerWidth<=700;
    const header=document.querySelector('.mast').offsetHeight;
    const target=header+(innerHeight-header)*.44;
    let nearest=0,distance=Infinity;
    chapters.forEach((chapter,index)=>{
      const box=chapter.getBoundingClientRect();
      const delta=Math.abs((box.top+box.height*.5)-target);
      if(delta<distance){distance=delta;nearest=index;}
    });
    if(nearest!==active){
      active=nearest;
      image.src=sources[active][0];image.alt=sources[active][1];
      poster.dataset.active=String(active);
      chapters.forEach((chapter,index)=>chapter.classList.toggle('chapter-active',index===active));
      if(!media.matches&&!compact)image.animate([
        {opacity:.15,transform:'translateY(14px) rotate(-3deg)'},
        {opacity:1,transform:'translateY(0) rotate(0)'}
      ],{duration:420,easing:'ease-out'});
    }
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  update();
  return ()=>{
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll',schedule);
    window.removeEventListener('resize',schedule);
  };
};
