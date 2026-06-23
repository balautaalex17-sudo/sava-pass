
/* ── inline icons ── */
const ICONS={
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  calendar:'<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/>',
  card:'<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/>',
  lock:'<rect x="4" y="10" width="16" height="11" rx="2.2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  pin:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  qr:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v7M17 21h-3"/>',
  ticket:'<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z"/><path d="M15 6.5v11" stroke-dasharray="2 2"/>',
  heart:'<path d="M12 20s-7-4.5-9.2-9C1.3 8 2.8 4.8 6 4.8c1.9 0 3.2 1.1 4 2.3.8-1.2 2.1-2.3 4-2.3 3.2 0 4.7 3.2 3.2 6.2C19 15.5 12 20 12 20Z"/>',
  doc:'<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  chat:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
  spark:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
  expand:'<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/>',
  close:'<path d="M6 6l12 12M18 6 6 18"/>'
};
function svgIcon(n,sw){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+(sw||1.8)+'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICONS[n]||'')+'</svg>';}
document.querySelectorAll('[data-i]').forEach(el=>{el.innerHTML=svgIcon(el.dataset.i);});

/* ── deterministic stylized QR ── */
(function(){
  const hosts=['qr','stepqr'].map(id=>document.getElementById(id)).filter(Boolean); if(!hosts.length) return;
  const N=25, sz=100/N; let seed=20240720;
  const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
  const inF=(r,c)=>{const f=(a,b)=>r>=a&&r<a+7&&c>=b&&c<b+7;return f(0,0)||f(0,N-7)||f(N-7,0);};
  const fOn=(r,c)=>{let fr,fc;if(r<7&&c<7){fr=r;fc=c;}else if(r<7){fr=r;fc=c-(N-7);}else{fr=r-(N-7);fc=c;}
    return (fr===0||fr===6||fc===0||fc===6)||(fr>=2&&fr<=4&&fc>=2&&fc<=4);};
  let rects='';
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const on=inF(r,c)?fOn(r,c):(rnd()>0.5);
    if(on)rects+='<rect class="m" x="'+(c*sz).toFixed(2)+'" y="'+(r*sz).toFixed(2)+'" width="'+sz.toFixed(2)+'" height="'+sz.toFixed(2)+'"/>';}
  const svgStr='<svg viewBox="0 0 100 100" preserveAspectRatio="none" shape-rendering="crispEdges" aria-hidden="true">'+rects+'</svg>';
  hosts.forEach(h=>h.insertAdjacentHTML('afterbegin',svgStr));
})();

/* ── Interact cogwheel (hand-built SVG) ── */
function interactWheel(){
  const NS='http://www.w3.org/2000/svg',C='#00A7E8',cx=120;
  const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 240 240');svg.setAttribute('class','wheel-svg');svg.setAttribute('aria-hidden','true');
  const gear=document.createElementNS(NS,'g');gear.setAttribute('class','gear');
  const map=(x,y,co,si)=>((x*co-y*si+cx).toFixed(1))+','+((x*si+y*co+cx).toFixed(1));
  const poly=(pts)=>{const p=document.createElementNS(NS,'polygon');p.setAttribute('points',pts);p.setAttribute('fill',C);gear.appendChild(p);};
  const teeth=24,rTip=116,rBase=100,tHW=4,bHW=7;
  for(let i=0;i<teeth;i++){const a=i*2*Math.PI/teeth,co=Math.cos(a),si=Math.sin(a);
    poly([[-bHW,-rBase],[-tHW,-rTip],[tHW,-rTip],[bHW,-rBase]].map(([x,y])=>map(x,y,co,si)).join(' '));}
  const rim=document.createElementNS(NS,'circle');rim.setAttribute('cx',cx);rim.setAttribute('cy',cx);rim.setAttribute('r',93);rim.setAttribute('fill','none');rim.setAttribute('stroke',C);rim.setAttribute('stroke-width',15);gear.appendChild(rim);
  const spokes=8,rOut=86,rIn=30,oHW=8.5,iHW=4.5;
  for(let i=0;i<spokes;i++){const a=i*2*Math.PI/spokes,co=Math.cos(a),si=Math.sin(a);
    poly([[-iHW,-rIn],[-oHW,-rOut],[oHW,-rOut],[iHW,-rIn]].map(([x,y])=>map(x,y,co,si)).join(' '));}
  const hub=document.createElementNS(NS,'circle');hub.setAttribute('cx',cx);hub.setAttribute('cy',cx);hub.setAttribute('r',30);hub.setAttribute('fill',C);gear.appendChild(hub);
  const bore=document.createElementNS(NS,'circle');bore.setAttribute('cx',cx);bore.setAttribute('cy',cx);bore.setAttribute('r',9);bore.setAttribute('fill','#F7FAFC');gear.appendChild(bore);
  svg.appendChild(gear);return svg;
}
const lw=document.getElementById('ll-wheel');if(lw)lw.appendChild(interactWheel());
/* concert atmosphere behind the stats section: festival bokeh + live equalizer */
(function(){
  const fx=document.querySelector('.stats-fx');
  if(fx){
    const cols=['rgba(255,205,130,','rgba(127,224,255,','rgba(0,167,232,'];
    for(let i=0;i<22;i++){
      const b=document.createElement('span');b.className='bokeh';
      const c=cols[i%cols.length],o=(.16+Math.random()*.3).toFixed(2),sz=(16+Math.random()*64).toFixed(0);
      b.style.cssText=
        'left:'+(Math.random()*100).toFixed(1)+'%;top:'+(Math.random()*100).toFixed(1)+'%;'+
        'width:'+sz+'px;height:'+sz+'px;'+
        'background:radial-gradient(circle,'+c+o+') 0%,'+c+'0) 70%);'+
        'filter:blur('+(5+Math.random()*9).toFixed(0)+'px);'+
        '--d:'+(11+Math.random()*12).toFixed(1)+'s;--dl:'+(-Math.random()*14).toFixed(1)+'s;'+
        '--dx:'+(Math.random()*40-20).toFixed(0)+'px;--o:'+o+';';
      fx.appendChild(b);
    }
  }
  const eq=document.querySelector('.eq');
  if(eq){
    for(let i=0;i<56;i++){
      const s=document.createElement('span');
      s.style.setProperty('--h',(16+Math.random()*64).toFixed(0)+'px');
      s.style.setProperty('--d',(.7+Math.random()*1.1).toFixed(2)+'s');
      s.style.setProperty('--dl',(-Math.random()*1.3).toFixed(2)+'s');
      eq.appendChild(s);
    }
  }
})();

/* ── Lenis smooth scroll ── */
const lenis = window.Lenis ? new Lenis({lerp:0.085,smoothWheel:true,wheelMultiplier:1.08,syncTouch:false}) : null;
if(lenis){if(window.gsap){gsap.ticker.add(t=>lenis.raf(t*1000));gsap.ticker.lagSmoothing(0);}else{function raf(t){lenis.raf(t);requestAnimationFrame(raf);}requestAnimationFrame(raf);}}
window.__lenis=lenis;

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── reveals ── */
const rvs=[...document.querySelectorAll('.rv')];
function fire(el){el.classList.add('in');if(!el.__ct){el.__ct=1;el.querySelectorAll('.ct').forEach(countUp);if(el.classList.contains('ct'))countUp(el);}}
if('IntersectionObserver' in window){
  /* replay: reveal on enter, re-hide on exit so the animation plays every time
     an element scrolls into view (not just once per page load) */
  const io=new IntersectionObserver((es)=>{es.forEach(e=>{
    if(e.isIntersecting){fire(e.target);io.unobserve(e.target);}
  });},{rootMargin:'0px 0px -12% 0px',threshold:.01});
  rvs.forEach(el=>io.observe(el));
}else rvs.forEach(fire);

/* ── stats count-up — dedicated observer so the numbers fire even if the Framer CDN module fails ── */
const statgridEl=document.getElementById('statgrid');
if(statgridEl){
  if('IntersectionObserver' in window){
    const sio=new IntersectionObserver((es)=>{es.forEach(e=>{if(e.isIntersecting){statgridEl.querySelectorAll('.ct').forEach(countUp);sio.disconnect();}});},{threshold:.25});
    sio.observe(statgridEl);
  }else statgridEl.querySelectorAll('.ct').forEach(countUp);
}

/* ── stats photo lightbox: click a card to view the event photo large ── */
(function(){
  const lbx=document.getElementById('lbx'); if(!lbx) return;
  const limg=lbx.querySelector('.lbx-img'), lcap=lbx.querySelector('.lbx-cap'), lx=lbx.querySelector('.lbx-x');
  let last=null;
  const openLbx=card=>{
    const im=card.querySelector('img'); if(!im) return;
    limg.src=im.currentSrc||im.src; limg.alt=im.alt||'';
    const lab=card.querySelector('.lab');
    lcap.textContent=card.dataset.cap || (lab?lab.textContent.trim():'');
    last=card; lbx.classList.add('open'); lbx.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden'; if(window.__lenis)window.__lenis.stop();
    lx.focus();
  };
  const closeLbx=()=>{
    lbx.classList.remove('open'); lbx.setAttribute('aria-hidden','true');
    document.body.style.overflow=''; if(window.__lenis)window.__lenis.start();
    if(last)last.focus();
  };
  document.querySelectorAll('#statgrid .stat, #jointeam').forEach(card=>{
    card.setAttribute('role','button'); card.setAttribute('tabindex','0');
    card.insertAdjacentHTML('beforeend','<span class="stat-zoom" aria-hidden="true">'+svgIcon('expand',1.8)+'</span>');
    card.addEventListener('click',()=>openLbx(card));
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openLbx(card);}});
  });
  lbx.addEventListener('click',e=>{if(e.target===lbx||e.target.closest('.lbx-x'))closeLbx();});
  addEventListener('keydown',e=>{if(e.key==='Escape'&&lbx.classList.contains('open'))closeLbx();});
})();

/* ── count-up ── */
function countUp(el){
  const t=parseFloat(el.dataset.c),suf=el.dataset.suf||'',isF=t%1!==0,dur=1500,t0=performance.now();
  if(reduce){el.textContent=(isF?t.toFixed(1):Math.round(t))+suf;return;}
  function step(n){const k=Math.min((n-t0)/dur,1),e=1-Math.pow(1-k,3);
    el.textContent=(isF?(t*e).toFixed(1):Math.round(t*e))+suf;if(k<1)requestAnimationFrame(step);}
  requestAnimationFrame(step);
}

/* ── GSAP: hero headline mask reveal + ticket scan loop ── */
if(window.gsap && !reduce){
  /* step cards: 3D pointer tilt + lift */
  if(!matchMedia('(hover:none)').matches){
    document.querySelectorAll('.step').forEach(card=>{
      const rx=gsap.quickTo(card,'rotationX',{duration:.5,ease:'power3'}),ry=gsap.quickTo(card,'rotationY',{duration:.5,ease:'power3'}),ty=gsap.quickTo(card,'y',{duration:.5,ease:'power3'});
      card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect();const px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;rx(py*-7);ry(px*9);ty(-10);});
      card.addEventListener('pointerleave',()=>{rx(0);ry(0);ty(0);});
    });
  }
  /* animate the QR code inside step 3 (module flicker) */
  const sq=[...document.querySelectorAll('#stepqr rect.m')];
  if(sq.length){gsap.to(gsap.utils.shuffle(sq).slice(0,18),{opacity:.2,duration:.6,repeat:-1,yoyo:true,stagger:{each:.05,from:'random'},ease:'sine.inOut'});}
  const scan=document.querySelector('.qr-scan'), qrEl=document.querySelector('.qr'), ok=document.querySelector('.tk-ok');
  if(scan&&ok){
    gsap.set(ok,{opacity:0,y:8,scale:.96});
    const tl=gsap.timeline({repeat:-1,repeatDelay:.6});
    tl.set(scan,{top:2,opacity:0}).set(ok,{opacity:0,y:8,scale:.96})
      .to(scan,{opacity:1,duration:.18}).to(scan,{top:'calc(100% - 18px)',duration:1.2,ease:'none'})
      .to(scan,{opacity:0,duration:.18})
      .to(qrEl,{boxShadow:'0 0 36px rgba(0,167,232,.6)',duration:.25},'-=.1')
      .to(ok,{opacity:1,y:0,scale:1,duration:.45,ease:'power3.out'},'-=.05')
      .to({},{duration:1.8}).to(ok,{opacity:0,y:7,duration:.3})
      .to(qrEl,{boxShadow:'0 0 30px rgba(0,167,232,.28)',duration:.3},'<');
  }
  /* gentle parallax on the feature media */
  if(window.ScrollTrigger){
    gsap.registerPlugin(ScrollTrigger);
    if(lenis) lenis.on('scroll',ScrollTrigger.update);
    /* hero headline mask reveal — fires as the hero scrolls up into view (not on load) */
    (function(){var spans=[].slice.call(document.querySelectorAll('.hline>span'));if(!spans.length)return;spans.forEach(function(s){s.style.transition='transform 1.1s cubic-bezier(.16,1,.3,1)';s.style.willChange='transform';});var go=function(){spans.forEach(function(s,i){setTimeout(function(){s.style.setProperty('transform','translateY(0)','important');},i*110);});};var h=document.getElementById('hero');if(h&&'IntersectionObserver'in window){var io=new IntersectionObserver(function(es){for(var i=0;i<es.length;i++){if(es[i].isIntersecting){go();io.disconnect();return;}}},{threshold:.12});io.observe(h);}else{go();}})();
    /* mobile perf: the continuous parallax/scrub ScrollTriggers below update every scroll frame and tank mobile FPS — run them on non-touch only. Entrance reveals (.rv / .im-rv) and the hero+phone showpiece are separate and stay on all devices. */
    var __noTouch=!matchMedia('(hover:none)').matches; if(__noTouch){
    gsap.to('#tkwrap',{yPercent:-12,ease:'none',scrollTrigger:{trigger:'#hero',start:'top top',end:'bottom top',scrub:true}});

    /* seam connectors: thread + node draw in as each section arrives */
    document.querySelectorAll('.seam').forEach(seam=>{
      const line=seam.querySelector('i'), node=seam.querySelector('b');
      gsap.timeline({scrollTrigger:{trigger:seam,start:'top 94%',end:'top 52%',scrub:.6}})
        .fromTo(line,{scaleY:0},{scaleY:1,ease:'none'},0)
        .fromTo(node,{scale:0},{scale:1,ease:'none'},.25);
    });
    /* ambient parallax — depth on the Higgsfield loops */
    gsap.to('.hero-video',{yPercent:16,ease:'none',scrollTrigger:{trigger:'#hero',start:'top bottom',end:'bottom top',scrub:true}});
    gsap.to('.foot-video',{yPercent:14,ease:'none',scrollTrigger:{trigger:'.foot',start:'top bottom',end:'bottom top',scrub:true}});
    /* event poster: slow scrub zoom as it passes through */
    gsap.fromTo('.ev-poster img',{scale:1.12},{scale:1,ease:'none',scrollTrigger:{trigger:'.ev-feat',start:'top bottom',end:'bottom top',scrub:true}});
    /* footer headline rises into place */
    gsap.from('.foot .big',{yPercent:22,opacity:.35,ease:'none',scrollTrigger:{trigger:'.foot',start:'top 88%',end:'top 48%',scrub:true}});
    /* time: the ghost year-numerals drift as each generation scrolls through */
    document.querySelectorAll('.gen-ghost').forEach(g=>{
      const row=g.closest('.gen-row'); if(!row) return;
      gsap.fromTo(g,{yPercent:-12},{yPercent:12,ease:'none',scrollTrigger:{trigger:row,start:'top bottom',end:'bottom top',scrub:true}});
    });
    }  /* end desktop-only parallax/scrub block */
    /* recompute trigger positions once fonts/images/videos settle — otherwise
       start/end are measured against an unsettled layout and scrub feels off */
    ScrollTrigger.refresh();
    addEventListener('load',()=>ScrollTrigger.refresh());
    setTimeout(()=>ScrollTrigger.refresh(),600);
    /* (stat entrance is now driven by Framer Motion in the module below) */
  }
  /* iPhone: entrance + perpetual float + 3D pointer-tilt (GSAP) */
  const phone=document.getElementById('phone');
  if(phone){
    gsap.set(phone,{rotationX:2,rotationY:-6,transformPerspective:1000,transformOrigin:'50% 50%'});
    gsap.set(phone,{autoAlpha:0,scale:.9});(function(){var hh=document.getElementById('hero');var pin=function(){gsap.to(phone,{autoAlpha:1,scale:1,duration:1.1,ease:'power3.out'});};if(hh&&'IntersectionObserver'in window){var pio=new IntersectionObserver(function(es){for(var i=0;i<es.length;i++){if(es[i].isIntersecting){pin();pio.disconnect();return;}}},{threshold:.12});pio.observe(hh);}else{pin();}})();
    gsap.to(phone,{y:-15,duration:3.6,ease:'sine.inOut',repeat:-1,yoyo:true});
    const heroEl=document.getElementById('hero');
    if(heroEl && !matchMedia('(hover:none)').matches){
      const rx=gsap.quickTo(phone,'rotationX',{duration:.6,ease:'power3'});
      const ry=gsap.quickTo(phone,'rotationY',{duration:.6,ease:'power3'});
      heroEl.addEventListener('pointermove',e=>{const r=heroEl.getBoundingClientRect();
        const px=(e.clientX-r.left)/r.width-.5, py=(e.clientY-r.top)/r.height-.5;rx(2+py*-12);ry(-6+px*16);});
      heroEl.addEventListener('pointerleave',()=>{rx(2);ry(-6);});
    }
  }
}else if(reduce){document.querySelectorAll('.tk-ok').forEach(o=>o.style.opacity='1');}

/* ── snap-lock onto sections (intro · hero · event · stats · join) — full-screen ones commit, tall ones lock at the edge (desktop, motion-on) ── */
if(lenis && !reduce && matchMedia('(hover:hover) and (pointer:fine)').matches){
  const els=['hero','event','stats','join'].map(id=>document.getElementById(id)).filter(Boolean);
  if(els.length){
    const topOf=el=>Math.round(el.getBoundingClientRect().top+(window.scrollY||0));
    let cache=null;
    const stops=()=>cache||(cache=[0,...els.map(topOf)].sort((a,b)=>a-b));
    addEventListener('resize',()=>{cache=null;},{passive:true});
    addEventListener('load',()=>{cache=null;});
    const bracket=(a,y)=>{ for(let i=0;i<a.length-1;i++){ if(y>a[i]+2 && y<a[i+1]-2) return [a[i],a[i+1]]; } return null; };
    const easeOut=x=>1-Math.pow(1-x,3);
    let snapT=0, resetT=0, dir=1, snapping=false;
    lenis.on('scroll',()=>{
      if(snapping) return;
      if(lenis.direction) dir=lenis.direction;
      if(!bracket(stops(),lenis.scroll)) return;        // sitting on a stop, or below the last section
      clearTimeout(snapT);
      snapT=setTimeout(()=>{                             // fires once the scroll has settled between two stops
        cache=null;                                     // re-measure at snap time (images/reflow may have shifted tops)
        const y=window.scrollY||0, b=bracket(stops(),y); if(!b) return;
        const [lo,hi]=b, gap=hi-lo, vh=innerHeight; let target=null;
        if(gap<=vh*1.15){                               // adjacent full-screen sections → always commit (directional bias)
          const f=(y-lo)/gap; target = dir>0 ? (f>0.30?hi:lo) : (f<0.70?lo:hi);
        }else{                                          // tall section → only lock as you approach an edge, never yank mid-content
          if(dir>0 && hi-y < vh*0.42) target=hi;
          else if(dir<0 && y-lo < vh*0.42) target=lo;
        }
        if(target===null || Math.abs(target-y)<2) return;
        snapping=true;
        lenis.scrollTo(target,{duration:0.6,easing:easeOut});
        clearTimeout(resetT); resetT=setTimeout(()=>{snapping=false;},680);
      },110);
    });
  }
}

/* ── magnetic buttons ── */
if(!matchMedia('(hover:none)').matches){
  document.querySelectorAll('.mag').forEach(el=>{
    el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();
      el.style.transform='translate('+((e.clientX-(r.left+r.width/2))*.25).toFixed(1)+'px,'+((e.clientY-(r.top+r.height/2))*.4).toFixed(1)+'px)';});
    el.addEventListener('pointerleave',()=>{el.style.transform='';});
  });
}

/* ── progress rail + section dots ── */
const rail=document.getElementById('rail');
const lrailFill=document.querySelector('.lrail .fill');
const dotEls=[...document.querySelectorAll('.dots a')];
const secs=dotEls.map(a=>document.getElementById(a.dataset.s));
function chrome(){
  const h=document.documentElement, max=h.scrollHeight-innerHeight, sc=window.scrollY||h.scrollTop||0;
  const pct=(max>0?Math.min(100,sc/max*100):0);
  if(rail) rail.style.width=pct.toFixed(2)+'%';
  if(lrailFill) lrailFill.style.height=pct.toFixed(2)+'%';
  document.body.classList.toggle('scrolled',sc>innerHeight*.5);
  const cy=innerHeight*.4; let act=0;
  secs.forEach((s,i)=>{if(s){const r=s.getBoundingClientRect();if(r.top<=cy)act=i;}});
  dotEls.forEach((a,i)=>a.classList.toggle('on',i===act));
}
let __chromeQ=false;function __chromeT(){if(__chromeQ)return;__chromeQ=true;requestAnimationFrame(function(){__chromeQ=false;chrome();});}
addEventListener('scroll',__chromeT,{passive:true});
if(lenis) lenis.on('scroll',__chromeT);
chrome();
dotEls.forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const t=document.getElementById(a.dataset.s);
  if(t){if(lenis)lenis.scrollTo(t,{offset:-10});else window.scrollTo(0,t.getBoundingClientRect().top+(window.scrollY||0)-10);}}));

/* ensure muted background videos autoplay (and resume when tab becomes visible) */
function kickVideos(){document.querySelectorAll('video').forEach(v=>{v.muted=true;if(v.__rev)return;const p=v.play();if(p&&p.catch)p.catch(()=>{});});}
kickVideos();
addEventListener('pointerdown',kickVideos,{once:true});
addEventListener('scroll',kickVideos,{once:true,passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)kickVideos();});
if('IntersectionObserver'in window){var __vio=new IntersectionObserver(function(es){es.forEach(function(e){var v=e.target;if(e.isIntersecting){v.muted=true;var p=v.play();if(p&&p.catch)p.catch(function(){});}else{v.pause();}});},{threshold:.05});document.querySelectorAll('video').forEach(function(v){__vio.observe(v);});}

/* seamless ping-pong loop — the Higgsfield clips don't loop cleanly (first and
   last frames differ, so a plain loop shows a hard cut). Play forward, then
   scrub in reverse, repeat, so the loop boundary is always continuous. The
   footer disintegrate clip reads as "reassemble → dissolve". */
if(!reduce){document.querySelectorAll('video').forEach(v=>{
  return; /* native loop: skip the per-frame reverse-scrub (jank source) */                 // looping is driven manually below
  let last=0;
  function reverse(now){
    const dt=Math.min(0.05,(now-last)/1000); last=now;
    v.currentTime=Math.max(0,v.currentTime-dt);
    if(v.currentTime<=0.02){v.currentTime=0;v.__rev=false;const p=v.play();if(p&&p.catch)p.catch(()=>{});return;}
    requestAnimationFrame(reverse);
  }
  v.addEventListener('ended',()=>{v.__rev=true;last=performance.now();requestAnimationFrame(reverse);});
});}
