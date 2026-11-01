# Fichiers d'impression : menu A3 (avec et sans fond perdu), menu A4, couvertures A4.
# python3 gen3.py  → print/*.html  (puis node rend-print.js pour les PDF et PNG)
import re
src = open("c3w.html").read()

def write(name, html):
    open(f"print/{name}.html", "w").write(html.replace('src="', 'src="../'))

# ── A3 sans fond perdu : tel quel
write("menu-a3", src)

# ── A3 avec 3 mm de fond perdu : la page grandit de 3 mm de chaque côté, le bandeau bleu va jusqu'au bord
a3b = src.replace("@page{size:297mm 420mm;margin:0}", "@page{size:303mm 426mm;margin:0}") \
         .replace("html,body{width:297mm;height:420mm}", "html,body{width:303mm;height:426mm}")
a3b = a3b.replace("</style>", """
body{position:relative}
body::before{content:"";position:absolute;left:0;right:0;top:0;height:77mm;background:#253968}
.page{position:absolute;left:3mm;top:3mm}
</style>""")
write("menu-a3-fond-perdu", a3b)

# ── A4 : même mise en page réduite (A4 = A3 ÷ √2), contenu identique au A3
a4 = src.replace("@page{size:297mm 420mm;margin:0}", "@page{size:210mm 297mm;margin:0}") \
        .replace("html,body{width:297mm;height:420mm}", "html,body{width:210mm;height:297mm;overflow:hidden}")
a4 = a4.replace("</style>", ".page{zoom:0.70711}</style>")
write("menu-a4", a4)

FONTS = '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">'
BASE = """@page{size:210mm 297mm;margin:0}*{box-sizing:border-box;margin:0;padding:0}
html,body{width:210mm;height:297mm;overflow:hidden}body{font-family:Inter,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
:root{--cream:#F4EFE4;--ink:#0D255C;--blue:#253968;--gold:#D09D39;--red:#CD3232}
.p{position:relative;width:210mm;height:297mm;overflow:hidden}"""

def cover(name, css, body):
    write(name, f'<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>{name}</title>{FONTS}<style>{BASE}{css}</style></head><body><div class="p">{body}</div></body></html>')

# Couverture 1 · « Ocean Bistro » : bleu, texte en cercle autour de la mascotte, rayures en bas
cover("couverture-1-bistro", """
.p{background:var(--blue);color:#fff}
.frame{position:absolute;left:14mm;right:14mm;top:14mm;bottom:58mm;border:.4mm solid rgba(255,255,255,.35)}
.top{position:absolute;left:22mm;top:21mm;font-size:2.8mm;letter-spacing:.32em;text-transform:uppercase;line-height:1.7;opacity:.85}
.waves{position:absolute;right:22mm;top:22mm;width:11mm;opacity:.9}
.ring{position:absolute;left:50%;top:44mm;transform:translateX(-50%);width:132mm;height:132mm}
.medal{position:absolute;left:50%;top:69mm;transform:translateX(-50%);width:82mm;height:82mm;border-radius:50%;background:var(--cream);overflow:hidden;display:flex;align-items:flex-end;justify-content:center}
.medal img{width:76mm;margin-bottom:-2mm}
.dot{position:absolute;top:108mm;width:3mm;height:3mm;border-radius:50%;background:var(--red)}.dot.l{left:31mm}.dot.r{right:31mm}
.line{position:absolute;left:50%;top:166mm;width:.4mm;height:16mm;background:#fff;opacity:.6}
.logo{position:absolute;left:50%;top:190mm;transform:translateX(-50%);width:44mm}
.stripes{position:absolute;left:14mm;right:14mm;bottom:14mm;height:36mm;display:flex;justify-content:space-between}
.stripes span{width:9mm;background:var(--cream)}
""", """
<div class="frame"></div>
<div class="top">Drevici Oyster<br>Paris 17<sup>e</sup></div><img class="waves" src="ico-Vagues-blanc.svg">
<svg class="ring" viewBox="0 0 200 200"><defs><path id="c" d="M14,104 A86,86 0 0 1 186,104"/></defs>
<text fill="#fff" font-family="Inter" font-weight="600" font-size="6.6" letter-spacing="2.6"><textPath href="#c" startOffset="50%" text-anchor="middle">BAR À HUÎTRES · LA MER À VOTRE TABLE</textPath></text></svg>
<div class="medal"><img src="mascotte-ouvert.png"></div>
<span class="dot l"></span><span class="dot r"></span>
<div class="line"></div>
<img class="logo" src="bar-Inverse-barblanc.svg">
<div class="stripes">""" + "<span></span>" * 9 + "</div>")

# Couverture 2 · peinture : le Gentleman Oyster dans la rue, logo en bas
cover("couverture-2-peinture", """
.p{background:#1c1408}
.img{position:absolute;left:0;right:0;top:0;bottom:62mm;background:url(../peinture-gentleman.jpg) center 70%/cover}
.fade{position:absolute;left:0;right:0;bottom:0;height:110mm;background:linear-gradient(rgba(37,57,104,0),rgba(37,57,104,.75) 26%,#253968 44%)}
.logo{position:absolute;left:50%;bottom:44mm;transform:translateX(-50%);width:58mm}
.k{position:absolute;left:0;right:0;bottom:24mm;text-align:center;color:#fff;font-family:'Playfair Display',serif;font-weight:700;font-size:8mm;letter-spacing:.32em}
.s{position:absolute;left:0;right:0;bottom:16mm;text-align:center;color:var(--gold);font-size:2.9mm;letter-spacing:.3em;text-transform:uppercase;font-weight:600}
""", """
<div class="img"></div><div class="fade"></div>
<img class="logo" src="bar-Inverse-barblanc.svg">
<div class="k">LA CARTE</div><div class="s">Bar à huîtres · Paris 17<sup>e</sup></div>""")

# Couverture 3 · crème : la mascotte en gravure, logo en couleur, rayures bleues
cover("couverture-3-creme", """
.p{background:var(--cream);color:var(--ink)}
.logo{position:absolute;left:50%;top:22mm;transform:translateX(-50%);width:56mm}
.m{position:absolute;left:50%;top:78mm;transform:translateX(-50%);width:118mm}
.k{position:absolute;left:0;right:0;top:206mm;text-align:center;font-family:'Playfair Display',serif;font-weight:700;font-size:11mm;letter-spacing:.3em}
.r{position:absolute;left:50%;top:222mm;transform:translateX(-50%);display:flex;align-items:center;gap:3mm;color:var(--gold);font-size:2.9mm;letter-spacing:.3em;text-transform:uppercase;font-weight:600}
.r::before,.r::after{content:"";width:16mm;height:.4mm;background:var(--gold)}
.stripes{position:absolute;left:0;right:0;bottom:0;height:34mm;display:flex;justify-content:space-between}
.stripes span{width:10mm;background:var(--blue)}
""", """
<img class="logo" src="bar-Couleur.svg">
<img class="m" src="mascotte-ouvert.png">
<div class="k">LA CARTE</div><div class="r">La mer à votre table</div>
<div class="stripes">""" + "<span></span>" * 11 + "</div>")
print("ok")
