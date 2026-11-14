// Intro : la photo de Hannah charge en grand au centre (façon story), le fond s'ouvre,
// le titre tombe, puis les deux glissent à leur vraie place et la page apparaît.
(function(){
  const qs=new URLSearchParams(location.search);
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  let seen=false;try{seen=sessionStorage.getItem('hannah-intro')==='1'}catch(e){}
  if(seen&&!qs.has('intro'))return;
  try{sessionStorage.setItem('hannah-intro','1')}catch(e){}
  const ph=document.querySelector('#v1 .story.lg'),hb=document.querySelector('#v1 .hb'),app=document.querySelector('.app');
  if(!ph||!hb||!document.getElementById('v1').classList.contains('on'))return;
  scrollTo(0,0);
  const ov=document.createElement('div');ov.id='intro';app.prepend(ov);
  document.body.classList.add('intro');
  const vw=innerWidth,vh=innerHeight,r1=ph.getBoundingClientRect(),r2=hb.getBoundingClientRect();
  const S=Math.min(1.7,vw*.6/r1.width);
  // photo : centre de l'écran, en grand
  const pcx=vw/2,pcy=vh*.36;
  const tp=`translate(${pcx-(r1.left+r1.width/2)}px,${pcy-(r1.top+r1.height/2)}px) scale(${S})`;
  // titre : juste sous la photo agrandie
  const tcy=pcy+r1.height*S/2+24+r2.height/2;
  const tt=`translate(${vw/2-(r2.left+r2.width/2)}px,${tcy-(r2.top+r2.height/2)}px)`;
  ph.classList.add('fl');ph.style.transition='none';ph.style.transform=tp;
  hb.classList.add('fl');hb.style.transition='none';hb.style.transform=tt;hb.style.setProperty('--t',tt);
  const rest=[...document.querySelectorAll('.app>*:not(#v1):not(#intro),#v1>*:not(.hero):not(.dz),#v1 .hero>svg')];
  const dz=[...document.querySelectorAll('#v1 .dz')];
  rest.forEach(e=>e.classList.add('fadein'));
  setTimeout(()=>{ov.classList.add('rv');document.body.classList.add('rv2')},850);
  setTimeout(()=>{hb.style.opacity=1;hb.style.animation='islam .5s cubic-bezier(.2,.9,.3,1) both'},1050);
  setTimeout(()=>{window.confettiBurst&&confettiBurst()},1100);
  setTimeout(()=>{ // tout glisse à sa place
    ph.style.transition='';hb.style.transition='';hb.style.animation='none';
    requestAnimationFrame(()=>{ph.style.transform='';hb.style.transform=''});
    document.body.classList.remove('intro');
    ov.style.transition='opacity .3s';ov.style.opacity=0;
    dz.forEach(e=>{e.style.transition='opacity .8s ease .5s'});
    rest.forEach((e,i)=>{e.style.transform='translateY(18px)';e.style.opacity=0;e.style.transitionDelay=(.1+Math.min(i,8)*.06)+'s';
      requestAnimationFrame(()=>requestAnimationFrame(()=>{e.style.transform='';e.style.opacity=''}))});
  },1650);
  setTimeout(()=>{ov.remove();[ph,hb].forEach(e=>{e.classList.remove('fl');e.style.cssText=''});rest.forEach(e=>{e.classList.remove('fadein');e.style.transitionDelay=''});
    const b=document.querySelector('#v1 .btn');b&&b.classList.add('wig')},2700);
})();
