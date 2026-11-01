# Affiche Free Oyster Paris retenue : « le kiosque » (vert, filets or), mascotte en grand, HD.
# python3 kiosque.py → final/*.html, puis node print.js → PDF vectoriels + PNG
# Formats : A4, A3, A0 (même mise en page, mise à l'échelle) et bandeau 100 × 330 mm. Chacun avec et sans fond perdu (3 mm).
import os
os.makedirs('final', exist_ok=True)
QR_URL = 'https://drevici.beltab.app/qr/free-oyster/affiche-biot-1'   # à remplacer par le code du Studio de chaque emplacement
GOLD, GREEN, CREAM = '#d09d39', '#163a2c', '#f3e7cf'
FONTS = ('<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,800;1,600'
         '&family=Inter:wght@600&display=swap" rel="stylesheet">')

def css(S):
    return f"""
.p{{position:relative;width:{W}mm;height:{H}mm;overflow:hidden;display:flex;flex-direction:column;align-items:center;background:{GREEN};color:{CREAM}}}
.cadre{{position:absolute;inset:{'5mm' if S else '7mm'};border:.8mm solid {GOLD};border-radius:2mm}}
.cadre::after{{content:"";position:absolute;inset:1.8mm;border:.3mm solid {GOLD}}}
.h{{position:relative;margin-top:{'15mm' if S else '19mm'};text-align:center}}
.h small{{display:block;font:600 {'3.1mm' if S else '3.8mm'}/1 Inter;letter-spacing:.34em;color:{GOLD}}}
.h b{{display:block;font:800 {'14.5mm' if S else '22mm'}/1.02 'Playfair Display';letter-spacing:.04em;margin-top:{'3mm' if S else '3.5mm'};white-space:nowrap}}
.h i{{display:block;font:italic 600 {'5mm' if S else '6.6mm'}/1 'Playfair Display';color:{GOLD};margin-top:{'2.5mm' if S else '3mm'}}}
.mid{{position:relative;flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center;gap:{'5mm' if S else '9mm'};padding:{'4mm 9mm' if S else '4mm 16mm'};flex-direction:{'column' if S else 'row'}}}
.masc{{display:block;height:{'150mm' if S else '168mm'};width:auto}}
.q{{width:{'60mm' if S else '70mm'};flex:none}}
.qrc{{background:#fff;padding:2.4mm;border-radius:3mm;outline:.6mm solid {GOLD};outline-offset:1.6mm}}
.qrc img{{display:block;width:100%;height:auto}}
.pied{{position:relative;margin-bottom:{'13mm' if S else '16mm'};text-align:center}}
.pied img{{height:{'27mm' if S else '30mm'}}}
.pied p{{font:600 {'3.1mm' if S else '3.6mm'}/1 Inter;letter-spacing:.2em;text-transform:uppercase;color:#cdbf9f;margin-top:2mm}}
"""

BODY = ('<div class="cadre"></div><div class="h"><small>· UNE HUÎTRE OFFERTE ·</small><b>{titre}</b><i>Don\'t scan !</i></div>'
        '<div class="mid"><img class="masc" src="../mascotte-hd.png"><div class="q"><div class="qrc"><img src="../qr-final.svg"></div></div></div>'
        '<div class="pied"><img src="../logo-blanc-or.svg"><p>8, rue Biot, 75017 Paris</p></div>')

# name, base layout (a4|bandeau), page w, h, zoom
FORMATS = [('a4', 'a4', 210, 297, 1), ('a3', 'a4', 297, 420, 297 / 210), ('a0', 'a4', 841, 1189, 841 / 210),
           ('bandeau', 'bandeau', 100, 330, 1)]
for name, base, pw, ph, z in FORMATS:
    S = base == 'bandeau'
    W, H = (100, 330) if S else (210, 297)
    titre = 'FREE<br>OYSTER' if S else 'FREE OYSTER'
    for bleed in (0, 3):
        bw, bh = pw + 2 * bleed, ph + 2 * bleed
        off = bleed / z
        doc = (f'<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>free-oyster-{name}</title>{FONTS}<style>'
               f'*{{box-sizing:border-box;margin:0;padding:0}}@page{{size:{bw}mm {bh}mm;margin:0}}'
               f'html,body{{width:{bw}mm;height:{bh}mm;overflow:hidden;background:{GREEN};-webkit-print-color-adjust:exact;print-color-adjust:exact}}'
               f'.z{{zoom:{z};position:absolute;left:{off}mm;top:{off}mm}}{css(S)}</style></head>'
               f'<body><div class="z"><div class="p">{BODY.format(titre=titre)}</div></div></body></html>')
        open(f'final/free-oyster-{name}{"-fond-perdu" if bleed else ""}.html', 'w').write(doc)
print('ok')
