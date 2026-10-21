import asyncio, pathlib, sys
from playwright.async_api import async_playwright
f = pathlib.Path(sys.argv[1]).resolve()
async def m():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 2780, 'height': 900}, device_scale_factor=1)
        await pg.goto(f.as_uri(), wait_until='networkidle'); await pg.evaluate('document.fonts.ready')
        await pg.add_style_tag(content='*{animation:none!important}')
        await pg.wait_for_timeout(300)
        await pg.screenshot(path=str(f.with_suffix('.png')), full_page=True); await b.close()
asyncio.run(m())
