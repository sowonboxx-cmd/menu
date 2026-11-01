# Couvertures A4 avec les aquarelles de « Notre histoire »
FONTS = '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">'
BASE = """@page{size:210mm 297mm;margin:0}*{box-sizing:border-box;margin:0;padding:0}
html,body{width:210mm;height:297mm;overflow:hidden}body{font-family:Inter,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
:root{--cream:#F4EFE4;--ink:#0D255C;--blue:#253968;--gold:#D09D39;--red:#CD3232}
.p{position:relative;width:210mm;height:297mm;overflow:hidden;background:var(--cream);color:var(--ink)}
.k{font-family:'Playfair Display',serif;font-weight:700;letter-spacing:.3em;text-align:center}
.r{display:flex;align-items:center;justify-content:center;gap:3mm;color:var(--gold);font-size:2.9mm;letter-spacing:.3em;text-transform:uppercase;font-weight:600}
.r::before,.r::after{content:"";width:14mm;height:.4mm;background:var(--gold)}
.foot{position:absolute;left:0;right:0;bottom:12mm;text-align:center;font-size:2.8mm;letter-spacing:.22em;text-transform:uppercase;font-weight:600;color:var(--ink);opacity:.8}"""
def cover(name, css, body):
    open(f"print/{name}.html","w").write(f'<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>{name}</title>{FONTS}<style>{BASE}{css}</style></head><body><div class="p">{body}</div></body></html>')

# A · le bateau, encadré comme un tableau
cover("couverture-histoire-a", """
.logo{position:absolute;left:50%;top:18mm;transform:translateX(-50%);width:46mm}
.pic{position:absolute;left:24mm;right:24mm;top:72mm;height:162mm;background:url(../histoire-3.jpg) center/cover;border-radius:2mm}
.k{position:absolute;left:0;right:0;top:246mm;font-size:9.5mm}
.r{position:absolute;left:0;right:0;top:262mm}
""", """<img class="logo" src="../bar-Couleur.svg"><div class="pic"></div>
<div class="k">LA CARTE</div><div class="r">Pure · Naturelle · Authentique</div>""")

# B · le bateau en pleine page, fondu vers le crème
cover("couverture-histoire-b", """
.pic{position:absolute;left:0;right:0;top:0;height:210mm;background:url(../histoire-3.jpg) center 30%/cover}
.fade{position:absolute;left:0;right:0;top:120mm;height:92mm;background:linear-gradient(rgba(244,239,228,0),var(--cream))}
.logo{position:absolute;left:50%;top:196mm;transform:translateX(-50%);width:50mm}
.k{position:absolute;left:0;right:0;top:252mm;font-size:9mm}
.r{position:absolute;left:0;right:0;top:267mm}
""", """<div class="pic"></div><div class="fade"></div><img class="logo" src="../bar-Couleur.svg">
<div class="k">LA CARTE</div><div class="r">De Surzur à Paris</div>""")

# C · bandeau bleu comme le menu, aquarelle du parc à huîtres au centre
cover("couverture-histoire-c", """
.band{position:absolute;left:0;right:0;top:0;height:70mm;background:var(--blue);display:flex;align-items:center;justify-content:center}
.band img{width:52mm}
.pic{position:absolute;left:18mm;right:18mm;top:84mm;height:118mm;background:url(../histoire-2.jpg) center/cover;border-radius:2mm}
.k{position:absolute;left:0;right:0;top:220mm;font-size:10mm}
.r{position:absolute;left:0;right:0;top:237mm}
.t{position:absolute;left:30mm;right:30mm;top:250mm;text-align:center;font-size:3.3mm;line-height:1.6;color:#4a5470}
""", """<div class="band"><img src="../bar-Inverse-barblanc.svg"></div><div class="pic"></div>
<div class="k">LA CARTE</div><div class="r">Pure · Naturelle · Authentique</div>
<div class="t">Une entreprise familiale de Surzur, dans le Morbihan, qui cultive ses huîtres issues de captages naturels.</div>""")
print("ok")
