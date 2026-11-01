# Menu A4 de table : à la place de « Réservez maintenant », un encart « voir la carte en photos et vidéos »
# avec une photo de plat en fond. Recto FR (QR → site FR), verso EN (QR → site EN).  3 propositions.
import re
FR = open("print/menu-a4.html").read()
EN = open("print/menu-a4-en.html").read()
RESA = re.compile(r'<div class="resa bleu">.*?<img src="\.\./qr\.svg"></div>', re.S)
CSS = """
.vid{position:relative;border-radius:3mm;overflow:hidden;min-height:58mm;display:flex;align-items:flex-end;color:#fff;background:#253968}
.vid .ph{position:absolute;inset:0;background-size:cover;background-position:center}
.vid .sh{position:absolute;inset:0;background:linear-gradient(100deg,rgba(13,37,92,.92) 0%,rgba(13,37,92,.78) 45%,rgba(13,37,92,.15) 100%)}
.vid .in{position:relative;display:flex;align-items:flex-end;gap:5mm;padding:6mm;width:100%}
.vid .t{flex:1}
.vid .k{font-size:3.1mm;letter-spacing:.24em;text-transform:uppercase;font-weight:700;color:var(--gold)}
.vid .h{font-family:'Playfair Display',serif;font-weight:700;font-size:8.6mm;line-height:1.02;margin:1.6mm 0 2.6mm}
.vid .o{font-size:3.5mm;line-height:1.55}
.vid .play{display:inline-flex;align-items:center;gap:2mm;margin-top:3mm;font-size:3.2mm;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.vid .play i{width:7mm;height:7mm;border-radius:50%;background:var(--red);display:grid;place-items:center}
.vid .play i::after{content:"";border-left:2.4mm solid #fff;border-top:1.5mm solid transparent;border-bottom:1.5mm solid transparent;margin-left:.6mm}
.vid img.qr{width:30mm;height:30mm;background:#fff;padding:2mm;border-radius:2mm;flex:none}
"""
PH = "https://media.beltab.app/drevici/plats/"
V = [
  ("a", "mousaillon-01.webp",
   ("La carte en images", "Voyez avant<br>de choisir", "Chaque plat en photo et en vidéo, sur notre carte en ligne.", "Scannez"),
   ("The menu in pictures", "See before<br>you choose", "Every dish in photos and videos, on our online menu.", "Scan")),
  ("b", "huitres-natures-n4-01.webp",
   ("Avant de commander", "Nos plats<br>en vidéo", "Huîtres, plateaux, tartinades : regardez-les en vrai avant de choisir.", "Scannez la carte"),
   ("Before you order", "Our dishes<br>on video", "Oysters, platters, spreads: see them for real before you choose.", "Scan the menu")),
  ("c", "bulots-01.webp",
   ("Vous hésitez&nbsp;?", "Regardez<br>vos plats", "Photos et vidéos de toute la carte, en un scan, à table.", "Voir la carte"),
   ("Can't decide?", "Take a look<br>first", "Photos and videos of the whole menu, in one scan, at your table.", "See the menu")),
]
def block(img, txt, qr):
    k, h, o, cta = txt
    return (f'<div class="vid"><div class="ph" style="background-image:url({PH}{img})"></div><div class="sh"></div>'
            f'<div class="in"><div class="t"><div class="k">{k}</div><div class="h">{h}</div><div class="o">{o}</div>'
            f'<div class="play"><i></i>{cta}</div></div><img class="qr" src="../{qr}"></div></div>')
for key, img, fr, en in V:
    for lang, src, txt, qr in (("fr", FR, fr, "qr-a4-fr.svg"), ("en", EN, en, "qr-a4-en.svg")):
        assert RESA.search(src), lang
        out = RESA.sub(block(img, txt, qr), src).replace("</style>", CSS + "</style>")
        open(f"print/menu-a4-video-{key}-{lang}.html", "w").write(out)
print("ok")
