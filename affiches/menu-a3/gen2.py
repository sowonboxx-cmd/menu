# Menu A3 vitrine, base « 2C » retenue : variantes d'en-tête, de pied et du bloc réservation.
# python3 gen2.py → c1.html … c7.html
import gen  # contenu de la carte et fonctions de lignes (regénère aussi les anciennes versions)
from gen import page, huitre_rows, rows, bev_rows, PLATEAUX_PARTAGE, PLATEAUX_SOLO, TERRE, RILLETTES, ALGUES, ADRESSE, HORAIRES, TEL, INSTA, CODE, OFFRE

CSS = """
.head{position:absolute;left:0;right:0;top:0;height:74mm;display:flex;align-items:center;justify-content:center}
.head.bleu{background:var(--blue)}
.head.creme{background:var(--cream);border-bottom:.5mm solid var(--gold);left:20mm;right:20mm}
.head img{width:66mm}
.head img.rond{width:58mm}
.body{position:absolute;left:20mm;right:20mm;top:84mm;bottom:var(--bot);display:grid;grid-template-columns:1fr 1fr;column-gap:16mm}
.body>div{display:flex;flex-direction:column}
.it{margin-bottom:2.7mm}.it.b{margin-bottom:1.5mm}.bcat{margin:2.4mm 0 1.2mm;color:var(--red)}
h2{font-family:'Playfair Display',serif;font-weight:700;font-size:7mm;color:var(--ink);letter-spacing:.02em;margin:0 0 3mm;display:flex;align-items:center;gap:3mm}
h2::after{content:"";flex:1;height:.4mm;background:var(--gold);transform:translateY(.22em)}
h3{font-size:3.3mm;letter-spacing:.24em;text-transform:uppercase;color:var(--gold);font-weight:700;margin:1mm 0 2.2mm}
.sec{margin-bottom:5.5mm}
.it+h3{margin-top:5mm}
.tart .it{margin-bottom:3.4mm}
.bloc{margin-top:auto}
.drinks{background:#fff;border-radius:3mm;padding:5mm 6mm 2.5mm}
.drinks h2{margin-bottom:3mm}
.resa{border-radius:3mm;padding:5mm 6mm;display:flex;align-items:center;gap:5mm}
.resa .t{flex:1}
.resa .k{font-size:3.1mm;letter-spacing:.24em;text-transform:uppercase;font-weight:700}
.resa .h{font-family:'Playfair Display',serif;font-weight:700;font-size:8.6mm;line-height:1.02;margin:1.6mm 0 2.6mm}
.resa .o{font-size:3.5mm;line-height:1.9}
.resa .code{display:inline-flex;align-items:center;justify-content:center;height:5.6mm;font-weight:800;font-size:3.3mm;letter-spacing:.16em;padding:0 2.6mm 0 2.9mm;border-radius:1.2mm;margin:0 .2mm 0 .8mm;vertical-align:middle;line-height:1;position:relative;top:.35mm}
.resa img{width:30mm;height:30mm;background:#fff;padding:2mm;border-radius:2mm;flex:none}
.resa.bleu{background:var(--blue);color:#fff}.resa.bleu .k{color:var(--gold)}.resa.bleu .code{background:var(--red);color:#fff}
.resa.blanc{background:#fff;color:var(--ink)}.resa.blanc .k{color:var(--red)}.resa.blanc .code{background:var(--red);color:#fff}.resa.blanc img{padding:0}
.pied{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;gap:4mm;font-size:3.6mm;letter-spacing:.04em;font-weight:500}
.pied b{font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.pied .s{width:1.2mm;height:1.2mm;border-radius:50%;background:var(--gold)}
.pied.bande{height:18mm;background:var(--blue);color:#fff}
.pied.creme{left:20mm;right:20mm;bottom:9mm;height:12mm;color:var(--ink);border-top:.5mm solid var(--gold)}
"""

def resa(cls):
    return (f'<div class="resa {cls}"><div class="t"><div class="k">Vous passez devant&nbsp;?</div>'
            f'<div class="h">Réservez<br>maintenant</div>'
            f'<div class="o">Scannez, c\'est fait en 30 secondes.<br>Avec le code <span class="code">{CODE}</span>{OFFRE}.</div></div>'
            f'<img src="qr.svg"></div>').replace('</span>une', '</span>, une')

def variant(name, head, logo, pied, resa_cls):
    bot = "28mm" if pied == "bande" else "27mm"
    img = f'<img class="{"rond" if "rond" in logo else ""}" src="{logo}">'
    body = f"""
<div class="head {head}">{img}</div>
<div class="body" style="--bot:{bot}">
  <div>
    <div class="sec"><h2>Huîtres</h2>{huitre_rows()}</div>
    <div class="sec"><h2>Plateaux</h2><h3>À partager</h3>{rows(PLATEAUX_PARTAGE)}<h3>Plaisir solitaire</h3>{rows(PLATEAUX_SOLO)}</div>
    <div class="sec"><h2>Terre & mer</h2>{rows(TERRE)}</div>
    <div class="bloc">{resa(resa_cls)}</div>
  </div>
  <div>
    <div class="sec tart"><h2>Tartinades</h2><h3>Rillettes de poissons</h3>{rows(RILLETTES)}<h3>Tartares d'algues</h3>{rows(ALGUES)}</div>
    <div class="bloc drinks"><h2>Boissons</h2>{bev_rows()}</div>
  </div>
</div>
<div class="pied {pied}"><b>{ADRESSE}</b><span class="s"></span><span>{HORAIRES}</span><span class="s"></span><span>{TEL}</span><span class="s"></span><span>{INSTA}</span></div>
"""
    page(name, CSS, body)

V = [
    ("c1", "bleu",  "bar-Blanc.svg",   "bande", "bleu"),
    ("c2", "bleu",  "bar-Inverse.svg", "bande", "bleu"),
    ("c3", "bleu",  "bar-Inverse.svg", "creme", "bleu"),
    ("c4", "bleu",  "bar-Inverse.svg", "bande", "blanc"),
    ("c5", "bleu",  "bar-rond.svg",    "bande", "bleu"),
    ("c6", "creme", "bar-Couleur.svg", "bande", "bleu"),
    ("c7", "creme", "bar-Couleur.svg", "creme", "blanc"),
]
for v in V:
    variant(*v)
print("ok c1-c7")

# Finale : la 3, avec « BAR » en blanc, et avec la réservation en blanc
variant("c3w", "bleu", "bar-Inverse-barblanc.svg", "creme", "bleu")
variant("c3r", "bleu", "bar-Inverse.svg", "creme", "blanc")
print("ok c3w c3r")
