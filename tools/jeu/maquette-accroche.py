"""Maquette : accroche de l'accueil du jeu sur 3 lignes centrées, sur 3 tailles de téléphone (tout doit tenir sans défiler)."""
import asyncio
from playwright.async_api import async_playwright
OUT = '/home/claude/menu/tools/jeu/'
NEW = '<div class="tx" style="font:600 19px/1.3 Inter;margin-bottom:12px">Ouvre-la.<br>Trouve la perle.<br>Gagne.</div>'
SIZES = [(390, 844, 'iPhone 14 / 15', 0), (375, 667, 'iPhone SE, tel quel', 0), (375, 667, 'iPhone SE, ajusté', 1), (360, 740, 'Android courant', 0)]
FIX = '@media (max-height:700px){#s-home img{height:150px!important;margin:6px 0 4px!important}.lot{padding:8px 4px 7px}.lot b{font-size:26px}.scr{padding-top:calc(env(safe-area-inset-top) + 14px)}}'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); figs = ''
        for w, h, n, fx in SIZES:
            pg = await b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=2)
            await pg.goto('http://localhost:8765/free-oyster.html', wait_until='networkidle')
            await pg.evaluate("h=>{const t=document.querySelector('#s-home .tx'); t.outerHTML=h;}", NEW)
            if fx: await pg.add_style_tag(content=FIX)
            await pg.wait_for_timeout(300)
            over = await pg.evaluate("document.querySelector('.scr.on').scrollHeight - innerHeight")
            await pg.screenshot(path=OUT + f'_accroche-{w}x{h}-{fx}.png')
            figs += f'<figure style="margin:0"><img src="_accroche-{w}x{h}-{fx}.png" style="width:{w}px;height:{h}px;border-radius:36px;border:10px solid #111"><figcaption style="font:600 15px Inter;margin-top:8px">{n} · {w}×{h}<br><span style="font-weight:400;color:{"#1e7a43" if over <= 0 else "#b3261e"}">{"Tout tient, sans défiler" if over <= 0 else f"Dépasse de {over} px"}</span></figcaption></figure>'
            print(n, 'dépasse' if over > 0 else 'tient', over)
        html = f'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap"></head><body style="margin:0;background:#e3ddd3;padding:30px;width:1720px;font-family:Inter"><h1 style="font-size:24px;margin:0 0 18px">Accueil du jeu · accroche sur 3 lignes</h1><div style="display:flex;gap:30px;align-items:flex-start">{figs}</div></body></html>'
        open(OUT + 'maquette-accroche.html', 'w').write(html)
        pg = await b.new_page(viewport={'width': 1780, 'height': 900}); await pg.goto('file://' + OUT + 'maquette-accroche.html', wait_until='networkidle')
        await pg.screenshot(path=OUT + 'maquette-accroche.png', full_page=True); await b.close()
asyncio.run(main())
