import asyncio
from playwright.async_api import async_playwright
D='/home/claude/menu/tools/jeu/'
CSS='''.v-a1{font:500 14px/1.4 Inter;color:#1a2540;text-align:center}.v-a2{font:700 15px/1.4 Inter;color:#1a2540;text-align:center;margin-bottom:10px}
.v-b{background:#fff;border-radius:14px;padding:10px 18px 9px;text-align:center}.v-b .c{font:600 28px 'IBM Plex Mono';letter-spacing:.16em;color:#1a2540}.v-b small{display:block;font:500 12.5px Inter;color:#6d675d;margin-top:3px;border-top:1px dashed #d9cdb8;padding-top:6px}.v-b small b{color:#8a1b1b}
.v-c{display:inline-block;font:700 12.5px Inter;letter-spacing:.04em;color:#8a1b1b;border:1.5px solid #8a1b1b;border-radius:999px;padding:5px 12px;margin:2px 0 10px}
.v-d{display:flex;align-items:stretch;background:#fff;border-radius:14px;overflow:hidden;width:100%}.v-d .l{flex:1;padding:10px 12px;text-align:center;border-right:2px dashed #e3d6bf}.v-d .l small{display:block;font:600 10.5px Inter;letter-spacing:.08em;color:#6d675d;text-transform:uppercase}.v-d .l b{font:600 23px 'IBM Plex Mono';letter-spacing:.12em;color:#1a2540}
.v-d .r{width:104px;background:#1a2540;color:#f4e6d1;display:flex;flex-direction:column;align-items:center;justify-content:center;font:600 10.5px Inter;letter-spacing:.06em;text-transform:uppercase}.v-d .r b{font:800 22px/1 'Playfair Display';letter-spacing:0;text-transform:none;margin:2px 0}'''
V=[('A','Deux lignes centrées','<div class="v-a1">Montrez ce code au comptoir</div><div class="v-a2">jusqu\'au jeudi 29 octobre</div><div class="code">PERLE-7K2R</div>'),
   ('B','Date dans le ticket','<div class="tx" style="font:500 14px Inter;margin:2px 0 10px">Montrez ce code au comptoir</div><div class="v-b"><div class="c">PERLE-7K2R</div><small>Valable jusqu\'au <b>jeudi 29 octobre</b></small></div>'),
   ('C','Pastille rouge','<div class="v-c">VALABLE JUSQU\'AU JEUDI 29 OCTOBRE</div><div class="code">PERLE-7K2R</div><div class="tx" style="font:500 13px Inter;color:#6d675d;margin-top:6px">À montrer au comptoir</div>'),
   ('D','Ticket avec talon','<div class="v-d"><div class="l"><small>À montrer au comptoir</small><b>PERLE-7K2R</b></div><div class="r">jusqu\'au<b>jeu. 29</b>octobre</div></div>')]
async def m():
    async with async_playwright() as p:
        b=await p.chromium.launch(); figs=''
        for k,n,html in V:
            pg=await b.new_page(viewport={'width':390,'height':844},device_scale_factor=2)
            await pg.goto('http://localhost:8765/free-oyster.html?test=plateau',wait_until='networkidle')
            await pg.add_style_tag(content=CSS)
            await pg.click('#s-home .cart'); await pg.wait_for_timeout(200); await pg.click('#fgo'); await pg.wait_for_timeout(300); await pg.click('[data-pick] >> nth=0'); await pg.wait_for_timeout(300)
            kn=await pg.query_selector('#knob'); bb=await kn.bounding_box(); x,y=bb['x']+28,bb['y']+28
            await pg.mouse.move(x,y); await pg.mouse.down()
            for i in range(1,70): await pg.mouse.move(x+i*5,y); await pg.wait_for_timeout(8)
            await pg.mouse.up(); await pg.wait_for_timeout(1800)
            await pg.evaluate("""h=>{document.querySelector('#wUntil').remove();const c=document.querySelector('#wCode');c.insertAdjacentHTML('beforebegin','<div id=vx style="width:100%;display:flex;flex-direction:column;align-items:center;margin-top:4px">'+h+'</div>');c.remove();
              const t=[...document.body.children].find(e=>/Mode test/.test(e.textContent)&&e.style.position==='fixed'); if(t) t.remove(); fitHome('#s-win');}""",html)
            await pg.wait_for_timeout(600)
            over=await pg.evaluate("document.querySelector('.scr.on').scrollHeight-innerHeight")
            await pg.screenshot(path=D+f'_valid-{k}.png')
            figs+=f'<figure style="margin:0;width:390px"><img src="_valid-{k}.png" style="width:390px;border-radius:36px;border:10px solid #111;box-sizing:border-box"><figcaption style="font:700 16px Inter;margin-top:8px">{k} · {n}</figcaption></figure>'
            print(k,over)
        open(D+'maquette-validite.html','w').write(f'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@700&display=swap"></head><body style="margin:0;background:#e3ddd3;padding:30px;width:1740px;font-family:Inter"><h1 style="font-size:24px;margin:0 0 18px">Gagné · le code et sa date de validité (4 versions)</h1><div style="display:flex;gap:30px">{figs}</div></body></html>')
        pg=await b.new_page(viewport={'width':1800,'height':900}); await pg.goto('file://'+D+'maquette-validite.html',wait_until='networkidle')
        await pg.screenshot(path=D+'maquette-validite.png',full_page=True); await b.close()
asyncio.run(m())
