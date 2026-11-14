// Confettis et décor festif (anniversaire de Hannah). Rien d'interactif : purement décoratif.
(function(){
  const C=['#E8336B','#F6C945','#3B82F6','#10285E','#2BB673','#FF8A3D'];
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layer=document.createElement('div');layer.className='fx';document.body.prepend(layer);
  function piece(i,burst){
    const e=document.createElement('i'),c=C[i%C.length],t=i%4;
    e.style.left=(Math.random()*100)+'%';
    e.style.setProperty('--d',(burst?2.4+Math.random()*1.6:9+Math.random()*9)+'s');
    e.style.setProperty('--delay',(burst?Math.random()*.4:-Math.random()*18)+'s');
    e.style.setProperty('--r',(Math.random()*720-360)+'deg');
    e.style.setProperty('--x',(Math.random()*80-40)+'px');
    if(t===0){e.style.cssText+=`;width:7px;height:12px;background:${c};border-radius:2px`}
    else if(t===1){e.style.cssText+=`;width:8px;height:8px;background:${c};border-radius:50%`}
    else if(t===2){e.innerHTML=`<svg width="16" height="10" viewBox="0 0 16 10"><path d="M1 8 Q4 1 8 5 T15 2" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/></svg>`}
    else{e.innerHTML=`<svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 0l1.6 4.4L12 6l-4.4 1.6L6 12l-1.6-4.4L0 6l4.4-1.6z" fill="${c}"/></svg>`}
    if(burst)e.classList.add('b');
    layer.appendChild(e);if(burst)setTimeout(()=>e.remove(),4500);
  }
  if(!reduce)for(let i=0;i<26;i++)piece(i,false);
  window.confettiBurst=function(){if(reduce)return;for(let i=0;i<70;i++)piece(i,true)};
})();
