/* ════════════════════════════════════════════════════════════════
   Plan de salle (formule Master) — /gestion → Réservations → Espaces et tables
   - Tables : restaurant_tables (places, nom, espace) = la même source que la liste écrite.
   - Disposition (pièces, murs, fenêtres, portes, modèles, positions, déco) : DATA.floorPlan,
     enregistrée avec le reste de /gestion (touch).
   - Vit dans #fpHost, que morphdom ne touche pas (voir render()).
   ════════════════════════════════════════════════════════════════ */
(function(){
const PX=75, snap=v=>Math.round(v/6)*6, mtr=v=>(v/PX).toFixed(1).replace('.',','), cm=v=>Math.round(v/PX*100);
const COL={floor:'#faf5ec',ter:'#f1e8d8',wall:'#2f3437',table:'#e08a62',chair:'#2f3437',plant:'#8fae7c',paras:'#ead9bd',sel:'#e08a62'};
const ST={l:'#8fae7c',r:'#5b8fc7',a:'#2f3437'};
const H=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const R=(x,y,w,h,rx,a)=>`<rect x="${x}" y="${y}" width="${Math.max(0,w)}" height="${Math.max(0,h)}" rx="${rx}" ${a}/>`, C=(x,y,r,a)=>`<circle cx="${x}" cy="${y}" r="${r}" ${a}/>`, T=(x,y,s,a)=>`<text x="${x}" y="${y}" ${a}>${s}</text>`;
const ISO=d=>{ const z=new Date(d.getTime()-d.getTimezoneOffset()*6e4); return z.toISOString().slice(0,10); };
const IC={room:'<svg viewBox="0 0 26 20"><rect x="3" y="3" width="20" height="14" rx="2" fill="#faf5ec" stroke="#2f3437" stroke-width="2"/></svg>',
 win:'<svg viewBox="0 0 26 20"><rect x="2" y="8" width="22" height="4" fill="#2f3437"/><rect x="7" y="7" width="12" height="6" fill="#fff" stroke="#2f3437"/></svg>',
 door:'<svg viewBox="0 0 26 20"><rect x="2" y="15" width="22" height="3" fill="#2f3437"/><rect x="7" y="14" width="12" height="5" fill="#fff"/><path d="M7 16 L7 4 A12 12 0 0 1 19 16Z" fill="#f1e8d8"/></svg>',
 t2:'<svg viewBox="0 0 26 20"><rect x="8" y="5" width="10" height="10" rx="2" fill="#e08a62"/><rect x="9" y="0.5" width="8" height="3" rx="1.5" fill="#2f3437"/><rect x="9" y="16.5" width="8" height="3" rx="1.5" fill="#2f3437"/></svg>',
 t4:'<svg viewBox="0 0 26 20"><rect x="4" y="5" width="18" height="10" rx="2" fill="#e08a62"/><rect x="5" y="0.5" width="6" height="3" rx="1.5" fill="#2f3437"/><rect x="15" y="0.5" width="6" height="3" rx="1.5" fill="#2f3437"/><rect x="5" y="16.5" width="6" height="3" rx="1.5" fill="#2f3437"/><rect x="15" y="16.5" width="6" height="3" rx="1.5" fill="#2f3437"/></svg>',
 t6:'<svg viewBox="0 0 26 20"><rect x="1.5" y="6" width="23" height="8" rx="2" fill="#e08a62"/><rect x="2" y="1.5" width="5" height="3" rx="1.5" fill="#2f3437"/><rect x="10.5" y="1.5" width="5" height="3" rx="1.5" fill="#2f3437"/><rect x="19" y="1.5" width="5" height="3" rx="1.5" fill="#2f3437"/><rect x="2" y="15.5" width="5" height="3" rx="1.5" fill="#2f3437"/><rect x="10.5" y="15.5" width="5" height="3" rx="1.5" fill="#2f3437"/><rect x="19" y="15.5" width="5" height="3" rx="1.5" fill="#2f3437"/></svg>',
 r:'<svg viewBox="0 0 26 20"><circle cx="13" cy="10" r="5.5" fill="#e08a62"/><circle cx="13" cy="1.8" r="1.8" fill="#2f3437"/><circle cx="13" cy="18.2" r="1.8" fill="#2f3437"/><circle cx="4.8" cy="10" r="1.8" fill="#2f3437"/><circle cx="21.2" cy="10" r="1.8" fill="#2f3437"/></svg>',
 bar:'<svg viewBox="0 0 26 20"><rect x="2" y="10" width="22" height="7" rx="2" fill="#2f3437"/><circle cx="6" cy="5" r="2.5" fill="#2f3437"/><circle cx="13" cy="5" r="2.5" fill="#2f3437"/><circle cx="20" cy="5" r="2.5" fill="#2f3437"/></svg>',
 c:'<svg viewBox="0 0 26 20"><rect x="7" y="5" width="12" height="9" rx="3" fill="#2f3437"/></svg>',
 s:'<svg viewBox="0 0 26 20"><circle cx="13" cy="10" r="5.5" fill="#2f3437"/></svg>',
 p:'<svg viewBox="0 0 26 20"><circle cx="13" cy="10" r="7.5" fill="#8fae7c"/></svg>',
 u:'<svg viewBox="0 0 26 20"><circle cx="13" cy="10" r="8.5" fill="#ead9bd"/><circle cx="13" cy="10" r="1.6" fill="#2f3437"/></svg>'};

const CSS=`
.fp{--fpl:#e6ecf0}
.fp-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:14px 16px}
.fp-seg{display:inline-flex;background:#eef1f5;border-radius:999px;padding:3px}
.fp-seg button{font:600 13px Inter,sans-serif;border:0;background:none;border-radius:999px;padding:7px 14px;cursor:pointer;color:#36495e}
.fp-seg button.on{background:#fff;color:#14171a;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.fp-hrs{display:flex;gap:6px;flex-wrap:wrap}
.fp-hrs button{font:600 12.5px Inter,sans-serif;border:1px solid var(--fpl);background:#fff;border-radius:999px;padding:6px 11px;cursor:pointer}
.fp-hrs button.on{background:#10285e;color:#fff;border-color:#10285e}
.fp-chips{display:flex;gap:6px;flex-wrap:wrap;margin-left:auto}
.fp-chip{font-size:12px;font-weight:600;padding:5px 10px;border-radius:999px;background:#eef1f5;color:#36495e}.fp-chip b{color:#14171a}
.fp-ed{display:grid;grid-template-columns:200px minmax(0,1fr) 250px;border-top:1px solid var(--fpl)}
.fp-ed.svc{grid-template-columns:minmax(0,1fr) 250px}.fp-ed.svc .fp-pal{display:none}
.fp-pal{padding:12px;border-right:1px solid var(--fpl);display:flex;flex-direction:column;gap:6px;min-width:0}
.fp-pal h4,.fp-side h4{margin:8px 0 2px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#657786}
.fp-pal h4:first-child{margin-top:0}
.fp-pal button{display:flex;align-items:center;gap:8px;font:600 12.5px Inter,sans-serif;border:1px solid var(--fpl);background:#fff;border-radius:12px;padding:7px 9px;cursor:pointer;text-align:left;color:#14171a;line-height:1.25}
.fp-pal button:hover{border-color:#e08a62}
.fp-pal button small{display:block;font-weight:500;color:#657786;font-size:11px}
.fp-pal .more{border-style:dashed;justify-content:center;color:#657786;font-weight:600}
.fp-pal svg{width:26px;height:20px;flex:none}
.fp-pal select,.fp-side select,.fp-side input{font:500 13px Inter,sans-serif;border:1px solid var(--fpl);border-radius:10px;padding:6px 8px;background:#fff;max-width:100%}
.fp-into{display:flex;flex-direction:column;gap:4px;font-size:11.5px;color:#657786;margin-bottom:4px}
.fp-cv{padding:12px;min-width:0}.fp-cv svg{width:100%;height:auto;display:block;touch-action:none;user-select:none}
.fp-side{padding:14px;border-left:1px solid var(--fpl);font-size:13px;min-width:0}
.fp-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:10px 0}
.fp-row input,.fp-row select{width:130px}
.fp-step{display:flex;align-items:center;gap:8px}
.fp-step button{width:30px;height:30px;border-radius:50%;border:1px solid var(--fpl);background:#fff;font-size:16px;cursor:pointer}
.fp-act{display:flex;flex-direction:column;gap:6px;margin-top:12px}
.fp-act button,.fp-act a{font:600 12.5px Inter,sans-serif;border:1px solid var(--fpl);background:#fff;border-radius:10px;padding:8px;cursor:pointer;text-align:center;color:#14171a;text-decoration:none}
.fp-act .p{background:#10285e;color:#fff;border-color:#10285e}.fp-act .r{color:#c0392b}.fp-act button:disabled{opacity:.4;cursor:default}
.fp-empty{color:#657786;font-size:12.5px;line-height:1.55}
.fp-leg{display:flex;flex-direction:column;gap:7px;font-size:12.5px;color:#36495e}.fp-leg i{display:inline-block;width:14px;height:14px;border-radius:4px;vertical-align:-3px;margin-right:7px}
.fp-card{background:#f5f3ef;border-radius:12px;padding:12px;margin-top:10px;line-height:1.5}.fp-card b{font-size:15px}
.fp-tog{display:flex;align-items:center;gap:8px;margin:8px 0;font-size:12.5px;cursor:pointer}
.fp-ed:not(.svc){grid-template-columns:minmax(0,1fr)!important}.fp-ed:not(.svc)>.fp-pal,.fp-ed:not(.svc)>.fp-side{display:none!important}
.fp-cv{position:relative}
.fp-cnt{display:flex;gap:8px}.fp-cnt div{background:#f1eee8;border-radius:14px;padding:7px 14px;text-align:center;min-width:74px}.fp-cnt b{display:block;font-size:20px;line-height:1.15;color:#16181d}.fp-cnt span{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#7a7f88}
.fp-tools{display:flex;gap:8px;flex-wrap:wrap}.fp-tool{display:inline-flex;align-items:center;gap:7px;background:#f1eee8;border:0;border-radius:999px;padding:10px 16px;font:600 14px Inter,sans-serif;color:#16181d;cursor:pointer}.fp-tool.pr{background:#10285e;color:#fff}.fp-tool i{font-style:normal;font-size:17px;line-height:1;font-weight:500}
.fp-bar .fp-seg{margin-left:auto}.fp-hint{font-size:12.5px;color:#7a7f88}
.fp-pop{position:absolute;left:14px;top:12px;z-index:5;background:#fff;border-radius:18px;padding:16px;box-shadow:0 0 0 1px #e7e2d9;width:320px;max-width:calc(100% - 28px)}
.fp-pop .st{display:flex;gap:6px;margin-bottom:12px}.fp-pop .st i{flex:1;height:4px;border-radius:4px;background:#e7e2d9}.fp-pop .st i.on{background:#10285e}
.fp-pop h4{margin:0 0 4px;font-size:16px;text-transform:none;letter-spacing:0;color:#16181d}.fp-pop .rc{font-size:12.5px;color:#7a7f88;margin:0 0 12px;min-height:16px}
.fp-pop .g{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.fp-pop .g.g2{grid-template-columns:repeat(2,1fr)}
.fp-pc{background:#f1eee8;border:2px solid transparent;border-radius:12px;padding:11px 6px;font:700 16px Inter,sans-serif;color:#16181d;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px}.fp-pc.on{border-color:#10285e;color:#10285e}.fp-pc small{font-size:12px;font-weight:600}.fp-pc svg{width:40px;height:26px}
.fp-pop input{width:100%;font:700 16px Inter,sans-serif;border:2px solid transparent;background:#f1eee8;border-radius:12px;padding:10px;text-align:center}.fp-pop input:focus{outline:0;border-color:#10285e}
.fp-pop .ft{display:flex;justify-content:space-between;align-items:center;margin-top:14px}.fp-pop .ft button{border:0;background:none;font:700 13.5px Inter,sans-serif;color:#7a7f88;cursor:pointer;padding:4px 0}.fp-pop .ft .go{background:#10285e;color:#fff;border-radius:999px;padding:10px 18px}
.fp-bub .fp-r1,.fp-bub .fp-r2{display:flex;align-items:center;gap:8px}.fp-bub .fp-r2{margin-top:8px;padding-top:8px;border-top:1px solid #efebe4;flex-wrap:wrap}.fp-bub:has(.fp-r1){flex-direction:column;align-items:stretch}
.fp-bub{position:absolute;z-index:4;width:max-content;display:flex;align-items:center;gap:8px;background:#fff;border-radius:16px;padding:8px 10px;box-shadow:0 0 0 1px #e7e2d9;white-space:nowrap;font:500 13px Inter,sans-serif}
.fp-bub input{width:92px;font:700 13.5px Inter,sans-serif;border:0;background:#f1eee8;border-radius:10px;padding:6px 8px}.fp-bub .stp{display:inline-flex;align-items:center;background:#f1eee8;border-radius:999px}.fp-bub .stp button{border:0;background:none;width:30px;height:30px;font-weight:700;color:#7a7f88;font-size:16px;cursor:pointer}.fp-bub .stp em{font-style:normal;font-weight:700;min-width:70px;text-align:center}
.fp-bub .fp-b{border:0;background:#f1eee8;border-radius:999px;padding:8px 12px;font:600 12.5px Inter,sans-serif;color:#16181d;cursor:pointer}.fp-bub .fp-b.red{background:#fdecec;color:#c62828}.fp-bub .sep{width:1px;height:22px;background:#e7e2d9}
@media(max-width:700px){.fp-bub{flex-wrap:wrap;white-space:normal;max-width:calc(100% - 16px)}.fp-cnt div{min-width:0;padding:6px 10px}.fp-cnt b{font-size:17px}.fp-tool{padding:9px 13px;font-size:13px}}
@media(max-width:900px){.fp-ed,.fp-ed.svc{grid-template-columns:minmax(0,1fr)}.fp-pal{border-right:0;border-bottom:1px solid var(--fpl)}.fp-side{border-left:0;border-top:1px solid var(--fpl)}.fp-chips{margin-left:0}.fp-pal .fp-desk{display:none}}
@media(min-width:901px){.fp-pal .fp-mob{display:none}.fp-desk{display:contents}}
@media(max-width:900px){.fp-cv{order:1}.fp-pal{order:2}.fp-side{order:3}.fp-pal{flex-direction:row;flex-wrap:wrap;align-items:end}.fp-into{flex:1 1 160px}.fp-mob{flex:1 1 160px}.fp-mob select{width:100%}}`;

// ── état local ──
let ADD=null;
let L=null, MODE='svc', SEL=null, SVC=null, OPEN={}, INTO=null, GUIDES=[], LAST=null, ASKDEL=null, NID=1, seatT=null;
const tablesNow=()=>(typeof TABLES!=='undefined'?TABLES:[]), spacesNow=()=>(typeof SPACES!=='undefined'?SPACES:[]);
const spName=id=>{ const s=spacesNow().find(x=>x.id===id); return s?s.name:'—'; };
const isDeco=t=>t.kind==='plant'||t.kind==='parasol';
const MD=id=>L.models.find(q=>q.id===id);

const STD={car:{w:60,h:60},rect:{w:100,h:60},lon:{w:160,h:60},ron:{w:64,h:64}};
function defaults(){ return {v:1,
  rooms:[{id:'salle',name:'Salle',kind:'room',x:30,y:50,w:588,h:558}],
  opens:[], deco:[], pos:{},
  models:[{id:'car',name:'Carrée',w:60,h:60,seats:2},{id:'rect',name:'Rectangle',w:100,h:60,seats:4},{id:'lon',name:'Longue',w:160,h:60,seats:6},{id:'ron',name:'Ronde',w:64,h:64,seats:4,round:1}]}; }

// Première ouverture : disposition proposée à partir des espaces (Murs à gauche, Fenêtres à droite,
// Bar en bas, Terrasse dans une pièce extérieure, le reste au milieu).
function seed(){ const l=defaults(), tb=tablesNow(), sps=spacesNow();
  const isTer=n=>/terr|ext|jardin|patio/i.test(n||''), isBar=n=>/bar|comptoir/i.test(n||'');
  if(sps.some(s=>isTer(s.name))){ l.rooms.push({id:'ter',name:'Terrasse',kind:'terrace',x:660,y:50,w:318,h:558}); l.models.push({id:'bis',name:'Bistrot terrasse',w:44,h:56,seats:2}); }
  else l.rooms[0].w=948;
  const S0=l.rooms[0]; l.opens.push({id:'d1',type:'door',room:'salle',side:'r',pos:390,len:72},{id:'w1',type:'win',room:'salle',side:'r',pos:60,len:90},{id:'w2',type:'win',room:'salle',side:'r',pos:200,len:90});
  const cols={mur:S0.x+50,mil:S0.x+S0.w*.42,fen:S0.x+S0.w-140};
  const cur={}; let midK=0;
  sps.forEach(s=>{ const own=tb.filter(t=>t.space_id===s.id); const n=(s.name||'');
    let zone=isTer(n)?'ter':isBar(n)?'bar':/mur|banquette/i.test(n)?'mur':/fen[eê]tre|vitre/i.test(n)?'fen':'mil';
    own.forEach(t=>{ const seats=+t.seats||2; const p={};
      if(zone==='bar'){ p.kind='bar'; p.x=S0.x+40; p.y=S0.y+S0.h-90; p.w=Math.max(160,seats*58); p.h=44; }
      else if(zone==='ter'){ const ter=l.rooms[1]; const k=cur.ter||(cur.ter={x:ter.x+16,y:ter.y+130}); p.model=seats<=2?'bis':seats<=4?'rect':'lon'; if(seats>4&&seats<=8){ p.model='bis'; p.units=Math.ceil(seats/2); }
        const md=l.models.find(q=>q.id===p.model), w=md.w*(p.units||1); if(k.x+w>ter.x+ter.w-10){ k.x=ter.x+16; k.y+=130; } p.x=k.x; p.y=k.y; k.x+=w+24; }
      else { const k=cur[zone]||(cur[zone]={x:cols[zone]+(zone==='mil'?(midK++)*0:0),y:S0.y+80}); p.model=seats<=2?'car':seats<=4?'rect':'lon'; p.rot=(zone==='mur'||zone==='mil')&&seats>2?1:0; if(zone==='mur') p.side='one';
        const md=l.models.find(q=>q.id===p.model), hh=p.rot?md.w:md.h; if(k.y+hh>S0.y+S0.h-130){ k.y=S0.y+80; k.x+=130; } p.x=k.x; p.y=k.y; k.y+=hh+70; }
      l.pos[t.id]=p; }); });
  return l; }

// Tables affichées = lignes de restaurant_tables + leur position enregistrée.
function items(){ const out=[];
  tablesNow().forEach(row=>{ const p=L.pos[row.id]||(L.pos[row.id]=autoPos(row)); const t=Object.assign({},p,{id:row.id,name:row.name||('Table '+(tablesNow().filter(o=>o.space_id===row.space_id).indexOf(row)+1)),seats:+row.seats||1,space_id:row.space_id}); t.r4=(((+p.rot||0)%4)+4)%4; t.rot=t.r4%2;
    const md=t.model&&MD(t.model);
    if(t.kind==='chair'){ t.w=t.rot?14:20; t.h=t.rot?20:14; }
    else if(t.kind==='stool'){ t.w=t.h=20; }
    else if(t.kind==='bar'){ const bw=p.w||200, bh=p.h||44; t.w=t.rot?bh:bw; t.h=t.rot?bw:bh; }
    else if(md){ const sc=p.sc||1; if(md.round){ t.kind='round'; t.w=t.h=md.w*sc; } else { const Ln=md.w*(t.units||1)*sc, Hh=md.h*sc; t.w=t.rot?Hh:Ln; t.h=t.rot?Ln:Hh; } }
    else { t.w=p.w||80; t.h=p.h||56; }
    out.push(t); });
  return out; }
// Nouvelle table (ajoutée depuis la liste) : posée dans la pièce de son espace, sur la première place libre (jamais sur une autre table).
function autoPos(row){ const n=+row.seats||2, model=n<=2?'car':n<=4?'rect':'lon', md=MD(model)||{w:80,h:56};
  const sp=spacesNow().find(x=>x.id===row.space_id), nm=((sp&&sp.name)||'').toLowerCase();
  const room=L.rooms.find(r=>(r.name||'').toLowerCase()===nm)||(/terr|ext/.test(nm)&&L.rooms.find(r=>r.kind==='terrace'))||L.rooms[0];
  const boxes=tablesNow().filter(o=>o.id!==row.id&&L.pos[o.id]).map(o=>{ const q=L.pos[o.id], m=q.model&&MD(q.model); const Ln=m?m.w*(q.units||1):(q.w||80), H2=m?m.h:(q.h||56); return {x:q.x,y:q.y,w:(q.rot%2)?H2:Ln,h:(q.rot%2)?Ln:H2,_:q.rot?Ln:H2}; });
  const free=(x,y)=>boxes.every(b=>x+md.w+30<b.x||x>b.x+b.w+30||y+md.h+30<b.y||y>b.y+b.h+30);
  for(let y=room.y+60;y+md.h<room.y+room.h-20;y+=24) for(let x=room.x+30;x+md.w<room.x+room.w-20;x+=24) if(free(x,y)) return {x:snap(x),y:snap(y),model};
  return {x:snap(room.x+room.w*.5),y:snap(room.y+room.h*.45),model}; }
function seatSides(t){ const n=t.seats, hz=t.w>=t.h; if(t.side==='one'){ const k=['t','r','b','l'][t.r4||0], o={t:0,b:0,l:0,r:0}; o[(hz&&(k==='l'||k==='r'))?'t':(!hz&&(k==='t'||k==='b'))?'r':k]=n; return o; } const a=Math.ceil(n/2), b=Math.floor(n/2); return hz?{t:a,b,l:0,r:0}:{t:0,b:0,l:a,r:b}; }
function chairs(t){ const o=[], cw=20, ch=12, g=5; if(t.kind&&t.kind!=='round') return o;
  if(t.kind==='round'){ const n=t.seats, cx=t.x+t.w/2, cy=t.y+t.h/2, Rr=t.w/2+g+7; for(let i=0;i<n;i++){ const a=-Math.PI/2+i*2*Math.PI/n; o.push({x:cx+Rr*Math.cos(a)-7,y:cy+Rr*Math.sin(a)-7,w:14,h:14,rx:7}); } return o; }
  const s=seatSides(t), side=(n,hz,f)=>{ for(let i=0;i<n;i++){ const Ln=hz?t.w:t.h, p=(hz?t.x:t.y)+Ln*(i+.5)/n; o.push(hz?{x:p-cw/2,y:f,w:cw,h:ch,rx:5}:{x:f,y:p-cw/2,w:ch,h:cw,rx:5}); } };
  side(s.t,1,t.y-g-ch); side(s.b,1,t.y+t.h+g); side(s.l,0,t.x-g-ch); side(s.r,0,t.x+t.w+g); return o; }
function seams(t){ let s=''; const u=t.units||1; for(let i=1;i<u;i++){ if(t.w>=t.h){ const x=t.x+t.w*i/u; s+=`<line x1="${x}" y1="${t.y}" x2="${x}" y2="${t.y+t.h}" stroke="${COL.floor}" stroke-width="3"/>`; } else { const y=t.y+t.h*i/u; s+=`<line x1="${t.x}" y1="${y}" x2="${t.x+t.w}" y2="${y}" stroke="${COL.floor}" stroke-width="3"/>`; } } return s; }
const bbox=t=>isDeco(t)?{x:t.x-t.r,y:t.y-t.r,w:t.r*2,h:t.r*2}:{x:t.x,y:t.y,w:t.w,h:t.h};
const roomOf=(x,y)=>L.rooms.slice().reverse().find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h);
function seg(o){ const r=L.rooms.find(x=>x.id===o.room); if(!r) return null; const Ln=(o.side==='t'||o.side==='b')?r.w:r.h; o.pos=Math.max(8,Math.min(Ln-o.len-8,o.pos));
  if(o.side==='t') return {x:r.x+o.pos,y:r.y,hz:1,r}; if(o.side==='b') return {x:r.x+o.pos,y:r.y+r.h,hz:1,r}; if(o.side==='l') return {x:r.x,y:r.y+o.pos,hz:0,r}; return {x:r.x+r.w,y:r.y+o.pos,hz:0,r}; }
const isSel=(k,id)=>SEL&&SEL.k===k&&String(SEL.id)===String(id);
const handle=(x,y,k,id,c)=>`<g data-fk="h" data-t="${k}" data-id="${id}" data-c="${c}" style="cursor:nwse-resize">${C(x,y,12,'fill="transparent"')}${C(x,y,6.5,`fill="#fff" stroke="${COL.sel}" stroke-width="2.5"`)}</g>`;

// ── réservations du jour, par table ──
function resaMap(){ const out={}; if(typeof RESA==='undefined') return out; const today=ISO(new Date());
  const sv=SVC&&typeof SERVICES!=='undefined'?SERVICES.find(s=>String(s.id)===String(SVC)):null;
  const inSv=slot=>{ if(!sv) return true; const a=(sv.start_time||'').slice(0,5), b=(sv.end_time||'').slice(0,5), x=(slot||'').slice(0,5); return a<=b?(x>=a&&x<=b):(x>=a||x<=b); };
  RESA.filter(r=>r.date_iso===today&&!['cancelled','noshow','removed'].includes(r.status)&&inSv(r.slot)).sort((a,b)=>(a.slot||'').localeCompare(b.slot||''))
    .forEach(r=>(r.table_ids||[]).forEach(id=>{ const e=out[id]; const v={k:r.attended?'a':'r',name:r.from_name||'—',cov:+r.covers||0,slot:(r.slot||'').slice(0,5),n:1,ref:r.ref};
      if(!e) out[id]=v; else { e.n++; if(e.k!=='a'&&v.k==='a') Object.assign(e,v,{n:e.n}); } }));
  return out; }

// ── dessin ──
let VB={x:0,y:0,w:1000,h:640};
function draw(){ const host=document.getElementById('fpHost'); if(!host||!L) return; const svg=host.querySelector('svg.fp-svg'); if(!svg) return;
  const ed=MODE==='edit', res=ed?{}:resaMap(), its=items(); let s='', top='';
  // cadre : tout le contenu + marge
  let x1=1e9,y1=1e9,x2=-1e9,y2=-1e9; L.rooms.forEach(r=>{x1=Math.min(x1,r.x);y1=Math.min(y1,r.y);x2=Math.max(x2,r.x+r.w);y2=Math.max(y2,r.y+r.h);}); its.concat(L.deco).forEach(t=>{const b=bbox(t);x1=Math.min(x1,b.x-30);y1=Math.min(y1,b.y-40);x2=Math.max(x2,b.x+b.w+30);y2=Math.max(y2,b.y+b.h+40);});
  if(x1>x2){x1=0;y1=0;x2=1000;y2=640;} VB={x:x1-24,y:y1-20,w:Math.max(600,x2-x1+48),h:Math.max(360,y2-y1+44)};
  GUIDES.forEach(g=>top+=`<line x1="${g[0]}" y1="${g[1]}" x2="${g[2]}" y2="${g[3]}" stroke="${COL.sel}" stroke-width="1.5" stroke-dasharray="4 4" pointer-events="none"/>`);
  L.rooms.forEach(r=>{ const on=ed&&isSel('room',r.id);
    s+=`<g data-fk="room" data-id="${r.id}" style="cursor:${ed?'move':'default'}">${r.kind==='terrace'?R(r.x,r.y,r.w,r.h,18,`fill="${COL.ter}"`):R(r.x,r.y,r.w,r.h,14,`fill="${COL.floor}" stroke="${COL.wall}" stroke-width="6"`)}</g>`;
    s+=T(r.x+18,r.y+28,H(r.name).toUpperCase(),`font-size="11" font-weight="800" letter-spacing="1.6" fill="${COL.wall}" opacity=".45" pointer-events="none"`);
    if(ed) s+=T(r.x+r.w-16,r.y+28,`${mtr(r.w)} × ${mtr(r.h)} m`,`text-anchor="end" font-size="11" font-weight="700" fill="${COL.wall}" opacity=".45" pointer-events="none"`);
    if(on){ top+=R(r.x-5,r.y-5,r.w+10,r.h+10,18,`fill="none" stroke="${COL.sel}" stroke-width="2" stroke-dasharray="6 5" pointer-events="none"`); [['nw',r.x,r.y],['ne',r.x+r.w,r.y],['sw',r.x,r.y+r.h],['se',r.x+r.w,r.y+r.h]].forEach(([c,x,y])=>top+=handle(x,y,'room',r.id,c)); } });
  L.opens.forEach(o=>{ const g=seg(o); if(!g) return; const on=ed&&isSel('open',o.id); let q='';
    q+=g.hz?R(g.x,g.y-5,o.len,10,0,'fill="#fff"'):R(g.x-5,g.y,10,o.len,0,'fill="#fff"');
    if(o.type==='win') q+=g.hz?`<line x1="${g.x}" y1="${g.y}" x2="${g.x+o.len}" y2="${g.y}" stroke="${COL.wall}" stroke-width="1.5"/>`:`<line x1="${g.x}" y1="${g.y}" x2="${g.x}" y2="${g.y+o.len}" stroke="${COL.wall}" stroke-width="1.5"/>`;
    else { const Ln=o.len; let d; if(o.side==='r') d=`M${g.x} ${g.y} L${g.x-Ln} ${g.y} A${Ln} ${Ln} 0 0 0 ${g.x} ${g.y+Ln}Z`; else if(o.side==='l') d=`M${g.x} ${g.y} L${g.x+Ln} ${g.y} A${Ln} ${Ln} 0 0 1 ${g.x} ${g.y+Ln}Z`; else if(o.side==='t') d=`M${g.x} ${g.y} L${g.x} ${g.y+Ln} A${Ln} ${Ln} 0 0 0 ${g.x+Ln} ${g.y}Z`; else d=`M${g.x} ${g.y} L${g.x} ${g.y-Ln} A${Ln} ${Ln} 0 0 1 ${g.x+Ln} ${g.y}Z`; q=`<path d="${d}" fill="${COL.ter}"/>`+q; }
    s+=`<g data-fk="open" data-id="${o.id}" style="cursor:${ed?'grab':'default'}">${g.hz?R(g.x,g.y-12,o.len,24,0,'fill="transparent"'):R(g.x-12,g.y,24,o.len,0,'fill="transparent"')}${q}</g>`;
    if(on){ top+=g.hz?R(g.x-4,g.y-10,o.len+8,20,6,`fill="none" stroke="${COL.sel}" stroke-width="2" stroke-dasharray="4 4" pointer-events="none"`):R(g.x-10,g.y-4,20,o.len+8,6,`fill="none" stroke="${COL.sel}" stroke-width="2" stroke-dasharray="4 4" pointer-events="none"`); top+=handle(g.hz?g.x+o.len:g.x,g.hz?g.y:g.y+o.len,'open',o.id,'end'); } });
  L.deco.forEach(t=>{ const on=ed&&isSel('deco',t.id); const g=t.kind==='plant'?C(t.x,t.y,t.r,`fill="${COL.plant}"`):C(t.x,t.y,t.r,`fill="${COL.paras}"`)+C(t.x,t.y,5,`fill="${COL.wall}"`);
    s+=`<g data-fk="deco" data-id="${t.id}" style="cursor:${ed?'grab':'default'}">${g}</g>`; if(on){ top+=C(t.x,t.y,t.r+7,`fill="none" stroke="${COL.sel}" stroke-width="2" stroke-dasharray="5 4" pointer-events="none"`)+handle(t.x+t.r*.71+5,t.y+t.r*.71+5,'deco',t.id,'se'); } });
  its.forEach(t=>{ const r=res[t.id], k=r?r.k:'l', on=isSel('item',t.id), cc=ed?COL.chair:ST[k]; let g='';
    if(t.kind==='chair') g=R(t.x,t.y,t.w,t.h,5,`fill="${ed?(on?COL.sel:COL.chair):ST[k]}"`);
    else if(t.kind==='stool') g=C(t.x+10,t.y+10,10,`fill="${ed?(on?COL.sel:COL.chair):ST[k]}"`);
    else { chairs(t).forEach(c=>g+=R(c.x,c.y,c.w,c.h,c.rx,`fill="${cc}"`));
      if(t.kind==='bar'){ const busy=r?Math.min(t.seats,r.cov):0, vb=t.h>t.w, rr=t.r4||0; g+=R(t.x,t.y,t.w,t.h,10,`fill="${COL.wall}"`); for(let j=0;j<t.seats;j++) g+=(vb?C(rr===1?t.x+t.w+19:t.x-19,t.y+t.h*(j+.5)/t.seats,10,''):C(t.x+t.w*(j+.5)/t.seats,rr===2?t.y+t.h+19:t.y-19,10,'')).replace('/>',` fill="${ed?COL.chair:j<busy?(r.k==='a'?ST.a:ST.r):ST.l}"/>`); if(ed) g+=T(t.x+t.w/2,t.y+t.h/2+4,'Bar',`text-anchor="middle" font-size="12" font-weight="800" fill="#fff"${vb?` transform="rotate(-90 ${t.x+t.w/2} ${t.y+t.h/2})"`:''}`); if(!ed&&r) g+=T(t.x+t.w/2,t.y+t.h/2+5,`${H(r.name)} · ${busy}/${t.seats}`,'text-anchor="middle" font-size="12" font-weight="700" fill="#fff"'); }
      else if(t.kind==='round') g+=C(t.x+t.w/2,t.y+t.h/2,t.w/2,`fill="${COL.table}"`);
      else g+=R(t.x,t.y,t.w,t.h,8,`fill="${COL.table}"`)+seams(t);
      const cx=t.x+t.w/2, cy=t.y+t.h/2, vert=t.h>t.w*1.6;
      if(t.kind!=='bar'){ if(!ed&&r){ const lab=`${r.name} · ${r.cov}${r.k==='r'&&r.slot?' · '+r.slot:''}${r.n>1?' +'+(r.n-1):''}`, w=lab.length*6.6+16; g+=`<g ${vert?`transform="rotate(-90 ${cx} ${cy})"`:''}>${R(cx-w/2,cy-11,w,22,11,`fill="${ST[k]}"`)}${T(cx,cy+4,H(lab),'text-anchor="middle" font-size="11.5" font-weight="700" fill="#fff"')}</g>`; }
        else g+=T(cx,cy+5,H(t.name||t.seats),'text-anchor="middle" font-size="12.5" font-weight="800" fill="#fff"'); } }
    const bb=bbox(t); if(!ed&&on) g=R(bb.x-20,bb.y-20,bb.w+40,bb.h+40,14,`fill="${ST[k]}" opacity=".14"`)+g;
    const vbar=t.kind==='bar'&&t.h>t.w, ox=t.kind==='bar'?32:14;
    s+=`<g data-fk="item" data-id="${t.id}" style="cursor:${ed?'grab':'pointer'}">${R(bb.x-ox,bb.y-ox,bb.w+ox*2,bb.h+ox*2,10,'fill="transparent"')}${g}</g>`;
    if(ed&&on){ const sx=t.kind==='bar'?38:22; top+=R(bb.x-sx,bb.y-sx,bb.w+sx*2,bb.h+sx*2,14,`fill="none" stroke="${COL.sel}" stroke-width="2" stroke-dasharray="5 4" pointer-events="none"`);
      if(t.kind!=='chair'&&t.kind!=='stool') top+=handle(bb.x+bb.w,bb.y+bb.h,'item',t.id,'se'); } });
  // étiquettes d'espaces au-dessus de chaque groupe
  const grp={}, tot={}; its.forEach(t=>{ tot[t.space_id]=(tot[t.space_id]||0)+t.seats; if(t.kind==='chair'||t.kind==='stool') return; const b=bbox(t), g=grp[t.space_id]||(grp[t.space_id]={x1:1e9,y1:1e9,x2:-1e9,y2:-1e9,bar:t.kind==='bar'}); g.x1=Math.min(g.x1,b.x); g.y1=Math.min(g.y1,b.y); g.x2=Math.max(g.x2,b.x+b.w); g.y2=Math.max(g.y2,b.y+b.h); });
  Object.entries(grp).forEach(([k,g])=>{ const y=g.bar?g.y2+28:g.y1-32; s+=T((g.x1+g.x2)/2,y,`${H(spName(+k))} · ${tot[k]}`,`text-anchor="middle" font-size="12.5" font-weight="700" fill="${COL.wall}" pointer-events="none" style="paint-order:stroke;stroke:${COL.floor};stroke-width:5px"`); });
  svg.setAttribute('viewBox',`${VB.x} ${VB.y} ${VB.w} ${VB.h}`); svg.innerHTML=s+top;
  // barre du haut
  const cap=its.reduce((a,t)=>a+t.seats,0);
  let chips=`<span class="fp-chip"><b>${its.filter(t=>t.kind!=='chair'&&t.kind!=='stool').length}</b> tables</span><span class="fp-chip">Total <b>${cap}</b> places</span>`;
  if(!ed){ const v=Object.values(res), occ=v.reduce((a,r)=>a+(r.k==='a'?r.cov:0),0), rv=v.reduce((a,r)=>a+(r.k==='r'?r.cov:0),0); chips=`<span class="fp-chip">À table <b>${occ}</b></span><span class="fp-chip">Attendus <b>${rv}</b></span><span class="fp-chip">Libres <b>${Math.max(0,cap-occ-rv)}</b> places</span>`; }
  const nTb=its.filter(t=>t.kind!=='chair'&&t.kind!=='stool').length, nSp=spacesNow().length;
  host.querySelector('.fp-cnt').innerHTML=`<div><b>${nSp}</b><span>espace${nSp>1?'s':''}</span></div><div><b>${nTb}</b><span>table${nTb>1?'s':''}</span></div><div><b>${cap}</b><span>places</span></div>`;
  host.querySelector('.fp-tools').innerHTML=ed?[['table','Table',1],['bar','Bar'],['door','Porte'],['win','Fenêtre'],['room','Pièce']].map(([k,l,pr])=>`<button class="fp-tool${pr?' pr':''}" data-ftool="${k}"><i>+</i>${l}</button>`).join(''):'';
  if(ed) chips='<span class="fp-hint">Glissez pour déplacer · coin pour agrandir</span>';
  host.querySelector('.fp-chips').innerHTML=chips;
  const sec=host.closest('.fpsec'); if(sec) sec.classList.toggle('fp-editing',ed);
  const sv=typeof SERVICES!=='undefined'?SERVICES:[];
  host.querySelector('.fp-hrs').innerHTML=ed?'':[['','Toute la journée']].concat(sv.map(x=>[x.id,x.name])).map(([id,n])=>`<button data-fsv="${id}" class="${String(SVC||'')===String(id)?'on':''}">${H(n)}</button>`).join('');
  host.querySelector('.fp-ed').classList.toggle('svc',!ed);
  host.querySelectorAll('.fp-seg button').forEach(b=>b.classList.toggle('on',b.dataset.fm===MODE));
  pal(its); side(res,its); overlay(its); }

// ── palette (2 éléments par groupe, « + » pour tout voir) ──
function pal(its){ const el=document.querySelector('#fpHost .fp-pal'); if(!el) return; const sps=spacesNow(); if(INTO==null||!sps.find(s=>s.id===INTO)) INTO=sps.length?sps[0].id:null;
  const cnt=id=>its.filter(t=>t.model===id).length;
  const G=[['Structure','st',[['room',IC.room,'Pièce'],['win',IC.win,'Fenêtre'],['door',IC.door,'Porte']]],
    ['Mes modèles de tables','md',L.models.map(m=>['m:'+m.id,m.round?IC.r:m.seats<=2?IC.t2:m.seats<=4?IC.t4:IC.t6,`${H(m.name)} · ${m.seats} pl.<small>${m.round?'Ø '+cm(m.w):cm(m.w)+' × '+cm(m.h)} cm · ${cnt(m.id)} sur le plan</small>`]).concat([['m:new',IC.t4,'+ Nouveau modèle'],['bar',IC.bar,'Bar (comptoir)']])],
    ['Places','pl',[['c',IC.c,'Chaise seule'],['s',IC.s,'Tabouret']]],
    ['Déco','de',[['p',IC.p,'Plante'],['u',IC.u,'Parasol']]]];
  let h=`<div class="fp-into">Ajouter dans l'espace<select data-finto>${sps.map(s=>`<option value="${s.id}" ${s.id===INTO?'selected':''}>${H(s.name)}</option>`).join('')}</select></div>`;
  h+=`<div class="fp-mob"><select data-fadd><option value="">+ Ajouter un élément…</option>${G.map(([t,,arr])=>`<optgroup label="${t}">${arr.map(([k,,lab])=>`<option value="${k}">${lab.replace(/<small>.*<\/small>/,'').replace(/&amp;/g,'&')}</option>`).join('')}</optgroup>`).join('')}</select></div>`;
  h+=`<div class="fp-desk">`+G.map(([t,key,arr])=>{ const open=OPEN[key], shown=open?arr:arr.slice(0,2);
    return `<h4>${t}</h4>`+shown.map(([k,ic,lab])=>`<button data-fadd="${k}">${ic}<span>${lab}</span></button>`).join('')+(arr.length>2?`<button class="more" data-fmore="${key}">${open?'Moins':'+ '+(arr.length-2)+' de plus'}</button>`:''); }).join('')+`</div>`;
  el.innerHTML=h; }

// ── panneau de droite ──
const stepRow=(lab,val,x)=>`<div class="fp-row"><span>${lab}</span><div class="fp-step"><button data-fx="${x}-">−</button><b>${val}</b><button data-fx="${x}+">+</button></div></div>`;
function partner(t,its){ if(!t||t.kind||!t.model) return null; const hz=t.w>=t.h; let best=null,bd=1e9; its.forEach(o=>{ if(o.id===t.id||o.kind||o.model!==t.model||o.space_id!==t.space_id||(o.w>=o.h)!==hz) return; const d=Math.hypot(o.x+o.w/2-t.x-t.w/2,o.y+o.h/2-t.y-t.h/2); if(d<bd&&d<220){bd=d;best=o;} }); return best; }
function side(res,its){ const el=document.querySelector('#fpHost .fp-side'); if(!el) return;
  if(MODE==='svc'){ const t=SEL&&SEL.k==='item'&&its.find(x=>String(x.id)===String(SEL.id)), r=t&&res[t.id];
    el.innerHTML=`<h4>Aujourd'hui</h4><div class="fp-leg"><span><i style="background:${ST.l}"></i>Libre</span><span><i style="background:${ST.r}"></i>Réservée</span><span><i style="background:${ST.a}"></i>À table (venu)</span></div>`+(t?`<div class="fp-card">${r?`<b>${H(r.name)}</b><br>${r.cov} couverts${r.slot?' · '+r.slot:''}${r.n>1?`<br><span style="color:#657786">+ ${r.n-1} autre${r.n>2?'s':''} réservation${r.n>2?'s':''} sur cette table</span>`:''}<br><span style="color:#657786">${H(t.name||'Table')} · ${H(spName(t.space_id))}</span>`:`<b>${H(t.name||'Table')}</b><br>${t.seats} places · libre<br><span style="color:#657786">${H(spName(t.space_id))}</span>`}<div class="fp-act"><a class="p" href="#/resa">Voir les réservations</a></div></div>`:`<p class="fp-empty" style="margin-top:14px">Touchez une table pour voir sa réservation. Les réservations sans table attribuée n'apparaissent pas sur le plan.</p>`); return; }
  if(!SEL){ el.innerHTML=`<h4>Modifier le plan</h4><p class="fp-empty"><b>Pièce</b> : clique sur le sol, tire les coins ou règle en mètres.<br><br><b>Fenêtre, porte</b> : glisse-les le long d'un mur.<br><br><b>Table</b> : glisse-la ; elle s'aligne sur ses voisines. Les tables d'un même modèle gardent la même taille.<br><br>Les places, noms et espaces sont les mêmes que dans la liste au-dessus.</p>`; return; }
  if(SEL.k==='room'){ const r=L.rooms.find(x=>x.id===SEL.id); if(!r){ SEL=null; return side(res,its); } el.innerHTML=`<h4>Pièce</h4><div class="fp-row"><span>Nom</span><input value="${H(r.name)}" data-ff="rname"></div>${stepRow('Largeur',mtr(r.w)+' m','rw')}${stepRow('Profondeur',mtr(r.h)+' m','rh')}<div class="fp-row"><span>Type</span><b>${r.kind==='terrace'?'Extérieur':'Intérieur'}</b></div><div class="fp-act"><button data-fx="rkind">${r.kind==='terrace'?'Passer en intérieur (murs)':'Passer en extérieur (sans murs)'}</button>${L.rooms.length>1?'<button class="r" data-fx="del">Supprimer la pièce</button>':''}</div>`; return; }
  if(SEL.k==='open'){ const o=L.opens.find(x=>x.id===SEL.id); if(!o){ SEL=null; return side(res,its); } const r=L.rooms.find(x=>x.id===o.room)||{}; el.innerHTML=`<h4>${o.type==='win'?'Fenêtre':'Porte'}</h4>${stepRow('Largeur',cm(o.len)+' cm','ol')}<div class="fp-row"><span>Mur</span><b>${H(r.name)} · ${({t:'haut',b:'bas',l:'gauche',r:'droite'})[o.side]}</b></div><div class="fp-act"><button data-fx="otype">Changer en ${o.type==='win'?'porte':'fenêtre'}</button><button class="r" data-fx="del">Supprimer</button></div>`; return; }
  if(SEL.k==='deco'){ const t=L.deco.find(x=>x.id===SEL.id); if(!t){ SEL=null; return side(res,its); } el.innerHTML=`<h4>${t.kind==='plant'?'Plante':'Parasol'}</h4>${stepRow('Diamètre',cm(t.r*2)+' cm','dr')}<div class="fp-act"><button class="r" data-fx="del">Supprimer</button></div>`; return; }
  const t=its.find(x=>String(x.id)===String(SEL.id)); if(!t){ SEL=null; return side(res,its); }
  const solo=t.kind==='chair'||t.kind==='stool', md=t.model&&MD(t.model), p=partner(t,its);
  let h=`<h4>${solo?(t.kind==='chair'?'Chaise':'Tabouret'):t.kind==='bar'?'Bar':'Table'}</h4>`;
  h+=`<div class="fp-row"><span>Nom</span><input value="${H(t.name||'')}" placeholder="ex. T4" data-ff="name"></div>`;
  h+=`<div class="fp-row"><span>Espace</span><select data-ff="space">${spacesNow().map(s=>`<option value="${s.id}" ${s.id===t.space_id?'selected':''}>${H(s.name)}</option>`).join('')}</select></div>`;
  if(!solo) h+=stepRow(t.kind==='bar'?'Tabourets':'Places',t.seats,'n');
  if(md){ const n2=its.filter(o=>o.model===md.id).length;
    h+=`<div class="fp-row"><span>Modèle</span><select data-ff="model">${L.models.map(q=>`<option value="${q.id}" ${q.id===md.id?'selected':''}>${H(q.name)}</option>`).join('')}</select></div>`;
    h+=md.round?stepRow('Diamètre',cm(md.w)+' cm','md'):stepRow('Longueur',cm(md.w)+' cm','ml')+stepRow('Largeur',cm(md.h)+' cm','mw');
    h+=`<p class="fp-empty" style="margin:2px 0 6px">${n2>1?`Dimensions du modèle « ${H(md.name)} » : elles s'appliquent aux <b>${n2} tables</b> de ce modèle.`:`Dimensions du modèle « ${H(md.name)} ».`}</p>`;
    if(LAST&&String(LAST.tid)===String(t.id)&&n2>1) h+=`<div class="fp-card" style="margin:6px 0">Les ${n2} tables « ${H(md.name)} » ont été modifiées ensemble.<div class="fp-act"><button data-fx="only">Seulement celle-ci</button></div></div>`;
    h+=`<label class="fp-tog"><input type="checkbox" data-ff="oneside" ${t.side==='one'?'checked':''}> Chaises d'un seul côté (banquette, mur)</label>`;
    h+=`<div class="fp-row"><span>Nom du modèle</span><input value="${H(md.name)}" data-ff="mname"></div>`; }
  else if(t.kind==='bar') h+=stepRow('Longueur',cm(t.w)+' cm','bl');
  h+=`<div class="fp-act">${!t.kind&&md&&!md.round?`<button class="p" data-fx="join" ${p?'':'disabled'}>${p?`Réunir avec ${H(p.name||'la voisine')} → ${t.seats+p.seats} places`:'Aucune table voisine identique à réunir'}</button>`:''}${(t.units||1)>1?`<button data-fx="split">Séparer en ${t.units} tables</button>`:''}${!t.kind||t.kind==='chair'||t.kind==='bar'?'<button data-fx="rot">Tourner</button>':''}`+
    (ASKDEL===t.id?`<div class="fp-card" style="margin:0">Supprimer cette table ? Les réservations déjà faites dessus la perdront.<div class="fp-act"><button class="r" data-fx="delyes">Oui, supprimer</button><button data-fx="delno">Annuler</button></div></div>`:`<button class="r" data-fx="del">Supprimer</button>`)+`</div>`;
  el.innerHTML=h; }

// ── fenêtre « + Table » (une question à la fois) et bulle de l'élément sélectionné ──
const SHAPES=[['car','Carrée'],['rect','Rectangle'],['lon','Longue'],['ron','Ronde']];
const SHP={"car": "<svg viewBox=\"0 0 40 26\"><rect x=\"12\" y=\"4\" width=\"18\" height=\"18\" rx=\"3\" fill=\"#e08a62\"/></svg>", "rect": "<svg viewBox=\"0 0 40 26\"><rect x=\"5\" y=\"6\" width=\"30\" height=\"14\" rx=\"3\" fill=\"#e08a62\"/></svg>", "lon": "<svg viewBox=\"0 0 40 26\"><rect x=\"1\" y=\"8\" width=\"38\" height=\"10\" rx=\"3\" fill=\"#e08a62\"/></svg>", "ron": "<svg viewBox=\"0 0 40 26\"><circle cx=\"20\" cy=\"13\" r=\"10\" fill=\"#e08a62\"/></svg>"};
const suggest=n=>n<=2?'car':n<=4?'rect':'lon';
function popHtml(){ const sps=spacesNow(), A=ADD, nsteps=sps.length>1?3:2;
  const bars=`<div class="st">${Array.from({length:nsteps},(_,i)=>`<i class="${i<A.step?'on':''}"></i>`).join('')}</div>`;
  const rc=[A.seats?`${A.seats} places`:'',A.model?(SHAPES.find(x=>x[0]===A.model)||[])[1]:''].filter(Boolean).join(' · ');
  let body='';
  if(A.step===1) body=`<h4>Combien de places ?</h4><p class="rc">${rc}</p><div class="g">${[2,3,4,5,6,8].map(n=>`<button class="fp-pc${A.seats===n?' on':''}" data-fa="n" data-v="${n}">${n}</button>`).join('')}</div><div style="margin-top:8px"><input type="number" min="1" max="30" placeholder="Autre nombre…" data-fan></div>`;
  else if(A.step===2) body=`<h4>Quelle forme ?</h4><p class="rc">${rc}</p><div class="g g2">${SHAPES.map(([k,l])=>`<button class="fp-pc${(A.model||suggest(A.seats))===k?' on':''}" data-fa="m" data-v="${k}">${SHP[k]}<small>${l}</small></button>`).join('')}</div>`;
  else body=`<h4>Dans quel espace ?</h4><p class="rc">${rc}</p><div class="g g2">${sps.map(x=>`<button class="fp-pc" data-fa="s" data-v="${x.id}"><small style="font-size:14px">${H(x.name)}</small></button>`).join('')}</div>`;
  return `<div class="fp-pop">${bars}${body}<div class="ft"><button data-fa="back">${A.step>1?'← Retour':'Annuler'}</button>${A.step===1?'':'<button data-fa="x">Annuler</button>'}</div></div>`; }
function bubHtml(its){ if(!SEL||MODE!=='edit'||drag) return '';
  if(SEL.k==='item'){ const t=its.find(x=>String(x.id)===String(SEL.id)); if(!t) return ''; const bar=t.kind==='bar', solo=t.kind==='chair'||t.kind==='stool';
    const nb=neighbours(t,its), canDiv=!bar&&!solo&&((L.pos[t.id].units||1)>1||t.seats>=4);
    const r2=(nb.length||canDiv)?`<div class="fp-r2">${nb.map(o=>`<button class="fp-b" data-fj="${o.id}">Coller avec ${H(o.name||'la table')}</button>`).join('')}${canDiv?`<button class="fp-b" data-fx="div">Diviser en ${(L.pos[t.id].units||1)>1?(L.pos[t.id].units):2} tables</button>`:''}</div>`:'';
    return `<div class="fp-r1"><input value="${H(t.name||'')}" placeholder="Nom" data-ff="name">${solo?'':`<span class="stp"><button data-fx="n-" aria-label="Une place de moins">−</button><em>${t.seats} ${bar?'tabouret':'place'}${t.seats>1?'s':''}</em><button data-fx="n+" aria-label="Une place de plus">+</button></span>`}<span class="sep"></span>${t.kind==='round'?'':'<button class="fp-b" data-fx="rot">⟳ Tourner</button>'}${bar||solo?'':`<button class="fp-b" data-fx="sz">⤡ Taille ${Math.round((L.pos[t.id].sc||1)*100)} %</button>`}<span class="sep"></span><button class="fp-b red" data-fx="del">Supprimer</button></div>${r2}`; }
  if(SEL.k==='room'){ const r=L.rooms.find(x=>x.id===SEL.id); if(!r) return ''; return `<input value="${H(r.name)}" data-ff="rname"><button class="fp-b" data-fx="rkind">${r.kind==='terrace'?'Passer en intérieur':'Passer en extérieur'}</button>${L.rooms.length>1?'<span class="sep"></span><button class="fp-b red" data-fx="del">Supprimer</button>':''}`; }
  if(SEL.k==='open'){ const o=L.opens.find(x=>x.id===SEL.id); if(!o) return ''; return `<b>${o.type==='win'?'Fenêtre':'Porte'}</b><button class="fp-b" data-fx="otype">Changer en ${o.type==='win'?'porte':'fenêtre'}</button><span class="sep"></span><button class="fp-b red" data-fx="del">Supprimer</button>`; }
  if(SEL.k==='deco') return `<button class="fp-b red" data-fx="del">Supprimer</button>`;
  return ''; }
function overlay(its){ const cv=document.querySelector('#fpHost .fp-cv'), svg=cv&&cv.querySelector('svg.fp-svg'); if(!cv||!svg) return;
  cv.querySelectorAll('.fp-pop,.fp-bub').forEach(x=>x.remove());
  if(MODE!=='edit'){ ADD=null; return; }
  if(ADD){ cv.insertAdjacentHTML('beforeend',popHtml()); const i=cv.querySelector('[data-fan]'); if(i) i.addEventListener('keydown',e=>{ if(e.key==='Enter'){ const n=Math.max(1,Math.min(30,+i.value||0)); if(n){ ADD.seats=n; ADD.step=2; draw(); } } }); return; }
  const h=bubHtml(its); if(!h) return;
  let b=null; if(SEL.k==='item'){ const t=its.find(x=>String(x.id)===String(SEL.id)); if(t) b=bbox(t); } else if(SEL.k==='room'){ b=L.rooms.find(x=>x.id===SEL.id); } else if(SEL.k==='open'){ const o=L.opens.find(x=>x.id===SEL.id), g=o&&seg(o); if(g) b={x:g.x,y:g.y,w:g.hz?o.len:0,h:g.hz?0:o.len}; } else if(SEL.k==='deco'){ const t=L.deco.find(x=>x.id===SEL.id); if(t) b=bbox(t); }
  if(!b) return; const R0=svg.getBoundingClientRect(), C0=cv.getBoundingClientRect(), k=R0.width/VB.w;
  const sx=v=>R0.left-C0.left+(v-VB.x)*k, sy=v=>R0.top-C0.top+(v-VB.y)*k;
  const el=document.createElement('div'); el.className='fp-bub'; el.innerHTML=h; cv.appendChild(el);
  const W=el.offsetWidth, Hh=el.offsetHeight, cx=sx(b.x+b.w/2); let top=SEL.k==='room'?sy(b.y)+12:sy(b.y)-Hh-30; if(top<4) top=sy(b.y+b.h)+30;
  el.style.left=Math.max(6,Math.min(cv.clientWidth-W-6,cx-W/2))+'px'; el.style.top=Math.max(4,top)+'px'; }
// Place libre pour une nouvelle table, dans la pièce de son espace.
function freePos(model,spaceId,sc){ const md=MD(model)||{w:80,h:56}, w=md.w*(sc||1), h=md.h*(sc||1);
  const sp=spacesNow().find(x=>x.id===spaceId), nm=((sp&&sp.name)||'').toLowerCase();
  const room=L.rooms.find(r=>(r.name||'').toLowerCase()===nm)||(/terr|ext/.test(nm)&&L.rooms.find(r=>r.kind==='terrace'))||L.rooms[0];
  const boxes=items().map(bbox);
  const free=(x,y)=>boxes.every(b=>x+w+34<b.x||x>b.x+b.w+34||y+h+34<b.y||y>b.y+b.h+34);
  for(let y=room.y+60;y+h<room.y+room.h-20;y+=24) for(let x=room.x+30;x+w<room.x+room.w-20;x+=24) if(free(x,y)) return {x:snap(x),y:snap(y)};
  return {x:snap(room.x+room.w*.5-w/2),y:snap(room.y+room.h*.45)}; }
async function poseTable(){ const A=ADD; ADD=null; const model=A.model||suggest(A.seats), sp=A.space||(spacesNow()[0]||{}).id;
  if(typeof sb==='undefined'||sp==null){ if(typeof toast==='function') toast('Créez d\'abord un espace dans la liste'); return draw(); }
  const nums=tablesNow().map(t=>+((String(t.name||'').match(/(\d+)\s*$/)||[])[1]||0)), name='Table '+(Math.max(tablesNow().length,...nums)+1);
  const row=await db(sb.from('restaurant_tables').insert({client_slug:RESA_SLUG,space_id:sp,seats:A.seats,name}).select().single(),name+' ajoutée'); if(!row||!row.id) return draw();
  L.pos[row.id]=Object.assign({model},freePos(model,sp)); SEL={k:'item',id:row.id}; saveLayout(); await reload(); }
function addAct(d){ if(d.fa==='x'){ ADD=null; return draw(); } if(d.fa==='back'){ if(ADD.step>1) ADD.step--; else ADD=null; return draw(); }
  if(d.fa==='n'){ ADD.seats=+d.v; ADD.model=null; ADD.step=2; return draw(); }
  if(d.fa==='m'){ ADD.model=d.v; if(spacesNow().length>1){ ADD.step=3; return draw(); } return poseTable(); }
  if(d.fa==='s'){ ADD.space=+d.v||d.v; return poseTable(); } }
// Tables voisines (même espace, à moins de 60 px) avec lesquelles on peut « coller » la table sélectionnée.
function neighbours(t,its){ if(!t||t.kind==='bar'||t.kind==='round'||t.kind==='chair'||t.kind==='stool') return []; const a=bbox(t);
  return its.filter(o=>o.id!==t.id&&!o.kind&&o.space_id===t.space_id).map(o=>{ const b=bbox(o), gx=Math.max(0,Math.max(a.x,b.x)-Math.min(a.x+a.w,b.x+b.w)), gy=Math.max(0,Math.max(a.y,b.y)-Math.min(a.y+a.h,b.y+b.h)); return {o,d:Math.hypot(gx,gy)}; })
    .filter(x=>x.d<60).sort((x,y)=>x.d-y.d).slice(0,3).map(x=>x.o); }
// Coller : une seule table (places additionnées), même longueur que les deux bout à bout. Les réservations de l'autre table passent sur celle-ci.
async function joinWith(t,q){ const p=L.pos[t.id], pq=L.pos[q.id], md=p&&MD(p.model); if(!p||!pq||!md) return;
  const hz=t.w>=t.h, unitLen=md.w*(p.sc||1), qLen=hz?q.w:q.h, add=pq.model===p.model&&(pq.sc||1)===(p.sc||1)?(pq.units||1):Math.max(1,Math.round(qLen/unitLen));
  if(hz) p.x=Math.min(t.x,q.x); else p.y=Math.min(t.y,q.y); p.units=(p.units||1)+add; delete L.pos[q.id]; saveLayout();
  if(typeof RESA!=='undefined') for(const r of RESA.filter(r=>(r.table_ids||[]).some(id=>String(id)===String(q.id)))){ const ids=[...new Set((r.table_ids||[]).map(id=>String(id)===String(q.id)?t.id:id))]; await db(sb.from('restaurant_reservations').update({table_ids:ids}).eq('ref',r.ref).eq('client_slug',RESA_SLUG)); }
  await db(sb.from('restaurant_tables').update({seats:t.seats+q.seats}).eq('id',t.id)); await db(sb.from('restaurant_tables').delete().eq('id',q.id),`${t.name||'Table'} et ${q.name||'table'} collées · ${t.seats+q.seats} places`); return reload(); }
// Diviser : une table de 4 devient deux tables de 2 posées côte à côte (même total de places, rien à confirmer).
async function divide(t){ const p=L.pos[t.id]; if(!p) return; const u=p.units||1;
  if(u>1) return sideAct('split');
  const a=Math.ceil(t.seats/2), b=t.seats-a, model=a<=2?'car':a<=4?'rect':'lon', md=MD(model)||{w:60,h:60}, sc=p.sc||1, hz=t.w>=t.h;
  p.model=model; p.units=1; const step=(hz?md.w:md.w)*sc+16;
  const nums=tablesNow().map(o=>+((String(o.name||'').match(/(\d+)\s*$/)||[])[1]||0)), name='Table '+(Math.max(tablesNow().length,...nums)+1);
  const row=await db(sb.from('restaurant_tables').insert({client_slug:RESA_SLUG,space_id:t.space_id,seats:b,name}).select().single()); if(!row||!row.id) return;
  L.pos[row.id]={model,rot:p.rot,sc:p.sc,side:p.side,x:hz?p.x+step:p.x,y:hz?p.y:p.y+step}; saveLayout();
  await db(sb.from('restaurant_tables').update({seats:a}).eq('id',t.id),`${t.name||'Table'} divisée : ${a} + ${b} places`); return reload(); }
// ── enregistrement ──
function saveLayout(){ if(typeof DATA==='undefined'||!DATA) return; DATA.floorPlan=L; if(typeof touch==='function') touch(false); }
async function db(p,ok){ const {data,error}=await p; if(error){ if(typeof toast==='function') toast('⚠ '+error.message); return null; } if(ok&&typeof toast==='function') toast(ok); return data||true; }
const reload=async()=>{ if(typeof loadSide==='function') await loadSide(); else draw(); };
async function addTable(kind,model){ if(typeof sb==='undefined'||INTO==null){ toast&&toast('Créez d\'abord un espace dans la liste'); return; }
  const md=model&&MD(model), seats=kind==='bar'?5:(kind==='chair'||kind==='stool')?1:(md?md.seats:2);
  const row=await db(sb.from('restaurant_tables').insert({client_slug:RESA_SLUG,space_id:INTO,seats,name:kind==='bar'?'Bar':null}).select().single()); if(!row||!row.id) return;
  const fp=freePos(kind==='bar'?'rect':(model||'car'),INTO,kind==='bar'?2.9:1), cx=fp.x, cy=fp.y;
  L.pos[row.id]=kind==='bar'?{kind:'bar',x:cx,y:cy,w:290,h:44}:kind?{kind,x:cx,y:cy}:{model,x:cx,y:cy};
  SEL={k:'item',id:row.id}; saveLayout(); await reload(); }

// ── interactions ──
function onClick(e){ const host=document.getElementById('fpHost'); if(!host||!host.contains(e.target)) return;
  const b=e.target.closest('button,[data-fsv]'); if(!b) return; if(b.closest('.fp-pop,.fp-bub,.fp-tools')) e.stopPropagation(); const d=b.dataset;
  if(d.fm){ MODE=d.fm; SEL=null; ASKDEL=null; ADD=null; return draw(); }
  if(d.fsv!==undefined){ SVC=d.fsv||null; return draw(); }
  if(d.fmore){ OPEN[d.fmore]=!OPEN[d.fmore]; return draw(); }
  if(d.ftool){ SEL=null; if(d.ftool==='table'){ ADD={step:1}; return draw(); } ADD=null; return addThing(d.ftool); }
  if(d.fa) return addAct(d);
  if(d.fj){ const its=items(), t=SEL&&its.find(o=>String(o.id)===String(SEL.id)), q=its.find(o=>String(o.id)===String(d.fj)); if(t&&q) return joinWith(t,q); return; }
  if(d.fadd) return addThing(d.fadd);
  if(d.fx) return sideAct(d.fx); }
function addThing(k){ const s0=L.rooms.find(r=>r.kind==='room')||L.rooms[0], id='x'+Date.now().toString(36)+(NID++);
  if(k==='room'){ L.rooms.push({id,name:'Nouvelle pièce',kind:'room',x:VB.x+VB.w-320,y:VB.y+40,w:300,h:240}); SEL={k:'room',id}; saveLayout(); return draw(); }
  if(k==='win'||k==='door'){ L.opens.push({id,type:k,room:s0.id,side:'t',pos:120,len:k==='win'?90:72}); SEL={k:'open',id}; saveLayout(); return draw(); }
  if(k==='p'||k==='u'){ L.deco.push({id,kind:k==='p'?'plant':'parasol',x:snap(s0.x+s0.w*.7),y:snap(s0.y+s0.h*.7),r:k==='p'?16:50}); SEL={k:'deco',id}; saveLayout(); return draw(); }
  if(k==='c') return addTable('chair'); if(k==='s') return addTable('stool'); if(k==='bar') return addTable('bar');
  if(k.startsWith('m:')){ let mid=k.slice(2); if(mid==='new'){ mid='m'+Date.now().toString(36); L.models.push({id:mid,name:'Modèle '+(L.models.length+1),w:100,h:56,seats:4}); } return addTable(null,mid); } }
async function setSeats(t,n){ const row=tablesNow().find(x=>x.id===t.id); if(!row) return; row.seats=n; draw(); clearTimeout(seatT); seatT=setTimeout(()=>db(sb.from('restaurant_tables').update({seats:n}).eq('id',t.id)).then(reload),600); }
async function sideAct(x){ const its=items(); const D=6;
  if(SEL&&SEL.k==='room'){ const r=L.rooms.find(o=>o.id===SEL.id); if(x==='rw+') r.w+=30; if(x==='rw-') r.w=Math.max(120,r.w-30); if(x==='rh+') r.h+=30; if(x==='rh-') r.h=Math.max(120,r.h-30); if(x==='rkind') r.kind=r.kind==='terrace'?'room':'terrace'; if(x==='del'){ L.rooms=L.rooms.filter(o=>o!==r); L.opens=L.opens.filter(o=>o.room!==r.id); SEL=null; } saveLayout(); return draw(); }
  if(SEL&&SEL.k==='open'){ const o=L.opens.find(q=>q.id===SEL.id); if(x==='ol+') o.len+=12; if(x==='ol-') o.len=Math.max(30,o.len-12); if(x==='otype') o.type=o.type==='win'?'door':'win'; if(x==='del'){ L.opens=L.opens.filter(q=>q!==o); SEL=null; } saveLayout(); return draw(); }
  if(SEL&&SEL.k==='deco'){ const t=L.deco.find(q=>q.id===SEL.id); if(x==='dr+') t.r+=3; if(x==='dr-') t.r=Math.max(8,t.r-3); if(x==='del'){ L.deco=L.deco.filter(q=>q!==t); SEL=null; } saveLayout(); return draw(); }
  if(!SEL) return; const t=its.find(o=>String(o.id)===String(SEL.id)); if(!t) return; const p=L.pos[t.id], md=t.model&&MD(t.model);
  if(x==='n+'||x==='n-'){ const n=Math.max(1,Math.min(25,t.seats+(x==='n+'?1:-1))); if(n<t.seats&&window.capaConfirm&&!await window.capaConfirm({title:'Retirer une place à « '+H(t.name||'cette table')+' » ?',pl:n-t.seats,ok:'Oui, retirer une place'})) return; if(t.kind==='bar'){ p.w=Math.max(p.w||200,n*50); } return setSeats(t,n); }
  if(md&&/^m[lwd][+-]$/.test(x)){ if(!LAST||String(LAST.tid)!==String(t.id)||LAST.mid!==md.id) LAST={tid:t.id,mid:md.id,orig:{w:md.w,h:md.h}}; const d=x.endsWith('+')?D:-D; if(x[1]==='l') md.w=Math.max(24,md.w+d); else if(x[1]==='w') md.h=Math.max(24,md.h+d); else md.w=md.h=Math.max(36,md.w+d); saveLayout(); return draw(); }
  if(x==='bl+'||x==='bl-'){ p.w=Math.max(80,(p.w||200)+(x==='bl+'?12:-12)); saveLayout(); return draw(); }
  if(x==='only'&&md&&LAST){ const nm={id:'m'+Date.now().toString(36),name:md.name+' (unique)',w:md.w,h:md.h,seats:md.seats,round:md.round}; L.models.push(nm); md.w=LAST.orig.w; md.h=LAST.orig.h; p.model=nm.id; LAST=null; saveLayout(); return draw(); }
  if(x==='div') return divide(t);
  if(x==='rot'){ const b0=bbox(t); p.rot=((+p.rot||0)+1)%4; const t1=items().find(o=>String(o.id)===String(t.id)), b1=t1?bbox(t1):b0; p.x=snap(p.x+(b0.w-b1.w)/2); p.y=snap(p.y+(b0.h-b1.h)/2); saveLayout(); return draw(); }
  if(x==='sz'){ const st=[0.8,1,1.25,1.5], c=p.sc||1, i=st.findIndex(v=>Math.abs(v-c)<0.01); p.sc=st[(i+1)%st.length]; saveLayout(); return draw(); }
  if(x==='join'){ const q=partner(t,its); if(!q) return; const hz=t.w>=t.h, first=(hz?q.x<t.x:q.y<t.y)?q:t; p.x=first.x; p.y=first.y; p.units=(p.units||1)+((L.pos[q.id]||{}).units||1); delete L.pos[q.id]; saveLayout();
    await db(sb.from('restaurant_tables').update({seats:t.seats+q.seats}).eq('id',t.id)); await db(sb.from('restaurant_tables').delete().eq('id',q.id),'Tables réunies'); return reload(); }
  if(x==='split'){ const u=p.units||1, per=Math.max(1,Math.round(t.seats/u)), hz=t.w>=t.h, uw=md.w; p.units=1;
    for(let i=1;i<u;i++){ const row=await db(sb.from('restaurant_tables').insert({client_slug:RESA_SLUG,space_id:t.space_id,seats:per}).select().single()); if(row&&row.id) L.pos[row.id]={model:p.model,rot:p.rot,side:p.side,x:hz?t.x+(uw+12)*i:t.x,y:hz?t.y:t.y+(uw+12)*i}; }
    saveLayout(); await db(sb.from('restaurant_tables').update({seats:t.seats-per*(u-1)}).eq('id',t.id),'Tables séparées'); return reload(); }
  if(x==='del'){ if(window.capaConfirm){ if(!await window.capaConfirm({title:'Supprimer « '+H(t.name||'cette table')+' » ?',tb:-1,pl:-t.seats,tables:[t.id],ok:'Oui, supprimer la table'})) return; x='delyes'; } else { ASKDEL=t.id; return draw(); } } if(x==='delno'){ ASKDEL=null; return draw(); }
  if(x==='delyes'){ ASKDEL=null; delete L.pos[t.id]; SEL=null; saveLayout(); await db(sb.from('restaurant_tables').delete().eq('id',t.id),'Table supprimée'); return reload(); } }
async function onChange(e){ const host=document.getElementById('fpHost'); if(!host||!host.contains(e.target)) return; const el=e.target, f=el.dataset.ff;
  if(el.dataset.finto!==undefined){ INTO=+el.value; return; }
  if(el.dataset.fadd!==undefined){ const v=el.value; el.value=''; if(v) addThing(v); return; }
  if(!f) return; const v=el.type==='checkbox'?el.checked:el.value;
  if(SEL&&SEL.k==='room'&&f==='rname'){ const r=L.rooms.find(o=>o.id===SEL.id); r.name=v||r.name; saveLayout(); return draw(); }
  if(!SEL||SEL.k!=='item') return; const id=SEL.id, p=L.pos[id]; if(!p) return;
  if(f==='name'){ await db(sb.from('restaurant_tables').update({name:v.trim()||null}).eq('id',id)); return reload(); }
  if(f==='space'){ await db(sb.from('restaurant_tables').update({space_id:+v}).eq('id',id),'Espace modifié'); return reload(); }
  if(f==='model'){ p.model=v; p.units=1; LAST=null; saveLayout(); return draw(); }
  if(f==='mname'){ const md=MD(p.model); if(md&&v.trim()) md.name=v.trim(); saveLayout(); return draw(); }
  if(f==='oneside'){ p.side=v?'one':''; saveLayout(); return draw(); } }

let drag=null;
function ptOf(svg,e){ const r=svg.getBoundingClientRect(); return {x:VB.x+(e.clientX-r.left)*VB.w/r.width,y:VB.y+(e.clientY-r.top)*VB.h/r.height}; }
function onDown(e){ const svg=e.target.closest&&e.target.closest('svg.fp-svg'); if(!svg) return; const g=e.target.closest('g[data-fk]'), p=ptOf(svg,e);
  if(!g){ SEL=null; ASKDEL=null; return draw(); } const k=g.dataset.fk, id=g.dataset.id;
  if(MODE!=='edit'){ SEL=k==='item'?{k,id}:null; return draw(); }
  const find=(kk,i)=>kk==='room'?L.rooms.find(r=>r.id===i):kk==='open'?L.opens.find(q=>q.id===i):kk==='deco'?L.deco.find(q=>q.id===i):L.pos[i];
  if(k==='h'){ const tk=g.dataset.t, o=find(tk,id), it=tk==='item'?items().find(q=>String(q.id)===String(id)):null; drag={type:'h',tk,o,it,c:g.dataset.c,sx:p.x,sy:p.y,orig:JSON.parse(JSON.stringify(o)),iw:it&&it.w,ih:it&&it.h}; }
  else { ASKDEL=null; SEL={k,id}; const o=find(k,id); if(!o) return; drag={type:k,o,id,sx:p.x,sy:p.y,orig:JSON.parse(JSON.stringify(o)),kids:k==='room'?items().filter(t=>{const b=bbox(t);return roomOf(b.x+b.w/2,b.y+b.h/2)===o;}).map(t=>[L.pos[t.id],t.x,t.y]).concat(L.deco.filter(t=>roomOf(t.x,t.y)===o).map(t=>[t,t.x,t.y])):null}; }
  try{ svg.setPointerCapture(e.pointerId); }catch(_){} e.preventDefault(); draw(); }
function onMove(e){ if(!drag) return; const svg=document.querySelector('#fpHost svg.fp-svg'); if(!svg) return; const p=ptOf(svg,e), dx=p.x-drag.sx, dy=p.y-drag.sy, o=drag.o, O=drag.orig; drag.moved=true;
  if(drag.type==='h'){
    if(drag.tk==='room'){ const c=drag.c; if(c.includes('e')) o.w=Math.max(120,snap(O.w+dx)); if(c.includes('s')) o.h=Math.max(120,snap(O.h+dy)); if(c.includes('w')){ const w=Math.max(120,snap(O.w-dx)); o.x=O.x+O.w-w; o.w=w; } if(c.includes('n')){ const h=Math.max(120,snap(O.h-dy)); o.y=O.y+O.h-h; o.h=h; } }
    else if(drag.tk==='open') o.len=Math.max(30,snap(O.len+((o.side==='t'||o.side==='b')?dx:dy)));
    else if(drag.tk==='deco') o.r=Math.max(8,Math.round(O.r+(dx+dy)/2));
    else if(o.kind==='bar'){ if(o.rot%2){ o.w=Math.max(80,snap(O.w+dy)); } else o.w=Math.max(80,snap(O.w+dx)); }
    else if(o.model){ const s0=O.sc||1, f=Math.max((drag.iw+dx)/drag.iw,(drag.ih+dy)/drag.ih); o.sc=Math.max(0.6,Math.min(2,Math.round(s0*f*20)/20)); } }
  else if(drag.type==='room'){ o.x=snap(O.x+dx); o.y=snap(O.y+dy); drag.kids.forEach(([t,x,y])=>{ if(t){ t.x=x+(o.x-O.x); t.y=y+(o.y-O.y); } }); }
  else if(drag.type==='open'){ let best=null; L.rooms.filter(r=>r.kind==='room').forEach(r=>{ [['t',Math.abs(p.y-r.y),p.x-r.x,r.w],['b',Math.abs(p.y-r.y-r.h),p.x-r.x,r.w],['l',Math.abs(p.x-r.x),p.y-r.y,r.h],['r',Math.abs(p.x-r.x-r.w),p.y-r.y,r.h]].forEach(([sd,d,along,Ln])=>{ if(along<-20||along>Ln+20) return; if(!best||d<best.d) best={d,r,sd,along}; }); }); if(best){ o.room=best.r.id; o.side=best.sd; o.pos=snap(best.along-o.len/2); } }
  else if(drag.type==='deco'){ o.x=snap(O.x+dx); o.y=snap(O.y+dy); }
  else { o.x=snap(O.x+dx); o.y=snap(O.y+dy); GUIDES=[]; const its=items(), me=its.find(q=>String(q.id)===String(drag.id));
    if(me&&me.kind!=='stool'){ const b=bbox(me), TH=10; let bx=null,by=null;
      its.forEach(q=>{ if(q.id===me.id||q.kind==='stool'||q.kind==='chair') return; const c=bbox(q);
        [[b.x,c.x],[b.x+b.w,c.x+c.w],[b.x+b.w/2,c.x+c.w/2],[b.x,c.x+c.w+16],[b.x+b.w,c.x-16]].forEach(([a,v])=>{ const d=v-a; if(Math.abs(d)<TH&&(!bx||Math.abs(d)<Math.abs(bx.d))) bx={d,v,c}; });
        [[b.y,c.y],[b.y+b.h,c.y+c.h],[b.y+b.h/2,c.y+c.h/2]].forEach(([a,v])=>{ const d=v-a; if(Math.abs(d)<TH&&(!by||Math.abs(d)<Math.abs(by.d))) by={d,v,c}; }); });
      if(bx){ o.x+=bx.d; GUIDES.push([bx.v,Math.min(b.y,bx.c.y)-20,bx.v,Math.max(b.y+b.h,bx.c.y+bx.c.h)+20]); }
      if(by){ o.y+=by.d; GUIDES.push([Math.min(b.x,by.c.x)-20,by.v,Math.max(b.x+b.w,by.c.x+by.c.w)+20,by.v]); } } }
  draw(); }
function onUp(){ if(!drag) return; const moved=drag.moved; drag=null; GUIDES=[]; if(moved) saveLayout(); draw(); }

// ── montage dans /gestion ──
function mount(){ const host=document.getElementById('fpHost'); if(!host) return;
  if(!document.getElementById('fpCss')){ const st=document.createElement('style'); st.id='fpCss'; st.textContent=CSS; document.head.appendChild(st); }
  if(!L){ const saved=typeof DATA!=='undefined'&&DATA&&DATA.floorPlan; L=saved&&saved.rooms?JSON.parse(JSON.stringify(saved)):null; if(!L){ if(!tablesNow().length&&!spacesNow().length) return; L=seed(); saveLayout(); }
    ['car','rect','lon','ron'].forEach(id=>{ let m=MD(id); if(!m){ const d=defaults().models.find(q=>q.id===id); L.models.push(m=Object.assign({},d)); } Object.assign(m,STD[id]); }); }
  if(!host.querySelector('.fp')){ host.innerHTML=`<div class="fp"><div class="fp-bar"><div class="fp-cnt"></div><div class="fp-tools"></div><div class="fp-hrs"></div><div class="fp-chips"></div><div class="fp-seg"><button data-fm="svc" class="on">Service</button><button data-fm="edit">Modifier</button></div></div><div class="fp-ed svc"><div class="fp-pal"></div><div class="fp-cv"><svg class="fp-svg"></svg></div><div class="fp-side"></div></div></div>`; }
  draw(); }
let bound=false;
window.FP={ sync(){ if(!bound){ bound=true; document.addEventListener('click',onClick); document.addEventListener('change',onChange); document.addEventListener('pointerdown',onDown); document.addEventListener('pointermove',onMove); document.addEventListener('pointerup',onUp); document.addEventListener('pointercancel',onUp); } mount(); },
  reset(){ L=null; } };
})();
