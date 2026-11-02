// PDF + PNG (300 dpi) des cartes : node print7.js <dossier final> [filtre]
const {chromium}=require('playwright');const {ProxyAgent,fetch}=require('undici');const fs=require('fs'),path=require('path');
const agent=new ProxyAgent(process.env.HTTPS_PROXY);
(async()=>{const dir=process.argv[2],flt=process.argv[3]||'carte-';const b=await chromium.launch();
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.html')&&x.startsWith(flt))){
  const html=fs.readFileSync(path.join(dir,f),'utf8');const m=/@page\{size:([\d.]+)mm ([\d.]+)mm/.exec(html);const W=+m[1],H=+m[2];
  const pxW=Math.round(W/25.4*96),pxH=Math.round(H/25.4*96);
  const p=await b.newPage({viewport:{width:pxW,height:pxH},deviceScaleFactor:300/96});
  await p.route(/fonts\.(googleapis|gstatic)\.com/,async r=>{const res=await fetch(r.request().url(),{dispatcher:agent,headers:{'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'}});
    await r.fulfill({status:res.status,headers:{'content-type':res.headers.get('content-type')||'','access-control-allow-origin':'*'},body:Buffer.from(await res.arrayBuffer())});});
  await p.goto('file://'+path.resolve(dir,f),{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(500);
  const base=path.join(dir,f.replace('.html',''));
  await p.pdf({path:base+'.pdf',preferCSSPageSize:true,printBackground:true});
  await p.screenshot({path:base+'.png',clip:{x:0,y:0,width:pxW,height:pxH}});
  console.log('ok',f,await p.evaluate(()=>[...document.fonts].filter(x=>x.status==='loaded').map(x=>x.family).join(',')));await p.close();}
await b.close();})();
