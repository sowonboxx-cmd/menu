#!/usr/bin/env python3
"""Affiche « aperçu Google et partages » d'un site restaurant (HTML + PNG).

Montre en une seule image : l'image de partage, le résultat Google (ordinateur et mobile),
le lien partagé sur WhatsApp, iMessage, Facebook / LinkedIn et Discord, puis le texte que
lisent Google et les IA et les balises. Sert au rendez-vous commercial et à la validation.

Usage : python3 tools/seo-poster.py tools/og/<site>-seo.json
Le fichier HTML est écrit dans spec["html"] et le PNG à côté (même nom, .png).
"""
import asyncio, json, os, sys, pathlib, html
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
E = html.escape

def cut(s, n):
    return s if len(s) <= n else s[:n - 1].rsplit(' ', 1)[0] + '…'

def build(s, base):
    rel = lambda p: os.path.relpath(ROOT / p, base)
    og, logo = rel(s['og']), rel(s['logo'])
    t, d, dom = s['title'], s['desc'], s['domain']
    links = ''.join(f'<div><a>{E(a)}</a><small>{E(b)}</small></div>' for a, b in s.get('sitelinks', []))
    about = '<br>'.join(f'<b>{E(a)}</b> — {E(b)}' for a, b in s.get('facts', []))
    tags = '\n'.join(f'<i>{E(a)}</i> <u>{E(b)}</u>' if a else E(b) for a, b in s.get('tags', []))
    return f"""<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(s['name'])} · aperçu SEO et partage</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<style>
*{{box-sizing:border-box}}body{{margin:0;background:#eceae5;font-family:Inter,Arial,sans-serif;color:#16181d;padding:32px;width:1660px;-webkit-font-smoothing:antialiased}}
h1{{margin:0 0 4px;font-size:28px}}.sub{{margin:0 0 18px;color:#666;font-size:14.5px;max-width:1200px;line-height:1.5}}
h2{{font-size:15px;margin:28px 0 12px;text-transform:uppercase;letter-spacing:.08em;color:#555}}
.top{{display:grid;grid-template-columns:720px 1fr;gap:28px;align-items:start}}
.og img{{width:100%;border-radius:12px;display:block;box-shadow:0 10px 24px -12px rgba(0,0,0,.45)}}.og p{{font-size:13px;color:#555;margin:8px 0 0}}
.box{{background:#fff;border-radius:14px;padding:20px 22px;box-shadow:0 2px 8px rgba(0,0,0,.06)}}
.gsite{{display:flex;gap:12px;align-items:center}}.gfav{{width:28px;height:28px;border-radius:50%;background:#f1f3f4 url({logo}) center/24px no-repeat;border:1px solid #e3e3e3;flex:none}}
.gsite b{{display:block;font-size:14px;font-weight:400;color:#202124}}.gsite small{{font-size:12px;color:#4d5156}}
.gt{{display:block;color:#1a0dab;font-size:20px;line-height:1.3;margin:6px 0 3px;font-family:Arial,sans-serif}}
.gd{{color:#4d5156;font-size:14px;line-height:1.58;font-family:Arial,sans-serif}}
.gl{{display:grid;grid-template-columns:1fr 1fr;gap:10px 30px;margin:12px 0 0}}.gl a{{color:#1a0dab;font-size:16px;font-family:Arial,sans-serif}}.gl small{{display:block;color:#4d5156;font-size:13px;margin-top:2px}}
.ginfo{{font-size:13px;color:#4d5156;margin-top:6px;font-family:Arial,sans-serif}}.ginfo .st{{color:#188038}}
.grow{{display:grid;grid-template-columns:820px 400px;gap:28px;align-items:start}}
.phone{{background:#fff;border-radius:22px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,.06)}}
.gm{{display:flex;gap:12px}}.gm .t{{flex:1}}.gm img{{width:92px;height:92px;border-radius:10px;object-fit:cover}}.gm .gt{{font-size:18px}}
.msgs{{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;align-items:start}}.msgs figcaption{{text-align:center;font-size:13px;color:#555;margin-top:8px}}figure{{margin:0}}
.wa{{background:#efeae2;border-radius:14px;padding:14px}}.wab{{background:#d9fdd3;border-radius:10px;padding:4px;box-shadow:0 1px 1px rgba(0,0,0,.1)}}
.wab .pv{{background:#cfe9c7;border-radius:7px;overflow:hidden}}.wab img{{width:100%;display:block}}.wab .pt{{padding:8px 10px}}.wab b{{display:block;font-size:13.5px}}.wab span{{display:block;font-size:12px;color:#555;margin-top:2px;line-height:1.35}}.wab small{{display:block;font-size:11.5px;color:#777;margin-top:4px}}
.wab .m{{font-size:14px;padding:6px 8px 2px;color:#1a73e8}}.wab .h{{font-size:10.5px;color:#667;text-align:right;padding:0 8px 4px}}
.im{{background:#fff;border-radius:14px;padding:14px}}.imb{{border-radius:18px;overflow:hidden;background:#e9e9eb}}.imb img{{width:100%;display:block}}.imb .pt{{padding:9px 12px}}.imb b{{display:block;font-size:14px}}.imb small{{color:#8a8a8e;font-size:12.5px}}
.fb{{background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.15)}}.fb img{{width:100%;display:block}}.fb .pt{{background:#f0f2f5;padding:10px 12px}}.fb small{{color:#65676b;font-size:12px;text-transform:uppercase}}.fb b{{display:block;font-size:15px;margin:3px 0}}.fb span{{font-size:13px;color:#65676b;line-height:1.3;display:block}}
.dc{{background:#313338;border-radius:12px;padding:14px}}.dce{{background:#2b2d31;border-left:4px solid {s.get('color', '#1e3a8a')};border-radius:4px;padding:10px 14px 14px;color:#dbdee1}}.dce small{{font-size:12px;color:#b5bac1}}.dce b{{display:block;color:#00a8fc;font-size:15px;margin:4px 0}}.dce span{{display:block;font-size:13px;line-height:1.35}}.dce img{{width:100%;border-radius:4px;margin-top:10px;display:block}}
.ia{{display:grid;grid-template-columns:820px 1fr;gap:28px;align-items:start}}
.fact{{font-size:14px;line-height:1.65}}.fact b{{color:#10285e}}
.tags{{font-family:ui-monospace,Menlo,monospace;font-size:12.5px;background:#0f172a;color:#cbd5e1;border-radius:14px;padding:18px;white-space:pre-wrap;line-height:1.6;margin:0}}.tags i{{color:#7dd3fc;font-style:normal}}.tags u{{color:#fcd34d;text-decoration:none}}
</style></head><body>
<h1>{E(s['name'])} · aperçu Google et partages</h1>
<p class="sub">{E(s.get('sub', ''))}</p>
<h2>Image de partage (1200 × 630) et résultat Google</h2>
<div class="top"><div class="og"><img src="{og}"><p>{E(s.get('ogNote', ''))}</p></div>
<div><div class="box"><div class="gsite"><span class="gfav"></span><div><b>{E(s['name'])}</b><small>https://{E(dom)}</small></div></div>
<a class="gt">{E(t)}</a><div class="gd">{E(cut(d, 160))}</div><div class="ginfo">{s.get('ginfo', '')}</div><div class="gl">{links}</div></div>
<div style="height:20px"></div>
<div class="phone"><div class="gsite"><span class="gfav"></span><div><b>{E(s['name'])}</b><small>{E(dom)}</small></div></div>
<div class="gm"><div class="t"><a class="gt">{E(t)}</a><div class="gd">{E(cut(d, 110))}</div></div><img src="{og}"></div></div></div></div>
<h2>Lien partagé</h2>
<div class="msgs">
<figure><div class="wa"><div class="wab"><div class="pv"><img src="{og}"><div class="pt"><b>{E(t)}</b><span>{E(cut(d, 100))}</span><small>{E(dom)}</small></div></div><div class="m">https://{E(dom)}</div><div class="h">19:14 ✓✓</div></div></div><figcaption>WhatsApp</figcaption></figure>
<figure><div class="im"><div class="imb"><img src="{og}"><div class="pt"><b>{E(t)}</b><small>{E(dom)}</small></div></div></div><figcaption>iMessage / SMS iPhone</figcaption></figure>
<figure><div class="fb"><img src="{og}"><div class="pt"><small>{E(dom)}</small><b>{E(t)}</b><span>{E(cut(d, 110))}</span></div></div><figcaption>Facebook / LinkedIn / Messenger</figcaption></figure>
<figure><div class="dc"><div class="dce"><small>{E(s['name'])}</small><b>{E(t)}</b><span>{E(cut(d, 160))}</span><img src="{og}"></div></div><figcaption>Discord</figcaption></figure>
</div>
<h2>Ce que lisent Google et les IA</h2>
<div class="ia"><div class="box fact">{about}</div><pre class="tags">{tags}</pre></div>
</body></html>"""

async def main(spec):
    s = json.load(open(spec))
    out = ROOT / s['html']
    out.write_text(build(s, out.parent))
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1724, 'height': 1000}, device_scale_factor=1)
        await pg.goto(out.as_uri(), wait_until='networkidle')
        await pg.evaluate('document.fonts.ready')
        await pg.screenshot(path=str(out.with_suffix('.png')), full_page=True)
        await b.close()
    print(out.with_suffix('.png'))

asyncio.run(main(sys.argv[1]))
