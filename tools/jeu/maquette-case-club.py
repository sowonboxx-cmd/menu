"""Maquette : 3 versions de la case « Je rejoins le Club Drevici » dans l'écran Avant de jouer (vraie page, mode test)."""
import asyncio
from playwright.async_api import async_playwright
OUT = '/home/claude/menu/tools/jeu/'
CSS = """
.cv{display:flex;gap:12px;align-items:flex-start;width:100%;background:#fff;border-radius:14px;padding:13px 14px;margin-top:6px;cursor:pointer;text-align:left}
.cv input{flex:none;width:22px;height:22px;margin:0;accent-color:#1a2540}
.cv .t{font:700 15px/1.25 Inter;color:#1a2540}
.cv ul{list-style:none;padding:0;margin:6px 0 0}.cv li{font:500 13.5px/1.5 Inter;color:#3d3a34;padding-left:14px;position:relative}
.cv li::before{content:'';position:absolute;left:0;top:9px;width:6px;height:2px;background:#8a1b1b}
.cv .ok{font:12px/1.4 Inter;color:#6d675d;margin-top:8px;padding-top:8px;border-top:1px solid #efe6d8;white-space:nowrap}
.cv.card{position:relative;padding-right:112px}.cv.card .mini{position:absolute;right:12px;top:14px;width:88px;border-radius:7px;box-shadow:0 4px 10px rgba(26,37,64,.25)}
.cv.dark{background:#1a2540}.cv.dark .t{color:#f4e6d1}.cv.dark li{color:#e8dcc8}.cv.dark li::before{background:#e0a59a}.cv.dark .ok{color:#b9b3c8;border-color:rgba(255,255,255,.12)}.cv.dark input{accent-color:#f4e6d1}
.nochk2{font:12px/1.45 Inter;color:#6d675d;margin:8px 2px 0;text-align:center}
.cv2{display:block;width:100%;background:#fff;border-radius:14px;padding:13px 14px 0;margin-top:6px;cursor:pointer;text-align:left}
.cv2 .row{display:flex;gap:10px;align-items:flex-start}
.cv2 input{flex:none;width:22px;height:22px;margin:0;accent-color:#1a2540}
.cv2 .t{font:700 15px/1.25 Inter;color:#1a2540}
.cv2 ul{list-style:none;padding:0;margin:6px 0 0}.cv2 li{font:500 13px/1.5 Inter;color:#3d3a34;padding-left:13px;position:relative;white-space:nowrap}
.cv2 li::before{content:'';position:absolute;left:0;top:9px;width:6px;height:2px;background:#8a1b1b}
.cv2 .mini{flex:none;width:72px;margin-left:auto;margin-top:2px;border-radius:6px;box-shadow:0 4px 10px rgba(26,37,64,.25)}
.cv2 .ok{font:12px/1.4 Inter;color:#6d675d;margin-top:12px;padding:9px 0 11px;border-top:1px solid #efe6d8;text-align:center}
.evin{font:10.5px/1.4 Inter;color:#9a9286;text-align:center;margin-top:3px}
"""
BODY = lambda cls, extra='': f"""<label class="cv {cls}"><input type="checkbox" name="optin">{extra}<div style="min-width:0"><div class="t">Je rejoins le Club Drevici</div>
<ul><li>Carte de membre</li><li>Coupe de champagne offerte à mon premier repas</li></ul>
<div class="ok">J'accepte de recevoir les offres de Drevici.</div></div></label>
<div class="nochk2">Sans cette case : seulement votre lot si vous gagnez.</div>"""
B2 = '''<label class="cv2"><div class="row"><input type="checkbox" name="optin"><div style="min-width:0"><div class="t">Je rejoins le Club Drevici</div>
<ul><li>Carte de membre</li><li>Coupe de champagne offerte</li></ul></div><img class="mini" src="club/email/carte-navy.jpg" alt=""></div>
<div class="ok">J'accepte de recevoir les offres de Drevici.</div></label>
<div class="nochk2">Sans cette case : seulement votre lot si vous gagnez.</div><div class="evin">L'abus d'alcool est dangereux pour la santé.</div>'''
V = [('A', 'Simple, sur fond blanc', BODY('')),
     ('B', 'Avec la carte du club', BODY('card', '<img class="mini" src="club/email/carte-navy.jpg" alt="">')),
     ('C', 'Bloc bleu, la case ressort', BODY('dark'))]
async def shot(pg, html, path, w, h):
    await pg.set_viewport_size({'width': w, 'height': h})
    await pg.goto('http://localhost:8765/free-oyster.html?test=perdu', wait_until='networkidle')
    await pg.add_style_tag(content=CSS)
    await pg.evaluate("""h=>{document.querySelector('label.chk.club').outerHTML=h;document.querySelector('.nochk').remove();
      const t=[...document.body.children].find(e=>/Mode test/.test(e.textContent)&&e.style.position==='fixed'); if(t) t.remove();}""", html)
    await pg.click('#s-home .cart'); await pg.wait_for_timeout(500)
    await pg.screenshot(path=path)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(device_scale_factor=2)
        V[:] = [('B', 'Avec la carte du club, corrigée', B2)]
        for k, _, html in V: await shot(pg, html, OUT + f'_case-{k}.png', 390, 844)
        await shot(pg, B2, OUT + '_case-B-desk.png', 1280, 920)
        # planche
        imgs = ''.join(f'<figure style="margin:0;width:390px"><img src="_case-{k}.png" style="width:390px;border-radius:40px;border:10px solid #111;box-sizing:border-box"><figcaption style="font:600 15px Inter;margin-top:10px">{k} · {n}</figcaption></figure>' for k, n, _ in V)
        html = f"""<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"></head>
<body style="margin:0;background:#e3ddd3;padding:30px;width:1250px;font-family:Inter"><h1 style="font-size:26px;margin:0 0 6px">Avant de jouer · case du club</h1>
<p style="color:#555;margin:0 0 20px;font-size:15px">Une seule case. Titre « Je rejoins le Club Drevici », puis la carte et la coupe à la ligne, puis l'accord aux offres sur une ligne.</p>
<div style="display:flex;gap:30px;align-items:flex-start">{imgs}<figure style="margin:0;width:760px"><img src="_case-B-desk.png" style="width:760px;border-radius:12px"><figcaption style="font:600 15px Inter;margin-top:10px">B · sur ordinateur</figcaption></figure></div></body></html>"""
        open(OUT + 'maquette-case-club.html', 'w').write(html)
        await pg.set_viewport_size({'width': 1300, 'height': 900})
        await pg.goto('file://' + OUT + 'maquette-case-club.html', wait_until='networkidle')
        await pg.screenshot(path=OUT + 'maquette-case-club.png', full_page=True)
        await b.close()
asyncio.run(main())
