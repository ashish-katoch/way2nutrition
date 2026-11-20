'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
export default function ScrollMotion(){
 const path=usePathname();
 useEffect(()=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||!['/','/about'].includes(path))return;
  const sections=[...document.querySelectorAll<HTMLElement>('#main > section')];
  const animations=new Map<HTMLElement,Animation>();
  let frame=0;
  const update=()=>{
   frame=0;
   const h=innerHeight;
   for(const section of sections){
    const rect=section.getBoundingClientRect();
    if(rect.bottom<0||rect.top>h)continue;
    const entering=Math.max(0,Math.min(1,rect.top/h));
    const leaving=Math.max(0,Math.min(1,(h-rect.bottom)/h));
    const radius=`${entering*65}px ${entering*65}px ${leaving*65}px ${leaving*65}px`;
    const animation=animations.get(section);
    if(animation)(animation.effect as KeyframeEffect).setKeyframes([{borderRadius:radius}]);
    else animations.set(section,section.animate([{borderRadius:radius}],{duration:1,fill:'both'}));
   }
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};

  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);update();
  return()=>{cancelAnimationFrame(frame);removeEventListener('scroll',schedule);removeEventListener('resize',schedule);animations.forEach(animation=>animation.cancel());};
 },[path]);
 return null;
}
