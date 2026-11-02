# Carte finale Drevici Oyster Bar : même carte pour la vitrine (A3) et la table (A4), FR et EN,
# avec l'encart « La carte en images » (photo 2) à la place de « Réservez maintenant ».
# python3 gen7.py → final/*.html   (puis : NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node print7.js final carte-  → PDF + PNG 300 dpi ; il faut undici)
import re, os
os.makedirs("final", exist_ok=True)
SRC = open("c3w.html").read()

# Traduction anglaise : la liste de remplacements de gen_en.py, appliquée à la carte A3
g = open("gen_en.py").read()
R = eval(g[g.index("R = [") + 4: g.index("\n]\n", g.index("R = [")) + 2])
def to_en(s):
    for a, b in R:
        if a in s: s = s.replace(a, b)
    return re.sub(r'(<span class="pr">.*?</span>)', lambda m: re.sub(r'(\d),(\d)', r'\1.\2', m.group(1)), s)

RESA = re.compile(r'<div class="resa bleu">.*?<img src="qr\.svg"></div>', re.S)
TXT = {
  "fr": ("La carte en images", "Voyez avant<br>de choisir", "Chaque plat en photo et en vidéo,<br>sur notre carte en ligne.", "Voir la carte", "qr-a4-fr.svg"),
  "en": ("The menu in pictures", "Sea before<br>you choose", "Every dish in photos and videos,<br>on our online menu.", "See the menu", "qr-a4-en.svg"),
}
CSS = """
.vid{position:relative;border-radius:3mm;overflow:hidden;min-height:58mm;display:flex;align-items:flex-end;color:#fff;background:#253968}
/* photo + dégradé bleu fusionnés en une seule image (photos/carte-en-images-fond.jpg) : pas de transparence dans le PDF,
   sinon certains lecteurs PDF (Aperçu, iPhone) teintent le dégradé en rose */
.vid .ph{position:absolute;inset:0;background:url(photos/carte-en-images-fond.jpg) center/cover}
.vid .sh{display:none}
.vid .in{position:relative;display:flex;align-items:flex-end;gap:5mm;padding:6mm;width:100%}
.vid .t{flex:1}
.vid .k{font-size:3.1mm;letter-spacing:.24em;text-transform:uppercase;font-weight:700;color:var(--gold)}
.vid .h{font-family:'Playfair Display',serif;font-weight:700;font-size:8.6mm;line-height:1.02;margin:1.6mm 0 2.6mm}
.vid .o{font-size:3.5mm;line-height:1.55}
.vid .play{display:inline-flex;align-items:center;gap:2mm;margin-top:3mm;font-size:3.2mm;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.vid .play i{width:7mm;height:7mm;border-radius:50%;background:var(--red);display:grid;place-items:center}
.vid .play i::after{content:"";border-left:2.4mm solid #fff;border-top:1.5mm solid transparent;border-bottom:1.5mm solid transparent;margin-left:.6mm}
.vid img.qr{width:33mm;height:33mm;background:#fff;padding:1.6mm;border-radius:2.4mm;flex:none}
/* pied de page remonté et centré sur sa ligne */
.pied.creme{bottom:12mm!important;height:11mm!important;align-items:center}
.pied.creme>*{line-height:1}
.body{bottom:29mm!important}
"""
def block(lang):
    k, h, o, cta, qr = TXT[lang]
    return (f'<div class="vid"><div class="ph"></div><div class="sh"></div><div class="in"><div class="t">'
            f'<div class="k">{k}</div><div class="h">{h}</div><div class="o">{o}</div>'
            f'<div class="play"><i></i>{cta}</div></div><img class="qr" src="{qr}"></div></div>')

def write(name, html):
    html = html.replace('src="', 'src="../').replace("url(photos/", "url(../photos/")
    open(f"final/{name}.html", "w").write(html)

for lang in ("fr", "en"):
    s = SRC if lang == "fr" else to_en(SRC)
    assert RESA.search(s), lang
    s = RESA.sub(block(lang), s).replace("</style>", CSS + "</style>")
    # A3
    write(f"carte-a3-{lang}", s)
    a3b = s.replace("@page{size:297mm 420mm;margin:0}", "@page{size:303mm 426mm;margin:0}") \
           .replace("html,body{width:297mm;height:420mm}", "html,body{width:303mm;height:426mm}") \
           .replace("</style>", "body{position:relative}body::before{content:'';position:absolute;left:0;right:0;top:0;height:77mm;background:#253968}.page{position:absolute;left:3mm;top:3mm}</style>")
    write(f"carte-a3-{lang}-fond-perdu", a3b)
    # A4 = A3 réduit (A4 = A3 ÷ √2)
    a4 = s.replace("@page{size:297mm 420mm;margin:0}", "@page{size:210mm 297mm;margin:0}") \
          .replace("html,body{width:297mm;height:420mm}", "html,body{width:210mm;height:297mm;overflow:hidden}") \
          .replace("</style>", ".page{zoom:0.70711}</style>")
    write(f"carte-a4-{lang}", a4)
    a4b = s.replace("@page{size:297mm 420mm;margin:0}", "@page{size:216mm 303mm;margin:0}") \
           .replace("html,body{width:297mm;height:420mm}", "html,body{width:216mm;height:303mm;overflow:hidden}") \
           .replace("</style>", "body{position:relative}body::before{content:'';position:absolute;left:0;right:0;top:0;height:55.4mm;background:#253968}.page{position:absolute;left:3mm;top:3mm;zoom:0.70711}</style>")
    # avec zoom, left/top sont aussi réduits : on compense
    a4b = a4b.replace(".page{position:absolute;left:3mm;top:3mm;zoom:0.70711}", ".page{position:absolute;left:4.243mm;top:4.243mm;zoom:0.70711}")
    write(f"carte-a4-{lang}-fond-perdu", a4b)

# Couvertures retenues (en français) : le bateau, et le Gentleman Oyster à Paris
for name in ("couverture-histoire-b", "couverture-2-peinture"):
    s = open(f"print/{name}.html").read()
    open(f"final/{name}.html", "w").write(s)
print("ok")
