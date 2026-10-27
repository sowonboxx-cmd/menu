#!/usr/bin/env python3
"""Fabrique une page publique (lien libre, non référencé) à partir d'une page devis du HQ.
   python3 tools/partage.py drevici-histoire drevici
   → guide/drevici/index.html + ses images, servis par le Worker « guide »
     (partage.beltab.app/drevici). Le HQ reste la source : on relance après chaque modif."""
import os, re, sys, shutil
SRC_SLUG, DST = sys.argv[1], sys.argv[2]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HQ = os.environ.get('HQ', os.path.join(os.path.dirname(ROOT), 'beltab-hq', 'site'))
body = open(os.path.join(HQ, 'content', 'devis', SRC_SLUG + '.html'), encoding='utf-8').read()
shell = open(os.path.join(HQ, 'index.html'), encoding='utf-8').read()
style = re.search(r'<style>(.*?)</style>', shell, re.S).group(1)
# Garde seulement les styles du devis (pv-, dv-, ax-) et les couleurs
keep = []
style_nb = re.sub(r'@media print\{\n.*?\n\}', '', style, flags=re.S)   # le bloc impression du HQ (sur plusieurs lignes) n'est pas repris
for line in style_nb.split('\n'):
    s = line.strip()
    if s.startswith((':root', 'html[data-theme', '--')) or re.match(r'^(\.pv|\.dv|\.ax)', s) or (s.startswith('@media') and re.search(r'\{\s*\.(pv|dv|ax)', s)):
        keep.append(line)
root = re.search(r':root\{.*?\}', style, re.S).group(0)
dark = re.search(r'html\[data-theme="dark"\]\{.*?\}', style, re.S).group(0)
css = '\n'.join(l for l in keep if not l.strip().startswith((':root', 'html[data-theme', '--')))
title = re.sub('<[^>]+>', '', re.search(r'<h1>(.*?)</h1>', body, re.S).group(1)).strip()
# Images : copiées à côté de la page
out = os.path.join(ROOT, 'guide', DST); os.makedirs(os.path.join(out, 'img'), exist_ok=True)
for src in set(re.findall(r'src="(content/[^"]+)"', body)):
    shutil.copy2(os.path.join(HQ, src), os.path.join(out, 'img', os.path.basename(src)))
    body = body.replace(src, 'img/' + os.path.basename(src))
body = re.sub(r'href="#[^"]*" data-go=', 'href="#" data-go=', body)
body = body.replace(' · brouillon à relire', '')
page = f'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>{title} · Beltab</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap">
<style>
{root}
*{{box-sizing:border-box}}
html,body{{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 'Geist',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased}}
a{{color:inherit;text-decoration:none}}
article{{max-width:1080px;margin:0 auto;padding:28px 16px 60px}}
article h1{{font-weight:800;font-size:clamp(36px,4.4vw,60px);line-height:1.04;letter-spacing:-.055em;margin:0 0 10px}}
article .lead{{font-size:19px;line-height:1.4;letter-spacing:-.02em;margin:0 0 26px;font-weight:500;color:var(--muted)}}
.foot{{font-size:13px;color:var(--muted);margin-top:24px}}
.dv-lb{{position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:30px;z-index:50;cursor:zoom-out}}
.dv-lb img{{max-width:100%;max-height:100%;border-radius:12px}}
.dv-grid img{{cursor:zoom-in}}
{css}
@media (max-width:700px){{.dv .pv-hero{{grid-template-columns:1fr 1fr}}.pv-hc{{min-width:0;padding:16px}}.dv .pv-hc strong{{font-size:26px}}.dv-top .dv-print{{margin-left:0}}}}
@media print{{@page{{size:A4;margin:12mm}}html,body{{background:#fff!important}}.no-print{{display:none!important}}article{{max-width:none;padding:0}}*{{-webkit-print-color-adjust:exact;print-color-adjust:exact}}.pv-ln,.pv-hero,figure,.ax-st,.ax-r,.pv-t{{break-inside:avoid}}.pv-blk h3{{break-after:avoid}}}}
</style></head><body><article>
{body}
<p class="foot">Beltab · prix hors taxes · page à jour au moment de l'ouverture.</p>
</article>
<script>
document.querySelectorAll('.dv-tab').forEach(a=>a.addEventListener('click',e=>{{e.preventDefault();const t=document.getElementById(a.dataset.go);if(t)t.scrollIntoView({{behavior:'smooth',block:'start'}});}}));
document.querySelectorAll('.dv-grid img').forEach(i=>i.addEventListener('click',()=>{{const d=document.createElement('div');d.className='dv-lb';d.innerHTML='<img src="'+i.src+'" alt="">';d.onclick=()=>d.remove();document.body.appendChild(d);}}));
</script></body></html>'''
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(page)
print('OK :', os.path.join('guide', DST, 'index.html'))
