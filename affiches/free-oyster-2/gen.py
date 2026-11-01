# Affiches Free Oyster (Paris) : 8 pistes, chacune en A4 (même rapport que l'A0 et l'A3) et en bandeau long.
# python3 gen.py → pistes/*.html, puis node shot.js → PNG
import os
os.makedirs('pistes', exist_ok=True)
FONTS = ('<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;0,900;1,600;1,700'
         '&family=Inter:wght@400;500;600;700;800&family=Anton&family=Caveat:wght@600;700&family=Alfa+Slab+One&display=swap" rel="stylesheet">')
FMT = {'a4': (210, 297), 'bandeau': (100, 330)}
NAVY, INK, RED, GOLD, CREAM = '#1d2a4d', '#0d255c', '#b3261e', '#d09d39', '#f4e6d2'

BASE = """*{box-sizing:border-box;margin:0;padding:0}
html,body{width:%(w)smm;height:%(h)smm;overflow:hidden}
body{font-family:Inter,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@page{size:%(w)smm %(h)smm;margin:0}
.p{position:relative;width:%(w)smm;height:%(h)smm;overflow:hidden;display:flex;flex-direction:column;align-items:center}
.qr{display:block;width:100%%;height:auto}
.qrc{background:#fff;padding:2.2mm;border-radius:3mm}
.masc{display:block;height:100%%;width:auto;object-fit:contain}
.mid{flex:1;display:flex;align-items:center;justify-content:center;gap:4mm;width:100%%;min-height:0}
.strip .mid{flex-direction:column;gap:3mm}
"""

def page(name, fmt, css, body, cls=''):
    w, h = FMT[fmt]
    html = (f'<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>{name}</title>{FONTS}'
            f'<style>{BASE % {"w": w, "h": h}}{css}</style></head>'
            f'<body><div class="p {cls} {"strip" if fmt == "bandeau" else "a4"}">{body}</div></body></html>')
    open(f'pistes/{name}-{fmt}.html', 'w').write(html)

QR = '<img class="qr" src="../qr.svg">'
POINTE = '<img class="masc" src="../mascotte-pointe.png">'
CLASSIQUE = '<img class="masc" src="../mascotte-classique.png">'
ADR = '8, rue Biot, 75017 Paris'

for fmt in FMT:
    S = fmt == 'bandeau'

    # 1 · Affiche de série : la terrasse de Paris en plein cadre, bloc titre façon série en bas
    page('1-serie', fmt, f"""
.p{{background:#1c140c}}
.bg{{position:absolute;inset:0;background:url(../terrasse.png) {'50% 14%/cover' if S else '50% 18%/cover'};background-repeat:no-repeat}}
.fade{{position:absolute;left:0;right:0;bottom:0;height:{'58%' if S else '52%'};background:linear-gradient(rgba(20,14,8,0),rgba(20,14,8,.86) 38%,#140e08)}}
.top{{position:relative;margin-top:{'10mm' if S else '12mm'};font:400 {'7mm' if S else '9mm'}/1 Anton;letter-spacing:.06em;color:#fff;background:{RED};padding:2.4mm 5mm 2.2mm;transform:rotate(-3deg);box-shadow:0 2mm 5mm rgba(0,0,0,.3)}}
.qrbox{{position:absolute;{'left:50%;transform:translateX(-50%);bottom:84mm;width:52mm' if S else 'right:9mm;bottom:12mm;width:50mm'}}}
.qrbox .qrc{{box-shadow:0 3mm 8mm rgba(0,0,0,.35)}}
.qrbox p{{text-align:center;color:#fff;font:700 {'3.2mm' if S else '3.6mm'}/1.3 Inter;letter-spacing:.14em;text-transform:uppercase;margin-top:2.5mm;text-shadow:0 1px 3px rgba(0,0,0,.6)}}
.bloc{{position:absolute;left:0;right:0;bottom:{'12mm' if S else '14mm'};text-align:center}}
.k{{font:800 {'6.4mm' if S else '9mm'}/1 'Playfair Display';letter-spacing:.08em;color:{GOLD}}}
.rule{{display:flex;align-items:center;justify-content:center;gap:3mm;margin:{'3mm' if S else '4mm'} auto;color:{GOLD};font-size:{'5mm' if S else '6mm'}}}
.rule i{{width:{'18mm' if S else '28mm'};height:.7mm;background:#fff}}
.t{{font:800 {'11mm' if S else '17mm'}/.98 'Playfair Display';letter-spacing:.06em;color:#fff}}
.s{{font:400 {'6mm' if S else '8.5mm'}/1 Anton;letter-spacing:.04em;color:#e5322b;margin-top:{'3mm' if S else '4mm'}}}
""", f'<div class="bg"></div><div class="fade"></div><div class="top">DON\'T SCAN !</div>'
       f'<div class="qrbox"><div class="qrc">{QR}</div><p>Une huître offerte</p></div>'
       f'<div class="bloc"><div class="k">FREE OYSTER</div><div class="rule"><i></i>⚓<i></i></div>'
       f'<div class="t">DREVICI<br>OYSTER</div><div class="s">SAISON 1 · 8 RUE BIOT</div></div>')

    # 2 · Le métro : fond crème carrelé, plaque bleu nuit façon station, la mascotte montre le QR
    page('2-metro', fmt, f"""
.p{{background:#f3ece0;background-image:linear-gradient(#e6dccb 1px,transparent 1px),linear-gradient(90deg,#e6dccb 1px,transparent 1px);background-size:{'12.5mm 6.25mm' if S else '15mm 7.5mm'}}}
.plaque{{margin-top:{'10mm' if S else '14mm'};background:{NAVY};color:#fff;border:{'1.4mm' if S else '1.8mm'} solid #fff;outline:.8mm solid {NAVY};border-radius:2mm;padding:{'3mm 5mm' if S else '4mm 10mm'};text-align:center;box-shadow:0 2mm 4mm rgba(0,0,0,.15)}}
.plaque b{{display:block;font:400 {'13mm' if S else '22mm'}/1 Anton;letter-spacing:.03em}}
.plaque small{{display:block;font:600 {'2.8mm' if S else '3.6mm'}/1 Inter;letter-spacing:.3em;text-transform:uppercase;color:#c9d2e6;margin-top:1.5mm}}
.mid{{padding:{'4mm 8mm' if S else '8mm 12mm'}}}
.mascw{{height:{'92mm' if S else '118mm'}}}
.q{{width:{'62mm' if S else '78mm'};text-align:center}}
.q .tag{{display:inline-block;background:{RED};color:#fff;font:400 {'5.4mm' if S else '7mm'}/1 Anton;letter-spacing:.06em;padding:2mm 4mm;border-radius:1.5mm;margin-bottom:3mm}}
.q .qrc{{border:1mm solid {NAVY}}}
.pied{{width:100%;background:{NAVY};color:#fff;text-align:center;padding:{'5mm 4mm 6mm' if S else '6mm 0 7mm'}}}
.pied img{{height:{'24.0mm' if S else '27.2mm'}}}
.pied p{{font:600 {'3mm' if S else '3.6mm'}/1.3 Inter;letter-spacing:.12em;text-transform:uppercase;color:#c9d2e6;margin-top:2mm}}
""", f'<div class="plaque"><b>FREE OYSTER</b><small>Correspondance · une huître offerte</small></div>'
       f'<div class="mid"><div class="mascw">{POINTE}</div><div class="q"><div class="tag">DON\'T SCAN !</div><div class="qrc">{QR}</div></div></div>'
       f'<div class="pied"><img src="../logo-blanc-or.svg"><p>{ADR}</p></div>')

    # 3 · La plaque de rue : la plaque émaillée bleue de Paris, cadre vert
    page('3-plaque', fmt, f"""
.p{{background:{CREAM}}}
.plaque{{margin-top:{'10mm' if S else '14mm'};background:#1e4d8f;border:{'1.6mm' if S else '2.2mm'} solid #fff;outline:{'1.4mm' if S else '2mm'} solid #2e6b4f;border-radius:{'3mm' if S else '4mm'};color:#fff;text-align:center;padding:{'3mm 4mm 4mm' if S else '4mm 12mm 5mm'};box-shadow:0 2.5mm 5mm rgba(0,0,0,.18)}}
.plaque small{{display:block;font:600 {'2.8mm' if S else '3.8mm'}/1 Inter;letter-spacing:.06em}}
.plaque b{{display:block;font:700 {'10mm' if S else '17mm'}/1.05 'Playfair Display';letter-spacing:.02em;margin-top:1.5mm}}
.plaque i{{display:block;font:italic 600 {'3.4mm' if S else '4.6mm'}/1.2 'Playfair Display';margin-top:1.5mm;color:#dce6f5}}
.mid{{padding:{'5mm 8mm' if S else '8mm 12mm'}}}
.mascw{{height:{'90mm' if S else '116mm'}}}
.q{{width:{'60mm' if S else '76mm'};text-align:center}}
.q .qrc{{box-shadow:0 2mm 6mm rgba(0,0,0,.12)}}
.q p{{font:400 {'6mm' if S else '8mm'}/1 Anton;color:{RED};letter-spacing:.05em;margin-bottom:3mm}}
.pied{{margin-bottom:{'9mm' if S else '12mm'};text-align:center}}
.pied img{{height:{'28.8mm' if S else '35.2mm'}}}
.pied p{{font:italic 600 {'3.6mm' if S else '4.4mm'}/1 'Playfair Display';color:{INK};margin-top:2mm}}
""", f'<div class="plaque"><small>17<sup>e</sup> Arr<sup>t</sup></small><b>RUE DE<br>L\'HUÎTRE OFFERTE</b><i>Free Oyster</i></div>'
       f'<div class="mid"><div class="mascw">{POINTE}</div><div class="q"><p>DON\'T SCAN !</p><div class="qrc">{QR}</div></div></div>'
       f'<div class="pied"><img src="../logo-couleur.svg"><p>{ADR}</p></div>')

    # 4 · Le classique crème : ton affiche actuelle, épurée, avec le logo Drevici au centre du QR
    page('4-creme', fmt, f"""
.p{{background:{CREAM}}}
.cadre{{position:absolute;inset:{'5mm' if S else '6mm'};border:{'2.4mm' if S else '3mm'} solid {NAVY};border-radius:{'5mm' if S else '6mm'}}}
.cadre::after{{content:"";position:absolute;inset:{'2.4mm' if S else '3.2mm'};border:.9mm solid {RED};border-radius:3mm}}
.h{{position:relative;margin-top:{'15mm' if S else '22mm'};text-align:center}}
.h .anc{{color:{RED};font-size:{'6mm' if S else '8mm'}}}
.h b{{display:block;font:400 {'15mm' if S else '27mm'}/1 Anton;letter-spacing:.02em;color:{NAVY};text-shadow:{'1mm 1mm' if S else '1.4mm 1.4mm'} 0 {RED}}}
.h .ds{{display:inline-block;margin-top:{'4mm' if S else '6mm'};background:{NAVY};color:{CREAM};font:400 {'6mm' if S else '8mm'}/1 Anton;letter-spacing:.06em;padding:{'2mm 5mm' if S else '2.6mm 7mm'};border-radius:1.5mm;outline:.8mm solid {RED};outline-offset:1mm}}
.mid{{position:relative;padding:{'4mm 10mm' if S else '6mm 16mm'}}}
.mascw{{height:{'86mm' if S else '112mm'}}}
.q{{width:{'60mm' if S else '74mm'}}}
.q .qrc{{border:1mm solid #111;border-radius:1mm}}
.pied{{position:relative;margin-bottom:{'15mm' if S else '20mm'};text-align:center}}
.pied img{{height:{'28.8mm' if S else '35.2mm'}}}
.pied p{{font:italic 700 {'4mm' if S else '5mm'}/1 'Playfair Display';color:{NAVY};margin-top:2mm}}
.pied p em{{color:{RED}}}
""", f'<div class="cadre"></div><div class="h"><div class="anc">⚓</div><b>FREE OYSTER</b><div class="ds">DON\'T SCAN !</div></div>'
       f'<div class="mid"><div class="mascw">{POINTE}</div><div class="q"><div class="qrc">{QR}</div></div></div>'
       f'<div class="pied"><img src="../logo-couleur.svg"><p>8, rue Biot, 75017 <em>Paris</em></p></div>')

    # 5 · Le ticket : un ticket de métro géant, « 1 huître · admis »
    page('5-ticket', fmt, f"""
.p{{background:#efe2c3;justify-content:center}}
.t{{position:relative;width:{'84mm' if S else '172mm'};height:{'306mm' if S else '262mm'};background:#e8d27a;border-radius:4mm;box-shadow:0 3mm 8mm rgba(0,0,0,.18);display:flex;flex-direction:column;align-items:center;overflow:hidden}}
.t::before{{content:"";position:absolute;left:0;right:0;top:{'34mm' if S else '40mm'};height:{'3.4mm' if S else '4.6mm'};background:#4a3b1b}}
.n{{margin-top:{'7mm' if S else '9mm'};font:700 {'3.2mm' if S else '4mm'}/1 Inter;letter-spacing:.3em;color:#4a3b1b}}
.b{{font:400 {'14mm' if S else '24mm'}/1 Anton;color:#1c1c1c;letter-spacing:.02em;margin-top:2mm}}
.mid{{padding:{'4mm 6mm' if S else '10mm 10mm 4mm'}}}
.mascw{{height:{'92mm' if S else '108mm'}}}
.q{{width:{'58mm' if S else '70mm'};text-align:center}}
.q .ds{{font:400 {'6mm' if S else '8mm'}/1 Anton;color:{RED};letter-spacing:.05em;margin-bottom:2.5mm}}
.adm{{width:100%;display:flex;justify-content:space-between;align-items:flex-end;padding:{'0 6mm 7mm' if S else '0 12mm 10mm'};font:400 {'4.6mm' if S else '6mm'}/1 Anton;color:#1c1c1c}}
.adm span{{font:600 {'2.8mm' if S else '3.4mm'}/1.3 Inter;letter-spacing:.06em;text-align:right;text-transform:uppercase}}
.adm img{{height:{'22mm' if S else '28mm'}}}
.strip .adm{{flex-direction:column;align-items:center;gap:3mm}}.strip .adm span{{text-align:center}}
""", f'<div class="t"><div class="n">TICKET · N° 0001 · RUE BIOT</div><div class="b">FREE OYSTER</div>'
       f'<div class="mid"><div class="mascw">{POINTE}</div><div class="q"><div class="ds">DON\'T SCAN !</div><div class="qrc">{QR}</div></div></div>'
       f'<div class="adm"><img src="../logo-couleur.svg"><span>Valable pour 1 huître<br>{ADR}</span></div></div>')

    # 6 · Belle Époque : soleil rouge, filets dorés, affiche de cabaret
    page('6-belle-epoque', fmt, f"""
.p{{background:#f6ead6}}
.sun{{position:absolute;left:50%;top:{'40%' if S else '46%'};width:{'230mm' if S else '330mm'};height:{'230mm' if S else '330mm'};transform:translate(-50%,-50%);background:repeating-conic-gradient(#e9c9a0 0 5deg,#f6ead6 5deg 10deg);border-radius:50%;opacity:.9}}
.disc{{position:absolute;left:50%;top:{'40%' if S else '46%'};width:{'76mm' if S else '104mm'};height:{'76mm' if S else '104mm'};transform:translate(-50%,-50%);background:{RED};border-radius:50%}}
.h{{position:relative;margin-top:{'10mm' if S else '14mm'};text-align:center}}
.h small{{display:block;font:italic 600 {'4.4mm' if S else '6mm'}/1 'Playfair Display';color:{RED}}}
.h b{{display:block;font:900 {'15mm' if S else '24mm'}/1 'Playfair Display';color:{INK};letter-spacing:.01em}}
.mid{{position:relative;padding:{'2mm 8mm' if S else '4mm 14mm'}}}
.mascw{{height:{'100mm' if S else '128mm'}}}
.q{{width:{'56mm' if S else '70mm'};text-align:center}}
.q .qrc{{border:1mm solid {GOLD}}}
.q p{{font:400 {'6mm' if S else '8mm'}/1 Anton;color:{INK};letter-spacing:.05em;margin-bottom:2.5mm}}
.pied{{position:relative;margin-bottom:{'9mm' if S else '12mm'};text-align:center}}
.pied img{{height:{'27.2mm' if S else '32.0mm'}}}
.pied p{{font:600 {'3mm' if S else '3.6mm'}/1 Inter;letter-spacing:.2em;text-transform:uppercase;color:{INK};margin-top:2mm}}
""", f'<div class="sun"></div><div class="disc"></div><div class="h"><small>Paris, 17<sup>e</sup> — une huître offerte</small><b>FREE OYSTER</b></div>'
       f'<div class="mid"><div class="mascw">{CLASSIQUE}</div><div class="q"><p>DON\'T SCAN !</p><div class="qrc">{QR}</div></div></div>'
       f'<div class="pied"><img src="../logo-couleur.svg"><p>{ADR}</p></div>')

    # 7 · Le kiosque : vert Wallace, filets or, sobre et élégant
    page('7-kiosque', fmt, f"""
.p{{background:#163a2c;color:#f3e7cf}}
.cadre{{position:absolute;inset:{'5mm' if S else '7mm'};border:.8mm solid {GOLD};border-radius:2mm}}
.cadre::after{{content:"";position:absolute;inset:1.8mm;border:.3mm solid {GOLD}}}
.h{{position:relative;margin-top:{'14mm' if S else '20mm'};text-align:center}}
.h small{{display:block;font:600 {'3mm' if S else '3.6mm'}/1 Inter;letter-spacing:.34em;color:{GOLD}}}
.h b{{display:block;font:800 {'14mm' if S else '23mm'}/1.02 'Playfair Display';letter-spacing:.04em;margin-top:3mm}}
.h i{{display:block;font:italic 600 {'4.6mm' if S else '6mm'}/1 'Playfair Display';color:{GOLD};margin-top:2.5mm}}
.mid{{position:relative;padding:{'4mm 9mm' if S else '6mm 16mm'}}}
.mascw{{height:{'90mm' if S else '112mm'}}}
.q{{width:{'58mm' if S else '72mm'}}}
.q .qrc{{outline:.6mm solid {GOLD};outline-offset:1.6mm}}
.pied{{position:relative;margin-bottom:{'13mm' if S else '18mm'};text-align:center}}
.pied img{{height:{'27.2mm' if S else '32.0mm'}}}
.pied p{{font:600 {'3mm' if S else '3.6mm'}/1 Inter;letter-spacing:.2em;text-transform:uppercase;color:#cdbf9f;margin-top:2mm}}
""", f'<div class="cadre"></div><div class="h"><small>· UNE HUÎTRE OFFERTE ·</small><b>FREE<br>OYSTER</b><i>Don\'t scan !</i></div>'
       f'<div class="mid"><div class="mascw">{CLASSIQUE}</div><div class="q"><div class="qrc">{QR}</div></div></div>'
       f'<div class="pied"><img src="../logo-blanc-or.svg"><p>{ADR}</p></div>')

    # 8 · L'ardoise du bistrot : noir, écriture à la craie
    page('8-ardoise', fmt, f"""
.p{{background:#1f2321;background-image:radial-gradient(ellipse at 30% 20%,rgba(255,255,255,.06),transparent 60%),radial-gradient(ellipse at 80% 90%,rgba(255,255,255,.04),transparent 50%);color:#f1efe8}}
.bois{{position:absolute;inset:0;border:{'4mm' if S else '6mm'} solid #7a5531;box-shadow:inset 0 0 0 .8mm #5a3d22}}
.h{{position:relative;margin-top:{'14mm' if S else '20mm'};text-align:center}}
.h small{{display:block;font:700 {'7mm' if S else '10mm'}/1 Caveat;color:#e9d27a}}
.h b{{display:block;font:400 {'13mm' if S else '20mm'}/1 'Alfa Slab One';letter-spacing:.02em;margin-top:2mm}}
.h i{{display:inline-block;font:700 {'7mm' if S else '9.5mm'}/1 Caveat;color:#ff8f7a;margin-top:3mm;transform:rotate(-3deg)}}
.mid{{position:relative;padding:{'4mm 9mm' if S else '6mm 16mm'}}}
.mascw{{height:{'88mm' if S else '112mm'}}}
.q{{width:{'58mm' if S else '72mm'};position:relative}}
.q::before{{content:"→";position:absolute;left:{'-8mm' if S else '-11mm'};top:42%;font:700 {'10mm' if S else '14mm'}/1 Caveat;color:#e9d27a}}
.strip .q::before{{display:none}}
.pied{{position:relative;margin-bottom:{'14mm' if S else '20mm'};text-align:center}}
.pied img{{height:{'25.6mm' if S else '30.4mm'}}}
.pied p{{font:700 {'5mm' if S else '6.4mm'}/1 Caveat;color:#d8d4c8;margin-top:1.5mm}}
""", f'<div class="bois"></div><div class="h"><small>Aujourd\'hui, à l\'ardoise :</small><b>FREE OYSTER</b><br><i>Don\'t scan !</i></div>'
       f'<div class="mid"><div class="mascw">{CLASSIQUE}</div><div class="q"><div class="qrc">{QR}</div></div></div>'
       f'<div class="pied"><img src="../logo-blanc-or.svg"><p>{ADR}</p></div>')
print('ok')
