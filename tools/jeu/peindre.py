"""Exporte les huîtres peintes (huitres-peintes.html) en PNG transparents : assets/<style>-<piece>.png"""
import asyncio, pathlib
from playwright.async_api import async_playwright
H = pathlib.Path(__file__).resolve().parent / 'huitres-peintes.html'
async def m():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 420, 'height': 600}, device_scale_factor=2)
        for st in ['aquarelle', 'huile']:
            for pc in ['fermee', 'ouverte', 'perleseule', 'couteau']:
                await pg.goto(H.as_uri() + f'?piece={pc}&style={st}')
                await pg.wait_for_timeout(150)
                await pg.locator('svg').screenshot(path=str(H.parent / 'assets' / f'{st}-{pc}.png'), omit_background=True)
        await b.close()
asyncio.run(m())
