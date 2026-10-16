#!/usr/bin/env python3
"""Image de partage (1200 × 630) d'un site restaurant, style « A1 » de Drevici Paris.

Une photo ou une aquarelle en plein cadre, un dégradé bleu en bas, le logo rond à gauche,
une accroche dorée, le nom en grandes capitales et une ligne d'infos.

Usage :
  python3 tools/og-image.py spec.json
spec.json (chemins relatifs à la racine du dépôt) :
  {
    "out": "drevici-preview/seo/og-surzur.jpg",
    "image": "drevici-preview/seo/src-surzur-bateau.jpg",
    "focus": "50% 62%",          # cadrage de l'image (object-position)
    "crop": [x, y, w, h],        # facultatif : zoom sur une zone de l'image
    "logo": "drevici/charte/files/logos/DreviciOyster-Surzur_LogoRond_SansFond.png",
    "kicker": "Producteurs ostréiculteurs · Rivière de Penerf",
    "title": "Drevici Oyster Surzur",
    "line": "Dégustation au chantier · Pentès, 56450 Surzur · Réservation en ligne",
    "color": "#14244f"           # couleur du dégradé (couleur principale du restaurant)
  }
"""
import asyncio, json, os, sys, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent

def hex_rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def page(s):
    r, g, b = hex_rgb(s.get('color', '#14244f'))
    img = (ROOT / s['image']).as_uri()
    if s.get('crop'):  # [x, y, largeur, hauteur] en pixels de l'image d'origine : resserre le cadrage
        from PIL import Image
        x, y, w, h = s['crop']; tmp = ROOT / 'tools' / 'og' / '_crop.jpg'
        Image.open(ROOT / s['image']).convert('RGB').crop((x, y, x + w, y + h)).save(tmp, quality=95)
        img = tmp.as_uri()
    logo = (ROOT / s['logo']).as_uri() if s.get('logo') else ''
    return f"""<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600&family=Playfair+Display:wght@700&display=swap">
<style>
*{{box-sizing:border-box;margin:0}}html,body{{width:1200px;height:630px;overflow:hidden}}
.c{{position:relative;width:1200px;height:630px;font-family:Inter,sans-serif}}
.c>img{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:{s.get('focus', '50% 50%')}}}
.band{{position:absolute;left:0;right:0;bottom:0;height:{s.get('band', 250)}px;
  background:linear-gradient(180deg,rgba({r},{g},{b},0) 0%,rgba({r},{g},{b},.72) 38%,rgba({r},{g},{b},.94) 100%)}}
.row{{position:absolute;left:44px;right:44px;bottom:30px;display:flex;align-items:center;gap:26px}}
.logo{{width:134px;height:134px;flex:none;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center}}
.logo img{{width:126px;height:126px}}
.k{{font-weight:600;font-size:17px;letter-spacing:.16em;text-transform:uppercase;color:#e9c77b}}
.t{{font-family:'Playfair Display',serif;font-weight:700;font-size:{s.get('titleSize', 50)}px;line-height:1.02;letter-spacing:.035em;text-transform:uppercase;color:#fff;margin:6px 0 8px}}
.l{{font-weight:500;font-size:19px;color:rgba(255,255,255,.92)}}
</style></head><body><div class="c"><img src="{img}"><div class="band"></div>
<div class="row">{f'<div class="logo"><img src="{logo}"></div>' if logo else ''}<div>
<div class="k">{s['kicker']}</div><div class="t">{s['title']}</div><div class="l">{s['line']}</div></div></div></div></body></html>"""

async def main(spec):
    s = json.load(open(spec))
    tmp = ROOT / 'tools' / 'og' / '_render.html'
    tmp.parent.mkdir(exist_ok=True)
    tmp.write_text(page(s))
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1200, 'height': 630})
        await pg.goto(tmp.as_uri(), wait_until='networkidle')
        await pg.evaluate('document.fonts.ready')
        out = ROOT / s['out']
        await pg.screenshot(path=str(out), type='jpeg', quality=88)
        await b.close()
    tmp.unlink()
    print(out, os.path.getsize(out) // 1024, 'Ko')

asyncio.run(main(sys.argv[1]))
