import asyncio, json
from playwright.async_api import async_playwright
D='/home/claude/menu/tools/jeu/'
V=[('A',"Sans précision","Ouvre l'huître.<br>Trouve la perle.<br>Gagne.",""),
   ('B',"« l'un de ces lots » dans l'accroche","Ouvre l'huître.<br>Trouve la perle.<br>Gagne l'un de ces lots :",""),
   ('C',"Petite ligne sous les lots","Ouvre l'huître.<br>Trouve la perle.<br>Gagne.",'<div class="tx" style="font:500 12.5px Inter;color:#6d675d;margin-top:8px">Un seul lot par partie, à découvrir en ouvrant l\'huître.</div>')]
async def m():
    async with async_playwright() as p:
        b=await p.chromium.launch(); figs=''
        for k,n,acc,extra in V:
            pg=await b.new_page(viewport={'width':390,'height':844},device_scale_factor=2)
            await pg.goto('http://localhost:8765/free-oyster.html',wait_until='networkidle')
            await pg.evaluate("([a,e])=>{document.querySelector('#s-home .acc').innerHTML=a;document.querySelector('#s-home .lots').insertAdjacentHTML('afterend',e);fitHome();}",[acc,extra])
            await pg.wait_for_timeout(300); await pg.screenshot(path=D+f'_lots-{k}.png')
            figs+=f'<figure style="margin:0;width:390px"><img src="_lots-{k}.png" style="width:390px;border-radius:36px;border:10px solid #111;box-sizing:border-box"><figcaption style="font:700 16px Inter;margin-top:8px">{k} · {n}</figcaption></figure>'
        open(D+'maquette-lots.html','w').write(f'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@700&display=swap"></head><body style="margin:0;background:#e3ddd3;padding:30px;width:1320px;font-family:Inter"><h1 style="font-size:24px;margin:0 0 18px">Accueil · « Ouvre l\'huître » et les lots (3 versions)</h1><div style="display:flex;gap:30px">{figs}</div></body></html>')
        pg=await b.new_page(viewport={'width':1380,'height':900}); await pg.goto('file://'+D+'maquette-lots.html',wait_until='networkidle')
        await pg.screenshot(path=D+'maquette-lots.png',full_page=True); await b.close()
asyncio.run(m())
