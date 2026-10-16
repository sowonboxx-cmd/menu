#!/usr/bin/env python3
"""Affiche « avant / après » du référencement d'un restaurant (HTML + PNG), outil de vente.

À gauche : ce que Google, WhatsApp et les IA voient AUJOURD'HUI sur le site actuel du restaurant.
À droite : la même chose avec Beltab (textes, image de partage dans la DA, carte lisible par les IA).

Usage : python3 tools/seo-avant-apres.py tools/og/<resto>-avant-apres.json
Spec : name, html, logo (optionnel), color, before / after = {domain, title, desc, image, ia: [[ok, texte], …]}
"""
import asyncio, json, os, sys, pathlib, html
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
E = html.escape

def cut(s, n):
    return s if len(s) <= n else s[:n - 1].rsplit(' ', 1)[0] + '…'

def col(side, s, base, label, cls):
    rel = lambda p: os.path.relpath(ROOT / p, base) if p else ''
    img = rel(side.get('image'))
    pv = f'<img src="{img}">' if img else '<div class="noimg">Pas d\'image</div>'
    ia = ''.join(f'<li class="{"ok" if ok else "ko"}"><i>{"✓" if ok else "✕"}</i>{E(t)}</li>' for ok, t in side.get('ia', []))
    return f"""<div class="col {cls}"><div class="lab">{label}</div>
<h3>Résultat Google</h3><div class="box"><div class="gsite"><span class="gfav"></span><div><b>{E(s['name'])}</b><small>https://{E(side['domain'])}</small></div></div>
<a class="gt">{E(cut(side['title'], 70))}</a><div class="gd">{E(cut(side['desc'], 160))}</div></div>
<h3>Lien partagé sur WhatsApp</h3><div class="wa"><div class="wab"><div class="pv">{pv}<div class="pt"><b>{E(cut(side['title'], 70))}</b><span>{E(cut(side['desc'], 100))}</span><small>{E(side['domain'])}</small></div></div></div></div>
<h3>Ce que lisent Google et les IA</h3><ul class="ia">{ia}</ul></div>"""

def build(s, base):
    logo = os.path.relpath(ROOT / s['logo'], base) if s.get('logo') else ''
    return f"""<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>{E(s['name'])} · avant / après</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<style>
*{{box-sizing:border-box}}body{{margin:0;background:#eceae5;font-family:Inter,Arial,sans-serif;color:#16181d;padding:32px;width:1500px;-webkit-font-smoothing:antialiased}}
h1{{margin:0 0 4px;font-size:28px}}.sub{{margin:0 0 22px;color:#666;font-size:14.5px;line-height:1.5;max-width:1150px}}
.cols{{display:grid;grid-template-columns:1fr 1fr;gap:28px}}.col{{background:#f6f4f0;border-radius:18px;padding:20px 22px}}.col.after{{background:#fff}}
.lab{{display:inline-block;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;border-radius:999px;padding:6px 14px;margin-bottom:6px}}
.before .lab{{background:#fdecec;color:#c62828}}.after .lab{{background:#e6f4ea;color:#188038}}
h3{{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#666;margin:18px 0 8px}}
.box{{background:#fff;border-radius:12px;padding:16px 18px;box-shadow:0 1px 4px rgba(0,0,0,.06)}}
.gsite{{display:flex;gap:12px;align-items:center}}.gfav{{width:28px;height:28px;border-radius:50%;background:#f1f3f4 {f'url({logo}) center/22px no-repeat' if logo else ''};border:1px solid #e3e3e3;flex:none}}
.before .gfav{{background:#f1f3f4}}
.gsite b{{display:block;font-size:14px;font-weight:400;color:#202124}}.gsite small{{font-size:12px;color:#4d5156}}
.gt{{display:block;color:#1a0dab;font-size:19px;line-height:1.3;margin:6px 0 3px;font-family:Arial,sans-serif}}.gd{{color:#4d5156;font-size:14px;line-height:1.55;font-family:Arial,sans-serif}}
.wa{{background:#efeae2;border-radius:14px;padding:14px}}.wab{{background:#d9fdd3;border-radius:10px;padding:4px;max-width:440px;box-shadow:0 1px 1px rgba(0,0,0,.1)}}
.pv{{background:#cfe9c7;border-radius:7px;overflow:hidden}}.pv img{{width:100%;display:block;aspect-ratio:1200/630;object-fit:cover}}.noimg{{aspect-ratio:1200/630;display:flex;align-items:center;justify-content:center;color:#8a8a8a;font-size:14px;background:#e4e4e4}}
.before .pv img{{aspect-ratio:auto}}
.pt{{padding:8px 10px}}.pt b{{display:block;font-size:13.5px}}.pt span{{display:block;font-size:12px;color:#555;margin-top:2px;line-height:1.35}}.pt small{{display:block;font-size:11.5px;color:#777;margin-top:4px}}
.ia{{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}}.ia li{{display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.45}}
.ia i{{font-style:normal;font-weight:700;width:22px;height:22px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-size:12px}}
.ia .ok i{{background:#e6f4ea;color:#188038}}.ia .ko i{{background:#fdecec;color:#c62828}}
</style></head><body>
<h1>{E(s['name'])} · avant / après</h1><p class="sub">{E(s.get('sub', ''))}</p>
<div class="cols">{col(s['before'], s, base, 'Aujourd’hui', 'before')}{col(s['after'], s, base, 'Avec Beltab', 'after')}</div>
</body></html>"""

async def main(spec):
    s = json.load(open(spec))
    out = ROOT / s['html']
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(build(s, out.parent))
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1564, 'height': 900})
        await pg.goto(out.as_uri(), wait_until='networkidle')
        await pg.evaluate('document.fonts.ready')
        await pg.screenshot(path=str(out.with_suffix('.png')), full_page=True)
        await b.close()
    print(out.with_suffix('.png'))

asyncio.run(main(sys.argv[1]))
