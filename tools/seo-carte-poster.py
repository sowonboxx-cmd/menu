#!/usr/bin/env python3
"""Affiche « la carte vue par Google et les IA » d'un restaurant (HTML + PNG), outil de vente.

Lit la carte du restaurant dans Supabase (menu_data) et montre :
  - le lien partagé vers la carte (WhatsApp) ;
  - la carte telle que Google la lit (rubriques, plats, descriptions, prix, photos) ;
  - un exemple de réponse d'une IA qui s'appuie sur cette carte ;
  - ce que le site actuel montre (facultatif : « avant »).

Usage : python3 tools/seo-carte-poster.py tools/og/<resto>-carte-poster.json
Spec : name, slug, domain, html, og, logo, imgBase (dossier local des photos de plats, pour les chemins /clients/…),
       question, answer (liste de paragraphes, **gras** autorisé), before (liste de lignes, facultatif), maxItems
"""
import asyncio, json, os, sys, pathlib, html, re, urllib.request
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
E = html.escape
SB = 'https://fdbzzkzfipzabryfanun.supabase.co/rest/v1/menu_data?select=data&client_slug=eq.'
KEY = 'sb_publishable_9PaqDuXnWV3aOCBPk9ImmQ_4YgYTU9n'  # clé publique (lecture de la carte, comme le site)
fr = lambda v: (v.get('fr') or '') if isinstance(v, dict) else (v or '')

def price(x):
    if x.get('priceType') == 'dual' and (x.get('p1') or x.get('p2')):
        eur = lambda v: (str(v).replace('€', '').strip() + ' €')
        return ' · '.join(f"{('Les ' + str(q) + ' : ') if q else ''}{eur(p)}" for q, p in ((x.get('qty1'), x.get('p1')), (x.get('qty2'), x.get('p2'))) if p)
    sizes = [z for z in x.get('sizes') or [] if z.get('price')]
    if sizes: return ' · '.join(f"{z.get('cl', '')} cl {z['price']}" for z in sizes)
    p = str(x.get('price') or '').strip()
    return (p.replace('€', ' €').replace('  ', ' ') if p else '')

def load(slug):
    req = urllib.request.Request(SB + slug, headers={'apikey': KEY, 'Authorization': 'Bearer ' + KEY})
    return json.load(urllib.request.urlopen(req, timeout=20))[0]['data']

def menu_html(d, s, base):
    out, n = [], 0
    for t in d.get('tabs', []):
        if t.get('visible') is False or t.get('id') == '__home': continue
        items = []
        for c in t.get('cards', []):
            for x in (c.get('dishes') or c.get('items') or []):
                if x.get('hidden') or not fr(x.get('name')): continue
                items.append(x)
        if not items: continue
        rows = ''
        for x in items[:s.get('maxItems', 3)]:
            img = x.get('img') or ''
            loc = (ROOT / s['imgBase'] / img.split('/')[-1]) if img and s.get('imgBase') else None
            th = f'<img src="{os.path.relpath(loc, base)}">' if loc and loc.exists() else ''
            dsc = fr(x.get('desc')); dsc = dsc if len(dsc) <= 80 else dsc[:79].rsplit(' ', 1)[0] + '…'
            rows += f'<div class="it{"" if th else " noimg"}">{th}<div><b>{E(fr(x.get("name")))}</b><small>{E(dsc)}</small></div><em>{E(price(x))}</em></div>'
        more = len(items) - s.get('maxItems', 3)
        out.append(f'<div class="sec"><h4>{E(fr(t.get("label")))}<span>{len(items)} plat{"s" if len(items) > 1 else ""}</span></h4>{rows}{f"<p class=more>+ {more} autre{"s" if more > 1 else ""}</p>" if more > 0 else ""}</div>')
        n += len(items)
    return ''.join(out), n

def build(s, d, base):
    rel = lambda p: os.path.relpath(ROOT / p, base)
    menu, n = menu_html(d, s, base)
    md = lambda t: re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', E(t))
    ans = ''.join(f'<p>{md(p)}</p>' for p in s['answer'])
    before = ''.join(f'<li>{E(l)}</li>' for l in s.get('before', []))
    return f"""<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>{E(s['name'])} · la carte</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<style>
*{{box-sizing:border-box}}body{{margin:0;background:#eceae5;font-family:Inter,Arial,sans-serif;color:#16181d;padding:32px;width:1660px;-webkit-font-smoothing:antialiased}}
h1{{margin:0 0 4px;font-size:28px}}.sub{{margin:0 0 18px;color:#666;font-size:14.5px;line-height:1.5;max-width:1200px}}
h2{{font-size:15px;margin:26px 0 12px;text-transform:uppercase;letter-spacing:.08em;color:#555}}
.grid{{display:grid;grid-template-columns:1fr 520px;gap:28px;align-items:start}}
.box{{background:#fff;border-radius:16px;padding:20px 22px;box-shadow:0 2px 8px rgba(0,0,0,.06)}}
.gh{{display:flex;align-items:center;gap:12px;margin-bottom:6px}}.gh img{{width:34px;height:34px;border-radius:50%;object-fit:contain;background:#f1f3f4;border:1px solid #e3e3e3}}.gh b{{font-size:18px}}.gh small{{display:block;color:#5f6368;font-size:13px}}
.tabs{{display:flex;gap:22px;border-bottom:1px solid #e8eaed;margin:8px 0 14px;font-size:14px;color:#5f6368}}.tabs span{{padding-bottom:9px}}.tabs .on{{color:#1a73e8;border-bottom:3px solid #1a73e8;font-weight:600}}
.menu{{columns:2;column-gap:28px}}.sec{{break-inside:avoid;margin-bottom:16px}}
.sec h4{{margin:0 0 8px;font-size:15px;display:flex;justify-content:space-between;align-items:baseline}}.sec h4 span{{font-size:12px;color:#80868b;font-weight:500}}
.it{{display:grid;grid-template-columns:46px 1fr auto;gap:10px;align-items:center;padding:6px 0;border-top:1px solid #f1f3f4}}.it img,.it .ph{{width:46px;height:46px;border-radius:8px;object-fit:cover;background:#f1f3f4;display:block}}
.it b{{font-size:13.5px;font-weight:600;display:block}}.it small{{font-size:12px;color:#5f6368;line-height:1.35;display:block}}.it em{{font-style:normal;font-size:13.5px;font-weight:600;white-space:nowrap}}
.it.noimg{{grid-template-columns:1fr auto}}
.more{{font-size:12px;color:#1a73e8;margin:4px 0 0}}
.wa{{background:#efeae2;border-radius:14px;padding:14px}}.wab{{background:#d9fdd3;border-radius:10px;padding:4px;box-shadow:0 1px 1px rgba(0,0,0,.1)}}.pv{{background:#cfe9c7;border-radius:7px;overflow:hidden}}.pv img{{width:100%;display:block}}
.pt{{padding:8px 10px}}.pt b{{display:block;font-size:13.5px}}.pt span{{display:block;font-size:12px;color:#555;margin-top:2px}}.pt small{{display:block;font-size:11.5px;color:#777;margin-top:4px}}.wab .m{{font-size:14px;padding:6px 8px 4px;color:#1a73e8}}
.ai{{background:#fff;border-radius:16px;padding:18px 20px;box-shadow:0 2px 8px rgba(0,0,0,.06)}}.q{{background:#f4f4f5;border-radius:16px;padding:10px 14px;font-size:14px;margin:0 0 12px auto;max-width:85%;width:fit-content}}
.ai p{{font-size:14px;line-height:1.6;margin:0 0 8px}}.ai .src{{display:inline-block;font-size:12px;color:#5f6368;background:#f1f3f4;border-radius:999px;padding:4px 10px;margin-top:4px}}.ai .lab{{font-size:11.5px;color:#9aa0a6;margin-top:10px}}
.bf{{background:#fff6f6;border-radius:16px;padding:16px 20px;margin-top:20px}}.bf b{{color:#c62828;font-size:13px;text-transform:uppercase;letter-spacing:.08em}}.bf ul{{margin:8px 0 0;padding-left:18px;font-size:14px;line-height:1.6}}
</style></head><body>
<h1>{E(s['name'])} · la carte vue par Google et les IA</h1><p class="sub">{E(s.get('sub', ''))}</p>
<div class="grid"><div>
<h2>La carte telle que Google la lit · {n} plats, avec prix et descriptions</h2>
<div class="box"><div class="gh"><img src="{rel(s['logo'])}"><div><b>{E(s['name'])}</b><small>{E(s.get('gline', ''))}</small></div></div>
<div class="tabs"><span>Présentation</span><span class="on">Menu</span><span>Avis</span><span>Photos</span></div><div class="menu">{menu}</div></div>
</div><div>
<h2>Lien partagé vers la carte</h2>
<div class="wa"><div class="wab"><div class="pv"><img src="{rel(s['og'])}"><div class="pt"><b>{E(s['title'])}</b><span>{E(s['desc'][:100])}…</span><small>{E(s['domain'])}</small></div></div><div class="m">https://{E(s['domain'])}/#{E(s.get('tab', 'carte'))}</div></div></div>
<h2>Une IA répond grâce à la carte</h2>
<div class="ai"><div class="q">{E(s['question'])}</div>{ans}<span class="src">Source : {E(s['domain'])}</span><div class="lab">Exemple de réponse, à partir des données de la carte</div></div>
{f'<div class="bf"><b>Aujourd’hui, sur le site actuel</b><ul>{before}</ul></div>' if before else ''}
</div></div></body></html>"""

async def main(spec):
    s = json.load(open(spec))
    d = load(s['slug'])
    out = ROOT / s['html']; out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(build(s, d, out.parent))
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1724, 'height': 900})
        await pg.goto(out.as_uri(), wait_until='networkidle')
        await pg.evaluate('document.fonts.ready')
        await pg.screenshot(path=str(out.with_suffix('.png')), full_page=True)
        await b.close()
    print(out.with_suffix('.png'))

asyncio.run(main(sys.argv[1]))
