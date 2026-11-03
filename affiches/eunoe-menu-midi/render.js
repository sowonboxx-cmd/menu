// node render.js out → out/*.png (taille lue dans le HTML)
const {chromium}=require('playwright');const {ProxyAgent,fetch}=require('undici');const fs=require('fs'),path=require('path');
const agent=new ProxyAgent(process.env.HTTPS_PROXY);
(async()=>{const dir=process.argv[2],flt=process.argv[3]||'';const b=await chromium.launch();
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.html')&&x.includes(flt))){
  const html=fs.readFileSync(path.join(dir,f),'utf8');const m=/html,body\{width:(\d+)px;height:(\d+)px/.exec(html);const W=+m[1],H=+m[2];
  const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
  await p.route(/fonts\.(googleapis|gstatic)\.com/,async r=>{const res=await fetch(r.request().url(),{dispatcher:agent,headers:{'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'}});
    await r.fulfill({status:res.status,headers:{'content-type':res.headers.get('content-type')||'','access-control-allow-origin':'*'},body:Buffer.from(await res.arrayBuffer())});});
  await p.goto('file://'+path.resolve(dir,f),{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);
  const over=await p.evaluate(()=>{const m=document.querySelector('.mid'),ft=document.querySelector('.ft');return [m.scrollHeight>m.clientHeight+2, Math.round(document.querySelector('.hd').getBoundingClientRect().bottom), Math.round(ft.getBoundingClientRect().bottom)]});
  await p.screenshot({path:path.join(dir,f.replace('.html','.png'))});console.log(f,over);await p.close();}
await b.close();})();
