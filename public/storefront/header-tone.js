(() => {
  const header=document.querySelector('.mast');
  let scheduled=false;
  function update(){
    scheduled=false;
    const hero=document.querySelector('.nature-hero,.about-cover');
    const dark=hero && hero.getBoundingClientRect().bottom>header.offsetHeight+20;
    header.classList.toggle('header-paper',!dark);
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('hashchange',schedule);
  window.addEventListener('resize',schedule);
  new MutationObserver(schedule).observe(document.querySelector('#app'),{childList:true});
  update();
})();
