// Intro à l'ouverture de la page de Hannah. ?intro=1..4 pour choisir (preview).
(function(){
  const q=new URLSearchParams(location.search).get('intro');
  const V=q&&/^[1-4]$/.test(q)?q:null; if(!V)return;
  const fr=(document.documentElement.lang||'').startsWith('fr')||/^fr/i.test(navigator.language||'');
  const COL=['#E8336B','#3B82F6','#F6C945','#2BB673','#FF8A3D','#E8336B','#3B82F6'];
  const bal=c=>`<svg viewBox="0 0 70 160"><path d="M35 82 Q42 115 32 160" stroke="#10285E" stroke-width="1.4" fill="none" opacity=".6"/><ellipse cx="35" cy="40" rx="30" ry="36" fill="${c}"/><path d="M35 76l-5 7h10z" fill="${c}"/><ellipse cx="25" cy="27" rx="7" ry="11" fill="#fff" opacity=".35"/></svg>`;
  let balloons='';
  if(V==='3'){for(let i=0;i<16;i++){const x=(i%4)*25-6+Math.random()*10,y=Math.floor(i/4)*24-4+Math.random()*8;balloons+=`<div class="bl" style="left:${x}%;--y:${y}%;--w:${100+Math.random()*30}px;--d:${(Math.random()*.6).toFixed(2)}s;--r:${(Math.random()*24-12).toFixed(0)}deg">${bal(COL[i%7])}</div>`}}
  else{for(let i=0;i<9;i++){balloons+=`<div class="bl" style="left:${(i*11+Math.random()*5).toFixed(0)}%;--d:${(Math.random()*.7).toFixed(2)}s;--r:${(Math.random()*20-10).toFixed(0)}deg;width:${56+Math.random()*30}px">${bal(COL[i%7])}</div>`}}
  const name=V==='3'?[...'Hannah!'].map((c,i)=>`<i style="--i:${i}">${c}</i>`).join(''):'Hannah!';
  const el=document.createElement('div');el.id='intro';el.className='iv'+V;
  el.innerHTML=`<div class="cu l"></div><div class="cu r"></div>${balloons}<div class="ip"><span><img src="media/hannah.jpg" alt=""></span></div><div class="it"><span>Happy birthday,</span><b>${name}</b></div><div class="iy">${fr?'À vous de jouer !':"It's your turn!"}</div>`;
  document.body.appendChild(el);
  const t={1:450,2:700,3:900,4:1000}[V];
  setTimeout(()=>window.confettiBurst&&confettiBurst(),t);
  setTimeout(()=>el.remove(),3000);
  el.addEventListener('click',()=>el.remove());
})();
