// A projected, rotating glass ribbon. Draw it behind the original product photography.
window.startGlassScene = function startGlassScene(root) {
  const hero = root.querySelector('.glass-hero');
  const canvas = hero.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = hero.querySelector('.motion-toggle');
  const events = new AbortController();
  const options = {signal:events.signal};
  let width, height, clock = 0, frame = 0, previous = 0, visible = true, paused = false;
  let pointerX = 0, pointerY = 0, driftX = 0, driftY = 0;
  function draw() {
    ctx.clearRect(0,0,width,height);
    const narrow = width <= 700;
    const cx = width * (narrow ? .56 : .758), cy = height * (narrow ? .74 : .49);
    const radius = Math.min(width * (narrow ? .44 : .246), height * .52);
    const tilt = -.43 + .10 * Math.sin(clock * .32) + driftX * .055;
    const phase = clock * .18;
    // Layered elliptical curves form the edges and polished surface of a twisted ribbon.
    for (let strand=0;strand<=48;strand++) {
      const v = strand / 48;
      ctx.beginPath();
      for (let step=0;step<=144;step++) {
        const angle = step * Math.PI / 72;
        const twist = Math.sin(2*angle+phase);
        const r = radius * (1 + (v-.5)*.24*Math.cos(2*angle+phase));
        const x = r * Math.cos(angle);
        const z = Math.sin(angle);
        const y = radius*(.57*z+(v-.5)*.31*twist);
        const depth = 1+.14*z;
        const px = cx+(x*Math.cos(tilt)-y*Math.sin(tilt))*depth;
        const py = cy+(x*Math.sin(tilt)+y*Math.cos(tilt))*depth + driftY * 3;
        if(step===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
      }
      ctx.closePath();
      const shine = Math.pow(Math.cos(v*Math.PI*3+phase*.5),8);
      const gradient = ctx.createLinearGradient(cx-radius,cy+radius*.3,cx+radius,cy-radius*.3);
      gradient.addColorStop(0,'rgba(182,246,195,.26)');
      gradient.addColorStop(.28,'rgba(222,245,255,'+(.18+.7*shine)+')');
      gradient.addColorStop(.5,'rgba(128,171,215,.28)');
      gradient.addColorStop(.72,'rgba(231,197,247,'+(.24+.64*shine)+')');
      gradient.addColorStop(1,'rgba(213,255,232,.62)');
      ctx.strokeStyle=gradient;ctx.lineWidth=strand===0||strand===48?1.7:1.1;ctx.stroke();
    }
  }
  function resize() {
    width=hero.clientWidth;height=hero.clientHeight;
    const scale=Math.min(devicePixelRatio||1,1.5);
    canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
    ctx.setTransform(scale,0,0,scale,0,0);draw();
  }
  function tick(time) {
    frame=requestAnimationFrame(tick);
    if(time-previous<33)return;
    clock+=previous?Math.min((time-previous)/1000,.08):0;previous=time;
    driftX+=(pointerX-driftX)*.14;driftY+=(pointerY-driftY)*.14;
    hero.style.setProperty('--shift',(driftX*7)+'px');
    hero.style.setProperty('--lift',(driftY*4-Math.sin(clock*.8)*3)+'px');
    draw();
  }
  function sync() {
    cancelAnimationFrame(frame);previous=0;
    toggle.hidden=motion.matches;
    if(visible && !document.hidden && !motion.matches && !paused)frame=requestAnimationFrame(tick);
    else if(motion.matches){hero.style.removeProperty('--shift');hero.style.removeProperty('--lift');draw();}
  }
  hero.addEventListener('pointermove',e=>{
    if(e.pointerType!=='mouse')return;
    const box=hero.getBoundingClientRect();
    pointerX=2*(e.clientX-box.left)/width-1;pointerY=2*(e.clientY-box.top)/height-1;
  },options);
  hero.addEventListener('pointerleave',()=>{pointerX=pointerY=0;},options);
  toggle.addEventListener('click',()=>{
    paused=!paused;toggle.textContent=paused?'▶':'Ⅱ';
    toggle.setAttribute('aria-pressed',String(paused));
    toggle.setAttribute('aria-label',(paused?'Play':'Pause')+' banner animation');sync();
  },options);
  const viewport=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});
  viewport.observe(hero);
  const reveals=new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('motion-enter');reveals.unobserve(entry.target);}
  });
  root.querySelectorAll('.sectionhead,.readguide h2,.story-poster h2').forEach(el=>reveals.observe(el));
  const size=new ResizeObserver(resize);size.observe(hero);
  motion.addEventListener('change',sync,options);document.addEventListener('visibilitychange',sync,options);
  resize();sync();
  return ()=>{events.abort();size.disconnect();viewport.disconnect();reveals.disconnect();cancelAnimationFrame(frame);};
};
