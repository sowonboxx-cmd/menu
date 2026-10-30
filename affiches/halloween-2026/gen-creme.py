# Affiches A0 « Trick or Huître », version crème : variantes du cadre de la mascotte et de la phrase.
# python3 gen-creme.py  → affiche-creme-*.html (rendu PNG avec Playwright)
qr = open('qr.svg').read()
BAT = 'M100 30c-4-10-8-14-8-14s-1 8 0 13c-10-2-20 3-26 12-3-8-12-14-22-12 4 5 5 11 3 16-8-4-19-3-27 4-6 5-10 12-12 19 9-5 20-6 29-2 6 3 10 8 12 14 4-7 11-11 19-11 6 0 11 3 15 8 3-8 9-14 17-14s14 6 17 14c4-5 9-8 15-8 8 0 15 4 19 11 2-6 6-11 12-14 9-4 20-3 29 2-2-7-6-14-12-19-8-7-19-8-27-4-2-5-1-11 3-16-10-2-19 4-22 12-6-9-16-14-26-12 1-5 0-13 0-13s-4 4-8 14z'
INK, OR, CR, NIGHT = '#2b1d3d', '#f97316', '#f6e9d6', '#120c1a'
bat = lambda style, fill=OR: f'<svg viewBox="0 0 200 90" style="position:absolute;{style}"><path fill="{fill}" d="{BAT}"/></svg>'

# ── cadres de la mascotte (boîte locale 500 × 850, posée à x=110, y=770) ──
DEFS = f'''<defs><radialGradient id="nuit" cx="50%" cy="25%" r="75%"><stop offset="0" stop-color="#3a2350"/><stop offset=".6" stop-color="#170f22"/><stop offset="1" stop-color="#0c0a12"/></radialGradient>
<radialGradient id="lune" cx="38%" cy="36%" r="60%"><stop offset="0" stop-color="#fff7e0"/><stop offset=".6" stop-color="#f6d9a0"/><stop offset="1" stop-color="#d9a85b"/></radialGradient></defs>'''
MASC = '<image href="mascotte.webp" x="{x}" y="{y}" width="{w}" height="{h}" preserveAspectRatio="xMidYMax meet"/>'

def porte():
    # porte gothique en ogive : montants en pierre, trait orange, nuit dedans, la mascotte sur le seuil
    ogive = 'M40 850V330C40 170 150 60 250 10C350 60 460 170 460 330V850Z'
    inner = 'M70 850V336C70 192 168 96 250 48C332 96 430 192 430 336V850Z'
    return f'''<svg viewBox="0 0 500 850" style="position:absolute;left:110px;top:770px;width:500px;height:850px;overflow:visible">{DEFS}
<clipPath id="cp"><path d="{inner}"/></clipPath>
<path d="{ogive}" fill="{INK}"/>
<g clip-path="url(#cp)"><rect width="500" height="850" fill="url(#nuit)"/><circle cx="250" cy="150" r="46" fill="url(#lune)"/>
{bat("", "#000").replace('<svg ', '<svg x="110" y="300" width="70" height="32" ')}{MASC.format(x=40, y=215, w=440, h=635)}</g>
<path d="{inner}" fill="none" stroke="{OR}" stroke-width="8"/>
<g stroke="{CR}" stroke-width="3" opacity=".35">{''.join(f'<path d="M40 {y}H70M430 {y}H460"/>' for y in range(390, 850, 70))}</g>
<rect x="10" y="826" width="480" height="24" rx="4" fill="{INK}"/></svg>'''

def goo():
    # tache de nuit qui coule : bord haut ondulé, gouttes en bas
    d = ('M58 150C40 70 120 18 205 30C255 0 330 8 372 40C445 52 482 120 462 190C480 260 470 330 474 420L478 640'
         'C480 690 470 712 452 716C436 720 430 740 431 772C432 810 400 812 398 776L396 742C395 728 384 724 374 732'
         'C362 742 360 762 361 800C362 846 318 848 318 802L318 738C318 724 306 718 294 726C280 736 276 752 276 772'
         'C276 800 248 800 248 772L248 734C248 722 238 716 226 722C210 730 206 752 206 790C206 836 162 838 162 790'
         'L162 742C162 728 150 722 138 728C124 736 120 752 120 770C120 796 92 796 92 770L92 730C92 716 80 712 68 716'
         'C46 722 30 700 30 650L28 420C26 330 24 240 58 150Z')
    return f'''<svg viewBox="0 0 500 850" style="position:absolute;left:110px;top:770px;width:500px;height:850px;overflow:visible">{DEFS}
<clipPath id="cp"><path d="{d}"/></clipPath>
<path d="{d}" fill="{INK}" transform="translate(10 12)" opacity=".25"/>
<g clip-path="url(#cp)"><rect width="500" height="850" fill="url(#nuit)"/><circle cx="395" cy="120" r="48" fill="url(#lune)"/>{MASC.format(x=10, y=170, w=420, h=600)}</g>
<path d="{d}" fill="none" stroke="{OR}" stroke-width="7"/></svg>'''

def ticket():
    # cadre à coins coupés, le même dessin que le cadre de l'affiche, en petit
    def notched(x, y, w, h, s, R):
        return (f'M{x} {y+2*s+R}H{x+s}V{y+s+R}A{R} {R} 0 0 0 {x+s+R} {y+s}H{x+2*s+R}V{y}H{x+w-2*s-R}V{y+s}H{x+w-s-R}A{R} {R} 0 0 0 {x+w-s} {y+s+R}V{y+2*s+R}H{x+w}'
                f'V{y+h-2*s-R}H{x+w-s}V{y+h-s-R}A{R} {R} 0 0 0 {x+w-s-R} {y+h-s}H{x+w-2*s-R}V{y+h}H{x+2*s+R}V{y+h-s}H{x+s+R}A{R} {R} 0 0 0 {x+s} {y+h-s-R}V{y+h-2*s-R}H{x}Z')
    out, inn = notched(20, 0, 460, 850, 14, 22), notched(38, 18, 424, 814, 12, 18)
    return f'''<svg viewBox="0 0 500 850" style="position:absolute;left:110px;top:770px;width:500px;height:850px;overflow:visible">{DEFS}
<clipPath id="cp"><path d="{inn}"/></clipPath>
<path d="{out}" fill="{INK}"/>
<g clip-path="url(#cp)"><rect width="500" height="850" fill="url(#nuit)"/><circle cx="370" cy="120" r="60" fill="url(#lune)"/>
{MASC.format(x=30, y=210, w=440, h=630)}</g>
<path d="{inn}" fill="none" stroke="{OR}" stroke-width="7"/></svg>'''

# ── la phrase (boîte 615 × 140, posée au-dessus du QR) ──
def label_ruban(txt, fs):
    return f'''<svg viewBox="0 0 700 160" style="position:absolute;left:608px;top:780px;width:700px;height:160px;overflow:visible">
<path d="M0 40H70V150H0L30 95Z" fill="#c2410c"/><path d="M700 40H630V150H700L670 95Z" fill="#c2410c"/>
<path d="M70 150L42 128H70Z" fill="#7c2d12"/><path d="M630 150L658 128H630Z" fill="#7c2d12"/>
<rect x="42" y="18" width="616" height="110" fill="{OR}"/><rect x="54" y="28" width="592" height="90" fill="none" stroke="{CR}" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/>
<text x="350" y="73" text-anchor="middle" dominant-baseline="central" font-family="Anton" font-size="{fs}" fill="{INK}" letter-spacing="1.5">{txt}</text></svg>'''

def label_bulle(txt, fs):
    # bulle de BD, la queue part vers la mascotte
    return f'''<svg viewBox="0 0 640 170" style="position:absolute;left:640px;top:770px;width:640px;height:170px;overflow:visible">
<path d="M40 10H600Q630 10 630 40V112Q630 142 600 142H120L40 182L72 142H40Q10 142 10 112V40Q10 10 40 10Z" fill="{INK}" transform="translate(7 7)" opacity=".25"/>
<path d="M40 10H600Q630 10 630 40V112Q630 142 600 142H120L40 182L72 142H40Q10 142 10 112V40Q10 10 40 10Z" fill="#fff" stroke="{INK}" stroke-width="7" stroke-linejoin="round"/>
<text x="320" y="78" text-anchor="middle" dominant-baseline="central" font-family="Anton" font-size="{fs}" fill="{INK}" letter-spacing="1">{txt}</text></svg>'''

def label_panneau(txt, fs):
    # pancarte de bois pendue à deux ficelles, un peu de travers
    return f'''<svg viewBox="0 0 640 210" style="position:absolute;left:640px;top:735px;width:640px;height:210px;overflow:visible">
<path d="M150 0L120 70M490 0L520 70" stroke="{INK}" stroke-width="5"/><circle cx="150" cy="0" r="9" fill="{INK}"/><circle cx="490" cy="0" r="9" fill="{INK}"/>
<g transform="rotate(-2.5 320 140)"><rect x="12" y="66" width="616" height="136" rx="14" fill="{INK}"/><rect x="26" y="80" width="588" height="108" rx="8" fill="none" stroke="{OR}" stroke-width="4"/>
<text x="320" y="135" text-anchor="middle" dominant-baseline="central" font-family="Anton" font-size="{fs}" fill="{OR}" letter-spacing="2">{txt}</text></g></svg>'''

def poster(fn, cadre, label, halloween=None):
    hal = ''
    orn = f'<div class="orn"><svg viewBox="0 0 300 12" class="sp"><path d="M0 5.4H250C262 5.4 270 2 282 2C290 2 295 4 298 4.6A1.6 1.6 0 0 1 298 7.4C295 8 290 10 282 10C270 10 262 6.6 250 6.6H0Z" fill="{OR}"/></svg><svg viewBox="0 0 200 90" style="width:96px;height:44px"><path fill="{OR}" d="{BAT}"/></svg><svg viewBox="0 0 300 12" class="sp r"><path d="M0 5.4H250C262 5.4 270 2 282 2C290 2 295 4 298 4.6A1.6 1.6 0 0 1 298 7.4C295 8 290 10 282 10C270 10 262 6.6 250 6.6H0Z" fill="{OR}"/></svg></div>'
    if halloween == 'bandeau':
        # « HALLOWEEN 2026 » à la place de l'ornement du haut
        orn = f'<div class="hal"><svg viewBox="0 0 200 90"><path fill="{OR}" d="{BAT}"/></svg><span>HALLOWEEN 2026 · 31 OCT → 7 NOV</span><svg viewBox="0 0 200 90" style="transform:scaleX(-1)"><path fill="{OR}" d="{BAT}"/></svg></div>'
    if halloween == 'tampon':
        hal = f'''<svg viewBox="0 0 240 240" style="position:absolute;left:1080px;top:480px;width:230px;height:230px;transform:rotate(14deg)">
<defs><path id="ci" d="M120 120m-86 0a86 86 0 1 1 172 0a86 86 0 1 1 -172 0"/></defs>
<circle cx="120" cy="120" r="112" fill="{OR}"/><circle cx="120" cy="120" r="102" fill="none" stroke="{CR}" stroke-width="3"/>
<text font-family="Anton" font-size="23" fill="{CR}" letter-spacing="2.2"><textPath href="#ci">HALLOWEEN · 31 OCT → 7 NOV ·</textPath></text>
<text x="120" y="112" text-anchor="middle" font-family="Anton" font-size="44" fill="{INK}">SPÉCIAL</text><text x="120" y="152" text-anchor="middle" font-family="Anton" font-size="34" fill="{INK}">2026</text></svg>'''
    html = f'''<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Playfair+Display:ital,wght@0,800;1,800&family=Inter:wght@600;700&display=block" rel="stylesheet">
<style>
*{{margin:0;box-sizing:border-box}}body{{width:1415px;height:2000px}}
.p{{position:relative;width:1415px;height:2000px;overflow:hidden;background:{CR};color:{INK}}}
.fr{{position:absolute;inset:0;width:100%;height:100%}}
.orn{{position:absolute;top:130px;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:26px}}.orn .sp{{width:300px;height:12px}}.orn .r{{transform:scaleX(-1)}}
.hal{{position:absolute;top:118px;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:22px;font:400 46px Anton;letter-spacing:.12em;color:{OR}}}.hal svg{{width:80px;height:36px}}
h1{{position:absolute;top:200px;left:0;right:0;text-align:center;font:400 200px/1 Anton;letter-spacing:.01em;color:{INK};text-shadow:9px 9px 0 {OR}}}
h1.l2{{top:445px;color:{OR};text-shadow:9px 9px 0 {INK}}}
.ul{{position:absolute;top:700px;left:240px;right:240px;display:flex;align-items:center;gap:14px}}.ul i{{flex:1;height:5px;background:{OR}}}.ul b{{width:66px;height:20px;background:{INK};clip-path:polygon(0 50%,50% 0,100% 50%,50% 100%)}}
.qr{{position:absolute;left:650px;top:965px;width:615px;height:615px;background:#fff;padding:22px;border:7px solid {CR};outline:6px solid {INK}}}.qr svg{{display:block;width:100%;height:100%}}
.brand{{position:absolute;left:0;right:0;top:1660px;text-align:center;font:800 104px/1 'Playfair Display';color:{INK}}}
.addr{{position:absolute;left:0;right:0;top:1785px;text-align:center;font:italic 800 58px 'Playfair Display';color:{INK}}}.addr em{{color:{OR}}}
</style></head><body><div class="p">
<svg class="fr" viewBox="0 0 1415 2000" preserveAspectRatio="none"><rect x="34" y="34" width="1347" height="1932" rx="62" fill="none" stroke="{INK}" stroke-width="30"/>
<path fill="none" stroke="{OR}" stroke-width="9" d="M106 205H128V172Q128 150 150 150H186V96H1229V150H1265Q1287 150 1287 172V205H1309V1795H1287V1828Q1287 1850 1265 1850H1229V1904H186V1850H150Q128 1850 128 1828V1795H106Z"/></svg>
{orn}
<h1>TRICK OR</h1><h1 class="l2">HUÎTRE</h1>
<div class="ul"><i></i><b></b><i></i></div>
{bat('left:1085px;top:525px;width:110px;height:50px;transform:rotate(12deg)')}
{bat('left:245px;top:560px;width:70px;height:32px;transform:scaleX(-1) rotate(10deg)')}
{hal}
{cadre}
{label}
<div class="qr">{qr}</div>
<div class="brand">DREVICI OYSTER</div>
<div class="addr">8 Rue Biot, 75017 <em>Paris</em></div>
</div></body></html>'''
    open(fn, 'w').write(html)

poster('affiche-creme-porte.html',  porte(),  label_ruban("T'AS LES COQUILLES ?", 70))
poster('affiche-creme-goo.html',    goo(),    label_bulle('MÊME PAS CAP DE SCANNER !', 54), halloween='bandeau')
poster('affiche-creme-ticket.html', ticket(), label_panneau('TROUILLARDS S’ABSTENIR', 57), halloween='tampon')

# planche des phrases (mêmes dessins, autres mots)
PHRASES = ["T'AS LES COQUILLES ?", 'MÊME PAS CAP !', 'SCANNE SI T’OSES.', 'TROUILLARDS S’ABSTENIR', 'T’AS LES CHOCOTTES ?', 'POULES MOUILLÉES, PASSEZ.', 'ON TE MANGE PAS. PROMIS.', 'DON’T SCAN !']
rows = ''.join(f'<div style="position:relative;height:250px">{f(t, 62 if len(t) < 21 else (46 if f is label_panneau else 52)).replace("left:608px;top:780px", "left:0;top:40px").replace("left:640px;top:770px", "left:20px;top:30px").replace("left:640px;top:735px", "left:20px;top:10px")}</div>'
               for t, f in zip(PHRASES, [label_ruban, label_bulle, label_panneau, label_ruban, label_bulle, label_panneau, label_bulle, label_ruban]))
open('phrases.html', 'w').write(f'''<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Anton&display=block" rel="stylesheet">
<style>body{{margin:0;background:{CR};width:1460px;padding:40px;box-sizing:border-box;display:grid;grid-template-columns:1fr 1fr;column-gap:20px}}</style></head><body>{rows}</body></html>''')
