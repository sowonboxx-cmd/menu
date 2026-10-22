"""Maquette : 4 styles de puces / pictos pour « Carte de membre » et « Coupe de champagne offerte » (vraie page, mode test)."""
import asyncio
from playwright.async_api import async_playwright
OUT = '/home/claude/menu/tools/jeu/'
STAR = '<svg viewBox="0 0 16 16"><path d="M8 0 L9.4 6.6 L16 8 L9.4 9.4 L8 16 L6.6 9.4 L0 8 L6.6 6.6Z" fill="#b8892f"/></svg>'
DIAM = '<svg viewBox="0 0 16 16"><path d="M8 2 L13 8 L8 14 L3 8Z" fill="#1a2540"/><path d="M8 5.5 L10.2 8 L8 10.5 L5.8 8Z" fill="#f4e6d1"/></svg>'
CARD = '<svg viewBox="0 0 20 16"><rect x="1" y="2" width="18" height="12" rx="2.2" fill="#1a2540"/><rect x="3.5" y="5.5" width="4" height="3" rx=".7" fill="#e3c27a"/><rect x="3.5" y="10.4" width="9" height="1.4" rx=".7" fill="#9fb0d0"/></svg>'
COUPE = '<svg viewBox="0 0 20 16"><path d="M3 2.5 H17 Q16.2 8.2 10 8.4 Q3.8 8.2 3 2.5Z" fill="#1a2540"/><rect x="9.3" y="8.2" width="1.4" height="5" fill="#1a2540"/><rect x="6" y="13.2" width="8" height="1.6" rx=".8" fill="#1a2540"/><circle cx="8" cy="4.4" r=".9" fill="#e3c27a"/><circle cx="11.6" cy="5.4" r=".7" fill="#e3c27a"/><circle cx="10" cy="3.6" r=".6" fill="#e3c27a"/></svg>'
ID = '<span class="idb">ID</span>'
COUPE_C = COUPE.replace('#1a2540', '#f4e6d1').replace('#e3c27a', '#e3c27a')
CARD_C = '<svg viewBox="0 0 20 16"><rect x="2" y="3" width="16" height="10" rx="2" fill="none" stroke="#f4e6d1" stroke-width="1.6"/><rect x="4.5" y="6" width="3.6" height="2.6" rx=".6" fill="#e3c27a"/></svg>'
V = [('C', 'Pictos, sans la carte du club', CARD, COUPE),
     ('C2', 'Pictos un peu plus grands, sans la carte', CARD, COUPE)]
CSS = """.cv2 li{padding-left:0!important;display:flex;align-items:center;gap:7px}.cv2 li::before{display:none!important}
.pu{flex:none;display:inline-flex;width:15px;height:15px;align-items:center;justify-content:center}.pu svg{width:100%;height:100%;display:block}
.pu.ic{width:20px;height:16px}.pu.ic.big{width:25px;height:20px}.cv2 .mw{display:none!important}
.pas{width:22px;height:22px;border-radius:50%;background:#1a2540;display:inline-flex;align-items:center;justify-content:center}.pas svg{width:15px;height:12px}
.pu.pc{width:22px;height:22px}.cv2 ul{margin-top:7px}.cv2 li+li{margin-top:3px}
.idb{font:800 8.5px/1 Inter;letter-spacing:.04em;color:#f4e6d1;border:1.3px solid #f4e6d1;border-radius:3px;padding:2px 2.5px 1.5px}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
        figs = ''
        for k, n, i1, i2 in V:
            await pg.goto('http://localhost:8765/free-oyster.html?test=perdu', wait_until='networkidle')
            await pg.add_style_tag(content=CSS + '#s-form.on .cv2 .mw,#s-form.on .cv2 .mc::after{animation:none!important}')
            cls = 'pu ic' + (' big' if k == 'C2' else '')
            await pg.evaluate("""([a,b,c])=>{const li=document.querySelectorAll('.cv2 li');li[0].insertAdjacentHTML('afterbegin',`<span class="${c}">${a}</span>`);li[1].insertAdjacentHTML('afterbegin',`<span class="${c}">${b}</span>`);
              const t=[...document.body.children].find(e=>/Mode test/.test(e.textContent)&&e.style.position==='fixed'); if(t) t.remove();}""", [i1, i2, cls])
            await pg.click('#s-home .cart'); await pg.wait_for_timeout(400)
            await pg.screenshot(path=OUT + f'_pucec-{k}.png')
            bb = await (await pg.query_selector('.cv2')).bounding_box()
            await pg.screenshot(path=OUT + f'_pucec-{k}-zoom.png', clip={'x': bb['x'] - 6, 'y': bb['y'] - 6, 'width': bb['width'] + 12, 'height': bb['height'] + 12})
            figs += f'<figure style="margin:0;width:390px"><img src="_pucec-{k}-zoom.png" style="width:390px;display:block;border-radius:14px"><img src="_pucec-{k}.png" style="width:390px;margin-top:14px;border-radius:36px;border:10px solid #111;box-sizing:border-box"><figcaption style="font:700 16px Inter;margin-top:8px">{k} · {n}</figcaption></figure>'
        html = f'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap"></head><body style="margin:0;background:#e3ddd3;padding:30px;width:900px;font-family:Inter"><h1 style="font-size:24px;margin:0 0 18px">Avant de jouer · puces de la case du club (en haut : zoom, en bas : l\'écran)</h1><div style="display:flex;gap:30px;align-items:flex-start">{figs}</div></body></html>'
        open(OUT + 'maquette-puces-c.html', 'w').write(html)
        pg2 = await b.new_page(viewport={'width': 960, 'height': 900}); await pg2.goto('file://' + OUT + 'maquette-puces-c.html', wait_until='networkidle')
        await pg2.screenshot(path=OUT + 'maquette-puces-c.png', full_page=True); await b.close()
asyncio.run(main())
