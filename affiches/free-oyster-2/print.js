const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
(async()=>{const b=await chromium.launch();const dir=path.join(__dirname,'final');
const only=process.argv[2];
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.html')&&(!only||x.includes(only))).sort()){
 const m=fs.readFileSync(path.join(dir,f),'utf8').match(/size:([\d.]+)mm ([\d.]+)mm/);const w=+m[1],h=+m[2];
 const px=mm=>Math.round(mm*96/25.4);
 const p=await b.newPage({viewport:{width:px(w),height:px(h)},deviceScaleFactor:f.includes('a0')?2:(f.includes('a3')?3:3.125)});
 await p.goto('file://'+path.join(dir,f),{waitUntil:'networkidle'});await p.waitForTimeout(800);
 await p.pdf({path:path.join(dir,f.replace('.html','.pdf')),width:w+'mm',height:h+'mm',printBackground:true,pageRanges:'1'});
 if(!f.includes('fond-perdu')&&!f.includes('a0')) await p.screenshot({path:path.join(dir,f.replace('.html','.png'))});
 await p.close();console.log(f);}
await b.close();})();
