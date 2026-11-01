# Couvertures A4 retenues, avec 3 mm de fond perdu (page 216 × 303 mm).
# Bateau et Gentleman Oyster, chacune avec « La carte » ou « Menu » sous le logo.
FONTS = '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">'
BASE = """@page{size:216mm 303mm;margin:0}*{box-sizing:border-box;margin:0;padding:0}
html,body{width:216mm;height:303mm;overflow:hidden}body{font-family:Inter,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
:root{--cream:#F4EFE4;--ink:#0D255C;--blue:#253968;--gold:#D09D39}
.p{position:relative;width:216mm;height:303mm;overflow:hidden}
.logo{position:absolute;left:50%;transform:translateX(-50%)}
.k{position:absolute;left:0;right:0;text-align:center;font-weight:600;letter-spacing:.42em;text-transform:uppercase;padding-left:.42em}"""

def cover(name, css, body):
    open(f"final/{name}.html", "w").write(
        f'<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>{name}</title>{FONTS}<style>{BASE}{css}</style></head>'
        f'<body><div class="p">{body}</div></body></html>')

for mot, slug in (("Menu", "menu"),):
    # Bateau : l'aquarelle en haut, fondue dans le crème ; logo en bas au centre, le mot en petit dessous
    cover(f"couverture-bateau-{slug}", """
.p{background:var(--cream)}
.pic{position:absolute;left:0;right:0;top:0;height:218mm;background:url(../histoire-3.jpg) center 30%/cover}
.fade{position:absolute;left:0;right:0;top:132mm;height:88mm;background:linear-gradient(rgba(244,239,228,0),var(--cream))}
.logo{top:214mm;width:62mm}
.k{top:274mm;font-size:5.6mm;color:var(--ink)}
""", f'<div class="pic"></div><div class="fade"></div><img class="logo" src="../bar-Couleur.svg"><div class="k">{mot}</div>')

    # Gentleman Oyster : la peinture en haut, fondue dans le bleu ; logo au milieu du bleu, le mot en blanc dessous
    cover(f"couverture-gentleman-{slug}", """
.p{background:var(--blue)}
.pic{position:absolute;left:0;right:0;top:0;height:206mm;background:url(../peinture-gentleman.jpg) center 62%/cover}
.fade{position:absolute;left:0;right:0;top:150mm;height:58mm;background:linear-gradient(rgba(37,57,104,0),#253968)}
.logo{top:212mm;width:62mm}
.k{top:272mm;font-size:5.6mm;color:#fff}
""", f'<div class="pic"></div><div class="fade"></div><img class="logo" src="../bar-Inverse-barblanc.svg"><div class="k">{mot}</div>')
print("ok")
