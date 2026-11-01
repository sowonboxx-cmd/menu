const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
(async()=>{const b=await chromium.launch();const dir=path.join(__dirname,'pistes');
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.html')).sort()){
 const [w,h]=f.includes('bandeau')?[100,330]:[210,297];const px=mm=>Math.round(mm*96/25.4);
 const p=await b.newPage({viewport:{width:px(w),height:px(h)},deviceScaleFactor:2});
 await p.goto('file://'+path.join(dir,f),{waitUntil:'networkidle'});await p.waitForTimeout(500);
 await p.screenshot({path:path.join(dir,f.replace('.html','.png'))});await p.close();}
await b.close();})();
