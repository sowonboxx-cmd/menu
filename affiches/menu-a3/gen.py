# Menu A3 vitrine Drevici Oyster Paris : trois versions (HTML A3 portrait).
# python3 gen.py → v1.html v2.html v3.html
E = " €"

HUITRES = [
    ("Huîtres natures n°4", "Pain, beurre, citron, vinaigre-échalotes", "12", "22"),
    ("Huîtres natures n°3", "Pain, beurre, citron, vinaigre-échalotes", "14", "26"),
    ("Huîtres natures n°2", "Pain, beurre, citron, vinaigre-échalotes", "16", "30"),
    ("Huîtres gratinées", "Beurre herbé, chapelure croustillante, servies chaudes", "9", "17", "3", "6"),
]
TERRE = [
    ("Planche de charcuterie bretonne", "Saucisson de jambon, andouille, filet mignon fumé", "20"),
    ("Gambas de Madagascar", "6 gambas, « mayonnalgue » maison", "12"),
    ("Bulots", "200 g, « mayonnalgue » maison", "7"),
    ("Soupe de poisson", "Servie avec fromage et pain", "8"),
]
PLATEAUX_PARTAGE = [
    ("Drevici", "12 huîtres n°3, charcuterie, gambas, bulots, tartinade", "65"),
    ("Capitaine", "12 huîtres n°3, 200 g de bulots, 6 gambas", "45"),
    ("Duo champagne", "12 huîtres n°3, 2 coupes de champagne", "40"),
]
PLATEAUX_SOLO = [
    ("Mousaillon", "6 huîtres n°3, 4 gambas", "22"),
    ("Solo champagne", "6 huîtres n°3, 1 coupe de champagne", "20"),
    ("Matelot", "3 huîtres n°3, 50 g de bulots, 3 gambas", "15"),
]
RILLETTES = [
    ("Ormeaux de l'île de Groix", "", "14"), ("Homard bleu", "", "12"),
    ("Truite de Bretagne", "", "9"), ("Saint-Jacques à la bretonne", "", "9"),
    ("Maquereau au poivre de Sichuan", "", "9"), ("Sardines au piment d'Espelette", "", "9"),
    ("Dorade combava & gingembre", "", "9"),
]
ALGUES = [("Soleil", "", "9"), ("Nature", "", "9"), ("Pomme et miel", "", "9"), ("Caviar de nori", "", "9")]
# boissons : (nom, [(format, prix), ...])
BOISSONS = [
    ("Bulles", [("Champagne Maison Fricot", [("10 cl", "10"), ("75 cl", "65")]), ("Pétillant Saumur", [("10 cl", "7"), ("75 cl", "30")])]),
    ("Vins blancs", [("Sauvignon", [("12 cl", "5"), ("50 cl", "17")]), ("Chardonnay", [("12 cl", "5,50"), ("75 cl", "30")]),
                     ("Viognier", [("12 cl", "6,50"), ("75 cl", "36")]), ("Chablis", [("12 cl", "6,50"), ("75 cl", "36")])]),
    ("Rouges & rosé", [("Côtes du Rhône", [("25 cl", "5"), ("50 cl", "17")]), ("Pinot noir", [("25 cl", "5,50"), ("75 cl", "30")]), ("Rosé", [("25 cl", "5,50")])]),
    ("Bières", [("La Blonde 5,5°", [("25 cl", "4"), ("50 cl", "7")]), ("La IPA 6°", [("25 cl", "5"), ("50 cl", "8")])]),
    ("Spiritueux & cocktail", [("Liqueur citron ou menthe", [("4 cl", "8")]), ("Gin, rhum, esprit malt", [("4 cl", "9")]),
                       ("Pastis", [("2 cl", "4"), ("4 cl", "7")]), ("Spritz", [("", "9,50")])]),
    ("Softs", [("Breizh Cola / Cola zéro", [("33 cl", "4")]), ("Jus de pomme breton", [("33 cl", "4")]),
               ("Ginger beer", [("33 cl", "5")]), ("Tonic", [("33 cl", "5")])]),
]
ADRESSE = "8 rue Biot · 75017 Paris"
TEL = "09 74 64 05 87"
INSTA = "@drevicioysterbar"
HORAIRES = "Du mardi au dimanche, dès 17 h"


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;")


def huitre_rows():
    out = []
    for h in HUITRES:
        q1, q2 = (h[4], h[5]) if len(h) > 4 else ("6", "12")
        out.append(f'<div class="it"><div class="ln"><span class="nm">{esc(h[0])}</span><i></i>'
                   f'<span class="pr"><small>les {q1}</small> {h[2]} <small>· les {q2}</small> {h[3]}</span></div>'
                   f'<div class="ds">{esc(h[1])}</div></div>')
    return "".join(out)


def rows(items, desc=True):
    out = []
    for n, d, p in items:
        out.append(f'<div class="it"><div class="ln"><span class="nm">{esc(n)}</span><i></i><span class="pr">{p}</span></div>'
                   + (f'<div class="ds">{esc(d)}</div>' if desc and d else "") + "</div>")
    return "".join(out)


def bev_rows():
    out = []
    for cat, items in BOISSONS:
        out.append(f'<div class="bcat">{esc(cat)}</div>')
        for n, sizes in items:
            pr = ' <b>·</b> '.join((f'<small>{s}</small> {p}' if s else p) for s, p in sizes)
            out.append(f'<div class="it b"><div class="ln"><span class="nm">{esc(n)}</span><i></i><span class="pr">{pr}</span></div></div>')
    return "".join(out)


BASE_CSS = """
@page{size:297mm 420mm;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:297mm;height:420mm}
body{font-family:'Inter',sans-serif;color:var(--ink);background:var(--cream);-webkit-print-color-adjust:exact;print-color-adjust:exact}
:root{--cream:#F4EFE4;--ink:#0D255C;--blue:#253968;--gold:#D09D39;--red:#CD3232;--mute:#5f6778}
.page{position:relative;width:297mm;height:420mm;overflow:hidden}
.it{margin:0 0 3.1mm}
.ln{display:flex;align-items:baseline;gap:2.4mm}
.nm{font-weight:700;font-size:4.15mm;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.ln i{flex:1;border-bottom:.35mm solid currentColor;opacity:.55;transform:translateY(-1mm);min-width:6mm}
.pr{font-weight:700;font-size:4.3mm;white-space:nowrap;font-variant-numeric:tabular-nums}
.pr small{font-weight:500;font-size:3.1mm;letter-spacing:.04em;opacity:.75}
.ds{font-size:3.25mm;color:var(--mute);margin-top:.8mm;line-height:1.3}
.it.b{margin-bottom:1.9mm}.it.b .nm{font-size:3.55mm;letter-spacing:.05em}.it.b .pr{font-size:3.7mm}
.bcat{font-family:'Playfair Display',serif;font-weight:700;font-size:4.2mm;color:var(--gold);letter-spacing:.04em;margin:3.2mm 0 1.6mm}
.bcat:first-child{margin-top:0}
"""


def page(name, css, body):
    html = f"""<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Menu A3 · {name}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
<style>{BASE_CSS}{css}</style></head><body><div class="page">{body}</div></body></html>"""
    open(f"{name}.html", "w").write(html)


# ───────────────────────── V1 · Bistro (le plus proche de l'inspiration)
v1_css = """
.top{position:absolute;left:18mm;right:18mm;top:16mm;height:66mm}
.stripes{position:absolute;top:0;display:flex;gap:4.2mm}.stripes span{width:7mm;height:54mm;background:var(--blue)}
.stripes.l{left:0}.stripes.r{right:0}
.arc{position:absolute;left:50%;top:-2mm;transform:translateX(-50%);width:120mm;height:60mm}
.oyster{position:absolute;left:50%;top:30mm;transform:translateX(-50%);width:30mm}
.dot{position:absolute;top:44mm;width:3.2mm;height:3.2mm;border-radius:50%;background:var(--red)}
.dot.l{left:calc(50% - 26mm)}.dot.r{right:calc(50% - 26mm)}
.sub{position:absolute;left:0;right:0;top:66mm;text-align:center;font-size:3.3mm;letter-spacing:.42em;text-transform:uppercase;font-weight:600;color:var(--blue)}
.body{position:absolute;left:18mm;right:18mm;top:90mm;bottom:40mm;display:grid;grid-template-columns:1fr 1fr;column-gap:14mm}
.sec{position:relative;padding-left:11mm;margin-bottom:6mm}
.sec h2{position:absolute;left:0;top:0;writing-mode:vertical-rl;transform:rotate(180deg);font-weight:800;font-size:4.6mm;letter-spacing:.2em;text-transform:uppercase;color:var(--red);white-space:nowrap}
.sec h3{font-family:'Playfair Display',serif;font-size:4mm;color:var(--gold);margin:0 0 2mm;font-weight:700;letter-spacing:.03em}
.rule{height:.4mm;background:var(--blue);opacity:.8;margin:0 0 6mm}
.foot{position:absolute;left:18mm;right:18mm;bottom:14mm;height:20mm;background:var(--blue);color:#fff;display:flex;align-items:center;justify-content:space-around;font-size:3.6mm;font-weight:600;letter-spacing:.05em}
.foot .sep{width:.35mm;height:7mm;background:rgba(255,255,255,.6)}
.foot img{height:7mm}
"""
v1_body = f"""
<div class="top">
  <div class="stripes l"><span></span><span></span><span></span></div>
  <div class="stripes r"><span></span><span></span><span></span></div>
  <svg class="arc" viewBox="0 0 240 120"><defs><path id="a" d="M30,112 A90,90 0 0 1 210,112"/></defs>
    <text font-family="Playfair Display" font-weight="700" font-size="27" letter-spacing="5" fill="#0D255C"><textPath href="#a" startOffset="50%" text-anchor="middle">DREVICI OYSTER</textPath></text></svg>
  <img class="oyster" src="ico-Huitre.svg">
  <span class="dot l"></span><span class="dot r"></span>
  <div class="sub">Bar à huîtres · Paris 17<sup>e</sup></div>
</div>
<div class="body">
  <div>
    <div class="sec"><h2>Huîtres</h2>{huitre_rows()}</div><div class="rule"></div>
    <div class="sec"><h2>Plateaux</h2><h3>À partager</h3>{rows(PLATEAUX_PARTAGE)}<h3>Plaisir solitaire</h3>{rows(PLATEAUX_SOLO)}</div><div class="rule"></div>
    <div class="sec"><h2>Terre & mer</h2>{rows(TERRE)}</div>
  </div>
  <div>
    <div class="sec"><h2>Tartinades</h2><h3>Rillettes de poissons</h3>{rows(RILLETTES)}<h3>Tartares d'algues</h3>{rows(ALGUES)}</div><div class="rule"></div>
    <div class="sec"><h2>Boissons</h2>{bev_rows()}</div>
  </div>
</div>
<div class="foot"><span>{ADRESSE}</span><span class="sep"></span><span>{TEL}</span><span class="sep"></span><span>{INSTA}</span><span class="sep"></span><img src="ico-Vagues-blanc.svg"></div>
"""
page("v1", v1_css, v1_body)

# ───────────────────────── V2 · Marinière (bandeau bleu en haut, rayures en bas, QR)
v2_css = """
.head{position:absolute;left:0;right:0;top:0;height:74mm;background:var(--blue);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5mm}
.head img.logo{width:74mm}
.head .tag{color:#fff;font-size:3.4mm;letter-spacing:.42em;text-transform:uppercase;font-weight:500;opacity:.85}
.head .dots{position:absolute;top:50%;width:3.4mm;height:3.4mm;border-radius:50%;background:var(--gold)}
.head .dots.l{left:30mm}.head .dots.r{right:30mm}
.body{position:absolute;left:20mm;right:20mm;top:84mm;bottom:28mm;display:grid;grid-template-columns:1fr 1fr;column-gap:16mm}
.body>div{display:flex;flex-direction:column}
.v2 .it{margin-bottom:2.7mm}.v2 .it.b{margin-bottom:1.5mm}.v2 .bcat{margin:2.4mm 0 1.2mm}
h2{font-family:'Playfair Display',serif;font-weight:700;font-size:7mm;color:var(--ink);letter-spacing:.02em;margin:0 0 3mm;display:flex;align-items:center;gap:3mm}
h2::after{content:"";flex:1;height:.4mm;background:var(--gold)}
h3{font-size:3.3mm;letter-spacing:.24em;text-transform:uppercase;color:var(--gold);font-weight:700;margin:1mm 0 2.2mm}
.sec{margin-bottom:5.5mm}
.drinks{background:#fff;border-radius:3mm;padding:5mm 6mm 2.5mm}
.drinks h2{margin-bottom:3mm}
.stripes{position:absolute;left:0;right:0;bottom:0;height:20mm;display:flex;justify-content:space-between;padding:0 0 0 0;background:var(--cream)}
.stripes span{width:12mm;background:var(--blue)}
.qr{display:flex;align-items:center;gap:4mm}
.qr img{width:26mm;height:26mm;background:#fff;padding:2mm;border-radius:2mm}
.qr div{font-size:3.4mm;line-height:1.35;text-align:right;color:var(--ink)}.qr b{display:block;font-size:4.4mm;letter-spacing:.06em;text-transform:uppercase}
.info{font-size:3.4mm;line-height:1.6;color:var(--ink)}
.bas{margin-top:auto;display:flex;align-items:flex-end;justify-content:space-between;gap:4mm;padding-top:4mm;border-top:.4mm solid var(--gold)}.info b{letter-spacing:.06em;text-transform:uppercase}
"""
v2_body = f"""
<div class="head"><img class="logo" src="logo-blanc.svg"><span class="dots l"></span><span class="dots r"></span></div>
<div class="body v2">
  <div>
    <div class="sec"><h2>Huîtres</h2>{huitre_rows()}</div>
    <div class="sec"><h2>Plateaux</h2><h3>À partager</h3>{rows(PLATEAUX_PARTAGE)}<h3>Plaisir solitaire</h3>{rows(PLATEAUX_SOLO)}</div>
    <div class="sec"><h2>Terre & mer</h2>{rows(TERRE)}</div>
    <div class="bas"><div class="info"><b>{ADRESSE}</b><br>{HORAIRES}<br>{TEL} · {INSTA}</div><div class="qr"><div><b>Réservez</b>votre table</div><img src="qr.svg"></div></div>
  </div>
  <div>
    <div class="sec"><h2>Tartinades</h2><h3>Rillettes de poissons</h3>{rows(RILLETTES)}<h3>Tartares d'algues</h3>{rows(ALGUES)}</div>
    <div class="drinks"><h2>Boissons</h2>{bev_rows()}</div>
  </div>
</div>
<div class="stripes">{"<span></span>" * 12}</div>
"""
page("v2", v2_css, v2_body)


# ───────────────────────── Réserver maintenant (bloc commun)
OFFRE = "une coupe de pétillant offerte à l'arrivée"
CODE = "VITRINE"
RESA_CSS = """
.resa{margin-top:auto;border-radius:3mm;padding:5mm;display:flex;align-items:center;gap:5mm}
.resa .t{flex:1}
.resa .k{font-size:3.1mm;letter-spacing:.24em;text-transform:uppercase;font-weight:700}
.resa .h{font-family:'Playfair Display',serif;font-weight:700;font-size:8.6mm;line-height:1.02;margin:1.6mm 0 2.4mm}
.resa .o{font-size:3.5mm;line-height:1.45}
.resa .code{display:inline-block;font-weight:800;letter-spacing:.16em;padding:.6mm 2.4mm;border-radius:1.2mm;margin:0 .6mm}
.resa img{width:30mm;height:30mm;background:#fff;padding:2mm;border-radius:2mm;flex:none}
"""
def resa_block(cls=""):
    return (f'<div class="resa {cls}"><div class="t"><div class="k">Vous passez devant&nbsp;?</div>'
            f'<div class="h">Réservez<br>maintenant</div>'
            f'<div class="o">Scannez, c\'est fait en 30 secondes.<br>Avec le code <span class="code">{CODE}</span>, {OFFRE}.</div></div>'
            f'<img src="qr.svg"></div>')

# ───────────────────────── V1b · Bistro avec bandeau bleu
v1b_css = v1_css + RESA_CSS + """
.band{position:absolute;left:0;right:0;top:0;height:84mm;background:var(--blue)}
.top{top:12mm}
.it{margin-bottom:2.6mm}.it.b{margin-bottom:1.45mm}.bcat{margin:2.2mm 0 1.1mm}.rule{margin-bottom:4.5mm}.sec{margin-bottom:4.5mm}
.stripes span{background:var(--cream)}
.sub{color:#fff;opacity:.9}
.body{top:92mm}
.body>div{display:flex;flex-direction:column}
.resa{background:var(--blue);color:#fff;margin-left:11mm}
.resa .k{color:var(--gold)}.resa .code{background:var(--red);color:#fff}
"""
v1b_body = v1_body.replace('<div class="top">','<div class="band"></div><div class="top">',1) \
    .replace('fill="#0D255C"','fill="#FFFFFF"').replace('src="ico-Huitre.svg"','src="ico-Huitre-blanc.svg"') \
    .replace('<div class="sec"><h2>Terre & mer</h2>{rows(TERRE)}</div>'.replace('{rows(TERRE)}',rows(TERRE)),
             '<div class="sec"><h2>Terre & mer</h2>'+rows(TERRE)+'</div>'+resa_block())
page("v1b", v1b_css, v1b_body)

# ───────────────────────── V2 · variantes avec du rouge
def v2_variant(name, extra):
    css = v2_css + RESA_CSS + """
h2::after{transform:translateY(.22em)}
.head{gap:3.4mm}
.head img.logo{width:62mm}
.head .tag{letter-spacing:.14em;text-transform:none;font-size:3.5mm;opacity:.9}
""" + extra
    body = v2_body.replace('<span class="dots l">',
        f'<div class="tag">{ADRESSE} · {HORAIRES} · {TEL}</div><span class="dots l">',1)
    import re
    body = re.sub(r'<div class="bas">.*?<img src="qr.svg"></div></div>', resa_block(), body, flags=re.S)
    page(name, css, body)

v2_variant("v2a", """
h2::after{background:var(--red)}
h3{color:var(--red)}
.head .dots{background:var(--red)}
.resa{background:#fff}
.resa .k{color:var(--red)}.resa .h{color:var(--ink)}.resa .code{background:var(--red);color:#fff}
""")
v2_variant("v2b", """
h2{color:var(--red)}
.resa{background:var(--red);color:#fff}
.resa .k{color:#fff;opacity:.85}.resa .code{background:#fff;color:var(--red)}
""")
v2_variant("v2c", """
.head .dots{background:var(--red)}
.bcat{color:var(--red)}
.stripes span{background:var(--red)}
.resa{background:var(--blue);color:#fff}
.resa .k{color:var(--gold)}.resa .code{background:var(--red);color:#fff}
""")

# ───────────────────────── V3 · Colonne bleue (bande verticale, logo rond, QR)
v3_css = """
.side{position:absolute;left:0;top:0;bottom:0;width:62mm;background:var(--blue);color:#fff;display:flex;flex-direction:column;align-items:center;padding:20mm 0 18mm}
.side .rond{width:46mm;background:var(--cream);border-radius:50%}
.side .vert{flex:1;display:flex;align-items:center;justify-content:center}
.side .vert span{writing-mode:vertical-rl;transform:rotate(180deg);font-family:'Playfair Display',serif;font-weight:700;font-size:15mm;letter-spacing:.14em;white-space:nowrap}
.side .gold{width:3.4mm;height:3.4mm;border-radius:50%;background:var(--gold);margin:6mm 0}
.side .qr{background:#fff;border-radius:3mm;padding:3mm;width:38mm}
.side .qr img{width:100%;display:block}
.side .ql{font-size:3.2mm;letter-spacing:.2em;text-transform:uppercase;font-weight:700;margin-top:3mm;text-align:center;line-height:1.5}
.main{position:absolute;left:76mm;right:16mm;top:18mm;bottom:16mm;display:grid;grid-template-columns:1fr 1fr;column-gap:11mm;grid-template-rows:auto 1fr}
.intro{grid-column:1/3;display:flex;align-items:flex-end;justify-content:space-between;border-bottom:.45mm solid var(--ink);padding-bottom:4mm;margin-bottom:7mm}
.intro h1{font-family:'Playfair Display',serif;font-weight:700;font-size:15mm;letter-spacing:.04em;line-height:1}
.intro div{text-align:right;font-size:3.4mm;line-height:1.55;color:var(--ink)}
.intro div b{letter-spacing:.06em;text-transform:uppercase}
h2{font-weight:800;font-size:4.8mm;letter-spacing:.22em;text-transform:uppercase;color:var(--ink);margin:0 0 3.4mm;display:flex;align-items:center;gap:2.6mm}
h2::before{content:"";width:2.6mm;height:2.6mm;border-radius:50%;background:var(--red)}
h3{font-family:'Playfair Display',serif;font-size:4mm;color:var(--gold);font-weight:700;margin:0 0 2mm}
.sec{margin-bottom:6.5mm}
.nm{font-size:3.85mm}.pr{font-size:4mm}
"""
v3_body = f"""
<div class="side"><img class="rond" src="logo-rond.svg"><span class="gold"></span>
  <div class="vert"><span>LA CARTE</span></div><span class="gold"></span>
  <div class="qr"><img src="qr.svg"></div><div class="ql">Réservez<br>votre table</div></div>
<div class="main">
  <div class="intro"><h1>Huîtres<br>&amp; plateaux</h1><div><b>{ADRESSE}</b><br>{HORAIRES}<br>{TEL} · {INSTA}</div></div>
  <div>
    <div class="sec"><h2>Huîtres</h2>{huitre_rows()}</div>
    <div class="sec"><h2>Plateaux</h2><h3>À partager</h3>{rows(PLATEAUX_PARTAGE)}<h3>Plaisir solitaire</h3>{rows(PLATEAUX_SOLO)}</div>
    <div class="sec"><h2>Terre & mer</h2>{rows(TERRE)}</div>
  </div>
  <div>
    <div class="sec"><h2>Tartinades</h2><h3>Rillettes de poissons</h3>{rows(RILLETTES)}<h3>Tartares d'algues</h3>{rows(ALGUES)}</div>
    <div class="sec"><h2>Boissons</h2>{bev_rows()}</div>
  </div>
</div>
"""
page("v3", v3_css, v3_body)
print("ok")
